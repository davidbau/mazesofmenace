// @ts-nocheck
// skills.js — the weapon/spell SKILL subsystem: weapon.c's skill_init(), the
// per-skill name/level formatting, and the `#enhance' extended command.
//
// C ref: nethack-c-v5/upstream/src/weapon.c:1738 skill_init,
//        :1092 skill_level_name, :1125 skill_name, :1129 slots_required,
//        :1170 could_advance, :1186 peaked_skill, :1198 skill_advance,
//        :1226 skill_ranges, :1230 add_skills_to_menu, :1329 enhance_weapon_skill;
//        nethack-c-v5/upstream/src/u_init.c:257-560 Skill_* tables,
//        :1404 skill_init(skills_for_role()).
//
// WHY THIS FILE EXISTS: `u.weapon_skills` had NO WRITER anywhere in the port.
// js/uhitm.js (can_advance, weapon_hit_bonus), js/cmd.js (riding, bow) and
// js/spell.js all READ it and each carries its own "may be populated by a
// future skill-tracking port" fallback.  skill_init() below is that writer.
//
// RNG: the whole file is RNG-FREE.  weapon.c's skill code contains no
// rn2/rnd/d/rne/rnz call, and neither does the tty menu loop it drives.
//
// Practice is maintained by the canonical use_skill() in js/uhitm.js.
// Its caller coverage is separate from skill_init/menu coverage: spell casting
// and level-change skill-slot wiring still have explicit gaps in their callers.
import { game } from './gstate.js';
import { impossible } from './pline.js';
import { skill_based_spellbook_id } from './spell.js';
import { flush_screen, docrt, force_more, docorner_blank_utf8_captures, status_r1_menu_docrt } from './display.js';
import { pline } from './pline.js';
import { topl_park_cursor } from './display.js';
import { nhgetch } from './input.js';
import { yn_function } from './cmd.js';
import { OC_NAME } from './oc_name_data.js';
import { is_ammo } from './cmd.js';
import { build_window_screen, menu_search_case, menu_search_docorner } from './com_pager.js';
import { menu_heading_text } from './tty_menu.js';
import { PM_PONY } from './pm.generated.js';
import { ROLE_PM_MNUM } from './roles.js';
import { weapon_type, can_advance, slots_required, skill_name, skill_level_name } from './weapon.js';
import {
    P_NONE, P_DAGGER, P_KNIFE, P_AXE, P_PICK_AXE, P_SHORT_SWORD, P_BROAD_SWORD,
    P_LONG_SWORD, P_TWO_HANDED_SWORD, P_SABER, P_CLUB, P_MACE, P_MORNING_STAR,
    P_FLAIL, P_HAMMER, P_QUARTERSTAFF, P_POLEARMS, P_SPEAR, P_TRIDENT, P_LANCE,
    P_BOW, P_SLING, P_CROSSBOW, P_DART, P_SHURIKEN, P_BOOMERANG, P_WHIP,
    P_UNICORN_HORN, P_ATTACK_SPELL, P_HEALING_SPELL, P_DIVINATION_SPELL,
    P_ENCHANTMENT_SPELL, P_CLERIC_SPELL, P_ESCAPE_SPELL, P_MATTER_SPELL,
    P_BARE_HANDED_COMBAT, P_TWO_WEAPON_COMBAT, P_RIDING, P_NUM_SKILLS,
    P_FIRST_WEAPON, P_LAST_WEAPON, P_FIRST_SPELL, P_LAST_SPELL,
    P_FIRST_H_TO_H, P_LAST_H_TO_H, P_MARTIAL_ARTS, P_SKILL_LIMIT,
    P_ISRESTRICTED, P_UNSKILLED, P_BASIC, P_SKILLED, P_EXPERT, P_MASTER,
    P_GRAND_MASTER, ECMD_OK,
} from './const.js';
export { skill_init } from './weapon.js'; // relocate-fns
export { ROLE_CLERIC, ROLE_HEALER, ROLE_MONK, ROLE_WIZARD, SKILLS_FOR_ROLE, skillrow }; // relocate-fns

