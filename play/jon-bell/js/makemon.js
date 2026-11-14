import { S_HUMAN_MLET } from './const.js';
import { _UNICORN_HORN, WAN_DIGGING_OTYP, SCR_TELEPORTATION_OTYP, WAN_CREATE_MONSTER_OTYP, SCR_CREATE_MONSTER_OTYP, POT_FULL_HEALING_OTYP, POT_EXTRA_HEALING_OTYP, POT_HEALING_OTYP, POT_SICKNESS_OTYP } from './const.js';
import { WAN_MAGIC_MISSILE, WAN_STRIKING, WAN_TELEPORTATION, WAN_UNDEAD_TURNING } from './muse.js';
import { MUSE_WAN_DEATH, MUSE_WAN_SLEEP, MUSE_WAN_FIRE, MUSE_WAN_COLD, MUSE_WAN_LIGHTNING, MUSE_WAN_MAGIC_MISSILE, MUSE_WAN_STRIKING, MUSE_POT_PARALYSIS, MUSE_POT_BLINDNESS, MUSE_POT_CONFUSION, MUSE_FROST_HORN, MUSE_FIRE_HORN, MUSE_POT_ACID, MUSE_WAN_TELEPORTATION, MUSE_POT_SLEEPING, MUSE_SCR_EARTH, MUSE_CAMERA, MUSE_WAN_UNDEAD_TURNING } from './muse.js';
import { impossible_sync } from './display.js';
import { pline_The, urgent_pline } from './pline.js';
import { pline_mon } from './pline.js';
import { Mgender } from './do_name.js';
import { ledger_no } from './dungeon.js';
import { On_W_tower_level, has_ceiling, dunlevs_in_dungeon } from './dungeon.js';
import { In_W_tower_wz } from './dochug.js';
import { pooleffects_is_lava as is_lava_real, HAND} from './cmd.js';
import { makeplural } from './objnam.js';
import { expels_gu } from './mhitu.js';
import { stop_occupation } from './allmain.js';
import { mbhit_wand, mzapwand } from './muse.js';
import { copy_oextra, free_omid, get_mtraits, unbless } from './mkobj.js';
import { t_at } from './trap.js';
import { linedup, blocking_terrain } from './mthrowu.js';
import { newobj } from './game.js';
import { M_AP_TYPMASK, M_AP_NOTHING, M_AP_MONSTER, M_AP_FURNITURE, M_AP_OBJECT, Is_knox_level,
         STAIRS, LADDER, W_NONDIGGABLE, W_ARMH, TELEP_TRAP,
         W_ARMC, W_ARMG, W_ARMF, W_ARMU } from './const.js';
import { PM_LIZARD, PM_ICE_TROLL, PM_BAT, PM_GIANT_BAT, PM_VAMPIRE_BAT, PM_STALKER } from './pm.generated.js';
import { PM_FLAMING_SPHERE as PM_FLAMING_SPHERE_EL,
         PM_SHOCKING_SPHERE as PM_SHOCKING_SPHERE_EL,
         PM_BABY_GOLD_DRAGON as PM_BABY_GOLD_DRAGON_EL,
         PM_FIRE_VORTEX as PM_FIRE_VORTEX_EL,
         PM_FIRE_ELEMENTAL as PM_FIRE_ELEMENTAL_EL,
         PM_GOLD_DRAGON as PM_GOLD_DRAGON_EL } from './pm.generated.js';
