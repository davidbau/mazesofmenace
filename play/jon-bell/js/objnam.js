import { is_unpaid, unpaid_cost, get_cost_of_shop_item, record_price_quote, append_price_quote, currency, obfree, delete_contents } from './shk.js';
import { alter_cost, shk_your } from './shk.js'; // C do_name.c:410
import { lookup_novel, mon_pmname } from './do_name.js';
import { obj_pmname as obj_pmname_real } from './mhitm.js';
import { paniclog } from './files.js';
import { panic } from './dog.js';
import { impossible as naming_impossible } from './pline.js';
import { apron_text, tshirt_text, candy_wrapper_text } from './read.js';
import { COST_CONTENTS, BURN_OBJECT, ZOMBIFY_MON, TIMER_OBJECT, otrapped_of, GLIB as GLIB_PROP_ON } from './const.js';
// @ts-nocheck
// objnam.js — readobjnam and helpers for wish parsing.
// C ref: nethack-c-v5/upstream/src/objnam.c
// Hand-maintained JS (not tsc-emitted).
//
// This file ports the readobjnam call chain exercised by wiz_wish:
//   readobjnam → readobjnam_preparse → readobjnam_postparse1/2/3
//   → rnd_otyp_by_namedesc → mksobj
//
// RNG sequence per wish (Cardinal Rule 2: exact order/bounds):
//   1. rnd_otyp_by_namedesc: rn2(maxprob) when name match needed
//   2. mksobj: rnd(2) @ next_ident, then class-specific init RNG
//   3. makewish end: rn2(100) for u.ublesscnt (zap.c:6414)
import { pline, livelog_printf, impossible_sync, glow_color, glow_verb } from './display.js'; /* was an undeclared global: every pline() call in this file threw ReferenceError when reached */
import { weight } from './weight.js';
import { yn_function } from './end.js';
import { WT_IRON_BALL_INCR, LL_CONDUCT, LL_ARTIFACT } from './const.js';
import { rn2, rnd } from './rng.js';
import { game, wizard, discover } from './gstate.js';
import { clong } from './integer.js';
import { def_char_to_objclass } from './drawing.js';
import { mksobj, mkobj, place_object, eos, lowc, highc, letter, mungspaces, digit, OC_USES_KNOWN, ordin,
         /* C mkobj.c:1274 set_corpsenm — the CORPSE arm of readobjnam's corpsenm
          * block (objnam.c:5216-5222).  It re-runs start_corpse_timeout, so it
          * DRAWS; see the leaf note in _finalize_wish. */
         set_corpsenm, can_be_hatched, Can_fall_thru, zombie_form, rnd_class } from './mklev.js';
import { PM_LONG_WORM, PM_LONG_WORM_TAIL, PM_GRAY_OOZE, PM_BLACK_PUDDING,
         PM_GRAY_DRAGON, PM_YELLOW_DRAGON,
         PM_STUDENT, PM_CHIEFTAIN, PM_NEANDERTHAL, PM_ATTENDANT, PM_PAGE,
         PM_ABBOT, PM_ACOLYTE, PM_HUNTER, PM_THUG, PM_ROSHI, PM_GUIDE,
         PM_APPRENTICE, PM_WARRIOR, PM_ARCHEOLOGIST, PM_BARBARIAN,
         PM_CAVEMAN, PM_HEALER, PM_KNIGHT, PM_MONK, PM_CLERIC, PM_RANGER,
         PM_ROGUE, PM_SAMURAI, PM_TOURIST, PM_WIZARD, PM_VALKYRIE, PM_HUMAN,
         PM_ELF, PM_DWARF, PM_GNOME, PM_ORC, PM_MAIL_DAEMON } from './pm.generated.js';
import { MKOBJ_OC_PROB, MKOBJ_SVB_BASES, MKOBJ_OC_CLASS } from './mkobj_data.js';
import { getObjName } from './o_init.js';
import { OC_NAME } from './oc_name_data.js';
import { OC_DESCR } from './oc_descr_data.js';
import { OC_CHARGED, OC_COST } from './oc_cost_data.js';
import { hard_helmet, oc_armcat, doffing, donning } from './do_wear.js';
import { the_unique_pm, permonstTemplate, monPmname, trapname,
         /* C mondata.c:920 name_to_mon — readobjnam's "<obj> of <monster>" arm. */
         name_to_mon } from './makemon.js';
import { s_suffix,
         /* C mondata.c:832 name_to_monplus — readobjnam's leading-monster-name
          * strip ("troll corpse"), which also hands back the residual. */
         name_to_monplus } from './mhitm.js';
/* P_BOW/P_SHURIKEN (skills.h:43,48) bound is_poisonable()'s oc_skill window
 * (obj.h:264-267); const.js is their canonical home, so import rather than
 * redeclare (js/uhitm.js:1319's local `P_BOW = 21` is skills.h's P_SLING and is
 * wrong — see the cross-file note in the task report). */
import { NEUTRAL, ONAME, has_oname, BLINDED, P_BOW, P_SHURIKEN,
         P_HAMMER, P_POLEARMS, MV_KNOWS_EGG,
         PL_PSIZ, OBJ_INVENT, OBJ_CONTAINED, ONAME_VIA_NAMING, ONAME_WISH, ONAME_GIFT,
         ONAME_VIA_DIP, ONAME_LEVEL_DEF, ONAME_BONES, ONAME_RANDOM,
         ONAME_KNOW_ARTI, ONAME_SKIP_INVUPD, SPE_LIM,
         /* readobjnam_preparse's female/male/neuter arms and the
          * CORPSE/STATUE/FIGURINE spe switch (objnam.c:5147-5163). */
         MALE, FEMALE,
         CORPSTAT_RANDOM, CORPSTAT_FEMALE, CORPSTAT_MALE, CORPSTAT_NEUTER,
         CORPSTAT_GENDER,
         ismnum, NO_TRAP, TRAPNUM, ROCKTRAP, MAGIC_PORTAL, BEAR_TRAP, LANDMINE,
         is_hole, M_AP_TYPE, M_AP_OBJECT } from './const.js';
import { impossible_, maketrap, t_at, deltrap, reset_utrap } from './trap.js';
import { feel_newsym, docrt } from './display.js';
import { fire_damage_chain, water_damage_chain, pooleffects, switch_terrain, set_uinwater,
         waterbody_name, ice_descr } from './cmd.js';
import { set_artifact_intrinsic, untwoweapon } from './cmd.js';
import { make_grave, del_engr_at, fix_wall_spines, count_level_features, inside_shop } from './mklev.js';
import { recalc_block_point } from './vision.js';
import { is_pool, is_pool_or_lava } from './look.js';
import { is_ice } from './engrave.js';
import { spot_stop_timers } from './timeout.js';
import { start_melt_ice_timeout } from './zap.js';
import { FOUNTAIN, THRONE, SINK, POOL, MOAT, WATER, LAVAPOOL, LAVAWALL, ICE, ICED_POOL, ICED_MOAT,
         ALTAR, TREE, IRONBARS, CLOUD, DOOR, SDOOR, CORR, SCORR, ROOM, HWALL, VWALL, DBWALL,
         DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, DB_UNDER, DB_MOAT, DB_LAVA, DB_ICE, DB_FLOOR,
         F_LOOTED, T_LOOTED, S_LPUDDING, S_LDWASHER, S_LRING, TREE_LOOTED, TREE_SWARM,
         D_NODOOR, D_ISOPEN, D_BROKEN, D_CLOSED, D_LOCKED, D_TRAPPED, WM_MASK,
         A_CHAOTIC, A_NEUTRAL, A_LAWFUL, A_NONE, IS_WALL, IS_GRAVE, IS_FOUNTAIN, IS_SINK, IS_DOOR,
         Align2amask, TT_LAVA, MELT_ICE_AWAY, IS_FURNITURE, Is_rogue_level, LADDER, STAIRS,
         W_NONDIGGABLE, W_NONPASSWALL, HALLUC_RES, LEVITATION, FLYING, isok, COLNO, ROWNO } from './const.js';
import { update_inventory, noit_mon_nam } from './mhitm.js';
import { MKOBJ_OC_MATERIAL, MKOBJ_OC_SKILL, MKOBJ_OC_MERGE, MKOBJ_OC_MAGIC,
         MKOBJ_OC_OPROP } from './mkobj_erosion_meta.js';
/* observe_object() lives in o_init.c, i.e. js/o_init.js — import the ONE
 * body rather than re-deriving it here.  This module's private copy tested
 * `oindx >= 1` under a comment asserting "C: FIRST_OBJECT == 1"; FIRST_OBJECT
 * is 18 (objects.h:80-108).  js/o_init.js is already on this module's import
 * list (getObjName, line 25) and this file is already on o_init's, so the
 * cycle predates the change and gains no new edge.  discover_object is no
 * longer referenced here now that the wrapper is gone. */
import { observe_object } from './o_init.js';
/* tin_details() lives in eat.c (eat.c:1427) and is already ported + exported by
 * js/eat.js; xname_flags()'s FOOD_CLASS/TIN arm is its only caller here.  This
 * import closes a cycle (js/eat.js imports objName from this module), which ESM
 * resolves because both sides are hoisted function declarations. */
import { tin_details } from './eat.js';
/* C body_part(HAND) for doname's worn-ring / wielded-weapon suffixes.  Its home
 * is js/cmd.js (C's is botl.c/mon.c); cmd.js already imports this module, so
 * this closes a cycle — the same one js/do_wear.js and js/uhitm.js already sit
 * on.  Only ever called at runtime (never at module-evaluation time), which is
 * what makes the cycle safe in ESM. */
import { body_part, obj_extract_self_general } from './cmd.js';
import { begin_burn, peek_timer, start_timer } from './timeout.js';
/* distant_name()'s near/far test (objnam.c:387).  js/vision.js imports only
 * gstate/const/display, so this edge closes no cycle back into objnam.js. */
import { cansee as cansee_on } from './vision.js';
import { BOGUSMON_LINES } from './bogusmon_data.js';
import { mons_cnutrit, obj_nutrition } from './food_props.js';
import { counter_were } from './were.js';
import { artifact_light, arti_light_description } from './light.js';
import { convert_arg as quest_convert_arg, convert_line as quest_convert_line, qt_pager as quest_qt_pager,
         com_pager as quest_com_pager, deliver_by_pline } from './questpgr.js';

/* C ref: nethack-c/src/pline.c:587-637 impossible(const char *s, ...) — it
 * logs to the message window / paniclog and RETURNS; it never aborts.  Callers
 * depend on falling through to their own fallback (quest_info's `return 0`,
 * armor_simple_name's `return simpleonames(armor)`, the()/an()'s "the []"),
 * so this must NOT throw.  Modelled as a no-op: pline is async in this port
 * while these callers are sync, so the message itself is not emitted (same
 * disclosed incompleteness as the other seven copies in js/). */
function impossible(_msg, ..._args) { }

// C objnam.c:123-135: PREFIX bounds the reserved space before an object name.
function strprepend(s, pref) {
    if (pref.length > 80) {
        impossible('PREFIX too short (for %d).', pref.length);
        return s;
    }
    if (pref.includes('\n')) return pref.split('\n', 1)[0]; // C copynchars terminates here.
    return pref + s;
}

// ── Object-class constants (objclass.h) ─────────────────────────────────────
/* objclass.h:136 `enum objclass_classes { RANDOM_CLASS = 0, #include defsym.h }`
 * and defsym.h:466-484, where each OBJCLASS()/OBJCLASS2() row carries its own
 * index as arg 0.  RANDOM_CLASS = 0 is the "no class given" sentinel used by
 * readobjnam's `d->oclass`; ILLOBJ_CLASS is 1, not 0. */
const RANDOM_CLASS   = 0;
const ILLOBJ_CLASS   = 1;
const WEAPON_CLASS   = 2;
/* u_init.c object-table indices; u_init.js keeps these private, so retain
 * named local aliases until that module exposes its canonical table. */
const LAND_MINE_OTYP  = 243;
const BEARTRAP_OTYP   = 244;
const ARMOR_CLASS    = 3;
const RING_CLASS     = 4;
const AMULET_CLASS   = 5;
const TOOL_CLASS     = 6;
const FOOD_CLASS     = 7;
const POTION_CLASS   = 8;
const SCROLL_CLASS   = 9;
const SPBOOK_CLASS   = 10;
const WAND_CLASS     = 11;
const WAN_WISHING    = 414;
/* objects.h SCROLL("mail", "stamped", ...) -- resolved BY NAME against this
 * port's own object table (js/oc_name_data.js OC_NAME[364] === 'mail'), the
 * same 364 js/mklev.js:1909 and js/read.js already carry. */
const SCR_MAIL_OTYP  = 364;
const COIN_CLASS     = 12;
const GOLD_PIECE_OTYP = 438;
const GEM_CLASS      = 13;
const ROCK_CLASS     = 14;
const BALL_CLASS     = 15; /* defsym.h:482 OBJCLASS(15, '0', BALL,  ...) */
const CHAIN_CLASS    = 16; /* defsym.h:483 OBJCLASS(16, '_', CHAIN, ...) */
const VENOM_CLASS    = 17; /* defsym.h:484 OBJCLASS(17, '.', VENOM, ...) */
const MAXOCLASSES    = 18; /* fencepost past last valid class */

// ── Key otyp constants ────────────────────────────────────────────────────────
const STRANGE_OBJECT    = 0;   /* C: STRANGE_OBJECT = 0 */
const SCALE_MAIL        = 130; /* base "scale mail" armor (oc_prob 66) */
const POT_WATER         = 322;
const SCR_BLANK_PAPER   = 365;
const SPE_BLANK_PAPER   = 407;
/* objects.h SPBOOK() rows: SPE_BLANK_PAPER (407), SPE_NOVEL (408),
 * SPE_BOOK_OF_THE_DEAD (409) close the spellbook run — the Book of the Dead is
 * the LAST spellbook, not the first.  366 is SPE_DIG (svb.bases[SPBOOK]=366),
 * which made "spellbook of dig" render as bare "dig" below. */
const SPE_NOVEL            = 408;
const SPE_BOOK_OF_THE_DEAD = 409;
const MUMMY_WRAPPING    = 138; /* C enum value */
const ROBE              = 143; /* C enum value */
const ALCHEMY_SMOCK     = 144; /* C enum value */
/* gloves otyps (objects.h GLOVES order; GLOVES base = 159). */
const LEATHER_GLOVES        = 159;
const GAUNTLETS_OF_FUMBLING = 160;
const GAUNTLETS_OF_POWER    = 161;
const GAUNTLETS_OF_DEXTERITY = 162;

/* ── otyps used by xname_flags()'s class arms ────────────────────────────────
 * All read off the objects.h declaration order (== the OC_NAME index used
 * everywhere else in this file; cross-checked against js/oc_name_data.js). */
const KNIFE               = 40;
const SHORT_SWORD         = 46;
const BROADSWORD          = 52;
const GLAIVE              = 62;
const FLAIL               = 81;
const HELMET              = 97;
const PLATE_MAIL          = 121;
const LOCK_PICK           = 222;
const LENSES              = 232;
const TOWEL               = 234;
const SKELETON_KEY        = 221;
const HEAVY_IRON_BALL     = 477;
const IRON_CHAIN          = 478;
const BLINDING_VENOM      = 479;
const ACID_VENOM          = 480;
const FIGURINE            = 241;
const WOODEN_HARP         = 253;
const MAGIC_HARP          = 254;
const SLIME_MOLD          = 285;
const FOOD_RATION         = 293;
const TIN                 = 296;
const DILITHIUM_CRYSTAL   = 439;
const DIAMOND             = 440;
const RUBY                = 441;
const SAPPHIRE            = 443;
const BLACK_OPAL          = 444;
const EMERALD             = 445;
const OPAL                = 452;
const FLINT               = 473;
const BOULDER             = 475;
const STATUE              = 476;
/* objects.h:1624 "heavy iron ball" — its oc_weight column is 480.  BALL_CLASS
 * has exactly one member, so `ocl->oc_weight` in the BALL arm is always this. */
const HEAVY_IRON_BALL_OC_WEIGHT = 480;
/* objclass.h:33-34 */
const GEMSTONE = 20;
const MINERAL  = 21;
/* hack.h:1196 CORPSTAT_HISTORIC */
const CORPSTAT_HISTORIC = 0x04;
/* monst.h NON_PM */
const NON_PM = -1;
/* permonst.h:15 LOW_PM = NON_PM + 1 — C's "is this a real monster" test on
 * d->mntmp.  js/const.js exports the same 0. */
const LOW_PM = 0;
/* objnam.c:3928-3930 — the local #defines readobjnam's `contents` field takes. */
const TIN_UNDEFINED = 0;
const TIN_EMPTY = 1;
const TIN_SPINACH_C = 2;
/* C eat.c tintxts[] / tin_variety_txt().  The last entry is EMPTY_TIN and is
 * deliberately excluded from textual preparation matching. */
const TIN_VARIETY_TEXT = [
    'rotten', 'homemade', 'soup made from', 'french fried', 'pickled',
    'boiled', 'smoked', 'dried', 'deep fried', 'szechuan', 'broiled',
    'stir fried', 'sauteed', 'candied', 'pureed', '',
];
/* Box/chest and food otyps the wish tail switches on.  Verified against
 * js/mkobj_data.js by name (objName(214) == "large box", &c). */
const LARGE_BOX  = 214;
const CHEST      = 215;
const BAG_OF_TRICKS_OTYP = 220;
const HORN_OF_PLENTY_OTYP = 252;
const CORPSE     = 265;
const EGG        = 266;
/* objects.h:1528/1571 MARKER(FIRST_REAL_GEM, DILITHIUM_CRYSTAL) /
 * MARKER(LAST_REAL_GEM, JADE) — the range postparse3 scans by real name. */
const LAST_REAL_GEM = 460;
/* monflag.h:194/201 — the two geno/mvflags bits readobjnam's corpsenm block
 * tests.  js/mklev.js already carries G_NOCORPSE = 0x0010 for the same purpose. */
const G_UNIQ_OBJNAM = 0x1000;
const G_NOCORPSE_OBJNAM = 0x0010;
const G_GENOD_OBJNAM = 0x02;  /* monflag.h:209; extinction does not kill tins */
const G_GONE_OBJNAM = 0x03;   /* monflag.h:211; retained for corpse/figurine arms */
/* mondata.h — the permonst flag bits the CORPSE/FIGURINE arms read.  Same
 * values js/wizcmds.js:1547 and js/mklev.js:16416 use. */
const M2_MALE_OBJNAM   = 0x00010000;
const M2_FEMALE_OBJNAM = 0x00020000;
const M2_NEUTER_OBJNAM = 0x00040000;
const M2_WERE_OBJNAM   = 0x00000004;
const M2_HUMAN_OBJNAM  = 0x00000008;
function _is_male_pm(P)   { return ((P?.mflags2 | 0) & M2_MALE_OBJNAM) !== 0; }
function _is_female_pm(P) { return ((P?.mflags2 | 0) & M2_FEMALE_OBJNAM) !== 0; }
function _is_neuter_pm(P) { return ((P?.mflags2 | 0) & M2_NEUTER_OBJNAM) !== 0; }
function _is_were_pm(P)   { return ((P?.mflags2 | 0) & M2_WERE_OBJNAM) !== 0; }
/* C mon.c:470 genus() — a quest guardian's species, or (mode 1) its role. */
export function genus(mndx, mode) {
    const g = (a, b) => (mode ? a : b);
    switch (mndx) {
    case PM_STUDENT: return g(PM_ARCHEOLOGIST, PM_HUMAN);
    case PM_CHIEFTAIN: return g(PM_BARBARIAN, PM_HUMAN);
    case PM_NEANDERTHAL: return g(PM_CAVEMAN, PM_HUMAN);
    case PM_ATTENDANT: return g(PM_HEALER, PM_HUMAN);
    case PM_PAGE: return g(PM_KNIGHT, PM_HUMAN);
    case PM_ABBOT: return g(PM_MONK, PM_HUMAN);
    case PM_ACOLYTE: return g(PM_CLERIC, PM_HUMAN);
    case PM_HUNTER: return g(PM_RANGER, PM_HUMAN);
    case PM_THUG: return g(PM_ROGUE, PM_HUMAN);
    case PM_ROSHI: return g(PM_SAMURAI, PM_HUMAN);
    case PM_GUIDE: return g(PM_TOURIST, PM_HUMAN);
    case PM_APPRENTICE: return g(PM_WIZARD, PM_HUMAN);
    case PM_WARRIOR: return g(PM_VALKYRIE, PM_HUMAN);
    default: {
        const f2 = permonstTemplate(mndx)?.mflags2 | 0;
        if (f2 & 0x08) return PM_HUMAN;
        if (f2 & 0x10) return PM_ELF;
        if (f2 & 0x20) return PM_DWARF;
        if (f2 & 0x40) return PM_GNOME;
        if (f2 & 0x80) return PM_ORC;
    }
    }
    return mndx;
}
function _is_human_pm(P)  { return ((P?.mflags2 | 0) & M2_HUMAN_OBJNAM) !== 0; }
/* C svm.mvitals[mndx].mvflags, restricted to the two bits this file tests.
 * mklev.js:1393 composes it the same way: the STATIC G_NOCORPSE bit comes from
 * mons[].geno and only the in-game G_GONE half lives in svm.mvitals. */
function _mvflags_of(mndx) {
    const geno = permonstTemplate(mndx)?.geno | 0;
    return (geno & G_NOCORPSE_OBJNAM)
        | ((game.mvitals?.[mndx]?.mvflags | 0) & G_GONE_OBJNAM);
}
/* hack.h:61-66 — the CXN_xxx bitmask xname_flags()/corpse_xname() take. */
export const CXN_NORMAL   = 0;  /* no special handling */
export const CXN_SINGULAR = 1;  /* override quantity if greater than 1 */
export const CXN_NO_PFX   = 2;  /* suppress "the" from "the Unique Monst" */
export const CXN_PFX_THE  = 4;  /* prefix with "the " (unless pname) */
export const CXN_ARTICLE  = 8;  /* include a/an/the prefix */
export const CXN_NOCORPSE = 16; /* suppress " corpse" suffix */
/* role.c role order as this port numbers it (game.flags.initrole) — the same
 * indices the ROLE_LDRNUM/ROLE_NEMNUM tables below use, the same index
 * js/attrib.js:517 uses for Monk (5), and the same Samurai index (9)
 * js/cmd.js:5355 uses for its own Japanese_item_name shim. */
const ROLE_IDX_ARCHEOLOGIST = 0;
const ROLE_IDX_PRIEST       = 6;  /* PM_CLERIC */
const ROLE_IDX_SAMURAI      = 9;

// ── quest_info constants (C monflag.h) ────────────────────────────────────────
// MS_LEADER, MS_NEMESIS, MS_GUARDIAN correspond to quest role values.
const MS_LEADER   = 36; /* your class leader */
const MS_NEMESIS  = 37; /* your nemesis */
const MS_GUARDIAN = 38; /* your leader's guards */

// ── quest role arrays (C role.c) ──────────────────────────────────────────────
// urole[].ldrnum, neminum, guardnum per role (0=Archeologist..12=Wizard).
// These are directly from C role.c role struct initialization.
const ROLE_LDRNUM = [
    344, 345, 346, 347, 348, 349, 350, 352, 351, 353, 354, 355, 356,
];
const ROLE_NEMNUM = [
    357, 358, 359, 360, 361, 362, 363, 365, 364, 366, 352, 367, 368,
];
const ROLE_GUARDNUM = [
    369, 370, 371, 372, 373, 374, 375, 377, 376, 379, 380, 381, 382,
];

// ── wrpsym / wrp tables (objnam.c:2515-2525) ─────────────────────────────────
// Used to detect class-name prefixes/suffixes in wish strings.
// Array order must match C exactly.
const WRP_NAMES   = ["wand","ring","potion","scroll","gem","amulet","spellbook","spell book",
                     "weapon","armor","tool","food","comestible"];
const WRP_CLASSES = [WAND_CLASS, RING_CLASS, POTION_CLASS, SCROLL_CLASS, GEM_CLASS,
                     AMULET_CLASS, SPBOOK_CLASS, SPBOOK_CLASS,
                     WEAPON_CLASS, ARMOR_CLASS, TOOL_CLASS, FOOD_CLASS, FOOD_CLASS];
/* sizeof wrpsym = 13 — used for rn2(13) in the "any:" random path */
const SIZEOF_WRPSYM = 13;

// ── o_ranges (objnam.c:3344-3366) ────────────────────────────────────────────
// name → {oclass, first, last} for rnd_class dispatch.
// C objnam.c:3344-3366.  The f_o_range/l_o_range endpoints are otyps; they are
// read here straight out of objects.h's declaration order (== OC_NAME index,
// (MKOBJ_SVB_BASES[3]) and the armor run is helms(89) shields(150) gloves(159)
// every row but "bag"/"boots"/"dragon scale mail" named the wrong objects and
// so summed the wrong oc_prob window into rnd_class()'s rnd(sum).
const O_RANGES = [
    /* SACK .. BAG_OF_TRICKS                       */ { name: "bag",                  oclass: TOOL_CLASS,  first: 217, last: 220 },
    /* OIL_LAMP .. MAGIC_LAMP                      */ { name: "lamp",                 oclass: TOOL_CLASS,  first: 227, last: 228 },
    /* TALLOW_CANDLE .. WAX_CANDLE                 */ { name: "candle",               oclass: TOOL_CLASS,  first: 224, last: 225 },
    /* TOOLED_HORN .. HORN_OF_PLENTY               */ { name: "horn",                 oclass: TOOL_CLASS,  first: 249, last: 252 },
    /* SMALL_SHIELD .. SHIELD_OF_REFLECTION        */ { name: "shield",               oclass: ARMOR_CLASS, first: 150, last: 158 },
    /* FEDORA .. DUNCE_CAP                         */ { name: "hat",                  oclass: ARMOR_CLASS, first:  92, last:  94 },
    /* ELVEN_LEATHER_HELM .. HELM_OF_TELEPATHY     */ { name: "helm",                 oclass: ARMOR_CLASS, first:  89, last: 100 },
    /* LEATHER_GLOVES .. GAUNTLETS_OF_DEXTERITY    */ { name: "gloves",               oclass: ARMOR_CLASS, first: 159, last: 162 },
    /* LEATHER_GLOVES .. GAUNTLETS_OF_DEXTERITY    */ { name: "gauntlets",            oclass: ARMOR_CLASS, first: 159, last: 162 },
    /* LOW_BOOTS .. LEVITATION_BOOTS               */ { name: "boots",                oclass: ARMOR_CLASS, first: 163, last: 172 },
    /* LOW_BOOTS .. IRON_SHOES                     */ { name: "shoes",                oclass: ARMOR_CLASS, first: 163, last: 164 },
    /* MUMMY_WRAPPING .. CLOAK_OF_DISPLACEMENT     */ { name: "cloak",                oclass: ARMOR_CLASS, first: 138, last: 149 },
    /* HAWAIIAN_SHIRT .. T_SHIRT                   */ { name: "shirt",                oclass: ARMOR_CLASS, first: 136, last: 137 },
    /* GRAY_DRAGON_SCALES .. YELLOW_DRAGON_SCALES  */ { name: "dragon scales",        oclass: ARMOR_CLASS, first: 111, last: 120 },
    /* GRAY_DSM .. YELLOW_DSM                      */ { name: "dragon scale mail",    oclass: ARMOR_CLASS, first: 101, last: 110 },
    /* SHORT_SWORD .. KATANA                       */ { name: "sword",                oclass: WEAPON_CLASS, first: 46, last:  56 },
    /* BLINDING_VENOM .. ACID_VENOM                */ { name: "venom",                oclass: VENOM_CLASS,  first: 479, last: 480 },
    /* LUCKSTONE .. FLINT                          */ { name: "gray stone",           oclass: GEM_CLASS,    first: 470, last: 473 },
    /* LUCKSTONE .. FLINT                          */ { name: "grey stone",           oclass: GEM_CLASS,    first: 470, last: 473 },
];

// ── rnd_class (objnam.c:5401) ─────────────────────────────────────────────────
// C: x = rnd(sum); for (i=first; i<=last; i++) if ((x -= oc_prob[i]) <= 0) return i;
/* rn1 helper (not exported from rng.js) — same as C rn1(x,y)=rn2(x)+y */
function rn1_local(x, y) { return rn2(x) + y; }

// ── artifact list (nethack-c/include/artilist.h) ─────────────────────────────
// Full artifact table extracted from artilist.h: each artifact's display name
// (with article + capitalization) and its base object type (otyp).
//
// The `otyp` numbers are the JS otyp space (objects.h enum order, post-SCR_MAIL
// fix — the same numbering mksobj/mklev use), resolved from the C base-item enum
// names (LONG_SWORD=54, BATTLE_AXE=45, ATHAME=38, …, AMULET_OF_ESP=201).
//
// `arti` is the 1-based artilist index (a - artilist), matching C
// artifact_exists()'s otmp->oartifact value (artilist[0]=STRANGE_OBJECT, so the
// first real artifact, Excalibur, has index 1).  Used to set otmp.oartifact.
export const ARTILIST = [
    /*  1 */ { name: "Excalibur",                            otyp:  54, cost: 4000n }, /* LONG_SWORD */
    /*  2 */ { name: "Stormbringer",                         otyp:  58, cost: 8000n }, /* RUNESWORD */
    /*  3 */ { name: "Mjollnir",                             otyp:  76, cost: 4000n }, /* WAR_HAMMER */
    /*  4 */ { name: "Cleaver",                              otyp:  45, cost: 1500n }, /* BATTLE_AXE */
    /*  5 */ { name: "Grimtooth",                            otyp:  36, cost: 1200n }, /* ORCISH_DAGGER */
    /*  6 */ { name: "Orcrist",                              otyp:  53, cost: 2000n }, /* ELVEN_BROADSWORD */
    /*  7 */ { name: "Sting",                                otyp:  35, cost:  800n }, /* ELVEN_DAGGER */
    /*  8 */ { name: "Magicbane",                            otyp:  38, cost: 3500n }, /* ATHAME */
    /*  9 */ { name: "Frost Brand",                          otyp:  54, cost: 3000n }, /* LONG_SWORD */
    /* 10 */ { name: "Fire Brand",                           otyp:  54, cost: 3000n }, /* LONG_SWORD */
    /* 11 */ { name: "Dragonbane",                           otyp:  52, cost:  500n }, /* BROADSWORD */
    /* 12 */ { name: "Demonbane",                            otyp:  74, cost: 2500n }, /* SILVER_MACE */
    /* 13 */ { name: "Werebane",                             otyp:  51, cost: 1500n }, /* SILVER_SABER */
    /* 14 */ { name: "Grayswandir",                          otyp:  51, cost: 8000n }, /* SILVER_SABER */
    /* 15 */ { name: "Giantslayer",                          otyp:  54, cost:  200n }, /* LONG_SWORD */
    /* 16 */ { name: "Ogresmasher",                          otyp:  76, cost:  200n }, /* WAR_HAMMER */
    /* 17 */ { name: "Trollsbane",                           otyp:  75, cost:  200n }, /* MORNING_STAR */
    /* 18 */ { name: "Vorpal Blade",                         otyp:  54, cost: 4000n }, /* LONG_SWORD */
    /* 19 */ { name: "Snickersnee",                          otyp:  56, cost: 1200n }, /* KATANA */
    /* 20 */ { name: "Sunsword",                             otyp:  54, cost: 1500n }, /* LONG_SWORD */
    /* 21 */ { name: "The Orb of Detection",                 otyp: 231, cost: 2500n }, /* CRYSTAL_BALL */
    /* 22 */ { name: "The Heart of Ahriman",                 otyp: 470, cost: 2500n }, /* LUCKSTONE */
    /* 23 */ { name: "The Sceptre of Might",                 otyp:  73, cost: 2500n }, /* MACE */
    /* NOTE: "The Palantir of Westernesse" (CRYSTAL_BALL) appears in artilist.h
     * between The Sceptre of Might and The Staff of Aesculapius, but is wrapped
     * in `#if 0` (artilist.h:237-246 — OBSOLETE, the 3.1.0-3.2.x Elf-role quest
     * artifact, excluded since the Elf role was removed in 3.3.0).  It is NOT in
     * the compiled artilist[] and NOT in the ART_* enum, so it must NOT appear
     * here: every ordinal from The Staff of Aesculapius onward would be +1. */
    /* 24 */ { name: "The Staff of Aesculapius",             otyp:  79, cost: 5000n }, /* QUARTERSTAFF */
    /* 25 */ { name: "The Magic Mirror of Merlin",           otyp: 230, cost: 1500n }, /* MIRROR */
    /* 26 */ { name: "The Eyes of the Overworld",            otyp: 232, cost: 2500n }, /* LENSES */
    /* 27 */ { name: "The Mitre of Holiness",                otyp:  96, cost: 2000n }, /* HELM_OF_BRILLIANCE */
    /* 28 */ { name: "The Longbow of Diana",                 otyp:  83, cost: 4000n }, /* BOW */
    /* 29 */ { name: "The Master Key of Thievery",           otyp: 221, cost: 3500n }, /* SKELETON_KEY */
    /* 30 */ { name: "The Tsurugi of Muramasa",              otyp:  57, cost: 4500n }, /* TSURUGI */
    /* 31 */ { name: "The Platinum Yendorian Express Card",  otyp: 223, cost: 7000n }, /* CREDIT_CARD */
    /* 32 */ { name: "The Orb of Fate",                      otyp: 231, cost: 3500n }, /* CRYSTAL_BALL */
    /* 33 */ { name: "The Eye of the Aethiopica",            otyp: 201, cost: 4000n }, /* AMULET_OF_ESP */
];

// C artifact.c:artiname and arti_cost, shared by scoring and shop pricing.
export function artiname(artinum) {
    if (artinum <= 0 || artinum > ARTILIST.length)
        return '';
    return ARTILIST[artinum - 1].name;
}

export function arti_cost(otmp) {
    if (!otmp.oartifact)
        return BigInt(OC_COST[otmp.otyp]);
    else if (ARTILIST[otmp.oartifact - 1].cost)
        return ARTILIST[otmp.oartifact - 1].cost;
    else
        return 100n * BigInt(OC_COST[otmp.otyp]);
}

/* The two artilist[] columns mk_artifact() needs that ARTILIST above does not
 * carry, kept here so the three tables cannot drift apart.  Both are keyed by
 * the 1-BASED artifact ordinal (ARTILIST[m - 1]), i.e. the value stored in
 * obj.oartifact, and both were extracted mechanically from
 * nethack-c-v5/upstream/include/artilist.h (the A() macro's `s1` spfx column
 * and its `gs` gen_spe column), NOT hand-transcribed — same provenance as
 * js/attrib.js's ARTILIST_SPFX, and on the same compiled numbering that
 * excludes the `#if 0`-d Palantir (see the NOTE inside ARTILIST).
 *
 * ARTI_NOGEN — artilist[m].spfx & SPFX_NOGEN: never produced by random
 * generation.  Excalibur (only ever made by dipping) plus every quest
 * artifact.  ARTI_GEN_SPE — artilist[m].gen_spe, added to the base item's spe
 * by mk_artifact's adjust_spe tail; zero for every artifact not listed. */
export const ARTI_NOGEN = new Set([
    1, /* Excalibur */
    21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, /* the quest artifacts */
]);
export const ARTI_GEN_SPE = {
    6: 3,  /* Orcrist */        7: 3,  /* Sting */
    11: 2, /* Dragonbane */     12: 1, /* Demonbane */
    13: 1, /* Werebane */       15: 2, /* Giantslayer */
    16: 2, /* Ogresmasher */    17: 2, /* Trollsbane */
    18: 1, /* Vorpal Blade */
};

/* C hacklib.c:849 fuzzymatch — compare two strings for equality, ignoring the
 * presence of the specified characters (here " -") and case. */
export function fuzzymatch(s1, s2, ignore_chars, caseblind) {
    let i = 0, j = 0;
    let c1, c2;
    do {
        do { c1 = (i < s1.length) ? s1[i++] : ''; }
        while (c1 !== '' && ignore_chars.indexOf(c1) >= 0);
        do { c2 = (j < s2.length) ? s2[j++] : ''; }
        while (c2 !== '' && ignore_chars.indexOf(c2) >= 0);
        if (!c1 || !c2)
            break; /* end of either string reached */
        if (caseblind) {
            c1 = c1.toLowerCase();
            c2 = c2.toLowerCase();
        }
    } while (c1 === c2);
    /* match occurs only when the end of both strings has been reached */
    return (!c1 && !c2);
}

/* C hacklib.c:781 strncmpi (case-insensitive, n chars), used here only for the
 * "the " prefix check.  Returns true when the first n chars match case-blind. */
function _startsWithThe(name) {
    return name.length >= 4 && name.slice(0, 4).toLowerCase() === "the ";
}

// ── artifact_name (nethack-c/src/artifact.c:328-353) ─────────────────────────
// Returns the full (display) name of an artifact named `name` if one exists,
// plus its base object type via the returned record's `otyp`.  Returns null if
// no match.  `fuzzy` allows extra/omitted spaces or dashes (fuzzymatch " -").
// C strips a leading "the " from both the player string and each artifact name
// before comparing.
export function artifact_name(name, fuzzy) {
    if (_startsWithThe(name))
        name = name.slice(4);
    for (let m = 0; m < ARTILIST.length; m++) {
        const a = ARTILIST[m];
        let aname = a.name;
        if (_startsWithThe(aname))
            aname = aname.slice(4);
        const matched = !fuzzy
            ? (name.toLowerCase() === aname.toLowerCase())
            : fuzzymatch(name, aname, " -", true);
        if (matched)
            return { name: a.name, otyp: a.otyp, arti: m + 1 };
    }
    return null;
}