/* ── role indices (flags.initrole, role.c order) ────────────────────────────
 * Same numbering js/u_init.js and js/dog.js use; NOT the PM_* mons[] indices. */
const ROLE_ARCHEOLOGIST = 0, ROLE_BARBARIAN = 1, ROLE_CAVE_DWELLER = 2,
      ROLE_HEALER = 3, ROLE_KNIGHT = 4, ROLE_MONK = 5, ROLE_CLERIC = 6,
      ROLE_ROGUE = 7, ROLE_RANGER = 8, ROLE_SAMURAI = 9, ROLE_TOURIST = 10,
      ROLE_VALKYRIE = 11, ROLE_WIZARD = 12;

/* ── objects.h otyps used by skill_names_indices[] ──────────────────────────
 * Verified against js/oc_name_data.js OC_NAME (index == otyp) by the
 * self-check at the bottom of this block. */
const DAGGER = 34, KNIFE = 40, AXE = 44, PICK_AXE = 259, SHORT_SWORD = 46,
      BROADSWORD = 52, LONG_SWORD = 54, TWO_HANDED_SWORD = 55, CLUB = 77,
      MACE = 73, MORNING_STAR = 75, FLAIL = 81, QUARTERSTAFF = 79, SPEAR = 27,
      TRIDENT = 33, LANCE = 72, BOW = 83, SLING = 87, CROSSBOW = 88, DART = 24,
      SHURIKEN = 25, BOOMERANG = 26, UNICORN_HORN = 261;

/* C ref: weapon.c:20-36 PN_* — negative sentinels indexing odd_skill_names[]. */
const PN_BARE_HANDED = -1, PN_TWO_WEAPONS = -2, PN_RIDING = -3,
      PN_POLEARMS = -4, PN_SABER = -5, PN_HAMMER = -6, PN_WHIP = -7,
      PN_ATTACK_SPELL = -8, PN_HEALING_SPELL = -9, PN_DIVINATION_SPELL = -10,
      PN_ENCHANTMENT_SPELL = -11, PN_CLERIC_SPELL = -12, PN_ESCAPE_SPELL = -13,
      PN_MATTER_SPELL = -14;

/* C ref: weapon.c:38-50 skill_names_indices[P_NUM_SKILLS]. */
const SKILL_NAMES_INDICES = [
    /* Weapon */
    0, DAGGER, KNIFE, AXE, PICK_AXE, SHORT_SWORD, BROADSWORD, LONG_SWORD,
    TWO_HANDED_SWORD, PN_SABER, CLUB, MACE, MORNING_STAR, FLAIL, PN_HAMMER,
    QUARTERSTAFF, PN_POLEARMS, SPEAR, TRIDENT, LANCE, BOW, SLING, CROSSBOW,
    DART, SHURIKEN, BOOMERANG, PN_WHIP, UNICORN_HORN,
    /* Spell */
    PN_ATTACK_SPELL, PN_HEALING_SPELL, PN_DIVINATION_SPELL,
    PN_ENCHANTMENT_SPELL, PN_CLERIC_SPELL, PN_ESCAPE_SPELL, PN_MATTER_SPELL,
    /* Other */
    PN_BARE_HANDED, PN_TWO_WEAPONS, PN_RIDING,
];

/* C ref: weapon.c:52-58 odd_skill_names[]; note entry [0] isn't used. */
const ODD_SKILL_NAMES = [
    'no skill', 'bare hands', /* use barehands_or_martial[] instead */
    'two weapon combat', 'riding', 'polearms', 'saber', 'hammer', 'whip',
    'attack spells', 'healing spells', 'divination spells',
    'enchantment spells', 'clerical spells', 'escape spells', 'matter spells',
];
/* C ref: weapon.c:60-62 barehands_or_martial[], indexed via martial_bonus(). */
const BAREHANDS_OR_MARTIAL = ['bare handed combat', 'martial arts'];

