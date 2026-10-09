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
import { pline, flush_screen, docrt, force_more } from './display.js';
import { topl_park_cursor } from './display.js';
import { nhgetch } from './input.js';
import { yn_function } from './end.js';
import { OC_NAME } from './oc_name_data.js';
import { is_ammo } from './cmd.js';
import { build_window_screen } from './com_pager.js';
import { PM_PONY } from './pm.generated.js';
import { ROLE_PM_MNUM } from './roles.js';
import { weapon_type, can_advance, slots_required } from './uhitm.js';
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
function P_MAX_SKILL(t) { return skillrow(t).max_skill | 0; }
function P_ADVANCE(t) { return skillrow(t).advance | 0; }
function P_RESTRICTED(t) { return P_SKILL(t) === P_ISRESTRICTED; }
/* C ref: skills.h practice_needed_to_advance(level) — ((level) * (level) * 20) */
function practice_needed_to_advance(level) { return level * level * 20; }

/* C ref: weapon.c:64-68 P_NAME(type). */
export function P_NAME(type) {
    const idx = SKILL_NAMES_INDICES[type] | 0;
    if (idx > 0)
        return OC_NAME[idx];
    if (type === P_BARE_HANDED_COMBAT)
        return BAREHANDS_OR_MARTIAL[martial_bonus() ? 1 : 0];
    return ODD_SKILL_NAMES[-idx];
}
/* C ref: weapon.c:1125 skill_name(). */
export function skill_name(skill) { return P_NAME(skill); }

/* C ref: weapon.c:1092 skill_level_name(). */
export function skill_level_name(skill) {
    switch (P_SKILL(skill)) {
    case P_UNSKILLED:    return 'Unskilled';
    case P_BASIC:        return 'Basic';
    case P_SKILLED:      return 'Skilled';
    case P_EXPERT:       return 'Expert';
    /* these are for unarmed combat/martial arts only */
    case P_MASTER:       return 'Master';
    case P_GRAND_MASTER: return 'Grand Master';
    default:             return 'Unknown';
    }
}

/* C ref: weapon.c:1170 could_advance(). */
function could_advance(skill) {
    if (P_RESTRICTED(skill)
        || P_SKILL(skill) >= P_MAX_SKILL(skill)
        || (game.u.skills_advanced | 0) >= P_SKILL_LIMIT)
        return false;
    return P_ADVANCE(skill) >= practice_needed_to_advance(P_SKILL(skill));
}
/* C ref: weapon.c:1186 peaked_skill(). */
function peaked_skill(skill) {
    if (P_RESTRICTED(skill))
        return false;
    return P_SKILL(skill) >= P_MAX_SKILL(skill)
        && P_ADVANCE(skill) >= practice_needed_to_advance(P_SKILL(skill));
}

/* C ref: weapon.c:1198 skill_advance().  Caller has already checked
 * can_advance(); this is the state change plus its message. */
async function skill_advance(skill) {
    const u = game.u;
    u.weapon_slots = (u.weapon_slots | 0) - slots_required(skill);
    skillrow(skill).skill = P_SKILL(skill) + 1;
    u.skill_record = u.skill_record || [];
    u.skill_record[(u.skills_advanced | 0)] = skill;
    u.skills_advanced = (u.skills_advanced | 0) + 1;
    /* subtly change the advance message to indicate no more advancement */
    const msg = `You are now ${P_SKILL(skill) >= P_MAX_SKILL(skill) ? 'most' : 'more'} skilled in ${P_NAME(skill)}.`;
    await pline(msg);
    if (skill >= P_FIRST_SPELL && skill <= P_LAST_SPELL)
        skill_based_spellbook_id();
    return msg;
}

/* C ref: weapon.c:1425 unrestrict_weapon_skill(). */
export function unrestrict_weapon_skill(skill) {
    if (skill < P_NUM_SKILLS && P_RESTRICTED(skill)) {
        const r = skillrow(skill);
        r.skill = P_UNSKILLED;
        r.max_skill = P_BASIC;
        r.advance = 0;
    }
}

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

// C u_init.c:1040 — select by the live role's monster identity.
export function skills_for_role() {
    const role = ROLE_PM_MNUM.indexOf(game.urole.mnum);
    if (role < 0) throw new Error('panic: No skills found for role');
    return SKILLS_FOR_ROLE[role];
}

