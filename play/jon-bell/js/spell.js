// spell.js — Spell casting RNG path.
// C ref: nethack-c/src/spell.c
// @ts-nocheck — sibling imports from hand-maintained js/*.js (no .d.ts yet).

import { take_gold } from './sit.js';
import { game } from './gstate.js';
import { impossible } from './pline.js';
import { OC_NAME } from './oc_name_data.js';
import { MKOBJ_SVB_BASES } from './mkobj_data.js';
import { PM_WIZARD } from './pm.generated.js';
import { P_NONE, P_MASTER, P_GRAND_MASTER } from './const.js';
import { P_SKILL } from './skills.js';
import { roles } from './roles.js';
import { nhgetch } from './input.js';
import { pline, flush_screen, newsym, show_glyph_cell } from './display.js';
import { rn2, rnd, rn1 } from './rng.js';
import { build_window_screen, tty_window_offx } from './com_pager.js';
import { CORR, DOOR, ROOM, NO_SPELL, UNKNOWN_SPELL, CONFUSION, STUNNED, TIMEOUT, BLINDED, CLAIRVOYANT, SICK, SLIMED, HEAD,
    ECMD_OK, ECMD_TIME, ECMD_FAIL, CMDQ_KEY, CQ_REPEAT } from './const.js';
/* study_book's too_hard block (spell.c:575-620) and cursed_book (spell.c:113).
 * acurr is aliased because this file already carries a same-named local helper
 * whose miss path returns a hard-coded 10; js/attrib.js's is the real
 * attrib.c:1191 body (abase + abon + atemp with C's per-attribute clamps), and
 * read_ability is a threshold comparison where a defaulted 10 would silently
 * change the outcome.  Retiring the local shadow touches its other callers and
 * is out of this fix's scope. */
import { acurr as acurr_real } from './attrib.js';
import { nomul } from './allmain.js';
import { iter_mons, On_stairs, makemon } from './mklev.js';
import { set_malign, permonstTemplate } from './makemon.js';
import { mkundead } from './cmd.js';
import { PM_MASTER_LICH, PM_NALFESHNEE } from './pm.generated.js';
import { NO_MINVENT } from './const.js';
import { tamedog } from './dog.js';
import { monflee } from './makemon.js';
import { invocation_pos, trycall, useup, jump, body_part, cmdq_pop, cmdq_add_key, getpos, walk_path, getpos_sethilite } from './cmd.js';
import { explode } from './zap.js';
import { m_at } from './uhitm.js';
import { cansee } from './vision.js';
import { canspotmon } from './display.js';
import { distmin } from './hacklib.js';
import { isok, Is_waterlevel, ZAP_POS, IS_DOOR, D_ISOPEN, EXPL_FIERY, EXPL_FROSTY } from './const.js';
import { yn_function } from './end.js';
import { MENU_TRADITIONAL } from './const.js';
import { check_capacity } from './cmd.js';
import { morehungry } from './eat.js';
import { aggravate } from './mcastu.js';
import { tele } from './teleport.js';
import { make_blinded } from './zap.js';
/* make_confused's C home is potion.c:88 — js/mhitu.js's copy was an exported
 * empty body.  Import the real one directly. */
import { make_confused, make_stunned } from './potion.js';
import { freehand } from './engrave.js';
import { can_chant } from './makemon.js';
import { CLR_WHITE } from './terminal.js';
import { exercise } from './attrib.js';
import { discover_object, observe_object } from './o_init.js';
import { MKOBJ_OC_SKILL } from './mkobj_erosion_meta.js';
import { use_skill } from './uhitm.js';
/* percent_success's is_metallic() (spell.c:2190-2208) needs objects[].oc_material
 * for the worn-armour slots; ARMOR_DATA is the generated ARMOR_CLASS slice of
 * the C objects table and armorIsMetallic() is objclass.h:194 restated. */
import { ARMOR_DATA, armorIsMetallic } from './armor_data.js';
import { ubuzz, zap_dig } from './zap.js';
/* ── spelleffects() effect-dispatch surface ─────────────────────────────────
 * spell.c:1385 spelleffects() does not *emulate* the spell; it builds a pseudo
 * object and hands it to the same wand/scroll/potion machinery a real item
 * would use.  Every one of these bodies already existed in the tree, reachable
 * from dozap()/doread()/dopotion() but NOT from docast() — the cast path had
 * its own RNG-consumption stand-in instead.  These imports are what make the
 * real bodies live from a cast. */
import { mksobj, set_bknown as set_bknown_real } from './mklev.js';
import { zapyourself, weffects } from './zap.js';
import { seffects } from './read.js';
import { peffects, healup } from './potion.js';
import { losehp } from './dokick.js';
import { update_inventory } from './mhitm.js';
import { getdir } from './lock.js';
import { NO_KILLER_PREFIX, CLOUD, IS_TREE, IS_STWALL } from './const.js';
import { Blind } from './vision.js';
import { find_ac } from './do_wear.js';
import { hcolor, hliquid } from './mhitm.js';
import { an, Tobjnam as Tobjnam_real, getObjDescr, makeplural } from './objnam.js';
import { fall_asleep } from './timeout.js';
import { EYE, ERODE_CORRODE, EF_GREASE, EF_VERBOSE } from './const.js';
import { erode_obj } from './trap.js';
import { dmgtype_fromattack } from './makemon.js';
import { PM_FOG_CLOUD, PM_AIR_ELEMENTAL } from './pm.generated.js';
/* C spell.c:1570 dispatches directly to dog.c:137 make_familiar(). */
import { make_familiar } from './dog.js';
import { TtyMenu, PICK_ONE, ATR_NONE } from './tty_menu.js';
import { do_vicinity_map } from './detect.js';

// ── Object-type constants ────────────────────────────────────────────────────
const SPBOOK_FIRST_OTYP = 366; // SPE_DIG = FIRST_SPELL
const SPE_LIGHT         = 372;
const SPE_DIG             = 366; /* == SPBOOK_FIRST_OTYP (FIRST_SPELL) */
const SPE_MAGIC_MISSILE   = 367, SPE_FIREBALL       = 368, SPE_CONE_OF_COLD  = 369;
const SPE_SLEEP           = 370, SPE_FINGER_OF_DEATH = 371;
const SPE_DETECT_MONSTERS = 373, SPE_HEALING        = 374, SPE_KNOCK         = 375;
const SPE_FORCE_BOLT      = 376, SPE_CONFUSE_MONSTER = 377, SPE_CURE_BLINDNESS = 378;
const SPE_DRAIN_LIFE      = 379, SPE_SLOW_MONSTER   = 380, SPE_WIZARD_LOCK   = 381;
const SPE_CREATE_MONSTER  = 382, SPE_DETECT_FOOD    = 383, SPE_CAUSE_FEAR    = 384;
const SPE_CLAIRVOYANCE    = 385, SPE_CURE_SICKNESS  = 386, SPE_CHARM_MONSTER = 387;
const SPE_HASTE_SELF      = 388, SPE_DETECT_UNSEEN  = 389, SPE_LEVITATION    = 390;
const SPE_EXTRA_HEALING   = 391, SPE_RESTORE_ABILITY = 392, SPE_INVISIBILITY = 393;
const SPE_DETECT_TREASURE = 394, SPE_REMOVE_CURSE   = 395, SPE_MAGIC_MAPPING = 396;
const SPE_IDENTIFY        = 397, SPE_TURN_UNDEAD    = 398, SPE_POLYMORPH     = 399;
const SPE_TELEPORT_AWAY   = 400, SPE_CREATE_FAMILIAR = 401, SPE_CANCELLATION = 402;
const SPE_PROTECTION      = 403, SPE_JUMPING        = 404, SPE_STONE_TO_FLESH = 405;
const SPE_CHAIN_LIGHTNING = 406;
const SPE_BLANK_PAPER   = 407;
const CORNUTHAUM = 93;
const SPE_NOVEL         = 408;
const SPE_BOOK_OF_THE_DEAD = 409; /* agrees with js/dogmove.js:194, js/cmd.js:22291 */
/* C include/objects.h:945 EYEWEAR("lenses", ...) — otyp 232, verified against
 * js/objnam.js objName(232) === "lenses" (233 blindfold, 234 towel). */
const LENSES = 232;

// Spellbook display names per otyp 366-407 — C ref: nethack-c/include/objects.h
// SPELL(name, …, sn) — the first arg of the SPELL() macro.  Indexed by
// (otyp - SPBOOK_FIRST_OTYP).
const SPBOOK_NAMES = [
    /*366*/ 'dig',           /*367*/ 'magic missile',  /*368*/ 'fireball',
    /*369*/ 'cone of cold',  /*370*/ 'sleep',          /*371*/ 'finger of death',
    /*372*/ 'light',         /*373*/ 'detect monsters',/*374*/ 'healing',
    /*375*/ 'knock',         /*376*/ 'force bolt',     /*377*/ 'confuse monster',
    /*378*/ 'cure blindness',/*379*/ 'drain life',     /*380*/ 'slow monster',
    /*381*/ 'wizard lock',   /*382*/ 'create monster', /*383*/ 'detect food',
    /*384*/ 'cause fear',    /*385*/ 'clairvoyance',   /*386*/ 'cure sickness',
    /*387*/ 'charm monster', /*388*/ 'haste self',     /*389*/ 'detect unseen',
    /*390*/ 'levitation',    /*391*/ 'extra healing',  /*392*/ 'restore ability',
    /*393*/ 'invisibility',  /*394*/ 'detect treasure',/*395*/ 'remove curse',
    /*396*/ 'magic mapping', /*397*/ 'identify',       /*398*/ 'turn undead',
    /*399*/ 'polymorph',     /*400*/ 'teleport away',  /*401*/ 'create familiar',
    /*402*/ 'cancellation',  /*403*/ 'protection',     /*404*/ 'jumping',
    /*405*/ 'stone to flesh',/*406*/ 'chain lightning',/*407*/ 'blank paper',
];

// Spell oc_dir values (C ref: nethack-c/include/objclass.h:75-77)
const NODIR     = 1; // non-directional
const IMMEDIATE = 2; // directional beam, no ricochet
const RAY       = 3; // beam that bounces

// Direction-key → (dx,dy) deltas for getdir() (the 8 compass keys).
// C ref: cmd.c movecmd() / the dirs_xyz table.  Mirrors js/cmd.js DIR_DX/DIR_DY
// and js/zap.js DOZAP_DIR_DX/DOZAP_DIR_DY (each file keeps its own copy).
const SPELLDIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const SPELLDIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

// oc_dir per spellbook otyp 366-407 (C ref: nethack-c/include/objects.h SPELL rows)
// Index i => otyp (366 + i).
const SPBOOK_OC_DIR = new Uint8Array([
/*366 SPE_DIG            */ RAY,
/*367 SPE_MAGIC_MISSILE  */ RAY,
/*368 SPE_FIREBALL       */ RAY,
/*369 SPE_CONE_OF_COLD   */ RAY,
/*370 SPE_SLEEP          */ RAY,
/*371 SPE_FINGER_OF_DEATH*/ RAY,
/*372 SPE_LIGHT          */ NODIR,
/*373 SPE_DETECT_MONSTERS*/ NODIR,
/*374 SPE_HEALING        */ IMMEDIATE,
/*375 SPE_KNOCK          */ IMMEDIATE,
/*376 SPE_FORCE_BOLT     */ IMMEDIATE,
/*377 SPE_CONFUSE_MONSTER*/ IMMEDIATE,
/*378 SPE_CURE_BLINDNESS */ IMMEDIATE,
/*379 SPE_DRAIN_LIFE     */ IMMEDIATE,
/*380 SPE_SLOW_MONSTER   */ IMMEDIATE,
/*381 SPE_WIZARD_LOCK    */ IMMEDIATE,
/*382 SPE_CREATE_MONSTER */ NODIR,
/*383 SPE_DETECT_FOOD    */ NODIR,
/*384 SPE_CAUSE_FEAR     */ NODIR,
/*385 SPE_CLAIRVOYANCE   */ NODIR,
/*386 SPE_CURE_SICKNESS  */ NODIR,
/*387 SPE_CHARM_MONSTER  */ IMMEDIATE,
/*388 SPE_HASTE_SELF     */ NODIR,
/*389 SPE_DETECT_UNSEEN  */ NODIR,
/*390 SPE_LEVITATION     */ NODIR,
/*391 SPE_EXTRA_HEALING  */ IMMEDIATE,
/*392 SPE_RESTORE_ABILITY*/ NODIR,
/*393 SPE_INVISIBILITY   */ NODIR,
/*394 SPE_DETECT_TREASURE*/ NODIR,
/*395 SPE_REMOVE_CURSE   */ NODIR,
/*396 SPE_MAGIC_MAPPING  */ NODIR,
/*397 SPE_IDENTIFY       */ NODIR,
/*398 SPE_TURN_UNDEAD    */ IMMEDIATE,
/*399 SPE_POLYMORPH      */ IMMEDIATE,
/*400 SPE_TELEPORT_AWAY  */ IMMEDIATE,
/*401 SPE_CREATE_FAMILIAR*/ NODIR,
/*402 SPE_CANCELLATION   */ IMMEDIATE,
/*403 SPE_PROTECTION     */ NODIR,
/*404 SPE_JUMPING        */ IMMEDIATE,
/*405 SPE_STONE_TO_FLESH */ IMMEDIATE,
/*406 SPE_CHAIN_LIGHTNING*/ NODIR,
/*407 SPE_BLANK_PAPER    */ NODIR,
]);

// oc_level per spellbook otyp 366-409 (C ref: nethack-c-v5/upstream/include/objects.h).
// Same table as in mkobj.js / u_init.js, EXTENDED past blank paper (407) to
// cover the two non-SPELL()-macro OBJECT() rows: novel (408, oc2=1) and
// Book of the Dead (409, oc2=7) — study_book()'s switch(objects[booktype].oc_level)
// reads this for EVERY spellbook that reaches it, including 409 (spell.c:561),
// so leaving the table short made study_book_learn's switch fall to its
const SPBOOK_OC_LEVEL = new Uint8Array([
/*366*/ 5, /*367*/ 2, /*368*/ 4, /*369*/ 4, /*370*/ 3, /*371*/ 7,
/*372*/ 1, /*373*/ 1, /*374*/ 1, /*375*/ 1, /*376*/ 1, /*377*/ 1,
/*378*/ 2, /*379*/ 2, /*380*/ 2, /*381*/ 2, /*382*/ 2, /*383*/ 2,
/*384*/ 3, /*385*/ 3, /*386*/ 3, /*387*/ 5, /*388*/ 3, /*389*/ 3,
/*390*/ 4, /*391*/ 3, /*392*/ 4, /*393*/ 4, /*394*/ 4, /*395*/ 3,
/*396*/ 5, /*397*/ 3, /*398*/ 6, /*399*/ 6, /*400*/ 6, /*401*/ 6,
/*402*/ 7, /*403*/ 1, /*404*/ 1, /*405*/ 3, /*406*/ 2, /*407*/ 0,
/*408 SPE_NOVEL*/ 1, /*409 SPE_BOOK_OF_THE_DEAD*/ 7,
]);