function martial_bonus() {
    const ir = (game.flags?.initrole ?? -1) | 0;
    return ir === ROLE_SAMURAI || ir === ROLE_MONK;
}

/* C ref: skills.h:115-118 — the P_* accessor macros over u.weapon_skills[]. */
function skillrow(type) {
    const u = game.u;
    if (!u.weapon_skills)
        u.weapon_skills = [];
    let r = u.weapon_skills[type];
    if (!r)
        r = u.weapon_skills[type] = { skill: P_ISRESTRICTED, max_skill: P_ISRESTRICTED, advance: 0 };
    return r;
}
export function P_SKILL(t) { return skillrow(t).skill | 0; }

/* C ref: weapon.c:64-68 P_NAME(type). */
export function P_NAME(type) {
    const idx = SKILL_NAMES_INDICES[type] | 0;
    if (idx > 0)
        return OC_NAME[idx];
    if (type === P_BARE_HANDED_COMBAT)
        return BAREHANDS_OR_MARTIAL[martial_bonus() ? 1 : 0];
    return ODD_SKILL_NAMES[-idx];
}
/* C weapon.c:1092,1125 — share the skill namers with combat callers. */
export { skill_name, skill_level_name };




/* ── u_init.c:257-560 Skill_* — the per-role {skill, skmax} tables ────────── */
const Skill_A = [[P_DAGGER, P_BASIC], [P_KNIFE, P_BASIC], [P_PICK_AXE, P_EXPERT],
    [P_SHORT_SWORD, P_BASIC], [P_SABER, P_EXPERT], [P_CLUB, P_SKILLED],
    [P_QUARTERSTAFF, P_SKILLED], [P_SLING, P_SKILLED], [P_DART, P_BASIC],
    [P_BOOMERANG, P_EXPERT], [P_WHIP, P_EXPERT], [P_UNICORN_HORN, P_SKILLED],
    [P_ATTACK_SPELL, P_BASIC], [P_HEALING_SPELL, P_BASIC],
    [P_DIVINATION_SPELL, P_EXPERT], [P_MATTER_SPELL, P_BASIC],
    [P_RIDING, P_BASIC], [P_TWO_WEAPON_COMBAT, P_BASIC],
    [P_BARE_HANDED_COMBAT, P_EXPERT]];
const Skill_B = [[P_DAGGER, P_BASIC], [P_AXE, P_EXPERT], [P_PICK_AXE, P_SKILLED],
    [P_SHORT_SWORD, P_EXPERT], [P_BROAD_SWORD, P_SKILLED], [P_LONG_SWORD, P_SKILLED],
    [P_TWO_HANDED_SWORD, P_EXPERT], [P_SABER, P_SKILLED], [P_CLUB, P_SKILLED],
    [P_MACE, P_SKILLED], [P_MORNING_STAR, P_SKILLED], [P_FLAIL, P_BASIC],
    [P_HAMMER, P_EXPERT], [P_QUARTERSTAFF, P_BASIC], [P_SPEAR, P_SKILLED],
    [P_TRIDENT, P_SKILLED], [P_BOW, P_BASIC], [P_ATTACK_SPELL, P_BASIC],
    [P_ESCAPE_SPELL, P_BASIC], [P_RIDING, P_BASIC],
    [P_TWO_WEAPON_COMBAT, P_BASIC], [P_BARE_HANDED_COMBAT, P_MASTER]];
