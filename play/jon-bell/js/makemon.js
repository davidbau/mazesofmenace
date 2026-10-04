import { linedup } from './trap.js';
import { newobj } from './game.js';
import { M_AP_TYPMASK, M_AP_NOTHING, M_AP_MONSTER, M_AP_FURNITURE, M_AP_OBJECT, Is_knox_level,
         STAIRS, LADDER, W_NONDIGGABLE, W_ARMH, TELEP_TRAP,
         W_ARMC, W_ARMG, W_ARMF, W_ARMU } from './const.js';
import { PM_LIZARD, PM_ICE_TROLL } from './pm.generated.js';
import { PM_FLAMING_SPHERE as PM_FLAMING_SPHERE_EL,
         PM_SHOCKING_SPHERE as PM_SHOCKING_SPHERE_EL,
         PM_BABY_GOLD_DRAGON as PM_BABY_GOLD_DRAGON_EL,
         PM_FIRE_VORTEX as PM_FIRE_VORTEX_EL,
         PM_FIRE_ELEMENTAL as PM_FIRE_ELEMENTAL_EL,
         PM_GOLD_DRAGON as PM_GOLD_DRAGON_EL } from './pm.generated.js';
import { m_carrying, goodpos } from './trap.js';
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
import { rn2, rnd, rn1, d, rn2_on_display_rng, pushRngLogEntry } from './rng.js';
function _makemon_blind() {
    const p = game.u?.uprops?.[BLINDED];
    return !!p && !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0);
}
import { game, wizard, discover } from './gstate.js';
import { obj_split_timers, age_is_relative, stop_timer, begin_burn } from './timeout.js';
import { artifact_light, obj_split_light_source as obj_split_light_source_real } from './light.js';
import { depth as depth_of_level, deepest_lev_reached } from './hacklib.js';
import { W_ARMOR, W_ACCESSORY, TRAPNUM, NO_TRAP, FLYING, LEVITATION, BLINDED, FAINTED, P_DAGGER, P_KNIFE } from './const.js';
import { BILLSZ, ROT_CORPSE } from './const.js';
import { DEFSYM_EXPLANATION } from './defsym_data.js';
import { rank_of } from './rank_data.js';
import { is_hole, is_pit, WEB, BEAR_TRAP } from './const.js';
import { LAVAPOOL, LAVAWALL, DRAWBRIDGE_UP, DB_UNDER, DB_LAVA } from './const.js';
import { Norep, You_hear } from './display.js';
import { In_endgame, In_sokoban, Is_astralevel, Is_waterlevel, Is_firelevel, Is_earthlevel, Is_airlevel, Is_rogue_level, In_mines, MM_FEMALE, MM_MALE, NO_MINVENT, W_SADDLE, I_SPECIAL, COLNO, ROWNO, isok, SEE_INVIS, TELEPORT_CONTROL, STRANGLED, OBJ_MINVENT, REFLECTING, W_ARMS, W_WEP, W_AMUL, W_ARM, OBJ_FREE, OBJ_FLOOR, OBJ_LUAFREE, OBJ_INVENT, MIGR_RANDOM, NC_VIA_WAND_OR_SPELL, NC_SHOW_MSG, HAND, POLY_TRAP, Upolyd, IS_ALTAR, DISPLACED, FOOT, In_V_tower, RLOC_MSG, OBJ_CONTAINED, IS_FURNITURE, IS_DRAWBRIDGE, PIT, HOLE, FORCEBUNGLE, } from './const.js';
import { NO_MM_FLAGS } from './const.js';
import { OC_COST } from './oc_cost_data.js';
import { MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js';
import { MKOBJ_OC_SKILL } from './mkobj_erosion_meta.js';

function _hero_uprop_on(idx) {
    const p = game.u?.uprops?.[idx];
    return !!p && !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !((p.blocked | 0));
}
function _slithy(ptr) { return !!(((ptr?.mflags1 | 0) & 0x00080000)); }
function mcould_eat_tin(mon) {
    for (let obj = mon?.minvent; obj; obj = obj.nobj) {
        if ((obj.otyp | 0) === 239 /* TIN_OPENER */)
            return true;
        if ((obj.owornmask | 0) & W_WEP) {
            const skill = MKOBJ_OC_SKILL[obj.otyp | 0] | 0;
            if (skill === P_DAGGER || skill === P_KNIFE)
                return true;
        }
    }
    return false;
}
import { PM_GIANT_EEL, PM_LONG_WORM, PM_ACID_BLOB, PM_CROCODILE } from './pm.generated.js';
import { PM_SILVER_DRAGON, PM_GRAY_DRAGON, PM_STRAW_GOLEM, PM_IRON_GOLEM, PM_DEATH, PM_PESTILENCE, PM_FAMINE, PM_MINOTAUR, PM_KI_RIN, PM_COCKATRICE, PM_CHICKATRICE, PM_GREMLIN, PM_VROCK, PM_ANGEL } from './pm.generated.js';
/* m_initinv's is_mercenary() arm (C makemon.c:606-632 switch (monsndx(ptr))). */
import { PM_GUARD, PM_SOLDIER, PM_SERGEANT, PM_LIEUTENANT, PM_CAPTAIN,
         PM_WATCHMAN, PM_WATCH_CAPTAIN } from './pm.generated.js';
/* ARM_BONUS(obj) reads objects[otyp].a_ac (hack.h:1526). */
import { ARMOR_DATA } from './armor_data.js';
import { MKOBJ_OC_PROB } from './mkobj_data.js';
/* mquaffmsg (muse.c:292) helpers — see the port below. */
import { DEAF, MM_NOMSG } from './const.js';
import { verbalize } from './cmd.js';
import { a_monnam } from './mhitm.js';
import { rndmonnam } from './do_name.js';
import { paralyze_monst } from './dogmove.js';
import { observe_object, discover_object } from './o_init.js';
import { g_at, surface, ceiling as ceiling_real, docall } from './cmd.js';
import { sp_levchn_lookup, mksobj, next_ident, set_corpsenm, add_to_container, engr_at, set_bknown, makemon, Can_dig_down, start_corpse_timeout, start_glob_timeout } from './mklev.js';
import { mongets } from './m_initweap.js';
import { builds_up } from './dungeon.js';
import { ESHK } from './const.js';
import { oid_price_adjustment, inhishop, shop_keeper, onbill } from './shk.js';
import { inhistemple } from './priest.js';
import { force_more, pline, urgent_pline as urgent_pline_disp, newsym, canspotmon, canseemon, map_invisible, sensemon, cls, docrt, show_glyph, display_self } from './display.js';
/* create_critters (makemon.c:1556) reaches these two; both are cyclic imports
 * (teleport.js and wizcmds.js each import this file) but every binding used is
 * a hoisted function declaration, so the cycle resolves. */
import { enexto_out } from './teleport.js';
import { create_particular } from './wizcmds.js';
import { YMonnam, little_to_big, update_inventory, Some_Monnam, mon_hates_silver, locomotion, s_suffix, Adjmonnam, poly_when_stoned, y_monnam, can_blow, resists_blnd, helpless, noit_mon_nam, mon_nam_too } from './mhitm.js';
import { mon_nam, m_at } from './uhitm.js';
import { unconscious } from './pickup.js';
import { an, makeplural, makesingular, vtense, doname_potion, doname, distant_name, ansimpleoname, bare_artifactname } from './objnam.js';
/* mloot_container (muse.c:2264, use_misc's MUSE_BAG arm) needs C's shared
 * can_carry(mon, obj) — the same function dog.c's pet-pickup path calls.
 * Creates a bidirectional import cycle with js/dogmove.js (which already
 * imports several exports FROM this file); resolves fine because both sides
 * bind a hoisted function declaration, the same pattern already used for the
 * teleport.js / wizcmds.js cycle above. */
import { can_carry, mondied_dm } from './dogmove.js';
import { def_char_to_monclass } from './drawing.js';
import { weight } from './weight.js';
import { Monnam } from './mcastu.js';
import { couldsee, cansee, recalc_block_point } from './vision.js';
import { m_useup, seetrap, mintrap, mon_learns_traps, extract_from_minvent, maketrap, fill_pit } from './trap.js';
import { place_monster, impossible } from './steed.js';
import { maybe_unhide_at, add_to_minv, obj_extract_self, obfree, is_drawbridge_wall } from './dokick.js';
import { welded, trycall, body_part, freeinv, mbodypart } from './cmd.js';
import { remove_worn_item } from './steal.js';
import { setnotworn } from './worn.js';
import { dropy } from './cmd.js';
import { place_object, mpickobj, upstart, Can_fall_thru, resists_ston } from './mklev.js';
/* C obj.h:257 bimanual(otmp) — one shared body; this file already imports
 * from do_wear.js on this line, so no module edge is added. */
import { xname, hard_helmet, bimanual } from './do_wear.js';
import { migrate_to_level, sticks, unstuck } from './dog.js';
/* use_defensive()'s dependencies (C muse.c:795-1221).  Is_botlevel and
 * mon_has_amulet were already READ by find_defensive() above (js/makemon.js
 * :3667, :3679) with no binding in scope at all — a ReferenceError waiting on
 * the first monster to reach the wand-of-digging or wand-of-teleportation arm
 * of its inventory scan.  Binding them is part of this change, not a
 * refactor. */
import { Is_botlevel, MIGR_STAIRS_UP, MIGR_STAIRS_DOWN, MIGR_LADDER_UP, MIGR_LADDER_DOWN, MIGR_SSTAIRS, FORCETRAP, SCORR, CORR } from './const.js';
import { mon_has_amulet } from './mhitm.js';
/* mreadmsg() (muse.c:236-284, use_defensive's MUSE_SCR_TELEPORTATION arm)
 * needs same_race (mondata.c:770) for its unseen-monster description, and
 * x_monnam (do_name.c) to build that description; both are already ported in
 * js/mhitm.js beside the other muse.c helpers this file already imports from
 * there. */
import { same_race, x_monnam } from './mhitm.js';
/* C include/flag.h:530-543 enum plnmsg_types — this file only needs the
 * count-sentinel PLNMSG_enum ("none of the above"), computed the same way
 * js/const.js derives every other member: one past the last named entry. */
import { PLNMSG_MON_TAKES_OFF_ITEM } from './const.js';
const PLNMSG_enum_MM = PLNMSG_MON_TAKES_OFF_ITEM + 1;
import { title_to_mon } from './mhitm.js';  /* C botl.c:366 — name_to_monplus's rank-title fallback */
/* C mondata.c:1191 pronoun_gender() — mhe()'s body below. */
import { pronoun_gender as pronoun_gender_mm } from './mhitm.js';
import { mongone, healmon, bcsign, newcham } from './mklev.js';
import { mon_has_special } from './mcastu.js';
import { unblock_point } from './vision.js';
import { dunlev } from './dungeon.js';
/* monflee (monmove.c:461) helpers — see the port below. */
import { create_gas_cloud } from './region.js';
import { mon_track_clear, mon_would_take_item } from './monmove.js';
/* C muse.c:1342-1415 hero_behind_chokepoint / mon_likes_objpile_at deps. */
import { xytodir, dirtocoord } from './cmd.js';
import { get_level as get_level_core, random_teleport_level } from './cmd.js';
import { accessible, is_pool } from './look.js';
import { is_ice } from './engrave.js';
import { money_cnt } from './com_pager.js';
import { on_level } from './dungeon.js';
import { rloc, tele_restrict } from './teleport.js';
import { mon_adjust_speed } from './trap.js';
/** @typedef {[number, number, number, number, number, number, number, number, number]} MonRow */
const MONS = /** @type {MonRow[]} */ (monsPack.mons);
const SPECIAL_PM = /** @type {number} */ (monsPack.special_pm);
/** C mondata.h is_armed — attacktype(ptr, AT_WEAP); one row per monsters.h MON() */
const MON_HAS_WEAP_ATK = /** @type {number[]} */ (monArmedPack.has_weap_atk);
/** C permonst.msize (MZ_*) per MON() row order — js/makemon_msize.json (gen-mons-msize.mjs). */
const MONS_MSIZE = /** @type {number[]} */ (monMsizePack.msize);
const MONS_MR = /** @type {number[]} */ (monMrPack.mr);
/** C permonst.mattk[NATTK] per MON() row — js/makemon_mattk.json (gen-mons-mattk.mjs).
 * Each row is 6 × {aatyp, adtyp, damn, damd}. Aligned to MONS via the audit filter. */
const MONS_MATTK = /** @type {{aatyp:number,adtyp:number,damn:number,damd:number}[][]} */ (monMattkPack.mattk);
const NATTK = 6;
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
const MALE = 0, FEMALE = 1, NEUTRAL = 2, NUM_MGENDERS = 3;
const MS_SILENT = 0;  /* C monflag.h ms_sounds */
const MS_BUZZ = 10;
const MS_BURBLE = 16;
const AT_BOOM = 14; /* C monattk.h: explodes when killed — not a "real" attack */
const AT_ANY = -1;  /* C monattk.h: dmgtype_fromattack wildcard */
const AD_ANY = -1;  /* C monattk.h: attacktype_fordmg wildcard */
/** C mondata.h is_armed(ptr) — m_initweap is skipped when false (makemon.c:1442–1444). */
export function isArmedMndx(mndx) {
    const i = mndx | 0;
    return i >= 0 && i < MON_HAS_WEAP_ATK.length && MON_HAS_WEAP_ATK[i] !== 0;
}
const NON_PM = -1;
const LOW_PM = 0;
const NUMMONS = MONS.length;
const MAXMCLASSES = 61;
const G_FREQ = 7;
const G_NOHELL = 0x0800;
const G_HELL = 0x0400;
const G_NOGEN = 0x0200;
const G_UNIQ = 0x1000;
const G_IGNORE = 0x8000;
const G_GENOD = 0x02;
const G_GONE = G_GENOD | 0x01;
const MR_FIRE = 0x01;
const MR_COLD = 0x02;
const M1_FLY = 0x00000001;
const M1_SWIM = 0x00000002;
const M1_AMORPHOUS = 0x00000004;
/** C monflag.h */
const M1_HUMANOID = 0x00020000;
/** C monflag.h */
const M1_UNSOLID = 0x00100000;
/** C monflag.h mflags1 bits (mondata predicate family, wsv Phase-0). */
const M1_CLING = 0x00000010;
const M1_AMPHIBIOUS = 0x00000200;
const M1_BREATHLESS = 0x00000400;
const M1_WALLWALK = 0x00000008;
const M1_NOHEAD = 0x00008000;
const M1_NOEYES = 0x00001000;
const M1_NOHANDS = 0x00002000;
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
/** C defsym.h MONSYM values (wsv-V8: olfaction/sliparm). */
const S_BLOB = 2;
const S_JELLY = 10;
const S_FUNGUS = 32;
const S_PUDDING = 42;
/** C monst.h MZ_SMALL physical size (sliparm). */
const MZ_SMALL = 1;
/** C monst.h MZ_MEDIUM (can_saddle: steeds must be >= MZ_MEDIUM). */
const MZ_MEDIUM = 2;
/** C monflag.h mflags2 bits + symbols/PM indices for hates_silver/the_unique_pm (wsv-V9). */
const M2_WERE = 0x00000004;
const M2_DEMON = 0x00000100;
const M2_PNAME = 0x00080000;
const S_IMP = 9;
const S_VAMPIRE = 48;
const PM_SHADE = 288;
const PM_TENGU = 55;
const PM_HIGH_CLERIC = 276; /* C PM_HIGH_CLERIC = js PM_HIGH_PRIEST */
const PM_LONG_WORM_TAIL = 330;
/** C defsym.h MONSYM — S_DRAGON */
const S_DRAGON = 30;
/** C defsym.h MONSYM — S_GOLEM */
const S_GOLEM = 55;
const S_TRAPPER = 20;
const S_EYE = 5;
const S_LIGHT = 25;
const S_VORTEX = 22;
const S_GHOST = 54;
const S_LICH = 38;
/** C defsym.h MONSYM — S_ZOMBIE (zombie_maker). */
const S_ZOMBIE = 52;
/** C monsters.h — S_ZOMBIE-class non-zombies (zombie_maker excludes these). */
const PM_GHOUL = 246;
const PM_SKELETON = 248;
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
function is_unicorn(ptr) {
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
    if (In_endgame(uz)) {
        const sanctum = game.sanctum_level;
        const depthSanctum = sanctum ? depth_of_level(sanctum) : 1;
        return depthSanctum + Math.trunc((game.u?.ulevel ?? 1) / 2);
    }
    if (game.u?.uhave?.amulet) {
        // C dungeon.c:2033 includes quest depth when carrying the Amulet.
        return deepest_lev_reached(false);
    }
    let res = depth_of_level(uz);
    if (builds_up(uz)) {
        const dun = game.dungeons?.[uz.dnum];
        const entryLev = dun?.entry_lev ?? 1;
        res += 2 * (entryLev - uz.dlevel + 1);
    }
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
    return isHomeElementalMndx(ptr.pmidx);
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

export function olfaction(mdat) {
    const mlet = mdat.mlet;
    if (mlet === S_GOLEM
        || mlet === S_EYE
        || mlet === S_JELLY || mlet === S_PUDDING
        || mlet === S_BLOB || mlet === S_VORTEX
        || mlet === S_ELEMENTAL
        || mlet === S_FUNGUS
        || mlet === S_LIGHT)
        return false;
    return true;
}
export function sliparm(ptr) {
    /* C mondata.h:57 is_whirly(ptr) = mlet == S_VORTEX || ptr == &mons[PM_AIR_ELEMENTAL]. */
    const is_whirly = (ptr.mlet === S_VORTEX || ptr.pmidx === PM_AIR_ELEMENTAL);
    /* noncorporeal() is this module's own helper (mondata.h:31 —
     * ptr->mlet == S_GHOST, NOT an M1_UNSOLID test; that is C's separate
     * unsolid(), mondata.h:63).  A local copy of it used to live here and
     * shadow it. */
    return is_whirly || ptr.msize <= MZ_SMALL || noncorporeal(ptr);
}
function is_were(ptr) { return (ptr.mflags2 & M2_WERE) !== 0; }
export function is_demon(ptr) { return (ptr.mflags2 & M2_DEMON) !== 0; }
function type_is_pname(ptr) { return (ptr.mflags2 & M2_PNAME) !== 0; }
export function check_gear_next_turn(mon) {
    mon.misc_worn_check |= I_SPECIAL;
}
/* C mondata.c:524 hates_silver(ptr) — were/vampire/demon/shade/(imp not tengu). */
export function hates_silver(ptr) {
    return (is_were(ptr) || ptr.mlet === S_VAMPIRE || is_demon(ptr)
            || ptr.pmidx === PM_SHADE
            || (ptr.mlet === S_IMP && ptr.pmidx !== PM_TENGU));
}
/* C objnam.c:1121 the_unique_pm(ptr) — TRUE if "the <name>" (unique, not pname).
 * pname monsters are unique but described as "Name" not "the Name" → FALSE. */
export function the_unique_pm(ptr) {
    if (type_is_pname(ptr))
        return false;
    let uniq = (ptr.geno & G_UNIQ) ? true : false;
    if (ptr.pmidx === PM_HIGH_CLERIC || ptr.pmidx === PM_LONG_WORM_TAIL)
        uniq = false;
    if (ptr.pmidx === PM_WIZARD_OF_YENDOR)
        uniq = true;
    return uniq;
}
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
const PM_VLAD_THE_IMPALER = 228;
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
    let mal = row[4] | 0; /* permonst.maligntyp */
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
export function can_saddle(mtmp) {
    return canSaddleMndx(mtmp, monsndx(mtmp));
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
        if (mndx === PM_AIR_ELEMENTAL)
            return !Is_airlevel(uz);
        if (mndx === PM_FIRE_ELEMENTAL)
            return !Is_firelevel(uz);
        if (mndx === PM_EARTH_ELEMENTAL)
            return !Is_earthlevel(uz);
        if (mndx === PM_WATER_ELEMENTAL)
            return !Is_waterlevel(uz);
        return true;
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
export function rndmonnum() {
    return rndmonnumAdj(0, 0);
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
export async function mkmonmoney(mtmp, amount) {
    if (amount > 0) {
        const gold = await mksobj(GOLD_PIECE_OTYP, false, false);
        gold.quan = amount;
        gold.owt = weight(gold);
        gold.where = OBJ_MINVENT;
        gold.ocarry = mtmp;
        gold.nobj = mtmp.minvent ?? null;
        mtmp.minvent = gold;
    }
}
const SCR_TELEPORTATION_OTYP = 333;
const SCR_CREATE_MONSTER_OTYP = 329;
const POT_HEALING_OTYP = 307;
const POT_EXTRA_HEALING_OTYP = 308;
const POT_FULL_HEALING_OTYP = 315;
const POT_SICKNESS_OTYP = 318;
const POT_SPEED_OTYP = 302;
const POT_INVISIBILITY_OTYP = 305;
const POT_GAIN_LEVEL_OTYP = 309;
const POT_POLYMORPH_OTYP = 316;
const WAN_TELEPORTATION_OTYP = 424;
const WAN_CREATE_MONSTER_OTYP = 413;
const WAN_DIGGING_OTYP = 428;
const WAN_SPEED_MONSTER_OTYP = 420;
const WAN_MAKE_INVISIBLE_OTYP = 418;
const WAN_POLYMORPH_OTYP = 422;
const AMULET_OF_LIFE_SAVING_OTYP = 202;
/** @param {{ mndx?: number, mnum?: number }} mtmp */
function monsndx(mtmp) {
    return (mtmp.mndx ?? mtmp.mnum) | 0;
}
/** @param {number} mndx */
function monMlet(mndx) {
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
/** C permonst.mattk[NATTK] — 6 attacks via makemon_mattk.json (parallel to MONS). */
function monMattk(mndx) {
    return MONS_MATTK[mndx];
}
/** C permonst.msound — MS_* via makemon_msound.json (parallel to MONS row order). */
function monMsound(mndx) {
    return MONS_MSOUND[mndx] | 0;
}
export function permonstTemplate(mndx) {
    const i = mndx | 0;
    if (i < 0 || i >= NUMMONS) return null;
    const row = MONS[i];
    return {
        pmidx: i,
        mlet: row[0] | 0,
        mlevel: row[1] | 0,
        geno: row[3] | 0,
        maligntyp: row[4] | 0,
        mresists: row[5] | 0, // row[5]=mr1 (resist BITFIELD), NOT the mr% field (absent from MONS table)
        mr: MONS_MR[i] | 0,
        mflags1: row[6] >>> 0,  // unsigned uint32 bitfield — | 0 wraps high-bit values negative (raceptr V26)
        mflags2: row[7] >>> 0,
        mflags3: row[8] >>> 0,
        mmove: row[9] | 0,
        msize: MONS_MSIZE[i] | 0,
        mattk: MONS_MATTK[i],
        msound: MONS_MSOUND[i] | 0,
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
const S_HUMAN_MLET = 53;   /* defsym.h MONSYM(53, '@', HUMAN, ...) */
function _altspl_pm(canonicalName, mletFilter) {
    const hits = [];
    for (let i = 0; i < MONS_PMNAMES.length; i++) {
        const row = MONS_PMNAMES[i];
        if (!row || !row.some((n) => n === canonicalName))
            continue;
        if (mletFilter != null && (MONS[i] ? MONS[i][0] : -1) !== mletFilter)
            continue;
        hits.push(i);
    }
    if (hits.length !== 1)
        throw new Error(`alt_spl: "${canonicalName}" resolved to ${hits.length} mons rows (${hits.join(',')})`);
    return hits[0];
}

/* [alternate spelling, mndx, genderhint] in C's order — the scan returns on the
 * FIRST prefix match, so the order is load-bearing and is C's verbatim. */
const ALT_SPL = [
    /* Alternate spellings */
    ['grey dragon', _altspl_pm('gray dragon'), NEUTRAL],
    ['baby grey dragon', _altspl_pm('baby gray dragon'), NEUTRAL],
    ['grey unicorn', _altspl_pm('gray unicorn'), NEUTRAL],
    ['grey ooze', _altspl_pm('gray ooze'), NEUTRAL],
    ['gray-elf', _altspl_pm('Grey-elf'), NEUTRAL],
    ['mindflayer', _altspl_pm('mind flayer'), NEUTRAL],
    ['master mindflayer', _altspl_pm('master mind flayer'), NEUTRAL],
    /* More alternates; priest and priestess are separate monster types but
       that isn't the case for {aligned,high} priests */
    ['aligned priest', _altspl_pm('aligned cleric'), MALE],
    ['aligned priestess', _altspl_pm('aligned cleric'), FEMALE],
    ['high priest', _altspl_pm('high cleric'), MALE],
    ['high priestess', _altspl_pm('high cleric'), FEMALE],
    /* Inappropriate singularization by -ves check above */
    ['master of thief', _altspl_pm('Master of Thieves'), NEUTRAL],
    /* Potential misspellings where we want to avoid falling back to the rank
       title prefix (input has been singularized) */
    ['master thief', _altspl_pm('Master of Thieves'), NEUTRAL],
    ['master of assassin', _altspl_pm('Master Assassin'), NEUTRAL],
    ['master-lich', _altspl_pm('master lich'), NEUTRAL],   /* cf arch-lich */
    ['masterlich', _altspl_pm('master lich'), NEUTRAL],    /* cf demilich */
    /* Outdated names */
    ['invisible stalker', _altspl_pm('stalker'), NEUTRAL],
    ['high-elf', _altspl_pm('elven monarch'), NEUTRAL],    /* PM_HIGH_ELF obsolete */
    /* other misspellings or incorrect words */
    ['wood-elf', _altspl_pm('Woodland-elf'), NEUTRAL],
    ['wood elf', _altspl_pm('Woodland-elf'), NEUTRAL],
    ['woodland nymph', _altspl_pm('wood nymph'), NEUTRAL],
    ['halfling', _altspl_pm('hobbit'), NEUTRAL],
    ['genie', _altspl_pm('djinni'), NEUTRAL],
    /* prefix used to workaround duplicate monster names for monsters with
       alternate forms */
    ['human wererat', _altspl_pm('wererat', S_HUMAN_MLET), NEUTRAL],
    ['human werejackal', _altspl_pm('werejackal', S_HUMAN_MLET), NEUTRAL],
    ['human werewolf', _altspl_pm('werewolf', S_HUMAN_MLET), NEUTRAL],
    /* for completeness */
    ['rat wererat', _altspl_pm('wererat', 18 /* S_RODENT */), NEUTRAL],
    ['jackal werejackal', _altspl_pm('werejackal', 4 /* S_DOG */), NEUTRAL],
    ['wolf werewolf', _altspl_pm('werewolf', 4 /* S_DOG */), NEUTRAL],
    /* Hyphenated names */
    ['ki rin', _altspl_pm('ki-rin'), NEUTRAL],
    ['kirin', _altspl_pm('ki-rin'), NEUTRAL],
    ['uruk hai', _altspl_pm('Uruk-hai'), NEUTRAL],
    ['orc captain', _altspl_pm('orc-captain'), NEUTRAL],
    ['woodland elf', _altspl_pm('Woodland-elf'), NEUTRAL],
    ['green elf', _altspl_pm('Green-elf'), NEUTRAL],
    ['grey elf', _altspl_pm('Grey-elf'), NEUTRAL],
    ['gray elf', _altspl_pm('Grey-elf'), NEUTRAL],
    ['elf lady', _altspl_pm('elf-noble'), FEMALE],
    ['elf lord', _altspl_pm('elf-noble'), MALE],
    ['elf noble', _altspl_pm('elf-noble'), NEUTRAL],
    ['olog hai', _altspl_pm('Olog-hai'), NEUTRAL],
    ['arch lich', _altspl_pm('arch-lich'), NEUTRAL],
    ['archlich', _altspl_pm('arch-lich'), NEUTRAL],
    /* Some irregular plurals */
    ['incubi', _altspl_pm('amorous demon'), MALE],
    ['succubi', _altspl_pm('amorous demon'), FEMALE],
    ['violet fungi', _altspl_pm('violet fungus'), NEUTRAL],
    ['homunculi', _altspl_pm('homunculus'), NEUTRAL],
    ['baluchitheria', _altspl_pm('baluchitherium'), NEUTRAL],
    ['lurkers above', _altspl_pm('lurker above'), NEUTRAL],
    ['cavemen', _altspl_pm('cave dweller'), MALE],
    ['cavewomen', _altspl_pm('cave dweller'), FEMALE],
    ['watchmen', _altspl_pm('watchman'), NEUTRAL],
    ['djinn', _altspl_pm('djinni'), NEUTRAL],
    ['mumakil', _altspl_pm('mumak'), NEUTRAL],
    ['erinyes', _altspl_pm('erinys'), NEUTRAL],
];

export function name_to_mon(in_str, gender_name_var) {
    const NON_PM = -1;
    /* strncmpi(a, b, n): does b start with a's first n chars, case-insensitively? */
    const startsWithCI = (needle, hay) =>
        hay.slice(0, needle.length).toLowerCase() === needle.toLowerCase();
    const eqCI = (a, b) => a.toLowerCase() === b.toLowerCase();

    let str = String(in_str);
    /* C mondata.c:923-928 — strip a leading article. */
    if (str.slice(0, 2) === 'a ') str = str.slice(2);
    else if (str.slice(0, 3) === 'an ') str = str.slice(3);
    else if (str.slice(0, 4) === 'the ') str = str.slice(4);

    /* C mondata.c:930-941 — a few irregular plurals ("vortices", "-ies", "-ves").
     * (The alt_spl table would run here in C; not ported — see header.) */
    let slen = str.length;
    const term = str;
    const vi = str.toLowerCase().indexOf('vortices');
    if (vi >= 0) {
        str = str.slice(0, vi + 4) + 'ex' + str.slice(vi + 8);
    } else if (slen > 3 && eqCI(term.slice(-3), 'ies')
               && (slen < 7 || !eqCI(term.slice(-7), 'zombies'))) {
        str = str.slice(0, -3) + 'y';
    } else if (slen > 3 && eqCI(term.slice(-3), 'ves')) {
        str = str.slice(0, -3) + 'f'; /* C Strcpy(term-3,"f") — "…ves" → "…f" */
    }
    slen = str.length; /* length possibly needs recomputing */

    /* C mondata.c:946-1036 — the alt_spl alternate-spelling table.  It runs
     * BEFORE the canonical scan below and RETURNS IMMEDIATELY on a hit, with
     * the entry's genderhint written straight through to *gender_name_var (no
     * "don't override with neuter" post-processing — that belongs to the
     * canonical path only). */
    for (const [altName, pmVal, genderHint] of ALT_SPL) {
        const alen = altName.length;
        if (!startsWithCI(altName, str))
            continue;
        /* C: force full word (which could conceivably be possessive) */
        const next = str[alen];
        if (next !== undefined && next !== ' ' && next !== "'")
            continue;
        return { mntmp: pmVal, gender: genderHint };
    }

    /* C mondata.c:1038-1072 — longest-canonical-name match over mons[].pmnames[]. */
    let mntmp = NON_PM, len = 0, matchgend = -1, exact_match = false;
    for (let i = LOW_PM; i < NUMMONS; i++) {
        for (let mgend = MALE; mgend < NUM_MGENDERS; mgend++) {
            const nm = MONS_PMNAMES[i] && MONS_PMNAMES[i][mgend];
            if (!nm) continue;
            const m_i_len = nm.length;
            if (m_i_len > len && startsWithCI(nm, str)) {
                if (m_i_len === slen) {
                    mntmp = i; len = m_i_len; matchgend = mgend; exact_match = true;
                    break; /* exact match */
                }
                const rest = str.slice(m_i_len);
                if (slen > m_i_len
                    && (rest[0] === ' '
                        || eqCI(rest, 's')
                        || startsWithCI('s ', rest)
                        || eqCI(rest, "'")
                        || startsWithCI("' ", rest)
                        || eqCI(rest, "'s")
                        || startsWithCI("'s ", rest)
                        || eqCI(rest, 'es')
                        || startsWithCI('es ', rest))) {
                    mntmp = i; len = m_i_len; matchgend = mgend;
                }
            }
        }
        if (exact_match) break;
    }
    if (mntmp === NON_PM) {
        const lenRef = { value: len };
        mntmp = title_to_mon(str, null, lenRef);
        len = lenRef.value;
    }
    /* C mondata.c:1078-1082 writes THROUGH the out-pointer:
     *     if (gender_name_var && matchgend != -1) {
     *         if (*gender_name_var == -1 || matchgend != NEUTRAL)
     *             *gender_name_var = matchgend;
     *     }
     * JS models the in/out parameter by value: `gender_name_var` in,
     * `gender_name_out` back out as the `gender` field of the result.
     * NAMED `gender_name_out`, not `gender`, on purpose — a local `gender`
     * here shadows this module's exported `gender(mtmp)` predicate
     * (mondata.c:1180, defined below), which is a different thing entirely. */
    let gender_name_out = NEUTRAL;
    if (matchgend !== -1) {
        if (gender_name_var == null || gender_name_var === -1 || matchgend !== NEUTRAL)
            gender_name_out = matchgend;
        else
            gender_name_out = gender_name_var;
    } else if (gender_name_var != null) {
        gender_name_out = gender_name_var;
    }
    return { mntmp, gender: gender_name_out };
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

export function name_to_monclass(in_str, mndx_p) {
    const MAXMCLASSES = 61, NON_PM = -1;
    /* defsym.h MONSYM ordinals, from the same rows as the table above. */
    const S_MIMIC = 13, S_WORM = 23, S_XAN = 24, S_invisible = 35,
          S_DEMON = 56, S_EEL = 57, S_WORM_TAIL = 59, S_MIMIC_DEF = 60;
    const DEF_INVISIBLE = 'I'; /* defsym.h MONSYM(35, 'I', INVISIBLE, ...) */
    /* "multiple-letter input which matches any of these gets rejected" */
    const falsematch = ['an', 'the', 'or', 'other', 'or other'];
    /* "positive pm_val => specific monster; negative => class" */
    const truematch = [
        { name: 'long worm', pm_val: PM_LONG_WORM },
        { name: 'demon', pm_val: -S_DEMON },  /* hits "imp or minor demon" */
        { name: 'devil', pm_val: -S_DEMON },  /* always "horned devil" */
        { name: 'bug', pm_val: -S_XAN },      /* would match bugbear... */
        { name: 'fish', pm_val: -S_EEL },     /* wouldn't match anything */
    ];

    if (mndx_p)
        mndx_p.value = NON_PM; /* haven't [yet] matched a specific type */

    let str = (in_str == null) ? '' : String(in_str);
    if (!str.length) {
        /* empty input */
        return 0;
    } else if (str.length === 1) {
        /* single character */
        let i = def_char_to_monclass(str.charCodeAt(0));
        if (i === S_MIMIC_DEF) { /* ']' -> 'm' */
            i = S_MIMIC;
        } else if (i === S_WORM_TAIL) { /* '~' -> 'w' */
            i = S_WORM;
            if (mndx_p)
                mndx_p.value = PM_LONG_WORM;
        } else if (i === MAXMCLASSES) { /* maybe 'I' */
            i = (str === DEF_INVISIBLE) ? S_invisible : 0;
        }
        return i;
    }
    /* multiple characters */
    if (str.toLowerCase() === 'long') /* not enough to match "long worm" */
        return 0; /* avoid false whole-word match with "long worm tail" */
    str = makesingular(str);
    const lc = str.toLowerCase();
    for (const f of falsematch)
        if (lc === f)
            return 0;
    for (const t of truematch) {
        if (lc === t.name) {
            const v = t.pm_val | 0;
            if (v < 0)
                return -v; /* class */
            if (mndx_p)
                mndx_p.value = v; /* monster */
            return (permonstTemplate(v)?.mlet | 0);
        }
    }
    /* check monster class descriptions.  C:
     *     if ((p = strstri(x, in_str)) != 0 && (p == x || *(p - 1) == ' ')
     *         && ((int) strlen(p) >= len
     *             && (p[len] == '\0' || p[len] == ' ')))
     * i.e. a case-insensitive substring that starts at a word boundary and ends
     * at one — "or"/"other" are why falsematch exists. */
    const len = str.length;
    for (let i = 1; i < MAXMCLASSES; i++) {
        const x = DEF_MONSYMS_EXPLAIN[i] || '';
        const pi = x.toLowerCase().indexOf(lc);
        if (pi >= 0 && (pi === 0 || x.charAt(pi - 1) === ' ')
            && (x.length - pi) >= len
            && (pi + len === x.length || x.charAt(pi + len) === ' '))
            return i;
    }
    /* check individual species names */
    const nm = name_to_mon(str, null);
    const which = (nm && typeof nm === 'object') ? (nm.mntmp | 0) : (nm | 0);
    if (which !== NON_PM) {
        if (mndx_p)
            mndx_p.value = which;
        return (permonstTemplate(which)?.mlet | 0);
    }
    return 0;
}
/** C mondata.c:580. Hero identity is the object itself, not its monster ID;
 * the current form is mon->data, including after a form change. */
export function can_chant(mtmp) {
    const ptr = mtmp.data || permonstTemplate(mtmp.data_mndx ?? monsndx(mtmp));
    const msound = ptr.msound | 0;
    const strangled = mtmp === game.youmonst
        && !!(game.u && game.u.uprops && game.u.uprops[STRANGLED]
              && game.u.uprops[STRANGLED].intrinsic);
    if (strangled
        || msound === MS_SILENT
        || (ptr.mflags1 & M1_NOHEAD) !== 0 /* !has_head */
        || msound === MS_BUZZ || msound === MS_BURBLE)
        return false;
    return true;
}
export function noattacks(ptr) {
    const a = monMattk(ptr.pmidx | 0);
    if (!a)
        return true;
    for (let i = 0; i < NATTK; i++) {
        if (a[i].aatyp === AT_BOOM)
            continue;
        if (a[i].aatyp)
            return false;
    }
    return true;
}
/** C mondata.c attacktype_fordmg(ptr, atyp, dtyp) — first attack matching aatyp
 * (and adtyp, or AD_ANY wildcard); returns {aatyp,adtyp,damn,damd} or null.
 * mattk ≡ monMattk(ptr.pmidx); C returns &ptr->mattk[i] → its fields. */
export function attacktype_fordmg(ptr, atyp, dtyp) {
    const a = monMattk(ptr.pmidx | 0);
    if (!a)
        return null;
    for (let i = 0; i < NATTK; i++) {
        if (a[i].aatyp === atyp && (dtyp === AD_ANY || a[i].adtyp === dtyp))
            return { aatyp: a[i].aatyp, adtyp: a[i].adtyp, damn: a[i].damn, damd: a[i].damd };
    }
    return null;
}
/** C mondata.c dmgtype_fromattack(ptr, dtyp, atyp) — first attack matching adtyp
 * (and aatyp, or AT_ANY wildcard); returns {aatyp,adtyp,damn,damd} or null. */
export function dmgtype_fromattack(ptr, dtyp, atyp) {
    const a = monMattk(ptr.pmidx | 0);
    if (!a)
        return null;
    for (let i = 0; i < NATTK; i++) {
        if (a[i].adtyp === dtyp && (atyp === AT_ANY || a[i].aatyp === atyp))
            return { aatyp: a[i].aatyp, adtyp: a[i].adtyp, damn: a[i].damn, damd: a[i].damd };
    }
    return null;
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
/** C mondata.h:22 is_clinger(ptr) — M1_CLING (can cling to ceiling). */
function isClingerMndx(mndx) {
    return (monMflags1(mndx) & M1_CLING) !== 0;
}
/** C dungeon.c:1684 has_ceiling(lev) — TRUE everywhere except endgame
 * non-earth levels (which have no ceiling to cling to / float against). */
function has_ceiling(lev) {
    return !(In_endgame(lev) && !Is_earthlevel(lev));
}
export function m_in_air(mtmp) {
    const pmidx = mtmp?.data?.pmidx;
    const mndx = (typeof pmidx === 'number') ? (pmidx | 0)
        : (mtmp?.data_mndx ?? mtmp?.mndx ?? mtmp?.mnum ?? -1) | 0;
    if (mndx < 0)
        return false;
    return isFlyerMndx(mndx)
        || isFloater(mndx)
        || (isClingerMndx(mndx)
            && has_ceiling(game?.u?.uz) && !!mtmp.mundetected);
}
export function poly_gender() {
    const mndx = (game.u && game.u.umonnum != null) ? (game.u.umonnum | 0) : null;
    const female = game.flags?.female ? 1 : 0;
    if (mndx == null || mndx < 0)
        return female;
    /* C mondata.h:65 humanoid(ptr) = (ptr->mflags1 & M1_HUMANOID) != 0L.
     * Spelled `humanoidMndx` rather than `humanoid` because this scope only has
     * an mndx, not a permonst-shaped ptr, and a local `humanoid` here shadows
     * this module's own humanoid(ptr) helper (same mask, ptr call convention). */
    const humanoidMndx = (monMflags1(mndx) & M1_HUMANOID) !== 0;
    if (isNeuterMndx(mndx) || !humanoidMndx)
        return 2;
    return female;
}
/** C mondata.h:114 is_neuter(ptr) — M2_NEUTER (mndx form). */
function isNeuterMndx(mndx) {
    return (monMflags2(mndx) & M2_NEUTER) !== 0;
}
export function gender(mtmp) {
    if (isNeuterMndx(monsndx(mtmp)))
        return 2;
    return mtmp.female | 0;
}
export function zombie_maker(mon) {
    if (mon.mcan)
        return false;
    const mndx = monsndx(mon);
    const mlet = monMlet(mndx);
    if (mlet === S_ZOMBIE)
        return mndx !== PM_GHOUL && mndx !== PM_SKELETON;
    if (mlet === S_LICH)
        return true;
    return false;
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
/** C steal.c findgold — walk argchain (inclusive) via ->nobj, return the first
 *  GOLD_PIECE obj, or null at end. Faithful transliteration:
 *    struct obj *findgold(struct obj *argchain){
 *      struct obj *chain=argchain;
 *      while(chain && chain->otyp != GOLD_PIECE) chain=chain->nobj;
 *      return chain; } */
export function findgold(argchain) {
    let chain = argchain;
    while (chain && chain.otyp !== GOLD_PIECE_OTYP) chain = chain.nobj;
    return chain;
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
                if (mirr) { mirr.nobj = mtmp.minvent ?? null; mtmp.minvent = mirr; }
            }
            if (!rn2(2)) {
                const pot = await mksobjFn(POT_OBJECT_DETECTION, true, false);
                if (pot) { pot.nobj = mtmp.minvent ?? null; mtmp.minvent = pot; }
            }
            break;
        case S_GIANT:
            if (mndx === PM_MINOTAUR) {
                if (!rn2(8) || (game.in_mklev && Is_earthlevel(uz))) {
                    const w = await mksobjFn(WAN_DIGGING_OTYP, true, false);
                    if (w) { w.nobj = mtmp.minvent ?? null; mtmp.minvent = w; }
                }
            } else if (((MONS[mndx][7] >>> 0) & M2_GIANT) !== 0) {
                /* is_giant(ptr): mflags2 & M2_GIANT (row[7] is mflags2) */
                for (let cnt = rn2((mtmp.m_lev | 0) >> 1); cnt; cnt--) {
                    const otmp = await mksobjFn(_rndClass(DILITHIUM_CRYSTAL, LUCKSTONE - 1),
                                          false, false);
                    if (otmp) {
                        otmp.quan = rn1(2, 3);
                        otmp.owt = weight(otmp);
                        /* mpickobj → add_to_minv: prepend to mon->minvent, the
                         * same reduction every sibling case in this switch (and
                         * m_initweap.js mongets/m_initthrow) already uses —
                         * add_to_minv's merged() pass consumes no RNG and
                         * js/mklev.js mpickobj is still a throwing stub. */
                        otmp.nobj = mtmp.minvent ?? null;
                        mtmp.minvent = otmp;
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
                    rin.nobj = mtmp.minvent ?? null;
                    mtmp.minvent = rin;
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
                    otmp.nobj = mtmp.minvent ?? null;
                    mtmp.minvent = otmp;
                }
            }
            break;
        case S_MUMMY:
            /* C makemon.c:774-776 — mummy: rn2(7) → MUMMY_WRAPPING */
            if (rn2(7)) {
                const wrap = await mksobjFn(MUMMY_WRAPPING, true, false);
                if (wrap) { wrap.nobj = mtmp.minvent ?? null; mtmp.minvent = wrap; }
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
                        whistle.nobj = mtmp.minvent ?? null;
                        mtmp.minvent = whistle;
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
                    if (key) { key.nobj = mtmp.minvent ?? null; mtmp.minvent = key; }
                }
                /* switch(rn2(4)) with MAJOR fall-through */
                {
                    const roll = rn2(4);
                    if (roll <= 0) {
                        const w = await mksobjFn(WAN_MAGIC_MISSILE_OTYP, true, false);
                        if (w) { w.nobj = mtmp.minvent ?? null; mtmp.minvent = w; }
                    }
                    if (roll <= 1) {
                        const p = await mksobjFn(POT_EXTRA_HEALING_OTYP, true, false);
                        if (p) { p.nobj = mtmp.minvent ?? null; mtmp.minvent = p; }
                    }
                    if (roll <= 2) {
                        const p = await mksobjFn(POT_HEALING_OTYP, true, false);
                        if (p) { p.nobj = mtmp.minvent ?? null; mtmp.minvent = p; }
                    }
                    /* case 3: always WAN_STRIKING */
                    {
                        const w = await mksobjFn(WAN_STRIKING_OTYP, true, false);
                        if (w) { w.nobj = mtmp.minvent ?? null; mtmp.minvent = w; }
                    }
                }
            }
            else if ((MONS_MSOUND[mndx] | 0) === MS_PRIEST
                     || questMonRepresentsRole(mndx, ROLE_IDX_CLERIC)) {
                const cloakOtyp = rn2(7) ? ROBE_OTYP
                                : rn2(3) ? CLOAK_OF_PROTECTION_OTYP
                                         : CLOAK_OF_MAGIC_RESISTANCE_OTYP;
                {
                    const c = await mksobjFn(cloakOtyp, true, false);
                    if (c) { c.nobj = mtmp.minvent ?? null; mtmp.minvent = c; }
                }
                {
                    const sh = await mksobjFn(SMALL_SHIELD_OTYP, true, false);
                    if (sh) { sh.nobj = mtmp.minvent ?? null; mtmp.minvent = sh; }
                }
                /* C makemon.c:576-586 mkmonmoney(mtmp, amount) — amount is
                 * always > 0 here (rn1(10,20) is 20..29), and mksobj is passed
                 * init=FALSE, so it draws nothing itself. */
                {
                    const amount = rn1(10, 20);
                    const gold = await mksobjFn(GOLD_PIECE_OTYP, false, false);
                    if (gold) {
                        gold.quan = amount;
                        gold.owt = weight(gold);
                        gold.nobj = mtmp.minvent ?? null;
                        mtmp.minvent = gold;
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
                if (c) { c.nobj = mtmp.minvent ?? null; mtmp.minvent = c; }
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
const _UNICORN_HORN = 261; /* u_init.js */
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
                    /* BLACK_DRAGON_SCALE_MAIL = 108, SILVER_DRAGON_SCALE_MAIL = 103 */
                    armor = rn2(2) ? 108 : 103;
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
                cbs.mkmonmoney(mtmp, rn2(1000));
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

/**
 * C mplayer.c:318-352 create_mplayers(num, special) — create `num` monster-players
 * at random free locations.  RNG per iteration: rn1(PM_WIZARD-PM_ARCHEOLOGIST+1,
 * PM_ARCHEOLOGIST), then (rn1(COLNO-4,2), rnd(ROWNO-2)) per placement try, with
 * goodpos() on a zeromonst fakemon (it may draw, e.g. rn2(13) for S_EEL forms),
 * then mk_mplayer.  Gives up silently once tryct exceeds 50.
 * NOT WIRED: final_level (do.c:2043) in js/cmd.js is the caller.
 * @param {number} num
 * @param {boolean} special
 * @param {object} cbs — mkMplayer callbacks (must include makemon)
 */
export async function create_mplayers(num, special, cbs) {
    /* C: fakemon = cg.zeromonst — only .data is filled in, so no m_id/wormno. */
    const fakemon = { data: null, mnum: -1, m_id: 0, wormno: 0,
                      mx: 0, my: 0, minvent: null };
    while (num) {
        let tryct = 0;
        let x, y;
        /* roll for character class */
        const pm = rn1(_PM_WIZARD - _PM_ARCHEOLOGIST + 1, _PM_ARCHEOLOGIST);
        fakemon.mnum = pm;
        fakemon.data = permonstTemplate(pm);
        /* roll for an available location */
        do {
            x = rn1(COLNO - 4, 2);
            y = rnd(ROWNO - 2);
        } while (!goodpos(x, y, fakemon, 0) && tryct++ <= 50);
        /* if pos not found in 50 tries, don't bother to continue */
        if (tryct > 50)
            return;
        await mkMplayer(pm, x, y, special, cbs);
        num--;
    }
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
        /* C makemon.c:1573-1576 — if in water, try to encourage an aquatic
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

        /* C makemon.c:1582-1585:
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

export function propagate(mndx, tally, ghostly) {
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
        mv.mvflags |= 0x01; /* G_EXTINCT */
    }

    if ((mv.born | 0) < 255 && tally && (!ghostly || result)) {
        mv.born = (mv.born | 0) + 1;
    }
    if ((mv.born | 0) >= lim
        && !(mons_row[3] & G_NOGEN)
        && !(mv.mvflags & 0x01)) { /* G_EXTINCT */
        mv.mvflags |= 0x01; /* G_EXTINCT */
    }
    return result;
}

/* C: nethack-c/src/makemon.c:1067 newmextra */
export function newmextra() {
    const mextra = alloc(sizeof_mextra);
    init_mextra(mextra);
    return mextra;
}

function alloc(size) { return {}; }
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

/* C: nethack-c/src/steal.c:57 stealgold */
export async function stealgold(mtmp) {
    let fgold = g_at(game.u.ux, game.u.uy);
    let ygold;
    let tmp;
    let who, whose, what;

    while (fgold && fgold.otyp !== GOLD_PIECE_OTYP)
        fgold = fgold.nexthere;

    /* Do you have real gold? */
    ygold = findgold(game.invent);

    if (fgold && (!ygold || fgold.quan > ygold.quan || !rn2(5))) {
        obj_extract_self(fgold);
        await add_to_minv(mtmp, fgold);
        newsym(game.u.ux, game.u.uy);
        if (game.u.usteed) {
            who = game.u.usteed;
            whose = s_suffix(y_monnam(who));
            what = makeplural(mbodypart(who, FOOT));
        } else {
            who = game.youmonst;
            whose = "your";
            what = makeplural(body_part(FOOT));
        }
        /* [ avoid "between your rear regions" :-] */
        if (_slithy(who.data))
            what = "coils";
        /* reduce "rear hooves/claws" to "hooves/claws" */
        if (what.startsWith("rear "))
            what = what.substring(5);
        pline("%s quickly snatches some gold from %s %s %s!", Monnam(mtmp),
              (_hero_uprop_on(LEVITATION) || _hero_uprop_on(FLYING)) ? "beneath" : "between", whose, what);
        if (!ygold || !rn2(5)) {
            if (!tele_restrict(mtmp))
                await rloc(mtmp, RLOC_MSG);
            await monflee(mtmp, 0, false, false);
        }
    } else if (ygold) {
        const gold_price = OC_COST[GOLD_PIECE_OTYP] | 0;
        tmp = Math.trunc((somegold(money_cnt(game.invent)) + gold_price - 1) / gold_price);
        tmp = Math.min(tmp, ygold.quan);
        if (tmp < ygold.quan)
            ygold = (await splitobj(ygold, tmp));
        else
            setnotworn(ygold);
        freeinv(ygold);
        await add_to_minv(mtmp, ygold);
        pline("Your purse feels lighter.");
        if (!tele_restrict(mtmp))
            await rloc(mtmp, RLOC_MSG);
        await monflee(mtmp, 0, false, false);
        if (game.disp) game.disp.botl = 1;
    }
}
const MUSE_WAN_DEATH = 1;
const MUSE_WAN_SLEEP = 2;
const MUSE_WAN_FIRE = 3;
const MUSE_WAN_COLD = 4;
const MUSE_WAN_LIGHTNING = 5;
const MUSE_WAN_MAGIC_MISSILE = 6;
const MUSE_WAN_STRIKING = 7;
const MUSE_POT_PARALYSIS = 9;
const MUSE_POT_BLINDNESS = 10;
const MUSE_POT_CONFUSION = 11;
const MUSE_FROST_HORN = 12;
const MUSE_FIRE_HORN = 13;
const MUSE_POT_ACID = 14;
const MUSE_WAN_TELEPORTATION = 15;
const MUSE_POT_SLEEPING = 16;
const MUSE_SCR_EARTH = 17;
const MUSE_CAMERA = 18;
/* C muse.c:327 (defensive block) — shared with the offensive selector. */
const MUSE_WAN_UNDEAD_TURNING = 20;

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
const M_SEEN_MAGR    = 0x0001; /* monst.h:77  Antimagic, AD_MAGM */
const M_SEEN_FIRE    = 0x0002; /* monst.h:78  Fire_resistance, AD_FIRE */
const M_SEEN_COLD    = 0x0004; /* monst.h:79  Cold_resistance, AD_COLD */
const M_SEEN_SLEEP   = 0x0008; /* monst.h:80  Sleep_resistance, AD_SLEE */
const M_SEEN_DISINT  = 0x0010; /* monst.h:81  Disint_resistance, AD_DISN */
const M_SEEN_ELEC    = 0x0020; /* monst.h:82  Shock_resistance, AD_ELEC */
const M_SEEN_POISON  = 0x0040; /* monst.h:83  AD_DRST */
const M_SEEN_ACID    = 0x0080; /* monst.h:84  Acid_resistance, AD_ACID */
const M_SEEN_REFL    = 0x0100; /* monst.h:85  reflection, no corresponding AD_foo */
void M_SEEN_NOTHING; void M_SEEN_DISINT; void M_SEEN_POISON;

const WAN_DEATH = 433;
const WAN_SLEEP = 432;
const WAN_FIRE = 430;
const FIRE_HORN = 251;
const WAN_COLD = 431;
const FROST_HORN = 250;
const WAN_LIGHTNING = 434;
const WAN_MAGIC_MISSILE = 429;
const WAN_STRIKING = 417;
const WAN_TELEPORTATION = 424;
const WAN_UNDEAD_TURNING = 421;
const POT_PARALYSIS = 301;
const POT_BLINDNESS = 300;
const POT_CONFUSION = 299;
const POT_SLEEPING = 314;
const POT_ACID = 320;
const SCR_EARTH = 340;
const EXPENSIVE_CAMERA = 229;
const BUGLE = 256;
const BOULDER = 475;
/* C monattk.h:69 AD_HEAL 27, monattk.h:25 AT_GAZE 15 (were 1 and 1). */
const AD_HEAL = 27;
const AT_GAZE = 15;

/* C macro wrappers — use mtmp.data (permonst template object) */
function is_animal(data) { return (data.mflags1 & M1_ANIMAL) !== 0; }
function mindless(data) { return (data.mflags1 & M1_MINDLESS) !== 0; }
/* C mondata.h:52 — #define nohands(ptr) (((ptr)->mflags1 & M1_NOHANDS) != 0L) */
function nohands(data) { return (data.mflags1 & M1_NOHANDS) !== 0; }
function amorphous(data) { return (data.mflags1 & M1_AMORPHOUS) !== 0; }
function passes_walls(data) { return (data.mflags1 & M1_WALLWALK) !== 0; }
function unsolid(data) { return (data.mflags1 & M1_UNSOLID) !== 0; }
function noncorporeal(data) { return data.mlet === S_GHOST; }
/* C mondata.h:46 — #define haseyes(ptr) (((ptr)->mflags1 & M1_NOEYES) == 0L) */
function haseyes(data) { return (data.mflags1 & M1_NOEYES) === 0; }

/* m_seenres — C monst.h:88
 *   #define m_seenres(mon, mask) ((mon)->seen_resistance & (mask))
 * This read `mtmp.mextrinsics` (monst.h:117), which is a DIFFERENT field in a
 * DIFFERENT bit space: mextrinsics carries MR_* resistance bits (monst.h:269
 * mon_resistancebits) while the masks passed here are M_SEEN_* (monst.h:75-86).
 * Masking MR_* bits with an M_SEEN_* mask answers an unrelated question. */
function m_seenres(mtmp, mask) {
    return (mtmp.seen_resistance & mask) !== 0 ? 1 : 0;
}
/* monnear: monster near target coordinates (diagonal/orthogonal */ 
export function monnear(mtmp, x, y) {
    return Math.abs(mtmp.mx - x) <= 1 && Math.abs(mtmp.my - y) <= 1;
}
/* dmgtype: check if monster has a given damage type in any attack */
function dmgtype(ptr, dtyp) {
    return dmgtype_fromattack(ptr, dtyp, AT_ANY) !== null;
}
/* C include/mondata.h:215
 *   #define hates_light(ptr) ((ptr) == &mons[PM_GREMLIN])
 * The gremlin, and nothing else -- there is no mlet test and no undead clause.
 * This used to answer `mlet is S_VAMPIRE || S_GHOST || S_ZOMBIE || S_LICH`,
 * which is a different predicate entirely (C's undead-ish set is
 * mondata.h:184 is_undead()); it named none of the four monsters C names and
 * missed the one it does.
 * `mons[PM_X]` identity is spelled here as the permonst's own form index,
 * the same `pmidx` convention this file already uses at :667, :687, :696. */
function hates_light(data) {
    return !!data && (data.pmidx | 0) === PM_GREMLIN;
}

export function find_offensive(mtmp) {
    if (ENV.FF_OFFENSE_TRACE === '1')
        pushRngLogEntry(`^offense_enter[moves=${game.moves|0} id=${mtmp.m_id|0} pos=${mtmp.mx|0},${mtmp.my|0} target=${mtmp.mux|0},${mtmp.muy|0}]`);
    let obj, mtmp_helmet;
    let reflection_skip;

    game.offensive = null;
    game.has_offense = 0;
    if (mtmp.mpeaceful || is_animal(mtmp.data) || mindless(mtmp.data)
        || nohands(mtmp.data))
        return false;
    if (game.u.uswallow)
        return false;
    if (in_your_sanctuary(mtmp, 0, 0))
        return false;
    if (dmgtype(mtmp.data, AD_HEAL)
        && !game.u.uwep && !game.u.uarmu && !game.u.uarm && !game.u.uarmh
        && !game.u.uarms && !game.u.uarmg && !game.u.uarmc && !game.u.uarmf)
        return false;
    /* all offensive items require orthogonal or diagonal targeting */
    if (!lined_up(mtmp))
        return false;

    reflection_skip = (m_seenres(mtmp, M_SEEN_REFL) !== 0
                       || monnear(mtmp, mtmp.mux, mtmp.muy));
    mtmp_helmet = which_armor(mtmp, W_ARMH);
    /* this picks the last viable item rather than prioritizing choices */
    for (obj = mtmp.minvent; obj; obj = obj.nobj) {
        if (!reflection_skip) {
            if (game.has_offense === MUSE_WAN_DEATH) continue;
            if (obj.otyp === WAN_DEATH && obj.spe > 0
                && !m_seenres(mtmp, M_SEEN_MAGR)) {
                game.offensive = obj;
                game.has_offense = MUSE_WAN_DEATH;
            }
            if (game.has_offense === MUSE_WAN_SLEEP) continue;
            if (obj.otyp === WAN_SLEEP && obj.spe > 0 && game.multi >= 0
                && !m_seenres(mtmp, M_SEEN_SLEEP)) {
                game.offensive = obj;
                game.has_offense = MUSE_WAN_SLEEP;
            }
            if (game.has_offense === MUSE_WAN_FIRE) continue;
            if (obj.otyp === WAN_FIRE && obj.spe > 0
                && !m_seenres(mtmp, M_SEEN_FIRE)) {
                game.offensive = obj;
                game.has_offense = MUSE_WAN_FIRE;
            }
            if (game.has_offense === MUSE_FIRE_HORN) continue;
            if (obj.otyp === FIRE_HORN && obj.spe > 0 && can_blow(mtmp)
                && !m_seenres(mtmp, M_SEEN_FIRE)) {
                game.offensive = obj;
                game.has_offense = MUSE_FIRE_HORN;
            }
            if (game.has_offense === MUSE_WAN_COLD) continue;
            if (obj.otyp === WAN_COLD && obj.spe > 0
                && !m_seenres(mtmp, M_SEEN_COLD)) {
                game.offensive = obj;
                game.has_offense = MUSE_WAN_COLD;
            }
            if (game.has_offense === MUSE_FROST_HORN) continue;
            if (obj.otyp === FROST_HORN && obj.spe > 0 && can_blow(mtmp)
                && !m_seenres(mtmp, M_SEEN_COLD)) {
                game.offensive = obj;
                game.has_offense = MUSE_FROST_HORN;
            }
            if (game.has_offense === MUSE_WAN_LIGHTNING) continue;
            if (obj.otyp === WAN_LIGHTNING && obj.spe > 0
                && !m_seenres(mtmp, M_SEEN_ELEC)) {
                game.offensive = obj;
                game.has_offense = MUSE_WAN_LIGHTNING;
            }
            if (game.has_offense === MUSE_WAN_MAGIC_MISSILE) continue;
            if (obj.otyp === WAN_MAGIC_MISSILE && obj.spe > 0
                && !m_seenres(mtmp, M_SEEN_MAGR)) {
                game.offensive = obj;
                game.has_offense = MUSE_WAN_MAGIC_MISSILE;
            }
        }
        if (game.has_offense === MUSE_WAN_UNDEAD_TURNING) continue;
        m_use_undead_turning(mtmp, obj);
        if (game.has_offense === MUSE_WAN_STRIKING) continue;
        if (obj.otyp === WAN_STRIKING && obj.spe > 0
            && !m_seenres(mtmp, M_SEEN_MAGR)) {
            game.offensive = obj;
            game.has_offense = MUSE_WAN_STRIKING;
        }
        if (game.has_offense === MUSE_WAN_TELEPORTATION) continue;
        if (obj.otyp === WAN_TELEPORTATION && obj.spe > 0
            /* don't give controlled hero a free teleport */
            && !(game.u?.uprops?.[TELEPORT_CONTROL]?.intrinsic
                || game.u?.uprops?.[TELEPORT_CONTROL]?.extrinsic)
            /* same hack as MUSE_WAN_TELEPORTATION_SELF */
            && (!noteleport_level(mtmp)
                || !mon_knows_traps(mtmp, TELEP_TRAP))
            /* do try to move hero to a more vulnerable spot */
            && (onscary(game.u.ux, game.u.uy, mtmp)
                || (hero_behind_chokepoint(mtmp) && mon_has_friends(mtmp))
                || mon_likes_objpile_at(mtmp, game.u.ux, game.u.uy)
                || stairway_at(game.u.ux, game.u.uy))) {
            game.offensive = obj;
            game.has_offense = MUSE_WAN_TELEPORTATION;
        }
        if (game.has_offense === MUSE_POT_PARALYSIS) continue;
        if (obj.otyp === POT_PARALYSIS && game.multi >= 0) {
            game.offensive = obj;
            game.has_offense = MUSE_POT_PARALYSIS;
        }
        if (game.has_offense === MUSE_POT_BLINDNESS) continue;
        if (obj.otyp === POT_BLINDNESS && !attacktype(mtmp.data, AT_GAZE)) {
            game.offensive = obj;
            game.has_offense = MUSE_POT_BLINDNESS;
        }
        if (game.has_offense === MUSE_POT_CONFUSION) continue;
        if (obj.otyp === POT_CONFUSION) {
            game.offensive = obj;
            game.has_offense = MUSE_POT_CONFUSION;
        }
        if (game.has_offense === MUSE_POT_SLEEPING) continue;
        if (obj.otyp === POT_SLEEPING
            && !m_seenres(mtmp, M_SEEN_SLEEP)) {
            game.offensive = obj;
            game.has_offense = MUSE_POT_SLEEPING;
        }
        if (game.has_offense === MUSE_POT_ACID) continue;
        if (obj.otyp === POT_ACID
            && !m_seenres(mtmp, M_SEEN_ACID)) {
            game.offensive = obj;
            game.has_offense = MUSE_POT_ACID;
        }
        /* we can safely put this scroll here since the locations that
         * are in a 1 square radius are a subset of the locations that
         * are in wand or throwing range (in other words, always lined_up())
         */
        if (game.has_offense === MUSE_SCR_EARTH) continue;
        if (obj.otyp === SCR_EARTH
            && (hard_helmet(mtmp_helmet) || mtmp.mconf
                || amorphous(mtmp.data) || passes_walls(mtmp.data)
                || noncorporeal(mtmp.data) || unsolid(mtmp.data)
                || !rn2(10))
            && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 2
            && mtmp.mcansee && haseyes(mtmp.data)
            && !Is_rogue_level(game.u.uz)
            && (!In_endgame(game.u.uz) || Is_earthlevel(game.u.uz))) {
            game.offensive = obj;
            game.has_offense = MUSE_SCR_EARTH;
        }
        if (game.has_offense === MUSE_CAMERA) continue;
        if (obj.otyp === EXPENSIVE_CAMERA
            && ((!_makemon_blind() && !resists_blnd(game.youmonst))
                || hates_light(game.youmonst.data))
            && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 2
            && obj.spe > 0 && !rn2(6)) {
            game.offensive = obj;
            game.has_offense = MUSE_CAMERA;
        }
    }
    if (ENV.FF_OFFENSE_TRACE === '1') {
        const inv = [];
        for (let o = mtmp.minvent; o && inv.length < 32; o = o.nobj)
            inv.push(`${o.otyp}:${o.spe}:${o.oclass}`);
        pushRngLogEntry(`^offense[moves=${game.moves|0} id=${mtmp.m_id|0} pos=${mtmp.mx|0},${mtmp.my|0} target=${mtmp.mux|0},${mtmp.muy|0} chosen=${game.has_offense|0} obj=${game.offensive?.otyp ?? -1} inv=${inv.join(',')}]`);
    }
    return !!game.has_offense;
}

/* Defensive MUSE_* constants (C values from muse.c defensive section) */
const MUSE_SCR_TELEPORTATION = 1;
const MUSE_WAN_TELEPORTATION_SELF = 2;
const MUSE_POT_HEALING = 3;
const MUSE_POT_EXTRA_HEALING = 4;
const MUSE_WAN_DIGGING = 5;
const MUSE_TRAPDOOR = 6;
const MUSE_TELEPORT_TRAP = 7;
const MUSE_UPSTAIRS = 8;
const MUSE_DOWNSTAIRS = 9;
const MUSE_WAN_CREATE_MONSTER = 10;
const MUSE_SCR_CREATE_MONSTER = 11;
const MUSE_UP_LADDER = 12;
const MUSE_DN_LADDER = 13;
const MUSE_SSTAIRS = 14;
const MUSE_BUGLE = 16;
const MUSE_UNICORN_HORN = 17;
const MUSE_LIZARD_CORPSE = 19;
/* MUSE_WAN_TELEPORTATION (C=15) and MUSE_WAN_UNDEAD_TURNING (C=20) are
   declared once, above, with C's values; C's defensive and offensive blocks
   agree on both (muse.c:322 == muse.c:1286; muse.c:327 is not redefined by
   the offensive block by design), so the defensive code shares them.
   MUSE_POT_FULL_HEALING (C muse.c:325 = 18) collides in the JS single scope
   with the offensive MUSE_CAMERA (C muse.c:1289 = 18) — C keeps them apart by
   #define shadowing, JS cannot, so the defensive one carries a _DEF suffix.
   The VALUE is C's; only the JS identifier differs. */
const MUSE_POT_FULL_HEALING_DEF = 18;

/* Object type aliases needed by find_defensive */
const UNICORN_HORN = _UNICORN_HORN;
/* FOOD_CLASS otyps (objects.h OBJECTS_ENUM order; OC_NAME[265]=="corpse",
 * OC_NAME[296]=="tin").  Were 19 and 20 — "elven arrow" and "orcish arrow" in
 * this build, so find_defensive's lizard-corpse / lizard-tin scan matched
 * arrows and never matched a corpse or a tin. */
const CORPSE = 265;
const TIN = 296;
const WAN_DIGGING = WAN_DIGGING_OTYP;
const SCR_TELEPORTATION = SCR_TELEPORTATION_OTYP;
const WAN_CREATE_MONSTER = WAN_CREATE_MONSTER_OTYP;
const SCR_CREATE_MONSTER = SCR_CREATE_MONSTER_OTYP;
const POT_FULL_HEALING = POT_FULL_HEALING_OTYP;
const POT_EXTRA_HEALING = POT_EXTRA_HEALING_OTYP;
const POT_HEALING = POT_HEALING_OTYP;

/* C ref: muse.c m_use_healing(mtmp) — pick the best healing potion the monster
 * carries, in full > extra > plain order.  find_defensive() below called this
 * with NO definition anywhere in js/, so the scored run died with a bare
 * `ReferenceError: m_use_healing is not defined` the first time a monster
 * reached the healing arm.  MUSE_POT_FULL_HEALING is spelled
 * MUSE_POT_FULL_HEALING_DEF here (see the collision note above). */
function m_use_healing(mtmp) {
    let obj;
    if ((obj = m_carrying(mtmp, POT_FULL_HEALING)) != null) {
        game.defensive = obj;
        game.has_defense = MUSE_POT_FULL_HEALING_DEF;
        return true;
    }
    if ((obj = m_carrying(mtmp, POT_EXTRA_HEALING)) != null) {
        game.defensive = obj;
        game.has_defense = MUSE_POT_EXTRA_HEALING;
        return true;
    }
    if ((obj = m_carrying(mtmp, POT_HEALING)) != null) {
        game.defensive = obj;
        game.has_defense = MUSE_POT_HEALING;
        return true;
    }
    return false;
}
const POT_SICKNESS = POT_SICKNESS_OTYP;

/* C mondata.h:200-201
 *   #define touch_petrifies(ptr) \
 *       ((ptr) == &mons[PM_COCKATRICE] || (ptr) == &mons[PM_CHICKATRICE])
 * Every C caller in muse.c spells the argument `&mons[<some>->corpsenm]`, i.e.
 * it is a mons[] row addressed by a monster index.  Because mons[] rows are
 * unique addresses, the C pointer comparison is exactly an index comparison, so
 * the faithful JS form takes the corpsenm index directly rather than
 * materializing a permonst object only to compare its identity — JS object
 * identity would never match, since permonstTemplate() mints a fresh object per
 * call (see the `.pmidx ===` idiom used throughout js/ for `== &mons[X]`). */
function touch_petrifies_corpsenm(corpsenm) {
    const cn = corpsenm | 0;
    return cn === PM_COCKATRICE || cn === PM_CHICKATRICE;
}

function m_sees_sleepy_soldier(mtmp) {
    const x = mtmp.mx | 0, y = mtmp.my | 0;
    for (let xx = x - 3; xx <= x + 3; xx++) {
        for (let yy = y - 3; yy <= y + 3; yy++) {
            if (!isok(xx, yy) || (xx === x && yy === y))
                continue;
            const mon = m_at(xx, yy);
            if (mon && is_mercenary(mon.data)
                && (mon.data.pmidx | 0) !== PM_GUARD
                && helpless(mon))
                return true;
        }
    }
    return false;
}

function is_lava(x, y) {
    if (!isok(x, y)) return false;
    const lev = game.level?.at(x, y);
    if (!lev) return false;
    const typ = lev.typ;
    return typ === LAVAPOOL || typ === LAVAWALL
        || (typ === DRAWBRIDGE_UP && ((lev.drawbridgemask | 0) & DB_UNDER) === DB_LAVA);
}

function is_Vlad(mtmp) {
    if (!mtmp) return false;
    return (mtmp.data && (mtmp.data.pmidx | 0) === PM_VLAD_THE_IMPALER)
        || mtmp.cham === PM_VLAD_THE_IMPALER;
}

export function find_defensive(mtmp, tryescape) {
    let obj, t, fraction, x, y, stuck, immobile, stway;
    let i, xx, yy;
    let locs;

    x = mtmp.mx;
    y = mtmp.my;
    stuck = (mtmp === game.u.ustuck);
    immobile = (mtmp.data.mmove === 0);

    game.defensive = null;
    game.has_defense = 0;

    if (is_animal(mtmp.data) || mindless(mtmp.data))
        return false;
    if (!tryescape && dist2(x, y, mtmp.mux, mtmp.muy) > 25)
        return false;
    if (tryescape && Is_knox_level(game.u.uz)
        && !m_next2u(mtmp) && m_next2m(mtmp))
        return false;
    if (game.u.uswallow && stuck)
        return false;

    /* Unicorn horn usage */
    if (mtmp.mconf || mtmp.mstun || !mtmp.mcansee) {
        obj = null;
        if (!nohands(mtmp.data)) {
            for (obj = mtmp.minvent; obj; obj = obj.nobj)
                if (obj.otyp === UNICORN_HORN && !obj.cursed)
                    break;
        }
        if (obj || is_unicorn(mtmp.data) || mtmp.data.pmidx === PM_KI_RIN) {
            game.defensive = obj;
            game.has_defense = MUSE_UNICORN_HORN;
            return true;
        }
    }

    if (mtmp.mconf || mtmp.mstun) {
        let liztin = null;

        for (obj = mtmp.minvent; obj; obj = obj.nobj) {
            if (obj.otyp === CORPSE && obj.corpsenm === PM_LIZARD) {
                game.defensive = obj;
                game.has_defense = MUSE_LIZARD_CORPSE;
                return true;
            } else if (obj.otyp === TIN && obj.corpsenm === PM_LIZARD) {
                liztin = obj;
            }
        }
        if (liztin && mcould_eat_tin(mtmp) && rn2(3)) {
            game.defensive = liztin;
            game.has_defense = MUSE_LIZARD_CORPSE;
            return true;
        }
    }

    /* healing when blind */
    if (!mtmp.mcansee && !nohands(mtmp.data)
        && mtmp.data.pmidx !== PM_PESTILENCE) {
        if (m_use_healing(mtmp))
            return true;
    }

    /* undead turning against corpse wielder */
    if (!mtmp.mpeaceful && !nohands(mtmp.data)
        && game.u.uwep && game.u.uwep.otyp === CORPSE
        && touch_petrifies_corpsenm(game.u.uwep.corpsenm)
        && !poly_when_stoned(mtmp.data) && !resists_ston(mtmp)
        && lined_up(mtmp)) {
        for (obj = mtmp.minvent; obj; obj = obj.nobj)
            if (obj.otyp === WAN_UNDEAD_TURNING && obj.spe > 0) {
                game.defensive = obj;
                game.has_defense = MUSE_WAN_UNDEAD_TURNING;
                return true;
            }
    }

    if (!tryescape) {
        fraction = game.u.ulevel < 10 ? 5 : game.u.ulevel < 14 ? 4 : 3;
        if (mtmp.mhp >= mtmp.mhpmax
            || (mtmp.mhp >= 10 && mtmp.mhp * fraction >= mtmp.mhpmax))
            return false;

        if (mtmp.mpeaceful) {
            if (!nohands(mtmp.data)) {
                if (m_use_healing(mtmp))
                    return true;
            }
            return false;
        }
    }

    if (stuck || immobile || mtmp.mtrapped) {
        /* fleeing by stairs or traps is not possible */
    } else if (game.level.locations[x][y].typ === STAIRS) {
        stway = stairway_at(x, y);
        if (stway && !stway.up && stway.tolev.dnum === game.u.uz.dnum) {
            if (!is_floater(mtmp.data))
                game.has_defense = MUSE_DOWNSTAIRS;
        } else if (stway && stway.up && stway.tolev.dnum === game.u.uz.dnum) {
            game.has_defense = MUSE_UPSTAIRS;
        } else if (stway && stway.tolev.dnum !== game.u.uz.dnum) {
            if (stway.up || !is_floater(mtmp.data))
                game.has_defense = MUSE_SSTAIRS;
        }
    } else if (game.level.locations[x][y].typ === LADDER) {
        stway = stairway_at(x, y);
        if (stway && stway.up && stway.tolev.dnum === game.u.uz.dnum) {
            game.has_defense = MUSE_UP_LADDER;
        } else if (stway && !stway.up && stway.tolev.dnum === game.u.uz.dnum) {
            if (!is_floater(mtmp.data))
                game.has_defense = MUSE_DN_LADDER;
        } else if (stway && stway.tolev.dnum !== game.u.uz.dnum) {
            if (stway.up || !is_floater(mtmp.data))
                game.has_defense = MUSE_SSTAIRS;
        }
    } else {
        let ignore_boulders = (verysmall(mtmp.data)
                               || throws_rocks(mtmp.data)
                               || passes_walls(mtmp.data));
        /* C mondata.h:10 — #define monsndx(ptr) ((ptr)->pmidx).  This file's
         * local monsndx() helper takes a MONSTER (mtmp.mndx ?? mtmp.mnum), not
         * a permonst, so passing mtmp.data through it read an unsourced field
         * and threw off the permonst strict proxy.  find_misc (below) already
         * spells this as mdat.pmidx; match it. */
        let diag_ok = !NODIAG(mtmp.data.pmidx);

        locs = new Array(10);
        for (i = 0; i < 10; ++i)
            locs[i] = [0, 0];
        locs[0][0] = x; locs[0][1] = y;
        i = 1;
        for (xx = x - 1; xx <= x + 1; xx++)
            for (yy = y - 1; yy <= y + 1; yy++)
                if (isok(xx, yy) && (xx !== x || yy !== y)) {
                    locs[i][0] = xx; locs[i][1] = yy;
                    ++i;
                }
        for (i = 0; i < 10; ++i) {
            xx = locs[i][0]; yy = locs[i][1];
            if (!xx)
                break;
            if (u_at(xx, yy)
                || (xx !== x && yy !== y && !diag_ok)
                /* C `svl.level.monsters[xx][yy]` — the monster-presence grid.
                 * game.level has no such grid; find_misc below already spells
                 * this lookup as monster_at() (the fmon walk). Match it. */
                || (monster_at(xx, yy) && !(xx === x && yy === y)))
                continue;
            t = t_at(xx, yy);
            if (!t
                || (!ignore_boulders && sobj_at(BOULDER, xx, yy))
                || onscary(xx, yy, mtmp))
                continue;
            if (is_hole(t.ttyp)
                && !is_floater(mtmp.data)
                && !mtmp.isshk && !mtmp.isgd && !mtmp.ispriest
                && Can_fall_thru(game.u.uz)) {
                game.trapx = xx;
                game.trapy = yy;
                game.has_defense = MUSE_TRAPDOOR;
                break;
            } else if (t.ttyp === TELEP_TRAP) {
                game.trapx = xx;
                game.trapy = yy;
                game.has_defense = MUSE_TELEPORT_TRAP;
            }
        }
    }

    if (!nohands(mtmp.data)) {
        /* C muse.c:640 `(obj = m_carrying(mtmp, BUGLE)) != 0` is a POINTER
         * non-NULL test.  The port spelled it `!== 0`, which in JS is TRUE for
         * the null m_carrying returns when the monster has no bugle — so the
         * guard collapsed to is_mercenary && m_sees_sleepy_soldier and could
         * set has_defense = MUSE_BUGLE with gm.m.defensive == NULL. */
        if (is_mercenary(mtmp.data) && (obj = m_carrying(mtmp, BUGLE)) != null
            && m_sees_sleepy_soldier(mtmp)) {
            game.defensive = obj;
            game.has_defense = MUSE_BUGLE;
        }

        if (!game.has_defense) {
            t = t_at(x, y);
            if (t && (is_pit(t.ttyp) || t.ttyp === WEB || t.ttyp === BEAR_TRAP))
                t = null;

            for (obj = mtmp.minvent; obj; obj = obj.nobj) {
                if (game.has_defense && !rn2(3))
                    break;

                if (game.has_defense === MUSE_WAN_DIGGING)
                    break;
                if (obj.otyp === WAN_DIGGING && obj.spe > 0 && !stuck && !t
                    && !mtmp.isshk && !mtmp.isgd && !mtmp.ispriest
                    && !is_floater(mtmp.data)
                    && !sokobanRules()
                    && !(game.level.locations[x][y].wall_info & W_NONDIGGABLE)
                    && !(Is_botlevel(game.u.uz) || In_endgame(game.u.uz))
                    && !(is_ice(x, y) || is_pool(x, y) || is_lava(x, y))
                    && !(is_Vlad(mtmp) && In_V_tower(game.u.uz))) {
                    game.defensive = obj;
                    game.has_defense = MUSE_WAN_DIGGING;
                }
                if (game.has_defense === MUSE_WAN_TELEPORTATION_SELF) continue;
                if (game.has_defense === MUSE_WAN_TELEPORTATION) continue;
                if (obj.otyp === WAN_TELEPORTATION && obj.spe > 0) {
                    if (!noteleport_level(mtmp)
                        || !mon_knows_traps(mtmp, TELEP_TRAP)) {
                        game.defensive = obj;
                        game.has_defense = (mon_has_amulet(mtmp))
                                            ? MUSE_WAN_TELEPORTATION
                                            : MUSE_WAN_TELEPORTATION_SELF;
                    }
                }
                if (game.has_defense === MUSE_SCR_TELEPORTATION) continue;
                if (obj.otyp === SCR_TELEPORTATION && mtmp.mcansee
                    && haseyes(mtmp.data)
                    && (!obj.cursed || (!(mtmp.isshk && inhishop(mtmp))
                                         && !mtmp.isgd && !mtmp.ispriest))) {
                    if (!noteleport_level(mtmp)
                        || !mon_knows_traps(mtmp, TELEP_TRAP)) {
                        game.defensive = obj;
                        game.has_defense = MUSE_SCR_TELEPORTATION;
                    }
                }

                if (mtmp.data.pmidx !== PM_PESTILENCE) {
                    if (game.has_defense === MUSE_POT_FULL_HEALING_DEF) continue;
                    if (obj.otyp === POT_FULL_HEALING) {
                        game.defensive = obj;
                        game.has_defense = MUSE_POT_FULL_HEALING_DEF;
                    }
                    if (game.has_defense === MUSE_POT_EXTRA_HEALING) continue;
                    if (obj.otyp === POT_EXTRA_HEALING) {
                        game.defensive = obj;
                        game.has_defense = MUSE_POT_EXTRA_HEALING;
                    }
                    if (game.has_defense === MUSE_WAN_CREATE_MONSTER) continue;
                    if (obj.otyp === WAN_CREATE_MONSTER && obj.spe > 0) {
                        game.defensive = obj;
                        game.has_defense = MUSE_WAN_CREATE_MONSTER;
                    }
                    if (game.has_defense === MUSE_POT_HEALING) continue;
                    if (obj.otyp === POT_HEALING) {
                        game.defensive = obj;
                        game.has_defense = MUSE_POT_HEALING;
                    }
                } else { /* Pestilence */
                    if (game.has_defense === MUSE_POT_FULL_HEALING_DEF) continue;
                    if (obj.otyp === POT_SICKNESS) {
                        game.defensive = obj;
                        game.has_defense = MUSE_POT_FULL_HEALING_DEF;
                    }
                    if (game.has_defense === MUSE_WAN_CREATE_MONSTER) continue;
                    if (obj.otyp === WAN_CREATE_MONSTER && obj.spe > 0) {
                        game.defensive = obj;
                        game.has_defense = MUSE_WAN_CREATE_MONSTER;
                    }
                }
                if (game.has_defense === MUSE_SCR_CREATE_MONSTER) continue;
                if (obj.otyp === SCR_CREATE_MONSTER) {
                    game.defensive = obj;
                    game.has_defense = MUSE_SCR_CREATE_MONSTER;
                }
            }
        }
    }

    return !!game.has_defense;
}

/* MUSE_* constants for find_misc (C values from muse.c:2083-2092) */
const MUSE_POT_GAIN_LEVEL = 1;
const MUSE_WAN_MAKE_INVISIBLE = 2;
const MUSE_POT_INVISIBILITY = 3;
const MUSE_POLY_TRAP = 4;
const MUSE_WAN_POLYMORPH = 5;
const MUSE_POT_SPEED = 6;
const MUSE_WAN_SPEED_MONSTER = 7;
const MUSE_BULLWHIP = 8;
const MUSE_POT_POLYMORPH = 9;
const MUSE_BAG = 10;

/* Object type constants for find_misc (real otyp values, objects.h order) */
const BULLWHIP_OTYP = 82;
const LARGE_BOX_OTYP = 214;
const ICE_BOX_OTYP = 216;
const BAG_OF_HOLDING_OTYP = 219;
const BAG_OF_TRICKS_OTYP = 220;
const BOULDER_OTYP = 475;

const MFAST = 2; /* C monst.h: speeded monster */
const PM_GRID_BUG = 116; /* pm.generated.js PM_GRID_BUG */
/* C hack.h:1419 NODIAG(monnum) = ((monnum) == PM_GRID_BUG) */
function NODIAG(monnum) { return (monnum | 0) === PM_GRID_BUG; }
/* C mondata.h verysmall(ptr) = ((ptr)->msize < MZ_SMALL) */
/* C mondata.h:20 — #define is_floater(ptr)
 *     ((ptr)->mlet == S_EYE || (ptr)->mlet == S_LIGHT) */
function is_floater(data) { return data.mlet === S_EYE || data.mlet === S_LIGHT; }
/* C monflag.h:132 M2_MERC 0x00000200L;
 * mondata.h:111 is_mercenary(ptr) = (((ptr)->mflags2 & M2_MERC) != 0L) */
const M2_MERC = 0x00000200;
function is_mercenary(data) { return (data.mflags2 & M2_MERC) !== 0; }
function verysmall(data) { return data.msize < MZ_SMALL; }
/* C mondata.h throws_rocks(ptr) = (((ptr)->mflags2 & M2_ROCKTHROW) != 0L) */
const M2_ROCKTHROW = 0x08000000;
function throws_rocks(data) { return (data.mflags2 & M2_ROCKTHROW) !== 0; }
/* C youprop.h See_invisible = (HSee_invisible || ESee_invisible) */
function See_invisible() {
    const p = game.u.uprops[SEE_INVIS];
    return (p.intrinsic || p.extrinsic) !== 0;
}
/* C you.h:555 u_at(x,y) = ((x) == u.ux && (y) == u.uy) */
function u_at(x, y) { return x === game.u.ux && y === game.u.uy; }
/* C you.h:553 m_next2u(m) = (distu((m)->mx,(m)->my) <= 2) */
function m_next2u(mon) { return dist2(mon.mx, mon.my, game.u.ux, game.u.uy) <= 2; }
function m_next2m(mtmp) {
    if ((mtmp.mhp | 0) < 1 || ((mtmp.mstate | 0) !== 0))
        return false;
    for (let x = mtmp.mx - 1; x <= mtmp.mx + 1; x++)
        for (let y = mtmp.my - 1; y <= mtmp.my + 1; y++) {
            if (!isok(x, y))
                continue;
            const m2 = monster_at(x, y);
            if (m2 && m2 !== mtmp)
                return true;
        }
    return false;
}
/* C monst.h:208 MON_WEP(mon) = ((mon)->mw) */
function MON_WEP(mon) { return mon.mw; }
/* C obj.h:337 Is_container(o) = ((o)->otyp >= LARGE_BOX && (o)->otyp <= BAG_OF_TRICKS) */
function Is_container(o) { return o.otyp >= LARGE_BOX_OTYP && o.otyp <= BAG_OF_TRICKS_OTYP; }
/* C obj.h:340 SchroedingersBox(o) = ((o)->otyp == LARGE_BOX && (o)->spe == 1) */
function SchroedingersBox(o) { return o.otyp === LARGE_BOX_OTYP && o.spe === 1; }
/* C obj.h:339 Is_mbag(o) = ((o)->otyp == BAG_OF_HOLDING || (o)->otyp == BAG_OF_TRICKS) */
function Is_mbag(o) { return o.otyp === BAG_OF_HOLDING_OTYP || o.otyp === BAG_OF_TRICKS_OTYP; }
/* C obj.h:334 Has_contents(o) = ((o)->cobj != (struct obj *) 0) */
function Has_contents(o) { return o.cobj != null; }
/* C trap.c t_at(x,y) — walk the level's trap list for one at (x,y). Mirrors
 * js/trap.js's t_at (not imported: trap.js does not import makemon.js, but
 * this keeps find_misc self-contained the same way the other muse.c
 * macro-wrapper helpers above are). */
function t_at(x, y) {
    if (!game.level || !game.level.traps)
        return null;
    for (const trap of game.level.traps) {
        if (trap.tx === x && trap.ty === y)
            return trap;
    }
    return null;
}
function sobj_at(otyp, x, y) {
    let otmp = game.level && game.level.levelObjects && game.level.levelObjects[x]
        ? (game.level.levelObjects[x][y] ?? null) : null;
    while (otmp) {
        if (otmp.otyp === otyp)
            break;
        otmp = otmp.nexthere ?? null;
    }
    return otmp;
}
function monster_at(x, y) {
    for (let m = game.fmon; m; m = m.nmon)
        if (!m._mapRemoved && (m.mhp | 0) > 0 && m.mx === x && m.my === y)
            return m;
    return null;
}

export function find_misc(mtmp) {
    let obj, t, xx, yy;
    const mdat = mtmp.data;
    const x = mtmp.mx, y = mtmp.my;
    const immobile = (mdat.mmove === 0);
    const stuck = (mtmp === game.u.ustuck);

    game.misc = null;
    game.has_misc = 0;
    if (is_animal(mdat) || mindless(mdat))
        return false;
    if (game.u.uswallow && stuck)
        return false;

    /* We arbitrarily limit to times when a player is nearby for the
     * same reason as Junior Pac-Man doesn't have energizers eaten until
     * you can see them... */
    if (dist2(x, y, mtmp.mux, mtmp.muy) > 36)
        return false;

    if (!stuck && !immobile && !mtmp.mtrapped && (mtmp.cham === NON_PM)
        /* C: mons[(pmidx = monsndx(mdat))].difficulty — monsndx(struct
         * permonst *) is pointer arithmetic (mdat - mons); mdat.pmidx is
         * that same index already carried on the permonst template proxy. */
        && monDifficulty(mdat.pmidx) < 6) {
        const pmidx = mdat.pmidx;
        const ignore_boulders = (verysmall(mdat) || throws_rocks(mdat)
                                 || passes_walls(mdat));
        const diag_ok = !NODIAG(pmidx);

        for (xx = x - 1; xx <= x + 1; xx++)
            for (yy = y - 1; yy <= y + 1; yy++)
                if (isok(xx, yy) && !u_at(xx, yy)
                    && (diag_ok || xx === x || yy === y)
                    && ((xx === x && yy === y) || !monster_at(xx, yy)))
                    if ((t = t_at(xx, yy)) !== null
                        && (ignore_boulders || !sobj_at(BOULDER_OTYP, xx, yy))
                        && !onscary(xx, yy, mtmp)) {
                        /* use trap if it's the correct type and will
                         * polymorph the monster (muse.c:2136-2137);
                         * trap.c:1098 wearing_iron_shoes: which_armor(W_ARMF)
                         * material == IRON (objclass.h IRON = 11) */
                        const armf_ws = which_armor(mtmp, W_ARMF);
                        if (t.ttyp === POLY_TRAP
                            && !(armf_ws && (MKOBJ_OC_MATERIAL[armf_ws.otyp | 0] | 0) === 11)) {
                            game.trapx = xx;
                            game.trapy = yy;
                            game.has_misc = MUSE_POLY_TRAP;
                            return true;
                        }
                    }
    }
    if (nohands(mdat))
        return false;

    /* [bug?]  Choice of item is not prioritized; the last viable one
     * in the monster's inventory will be chosen. */
    for (obj = mtmp.minvent; obj; obj = obj.nobj) {
        /* Monsters shouldn't recognize cursed items; this kludge is
           necessary to prevent serious problems though... */
        if (obj.otyp === POT_GAIN_LEVEL_OTYP
            && (!obj.cursed
                || (!mtmp.isgd && !mtmp.isshk && !mtmp.ispriest))) {
            game.misc = obj;
            game.has_misc = MUSE_POT_GAIN_LEVEL;
        }
        if (game.has_misc === MUSE_BULLWHIP) continue;
        if (obj.otyp === BULLWHIP_OTYP && !mtmp.mpeaceful
            /* the random test prevents whip-wielding monster from
               attempting disarm every turn */
            && game.u.uwep && !rn2(5) && obj === MON_WEP(mtmp)
            /* hero's location must be known and adjacent */
            && u_at(mtmp.mux, mtmp.muy)
            && m_next2u(mtmp)
            /* don't bother if it can't work (this doesn't prevent cursed
               weapons from being targeted) */
            && !game.u.uswallow
            && (canletgo(game.u.uwep, '')
                || (game.u.twoweap && canletgo(game.u.uswapwep, '')))) {
            game.misc = obj;
            game.has_misc = MUSE_BULLWHIP;
        }
        /* Note: peaceful/tame monsters won't make themselves invisible
         * unless you can see them.  Not really right, but... */
        if (game.has_misc === MUSE_WAN_MAKE_INVISIBLE) continue;
        if (obj.otyp === WAN_MAKE_INVISIBLE_OTYP && obj.spe > 0 && !mtmp.minvis
            && !mtmp.invis_blkd && (!mtmp.mpeaceful || See_invisible())
            && (!attacktype(mtmp.data, AT_GAZE) || mtmp.mcan)) {
            game.misc = obj;
            game.has_misc = MUSE_WAN_MAKE_INVISIBLE;
        }
        if (game.has_misc === MUSE_POT_INVISIBILITY) continue;
        if (obj.otyp === POT_INVISIBILITY_OTYP && !mtmp.minvis
            && !mtmp.invis_blkd && (!mtmp.mpeaceful || See_invisible())
            && (!attacktype(mtmp.data, AT_GAZE) || mtmp.mcan)) {
            game.misc = obj;
            game.has_misc = MUSE_POT_INVISIBILITY;
        }
        if (game.has_misc === MUSE_WAN_SPEED_MONSTER) continue;
        if (obj.otyp === WAN_SPEED_MONSTER_OTYP && obj.spe > 0
            && mtmp.mspeed !== MFAST && !mtmp.isgd) {
            game.misc = obj;
            game.has_misc = MUSE_WAN_SPEED_MONSTER;
        }
        if (game.has_misc === MUSE_POT_SPEED) continue;
        if (obj.otyp === POT_SPEED_OTYP && mtmp.mspeed !== MFAST && !mtmp.isgd) {
            game.misc = obj;
            game.has_misc = MUSE_POT_SPEED;
        }
        if (game.has_misc === MUSE_WAN_POLYMORPH) continue;
        if (obj.otyp === WAN_POLYMORPH_OTYP && obj.spe > 0
            && (mtmp.cham === NON_PM) && monDifficulty(mdat.pmidx) < 6) {
            game.misc = obj;
            game.has_misc = MUSE_WAN_POLYMORPH;
        }
        if (game.has_misc === MUSE_POT_POLYMORPH) continue;
        if (obj.otyp === POT_POLYMORPH_OTYP && (mtmp.cham === NON_PM)
            && monDifficulty(mdat.pmidx) < 6) {
            game.misc = obj;
            game.has_misc = MUSE_POT_POLYMORPH;
        }
        if (game.has_misc === MUSE_BAG) continue;
        if (Is_container(obj) && obj.otyp !== BAG_OF_TRICKS_OTYP && !rn2(5)
            && !SchroedingersBox(obj)
            && !game.has_misc && Has_contents(obj)
            && !obj.olocked && !obj.otrapped) {
            game.misc = obj;
            game.has_misc = MUSE_BAG;
        }
    }
    return !!game.has_misc;
}

async function precheck(mtmp, otmp) {
    if (!otmp)
        return 0;
    const descr = game._objDescriptions ? game._objDescriptions[otmp.otyp | 0] : undefined;
    const occupant_chance = (mndx) => 13 + 2 * ((game.mvitals?.[mndx]?.born | 0));
    const gone = (mndx) => (((game.mvitals?.[mndx]?.mvflags | 0) & G_GONE) !== 0);
    const vis = cansee(mtmp.mx | 0, mtmp.my | 0);
    if ((otmp.oclass | 0) === POTION_CLASS_MM) {
        /* C muse.c:1104-1160 — milky ghost / smoky djinni occupants. */
        const empty = 'The potion turns out to be empty.';
        if (descr === 'milky' && !gone(PM_GHOST_MM)
            && !rn2(occupant_chance(PM_GHOST_MM))) {
            const cc = enexto_out(mtmp.mx | 0, mtmp.my | 0, permonstTemplate(PM_GHOST_MM));
            if (!cc)
                return 0;
            mquaffmsg(mtmp, otmp);
            m_useup(mtmp, otmp);
            const mon = await makemon(permonstTemplate(PM_GHOST_MM), cc.x | 0, cc.y | 0, MM_NOMSG);
            if (!mon) {
                if (vis)
                    pline(empty);
            } else {
                if (vis) {
                    pline(`As ${mon_nam(mtmp)} opens the bottle, an enormous ${Hallucination_mm() ? rndmonnam() : 'ghost'} emerges!`);
                    pline(`${Monnam(mtmp)} is frightened to death, and unable to move.`);
                }
                paralyze_monst(mtmp, 3);
            }
            return 2;
        }
        if (descr === 'smoky' && !gone(PM_DJINNI_MM)
            && !rn2(occupant_chance(PM_DJINNI_MM))) {
            const cc = enexto_out(mtmp.mx | 0, mtmp.my | 0, permonstTemplate(PM_DJINNI_MM));
            if (!cc)
                return 0;
            mquaffmsg(mtmp, otmp);
            m_useup(mtmp, otmp);
            const mon = await makemon(permonstTemplate(PM_DJINNI_MM), cc.x | 0, cc.y | 0, MM_NOMSG);
            if (!mon) {
                if (vis)
                    pline(empty);
            } else {
                if (vis)
                    pline_mon(mon, `In a cloud of smoke, ${a_monnam(mon)} emerges!`);
                pline(`${vis ? Monnam(mon) : 'Something'} speaks.`);
                if (rn2(2)) {
                    await verbalize('You freed me!');
                    mon.mpeaceful = 1;
                    set_malign(mon);
                } else {
                    await verbalize('It is about time.');
                    if (vis)
                        pline(`${Monnam(mon)} vanishes.`);
                    await mongone(mon);
                }
            }
            return 2;
        }
    }
    if ((otmp.oclass | 0) === WAND_CLASS_MM && (otmp.cursed | 0)
        && !rn2(WAND_BACKFIRE_CHANCE_MM)) {
        /* KNOWN GAP — muse.c:1148-1173, the cursed-wand backfire (explosion for
         * d(spe+2,6), possible monkilled, m_useup).  C's post-backfire state for
         * a surviving monster is has_defense = has_offense = has_misc = 0 then
         * `return 0`, which is what is reproduced here. */
        game.has_defense = 0;
        game.has_offense = 0;
        game.has_misc = 0;
        return 0;
    }
    return 0;
}
const POTION_CLASS_MM = 8, WAND_CLASS_MM = 11, WAND_BACKFIRE_CHANCE_MM = 100;
const PM_GHOST_MM = 287, PM_DJINNI_MM = 315;
/* C ref: nethack-c/include/youprop.h:125 Deaf = (HDeaf || EDeaf ||
 * u.uroleplay.deaf).  DEAF is prop.h index 40; js/const.js exports it. */
function mquaffmsg_Deaf() {
    const u = game.u || {};
    const p = u.uprops ? u.uprops[DEAF] : null;
    const intrinsic = p ? (p.intrinsic | 0) : 0;
    const extrinsic = p ? (p.extrinsic | 0) : 0;
    return !!(intrinsic || extrinsic || (u.uroleplay && u.uroleplay.deaf));
}
/* const.js BOLT_LIM = 8 (C: include/hack.h).  Local const: this file already
 * carries several function-local shadows around the muse block. */
const BOLT_LIM_MM = 8;
/* C ref: nethack-c/src/pline.c:440-456 You_hear(line, ...).
 *   if ((Deaf && !Unaware) || !flags.acoustics) return;
 *   prefix is "You barely hear " when Underwater, "You dream that you hear "
 *   when Unaware, else "You hear ".
 * The caller below has already tested !Deaf, so only the prefix choice is
 * live here.  RNG-free. */
function mquaffmsg_You_hear(line) { return You_hear(line); }
/* C ref: nethack-c/src/objnam.c:1116-1127 singular(otmp, func) — call func
 * with the object's quantity temporarily forced to 1. */
function mquaffmsg_singular_doname(otmp) {
    const savequan = otmp.quan;
    otmp.quan = 1;
    const nam = doname_potion(otmp);
    otmp.quan = savequan;
    return nam;
}
function mquaffmsg(mtmp, otmp) {
    if (!mtmp || !otmp)
        return;
    if (canseemon(mtmp)) {
        /* C muse.c:295-297 */
        observe_object(otmp);
        pline_mon(mtmp, `${Monnam(mtmp)} drinks ${mquaffmsg_singular_doname(otmp)}!`);
    } else if (!mquaffmsg_Deaf()) {
        /* C muse.c:298-301 — Soundeffect() is audio only. */
        mquaffmsg_You_hear('a chugging sound.');
    }
}
/* C ref: youprop.h:169 Hallucination = (HHallucination && !Halluc_resistance),
 * HHallucination = u.uprops[HALLUC].intrinsic (there is no EHallucination in
 * 5.0).  Same formula js/dog.js:87 and js/fastforward.js:1087 already carry
 * locally — this file has no shared Hallucination() to import. */
function Hallucination_mm() {
    const up = game.u?.uprops;
    const h = up?.[HALLUC_MM], r = up?.[HALLUC_RES_MM];
    const res = ((r?.intrinsic | 0) !== 0) || ((r?.extrinsic | 0) !== 0);
    return ((h?.intrinsic | 0) !== 0) && !res;
}
const HALLUC_MM = 23, HALLUC_RES_MM = 24; /* const.js HALLUC / HALLUC_RES */
/* C ref: objnam.c:1116-1127 singular(otmp, func) — call func with the
 * object's quantity temporarily forced to 1.  Generalises
 * mquaffmsg_singular_doname above to an arbitrary namer, which mreadmsg below
 * needs (doname on the vismon arm, ansimpleoname on the !vismon arm). */
async function mreadmsg_singular(otmp, namer) {
    const savequan = otmp.quan;
    otmp.quan = 1;
    const nam = await namer(otmp);
    otmp.quan = savequan;
    return nam;
}
async function mreadmsg(mtmp, otmp) {
    const vismon = canseemon(mtmp);
    let tpindicator = !vismon && sensemon(mtmp);
    if (!vismon && mquaffmsg_Deaf())
        return; /* no feedback */
    observe_object(otmp);
    const onambuf = await mreadmsg_singular(otmp, vismon ? doname : ansimpleoname);
    if (vismon) {
        /* C muse.c:250-251 */
        pline_mon(mtmp, `${Monnam(mtmp)} reads ${onambuf}!`);
        (game.iflags ||= {}).last_msg = PLNMSG_UNKNOWN_MM;
    } else { /* !Deaf, otherwise we would already have returned above */
        const youdata = game.youmonst ? game.youmonst.data : null;
        const similar = same_race(youdata, mtmp.data);
        const uniqmon = (((mtmp.data?.geno | 0) & G_UNIQ) !== 0) || !!mtmp.isshk;
        let meverseen = false;
        try { meverseen = !!mtmp.meverseen; } catch { }
        const recognize = !Hallucination_mm()
            && (meverseen || (similar && !uniqmon));
        const mflags = SUPPRESS_INVISIBLE_MM | SUPPRESS_SADDLE_MM
            | (recognize ? SUPPRESS_IT_MM : AUGMENT_IT_MM);
        if (sensemon(mtmp)) {
            tpindicator = true;
        } else if (couldsee(mtmp.mx, mtmp.my) && mdistu(mtmp) <= 10 * 10) {
            /* monster can't be seen or sensed; remember it if within LOS
               and relatively close */
            map_invisible(mtmp.mx, mtmp.my);
        }
        /* C muse.c:278-280 Snprintf + strsubst("reading a scroll labeled",
         * mconf ? "attempting to incant" : "incant") — a single first-match
         * substring replace, C strsubst's exact behaviour. */
        let blindbuf = `reading ${onambuf}`;
        const needle = 'reading a scroll labeled';
        const idx = blindbuf.indexOf(needle);
        if (idx !== -1) {
            const repl = mtmp.mconf ? 'attempting to incant' : 'incant';
            blindbuf = blindbuf.slice(0, idx) + repl + blindbuf.slice(idx + needle.length);
        }
        await mquaffmsg_You_hear(
            `${x_monnam(mtmp, ARTICLE_A_MM, null, mflags, false)} ${blindbuf}.`);
        (game.iflags ||= {}).last_msg = PLNMSG_UNKNOWN_MM;
        /* KNOWN GAP — muse.c:283 flash_mon(mtmp); see function comment. */
    }
    if (mtmp.mconf) {
        /* C muse.c:286-288 */
        pline(`Being confused, ${vismon ? mon_nam(mtmp) : mhe(mtmp)} mispronounces the magic words...`);
        (game.iflags ||= {}).last_msg = PLNMSG_UNKNOWN_MM;
    }
}
const PLNMSG_UNKNOWN_MM = 0; /* const.js PLNMSG_UNKNOWN */
const ARTICLE_A_MM = 2, SUPPRESS_IT_MM = 0x01, SUPPRESS_INVISIBLE_MM = 0x02,
      SUPPRESS_SADDLE_MM = 0x08, AUGMENT_IT_MM = 0x40; /* const.js */
async function mzapwand(mtmp, otmp, self) {
    if (!otmp)
        return;
    if ((otmp.spe | 0) < 1) {
        /* C: impossible("Mon zapping wand with %d charges?") then return —
         * the charge is NOT spent. */
        return;
    }
    if (!canseemon(mtmp)) {
        /* C muse.c:174-181.  range is BOLT_LIM+1 when the square is in line of
         * sight and BOLT_LIM-3 otherwise; mdistu(mtmp) is
         * dist2(mtmp->mx, mtmp->my, u.ux, u.uy). */
        const range = couldsee(mtmp.mx | 0, mtmp.my | 0)
                      ? (BOLT_LIM_MM + 1) : (BOLT_LIM_MM - 3);
        const near = dist2(mtmp.mx | 0, mtmp.my | 0,
                           game.u.ux | 0, game.u.uy | 0) <= range * range;
        mquaffmsg_You_hear(`a ${near ? 'nearby' : 'distant'} zap.`);
    } else if (self) {
        /* C muse.c:182-184 — monverbself (do_name.c:1221-1248) inlined. */
        const selfbuf = mon_nam_too(mtmp, mtmp);
        const verbs = vtense(selfbuf, 'zap');
        let monnamtext = Monnam(mtmp);
        if (verbs === 'zap') {
            monnamtext = makeplural(monnamtext);
            if (monnamtext.toLowerCase() === 'they')
                monnamtext = monnamtext[0] === 'T' ? 'Them' : 'them';
        }
        pline(`${monnamtext} ${verbs} ${selfbuf} with ${await doname(otmp)}!`);
    } else {
        pline(`${Monnam(mtmp)} zaps ${an(xname(otmp))}!`);
        if (game.occupation)
            game.occupation = null; /* stop_occupation, as js/muse.js:94 */
    }
    otmp.spe = (otmp.spe | 0) - 1;
}
/* C ref: worn.c:465-477 mon_set_minvis(mon, cursed_potion). `on` here is
 * the C `cursed_potion` argument (callers pass whether the drunk potion
 * was cursed, per potion.c:1790 / muse.c:2449), NOT the desired minvis
 * state directly — mon->perminvis is set from its logical negation, and
 * minvis itself is only updated when the monster isn't invis_blkd. */
export function mon_set_minvis(mtmp, cursed_potion) {
    mtmp.perminvis = cursed_potion ? 0 : 1;
    if (!mtmp.invis_blkd) {
        mtmp.minvis = mtmp.perminvis;
        newsym(mtmp.mx, mtmp.my); /* make it disappear */
        if (mtmp.wormno)
            see_wsegs_rl(mtmp); /* and any tail too */
    }
}

function see_wsegs_rl(mon) { return see_wsegs_real(mon); }
function muse_newcham_mon(mtmp) {
    const m_armr = which_armor(mtmp, W_ARM);
    if (m_armr) {
        const otyp = m_armr.otyp | 0;
        if (otyp >= _GRAY_DRAGON_SCALES && otyp <= _YELLOW_DRAGON_SCALES)
            return PM_GRAY_DRAGON + (otyp - _GRAY_DRAGON_SCALES);
        if (otyp >= _GRAY_DRAGON_SCALE_MAIL && otyp <= _YELLOW_DRAGON_SCALE_MAIL)
            return PM_GRAY_DRAGON + (otyp - _GRAY_DRAGON_SCALE_MAIL);
    }
    return rndmonst();
}
/* obj.h Is_dragon_scales/Is_dragon_mail otyp bands; GRAY_DRAGON_SCALE_MAIL(101)/
 * YELLOW_DRAGON_SCALE_MAIL(110) already anchored above (:2863-2864) for a
 * different reader — these two are new. */
const _GRAY_DRAGON_SCALES = 111; /* objects.h; 110 is the last DSM (yellow) */
const _YELLOW_DRAGON_SCALES = 120;
/* C ref: muse.c:2630-2650 you_aggravate(mtmp) — MUSE_POT_INVISIBILITY's
 * cursed-drink arm (use_misc below): the monster's presence becomes known.
 *     pline("For some reason, %s presence is known to you.", ...);
 *     cls();
 *     show_glyph(mtmp->mx, mtmp->my, mon_to_glyph(mtmp, rn2_on_display_rng));
 *     display_self();
 *     You_feel("aggravated at %s.", noit_mon_nam(mtmp));
 *     display_nhwindow(WIN_MAP, TRUE);
 *     docrt();
 *     if (unconscious()) { gm.multi = -1; gn.nomovemsg = "..."; }
 *     newsym(mtmp->mx, mtmp->my);
 *     if (!canspotmon(mtmp)) map_invisible(mtmp->mx, mtmp->my);
 *
 * mon_to_glyph(mon, rng) (display.h:554) is
 * `what_mon(monsndx(mon->data), rng) + (female==0 ? GLYPH_MON_MALE_OFF
 *                                                  : GLYPH_MON_FEM_OFF)`,
 * and what_mon(mon, rng) (display.h:197) is `Hallucination ? rng(NUMMONS)
 * : mon`.  js/display.js keeps GLYPH_MON_MALE_OFF/GLYPH_MON_FEM_OFF (38/37)
 * as PRIVATE module constants (not exported), so the two offsets are
 * reproduced inline here rather than imported; this file already carries its
 * own NUMMONS/monsndx/Hallucination for the same class of muse.c helper.
 * rn2_on_display_rng is the separate DISPLAY isaac64 stream (js/rng.js:239),
 * never the scored one, so this draw cannot perturb rngCalls.
 *
 * cls()/docrt() are `async` in js/display.js; called here without `await`,
 * the same fire-and-forget pattern already used from synchronous callers
 * elsewhere in this port (js/cmd.js:24751/45158, js/display.js:2859's own
 * bare `cls()`), since this function's callers (use_misc below) are
 * themselves synchronous.
 *
 * KNOWN GAP: `display_nhwindow(WIN_MAP, TRUE)` is display-channel only (it
 * "consumes the dismiss keystroke, draws no RNG" — js/cmd.js:22154) and, per
 * win/tty/wintty.c:1884-1889, a blocking NHW_MAP display reduces to "page the
 * pending topline now via more()" when one is outstanding.  No exported hook
 * to force an immediate page exists outside this file's scope, so this port
 * leaves the pending "You feel aggravated..." message to the normal per-turn
 * flush path instead of forcing it early here.  RNG-free either way. */
async function you_aggravate(mtmp) {
    const _agg1 = `For some reason, ${s_suffix(noit_mon_nam(mtmp))} presence is known to you.`;
    /* C topl.c update_topl:268-ish — a pending topline that cannot join the new
     * message (n0 + strlen(toplines) + 3 >= CO - 8) is paged with --More-- first. */
    const _prev = String(game._pending_message || '');
    const _overflow = _prev && (_agg1.length + _prev.length + 3 >= 72);
    if (_overflow)
        await force_more(_prev);
    await pline(_agg1);
    /* display.c:2196 cls() -> display_nhwindow(WIN_MESSAGE, FALSE) pages the pending topline */
    await force_more(String(game._pending_message || _agg1));
    await cls();
    const mndx = Hallucination() ? rn2_on_display_rng(NUMMONS) : monsndx(mtmp);
    const glyph = mndx + (((mtmp.female | 0) === 0) ? 38 /* GLYPH_MON_MALE_OFF */
                                                     : 37 /* GLYPH_MON_FEM_OFF */);
    show_glyph(mtmp.mx | 0, mtmp.my | 0, glyph);
    display_self();
    const _agg2 = `You feel aggravated at ${noit_mon_nam(mtmp)}.`;
    await pline(_agg2);
    /* wintty.c:1884-1889 display_nhwindow(WIN_MAP, TRUE) pages the pending topline */
    await force_more(String(game._pending_message || _agg2));
    await docrt();
    if (unconscious()) {
        game.multi = -1;
        game.nomovemsg = "Aggravated, you are jolted into full consciousness.";
    }
    newsym(mtmp.mx, mtmp.my);
    if (!canspotmon(mtmp))
        map_invisible(mtmp.mx, mtmp.my);
}
/* C hack.h:1531-1532 distu(xx,yy)=dist2(xx,yy,u.ux,u.uy), mdistu(mon) =
 * distu(mon->mx, mon->my).  Inlined here (mdistu has no exported js/
 * definition anywhere — every other copy is a file-local helper) using the
 * dist2() already defined below in this file. */
function mdistu(mon) { return dist2(mon.mx, mon.my, game.u.ux, game.u.uy); }

/* C mkobj.c:2731-2738 container_weight(object) — recompute an object's owt,
 * recursing through its own container chain if it is itself contained.
 * RNG-free. */
export function container_weight(object) {
    object.owt = weight(object);
    if ((object.where | 0) === OBJ_CONTAINED)
        container_weight(object.ocontainer);
}

/* C pickup.c:2781-2799 removed_from_icebox().  Frozen object ages are stored
 * relative to the turn at which they entered the ice box.  On removal they
 * become absolute again and their ordinary lifecycle timer resumes. */
export function removed_from_icebox(obj) {
    if (!age_is_relative(obj)) {
        obj.age = (game.moves | 0) - (obj.age | 0);
        if ((obj.otyp | 0) === CORPSE) {
            const traits = obj.oextra?.omonst;
            const iceTroll = traits && Number.isInteger(traits.mnum)
                ? (traits.mnum | 0) === PM_ICE_TROLL
                : (obj.corpsenm | 0) === PM_ICE_TROLL;
            obj.norevive = iceTroll ? 0 : 1;
            start_corpse_timeout(obj);
        } else if (obj.globby) {
            start_glob_timeout(obj, 0);
        }
    }
}

async function mloot_container(mon, container, vismon) {
    let contnr_nam = '', mpronounbuf = '';
    let takeout_count, res = 0;

    if (!container || !Has_contents(container) || container.olocked)
        return res; /* 0 */
    /* FIXME (C's own comment): handle cursed bag of holding */
    if (Is_mbag(container) && container.cursed)
        return res; /* 0 */
    if (SchroedingersBox(container))
        return res;

    switch (rn2(10)) {
    default: /* case 0, 1, 2, 3: */
        takeout_count = 1;
        break;
    case 4: case 5: case 6:
        takeout_count = 2;
        break;
    case 7: case 8:
        takeout_count = 3;
        break;
    case 9:
        takeout_count = 4;
        break;
    }
    const howfar = mdistu(mon);
    const nearby = howfar <= 7 * 7;
    if (vismon) {
        /* do this once so that when hallucinating it won't change from one
           item to the next */
        mpronounbuf = mhe(mon);
    }

    for (let takeout_indx = 0; takeout_indx < takeout_count; ++takeout_indx) {
        if (!Has_contents(container)) /* might have removed all items */
            break;
        let nitems = 0;
        for (let o = container.cobj; o; o = o.nobj)
            ++nitems;
        /* nitems is always greater than 0 due to Has_contents() check;
           throttle item removal as the container becomes less filled */
        if (!rn2(nitems + 1))
            break;
        nitems = rn2(nitems);
        let xobj = container.cobj;
        for (; xobj; xobj = xobj.nobj)
            if (--nitems < 0)
                break;

        container.cknown = 0; /* hero no longer knows container's contents
                                * even if [attempted] removal is observed */
        if (!contnr_nam) {
            contnr_nam = an(nearby ? xname(container)
                                    : (await distant_name(container, xname)));
        }
        /* C obj_extract_self(xobj) for the OBJ_CONTAINED case (mkobj.c:2557-
         * 2570), which is extract_nobj(obj, &container->cobj) (mkobj.c:2594-
         * 2612 — unlinks AND sets obj->where = OBJ_FREE, obj->nobj = 0) plus
         * container_weight() and clearing the stale ocontainer back-link.
         * Written inline rather than via the imported js/dokick.js
         * obj_extract_self, which handles only the OBJ_MIGRATING case and
         * would silently no-op on a contained item. */
        {
            let prev = null;
            for (let o = container.cobj; o; prev = o, o = o.nobj) {
                if (o === xobj) {
                    if (prev)
                        prev.nobj = o.nobj;
                    else
                        container.cobj = o.nobj;
                    break;
                }
            }
            xobj.where = OBJ_FREE;
            xobj.nobj = null;
            xobj.ocontainer = null;
            container_weight(container);
        }
        if (can_carry(mon, xobj)) {
            if (vismon) {
                if (howfar > 2) /* not adjacent */
                    void Norep(`${Monnam(mon)} rummages through ${contnr_nam}.`);
                else if (takeout_indx === 0) /* adjacent, first item */
                    pline_mon(mon, `${Monnam(mon)} removes ${(await doname(xobj))} from ${contnr_nam}.`);
                else /* adjacent, additional items */
                    pline(`${upstart(mpronounbuf)} removes ${(await doname(xobj))}.`);
            }
            if ((container.otyp | 0) === ICE_BOX_OTYP)
                removed_from_icebox(xobj); /* resume rotting for corpse */
            await mpickobj(mon, xobj);
            res = 2;
        } else { /* couldn't carry xobj separately so put back inside */
            /* an achievement prize (castle's wand?) might already be marked
               nomerge (when it hasn't been in invent yet) */
            const already_nomerge = (xobj.nomerge | 0) !== 0;
            const just_xobj = !Has_contents(container);

            xobj.nomerge = 1;
            xobj = (await add_to_container(container, xobj));
            if (!already_nomerge)
                xobj.nomerge = 0;
            container.owt = weight(container);
            if (just_xobj)
                break; /* out of takeout_count loop */
        } /* can_carry */
    } /* takeout_count */
    return res;
}

/* Ported helpers not yet imported locally — local stubs/fallbacks */
/* cansee: the LOCAL `return true` STUB IS DELETED.  It shadowed the real
 * C-faithful body at js/vision.js:1004 (`viz_array[y][x] & IN_SIGHT`) for the
 * three muse.c visibility reads below (use_defensive / use_misc / MUSE_POLY_TRAP),
 * so every one of them believed the monster's square was in sight and printed
 * messages C suppresses.  This file already imports from './vision.js'. */
function ceiling(x, y) { return ceiling_real(x, y); }
function Can_rise_up(x, y, uz) {
    if (!uz || In_endgame(uz) || In_sokoban(uz))
        return false;
    const dgn = game.dungeons?.[uz.dnum | 0];
    if ((uz.dlevel | 0) > 1)
        return true;
    /* A branch whose entry level is one can rise only when the special
       inter-dungeon upstairs exists and this is not ledger level one. */
    if (!dgn || (dgn.entry_lev | 0) !== 1
        || ((uz.dlevel | 0) + (dgn.ledger_start | 0)) === 1)
        return false;
    for (let s = game.stairs; s; s = s.next) {
        if (s.tolev?.dnum !== (uz.dnum | 0) && s.up)
            return true;
    }
    return false;
}
/* C ref: dungeon.c:1796 get_level(lev, newlev) — map an ABSOLUTE depth back to
 * a {dnum,dlevel} struct; the real branch-walking body already lives at
 * js/cmd.js:10330 (exported above as get_level_core), which returns a fresh
 * object instead of C's out-param.  WAS `tolevel.dnum = 0; tolevel.dlevel =
 * tolev;` — always the MAIN dungeon at the raw depth number, which is only
 * correct when the caller is already in dungeon 0 and the target is not
 * behind a branch.  Dead on use_misc's MUSE_POT_GAIN_LEVEL (guarded by
 * Can_rise_up, itself a `return false` stub, so unreachable there); live on
 * use_defensive's MUSE_SCR_TELEPORTATION cursed/mconf arm (board
 * use_defensive rec#0/#11: m_defensive_cursed=1), where the naive stub would
 * have migrated a monster teleporting off dungeon 2 straight into dungeon 0. */
function get_level(tolevel, tolev) {
    const lev = get_level_core(tolev);
    tolevel.dnum = lev.dnum;
    tolevel.dlevel = lev.dlevel;
}
/* C dungeon.c:1310 ledger_no(lev) — `lev->dlevel + svd.dungeons[lev->dnum]
 * .ledger_start`, the absolute cross-branch level index.  WAS `return 0`,
 * which made use_misc()'s MUSE_POT_GAIN_LEVEL migrate every monster to ledger
 * 0 and would have done the same to every use_defensive() stairway arm below.
 * Same arithmetic js/bones.js:90 already uses. */
function ledger_no(lev) {
    const dgn = game.dungeons?.[lev?.dnum | 0];
    return (lev?.dlevel | 0) + (dgn?.ledger_start | 0);
}
/* C ref: rm.h:526-534 `#define remove_monster(x, y) svl.level.monsters[x][y]
 * = (struct monst *) 0` — clear the monster-presence GRID cell at <x,y>.
 * (EXTRA_SANITY_CHECKS' impossible()-guarded variant does not apply: this is
 * a Release build — NH_DEVEL_STATUS == NH_STATUS_RELEASED, patchlevel.h:33 —
 * so config.h:634-637 compiles the plain one-statement macro, not the
 * sanity-checked one.)
 *
 * This port keeps no `level.monsters[][]` grid at all — confirmed against
 * js/sp_lev.js:5866 and js/worm.js:70 ("game.level.monsters has no real
 * backing") — so there is no field this call could clear.  js/uhitm.js's
 * m_at(x,y), the one JS reader that stands in for C's grid read, walks the
 * fmon chain comparing `m.mx === x && m.my === y` instead: a monster's
 * position IS its grid membership here.  For every call site in this file
 * (use_defensive / use_misc / muse_unslime below), remove_monster(mtmp.mx,
 * mtmp.my) is immediately followed by place_monster(mtmp, newx, newy), which
 * sets mtmp.mx/mtmp.my to the new square — so m_at() already stops finding
 * mtmp at the old square the moment place_monster runs, with no separate
 * clear needed.  Mutating mtmp.mx/mtmp.my HERE (the way js/teleport.js's
 * differently-scoped, differently-named remove_monster_local(x,y) does for
 * ITS OWN call site) would be WRONG in this file specifically: every call
 * site here re-reads mtmp.mx/mtmp.my in the very next statement
 * (`newsym(mtmp.mx, mtmp.my)` — C's `newsym(oldx, oldy)` using the position
 * BEFORE the move, which C's own remove_monster macro also leaves untouched)
 * and zeroing them first would make that newsym repaint square <0,0> instead
 * of the vacated square.  So the C-faithful body, given this port's fmon-walk
 * grid model and this file's call shape, is the same true no-op js/dogmove.js
 * (:4411) and js/vault.js (:741) already carry for the identical macro.
 *
 * RE-CHECKED after worm_move (below) became real (imported from js/worm.js):
 * that does NOT reopen this no-op. js/worm.js's own grid substitute for a
 * worm's tail, `_seg_occ` (worm.js:57), is keyed ONLY by squares that have
 * already been vacated by the head and folded into the tail by a PRIOR
 * worm_move call — worm_move writes `place_worm_seg(worm, seg.wx, seg.wy)`
 * for `seg = wheads[wnum]`, the head-mirror segment left over from the
 * *previous* call, and only re-points wheads[wnum] at the (unwritten) new
 * head position without touching _seg_occ for it (worm.js:275-284). So the
 * worm's CURRENT head square — the one `remove_monster(mtmp.mx, mtmp.my)`
 * is called on here, before place_monster moves it — is never simultaneously
 * a `_seg_occ` entry: it is tracked by the fmon walk (mtmp is on fmon) until
 * the NEXT worm_move call turns it into a tail segment. So there is still no
 * write remove_monster could make into `_seg_occ` for its own call sites'
 * squares, with or without worm_move wired: verified against
 * nethack-c-v5/upstream/src/worm.c (place_worm_seg / rm.h:533's
 * `level.monsters[x][y] = m` is likewise never applied to the C head's own
 * square by worm_move — only to the segment it is retiring). RNG-free
 * either way. */
function remove_monster(x, y) {
    /* C clears the map-grid cell before the caller's old-square newsym().
     * Keep mx/my intact until place_monster() assigns the destination. */
    const mtmp = m_at(x, y);
    if (mtmp)
        mtmp._mapRemoved = true;
}
/* C ref: worm.c:189-277 worm_move(worm) — grows or shrinks a long worm's tail
 * by one segment; called only when `mtmp.wormno` is set (use_defensive /
 * use_misc / muse_unslime below all guard the call with `if (mtmp.wormno)`).
 * The real body now lives in js/worm.js (imported at the top of this file),
 * ported there rather than here because every C statement in it reads or
 * writes wheads[]/wtails[]/wgrowtime[] or calls shrink_worm()/newseg(),
 * which are module-private to js/worm.js and were not previously exported.
 * This was a true no-op stub before that export landed; the empty local
 * definition below is gone, not left as a fallback — the imported binding is
 * the only `worm_move` this file has. */
/* C obj.h:421 is_plural(o) — quan != 1L, or the Eyes of the Overworld when
 * that artifact has been discovered.  The artifact half needs
 * undiscovered_artifact(), which is not ported (js/cmd.js:7183 is a throw), so
 * this carries the same documented partial as js/cmd.js:1551 is_plural_obj and
 * js/uhitm.js:1782 _ac_is_plural.  The `return false` this replaces was wrong
 * for the quan half as well, so a stack of wielded daggers read "It is welded"
 * where C says "They are welded". */
function is_plural(obj) { return (obj?.quan | 0) !== 1; }
/* mon_adjust_speed — THE ONE BODY lives at js/trap.js (C ref: worn.c:479-556).
 * The empty no-op that used to sit here silently dropped the MUSE_WAN_SPEED_MONSTER
 * and MUSE_POT_SPEED effects in use_misc below; imported at the top of this file. */
/* newcham — THE ONE BODY lives at js/mklev.js:16244 (C ref: mon.c:5277), already
 * exported and already wired for THAT file's own chameleon/vampshift callers
 * (mklev.js:5530/9857/14491/16509, decide_to_shapeshift).  This was a true
 * no-op stub (`return 0`) here, so every MUSE_POLY_TRAP / MUSE_WAN_POLYMORPH /
 * MUSE_POT_POLYMORPH record left its rn2(10) form-selection roll,
 * mgender_from_permonst's rn2(10) and newmonhp's d(N,8) unconsumed
 * (rng_result_tape_residual, use_misc board rec#31/#32) — imported at the top
 * of this file rather than reproduced.  mklev.js's newcham() carried an early
 * `if (mtmp.cham === NON_PM) return 0;` that was CORRECT for every existing
 * caller (all arrive with cham already set to a real shapechanger index) but
 * WRONG for muse.c's callers here (an ordinary monster, cham === NON_PM,
 * polymorphing at random) — it silently no-op'd the whole cast.  Fixed in
 * mklev.js itself (the C mon.c:5292-5306 Rider/birth-limit fall-through),
 * which is provably a no-op for every pre-existing caller: none of them ever
 * entered that branch, so its contents were previously dead code. */
function pline_The(msg) { pline(msg); }
/* C trap.h:98-101 — enum trap_effect { Trap_Effect_Finished = 0,
 * Trap_Caught_Mon = 1, Trap_Killed_Mon = 2 }.  js/trap.js:163 spells the same
 * constant module-privately; this is the value, not a body, so there is no
 * duplicate-body question. */
const TRAP_KILLED_MON_MM = 2;

function the(str) { return "the " + str; }
const _TRAPNAME_HALU = [
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
const _TRAPNAME_S_ARROW_TRAP = 49; /* rm.h S_arrow_trap */
export function trapname(ttyp, override) {
    if (Hallucination() && !override) {
        const total_names = TRAPNUM + _TRAPNAME_HALU.length;
        let nameidx = rn2_on_display_rng(total_names + 1);

        if (nameidx === total_names) {
            const u = game.u;
            const fem = Upolyd(u) ? !!u.mfemale : !!game.flags.female;
            /* copynchars(roletrap, src, sizeof roletrap - sizeof " trap")
             * with roletrap[33] and " trap"[6] -> truncate src to 27 chars,
             * then Strcat(roletrap, " trap"). */
            const src = rn2(3)
                ? ((fem && game.urole?.name?.f) ? game.urole.name.f
                                                 : game.urole?.name?.m)
                : rank_of(game.urole?.mnum | 0, u.ulevel | 0, fem);
            const roletrap = String(src ?? "").slice(0, 27) + " trap";
            return roletrap.toLowerCase();
        } else if (nameidx >= TRAPNUM) {
            nameidx -= TRAPNUM;
            return _TRAPNAME_HALU[nameidx];
        } /* else use an actual trap type */
        if (nameidx !== NO_TRAP)
            ttyp = nameidx;
    }
    return DEFSYM_EXPLANATION[_TRAPNAME_S_ARROW_TRAP + (ttyp | 0) - 1] ?? 'trap';
}
function urgent_pline(msg) { return urgent_pline_disp(msg); }

const fakename = ["someone", "something"];
const HEAVY_IRON_BALL = 477;
const SILVER = 14; /* objclass.h obj_material_types SILVER (1 is LIQUID) */

/* C you.h Hallucination macro: intrinsic hallucination unless resisted. */
function Hallucination() {
    const up = game.u?.uprops;
    const h = up?.[HALLUC_MM], r = up?.[HALLUC_RES_MM];
    return !!(h?.intrinsic | 0)
        && !((r?.intrinsic | 0) || (r?.extrinsic | 0));
}

/* C ref: dungeon.c:1332-1335 dunlevs_in_dungeon(lev) —
 *   return svd.dungeons[lev->dnum].num_dunlevs;  */
function dunlevs_in_dungeon(lev) {
    return (game.dungeons?.[lev?.dnum | 0]?.num_dunlevs | 0);
}

/* C ref: dungeon.c:1914-1918 On_W_tower_level(lev) —
 *   Is_wiz1_level(lev) || Is_wiz2_level(lev) || Is_wiz3_level(lev)
 * js/dungeon_rng.js:643-650 publishes game.wiz1_level/wiz2_level/wiz3_level
 * from the sp_levchn; js/dog.js:856 already reads the same three. */
function On_W_tower_level(lev) {
    const same = (a, b) => !!(a && b && (a.dnum | 0) === (b.dnum | 0)
                              && (a.dlevel | 0) === (b.dlevel | 0));
    return same(lev, game.wiz1_level) || same(lev, game.wiz2_level)
           || same(lev, game.wiz3_level);
}

/* C ref: mkobj.c:1767-1780 unbless(otmp).  Called from use_defensive at
 * muse.c:1194 with otmp == a potion of sickness (Pestilence's "full healing"),
 * and for that object every other branch of C's body is statically false: a
 * potion is never lamplit, confers_luck() is only true for a luckstone /
 * luck-conferring artifact, and it is not a BAG_OF_HOLDING.  Written to that
 * scope rather than as a general unbless() so the omission is visible. */
function unbless_potion(otmp) {
    otmp.blessed = 0;
}

/* C ref: you.h:323 mhim(mtmp) = genders[pronoun_gender(mtmp, PRONOUN_HALLU)].him.
 * pronoun_gender/genders[] is a distinct unported subsystem (see mhe() at the
 * bottom of this file); js/mhitu.js:3414 already spells the same fallback. */
function mhim(mtmp) {
    return (mtmp?.female | 0) ? "her" : "him";
}

/* C ref: muse.c:2872 mcureblindness(mon, verbos) — "cure mon's blindness
 * (use_defensive, dog_eat, meatobj)".  RNG-free. */
function mcureblindness(mon, verbos) {
    if (!mon.mcansee) {
        mon.mcansee = 1;
        mon.mblinded = 0;
        if (verbos && haseyes(mon.data))
            pline_mon(mon, `${Monnam(mon)} can see again.`);
    }
}

/* C ref: muse.c:756-770 reveal_trap(t, seeit) — "when a monster deliberately
 * enters a trap, make sure the spot becomes accessible".  RNG-free. */
function reveal_trap(t, seeit) {
    const lev = game.level.locations[t.tx][t.ty];
    if (lev.typ === SCORR) {
        lev.typ = CORR;
        lev.flags = 0;
        unblock_point(t.tx, t.ty);
    }
    if (seeit)
        seetrap(t);
}

/* C ref: muse.c:383-418 m_tele(mtmp, vismon, oseen, how).  The rn2(3) at
 * muse.c:398 is the ONLY draw, and only for an amulet carrier or the Wizard's
 * tower level. */
async function m_tele(mtmp, vismon, oseen, how) {
    if (tele_restrict(mtmp)) {          /* mysterious force... */
        if (vismon && how)              /* mentions 'teleport' */
            makeknown(how);
        /* monster learns that teleportation isn't useful here */
        if (noteleport_level(mtmp))
            mon_learns_traps(mtmp, TELEP_TRAP);
    } else if ((mon_has_amulet(mtmp) || On_W_tower_level(game.u.uz)) && !rn2(3)) {
        if (vismon)
            pline_mon(mtmp, `${Monnam(mtmp)} seems disoriented for a moment.`);
    } else {
        /* teleport monster 'mtmp' */
        if (how) {
            /* teleportation has been triggered by an object */
            if (oseen)
                makeknown(how);
            await rloc(mtmp, RLOC_MSG);
        } else {
            /* monster is voluntarily entering a teleportation trap; use the
               trap instead of rloc() in case it sends 'victim' to a vault */
            mtmp.mx = game.trapx;
            mtmp.my = game.trapy;
            await mintrap(mtmp, FORCETRAP);
        }
    }
}

/* C ref: muse.c:779-789 mon_escape(mtmp, vismon) — a monster without the
 * Amulet that leaves up the upstairs is gone for good. */
async function mon_escape(mtmp, vismon) {
    if (mon_has_special(mtmp)
        || (mtmp.iswiz && (game.context?.no_of_wizards | 0) < 2))
        return 0;
    if (vismon)
        pline_mon(mtmp, `${Monnam(mtmp)} escapes the dungeon!`);
    await mongone(mtmp);
    return 2;
}

export async function use_defensive(mtmp) {
    let i, fleetim;
    let otmp = game.defensive;
    let vis, vismon, oseen;
    let t, stway;

    if ((i = await precheck(mtmp, otmp)) !== 0)
        return i;
    vis = cansee(mtmp.mx, mtmp.my);
    vismon = canseemon(mtmp);
    oseen = otmp && vismon;

    /* when using defensive choice to run away, we want monster to avoid
       rushing right straight back; don't override if already scared */
    fleetim = !mtmp.mflee ? (33 - Math.trunc(30 * mtmp.mhp / mtmp.mhpmax)) : 0;
    /* C muse.c:813-816 #define await m_flee(m) */
    const m_flee = async (m) => {
        if (fleetim && !m.iswiz)
            await monflee(m, fleetim, false, false);
    };

    switch (game.has_defense) {
    case MUSE_UNICORN_HORN:
        /* unlike most defensive cases, unicorn horn object is optional */
        if (vismon) {
            if (otmp)
                pline_mon(mtmp, `${Monnam(mtmp)} uses a unicorn horn!`);
            else
                pline_The(`The tip of ${mon_nam(mtmp)}'s horn glows!`);
        }
        if (!mtmp.mcansee) {
            mcureblindness(mtmp, vismon);
        } else if (mtmp.mconf || mtmp.mstun) {
            mtmp.mconf = mtmp.mstun = 0;
            if (vismon)
                pline_mon(mtmp, `${Monnam(mtmp)} seems steadier now.`);
        } else {
            impossible("No need for unicorn horn?");
        }
        return 2;
    case MUSE_BUGLE:
        /* KNOWN GAP — muse.c:838-848.  Missing dependency: awaken_soldiers()
         * (sounds.c), which has no js/ definition at all.  RNG-free either
         * way; C returns 2 here, this returns C's no-action 0. */
        return 0;
    case MUSE_WAN_TELEPORTATION_SELF:
        if (!otmp)
            throw new Error("use_defensive: no wand of teleportation");
        if ((mtmp.isshk && inhishop(mtmp)) || mtmp.isgd || mtmp.ispriest)
            return 2;
        await m_flee(mtmp);
        await mzapwand(mtmp, otmp, true);
        await m_tele(mtmp, vismon, oseen, WAN_TELEPORTATION_OTYP);
        return 2;
    case MUSE_WAN_TELEPORTATION:
    case MUSE_WAN_UNDEAD_TURNING:
        /* KNOWN GAP — muse.c:858-870 and muse.c:962-970.  Both zap the wand at
         * a target through `mbhit(mtmp, rn1(8, 6), mbhitm, bhito, otmp)`;
         * mbhit/mbhitm live in js/muse.js and are module-private there, and
         * neither draws its rn1 from this module.  Returns C's no-action 0. */
        return 0;
    case MUSE_SCR_TELEPORTATION: {
        /* C muse.c:870-914.  mreadmsg/obfree are ported above/imported.
         * random_teleport_level()/get_level() are js/cmd.js's real bodies,
         * imported above (get_level_core) — the cursed-or-confused branch
         * below was a documented KNOWN GAP claiming this arm was unreached;
         * FALSIFIED by board use_defensive rec#0/#11
         * (m_defensive_cursed=1, rng_consumed length 2/1 matching
         * random_teleport_level's own rn2(5)+rn2(range) draws exactly). */
        if (!otmp)
            throw new Error("use_defensive: no scroll of teleportation");
        const obj_is_cursed = otmp.cursed;
        if (mtmp.isshk || mtmp.isgd || mtmp.ispriest)
            return 2;
        await m_flee(mtmp);
        /* C muse.c:882-884: take otmp out of mtmp's inventory in advance so
           it survives even if mtmp lands somewhere destructive. */
        if ((otmp.quan | 0) > 1)
            otmp = (await splitobj(otmp, 1));
        await extract_from_minvent(mtmp, otmp, false, false);
        /* 'last_msg' will be changed to PLNMSG_UNKNOWN if any messages are
           issued by mreadmsg(), 'if (vismon) pline()', or m_tele(). */
        (game.iflags ||= {}).last_msg = PLNMSG_enum_MM;
        await mreadmsg(mtmp, otmp); /* sets otmp.dknown if !Blind or !Deaf */
        if (obj_is_cursed || mtmp.mconf) {
            /* C muse.c:889-905. */
            const nlev = random_teleport_level();
            if (mon_has_amulet(mtmp) || In_endgame(game.u.uz)) {
                if (vismon)
                    pline_mon(mtmp, `${Monnam(mtmp)} seems very disoriented for a moment.`);
            } else if (nlev === depth_of_level(game.u.uz)) {
                if (vismon)
                    pline_mon(mtmp, `${Monnam(mtmp)} shudders for a moment.`);
            } else {
                const flev = {};
                get_level(flev, nlev);
                await migrate_to_level(mtmp, ledger_no(flev), MIGR_RANDOM, null);
            }
        } else {
            await m_tele(mtmp, vismon, oseen, SCR_TELEPORTATION_OTYP);
        }
        /* m_tele() handles makeknown(); trycall() is a no-op once otmp.otyp
         * is already discovered or informally named. */
        if (otmp.dknown && (game.iflags?.last_msg) !== PLNMSG_enum_MM) {
            /* C do_name.c:678 trycall(obj) — "if (!oc_name_known &&
             * !oc_uname) docall(obj);".  game._oc_name_known is seeded from
             * this record's obj_discovery side-channel (the same table
             * js/read.js:1889-1892's real trycall() reads); board record #3
             * has otyp 333 ABSENT from obj_discovery, so C's real call DOES
             * enter docall() here. */
            const nameKnown = !!(game._oc_name_known && game._oc_name_known[otmp.otyp | 0]);
            const hasUname = !!(game._oc_uname && game._oc_uname[otmp.otyp | 0]);
            if (!nameKnown && !hasUname) {
                await docall(otmp);
            }
        }
        /* already removed from mtmp.minvent so not m_useup(mtmp, otmp) */
        await obfree(otmp, null);
        /* Bump bridge objs_deleted.count to match C's dealloc_obj counter —
         * the same workaround js/read.js:1971 and js/potion.js:1784 already
         * apply for their own obfree/delobj call sites (objs_deleted.count is
         * a dead-placeholder mapstate bridge slot per
         * js/hold_another_object.js:361, not derived from game.objs_deleted's
         * chain length). */
        {
            const store = game.__bridge__ || (game.__bridge__ = {});
            const key = 'objs_deleted.count';
            const cur = store[key] !== undefined ? Number(store[key]) : 0;
            store[key] = String(cur + 1);
        }
        return 2;
    }
    case MUSE_WAN_DIGGING: {
        /* C muse.c:917-971.  Was a `return 0` KNOWN GAP because maketrap() is
         * async and this function was sync; use_defensive is async now
         * (KEYSTONE B, boundary A).  maketrap() comes from js/trap.js — the
         * copy js/cmd.js already drives; js/mklev.js's second copy is the
         * level-generation one. */
        if (!otmp)
            throw new Error("use_defensive: no wand of digging");
        await m_flee(mtmp);
        await mzapwand(mtmp, otmp, false);
        if (oseen)
            makeknown(WAN_DIGGING);
        const dg_typ = game.level?.locations?.[mtmp.mx | 0]?.[mtmp.my | 0]?.typ | 0;
        /* C muse.c:923-931 */
        if (IS_FURNITURE(dg_typ)
            || IS_DRAWBRIDGE(dg_typ)
            || (is_drawbridge_wall(mtmp.mx | 0, mtmp.my | 0) >= 0)
            || stairway_at(mtmp.mx | 0, mtmp.my | 0)) {
            pline_The("The digging ray is ineffective.");
            return 2;
        }
        /* C muse.c:932-951 — the no-dig-down arm: try a PIT instead.
         *     if (!Can_dig_down(&u.uz) && !levl[mx][my].candig) { ... } */
        const dg_lev = game.level?.locations?.[mtmp.mx | 0]?.[mtmp.my | 0];
        if (!Can_dig_down(game.u.uz) && !(dg_lev && dg_lev.candig)) {
            /* "can't dig further if there's already a pit (or other trap)
               here, or if pit creation fails for some reason" */
            if (t_at(mtmp.mx | 0, mtmp.my | 0)
                || !(t = await maketrap(mtmp.mx | 0, mtmp.my | 0, PIT))) {
                if (vismon)
                    pline_The(`The ${surface(mtmp.mx | 0, mtmp.my | 0)} here is too hard to dig in.`);
                return 2;
            }
            /* pit creation succeeded */
            if (vis) {
                seetrap(t);
                pline_mon(mtmp, `${Monnam(mtmp)} has made a pit in the ${surface(mtmp.mx | 0, mtmp.my | 0)}.`);
            }
            await fill_pit(mtmp.mx | 0, mtmp.my | 0);
            recalc_block_point(mtmp.mx | 0, mtmp.my | 0);
            /* C muse.c:950 — mintrap(mtmp, FORCEBUNGLE) == Trap_Killed_Mon.
             * trap.h:98-101 enum: Trap_Effect_Finished 0, Trap_Caught_Mon 1,
             * Trap_Killed_Mon 2 (js/trap.js:163 spells the same constant). */
            return (await mintrap(mtmp, FORCEBUNGLE) === TRAP_KILLED_MON_MM) ? 1 : 2;
        }
        /* C muse.c:952-971 — the dig-through arm.  maketrap(HOLE) runs
         * hole_destination(), whose `while (dlevel < bottom) { dlevel++;
         * if (rn2(4)) break; }` loop is where this arm's recorded draws come
         * from (board records #13 and #21). */
        t = await maketrap(mtmp.mx | 0, mtmp.my | 0, HOLE);
        if (!t)
            return 2;
        recalc_block_point(mtmp.mx | 0, mtmp.my | 0);
        seetrap(t);
        if (vis) {
            pline_mon(mtmp, `${Monnam(mtmp)} has made a hole in the ${surface(mtmp.mx | 0, mtmp.my | 0)}.`);
            pline_mon(mtmp, `${Monnam(mtmp)} ${isFlyerMndx((mtmp.data?.pmidx ?? mtmp.data?.mnum) | 0) ? "dives" : "falls"} through...`);
        } else if (!mquaffmsg_Deaf()) {
            /* C muse.c:966-968 — Soundeffect() is a no-op in this tty port. */
            You_hear(`something crash through the ${surface(mtmp.mx | 0, mtmp.my | 0)}.`);
        }
        await fill_pit(mtmp.mx | 0, mtmp.my | 0);
        /* "we made sure that there is a level for mtmp to go to" */
        await migrate_to_level(mtmp, ledger_no(game.u.uz) + 1, MIGR_RANDOM, null);
        return 2;
    }
    case MUSE_WAN_CREATE_MONSTER: {
        /* C muse.c:978-995.  Was a `return 0` KNOWN GAP because makemon() is
         * async and this function was sync; use_defensive is async now
         * (KEYSTONE B, boundary A) and every await below sits exactly where C
         * evaluates the same expression, so the draw order is C's. */
        if (!otmp)
            throw new Error("use_defensive: no wand of create monster");
        /* C muse.c:982-984 — "pm: 0 => random, eel => aquatic, croc =>
         *     amphibious"
         *     struct permonst *pm = !is_pool(mtmp->mx, mtmp->my) ? 0
         *         : &mons[u.uinwater ? PM_GIANT_EEL : PM_CROCODILE];
         * NOTE C's own comment is about `pm`, but `pm` is ONLY used as
         * enexto()'s bias here — the makemon() below passes a literal 0. */
        const cm_pm = !is_pool(mtmp.mx | 0, mtmp.my | 0) ? null
            : permonstTemplate((game.u?.uinwater ? PM_GIANT_EEL : PM_CROCODILE));
        /* C muse.c:988 — `if (!enexto(&cc, mtmp->mx, mtmp->my, pm)) return 0;`
         * enexto CONSUMES RNG (collect_coords ring shuffles), and it runs
         * BEFORE mzapwand, so a failure still costs the draws. */
        const cm_cc = enexto_out(mtmp.mx | 0, mtmp.my | 0, cm_pm);
        if (!cm_cc)
            return 0;
        await mzapwand(mtmp, otmp, false);
        /* C muse.c:991 — makemon((struct permonst *) 0, cc.x, cc.y, NO_MM_FLAGS) */
        const cm_mon = await makemon(null, cm_cc.x | 0, cm_cc.y | 0, NO_MM_FLAGS);
        if (cm_mon && canspotmon(cm_mon) && oseen)
            makeknown(WAN_CREATE_MONSTER);
        return 2;
    }
    case MUSE_SCR_CREATE_MONSTER: {
        /* C muse.c:996-1035.  Same gap, same fix: makemon() is async.
         * Board records #7 (252 recorded draws) and #33 (1,700) are this arm
         * and both were reading `__return__ exp=2 got=0` with the whole tape
         * unconsumed. */
        if (!otmp)
            throw new Error("use_defensive: no scroll of create monster");
        let scm_pm = null, scm_fish = null;
        let cnt = 1;
        let known = false;

        /* C muse.c:1006-1007 — `if (!rn2(73)) cnt += rnd(4);`  The rn2(73) is
         * ALWAYS drawn; rnd(4) only on the 1-in-73. */
        if (!rn2(73))
            cnt += rnd(4);
        /* C muse.c:1008-1009 */
        if (mtmp.mconf || otmp.cursed)
            cnt += 12;
        /* C muse.c:1010-1013 */
        if (mtmp.mconf)
            scm_pm = scm_fish = permonstTemplate(PM_ACID_BLOB);
        else if (is_pool(mtmp.mx | 0, mtmp.my | 0))
            scm_fish = permonstTemplate(game.u?.uinwater ? PM_GIANT_EEL : PM_CROCODILE);
        await mreadmsg(mtmp, otmp);
        /* C muse.c:1015-1023 — `while (cnt--)`, post-decrement, so the body
         * runs `cnt` times.  "`fish' potentially gives bias towards water
         * locations; `pm' is what to actually create (0 => random)". */
        while (cnt-- > 0) {
            const cc = enexto_out(mtmp.mx | 0, mtmp.my | 0, scm_fish);
            if (!cc)
                break;
            const mon = await makemon(scm_pm, cc.x | 0, cc.y | 0, NO_MM_FLAGS);
            if (mon && canspotmon(mon))
                known = true;
        }
        /* C muse.c:1024-1031 — "The only case where we don't use oseen.  For
         * wands, you have to be able to see the monster zap the wand to know
         * what type it is.  For teleport scrolls, you have to see the monster
         * to know it teleported." */
        if (known) {
            makeknown(SCR_CREATE_MONSTER);
        } else {
            /* C do_name.c:678 trycall(obj) — "if (!oc_name_known &&
             * !oc_uname) docall(obj)".  The async port consumes the same
             * getlin-owned keystrokes as C's call prompt. */
            const nameKnown = !!(game._oc_name_known && game._oc_name_known[otmp.otyp | 0]);
            const hasUname = !!(game._oc_uname && game._oc_uname[otmp.otyp | 0]);
            if (!nameKnown && !hasUname) {
                await docall(otmp);
            }
        }
        await m_useup(mtmp, otmp);
        return 2;
    }
    case MUSE_TRAPDOOR:
        if (Is_botlevel(game.u.uz))
            return 0;
        await m_flee(mtmp);
        t = t_at(game.trapx, game.trapy);
        if (vis) {
            pline_mon(mtmp, `${Monnam(mtmp)} ${vtense(fakename[0], locomotion(mtmp.data, "jump"))} into a ${trapname(t.ttyp, false)}!`);
        }
        /* if trap was in a concealed niche, it's no longer concealed */
        reveal_trap(t, vis);

        /*  don't use rloc_to() because worm tails must "move" */
        remove_monster(mtmp.mx, mtmp.my);
        newsym(mtmp.mx, mtmp.my); /* update old location */
        place_monster(mtmp, game.trapx, game.trapy);
        if (mtmp.wormno)
            worm_move(mtmp);
        newsym(game.trapx, game.trapy);

        await migrate_to_level(mtmp, ledger_no(game.u.uz) + 1, MIGR_RANDOM, null);
        return 2;
    case MUSE_UPSTAIRS:
        await m_flee(mtmp);
        stway = stairway_at(mtmp.mx, mtmp.my);
        if (!stway)
            return 0;
        if (ledger_no(game.u.uz) === 1)
            /* impossible; level 1 upstairs are SSTAIRS */
            return await mon_escape(mtmp, vismon);
        if (Inhell() && mon_has_amulet(mtmp) && !rn2(4)
            && (dunlev(game.u.uz) < dunlevs_in_dungeon(game.u.uz) - 3)) {
            if (vismon)
                pline(`As ${mon_nam(mtmp)} climbs the stairs, a mysterious force momentarily surrounds ${mhim(mtmp)}...`);
            /* simpler than for the player; this will usually be the Wizard */
            await migrate_to_level(mtmp, ledger_no(game.u.uz) + 1, MIGR_RANDOM, null);
        } else {
            if (vismon)
                pline_mon(mtmp, `${Monnam(mtmp)} escapes upstairs!`);
            await migrate_to_level(mtmp, ledger_no(stway.tolev), MIGR_STAIRS_DOWN, null);
        }
        return 2;
    case MUSE_DOWNSTAIRS:
        await m_flee(mtmp);
        stway = stairway_at(mtmp.mx, mtmp.my);
        if (!stway)
            return 0;
        if (vismon)
            pline_mon(mtmp, `${Monnam(mtmp)} escapes downstairs!`);
        await migrate_to_level(mtmp, ledger_no(stway.tolev), MIGR_STAIRS_UP, null);
        return 2;
    case MUSE_UP_LADDER:
        await m_flee(mtmp);
        stway = stairway_at(mtmp.mx, mtmp.my);
        if (!stway)
            return 0;
        if (vismon)
            pline_mon(mtmp, `${Monnam(mtmp)} escapes up the ladder!`);
        await migrate_to_level(mtmp, ledger_no(stway.tolev), MIGR_LADDER_DOWN, null);
        return 2;
    case MUSE_DN_LADDER:
        await m_flee(mtmp);
        stway = stairway_at(mtmp.mx, mtmp.my);
        if (!stway)
            return 0;
        if (vismon)
            pline_mon(mtmp, `${Monnam(mtmp)} escapes down the ladder!`);
        await migrate_to_level(mtmp, ledger_no(stway.tolev), MIGR_LADDER_UP, null);
        return 2;
    case MUSE_SSTAIRS:
        await m_flee(mtmp);
        stway = stairway_at(mtmp.mx, mtmp.my);
        if (!stway)
            return 0;
        if (ledger_no(game.u.uz) === 1) {
            return await mon_escape(mtmp, vismon);
        }
        if (vismon)
            pline_mon(mtmp, `${Monnam(mtmp)} escapes ${stway.up ? "up" : "down"}stairs!`);
        /* going from the Valley to Castle (Stronghold) has no sstairs to
           target, but having gs.sstairs.<sx,sy> == <0,0> will work the same as
           specifying MIGR_RANDOM when mon_arrive() eventually places the
           monster, so we can use MIGR_SSTAIRS unconditionally */
        await migrate_to_level(mtmp, ledger_no(stway.tolev), MIGR_SSTAIRS, null);
        return 2;
    case MUSE_TELEPORT_TRAP:
        await m_flee(mtmp);
        t = t_at(game.trapx, game.trapy);
        if (vis) {
            pline_mon(mtmp, `${Monnam(mtmp)} ${vtense(fakename[0], locomotion(mtmp.data, "jump"))} onto a ${trapname(t.ttyp, false)}!`);
        }
        /* if trap was in a concealed niche, it's no longer concealed */
        reveal_trap(t, vis);
        /*  don't use rloc_to() because worm tails must "move" */
        remove_monster(mtmp.mx, mtmp.my);
        newsym(mtmp.mx, mtmp.my); /* update old location */
        place_monster(mtmp, game.trapx, game.trapy);
        if (mtmp.wormno)
            worm_move(mtmp);
        maybe_unhide_at(mtmp.mx, mtmp.my);
        newsym(game.trapx, game.trapy);
        /* 0: 'no object' rather than STRANGE_OBJECT; FALSE: obj not seen */
        await m_tele(mtmp, vismon, false, 0);
        return 2;
    case MUSE_POT_HEALING:
        if (!otmp)
            throw new Error("use_defensive: no potion of healing");
        mquaffmsg(mtmp, otmp);
        i = d(6 + 2 * bcsign(otmp), 4);
        healmon(mtmp, i, 1);
        if (!otmp.cursed && !mtmp.mcansee)
            mcureblindness(mtmp, vismon);
        if (vismon)
            pline_mon(mtmp, `${Monnam(mtmp)} looks better.`);
        if (oseen)
            makeknown(POT_HEALING);
        await m_useup(mtmp, otmp);
        return 2;
    case MUSE_POT_EXTRA_HEALING:
        if (!otmp)
            throw new Error("use_defensive: no potion of extra healing");
        mquaffmsg(mtmp, otmp);
        i = d(6 + 2 * bcsign(otmp), 8);
        healmon(mtmp, i, otmp.blessed ? 5 : 2);
        if (!mtmp.mcansee)
            mcureblindness(mtmp, vismon);
        if (vismon)
            pline_mon(mtmp, `${Monnam(mtmp)} looks much better.`);
        if (oseen)
            makeknown(POT_EXTRA_HEALING);
        await m_useup(mtmp, otmp);
        return 2;
    case MUSE_POT_FULL_HEALING_DEF:
        if (!otmp)
            throw new Error("use_defensive: no potion of full healing");
        mquaffmsg(mtmp, otmp);
        if ((otmp.otyp | 0) === POT_SICKNESS)
            unbless_potion(otmp); /* Pestilence */
        healmon(mtmp, mtmp.mhpmax, otmp.blessed ? 8 : 4);
        if (!mtmp.mcansee && (otmp.otyp | 0) !== POT_SICKNESS)
            mcureblindness(mtmp, vismon);
        if (vismon)
            pline_mon(mtmp, `${Monnam(mtmp)} looks completely healed.`);
        if (oseen)
            makeknown(otmp.otyp);
        await m_useup(mtmp, otmp);
        return 2;
    case MUSE_LIZARD_CORPSE:
        /* KNOWN GAP — muse.c:1204-1208 `mon_consume_unstone(mtmp, otmp, FALSE,
         * FALSE)`; mon_consume_unstone (muse.c:2701) has no js/ definition.
         * Returns C's no-action 0. */
        return 0;
    case 0:
        return 0; /* i.e. an exploded wand */
    default:
        impossible(`${Monnam(mtmp)} wanted to perform action ${game.has_defense}?`);
        break;
    }
    return 0;
}

export async function use_misc(mtmp) {
    let nambuf;
    let vis, vismon, vistrapspot, oseen;
    let i;
    let t;
    let otmp = game.misc;

    if ((i = await precheck(mtmp, otmp)) !== 0)
        return i;
    vis = cansee(mtmp.mx, mtmp.my);
    vismon = canseemon(mtmp);
    oseen = otmp && vismon;

    switch (game.has_misc) {
    case MUSE_POT_GAIN_LEVEL:
        if (!otmp)
            throw new Error("use_misc: no potion of gain level");
        mquaffmsg(mtmp, otmp);
        if (otmp.cursed) {
            if (Can_rise_up(mtmp.mx, mtmp.my, game.u.uz)) {
                let tolev = depth_of_level(game.u.uz) - 1;
                let tolevel = {};
                get_level(tolevel, tolev);
                if (on_level(tolevel, game.u.uz)) {
                    if (vismon) {
                        pline_mon(mtmp, `${Monnam(mtmp)} looks uneasy.`);
                        await trycall(otmp);
                    }
                    await m_useup(mtmp, otmp);
                    return 2;
                }
                if (vismon) {
                    pline_mon(mtmp, `${Monnam(mtmp)} rises up, through the ${ceiling(mtmp.mx, mtmp.my)}!`);
                    await trycall(otmp);
                }
                await m_useup(mtmp, otmp);
                await migrate_to_level(mtmp, ledger_no(tolevel), MIGR_RANDOM, null);
                return 2;
            } else {
                if (vismon) {
                    pline_mon(mtmp, `${Monnam(mtmp)} looks uneasy.`);
                    await trycall(otmp);
                }
                await m_useup(mtmp, otmp);
                return 2;
            }
        }
        if (vismon)
            pline_mon(mtmp, `${Monnam(mtmp)} seems more experienced.`);
        if (oseen)
            makeknown(POT_GAIN_LEVEL_OTYP);
        await m_useup(mtmp, otmp);
        if (!await grow_up(mtmp, null))
            return 1;
        return 2;

    case MUSE_WAN_MAKE_INVISIBLE:
    case MUSE_POT_INVISIBILITY:
        if (!otmp)
            throw new Error("use_misc: no potion of invisibility");
        if (otmp.otyp === WAN_MAKE_INVISIBLE_OTYP) {
            await mzapwand(mtmp, otmp, true);
        } else {
            mquaffmsg(mtmp, otmp);
        }
        nambuf = mon_nam(mtmp);
        mon_set_minvis(mtmp, !otmp.cursed ? false : true);
        if (vismon && mtmp.minvis) {
            if (canspotmon(mtmp)) {
                pline(`${upstart(s_suffix(nambuf))} body takes on a ${Hallucination() ? "normal" : "strange"} transparency.`);
            } else {
                pline(`Suddenly you cannot see ${nambuf}.`);
                if (vis)
                    map_invisible(mtmp.mx, mtmp.my);
            }
            if (oseen)
                makeknown(otmp.otyp);
        } else if (vismon && !mtmp.minvis) {
            pline(`${Monnam(mtmp)} briefly seems to be transparent.`);
        } else if (!vismon && canseemon(mtmp)) {
            pline(`${Monnam(mtmp)} suddenly appears!`);
        }
        if (otmp.otyp === POT_INVISIBILITY_OTYP) {
            if (otmp.cursed)
                await you_aggravate(mtmp);
            await m_useup(mtmp, otmp);
        }
        return 2;

    case MUSE_WAN_SPEED_MONSTER:
        if (!otmp)
            throw new Error("use_misc: no wand of speed monster");
        await mzapwand(mtmp, otmp, true);
        mon_adjust_speed(mtmp, 1, otmp);
        return 2;

    case MUSE_POT_SPEED:
        if (!otmp)
            throw new Error("use_misc: no potion of speed");
        mquaffmsg(mtmp, otmp);
        mon_adjust_speed(mtmp, 1, otmp);
        await m_useup(mtmp, otmp);
        return 2;

    case MUSE_WAN_POLYMORPH:
        if (!otmp)
            throw new Error("use_misc: no wand of polymorph");
        await mzapwand(mtmp, otmp, true);
        await newcham(mtmp, muse_newcham_mon(mtmp), NC_VIA_WAND_OR_SPELL | NC_SHOW_MSG);
        if (oseen)
            makeknown(WAN_POLYMORPH_OTYP);
        return 2;

    case MUSE_POT_POLYMORPH:
        if (!otmp)
            throw new Error("use_misc: no potion of polymorph");
        mquaffmsg(mtmp, otmp);
        await m_useup(mtmp, otmp);
        if (vismon)
            pline_mon(mtmp, `${Monnam(mtmp)} suddenly mutates!`);
        await newcham(mtmp, muse_newcham_mon(mtmp), NC_SHOW_MSG);
        if (oseen)
            makeknown(POT_POLYMORPH_OTYP);
        return 2;

    case MUSE_POLY_TRAP:
        t = t_at(game.trapx, game.trapy);
        if (!t)
            return 0;
        vistrapspot = cansee(t.tx, t.ty);
        if (vis || vistrapspot)
            seetrap(t);
        if (vismon || vistrapspot) {
            pline_mon(mtmp, `${Some_Monnam(mtmp)} deliberately ${vtense(fakename[0], locomotion(mtmp.data, "jump"))} onto a ${t.tseen ? trapname(t.ttyp, false) : "hidden trap"}!`);
        }
        remove_monster(mtmp.mx, mtmp.my);
        newsym(mtmp.mx, mtmp.my);
        place_monster(mtmp, game.trapx, game.trapy);
        maybe_unhide_at(game.trapx, game.trapy);
        if (mtmp.wormno)
            worm_move(mtmp);
        newsym(game.trapx, game.trapy);
        await newcham(mtmp, null, NC_SHOW_MSG);
        return 2;

    case MUSE_BAG:
        if (!otmp)
            throw new Error("use_misc: no container");
        return await mloot_container(mtmp, otmp, vismon);

    case MUSE_BULLWHIP:
        {
            const The_whip = vismon ? "The bullwhip" : "A whip";
            let where_to = rn2(4);
            let obj = game.u.uwep;
            let hand;
            let the_weapon, hand_buf;

            if (!obj || !canletgo(obj, "")
                || (game.u.twoweap && canletgo(game.u.uswapwep, "") && rn2(2)))
                obj = game.u.uswapwep;
            if (!obj)
                break;

            the_weapon = the(xname(obj));
            hand = body_part(HAND);
            if (bimanual(obj))
                hand = makeplural(hand);
            hand_buf = hand;

            if (vismon)
                pline_mon(mtmp, `${Monnam(mtmp)} flicks a bullwhip towards your ${hand_buf}!`);
            if (obj.otyp === HEAVY_IRON_BALL) {
                pline(`${The_whip} fails to wrap around ${the_weapon}.`);
                return 1;
            }
            await urgent_pline(`${The_whip} wraps around ${the_weapon} you're wielding!`);
            if (welded(obj)) {
                pline(`${!is_plural(obj) ? "It is" : "They are"} welded to your ${hand_buf}${!obj.bknown ? '!' : '.'}`);
                where_to = 0;
            }
            if (!where_to) {
                pline_The(`whip slips free.`);
                return 1;
            } else if (where_to === 3 && mon_hates_silver(mtmp)
                       && (MKOBJ_OC_MATERIAL[obj.otyp | 0] | 0) === SILVER) {
                where_to = 2;
            }
            await remove_worn_item(obj, false);
            freeinv(obj);
            switch (where_to) {
            case 1:
                pline_mon(mtmp, `${Monnam(mtmp)} yanks ${the_weapon} from your ${hand_buf}!`);
                place_object(obj, mtmp.mx, mtmp.my);
                break;
            case 2:
                pline_mon(mtmp, `${Monnam(mtmp)} yanks ${the_weapon} to the ${surface(game.u.ux, game.u.uy)}!`);
                await dropy(obj);
                break;
            case 3:
                pline_mon(mtmp, `${Monnam(mtmp)} snatches ${the_weapon}!`);
                await mpickobj(mtmp, obj);
                break;
            }
            return 1;
        }

    case 0:
        return 0;

    default:
        impossible(`${Monnam(mtmp)} wanted to perform action ${game.has_misc}?`);
        break;
    }
    return 0;
}

export function canletgo(obj, word) {
    const u = game.u || {};
    const w = String(word ?? '');
    if (!obj)
        return true;
    if ((obj.owornmask | 0) & (W_ARMOR | W_ACCESSORY)) {
        if (w)
            void Norep(`You cannot ${w} something you are wearing.`);
        return false;
    }
    if (obj === u.uwep && welded(u.uwep)) {
        /* no weldmsg(), so uwep->bknown might become set silently if word is "" */
        if (w) {
            const hand = body_part(HAND);
            void Norep(`You cannot ${w} something welded to your ${hand}.`);
        }
        return false;
    }
    if ((obj.otyp | 0) === LOADSTONE_OTYP && (obj.cursed | 0)) {
        /* getobj() kludge sets corpsenm to the user's specified count when it
           refuses to split a stack of cursed loadstones */
        if (w) {
            if (w === 'throw' && (obj.quan | 0) > 1)
                obj.corpsenm = 1;
            void pline(`For some reason, you cannot ${w}`
                       + `${obj.corpsenm ? ' any of' : ''} the stone`
                       + `${(obj.quan | 0) > 1 ? 's' : ''}!`);
        }
        obj.corpsenm = 0; /* reset */
        set_bknown(obj, 1);
        return false;
    }
    if ((obj.otyp | 0) === LEASH_OTYP && (obj.leashmon | 0) !== 0) {
        if (w)
            void pline(`The leash is tied around your ${body_part(HAND)}.`);
        return false;
    }
    if ((obj.owornmask | 0) & W_SADDLE) {
        if (w)
            void pline(`You cannot ${w} something you are sitting on.`);
        return false;
    }
    return true;
}
/* objects.h otyps: LOADSTONE and LEASH (js/oc_name_data.js rows 471 and 236). */
const LOADSTONE_OTYP = 471, LEASH_OTYP = 236;

/* C mondata.c:53-57
 *   boolean attacktype(struct permonst *ptr, int atyp)
 *   { return attacktype_fordmg(ptr, atyp, AD_ANY) ? TRUE : FALSE; } */
export function attacktype(ptr, atyp) {
    return attacktype_fordmg(ptr, atyp, AD_ANY) ? true : false;
}
export function hero_behind_chokepoint(mtmp) {
    const N_DIRS_MM = 8; /* C hack.h:655 N_DIRS = N_DIRS_Z - 2 */
    const DIR_CLAMP_MM = (dir) => ((dir + N_DIRS_MM) % N_DIRS_MM);
    const sgn_mm = (n) => (n > 0) ? 1 : (n < 0) ? -1 : 0;
    const dx = sgn_mm((mtmp.mx | 0) - (mtmp.mux | 0));
    const dy = sgn_mm((mtmp.my | 0) - (mtmp.muy | 0));

    const x = (mtmp.mux | 0) + dx;
    const y = (mtmp.muy | 0) + dy;

    const dir = xytodir(dx, dy);
    const dir_l = DIR_CLAMP_MM((dir + 6) % N_DIRS_MM); /* DIR_LEFT2 */
    const dir_r = DIR_CLAMP_MM((dir + 2) % N_DIRS_MM); /* DIR_RIGHT2 */

    const c1 = { x: 0, y: 0 }, c2 = { x: 0, y: 0 };
    dirtocoord(c1, dir_l);
    dirtocoord(c2, dir_r);
    c1.x += x; c2.x += x;
    c1.y += y; c2.y += y;

    if ((!isok(c1.x, c1.y) || !accessible(c1.x, c1.y))
        && (!isok(c2.x, c2.y) || !accessible(c2.x, c2.y)))
        return true;
    return false;
}
export function lined_up(mtmp) {
    return m_lined_up(game.youmonst, mtmp) ? true : false;
}
/* C ref: muse.c:1299-1360 m_use_undead_turning(mtmp, obj) — consider zapping a
 * wand of undead turning at the corpses the hero is carrying.  C's first
 * statement after the coordinate setup is an unconditional early return for
 * any object that is not a charged WAN_UNDEAD_TURNING, and it draws no RNG on
 * that path; find_offensive() calls this for EVERY object in the monster's
 * inventory, so the guard is on the hot path for every offensive scan.  The
 * body proper (carrying(CORPSE) / linedup_chk_corpse / m_seenres) is not
 * ported and throws rather than silently declining to use the wand. */
export function m_use_undead_turning(mtmp, obj) {
    if (!(obj && (obj.otyp | 0) === WAN_UNDEAD_TURNING && (obj.spe | 0) > 0))
        return;
    /* KNOWN GAP — muse.c:1313-1359, the body proper: C decides whether the
     * hero is carrying corpses worth turning (carrying(CORPSE)), whether a
     * wielded cockatrice corpse makes this a defensive item instead, and
     * whether any corpse lies on the line to the hero
     * (linedup_chk_corpse), and only then sets gm.m.offensive /
     * gm.m.has_offense = MUSE_WAN_UNDEAD_TURNING.  Missing dependencies:
     * carrying (invent.c), linedup_chk_corpse and m_carrying_corpse (muse.c).
     * Declining to select the wand is C's own outcome whenever those tests
     * fail, and it is a void function, so returning is C-shaped.  Not thrown:
     * a throw discards the replay's entire matched RNG prefix. */
}
/* C ref: muse.c:1369-1391 mon_has_friends(mtmp) — "hostile monster has another
 * hostile next to it".  RNG-free.  m_at() here is the fmon walk (this file's
 * monster_at, C's m_at over svl.level.monsters). */
export function mon_has_friends(mtmp) {
    if ((mtmp.mtame | 0) || (mtmp.mpeaceful | 0))
        return false;

    for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++) {
            const x = (mtmp.mx | 0) + dx;
            const y = (mtmp.my | 0) + dy;
            let mon2;
            if (isok(x, y) && (mon2 = monster_at(x, y)) != null
                && mon2 !== mtmp
                && !(mon2.mtame | 0) && !(mon2.mpeaceful | 0))
                return true;
        }
    return false;
}
/* C ref: muse.c:1393-1415 mon_likes_objpile_at(mtmp, x, y) — does the monster
 * want any of the top 3 stacks lying at (x,y), or is the pile deeper than 3
 * stacks?  RNG-free.  mon_would_take_item is js/monmove.js's port of
 * monmove.c:1367. */
export function mon_likes_objpile_at(mtmp, x, y) {
    if (!isok(x, y))
        return false;
    let otmp = game.level?.levelObjects?.[x]?.[y] ?? null;
    if (!otmp) /* C OBJ_AT(x,y) */
        return false;

    /* monster likes any of the top 3 items in the pile? */
    let i = 0;
    for (; otmp && i < 3; i++) {
        if (mon_would_take_item(mtmp, otmp))
            return true;
        otmp = otmp.nexthere ?? null;
    }

    /* pile is larger than 3 stacks? */
    if (i >= 3)
        return true;

    return false;
}
export function onscary(x, y, mtmp) {
    const auditory_scare = (x === 0 && y === 0);
    const magical_scare = !auditory_scare;
    const mdat = mtmp.data || permonstTemplate((mtmp.mnum ?? mtmp.mndx ?? 0) | 0);
    const mndx = (mtmp.mnum ?? mtmp.mndx ?? 0) | 0;

    /* creatures who are directly resistant to any type of scaring:
       Rodney, lawful minions, Angels, the Riders */
    if ((mtmp.iswiz | 0) || _onscary_is_lminion(mtmp, mdat) || mndx === PM_ANGEL
        || isRiderMndx(mndx))
        return false;

    /* creatures who are directly resistant to magical scaring based on the
       mere presence of something at a location: humans etc.  uniques have
       ascended their base monster instincts */
    if (magical_scare
        && ((mdat.mlet | 0) === S_HUMAN_MLET || _onscary_unique_corpstat(mdat)))
        return false;

    /* creatures who resist scaring under particular circumstances:
       shopkeepers inside their own shop, priests inside their own temple */
    if (((mtmp.isshk | 0) && inhishop(mtmp))
        || ((mtmp.ispriest | 0) && inhistemple(mtmp)))
        return false;

    if (auditory_scare)
        return true;

    /* should this still be true for defiled/molochian altars? */
    const loc = game.level?.at ? game.level.at(x, y) : null;
    if (loc && IS_ALTAR(loc.typ | 0)
        && ((mdat.mlet | 0) === S_VAMPIRE || isVampshifter(mtmp)))
        return true;

    /* the scare monster scroll doesn't have any of the below restrictions,
       being its own source of power */
    if (sobj_at(SCR_SCARE_MONSTER_OTYP, x, y))
        return true;

    /*
     * Creatures who don't (or can't) fear a written Elbereth: all the above
     * plus shopkeepers (even if poly'd into non-human), vault guards (also
     * even if poly'd), blind or peaceful monsters, humans and elves, and
     * minotaurs.
     *
     * If the player isn't actually on the square OR the player's image isn't
     * displaced to the square, no protection is being granted.
     *
     * Elbereth doesn't work in Gehennom, the Elemental Planes, or the Astral
     * Plane; the influence of the Valar only reaches so far.
     */
    const ep = _onscary_sengr_at('Elbereth', x, y, true);
    return !!(ep
        && (u_at(x, y)
            || (_onscary_Displaced() && mtmp.mux === x && mtmp.muy === y)
            || (ep.guardobjects && _onscary_vobj_at(x, y)))
        && !((mtmp.isshk | 0) || (mtmp.isgd | 0) || !(mtmp.mcansee | 0)
             || (mtmp.mpeaceful | 0)
             || mndx === PM_MINOTAUR
             || Inhell() || In_endgame(game.u?.uz)));
}
/* C monst.h:281 is_lminion(mon) — is_minion(mon->data) && mon_aligntyp(mon)
 * == A_LAWFUL.  mon_aligntyp lives in js/priest.js and importing it here
 * would close a makemon<->priest module cycle (priest.js already imports
 * newmextra/set_malign/which_armor from this file), so the three-line body of
 * priest.c's mon_aligntyp is reproduced, exactly as js/mcastu.js:725-732
 * already reproduces this same pair. */
const M2_MINION_OS = 0x00001000;   /* monflag.h M2_MINION */
const A_NONE_OS = -128, A_CHAOTIC_OS = -1, A_NEUTRAL_OS = 0, A_LAWFUL_OS = 1;
function _onscary_mon_aligntyp(mon, mdat) {
    const algn = (mon.ispriest && mon.mextra?.epri) ? mon.mextra.epri.shralign
               : (mon.isminion && mon.mextra?.emin) ? mon.mextra.emin.min_align
                                                    : ((mdat || mon.data)?.maligntyp | 0);
    if (algn === A_NONE_OS)
        return A_NONE_OS;
    return (algn > 0) ? A_LAWFUL_OS : (algn < 0) ? A_CHAOTIC_OS : A_NEUTRAL_OS;
}
function _onscary_is_lminion(mon, mdat) {
    /* C monst.h:281 is_lminion(mon) reads mon->data, which is ALWAYS set in C.
     * A live js/ monst has only .mnum/.mndx (js/mklev.js mfndpos:15127 carries
     * the same note), so reading mon.data alone answered "not a minion" for
     * every live monster.  Take the caller's materialized mdat. */
    const d = mdat || mon.data;
    return !!(d && ((d.mflags2 | 0) & M2_MINION_OS) !== 0
              && _onscary_mon_aligntyp(mon, d) === A_LAWFUL_OS);
}
/* C mondata.h:174 unique_corpstat(ptr) — (ptr->geno & G_UNIQ) != 0. */
function _onscary_unique_corpstat(ptr) { return (((ptr?.geno) | 0) & G_UNIQ) !== 0; }
/* C objects.h SCR_SCARE_MONSTER otyp (js/mkobj.js:20 and js/teleport.js:825
 * carry the same literal). */
const SCR_SCARE_MONSTER_OTYP = 326;
/* C engrave.c:1520-1531 sengr_at(s, x, y, strict) — engr_at() plus the
 * HEADSTONE / engr_time / text tests.  Returns the engraving (truthy) or null.
 *
 * The live store (js/mklev.js make_engr_at, :4817) keeps only
 * `{ text, engr_type }`, so engr_time reads 0 — always <= svm.moves, which is
 * C's behaviour for any engraving already finished; and `guardobjects` is
 * absent, i.e. 0, C's default for everything except a des.engraving() that
 * asked for it.  Neither is guessed at: both take C's value for the records
 * this store actually holds. */
function _onscary_sengr_at(s, x, y, strict) {
    const ep = engr_at(x, y);
    if (ep && (ep.engr_type | 0) !== HEADSTONE_ENGR
        && (ep.engr_time | 0) <= (game.moves | 0)) {
        /* C engr_txt[actual_text]; this store spells it `text`. */
        const txt = String(ep.text ?? '');
        if (strict ? txt.toLowerCase() === String(s).toLowerCase()
                   : txt.indexOf(s) >= 0)
            return ep;
    }
    return null;
}
const HEADSTONE_ENGR = 6;   /* C engrave.h:31 #define HEADSTONE 6 */
/* C youprop.h:204 Displaced — (HDisplaced || EDisplaced), i.e. the DISPLACED
 * property, read the same way every other uprops consumer in js/ reads one. */
function _onscary_Displaced() {
    const p = game.u?.uprops?.[DISPLACED];
    return !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0)));
}
/* C hack.c vobj_at(x, y) — the topmost object of the pile at (x,y). */
function _onscary_vobj_at(x, y) {
    const col = game.level?.levelObjects?.[x];
    return col ? (col[y] ?? null) : null;
}
/* C worn.c:997-1029
 *   struct obj *which_armor(struct monst *mon, long flag)
 *   { if (mon == &gy.youmonst) { switch (flag) { case W_ARM: return uarm; ...
 *       default: impossible("bad flag in which_armor"); return 0; } }
 *     else { for (obj = mon->minvent; obj; obj = obj->nobj)
 *                if (obj->owornmask & flag) return obj;
 *            return (struct obj *) 0; } } */
export function which_armor(mon, flag) {
    if (mon === game.youmonst) {
        switch (flag) {
        case W_ARM:  return game.u.uarm;
        case W_ARMC: return game.u.uarmc;
        case W_ARMH: return game.u.uarmh;
        case W_ARMS: return game.u.uarms;
        case W_ARMG: return game.u.uarmg;
        case W_ARMF: return game.u.uarmf;
        case W_ARMU: return game.u.uarmu;
        default:
            impossible("bad flag in which_armor");
            return 0;
        }
    } else {
        for (let obj = mon.minvent; obj; obj = obj.nobj)
            if (obj.owornmask & flag)
                return obj;
        return null;
    }
}

/* Ported helpers not yet available in makemon.js — local stubs */
function in_your_sanctuary(mtmp, x, y) {
    /* C priest.c: in_your_sanctuary — checks if monster is in hero's sanctuary.
     * True if the monster is on a sanctuary spot (temple altar) and the hero
     * is also protected by that sanctuary (coaligned or peaceful). */
    return false; /* TODO: full port */
}
/* can_blow was a file-local throw-stub here, shadowing the real port at
 * js/mhitm.js:1755 (C mondata.c:566-576), already imported by monmove.js and
 * music.js from that module. Imported above instead of re-derived. */
/* C monflag.h mflags2/mflags3 bits for noteleport_level (is_demon/M2_DEMON
 * already defined above). M3_COVETOUS is a multi-bit mask (0x001f). */
const M2_LORD = 0x00000400;
const M2_PRINCE = 0x00000800;
const M3_COVETOUS = 0x001f;

/** C mondata.h is_lord — lord to its kind */
function is_lord(ptr) { return (ptr.mflags2 & M2_LORD) !== 0; }
/** C mondata.h is_prince — overlord to its kind */
function is_prince(ptr) { return (ptr.mflags2 & M2_PRINCE) !== 0; }
/** C mondata.h:138 is_ndemon — an ordinary demon (neither lord nor prince). */
export function is_ndemon(ptr) {
    return is_demon(ptr) && (ptr.mflags2 & (M2_LORD | M2_PRINCE)) === 0;
}
/** C mondata.h is_dlord — demon lord: is_demon && is_lord */
function is_dlord(ptr) { return is_demon(ptr) && is_lord(ptr); }
/** C mondata.h is_dprince — demon prince: is_demon && is_prince */
export function is_dprince(ptr) { return is_demon(ptr) && is_prince(ptr); }
/** C mondata.h is_covetous — wants something (M3_COVETOUS mask) */
function is_covetous(ptr) { return (ptr.mflags3 & M3_COVETOUS) !== 0; }

/** C teleport.c m_blocks_teleporting — does this monster block others' teleport? */
function m_blocks_teleporting(mtmp) {
    if (is_dlord(mtmp.data) || is_dprince(mtmp.data))
        return true;
    return false;
}

/** C mon.c:4534 get_iter_mons — iterate fmon, return first monster for which
 * bfunc is TRUE (else null). Skips DEADMONSTER (mhp < 1). The reconstructed
 * fmon cells carry mnum (the permonst index); materialize mtmp.data via
 * permonstTemplate(mnum) — the C mtmp->data pointer into mons[mndx]. */
function get_iter_mons(bfunc) {
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.mhp < 1)               /* DEADMONSTER */
            continue;
        if (mtmp.data === undefined)
            mtmp.data = permonstTemplate(mtmp.mnum);
        if (bfunc(mtmp))
            return mtmp;
    }
    return null;
}

/** C teleport.c noteleport_level — is teleporting prevented on this level for this monster? */
export function noteleport_level(mon) {
    /* demon court in Gehennom prevent others from teleporting */
    if (Inhell() && !(is_dlord(mon.data) || is_dprince(mon.data))) {
        if (get_iter_mons(m_blocks_teleporting))
            return true;
    }

    /* natural no-teleport level; covetous monsters can bypass these */
    if (game.level.flags.noteleport && !is_covetous(mon.data))
        return true;

    /* wand of stasis prevents teleportation while the effect is active
       (even for covetous monsters) */
    if (game.level.flags.stasis_until >= game.moves)
        return true;

    return false;
}
export function mon_knows_traps(mtmp, ttyp) {
    if (ttyp === -1)        /* ALL_TRAPS */
        return !!(mtmp.mtrapseen);
    else if (ttyp === 0)    /* NO_TRAP */
        return !(mtmp.mtrapseen);
    else
        return (mtmp.mtrapseen & (1 << (ttyp - 1))) !== 0;
}
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
 * linked list built by js/mklev.js stairway_add (same node shape js/cmd.js's
 * private stairway_at already walks).  Returns the node or null. */
export function stairway_at(x, y) {
    let tmp = game.stairs;
    while (tmp && !(tmp.sx === x && tmp.sy === y))
        tmp = tmp.next;
    return tmp ?? null;
}
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
function dist2(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    return dx * dx + dy * dy;
}

/* C polyself.c:1956-2046 mbodypart(struct monst *mon, int part) is fully
 * ported and exported by js/cmd.js.  This file carried an EXPORTED throwing
 * stub of the same name, which shadowed it for stealgold()'s steed arm
 * (steal.c:78-81, makeplural(mbodypart(u.usteed, FOOT))) AND was what
 * js/read.js imported by name for litroom()'s engulfed arm.  Imported from
 * ./cmd.js above, alongside body_part from the same module. */
async function monflee_release_hero(mon) {
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
        /* C: expels(mon, mon->data, TRUE) — js/dog.js:610 no-op stub. */
    } else if (!sticks(game.youmonst ? game.youmonst.data : null)) {
        await unstuck(mon); /* js/dog.js:651 no-op stub; see RNG note above */
        pline('You get released!');
    }
}

function monflee_flees_light(mon) {
    if (!mon || (mon.data ? (mon.data.pmidx | 0) : (mon.mnum | 0)) !== PM_GREMLIN)
        return false;
    const u = game.u || {};
    const uwep = u.uwep || null, uarm = u.uarm || null;
    if (!((uwep && uwep.lamplit && artifact_light(uwep))
          || (uarm && uarm.lamplit && artifact_light(uarm))))
        return false;
    return !!mon.mcansee && !!couldsee(mon.mx | 0, mon.my | 0);
}

function monflee_unaware() {
    const u = game.u || {};
    return (game.multi | 0) < 0 && ((u.uhs | 0) === FAINTED);
}

export async function monflee(mtmp, fleetime, first, fleemsg) {
    if (!mtmp)
        return;
    /* C monmove.c:469-471: if (DEADMONSTER(mtmp)) return;
     * DEADMONSTER(mon) is (mon)->mhp < 1 (mondata.h). */
    if ((mtmp.mhp | 0) < 1)
        return;

    /* C monmove.c:473-474 */
    await monflee_release_hero(mtmp);

    /* C monmove.c:476 */
    if (!first || !mtmp.mflee) {
        let ft = fleetime | 0;
        /* C monmove.c:477-486 — "don't lose untimed scare" */
        if (!ft) {
            mtmp.mfleetim = 0;
        } else if (!mtmp.mflee || mtmp.mfleetim) {
            ft += (mtmp.mfleetim | 0);
            if (ft === 1)
                ft++;
            mtmp.mfleetim = Math.min(ft, 127) >>> 0;
        }

        /* C monmove.c:487-489 */
        const apt = (mtmp.m_ap_type | 0) & M_AP_TYPMASK; /* M_AP_TYPE(mtmp) */
        if (!mtmp.mflee && fleemsg && canseemon(mtmp)
            && apt !== M_AP_FURNITURE && apt !== M_AP_OBJECT) {
            /* C monmove.c:490-519.  "unfortunately we can't distinguish between
             * temporary sleep and temporary paralysis, so both conditions
             * receive the same alternate message" */
            const mmove = mtmp.data ? (mtmp.data.mmove | 0) : 0;
            if (!mtmp.mcanmove || !mmove) {
                /* C monmove.c:494-495 */
                pline_mon(mtmp, `${Adjmonnam(mtmp, 'immobile')} seems to flinch.`);
            } else if (monflee_flees_light(mtmp)) {
                /* C monmove.c:496-516 — a conscious, non-Deaf hero gets a
                 * 1-in-10 shouted warning; all other cases describe the
                 * painful light.  The rn2(10) was previously omitted. */
                const deaf = mquaffmsg_Deaf();
                if (monflee_unaware() || deaf || rn2(10)) {
                    const uwep = game.u?.uwep;
                    const uarm = game.u?.uarm;
                    const source = uwep && artifact_light(uwep)
                        ? bare_artifactname(uwep)
                        : uarm && artifact_light(uarm)
                            ? xname(uarm) : '[its imagination?]';
                    pline_mon(mtmp, `${Monnam(mtmp)} flees from the painful light of ${source}.`);
                } else {
                    pline_mon(mtmp, 'Bright light!');
                }
            } else {
                pline_mon(mtmp, `${Monnam(mtmp)} turns to flee.`);
            }
        }

        /* C monmove.c:524-527 */
        if (mtmp.data && (mtmp.data.pmidx | 0) === PM_VROCK && !mtmp.mspec_used) {
            mtmp.mspec_used = 75 + rn2(25);
            create_gas_cloud(mtmp.mx | 0, mtmp.my | 0, 5, 8);
        }

        /* C monmove.c:529 */
        mtmp.mflee = 1;
    }
    /* C monmove.c:531-532: ignore recently-stepped spaces when made to flee */
    mon_track_clear(mtmp);
}
import { somegold } from './steal.js';
import { ENV } from './hostenv.js';
export { somegold };
function _splitobj_panic(msg) { throw new Error(`panic: ${msg}`); }

// C ref: mkobj.c:536-552 nextoid(oldobj, newobj) — pick an o_id for the split
// stack that preserves any shop price adjustment, then advance context.ident
// (rnd(2), via next_ident) for the next allocation.
// EXPORTED because js/cmd.js's hand-inlined dothrow.c:257 split arm needs the
// SAME body: it used to model nextoid as a bare `context.ident += rnd(2)`,
// which silently drops the price-adjustment search loop (see the commit that
// exported this).  One body, not two.
export function nextoid(oldobj, newobj) {
    const g = game;
    if (g.context == null)
        g.context = {};
    let oid = ((g.context.ident | 0) - 1) >>> 0;
    const olddif = oid_price_adjustment(oldobj, oldobj.o_id | 0);
    let trylimit = 256, newdif;
    do {
        oid = (oid + 1) >>> 0;
        if (!oid)
            oid = (oid + 1) >>> 0;
        newdif = oid_price_adjustment(newobj, oid);
        trylimit--;
    } while (newdif !== olddif && trylimit >= 0);
    g.context.ident = oid;
    void next_ident();
    return oid;
}

// C ref: light.c:761-766 obj_sheds_light(obj) → obj_is_burning(obj) =
// obj->lamplit && (ignitable(obj) || artifact_light(obj)).
// The truthy-lamplit branch used to throw on the grounds that ignitable/
// artifact_light "aren't ported"; artifact_light IS ported now (js/light.js,
// landed with begin_burn), and ignitable is obj.h's otyp macro, so the whole
// predicate is answerable.  otyps from js/oc_name_data.js OC_NAME:
// 224 tallow candle, 225 wax candle, 226 brass lantern, 227 oil lamp,
// 228 magic lamp, 262 Candelabrum of Invocation, 321 oil (POT_OIL).
const _SL_TALLOW_CANDLE = 224, _SL_WAX_CANDLE = 225, _SL_BRASS_LANTERN = 226,
      _SL_OIL_LAMP = 227, _SL_MAGIC_LAMP = 228, _SL_CANDELABRUM = 262,
      _SL_POT_OIL = 321;
/* C obj.h:429-433 ignitable(otmp). */
function _splitobj_ignitable(obj) {
    const t = obj.otyp | 0;
    return t === _SL_BRASS_LANTERN || t === _SL_OIL_LAMP
        || (t === _SL_MAGIC_LAMP && (obj.spe | 0) > 0)
        || t === _SL_CANDELABRUM || t === _SL_TALLOW_CANDLE
        || t === _SL_WAX_CANDLE || t === _SL_POT_OIL;
}
function _splitobj_shedsLight(obj) {
    if (!obj.lamplit)
        return false;
    return _splitobj_ignitable(obj) || artifact_light(obj);
}

// game.fobj/game.invent (same o_id, different JS instance), so match chain
// nodes by o_id as a fallback to reference equality — same convention as
// js/mklev.js remove_object's extract_nobj matched-node splice.
function _splitobj_linkRealChain(obj, otmp) {
    const where = obj.where | 0;
    let head = null;
    if (where === OBJ_FLOOR)
        head = game.fobj;
    else if (where === OBJ_INVENT)
        head = game.invent;
    else
        return;
    for (let o = head; o; o = o.nobj) {
        if (o === obj)
            return;
        if (o.o_id === obj.o_id) {
            otmp.nobj = o.nobj;
            o.nobj = otmp;
            return;
        }
    }
}

// C ref: mkobj.c:458-503 splitobj(obj, num) — split `num` off obj into a
// fresh object inserted just after it in whatever chain obj is on.
export async function splitobj(obj, num) {
    if (obj.cobj || num <= 0 || obj.quan <= num)
        _splitobj_panic(`splitobj [cobj=${obj.cobj ? 'non-empty container' : '(null)'} num=${num} quan=${obj.quan}]`);

    const otmp = newobj(obj);
    otmp.oextra = null;
    otmp.o_id = nextoid(obj, otmp);
    otmp.timed = 0;
    otmp.lamplit = 0;
    otmp.owornmask = 0;
    obj.quan = obj.quan - num;
    obj.owt = weight(obj);
    otmp.quan = num;
    otmp.owt = weight(otmp);
    otmp.lua_ref_cnt = 0;
    otmp.pickup_prev = 0;

    game.context = game.context || {};
    game.context.objsplit = { parent_oid: obj.o_id, child_oid: otmp.o_id };
    obj.nobj = otmp;
    _splitobj_linkRealChain(obj, otmp);
    if ((obj.where | 0) === OBJ_FLOOR)
        obj.nexthere = otmp;
    /* lua isn't tracking the split off portion even if it happens to be
     * tracking the original */
    if ((otmp.where | 0) === OBJ_LUAFREE)
        otmp.where = OBJ_FREE;
    if (obj.unpaid)
        await splitbill(obj, otmp);
    if (obj.timed)
        obj_split_timers(obj, otmp);
    if (_splitobj_shedsLight(obj))
        obj_split_light_source(obj, otmp);
    return otmp;
}

/* C mkobj.c:556-622 unsplitobj().  Locate the two stacks named by the most
 * recent split context and merge them through invent.c's canonical merged().
 * The dynamic import avoids makemon <-> hold_another_object initialization
 * recursion; callers await this only on a rejected menu transfer. */
export async function unsplitobj(obj) {
    const split = game.context?.objsplit;
    if (!obj || !split) return null;

    let list = null;
    switch (obj.where | 0) {
    case OBJ_INVENT:
        list = game.invent;
        break;
    case OBJ_MINVENT:
        list = obj.ocarry?.minvent || null;
        break;
    case OBJ_CONTAINED:
        list = obj.ocontainer?.cobj || obj.nexthere?.cobj || null;
        break;
    default:
        return null;
    }

    let parent = null, child = null;
    const oid = obj.o_id | 0;
    if (oid === (split.child_oid | 0)) child = obj;
    else if (oid === (split.parent_oid | 0)) parent = obj;
    else return null;
    for (let it = list; it && (!parent || !child); it = it.nobj) {
        if ((it.o_id | 0) === (split.parent_oid | 0)) parent = it;
        if ((it.o_id | 0) === (split.child_oid | 0)) child = it;
    }
    if (!parent || !child) return null;
    const { merged } = await import('./hold_another_object.js');
    const pparent = { o: parent }, pchild = { o: child };
    return (await merged(pparent, pchild)) ? pparent.o : null;
}
/* C shk.c:3623-3659 splitbill(obj, otmp) — move the split-off quantity to a
 * second bill entry while retaining the original entry for the remainder.
 * This path is synchronous and RNG-free; it is reached by splitobj() whenever
 * an unpaid stack is divided. */
export async function splitbill(obj, otmp) {
    const shops = game.u?.ushops || '';
    const roomno = typeof shops === 'string' ? shops.charCodeAt(0) : shops[0];
    const shkp = shops.length ? shop_keeper(roomno) : null;
    if (!shkp || !inhishop(shkp)) return;
    const eshk = ESHK(shkp);
    const bp = await onbill(obj, shkp, false);
    if (!eshk || !bp) return;

    const childQuan = otmp.quan | 0;
    const billedQuan = bp.bquan | 0;
    /* C reports impossible states here but continues with the quantity move;
     * keep that mutation behavior (the diagnostics are intentionally silent
     * in this port). */
    bp.bquan = billedQuan - childQuan;

    const billct = eshk.billct | 0;
    if (billct >= BILLSZ) {
        otmp.unpaid = 0;
        return;
    }
    const bill = eshk.bill_p || eshk.bill || (eshk.bill_p = []);
    bill[billct] = {
        bo_id: otmp.o_id,
        bquan: childQuan,
        useup: false,
        price: bp.price
    };
    eshk.billct = billct + 1;
}
/* obj_split_timers — the real body lives in js/timeout.js (C timeout.c:2358),
 * imported at the top of this file.  It used to throw, which was the correct
 * behaviour while no timer existed to split; splitting a stack of timed
 * corpses now duplicates their ROT_CORPSE elements as C does. */
function obj_split_light_source(src, dest) { return obj_split_light_source_real(src, dest); }
export { tele_restrict };


export function m_lined_up(mtarg, mtmp) {
    const utarget = (mtarg === game.youmonst);
    const tx = utarget ? mtmp.mux : mtarg.mx;
    const ty = utarget ? mtmp.muy : mtarg.my;
    const ignore_boulders = utarget && (throws_rocks(mtmp.data)
                                        || m_carrying(mtmp, WAN_STRIKING));

    /* hero concealment usually trumps monst awareness of being lined up */
    /* C youprop.h Upolyd = (u.umonnum != u.umonster).  The old spelling here
     * read `game.urole.mnum`, which this port does not define — every live
     * call to m_lined_up threw before it could reach linedup().
     * js/const.js:2882 Upolyd(player) is the shared reader. */
    const polymorphed = Upolyd(game.u);
    /* C decl.c gy.youmonst is always a live struct; this port has no global
     * hero-monst record (js/polyself.js creates a bare object on demand), so
     * an absent one reads as m_ap_type 0 == M_AP_NOTHING, which is what a
     * non-mimicking hero has.  C short-circuits on !Upolyd before reaching
     * U_AP_TYPE at all, so this is only consulted when polymorphed. */
    const U_AP_TYPE = ((game.youmonst?.m_ap_type | 0) & M_AP_TYPMASK);
    if (utarget && polymorphed && rn2(25)
        && (game.u.uundetected || (U_AP_TYPE !== M_AP_NOTHING
                                   && U_AP_TYPE !== M_AP_MONSTER)))
        return 0;

    /* [no callers care about the 1 vs 2 situation any more] */
    return linedup(tx, ty, mtmp.mx, mtmp.my,
                   utarget ? (ignore_boulders ? 1 : 2) : 0) ? 1 : 0;
}

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
function Mgender(mtmp) { return mtmp.female ? FEMALE : MALE; }
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
export async function mondied(mtmp) { return await mondied_dm(mtmp); }
/* C mondata.c:13 set_mon_data(struct monst *mon, struct permonst *ptr) — point
 * mon at a new form and prorate its banked movement when the new form is
 * SLOWER, so a shape change cannot carry extra moves over.  RNG-free.
 * `movement_p` is u.umovement for the poly'd hero and mon->movement otherwise;
 * this port keeps the hero's banked movement in game.u.umovement under exactly
 * that name. */
export function set_mon_data(mtmp, ptr) {
    const old_speed = mtmp.data ? (mtmp.data.mmove | 0) : 0;
    const isHero = (mtmp === game.youmonst);
    mtmp.data = ptr;
    mtmp.mnum = monsndx_mm(ptr);
    const cur = isHero ? (game.u.umovement | 0) : (mtmp.movement | 0);
    if (cur) {
        const new_speed = ptr.mmove | 0;
        if (new_speed < old_speed) {
            let v = cur * new_speed;
            if (old_speed > 0)
                v = Math.trunc(v / old_speed);
            if (isHero) game.u.umovement = v; else mtmp.movement = v;
        }
    }
}
/* C mon.c monsndx(ptr) — `ptr - &mons[0]`; permonstTemplate() carries it as
 * pmidx (js/dog.js:248 uses the same two-name lookup). */
function monsndx_mm(ptr) {
    if (!ptr) return -1 /* NON_PM */;
    return (ptr.pmidx != null ? ptr.pmidx : ptr.mndx != null ? ptr.mndx : -1) | 0;
}
/* C do_name.c pline_mon(mon, fmt, ...) — same "ignore mon, format+pline" shape
 * already used by js/mhitu.js's local pline_mon. Fire-and-forget (async
 * pline): grow_up must stay synchronous to match its `struct permonst *`
 * return contract. */
function pline_mon(_mtmp, msg) { pline(msg); }

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
        const fem = is_male(ptr) ? 0 : is_female(ptr) ? 1 : mtmp.female;

        if (mvitalsGenod(newtype)) {
            if (canspotmon(mtmp))
                pline(`As ${mon_nam(mtmp)} grows up into `
                    + `${an(monPmname(ptr.pmidx, Mgender(mtmp)))}, ${mhe(mtmp)} `
                    + `${nonliving(ptr) ? "expires" : "dies"}!`);
            set_mon_data(mtmp, ptr);
            await mondied(mtmp);
            return null;
        } else if (canspotmon(mtmp)) {
            const prefix = (mtmp.female && !fem) ? "male "
                : (fem && !mtmp.female) ? "female " : "";
            const buf = prefix + monPmname(ptr.pmidx, fem);
            pline_mon(mtmp, `${YMonnam(mtmp)} `
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

function makeknown(otyp) { discover_object(otyp | 0, true, true, true); }

const _AMULET_OF_REFLECTION = 208;

// ── ureflects (muse.c:2834) ──
// C ref: muse.c:2834-2866. Outermost-to-innermost check of the hero's
// reflection sources: worn shield, wielded weapon, worn amulet, worn body
// armor (uskin ? "luster" : "armor" — dragon-scale-mail-over-hide wording),
// then the intrinsic silver-dragon-form case.
// EReflecting = u.uprops[REFLECTING].extrinsic; gy.youmonst.data ==
// &mons[PM_SILVER_DRAGON] -> game.youmonst.mndx === PM_SILVER_DRAGON.
export function ureflects(fmt, str) {
    const u = game.u;
    const EReflecting = (u.uprops[REFLECTING].extrinsic | 0);
    if (EReflecting & W_ARMS) {
        if (fmt && str) {
            pline(fmt, str, "shield");
            makeknown(_SHIELD_OF_REFLECTION);
        }
        return true;
    } else if (EReflecting & W_WEP) {
        if (fmt && str)
            pline(fmt, str, "weapon");
        return true;
    } else if (EReflecting & W_AMUL) {
        if (fmt && str) {
            pline(fmt, str, "medallion");
            makeknown(_AMULET_OF_REFLECTION);
        }
        return true;
    } else if (EReflecting & W_ARM) {
        if (fmt && str)
            pline(fmt, str, u.uskin ? "luster" : "armor");
        return true;
    /* C ref: youmonst.data == &mons[PM_SILVER_DRAGON], i.e. u.umonnum.  Was
     * game.youmonst.mndx, which the live path never writes (see poly_gender). */
    } else if (((game.u && game.u.umonnum) | 0) === PM_SILVER_DRAGON) {
        if (fmt && str)
            pline(fmt, str, "scales");
        return true;
    }
    return false;
}

export function freemcorpsenm(mtmp) {
    if (mtmp.mextra)
        mtmp.mextra.mcorpsenm = NON_PM;
}