// ── artifact existence tracking (nethack-c/src/artifact.c artiexist[]) ───────
// C keeps a per-artifact arti_info table `artiexist[1 + NROFARTIFACTS]`; the
// `.exists` bit is set when an artifact is created (oname() -> artifact_exists()
// -> artifact_origin(), artifact.c:488).  We mirror only the `.exists` bit, which
// is all nartifact_exist() reads.  Stored on game state keyed by 1-based arti idx.
function _artiexist() {
    if (!game._artiexist)
        game._artiexist = {}; /* arti index (1-based) -> true when exists */
    return game._artiexist;
}

/* C objects.h RIN_INCREASE_DAMAGE — the one artifact base type whose spe is
 * reset by artifact_exists() (js/do_wear.js:2258 has the same constant). */
const RIN_INCREASE_DAMAGE_OTYP = 177;

/* An entry of game._artiexist is either the legacy `true` (written by the wish
 * path above, which predates the per-origin bits) or a full arti_info record
 * written by _artifact_origin below.  Both mean "exists". */
function _arti_exists_bit(m) {
    const e = _artiexist()[m];
    return !!e && (e === true || !!e.exists);
}

// C artifact.c:461-471 nartifact_exist — count artifacts whose .exists bit is set.
export function nartifact_exist() {
    const ae = _artiexist();
    let a = 0;
    for (const k in ae)
        if (_arti_exists_bit(k)) ++a;
    return a;
}

/* C artifact.c:426-459 artifact_origin(arti, aflags) — record HOW the artifact
 * came into being.  RNG-free; pure bookkeeping on artiexist[].  The `ct != 1`
 * impossible() is C's own consistency check and is kept as an inert warning
 * (C's impossible() does not abort either). */
export function _artifact_origin(arti, aflags) {
    const a = arti.oartifact | 0;
    if (!a)
        return;
    /* start by clearing all bits; most are mutually exclusive */
    const rec = {
        exists: 1, found: 0, wish: 0, gift: 0, viadip: 0,
        named: 0, lvldef: 0, bones: 0, rndm: 0,
    };
    if ((aflags & ONAME_KNOW_ARTI) !== 0)
        rec.found = 1;
    let ct = 0;
    if ((aflags & ONAME_WISH) !== 0) { rec.wish = 1; ++ct; }
    if ((aflags & ONAME_GIFT) !== 0) { rec.gift = 1; ++ct; }
    if ((aflags & ONAME_VIA_DIP) !== 0) { rec.viadip = 1; ++ct; }
    if ((aflags & ONAME_VIA_NAMING) !== 0) { rec.named = 1; ++ct; }
    if ((aflags & ONAME_LEVEL_DEF) !== 0) { rec.lvldef = 1; ++ct; }
    if ((aflags & ONAME_BONES) !== 0) { rec.bones = 1; ++ct; }
    if ((aflags & ONAME_RANDOM) !== 0) { rec.rndm = 1; ++ct; }
    _artiexist()[a] = rec;
    if (ct !== 1)
        impossible_(`invalid artifact origin: ${aflags.toString(8)}`);
}

/* C artifact.c:340-352 exist_artifact(int otyp, const char *name) — has the
 * artifact with this EXACT name and base type already been created?  Note C
 * uses strcmp, not the fuzzy/"the "-stripping match artifact_name() uses. */
export function exist_artifact(otyp, name) {
    if (otyp && name) {
        for (let m = 0; m < ARTILIST.length; m++)
            if (ARTILIST[m].otyp === otyp && ARTILIST[m].name === name)
                return _arti_exists_bit(m + 1);
    }
    return false;
}

/* C artifact.c:355-390 artifact_exists(otmp, name, mod, flgs) — an artifact has
 * just been created (mod=TRUE) or is being un-created (mod=FALSE).  RNG-free. */
export function artifact_exists(otmp, name, mod, flgs) {
    if (otmp && name) {
        for (let m = 0; m < ARTILIST.length; m++) {
            const a = ARTILIST[m];
            if (a.otyp === otmp.otyp && a.name === name) {
                const idx = m + 1;
                otmp.oartifact = mod ? idx : 0;
                otmp.age = 0;
                if (otmp.otyp === RIN_INCREASE_DAMAGE_OTYP)
                    otmp.spe = 0;
                if (mod) { /* means being created rather than un-created */
                    /* one--and only one--of these should always be set */
                    if ((flgs & (ONAME_VIA_NAMING | ONAME_WISH | ONAME_GIFT
                                 | ONAME_VIA_DIP | ONAME_LEVEL_DEF
                                 | ONAME_BONES | ONAME_RANDOM)) === 0)
                        flgs |= ONAME_RANDOM; /* the default origin */
                    _artifact_origin(otmp, flgs);
                } else { /* uncreate */
                    _artiexist()[idx] = false; /* zero_artiexist */
                }
                break;
            }
        }
    }
}

/* C do_name.c:79-133 oname(obj, name, oflgs) — assign a custom name to an
 * object, promoting it to an artifact when the name matches artilist[].
 * RNG-free.
 *
 * C's `lth` is the C string length INCLUDING the NUL, and it is used only as a
 * truthiness test plus the new_oname() allocation size, so JS keeps it as a
 * count and never allocates. */
export async function oname(obj, name, oflgs) {
    const via_naming = (oflgs & ONAME_VIA_NAMING) !== 0;
    const skip_inv_update = (oflgs & ONAME_SKIP_INVUPD) !== 0;
    let nm = (name == null) ? '' : String(name);
    let lth = nm.length ? nm.length + 1 : 0;

    if (lth > PL_PSIZ) {
        lth = PL_PSIZ;
        nm = nm.slice(0, PL_PSIZ - 1); /* strncpy(buf, name, PL_PSIZ-1) + NUL */
    }
    /* If named artifact exists in the game, do not create another.
       Also trying to create an artifact shouldn't de-artifact
       it (e.g. Excalibur from prayer). In this case the object
       will retain its current name. */
    if ((obj.oartifact | 0) || (lth && exist_artifact(obj.otyp, nm)))
        return obj;

    if (!obj.oextra)
        obj.oextra = {};
    obj.oextra.oname = lth ? nm : undefined;

    if (lth)
        artifact_exists(obj, nm, true, oflgs);
    if (obj.oartifact | 0) {
        /* C do_name.c:402-404: can't dual-wield with an artifact secondary. */
        if (obj === game.u.uswapwep)
            await untwoweapon();
        /* activate warning if you've just named your weapon "Sting" */
        if (obj === game.u.uwep)
            set_artifact_intrinsic(obj, true, W_WEP_D); // C do_name.c:406-407
        /* if obj is owned by a shop, increase your bill */
        if (obj.unpaid)
            await alter_cost(obj, 0);
        if (via_naming) {
            /* violate illiteracy conduct since successfully wrote arti-name */
            const uc = (game.u.uconduct = game.u.uconduct || {});
            const wasLiterate = (uc.literate | 0);
            uc.literate = wasLiterate + 1;
            if (!wasLiterate)
                livelog_printf(LL_CONDUCT | LL_ARTIFACT,
                               'became literate by naming %s',
                               bare_artifactname(obj));
            else
                livelog_printf(LL_ARTIFACT,
                               'chose %s to be named "%s"',
                               ansimpleoname(obj), bare_artifactname(obj));
        }
    }
    /* C: carried(o) == (o->where == OBJ_INVENT) */
    if (obj.where === OBJ_INVENT && !skip_inv_update)
        update_inventory();
    return obj;
}

// C questpgr.c:66-70 is_quest_artifact(otmp) -> (otmp->oartifact == gu.urole.questarti)
// gu.urole.questarti is the role's quest artifact, an ART_ enum == 1-based artilist
// index (makedefs generates ART_ enums in artilist.h order).  role.c roles[] table.
// Indexed by the roles[] INDEX (0=Arc 1=Bar 2=Cav 3=Hea 4=Kni 5=Mon 6=Pri
// 7=Rog 8=Ran 9=Sam 10=Tou 11=Val 12=Wiz) — i.e. flags.initrole, which is what
// quest_info(0) below reads.  NOT by urole.mnum: C's Role.mnum is the role's
// game.urole.mnum is 331, not 0.
const _ROLE_QUESTARTI = [
    21, /* 0 Arc: ART_ORB_OF_DETECTION */
    22, /* 1 Bar: ART_HEART_OF_AHRIMAN */
    23, /* 2 Cav: ART_SCEPTRE_OF_MIGHT */
    24, /* 3 Hea: ART_STAFF_OF_AESCULAPIUS */
    25, /* 4 Kni: ART_MAGIC_MIRROR_OF_MERLIN */
    26, /* 5 Mon: ART_EYES_OF_THE_OVERWORLD */
    27, /* 6 Pri: ART_MITRE_OF_HOLINESS */
    29, /* 7 Rog: ART_MASTER_KEY_OF_THIEVERY */
    28, /* 8 Ran: ART_LONGBOW_OF_DIANA */
    30, /* 9 Sam: ART_TSURUGI_OF_MURAMASA */
    31, /* 10 Tou: ART_YENDORIAN_EXPRESS_CARD */
    32, /* 11 Val: ART_ORB_OF_FATE */
    33, /* 12 Wiz: ART_EYE_OF_THE_AETHIOPICA */
];
export function is_quest_artifact(otmp) {
    /* C: `otmp->oartifact == gu.urole.questarti`.  This used to index
     * _ROLE_QUESTARTI by game.urole.mnum, which role_init() sets to the role's
     * PM_ index (331 for Archeologist), so the bounds test failed and every
     * object was answered "not the quest artifact".  quest_info(0) is the same
     * lookup off flags.initrole and is already the port's one spelling of it. */
    const questarti = quest_info(0) | 0;
    return !!(otmp && (otmp.oartifact | 0) === questarti && questarti !== 0);
}

// ── Object name table ─────────────────────────────────────────────────────────
// Each entry: { otyp, name, descr }
// 'name'  = OBJ_NAME(objects[i])  — the actual object name
// 'descr' = OBJ_DESCR(objects[i]) — the description (shuffled for identified classes)
// 'dn'    = shuffled description from game state (for amulets/rings/potions/etc.)
//
// Additional names come from OC_NAME; this table supplies local descriptions.
//
// Amulets (otyp 201-213, AMULET_CLASS=5):
//   Descriptions are shuffled at game start. We store the CANONICAL descriptions
//   here (before shuffling) as a fallback; the actual matching uses the SHUFFLED
//   description stored in game._objDescriptions if present.
//   For wishymatch purposes, name lookup ("amulet of life saving") uses the REAL
//   NAME, not the shuffled description.
//

const OBJ_NAME_TABLE = [
    // ── WEAPON_CLASS (otyp 18-88) ─────────────────────────────────────────
    // Selected weapons needed for potential wishes; not exhaustive.

    // ── ARMOR_CLASS (otyp 89-172) ─────────────────────────────────────────
    // Dragon scale mails (otyp 101-110) and dragon scales (111-120), straight
    // out of include/objects.h's DRGN_ARMR block.
    //
    // THE TWO DEFERRALS ARE THE OTHER WAY ROUND FROM WHAT THIS TABLE USED TO
    // SAY.  objects.h:504-509 declares GOLD unconditionally and wraps
    // SHIMMERING in `#if 0 /* DEFERRED */` — so gold IS in the build and
    // shimmering is NOT, for BOTH the mails and the scales.  This table had it
    // inverted (no gold row, a shimmering row at 103) and also placed the
    // scales at 89-98, which is the HELM range (O_RANGES above, and
    // js/armor_data.js, both put helms at 89-100 and scales at 111-120).
    // Wish lookup resolves object names through this table while
    // mksobj/doname name the result through armor_data.js, so every mismatched
    // silver dragon scale mail", got otyp 102, and printed "j - a gold dragon
    // scale mail." where C prints "j - a silver dragon scale mail."
    { otyp: 101, oclass: ARMOR_CLASS, name: "gray dragon scale mail",    descr: null },
    { otyp: 102, oclass: ARMOR_CLASS, name: "gold dragon scale mail",    descr: null },
    { otyp: 103, oclass: ARMOR_CLASS, name: "silver dragon scale mail",  descr: null },
    { otyp: 104, oclass: ARMOR_CLASS, name: "red dragon scale mail",     descr: null },
    { otyp: 105, oclass: ARMOR_CLASS, name: "white dragon scale mail",   descr: null },
    { otyp: 106, oclass: ARMOR_CLASS, name: "orange dragon scale mail",  descr: null },
    { otyp: 107, oclass: ARMOR_CLASS, name: "black dragon scale mail",   descr: null },
    { otyp: 108, oclass: ARMOR_CLASS, name: "blue dragon scale mail",    descr: null },
    { otyp: 109, oclass: ARMOR_CLASS, name: "green dragon scale mail",   descr: null },
    { otyp: 110, oclass: ARMOR_CLASS, name: "yellow dragon scale mail",  descr: null },
    // Dragon scales (111-120) — not mails
    { otyp: 111, oclass: ARMOR_CLASS, name: "gray dragon scales",        descr: null },
    { otyp: 112, oclass: ARMOR_CLASS, name: "gold dragon scales",        descr: null },
    { otyp: 113, oclass: ARMOR_CLASS, name: "silver dragon scales",      descr: null },
    { otyp: 114, oclass: ARMOR_CLASS, name: "red dragon scales",         descr: null },
    { otyp: 115, oclass: ARMOR_CLASS, name: "white dragon scales",       descr: null },
    { otyp: 116, oclass: ARMOR_CLASS, name: "orange dragon scales",      descr: null },
    { otyp: 117, oclass: ARMOR_CLASS, name: "black dragon scales",       descr: null },
    { otyp: 118, oclass: ARMOR_CLASS, name: "blue dragon scales",        descr: null },
    { otyp: 119, oclass: ARMOR_CLASS, name: "green dragon scales",       descr: null },
    { otyp: 120, oclass: ARMOR_CLASS, name: "yellow dragon scales",      descr: null },
    // Gloves (159-162) — objects.h:686-697 (GLOVES macro).
    // Needed so wishes like "gauntlets of power" match here (rn2(oc_prob+1))
    // instead of falling through to the random-object fallback rn2(SIZEOF_WRPSYM).
    { otyp: 159, oclass: ARMOR_CLASS, name: "leather gloves",          descr: "old gloves" },
    { otyp: 160, oclass: ARMOR_CLASS, name: "gauntlets of fumbling",   descr: "padded gloves" },
    { otyp: 161, oclass: ARMOR_CLASS, name: "gauntlets of power",      descr: "riding gloves" },
    { otyp: 162, oclass: ARMOR_CLASS, name: "gauntlets of dexterity",  descr: "fencing gloves" },
    // Boots (163-172)
    { otyp: 163, oclass: ARMOR_CLASS, name: "low boots",          descr: "walking shoes" },
    { otyp: 164, oclass: ARMOR_CLASS, name: "iron shoes",         descr: "hard shoes" },
    { otyp: 165, oclass: ARMOR_CLASS, name: "high boots",         descr: "jackboots" },
    { otyp: 166, oclass: ARMOR_CLASS, name: "speed boots",        descr: "combat boots" },
    { otyp: 167, oclass: ARMOR_CLASS, name: "water walking boots",descr: "jungle boots" },
    { otyp: 168, oclass: ARMOR_CLASS, name: "jumping boots",      descr: "hiking boots" },
    { otyp: 169, oclass: ARMOR_CLASS, name: "elven boots",        descr: "mud boots" },
    { otyp: 170, oclass: ARMOR_CLASS, name: "kicking boots",      descr: "buckled boots" },
    { otyp: 171, oclass: ARMOR_CLASS, name: "fumble boots",       descr: "riding boots" },
    { otyp: 172, oclass: ARMOR_CLASS, name: "levitation boots",   descr: "snow boots" },

    // ── AMULET_CLASS (otyp 201-213) ───────────────────────────────────────
    { otyp: 201, oclass: AMULET_CLASS, name: "amulet of ESP",                descr: "circular" },
    { otyp: 202, oclass: AMULET_CLASS, name: "amulet of life saving",        descr: "spherical" },
    { otyp: 203, oclass: AMULET_CLASS, name: "amulet of strangulation",      descr: "oval" },
    { otyp: 204, oclass: AMULET_CLASS, name: "amulet of restful sleep",      descr: "triangular" },
    { otyp: 205, oclass: AMULET_CLASS, name: "amulet versus poison",         descr: "pyramidal" },
    { otyp: 206, oclass: AMULET_CLASS, name: "amulet of change",             descr: "square" },
    { otyp: 207, oclass: AMULET_CLASS, name: "amulet of unchanging",         descr: "concave" },
    { otyp: 208, oclass: AMULET_CLASS, name: "amulet of reflection",         descr: "hexagonal" },
    { otyp: 209, oclass: AMULET_CLASS, name: "amulet of magical breathing",  descr: "octagonal" },
    { otyp: 210, oclass: AMULET_CLASS, name: "amulet of guarding",           descr: "perforated" },
    /* otyp 211/212 are special (prob=0), otyp 213 = AMULET_OF_YENDOR (prob=0) */

    // ── TOOL_CLASS (otyp 214-262) ─────────────────────────────────────────
    { otyp: 219, oclass: TOOL_CLASS,   name: "bag of holding",              descr: null },
    { otyp: 220, oclass: TOOL_CLASS,   name: "bag of tricks",               descr: null },
    { otyp: 242, oclass: TOOL_CLASS,   name: "magic marker",                descr: null },

    // ── SCROLL_CLASS (otyp 323-365) ───────────────────────────────────────
    // Scrolls have shuffled descriptions; name is the real name, descr is the
    // randomized label. For wishing, players use the real name.
    { otyp: 323, oclass: SCROLL_CLASS, name: "scroll of enchant armor",     descr: null },
    { otyp: 324, oclass: SCROLL_CLASS, name: "scroll of destroy armor",     descr: null },
    { otyp: 325, oclass: SCROLL_CLASS, name: "scroll of confuse monster",   descr: null },
    { otyp: 326, oclass: SCROLL_CLASS, name: "scroll of scare monster",     descr: null },
    { otyp: 327, oclass: SCROLL_CLASS, name: "scroll of remove curse",      descr: null },
    { otyp: 328, oclass: SCROLL_CLASS, name: "scroll of enchant weapon",    descr: null },
    { otyp: 329, oclass: SCROLL_CLASS, name: "scroll of create monster",    descr: null },
    { otyp: 330, oclass: SCROLL_CLASS, name: "scroll of taming",            descr: null },
    { otyp: 331, oclass: SCROLL_CLASS, name: "scroll of genocide",          descr: null },
    { otyp: 332, oclass: SCROLL_CLASS, name: "scroll of light",             descr: null },
    { otyp: 333, oclass: SCROLL_CLASS, name: "scroll of teleportation",     descr: null },
    { otyp: 334, oclass: SCROLL_CLASS, name: "scroll of gold detection",    descr: null },
    { otyp: 335, oclass: SCROLL_CLASS, name: "scroll of food detection",    descr: null },
    { otyp: 336, oclass: SCROLL_CLASS, name: "scroll of identify",          descr: null },
    { otyp: 337, oclass: SCROLL_CLASS, name: "scroll of magic mapping",     descr: null },
    { otyp: 338, oclass: SCROLL_CLASS, name: "scroll of amnesia",           descr: null },
    { otyp: 339, oclass: SCROLL_CLASS, name: "scroll of fire",              descr: null },
    { otyp: 340, oclass: SCROLL_CLASS, name: "scroll of earth",             descr: null },
    { otyp: 341, oclass: SCROLL_CLASS, name: "scroll of punishment",        descr: null },
    { otyp: 342, oclass: SCROLL_CLASS, name: "scroll of charging",          descr: null },
    { otyp: 343, oclass: SCROLL_CLASS, name: "scroll of stinking cloud",    descr: null },
    { otyp: 365, oclass: SCROLL_CLASS, name: "scroll of blank paper",       descr: "unlabeled" },
];

// ── Shuffled description map ─────────────────────────────────────────────────
// game._objDescriptions[otyp] = shuffled description string (set at game init).
// Amulet descriptions get shuffled in o_init.c; we read them from game state
// if available, or fall back to canonical description otherwise.
export function getObjDescr(otyp) {
    const g = game;
    if (g._objDescriptions && g._objDescriptions[otyp] != null)
        return g._objDescriptions[otyp];
    const d = (otyp >= 0 && otyp < OC_DESCR.length) ? OC_DESCR[otyp] : null;
    return (d != null) ? d : null;
}
// ── obj_typename (objnam.c:200-293) ──────────────────────────────────────────
// C: char *obj_typename(int otyp) — the type name shown in the discoveries list.
// Implemented for the name-KNOWN case (every item dodiscovered displays is a
// discovered/known type), with the shuffled description appended in "(descr)".
// C ref: objnam.c:221-292.  oclass numbering: WEAPON=2, ARMOR=3, RING=4,
// AMULET=5, POTION=8, SCROLL=9, SPBOOK=10, WAND=11.
export function obj_typename(otyp) {
    let actualn = _objName(otyp);              /* OBJ_NAME — real name */
    let dn = getObjDescr(otyp);                /* OBJ_DESCR — shuffled appearance */
    const un = (game._oc_uname && game._oc_uname[otyp] != null)
        ? game._oc_uname[otyp] : null;
    let nn = !!(game._oc_name_known && game._oc_name_known[otyp]);
    /* C objnam.c:170 xcalled(buf, siz, pfx, sfx) — `<buf><pfx> called <un>`.
     * pfx is "" at every obj_typename call site. */
    const _called = (s, descr = dn) => (un ? xcalled(s, 256 - (descr ? descr.length + 3 : 0), '', un) : s);
    /* C objnam.c:210-213 — the Samurai's Japanese renames, which this function
     * was missing even though xname_flags' own copy (:605-609, js/objnam.js
     * _xn_ctx) has them:
     *     if (Role_if(PM_SAMURAI)) {
     *         actualn = Japanese_item_name(otyp, actualn);
     *         if (otyp == WOODEN_HARP || otyp == MAGIC_HARP) dn = "koto";
     *     }
     * Japanese_item_name returns `ordinaryname` when the otyp has no Japanese
     * name, which this port models as a null return (keep actualn). */
    if (_Role_if(ROLE_IDX_SAMURAI)) {
        const j = Japanese_item_name(otyp);
        if (j != null)
            actualn = j;
        if (otyp === WOODEN_HARP || otyp === MAGIC_HARP)
            dn = 'koto';
    }
    /* C objnam.c:216-218: generic items don't have an actual-name; C pacifies
     * the static analyzer with this literal rather than impossible().
     *   if (!actualn) actualn = (otyp > 0 && otyp < MAXOCLASSES)
     *                           ? "generic" : "object?";
     * MAXOCLASSES == 18 (objclass.h:141, the tail of enum objclass_classes). */
    if (actualn == null)
        actualn = (otyp > 0 && otyp < 18) ? 'generic' : 'object?';
    const oclass = (MKOBJ_OC_CLASS[otyp] | 0);
    let buf;
    switch (oclass) {
        case 8: buf = 'potion'; break;          /* POTION_CLASS */
        case 9: buf = 'scroll'; break;          /* SCROLL_CLASS */
        case 11: buf = 'wand'; break;           /* WAND_CLASS */
        case 10:                                 /* SPBOOK_CLASS */
            /* C objnam.c:233-240 — novels don't take "spellbook of". */
            if (otyp === SPE_NOVEL) {
                buf = nn ? 'novel' : 'book';
                nn = false;
            } else {
                buf = 'spellbook';
            }
            break;
        case 4: buf = 'ring'; break;            /* RING_CLASS */
        case 5:                                  /* AMULET_CLASS */
            /* C objnam.c:244-253 — `if (nn) Strcpy(buf, actualn); else
             * Strcpy(buf, "amulet"); if (un) xcalled(...); if (dn) " (%s)"`. */
            buf = _called(nn ? actualn : 'amulet');
            return dn ? `${buf} (${dn})` : buf;
        default:
            buf = '';
            if (oclass === 3 /* ARMOR_CLASS */) {
                const cat = oc_armcat({ otyp }) | 0;
                if (cat === 3 /* ARM_GLOVES */ || cat === 4 /* ARM_BOOTS */)
                    buf = 'pair of ';
                else if (otyp >= GRAY_DRAGON_SCALES && otyp <= YELLOW_DRAGON_SCALES)
                    buf = 'set of ';
            }
            if (nn) {
                buf += actualn;
                if (GemStone(otyp))
                    buf += ' stone';            /* objnam.c:265-266 */
                buf = _called(buf);
                if (dn != null) buf += ` (${dn})`;
            } else {
                buf += (dn != null ? dn : actualn);
                if (oclass === 13 /* GEM_CLASS */)
                    buf += (MKOBJ_OC_MATERIAL[otyp] | 0) === MINERAL
                        ? ' stone' : ' gem';    /* objnam.c:274-276 */
                buf = _called(buf, null);
            }
            return buf;
    }
    /* here for ring/scroll/potion/wand/spellbook — C objnam.c:281-292:
     *   if (nn) { if (oc_unique) Strcpy(buf, actualn);
     *             else Sprintf(eos(buf), " of %s", actualn); }
     *   if (un) xcalled(...);
     *   if (dn) Sprintf(eos(buf), " (%s)", dn);
     * The `if (nn)` was missing, so an unidentified scroll rendered as
     * "scroll of punishment (KIRJE)" instead of C's "scroll (KIRJE)". */
    if (nn) {
        /* oc_unique — the same `game._oc_unique` slot js/eat.js:2015 and
         * the_unique_obj() (js/objnam.js:1922) already read. */
        if (game._oc_unique && game._oc_unique[otyp])
            buf = actualn;                      /* avoid "spellbook of Book of the Dead" */
        else
            buf += ` of ${actualn}`;
    }
    buf = _called(buf);
    if (dn != null)
        buf += ` (${dn})`;
    return buf;
}

// ── simple_typename (objnam.c:297-308) ──────────────────────────────────────────
// C: char *simple_typename(int otyp) — less verbose result than obj_typename();
// either the actual name or the description (but not both); user-assigned name
// is ignored. Mirrors C ref: objnam.c:297-308.
export function simple_typename(otyp) {
    // C objnam.c:300-305: suppress the player's type name temporarily.
    const names = game._oc_uname ||= {};
    const saved = names[otyp];
    names[otyp] = null;
    const bufp = obj_typename(otyp);
    if (saved === undefined) delete names[otyp];
    else names[otyp] = saved;
    const idx = _strstri(bufp, " (");
    if (idx >= 0) {
        return bufp.slice(0, idx);
    }
    return bufp;
}

/* ── The per-class xname entry points ────────────────────────────────────────
 *
 * These are NOT separate ports of xname().  Each one is C's xname_flags()
 * (objnam.c:580-1027) entered at its own class arm: they share the ONE arm body
 * (_xname_arm) and the ONE variable setup (_xn_ctx) with xname_flags() itself.
 * The only thing they do differently is skip xname_flags()'s two preamble
 * mutations (observe_object()'s dknown and the Cleric bknown poke), because
 * every caller of these entry points is a distant_name()-shaped path that must
 * not mark a far-away object seen — C's own `gd.distantname` guard at
 * objnam.c:627.  See _xn_ctx()'s comment.
 *
 * Keep them: js/dogmove.js, js/pickup_container.js, js/do_wear.js and js/muse.js
 * import them by name.  Do NOT re-implement an arm here; edit _xname_arm.
 */

// ── xname for a SCROLL (objnam.c:854-870) ───────────────────────────────────
export function xname_scroll(obj) {
    return _xname_arm(obj, _xn_ctx(obj, CXN_SINGULAR, false));
}

// ── xname for an AMULET (objnam.c:672-684) ──────────────────────────────────
// C: the AMULET_CLASS branch of xname_flags().  Returns the bare (article-less)
// amulet name.
//   - !dknown                                     → "amulet"
//   - AMULET_OF_YENDOR / FAKE_AMULET_OF_YENDOR    → known ? actualn : dn
//   - nn (name known)                             → actualn
//   - un (user-call)                              → "amulet called <un>"
//   - else (appearance)                           → "<descr> amulet"
const AMULET_OF_YENDOR = 213;
const FAKE_AMULET_OF_YENDOR = 212;
export function xname_amulet(obj) {
    return _xname_arm(obj, _xn_ctx(obj, CXN_SINGULAR, false));
}

// ── xname for WAND (objnam.c:871-880) ───────────────────────────────────────
export function xname_wand(obj) {
    return _xname_arm(obj, _xn_ctx(obj, CXN_SINGULAR, false));
}
// ── xname for RING (objnam.c:904-913) ───────────────────────────────────────
export function xname_ring(obj) {
    return _xname_arm(obj, _xn_ctx(obj, CXN_SINGULAR, false));
}

// ── xname for ARMOR (objnam.c:719-744) ──────────────────────────────────────
// C: the ARMOR_CLASS branch of xname_flags().  Returns the bare (article-less)
// armor name.
//   - dragon scales (otyp GRAY_DRAGON_SCALES..YELLOW_DRAGON_SCALES, 111-120)
//     → "set of <actualn>"  (always uses real name regardless of discovery)
//   - boots / gloves       → "pair of " + (nn ? actualn : dn)
//   - shields with !dknown → "shield" (elven/orcish) or "smooth shield" (reflection)
//   - else                 → nn ? actualn : un ? "armor_simple_name called <un>" : dn
//
// OTYP CONSTANTS: the AUTHORITATIVE values (index into oc_name_data.js /
// objects.h order).  The prior values (dragon scales 89-98, shields 99-103)
// — otyp 89-91 are helms (elven leather helm / orcish helm / dwarvish iron
// helm), so a dknown orcish helm (otyp 90) was wrongly caught by the dragon-
// scale branch and named "set of null", and real dragon scales (111-120) and
// shields (150-158) were never classified.  (This made a pet dropping/lifting
// an orcish helm produce a wrong-width topline, desyncing the --More-- page
const GRAY_DRAGON_SCALES = 111;
const YELLOW_DRAGON_SCALES = 120;
const ELVEN_SHIELD_OTYP = 153;
const ORCISH_SHIELD_OTYP = 155;
const SHIELD_OF_REFLECTION_OTYP = 158;
function _is_boots_otyp(otyp) { return otyp >= 163 && otyp <= 172; }
function _is_gloves_otyp(otyp) { return otyp >= 159 && otyp <= 162; }
function _is_shield_otyp(otyp) {
    /* C is_shield(): SMALL_SHIELD(150)..SHIELD_OF_REFLECTION(158) inclusive. */
    return otyp >= 150 && otyp <= 158;
}
export function xname_armor(obj) {
    return _xname_arm(obj, _xn_ctx(obj, CXN_SINGULAR, false));
}

// ── xname for a WEAPON (objnam.c:685-718 + ONAME suffix) ────────────────────
// C: the WEAPON_CLASS branch of xname_flags() (falls through to VENOM/TOOL),
// plus xname_flags()'s common ONAME tail, which this entry point's callers rely
// on (a weapon is the usual carrier of an obj->oextra->oname).
export function xname_weapon(obj) {
    const c = _xn_ctx(obj, CXN_SINGULAR, false);
    return xname_oname_tail(obj, _xname_arm(obj, c));
}

// ── xname_flags()'s common ONAME tail (objnam.c:998-1008) ────────────────────
// C, after the per-class switch and the pluralize/gameover blocks:
//     if (has_oname(obj) && dknown) {
//         Concat(buf, 0, " named ");
//  nameit:
//         obufp = eos(buf);           /* remember where the name will start */
//         Concat(buf, 0, ONAME(obj));
//         /* downcase "The" in "<quest-artifact-item> named The ..." */
//         if (obj->oartifact && !strncmp(obufp, "The ", 4))
//             *obufp = lowc(*obufp);
//     }
// This is the ONE place C appends a personal name; a caller that adds its own
// " named <x>" on top of an xname() result double-names the object.  The name
// lives in obj->oextra->oname (const.js ONAME/has_oname), which is where
// write it — a bare obj.oname is not that field.
// (The `nameit:` entry from obj_is_pname() is a separate xname_flags path and
// is not part of this helper.)
export function xname_oname_tail(obj, buf) {
    if (has_oname(obj) && obj.dknown) {
        let nm = ONAME(obj);
        if (obj.oartifact && nm.startsWith('The '))
            nm = lowc(nm[0]) + nm.slice(1);
        buf = `${buf} named ${nm}`;
    }
    /* C:1011-1012 — xname_flags' last step: `if (!strncmpi(buf, "the ", 4))
     * buf += 4;`; a fruit named "the plum" reads "a plum" in doname. */
    if (buf.slice(0, 4).toLowerCase() === 'the ')
        buf = buf.slice(4);
    return buf;
}

// ── xname for a SPELLBOOK (objnam.c:881-903) ────────────────────────────────
// C: the SPBOOK_CLASS branch of xname_flags().  Returns the bare (article-less)
// spellbook name.
//   - !dknown            → "spellbook"
//   - nn (name known)    → "spellbook of <actualn>" (except Book of the Dead)
//   - else               → "<descr> spellbook"
export function xname_spellbook(obj) {
    return _xname_arm(obj, _xn_ctx(obj, CXN_SINGULAR, false));
}

// ── xname/doname for a POTION (objnam.c:832-853 xname, :1221-1709 doname) ─────
// C: the POTION_CLASS branch of xname_flags() + the potion-relevant subset of
// doname_base().  Scoped to potions (the getobj "?" quaff-selection menu and the
// dodrink result-line format).  Potions carry no erosion, worn mask, price, or
// spe, so doname reduces to: quantity/article prefix + BUC prefix + xname body,
// with the a/an correction (objnam.c:1684-1691) applied last.
export function xname_potion(obj) {
    /* CXN_NORMAL, not CXN_SINGULAR: unlike the other per-class entry points this
     * one's callers (doname_potion below, docall_xname_potion) want the
     * pluralized form for quan != 1, which is xname_flags()'s post-switch step. */
    const c = _xn_ctx(obj, CXN_NORMAL, false);
    const buf = _xname_arm(obj, c);
    /* C objnam.c:998-1006: append the personal name after pluralizing. */
    return xname_oname_tail(obj, c.pluralize ? makeplural(buf) : buf);
}
export function doname_potion(obj) {
    const g = game;
    let bp = xname_potion(obj);
    /* objnam.c:1488-1490 — POTION_CLASS: lit potion of oil. */
    if (obj.otyp === 321 /* POT_OIL */ && obj.lamplit)
        bp += ' (lit)';
    const known = !!obj.known;
    const bknown = !!obj.bknown;
    /* prefix: quantity (quan != 1) or the "a "/"an " article (objnam.c:1282-1299). */
    let prefix = ((obj.quan | 0) !== 1) ? (String(obj.quan | 0) + ' ') : 'a ';
    /* BUC prefix (objnam.c:1318-1349).  For potions oc_charged is false, so the
     * "uncursed" clause's guard is always satisfied when bknown and not b/c;
     * the hero (Healer) is not a Cleric, and POT_WATER handling is inert here. */
    const potWaterKnown = !!(g._oc_name_known && g._oc_name_known[POT_WATER]);
    if (bknown
        && (obj.otyp !== POT_WATER || !potWaterKnown
            || (!obj.cursed && !obj.blessed))) {
        if (obj.cursed) prefix += 'cursed ';
        else if (obj.blessed) prefix += 'blessed ';
        /* C objnam.c:1328-1348 — potions are never oc_charged, so only the
         * implicit_uncursed option (default on) and Role_if(PM_CLERIC) matter. */
        /* objnam.c:1329-1349: implicit_uncursed defaults on, so "uncursed" is
         * printed only for a non-Cleric (oc_charged is false for potions). */
        else if (!(g.flags && (g.flags.implicit_uncursed === undefined
                               ? true : !!g.flags.implicit_uncursed))
                 || !_Role_if(ROLE_IDX_PRIEST))
            prefix += 'uncursed ';
    }
    /* objnam.c:1370-1371 */
    if (obj.greased)
        prefix += 'greased ';
    /* a/an correction (objnam.c:1684-1691): recompute the article from whatever
     * now follows "a " (the BUC word if present, else the object name). */
    if (prefix.startsWith('a ')) {
        const rest = prefix.slice(2);
        prefix = just_an({}, rest.length ? rest : bp) + rest;
    }
    /* objnam.c:1696-1702 — wizweight tail follows every other suffix. */
    if (wizard() && g.iflags?.wizweight)
        return prefix + bp + ` (${obj.owt >>> 0} aum)`;
    return prefix + bp;
}

// ── string helpers mirroring C hacklib.c ─────────────────────────────────────
/* C strstri(s1, s2): case-insensitive substring search; returns the index of the
 * first occurrence of s2 in s1, or -1 (C returns a pointer or NULL). */
function _strstri(s1, s2) {
    if (s1 == null || s2 == null) return -1;
    return s1.toLowerCase().indexOf(s2.toLowerCase());
}
/* C strncmpi(s1, s2, n): true when the first n chars match case-blind. */
function _strncmpi0(s1, s2, n) {
    return s1.length >= n && s2.length >= n
        && s1.slice(0, n).toLowerCase() === s2.slice(0, n).toLowerCase();
}
/* C strsubst(buf, orig, replacement): replace the FIRST occurrence of orig in
 * buf with replacement.  Returns the modified string. */