// oc_delay per spellbook otyp 366-409 — C ref: nethack-c-v5/upstream/include/objects.h
// SPELL() macro 5th param (delay) for 366-407; novel/Book of the Dead (408/409)
// are plain OBJECT() rows whose "dly" field is 0. Used by study_book() to
// schedule the `learn` occupation's per-turn study delay (svc.context.spbook.delay).
// Index i => otyp (366 + i).
const SPBOOK_OC_DELAY = new Uint8Array([
/*366*/ 6, /*367*/ 2, /*368*/ 4, /*369*/ 7, /*370*/ 1, /*371*/ 10,
/*372*/ 1, /*373*/ 1, /*374*/ 2, /*375*/ 1, /*376*/ 2, /*377*/ 2,
/*378*/ 2, /*379*/ 2, /*380*/ 2, /*381*/ 3, /*382*/ 3, /*383*/ 3,
/*384*/ 3, /*385*/ 3, /*386*/ 3, /*387*/ 3, /*388*/ 4, /*389*/ 4,
/*390*/ 4, /*391*/ 5, /*392*/ 5, /*393*/ 5, /*394*/ 5, /*395*/ 5,
/*396*/ 7, /*397*/ 6, /*398*/ 8, /*399*/ 8, /*400*/ 6, /*401*/ 7,
/*402*/ 8, /*403*/ 3, /*404*/ 3, /*405*/ 1, /*406*/ 4, /*407*/ 0,
/*408 SPE_NOVEL*/ 0, /*409 SPE_BOOK_OF_THE_DEAD*/ 0,
]);

// oc_skill per spellbook otyp 366-407
// (28=ATTACK,29=HEALING,30=DIV,31=ENCH,32=CLERIC,33=ESCAPE,34=MATTER)
// C ref: nethack-c/include/objects.h oc_skill field (shared with u_init.js)
const SPBOOK_OC_SKILL = new Int8Array([
    /* 366 */ 34, /* 367 */ 28, /* 368 */ 28, /* 369 */ 28, /* 370 */ 31,
    /* 371 */ 28, /* 372 */ 30, /* 373 */ 30, /* 374 */ 29, /* 375 */ 34,
    /* 376 */ 28, /* 377 */ 31, /* 378 */ 29, /* 379 */ 28, /* 380 */ 31,
    /* 381 */ 34, /* 382 */ 32, /* 383 */ 30, /* 384 */ 31, /* 385 */ 30,
    /* 386 */ 29, /* 387 */ 31, /* 388 */ 33, /* 389 */ 30, /* 390 */ 33,
    /* 391 */ 29, /* 392 */ 29, /* 393 */ 33, /* 394 */ 30, /* 395 */ 32,
    /* 396 */ 30, /* 397 */ 30, /* 398 */ 32, /* 399 */ 34, /* 400 */ 33,
    /* 401 */ 32, /* 402 */ 34, /* 403 */ 32, /* 404 */ 33, /* 405 */ 29,
    /* 406 */ 28, /* 407 */ 0,
]);

// ── Spell knowledge constants ────────────────────────────────────────────────
// C ref: nethack-c/include/spell.h enum spellknowledge
const spe_Forgotten  = -1; // known but no longer castable
const spe_Unknown    =  0; // not yet known
const spe_Fresh      =  1; // castable if various casting criteria are met
const spe_GoingStale =  2; // still castable but nearly forgotten

// C ref: nethack-c/src/spell.c:17 #define KEEN
const KEEN = 20000;

// ── Attribute constants ──────────────────────────────────────────────────────
// C ref: nethack-c/include/attrib.h
const A_STR = 0;
const A_INT = 1;
const A_WIS = 2;
const A_DEX = 3;
const A_CON = 4;
const A_CHA = 5;

// ── Skill level constants ────────────────────────────────────────────────────
// C ref: nethack-c/include/skills.h P_UNSKILLED..P_GRAND_MASTER
const P_ISRESTRICTED = 0;
const P_UNSKILLED    = 1;
const P_BASIC        = 2;
const P_SKILLED      = 3;
const P_EXPERT       = 4;

// Skill type indices for spell schools (matches u_init.js SPBOOK_OC_SKILL_C)
const P_ATTACK_SPELL      = 28;
const P_HEALING_SPELL     = 29;
const P_DIVINATION_SPELL  = 30;
const P_ENCHANTMENT_SPELL = 31;
const P_CLERIC_SPELL      = 32;
const P_ESCAPE_SPELL      = 33;
const P_MATTER_SPELL      = 34;

// ── Role constants ───────────────────────────────────────────────────────────
// C ref: nethack-c/src/role.c roles[] order.  These are `flags.initrole` values
// ("index into roles[]", C flag.h:144), NOT the C PM_* mons[] indices — every
// use below compares against g.flags.initrole.  Formerly spelled PM_CLERIC /
// PM_HEALER / …, which collided with the real PM_HEALER = 334 declared in
// js/uhitm.js, js/makemon.js and js/pm.generated.js.
const ROLE_CLERIC = 6;  // Priest
const ROLE_KNIGHT = 4;

// ── Role stat tables ─────────────────────────────────────────────────────────
const ROLE_SPELBASE = [5, 14, 12, 3, 8, 8, 3, 8, 9, 10, 5, 10, 1];
const ROLE_SPELHEAL = [0, 0, 0, -3, -2, -2, -2, 0, 2, 0, 1, -2, 0];
const ROLE_SPELSHLD = [2, 0, 1, 2, 0, 2, 2, 1, 1, 0, 2, 0, 3];
const ROLE_SPELSTAT = [A_INT, A_INT, A_INT, A_WIS, A_WIS, A_WIS, A_WIS,
                       A_INT, A_INT, A_INT, A_INT, A_WIS, A_INT];
const ROLE_SPELSPEC = [396/*SPE_MAGIC_MAPPING*/,   388/*SPE_HASTE_SELF*/,
                       366/*SPE_DIG*/,             386/*SPE_CURE_SICKNESS*/,
                       398/*SPE_TURN_UNDEAD*/,     392/*SPE_RESTORE_ABILITY*/,
                       395/*SPE_REMOVE_CURSE*/,    394/*SPE_DETECT_TREASURE*/,
                       393/*SPE_INVISIBILITY*/,    385/*SPE_CLAIRVOYANCE*/,
                       387/*SPE_CHARM_MONSTER*/,   369/*SPE_CONE_OF_COLD*/,
                       367/*SPE_MAGIC_MISSILE*/];
const ROLE_SPELSBON = [-4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4, -4];

/* C ref: spell.c:106-108 — the metal-armour spellcasting penalties are plain
 * #defines, NOT fields of `u`:
 *     #define uarmhbon 4    metal helmets interfere with the mind
 *     #define uarmgbon 6    casting channels through the hands
 *     #define uarmfbon 2    all metal interferes to some degree
 * They were read here as u.uarmhbon/u.uarmgbon/u.uarmfbon — fields nothing in
 * js/ ever writes — so every metal helm/gauntlet/boot added 0. */
const uarmhbon = 4;
const uarmgbon = 6;
const uarmfbon = 2;

// ── Healing spell set (C ref: spell.c:2215-2219) ────────────────────────────
const HEALING_SPELL_SET = new Set([374/*SPE_HEALING*/, 391/*SPE_EXTRA_HEALING*/,
                                    378/*SPE_CURE_BLINDNESS*/, 386/*SPE_CURE_SICKNESS*/,
                                    392/*SPE_RESTORE_ABILITY*/, 395/*SPE_REMOVE_CURSE*/]);

// ── Object-type constants (for quarterstaff / robe / shield checks) ──────────
// C ref: nethack-c/include/objects.h — every `obj->otyp` is the numeric index
// into objects[]: QUARTERSTAFF = 79, ROBE = 143, SMALL_SHIELD = 150
// (the same indices are tabulated at js/u_init.js:881, :906 and :911).
//
// Two object representations coexist in this port, so an otyp test here has to
// accept either:
//   * the weapon slot (u.uwep) is filled by the ported ini_inv path
//     (js/u_init.js:1481), which stores the NUMERIC otyp — cf. js/uhitm.js:87
//     which also builds u.uwep with the numeric QUARTERSTAFF (79);
//   * the armor slots (u.uarmc/u.uarms/...) are filled by the older
//     iniInvWornArmor() scaffold (js/u_init.js:214), which stores a SYMBOLIC
//     string otyp keyed into ARMOR_META (js/u_init.js:152).
// otypIs() below compares against both spellings so that a slot migrating from
// the symbolic form to the numeric one cannot silently kill a branch.
const QUARTERSTAFF      = 79;
const ROBE              = 143;
const SMALL_SHIELD      = 150;
const ROBE_TAG          = 'ROBE';
const SMALL_SHIELD_TAG  = 'SMALL_SHIELD';
const QUARTERSTAFF_TAG  = 'QUARTERSTAFF';

/* True when `obj` is of object type `num` (objects.h index), tolerating the
 * symbolic string spelling `tag` used by the iniInvWornArmor() armor records. */
function otypIs(obj, num, tag) {
    if (!obj) return false;
    const t = obj.otyp;
    return t === num || t === tag;
}

// ── isqrt ────────────────────────────────────────────────────────────────────
export function isqrt(val) {
    if (val <= 0) return 0;
    return Math.trunc(Math.sqrt(val));
}

// ── spell_skill ───────────────────────────────────────────────────────────────
/**
 * C ref: weapon.c:1733 skill_init() + weapon.c:1828 P_SKILL(spell_skilltype()).
 * Returns the hero's current skill level (P_UNSKILLED..P_EXPERT) in the school
 * of the given spell SCHOOL (a P_*_SPELL skill_type), NOT a spell slot.
 *
 * skill_init() sets, for spell schools specifically:
 *   ROLE_HEALER, ROLE_MONK → P_HEALING_SPELL = P_BASIC
 *   ROLE_CLERIC (Priest) → P_CLERIC_SPELL  = P_BASIC
 *   ROLE_WIZARD          → P_ATTACK_SPELL, P_ENCHANTMENT_SPELL = P_BASIC
 * Every other spell school is either listed in the role's Skill_X table (→
 * P_UNSKILLED) or absent (→ P_ISRESTRICTED).  Both callers that need this
 * (percent_success, spellretention) clamp with max(skill, P_UNSKILLED), so a
 * restricted school is treated as UNSKILLED here.  No RNG.
 */
const ROLE_HEALER = 3;
const ROLE_MONK   = 5;
const ROLE_WIZARD = 12;
function spell_skill(skill_type) {
    const g = game;
    const initrole = (g.flags?.initrole ?? -1) | 0;
    // C stores P_SKILL in u.weapon_skills[].  The old g.skills alias is not a
    // game field and was never written, so consult the canonical skill rows.
    const row = g.u?.weapon_skills?.[skill_type];
    if (row && typeof row.skill === 'number') {
        return Math.max(row.skill, P_UNSKILLED);
    }
    let skill = P_UNSKILLED;
    if ((initrole === ROLE_HEALER || initrole === ROLE_MONK)
        && skill_type === P_HEALING_SPELL)
        skill = P_BASIC;
    else if (initrole === ROLE_CLERIC && skill_type === P_CLERIC_SPELL)
        skill = P_BASIC;
    else if (initrole === ROLE_WIZARD
             && (skill_type === P_ATTACK_SPELL || skill_type === P_ENCHANTMENT_SPELL))
        skill = P_BASIC;
    return Math.max(skill, P_UNSKILLED);
}

// ── percent_success ──────────────────────────────────────────────────────────
/**
 * C ref: spell.c:2173 percent_success(int spell)
 * spell: index into game.spl_book[] (NOT the spell otyp)
 *
 * Returns chance (0-100) of successfully casting the spell.
 * No RNG calls — purely deterministic.
 */