import { goodpos } from './teleport.js';
import { m_carrying } from './mthrowu.js';
import { worm_move, see_wsegs as see_wsegs_real } from './worm.js';
// @ts-nocheck
// makemon.c — rndmonst_adj / rndmonnum_adj / mkclass / qt_montype (RNG parity).
// C ref: makemon.c rndmonst_adj (~1661), mkobj.c rndmonnum_adj (~396),
// questpgr.c qt_montype (~637), makemon.c mkclass_aligned (~1879).
// Monster rows generated from nethack-c/include/monsters.h (see makemon_mons.json).
// @ts-nocheck — JSON rows + js sibling imports.
import monsPack from './makemon_mons.json' with { type: 'json' };
import monArmedPack from './makemon_mons_armed.json' with { type: 'json' };
import monMsizePack from './makemon_msize.json' with { type: 'json' };
import monMrPack from './makemon_mr.json' with { type: 'json' };
import monMattkPack from './makemon_mattk.json' with { type: 'json' };
import monMsoundPack from './makemon_msound.json' with { type: 'json' };
import monPmnamesPack from './makemon_pmnames.json' with { type: 'json' };
import { registerStaticReset } from './statics.js';
import monMconveysPack from './makemon_mconveys.json' with { type: 'json' };
import { rn1, pushRngLogEntry } from './rng.js';
import { rn2, rnd, d, rn2_on_display_rng } from './rnd.js';
import { game, wizard, discover } from './gstate.js';
import { obj_split_timers, age_is_relative, stop_timer, begin_burn } from './timeout.js';
import { obj_split_light_source } from './light.js';
import { artifact_light } from './artifact.js';
import { depth as depth_of_level, deepest_lev_reached } from './dungeon.js';
import { W_ARMOR, W_ACCESSORY, TRAPNUM, NO_TRAP, FLYING, LEVITATION, BLINDED, P_DAGGER, P_KNIFE } from './const.js';
import { BILLSZ, ROT_CORPSE, AGGRAVATE_MONSTER } from './const.js';
import { DEFSYM_EXPLANATION } from './defsym_data.js';
import { rank_of_roleidx } from './rank_data.js';
import { is_hole, is_pit, WEB, BEAR_TRAP } from './const.js';
import { LAVAPOOL, LAVAWALL, DRAWBRIDGE_UP, DB_UNDER, DB_LAVA } from './const.js';
import { Unaware } from './display.js';
import { flash_mon } from './mon.js';
import { Norep, You_hear, You_feel } from './pline.js';
import { In_endgame, In_sokoban, Is_astralevel, Is_waterlevel, Is_firelevel, Is_earthlevel, Is_airlevel, Is_rogue_level, In_mines, MM_FEMALE, MM_MALE, NO_MINVENT, W_SADDLE, I_SPECIAL, COLNO, ROWNO, isok, SEE_INVIS, TELEPORT_CONTROL, STRANGLED, OBJ_MINVENT, REFLECTING, W_ARMS, W_WEP, W_AMUL, W_ARM, OBJ_FREE, OBJ_FLOOR, OBJ_LUAFREE, OBJ_INVENT, MIGR_RANDOM, NC_VIA_WAND_OR_SPELL, NC_SHOW_MSG, POLY_TRAP, Upolyd, IS_ALTAR, DISPLACED, FOOT, In_V_tower, RLOC_MSG, OBJ_CONTAINED, IS_FURNITURE, IS_DRAWBRIDGE, PIT, HOLE, FORCEBUNGLE } from './const.js';
import { NO_MM_FLAGS, MM_ADJACENTOK, MM_NOWAIT, G_EXTINCT } from './const.js';
import { OC_COST } from './oc_cost_data.js';
import { MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js';
import { MKOBJ_OC_SKILL } from './mkobj_erosion_meta.js';

import { mwelded } from './wield.js';
import { PM_GIANT_EEL, PM_LONG_WORM, PM_ACID_BLOB, PM_CROCODILE } from './pm.generated.js';
import { PM_SILVER_DRAGON, PM_GRAY_DRAGON, PM_STRAW_GOLEM, PM_IRON_GOLEM, PM_DEATH, PM_PESTILENCE, PM_FAMINE, PM_MINOTAUR, PM_KI_RIN, PM_COCKATRICE, PM_CHICKATRICE, PM_GREMLIN, PM_VROCK, PM_ANGEL } from './pm.generated.js';
/* m_initinv's is_mercenary() arm (C makemon.c:606-632 switch (monsndx(ptr))). */
import { PM_GUARD, PM_SOLDIER, PM_SERGEANT, PM_LIEUTENANT, PM_CAPTAIN,
         PM_WATCHMAN, PM_WATCH_CAPTAIN } from './pm.generated.js';
/* ARM_BONUS(obj) reads objects[otyp].a_ac (hack.h:1526). */
import { ARMOR_DATA } from './armor_data.js';
import { aligns } from './roles.js';
import { MKOBJ_OC_PROB } from './mkobj_data.js';
/* mquaffmsg (muse.c:292) helpers — see the port below. */
import { DEAF, MM_NOMSG } from './const.js';
import { verbalize } from './cmd.js';
import { set_msg_xy as set_msg_xy_mm } from './pline.js';
import { a_monnam } from './do_name.js';
import { is_youmonst } from './mhitm.js';
import { attacktype, dmgtype } from './mondata.js';
import { rndmonnam } from './do_name.js';
import { paralyze_monst } from './mhitm.js';
import { observe_object, discover_object } from './o_init.js';
import { g_at } from './invent.js';
import { surface, ceiling } from './dungeon.js';
import { docall } from './do_name.js';
import { sp_levchn_lookup, S_ZOMBIE } from './mklev.js';
import { mksobj, next_ident, set_corpsenm, add_to_container, set_bknown, start_corpse_timeout, start_glob_timeout } from './mkobj.js';
import { engr_at } from './engrave.js';
import { Can_dig_down } from './dungeon.js';
import { stairway_at, stairway_find_special_dir } from './stairs.js';
import './m_initweap.js';
import { builds_up } from './dungeon.js';
import { ESHK } from './const.js';
import { oid_price_adjustment, inhishop, shop_keeper, onbill } from './shk.js';
import { inhistemple, in_your_sanctuary } from './priest.js';
import { force_more, force_more_pages, newsym, canspotmon, canseemon, map_invisible, sensemon, cls, docrt, show_glyph, show_monster_glyph_at, display_self } from './display.js';
import { debugcore } from './files.js';
import { rank_of as rank_of_mnum } from './botl.js';
import { pline, urgent_pline as urgent_pline_disp } from './pline.js';
/* create_critters (makemon.c:1556) reaches these two; both are cyclic imports
 * (teleport.js and wizcmds.js each import this file) but every binding used is
 * a hoisted function declaration, so the cycle resolves. */
import { enexto_out } from './teleport.js';
import { create_particular } from './read.js';
import { helpless } from './mhitm.js';
import { YMonnam, Some_Monnam, Adjmonnam, y_monnam, noit_mon_nam, mon_nam_too } from './do_name.js';
import { s_suffix } from './hacklib.js';
import { update_inventory } from './invent.js';
import { little_to_big, mon_hates_silver, locomotion, poly_when_stoned, can_blow, resists_blnd } from './mondata.js';
import { m_at } from './uhitm.js';
import { mon_nam } from './do_name.js';
import { unconscious } from './trap.js';
import { an, the, makesingular, vtense, singular, doname, distant_name, ansimpleoname, bare_artifactname } from './objnam.js';
/* mloot_container (muse.c:2264, use_misc's MUSE_BAG arm) needs C's shared
 * can_carry(mon, obj) — the same function dog.c's pet-pickup path calls.
 * Creates a bidirectional import cycle with js/dogmove.js (which already
 * imports several exports FROM this file); resolves fine because both sides
 * bind a hoisted function declaration, the same pattern already used for the
 * teleport.js / wizcmds.js cycle above. */
import { mondied_dm, dog_nutrition } from './dogmove.js';
import { can_carry } from './mon.js';
import { def_char_to_monclass } from './drawing.js';
import { weight } from './weight.js';
import { Monnam } from './do_name.js';
import { couldsee, cansee, recalc_block_point } from './vision.js';
import { monkilled_trap, seetrap, mintrap, maketrap, fill_pit } from './trap.js';
import { mon_learns_traps, mon_knows_traps } from './mondata.js';
export { mon_knows_traps };
import { m_useup } from './mthrowu.js';
import { extract_from_minvent } from './worn.js';
import { place_monster, impossible as impossible_steed } from './steed.js';
import { impossible as bill_impossible } from './pline.js';
import { maybe_unhide_at, add_to_minv, obj_extract_self, obfree } from './dokick.js';
import { is_drawbridge_wall } from './dbridge.js';
import { body_part, mbodypart } from './cmd.js';
import { freeinv } from './invent.js';
import { welded } from './wield.js';
import { trycall } from './do.js';
import { remove_worn_item } from './steal.js';
import { setnotworn } from './worn.js';
import { dropy } from './do.js';
import { resists_ston } from './mklev.js';
import { place_object, unknow_object } from './mkobj.js';
import { mpickobj } from './steal.js';
import { Can_fall_thru } from './dungeon.js';
import { upstart, dist2 } from './hacklib.js';
/* C obj.h:257 bimanual(otmp) — one shared body; this file already imports
 * from do_wear.js on this line, so no module edge is added. */
import { hard_helmet, bimanual } from './do_wear.js';
import { xname } from './objnam.js';
import { yname } from './objnam.js';
import { migrate_to_level, sticks } from './dog.js';
import { unstuck } from './mon.js';
/* use_defensive()'s dependencies (C muse.c:795-1221).  Is_botlevel and
 * mon_has_amulet were already READ by find_defensive() above (js/makemon.js
 * :3667, :3679) with no binding in scope at all — a ReferenceError waiting on
 * the first monster to reach the wand-of-digging or wand-of-teleportation arm
 * of its inventory scan.  Binding them is part of this change, not a
 * refactor. */
import { Is_botlevel, MIGR_STAIRS_UP, MIGR_STAIRS_DOWN, MIGR_LADDER_UP, MIGR_LADDER_DOWN, MIGR_SSTAIRS, FORCETRAP, SCORR, CORR } from './const.js';
import { mon_has_amulet } from './wizard.js';
/* mreadmsg() (muse.c:236-284, use_defensive's MUSE_SCR_TELEPORTATION arm)
 * needs same_race (mondata.c:770) for its unseen-monster description, and
 * x_monnam (do_name.c) to build that description; both are already ported in
 * js/mhitm.js beside the other muse.c helpers this file already imports from
 * there. */
import { x_monnam } from './do_name.js';
import { same_race } from './mondata.js';
/* C include/flag.h:530-543 enum plnmsg_types — this file only needs the
 * count-sentinel PLNMSG_enum ("none of the above"), computed the same way
 * js/const.js derives every other member: one past the last named entry. */
import { PLNMSG_MON_TAKES_OFF_ITEM } from './const.js';
import { title_to_mon } from './botl.js';  /* C botl.c:366 — name_to_monplus's rank-title fallback */
/* C mondata.c:1191 pronoun_gender() — mhe()'s body below. */
import { pronoun_gender as pronoun_gender_mm } from './mondata.js';
import { bcsign } from './mkobj.js';
import { mongone, healmon, newcham, get_iter_mons as get_iter_mons_real, monnear } from './mon.js';
import { mon_has_special } from './wizard.js';
import { unblock_point } from './vision.js';
import { dunlev } from './dungeon.js';
/* monflee (monmove.c:461) helpers — see the port below. */
import { create_gas_cloud } from './region.js';
import { mon_track_clear, mon_would_take_item } from './monmove.js';
/* C muse.c:1342-1415 hero_behind_chokepoint / mon_likes_objpile_at deps. */
import { xytodir, dirtocoord } from './cmd.js';
import { random_teleport_level } from './teleport.js';
import { get_level } from './dungeon.js';
import { is_pool } from './look.js';
import { accessible } from './monmove.js';
import { is_ice } from './engrave.js';
import { money_cnt } from './hack.js';
import { on_level } from './dungeon.js';
import { rloc, tele_restrict } from './teleport.js';
import { mon_adjust_speed } from './worn.js';
/** @typedef {[number, number, number, number, number, number, number, number, number]} MonRow */
export const MONS = /** @type {MonRow[]} */ (monsPack.mons);
const SPECIAL_PM = /** @type {number} */ (monsPack.special_pm);
/** C mondata.h is_armed — attacktype(ptr, AT_WEAP); one row per monsters.h MON() */
const MON_HAS_WEAP_ATK = /** @type {number[]} */ (monArmedPack.has_weap_atk);
/** C permonst.msize (MZ_*) per MON() row order — js/makemon_msize.json (gen-mons-msize.mjs). */
const MONS_MSIZE = /** @type {number[]} */ (monMsizePack.msize);
const MONS_MR = /** @type {number[]} */ (monMrPack.mr);
/** C permonst.mattk[NATTK] per MON() row — js/makemon_mattk.json (gen-mons-mattk.mjs).
 * Each row is 6 × {aatyp, adtyp, damn, damd}. Aligned to MONS via the audit filter. */
const MONS_MATTK = /** @type {{aatyp:number,adtyp:number,damn:number,damd:number}[][]} */ (monMattkPack.mattk);
import { NATTK } from './const.js';
/** C permonst.msound (MS_*) per MON() row — js/makemon_msound.json (gen-mons-msound.mjs). */
const MONS_MSOUND = /** @type {number[]} */ (monMsoundPack.msound);
/** C permonst.pmnames[NUM_MGENDERS] per MON() row — js/makemon_pmnames.json
 * (gen-mons-pmnames.mjs). Each row is [MALE, FEMALE, NEUTRAL]; NAM() rows are
 * [null, null, name], NAMS() rows carry all three. Aligned to MONS via the
 * audit filter. */
const MONS_PMNAMES = /** @type {(string|null)[][]} */ (monPmnamesPack.pmnames);
/** C permonst.mconveys (MR_* "resistances conferred" mask, mr2 in MON()) per
 * MON() row — js/makemon_mconveys.json (gen-mons-mconveys.mjs). */
const MONS_MCONVEYS = /** @type {number[]} */ (monMconveysPack.mconveys);
/* C monflag.h enum mgender { MALE, FEMALE, NEUTRAL, NUM_MGENDERS } */
import { NUM_MGENDERS } from './mondata.js';
import { NEUTRAL } from './const.js';
import { MALE } from './const.js';
import { FEMALE } from './const.js';
import { AT_BOOM } from './mhitm.js'; /* C monattk.h: explodes when killed */
import { AT_ANY } from './mondata.js'; /* C monattk.h: dmgtype_fromattack wildcard */
import { AD_ANY } from './mondata.js'; /* C monattk.h: attacktype_fordmg wildcard */
/** C mondata.h is_armed(ptr) — m_initweap is skipped when false (makemon.c:1442–1444). */
export function isArmedMndx(mndx) {
    const i = mndx | 0;
    return i >= 0 && i < MON_HAS_WEAP_ATK.length && MON_HAS_WEAP_ATK[i] !== 0;
}
export const NON_PM = -1;
import { LOW_PM } from './const.js';
const NUMMONS = MONS.length;
const MAXMCLASSES = 61;
const G_FREQ = 7;
const G_NOHELL = 0x0800;
const G_HELL = 0x0400;
const G_NOGEN = 0x0200;
export const G_UNIQ = 0x1000;
const G_IGNORE = 0x8000;
export const G_GENOD = 0x02;
const G_GONE = G_GENOD | 0x01;
const MR_FIRE = 0x01;
const MR_COLD = 0x02;
const M1_FLY = 0x00000001;
const M1_SWIM = 0x00000002;
const M1_AMORPHOUS = 0x00000004;
/** C monflag.h */
import { M1_HUMANOID } from './polyself.js';
/** C monflag.h */
const M1_UNSOLID = 0x00100000;
const M1_AMPHIBIOUS = 0x00000200;
const M1_BREATHLESS = 0x00000400;
import { M1_NOHEAD } from './mondata.js';
const A_NONE = -128;
const A_NEUTRAL = 0;
const AM_NONE = 0x00;
const AM_LAWFUL = 0x04;
const AM_NEUTRAL = 0x02;
const AM_CHAOTIC = 0x01;
const ALIGNWEIGHT = 4;
const PM_AIR_ELEMENTAL = 154;
const PM_FIRE_ELEMENTAL = 155;
const PM_EARTH_ELEMENTAL = 156;
const PM_WATER_ELEMENTAL = 157;
const PM_WIZARD_OF_YENDOR = 285; /* monsters.h MON(... WIZARD_OF_YENDOR); was 291 = PM_HORNED_DEVIL */
const S_ELEMENTAL = 31;
/** C monst.h MZ_MEDIUM (can_saddle: steeds must be >= MZ_MEDIUM). */
const MZ_MEDIUM = 2;
const M2_DEMON = 0x00000100;
const M2_PNAME = 0x00080000;
import { S_IMP } from './mondata.js';
import { S_VAMPIRE } from './mondata.js';
export const PM_HIGH_CLERIC = 276; /* C PM_HIGH_CLERIC = js PM_HIGH_PRIEST */
import { PM_LONG_WORM_TAIL } from './pm.generated.js';
/** C defsym.h MONSYM — S_DRAGON */
const S_DRAGON = 30;
/** C defsym.h MONSYM — S_GOLEM */
import { S_GOLEM } from './mondata.js';
const S_TRAPPER = 20;
import { S_EYE } from './mondata.js';
import { S_LIGHT } from './mondata.js';
const S_VORTEX = 22;
const S_GHOST = 54;
const S_LICH = 38;
/** C defsym.h MONSYM — ridable quadrupeds etc. (steed.c steeds[]) */
const S_QUADRUPED = 17;
const S_UNICORN = 21;
/* C ref: mondata.h is_unicorn(ptr) = (ptr)->mlet == S_UNICORN
 *                                    && ((ptr)->mflags2 & M2_JEWELS).
 * find_defensive() below (js/makemon.js, C muse.c:482) called is_unicorn with
 * NO definition and no import in this module, so the moment a monster reached
 * the unicorn-horn arm the scored run died with a bare
 * `ReferenceError: is_unicorn is not defined` rather than a named port gap.
 * Body transcribed from js/mklev.js:5187, which carries the identical one but
 * does not export it. */
const M2_JEWELS_MM = 0x20000000;
export function is_unicorn(ptr) {
    return !!ptr && (ptr.mlet | 0) === S_UNICORN
        && ((ptr.mflags2 >>> 0) & M2_JEWELS_MM) !== 0;
}
const S_ANGEL = 27;
const S_CENTAUR = 29;
const S_JABBERWOCK = 36;
/** C monflag.h M2_DOMESTIC — makemon domestic saddle branch */
const M2_DOMESTIC = 0x00400000;
const STEED_MLET = new Set([
    S_QUADRUPED,
    S_UNICORN,
    S_ANGEL,
    S_CENTAUR,
    S_DRAGON,
    S_JABBERWOCK,
]);
/** def_monsyms[].sym — monster class display character by monsym index (defsym.h MONSYM order).
 * Index 55 (S_GOLEM) is an APOSTROPHE — defsym.h:359 writes it as the escaped
 * char literal '\'' — not a backslash.  Inert on this table's only reader (the
 * `upper` A-Z filter below excludes both), fixed to keep the two copies of the
 * table identical to js/display.js's, where it was live. */
const DEF_MONSYM_CHARS = '?abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@ \'&;:~]';
/** C mondata.h is_placeholder: PM_ORC=72, PM_GIANT=169, PM_HUMAN=260, PM_ELF=264 (from pm.generated.js). */
const PLACEHOLDER = new Set([72, 169, 260, 264]);
const ROLE_QUEST = [
    /*  0 Archeologist */ { enemy1num: NON_PM, enemy2num: 192, enemy1sym: 45, enemy2sym: 39 }, /* random / human mummy */
    /*  1 Barbarian    */ { enemy1num: 203, enemy2num: 220, enemy1sym: 41, enemy2sym: 46 }, /* ogre / troll */
    /*  2 Caveman      */ { enemy1num:  45, enemy2num: 171, enemy1sym:  8, enemy2sym: 34 }, /* bugbear / hill giant */
    /*  3 Healer       */ { enemy1num:  89, enemy2num: 215, enemy1sym: 18, enemy2sym: 51 }, /* giant rat / snake */
    /*  4 Knight       */ { enemy1num:  54, enemy2num:  58, enemy1sym:  9, enemy2sym: 10 }, /* quasit / ochre jelly */
    /*  5 Monk         */ { enemy1num: 156, enemy2num: 232, enemy1sym: 31, enemy2sym: 50 }, /* earth elemental / xorn */
    /*  6 Priest       */ { enemy1num: 244, enemy2num: 230, enemy1sym: 52, enemy2sym: 49 }, /* human zombie / wraith */
    /*  7 Rogue        */ { enemy1num:  63, enemy2num: 202, enemy1sym: 14, enemy2sym: 40 }, /* leprechaun / guardian naga */
    /*  8 Ranger       */ { enemy1num: 131, enemy2num:  97, enemy1sym: 29, enemy2sym: 19 }, /* forest centaur / scorpion */
    /*  9 Samurai      */ { enemy1num:  20, enemy2num: 153, enemy1sym:  4, enemy2sym: 31 }, /* wolf / stalker */
    /* 10 Tourist      */ { enemy1num:  96, enemy2num: 131, enemy1sym: 19, enemy2sym: 29 }, /* giant spider / forest centaur */
    /* 11 Valkyrie     */ { enemy1num:   3, enemy2num: 172, enemy1sym:  1, enemy2sym: 34 }, /* fire ant / fire giant */
    /* 12 Wizard       */ { enemy1num: 129, enemy2num: 232, enemy1sym: 28, enemy2sym: 49 }, /* vampire bat / xorn */
];
/** @type {number[] | null} */
let mongenOrder = null;
/** @type {number[] | null} */
let mclassMaxf = null;
function initMongenOrder() {
    if (mongenOrder)
        return;
    const n = NUMMONS;
    const order = Array.from({ length: n }, (_, i) => i);
    /* C: qsort(mongen_order, SPECIAL_PM, ...) — only the first SPECIAL_PM
       entries are sorted; indices SPECIAL_PM..NUMMONS-1 keep identity mapping.
       Sorting all NUMMONS together inserts player-monster entries (index >=
       SPECIAL_PM) into the regular range, breaking MONSi() for every class
       after the first out-of-range entry (mlet=19, idx=364 at position 98). */
    const firstPart = order.slice(0, SPECIAL_PM).sort((i1, i2) => {
        const d1 = (MONS[i1][2] | 0) | (MONS[i1][0] << 8);
        const d2 = (MONS[i2][2] | 0) | (MONS[i2][0] << 8);
        return d1 - d2;
    });
    for (let i = 0; i < SPECIAL_PM; i++) order[i] = firstPart[i];
    mongenOrder = order;
    const maxf = new Array(MAXMCLASSES).fill(0);
    for (let i = 0; i < n; i++) {
        const ml = MONS[i][0];
        const f = MONS[i][3] & G_FREQ;
        if (f > maxf[ml])
            maxf[ml] = f;
    }
    mclassMaxf = maxf;
}
/** @param {number} i */
function MONSi(i) {
    initMongenOrder();
    return mongenOrder[i];
}
export function levelDifficulty() {
    const uz = game.u?.uz;
    if (!uz)
        return 1;
    let res;
    if (In_endgame(uz)) {
        const sanctum = game.sanctum_level;
        const depthSanctum = sanctum ? depth_of_level(sanctum) : 1;
        res = depthSanctum + Math.trunc((game.u?.ulevel ?? 1) / 2);
    }
    else if (game.u?.uhave?.amulet) {
        // C dungeon.c:2033 includes quest depth when carrying the Amulet.
        res = deepest_lev_reached(false);
    }
    else {
    res = depth_of_level(uz);
    if (builds_up(uz)) {
        const dun = game.dungeons?.[uz.dnum];
        const entryLev = dun?.entry_lev ?? 1;
        res += 2 * (entryLev - uz.dlevel + 1);
    }
    }
    /* C dungeon.c:2078-2080 — ring of aggravate monster (EAggravate_monster,
     * extrinsic only) doubles the difficulty, capped at 50 above depth 25. */
    if (game.u?.uprops?.[AGGRAVATE_MONSTER]?.extrinsic | 0)
        res = res > 25 ? 50 : res * 2;
    return res;
}
export function Inhell() {
    const flags = game.dungeons?.[game.u?.uz?.dnum]?.flags;
    if (flags && flags.hellish !== undefined)
        return !!flags.hellish;
    const gd = game.gehennom_dnum;
    return gd !== undefined && gd !== null && game.u?.uz?.dnum === gd;
}
/* C ref: makemon.c:1622 align_shift()'s NULL-lev arm,
 *      svd.dungeons[u.uz.dnum].flags.align
 * which is UNCONDITIONALLY ZERO for every dungeon.  dungeon.h:21 declares the
 * field `Bitfield(align, 3)` — three bits — while dungeon.c:1092 assigns it
 * `dgn_align`, which get_dgn_align() returns already SHIFTED
 * (dgn_file.h:63-65, D_ALIGN_CHAOTIC = AM_CHAOTIC << 4 = 0x10, NEUTRAL 0x20,
 * LAWFUL 0x40) with no unshift.  Every one of those has its only set bit at or
 * above bit 4, so storing it in a 3-bit field truncates to 0.  The per-LEVEL
 * word is different and is NOT always zero: dungeon.c:588 unshifts it
 * (`(tlevel->flags & D_ALIGN_MASK) >> 4`) before storing, which is why
 * lev->flags.align above is read for real.
 * (The same truncation is documented and C-tested at js/sp_lev.js:4415 for
 * induced_align's second arm.) */
function dungeonAlign() {
    return AM_NONE;
}
/* C ref: makemon.c:1613-1614 align_shift()'s two function statics.
 *      static NEARDATA long oldmoves = 0L;
 *      static NEARDATA s_level *lev;
 * Both are C statics, so `oldmoves` starts at 0 and `lev` at NULL — and C's
 * own comment on oldmoves ("!= 1, starting value of moves") is about that
 * initial value being distinguishable, not about it being unreachable.  While
 * svm.moves is still 0 (the first mklev(), which runs before u_init_role()
 * sets moves=1) the refresh NEVER fires and `lev` stays NULL for every call.
 * -1 here made the first call refresh instead.
 *
 * C caches the s_level POINTER, not the resolved alignment, and re-evaluates
 * the ternary on every call.  The NULL arm reads
 * svd.dungeons[u.uz.dnum].flags.align, which dungeonAlign() below shows is
 * unconditionally 0, so caching the pointer and re-reading is equivalent —
 * but keep the pointer so the shape matches C if that field ever becomes
 * live. */
/** @type {number} */
let alignShiftOldmoves = 0;
/** @type {{flags:{align:number}} | null} */
let alignShiftLev = null;
/* THE C STATICS OF THIS FILE, RE-INITIALISED AT THE PROCESS BOUNDARY.
 * All four are `static` in C (makemon.c:1755-1757 mongen_order / mclass_maxf /
 * mongen_order_init, makemon.c:1613-1614 align_shift's oldmoves / lev), so a
 * new C process gets them back at their declared initialisers.  js/ has no
 * process boundary, so resetGame() -> resetStatics() is it (js/statics.js).
 *
 * mongenOrder in particular MUST be dropped whenever `mons[]` is restored: it
 * is sorted on mons[].difficulty, and adj_erinys() (mon.c:5963) moves erinys'
 * difficulty 10 -> 18, so a restored table under a memo built off the bumped
 * one is a state C never has.
 *
 * Note the INVALIDATION IS ONLY AT THE BOUNDARY, deliberately.  Within one
 * process C never rebuilds mongen_order — `mongen_order_init` is a one-shot —
 * so an adj_erinys() during play leaves C's order stale for the rest of that
 * game, and rebuilding here would be a fix C does not have (Cardinal Rule 1). */
registerStaticReset('makemon.js: mongen_order / mclass_maxf / align_shift', () => {
    mongenOrder = null;
    mclassMaxf = null;
    alignShiftOldmoves = 0;
    alignShiftLev = null;
});
/** @param {MonRow} row */
function alignShift(row) {
    const moves = game.moves ?? 0;
    if (alignShiftOldmoves !== moves) {
        alignShiftLev = sp_levchn_lookup(game.u?.uz);
        alignShiftOldmoves = moves;
    }
    const alignShiftCached = alignShiftLev ? alignShiftLev.flags.align : dungeonAlign();
    const mal = row[4];
    switch (alignShiftCached) {
        default:
        case AM_NONE:
            return 0;
        case AM_LAWFUL:
            return Math.trunc((mal + 20) / (2 * ALIGNWEIGHT));
        case AM_NEUTRAL:
            return Math.trunc((20 - Math.abs(mal)) / ALIGNWEIGHT);
        case AM_CHAOTIC:
            return Math.trunc(-(mal - 20) / (2 * ALIGNWEIGHT));
    }
}
/** @param {MonRow} row */
function temperatureShift(row) {
    const t = game.level?.flags?.temperature ?? 0;
    if (!t)
        return 0;
    const mr = row[5];
    const want = t > 0 ? MR_FIRE : MR_COLD;
    return (mr & want) !== 0 ? 3 : 0;
}
/** @param {number} mndx */
function uncommon(mndx) {
    const geno = MONS[mndx][3];
    if ((geno & (G_NOGEN | G_UNIQ)) !== 0)
        return true;
    const mv = game.mvitals && game.mvitals[mndx] ? game.mvitals[mndx].mvflags | 0 : 0;
    if ((mv & G_GONE) !== 0)
        return true;
    const mal = MONS[mndx][4];
    if (Inhell())
        return mal > A_NEUTRAL;
    return (geno & G_HELL) !== 0;
}
/** @param {number} mndx */
function isPlaceholderMndx(mndx) {
    return PLACEHOLDER.has(mndx);
}
/** @param {number} mndx */
function mvitalsGone(mndx) {
    const mv = game.mvitals && game.mvitals[mndx] ? game.mvitals[mndx].mvflags | 0 : 0;
    return (mv & G_GONE) !== 0;
}
/** @param {number} mndx */
function mvitalsGenod(mndx) {
    const mv = game.mvitals && game.mvitals[mndx] ? game.mvitals[mndx].mvflags | 0 : 0;
    return (mv & G_GENOD) !== 0;
}
/** @param {number} mndx */
function wizDied(mndx) {
    if (mndx !== PM_WIZARD_OF_YENDOR)
        return 0;
    return game.mvitals?.[PM_WIZARD_OF_YENDOR]?.died ?? 0;
}
/** @param {number} mndx */
export function adjLev(mndx) {
    const row = MONS[mndx];
    const mlevel = row[1];
    if (mndx === PM_WIZARD_OF_YENDOR) {
        let tmp = mlevel + wizDied(mndx);
        if (tmp > 49)
            tmp = 49;
        return tmp;
    }
    let tmp = mlevel;
    if (tmp > 49)
        return 50;
    const ld = levelDifficulty();
    let tmp2 = ld - tmp;
    if (tmp2 < 0)
        tmp--;
    else
        tmp += Math.trunc(tmp2 / 5);
    tmp2 = (game.u?.ulevel ?? 1) - mlevel;
    if (tmp2 > 0)
        tmp += Math.trunc(tmp2 / 4);
    tmp2 = Math.trunc((3 * mlevel) / 2);
    if (tmp2 > 49)
        tmp2 = 49;
    return tmp > tmp2 ? tmp2 : tmp > 0 ? tmp : 0;
}
/** C makemon.c golemhp */
function golemHp(type) {
    switch (type) {
        case PM_STRAW_GOLEM:
            return 20;
        case PM_STRAW_GOLEM + 1:
            return 20;
        case PM_STRAW_GOLEM + 2:
            return 30;
        case PM_STRAW_GOLEM + 3:
            return 60;
        case PM_STRAW_GOLEM + 4:
            return 40;
        case PM_STRAW_GOLEM + 5:
            return 50;
        case PM_STRAW_GOLEM + 6:
            return 40;
        case PM_STRAW_GOLEM + 7:
            return 70;
        case PM_STRAW_GOLEM + 8:
            return 100;
        case PM_STRAW_GOLEM + 9:
            return 80;
        case PM_IRON_GOLEM:
            return 120;
        default:
            return 0;
    }
}
/** C mondata.h is_rider */
function isRiderMndx(mndx) {
    return mndx === PM_DEATH || mndx === PM_PESTILENCE || mndx === PM_FAMINE;
}
/** C makemon.c is_home_elemental — permonst via mndx */
function isHomeElementalMndx(mndx) {
    const uz = game.u?.uz;
    if (!uz)
        return false;
    if (MONS[mndx][0] !== S_ELEMENTAL)
        return false;
    if (mndx === PM_AIR_ELEMENTAL)
        return Is_airlevel(uz);
    if (mndx === PM_FIRE_ELEMENTAL)
        return Is_firelevel(uz);
    if (mndx === PM_EARTH_ELEMENTAL)
        return Is_earthlevel(uz);
    if (mndx === PM_WATER_ELEMENTAL)
        return Is_waterlevel(uz);
    return false;
}
export function is_home_elemental(ptr) {
    const mndx = typeof ptr === 'number' ? ptr : ((ptr?.pmidx ?? ptr?.mnum) | 0);
    return isHomeElementalMndx(mndx);
}
const S_LIGHT_ML = 25; /* defsym.h:324 MONSYM(25, 'y', LIGHT, S_LIGHT) */
export function emits_light(mdata) {
    if (!mdata) return 0;
    const pm = (mdata.pmidx != null ? mdata.pmidx
                : (mdata.mndx != null ? mdata.mndx : -1)) | 0;
    if ((mdata.mlet | 0) === S_LIGHT_ML
        || pm === PM_FLAMING_SPHERE_EL
        || pm === PM_SHOCKING_SPHERE_EL
        || pm === PM_BABY_GOLD_DRAGON_EL
        || pm === PM_FIRE_VORTEX_EL)
        return 1;
    return (pm === PM_FIRE_ELEMENTAL_EL || pm === PM_GOLD_DRAGON_EL) ? 1 : 0;
}

export function is_demon(ptr) { return (ptr.mflags2 & M2_DEMON) !== 0; }
import { type_is_pname } from './objnam.js';
/**
 * C ref: makemon.c monhp_per_lvl (987–1009).
 * Amount of HP to lose from level drain (or gain from Stormbringer).
 * Like newmonhp, but home elementals are ignored, riders use normal d8.
 *
 * @param {{ data?: { mlet?: number, mlevel?: number }, m_lev?: number, mnum?: number, mndx?: number }} mon
 * @return {number}
 */
export function monhp_per_lvl(mon) {
    const mndx = monsndx(mon);
    const row = MONS[mndx];
    const mlet = row[0];
    const ptrMlevel = row[1];
    let hp = rnd(8); /* default is d8 */

    /* like newmonhp, but home elementals are ignored, riders use normal d8 */
    if (mlet === S_GOLEM) {
        /* draining usually won't be applicable for these critters */
        hp = Math.trunc(golemHp(mndx) / ptrMlevel);
    } else if (ptrMlevel > 49) {
        /* arbitrary; such monsters won't be involved in draining anyway */
        hp = 4 + rnd(4); /* 5..8 */
    } else if (mlet === S_DRAGON && mndx >= PM_GRAY_DRAGON) {
        /* adult dragons; newmonhp() uses In_endgame(&u.uz) ? 8 : 4 + rnd(4) */
        hp = 4 + rn2(5); /* 4..8 */
    } else if (!mon.m_lev) {
        /* level 0 monsters use 1d4 instead of Nd8 */
        hp = rnd(4);
    }
    return hp | 0;
}
/**
 * C ref: makemon.c newmonhp (1013–1055).
 * Mutates mon: m_lev, mhp, mhpmax. RNG order must match C.
 *
 * @param {{ m_lev?: number, mhp?: number, mhpmax?: number }} mon
 * @param {number} mndx
 */
export function newMonHp(mon, mndx) {
    if ((globalThis.__traceRngN|0) > 70000) console.error("NEWHPCALL",JSON.stringify({rng:globalThis.__traceRngN,id:mon.m_id,mndx,x:mon.mx,y:mon.my}));
    const row = MONS[mndx];
    const mlet = row[0];
    const ptrMlevel = row[1];
    let basehp = 0;
    mon.m_lev = adjLev(mndx);
    if (mlet === S_GOLEM) {
        mon.mhpmax = mon.mhp = golemHp(mndx);
    }
    else if (isRiderMndx(mndx)) {
        basehp = 10;
        mon.mhpmax = mon.mhp = d(basehp, 8);
    }
    else if (ptrMlevel > 49) {
        mon.mhpmax = mon.mhp = 2 * (ptrMlevel - 6);
        mon.m_lev = Math.trunc(mon.mhp / 4);
    }
    else if (mlet === S_DRAGON && mndx >= PM_GRAY_DRAGON) {
        const uz = game.u?.uz;
        basehp = mon.m_lev | 0;
        mon.mhpmax = mon.mhp =
            uz && In_endgame(uz)
                ? 8 * basehp
                : 4 * basehp + d(basehp, 4);
    }
    else if (!mon.m_lev) {
        basehp = 1;
        mon.mhpmax = mon.mhp = rnd(4);
    }
    else {
        basehp = mon.m_lev | 0;
        mon.mhpmax = mon.mhp = d(basehp, 8);
        if (isHomeElementalMndx(mndx)) {
            mon.mhp *= 3;
            mon.mhpmax = mon.mhp;
        }
    }
    if (mon.mhpmax === basehp) {
        mon.mhpmax += 1;
        mon.mhp = mon.mhpmax;
    }
}
/** C monflag.h mflags2 — gender (distinct from makemon MM_FEMALE/MM_MALE flags). */
const M2_MALE = 0x00010000;
const M2_MON_FEMALE = 0x00020000;
const M2_NEUTER = 0x00040000;
/** C monflag.h — grow_up() predicates (mflags2 bits). */
const M2_UNDEAD = 0x00000002;
const M2_SHAPESHIFTER = 0x00004000;
/** C monsters.h PM_MANES — nonliving(ptr) special case. */
const PM_MANES = 50;
/** C monsters.h — the three shapechanger true-forms monst.h:217 is_vampshifter
 * tests `mon->cham` against.  Indices per js/pm.generated.js. */
const PM_VAMPIRE = 226;
const PM_VAMPIRE_LORD = 227;   /* 5.0's PM_VAMPIRE_LEADER */
import { PM_VLAD_THE_IMPALER } from './pm.generated.js';
/** C monsters.h PM_KILLER_BEE/PM_QUEEN_BEE — grow_up() bee-caste special case
 * (js/pm.generated.js agrees: PM_KILLER_BEE=1, PM_QUEEN_BEE=5). */
const PM_KILLER_BEE = 1;
const PM_QUEEN_BEE = 5;
/**
 * C role.c — urole[].ldrnum entries (quest_info(MS_LEADER)) for roles[0..12].
 * PN indices from monsters.h MON() basename order / monsPack row order.
 */
const ROLE_LDRNUM = [
    344, 345, 346, 347, 348, 349, 350, 352, 351, 353, 354, 355, 356,
];
/**
 * C role.c — urole[].neminum entries (quest_info(MS_NEMESIS)) for roles[0..12].
 */
const ROLE_NEMNUM = [
    357, 358, 359, 360, 361, 362, 363, 365, 364, 366, 352, 367, 368,
];
/**
 * C role.c — urole[].guardnum entries for roles[0..12].
 */
const ROLE_GUARDNUM = [
    369, 370, 371, 372, 373, 374, 375, 377, 376, 379, 380, 381, 382,
];
/**
 * C role.c:2027-2047 role_init() "Fix up the quest leader" / "Fix up the quest
 * guardians" MUTATE mons[ldrnum] and mons[guardnum]:
 *     pm->maligntyp = alignmnt * 3;     alignmnt = aligns[flags.initalign].value
 * MONS rows are immutable, so every maligntyp reader of a row goes through
 * this.  E.g. a neutral Archeologist's Lord Carnarvon is maligntyp 0, not 20,
 * which decides how many monsters his summon-nasties spell makes
 * (wizard.c:615 castalign, wizard.c:698).
 */
export function role_maligntyp(mndx, mal) {
    const ri = (game.flags?.initrole ?? -1) | 0;
    if (ri >= 0 && ri < ROLE_LDRNUM.length
        && (ROLE_LDRNUM[ri] === (mndx | 0) || ROLE_GUARDNUM[ri] === (mndx | 0)))
        return ((aligns[(game.flags?.initalign ?? 0) | 0]?.value ?? 0) | 0) * 3;
    return mal | 0;
}
/** C monflag.h — always_peaceful / always_hostile / is_minion bit masks */
const M2_PEACEFUL = 0x00200000;
const M2_HOSTILE = 0x00100000;
const M2_MINION = 0x00001000;
/** C monsters.h — PM_ERINYS index */
const PM_ERINYS = 292;   /* monsters.h MON(... ERINYS); was 299 = PM_NALFESHNEE */
/**
 * C role.c roles[].initrecord — initial alignment record per role (Arc..Wiz).
 * Set by newhp() in attrib.c:1100 when u.ulevel==0 and moves==0.
 */
const ROLE_INITRECORD = [
    10, // 0 Arc
    10, // 1 Bar
    0, // 2 Cav
    10, // 3 Hea
    10, // 4 Kni
    10, // 5 Mon
    0, // 6 Pri
    10, // 7 Ran
    10, // 8 Rog
    10, // 9 Sam
    0, // 10 Tou
    0, // 11 Val
    0, // 12 Wiz
];
export function monGeno(mndx) {
    const row = MONS[mndx];
    return row ? (row[3] | 0) : 0;
}
/**
 * C makemon.c peace_minded(makemon.c:2267) — determine if a newly-placed
 * monster starts peaceful toward the player.
 *
 * @param {number} mndx
 */
export function peaceMinded(mndx) {
    const row = MONS[mndx];
    if (!row)
        return true;
    const mal = row[4] | 0; // maligntyp (schar)
    const mf2 = row[7] | 0; // mflags2
    /* C role.c:2049-2054 role_init() rewrites the hero's quest nemesis row:
     * mflags2 &= ~M2_PEACEFUL, |= M2_HOSTILE.  A nemesis that is statically
     * another role's leader (Master of Thieves: Rogue leader, Tourist
     * nemesis) carries M2_PEACEFUL in MONS[], so the nemesis test must run
     * before the static flag reads or it is peaceful (makemon.c:2272). */
    {
        const ri = (game.flags?.initrole ?? -1) | 0;
        if (ri >= 0 && ri < ROLE_NEMNUM.length && ROLE_NEMNUM[ri] === mndx)
            return false;
    }
    if ((mf2 & M2_PEACEFUL) !== 0)
        return true;
    if ((mf2 & M2_HOSTILE) !== 0)
        return false;
    // msound == MS_LEADER || msound == MS_GUARDIAN -> TRUE
    // msound == MS_NEMESIS -> FALSE
    const roleIx = (game.flags?.initrole ?? -1) | 0;
    if (roleIx >= 0 && roleIx < ROLE_LDRNUM.length) {
        if (ROLE_LDRNUM[roleIx] === mndx || ROLE_GUARDNUM[roleIx] === mndx)
            return true;
        if (ROLE_NEMNUM[roleIx] === mndx)
            return false;
    }
    if (mndx === PM_ERINYS)
        return !((game.u?.ualign?.abuse ?? 0) | 0);
    const urace = /** @type {any} */ (game.urace ?? {});
    const lovemask = (urace.lovemask ?? 0) | 0;
    const hatemask = (urace.hatemask ?? 0) | 0;
    if (lovemask !== 0 && (mf2 & lovemask) !== 0)
        return true;
    if (hatemask !== 0 && (mf2 & hatemask) !== 0)
        return false;
    const ual = (game.u?.ualign?.type ?? 0) | 0;
    const sgnMal = mal > 0 ? 1 : mal < 0 ? -1 : 0;
    const sgnUal = ual > 0 ? 1 : ual < 0 ? -1 : 0;
    if (sgnMal !== sgnUal)
        return false;
    if (mal < A_NEUTRAL && (game.u?.uhave?.amulet ?? 0))
        return false;
    if ((mf2 & M2_MINION) !== 0)
        return ((game.u?.ualign?.record ?? 0) | 0) >= 0;
    /* When ualign hasn't been set yet (pre-mklev/makedog startup), fall back
     * to urole.initrecord (attrib.c:1100): set by newhp() during u_init_misc. */
    const initRec = (roleIx >= 0 && roleIx < ROLE_INITRECORD.length)
        ? ROLE_INITRECORD[roleIx] : 0;
    const record = (game.u?.ualign != null
        ? (game.u.ualign.record | 0)
        : initRec) | 0;
    const clampedRecord = record < -15 ? -15 : record;
    return !!rn2(16 + clampedRecord) && !!rn2(2 + Math.abs(mal));
}
/* C monflag.h ms_sounds — class leader (the only msound set_malign special-cases). */
const MS_LEADER = 36;
const MS_NEMESIS = 37;  /* monflag.h:52 */
/* C role.c roles[] indices — this port carries the hero's role as a roles[]
 * index in flags.initrole, so Role_if(PM_X) is a comparison against the index
 * (js/objnam.js:3199 _Role_if).  roles[] order in 5.0 role.c: Archeologist,
 * Barbarian, Caveman, Healer, Knight, Monk, Priest, Rogue, Ranger, Samurai,
 * Tourist, Valkyrie, Wizard. */
const ROLE_IDX_MONK = 5;
const ROLE_IDX_CLERIC = 6;

/**
 * C makemon.c:11-13
 *   #define quest_mon_represents_role(mptr, role_pm) \
 *       (mptr->mlet == S_HUMAN && Role_if(role_pm)   \
 *        && (mptr->msound == MS_LEADER || mptr->msound == MS_NEMESIS))
 * "this assumes that a human quest leader or nemesis is an archetype of the
 * corresponding role; that isn't so for some roles (tourist for instance) but
 * is for the priests and monks we use it for..."
 * @param {number} mndx
 * @param {number} rolePm  roles[] index (this port's Role_if encoding)
 */
function questMonRepresentsRole(mndx, rolePm) {
    const row = MONS[mndx | 0];
    if (!row || (row[0] | 0) !== S_HUMAN_MLET)
        return false;
    if (((game.flags?.initrole ?? -1) | 0) !== (rolePm | 0))
        return false;
    const ms = MONS_MSOUND[mndx | 0] | 0;
    return ms === MS_LEADER || ms === MS_NEMESIS;
}

/**
 * C makemon.c:2320 set_malign(struct monst *mtmp) — compute mtmp->malign, the
 * signed alignment-record delta applied (via adjalign) when the hero kills the
 * monster.  RNG-NEUTRAL.  Mirrors the C branch structure exactly:
 *   - priests/minions use their individual shrine/min alignment, scaled *5.
 *   - msound==MS_LEADER            -> -20.
 *   - mal==A_NONE                  -> peaceful ? 0 : 20.
 *   - always_peaceful              -> peaceful ? -3*max(5,|mal|) : 3*max(5,|mal|).
 *   - always_hostile               -> coaligned ? 0 : max(5,|mal|).
 *   - coaligned (general)          -> peaceful ? -3*max(3,|mal|) : max(3,|mal|).
 *   - else (hostile, non-coaligned)-> |mal|.
 * `coaligned` compares sgn(mal) to sgn(u.ualign.type).
 * The result is stored on the monster as `mtmp.malign`.
 * @param {{ mndx?: number, mnum?: number, mpeaceful?: number, ispriest?: number,
 *           isminion?: number, mextra?: any, malign?: number }} mtmp
 */
export function set_malign(mtmp) {
    if (!mtmp)
        return;
    const mndx = monsndx(mtmp);
    const row = MONS[mndx];
    if (!row)
        return;
    let mal = role_maligntyp(mndx, row[4]); /* permonst.maligntyp */
    const mf2 = row[7] >>> 0; /* mflags2 */
    const msound = MONS_MSOUND[mndx] | 0;
    const peaceful = !!mtmp.mpeaceful;

    if (mtmp.ispriest || mtmp.isminion) {
        /* C makemon.c:2325-2335 — some monsters have individual alignments. */
        if (mtmp.ispriest && mtmp.mextra && mtmp.mextra.epri != null
            && mtmp.mextra.epri.shralign != null)
            mal = mtmp.mextra.epri.shralign | 0;
        else if (mtmp.isminion && mtmp.mextra && mtmp.mextra.emin != null
            && mtmp.mextra.emin.min_align != null)
            mal = mtmp.mextra.emin.min_align | 0;
        if (mal !== A_NONE)
            mal *= 5;
    }

    const sgnMal = mal > 0 ? 1 : mal < 0 ? -1 : 0;
    const ual = (game.u?.ualign?.type ?? 0) | 0;
    const sgnUal = ual > 0 ? 1 : ual < 0 ? -1 : 0;
    const coaligned = (sgnMal === sgnUal);
    const absmal = mal < 0 ? -mal : mal;

    if (msound === MS_LEADER) {
        mtmp.malign = -20;
    } else if (mal === A_NONE) {
        mtmp.malign = peaceful ? 0 : 20; /* really hostile */
    } else if ((mf2 & M2_PEACEFUL) !== 0) { /* always_peaceful */
        mtmp.malign = peaceful ? (-3 * Math.max(5, absmal))
                               : (3 * Math.max(5, absmal)); /* renegade */
    } else if ((mf2 & M2_HOSTILE) !== 0) { /* always_hostile */
        mtmp.malign = coaligned ? 0 : Math.max(5, absmal);
    } else if (coaligned) {
        mtmp.malign = peaceful ? (-3 * Math.max(3, absmal))
                               : Math.max(3, absmal); /* renegade */
    } else { /* not coaligned and therefore hostile */
        mtmp.malign = absmal;
    }
}

/**
 * C makemon.c:1262–1281 — monster female flag (+ rn2(2) RNG for corpse gender).
 *
 * Quest leader/nemesis use numeric `ldrgend` / `nemgend` from
 * `game.quest_status` or `game.svq.quest_status` when present (0/1);
 * omitted fields skip those branches—parity with full `svq` when callers wire it.
 *
 * @param {{ female?: number }} mon
 * @param {number} mndx
 * @param {number} mmflags
 */
export function assignMakemonFemale(mon, mndx, mmflags) {
    const row = MONS[mndx];
    const mf2 = row[7] | 0;
    const isMaleRace = (mf2 & M2_MALE) !== 0;
    const isFemaleRace = (mf2 & M2_MON_FEMALE) !== 0;
    const isNeuterRace = (mf2 & M2_NEUTER) !== 0;
    const femaleok = !isMaleRace && !isNeuterRace;
    const maleok = !isFemaleRace && !isNeuterRace;
    mmflags |= 0;
    const qs = /** @type {{ ldrgend?: number; nemgend?: number } | undefined} */ (game.quest_status ?? game.svq?.quest_status);
    const roleIx = game.flags?.initrole ?? -1;
    if (isFemaleRace || ((mmflags & MM_FEMALE) !== 0 && femaleok)) {
        mon.female = 1;
    }
    else if (isMaleRace || ((mmflags & MM_MALE) !== 0 && maleok)) {
        mon.female = 0;
    }
    else if (qs
        && typeof qs.ldrgend === 'number'
        && roleIx >= 0
        && roleIx < ROLE_LDRNUM.length
        && ROLE_LDRNUM[roleIx] === mndx) {
        /* C: `mtmp->female = svq.quest_status.ldrgend;` — a 2-bit quest.h
         * field assigned into monst.h:122's Bitfield(female, 1), so the
         * neuter value 2 truncates to 0 (male), not to 1. */
        mon.female = (qs.ldrgend | 0) & 1;
    }
    else if (qs
        && typeof qs.nemgend === 'number'
        && roleIx >= 0
        && roleIx < ROLE_NEMNUM.length
        && ROLE_NEMNUM[roleIx] === mndx) {
        mon.female = (qs.nemgend | 0) & 1;
    }
    else {
        mon.female = femaleok ? rn2(2) : 0;
    }
}
/** C mondata.h is_domestic(ptr) — M2_DOMESTIC */
function isDomesticMndx(mndx) {
    return (monMflags2(mndx) & M2_DOMESTIC) !== 0;
}
/** Minimal stand-in for which_armor(mtmp, W_SADDLE). */
function monsterWearingSaddle(mtmp) {
    if (((( /** @type {any} */(mtmp)).misc_worn_check ?? 0) | 0) & W_SADDLE)
        return true;
    for (let o = /** @type {any} */ (mtmp).minvent; o; o = o.nobj) {
        if (((o.owornmask ?? 0) | 0) & W_SADDLE)
            return true;
    }
    return false;
}
/** C steed.c can_saddle(mtmp) — no RNG */
function canSaddleMndx(_mtmp, mndx) {
    const mlet = monMlet(mndx);
    if (!STEED_MLET.has(mlet))
        return false;
    /* C steed.c:30 — (ptr->msize >= MZ_MEDIUM) */
    if (monMsize(mndx) < MZ_MEDIUM)
        return false;
    const mf1 = monMflags1(mndx);
    if ((mf1 & M1_HUMANOID) !== 0 && mlet !== S_CENTAUR)
        return false;
    if ((mf1 & M1_AMORPHOUS) !== 0)
        return false;
    if (mlet === S_GHOST)
        return false;
    if (mlet === S_VORTEX || mndx === PM_AIR_ELEMENTAL)
        return false;
    if ((mf1 & M1_UNSOLID) !== 0)
        return false;
    return true;
}
/**
 * C makemon.c:1448–1453 — after m_initinv / m_dowear when allow_minvent:
 * `if (!rn2(100) && is_domestic(ptr) && can_saddle(mtmp)
 *     && !which_armor(mtmp, W_SADDLE)) put_saddle_on_mon(...)`.
 * RNG: always consumes `rn2(100)` when inventory is allowed.
 * Returns true when C would call put_saddle_on_mon((struct obj *) 0, mtmp); the
 * caller (js/mklev.js makemon) runs it (js/steed.js, async mksobj).
 *
 * @param {{ misc_worn_check?: number, minvent?: any }} mtmp
 * @param {number} mndx
 * @param {number} mmflags
 */
export function makemonDomesticSaddle(mtmp, mndx, mmflags) {
    mmflags |= 0;
    if ((mmflags & NO_MINVENT) !== 0)
        return false;
    if (rn2(100) !== 0)
        return false;
    if (!isDomesticMndx(mndx))
        return false;
    if (!canSaddleMndx(mtmp, mndx))
        return false;
    if (monsterWearingSaddle(mtmp))
        return false;
    return true;
}
/** @param {number} mndx */
function mkGenOk(mndx, mvflagsmask, genomask) {
    if (mvitalsGone(mndx) && mvflagsmask)
        return false;
    if ((MONS[mndx][3] & genomask) !== 0)
        return false;
    if (isPlaceholderMndx(mndx))
        return false;
    return true;
}
/* C makemon.c:2605-2612: create erinyes until the limit or extinction. */
export async function summon_furies(limit) {
    let i = 0;
    while (mkGenOk(PM_ERINYS, G_GONE, 0) && (i < limit || !limit)) {
        await makemon(permonstTemplate(PM_ERINYS), game.u.ux, game.u.uy,
                      MM_ADJACENTOK | MM_NOWAIT);
        i++;
    }
}
/** @param {number} monindx */
function montoostrong(monindx, lev) {
    return MONS[monindx][2] > lev;
}
/** @param {number} monindx */
function montooweak(monindx, lev) {
    return MONS[monindx][2] < lev;
}
/**
 * @param {number} classSym
 * @param {number} spc
 * @param {number} atyp
 */
export function mkclassAligned(classSym, spc, atyp) {
    initMongenOrder();
    /** @type {number[]} */
    const nums = new Array(NUMMONS).fill(0);
    let num = 0;
    const maxmlev = Math.trunc(levelDifficulty() / 2);
    const gehennom = Inhell() ? 1 : 0;
    if (classSym < 1 || classSym >= MAXMCLASSES)
        return null;
    const zeroFreqEntireClass = mclassMaxf[classSym] === 0;
    let first;
    for (first = LOW_PM; first < SPECIAL_PM; first++)
        if (MONS[MONSi(first)][0] === classSym)
            break;
    if (first === SPECIAL_PM)
        return null;
    let mv_mask = G_GONE;
    let spc2 = spc;
    if ((spc2 & G_IGNORE) !== 0) {
        mv_mask = 0;
        spc2 &= ~G_IGNORE;
    }
    let last;
    for (last = first; last < SPECIAL_PM && MONS[MONSi(last)][0] === classSym; last++) {
        const mi = MONSi(last);
        const row = MONS[mi];
        if (atyp !== A_NONE && Math.sign(row[4]) !== Math.sign(atyp))
            continue;
        let gn_mask = G_NOGEN | G_UNIQ;
        if (rn2(9) || classSym === S_LICH)
            gn_mask |= gehennom ? G_NOHELL : G_HELL;
        gn_mask &= ~spc2;
        if (mkGenOk(mi, mv_mask, gn_mask)) {
            if (num &&
                montoostrong(mi, maxmlev) &&
                row[2] > MONS[MONSi(last - 1)][2] &&
                rn2(2))
                break;
            let k = row[3] & G_FREQ;
            if (k > 0 || (k = zeroFreqEntireClass ? 1 : 0) > 0) {
                nums[mi] = k + 1 - (adjLev(mi) > (game.u?.ulevel ?? 1) * 2 ? 1 : 0);
                num += nums[mi];
            }
        }
    }
    if (!num)
        return null;
    for (num = rnd(num); first < last; first++) {
        const mi = MONSi(first);
        if ((num -= nums[mi]) <= 0)
            break;
    }
    const miFinal = MONSi(first);
    return nums[miFinal] ? miFinal : null;
}
/**
 * C ref: makemon.c:1871-1875 mkclass(char class, int spc) — thin wrapper that
 * forwards `spc` (special mons[].geno handling, e.g. G_NOGEN / G_IGNORE) to
 * mkclass_aligned(class, spc, A_NONE). The C signature ALWAYS takes spc; most
 * callers pass 0, but some pass G_NOGEN (dropping spc here desynced the RNG:
 * a G_NOGEN-flagged candidate stayed blocked, so the montoostrong rn2(2) break
 * was never reached). Default to 0 so existing single-arg JS callers (which
 * mirror the C `mkclass(S_xxx, 0)` call sites) are unchanged.
 * @param {number} classSym
 * @param {number} [spc]
 */
export function mkclass(classSym, spc = 0) {
    return mkclassAligned(classSym, spc, A_NONE);
}
function qtMontype() {
    const roleRaw = game.flags?.initrole ?? 0;
    const role = Math.min(Math.max(roleRaw | 0, 0), ROLE_QUEST.length - 1);
    const q = ROLE_QUEST[role];
    if (rn2(5)) {
        let qpm = q.enemy1num;
        if (qpm !== NON_PM && rn2(5) && !mvitalsGenod(qpm))
            return qpm;
        return mkclass(q.enemy1sym);
    }
    let qpm = q.enemy2num;
    if (qpm !== NON_PM && rn2(5) && !mvitalsGenod(qpm))
        return qpm;
    return mkclass(q.enemy2sym);
}
/** @param {MonRow} row @param {number} mndx */
function wrongElemType(row, mndx) {
    const uz = game.u?.uz;
    if (!uz)
        return false;
    const mlet = row[0];
    const mf1 = row[6]; /* mflags1 at row[6] (row[5] is mr1 resistance bitfield) */
    if (mlet === S_ELEMENTAL) {
        return !isHomeElementalMndx(mndx); /* C makemon.c:59 */
    }
    if (Is_earthlevel(uz)) {
        /* no restrictions */
    }
    else if (Is_waterlevel(uz)) {
        if ((mf1 & M1_SWIM) === 0)
            return true;
    }
    else if (Is_firelevel(uz)) {
        /* C makemon.c:66-68 `if (!pm_resistance(ptr, MR_FIRE)) return TRUE;`,
         * and mondata.h:14 defines pm_resistance(ptr, typ) as
         * ((ptr)->mresists & (typ)) != 0.  mresists is row[5]; row[4] is
         * maligntyp -- this line used to read the ALIGNMENT column and mask it
         * with MR_FIRE (1), so it admitted every monster with an odd
         * maligntyp and rejected every fire-resistant one with an even
         * maligntyp.  The file's own comment two lines up already says
         * "row[5] is mr1 resistance bitfield"; permonstTemplate (:1477) spells
         * it `mresists: row[5]`, and temperatureShift (:494) reads row[5] for
         * the same MR_FIRE test.  This was the only remaining row[4] & MR_*
         * read in the file. */
        if ((row[5] & MR_FIRE) === 0)
            return true;
    }
    else if (Is_airlevel(uz)) {
        const flyer = (mf1 & M1_FLY) !== 0 && mlet !== S_TRAPPER;
        const floater = mlet === S_EYE || mlet === S_LIGHT;
        const whirly = mlet === S_VORTEX || mndx === PM_AIR_ELEMENTAL;
        if (!(flyer && mlet !== S_TRAPPER) &&
            !floater &&
            (mf1 & M1_AMORPHOUS) === 0 &&
            mlet !== S_GHOST &&
            !whirly)
            return true;
    }
    return false;
}
/**
 * @param {number} minadj
 * @param {number} maxadj
 * @returns {number | null} monster index or null
 */
export function rndmonstAdj(minadj, maxadj) {
    const uz = game.u?.uz;
    if (!uz)
        return null;
    const qd = game.quest_dnum;
    if (qd !== undefined && qd !== null && uz.dnum === qd) {
        if (rn2(7)) {
            const q = qtMontype();
            if (q !== null)
                return q;
        }
    }
    const zlevel = levelDifficulty();
    const minmlev = Math.trunc(zlevel / 6) + minadj;
    const maxmlev = Math.trunc((zlevel + (game.u?.ulevel ?? 1)) / 2) + maxadj;
    const upper = Is_rogue_level(uz);
    const elemlevel = In_endgame(uz) && !Is_astralevel(uz);
    let totalweight = 0;
    /** @type {number} */
    let selected_mndx = NON_PM;
    for (let mndx = LOW_PM; mndx < SPECIAL_PM; ++mndx) {
        const row = MONS[mndx];
        if (montooweak(mndx, minmlev) || montoostrong(mndx, maxmlev))
            continue;
        if (upper) {
            const ch = DEF_MONSYM_CHARS[row[0]] ?? '?';
            if (ch < 'A' || ch > 'Z')
                continue;
        }
        if (elemlevel && wrongElemType(row, mndx))
            continue;
        if (uncommon(mndx))
            continue;
        if (Inhell() && (row[3] & G_NOHELL) !== 0)
            continue;
        let weight = (row[3] & G_FREQ) + alignShift(row) + temperatureShift(row);
        if (weight < 0 || weight > 127)
            weight = 0;
        if (weight > 0) {
            totalweight += weight;
            if (rn2(totalweight) < weight)
                selected_mndx = mndx;
        }
    }
    if (selected_mndx === NON_PM || uncommon(selected_mndx))
        return null;
    return selected_mndx;
}
/** @returns {number | null} */
export function rndmonst() {
    return rndmonstAdj(0, 0);
}
/**
 * @param {number} minadj
 * @param {number} maxadj
 */
export function rndmonnumAdj(minadj, maxadj) {
    const p = rndmonstAdj(minadj, maxadj);
    if (p !== null)
        return p;
    const excl = G_UNIQ | G_NOGEN | (Inhell() ? G_NOHELL : G_HELL);
    let i;
    let guard = 10000;
    do {
        i = rn1(SPECIAL_PM - LOW_PM, LOW_PM);
        if (--guard <= 0)
            return LOW_PM;
    } while ((MONS[i][3] & excl) !== 0);
    return i;
}
/* ----- m_initinv tail + muse.c rnd_defensive_item / rnd_misc_item (RNG parity) -----
 * C ref: makemon.c m_initinv (~591–835), esp. 824–835; muse.c rnd_defensive_item (~1221),
 * rnd_misc_item (~2653).
 * Object typ constants match js/mklev.js mksobj_init potion/scroll bands (NH 3.7 indices).
 * NOTE: makemon.c:603–822 class switch (mercenary gear, shopkeepers, …) not ported yet —
 * only rogue guard + soldier rn2(13) early exit + tail RNG + mkmonmoney guard.
 */
/** defsym.h — Keystone Kop */
const S_KOP = 37;
const M1_ANIMAL = 0x00040000;
const M1_MINDLESS = 0x00010000;
const M2_GREEDY = 0x10000000;
/* NB: this file used to carry its own `const PM_SOLDIER = 283`, labelled
 * "human soldier row index in mons[]".  It is wrong: row 283 is the WATCH
 * CAPTAIN and the soldier is row 277 (js/makemon_pmnames.json, and
 * js/pm.generated.js:280 PM_SOLDIER = 277).  The only reader was m_initinv's
 * tail guard — C makemon.c:823 `if (ptr == &mons[PM_SOLDIER] && rn2(13))
 * return;` — so the "ordinary soldiers rarely have access to magic" early-out
 * was applied to watch captains and never to soldiers.  Now imported from
 * pm.generated.js with the rest of the mercenary indices (see the import at
 * the top of this file). */
const GOLD_PIECE_OTYP = 438; /* COIN_CLASS base in THIS build (MKOBJ_SVB_BASES[12]=438; u_init.js agrees); was wrongly 466 (stale) */
/**
 * C ref: makemon.c:577-589 mkmonmoney
 * mk_mplayer() passes rn2(1000) so amount might be 0.
 * add_to_minv (mkobj.c:2652) is not yet ported; its merged() pre-check is
 * inlined here per the same scope cut already used at makemon.c:586's other
 * call sites in this file and in js/sp_lev.js/js/dogmove.js — a freshly
 * mksobj'd GOLD_PIECE can only merge with an existing gold pile, which the
 * merged()/mergable() chain-reader is itself not yet ported to detect.
 * @param {any} mtmp
 * @param {number} amount
 */
/* C mkobj.c:2652 add_to_minv tail: where/ocarry are what get_obj_location()
 * (zap.c:654) reads, so distant_name() sees a carried object as located. */
function _minv_link(mtmp, obj) {
    obj.nobj = mtmp.minvent ?? null;
    obj.where = OBJ_MINVENT;
    obj.ocarry = mtmp;
    mtmp.minvent = obj;
}
export async function mkmonmoney(mtmp, amount) {
    if (amount > 0) {
        const gold = await mksobj(GOLD_PIECE_OTYP, false, false);
        gold.quan = amount;
        gold.owt = weight(gold);
        /* C makemon.c:586 add_to_minv(mtmp, gold): merges into an existing
         * gold stack (mk_mplayer's m_initinv gold, then rn2(1000) more). */
        await add_to_minv(mtmp, gold);
    }
}
const POT_SPEED_OTYP = 302;
const POT_INVISIBILITY_OTYP = 305;
const POT_GAIN_LEVEL_OTYP = 309;
const POT_POLYMORPH_OTYP = 316;
const WAN_TELEPORTATION_OTYP = 424;
const WAN_SPEED_MONSTER_OTYP = 420;
const WAN_MAKE_INVISIBLE_OTYP = 418;
const WAN_POLYMORPH_OTYP = 422;
const AMULET_OF_LIFE_SAVING_OTYP = 202;
/** @param {{ mndx?: number, mnum?: number }} mtmp */
function monsndx(mtmp) {
    return (mtmp.mndx ?? mtmp.mnum) | 0;
}
/** @param {number} mndx */
export function monMlet(mndx) {
    return MONS[mndx][0] | 0;
}
/** @param {number} mndx */
function monDifficulty(mndx) {
    return MONS[mndx][2] | 0;
}
/** @param {number} mndx */
function monMflags1(mndx) {
    /* C permonst: row[5]=mr1 (resistance bitfield), row[6]=mflags1.
     * mflags1 carries M1_ANIMAL, M1_MINDLESS, M1_FLY, M1_SWIM etc. */
    return MONS[mndx][6] >>> 0;  // unsigned uint32 (raceptr V26)
}
/** @param {number} mndx */
function monMflags2(mndx) {
    return MONS[mndx][7] >>> 0;  // unsigned uint32 (raceptr V26)
}
/** C permonst.msize — MZ_* via makemon_msize.json (parallel to MONS row order). */
function monMsize(mndx) {
    return MONS_MSIZE[mndx] | 0;
}
/** C permonst.msound — MS_* via makemon_msound.json (parallel to MONS row order). */
function monMsound(mndx) {
    return MONS_MSOUND[mndx] | 0;
}
export function permonstTemplate(mndx) {
    const i = mndx | 0;
    if (i < 0 || i >= NUMMONS) return null;
    const row = MONS[i];
    /* C role.c:2049-2056 role_init() "Fix up the quest nemesis" MUTATES
     * mons[neminum] once per game; these rows are immutable, so the same
     * rewrite is applied when the hero's nemesis template is minted.  Without
     * M3_WANTSARTI the nemesis is not is_covetous(), so tactics() never runs
     * and it never fetches the quest artifact (wizard.c:441-447). */
    const _ri = (game.flags?.initrole ?? -1) | 0;
    const isNem = _ri >= 0 && _ri < ROLE_NEMNUM.length && ROLE_NEMNUM[_ri] === i;
    let f2 = row[7] >>> 0, f3 = row[8] >>> 0, snd = MONS_MSOUND[i] | 0;
    if (isNem) {
        snd = MS_NEMESIS;
        f2 = ((f2 & ~M2_PEACEFUL) | 0x02000000 /* M2_NASTY */
              | 0x01000000 /* M2_STALK */ | M2_HOSTILE) >>> 0;
        f3 = ((f3 & ~0x0080 /* M3_CLOSE */) | 0x0010 /* M3_WANTSARTI */
              | 0x0040 /* M3_WAITFORU */) >>> 0;
    }
    return {
        pmidx: i,
        mlet: row[0] | 0,
        mlevel: row[1] | 0,
        geno: row[3] | 0,
        maligntyp: role_maligntyp(i, row[4]),
        mresists: row[5] | 0, // row[5]=mr1 (resist BITFIELD), NOT the mr% field (absent from MONS table)
        mr: MONS_MR[i] | 0,
        mflags1: row[6] >>> 0,  // unsigned uint32 bitfield — | 0 wraps high-bit values negative (raceptr V26)
        mflags2: f2,
        mflags3: f3,
        mmove: row[9] | 0,
        msize: MONS_MSIZE[i] | 0,
        mattk: MONS_MATTK[i],
        msound: snd,
        pmnames: MONS_PMNAMES[i],
        mconveys: MONS_MCONVEYS[i] | 0,
    };
}
/** C do_name.c:1303 pmname(pm, mgender) — pm->pmnames[mgender] with the
 * NEUTRAL fallback when mgender is out of range or that gender's name is NULL.
 *   if (mgender < MALE || mgender >= NUM_MGENDERS || !pm->pmnames[mgender])
 *       mgender = NEUTRAL;
 *   return pm->pmnames[mgender];
 * `pm` here is the form index (mndx) into MONS_PMNAMES. */
export function monPmname(mndx, mgender) {
    const row = MONS_PMNAMES[mndx];
    let g = mgender;
    if (g < MALE || g >= NUM_MGENDERS || !row[g])
        g = NEUTRAL;
    return row[g];
}




/* C defsym.h MONSYM() rows 1..60 — def_monsyms[i].explain, extracted from
 * nethack-c-v5/upstream/include/defsym.h:295-366 (NOT hand-typed).  Index 0 is
 * unused; MAXMCLASSES is 61.  name_to_monclass() below matches an input word or
 * phrase against these class descriptions before falling back to individual
 * species names. */
const DEF_MONSYMS_EXPLAIN = [
    /*  0 */ '',
    /*  1 */ "ant or other insect",
    /*  2 */ "blob",
    /*  3 */ "cockatrice",
    /*  4 */ "dog or other canine",
    /*  5 */ "eye or sphere",
    /*  6 */ "cat or other feline",
    /*  7 */ "gremlin",
    /*  8 */ "humanoid",
    /*  9 */ "imp or minor demon",
    /* 10 */ "jelly",
    /* 11 */ "kobold",
    /* 12 */ "leprechaun",
    /* 13 */ "mimic",
    /* 14 */ "nymph",
    /* 15 */ "orc",
    /* 16 */ "piercer",
    /* 17 */ "quadruped",
    /* 18 */ "rodent",
    /* 19 */ "arachnid or centipede",
    /* 20 */ "trapper or lurker above",
    /* 21 */ "unicorn or horse",
    /* 22 */ "vortex",
    /* 23 */ "worm",
    /* 24 */ "xan or other mythical/fantastic insect",
    /* 25 */ "light",
    /* 26 */ "zruty",
    /* 27 */ "angelic being",
    /* 28 */ "bat or bird",
    /* 29 */ "centaur",
    /* 30 */ "dragon",
    /* 31 */ "elemental",
    /* 32 */ "fungus or mold",
    /* 33 */ "gnome",
    /* 34 */ "giant humanoid",
    /* 35 */ "invisible monster",
    /* 36 */ "jabberwock",
    /* 37 */ "Keystone Kop",
    /* 38 */ "lich",
    /* 39 */ "mummy",
    /* 40 */ "naga",
    /* 41 */ "ogre",
    /* 42 */ "pudding or ooze",
    /* 43 */ "quantum mechanic",
    /* 44 */ "rust monster or disenchanter",
    /* 45 */ "snake",
    /* 46 */ "troll",
    /* 47 */ "umber hulk",
    /* 48 */ "vampire",
    /* 49 */ "wraith",
    /* 50 */ "xorn",
    /* 51 */ "apelike creature",
    /* 52 */ "zombie",
    /* 53 */ "human or elf",
    /* 54 */ "ghost",
    /* 55 */ "golem",
    /* 56 */ "major demon",
    /* 57 */ "sea monster",
    /* 58 */ "lizard",
    /* 59 */ "long worm tail",
    /* 60 */ "mimic",
];

/* Shared by insight list renderers; keep the extracted C table in one place. */
export function monsym_explain(mlet) {
    return DEF_MONSYMS_EXPLAIN[mlet | 0] || '';
}

/** C mondata.h is_animal */
function isAnimal(mndx) {
    return (monMflags1(mndx) & M1_ANIMAL) !== 0;
}
/** C mondata.h mindless */
function mindlessMon(mndx) {
    return (monMflags1(mndx) & M1_MINDLESS) !== 0;
}
/** C muse.c attacktype(pm, AT_EXPL) — monsters with AT_EXPL proximity-explode attack.
 * C ref: monattk.h:23 AT_EXPL=13; monsters.h: freezing sphere (29), flaming sphere (30),
 * shocking sphere (31), yellow light (118), black light (119).
 * These monsters cause rnd_defensive_item/rnd_misc_item to return 0 without consuming RNG.
 * C permonst.mattk[] not packed into makemon_mons.json, so checked by PM index set.
 */
const MON_HAS_EXPL_ATK = new Set([
    29, /* PM_FREEZING_SPHERE — AT_EXPL AD_COLD */
    30, /* PM_FLAMING_SPHERE  — AT_EXPL AD_FIRE */
    31, /* PM_SHOCKING_SPHERE — AT_EXPL AD_ELEC */
    118, /* PM_YELLOW_LIGHT   — AT_EXPL AD_BLND */
    119, /* PM_BLACK_LIGHT    — AT_EXPL AD_HALU */
]);
function attacktypeExpl(mndx) {
    return MON_HAS_EXPL_ATK.has(mndx | 0);
}
function noteleportLevel(mtmp) {
    /* C passes mtmp straight through and noteleport_level() reads mon->data.
     * The makemon-internal monster shapes that reach rndDefensiveItem (via
     * m_initinv) may carry only mnum, so resolve data the same way
     * get_iter_mons does (js/makemon.js:3342) without mutating the caller's
     * monster. */
    const mon = (mtmp && mtmp.data !== undefined)
        ? mtmp
        : { ...mtmp, data: permonstTemplate(monsndx(mtmp)) };
    return noteleport_level(mon);
}
/** C rm.h Sokoban — svl.level.flags.sokoban_rules */
function sokobanRules() {
    return !!(game.level?.flags?.sokoban_rules ?? game.sokoban);
}
/** C mondata.h:20 is_floater(ptr) — mlet == S_EYE || mlet == S_LIGHT.
 * (Was mislabeled as an M1_FLY test; that is is_flyer, not is_floater.) */
function isFloater(mndx) {
    const mlet = monMlet(mndx);
    return mlet === S_EYE || mlet === S_LIGHT;
}
/** C mondata.h:19 is_flyer(ptr) — M1_FLY (mndx form over the MONS[] table). */
function isFlyerMndx(mndx) {
    return (monMflags1(mndx) & M1_FLY) !== 0;
}
/** C mondata.h:114 is_neuter(ptr) — M2_NEUTER (mndx form). */
function isNeuterMndx(mndx) {
    return (monMflags2(mndx) & M2_NEUTER) !== 0;
}
/* C youprop.h:150-152 — See_invisible = HSee_invisible || ESee_invisible,
 * HSee_invisible/ESee_invisible = u.uprops[SEE_INVIS].intrinsic/.extrinsic.
 * Was reading u.See_invisible/see_invisible/seeinvisible, none of which are
 * ever set, so this always read false (rnd_misc_item record #70: mpeaceful
 * hero-visible-invis monster, uprops[SEE_INVIS].intrinsic=1042, C takes the
 * rn2(6) branch and this stub's false made JS return 0 without drawing it). */
function seeInvisible() {
    const si = game.u?.uprops?.[SEE_INVIS];
    return !!((si?.intrinsic | 0) || (si?.extrinsic | 0));
}
/** C mondata.h likes_gold */
function likesGoldMndx(mndx) {
    return (monMflags2(mndx) & M2_GREEDY) !== 0;
}
/** C invent.c findGold — scan monster inventory (boolean helper, distinct from
 *  steal.c findgold above which returns the obj). */
function findGold(minvent) {
    for (let o = minvent; o; o = o.nobj) {
        if (o.otyp === GOLD_PIECE_OTYP)
            return true;
    }
    return false;
}
export function nonlivingMon(mndx) {
    const mlet = monMlet(mndx);
    return (monMflags2(mndx) & M2_UNDEAD) !== 0
        || mndx === PM_MANES
        || mlet === S_GOLEM || mlet === S_VORTEX;
}
function isVampshifter(mtmp) {
    const cham = mtmp ? mtmp.cham : undefined;
    return cham === PM_VAMPIRE || cham === PM_VAMPIRE_LORD
        || cham === PM_VLAD_THE_IMPALER;
}
/**
 * C muse.c rnd_defensive_item(mtmp)
 * @param {{ mndx?: number, mnum?: number, isshk?: number, isgd?: number, ispriest?: number }} mtmp
 */
export function rndDefensiveItem(mtmp) {
    const pmIdx = monsndx(mtmp);
    const difficulty = monDifficulty(pmIdx);
    let trycnt = 0;
    if (isAnimal(pmIdx) ||
        attacktypeExpl(pmIdx) ||
        mindlessMon(pmIdx) ||
        monMlet(pmIdx) === S_GHOST ||
        monMlet(pmIdx) === S_KOP) {
        return 0;
    }
    while (true) {
        const roll = rn2(8 +
            (difficulty > 3 ? 1 : 0) +
            (difficulty > 6 ? 1 : 0) +
            (difficulty > 8 ? 1 : 0));
        switch (roll) {
            case 6:
            case 9:
                if (noteleportLevel(mtmp) && ++trycnt < 2)
                    continue;
                if (!rn2(3))
                    return WAN_TELEPORTATION_OTYP;
                return SCR_TELEPORTATION_OTYP;
            case 0:
            case 1:
                return SCR_TELEPORTATION_OTYP;
            case 8:
            case 10:
                if (!rn2(3))
                    return WAN_CREATE_MONSTER_OTYP;
                return SCR_CREATE_MONSTER_OTYP;
            case 2:
                return SCR_CREATE_MONSTER_OTYP;
            case 3:
                return POT_HEALING_OTYP;
            case 4:
                return POT_EXTRA_HEALING_OTYP;
            case 5:
                return pmIdx !== PM_PESTILENCE
                    ? POT_FULL_HEALING_OTYP
                    : POT_SICKNESS_OTYP;
            case 7:
                if (sokobanRules() && rn2(4))
                    continue;
                if (isFloater(pmIdx) ||
                    mtmp.isshk ||
                    mtmp.isgd ||
                    mtmp.ispriest)
                    return 0;
                return WAN_DIGGING_OTYP;
            default:
                return 0;
        }
    }
}
/**
 * C muse.c rnd_misc_item(mtmp)
 * @param {{ mndx?: number, mnum?: number, isgd?: number, mpeaceful?: number }} mtmp
 */
export function rndMiscItem(mtmp) {
    const pmIdx = monsndx(mtmp);
    const difficulty = monDifficulty(pmIdx);
    if (isAnimal(pmIdx) ||
        attacktypeExpl(pmIdx) ||
        mindlessMon(pmIdx) ||
        monMlet(pmIdx) === S_GHOST ||
        monMlet(pmIdx) === S_KOP) {
        return 0;
    }
    if (difficulty < 6 && !rn2(30))
        return rn2(6) ? POT_POLYMORPH_OTYP : WAN_POLYMORPH_OTYP;
    if (!rn2(40) && !nonlivingMon(pmIdx) && !isVampshifter(mtmp))
        return AMULET_OF_LIFE_SAVING_OTYP;
    switch (rn2(3)) {
        case 0:
            if (mtmp.isgd)
                return 0;
            return rn2(6) ? POT_SPEED_OTYP : WAN_SPEED_MONSTER_OTYP;
        case 1:
            if (mtmp.mpeaceful && !seeInvisible())
                return 0;
            return rn2(6) ? POT_INVISIBILITY_OTYP : WAN_MAKE_INVISIBLE_OTYP;
        case 2:
            return POT_GAIN_LEVEL_OTYP;
        default:
            return 0;
    }
}
/**
 * Partial m_initinv: rogue guard + soldier magic skip + tail inventory RNG.
 * C ref: makemon.c:591–835 m_initinv — items are added via mpickobj → add_to_minv.
 * @param {{ mndx?: number, mnum?: number, m_lev?: number, minvent?: any }} mtmp
 * @param {(otyp: number, init: boolean, artif: boolean) => any} mksobjFn — bind mksobj from mklev.js
 */
export async function mInitinv(mtmp, mksobjFn) {
    const uz = game.u?.uz;
    if (uz && Is_rogue_level(uz))
        return;
    const mndx = monsndx(mtmp);
    /* C makemon.c:603–822 — class-specific starting gear switch on ptr->mlet. */
    /* Only the cases that can plausibly fire early in a normal game are ported. */
    /* S_GNOME candle check: always consumes rn2(60) [or rn2(20) in mines+mklev]. */
    /* S_NYMPH mirror/potion: two rn2(2) calls each. */
    /* S_MUMMY wrapping: rn2(7). */
    /* S_HUMAN shopkeeper: SKELETON_KEY + switch(rn2(4)) wand/potion set (C makemon.c:703-722). */
    {
        const S_GNOME = 33, S_NYMPH = 14, S_MUMMY = 39, S_HUMAN = 53;
        const S_GIANT = 34;              /* defsym.h:335 MONSYM(34,'H',GIANT,S_GIANT) */
        /* defsym.h MONSYM list: 12='l' LEPRECHAUN, 43='Q' QUANTMECH,
         * 49='W' WRAITH, 56='&' DEMON.  S_LICH (38) is already module-scope. */
        const S_WRAITH = 49, S_QUANTMECH = 43, S_LEPRECHAUN = 12, S_DEMON = 56;
        /* pm indices verified against js/makemon_pmnames.json + _mons.json mlet */
        const PM_NAZGUL = 231, PM_MASTER_LICH = 185, PM_ARCH_LICH = 186;
        const PM_QUANTUM_MECHANIC = 210, PM_ICE_DEVIL = 298, PM_ASMODEUS = 309;
        const PM_HOUSECAT = 33;
        /* otyps verified against js/oc_name_data.js OC_NAME */
        const RIN_INVISIBILITY = 198, WAN_NOTHING = 416, LARGE_BOX = 214;
        const CORPSE = 265, SPEAR = 27, WAN_FIRE = 430, WAN_COLD = 431;
        const M2_GIANT = 0x00002000;     /* monflag.h:136 */
        const DILITHIUM_CRYSTAL = 439, LUCKSTONE = 470;  /* oc_name_data.js verified */
        const PM_SHOPKEEPER_MNDX = 271;  /* pm.generated.js */
        const SKELETON_KEY_OTYP = 221;
        /* otyps verified against js/oc_name_data.js OC_NAME index */
        const ROBE_OTYP = 143, CLOAK_OF_PROTECTION_OTYP = 146;
        const CLOAK_OF_MAGIC_RESISTANCE_OTYP = 148, SMALL_SHIELD_OTYP = 150;
        const GOLD_PIECE_OTYP = 438;
        const MS_PRIEST = 41; /* monflag.h:56 */
        const WAN_MAGIC_MISSILE_OTYP = 429;  /* oc_name_data.js: 428="digging", 429="magic missile" */
        const POT_EXTRA_HEALING_OTYP = 308;
        const POT_HEALING_OTYP = 307;
        const WAN_STRIKING_OTYP = 417;
        const TALLOW_CANDLE = 224, WAX_CANDLE = 225;
        const MIRROR = 230, POT_OBJECT_DETECTION = 312;
        const MUMMY_WRAPPING = 138;
        /* mercenary gear otyps — indices verified against js/oc_name_data.js
         * OC_NAME (index == otyp), names matching C objects.c exactly. */
        const PLATE_MAIL = 121, CRYSTAL_PLATE_MAIL = 122;
        const SPLINT_MAIL = 124, BANDED_MAIL = 125;
        const STUDDED_LEATHER_ARMOR = 131, RING_MAIL = 132, LEATHER_ARMOR = 134;
        const LEATHER_CLOAK = 145, HELMET = 97, DENTED_POT = 95;
        const LARGE_SHIELD = 156, LEATHER_GLOVES = 159;
        const LOW_BOOTS = 163, HIGH_BOOTS = 165;
        const TIN_WHISTLE = 245, K_RATION = 294, C_RATION = 295, BUGLE = 256;
        const mlet = monMlet(mndx);
        switch (mlet) {
        case S_NYMPH:
            /* C makemon.c:734-739 — nymph: maybe mirror, maybe potion of obj detection */
            if (!rn2(2)) {
                const mirr = await mksobjFn(MIRROR, true, false);
                if (mirr) { _minv_link(mtmp, mirr); }
            }
            if (!rn2(2)) {
                const pot = await mksobjFn(POT_OBJECT_DETECTION, true, false);
                if (pot) { _minv_link(mtmp, pot); }
            }
            break;
        case S_GIANT:
            if (mndx === PM_MINOTAUR) {
                if (!rn2(8) || (game.in_mklev && Is_earthlevel(uz))) {
                    const w = await mksobjFn(WAN_DIGGING_OTYP, true, false);
                    if (w) { _minv_link(mtmp, w); }
                }
            } else if (((MONS[mndx][7] >>> 0) & M2_GIANT) !== 0) {
                /* is_giant(ptr): mflags2 & M2_GIANT (row[7] is mflags2) */
                for (let cnt = rn2((mtmp.m_lev | 0) >> 1); cnt; cnt--) {
                    const otmp = await mksobjFn(_rndClass(DILITHIUM_CRYSTAL, LUCKSTONE - 1),
                                          false, false);
                    if (otmp) {
                        otmp.quan = rn1(2, 3);
                        otmp.owt = weight(otmp);
                        await mpickobj(mtmp, otmp);
                    }
                }
            }
            break;
        case S_WRAITH:
            /* C makemon.c:752-758 — Nazgul: cursed ring of invisibility. No RNG
             * beyond mksobj's own; curse() is a plain field write. */
            if (mndx === PM_NAZGUL) {
                const rin = await mksobjFn(RIN_INVISIBILITY, false, false);
                if (rin) {
                    rin.cursed = true;
                    _minv_link(mtmp, rin);
                }
            }
            break;
        case S_LICH:
            /* C makemon.c:759-771. Note the else-if chain: the master-lich
             * rn2(13) is evaluated first and short-circuits, so an arch-lich
             * never draws it (ptr == master lich fails before rn2 is reached). */
            if (mndx === PM_MASTER_LICH && !rn2(13)) {
                await mongets(mtmp, rn2(7) ? _ATHAME : WAN_NOTHING, mksobjFn);
            } else if (mndx === PM_ARCH_LICH && !rn2(3)) {
                const pick = rn2(3) ? _ATHAME : _QUARTERSTAFF;
                const artif = rn2(13) ? false : true;
                const otmp = await mksobjFn(pick, true, artif);
                if (otmp) {
                    if ((otmp.spe | 0) < 2)
                        otmp.spe = rnd(3);
                    if (!rn2(4))
                        otmp.oerodeproof = 1;
                    _minv_link(mtmp, otmp);
                }
            }
            break;
        case S_MUMMY:
            /* C makemon.c:774-776 — mummy: rn2(7) → MUMMY_WRAPPING */
            if (rn2(7)) {
                await mongets(mtmp, MUMMY_WRAPPING, mksobjFn);   /* makemon.c:774 */
            }
            break;
        case S_QUANTMECH:
            if (!rn2(20) && mndx === PM_QUANTUM_MECHANIC) {
                const box = await mksobjFn(LARGE_BOX, false, false);
                const catcorpse = await mksobjFn(CORPSE, true, false);
                if (box && catcorpse) {
                    box.spe = 1; /* flag for special SchroedingersBox */
                    set_corpsenm(catcorpse, PM_HOUSECAT);
                    /* The placeholder corpse cannot rot before observation. */
                    stop_timer(ROT_CORPSE, { a_obj: catcorpse, a_long: null });
                    await add_to_container(box, catcorpse);
                    box.owt = weight(box);
                }
                if (box)
                    await mpickobj(mtmp, box);
            }
            break;
        case S_LEPRECHAUN:
            /* C makemon.c:796-798 — mkmonmoney(mtmp, d(level_difficulty(), 30)).
             * Unconditional: every leprechaun-class monster draws the d(). */
            await mkmonmoney(mtmp, d(levelDifficulty(), 30) | 0);
            break;
        case S_DEMON:
            /* C makemon.c:799-810 — moved here from m_initweap() because these
             * don't have AT_WEAP.  Ice devil's rn2(4) is guarded by the mndx
             * test, so only an ice devil draws it. */
            if (mndx === PM_ICE_DEVIL && !rn2(4)) {
                await mongets(mtmp, SPEAR, mksobjFn);
            } else if (mndx === PM_ASMODEUS) {
                await mongets(mtmp, WAN_COLD, mksobjFn);
                await mongets(mtmp, WAN_FIRE, mksobjFn);
            }
            break;
        case S_GNOME:
            /* C makemon.c:811-818 — gnome: rn2(60 or 20 in mines+mklev) → candle */
            if (!rn2((In_mines(uz) && game.in_mklev) ? 20 : 60)) {
                const candleType = rn2(4) ? TALLOW_CANDLE : WAX_CANDLE;
                const candle = await mksobjFn(candleType, true, false);
                if (candle) {
                    /* C makemon.c:813-814 — mksobj() can generate a random
                     * candle stack, but a gnome always starts with exactly one. */
                    candle.quan = 1;
                    candle.owt = weight(candle);
                    /* C makemon.c:816-818 — mpickobj() establishes OBJ_MINVENT
                     * and ocarry before the light-source lookup.  A generated
                     * gnome's candle burns immediately when its square is
                     * unlit; omitting this tail loses the candle's temporary
                     * light on arrival and leaves the surrounding glyphs dark. */
                    const freed = await mpickobj(mtmp, candle);
                    const loc = game.level?.at?.(mtmp.mx | 0, mtmp.my | 0);
                    if (!freed && !loc?.lit)
                        begin_burn(candle, false);
                }
            }
            break;
        case S_HUMAN:
            if (((MONS[mndx]?.[7] >>> 0) & M2_MERC) !== 0) {
                let mac;
                switch (mndx) {
                case PM_GUARD:          mac = -1; break;
                case PM_SOLDIER:        mac = 3;  break;
                case PM_SERGEANT:       mac = 0;  break;
                case PM_LIEUTENANT:     mac = -2; break;
                case PM_CAPTAIN:        mac = -3; break;
                case PM_WATCHMAN:       mac = 3;  break;
                case PM_WATCH_CAPTAIN:  mac = -2; break;
                default:
                    /* C: impossible("odd mercenary %d?", monsndx(ptr)); mac = 0; */
                    mac = 0;
                    break;
                }
                /* C makemon.c:634-636
                 *     #define add_ac(otmp) \
                 *         if (otmp) { mac += ARM_BONUS(otmp); } \
                 *         otmp = (struct obj *) 0;
                 * hack.h:1526 ARM_BONUS(obj) = objects[obj->otyp].a_ac + obj->spe
                 *                              - min(greatest_erosion(obj),
                 *                                    objects[obj->otyp].a_ac)
                 * obj.h:126 greatest_erosion(o) = max(o->oeroded, o->oeroded2).
                 * mksobj sets both spe and the erosions, so this is live data,
                 * not a constant: with mac at 9 after round 4 a 2-point boot or
                 * shield pushes it to 11 and SUPPRESSES round 5's rn2(3), which
                 * is a real RNG-sequence difference. */
                const add_ac = (o) => {
                    if (o) {
                        const aac = (ARMOR_DATA[o.otyp]?.a_ac) | 0;
                        const ero = Math.max(o.oeroded | 0, o.oeroded2 | 0);
                        mac += aac + (o.spe | 0) - Math.min(ero, aac);
                    }
                };
                let otmp;
                /* C makemon.c:638-650 — round 1: give them body armor */
                if (mac < -1 && rn2(5))
                    otmp = (await mongets(mtmp, rn2(5) ? PLATE_MAIL : CRYSTAL_PLATE_MAIL, mksobjFn));
                else if (mac < 3 && rn2(5))
                    otmp = (await mongets(mtmp, rn2(3) ? SPLINT_MAIL : BANDED_MAIL, mksobjFn));
                else if (rn2(5))
                    otmp = (await mongets(mtmp, rn2(3) ? RING_MAIL : STUDDED_LEATHER_ARMOR, mksobjFn));
                else
                    otmp = (await mongets(mtmp, LEATHER_ARMOR, mksobjFn));
                add_ac(otmp);
                /* C makemon.c:652-657 — round 2: helmets */
                otmp = null;
                if (mac < 10 && rn2(3))
                    otmp = (await mongets(mtmp, HELMET, mksobjFn));
                else if (mac < 10 && rn2(2))
                    otmp = (await mongets(mtmp, DENTED_POT, mksobjFn));
                add_ac(otmp);
                /* C makemon.c:659-664 — round 3: shields */
                otmp = null;
                if (mac < 10 && rn2(3))
                    otmp = (await mongets(mtmp, SMALL_SHIELD_OTYP, mksobjFn));
                else if (mac < 10 && rn2(2))
                    otmp = (await mongets(mtmp, LARGE_SHIELD, mksobjFn));
                add_ac(otmp);
                /* C makemon.c:666-671 — round 4: boots */
                otmp = null;
                if (mac < 10 && rn2(3))
                    otmp = (await mongets(mtmp, LOW_BOOTS, mksobjFn));
                else if (mac < 10 && rn2(2))
                    otmp = (await mongets(mtmp, HIGH_BOOTS, mksobjFn));
                add_ac(otmp);
                /* C makemon.c:673-678 — round 5: gloves + cloak */
                otmp = null;
                if (mac < 10 && rn2(3))
                    otmp = (await mongets(mtmp, LEATHER_GLOVES, mksobjFn));
                else if (mac < 10 && rn2(2))
                    otmp = (await mongets(mtmp, LEATHER_CLOAK, mksobjFn));
                add_ac(otmp); /* C: "not technically needed" — kept, it is harmless */
                /* C makemon.c:683-701 */
                if (mndx === PM_WATCH_CAPTAIN) {
                    /* C: better weapon rather than extra gear here */
                } else if (mndx === PM_WATCHMAN) {
                    if (rn2(3)) /* most watchmen carry a whistle */
                        await mongets(mtmp, TIN_WHISTLE, mksobjFn);
                } else if (mndx === PM_GUARD) {
                    /* C makemon.c:690-694: the vault guard's whistle is made
                     * directly and cursed, bypassing mongets.  C's curse()
                     * (mkobj.c:1783) is `blessed = 0; cursed = 1` plus branches
                     * that all key off uwep/uswapwep/carried(), none of which can
                     * hold for an object created here — and it draws no RNG. */
                    const whistle = await mksobjFn(TIN_WHISTLE, true, false);
                    if (whistle) {
                        whistle.blessed = 0;
                        whistle.cursed = 1;
                        _minv_link(mtmp, whistle);
                    }
                } else { /* soldiers and their officers */
                    if (!rn2(3))
                        await mongets(mtmp, K_RATION, mksobjFn);
                    if (!rn2(2))
                        await mongets(mtmp, C_RATION, mksobjFn);
                    if (mndx !== PM_SOLDIER && !rn2(3))
                        await mongets(mtmp, BUGLE, mksobjFn);
                }
            }
            /* C makemon.c:702-722: shopkeeper gets SKELETON_KEY (always) then
             * switch(rn2(4)) with MAJOR fall-through:
             *   case 0: WAN_MAGIC_MISSILE  (+ falls to 1,2,3)
             *   case 1: POT_EXTRA_HEALING  (+ falls to 2,3)
             *   case 2: POT_HEALING        (+ falls to 3)
             *   case 3: WAN_STRIKING       (always: every case falls through to 3)
             * Order: SKELETON_KEY first (rnd(2) for next_ident), then rn2(4). */
            else if (mndx === PM_SHOPKEEPER_MNDX) {
                /* SKELETON_KEY: mongets → mksobj(SKELETON_KEY, TRUE, FALSE) */
                {
                    const key = await mksobjFn(SKELETON_KEY_OTYP, true, false);
                    if (key) { _minv_link(mtmp, key); }
                }
                /* switch(rn2(4)) with MAJOR fall-through */
                {
                    const roll = rn2(4);
                    if (roll <= 0) {
                        const w = await mksobjFn(WAN_MAGIC_MISSILE_OTYP, true, false);
                        if (w) { _minv_link(mtmp, w); }
                    }
                    if (roll <= 1) {
                        const p = await mksobjFn(POT_EXTRA_HEALING_OTYP, true, false);
                        if (p) { _minv_link(mtmp, p); }
                    }
                    if (roll <= 2) {
                        const p = await mksobjFn(POT_HEALING_OTYP, true, false);
                        if (p) { _minv_link(mtmp, p); }
                    }
                    /* case 3: always WAN_STRIKING */
                    {
                        const w = await mksobjFn(WAN_STRIKING_OTYP, true, false);
                        if (w) { _minv_link(mtmp, w); }
                    }
                }
            }
            else if ((MONS_MSOUND[mndx] | 0) === MS_PRIEST
                     || questMonRepresentsRole(mndx, ROLE_IDX_CLERIC)) {
                const cloakOtyp = rn2(7) ? ROBE_OTYP
                                : rn2(3) ? CLOAK_OF_PROTECTION_OTYP
                                         : CLOAK_OF_MAGIC_RESISTANCE_OTYP;
                await mongets(mtmp, cloakOtyp, mksobjFn);
                await mongets(mtmp, SMALL_SHIELD_OTYP, mksobjFn);
                /* C makemon.c:576-586 mkmonmoney(mtmp, amount) — amount is
                 * always > 0 here (rn1(10,20) is 20..29), and mksobj is passed
                 * init=FALSE, so it draws nothing itself. */
                {
                    const amount = rn1(10, 20);
                    const gold = await mksobjFn(GOLD_PIECE_OTYP, false, false);
                    if (gold) {
                        gold.quan = amount;
                        gold.owt = weight(gold);
                        _minv_link(mtmp, gold);
                    }
                }
            }
            /* C makemon.c:728-729 — the quest-only Monk arm of the same chain:
             *     } else if (quest_mon_represents_role(ptr, PM_MONK)) {
             *         (void) mongets(mtmp, rn2(11) ? ROBE
             *                                      : CLOAK_OF_MAGIC_RESISTANCE);
             *     }
             * Reached by the Monk quest leader (Grand Master) / nemesis
             * (Master Kaen) when the hero is a Monk. */
            else if (questMonRepresentsRole(mndx, ROLE_IDX_MONK)) {
                const cloakOtyp = rn2(11) ? ROBE_OTYP
                                          : CLOAK_OF_MAGIC_RESISTANCE_OTYP;
                const c = await mksobjFn(cloakOtyp, true, false);
                if (c) { _minv_link(mtmp, c); }
            }
            break;
        default:
            break;
        }
    }
    if (mndx === PM_SOLDIER && rn2(13))
        return;
    const mlev = mtmp.m_lev | 0;
    if (mlev > rn2(50)) {
        const otyp = rndDefensiveItem(mtmp);
        /* C makemon.c:826 mongets() — applies the demon/prince adjustments. */
        if (otyp)
            await mongets(mtmp, otyp, mksobjFn);
    }
    if (mlev > rn2(100)) {
        const otyp2 = rndMiscItem(mtmp);
        /* C makemon.c:829 mongets() */
        if (otyp2)
            await mongets(mtmp, otyp2, mksobjFn);
    }
    if (likesGoldMndx(mndx) &&
        !findGold(mtmp.minvent) &&
        !rn2(5)) {
        const amount = d(levelDifficulty(), mtmp.minvent ? 5 : 10) | 0;
        await mkmonmoney(mtmp, amount);
    }
}
/* C objnam.c rnd_class(first, last) — local copy for mplayer armor/weapon picks.
 * Iterates otyp range [first..last], uses MKOBJ_OC_PROB weights; if all zero,
 * falls back to rn1(last-first+1, first).  C ref: objnam.c:5401-5417. */
function _rndClass(first, last) {
    if (last > first) {
        let sum = 0;
        for (let i = first; i <= last; i++)
            sum += MKOBJ_OC_PROB[i] | 0;
        if (!sum)
            return rn1(last - first + 1, first);
        let x = rnd(sum);
        for (let i = first; i <= last; i++) {
            x -= MKOBJ_OC_PROB[i] | 0;
            if (x <= 0)
                return i;
        }
    }
    return (first === last) ? first : 0; /* STRANGE_OBJECT */
}
/* mplayer.c PM_* otyp constants — verified against JS otyp space (MKOBJ_OC_CLASS / prob matching).
 * Player-monster classes: archeologist(331)..wizard(343); CLERIC=337 (priest/priestess), CAVE_DWELLER=333 (caveman). */
const _PM_ARCHEOLOGIST = 331;
const _PM_BARBARIAN = 332;
const _PM_CAVE_DWELLER = 333; /* caveman/cavewoman in JS pm.generated.js */
const _PM_HEALER = 334;
const _PM_KNIGHT = 335;
const _PM_MONK = 336;
const _PM_CLERIC = 337; /* priest/priestess — JS otyp 337 (between MONK=336 and RANGER=338) */
const _PM_RANGER = 338;
const _PM_ROGUE = 339;
const _PM_SAMURAI = 340;
const _PM_TOURIST = 341;
const _PM_VALKYRIE = 342;
const _PM_WIZARD = 343;
/* Weapon otyp constants (from m_initweap.js verified values). */
const _SPEAR = 27;
const _ELVEN_DAGGER = 35;
const _ORCISH_DAGGER = 36;
const _ATHAME = 38;
const _SCALPEL = 39;
const _BATTLE_AXE = 45;
const _SHORT_SWORD = 46;
const _LONG_SWORD = 54;
const _TWO_HANDED_SWORD = 55;
const _KATANA = 56;
const _MACE = 73;
const _WAR_HAMMER = 76;
const _CLUB = 77;
const _QUARTERSTAFF = 79;
const _BULLWHIP = 82;
const _SHURIKEN = 25;
/* Armor otyp constants verified via MKOBJ_OC_PROB probability matching + anchor cross-check. */
const _ELVEN_LEATHER_HELM = 89; /* first armor — MKOBJ_SVB_BASES[3]=89 */
const _HELM_OF_BRILLIANCE = 96; /* prob=6, C HELM macro position 7 from ELH */
const _HELM_OF_TELEPATHY = 100; /* prob=4, TELEPAT */
const _GRAY_DRAGON_SCALE_MAIL = 101; /* u_init.js anchor */
const _YELLOW_DRAGON_SCALE_MAIL = 110; /* objects.h ARMOR(); 111 is gray dragon SCALES */
const _PLATE_MAIL = 121; /* u_init.js anchor */
const _CHAIN_MAIL = 128; /* objects.h ARMOR() CHAIN_MAIL; was 131 = STUDDED_LEATHER_ARMOR */
const _ROBE = 143; /* u_init.js ROBE_OTYP */
const _OILSKIN_CLOAK = 142; /* objects.h ARMOR() oilskin cloak; 145 is the leather cloak */
const _CLOAK_OF_DISPLACEMENT = 149; /* u_init.js CLOAK_OF_DISPLACEMENT_OTYP */
const _CLOAK_OF_MAGIC_RESISTANCE = 148; /* u_init.js CLOAK_OF_MAGIC_RESISTANCE_OTYP */
const _ELVEN_SHIELD = 153; /* objects.h ARMOR() ELVEN_SHIELD; was 152 = SHIELD_OF_SHOCK_RESISTANCE */
const _SHIELD_OF_REFLECTION = 158; /* objects.h ARMOR() SHIELD_OF_REFLECTION; was 157 = DWARVISH_ROUNDSHIELD */
const _LEATHER_GLOVES = 159; /* u_init.js LEATHER_GLOVES_OTYP, prob[159]=15 */
const _GAUNTLETS_OF_POWER = 161; /* prob[161]=8, C pos 72 */
const _GAUNTLETS_OF_DEXTERITY = 162; /* prob[162]=8, C pos 73 */
const _LOW_BOOTS = 163; /* prob[163]=23, C LOW_BOOTS */
const _LEVITATION_BOOTS = 172; /* mklev.js anchor */
const _FAKE_AMULET_OF_YENDOR = 212; /* objects.h AMULET() FAKE_AMULET_OF_YENDOR; was 420 = WAN_SPEED_MONSTER */
const _DILITHIUM_CRYSTAL = 439; /* mklev.js */
const _JADE = 460; /* o_init.js LAST_REAL_GEM */
const _LUCKSTONE = 470; /* mklev.js */
const _LOADSTONE = 471; /* mklev.js */
const _STRANGE_OBJECT = 0; /* u_init.js STRANGE_OBJECT */
/* artilist.h ARTI_ENUM ordinal for Magicbane.  Counting the A("name",...)
 * entries in order: 0 "" (NONARTIFACT), 1 Excalibur, 2 Stormbringer,
 * 3 Mjollnir, 4 Cleaver, 5 Grimtooth, 6 Orcrist, 7 Sting, 8 Magicbane.
 * Cross-checked against js/cmd.js's independently cpp-verified
 * ART_SNICKERSNEE=19: Snickersnee is 11 entries past Magicbane
 * (Frost Brand, Fire Brand, Dragonbane, Demonbane, Werebane, Grayswandir,
 * Giantslayer, Ogresmasher, Trollsbane, Vorpal Blade, Snickersnee), and
 * 8 + 11 = 19. */
const ART_MAGICBANE = 8;
/* C mplayer.c is_mplayer(ptr): ptr is mndx (JS representation of permonst*). */
function _isMplayer(mndx) {
    return mndx >= _PM_ARCHEOLOGIST && mndx <= _PM_WIZARD;
}
/** C mplayer.c:95 mk_mplayer_armor(mon, typ) — RNG: rn2(3)×3, then rn2(10)/rn2(3)/rn2(5)/rn1(4,4)/rnd(3).
 * @param {number} typ — otyp of armor to create; STRANGE_OBJECT(0) → early return.
 * @param {(typ:number, init:boolean, artif:boolean)=>any} mksobjFn
 * @param {(mon:any, obj:any)=>void} mpickobjFn
 * @param {any} mon
 */
async function _mkMplayerArmor(typ, mksobjFn, mpickobjFn, mon) {
    if (typ === _STRANGE_OBJECT)
        return;
    const obj = mksobjFn ? await mksobjFn(typ, false, false) : null;
    /* oeroded = oeroded2 = 0 (no RNG) */
    if (!rn2(3)) {
        if (obj)
            obj.oerodeproof = 1;
    }
    if (!rn2(3)) { /* curse(obj) — no extra RNG */
        if (obj) {
            obj.cursed = 1;
            obj.blessed = 0;
        }
    }
    if (!rn2(3)) { /* bless(obj) — no extra RNG */
        if (obj) {
            obj.blessed = 1;
            obj.cursed = 0;
        }
    }
    /* obj->spe = rn2(10) ? (rn2(3) ? rn2(5) : rn1(4, 4)) : -rnd(3) */
    if (rn2(10)) {
        const spe = rn2(3) ? rn2(5) : rn1(4, 4);
        if (obj)
            obj.spe = spe;
    }
    else {
        const spe = -rnd(3);
        if (obj)
            obj.spe = spe;
    }
    if (obj && mpickobjFn && mon)
        await mpickobjFn(mon, obj);
}
// (C sp_lev.c:1987).  async because js/mklev.js makemon() is async.
export async function mkMplayer(ptr, x, y, special, cbs) {
    /* C mplayer.c:123 if (!is_mplayer(ptr)) return NULL;
     * ptr is the JS analog of C's `permonst *pm`, which create_monster may have
     * nulled for a genocided/extinct type; _isMplayer(null) is false, matching
     * C's is_mplayer(NULL) pointer-range test. */
    if (!_isMplayer(ptr))
        return null;
    /* C mplayer.c:125-126 if (MON_AT(x,y)) rloc(m_at(x,y), RLOC_ERR|RLOC_NOMSG)
     * — "insurance".  create_monster already tried enexto() to find a free
     * neighbour, so this only fires when that failed and (x,y) is still
     * occupied.  rloc() DOES draw RNG (it picks a random destination), so this
     * must be a real call, not a comment. */
    if (cbs.rlocInsurance)
        cbs.rlocInsurance(x, y);
    /* C mplayer.c:129-130 if (!In_endgame(&u.uz)) special = FALSE; */
    const uz = game.u?.uz;
    if (!uz || !In_endgame(uz))
        special = false;
    /* C mplayer.c:132 makemon(ptr, x, y, special ? MM_NOMSG : NO_MM_FLAGS) */

    const NO_MM_FLAGS = 0;
    let mtmp = await cbs.makemon(ptr, x, y, special ? MM_NOMSG : NO_MM_FLAGS);
    if (mtmp) {
        /* C mplayer.c:137 mtmp->m_lev = (special ? rn1(16, 15) : rnd(16)) */
        const m_lev = special ? rn1(16, 15) : rnd(16);
        if (mtmp)
            mtmp.m_lev = m_lev;
        /* C mplayer.c:138-139 mtmp->mhp = mtmp->mhpmax = d(m_lev, 10) + (special ? (30 + rnd(30)) : 30) */
        const mhp_base = d(m_lev, 10);
        const mhp_bonus = special ? (30 + rnd(30)) : 30;
        if (mtmp) {
            mtmp.mhp = mtmp.mhpmax = mhp_base + mhp_bonus;
        }
        /* C mplayer.c:140-145 if (special) { get_mplname, christen_monst, mongets(FAKE_AMULET) } */
        if (special) {
            const nam = cbs?.getMplname ? cbs.getMplname(mtmp) : 'Adam';
            if (cbs?.christenMonst)
                mtmp = cbs.christenMonst(mtmp, nam) ?? mtmp;
            /* mongets(mtmp, FAKE_AMULET_OF_YENDOR) — no RNG consumed by mongets itself */
            if (cbs?.mongets)
                await cbs.mongets(mtmp, _FAKE_AMULET_OF_YENDOR);
        }
        /* C mplayer.c:146-147 mtmp->mpeaceful = 0; set_malign(mtmp) */
        if (mtmp)
            mtmp.mpeaceful = 0;
        cbs.setMalign(mtmp);
        /* C mplayer.c:149-157 default equipment rolls */
        /* weapon = !rn2(2) ? LONG_SWORD : rnd_class(SPEAR, BULLWHIP) */
        let weapon = !rn2(2) ? _LONG_SWORD : _rndClass(_SPEAR, _BULLWHIP);
        /* armor  = rnd_class(GRAY_DRAGON_SCALE_MAIL, YELLOW_DRAGON_SCALE_MAIL) */
        let armor = _rndClass(_GRAY_DRAGON_SCALE_MAIL, _YELLOW_DRAGON_SCALE_MAIL);
        /* cloak  = !rn2(8) ? STRANGE_OBJECT : rnd_class(OILSKIN_CLOAK, CLOAK_OF_DISPLACEMENT) */
        let cloak = !rn2(8) ? _STRANGE_OBJECT : _rndClass(_OILSKIN_CLOAK, _CLOAK_OF_DISPLACEMENT);
        /* helm   = !rn2(8) ? STRANGE_OBJECT : rnd_class(ELVEN_LEATHER_HELM, HELM_OF_TELEPATHY) */
        let helm = !rn2(8) ? _STRANGE_OBJECT : _rndClass(_ELVEN_LEATHER_HELM, _HELM_OF_TELEPATHY);
        /* shield = !rn2(8) ? STRANGE_OBJECT : rnd_class(ELVEN_SHIELD, SHIELD_OF_REFLECTION) */
        let shield = !rn2(8) ? _STRANGE_OBJECT : _rndClass(_ELVEN_SHIELD, _SHIELD_OF_REFLECTION);
        /* C mplayer.c:159-254 switch(monsndx(ptr)) class-specific overrides */
        switch (ptr) {
            case _PM_ARCHEOLOGIST:
                /* if (rn2(2)) weapon = BULLWHIP; */
                if (rn2(2))
                    weapon = _BULLWHIP;
                break;
            case _PM_BARBARIAN:
                /* if (rn2(2)) { weapon = rn2(2) ? TWO_HANDED_SWORD : BATTLE_AXE; shield = SO; } */
                if (rn2(2)) {
                    weapon = rn2(2) ? _TWO_HANDED_SWORD : _BATTLE_AXE;
                    shield = _STRANGE_OBJECT;
                }
                /* if (rn2(2)) armor = rnd_class(PLATE_MAIL, CHAIN_MAIL) */
                if (rn2(2))
                    armor = _rndClass(_PLATE_MAIL, _CHAIN_MAIL);
                /* if (helm == HELM_OF_BRILLIANCE) helm = SO */
                if (helm === _HELM_OF_BRILLIANCE)
                    helm = _STRANGE_OBJECT;
                break;
            case _PM_CAVE_DWELLER:
                /* if (rn2(4)) weapon = MACE; else if (rn2(2)) weapon = CLUB */
                if (rn2(4))
                    weapon = _MACE;
                else if (rn2(2))
                    weapon = _CLUB;
                /* if (helm == HELM_OF_BRILLIANCE) helm = SO */
                if (helm === _HELM_OF_BRILLIANCE)
                    helm = _STRANGE_OBJECT;
                break;
            case _PM_HEALER:
                /* if (rn2(4)) weapon = QUARTERSTAFF; else if (rn2(2)) weapon = rn2(2)?UNICORN_HORN:SCALPEL */
                if (rn2(4))
                    weapon = _QUARTERSTAFF;
                else if (rn2(2))
                    weapon = rn2(2) ? _UNICORN_HORN : _SCALPEL;
                /* if (rn2(4)) helm = rn2(2) ? HELM_OF_BRILLIANCE : HELM_OF_TELEPATHY */
                if (rn2(4))
                    helm = rn2(2) ? _HELM_OF_BRILLIANCE : _HELM_OF_TELEPATHY;
                /* if (rn2(2)) shield = SO */
                if (rn2(2))
                    shield = _STRANGE_OBJECT;
                break;
            case _PM_KNIGHT:
                /* if (rn2(4)) weapon = LONG_SWORD */
                if (rn2(4))
                    weapon = _LONG_SWORD;
                /* if (rn2(2)) armor = rnd_class(PLATE_MAIL, CHAIN_MAIL) */
                if (rn2(2))
                    armor = _rndClass(_PLATE_MAIL, _CHAIN_MAIL);
                break;
            case _PM_MONK:
                /* weapon = !rn2(3) ? SHURIKEN : STRANGE_OBJECT */
                weapon = !rn2(3) ? _SHURIKEN : _STRANGE_OBJECT;
                armor = _STRANGE_OBJECT;
                cloak = _ROBE;
                /* if (rn2(2)) shield = SO */
                if (rn2(2))
                    shield = _STRANGE_OBJECT;
                break;
            case _PM_CLERIC:
                /* if (rn2(2)) weapon = MACE */
                if (rn2(2))
                    weapon = _MACE;
                /* if (rn2(2)) armor = rnd_class(PLATE_MAIL, CHAIN_MAIL) */
                if (rn2(2))
                    armor = _rndClass(_PLATE_MAIL, _CHAIN_MAIL);
                /* if (rn2(4)) cloak = ROBE */
                if (rn2(4))
                    cloak = _ROBE;
                /* if (rn2(4)) helm = rn2(2) ? HELM_OF_BRILLIANCE : HELM_OF_TELEPATHY */
                if (rn2(4))
                    helm = rn2(2) ? _HELM_OF_BRILLIANCE : _HELM_OF_TELEPATHY;
                /* if (rn2(2)) shield = SO */
                if (rn2(2))
                    shield = _STRANGE_OBJECT;
                break;
            case _PM_RANGER:
                /* if (rn2(2)) weapon = ELVEN_DAGGER */
                if (rn2(2))
                    weapon = _ELVEN_DAGGER;
                break;
            case _PM_ROGUE:
                /* if (rn2(2)) weapon = rn2(2) ? SHORT_SWORD : ORCISH_DAGGER */
                if (rn2(2))
                    weapon = rn2(2) ? _SHORT_SWORD : _ORCISH_DAGGER;
                break;
            case _PM_SAMURAI:
                /* if (rn2(2)) weapon = KATANA */
                if (rn2(2))
                    weapon = _KATANA;
                break;
            case _PM_TOURIST:
                /* Defaults are just fine — no extra RNG */
                break;
            case _PM_VALKYRIE:
                /* if (rn2(2)) weapon = WAR_HAMMER */
                if (rn2(2))
                    weapon = _WAR_HAMMER;
                /* if (rn2(2)) armor = rnd_class(PLATE_MAIL, CHAIN_MAIL) */
                if (rn2(2))
                    armor = _rndClass(_PLATE_MAIL, _CHAIN_MAIL);
                break;
            case _PM_WIZARD:
                /* if (rn2(4)) weapon = rn2(2) ? QUARTERSTAFF : ATHAME */
                if (rn2(4))
                    weapon = rn2(2) ? _QUARTERSTAFF : _ATHAME;
                /* if (rn2(2)) { armor = rn2(2)?BLACK_DSM:SILVER_DSM; cloak = CMR; } */
                if (rn2(2)) {
                    /* v5 objects.h: BLACK_DRAGON_SCALE_MAIL = 107 (shimmering is
                     * #if 0, so 108 is BLUE), SILVER_DRAGON_SCALE_MAIL = 103 */
                    armor = rn2(2) ? 107 : 103;
                    cloak = _CLOAK_OF_MAGIC_RESISTANCE;
                }
                /* if (rn2(4)) helm = HELM_OF_BRILLIANCE */
                if (rn2(4))
                    helm = _HELM_OF_BRILLIANCE;
                shield = _STRANGE_OBJECT;
                break;
            default:
                /* impossible("bad mplayer monster") — no RNG */
                weapon = _STRANGE_OBJECT;
                break;
        }
        /* C mplayer.c:256-275 weapon setup */
        if (weapon !== _STRANGE_OBJECT) {
            const otmp = await cbs.mksobj(weapon, true, false);
            /* C mplayer.c:258 otmp->oeroded = otmp->oeroded2 = 0 */
            if (otmp)
                otmp.oeroded = otmp.oeroded2 = 0;
            /* otmp->spe = (special ? rn1(5, 4) : rn2(4)) */
            const spe_w = special ? rn1(5, 4) : rn2(4);
            if (otmp)
                otmp.spe = spe_w;
            /* if (!rn2(3)) otmp->oerodeproof = 1; else if (!rn2(2)) otmp->greased = 1 */
            if (!rn2(3)) {
                if (otmp)
                    otmp.oerodeproof = 1;
            }
            else if (!rn2(2)) {
                if (otmp)
                    otmp.greased = 1;
            }
            /* if (special && rn2(2)) otmp = mk_artifact(otmp, A_NONE, 99, FALSE) */
            if (special && rn2(2)) {
                const A_NONE = -128;
                if (cbs?.mkArtifact && otmp) {
                    const art = cbs.mkArtifact(otmp, A_NONE, 99, false);
                    /* otmp may have changed — use art if returned */
                }
            }
            /* C mplayer.c:268-270:
             *   if (objects[otmp->otyp].oc_merge && !otmp->oartifact
             *       && monmightthrowwep(otmp))
             *       otmp->quan += (long) rn2(is_spear(otmp) ? 4 : 8);
             *
             * js/ has no generated per-otyp oc_merge table (see js/cmd.js:18188
             * for the same gap).  It is not needed HERE, because at this call
             * site `oc_merge` is implied by `monmightthrowwep`: that predicate
             * is exact membership in weapon.c's rwep[], and EVERY rwep member
             * has oc_merge=1 — the racial spears/daggers/knife/dart/shuriken/
             * javelin come from objects.h's WEAPON() with mg=1, the arrows/ya/
             * bolts from PROJECTILE() which hardcodes BITS(kn,1,...), flint/
             * rock/loadstone/luckstone from ROCK() which hardcodes BITS(kn,1,
             * ...), and cream pie from FOOD() which hardcodes BITS(1,1,...).
             * So `oc_merge && monmightthrowwep` === `monmightthrowwep`, and
             * dropping the first conjunct changes neither the RNG count nor the
             * branch.  (The oc_merge=0 weapons this function can pick — LONG_
             * SWORD, BULLWHIP, MACE, KATANA, … — are all absent from rwep, so
             * they are excluded by monmightthrowwep alone.)  If a real oc_merge
             * table ever lands, restore the conjunct verbatim.
             *
             * The callbacks are required, not optional: without monmightthrowwep
             * JS would silently skip an rn2 that C draws.  mkMplayer's contract
             * (see header) is that every RNG-affecting callback is supplied. */
            const isMergeable = !!otmp && !otmp.oartifact && cbs.monmightthrowwep(otmp);
            if (isMergeable)
                otmp.quan = (otmp.quan ?? 1) + rn2(cbs.isSpear(otmp) ? 4 : 8);
            /* C mplayer.c:271 otmp->owt = weight(otmp) — after the quan bump */
            if (otmp)
                otmp.owt = cbs.weight(otmp);
            /* C mplayer.c:272-274 — mplayers knew better than to overenchant
             * Magicbane.  Unreachable while special=FALSE (oartifact is only
             * ever set by the mk_artifact call in the `special` branch above),
             * but ported rather than dropped so the special path stays whole. */
            if (otmp && cbs.isArt(otmp, ART_MAGICBANE)) {
                otmp.spe = rnd(4);
            }
            /* mpickobj(mtmp, otmp) */
            if (cbs?.mpickobj && mtmp && otmp)
                await cbs.mpickobj(mtmp, otmp);
        }
        /* C mplayer.c:278-303 if (special) { armor phase + gold + gems + random items } */
        if (special) {
            /* if (!rn2(10)) mongets(mtmp, rn2(3) ? LUCKSTONE : LOADSTONE) */
            if (!rn2(10)) {
                const stone = rn2(3) ? _LUCKSTONE : _LOADSTONE;
                if (cbs?.mongets)
                    await cbs.mongets(mtmp, stone);
            }
            await _mkMplayerArmor(armor, cbs?.mksobj, cbs?.mpickobj, mtmp);
            await _mkMplayerArmor(cloak, cbs?.mksobj, cbs?.mpickobj, mtmp);
            await _mkMplayerArmor(helm, cbs?.mksobj, cbs?.mpickobj, mtmp);
            await _mkMplayerArmor(shield, cbs?.mksobj, cbs?.mpickobj, mtmp);
            /* if (weapon == WAR_HAMMER) mk_mplayer_armor(GAUNt_OF_POWER)
               else if (rn2(8)) mk_mplayer_armor(rnd_class(LEATHER_GLOVES, GAUNTLETS_OF_DEXTERITY)) */
            if (weapon === _WAR_HAMMER) {
                await _mkMplayerArmor(_GAUNTLETS_OF_POWER, cbs?.mksobj, cbs?.mpickobj, mtmp);
            }
            else if (rn2(8)) {
                await _mkMplayerArmor(_rndClass(_LEATHER_GLOVES, _GAUNTLETS_OF_DEXTERITY), cbs?.mksobj, cbs?.mpickobj, mtmp);
            }
            /* if (rn2(8)) mk_mplayer_armor(rnd_class(LOW_BOOTS, LEVITATION_BOOTS)) */
            if (rn2(8)) {
                await _mkMplayerArmor(_rndClass(_LOW_BOOTS, _LEVITATION_BOOTS), cbs?.mksobj, cbs?.mpickobj, mtmp);
            }
            /* m_dowear(mtmp, TRUE) */
            if (cbs?.m_dowear)
                await cbs.m_dowear(mtmp, true);
            /* quan = rn2(3) ? rn2(3) : rn2(16); while (quan--) mongets(DILITHIUM_CRYSTAL, JADE) */
            let quan = rn2(3) ? rn2(3) : rn2(16);
            while (quan--) {
                if (cbs?.mongets)
                    await cbs.mongets(mtmp, _rndClass(_DILITHIUM_CRYSTAL, _JADE));
            }
            /* mkmonmoney(mtmp, rn2(1000)) */
            if (cbs?.mkmonmoney)
                await cbs.mkmonmoney(mtmp, rn2(1000));
            /* quan = rn2(10); while (quan--) mpickobj(mkobj(RANDOM_CLASS, FALSE)) */
            quan = rn2(10);
            while (quan--) {
                const obj = cbs?.mkobj ? await cbs.mkobj(0 /* RANDOM_CLASS */, false) : null;
                if (obj && cbs?.mpickobj)
                    await cbs.mpickobj(mtmp, obj);
            }
        }
        /* C mplayer.c:305-313 — always: rnd(3) each of offensive/defensive/misc
         * items.  These three callbacks are REQUIRED: rnd_offensive_item /
         * rnd_defensive_item / rnd_misc_item each draw RNG of their own, so a
         * missing callback would drop draws C makes.  mongets() likewise draws
         * (it calls mksobj), so it is only skipped when otyp is 0 — exactly as
         * C's mongets() early-returns on !otyp. */
        let quan3 = rnd(3);
        while (quan3--) {
            const otyp = cbs.rndOffensiveItem(mtmp);
            if (otyp)
                await cbs.mongets(mtmp, otyp);
        }
        quan3 = rnd(3);
        while (quan3--) {
            const otyp = cbs.rndDefensiveItem(mtmp);
            if (otyp)
                await cbs.mongets(mtmp, otyp);
        }
        quan3 = rnd(3);
        while (quan3--) {
            const otyp = cbs.rndMiscItem(mtmp);
            if (otyp)
                await cbs.mongets(mtmp, otyp);
        }
    }
    return mtmp;
}

import { mInitweap, rndOffensiveItem } from './m_initweap.js';
export { mInitweap, rndOffensiveItem };

export const newmonhp = newMonHp;

export const MAXMONNO = 120; /* exported: js/mklev.js's newcham() needs it too */
const PM_NAZGUL = 231;
export function mbirth_limit(mndx) {
    return (mndx === PM_NAZGUL ? 9 : mndx === PM_ERINYS ? 3 : MAXMONNO);
}

/* C ref: makemon.c:1553-1588 create_critters(cnt, mptr, neverask)
 *   "used for wand/scroll/spell of create monster"
 *   returns TRUE iff you know monsters have been created
 *
 * Callers: zap.c:2571 zapnodir()'s WAN_CREATE_MONSTER/SPE_CREATE_MONSTER arm
 * (neverask FALSE) and read.c:1615 seffect_create_monster() (also FALSE).
 * Until now this was a THROWING STUB, file-local to js/zap.js, so zapping a
 * wand of create monster halted the whole scored run at that keystroke.
 *
 * async because this port's makemon() (js/mklev.js:4656) and
 * create_particular() (js/wizcmds.js:1253) are async; C's are ordinary calls.
 * The RNG order is unaffected — every await here is on the same expression C
 * evaluates at the same point.
 *
 * NO RNG of its own: every draw in this function comes out of makemon() (or,
 * in the u.uinwater branch, out of enexto()'s collect_coords shuffles).
 */
export async function create_critters(cnt, mptr, neverask) {
    const u = game.u || {};
    let known = false;
    /* C: boolean ask = (wizard && !neverask); */
    let ask = wizard() && !neverask;

    cnt |= 0;
    /* C: while (cnt--) — post-decrement, so a cnt of 0 runs the body zero
     * times and a negative cnt runs it zero times too (the test is on the
     * pre-decrement value being nonzero, and C's caller never passes < 0). */
    while (cnt-- > 0) {
        if (ask) {
            if (await create_particular()) {
                known = true;
                continue;
            } else {
                ask = false; /* ESC will shut off prompting */
            }
        }
        let x = u.ux | 0, y = u.uy | 0;
        /* C makemon.c:1576-1579 — if in water, try to encourage an aquatic
         * monster by finding and then specifying another wet location.
         *     if (!mptr && u.uinwater && enexto(&c, x, y, &mons[PM_GIANT_EEL]))
         *         x = c.x, y = c.y;
         * enexto() CONSUMES RNG (collect_coords ring shuffles), so the guard
         * order matters: !mptr and u.uinwater are both tested first. */
        if (!mptr && u.uinwater) {
            const c = enexto_out(x, y, permonstTemplate(PM_GIANT_EEL));
            if (c) {
                x = c.x | 0;
                y = c.y | 0;
            }
        }

        const mon = await makemon(mptr, x, y, NO_MM_FLAGS);
        if (!mon)
            continue; /* try again [should probably stop instead] */

        /* C makemon.c:1584-1587:
         *     if ((canseemon(mon) && (M_AP_TYPE(mon) == M_AP_NOTHING
         *                             || M_AP_TYPE(mon) == M_AP_MONSTER))
         *         || sensemon(mon))
         *         known = TRUE;
         * M_AP_TYPE(mon) is (mon->m_ap_type & M_AP_TYPMASK). */
        const apt = (mon.m_ap_type | 0) & M_AP_TYPMASK;
        if ((canseemon(mon) && (apt === M_AP_NOTHING || apt === M_AP_MONSTER))
            || sensemon(mon))
            known = true;
    }
    return known;
}

export async function propagate(mndx, tally, ghostly) {
    mndx = mndx | 0;
    tally = tally ? 1 : 0;
    ghostly = ghostly ? 1 : 0;
    const lim = mbirth_limit(mndx);
    if (!game.mvitals)
        game.mvitals = {};
    const mv = game.mvitals[mndx] || (game.mvitals[mndx] = { born: 0, died: 0, mvflags: 0 });

    const gone = (mv.mvflags & G_GONE) !== 0;
    const result = ((mv.born | 0) < lim && !gone) ? 1 : 0;

    /* if it's unique, don't ever make it again */
    const mons_row = MONS[mndx];
    if (mons_row && (mons_row[3] & G_UNIQ) !== 0 && mndx !== PM_HIGH_CLERIC) {
        mv.mvflags |= G_EXTINCT; /* C makemon.c:968 */
    }

    if ((mv.born | 0) < 255 && tally && (!ghostly || result)) {
        mv.born = (mv.born | 0) + 1;
    }
    if ((mv.born | 0) >= lim
        && !(mons_row[3] & G_NOGEN)
        && !(mv.mvflags & G_EXTINCT)) {
        /* C makemon.c:975-978, include/lint.h:29-38 (ifdebug). */
        if (wizard() && debugcore('makemon.c', true)) {
            const saved = game.iflags.last_msg;
            await pline('Automatically extinguished %s.', makeplural(MONS_PMNAMES[mndx][NEUTRAL])); /* C makemon.c:977 */
            game.iflags.last_msg = saved;
        }
        mv.mvflags |= G_EXTINCT; /* C makemon.c:979 */
    }
    return result;
}

/* C: nethack-c/src/makemon.c:1067 newmextra */
export function newmextra() {
    const mextra = alloc_makemon(sizeof_mextra);
    init_mextra(mextra);
    return mextra;
}

function alloc_makemon(size) { return {}; }
function sizeof_mextra() { return 1; }
/* C: nethack-c/src/makemon.c:1061 init_mextra
 *     *mex = zeromextra;      / * static const struct mextra zeromextra = DUMMY * /
 *     mex->mcorpsenm = NON_PM;
 * zeromextra zeroes every member, so all seven pointer members of
 * struct mextra (mextra.h:205-216) are explicitly NULL, not absent. */
function init_mextra(mex) {
    mex.mgivenname = null;
    mex.egd = null;
    mex.epri = null;
    mex.eshk = null;
    mex.emin = null;
    mex.edog = null;
    mex.ebones = null;
    mex.mcorpsenm = NON_PM;
}

/* C muse.c:327 (defensive block) — shared with the offensive selector. */

/* enum m_seen_resistance — C nethack-c/include/monst.h:75-86, values verbatim.
 *
 * These are bits of struct monst's `seen_resistance` field (monst.h:118), NOT
 * of `mextrinsics` (monst.h:117) as the previous comment here claimed — those
 * are two different fields in two different bit spaces (mextrinsics holds MR_*
 * resistance bits and is written by trap.js:3719).
 *
 * The whole block below was previously invented as sequential bit positions
 * in declaration order (REFL=0x01 MAGR=0x02 SLEEP=0x04 FIRE=0x08 COLD=0x10
 * ELEC=0x20 ACID=0x40).  Six of the seven disagreed with C; only M_SEEN_ELEC
 * was right, and only by coincidence.  Because these are read and written as a
 * bitmask (m_seenres / monstseesu / monstunseesu), a wrong bit does not fail
 * loudly — it records one resistance and tests a different one. */
const M_SEEN_NOTHING = 0x0000;
import { M_SEEN_MAGR } from './muse.js';
const M_SEEN_DISINT  = 0x0010; /* monst.h:81  Disint_resistance, AD_DISN */
const M_SEEN_POISON  = 0x0040; /* monst.h:83  AD_DRST */
void M_SEEN_NOTHING; void M_SEEN_DISINT; void M_SEEN_POISON;

import { FROST_HORN } from './muse.js';
export const BOULDER = 475;


export { monnear }; /* single C-faithful body: mon.js (C mon.c:2476) */



/* FOOD_CLASS otyps (objects.h OBJECTS_ENUM order; OC_NAME[265]=="corpse",
 * OC_NAME[296]=="tin").  Were 19 and 20 — "elven arrow" and "orcish arrow" in
 * this build, so find_defensive's lizard-corpse / lizard-tin scan matched
 * arrows and never matched a corpse or a tin. */
const CORPSE = 265;
export const TIN = 296;









/* C monflag.h:132 M2_MERC 0x00000200L;
 * mondata.h:111 is_mercenary(ptr) = (((ptr)->mflags2 & M2_MERC) != 0L) */
const M2_MERC = 0x00000200;
/* C mondata.h throws_rocks(ptr) = (((ptr)->mflags2 & M2_ROCKTHROW) != 0L) */
const M2_ROCKTHROW = 0x08000000;
function throws_rocks(data) { return (data.mflags2 & M2_ROCKTHROW) !== 0; }
/* C you.h:555 u_at(x,y) = ((x) == u.ux && (y) == u.uy) */
function u_at(x, y) { return x === game.u.ux && y === game.u.uy; }
/* C invent.c:1466 — share the per-tile nexthere lookup with level code. */
import { sobj_at } from './invent.js';


/* ---------------------------------------------------------------------------
 * mquaffmsg(mtmp, otmp) — C ref: nethack-c/src/muse.c:292-302 (staticfn).
 *
 *   if (canseemon(mtmp)) {
 *       observe_object(otmp);
 *       pline_mon(mtmp, "%s drinks %s!", Monnam(mtmp), singular(otmp, doname));
 *   } else if (!Deaf) {
 *       Soundeffect(se_mon_chugging_potion, 25);
 *       You_hear("a chugging sound.");
 *   }
 *
 * C uses singular(otmp, doname), including xname's naming side effects.
 * In particular, a Cleric learns BUC while the name is formatted.  Use the
 * canonical formatter and restore the stack quantity before the caller
 * consumes the potion.  Naming under Hallucination retains that formatter's
 * own C-derived behavior; this wrapper does not fabricate RNG draws.
 * ---------------------------------------------------------------------------
 */
/* C ref: nethack-c/include/youprop.h:125 Deaf = (HDeaf || EDeaf ||
 * u.uroleplay.deaf).  DEAF is prop.h index 40; js/const.js exports it. */
function mquaffmsg_Deaf() {
    const u = game.u || {};
    const p = u.uprops ? u.uprops[DEAF] : null;
    const intrinsic = p ? (p.intrinsic | 0) : 0;
    const extrinsic = p ? (p.extrinsic | 0) : 0;
    /* HDeaf is the flat u.HDeaf countdown in this port (eat.js newuhs's
     * faint arm, eat.c:3421, sets it); uprops[DEAF] never carries it. */
    return !!((u.HDeaf | 0) || intrinsic || extrinsic || (u.uroleplay && u.uroleplay.deaf));
}
const HALLUC_MM = 23, HALLUC_RES_MM = 24; /* const.js HALLUC / HALLUC_RES */
/* ONE port: js/muse.js mzapwand (imported above) serves every caller here. */


/* C mkobj.c:2731-2738 container_weight(object) — recompute an object's owt,
 * recursing through its own container chain if it is itself contained.
 * RNG-free. */
import { container_weight } from './mkobj.js';
export { container_weight };






/* C you.h Hallucination macro: intrinsic hallucination unless resisted. */
function Hallucination() {
    const up = game.u?.uprops;
    const h = up?.[HALLUC_MM], r = up?.[HALLUC_RES_MM];
    return !!(h?.intrinsic | 0)
        && !((r?.intrinsic | 0) || (r?.extrinsic | 0));
}










/* in_your_sanctuary: file-local `return false` stub removed; the real body
 * (priest.c:~330) is imported from js/priest.js. */
/* can_blow was a file-local throw-stub here, shadowing the real port at
 * js/mhitm.js:1755 (C mondata.c:566-576), already imported by monmove.js and
 * music.js from that module. Imported above instead of re-derived. */
/* C monflag.h mflags2/mflags3 bits for noteleport_level (is_demon/M2_DEMON
 * already defined above). M3_COVETOUS is a multi-bit mask (0x001f). */
const M2_LORD = 0x00000400;
const M2_PRINCE = 0x00000800;

/** C mondata.h is_prince — overlord to its kind */
function is_prince(ptr) { return (ptr.mflags2 & M2_PRINCE) !== 0; }
/** C mondata.h:138 is_ndemon — an ordinary demon (neither lord nor prince). */
export function is_ndemon(ptr) {
    return is_demon(ptr) && (ptr.mflags2 & (M2_LORD | M2_PRINCE)) === 0;
}
/** C mondata.h is_dprince — demon prince: is_demon && is_prince */
export function is_dprince(ptr) { return is_demon(ptr) && is_prince(ptr); }



/* C stairs.c:39-47
 *   stairway *
 *   stairway_at(coordxy x, coordxy y)
 *   {
 *       stairway *tmp = gs.stairs;
 *       while (tmp && !(tmp->sx == x && tmp->sy == y))
 *           tmp = tmp->next;
 *       return tmp;
 *   }
 * gs.stairs is game.stairs, the {sx,sy,up,isladder,u_traversed,tolev,next}
 * linked list built by js/mklev.js stairway_add. All callers share its
 * stairway_at implementation. Returns the node or null. */
export { stairway_at };
/* hard_helmet and resists_blnd were file-local throw-stubs here, shadowing
 * the real ports at js/do_wear.js:396 (C do_wear.c:567-573, already imported
 * by objnam.js and trap.js) and js/mhitm.js:3674 (C mondata.c:247-272,
 * already imported by mhitu.js). Imported above instead of re-derived.
 *
 * CAVEAT for whoever ports the hero-polymorphed path through find_offensive:
 * js/mhitm.js's resists_blnd derives its is_you test from
 * `(mon.m_id | 0) === 0`, but game.youmonst.m_id is set to 1
 * (js/polyself.js:240, id 1 reserved per js/mklev.js next_ident). That
 * matches C's identity check (`mon == &gy.youmonst`) only while
 * game.youmonst is unpopulated (the common case pre-polymorph, where the
 * arg here is `undefined` and the `|0` coercion lands on 0 anyway) — once
 * the hero has actually polymorphed and game.youmonst carries m_id=1, the
 * is_you branch in mhitm.js's resists_blnd goes false and it wrongly falls
 * through to the monster-data arm (mblinded/mcansee/haseyes on
 * game.youmonst.data) instead of C's identity-only `Blind || Unaware`. This
 * is a latent defect in js/mhitm.js, out of scope here (single-file
 * ownership); flagging for whoever owns that file next. */

/* C polyself.c:1956-2046 mbodypart(struct monst *mon, int part) is fully
 * ported and exported by js/cmd.js.  This file carried an EXPORTED throwing
 * stub of the same name, which shadowed it for stealgold()'s steed arm
 * (steal.c:78-81, makeplural(mbodypart(u.usteed, FOOT))) AND was what
 * js/read.js imported by name for litroom()'s engulfed arm.  Imported from
 * ./cmd.js above, alongside body_part from the same module. */
// The historical stub notes above are obsolete: unstuck and expels_gu are live.
export async function monflee_release_hero(mon) {
    const u = game.u;
    const ustuck = u ? u.ustuck : null;
    if (!mon || !ustuck)
        return;
    const a = ('m_id' in mon) ? (mon.m_id | 0) : undefined;
    const b = ('m_id' in ustuck) ? (ustuck.m_id | 0) : undefined;
    const same = (mon === ustuck) || (a != null && b != null && a === b);
    if (!same)
        return;
    if (u.uswallow) {
        await expels_gu(mon, mon.data.pmidx, true); // C monmove.c:365
    } else if (!sticks(game.youmonst ? game.youmonst.data : null)) {
        await unstuck(mon); /* js/dog.js:651 no-op stub; see RNG note above */
        await pline('You get released!');
    }
}


import { somegold } from './steal.js';
import { ENV } from './hostenv.js';
import { mon_set_minvis, which_armor } from './worn.js'; // relocate-fns
import { lined_up } from './mthrowu.js'; // relocate-fns
import { noteleport_level } from './teleport.js'; // relocate-fns
import { is_lava } from './dbridge.js'; // relocate-fns
import { removed_from_icebox } from './pickup.js'; // relocate-fns
import { splitbill } from './shk.js'; // relocate-fns
export { CORPSE }; // relocate-fns
export { create_mplayers } from './mplayer.js'; // relocate-fns
export { _PM_ARCHEOLOGIST, _PM_WIZARD }; // relocate-fns
export { pmname } from './do_name.js'; // relocate-fns
export { sliparm } from './mondata.js'; // C mondata.c:632
export { canSaddleMndx, monsndx }; // relocate-fns
export { noteleport_level } from './teleport.js'; // relocate-fns
export { M2_LORD }; // relocate-fns
export { m_lined_up } from './mthrowu.js'; // relocate-fns
export { WAN_STRIKING, throws_rocks }; // relocate-fns
export { which_armor } from './worn.js'; // relocate-fns
export { somegold };
import { nextoid, splitobj } from './mkobj.js'; // C mkobj.c:458,536
import { Can_rise_up } from './dungeon.js'; // relocate-fns
import { mondied } from './mon.js'; // relocate-fns
import { set_quest_leader_m_id } from './cmd.js';
import { in_town } from './hack.js';
import { set_msg_xy } from './pline.js'; // relocate-fns
import { ALL_TRAPS, Align2amask, BLCORNER, BOLT_LIM, CROSSWALL, GP_AVOID_MONPOS, GP_CHECKSCARY, HWALL, IS_DOOR, IS_WALL, In_quest, Is_stronghold, LS_MONSTER, MM_EDOG, MM_EGD, MM_EMIN, MM_EPRI, MM_ESHK, MM_IGNOREWATER, MM_MINVIS, MM_NOCOUNTBIRTH, M_AP_F_DKNOWN, ROOMOFFSET, SDOOR, SHOPBASE, STRAT_APPEARMSG, STRAT_CLOSE, STRAT_WAITFORU, TDWALL, TEMPLE, TLCORNER, TRAPDOOR, TRWALL, TUWALL, VAULT, ZOO } from './const.js'; // relocate-fns
import { DEFSYM_EXPLANATION as DEFSYM_EXPLANATION_MK } from './defsym_data.js'; // relocate-fns
import { debugpline } from './display.js'; // relocate-fns
import { newedog } from './dog.js'; // relocate-fns
import { deliver_obj_to_mon } from './dokick.js'; // relocate-fns
import { monst_to_any } from './hack.js'; // relocate-fns
import { new_light_source } from './light.js'; // relocate-fns
import { christen_monst } from './mhitm.js';
import { Amonnam, rndghostname } from './do_name.js'; // relocate-fns
import { newemin } from './minion.js'; // relocate-fns
import { ART_DEMONBANE_MK, ART_EXCALIBUR_MK, EGG, FIGURINE, GOLD_PIECE, G_NOCORPSE, LEASH, LUMP_OF_ROYAL_JELLY, MM_ASLEEP, MM_NOGRP, MONS_PMNAMES_ROWS, MONS_ROWS, PM_BLACK_LIGHT, PM_GHOST, PM_VLAD_THE_IMPALER_NC, Protection_from_shape_changers_nc, RANDOM_CLASS, SLIME_MOLD, STATUE, _Blind_mk, _Hallucination_mk, makemonPtrMndx, mindless_mv, mvitals_mvflags, sgn_mklev, throws_rocks_mv } from './mklev.js';
import { dealloc_obj, discard_minvent, mkobj, mkobj_at } from './mkobj.js';
import { newegd } from './vault.js'; // relocate-fns
import { MKOBJ_OC_CLASS } from './mkobj_data.js'; // relocate-fns
import { can_be_hatched, hideunder, pm_to_cham } from './mon.js'; // relocate-fns
import { dochugw, set_apparxy } from './monmove.js'; // relocate-fns
import { observe_object as observe_object_mk } from './o_init.js'; // relocate-fns
import { an as an_mk, simpleonames as simpleonames_mk } from './objnam.js';
import { quest_info } from './questpgr.js'; // relocate-fns
import { OC_NAME as OC_NAME_MK } from './oc_name_data.js'; // relocate-fns
import { impossible as lifecycle_impossible } from './pline.js'; // relocate-fns
import { PM_ARCHEOLOGIST, PM_ELF, PM_WIZARD, PM_WUMPUS } from './pm.generated.js'; // relocate-fns
import { newepri } from './priest.js'; // relocate-fns
import { poisoncloud_at, visible_region_at } from './region.js'; // relocate-fns
import { get_shop_item, neweshk } from './shknam.js'; // relocate-fns
import { put_saddle_on_mon } from './steed.js'; // relocate-fns
import { enexto_core } from './teleport.js'; // relocate-fns
import { obj_stop_timers } from './timeout.js'; // relocate-fns
import { block_point, does_block } from './vision.js'; // relocate-fns
import { count_wsegs, get_wormno, initworm, place_worm_tail_randomly } from './worm.js'; // relocate-fns
import { m_dowear } from './worn.js'; // relocate-fns
import { rndmonnum } from './mkobj.js'; // relocate-fns
import { monflee, onscary } from './monmove.js'; // relocate-fns
import { canletgo } from './do.js'; // relocate-fns
import { trapname } from './trap.js'; // relocate-fns
export { trapname } from './trap.js'; // relocate-fns
export { Hallucination }; // relocate-fns
export { poly_gender } from './polyself.js'; // relocate-fns
export { isNeuterMndx }; // relocate-fns
export { monflee, onscary } from './monmove.js'; // relocate-fns
export { S_HUMAN_MLET, isRiderMndx, isVampshifter, mquaffmsg_Deaf, u_at }; // relocate-fns
export { rndmonnum, unsplitobj } from './mkobj.js'; // relocate-fns
export { check_gear_next_turn, m_in_air, mondied } from './mon.js'; // relocate-fns
export { S_LICH, isFloater, isFlyerMndx, monMflags1 }; // relocate-fns
export { nextoid, splitobj };

/* obj_split_timers — the real body lives in js/timeout.js (C timeout.c:2358),
 * imported at the top of this file.  It used to throw, which was the correct
 * behaviour while no timer existed to split; splitting a stack of timed
 * corpses now duplicates their ROT_CORPSE elements as C does. */
/* obj_split_light_source: real body imported directly from js/light.js (light.c:779) */
export { tele_restrict };



/* C mondata.h is_male/is_female/is_shapeshifter/humanoid/nonliving — mflags
 * bit tests on a permonst-shaped `ptr` (pmidx/mlet/mflags1/mflags2). */
function is_male(ptr) { return ((ptr.mflags2 | 0) & M2_MALE) !== 0; }
function is_female(ptr) { return ((ptr.mflags2 | 0) & M2_MON_FEMALE) !== 0; }
function is_shapeshifter(ptr) { return ((ptr.mflags2 | 0) & M2_SHAPESHIFTER) !== 0; }
export function humanoid(ptr) { return ((ptr.mflags1 | 0) & M1_HUMANOID) !== 0; }
/* C mondata.h: is_undead(ptr) || ptr == &mons[PM_MANES] || weirdnonliving(ptr);
 * weirdnonliving(ptr) = is_golem(ptr) || ptr->mlet == S_VORTEX. */
export function nonliving(ptr) {
    const is_undead = ((ptr.mflags2 | 0) & M2_UNDEAD) !== 0;
    const is_golem = ptr.mlet === S_GOLEM;
    const weirdnonliving = is_golem || ptr.mlet === S_VORTEX;
    return is_undead || (ptr.pmidx | 0) === PM_MANES || weirdnonliving;
}
/* C monst.h Mgender(mon) — (mon)->female ? FEMALE : MALE */
/* C you.h:322 mhe(mtmp) = genders[pronoun_gender(mtmp, PRONOUN_HALLU)].he,
 * with genders[] = {"he","she","it","they"} (role.c:688-693) and
 * pronoun_gender at mondata.c:1191-1207.  The comment that stood here called
 * pronoun_gender "a distinct unported subsystem"; it has been ported since
 * (js/mhitm.js:1970), so this was a throwing stub in front of a live body —
 * and it was the halt behind mcastu.c:391's "Oh no, %s's using the touch of
 * death!".  NOTE the PRONOUN_HALLU arm really does draw rn2(4) when the hero
 * is hallucinating (mondata.c:1199-1200); that draw is ported, not skipped. */
const PRONOUN_GENDERS_HE = ["he", "she", "it", "they"];
export function mhe(mtmp) {
    return PRONOUN_GENDERS_HE[pronoun_gender_mm(mtmp, 2 /* PRONOUN_HALLU */)];
}
/* C pline_mon(mon, fmt, ...) — callers await the message before changing form. */
/* C pline.c:138-146: set_msg_xy to the hero (0,0) or the monster's square;
 * vpline's accessiblemsg prefix reads it. */

/**
 * C makemon.c:2049 grow_up(mtmp, victim) — a monster levels up (killed a
 * monster, or drank a potion of gain level / ate a wraith corpse when
 * victim is null). RNG: rnd(victim->m_lev + 1) or rnd(8), then a conditional
 * rn2(max_increase).
 * @param {any} mtmp
 * @param {any} victim
 * @returns {any} the (possibly new) permonst `mtmp` now points at, or null
 *   if mtmp died (DEADMONSTER on entry, or genocided into non-existence).
 */
export async function grow_up(mtmp, victim) {
    let ptr = mtmp.data;

    /* monster died after killing enemy but before calling this function */
    if (mtmp.mhp < 1)
        return null;

    const oldtype = ptr.pmidx | 0;
    const newtype = (oldtype === PM_KILLER_BEE && !victim)
        ? PM_QUEEN_BEE
        : little_to_big(oldtype);

    let max_increase, cur_increase, lev_limit, hp_threshold;
    if (victim) {
        hp_threshold = (mtmp.m_lev | 0) * 8;
        if (!mtmp.m_lev)
            hp_threshold = 4;
        else if (ptr.mlet === S_GOLEM)
            hp_threshold = (Math.trunc(mtmp.mhpmax / 10) + 1) * 10 - 1;
        else if (is_home_elemental(ptr))
            hp_threshold *= 3;
        lev_limit = Math.trunc(3 * (ptr.mlevel | 0) / 2);
        if (oldtype !== newtype && (MONS[newtype][1] | 0) > lev_limit)
            lev_limit = MONS[newtype][1] | 0;
        max_increase = rnd((victim.m_lev | 0) + 1);
        if (mtmp.mhpmax + max_increase > hp_threshold + 1)
            max_increase = Math.max((hp_threshold + 1) - mtmp.mhpmax, 0);
        cur_increase = (max_increase > 1) ? rn2(max_increase) : 0;
    } else {
        max_increase = cur_increase = rnd(8);
        hp_threshold = 0;
        lev_limit = 50;
    }

    mtmp.mhpmax += max_increase;
    mtmp.mhp += cur_increase;
    if (mtmp.mhpmax <= hp_threshold)
        return ptr;

    if (_isMplayer(ptr.pmidx))
        lev_limit = 30;
    else if (lev_limit < 5)
        lev_limit = 5;
    else if (lev_limit > 49)
        lev_limit = (ptr.mlevel | 0) > 49 ? 50 : 49;

    mtmp.m_lev = (mtmp.m_lev | 0) + 1;
    if (mtmp.m_lev >= (MONS[newtype][1] | 0) && newtype !== oldtype) {
        ptr = permonstTemplate(newtype);
        const fem = is_male(ptr) ? 0 : is_female(ptr) ? 1 : (mtmp.female ? 1 : 0);

        if (mvitalsGenod(newtype)) {
            if (canspotmon(mtmp))
                await pline(`As ${mon_nam(mtmp)} grows up into `
                    + `${an(monPmname(ptr.pmidx, Mgender(mtmp)))}, ${mhe(mtmp)} `
                    + `${nonliving(ptr) ? "expires" : "dies"}!`);
            set_mon_data(mtmp, ptr);
            await mondied(mtmp);
            return null;
        } else if (canspotmon(mtmp)) {
            const prefix = (mtmp.female && !fem) ? "male "
                : (fem && !mtmp.female) ? "female " : "";
            const buf = prefix + monPmname(ptr.pmidx, fem);
            await pline_mon(mtmp, `${YMonnam(mtmp)} `
                + `${(fem !== (mtmp.female ? 1 : 0)) ? "changes into"
                    : humanoid(ptr) ? "becomes" : "grows up into"} `
                + `${an(buf)}.`);
        }
        set_mon_data(mtmp, ptr);
        if (mtmp.cham === oldtype && is_shapeshifter(ptr))
            mtmp.cham = newtype;
        newsym(mtmp.mx, mtmp.my);
        lev_limit = mtmp.m_lev | 0;

        mtmp.female = fem;
        if (mtmp.mleashed)
            update_inventory();
    }

    if ((mtmp.m_lev | 0) > lev_limit) {
        mtmp.m_lev = (mtmp.m_lev | 0) - 1;
        if (mtmp.mhpmax === hp_threshold + 1)
            mtmp.mhpmax -= 1;
    }
    if (mtmp.mhpmax > 50 * 8)
        mtmp.mhpmax = 50 * 8;
    if (mtmp.mhp > mtmp.mhpmax)
        mtmp.mhp = mtmp.mhpmax;

    return ptr;
}

export function makeknown(otyp) { discover_object(otyp | 0, true, true, true); }



export function freemcorpsenm(mtmp) {
    if (mtmp.mextra)
        mtmp.mextra.mcorpsenm = NON_PM;
}

const PM_STRAW_GOLEM_PS = 249, PM_PAPER_GOLEM_PS = 250, PM_ROPE_GOLEM_PS = 251;

const PM_GOLD_GOLEM_PS = 252, PM_LEATHER_GOLEM_PS = 253, PM_WOOD_GOLEM_PS = 254;

const PM_FLESH_GOLEM_PS = 255, PM_CLAY_GOLEM_PS = 256, PM_STONE_GOLEM_PS = 257;

const PM_GLASS_GOLEM_PS = 258, PM_IRON_GOLEM_PS = 259;

export function golemhp(type) {
    switch (type | 0) {
    case PM_STRAW_GOLEM_PS:   return 20;
    case PM_PAPER_GOLEM_PS:   return 20;
    case PM_ROPE_GOLEM_PS:    return 30;
    case PM_LEATHER_GOLEM_PS: return 40;
    case PM_GOLD_GOLEM_PS:    return 60;
    case PM_WOOD_GOLEM_PS:    return 50;
    case PM_FLESH_GOLEM_PS:   return 40;
    case PM_CLAY_GOLEM_PS:    return 70;
    case PM_STONE_GOLEM_PS:   return 100;
    case PM_GLASS_GOLEM_PS:   return 80;
    case PM_IRON_GOLEM_PS:    return 120;
    default: return 0;
    }
}

/** C const.h MM_ANGRY — monster starts hostile regardless of alignment */
const MM_ANGRY = 0x00000020;

/** C hack.h:1151 MM_ADJACENTOK — ok to use adjacent coordinates */
/** C hack.h MM_NOTAIL (js/const.js:1581) — makemon.c:1161 allowtail. */
const MM_NOTAIL = 0x00004000;

/** C hack.h MM_NONAME — monster is not christened with a random name */
const MM_NONAME = 0x00000040;

const PM_ALIGNED_CLERIC = 275; /* = pm.generated.js PM_PRIEST (NetHack "aligned cleric") */

/* C monflag.h geno bits */
const G_SGROUP = 0x0080; /* appear in small groups normally */

const G_LGROUP = 0x0040; /* appear in large groups normally */

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

import { CANDELABRUM_OF_INVOCATION, BELL_OF_OPENING } from './objclass_ranges.js';
import { _BOT_BAG_OF_TRICKS_OTYP, nothing_happens } from './cmd.js';
import { consume_obj_charge } from './invent.js'; // relocate-fns
import { M_AP_TYPE, nothing_seems_to_happen } from './const.js'; // relocate-fns
import { impossible as real_impossible } from './pline.js'; // relocate-fns
import { S_DEMON, isPrinceMndx, monMflags2_m_initweap } from './m_initweap.js'; // relocate-fns
import { curse } from './mkobj.js'; // relocate-fns
import { set_mon_data } from './mondata.js'; // relocate-fns
export { findgold, stealgold } from './steal.js'; // relocate-fns
export { GOLD_PIECE_OTYP }; // relocate-fns
export { attacktype_fordmg, can_chant, dmgtype_fromattack, gender, name_to_mon, set_mon_data } from './mondata.js'; // relocate-fns
export { DEF_MONSYMS_EXPLAIN, MONS_MATTK, MONS_PMNAMES, S_ELEMENTAL, S_VORTEX }; // relocate-fns
export { find_defensive, find_misc, find_offensive, precheck, ureflects, use_defensive, use_misc } from './muse.js'; // relocate-fns
export { G_GONE, HALLUC_MM, HALLUC_RES_MM, M1_AMORPHOUS, M1_ANIMAL, M1_MINDLESS, M1_UNSOLID, M2_MERC, NUMMONS, POT_GAIN_LEVEL_OTYP, POT_INVISIBILITY_OTYP, POT_POLYMORPH_OTYP, POT_SPEED_OTYP, S_GHOST, WAN_MAKE_INVISIBLE_OTYP, WAN_POLYMORPH_OTYP, WAN_SPEED_MONSTER_OTYP, WAN_TELEPORTATION_OTYP, _GRAY_DRAGON_SCALE_MAIL, _SHIELD_OF_REFLECTION, _YELLOW_DRAGON_SCALE_MAIL, isAnimal, monDifficulty, sokobanRules }; // relocate-fns
export { PM_WIZARD_OF_YENDOR }; // relocate-fns

function makemon_rnd_goodpos(mon, gpflags, cc) {
    /* C makemon.c:1085 — gpflags |= GP_AVOID_MONPOS */
    gpflags |= GP_AVOID_MONPOS;
    let tryct = 0;
    let nx, ny;
    let good;
    /* C makemon.c:1088-1093 — do { pick random pos; test goodpos } while < 50 */
    do {
        nx = rn1(COLNO - 3, 2); /* rn2(COLNO-3)+2 = rn2(77)+2 */
        ny = rn2(ROWNO);
        /* C makemon.c:1090 — (!gi.in_mklev && cansee(nx,ny)) ? FALSE : goodpos(nx, ny, mon, gpflags)
         * goodpos with mon (null for new monster): isok + !u_at + !MON_AT(avoid_monpos) + accessible */
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
            /* C makemon.c:135-138 — mon = makemon(mtmp->data, mm.x, mm.y, mmflags | MM_NOGRP);
             * if (mon) { mon->mpeaceful = 0; mon->mavenge = 0; set_malign(mon); } */
            const mon = await makemon(mndx, mmx, mmy, (mmflags | MM_NOGRP));
            if (mon) {
                mon.mpeaceful = 0;
                mon.mavenge = 0;
                set_malign(mon);
            }
        }
    }
}