function _strsubst(buf, orig, repl) {
    const idx = buf.indexOf(orig);
    if (idx < 0) return buf;
    return buf.slice(0, idx) + repl + buf.slice(idx + orig.length);
}

// ── wishymatch (objnam.c:3241-3336) ──────────────────────────────────────────
// C: boolean wishymatch(const char *u_str, const char *o_str, boolean retry_inverted)
// u_str is the user string (variant spelling allowed); o_str is canonical (from
// objects[]).  C compares with fuzzymatch(u, o, " -", TRUE) — EQUALITY ignoring
// spaces, hyphens, and case — NOT substring containment.  Then handles the " of "
// inversion (retry_inverted) and the dwarvish/elven/helm/gauntlets/detect/ability/
// aluminum special cases.  Faithful port of the full C function.
function wishymatch(u_str, o_str, retry_inverted) {
    if (u_str == null || o_str == null) return false;

    const detect_SP = "detect ";
    const SP_detection = " detection";

    /* ignore spaces & hyphens and upper/lower case when comparing */
    if (fuzzymatch(u_str, o_str, " -", true))
        return true;

    if (retry_inverted) {
        /* when just one of the strings is in the form "foo of bar",
           convert it into "bar foo" and perform another comparison */
        const u_of = _strstri(u_str, " of ");
        const o_of = _strstri(o_str, " of ");
        if (u_of >= 0 && o_of < 0) {
            /* buf = u_str[u_of+4..] + " " + u_str[0..u_of) */
            const buf = u_str.slice(u_of + 4) + " " + u_str.slice(0, u_of);
            if (fuzzymatch(buf, o_str, " -", true))
                return true;
        } else if (o_of >= 0 && u_of < 0) {
            const buf = o_str.slice(o_of + 4) + " " + o_str.slice(0, o_of);
            if (fuzzymatch(u_str, buf, " -", true))
                return true;
        }
    }

    /* special cases (objnam.c:3274-3333) */
    if (o_str.startsWith("dwarvish ")) {
        if (_strncmpi0(u_str, "dwarven ", 8))
            return fuzzymatch(u_str.slice(8), o_str.slice(9), " -", true);
    } else if (o_str.startsWith("elven ")) {
        if (_strncmpi0(u_str, "elvish ", 7))
            return fuzzymatch(u_str.slice(7), o_str.slice(6), " -", true);
        else if (_strncmpi0(u_str, "elfin ", 6))
            return fuzzymatch(u_str.slice(6), o_str.slice(6), " -", true);
    } else if (_strstri(o_str, "helm") >= 0 && _strstri(u_str, "helmet") >= 0) {
        const buf = _strsubst(u_str, "helmet", "helm");
        return wishymatch(buf, o_str, true);
    } else if (_strstri(o_str, "gauntlets") >= 0 && _strstri(u_str, "gloves") >= 0) {
        const buf = _strsubst(u_str, "gloves", "gauntlets");
        return wishymatch(buf, o_str, true);
    } else if (_strncmpi0(o_str, detect_SP, detect_SP.length)) {
        /* check for "detect <foo>" vs "<foo> detection" */
        const p = _strstri(u_str, SP_detection);
        if (p >= 0 && p + SP_detection.length === u_str.length) {
            /* convert "<foo> detection" into "detect <foo>" */
            const foo = u_str.slice(0, p);
            let buf = detect_SP + foo;
            /* "detect monster" -> "detect monsters" */
            if (foo.toLowerCase() === "monster")
                buf += "s";
            return fuzzymatch(buf, o_str, " -", true);
        }
    } else if (_strstri(o_str, SP_detection) >= 0) {
        /* inverse, "<foo> detection" vs "detect <foo>" */
        if (_strncmpi0(u_str, detect_SP, detect_SP.length)) {
            const p = makesingular(u_str.slice(detect_SP.length));
            const buf = p + SP_detection;
            return fuzzymatch(buf, o_str, " -", true);
        }
    } else if (_strstri(o_str, "ability") >= 0) {
        /* catch "{potion(s),ring} of {gain,restore,sustain} abilities" */
        const p = _strstri(u_str, "abilities");
        if (p >= 0 && p + "abilities".length === u_str.length) {
            const buf = u_str.slice(0, p) + "ability";
            return fuzzymatch(buf, o_str, " -", true);
        }
    } else if (o_str.toLowerCase() === "aluminum") {
        if (u_str.toLowerCase() === "aluminium")
            return fuzzymatch(u_str.slice(9), o_str.slice(8), " -", true);
    }

    return false;
}

// ── rnd_otyp_by_namedesc (objnam.c:3452-3527) ────────────────────────────────
// C: staticfn short rnd_otyp_by_namedesc(const char *name, char oclass, int xtra_prob)
// Returns a otyp selected from objects matching name, weighted by (oc_prob + xtra_prob).
// Fires rn2(maxprob) when maxprob > 0, else returns STRANGE_OBJECT.
//
// Faithful port: iterates the object table by otyp number i = lo..hi (exactly the
// C loop order, which the selection loop below depends on), reading OBJ_NAME via
// _objName(i) and OBJ_DESCR via getObjDescr(i).  This searches the FULL object
// table rather than a curated subset, so any wishable item (e.g. "helm of
// telepathy") whose name fuzzy-matches is found — matching C's matched-SET and
// maxprob accumulation.
//
// OBJ_NAME source (_objName): getObjName() is the authoritative, C-faithful
// OBJ_NAME for the classes it covers (it returns the bare real name, e.g.
// "enchant armor" for SCR_ENCHANT_ARMOR, exactly as C's objects[i].oc_name).
// For the otyps getObjName does NOT cover (tools, dragon scales/mails, a few
// armors), we fall back to the curated OBJ_NAME_TABLE entry — which is how the
// resolved.  getObjName WINS on any otyp it covers (the OBJ_NAME_TABLE has stale
// otyp assignments for 97/98 and adds non-faithful "scroll of " prefixes).
export function shiny_obj(oclass) {
    return rnd_otyp_by_namedesc_js('shiny', oclass, 0) | 0;
}

/* C ref: objnam.c:3431-3453 rnd_otyp_by_wpnskill(schar skill)
 *
 *     for (i = svb.bases[WEAPON_CLASS];
 *          i < NUM_OBJECTS && objects[i].oc_class == WEAPON_CLASS; i++)
 *         if (objects[i].oc_skill == skill) { n++; otyp = i; }
 *     if (n > 0) {
 *         n = rn2(n);
 *         for (i = svb.bases[WEAPON_CLASS];
 *              i < NUM_OBJECTS && objects[i].oc_class == WEAPON_CLASS; i++)
 *             if (objects[i].oc_skill == skill)
 *                 if (--n < 0) return i;
 *     }
 *     return otyp;
 *
 * Note the C loop bound: it walks FORWARD from the weapon base and stops at the
 * first otyp whose oc_class is no longer WEAPON_CLASS, so it is the contiguous
 * weapon run and NOT svb.bases[WEAPON_CLASS+1].  Reproduced literally.
 *
 * RNG: exactly one rn2(n), and only when at least one weapon carries the skill.
 * n is the MATCH COUNT, so the modulus is skill-dependent (P_POLEARMS and
 * P_HAMMER have different counts) — do not fold it to a constant.
 *
 * Its only caller is readobjnam's "polearm"/"hammer" arm (objnam.c:4983-4988). */
function rnd_otyp_by_wpnskill(skill) {
    const WEAPON_CLASS_ = 2;
    const base = MKOBJ_SVB_BASES[WEAPON_CLASS_] | 0;
    const NUM_OBJECTS = MKOBJ_OC_CLASS.length;
    let n = 0;
    let otyp = STRANGE_OBJECT;
    let i;
    for (i = base; i < NUM_OBJECTS && (MKOBJ_OC_CLASS[i] | 0) === WEAPON_CLASS_; i++)
        if ((MKOBJ_OC_SKILL[i] | 0) === (skill | 0)) {
            n++;
            otyp = i;
        }
    if (n > 0) {
        n = rn2(n);
        for (i = base; i < NUM_OBJECTS && (MKOBJ_OC_CLASS[i] | 0) === WEAPON_CLASS_; i++)
            if ((MKOBJ_OC_SKILL[i] | 0) === (skill | 0))
                if (--n < 0)
                    return i;
    }
    return otyp;
}
export function rnd_otyp_by_namedesc_js(name, oclass, xtra_prob) {
    if (!name || !name.length) return STRANGE_OBJECT;

    /* check_of: true when name doesn't contain " of " (objnam.c:3469) */
    const check_of = (_strstri(name, " of ") < 0);
    /* glob range + BELL_OF_OPENING: excluded from the partial-name (" of ")
     * branch (objnam.c:3470-3471,3500-3502).  In this build globs and the
     * "Bell of Opening" tool have no entry in getObjName (they return null), so
     * the `zn == null` continue already excludes them; we keep the numeric
     * guards faithful to C for the cases where a name is present. */
    const BELL_OF_OPENING = _otypByName("bell of opening");
    const minglob = _otypByName("glob of gray ooze");
    const maxglob = _otypByName("glob of black pudding");

    const validobjs = [];
    let maxprob = 0;
    /* C: oclass ? svb.bases[oclass]..svb.bases[oclass+1]-1
         : MAXOCLASSES..NUM_OBJECTS-1 (objnam.c:3474-3480) */
    const lo = oclass ? (MKOBJ_SVB_BASES[oclass] | 0) : MAXOCLASSES;
    const hi = oclass
        ? ((MKOBJ_SVB_BASES[oclass + 1] | 0) - 1)
        : (MKOBJ_OC_CLASS.length - 1);

    for (let i = lo; i <= hi; ++i) {
        /* don't match extra descriptions (w/o real name): OBJ_NAME==0 → skip */
        let zn = _objName(i);
        if (zn == null)
            continue;

        let matched = false;
        if (wishymatch(name, zn, true)) {                 /* objects[] name */
            matched = true;
        } else if (check_of
                   && (BELL_OF_OPENING == null || i !== BELL_OF_OPENING)
                   && (minglob == null || maxglob == null || i < minglob || i > maxglob)) {
            /* let "<bar>" match "<foo> of <bar>" — partial name */
            const ofIdx = _strstri(zn, " of ");
            if (ofIdx >= 0 && wishymatch(name, zn.slice(ofIdx + 4), false))
                matched = true;
        }
        if (!matched) {
            const descr = getObjDescr(i);                 /* OBJ_DESCR (shuffled) */
            if (descr != null) {
                if (wishymatch(name, descr, false)) {     /* objects[] description */
                    matched = true;
                } else if (check_of) {                    /* partial description */
                    const ofIdx = _strstri(descr, " of ");
                    if (ofIdx >= 0 && wishymatch(name, descr.slice(ofIdx + 4), false))
                        matched = true;
                }
            }
        }
        /* oc_uname (user-called name) — objnam.c:3510-3511 */
        if (!matched) {
            const un = (game._oc_uname && game._oc_uname[i] != null)
                ? game._oc_uname[i] : null;
            if (un && wishymatch(name, un, false))
                matched = true;
        }

        if (matched) {
            validobjs.push(i);
            maxprob += (MKOBJ_OC_PROB[i] | 0) + xtra_prob;
        }
    }

    if (validobjs.length > 0 && maxprob > 0) {
        let prob = rn2(maxprob); /* C: prob = rn2(maxprob) @ objnam.c:3520 */
        for (let i = 0; i < validobjs.length - 1; i++) {
            prob -= (MKOBJ_OC_PROB[validobjs[i]] | 0) + xtra_prob;
            if (prob < 0) return validobjs[i];
        }
        return validobjs[validobjs.length - 1];
    }
    return STRANGE_OBJECT;
}

/* OBJ_NAME(objects[i]) — the role-invariant real name of an object type, with
 * FULL coverage.  getObjName() is authoritative for the classes it covers (it
 * returns the bare oc_name exactly as C, including the stale-free helm names and
 * the prefix-free scroll/potion names).  For otyps it does not cover (tools,
 * dragon scales/mails, low/iron/high boots, scroll blank paper) we fall back to
 * the curated OBJ_NAME_TABLE entry.  Returns null when neither source has a name
 * (globs, Bell of Opening, extra-description-only slots) — the C `OBJ_NAME==0`
 * skip. */
let _OBJNAME_TBL = null;
function _buildObjNameTbl() {
    const m = {};
    for (const e of OBJ_NAME_TABLE)
        if (e && e.name != null && !(e.otyp in m)) m[e.otyp] = e.name;
    return m;
}
/* OC_NAME (C objects[].oc_name, dumped from objects.h) and the JS object table
 * share otyp numbering EXACTLY for otyp < OC_NAME_JS_ALIGNED_MAX; above that
 * boundary the JS port reorders the spellbook/sphere/blank-paper slots and uses
 * a different numbering, so OC_NAME (C numbering) must NOT be consulted there —
 * getObjName()/FIXED names (JS numbering) are authoritative.  The aligned range
 * covers every fixed-name class getObjName does not (tools, food, gems, coins,
 * rocks, mundane weapons/armor), which is exactly what rnd_otyp_by_namedesc
 * needs to match by name. */
const OC_NAME_JS_ALIGNED_MAX = 366; /* JS otyp == C otyp for i < 366 */
function _objName(i) {
    /* options.c:7341 — initoptions_finish: obj_descr[SLIME_MOLD].oc_name =
     * "fruit", so OBJ_NAME(objects[SLIME_MOLD]) is "fruit" in a running game
     * (the real slime mold is only wishable via a named/default fruit). */
    if (i === SLIME_MOLD) return "fruit";
    /* OBJ_NAME(objects[i]) — the role-invariant real name, full otyp coverage.
     * getObjName() is authoritative (JS numbering) for the classes it covers
     * (shuffled ranges + spellbooks/wands/gems at otyp >= 366) and for the JS
     * special slots (flame/freeze sphere, blank paper).  For the fixed-name
     * otyps it does NOT cover (tools, food, coins, ...), all of which sit below
     * OC_NAME_JS_ALIGNED_MAX where JS and C numbering coincide, fall back to the
     * C ground-truth OC_NAME. */
    const g = getObjName(i);
    if (g != null) return g;
    if (i >= 0) {
        const n = OC_NAME[i];
        if (n != null) return n;
    }
    if (_OBJNAME_TBL === null) _OBJNAME_TBL = _buildObjNameTbl();
    return (i in _OBJNAME_TBL) ? _OBJNAME_TBL[i] : null;
}

/* Public wrapper over _objName — C's OBJ_NAME(objects[otyp]) with FULL otyp
 * coverage, for callers outside this module that need the role-invariant real
 * name (js/eat.js food_xname).  getObjName() alone is the partial table and
 * returns null for the whole fixed-name range (food, tools, coins, ...). */
export function objName(otyp) {
    return _objName(otyp | 0);
}

/* Reverse lookup otyp by canonical OBJ_NAME (case-insensitive); null if absent.
 * Used only to resolve the glob/bell sentinels for the partial-name exclusion. */
let _OTYP_BY_NAME = null;
function _otypByName(lcname) {
    if (_OTYP_BY_NAME === null) {
        _OTYP_BY_NAME = {};
        for (let i = 0; i < MKOBJ_OC_CLASS.length; i++) {
            const n = _objName(i);
            if (n != null) {
                const k = n.toLowerCase();
                if (!(k in _OTYP_BY_NAME)) _OTYP_BY_NAME[k] = i;
            }
        }
    }
    return (lcname in _OTYP_BY_NAME) ? _OTYP_BY_NAME[lcname] : null;
}

// ── readobjnam_preparse — parse BUC/count/damage prefixes ────────────────────
// C ref: objnam.c:3963-4173
// Returns parsed state; modifies bp (pointer advanced past prefixes).
// We return an object with fields from _readobjnam_data.
function readobjnam_preparse(bp) {
    let cnt = 0, spe = 0, spesgn = 0;
    let blessed = 0, uncursed = 0, iscursed = 0;
    let unlabeled = 0, erodeproof = 0, ispoisoned = 0;
    let halfeaten = 0;
    let islit = 0, wetness = 0;
    let trapped = 0;               /* 0 unspecified, 1 trapped, 2 untrapped */
    let locked = 0, unlocked = 0, broken = 0;
    let open_ = 0, closed = 0, doorless = 0;
    let looted = 0, isgreased = 0, zombify = 0;
    let very = 0, eroded = 0, eroded2 = 0;
    let ishistoric = 0, isdiluted = 0;
    let contents = TIN_UNDEFINED;
    let gsize = 0, real = 0, fake = 0;
    let mgend = -1;                /* C's d->mgend, left unset until asked for */

    /* C keeps `bp` as a POINTER INTO a mutable buffer, and two arms of the loop
     * depend on that: the corpse/statue/figurine hack saves the pointer and
     * RESTORES it after the loop (so a "female "/"male " word in the MIDDLE of
     * "statue of a female gnome" is recognised and deleted while the final bp
     * still starts at "statue of ..."), and strsubst() edits the buffer in
     * place.  A plain JS string slice cannot express that, so model it the way
     * C does: one buffer plus an offset. */
    let buf = bp;
    let off = 0;
    let save_off = -1;
    let res = 1;
    /* C's `female `/`male `/`neuter ` arms call strsubst(), which is
     * strstr()-based and therefore CASE-SENSITIVE, while the arm that selected
     * it is strncmpi() and is NOT.  On "corpse of a Female gnome" C matches the
     * arm, finds nothing to substitute, sets l = 0 and LOOPS FOREVER.  That is a
     * genuine C hang, and Cardinal Rule 1 says port the bug — but a hang is not
     * a divergence, it is a dead replay that reports nothing at all, so the one
     * deviation taken here is a progress guard: if an iteration consumes no
     * characters AND removes none, stop.  On every input C terminates on, this
     * guard cannot fire, so it cannot change a result C produces. */
    for (;;) {
        const p = buf.slice(off);
        if (!p || !p.length) break;
        res = 0;
        const lc = p.toLowerCase();
        let l = 0;

        if (lc.startsWith('an ')) { cnt = 1; l = 3; }
        else if (lc.startsWith('a ')) { cnt = 1; l = 2; }
        else if (lc.startsWith('the ')) { l = 4; }
        else if (!cnt && _c_digit(p[0]) && p !== '0') {
            cnt = _c_atoi(p);
            let k = 0;
            while (k < p.length && _c_digit(p[k])) k++;
            while (k < p.length && p[k] === ' ') k++;
            off += k;
            l = 0;
        }
        else if (p[0] === '+' || p[0] === '-') {
            spesgn = (p[0] === '+') ? 1 : -1;
            const rest = p.slice(1);
            spe = _c_atoi(rest);
            let k = 1;
            while (k < p.length && _c_digit(p[k])) k++;
            while (k < p.length && p[k] === ' ') k++;
            off += k;
            l = 0;
        }
        else if (lc.startsWith('blessed ')) { blessed = 1; uncursed = iscursed = 0; l = 8; }
        else if (lc.startsWith('holy ')) { blessed = 1; uncursed = iscursed = 0; l = 5; }
        else if (lc.startsWith('cursed ')) { iscursed = 1; blessed = uncursed = 0; l = 7; }
        else if (lc.startsWith('unholy ')) { iscursed = 1; blessed = uncursed = 0; l = 7; }
        else if (lc.startsWith('uncursed ')) { uncursed = 1; blessed = iscursed = 0; l = 9; }
        else if (lc.startsWith('rustproof ')) { erodeproof = 1; l = 10; }
        else if (lc.startsWith('erodeproof ')) { erodeproof = 1; l = 11; }
        else if (lc.startsWith('corrodeproof ')) { erodeproof = 1; l = 13; }
        else if (lc.startsWith('fixed ')) { erodeproof = 1; l = 6; }
        else if (lc.startsWith('fireproof ')) { erodeproof = 1; l = 10; }
        else if (lc.startsWith('rotproof ')) { erodeproof = 1; l = 9; }
        else if (lc.startsWith('tempered ')) { erodeproof = 1; l = 9; }
        else if (lc.startsWith('crackproof ')) { erodeproof = 1; l = 11; }
        /* C objnam.c:4076-4082 */
        else if (lc.startsWith('lit ')) { islit = 1; l = 4; }
        else if (lc.startsWith('burning ')) { islit = 1; l = 8; }
        else if (lc.startsWith('unlit ')) { islit = 0; l = 6; }
        else if (lc.startsWith('extinguished ')) { islit = 0; l = 13; }
        /* "wet" and "moist" are only applicable for towels — and they DRAW
         * (objnam.c:4086-4090).  Getting these wrong costs an RNG leaf, not
         * only a flag, so they are ported with their draws in C's order:
         * "wet " is 3 + rn2(3), "moist " is rnd(2). */
        else if (lc.startsWith('moist ') || lc.startsWith('wet ')) {
            if (lc.startsWith('wet ')) { wetness = 3 + rn2(3); l = 4; }
            else { wetness = rnd(2); l = 6; }
        }
        else if (lc.startsWith('unlabeled ')) { unlabeled = 1; l = 10; }
        else if (lc.startsWith('unlabelled ')) { unlabeled = 1; l = 11; }
        else if (lc.startsWith('blank ')) { unlabeled = 1; l = 6; }
        else if (lc.startsWith('poisoned ')) { ispoisoned = 1; l = 9; }
        /* "trapped" recognized but not honored outside wizard mode */
        else if (lc.startsWith('trapped ')) {
            trapped = 0; /* undo any previous "untrapped" */
            if (wizard()) trapped = 1;
            l = 8;
        }
        else if (lc.startsWith('untrapped ')) { trapped = 2; l = 10; }
        /* locked, unlocked, broken: box/chest lock states, also door states */
        else if (lc.startsWith('locked ')) {
            locked = closed = 1; unlocked = broken = open_ = doorless = 0; l = 7;
        }
        else if (lc.startsWith('unlocked ')) {
            unlocked = closed = 1; locked = broken = open_ = doorless = 0; l = 9;
        }
        else if (lc.startsWith('broken ')) {
            broken = 1; locked = unlocked = open_ = closed = doorless = 0; l = 7;
        }
        else if (lc.startsWith('open ')) {
            open_ = 1; closed = locked = broken = doorless = 0; l = 5;
        }
        else if (lc.startsWith('closed ')) {
            closed = 1; open_ = locked = broken = doorless = 0; l = 7;
        }
        else if (lc.startsWith('doorless ')) {
            doorless = 1; open_ = closed = locked = unlocked = broken = 0; l = 9;
        }
        else if (lc.startsWith('looted ')) { looted = 1; l = 7; }
        else if (lc.startsWith('disturbed ')) { looted = 1; l = 10; }
        else if (lc.startsWith('greased ')) { isgreased = 1; l = 8; }
        else if (lc.startsWith('zombifying ')) { zombify = 1; l = 11; }
        else if (lc.startsWith('very ')) { very = 1; l = 5; }
        else if (lc.startsWith('thoroughly ')) { very = 2; l = 11; }
        else if (lc.startsWith('rusty ')) { eroded = 1 + very; very = 0; l = 6; }
        else if (lc.startsWith('rusted ')) { eroded = 1 + very; very = 0; l = 7; }
        else if (lc.startsWith('burnt ')) { eroded = 1 + very; very = 0; l = 6; }
        else if (lc.startsWith('burned ')) { eroded = 1 + very; very = 0; l = 7; }
        else if (lc.startsWith('cracked ')) { eroded = 1 + very; very = 0; l = 8; }
        else if (lc.startsWith('corroded ')) { eroded2 = 1 + very; very = 0; l = 9; }
        else if (lc.startsWith('rotted ')) { eroded2 = 1 + very; very = 0; l = 7; }
        else if (lc.startsWith('partly eaten ')) { halfeaten = 1; l = 13; }
        else if (lc.startsWith('partially eaten ')) { halfeaten = 1; l = 16; }
        else if (lc.startsWith('historic ')) { ishistoric = 1; l = 9; }
        else if (lc.startsWith('diluted ')) { isdiluted = 1; l = 8; }
        else if (lc.startsWith('empty ')) { contents = TIN_EMPTY; l = 6; }
        /* glob sizes.  "small"/"large" might be part of a MONSTER name (small
         * mimic, large dog) or an object name (large box), so C only takes them
         * as a glob prefix when "glob" follows — otherwise it BREAKS out of the
         * prefix loop entirely, leaving the word in bp. */
        else if (lc.startsWith('small ')) {
            l = 6;
            const rest = p.slice(l), restlc = rest.toLowerCase();
            if (!restlc.startsWith('glob') && restlc.indexOf(' glob') < 0) break;
            gsize = 1;
        }
        else if (lc.startsWith('medium ')) { gsize = 2; l = 7; }
        else if (lc.startsWith('large ')) {
            l = 6;
            const rest = p.slice(l), restlc = rest.toLowerCase();
            if (!restlc.startsWith('glob') && restlc.indexOf(' glob') < 0) break;
            /* "very large " had "very " peeled off on the previous iteration */
            gsize = (very !== 1) ? 3 : 4;
        }
        else if (lc.startsWith('real ')) { real = 1; l = 5; }
        else if (lc.startsWith('fake ')) { fake = 1; real = 0; l = 5; }
        else if (lc.startsWith('female ')) {
            mgend = FEMALE;
            if (save_off >= 0) { buf = _strsubst_from(buf, off, 'female ', ''); l = 0; }
            else l = 7;
        }
        else if (lc.startsWith('male ')) {
            mgend = MALE;
            if (save_off >= 0) { buf = _strsubst_from(buf, off, 'male ', ''); l = 0; }
            else l = 5;
        }
        else if (lc.startsWith('neuter ')) {
            mgend = NEUTRAL;
            if (save_off >= 0) { buf = _strsubst_from(buf, off, 'neuter ', ''); l = 0; }
            else l = 7;
        }
        /*
         * Corpse/statue/figurine gender hack: in order to accept "statue of a
         * female gnome ruler" for gnome queen we need to recognize and skip
         * over "statue of [a ]".  C SAVES the pointer here and restores it after
         * the loop, so the skip is temporary: it only exists so the male/female/
         * neuter arms above can delete their word out of the MIDDLE of the
         * string.  (objnam.c:4152-4166)
         */
        else if ((lc.startsWith('corpse ') || lc.startsWith('statue ')
                  || lc.startsWith('figurine '))
                 && p.slice(lc.startsWith('figurine ') ? 9 : 7)
                     .toLowerCase().startsWith('of ')) {
            save_off = off; /* we'll backtrack to here later */
            l = (lc.startsWith('figurine ') ? 9 : 7) + 3;
            const rest = p.slice(l).toLowerCase();
            if (rest.startsWith('a ')) l += 2;
            else if (rest.startsWith('an ')) l += 3;
            else if (rest.startsWith('the ')) l += 4;
        }
        else break;

        off += l;
        /* the progress guard described above — never reached on an input C
         * terminates on, because C only leaves l == 0 after a substitution that
         * shortened the buffer. */
        if (l === 0 && buf.slice(off) === p) break;
    }
    if (save_off >= 0) off = save_off;

    return { bp: buf.slice(off), buffer: buf, offset: off, preparseRes: res,
             cnt, spe, spesgn, blessed, uncursed, iscursed, unlabeled,
             erodeproof, ispoisoned, halfeaten,
             islit, wetness, trapped, locked, unlocked, broken,
             open: open_, closed, doorless, looted, isgreased, zombify,
             very, eroded, eroded2, ishistoric, isdiluted, contents,
             gsize, real, fake, mgend };
}

/* C hacklib.c strsubst(bp, orig, replacement) applied from an OFFSET — replace the FIRST occurrence of
 * `orig` at or after `from`, CASE-SENSITIVELY (it is strstr-based), and return
 * the edited buffer.  Only the delete-a-prefix use is needed here. */
function _strsubst_from(buf, from, orig, repl) {
    const i = buf.indexOf(orig, from);
    if (i < 0) return buf;
    return buf.slice(0, i) + repl + buf.slice(i + orig.length);
}

// ── readobjnam_parse_charges ─────────────────────────────────────────────────
// C ref: objnam.c:4177-4252 (readobjnam_parse_charges)
//
// Strips a trailing "(...)" charge/enchantment parenthetical off the wish
// string and turns it into d->spe / d->rechrg / d->islit.  C runs this between
// readobjnam_preparse() and readobjnam_postparse1() (objnam.c:4932), i.e. on
// EVERY wish, so the object-name lookup that follows never sees the "(0:30)".
//
// Until this landed the JS never removed the parenthetical at all: a wish for
// `wand of polymorph (0:30)` kept its suffix through the whole name-lookup
// chain, matched nothing, and fell out of the bottom of readobjnam into the
// "o - a scroll labeled YUM YUM." where C prints "o - a silver wand."
//
// C's atoi()/digit() semantics are reproduced literally, including the quirk
// that a NEGATIVE charge spec ("(-3)") leaves d->p parked on the '-' (which
// digit() rejects), so *p != ')' and the whole spec is discarded with
// keeptrailingchars = FALSE.  Port the bug (Cardinal Rule 1).
//
// Takes/returns the mutable pieces rather than a struct: JS's readobjnam keeps
// bp/spe/spesgn as locals.
function _c_atoi(s) {
    /* C atoi(): optional leading whitespace, optional sign, then digits. */
    const m = /^[ \t\n\v\f\r]*([+-]?[0-9]+)/.exec(s);
    if (!m) return 0;
    const n = BigInt(m[1]);
    /* C atoi(): strtol saturates at LONG_MIN/MAX before conversion to int. */
    return Number(BigInt.asIntN(32, n > 9223372036854775807n ? 9223372036854775807n
        : n < -9223372036854775808n ? -9223372036854775808n : n));
}
function _c_digit(ch) { return ch >= '0' && ch <= '9'; }

function readobjnam_parse_charges(bp, spe, spesgn, islit = 0) {
    let rechrg = 0;
    let pi;

    if (bp.length > 1 && (pi = bp.lastIndexOf('(')) >= 0) {
        let keeptrailingchars = true;
        /* C: `if (d->p > d->bp && d->p[-1] == ' ') idx = -1;` then
           `d->p[idx] = '\0'` — the space before '(' is eaten with it. */
        const cut = (pi > 0 && bp[pi - 1] === ' ') ? pi - 1 : pi;
        const head = bp.slice(0, cut);
        const p = bp.slice(pi + 1);   /* C: ++d->p — advance past '(' */
        let q = 0;                    /* index of C's d->p within `p` */

        if (p.slice(0, 4).toLowerCase() === 'lit)') {
            islit = 1;
            q = 4 - 1;                /* point at ')' */
        } else {
            spe = _c_atoi(p.slice(q));
            while (_c_digit(p[q])) q++;
            if (p[q] === ':') {
                q++;
                rechrg = spe;
                spe = _c_atoi(p.slice(q));
                while (_c_digit(p[q])) q++;
            }
            if (p[q] !== ')') {
                spe = rechrg = 0;
                /* mis-matched parentheses; rest of string will be ignored */
                keeptrailingchars = false;
            } else {
                spesgn = 1;
            }
        }
        /* C splices whatever follows the ')' onto the truncated head. */
        bp = keeptrailingchars ? head + p.slice(q + 1) : head;
    }

    /*
     * otmp->spe is type schar, so we don't want spe to be any bigger or
     * smaller.  Also, spe should always be positive --some cheaters may
     * try to confuse atoi().
     */
    if (spe < 0) {
        spesgn = -1;                  /* cheaters get what they deserve */
        spe = Math.abs(spe) | 0;      /* C int: abs(INT_MIN) retains INT_MIN. */
    }
    /* cap on obj->spe is independent of (and less than) SCHAR_LIM */
    if (spe > SPE_LIM)
        spe = SPE_LIM;                /* slime mold uses d.ftype, so not affected */
    if (rechrg < 0 || rechrg > 7)
        rechrg = 7;                   /* recharge_limit */

    return { bp, spe, spesgn, rechrg, islit };
}

// ── makesingular (simplified) ─────────────────────────────────────────────────
// C ref: objnam.c makesingular — strips plural suffixes.
// Handles the common cases needed for wish parsing.
//
// as_is[] (objnam.c:2687-2697): words makesingular() deliberately leaves PLURAL
// (because the object names ARE plural — "speed boots", "leather gloves",
// "gray dragon scales", "gauntlets of power", &c).  C checks the trailing word
// against this set before stripping; without it, "speed boots" -> "speed boot"
// fails the fuzzymatch-EQUALITY name lookup in rnd_otyp_by_namedesc.
const _AS_IS = new Set([
    "boots", "shoes", "gloves", "lenses", "scales", "eyes", "gauntlets",
    "iron bars",
    /* both singular and plural spelled the same */
    "bison", "deer", "elk", "fish", "fowl", "tuna", "yaki", "-hai", "krill",
    "manes", "moose", "ninja", "sheep", "ronin", "roshi", "shito", "tengu",
    "ki-rin", "nazgul", "gunyoki", "piranha", "samurai", "shuriken", "haggis",
    "bordeaux",
]);
/* singplur_compound (objnam.c:2781-2812): find "foo of bar" so we can focus
 * singularization on "foo".  Returns the index of the start of the matched
 * compound separator, or -1.  Mirrors C's compounds[] list and the
 * compound_start[] (" -") fast-skip. */
const _COMPOUNDS = [
    " of ", " labeled ", " called ", " named ", " above",
    " versus ", " from ", " in ", " on ", " a la ", " with",
    " de ", " d'", " du ", " au ", "-in-", "-at-",
];
function _singplur_compound(str) {
    const sl = str.toLowerCase();
    for (let i = 0; i < str.length; i++) {
        const c = str[i];
        /* substring can only match if char is in compound_start[] = " -" */
        if (c !== ' ' && c !== '-') continue;
        for (const cmpd of _COMPOUNDS) {
            if (sl.startsWith(cmpd, i)) return i;
        }
    }
    return -1;
}

function _singularize_word(word) {
    const wl = word.toLowerCase();
    /* C objnam.c:3076 checks the shared singular/plural exception tables
     * before applying any suffix rule.  `special_subjs` contains singular
     * words which merely look plural (aklys, erinys, paralysis, ...); the
     * same table also drives vtense(), so naming and verb agreement cannot
     * drift into two independent exception lists. */
    const lookup = singplur_lookup(word, word.length, false, special_subjs);
    if (lookup !== null) return lookup;
    /* dispense with words that don't need singularization (as_is[]) */
    if (_AS_IS.has(wl)) return word;
    const sp = wl.lastIndexOf(' ');
    const lastword = sp >= 0 ? wl.slice(sp + 1) : wl;
    if (_AS_IS.has(lastword)) return word;
    /* C objnam.c:3078-3160: suffix stripping on the (compound-trimmed) word. */
    const ends = (n, t) => wl.length >= n && wl.endsWith(t);
    const L = wl.length;
    const lc = (k) => (L - k >= 0 ? wl[L - k] : '');
    const cut = (n, rep) => strcasecpy_at(word, L - n, rep);
    /* a "start of string or space" guard: p - k == bp || p[-(k+1)] == ' ' */
    const atWordStart = (k) => L - k === 0 || wl[L - k - 1] === ' ';
    if (L >= 1 && lc(1) === 's') {
        if (L >= 2 && lc(2) === 'e') {
            if (L >= 3 && lc(3) === 'i') { /* "ies" */
                if (ends(7, 'cookies')
                    || (ends(4, 'pies') && atWordStart(4))
                    || (ends(6, 'genies') && atWordStart(6))
                    || ends(5, 'mbies') || ends(5, 'yries'))
                    return cut(1, '');
                return cut(3, 'y');
            }
            /* wolves, but f to ves isn't fully reversible */
            if (L - 4 >= 0 && ('lr'.includes(lc(4)) || 'aeiou'.includes(lc(4)))
                && ends(3, 'ves')) {
                if (ends(6, 'cloves') || ends(6, 'nerves'))
                    return cut(1, '');
                return cut(3, 'f');
            }
            if (ends(4, 'eses') || ends(4, 'oxes') || ends(4, 'nxes')
                || ends(4, 'ches') || ends(4, 'uses') || ends(4, 'shes')
                || ends(4, 'sses') || ends(5, 'atoes') || ends(7, 'dingoes')
                || ends(7, 'aleaxes'))
                return cut(2, '');
            return cut(1, '');
        } else if (ends(2, 'us')) { /* lotus, fungus... */
            if (!ends(6, 'tengus') && !ends(7, 'hezrous'))
                return word;
            return cut(1, '');
        } else if (ends(2, 'ss') || ends(5, ' lens') || wl === 'lens') {
            return word;
        }
        return cut(1, '');
    }
    /* input doesn't end in 's' */
    if (ends(3, 'men') && !badman(word, false))
        return cut(2, 'an');
    if (ends(6, 'matzot') || ends(2, 'ae') || ends(4, 'eaux'))
        return cut(1, '');
    if (L - 4 >= 0 && ends(2, 'ia') && 'lr'.includes(lc(3)) && lc(4) === 'e')
        return cut(1, 'um');
    return word;
}