function percent_success(spellSlot) {
    const g = game;
    const u = g.u || {};
    const flags = g.flags || {};
    const initrole = (flags.initrole ?? -1) | 0;

    const spellBook = (g.spl_book || [])[spellSlot];
    if (!spellBook) return 0;

    const otyp = spellBook.sp_id;
    const idx = otyp - SPBOOK_FIRST_OTYP;
    let skill_type = (idx >= 0 && idx < SPBOOK_OC_SKILL.length)
        ? SPBOOK_OC_SKILL[idx] : 0;
    /* C ref: role.c:2087-2088 — for Priest, objects[SPE_LIGHT].oc_skill is
     * rewritten from P_DIVINATION_SPELL to P_CLERIC_SPELL at game start.
     * Apply the same rewrite here so percent_success / spelltypemnemonic
     * return CLERIC for light when the hero is a Priest. */
    if (initrole === ROLE_CLERIC && otyp === 372 /* SPE_LIGHT */) {
        skill_type = P_CLERIC_SPELL;
    }
    const spellev = (idx >= 0 && idx < SPBOOK_OC_LEVEL.length)
        ? SPBOOK_OC_LEVEL[idx] : 1;

    // paladin_bonus: Knight casting clerical spell has no metal armor penalty
    const paladin_bonus = (initrole === ROLE_KNIGHT && skill_type === P_CLERIC_SPELL);

    // spelbase and adjustments
    let splcaster = ROLE_SPELBASE[initrole] ?? 0;
    const special  = ROLE_SPELHEAL[initrole] ?? 0;
    const spelstat = ROLE_SPELSTAT[initrole] ?? A_INT;
    const spelarmr = roles[initrole]?.spelarmr ?? 0;
    const spelshld = ROLE_SPELSHLD[initrole] ?? 0;
    const spelspec = ROLE_SPELSPEC[initrole] ?? 0;
    const spelsbon = ROLE_SPELSBON[initrole] ?? 0;

    // uarm: body armor — is_metallic check (ring mail, chain mail, etc.)
    // Slots store armor objects with .otyp as a string tag (e.g. 'ROBE').
    const uarm  = u.uarm  ?? null;  // body armor obj or null
    const uarmc = u.uarmc ?? null;  // cloak obj or null
    const uarms = u.uarms ?? null;  // shield obj or null
    /* C ref: spell.c:2192 / :2194 `uarmc && uarmc->otyp == ROBE` */
    const uarmc_is_robe = otypIs(uarmc, ROBE, ROBE_TAG);

    if (uarm && is_metallic_armor(uarm) && !paladin_bonus) {
        splcaster += uarmc_is_robe ? Math.trunc(spelarmr / 2) : spelarmr;
    } else if (uarmc_is_robe) {
        splcaster -= spelarmr;
    }

    if (uarms) {
        splcaster += spelshld;
    }

    // Quarterstaff bonus — uwep
    /* C ref: spell.c:2199-2200
     *     if (uwep && uwep->otyp == QUARTERSTAFF)
     *         splcaster -= 3;  / * Small bonus * / */
    const uwep = u.uwep ?? null;
    if (otypIs(uwep, QUARTERSTAFF, QUARTERSTAFF_TAG)) {
        splcaster -= 3;
    }

    if (!paladin_bonus) {
        const uarmh = u.uarmh ?? null;
        const uarmg = u.uarmg ?? null;
        const uarmf = u.uarmf ?? null;
        if (uarmh && is_metallic_armor(uarmh))
            splcaster += uarmhbon;
        if (uarmg && is_metallic_armor(uarmg))
            splcaster += uarmgbon;
        if (uarmf && is_metallic_armor(uarmf))
            splcaster += uarmfbon;
    }

    if (spelspec && otyp === spelspec) {
        splcaster += spelsbon;
    }

    if (HEALING_SPELL_SET.has(otyp)) {
        splcaster += special;
    }

    if (splcaster > 20) splcaster = 20;

    // statused = ACURR(spelstat) — current stat value
    const statused = acurr(spelstat);

    // chance = 11 * statused / 2
    let chance = Math.trunc(11 * statused / 2);

    // skill in this spell's school — C P_SKILL(skilltype) lookup.
    // C ref: weapon.c:1732-1786 skill_init().  Until per-skill state is fully
    // ported, derive the starting skill from initrole + skill_type for the
    // role-specific spell schools that are set in skill_init:
    //   ROLE_HEALER, ROLE_MONK → P_HEALING_SPELL = P_BASIC
    //   ROLE_CLERIC          → P_CLERIC_SPELL  = P_BASIC
    //   ROLE_WIZARD          → P_ATTACK_SPELL, P_ENCHANTMENT_SPELL = P_BASIC
    // Other spell schools default to P_UNSKILLED if the role's Skill_X table
    // lists them (handled via the Skill_X parse in u_init.js), else RESTRICTED.
    // above are the only deviation from "everything UNSKILLED".
    const skill = spell_skill(skill_type);
    const skill_level = Math.max(skill, P_UNSKILLED) - 1; /* unskilled => 0 */

    // difficulty based on spell level and hero level
    const ulevel = (u.ulevel ?? 1) | 0;
    const difficulty = (spellev - 1) * 4 - ((skill_level * 6) + Math.trunc(ulevel / 3) + 1);

    if (difficulty > 0) {
        chance -= isqrt(900 * difficulty + 2000);
    } else {
        const learning = Math.trunc(15 * (-difficulty) / spellev);
        chance += learning > 20 ? 20 : learning;
    }

    if (chance < 0)  chance = 0;
    if (chance > 120) chance = 120;

    /* Heavy shield penalty.
     * C ref: spell.c:2269 `if (uarms && weight(uarms) > (int) objects[SMALL_SHIELD].oc_weight)`
     * objects.h gives SMALL_SHIELD oc_weight = 30, so C penalises any shield
     * STRICTLY heavier than 30 — a small shield itself (exactly 30) does not
     * penalise.
     * KNOWN GAP: weight() (mkobj.c:1900) sums the object's own oc_weight plus
     * any contents, and this port has no objects[].oc_weight table wired up
     * here, so the test is approximated by object identity: everything that is
     * not a SMALL_SHIELD is treated as heavier than 30.  That is exact for the
     * shields at or below 30 (only SMALL_SHIELD qualifies) and wrong only for a
     * hypothetical sub-30 non-small shield, of which objects.h has none — but
     * it would also mis-handle an ELVEN_MITHRIL_COAT-style contents case if a
     * shield could ever hold contents.  Replace with a real weight() when the
     * oc_weight table lands. */
    if (uarms && !otypIs(uarms, SMALL_SHIELD, SMALL_SHIELD_TAG)) {
        if (otyp === spelspec) {
            chance = Math.trunc(chance / 2);
        } else {
            chance = Math.trunc(chance / 4);
        }
    }

    // Combine: chance * (20 - splcaster) / 15 - splcaster
    chance = Math.trunc(chance * (20 - splcaster) / 15) - splcaster;

    if (chance > 100) chance = 100;
    if (chance < 0)   chance = 0;

    return chance;
}

// ── Helper: ACURR (current attribute value) ──────────────────────────────────
// C ref: nethack-c/src/attrib.c ACURR macro
//
// game.u.acurr.a is stored in DISPLAY order [St,Dx,Co,In,Wi,Ch] (indices 0-5).
// C constants: A_STR=0, A_INT=1, A_WIS=2, A_DEX=3, A_CON=4, A_CHA=5.
// Display permutation (from mapstate_game_bridge.js:210-215):
//   display[0]=St, display[1]=Dx, display[2]=Co, display[3]=In, display[4]=Wi, display[5]=Ch
// So to map C attr index → JS display index:
//   A_STR(0) → 0, A_INT(1) → 3, A_WIS(2) → 4, A_DEX(3) → 1, A_CON(4) → 2, A_CHA(5) → 5
const C_ATTR_TO_DISP = [0, 3, 4, 1, 2, 5]; // A_STR→0, A_INT→3, A_WIS→4, A_DEX→1, A_CON→2, A_CHA→5

function acurr(stat) {
    const u = game.u || {};
    const dispIdx = C_ATTR_TO_DISP[stat] ?? stat;
    if (u.acurr && Array.isArray(u.acurr.a) && u.acurr.a[dispIdx] !== undefined) {
        return u.acurr.a[dispIdx] | 0;
    }
    return 10; // safe default
}

// ── Helpers for armor checks ─────────────────────────────────────────────────
const _ARMOR_TAG_TO_OTYP = (() => {
    const m = new Map();
    for (const [otyp, row] of Object.entries(ARMOR_DATA)) {
        if (!row || !row.name) continue;
        m.set(row.name.toUpperCase().replace(/[ -]/g, '_'), otyp | 0);
    }
    return m;
})();

/* The armour slot's numeric otyp, or -1 when it cannot be resolved. */
function _armor_otyp(obj) {
    if (obj === null || obj === undefined) return -1;
    const t = (typeof obj === 'object') ? obj.otyp : obj;
    if (typeof t === 'number') return t | 0;
    if (typeof t === 'string') return _ARMOR_TAG_TO_OTYP.get(t) ?? -1;
    return -1;
}

function is_metallic_armor(obj) {
    const otyp = _armor_otyp(obj);
    if (otyp < 0) return false;
    return armorIsMetallic(ARMOR_DATA[otyp]);
}

function get_quarterstaff_otyp() {
    // Not tracking uwep as otyp yet; return sentinel that never matches
    return -1;
}

function shield_weight(otyp) {
    // C ref: objects.h weight field for shields
    // We don't track shield weight; return 0 (no heavy shield)
    return 0;
}

function small_shield_weight() {
    // C ref: objects.h SMALL_SHIELD oc_weight = 30
    return 30;
}

// ── exercise (A_WIS) RNG consumption ─────────────────────────────────────────
function exercise_a_wis_true_rng() {
    rn2(19); /* attrib.c:509 — rn2(19) for A_WIS exercise */
}

/* C spell.c:1181 — attempting a forgotten spell causes disorientation.
 * Keep the order of status updates and preserve existing timeout/flag bits. */
function spell_backfire(spell) {
    const duration = ((game.spl_book[spell].sp_lev | 0) + 1) * 3;
    const old_stun = (game.u.uprops?.[STUNNED]?.intrinsic | 0) & TIMEOUT;
    const old_conf = (game.u.uprops?.[CONFUSION]?.intrinsic | 0) & TIMEOUT;
    switch (rn2(10)) {
    case 0:
    case 1:
    case 2:
    case 3:
        make_confused(old_conf + duration, false);
        break;
    case 4:
    case 5:
    case 6:
        make_confused(old_conf + Math.trunc(2 * duration / 3), false);
        make_stunned(old_stun + Math.trunc(duration / 3), false);
        break;
    case 7:
    case 8:
        make_stunned(old_stun + Math.trunc(2 * duration / 3), false);
        make_confused(old_conf + Math.trunc(duration / 3), false);
        break;
    case 9:
        make_stunned(old_stun + duration, false);
        break;
    }
}

// ── spelleffects_check ───────────────────────────────────────────────────────
async function spelleffects_check(spellSlot, res, energy) {
    const g = game;
    const u = g.u = g.u || {};
    const sb = (g.spl_book || [])[spellSlot];
    const spellid = sb ? (sb.sp_id | 0) : 0;
    /* C spell.c:1223 boolean confused = (Confusion != 0).
     * youprop.h:83-84 — HConfusion IS u.uprops[CONFUSION].intrinsic. NOT
     * `u.uconf`, which is one of the three dead spellings js/uhitm.js:1058
     * records; a guard reading it is a guard that never fires. */
    const confused = ((u.uprops?.[CONFUSION]?.intrinsic) | 0) !== 0;
    energy.value = 0;

    /* C spell.c:1236 — UNKNOWN_SPELL returns before retention, costs or RNG.
     * This JS entry point receives the repertoire slot, not C's object type;
     * a missing slot or NO_SPELL row is the corresponding unknown spell. */
    if (!sb || spellid === NO_SPELL || await rejectcasting()) {
        res.value = ECMD_OK;
        return true;
    }
    energy.value = (sb.sp_lev | 0) * 5;

    /* C spell.c:1250-1268 — forgetting precedes hunger, strength and energy
     * refusal. Even an attempt with no energy remaining takes a turn. */
    const know = spellknow(spellSlot);
    if (know <= 0) {
        await pline('Your knowledge of this spell is twisted.');
        await pline('It invokes nightmarish images in your mind...');
        spell_backfire(spellSlot);
        u.uen -= rnd(energy.value);
        if (u.uen < 0) u.uen = 0;
        if (g.disp) g.disp.botl = true;
        res.value = ECMD_TIME;
        return true;
    } else if (know <= KEEN / 200) {
        await pline('You strain to recall the spell.');
    } else if (know <= KEEN / 40) {
        await pline('You have difficulty remembering the spell.');
    } else if (know <= KEEN / 20) {
        await pline('Your knowledge of this spell is growing faint.');
    } else if (know <= KEEN / 10) {
        await pline('Your recall of this spell is gradually fading.');
    }

    /* C spell.c:1274-1284 — the three refusals, in C's order. Each returns
     * before the rnd(100) at :1372, so getting the ORDER wrong is an RNG
     * divergence, not just a wrong message. */
    if ((u.uhunger | 0) <= 10 && spellid !== SPE_DETECT_FOOD) {
        await pline('You are too hungry to cast that spell.');
        res.value = ECMD_OK;
        return true;
    } else if (acurr_real(u, A_STR) < 4 && spellid !== SPE_RESTORE_ABILITY) {
        await pline('You lack the strength to cast spells.');
        res.value = ECMD_OK;
        return true;
    } else if (check_capacity('Your concentration falters while carrying so much stuff.')) {
        res.value = ECMD_TIME;
        return true;
    }

    /* C spell.c:1291-1302 — the Amulet drains energy BEFORE the sufficiency
     * test, so the drain can itself make the cast fail. rnd(2 * energy) is a
     * real draw on the core stream. */
    if (u.uhave && u.uhave.amulet && (u.uen | 0) >= energy.value) {
        await pline('You feel the amulet draining your energy away.');
        u.uen = (u.uen | 0) - rnd(2 * energy.value);
        if ((u.uen | 0) < 0) u.uen = 0;
        if (g.disp) g.disp.botl = true;
        res.value = ECMD_TIME; /* time is used even if the spell is not cast */
    }

    if (energy.value > (u.uen | 0)) {
        /* C spell.c:1315-1319 — three suffixes. u.uenpeak is not tracked by this
         * port; uenmax is the closest honest stand-in and only changes which of
         * " yet" / " anymore" is printed on an already-rare arm. */
        const peak = (u.uenpeak ?? u.uenmax) | 0;
        const suffix = (u.uen | 0) < (u.uenmax | 0) ? ''
            : (energy.value > peak ? ' yet' : ' anymore');
        await pline(`You don't have enough energy to cast that spell${suffix}.`);
        return true;
    } else if (spellid !== SPE_DETECT_FOOD) {
        let hungr = energy.value * 2;
        /* C spell.c:1337-1339 — only a WIZARD's own Intelligence reduces the
         * exertion; every other role is charged as if intell were 10. */
        let intell = acurr_real(u, A_INT);
        if (((g.flags?.initrole ?? -1) | 0) !== ROLE_WIZARD) intell = 10;
        if (intell >= 17 && intell <= 25) hungr = 0;        /* C cases 25..17 */
        else if (intell === 16) hungr = Math.trunc(hungr / 4);
        else if (intell === 15) hungr = Math.trunc(hungr / 2);
        /* C spell.c:1362-1364 — never quite faint the hero from casting. */
        if (hungr > (u.uhunger | 0) - 3) hungr = (u.uhunger | 0) - 3;
        await morehungry(hungr);
    }

    /* C spell.c:1371-1378. NOTE THE SHORT CIRCUIT: when the hero is confused C
     * does NOT draw the rnd(100) at all, so a confused cast that draws here is
     * an over-draw. The stand-in this replaced omitted `confused` entirely. */
    const chance = percent_success(spellSlot);
    if (confused || (rnd(100) > chance)) {
        await pline('You fail to cast the spell correctly.');
        u.uen = (u.uen | 0) - Math.trunc(energy.value / 2);
        if (g.disp) g.disp.botl = true;
        res.value = ECMD_TIME;
        return true;
    }
    return false;                          /* cast proceeds */
}

// ── spelleffects_rng ─────────────────────────────────────────────────────────
function spelleffects_rng(spellSlot) {
    /* line 1399 — exercise(A_WIS, TRUE) after energy is subtracted */
    exercise_a_wis_true_rng(); /* rn2(19) */

    /* line 1401 — mksobj(spellid, FALSE, FALSE):
     *   mkobj.c:1188 next_ident() → rnd(2)
     *   init=FALSE means mksobj_init is NOT called (no blessorcurse etc.) */
    rnd(2); /* mkobj.c:522 next_ident */

    /* spell effect phase — determine RNG based on oc_dir */
    const spellBook = (game.spl_book || [])[spellSlot];
    if (!spellBook) return;

    const otyp = spellBook.sp_id;
    const idx  = otyp - SPBOOK_FIRST_OTYP;
    const oc_dir = (idx >= 0 && idx < SPBOOK_OC_DIR.length)
        ? SPBOOK_OC_DIR[idx] : NODIR;

    /* weffects path: NODIR always calls weffects; IMMEDIATE spells that
     * fire at a direction also reach weffects (see spell.c:1509-1512).
     * weffects() starts with exercise(A_WIS, TRUE) at zap.c:3431 → rn2(19).
     * seffects path: scroll-like spells (SPE_REMOVE_CURSE etc.) call
     * seffects() which calls exercise(A_WIS, TRUE) at read.c:2200 → rn2(19).
     * Both paths consume exactly one more rn2(19) before any other effect RNG.
     */
    exercise_a_wis_true_rng(); /* rn2(19) — weffects:3431 or seffects:2200 */
}