/* C ref: role.c roles[].spelspec, resolved through spell_skilltype() =
 * objects[booktype].oc_skill (spell.c:2044).  Indexed by flags.initrole:
 *   Arc magic mapping->divination   Bar haste self->escape
 *   Cav dig->matter                 Hea cure sickness->healing
 *   Kni turn undead->clerical       Mon restore ability->healing
 *   Pri remove curse->clerical      Rog detect treasure->divination
 *   Ran invisibility->escape        Sam clairvoyance->divination
 *   Tou charm monster->enchantment  Val cone of cold->attack
 *   Wiz magic missile->attack                                             */
const ROLE_SPELSPEC_SKILL = [
    P_DIVINATION_SPELL, P_ESCAPE_SPELL, P_MATTER_SPELL, P_HEALING_SPELL,
    P_CLERIC_SPELL, P_HEALING_SPELL, P_CLERIC_SPELL, P_DIVINATION_SPELL,
    P_ESCAPE_SPELL, P_DIVINATION_SPELL, P_ENCHANTMENT_SPELL, P_ATTACK_SPELL,
    P_ATTACK_SPELL,
];

/* C ref: weapon.c:1738 skill_init(class_skill).  Called from u_init(), after
 * ini_inv() has built gi.invent (C u_init.c:1404). */
export async function skill_init(initrole) {
    const u = game.u;
    const ir = initrole | 0;

    /* initialize skill array; by default, everything is restricted */
    u.weapon_skills = [];
    for (let skill = 0; skill < P_NUM_SKILLS; skill++)
        u.weapon_skills[skill] = { skill: P_ISRESTRICTED, max_skill: P_ISRESTRICTED, advance: 0 };

    /* Set skill for all weapons in inventory to be basic */
    for (let obj = game.invent; obj; obj = obj.nobj) {
        /* don't give skill just because of carried ammo, wait until we see
           the relevant launcher */
        if (is_ammo(obj))
            continue;
        const skill = weapon_type(obj);
        if (skill !== P_NONE)
            skillrow(skill).skill = P_BASIC;
    }

    /* set skills for magic */
    if (ir === ROLE_HEALER || ir === ROLE_MONK) {
        skillrow(P_HEALING_SPELL).skill = P_BASIC;
    } else if (ir === ROLE_CLERIC) {
        skillrow(P_CLERIC_SPELL).skill = P_BASIC;
    } else if (ir === ROLE_WIZARD) {
        skillrow(P_ATTACK_SPELL).skill = P_BASIC;
        skillrow(P_ENCHANTMENT_SPELL).skill = P_BASIC;
    }

    /* walk through array to set skill maximums */
    const table = SKILLS_FOR_ROLE[ir];
    if (!table)
        return;
    for (const [skill, skmax] of table) {
        skillrow(skill).max_skill = skmax;
        if (P_SKILL(skill) === P_ISRESTRICTED) /* skill pre-set */
            skillrow(skill).skill = P_UNSKILLED;
    }

    /* High potential fighters already know how to use their hands. */
    if (P_MAX_SKILL(P_BARE_HANDED_COMBAT) > P_EXPERT)
        skillrow(P_BARE_HANDED_COMBAT).skill = P_BASIC;

    /* Roles that start with a horse know how to ride it. */
    if (game.urole.petnum === PM_PONY)
        skillrow(P_RIDING).skill = P_BASIC;

    /* Make sure we haven't missed setting the max on a skill & set advance */
    for (let skill = 0; skill < P_NUM_SKILLS; skill++) {
        if (!P_RESTRICTED(skill)) {
            if (P_MAX_SKILL(skill) < P_SKILL(skill)) {
                await impossible("skill_init: curr > max: %s", P_NAME(skill));
                skillrow(skill).max_skill = P_SKILL(skill);
            }
            skillrow(skill).advance = practice_needed_to_advance(P_SKILL(skill) - 1);
        }
    }

    /* each role has a special spell; allow at least basic for its type */
    unrestrict_weapon_skill(ROLE_SPELSPEC_SKILL[ir]);
    if (!u.uroleplay?.pauper)
        skill_based_spellbook_id();
}