export function makesingular(str) {
    // C objnam.c:3043-3050 checks for empty input after skipping spaces.
    if (str) str = str.replace(/^ +/, '');
    if (!str || !str.length) {
        impossible_sync('singular of null?');
        return '';
    }
    /* C objnam.c:3044-3066: skip leading spaces, then force plural
     * pronouns to neuter singular, preserving only the initial's case. */
    let pronoun = '';
    if (strcmpi(genders[3].he, str) === 0)
        pronoun = genders[2].he;
    else if (strcmpi(genders[3].him, str) === 0)
        pronoun = genders[2].him;
    else if (strcmpi(genders[3].his, str) === 0)
        pronoun = genders[2].his;
    if (pronoun)
        return str[0] === highc(str[0])
            ? highc(pronoun[0]) + pronoun.slice(1) : pronoun;
    /* C: check for "foo of bar" so we can focus on "foo" (objnam.c:3066-3071).
     * Split at the compound separator, singularize only the prefix, then
     * reattach the excess (" of bar", " labeled foo", &c). */
    const ci = _singplur_compound(str);
    if (ci >= 0) {
        const prefix = str.slice(0, ci);
        const excess = str.slice(ci);
        return _singularize_word(prefix) + excess;
    }
    return _singularize_word(str);
}

// C: objnam.c:2169-2230 — the(str): prepend "the " when appropriate.
// NOTE the() does NOT capitalise — that is The() (objnam.c:2231-2239).  This
// fallback resolved the C symbol `the` onto the JS export `The` and every
// record came back capitalised ("The scroll" for C's "the scroll").
export function the(str) {
    const bounded = (s) => s.slice(0, 255); /* C BUFSZ-1 strncat bound */
    if (!str || str.length === 0) {
        /* C: impossible("Alphabet soup: 'the(%s)'.", str ? "\"\"" : "<null>");
         * then falls through to the "the []" return. */
        impossible_sync("Alphabet soup: 'the(%s)'.", str == null ? "<null>" : '""');
        return "the []";
    }
    // C: if (!strncmpi(str, "the ", 4)) → already has "the " prefix
    if (strncmpi(str, "the ", 4) === 0) {
        return bounded(lowc(str[0]) + str.substring(1));
    }
    let insertThe = false;
    const capitalMon = (word) => {
        if (!word || word[0] === word[0].toLowerCase()) return false;
        /* C rumors.c init_CapMons(): capitalized non-personal monster type
         * names, including titles such as "Wizard of Yendor", plus the
         * equivalent entries from bogusmon. */
        for (let i = 0; ; ++i) {
            const pm = permonstTemplate(i);
            if (!pm) break;
            if (((pm.geno | 0) & 0x1000) && !the_unique_pm(pm)) continue;
            for (const name of (pm.pmnames || [])) {
                if (name && name[0] !== name[0].toLowerCase()
                    && word.startsWith(name)
                    && (!word[name.length] || word[name.length] === ' '
                        || word[name.length] === '\''))
                    return true;
            }
        }
        for (const coded of BOGUSMON_LINES) {
            const code = '-_+|='.includes(coded[0]) ? coded[0] : '';
            const name = code ? coded.slice(1) : coded;
            if ((code && '-+='.includes(code)) || !name
                || name[0] === name[0].toLowerCase())
                continue;
            if (word.startsWith(name)
                && (!word[name.length] || word[name.length] === ' '
                    || word[name.length] === '\''))
                return true;
        }
        return false;
    };

    const artifact = artifact_name(str, false);
    if (str[0] < 'A' || str[0] > 'Z'
        || capitalMon(str)
        || (fruit_from_name(str, true, null)
            && (!artifact || _startsWithThe(artifact.name)))) {
        insertThe = true;
    } else {
        /* C deliberately prefers the last space; it only considers a hyphen
         * when the string contains no spaces. */
        let split = str.lastIndexOf(' ');
        if (split < 0) split = str.lastIndexOf('-');
        if (split >= 0 && (str[split + 1] === undefined
            || str[split + 1] < 'A' || str[split + 1] > 'Z')) {
            insertThe = !str.includes("'");
        } else if (split >= 0 && str.indexOf(' ') < split) {
            const ofPos = _strstri(str, ' of ');
            const namedPos = _strstri(str, ' named ');
            const calledPos = _strstri(str, ' called ');
            let namePos = namedPos;
            if (calledPos >= 0 && (namePos < 0 || calledPos < namePos))
                namePos = calledPos;
            if (ofPos >= 0 && (namePos < 0 || ofPos < namePos))
                insertThe = true;
            else if (namePos < 0
                     && str.endsWith('Platinum Yendorian Express Card'))
                insertThe = true;
        }
    }
    return bounded((insertThe ? 'the ' : '') + str);
}

// C: objnam.c:2231-2239 — The(str): "the" with first char uppercased
export function The(str) {
    let tmp = the(str);
    // C: *tmp = highc(*tmp);
    tmp = highc(tmp[0]) + tmp.substring(1);
    return tmp;
}

// ── readobjnam parsing stages (C objnam.c:3933-5002) ──────────────────────
// Preserve the C stage order and goto destinations; object creation shares
// _finalize_wish below. NULL/empty input selects a random object, while an
// unrecognized name without an object class returns null.
/* C zap.c:6373 &hands_obj — successful wizard terrain wishes return a
 * non-object sentinel, distinct from NULL and makewish's `nothing`. */
export const hands_obj = Object.freeze({ _hands_obj: true });

// C objnam.c:3377-3430 spellings[], with object indices resolved by name.
const WISH_SPELLINGS = [
    ['pickax', 'pick-axe'], ['whip', 'bullwhip'],
    ['saber', 'silver saber'], ['silver sabre', 'silver saber'],
    ['smooth shield', 'shield of reflection'],
    ['grey dragon scale mail', 'gray dragon scale mail'],
    ['grey dragon scales', 'gray dragon scales'],
    ['iron ball', 'heavy iron ball'], ['lantern', 'brass lantern'],
    ['mattock', 'dwarvish mattock'],
    ['amulet of poison resistance', 'amulet versus poison'],
    ['amulet of protection', 'amulet of guarding'],
    ['amulet of telepathy', 'amulet of ESP'],
    ['helm of esp', 'helm of telepathy'],
    ['gauntlets of ogre power', 'gauntlets of power'],
    ['gauntlets of giant strength', 'gauntlets of power'],
    ['elven chain mail', 'elven mithril-coat'],
    ['silver shield', 'shield of reflection'],
    ['potion of sleep', 'sleeping'],
    ['scroll of recharging', 'charging'], ['recharging', 'charging'],
    ['stone', 'rock'], ['camera', 'expensive camera'],
    ['tee shirt', 'T-shirt'], ['can', 'tin'],
    ['can opener', 'tin opener'], ['kelp', 'kelp frond'],
    ['eucalyptus', 'eucalyptus leaf'], ['lembas', 'lembas wafer'],
    ['tripe', 'tripe ration'], ['cookie', 'fortune cookie'],
    ['pie', 'cream pie'], ['huge meatball', 'enormous meatball'],
    ['huge chunk of meat', 'enormous meatball'],
    ['marker', 'magic marker'], ['hook', 'grappling hook'],
    ['grappling iron', 'grappling hook'], ['grapnel', 'grappling hook'],
    ['grapple', 'grappling hook'],
    ['protection from shape shifters', 'protection from shape changers'],
    ['accuracy', 'increase accuracy'], ['box', 'large box'],
    ['luck stone', 'luckstone'], ['load stone', 'loadstone'],
    ['touch stone', 'touchstone'], ['flintstone', 'flint'],
];

// C objnam.c:3933-3961.  Keep the original buffer and a pointer offset:
// postparse edits are visible through origbp, but advancing bp is not an edit.
function readobjnam_init(bp) {
    const d = {
        ...readobjnam_preparse(''),
        otmp: null, typ: 0, oclass: 0, tvariety: -2, mntmp: NON_PM,
        actualn: null, dn: null, un: null, name: undefined,
        ftype: game.svc?.context?.current_fruit | 0, fruitbuf: '',
        buffer: bp, offset: 0, globbuf: null,
    };
    Object.defineProperties(d, {
        bp: {
            configurable: true,
            get() { return this.globbuf ?? this.buffer?.slice(this.offset); },
            set(s) {
                if (this.globbuf !== null) this.globbuf = s;
                else this.buffer = (this.buffer?.slice(0, this.offset) || '') + s;
            },
        },
        origbp: { get() { return this.buffer; } },
    });
    return d;
}

// C objnam.c:4240-4663. Return codes are the C goto destinations:
// 1 srch, 2 typfnd, 3 return otmp, 4 any, 5 wiztrap.
async function readobjnam_postparse1(d) {
    let p = _strstri(d.bp, ' named ');
    if (p >= 0) {
        d.name = d.bp.slice(p + 7);
        d.bp = d.bp.slice(0, p);
    }
    p = _strstri(d.bp, ' called ');
    if (p >= 0) {
        d.un = d.bp.slice(p + 8);
        d.bp = d.bp.slice(0, p);
        for (const r of O_RANGES) {
            if (strcmpi(d.bp, r.name) === 0) {
                d.oclass = r.oclass;
                return 1;
            }
        }
    }
    p = _strstri(d.bp, ' labeled ');
    if (p >= 0) {
        d.dn = d.bp.slice(p + 9);
        d.bp = d.bp.slice(0, p);
    } else if ((p = _strstri(d.bp, ' labelled ')) >= 0) {
        d.dn = d.bp.slice(p + 10);
        d.bp = d.bp.slice(0, p);
    }
    if ((p = _strstri(d.bp, ' of spinach')) >= 0) {
        d.bp = d.bp.slice(0, p);
        d.contents = TIN_SPINACH_C;
    }
    p = _strstri(d.bp, getObjDescr(AMULET_OF_YENDOR));
    if (p >= 0 && (p === 0 || d.bp[p - 1] === ' ')) {
        let s = d.bp;
        for (const prefix of ['cheap ', 'plastic ', 'imitation ']) {
            if (s.toLowerCase().startsWith(prefix)) {
                d.fake = 1;
                s = s.slice(prefix.length);
            }
        }
        d.real = !d.fake;
        d.typ = d.real ? AMULET_OF_YENDOR : FAKE_AMULET_OF_YENDOR;
        return 2;
    }
    if (_strncmpi0(d.bp, 'pair of ', 8)) {
        d.offset += 8;
        d.cnt *= 2;
    } else if (_strncmpi0(d.bp, 'pairs of ', 9)) {
        d.offset += 9;
        if (d.cnt > 1) d.cnt *= 2;
    } else if (_strncmpi0(d.bp, 'set of ', 7)) {
        d.offset += 7;
    } else if (_strncmpi0(d.bp, 'sets of ', 8)) {
        d.offset += 8;
    }

    const low = d.bp.toLowerCase();
    p = -1;
    if (low === 'glob' || low.endsWith(' glob') || low === 'globs'
        || low.endsWith(' globs') || (p = _strstri(d.bp, 'glob of ')) >= 0
        || (p = _strstri(d.bp, 'globs of ')) >= 0) {
        const r = name_to_mon(p < 0 ? d.bp : d.bp.slice(d.bp.indexOf(' ', p) + 4), null);
        d.mntmp = typeof r === 'object' ? r.mntmp : r;
        if (d.mntmp === NON_PM)
            d.mntmp = rn1_local(PM_BLACK_PUDDING - PM_GRAY_OOZE, PM_GRAY_OOZE);
        if (d.cnt < 2 && _strstri(d.bp, 'globs') >= 0) d.cnt = 2;
        d.globbuf = 'glob of ' + monPmname(d.mntmp, NEUTRAL);
        d.mntmp = NON_PM;
        d.oclass = FOOD_CLASS;
        d.actualn = d.bp;
        d.dn = null;
        return 1;
    }

    if (!['wand ', 'spellbook ', 'gauntlets ', 'gloves ', 'finger ']
        .some(s => _strstri(d.bp, s) >= 0)) {
        if ((p = _strstri(d.bp, 'tin of ')) >= 0) {
            let filling = d.bp.slice(p + 7);
            if (strcmpi(filling, 'spinach') === 0) {
                d.contents = TIN_SPINACH_C;
                d.mntmp = NON_PM;
            } else {
                d.tvariety = -1; // C eat.c:1409 tin_variety_txt's no-match value
                for (let i = 0; i < TIN_VARIETY_TEXT.length - 1; ++i) {
                    const prefix = TIN_VARIETY_TEXT[i] + ' ';
                    if (filling.toLowerCase().startsWith(prefix)) {
                        d.tvariety = i;
                        filling = filling.slice(prefix.length);
                        break;
                    }
                }
                const r = name_to_mon(filling, d.mgend);
                d.mntmp = typeof r === 'object' ? r.mntmp : r;
                if (typeof r === 'object' && r.gender !== undefined) d.mgend = r.gender;
            }
            d.typ = TIN;
            return 2;
        } else if ((p = _strstri(d.bp, ' of ')) >= 0) {
            // C objnam.c:4393: a neutral name must preserve a parsed gender.
            const r = name_to_mon(d.bp.slice(p + 4), d.mgend);
            d.mntmp = typeof r === 'object' ? r.mntmp : r;
            if (typeof r === 'object' && r.gender !== undefined) d.mgend = r.gender;
            if (d.mntmp >= LOW_PM) d.bp = d.bp.slice(0, p);
        }
    }
    if (!['samurai sword', 'wizard lock', 'death wand', 'master key', 'ninja-to', 'magenta']
        .some(s => d.bp.toLowerCase().startsWith(s))) {
        if (d.mntmp < LOW_PM && d.bp.length > 2) {
            const rest = { value: null }, gender = { value: d.mgend };
            d.mntmp = name_to_monplus(d.bp, rest, gender);
            d.mgend = gender.value;
            if (d.mntmp >= LOW_PM) {
                const oldoffset = d.offset;
                d.offset += d.bp.length - rest.value.length;
                if (d.bp[0] === ' ') d.offset++;
                else if (_strncmpi0(d.bp, 's ', 2)
                         || (d.offset > 0 && _strncmpi0(d.buffer.slice(d.offset - 1), "s' ", 3)))
                    d.offset += 2;
                else if (_strncmpi0(d.bp, 'es ', 3) || _strncmpi0(d.bp, "'s ", 3))
                    d.offset += 3;
                else if (!d.bp && !d.actualn && !d.dn && !d.un && !d.oclass) {
                    d.offset = oldoffset;
                    d.mntmp = NON_PM;
                }
            }
        }
    }
    if (d.bp && strcmpi(d.bp, 'tricks') && strcmpi(d.bp, 'clothes')) {
        const s = makesingular(d.bp);
        if (s !== d.bp) {
            if (d.cnt === 1) d.cnt = 2;
            d.bp = s;
        }
    }
    for (const [sp, canonical] of WISH_SPELLINGS) {
        if (wishymatch(d.bp, sp, true)) {
            d.typ = _otypByName(canonical.toLowerCase());
            return 2;
        }
    }
    if (_strncmpi0(d.bp, 'grey spell', 10)) d.bp = d.bp.slice(0, 2) + 'a' + d.bp.slice(3);
    if ((p = _strstri(d.bp, 'armour')) >= 0) d.bp = d.bp.slice(0, p + 4) + d.bp.slice(p + 5);
    if (strcmpi(d.bp, 'scales') === 0
        && d.mntmp >= PM_GRAY_DRAGON && d.mntmp <= PM_YELLOW_DRAGON) {
        d.typ = GRAY_DRAGON_SCALES + d.mntmp - PM_GRAY_DRAGON;
        d.mntmp = NON_PM;
        return 2;
    }
    if (d.bp.toLowerCase().endsWith('holy water')) {
        if (d.bp.toLowerCase().endsWith('unholy water')) {
            d.iscursed = 1; d.blessed = d.uncursed = 0;
        } else {
            d.blessed = 1; d.iscursed = d.uncursed = 0;
        }
        d.typ = POT_WATER;
        return 2;
    }
    if (_strncmpi0(d.bp, 'paperback', 9)) {
        const rest = d.bp.slice(9);
        if (!rest || _strncmpi0(rest, ' book', 5)) { d.typ = SPE_NOVEL; return 2; }
        d.otmp = null;
        return 3;
    }
    if (d.unlabeled && d.bp.toLowerCase().endsWith('scroll')) { d.typ = SCR_BLANK_PAPER; return 2; }
    if (d.unlabeled && d.bp.toLowerCase().endsWith('spellbook')) { d.typ = SPE_BLANK_PAPER; return 2; }
    if (d.bp.toLowerCase().endsWith('orange') && d.mntmp === NON_PM) {
        d.typ = _otypByName('orange'); return 2;
    }
    if (d.bp.toLowerCase().endsWith('gold piece') || d.bp.toLowerCase().endsWith('zorkmid')
        || ['gold', 'money', 'coin'].includes(d.bp.toLowerCase()) || d.bp[0] === '$') {
        if (d.cnt > 5000 && !wizard()) d.cnt = 5000;
        else if (d.cnt < 1) d.cnt = 1;
        d.otmp = await mksobj(GOLD_PIECE_OTYP, false, false);
        d.otmp.quan = d.cnt;
        d.otmp.owt = weight(d.otmp);
        return 3;
    }
    if (d.bp.length === 1) {
        const i = def_char_to_objclass(d.bp.charCodeAt(0));
        if (i < MAXOCLASSES && i > ILLOBJ_CLASS && (i !== VENOM_CLASS || wizard())) {
            d.oclass = i; return 4;
        }
    }
    if (!['enchant ', 'destroy ', 'detect food', 'food detection', 'ring mail',
          'studded leather armor', 'leather armor', 'tooled horn', 'food ration', 'meat ring']
        .some(s => d.bp.toLowerCase().startsWith(s))) {
        for (let i = 0; i < WRP_NAMES.length; ++i) {
            const wrp = WRP_NAMES[i], j = wrp.length;
            if (d.bp.toLowerCase().startsWith(wrp)) {
                d.oclass = WRP_CLASSES[i];
                if (d.oclass !== AMULET_CLASS) {
                    d.offset += j;
                    if (_strncmpi0(d.bp, ' of ', 4)) d.actualn = d.bp.slice(4);
                } else d.actualn = d.bp;
                return 1;
            }
            if (d.bp.toLowerCase().endsWith(wrp)) {
                d.oclass = WRP_CLASSES[i];
                if (d.oclass !== AMULET_CLASS) {
                    d.bp = d.bp.slice(0, -j).replace(/ $/, '');
                } else {
                    if (_strncmpi0(d.bp, 'versus poison ', 14)) {
                        d.typ = _otypByName('amulet versus poison'); return 2;
                    }
                    const amubuf = d.bp.slice(0, -j).replace(/ $/, '');
                    const k = rnd_otyp_by_namedesc_js(amubuf, AMULET_CLASS, 0);
                    if (k !== STRANGE_OBJECT) { d.typ = k; return 2; }
                }
                d.actualn = d.dn = d.bp;
                return 1;
            }
        }
    }
    if (wizard() && /^(bear|land)/i.test(d.bp)) {
        const beartrap = d.bp[0].toLowerCase() === 'b';
        let z = d.bp.slice(4);
        if (z[0] === ' ') z = z.slice(1);
        if (_strncmpi0(z, beartrap ? 'trap' : 'mine', 4)) {
            z = z.slice(4);
            if (d.trapped === 2 || strcmpi(z, ' object') === 0) {
                d.typ = beartrap ? BEARTRAP_OTYP : LAND_MINE_OTYP; return 2;
            } else if (d.trapped === 1 || z) {
                d.bp = trapname(beartrap ? BEAR_TRAP : LANDMINE, true); return 5;
            }
        }
    }
    return 0;
}

// C objnam.c:4666-4724, including the random-color glass draw.
function readobjnam_postparse2(d) {
    for (const r of O_RANGES) {
        if (strcmpi(d.bp, r.name) === 0) {
            d.typ = rnd_class(r.first, r.last); return 2;
        }
    }
    const low = d.bp.toLowerCase();
    if (low.endsWith(' stone') || low.endsWith(' gem')) {
        d.bp = d.bp.slice(0, low.endsWith(' gem') ? -4 : -6);
        d.oclass = GEM_CLASS;
        d.dn = d.actualn = d.bp;
        return 1;
    } else if (low === 'looking glass') {
        // Avoid the glass-gem arm for mirrors.
    } else if (low.endsWith(' glass') || low === 'glass') {
        if (d.broken || low.includes('broken')) { d.otmp = null; return 3; }
        let s = d.bp;
        for (const prefix of ['worthless ', 'piece of '])
            if (s.toLowerCase().startsWith(prefix)) s = s.slice(prefix.length);
        if (_strncmpi0(s, 'colored ', 8)) s = s.slice(8);
        else if (_strncmpi0(s, 'coloured ', 9)) s = s.slice(9);
        if (strcmpi(s, 'glass') === 0) {
            // objects.h: FIRST_GLASS_GEM through LAST_GLASS_GEM (9 colors).
            d.typ = _otypByName('worthless piece of white glass') + rn2(9);
            if (MKOBJ_OC_CLASS[d.typ] === GEM_CLASS) return 2;
            d.typ = 0;
        } else d.bp = 'worthless piece of ' + s;
    }
    d.actualn = d.bp;
    if (!d.dn) d.dn = d.actualn;
    return 0;
}

// C objnam.c:4727-4900. Lookup order and the retry at armor's "mail" are
// significant: a successful namedesc lookup consumes one weighted RNG draw.
function readobjnam_postparse3(d) {
    if (!d.oclass && d.actualn) {
        for (let i = MKOBJ_SVB_BASES[GEM_CLASS]; i <= LAST_REAL_GEM; ++i) {
            if (_objName(i) && strcmpi(d.actualn, _objName(i)) === 0) { d.typ = i; return 2; }
        }
        if (strcmpi(d.actualn, 'tin') === 0) { d.typ = TIN; return 2; }
    }
    if ((d.typ = rnd_otyp_by_namedesc_js(d.actualn, d.oclass, 1)) !== STRANGE_OBJECT
        || (d.dn !== d.actualn
            && (d.typ = rnd_otyp_by_namedesc_js(d.dn, d.oclass, 1)) !== STRANGE_OBJECT)
        || (d.typ = rnd_otyp_by_namedesc_js(d.un, d.oclass, 1)) !== STRANGE_OBJECT
        || (d.origbp !== d.actualn
            && (d.typ = rnd_otyp_by_namedesc_js(d.origbp, d.oclass, 1)) !== STRANGE_OBJECT))
        return 2;
    d.typ = 0;
    if (d.actualn) {
        for (const [item, name] of Object.entries(_JAPANESE_ITEMS)) {
            if (strcmpi(d.actualn, name) === 0) { d.typ = Number(item); return 2; }
        }
    }
    if (d.oclass === ARMOR_CLASS && _strstri(d.bp, 'mail') < 0) {
        d.bp += ' mail'; return 6;
    }
    if (strcmpi(d.bp, 'spinach') === 0) { d.contents = TIN_SPINACH_C; d.typ = TIN; return 2; }

    let fp = d.fruitbuf, cntf = 0, blessedf = 0, iscursedf = 0, uncursedf = 0, halfeatenf = 0;
    for (;;) {
        if (!fp) break;
        let l;
        if (_strncmpi0(fp, 'an ', l = 3) || _strncmpi0(fp, 'a ', l = 2)) cntf = 1;
        else if (!cntf && _c_digit(fp[0])) {
            cntf = _c_atoi(fp);
            fp = fp.replace(/^[0-9]+ */, '');
            l = 0;
        } else if (_strncmpi0(fp, 'blessed ', l = 8)) blessedf = 1;
        else if (_strncmpi0(fp, 'cursed ', l = 7)) iscursedf = 1;
        else if (_strncmpi0(fp, 'uncursed ', l = 9)) uncursedf = 1;
        else if (_strncmpi0(fp, 'partly eaten ', l = 13)
                 || _strncmpi0(fp, 'partially eaten ', l = 16)) halfeatenf = 1;
        else break;
        fp = fp.slice(l);
    }
    for (let f = game.ffruit; f; f = f.nextf) {
        let ftyp = 0;
        if (fp === f.fname) ftyp = 1;
        else if (fp === makesingular(f.fname)) ftyp = 2;
        else if (fp === makeplural(f.fname)) ftyp = 3;
        if (ftyp) {
            d.typ = SLIME_MOLD;
            d.blessed = blessedf; d.iscursed = iscursedf; d.uncursed = uncursedf; d.halfeaten = halfeatenf;
            if (ftyp === 2 && !cntf) cntf = 1;
            else if (ftyp === 3 && !cntf) cntf = 2;
            d.cnt = cntf;
            d.ftype = f.fid;
            return 2;
        }
    }
    if (!d.oclass && d.actualn) {
        const arti = artifact_name(d.actualn, true);
        d.name = arti ? arti.name : undefined;
        if (arti) { d.typ = arti.otyp; return 2; }
    }
    if (d.oclass && !d.typ) {
        for (const [sp, canonical] of WISH_SPELLINGS) {
            const ob = _otypByName(canonical.toLowerCase());
            if (MKOBJ_OC_CLASS[ob] === d.oclass && wishymatch(d.bp, sp, true)) {
                d.typ = ob; return 2;
            }
        }
    }
    return 0;
}

export async function readobjnam(bp, no_wish) {
    const d = readobjnam_init(bp);
    let result = 4; // any: null input
    if (bp != null) {
        d.bp = mungspaces(bp);
        if (/^(nothing|nil|none)$/i.test(d.bp)) return no_wish;
        d.fruitbuf = d.bp;
        const parsed = readobjnam_preparse(d.bp);
        const { bp: _parsedName, buffer, offset, ...qualifiers } = parsed;
        Object.assign(d, qualifiers);
        d.buffer = buffer;
        d.offset = offset;
        if (!parsed.preparseRes) {
            if (!d.cnt) d.cnt = 1;
            Object.assign(d, readobjnam_parse_charges(d.bp, d.spe, d.spesgn, d.islit));
            result = await readobjnam_postparse1(d);
            if (result === 0) result = readobjnam_postparse2(d);
            if (result === 0 || result === 1) {
                for (;;) {
                    result = readobjnam_postparse3(d);
                    if (result !== 6) break;
                    result = readobjnam_postparse2(d);
                    if (result !== 0 && result !== 1) break;
                }
            }
        }
    }
    if (result === 3) return d.otmp;
    if (result === 0 || result === 5) {
        // C wiztrap: after name lookup, and disabled during WIZKIT wishes.
        if (wizard() && !game.program_state?.wizkit_wishing && !d.oclass) {
            const otmp = await wizterrainwish(d.bp, d);
            if (otmp) return otmp;
        }
        if (!d.oclass && !d.typ) {
            if (_strncmpi0(d.bp, 'polearm', 7)) d.typ = rnd_otyp_by_wpnskill(P_POLEARMS);
            else if (_strncmpi0(d.bp, 'hammer', 6)) d.typ = rnd_otyp_by_wpnskill(P_HAMMER);
        }
        if (!d.oclass && !d.typ) return null;
    }
    if (result === 4 && !d.oclass) d.oclass = WRP_CLASSES[rn2(SIZEOF_WRPSYM)];
    // C typfnd: common creation/finalization for every resolved wish.
    if (d.typ) d.oclass = MKOBJ_OC_CLASS[d.typ];
    if (d.typ && !wizard()) {
        if (d.typ === AMULET_OF_YENDOR) d.typ = FAKE_AMULET_OF_YENDOR;
        else if (d.typ === _otypByName('candelabrum of invocation')) d.typ = rnd_class(224, 225);
        else if (d.typ === _otypByName('bell of opening')) d.typ = _otypByName('bell');
        else if (d.typ === SPE_BOOK_OF_THE_DEAD) d.typ = SPE_BLANK_PAPER;
        else if (d.typ === 228 /* MAGIC_LAMP */) d.typ = 227; // OIL_LAMP
        else if (d.oclass === VENOM_CLASS) return null;
    }
    if (d.typ === CORPSE && d.mntmp >= PM_GRAY_OOZE && d.mntmp <= PM_BLACK_PUDDING) {
        d.typ = _otypByName('glob of gray ooze') + d.mntmp - PM_GRAY_OOZE;
        d.mntmp = NON_PM;
    }
    const otmp = d.typ ? await mksobj(d.typ, true, false) : await mkobj(d.oclass, false);
    return _finalize_wish(otmp, d.blessed, d.iscursed, d.uncursed, d.spe, d.spesgn,
                          d.cnt, d.rechrg, d.islit, d.erodeproof, d);
}

// ── _finalize_wish — apply BUC and enchantment from wish string ───────────────
// C ref: objnam.c:5038-5395 (the typfnd/finalize section)
// Applies blessed/cursed/uncursed and +spe from wish prefix.
// Some type-specific arms draw after mksobj_init, in C's order below.
async function _finalize_wish(otmp, blessed, iscursed, uncursed, spe, spesgn, cnt, rechrg, islit, erodeproof, dx) {
    if (!otmp) return otmp;
    dx = dx || {};
    /* C objnam.c:3946 d->tvariety defaults to RANDOM_TIN (-2); a caller that
     * never parsed a tin variety must not reach the rn2(4) at 5343. */
    if (dx.tvariety === undefined) dx = { ...dx, tvariety: -2 };
    /* C objnam.c:5042-5071: glob weight and the wizard's limit override. */
    if (otmp.globby) {
        otmp.quan = 1;
        otmp.owt = weight(otmp);
        const gs = dx.gsize | 0;
        if (gs > 1)
            otmp.owt += (5 + (gs - 2) * 10) * otmp.owt;
        if (cnt > 1) {
            const rn1cnt = Math.min(rn1_local(5, 2), 6 - gs);
            if (cnt > rn1cnt && (!wizard() || game.program_state?.wizkit_wishing
                || await yn_function('Override glob weight limit?', 'yn', 'n', true) !== 'y'))
                cnt = rn1cnt;
            otmp.owt *= cnt;
        }
        cnt = 0;
    }
    /* C objnam.c:5070-5083: resolve non-glob quantity before spe/corpsenm;
     * its rnd(6) precedes the corpse/statue gender roll at :5163. */
    if (!otmp.globby && cnt > 0 && _oc_merge_on(otmp.otyp)
        && (wizard()
            || cnt < rnd(6)
            || (cnt <= 7 && _is_candle_on(otmp))
            || (cnt <= 20
                && ((otmp.otyp | 0) === ROCK_OTYP || (otmp.otyp | 0) === FLINT_OTYP
                    || _is_missile_on(otmp)
                    || ((otmp.oclass | 0) === WEAPON_CLASS && _is_ammo_on(otmp))))))
        otmp.quan = cnt | 0;

    /* C objnam.c:5091-5118 — non-wizard limits on a requested enchantment.
     * The rnd(5) draw is C's (it fires only for armor/weapon/weptool/charged
     * rings with an explicit +/-N).  JS applies the sign at the default arm
     * below (spesgn * spe), so d.spe stays non-negative here. */
    if (spesgn !== 0 && !wizard()) {
        if ((otmp.oclass | 0) === ARMOR_CLASS || (otmp.oclass | 0) === WEAPON_CLASS
            || _is_weptool(otmp)
            || ((otmp.oclass | 0) === RING_CLASS && _oc_charged(otmp))) {
            if (spe > rnd(5) && spe > (otmp.spe | 0))
                spe = 0;
            // C you.h:464: Luck includes the bonus/penalty from luck items.
            if (spe > 2 && (game.u?.uluck | 0) + (game.u?.moreluck | 0) < 0)
                spesgn = -1;
        } else {
            if ((otmp.oclass | 0) === WAND_CLASS
                || (otmp.otyp | 0) === _otypByName('crystal ball')) {
                if (spe > 1 && spesgn === -1)
                    spe = 1;
            } else if (spe > 0 && spesgn === -1) {
                spe = 0;
            }
            if (spe > (otmp.spe | 0))
                spe = otmp.spe | 0;
        }
    }
    {
        const t = otmp.otyp | 0;
        switch (t) {
        case TIN:
            otmp.spe = 0;
            if (dx.contents === TIN_EMPTY) {
                otmp.corpsenm = NON_PM;
            } else if (dx.contents === TIN_SPINACH_C) {
                otmp.corpsenm = NON_PM;
                otmp.spe = 1;
            }
            break;
        case CORPSE:
        case STATUE:
        case FIGURINE: {
            const P = ismnum(dx.mntmp) ? permonstTemplate(dx.mntmp) : null;
            const mg = (dx.mgend === undefined) ? -1 : dx.mgend;
            otmp.spe = !P ? CORPSTAT_RANDOM
                : _is_neuter_pm(P) ? CORPSTAT_NEUTER
                    : (mg === FEMALE && !_is_male_pm(P)) ? CORPSTAT_FEMALE
                        : (mg === MALE && !_is_female_pm(P)) ? CORPSTAT_MALE
                            : CORPSTAT_RANDOM;
            if (P && (otmp.spe | 0) === CORPSTAT_RANDOM)
                otmp.spe = _is_male_pm(P) ? CORPSTAT_MALE
                    : _is_female_pm(P) ? CORPSTAT_FEMALE
                        : (rn2(2) ? CORPSTAT_MALE : CORPSTAT_FEMALE);
            if (dx.ishistoric && t === STATUE)
                otmp.spe = (otmp.spe | 0) | CORPSTAT_HISTORIC;
            break;
        }
        case SLIME_MOLD:
            otmp.spe = dx.ftype | 0; /* objnam.c:5137-5138 */
            break;
        case TOWEL:
            /* C objnam.c:5129-5132 — "wet"/"moist" set a towel's spe. */
            if (dx.wetness) otmp.spe = dx.wetness | 0;
            break;
        case SKELETON_KEY:
        case CHEST:
        case LARGE_BOX:
        case HEAVY_IRON_BALL:
        case IRON_CHAIN:
            /* C retains the initializer's spe, ignoring numeric prefixes. */
            break;
        case SCR_MAIL_OTYP:
        case ACID_VENOM:
        case BLINDING_VENOM:
            otmp.spe = 1;
            break;
        case WAN_WISHING:
            if (!wizard()) {
                otmp.spe = rn2(10) ? -1 : 0;
                break;
            }
            /* FALLTHRU */
        default:
            /* C objnam.c:5184 — only the default arm uses parsed d.spe.
             * With no numeric request, d.spe is the initializer's value. */
            if (spesgn !== 0) otmp.spe = (spesgn * spe << 24) >> 24; // C schar.
            break;
        }
    }
    /* ── C objnam.c:5188-5252 — "set otmp->corpsenm or dragon scale [mail]".
     * The CORPSE arm's set_corpsenm() re-runs start_corpse_timeout, so it DRAWS;
     * it must run here, immediately after the gender roll above.  The
     * long-worm-tail rewrite above is ported literally; were-form conversion
     * is applied only in the TIN arm below. */
    if (ismnum(dx.mntmp)) {
        let mntmp = dx.mntmp | 0;
        const t = otmp.otyp | 0;
        if (mntmp === PM_LONG_WORM_TAIL) mntmp = PM_LONG_WORM;
        /* C objnam.c:5199-5203: tins use the corresponding human form when a
         * were-form cannot leave a corpse.  Keep this local to the TIN arm;
         * corpse/figurine conversion has separate downstream semantics. */
        if (t !== FIGURINE && _is_were_pm(permonstTemplate(mntmp))
            && ((_mvflags_of(mntmp) & G_NOCORPSE_OBJNAM) !== 0)) {
            const humanwere = counter_were(mntmp);
            if (humanwere !== NON_PM) mntmp = humanwere;
        }
        const P = permonstTemplate(mntmp);
        switch (t) {
        case TIN:
            if ((_mvflags_of(mntmp) & G_GENOD_OBJNAM) !== 0) {
                otmp.corpsenm = NON_PM;
            } else if ((((P.geno | 0) & G_UNIQ_OBJNAM) === 0 || wizard())
                       && ((_mvflags_of(mntmp) & G_NOCORPSE_OBJNAM) === 0)
                       && mons_cnutrit(mntmp) !== 0) {
                otmp.corpsenm = mntmp;
            }
            break;
        case CORPSE:
            if (((P.geno | 0) & G_UNIQ_OBJNAM) === 0 || wizard()) {
                if (((_mvflags_of(mntmp) & G_NOCORPSE_OBJNAM) === 0)) {
                    if ((P.msound | 0) === MS_GUARDIAN)
                        mntmp = genus(mntmp, 1);
                    set_corpsenm(otmp, mntmp);
                }
            }
            /* C objnam.c:5222-5225: zombie_form() returns NON_PM (nonzero)
             * for non-zombifiable species, so C's truth test passes then too. */
            if (dx.zombify && zombie_form(permonstTemplate(mntmp)) !== 0) {
                start_timer(rn1_local(5, 10), TIMER_OBJECT, ZOMBIFY_MON,
                            { a_obj: otmp, a_long: null });
            }
            break;
        case EGG:
            // C objnam.c:5227: validate the species, then set its hatch timer.
            set_corpsenm(otmp, can_be_hatched(mntmp));
            break;
        case FIGURINE:
            if (((P.geno | 0) & G_UNIQ_OBJNAM) === 0
                && (!_is_human_pm(P) || _is_were_pm(P))
                && mntmp !== PM_MAIL_DAEMON) /* objnam.c:5235 MAIL_STRUCTURES */
                otmp.corpsenm = mntmp;
            break;
        case STATUE:
            otmp.corpsenm = mntmp;
            // C objnam.c:5243-5244: tiny statues cannot contain a spellbook.
            if (otmp.cobj && P.msize < 1 /* MZ_SMALL; verysmall(P) */)
                await delete_contents(otmp);
            break;
        case SCALE_MAIL:
            // C objnam.c:5246-5249, after creating ordinary SCALE_MAIL.
            if (mntmp >= PM_GRAY_DRAGON && mntmp <= PM_YELLOW_DRAGON)
                otmp.otyp = 101 /* GRAY_DRAGON_SCALE_MAIL */ + mntmp - PM_GRAY_DRAGON;
            break;
        default:
            break;
        }
    }
    /* Apply BUC from wish string (overrides mksobj_init result) */
    /* C objnam.c:5251-5261: uncursed/blessed wishes depend on Luck. */
    const luck = (game.u?.uluck | 0) + (game.u?.moreluck | 0);
    if (iscursed) {
        otmp.cursed = true;
        otmp.blessed = false;
    } else if (uncursed) {
        otmp.blessed = false;
        otmp.cursed = (luck < 0 && !wizard());
    } else if (blessed) {
        otmp.blessed = (luck >= 0 || wizard());
        otmp.cursed = (luck < 0 && !wizard());
    } else if (spesgn < 0) {
        /* C objnam.c:5266-5267: a negatively-enchanted wish with no BUC word is
         * cursed. */
        otmp.cursed = true;
        otmp.blessed = false;
    }
    if (islit && ((otmp.otyp | 0) === 227 /* OIL_LAMP */
                  || (otmp.otyp | 0) === 228 /* MAGIC_LAMP */
                  || (otmp.otyp | 0) === 226 /* BRASS_LANTERN */
                  || (otmp.otyp | 0) === 224 /* TALLOW_CANDLE */
                  || (otmp.otyp | 0) === 225 /* WAX_CANDLE */
                  || (otmp.otyp | 0) === 321 /* POT_OIL */)) {
        place_object(otmp, game.u?.ux | 0, game.u?.uy | 0);
        begin_burn(otmp, false);
        obj_extract_self_general(otmp);
    }

    if (_erosion_matters(otmp)) {
        otmp.oeroded = 0;
        otmp.oeroded2 = 0;
        /* The two arms the "KNOWN GAP" paragraph above named as unreachable.
         * They are reachable now: readobjnam_preparse parses C's erosion
         * adjectives ("rusty"/"rusted"/"burnt"/"burned"/"cracked" ->
         * d.eroded, "corroded"/"rotted" -> d.eroded2, each doubled by a
         * preceding "very " and tripled by "thoroughly "). */
        if (dx.eroded && (_is_flammable(otmp) || _is_rustprone(otmp) || _is_crackable(otmp)))
            otmp.oeroded = dx.eroded | 0;
        if (dx.eroded2 && (_is_corrodeable(otmp) || _is_rottable(otmp)))
            otmp.oeroded2 = dx.eroded2 | 0;
        if (erodeproof && (_is_damageable(otmp) || (otmp.otyp | 0) === CRYSKNIFE_OTYP))
            otmp.oerodeproof = (luck >= 0 || wizard()) ? 1 : 0;
    }

    /* C objnam.c:5290-5296 — set otmp->recharged.
     *   if (d.oclass == WAND_CLASS) {
     *       if (d.otmp->otyp == WAN_WISHING && !wizard) d.rechrg = 1;
     *       d.otmp->recharged = (unsigned) d.rechrg;
     *   }
     * rechrg is the left half of a "(rechrg:spe)" wish; doname() prints it back
     * as " (0:30)" for a known-charge wand (objnam.js:3889), so a dropped
     * rechrg would show up on the very frame the wish is announced. */
    if ((otmp.oclass | 0) === WAND_CLASS) {
        /* fn-truthy-lint HARD: `wizard` is a FUNCTION (js/gstate.js:19), so
         * `!wizard` was ALWAYS FALSE and a non-wizard game could wish a wand of
         * wishing with its recharge count intact.  C objnam.c:5064 guards it
         * with the wizard macro. */
        if ((otmp.otyp | 0) === WAN_WISHING && !wizard())
            rechrg = 1;
        otmp.recharged = rechrg | 0;
    }

    /* C objnam.c:5299-5306 — set poisoned (the readobjnam wish path never applied it). */
    if (dx.ispoisoned) {
        if (is_poisonable(otmp))
            otmp.opoisoned = (luck >= 0) ? 1 : 0;
        else if ((otmp.oclass | 0) === FOOD_CLASS)
            otmp.age = 1;
    }
    const _typ = otmp.otyp | 0;
    const _isBox = (_typ === LARGE_BOX || _typ === CHEST);
    if (dx.trapped) {
        if (_isBox || _typ === TIN)
            otmp.otrapped = (dx.trapped === 1) ? 1 : 0;
    }
    if (dx.contents === TIN_EMPTY) {
        if (_typ === BAG_OF_TRICKS_OTYP || _typ === HORN_OF_PLENTY_OTYP) {
            if ((otmp.spe | 0) > 0) otmp.spe = 0;
        } else if (otmp.cobj) {
            // C objnam.c:5316-5320: discard generated contents for an empty wish.
            /* C objnam.c:5315-5319 — assumes artifacts can't be randomly
             * generated inside containers. */
            await delete_contents(otmp);
            otmp.owt = weight(otmp);
        }
    }
    if (_isBox) {
        if (dx.locked)        { otmp.olocked = 1; otmp.obroken = 0; }
        else if (dx.unlocked) { otmp.olocked = 0; otmp.obroken = 0; }
        else if (dx.broken)   { otmp.olocked = 0; otmp.obroken = 1; }
        if (otmp.obroken) otmp.otrapped = 0;
    }
    if (dx.isgreased) otmp.greased = 1;
    if (dx.isdiluted && (otmp.oclass | 0) === POTION_CLASS)
        otmp.odiluted = ((otmp.otyp | 0) !== POT_WATER) ? 1 : 0;

    /* C objnam.c:5343-5344.  rn2(4) is evaluated even in wizard mode because
     * it is the left operand of `rn2(4) || wizard`. */
    if (_typ === TIN && (dx.tvariety | 0) >= 0
        && (rn2(4) || wizard()))
        otmp.spe = -((dx.tvariety | 0) + 1);

    // C objnam.c:5346-5381: named wishes use oname, including artifact checks.
    if (dx.name !== undefined) {
        const arti = artifact_name(dx.name, true);
        const wisharti = arti && arti.otyp === otmp.otyp;
        if (wisharti) dx.name = arti.name;
        if (otmp.otyp === SPE_NOVEL) {
            const idx = { value: otmp.novelidx };
            const title = lookup_novel(dx.name, idx);
            if (title) { dx.name = title; otmp.novelidx = idx.value; }
        }
        otmp = await oname(otmp, dx.name, ONAME_WISH);
        if (otmp.oartifact || wisharti) {
            otmp.quan = 1;
            const uc = (game.u.uconduct = game.u.uconduct || {});
            uc.wisharti = (uc.wisharti | 0) + 1;
        }
        if (permapoisoned(otmp)) otmp.opoisoned = 1;
        if ((is_quest_artifact(otmp)
             || (otmp.oartifact && rn2(nartifact_exist()) > 1)) && !wizard()) {
            artifact_exists(otmp, ONAME(otmp), false, 0);
            await obfree(otmp, null);
            await pline(`For a moment, you feel something in your ${makeplural(body_part(HAND_D))}, but it disappears!`);
            return hands_obj;
        }
    }
    /* C objnam.c:5383-5394 — "partly eaten" wish: oeaten = nut, then
     * consume_oeaten(otmp, 1) (halve); skipped for nut <= 1. */
    if (dx.halfeaten && (otmp.oclass | 0) === FOOD_CLASS) {
        const nut = obj_nutrition(otmp) >>> 0;
        if (nut > 1) otmp.oeaten = nut >> 1;
    }
    // C objnam.c:5395-5397: finalize weight before the optional ball increment.
    otmp.owt = weight(otmp);
    if (dx.very && (otmp.oclass | 0) === BALL_CLASS)
        otmp.owt += WT_IRON_BALL_INCR;
    return otmp;
}