// ── age_spells ─────────────────────────────────────────────────────────────
// C ref: spell.c:668-682 age_spells(void).  Called once per hero-took-time
// pass through the move loop (allmain.c:408, after gethungry, before exerchk).
// Decrements every known spell's retention counter by 1 (down to 0).  No RNG.
//   for (i=0; i<MAXSPELL && spellid(i)!=NO_SPELL; i++)
//       if (spellknow(i)) decrnknow(i);   // sp_know--
export function age_spells() {
    const book = game.spl_book || [];
    for (let i = 0; i < book.length; i++) {
        const sb = book[i];
        /* spellid(i)==NO_SPELL terminates the scan (C MAXSPELL early-out). */
        if (!sb || sb.sp_id == null || sb.sp_id === 0 /* NO_SPELL */) break;
        if (sb.sp_know) sb.sp_know = (sb.sp_know | 0) - 1;
    }
}

// ── num_spells ──────────────────────────────────────────────────────────────
// C ref: spell.c num_spells(void).  Returns count of known spells.
export function num_spells() {
    const book = game.spl_book || [];
    for (let i = 0; i < MAXSPELL; i++) {
        const sb = book[i];
        const id = sb ? (sb.sp_id | 0) : 0;
        if (id === 0 /* NO_SPELL */) return i;
    }
    return MAXSPELL;
}

// ── learn / study_book (the `learn` occupation) ──────────────────────────────
// C ref: spell.c:356 learn(void) and spell.c:468 study_book(struct obj *).
//
// study_book schedules a multi-turn `learn` occupation: each turn the move loop
// calls learn(), which counts the negative svc.context.spbook.delay up toward 0
// (busy), and on the turn it reaches 0 performs the actual spell memorization
// spellbook (finger of death), so study_book takes the no-RNG path (the
// `!spellbook->blessed` too_hard/rnd(20) block is skipped) and the occupation
// runs until a hostile monster wanders adjacent and monster_nearby() interrupts
// it (stop_occupation) — before delay ever reaches 0.

// C objclass.h: MAXSPELL = LAST_SPELL - FIRST_SPELL + 1 (42 in this build).
// The a..zA..Z keyboard alphabet is larger than the repertoire scan bound.
export const MAXSPELL = SPE_BLANK_PAPER - SPE_DIG + 1;

function _spbook_oc(otyp, table) {
    const idx = (otyp | 0) - SPBOOK_FIRST_OTYP;
    if (idx < 0 || idx >= table.length) return 0;
    return table[idx];
}

/* C ref: spell.c:22
 *     #define incrnknow(spell, x) (svs.spl_book[spell].sp_know = KEEN + (x))
 * The second argument is an ADDEND, not the book's otyp: learn() passes 1
 * (spell.c:410, :428) so a spell memorized from a book starts one turn ABOVE
 * KEEN, while initialspell()/force_learn_spell() pass 0 (spell.c:2356, :2410 —
 * "unlike when learning a spell by reading its book, we don't need to add 1").
 * That +1 is exactly why C's spell menu shows a freshly-read spell as
 * "100%" retention with `turns` == KEEN for one more turn than a
 * KEEN-on-the-nose port does: age_spells() runs once per hero turn between
 * learn() and the next render, so KEEN+1 is what survives it.
 *
 * The macro assigns sp_know ONLY — the sp_id/sp_lev assignments live at each
 * call site (spell.c:426-428), and the re-read/refresh arm (spell.c:405-411)
 * deliberately leaves them alone. */
function incrnknow(spell, x) {
    const g = game;
    const book = g.spl_book || (g.spl_book = []);
    while (book.length <= spell) book.push({ sp_id: 0, sp_lev: 0, sp_know: 0 });
    if (!book[spell]) book[spell] = { sp_id: 0, sp_lev: 0, sp_know: 0 };
    book[spell].sp_know = KEEN + (x | 0);
}

// C ref: spell.c:356 learn(void).  Returns 1 while still busy (delay<0), 0 when
// the delay countdown and the normal (non-confused, non-blank, non-novel)
// memorization tail.  No RNG on these paths (the lenses rn2(2) / confusion
// branches don't occur for the elf-wizard finger-of-death study).
// C ref: spell.c:231-339 deadbook().  Only the plain (non-invocation, non-cursed,
// non-blessed) arm is ported; the others are named gaps and throw loudly.
async function deadbook(book2) {
    pline('You turn the pages of the Book of the Dead...');
    /* makeknown(): credit_hero exercise only on first discovery (o_init.c:481) */
    if (!(game._oc_name_known && game._oc_name_known[SPE_BOOK_OF_THE_DEAD]))
        exercise(A_WIS, true);
    discover_object(SPE_BOOK_OF_THE_DEAD, true, true);
    observe_object(book2);
    book2.known = 1;
    if (invocation_pos(game.u.ux, game.u.uy) && !On_stairs(game.u.ux, game.u.uy))
        throw new Error('not yet ported: deadbook invocation arm (spell.c:241-308)');
    if (book2.cursed) {
        /* spell.c:311-323 raise_dead */
        await pline('You raised the dead!');
        let mtmp;
        if (!rn2(3) && ((mtmp = await makemon(permonstTemplate(PM_MASTER_LICH), game.u.ux, game.u.uy, NO_MINVENT))
                        || (mtmp = await makemon(permonstTemplate(PM_NALFESHNEE), game.u.ux, game.u.uy, NO_MINVENT)))) {
            mtmp.mpeaceful = false;
            set_malign(mtmp);
        }
        /* unturn_dead(&youmonst), zap.c:1156: only carried corpses/eggs act */
        for (let o = game.invent; o; o = o.nobj)
            if ((o.otyp | 0) === 265 /* CORPSE */ || (o.otyp | 0) === 266 /* EGG */)
                throw new Error('not yet ported: unturn_dead(hero) with corpse/egg in inventory (zap.c:1156)');
        await mkundead({ x: game.u.ux, y: game.u.uy }, true, NO_MINVENT);
        return;
    }
    if (book2.blessed) {
        /* C spell.c:324-326 iter_mons(deadbook_pacify_undead); :211-226 */
        const mons = [];
        iter_mons((m) => mons.push(m));
        const u = game.u;
        for (const mtmp of mons) {
            if ((((mtmp.data.mflags2 | 0) & 0x2) /* M2_UNDEAD */
                 || mtmp.cham === 226 || mtmp.cham === 227 || mtmp.cham === 228 /* is_vampshifter */)
                && cansee(mtmp.mx, mtmp.my)) {
                mtmp.mpeaceful = true;
                const dx = u.ux - mtmp.mx, dy = u.uy - mtmp.my;
                if (Math.sign(mtmp.data.maligntyp | 0) === Math.sign(u.ualign.type | 0)
                    && dx * dx + dy * dy < 4) {
                    if (mtmp.mtame) {
                        if (mtmp.mtame < 20) mtmp.mtame++;
                    } else {
                        await tamedog(mtmp, null, true);
                    }
                } else {
                    await monflee(mtmp, 0, false, true);
                }
            }
        }
        return;
    }
    switch (rn2(3)) {
    case 0: pline('Your ancestors are annoyed with you!'); break;
    case 1: pline('The headstones in the cemetery begin to move!'); break;
    default: pline('Oh my!  Your name appears in the book!');
    }
}

export async function learn() {
    const g = game;
    g.context = g.context || {};
    const sp = g.context.spbook = g.context.spbook || { book: null, o_id: 0, delay: 0 };
    const book = sp.book;

    // C spell.c:365-367 — JDS: lenses give 50% faster reading.  The rn2(2)
    // is only drawn when delay != 0 and lenses are worn (&& short-circuit).
    if (sp.delay && g.u && g.u.ublindf
        && (g.u.ublindf.otyp | 0) === LENSES && rn2(2))
        sp.delay = (sp.delay | 0) + 1;

    // C spell.c:378 — still counting down the study delay: return 1 (busy).
    if (sp.delay) {
        sp.delay = (sp.delay | 0) + 1; // not delay++ in the test, so ends at 0
        return 1;
    }
    // C spell.c:383 exercise(A_WIS, TRUE) — you're studying.
    exercise(A_WIS, true);
    const booktype = book ? (book.otyp | 0) : -1;
    // C spell.c:385-388 — Book of the Dead goes to deadbook() and ends the study.
    if (booktype === SPE_BOOK_OF_THE_DEAD) {
        await deadbook(book);
        return 0;
    }

    // C spell.c:393-395 — find the spell slot matching this book (or first free).
    const spl = g.spl_book || (g.spl_book = []);
    let i = 0;
    for (; i < MAXSPELL; i++) {
        const sb = spl[i];
        const id = sb ? (sb.sp_id | 0) : 0;
        if (id === booktype || id === 0 /* NO_SPELL */) break;
    }
    if (i >= MAXSPELL) {
        // C impossible("Too many spells memorized!") — give up.
    } else if (spl[i] && (spl[i].sp_id | 0) === booktype) {
        // C spell.c:399-413 — already known: refresh retention.
        const splname = `"${SPBOOK_NAMES[booktype - SPBOOK_FIRST_OTYP] || 'spell'}"`;
        pline(`Your knowledge of %s is %s.`.replace('%s', splname)
            .replace('%s', spl[i].sp_know ? 'keener' : 'restored'));
        /* C spell.c:410 incrnknow(i, 1) — sp_id/sp_lev are already this book's. */
        incrnknow(i, 1);
        book.spestudied = (book.spestudied | 0) + 1;
        exercise(A_WIS, true);
    } else {
        // C spell.c:414-436 — learn a brand-new spell.
        /* C spell.c:426-428 —
         *     svs.spl_book[i].sp_id = booktype;
         *     svs.spl_book[i].sp_lev = objects[booktype].oc_level;
         *     incrnknow(i, 1);
         * The slot's identity is written HERE, not inside incrnknow(). */
        while (spl.length <= i) spl.push({ sp_id: 0, sp_lev: 0, sp_know: 0 });
        if (!spl[i]) spl[i] = { sp_id: 0, sp_lev: 0, sp_know: 0 };
        spl[i].sp_id = booktype;
        spl[i].sp_lev = _spbook_oc(booktype, SPBOOK_OC_LEVEL);
        incrnknow(i, 1);
        book.spestudied = (book.spestudied | 0) + 1;
        /* C spell.c:390-392 — splname format depends on whether the book's type
         * is already known (objects[booktype].oc_name_known).  Known → "\"X\"";
         * unknown → "the \"X\" spell".  The type might become known via wish-time
         * makeknown before study starts. */
        const bookKnown = !!(g._oc_name_known && g._oc_name_known[booktype]);
        const rawName = SPBOOK_NAMES[booktype - SPBOOK_FIRST_OTYP] || 'spell';
        const splname = bookKnown ? `"${rawName}"` : `the "${rawName}" spell`;
        if (!i) pline(`You learn ${splname}.`);
        else pline(`You add ${splname} to your repertoire, as '${spellet(i)}'.`);
    }
    // C spell.c:438-447 — if (i < MAXSPELL) makeknown((int) booktype).
    // makeknown(x) == discover_object(x, TRUE, TRUE, TRUE) (hack.h:1535).  With
    // credit_hero=TRUE, discover_object fires exercise(A_WIS, TRUE) (o_init.c:481)
    // — but ONLY the first time this spellbook TYPE is discovered (the C
    // `!oc_name_known && mark_as_known` guard).  This is the SECOND exercise the
    // rn2(19)=11), fired AFTER the completion pline's --More-- closes and before
    // moveloop_core's monster_nearby().  The JS discover_object (o_init.js) does
    // not credit wisdom, so replicate the makeknown(credit_hero) semantics here:
    // fire exercise iff the type is not yet known, then mark it known.
    if (i < MAXSPELL && booktype >= 0) {
        const g2 = game;
        const alreadyKnown = !!(g2._oc_name_known && g2._oc_name_known[booktype]);
        if (!alreadyKnown) {
            exercise(A_WIS, true); // o_init.c:481 — credit_hero discover exercise
        }
        discover_object(booktype, true, true);
    }
    // C spell.c:460-462 — done studying.
    sp.book = null;
    sp.o_id = 0;
    return 0;
}

async function cursed_book(bp) {
    const g = game;
    const lev = _spbook_oc(bp ? (bp.otyp | 0) : -1, SPBOOK_OC_LEVEL) | 0;
    switch (rn2(lev)) {
    case 0:
        await pline('You feel a wrenching sensation.');
        await tele();
        break;
    case 1:
        await pline('You feel threatened.');
        aggravate();
        break;
    case 2:
        /* C spell.c:126 make_blinded(BlindedTimeout + rn1(100, 250), TRUE).
         * BlindedTimeout is u.uprops[BLINDED].intrinsic & TIMEOUT. */
        make_blinded(((g.u?.uprops?.[BLINDED]?.intrinsic | 0) & 0x00ffffff)
                     + rn1(100, 250), true);
        break;
    case 3:
        await take_gold(); /* C spell.c:128 */
        break;
    case 4:
        await pline('These runes were just too much to comprehend.');
        /* C spell.c:133 make_confused(HConfusion + rn1(7, 16), FALSE).
         * HConfusion is u.uprops[CONFUSION].intrinsic (youprop.h:83). */
        make_confused((g.u?.uprops?.[CONFUSION]?.intrinsic | 0) + rn1(7, 16), false);
        break;
    case 5:
        await pline('The book was coated with contact poison!');
        if (g.u?.uarmg) {
            /* C spell.c:147-149 */
            await erode_obj(g.u.uarmg, 'gloves', ERODE_CORRODE, EF_GREASE | EF_VERBOSE);
            break;
        }
        break;
    case 6:
        await pline('As you read the book, it explodes in your face!');
        /* C spell.c:159 dmg = 2 * rnd(10) + 5 — one draw; losehp is the same
         * KNOWN GAP as case 5.  oc_level >= 7 only. */
        rnd(10);
        return true;
    default:
        /* rndcurse() — KNOWN GAP (see header). */
        break;
    }
    return false;
}