const Skill_C = [[P_DAGGER, P_BASIC], [P_KNIFE, P_SKILLED], [P_AXE, P_SKILLED],
    [P_PICK_AXE, P_BASIC], [P_CLUB, P_EXPERT], [P_MACE, P_EXPERT],
    [P_MORNING_STAR, P_BASIC], [P_FLAIL, P_SKILLED], [P_HAMMER, P_SKILLED],
    [P_QUARTERSTAFF, P_EXPERT], [P_POLEARMS, P_SKILLED], [P_SPEAR, P_EXPERT],
    [P_TRIDENT, P_SKILLED], [P_BOW, P_SKILLED], [P_SLING, P_EXPERT],
    [P_ATTACK_SPELL, P_BASIC], [P_MATTER_SPELL, P_SKILLED],
    [P_BOOMERANG, P_EXPERT], [P_UNICORN_HORN, P_BASIC],
    [P_BARE_HANDED_COMBAT, P_MASTER]];
const Skill_H = [[P_DAGGER, P_SKILLED], [P_KNIFE, P_EXPERT],
    [P_SHORT_SWORD, P_SKILLED], [P_SABER, P_BASIC], [P_CLUB, P_SKILLED],
    [P_MACE, P_BASIC], [P_QUARTERSTAFF, P_EXPERT], [P_POLEARMS, P_BASIC],
    [P_SPEAR, P_BASIC], [P_TRIDENT, P_BASIC], [P_SLING, P_SKILLED],
    [P_DART, P_EXPERT], [P_SHURIKEN, P_SKILLED], [P_UNICORN_HORN, P_EXPERT],
    [P_HEALING_SPELL, P_EXPERT], [P_BARE_HANDED_COMBAT, P_BASIC]];
const Skill_K = [[P_DAGGER, P_BASIC], [P_KNIFE, P_BASIC], [P_AXE, P_SKILLED],
    [P_PICK_AXE, P_BASIC], [P_SHORT_SWORD, P_SKILLED], [P_BROAD_SWORD, P_SKILLED],
    [P_LONG_SWORD, P_EXPERT], [P_TWO_HANDED_SWORD, P_SKILLED], [P_SABER, P_SKILLED],
    [P_CLUB, P_BASIC], [P_MACE, P_SKILLED], [P_MORNING_STAR, P_SKILLED],
    [P_FLAIL, P_BASIC], [P_HAMMER, P_BASIC], [P_POLEARMS, P_SKILLED],
    [P_SPEAR, P_SKILLED], [P_TRIDENT, P_BASIC], [P_LANCE, P_EXPERT],
    [P_BOW, P_BASIC], [P_CROSSBOW, P_SKILLED], [P_ATTACK_SPELL, P_SKILLED],
    [P_HEALING_SPELL, P_SKILLED], [P_CLERIC_SPELL, P_SKILLED],
    [P_RIDING, P_EXPERT], [P_TWO_WEAPON_COMBAT, P_SKILLED],
    [P_BARE_HANDED_COMBAT, P_EXPERT]];
const Skill_Mon = [[P_QUARTERSTAFF, P_BASIC], [P_SPEAR, P_BASIC],
    [P_CROSSBOW, P_BASIC], [P_SHURIKEN, P_BASIC], [P_ATTACK_SPELL, P_BASIC],
    [P_HEALING_SPELL, P_EXPERT], [P_DIVINATION_SPELL, P_BASIC],
    [P_ENCHANTMENT_SPELL, P_BASIC], [P_CLERIC_SPELL, P_SKILLED],
    [P_ESCAPE_SPELL, P_SKILLED], [P_MATTER_SPELL, P_BASIC],
    [P_MARTIAL_ARTS, P_GRAND_MASTER]];
const Skill_P = [[P_CLUB, P_EXPERT], [P_MACE, P_EXPERT], [P_MORNING_STAR, P_EXPERT],
    [P_FLAIL, P_EXPERT], [P_HAMMER, P_EXPERT], [P_QUARTERSTAFF, P_EXPERT],
    [P_POLEARMS, P_SKILLED], [P_SPEAR, P_SKILLED], [P_TRIDENT, P_SKILLED],
    [P_LANCE, P_BASIC], [P_BOW, P_BASIC], [P_SLING, P_BASIC],
    [P_CROSSBOW, P_BASIC], [P_DART, P_BASIC], [P_SHURIKEN, P_BASIC],
    [P_BOOMERANG, P_BASIC], [P_UNICORN_HORN, P_SKILLED],
    [P_HEALING_SPELL, P_EXPERT], [P_DIVINATION_SPELL, P_EXPERT],
    [P_CLERIC_SPELL, P_EXPERT], [P_BARE_HANDED_COMBAT, P_BASIC]];