function _oc_merge_on(otyp) {
    const i = otyp | 0;
    return (i >= 0 && i < MKOBJ_OC_MERGE.length) && (MKOBJ_OC_MERGE[i] | 0) !== 0;
}
const ROCK_OTYP = 474, FLINT_OTYP = 473;
const TALLOW_CANDLE_OTYP = 224, WAX_CANDLE_OTYP = 225;
/* C hack.h Is_candle(otmp) — the two candle otyps (js/shk.js says the same). */
function _is_candle_on(otmp) {
    const t = otmp.otyp | 0;
    return t === TALLOW_CANDLE_OTYP || t === WAX_CANDLE_OTYP;
}
/* C obj.h:245 is_missile(otmp): (WEAPON_CLASS || TOOL_CLASS) && oc_skill in
 * [-P_BOOMERANG .. -P_DART] = [-25,-23];
 * C obj.h:238 is_ammo(otmp):    (WEAPON_CLASS || GEM_CLASS)  && oc_skill in
 * [-P_CROSSBOW .. -P_BOW]  = [-22,-20].  Same bodies js/cmd.js carries; local
 * because cmd.js does not export them.
 * NOTE the two macros do NOT take the same class pair -- is_missile's second
 * class is TOOL_CLASS, is_ammo's is GEM_CLASS.  _is_missile_on() used to test
 * GEM_CLASS, copied from the line above it.  Inert against today's object
 * table (no TOOL has oc_skill in [-25,-23] and gems are all -21, so neither
 * class contributes a member) but not what C says. */
function _oc_skill_on(otmp) {
    const i = otmp.otyp | 0;
    return (i >= 0 && i < MKOBJ_OC_SKILL.length) ? (MKOBJ_OC_SKILL[i] | 0) : 0;
}
function _is_missile_on(otmp) {
    const o = otmp.oclass | 0;
    if (o !== WEAPON_CLASS && o !== TOOL_CLASS) return false;
    const sk = _oc_skill_on(otmp);
    return sk >= -25 && sk <= -23;
}
function _is_ammo_on(otmp) {
    const o = otmp.oclass | 0;
    if (o !== WEAPON_CLASS && o !== GEM_CLASS) return false;
    const sk = _oc_skill_on(otmp);
    return sk >= -22 && sk <= -20;
}

// ── cloak_simple_name (objnam.c:5489-5507) ──────────────────────────────────
// C: const char * cloak_simple_name(struct obj *cloak)
// Returns a simple name for a cloak based on its type.
// If cloak is NULL, or no special case applies, returns "cloak".
export function cloak_simple_name(cloak) {
    if (cloak) {
        const otyp = cloak.otyp | 0;
        switch (otyp) {
        case ROBE:
            return "robe";
        case MUMMY_WRAPPING:
            return "wrapping";
        case ALCHEMY_SMOCK:
            /* C: return (objects[cloak->otyp].oc_name_known && cloak->dknown)
                         ? "smock" : "apron"; */
            const g = game;
            const oc_name_known = !!(g._oc_name_known && g._oc_name_known[otyp]);
            const dknown = !!(cloak.dknown);
            return (oc_name_known && dknown) ? "smock" : "apron";
        default:
            break;
        }
    }
    return "cloak";
}

// ── gloves_simple_name (objnam.c:5528-5545) ─────────────────────────────────
// C: const char * gloves_simple_name(struct obj *gloves)
// "gloves vs gauntlets; depends upon discovery state."
//   if (gloves && gloves->dknown) {
//       actualn = OBJ_NAME(*ocl); descrpn = OBJ_DESCR(*ocl);
//       if (strstri(oc_name_known ? actualn : descrpn, "gauntlets"))
//           return "gauntlets";
//   }
//   return "gloves";
// strstri is a case-insensitive substring search; all glove names/descrs are
// lowercase, so a lowercased .includes("gauntlets") matches C exactly.
export function gloves_simple_name(gloves) {
    const gauntlets = "gauntlets";
    if (gloves && gloves.dknown) {
        const otyp = gloves.otyp | 0;
        const g = game;
        const oc_name_known = !!(g._oc_name_known && g._oc_name_known[otyp]);
        /* _objName, not getObjName — the latter's extracted table omits the
         * fixed-name armor otyps (see suit_simple_name). */
        const actualn = _objName(otyp);            /* OBJ_NAME — real name */
        const descrpn = getObjDescr(otyp);         /* OBJ_DESCR — shuffled appearance */
        const probe = oc_name_known ? actualn : descrpn;
        if (probe && String(probe).toLowerCase().includes(gauntlets))
            return gauntlets;
    }
    return "gloves";
}
export function helm_simple_name(helmet) {
    return !hard_helmet(helmet) ? "hat" : "helm";
}

// ── suit_simple_name (objnam.c:5468-5487) ──────────────────────────────────
// C: const char * suit_simple_name(struct obj *suit)
// Returns a generic descriptor for the piece of armor: "suit" (default),
// "mail" (most armors), "jacket" (leather jacket), "dragon mail", or
// "dragon scales".  Port checks the object name for specific suffixes to
// classify the armor type.
export function suit_simple_name(suit) {
    if (suit) {
        // Is_dragon_mail — <color> dragon scale mail, otyp 101-110
        const otyp = suit.otyp | 0;
        if (otyp >= 101 && otyp <= 110)
            return "dragon mail";
        // Is_dragon_scales — <color> dragon scales, otyp 111-120.  The prior
        // helm / orcish helm / dwarvish iron helm — see the same correction in
        // js/do_wear.js xname_armor), so real dragon scales fell through to the
        // suffix checks ("gray dragon scales" ends in neither " mail" nor
        // " jacket") and were named "suit".
        if (otyp >= 111 && otyp <= 120)
            return "dragon scales";

        // suitnm = OBJ_NAME(objects[suit->otyp]).  Must use _objName (full otyp
        // coverage), NOT getObjName: getObjName's extracted table omits the
        // fixed-name armor otyps and returns null for e.g. ring mail (132), so
        // the " mail" suffix test never fired and every suit was named "suit"
        const suitnm = _objName(otyp);
        if (suitnm != null) {
            const suitnmLen = suitnm.length;
            // Check if the name ends with " mail" (strlen(suitnm) > 5 && !strcmp(esuitp - 5, " mail"))
            if (suitnmLen > 5) {
                const suffix = suitnm.slice(suitnmLen - 5);
                if (suffix === " mail")
                    return "mail";
            }
            // Check if the name ends with " jacket" (strlen(suitnm) > 7 && !strcmp(esuitp - 7, " jacket"))
            if (suitnmLen > 7) {
                const suffix = suitnm.slice(suitnmLen - 7);
                if (suffix === " jacket")
                    return "jacket";
            }
        }
    }
    return "suit";
}

// ── armor_simple_name (objnam.c:5432-5467) ────────────────────────────────
// C: const char * armor_simple_name(struct obj *armor)
// Dispatches to the correct simple-name function based on armor category,
// read from objects[armor->otyp].oc_armcat.
// The case labels below follow objclass.h enum obj_armor_types:
//   ARM_SUIT=0 ARM_SHIELD=1 ARM_HELM=2 ARM_GLOVES=3 ARM_BOOTS=4 ARM_CLOAK=5
//   ARM_SHIRT=6
// (the previous mapping had SHIELD and CLOAK transposed — inert only because
// game._oc_armcat is never populated, so every object took case 0).  The
// category itself comes from do_wear.js's oc_armcat(), the port's authoritative
// otyp→oc_armcat mapping; game._oc_armcat is still preferred if ever populated.
export function armor_simple_name(armor) {
    const otyp = armor.otyp | 0;
    const armcat = oc_armcat(armor) | 0;
    switch (armcat) {
    case 0: /* ARM_SUIT */
        return suit_simple_name(armor);
    case 1: /* ARM_SHIELD */
        return shield_simple_name(armor);
    case 2: /* ARM_HELM */
        return helm_simple_name(armor);
    case 3: /* ARM_GLOVES */
        return gloves_simple_name(armor);
    case 4: /* ARM_BOOTS */
        return boots_simple_name(armor);
    case 5: /* ARM_CLOAK */
        return cloak_simple_name(armor);
    case 6: /* ARM_SHIRT */
        return shirt_simple_name(armor);
    default: {
        const result = simpleonames(armor);
        impossible("unknown armor category (%s => %u)", result, armcat);
        return result;
    }
    }
}

// ── the_unique_obj (objnam.c:1105-1117) ──────────────────────────────────
// C: boolean the_unique_obj(struct obj *obj)
// Determines whether an object should be named "the <obj>" instead of "a <obj>".
// Returns TRUE if the object is "unique" (like the Amulet of Yendor) and the
// player knows what it is, OR it's a fake amulet being lied about, OR it's the
// real amulet but not yet identified.
const THE_UNIQUE_AMULET_OF_YENDOR = 213;
const THE_UNIQUE_FAKE_AMULET_OF_YENDOR = 212;

export function the_unique_obj(obj) {
    const known = !!(obj.known || game.iflags?.override_ID);

    if (!obj.dknown && !game.iflags?.override_ID)
        return false;
    else if ((obj.otyp | 0) === THE_UNIQUE_FAKE_AMULET_OF_YENDOR && !known)
        return true; /* lie */
    else {
        const g = game;
        const oc_unique = !!(g._oc_unique && g._oc_unique[(obj.otyp | 0)]);
        const otyp = obj.otyp | 0;
        return !!(oc_unique && (known || otyp === THE_UNIQUE_AMULET_OF_YENDOR));
    }
}

// ── bare_artifactname (C objnam.c:2500-2514) ─────────────────────────────────
// C: char *bare_artifactname(struct obj *obj)
// Returns the artifact's bare name without article prefix.
// For non-artifact objects, falls back to xname(obj).
export function bare_artifactname(obj) {
    if (obj.oartifact) {
        let outbuf = artiname(obj.oartifact);
        if (outbuf.startsWith("The "))
            outbuf = lowc(outbuf[0]) + outbuf.substring(1);
        return outbuf;
    } else {
        return xname(obj);
    }
}

// ── quest_info (nethack-c/src/questpgr.c:30-46) ──────────────────────────────
// C: short quest_info(int typ)
// Returns the monster number (PM_* enum) for a given quest role type.
// typ == 0 → quest artifact index
// typ == MS_LEADER → leader monster number
// typ == MS_NEMESIS → nemesis monster number
// typ == MS_GUARDIAN → guardian monster number
export function quest_info(typ) {
    const roleIx = (game.flags?.initrole ?? -1) | 0;

    switch (typ) {
    case 0:
        /* quest artifact index (ART_* enum) */
        if (roleIx >= 0 && roleIx < _ROLE_QUESTARTI.length)
            return _ROLE_QUESTARTI[roleIx] | 0;
        return 0;
    case MS_LEADER:
        if (roleIx >= 0 && roleIx < ROLE_LDRNUM.length)
            return ROLE_LDRNUM[roleIx] | 0;
        return 0;
    case MS_NEMESIS:
        if (roleIx >= 0 && roleIx < ROLE_NEMNUM.length)
            return ROLE_NEMNUM[roleIx] | 0;
        return 0;
    case MS_GUARDIAN:
        if (roleIx >= 0 && roleIx < ROLE_GUARDNUM.length)
            return ROLE_GUARDNUM[roleIx] | 0;
        return 0;
    default:
        /* C questpgr.c:42-44: the default arm calls impossible() and then
         * FALLS OUT of the switch to the function's trailing `return 0;`.
         * impossible() logs and returns (pline.c:587-637) — it does not
         * abort, so throwing here was wrong. */
        impossible("quest_info(%d)", typ);
        return 0;
    }
}


// ── genders (C role.c:688-694) ────────────────────────────────────────────────
// Pronoun genders: he/she/it and they for monsters
const genders = [
    { he: "he", him: "him", his: "his" },      /* [0] = male */
    { he: "she", him: "her", his: "her" },    /* [1] = female */
    { he: "it", him: "it", his: "its" },      /* [2] = neuter */
    { he: "they", him: "them", his: "their" } /* [3] = group/plural */
];

// ── vowels string (used in many pluralization rules) ─────────────────────────
const vowels = "aeiou";

// ── one_off (C objnam.c:2660-2685) ────────────────────────────────────────────
// Singular/plural word pairs that don't fit formula-based transformations
const one_off = [
    { sing: "child", plur: "children" },
    { sing: "cubus", plur: "cubi" },
    { sing: "culus", plur: "culi" },
    { sing: "Cyclops", plur: "Cyclopes" },
    { sing: "djinni", plur: "djinn" },
    { sing: "erinys", plur: "erinyes" },
    { sing: "foot", plur: "feet" },
    { sing: "fungus", plur: "fungi" },
    { sing: "goose", plur: "geese" },
    { sing: "knife", plur: "knives" },
    { sing: "labrum", plur: "labra" },
    { sing: "louse", plur: "lice" },
    { sing: "mouse", plur: "mice" },
    { sing: "mumak", plur: "mumakil" },
    { sing: "nemesis", plur: "nemeses" },
    { sing: "ovum", plur: "ova" },
    { sing: "ox", plur: "oxen" },
    { sing: "passerby", plur: "passersby" },
    { sing: "rtex", plur: "rtices" },
    { sing: "serum", plur: "sera" },
    { sing: "staff", plur: "staves" },
    { sing: "tooth", plur: "teeth" },
];

// ── as_is (C objnam.c:2687-2702) ──────────────────────────────────────────────
// Words that don't need pluralization (same form singular and plural)
const as_is = [
    "boots", "shoes", "gloves", "lenses", "scales",
    "eyes", "gauntlets", "iron bars",
    "bison", "deer", "elk", "fish", "fowl",
    "tuna", "yaki", "-hai", "krill", "manes",
    "moose", "ninja", "sheep", "ronin", "roshi",
    "shito", "tengu", "ki-rin", "Nazgul", "gunyoki",
    "piranha", "samurai", "shuriken", "haggis", "Bordeaux",
];

// ── Helper: case-insensitive string comparison (C strcmpi) ──────────────────
function strcmpi(s1, s2) {
    const n = Math.max(s1.length, s2.length);
    for (let i = 0; i < n; i++) {
        if (!s2[i]) return (s1[i] !== undefined) ? 1 : 0;
        if (!s1[i]) return -1;
        const c1 = lowc(s1[i]);
        const c2 = lowc(s2[i]);
        if (c1 !== c2) return (c1 > c2) ? 1 : -1;
    }
    return 0;
}

// ── Helper: case-insensitive n-char comparison (C strncmpi) ──────────────────
function strncmpi(s1, s2, n) {
    for (let i = 0; i < n; i++) {
        if (!s2[i]) return (s1[i] !== undefined) ? 1 : 0;
        if (!s1[i]) return -1;
        const c1 = lowc(s1[i]);
        const c2 = lowc(s2[i]);
        if (c1 !== c2) return (c1 > c2) ? 1 : -1;
    }
    return 0;
}

// ── Helper: BSTRCMPI macro (C objnam.c:66) ───────────────────────────────────
// C: #define BSTRCMPI(base,ptr,str) ((ptr) < (base) || strcmpi((ptr),(str)))
// In JS `base` is the string and `ptr` is an integer index into it (typically
// eos(base) - N). Returns true if the index underflows the string start, else
// the case-insensitive compare of the trailing substring against str.
function BSTRCMPI(base, ptr, str) {
    return (ptr < 0 || strcmpi(base.substring(ptr), str) !== 0);
}

// ── Helper: BSTRNCMPI macro (C objnam.c:67-68) ────────────────────────────────
// C: #define BSTRNCMPI(base,ptr,str,num) ((ptr)<(base) || strncmpi((ptr),(str),(num)))
function BSTRNCMPI(base, ptr, str, num) {
    return (ptr < 0 || strncmpi(base.substring(ptr), str, num) !== 0);
}

// ── Helper: singplur_compound (C objnam.c:2781-2812) ─────────────────────────
// Searches for common compound patterns like "lump of royal jelly"
function singplur_compound(str) {
    const compounds = [
        " of ", " labeled ", " called ",
        " named ", " above",
        " versus ", " from ", " in ",
        " on ", " a la ", " with",
        " de ", " d'", " du ",
        " au ", "-in-", "-at-",
    ];
    const compound_start = " -";

    for (let p = 0; p < str.length; p++) {
        if (!compound_start.includes(str[p]))
            continue;

        for (const cmpd of compounds) {
            if (strncmpi(str.substring(p), cmpd, cmpd.length) === 0)
                return p;
        }
    }
    return null;
}

// ── Helper: ch_ksound (C objnam.c:3166-3189) ─────────────────────────────────
// Check if word ending is a ch-word that makes k-sound (pluralize with 's' not 'es')
function ch_ksound(basestr) {
    const ch_k = [
        "monarch", "poch", "tech", "mech", "stomach", "psych",
        "amphibrach", "anarch", "atriarch", "azedarach", "broch",
        "gastrotrich", "isopach", "loch", "oligarch", "peritrich",
        "sandarach", "sumach", "symposiarch",
    ];

    if (!basestr || basestr.length < 4)
        return false;

    const endstr = eos(basestr);
    for (const word of ch_k) {
        if (!BSTRCMPI(basestr, endstr - word.length, word))
            return true;
    }
    return false;
}

// ── Helper: badman (C objnam.c:3192-3237) ─────────────────────────────────────
// Check if "man" word should not pluralize to "men"
function badman(basestr, to_plural) {
    const no_men = [
        "albu", "antihu", "anti", "ata", "auto", "bildungsro", "cai", "cay",
        "ceru", "corner", "decu", "des", "dura", "fir", "hanu", "het",
        "infrahu", "inhu", "nonhu", "otto", "out", "prehu", "protohu",
        "subhu", "superhu", "talis", "unhu", "sha",
        "hu", "un", "le", "re", "so", "to", "at", "a",
    ];
    const no_man = [
        "abdo", "acu", "agno", "ceru", "cogno", "cycla", "fleh", "grava",
        "hegu", "preno", "sonar", "speci", "dai", "exa", "fla", "sta", "teg",
        "tegu", "vela", "da", "hy", "lu", "no", "nu", "ra", "ru", "se", "vi",
        "ya", "o", "a",
    ];

    if (!basestr || basestr.length < 4)
        return false;

    const endstr = eos(basestr);

    if (to_plural) {
        for (const no of no_men) {
            const spot = endstr - (no.length + 3);
            if (!BSTRNCMPI(basestr, spot, no, no.length)
                && (spot === 0 || basestr[spot - 1] === ' '))
                return true;
        }
    } else {
        for (const no of no_man) {
            const spot = endstr - (no.length + 3);
            if (!BSTRNCMPI(basestr, spot, no, no.length)
                && (spot === 0 || basestr[spot - 1] === ' '))
                return true;
        }
    }
    return false;
}

// ── Helper: chrcasecpy / strcasecpy (C hacklib.c) ────────────────────────────
// chrcasecpy: return src char with the case of dst char (when both alphabetic).
function chrcasecpy(oc, ic) {
    // C: if oc is uppercase letter and ic lowercase -> highc(ic);
    //    if oc is lowercase letter and ic uppercase -> lowc(ic); else ic.
    const ocl = letter(oc), icl = letter(ic);
    if (ocl && icl) {
        if (highc(oc) === oc) return highc(ic); // dst upper -> upper
        if (lowc(oc) === oc) return lowc(ic);   // dst lower -> lower
    }
    return ic;
}
// strcasecpy_at: faithful JS analogue of Strcasecpy(base + idx, src) — overwrite
// from position idx, case-matching the existing chars (and propagating the last
// existing char's case once base is exhausted). Returns the resulting string.
function strcasecpy_at(base, idx, src) {
    const out = base.split('');
    let dst = idx;
    let exhausted = false;
    for (let k = 0; k < src.length; k++) {
        if (!exhausted && dst >= base.length) exhausted = true;
        const oc = exhausted ? (out[dst - 1] !== undefined ? out[dst - 1] : '')
                             : (out[dst] !== undefined ? out[dst] : '');
        out[dst++] = chrcasecpy(oc, src[k]);
    }
    return out.slice(0, dst).join('');
}

// ── Helper: singplur_lookup (C objnam.c:2706-2777) ──────────────────────────
// Common singularize/pluralize decisions for both makesingular & makeplural.
// Returns null on no match; otherwise the resulting string (possibly the input
// unchanged for "leave as-is", or transformed for one_off / slice / ox / man).
// `endstring` is an index into basestr (== basestr.length here), matching C's
// eos(string) pointer used as `endstring - al`.
function singplur_lookup(basestr, endstring, to_plural, alt_as_is) {
    // Check as_is[] array
    for (const word of as_is) {
        const al = word.length;
        const ptr = endstring - al;
        if (!BSTRCMPI(basestr, ptr, word))
            return basestr;
    }

    // Check alt_as_is[] array if provided
    if (alt_as_is) {
        for (const word of alt_as_is) {
            const al = word.length;
            const ptr = endstring - al;
            if (!BSTRCMPI(basestr, ptr, word))
                return basestr;
        }
    }

    // Leave "craft" as suffix as-is
    const baselen = basestr.length;
    if ((baselen > 5) && (!BSTRCMPI(basestr, endstring - 5, "craft")))
        return basestr;

    // Avoid false hits on "slice" and "mongoose"
    if (strcmpi(basestr, "slice") === 0 || strcmpi(basestr, "mongoose") === 0) {
        if (to_plural)
            return strcasecpy_at(basestr, endstring, "s");
        return basestr;
    }

    // Skip "ox" -> "oxen" unless it's "muskox"
    if (to_plural && baselen > 2 && strcmpi(basestr.substring(endstring - 2), "ox") === 0
        && !(baselen > 5 && strcmpi(basestr.substring(endstring - 6), "muskox") === 0)) {
        return strcasecpy_at(basestr, endstring, "es");
    }

    // "man"/"men" special cases
    if (to_plural) {
        if (baselen > 2 && strcmpi(basestr.substring(endstring - 3), "man") === 0
            && badman(basestr, to_plural)) {
            return strcasecpy_at(basestr, endstring, "s");
        }
    } else {
        if (baselen > 2 && strcmpi(basestr.substring(endstring - 3), "men") === 0
            && badman(basestr, to_plural))
            return basestr;
    }

    // Check one_off[] array
    for (const entry of one_off) {
        const same = to_plural ? entry.plur : entry.sing;
        const al = same.length;
        const ptr = endstring - al;
        if (!BSTRCMPI(basestr, ptr, same))
            return basestr; /* use as-is */

        const other = to_plural ? entry.sing : entry.plur;
        const al2 = other.length;
        const ptr2 = endstring - al2;
        if (!BSTRCMPI(basestr, ptr2, other)) {
            /* one_off[] transformation: Strcasecpy(endstring - al, same) */
            return strcasecpy_at(basestr, ptr2, same);
        }
    }
    return null;
}

// ── just_an (C objnam.c:2106-2141) ────────────────────────────────────────────
export function just_an(outbuf, str) {
    const c0 = lowc(str[0] ?? '\0');
    if (!str[1] || str[1] === ' ') {
        /* single letter; might be used for named fruit or a musical note */
        // C objnam.c:2117: strchr also matches the terminating NUL for an empty name.
        return (c0 === '\0' || strchr("aefhilmnosx", c0)) ? "an " : "a ";
    } else if (!strncmpi(str, "the ", 4)
               /* these probably shouldn't be handled here because doing so
                  impacts inventory when using them for named fruit */
               || !strcmpi(str, "molten lava")
               || !strcmpi(str, "iron bars")
               || !strcmpi(str, "ice")
               ) {
        return ""; /* no article */
    } else {
        /* normal case is "an <vowel>" or "a <consonant>" */
        if ((strchr(vowels, c0) /* some exceptions warranting "a <vowel>" */
             /* 'wun' initial sound */
             && (strncmpi(str, "one", 3) || (str[3] && !strchr("-_ ", str[3])))
             /* long 'u' initial sound */
             && strncmpi(str, "eu", 2) /* "eucalyptus leaf" */
             && strncmpi(str, "uke", 3) && strncmpi(str, "ukulele", 7)
             && strncmpi(str, "unicorn", 7) && strncmpi(str, "uranium", 7)
             && strncmpi(str, "useful", 6)) /* "useful tool" */
            || (c0 === 'x' && !strchr(vowels, lowc(str[1]))))
            return "an ";
        else
            return "a ";
    }
}

// ── an (C objnam.c:2143-2154) ─────────────────────────────────────────────────
// C: prepend the appropriate indefinite article ("a "/"an ") to str, or nothing
// for pnames/"the ..."/uncountables.  Thin wrapper over just_an().
const HAWAIIAN_MOTIFS_XN = [
    'flamingo', 'parrot', 'toucan', 'bird of paradise',
    'sea turtle', 'tropical fish', 'jellyfish', 'giant eel', 'water nymph',
    'plumeria', 'orchid', 'hibiscus flower', 'palm tree',
    'hula dancer', 'sailboat', 'ukulele',
];
export function an(str) {
    if (!str) {
        impossible_sync("Alphabet soup: 'an(%s)'.", str == null ? '<null>' : '""');
        return 'an []';
    }
    return (just_an({}, str) + str).slice(0, 255);
}

// ── An (C objnam.c:2156-2163) ────────────────────────────────────────────────
// C: char *An(const char *str) { char *tmp = an(str); *tmp = highc(*tmp);
//                                return tmp; }
// i.e. an() verbatim with only the FIRST character upcased.  Note the
// consequences C actually has and we must reproduce: An("the wand") is
// "The wand" (an() emits no article for a "the " prefix) and An("Elbereth") is
// "An Elbereth" (an() does not special-case proper names the way the() does).
export function An(str) {
    let tmp = an(str);
    /* C: *tmp = highc(*tmp); */
    if (tmp && tmp.length > 0)
        tmp = highc(tmp[0]) + tmp.substring(1);
    return tmp;
}

// ── docall_xname (C do_name.c:605-633) ────────────────────────────────────────
// The name shown in the "Call a <object>:" prompt: a single, article-prefixed,
// BUC-stripped xname of the object.  Scoped to potions (the only #call path the
export function docall_xname_potion(obj) {
    /* C copies the obj, forces quan=1, clears blessed/cursed (so "[un]holy water"
     * becomes "water"), clears odiluted, then returns an(xname(&otemp)). */
    const otemp = {
        otyp: obj.otyp | 0, oclass: 8 /* POTION_CLASS */, quan: 1,
        blessed: false, cursed: false, odiluted: false,
        dknown: !!obj.dknown, bknown: !!obj.bknown,
    };
    return an(xname_potion(otemp));
}