// C ref: spell.c:474-493 — attempting to read a "dull" book may make the hero fall
// asleep.  Returns true when it did (study_book returns 1, a turn is used).
export async function study_book_dull(spellbook) {
    const g = game;
    const u = g.u;
    const booktype = spellbook ? (spellbook.otyp | 0) : -1;
    const confused = !!(u?.uprops?.[CONFUSION]?.intrinsic);
    const sleepres = !!((u?.uprops?.[3 /* SLEEP_RES */]?.intrinsic | 0)
                        || (u?.uprops?.[3]?.extrinsic | 0));
    if (confused || sleepres || getObjDescr(booktype) !== 'dull') return false;
    const lvl = _spbook_oc(booktype, SPBOOK_OC_LEVEL);
    let dullbook = rnd(25) - acurr_real(u, 2 /* A_WIS */);
    const sp = g.context?.spbook;
    /* adjust chance if hero stayed awake, got interrupted, retries */
    if (sp && sp.delay && spellbook === sp.book)
        dullbook -= rnd(lvl);
    if (dullbook <= 0) return false;
    await pline(`This book is so dull that you can't keep your ${makeplural(body_part(EYE))} open.`);
    dullbook += rnd(2 * lvl);
    await fall_asleep(-dullbook, true);
    return true;
}

// C ref: spell.c:468 study_book(spellbook).  The learn-occupation entry: covers
// spellbook).  Returns true (ECMD_TIME) when the occupation is set, false
// (ECMD_OK, no turn) when it short-circuits.  Sets up the `learn` occupation via
// set_occupation(learn, "studying", 0) (here: g.occupation = learn).
export async function study_book_learn(spellbook) {
    const g = game;
    g.context = g.context || {};
    const sp = g.context.spbook = g.context.spbook || { book: null, o_id: 0, delay: 0 };
    const booktype = spellbook ? (spellbook.otyp | 0) : -1;
    const confused = !!(g.u?.uprops?.[CONFUSION]?.intrinsic);

    // C spell.c:474-493 — dull-book fall-asleep check.  Only fires for books
    // whose appearance is "dull"; finger of death is "glittering", so skip.

    // C spell.c:496-503 — resume-after-interrupt branch.  A fresh study (no
    // pending delay for THIS book) takes the else branch below.
    const oc_level = _spbook_oc(booktype, SPBOOK_OC_LEVEL);
    const oc_delay = _spbook_oc(booktype, SPBOOK_OC_DELAY);
    if (!(sp.delay && !confused && spellbook === sp.book
          && booktype !== SPE_BLANK_PAPER)) {
        // for the wished finger-of-death book.

        // C spell.c:537-559 — schedule the study delay from the book's level.
        switch (oc_level) {
            case 1: case 2: sp.delay = -oc_delay; break;
            case 3: case 4: sp.delay = -(oc_level - 1) * oc_delay; break;
            case 5: case 6: sp.delay = -oc_level * oc_delay; break;
            case 7:         sp.delay = -8 * oc_delay; break;
            default:        return false; // impossible level → no turn
        }

        // C spell.c:561-573 — already-know-it-well refresh prompt is handled by
        // read.js study_book()'s already-known branch before reaching here, so

        let too_hard = false;
        spellbook.in_use = true;
        if (!spellbook.blessed && booktype !== SPE_BOOK_OF_THE_DEAD) {
            if (spellbook.cursed) {
                too_hard = true;
            } else {
                /* C spell.c:581-585 —
                 *     read_ability = ACURR(A_INT) + 4 + u.ulevel / 2
                 *                    - 2 * objects[booktype].oc_level
                 *                    + ((ublindf && ublindf->otyp == LENSES) ? 2 : 0);
                 * ublindf is the worn blindfold/lenses slot. */
                const lenses = (g.u && g.u.ublindf
                                && (g.u.ublindf.otyp | 0) === LENSES) ? 2 : 0;
                const read_ability = acurr_real(g.u, A_INT) + 4
                    + Math.trunc((g.u?.ulevel | 0) / 2) - 2 * oc_level + lenses;
                /* C spell.c:600-602 — "its up to random luck now". */
                if (rnd(20) > read_ability)
                    too_hard = true;
            }
        }

        if (too_hard) {
            /* C spell.c:605-619 */
            const gone = await cursed_book(spellbook);
            nomul(sp.delay);           /* study time, as plain helplessness */
            g.multi_reason = 'reading a book';
            /* C sets gn.nomovemsg = 0, i.e. the NULL pointer, so unmul falls
             * back to "You can move again." (hack.c:4183).  js/allmain.js
             * unmul() tests `nomovemsg == null` for exactly that case. */
            g.nomovemsg = null;
            sp.delay = 0;
            if (gone || !rn2(3)) {
                if (!gone)
                    await pline('The spellbook crumbles to dust!');
                await trycall(spellbook);
                await useup(spellbook);
            } else {
                spellbook.in_use = false;
            }
            return true;               /* C returns 1 → ECMD_TIME */
        } else if (confused) {
            spellbook.in_use = false;
            nomul(sp.delay);
            g.multi_reason = 'reading a book';
            g.nomovemsg = null;
            sp.delay = 0;
            return true;
        }
        spellbook.in_use = false;      /* C spell.c:629 */

        // C spell.c:630-633 — begin the study.  spell.c:625-626:
        //     You("begin to %s the runes.",
        //         spellbook->otyp == SPE_BOOK_OF_THE_DEAD ? "recite" : "memorize");
        await pline(booktype === SPE_BOOK_OF_THE_DEAD
            ? 'You begin to recite the runes.'
            : 'You begin to memorize the runes.');
    } else {
        // C spell.c:500-503 — continuing an interrupted study.
        await pline('You continue your efforts to memorize the spell.');
    }

    // C spell.c:636-639 — set_occupation(learn, "studying", 0).
    sp.book = spellbook;
    sp.o_id = spellbook ? (spellbook.o_id | 0) : 0;
    g.occupation = learn;
    g.occtxt = 'studying';
    return true;
}

// ── spelltypemnemonic ────────────────────────────────────────────────────────
// C ref: spell.c:832-853 spelltypemnemonic(int skill)
function spelltypemnemonic(skill_type) {
    switch (skill_type) {
        case P_ATTACK_SPELL:      return 'attack';
        case P_HEALING_SPELL:     return 'healing';
        case P_DIVINATION_SPELL:  return 'divination';
        case P_ENCHANTMENT_SPELL: return 'enchantment';
        case P_CLERIC_SPELL:      return 'clerical';
        case P_ESCAPE_SPELL:      return 'escape';
        case P_MATTER_SPELL:      return 'matter';
        default:                  return '';
    }
}

// ── spellretention ───────────────────────────────────────────────────────────
// C ref: spell.c:2295-2336 spellretention(int idx, char *outbuf)
// Returns a printable string for the "Retention" column.  For freshly-learned
// spells (sp_know == KEEN=20000), returns "100%".
function spellretention(spellSlot) {
    const sb = (game.spl_book || [])[spellSlot];
    if (!sb) return '';
    const turnsleft = sb.sp_know | 0;
    if (turnsleft < 1) return '(gone)';            /* "(gone)" — spell expired */
    if (turnsleft >= 20000 /* KEEN */) return '100%'; /* full retention */
    /*
     * C ref: spell.c:2311-2334.  Retention is shown as a range of percentages
     * of time left until memory expires; range precision depends on the hero's
     * skill in this spell's school:
     *    expert:  2% intervals; skilled: 5%; basic: 10%; unskilled: 25%.
     * skill = max(P_SKILL(spell_skilltype(spellid(idx))), P_UNSKILLED).
     */
    const otyp = sb.sp_id;
    const idx = otyp - SPBOOK_FIRST_OTYP;
    let skill_type = (idx >= 0 && idx < SPBOOK_OC_SKILL.length)
        ? SPBOOK_OC_SKILL[idx] : 0;
    /* C ref: role.c:2087-2088 — Priest rewrites light's oc_skill to CLERIC. */
    const initrole = (game.flags?.initrole ?? -1) | 0;
    if (initrole === ROLE_CLERIC && otyp === SPE_LIGHT)
        skill_type = P_CLERIC_SPELL;
    const skill = spell_skill(skill_type);
    /* percent = (turnsleft-1)/(KEEN/100) + 1, rounded up to the high end of
     * this skill's interval; range printed as "(percent-accuracy+1)%-percent%".
     * KEEN/100 = 200. */
    let percent = Math.trunc((turnsleft - 1) / 200) + 1;
    const accuracy = (skill === P_EXPERT) ? 2
                   : (skill === P_SKILLED) ? 5
                     : (skill === P_BASIC) ? 10
                       : 25;
    percent = accuracy * (Math.trunc((percent - 1) / accuracy) + 1);
    return `${percent - accuracy + 1}%-${percent}%`;
}

// ── spellet ──────────────────────────────────────────────────────────────────
// C ref: spell.c:107-114 spellet(int spell)
// Map spell index 0..51 to character: a-z, A-Z.
function spellet(spellSlot) {
    if (spellSlot < 26) return String.fromCharCode(97 + spellSlot); /* 'a'..'z' */
    if (spellSlot < 52) return String.fromCharCode(65 + spellSlot - 26); /* 'A'..'Z' */
    return ' ';
}

// ── ANSI gap-collapse helper ────────────────────────────────────────────────
// C tty emits ESC[NC (cursor-forward) for runs of blank cells > 4 wide.
// We pre-format the menu row text and collapse any 5+ space run into the
// equivalent escape sequence.  Smaller gaps (≤4) stay as literal spaces so
// "1   clerical" (3-space gap) is preserved.
// C ref: tty.c tty_putstr/tty_curs — the run-length encoding of blanks.
function collapseGaps(text) {
    return text.replace(/ {5,}/g, (sp) => `\x1b[${sp.length}C`);
}

// ── padLeft / padRight (sprintf %Nd / %-Ns) ──────────────────────────────────
function padR(s, n) { s = String(s); return s.length >= n ? s : s + ' '.repeat(Math.max(0, n - s.length)); }
function padL(s, n) { s = String(s); return s.length >= n ? s : ' '.repeat(Math.max(0, n - s.length)) + s; }

// ── spellknow ────────────────────────────────────────────────────────────────
// C ref: spell.h:33 — #define spellknow(spell) svs.spl_book[spell].sp_know
function spellknow(spellSlot) {
    const sb = (game.spl_book || [])[spellSlot];
    return sb ? (sb.sp_know | 0) : 0;
}

// C ref: spell.c:8-11 — dospellmenu()'s `splaction` sentinels.  Any value >= 0
// is an svs.spl_book[] index (the "swap with" pass); the three negatives are
// the display modes. SPELLMENU_SORT is MAXSPELL (objclass.h), used as the
// a_int of the "[sort spells]" pseudo-entry.
const SPELLMENU_DUMP = -3;
const SPELLMENU_CAST = -2;
const SPELLMENU_VIEW = -1;
const SPELLMENU_SORT = MAXSPELL;

// C ref: the `wizard` global (decl.h) — this port's playmode:debug flag,
// js/options.js:62-63 `OPTIONS=playmode:debug` -> flags.debug.  Same derivation
// as js/teleport.js:418.
function _wizard() { return !!(game.flags && game.flags.debug); }

// ── format_spell_row_raw ─────────────────────────────────────────────────────
// C ref: spell.c:2107 fmt = "%-20s  %2d   %-12s %3d%% %9s"; add_menu() prepends
// "<letter> - ".  Base width 4 + 20 + 2 + 2 + 3 + 12 + 1 + 4 + 1 + 9 = 58.
// C ref: spell.c:2124-2126 — under `wizard`, Sprintf(eos(buf), "%c%6d", sep,
// spellknow(i)) appends a right-aligned 6-wide "turns" column (sep is ' ' when
// iflags.menu_tab_sep is off, spell.c:2110), widening the row to 65.
//
// UPSTREAM BUG, PORTED AS-IS (Cardinal Rule 1): spell.c:2118-2122 indexes every
// other field of the row by `splnum` (the sort-mapped slot from spell.c:2117
// `splnum = !gs.spl_orderindx ? i : gs.spl_orderindx[i]`), but spell.c:2125
// indexes the wizard turns column by the LOOP variable `i`.  The two diverge
// only once gs.spl_orderindx is non-NULL, which C does at spell.c:1930-1971
// (sortspells, reached only through the [sort spells] entry).  The `i`/`splnum`
// split is kept explicit here so the bug stays faithful if spl_orderindx is
// ever populated.
//
// Returns the RAW row: no SGR attributes and no blank-run collapsing, so the
// caller can measure the true printed width before rendering (C's tty computes
// the menu's offx from the printed width — see dospellmenu_render below).
function format_spell_row_raw(i, splnum) {
    const sb = (game.spl_book || [])[splnum];
    if (!sb) return '';
    const otyp = sb.sp_id;
    const idx = otyp - SPBOOK_FIRST_OTYP;
    const name = (idx >= 0 && idx < SPBOOK_NAMES.length) ? SPBOOK_NAMES[idx] : '';
    const level = (idx >= 0 && idx < SPBOOK_OC_LEVEL.length) ? SPBOOK_OC_LEVEL[idx] : 1;
    let skill_type = (idx >= 0 && idx < SPBOOK_OC_SKILL.length) ? SPBOOK_OC_SKILL[idx] : 0;
    /* C ref: role.c:2088 Priest rewrites light's oc_skill to P_CLERIC_SPELL. */
    const initrole = (game.flags?.initrole ?? -1) | 0;
    if (initrole === ROLE_CLERIC && otyp === SPE_LIGHT) {
        skill_type = P_CLERIC_SPELL;
    }
    const category = spelltypemnemonic(skill_type);
    const fail = 100 - percent_success(splnum);
    const retention = spellretention(splnum);
    /* C ref: spell.c:2107 fmt — the "<letter> - " prefix is NOT part of fmt;
     * add_menu() prepends it (spell.c:2129), so the caller adds it here. */
    let row = `${padR(name, 20)}  ${padL(level, 2)}   ${padR(category, 12)} ${padL(fail, 3)}% ${padL(retention, 9)}`;
    if (_wizard())
        row += ' ' + padL(spellknow(i), 6); /* C ref: spell.c:2125 "%c%6d", sep=' ' */
    return row;
}