/* C ref: makemon.c:2392-2549 set_mimic_sym(mtmp) — pick a mimic's disguise
 * (m_ap_type + mappearance).  RNG-faithful port of every rn2/rnd/rn1 call in
 * source order.  Called from makemon's S_MIMIC switch case (below).  Object-otyp
 * / PCHAR symbol values match objects.h / defsym.h; the appearance fields drive
 * later screen rendering and the restrap() RNG guard. */
export async function set_mimic_sym(mon) {
    /* C makemon.c:2401: protected heroes prevent new mimic disguises. */
    if (!mon || Protection_from_shape_changers_nc())
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
                /* C makemon.c:2508: release contents and object timers too. */
                await obfree(otmp, null);
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
        const nocorpse_ndx = (mvitals_mvflags(mndx) & G_NOCORPSE) !== 0;
        if (appear === CORPSE && nocorpse_ndx)
            mndx = rn1(PM_WIZARD - PM_ARCHEOLOGIST + 1, PM_ARCHEOLOGIST);
        else if ((appear === EGG && !can_be_hatched(mndx))
            || (appear === TIN && nocorpse_ndx))
            mndx = NON_PM;
        (mon.mextra ??= newmextra()).mcorpsenm = mndx;
    } else if (ap_type === M_AP_OBJECT && appear === SLIME_MOLD) {
        (mon.mextra ??= newmextra()).mcorpsenm = (game.svc?.context?.current_fruit | 0);
        if (game.flags) game.flags.made_fruit = true;
    } else if (ap_type === M_AP_FURNITURE && appear === S_altar) {
        const algn = rn2(3) - 1; /* -1/0/+1 */
        /* C makemon.c:2542 `(Inhell && rn2(3)) ? AM_NONE : Align2amask(algn)`.
         * `Inhell` is a FUNCTION here (js/makemon.js:368), so the bare read was
         * ALWAYS TRUTHY and the rn2(3) fired on EVERY altar-mimic, everywhere in
         * the dungeon — an EXTRA RNG DRAW in level generation that C makes only
         * in Gehennom, where && short-circuits it away.  fn-truthy-lint HARD. */
        (mon.mextra ??= newmextra()).mcorpsenm = (Inhell() && rn2(3)) ? AM_NONE : Align2amask(algn);
    } else if ((mon.mextra?.mcorpsenm ?? NON_PM) !== NON_PM) {
        mon.mextra.mcorpsenm = NON_PM;
    }
    /* C makemon.c:2548: include terrain, objects, regions and visibility. */
    if (does_block(mx, my))
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
    if (game.iflags?.debug_mongen
        || (mdat == null && !(game.level?.flags?.rndmongen ?? true))) {
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
    if (!isok(x, y)) {
        await lifecycle_impossible('makemon trying to create a monster at <%d,%d>?', x, y);
        return null;
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
            if (mndx == null) {
                await debugpline('makemon.c', 'Warning: no monster.');
                return null; /* no more monsters! */
            }
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
        if (wizard() && ((game.mvitals?.[mndx]?.mvflags | 0) & 0x01 /* G_EXTINCT */))
            await debugpline('makemon.c', 'Explicitly creating extinct monster %s.', MONS_PMNAMES_ROWS[mndx][2]);
    }
    if (mndx == null) {
        return null;
    }
    const countbirth = (mmflags & MM_NOCOUNTBIRTH) === 0;
    await propagate(mndx, countbirth, false);
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
     * before the fmon link.  RNG-free.  MM_EDOG allocates zeroed pet data
     * even if make_familiar() subsequently leaves the monster untamed.
     * MM_EMIN IS now wired: mk_roamer (js/priest.js, C priest.c:722) passes it
     * and then writes EMIN(roamer)->min_align/renegade, which set_malign reads
     * as mtmp.mextra.emin.min_align (js/makemon.js:776).  No existing caller
     * passes MM_EMIN, so this allocation is unreachable except from mk_roamer;
     * it is RNG-free either way. */
    /* C makemon.c:1237-1238 — `if (mmflags & MM_EGD) newegd(mtmp);`.
     * Nothing else writes mtmp.mextra.egd for a monster made by
     * makemon, and js/const.js EGD(mtmp) reads exactly that.  vault.c:407's
     * `makemon(&mons[PM_GUARD], x, y, MM_EGD | MM_NOMSG)` is the only caller
     * that passes the flag, and invault() writes EGD(guard)->vroom/gdx/gdy/
     * fakecorr[] on the very next lines.  RNG-free. */
    if (mmflags & MM_EGD)
        newegd(mon);
    if (mmflags & MM_EPRI)
        newepri(mon);
    if (mmflags & MM_ESHK)
        neweshk(mon);
    if (mmflags & MM_EMIN)
        newemin(mon);
    /* C makemon.c:1245-1246: even an untamed figurine has a pet extension. */
    if (mmflags & MM_EDOG)
    /* C makemon.c:1245-1246 — `if (mmflags & MM_EDOG) newedog(mtmp);`.  A
     * figurine/familiar that is not made tame keeps this zeroed edog, so a
     * later tamedog() takes initedog(mtmp, FALSE) (apport stays 0 -> 1). */
    if (mmflags & 0x00000800 /* MM_EDOG */)
        newedog(mon);
    if (mmflags & MM_ASLEEP)
        mon.msleeping = 1;
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
    mon.seen_resistance = 0; /* C makemon.c:1299 M_SEEN_NOTHING */
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
    } else {
        if (mon.minvent)
            await discard_minvent(mon, true);
        mon.minvent = null;
    }
    const _mflags3 = (permonstTemplate(mndx)?.mflags3 ?? 0) >>> 0;
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
         * The mimic-masquerading-as-furniture arm is ported below from
         * defsyms[mappearance].explanation (DEFSYM_EXPLANATION, defsym_data.js)
         * and mhidden_description's MHID_ARTICLE|MHID_ALTMON tail, pager.c:205-215.
         * A mimic that masquerades as neither object nor furniture still makes no
         * `what`, and the mimic-as-object arm stays as it was. */
        if (!(mmflags & MM_NOMSG)) {
            const M_AP_NOTHING = 0, M_AP_FURNITURE = 1, M_AP_MONSTER = 3, MM_NOEXCLAM_MK = 262144;
            let exclaim = !(mmflags & MM_NOEXCLAM_MK);
            let what = null;
            const apType = (mon.m_ap_type | 0) & 0x7; /* C M_AP_TYPE */
            if ((canseemon(mon) && (apType === M_AP_NOTHING || apType === M_AP_MONSTER))
                || sensemon(mon)) {
                what = Amonnam(mon);
                if (apType === M_AP_MONSTER)
                    exclaim = true;
            } else if (canseemon(mon) && apType === M_AP_FURNITURE
                       && DEFSYM_EXPLANATION[mon.mappearance | 0] != null) {
                /* C makemon.c:1486-1489 + pager.c:205-215: MHID_ARTICLE gives
                 * an(defsyms[mappearance].explanation); upstart() capitalises it
                 * ("A closed door appears next to you."). */
                what = upstart(an_mk(DEFSYM_EXPLANATION[mon.mappearance | 0]));
            } else if (canseemon(mon) && apType === 1 /* M_AP_FURNITURE */
                       && DEFSYM_EXPLANATION_MK[mon.mappearance | 0]) {
                /* C makemon.c:1486-1489 via pager.c:201-205 — mimic masquerading
                 * as furniture: mhidden_description(MHID_ARTICLE|MHID_ALTMON)
                 * takes defsyms[mappearance].explanation (drawing.c defsyms,
                 * js/defsym_data.js), an()'d, then upstart()'d by makemon.
                 * "A staircase up appears next to you." — a stair-disguised
                 * mimic's appearance message, not a silent arrival. */
                what = upstart(an_mk(DEFSYM_EXPLANATION_MK[mon.mappearance | 0]));
            } else if (canseemon(mon) && apType === 2 /* M_AP_OBJECT */) {
                /* C makemon.c:1486-1489 — mimic masquerading as an object:
                 * mhidden_description(MHID_ARTICLE|MHID_ALTMON) (pager.c:205-233)
                 * names the remembered object via object_from_map
                 * (pager.c:284-360), including its hallucination fallback. */
                /* pager.c:201 mhidden_description reads the REMEMBERED glyph
                 * (levl[x][y].glyph, hero_memory) and object_from_map
                 * (pager.c:284-300) takes glyph_to_obj() of it.  An undiscovered
                 * gem/spellbook mimic is remembered as the generic glyph, whose
                 * display.c:564-576 zeroobj index is STRANGE_OBJECT, hence
                 * "A strange object appears close by." rather than "A gem". */
                /* pager.c:201-202 — levl[x][y].glyph only when hero_memory, else
                 * glyph_at(): the displayed glyph, i.e. the mimic's own object. */
                const rloc = game.level?.at(mon.mx | 0, mon.my | 0);
                const rg = game.level?.flags?.hero_memory
                    ? rloc?.remembered_glyph
                    : (rloc && rloc.disp_cls === 'obj' && rloc.disp_obj_otyp != null
                        ? { cls: 'obj', otyp: rloc.disp_obj_otyp,
                            corpsenm: rloc.disp_obj_corpsenm }
                        : undefined);
                if (!(rg && rg.cls === 'obj' && Number.isInteger(rg.otyp))) {
                    /* pager.c:213-214 — M_AP_OBJECT but the remembered glyph is
                     * not an object: mhidden_description yields `something`. */
                    what = upstart('something');
                } else {
                const glyphotyp = rg.otyp | 0;
                /* C pager.c:318-330: hallucination can show a nameless slot;
                 * choose a real object of that class with normal initialization. */
                const fake = OC_NAME_MK[glyphotyp]
                    ? await mksobj(glyphotyp, false, false)
                    : await mkobj(MKOBJ_OC_CLASS[glyphotyp], false);
                /* C pager.c:331-352: map descriptions own temporary objects. */
                if (fake.timed) obj_stop_timers(fake);
                if ((fake.oclass | 0) === 12 /* COIN_CLASS */)
                    fake.quan = 2;
                else if (fake.otyp === SLIME_MOLD) {
                    /* C pager.c:336-343: give a map fruit its type, retaining
                     * a matching mimic's fruit even after the option changes. */
                    fake.spe = game.svc?.context?.current_fruit | 0;
                    if (glyphotyp === (mon.mappearance | 0)
                        && (mon.mextra?.mcorpsenm ?? NON_PM) !== NON_PM)
                        fake.spe = mon.mextra.mcorpsenm;
                }
                if (glyphotyp === (mon.mappearance | 0)
                    && (mon.mextra?.mcorpsenm ?? NON_PM) !== NON_PM) {
                    if (fake.otyp !== SLIME_MOLD) fake.corpsenm = mon.mextra.mcorpsenm;
                } else if ((fake.otyp === CORPSE || fake.otyp === STATUE)
                           && Number.isInteger(rg.corpsenm)) {
                    fake.corpsenm = rg.corpsenm;
                }
                if (fake.otyp === LEASH) fake.leashmon = 0;
                fake.where = 1;
                fake.ox = mon.mx | 0;
                fake.oy = mon.my | 0;
                const odx = (mon.mx | 0) - ((game.u?.ux ?? 0) | 0);
                const ody = (mon.my | 0) - ((game.u?.uy ?? 0) | 0);
                if (odx * odx + ody * ody <= 2 /* pager.c:361-369 next2u */
                    && !_Blind_mk() && !_Hallucination_mk()
                    && !game.iflags?.terrainmode)
                    observe_object_mk(fake);
                /* C pager.c:370-374: object_from_map observes an already
                 * dknown fake too (amulets start dknown via unknow_object),
                 * and remembers that knowledge on the matching mimic.  This
                 * runs only while naming its appearance, not while drawing it. */
                if (glyphotyp === (mon.mappearance | 0)
                    && (fake.dknown || ((mon.m_ap_type | 0) & M_AP_F_DKNOWN))) {
                    mon.m_ap_type |= M_AP_F_DKNOWN;
                    observe_object_mk(fake);
                }
                /* pager.c:229-231 — a STRANGE_OBJECT fake is named by
                 * obj_descr[STRANGE_OBJECT].oc_name, never simpleonames()
                 * (xname would give "glorkum ..."). */
                let nm = ((fake.otyp | 0) !== 0) ? simpleonames_mk(fake)
                                                 : 'strange object';
                if ((fake.quan | 0) === 1)
                    nm = an_mk(nm);
                what = upstart(nm);
                fake.where = OBJ_FREE; /* C pager.c:234-236 */
                await dealloc_obj(fake);
                }
            }
            if (what && !(canseemon(mon) && (apType === M_AP_NOTHING || apType === M_AP_MONSTER))
                && !sensemon(mon)) {
                /* C pager.c:262-279 — mhidden_description's tail, applied after
                 * every arm: a visible region within r*(r+1) of the hero. */
                const reg = visible_region_at(mon.mx | 0, mon.my | 0);
                if (reg) {
                    const xr = (game.u?.xray_range | 0) > 1 ? (game.u.xray_range | 0) : 1;
                    const rx = (mon.mx | 0) - ((game.u?.ux ?? 0) | 0);
                    const ry = (mon.my | 0) - ((game.u?.uy ?? 0) | 0);
                    if (rx * rx + ry * ry <= xr * (xr + 1))
                        what += poisoncloud_at(mon.mx | 0, mon.my | 0)
                            ? ', in a cloud of poison gas' : ', in a cloud of vapor';
                }
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
                set_msg_xy(mon.mx, mon.my); /* C makemon.c:1491; pline() resets it */
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

/* C makemon.c:1514 unmakemon(mon, mmflags) — undo a makemon() that the caller
 * does not want after all; always returns null. */
export async function unmakemon(mon, mmflags) {
    const countbirth = ((mmflags | 0) & MM_NOCOUNTBIRTH) === 0;
    const mndx = (mon.mnum ?? mon.mndx ?? 0) | 0;
    const mv = game.mvitals ? (game.mvitals[mndx] ||= { born: 0, died: 0, mvflags: 0 }) : null;
    if (mv) {
        if (countbirth && mv.born > 0 && mv.born < 255)
            mv.born -= 1;
        if ((MONS_ROWS[mndx][3] | 0) & G_UNIQ) /* C makemon.c:1528 */
            mv.mvflags &= ~G_EXTINCT; /* C makemon.c:1529 */
    }
    mon.mhp = 0; /* let discard_minvent() know that mon isn't being kept */
    await discard_minvent(mon, true);
    await mongone(mon);
    return null;
}

export async function bagotricks(bag, tipping, seencountRef) {
    const g = game;
    const u = g.u || {};
    let moncount = 0;
    if (!bag || (bag.otyp | 0) !== _BOT_BAG_OF_TRICKS_OTYP) {
        await real_impossible("bad bag o' tricks");
        return moncount;
    }
    if ((bag.spe | 0) < 1) {
        /* C makemon.c:2565 — pline1((tipping && bag->cknown) ? "It's empty."
         * : nothing_happens); */
        await pline((tipping && bag.cknown) ? "It's empty." : nothing_happens);
        if (bag.dknown && g._oc_name_known && g._oc_name_known[_BOT_BAG_OF_TRICKS_OTYP]) {
            bag.cknown = 1;
            update_inventory();
        }
        return moncount;
    }
    let creatcnt = 1, seecount = 0;
    consume_obj_charge(bag, !tipping);
    if (!rn2(23))
        creatcnt += rnd(7);
    do {
        const mtmp = await makemon(null, u.ux | 0, u.uy | 0, 0 /* NO_MM_FLAGS */);
        if (mtmp) {
            ++moncount;
            if ((canseemon(mtmp) && (M_AP_TYPE(mtmp) === M_AP_NOTHING
                                      || M_AP_TYPE(mtmp) === M_AP_MONSTER))
                || sensemon(mtmp))
                ++seecount;
        }
    } while (--creatcnt > 0);
    if (seecount) {
        if (seencountRef) seencountRef.count = (seencountRef.count | 0) + seecount;
        if (bag.dknown) {
            makeknown(_BOT_BAG_OF_TRICKS_OTYP);
            update_inventory();
        }
    } else if (!tipping) {
        await pline(!moncount ? nothing_happens : nothing_seems_to_happen);
    }
    return moncount;
}

const WEAPON_CLASS = 2; /* objclass.h */

const ARMOR_CLASS = 3;  /* objects.h:88 generic armor class [3] */

/* C monst.h:281 is_lminion(mon): is_minion(mon->data) &&
 * mon_aligntyp(mon) == A_LAWFUL; priest.c:280 gives EPRI precedence over EMIN. */
function _is_lminion(mtmp) {
    const mndx = monsndx(mtmp);
    if ((monMflags2_m_initweap(mndx) & 0x00001000) === 0) /* M2_MINION */
        return false;
    const algn = (mtmp.ispriest && mtmp.mextra?.epri) ? mtmp.mextra.epri.shralign
        : (mtmp.isminion && mtmp.mextra?.emin)
        ? mtmp.mextra.emin.min_align : (MONS[mndx][4] | 0);
    return algn > 0;
}

const SPE_BOOK_OF_THE_DEAD = 409;

const P_SHORT_SWORD = 5;

const P_SABER = 9;

/* C mondata.h:157 is_mplayer(ptr) */
function _is_mplayer(ptr) {
    const pmi = typeof ptr === 'number' ? ptr : ((ptr?.pmidx ?? ptr?.mnum) | 0);
    return pmi >= PM_ARCHEOLOGIST && pmi <= PM_WIZARD;
}

/* C obj.h:223 is_sword(otmp) */
function _is_sword(otmp) {
    if (!otmp || (otmp.oclass | 0) !== WEAPON_CLASS) return false;
    const sk = MKOBJ_OC_SKILL[otmp.otyp | 0] | 0;
    return sk >= P_SHORT_SWORD && sk <= P_SABER;
}

export async function mongets(mtmp, otyp, mksobjFn) {
    if (!otyp)
        return null;
    const otmp = await mksobjFn(otyp, true, false);
    /* C makemon.c:2189-2192 — demons never get blessed objects.  Without it a
     * demon's blessed misc potion of invisibility skips you_aggravate()
     * (muse.c:2477-2479, cursed only). */
    if (otmp && monMlet(monsndx(mtmp)) === S_DEMON) {
        if (otmp.blessed)
            await curse(otmp);
    } else if (otmp && _is_lminion(mtmp)) {
        /* C makemon.c:2193-2199 — lawful minions don't get cursed, bad, or
         * rusting objects. */
        otmp.cursed = false;
        if ((otmp.spe | 0) < 0)
            otmp.spe = 0;
        otmp.oerodeproof = 1;
        otmp.oeroded = otmp.oeroded2 = 0;
    } else if (otmp && _is_mplayer(mtmp?.data ?? monsndx(mtmp)) && _is_sword(otmp)) {
        /* C makemon.c:2200-2202 */
        otmp.spe = 3 + rn2(4);
    }

    /* C makemon.c:2204-2214 */
    if (otmp) {
        if (otmp.otyp === CANDELABRUM_OF_INVOCATION) {
            otmp.spe = 0;
            otmp.age = 0;
            otmp.lamplit = 0;
            otmp.blessed = otmp.cursed = false;
        } else if (otmp.otyp === BELL_OF_OPENING) {
            otmp.spe = 0;
            otmp.blessed = otmp.cursed = false;
        } else if (otmp.otyp === SPE_BOOK_OF_THE_DEAD) {
            otmp.blessed = otmp.cursed = false;
        }
    }

    /* C makemon.c:2218-2223 — princes do not tolerate inferior gear.
     * This adjustment is after the demon/minion/mplayer special cases in C
     * and before mpickobj; it is stateful because weapon damage reads spe. */
    if (otmp && isPrinceMndx(monsndx(mtmp))) {
        if ((otmp.oclass | 0) === WEAPON_CLASS && (otmp.spe | 0) < 1)
            otmp.spe = 1;
        else if ((otmp.oclass | 0) === ARMOR_CLASS && (otmp.spe | 0) < 0)
            otmp.spe = 0;
    }
    /* C makemon.c:2224 — mpickobj → add_to_minv */
    /* C makemon.c:2224-2227 — mpickobj() merges into an existing stack
     * (add_to_minv, mkobj.c:2655) and returns nonzero when otmp was freed. */
    if (otmp && await mpickobj(mtmp, otmp))
        return null;
    return otmp || null;
}
