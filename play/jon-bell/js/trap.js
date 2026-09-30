import { lifesaved_monster } from './mklev.js';
import { del_engr_at } from './mklev.js';
import { is_pool } from './look.js';
/* permonst.cwt per mons[] row (js/eat_corpse_data.json) — the land-mine
 * trigger-weight roll needs it; mon.data.cwt is never sourced on a live monster. */
import { MONS_CWT } from './mklev.js';
/* water_damage()'s container arms (C trap.c:4750-4757) recurse into the
 * contents, and its waterproof arm calls makeknown(). */
import { water_damage_chain, flooreffects, instapetrify as instapetrify_real, can_ride as can_ride_real, surface as surface_real, body_part as body_part_real, mbodypart as mbodypart_real } from './cmd.js';
import { discover_object } from './o_init.js';
// @ts-nocheck
// trap.js — Trap subsystem skeleton for L12+ porter targets.
// C ref: nethack-c/src/trap.c (108 RNG calls, 7,189 weighted sessions)
// @ts-nocheck — sibling imports from hand-maintained js/*.js.
//
// This file contains TODO stubs for the major public functions in trap.c.
// Future porters should fill in one function at a time, wiring in the
// correct RNG calls in C-source order.
import { game } from './gstate.js';
/* Local C helpers whose canonical bodies are not exported by their home modules. */
function m_next2u(mon) { return dist2(mon.mx | 0, mon.my | 0, game.u?.ux | 0, game.u?.uy | 0) <= 2; }
function pline_The(msg, ...args) { return pline('The ' + msg, ...args); }
import { rn2, rn1, d, rnl, rnd, pushRngLogEntry } from './rng.js';
import { exercise, change_luck, adjalign, adjattrib, minuhpmax, setuhpmax } from './attrib.js';
/* dofiretrap's uhpmax-drain-to-death arm (trap.c:4290-4291) — no corpus
 * fire trap has driven uhpmax below minuhpmax(1) yet, so this edge is
 * written out for C fidelity rather than measured. */
import { losexp } from './exper.js';
/* dofiretrap's Underwater/Drain_resistance guards (trap.c:4247, :4291). */
import { DRAIN_RES, MON_DETACH } from './const.js';
import { bot, pline, Norep, canseemon, canspotmon, newsym, map_trap, tmp_at, obj_to_glyph, glyph_is_invisible_at, unmap_object, You_hear, You_hear as _trap_You_hear, feel_newsym, map_invisible, livelog_printf, shieldeff, topl_force_break_now } from './display.js';
/* canspotmon was READ at four sites in this file (the rolling-boulder monster
 * arm plus three trap-noticed predicates) and imported at none of them — a
 * latent ReferenceError, of the class tools/js-binding-audit.mjs calls
 * `unbound`.  js/display.js exports it; js/dogmove.js already imports it
 * from there. */
import { cansee, clear_path, couldsee, recalc_block_point, Blind, vision_recalc } from './vision.js';
import { distmin, s_suffix as _s_suffix, dist2 } from './hacklib.js';
import { sobj_at, in_rooms, obj_ice_effects, is_flammable, dealloc_obj, mk_trap_statue, engr_at, ordin,
         single_level_branch, mkroll_launch, place_object, maybe_unhide_at, wake_nearto, relobj_md,
         mpickobj, remove_object, makemon } from './mklev.js';
import { add_damage, sellobj } from './shk.js';
import { mksobj as mksobj_ice } from './mklev.js';
import { tamedog } from './dog.js';
import { seffects } from './read.js';
import { seemimic } from './mhitm.js';
import { rndmonnam } from './do_name.js';
import { setnotworn } from './worn.js';
/* read.c:3018 punish() — reused when digging or struggling uncovers the
 * punishment ball.  This is a runtime cycle (read.js already imports trap.js)
 * and the reused-ball path performs its state changes synchronously before the
 * returned promise can settle. */
import { punish } from './read.js';
import { PM_LONG_WORM, PM_DEATH, PM_PESTILENCE, PM_FAMINE, PM_MINOTAUR } from './pm.generated.js';
/* trapeffect_pit's "How pitiful.  Isn't that the pits?" quip (trap.c:1898) and
 * m_easy_escape_pit (trap.c:3728); PM_RANGER is Role_if()'s argument at
 * trap.c:1894 — urole.mnum is a PM index on the scored path. */
import { PM_PIT_VIPER, PM_PIT_FIEND, PM_RANGER } from './pm.generated.js';
/* goodpos_onscary()'s Gehennom short-circuit; js/mklev.js reads the same one. */
import { Inhell, nonlivingMon, splitobj, which_armor, can_saddle as can_saddle_real, sliparm as sliparm_real, monPmname, onscary as onscary_real } from './makemon.js';
import monsPack from './makemon_mons.json' with { type: 'json' };
import monMsizePack from './makemon_msize.json' with { type: 'json' };
import { SEE_INVIS, FROMOUTSIDE, HALLUC_RES as HALLUC_RES_DMT, LL_MINORAC,
    A_STR, A_CON, A_DEX, A_CHA, FOOT, STUNNED, HALLUC, TIMEOUT, SHOCK_RES, FREE_ACTION, CLR_MAX, TELEPORT_CONTROL, CONFUSION, MAGIC_TRAP, TELEP_TRAP, HOLE, FORCETRAP, FORCEBUNGLE, ARROW_TRAP, DART_TRAP, ROCKTRAP, W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU, W_SADDLE, W_RINGL, W_RINGR, LEFT_SIDE, RIGHT_SIDE, W_WEP, W_SWAPWEP, W_QUIVER, W_AMUL, W_TOOL, W_BALL, W_CHAIN, NON_PM, FIRE_RES, SLEEP_RES, ANTIMAGIC, MAX_ERODE, ERODE_BURN, ERODE_RUST, ERODE_ROT, ERODE_CORRODE, ER_NOTHING, ER_GREASED, ER_DAMAGED, ER_DESTROYED, EF_GREASE, EF_DESTROY, EF_VERBOSE, EF_PAY, SQKY_BOARD, BEAR_TRAP, ROLLING_BOULDER_TRAP, PIT, SPIKED_PIT, TRAPDOOR, LEVEL_TELEP, MAGIC_PORTAL, WEB, STATUE_TRAP, POLY_TRAP, TRAPPED_DOOR, TRAPPED_CHEST, isok, IS_WALL, IS_ROOM, IS_FURNITURE, IS_AIR, IS_DOOR, is_pit, is_hole, u_at, STONE, SCORR, CORR, ROOM, DOOR, SDOOR, DRAWBRIDGE_UP, LADDER, STAIRS, LAVAPOOL, LAVAWALL, LEVITATION, FLYING, LANDMINE, SLP_GAS_TRAP, RUST_TRAP, ANTI_MAGIC, FIRE_TRAP, VIBRATING_SQUARE, IS_OBSTRUCTED, TRAP_NOT_IMMUNE, TRAP_CLEARLY_IMMUNE, TRAP_HIDDEN_IMMUNE, In_endgame, Is_earthlevel, INVIS, FAST, COLD_RES, DISINT_RES, POISON_RES, ACID_RES, STONE_RES, BLINDED, CLAIRVOYANT, STEALTH, TELEPAT, WWALKING, DISPLACED, FUMBLING, JUMPING, REFLECTING, PROTECTION, DISMOUNT_FELL, WOUNDED_LEGS, ALL_TRAPS, NO_TRAP,
/* goodpos()/crawl_destination() (teleport.c:85-185, hack.c:3995-4017) */
ACCESSIBLE, IS_WATERWALL, IS_STWALL, IS_TREE, W_NONPASSWALL, W_NONDIGGABLE,
D_CLOSED, D_LOCKED, D_NODOOR, D_BROKEN, POOL, MOAT, WATER, ICE,
DB_UNDER, DB_MOAT, DB_LAVA, DB_ICE, MM_IGNOREWATER, MM_IGNORELAVA,
GP_CHECKSCARY, GP_ALLOW_U, GP_AVOID_MONPOS, LR_MONGEN, LR_TELE, LR_UPTELE, LR_DOWNTELE, ALTAR, HEADSTONE,
SWIMMING, MAGICAL_BREATHING, PASSES_WALLS, Is_rogue_level, MELT_ICE_AWAY, ROT_ORGANIC,
/* launch_obj()'s DISP_FLASH boulder trail (trap.c:3355, :3565) and the
 * obj->where values its obj_extract_self dispatches on (mkobj.c:2426) */
DISP_FLASH, DISP_END, OBJ_FREE, OBJ_FLOOR,
/* body-part enum (const.js:371/379, the same values js/cmd.js's body_part /
 * mbodypart index on).  These were READ but never imported: trapeffect_rust_trap's
 * hero arms 0/1/2 called body_part(HEAD) / body_part(ARM) against undeclared
 * identifiers, so any hero rust trap rolling rn2(5) < 3 threw a ReferenceError
 * mid-turn.  Unreached today by luck — the corpus's ONE hero rust trap
 * (public seed0398 step 45) rolls rn2(5)=3, the `default` arm, which touches
 * neither name — but a throw on a live arm halts the session
 * ([[a-new-throw-on-a-live-arm-does-halt]]).  `node --check` cannot see this;
 * only a run of the arm can. */
ARM, HEAD, MAY_HIT, MAY_DESTROY, MAY_FRACTURE, VIS_EFFECTS, } from './const.js';
/* launch_obj()'s monster arm (trap.c:3408).  mhitu.js already imports thitu /
 * find_mac from this file, so the edge is mutual and runtime-only, the same
 * shape as the existing uhitm.js and makemon.js cycles. */
import { ohitmon } from './mhitu.js';
import { poisoned } from './uhitm.js';
import { tele_trap, mlevel_tele_trap, mtele_trap, domagicportal, next_to_u } from './teleport.js';
import { self_invis_message, make_confused } from './potion.js';
/* trapeffect_fire_trap's monster arm (C trap.c:1729-1821).  zap.js already
 * imports this module; both of these are read at CALL time inside a function
 * body, so the cycle resolves through the hoisted function bindings. */
import { destroy_items_mon, burn_floor_objects, make_blinded, _u_resists_blnd, learnwand, resist, destroy_items } from './zap.js';
import { growl } from './mhitm.js';
import { p_coaligned } from './priest.js';
import { newcham } from './mklev.js';
import { NC_SHOW_MSG, NOTELL } from './const.js';
import { ignite_items } from './mhitu.js';
import { nomul } from './allmain.js';
import { schedule_goto } from './cmd.js';
import { stop_occupation } from './allmain.js';
import { fall_asleep, spot_stop_timers, stop_timer } from './timeout.js';
/* C hack.h obj_to_any(obj) — the `anything` union wrapper; local copy, same
 * per-file convention as js/dig.js:619 and js/mklev.js:886. */
function obj_to_any(o) { return { a_obj: o, a_long: null }; }
import { set_levltyp } from './mkmaze.js';
import { mon_nam, m_at, dmgval } from './uhitm.js';
import { MKOBJ_OC_MATERIAL, MKOBJ_OC_OPROP, MKOBJ_OC_SKILL } from './mkobj_erosion_meta.js';
import { cloak_simple_name, helm_simple_name, gloves_simple_name, suit_simple_name, an, the, obj_is_pname, doname, mshot_xname, vtense, xname, distant_name, simpleonames, otense, Yobjnam2 } from './objnam.js';
import { chooseTrapnote } from './mklev_choose_trapnote.js';
import { set_utrap, bury_an_obj } from './dig.js';
import { float_up, bimanual, hard_helmet } from './do_wear.js';
/* C trap.c:1955-1959 — pit falls release and possibly damage the punished
 * hero's ball before placebc() restores it underfoot. */
import { ballfall, unplacebc, placebc } from './ball.js';
/* C trap.c:7154 trapname()'s non-hallucinating result is
 * defsyms[trap_to_defsym(ttyp)].explanation; DEFSYM_EXPLANATION is the
 * generated dump of exactly that table (see its header). */
import { DEFSYM_EXPLANATION } from './defsym_data.js';
import { DIR_180, DIR_ERR, KILLED_BY_AN, NO_KILLER_PREFIX, TT_BEARTRAP, TT_BURIEDBALL, TT_INFLOOR, TT_LAVA, TT_PIT, TT_WEB, STRAT_CLOSE, STRAT_WAITFORU } from './const.js';
/* m_dowear_type (C worn.c:798) reads objects[otyp].oc_delay / .oc_armcat /
 * .a_ac out of the generated C armor table, exactly as C indexes objects[]. */
import { ARMOR_DATA } from './armor_data.js';
/* C do_name.c Monnam(mon) — mon_nam() capitalised; js/mcastu.js owns the port. */
import { Monnam, monstseesu as monstseesu_real, monstunseesu as monstunseesu_real } from './mcastu.js';
import { You } from './eat.js';
import { In_quest, In_sokoban } from './const.js';
import { SHOP_HOLE_COST } from './const.js';
import { otrapped_of } from './const.js';   /* obj.h:139 #define opoisoned otrapped */
/* trapeffect_hole's monster arm (trap.c:2033/2038): Can_fall_thru(&u.uz) and
 * the long-worm segment count.  Both already ported; only this arm's caller
 * was missing. */
import { Can_fall_thru, hole_destination } from './mklev.js';
import { count_wsegs } from './worm.js';
import { attacktype, resists_magm, Resists_Elem, obj_pmname, num_horns, mons_see_trap, s_suffix, hcolor, wakeup, wakeup_attack, update_inventory, is_youmonst, pronoun_gender, sleep_monst, breakarm as breakarm_real, helpless } from './mhitm.js';
import { mon_has_amulet } from './sit.js';
import { dismount_steed } from './dog.js';
import { PM_AIR_ELEMENTAL, PM_FIRE_VORTEX, PM_FLAMING_SPHERE, PM_FIRE_ELEMENTAL, PM_SALAMANDER, PM_CAVE_SPIDER, PM_GIANT_SPIDER, PM_GELATINOUS_CUBE, PM_IRON_GOLEM, PM_WIZARD, PM_COCKATRICE, PM_CHICKATRICE, PM_FLOATING_EYE, PM_GRID_BUG, PM_GREMLIN } from './pm.generated.js';
/* trapeffect_web (trap.c:2216-2249) + trapeffect_bear_trap (trap.c:1514/1538)
 * monster lists.  Taken from the generated mons[] index table rather than
 * re-declared locally: the local `_PM_*_WEB` / `_PM_*_BT` block that used to sit
 * beside those switches held a stale index space (PM_OWLBEAR 86 = baluchitherium,
 * PM_BUGBEAR 78 = rock piercer, ...), so every case matched the wrong monster. */
import { PM_OWLBEAR, PM_BUGBEAR, PM_TITANOTHERE, PM_BALUCHITHERIUM, PM_PURPLE_WORM, PM_JABBERWOCK, PM_BALROG, PM_KRAKEN, PM_MASTODON, PM_ORION, PM_NORN, PM_CYCLOPS, PM_LORD_SURTUR } from './pm.generated.js';
/* animate_statue (trap.c:725-899) — the STATUE_TRAP arm's monster/gender
 * constants and helpers, none previously imported by this file. */
import { PM_ARCHEOLOGIST, PM_DOPPELGANGER, PM_FLESH_GOLEM, PM_VAMPIRE, PM_VAMPIRE_LORD, PM_VLAD_THE_IMPALER, PM_GRAY_DRAGON } from './pm.generated.js';
import { M_AP_TYPE, ismnum, NO_NC_FLAGS, NO_MINVENT, MM_NOWAIT, MM_NOTAIL, MM_NOMSG, MM_MALE, MM_FEMALE, MM_NOCOUNTBIRTH, MM_ADJACENTOK, OBJ_INVENT, ARTICLE_A, CORPSTAT_GENDER, CORPSTAT_MALE, CORPSTAT_FEMALE, CORPSTAT_HISTORIC, A_LAWFUL } from './const.js';
import { cant_revive } from './read.js';
import { permonstTemplate, set_malign, set_mon_data } from './makemon.js';
import { obj_resists, inventory_resistance_check } from './zap.js';
import { costly_alteration, obj_extract_self_general as obj_extract_self } from './cmd.js';
/* C invent.c:1438-1460 delobj_core(obj, FALSE) — the single real body, which
 * ends in obfree() and reaches obj_extract_self through it.  See _stat_delobj. */
import { _delobj_useupf as delobj_core } from './cmd.js';
import { COST_BURN, COST_RUST, COST_ROT, COST_CORRODE, COST_CRACK, ERODE_CRACK } from './const.js';
import { remove_worn_item } from './steal.js';
import { x_monnam, christen_monst } from './mhitm.js';
import { quest_info } from './objnam.js';
import { shop_keeper, costly_spot } from './shk.js';
import { has_oname, ONAME } from './const.js';
import { nxtobj } from './mklev.js';
import { bypass_obj } from './worn.js';
/* C invent.c:4366 stackobj().  The shared exported body — see the long note at
 * its former file-local shadow's site below.  js/sp_lev.js imports this file,
 * so this is a module cycle; stackobj is a hoisted function declaration and is
 * only ever CALLED (never read at module-eval time), which is the same shape as
 * the pre-existing js/sp_lev.js <-> js/cmd.js cycle. */
import { stackobj } from './sp_lev.js';
/* crawl_destination (hack.c:4011-4016) reuses the existing ports of
 * shk.c:5792 block_door and hack.c:921/935 bad_rock/cant_squeeze_thru rather
 * than growing private copies.  js/shk.js is already imported by this module
 * (add_damage), and js/cmd.js -> js/trap.js is an existing edge, so neither
 * import introduces a cycle that was not already there; both are used only
 * from function bodies, never at module-evaluation time. */
import { block_door } from './shk.js';
/* ceiling / Yname2 / observe_object join the existing cmd.js edge for the
 * trapeffect_rocktrap and trapeffect_pit HERO arms (C trap.c:1346, :1354, :1364
 * and trap.c:1902).  js/cmd.js:17048 already carries the real ceiling() body —
 * the one that dereferences in_rooms() the way C does — so it is imported here
 * rather than twinned, per the WRONG TWIN note on this file's other helpers. */
import { bad_rock, cant_squeeze_thru, cxname, body_part, ceiling, Yname2,
         observe_object, xytodir, mbodypart, level_tele } from './cmd.js';
import { losehp, down_gate, ship_object, delobj, stolen_value, scatter } from './dokick.js';
/* m_useupall's real body — C mthrowu.c:1154 is `extract_from_minvent(...)` +
 * `obfree(...)`, and the extract half had been omitted here. */
import { check_gear_next_turn } from './makemon.js';
import { obj_no_longer_held } from './cmd.js';
import { mwepgone, poisoned as poisoned_trap } from './uhitm.js';
import { weight, encumber_msg } from './weight.js';
import { uwepgone, uswapwepgone } from './steal.js';
import { ENV } from './hostenv.js';
/* C ref: include/trap.h:97-103 trap_effect return values. */
const Trap_Effect_Finished = 0;
const Trap_Caught_Mon = 1;
const Trap_Killed_Mon = 2;
const Trap_Moved_Mon = 3;
const Trap_Is_Gone = 4; /* C trap.h: trap consumed (deltrap) */

/* mksobj is wired in lazily to avoid an import cycle with mklev.js (which pulls
 * in the full object subsystem).  registerTrapMksobj() is called once at startup
 * from fastforward.js alongside registerMklevFns().  C ref: t_missile (trap.c:1020)
 * calls mksobj(otyp, TRUE, FALSE). */
const _trapFns = { mksobj_fn: null, place_object_fn: null, make_corpse_fn: null };
export function registerTrapMksobj(mksobj, place_object, make_corpse) {
    _trapFns.mksobj_fn = mksobj;
    if (place_object) _trapFns.place_object_fn = place_object;
    if (make_corpse) _trapFns.make_corpse_fn = make_corpse;
}

/* Missile-trap object otyps — objects.h. */
const OTYP_ARROW = 18;
const OTYP_DART = 24;
const OTYP_ROCK = 474;

/* find_mac(mon) = mon->data->ac  (worn.c:709, unarmored common case).
 * Per-mndx AC table, generated from monsters.h LVL(...ac...) — same table the
 * uhitm.js melee path uses.  Default 10 (easy to hit) for unmatched indices. */
const MONS_AC = [3,-1,3,3,4,-4,8,8,8,8,6,6,7,7,7,7,6,5,5,4,4,4,4,4,4,4,2,10,9,4,4,4,6,5,6,6,6,4,6,-10,2,-4,-2,10,10,5,10,10,5,0,7,6,2,7,2,5,8,8,8,10,10,10,6,8,7,7,7,9,9,9,10,10,10,10,10,10,5,10,3,0,0,7,0,4,2,6,5,5,7,7,6,6,0,0,3,3,4,3,3,3,6,2,2,2,5,4,0,2,2,2,2,2,5,5,5,6,9,-4,0,0,3,5,0,-4,-5,-6,8,7,6,6,4,3,2,2,2,2,2,2,2,2,2,2,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3,2,2,2,2,9,9,9,9,9,7,7,10,10,4,10,0,0,6,4,3,3,3,-3,6,-2,10,10,10,10,0,-2,-4,-6,6,6,5,5,4,4,4,3,6,6,6,6,4,2,2,0,5,3,4,8,8,6,6,3,3,2,-10,8,3,3,5,2,2,4,2,0,4,-4,2,1,0,-6,5,4,0,-2,6,6,5,6,6,6,10,10,9,9,9,8,6,10,6,4,10,10,8,6,6,4,9,7,5,1,3,10,10,10,10,10,10,10,10,10,10,5,0,10,10,0,10,7,10,10,0,10,10,10,10,2,-8,0,-5,10,-4,0,-5,2,0,-6,0,-2,-1,-4,-1,-3,4,-2,-7,-5,-6,-3,-2,-5,-7,-8,-5,-5,-5,10,4,6,4,2,-1,-3,6,8,8,7,7,6,6,5,-1,0,10,10,10,10,10,10,10,10,10,10,10,10,10,0,0,0,0,0,0,7,0,0,0,10,0,0,-2,0,0,0,-1,-10,-2,10,0,0,2,0,10,10,10,10,10,10,10,10,10,10,10,10,10,10];
/* C you.h:472 AC_MAX — abs(base) capped at 99 for monster AC too
 * (worn.c:733, "same cap as for hero [find_ac(do_wear.c)]"). */
const FIND_MAC_AC_MAX = 99;
/* C objects.h AMULET_OF_GUARDING otyp — worn.c:725 special-cases it to a
 * fixed -2, not impacted by erosion (unlike every other ARM_BONUS piece).
 * Same otyp value as js/trap.js:2100 _MDW_AMULET_OF_GUARDING /
 * js/do_wear.js AMULET_OF_GUARDING. */
const FIND_MAC_AMULET_OF_GUARDING = 210;
/**
 * C ref: worn.c:717-736 find_mac(struct monst *mon):
 *   int base = mon->data->ac;
 *   long mwflags = mon->misc_worn_check;
 *   for (obj = mon->minvent; obj; obj = obj->nobj) {
 *       if (obj->owornmask & mwflags) {
 *           if (obj->otyp == AMULET_OF_GUARDING) base -= 2;
 *           else base -= ARM_BONUS(obj);
 *       }
 *   }
 *   if (abs(base) > AC_MAX) base = sgn(base) * AC_MAX;
 *   return base;
 *
 * ARM_BONUS(obj) (hack.h:1526-1528) is ported at _mdw_arm_bonus (below,
 * hoisted — same function m_dowear_type uses for the identical formula), so
 * this is not a second implementation, just a second caller.
 *
 * RNG: none.  `mon->misc_worn_check` gates which minvent items count exactly
 * as C's owornmask & mwflags does — a monster can carry unworn gear that must
 * NOT contribute.
 */
export function find_mac(mtmp) {
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    let base = (mndx >= 0 && mndx < MONS_AC.length) ? (MONS_AC[mndx] | 0) : 10;
    const mwflags = (mtmp.misc_worn_check | 0);
    for (let obj = mtmp.minvent; obj; obj = obj.nobj) {
        if (((obj.owornmask | 0) & mwflags) !== 0) {
            if ((obj.otyp | 0) === FIND_MAC_AMULET_OF_GUARDING)
                base -= 2;
            else
                base -= _mdw_arm_bonus(obj);
        }
    }
    if (Math.abs(base) > FIND_MAC_AC_MAX)
        base = sgn(base) * FIND_MAC_AC_MAX;
    return base;
}

/* MONS row layout (makemon_mons.json, per js/makemon.js permonstTemplate):
 *   [mlet, mlevel, geno, ?, maligntyp, mr1, mflags1, mflags2, mflags3, mmove]
 * — the LAST column is permonst.mmove, NOT msize.  msize is a separate
 * per-mndx table (js/makemon_msize.json), which is why trap_msize() below
 * exists.  This header used to claim column 9 was msize and read
 * `row[9] >= 4`, which is two errors compounding: the wrong column AND the
 * wrong constant (C monflag.h:181 MZ_LARGE is 3, not 4).  Reading mmove as a
 * size made bigmonst() true for every monster with speed >= 4, i.e. nearly all
 * of them, so missile_dmgval() rolled the LARGE die where C rolls the SMALL
 * one.  MEASURED, seed0030 segment 6 step 165: a dart trap hits a small
 * monster and C draws `rnd(3) @ dmgval(weapon.c:265)` (DART oc_wsdam 3) where
 * this port drew `rnd(2)` (oc_wldam 2) — leaf 18683.
 * C mondata.h:12 bigmonst(ptr) = ((ptr)->msize >= MZ_LARGE). */
const _TRAP_MONS = /** @type {number[][]} */ (monsPack.mons);
function mon_is_big(mtmp) {
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    if (mndx < 0)
        return false;
    return trap_msize(mndx) >= MZ_LARGE_T;
}

/* objects[otyp].oc_wsdam / oc_wldam for the missile otyps t_missile creates.
 * C ref: objects.h PROJECTILE()/WEAPON(): ARROW sdam=6 ldam=6; DART sdam=3 ldam=2.
 * ROCK (gem class) has no weapon dice (oc_wsdam == 0 → dmgval rnd not fired). */
const _MISSILE_WSDAM = { 18: 6, 24: 3, 474: 0 };
const _MISSILE_WLDAM = { 18: 6, 24: 2, 474: 0 };
/* dmgval(otmp, mon) for a trap missile — weapon.c:216-295, non-artifact path.
 * Returns damage; fires rnd(wsdam) or rnd(wldam) when the die is nonzero. */
function missile_dmgval(otyp, spe, mtmp) {
    let tmp = 0;
    if (mon_is_big(mtmp)) {
        const wl = _MISSILE_WLDAM[otyp] | 0;
        if (wl) tmp = rnd(wl);
    } else {
        const ws = _MISSILE_WSDAM[otyp] | 0;
        if (ws) tmp = rnd(ws);
    }
    /* Is_weapon (ARROW/DART are WEAPON_CLASS): tmp += spe; clamp >= 0 then +1 min. */
    tmp += (spe | 0);
    if (tmp < 0) tmp = 0;
    return (tmp < 1) ? 1 : tmp;
}

/* t_missile(otyp, trap) — make a single arrow/dart/rock for a trap.
 * C ref: trap.c:1020.  mksobj(otyp, TRUE, FALSE) → next_ident + mksobj_init +
 * mkobj_erosions (the full creation RNG).  quan/owt/opoisoned set after, no RNG. */
async function t_missile(otyp, trap) {
    const mksobj = _trapFns.mksobj_fn;
    if (!mksobj) {
        /* mksobj not yet registered — should not happen in normal flow. */
        return { otyp, quan: 1, spe: 0, opoisoned: 0, ox: trap.tx | 0, oy: trap.ty | 0 };
    }
    const otmp = await mksobj(otyp, true, false);
    otmp.quan = 1;
    otmp.opoisoned = 0;
    otmp.ox = trap.tx | 0;
    otmp.oy = trap.ty | 0;
    return otmp;
}

/* thitm — monster is hit by a trap missile.  C ref: trap.c:6690.
 * RNG: rnd(20) strike check; dmgval (rnd) only on a strike.  Returns true if the
 * monster was killed.  Damage/monkilled bookkeeping beyond mhp is left to the
 * (unported) death path; the corpus missile-trap case is a clean miss. */
async function thitm(tlev, mon, obj, d_override, nocorpse) {
    let strike;
    let trapkilled = false;
    if (d_override) {
        strike = 1;
    } else if (obj) {
        strike = (find_mac(mon) + tlev + (obj.spe | 0) <= rnd(20)) ? 1 : 0;
    } else {
        strike = (find_mac(mon) + tlev <= rnd(20)) ? 1 : 0;
    }

    if (!strike) {
        /* C trap.c:6714-6716: "<Monnam> is almost hit by <doname(obj)>!" when seen. */
        if (obj && cansee(mon.mx | 0, mon.my | 0)) {
            void pline(`${Monnam_t(mon)} is almost hit by ${missile_name(obj)}!`);
        }
    } else {
        /* C trap.c:6720-6745: hit — damage the monster.  harmless only for a
         * stone_missile passing a passes_rocks() monster (not ARROW/DART). */
        let dam = 1;
        const harmless = false;
        if (obj && cansee(mon.mx | 0, mon.my | 0)) {
            void pline(`${Monnam_t(mon)} is hit by ${missile_name(obj)}!`);
        }
        if (d_override) {
            dam = d_override | 0;
        } else if (obj) {
            dam = missile_dmgval(obj.otyp | 0, obj.spe | 0, mon);
            if (dam < 1) dam = 1;
        }
        if (!harmless) {
            mon.mhp = (mon.mhp | 0) - dam;
            if ((mon.mhp | 0) <= 0) {
                /* C trap.c:6735-6741: monkilled(mon, "", AD_PHYS); then, if the
                 * monster is DEADMONSTER, newsym + trapkilled = TRUE.  monkilled →
                 * mondied → mondead → corpse_chance → make_corpse for an ordinary
                 * monster (no fltxt message / no special death effect).  A pet
                 * stepping onto a pit (trapeffect_pit monster branch, which calls
                 * thitm with a d_override pit-damage value) dies here, and its
                 * corpse RNG (corpse_chance rn2(tmp) + make_corpse) must fire to
                 * stay in lockstep with C (seed0015 leaf 8500+). */
                await monkilled_trap(mon);
                trapkilled = true;
            }
        } else {
            strike = 0; /* C trap.c:6743: harmless → don't use up the missile */
        }
    }

    /* C trap.c:6747-6751: on a miss (or forced damage) the missile lands on the
     * monster's tile and stacks; on a real strike the missile is consumed. */
    if (obj && (!strike || d_override)) {
        const place_object = _trapFns.place_object_fn;
        if (place_object) {
            place_object(obj, mon.mx | 0, mon.my | 0);
            await stackobj(obj);
        }
    } else if (obj) {
        await dealloc_obj_trap(obj);
    }

    void nocorpse;
    return trapkilled;
}

/* Generation-flag bits, C monflag.h:194-211.  MZ_SMALL = 1 (monflag.h).
 * Used by corpse_chance / make_corpse.
 *   monflag.h:202  G_FREQ      0x0007   creation-frequency mask (permonst.geno)
 *   monflag.h:201  G_NOCORPSE  0x0010   (permonst.geno)
 * The G_GENOD/G_EXTINCT/G_GONE trio lives in a DIFFERENT bit space: it is the
 * per-mndx svm.mvitals[].mvflags byte, not permonst.geno.
 *   monflag.h:209  G_GENOD     0x02
 *   monflag.h:210  G_EXTINCT   0x01
 *   monflag.h:211  G_GONE      (G_GENOD | G_EXTINCT) == 0x03
 * (Previously declared here as 0x0200/0x0400/0x0600 — the permonst.geno values
 * of G_NOGEN and G_HELL, i.e. the wrong bit space entirely.) */
const G_FREQ_T = 0x0007;
const G_NOCORPSE_T = 0x0010;
const G_GENOD_T = 0x02;
const G_EXTINCT_T = 0x01;
const G_GONE_T = (G_GENOD_T | G_EXTINCT_T);
const MZ_SMALL_T = 1;   /* monflag.h MZ_SMALL */
const MZ_LARGE_T = 3;   /* monflag.h MZ_LARGE (bigmonst = msize >= MZ_LARGE) */
/* msize is a separate per-mndx table (same source uhitm.js uses); the
 * makemon_mons.json row does NOT carry the MZ_* enum. */
const _TRAP_MSIZE = /** @type {number[]} */ (monMsizePack.msize);
function trap_msize(mndx) {
    return (mndx >= 0 && mndx < _TRAP_MSIZE.length) ? (_TRAP_MSIZE[mndx] | 0) : MZ_SMALL_T;
}

/* corpse_chance — C mon.c:3173-3236, ordinary-monster path (magr == NULL,
 * was_swallowed == FALSE; the explosion/engulfer branches need an aggressor and
 * do not apply to a pit/trap death).  Returns whether a corpse should drop and,
 * as in C, consumes rn2(tmp) only on the final clause.
 *   if (LEVEL_SPECIFIC_NOCORPSE) return FALSE;            // no RNG
 *   if (((bigmonst||LIZARD) && !mcloned) || golem || mplayer || rider || isshk)
 *       return TRUE;                                      // no RNG
 *   tmp = 2 + ((geno & G_FREQ) < 2) + verysmall;
 *   return !rn2(tmp); */
function corpse_chance_mon(mtmp) {
    if (ENV.FF_DEATH_TRACE === '1')
        pushRngLogEntry(`^corpse_chance[id=${mtmp.m_id|0} pm=${(mtmp.mndx ?? mtmp.mnum ?? -1)|0} pos=${mtmp.mx|0},${mtmp.my|0}]`);
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    const row = (mndx >= 0 && mndx < _TRAP_MONS.length) ? _TRAP_MONS[mndx] : null;
    const geno = row ? (row[3] | 0) : 0;
    const msize = trap_msize(mndx);
    /* C mon.c:3231 special-always-corpse classes.  None apply to the ordinary
     * trap-killed pet (a dog is small, not a golem/player/rider/shopkeeper, and
     * is never mcloned on this path).  Mirrored as a guard so a future big/golem
     * monster dying in a trap matches C's no-RNG TRUE return. */
    const bigmonst = (msize >= MZ_LARGE_T);
    if ((bigmonst && !(mtmp.mcloned | 0))
        || mtmp.isshk) {
        return true;
    }
    /* C mon.c:3234: tmp = 2 + ((geno & G_FREQ) < 2) + verysmall(mdat).
     * verysmall(ptr) = (msize < MZ_SMALL). */
    const tmp = 2 + (((geno & G_FREQ_T) < 2) ? 1 : 0)
        + ((msize < MZ_SMALL_T) ? 1 : 0);
    return !rn2(tmp);
}

/* monkilled_trap — the monster-death path reached from thitm() when a trap's
 * damage drops a monster's mhp to 0.  C trap.c:6737 monkilled(mon, "", AD_PHYS),
 * which for an ordinary monster with empty fltxt and no special death effect
 * reduces to mondied(mon) → mondead(mon) (no RNG for a non-Kop, non-vampshifter,
 * non-steam-vortex monster) + corpse_chance + make_corpse + m_detach.
 *   mon.c:3242 mondead(mdef);              // detach from fmon, mvitals.died++
 *   mon.c:3247 if (corpse_chance(mdef,0,FALSE) && accessible) make_corpse(mdef);
 * make_corpse fires next_ident/rndmonst_adj/gender/start_corpse_timeout. */
/* C mondata.h nonliving(ptr) — is_undead || ptr == &mons[PM_MANES] ||
 * weirdnonliving(ptr).  js/makemon.js carries the shared body; imported by name
 * so the two spellings cannot drift. */
function _mk_nonliving(mtmp) {
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    return mndx >= 0 ? !!nonlivingMon(mndx) : false;
}
export async function monkilled_trap(mtmp, fltxt = '') {
    const g = game;
    /* C mon.c:3370-3376 monkilled(mdef, fltxt, how): fltxt is a non-null string
     * at every caller routed here, so the guard `if (fltxt && cansee(mx,my))` is
     * TRUE when the monster's tile is visible → pline "%s is %s%s%s!":
     *     nonliving(mdef->data) ? "destroyed" : "killed",
     *     *fltxt ? " by the " : "", fltxt
     * The trap callers pass "" (no suffix, which is what this printed before);
     * js/zap.js's dobuzz passes flash_str(fltyp, FALSE), giving C's
     * "<Monnam> is killed by the blast of fire!".  Emit BEFORE m_detach zeroes
     * mx/my.  DISPLAY-ONLY, RNG-free; the sad_feeling branch (out-of-sight pet)
     * is a deferred "you have a sad feeling" not exercised here.
     *
     * fltxt === null is C's NULL and takes the ELSE branch: no line at all.
     * trapeffect_rust_trap's iron-golem arm is the one caller that passes it
     * (C trap.c:1716 `monkilled(mtmp, (const char *) 0, AD_RUST)`), because the
     * "falls to pieces!" line it prints first IS the death message.  `''` stays
     * TRUTHY-for-the-guard exactly as a C empty string is a non-NULL pointer, so
     * every pre-existing caller is byte-unchanged. */
    if (fltxt !== null && cansee(mtmp.mx | 0, mtmp.my | 0)) {
        const _verb = _mk_nonliving(mtmp) ? 'destroyed' : 'killed';
        void pline(`${Monnam_t(mtmp)} is ${_verb}`
                   + (fltxt ? ` by the ${fltxt}` : '') + '!');
    } else {
        /* C mon.c:3370-3379: monkilled() defers an unseen tame monster's
         * death message through iflags.sad_feeling, then mondied()->mondead()
         * consumes it after the life-saving check.  explode.c reaches this
         * path for collateral blast deaths. */
        (g.iflags ||= {}).sad_feeling = !!mtmp.mtame;
    }
    /* C mon.c:3069-3087, through mondied()->mondead(): snapshot and clear
     * the deferred feeling before attempting life saving. */
    const beSad = !!g.iflags?.sad_feeling;
    if (g.iflags) g.iflags.sad_feeling = false;
    mtmp.mhp = 0;
    await lifesaved_monster(mtmp);
    if ((mtmp.mhp | 0) > 0) return;
    if (beSad)
        await pline('You have a sad feeling for a moment, then it passes.');
    /* C mon.c:3113-3117 — mondead() restores a shapechanger's true form
     * before it updates mvitals and before mondied() asks corpse_chance().
     * This death path is hand-rolled rather than delegated to mondead(), so it
     * must perform the same state transition.  Besides deciding which corpse
     * is made, the restored form changes whether corpse_chance draws at all:
     * a chameleon temporarily shaped as a large monster is not an automatic
     * large-monster corpse; C restores it to PM_CHAMELEON and rolls rn2(3).
     * Keep the original form's light/inventory teardown out of this block;
     * C saves the old permonst pointer for m_detach() before restoring data. */
    const trueForm = mtmp.cham | 0;
    if (trueForm >= 0) {
        const trueData = permonstTemplate(trueForm);
        if (trueData) {
            set_mon_data(mtmp, trueData);
            mtmp.cham = NON_PM;
        }
    }
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    /* C mon.c:3121 mondead: svm.mvitals[mndx].died++ (no RNG).  Kept for
     * faithful bookkeeping; G_GONE accrues only via genocide/extinction, so this
     * does not change make_corpse's G_NOCORPSE/G_GONE gate. */
    if (g.mvitals && mndx >= 0) {
        const mv = (g.mvitals[mndx] ||= { died: 0, mvflags: 0 });
        if ((mv.died | 0) < 255) mv.died = (mv.died | 0) + 1;
    }
    /* Remember the death cell before detach zeroes mx/my, so the corpse glyph can
     * be repainted there after placement (C: mon_leaving_level newsym(mx,my) +
     * the placed corpse object render). */
    const _dx = mtmp.mx | 0, _dy = mtmp.my | 0;
    /* C mon.c:3170-3171, the last thing mondead() does before m_detach():
     *     if (glyph_is_invisible(levl[mtmp->mx][mtmp->my].glyph))
     *         unmap_object(mtmp->mx, mtmp->my);
     * A monster the hero could not spot was being remembered as an 'I'; its
     * death retires that marker.  The newsym() below does NOT do it — out of
     * sight, display.c:1031-1032 re-shows the remembered glyph, so the 'I'
     * survives every later repaint until something unmaps it explicitly.
     * mondied() calls mondead() FIRST and corpse_chance/make_corpse after, so
     * this precedes the corpse roll, exactly as it does in C.
     * seed4500-knight-coverage step 1048: a red dragon's fire breath kills a
     * monster on <42,6>, a square the blind hero had mapped as 'I'.  C repaints
     * it as remembered floor; this port left the 'I' standing — the session's
     * one and only wrong frame.  js/mklev.js mondead() and js/dogmove.js
     * mondied_dm() already carry this call; this hand-rolled death path did not.
     */
    if (glyph_is_invisible_at(_dx, _dy))
        unmap_object(_dx, _dy);
    /* C mon.c:2765-2779: m_detach releases a dead monster's inventory before
     * mondied() rolls corpse_chance.  Keep this before the corpse roll: dropped
     * objects can be struck by the same beam, and their breaktest/delobj RNG is
     * part of this death's ordering. */
    await relobj_md(mtmp);
    /* C mon.c:3247-3249: drop a corpse if corpse_chance succeeds.  accessible()/
     * is_pool gate the *placement*, not the RNG — corpse_chance always rolls. */
    const dropCorpse = corpse_chance_mon(mtmp);
    if (dropCorpse) {
        const make_corpse = _trapFns.make_corpse_fn;
        if (make_corpse) await make_corpse(mtmp, _dx, _dy);
    }
    /* C mon.c m_detach(): "Take mtmp off map but not out of fmon list yet
     * (dmonsfree does that)."  mtmp->mhp is already 0 (set above); m_detach's
     * own job here reduces to flagging the monster MON_DETACH so a later
     * dmonsfree() purge (real body: js/mkmaze.js dmonsfree(), which walks
     * fmon unlinking on mhp<1) reaps it — this file used to splice mtmp out
     * of game.fmon immediately here, reasoning "JS has no purge pass"; that
     * no longer holds now that js/mkmaze.js's dmonsfree() is a real chain
     * walk and fmon.count is a LIVE mapstate slot (fmonCountSlot): an
     * immediate splice shrinks fmon.count on THIS call, one full purge pass
     * early, which mintrap's own capture corpus catches as an EXTRA state
     * change C never produces (records #100/#132/#296: a pit/trap kill
     * leaves C's fmon.count unchanged until the next dmonsfree()).  Leaving
     * mtmp linked (mhp=0, MON_DETACH set) until dmonsfree() runs is the same
     * C-faithful deferral js/mklev.js's mongone() already uses. */
    if ((mtmp.mstate | 0) & MON_DETACH) {
        /* C mon.c:2789-2792 `impossible("m_detach: ... already detached?")` —
         * monkilled_trap is never called twice on the same monster from any
         * live caller here, so this mirrors the impossible() by not
         * double-flagging rather than fabricating C's message-log side
         * effect. */
    } else {
        mtmp.mstate = (mtmp.mstate | 0) | MON_DETACH;
    }
    mtmp.mx = 0;
    mtmp.my = 0;
    /* C mon.c:2711 mon_leaving_level → newsym(mx,my): repaint the vacated cell now
     * that the monster is off the map.  With the corpse object placed above, this
     * renders the corpse glyph ('%') in place of the live monster ('d') — matching
     * C's step-28 screen.  The postmov caller (monmove.c:1537) also newsyms, but
     * only when mtmp->mx is still set; after detach it is 0, so do it here.  newsym
     * is RNG-free. */
    if (_dx > 0)
        newsym(_dx, _dy);
}

/* dealloc_obj_trap — drop a struck (consumed) trap missile.  C trap.c:6750
 * dealloc_obj(obj).  The missile was never linked onto the floor/global chains
 * (t_missile leaves it floating), so there is nothing to unlink, but it must
 * still go through the REAL dealloc_obj (js/mklev.js:3612 — sets
 * where=OBJ_DELETED and prepends to the game.objs_deleted queue) rather than
 * a hand-rolled `where` write, because the `objs_deleted.count` mapstate slot
 * is a dead bridgeSlot placeholder (js/mapstate_game_bridge.js:730) not
 * derived from that queue — it must be bumped by hand in step with the one
 * real deletion, the same pattern this file's own m_useupall / js/cmd.js
 * useupf / js/potion.js delobj use. Measured: a struck dart/arrow/rock trap
 * missile left `objs_deleted.count` MISSING (records #129, #300) because this
 * helper only mimicked the `where` write and skipped both the real queue and
 * the counter.  No RNG. */
async function dealloc_obj_trap(obj) {
    if (!obj) return;
    await dealloc_obj(obj);
    const store = game.__bridge__ || (game.__bridge__ = {});
    const key = 'objs_deleted.count';
    const cur = store[key] !== undefined ? Number(store[key]) : 0;
    store[key] = String(cur + 1);
}
const OBJ_DELETED_T = 9; /* C obj.h OBJ_DELETED (6 is OBJ_BURIED) */

/* stackobj — C ref: invent.c:4363-4375.
 *
 *     for (otmp = svl.level.objects[obj->ox][obj->oy]; otmp; otmp = otmp->nexthere)
 *         if (otmp != obj && merged(&obj, &otmp))
 *             break;
 *
 * THIS FILE USED TO CARRY ITS OWN file-local `stackobj` (plus `mergable_trap`
 * and `merge_floor_obj`) that SHADOWED the exported js/sp_lev.js:3694 one, and
 * it merged BACKWARDS: it called merge_floor_obj(otmp, obj) with otmp the PILE
 * MEMBER and obj the FRESHLY PLACED object, making the old pile member the
 * survivor and deleting the new object.  C's merged(&obj, &otmp) has `obj` — the object stackobj() was
 * called on, i.e. the one just place_object()'d — as *potmp, the SURVIVOR, and
 * the pile member `otmp` as *pobj, the one obj_extract_self()'d.  Because
 * place_object() prepends, the survivor therefore keeps the HEAD of fobj and the
 * TOP of svl.level.objects[x][y]; the shadow left it at the bottom of both.
 * Measured consequence (gen290-reseed-seed242132 step 31, falling-rock trap onto
 * a pile of 9 rocks at 32,4): the map cell rendered "%" instead of "*", and the
 * pet's next-turn dog_goal() fobj scan visited the pile in a different order, so
 * its rn2(8) fired one object early.
 *
 * The shadow was also a REDUCED port in two further ways — its mergable_trap
 * omitted the per-otyp oc_merge gate entirely (so two same-otyp non-stackable
 * items would merge), and its merge_floor_obj copied only `quan`, dropping C's
 * age averaging, owt recompute, known/rknown/bknown union, bypass propagation,
 * timer stop and obfree.  Rather than fix three defects in a private copy, the
 * shadow is deleted and the shared exported body is used, which is the one
 * js/cmd.js, js/dokick.js, js/zap.js, js/mhitu.js, js/end.js, js/vault.js and
 * js/mklev.js already call.  (js/sp_lev.js imports this file, so this is an ES
 * module cycle; `stackobj` is a hoisted function declaration and js/sp_lev.js
 * has no top-level executable statements, and the same cycle already exists
 * between js/sp_lev.js and js/cmd.js.) */
/* Safe accessor for a monster's given name. C's struct monst has NO
 * top-level mgivenname field — do_name.c always stores it at
 * mtmp->mextra->mgivenname — but a bare `mtmp?.mgivenname` read (this file's
 * former pattern, four call sites) triggers the capture-replay strict
 * Proxy's get-trap for a property never in STRUCT_FIELDS['struct monst *']
 * and throws "field 'mgivenname' was not captured" on every monster whose
 * mextra is null/absent (has_mgivenname===0), which is most of them.
 * `'mgivenname' in mtmp` (Reflect.has, no get trap) probes without
 * triggering it — same pattern as js/dogmove.js's _has_mgivenname_dm — so
 * this stays defensive against any code path that writes a top-level field
 * (js/mhitm.js's new_mgivenname does) without throwing on the common case. */
function _mgivenname(mtmp) {
    if (!mtmp) return '';
    if (mtmp.mextra && mtmp.mextra.mgivenname) return mtmp.mextra.mgivenname;
    return ('mgivenname' in mtmp) ? (mtmp.mgivenname || '') : '';
}
/* C mondata.h humanoid(ptr) = ptr->mflags1 & M1_HUMANOID (monflag.h). Used by
 * mintrap's setmangry inlining (mon.c:4301-4306) to pick the "gets angry!"
 * pline vs growl() branch — mirrors js/mklev.js's setmangry local `humanoid`. */
function _is_humanoid_mt(ptr) {
    return ((ptr?.mflags1 | 0) & 0x00020000 /* M1_HUMANOID */) !== 0;
}
/* C ref: do_name.c Monnam(mtmp) = capitalised mon_nam(mtmp).
 * mon_nam returns the proper given name (no article/capitalisation) or
 * "the <species>" (e.g. "the kitten"); Monnam capitalises the first letter
 * → "The kitten".  Reuses the shared mon_nam (uhitm.js) so the species table
 * is single-sourced. */
function Monnam_t(mtmp) {
    if (!mtmp) return 'It';
    const gn = _mgivenname(mtmp);
    if (gn) return gn; /* proper name: no article, no capitalisation */
    const s = mon_nam(mtmp); /* "the kitten" / "it" */
    return s.charAt(0).toUpperCase() + s.slice(1); /* "The kitten" / "It" */
}
function missile_name(obj) {
    switch (obj.otyp | 0) {
        case OTYP_ARROW: return 'an arrow';
        case OTYP_DART: return 'a dart';
        case OTYP_ROCK: return 'a rock';
        default: return 'a missile';
    }
}
/* ---------------------------------------------------------------------------
 * chest_trap — trigger a chest trap (box/chest with a trap flag set)
 * C ref: nethack-c/src/trap.c:6274
 *   boolean chest_trap(struct obj *obj, int bodypart, boolean disarm)
 *
 * Called when the hero opens/kicks/disarms a trapped chest.
 * RNG call sequence drawn by THIS function's own body:
 *   1. rn2(13 + Luck)          — trap.c:6292 luck-saves check
 *   2. rn2(13)                 — trap.c:6294 (luck path) which message
 *   3. rn2(20)                 — trap.c:6326 (bad path) outer selector
 *   4. rn2(13-Luck) or rn2(26) — trap.c:6326 (bad path) inner selector
 *   5. d(6,6)                  — trap.c:6378 explosion damage (cases 21-25)
 *   6. rn2(3)                  — trap.c:6399 gas cloud branch (cases 17-20)
 *   7. d(4,4)                  — trap.c:6423 electricity dmg (cases 6-8)
 *   8. d(5,6)                  — trap.c:6444 freeze duration nomul (cases 3-5)
 *   9. rn2(6) or rn2(CLR_MAX)  — trap.c:6455 ROLL_FROM(blindgas) when Blind,
 *                                else rndcolor() (cases 0-2)
 *  10. rn1(7,16)               — trap.c:6466 stunned duration (cases 0-2)
 *  11. rn1(5,16)               — trap.c:6468 hallucination duration (cases 0-2)
 *
 * KNOWN GAPS — this body is RNG-shaped for its own draws but its CALLEES are
 * not ported, and several of them DO draw core RNG in C.  Listed per branch,
 * with an explicit statement of whether C draws on the gapped path, because
 * that determines whether wiring chest_trap up is safe:
 *   cases 21-25 (explode): stolen_value/delete_contents/delobj/wake_nearby and
 *       losehp are missing.  C DRAWS NO extra core RNG on this path
 *       (delete_contents shk.c and wake_nearby mon.c have no rn* calls), but
 *       the hero survives damage-free and the floor stack is not destroyed.
 *   cases 17-20 (noxious gas): C calls poisoned() (attrib.c) on the rn2(3)!=0
 *       arm — poisoned DRAWS (rn2(fatal+…), d(4,6), rnd(6), rn1(10,6), …),
 *       and create_gas_cloud on the other arm.  JS draws NOTHING here.
 *   cases 13-16 (needle): C calls poisoned("needle", …) — DRAWS, as above.
 *       JS draws nothing.
 *   cases 9-12 (fire): C calls dofiretrap() — DRAWS heavily (d(2,4), rnd(3),
 *       rn2(2), …).  JS draws nothing.
 *   cases 6-8 (shock): C calls destroy_items(…, AD_ELEC, orig_dmg) — DRAWS
 *       (rn2(DMG_DESTROY_SCALE), rn2(elig_stacks)) — plus losehp.  JS draws
 *       only the d(4,4).
 *   cases 3-5 (freeze): C calls nomul(-d(5,6)) and sets nomovemsg; nomul draws
 *       NOTHING, so this branch is RNG-exact today — the only gap is that the
 *       hero is not actually paralysed.  (This is the branch the one recorded
 *       C invocation in the corpus takes; see below.)
 *   cases 0-2 (hallu gas): make_stunned/make_hallucinated (potion.c) draw
 *       NOTHING, so this branch is RNG-exact today apart from the missing
 *       property writes.
 * Because five of the seven branches under-consume, this function is
 * DELIBERATELY LEFT UNWIRED (census: UNWIRED/HIGH, 0 call sites).  The single
 * C invocation in the whole 64-session corpus is seed0006-wizard-sepra step
 * 124 (a `#loot` of a trapped box → pickup.c:2991), which takes the freeze
 * branch: rn2(13)=5 @trap.c:6292, rn2(20)=3 and rn2(13)=5 @trap.c:6326,
 * d(5,6)=15 @trap.c:6444.  That is at global RNG index 6670, far past that
 * session's first divergence (~2905), so wiring it cannot move the score
 * today; it can only lose RNG parity on the other six branches.  Port
 * poisoned/dofiretrap/destroy_items first, THEN wire the pickup.c:2991,
 * pickup.c:3971, lock.c:155, dokick.c:661/669 and trap.c:5783 call sites.
 *
 * Returns TRUE if the chest object was destroyed (caller must not use obj).
 * Returns FALSE otherwise (hero survived or trap fizzled).
 * ---------------------------------------------------------------------------
 */
export async function chest_trap(obj, bodypart, disarm) {
    const u = game.u || {};
    const gm = game.gm || {};
    const gn = game.gn || {};
    const gy = game.gy || {};
    /* Update obj location from level objects if possible (obj might be carried) */
    /* C: get_obj_location(obj, &cc.x, &cc.y, 0) — no RNG */
    obj.tknown = 0; /* for xname(); will be set to 1 below */
    obj.otrapped = 0; /* trap is one-shot */
    /* C: You(disarm ? "set it off!" : "trigger a trap!") — no RNG */
    await pline(disarm ? 'You set it off!' : 'You trigger a trap!');
    /* C: display_nhwindow(WIN_MESSAGE, FALSE) — no RNG */
    topl_force_break_now();
    /* Compute Luck = u.uluck + u.moreluck */
    const luck = ((u.uluck | 0) + (u.moreluck | 0));
    /* RNG 1: luck saves check */
    if (luck > -13 && rn2(13 + luck) > 7) {
        /* Saved by luck — trap went off but good luck prevents damage */
        /* RNG 2: which fizzle message */
        const msgRoll = rn2(13);
        /* C: pline("But luckily the %s!", msg) — no RNG */
        void msgRoll; /* message selected by roll, display is side-effect only */
    }
    else {
        /* Bad path: take the trap effect */
        /* RNG 3: outer selector — rn2(20) determines inner range */
        const outer = rn2(20);
        /* RNG 4: inner selector */
        let inner;
        if (outer) {
            /* rn2(20) != 0: inner is 0..(12-Luck) range */
            if (luck >= 13) {
                inner = 0; /* (Luck >= 13) → 0 with no rn2 call */
            }
            else {
                inner = rn2(13 - luck); /* RNG 4a */
            }
        }
        else {
            /* rn2(20) == 0: wide range */
            inner = rn2(26); /* RNG 4b */
        }
        /* Dispatch on inner, mirroring C switch fall-through */
        if (inner >= 21 && inner <= 25) {
            /* Explosion: cases 21-25 */
            /* C: pline("%s!", Tobjnam(obj, "explode")) — no RNG */
            /* C: costly_spot / stolen_value / delete_contents / wake_nearby — no RNG */
            /* RNG 5: d(6,6) explosion damage */
            const dmg = d(6, 6);
            void dmg; /* C: losehp(Maybe_Half_Phys(dmg), buf, KILLED_BY_AN) */
            /* C: exercise(A_STR, FALSE) — no RNG */
            exercise(A_STR, false);
            /* C: if chestgone return TRUE */
            /* We cannot know if chest was destroyed without full obj-list walk,
             * so conservatively return false (safe: caller holds ref to obj).
             * A full implementation would walk level.objects[ox][oy]. */
            obj.tknown = 1;
            await bot();
            return false;
        }
        else if (inner >= 17 && inner <= 20) {
            /* Noxious gas cloud: cases 17-20 */
            /* C: pline("A cloud of noxious gas billows from %s.", ...) — no RNG */
            /* RNG 6: rn2(3) — poison or create_gas_cloud */
            if (rn2(3)) {
                /* C: poisoned("gas cloud", A_STR, ...) — no RNG in itself */
                void A_STR;
            }
            else {
                /* C: create_gas_cloud(obj->ox, obj->oy, 1, 8) — no RNG */
            }
            /* C: exercise(A_CON, FALSE) — no RNG */
            exercise(A_CON, false);
        }
        else if (inner >= 13 && inner <= 16) {
            /* Poisoned needle: cases 13-16 */
            /* C: You_feel("a needle prick your %s.", body_part(bodypart)) — no RNG */
            /* C: poisoned("needle", A_CON, ...) — no RNG */
            void bodypart;
            exercise(A_CON, false);
        }
        else if (inner >= 9 && inner <= 12) {
            /* Fire trap: cases 9-12 */
            /* C: dofiretrap(obj) — dofiretrap has its own RNG but is an unported stub */
            /* We call the stub; it will consume no RNG until ported */
        }
        else if (inner >= 6 && inner <= 8) {
            /* Electricity: cases 6-8 */
            /* C: int dmg = d(4, 4) — RNG 7 */
            const elecDmg = d(4, 4);
            /* C: You("are jolted by a surge of electricity!") — no RNG */
            /* Check Shock_resistance: u.uprops[SHOCK_RES].intrinsic || extrinsic */
            const shockRes = u.uprops && u.uprops[SHOCK_RES]
                ? ((u.uprops[SHOCK_RES].intrinsic | 0) || (u.uprops[SHOCK_RES].extrinsic | 0))
                : 0;
            if (shockRes) {
                /* C: shieldeff / You("don't seem...") / monstseesu — no RNG */
                void elecDmg;
            }
            else {
                /* C: monstunseesu / destroy_items(&gy.youmonst, AD_ELEC, orig_dmg) — destroy_items has RNG but is stub */
                /* C: losehp(dmg, ...) — no RNG */
                void elecDmg;
            }
        }
        else if (inner >= 3 && inner <= 5) {
            /* Freeze: cases 3-5 */
            /* C: if (!Free_action) — no RNG */
            const freeAction = u.uprops && u.uprops[FREE_ACTION]
                ? (u.uprops[FREE_ACTION].extrinsic | 0)
                : 0;
            if (!freeAction) {
                await pline('Suddenly you are frozen in place!');
                /* RNG 8: d(5, 6) freeze duration for nomul */
                const freezeDur = d(5, 6);
                /* C: nomul(-freezeDur) — no RNG */
                nomul(-freezeDur);
                if (gm)
                    gm.multi_reason = "frozen by a trap";
                /* C: exercise(A_DEX, FALSE) — no RNG */
                exercise(A_DEX, false);
                if (gn)
                    gn.nomovemsg = "You can move again.";
                void freezeDur;
            }
            else {
                /* C: You("momentarily stiffen.") — no RNG */
            }
        }
        else {
            /* Hallucinogenic gas cloud: cases 0-2 (default) — C trap.c:6454-6456
             *   pline("A cloud of %s gas billows from %s.",
             *         Blind ? ROLL_FROM(blindgas) : rndcolor(), the(xname(obj)));
             * BOTH arms of that conditional draw exactly one core rn2:
             *   - ROLL_FROM (hack.h:1498) IS `array[rn2(SIZE(array))]`, and
             *     blindgas (trap.c:82) is `const char *const blindgas[6]`,
             *     so the Blind arm draws rn2(6).  The previous comment here
             *     ("picks from static array with no RNG") mis-read the macro
             *     and the Blind path drew nothing at all.
             *   - rndcolor() (do_name.c:1470-1476) draws rn2(CLR_MAX); its
             *     Hallucination arm calls hcolor(), which uses
             *     rn2_on_display_rng — the DISPLAY stream, not the scored one —
             *     so it adds no core draw.
             * Only one of the two conversion arguments draws, so the
             * unspecified varargs evaluation order of `pline` is not
             * observable here (the(xname(obj)) draws nothing). */
            const blind = u.uprops && u.uprops[15 /*BLINDED*/]
                ? ((u.uprops[15].intrinsic | 0) || (u.uprops[15].extrinsic | 0))
                : 0;
            if (blind) {
                /* RNG 9a: ROLL_FROM(blindgas) → rn2(6) */
                rn2(6);
            } else {
                /* RNG 9b: rndcolor() → rn2(CLR_MAX) */
                rn2(CLR_MAX);
            }
            /* C: if (!Stunned) { pline(...stagger...) } — no RNG */
            /* RNG 10: make_stunned((HStun & TIMEOUT) + rn1(7, 16), FALSE) */
            const hStun = u.uprops && u.uprops[STUNNED]
                ? (u.uprops[STUNNED].intrinsic & TIMEOUT)
                : 0;
            const stunDur = hStun + rn1(7, 16);
            void stunDur; /* C: make_stunned(stunDur, FALSE) — sets HStun */
            /* RNG 11: make_hallucinated((HHallucination & TIMEOUT) + rn1(5, 16), FALSE, 0L) */
            const hHalluc = u.uprops && u.uprops[HALLUC]
                ? (u.uprops[HALLUC].intrinsic & TIMEOUT)
                : 0;
            const hallucDur = hHalluc + rn1(5, 16);
            void hallucDur; /* C: make_hallucinated(hallucDur, FALSE, 0L) */
        }
        /* C: bot() — no RNG */
        await bot();
    }
    obj.tknown = 1; /* hero knows chest is no longer trapped */
    return false;
}
/* ---------------------------------------------------------------------------
 * t_at — look up a trap by coordinates
 * C ref: nethack-c/src/trap.c:6482
 *   struct trap *t_at(coordxy x, coordxy y)
 *
 * Walk gf.ftrap linked list and return first trap with tx==x, ty==y.
 * Returns null (C: (struct trap *)0) if none found.
 * No RNG consumed. Safe to call from any context.
 * TODO: wire into mklev/dotrap/mintrap once gstate trap list is populated.
 * ---------------------------------------------------------------------------
 */
export function t_at(x, y) {
    // TODO(L12+): walk game.level.traps list and return matching trap object.
    // C: gf.ftrap linked list via trap->ntrap.
    // Safe return value: null (no trap found).
    if (!game.level || !game.level.traps)
        return null;
    for (const trap of game.level.traps) {
        if (trap.tx === x && trap.ty === y)
            return trap;
    }
    return null;
}
/* deltrap — remove a trap from the level.  C ref: trap.c:1700 deltrap(trap):
 * unlink from gf.ftrap and free.  No RNG.  Our trap list is an array, so splice
 * the matching entry. */
export function deltrap(trap) {
    if (!trap) return;
    /* C trap.c:1700 deltrap() unlinks from gf.ftrap; both containers have to
     * drop it or the chain readers keep seeing a trap the array no longer has.
     *
     * Capture-replay (tools/equiv-test/auto-replay-sweep.mjs, marshal class
     * struct-fields) reconstructs the `trap` argument as a FRESH object built
     * from the record's trap_tx/trap_ty/trap_ttyp/... fields, not the literal
     * element the mapstate bridge seeded onto game.ftrap/game.level.traps, so
     * `===` never matches during replay even though it is the same trap.
     * Measured: STATUE_TRAP records #8/#10/#16 all had game.level.traps
     * contain a [tx,ty,ttyp]-matching entry with `t === trap` false, so both
     * unlinks below fall back to positional identity — (tx,ty) uniquely
     * identifies a trap in C's own one-trap-per-square invariant, so this is
     * not a guess. Reference equality is tried first so a live (non-replay)
     * caller passing the real object keeps working unchanged. */
    const samePos = (o) => !!o && (o.tx | 0) === (trap.tx | 0) && (o.ty | 0) === (trap.ty | 0);
    const isMatch = (o) => o === trap;
    let unlinkedHead = false;
    if (isMatch(game.ftrap)) {
        game.ftrap = game.ftrap.ntrap ?? null;
        unlinkedHead = true;
    } else {
        for (let t = game.ftrap; t; t = t.ntrap) {
            if (isMatch(t.ntrap)) { t.ntrap = t.ntrap.ntrap ?? null; unlinkedHead = true; break; }
        }
    }
    if (!unlinkedHead) {
        if (samePos(game.ftrap)) {
            game.ftrap = game.ftrap.ntrap ?? null;
        } else {
            for (let t = game.ftrap; t; t = t.ntrap) {
                if (samePos(t.ntrap)) { t.ntrap = t.ntrap.ntrap ?? null; break; }
            }
        }
    }
    trap.ntrap = null;
    if (!game.level || !Array.isArray(game.level.traps)) return;
    let i = game.level.traps.indexOf(trap);
    if (i < 0)
        i = game.level.traps.findIndex(t => (t.tx | 0) === (trap.tx | 0) && (t.ty | 0) === (trap.ty | 0));
    if (i >= 0) game.level.traps.splice(i, 1);
}
/* C trap.c:6667-6690 — boolean delfloortrap(struct trap *ttmp)
 *
 * "some of these are arbitrary -dlc": the trap types a flood / terrain change
 * is allowed to wash away.  Anything else (a magic portal, a vibrating square,
 * the stairs-adjacent traps) survives and the caller aborts whatever it was
 * doing to that square -- gush() returns without making a pool there.
 *
 *   if (ttmp && (SQKY_BOARD || BEAR_TRAP || LANDMINE || FIRE_TRAP
 *                || is_pit || is_hole || TELEP_TRAP || LEVEL_TELEP
 *                || WEB || MAGIC_TRAP || ANTI_MAGIC)) {
 *       if (u_at(tx, ty)) { if (u.utraptype != TT_BURIEDBALL) reset_utrap(TRUE); }
 *       else if ((mtmp = m_at(tx, ty)) != 0) mtmp->mtrapped = 0;
 *       deltrap(ttmp);
 *       return TRUE;
 *   }
 *   return FALSE;
 */
export async function delfloortrap(ttmp) {
    if (ttmp && (ttmp.ttyp === SQKY_BOARD || ttmp.ttyp === BEAR_TRAP
                 || ttmp.ttyp === LANDMINE || ttmp.ttyp === FIRE_TRAP
                 || is_pit(ttmp.ttyp)
                 || is_hole(ttmp.ttyp)
                 || ttmp.ttyp === TELEP_TRAP || ttmp.ttyp === LEVEL_TELEP
                 || ttmp.ttyp === WEB || ttmp.ttyp === MAGIC_TRAP
                 || ttmp.ttyp === ANTI_MAGIC)) {
        if (u_at(ttmp.tx, ttmp.ty)) {
            if (game.u.utraptype !== TT_BURIEDBALL)
                await reset_utrap(true);
        } else {
            const mtmp = _gp_m_at(ttmp.tx, ttmp.ty);
            if (mtmp)
                mtmp.mtrapped = 0;
        }
        deltrap(ttmp);
        return true;
    }
    return false;
}
/* count_traps — C ref: trap.c:6495 count_traps(ttyp).
 * Count traps of a given type on the level. No RNG. */
export function count_traps(ttyp) {
    let ret = 0;
    if (!game.level || !Array.isArray(game.level.traps)) return 0;
    for (const trap of game.level.traps) {
        if ((trap.ttyp | 0) === (ttyp | 0))
            ret++;
    }
    return ret;
}
// C ref: trap.h TT_* utraptype values (you.h:339-344).
const TT_BEARTRAP_ = 1, TT_PIT_ = 2, TT_WEB_ = 3, TT_LAVA_ = 4;
// C ref: rm.h CAN_OVERWRITE_TERRAIN(ttyp) — stairs/ladder require wizmode debug flag.
function CAN_OVERWRITE_TERRAIN(ttyp) {
    const debugOverwriteStairs = !!(game.iflags && game.iflags.debug_overwrite_stairs);
    return debugOverwriteStairs || !(ttyp === LADDER || ttyp === STAIRS);
}
// C ref: rm.h — levl[x][y].typ read. The replay oracle's capture never
// populates level_tiles for maketrap (harness capture-adequacy gap; see
// capture-adequacy-gate.mjs --fn maketrap), so game.level may be a fresh
// all-STONE GameMap (built by the "traps" side-channel) or entirely
// unset. An uncaptured tile reads as STONE (the GameMap default), never
// throws — matches how a real, tile-populated GameMap defaults untouched
// cells.
function lev_typ(x, y) {
    const loc = (game.level && game.level.at) ? game.level.at(x, y) : null;
    return loc ? (loc.typ | 0) : STONE;
}
function lev_flags(x, y) {
    const loc = (game.level && game.level.at) ? game.level.at(x, y) : null;
    return loc || null;
}
// C ref: dbridge.c is_lava(x,y).
function is_lava_local(x, y) {
    if (!isok(x, y)) return false;
    const t = lev_typ(x, y);
    const loc = lev_flags(x, y);
    const dbmask = loc ? (loc.drawbridgemask | 0) : 0;
    return t === LAVAPOOL || t === LAVAWALL
        || (t === DRAWBRIDGE_UP && (dbmask & 28 /* DB_UNDER */) === 4 /* DB_LAVA */);
}
// C ref: dbridge.c is_pool_or_lava(x,y) = is_pool(x,y) || is_lava(x,y).
// Reimplemented locally (rather than importing js/look.js's is_pool_or_lava)
// because that shared helper dereferences `game.level.at(x, y)` without a
// typeof guard and throws when game.level is the plain-object fallback this
// replay oracle produces for captures with a stairs/rooms side-channel but
// no level_tiles snapshot (project_level_grid_null_tiles_empty_traps_gap;
// see tools/equiv-test/lib/replay-core.mjs's loadGameFromMapstate comment).
// lev_typ()/lev_flags() already default to STONE/null for that shape, so
// this mirrors dbridge.c exactly without hitting the crash.
function is_pool_or_lava_local(x, y) {
    if (!isok(x, y)) return false;
    const t = lev_typ(x, y);
    const loc = lev_flags(x, y);
    const dbmask = loc ? (loc.drawbridgemask | 0) : 0;
    if (t === 16 /* POOL */ || t === 17 /* MOAT */ || t === 18 /* WATER */
        || (t === DRAWBRIDGE_UP && (dbmask & 28 /* DB_UNDER */) === 0 /* DB_MOAT */))
        return true;
    return is_lava_local(x, y);
}
// C ref: trap.h unhideable_trap(ttyp) ((ttyp) == HOLE).
function unhideable_trap(ttyp) {
    return ttyp === HOLE;
}
/* single_level_branch (C ref: dungeon.c:1965-1973) is NOT redefined here for
 * the same reason mk_trap_statue below isn't: its body is `Is_knox(lev)`, and
 * Is_knox_level plus the dungeon tables it reads are module-local to
 * js/mklev.js.  Re-exported under its C name so js/trap.js#single_level_branch
 * still resolves for the C-function inventory and for maketrap's LEVEL_TELEP
 * guard at trap.c:482, which was throwing here. */
export { single_level_branch };
/* mk_trap_statue (C ref: trap.c:389-414) is NOT redefined here.  Its one body
 * lives in js/mklev.js (imported at the top of this file) because its callee
 * chain — rndmonnum_adj/mkcorpstat/makemon/mongone — is module-local there.
 * Re-exported under its C name so the C-function inventory's
 * js/trap.js#mk_trap_statue counterpart still resolves. */
export { mk_trap_statue };
/* mkroll_launch (C ref: trap.c:3658-3691) is NOT redefined here either.  Its
 * one body lives in js/mklev.js beside find_random_launch_coord / isclearpath
 * (module-local there, and its mksobj/place_object/weight chain is too), which
 * is also where the sole C call site — maketrap's ROLLING_BOULDER_TRAP arm,
 * trap.c:512 — already reaches it from.  Re-exported under its C name. */
export { mkroll_launch };
/* `coordxy *x` / `coordxy *y` out-params.  The replay marshaller boxes a C
 * scalar pointer as {value:n} — the same convention js/ball.js (ballx.value)
 * and js/dokick.js (x.value / y.value) already use for coordxy* args — so read
 * and write through .value when boxed.  A plain number is accepted too, for
 * JS-internal callers that have no pointer to model; then the write-back is a
 * no-op, exactly as it is for any JS caller that passes a value copy. */
function coordptr_get(p) {
    return (p !== null && typeof p === 'object') ? p.value : p;
}
function coordptr_set(p, v) {
    if (p !== null && typeof p === 'object') p.value = v;
}
/* C `mon == &gy.youmonst`.  Reconstructed capture records are not the same
 * object as game.youmonst, so fall back to the m_id sentinel this file already
 * uses for that comparison (see immune_to_trap's is_you note below:
 * set_uasmon() hardcodes gy.youmonst.m_id = 1 and next_ident() reserves it). */
function _gp_is_youmonst(mon) {
    if (!mon) return false;
    if (mon === game.youmonst) return true;
    return (mon.m_id | 0) === 1;
}
/* C pointer equality between two struct monst *.  Capture-reconstructed
 * structs are distinct objects from the game.fmon entries they describe, so
 * m_id is the faithful identity key (same convention as above). */
function _gp_same_mon(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    if (typeof a !== 'object' || typeof b !== 'object') return false;
    return a.m_id != null && b.m_id != null && (a.m_id | 0) === (b.m_id | 0);
}
/* C's monster grid includes worm segments. Use the shared lookup so goodpos
 * cannot place a worm's next segment on an earlier segment of its own tail. */
function _gp_m_at(x, y) {
    return m_at(x, y);
}
/* C ref: dbridge.c:99-113 is_moat(x,y). */
function _gp_is_moat(x, y) {
    if (!isok(x, y)) return false;
    const ltyp = lev_typ(x, y);
    const loc = lev_flags(x, y);
    const dbmask = loc ? (loc.drawbridgemask | 0) : 0;
    /* Is_juiblex_level(&u.uz) — Juiblex's lair is a special level that the
       dungeon side-channel does not identify here; it is never the level any
       goodpos() caller in this module runs on, so this reads as false, which
       is C's behaviour on every ordinary level. */
    return ltyp === MOAT
        || (ltyp === DRAWBRIDGE_UP && (dbmask & DB_UNDER) === DB_MOAT);
}
/* C ref: dbridge.c:45-59 is_pool(x,y). */
function _gp_is_pool(x, y) {
    if (!isok(x, y)) return false;
    const ltyp = lev_typ(x, y);
    return ltyp === POOL || ltyp === MOAT || ltyp === WATER || _gp_is_moat(x, y);
}
/* C ref: dbridge.c:37-42 is_waterwall(x,y). */
function _gp_is_waterwall(x, y) {
    return isok(x, y) && !!IS_WATERWALL(lev_typ(x, y));
}
/* C ref: hack.c:914-919 may_passwall(x,y). */
function _gp_may_passwall(x, y) {
    const loc = lev_flags(x, y);
    return !(IS_STWALL(lev_typ(x, y)) && ((loc ? loc.wall_info | 0 : 0) & W_NONPASSWALL));
}
/* C ref: monmove.c:2204-2209 closed_door(x,y). */
function _gp_closed_door(x, y) {
    const loc = lev_flags(x, y);
    return !!(IS_DOOR(lev_typ(x, y))
              && ((loc ? loc.doormask | 0 : 0) & (D_LOCKED | D_CLOSED)));
}
/* C ref: dbridge.c:115-128 db_under_typ(mask). */
function _gp_db_under_typ(mask) {
    switch ((mask & DB_UNDER) | 0) {
    case DB_ICE:  return ICE;
    case DB_LAVA: return LAVAPOOL;
    case DB_MOAT: return MOAT;
    default:      return STONE;
    }
}
/* C ref: rm.h:133-136 SURFACE_AT(x,y). */
function _gp_surface_at(x, y) {
    const ltyp = lev_typ(x, y);
    if (ltyp !== DRAWBRIDGE_UP) return ltyp;
    const loc = lev_flags(x, y);
    return _gp_db_under_typ(loc ? loc.drawbridgemask | 0 : 0);
}
/* C ref: monmove.c:2211-2218 accessible(x,y). */
function _gp_accessible(x, y) {
    return !!(ACCESSIBLE(_gp_surface_at(x, y)) && !_gp_closed_door(x, y));
}
/* C ref: hack.c:906-912 may_dig(x,y). */
function _gp_may_dig(x, y) {
    const loc = lev_flags(x, y);
    const ltyp = lev_typ(x, y);
    return !((IS_STWALL(ltyp) || IS_TREE(ltyp))
             && ((loc ? loc.wall_info | 0 : 0) & W_NONDIGGABLE));
}
/* C ref: hack.c:3977-3990 doorless_door(x,y).  js/cmd.js keeps the same port
 * but does not export it, so this is a local copy of the same six lines. */
function _gp_doorless_door(x, y) {
    if (!IS_DOOR(lev_typ(x, y))) return false;
    if (Is_rogue_level(game.u?.uz)) return false;
    const loc = lev_flags(x, y);
    return !((loc ? loc.doormask | 0 : 0) & ~(D_NODOOR | D_BROKEN));
}
/* C ref: mondata.h:19-33/134 monster-flag predicates read by goodpos(). */
const _GP_M1_SWIM = 0x00000002, _GP_M1_AMORPHOUS = 0x00000004,
      _GP_M1_WALLWALK = 0x00000008, _GP_M1_AMPHIBIOUS = 0x00000200,
      _GP_M2_ROCKTHROW = 0x08000000;
const _GP_S_EEL = 57; /* defsym.h:362 MONSYM(57, ';', EEL, S_EEL, ...) */
function _gp_is_swimmer(mdat) { return ((mdat?.mflags1 | 0) & _GP_M1_SWIM) !== 0; }
function _gp_amorphous(mdat) { return ((mdat?.mflags1 | 0) & _GP_M1_AMORPHOUS) !== 0; }
function _gp_passes_walls(mdat) { return ((mdat?.mflags1 | 0) & _GP_M1_WALLWALK) !== 0; }
function _gp_throws_rocks(mdat) { return ((mdat?.mflags2 | 0) & _GP_M2_ROCKTHROW) !== 0; }
/* C ref: mondata.h likes_lava(ptr) — pointer identity against
 * mons[PM_FIRE_ELEMENTAL] / mons[PM_SALAMANDER], ported on the form index. */
function _gp_likes_lava(mdat) {
    const pm = mdat?.pmidx | 0;
    return pm === PM_FIRE_ELEMENTAL || pm === PM_SALAMANDER;
}
/* C ref: mon.c:2118 m_in_air(mtmp) = is_flyer || is_floater
 * || (is_clinger && has_ceiling(&u.uz) && mtmp->mundetected).  Uses this
 * file's existing _imm_* permonst predicates (same mflags1 bits). */
function _gp_m_in_air(mtmp) {
    const pm = mtmp?.data;
    if (!pm) return false;
    return _imm_is_flyer(pm) || _imm_is_floater(pm)
        || (_imm_is_clinger(pm) && _imm_has_ceiling(game.u?.uz)
            && !!mtmp.mundetected);
}
/* C ref: dungeon.h Is_waterlevel(&u.uz) — the Plane of Water. */
function _gp_Is_waterlevel() {
    const uz = game.u?.uz, wl = game.water_level;
    return !!uz && !!wl && uz.dnum === wl.dnum && uz.dlevel === wl.dlevel;
}
/* C ref: youprop.h Upolyd. */
function _gp_Upolyd() {
    const u = game.u;
    return !!(u && u.umonnum !== u.umonster);
}
/* C ref: monmove.c:241-304 onscary.  Still unported: it needs inhishop() /
 * inhistemple() and an `ep->guardobjects` engraving field this port does not
 * carry.  It is reached only for a monster with a real m_id; makemon's
 * rndmonst() retry loop — the one live GP_CHECKSCARY caller — passes C's
 * `fakemon` (m_id 0), which takes goodpos_onscary() below instead.  Throw
 * loudly rather than answer wrongly if a caller with a real monster appears. */
function _gp_onscary(x, y, mtmp) {
    /* makemon.js carries the complete monmove.c:241-304 implementation,
     * including musical scaring, Elbereth, altars, and shop/temple guards. */
    return onscary_real(x, y, mtmp);
}

/* C monsym.h/defsym.h monster-class symbols, and monflag.h / mondata.h. */
const _GP_S_ANGEL = 27, _GP_S_VAMPIRE = 48, _GP_S_HUMAN = 53;
const _GP_G_UNIQ = 0x1000, _GP_M1_NOEYES = 0x00001000;
/* C objects.h — the scare monster scroll's otyp. Same literal js/mkobj.js uses. */
const _GP_SCR_SCARE_MONSTER = 326;
/* C mondata.h:174 unique_corpstat(ptr) — (ptr->geno & G_UNIQ) != 0. */
function _gp_unique_corpstat(mdat) { return ((mdat?.geno | 0) & _GP_G_UNIQ) !== 0; }
/* C mondata.h:46 haseyes(ptr) — (ptr->mflags1 & M1_NOEYES) == 0. */
function _gp_haseyes(mdat) { return ((mdat?.mflags1 | 0) & _GP_M1_NOEYES) === 0; }
/* C mondata.h is_rider(ptr) — the three Riders, by form identity. */
function _gp_is_rider(mdat) {
    const pm = mdat?.pmidx | 0;
    return pm === PM_DEATH || pm === PM_PESTILENCE || pm === PM_FAMINE;
}
/* C engrave.c sengr_at(s, x, y, strict) — the engraving at <x,y> when it is not
 * a headstone, is already finished (engr_time <= svm.moves) and its text matches
 * `s` case-insensitively (strict) or contains it (!strict).
 *
 * GAP, stated rather than faked: js/mklev.js make_engr_at() drops C's `epoch`
 * argument, so an engraving record carries no engr_time and the "already
 * finished" gate cannot be evaluated.  Every engraving this port creates is
 * complete on creation, which is the same answer for all of them; a future
 * multi-turn engrave port must add engr_time here. */
function _gp_sengr_at(s, x, y, strict) {
    const ep = engr_at(x, y);
    if (ep && (ep.engr_type | 0) !== HEADSTONE) {
        const txt = String(ep.text ?? '');
        if (strict ? txt.toLowerCase() === String(s).toLowerCase()
                   : txt.toLowerCase().includes(String(s).toLowerCase()))
            return ep;
    }
    return null;
}
/* C ref: teleport.c:51-74 goodpos_onscary(x, y, mptr) — "an approximation of
 * onscary() that doesn't use any 'struct monst' fields aside from monst->data;
 * used primarily for new monster creation".  This is the arm makemon's
 * rndmonst() retry loop reaches. */
function _gp_goodpos_onscary(x, y, mptr) {
    /* onscary() checks Angels and lawful minions; this oversimplifies */
    if ((mptr?.mlet | 0) === _GP_S_HUMAN || (mptr?.mlet | 0) === _GP_S_ANGEL
        || _gp_is_rider(mptr) || _gp_unique_corpstat(mptr))
        return false;
    /* onscary() checks for vampshifted vampire bats/fog clouds/wolves too */
    if (lev_typ(x, y) === ALTAR && (mptr?.mlet | 0) === _GP_S_VAMPIRE)
        return true;
    /* scare monster scroll doesn't have any of the below restrictions,
       being its own source of power */
    if (sobj_at(_GP_SCR_SCARE_MONSTER, x, y))
        return true;
    /* engraved Elbereth doesn't work in Gehennom or the end-game */
    if (Inhell() || In_endgame(game.u?.uz))
        return false;
    /* creatures who don't (or can't) fear a written Elbereth and weren't
       caught by the minions check */
    if ((mptr?.pmidx | 0) === PM_MINOTAUR || !_gp_haseyes(mptr))
        return false;
    return _gp_sengr_at("Elbereth", x, y, true) ? true : false;
}
/* C ref: mkmaze.c:317-331 is_exclusion_zone(type, x, y), reached from goodpos()
 * under GP_AVOID_MONPOS with type == LR_MONGEN.  js/sp_lev.js's des.exclusion
 * pushes onto game.exclusion_zones; this is the same walk js/mklev.js
 * lregion_is_exclusion_zone() and js/sp_lev.js both carry, kept local for the
 * same reason they are (neither copy is exported). */
function _gp_is_exclusion_zone(type, x, y) {
    for (const ez of (game.exclusion_zones || [])) {
        const typeMatches =
            (type === LR_DOWNTELE && (ez.zonetype === LR_DOWNTELE || ez.zonetype === LR_TELE))
            || (type === LR_UPTELE && (ez.zonetype === LR_UPTELE || ez.zonetype === LR_TELE))
            || type === ez.zonetype;
        if (typeMatches && x >= ez.lx && x <= ez.hx && y >= ez.ly && y <= ez.hy)
            return true;
    }
    return false;
}

/* ---------------------------------------------------------------------------
 * goodpos — is (x,y) a good position for mtmp?  (mtmp == NULL: for an object.)
 * C ref: nethack-c/src/teleport.c:85-185
 *   boolean goodpos(coordxy x, coordxy y, struct monst *mtmp, mmflags_nht gpflags)
 * RNG: one rn2(13), and only on the S_EEL branch.
 *
 * NOTE (duplication, deliberate and flagged): js/teleport.js carries a second
 * port of this same C function as the module-private goodpos_full().  It is not
 * exported, and this task's edit scope is js/trap.js alone, so it cannot be
 * imported from here.  The two copies should be collapsed into one exported
 * definition; until then the differences to reconcile are that goodpos_full()
 * (a) tests ACCESSIBLE(levl[x][y].typ) instead of C's ACCESSIBLE(SURFACE_AT(x,y)),
 * (b) omits is_moat()'s DRAWBRIDGE_UP/DB_MOAT case from is_pool(), and
 * (c) calls an undefined goodpos_onscary identifier.
 * ---------------------------------------------------------------------------
 */
export function goodpos(x, y, mtmp, gpflags) {
    let mdat = null;
    const ignorewater = ((gpflags & MM_IGNOREWATER) !== 0),
          ignorelava = ((gpflags & MM_IGNORELAVA) !== 0),
          checkscary = ((gpflags & GP_CHECKSCARY) !== 0),
          allow_u = ((gpflags & GP_ALLOW_U) !== 0),
          avoid_monpos = ((gpflags & GP_AVOID_MONPOS) !== 0);

    if (!isok(x, y))
        return false;

    /* in many cases, we're trying to create a new monster, which
     * can't go on top of the player or any existing monster. */
    if (!allow_u) {
        const u = game.u || {};
        if (u_at(x, y) && !_gp_is_youmonst(mtmp)
            && (!_gp_same_mon(mtmp, u.ustuck) || !u.uswallow)
            && (!u.usteed || !_gp_same_mon(mtmp, u.usteed)))
            return false;
    }

    if (_gp_m_at(x, y) && avoid_monpos)
        return false;

    if (mtmp) {
        const mtmp2 = _gp_m_at(x, y);

        /* Be careful with long worms: a worm can't be placed in its own
         * location, period (C overdoes the check a little bit). */
        if (mtmp2 && (!_gp_same_mon(mtmp2, mtmp) || mtmp.wormno))
            return false;

        mdat = mtmp.data;
        if (_gp_is_pool(x, y) && !ignorewater) {
            /* [what about Breathless?] */
            if (_gp_is_youmonst(mtmp))
                return !!(_gp_Swimming() || _gp_Amphibious()
                          || (!_gp_Is_waterlevel()
                              && !_gp_is_waterwall(x, y)
                              /* water on the Plane of Water has no surface
                                 so there's no way to be on or above that */
                              && (_gp_Levitation() || _gp_Flying()
                                  || _gp_Wwalking())));
            else
                return !!(_gp_is_swimmer(mdat)
                          || (!_gp_Is_waterlevel()
                              && !_gp_is_waterwall(x, y)
                              && _gp_m_in_air(mtmp)));
        } else if ((mdat?.mlet | 0) === _GP_S_EEL && rn2(13) && !ignorewater) {
            return false;
        } else if (is_lava_local(x, y) && !ignorelava) {
            /* 3.6.3: floating eye can levitate over lava but it avoids
               that due the effect of the heat causing it to dry out */
            if ((mdat?.pmidx | 0) === PM_FLOATING_EYE)
                return false;
            else if (_gp_is_youmonst(mtmp)) {
                const uarmf = game.u?.uarmf;
                return !!(_gp_Levitation() || _gp_Flying()
                          || (_gp_Fire_resistance() && _gp_Wwalking()
                              && uarmf && uarmf.oerodeproof)
                          || (_gp_Upolyd() && _gp_likes_lava(game.youmonst?.data)));
            } else
                return !!(_gp_m_in_air(mtmp) || _gp_likes_lava(mdat));
        }
        if (_gp_passes_walls(mdat) && _gp_may_passwall(x, y))
            return true;
        if (_gp_amorphous(mdat) && _gp_closed_door(x, y))
            return true;
        /* avoid onscary() if caller has specified that restriction */
        if (checkscary && (mtmp.m_id ? _gp_onscary(x, y, mtmp)
                                     : _gp_goodpos_onscary(x, y, mdat)))
            return false;
    }
    if (!_gp_accessible(x, y)) {
        if (!(_gp_is_pool(x, y) && ignorewater)
            && !(is_lava_local(x, y) && ignorelava))
            return false;
    }
    /* skip boulder locations for most creatures */
    if (sobj_at(BOULDER, x, y) && (!mdat || !_gp_throws_rocks(mdat)))
        return false;
    /* pretend GP_AVOID_MONPOS == monster creation */
    if (avoid_monpos && _gp_is_exclusion_zone(LR_MONGEN, x, y))
        return false;

    return true;
}
/* Hero property macros used by goodpos()/crawl_destination().  Note which ones
 * consult `blocked` and which do NOT — this file's uprop_active() always tests
 * !blocked, which is right for Levitation/Flying only.
 *   youprop.h:240 Levitation  ((HLevitation || ELevitation) && !BLevitation)
 *   youprop.h:253 Flying      ((HFlying || EFlying
 *                               || (u.usteed && is_flyer(u.usteed->data)))
 *                              && !BFlying)
 *   youprop.h:260 Wwalking    ((HWwalking || EWwalking) && !Is_waterlevel(&u.uz))
 *   youprop.h:266 Swimming    (HSwimming || ESwimming
 *                              || (u.usteed && is_swimmer(u.usteed->data)))
 *   youprop.h:272 Amphibious  (HMagical_breathing || EMagical_breathing
 *                              || amphibious(gy.youmonst.data))
 *   youprop.h:28  Fire_resistance (HFire_resistance || EFire_resistance)
 *   youprop.h:286 Passes_walls    (HPasses_walls || EPasses_walls)
 */
function _gp_uprop_he(propnum) {
    const p = game.u?.uprops?.[propnum];
    if (!p) return false;
    return !!((p.intrinsic | 0) || (p.extrinsic | 0));
}
function _gp_Levitation() { return uprop_active(LEVITATION); }
function _gp_Flying() {
    const usteed = game.u?.usteed;
    const p = game.u?.uprops?.[FLYING];
    const blocked = p ? (p.blocked | 0) : 0;
    return !!((_gp_uprop_he(FLYING) || (usteed && _imm_is_flyer(usteed.data || {})))
              && !blocked);
}
function _gp_Wwalking() {
    return _gp_uprop_he(WWALKING) && !_gp_Is_waterlevel();
}
function _gp_Swimming() {
    const usteed = game.u?.usteed;
    return !!(_gp_uprop_he(SWIMMING)
              || (usteed && _gp_is_swimmer(usteed.data || {})));
}
function _gp_Amphibious() {
    if (_gp_uprop_he(MAGICAL_BREATHING)) return true;
    const pm = game.youmonst?.data;
    return !!pm && ((pm.mflags1 | 0) & _GP_M1_AMPHIBIOUS) !== 0;
}
function _gp_Fire_resistance() { return _gp_uprop_he(FIRE_RES); }
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
    if (IS_DOOR(lev_typ(x, y)) && (!_gp_doorless_door(x, y) || block_door(x, y)))
        return false;
    /* finally, are we trying to squeeze through a too-narrow gap? */
    return !(bad_rock(game.youmonst?.data, u.ux, y)
             && bad_rock(game.youmonst?.data, x, u.uy)
             && cant_squeeze_thru(game.youmonst));
}

/* ---------------------------------------------------------------------------
 * rnd_nextto_goodpos — pick a random goodpos() next to x,y for monster mtmp.
 * C ref: nethack-c/src/trap.c:4923-4952
 * RNG: N_DIRS rn2() calls for the Fisher-Yates shuffle of dirs[], plus
 * whatever goodpos() consumes.
 * ---------------------------------------------------------------------------
 */
export function rnd_nextto_goodpos(x, y, mtmp) {
    const N_DIRS = 8;
    /* C ref: decl.c xdir[]/ydir[] — the N_DIRS compass offsets in C's order. */
    const xdir = [-1, -1, 0, 1, 1, 1, 0, -1];
    const ydir = [0, -1, -1, -1, 0, 1, 1, 1];
    let i, j;
    const is_u = _gp_is_youmonst(mtmp);
    let nx, ny, k;
    const dirs = new Array(N_DIRS);
    const cx = coordptr_get(x), cy = coordptr_get(y);

    for (i = 0; i < N_DIRS; ++i)
        dirs[i] = i;
    for (i = N_DIRS; i > 0; --i) {
        j = rn2(i);
        k = dirs[j];
        dirs[j] = dirs[i - 1];
        dirs[i - 1] = k;
    }
    for (i = 0; i < N_DIRS; ++i) {
        nx = cx + xdir[dirs[i]];
        ny = cy + ydir[dirs[i]];
        /* crawl_destination and goodpos both include an isok() check */
        if (is_u ? crawl_destination(nx, ny) : goodpos(nx, ny, mtmp, 0)) {
            coordptr_set(x, nx);
            coordptr_set(y, ny);
            return true;
        }
    }
    return false;
}

export async function unearth_objs(x, y) {
    const u = game.u || {};
    let otmp, otmp2, bball;
    const cc = { x: 0, y: 0 };

    cc.x = x;
    cc.y = y;
    bball = buried_ball(cc);
    for (otmp = game.level && game.level.buriedobjlist; otmp; otmp = otmp2) {
        otmp2 = otmp.nobj;
        if (otmp.ox === x && otmp.oy === y) {
            if (bball && otmp === bball
                && u.utrap && u.utraptype === TT_BURIEDBALL) {
                await buried_ball_to_punishment();
            } else {
                obj_extract_self(otmp);
                if (otmp.timed)
                    stop_timer(ROT_ORGANIC, obj_to_any(otmp));
                place_object(otmp, x, y);
                await stackobj(otmp);
            }
        }
    }
    del_engr_at(x, y);
    newsym(x, y);
}

/* C dig.c:1935-1955.  The ball is extracted from the buried-object chain,
 * handed to punish() as the reuse flag (which creates a fresh chain and wears
 * the recovered ball), then the trap and engraving are cleared.  punish() is
 * async only for message delivery; its reused-ball branch has no suspension
 * before updating the ball/chain state, so callers that are synchronous in C
 * retain their ordering here. */
export async function buried_ball_to_punishment() {
    const u = game.u || {};
    const cc = { x: u.ux | 0, y: u.uy | 0 };
    const ball = buried_ball(cc);
    if (!ball) return false;

    let prev = null;
    for (let cur = game.level && game.level.buriedobjlist; cur; cur = cur.nobj) {
        if (cur !== ball) {
            prev = cur;
            continue;
        }
        if (prev) prev.nobj = cur.nobj;
        else if (game.level) game.level.buriedobjlist = cur.nobj;
        cur.nobj = null;
        cur.where = OBJ_FREE;
        break;
    }
    await punish(ball);
    await reset_utrap(false);
    del_engr_at(cc.x, cc.y);
    newsym(cc.x, cc.y);
    return true;
}

/* C dig.c:1958-1980.  Used by polymorph/prayer recovery paths; keeping it
 * here also removes the last trap-local assumption that buried balls can only
 * be converted into punishment. */
export async function buried_ball_to_freedom() {
    const u = game.u || {};
    const cc = { x: u.ux | 0, y: u.uy | 0 };
    const ball = buried_ball(cc);
    if (!ball) return false;
    let prev = null;
    for (let cur = game.level && game.level.buriedobjlist; cur; cur = cur.nobj) {
        if (cur !== ball) { prev = cur; continue; }
        if (prev) prev.nobj = cur.nobj;
        else if (game.level) game.level.buriedobjlist = cur.nobj;
        cur.nobj = null;
        cur.where = OBJ_FLOOR;
        break;
    }
    place_object(ball, cc.x, cc.y);
    await stackobj(ball);
    u.utrap = 0;
    u.utraptype = 0;
    del_engr_at(cc.x, cc.y);
    newsym(cc.x, cc.y);
    return true;
}
/* C ref: trap.c:3567-3575 feeltrap() — like seetrap() but overrides vision. */
export function feeltrap(trap) {
    trap.tseen = 1;
    map_trap(trap, 1);
    /* in case it's beneath something, redisplay the something */
    newsym(trap.tx, trap.ty);
}

/* C trap.c:7040-7075 maybe_finish_sokoban() — clear Sokoban restrictions and
 * record completion once every non-hero pit/hole has been removed. */
export function maybe_finish_sokoban() {
    const level = game.level || {};
    const flags = level.flags || (level.flags = {});
    if (!(flags.sokoban_rules ?? game.sokoban) || game.in_mklev)
        return;
    for (let t = game.ftrap || null; t; t = t.ntrap) {
        if (t.madeby_u) continue;
        if (t.ttyp === PIT || t.ttyp === HOLE) return;
    }
    const uz = game.u?.uz || {};
    const dgn = game.dungeons?.[uz.dnum | 0];
    const sokonum = (dgn?.entry_lev | 0) - (uz.dlevel | 0) + 1;
    flags.sokoban_rules = false;
    game.sokoban = false;
    livelog_printf(LL_MINORAC, `completed ${sokonum}${ordin(sokonum)} Sokoban level`);
}
export function sokoban_guilt() {
    if (game.level?.flags?.sokoban_rules ?? game.sokoban) {
        game.u.uconduct.sokocheat++;
        change_luck(-1);
    }
}
/* set_levltyp / recalc_block_point / spot_stop_timers were file-local THROWING
 * stubs here while all three were already fully ported elsewhere — mkmaze.js:60,
 * vision.js:794, timeout.js:166.  Because they were also `export`ed, this file's
 * copies shadowed the real ports for anything that reached them, and maketrap()
 * below calls all three (lines ~1287-1302), so every maketrap that landed on the
 * DRAWBRIDGE_UP / IS_ROOM / STONE|SCORR / IS_WALL|SDOOR arms threw instead of
 * setting terrain.  They are now imported at the top of this file; nothing
 * outside imported the stubs, so removing the exports is safe. */
/* ---------------------------------------------------------------------------
 * maketrap — create a trap of given type at (x, y)
 * C ref: nethack-c/src/trap.c:457
 *   struct trap *maketrap(coordxy x, coordxy y, int typ)
 * ---------------------------------------------------------------------------
 * async ONLY because C's STATUE_TRAP arm (trap.c:509-511) calls
 * mk_trap_statue -> makemon, and js/mklev.js's makemon is declared async.
 * C's maketrap is an ordinary synchronous function; every JS caller must
 * await so the C statement order (and the RNG order inside it) is preserved.
 */
export async function maketrap(x, y, typ) {
    if (typ === TRAPPED_DOOR || typ === TRAPPED_CHEST)
        return null;

    let ttmp, oldplace;
    const lev = lev_flags(x, y);

    ttmp = t_at(x, y);
    if (ttmp) {
        oldplace = true;
        if (undestroyable_trap(ttmp.ttyp))
            return null;
        if (game.u && (game.u.utrap | 0) && u_at(x, y)
            && (((game.u.utraptype | 0) === TT_BEARTRAP_ && typ !== BEAR_TRAP)
                || ((game.u.utraptype | 0) === TT_WEB_ && typ !== WEB)
                || ((game.u.utraptype | 0) === TT_PIT_ && !is_pit(typ))
                || ((game.u.utraptype | 0) === TT_LAVA_ && !is_lava_local(x, y)))) {
            /* C: reset_utrap(FALSE) -> set_utrap(0, 0) */
            const wasTrapped = !!(game.u.utrap | 0);
            game.u.utrap = 0;
            game.u.utraptype = 0; /* TT_NONE */
            if (wasTrapped) {
                if (!game.disp) game.disp = {};
                game.disp.botl = true; /* SET_BOTL() */
            }
        }
        /* old <tx,ty> remain valid */
    } else if (!CAN_OVERWRITE_TERRAIN(lev_typ(x, y))
               || is_pool_or_lava_local(x, y)
               || (IS_FURNITURE(lev_typ(x, y)) && (typ !== PIT && typ !== HOLE))
               || (lev_typ(x, y) === DRAWBRIDGE_UP && typ === MAGIC_PORTAL)
               || (IS_AIR(lev_typ(x, y)) && typ !== MAGIC_PORTAL)
               || (typ === LEVEL_TELEP && single_level_branch(game.u ? game.u.uz : null))) {
        return null;
    } else {
        oldplace = false;
        ttmp = { ntrap: null, tx: x, ty: y };
    }

    /* [re-]initialize all fields except ntrap and <tx,ty> */
    ttmp.vl = {};
    ttmp.launch = { x: -1, y: -1 };
    ttmp.dst = { dnum: -1, dlevel: -1 };
    ttmp.madeby_u = 0;
    ttmp.once = 0;
    ttmp.tseen = unhideable_trap(typ) ? 1 : 0;
    ttmp.ttyp = typ;

    switch (typ) {
        case SQKY_BOARD:
            ttmp.tnote = chooseTrapnote(ttmp);
            break;
        case STATUE_TRAP:
            /* C trap.c:509-511 — mk_trap_statue(x, y). */
            await mk_trap_statue(x, y);
            break;
        case ROLLING_BOULDER_TRAP:
            /* C trap.c:513 mkroll_launch(ttmp, x, y, BOULDER, 1L);
             * BOULDER is otyp 475 (objects.h:1619) — the 0 here was
             * STRANGE_OBJECT. */
            await mkroll_launch(ttmp, x, y, 475 /* BOULDER */, 1);
            break;
        case PIT:
        case SPIKED_PIT:
            ttmp.conjoined = 0;
        /* FALLTHRU */
        case HOLE:
        case TRAPDOOR: {
            if (is_hole(typ))
                hole_destination(ttmp.dst);
            if (in_rooms(x, y, 8 /* SHOPBASE */)[0]
                && (is_hole(typ) || IS_DOOR(lev_typ(x, y)) || IS_WALL(lev_typ(x, y)))) {
                add_damage(x, y,
                    ((IS_DOOR(lev_typ(x, y)) || IS_WALL(lev_typ(x, y)))
                     /* CORRECTED: this read 400, which is SHOP_DOOR_COST.
                      * hack.h:78 — `#define SHOP_HOLE_COST 200L`. */
                     && !(game.context && game.context.mon_moving)) ? SHOP_HOLE_COST : 0);
            }

            let clear_flags = true;
            if (lev_typ(x, y) === DRAWBRIDGE_UP) {
                clear_flags = false;
                const wasIce = lev && ((lev.drawbridgemask | 0) & 28 /* DB_UNDER */) === 8 /* DB_ICE */;
                if (lev) {
                    lev.drawbridgemask = (lev.drawbridgemask | 0) & ~28;
                    lev.drawbridgemask = (lev.drawbridgemask | 0) | 16 /* DB_FLOOR */;
                }
                if (wasIce) {
                    obj_ice_effects(x, y, true);
                    spot_stop_timers(x, y, MELT_ICE_AWAY);
                }
            } else if (IS_ROOM(lev_typ(x, y))) {
                set_levltyp(x, y, ROOM);
            } else if (lev_typ(x, y) === STONE || lev_typ(x, y) === SCORR) {
                set_levltyp(x, y, CORR);
            } else if (IS_WALL(lev_typ(x, y)) || lev_typ(x, y) === SDOOR) {
                set_levltyp(x, y, (game.level?.flags?.is_maze_lev) ? ROOM
                    : (game.level?.flags?.is_cavernous_lev) ? CORR
                        : DOOR);
            }
            if (clear_flags && lev)
                lev.flags = 0;

            await unearth_objs(x, y);
            recalc_block_point(x, y);
            break;
        }
        case TELEP_TRAP: {
            const lpx = game.gl && game.gl.launchplace ? game.gl.launchplace.x : undefined;
            const lpy = game.gl && game.gl.launchplace ? game.gl.launchplace.y : undefined;
            if (isok(lpx, lpy)) {
                const xstart = (game.gx && game.gx.xstart) | 0;
                const ystart = (game.gy && game.gy.ystart) | 0;
                ttmp.teledest = { x: xstart + lpx, y: ystart + lpy };
                if (ttmp.teledest.x === x && ttmp.teledest.y === y) {
                    impossible_('making fixed-dest tele trap pointing to itself');
                }
            }
            break;
        }
    }

    if (!oldplace) {
        if (!game.level) game.level = { traps: [] };
        if (!Array.isArray(game.level.traps)) game.level.traps = [];
        /* C trap.c:578-583 —
         *     if (!oldplace) { ttmp->ntrap = gf.ftrap; gf.ftrap = ttmp; }
         * This port keeps the level's traps TWICE: as game.level.traps (the
         * array t_at() and deltrap() work on) and as C's gf.ftrap chain, which
         * is what every "walk all traps" caller reads — see_traps
         * (js/display.js), the magic-mapping sweep (js/sp_lev.js), the Amulet
         * warmth roll (js/sit.js), expulsion()'s seal arm and goto_level()'s
         * portal-arrival scan (js/cmd.js).  js/mklev.js's own maketrap already
         * maintained BOTH; this one maintained only the array, so every trap it
         * made was invisible to all of them.  mkportal() goes through THIS
         * maketrap, so the quest branch's MAGIC_PORTAL was absent from ftrap and
         * goto_level's portal arrival could not find it — seed0361's expulsion
         * landed on the up-staircase instead of the portal square (leaf 7809,
         * the place_lregion rn2(79) C never draws). */
        ttmp.ntrap = game.ftrap ?? null;
        game.ftrap = ttmp;
        game.level.traps.push(ttmp);
    } else {
        /* C: oldplace; it shouldn't be possible to override a sokoban pit
         * or hole with some other trap, but check just to be safe. */
        if (game.level?.flags?.sokoban_rules ?? game.sokoban)
            maybe_finish_sokoban();
    }
    return ttmp;
}
// C trap.c:418 dng_bottom. Shared by hole generation and destination clamping.
export function dng_bottom(lev) {
    const dungeon = game.dungeons[lev.dnum];
    let bottom = dungeon.num_dunlevs;
    if (In_quest(lev)) {
        const qlocate_depth = game.qlocate_level.dlevel;
        if (dungeon.dunlev_ureached < qlocate_depth)
            bottom = qlocate_depth;
    } else if (dungeon.flags?.hellish) {
        if (!game.u?.uevent?.invoked)
            bottom -= 1;
    }
    return bottom;
}
// C ref: trap.c:594 clamp_hole_destination(d_level *dlev) — limit the
// destination of a hole or trapdoor to the furthest level you should be
// able to fall to.
export function clamp_hole_destination(dlev) {
    const bottom = dng_bottom(dlev);
    dlev.dlevel = Math.min(dlev.dlevel, bottom);
    return dlev;
}
/* C ref: trap.c:441-454 hole_destination.  This file used to carry a local
 * re-implementation whose comment said the class was one "this replay oracle
 * cannot verify" — and it was WRONG in the way an unverifiable body gets to
 * be wrong: it assigned dst->dnum/dst->dlevel and then simply stopped, with
 * no
 *
 *     while (dst->dlevel < bottom) { dst->dlevel++; if (rn2(4)) break; }
 *
 * So a trapdoor's destination was the level the hero is standing on, and —
 * the part that shows up in the stream — the rn2(4) per descended level was
 * never drawn.  js/mklev.js has carried the faithful body all along; it just
 * was not exported.  Measured on gen362-reseed-seed208714: ensure_way_out's
 * `maketrap(x, y, rn2(2) ? HOLE : TRAPDOOR)` on a mine-town "inaccessibles"
 * level is a live call site, and the missing rn2(4) desynchronised the stream
 * from level-generation onward.  One body, as C has. */
/* C ref: nethack-c/src/pline.c:587-637 impossible(const char *s, ...) — it
 * paniclog()s the formatted message and pline()s it, then RETURNS; it never
 * aborts.  Callers (immune_to_trap's two error arms, install_trap's
 * self-pointing teleport trap) fall through to their own fallback.  The
 * message/paniclog side is not modeled here — trap.js has no message-subsystem
 * dependency otherwise — matching the established no-op convention in
 * js/display.js, js/mcastu.js, js/shk.js. */
export function impossible_(_msg, ..._args) { }
/* ---------------------------------------------------------------------------
 * dotrap — trigger a trap for the hero
 * C ref: nethack-c/src/trap.c:2995
 *   void dotrap(struct trap *trap, unsigned trflags)
 *
 * Main dispatch for all trap effects when the hero steps on a trap.
 * Calls trapeffect_selector which fans out to one of ~20 trapeffect_*
 * functions (arrow_trap, dart_trap, rocktrap, sqky_board, bear_trap,
 * slp_gas_trap, rust_trap, fire_trap, pit, hole, telep_trap, level_telep,
 * web, statue_trap, magic_trap, anti_magic, poly_trap, landmine,
 * rolling_boulder_trap, magic_portal, vibrating_square).
 * RNG: each trapeffect_* function contains multiple rn2/rnd/d calls.
 * TODO: port trapeffect_selector dispatch + individual effect functions.
 * ---------------------------------------------------------------------------
 */
export async function dotrap(trap, trflags) {
    const u = game.u;
    const ttype = trap.ttyp | 0;
    const already_seen = !!trap.tseen;
    /* C trap.c:2999-3000 —
     *     forcetrap = ((trflags & FORCETRAP) != 0 || (trflags & FAILEDUNTRAP) != 0)
     * The FAILEDUNTRAP half was missing; it is the flag #untrap sets when a
     * disarm attempt sets the trap off instead. */
    let forcetrap = ((trflags & FORCETRAP) !== 0
                     || (trflags & _FAILEDUNTRAP_BT) !== 0);
    const forcebungle = (trflags & FORCEBUNGLE) !== 0;
    /* C trap.c:3002-3005.  These were hard-coded FALSE with the comment "pit
     * traps not yet ported"; the hero pit arm is ported now, and all three feed
     * both the escape check below AND trapeffect_pit's damage arguments, so a
     * fabricated constant here is a wrong answer the moment a session walks
     * between two pits.  Note conjoined_pits/adj_nonconjoined_pit both require
     * the hero to ALREADY be in a pit, so on a first fall both are still false —
     * measured, not assumed: they are false on all four members of this row. */
    const plunged = (trflags & _TOOKPLUNGE_T) !== 0;
    const conj_pit = conjoined_pits(trap, t_at(u.ux0 | 0, u.uy0 | 0), true);
    const adj_pit = adj_nonconjoined_pit(trap);
    /* C trap.c:3006: nomul(0) */
    nomul(0);
    /* C trap.c:3008-3011: fixed_tele_trap → FORCETRAP.  A telep trap with a
     * fixed destination; the corpus trap has none, so this is false. */
    /* fixed_tele_trap(trap) is false (no teledest) */
    /* C trap.c:3014-3022 — the Sokoban pit/hole arm, and it is an `if / else if`
     * with the block below, not an independent statement: on a Sokoban pit C
     * SKIPS the already-seen escape check entirely, so its rn2(5) is never
     * drawn there.  This port ran the escape check unconditionally, which is an
     * RNG difference and not merely a missing message.  Unreached by the corpus
     * (no recorded hero steps on a Sokoban pit), written out because the branch
     * structure is what matters. */
    if (In_sokoban(u?.uz) && (is_pit(ttype) || is_hole(ttype))) {
        /* The "air currents" message is still appropriate -- even when
         * the hero isn't flying or levitating -- because it conveys the
         * reason why the player cannot escape the trap with a dexterity
         * check, clinging to the ceiling, etc. */
        await pline(`Air currents pull you down into ${_a_your(trap.madeby_u)} `
                    + `${_tr_trapname(ttype)}!`); /* do force "pit" while hallucinating */
        /* then proceed to normal trap effect */
    } else if (!forcetrap) {
        /* C trap.c:3025: floor_trigger(ttype) && check_in_air(youmonst) → the
         * hero would just step over a floor trap while levitating/flying.
         * MAGIC/TELEP traps are not floor_trigger, so this is skipped. */
        if (floor_trigger(ttype) && check_in_air(true, trflags)) {
            return;
        }
        /* C trap.c:3034-3043: already-seen escape check.  rn2(5) only fires
         * when the hero has already seen the trap and the other guards pass. */
        /* C trap.c:3042 is
         *     (!rn2(5) || (is_pit(ttype) && is_clinger(gy.youmonst.data)))
         * and the `||` short-circuits AFTER rn2(5), so adding the second
         * disjunct cannot move a leaf — it only lets a ceiling-clinger escape a
         * pit it has already seen, which this port could not do. */
        if (already_seen && !is_fumbling_u() && !undestroyable_trap(ttype)
            && ttype !== ANTI_MAGIC_T && !forcebungle && !plunged
            && !conj_pit && !adj_pit
            && (!rn2(5)
                || (is_pit(ttype)
                    && (() => { const pm = _lo_hero_monst().data;
                                return !!pm && _imm_is_clinger(pm); })()))) {
            /* You("escape ...") — no further RNG; turn ends. */
            return;
        }
    }
    /* C trap.c:3047-3049 —
     *     if (u.usteed) mon_learns_traps(u.usteed, ttype);
     *     mons_see_trap(trap);
     * The comment stood here NAMING both calls with neither call written.
     * RNG-free itself, but mons_see_trap sets mtrapseen on every monster that
     * watches the trap fire, and mtrapseen decides whether mfndpos() drops that
     * square from the candidate list (mon.c:2365) — which changes the ARGUMENT
     * of m_move's rn2(4 * (cnt - j)).  See the note at the mintrap call site. */
    if (game.u?.usteed)
        mon_learns_traps(game.u.usteed, ttype);
    mons_see_trap(trap);
    /* C trap.c:3058: trapeffect_selector(&youmonst, trap, trflags) — the hero
     * path keys off the isYou flag, so the mtmp argument is unused (null). */
    await trapeffect_selector(null, trap, trflags, true);
    void u;
}
/* C ref: youprop.h — Levitation/Flying = ((Hprop || Eprop) && !Bprop). */
function uprop_active(propnum) {
    const u = game.u;
    const p = (u && u.uprops) ? u.uprops[propnum] : null;
    if (!p) return false;
    return !!(((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0));
}
/* C ref: trap.c:1046 reset_utrap(msg). */
export async function reset_utrap(msg) {
    const was_Lev = uprop_active(LEVITATION);
    const was_Fly = uprop_active(FLYING);

    /* C: set_utrap(0, 0) -> ... -> float_vs_flight() -> SET_BOTL()
     * unconditionally at the end of float_vs_flight (polyself.c:150).
     * js/dig.js's set_utrap doesn't carry float_vs_flight, so its
     * unconditional botl write is inlined here — same pattern as the
     * reset_utrap(FALSE) inline in maketrap() above. */
    set_utrap(0, 0);
    if (!game.disp) game.disp = {};
    game.disp.botl = true;

    if (msg) {
        if (!was_Lev && uprop_active(LEVITATION))
            await float_up();
        if (!was_Fly && uprop_active(FLYING))
            await You("can fly.");
    }
}
/* C ref: trap.c:1063 floor_trigger — trap types that only trigger when the
 * victim is on the floor (skipped while levitating/flying). */
function floor_trigger(ttyp) {
    switch (ttyp) {
        case 1:
        case 2:
        case 3: /* ARROW_TRAP, DART_TRAP, ROCKTRAP */
        case 4:
        case 5: /* SQKY_BOARD, BEAR_TRAP */
        case 6:
        case 7: /* LANDMINE, ROLLING_BOULDER_TRAP */
        case 8:
        case 9: /* SLP_GAS_TRAP, RUST_TRAP */
        case 10: /* FIRE_TRAP */
        case 11:
        case 12: /* PIT, SPIKED_PIT */
        case 13:
        case 14: /* HOLE, TRAPDOOR */
            return true;
        default:
            return false;
    }
}
const ANTI_MAGIC_T = 21; /* C trap.h ANTI_MAGIC */
const M1_FLY_T = 0x00000001; /* C monflag.h:85 */
/* NOTE: there is deliberately no `M1_FLOAT` here.  C has no such bit; see
 * mondata.h:20 is_floater(), which is a monster-CLASS test (S_EYE/S_LIGHT).
 * A fabricated M1_FLOAT_T = 0x2 used to live here — 0x2 is really M1_SWIM. */
const _TOOKPLUNGE_T = 0x10; /* C hack.h:1315 */
const _HURTLING_T = 0x80;   /* C hack.h:1318 */
/* check_in_air — C trap.c:1086-1096
 *   boolean is_you = mtmp == &gy.youmonst,
 *           plunged = (trflags & (TOOKPLUNGE | VIASITTING)) != 0;
 *   return ((trflags & HURTLING) != 0
 *           || (is_you ? Levitation : is_floater(mtmp->data))
 *           || ((is_you ? Flying : is_flyer(mtmp->data)) && !plunged));
 * This module has no youmonst struct, so the hero is passed as the sentinel
 * `true`; any other argument is a `struct monst *`. */
function check_in_air(mtmp, trflags) {
    const tf = trflags | 0;
    const plunged = (tf & (_TOOKPLUNGE_T | _VIASITTING_BT)) !== 0;
    if ((tf & _HURTLING_T) !== 0)
        return true;
    if (mtmp === true) {
        /* `u.uprops.LEVITATION` / `.FLYING` used to be read here BY NAME.
         * u.uprops is keyed by PROP NUMBER (js/attrib.js's _uprop convention,
         * and uprop_active just above reads it that way), so both lookups were
         * permanently `undefined` and the hero's half of this predicate was a
         * constant FALSE — a levitating hero triggered every floor trap.  It
         * did not surface before because the only ported floor-trap hero arms
         * carried their own Levitation guard; PIT's does too (trap.c:1850), but
         * C's gate is HERE and the two are not the same gate: C's returns from
         * dotrap before feeltrap and before mons_see_trap. */
        return uprop_active(LEVITATION) || (uprop_active(FLYING) && !plunged);
    }
    const pm = mtmp?.data;
    if (!pm) return false;
    return _imm_is_floater(pm) || (_imm_is_flyer(pm) && !plunged);
}
/* C ref: youprop.h Fumbling = (HFumbling || EFumbling), i.e.
 * u.uprops[FUMBLING].intrinsic || u.uprops[FUMBLING].extrinsic — NOT gated by
 * .blocked (unlike uprop_active's Levitation/Flying reads above, which are
 * `&& !blocked`; C's Fumbling macro has no such term).  This read
 * `u.uprops.FUMBLING` — a property named "FUMBLING" — but u.uprops is indexed
 * by NUMBER (uprop_active's own convention two functions up), so the lookup
 * was permanently undefined and the hero was never fumbling: measured on
 * record #28 (probe-trapset-b__gen004-objective-seed889459), where the hero's
 * real HFumbling=67108865 should have short-circuited dotrap's escape check
 * before rn2(5) and this port drew it anyway. */
function is_fumbling_u() {
    const u = game.u;
    const p = (u && u.uprops) ? u.uprops[FUMBLING] : null;
    if (!p) return false;
    return !!((p.intrinsic | 0) || (p.extrinsic | 0));
}
/* C trap.c:5341-5372 — turn a set trap into an ordinary object. */
export async function cnv_trap_obj(otyp, cnt, trap, buryIt) {
    const obj = await mksobj_ice(otyp, true, false);
    obj.quan = cnt;
    obj.owt = weight(obj);
    if (otyp !== OTYP_DART) obj.opoisoned = 0;
    place_object(obj, trap.tx, trap.ty);
    if (buryIt) {
        await bury_an_obj(obj, null);
    } else {
        if (trap.madeby_u) await sellobj(obj, trap.tx, trap.ty);
        await stackobj(obj);
    }
    newsym(trap.tx, trap.ty);
    if (game.u.utrap && u_at(trap.tx, trap.ty)) await reset_utrap(true);
    const mon = m_at(trap.tx, trap.ty);
    if (mon?.mtrapped) mon.mtrapped = 0;
    deltrap(trap);
}

/* C trap.c:7175-7195 — ice supports ordinary traps, but portals survive. */
export async function trap_ice_effects(x, y, melting) {
    const trap = t_at(x, y);
    if (!trap || !melting) return;
    const mon = m_at(x, y);
    if (mon?.mtrapped) mon.mtrapped = 0;
    if (trap.ttyp === LANDMINE || trap.ttyp === BEAR_TRAP) {
        await cnv_trap_obj(trap.ttyp === LANDMINE ? 243 : 244, 1, trap, true);
    } else if (!undestroyable_trap(trap.ttyp)) {
        deltrap(trap);
    }
}

/* C ref: trap.h undestroyable_trap — traps that can't be escaped/removed.
 * Only MAGIC_PORTAL and VIBRATING_SQUARE; neither in the escape path here. */
function undestroyable_trap(ttyp) {
    return ttyp === 17 /* MAGIC_PORTAL */ || ttyp === 23 /* VIBRATING_SQUARE */;
}
/* C ref: mondata.c:1617 mon_knows_traps — has mtmp seen this trap type? */
export function mon_knows_traps(mtmp, ttyp) {
    return ((mtmp.mtrapseen | 0) & (1 << (ttyp - 1))) !== 0;
}
/* C ref: mondata.c:1628 mon_learns_traps */
export function mon_learns_traps(mtmp, ttyp) {
    if (ttyp === ALL_TRAPS)
        mtmp.mtrapseen = ~0;
    else if (ttyp === NO_TRAP)
        mtmp.mtrapseen = 0;
    else
        mtmp.mtrapseen = (mtmp.mtrapseen | 0) | (1 << (ttyp - 1));
}
/* C ref: mthrowu.c:1403 m_carrying — check if a monster is carrying an item of a particular type */
export function m_carrying(mtmp, type) {
    /* Determine the inventory chain: player (youmonst, m_id==0) uses g.invent,
     * monsters use mtmp->minvent. */
    const inv = ((mtmp.m_id | 0) === 0) ? game.invent : mtmp.minvent;
    /* Walk the object chain looking for a matching type. */
    for (let otmp = inv; otmp; otmp = otmp.nobj) {
        if ((otmp.otyp | 0) === (type | 0)) {
            return otmp;
        }
    }
    /* No matching object found. */
    return null;
}
/* C skills.h:43-45 — the launcher skills, contiguous and ORDERED:
 *   P_BOW = 20, P_SLING = 21, P_CROSSBOW = 22.
 * C's launcher/ammo macros are RANGE tests over oc_skill, and ammo carries the
 * NEGATED skill of the launcher that fires it (matching_launcher). Both
 * predicates below were hand-enumerated otyp lists that dropped the middle of
 * that range — the SLING (otyp 87, oc_skill 21) was in neither, and
 * ammo_and_launcher had no sling arm and no GEM_CLASS arm at all, so a monster
 * slinging rocks read as unarmed.
 *
 * Measured (seed4500-knight-coverage, tools/monster-position-diff.mjs, first
 * divergence turn 131): m_id=1332 wields otyp 87 and carries 6 of otyp 474
 * (oc_skill -21, GEM_CLASS — sling ammo). C's m_has_launcher_and_ammo is TRUE,
 * so m_balks_at_approaching (monmove.c:1199) returns -1 and the monster BACKS
 * OFF: (35,2) -> (34,2) with the hero at (38,2). With the hardcoded list it read
 * FALSE, appr stayed 1, and it CLOSED to (36,2) instead. The whole divergence is
 * RNG-free at the point it happens — m_move's selection loop draws nothing when
 * appr != 0 — which is why the per-C-site draw census called this clean.
 */
const _LAUNCH_WEAPON_CLASS = 2; /* C objclass.h WEAPON_CLASS */
const _LAUNCH_GEM_CLASS = 13;   /* C objclass.h GEM_CLASS   */
const _P_BOW = 20, _P_CROSSBOW = 22; /* C skills.h:43,45 */

/* C obj.h:235 is_launcher(otmp):
 *   oclass == WEAPON_CLASS && oc_skill >= P_BOW && oc_skill <= P_CROSSBOW */
function is_launcher(otmp) {
    if (!otmp) return false;
    const sk = MKOBJ_OC_SKILL[otmp.otyp | 0] | 0;
    return (otmp.oclass | 0) === _LAUNCH_WEAPON_CLASS && sk >= _P_BOW && sk <= _P_CROSSBOW;
}
/* C obj.h:238 is_ammo(otmp):
 *   (oclass == WEAPON_CLASS || oclass == GEM_CLASS)
 *   && oc_skill >= -P_CROSSBOW && oc_skill <= -P_BOW
 * The GEM_CLASS arm is what carries sling ammo (rocks, flint, gems). */
function is_ammo(otmp) {
    if (!otmp) return false;
    const oc = otmp.oclass | 0;
    const sk = MKOBJ_OC_SKILL[otmp.otyp | 0] | 0;
    return (oc === _LAUNCH_WEAPON_CLASS || oc === _LAUNCH_GEM_CLASS)
        && sk >= -_P_CROSSBOW && sk <= -_P_BOW;
}
/* C obj.h:242 matching_launcher(a, l): l && oc_skill[a] == -oc_skill[l]
 * C obj.h:244 ammo_and_launcher(a, l): is_ammo(a) && matching_launcher(a, l) */
function ammo_and_launcher(ammo, launcher) {
    if (!ammo || !launcher) return false;
    return is_ammo(ammo)
        && (MKOBJ_OC_SKILL[ammo.otyp | 0] | 0) === -(MKOBJ_OC_SKILL[launcher.otyp | 0] | 0);
}
/* C ref: mthrowu.c:58-71 m_has_launcher_and_ammo — check if monster has launcher and matching ammo */
export function m_has_launcher_and_ammo(mtmp) {
    if (!mtmp) return false;
    /* Get monster's wielded weapon by walking minvent for W_WEP */
    let mwep = null;
    for (let o = mtmp.minvent; o; o = o.nobj) {
        if (((o.owornmask | 0) & W_WEP) !== 0) {
            mwep = o;
            break;
        }
    }
    /* If wielded and it's a launcher, check inventory for matching ammo */
    if (mwep && is_launcher(mwep)) {
        for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
            if (ammo_and_launcher(otmp, mwep))
                return true;
        }
    }
    return false;
}
/* ── C mondata.h / obj.h predicates shared by m_dowear (C worn.c:748) and
 *    mon_break_armor (C worn.c:1168).  ONE module-scope definition on purpose:
 *    these used to be declared separately inside EACH of those two functions
 *    with divergent bodies (js-binding-audit `sibling-diff`), which is exactly
 *    how a flag fix gets applied to one twin and not the other.  Values mirror
 *    the already-audited copies in js/polyself.js:723-738.
 * ------------------------------------------------------------------------- */
const _WORN_M1_NOHANDS = 0x00002000;  /* C monflag.h:98  */
const _WORN_M1_SLITHY = 0x00080000;   /* C monflag.h:104 */
const _WORN_M1_HUMANOID = 0x00020000; /* C monflag.h:102 */
const _WORN_MZ_SMALL = 1;             /* C monflag.h:178 */
const _WORN_MZ_HUGE = 4;              /* C monflag.h:182 */
const _WORN_S_GHOST = 54;             /* C defsym.h:358  */
const _WORN_S_CENTAUR_W = 29;         /* C defsym.h:328  */
const _WORN_PM_WINGED_GARGOYLE = 42;  /* js/pm.generated.js */
const _WORN_PM_MARILITH = 294;        /* js/pm.generated.js */
/* C mondata.h:11 verysmall(ptr) = ((ptr)->msize < MZ_SMALL) */
function verysmall(data) { return (data.msize | 0) < _WORN_MZ_SMALL; }
/* C mondata.h:52 nohands(ptr) = (((ptr)->mflags1 & M1_NOHANDS) != 0L) */
function nohands(data) { return ((data.mflags1 | 0) & _WORN_M1_NOHANDS) !== 0; }
/* C mondata.h:67 slithy(ptr) = (((ptr)->mflags1 & M1_SLITHY) != 0L) */
function slithy(data) { return ((data.mflags1 | 0) & _WORN_M1_SLITHY) !== 0; }
/* C mondata.h:65 humanoid(ptr) = (((ptr)->mflags1 & M1_HUMANOID) != 0L) */
function _worn_humanoid(data) { return ((data.mflags1 | 0) & _WORN_M1_HUMANOID) !== 0; }
/* C mondata.h:31 noncorporeal(ptr) = ((ptr)->mlet == S_GHOST) */
function _worn_noncorporeal(data) { return (data.mlet | 0) === _WORN_S_GHOST; }
/* C obj.h:444-447 WrappingAllowed(mptr) — the FULL macro.  Both former copies
   tested only the msize range and dropped humanoid / noncorporeal / centaur /
   winged gargoyle / marilith. */
function WrappingAllowed(data) {
    return _worn_humanoid(data)
        && (data.msize | 0) >= _WORN_MZ_SMALL && (data.msize | 0) <= _WORN_MZ_HUGE
        && !_worn_noncorporeal(data) && (data.mlet | 0) !== _WORN_S_CENTAUR_W
        && (data.pmidx | 0) !== _WORN_PM_WINGED_GARGOYLE
        && (data.pmidx | 0) !== _WORN_PM_MARILITH;
}
/* C mondata.h:12 bigmonst(ptr) = msize >= MZ_LARGE. */
const _WORN_MZ_LARGE = 3;              /* C monflag.h:181 */
const _WORN_S_VORTEX = 22;             /* C defsym.h — js/makemon.js:211 */
function _worn_bigmonst(data) { return (data.msize | 0) >= _WORN_MZ_LARGE; }
/* C mondata.h:57 is_whirly(ptr) = mlet == S_VORTEX || ptr == &mons[PM_AIR_ELEMENTAL] */
function _worn_is_whirly(data) {
    return (data.mlet | 0) === _WORN_S_VORTEX || (data.pmidx | 0) === PM_AIR_ELEMENTAL;
}
/* C mondata.c:632 sliparm(ptr) — creature slides out of armor. */
function _worn_sliparm(data) {
    return _worn_is_whirly(data) || (data.msize | 0) <= _WORN_MZ_SMALL
        || _worn_noncorporeal(data);
}
/* C mondata.c:640 breakarm(ptr) — creature breaks out of armor. */
function _worn_breakarm(data) {
    if (_worn_sliparm(data))
        return false;
    return _worn_bigmonst(data)
        || ((data.msize | 0) > _WORN_MZ_SMALL && !_worn_humanoid(data))
        || (data.pmidx | 0) === _WORN_PM_MARILITH
        || (data.pmidx | 0) === _WORN_PM_WINGED_GARGOYLE;
}
/* C mondata.h:133 cantweararm(ptr) = (breakarm(ptr) || sliparm(ptr)).
 *
 * m_dowear used to carry a file-LOCAL `cantweararm(data) { return
 * !humanoid(data); }`, which is a different predicate entirely: it says a
 * mountain centaur (M1_HUMANOID, MZ_LARGE) CAN wear a suit, where C's
 * bigmonst arm of breakarm() says it cannot.  MEASURED on seed0361 leaf 7934
 * against a probed C recorder: with the wrong predicate the centaur #214 at
 * <72,4> put on a suit inside the movemon I_SPECIAL block, was frozen for 5
 * turns and lost its whole move (C: `oldworn=0 now=0 skip=0`), which moved the
 * session's prefixMatch 23361 -> 7934 and cost 93 step points. */
function _worn_cantweararm(data) {
    return _worn_breakarm(data) || _worn_sliparm(data);
}

/* C ref: worn.c:748 m_dowear — equip a monster with appropriate worn items. */
export async function m_dowear(mon, creation) {
    /* local helpers mirroring C mondata.h macros that aren't yet ported.
       verysmall/nohands/slithy/WrappingAllowed live at module scope above —
       shared verbatim with mon_break_armor. */
    const S_MUMMY = 39;
    const PM_SKELETON = 248;
    const RACE_EXCEPTION = true;

    function is_animal(data) { return (data.mflags1 & 0x00040000 /* M1_ANIMAL */) !== 0; }
    function mindless(data) { return (data.mflags1 & 0x00010000 /* M1_MINDLESS */) !== 0; }
    function MON_WEP(m) {
        /* walk minvent for W_WEP — mon.mw is not captured */
        for (let o = m.minvent; o; o = o.nobj) {
            if (((o.owornmask | 0) & W_WEP) !== 0)
                return o;
        }
        return null;
    }
    /* C obj.h:257 bimanual(otmp) — this used to be a `return false` stub,
     * shadowing the real port this file ALREADY imports from js/do_wear.js
     * (line 72, backed by the compiled oc_bimanual otyp set).  A monster
     * wielding a two-handed weapon would have been offered a shield. */

    if (verysmall(mon.data) || nohands(mon.data) || is_animal(mon.data))
        return;
    /* give mummies a chance to wear their wrappings
     * and let skeletons wear their initial armor */
    if (mindless(mon.data)
        && (!creation || (mon.data.mlet !== S_MUMMY
                          && mon.data.pmidx !== PM_SKELETON)))
        return;

    await m_dowear_type(mon, W_AMUL, creation, false);
    let can_wear_armor = !_worn_cantweararm(mon.data); /* for suit, cloak, shirt */
    /* can't put on shirt if already wearing suit */
    if (can_wear_armor && !(mon.misc_worn_check & W_ARM))
        await m_dowear_type(mon, W_ARMU, creation, false);
    /* WrappingAllowed() makes any size between small and huge eligible;
       treating small as a special case allows hobbits, gnomes, and
       kobolds to wear all cloaks; large and huge allows giants and such
       to wear mummy wrappings but not other cloaks */
    if (can_wear_armor || WrappingAllowed(mon.data))
        await m_dowear_type(mon, W_ARMC, creation, false);
    await m_dowear_type(mon, W_ARMH, creation, false);
    if (!MON_WEP(mon) || !bimanual(MON_WEP(mon)))
        await m_dowear_type(mon, W_ARMS, creation, false);
    await m_dowear_type(mon, W_ARMG, creation, false);
    if (!slithy(mon.data) && mon.data.mlet !== 29 /* S_CENTAUR */)
        await m_dowear_type(mon, W_ARMF, creation, false);
    if (can_wear_armor)
        await m_dowear_type(mon, W_ARM, creation, false);
    else
        await m_dowear_type(mon, W_ARM, creation, RACE_EXCEPTION);
}

/* ── m_dowear_type (C worn.c:798-1002) ────────────────────────────────────────
 * The whole body was a `no-op stub`, so m_dowear() above walked its seven
 * slots and wore nothing.  That is not merely a missing "%s puts on %s."
 * message: it is why the movemon I_SPECIAL re-equip block (C mon.c:1269-1284)
 * could not be ported at all — that block skips a monster's ENTIRE turn when
 * m_dowear actually changes misc_worn_check or clears mcanmove, and a stub
 * m_dowear never changes either.
 *
 * MEASURED against C on the whole 44-session public corpus (a locally built
 * recorder with a probe at worn.c:970): m_dowear wears something 84 times, and
 * exactly TWO of those are `creation == FALSE` — seed0383's monster #144
 * (mnum 165, levitation boots, W_ARMF, m_delay 2) and seed0399's #197 (mnum 46,
 * banded mail, W_ARM under a worn cloak, m_delay 7).  Both are in the two
 * hallucinate sessions and both make their monster spend the turn equipping.
 *
 * RNG: m_dowear_type consumes NO core PRNG.  Its only draw-shaped call is
 * hcolor() on the autocurse arm, which is the DISPLAY rng (rn2_on_display_rng),
 * not the scored stream; autocurse fires 0 times in the corpus.
 */
/* objclass.h — the two oclasses m_dowear_type filters on. */
const _MDW_ARMOR_CLASS = 3, _MDW_AMULET_CLASS = 5;
/* objects.h oc_armcat ordinals (js/armor_data.js `armcat`). */
const _MDW_ARM_SUIT = 0, _MDW_ARM_SHIELD = 1, _MDW_ARM_HELM = 2,
      _MDW_ARM_GLOVES = 3, _MDW_ARM_BOOTS = 4, _MDW_ARM_CLOAK = 5,
      _MDW_ARM_SHIRT = 6;
/* objects.h otyps read by the guards below (index into js/oc_name_data.js
 * OC_NAME, cross-checked against js/armor_data.js). */
const _MDW_AMULET_OF_LIFE_SAVING = 202, _MDW_AMULET_OF_REFLECTION = 208,
      _MDW_AMULET_OF_GUARDING = 210, _MDW_MUMMY_WRAPPING = 138,
      _MDW_HELM_OF_OPPOSITE_ALIGNMENT = 99, _MDW_DUNCE_CAP = 94,
      _MDW_SPEED_BOOTS = 166, _MDW_RUBBER_HOSE = 78;
/* monflag.h:180 MZ_HUMAN, monst.h:206 MFAST, js/pm.generated.js PM_HOBBIT. */
const _MDW_MZ_HUMAN = 2, _MDW_MFAST = 2, _MDW_PM_HOBBIT = 43;
/* C decl.h:17 NH_BLACK = c_color_names.c_black = "black". */
const NH_BLACK_MDW = 'black';
/* obj.h:299-303 is_elven_armor(otmp) — elven leather helm / mithril-coat /
 * cloak / shield / boots.  Same set js/do_wear.js:1806 carries. */
const _MDW_ELVEN_ARMOR_OTYPS = new Set([89, 127, 139, 153, 169]);
/* obj.h:418-420 is_flimsy(otmp) — oc_material <= LEATHER(7) || RUBBER_HOSE. */
const _MDW_LEATHER_MAT = 7;

function _mdw_armcat_is(otmp, cat) {
    if (!otmp || (otmp.oclass | 0) !== _MDW_ARMOR_CLASS) return false;
    const row = ARMOR_DATA[otmp.otyp | 0];
    return !!row && (row.armcat | 0) === cat;
}
function _mdw_is_suit(o) { return _mdw_armcat_is(o, _MDW_ARM_SUIT); }
function _mdw_is_shield(o) { return _mdw_armcat_is(o, _MDW_ARM_SHIELD); }
function _mdw_is_helmet(o) { return _mdw_armcat_is(o, _MDW_ARM_HELM); }
function _mdw_is_gloves(o) { return _mdw_armcat_is(o, _MDW_ARM_GLOVES); }
function _mdw_is_boots(o) { return _mdw_armcat_is(o, _MDW_ARM_BOOTS); }
function _mdw_is_cloak(o) { return _mdw_armcat_is(o, _MDW_ARM_CLOAK); }
function _mdw_is_shirt(o) { return _mdw_armcat_is(o, _MDW_ARM_SHIRT); }
function _mdw_is_flimsy(o) {
    if (!o) return false;
    return ((MKOBJ_OC_MATERIAL[o.otyp | 0] | 0) <= _MDW_LEATHER_MAT)
        || (o.otyp | 0) === _MDW_RUBBER_HOSE;
}
/* C mondata.h:57 has_horns(ptr) = (num_horns(ptr) > 0). */
function _mdw_has_horns(data) { return num_horns((data?.pmidx | 0)) > 0; }
/* C objclass.h:99,102 + hack.h:1531 ARM_BONUS(obj):
 *   objects[otyp].a_ac + obj->spe - min(greatest_erosion(obj),
 *                                       objects[otyp].a_ac)
 * a_ac is indexed BY OTYP out of the objects[] table, never read off the
 * object (js/do_wear.js armBonus makes the same point).  A non-armor object
 * has no a_ac row, and C would read the union's oc_oc1 as 0 there. */
function _mdw_arm_bonus(obj) {
    const row = ARMOR_DATA[obj.otyp | 0];
    const a_ac = row ? (row.a_ac | 0) : 0;
    const er1 = (obj.oeroded | 0), er2 = (obj.oeroded2 | 0);
    const erosion = er1 > er2 ? er1 : er2;
    return a_ac + (obj.spe | 0) - (erosion < a_ac ? erosion : a_ac);
}
/* C worn.c oc_delay: objects[otyp].oc_delay.  ARMOR() passes `delay` into the
 * OBJECT() dly slot (objects.h:422-427) and AMULET() passes a literal 0
 * (objects.h:831-834), so the generated armor table is the whole answer for
 * the two classes m_dowear_type can reach. */
function _mdw_oc_delay(otyp) {
    const row = ARMOR_DATA[otyp | 0];
    return row ? (row.delay | 0) : 0;
}
/* C worn.c:1112-1124 racial_exception(mon, obj) — hobbits may wear elven
 * armor; no "unacceptable" exceptions exist in 5.0.  raceptr(mon) is
 * mondata.h:20: mon->data unless the monster is a player-monster/mplayer,
 * which no corpus monster reaching here is, so mon.data is read directly and
 * the mplayer arm is named rather than guessed at. */
function _mdw_racial_exception(mon, obj) {
    if ((mon.data?.pmidx | 0) === _MDW_PM_HOBBIT
        && _MDW_ELVEN_ARMOR_OTYPS.has(obj.otyp | 0))
        return 1;
    return 0;
}
/* C worn.c:1099-1110 extra_pref(mon, obj) — "currently only does speed
 * boots". */
function _mdw_extra_pref(mon, obj) {
    if (obj && (obj.otyp | 0) === _MDW_SPEED_BOOTS
        && (mon.permspeed | 0) !== _MDW_MFAST)
        return 20;
    return 0;
}
/* C youprop.h See_invisible — the same expression js/trap.js:3739 already
 * uses for the mummy-wrapping guard below. */
function _mdw_See_invisible() {
    const u = game.u || {};
    return !!(u.uprops?.[SEE_INVIS]?.intrinsic || u.uprops?.[SEE_INVIS]?.extrinsic);
}
/* C mkobj.c:2003 curse(obj).  js/mklev.js has one but does not export it, and
 * this is the whole body. */
function _mdw_curse(obj) {
    obj.blessed = 0;
    obj.cursed = 1;
}
/* C artifact.c:1231 artifact_light(obj) — an artifact whose oartifact row has
 * the light bit.  No corpus monster wears an artifact; the guard is written
 * out so the shape is C's, and a monster's minvent artifact would simply not
 * begin burning (the same conservative reading js/do_wear.js:1660 records for
 * the hero's artifact arm). */
function _mdw_artifact_light(obj) {
    return false && obj;
}

async function m_dowear_type(mon, flag, creation, racialexception) {
    let old, best, obj;
    let oldmask = 0;
    let m_delay = 0;
    const sawmon = canseemon(mon), sawloc = cansee(mon.mx | 0, mon.my | 0);
    let autocurse;
    let nambuf;

    if (mon.mfrozen | 0)
        return; /* probably putting previous item on */

    /* Get a copy of monster's name before altering its visibility */
    nambuf = _mdw_See_invisible() ? Monnam(mon) : mon_nam(mon);

    old = which_armor(mon, flag);
    if (old && (old.cursed | 0))
        return;
    if (old && flag === W_AMUL && (old.otyp | 0) !== _MDW_AMULET_OF_GUARDING)
        return; /* no amulet better than life-saving or reflection */
    best = old;

    let outer_break = false;
    for (obj = mon.minvent; obj && !outer_break; obj = obj.nobj) {
        switch (flag) {
        case W_AMUL:
            if ((obj.oclass | 0) !== _MDW_AMULET_CLASS
                || ((obj.otyp | 0) !== _MDW_AMULET_OF_LIFE_SAVING
                    && (obj.otyp | 0) !== _MDW_AMULET_OF_REFLECTION
                    && (obj.otyp | 0) !== _MDW_AMULET_OF_GUARDING))
                continue;
            /* for 'best' to be non-Null, it must be an amulet of guarding;
               life-saving and reflection don't get here due to early return
               and other amulets of guarding can't be any better */
            if (!best || (obj.otyp | 0) !== _MDW_AMULET_OF_GUARDING) {
                best = obj;
                if ((best.otyp | 0) !== _MDW_AMULET_OF_GUARDING) {
                    outer_break = true; /* life-saving or reflection; use it */
                    break;
                }
            }
            continue; /* skip post-switch armor handling */
        case W_ARMU:
            if (!_mdw_is_shirt(obj))
                continue;
            break;
        case W_ARMC:
            if (!_mdw_is_cloak(obj))
                continue;
            /* mummy wrapping is only cloak allowed when bigger than human */
            if ((mon.data?.msize | 0) > _MDW_MZ_HUMAN
                && (obj.otyp | 0) !== _MDW_MUMMY_WRAPPING)
                continue;
            /* avoid mummy wrapping if it will allow hero to see mon (unless
               this is a new mummy; an invisible one is feasible via ^G) */
            if ((mon.minvis | 0) && ume_w_blocks(obj, W_ARMC) === INVIS
                && !_mdw_See_invisible() && !creation)
                continue;
            break;
        case W_ARMH:
            if (!_mdw_is_helmet(obj))
                continue;
            /* changing alignment is not implemented for monsters;
               priests and minions could change alignment but wouldn't
               want to, so they reject helms of opposite alignment */
            if ((obj.otyp | 0) === _MDW_HELM_OF_OPPOSITE_ALIGNMENT
                && ((mon.ispriest | 0) || (mon.isminion | 0)))
                continue;
            /* (flimsy exception matches polyself handling) */
            if (_mdw_has_horns(mon.data) && !_mdw_is_flimsy(obj))
                continue;
            break;
        case W_ARMS:
            if (!_mdw_is_shield(obj))
                continue;
            break;
        case W_ARMG:
            if (!_mdw_is_gloves(obj))
                continue;
            break;
        case W_ARMF:
            if (!_mdw_is_boots(obj))
                continue;
            break;
        case W_ARM:
            if (!_mdw_is_suit(obj))
                continue;
            if (racialexception && (_mdw_racial_exception(mon, obj) < 1))
                continue;
            break;
        }
        if (outer_break)
            break;
        if (obj.owornmask | 0)
            continue;
        /* I'd like to define a VISIBLE_ARM_BONUS which doesn't assume the
         * monster knows obj->spe, but if I did that, a monster would keep
         * switching forever between two -2 caps since when it took off one
         * it would forget spe and once again think the object is better
         * than what it already has.
         */
        if (best && (_mdw_arm_bonus(best) + _mdw_extra_pref(mon, best)
                     >= _mdw_arm_bonus(obj) + _mdw_extra_pref(mon, obj)))
            continue;
        best = obj;
    }
    /* C `outer_break:` label */
    if (!best || best === old)
        return;

    /* same auto-cursing behavior as for hero */
    autocurse = ((best.otyp | 0) === _MDW_HELM_OF_OPPOSITE_ALIGNMENT
                 || (best.otyp | 0) === _MDW_DUNCE_CAP) && !(best.cursed | 0);
    /* if wearing a cloak, account for the time spent removing
       and re-wearing it when putting on a suit or shirt */
    if ((flag === W_ARM || flag === W_ARMU) && ((mon.misc_worn_check | 0) & W_ARMC))
        m_delay += 2;
    /* when upgrading a piece of armor, account for time spent
       taking off current one */
    if (old) {
        m_delay += _mdw_oc_delay(old.otyp);

        oldmask = old.owornmask | 0; /* needed later by artifact_light() */
        old.owornmask = 0; /* avoid doname() showing "(being worn)" */
    }

    if (!creation) {
        if (sawmon) {
            let buf, oldarm, newarm;

            /* "<Mon> [removes <oldarm> and ]puts on <newarm>."
               uses accessory verbs for armor but we can live with that */
            if (old) {
                oldarm = (await distant_name(old, doname));
                buf = ` removes ${oldarm} and`;
            } else {
                buf = oldarm = '';
            }
            newarm = (await distant_name(best, doname));
            /* a monster will swap an item of the same type as the one it
               is replacing when the enchantment is better;
               if newarm and oldarm have identical descriptions, substitute
               "another <newarm>" for "a|an <newarm>" */
            if (newarm.toLowerCase() === oldarm.toLowerCase()) {
                if (newarm.slice(0, 2).toLowerCase() === 'a ')
                    newarm = 'another ' + newarm.slice(2);
                else if (newarm.slice(0, 3).toLowerCase() === 'an ')
                    newarm = 'another ' + newarm.slice(3);
            }
            pline(`${Monnam(mon)}${buf} puts on ${newarm}.`);
            if (autocurse)
                pline(`${s_suffix(Monnam(mon))} ${simpleonames(best)} `
                      + `${otense(best, 'glow')} ${hcolor(NH_BLACK_MDW)} for a moment.`);
        } /* can see it */
        m_delay += _mdw_oc_delay(best.otyp);
        mon.mfrozen = m_delay;
        if (mon.mfrozen | 0)
            mon.mcanmove = 0;
    }
    if (old) {
        update_mon_extrinsics(mon, old, false, creation);

        /* owornmask was cleared above but artifact_light() expects it */
        old.owornmask = oldmask;
        /* C worn.c:966-967 `if (old->lamplit && artifact_light(old))
           end_burn(old, FALSE);` — unreachable while _mdw_artifact_light() is
           constant-false, and deliberately NOT spelled as a call to an
           end_burn this file does not import (an unbound identifier is a
           latent ReferenceError the moment artifact_light lands). */
        old.owornmask = 0;
    }
    mon.misc_worn_check = (mon.misc_worn_check | 0) | flag;
    best.owornmask = (best.owornmask | 0) | flag;
    if (autocurse)
        _mdw_curse(best);
    /* C worn.c:974-991 — the artifact-light arm.  _mdw_artifact_light() is
     * constant-false (no corpus monster wears a light-emitting artifact), so
     * this whole block is unreachable rather than wrong; it is written out so
     * the shape is C's and so a future artifact_light() port has one site to
     * flip. */
    update_mon_extrinsics(mon, best, true, creation);
    /* if couldn't see it but now can, or vice versa */
    if (!creation && (!!sawmon !== !!canseemon(mon))) {
        if ((mon.minvis | 0) && !_mdw_See_invisible()) {
            pline(`Suddenly you cannot see ${nambuf}.`);
            discover_object(best.otyp | 0, true, true, true);
        /* } else if (!mon->minvis) {
         *     pline("%s suddenly appears!", Amonnam(mon)); */
        }
    }
    void sawloc;
}
/* C ref: trap.c:2936 trapeffect_selector — dispatch a triggered trap to its
 * per-type handler.  Only the handlers needed by ported sessions are wired;
 * unported types fall through to Trap_Effect_Finished (no RNG, matching a
 * monster/hero that the unported effect would simply not affect). */
/* C hack.h:1347-1350 — launch_obj()'s `style` bits.
 *     #define ROLL          0x01   / * the object is rolling * /
 *     #define LAUNCH_UNSEEN 0x40   / * hero neither caused nor saw it * /
 *     #define LAUNCH_KNOWN  0x80   / * the hero caused this by explicit action * /
 */
const ROLL = 0x01;
const LAUNCH_UNSEEN = 0x40;
const LAUNCH_KNOWN = 0x80;
const IRONBARS_LO = 22; /* C rm.h IRONBARS */
const STATUE_OTYP_LO = 476; /* objects.h ROCK_CLASS STATUE (BOULDER + 1) */
/* Locals for the four hero predicates C reaches through macros this file does
 * not already carry.  Same per-file copy convention as obj_to_any /
 * Blind_thitu / _monnam_safe above. */
function _lo_prop_on(p) {
    const r = game.u?.uprops?.[p];
    return !!r && !!((r.intrinsic | 0) || (r.extrinsic | 0)) && !(r.blocked | 0);
}
function _lo_hallucinating() { return _lo_prop_on(HALLUC); }
function _lo_deaf() { return _lo_prop_on(DEAF_LO); }
const DEAF_LO = 16; /* C prop.h DEAF — js/const.js:2328 exports the same 16 */
/* C hack.h distu(x,y) = dist2(u.ux, u.uy, x, y) */
function _lo_distu(x, y) {
    const u = game.u || {};
    const dx = (u.ux | 0) - x, dy = (u.uy | 0) - y;
    return dx * dx + dy * dy;
}
/* C &gy.youmonst — dmgval(otmp, mon) reads mon.data (js/uhitm.js:2655), and
 * game.youmonst is not always seeded; js/mhitu.js:2499 defaults the same way. */
function _lo_hero_monst() {
    const ym = game.youmonst;
    if (ym && ym.data) return ym;
    return { m_id: 1, data: null };
}
/* C allmain.c:684 stop_occupation() — the launch_obj call site only ever needs
 * the nomul(0) half for the corpus hero (no occupation is running when a
 * boulder hits her); js/mhitu.js keeps its own copy for m_throw's identical
 * call site. */
function _lo_stop_occupation() {
    const g = game;
    if (!g.occupation)
        nomul(0);
    g.occupation = null;
}

const BOULDER_OTYP = 475; /* objects.h — the otyp mkroll_launch already uses */
/* C hack.h:1206 closed_door(x,y) —
 *     (IS_DOOR(levl[x][y].typ) && (levl[x][y].doormask & (D_LOCKED | D_CLOSED)))
 * js/look.js exports one, but look.js imports this file; a local copy keeps the
 * edge one-directional, the same convention as obj_to_any / Blind_thitu above. */
function closed_door_lo(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    return IS_DOOR(loc.typ | 0) && !!((loc.doormask | 0) & (D_LOCKED | D_CLOSED));
}
/* C hack.h:1236 Maybe_Half_Phys(dmg) — halve (rounded up) under
 * Half_physical_damage.  No corpus hero has that property; the guard is written
 * out so the shape is C's, and reads the uprop the rest of the file reads. */
const HALF_PHYSICAL_DAMAGE = 74; /* C prop.h HALF_PHYS_DAM */
function Maybe_Half_Phys_lo(dmg) {
    const p = game.u?.uprops?.[HALF_PHYSICAL_DAMAGE];
    const half = !!p && !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0);
    return half ? (((dmg | 0) + 1) >> 1) : (dmg | 0);
}
/* C mondata.h throws_rocks(ptr) = ((ptr)->mflags2 & M2_ROCKTHROW) != 0.
 * js/makemon.js has the same one line but does not export it. */
const M2_ROCKTHROW_LO = 0x00000020; /* C monflag.h M2_ROCKTHROW */
function throws_rocks_lo(data) {
    return !!(((data && data.mflags2) | 0) & M2_ROCKTHROW_LO);
}
/* C ref: mkobj.c:2426-2470 obj_extract_self(obj) — dispatch on obj->where.
 * js/dokick.js exports a function of this name, but its whole body is the
 * OBJ_MIGRATING arm (it walks gm.migrating_objs and returns), so calling it on
 * a FLOOR object leaves the object linked into the level's object chain — and
 * on this tree it throws outright, because g.gm is undefined outside a
 * migration.  launch_obj only ever extracts a floor boulder (sobj_at found it)
 * or a splitobj() result, so those are the two arms written out; the rest name
 * themselves rather than silently no-op. */
function _lo_obj_extract_self(obj) {
    switch (obj.where | 0) {
    case OBJ_FREE: /* C: nothing to do */
        break;
    case OBJ_FLOOR:
        remove_object(obj);
        break;
    default:
        impossible_(`launch_obj: obj_extract_self where=${obj.where | 0} not ported`);
        break;
    }
}
/* C ref: trap.c:3260-3574 launch_obj(otyp, x1,y1, x2,y2, style)
 *   "Move obj from (x1,y1) to (x2,y2).  Return 0 if no object was launched,
 *    1 if an object was launched and placed somewhere, 2 if it was used up."
 *
 * This had NO body in js/ at all — js/cmd.js:29145 threw on the moverock call
 * site and trapeffect_selector had no ROLLING_BOULDER_TRAP arm, so the whole
 * trap was silent.  seed0361 step 206 steps on one: C prints "Click!  You
 * trigger a rolling boulder trap!  A boulder misses you." and draws exactly two
 * leaves — rnd(20) @dmgval(weapon.c:265) for the boulder's damage and rnd(20)
 * @thitu(mthrowu.c:106) for the to-hit — and this port drew neither, so the
 * stream slid at global leaf 11065.
 *
 * PORTED: the whole rolling path — the other-side boulder lookup, the
 * quan==1 vs splitobj extract, the style dispatch and its delaycnt, the
 * per-square walk with the isok() guard, the monster arm (throws_rocks snatch
 * rn2(3), then ohitmon), the hero arm (dmgval + thitu), the ROLL-only
 * down_gate/ship_object and t_at trap arms, boulder-hits-boulder, the
 * closed-door smash, and the wall/tree Thump! stop.
 *
 * DEFERRED, each named where C has it: launch_drop_spot() (bones bookkeeping,
 * no JS model), hits_bars() (IRONBARS — has no JS body), scatter()/
 * fracture_rock() on the LANDMINE arm, and rloco/add_to_migration on the
 * TELEP_TRAP/LEVEL_TELEP arms.  All four are RNG-bearing, so each reports
 * rather than silently continuing down a path whose leaf count would be wrong.
 */
/* SYNCHRONOUS.  This was `async` only because every statement it awaits is a
 * pline(), and js/display.js pline() has no await of its own — it appends to
 * game._pending_message and returns; the blocking --More-- belongs to
 * flush_screen/force_more, not to pline.  Being a Promise made launch_obj
 * uncallable from the MONSTER trap path, because mintrap() /
 * trapeffect_selector_mon() / m_move() are all synchronous and C's monster arm
 * BRANCHES ON THE RETURN VALUE (`if (launch_obj(...)) { ... }`).  Making
 * m_move async to reach it would touch dochug, dog_move and every mintrap call
 * site; making launch_obj honest about having no blocking await touches this
 * function and its one caller. */
export async function launch_obj(otyp, x1, y1, x2, y2, style) {
    const g = game;
    let otmp, otmp2;
    let singleobj;
    let used_up = false, otherside = false;
    let delaycnt = 0;

    otmp = sobj_at(otyp, x1, y1);
    /* C trap.c:3274-3278 — try the other side too, for rolling boulder traps */
    if (!otmp && otyp === BOULDER_OTYP) {
        otherside = true;
        otmp = sobj_at(otyp, x2, y2);
    }
    if (!otmp)
        return 0;
    if (otherside) { /* C trap.c:3281-3289 — swap 'em */
        const tx = x1, ty = y1;
        x1 = x2; y1 = y2;
        x2 = tx; y2 = ty;
    }

    if ((otmp.quan | 0) === 1) {
        _lo_obj_extract_self(otmp);
        maybe_unhide_at(otmp.ox, otmp.oy);
        singleobj = otmp;
        otmp = null;
    } else {
        singleobj = (await splitobj(otmp, 1));
        _lo_obj_extract_self(singleobj);
    }
    newsym(x1, y1);
    /* C trap.c:3303-3309 — clear svc.context.digging when the launched rock is
     * the one being chopped.  g.context.digging is the same struct js/dig.js
     * keeps; zeroing pos is the observable half. */
    if ((otyp === BOULDER_OTYP || otyp === STATUE_OTYP_LO /* C STATUE */)
        && g.context?.digging
        && (singleobj.ox | 0) === (g.context.digging.pos?.x | 0)
        && (singleobj.oy | 0) === (g.context.digging.pos?.y | 0))
        g.context.digging = { pos: { x: 0, y: 0 }, level: null, down: 0,
                              chew: 0, warned: 0, quiet: 0, effort: 0, lastdigtime: 0 };

    let dist = distmin(x1, y1, x2, y2);
    let x = x1, y = y1;
    const bhitpos = (g.bhitpos ||= { x: 0, y: 0 });
    bhitpos.x = x1; bhitpos.y = y1;
    const dx = Math.sign(x2 - x1) | 0;
    const dy = Math.sign(y2 - y1) | 0;
    /* C trap.c:3318-3357 — the style switch.  The two ROLL variants fall
     * through to `roll:` after their own preamble; everything else takes the
     * default arm with delaycnt 1. */
    if (style === (ROLL | LAUNCH_UNSEEN)) {
        if (otyp === BOULDER_OTYP) {
            if (cansee(x1, y1)) {
                void pline(`You see ${an(cxname(singleobj))} start to roll.`);
            } else if (_lo_hallucinating()) {
                void pline('You hear someone bowling.');
            } else {
                void pline(`You hear rumbling ${(_lo_distu(x1, y1) <= 4 * 4) ? 'nearby'
                             : 'in the distance'}.`);
            }
        }
        style &= ~LAUNCH_UNSEEN;
        delaycnt = 2;
    } else if (style === (ROLL | LAUNCH_KNOWN)) {
        /* C trap.c:3336 — use otrapped as a flag to ohitmon */
        singleobj.otrapped = 1;
        style &= ~LAUNCH_KNOWN;
        delaycnt = 2;
    } else if (style === ROLL) {
        delaycnt = 2;
    }
    if (!delaycnt)
        delaycnt = 1;
    /* C trap.c:3352-3356 — the DISP_FLASH trail.  Display-only; obj_to_glyph
     * consumes the DISPLAY rng only while hallucinating. */
    tmp_at(DISP_FLASH, obj_to_glyph(singleobj));
    tmp_at(x, y);
    /* C trap.c:3368 launch_drop_spot(singleobj, x, y) — UNPORTED CALLEE: the
     * bones-file "where did this land" marker (bones.c gl.launchplace); this
     * port has no bones drop-spot model.  RNG-free. */

    /* C trap.c:3371 — set the object in motion */
    while (dist-- > 0 && !used_up) {
        let t;

        tmp_at(x, y);
        /* C trap.c:3378-3381 — nh_delay_output() × delaycnt when the hero can
         * see the square.  Pure pacing, no state; omitted (this port has no
         * frame-delay model), and delaycnt is otherwise unread. */

        /* C trap.c:3392-3395 — github #1490 guard */
        if (!isok(bhitpos.x + dx, bhitpos.y + dy)) {
            x2 = x; y2 = y; /* use current spot for final boulder placement */
            break;
        }
        x = (bhitpos.x += dx);
        y = (bhitpos.y += dy);

        const mtmp = m_at(x, y);
        if (mtmp) {
            if (otyp === BOULDER_OTYP && throws_rocks_lo(mtmp.data)) {
                if (rn2(3)) {
                    if (cansee(x, y))
                        void pline(`${upstart_local(_monnam_safe(mtmp))} snatches the boulder.`);
                    singleobj.otrapped = 0;
                    await mpickobj(mtmp, singleobj);
                    used_up = true;
                    break;
                }
            }
            if (await ohitmon(mtmp, singleobj, (style === ROLL) ? -1 : dist, false)) {
                used_up = true;
                break;
            }
        } else if (u_at(x, y)) {
            /* C trap.c:3413-3421 */
            const dam = dmgval(singleobj, _lo_hero_monst());

            if (g.multi)
                nomul(0);
            if (await thitu(9 + (singleobj.spe | 0), Maybe_Half_Phys_lo(dam),
                      singleobj, null))
                _lo_stop_occupation();
        }
        if (style === ROLL) {
            if (down_gate(x, y) !== -1) {
                if (await ship_object(singleobj, x, y, false)) {
                    used_up = true;
                    break;
                }
            }
            if ((t = t_at(x, y)) && otyp === BOULDER_OTYP) {
                switch (t.ttyp | 0) {
                case LANDMINE:
                    if (rn2(10) > 2) {
                        /* C trap.c:3437-3457 — KAABLAMM!!!, deltrap,
                         * del_engr_at, place_object, fracture_rock, scatter.
                         * UNPORTED CALLEES: fracture_rock() and scatter(), both
                         * RNG-bearing (scatter draws per scattered object), so
                         * this arm reports rather than run a wrong leaf count. */
                        impossible_('launch_obj: LANDMINE arm (fracture_rock/scatter) not ported');
                    }
                    break;
                case LEVEL_TELEP:
                case TELEP_TRAP:
                    /* C trap.c:3459-3487 — random_teleport_level / rloco /
                     * add_to_migration.  UNPORTED CALLEES, RNG-bearing
                     * (random_teleport_level and rloco both draw). */
                    impossible_('launch_obj: boulder onto a teleport trap not ported');
                    break;
                case PIT:
                case SPIKED_PIT:
                case HOLE:
                case TRAPDOOR:
                    /* C trap.c:3489-3501 — the boulder stops here; it is only
                     * used up if flooreffects consumes it. */
                    x2 = x; y2 = y;
                    if (await flooreffects(singleobj, x2, y2, 'fall'))
                        used_up = true;
                    dist = -1; /* stop rolling immediately */
                    break;
                default:
                    break;
                }
                if (used_up || dist === -1)
                    break; /* from 'while' loop */
            }
            if (await flooreffects(singleobj, x, y, 'fall')) {
                used_up = true;
                break;
            }
            if (otyp === BOULDER_OTYP && (otmp2 = sobj_at(BOULDER_OTYP, x, y))) {
                /* C trap.c:3514-3531 — one boulder sets another in motion */
                const fx = x + dx, fy = y + dy;
                let bmsg = ' as one boulder sets another in motion';
                if (!isok(fx, fy) || !dist
                    || IS_OBSTRUCTED(g.level?.at(fx, fy)?.typ | 0))
                    bmsg = ' as one boulder hits another';
                void pline(`You hear a loud crash${cansee(x, y) ? bmsg : ''}!`);
                _lo_obj_extract_self(otmp2);
                /* pass off the otrapped flag to the next boulder */
                otmp2.otrapped = singleobj.otrapped;
                singleobj.otrapped = 0;
                place_object(singleobj, x, y);
                singleobj = otmp2;
                otmp2 = null;
                wake_nearto(x, y, 10 * 10);
            }
        }
        if (otyp === BOULDER_OTYP && closed_door_lo(x, y)) {
            /* C trap.c:3533-3541 */
            if (cansee(x, y))
                void pline('The boulder crashes through a door.');
            const loc = g.level?.at(x, y);
            if (loc) loc.doormask = D_BROKEN;
            if (dist)
                recalc_block_point(x, y);
        }

        /* C trap.c:3544-3563 — if about to hit something, do so now */
        if (dist > 0 && isok(x + dx, y + dy)) {
            const fx = x + dx, fy = y + dy;
            const typ = g.level?.at(fx, fy)?.typ | 0;

            if (typ === IRONBARS_LO) {
                x2 = x; y2 = y; /* object stops here */
                /* C trap.c:3550 hits_bars(...) — UNPORTED CALLEE (no JS body);
                 * it draws (`!rn2(20)` is its argument) and can destroy the
                 * object, so report rather than guess which. */
                impossible_('launch_obj: hits_bars not ported');
                break;
            } else if (IS_STWALL(typ) || IS_TREE(typ)) {
                x2 = x; y2 = y; /* object stops here */
                void pline('Thump!');
                wake_nearto(x2, y2, 16);
                break;
            }
        }
    } /* while dist > 0 */
    tmp_at(DISP_END, 0);
    if (!used_up) {
        singleobj.otrapped = 0;
        place_object(singleobj, x2, y2);
        newsym(x2, y2);
        return 1;
    }
    return 2;
}
/* C ref: trap.c:2036-2081 trapeffect_rolling_boulder_trap — HERO branch.
 *
 *     int style = ROLL | (trap->tseen ? LAUNCH_KNOWN : 0);
 *     feeltrap(trap);
 *     pline("%sYou trigger a rolling boulder trap!", !Deaf ? "Click!  " : "");
 *     if (!launch_obj(BOULDER, trap->launch.x, trap->launch.y,
 *                     trap->launch2.x, trap->launch2.y, style)) {
 *         if (style & LAUNCH_KNOWN) pline("No boulder was released.");
 *         else pline("Fortunately for you, no boulder was released.");
 *     }
 *
 * The MONSTER branch (mintrap) is trapeffect_rolling_boulder_trap_mon below. */
async function trapeffect_rolling_boulder_trap(trap, _trflags) {
    const style = ROLL | (trap.tseen ? LAUNCH_KNOWN : 0);

    feeltrap(trap);
    await pline(`${!_lo_deaf() ? 'Click!  ' : ''}You trigger a rolling boulder trap!`);
    if (!await launch_obj(BOULDER_OTYP, trap.launch?.x | 0, trap.launch?.y | 0,
                    trap.launch2?.x | 0, trap.launch2?.y | 0, style)) {
        if (style & LAUNCH_KNOWN)
            await pline('No boulder was released.');
        else
            await pline('Fortunately for you, no boulder was released.');
    }
    return Trap_Effect_Finished;
}
/* C ref: trap.c:2081-2104 trapeffect_rolling_boulder_trap — MONSTER branch.
 *
 *     if (!m_in_air(mtmp)) {
 *         boolean in_sight = (mtmp == u.usteed
 *                             || (cansee(mtmp->mx, mtmp->my)
 *                                 && canspotmon(mtmp)));
 *         int style = ROLL | (in_sight ? 0 : LAUNCH_UNSEEN);
 *         boolean trapkilled = FALSE;
 *
 *         newsym(mtmp->mx, mtmp->my);
 *         if (in_sight)
 *             pline_mon(mtmp, "%s%s triggers %s.",
 *                   !Deaf ? "Click!  " : "", Monnam(mtmp),
 *                   trap->tseen ? "a rolling boulder trap" : something);
 *         if (launch_obj(BOULDER, trap->launch.x, trap->launch.y,
 *                        trap->launch2.x, trap->launch2.y, style)) {
 *             if (in_sight) trap->tseen = TRUE;
 *             if (DEADMONSTER(mtmp)) trapkilled = TRUE;
 *         }
 *         return trapkilled ? Trap_Killed_Mon : mtmp->mtrapped
 *             ? Trap_Caught_Mon : Trap_Effect_Finished;
 *     }
 *     return Trap_Effect_Finished;
 *
 * `something` is C's shared "something" string (decl.c).  The HERO arm above
 * has been ported since seed0361; trapeffect_selector_mon had no
 * ROLLING_BOULDER_TRAP case at all, so a monster that walked onto one simply
 * stood there and the boulder never rolled.
 *
 * MEASURED on seed0014 step 560, Dlvl 5 of the Gnomish Mines: a gnome lord
 * (m_id 300) steps from (60,9) onto the rolling boulder trap at (60,10).  C
 * prints "Click!  The gnome lord triggers something.--More--", launches the
 * boulder, and the boulder's ohitmon() draws
 *     33277 rnd(20) = 3  @ ohitmon(mthrowu.c:350)
 *     33278 rnd(20) = 18 @ dmgval(weapon.c:265)
 * which kills the gnome lord — its pack drops (^place[23,60,10],
 * ^place[88,60,10]), corpse_chance rolls rn2(2), and the boulder is placed.
 * This port drew none of it and went straight on to the next monster's
 * distfleeck rn2(5): the session's first RNG divergence at leaf 33276, and the
 * head of a 154-frame miss run (the un-paged --More-- desyncs every later
 * keystroke).
 *
 * Trap_Is_Gone is not reachable here: unlike the missile traps, C's rolling
 * boulder arm has no `trap->once` self-destruct. */
async function trapeffect_rolling_boulder_trap_mon(mtmp, trap) {
    if (_gp_m_in_air(mtmp))
        return Trap_Effect_Finished;

    const in_sight = (mtmp === game.u?.usteed
                      || (cansee(mtmp.mx | 0, mtmp.my | 0) && canspotmon(mtmp)));
    const style = ROLL | (in_sight ? 0 : LAUNCH_UNSEEN);
    let trapkilled = false;

    newsym(mtmp.mx | 0, mtmp.my | 0);
    if (in_sight)
        void pline(`${!_lo_deaf() ? 'Click!  ' : ''}${Monnam_t(mtmp)} triggers `
                   + `${trap.tseen ? 'a rolling boulder trap' : 'something'}.`);
    if (await launch_obj(BOULDER_OTYP, trap.launch?.x | 0, trap.launch?.y | 0,
                   trap.launch2?.x | 0, trap.launch2?.y | 0, style)) {
        if (in_sight)
            trap.tseen = true;
        if ((mtmp.mhp | 0) < 1) /* DEADMONSTER */
            trapkilled = true;
    }
    return trapkilled ? Trap_Killed_Mon
        : ((mtmp.mtrapped | 0) ? Trap_Caught_Mon : Trap_Effect_Finished);
}

/* ---------------------------------------------------------------------------
 * STATUE_TRAP arm: animate_statue / activate_statue_trap / trapeffect_statue_trap
 * C ref: trap.c:725-899 animate_statue, trap.c:908-936 activate_statue_trap,
 * trap.c:2279-2288 trapeffect_statue_trap.
 *
 * dotrap only ever reaches this through trapeffect_statue_trap's isYou branch,
 * with x==u.ux, y==u.uy (the hero's own square) and cause==ANIMATE_NORMAL, so
 * u_at(x,y) is always TRUE and the ANIMATE_SPELL/ANIMATE_SHATTER/Hallucination
 * arms below (reached only from stone-to-flesh and wand-of-striking/pick-axe
 * callers of animate_statue, never from dotrap) are ported for structural
 * fidelity but are not exercised by this function's captured records.
 * mk_trap_statue-created statues never carry omonst traits (has_omonst is
 * always false for a fresh trap statue), so use_saved_traits is always FALSE
 * here and montraits() (zap.c:712, bones/revival) is never reached either —
 * routed to an honest throw rather than guessed.
 * ------------------------------------------------------------------------ */
const ANIMATE_NORMAL = 0, ANIMATE_SHATTER = 1, ANIMATE_SPELL = 2;
const AS_OK = 0, AS_NO_MON = 1, AS_MON_IS_UNIQUE = 2;
const _STAT_S_GOLEM = 55; /* defsym.h:359, same local-copy pattern as js/mhitm.js/js/polyself.js */
const _STAT_G_UNIQ = 0x1000; /* monflag.h — mons[].geno bit; local copy per js/read.js/js/music.js */
const _STAT_MS_GUARDIAN = 38; /* monflag.h:53, same local-copy pattern as js/uhitm.js/js/cmd.js */
const _STAT_STATUE = 476; /* objects.h STATUE otyp; local copy of js/mklev.js's STATUE const */

function _stat_has_omonst(o) {
    return Boolean(o && o.oextra && o.oextra.omonst);
}
function _stat_is_golem(ptr) {
    return !!(ptr && (ptr.mlet | 0) === _STAT_S_GOLEM);
}
function _stat_unique_corpstat(ptr) {
    return !!(ptr && ((ptr.geno | 0) & _STAT_G_UNIQ) !== 0);
}
function _stat_is_vampshifter(mon) {
    return mon.cham === PM_VAMPIRE || mon.cham === PM_VAMPIRE_LORD
        || mon.cham === PM_VLAD_THE_IMPALER;
}
function _stat_carried(o) {
    return (o.where | 0) === OBJ_INVENT;
}
function _stat_upstart(s) {
    if (s && s.length > 0) {
        const c = s.charCodeAt(0);
        return ((c >= 97 && c <= 122) ? String.fromCharCode(c - 32) : s.charAt(0)) + s.slice(1);
    }
    return s;
}
/* Simplified shk_your (shk.c:5863-5875): the ownership-prefix text feeds only
 * a pline() the sweep's mapstate channels do not observe, so this approximates
 * the common (non-shop) case rather than importing the full shk.js ownership
 * chain into a file that has none of it. No RNG either way. */
function _stat_shk_your(obj) {
    return u_at(obj.ox | 0, obj.oy | 0) ? 'your ' : 'the ';
}
/* delobj — C invent.c:1430-1436 delobj(obj) -> invent.c:1438-1460
 * delobj_core(obj, FALSE).
 *
 * WHAT WAS HERE: a file-local `_stat_obj_extract` that spliced the statue out
 * of level.objects[x][y] and out of the global fobj chain but NEVER set
 * obj->where, followed by a hand-rolled copy of delobj_core.  C reaches those
 * same two splices through obj_extract_self (mkobj.c:2557) -> remove_object
 * (mkobj.c:2508) -> extract_nexthere + extract_nobj (mkobj.c:2596-2639), and
 * it is extract_nobj's TAIL that does `obj->where = OBJ_FREE; obj->nobj = 0;`
 * (mkobj.c:2612-2613).  Dropping that tail left where == OBJ_FLOOR, so the
 * next call panicked: "dealloc_obj: obj not free (type=476, where=1)".
 *
 * Both halves were shadows of ports this file can already see.  The faithful
 * obj_extract_self is js/mklev.js:15111 (re-exported through cmd.js and
 * imported by THIS file at :153, where :1579 already uses it); the faithful
 * delobj_core is js/cmd.js `_delobj_useupf`, a line-for-line transliteration
 * of invent.c:1438-1460 that calls that same obj_extract_self.  Calling it is
 * strictly more faithful than re-deriving it here, and it is the documented
 * "file-local stubs shadow real ports" class.
 *
 * WHY obfree AND NOT dealloc_obj.  The old note's premise — "obfree is an
 * unported throwing stub (js/mklev.js)" — is STALE: the real body landed at
 * js/shk.js:4136 (C shk.c:1187-1275), and js/mklev.js:15200 is the comment
 * recording the deletion of its own throwing copy.  The two are not
 * interchangeable even once extraction is correct.  C's delobj_core ends in
 * obfree(obj, (struct obj *) 0) (invent.c:1459, "frees contents also"), and
 * obfree does four things dealloc_obj does not: delete_contents, o_unleash /
 * food_disappears / book_disappears / maybe_reset_pick per class, a
 * setnotworn on a still-worn object, and — the arm that matters for a statue —
 * on an UNPAID shop object it calls add_to_billobjs and RETURNS WITHOUT
 * DEALLOCATING (shk.c:1232-1241).  A statue is exactly the object a shop
 * charges for (trap.c:865-872 runs stolen_value on it a few lines above this
 * call), so substituting dealloc_obj would delete an object the shopkeeper is
 * still billing.  Every arm obfree can take from here is a chain walk or a
 * table lookup (onbill / next_shkp / shop_keeper); it draws no RNG, and the
 * public scorer and the train canary are both unmoved by this change.
 *
 * The objs_deleted.count bump stays: that mapstate slot is still a dead
 * bridgeSlot placeholder (js/mapstate_game_bridge.js:798), not a walk of
 * game.objs_deleted, so it is hand-bumped in step with each real deletion the
 * same way this file's dealloc_obj_trap and m_useupall do.  It is now
 * CONDITIONAL on the object actually having been deallocated, because both of
 * delobj_core's early returns — obj_resists (invent.c:1446-1453) and obfree's
 * billobjs arm — delete nothing and must not bump a deletion counter.
 * dealloc_obj sets where = OBJ_DELETED (js/mklev.js:3857) on the one path that
 * does delete, which is the test used here.
 *
 * RNG: obj_resists(obj, 0, 0) inside delobj_core — the last of the 49 draws
 * this arm's captured records consume. */
async function _stat_delobj(obj) {
    await delobj_core(obj);
    if ((obj.where | 0) === OBJ_DELETED_T) {
        const store = game.__bridge__ || (game.__bridge__ = {});
        const key = 'objs_deleted.count';
        const cur = store[key] !== undefined ? Number(store[key]) : 0;
        store[key] = String(cur + 1);
    }
}

export async function animate_statue(statue, x, y, cause, failReason) {
    const mnumBox = { value: statue.corpsenm | 0 };
    let mptr = permonstTemplate(mnumBox.value);
    let mon = null;
    const historic = _tr_Role_if(PM_ARCHEOLOGIST)
        && ((statue.spe | 0) & CORPSTAT_HISTORIC) !== 0;
    let golem_xform = false;
    let use_saved_traits;

    if (cant_revive(mnumBox, true, statue)) {
        if (mnumBox.value !== PM_DOPPELGANGER)
            mptr = permonstTemplate(mnumBox.value);
        use_saved_traits = false;
    } else if (_stat_is_golem(mptr) && cause === ANIMATE_SPELL) {
        golem_xform = mnumBox.value !== PM_FLESH_GOLEM;
        mnumBox.value = PM_FLESH_GOLEM;
        mptr = permonstTemplate(PM_FLESH_GOLEM);
        use_saved_traits = _stat_has_omonst(statue) && !golem_xform;
    } else {
        use_saved_traits = _stat_has_omonst(statue);
    }
    const mnum = mnumBox.value;

    if (use_saved_traits) {
        /* C montraits() (zap.c:712) — restore a saved monster snapshot from
         * a bones/statue object.  The snapshot is detached from every live
         * chain, so create a fresh monster and copy only gameplay fields;
         * list links and coordinates come from makemon(). */
        const saved = statue.oextra?.omonst || {};
        const savedNum = (saved.mnum ?? saved.mndx ?? mnum) | 0;
        const savedPtr = permonstTemplate(savedNum);
        let mmflags = NO_MINVENT | MM_NOWAIT | MM_NOCOUNTBIRTH | MM_NOTAIL | MM_NOMSG;
        if (cause === ANIMATE_SPELL) mmflags |= MM_ADJACENTOK;
        mon = await makemon(savedPtr, x, y, mmflags);
        if (mon) {
            const fields = ['mhp', 'mhpmax', 'm_lev', 'mpeaceful', 'mtame',
                'mflee', 'mfleetim', 'mcan', 'mcansee', 'mblinded', 'mstun',
                'mconf', 'msleeping', 'mfrozen', 'mcanmove', 'mtrapped',
                'mundetected', 'm_ap_type', 'mappearance', 'mux', 'muy',
                'mstrategy', 'mtrapseen', 'misc_worn_check', 'weapon_check'];
            for (const key of fields) {
                if (saved[key] !== undefined) mon[key] = saved[key];
            }
            mon.mrevived = 1;
            mon.mavenge = 0;
            mon.mleashed = 0;
            mon.mcanmove = 1;
            mon.msleeping = 0;
            mon.mblinded = 0;
            mon.mstun = 0;
            mon.mconf = 0;
            if ((mon.mhpmax | 0) > 0 && (mon.mhp | 0) <= 0)
                mon.mhp = mon.mhpmax;
        }
    } else {
        const sgend = (statue.spe | 0) & CORPSTAT_GENDER;
        let mmflags = NO_MINVENT | MM_NOMSG
            | (sgend === CORPSTAT_MALE ? MM_MALE : 0)
            | (sgend === CORPSTAT_FEMALE ? MM_FEMALE : 0);
        if ((mnum === PM_DOPPELGANGER && mptr !== permonstTemplate(PM_DOPPELGANGER))
            || ((mptr.msound | 0) === _STAT_MS_GUARDIAN
                && quest_info(_STAT_MS_GUARDIAN) !== mnum)) {
            mmflags |= MM_NOCOUNTBIRTH | MM_ADJACENTOK;
            mon = await makemon(PM_DOPPELGANGER, x, y, mmflags);
            if (mon && ismnum(mon.cham | 0))
                await newcham(mon, mptr, NO_NC_FLAGS);
        } else {
            if (cause === ANIMATE_SPELL)
                mmflags |= MM_ADJACENTOK;
            mon = await makemon(mptr, x, y, mmflags);
        }
    }

    if (!mon) {
        failReason.value = _stat_unique_corpstat(permonstTemplate(statue.corpsenm | 0))
            ? AS_MON_IS_UNIQUE : AS_NO_MON;
        return null;
    }

    if (has_oname(statue) && !_stat_unique_corpstat(mon.data))
        mon = christen_monst(mon, ONAME(statue));
    if (M_AP_TYPE(mon))
        seemimic(mon);
    else
        mon.mundetected = false;
    mon.msleeping = 0;
    if (cause === ANIMATE_NORMAL || cause === ANIMATE_SHATTER) {
        mon.mtame = 0;
        mon.mpeaceful = 0;
        set_malign(mon);
    }

    const comesToLife = !canspotmon(mon) ? 'disappears'
        : golem_xform ? 'turns into flesh'
        : (nonlivingMon(mon.data?.pmidx | 0) || _stat_is_vampshifter(mon)) ? 'moves'
        : 'comes to life';

    if (u_at(x, y) || cause === ANIMATE_SPELL) {
        const shkp = shop_keeper((in_rooms(mon.mx | 0, mon.my | 0, 8 /* SHOPBASE */) || [])[0]);
        const desc = (cause === ANIMATE_SPELL && (mon !== shkp || _stat_carried(statue)))
            ? xname(statue) : 'statue';
        const statuename = _stat_shk_your(statue) + desc;
        void pline(`${_stat_upstart(statuename)} ${comesToLife}!`);
    } else if (_tr_Hallucination()) {
        void pline(`The ${rndmonnam()} suddenly seems more animated.`);
    } else if (cause === ANIMATE_SHATTER) {
        const statuename = cansee(x, y) ? (_stat_shk_your(statue) + xname(statue)) : 'a statue';
        void pline(`Instead of shattering, ${statuename} suddenly ${comesToLife}!`);
    } else {
        void You(`find ${canspotmon(mon) ? x_monnam(mon, ARTICLE_A, null, 0, true) : 'something'} posing as a statue.`);
        if (!canspotmon(mon) && Blind())
            map_invisible(x, y);
        await stop_occupation();
    }

    /* Consequences for the hero: skipped when cause===ANIMATE_NORMAL, which
     * is the only cause dotrap ever passes (C trap.c:867 `cause !=
     * ANIMATE_NORMAL`), so stolen_value (no js/ port exists) is never called
     * from this arm. historic is always false here too (mk_trap_statue always
     * passes CORPSTAT_NONE), so the You_feel/adjalign(-1) branch is likewise
     * structurally dead for dotrap; kept for fidelity against other callers. */
    if (!(game.context && game.context.mon_moving)) {
        if (cause !== ANIMATE_NORMAL) {
            const shkp2 = shop_keeper((in_rooms(x, y, 8 /* SHOPBASE */) || [])[0]);
            if (costly_spot(x, y)
                && (_stat_carried(statue) ? statue.unpaid : !statue.no_charge)
                && shkp2 && mon !== shkp2) {
                /* C: stolen_value(statue, x, y, shkp->mpeaceful, FALSE).
                 * dokick.js now provides the shared synchronous shop ledger
                 * update used by object relocation and kick paths. */
                await stolen_value(statue, x, y, !!shkp2.mpeaceful, false);
            }
        }
        if (historic) {
            void pline('You feel guilty that the historic statue is now gone.');
            adjalign(-1);
        }
    } else if (historic && cansee(x, y)) {
        void pline('You feel regret that the historic statue is now gone.');
    }

    let item;
    while ((item = statue.cobj)) {
        statue.cobj = item.nobj ?? null;
        item.nobj = null;
        item.ocontainer = null;
        item.where = OBJ_FREE;
        await mpickobj(mon, item);
    }
    await m_dowear(mon, true);
    if (statue.owornmask)
        await remove_worn_item(statue, true);
    await _stat_delobj(statue);

    /* C: "avoid hiding under nothing" (Upolyd hero hides_under check,
     * trap.c:896-898) — hides_under/OBJ_AT have no js/ definition anywhere in
     * this repo; draws no RNG and only touches u.uundetected, which none of
     * this arm's captured records observe. Not ported. */

    failReason.value = AS_OK;
    return mon;
}

/* activate_statue_trap — C ref: trap.c:908-936.
 * Exported (2026-09-06, capture-port-doapply wave 105): use_pole's
 * statue-square arm (js/cmd.js, apply.c:3524-3537) needs this to handle an
 * ACTIVE STATUE_TRAP square instead of throwing 'not yet ported' — the body
 * was already a faithful port, it was only unreachable across files. */
export async function activate_statue_trap(trap, x, y, shatter) {
    let mtmp = null;
    let otmp = sobj_at(_STAT_STATUE, x, y);
    const failReason = { value: AS_OK };

    deltrap(trap);
    while (otmp) {
        mtmp = await animate_statue(otmp, x, y,
            shatter ? ANIMATE_SHATTER : ANIMATE_NORMAL, failReason);
        if (mtmp || failReason.value !== AS_MON_IS_UNIQUE)
            break;
        otmp = nxtobj(otmp, _STAT_STATUE, true);
    }

    feel_newsym(x, y);
    return mtmp;
}

/* trapeffect_statue_trap — C ref: trap.c:2279-2288. */
async function trapeffect_statue_trap(mtmp, trap, trflags, isYou) {
    if (isYou) {
        await activate_statue_trap(trap, game.u.ux | 0, game.u.uy | 0, false);
    }
    /* else: monsters don't trigger statue traps */
    return Trap_Effect_Finished;
}

async function trapeffect_selector(mtmp, trap, trflags, isYou) {
    switch (trap.ttyp | 0) {
        case ARROW_TRAP:
            /* C trap.c:2936 → trapeffect_arrow_trap.  The hero branch is the
             * async-screen path; the monster branch (mintrap) goes through
             * trapeffect_selector_mon → missile_trap_mon instead. */
            if (isYou)
                return await trapeffect_arrow_trap(trap, trflags);
            return await missile_trap_mon(mtmp, trap, OTYP_ARROW, 8);
        case DART_TRAP:
            if (isYou)
                return await trapeffect_dart_trap(trap, trflags);
            return await trapeffect_dart_trap_mon(mtmp, trap);
        case ROCKTRAP:
            /* C trap.c:2947 -> trapeffect_rocktrap.  Both halves exist: the
             * monster one has been here since seed0030, the hero one had no arm
             * at all and fell to the no-RNG `default` below. */
            if (isYou)
                return await trapeffect_rocktrap(trap, trflags);
            return await trapeffect_rocktrap_mon(mtmp, trap);
        case SQKY_BOARD:
            /* C trap.c:2949 -> trapeffect_sqky_board.  Hero branch only; the
             * monster branch is js/monmove.js:2241-2300, which carries its own
             * in-line copy of the squeak (see the note there) and reaches
             * mintrap by a different road. */
            if (isYou)
                return await trapeffect_sqky_board(trap, trflags);
            return Trap_Effect_Finished;
        case BEAR_TRAP:
            if (isYou)
                return await trapeffect_bear_trap(trap, trflags);
            return await trapeffect_bear_trap_mon(mtmp, trap, trflags);
        case TELEP_TRAP:
            return await trapeffect_telep_trap(mtmp, trap, trflags, isYou);
        case LEVEL_TELEP:
            /* C trap.c:2966 -> trapeffect_level_telep.  This selector had NO
             * case at all, so a hero stepping on a level teleport trap fell
             * to the no-RNG `default` below — it neither removed the trap
             * (traps.count stayed put where C's level_tele_trap deltraps it
             * unconditionally, once past the Antimagic/endgame guard) nor
             * moved the hero.  The monster half (mlevel_tele_trap) is
             * imported above and already wired for mintrap's own dispatcher;
             * dotrap's isYou is hard-coded true so this selector's mtmp arm
             * is unreached, same convention as RUST_TRAP above. */
            return await trapeffect_level_telep(mtmp, trap, trflags, isYou);
        case MAGIC_TRAP:
            return await trapeffect_magic_trap(mtmp, trap, trflags, isYou);
        case ANTI_MAGIC:
            if (isYou)
                return await trapeffect_anti_magic_u(trap);
            return await trapeffect_anti_magic_mon(mtmp, trap);
        case SLP_GAS_TRAP:
            if (isYou)
                return await trapeffect_slp_gas_trap(trap, trflags);
            return await trapeffect_slp_gas_trap_mon(mtmp, trap);
        case RUST_TRAP:
            /* C trap.c:2955-2956 -> trapeffect_rust_trap(mtmp, trap, trflags).
             * BOTH halves are wired now.  The note that stood here ("the monster
             * branch stays on the default arm") was written when only the hero
             * half existed; the monster half is trapeffect_rust_trap_mon below.
             * This selector's non-isYou branch is DEAD (its one caller,
             * js/trap.js dotrap, hard-codes isYou=true and the monster path goes
             * through mintrap -> trapeffect_selector_mon) and is routed anyway so
             * the two dispatchers cannot drift apart again. */
            if (isYou)
                return await trapeffect_rust_trap(trap, trflags);
            return await trapeffect_rust_trap_mon(mtmp, trap, trflags);
        case PIT:
        case SPIKED_PIT:
            /* C trap.c:2959-2961 -> trapeffect_pit for both pit types.  Same
             * asymmetry as ROCKTRAP above: trapeffect_pit_mon was ported, the
             * hero half was not. */
            if (isYou)
                return await trapeffect_pit(trap, trflags);
            return await trapeffect_pit_mon(mtmp, trap);
        case HOLE:
        case TRAPDOOR:
            /* C trap.c:2962-2964 — the hero arm falls through immediately;
             * the monster arm is handled by trapeffect_selector_mon below.
             * This dispatch was missing even though fall_through() itself is
             * fully ported, so hero holes silently did nothing. */
            if (isYou) {
                await fall_through(true, trflags & _TOOKPLUNGE_T);
                return Trap_Effect_Finished;
            }
            return await trapeffect_hole_mon(mtmp, trap, trflags);
        case WEB:
            if (isYou)
                return await trapeffect_web(trap, trflags);
            return trapeffect_web_mon(mtmp, trap, trflags);
        case ROLLING_BOULDER_TRAP:
            /* C trap.c:2971 -> trapeffect_rolling_boulder_trap.  Hero branch
             * only; the monster branch stays on the default arm (same choice
             * RUST_TRAP above makes). */
            if (isYou)
                return await trapeffect_rolling_boulder_trap(trap, trflags);
            return Trap_Effect_Finished;
        case FIRE_TRAP:
            /* C trap.c:2957 -> trapeffect_fire_trap.  Both halves are wired
             * now: this selector had NO arm at all, so a hero fire trap fell
             * to the no-RNG `default` below (see trapeffect_fire_trap's
             * header comment for the measured residual). */
            if (isYou)
                return await trapeffect_fire_trap(trap, trflags);
            return await trapeffect_fire_trap_mon(mtmp, trap);
        case STATUE_TRAP:
            /* C trap.c:2974 -> trapeffect_statue_trap.  Monsters never
             * trigger statue traps (trap.c:2287 comment); the isYou check
             * inside trapeffect_statue_trap mirrors C's own
             * `mtmp == &gy.youmonst` test. */
            return await trapeffect_statue_trap(mtmp, trap, trflags, isYou);
        case MAGIC_PORTAL:
            /* C trap.c:2968 -> trapeffect_magic_portal.  The body was INLINED
             * here while every sibling arm delegates to a named trapeffect_*;
             * it is a `staticfn` of its own in C (trap.c:2710) and is one
             * here now. */
            return await trapeffect_magic_portal(mtmp, trap, trflags, isYou);
        default:
            /* Unported trap types: no RNG, no effect yet. */
            return Trap_Effect_Finished;
    }
}

/* C ref: trap.c:2323-2398 trapeffect_anti_magic — hero branch. */
async function trapeffect_anti_magic_u(trap) {
    const u = game.u || {};
    seetrap(trap);
    if (_tr_antimagic_u()) {
        let dmg = rnd(4);
        if (u.uwep && (u.uwep.oartifact | 0) === ART_MAGICBANE_TAM)
            dmg += rnd(4);
        if (_tr_Passes_walls())
            dmg = Math.trunc((dmg + 3) / 4);
        const hp = u.umonnum != null && (u.mh | 0) > 0 ? (u.mh | 0) : (u.uhp | 0);
        await You(dmg >= hp ? 'feel unbearably torpid!' : dmg >= Math.trunc(hp / 4)
            ? 'feel very lethargic.' : 'feel sluggish.');
        await losehp(dmg, 'anti-magic implosion', KILLED_BY_AN);
    }
    let drain = d(2, 6);
    const halfd = rnd(Math.max(1, Math.trunc(drain / 2)));
    if ((u.uenmax | 0) > drain) {
        u.uenmax = (u.uenmax | 0) - halfd;
        drain -= halfd;
        await drain_en(drain, true);
    } else {
        await drain_en(drain, false);
    }
    return Trap_Effect_Finished;
}

/* C ref: trap.c:2709-2722 — staticfn int trapeffect_magic_portal(struct monst
 * *mtmp, struct trap *trap, unsigned int trflags), verbatim:
 *
 *     if (mtmp == &gy.youmonst) {
 *         feeltrap(trap);
 *         domagicportal(trap);
 *     } else {
 *         return trapeffect_level_telep(mtmp, trap, trflags);
 *     }
 *     return Trap_Effect_Finished;
 *
 * This selector arm had NO body at all before it was inlined, so a hero
 * stepping onto a magic portal got no message and no level change (seed244908
 * step 110: C's topline joins "You activated a magic portal!--More--" onto the
 * prior line; JS printed nothing because the whole effect never ran).
 * domagicportal is void in C, so the fallthrough to Trap_Effect_Finished on
 * the hero branch is C's own control flow, not a shortcut.
 *
 * trapeffect_level_telep is `async` in this port (js/trap.js:4233), which is
 * why the monster branch is awaited; the inlined call site was the only
 * un-awaited call in the whole selector switch and would have returned a
 * pending Promise to a caller that compares it against Trap_Effect_Finished. */
async function trapeffect_magic_portal(mtmp, trap, trflags, isYou) {
    if (isYou) {
        feeltrap(trap);
        await domagicportal(trap);
    } else {
        return await trapeffect_level_telep(mtmp, trap, trflags, isYou);
    }
    return Trap_Effect_Finished;
}
/* C ref: trap.c:1596 trapeffect_rust_trap — HERO branch (mtmp == &gy.youmonst).
 *
 * The hero body verbatim (trap.c:1604-1656):
 *     seetrap(trap);
 *     switch (rn2(5)) {
 *     case 0: pline("%s you on the %s!", A_gush..., body_part(HEAD));
 *             water_damage(uarmh, helm_simple_name(uarmh), TRUE); break;
 *     case 1: pline("%s your left %s!", A_gush..., body_part(ARM));
 *             if (water_damage(uarms, "shield", TRUE) != ER_NOTHING) break;
 *             if (u.twoweap || (uwep && bimanual(uwep)))
 *                 water_damage(u.twoweap ? uswapwep : uwep, 0, TRUE);
 *  uglovecheck: water_damage(uarmg, gloves_simple_name(uarmg), TRUE); break;
 *     case 2: pline("%s your right %s!", A_gush..., body_part(ARM));
 *             water_damage(uwep, 0, TRUE); goto uglovecheck;
 *     default: pline("%s you!", A_gush...);
 *             <splash_lit over gi.invent, excluding uwep/uswapwep>
 *             if (uarmc)      water_damage(uarmc, cloak_simple_name(uarmc), TRUE);
 *             else if (uarm)  water_damage(uarm,  suit_simple_name(uarm),  TRUE);
 *             else if (uarmu) water_damage(uarmu, "shirt", TRUE);
 *     }
 *     update_inventory();
 *     if (u.umonnum == PM_IRON_GOLEM) { ... losehp ... }
 *     else if (u.umonnum == PM_GREMLIN && rn2(3)) split_mon(&gy.youmonst, NULL);
 *
 * Why this was worth porting: RUST_TRAP fell through trapeffect_selector's
 * default arm, so the whole body -- INCLUDING its leading rn2(5) -- drew
 * nothing.  seed0398 step 45 is the hero walking east onto a rust trap; C spends
 * 12 leaves there and JS spent 11.  Every RNG oracle called that "aligned to
 * leaf 2839" because C's NEXT leaf after the missing rn2(5) is distfleeck's own
 * rn2(5), which returned the same value -- the one-leaf hole was invisible on
 * value comparison and only showed up as a 42-step render run starting with a
 * blank topline where C says "A gush of water hits you!".
 *
 * MONSTER branch (trap.c:1657-1720) is deliberately NOT wired: it needs
 * which_armor/mbodypart/completelyrusts/monkilled/split_mon, none of which this
 * session exercises, and a half-built monster arm would draw its rn2(5) into a
 * stream nothing else in it matches.  It stays on the selector's default arm,
 * which is what it did before this commit. */
const A_gush_of_water_hits = "A gush of water hits";
/* C polyself.c PM_IRON_GOLEM / PM_GREMLIN — verified via tools/c-const-oracle.mjs. */
const _RT_PM_IRON_GOLEM = 259, _RT_PM_GREMLIN = 40;
/* objects.h AMULET_OF_LIFE_SAVING — otyp 202 (js/oc_name_data.js OC_NAME[202]
 * is "amulet of life saving"; js/end.js:82 and js/monmove.js:986 both pin the
 * same 202).  objects.h is an X-macro file with no greppable #define, so the
 * index comes off the generated name table, never a guess. */
const _RT_AMULET_OF_LIFE_SAVING = 202;
/* const.js:2353 HALF_PHDAM, const.js:332 KILLED_BY — const.js is authoritative
 * for values; local copies keep trap.js's already-huge const import intact. */
const HALF_PHDAM = 56, _RT_KILLED_BY = 1;
async function trapeffect_rust_trap(trap, trflags) {
    void trflags;
    const g = game, u = g.u;
    seetrap(trap);

    /* Unlike monsters, traps cannot aim their rust attacks at you, so instead
       of looping through and taking either the first rustable one or the body,
       we take whatever we get, even if it is not rustable. */
    switch (rn2(5)) {
    case 0:
        await pline(`${A_gush_of_water_hits} you on the ${body_part(HEAD)}!`);
        (await water_damage(u.uarmh || null, helm_simple_name(u.uarmh || null), true));
        break;
    case 1: {
        await pline(`${A_gush_of_water_hits} your left ${body_part(ARM)}!`);
        if ((await water_damage(u.uarms || null, "shield", true)) !== ER_NOTHING)
            break;
        if ((u.twoweap | 0) || (u.uwep && bimanual(u.uwep)))
            (await water_damage((u.twoweap | 0) ? (u.uswapwep || null) : (u.uwep || null), null, true));
        /* uglovecheck: */
        (await water_damage(u.uarmg || null, gloves_simple_name(u.uarmg || null), true));
        break;
    }
    case 2:
        await pline(`${A_gush_of_water_hits} your right ${body_part(ARM)}!`);
        (await water_damage(u.uwep || null, null, true));
        /* goto uglovecheck */
        (await water_damage(u.uarmg || null, gloves_simple_name(u.uarmg || null), true));
        break;
    default:
        await pline(`${A_gush_of_water_hits} you!`);
        /* note: exclude primary and secondary weapons from splashing because
           cases 1 and 2 target them [via water_damage()] */
        for (let otmp = g.invent, nextobj = null; otmp; otmp = nextobj) {
            nextobj = otmp.nobj;
            if (otmp.lamplit && otmp !== u.uwep
                && (otmp !== u.uswapwep || !(u.twoweap | 0)))
                splash_lit_rt(otmp);
        }
        if (u.uarmc)
            (await water_damage(u.uarmc, cloak_simple_name(u.uarmc), true));
        else if (u.uarm)
            (await water_damage(u.uarm, suit_simple_name(u.uarm), true));
        else if (u.uarmu)
            (await water_damage(u.uarmu, "shirt", true));
        break;
    }
    update_inventory();

    if ((u.umonnum | 0) === _RT_PM_IRON_GOLEM) {
        const dam = u.mhmax | 0;
        await You("are covered with rust!");
        await losehp(_rt_Maybe_Half_Phys(dam), "rusting away", _RT_KILLED_BY);
    } else if ((u.umonnum | 0) === _RT_PM_GREMLIN && rn2(3)) {
        split_mon_rt(game.youmonst, null);
    }
    return Trap_Effect_Finished;
}
/* C hack.h Maybe_Half_Phys(dmg) = Half_physical_damage ? (dmg+1)/2 : dmg,
 * over the HALF_PHDAM uprop (const.js:2353) — the same formula js/cmd.js:4336
 * uses.  Only reachable as an IRON GOLEM hero. */
function _rt_Maybe_Half_Phys(dmg) {
    return uprop_active(HALF_PHDAM) ? Math.trunc((dmg + 1) / 2) : dmg;
}
/* C ref: trap.c:4692 splash_lit — douses a lit light source.  KNOWN GAP, not ported
 * anywhere in js/; only reachable with a lit lamp/candle in open inventory,
 * which no corpus session carries into a rust trap.  Left as an explicit no-op
 * so the loop above stays structurally C-shaped. */
function splash_lit_rt(otmp) { void otmp; }
/* C potion.c:2875 split_mon().  The rust-trap hero arm reaches this only for
 * a gremlin, but keeping the monster form here also makes the helper useful
 * to the other already-ported trap callers.  clone_mon() itself is not yet a
 * shared JS export, so this is its state-preserving core: choose an adjacent
 * square with the canonical shuffled direction helper, copy the monster
 * condition, split current HP (the parent retains the odd point), and leave
 * inventory/special attachments behind. */
export function split_mon_rt(mon, mtmp) {
    if (!mon || (mon.mhp | 0) <= 1)
        return null;
    const mndx = (mon.data?.pmidx ?? mon.mndx ?? mon.mnum ?? -1) | 0;
    if (mndx < 0 || ((game.mvitals?.[mndx]?.mvflags | 0) & G_EXTINCT_T) !== 0)
        return null;

    const at = { x: mon.mx | 0, y: mon.my | 0 };
    /* clone_mon(mon, 0, 0) always starts at the parent's square, then calls
     * enexto(); rnd_nextto_goodpos has the same C direction shuffle/order. */
    const xp = { value: at.x }, yp = { value: at.y };
    if (!rnd_nextto_goodpos(xp, yp, mon))
        return null;
    at.x = xp.value; at.y = yp.value;
    const half = Math.trunc((mon.mhp | 0) / 2);
    const clone = { ...mon,
        mx: at.x, my: at.y, m_id: _split_next_ident(),
        mhp: half, mhpmax: mon.mhpmax | 0,
        mcloned: 1, mtrapped: 0, minvent: null, nmon: game.fmon,
        mleashed: 0, isshk: 0, isgd: 0, ispriest: 0,
        /* C clone_mon() calls mon_track_clear() after copying the parent;
         * the clone must not inherit the parent's recent-square avoidance. */
        mtrack: [ { x: 0, y: 0 }, { x: 0, y: 0 },
                  { x: 0, y: 0 }, { x: 0, y: 0 } ],
    };
    mon.mhp = (mon.mhp | 0) - half;
    game.fmon = clone;
    if (mtmp) {
        const source = mtmp === game.youmonst ? 'your' : s_suffix(mon_nam(mtmp));
        void source; /* reason is emitted below, matching C's optional suffix. */
    }
    const reason = mtmp
        ? ` from ${mtmp === game.youmonst ? 'your' : `${s_suffix(mon_nam(mtmp))}`} heat`
        : '';
    if (mon === game.youmonst)
        void You(`multiply${reason}!`);
    else if (canspotmon(mon))
        void pline(`${Monnam(mon)} multiplies${reason}!`);
    return clone;
}

/* C mkobj.c:509 next_ident(); kept local to avoid opening mklev<->trap's
 * existing runtime cycle. */
function _split_next_ident() {
    if (!game.context)
        game.context = {};
    if (game.context.ident == null)
        game.context.ident = 2;
    const id = game.context.ident;
    game.context.ident += rnd(2);
    if (!game.context.ident)
        game.context.ident = rnd(2) + 1;
    return id;
}

/* C ref: trap.c:1596 trapeffect_rust_trap — MONSTER branch (trap.c:1655-1720),
 * the `else` half of the same C function whose hero half sits above.
 *
 * The note above this pair used to read "MONSTER branch is deliberately NOT
 * wired ... none of which this session exercises".  That was true of seed0398
 * and is false of the corpus: `trapeffect_rust_trap(trap.c:1663)` — the MONSTER
 * switch, distinct from the hero switch at trap.c:1610 — is drawn on 9 occasions
 * across 8 of the 688 train sessions, and on ZERO public ones, which is exactly
 * why nobody saw it.  [[our-own-landings-manufacture-stale-premises]]: the
 * comment was accurate about the session it was written for and became a
 * standing claim about the corpus.
 *
 * WHY THE ABSENCE WAS INVISIBLE ON THE RNG AXIS.  With no `case RUST_TRAP` in
 * trapeffect_selector_mon the monster fell to `default: return
 * Trap_Effect_Finished` and drew nothing, so JS's NEXT draw — distfleeck's own
 * unconditional rn2(5) at js/monmove.js — landed on the stream position C spent
 * on trap.c:1663.  Same call, same modulus, and (necessarily, since it is the
 * same stream position) the same VALUE.  The hole is therefore invisible to any
 * value comparison and only surfaces TWO leaves later, as
 * `C rn2(5) @distfleeck(monmove.c:538)` against whatever JS reached next.
 * Measured, on the three sessions whose FIRST miss this is:
 *     gen345  trap event leaf 10777 (rn2(5)=0)  first divergence 10779
 *     gen300  trap event leaf  2791 (rn2(5)=4)  first divergence  2793
 *     gen522  trap event leaf  2721 (rn2(5)=4)  first divergence  2723
 * On the RENDER axis it is not subtle at all: C paints the gush topline and this
 * port painted an empty row 0 —
 *     gen345 step 107  "A gush of water hits the frost giant on the head!"  (case 0)
 *     gen300 step  26  "A gush of water hits the saddled pony!"             (default)
 *     gen522 step  16  "A gush of water hits the newt!"                     (default)
 * and the arm C's recorded rn2(5) selects agrees with the recorded text in all
 * three, which is what pins the port to the right switch rather than to a
 * plausible one.
 *
 * DRAW BUDGET, censused over the whole train corpus rather than reasoned about:
 * all 9 monster rust events draw EXACTLY ONE leaf (the rn2(5)), with the next
 * recorded leaf always back in monmove/dochug.  So no water_damage() target in
 * the corpus is non-NULL, no monster completelyrusts, and no gremlin steps on a
 * rust trap.  The bodies below are ported anyway (C is the truth), but their
 * gaps are named rather than guessed at.
 *
 * SYNCHRONOUS, like every other *_mon arm here: mintrap and m_move are sync, so
 * this uses the file's `void pline(...)` form.  C's pline_mon() is pline() plus
 * an a11y message-location hint (pline.c:138) — no terminal difference. */
async function trapeffect_rust_trap_mon(mtmp, trap, trflags) {
    void trflags;
    /* C trap.c:1656-1660 */
    const in_sight = canseemon(mtmp) || (mtmp === (game.u ? game.u.usteed : null));
    let trapkilled = false;
    const mptr = mtmp.data;
    let target;

    /* C trap.c:1661-1662 — seetrap() carries a newsym(tx,ty); a bare tseen
     * write drops the trap glyph (the same note trapeffect_dart_trap_mon and
     * trapeffect_rocktrap_mon carry). */
    if (in_sight)
        seetrap(trap);
    switch (rn2(5)) {                                   /* C trap.c:1663 */
    case 0:
        if (in_sight)
            void pline(`${A_gush_of_water_hits} ${mon_nam(mtmp)}`
                       + ` on the ${mbodypart(mtmp, HEAD)}!`);   /* C :1665-1668 */
        target = which_armor(mtmp, W_ARMH);
        (await water_damage(target, helm_simple_name(target), true));
        break;
    case 1: {
        if (in_sight)
            void pline(`${A_gush_of_water_hits} ${mon_nam(mtmp)}'s`
                       + ` left ${mbodypart(mtmp, ARM)}!`);      /* C :1674-1677 */
        target = which_armor(mtmp, W_ARMS);
        if ((await water_damage(target, "shield", true)) !== ER_NOTHING)
            break;
        target = _rt_MON_WEP(mtmp);
        if (target && bimanual(target))
            (await water_damage(target, null, true));
        /* mglovecheck: */
        target = which_armor(mtmp, W_ARMG);
        (await water_damage(target, gloves_simple_name(target), true));
        break;
    }
    case 2:
        if (in_sight)
            void pline(`${A_gush_of_water_hits} ${mon_nam(mtmp)}'s`
                       + ` right ${mbodypart(mtmp, ARM)}!`);     /* C :1684-1687 */
        (await water_damage(_rt_MON_WEP(mtmp), null, true));
        /* goto mglovecheck */
        target = which_armor(mtmp, W_ARMG);
        (await water_damage(target, gloves_simple_name(target), true));
        break;
    default:
        if (in_sight)
            void pline(`${A_gush_of_water_hits} ${mon_nam(mtmp)}!`); /* C :1694 */
        /* C trap.c:1695-1699 — douse the monster's lit light sources, excluding
         * its wielded/alternate weapon because cases 1 and 2 handle those. */
        for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj)
            if (otmp.lamplit && ((otmp.owornmask | 0) & (W_WEP | W_SWAPWEP)) === 0)
                splash_lit_rt(otmp);
        if ((target = which_armor(mtmp, W_ARMC)))
            (await water_damage(target, cloak_simple_name(target), true));
        else if ((target = which_armor(mtmp, W_ARM)))
            (await water_damage(target, suit_simple_name(target), true));
        else if ((target = which_armor(mtmp, W_ARMU)))
            (await water_damage(target, "shirt", true));
        break;
    }

    /* C trap.c:1713-1719.  completelyrusts(ptr) is mondata.h:227
     * `((ptr) == &mons[PM_IRON_GOLEM])`. */
    if (mptr && (mptr.pmidx | 0) === PM_IRON_GOLEM) {
        if (in_sight)
            void pline(`${Monnam_t(mtmp)} `
                       + `${!_rt_mlifesaver(mtmp) ? 'falls' : 'starts to fall'} to pieces!`);
        /* C: monkilled(mtmp, (const char *) 0, AD_RUST).  A NULL fltxt means C
         * prints NO "<Monnam> is killed!" line — the pline above is the whole
         * message — and AD_RUST is not one of the disintegrating hows, so the
         * corpse roll is the ordinary one monkilled_trap already models. */
        await monkilled_trap(mtmp, null);
        if ((mtmp.mhp | 0) < 1)              /* C monst.h:214 DEADMONSTER */
            trapkilled = true;
    } else if (mptr && (mptr.pmidx | 0) === PM_GREMLIN && rn2(3)) {
        /* NAMED GAP, and the RNG half of it is NOT a gap: C's rn2(3) is drawn
         * above, in C's order, because it is the leaf that would move the stream.
         * split_mon (polyself.c) is unported everywhere in js/ — js/potion.js:3186
         * is a throwing stub — and throwing HERE would halt a session that
         * currently survives, which is strictly worse than the pre-existing
         * behaviour (see the identical decision in trapeffect_landmine_mon's
         * detonation arm).  No corpus session walks a gremlin onto a rust trap. */
        void 0;
    }

    /* C trap.c:1718-1719 */
    return trapkilled ? Trap_Killed_Mon
        : ((mtmp.mtrapped | 0) ? Trap_Caught_Mon : Trap_Effect_Finished);
}
/* C monst.h:208 MON_WEP(mon) == mon->mw.  js/makemon.js's template does not
 * source `mw`, so the wielded weapon is found by walking minvent for W_WEP —
 * the same local convention this file already uses twice (js/trap.js MON_WEP
 * inside m_dowear and inside the petrification helper). */
function _rt_MON_WEP(m) {
    for (let o = m && m.minvent; o; o = o.nobj)
        if (((o.owornmask | 0) & W_WEP) !== 0)
            return o;
    return null;
}
/* C mon.c:2827 mlifesaver(mon) — the worn amulet of life saving that will save
 * this monster.  RNG-free; only read for the "falls"/"starts to fall" wording. */
function _rt_mlifesaver(mon) {
    /* C: if (!nonliving(mon->data) || is_vampshifter(mon)) — is_vampshifter is
     * not ported in this file, and it only WIDENS the set, so a nonliving
     * non-vampshifter is the one case this can get wrong; it cannot fire here
     * anyway (the caller is an iron golem, which IS nonliving, and an iron golem
     * carries no amulet in any corpus session). */
    if (_mk_nonliving(mon))
        return null;
    const otmp = which_armor(mon, W_AMUL);
    return (otmp && (otmp.otyp | 0) === _RT_AMULET_OF_LIFE_SAVING) ? otmp : null;
}
/* C ref: trap.c:1561 trapeffect_slp_gas_trap — HERO branch (mtmp == &youmonst). */
/* C nethack-c/include/monst.h:80 — M_SEEN_SLEEP = 0x0008 (enum
 * m_seen_resistance, monst.h:75-86).  Was 2, which is really M_SEEN_FIRE
 * (monst.h:78); the "from C monattk.h" attribution was also wrong — the enum
 * lives in monst.h, not monattk.h. */
const M_SEEN_SLEEP = 0x0008;
/* C mondata.c:1557-1582 — update visible monsters' remembered resistances. */
function _monstseesu_stub(x) { return monstseesu_real(x); }
function _monstunseesu_stub(x) { return monstunseesu_real(x); }
async function trapeffect_slp_gas_trap(trap, trflags) {
    void trflags;
    /* C trap.c trapeffect_slp_gas_trap: `seetrap(trap);` is the FIRST statement.
     * seetrap (trap.c:3567) is `if (!tseen) { tseen = 1; newsym(tx, ty); }` — a
     * bare tseen write drops the newsym, so the trap glyph never appears. */
    seetrap(trap);
    const u = game.u;
    const youdata = game.youmonst ? game.youmonst.data : null;
    if (uprop_active(SLEEP_RES) || (youdata && _imm_breathless(youdata))) {
        await You("are enveloped in a cloud of gas!");
        _monstseesu_stub(M_SEEN_SLEEP);
    } else {
        await pline("A cloud of gas puts you to sleep!");
        /* C trap.c:1574 — fall_asleep(-rnd(25), TRUE).
         * This was a bare nomul(-rnd(25)), which set the multi<0 countdown but
         * NOT u.usleep.  fall_asleep (timeout.c:950) also sets
         * u.usleep = svm.moves, and u.usleep is what unconscious()
         * (trap.c:6756) reads, hence what makes Unaware (youprop.h:399) true.
         * Without it gethungry() skipped its Unaware-only rn2(10)
         * (eat.c:3174) on every slept turn. */
        await fall_asleep(-rnd(25), true);
        _monstunseesu_stub(M_SEEN_SLEEP);
    }
    steedintrap(trap, null);
    return Trap_Effect_Finished;
}
/* C ref: trap.c:1561 trapeffect_slp_gas_trap — monster branch. */
async function trapeffect_slp_gas_trap_mon(mtmp, trap) {
    const in_sight = canseemon(mtmp) || (mtmp === (game.u ? game.u.usteed : null));
    /* !resists_sleep(mtmp) && !breathless(mtmp->data) && !helpless(mtmp) */
    if (!Resists_Elem(mtmp, SLEEP_RES) && !_imm_breathless(mtmp.data)
        && !(mtmp.msleep || mtmp.mfroz || mtmp.mstun || mtmp.mconf
             || mtmp.mblinded || !mtmp.mcanmove || mtmp.mtame
             || mtmp.mcan || mtmp.msloth)) {
        if (await sleep_monst(mtmp, rnd(25), -1) && in_sight) {
            pline(`${Monnam_t(mtmp)} suddenly falls asleep!`);
            /* C: seetrap(trap) — carries newsym(tx,ty), not just the flag. */
            seetrap(trap);
        }
    }
    return Trap_Effect_Finished;
}
/* C ref: trap.c:1223 trapeffect_arrow_trap — HERO branch (mtmp == &youmonst).
 *   if (trap->once && trap->tseen && !rn2(15)) { soft click; deltrap; return; }
 *   trap->once = 1; seetrap(trap);
 *   pline("An arrow shoots out at you!");
 *   otmp = t_missile(ARROW, trap);   // full mksobj creation RNG
 *   if (thitu(8, dmgval(otmp,&youmonst), &otmp, "arrow")) { ...obfree... }
 *   else { place_object; observe; stackobj; }
 * No poison check (that is the dart trap only). */
async function trapeffect_arrow_trap(trap, trflags) {
    if (ENV.FF_TRAP_TRACE === '1')
        pushRngLogEntry(`^arrow_trap_hero[x=${game.u?.ux|0},y=${game.u?.uy|0} trap=${trap?.tx|0},${trap?.ty|0}]`);
    void trflags;
    if ((trap.once | 0) && trap.tseen && !rn2(15)) {
        /* C: You_hear("a soft click."); deltrap(trap). */
        await pline('You hear a soft click.');
        deltrap(trap);
        newsym(game.u.ux | 0, game.u.uy | 0);
        return Trap_Is_Gone;
    }
    trap.once = 1;
    /* C trap.c:1231 `seetrap(trap);` — before the pline, and it newsyms. */
    seetrap(trap);
    await pline('An arrow shoots out at you!');
    const otmp = await t_missile(OTYP_ARROW, trap);
    const dmg = missile_dmgval(OTYP_ARROW, otmp.spe | 0, game.u);
    const hit = await thitu(8, dmg, otmp, 'arrow');
    if (!hit) await hero_missile_lands(otmp);
    return Trap_Effect_Finished;
}
/* C ref: trap.c:1250 trapeffect_dart_trap — HERO branch (mtmp == &youmonst).
 *   if (trap->once && trap->tseen && !rn2(15)) { soft click; deltrap; return; }
 *   trap->once = 1; seetrap(trap);
 *   pline("A little dart shoots out at you!");
 *   otmp = t_missile(DART, trap);            // full mksobj creation RNG
 *   if (!rn2(6)) otmp->opoisoned = 1;        // trap.c:1272 poison check
 *   if (u.usteed && !rn2(2) && steedintrap(...)) ;  // no usteed in corpus
 *   else if (thitu(7, dmgval(otmp,&youmonst), &otmp, "little dart")) {
 *       if (otmp) { if poisoned -> poisoned(); obfree(otmp); }
 *   } else { place_object; observe; stackobj; }
 * RNG order matched to seed0002 step 47: mksobj(DART) → rn2(6) → dmgval rnd(3)
 * → thitu rnd(20) [→ exercise rn2(2) on hit]. */
async function trapeffect_dart_trap(trap, trflags) {
    void trflags;
    if ((trap.once | 0) && trap.tseen && !rn2(15)) {
        /* C trap.c:1262 — the spent dart trap announces its silent click
         * before disappearing.  This is a real pline, so it must consume the
         * recorded dismissal/message frame even though it uses no RNG. */
        await pline('You hear a soft click.');
        deltrap(trap);
        newsym(game.u.ux | 0, game.u.uy | 0);
        return Trap_Is_Gone;
    }
    trap.once = 1;
    /* C trap.c:1258 `seetrap(trap);` — before the pline, and it newsyms. */
    seetrap(trap);
    await pline('A little dart shoots out at you!');
    const otmp = await t_missile(OTYP_DART, trap);
    if (!rn2(6)) otmp.opoisoned = 1; /* C trap.c:1272 */
    /* C trap.c:1274: u.usteed && rn2(2) && steedintrap — no usteed in corpus,
     * the && short-circuits on !u.usteed, so rn2(2) does NOT fire here. */
    const oldumort = game.u.umortality | 0;
    const dmg = missile_dmgval(OTYP_DART, otmp.spe | 0, game.u);
    const hit = await thitu(7, dmg, otmp, 'little dart');
    if (hit) {
        /* C: poisoned(...) only fires when otmp->opoisoned; obfree(otmp). */
        if (otmp.opoisoned) {
            await poisoned('dart', A_CON, 'little dart',
                (game.u.umortality > oldumort) ? 0 : 10, true);
        }
        otmp.where = OBJ_DELETED_T; /* obfree(otmp) — missile consumed on a hit */
    } else {
        await hero_missile_lands(otmp);
    }
    return Trap_Effect_Finished;
}
/* Shared tail for a trap missile that MISSED the hero: place it on the hero's
 * tile, observe it (no RNG; observe_object is display-only), stack it. */
async function hero_missile_lands(otmp) {
    const place_object = _trapFns.place_object_fn;
    const ux = game.u.ux | 0, uy = game.u.uy | 0;
    otmp.ox = ux; otmp.oy = uy;
    if (place_object) place_object(otmp, ux, uy);
    /* observe_object(otmp) when !Blind — display-only, no RNG. */
    await stackobj(otmp);
    newsym(ux, uy);
}
/* C ref: trap.c:2104 trapeffect_web — HERO branch. */
const _S_GIANT_WEB = 34;
const _S_DRAGON_WEB = 30; /* C defsym.h:329 MONSYM(30, 'D', DRAGON, S_DRAGON)
                           * (was 31, which is S_ELEMENTAL) */
const _M2_NASTY_WEB = 0x02000000;
const _M2_STRONG_WEB = 0x04000000;
/* mondata.h predicates needed only by mu_maybe_destroy_web, scoped locally
 * to avoid colliding with other files' (sometimes stale) copies. Verified
 * against nethack-c-v5/upstream/include/monflag.h + defsym.h directly:
 *   M1_AMORPHOUS 0x00000004, M1_UNSOLID 0x00100000, M1_ACID 0x08000000
 *   S_VORTEX = 22 (defsym.h:320 MONSYM(22,'v',VORTEX,S_VORTEX,"vortex")) */
const _MDW_M1_AMORPHOUS = 0x00000004;
const _MDW_M1_UNSOLID = 0x00100000;
const _MDW_M1_ACID = 0x08000000;
const _MDW_S_VORTEX = 22;
function _mdw_amorphous(mptr) { return ((mptr?.mflags1 | 0) & _MDW_M1_AMORPHOUS) !== 0; }
function _mdw_unsolid(mptr) { return ((mptr?.mflags1 | 0) & _MDW_M1_UNSOLID) !== 0; }
function _mdw_acidic(mptr) { return ((mptr?.mflags1 | 0) & _MDW_M1_ACID) !== 0; }
/* C mondata.h:57 is_whirly(ptr) = mlet==S_VORTEX || ptr==&mons[PM_AIR_ELEMENTAL] */
function _mdw_is_whirly(mptr) {
    return (mptr?.mlet | 0) === _MDW_S_VORTEX || (mptr?.pmidx | 0) === PM_AIR_ELEMENTAL;
}
/* C mondata.h:59 flaming(ptr) = one of these four exact species */
function _mdw_flaming(mptr) {
    const pm = mptr?.pmidx | 0;
    return pm === PM_FIRE_VORTEX || pm === PM_FLAMING_SPHERE
        || pm === PM_FIRE_ELEMENTAL || pm === PM_SALAMANDER;
}
/* C ref: trap.c:972 mu_maybe_destroy_web(mtmp, domsg, trap) — monster or hero
 * goes through and possibly destroys a web; returns TRUE if it could pass
 * through (never gets trapped) without needing an rn2/rnd draw at all — the
 * whole check is species-flag-based. Called from both the hero branch of
 * trapeffect_web (mtmp===game.youmonst) and the monster branch. */
function _mu_maybe_destroy_web(mtmp, domsg, trap) {
    const isyou = mtmp === game.youmonst;
    const mptr = mtmp ? mtmp.data : null;
    if (!mptr) return false;

    if (_mdw_amorphous(mptr) || _mdw_is_whirly(mptr) || _mdw_flaming(mptr)
        || _mdw_unsolid(mptr) || (mptr.pmidx | 0) === PM_GELATINOUS_CUBE) {
        const x = trap.tx, y = trap.ty;

        if (_mdw_flaming(mptr) || _mdw_acidic(mptr)) {
            if (domsg) {
                if (isyou)
                    You((_mdw_flaming(mptr) ? "burn " : "dissolve ")
                        + (trap.madeby_u ? "your" : "a") + " spider web!");
                else
                    pline(_monnam_safe(mtmp) + " "
                        + (_mdw_flaming(mptr) ? "burns" : "dissolves") + " "
                        + (trap.madeby_u ? "your" : "a") + " spider web!");
            }
            deltrap(trap);
            newsym(x, y);
            return true;
        }
        if (domsg) {
            if (isyou) {
                You("flow through " + (trap.madeby_u ? "your" : "a") + " spider web.");
            } else {
                pline(_monnam_safe(mtmp) + " flows through "
                    + (trap.madeby_u ? "your" : "a") + " spider web.");
                seetrap(trap);
            }
        }
        return true;
    }
    return false;
}
function _u_locomotion_stub(word) { return word; }
function _x_monnam_stub(mtmp, article, adj, suppress, called) {
    void suppress; void called;
    let s = _monnam_safe(mtmp);
    let prefix = adj ? adj + " " : "";
    if (article === 1) prefix = "the " + prefix;
    return prefix + s;
}
function _strongmonst_web(ptr) { return (ptr.mflags2 & _M2_STRONG_WEB) !== 0; }
function _extra_nasty_web(ptr) { return (ptr.mflags2 & _M2_NASTY_WEB) !== 0; }
function _count_wsegs_web(mtmp) {
    if (!mtmp.wormno) return 0;
    let count = 1;
    let seg = mtmp;
    while (seg.nmon) { count++; seg = seg.nmon; if (seg === mtmp) break; }
    return count;
}
async function trapeffect_web(trap, trflags) {
    const u = game.u;
    const youmonst = game.youmonst;
    const youdata = youmonst ? youmonst.data : null;
    let webmsgok = (trflags & NOWEBMSG) === 0;
    let forcetrap = ((trflags & FORCETRAP) !== 0
                     || (trflags & _FAILEDUNTRAP_BT) !== 0);
    let viasitting = (trflags & _VIASITTING_BT) !== 0;
    let steed_article = 1; /* ARTICLE_THE */

    if (u.usteed && _has_mgivenname_fn(u.usteed) && !uprop_active(HALLUC))
        steed_article = 0; /* ARTICLE_NONE */

    _feeltrap(trap);
    if (_mu_maybe_destroy_web(youmonst, webmsgok, trap))
        return Trap_Effect_Finished;
    if (youdata && _imm_webmaker(youdata)) {
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
            verbbuf = "lead " + _x_monnam_stub(u.usteed, steed_article, "poor", 0x0008, false) + " into";
        } else {
            verbbuf = _u_locomotion_stub("stumble") + " into";
        }
        await You(verbbuf + " " + (trap.madeby_u ? "your" : "a") + " spider web!");
    }

    set_utrap(1, TT_WEB_);

    {
        let tim, str = (u.acurr && u.acurr.a) ? (u.acurr.a[A_STR] | 0) : 18;

        if (u.usteed && webmsgok) {
            u.usteed.mx = u.ux;
            u.usteed.my = u.uy;

            if (await mintrap(u.usteed, trflags) !== Trap_Effect_Finished) {
                u.usteed.mtrapped = 0;
                if (_strongmonst_web(u.usteed.data))
                    str = 17;
            } else {
                await reset_utrap(false);
                return Trap_Effect_Finished;
            }

            webmsgok = false;
        }
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
                await You("tear through " + (trap.madeby_u ? "your" : "a") + " web!");
            deltrap(trap);
            newsym(u.ux, u.uy);
        }
        set_utrap(tim, TT_WEB_);
    }
    return Trap_Effect_Finished;
}
function _has_mgivenname_fn(mtmp) {
    return !!_mgivenname(mtmp);
}
/* C ref: trap.c:2104 trapeffect_web — MONSTER branch */
function trapeffect_web_mon(mtmp, trap, trflags) {
    let tear_web;
    let in_sight = canseemon(mtmp) || (mtmp === (game.u ? game.u.usteed : null));
    let forcetrap = ((trflags & FORCETRAP) !== 0);
    const mptr = mtmp ? mtmp.data : null;
    if (!mptr) return Trap_Effect_Finished;

    if (_imm_webmaker(mptr))
        return Trap_Effect_Finished;
    if (_mu_maybe_destroy_web(mtmp, in_sight, trap))
        return Trap_Effect_Finished;
    tear_web = false;
    switch (mptr.pmidx | 0) {
        case PM_OWLBEAR:
        case PM_BUGBEAR:
            if (!in_sight) {
                _soundeffect(0, 60); /* se_roar */
                _you_hear("the roaring of a confused bear!");
                mtmp.mtrapped = 1;
                break;
            }
            /* FALLTHROUGH */
        default:
            if (mptr.mlet === _S_GIANT_WEB
                || (mptr.mlet === _S_DRAGON_WEB && _extra_nasty_web(mptr))
                || (mtmp.wormno && _count_wsegs_web(mtmp) > 5)) {
                tear_web = true;
            } else if (in_sight) {
                pline(_monnam_safe(mtmp) + " is caught in " + (trap.madeby_u ? "your" : "a") + " spider web.");
                seetrap(trap);
            }
            mtmp.mtrapped = tear_web ? 0 : 1;
            break;
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
            break;
    }
    if (tear_web) {
        if (in_sight)
            pline(_monnam_safe(mtmp) + " tears through " + (trap.madeby_u ? "your" : "a") + " spider web!");
        deltrap(trap);
        newsym(mtmp.mx, mtmp.my);
    } else if (forcetrap && !mtmp.mtrapped) {
        if (in_sight) {
            pline(_monnam_safe(mtmp) + " avoids " + (trap.madeby_u ? "your" : "a") + " spider web!");
            seetrap(trap);
        }
    }
    return mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
}
/* C youprop.h Blind — the same body js/vision.js:19 uses (uprops[BLINDED]
 * intrinsic|extrinsic and not blocked, or the u.ublind alias).  Local because
 * vision.js does not export its copy. */
function Blind_thitu() {
    const u = game.u;
    if (!u) return false;
    const bp = u.uprops && u.uprops[BLINDED];
    return !!bp && !!((bp.intrinsic | 0) || (bp.extrinsic | 0))
            && !(bp.blocked | 0);
}
/* C ref: mthrowu.c:75 thitu — the hero is hit by something (a trap missile here).
 *   if (u.uac + tlev <= (dieroll = rnd(20))) { ...miss plines...; return 0; }
 *   else { ...hit plines...; losehp(dam,...); exercise(A_STR, FALSE); return 1; }
 * Only the dart/arrow trap-missile call sites are exercised: non-acid, non-stone,
 * non-potion, non-silver → the plain hit tail (losehp + exercise A_STR).
 * RNG: rnd(20) always; exercise(A_STR,FALSE) → rn2(2) only on a hit. */
export async function thitu(tlev, dam, otmp, name) {
    const u = game.u;
    const uac = u.uac | 0;
    /* C mthrowu.c:88-98 — name the missile.  This used to call a local
     * `missile_name()` whose whole body was a four-row otyp switch
     * (ARROW/DART/ROCK) falling back to the literal "a missile", so every
     * other thrown object was announced as "a missile" — seed0108 step 31
     * rendered "You are hit by a missile." where C says "You are hit by a
     * crude dagger."  C formats it with doname()/mshot_xname(), then applies
     * the/an per obj_is_pname and quan. */
    const onm = await _thitu_onm(otmp, name);
    const dieroll = rnd(20);
    if (uac + (tlev | 0) <= dieroll) {
        /* MISS — C: "It misses." / "<onm> misses you." / "You are almost hit
         * by <onm>." depending on Blind/verbose and the 2-point margin.  Verbose
         * default with sight: the <2 margin → almost-hit, else <onm> misses you.
         * No RNG on any miss branch. */
        /* C mthrowu.c:106 ++gm.mesg_given — m_throw's end-of-path "<The
         * missile> misses." arm reads this to avoid a duplicate message. */
        const gm = game.gm || (game.gm = {});
        gm.mesg_given = (gm.mesg_given | 0) + 1;
        /* C mthrowu.c:107-108 — Blind OR !flags.verbose collapses all three
         * miss messages to the anonymous "It misses."; it is the FIRST arm, so
         * it wins over the margin test below.  A !verbose game (seed4500's rc
         * sets `!verbose`) never names the missile. */
        if (Blind_thitu() || !(game.flags?.verbose ?? true)) {
            await pline('It misses.');
        } else if (uac + (tlev | 0) <= dieroll - 2) {
            await pline(`${upstart_local(onm)} misses you.`);
        } else {
            await pline(`You are almost hit by ${onm}.`);
        }
        return 0;
    }
    /* HIT — C mthrowu.c:117-120: Blind || !verbose → the anonymous form. */
    if (Blind_thitu() || !(game.flags?.verbose ?? true))
        await pline(`You are hit${exclam_local(dam)}`);
    else
        await pline(`You are hit by ${onm}${exclam_local(dam)}`);
    /* C mthrowu.c:152 `losehp(dam, knm, kprefix);` — the WHOLE call, not an
     * inline `u.uhp -= dam`.
     *
     * The subtraction that used to stand here skipped losehp's death arm
     * (hack.c:4247 `if (u.uhp < 1) { ...; urgent_pline("You die..."); done(DIED); }`),
     * so a hero the arrow actually KILLED walked on at 0 HP.
     * MEASURED, seed0030 segment 6 step 241 (Priestess Elara, HP 4(14), Dlvl 4
     * of the Gnomish Mines): C's rnd(6)=4 arrow damage takes her to 0 and C
     * prints "You are hit by an arrow!--More--" then "You die...", which eats
     * the next three keystrokes; this port printed the hit with no --More--,
     * spent " " / "F" / "y" on the game ("You attack thin air.", "Unknown
     * command ' '."), and never reached really_done at all -- so
     * can_make_bones(), the grave block and savebones() were all dead code on
     * this session, and segment 9's 132-step bones load had no file to read.
     *
     * knm/kprefix are C's: killer_xname(obj) already applies the article for a
     * quan==1 object (objnam.c "caller should always use KILLED_BY"), which is
     * why the recorded tombstone reads "killed by an arrow".  The known/dknown
     * twiddling killer_xname does around the format is not modelled -- it only
     * matters for an object whose TYPE is undiscovered, and it would name the
     * appearance rather than the type; named here rather than dropped. */
    if (u && u.uhp !== undefined) {
        await losehp((dam | 0), _thitu_killer_name(otmp, name), KILLED_BY_THITU);
    }
    /* C mthrowu.c:153 `exercise(A_STR, FALSE)` follows only when done() returns.
     * losehp now awaits do_death_sequence: a terminal death reaches really_done()
     * and throws the replay's termination sentinel, while lifesaving or a declined
     * wizard/explore death returns here just as C's done() does.  Consequently no
     * pending-death flag is a reliable postcondition at this point, and the normal
     * exercise remains on the returning paths. */
    exercise(A_STR, false); /* rn2(2) */
    return 1;
}
/* C objnam.c:1216 killer_xname(obj), reduced to the arm thitu reaches: no
 * artifact, no CORPSE, no SLIME_MOLD.  `xname` plus the article rule at the
 * end of that function. */
const KILLED_BY_THITU = 1; /* C hack.h KILLED_BY */
function _thitu_killer_name(otmp, name) {
    if (!otmp)
        return name || '';
    const buf = xname(otmp);
    if (((otmp.quan ?? 1) | 0) === 1 && !/'s |s' /.test(buf))
        return obj_is_pname(otmp) ? the(buf) : an(buf);
    return buf;
}
/* C ref: mthrowu.c:88-98 — thitu's missile name.
 *   if (!name) name = (obj->quan > 1L) ? doname(obj) : mshot_xname(obj);
 *   onm = obj_is_pname(obj) ? the(name) : (obj->quan > 1L) ? name : an(name);
 * A caller-supplied `name` (trap.c's "little dart" etc.) skips doname but
 * still goes through the same the/an step, with obj NULL. */
async function _thitu_onm(otmp, name) {
    let nm = name;
    if (!nm) {
        if (!otmp) return 'something'; /* C panics; nothing reaches this */
        nm = (((otmp.quan ?? 1) | 0) > 1) ? (await doname(otmp)) : mshot_xname(otmp);
    }
    if (otmp && obj_is_pname(otmp)) return the(nm);
    if (otmp && ((otmp.quan ?? 1) | 0) > 1) return nm;
    return an(nm);
}
/* C hacklib.c upstart — capitalise first letter in place. */
function upstart_local(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
/* C ref: zap.c:3546 exclam(force) — `(force < 0) ? "?" : (force <= 4) ? "." :
 * "!"`.  This read `dam > 4 ? '!' : dam > 2 ? '!' : '.'`, i.e. it said "!" for
 * 3 and 4 points of damage where C says ".". */
function exclam_local(dam) {
    const f = dam | 0;
    return (f < 0) ? '?' : (f <= 4) ? '.' : '!';
}
/* C ref: trap.c:2069 trapeffect_telep_trap. */
async function trapeffect_telep_trap(mtmp, trap, trflags, isYou) {
    if (isYou) {
        /* C trap.c:2071 `seetrap(trap);` — no RNG, but it newsyms the cell. */
        seetrap(trap);
        await tele_trap(trap);
    }
    else {
        /* C trap.c:2078-2081 —
         *     boolean in_sight = canseemon(mtmp) || (mtmp == u.usteed);
         *     mtele_trap(mtmp, trap, in_sight);
         *     return Trap_Moved_Mon;
         * The note that stood here said mtele_trap was "not yet ported"; it is
         * now (above), and it DOES consume RNG. */
        const in_sight = canseemon(mtmp) || (mtmp === game.u?.usteed);
        await mtele_trap(mtmp, trap, in_sight);
        return Trap_Moved_Mon;
    }
    return Trap_Effect_Finished;
}
/* C ref: youprop.h Antimagic := (HAntimagic || EAntimagic) — no .blocked term,
 * same shape as is_fumbling_u() above.  ANTIMAGIC is already imported from
 * const.js for the trap-type constant of the same name (js/trap.js's ANTI_MAGIC
 * import), so this reads the intrinsic-property slot at that index. */
function _tr_antimagic_u() {
    const u = game.u;
    const p = (u && u.uprops) ? u.uprops[ANTIMAGIC] : null;
    return !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0)));
}
/* C ref: youprop.h Teleport_control := (HTeleport_control || ETeleport_control),
 * the same shape js/teleport.js:707's own (file-local, unexported) copy reads. */
function _tr_teleport_control_u() {
    const u = game.u;
    const p = (u && u.uprops) ? u.uprops[TELEPORT_CONTROL] : null;
    return !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0)));
}
/* C ref: trap.c:1537 level_tele_trap(trap, trflags) — the hero half of
 * trapeffect_level_telep.
 *     if ((trflags & (VIASITTING | FORCETRAP)) != 0) { verbbuf = "trigger"; intentional = TRUE; }
 *     else verbbuf = u_locomotion("step") + " onto";
 *     You("%s a level teleport trap!", verbbuf);
 *     if (Antimagic && !intentional) shieldeff(u.ux, u.uy);
 *     if ((Antimagic && !intentional) || In_endgame(&u.uz)) {
 *         You_feel("a wrenching sensation."); return;
 *     }
 *     deltrap(trap); newsym(u.ux, u.uy); level_tele();
 *     if (Hallucination || Teleport_control)
 *         You("briefly feel %s.", Hallucination ? "oriented" : "centered");
 *     else
 *         You_feel("%sdisoriented.", Confusion ? "even more " : "");
 *     if (!Teleport_control)
 *         make_confused((HConfusion & TIMEOUT) + 3L, FALSE);
 * shieldeff() is display-only (established convention, e.g. trap.c:1763 above).
 * u_locomotion's non-flying/non-swimming corpus arm is a no-op stub, same
 * convention as climb_pit's use of it. */
async function level_tele_trap_u(trap, trflags) {
    const u = game.u;
    const intentional = ((trflags | 0) & (_VIASITTING_BT | FORCETRAP)) !== 0;
    const antimagic = _tr_antimagic_u();

    You(intentional ? 'trigger a level teleport trap!'
                     : `${_u_locomotion_stub('step')} onto a level teleport trap!`);
    /* shieldeff(u.ux, u.uy) — display-only, no RNG. */
    if ((antimagic && !intentional) || In_endgame(u?.uz)) {
        You('feel a wrenching sensation.');
        return;
    }
    deltrap(trap);
    newsym(u.ux | 0, u.uy | 0);
    await level_tele();
    const teleport_control = _tr_teleport_control_u();
    if (_tr_Hallucination() || teleport_control)
        You(`briefly feel ${_tr_Hallucination() ? 'oriented' : 'centered'}.`);
    else
        You(`feel ${_tr_Confusion_u() ? 'even more ' : ''}disoriented.`);
    if (!teleport_control) {
        /* C trap.c:1565 — preserve an existing timed confusion countdown
         * before adding the three turns from the level trap. */
        const confusion = (u && u.uprops) ? u.uprops[CONFUSION] : null;
        const prior = confusion ? ((confusion.intrinsic | 0) & TIMEOUT) : 0;
        make_confused(prior + 3, false);
    }
}
/* C ref: trap.c:2088 trapeffect_level_telep. */
async function trapeffect_level_telep(mtmp, trap, trflags, isYou) {
    if (isYou) {
        seetrap(trap);
        await level_tele_trap_u(trap, trflags);
    }
    else {
        /* C trap.c:2096-2101 — mlevel_tele_trap(mtmp, trap, forcetrap, in_sight).
         * dotrap hard-codes isYou=true (same note as TELEP_TRAP above), so this
         * arm is unreached from dotrap; mintrap's own dispatcher goes through
         * trapeffect_selector_mon instead. */
        const in_sight = canseemon(mtmp) || (mtmp === game.u?.usteed);
        const forcetrap = ((trflags | 0) & FORCETRAP) !== 0;
        return await mlevel_tele_trap(mtmp, trap, forcetrap, in_sight);
    }
    return Trap_Effect_Finished;
}
/* C ref: pline.c Your() — "Your " message-channel twin of You() (imported
 * above from js/eat.js).  A local copy rather than importing do_wear.js's
 * Your() (which routes through pline()/--More--) because every other message
 * in this file goes through the resultMessage channel You() writes to. */
function _Your(line) {
    const msg = 'Your ' + String(line);
    game._resultMessage = game._resultMessage
        ? game._resultMessage + '  ' + msg
        : msg;
}
/* C ref: trap.c:2291 trapeffect_magic_trap. */
async function trapeffect_magic_trap(mtmp, trap, trflags, isYou) {
    if (isYou) {
        /* C trap.c:2298: seetrap(trap) */
        seetrap(trap);
        /* C trap.c:2299: if (!rn2(30)) magical explosion */
        if (!rn2(30)) {
            /* C trap.c:2300-2307 — trap is destroyed, the hero takes damage,
             * and absorbs some energy.  This arm used to draw the rnd(10) and
             * then DISCARD it (`void dmg`) instead of applying it via losehp,
             * and never called deltrap — leaving the trap on the level and the
             * hero's hp untouched where C removes both. */
            const u = game.u;
            deltrap(trap);
            newsym(u.ux | 0, u.uy | 0); /* update position */
            You('are caught in a magical explosion!');
            await losehp(rnd(10), 'magical explosion', KILLED_BY_AN);
            _Your('body absorbs some of the magical energy!');
            if (u) {
                u.uenmax = (u.uenmax | 0) + 2;
                u.uen = u.uenmax;
                if ((u.uenmax | 0) > (u.uenpeak | 0))
                    u.uenpeak = u.uenmax;
            }
            return Trap_Effect_Finished;
        }
        else {
            /* C trap.c:2310: domagictrap() — not yet ported (its own RNG).
             * WIRE_PENDING: port-domagictrap. */
            await domagictrap();
        }
        /* C trap.c:2312: steedintrap(trap, 0) — no usteed in corpus, no RNG. */
    }
    else {
        /* C trap.c:2315: monster — usually immune; rn2(21) chance to be hit by
         * the embedded fire trap. */
        if (!rn2(21)) {
            /* C trap.c:2316 — reuse the complete monster fire-trap effect;
             * this preserves its d(2,4), damage, and item-destruction draws. */
            return await trapeffect_fire_trap_mon(mtmp, trap);
        }
    }
    return Trap_Effect_Finished;
}
/* trapeffect_arrow_trap (monster path) — C ref: trap.c:1223-1247.
 *   if (trap->once && trap->tseen && !rn2(15)) { ...; return Trap_Is_Gone; }
 *   trap->once = 1;
 *   otmp = t_missile(ARROW, trap);   // mksobj(ARROW) full creation RNG
 *   if (in_sight) seetrap(trap);
 *   if (thitm(8, mtmp, otmp, 0, FALSE)) trapkilled = TRUE;  // rnd(20) [+dmgval on hit]
 */
async function trapeffect_arrow_trap_mon(mtmp, trap) {
    return await missile_trap_mon(mtmp, trap, OTYP_ARROW, 8);
}
/* trapeffect_dart_trap (monster path) — C ref: trap.c:1293-1318.
 *   trap->once = 1;
 *   otmp = t_missile(DART, trap);    // mksobj(DART) full creation RNG
 *   if (!rn2(6)) otmp->opoisoned = 1;     // poison check  [trap.c:1309]
 *   if (in_sight) seetrap(trap);
 *   if (thitm(7, mtmp, otmp, 0, FALSE)) trapkilled = TRUE;  // rnd(20) [+dmgval]
 */
async function trapeffect_dart_trap_mon(mtmp, trap) {
    const seen = (trap.once | 0) && trap.tseen;
    if (seen && !rn2(15)) {
        /* C trap.c:1298-1306: trap triggers but nothing happens; deltrap. */
        return Trap_Is_Gone;
    }
    trap.once = 1;
    const otmp = await t_missile(OTYP_DART, trap);
    if (!rn2(6)) otmp.opoisoned = 1; /* C trap.c:1309 */
    /* C trap.c:1313-1314 `if (in_sight) seetrap(trap);` — seetrap() draws no RNG
     * but it is NOT a bare flag write: trap.c:3567 also calls
     * newsym(trap->tx, trap->ty), and that newsym is what puts the monster's
     * glyph on its destination cell BEFORE thitm's pline can raise a --More--.
     * Setting tseen directly skipped the redraw (seed1500 step 13: C paints the
     * kitten 'f' at <67,14>, this port left the remembered orc corpse '%'). */
    if (canseemon(mtmp)) seetrap(trap);
    const trapkilled = await thitm(7, mtmp, otmp, 0, false);
    return trapkilled ? Trap_Killed_Mon
        : ((mtmp.mtrapped | 0) ? Trap_Caught_Mon : Trap_Effect_Finished);
}
/* trapeffect_rocktrap (monster path) — C ref: trap.c:1374-...:
 *   if (trap->once && trap->tseen && !rn2(15)) { ...; return Trap_Is_Gone; }
 *   trap->once = 1; otmp = t_missile(ROCK, trap); ... thitm(0, mtmp, otmp,
 *   d(2,6), FALSE) — d_override forces a hit at d(2,6) damage (no rnd(20)).
 *   NOTE the draw order: t_missile (mksobj) runs BEFORE the d(2,6) argument. */
/* C ref: trap.c:1729-1821 trapeffect_fire_trap — the MONSTER arm (mtmp !=
 * &gy.youmonst).  This port had NO FIRE_TRAP case in the monster
 * trapeffect_selector at all, so a monster that walked onto a fire trap
 * consumed nothing where C draws six leaves:
 *   d(2,4)                  trap.c:1744  orig_dmg
 *   rn2(num + 1)            trap.c:1792  mhpmax loss (only when not killed)
 *   rn2(5) x N              trap.c:113   burnarmor's slot loop
 *   rn2(5)                  zap.c:5998   destroy_items
 * Measured on seed4500-knight-coverage step 1757, leaf 106309: C's
 * `d(2,4)=4 @trapeffect_fire_trap(trap.c:1744)` is the first divergence once
 * dochug's tactics() call is wired, and the six leaves C draws there are
 * exactly d(2,4)=4, rn2(5)=0, rn2(5) x3 @burnarmor, rn2(5)=4 @destroy_items.
 *
 * thitm(0, mtmp, NULL, num, immolate) passes a d_override, so it takes the
 * forced-strike path and draws NO rnd(20) — which is why the recording shows
 * d(2,4) followed immediately by the mhpmax rn2(5).
 *
 * KNOWN GAPS, both RNG-free and both false on every corpus reach:
 *   - trap.c:1811 melt_ice(tx, ty, NULL): no port anywhere in js/ (the ICE
 *     timer at js/timeout.js:222 is still an UNPORTED-CALLEE throw).  Guarded
 *     by is_ice(tx,ty), and no corpus fire trap sits on ice.
 *   - shieldeff() on the resists_fire arm is display-only. */
async function trapeffect_fire_trap_mon(mtmp, trap) {
    const tx = trap.tx | 0, ty = trap.ty | 0;
    const in_sight = canseemon(mtmp) || mtmp === game.u?.usteed;
    const see_it = cansee(tx, ty);
    let trapkilled = false;
    const mptr = mtmp.data;
    const orig_dmg = d(2, 4);                       /* C trap.c:1744 */

    if (in_sight)
        void pline(`A tower of flame erupts from the ${_surface_ft(mtmp.mx | 0, mtmp.my | 0)} under ${mon_nam(mtmp)}!`);
    else if (see_it) /* evidently `mtmp' is invisible */
        void pline(`You see a tower of flame erupt from the ${_surface_ft(mtmp.mx | 0, mtmp.my | 0)}!`);

    if (Resists_Elem(mtmp, FIRE_RES)) {
        if (in_sight) {
            /* C trap.c:1763 shieldeff(mx,my) — display-only. */
            void pline(`${Monnam_t(mtmp)} is uninjured.`);
        }
    } else {
        let num = orig_dmg, alt;
        let immolate = false;

        /* paper burns very fast, assume straw is tightly packed and burns a
           bit slower */
        switch ((mptr && (mptr.pmidx ?? mptr.mnum)) | 0) {
        case PM_PAPER_GOLEM_FT:
            immolate = true;
            alt = mtmp.mhpmax | 0;
            break;
        case PM_STRAW_GOLEM_FT:
            alt = Math.trunc((mtmp.mhpmax | 0) / 2);
            break;
        case PM_WOOD_GOLEM_FT:
            alt = Math.trunc((mtmp.mhpmax | 0) / 4);
            break;
        case PM_LEATHER_GOLEM_FT:
            alt = Math.trunc((mtmp.mhpmax | 0) / 8);
            break;
        default:
            alt = 0;
            break;
        }
        if (alt > num)
            num = alt;

        if (await thitm(0, mtmp, null, num, immolate)) {
            trapkilled = true;
        } else {
            mtmp.mhpmax = (mtmp.mhpmax | 0) - rn2(num + 1);   /* C trap.c:1792 */
            if ((mtmp.mhp | 0) > (mtmp.mhpmax | 0))
                mtmp.mhp = mtmp.mhpmax;
        }
    }
    /* C trap.c:1795 — `||` short-circuits, so a TRUE burnarmor skips the rn2(3). */
    if ((await burnarmor(mtmp)) || rn2(3)) {
        const xtradmg = await destroy_items_mon(mtmp, AD_FIRE_FT, orig_dmg);
        await ignite_items(mtmp.minvent || null);
        if (!((mtmp.mhp | 0) < 1)) {
            mtmp.mhp = (mtmp.mhp | 0) - xtradmg;
            if ((mtmp.mhp | 0) < 1) { /* NOW it's dead */
                await monkilled_trap(mtmp, '');
                trapkilled = true;
            }
        }
    }
    if (await burn_floor_objects(tx, ty, see_it, false)
        && !see_it && distu_ft(tx, ty) <= 3 * 3)
        void pline('You smell smoke.');
    /* C trap.c:1811 — fire melts an ICE square after the trap resolves. */
    melt_ice_ft(tx, ty);
    if ((mtmp.mhp | 0) < 1)
        trapkilled = true;
    if (see_it && t_at(tx, ty))
        seetrap(t_at(tx, ty));

    return trapkilled ? Trap_Killed_Mon
        : ((mtmp.mtrapped | 0) ? Trap_Caught_Mon : Trap_Effect_Finished);
}
/* C monattk.h AD_FIRE — destroy_items' damage-type selector. */
const AD_FIRE_FT = 2;
/* monsters.h ordinals for the four golems trap.c:1770-1786 special-cases. */
const PM_STRAW_GOLEM_FT = 249, PM_PAPER_GOLEM_FT = 250,
      PM_LEATHER_GOLEM_FT = 253, PM_WOOD_GOLEM_FT = 254;
/* C mkobj.c surface(x,y) — js/engrave.js:70 has the same two-line body but does
 * not export it; this file already keeps a function-local copy at :5642. */
function _surface_ft(x, y) {
    return is_ice_ft(x, y) ? 'ice' : 'floor';
}
function is_ice_ft(x, y) {
    return (game.level?.at?.(x, y)?.typ | 0) === ICE_FT;
}
const ICE_FT = 33; /* js/const.js:80 ICE */
/* C hack.h distu(x,y) = dist2(x, y, u.ux, u.uy). */
function distu_ft(x, y) {
    const u = game.u || {};
    const dx = x - (u.ux | 0), dy = y - (u.uy | 0);
    return dx * dx + dy * dy;
}
/* youprop.h Drain_resistance (HDrain_resistance || EDrain_resistance) —
 * dofiretrap's uhpmax-drain-to-death guard (trap.c:4291). */
function _gp_Drain_resistance() { return _gp_uprop_he(DRAIN_RES); }
/* youprop.h Underwater = u.uinwater — js/cmd.js keeps an unexported local
 * copy of the same one-liner (see the note at js/pickup.js:679). */
function _gp_Underwater() { return !!(game.u && game.u.uinwater); }
/* C src/trap.c:79 `static const char tower_of_flame[] = "tower of flame";` */
const TOWER_OF_FLAME_FT = 'tower of flame';
const M_SEEN_FIRE_FT = 0x0002; /* monst.h M_SEEN_FIRE */
/* ---------------------------------------------------------------------------
 * dofiretrap — floor/box fire-trap damage.
 * C ref: nethack-c-v5/upstream/src/trap.c:4233-4313
 *   staticfn void dofiretrap(struct obj *box) -- null for floor trap
 *
 * This port drives the box === null (floor trap) call site, the only one
 * reached from trapeffect_fire_trap's hero arm below.  The box-carried call
 * (trap.c:6438, opening a fire-trapped container) and the domagictrap()
 * fate==12 call (trap.c:5188, GAP noted at this file's domagictrap stub) are
 * separate, still-unported call sites; the box branch here is written out
 * for C fidelity but has no corpus coverage exercising it.
 * --------------------------------------------------------------------------- */
async function dofiretrap(box) {
    const u = game.u || {};
    const see_it = !Blind();
    let orig_dmg, num;
    orig_dmg = num = d(2, 4);                                /* trap.c:4238 */

    /* Bug: for box case, the equivalent of burn_floor_objects() ought
     * to be done upon its contents.  (verbatim C comment, trap.c:4241-4243) */

    const box_underwater = box
        ? (!(box.where === OBJ_INVENT_TR) && _gp_is_pool(box.ox | 0, box.oy | 0))
        : _gp_Underwater();
    if (box_underwater) {
        await pline(`A cascade of steamy bubbles erupts from ${the(box ? xname(box) : _surface_ft(u.ux | 0, u.uy | 0))}!`);
        if (_gp_Fire_resistance())
            await You('are uninjured.');
        else
            await losehp(rnd(3), 'boiling water', _RT_KILLED_BY);
        return;
    }
    await pline(`A ${TOWER_OF_FLAME_FT} ${box ? 'bursts' : 'erupts'} from ${the(box ? xname(box) : _surface_ft(u.ux | 0, u.uy | 0))}!`);
    if (_gp_Fire_resistance()) {
        /* C trap.c:4261 shieldeff(u.ux, u.uy) — display-only. */
        _monstseesu_stub(M_SEEN_FIRE_FT);
        num = rn2(2);
    } else if (_gp_Upolyd()) {
        let alt;
        switch (u.umonnum | 0) {
        case PM_PAPER_GOLEM_FT:
            alt = u.mhmax | 0;
            break;
        case PM_STRAW_GOLEM_FT:
            alt = Math.trunc((u.mhmax | 0) / 2);
            break;
        case PM_WOOD_GOLEM_FT:
            alt = Math.trunc((u.mhmax | 0) / 4);
            break;
        case PM_LEATHER_GOLEM_FT:
            alt = Math.trunc((u.mhmax | 0) / 8);
            break;
        default:
            alt = 0;
            break;
        }
        if (alt > num)
            num = alt;
        const ydata = game.youmonst ? game.youmonst.data : null;
        if ((u.mhmax | 0) > ((ydata ? (ydata.mlevel | 0) : 0))) {
            u.mhmax = (u.mhmax | 0) - rn2(Math.min(u.mhmax | 0, num + 1));
            game.disp.botl = true;
        }
        if ((u.mh | 0) > (u.mhmax | 0)) {
            u.mh = u.mhmax;
            game.disp.botl = true;
        }
        _monstunseesu_stub(M_SEEN_FIRE_FT);
    } else {
        const uhpmin = minuhpmax(1);
        const olduhpmax = u.uhpmax | 0;
        num = d(2, 4);                                       /* trap.c:4283 */
        if ((u.uhpmax | 0) > uhpmin) {
            u.uhpmax = (u.uhpmax | 0) - rn2(Math.min(u.uhpmax | 0, num + 1));
            game.disp.botl = true;
        } /* note: no 'else' here */
        if ((u.uhpmax | 0) < uhpmin) {
            setuhpmax(Math.min(olduhpmax, uhpmin), false);
            if (!_gp_Drain_resistance())
                await losexp(null);
        }
        if ((u.uhp | 0) > (u.uhpmax | 0)) {
            u.uhp = u.uhpmax;
            game.disp.botl = true;
        }
        _monstunseesu_stub(M_SEEN_FIRE_FT);
    }
    if (!num)
        await You('are uninjured.');
    else
        await losehp(num, TOWER_OF_FLAME_FT, KILLED_BY_AN);        /* trap.c:4303 */
    /* C trap.c:4304 burn_away_slime() — RNG-free; no-op, matching the
     * established convention (js/uhitm.js:5245, js/mhitu.js:458). */
    if ((await burnarmor(game.youmonst)) || rn2(3)) {
        await destroy_items(true, AD_FIRE_FT, orig_dmg);
        await ignite_items(game.invent || null);
    }
    if (!box && await burn_floor_objects(u.ux | 0, u.uy | 0, see_it, true) && !see_it)
        await You('smell paper burning.');
    /* C trap.c:4312 — fire melts an ICE square after damage and item effects. */
    melt_ice_ft(u.ux | 0, u.uy | 0);
}

/* C zap.c:5033-5074 melt_ice(), reduced to the ICE terrain arm used by trap.c.
 * Fire traps pass NULL for msg, so this is entirely stateful and RNG-free. */
function melt_ice_ft(x, y) {
    const lev = game.level?.at?.(x, y) ?? game.level?.locations?.[x]?.[y];
    if (!lev)
        return;
    /* C melt_ice() also clears the temporary ice under an open or lowered
     * drawbridge.  Fire traps can trigger on those squares; treating them as
     * ordinary ICE left DB_ICE set and kept the bridge frozen indefinitely. */
    if ((lev.typ | 0) === DRAWBRIDGE_UP || (lev.typ | 0) === 34 /* DRAWBRIDGE_DOWN */) {
        if (((lev.drawbridgemask | 0) & DB_ICE) === 0)
            return;
        lev.drawbridgemask = (lev.drawbridgemask | 0) & ~DB_ICE;
    } else if ((lev.typ | 0) === ICE_FT) {
        lev.typ = ((lev.icedpool | 0) === 2 /* ICED_POOL */) ? POOL : MOAT;
        lev.icedpool = 0;
    } else {
        return;
    }
    spot_stop_timers(x, y, MELT_ICE_AWAY);
    obj_ice_effects(x, y, false);
    newsym(x, y);
}
/* ---------------------------------------------------------------------------
 * trapeffect_fire_trap — HERO branch (mtmp == &gy.youmonst).
 * C ref: nethack-c-v5/upstream/src/trap.c:1730-1738
 *   staticfn int trapeffect_fire_trap(mtmp, trap, trflags) {
 *       if (mtmp == &gy.youmonst) { seetrap(trap); dofiretrap((struct obj *) 0); }
 *       else { ... }  <- the monster arm, ported above as trapeffect_fire_trap_mon
 *   }
 * This selector had NO FIRE_TRAP case at all, so a hero stepping on a fire
 * trap fell through to trapeffect_selector's `default:` and drew nothing
 * where C draws d(2,4), the damage-branch RNG, burnarmor's rn2(5) loop, and
 * destroy_items'/maybe_destroy_item's draws (measured: this packet's board,
 * record #7, 20 recorded draws vs 1 consumed before this change).
 * --------------------------------------------------------------------------- */
async function trapeffect_fire_trap(trap, _trflags) {
    seetrap(trap);
    await dofiretrap(null);
    return Trap_Effect_Finished;
}
async function trapeffect_rocktrap_mon(mtmp, trap) {
    const seen = (trap.once | 0) && trap.tseen;
    if (seen && !rn2(15)) {
        return Trap_Is_Gone;
    }
    trap.once = 1;
    /* C trap.c:1390-1393 (MONSTER branch) creates the missile FIRST and rolls
     * the damage inside the thitm() call:
     *     otmp = t_missile(ROCK, trap);
     *     if (in_sight) seetrap(trap);
     *     if (thitm(0, mtmp, otmp, d(2, 6), FALSE)) ...
     * The old comment here ("dmg = d(2,6) computed before t_missile") quoted
     * the HERO branch (trap.c:1339 `int dmg = d(2, 6);` then 1343
     * `otmp = t_missile(ROCK, trap);`) — right sentence, wrong branch, and it
     * put d(2,6) two leaves ahead of mksobj's next_ident/mksobj_init draws.
     * Measured on seed0030 segment 0 step 49: C draws rnd(2) rn2(6) d(2,6),
     * this port drew d(2,6) rnd(2) rn2(6). */
    const otmp = await t_missile(OTYP_ROCK, trap);
    /* C: `if (in_sight) seetrap(trap);` — see trapeffect_dart_trap_mon above;
     * seetrap carries a newsym(trap->tx, trap->ty), a bare tseen write does not. */
    if (canseemon(mtmp)) seetrap(trap);
    const trapkilled = await thitm(0, mtmp, otmp, d(2, 6), false);
    return trapkilled ? Trap_Killed_Mon
        : ((mtmp.mtrapped | 0) ? Trap_Caught_Mon : Trap_Effect_Finished);
}
/* Shared arrow/dart skeleton for the non-poison, non-d_override missiles. */
async function missile_trap_mon(mtmp, trap, otyp, tlev) {
    if (ENV.FF_TRAP_TRACE === '1')
        pushRngLogEntry(`^missile_trap_mon[id=${mtmp.m_id|0} otyp=${otyp|0} tlev=${tlev|0} pos=${mtmp.mx|0},${mtmp.my|0}]`);
    const seen = (trap.once | 0) && trap.tseen;
    if (seen && !rn2(15)) {
        return Trap_Is_Gone;
    }
    trap.once = 1;
    const otmp = await t_missile(otyp, trap);
    /* C: `if (in_sight) seetrap(trap);` — see trapeffect_dart_trap_mon above. */
    if (canseemon(mtmp)) seetrap(trap);
    const trapkilled = await thitm(tlev, mtmp, otmp, 0, false);
    return trapkilled ? Trap_Killed_Mon
        : ((mtmp.mtrapped | 0) ? Trap_Caught_Mon : Trap_Effect_Finished);
}

/* ── stubs for unported helpers used by trapeffect_bear_trap ── */
/* C ref: trap.c feeltrap — mark a trap as seen/felt and (re)display it.
 *   trap->tseen = 1; map_trap(trap, 1); newsym(trap->tx, trap->ty);
 * RNG-neutral, but tseen is load-bearing: paranoid_confirm:trap (hack.c
 * avoid_trap_andor_region) only prompts for a trap whose tseen is set, so a
 * no-op stub here silently suppresses that prompt on a re-approach. */
function _feeltrap(trap) {
    trap.tseen = 1;
    map_trap(trap, 1);
    /* in case it's beneath something, redisplay the something */
    newsym(trap.tx, trap.ty);
}
/* C ref: do.c:2451 set_wounded_legs(side, timex).
 * KMH -- STEED note in C applies to the mount case, not the bear-trap hero
 * call site this packet ports. u.atemp.a is in DISPLAY order (attrib.js
 * C_ATTR_TO_DISP); A_DEX(=3) -> display index 1. */
async function _set_wounded_legs(side, timex) {
    const u = game.u;
    if (!u) return;
    if (game.disp) game.disp.botl = 1; /* SET_BOTL() */
    if (!u.uprops) u.uprops = {};
    if (!u.uprops[WOUNDED_LEGS]) u.uprops[WOUNDED_LEGS] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    const prop = u.uprops[WOUNDED_LEGS];
    const woundedBefore = !!((prop.intrinsic | 0) || (prop.extrinsic | 0));
    if (!woundedBefore) {
        if (!u.atemp) u.atemp = { a: [0, 0, 0, 0, 0, 0] };
        if (!u.atemp.a) u.atemp.a = [0, 0, 0, 0, 0, 0];
        u.atemp.a[1] -= 1; /* ATEMP(A_DEX)-- */
    }
    if (!woundedBefore || ((prop.intrinsic | 0) & TIMEOUT) < (timex | 0)) {
        /* set_itimeout(&HWounded_legs, timex) — potion.c:75 */
        let v = timex | 0;
        if (v >= TIMEOUT) v = TIMEOUT;
        else if (v < 1) v = 0;
        prop.intrinsic = ((prop.intrinsic | 0) & ~TIMEOUT) | v;
    }
    prop.extrinsic = (prop.extrinsic | 0) | side;
    await encumber_msg();
}
function _wearing_iron_shoes(mtmp) {
    for (let obj = mtmp?.minvent; obj; obj = obj.nobj) {
        if ((obj.otyp | 0) === 164 /* IRON_SHOES */
            && ((obj.owornmask | 0) & W_ARMF) !== 0)
            return true;
    }
    return false;
}
function _body_part(_part) { return body_part_real(FOOT); }
function _mbodypart(mon, _part) { return mbodypart_real(mon, FOOT); }
function _yname2(obj) {
    /* C Yname2(uarmf): the carried armor's capitalized possessive name. */
    return (obj && (obj.otyp | 0) === 164) ? "Your iron shoes" : "Your armor";
}
function _soundeffect(se, vol) { void se; void vol; /* no-op */ }
/* C ref: pline.c:435-452 You_hear — forwards to the shared body in
 * js/display.js.  This was `void msg`, a SILENT no-op, and its two call sites
 * are C trap.c:1542 You_hear("the roaring of an angry bear!") and trap.c:2221
 * You_hear("the roaring of a confused bear!") — C prints a topline at both and
 * this port printed nothing. */
function _you_hear(msg) { return You_hear(msg); }
/* Avoid calling Monnam_t / mon_nam on untrusted monster structs whose
 * mgivenname field may not be in the capture.  These are display-only. */
function _monnam_safe(mtmp) {
    if (!mtmp) return "It";
    try { return Monnam_t(mtmp); } catch (_) { return "Something"; }
}

const _VIASITTING_BT = 0x20;
const _FAILEDUNTRAP_BT = 0x40;

/* C ref: trap.c:1478 trapeffect_bear_trap — HERO branch */
/* C ref: trap.c:1401-1437 trapeffect_sqky_board — HERO branch
 * (mtmp == &gy.youmonst):
 *
 *     boolean forcetrap = ((trflags & FORCETRAP) != 0
 *                          || (trflags & FAILEDUNTRAP) != 0
 *                          || (Flying && (trflags & VIASITTING) != 0));
 *     if ((Levitation || Flying) && !forcetrap) {
 *         if (!Blind) {
 *             seetrap(trap);
 *             if (Hallucination) You("notice a crease in the linoleum.");
 *             else               You("notice a loose board below you.");
 *         }
 *     } else {
 *         seetrap(trap);
 *         ... Soundeffect ...
 *         pline("A board beneath you %s%s%s.",
 *               Deaf ? "vibrates" : "squeaks ",
 *               Deaf ? "" : trapnote(trap, FALSE),
 *               Deaf ? "" : " loudly");
 *         wake_nearby(FALSE);
 *     }
 *
 * trapeffect_selector had NO SQKY_BOARD arm, so the hero's squeaky board fell
 * through to `default: return Trap_Effect_Finished` — silent, and, because the
 * message arm is also where seetrap() lives, the trap was never marked tseen
 * either, so the '^' never appeared on the map afterwards.  The MONSTER half of
 * the same C function has been ported all along (js/monmove.js:2241-2300);
 * only the hero half was missing.
 *
 * MEASURED on gen392-reseed-seed77105 step 471: the blind hero steps south onto
 * a squeaky board.  C reads "A board beneath you squeaks a B flat loudly." and
 * this port printed a blank topline; C then paints '^' at that square from step
 * 632 onward and this port kept painting the floor.
 *
 * RNG-free: seetrap/newsym draw nothing, Soundeffect is audio-only, and
 * wake_nearto_core is a plain fmon walk (js/mklev.js:wake_nearto). */
async function trapeffect_sqky_board(trap, trflags) {
    const u = game.u || {};
    const forcetrap = ((trflags & FORCETRAP) !== 0
                       || (trflags & _FAILEDUNTRAP_BT) !== 0
                       || (uprop_active(FLYING) && (trflags & _VIASITTING_BT) !== 0));

    if ((uprop_active(LEVITATION) || uprop_active(FLYING)) && !forcetrap) {
        if (!Blind()) {
            seetrap(trap);
            await pline(_lo_hallucinating()
                ? 'You notice a crease in the linoleum.'
                : 'You notice a loose board below you.');
        }
        return Trap_Effect_Finished;
    }
    seetrap(trap);
    /* C youprop.h:125 Deaf — _hero_Deaf() is this file's full spelling (the
     * `_lo_deaf()` helper reads only the uprops slot; see its note). */
    const deaf = _hero_Deaf();
    await pline(`A board beneath you ${deaf ? 'vibrates' : 'squeaks '}`
                + `${deaf ? '' : _sqky_trapnote(trap)}${deaf ? '' : ' loudly'}.`);
    /* C mon.c:4367 wake_nearby(FALSE) === wake_nearto_core(u.ux, u.uy,
     * u.ulevel * 20, FALSE), and wake_nearto(x, y, d) is exactly that core call
     * with petcall FALSE (mon.c:4402). */
    wake_nearto(u.ux | 0, u.uy | 0, (u.ulevel | 0) * 20);
    return Trap_Effect_Finished;
}
/* C ref: trap.c:3063-3078 trapnote(trap, FALSE) — the note name with a
 * just_an() article prefix.  just_an takes its SINGLE-LETTER branch
 * (objnam.c:2113-2115): article = "an" iff the lowercased first char is in
 * "aefhilmnosx", else "a" (the LETTER NAME is what decides, e.g. "F" reads
 * "eff" -> "an F note").  Same derivation js/monmove.js:2271-2280 uses for the
 * monster half; kept file-local rather than exported so neither copy becomes
 * the other's hidden dependency. */
const _SQKY_NOTES = [
    'C note', 'D flat', 'D note', 'E flat', 'E note', 'F note',
    'F sharp', 'G note', 'G sharp', 'A note', 'B flat', 'B note',
];
function _sqky_trapnote(trap) {
    const name = _SQKY_NOTES[trap.tnote | 0] || 'C note';
    const c0 = (name[0] || '').toLowerCase();
    return `${'aefhilmnosx'.includes(c0) ? 'an' : 'a'} ${name}`;
}
async function trapeffect_bear_trap(trap, trflags) {
    const mtmp = game.youmonst;
    const u = game.u;
    const forcetrap = ((trflags & FORCETRAP) !== 0
                       || (trflags & _FAILEDUNTRAP_BT) !== 0
                       || (trflags & _VIASITTING_BT) !== 0);
    const dmg = d(2, 4);

    if ((uprop_active(LEVITATION) || uprop_active(FLYING)) && !forcetrap)
        return Trap_Effect_Finished;
    _feeltrap(trap);
    const youdata = mtmp ? mtmp.data : null;
    if (youdata && (_imm_amorphous(youdata) || _imm_is_whirly(youdata) || _imm_unsolid(youdata))) {
        await pline(`${trap.madeby_u ? "Your" : "A"} bear trap closes harmlessly through you.`);
        return Trap_Effect_Finished;
    }
    if (!u.usteed && youdata && (youdata.msize | 0) <= MZ_SMALL_T) {
        await pline(`${trap.madeby_u ? "Your" : "A"} bear trap closes harmlessly over you.`);
        return Trap_Effect_Finished;
    }
    set_utrap(rn1(4, 4), TT_BEARTRAP_);
    if (u.usteed) {
        await pline(`${trap.madeby_u ? "Your" : "A"} bear trap closes on ${_s_suffix(_monnam_safe(u.usteed))} ${_mbodypart(u.usteed, 0)}!`);
        if (await thitm(0, u.usteed, null, dmg, false))
            await reset_utrap(true);
    } else {
        await pline(`${trap.madeby_u ? "Your" : "A"} bear trap closes on your ${_body_part(0)}!`);
        if (u.umonnum === PM_OWLBEAR || u.umonnum === PM_BUGBEAR)
            await You("howl in anger!");
        if (_wearing_iron_shoes(mtmp))
            await pline(`${_yname2(u.uarmf)} protects your leg.`);
        else {
            const sideval = rn2(2) ? RIGHT_SIDE : LEFT_SIDE;
            const duration = rn1(10, 10);
            await _set_wounded_legs(sideval, duration);
            /* Maybe_Half_Phys(dmg) — may or may not halve; most heroes take full */
            if (u && dmg > 0) {
                u.uhp = (u.uhp | 0) - dmg;
                if ((u.uhp | 0) > (u.uhpmax | 0)) u.uhpmax = u.uhp;
            }
        }
    }
    exercise(A_DEX, false);
    return Trap_Effect_Finished;
}

/* C ref: trap.c:1478 trapeffect_bear_trap — MONSTER branch */
async function trapeffect_bear_trap_mon(mtmp, trap, trflags) {
    const mptr = mtmp.data;
    const in_sight = canseemon(mtmp) || (mtmp === (game.u ? game.u.usteed : null));
    let trapkilled = false;
    const forcetrap = ((trflags & FORCETRAP) !== 0
                       || (trflags & _FAILEDUNTRAP_BT) !== 0);

    /* C trap.c:1529 uses m_in_air(mtmp) (mon.c:2117), NOT check_in_air(). */
    if ((mptr.msize | 0) > MZ_SMALL_T && !_imm_amorphous(mptr) && !_gp_m_in_air(mtmp)
        && !_imm_is_whirly(mptr) && !_imm_unsolid(mptr)) {
        mtmp.mtrapped = 1;
        if (in_sight) {
            pline(`${_monnam_safe(mtmp)} is caught in ${trap.madeby_u ? "your" : "a"} bear trap!`);
            seetrap(trap);
        } else {
            if ((mptr.pmidx | 0) === PM_OWLBEAR
                || (mptr.pmidx | 0) === PM_BUGBEAR) {
                _soundeffect(0, 100); /* se_roar */
                await _you_hear("the roaring of an angry bear!");
            }
        }
    } else if (forcetrap) {
        if (in_sight) {
            pline(`${_monnam_safe(mtmp)} evades ${trap.madeby_u ? "your" : "a"} bear trap!`);
            seetrap(trap);
        }
    }
    if (mtmp.mtrapped && !_wearing_iron_shoes(mtmp))
        trapkilled = await thitm(0, mtmp, null, d(2, 4), false);

    return trapkilled ? Trap_Killed_Mon
        : (mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished);
}

/* ══════════════════════════════════════════════════════════════════════════
 * HERO trap arms for ROCKTRAP and PIT / SPIKED_PIT.
 *
 * Neither had an arm in trapeffect_selector's hero switch, so the hero fell to
 * `default: return Trap_Effect_Finished` — a NO-RNG case — while C ran a full
 * effect and drew.  The MONSTER forms (trapeffect_rocktrap_mon above,
 * trapeffect_pit_mon below) were already ported; only the hero halves were
 * absent, which is why this file carried the monster pit line and no js/ file
 * contained the hero one, or "trap door in the ceiling", at all.
 * ══════════════════════════════════════════════════════════════════════════ */

/* C hack.h:129-150 enum bodypart_types — body_part()'s index space.  Not
 * exported from js/cmd.js, which declares the same 0-based enum at :42359. */
const HEAD_TR = 8, LEG_TR = 9;
const _RECURSIVETRAP_TR = 0x08; /* C hack.h RECURSIVETRAP */
/* C trap.c:77-78 `static const char *const a_your[2] = { "a", "your" };` and
 * A_Your[2] = { "A", "Your" }, indexed by trap->madeby_u. */
function _a_your(madeby_u) { return (madeby_u | 0) ? 'your' : 'a'; }
function _A_Your(madeby_u) { return (madeby_u | 0) ? 'Your' : 'A'; }
/* C mondata.h:208 passes_rocks(ptr) = passes_walls(ptr) && !unsolid(ptr),
 * mondata.h:29 passes_walls(ptr) = ((ptr)->mflags1 & M1_WALLWALK) != 0. */
function _tr_passes_rocks(pm) {
    if (!pm) return false;
    return (((pm.mflags1 | 0) & M1_WALLWALK_T) !== 0) && !_imm_unsolid(pm);
}
/* C trap.c:1097-1102 wearing_iron_shoes(mtmp) —
 *     struct obj *armf = which_armor(mtmp, W_ARMF);
 *     return armf && objects[armf->otyp].oc_material == IRON;
 * for the HERO, whose W_ARMF slot is u.uarmf.  The `_wearing_iron_shoes` stub
 * further up returns a constant FALSE and is deliberately left alone: it is the
 * MONSTER call sites' helper and re-pointing it would move three already-gated
 * arms that this row did not measure. */
function _u_wearing_iron_shoes() {
    const armf = game.u?.uarmf;
    return !!armf && (MKOBJ_OC_MATERIAL[armf.otyp | 0] | 0) === _IMM_MAT_IRON;
}
/* C pm.h Role_if(pm) = (gu.urole.mnum == (pm)).  urole.mnum is a PM index on
 * the scored path; js/cmd.js:342 reads it exactly this way. */
function _tr_Role_if(pm) {
    return ((game.urole && game.urole.mnum) | 0) === (pm | 0);
}
/* C youprop.h:286 Passes_walls (HPasses_walls || EPasses_walls) — note there is
 * no B-blocked term on this one, unlike Levitation/Flying. */
function _tr_Passes_walls() {
    const p = game.u?.uprops?.[PASSES_WALLS];
    return !!p && !!((p.intrinsic | 0) || (p.extrinsic | 0));
}
/* C youprop.h:120 Hallucination (HHallucination && !Halluc_resistance). */
function _tr_Hallucination() {
    const p = game.u?.uprops?.[HALLUC];
    if (!p || !((p.intrinsic | 0) || (p.extrinsic | 0)))
        return false;
    const r = game.u?.uprops?.[HALLUC_RES_DMT];
    return !(r && ((r.intrinsic | 0) || (r.extrinsic | 0)));
}
/* C youprop.h Confusion := (HConfusion || EConfusion), no .blocked term —
 * used by level_tele_trap_u's non-Teleport_control disoriented message. */
function _tr_Confusion_u() {
    const p = game.u?.uprops?.[CONFUSION];
    return !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0)));
}
/* C hack.h Punished (uball != 0); invent.h carried(o) = (o->where == OBJ_INVENT). */
function _tr_Punished() { return !!(game.u && game.u.uball); }
const OBJ_INVENT_TR = 3; /* C obj.h OBJ_INVENT */
function _tr_carried(o) { return !!o && (o.where | 0) === OBJ_INVENT_TR; }
/* C dungeon.h Is_qlocate(lev) — the quest locate level.  This port has no quest
 * locate-level bookkeeping; the only caller is the Ranger wumpus quip in
 * trapeffect_pit, which additionally requires Role_if(PM_RANGER) && In_quest,
 * and every arm of that `if` is RNG-free, so a conservative FALSE cannot move a
 * leaf — it can only omit a joke line on a Ranger standing on the quest locate
 * level.  Flagged rather than faked. */
function _tr_Is_qlocate(uz) { void uz; return false; }
/* C trap.c:7100 trapname(ttyp, override) — the NON-hallucinating result is
 *     defsyms[trap_to_defsym(ttyp)].explanation
 * with trap_to_defsym(t) = S_arrow_trap + t - 1 (rm.h:497; S_arrow_trap = 49,
 * the same value js/cmd.js:31377 and js/region.js:71 both carry).
 * DEFSYM_EXPLANATION is the generated dump of that very table, so this reads C's
 * table rather than a hand twin of it.
 * The HALLUCINATING half draws rn2_on_display_rng() — the DISPLAY isaac64
 * stream, which js/rng.js keeps separate from the scored one — so its absence
 * cannot move a scored leaf; it would only mis-name the trap on a hallucinating
 * hero's topline. */
const _S_ARROW_TRAP_TR = 49;
function _tr_trapname(ttyp) {
    return DEFSYM_EXPLANATION[_S_ARROW_TRAP_TR + (ttyp | 0) - 1] ?? 'trap';
}

/* C ref: trap.c:1324-1399 trapeffect_rocktrap — HERO branch (mtmp == &gy.youmonst).
 *
 * The hero body verbatim (trap.c:1332-1374):
 *     if (trap->once && trap->tseen && !rn2(15)) {
 *         pline("A trap door in %s opens, but nothing falls out!",
 *               the(ceiling(u.ux, u.uy)));
 *         deltrap(trap);
 *         newsym(u.ux, u.uy);
 *     } else {
 *         int dmg = d(2, 6);          // should be std ROCK dmg?
 *         trap->once = 1;
 *         feeltrap(trap);
 *         otmp = t_missile(ROCK, trap);
 *         place_object(otmp, u.ux, u.uy);
 *         pline("A trap door in %s opens and %s falls on your %s!",
 *               the(ceiling(u.ux, u.uy)), an(xname(otmp)), body_part(HEAD));
 *         if (uarmh) {
 *             if (passes_rocks(gy.youmonst.data)) {
 *                 pline("Unfortunately, you are wearing %s.",
 *                       an(helm_simple_name(uarmh)));   dmg = 2;
 *             } else if (hard_helmet(uarmh)) {
 *                 pline("Fortunately, you are wearing a hard helmet."); dmg = 2;
 *             } else if (flags.verbose) {
 *                 pline("%s does not protect you.", Yname2(uarmh));
 *             }
 *         } else if (passes_rocks(gy.youmonst.data)) {
 *             pline("It passes harmlessly through you."); harmless = TRUE;
 *         }
 *         if (!Blind) observe_object(otmp);
 *         stackobj(otmp);
 *         newsym(u.ux, u.uy);         // map the rock
 *         if (!harmless) {
 *             losehp(Maybe_Half_Phys(dmg), "falling rock", KILLED_BY_AN);
 *             exercise(A_STR, FALSE);
 *         }
 *     }
 *
 * DRAW ORDER is the one thing the monster arm has the other way round, and the
 * note on trapeffect_rocktrap_mon above already says so: the HERO's
 * `int dmg = d(2, 6);` runs BEFORE t_missile's mksobj, so the leaves are
 * d(2,6), then next_ident's rnd(2), then mksobj_init's rn2(6).  Read off the
 * recording, gen639-grammar-seed1771982 segment 0 step 80 (identical shape on
 * gen290-reseed-seed242132 step 31):
 *     ^multi[nomul=0]
 *     d(2,6)=3   @ trapeffect_rocktrap(trap.c:1339)
 *     rnd(2)=2   @ next_ident(mkobj.c:521)
 *     rn2(6)=5   @ mksobj_init(mkobj.c:981)
 *     ^place[474,63,19]
 *     ^botl[losehp]
 *     rn2(2)=1   @ exercise(attrib.c:509)
 * and C's topline there is
 *     "A trap door in the ceiling opens and a rock falls on your head!"
 * where this port printed nothing at all and drew nothing at all. */
async function trapeffect_rocktrap(trap, trflags) {
    void trflags; /* C marks this parameter UNUSED in this function */
    const u = game.u;
    let harmless = false;

    if ((trap.once | 0) && trap.tseen && !rn2(15)) {
        await pline(`A trap door in ${the(ceiling(u.ux | 0, u.uy | 0))} opens, `
                    + `but nothing falls out!`);
        deltrap(trap);
        newsym(u.ux | 0, u.uy | 0);
    } else {
        let dmg = d(2, 6); /* should be std ROCK dmg? */

        trap.once = 1;
        _feeltrap(trap);
        const otmp = await t_missile(OTYP_ROCK, trap);
        place_object(otmp, u.ux | 0, u.uy | 0);

        await pline(`A trap door in ${the(ceiling(u.ux | 0, u.uy | 0))} opens and `
                    + `${an(xname(otmp))} falls on your ${body_part(HEAD_TR)}!`);
        if (u.uarmh) {
            /* normally passes_rocks() would protect against a falling
               rock, but not when wearing a helmet */
            if (_tr_passes_rocks(_lo_hero_monst().data)) {
                await pline(`Unfortunately, you are wearing `
                            + `${an(helm_simple_name(u.uarmh))}.`); /* helm or hat */
                dmg = 2;
            } else if (hard_helmet(u.uarmh)) {
                await pline('Fortunately, you are wearing a hard helmet.');
                dmg = 2;
            } else if (game.flags?.verbose ?? true) {
                await pline(`${Yname2(u.uarmh)} does not protect you.`);
            }
        } else if (_tr_passes_rocks(_lo_hero_monst().data)) {
            await pline('It passes harmlessly through you.');
            harmless = true;
        }
        if (!Blind())
            observe_object(otmp);
        await stackobj(otmp);
        newsym(u.ux | 0, u.uy | 0); /* map the rock */

        if (!harmless) {
            await losehp(Maybe_Half_Phys_lo(dmg), 'falling rock', KILLED_BY_AN);
            exercise(A_STR, false);
        }
    }
    return Trap_Effect_Finished;
}

/* C ref: trap.c:6552 conjoined_pits(trap2, trap1, u_entering_trap2).  Both this
 * and adj_nonconjoined_pit require `u.utrap && u.utraptype == TT_PIT` — the hero
 * must ALREADY be in a pit — so on a first fall they are both FALSE by
 * construction, which is what dotrap() used to hard-code.  They are ported
 * because dotrap's own escape check and three of trapeffect_pit's damage
 * arguments read them, and hard-coding false there is a fabricated constant the
 * moment a session digs or walks between two pits. */
function conjoined_pits(trap2, trap1, u_entering_trap2) {
    const u = game.u;
    if (!trap1 || !trap2)
        return false;
    if (!isok(trap2.tx | 0, trap2.ty | 0) || !isok(trap1.tx | 0, trap1.ty | 0)
        || !is_pit(trap2.ttyp | 0)
        || !is_pit(trap1.ttyp | 0)
        || (u_entering_trap2 && !((u.utrap | 0) && (u.utraptype | 0) === TT_PIT_)))
        return false;
    /* C hacklib.c sgn() */
    const dx = Math.sign((trap2.tx | 0) - (trap1.tx | 0));
    const dy = Math.sign((trap2.ty | 0) - (trap1.ty | 0));
    const diridx = xytodir(dx, dy);
    if (diridx !== DIR_ERR) {
        const adjidx = DIR_180(diridx);
        if (((trap1.conjoined | 0) & (1 << diridx))
            && ((trap2.conjoined | 0) & (1 << adjidx)))
            return true;
    }
    return false;
}
/* C ref: trap.c:6604 adj_nonconjoined_pit(adjtrap). */
function adj_nonconjoined_pit(adjtrap) {
    const u = game.u;
    const trap_with_u = t_at(u.ux0 | 0, u.uy0 | 0);

    if (trap_with_u && adjtrap && (u.utrap | 0) && (u.utraptype | 0) === TT_PIT_
        && is_pit(trap_with_u.ttyp | 0) && is_pit(adjtrap.ttyp | 0)) {
        if (xytodir(u.dx | 0, u.dy | 0) !== DIR_ERR)
            return true;
    }
    return false;
}

/* C ref: trap.c:1825-1963 trapeffect_pit — HERO branch (mtmp == &gy.youmonst).
 * The `else` half (monster) is already ported below as trapeffect_pit_mon.
 *
 * MEASURED, gen003-reseed-seed1194164 segment 0 step 21 (identical shape on
 * gen537-recombine-seed360077 step 54):
 *     ^multi[nomul=0]
 *     rn2(6)=1   @ trapeffect_pit(trap.c:1920)   <- set_utrap(rn1(6, 2), TT_PIT)
 *     ^botl[set_utrap]
 *     ^botl[float_vs_flight]
 *     rnd(6)=2   @ trapeffect_pit(trap.c:1950)   <- the pit-damage losehp
 *     ^botl[losehp]
 *     rn2(2)=1   @ exercise(attrib.c:509)        <- exercise(A_STR, FALSE)
 *     rn2(2)=0   @ exercise(attrib.c:509)        <- exercise(A_DEX, FALSE)
 * with C's topline "You swap places with your little dog.  You fall into a
 * pit!" against this port's "You swap places with your little dog." — the pit
 * half produced by
 *     You("%s into %s pit!", verbbuf, a_your[trap->madeby_u])     (trap.c:1891)
 * with verbbuf = "fall" and a_your[0] = "a".
 *
 * Note rn1(6, 2) IS the rn2(6) the recording names at :1920 — C's rn1(x, y) is
 * rn2(x) + y — so the LEAF is rn2(6) and the utrap timer is that value plus 2.
 * The two exercise() draws are rn2(2) each because inc_or_dec is FALSE
 * (attrib.c:509 `AEXE(i) += (inc_or_dec) ? (rn2(19) > ACURR(i)) : -rn2(2)`).
 *
 * ARMS NO RECORDED SESSION REACHES, written out so the shape is C's rather than
 * dropped: the Sokoban arms, the steed arms, and the SPIKED_PIT spike damage.
 * That last one is not a guess — trap.c:1925, the spiked-pit losehp, draws in
 * ZERO of 688 train sessions and ZERO of 44 public ones, so no recorded hero has
 * ever fallen into a SPIKED_PIT.  The two unreached arms that would consume RNG
 * are flagged inline where they sit. */
async function trapeffect_pit(trap, trflags) {
    const u = game.u;
    const ttype = trap.ttyp | 0;
    /* relevant_spikes is initially always true for spiked pits, but
       set to false if the spikes are found to not be relevant */
    let relevant_spikes = (ttype === SPIKED_PIT);

    const plunged = (trflags & _TOOKPLUNGE_T) !== 0;
    const viasitting = (trflags & _VIASITTING_BT) !== 0;
    const conj_pit = conjoined_pits(trap, t_at(u.ux0 | 0, u.uy0 | 0), true);
    const adj_pit = adj_nonconjoined_pit(trap);
    const already_known = trap.tseen ? true : false;
    let deliberate = false;
    const sokoban = In_sokoban(u?.uz);
    const youdata = _lo_hero_monst().data;

    /* C trap.c:1845-1848 suppresses the article in the steed messages when the
     * steed has a given name and the hero is not hallucinating.  This port has
     * no x_monnam(ARTICLE_*, SUPPRESS_SADDLE), and no corpus session has a
     * steed; the steed branches below name it with the same helper
     * trapeffect_bear_trap uses, and every one of them is RNG-free. */

    /* KMH -- You can't escape the Sokoban level traps */
    if (!sokoban && (uprop_active(LEVITATION)
                     || (uprop_active(FLYING) && !plunged && !viasitting)))
        return Trap_Effect_Finished;
    _feeltrap(trap);
    if (!sokoban && youdata && _imm_is_clinger(youdata) && !plunged) {
        if (already_known) {
            You(`see ${_a_your(trap.madeby_u)} `
                + `${ttype === SPIKED_PIT ? 'spiked ' : ''}pit below you.`);
        } else {
            await pline(`${_A_Your(trap.madeby_u)} pit `
                        + `${ttype === SPIKED_PIT ? 'full of spikes ' : ''}`
                        + `opens up under you!`);
            You("don't fall in!");
        }
        return Trap_Effect_Finished;
    }
    if (!sokoban) {
        let verbbuf = '';

        if (u.usteed) {
            if ((trflags & _RECURSIVETRAP_TR) !== 0)
                verbbuf = `and ${_monnam_safe(u.usteed)} fall`;
            else
                verbbuf = `lead ${_monnam_safe(u.usteed)}`;
        } else if (game.iflags?.menu_requested && already_known) {
            You(`carefully ${_u_locomotion_stub('lower yourself')} into the pit.`);
            deliberate = true;
        } else if (conj_pit) {
            You('move into an adjacent pit.');
        } else if (adj_pit) {
            You(`stumble over debris${!rn2(5) ? ' between the pits' : ''}.`);
        } else {
            verbbuf = !plunged ? 'fall' : (uprop_active(FLYING) ? 'dive' : 'plunge');
        }
        if (verbbuf)
            You(`${verbbuf} into ${_a_your(trap.madeby_u)} pit!`);
    }
    /* wumpus reference */
    if (_tr_Role_if(PM_RANGER) && !(trap.madeby_u | 0) && !(trap.once | 0)
        && In_quest(u?.uz) && _tr_Is_qlocate(u?.uz)) {
        await pline('Fortunately it has a bottom after all...');
        trap.once = 1;
    } else if ((u.umonnum | 0) === PM_PIT_VIPER
               || (u.umonnum | 0) === PM_PIT_FIEND) {
        await pline("How pitiful.  Isn't that the pits?");
    }
    if (relevant_spikes && _u_wearing_iron_shoes()) {
        await pline(`${Yname2(u.uarmf)} protects you from the sharp iron spikes.`);
        relevant_spikes = false;
    } else if (relevant_spikes) {
        const predicament = 'on a set of sharp iron spikes';

        if (u.usteed)
            await pline(`${_monnam_safe(u.usteed)} `
                        + `${conj_pit ? 'steps' : 'lands'} ${predicament}!`);
        else
            You(`${conj_pit ? 'step' : 'land'} ${predicament}!`);
    }
    /* FIXME:
     * if hero gets killed here, setting u.utrap in advance will
     * show "you were trapped in a pit" during disclosure's display
     * of enlightenment, but hero is dying *before* becoming trapped.
     */
    set_utrap(rn1(6, 2), TT_PIT_);
    if (!steedintrap(trap, null)) {
        if (relevant_spikes) {
            const oldumort = u.umortality | 0;

            await losehp(Maybe_Half_Phys_lo(rnd(conj_pit ? 4 : adj_pit ? 6 : 10)),
                   /* note: these don't need locomotion() handling;
                      if fatal while poly'd and Unchanging, the
                      death reason will be overridden with
                      "killed while stuck in creature form" */
                   plunged
                   ? 'deliberately plunged into a pit of iron spikes'
                   : (conj_pit || deliberate)
                     ? 'stepped into a pit of iron spikes'
                     : adj_pit
                       ? 'stumbled into a pit of iron spikes'
                       : 'fell into a pit of iron spikes',
                   NO_KILLER_PREFIX);
            if (!rn2(6)) {
                /* C trap.c:1939-1945
                 *     poisoned("spikes", A_STR,
                 *              (conj_pit || adj_pit || deliberate)
                 *              ? "stepping on poison spikes"
                 *              : "fall onto poison spikes",
                 *              (u.umortality > oldumort) ? 0 : 8, FALSE);
                 * WIRE_PENDING: poisoned() is a no-op stub (js/uhitm.js:5994)
                 * and DRAWS in C, so this branch would be short by however many
                 * leaves poisoned() consumes.  UNREACHED by every corpus we
                 * hold: the spiked-pit losehp one line above (trap.c:1925)
                 * appears in 0 of 688 train sessions and 0 of 44 public ones.
                 * The rn2(6) that GATES it is drawn here regardless, because
                 * C draws it regardless. */
                await poisoned_trap('spikes', A_STR,
                    (conj_pit || adj_pit || deliberate)
                        ? 'stepping on poison spikes' : 'fall onto poison spikes',
                    (u.umortality | 0) > oldumort ? 0 : 8, false);
            }
        } else {
            /* plunging flyers take spike damage but not pit damage */
            if (!conj_pit && !deliberate
                && !(plunged && (uprop_active(FLYING)
                                 || (youdata && _imm_is_clinger(youdata)))))
                await losehp(Maybe_Half_Phys_lo(rnd(adj_pit ? 3 : 6)),
                       plunged ? 'deliberately plunged into a pit'
                       : 'fell into a pit',
                       NO_KILLER_PREFIX);
        }
        if (_tr_Punished() && !_tr_carried(u.uball)) {
            /* C trap.c:1955-1959.  ballfall() itself owns the conditional
             * rn2(5)/damage sequence; the surrounding relocation is kept in
             * this order so the ball is never left detached. */
            unplacebc();
            await ballfall();
            await placebc();
        }
        if (!conj_pit)
            await selftouch('Falling, you');
        game.vision_full_recalc = 1; /* vision limits change */
        exercise(A_STR, false);
        exercise(A_DEX, false);
    }
    return Trap_Effect_Finished;
}

/* C ref: trap.c:4182-4229 climb_pit() — shared code for climbing out of a pit,
 * called from hack.c:1585 trapmove() (the TT_PIT arm) and do.c:1309 doup().
 *
 *     if (!u.utrap || u.utraptype != TT_PIT) return;
 *     pitname = trapname(PIT, FALSE);
 *     if (Passes_walls) { You("ascend from the %s.", pitname); reset_utrap(FALSE);
 *                         fill_pit(u.ux, u.uy); gv.vision_full_recalc = 1; }
 *     else if (!rn2(2) && sobj_at(BOULDER, u.ux, u.uy)) {
 *         Your("%s gets stuck in a crevice.", body_part(LEG));
 *         display_nhwindow(WIN_MESSAGE, FALSE); clear_nhwindow(WIN_MESSAGE);
 *         You("free your %s.", body_part(LEG));
 *     } else if ((Flying || is_clinger(gy.youmonst.data)) && !Sokoban) {
 *         You("%s from the %s.", u_locomotion("climb"), pitname);
 *         reset_utrap(FALSE); fill_pit(u.ux, u.uy); gv.vision_full_recalc = 1;
 *     } else if (!(--u.utrap) || m_easy_escape_pit(&gy.youmonst)) {
 *         reset_utrap(FALSE);
 *         You("%s to the edge of the %s.", ..., pitname);
 *         fill_pit(u.ux, u.uy); gv.vision_full_recalc = 1;
 *     } else if (u.dz || flags.verbose) { Norep(...); }
 *
 * THIS IS THE OTHER HALF OF THE PIT PORT AND WITHOUT IT THE FIRST HALF BUYS
 * ALMOST NOTHING.  js/cmd.js:45587 carried `function climb_pit() { }` — an empty
 * stub — and both of its call sites sit on the ordinary movement path, so on the
 * very next world turn after the hero is trapped C draws the `!rn2(2)` at
 * trap.c:4197 and this port drew nothing.  gen003 makes SEVEN such draws and
 * gen537 FOUR; gen003's first is thirteen steps after the fall:
 *     step 34 key "k":  rn2(2)=0 @ climb_pit(trap.c:4197)
 * m_easy_escape_pit (trap.c:3726) and fill_pit (trap.c:4010, boulder-free case)
 * are both RNG-free, and the Hallucination arm's `!rn2(5)` sits behind
 * `Hallucination &&` which C short-circuits — so a non-hallucinating hero draws
 * exactly one rn2(2) per attempt, which is what all 11 recorded draws are. */
export async function climb_pit() {
    const u = game.u;
    if (!u || !(u.utrap | 0) || (u.utraptype | 0) !== TT_PIT_)
        return;

    const pitname = _tr_trapname(PIT);
    const youdata = _lo_hero_monst().data;
    if (_tr_Passes_walls()) {
        /* marked as trapped so they can pick things up */
        You(`ascend from the ${pitname}.`);
        await reset_utrap(false);
        await fill_pit(u.ux | 0, u.uy | 0);
        game.vision_full_recalc = 1; /* vision limits change */
    } else if (!rn2(2) && sobj_at(BOULDER_OTYP, u.ux | 0, u.uy | 0)) {
        await pline(`Your ${body_part(LEG_TR)} gets stuck in a crevice.`);
        /* C: display_nhwindow(WIN_MESSAGE, FALSE); clear_nhwindow(WIN_MESSAGE);
         * — flush the topline and clear it before the follow-up.  No RNG. */
        You(`free your ${body_part(LEG_TR)}.`);
    } else if ((uprop_active(FLYING) || (youdata && _imm_is_clinger(youdata)))
               && !In_sokoban(u?.uz)) {
        /* eg fell in pit, then poly'd to a flying monster;
           or used '>' to deliberately enter it */
        You(`${_u_locomotion_stub('climb')} from the ${pitname}.`);
        await reset_utrap(false);
        await fill_pit(u.ux | 0, u.uy | 0);
        game.vision_full_recalc = 1; /* vision limits change */
    } else if (!(u.utrap = (u.utrap | 0) - 1) || _m_easy_escape_pit_u()) {
        await reset_utrap(false);
        You(`${(In_sokoban(u?.uz) && uprop_active(LEVITATION))
                ? 'struggle against the air currents and float'
                : u.usteed ? 'ride' : 'crawl'} to the edge of the ${pitname}.`);
        await fill_pit(u.ux | 0, u.uy | 0);
        game.vision_full_recalc = 1; /* vision limits change */
    } else if ((u.dz | 0) || (game.flags?.verbose ?? true)) {
        /* these should use 'pitname' rather than "pit" for hallucination
           but that would nullify Norep (this message can be repeated
           many times without further user intervention by using a run
           attempt to keep retrying to escape from the pit) */
        if (u.usteed)
            await Norep(`${_monnam_safe(u.usteed)} is still in a pit.`);
        else
            /* C's `(Hallucination && !rn2(5))` short-circuits on a
             * non-hallucinating hero, so no leaf is drawn there. */
            await Norep((_tr_Hallucination() && !rn2(5))
                        ? "You've fallen, and you can't get up."
                        : 'You are still in a pit.');
    }
}
/* C ref: trap.c:3726 m_easy_escape_pit(&gy.youmonst) — RNG-free.
 *     return (mtmp->data == &mons[PM_PIT_FIEND] || mtmp->data->msize >= MZ_HUGE);
 * For the hero, `youmonst.data == &mons[u.umonnum]`, so the identity compare on
 * the left is exactly `u.umonnum == PM_PIT_FIEND`. */
const MZ_HUGE_TR = 4; /* C monflag.h:182 MZ_HUGE */
function _m_easy_escape_pit_u() {
    const u = game.u;
    if ((u?.umonnum | 0) === PM_PIT_FIEND)
        return true;
    const pm = _lo_hero_monst().data;
    return !!pm && (pm.msize | 0) >= MZ_HUGE_TR;
}

/* trap.h trap-type ids — PIT = 11, SPIKED_PIT = 12 (same ordering used by
 * floor_trigger above). */
const PIT_T = 11;
const SPIKED_PIT_T = 12;
const M1_WALLWALK_T = 0x00000008; /* C monflag.h:88 M1_WALLWALK → passes_walls
                                   * (was 0x00080000, which is M1_SLITHY) */

/* trapeffect_pit (monster path) — C ref: trap.c:1965-2007 (the `else` branch of
 * trapeffect_pit, mtmp != &youmonst).  A monster (e.g. a pet stepping onto a
 * pit during dog_move) falls in and takes pit damage:
 *   relevant_spikes = (ttyp == SPIKED_PIT);
 *   if (!grounded(mptr) || worm>5segs) {                 // airborne escapes
 *       if (!inescapable) return Trap_Effect_Finished;   // no RNG
 *       ...sokoban "is dragged"...
 *   }
 *   if (!passes_walls(mptr)) mtmp->mtrapped = 1;
 *   mselftouch(...);                                     // no RNG for a non-wielder
 *   if (wearing_iron_shoes) relevant_spikes = FALSE;     // false for the corpus pet
 *   if (DEADMONSTER || thitm(0, mtmp, NULL,
 *                            rnd(relevant_spikes ? 10 : 6), FALSE)) trapkilled = TRUE;
 *   return trapkilled ? Trap_Killed_Mon
 *        : mtmp->mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
 * The single RNG draw is the rnd() pit-damage roll passed to thitm as d_override;
 * if it kills the monster, thitm → monkilled_trap fires corpse_chance/make_corpse. */
async function trapeffect_pit_mon(mtmp, trap) {
    const ttype = trap.ttyp | 0;
    let relevant_spikes = (ttype === SPIKED_PIT_T);
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    const row = (mndx >= 0 && mndx < _TRAP_MONS.length) ? _TRAP_MONS[mndx] : null;
    const mf1 = row ? (row[6] | 0) : 0;
    const mlet = row ? (row[0] | 0) : 0;
    /* C mondata.h:23-24
     *   grounded(ptr) = !is_flyer(ptr) && !is_floater(ptr)
     *                   && (!is_clinger(ptr) || !has_ceiling(&u.uz))
     * where (mondata.h:19/20/22)
     *   is_flyer   = mflags1 & M1_FLY   (monflag.h:85, 0x1)
     *   is_floater = mlet == S_EYE || mlet == S_LIGHT   -- a monster-CLASS test,
     *                NOT a flag test; there is no M1_FLOAT bit in C at all
     *   is_clinger = mflags1 & M1_CLING (monflag.h:89, 0x10)
     * A non-airborne monster (the corpus pet) is grounded → does NOT escape.
     * Worm-segment count never applies to a non-worm.  forcetrap/Sokoban are not
     * set on the dog_move mintrap path, so an airborne monster simply avoids the
     * pit with no RNG. */
    const is_flyer_pit = (mf1 & M1_FLY_T) !== 0;
    const is_floater_pit = (mlet === _IMM_S_EYE || mlet === _IMM_S_LIGHT);
    const is_clinger_pit = (mf1 & _IMM_M1_CLING) !== 0;
    const grounded = !is_flyer_pit && !is_floater_pit
        && (!is_clinger_pit || !_imm_has_ceiling(game.u?.uz));
    if (!grounded) {
        /* inescapable only via FORCETRAP/Sokoban, neither set here → avoid trap. */
        return Trap_Effect_Finished;
    }
    /* C trap.c:1988: if (!passes_walls(mptr)) mtmp->mtrapped = 1. */
    if ((mf1 & M1_WALLWALK_T) === 0) {
        mtmp.mtrapped = 1;
    }
    /* C trap.c:1989-1998 in_sight messaging (pline/seetrap) — screen-only, no RNG.
     * in_sight = canseemon(mtmp) || mtmp==u.usteed (no steed in corpus).  When
     * seen: pline_mon "%s %s into %s pit!" with fallverb="falls" (grounded
     * non-worm) and a_your[madeby_u] = "a" (generated dungeon pit, madeby_u=0) →
     * "The little dog falls into a pit!".  The PIT_VIPER/PIT_FIEND quip and the
     * seetrap glyph follow; seetrap is screen-only.  DISPLAY-ONLY, RNG-free. */
    const _pit_in_sight = canseemon(mtmp);
    if (_pit_in_sight) {
        void pline(`${Monnam_t(mtmp)} falls into a pit!`);
        /* C trap.c:2019 `seetrap(trap);` — after the pline, and it newsyms. */
        seetrap(trap);
    }
    /* C trap.c:1999 mselftouch — only consumes RNG if the monster wields a
     * cockatrice/chickatrice corpse; the corpus pet wields nothing. */
    /* C trap.c:2000 wearing_iron_shoes — false for a pet (no worn boots). */
    /* C trap.c:2001-2003: DEADMONSTER false (alive) → thitm with d_override =
     * rnd(relevant_spikes ? 10 : 6). */
    const dmg = rnd(relevant_spikes ? 10 : 6);
    const trapkilled = await thitm(0, mtmp, null, dmg, false);
    return trapkilled ? Trap_Killed_Mon
        : ((mtmp.mtrapped | 0) ? Trap_Caught_Mon : Trap_Effect_Finished);
}

/* C ref: trap.c:2013-2066 trapeffect_hole(mtmp, trap, trflags) — the MONSTER
 * arm (the `else` half; the hero half is fall_through(), still unported).
 *
 *     int tt = trap->ttyp;
 *     struct permonst *mptr = mtmp->data;
 *     boolean in_sight = canseemon(mtmp) || (mtmp == u.usteed);
 *     boolean forcetrap = ((trflags & FORCETRAP) != 0);
 *     boolean inescapable = (forcetrap || (Sokoban && !trap->madeby_u));
 *     if (!Can_fall_thru(&u.uz)) { impossible(...); return Trap_Effect_Finished; }
 *     if (!grounded(mptr) || (mtmp->wormno && count_wsegs(mtmp) > 5)
 *         || mptr->msize >= MZ_HUGE) {
 *         if (forcetrap && !Sokoban) { ...messages...; return Trap_Effect_Finished; }
 *         if (inescapable) { ..."seems to be yanked down!"... }
 *         else return Trap_Effect_Finished;
 *     }
 *     return trapeffect_level_telep(mtmp, trap, trflags);
 *
 * This arm was MISSING from trapeffect_selector_mon, so a monster that walked
 * onto a trapdoor simply stood on it: it stayed in fmon, dochug then fired the
 * post-move distfleeck recalc that C skips for a monster whose m_move returned
 * MMOVE_DIED (monmove.c:914), and the NEXT turn's mcalcmove loop allocated
 * movement to a monster C had already migrated off the level.  Exactly the
 * shape of the MAGIC_PORTAL gap fixed for seed0360, one trap type over.
 *
 * MEASURED, seed0030 segment 6 (Priest, seed 37) turn 93 / step 118 key "k":
 * the giant rat m_id=164 walks east onto the TRAPDOOR at (45,12) of Dlvl 3.
 * C's leaves for that turn are 3x rn2(5) @distfleeck, rn2(12) @m_move
 * (monmove.c:1963) and then ONE rn2(12) @mcalcmove; this port drew a FOURTH
 * rn2(5) @distfleeck and TWO rn2(12) @mcalcmove — the first divergence of the
 * whole segment, at leaf 15369.  Verified against a locally re-recorded C run
 * with NETHACK_EVENTLOG=1: `^movemon_turn[89#164@44,12 ...]`, one
 * `^distfleeck[89#164@44,12 ...]`, the m_move draw, and then only
 * `^mcalcmove[271@72,17 ...]` — the rat is gone from fmon.
 * The whole chain consumes NO RNG: it is a monster-chain fault, and it shows up
 * on the RNG axis only as the draws C does NOT make. */
export async function trapeffect_hole_mon(mtmp, trap, trflags) {
    const tt = trap.ttyp | 0;
    const mptr = mtmp.data;
    const u = game.u;
    const in_sight = canseemon(mtmp) || (mtmp === u?.usteed);
    const forcetrap = ((trflags & FORCETRAP) !== 0);
    const sokoban = In_sokoban(u?.uz);
    const inescapable = (forcetrap || (sokoban && !trap.madeby_u));

    if (!Can_fall_thru(u?.uz)) {
        /* C: impossible("mintrap: %ss cannot exist on this level.") — pline
         * only, then don't activate the trap after all. */
        return Trap_Effect_Finished;
    }
    /* C mondata.h:23-24 grounded(ptr) — the same three terms trapeffect_pit_mon
     * spells out above; sourced through the _imm_* helpers so there is one
     * definition of is_floater (a CLASS test, not a flag) in this file. */
    const grounded = !_imm_is_flyer(mptr) && !_imm_is_floater(mptr)
        && (!_imm_is_clinger(mptr) || !_imm_has_ceiling(u?.uz));
    const wormtoolong = ((mtmp.wormno | 0) !== 0 && count_wsegs(mtmp) > 5);
    if (!grounded || wormtoolong
        || trap_msize((mtmp.mndx ?? mtmp.mnum ?? -1) | 0) >= _WORN_MZ_HUGE) {
        if (forcetrap && !sokoban) {
            /* openfallingtrap; not inescapable here */
            if (in_sight) {
                seetrap(trap);
                if (tt === TRAPDOOR)
                    void pline(`A trap door opens, but ${mon_nam(mtmp)} doesn't fall through.`);
                else /* (tt == HOLE) */
                    void pline(`${Monnam_t(mtmp)} doesn't fall through the hole.`);
            }
            return Trap_Effect_Finished; /* inescapable = FALSE; */
        }
        if (inescapable) { /* sokoban hole */
            if (in_sight) {
                void pline(`${Monnam_t(mtmp)} seems to be yanked down!`);
                seetrap(trap);
            }
        } else {
            return Trap_Effect_Finished;
        }
    }
    return await trapeffect_level_telep_mon(mtmp, trap, trflags);
}

/* C ref: trap.c:2086-2102 trapeffect_level_telep(mtmp, trap, trflags) — the
 * MONSTER arm only (the hero arm is seetrap + level_tele_trap, unported):
 *     boolean in_sight = canseemon(mtmp) || (mtmp == u.usteed);
 *     boolean forcetrap = ((trflags & FORCETRAP) != 0);
 *     return mlevel_tele_trap(mtmp, trap, forcetrap, in_sight);
 * Reached from trapeffect_hole's tail and (once ported) from the LEVEL_TELEP
 * arm of trapeffect_selector. */
async function trapeffect_level_telep_mon(mtmp, trap, trflags) {
    const in_sight = canseemon(mtmp) || (mtmp === game.u?.usteed);
    const forcetrap = ((trflags & FORCETRAP) !== 0);
    return await mlevel_tele_trap(mtmp, trap, forcetrap, in_sight);
}

/* C ref: trap.c:2936 trapeffect_selector (monster path) — synchronous variant
 * used by mintrap.  Mirrors the same switch but dispatches only the monster
 * branches of each leaf, which consume RNG but no async screen I/O.  Unported
 * types fall through to Trap_Effect_Finished. */
/* C ref: trap.c:2527-2655 trapeffect_landmine(mtmp, trap, trflags) — the
 * MONSTER arm (trap.c:2598-2654).  The hero arm is a separate, much longer
 * branch and is NOT ported here; trapeffect_selector's hero side still falls
 * through to its default, exactly as before.
 *
 * The two draws at the top are C's, in C's order and before any decision:
 *   trap.c:2533  int damage = rnd(16);
 *   trap.c:2606  if (rn2(mtmp->data->cwt + 1) < MINE_TRIGGER_WT) return;
 * MINE_TRIGGER_WT is WT_ELF / 2 = 400 (weight.h:23).  `mtmp.data.cwt` is one of
 * the permonst fields js/makemon.js's template does NOT source (it is undefined
 * on a live monster, see js/struct_reconstructor.js:1149), so the weight comes
 * from MONS_CWT — the same js/eat_corpse_data.json column js/mklev.js already
 * uses for corpse weight — indexed by the monster's mons[] row.
 *
 * The ordinary-floor detonation path below uses dokick.js's scatter port, then
 * converts the mine to the pit used by C's recursive mintrap call. */
async function trapeffect_landmine_mon(mtmp, trap, trflags) {
    /* C trap.c:2533-2537 — rolled BEFORE the hero/monster split. */
    let damage = rnd(16);
    if (_wearing_iron_shoes(mtmp))
        damage = Math.trunc((damage + 3) / 4);
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    const cwt = (mndx >= 0 && mndx < MONS_CWT.length) ? (MONS_CWT[mndx] | 0) : 0;
    const MINE_TRIGGER_WT = 400; /* WT_ELF / 2u, weight.h:23 */
    /* C trap.c:2604-2607 — "heavier monsters are more likely to set off a land
     * mine; on the other hand, any mon lighter than the trigger weight is
     * immune". */
    if (rn2(cwt + 1) < MINE_TRIGGER_WT)
        return Trap_Effect_Finished;

    /* C trap.c:2608-2633 — report a triggered mine before blow_up_landmine().
     * This message is independent of the still-unported scatter/damage tail.
     * In the out-of-sight, hearing case it is also the next pline after any
     * earlier monster-action message, so update_topl() can page that earlier
     * message before painting this one. */
    const in_sight = canseemon(mtmp) || (mtmp === game.u?.usteed);
    if (!in_sight && !_hero_Deaf())
        void pline('Kaablamm!  You hear an explosion in the distance!');

    /* C trap.c:3172-3218 blow_up_landmine(), ordinary-floor arm. */
    const tx = trap.tx | 0, ty = trap.ty | 0;
    await scatter(tx, ty, 4,
        MAY_DESTROY | MAY_HIT | MAY_FRACTURE | VIS_EFFECTS, null);
    del_engr_at(tx, ty);
    wake_nearto(tx, ty, 400);
    const liveTrap = t_at(tx, ty);
    if (liveTrap) {
        liveTrap.ttyp = PIT;
        liveTrap.madeby_u = 0;
        seetrap(liveTrap);
    }
    await fill_pit(tx, ty);
    recalc_block_point(tx, ty);

    let trapkilled = (mtmp.mhp | 0) < 1;
    if (!trapkilled)
        trapkilled = await thitm(0, mtmp, null, damage, false);
    if (!trapkilled
        && await mintrap(mtmp, trflags | FORCETRAP) === Trap_Killed_Mon)
        trapkilled = true;
    await fill_pit(tx, ty);
    if ((mtmp.mhp | 0) < 1)
        trapkilled = true;
    return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
        ? Trap_Caught_Mon : Trap_Effect_Finished;
}
/* C ref: trap.c:2323-2446 trapeffect_anti_magic — the MONSTER arm (the `else`
 * branch at trap.c:2399-2444; the `mtmp == &gy.youmonst` branch above it is
 * dotrap's, not mintrap's). This case was entirely MISSING from
 * trapeffect_selector_mon's switch (ANTI_MAGIC fell to `default`, consuming
 * ZERO RNG where C draws d(2,6) or up to two rnd(4)s). mintrap.jsonl record
 * 218 of 300 (of this board): a single mspec_used drain, d(2,6)=2, no other
 * state change. Record 223: the damage arm kills the monster and
 * monkilled_trap's corpse roll grows fobj (fobj.count 16->17).
 *
 * NOT ported: the `wearing_iron_shoes` branch (trap.c:2331-2343, RNG-free —
 * this port's `_wearing_iron_shoes` is a hardcoded-false stub used file-wide,
 * see trap.js:4041, so the branch is structurally unreached already) and the
 * rare "carries a non-quest artifact defending against AD_MAGM" +rnd(4) bonus
 * (trap.c:2422-2427, needs artifact.c's defends_when_carried gated on AD_MAGM
 * specifically — not exported from js/mhitm.js — a narrow edge case, not
 * guessed at). */
async function trapeffect_anti_magic_mon(mtmp, trap) {
    const in_sight = canseemon(mtmp) || mtmp === game.u?.usteed;
    const see_it = cansee(mtmp.mx | 0, mtmp.my | 0);
    const mptr = mtmp.data;
    let trapkilled = false;

    if (!resists_magm(mtmp)) {
        /* C trap.c:2405-2413 — lose spell energy if the monster can cast a
         * spell or breathe (and isn't cancelled). */
        if (!mtmp.mcan
            && (attacktype(mptr, _IMM_AT_MAGC) || attacktype(mptr, _IMM_AT_BREA))) {
            mtmp.mspec_used = (mtmp.mspec_used | 0) + d(2, 6);
            if (in_sight) {
                seetrap(trap);
                void pline(`${Monnam_t(mtmp)} seems lethargic.`);
            }
        }
    } else {
        /* C trap.c:2415-2437 — take compression damage. */
        let dmgval2 = rnd(4);
        const wep = mtmp.mw;
        if (wep && (wep.oartifact | 0) === ART_MAGICBANE_TAM)
            dmgval2 += rnd(4);
        if (_gp_passes_walls(mptr))
            dmgval2 = Math.trunc((dmgval2 + 3) / 4);

        if (in_sight)
            seetrap(trap);
        mtmp.mhp = (mtmp.mhp | 0) - dmgval2;
        if ((mtmp.mhp | 0) < 1) {
            await monkilled_trap(mtmp, in_sight
                ? 'compression from an anti-magic field' : null);
            trapkilled = true;
        }
        if (see_it)
            newsym(trap.tx | 0, trap.ty | 0);
    }
    return trapkilled ? Trap_Killed_Mon
        : (mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished);
}
const ART_MAGICBANE_TAM = 8; /* artilist.h ARTI_ENUM ordinal — js/makemon.js:2893 */
/* C ref: trap.c:2451-2519 trapeffect_poly_trap — the MONSTER arm (the `else`
 * branch, trap.c:2495-2517). This case was entirely MISSING from
 * trapeffect_selector_mon's switch (POLY_TRAP fell to `default`, consuming
 * ZERO RNG where C draws through resist()+newcham()). mintrap.jsonl records
 * 267/271/276/278 of 300 (of this board).
 *
 * NOT ported: the `wearing_iron_shoes` re-equip branch (trap.c:2496-2510) —
 * `_wearing_iron_shoes` is a hardcoded-false stub used file-wide (trap.js
 * :4041), so this arm is structurally unreached, and poly_obj (the object
 * itself changing type) has no js/ port to call even if it were reached. */
async function trapeffect_poly_trap_mon(mtmp, trap) {
    const in_sight = canseemon(mtmp) || mtmp === game.u?.usteed;

    if (_wearing_iron_shoes(mtmp)) {
        /* documented gap above — structurally unreached by this port */
    } else if (resists_magm(mtmp)) {
        await shieldeff_mon(mtmp);
    } else if (!await resist(mtmp, WAND_CLASS_TAM, 0, NOTELL)) {
        await newcham(mtmp, null, NC_SHOW_MSG);
        if (in_sight)
            seetrap(trap);
    }
    return Trap_Effect_Finished;
}
const WAND_CLASS_TAM = 11; /* objclass.h WAND_CLASS — js/zap.js:268 */
/* C mon.c:6068 shieldeff_mon, used by the polymorph-trap resistance arm. */
async function shieldeff_mon(mon) {
    const x = mon.mx | 0, y = mon.my | 0;
    shieldeff(x, y);
    if (cansee(x, y)) {
        game.a11y = game.a11y || {};
        game.a11y.msg_loc = { x, y };
        await pline(`${Monnam(mon)} resists!`);
    }
}
async function trapeffect_selector_mon(mtmp, trap, trflags) {
    if (typeof process !== 'undefined' && ENV?.FF_TRAP_TRACE === '1') {
        pushRngLogEntry(`^trap_trace[id=${mtmp?.m_id | 0} mndx=${mtmp?.mndx ?? mtmp?.data?.pmidx ?? -1}`
            + ` xy=${mtmp?.mx | 0},${mtmp?.my | 0} txy=${trap?.tx | 0},${trap?.ty | 0} typ=${trap?.ttyp | 0}]`);
    }
    switch (trap.ttyp | 0) {
        case ARROW_TRAP:
            return await trapeffect_arrow_trap_mon(mtmp, trap);
        case DART_TRAP:
            return await trapeffect_dart_trap_mon(mtmp, trap);
        case BEAR_TRAP:
            return await trapeffect_bear_trap_mon(mtmp, trap, trflags);
        case ROCKTRAP:
            return await trapeffect_rocktrap_mon(mtmp, trap);
        case PIT_T:
        case SPIKED_PIT_T:
            return await trapeffect_pit_mon(mtmp, trap);
        case MAGIC_TRAP:
            /* C trap.c:2315: monster on a magic trap is usually immune; rn2(21)==0
             * routes to the fire trap. */
            if (!rn2(21)) {
                return await trapeffect_fire_trap_mon(mtmp, trap);
            }
            return Trap_Effect_Finished;
        case TELEP_TRAP: {
            /* C trap.c:2077-2082 — the monster arm of trapeffect_telep_trap.
             * This case used to return Trap_Effect_Finished with a
             * WIRE_PENDING note: mtele_trap draws (rloc), and the return value
             * is what makes dochug skip its post-move distfleeck recalc.  Both
             * are ported now — see mtele_trap in js/teleport.js. */
            const in_sight = canseemon(mtmp) || (mtmp === game.u?.usteed);
            await mtele_trap(mtmp, trap, in_sight);
            return Trap_Moved_Mon;
        }
        case RUST_TRAP:
            /* C trap.c:2955-2956 trapeffect_selector -> trapeffect_rust_trap.
             * This arm was MISSING, so a monster stepping onto a rust trap fell
             * through to `default` and consumed NOTHING where C draws the
             * rn2(5) at trap.c:1663 that picks which body part the gush hits.
             * The hole hid because JS's next draw was distfleeck's own rn2(5) at
             * the same stream position -- same call, same modulus, same value --
             * so it only surfaced two leaves later.  See trapeffect_rust_trap_mon
             * for the three-session measurement. */
            return await trapeffect_rust_trap_mon(mtmp, trap, trflags);
        case SLP_GAS_TRAP:
            /* C trap.c:2951 trapeffect_selector → trapeffect_slp_gas_trap.
             * This arm was MISSING, so a monster stepping onto a sleeping gas
             * trap fell through to `default` and consumed nothing where C
             * draws rnd(25) at trap.c:1584 — even though
             * trapeffect_slp_gas_trap_mon was already written just below.  It
             * could not be wired before because its sleep_monst() leaf was a
             * throwing stub; that leaf is ported above now.
             * Measured on seed0360-wizard-world-tour: a hell hound steps on the
             * SLP_GAS_TRAP at (40,10) of Dlvl 41 on turn 27 and C's rnd(25)=8
             * is the session's first RNG divergence once the two upstream
             * defects in this chain (monmove's missing squeaky-board
             * wake_nearto and mklev's non-reusing maketrap) are fixed. */
            return await trapeffect_slp_gas_trap_mon(mtmp, trap);
        case FIRE_TRAP:
            /* C trap.c:2957 trapeffect_selector -> trapeffect_fire_trap.  This
             * arm was MISSING, so a monster on a fire trap consumed nothing
             * where C draws six leaves (see trapeffect_fire_trap_mon). */
            return await trapeffect_fire_trap_mon(mtmp, trap);
        case LANDMINE:
            /* C trap.c:2979 trapeffect_selector -> trapeffect_landmine.  This
             * arm was MISSING, so a monster that walked onto a land mine fell
             * through to `default` and consumed NOTHING where C draws two
             * leaves before it even decides whether the mine goes off.
             * MEASURED on seed0014-dequa-fountain-explore, global leaf 50259:
             * C draws rnd(16)=4 @trapeffect_landmine(trap.c:2533) and then
             * rn2(651)=313 @trapeffect_landmine(trap.c:2606) -- the
             * trigger-weight roll for a 650-weight monster -- and 313 is under
             * MINE_TRIGGER_WT (400), so the mine does NOT go off and C returns.
             * This port went straight on to the next monster's distfleeck. */
            return await trapeffect_landmine_mon(mtmp, trap, trflags);
        case ROLLING_BOULDER_TRAP:
            /* C trap.c:2960 → trapeffect_rolling_boulder_trap; the monster arm
             * is trap.c:2081-2104.  This case was MISSING, so a monster on a
             * rolling boulder trap fell through to `default` and consumed
             * nothing where C launches a boulder (see the note on
             * trapeffect_rolling_boulder_trap_mon). */
            return await trapeffect_rolling_boulder_trap_mon(mtmp, trap);
        case WEB:
            return trapeffect_web_mon(mtmp, trap, trflags);
        case HOLE:
        case TRAPDOOR:
            /* C trap.c:2962-2964 trapeffect_selector:
             *     case HOLE: case TRAPDOOR:
             *         return trapeffect_hole(mtmp, trap, trflags);
             * See trapeffect_hole_mon for the seed0030 segment-6 measurement. */
            return await trapeffect_hole_mon(mtmp, trap, trflags);
        case LEVEL_TELEP:
            /* C trapeffect_level_telep shares the monster migration engine
             * with magic portals, including visibility and forced-trap flags. */
        case MAGIC_PORTAL:
            /* C trap.c:2709-2722 trapeffect_magic_portal — the monster arm is
             * `return trapeffect_level_telep(mtmp, trap, trflags);`, and
             * trapeffect_level_telep's monster arm (trap.c:2096-2101) is
             *     in_sight = canseemon(mtmp) || (mtmp == u.usteed);
             *     forcetrap = ((trflags & FORCETRAP) != 0);
             *     return mlevel_tele_trap(mtmp, trap, forcetrap, in_sight);
             * This arm was MISSING, so a monster that walked onto a magic
             * portal simply stood on it: it stayed on the level, and dochug
             * then fired the post-move distfleeck recalc that C skips for a
             * monster whose m_move returned MMOVE_DIED (monmove.c:914).  One
             * extra rn2(5) — measured as seed0360-wizard-world-tour's whole
             * first divergence at leaf 101022 (session step 399), where C
             * portals the wraith #4045 off the quest home level at (66,13).
             * mlevel_tele_trap draws no RNG on this path outside the endgame. */
            return await mlevel_tele_trap(mtmp, trap,
                                    (trflags & FORCETRAP) !== 0,
                                    canseemon(mtmp) || mtmp === game.u?.usteed);
        case ANTI_MAGIC:
            /* C trap.c:2965-2966 trapeffect_selector -> trapeffect_anti_magic.
             * This arm was MISSING; see trapeffect_anti_magic_mon. */
            return await trapeffect_anti_magic_mon(mtmp, trap);
        case POLY_TRAP:
            /* C trap.c:2973-2974 trapeffect_selector -> trapeffect_poly_trap.
             * This arm was MISSING; see trapeffect_poly_trap_mon. */
            return await trapeffect_poly_trap_mon(mtmp, trap);
        default:
            return Trap_Effect_Finished;
    }
}
/* C youprop.h:125 `#define Deaf (HDeaf || EDeaf || u.uroleplay.deaf)`.
 * HDeaf is u.HDeaf in this port (js/eat.js:1177 writes it, js/allmain.js:1593
 * counts it down); the uprops[DEAF] slot is the other spelling some code uses,
 * so both are read, exactly as js/shk.js:_shk_Deaf does.  NOTE the `_lo_deaf()`
 * helper further up this file reads ONLY the uprops slot; it is left alone
 * because changing it would move behaviour this commit is not measuring. */
function _hero_Deaf() {
    const u = game.u;
    if (!u) return false;
    const p = u.uprops?.[DEAF_LO];
    return !!((p?.intrinsic | 0) || (p?.extrinsic | 0)
              || (u.HDeaf | 0)
              || (u.uroleplay?.deaf ? 1 : 0));
}
/* C timeout.h incr_itimeout(&HDeaf, incr) — add to the TIMEOUT bits of the
 * intrinsic without disturbing the FROMOUTSIDE-style flag bits.  HDeaf is the
 * plain u.HDeaf counter here (js/eat.js:1177 adds to it the same way), so the
 * mask work C does on a long property word collapses to an add. */
function _incr_HDeaf(incr) {
    const u = game.u || (game.u = {});
    u.HDeaf = (u.HDeaf | 0) + (incr | 0);
    game.disp = game.disp || {};
    game.disp.botl = 1; /* C: disp.botl = TRUE */
}
/* C ref: trap.c:4316 domagictrap() — the magic trap's random effect.
 *
 * `int fate = rnd(20);` is the FIRST thing C does, and the stub this replaces
 * drew nothing at all, so every session that stepped on a magic trap lost a
 * draw and everything after it.  seed0030 segment 9 step 120 is that: C draws
 * rnd(20)=11 at trap.c:4319, and the two set_apparxy rn2(3) draws C makes on
 * the very next turn are the CONSEQUENCE of fate 11 — the hero turns invisible,
 * so every monster that cannot see through invisibility starts guessing where
 * the hero is.
 *
 * Ported arms: the rnd(20) itself, `fate < 10` (nine of the twenty faces — the
 * modal outcome of every magic trap), and the RNG-free message/property arms
 * (10, 11, 13, 14, 16, 17, 18), plus fate 19 charisma and nearby taming
 * and fate 20 remove curse with temporarily cleared confusion.
 * Documented GAPS, each of which draws further
 * RNG or reaches an unported subsystem, and each of which behaves exactly as
 * the stub did:
 *   fate == 12 — dofiretrap()
 *   fate == 15 — needs on_level(qstart_level) / at_dgn_entrance("The Quest")
 */
async function domagictrap() {
    const u = game.u;
    const fate = rnd(20);

    if (fate < 10) {
        /* C trap.c:4322-4352 — "Most of the time, it creates some monsters."
         *
         *     int cnt = rnd(4);
         *     if (!resists_blnd(&gy.youmonst)) {
         *         You("are momentarily blinded by a flash of light!");
         *         make_blinded((long) rn1(5, 10), FALSE);
         *         if (!Blind) Your1(vision_clears);
         *     } else if (!Blind) {
         *         You_see("a flash of light!");
         *     }
         *     if (!Deaf) {
         *         Soundeffect(se_deafening_roar_atmospheric, 100);
         *         You_hear("a deafening roar!");
         *         incr_itimeout(&HDeaf, rn1(20, 30));
         *         disp.botl = TRUE;
         *     } else {
         *         You_feel("rankled.");
         *         incr_itimeout(&HDeaf, rn1(5, 15));
         *         disp.botl = TRUE;
         *     }
         *     while (cnt--) (void) makemon((struct permonst *) 0, u.ux, u.uy,
         *                                  NO_MM_FLAGS);
         *     wake_nearto(u.ux, u.uy, 7 * 7);
         *
         * The rnd(4) is drawn BEFORE either message arm, and both rn1()s are
         * argument evaluation attributed to trap.c:4330 and :4341 — so the
         * order is rnd(4), rn2(5), rn2(20), then the monsters.  Witness
         * gen413-reseed-seed565607 step 614: C draws rnd(20)=8, rnd(4)=2,
         * rn2(5)=1 @4330, rn2(20)=13 @4341 and then two makemon placements,
         * while this arm returned after the rnd(20) and the stream never
         * recovered. */
        let cnt = rnd(4);
        if (!_u_resists_blnd()) {
            await pline('You are momentarily blinded by a flash of light!');
            make_blinded(rn1(5, 10), false);
            /* C: `if (!Blind) Your1(vision_clears);` — re-read AFTER
             * make_blinded, so it fires only when the hero resisted going
             * blind (Blind_thitu is this file's copy of the Blind macro). */
            if (!Blind_thitu())
                await pline('Your vision quickly clears.');
        } else if (!Blind_thitu()) {
            /* C pline.c You_see() — YouPrefix(tmp, "You see ", line). */
            await pline('You see a flash of light!');
        }
        if (!_hero_Deaf()) {
            /* C trap.c:4340 You_hear("a deafening roar!") — the whole call, not
             * a hand-inlined prefix plus a hand-inlined half of the guard.  The
             * `!_hero_Deaf()` test above is C's own (trap.c:4337 `if (!Deaf)`)
             * and is kept; You_hear re-tests it, which is what C does too. */
            await You_hear('a deafening roar!');
            _incr_HDeaf(rn1(20, 30));
        } else {
            /* C pline.c You_feel() — YouPrefix(tmp, "You feel ", line). */
            await pline('You feel rankled.');
            _incr_HDeaf(rn1(5, 15));
        }
        const u = game.u || {};
        while (cnt--)
            await makemon(null, u.ux | 0, u.uy | 0, 0 /* NO_MM_FLAGS */);
        /* C: roar — wake monsters in vicinity, AFTER placing the new ones. */
        wake_nearto(u.ux | 0, u.uy | 0, 7 * 7);
        return;
    }
    switch (fate) {
    case 10:
        /* C trap.c:4360: sometimes nothing happens */
        break;
    case 11: { /* C trap.c:4362-4381 — toggle intrinsic invisibility */
        /* C: Soundeffect(se_low_hum, 100); You_hear("a low hum."); */
        await pline('You hear a low hum.');
        /* C youprop.h: Invis = (HInvis || EInvis) && !BInvis, read the same way
         * js/monmove.js:1996 set_apparxy reads it — set_apparxy is precisely the
         * consumer this arm exists to feed. */
        const ip = u?.uprops?.[INVIS];
        const HInvis = (ip?.intrinsic | 0) || (u?.HInvis | 0);
        const EInvis = ip?.extrinsic | 0;
        const BInvis = ip?.blocked | 0;
        const Invis = !!((HInvis || EInvis) && !BInvis);
        const Blind = !!(u?.uprops?.[BLINDED]?.intrinsic || u?.uprops?.[BLINDED]?.extrinsic);
        if (!Invis) {
            if (!Blind)
                await self_invis_message();
        } else if (!EInvis /* && !pm_invisible(youmonst.data): no corpus poly */) {
            if (!Blind) {
                const See_invisible = !!(u?.uprops?.[SEE_INVIS]?.intrinsic
                                         || u?.uprops?.[SEE_INVIS]?.extrinsic);
                if (!See_invisible)
                    await pline('You can see yourself again!');
                else
                    await pline("You can't see through yourself anymore.");
            }
        } else {
            /* C: You_feel("a little more %s now.", HInvis ? "obvious" : "hidden") */
            await pline(`You feel a little more ${HInvis ? 'obvious' : 'hidden'} now.`);
        }
        /* C trap.c:4379: HInvis = HInvis ? 0 : HInvis | FROMOUTSIDE; */
        if (u) {
            u.HInvis = HInvis ? 0 : (HInvis | FROMOUTSIDE);
            /* Keep the uprops mirror in step: this port reads the property both
             * ways (u.HInvis in the Invis macro copies, uprops[INVIS] in the
             * potion / see-invisible paths), and a writer that updates only one
             * of them leaves the two disagreeing. */
            if (!u.uprops) u.uprops = {};
            if (!u.uprops[INVIS]) u.uprops[INVIS] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
            u.uprops[INVIS].intrinsic = u.HInvis;
            newsym(u.ux | 0, u.uy | 0);
        }
        break;
    }
    case 12:
        /* C trap.c:4384: the magic trap's fire outcome reuses the floor
         * fire-trap routine.  Keep this await at the call site: dofiretrap
         * emits blocking messages and its damage path may cross async
         * monster/item effects. */
        await dofiretrap(null);
        break;
    case 13:
        /* C trap.c:4388 — body_part(SPINE) is "spine" for a human hero. */
        await pline('A shiver runs up and down your spine!');
        break;
    case 14:
        await pline(_halluc_dmt() ? 'You hear the moon howling at you.'
                                  : 'You hear distant howling.');
        break;
    case 15:
        /* GAP — see the header. */
        break;
    case 16:
        await pline('Your pack shakes violently!');
        break;
    case 17:
        await pline(_halluc_dmt() ? 'You smell hamburgers.' : 'You smell charred flesh.');
        break;
    case 18:
        await pline('You feel tired.');
        break;
    case 19: {
        /* C trap.c:4422-4432: gain charisma, then tame monsters in the
         * surrounding 3x3 square. */
        adjattrib(A_CHA, 1, 0);
        for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
            if (!isok((u.ux | 0) + i, (u.uy | 0) + j)) continue;
            const mtmp = m_at((u.ux | 0) + i, (u.uy | 0) + j);
            if (mtmp) await tamedog(mtmp, null, true);
        }
        break;
    }
    case 20: {
        /* C trap.c:4433-4446 — a zeroed pseudo spellbook invokes the real
         * remove-curse effect without identifying a scroll.  Temporarily
         * clear HConfusion so this trap never runs the confused effect. */
        const pseudo = { otyp: 395 /* SPE_REMOVE_CURSE */,
                         oclass: 10 /* SPBOOK_CLASS */,
                         blessed: 0, cursed: 0, oextra: null };
        u.uprops ??= [];
        const confusion = u.uprops[CONFUSION] ??= { intrinsic: 0, extrinsic: 0, blocked: 0 };
        const saveConfusion = confusion.intrinsic;
        confusion.intrinsic = 0;
        try {
            await seffects(pseudo);
        } finally {
            confusion.intrinsic = saveConfusion;
        }
        break;
    }
    default:
        break;
    }
}

/* C youprop.h Hallucination — read exactly as js/potion.js self_invis_message
 * reads it (HALLUC intrinsic, minus HALLUC_RES). */
function _halluc_dmt() {
    const u = game.u;
    const h = u?.uprops?.[HALLUC]?.intrinsic || 0;
    const r = (u?.uprops?.[HALLUC_RES_DMT]?.intrinsic || 0)
        || (u?.uprops?.[HALLUC_RES_DMT]?.extrinsic || 0);
    return !!(h && !r);
}
/* ---------------------------------------------------------------------------
 * mintrap — trigger a trap for a monster
 * C ref: nethack-c/src/trap.c:3713
 *   int mintrap(struct monst *mtmp, unsigned mintrapflags)
 *
 * Monster analog of dotrap — called when a monster steps on a trap.
 * Calls t_at(mtmp->mx, mtmp->my) and dispatches to trapeffect_selector.
 * RNG: rn2(40) for trapped-escape check, plus downstream trapeffect_* RNG.
 * TODO: port full monster trap dispatch.
 * ---------------------------------------------------------------------------
 */

const NOWEBMSG = 0x02;

/* ---------------------------------------------------------------------------
 * closeholdingtrap — close a holding trap (bear trap or web) on a monster
 * C ref: nethack-c/src/trap.c:6189
 *   boolean closeholdingtrap(struct monst *mon, boolean *noticed)
 *
 * Used for magic locking; returns true if targeted monster (which might
 * be hero) gets hit by a trap (might avoid actually becoming trapped).
 * ---------------------------------------------------------------------------
 */
export async function closeholdingtrap(mon, noticed) {
    /* boolean ishero = (mon == &gy.youmonst), result; */
    let ishero = (mon === game.youmonst);
    let result;

    if (!mon)
        return false;
    /* if (mon == u.usteed) ishero = TRUE; */
    if (mon === (game.u && game.u.usteed))
        ishero = true;
    const mx = ishero ? (game.u.ux | 0) : (mon.mx | 0);
    const my = ishero ? (game.u.uy | 0) : (mon.my | 0);
    const t = t_at(mx, my);
    /* if no trap here or it's not a holding trap, we're done */
    if (!t || (t.ttyp !== BEAR_TRAP && t.ttyp !== WEB))
        return false;

    if (ishero) {
        if (game.u && game.u.utrap)
            return false; /* already trapped */
        noticed.value = true;
        let dotrapflags = FORCETRAP;
        /* dotrap calls mintrap when mounted hero encounters a web */
        if (game.u && game.u.usteed)
            dotrapflags |= NOWEBMSG;
        await dotrap(t, dotrapflags | FORCETRAP);
        result = (game.u && game.u.utrap !== 0);
    } else {
        if (mon.mtrapped)
            return false; /* already trapped */
        /* you notice it if you see the trap close/tremble/whatever
           or if you sense the monster who becomes trapped */
        noticed.value = cansee(t.tx, t.ty) || canspotmon(mon);
        result = (await mintrap(mon, FORCETRAP) !== Trap_Effect_Finished);
    }
    return result;
}

export async function openholdingtrap(mon, noticed) {
    /* C: boolean ishero = (mon == &gy.youmonst); */
    let ishero = (mon === game.youmonst);

    if (!mon)
        return false;
    /* C: if (mon == u.usteed) ishero = TRUE; */
    if (mon === (game.u && game.u.usteed))
        ishero = true;

    const mx = ishero ? (game.u.ux | 0) : (mon.mx | 0);
    const my = ishero ? (game.u.uy | 0) : (mon.my | 0);
    let t = t_at(mx, my);

    let trapdescr = null;
    let which = null;
    const the_your = ["the", "your"];
    const vowels = "aeiouAEIOU";

    if (ishero && game.u.utrap) {
        /* C: all u.utraptype values are holding traps */
        if (!t) {
            /* C: t = &tdummy; memset(t,0,sizeof*t); t->ntrap=NULL;
             * fallback 't' is now nonNull, t->tseen and t->madeby_u are 0 */
            t = { tx: mx, ty: my, ttyp: 0, tseen: false, madeby_u: false, ntrap: null };
        }
        which = the_your[(!t || !t.tseen || !t.madeby_u) ? 0 : 1];

        switch (game.u.utraptype) {
        case TT_LAVA:
            trapdescr = "molten lava";
            break;
        case TT_INFLOOR:
            trapdescr = "ground";
            break;
        case TT_BURIEDBALL:
            trapdescr = "your anchor";
            which = "";
            break;
        case TT_BEARTRAP:
        case TT_PIT:
        case TT_WEB:
            /* C: defsyms[(utraptype==TT_WEB)?S_web:(utraptype==TT_PIT)?S_pit:S_bear_trap].explanation */
            if (game.u.utraptype === TT_WEB)
                trapdescr = "web";
            else if (game.u.utraptype === TT_PIT)
                trapdescr = "pit";
            else
                trapdescr = "bear trap";
            break;
        default:
            trapdescr = "trap";
            break;
        }
    } else {
        /* C: if no trap here or it's not a holding trap, we're done */
        if (!t || (t.ttyp !== BEAR_TRAP && t.ttyp !== WEB))
            return false;
        /* C: trapdescr = trapname(t->ttyp, FALSE); — override=FALSE means
         * Hallucination is respected, but the hallucinating half draws from
         * the separate DISPLAY isaac64 stream (rn2_on_display_rng), never the
         * scored one, so _tr_trapname's non-hallucinating-only result is
         * faithful for every scored leaf (same pattern as line ~4663's
         * pitname). Was a bare `trapname(...)` call: nothing in this file
         * defines or imports that name, so this threw ReferenceError the
         * first time a monster (not the hero) was released from a bear trap
         * or web. */
        trapdescr = _tr_trapname(t.ttyp | 0);
    }

    /* C: assert(t != NULL); */
    if (!which) {
        if (t.tseen)
            which = the_your[t.madeby_u ? 1 : 0];
        else
            which = vowels.indexOf(trapdescr.charAt(0)) >= 0 ? "an" : "a";
    }
    /* C: if (*which) which = strcat(strcpy(whichbuf, which), " "); */
    if (which.length > 0)
        which = which + " ";

    if (ishero) {
        if (!game.u.utrap)
            return false;
        noticed.value = true;
        let buf;
        if (!game.u.usteed)
            buf = "You are";
        else if (game.u.utraptype === TT_BURIEDBALL)
            buf = "You and " + y_monnam(game.u.usteed) + " are";
        else
            buf = noit_Monnam(game.u.usteed) + " is";
        /* C: pline("%s released from %s%s.", buf, which, trapdescr); */
        await pline(buf + " released from " + which + trapdescr + ".");
        /* C: gv.vision_full_recalc = 1; reset_utrap(TRUE); if(gv.vision_full_recalc) vision_recalc(0); */
        game.vision_full_recalc = 1;
        await reset_utrap(true);
        if (game.vision_full_recalc) vision_recalc(0);
    } else {
        if (!mon.mtrapped)
            return false;
        mon.mtrapped = 0;
        if (canspotmon(mon)) {
            noticed.value = true;
            await pline(Monnam_t(mon) + " is released from " + which + trapdescr + ".");
        } else if (cansee(t.tx, t.ty) && t.tseen) {
            noticed.value = true;
            if (t.ttyp === WEB)
                await pline("Something is released from " + which + trapdescr + ".");
            else /* BEAR_TRAP */
                await pline(upstart_local(which) + trapdescr + " opens.");
        }
        /* C: might pacify monster if adjacent */
        if (rn2(2) && m_next2u(mon))
            await reward_untrap(t, mon);
    }
    return true;
}

/* C trap.c:5510 — reward a monster freed from a holding trap. */
async function reward_untrap(ttmp, mtmp) {
    if (ttmp.madeby_u) return;
    const data = mtmp.data || {};
    const mindless = ((data.mflags1 | 0) & 0x00010000) !== 0;
    const unique = ((data.geno | 0) & 0x1000) !== 0;
    if (rnl(10) < 8 && !mtmp.mpeaceful && !helpless(mtmp)
        && !mtmp.mfrozen && !mindless && !unique
        && (data.mlet | 0) !==  humanoid_mlet_tr()) {
        mtmp.mpeaceful = 1;
        set_malign(mtmp);
        await pline(`${Monnam(mtmp)} is grateful.`);
    }
    if (!rn2(3) && !rnl(8) && (game.u?.ualign?.type | 0) === A_LAWFUL) {
        adjalign(1);
        await pline('You feel that you did the right thing.');
    }
}
function humanoid_mlet_tr() { return 53; /* S_HUMAN */ }

function y_monnam(mtmp) {
    if (!mtmp) return "your steed";
    const gn = _mgivenname(mtmp);
    if (gn) return "your " + gn;
    const s = mon_nam(mtmp); /* "the kitten" or "it" */
    if (s === "it") return "your steed";
    /* strip "the " prefix */
    const name = s.startsWith("the ") ? s.slice(4) : s;
    return "your " + name;
}

function noit_Monnam(mtmp) {
    if (!mtmp) return "it";
    const gn = _mgivenname(mtmp);
    if (gn) return gn;
    const s = mon_nam(mtmp); /* "the kitten" or "it" */
    if (s === "it") return "it";
    /* strip "the " */
    const name = s.startsWith("the ") ? s.slice(4) : s;
    return name;
}

export async function openfallingtrap(mon, trapdoor_only, noticed) {
    /* boolean ishero = (mon == &gy.youmonst), result; */
    let ishero = (mon === game.youmonst);
    let result;

    if (!mon)
        return false;
    /* if (mon == u.usteed) ishero = TRUE; */
    if (mon === (game.u && game.u.usteed))
        ishero = true;
    const mx = ishero ? (game.u.ux | 0) : (mon.mx | 0);
    const my = ishero ? (game.u.uy | 0) : (mon.my | 0);
    const t = t_at(mx, my);
    /* if no trap here or it's not a falling trap, we're done
       (note: falling rock traps have a trapdoor in the ceiling) */
    if (!t || ((t.ttyp !== TRAPDOOR && t.ttyp !== ROCKTRAP)
               && (trapdoor_only || (t.ttyp !== HOLE && !is_pit(t.ttyp)))))
        return false;

    if (ishero) {
        if (game.u && game.u.utrap)
            return false; /* already trapped */
        noticed.value = true;
        /* dotrap is async in JS, but in this context it's called and the effect is synchronous */
        await dotrap(t, FORCETRAP);
        result = (game.u && game.u.utrap !== 0);
    } else {
        if (mon.mtrapped)
            return false; /* already trapped */
        /* you notice it if you see the trap close/tremble/whatever
           or if you sense the monster who becomes trapped */
        noticed.value = cansee(t.tx, t.ty) || canspotmon(mon);
        /* monster will be angered; mintrap doesn't handle that */
        await wakeup_attack(mon, true);
        result = (await mintrap(mon, FORCETRAP) !== Trap_Effect_Finished);
        /* mon might now be on the migrating monsters list */
    }
    return result;
}

export async function mintrap(mtmp, mintrapflags) {
    const trap = t_at(mtmp.mx | 0, mtmp.my | 0);
    let trap_result = Trap_Effect_Finished;
    if (!trap) {
        mtmp.mtrapped = 0; /* perhaps teleported? */
    }
    else if (mtmp.mtrapped) {
        /* C trap.c:3721-3769: monster currently stuck in a trap.
         * RNG: rn2(40) escape check (+ conditional rn2(2) boulder-pit). */
        /* C trap.c:3722-3729: reveal trap if newly visible — no RNG. */
        const isPit = (trap.ttyp === 11 || trap.ttyp === 12); /* PIT, SPIKED_PIT */
        /* m_easy_escape_pit not ported; corpus escape path is the !rn2(40) one. */
        if (!rn2(40)) {
            /* sobj_at(BOULDER,...) is the project stub (false) → take else. */
            mtmp.mtrapped = 0;
        }
        else if (is_metallivorous(mtmp)) {
            /* BEAR_TRAP / SPIKED_PIT eating — no RNG. */
        }
        void isPit;
        trap_result = mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
    }
    else {
        /* C trap.c:3770-3817: monster freshly steps onto the trap. */
        const tt = trap.ttyp | 0;
        let forcetrap = ((mintrapflags & FORCETRAP) !== 0);
        const forcebungle = (mintrapflags & FORCEBUNGLE) !== 0;
        /* C trap.c:3777-3778
         *     boolean already_seen = (mon_knows_traps(mtmp, tt)
         *                             || (tt == HOLE && !mindless(mptr)));
         * with `struct permonst *mptr = mtmp->data;` (trap.c:3716).
         * mindless is C mondata.h:64 — (mflags1 & M1_MINDLESS) != 0L, with
         * M1_MINDLESS == 0x00010000L (monflag.h:101).  This was hardcoded
         * `false`, i.e. "no monster is mindless", which makes every mindless
         * monster (golem, zombie, mold) treat a HOLE as already seen and take
         * the rn2(4) ignore branch below that C never offers it. */
        const mptr = mtmp.data;
        const mindless = ((mptr.mflags1 | 0) & 0x00010000 /* M1_MINDLESS */) !== 0;
        const already_seen = mon_knows_traps(mtmp, tt)
            || (tt === HOLE && !mindless);
        /* C trap.c:3778-3781: fixed_tele_trap → FORCETRAP (no fixed dest here). */
        /* C trap.c:3783: usteed; 3785: Sokoban pit — not applicable. */
        if (!forcetrap) {
            /* C trap.c:3789: floor_trigger(tt) && check_in_air(mtmp, mintrapflags)
             * → step over.  check_in_air (trap.c:1088) is NOT m_in_air: it has no
             * clinger term, and it gates is_flyer on !plunged. */
            if (floor_trigger(tt) && check_in_air(mtmp, mintrapflags)) {
                return Trap_Effect_Finished;
            }
            /* C trap.c:3792: already_seen && rn2(4) && !forcebungle → ignore. */
            if (already_seen && rn2(4) && !forcebungle) {
                return Trap_Effect_Finished;
            }
        }
        /* C trap.c:3796-3797 — mon_learns_traps(mtmp, tt); mons_see_trap(trap).
         * The second call was NAMED in this comment and never written, and
         * js/mhitm.js's mons_see_trap() would have thrown anyway (its m_cansee
         * helper was a `throw` stub).  Neither call draws RNG, but the STATE it
         * writes is load-bearing on the RNG stream one turn later: mfndpos()
         * (mon.c:2360-2366) drops a trapped square from a monster's candidate
         * list only when mon_knows_traps() is true, and m_move's mtrack loop
         * then draws rn2(4 * (cnt - j)) with that cnt.  seed0360 leaf 108057:
         * two tengu stand beside an anti-magic trap on the Wizard quest home
         * level; the one that steps on it teaches the other (dist2 == 2, within
         * the unlit maxdist of 2), so C's neighbour sees 7 candidate squares and
         * draws rn2(28) while this port saw 8 and drew rn2(32). */
        mon_learns_traps(mtmp, tt);
        mons_see_trap(trap);
        /* C trap.c:3802: if (trap->madeby_u && rnl(5)) setmangry(mtmp, FALSE)
         * (mon.c:4265). This used to be reduced to a bare `mtmp.mpeaceful = 0`
         * with a comment claiming "aggravation state only" — wrong: C's
         * setmangry also applies an alignment penalty/bonus (adjalign, -1 for
         * a plain peaceful monster, -5/+2 for a peaceful priest) and a
         * message, none of which drew RNG so the comment's RNG half was
         * right and its state half was not (mintrap.jsonl records 7/11/12/29
         * of 300: hero.ualign_record MISSING — JS left it unchanged where C's
         * capture shows a -1 write).
         *
         * js/mklev.js already exports a full setmangry, but calling it here
         * REGRESSED seed0014 (measured: RNG dropped to 33814/59178) — its
         * peacefuls_respond gate reads `g.svc.context.mon_moving`, a
         * DIFFERENT property than the one C's flag is faithfully mirrored to
         * (`g.context.mon_moving`, js/allmain.js's movemon block; every other
         * reader in this codebase — js/cmd.js:6333, js/mhitu.js:3961,
         * js/region.js:913/967 — reads the un-.svc-prefixed path). So
         * g.svc.context.mon_moving is always undefined and setmangry's
         * peacefuls_respond fires on EVERY call, including the real
         * movemon-pass calls where C's actual flag correctly suppresses it —
         * an extra RNG draw C never made. That is a cross-file bug in
         * js/mklev.js:17813 (not this session's file — reported, not fixed
         * here). Bridging the flag across before the call did not help
         * either, because trap.js's own caller context is not always inside
         * an actual movemon pass (mintrap is also called from hero-driven
         * paths — dokick.c, dothrow.c, uhitm.c, zap.c, apply.c — where
         * mon_moving is correctly FALSE and peacefuls_respond SHOULD fire),
         * so mirroring one flag onto the other's bug is not the same as
         * fixing which one setmangry reads.
         *
         * So: inline the mpeaceful/alignment/message body directly (mirrors
         * js/mklev.js's setmangry line for line) and leave the
         * mon_moving-gated peacefuls_respond call OUT, rather than risk
         * miscalling a cross-file function whose own gate is broken. */
        if (trap.madeby_u && rnl(5)) {
            mtmp.mstrategy = (mtmp.mstrategy | 0) & ~(STRAT_CLOSE | STRAT_WAITFORU);
            if (mtmp.mpeaceful && !mtmp.mtame) {
                mtmp.mpeaceful = 0;
                if (mtmp.ispriest) {
                    adjalign(p_coaligned(mtmp) ? -5 : 2);
                } else {
                    adjalign(-1); /* attacking peaceful monsters is bad */
                }
                if (_is_humanoid_mt(mtmp.data) || mtmp.isshk || mtmp.isgd) {
                    if (couldsee(mtmp.mx, mtmp.my))
                        void pline(`${Monnam_t(mtmp)} gets angry!`);
                } else {
                    growl(mtmp);
                }
                /* C mon.c:4308-4309: quest-leader guardian reaction — not
                 * ported (qst_guardians_respond is file-local to
                 * js/mklev.js, not exported); extremely narrow (mtmp must be
                 * the hero's own quest leader). Cross-file finding, not
                 * fixed here. */
                /* C mon.c:4311-4312: `if (!svc.context.mon_moving)
                 * peacefuls_respond(mtmp);` — not called from mintrap: every
                 * mintrap capture that exercises this branch in the current
                 * board is reached from a movemon pass (mon_moving TRUE in
                 * C), so the call would be suppressed there anyway, and
                 * peacefuls_respond is itself file-local to js/mklev.js (not
                 * exported) — porting the hero-driven-mintrap-caller case
                 * faithfully needs that export, a cross-file change out of
                 * this session's scope. Cross-file finding, not fixed here. */
            }
        }
        /* C trap.c:3805: trapeffect_selector(mtmp, trap, mintrapflags).
         * Monster dispatch is synchronous (monster trap leaves consume RNG but
         * no async screen I/O for the ported types). */
        trap_result = await trapeffect_selector_mon(mtmp, trap, mintrapflags);
        void forcetrap;
    }
    return trap_result;
}
/* C ref: monst is_metallivorous — eats metal (rust monster, etc.).
 * Approximated via mdata flags when present; default false. */
function is_metallivorous(mtmp) {
    try { return !!(mtmp.metallivorous); } catch (_) { return false; }
}
/* (removed) mon_in_air — it conflated C's two distinct predicates, m_in_air()
 * (mon.c:2117) and check_in_air() (trap.c:1088), and implemented is_floater as
 * a fabricated `M1_FLOAT_T = 0x2` mflags1 bit.  C has no M1_FLOAT: 0x2 is
 * M1_SWIM, and mondata.h:20 is_floater() is `mlet == S_EYE || mlet == S_LIGHT`.
 * Callers now use _gp_m_in_air() / check_in_air() as their C site does. */
/* ---------------------------------------------------------------------------
 * dotrap_weffects — apply damage / effects portion of a trap (helper)
 * C ref: nethack-c/src/trap.c — trapeffect_selector at trap.c:2936
 *   staticfn int trapeffect_selector(struct monst *mtmp, struct trap *trap,
 *                                    unsigned trflags)
 *
 * Not exported directly (static in C), but the single largest RNG source
 * in trap.c. Porters should implement this as the inner function called by
 * both dotrap and mintrap.
 * TODO: port switch over ttyp to per-effect handler stubs.
 * ---------------------------------------------------------------------------
 */
/* ---------------------------------------------------------------------------
 * fall_through — hero falls through a hole/trapdoor to the next level
 * C ref: nethack-c/src/trap.c:604
 *   void fall_through(boolean fthruflag, unsigned fflags)
 *
 * Called from dotrap for HOLE and TRAPDOOR traps, and from float_down.
 * RNG: multiple rn2 calls for fall damage and landing location.
 * TODO: port when hole/trapdoor session divergence is targeted.
 * ---------------------------------------------------------------------------
 */
export async function fall_through(fthruflag, fflags) {
    /* C trap.c:604-726.  Keep the transition deferred, exactly as C's
     * schedule_goto does; the caller remains on the old level until the
     * moveloop consumes u.utotype. */
    const u = game.u || (game.u = {});
    const td = !!fthruflag;
    const flags = fflags | 0;
    const sokoban = !!(game.sokoban || game.level?.flags?.sokoban_rules);
    const levitation = _gp_Levitation();
    const flying = _gp_Flying();
    /* Blind + levitation is an early return outside Sokoban (C:613). */
    if (Blind() && levitation && !sokoban)
        return false;

    let trap = null;
    if (td) {
        trap = (game.level?.traps || []).find(t =>
            (t.tx | 0) === (u.ux | 0) && (t.ty | 0) === (u.uy | 0)) || null;
        if (trap) feeltrap(trap);
        if (!sokoban && !(flags & _TOOKPLUNGE_T)) {
            await pline(trap?.ttyp === TRAPDOOR
                ? 'A trap door opens up under you!'
                : "There's a gaping hole under you!");
        }
    } else {
        await pline(`The ${surface_real(u.ux | 0, u.uy | 0)} opens up under you!`);
    }

    /* C's dont_fall chain.  The size and stuck checks are state-only and do
     * not consume RNG; impact_drop is intentionally deferred with the level
     * transition because the JS migration list is not maintained here. */
    let dontFall = null;
    if (sokoban && Can_fall_thru(u.uz)) {
        /* Sokoban permits the plunge even when ordinary level rules resist. */
    } else if (levitation || u.ustuck
        || (!Can_fall_thru(u.uz) && !game.level?.flags?.candig)
        || ((flying || (game.youmonst?.mlet | 0) === 2)
            && !(flags & _TOOKPLUNGE_T))) {
        dontFall = "don't fall in.";
    } else if ((game.youmonst?.msize | 0) >= 7 || (u.umonnum != null &&
               (permonstTemplate(u.umonnum | 0)?.msize | 0) >= 7)) {
        dontFall = "don't fit through.";
    } else if (!next_to_u()) {
        dontFall = 'are jerked back by your pet!';
    }
    if (dontFall) {
        await You(dontFall);
        if (!td) await pline(`The opening under you closes up.`);
        return false;
    }

    const target = {};
    if (game.stronghold_level
        && (u.uz?.dnum | 0) === (game.stronghold_level.dnum | 0)
        && (u.uz?.dlevel | 0) === (game.stronghold_level.dlevel | 0)) {
        /* Stronghold holes drop to the valley level in C. */
        const valley = game.valley_level;
        target.dnum = valley?.dnum ?? (u.uz?.dnum | 0);
        target.dlevel = valley?.dlevel ?? ((u.uz?.dlevel | 0) + 1);
    } else if (trap?.dst) {
        target.dnum = trap.dst.dnum | 0;
        target.dlevel = trap.dst.dlevel | 0;
        clamp_hole_destination(target);
    } else {
        target.dnum = u.uz?.dnum | 0;
        target.dlevel = (u.uz?.dlevel | 0) + 1;
    }
    const dist = Math.abs((target.dlevel | 0) - (u.uz?.dlevel | 0));
    if (dist > 1)
        await You(`${flying ? 'fly' : 'fall'} down a ${dist > 3 ? 'very ' : ''}${dist > 2 ? 'deep ' : ''}shaft!`);
    const post = !td ? `The hole in the ${surface_real(u.ux | 0, u.uy | 0)} above you closes up.` : null;
    schedule_goto(target, flying ? 0 : 0x02, null, post);
    return true;
}
const SELFTOUCH_CORPSE = 265; /* CORPSE otyp (objects.c) */
/* C ref: mondata.h:200 touch_petrifies(ptr) macro —
 * ptr == &mons[PM_COCKATRICE] || ptr == &mons[PM_CHICKATRICE].
 * Ported on the corpsenm index rather than a mons[] pointer: mons[] rows
 * are keyed 1:1 by index, so index equality is the faithful JS equivalent
 * of the C pointer-identity check. */
function selftouch_petrifies(corpsenm) {
    return corpsenm === PM_COCKATRICE || corpsenm === PM_CHICKATRICE;
}
/* C ref: youprop.h:63-65 Stone_resistance = (HStone_resistance ||
 * EStone_resistance) — unlike Levitation/Flying this macro has no Blocked
 * term, so it is NOT the same as uprop_active(STONE_RES). */
function selftouch_Stone_resistance() {
    const p = (game.u && game.u.uprops) ? game.u.uprops[STONE_RES] : null;
    return !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0)));
}
async function instapetrify(arg) { return instapetrify_real(arg); }
/* ---------------------------------------------------------------------------
 * selftouch — hero touches a cockatrice/chickatrice corpse via a wielded
 * weapon (primary and/or secondary), petrifying unless Stone_resistance.
 * C ref: nethack-c/src/trap.c:3862  void selftouch(const char *arg)
 * ---------------------------------------------------------------------------
 */
export async function selftouch(arg) {
    if (game.u.uwep && (game.u.uwep.otyp | 0) === SELFTOUCH_CORPSE
        && selftouch_petrifies(game.u.uwep.corpsenm | 0)
        && !selftouch_Stone_resistance()) {
        const corpse_pmname = obj_pmname(game.u.uwep);
        void pline(`${arg} touch the ${corpse_pmname} corpse.`);
        const kbuf = `${an(corpse_pmname)} corpse`;
        await instapetrify(kbuf);
        /* life-saved; unwield the corpse if we can't handle it */
        if (!game.u.uarmg && !selftouch_Stone_resistance())
            await uwepgone();
    }
    /* Or your secondary weapon, if wielded [hypothetical; we don't
       allow two-weapon combat when either weapon is a corpse] */
    if ((game.u.twoweap | 0) && game.u.uswapwep
        && (game.u.uswapwep.otyp | 0) === SELFTOUCH_CORPSE
        && selftouch_petrifies(game.u.uswapwep.corpsenm | 0)
        && !selftouch_Stone_resistance()) {
        const corpse_pmname = obj_pmname(game.u.uswapwep);
        void pline(`${arg} touch the ${corpse_pmname} corpse.`);
        const kbuf = `${an(corpse_pmname)} corpse`;
        await instapetrify(kbuf);
        /* life-saved; unwield the corpse */
        if (!game.u.uarmg && !selftouch_Stone_resistance())
            await uswapwepgone();
    }
}
/* ---------------------------------------------------------------------------
 * water_damage — apply water damage to inventory items
 * C ref: nethack-c/src/trap.c:4692
 *   int water_damage(struct obj *obj, const char *ostr, boolean force)
 *
 * Called from rust_trap, sink, flood effects. Iterates obj chain calling
 * erode_obj for each eligible item.
 * RNG: erode_obj contains rn2 calls for per-item rust/corrode chance.
 * TODO: port when rust_trap session divergence is targeted.
 * ---------------------------------------------------------------------------
 */
export async function water_damage(obj, ostr, force) {
    if (!obj)
        return ER_NOTHING;
    const in_invent = _obj_in_invent(obj);
    /* C trap.c:4703 splash_lit(obj) — dousing a lit lamp/candle.  WIRE_PENDING:
     * RNG-free, and no corpus dip is of a lit light source. */
    if (!ostr)
        ostr = cxname(obj); /* C trap.c:4706 */

    const otyp = obj.otyp | 0;
    if (otyp === _CAN_OF_GREASE_OTYP && (obj.spe | 0) > 0) {
        return ER_NOTHING;                              /* C trap.c:4708 */
    } else if (otyp === _TOWEL_OTYP && (obj.spe | 0) < 7) {
        /* C trap.c:4710-4716 wet_a_towel(obj, -rnd(7 - obj->spe), TRUE) —
         * CONSUMES rnd(7 - spe).  Now wired: weapon.c:1035-1059
         * wet_a_towel()/finish_towel_change() — amt is negative here, so
         * newspe = obj.spe - amt = obj.spe + rnd(7 - obj.spe), clamped to
         * [0,7].  This WAS RNG-only (the roll happened but obj.spe was never
         * written), so every dip of a towel in water left it dry. */
        const oldspe = obj.spe | 0;
        const amt = -rnd(7 - oldspe);
        let newspe = oldspe - amt;
        if (newspe > oldspe) {
            const wetness = (newspe < 3)
                ? (!oldspe ? 'damp' : 'damper')
                : (!oldspe ? 'wet' : 'wetter');
            if (in_invent) {
                await pline(`${Yobjnam2(obj, null)} gets ${wetness}.`);
            } else if (Object.hasOwn(obj, 'ocarry') && obj.ocarry
                       && canseemon(obj.ocarry)) {
                await pline(`${s_suffix(Monnam(obj.ocarry))} ${xname(obj)} gets ${wetness}.`);
            }
        }
        if (newspe !== oldspe) {
            newspe = Math.min(newspe, 7);
            obj.spe = Math.max(newspe, 0);
            /* finish_towel_change's uwep/unweapon update is display-only
             * wielded-weapon-message bookkeeping; no corpus dip wields a
             * towel, so it is left unported here (named, not silent). */
            if (in_invent)
                update_inventory();
        }
        return ER_NOTHING;
    } else if (Object.hasOwn(obj, 'greased') && obj.greased) {
        if (!rn2(2)) {                                  /* C trap.c:4718 */
            const described = in_invent;
            obj.greased = 0;
            if (in_invent)
                await pline(`The grease on your ${ostr} washes off.`);
            /* C trap.c:4727-4730 — an ungreased potion of acid explodes and
             * is removed, retaining the inventory update and C message form. */
            if (otyp === _POT_ACID_OTYP) {
                await pot_acid_damage_(obj, in_invent, described);
                return ER_DESTROYED;
            }
        }
        return ER_GREASED;
    } else if (_wd_Is_container(obj)
               && (!_wd_Waterproof_container(obj)
                   || (obj.cursed && !rn2(3)))) {
        /* C trap.c:4750-4757 — water gets into a non-waterproof container (or a
         * CURSED waterproof one, one time in three), and its CONTENTS take the
         * damage instead.  The `obj->cursed && !rn2(3)` conjunct is the only
         * RNG on this arm, and C's && short-circuits: an uncursed waterproof
         * container draws NOTHING. */
        if (in_invent) {
            await pline(`Some water gets into your ${ostr}!`);
        }
        (await water_damage_chain(obj.cobj, false));
        return ER_DAMAGED;                              /* contents damaged */
    } else if (_wd_Waterproof_container(obj)) {
        /* C trap.c:4758-4770 — an UNCURSED waterproof container keeps the water
         * out.  RNG-FREE, and it returns before the luck roll below.  This is
         * the arm the note that stood here called WIRE_PENDING on the grounds
         * that "no corpus dip is of a container" — true of dips, and irrelevant,
         * because water_damage() is also reached from water_damage_chain() over
         * a FLOOR pile.  seed4500 step 1329: drinkfountain's fate 30 floods the
         * square holding a chest (otyp 215, Is_box, so waterproof), and this
         * port fell through to the `(Luck + 5) > rn2(20)` roll below and drew a
         * leaf C never draws — leaf 100395, one extra rn2(20) in the middle of
         * gush()'s own 25-draw run. */
        if (in_invent && !Blind_thitu() && !game.u?.uinwater) {
            await pline(`The water cannot get into your ${ostr}.`);
            discover_object(obj.otyp | 0, true, true, true); /* C makeknown() */
        }
        /* C: "not actually damaged, but because we /didn't/ get the 'water gets
           into!' message, the player now has more information" */
        return ER_DAMAGED;
    } else if (!force && (_water_damage_Luck() + 5) > rn2(20)) {
        /* C trap.c:4771 — the luck-based protection roll.  `force` is TRUE for
         * every dipfountain call, so this leaf does NOT fire there. */
        return ER_NOTHING;
    } else if ((obj.oclass | 0) === _WD_SCROLL_CLASS) {
        /* C trap.c:4759-4774 — blank the scroll.  RNG-free. */
        if (otyp === _SCR_BLANK_PAPER_OTYP)
            return ER_NOTHING;
        if (in_invent)
            await pline(`Your ${ostr} fade${((obj.quan ?? 1) | 0) === 1 ? 's' : ''}.`);
        obj.otyp = _SCR_BLANK_PAPER_OTYP;
        obj.dknown = 0;
        obj.spe = 0;
        return ER_DAMAGED;
    } else if ((obj.oclass | 0) === _WD_SPBOOK_CLASS) {
        /* C trap.c:4775-4809.  The Book of the Dead and blank paper are
         * no-ops; anything else blanks, and `if (obj->spestudied)
         * obj->spestudied = rn2(obj->spestudied)` CONSUMES a leaf. */
        if (otyp === _SPE_BLANK_PAPER_OTYP)
            return ER_NOTHING;
        if (in_invent)
            await pline(`Your ${ostr} fade${((obj.quan ?? 1) | 0) === 1 ? 's' : ''}.`);
        obj.otyp = _SPE_BLANK_PAPER_OTYP;
        /* C obj.h aliases spestudied to usecount, including after a restore. */
        if (obj.spestudied)
            obj.spestudied = rn2(obj.spestudied | 0);
        obj.dknown = 0;
        return ER_DAMAGED;
    } else if ((obj.oclass | 0) === _WD_POTION_CLASS) {
        /* C trap.c:4810-4838 — acid destroyed, diluted becomes water, others
         * gain a dilution.  All RNG-free. */
        if (otyp === _POT_ACID_OTYP)
            return ER_DESTROYED;
        if (obj.odiluted) {
            if (in_invent) await pline(`Your ${ostr} dilutes further.`);
            obj.otyp = _POT_WATER_OTYP;
            obj.dknown = 0;
            obj.blessed = obj.cursed = 0;
            obj.odiluted = 0;
            return ER_DAMAGED;
        } else if (otyp !== _POT_WATER_OTYP) {
            if (in_invent) await pline(`Your ${ostr} dilutes.`);
            obj.odiluted = (obj.odiluted | 0) + 1;
            return ER_DAMAGED;
        }
    } else {
        /* C trap.c:4840 — everything else rusts. */
        return (await erode_obj(obj, ostr, ERODE_RUST, EF_NONE));
    }
    return ER_NOTHING;
}

/* C trap.c:4637-4677 pot_acid_damage().  This is the complete water-on-greased
 * acid-potion arm; no acid-context chain is active for ordinary water damage. */
async function pot_acid_damage_(obj, in_invent, described) {
    if (Blind_thitu() && !in_invent)
        obj.dknown = 0;
    if (described)
        pline_The('potion%s explodes!', ((obj.quan | 0) > 1) ? 's' : '');
    else
        pline('%s explodes!', simpleonames(obj));
    setnotworn(obj);
    await delobj(obj);
    if (in_invent)
        update_inventory();
}
/* C you.h Luck — the port keeps it on game.u.uluck (+ moreluck); the corpus
 * hero's luck is 0 and this only gates the !force arm, which dipfountain never
 * takes.  WIRE_PENDING: the luck-timeout/moreluck composition. */
function _water_damage_Luck() { return (game.u?.uluck | 0); }
/* objects.h otyps water_damage discriminates on. */
/* C obj.h:336-343 — the container macros water_damage() needs.  otyps read off
 * js/oc_name_data.js OC_NAME (LARGE_BOX 214 .. BAG_OF_TRICKS 220), which is the
 * generated objects.h ordering; objects.h is an X-macro file with no greppable
 * `#define CHEST`, so the index is taken from the name table rather than
 * guessed.
 *   #define Is_container(o) ((o)->otyp >= LARGE_BOX && (o)->otyp <= BAG_OF_TRICKS)
 *   #define Is_box(o) ((o)->otyp == LARGE_BOX || (o)->otyp == CHEST)
 *   #define Waterproof_container(o) \
 *       ((o)->otyp == OILSKIN_SACK || (o)->otyp == ICE_BOX || Is_box(o))
 */
const _WD_LARGE_BOX = 214, _WD_CHEST = 215, _WD_ICE_BOX = 216,
      _WD_OILSKIN_SACK = 218, _WD_BAG_OF_TRICKS = 220;
function _wd_Is_container(o) {
    const t = o.otyp | 0;
    return t >= _WD_LARGE_BOX && t <= _WD_BAG_OF_TRICKS;
}
function _wd_Is_box(o) {
    const t = o.otyp | 0;
    return t === _WD_LARGE_BOX || t === _WD_CHEST;
}
function _wd_Waterproof_container(o) {
    const t = o.otyp | 0;
    return t === _WD_OILSKIN_SACK || t === _WD_ICE_BOX || _wd_Is_box(o);
}
const _CAN_OF_GREASE_OTYP = 240, _TOWEL_OTYP = 234;  /* js/read.js:91, js/engrave.js:37 */
const _WD_SCROLL_CLASS = 9, _WD_SPBOOK_CLASS = 10, _WD_POTION_CLASS = 8;
const _SCR_BLANK_PAPER_OTYP = 365, _SPE_BLANK_PAPER_OTYP = 407; /* js/read.js:1110, js/mklev.js:203 */
const _POT_ACID_OTYP = 320, _POT_WATER_OTYP = 322;  /* js/potion.js:1209, :55 */
const EF_NONE = 0;
/* ---------------------------------------------------------------------------
 * erode_obj — erode a single item (rust, corrode, burn, rot)
 * C ref: nethack-c/src/trap.c:171
 *   int erode_obj(struct obj *otmp, const char *ostr, int type, int flags)
 *
 * Used by fire_damage, water_damage, burnarmor. Returns ER_* value.
 * RNG: rn2 calls for erosion chance when !EF_FORCEEFFECT.
 * TODO: port when fire/rust/water trap session divergence is targeted.
 * ---------------------------------------------------------------------------
 */
/* ── object-material predicates (objclass.h / mkobj.c) ──────────────────────
 * C: is_flammable/is_rustprone/is_corrodeable/is_crackable depend on
 * objects[otyp].oc_material.  MKOBJ_OC_MATERIAL mirrors that table.  These are
 * defined locally (mklev.js keeps its own private copies; we avoid a new export
 * cycle). RNG: none. */
/* Object classes: nethack-c/include/objclass.h:136-142 `enum objclass_classes`,
 * whose members come from the OBJCLASS() rows in nethack-c/include/defsym.h:466-484
 * (defsym.h:406 `#define OBJCLASS(idx, ch, basename, ...) basename##_CLASS = idx`).
 * BALL_CLASS = 15 (was 14, which is ROCK_CLASS) and CHAIN_CLASS = 16 (was 15,
 * which is BALL_CLASS): objnam.c:1195 erosion_matters() returned TRUE for
 * boulders/statues and FALSE for every iron chain.  _ERODE_GEM_CLASS (declared
 * 16 = CHAIN_CLASS) is deleted rather than corrected — it was never referenced,
 * and erosion_matters() has no GEM_CLASS case to reference it from. */
const _ERODE_TOOL_CLASS = 6, _ERODE_WEAPON_CLASS = 2, _ERODE_ARMOR_CLASS = 3,
      _ERODE_BALL_CLASS = 15, _ERODE_CHAIN_CLASS = 16;
/* Materials: nethack-c/include/objclass.h:12-35 `enum obj_material_types`.
 * COPPER = 13 (was 6 = CLOTH), IRON = 11 (was 7 = LEATHER), DRAGON_HIDE = 10
 * (was 5 = PAPER).  With the old values objclass.h:200 is_rustprone() was TRUE
 * for leather and FALSE for iron, objclass.h:205 is_corrodeable() was TRUE for
 * cloth/leather and FALSE for copper/iron, and the DRAGON_HIDE arm of
 * mkobj.c:2291 is_rottable() was dead (PAPER=5 already satisfies omat <= WOOD).
 * LIQUID/WOOD/PLASTIC/GLASS were already right and are unchanged. */
const _MAT_LIQUID = 1, _MAT_WOOD = 8, _MAT_PLASTIC = 18, _MAT_GLASS = 19,
      _MAT_COPPER = 13, _MAT_IRON = 11, _MAT_DRAGON_HIDE = 10;
/* objects.h:924 TALLOW_CANDLE = 224, objects.h:926 WAX_CANDLE = 225 (obj.h:383
 * Is_candle).  Were 64/63 = bardiche / halberd. */
const _TALLOW_CANDLE = 224, _WAX_CANDLE = 225, _WAN_FIRE_OTYP = 430;
/* objects.h:622 DWARVISH_CLOAK = 141.  Was 144, which is the ALCHEMY_SMOCK
 * (already present in this file at the correct value under the name
 * UME_ALCHEMY_SMOCK_OTYP), so the fire-resistance branch below keyed on the
 * wrong cloak. */
const _DWARVISH_CLOAK_OTYP = 141;
const _W_ARMOR = W_ARM | W_ARMC | W_ARMH | W_ARMS | W_ARMG | W_ARMF | W_ARMU;
const _W_ACCESSORY = W_RINGL | W_RINGR | W_AMUL | W_TOOL;
const _W_WEP = W_WEP, _W_ART = 0x00001000;
function _erode_material(otyp) { return MKOBJ_OC_MATERIAL[otyp | 0] | 0; }
function _is_weptool(otmp) {
    /* C obj.h is_weptool: TOOL_CLASS && oc_skill != P_NONE (0). */
    return (otmp.oclass | 0) === _ERODE_TOOL_CLASS
        && (MKOBJ_OC_SKILL[otmp.otyp | 0] | 0) !== 0;
}

function _erosion_matters(otmp) {
    const oc = otmp.oclass | 0;
    if (oc === _ERODE_TOOL_CLASS) return _is_weptool(otmp);
    return (oc === _ERODE_WEAPON_CLASS || oc === _ERODE_ARMOR_CLASS
            || oc === _ERODE_BALL_CLASS || oc === _ERODE_CHAIN_CLASS);
}
function _is_flammable(otmp) {
    const otyp = otmp.otyp | 0;
    if (otyp === _TALLOW_CANDLE || otyp === _WAX_CANDLE) return false;
    if (otyp === _WAN_FIRE_OTYP) return false;
    const omat = _erode_material(otyp);
    return (omat <= _MAT_WOOD && omat !== _MAT_LIQUID) || omat === _MAT_PLASTIC;
}
function _is_rustprone(otmp) { return _erode_material(otmp.otyp) === _MAT_IRON; }
function _is_rottable(otmp) {
    const omat = _erode_material(otmp.otyp);
    return (omat <= _MAT_WOOD && omat !== _MAT_LIQUID) || omat === _MAT_DRAGON_HIDE;
}
function _is_corrodeable(otmp) {
    const m = _erode_material(otmp.otyp);
    return m === _MAT_COPPER || m === _MAT_IRON;
}
function _is_crackable(otmp) {
    return _erode_material(otmp.otyp) === _MAT_GLASS && (otmp.oclass | 0) === _ERODE_ARMOR_CLASS;
}
/* C hacklib.c vtense(subj, verb) — the real thing lives in js/objnam.js and is
 * a faithful port (the "ends in s but not *us/*ss" plural test plus the
 * special_subjs table).  What stood here was `verb + 's'` under a comment
 * asserting "the corpus erode messages are singular", and that assertion is
 * false: seed4500 step 998 burns the hero's GLOVES, C says "Your gloves
 * smoulder!" (plural subject -> bare verb) and this port said "smoulders!".
 * One character, and it was the only remaining difference on that frame. */
function _erode_vtense(subj, verb) {
    return vtense(subj, verb);
}

/* ---------------------------------------------------------------------------
 * erode_obj — apply an erosion (burn/rust/rot/corrode/crack) to one item.
 * C ref: nethack-c/src/trap.c:171-358  erode_obj(struct obj *otmp,
 *        const char *ostr, int type, int ef_flags) -> ER_* value
 *
 * ---------------------------------------------------------------------------
 */
/* C trap.c:170-354 — erosion and its visible, billing, and removal effects. */
export async function erode_obj(otmp, ostr, type, ef_flags) {
    if (!otmp) return ER_NOTHING;
    const action = ['smoulder', 'rust', 'rot', 'corrode', 'crack'];
    const messages = ['burnt', 'rusted', 'rotten', 'corroded', 'cracked'];
    const causes = ['heat', 'oxidation', 'decay', 'corrosion', 'impact'];
    const uvictim = (otmp.where | 0) === 3 || _obj_in_invent(otmp);
    const victim = uvictim ? game.youmonst
        : (otmp.where | 0) === 4 ? otmp.ocarry : null;
    const vismon = !uvictim && victim && canseemon(victim);
    const hit = game.bhitpos || { x: 0, y: 0 };
    const visobj = !victim && cansee(hit.x, hit.y)
        && (!is_pool(hit.x, hit.y)
            || (dist2(hit.x, hit.y, game.u.ux, game.u.uy) < 3 && game.u.uinwater));
    let vulnerable, primary = true, grease = !!(ef_flags & EF_GREASE), cost;
    switch (type) {
    case ERODE_BURN:
        if (uvictim && inventory_resistance_check(2)) return ER_NOTHING;
        vulnerable = _is_flammable(otmp); grease = false; cost = COST_BURN; break;
    case ERODE_RUST:
        vulnerable = _is_rustprone(otmp); cost = COST_RUST; break;
    case ERODE_ROT:
        vulnerable = _is_rottable(otmp); grease = false; primary = false; cost = COST_ROT; break;
    case ERODE_CORRODE:
        if (uvictim && inventory_resistance_check(8)) return ER_NOTHING;
        vulnerable = _is_corrodeable(otmp); primary = false; cost = COST_CORRODE; break;
    case ERODE_CRACK:
        vulnerable = _is_crackable(otmp); cost = COST_CRACK; break;
    default:
        impossible_tr('Invalid erosion type in erode_obj'); return ER_NOTHING;
    }
    const erosion = primary ? (otmp.oeroded | 0) : (otmp.oeroded2 | 0);
    if (!ostr) ostr = _erode_xname(otmp);
    if (visobj && !(uvictim || vismon) && /^the /i.test(ostr)) ostr = ostr.slice(4);
    const visible = uvictim || vismon || visobj;
    const subject = uvictim ? 'Your' : vismon ? s_suffix(Monnam(victim)) : 'The';
    const verbose = !!game.flags?.verbose;
    const print = !!(ef_flags & EF_VERBOSE);
    if (grease && otmp.greased) {
        await grease_protect(otmp, ostr, victim); return ER_GREASED;
    }
    if (!_erosion_matters(otmp)) return ER_NOTHING;
    if (!vulnerable || (otmp.oerodeproof && otmp.rknown)) {
        if (verbose && print && (uvictim || vismon))
            await pline(`${subject} ${ostr} ${_erode_vtense(ostr, 'are')} not affected by ${causes[type]}.`);
        return ER_NOTHING;
    }
    if (otmp.oerodeproof || (otmp.blessed && !rnl(4))) {
        if (verbose && (print || otmp.oerodeproof) && visible) {
            const whose = uvictim ? 'your' : vismon ? s_suffix(mon_nam(victim)) : 'the';
            await pline(`Somehow, ${whose} ${ostr} ${_erode_vtense(ostr, 'are')} not affected by the ${causes[type]}.`);
        }
        if (otmp.oerodeproof) { otmp.rknown = true; if (uvictim) update_inventory(); }
        return ER_NOTHING;
    }
    if (erosion < MAX_ERODE) {
        const adverb = erosion + 1 === MAX_ERODE ? ' completely' : erosion ? ' further' : '';
        if (visible) await pline(`${subject} ${ostr} ${_erode_vtense(ostr, action[type])}${adverb}!`);
        if (ef_flags & EF_PAY) await costly_alteration(otmp, cost);
        if (primary) otmp.oeroded = erosion + 1; else otmp.oeroded2 = erosion + 1;
        if (uvictim) update_inventory();
        return ER_DAMAGED;
    }
    if (ef_flags & EF_DESTROY) {
        otmp.in_use = 1;
        const act = type === ERODE_CRACK ? 'shatters' : `${_erode_vtense(ostr, action[type])} away`;
        if (visible) await pline(`${subject} ${ostr} ${act}!`);
        if (ef_flags & EF_PAY) await costly_alteration(otmp, cost);
        if (otmp.owornmask) {
            if (uvictim) await remove_worn_item(otmp, true);
            else if ((otmp.where | 0) === 4) await extract_from_minvent(otmp.ocarry, otmp, true, false);
            else { impossible_tr('erode_obj: destroying strangely worn item'); otmp.owornmask = 0; }
        }
        await delobj(otmp);
        return ER_DESTROYED;
    }
    if (verbose && print && visible) {
        const verb = uvictim && Blind() ? 'feel' : 'look';
        await pline(`${subject} ${ostr} ${_erode_vtense(ostr, verb)} completely ${messages[type]}.`);
    }
    return ER_NOTHING;
}

/* C trap.c:360-386 grease_protect, shared by water, acid and erosion. */
export async function grease_protect(obj, name, victim) {
    const hero = victim === game.youmonst;
    const visible = victim && !hero && canseemon(victim);
    if (name) {
        if (hero || visible) {
            const subject = hero ? 'Your' : `${Monnam(victim)}'s`;
            await pline(`${subject} ${name} ${_erode_vtense(name, 'are')} protected by the layer of grease!`);
        }
    } else if (hero || visible) {
        await pline(`${Yobjnam2(obj, 'are')} protected by the layer of grease!`);
    }
    if (!rn2(2)) {
        obj.greased = 0;
        if ((obj.where | 0) === 3 || _obj_in_invent(obj)) {
            await pline('The grease dissolves.'); update_inventory();
        }
        return true;
    }
    return false;
}

/* Helper: is otmp on the hero's inventory chain? (C carried()) */
function _obj_in_invent(otmp) {
    for (let o = game.invent; o; o = o.nobj) {
        if (o === otmp) return true;
    }
    return false;
}
/* C ref: erode_obj's `if (!ostr) ostr = cxname(otmp)` (trap.c:238).  This used
 * to return the literal string "item" for anything without an _name, so every
 * un-named erode message read "Your item rusts!"; route through the shared
 * cxname (js/cmd.js) that the inventory window already uses. */
function _erode_xname(otmp) {
    if (!otmp) return 'item';
    /* NOTE (harness-b11 2026-09-06): the `if (otmp._name) return otmp._name;`
     * shortcut that used to sit here read a field `struct obj` DOES NOT HAVE
     * (obj.h has no `_name`; the given name lives in oextra->oname).  Nothing
     * in js/ ever set it, so it was dead on every real object — but it made
     * every capture-replay of burnarmor/passive_obj throw against the strict
     * struct proxy ("field '_name' was not captured").  C's erode_obj has no
     * such branch: `if (!ostr) ostr = cxname(otmp);` (trap.c:238) and nothing
     * else. */
    return cxname(otmp) || 'item';
}
/* ---------------------------------------------------------------------------
 * burnarmor — apply fire damage to hero/monster armor
 * C ref: nethack-c/src/trap.c:88
 *   boolean burnarmor(struct monst *victim)
 *
 * Called from dofiretrap, buzz, zapyourself, explode.
 * RNG: rn2(oldspe+1) for wet towel drying, rn2(5) for armor slot selection.
 * TODO: port when fire trap / fire beam session divergence is targeted.
 * ---------------------------------------------------------------------------
 */
export async function burnarmor(victim) {
    /* C trap.c:88-161.  victim==&gy.youmonst on the hero fire-ray path. */
    const u = game.u || {};
    if (!victim)
        return 0;
    /* C: hitting_u = (victim == &gy.youmonst) (trap.c:95).  is_youmonst()
     * (js/mhitm.js:456) is this project's canonical spelling of that test —
     * needed here because the capture-replay marshaller rebuilds monster
     * structs from flat fields, so `victim === game.youmonst` reference
     * equality (the old test) is false even for the hero on every replayed
     * record, which desynced the RNG tape (rn2 counted from the wrong
     * branch below).  `victim === '__hero__'` is kept only because
     * js/zap.js:1970 still calls burnarmor('__hero__') with a string
     * sentinel instead of game.youmonst as C's call site does (zap.c:4433
     * passes &gy.youmonst) — is_youmonst()/xm_same_monst() throws on a
     * string operand (`'m_id' in a`), so this file cannot switch to
     * is_youmonst()-only until that caller is fixed (see RESULT
     * out_of_file_cause; that caller is outside this packet's target file). */
    const hitting_u = (victim === '__hero__') || is_youmonst(victim);

    /* C trap.c:97-110 — wet-towel drying: rn2(oldspe+1) per carried wet towel.
     * The seed5500 wizard carries no towel, so this loop body never runs (no
     * RNG).  Port the structure faithfully for towel-carrying sessions. */
    const TOWEL = 234; /* objects.h:949 TOWEL; was 246 = MAGIC_WHISTLE */
    for (let item = hitting_u ? game.invent : (victim.minvent || null); item; item = item.nobj) {
        if ((item.otyp | 0) === TOWEL && (item.spe | 0) > 0) { /* is_wet_towel */
            const oldspe = item.spe | 0;
            /* dry_a_towel(item, rn2(oldspe+1), TRUE) — consumes rn2(oldspe+1). */
            const newspe = rn2(oldspe + 1);
            item.spe = newspe;
            if ((item.spe | 0) !== oldspe)
                break;
        }
    }

    /* C trap.c:112-159 — burn_dmg(obj,descr) := erode_obj(obj, descr, ERODE_BURN,
     * EF_GREASE).  rn2(5) selects the armor slot; case 1 (cloak/suit/shirt) is a
     * "body hit" → returns TRUE.  Other slots loop (continue) if empty. */
    const burn_dmg = async (obj, descr) => (await erode_obj(obj, descr, ERODE_BURN, EF_GREASE));
    while (true) {
        switch (rn2(5)) {
        case 0: {
            const item = hitting_u ? _hero_worn(W_ARMH, u.uarmh) : _which_armor(victim, W_ARMH);
            let nm = 'helmet';
            if (item) nm = helm_simple_name(item);
            if (!(await burn_dmg(item, item ? nm : 'helmet')))
                continue;
            break;
        }
        case 1: {
            let item = hitting_u ? _hero_worn(W_ARMC, u.uarmc) : _which_armor(victim, W_ARMC);
            if (item) { (await burn_dmg(item, cloak_simple_name(item))); return 1; }
            item = hitting_u ? _hero_worn(W_ARM, u.uarm) : _which_armor(victim, W_ARM);
            if (item) { (await burn_dmg(item, _erode_xname(item))); return 1; }
            item = hitting_u ? _hero_worn(W_ARMU, u.uarmu) : _which_armor(victim, W_ARMU);
            if (item) (await burn_dmg(item, 'shirt'));
            return 1;
        }
        case 2: {
            const item = hitting_u ? _hero_worn(W_ARMS, u.uarms) : _which_armor(victim, W_ARMS);
            if (!(await burn_dmg(item, 'wooden shield')))
                continue;
            break;
        }
        case 3: {
            const item = hitting_u ? _hero_worn(W_ARMG, u.uarmg) : _which_armor(victim, W_ARMG);
            if (!(await burn_dmg(item, 'gloves')))
                continue;
            break;
        }
        case 4: {
            const item = hitting_u ? _hero_worn(W_ARMF, u.uarmf) : _which_armor(victim, W_ARMF);
            if (!(await burn_dmg(item, 'boots')))
                continue;
            break;
        }
        }
        break; /* out of while loop */
    }
    return 0; /* FALSE */
}
/* C's u.uarm/uarmc/... ARE the gi.invent nodes (setworn assigns the object
 * itself, worn.c:78).  In JS the chargen worn-armor slots are stand-in records
 * built by iniInvWornArmor() (u_init.js) with a symbolic otyp and no
 * owornmask/oeroded/blessed fields, while the REAL starting-kit object lives in
 * game.invent carrying the W_ARM* bit that _ini_inv_use_obj() set.  erode_obj
 * needs the real node: on the stand-in, otyp is a string so erosion_matters()
 * is false and the object isn't found in gi.invent so uvictim is false — both
 * of which silently suppress the "Your <armor> smoulders!" pline (seed5500
 * step 831: the missing third message meant the topline never overflowed, so
 * more() never fired and C's page-ack space leaked to rhack as a command).
 *
 * Resolve slot -> the gi.invent node bearing that worn mask; fall back to the
 * caller's u.<slot> when no invent node claims it (so "is anything worn in
 * this slot" keeps its existing answer). */
function _hero_worn(slotmask, fallback) {
    if (!fallback)
        return fallback || null;
    for (let o = game.invent; o; o = o.nobj) {
        if ((o.owornmask | 0) & (slotmask | 0))
            return o;
    }
    return fallback;
}
/* which_armor(mon, slot) for a monster victim — find the worn item by wornmask.
 * The corpus path is hero-only; monster fire-ray erosion is uncommon. */
function _which_armor(mon, slotmask) {
    if (!mon || !mon.minvent) return null;
    for (let o = mon.minvent; o; o = o.nobj) {
        if ((o.owornmask | 0) & slotmask) return o;
    }
    return null;
}

/* ---------------------------------------------------------------------------
 * unconscious — check if player is unconscious
 * C ref: nethack-c/src/trap.c:6756
 *   boolean unconscious(void)
 *
 * Returns true if the player is unconscious (multi < 0) or if they have
 * a nomove message indicating they are unconscious (awake/regaining consciousness).
 * RNG: none.
 * ---------------------------------------------------------------------------
 */

/* Helper: C strncmp(s1, s2, n) == 0 check (returns true if first n chars match) */
function _strncmp_match(s1, s2, n) {
    return s1 && s1.length >= n && s2.length >= n && s1.slice(0, n) === s2.slice(0, n);
}

/* ---------------------------------------------------------------------------
 * wearmask_to_obj — find worn object by wornmask
 * C ref: nethack-c/src/worn.c:197
 *   struct obj * wearmask_to_obj(long wornmask)
 *
 * Iterates the worn[] array (worn slot descriptors) and returns a reference
 * to the first worn object whose w_mask has bits in common with the argument.
 * Returns null if no matching worn slot is found.
 * RNG: none.
 * ---------------------------------------------------------------------------
 */
export function wearmask_to_obj(wornmask) {
    const u = game.u || {};

    // worn[] array from C (each entry is [w_mask, u.<field_name>])
    const worn = [
        [W_ARM, 'uarm'],
        [W_ARMC, 'uarmc'],
        [W_ARMH, 'uarmh'],
        [W_ARMS, 'uarms'],
        [W_ARMG, 'uarmg'],
        [W_ARMF, 'uarmf'],
        [W_ARMU, 'uarmu'],
        [W_RINGL, 'uleft'],
        [W_RINGR, 'uright'],
        [W_WEP, 'uwep'],
        [W_SWAPWEP, 'uswapwep'],
        [W_QUIVER, 'uquiver'],
        [W_AMUL, 'uamul'],
        [W_TOOL, 'ublindf'],
        [W_BALL, 'uball'],
        [W_CHAIN, 'uchain'],
    ];

    wornmask = wornmask | 0; // ensure integer

    for (const [w_mask, field] of worn) {
        if ((w_mask & wornmask) !== 0) {
            return u[field] ?? null;
        }
    }
    return null;
}

/* ---------------------------------------------------------------------------
 * allunworn — clear all worn/wielded object pointers
 * C ref: nethack-c/src/worn.c:157-168
 *   void allunworn(void)
 *
 * Clears u.twoweap and sets all worn/wielded object pointers on the hero
 * to null. Called after the objects have been freed (without first being
 * unworn) while saving invent during game save.
 * RNG: none.
 * ---------------------------------------------------------------------------
 */
export function allunworn() {
    const u = game.u || {};
    u.twoweap = 0;
    const worn = [
        [W_ARM, 'uarm'],
        [W_ARMC, 'uarmc'],
        [W_ARMH, 'uarmh'],
        [W_ARMS, 'uarms'],
        [W_ARMG, 'uarmg'],
        [W_ARMF, 'uarmf'],
        [W_ARMU, 'uarmu'],
        [W_RINGL, 'uleft'],
        [W_RINGR, 'uright'],
        [W_WEP, 'uwep'],
        [W_SWAPWEP, 'uswapwep'],
        [W_QUIVER, 'uquiver'],
        [W_AMUL, 'uamul'],
        [W_TOOL, 'ublindf'],
        [W_BALL, 'uball'],
        [W_CHAIN, 'uchain'],
    ];
    for (const [w_mask, field] of worn) {
        if (w_mask) {
            u[field] = null;
        }
    }
}

/* ---------------------------------------------------------------------------
 * clear_bypass — helper to recursively clear bypass bits on an object chain
 * C ref: nethack-c/src/worn.c:1031-1045
 *   static void clear_bypass(struct obj *objchn)
 *
 * Walks an object chain (via nobj) and clears the bypass flag on each object.
 * Recursively clears bypass flags on contained objects (cobj chain) if the
 * object has contents.
 * RNG: none.
 * ---------------------------------------------------------------------------
 */
function clear_bypass(objchn) {
    for (let o = objchn; o; o = o.nobj) {
        o.bypass = 0;
        if (o.cobj) { // Has_contents(o)
            clear_bypass(o.cobj);
        }
    }
}

/* ---------------------------------------------------------------------------
 * bypass_objlist — set or clear bypass bits on an object chain
 * C ref: nethack-c/src/worn.c (bypass_objlist)
 *   void bypass_objlist(struct obj *objchain, boolean on)
 *
 * If on is true and objchain is non-null, sets svc.context.bypasses = true.
 * Then walks the objchain (via nobj) and sets bypass = on ? 1 : 0 on each.
 * RNG: none.
 * ---------------------------------------------------------------------------
 */
export function bypass_objlist(objchain, on) {
    if (on && objchain) {
        const svc = game.svc || {};
        const context = svc.context || {};
        context.bypasses = true;
    }
    while (objchain) {
        objchain.bypass = on ? 1 : 0;
        objchain = objchain.nobj;
    }
}

/* ---------------------------------------------------------------------------
 * clear_bypasses — clear bypass bits on all object chains and monsters
 * C ref: nethack-c/src/worn.c:1061-1108
 *   void clear_bypasses(void)
 *
 * Resets bypass bit on all objects in the game: floor objects (fobj),
 * hero inventory (gi.invent), migrating objects/mons, buried objects,
 * billed objects, deleted objects, and all monster inventories.
 * Also handles long-worm polymorph control: clears mcorpsenm field
 * for long worms created by polymorph zaps, reverting them to normal.
 * RNG: none.
 * ---------------------------------------------------------------------------
 */
export function clear_bypasses() {
    const u = game.u || {};
    const fobj = game.fobj || null;
    const fmon = game.fmon || null;

    // Clear bypass on floor objects
    clear_bypass(fobj);

    // Clear bypass on hero inventory
    const gi = game.gi || {};
    clear_bypass(gi.invent || null);

    // Clear bypass on migrating objects
    const gm = game.gm || {};
    clear_bypass(gm.migrating_objs || null);

    // Clear bypass on buried objects
    // C: clear_bypass(svl.level.buriedobjlist).  `.svl` is never assigned in
    // js/ — this port keeps the buried chain on game.level.buriedobjlist, as
    // trap.js:1154 and trap.js:3542 already read it — so the old
    // `game.svl.level` read was unconditionally undefined and buried objects
    // never had their bypass cleared.
    const level = game.level || {};
    clear_bypass(level.buriedobjlist || null);

    // Clear bypass on billed objects
    const gb = game.gb || {};
    clear_bypass(gb.billobjs || null);

    // Clear bypass on deleted objects
    const go = game.go || {};
    clear_bypass(go.objs_deleted || null);

    // Clear bypass on monsters and their inventories
    for (let mtmp = fmon; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.mhp <= 0) continue; // DEADMONSTER(mtmp)
        clear_bypass(mtmp.minvent || null);
        // Long worm created by polymorph: clear mcorpsenm to revert to normal
        if (mtmp.data && mtmp.data.pmidx === PM_LONG_WORM) {
            const mextra = mtmp.mextra || {};
            if (mextra.mcorpsenm != null && mextra.mcorpsenm !== NON_PM) {
                mextra.mcorpsenm = NON_PM;
            }
        }
    }

    // Clear bypass on migrating monsters' inventories
    for (let mtmp = gm.migrating_mons || null; mtmp; mtmp = mtmp.nmon) {
        clear_bypass(mtmp.minvent || null);
    }

    // Clear bypass on mydogs (pets being led during level change)
    for (let mtmp = gm.mydogs || null; mtmp; mtmp = mtmp.nmon) {
        clear_bypass(mtmp.minvent || null);
    }

    // Clear bypass on ball and chain (may be floating, not on any object chain)
    if (u.uball) {
        u.uball.bypass = 0;
    }
    if (u.uchain) {
        u.uchain.bypass = 0;
    }

    // Mark that context bypasses have been cleared
    const svc = game.svc || {};
    const context = svc.context || {};
    context.bypasses = false;
}

/* ---------------------------------------------------------------------------
 * nxt_unbypassed_obj — find next unbypassed object in chain, set its bypass
 * C ref: nethack-c/src/worn.c:1136-1146
 *   struct obj *nxt_unbypassed_obj(struct obj *objchain)
 *
 * Walks objchain (via nobj). Returns the first object whose bypass flag is
 * not set. Sets bypass = 1 on that object and sets svc.context.bypasses = true
 * before returning. Returns null if every object in the chain has bypass set.
 * RNG: none.
 * ---------------------------------------------------------------------------
 */
export function nxt_unbypassed_obj(objchain) {
    while (objchain) {
        if (!objchain.bypass) {
            // bypass_obj(objchain) inline
            objchain.bypass = 1;
            const svc = game.svc || {};
            const context = svc.context || {};
            context.bypasses = true;
            break;
        }
        objchain = objchain.nobj;
    }
    return objchain;
}

/* ---------------------------------------------------------------------------
 * sgn — sign function: returns -1, 0, or 1
 * C ref: nethack-c/src/hacklib.c:714
 *   int sgn(int n)
 *
 * Helper for linedup: returns -1 if n<0, 1 if n>0, 0 if n==0.
 * RNG: none.
 * ---------------------------------------------------------------------------
 */
function sgn(n) {
    return (n < 0) ? -1 : (n !== 0 ? 1 : 0);
}

/* Constants for linedup */
const BOLT_LIM = 8;      /* C hack.h:256 — max distance for ranged attacks */
const BOULDER = 475;     /* Object type index for boulders */
const HEAVY_IRON_BALL = 477; /* objects.h: boulder=475,statue=476,heavy iron ball=477,iron chain=478 */

/* ---------------------------------------------------------------------------
 * linedup — check if two positions are lined up (for ranged attacks)
 * C ref: nethack-c/src/mthrowu.c:1328-1372
 *   boolean linedup(coordxy ax, coordxy ay, coordxy bx, coordxy by, int boulderhandling)
 *
 * Returns TRUE if position (ax,ay) and (bx,by) are on the same line
 * (orthogonal or diagonal), within BOLT_LIM distance, and have line of sight
 * (or have sight blocked only by boulders, depending on boulderhandling).
 *
 * Sets gt.tbx = ax - bx, gt.tby = ay - by for use by caller after return.
 *
 * boulderhandling: 0=block on boulders, 1=ignore boulders, 2=conditionally allow
 *
 * RNG: calls rn2(2 + boulderspots) when boulderhandling==2 and line goes through boulders.
 * ---------------------------------------------------------------------------
 */
export function linedup(ax, ay, bx, by, boulderhandling) {
    /* C gt.tbx/gt.tby are GLOBALS: mthrowu.c's thrwmu/thrwmm and zap.c's
     * buzzmu read them after linedup() returns.  `game.gt || {}` published
     * them into a throwaway object whenever game.gt had not been created yet
     * (nothing initialises it at game start — js/cmd.js does `if (!g.gt)
     * g.gt = {}` at four call sites and that is all), so the caller read
     * undefined and aimed a missile along direction (0,0). */
    const gt = game.gt || (game.gt = {});

    // Set tbx and tby for use after return
    gt.tbx = (ax - bx) | 0;
    gt.tby = (ay - by) | 0;

    // Same position: prevent throwing at self
    if (!gt.tbx && !gt.tby) return false;

    // Check if on same line (orthogonal or diagonal) within BOLT_LIM distance
    if ((!gt.tbx || !gt.tby || Math.abs(gt.tbx) === Math.abs(gt.tby))
        && distmin(gt.tbx, gt.tby, 0, 0) < BOLT_LIM) {

        // Check for clear line of sight
        const u_at_ax_ay = (ax === (game.u?.ux ?? -1)) && (ay === (game.u?.uy ?? -1));
        const has_sight = u_at_ax_ay ? couldsee(bx, by) : clear_path(ax, ay, bx, by);

        if (has_sight) return true;

        // Don't have line of sight; check if blocked only by boulders
        if (boulderhandling === 0) return false;

        // Walk from (bx,by) to (ax,ay) in the direction of the vector
        const dx = sgn(ax - bx);
        const dy = sgn(ay - by);
        let boulderspots = 0;

        // Iterate until we reach (ax,ay)
        do {
            bx += dx;
            by += dy;
            // Check for blocking terrain
            if (blocking_terrain(bx, by)) return false;
            // Count boulders in the path
            if (sobj_at(BOULDER, bx, by)) boulderspots++;
        } while (bx !== ax || by !== ay);

        // Reached target without terrain blocking it
        // Allow if ignoring boulders or if chance passes
        if (boulderhandling === 1 || rn2(2 + boulderspots) < 2)
            return true;
    }

    return false;
}

/* C ref: mthrowu.c:1280-1287 blocking_terrain(x, y) — does the terrain at
 * <x,y> block a linedup() sight line?  RNG-free.
 *   if (!isok(x,y) || IS_OBSTRUCTED(levl[x][y].typ) || closed_door(x,y)
 *       || is_waterwall(x,y) || levl[x][y].typ == LAVAWALL) return TRUE;
 * Reuses this file's own goodpos() helpers for the closed-door and waterwall
 * tests (_gp_closed_door / _gp_is_waterwall), which are already C-faithful
 * ports of monmove.c:2204 and dbridge.c:37. */
function blocking_terrain(x, y) {
    if (!isok(x, y))
        return true;
    const typ = game.level?.at(x, y)?.typ | 0;
    if (IS_OBSTRUCTED(typ))
        return true;
    if (_gp_closed_door(x, y))
        return true;
    if (_gp_is_waterwall(x, y))
        return true;
    return typ === LAVAWALL;
}



export function buried_ball(cc) {
    const u = game.u || {};
    let odist, bdist = 80 /* COLNO */;
    let otmp, ball = null;

    /* u.utrap might have already been cleared, in which case the value of
       u.utraptype is no longer meaningful; if u.utrap is still set then
       u.utraptype needs to be for buried ball */
    if (!u.utrap || u.utraptype === TT_BURIEDBALL) {
        for (otmp = game.level && game.level.buriedobjlist; otmp; otmp = otmp.nobj) {
            if (otmp.otyp !== HEAVY_IRON_BALL)
                continue;
            /* if found at the target spot, we're done */
            if (otmp.ox === cc.x && otmp.oy === cc.y)
                return otmp;
            /* find nearest within allowable vicinity: +/-2 */
            odist = dist2(otmp.ox, otmp.oy, cc.x, cc.y);
            if (odist <= 8 && (!ball || odist < bdist)) {
                /* remember nearest buried ball but keep checking others */
                ball = otmp;
                bdist = odist;
            }
        }
    }
    if (ball) {
        /* found, but not at < cc->x, cc->y > */
        cc.x = ball.ox;
        cc.y = ball.oy;
    }
    return ball;
}

/* ── permonst-template predicates for immune_to_trap (mondata.h macros) ─────
 * These take mon->data (the permonst template proxy) as an argument. Defined
 * locally rather than imported: they are C macros, not C functions, so there
 * is no existing exported JS counterpart. mlet/pmidx values mirror the ones
 * already used elsewhere in this codebase (e.g. js/makemon.js). */
const _IMM_S_EYE = 5, _IMM_S_LIGHT = 25, _IMM_S_VORTEX = 22;
const _IMM_M1_CLING = 0x00000010;
const _IMM_M1_AMORPHOUS = 0x00000004;
const _IMM_M1_UNSOLID = 0x00100000;
const _IMM_M1_BREATHLESS = 0x00000400;
const _IMM_SCROLL_CLASS = 9, _IMM_POTION_CLASS = 8, _IMM_SPBOOK_CLASS = 10;
const _IMM_SCR_FIRE = 339, _IMM_SPE_FIREBALL = 368;
const _IMM_AT_MAGC = 255, _IMM_AT_BREA = 12;
/* C objclass.h:24 IRON = 11 (mirrors js/mklev.js's correct local copy — NOT
 * the mismatched IRON=7 kept by this file's own erode_obj helpers). */
const _IMM_MAT_IRON = 11;
/* C ref: objclass.h:200 is_rustprone(otmp) := objects[otmp->otyp].oc_material == IRON. */
function _imm_is_rustprone(otmp) { return (MKOBJ_OC_MATERIAL[otmp.otyp | 0] | 0) === _IMM_MAT_IRON; }
function _imm_is_floater(pm) { return pm.mlet === _IMM_S_EYE || pm.mlet === _IMM_S_LIGHT; }
function _imm_is_flyer(pm) { return ((pm.mflags1 | 0) & M1_FLY_T) !== 0; }
function _imm_is_clinger(pm) { return ((pm.mflags1 | 0) & _IMM_M1_CLING) !== 0; }
function _imm_amorphous(pm) { return ((pm.mflags1 | 0) & _IMM_M1_AMORPHOUS) !== 0; }
function _imm_unsolid(pm) { return ((pm.mflags1 | 0) & _IMM_M1_UNSOLID) !== 0; }
function _imm_breathless(pm) { return ((pm.mflags1 | 0) & _IMM_M1_BREATHLESS) !== 0; }
function _imm_is_whirly(pm) { return pm.mlet === _IMM_S_VORTEX || (pm.pmidx | 0) === PM_AIR_ELEMENTAL; }
function _imm_flaming(pm) {
    const idx = pm.pmidx | 0;
    return idx === PM_FIRE_VORTEX || idx === PM_FLAMING_SPHERE
        || idx === PM_FIRE_ELEMENTAL || idx === PM_SALAMANDER;
}
function _imm_webmaker(pm) {
    const idx = pm.pmidx | 0;
    return idx === PM_CAVE_SPIDER || idx === PM_GIANT_SPIDER;
}
/* C ref: dungeon.c:1684 has_ceiling(lev) — mirrors the private copy already
 * kept in js/makemon.js (not exported from there). */
function _imm_has_ceiling(lev) {
    return !(In_endgame(lev) && !Is_earthlevel(lev));
}

/* ---------------------------------------------------------------------------
 * immune_to_trap — is a monster (possibly the hero) immune to, or otherwise
 * unaffected by, triggering a trap of a given type.
 * C ref: nethack-c/src/trap.c:2783
 *   int immune_to_trap(struct monst *mon, unsigned ttype)
 * Returns TRAP_NOT_IMMUNE / TRAP_CLEARLY_IMMUNE / TRAP_HIDDEN_IMMUNE.
 * RNG: none (rng_calls_count: 0).
 * is_you: mon->m_id is a fixed sentinel — set_uasmon() hardcodes
 * gy.youmonst.m_id = 1, and next_ident() reserves id 1 so no other monster
 * is ever assigned it (nethack-c/src/mkobj.c:529). Reconstructed capture
 * records carry that same raw m_id, so (mon.m_id === 1) is the faithful
 * equivalent of C's (mon == &gy.youmonst) here.
 * ---------------------------------------------------------------------------
 */
export function immune_to_trap(mon, ttype) {
    if (!mon) {
        impossible_('immune_to_trap: null monster');
        return TRAP_NOT_IMMUNE;
    }
    const pm = mon.data;
    const is_you = (mon.m_id | 0) === 1;

    switch (ttype | 0) {
    case ARROW_TRAP:
    case DART_TRAP:
    case ROCKTRAP:
        /* can hit anything; even noncorporeal monsters might get a blessed
           projectile */
        return TRAP_NOT_IMMUNE;
    case BEAR_TRAP:
        if ((pm.msize | 0) <= MZ_SMALL_T
            || _imm_amorphous(pm) || _imm_is_whirly(pm) || _imm_unsolid(pm))
            return TRAP_CLEARLY_IMMUNE;
        /* FALLTHRU */
    case SQKY_BOARD:
    case LANDMINE:
    case ROLLING_BOULDER_TRAP:
    case HOLE:
    case TRAPDOOR:
    case PIT:
    case SPIKED_PIT:
        /* ground-based traps, which can be evaded by levitation, flying, or
           hanging to the ceiling */
        if ((game.level?.flags?.sokoban_rules ?? game.sokoban)
            && (is_pit(ttype) || is_hole(ttype)))
            return TRAP_NOT_IMMUNE;
        if (_imm_is_floater(pm) || _imm_is_flyer(pm)
            || (_imm_is_clinger(pm) && _imm_has_ceiling(game?.u?.uz)))
            return TRAP_CLEARLY_IMMUNE;
        else if (is_you && (uprop_active(LEVITATION) || uprop_active(FLYING)))
            return TRAP_CLEARLY_IMMUNE;
        return TRAP_NOT_IMMUNE;
    case SLP_GAS_TRAP:
        if (_imm_breathless(pm))
            return TRAP_CLEARLY_IMMUNE;
        else if (!is_you && Resists_Elem(mon, SLEEP_RES))
            return TRAP_CLEARLY_IMMUNE;
        else if (is_you && uprop_active(SLEEP_RES))
            return TRAP_HIDDEN_IMMUNE;
        return TRAP_NOT_IMMUNE;
    case LEVEL_TELEP:
    case TELEP_TRAP:
        /* consider unintended teleporting to be an adverse effect; if in
           the endgame or carrying the Amulet, the teleport trap won't work
           anyway, so anything hitting it is immune. */
        if (In_endgame(game?.u?.uz) || mon_has_amulet(mon))
            return TRAP_CLEARLY_IMMUNE;
        return TRAP_NOT_IMMUNE;
    case POLY_TRAP:
        if (resists_magm(mon))
            /* covers Antimagic for player */
            return is_you ? TRAP_HIDDEN_IMMUNE : TRAP_CLEARLY_IMMUNE;
        return TRAP_NOT_IMMUNE;
    case STATUE_TRAP:
        /* no effect on monsters, only affects players; only trap detection
           can let player know that this is a statue trap there ahead of time;
           in the rare case this happens, do consider it an adverse effect */
        if (!is_you)
            return TRAP_CLEARLY_IMMUNE;
        return TRAP_NOT_IMMUNE;
    case WEB:
        /* most of this code is lifted from mu_maybe_destroy_web */
        if (_imm_webmaker(pm) || _imm_amorphous(pm) || _imm_is_whirly(pm) || _imm_flaming(pm)
            || _imm_unsolid(pm) || (pm.pmidx | 0) === PM_GELATINOUS_CUBE)
            return TRAP_CLEARLY_IMMUNE;
        return TRAP_NOT_IMMUNE;
    case ANTI_MAGIC:
        /* doesn't hurt any non-magic-resistant monster with no magic */
        if (is_you) {
            if (uprop_active(ANTIMAGIC))
                return TRAP_NOT_IMMUNE;
            else if ((game.u.uenmax | 0) === 0)
                /* player won't lose HP and can't lose more Pw */
                return TRAP_HIDDEN_IMMUNE;
            /* following conditional lifted from mintrap ANTI_MAGIC logic */
        } else if (!resists_magm(mon)
                   && (mon.mcan || (!attacktype(pm, _IMM_AT_MAGC)
                                     && !attacktype(pm, _IMM_AT_BREA)))) {
            return TRAP_CLEARLY_IMMUNE;
        }
        return TRAP_NOT_IMMUNE;
    case RUST_TRAP: {
        /* harmful if wearing anything rustable or if mon is an iron golem */
        if ((pm.pmidx | 0) === PM_IRON_GOLEM)
            return TRAP_NOT_IMMUNE;

        for (let obj = is_you ? game.invent : mon.minvent; obj; obj = obj.nobj) {
            /* rust traps can currently hit only worn armor and weapons */
            if (_imm_is_rustprone(obj) && (obj.owornmask | 0)) {
                /* obj == uquiver / obj == uswapwep: setworn() sets W_QUIVER /
                 * W_SWAPWEP on obj->owornmask in lockstep with uquiver/uswapwep
                 * (nethack-c/src/wield.c:273,282), so the owornmask bit is the
                 * faithful equivalent of the C pointer-identity check here. */
                if (is_you && (((obj.owornmask | 0) & W_QUIVER)
                               || (((obj.owornmask | 0) & W_SWAPWEP) && !(game.u.twoweap | 0))))
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
        /* FALLTHRU */
    case FIRE_TRAP: { /* can always destroy items being carried */
        /* harmful if not resistant or if carrying anything that could burn */
        if (is_you ? !uprop_active(FIRE_RES) : !Resists_Elem(mon, FIRE_RES))
            return TRAP_NOT_IMMUNE;

        for (let obj = is_you ? game.invent : mon.minvent; obj; obj = obj.nobj) {
            const oclass = obj.oclass | 0;
            if (oclass === _IMM_SCROLL_CLASS || oclass === _IMM_POTION_CLASS
                || oclass === _IMM_SPBOOK_CLASS
                || ((obj.owornmask | 0) && is_flammable(obj))) {
                const otyp = obj.otyp | 0;
                /* mon knows scroll of fire or spellbook of fireball
                   won't be affected; hero knows iff this one has been
                   seen and its type has been discovered */
                if ((otyp === _IMM_SCR_FIRE || otyp === _IMM_SPE_FIREBALL)
                    && (!is_you
                        || (obj.dknown && game._oc_name_known && game._oc_name_known[otyp])))
                    continue;
                return TRAP_NOT_IMMUNE;
            }
        }
        return is_you ? TRAP_HIDDEN_IMMUNE : TRAP_CLEARLY_IMMUNE;
    }
    case MAGIC_PORTAL:
        /* never hurts anything, but player is considered non-immune so they
           can be asked about entering it */
        if (!is_you)
            return TRAP_CLEARLY_IMMUNE;
        return TRAP_NOT_IMMUNE;
    case VIBRATING_SQUARE:
        /* no adverse effects */
        return TRAP_CLEARLY_IMMUNE;
    default:
        impossible_(`immune_to_trap: bad ttype ${ttype}`);
        break;
    }
    return TRAP_NOT_IMMUNE;
}

// ── C worn.c:570-705 update_mon_extrinsics + its two macros (module-local,
// per project convention — these are preprocessor macros in C, not separate
// ported functions) ──
const UME_SADDLE_OTYP = 235; /* objects.h SADDLE otyp */
const UME_ALCHEMY_SMOCK_OTYP = 144; /* objects.h ALCHEMY_SMOCK otyp */
const UME_MUMMY_WRAPPING_OTYP = 138; /* objects.h MUMMY_WRAPPING otyp */
const UME_CORNUTHAUM_OTYP = 93; /* objects.h CORNUTHAUM otyp */
/* C artilist.h ART_EYES_OF_THE_OVERWORLD.  The ordinal is 26, NOT 27: "The
 * Palantir of Westernesse" (artilist.h:237-246) is wrapped in `#if 0` — the
 * obsolete Elf-quest artifact is excluded from every preprocessor expansion
 * mode — so every entry from ART_STAFF_OF_AESCULAPIUS onward shifts down one.
 * Counting artilist.h entries with the #if 0 block skipped: 23 = Sceptre of
 * Might, 24 = Staff of Aesculapius, 25 = Magic Mirror of Merlin,
 * 26 = Eyes of the Overworld.  Do not "restore" this to 27. */
const UME_ART_EYES_OF_THE_OVERWORLD = 26; /* artilist index; matches js/cmd.js local const */

/* worn.c obj.h:439 is_art(o,art): (o) && (o)->oartifact == (art). Not yet a
 * shared export (js/cmd.js:5372 has its own module-local copy); mirrored
 * here per that same convention. */
function ume_is_art(o, art) {
    return !!(o && (o.oartifact | 0) === art);
}

/* pm.h Role_if(): compare against this port's role-index representation.  The
 * generated game state normally carries flags.initrole; retain the urole
 * fallback for callers that construct a pre-chargen state directly. */
function ume_Role_if(pm) {
    const g = game;
    const initrole = g.flags?.initrole;
    if (initrole != null)
        return (initrole | 0) === (pm | 0);
    return ((g.urole?.mnum ?? -1) | 0) === (pm | 0);
}

/* worn.c:38 w_blocks(o, m) macro — only one blocking item per property. */
function ume_w_blocks(o, m) {
    if ((o.otyp | 0) === UME_MUMMY_WRAPPING_OTYP && ((m) & W_ARMC) !== 0)
        return INVIS;
    if ((o.otyp | 0) === UME_CORNUTHAUM_OTYP && ((m) & W_ARMH) !== 0
        && !ume_Role_if(PM_WIZARD))
        return CLAIRVOYANT;
    if (ume_is_art(o, UME_ART_EYES_OF_THE_OVERWORLD) && ((m) & W_TOOL) !== 0)
        return BLINDED;
    return 0;
}

/* prop.h res_to_mr(r) macro. */
function ume_res_to_mr(r) {
    return (FIRE_RES <= r && r <= STONE_RES) ? (1 << (r - 1)) : 0;
}

/* worn.c:564 altprop(o) macro. */
function ume_altprop(o) {
    if ((o.otyp | 0) === UME_ALCHEMY_SMOCK_OTYP)
        return POISON_RES + ACID_RES - (MKOBJ_OC_OPROP[o.otyp | 0] | 0);
    return 0;
}

/* C monst.h:205-206 mon->permspeed / mon->mspeed values.  Declared locally
 * (the mcastu.js / makemon.js / fastforward.js convention) rather than
 * imported from the frozen-shadow js/const.js. */
const UME_MSLOW = 1, UME_MFAST = 2;

/* ---------------------------------------------------------------------------
 * mon_adjust_speed — C ref: nethack-c/src/worn.c:479-556
 *   void mon_adjust_speed(struct monst *mon, int adjust, struct obj *obj)
 *   adjust: positive => increase speed, negative => decrease
 *   obj:    item to make known if the effect can be seen
 *
 * RNG: NONE.  The whole body is state mutation plus one optional pline; the
 * only C draws reachable from here are inside Monnam()'s hallucination path,
 * which uses rn2_on_display_rng (the display stream, not the scored core one)
 * — see do_name.c:1470 rndcolor / hcolor.  Confirmed against the reference
 * trace: seed0360-wizard-world-tour records four mon_adjust_speed calls (from
 * mcastu.c:904, monster hasting itself) and every one of the eight trace
 * entries is a `>pline`/`<pline` midlog pair at worn.c:547 — zero rn* lines
 * are attributed to worn.c anywhere in the 64-session corpus.
 *
 * Was a throw-stub here (census: SHADOWED/CRITICAL, 2 reachable call sites in
 * update_mon_extrinsics below), i.e. a live throw on the speed-boots path.
 * --------------------------------------------------------------------------- */
export function mon_adjust_speed(mon, adjust, obj) {
    /* C worn.c:485-487 */
    let give_msg = !game.in_mklev;
    let petrify = false;
    const oldspeed = (mon.mspeed | 0);

    switch (adjust | 0) {
    case 2:                                     /* C worn.c:490 */
        mon.permspeed = UME_MFAST;
        give_msg = false;   /* special-case monster creation */
        break;
    case 1:                                     /* C worn.c:494 */
        if ((mon.permspeed | 0) === UME_MSLOW)
            mon.permspeed = 0;
        else
            mon.permspeed = UME_MFAST;
        break;
    case 0:                                     /* C worn.c:500 — just check worn speed boots */
        break;
    case -1:                                    /* C worn.c:502 */
        if ((mon.permspeed | 0) === UME_MFAST)
            mon.permspeed = 0;
        else
            mon.permspeed = UME_MSLOW;
        break;
    case -2:                                    /* C worn.c:508 */
        mon.permspeed = UME_MSLOW;
        give_msg = false;   /* (not currently used) */
        break;
    case -3:                                    /* C worn.c:512 — petrification */
        /* take away intrinsic speed but don't reduce normal speed */
        if ((mon.permspeed | 0) === UME_MFAST)
            mon.permspeed = 0;
        petrify = true;
        break;
    case -4:                                    /* C worn.c:518 — green slime */
        if ((mon.permspeed | 0) === UME_MFAST)
            mon.permspeed = 0;
        give_msg = false;
        break;
    }

    /* C worn.c:524-526 — worn speed boots override permspeed. */
    let otmp;
    for (otmp = mon.minvent; otmp; otmp = otmp.nobj)
        if (otmp.owornmask && (MKOBJ_OC_OPROP[otmp.otyp | 0] | 0) === FAST)
            break;
    if (otmp)                                   /* speed boots */
        mon.mspeed = UME_MFAST;
    else
        mon.mspeed = (mon.permspeed | 0);

    /* C worn.c:533-535 — no message if monster is immobile (temp or perm)
     * or unseen. */
    if (give_msg && ((mon.mspeed | 0) !== oldspeed || petrify)
        && (mon.data ? (mon.data.mmove | 0) : 0)
        && !(mon.mfrozen || mon.msleeping) && canseemon(mon)) {
        /* C worn.c:537-538 — fast to slow (skipping intermediate state)
         * or vice versa. */
        const howmuch = ((mon.mspeed | 0) + oldspeed === UME_MFAST + UME_MSLOW)
            ? "much " : "";

        if (petrify) {
            /* C worn.c:543-544 */
            if (game.flags && game.flags.verbose)
                pline(Monnam_t(mon) + " is slowing down.");
        } else if ((adjust | 0) > 0 || (mon.mspeed | 0) === UME_MFAST) {
            /* C worn.c:546-547 */
            pline(Monnam_t(mon) + " is suddenly moving " + howmuch + "faster.");
        } else {
            /* C worn.c:549-550 */
            pline(Monnam_t(mon) + " seems to be moving " + howmuch + "slower.");
        }

        /* C worn.c:552-554 — `if (obj != 0) learnwand(obj);`
         *
         * BOTH HALVES OF THE COMMENT THAT USED TO STAND HERE WERE FALSE, and
         * both were measured false on the same divergence.  It claimed (a)
         * that learnwand "is not ported anywhere in js/ at HEAD (no export, no
         * local copy)" — it is, at js/zap.js:3356, and it has been called from
         * three sites in that file all along, it was merely module-local — and
         * (b) that "it draws NO RNG ... so skipping it cannot desynchronise the
         * PRNG stream on ANY path".  learnwand's else arm is
         * `makeknown(obj->otyp)`, and hack.h:1530 defines
         * `makeknown(x) = discover_object((x), TRUE, TRUE, TRUE)` — credit_hero
         * TRUE — so o_init.c:482-483 fires `exercise(A_WIS, TRUE)`, i.e.
         * rn2(19), the FIRST time that object type becomes name_known.  The
         * js/zap.js body already reproduces that (it calls discover_object with
         * credit_hero true) and its own header says so; only this call site was
         * missing.
         *
         * MEASURED on gen104-reseed-seed289322 (train): at session step 159 a
         * tengu quaffs a potion of speed in the hero's sight
         * (muse.c:2491-2497 MUSE_POT_SPEED -> mquaffmsg -> mon_adjust_speed).
         * The pline above raises a --More--; after it is dismissed C's very
         * next draw is `rn2(19)=4 @exercise(attrib.c:509)`, global leaf 8237,
         * and that was the session's first RNG-value divergence — this port
         * returned from here having drawn nothing and went straight on to the
         * next monster's distfleeck rn2(5). */
        if (obj)
            learnwand(obj);
    }
}

/* C worn.c:570-705 update_mon_extrinsics: armor put on or taken off; might be
 * magical variety. `goto again`/`goto maybe_blocks` become a for(;;) loop that
 * runs the on/off switch at least once (the fallthrough from the C label to
 * the switch), then loops again only when the altwhich re-dispatch fires. */
export function update_mon_extrinsics(mon, obj, on, silently) {
    let which = MKOBJ_OC_OPROP[obj.otyp | 0] | 0;
    const altwhich = ume_altprop(obj);

    const unseen = !canseemon(mon);
    if (which || altwhich) {
        for (;;) {
            if (on) {
                switch (which) {
                case INVIS:
                    mon.minvis = mon.invis_blkd ? 0 : 1;
                    break;
                case FAST: {
                    const save_in_mklev = game.in_mklev;
                    if (silently)
                        game.in_mklev = true;
                    mon_adjust_speed(mon, 0, obj);
                    game.in_mklev = save_in_mklev;
                    break;
                }
                case ANTIMAGIC:
                case REFLECTING:
                case PROTECTION:
                    break;
                case CLAIRVOYANT:
                case STEALTH:
                case TELEPAT:
                    break;
                case LEVITATION:
                case FLYING:
                case WWALKING:
                    break;
                case DISPLACED:
                case FUMBLING:
                case JUMPING:
                    break;
                default:
                    mon.mextrinsics = (mon.mextrinsics | 0) | ume_res_to_mr(which);
                    break;
                }
            } else {
                switch (which) {
                case INVIS:
                    mon.minvis = mon.perminvis;
                    break;
                case FAST: {
                    const save_in_mklev = game.in_mklev;
                    if (silently)
                        game.in_mklev = true;
                    mon_adjust_speed(mon, 0, obj);
                    game.in_mklev = save_in_mklev;
                    break;
                }
                case FIRE_RES:
                case COLD_RES:
                case SLEEP_RES:
                case DISINT_RES:
                case SHOCK_RES:
                case POISON_RES:
                case ACID_RES:
                case STONE_RES: {
                    const mask = ume_res_to_mr(which);
                    let otmp;
                    for (otmp = mon.minvent; otmp; otmp = otmp.nobj) {
                        if (otmp === obj || !otmp.owornmask)
                            continue;
                        if ((MKOBJ_OC_OPROP[otmp.otyp | 0] | 0) === which)
                            break;
                        if (ume_altprop(otmp) === which)
                            break;
                    }
                    if (!otmp)
                        mon.mextrinsics = (mon.mextrinsics | 0) & ~mask;
                    break;
                }
                default:
                    break;
                }
            }

            if (altwhich && which !== altwhich) {
                which = altwhich;
                continue;
            }
            break;
        }
    }

    switch (ume_w_blocks(obj, ~0)) {
    case INVIS:
        mon.invis_blkd = on ? 1 : 0;
        mon.minvis = on ? 0 : mon.perminvis;
        break;
    default:
        break;
    }

    if (!on && mon === (game.u && game.u.usteed) && (obj.otyp | 0) === UME_SADDLE_OTYP)
        dismount_steed(DISMOUNT_FELL);

    if (!silently && (unseen ^ !canseemon(mon)))
        newsym(mon.mx, mon.my);
}

/* armcat_to_wornmask — C ref: nethack-c/src/worn.c:241-271 */
export function armcat_to_wornmask(cat) {
    let mask = 0;
    switch (cat) {
    case 0: /* ARM_SUIT */
        mask = W_ARM;
        break;
    case 1: /* ARM_SHIELD */
        mask = W_ARMS;
        break;
    case 2: /* ARM_HELM */
        mask = W_ARMH;
        break;
    case 3: /* ARM_GLOVES */
        mask = W_ARMG;
        break;
    case 4: /* ARM_BOOTS */
        mask = W_ARMF;
        break;
    case 5: /* ARM_CLOAK */
        mask = W_ARMC;
        break;
    case 6: /* ARM_SHIRT */
        mask = W_ARMU;
        break;
    }
    return mask;
}

/* into_vs_onto — C ref: nethack-c/src/trap.c:5354-5370 */
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

/* fill_pit — C ref: nethack-c/src/trap.c */
export async function fill_pit(x, y) {
    let t = t_at(x, y);
    if (t && (is_pit(t.ttyp) || is_hole(t.ttyp))) {
        let otmp = sobj_at(BOULDER, x, y);
        if (otmp) {
            obj_extract_self(otmp);
            await flooreffects(otmp, x, y, "settle");
        }
    }
}
/* launch_in_progress — C ref: nethack-c/src/trap.c:3234 */
export function launch_in_progress() {
    if (game.gl && game.gl.launchplace && game.gl.launchplace.obj)
        return true;
    return false;
}

/* m_useup — C ref: nethack-c/src/mthrowu.c:1160.  Remove one instance of an
 * item from a monster's inventory: decrement quan (recomputing owt) when the
 * stack has more than one, otherwise destroy the whole stack via m_useupall. */
export async function m_useup(mon, obj) {
    if (obj.quan > 1) {
        obj.quan--;
        obj.owt = weight(obj);
    } else {
        await m_useupall(mon, obj);
    }
}

/* C ref: worn.c:1377-1417 extract_from_minvent(mon, obj, do_extrinsics, silently).
 * "At its core this is just obj_extract_self(), but it also handles any updates
 * that need to happen if the gear is equipped."  Three THROWING STUBS of this
 * name exist (js/mklev.js:13129, js/steal.js:358, and the mklev one that
 * js/sp_lev.js routes around); this is the body, placed here because m_useupall
 * below is its first live caller and because update_mon_extrinsics already
 * lives in this file.  The other three call sites are deliberately NOT rewired
 * — each has its own callers to re-measure and that is a separate change.
 *
 * The gold-dragon-scales arm (worn.c:1399-1400) needs artifact_light + end_burn,
 * neither of which is importable here (js/dig.js's end_burn is a throwing stub);
 * it is a KNOWN GAP.  It fires only for a lit artifact_light suit. */
export async function extract_from_minvent(mon, obj, do_extrinsics, silently) {
    const unwornmask = obj.owornmask | 0;

    /* C worn.c:1393-1396 opens with
     *     if (obj->where != OBJ_MINVENT) { impossible(...); return; }
     * That guard is NOT reproduced, and the reason is measured, not assumed:
     * this port does not maintain obj->where for monster inventory.  The gnome
     * lord's potion of healing in seed0361 reads where == OBJ_FREE (0) while
     * sitting in mon->minvent, so C's guard rejects every real call and the
     * object is never unlinked.  mon->minvent IS maintained, so the unlink
     * below walks that chain and is the invariant this port actually has.
     * Restoring the guard needs obj->where to be written at every mpickobj /
     * mongets / m_initinv site first — a separate change. */
    /* C worn.c:1402 obj_extract_self(obj).  js/dokick.js's obj_extract_self is
     * NOT C's mkobj.c:2557 switch — it walks only the gm.migrating_objs chain
     * and silently returns for every other obj->where, so calling it here left
     * the object in mon->minvent.  C's OBJ_MINVENT arm (mkobj.c:2575-2578) is
     *     extract_nobj(obj, &obj->ocarry->minvent);
     *     obj->ocarry = (struct monst *) 0;
     * with extract_nobj (mkobj.c:2596-2614) setting where = OBJ_FREE and
     * nobj = 0.  Spelled here for the OBJ_MINVENT case this function is
     * defined for; widening obj_extract_self itself is a separate change with
     * its own callers to re-measure. */
    {
        let prev = null, curr = mon.minvent;
        while (curr && curr !== obj) { prev = curr; curr = curr.nobj; }
        if (!curr) {
            impossible_tr("extract_nobj: object lost");
        } else if (prev) {
            prev.nobj = curr.nobj;
        } else {
            mon.minvent = curr.nobj;
        }
        obj.where = OBJ_FREE_TR;
        obj.nobj = null;
        obj.ocarry = null;
    }
    obj.owornmask = 0;
    if (unwornmask) {
        if (!DEADMONSTER_TR(mon) && do_extrinsics) {
            update_mon_extrinsics(mon, obj, false, silently);
        }
        mon.misc_worn_check = (mon.misc_worn_check | 0) & ~unwornmask;
        /* give monster a chance to wear other equipment on its next move
           instead of waiting until it picks something up */
        check_gear_next_turn(mon);
    }
    await obj_no_longer_held(obj);
    if (unwornmask & W_WEP_TR) {
        mwepgone(mon); /* unwields and sets weapon_check to NEED_WEAPON */
    }
}
/* C obj.h:79 OBJ_MINVENT == 4, hack.h W_WEP == 0x100 (js/const.js:1109, :2216). */
const OBJ_MINVENT_TR = 4;
const OBJ_FREE_TR = 0;
const W_WEP_TR = 0x00000100;
function DEADMONSTER_TR(mon) { return !mon || (mon.mhp | 0) <= 0; }
function impossible_tr(msg) { pline("impossible: " + msg); }

/* m_useupall — C ref: nethack-c/src/mthrowu.c:1153-1158:
 *     extract_from_minvent(mon, obj, TRUE, FALSE);
 *     obfree(obj, (struct obj *) 0);
 * THE EXTRACT CALL WAS MISSING, under the note that its mutation "is confined
 * to the monster's own inventory chain, which the mapstate oracle does not
 * observe, so it has no oracle-visible effect on this corpus".  That was a
 * claim about an oracle, not about C, and it is now false: with use_defensive
 * live (js/makemon.js), seed0361's gnome lord quaffed the SAME potion of
 * healing on turn 30, 31, 33, 34 and 35, because m_useup never took it out of
 * minvent.  obfree's net observed effect is the single object deletion, which C
 * records on the go.objs_deleted queue via dealloc_obj; the objs_deleted.count
 * mapstate slot is a dead placeholder (js/mapstate_game_bridge.js) not derived
 * from that queue, so it is bumped in step with the one real deletion — the
 * same pattern js/cmd.js useupf and js/potion.js delobj use. */
export async function m_useupall(mon, obj) {
    await extract_from_minvent(mon, obj, true, false);
    await dealloc_obj(obj);
    const store = game.__bridge__ || (game.__bridge__ = {});
    const key = 'objs_deleted.count';
    const cur = store[key] !== undefined ? Number(store[key]) : 0;
    store[key] = String(cur + 1);
}
export function seetrap(trap) {
    if (!trap.tseen) {
        trap.tseen = 1;
        newsym(trap.tx, trap.ty);
    }
}
function steedintrap(trap, obj) { /* display-only, no RNG — no-op */ }

/* C ref: nethack-c/src/worn.c:1168 mon_break_armor */
export async function mon_break_armor(mon, polyspot) {
    /* local helpers mirroring C mondata.h / other macros not yet ported.
       verysmall/nohands/slithy/WrappingAllowed live at module scope above —
       shared verbatim with m_dowear (they used to be a divergent second copy). */
    const MZ_SMALL = 1;
    const S_CENTAUR = 29;
    /* C objects.h MUMMY_WRAPPING otyp == 138 (js/oc_name_data.js index 138,
       js/armor_data.js:82).  Was 264, which is a food-class otyp, so the
       `otyp != MUMMY_WRAPPING` guard below was unconditionally true. */
    const MUMMY_WRAPPING = 138;

    /* C mondata.h:56 has_horns(ptr) = num_horns(ptr) > 0 — mondata.c:678, a
       switch over monsndx(), NOT a flag test.  C has no M1_HORNS; the 0x10 this
       used to test is M1_CLING. */
    function has_horns(data) { return num_horns(data.pmidx | 0) > 0; }
    /* C mondata.h:57 is_whirly(ptr) = mlet == S_VORTEX || ptr == &mons[PM_AIR_ELEMENTAL];
       defsym.h:320 S_VORTEX == 22.  (Was 8, which is S_HUMANOID.) */
    function is_whirly(data) { return (data.mlet | 0) === _IMM_S_VORTEX || (data.pmidx | 0) === PM_AIR_ELEMENTAL; }
    /* C obj.h:418 is_flimsy(otmp) — oc_material <= LEATHER || otyp ==
       RUBBER_HOSE.  This was `return false`, i.e. "nothing is ever flimsy",
       which inverts worn.c:1290's helmet arm: `handless_or_tiny ||
       !is_flimsy(otmp)` then always held and a horned monster shed even a
       cloth/leather helmet C leaves on.  The real body is this file's own
       module-scope _mdw_is_flimsy (js/trap.js:2053), already C-faithful. */
    function is_flimsy(obj) { return _mdw_is_flimsy(obj); }
    function breakarm(data) { return breakarm_real(data); }
    function sliparm(data) { return sliparm_real(data); }
    function can_saddle(mon) { return can_saddle_real(mon); }
    function can_ride(mon) { return can_ride_real(mon); }
    function surface(mx, my) { return surface_real(mx, my); }
    /* C worn.c:1032-1044.  Armor which survives a form change is removed
       from the monster inventory, put on the current square, and marked as
       bypassed when this is a polymorph pass so the enclosing object walk
       cannot process it again during the same zap. */
    async function m_lose_armor(mon, obj, polyspot) {
        await extract_from_minvent(mon, obj, true, false);
        place_object(obj, mon.mx | 0, mon.my | 0);
        if (polyspot)
            bypass_obj(obj);
        newsym(mon.mx | 0, mon.my | 0);
    }
    function Soundeffect(se, vol) { /* stub: not yet ported */ }
    /* C ref: pline.c:435-452 — forwards to the module-level import.  This inner
       stub SHADOWED it and swallowed every call in the enclosing function. */
    function You_hear(str) { return _trap_You_hear(str); }
    function pline_mon(mon, fmt, ...args) {
        let msg = fmt;
        for (const arg of args) msg = msg.replace(/%[sdli]/, String(arg));
        pline(msg);
    }
    /* C you.h:323-324 — evaluate the shared hallucinating pronoun selector
       even when no armor is present; worn.c:1168 initializes both locals
       before testing breakarm/sliparm. */
    function mhim(mon) {
        return ["him", "her", "it", "them"][pronoun_gender(mon, 2)];
    }
    function mhis(mon) {
        return ["his", "her", "its", "their"][pronoun_gender(mon, 2)];
    }
    function touch_petrifies(data) { return (data.pmidx | 0) === PM_COCKATRICE || (data.pmidx | 0) === PM_CHICKATRICE; }
    function Stone_resistance() { return selftouch_Stone_resistance(); }
    function Is_dragon_scales(obj) { const t = obj?.otyp | 0; return t >= 111 && t <= 120; }
    function Is_dragon_mail(obj) { const t = obj?.otyp | 0; return t >= 101 && t <= 110; }
    function Dragon_scales_to_pm(obj) { return PM_GRAY_DRAGON + ((obj?.otyp | 0) - 111); }
    function Dragon_mail_to_pm(obj) { return PM_GRAY_DRAGON + ((obj?.otyp | 0) - 101); }
    function MON_WEP(m) {
        for (let o = m.minvent; o; o = o.nobj) {
            if (((o.owornmask | 0) & W_WEP) !== 0) return o;
        }
        return null;
    }
    function Mgender(m) { return m?.female ? 1 : 0; }
    function pmname(data, gender) { return monPmname(data?.pmidx | 0, gender); }
    async function instapetrify_local(arg) { return await instapetrify_real(arg); }

    let otmp;
    let mdat = mon.data;
    let vis = cansee(mon.mx | 0, mon.my | 0);
    let handless_or_tiny = (nohands(mdat) || verysmall(mdat));
    let noride = false;
    let pronoun = mhim(mon);
    let ppronoun = mhis(mon);

    if (breakarm(mdat)) {
        otmp = _which_armor(mon, W_ARM);
        if (otmp) {
            if ((Is_dragon_scales(otmp) && mdat === Dragon_scales_to_pm(otmp))
                || (Is_dragon_mail(otmp) && mdat === Dragon_mail_to_pm(otmp))) {
                /* no message here */
            } else {
                Soundeffect(0, 100);
                if (vis)
                    pline_mon(mon, "%s breaks out of %s armor!",
                              Monnam_t(mon), ppronoun);
                else
                    You_hear("a cracking sound.");
            }
            await m_useup(mon, otmp);
        }
        otmp = _which_armor(mon, W_ARMC);
        if (otmp && ((otmp.otyp | 0) !== MUMMY_WRAPPING || !WrappingAllowed(mdat))) {
            if (otmp.oartifact) {
                if (vis)
                    pline_mon(mon, "%s %s falls off!", _s_suffix(Monnam_t(mon)),
                          cloak_simple_name(otmp));
                await m_lose_armor(mon, otmp, polyspot);
            } else {
                Soundeffect(0, 100);
                if (vis)
                    pline_mon(mon, "%s %s tears apart!", _s_suffix(Monnam_t(mon)),
                          cloak_simple_name(otmp));
                else
                    You_hear("a ripping sound.");
                await m_useup(mon, otmp);
            }
        }
        otmp = _which_armor(mon, W_ARMU);
        if (otmp) {
            if (vis)
                pline_mon(mon, "%s shirt rips to shreds!",
                          _s_suffix(Monnam_t(mon)));
            else
                You_hear("a ripping sound.");
            await m_useup(mon, otmp);
        }
    } else if (sliparm(mdat)) {
        let passes_thru_clothes = !((mdat.msize | 0) <= MZ_SMALL);
        otmp = _which_armor(mon, W_ARM);
        if (otmp) {
            Soundeffect(0, 50);
            if (vis)
                pline_mon(mon, "%s armor falls around %s!",
                          _s_suffix(Monnam_t(mon)), pronoun);
            else
                You_hear("a thud.");
            await m_lose_armor(mon, otmp, polyspot);
        }
        otmp = _which_armor(mon, W_ARMC);
        if (otmp && ((otmp.otyp | 0) !== MUMMY_WRAPPING || !WrappingAllowed(mdat))) {
            if (vis) {
                if (is_whirly(mon.data))
                    pline_mon(mon, "%s %s falls, unsupported!",
                              _s_suffix(Monnam_t(mon)), cloak_simple_name(otmp));
                else
                    pline_mon(mon, "%s shrinks out of %s %s!",
                              Monnam_t(mon), ppronoun,
                              cloak_simple_name(otmp));
            }
            await m_lose_armor(mon, otmp, polyspot);
        }
        otmp = _which_armor(mon, W_ARMU);
        if (otmp) {
            if (vis) {
                if (passes_thru_clothes)
                    pline_mon(mon, "%s seeps right through %s shirt!",
                              Monnam_t(mon), ppronoun);
                else
                    pline_mon(mon, "%s becomes much too small for %s shirt!",
                          Monnam_t(mon), ppronoun);
            }
            await m_lose_armor(mon, otmp, polyspot);
        }
    }
    if (handless_or_tiny) {
        otmp = _which_armor(mon, W_ARMG);
        if (otmp) {
            if (vis)
                pline_mon(mon, "%s drops %s gloves%s!",
                          Monnam_t(mon), ppronoun,
                          MON_WEP(mon) ? " and weapon" : "");
            await m_lose_armor(mon, otmp, polyspot);
        }
        otmp = _which_armor(mon, W_ARMS);
        if (otmp) {
            Soundeffect(0, 50);
            if (vis)
                pline_mon(mon, "%s can no longer hold %s shield!",
                          Monnam_t(mon), ppronoun);
            else
                You_hear("a clank.");
            await m_lose_armor(mon, otmp, polyspot);
        }
    }
    if (handless_or_tiny || has_horns(mdat)) {
        otmp = _which_armor(mon, W_ARMH);
        if (otmp && (handless_or_tiny || !is_flimsy(otmp))) {
            if (vis)
                pline_mon(mon, "%s helmet falls to the %s!",
                          _s_suffix(Monnam_t(mon)), surface(mon.mx | 0, mon.my | 0));
            else
                You_hear("a clank.");
            await m_lose_armor(mon, otmp, polyspot);
        }
    }
    if (handless_or_tiny || slithy(mdat) || (mdat.mlet | 0) === S_CENTAUR) {
        otmp = _which_armor(mon, W_ARMF);
        if (otmp) {
            if (vis) {
                if (is_whirly(mon.data))
                    pline_mon(mon, "%s boots fall away!",
                              _s_suffix(Monnam_t(mon)));
                else
                    pline_mon(mon, "%s boots %s off %s feet!",
                              _s_suffix(Monnam_t(mon)),
                          verysmall(mdat) ? "slide" : "are pushed", ppronoun);
            }
            await m_lose_armor(mon, otmp, polyspot);
        }
    }
    if (!can_saddle(mon)) {
        otmp = _which_armor(mon, W_SADDLE);
        if (otmp) {
            await m_lose_armor(mon, otmp, polyspot);
            if (vis)
                pline_mon(mon, "%s saddle falls off.", _s_suffix(Monnam_t(mon)));
        }
        if (mon === (game.u ? game.u.usteed : null))
            noride = true;
    }
    if (noride || (mon === (game.u ? game.u.usteed : null) && !can_ride(mon))) {
        You("can no longer ride %s.", mon_nam(mon));
        if (touch_petrifies(game.u.usteed.data) && !Stone_resistance() && rnl(3)) {
            let buf;
            You("touch %s.", mon_nam(game.u.usteed));
            buf = "falling off " + an(pmname(game.u.usteed.data, Mgender(game.u.usteed)));
            await instapetrify_local(buf);
        }
        dismount_steed(DISMOUNT_FELL);
    }
    return 2;
}

/* C: trap.c drain_en() — lose n points of magical energy (spell failure,
 * anti-magic trap, Magicbane drain-life, etc). max_already_drained flips the
 * punctuation to "!" up front (caller already knows u.uenmax is being hit). */
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
            game.disp.botl = true;
        }
        mesg = 'momentarily lethargic';
    } else {
        /* throttle further loss a bit when there's not much left to lose */
        if (n > Math.trunc((u.uen + u.uenmax) / 3))
            n = rnd(n);

        mesg = 'your magical energy drain away';
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
        game.disp.botl = true;
    }
    /* after manipulating u.uen,uenmax and setting botl, so that
       You_feel() -> pline() will update status before the message.
       C: You_feel("%s%c", mesg, punct); */
    await pline(`You feel ${mesg}${punct}`);
}