// ── dospellmenu ──────────────────────────────────────────────────────────────
// C ref: spell.c:2075-2168 dospellmenu(const char *prompt, int splaction,
//                                      int *spell_no)
// "shows menu of known spells, with options to sort them.  return FALSE on
//  cancel, TRUE otherwise.  spell_no is set to the internal spl_book index, if
//  any selected" (spell.c:2071-2073).
//
// Returns { ok: boolean, spell_no: int } — `ok` is C's boolean return and
// `spell_no` is C's *spell_no out-parameter.
//
// PICK_ONE vs PICK_NONE and the "[sort spells]" entry are C ref spell.c:2136-2149.
async function dospellmenu(prompt, splaction) {
    const g = game;
    const spl_book = g.spl_book || [];
    /* C ref: spell.c:2117 — gs.spl_orderindx is NULL until sortspells()
     * allocates it; this port never populates it (see spellsortmenu below), so
     * the identity mapping is the only branch reached today. */
    const spl_orderindx = g.spl_orderindx || null;

    /* C ref: spell.c:2102-2115 — heading (iflags.menu_tab_sep OFF):
     *   Sprintf(buf, "%s%-20s Level %-12s Fail Retention",
     *           splaction == SPELLMENU_DUMP ? "" : "    ", "Name", "Category")
     * then, under `wizard`, Sprintf(eos(buf), "%c%6s", sep, "turns"). */
    let headingRaw = (splaction === SPELLMENU_DUMP ? '' : '    ')
        + padR('Name', 20) + ' Level ' + padR('Category', 12) + ' Fail Retention';
    if (_wizard())
        headingRaw += ' ' + padL('turns', 6); /* C ref: spell.c:2115 "%c%6s" */

    /* C ref: spell.c:2116-2133 — one menu entry per known spell.  The loop
     * bound is `i < MAXSPELL && spellid(i) != NO_SPELL`; this port's spl_book
     * holds exactly the known spells, so its length is that bound. */
    const items = []; /* { accel, raw, a_int } — a_int is C's any.a_int */
    for (let i = 0; i < MAXSPELL && i < spl_book.length; i++) {
        if ((spl_book[i].sp_id | 0) === NO_SPELL) break;
        const splnum = !spl_orderindx ? i : spl_orderindx[i];
        items.push({
            accel: spellet(splnum),
            raw: format_spell_row_raw(i, splnum),
            a_int: splnum + 1, /* C ref: spell.c:2128 "must be non-zero" */
        });
    }

    /* C ref: spell.c:2136-2149 */
    let how = 'PICK_ONE';
    if (splaction === SPELLMENU_VIEW) {
        if (items.length < 2) {
            /* C ref: spell.c:2138-2140 — spellid(1) == NO_SPELL, i.e. only one
             * spell => nothing to swap with => PICK_NONE. */
            how = 'PICK_NONE';
        } else {
            /* C ref: spell.c:2142-2147 — extra '+' entry, a_int SPELLMENU_SORT+1. */
            items.push({ accel: '+', raw: '[sort spells]', a_int: SPELLMENU_SORT + 1 });
        }
    }

    const n = await dospellmenu_render_and_read(prompt, headingRaw, items, how);

    /* C ref: spell.c:2154-2168 — select_menu's return is turned into the
     * boolean result and *spell_no.
     *
     * KNOWN GAP: C's `n > 1` de-selection arms (spell.c:2158-2160 and the
     * a_int fixup) need a multi-select-capable menu; this reader is single
     * selection only, so n is 0 or 1 and those arms are dead here.  They are
     * kept in the control flow below so the shape stays C's. */
    if (n.count > 0) {
        let spell_no = n.picked - 1;
        /* C ref: spell.c:2161-2164 — "default selection of preselected spell
         * means that user chose not to swap it with anything". */
        if (spell_no === splaction)
            return { ok: false, spell_no };
        return { ok: true, spell_no };
    } else if (splaction >= 0) {
        /* C ref: spell.c:2165-2167 — explicit de-selection of the preselected
         * spell means the user is still swapping, but not for this spell. */
        return { ok: true, spell_no: splaction };
    }
    return { ok: false, spell_no: -1 };
}

// ── dospellmenu's window: render + select_menu key loop ──────────────────────
// C ref: spell.c:2150-2153 — end_menu(tmpwin, prompt); select_menu(tmpwin, how,
// &selected); destroy_nhwindow(tmpwin).  Renders the picklist over the map and
// runs the tty selection loop.  Returns { count, picked } mirroring select_menu's
// return count and selected[0].item.a_int.
//
// No RNG is consumed anywhere on this path (C ref: spell.c:2075-2168 contains no
// rn2/rnd/d/rne/rnz call, and neither does the tty menu loop).
async function dospellmenu_render_and_read(prompt, headingRaw, items, how) {
    const g = game;

    /* Raw (printed-width) lines drive the window geometry; the display lines
     * add SGR attributes and collapse blank runs into ESC[NC.               */
    const rawLines = [prompt, '', headingRaw, ...items.map((it) => `${it.accel} - ${it.raw}`), '(end)'];
    const windowLines = [
        `\x1b[7m${prompt}\x1b[0m`,
        '',
        `\x1b[7m${collapseGaps(headingRaw)}\x1b[0m`,
        ...items.map((it) => collapseGaps(`${it.accel} - ${it.raw}`)),
        '(end)',
    ];

    const WIN_COL = tty_window_offx(rawLines, 'end');

    /* C ref: tty_display_nhwindow + build_window_screen — render menu over map. */
    const uac = g.u?.uac ?? 0;
    const screenOutput = build_window_screen(windowLines, WIN_COL, uac);
    g._screen_output = screenOutput;

    /* Cursor parks after "(end)": WIN_COL + len("(end)") + 1. */
    const endRow = windowLines.length - 1;
    const endCursorCol = WIN_COL + 5 + 1;
    const disp = g.nhDisplay;
    if (disp) {
        disp.cursorCol = endCursorCol;
        disp.cursorRow = endRow;
    }

    /* C ref: select_menu -> tty_select_menu's key loop.  A PICK_ONE picklist
     * ends as soon as an accelerator is struck; MENU_SELECT/ESC/newline and a
     * next-page request on the last page all end it with nothing selected.  An
     * unrecognised key rings the bell and re-reads without redrawing — no
     * screen change and no events, which is C's behaviour for a key bound to
     * nothing in a picklist.
     *
     * KNOWN GAP: the scroll/page accelerators ('>', '<', MENU_FIRST_PAGE, etc.)
     * and the PICK_ANY group commands are not modelled.  A spell picklist fits
     * one tty page while its entry count plus the prompt/blank/heading/footer
     * rows stay within the 24-row screen, and on a single page '>' is a no-op
     * and the next-page keys collapse into the dismiss below.  A spellbook
     * large enough to paginate (objclass.h MAXSPELL is 42 in the pinned build)
     * would need real paging. */
    for (;;) {
        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        if (key === 27 /* ESC — C ref: tty menu cancel */)
            return { count: 0, picked: 0 };
        if (ch === ' ' || ch === '\n' || ch === '\r')
            /* Confirm/dismiss: single-page menu with nothing selected. */
            return { count: 0, picked: 0 };
        const hit = items.find((it) => it.accel === ch);
        if (hit)
            /* PICK_ONE/PICK_NONE both terminate on an accelerator; PICK_NONE
             * has no accelerators registered, so `hit` is never set there. */
            return { count: 1, picked: hit.a_int };
        if (how === 'PICK_NONE')
            /* C ref: a PICK_NONE picklist is display-only — any other key just
             * re-reads (the dismiss keys above already returned). */
            continue;
        /* Unrecognised accelerator: bell, no redraw, read again. */
    }
}

// ── spl_sortchoices / spellsortmenu ──────────────────────────────────────────
// C ref: spell.c:1855-1866 spl_sortchoices[NUM_SPELL_SORTBY], indexed by the
// spl_sort_types enum at spell.c:1841-1852.
const SORTBY_LETTER = 0;
const SORTRETAINORDER = 8;
const SPL_SORTCHOICES = [
    'by casting letter',
    'alphabetically',
    'by level, low to high',
    'by level, high to low',
    'by skill group, alphabetized within each group',
    'by skill group, low to high level within group',
    'by skill group, high to low level within group',
    'maintain current ordering',
    /* C ref: spell.c:1864 "a menu choice rather than a sort choice" */
    'reassign casting letters to retain current order',
];

// C ref: spell.c:1975-2016 spellsortmenu() — "called if the [sort spells] entry
// in the view spells menu gets chosen".  Returns TRUE when a choice was picked.
//
// KNOWN GAP (render fidelity): spell.c:2001-2002 preselects the entry matching
// the current gs.spl_sortmode (MENU_ITEMFLAGS_SELECTED), and the tty marker for
// a preselected picklist entry is not modelled here, so this window's exact
// appearance is best-effort rather than verified.  What IS C-shaped is the key
// consumption — spell.c:2007 select_menu(tmpwin, PICK_ONE, &selected) reads
// exactly one selection, so reaching this arm cannot desynchronise the keystroke
// stream.  spell.c:1975-2016 contains no rn2/rnd/d/rne/rnz call, so it cannot
// perturb the RNG sequence either (Cardinal Rule 2).
async function spellsortmenu() {
    /* C ref: spell.c:1986-2005 — letters are 'a'+i except SORTRETAINORDER,
     * which is 'z' and is preceded by a blank separator line
     * (spell.c:1990-1993 add_menu_str(tmpwin, "")). */
    const items = [];
    for (let i = 0; i < SPL_SORTCHOICES.length; i++) {
        const accel = (i === SORTRETAINORDER) ? 'z' : String.fromCharCode(97 + i);
        items.push({ accel, raw: SPL_SORTCHOICES[i], a_int: i + 1, sep: i === SORTRETAINORDER });
    }
    const rawLines = ['View known spells list sorted', '',
        ...items.map((it) => `${it.accel} - ${it.raw}`), '(end)'];
    const windowLines = [
        '\x1b[7mView known spells list sorted\x1b[0m',
        '',
        ...items.flatMap((it) => it.sep
            ? ['', collapseGaps(`${it.accel} - ${it.raw}`)]
            : [collapseGaps(`${it.accel} - ${it.raw}`)]),
        '(end)',
    ];
    const WIN_COL = tty_window_offx(rawLines, 'end');
    const g = game;
    g._screen_output = build_window_screen(windowLines, WIN_COL, g.u?.uac ?? 0);
    const disp = g.nhDisplay;
    if (disp) {
        disp.cursorCol = WIN_COL + 5 + 1;
        disp.cursorRow = windowLines.length - 1;
    }

    /* C ref: spell.c:2007-2016 select_menu(tmpwin, PICK_ONE, &selected). */
    for (;;) {
        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r')
            return false; /* C ref: spell.c:2016 return FALSE */
        const hit = items.find((it) => it.accel === ch);
        if (hit) {
            /* C ref: spell.c:2010-2015 — choice = selected[0].item.a_int - 1;
             * the n > 1 preselect-skip arm needs a multi-select menu and is
             * dead for this single-selection reader. */
            game.spl_sortmode = hit.a_int - 1;
            return true;
        }
    }
}

// C ref: spell.c:1930-1972 sortspells() — "sort the index used to display the
// spells list (sortmode == SORTBY_xxx), or sort the spellbook itself to make
// the current display order stick (sortmode == SORTRETAINORDER)".
//
// KNOWN GAP: only the two branches whose result is exactly derivable are
// implemented — the n < 2 early return (spell.c:1936-1938) and the
// SORTBY_LETTER identity ordering (spell.c:1945-1951), which restores
// spl_orderindx[i] = i and returns.  The qsort(spl_orderindx, n, spell_cmp)
// tail (spell.c:1968-1970) and the SORTRETAINORDER spellbook rewrite
// (spell.c:1954-1966) are NOT implemented: spell_cmp (spell.c:1870-1926) breaks
// ties by falling through to a name comparison, and C's qsort is not a stable
// sort, so the surviving permutation for equal keys is libc-defined and cannot
// be reproduced without pinning that qsort.  Under those modes the display
// order is left as the identity rather than guessed.  RNG-free either way
// (spell.c:1930-1972 contains no rn2/rnd/d/rne/rnz call), so this gap cannot
// perturb the RNG sequence — it can only leave the menu in letter order.
function sortspells() {
    const g = game;
    const n = num_spells();
    if (n < 2) /* C ref: spell.c:1936-1938 */
        return;
    if (!g.spl_orderindx) {
        /* C ref: spell.c:1940-1943 */
        g.spl_orderindx = [];
        for (let i = 0; i < MAXSPELL; i++)
            g.spl_orderindx[i] = i;
    }
    if (g.spl_sortmode === SORTBY_LETTER || g.spl_sortmode === SORTRETAINORDER) {
        /* C ref: spell.c:1945-1951 — reset to the natural order first. */
        for (let i = 0; i < MAXSPELL; i++)
            g.spl_orderindx[i] = i;
        if (g.spl_sortmode === SORTBY_LETTER)
            return;
    }
    /* KNOWN GAP (see above): SORTRETAINORDER rewrite and the qsort tail. */
}

// ── dovspell ─────────────────────────────────────────────────────────────────
// C ref: spell.c:2019-2052 dovspell() — the '+' / #showspells command.
// GENERALCMD|IFBURIED: returns ECMD_OK, so no turn is consumed, and the whole
// function is RNG-free (spell.c:2019-2052 has no rn2/rnd/d/rne/rnz call).
export async function dovspell() {
    const g = game;
    const spl_book = g.spl_book || [];

    /* C ref: spell.c:2026-2027 — if (spellid(0) == NO_SPELL). */
    if (!spl_book.length || spl_book[0] == null
        || (spl_book[0].sp_id | 0) === NO_SPELL) {
        await pline("You don't know any spells right now.");
    } else {
        /* C ref: spell.c:2029-2047 */
        for (;;) {
            const view = await dospellmenu('Currently known spells', SPELLMENU_VIEW);
            if (!view.ok)
                break;
            if (view.spell_no === SPELLMENU_SORT) {
                /* C ref: spell.c:2032-2034 */
                if (await spellsortmenu())
                    sortspells();
            } else {
                /* C ref: spell.c:2035-2045 — the swap pass: a second
                 * dospellmenu whose splaction is the spl_book index being
                 * moved, then swap the two entries. */
                const qbuf = `Reordering spells; swap '${spellet(view.spell_no)}' with`;
                const oth = await dospellmenu(qbuf, view.spell_no);
                if (!oth.ok)
                    break;
                const tmp = spl_book[view.spell_no];
                spl_book[view.spell_no] = spl_book[oth.spell_no];
                spl_book[oth.spell_no] = tmp;
            }
        }
    }
    /* C ref: spell.c:2048-2051 — free spl_orderindx and reset the sort mode. */
    g.spl_orderindx = null;
    g.spl_sortmode = SORTBY_LETTER;
}