/* C ref: weapon.c:1226-1231 skill_ranges[]. */
const SKILL_RANGES = [
    { first: P_FIRST_H_TO_H, last: P_LAST_H_TO_H, name: 'Fighting Skills' },
    { first: P_FIRST_WEAPON, last: P_LAST_WEAPON, name: 'Weapon Skills' },
    { first: P_FIRST_SPELL, last: P_LAST_SPELL, name: 'Spellcasting Skills' },
];

const pad = (s, n) => (String(s) + ' '.repeat(Math.max(0, n - String(s).length)));
const rpad = (n, w) => String(n).padStart(w);

/* C ref: weapon.c:1230 add_skills_to_menu(win, selectable, speedy).  Returns
 * the menu items in C's add_menu order: { text, heading, a_int }.  a_int 0 is
 * a non-selectable row (heading or unadvanceable skill). */
function add_skills_to_menu(selectable, speedy) {
    const out = [];
    /* Find the longest skill name. */
    let longest = 0;
    for (let i = 0; i < P_NUM_SKILLS; i++) {
        if (P_RESTRICTED(i))
            continue;
        const len = P_NAME(i).length;
        if (len > longest)
            longest = len;
    }
    for (const range of SKILL_RANGES) {
        for (let i = range.first; i <= range.last; i++) {
            /* Print headings for skill types (BEFORE the restricted skip, so a
               fully-restricted range still gets its heading). */
            if (i === range.first)
                out.push({ text: range.name, heading: true, a_int: 0 });
            if (P_RESTRICTED(i))
                continue;
            /*
             * The 12 is the longest skill level name.
             * The "    " is room for a selection letter and dash, "a - ".
             */
            let prefix;
            if (!selectable)
                prefix = '';
            else if (can_advance(i, speedy))
                prefix = ''; /* will be preceded by menu choice */
            else if (could_advance(i))
                prefix = '  * ';
            else if (peaked_skill(i))
                prefix = '  # ';
            else
                prefix = '    ';
            const sklnam = skill_level_name(i);
            let text;
            if (wizardMode()) {
                /* " %s%-*s %-12s %5d(%4d)" */
                text = ` ${prefix}${pad(P_NAME(i), longest)} ${pad(sklnam, 12)} `
                     + `${rpad(P_ADVANCE(i), 5)}(${rpad(practice_needed_to_advance(P_SKILL(i)), 4)})`;
            } else {
                /* " %s %-*s [%s]" */
                text = ` ${prefix} ${pad(P_NAME(i), longest)} [${sklnam}]`;
            }
            out.push({ text, heading: false,
                       a_int: (selectable && can_advance(i, speedy)) ? i + 1 : 0 });
        }
    }
    return out;
}

function wizardMode() { return !!(game.flags && game.flags.debug); }

/* C ref: hack.h y_n(query) => yn_function(query, ynchars, 'n', TRUE); tty
 * rejects keys outside "yn"/ESC/space/Enter with a bell and keeps reading. */
async function y_n(question) {
    return yn_function(question, 'yn', 'n', true);
}

const SCREEN_ROWS = 24;

/* C ref: win/tty/wintty.c tty_end_menu + process_menu_window, for a menu whose
 * widest line drives offx down to 10 and therefore to 0 (full-screen mode).
 * The #enhance menu is always full-screen: its wizard-mode rows are ~48
 * columns and its non-wizard rows ~40, and `len = strlen(str) + 2` against
 * `offx = max(10, cols - maxcol - 1)` lands at or below 10 in both shapes, so
 * `if (cw->offx == 10 ...) { cw->offx = 0; term_clear_screen(); }` fires.
 *
 * Page geometry: lmax = min(52, rows - 1) = 23 items per page; the morestr row
 * follows the last item of the page.  Every printed row is `putchar(' ')`
 * followed by the item string, i.e. a one-column left margin. */