// ── makeplural (C objnam.c:2833-3020) ─────────────────────────────────────────
// Convert a string to its plural form.
export function makeplural(oldstr) {
    let str = "";
    let excess = null;
    let len, i;

    if (oldstr) {
        while (oldstr[0] === ' ')
            oldstr = oldstr.substring(1);
    }

    if (!oldstr || !oldstr[0]) {
        impossible_sync("plural of null?");
        return "s";
    }

    // Check pronouns (genders[0..2] = male/female/neuter, genders[3] = they/them/their)
    str = "";
    for (i = 0; i <= 2; ++i) {
        if (strcmpi(genders[i].he, oldstr) === 0)
            str = genders[3].he; /* "they" */
        else if (strcmpi(genders[i].him, oldstr) === 0)
            str = genders[3].him; /* "them" */
        else if (strcmpi(genders[i].his, oldstr) === 0)
            str = genders[3].his; /* "their" */

        if (str) {
            if (oldstr[0] === highc(oldstr[0]))
                str = highc(str[0]) + str.substring(1);
            return str;
        }
    }

    str = oldstr;

    // Skip changing "pair of" to "pairs of"
    if (strncmpi(str, "pair of ", 8) === 0)
        return str + "";  /* goto bottom */

    // Look for compound patterns like "foo of bar"
    const spot_idx = singplur_compound(str);
    if (spot_idx !== null) {
        excess = oldstr.substring(spot_idx);
        str = str.substring(0, spot_idx);
    }

    // Find last non-space character
    let spot = str.length - 1;
    while (spot > 0 && str[spot] === ' ')
        spot--;
    str = str.substring(0, spot + 1);
    /* Now spot is the last character of the string */

    len = str.length;

    /* Single letters */
    if (len === 1 || !letter(str[spot])) {
        if (excess)
            return str + "'s" + excess;
        return str + "'s";
    }

    /* dispense with some words which don't need pluralization */
    {
        const already_plural = ["ae", "eaux", "matzot"];
        const looked = singplur_lookup(str, eos(str), true, already_plural);
        if (looked !== null) {
            str = looked;
            return excess ? str + excess : str;
        }

        /* more of same, but not suitable for blanket loop checking */
        if ((len === 2 && strcmpi(str, "ya") === 0)
            || (len >= 3 && strcmpi(str.substring(spot - 2), " ya") === 0))
            return excess ? str + excess : str;
    }

    /* man/men ("Wiped out all cavemen.") */
    if (len >= 3 && strcmpi(str.substring(spot - 2), "man") === 0
        && !badman(str, true)) {
        str = strcasecpy_at(str, spot - 1, "en");
        if (excess)
            return str + excess;
        return str;
    }

    if (lowc(str[spot]) === 'f') {
        const lo_c = lowc(str[spot - 1]);
        if (len >= 3 && strcmpi(str.substring(spot - 2), "erf") === 0) {
            /* avoid "nerf" -> "nerves", "serf" -> "serves" */
            ;  /* fall through to default (append 's') */
        } else if (strchr("lr", lo_c) || strchr(vowels, lo_c)) {
            /* [aeioulr]f to [aeioulr]ves */
            str = strcasecpy_at(str, spot, "ves");
            if (excess)
                return str + excess;
            return str;
        }
    }

    /* ium/ia (mycelia, baluchitheria) */
    if (len >= 3 && strcmpi(str.substring(spot - 2), "ium") === 0) {
        str = strcasecpy_at(str, spot - 2, "ia");
        if (excess)
            return str + excess;
        return str;
    }

    /* algae, larvae, hyphae (another fungus part) */
    if ((len >= 4 && strcmpi(str.substring(spot - 3), "alga") === 0)
        || (len >= 5 && (strcmpi(str.substring(spot - 4), "hypha") === 0
                         || strcmpi(str.substring(spot - 4), "larva") === 0))
        || (len >= 6 && strcmpi(str.substring(spot - 5), "amoeba") === 0)
        || (len >= 8 && strcmpi(str.substring(spot - 7), "vertebra") === 0)) {
        /* a to ae */
        str = strcasecpy_at(str, spot + 1, "e");
        if (excess)
            return str + excess;
        return str;
    }

    /* fungus/fungi, homunculus/homunculi, but buses, lotuses, wumpuses */
    if (len > 3 && strcmpi(str.substring(spot - 1), "us") === 0
        && !((len >= 5 && strcmpi(str.substring(spot - 4), "lotus") === 0)
             || (len >= 6 && strcmpi(str.substring(spot - 5), "wumpus") === 0))) {
        str = strcasecpy_at(str, spot - 1, "i");
        if (excess)
            return str + excess;
        return str;
    }

    /* sis/ses (nemesis) */
    if (len >= 3 && strcmpi(str.substring(spot - 2), "sis") === 0) {
        str = strcasecpy_at(str, spot - 1, "es");
        if (excess)
            return str + excess;
        return str;
    }

    if (len >= 3 && strcmpi(str.substring(spot - 2), "eau") === 0
        && BSTRCMPI(str, spot - 5, "bureau")) {
        str = strcasecpy_at(str, spot + 1, "x");
        if (excess)
            return str + excess;
        return str;
    }

    /* matzoh/matzot, possible food name */
    if (len >= 6 && (strcmpi(str.substring(spot - 5), "matzoh") === 0
                     || strcmpi(str.substring(spot - 5), "matzah") === 0)) {
        str = strcasecpy_at(str, spot - 1, "ot");
        if (excess)
            return str + excess;
        return str;
    }

    if (len >= 5 && (strcmpi(str.substring(spot - 4), "matzo") === 0
                     || strcmpi(str.substring(spot - 4), "matza") === 0)) {
        str = strcasecpy_at(str, spot, "ot");
        if (excess)
            return str + excess;
        return str;
    }

    /* note: ox/oxen, VAX/VAXen, goose/geese */

    const lo_c = lowc(str[spot]);

    if (len >= 5
        && (strcmpi(str.substring(spot - 2), "dex") === 0
            || strcmpi(str.substring(spot - 2), "dix") === 0
            || strcmpi(str.substring(spot - 2), "tex") === 0)
       /* indices would have been ok too, but stick with indexes */
        && (strcmpi(str.substring(spot - 4), "index") !== 0)) {
        str = strcasecpy_at(str, spot - 1, "ices");
        if (excess)
            return str + excess;
        return str;
    }

    /* Ends in z, x, s, ch, sh; add an "es" */
    if (strchr("zxs", lo_c)
        || (len >= 2 && lo_c === 'h' && strchr("cs", lowc(str[spot - 1]))
            && !(len >= 4 && lowc(str[spot - 1]) === 'c' && ch_ksound(str)))
        || (len >= 4 && strcmpi(str.substring(spot - 2), "ato") === 0)
        || (len >= 5 && strcmpi(str.substring(spot - 4), "dingo") === 0)) {
        str = strcasecpy_at(str, spot + 1, "es");
        if (excess)
            return str + excess;
        return str;
    }

    /* Ends in y preceded by consonant (note: also "qu") change to "ies" */
    if (lo_c === 'y' && !strchr(vowels, lowc(str[spot - 1]))) {
        str = strcasecpy_at(str, spot, "ies");
        if (excess)
            return str + excess;
        return str;
    }

    /* Default: append an 's' */
    str = strcasecpy_at(str, spot + 1, "s");

    if (excess)
        return str + excess;
    return str;
}

// ── otense (C objnam.c:2528-2543) ──────────────────────────────────────────
export function otense(otmp, verb) {
    /*
     * verb is given in plural (without trailing s).  Return as input
     * if the result of xname(otmp) would be plural.  Don't bother
     * recomputing xname(otmp) at this time.
     */
    /* C obj.h:421 is_plural(): quan != 1, or the discovered Eyes of the
     * Overworld (artilist ordinal 26; undiscovered_artifact is artifact.c:1131) */
    const plural = (otmp.quan | 0) !== 1
        || ((otmp.oartifact | 0) === 26
            && (game.artidisco || []).includes(26));
    if (!plural)
        return vtense(null, verb);

    return verb;
}

// ── cxname (C objnam.c:1920-1927) ──────────────────────────────────────────
// C:  if (obj->otyp == CORPSE) return corpse_xname(obj, NULL, CXN_NORMAL);
//     return xname(obj);
// Exported so js/mhitm.js (which held a best-effort private copy returning the
// shuffled appearance description) resolves to this one body.
export function cxname(obj) {
    if (obj.otyp === 265) // CORPSE
        return corpse_xname(obj, null, CXN_NORMAL);
    return xname_flags(obj, CXN_NORMAL);
}

// ── aobjnam (C objnam.c:2241-2257) ──────────────────────────────────────────
export function aobjnam(otmp, verb) {
    let bp = cxname(otmp);
    if (otmp.quan !== 1) {
        const prefix = otmp.quan + " ";
        bp = strprepend(bp, prefix);
    }
    if (verb) {
        bp = bp + " " + otense(otmp, verb);
    }
    return bp;
}

// ── Yobjnam2 (C objnam.c:2545-2551) ────────────────────────────────────────
export function Yobjnam2(obj, verb) {
    let s = yobjnam(obj, verb);
    if (s && s.length > 0) {
        s = highc(s[0]) + s.slice(1);
    }
    return s;
}

// ── Tobjnam (C objnam.c:2287-2297) ─────────────────────────────────────────
// C: char *Tobjnam(struct obj *otmp, const char *verb)
//    { char *bp = The(xname(otmp));
//      if (verb) { Strcat(bp, " "); Strcat(bp, otense(otmp, verb)); }
//      return bp; }
// "like aobjnam, but prepend "The", not count, and use xname".
// C's xname(obj) is exactly xname_flags(obj, CXN_NORMAL) (objnam.c:574-578);
// CXN_NORMAL is 0.  Called through xname_flags directly because this port has
// no bare xname() export yet (see js/objnam.js:1713).
export function Tobjnam(otmp, verb) {
    let bp = The(xname_flags(otmp, 0));
    if (verb) {
        bp = bp + " " + otense(otmp, verb);
    }
    return bp;
}

// ── yobjnam (C objnam.c:2260-2274) ─────────────────────────────────────────
export function yobjnam(obj, verb) {
    /* odiluted/opoisoned are C unions aliased onto oeroded/otrapped (game.js
     * objProto accessors), so an unconditional write clobbers live erosion:
     * a +1 enchant on an eroded cloak lost its erosion and AC read 1 too low. */

    let s = aobjnam(obj, verb);
    if (!carried(obj) || !obj_is_pname(obj)
        || obj.oartifact >= 21 /* ART_ORB_OF_DETECTION */) {
        s = (shk_your('', obj) + s).slice(0, 255);
    }
    return s;
}

function carried(obj) {
    return obj.where === 3; /* OBJ_INVENT */
}

// ── fruitname (C objnam.c:413-428) ─────────────────────────────────────────
export function fruitname(juice) {
    const idx = _strstri(game.pl_fruit, " of ");
    let fruit_nam;
    if (idx >= 0)
        fruit_nam = game.pl_fruit.slice(idx + 4);
    else
        fruit_nam = game.pl_fruit;
    return makesingular(fruit_nam) + (juice ? " juice" : "");
}

// ── fruit_from_name (C objnam.c:442-520) ──────────────────────────────────
export function fruit_from_name(fname, exact, highest_fid) {
    let f, tentativef;
    let altfname;
    let k;

    if (highest_fid)
        highest_fid.value = 0;

    /* first try for an exact match */
    for (f = game.ffruit; f; f = f.nextf) {
        if (f.fname === fname)
            return f;
        else if (highest_fid && f.fid > highest_fid.value)
            highest_fid.value = f.fid;
    }

    /* didn't match as-is; try prefix match */
    if (!exact) {
        tentativef = null;
        for (f = game.ffruit; f; f = f.nextf) {
            k = f.fname.length;
            if (fname.startsWith(f.fname)
                && (!fname[k] || fname[k] === ' ')
                && (!tentativef || k > tentativef.fname.length))
                tentativef = f;
        }
        f = tentativef;
    }

    /* if we still don't have a match, try singularizing the target */
    if (!f) {
        altfname = makesingular(fname);
        for (f = game.ffruit; f; f = f.nextf) {
            if (f.fname === altfname)
                break;
        }
        releaseobuf(altfname);
    }

    if (!f && !exact) {
        let fnamebuf, p;
        const fname_k = fname.length;

        tentativef = null;
        for (f = game.ffruit; f; f = f.nextf) {
            k = f.fname.length;
            fnamebuf = fname;
            if (fname_k >= k) {
                let spaceIdx = fnamebuf.indexOf(' ', k);
                if (spaceIdx !== -1) {
                    fnamebuf = fnamebuf.slice(0, spaceIdx);
                    altfname = makesingular(fnamebuf);
                    k = altfname.length;
                    if (f.fname === altfname
                        && (!tentativef || k > tentativef.fname.length))
                        tentativef = f;
                    releaseobuf(altfname);
                }
            }
        }
        f = tentativef;
    }

    return f;
}

// ── Helper: strchr (check if char exists in string) ──────────────────────────
function strchr(str, c) {
    return str.includes(c);
}

// ── qt_pager (C questpgr.c:630-634) ────────────────────────────────────────
export function qt_pager(msgid) {
    return quest_qt_pager(msgid);
}

// ── com_pager (C questpgr.c:636-639) ────────────────────────────────────────
export function com_pager(msgid) {
    return quest_com_pager(msgid);
}

// ── maybereleaseobuf (C objnam.c:166-199) ────────────────────────────────────
export function maybereleaseobuf(obuffer) {
    releaseobuf(obuffer);
    /*
     * An example from 3.6.x where all obufs got clobbered was when a
     * monster used a bullwhip to disarm the hero of a two-handed weapon:
     * "The ogre lord yanks Cleaver from your corpses!"
     |
     | hand = body_part(HAND);
     | if (use_plural)      // switches 'hand' from static buffer to an obuf
     |   hand = makeplural(hand);
      ...
     | release_worn_item(); // triggers full inventory update for perm_invent
      ...
     | pline(..., hand);    // the obuf[] for "hands" was clobbered with the
     |                      //+ partial formatting of an item from invent
     *
     * Another example was from writing a scroll without room in invent to
     * hold it after being split from a stack of blank scrolls:
     * "Oops!  food rations out of your grasp!"
     * hold_another_object() was passed 'the(aobjnam(newscroll, "slip"))'
     * as an argument and that should have yielded
     * "Oops!  The scroll of <foo> slips out of your grasp!"
     * but attempting to add the item to inventory triggered update for
     * perm_invent and the result from 'the(...)' was clobbered by partial
     * formatting of some inventory item.  [It happened in a shop and the
     * shk claimed ownership of the new scroll, but that wasn't relevant.]
     * That got fixed earlier, by delaying update_inventory() during
     * hold_another_object() rather than by avoiding using all the obufs.
     */
}

// ── releaseobuf stub ─────────────────────────────────────────────────────────
function releaseobuf(bufp) {
    /* In JS, strings are GC'd, no buffer management needed. */
}

// ── special_subjs (C objnam.c:2548-2555) ────────────────────────────────────
// Words that look plural but are actually singular
const special_subjs = [
    "erinys", "manes",
    "Cyclops", "Hippocrates", "Pelias", "aklys",
    "amnesia", "detect monsters", "paralysis", "shape changers",
    "nemesis",
];

// ── vtense (C objnam.c:2560-2650) ──────────────────────────────────────────
// Return 3rd person present tense form of verb for given subject.
// Verb is given in plural (without trailing s). Returns as-is if subj is plural.
export function vtense(subj, verb) {
    /* Special case: allow null subj to get the singular 3rd person
       present tense form so we don't duplicate this code elsewhere. */
    if (subj) {
        if (!strncmpi(subj, "a ", 2) || !strncmpi(subj, "an ", 3))
            return singForm(verb);

        let spot_idx = -1;
        for (let sp = 0; (sp = subj.indexOf(' ', sp)) !== -1; sp++) {
            if (!strncmpi(subj.substring(sp), " of ", 4)
                || !strncmpi(subj.substring(sp), " from ", 6)
                || !strncmpi(subj.substring(sp), " called ", 8)
                || !strncmpi(subj.substring(sp), " named ", 7)
                || !strncmpi(subj.substring(sp), " labeled ", 9)) {
                if (sp !== 0)
                    spot_idx = sp - 1;
                break;
            }
        }
        let len = subj.length;
        if (spot_idx === -1)
            spot_idx = len - 1;

        /*
         * plural: anything that ends in 's', but not '*us' or '*ss'.
         * Guess at a few other special cases that makeplural creates.
         */
        if ((lowc(subj[spot_idx]) === 's' && spot_idx !== 0
             && !strchr("us", lowc(subj[spot_idx - 1])))
            || !BSTRNCMPI(subj, spot_idx - 3, "eeth", 4)
            || !BSTRNCMPI(subj, spot_idx - 3, "feet", 4)
            || !BSTRNCMPI(subj, spot_idx - 1, "ia", 2)
            || !BSTRNCMPI(subj, spot_idx - 1, "ae", 2)) {
            /* check for special cases to avoid false matches */
            len = spot_idx + 1;
            for (const spec of special_subjs) {
                const ltmp = spec.length;
                if (len === ltmp && strncmpi(spec, subj, len) === 0)
                    return singForm(verb);
                /* also check for <prefix><space><special_subj>
                   to catch things like "the invisible erinys" */
                if (len > ltmp && subj[spot_idx - ltmp] === ' '
                    && strncmpi(spec, subj.substring(spot_idx - ltmp + 1), ltmp) === 0)
                    return singForm(verb);
            }

            return verb;
        }
        /*
         * 3rd person plural doesn't end in telltale 's';
         * 2nd person singular behaves as if plural.
         */
        if (!strcmpi(subj, "they") || !strcmpi(subj, "you"))
            return verb;
    }

    return singForm(verb);

    function singForm(verb) {
        let buf = verb;
        const len = buf.length;
        const bspot = len - 1;

        if (!strcmpi(buf, "are")) {
            buf = strcasecpy_at(buf, 0, "is");
        } else if (!strcmpi(buf, "have")) {
            buf = strcasecpy_at(buf, len - 2, "s");
        } else if (strchr("zxs", lowc(buf[bspot]))
                   || (len >= 2 && lowc(buf[bspot]) === 'h'
                       && strchr("cs", lowc(buf[bspot - 1])))
                   || (len === 2 && lowc(buf[bspot]) === 'o')) {
            /* Ends in z, x, s, ch, sh; add an "es" */
            buf = strcasecpy_at(buf, len, "es");
        } else if (lowc(buf[bspot]) === 'y' && !strchr(vowels, lowc(buf[bspot - 1]))) {
            /* like "y" case in makeplural */
            buf = strcasecpy_at(buf, len - 1, "ies");
        } else {
            buf = strcasecpy_at(buf, len, "s");
        }

        return buf;
    }
}


export function obj_is_pname(obj) {
    if (!obj.oartifact || !has_oname(obj))
        return false;
    if (!game.program_state.gameover && !game.iflags.override_ID) {
        if (not_fully_identified(obj))
            return false;
    }
    return true;
}

// C: objnam.c:1930-1937 — cxname_singular
export function cxname_singular(obj) {
    if (obj.otyp === 265) // CORPSE
        return corpse_xname(obj, null, 1); // CXN_SINGULAR
    return xname_flags(obj, 1); // CXN_SINGULAR
}

/* C objnam.c:1940-2005 — format an object as a fully identified cause of
 * death.  This deliberately mutates the live object and object-class entry
 * while xname/corpse_xname runs, then restores both.  In particular it omits
 * BUC, erosion-proof, grease, poison, user-assigned names and `called` names;
 * holy/unholy water retains its BUC state.  Artifacts bypass all twiddling and
 * return their canonical bare artifact name. */
export function killer_xname(obj) {
    if (obj.oartifact)
        return bare_artifactname(obj);

    const g = game;
    const otyp = obj.otyp | 0;
    const savedCore = { ...obj };
    const savedKeys = new Set(Object.keys(obj));
    const hadOextra = Object.prototype.hasOwnProperty.call(obj, 'oextra');
    const savedOextra = obj.oextra;
    const hadOname = !!(savedOextra
        && Object.prototype.hasOwnProperty.call(savedOextra, 'oname'));
    const savedOname = hadOname ? savedOextra.oname : undefined;

    const hadKnownTable = Object.prototype.hasOwnProperty.call(g, '_oc_name_known');
    const hadUnameTable = Object.prototype.hasOwnProperty.call(g, '_oc_uname');
    const savedKnownTable = g._oc_name_known;
    const savedUnameTable = g._oc_uname;
    if (!g._oc_name_known) g._oc_name_known = {};
    if (!g._oc_uname) g._oc_uname = {};
    const hadKnownEntry = Object.prototype.hasOwnProperty.call(g._oc_name_known, otyp);
    const hadUnameEntry = Object.prototype.hasOwnProperty.call(g._oc_uname, otyp);
    const savedOcKnown = g._oc_name_known[otyp];
    const savedOcUname = g._oc_uname[otyp];

    let buf;
    try {
        obj.known = obj.dknown = 1;
        obj.bknown = obj.rknown = obj.greased = 0;
        if (otyp !== POT_WATER)
            obj.blessed = obj.cursed = 0;
        else
            obj.bknown = 1;
        obj.opoisoned = 0;
        if (hadOname)
            obj.oextra.oname = null;
        g._oc_name_known[otyp] = 1;
        g._oc_uname[otyp] = null;

        if (otyp === CORPSE)
            buf = corpse_xname(obj, null, CXN_NORMAL);
        else if (otyp === SLIME_MOLD)
            buf = `deadly slime mold${(obj.quan | 0) === 1 ? '' : 's'}`;
        else
            buf = xname(obj);

        if ((obj.quan | 0) === 1
            && _strstri(buf, "'s ") < 0 && _strstri(buf, "s' ") < 0) {
            const definite = obj_is_pname(obj) || the_unique_obj(obj);
            if (definite) {
                const withArticle = the(buf);
                /* the()'s general proper-name heuristics are still partial in
                 * this port.  the_unique_obj is an explicit C instruction to
                 * use the definite article; its non-artifact names (Amulet,
                 * Bell, Candelabrum, Book) are capitalized and otherwise hit
                 * that partial helper's proper-name fallback. */
                buf = (withArticle === buf) ? `the ${buf}` : withArticle;
            } else {
                buf = an(buf);
            }
        }
        return buf;
    } finally {
        if (hadKnownEntry) g._oc_name_known[otyp] = savedOcKnown;
        else delete g._oc_name_known[otyp];
        if (hadUnameEntry) g._oc_uname[otyp] = savedOcUname;
        else delete g._oc_uname[otyp];
        if (!hadKnownTable) delete g._oc_name_known;
        else if (g._oc_name_known !== savedKnownTable) g._oc_name_known = savedKnownTable;
        if (!hadUnameTable) delete g._oc_uname;
        else if (g._oc_uname !== savedUnameTable) g._oc_uname = savedUnameTable;

        for (const key of Object.keys(obj))
            if (!savedKeys.has(key)) delete obj[key];
        Object.assign(obj, savedCore);
        if (hadOextra) {
            obj.oextra = savedOextra;
            if (hadOname) obj.oextra.oname = savedOname;
            else if (obj.oextra) delete obj.oextra.oname;
        }
    }
}

const M2_PNAME = 0x00080000;
function type_is_pname(ptr) { return (ptr.mflags2 & M2_PNAME) !== 0; }

// C: objnam.c:1821-1919 — corpse_xname
export function corpse_xname(otmp, adjective, cxn_flags) {
    let nambuf;
    let omndx = otmp.corpsenm;
    let ignore_quan = (cxn_flags & 1) !== 0,   /* CXN_SINGULAR */
        no_prefix = (cxn_flags & 2) !== 0,     /* CXN_NO_PFX */
        the_prefix = (cxn_flags & 4) !== 0,    /* CXN_PFX_THE */
        any_prefix = (cxn_flags & 8) !== 0,    /* CXN_ARTICLE */
        omit_corpse = (cxn_flags & 16) !== 0,  /* CXN_NOCORPSE */
        possessive = false,
        glob = (otmp.otyp !== 265 && otmp.globby); /* CORPSE=265 */
    let mnam;

    nambuf = "";

    if (glob) {
        mnam = _objName(otmp.otyp); /* "glob of <monster>" */
    } else if (omndx === -1) { /* NON_PM */
        mnam = "thing";
    } else {
        mnam = obj_pmname(otmp);
        let pm = permonstTemplate(omndx);
        if (the_unique_pm(pm) || type_is_pname(pm)) {
            mnam = s_suffix(mnam);
            possessive = true;
            if (type_is_pname(pm))
                no_prefix = true;
            else if (the_unique_pm(pm) && !no_prefix)
                the_prefix = true;
        }
    }
    if (no_prefix)
        the_prefix = any_prefix = false;
    else if (the_prefix)
        any_prefix = false;

    nambuf = "";
    if (the_prefix)
        nambuf += "the ";

    if (!adjective || !adjective[0]) {
        nambuf += mnam;
    } else {
        if (possessive)
            nambuf += mnam + " " + adjective;
        else
            nambuf += adjective + " " + mnam;
        nambuf = mungspaces(nambuf);
        if (digit(adjective[0]))
            any_prefix = false;
    }

    if (glob) {
        ; /* omit_corpse doesn't apply; quantity is always 1 */
    } else if (!omit_corpse) {
        nambuf += " corpse";
        if (otmp.quan > 1 && !ignore_quan) {
            nambuf += "s";
            any_prefix = false;
        }
    }

    if (any_prefix) {
        nambuf = an(nambuf);
    }
    return nambuf;
}

function obj_pmname(otmp) {
    return obj_pmname_real(otmp); // C do_name.c:1321-1360
}

/* ═══════════════════════════════════════════════════════════════════════════
 * xname() / xname_flags() — objnam.c:574-1027
 *
 * THE object-naming root.  Before this landed there was NO live xname() in the
 * port at all: js/do_wear.js:2720 was `throw new Error('not yet ported')`,
 * js/mhitm.js:222 was `return ""`, js/muse.js:411 handled WAND only, and
 * js/objnam.js's own xname_flags() was a five-arm stub that returned the
 * literal string "xname_flags(<otyp>,<flags>)" for every other class.  All four
 * now resolve here.
 *
 * RNG: C's xname_flags() body draws NO rn2/rnd/rne/rnz/d — it is pure string
 * formatting over objects[] and obj fields — with ONE exception, verified by
 * reading every callee: the FOOD_CLASS `typ == TIN && known` arm calls
 * tin_details() (eat.c:1427), which calls tin_variety() (eat.c:1489), which
 * draws `rn2(TTSZ - 1)` when the tin is neither spinach (spe == 1), nor cursed,
 * nor variety-encoded (spe < 0).  js/eat.js already ports that RNG faithfully
 * and this arm calls straight into it, so the draw happens in C order.  Every
 * other arm, and corpse_xname(), are RNG-free.
 * (observe_object/discover_object/find_artifact — the three side-effecting
 * callees in the preamble — are also RNG-free; discover_object's only rn2 is
 * behind `credit_hero`, which xname passes FALSE.)
 * ═════════════════════════════════════════════════════════════════════════ */

/* C flag.h:251 iflags.partly_eaten_hack — "extra flag for xname() used when it's
 * called [by shrink_glob]".  Its ONLY writers in all of C are mkobj.c:1581 and
 * :1583, which bracket the shrink_glob() call that wants "partly eaten" from
 * xname() rather than doname().  The shared glob timer brackets Yname2() with
 * this transient game.iflags value, matching those two C writers. */
function IFLAGS_PARTLY_EATEN_HACK() {
    return !!game.iflags?.partly_eaten_hack;
}

/* C hack.h Role_if(pm) == (gu.urole.mnum == pm).  This port carries the role as
 * an INDEX into role.c's roles[] (game.flags.initrole), not as a PM_ monster
 * number, so the comparison is against the role index — see ROLE_IDX_* above. */
function _Role_if(role_idx) {
    const g = game;
    const ir = (g.flags && g.flags.initrole != null) ? (g.flags.initrole | 0) : -1;
    if (ir >= 0) return ir === role_idx;
    return ((g.urole && g.urole.mnum != null) ? (g.urole.mnum | 0) : -1) === role_idx;
}

/* C youprop.h:103 Blind — (HBlind || EBlind) and not blocked.  Same shape as
 * js/mhitm.js:286 xm_Blind() and js/ball.js:117 Blind(); this port has no single
 * shared property accessor (see the cross-file note in the task report). */