// ── litroom (light-spell side-effect) ───────────────────────────────────────
function litroom_light_spell() {
    const g = game;
    const u = g.u;
    if (!u || !g.level || typeof u.ux !== 'number') return;
    const ux = u.ux | 0, uy = u.uy | 0;
    const RADIUS = 5; /* C ref: read.c:2601 — non-blessed radius=5 */
    const DIRS = [
        [-1,  0], [ 1,  0], [ 0, -1], [ 0,  1],  /* W, E, N, S */
        [-1, -1], [ 1, -1], [-1,  1], [ 1,  1],  /* NW, NE, SW, SE */
    ];
    for (const [dx, dy] of DIRS) {
        for (let r = 1; r <= RADIUS; r++) {
            const x = ux + dx * r;
            const y = uy + dy * r;
            if (x < 1 || x >= 80 || y < 0 || y >= 21) break;
            const loc = g.level.at(x, y);
            if (!loc) break;
            const typ = loc.typ;
            /* CORR (lit by spell): set visible with bright-white '#'. */
            if (typ === CORR) {
                show_glyph_cell(x, y, '#', CLR_WHITE, false);
                if (g.level.flags?.hero_memory) {
                    loc.remembered_glyph = { ch: '#', color: CLR_WHITE, decgfx: false };
                }
                continue;
            }
            /* DOOR is passable (open) but visible already; lit doesn't change
             * its glyph in our renderer.  Continue scanning past it. */
            if (typ === DOOR) {
                continue;
            }
            /* ROOM tiles are already lit in their parent room; nothing extra. */
            if (typ === ROOM) {
                continue;
            }
            /* Solid wall or other non-passable terrain blocks further sight.
             * C litroom would still mark wall tiles lit, but they're already
             * rendered the same; stop scanning past them. */
            break;
        }
    }
}

/* C spell.c:687 — rejection is checked before input selection, and again
 * by spelleffects_check for direct teleport/turn-undead casting callers. */
async function rejectcasting() {
    const u = game.u;
    if (u.uprops?.[STUNNED]?.intrinsic) {
        await pline('You are too impaired to cast a spell.');
        return true;
    } else if (!can_chant(game.youmonst)) {
        await pline('You are unable to chant the incantation.');
        return true;
    } else if (!freehand() && !(u.uwep && u.uwep.otyp === QUARTERSTAFF)) {
        await pline('Your arms are not free to cast!');
        return true;
    }
    return false;
}

/* C spell.c:115; command-queue keys are numeric characters. */
function spell_let_to_idx(ilet) {
    let idx = ilet - 97;
    if (idx >= 0 && idx < 26) return idx;
    idx = ilet - 65;
    if (idx >= 0 && idx < 26) return idx + 26;
    return -1;
}

/* C spell.c:716 — queued, traditional and menu spell selection. */
async function getspell(spell_no) {
    const nspells = num_spells();
    if (!nspells) {
        await pline("You don't know any spells right now.");
        return false;
    }
    if (await rejectcasting()) return false;
    const cmdq = cmdq_pop();
    if (cmdq) {
        if (cmdq.typ === CMDQ_KEY) {
            const idx = spell_let_to_idx(cmdq.key);
            if (idx < 0 || idx >= nspells) return false;
            spell_no.value = idx;
            return true;
        }
        return false;
    }
    if (game.flags.menu_style === MENU_TRADITIONAL) {
        let lets;
        if (nspells === 1) lets = 'a';
        else if (nspells < 27) lets = `a-${String.fromCharCode(97 + nspells - 1)}`;
        else if (nspells === 27) lets = 'a-zA';
        else lets = `a-zA-${String.fromCharCode(65 + nspells - 27)}`;
        const qbuf = `Cast which spell? [${lets} *?]`;
        for (let retry_limit = 0; ; ++retry_limit) {
            if (retry_limit === 10) {
                await pline("That's enough tries.");
                return false;
            }
            const ilet = await yn_function(qbuf, null, 0, true);
            if (ilet === '*' || ilet === '?') break;
            // strchr also matches the terminating NUL in C's quitchars.
            if (' \r\n\x1b\0'.includes(ilet)) {
                await pline('Never mind.');
                return false;
            }
            const idx = spell_let_to_idx(ilet.charCodeAt(0));
            if (idx < 0 || idx >= nspells) {
                await pline("You don't know that spell.");
                continue;
            }
            spell_no.value = idx;
            return true;
        }
    }
    const chosen = await dospellmenu('Choose which spell to cast', SPELLMENU_CAST);
    if (chosen.ok) spell_no.value = chosen.spell_no;
    return chosen.ok;
}

/* C spell.c:820 — return the actual cast outcome; rhack decides time usage. */
export async function docast() {
    const spell_no = { value: 0 };
    if (!await getspell(spell_no)) return ECMD_FAIL;
    cmdq_add_key(CQ_REPEAT, spellet(spell_no.value).charCodeAt(0));
    const res = await spelleffects(game.spl_book[spell_no.value].sp_id, false, false);
    return res;
}

/* C spell.c:785-821 dowizcast() — wizard mode's #wizcast menu deliberately
 * lists every castable spell, independent of the hero's repertoire, then calls
 * spelleffects() with force=TRUE.  This is separate from dospellmenu(), whose
 * entries are indexed through spl_book and whose selection means a known
 * spell slot. */
export async function dowizcast() {
    const menu = new TtyMenu();
    for (let i = 0; i < (SPE_BLANK_PAPER - SPE_DIG); i++)
        menu.add_menu(SPE_DIG + i, 0, ATR_NONE, SPBOOK_NAMES[i]);
    menu.end_menu('Cast which spell?');
    const selected = await menu.select_menu(PICK_ONE);
    if (selected.count <= 0)
        return 0;
    return await spelleffects(selected.picks[0], false, true);
}

// ── spelleffects ─────────────────────────────────────────────────────────────
export async function spelleffects(spell_otyp, atme, force) {
    const spell = force ? spell_otyp : spell_idx(spell_otyp);
    const g = game;
    const u = g.u = g.u || {};
    const spl_book = g.spl_book || [];
    const sb = spl_book[spell];

    /* C spell.c:1388-1396. Forced casts bypass checks and leave energy zero. */
    const res = { value: ECMD_OK }, energyOut = { value: 0 };
    if (!force && await spelleffects_check(spell, res, energyOut))
        return res.value;
    const energy = energyOut.value;

    /* C ref: spell.c:1396-1399 */
    /* C leaves energy at zero when force is TRUE: spelleffects_check is
     * skipped and its local `energy` initializer is 0 (spell.c:1388-1396).
     * Wizard #wizcast therefore does not spend Pw. */
    u.uen = (u.uen | 0) - energy;
    if (g.disp) g.disp.botl = true;
    exercise(A_WIS, true);                 /* spell.c:1399 — rn2(19) */

    /* C ref: spell.c:1401-1404
     *   pseudo = mksobj(force ? spell : spellid(spell), FALSE, FALSE);
     *   pseudo->blessed = pseudo->cursed = 0;
     *   pseudo->quan = 20L;                 (do not let useup get it)
     * init=FALSE, so mksobj_init is skipped and the only RNG mksobj draws for a
     * SPBOOK_CLASS otyp is next_ident()'s rnd(2) (mkobj.c:522; the switch below
     * it has no spellbook arm except SPE_NOVEL, which is not castable). */
    const otyp = force ? (spell | 0) : (sb ? (sb.sp_id | 0) : 0);
    const pseudo = await mksobj(otyp, false, false);
    pseudo.blessed = 0;
    pseudo.cursed = 0;
    pseudo.quan = 20;

    /* C ref: spell.c:1411-1413 — skill = spell_skilltype(otyp) is
     * objects[otyp].oc_skill (weapon.c); role_skill = P_SKILL(skill). */
    const skill = MKOBJ_OC_SKILL[otyp] | 0;
    const role_skill = spell_skill(skill);
    let physical_damage = false;

    switch (otyp) {
    case SPE_FIREBALL:
    case SPE_CONE_OF_COLD:
        if (role_skill >= P_SKILLED) {
            if (await throwspell()) {                       /* spell.c:1422 */
                const cc = { x: u.dx, y: u.dy };            /* spell.c:1423-1424 */
                let n = rnd(8) + 1;                         /* spell.c:1425 */
                while (n--) {
                    if (!u.dx && !u.dy && !u.dz) {          /* spell.c:1427 */
                        const damage = await zapyourself(pseudo, true);
                        if (damage)
                            await losehp(damage, `zapped ${uhim_spell()}self with a spell`, NO_KILLER_PREFIX);
                    } else {
                        await explode(u.dx, u.dy, otyp - SPE_MAGIC_MISSILE + 10,
                                      spell_damage_bonus_sp(Math.trunc(u.ulevel / 2) + 1), 0,
                                      (otyp === SPE_CONE_OF_COLD) ? EXPL_FROSTY : EXPL_FIERY);
                    }
                    u.dx = cc.x + rnd(3) - 2;               /* spell.c:1439-1440 */
                    u.dy = cc.y + rnd(3) - 2;
                    const lv = isok(u.dx, u.dy) ? game.level.at(u.dx, u.dy) : null;
                    if (!lv || !cansee(u.dx, u.dy) || IS_STWALL(lv.typ | 0) || u.uswallow) {
                        /* Spell is reflected back to center */
                        u.dx = cc.x;
                        u.dy = cc.y;
                    }
                }
            }
            break;
        }
        /* FALLTHROUGH — C spell.c:1457 FALLTHRU into the wand-like group. */
    case SPE_FORCE_BOLT:
        if (otyp === SPE_FORCE_BOLT)
            physical_damage = true;         /* spell.c:1461 */
        /* FALLTHROUGH */
    case SPE_SLEEP:
    case SPE_MAGIC_MISSILE:
    case SPE_KNOCK:
    case SPE_SLOW_MONSTER:
    case SPE_WIZARD_LOCK:
    case SPE_DIG:
    case SPE_TURN_UNDEAD:
    case SPE_POLYMORPH:
    case SPE_TELEPORT_AWAY:
    case SPE_CANCELLATION:
    case SPE_FINGER_OF_DEATH:
    case SPE_LIGHT:
    case SPE_DETECT_UNSEEN:
    case SPE_HEALING:
    case SPE_EXTRA_HEALING:
    case SPE_DRAIN_LIFE:
    case SPE_STONE_TO_FLESH:
        /* C ref: spell.c:1479-1513 — the wand-like group. */
        if (oc_dir_of_spell(otyp) !== NODIR) {
            if (otyp === SPE_HEALING || otyp === SPE_EXTRA_HEALING) {
                /* C ref: spell.c:1481-1485 — "healing and extra healing are
                 * actually potion effects, but they've been extended to take a
                 * direction like wands". */
                if (role_skill >= P_SKILLED)
                    pseudo.blessed = 1;
            }
            if (atme) {
                u.dx = 0; u.dy = 0; u.dz = 0;       /* spell.c:1487 */
            } else if (!(await getdir_for_spell())) {
                /* C ref: spell.c:1489-1500 — getdir() cancelled.  C does NOT
                 * abort the cast: it re-uses whatever u.dx/u.dy/u.dz already
                 * held and says so.  (The C comment calls this a FIXME; port
                 * the behaviour, not the wish — Cardinal Rule 1.) */
                await pline('The magical energy is released!');
            }
            if (!u.dx && !u.dy && !u.dz) {
                /* C ref: spell.c:1502-1509 — self-targeted: zapyourself(), NOT
                 * weffects().  This is the arm the emulation got wrong; there
                 * is no weffects() exercise(A_WIS) on this path. */
                let damage = await zapyourself(pseudo, true);
                if (damage) {
                    const buf = `zapped ${uhim_spell()}self with a spell`;
                    if (physical_damage)
                        damage = maybe_half_phys(damage);
                    await losehp(damage, buf, NO_KILLER_PREFIX);
                }
            } else {
                await weffects(pseudo);      /* spell.c:1511 */
            }
        } else {
            await weffects(pseudo);          /* spell.c:1513 */
        }
        update_inventory();                  /* spell.c:1514 */
        break;

    /* C ref: spell.c:1518-1533 — duplicates of scroll effects. */
    case SPE_REMOVE_CURSE:
    case SPE_CONFUSE_MONSTER:
    case SPE_DETECT_FOOD:
    case SPE_CAUSE_FEAR:
    case SPE_IDENTIFY:
    case SPE_CHARM_MONSTER:
        /* high skill yields effect equivalent to blessed scroll */
        if (role_skill >= P_SKILLED)
            pseudo.blessed = 1;
        /* FALLTHROUGH */
    case SPE_MAGIC_MAPPING:
    case SPE_CREATE_MONSTER:
        await seffects(pseudo);
        break;

    /* C ref: spell.c:1536-1548 — duplicates of potion effects. */
    case SPE_HASTE_SELF:
    case SPE_DETECT_TREASURE:
    case SPE_DETECT_MONSTERS:
    case SPE_LEVITATION:
    case SPE_RESTORE_ABILITY:
        /* high skill yields effect equivalent to blessed potion */
        if (role_skill >= P_SKILLED)
            pseudo.blessed = 1;
        /* FALLTHROUGH */
    case SPE_INVISIBILITY:
        await peffects(pseudo);
        break;

    case SPE_CURE_BLINDNESS:
        healup(0, 0, false, true);           /* spell.c:1552 */
        break;
    case SPE_CURE_SICKNESS: {
        /* C ref: spell.c:1554-1568 */
        const was_sick = !!(u.uprops && u.uprops[SICK] && u.uprops[SICK].intrinsic);
        const was_slimed = !!(u.uprops && u.uprops[SLIMED] && u.uprops[SLIMED].intrinsic);
        healup(0, 0, true, false);
        if (was_sick || !was_slimed)
            await pline(`You are ${was_sick ? 'no longer' : 'not'} ill.`);
        if (was_slimed) {
            /* UNPORTED: make_slimed(0L, "The slime disappears!") */
        }
        break;
    }
    case SPE_CREATE_FAMILIAR:
        /* C spell.c:1569-1570 — spell familiars use the spell arm of
         * make_familiar: no figurine object, current hero square, and no
         * quiet suppression. */
        await make_familiar(null, u.ux, u.uy, false);
        break;
    case SPE_CLAIRVOYANCE:
        /* C spell.c:1573-1582 — blocked clairvoyance performs no scan and
         * only reports the wizard's cornuthaum; otherwise skilled casting
         * marks the fake spellbook blessed so monsters are revealed too. */
        if (!(u.uprops?.[CLAIRVOYANT]?.blocked | 0)) {
            if (role_skill >= P_SKILLED)
                pseudo.blessed = 1;
            await do_vicinity_map(pseudo);
        } else if ((u.uarmh?.otyp | 0) === CORNUTHAUM)
            await pline(`You sense a pointy hat on top of your ${body_part(HEAD)}.`);
        break;
    case SPE_PROTECTION:
        await cast_protection();
        break;
    case SPE_JUMPING:
        /* C ref: spell.c:1584-1586 — magical jump uses the same jump()
         * implementation as #jump, with the current skill as its range.
         * jump() returns ECMD_TIME when the spell consumed the turn; C emits
         * nothing_happens for the non-time result. */
        if (!((await jump(Math.max(role_skill, 1))) & 1))
            await pline('Nothing happens.');
        break;
    case SPE_CHAIN_LIGHTNING:
        /* UNPORTED: cast_chain_lightning() — spell.c:1589. */
        break;
    default:
        /* C ref: spell.c:1591-1594 impossible("Unknown spell %d attempted.") */
        break;
    }

    /* C spell.c:1597-1601 — practice is the spell's level, not proficiency.
     * Forced casts skip practice; failed/refused casts already returned. */
    if (!force)
        await use_skill(skill, sb.sp_lev);
    // obfree(pseudo, NULL) is handled by JS garbage collection.
    return 1 /* ECMD_TIME */;
}