async function enhance_menu(items, prompt, pickOne) {
    const g = game;
    /* C ref: tty_end_menu — "Put the prompt at the beginning of the menu":
     * add_menu("") then add_menu(prompt), both PREPENDED after the list has
     * been reversed, so the prompt row comes first and the blank row second. */
    const all = [{ text: prompt, heading: true, a_int: 0 },
                 { text: '', heading: false, a_int: 0 }, ...items];
    const LMAX = Math.min(52, SCREEN_ROWS - 1);
    const npages = Math.max(1, Math.ceil(all.length / LMAX));
    /* C ref: tty_end_menu's accelerator pass — menu_ch resets to 'a' at every
     * page boundary and only advances on items with a non-zero identifier. */
    const accel = new Array(all.length).fill('');
    let menu_ch = 'a'.charCodeAt(0);
    for (let n = 0; n < all.length; n++) {
        if ((n % LMAX) === 0)
            menu_ch = 'a'.charCodeAt(0);
        if (all[n].a_int) {
            accel[n] = String.fromCharCode(menu_ch);
            menu_ch = (menu_ch === 'z'.charCodeAt(0)) ? 'A'.charCodeAt(0) : menu_ch + 1;
        }
    }
    let pageIdx = 0;
    /* C ref: wintty.c:1927 — a single-page menu with maxrow < rows overlays the
     * map at offx = min(40, cols - maxcol - 1) (H2344_BROKEN arm), maxcol being
     * the longest stored str + 2 (tty_end_menu, trailing blanks counted); only
     * offx == 10 / maxrow >= rows goes full-screen.  Same placement as
     * cmd.js tty_menu_pick_one_ext. */
    let overlayCol = 0;
    if (npages === 1 && all.length + 1 < SCREEN_ROWS) {
        let maxlen = 5;
        for (let n = 0; n < all.length; n++) {
            const body = accel[n] ? `${accel[n]} - ${all[n].text}` : all[n].text;
            maxlen = Math.max(maxlen, body.length);
        }
        const col = Math.min(41, 78 - maxlen);
        if (col > 1)
            overlayCol = col;
    }
    const renderPage = async () => {
        const start = pageIdx * LMAX;
        const page = all.slice(start, start + LMAX);
        const morestr = (npages > 1) ? `(${pageIdx + 1} of ${npages})` : '(end) ';
        if (overlayCol) {
            const wl = page.map((it, i) => {
                const a = accel[start + i];
                const body = a ? `${a} - ${it.text}` : it.text;
                return it.heading ? `\x1b[7m${body}\x1b[0m` : body;
            });
            wl.push('(end)');
            g._screen_output = build_window_screen(wl, overlayCol, g.u?.uac ?? 0);
            const disp = g.nhDisplay;
            if (disp) { disp.cursorCol = overlayCol + '(end) '.length; disp.cursorRow = page.length; }
            return { start, page, morestr };
        }
        const rows = new Array(SCREEN_ROWS).fill('');
        for (let i = 0; i < page.length; i++) {
            const it = page[i];
            const a = accel[start + i];
            const body = a ? `${a} - ${it.text}` : it.text;
            /* Headings are drawn with iflags.menu_headings (ATR_INVERSE). */
            rows[i] = ' ' + (it.heading ? `\x1b[7m${body}\x1b[0m` : body);
        }
        rows[page.length] = ` ${morestr}`;
        g._screen_output = rows.join('\n');
        const disp = g.nhDisplay;
        if (disp) { disp.cursorCol = 1 + morestr.length; disp.cursorRow = page.length; }
        return { start, page, morestr };
    };
    let cur = await renderPage();
    for (;;) {
        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        if (key === 27) /* ESC — cancel */
            return 0;
        if (key === 32 /* ' ' */ || ch === '>') {
            if (pageIdx < npages - 1) { pageIdx++; cur = await renderPage(); continue; }
            if (key === 32) return 0; /* ' ' finishes on the last page */
            continue;
        }
        if (ch === '<' || ch === '^' || ch === '|') {
            const target = (ch === '<') ? pageIdx - 1 : (ch === '^') ? 0 : npages - 1;
            if (target !== pageIdx && target >= 0 && target < npages) {
                pageIdx = target; cur = await renderPage();
            }
            continue;
        }
        if (ch === '\n' || ch === '\r') /* finished, nothing selected */
            return 0;
        if (pickOne) {
            const idx = cur.page.findIndex((it, i) => accel[cur.start + i] === ch && it.a_int);
            if (idx >= 0)
                return cur.page[idx].a_int;
        }
        /* Unrecognised key: bell, no redraw, read again. */
    }
}