function _Blind() {
    const p = game.u && game.u.uprops ? game.u.uprops[BLINDED] : null;
    if (!p) return false;
    return !!(((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0));
}

/* C o_init.c:441-452 observe_object(obj) — imported from js/o_init.js at the
 * head of this file.  The private copy that used to sit here tested
 * `oindx >= 1` under the comment "C: FIRST_OBJECT == 1", and its private
 * _Hallucination() read (HALLUC.intrinsic || HALLUC.extrinsic) && !blocked
 * instead of youprop.h:116-120's HHallucination && !Halluc_resistance.  Both
 * are fixed in the one surviving body. */

/* C objnam.c:1783-1818 not_fully_identified(otmp).  Its canonical home is
 * objnam.c, i.e. THIS file — obj_is_pname() above (js/objnam.js:2582) called it
 * without it being defined or imported anywhere in this module, so obj_is_pname()
 * threw a ReferenceError on any artifact-with-a-name that was not fully known.
 * That path was dead only because nothing called obj_is_pname(); xname_flags()
 * below does, so it had to be closed.  js/read.js:2241 holds a partial private
 * copy (it stops after the four "fundamental ID hallmarks"). */
export function not_fully_identified(otmp) {
    /* C: gold doesn't have any interesting attributes [yet?] */
    if ((otmp.oclass | 0) === COIN_CLASS)
        return false;
    const otyp = otmp.otyp | 0;
    const nn = !!(game._oc_name_known && game._oc_name_known[otyp]);
    /* check fundamental ID hallmarks first */
    if (!otmp.known || !otmp.dknown || !otmp.bknown || !nn)
        return true;
    /* C: (!cknown && (Is_container || STATUE)) || (!lknown && Is_box) */
    if ((!otmp.cknown && (Is_container_otyp(otyp) || otyp === STATUE))
        || (!otmp.lknown && Is_box_otyp(otyp)))
        return true;
    /* C invent.c: oartifact && undiscovered_artifact(oartifact) (artifact.c:1131);
     * game.artidisco is the discovery list (js/cmd.js discover_artifact). */
    if (otmp.oartifact && !(game.artidisco || []).includes(otmp.oartifact | 0))
        return true;
    if ((otmp.rknown | 0)
        || ((otmp.oclass | 0) !== ARMOR_CLASS && (otmp.oclass | 0) !== WEAPON_CLASS
            && !_is_weptool(otmp)
            && (otmp.oclass | 0) !== BALL_CLASS))
        return false;
    // C objnam.c:1819-1820: erosion-proofing must be known for vulnerable objects.
    return _is_damageable(otmp);
}
/* C obj.h:337  #define Is_container(o) ((o)->otyp >= LARGE_BOX \
 *                                   && (o)->otyp <= BAG_OF_TRICKS)
 * C obj.h:338  #define Is_box(o) ((o)->otyp == LARGE_BOX || (o)->otyp == CHEST)
 *
 * The container run is LARGE_BOX(214) CHEST(215) ICE_BOX(216) SACK(217)
 * OILSKIN_SACK(218) BAG_OF_HOLDING(219) BAG_OF_TRICKS(220) — every otyp
 * resolved by NAME through js/oc_name_data.js OC_NAME, which is the compiled
 * 5.0 objects.h dump.  (The comment this replaces named the SAME range 214-220
 * but mapped it to the WRONG objects — "LARGE_BOX(215)/CHEST(216)/ICE_BOX(214)"
 * — and Is_box was written from that mapping, so it tested CHEST||ICE_BOX where
 * C means LARGE_BOX||CHEST.  Effect: a large box never rendered its
 * locked/unlocked/broken/trapped prefix and an ice box wrongly did.)
 *
 * LARGE_BOX / CHEST / BAG_OF_TRICKS_OTYP are already declared at the top of
 * this file with the right values, so both bodies read them by name. */
function Is_container_otyp(otyp) {
    return (otyp >= LARGE_BOX && otyp <= BAG_OF_TRICKS_OTYP);
}
function Is_box_otyp(otyp) {
    return (otyp === LARGE_BOX || otyp === CHEST);
}

/* C objnam.c:5419-5431 Japanese_item_name(i, ordinaryname) — the Samurai sees
 * Japanese names for a subset of items (objnam.c:105-119 Japanese_items[]).
 * Returns null when the otyp has no Japanese name, so the caller keeps
 * `ordinaryname`.  js/cmd.js:5312 carries a partial copy of this table (5 of
 * the 13 rows) for its inventory-line shim. */
const _JAPANESE_ITEMS = {
    [SHORT_SWORD]: 'wakizashi',
    [BROADSWORD]: 'ninja-to',
    [FLAIL]: 'nunchaku',
    [GLAIVE]: 'naginata',
    [LOCK_PICK]: 'osaku',
    [WOODEN_HARP]: 'koto',
    [MAGIC_HARP]: 'magic koto',
    [KNIFE]: 'shito',
    [PLATE_MAIL]: 'tanko',
    [HELMET]: 'kabuto',
    [LEATHER_GLOVES]: 'yugake',
    [FOOD_RATION]: 'gunyoki',
    /* POT_BOOZE — objects.h "booze" is otyp 317 (js/potion.js:1147 agrees;
     * js/mklev.js:1575's `POT_BOOZE = 318` is off by one, see the CROSSFILE
     * patch).  Written as a literal so this file does not add a fourth,
     * disagreeing declaration site for the name. */
    317: 'sake',
};
export function Japanese_item_name(i) {
    const n = _JAPANESE_ITEMS[i | 0];
    return n != null ? n : null;
}

/* C obj.h:264-267 is_poisonable(otmp) — a WEAPON_CLASS object whose oc_skill is
 * in the thrown-missile window [-P_SHURIKEN, -P_BOW].  (permapoisoned() covers
 * only monster-spit venom, which is VENOM_CLASS and so never reaches the
 * WEAPON_CLASS arm's test.) */
export function is_poisonable(otmp) {
    if ((otmp.oclass | 0) === WEAPON_CLASS) {
        const sk = MKOBJ_OC_SKILL[otmp.otyp | 0] | 0;
        if (sk >= -P_SHURIKEN && sk <= -P_BOW)
            return true;
    }
    return permapoisoned(otmp);
}

/* C artifact.c:2837 permapoisoned(obj) — currently only Grimtooth
 * (artilist order: NONARTIFACT, EXCALIBUR, STORMBRINGER, MJOLLNIR, CLEAVER,
 * GRIMTOOTH => 5). */
export function permapoisoned(obj) {
    return !!obj && (obj.oartifact | 0) === 5;
}

/* C obj.h:256 is_wet_towel(o) — ((o)->otyp == TOWEL && (o)->spe > 0) */
function is_wet_towel(o) {
    return (o.otyp | 0) === TOWEL && (o.spe | 0) > 0;
}

/* C objnam.c:97-103 GemStone(typ) — gems/rocks that get " stone" appended. */
function GemStone(typ) {
    if (typ === FLINT)
        return true;
    return (MKOBJ_OC_MATERIAL[typ] | 0) === GEMSTONE
        && typ !== DILITHIUM_CRYSTAL && typ !== RUBY && typ !== DIAMOND
        && typ !== SAPPHIRE && typ !== BLACK_OPAL && typ !== EMERALD
        && typ !== OPAL;
}

/* C objnam.c:349-357 fruit_from_indx(indx) — the named-fruit record for a
 * slime mold's obj->spe. */
function fruit_from_indx(indx) {
    for (let f = game.ffruit; f; f = f.nextf)
        if ((f.fid | 0) === (indx | 0))
            return f;
    return null;
}

/* xname uses the portion of the buffer after PREFIX (objnam.c:597). */
function _xcalled(buf, pfx, sfx) {
    return xcalled(buf, 256 - 80, pfx, sfx);
}

// C objnam.c:558-571; PREFIX is 80 and BUFSZ is 256.
function xcalled(buf, siz, pfx, sfx) {
    const bufsiz = siz - 1 - buf.length;
    const pfxlen = pfx.length + ' called '.length;
    if (pfxlen > bufsiz)
        throw new Error(`xcalled: not enough room for prefix (${pfxlen} > ${bufsiz})`);
    return `${buf}${pfx} called ${sfx.slice(0, bufsiz - pfxlen)}`;
}

/* C objnam.c:586-641 — the variable setup xname_flags() does before its class
 * switch, plus (when `side_effects` is set) the two mutations C makes in
 * between: observe_object() (:627-628) and the Cleric bknown poke (:629-630).
 *
 * Split out so the per-class entry points below (xname_scroll, xname_armor, …)
 * can share one body with xname_flags() while deliberately NOT triggering those
 * mutations: their callers are the distant_name()-shaped paths (js/dogmove.js
 * :1101-1180 applies the C-correct observation itself and explicitly must not
 * have xname() set dknown for a far-away object; js/pickup_container.js:265
 * likewise), which is exactly the `gd.distantname` guard C uses at :627. */
function _xn_ctx(obj, cxn_flags, side_effects) {
    const typ = obj.otyp | 0;
    const c = {
        typ,
        omndx: (obj.corpsenm != null) ? (obj.corpsenm | 0) : NON_PM,
        nn: !!(game._oc_name_known && game._oc_name_known[typ]),
        actualn: _objName(typ),
        dn: getObjDescr(typ),
        un: (game._oc_uname && game._oc_uname[typ]) || null,
        pluralize: (clong(obj.quan) !== 1n) && !((cxn_flags | 0) & CXN_SINGULAR),
        known: false, dknown: false, bknown: false,
    };
    /* C:605-609 */
    if (_Role_if(ROLE_IDX_SAMURAI)) {
        const j = Japanese_item_name(typ);
        if (j != null)
            c.actualn = j;
        if (typ === WOODEN_HARP || typ === MAGIC_HARP)
            c.dn = 'koto';
    }
    /* C:610-613 — generic items don't have an actual-name */
    if (!c.actualn)
        c.actualn = (typ > 0 && typ < MAXOCLASSES) ? 'generic' : 'object?';
    /* C:616-617 — this must come after possibly overriding 'actualn' */
    if (!c.dn)
        c.dn = c.actualn;

    if (!c.nn && OC_USES_KNOWN[typ] && game._oc_unique?.[typ]) obj.known = 0; // C:625-626

    if (side_effects) {
        /* C:627-628 — `if (!Blind && !gd.distantname) observe_object(obj);`
         * gd.distantname IS tracked now (distant_name() above bumps it around
         * the formatting call whenever the object is not nearby-and-visible);
         * before that it was permanently 0, so a name formatted for a distant
         * object still discovered its type. */
        if (!_Blind() && !gd_distantname)
            observe_object(obj);
        /* C:629-630 — avoid set_bknown() to bypass update_inventory() */
        if (_Role_if(ROLE_IDX_PRIEST))
            obj.bknown = 1;
    }

    /* C:632-641 — read the per-object flags AFTER those mutations. */
    if (game.iflags && game.iflags.override_ID) {
        c.known = c.dknown = c.bknown = true;
        c.nn = true;
    } else {
        c.known = !!obj.known;
        c.dknown = !!obj.dknown;
        c.bknown = !!obj.bknown;
    }
    return c;
}

/* C objnam.c:671-934 — THE per-oclass switch, and the single body of every
 * xname arm in this port.  Returns the class name only: C's pluralize,
 * end-of-game text, " named <oname>" and leading-"the "-strip steps all happen
 * AFTER the switch and live in xname_flags() below. */
function _xname_arm(obj, c) {
    const typ = c.typ;
    let buf = '';
    switch (obj.oclass | 0) {
    case AMULET_CLASS:
        if (!c.dknown)
            buf = 'amulet';
        else if (typ === AMULET_OF_YENDOR || typ === FAKE_AMULET_OF_YENDOR)
            /* each must be identified individually */
            buf = c.known ? c.actualn : c.dn;
        else if (c.nn)
            buf = c.actualn;
        else if (c.un)
            buf = _xcalled('', 'amulet', c.un);
        else
            buf = `${c.dn} amulet`;
        break;
    case WEAPON_CLASS:
        if (is_poisonable(obj) && otrapped_of(obj))
            buf = 'poisoned ';
        /* FALLTHROUGH — C objnam.c:690-692 */
    case VENOM_CLASS:
    case TOOL_CLASS:
        /* note: lenses or towel prefix would overwrite poisoned weapon prefix
           if both were simultaneously possible, but they aren't (C:695-696) —
           transcribed as C wrote it: Strcpy, not Strcat. */
        if (typ === LENSES)
            buf = 'pair of ';
        else if (is_wet_towel(obj))
            buf = ((obj.spe | 0) < 3) ? 'moist ' : 'wet ';

        if (!c.dknown)
            buf += c.dn;
        else if (c.nn)
            buf += c.actualn;
        else if (c.un)
            buf = _xcalled(buf, c.dn, c.un);
        else
            buf += c.dn;

        if (typ === FIGURINE && c.omndx !== NON_PM) {
            const pm_name = obj_pmname(obj);
            buf += ` of ${just_an({}, pm_name)}${pm_name}`;
        } else if (is_wet_towel(obj)) {
            if (wizard())
                buf += ` (${obj.spe | 0})`;
        }
        break;
    case ARMOR_CLASS:
        /* depends on order of the dragon scales objects */
        if (typ >= GRAY_DRAGON_SCALES && typ <= YELLOW_DRAGON_SCALES) {
            buf = `set of ${c.actualn}`;
            break;
        } else if (_is_boots_otyp(typ) || _is_gloves_otyp(typ)) {
            buf = 'pair of ';
            /* FALLTHRU */
        } else if (_is_shield_otyp(typ) && !c.dknown) {
            if (typ >= ELVEN_SHIELD_OTYP && typ <= ORCISH_SHIELD_OTYP) {
                buf = 'shield';
                break;
            } else if (typ === SHIELD_OF_REFLECTION_OTYP) {
                buf = 'smooth shield';
                break;
            }
        }
        if (c.nn)
            buf += c.actualn;
        else if (c.un)
            buf = _xcalled(buf, armor_simple_name(obj), c.un);
        else
            buf += c.dn;
        break;
    case FOOD_CLASS:
        /* we could include partly-eaten-hack on fruit but don't need to */
        if (typ === SLIME_MOLD) {
            const f = fruit_from_indx(obj.spe | 0);
            if (!f) {
                impossible('Bad fruit #%d?', obj.spe);
                buf = 'fruit';
            } else {
                buf = f.fname;
                if (c.pluralize) {
                    /* ick: already pluralized fruit names are allowed */
                    buf = makeplural(makesingular(buf));
                    c.pluralize = false;
                }
            }
            break;
        }
        if (IFLAGS_PARTLY_EATEN_HACK() && obj.oeaten)
            buf += 'partly eaten ';
        if (obj.globby) { /* 3.7 added "medium" to replace no-prefix */
            const owt = obj.owt | 0;
            buf += `${(owt <= 100) ? 'small'
                      : (owt <= 300) ? 'medium'
                        : (owt <= 500) ? 'large'
                          : 'very large'} ${c.actualn}`;
            break;
        }
        buf += c.actualn;
        /* THE ONE RNG-BEARING ARM (see the header note): tin_details ->
         * tin_variety -> rn2(TTSZ - 1) for a non-cursed tin with spe >= 0. */
        if (typ === TIN && c.known)
            buf = tin_details(obj, c.omndx, buf);
        break;
    case COIN_CLASS:
    case CHAIN_CLASS:
        buf = c.actualn;
        break;
    case ROCK_CLASS:
        if (typ === STATUE && c.omndx !== NON_PM) {
            const statue_pmname = obj_pmname(obj);
            const pm = permonstTemplate(c.omndx);
            buf = `${(_Role_if(ROLE_IDX_ARCHEOLOGIST)
                      && ((obj.spe | 0) & CORPSTAT_HISTORIC) !== 0) ? 'historic ' : ''}`
                + `${c.actualn} of `
                + `${type_is_pname(pm) ? ''
                     : the_unique_pm(pm) ? 'the '
                       : just_an({}, statue_pmname)}${statue_pmname}`;
        } else if (typ === BOULDER && (obj.next_boulder | 0) === 1) {
            /* sometimes caller wants "next boulder" rather than just "boulder"
               (when pushing against a pile of more than one) */
            buf = `next ${c.actualn}`;
            /* once "next boulder" occurs, subsequent messages use plain form */
            obj.next_boulder = 0;
        } else {
            buf = c.actualn; /* "boulder" or "statue" */
        }
        break;
    case BALL_CLASS:
        buf = `${((obj.owt | 0) > HEAVY_IRON_BALL_OC_WEIGHT) ? 'very ' : ''}heavy iron ball`;
        break;
    case POTION_CLASS:
        if (c.dknown && obj.odiluted)
            buf = 'diluted ';
        if (c.nn || c.un || !c.dknown) {
            buf += 'potion';
            if (!c.dknown)
                break;
            if (c.nn) {
                buf += ' of ';
                if (typ === POT_WATER && c.bknown
                    && (obj.blessed || obj.cursed)) {
                    buf += obj.blessed ? 'holy ' : 'unholy ';
                }
                buf += c.actualn;
            } else {
                buf = _xcalled(buf, '', c.un);
            }
        } else {
            buf += `${c.dn} potion`;
        }
        break;
    case SCROLL_CLASS:
        buf = 'scroll';
        if (!c.dknown)
            break;
        if (c.nn) {
            buf += ` of ${c.actualn}`;
        } else if (c.un) {
            buf = _xcalled(buf, '', c.un);
        } else if (_oc_magic_scroll(typ)) {
            buf += ` labeled ${c.dn}`;
        } else {
            buf = `${c.dn} scroll`;
        }
        break;
    case WAND_CLASS:
        if (!c.dknown)
            buf = 'wand';
        else if (c.nn)
            buf = `wand of ${c.actualn}`;
        else if (c.un)
            buf = _xcalled('', 'wand', c.un);
        else
            buf = `${c.dn} wand`;
        break;
    case SPBOOK_CLASS:
        if (typ === SPE_NOVEL) { /* 3.6 tribute */
            if (!c.dknown)
                buf = 'book';
            else if (c.nn)
                buf = c.actualn;
            else if (c.un)
                buf = _xcalled('', 'novel', c.un);
            else
                buf = `${c.dn} book`;
            break;
            /* end of tribute */
        } else if (!c.dknown) {
            buf = 'spellbook';
        } else if (c.nn) {
            if (typ !== SPE_BOOK_OF_THE_DEAD)
                buf = 'spellbook of ';
            buf += c.actualn;
        } else if (c.un) {
            buf = _xcalled('', 'spellbook', c.un);
        } else {
            buf = `${c.dn} spellbook`;
        }
        break;
    case RING_CLASS:
        if (!c.dknown)
            buf = 'ring';
        else if (c.nn)
            buf = `ring of ${c.actualn}`;
        else if (c.un)
            buf = _xcalled('', 'ring', c.un);
        else
            buf = `${c.dn} ring`;
        break;
    case GEM_CLASS: {
        /* KNOWN GAP (port-wide, not local to this arm) — `nn` here is
         * game._oc_name_known[typ], which this port only ever SETS from
         * discover_object() (js/o_init.js:289).  C additionally bakes
         * oc_name_known = 1 into objects.h for every no-description object (the
         * BITS() `nmkn` column: boulder, statue, iron chain, gold piece, ring
         * mail, and the gray stones luckstone/loadstone/touchstone/flint plus
         * rock).  Every OTHER arm is insensitive to that, because for a NoDes
         * object `dn` falls back to `actualn` (:616-617) and the nn and !nn
         * branches then produce the same string — but THIS arm appends the
         * " stone"/" gem" class word on the !nn branch, so an undiscovered
         * NoDes gem/stone renders "rock stone" / "luckstone stone" where C
         * renders "rock" / "luckstone".  Closing it needs the objects.h nmkn
         * column as a data table (js/mkobj_data.js's job, not this file's).
         * C draws NO RNG on either branch. */
        const rock = ((MKOBJ_OC_MATERIAL[typ] | 0) === MINERAL) ? 'stone' : 'gem';
        if (!c.dknown) {
            buf = rock;
        } else if (!c.nn) {
            if (c.un)
                buf = _xcalled('', rock, c.un);
            else
                buf = `${c.dn} ${rock}`;
        } else {
            buf = c.actualn;
            if (GemStone(typ))
                buf += ' stone';
        }
        break;
    } /* gem */
    default:
        buf = `glorkum ${obj.oclass | 0} ${typ} ${obj.spe | 0}`;
        impossible_sync('xname_flags: %s', buf);
        break;
    } /* switch */
    return buf;
}

function _oc_magic_scroll(typ) {
    const i = typ | 0;
    return (i >= 0 && i < MKOBJ_OC_MAGIC.length) && (MKOBJ_OC_MAGIC[i] | 0) !== 0;
}

/* C objnam.c:574-578 — char *xname(struct obj *obj) */
export function xname(obj) {
    return xname_flags(obj, CXN_NORMAL);
}

/* C objnam.c:580-1027 — staticfn char *xname_flags(struct obj *, unsigned) */
export function xname_flags(obj, cxn_flags) {
    return _xname_flags_body(obj, cxn_flags, /* side_effects = */ true);
}

/* C decl.c `gd.distantname` — a COUNTER (distant_name() does ++/--, and
 * artifact.c/mon.c can nest calls), not a boolean.  Its only reader is
 * xname_flags()'s `if (!Blind && !gd.distantname) observe_object(obj)` at
 * objnam.c:627.  It was never tracked in this port (js/read.js:184,
 * js/cmd.js:17405 and _xname_flags_body's own comment all said so), which
 * meant every formatting call made through distant_name() would have marked
 * the object type discovered — the exact side effect C added the flag to
 * suppress. */
let gd_distantname = 0;
// C invent.c:2580: reroll inventory formatting suppresses discovery.
export async function with_distant_name(fn) {
    ++gd_distantname;
    try { return await fn(); } finally { --gd_distantname; }
}
export function in_distant_name() { return gd_distantname > 0; }

export async function distant_name(obj, func) {
    /* C:370-371 — r = (u.xray_range > 2) ? u.xray_range : 2;
     *             neardist = (r * r) * 2 - r    [r == 2 -> 6] */
    const r = ((game.u?.xray_range | 0) > 2) ? (game.u.xray_range | 0) : 2;
    const neardist = (r * r) * 2 - r;

    /* C:384-386 — zero o_id during final disclosure so xname() omits the
     * T-shirt / candy-wrapper / Hawaiian-motif text.  `program_state.gameover`
     * controls this suppression; restore the original ID below. */
    const save_oid = obj.o_id;
    if (game.program_state?.gameover) obj.o_id = 0;

    let str;
    let ox = 0, oy = 0;
    let located = false;
    /* C zap.c:654 get_obj_location(obj, &ox, &oy, 0) — locflags 0, so neither
     * BURIED_TOO nor CONTAINED_TOO; OBJ_FREE falls out of the switch. */
    switch (obj.where | 0) {
    case OBJ_INVENT_ON:
        ox = game.u?.ux | 0; oy = game.u?.uy | 0; located = true;
        break;
    case OBJ_FLOOR_ON:
        ox = obj.ox | 0; oy = obj.oy | 0; located = true;
        break;
    case OBJ_MINVENT_ON:
        if (obj.ocarry && (obj.ocarry.mx | 0)) {
            ox = obj.ocarry.mx | 0; oy = obj.ocarry.my | 0; located = true;
        }
        break;
    default:
        break;
    }

    if (located && cansee_on(ox, oy)
        && (obj.oartifact || distu_on(ox, oy) <= neardist)) {
        /* C:389-393 — treat as seen up close; func's own dknown/observe_object
         * side effects are wanted here. */
        str = (await func(obj));
    } else {
        /* C:401-403 */
        ++gd_distantname;
        try {
            str = (await func(obj));
        } finally {
            --gd_distantname;
        }
    }

    obj.o_id = save_oid; /* C:406 */
    return str;
}
/* C hack.h distu(x,y) == dist2(x, y, u.ux, u.uy) */
function distu_on(x, y) {
    const dx = (x | 0) - (game.u?.ux | 0), dy = (y | 0) - (game.u?.uy | 0);
    return dx * dx + dy * dy;
}
const OBJ_FLOOR_ON = 1, OBJ_INVENT_ON = 3, OBJ_MINVENT_ON = 4;

/* C objnam.c:1089-1103 — char *mshot_xname(struct obj *obj)
 *   "xname() output augmented for multishot missile feedback"
 * While a volley of N > 1 identical missiles is in flight (gm.m_shot), each
 * one is named "the Nth arrow"; the caller passes the result to an() or The(),
 * both of which handle the embedded "the " prefix.  Off a volley it is plain
 * xname().  Its home is objnam.c, so it lives here rather than as a private
 * copy in each of thitu()'s and m_throw()'s files. */
export function mshot_xname(obj) {
    const gm = game.gm || {};
    const onm = xname(obj);
    if (gm.m_shot && (gm.m_shot.n | 0) > 1
        && (gm.m_shot.o | 0) === (obj.otyp | 0))
        return strprepend(onm, `the ${gm.m_shot.i}${ordin(gm.m_shot.i | 0)} `);
    return onm;
}

/* C objnam.c:2091-2108 — char *singular(struct obj *otmp, char *(*func)(OBJ_P))
 * Format with quan temporarily forced to 1, then restore it. */
export async function singular(otmp, func) {
    // C objnam.c:2096-2098: xname alone omits a corpse's monster type.
    if (otmp.otyp === CORPSE && func === xname)
        func = cxname;
    const savequan = otmp.quan;
    otmp.quan = 1;
    const nam = await func(otmp);
    otmp.quan = savequan;
    return nam;
}

/* ── doname (objnam.c:1223-1751) ─────────────────────────────────────────────
 * THE object formatter: xname() plus article, count, BUC word, erosion words,
 * enchantment, charge/candle/lit suffixes and worn-status suffixes.
 *
 * This is the real one.  Before it existed js/ carried at least six partial
 * namers standing in for it — js/cmd.js's _wt_doname / _prinv_line /
 * _doinv_format_item, js/do_wear.js's ringDonameBody / armor off_msg body,
 * js/pickup_container.js's _item_doname, plus a `doname()` in js/eat.js that
 * returns the literal string "thing" — each with its own hand-maintained otyp
 * name table and its own `object#<otyp>` fallback.  Callers are being moved
 * onto this body one at a time (see the commit that introduced it); do not
 * add a seventh.
 *
 * NAMED GAPS, each an arm C has and this body does not.  None of them draws
 * RNG in C, and each is guarded so it degrades to "suffix absent" rather than
 * to a wrong suffix:
 *   - the `charges` arm (C:1479-1487, " (recharged:spe)") needs
 *     objects[otyp].oc_charged, which no generated table in js/ carries.
 *     Modelled for WAND_CLASS (every wand is CHARGED in objects.h) and for the
 *     charged ring run 173..178 (js/read.js:77-80); TOOL_CLASS's `goto charges`
 *     is skipped.
 *   - count_contents (C:1367) — js/shk.js:562 count_contents is a throw-stub,
 *     so " containing N items" is not appended.
 *   - the leash "(attached to <mon>)" arm (C:1428) needs find_mid.
 *   - the shop-pricing tail (C:1648-1685) and the wizweight/wizmgender debug
 *     suffixes (C:1690-1704, C:1613-1624).
 *   - the warning-artifact glow inside the weapon parentheses (C:1599-1603).
 *   - the wizmgender debug suffix (C:1555-1559).
 *   - the artifact-glow / arti-light insertions inside the worn-weapon and
 *     worn-armor parentheses (C:1602-1610).
 */
export async function doname(obj) {
    return await doname_base(obj, 0);
}
/* C objnam.c:1760-1782 — the flag-taking variants. */
export const DONAME_WITH_PRICE = 0x1;
export const DONAME_VAGUE_QUAN = 0x2;
export const DONAME_FOR_MENU = 0x4;
export async function doname_vague_quan(obj) {
    return await doname_base(obj, DONAME_VAGUE_QUAN);
}
/* C objnam.c:1760 — include shop price and remembered quote suffixes. */
export async function doname_with_price(obj) {
    return await doname_base(obj, DONAME_WITH_PRICE);
}

/* C obj.h:208/249 is_weptool(o) — TOOL_CLASS && oc_skill != P_NONE. */
function _is_weptool(obj) {
    return (obj.oclass | 0) === TOOL_CLASS
        && (MKOBJ_OC_SKILL[obj.otyp | 0] | 0) !== 0;
}
const _DONAME_BIMANUAL = new Set([45, 55, 57, 59, 60, 61, 62, 63, 64, 65, 66,
                                  67, 68, 69, 70, 71, 79, 261]);
function _bimanual(otmp) {
    const oc = otmp.oclass | 0;
    return (oc === WEAPON_CLASS || oc === TOOL_CLASS)
        && _DONAME_BIMANUAL.has(otmp.otyp | 0);
}
/* objclass.h enum obj_material_types.  MKOBJ_OC_MATERIAL carries the C ids
 * (its own table runs up to MINERAL=21), so these must be the C ids too. */
const _MAT_LIQUID = 1, _MAT_WOOD = 8, _MAT_IRON = 11, _MAT_COPPER = 13,
      _MAT_GLASS = 19, _MAT_PLASTIC = 18, _MAT_DRAGON_HIDE = 10;
/* prop.h:15 FIRE_RES = 1.  WAN_FIRE: OC_NAME[430] is the WAND_CLASS "fire"
 * (the SCROLL of fire is otyp 339 and is NOT what mkobj.c means here). */
const FIRE_RES_OBJNAM = 1, WAN_FIRE_OTYP = 430;
function _mat(otyp) { return MKOBJ_OC_MATERIAL[otyp] | 0; }
function _is_rustprone(o) { return _mat(o.otyp | 0) === _MAT_IRON; }
function _is_corrodeable(o) {
    const m = _mat(o.otyp | 0);
    return m === _MAT_COPPER || m === _MAT_IRON;
}
function _is_crackable(o) {
    return _mat(o.otyp | 0) === _MAT_GLASS && (o.oclass | 0) === ARMOR_CLASS;
}
function _is_flammable(o) {
    const t = o.otyp | 0;
    if (_Is_candle(t))
        return false;
    if ((MKOBJ_OC_OPROP[t] | 0) === FIRE_RES_OBJNAM || t === WAN_FIRE_OTYP)
        return false;
    const m = _mat(t);
    return (m <= _MAT_WOOD && m !== _MAT_LIQUID) || m === _MAT_PLASTIC;
}
function _is_rottable(o) {
    const m = _mat(o.otyp | 0);
    return (m <= _MAT_WOOD && m !== _MAT_LIQUID) || m === _MAT_DRAGON_HIDE;
}
function _is_damageable(o) {
    return _is_rustprone(o) || _is_flammable(o) || _is_rottable(o)
        || _is_corrodeable(o) || _is_crackable(o);
}
/* C objnam.c:1195-1211 erosion_matters(obj) — the class filter in front of every
 * erosion write.  js/mklev.js:1089 already exports this exact body; it is
 * re-stated here rather than imported because js/objnam.js and js/mklev.js are
 * already a circular import pair and this file keeps its own copies of the five
 * is_* predicates directly above.  is_weptool (obj.h) is
 * `oclass == TOOL_CLASS && objects[otyp].oc_skill != P_NONE`. */
const CRYSKNIFE_OTYP = 43;
function _erosion_matters(o) {
    const oc = o.oclass | 0;
    if (oc === TOOL_CLASS)
        return (MKOBJ_OC_SKILL[o.otyp | 0] | 0) !== 0; /* P_NONE == 0 */
    return oc === WEAPON_CLASS || oc === ARMOR_CLASS
        || oc === BALL_CLASS || oc === CHAIN_CLASS;
}
/* C objnam.c:1143-1191 add_erosion_words(obj, prefix) — returns the words
 * instead of appending in place (JS strings are immutable). */
function add_erosion_words(obj) {
    const CRYSKNIFE = 43;
    const iscrys = (obj.otyp | 0) === CRYSKNIFE;
    const rknown = (game.iflags && game.iflags.override_ID)
        ? true : !!(obj.rknown | 0);
    if (!_is_damageable(obj) && !iscrys)
        return '';
    let s = '';
    const er = obj.oeroded | 0, er2 = obj.oeroded2 | 0;
    if (er && !iscrys) {
        if (er === 2) s += 'very ';
        else if (er === 3) s += 'thoroughly ';
        s += _is_rustprone(obj) ? 'rusty '
           : _is_crackable(obj) ? 'cracked '
           : 'burnt ';
    }
    if (er2 && !iscrys) {
        if (er2 === 2) s += 'very ';
        else if (er2 === 3) s += 'thoroughly ';
        s += _is_corrodeable(obj) ? 'corroded ' : 'rotted ';
    }
    if (rknown && (obj.oerodeproof | 0))
        s += iscrys ? 'fixed '
           : _is_rustprone(obj) ? 'rustproof '
           : _is_corrodeable(obj) ? 'corrodeproof '
           : _is_flammable(obj) ? 'fireproof '
           : _is_crackable(obj) ? 'tempered '
           : _is_rottable(obj) ? 'rotproof '
           : '';
    return s;
}
/* objects.h oc_charged, for the arms this body models — see the GAP note on
 * doname().  WAND_CLASS is CHARGED throughout; the charged rings are the
 * adornment..protection run (js/read.js:77-80, from u_init.js/objects.h). */
function _oc_charged(obj) {
    const otyp = obj.otyp | 0;
    return !!(OC_CHARGED[otyp] | 0);
}
/* C hacklib.c sitoa()-style "%+d " */
function _plusd(n) { return `${(n | 0) >= 0 ? '+' : ''}${n | 0} `; }
/* C hacklib.c plur(n) — "" for 1, "s" otherwise. */
function _plur(n) { return ((n | 0) === 1) ? '' : 's'; }

/* C objnam.c:1223 — staticfn char *doname_base(struct obj *, unsigned) */
async function doname_base(obj, doname_flags) {
    const g = game;
    const vague_quan = ((doname_flags | 0) & DONAME_VAGUE_QUAN) !== 0;
    const omndx = (obj.corpsenm != null) ? (obj.corpsenm | 0) : NON_PM;
    const oclass = obj.oclass | 0;
    const otyp = obj.otyp | 0;
    const quan = (obj.quan ?? 1) | 0;
    let ispoisoned = false;

    let bp = xname(obj);

    let known, dknown, cknown, bknown, lknown;
    if (g.iflags && g.iflags.override_ID) {
        known = dknown = cknown = bknown = lknown = true;
    } else {
        known = !!obj.known; dknown = !!obj.dknown; cknown = !!obj.cknown;
        bknown = !!obj.bknown; lknown = !!obj.lknown;
    }

    /* C:1266-1272 — "poisoned arrow" (xname) vs "poisoned +0 arrow" (doname). */
    if (bp.startsWith('poisoned ') && otrapped_of(obj)) {
        bp = bp.slice(9);
        ispoisoned = true;
    }

    /* C:1274-1280 — a fruit given an artifact name formats like the artifact. */
    const SLIME_MOLD = 285;
    const aname = (otyp === SLIME_MOLD) ? artifact_name(bp, false) : null;
    const fake_arti = !!aname;
    const force_the = fake_arti && /^the /i.test(aname.name);

    let prefix = '';
    const CORPSE = 265;
    if (quan !== 1) {
        prefix = (dknown || !vague_quan) ? `${quan} ` : 'some ';
    } else if (otyp === CORPSE) {
        /* C:1288-1291 — corpse_xname() supplies the article. */
    } else if (force_the || obj_is_pname(obj) || the_unique_obj(obj)) {
        if (/^the /i.test(bp))
            bp = bp.slice(4);
        prefix = 'the ';
    } else if (!fake_arti) {
        prefix = 'a ';
    }

    const BAG_OF_TRICKS = 220, HORN_OF_PLENTY = 252, STATUE = 476;
    const has_contents = !!obj.cobj;
    if (cknown
        && ((otyp === BAG_OF_TRICKS || otyp === HORN_OF_PLENTY)
            ? ((obj.spe | 0) === 0 && !known)
            : ((Is_container_otyp(otyp) || otyp === STATUE) && !has_contents)))
        prefix += 'empty ';

    /* C:1321-1348 — the BUC word. */
    const POT_WATER = 322;
    if (bknown && oclass !== COIN_CLASS
        && (otyp !== POT_WATER
            || !(g._oc_name_known && g._oc_name_known[POT_WATER])
            || (!obj.cursed && !obj.blessed))) {
        if (obj.cursed)
            prefix += 'cursed ';
        else if (obj.blessed)
            prefix += 'blessed ';
        else if (!(g.flags && (g.flags.implicit_uncursed === undefined
                               ? true : !!g.flags.implicit_uncursed))
                 || ((!known || !_oc_charged(obj)
                      || oclass === ARMOR_CLASS || oclass === RING_CLASS)
                     && otyp !== SCR_MAIL_OTYP
                     && otyp !== FAKE_AMULET_OF_YENDOR
                     && otyp !== AMULET_OF_YENDOR
                     && !_Role_if(ROLE_IDX_PRIEST)))
            prefix += 'uncursed ';
    }

    /* C:1355-1371 — box/trap/lock words, then greased. */
    if (Is_box_otyp(otyp) && (obj.otrapped | 0) && (obj.tknown | 0) && obj.dknown)
        prefix += 'trapped ';
    if (lknown && Is_box_otyp(otyp)) {
        if (obj.obroken | 0) prefix += 'broken ';
        else if (obj.olocked | 0) prefix += 'locked ';
        else prefix += 'unlocked ';
    }
    if (obj.greased)
        prefix += 'greased ';
    if (cknown && has_contents) {
        /* count_contents(obj, FALSE, FALSE, TRUE, FALSE) — separate stacks. */
        let itemcount = 0;
        for (let c = obj.cobj; c; c = c.nobj)
            itemcount++;
        bp += ` containing ${itemcount} item${itemcount === 1 ? '' : 's'}`;
    }

    /* C:1373-1554 — the per-class switch, on is_weptool ? WEAPON_CLASS : oclass. */
    const OIL_LAMP = 227, MAGIC_LAMP = 228, BRASS_LANTERN = 226,
          CANDELABRUM = 262, LEASH = 236, MEAT_RING = 270, EGG = 266,
          POT_OIL = 321, AKLYS = 80, TOWEL_UNUSED = -1;
    void TOWEL_UNUSED;
    const W_ARMOR_MASK = 0x0000FFFF & ~0x0; /* see below; masks are explicit */
    void W_ARMOR_MASK;
    const mask = obj.owornmask | 0;
    const W_ARM_ALL = W_ARM_D | W_ARMC_D | W_ARMH_D | W_ARMS_D | W_ARMG_D
                    | W_ARMF_D | W_ARMU_D;
    let sw = _is_weptool(obj) ? WEAPON_CLASS : oclass;
    let doRing = false;
    switch (sw) {
    case AMULET_CLASS:
        if (mask & W_AMUL_D) bp += ' (being worn)';
        break;
    case ARMOR_CLASS:
        if (mask & W_ARM_ALL) {
            /* C objnam.c:1387-1396 — check doffing() before donning() because
             * donning() returns true for both cases. */
            bp += obj === g.u?.uskin ? ' (embedded in your skin)' : doffing(obj) ? ' (being doffed)'
                : donning(obj) ? ' (being donned)'
                : ' (being worn)';
            /* C objnam.c:1397-1406 — Concat(bp, 1, "; slippery)") is
             * strncat at the real end of the string, so the ')' is NOT
             * replaced: C yields "(being worn); slippery)".  Ported as-is. */
            if (bp.endsWith(')') && obj === game.u?.uarmg
                && ((game.u.uprops?.[GLIB_PROP_ON]?.intrinsic) | 0) !== 0)
                bp += '; slippery)';
            /* C objnam.c:1408-1413 — ConcatF1 replaces the final paren. */
            if (bp.endsWith(')') && !_Blind() && obj.lamplit && artifact_light(obj))
                bp = `${bp.slice(0, -1)}, ${arti_light_description(obj)} lit)`;
        }
        /* FALLTHROUGH — C:1420 */
    case WEAPON_CLASS:
        if (ispoisoned) prefix += 'poisoned ';
        prefix += add_erosion_words(obj);
        if (known) prefix += _plusd(obj.spe | 0);
        break;
    case TOOL_CLASS:
        if (mask & (W_TOOL_D | W_SADDLE_D)) { /* blindfold */
            bp += ' (being worn)';
            break;
        }
        if (otyp === LEASH && (obj.leashmon | 0) !== 0) {
            /* C:1431-1445 — find_mid(obj->leashmon, FM_FMON) walks fmon
             * (dead nodes included, hence the DEADMONSTER test below). */
            let mlsh = null;
            for (let m = game.fmon; m; m = m.nmon)
                if ((m.m_id | 0) === (obj.leashmon | 0)) { mlsh = m; break; }
            if (mlsh && (mlsh.mhp | 0) >= 1) {
                bp += ` (attached to ${noit_mon_nam(mlsh)})`;
            } else {
                if (mlsh) await naming_impossible('leashed %s #%u is dead', mon_pmname(mlsh), obj.leashmon >>> 0);
                else await naming_impossible('leashed monster #%u not found', obj.leashmon >>> 0);
                obj.leashmon = 0;
            }
            break;
        }
        if (otyp === CANDELABRUM) {
            bp += ` (${obj.spe | 0} of 7 candle${_plur(obj.spe | 0)}`
                + `${!obj.lamplit ? ' attached' : ', lit'})`;
            break;
        } else if (otyp === OIL_LAMP || otyp === MAGIC_LAMP
                   || otyp === BRASS_LANTERN || _Is_candle(otyp)) {
            if (_Is_candle(otyp)) {
                /* C:1459-1476 — "partly used " when the burn time left is
                 * under 20 * oc_cost; a lit candle adds its BURN_OBJECT
                 * timer's remaining time (the age is adjusted at begin_burn). */
                const full_burn_time = 20 * Number(OC_COST[otyp]);
                let turns_left = Number(obj.age ?? 0);
                if (obj.lamplit)
                    turns_left += peek_timer(BURN_OBJECT, { a_obj: obj, a_long: null })
                        - ((game.moves ?? 0) | 0);
                if (turns_left < full_burn_time) prefix += 'partly used ';
            }
            if (obj.lamplit) bp += ' (lit)';
            break;
        }
        // C objnam.c: charged tools share the wand charge suffix.
        if (!_oc_charged(obj)) break;
        /* FALLTHROUGH: charges */
    case WAND_CLASS:
        if (known)
            bp += ` (${obj.recharged | 0}:${obj.spe | 0})`;
        break;
    case POTION_CLASS:
        if (otyp === POT_OIL && obj.lamplit) bp += ' (lit)';
        break;
    case RING_CLASS:
        doRing = true;
        break;
    case FOOD_CLASS:
        if (obj.oeaten) prefix += 'partly eaten ';
        if (otyp === CORPSE) {
            const cxarg = ((quan !== 1) ? 0 : CXN_ARTICLE) | CXN_NOCORPSE;
            prefix = `${corpse_xname(obj, prefix, cxarg)} `;
        } else if (otyp === EGG) {
            if (ismnum(omndx)
                && (known || _mvitals_knows_egg(omndx))) {
                prefix += `${monPmname(omndx, NEUTRAL)} `;
                if ((obj.spe | 0) === 1) bp += ' (laid by you)';
            }
        } else if (otyp === MEAT_RING) {
            doRing = true;
        }
        break;
    case BALL_CLASS:
    case CHAIN_CLASS:
        prefix += add_erosion_words(obj);
        if (mask & (W_BALL_D | W_CHAIN_D))
            bp += ` (${(mask & W_BALL_D) ? 'chained' : 'attached'} to you)`;
        break;
    }
    if (doRing) { /* C:1494-1504 — the `ring:` label */
        if (mask & W_RINGR_D) bp += ' (on right ';
        if (mask & W_RINGL_D) bp += ' (on left ';
        if (mask & (W_RINGL_D | W_RINGR_D)) bp += `${body_part(HAND_D)})`;
        if (known && _oc_charged(obj)) prefix += _plusd(obj.spe | 0);
    }
    /* C:1549-1559 — the wizmgender statue/corpse/figurine suffix. */
    if ((otyp === STATUE || otyp === CORPSE || otyp === FIGURINE)
        && g.flags?.debug && g.iflags?.wizmgender) {
        const cgend = (obj.spe | 0) & CORPSTAT_GENDER;
        bp += ` (${cgend === CORPSTAT_RANDOM ? 'unspecified gender'
            : cgend === CORPSTAT_MALE ? 'male' : cgend === CORPSTAT_FEMALE ? 'female' : 'neuter'})`;
    }

    /* C:1560-1611 — the wielded-weapon suffix. */
    const u = g.u || {};
    if ((mask & W_WEP_D) && !(g.gm && g.gm.mrg_to_wielded)) {
        const twoweap_primary = (obj === u.uwep) && !!u.twoweap;
        const tethered = (otyp === AKLYS);
        if ((quan !== 1
             || ((oclass === WEAPON_CLASS)
                 ? (_is_ammo_dn(obj) || _is_missile_dn(obj))
                 : !_is_weptool(obj)))
            && !twoweap_primary) {
            bp += ' (wielded)';
        } else {
            let hand_s = body_part(HAND_D);
            if (_bimanual(obj))
                hand_s = makeplural(hand_s);
            else
                hand_s = `${_URIGHTY() ? 'right' : 'left'} ${hand_s}`;
            bp += ` (${tethered ? 'tethered to'
                       : twoweap_primary ? 'wielded in'
                       : 'weapon in'} ${hand_s})`;
            /* C objnam.c:1597-1610 — Sting's glow arm (glow_verb(cnt, TRUE),
             * glow_color, artifact.c:2427-2462) is tried first; else a lit
             * light-emitting artifact weapon overwrites the closing paren with
             * ", <adverb> lit)".  Colours as display.js Sting_effects. */
            const wcnt = game.warn_obj_cnt | 0;
            if (!_Blind() && wcnt && obj === u.uwep
                && ((u.uprops?.[WARN_OF_MON_D]?.extrinsic | 0) & W_WEP_D) !== 0)
                bp = `${bp.slice(0, -1)}, ${glow_verb(wcnt, true)} ${glow_color(obj.oartifact | 0)})`;
            else if (!_Blind() && obj.lamplit && artifact_light(obj))
                bp = `${bp.slice(0, -1)}, ${arti_light_description(obj)} lit)`;
        }
    }
    if (mask & W_SWAPWEP_D) {
        if (u.twoweap)
            bp += ` (wielded in ${_URIGHTY() ? 'left' : 'right'} `
                + `${body_part(HAND_D)})`;
        else
            bp += ` (alternate weapon${_plur(quan)}; not wielded)`;
    }
    if (mask & W_QUIVER_D) {
        let Qtyp;
        switch (oclass) {
        case WEAPON_CLASS:
            Qtyp = !_is_ammo_dn(obj) ? 3
                 : ((MKOBJ_OC_SKILL[otyp] | 0) !== -P_BOW) ? 2
                 : 1;
            break;
        case RING_CLASS: case AMULET_CLASS: case WAND_CLASS:
        case COIN_CLASS: case GEM_CLASS:
            Qtyp = 2; break;
        default:
            Qtyp = 3; break;
        }
        bp += ` (${Qtyp === 1 ? 'in quiver'
                  : Qtyp === 2 ? 'in quiver pouch' : 'at the ready'})`;
    }
    // C objnam.c:1648-1683: shop suffixes also record per-unit quotes.
    if (!g.iflags?.suppress_price && !g.program_state?.restoring) {
        const quote = () => append_price_quote(bp, bp.length, otyp,
            g._oc_price_seen?.[otyp] || {
                oc_sell_minseen: Infinity, oc_sell_maxseen: 0,
                oc_buy_minseen: Infinity, oc_buy_maxseen: 0,
            });
        if (is_unpaid(obj)) {
            const price = await unpaid_cost(obj, COST_CONTENTS);
            bp += ` (${obj.unpaid ? 'unpaid' : 'contents'}, ${price} ${currency(price)})`;
            record_price_quote(otyp, Math.trunc(price / quan), true);
        } else if ((doname_flags | 0) & DONAME_WITH_PRICE) {
            const nochrg = { value: 0 };
            const price = get_cost_of_shop_item(obj, nochrg);
            if (price > 0) {
                bp += ` (${nochrg.value ? 'contents' : 'for sale'}, ${price} ${currency(price)})`;
            } else if (nochrg.value > 0) {
                bp += ' (no charge)';
            } else if (g.iflags?.pricequotes && !g._oc_name_known?.[otyp]) {
                bp = quote();
            }
            if (price > 0) record_price_quote(otyp, Math.trunc(price / quan), true);
        } else if (g.iflags?.pricequotes && !g._oc_name_known?.[otyp]) {
            bp = quote();
        }
    }

    /* C:1687-1693 — fix up the default "a " article now that the rest of the
     * prefix is known: just_an() decides "a"/"an"/"" against whatever word
     * actually comes first. */
    if (prefix.startsWith('a ')) {
        const rest = prefix.slice(2);
        prefix = just_an('', rest || bp) + rest;
    }
    // C objnam.c:1695-1702: wizard-requested weight follows all other suffixes.
    if (wizard() && g.iflags?.wizweight) {
        if ((doname_flags & DONAME_WITH_PRICE) && bp.endsWith(')'))
            bp = `${bp.slice(0, -1)}, ${obj.owt >>> 0} aum)`;
        else
            bp += ` (${obj.owt >>> 0} aum)`;
    }
    // C objnam.c:1706-1749: final bounds and one-time diagnostics per process.
    bp = strprepend(bp, prefix);
    if (bp.length > 255) {
        paniclog('doname', bp);
        throw new Error('doname: long object description overflow.');
    }
    const offsetbp = (doname_flags & DONAME_FOR_MENU) ? 4 : 0;
    if (bp.length + offsetbp >= 255) {
        if ((g._doname_full = (g._doname_full || 0) + 1) === 1) {
            paniclog('doname', bp);
            paniclog('doname', `long object description${offsetbp ? ' truncated for menu use' : ''}.`);
        }
        bp = bp.slice(0, 255 - offsetbp);
    }
    return bp;
}
/* C objnam.c:1530 — recognize eggs after learning their species by hatching. */
function _mvitals_knows_egg(omndx) {
    return !!((game.mvitals?.[omndx]?.mvflags | 0) & MV_KNOWS_EGG);
}
/* C you.h URIGHTY — !u.uhandedness (RIGHTHANDED == 0). */
function _URIGHTY() { return !(game.u && game.u.uhandedness); }
/* C obj.h:238/245 is_ammo / is_missile, off oc_skill (see js/u_init.js:1392). */
function _is_ammo_dn(o) {
    const oc = o.oclass | 0, sk = MKOBJ_OC_SKILL[o.otyp | 0] | 0;
    return (oc === WEAPON_CLASS || oc === GEM_CLASS) && sk >= -22 && sk <= -20;
}
function _is_missile_dn(o) {
    const oc = o.oclass | 0, sk = MKOBJ_OC_SKILL[o.otyp | 0] | 0;
    return (oc === WEAPON_CLASS || oc === TOOL_CLASS) && sk >= -25 && sk <= -23;
}
/* C obj.h:382  #define Is_candle(otmp) \
 *     (otmp->otyp == TALLOW_CANDLE || otmp->otyp == WAX_CANDLE)
 * TALLOW_CANDLE 224 / WAX_CANDLE 225, resolved by name through
 * js/oc_name_data.js.  This used to read {260, 261}, which is
 * {grappling hook, unicorn horn} -- and both of those are WEPTOOLs, so
 * _is_weptool() routes them to the WEAPON_CLASS arm and this test could
 * never fire at all: a LIT candle got no " (lit)" suffix.  The same two
 * otyps are already declared correctly 2,300 lines up in this file
 * (TALLOW_CANDLE_OTYP / WAX_CANDLE_OTYP, objnam.js:2745-2746), which is
 * what _is_candle_on() reads. */
function _Is_candle(otyp) {
    return otyp === TALLOW_CANDLE_OTYP || otyp === WAX_CANDLE_OTYP;
}
import { W_ARM as W_ARM_D, W_ARMC as W_ARMC_D, W_ARMH as W_ARMH_D,
         W_ARMS as W_ARMS_D, W_ARMG as W_ARMG_D, W_ARMF as W_ARMF_D,
         W_ARMU as W_ARMU_D, W_RINGL as W_RINGL_D, W_RINGR as W_RINGR_D,
         W_AMUL as W_AMUL_D, W_TOOL as W_TOOL_D, W_SADDLE as W_SADDLE_D,
         W_WEP as W_WEP_D, W_SWAPWEP as W_SWAPWEP_D, W_QUIVER as W_QUIVER_D,
         W_BALL as W_BALL_D, W_CHAIN as W_CHAIN_D, WARN_OF_MON as WARN_OF_MON_D } from './const.js';
const HAND_D = 6; /* body_part.h HAND */

/* xname_flags()'s body with C's `gd.distantname` guard (objnam.c:627) hoisted
 * into a parameter.  distant_name() (objnam.c:395-403) increments gd.distantname
 * around the formatting call whenever the object is NOT nearby-and-visible, and
 * minimal_xname() (objnam.c:1085) always reaches xname() through distant_name()
 * with a stack-local `bareobj` — which get_obj_location() cannot find, so C
 * ALWAYS takes distant_name()'s ++gd.distantname arm there.  Formatting a bare
 * copy of an object must not observe_object() the real type into the discovery
 * list; that is exactly what minimal_xname's own comment at :1060 says. */
function _xname_flags_body(obj, cxn_flags, side_effects) {
    const c = _xn_ctx(obj, cxn_flags, side_effects);

    // C objnam.c:660-661, artifact.c:418-459: find_artifact also feeds #chronicle.
    if (obj.oartifact && obj.dknown) {
        const a = obj.oartifact | 0, info = _artiexist()[a];
        if (!info?.found) {
            if (a < 1 || a > ARTILIST.length) impossible('found_artifact: invalid artifact index! (%d)', a);
            else if (!_arti_exists_bit(a)) impossible("found_artifact: artifact doesn't exist yet? (%d)", a);
            else if (info === true) _artiexist()[a] = { exists: 1, found: 1 };
            else info.found = 1;
            const where = obj.where === OBJ_FLOOR_ON ? (inside_shop(obj.ox, obj.oy) ? ' in a shop' : ' on the floor')
                : obj.where === OBJ_CONTAINED ? ' in a container'
                : obj.where === OBJ_MINVENT_ON ? ' carried by a monster' : '';
            livelog_printf(LL_ARTIFACT, 'found %s%s', bare_artifactname(obj), where);
        }
    }

    let buf;
    let nameit = false;
    if (obj_is_pname(obj)) {
        /* C:663-664 `goto nameit` — the whole class switch, pluralization and
         * end-of-game text are skipped for an object that IS its name. */
        buf = '';
        nameit = true;
    } else {
        buf = _xname_arm(obj, c);
        if (buf.length > 175) {
            paniclog('xname', 'buf[]=' + buf);
            throw new Error('xname: buffer overflow before appending name.');
        }

        /* C:953-958 — pluralize AFTER the switch (it can shorten buf). */
        if (c.pluralize)
            buf = makeplural(buf);
        buf = buf.slice(0, 175); // C Concat after pluralization.

        /* C:960-994 — end-of-game disclosure text, keyed on o_id (zeroed by
         * minimal_xname so it is skipped there).
         * T_SHIRT " with text" and CANDY_BAR " labeled" follow (C:983-990). */
        if (buf.length < 175) { // C:966: only disclose when buffer space remains.
        if (game.program_state?.gameover && obj.o_id && (obj.otyp | 0) === 136) {
            const motif = (((obj.o_id | 0) ^ ((game.u?.ubirthday ?? 0) | 0)) >>> 0)
                % HAWAIIAN_MOTIFS_XN.length;
            buf += ` with ${an(HAWAIIAN_MOTIFS_XN[motif])} motif`;
        }
        if (game.program_state?.gameover && obj.o_id
            && (obj.otyp | 0) === ALCHEMY_SMOCK) {
            // C objnam.c:978-982; read.c:254-280 includes erosion of the text.
            buf += ` with text "${apron_text(obj)}"`;
        }

        if (game.program_state?.gameover && obj.o_id && (obj.otyp | 0) === 137) {
            buf += ` with text "${tshirt_text(obj)}"`;
        }
        if (game.program_state?.gameover && obj.o_id && (obj.otyp | 0) === 288) {
            const lbl = candy_wrapper_text(obj);
            if (lbl) buf += ` labeled "${lbl}"`;
        }
        buf = buf.slice(0, 174); // ConcatF1 uses snprintf's size, including NUL.
        }

        /* C:998-999 */
        if (has_oname(obj) && c.dknown) {
            buf += ' named ';
            nameit = true;
        }
    }
    if (nameit) {
        /* C:1000-1006 — `nameit:` */
        let nm = ONAME(obj);
        if (nm == null) nm = '';
        /* downcase "The" in "<quest-artifact-item> named The ..." */
        if (obj.oartifact && nm.startsWith('The '))
            nm = lowc(nm[0]) + nm.slice(1);
        buf = (buf + nm).slice(0, 175); // C Concat bounds ONAME too.
    }
    const full = buf.length === 175;

    /* C:1011-1012 — `if (!strncmpi(buf, "the ", 4)) buf += 4;` */
    if (buf.length >= 4 && buf.slice(0, 4).toLowerCase() === 'the ')
        buf = buf.slice(4);
    if (full && (game._xname_full = (game._xname_full || 0) + 1) === 1) {
        paniclog('xname', 'buf[]=' + buf);
        paniclog('xname', 'used up entire obuf[PREFIX..BUFSX-1]');
    }

    return buf;
}

/* C objnam.c:1031-1090 — staticfn char *minimal_xname(struct obj *obj)
 *
 * "similar to simple_typename but minimal_xname operates on a particular
 *  object rather than its object type".  Formats a BARE copy of `obj`: no
 *  user-supplied call-name, no BUC prefix, no enchantment, no statue/figurine
 *  detail, singular.  C mutates the two objects[] columns it needs suppressed,
 *  formats, then restores them.
 *
 * The C body's caveat applies verbatim: this makes a lot of assumptions about
 * which fields xname() needs in order to yield a sensible result.  bareobj is
 * `cg.zeroobj` plus the six assignments below, so every other field reads as 0
 * — which is what the object literal here spells out.
 */
function minimal_xname(obj) {
    const otyp = obj.otyp | 0;
    const g = game;
    const override_ID = !!(g.iflags && g.iflags.override_ID);

    /* C:1046-1047 — suppress user-supplied name */
    if (!g._oc_uname) g._oc_uname = {};
    const save_oc_uname = g._oc_uname[otyp];
    g._oc_uname[otyp] = 0;
    /* C:1049-1054 — suppress actual name if object's description is unknown */
    if (!g._oc_name_known) g._oc_name_known = {};
    const save_oc_name_known = g._oc_name_known[otyp];
    if (override_ID)
        g._oc_name_known[otyp] = 1;
    else if (!obj.dknown)
        g._oc_name_known[otyp] = 0;

    /* C:1058-1075 — bareobj = cg.zeroobj, then the specific fields */
    const bareobj = {
        otyp,
        oclass: obj.oclass | 0,
        /* C:1060-1062 — "not observe_object, either the hero observed the
           object already or this is overriding ID and shouldn't discover the
           object" */
        dknown: (obj.dknown || override_ID) ? 1 : 0,
        /* C:1063-1067 — suppress `known` except for amulets (needed for fakes
           and the real Amulet of Yendor); the default is "on" for types which
           don't use it. */
        known: ((obj.oclass | 0) === AMULET_CLASS)
                   ? (obj.known ? 1 : 0)
                   : (OC_USES_KNOWN[otyp] ? 0 : 1),
        quan: 1,                    /* C:1068 — don't want plural */
        /* C:1069-1071 — for a boulder leave corpsenm as 0; non-zero produces
           "next boulder".  Otherwise suppress statue and figurine details. */
        corpsenm: (otyp !== BOULDER) ? NON_PM : 0,
        /* the cg.zeroobj remainder that the xname arms read */
        spe: 0, cursed: 0, blessed: 0, bknown: 0, oeroded: 0, oeroded2: 0,
        oerodeproof: 0, greased: 0, oartifact: 0, lamplit: 0, globby: 0,
        owornmask: 0, otrapped: 0, olocked: 0, obroken: 0, oeaten: 0,
        odiluted: 0, no_charge: 0, unpaid: 0, invlet: 0, o_id: 0,
        oname: null, where: 0, nexthere: null, nobj: null, cobj: null,
    };
    /* C:1072-1075 — suppressing fruit details leads to "bad fruit #0" */
    if ((obj.otyp | 0) === SLIME_MOLD)
        bareobj.spe = obj.spe | 0;

    /* C:1077 — bufp = distant_name(&bareobj, xname).  bareobj is a stack local
     * with where == OBJ_FREE, so get_obj_location() fails and distant_name()
     * takes its ++gd.distantname arm unconditionally: xname() with side effects
     * suppressed. */
    let bufp = _xname_flags_body(bareobj, CXN_NORMAL, /* side_effects = */ false);
    /* C:1078-1082 — undo forced setting of bareobj.blessed for a cleric */
    if (bufp.startsWith('uncursed '))
        bufp = bufp.slice(9);

    /* C:1084-1085 */
    if (save_oc_uname === undefined) delete g._oc_uname[otyp];
    else g._oc_uname[otyp] = save_oc_uname;
    if (save_oc_name_known === undefined) delete g._oc_name_known[otyp];
    else g._oc_name_known[otyp] = save_oc_name_known;
    return bufp;
}

/* C objnam.c:2424-2442 — char *simpleonames(struct obj *obj)
 * "minimal_xname() applied to a specific object, made plural if quan > 1" */
export function simpleonames(obj) {
    let simpleoname = minimal_xname(obj);

    if ((obj.quan | 0) !== 1)
        simpleoname = makeplural(simpleoname);
    return simpleoname;
}

// C objnam.c:2391-2408: ownership plus a minimal, singular object name.
export function Ysimple_name2(obj) {
    const prefix = shk_your('', obj);
    const s = prefix + minimal_xname(obj).slice(0, 255 - prefix.length);
    return highc(s[0]) + s.slice(1);
}

// C objnam.c:2490-2497 deliberately clears override_ID, even if already set.
export function actualoname(obj) {
    game.iflags ||= {};
    game.iflags.override_ID = true;
    const res = minimal_xname(obj);
    game.iflags.override_ID = false;
    return res;
}

// C objnam.c:5606-5616: a mimic names a type, not a fabricated object.
export function mimic_obj_name(mtmp) {
    if (M_AP_TYPE(mtmp) === M_AP_OBJECT) {
        if (mtmp.mappearance === GOLD_PIECE_OTYP) return 'gold';
        if (mtmp.mappearance !== STRANGE_OBJECT)
            return simple_typename(mtmp.mappearance);
    }
    return 'whatcha-may-callit';
}

/* C objnam.c:2444-2470 — char *ansimpleoname(struct obj *obj)
 * simpleonames() with an article: "the" for a unique item (or a fake one
 * imitating same) formatted with its actual name, "a"/"an" for a singleton. */
export function ansimpleoname(obj) {
    let simpleoname = simpleonames(obj);
    let otyp = obj.otyp | 0;

    /* C:2454-2455 */
    if (otyp === FAKE_AMULET_OF_YENDOR)
        otyp = AMULET_OF_YENDOR;
    const g = game;
    const oc_unique = !!(g._oc_unique && g._oc_unique[otyp]);
    const oc_name = _objName(otyp);
    if (oc_unique && oc_name && simpleoname === oc_name) {
        /* C:2456-2462 */
        simpleoname = the(simpleoname);
    } else if ((obj.quan | 0) === 1) {
        /* C:2462-2468 — simpleoname[] is singular if quan==1 */
        simpleoname = an(simpleoname);
    }
    return simpleoname;
}

export async function short_oname(obj, func, altfunc, lenlimit) {
    const g = game;
    const otyp = obj.otyp | 0;
    let outbuf = await func(obj);
    if (outbuf.length <= lenlimit)
        return outbuf;

    /* C:2022-2033 — shorten the called string ("call it <foo>") to a fairly
     * small amount.  sizeof unamebuf is 12, so the test is >= 12 and the
     * replacement is the first 8 characters plus "...". */
    const save_uname = g._oc_uname ? g._oc_uname[otyp] : undefined;
    if (save_uname && save_uname.length >= 12) {
        g._oc_uname[otyp] = save_uname.slice(0, 8) + '...';
        outbuf = (await func(obj));
        g._oc_uname[otyp] = save_uname;
        if (outbuf.length <= lenlimit)
            return outbuf;
    }

    /* C:2035-2046 — same for the named string (#name'd artifact-style name).
     * ONAME() is obj->oextra->oname (const.js ONAME/has_oname); a bare
     * obj.oname is NOT that field. */
    const save_oname = has_oname(obj) ? ONAME(obj) : 0;
    if (save_oname && save_oname.length >= 12) {
        obj.oextra.oname = save_oname.slice(0, 8) + '...';
        outbuf = (await func(obj));
        obj.oextra.oname = save_oname;
        if (outbuf.length <= lenlimit)
            return outbuf;
    }

    /* C:2048-2060 — both shortened at once. */
    if (save_uname && save_uname.length >= 12
        && save_oname && save_oname.length >= 12) {
        g._oc_uname[otyp] = save_uname.slice(0, 8) + '...';
        obj.oextra.oname = save_oname.slice(0, 8) + '...';
        outbuf = (await func(obj));
        if (outbuf.length <= lenlimit) {
            g._oc_uname[otyp] = save_uname;
            obj.oextra.oname = save_oname;
            return outbuf;
        }
    }

    /* C:2062-2081 — strip the name-lengthening attributes.  C snapshots the
     * WHOLE struct (`save_obj = *obj`) and restores it wholesale afterwards, so
     * any incidental field a formatter touches during these calls is rolled
     * back too; mirror that with a shallow own-property snapshot rather than
     * restoring only the five fields it zeroes.  (Discovery state that
     * xname/observe_object publishes into the GLOBAL objects[] table is outside
     * struct obj and survives in C as well, so it is deliberately not undone.) */
    const save_obj = { ...obj };
    obj.bknown = 0;
    obj.rknown = 0;
    obj.greased = 0;
    obj.oeroded = 0;
    obj.oeroded2 = 0;
    outbuf = (await func(obj));
    if (altfunc && outbuf.length > lenlimit)
        outbuf = await altfunc(obj);
    for (const k of Object.keys(save_obj))
        obj[k] = save_obj[k];
    if (save_oname) obj.oextra.oname = save_oname;
    if (save_uname) g._oc_uname[otyp] = save_uname;

    /* C:2083 — use whatever we've got, whether it's too long or not. */
    return outbuf;
}

/* C objnam.c:2474-2482 — char *thesimpleoname(struct obj *obj); the standard
 * short_oname() altfunc. */
export function thesimpleoname(obj) {
    return the(simpleonames(obj));
}

// ── deliver_splev_message (C questpgr.c:653-664) ────────────────────────────
// C:
//   void deliver_splev_message(void) {
//       /* there's no provision for delivering via window instead of pline */
//       if (gl.lev_message) {
//           deliver_by_pline(gl.lev_message);
//           free((genericptr_t) gl.lev_message);
//           gl.lev_message = NULL;
//       }
//   }
//
// `gl.lev_message` (decl.h:567, in the `gl` "globals starting with l" struct)
// is a PLAIN GLOBAL, not a member of struct level: it is appended to by
// lspo_message() (sp_lev.c:3081, the des.message() Lua binding) while a special
// level is being loaded, cleared by clear_level_structures() (mklev.c:931), and
// consumed exactly once here on arrival.  js/sp_lev.js:lspo_message writes the
// same global (game.lev_message) — it previously wrote game.level.lev_message,
// a different path from the one this function reads, so even an unstubbed
// deliver_by_pline would have found nothing.
//
// KNOWN GAP (outside this task's file scope): C also clears gl.lev_message in
// clear_level_structures() (mklev.c:931-934).  js/mklev.js:4103's port replaces
// game.level wholesale but does not clear game.lev_message, so a message
// generated for a level that is never arrived at would leak to the next
// generated level.  goto_level always generates-then-arrives, so the leak is
// not reachable today; the one-line fix belongs in js/mklev.js.
export async function deliver_splev_message() {
    if (game.lev_message) {
        await deliver_by_pline(game.lev_message);
        /* C: free(gl.lev_message); gl.lev_message = NULL; */
        game.lev_message = null;
    }
}

// ── deliver_by_pline (C questpgr.c:421-435) ─────────────────────────────────
// C:
//   char in_line[BUFSZ], out_line[BUFSZ];
//   const char *msgp = str, *msgend = eos((char *) str);
//   while (msgp < msgend) {
//       copynchars(in_line, msgp, (int) sizeof in_line - 1);
//       msgp += strlen(in_line) + 1;
//       convert_line(in_line, out_line);
//       pline("%s", out_line);
//   }
//
// copynchars() (hacklib.c:351-361) copies at most n chars and STOPS AT '\n'
// without copying it, always NUL-terminating.  The caller then advances by
// strlen(in_line)+1, i.e. it steps over the newline; for a final segment with
// no trailing newline that lands one past msgend and ends the loop.  BUFSZ is
// 256 (global.h:391), so the per-line copy is capped at 255 characters — a
// longer physical line is split there and the 256th character is SKIPPED by the
// +1.  That is a C bug, reproduced here per Cardinal Rule 1 (no des.message()
// line in dat/ is anywhere near 255 chars, so it is not reachable today).
//
// pline() is called unconditionally, including for an empty converted line
// (C's vpline() early-out tests the FORMAT "%s", which is never empty, then
// substitutes the argument).  No dat/ level message contains a blank line, so
// Shared with quest text through the questpgr.js import above.

// ── convert_arg (C questpgr.c:196-325) ──────────────────────────────────────
// C uses the same argument expansion for des.message() and quest text.
// Share the synchronous converter so level messages handle every argument,
// including %o/%O and C's empty result for an unknown letter.
async function convert_arg(c) {
    return quest_convert_arg(c);
}

// ── convert_line (C questpgr.c:326-419) ─────────────────────────────────────
// Faithful port of C's loop, including the `--c` "undo switch increment" arms
// (an unrecognised modifier byte is re-read as ordinary text on the next
// iteration) and the '%'-at-end-of-string fallthrough that emits a literal '%'.
// Pronouns use the same quest-status genders and artifact plurality as quest text.
async function convert_line(in_line) {
    const s = String(in_line);
    return quest_convert_line(s);
}
/* C: cvt_buf[0] = highc(cvt_buf[0]) — first character only. */
function _cvt_highc(sv) { return sv ? highc(sv[0]) + sv.slice(1) : sv; }

// ── boots_simple_name (objnam.c:5547-5564) ──────────────────────────────────
// C: "boots vs shoes; depends upon discovery state."
//   if (boots && boots->dknown) {
//       actualn = OBJ_NAME(*ocl); descrpn = OBJ_DESCR(*ocl);
//       if (strstri(descrpn, "shoes")
//           || (objects[otyp].oc_name_known && strstri(actualn, "shoes")))
//           return "shoes";
//   }
//   return "boots";
// Note the asymmetry vs gloves_simple_name: the DESCR is probed
// unconditionally and the NAME only when oc_name_known (C tests them in that
// order with ||).  All boot names/descrs are lowercase, so a lowercased
// .includes() matches C's case-insensitive strstri exactly.
export function boots_simple_name(boots) {
    const shoes = "shoes";
    if (boots && boots.dknown) {
        const otyp = boots.otyp | 0;
        const g = game;
        const oc_name_known = !!(g._oc_name_known && g._oc_name_known[otyp]);
        const actualn = _objName(otyp);            /* OBJ_NAME — real name */
        const descrpn = getObjDescr(otyp);         /* OBJ_DESCR — shuffled appearance */
        if ((descrpn && String(descrpn).toLowerCase().includes(shoes))
            || (oc_name_known && actualn
                && String(actualn).toLowerCase().includes(shoes)))
            return shoes;
    }
    return "boots";
}
// ── shield_simple_name (objnam.c:5566-5594) ─────────────────────────────────
// C: "simplified shield for messages".  The only special case is the shield of
// reflection, which xname() describes as "smooth" until seen up close; the
// weight-based light/heavy split below it is #if 0 in C, so every other shield
// falls through to the plain "shield".
/* SHIELD_OF_REFLECTION_OTYP (158) is declared above with xname_armor. */
export function shield_simple_name(shield) {
    if (shield) {
        if ((shield.otyp | 0) === SHIELD_OF_REFLECTION_OTYP)
            return shield.dknown ? "silver shield" : "smooth shield";
    }
    return "shield";
}
// ── shirt_simple_name (objnam.c:5596-5601) ──────────────────────────────────
// C: const char * shirt_simple_name(struct obj *shirt UNUSED) { return "shirt"; }
export function shirt_simple_name(_shirt) {
    return "shirt";
}

/* C objnam.c:3537-3550 set_wallprop_from_str() */
function set_wallprop_from_str(bp) {
    let wall_prop = 0;
    if (bp.includes('undiggable ') || bp.includes('nondiggable '))
        wall_prop |= W_NONDIGGABLE;
    if (bp.includes('unphaseable ') || bp.includes('nonpasswall '))
        wall_prop |= W_NONPASSWALL;
    const lev = game.level?.at(game.u.ux, game.u.uy);
    if (wall_prop && lev)
        lev.wall_info = (lev.wall_info | 0) | wall_prop;
}

/* C objnam.c:3918 dbterrainmesg() */
async function dbterrainmesg(newtype, x, y) {
    const lev = game.level?.at(x, y);
    await pline(`${newtype} ${((lev.typ | 0) === DRAWBRIDGE_UP) ? 'in front of' : 'under'} the drawbridge.`);
}

/* C objnam.c:3554-3916 wizterrainwish() — wizard-mode trap and terrain wishes.
 * `d` carries the preparse flags (blessed/looted/doorless/locked/closed/open/
 * broken/trapped).  Returns hands_obj when a wish was consumed, else null. */
async function wizterrainwish(bp, d) {
    const u = game.u;
    const x = u.ux | 0, y = u.uy | 0;
    let madeterrain = false, badterrain = false;

    for (let trap = NO_TRAP + 1; trap < TRAPNUM; trap++) {
        let tname = trapname(trap, true);
        if (!bp.toLowerCase().startsWith(tname.toLowerCase())) continue;
        /* found it; avoid stupid mistakes */
        if (is_hole(trap) && !Can_fall_thru(u.uz)) trap = ROCKTRAP;
        const t = await maketrap(x, y, trap);
        if (t) {
            const actual = t.ttyp | 0;
            tname = trapname(actual, true);
            await pline(`${An(tname)}${actual !== MAGIC_PORTAL ? '' : ' to nowhere'}.`);
        } else {
            await pline(`Creation of ${an(tname)} failed.`);
        }
        return hands_obj;
    }

    /* furniture and terrain (use at your own risk) */
    const lev = game.level?.at(x, y);
    if (!lev) return null;
    const oldtyp = lev.typ | 0;
    const is_dbridge = (oldtyp === DRAWBRIDGE_DOWN || oldtyp === DRAWBRIDGE_UP);
    const lc = bp.toLowerCase();
    const ends = (s) => lc.endsWith(s);
    const starts = (s) => lc.startsWith(s);
    const is_lava_t = (t) => t === LAVAPOOL || t === LAVAWALL;

    if (ends('fountain')) {
        lev.typ = FOUNTAIN;
        if (oldtyp !== FOUNTAIN) game.level.flags.nfountains = (game.level.flags.nfountains | 0) + 1;
        lev.looted = d.looted ? F_LOOTED : 0;
        lev.blessedftn = (d.blessed || starts('magic ')) ? 1 : 0;
        await pline(`A ${lev.blessedftn ? 'magic ' : ''}fountain.`);
        madeterrain = true;
    } else if (ends('throne')) {
        lev.typ = THRONE;
        lev.looted = d.looted ? T_LOOTED : 0;
        await pline('A throne.');
        madeterrain = true;
    } else if (ends('sink')) {
        lev.typ = SINK;
        if (oldtyp !== SINK) game.level.flags.nsinks = (game.level.flags.nsinks | 0) + 1;
        lev.looted = d.looted ? (S_LPUDDING | S_LDWASHER | S_LRING) : 0;
        await pline('A sink.');
        madeterrain = true;
    /* ("water" matches "potion of water" rather than terrain) */
    } else if (ends('pool') || ends('moat') || ends('wall of water')) {
        const ltyp = ends('pool') ? POOL : ends('moat') ? MOAT : WATER;
        if (!is_dbridge) {
            lev.typ = ltyp;
            lev.flags = 0;
        } else {
            lev.drawbridgemask = ((lev.drawbridgemask | 0) & ~DB_UNDER) | DB_MOAT;
        }
        del_engr_at(x, y);
        if (!is_dbridge) {
            const hr = (u.uprops[HALLUC_RES] = u.uprops[HALLUC_RES] || {});
            const save_prop = hr.extrinsic;
            hr.extrinsic = 1; /* EHalluc_resistance = 1 */
            const new_water = waterbody_name(x, y);
            hr.extrinsic = save_prop;
            await pline(`${An(new_water)}.`);
        } else {
            await dbterrainmesg('Moat', x, y);
        }
        await water_damage_chain(game.level.levelObjects[x][y], true);
        madeterrain = true;
    /* also matches "molten lava" */
    } else if (ends('lava') || ends('wall of lava')) {
        const ltyp = ends('wall of lava') ? LAVAWALL : LAVAPOOL;
        if (!is_dbridge) {
            lev.typ = ltyp;
            lev.flags = 0;
        } else {
            lev.drawbridgemask = ((lev.drawbridgemask | 0) & ~DB_UNDER) | DB_LAVA;
        }
        del_engr_at(x, y);
        if (!is_dbridge) {
            await pline(`A ${(lev.typ | 0) === LAVAPOOL ? 'pool' : 'wall'} of molten lava.`);
            const p = (i) => u.uprops?.[i];
            const lf = (i) => !!(((p(i)?.intrinsic | 0) || (p(i)?.extrinsic | 0)) && !(p(i)?.blocked | 0));
            if (!(lf(LEVITATION) || lf(FLYING)) || (lev.typ | 0) === LAVAWALL)
                await pooleffects(false);
        } else {
            await dbterrainmesg('Lava', x, y);
        }
        await fire_damage_chain(game.level.levelObjects[x][y], true, true, x, y);
        madeterrain = true;
    } else if (ends('ice')) {
        if (!is_dbridge) {
            lev.typ = ICE;
            /* icedpool overloads flags; specifies what ice will melt into */
            lev.icedpool = (oldtyp === ROOM) ? ICED_POOL : ICED_MOAT;
        } else {
            lev.drawbridgemask = ((lev.drawbridgemask | 0) & ~DB_UNDER) | DB_ICE;
        }
        del_engr_at(x, y);
        if (starts('melting '))
            start_melt_ice_timeout(x, y, 0);
        if (!is_dbridge) {
            const s = ice_descr(x, y);
            await pline(`${s.charAt(0).toUpperCase()}${s.slice(1)}.`);
        } else {
            await dbterrainmesg('Ice', x, y);
        }
        madeterrain = true;
    } else if (ends('altar')) {
        let al;
        lev.typ = ALTAR;
        if (starts('chaotic ')) al = A_CHAOTIC;
        else if (starts('neutral ')) al = A_NEUTRAL;
        else if (starts('lawful ')) al = A_LAWFUL;
        else if (starts('unaligned ')) al = A_NONE;
        else /* -1 - A_CHAOTIC, 0 - A_NEUTRAL, 1 - A_LAWFUL */
            al = !rn2(6) ? A_NONE : (rn2(A_LAWFUL + 2) - 1);
        lev.altarmask = Align2amask(al);
        const alstr = al === A_CHAOTIC ? 'chaotic' : al === A_NEUTRAL ? 'neutral'
            : al === A_LAWFUL ? 'lawful' : 'unaligned';
        await pline(`${An(alstr)} altar.`);
        madeterrain = true;
    } else if (ends('grave') || ends('headstone')) {
        make_grave(x, y, null);
        if (IS_GRAVE(lev.typ | 0)) {
            lev.looted = 0;
            lev.disturbed = d.looted ? 1 : 0;
            await pline(`A ${lev.disturbed ? 'disturbed ' : ''}grave.`);
            madeterrain = true;
        } else {
            await pline("Can't place a grave here.");
            badterrain = true;
        }
    } else if (ends('tree')) {
        lev.typ = TREE;
        lev.looted = d.looted ? (TREE_LOOTED | TREE_SWARM) : 0;
        set_wallprop_from_str(bp);
        await pline('A tree.');
        madeterrain = true;
    } else if (ends('bars')) {
        lev.typ = IRONBARS;
        lev.flags = 0;
        set_wallprop_from_str(bp);
        await pline('Iron bars.');
        madeterrain = true;
    } else if (ends('cloud')) {
        lev.typ = CLOUD;
        lev.flags = 0;
        await pline('A cloud.');
        del_engr_at(x, y);
        madeterrain = true;
    } else if (ends('door') || (d.doorless && ends('doorway'))) {
        const secret = ends('secret door');
        /* require door or wall so that the 'horizontal' flag is already right */
        const lt = lev.typ | 0;
        if (lt === DOOR || lt === SDOOR || (IS_WALL(lt) && lt !== DBWALL) || lt === IRONBARS) {
            const old_wall_info = (lt !== DOOR) ? (lev.wall_info | 0) : 0;
            lev.typ = secret ? SDOOR : DOOR;
            lev.wall_info = 0; /* overlays 'flags' */
            if (Is_rogue_level(u.uz)) {
                d.doorless = 1;
                d.locked = d.closed = d.open = d.broken = 0;
            }
            lev.doormask = d.locked ? D_LOCKED
                : (d.doorless || secret) ? D_NODOOR
                    : d.open ? D_ISOPEN
                        : d.broken ? D_BROKEN
                            : D_CLOSED;
            if (secret)
                lev.wall_info = (lev.wall_info | 0) | (old_wall_info & WM_MASK);
            if (d.trapped === 2
                || (((lev.doormask | 0) & (D_LOCKED | D_CLOSED)) === 0 && !secret))
                d.trapped = 0;
            if (d.trapped)
                lev.doormask = (lev.doormask | 0) | D_TRAPPED;
            let dbuf = '';
            const dm = lev.doormask | 0;
            if (dm & D_TRAPPED) dbuf += 'trapped ';
            if (dm & D_LOCKED) dbuf += 'locked ';
            if ((lev.typ | 0) === SDOOR) {
                dbuf += 'secret door';
            } else {
                if (dm & D_CLOSED) dbuf += 'closed ';
                if (dm & D_ISOPEN) dbuf += 'open ';
                if (dm & D_BROKEN) dbuf += 'broken ';
                if ((dm & ~D_TRAPPED) === D_NODOOR) dbuf += 'doorless doorway';
                else dbuf += 'door';
            }
            await pline(`${An(dbuf)}.`);
            madeterrain = true;
        } else {
            const dbuf = secret ? 'secret door' : 'door';
            await pline(`${dbuf.charAt(0).toUpperCase()}${dbuf.slice(1)} requires door or wall location.`);
            badterrain = true;
        }
    } else if (ends('wall') && (lc.length === 4 || lc[lc.length - 5] === ' ')) {
        let wall = HWALL;
        if ((isok(x, y - 1) && IS_WALL(game.level.at(x, y - 1).typ | 0))
            || (isok(x, y + 1) && IS_WALL(game.level.at(x, y + 1).typ | 0)))
            wall = VWALL;
        madeterrain = true;
        lev.typ = wall;
        lev.flags = 0;
        set_wallprop_from_str(bp);
        const sx2 = Math.min(COLNO, x + 1), sy2 = Math.min(ROWNO, y + 1);
        /* C mkmaze.c:fix_wall_spines sanity check: y2 == ROWNO (hero on the
         * bottom row) or x2 == COLNO is a panic, so "A wall." never prints. */
        if (sx2 >= COLNO || sy2 >= ROWNO)
            await panic(`wall_extends: bad bounds (${Math.max(0, x - 1)},${Math.max(0, y - 1)}) to (${sx2},${sy2})`);
        fix_wall_spines(Math.max(0, x - 1), Math.max(0, y - 1), sx2, sy2);
        await pline('A wall.');
    } else if (ends('secret corridor')) {
        if ((lev.typ | 0) === CORR) {
            lev.typ = SCORR;
            await pline('Secret corridor.');
            madeterrain = true;
        } else {
            await pline('Secret corridor requires corridor location.');
            badterrain = true;
        }
    } else if (ends('room') || ends('floor') || ends('ground')) {
        if (oldtyp === ROOM
            || (IS_FURNITURE(oldtyp)
                // C rm.h:320 CAN_OVERWRITE_TERRAIN permits the debug override.
                && (game.iflags?.debug_overwrite_stairs
                    || (oldtyp !== LADDER && oldtyp !== STAIRS)))
            || oldtyp === ICE || is_pool_or_lava(x, y)) {
            lev.typ = ROOM;
            await pline('Room floor.');
            if (IS_FURNITURE(oldtyp)) count_level_features();
            const t = t_at(x, y);
            if (t && (t.ttyp | 0) !== MAGIC_PORTAL) deltrap(t);
            madeterrain = true;
        } else if (is_dbridge) {
            lev.drawbridgemask = ((lev.drawbridgemask | 0) & ~DB_UNDER) | DB_FLOOR;
            await dbterrainmesg('Floor', x, y);
            madeterrain = true;
        } else {
            await pline('Room|floor|ground not allowed here.');
            badterrain = true;
        }
    }

    if (madeterrain) {
        feel_newsym(x, y); /* map the spot where the wish occurred */
        if (u.uinwater && !is_pool(u.ux, u.uy)) {
            await set_uinwater(0);
            await docrt(true);
        } else {
            if (u.utrap && (u.utraptype | 0) === TT_LAVA && !is_lava_t(game.level.at(u.ux, u.uy).typ | 0))
                await reset_utrap(false);
            recalc_block_point(x, y);
        }
        if (IS_FOUNTAIN(oldtyp) || IS_SINK(oldtyp))
            count_level_features();
        if (!is_ice(x, y))
            spot_stop_timers(x, y, MELT_ICE_AWAY);
        if (IS_FOUNTAIN(oldtyp) || IS_GRAVE(oldtyp)
            || IS_WALL(oldtyp) || oldtyp === IRONBARS
            || IS_DOOR(oldtyp) || oldtyp === SDOOR) {
            const nt = lev.typ | 0;
            if (!IS_FOUNTAIN(nt) && !IS_GRAVE(nt) && !IS_DOOR(nt) && nt !== SDOOR)
                lev.horizontal = 0;
        }
        await switch_terrain();
    }
    if (madeterrain || badterrain)
        return hands_obj;
    return null;
}