const Skill_R = [[P_DAGGER, P_EXPERT], [P_KNIFE, P_EXPERT],
    [P_SHORT_SWORD, P_EXPERT], [P_BROAD_SWORD, P_SKILLED], [P_LONG_SWORD, P_SKILLED],
    [P_TWO_HANDED_SWORD, P_BASIC], [P_SABER, P_SKILLED], [P_CLUB, P_SKILLED],
    [P_MACE, P_SKILLED], [P_MORNING_STAR, P_BASIC], [P_FLAIL, P_BASIC],
    [P_HAMMER, P_BASIC], [P_POLEARMS, P_BASIC], [P_SPEAR, P_BASIC],
    [P_CROSSBOW, P_EXPERT], [P_DART, P_EXPERT], [P_SHURIKEN, P_SKILLED],
    [P_DIVINATION_SPELL, P_SKILLED], [P_ESCAPE_SPELL, P_SKILLED],
    [P_MATTER_SPELL, P_SKILLED], [P_RIDING, P_BASIC],
    [P_TWO_WEAPON_COMBAT, P_EXPERT], [P_BARE_HANDED_COMBAT, P_EXPERT]];
const Skill_Ran = [[P_DAGGER, P_EXPERT], [P_KNIFE, P_SKILLED], [P_AXE, P_SKILLED],
    [P_PICK_AXE, P_BASIC], [P_SHORT_SWORD, P_BASIC], [P_MORNING_STAR, P_BASIC],
    [P_FLAIL, P_SKILLED], [P_HAMMER, P_BASIC], [P_QUARTERSTAFF, P_BASIC],
    [P_POLEARMS, P_SKILLED], [P_SPEAR, P_EXPERT], [P_TRIDENT, P_BASIC],
    [P_BOW, P_EXPERT], [P_SLING, P_EXPERT], [P_CROSSBOW, P_EXPERT],
    [P_DART, P_EXPERT], [P_SHURIKEN, P_SKILLED], [P_BOOMERANG, P_EXPERT],
    [P_WHIP, P_BASIC], [P_HEALING_SPELL, P_BASIC], [P_DIVINATION_SPELL, P_EXPERT],
    [P_ESCAPE_SPELL, P_BASIC], [P_RIDING, P_BASIC],
    [P_BARE_HANDED_COMBAT, P_BASIC]];
const Skill_S = [[P_DAGGER, P_BASIC], [P_KNIFE, P_SKILLED],
    [P_SHORT_SWORD, P_EXPERT], [P_BROAD_SWORD, P_SKILLED], [P_LONG_SWORD, P_EXPERT],
    [P_TWO_HANDED_SWORD, P_EXPERT], [P_SABER, P_BASIC], [P_FLAIL, P_SKILLED],
    [P_QUARTERSTAFF, P_BASIC], [P_POLEARMS, P_SKILLED], [P_SPEAR, P_SKILLED],
    [P_LANCE, P_SKILLED], [P_BOW, P_EXPERT], [P_SHURIKEN, P_EXPERT],
    [P_ATTACK_SPELL, P_BASIC], [P_DIVINATION_SPELL, P_BASIC],
    [P_CLERIC_SPELL, P_SKILLED], [P_RIDING, P_SKILLED],
    [P_TWO_WEAPON_COMBAT, P_EXPERT], [P_MARTIAL_ARTS, P_MASTER]];