function oc_dir_of_spell(otyp) {
    const idx = (otyp | 0) - SPBOOK_FIRST_OTYP;
    return (idx >= 0 && idx < SPBOOK_OC_DIR.length) ? SPBOOK_OC_DIR[idx] : NODIR;
}

async function getdir_for_spell() {
    game._screen_output = null;
    return await getdir(null);
}

/* C ref: zap.c:3480 spell_damage_bonus (zap.js's copy is an identity stub). */
function spell_damage_bonus_sp(dmg) {
    const intell = acurr_real(1 /* A_INT */);
    const lvl = game.u.ulevel | 0;
    if (intell <= 9) {
        if (dmg > 1)
            dmg = (dmg <= 3) ? 1 : dmg - 3;
    } else if (intell <= 13 || lvl < 5) {
        /* no bonus or penalty */
    } else if (intell <= 18)
        dmg += 1;
    else if (intell <= 24 || lvl < 14)
        dmg += 2;
    else
        dmg += 3;
    return dmg;
}

/* C ref: spell.c:1604-1612 spell_aim_step */
function spell_aim_step(_arg, x, y) {
    if (!isok(x, y))
        return false;
    const t = game.level.at(x, y).typ | 0;
    const lv = game.level.at(x, y);
    return !(!ZAP_POS(t) && !(IS_DOOR(t) && ((lv.doormask | 0) & D_ISOPEN)));
}

/* C ref: spell.c:1617-1623 can_center_spell_location */
function can_center_spell_location(x, y) {
    const u = game.u;
    if (distmin(u.ux, u.uy, x, y) > 10)
        return false;
    return isok(x, y) && !!cansee(x, y) && !IS_STWALL(game.level.at(x, y).typ | 0);
}

/* C ref: spell.c:1653-1700 throwspell — choose location where spell takes
 * effect.  The getpos_sethilite highlight (display_spell_target_positions,
 * spell.c:1625-1651) is cosmetic and not modelled, as in seffect_fire. */
async function throwspell() {
    const u = game.u;
    if (u.uinwater) {
        await pline("You're joking!  In this weather?");
        return 0;
    } else if (Is_waterlevel(u.uz)) {
        await pline('You had better wait for the sun to come out.');
        return 0;
    }
    await pline('Where do you want to cast the spell?');
    const cc = { x: u.ux, y: u.uy };
    await getpos_sethilite(null, can_center_spell_location);
    if ((await getpos(cc, true, 'the desired position')) < 0)
        return 0; /* user pressed ESC */
    /* clear_nhwindow(WIN_MESSAGE): discard any autodescribe feedback */
    if (distmin(u.ux, u.uy, cc.x, cc.y) > 10) {
        await pline('The spell dissipates over the distance!');
        return 0;
    } else if (u.uswallow) {
        await pline('The spell is cut short!');
        exercise(A_WIS, false);
        u.dx = 0;
        u.dy = 0;
        return 1;
    }
    let mtmp;
    if (((cc.x !== u.ux || cc.y !== u.uy) && !cansee(cc.x, cc.y)
         && (!(mtmp = m_at(cc.x, cc.y)) || !canspotmon(mtmp)))
        || IS_STWALL(game.level.at(cc.x, cc.y).typ | 0)) {
        await pline('Your mind fails to lock onto that location!');
        return 0;
    }
    const uc = { x: u.ux, y: u.uy };
    await walk_path(uc, cc, spell_aim_step, null);
    u.dx = cc.x;
    u.dy = cc.y;
    return 1;
}

/* C ref: hack.h uhim() — the objective pronoun for the hero, used only to build
 * the killer string "zapped himself/herself with a spell". */
function uhim_spell() {
    return (game.flags?.female) ? 'her' : 'him';
}

/* C ref: attrib.h Maybe_Half_Phys(dmg) = Half_physical_damage ? ((dmg)+1)/2
 * : (dmg).  Half_physical_damage is unported tree-wide (js/mhitu.js:1486,
 * js/wizcmds.js:115 both say so); with no source of it, C's own expression
 * reduces to dmg. */
function maybe_half_phys(dmg) {
    return dmg;
}

// ────────────────────────────────────────────────────────────────────────────
// initialspell(struct obj *obj) — Learn a spell during creation of initial inventory
// C ref: nethack-c/src/spell.c:2339-2360
/**
 * Learn a spell during creation of the initial inventory.
 *
 * C ref: spell.c:2339-2360 initialspell()
 * @param {object} obj - spellbook object with .otyp field
 */
export async function initialspell(obj) {
    const g = game;
    const otyp = obj.otyp | 0;
    const spl = g.spl_book || (g.spl_book = []);

    let i;
    for (i = 0; i < MAXSPELL; i++) {
        const sb = spl[i];
        const id = sb ? (sb.sp_id | 0) : 0;
        if (id === NO_SPELL || id === otyp) break;
    }

    if (i === MAXSPELL) {
        await impossible("Too many spells memorized!");
    } else {
        const sb = spl[i];
        const id = sb ? (sb.sp_id | 0) : 0;
        if (id !== NO_SPELL) {
            /* initial inventory shouldn't contain duplicate spellbooks */
            await impossible("Spell %s already known.", OC_NAME[otyp]);
        } else {
            /* C: svs.spl_book[i].sp_id = otyp;
               svs.spl_book[i].sp_lev = objects[otyp].oc_level;
               incrnknow(i, 0);  — sets sp_know = KEEN + 0 */
            while (spl.length <= i) spl.push({ sp_id: 0, sp_lev: 0, sp_know: 0 });
            if (!spl[i]) spl[i] = { sp_id: 0, sp_lev: 0, sp_know: 0 };
            spl[i].sp_id = otyp;
            spl[i].sp_lev = _spbook_oc(otyp, SPBOOK_OC_LEVEL);
            incrnknow(i, 0);
        }
    }
}

// ────────────────────────────────────────────────────────────────────────────
// known_spell(short otyp) — Return spell knowledge status
// C ref: nethack-c/src/spell.c:2362-2375
/**
 * Determine the knowledge status of a spell by otyp (object type).
 * Returns one of: spe_Unknown, spe_Fresh, spe_GoingStale, spe_Forgotten.
 *
 * C ref: spell.c:2362-2375 known_spell()
 * @param {number} otyp - spell object type (366-407 for spellbooks)
 * @returns {number} spell knowledge status (-1, 0, 1, or 2)
 */
export function known_spell(otyp) {
    otyp = (otyp << 16) >> 16; // C short parameter.
    const spl_book = game.spl_book || [];

    // C ref: spell.c:2367 for (i = 0; (i < MAXSPELL) && (spellid(i) != NO_SPELL); i++)
    for (let i = 0; i < MAXSPELL && i < spl_book.length; i++) {
        const sb = spl_book[i];
        if (!sb || sb.sp_id == null || sb.sp_id === NO_SPELL) break;

        // C ref: spell.c:2368 if (spellid(i) == otyp)
        if (sb.sp_id === otyp) {
            const k = sb.sp_know | 0;  // C ref: spell.c:2369 k = spellknow(i)
            // C ref: spell.c:2370-2372 return (k > KEEN / 10) ? spe_Fresh : ...
            return (k > (KEEN / 10 | 0)) ? spe_Fresh
                 : (k > 0) ? spe_GoingStale
                   : spe_Forgotten;
        }
    }

    return spe_Unknown;  // C ref: spell.c:2374
}

/* C spell.c:2379 — return the first known slot for an object type. */
export function spell_idx(otyp) {
    otyp = (otyp << 16) >> 16; // C short parameter.
    const spl_book = game.spl_book || [];
    for (let i = 0; i < MAXSPELL && i < spl_book.length; i++) {
        const sb = spl_book[i];
        if (!sb || sb.sp_id == null || sb.sp_id === NO_SPELL) break;
        if (sb.sp_id === otyp) return i;
    }
    return UNKNOWN_SPELL;
}

// ────────────────────────────────────────────────────────────────────────────
// book_cursed(struct obj *book) — Handle cursed book during learning
// C ref: nethack-c/src/spell.c:342-351
/**
 * Check if a cursed spellbook is being read and handle the interruption.
 * If the book is cursed and the player is currently learning from it
 * with gm.multi >= 0, the book slams shut, mark it as known, and stop learning.
 *
 * C ref: spell.c:342-351 book_cursed()
 * @param {object} book - spellbook object with cursed/bknown fields
 */
export function book_cursed(book) {
    const g = game;

    // C ref: spell.c:345-350
    // The learn() function is not yet ported; when it is, g.occupation will be
    // set to the learn function reference. Until then, the condition is always false
    // because g.occupation will never equal an unported function stub.
    // if (book->cursed && gm.multi >= 0
    //     && go.occupation == learn && svc.context.spbook.book == book)

    if (!book.cursed) return;
    if (g.multi < 0) return;

    // C compares against the actual learn occupation function installed by
    // study_book_learn(), not a per-call placeholder.  A fresh stub here made
    // this entire interruption branch unreachable.
    if (g.occupation !== learn) return;

    // but accessed plainly without guards as per C source
    if (g.context.spbook.book !== book) return;

    // C ref: spell.c:347 pline("%s shut!", Tobjnam(book, "slam"));
    const objname = Tobjnam_real(book, 'slam');
    pline(`${objname} shut!`);

    // C ref: spell.c:348 set_bknown(book, 1);
    set_bknown_real(book, 1);

    // C ref: spell.c:349 stop_occupation().  book_cursed() is synchronous in
    // C and is called from mkobj.c:curse(), so perform the studying-specific
    // state transition here rather than awaiting allmain.stop_occupation(),
    // whose meal-finalization path is intentionally asynchronous in JS.
    g.occupation = null;
    if (g.disp) g.disp.botl = 1;
    nomul(0);
}

// ────────────────────────────────────────────────────────────────────────────
// book_disappears(struct obj *obj) — Clear book context when spellbook disappears
// C ref: nethack-c/src/spell.c:367-373
/**
 * If the disappearing object is the current spellbook being studied,
 * clear the context so the game knows the book is gone.
 *
 * C ref: spell.c:367-373 book_disappears()
 * @param {object} obj - the spellbook object that is disappearing
 */
export function book_disappears(obj) {
    const g = game;
    g.context = g.context || {};
    const sp = g.context.spbook = g.context.spbook || { book: null, o_id: 0, delay: 0 };
    if (obj === sp.book) {
        sp.book = null;
        sp.o_id = 0;
    }
}

// ────────────────────────────────────────────────────────────────────────────
// spell_skilltype(int booktype) — Return spell skill type
// C ref: nethack-c/src/spell.c:855-859
/**
 * Return the skill type (oc_skill) for a spellbook object type.
 *
 * C ref: spell.c:855-859 spell_skilltype()
 * @param {number} booktype - spellbook object type
 * @returns {number} skill type (from objects[booktype].oc_skill)
 */
export function spell_skilltype(booktype) {
    // C ref: spell.c:858 return objects[booktype].oc_skill;
    // objects.oc_skill is indexed by otyp; MKOBJ_OC_SKILL provides the table.
    let skill = MKOBJ_OC_SKILL[booktype | 0] | 0;
    /* C ref: role.c:2087-2088 — for Priest, objects[SPE_LIGHT].oc_skill is
     * rewritten from P_DIVINATION_SPELL to P_CLERIC_SPELL at game start. */
    const initrole = (game.flags.initrole !== undefined) ? (game.flags.initrole | 0) : -1;
    if (initrole === ROLE_CLERIC && (booktype | 0) === SPE_LIGHT) {
        skill = P_CLERIC_SPELL;
    }
    return skill;
}

/* C spell.c:864 — recognition follows live skill, including later advances. */
export function skill_based_spellbook_id() {
    if (game.urole?.mnum !== PM_WIZARD)
        return;
    const SPBOOK_CLASS = 10;
    for (let booktype = MKOBJ_SVB_BASES[SPBOOK_CLASS];
         booktype < MKOBJ_SVB_BASES[SPBOOK_CLASS + 1]; booktype++) {
        const skill = spell_skilltype(booktype);
        if (skill === P_NONE)
            continue;
        let known_up_to_level;
        switch (P_SKILL(skill)) {
        case P_BASIC: known_up_to_level = 3; break;
        case P_SKILLED: known_up_to_level = 5; break;
        case P_EXPERT:
        case P_MASTER:
        case P_GRAND_MASTER: known_up_to_level = 7; break;
        case P_UNSKILLED:
        default: known_up_to_level = game.u.uroleplay?.pauper ? 0 : 1; break;
        }
        if (_spbook_oc(booktype, SPBOOK_OC_LEVEL) <= known_up_to_level)
            discover_object(booktype, true, false, false);
    }
}

// C spell.c:1103 cast_protection — diminishing AC gain and timed decay.
export async function cast_protection() {
    const u = game.u;
    let level = u.ulevel | 0, loglev = 0;
    while (level) { loglev++; level = Math.trunc(level / 2); }
    const protection = u.uspellprot | 0;
    const natac = Math.trunc((10 - ((u.uac | 0) + protection)) / 10);
    const gain = loglev - Math.trunc(protection / (4 - Math.min(3, natac)));
    if (gain <= 0) {
        await pline('Your skin feels warm for a moment.');
        return;
    }
    if (!Blind()) {
        const golden = hcolor('golden');
        if (protection) {
            await pline(`The ${golden} haze around you becomes more dense.`);
        } else {
            const pm = u.ustuck?.data;
            const typ = game.level.at(u.ux, u.uy).typ;
            const atmosphere = pm && u.uswallow
                ? (pm.pmidx === PM_FOG_CLOUD ? 'mist'
                    : pm.mlet === 22 || pm.pmidx === PM_AIR_ELEMENTAL ? 'maelstrom'
                    : dmgtype_fromattack(pm, 28 /* AD_WRAP */, 11 /* AT_ENGL */) ? 'folds'
                    : (pm.mflags1 & 0x00040000 /* M1_ANIMAL */) ? 'maw' : 'ooze')
                : u.uinwater ? hliquid('water') : typ === CLOUD ? 'cloud'
                    : IS_TREE(typ) ? 'vegetation' : IS_STWALL(typ) ? 'stone' : 'air';
            await pline(`The ${atmosphere} around you begins to shimmer with ${an(golden)} haze.`);
        }
    }
    u.uspellprot = protection + gain;
    u.uspmtime = spell_skill(spell_skilltype(SPE_PROTECTION)) === P_EXPERT ? 20 : 10;
    if (!u.usptime) u.usptime = u.uspmtime;
    find_ac();
}