/* C ref: weapon.c:1329 enhance_weapon_skill() — the `#enhance' command. */
export async function enhance_weapon_skill() {
    const g = game;
    const u = g.u;
    let speedy = false;
    let n = 0;

    /* C ref: weapon.c:1338 `svc.context.tips |= (1 << TIP_ENHANCE)` — "player
     * knows about #enhance, don't show tip anymore".  This port models
     * context.tips as a PER-TIP BOOLEAN ARRAY rather than C's bitmask (see
     * js/cmd.js handle_tip, which indexes it), so set the TIP_ENHANCE slot in
     * that representation; writing C's bitmask here turns the array into a
     * number and handle_tip then throws on its next index write. */
    const TIP_ENHANCE = 0; /* context.h:15 */
    g.context = g.context || {};
    if (!g.context.tips)
        g.context.tips = [];
    g.context.tips[TIP_ENHANCE] = true;

    if (wizardMode() && (await y_n('Advance skills without practice?')) === 'y')
        speedy = true;

    let pendingMore = null;
    do {
        /* C ref: weapon.c:1352 create_nhwindow/start_menu -> the tty's
         * tty_display_nhwindow, which flushes an unacknowledged topline first
         * (`if (ttyDisplay->toplin == TOPLINE_NEED_MORE) tty_display_nhwindow(
         * WIN_MESSAGE, TRUE)`).  That is where the "--More--" after each
         * advance message comes from: it belongs to the NEXT menu's display,
         * not to skill_advance, so a loop that ends instead of redisplaying
         * leaves the message unpaged. */
        if (pendingMore !== null) {
            await force_more(pendingMore);
            pendingMore = null;
        }
        /* count advanceable skills */
        let to_advance = 0, eventually_advance = 0, maxxed_cnt = 0;
        for (let i = 0; i < P_NUM_SKILLS; i++) {
            if (P_RESTRICTED(i))
                continue;
            if (can_advance(i, speedy))
                to_advance++;
            else if (could_advance(i))
                eventually_advance++;
            else if (peaked_skill(i))
                maxxed_cnt++;
        }

        const items = [];
        /* start with a legend if any entries will be annotated with "*"/"#" */
        if (eventually_advance > 0 || maxxed_cnt > 0) {
            if (eventually_advance > 0) {
                const MAXULEV = 30;
                items.push({ text: `(Skill${eventually_advance === 1 ? '' : 's'} flagged by "*" may be enhanced `
                    + `${(u.ulevel | 0) < MAXULEV ? "when you're more experienced"
                                                  : 'if skill slots become available'}.)`,
                    heading: false, a_int: 0 });
            }
            if (maxxed_cnt > 0)
                items.push({ text: `(Skill${maxxed_cnt === 1 ? '' : 's'} flagged by "#" cannot be enhanced any further.)`,
                    heading: false, a_int: 0 });
            items.push({ text: '', heading: false, a_int: 0 });
        }

        items.push(...add_skills_to_menu(
            to_advance + eventually_advance + maxxed_cnt > 0, speedy));

        let prompt = (to_advance > 0) ? 'Pick a skill to advance:' : 'Current skills:';
        if (wizardMode() && !speedy) {
            const slots = u.weapon_slots | 0;
            prompt += `  (${slots} slot${slots === 1 ? '' : 's'} available)`;
        }
        const picked = await enhance_menu(items, prompt, to_advance > 0);
        /* C ref: weapon.c:1391 destroy_nhwindow(win).  The #enhance menu is a
         * full-screen (offx == 0) tty window, so tearing it down repaints the
         * map — C's term_clear_screen()/docrt() pair. */
        await docrt();
        n = picked ? 1 : 0;
        if (n > 0) {
            pendingMore = await skill_advance(picked - 1); /* get item selected */
            /* check for more skills able to advance; if so, then... */
            n = 0;
            for (let i = 0; i < P_NUM_SKILLS; i++) {
                if (can_advance(i, speedy)) {
                    if (!speedy)
                        await pline('You feel you could be more dangerous!');
                    n++;
                    break;
                }
            }
        }
    } while (speedy && n > 0);
    return ECMD_OK;
}