const Skill_T = [[P_DAGGER, P_EXPERT], [P_KNIFE, P_SKILLED], [P_AXE, P_BASIC],
    [P_PICK_AXE, P_BASIC], [P_SHORT_SWORD, P_EXPERT], [P_BROAD_SWORD, P_BASIC],
    [P_LONG_SWORD, P_BASIC], [P_TWO_HANDED_SWORD, P_BASIC], [P_SABER, P_SKILLED],
    [P_MACE, P_BASIC], [P_MORNING_STAR, P_BASIC], [P_FLAIL, P_BASIC],
    [P_HAMMER, P_BASIC], [P_QUARTERSTAFF, P_BASIC], [P_POLEARMS, P_BASIC],
    [P_SPEAR, P_BASIC], [P_TRIDENT, P_BASIC], [P_LANCE, P_BASIC],
    [P_BOW, P_BASIC], [P_SLING, P_BASIC], [P_CROSSBOW, P_BASIC],
    [P_DART, P_EXPERT], [P_SHURIKEN, P_BASIC], [P_BOOMERANG, P_BASIC],
    [P_WHIP, P_BASIC], [P_UNICORN_HORN, P_SKILLED],
    [P_DIVINATION_SPELL, P_BASIC], [P_ENCHANTMENT_SPELL, P_BASIC],
    [P_ESCAPE_SPELL, P_SKILLED], [P_RIDING, P_BASIC],
    [P_TWO_WEAPON_COMBAT, P_SKILLED], [P_BARE_HANDED_COMBAT, P_SKILLED]];
const Skill_V = [[P_DAGGER, P_EXPERT], [P_AXE, P_EXPERT], [P_PICK_AXE, P_SKILLED],
    [P_SHORT_SWORD, P_SKILLED], [P_BROAD_SWORD, P_SKILLED], [P_LONG_SWORD, P_EXPERT],
    [P_TWO_HANDED_SWORD, P_EXPERT], [P_SABER, P_BASIC], [P_HAMMER, P_EXPERT],
    [P_QUARTERSTAFF, P_BASIC], [P_POLEARMS, P_SKILLED], [P_SPEAR, P_EXPERT],
    [P_TRIDENT, P_BASIC], [P_LANCE, P_SKILLED], [P_SLING, P_BASIC],
    [P_ATTACK_SPELL, P_BASIC], [P_ESCAPE_SPELL, P_BASIC], [P_RIDING, P_SKILLED],
    [P_TWO_WEAPON_COMBAT, P_SKILLED], [P_BARE_HANDED_COMBAT, P_EXPERT]];
const Skill_W = [[P_DAGGER, P_EXPERT], [P_KNIFE, P_SKILLED], [P_AXE, P_SKILLED],
    [P_SHORT_SWORD, P_BASIC], [P_CLUB, P_SKILLED], [P_MACE, P_BASIC],
    [P_QUARTERSTAFF, P_EXPERT], [P_POLEARMS, P_SKILLED], [P_SPEAR, P_BASIC],
    [P_TRIDENT, P_BASIC], [P_SLING, P_SKILLED], [P_DART, P_EXPERT],
    [P_SHURIKEN, P_BASIC], [P_ATTACK_SPELL, P_EXPERT], [P_HEALING_SPELL, P_SKILLED],
    [P_DIVINATION_SPELL, P_EXPERT], [P_ENCHANTMENT_SPELL, P_SKILLED],
    [P_CLERIC_SPELL, P_SKILLED], [P_ESCAPE_SPELL, P_EXPERT],
    [P_MATTER_SPELL, P_EXPERT], [P_RIDING, P_BASIC],
    [P_BARE_HANDED_COMBAT, P_BASIC]];

/* C ref: u_init.c:562 skills_for_role(), keyed on flags.initrole. */
const SKILLS_FOR_ROLE = [Skill_A, Skill_B, Skill_C, Skill_H, Skill_K, Skill_Mon,
    Skill_P, Skill_R, Skill_Ran, Skill_S, Skill_T, Skill_V, Skill_W];











