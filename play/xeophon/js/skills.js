// weapon.c:1092-1508,1738-1811; role limits from u_init.c:257-572.
// Skills and their advancement history are canonical hero save state.
import { game } from './gstate.js';
import { JAPANESE_ITEM_ALIASES } from './o_init.js';
import { rn2 } from './rng.js';
import * as C from './const.js';

export const ROLE_SKILL_LIMITS = {
    Archeologist: [
        [C.P_DAGGER, C.P_BASIC],
        [C.P_KNIFE, C.P_BASIC],
        [C.P_PICK_AXE, C.P_EXPERT],
        [C.P_SHORT_SWORD, C.P_BASIC],
        [C.P_SABER, C.P_EXPERT],
        [C.P_CLUB, C.P_SKILLED],
        [C.P_QUARTERSTAFF, C.P_SKILLED],
        [C.P_SLING, C.P_SKILLED],
        [C.P_DART, C.P_BASIC],
        [C.P_BOOMERANG, C.P_EXPERT],
        [C.P_WHIP, C.P_EXPERT],
        [C.P_UNICORN_HORN, C.P_SKILLED],
        [C.P_ATTACK_SPELL, C.P_BASIC],
        [C.P_HEALING_SPELL, C.P_BASIC],
        [C.P_DIVINATION_SPELL, C.P_EXPERT],
        [C.P_MATTER_SPELL, C.P_BASIC],
        [C.P_RIDING, C.P_BASIC],
        [C.P_TWO_WEAPON_COMBAT, C.P_BASIC],
        [C.P_BARE_HANDED_COMBAT, C.P_EXPERT]
    ],
    Barbarian: [
        [C.P_DAGGER, C.P_BASIC],
        [C.P_AXE, C.P_EXPERT],
        [C.P_PICK_AXE, C.P_SKILLED],
        [C.P_SHORT_SWORD, C.P_EXPERT],
        [C.P_BROAD_SWORD, C.P_SKILLED],
        [C.P_LONG_SWORD, C.P_SKILLED],
        [C.P_TWO_HANDED_SWORD, C.P_EXPERT],
        [C.P_SABER, C.P_SKILLED],
        [C.P_CLUB, C.P_SKILLED],
        [C.P_MACE, C.P_SKILLED],
        [C.P_MORNING_STAR, C.P_SKILLED],
        [C.P_FLAIL, C.P_BASIC],
        [C.P_HAMMER, C.P_EXPERT],
        [C.P_QUARTERSTAFF, C.P_BASIC],
        [C.P_SPEAR, C.P_SKILLED],
        [C.P_TRIDENT, C.P_SKILLED],
        [C.P_BOW, C.P_BASIC],
        [C.P_ATTACK_SPELL, C.P_BASIC],
        [C.P_ESCAPE_SPELL, C.P_BASIC],
        [C.P_RIDING, C.P_BASIC],
        [C.P_TWO_WEAPON_COMBAT, C.P_BASIC],
        [C.P_BARE_HANDED_COMBAT, C.P_MASTER]
    ],
    Caveman: [
        [C.P_DAGGER, C.P_BASIC],
        [C.P_KNIFE, C.P_SKILLED],
        [C.P_AXE, C.P_SKILLED],
        [C.P_PICK_AXE, C.P_BASIC],
        [C.P_CLUB, C.P_EXPERT],
        [C.P_MACE, C.P_EXPERT],
        [C.P_MORNING_STAR, C.P_BASIC],
        [C.P_FLAIL, C.P_SKILLED],
        [C.P_HAMMER, C.P_SKILLED],
        [C.P_QUARTERSTAFF, C.P_EXPERT],
        [C.P_POLEARMS, C.P_SKILLED],
        [C.P_SPEAR, C.P_EXPERT],
        [C.P_TRIDENT, C.P_SKILLED],
        [C.P_BOW, C.P_SKILLED],
        [C.P_SLING, C.P_EXPERT],
        [C.P_ATTACK_SPELL, C.P_BASIC],
        [C.P_MATTER_SPELL, C.P_SKILLED],
        [C.P_BOOMERANG, C.P_EXPERT],
        [C.P_UNICORN_HORN, C.P_BASIC],
        [C.P_BARE_HANDED_COMBAT, C.P_MASTER]
    ],
    Healer: [
        [C.P_DAGGER, C.P_SKILLED],
        [C.P_KNIFE, C.P_EXPERT],
        [C.P_SHORT_SWORD, C.P_SKILLED],
        [C.P_SABER, C.P_BASIC],
        [C.P_CLUB, C.P_SKILLED],
        [C.P_MACE, C.P_BASIC],
        [C.P_QUARTERSTAFF, C.P_EXPERT],
        [C.P_POLEARMS, C.P_BASIC],
        [C.P_SPEAR, C.P_BASIC],
        [C.P_TRIDENT, C.P_BASIC],
        [C.P_SLING, C.P_SKILLED],
        [C.P_DART, C.P_EXPERT],
        [C.P_SHURIKEN, C.P_SKILLED],
        [C.P_UNICORN_HORN, C.P_EXPERT],
        [C.P_HEALING_SPELL, C.P_EXPERT],
        [C.P_BARE_HANDED_COMBAT, C.P_BASIC]
    ],
    Knight: [
        [C.P_DAGGER, C.P_BASIC],
        [C.P_KNIFE, C.P_BASIC],
        [C.P_AXE, C.P_SKILLED],
        [C.P_PICK_AXE, C.P_BASIC],
        [C.P_SHORT_SWORD, C.P_SKILLED],
        [C.P_BROAD_SWORD, C.P_SKILLED],
        [C.P_LONG_SWORD, C.P_EXPERT],
        [C.P_TWO_HANDED_SWORD, C.P_SKILLED],
        [C.P_SABER, C.P_SKILLED],
        [C.P_CLUB, C.P_BASIC],
        [C.P_MACE, C.P_SKILLED],
        [C.P_MORNING_STAR, C.P_SKILLED],
        [C.P_FLAIL, C.P_BASIC],
        [C.P_HAMMER, C.P_BASIC],
        [C.P_POLEARMS, C.P_SKILLED],
        [C.P_SPEAR, C.P_SKILLED],
        [C.P_TRIDENT, C.P_BASIC],
        [C.P_LANCE, C.P_EXPERT],
        [C.P_BOW, C.P_BASIC],
        [C.P_CROSSBOW, C.P_SKILLED],
        [C.P_ATTACK_SPELL, C.P_SKILLED],
        [C.P_HEALING_SPELL, C.P_SKILLED],
        [C.P_CLERIC_SPELL, C.P_SKILLED],
        [C.P_RIDING, C.P_EXPERT],
        [C.P_TWO_WEAPON_COMBAT, C.P_SKILLED],
        [C.P_BARE_HANDED_COMBAT, C.P_EXPERT]
    ],
    Monk: [
        [C.P_QUARTERSTAFF, C.P_BASIC],
        [C.P_SPEAR, C.P_BASIC],
        [C.P_CROSSBOW, C.P_BASIC],
        [C.P_SHURIKEN, C.P_BASIC],
        [C.P_ATTACK_SPELL, C.P_BASIC],
        [C.P_HEALING_SPELL, C.P_EXPERT],
        [C.P_DIVINATION_SPELL, C.P_BASIC],
        [C.P_ENCHANTMENT_SPELL, C.P_BASIC],
        [C.P_CLERIC_SPELL, C.P_SKILLED],
        [C.P_ESCAPE_SPELL, C.P_SKILLED],
        [C.P_MATTER_SPELL, C.P_BASIC],
        [C.P_MARTIAL_ARTS, C.P_GRAND_MASTER]
    ],
    Priest: [
        [C.P_CLUB, C.P_EXPERT],
        [C.P_MACE, C.P_EXPERT],
        [C.P_MORNING_STAR, C.P_EXPERT],
        [C.P_FLAIL, C.P_EXPERT],
        [C.P_HAMMER, C.P_EXPERT],
        [C.P_QUARTERSTAFF, C.P_EXPERT],
        [C.P_POLEARMS, C.P_SKILLED],
        [C.P_SPEAR, C.P_SKILLED],
        [C.P_TRIDENT, C.P_SKILLED],
        [C.P_LANCE, C.P_BASIC],
        [C.P_BOW, C.P_BASIC],
        [C.P_SLING, C.P_BASIC],
        [C.P_CROSSBOW, C.P_BASIC],
        [C.P_DART, C.P_BASIC],
        [C.P_SHURIKEN, C.P_BASIC],
        [C.P_BOOMERANG, C.P_BASIC],
        [C.P_UNICORN_HORN, C.P_SKILLED],
        [C.P_HEALING_SPELL, C.P_EXPERT],
        [C.P_DIVINATION_SPELL, C.P_EXPERT],
        [C.P_CLERIC_SPELL, C.P_EXPERT],
        [C.P_BARE_HANDED_COMBAT, C.P_BASIC]
    ],
    Rogue: [
        [C.P_DAGGER, C.P_EXPERT],
        [C.P_KNIFE, C.P_EXPERT],
        [C.P_SHORT_SWORD, C.P_EXPERT],
        [C.P_BROAD_SWORD, C.P_SKILLED],
        [C.P_LONG_SWORD, C.P_SKILLED],
        [C.P_TWO_HANDED_SWORD, C.P_BASIC],
        [C.P_SABER, C.P_SKILLED],
        [C.P_CLUB, C.P_SKILLED],
        [C.P_MACE, C.P_SKILLED],
        [C.P_MORNING_STAR, C.P_BASIC],
        [C.P_FLAIL, C.P_BASIC],
        [C.P_HAMMER, C.P_BASIC],
        [C.P_POLEARMS, C.P_BASIC],
        [C.P_SPEAR, C.P_BASIC],
        [C.P_CROSSBOW, C.P_EXPERT],
        [C.P_DART, C.P_EXPERT],
        [C.P_SHURIKEN, C.P_SKILLED],
        [C.P_DIVINATION_SPELL, C.P_SKILLED],
        [C.P_ESCAPE_SPELL, C.P_SKILLED],
        [C.P_MATTER_SPELL, C.P_SKILLED],
        [C.P_RIDING, C.P_BASIC],
        [C.P_TWO_WEAPON_COMBAT, C.P_EXPERT],
        [C.P_BARE_HANDED_COMBAT, C.P_EXPERT]
    ],
    Ranger: [
        [C.P_DAGGER, C.P_EXPERT],
        [C.P_KNIFE, C.P_SKILLED],
        [C.P_AXE, C.P_SKILLED],
        [C.P_PICK_AXE, C.P_BASIC],
        [C.P_SHORT_SWORD, C.P_BASIC],
        [C.P_MORNING_STAR, C.P_BASIC],
        [C.P_FLAIL, C.P_SKILLED],
        [C.P_HAMMER, C.P_BASIC],
        [C.P_QUARTERSTAFF, C.P_BASIC],
        [C.P_POLEARMS, C.P_SKILLED],
        [C.P_SPEAR, C.P_EXPERT],
        [C.P_TRIDENT, C.P_BASIC],
        [C.P_BOW, C.P_EXPERT],
        [C.P_SLING, C.P_EXPERT],
        [C.P_CROSSBOW, C.P_EXPERT],
        [C.P_DART, C.P_EXPERT],
        [C.P_SHURIKEN, C.P_SKILLED],
        [C.P_BOOMERANG, C.P_EXPERT],
        [C.P_WHIP, C.P_BASIC],
        [C.P_HEALING_SPELL, C.P_BASIC],
        [C.P_DIVINATION_SPELL, C.P_EXPERT],
        [C.P_ESCAPE_SPELL, C.P_BASIC],
        [C.P_RIDING, C.P_BASIC],
        [C.P_BARE_HANDED_COMBAT, C.P_BASIC]
    ],
    Samurai: [
        [C.P_DAGGER, C.P_BASIC],
        [C.P_KNIFE, C.P_SKILLED],
        [C.P_SHORT_SWORD, C.P_EXPERT],
        [C.P_BROAD_SWORD, C.P_SKILLED],
        [C.P_LONG_SWORD, C.P_EXPERT],
        [C.P_TWO_HANDED_SWORD, C.P_EXPERT],
        [C.P_SABER, C.P_BASIC],
        [C.P_FLAIL, C.P_SKILLED],
        [C.P_QUARTERSTAFF, C.P_BASIC],
        [C.P_POLEARMS, C.P_SKILLED],
        [C.P_SPEAR, C.P_SKILLED],
        [C.P_LANCE, C.P_SKILLED],
        [C.P_BOW, C.P_EXPERT],
        [C.P_SHURIKEN, C.P_EXPERT],
        [C.P_ATTACK_SPELL, C.P_BASIC],
        [C.P_DIVINATION_SPELL, C.P_BASIC],
        [C.P_CLERIC_SPELL, C.P_SKILLED],
        [C.P_RIDING, C.P_SKILLED],
        [C.P_TWO_WEAPON_COMBAT, C.P_EXPERT],
        [C.P_MARTIAL_ARTS, C.P_MASTER]
    ],
    Tourist: [
        [C.P_DAGGER, C.P_EXPERT],
        [C.P_KNIFE, C.P_SKILLED],
        [C.P_AXE, C.P_BASIC],
        [C.P_PICK_AXE, C.P_BASIC],
        [C.P_SHORT_SWORD, C.P_EXPERT],
        [C.P_BROAD_SWORD, C.P_BASIC],
        [C.P_LONG_SWORD, C.P_BASIC],
        [C.P_TWO_HANDED_SWORD, C.P_BASIC],
        [C.P_SABER, C.P_SKILLED],
        [C.P_MACE, C.P_BASIC],
        [C.P_MORNING_STAR, C.P_BASIC],
        [C.P_FLAIL, C.P_BASIC],
        [C.P_HAMMER, C.P_BASIC],
        [C.P_QUARTERSTAFF, C.P_BASIC],
        [C.P_POLEARMS, C.P_BASIC],
        [C.P_SPEAR, C.P_BASIC],
        [C.P_TRIDENT, C.P_BASIC],
        [C.P_LANCE, C.P_BASIC],
        [C.P_BOW, C.P_BASIC],
        [C.P_SLING, C.P_BASIC],
        [C.P_CROSSBOW, C.P_BASIC],
        [C.P_DART, C.P_EXPERT],
        [C.P_SHURIKEN, C.P_BASIC],
        [C.P_BOOMERANG, C.P_BASIC],
        [C.P_WHIP, C.P_BASIC],
        [C.P_UNICORN_HORN, C.P_SKILLED],
        [C.P_DIVINATION_SPELL, C.P_BASIC],
        [C.P_ENCHANTMENT_SPELL, C.P_BASIC],
        [C.P_ESCAPE_SPELL, C.P_SKILLED],
        [C.P_RIDING, C.P_BASIC],
        [C.P_TWO_WEAPON_COMBAT, C.P_SKILLED],
        [C.P_BARE_HANDED_COMBAT, C.P_SKILLED]
    ],
    Valkyrie: [
        [C.P_DAGGER, C.P_EXPERT],
        [C.P_AXE, C.P_EXPERT],
        [C.P_PICK_AXE, C.P_SKILLED],
        [C.P_SHORT_SWORD, C.P_SKILLED],
        [C.P_BROAD_SWORD, C.P_SKILLED],
        [C.P_LONG_SWORD, C.P_EXPERT],
        [C.P_TWO_HANDED_SWORD, C.P_EXPERT],
        [C.P_SABER, C.P_BASIC],
        [C.P_HAMMER, C.P_EXPERT],
        [C.P_QUARTERSTAFF, C.P_BASIC],
        [C.P_POLEARMS, C.P_SKILLED],
        [C.P_SPEAR, C.P_EXPERT],
        [C.P_TRIDENT, C.P_BASIC],
        [C.P_LANCE, C.P_SKILLED],
        [C.P_SLING, C.P_BASIC],
        [C.P_ATTACK_SPELL, C.P_BASIC],
        [C.P_ESCAPE_SPELL, C.P_BASIC],
        [C.P_RIDING, C.P_SKILLED],
        [C.P_TWO_WEAPON_COMBAT, C.P_SKILLED],
        [C.P_BARE_HANDED_COMBAT, C.P_EXPERT]
    ],
    Wizard: [
        [C.P_DAGGER, C.P_EXPERT],
        [C.P_KNIFE, C.P_SKILLED],
        [C.P_AXE, C.P_SKILLED],
        [C.P_SHORT_SWORD, C.P_BASIC],
        [C.P_CLUB, C.P_SKILLED],
        [C.P_MACE, C.P_BASIC],
        [C.P_QUARTERSTAFF, C.P_EXPERT],
        [C.P_POLEARMS, C.P_SKILLED],
        [C.P_SPEAR, C.P_BASIC],
        [C.P_TRIDENT, C.P_BASIC],
        [C.P_SLING, C.P_SKILLED],
        [C.P_DART, C.P_EXPERT],
        [C.P_SHURIKEN, C.P_BASIC],
        [C.P_ATTACK_SPELL, C.P_EXPERT],
        [C.P_HEALING_SPELL, C.P_SKILLED],
        [C.P_DIVINATION_SPELL, C.P_EXPERT],
        [C.P_ENCHANTMENT_SPELL, C.P_SKILLED],
        [C.P_CLERIC_SPELL, C.P_SKILLED],
        [C.P_ESCAPE_SPELL, C.P_EXPERT],
        [C.P_MATTER_SPELL, C.P_EXPERT],
        [C.P_RIDING, C.P_BASIC],
        [C.P_BARE_HANDED_COMBAT, C.P_BASIC]
    ],
};

// include/objects.h oc_skill: the sign distinguishes ammunition/missiles.
const OBJECT_SKILLS = new Map([
    ["arrow", -C.P_BOW],
    ["elven arrow", -C.P_BOW],
    ["orcish arrow", -C.P_BOW],
    ["silver arrow", -C.P_BOW],
    ["ya", -C.P_BOW],
    ["crossbow bolt", -C.P_CROSSBOW],
    ["dart", -C.P_DART],
    ["shuriken", -C.P_SHURIKEN],
    ["boomerang", -C.P_BOOMERANG],
    ["spear", C.P_SPEAR],
    ["elven spear", C.P_SPEAR],
    ["orcish spear", C.P_SPEAR],
    ["dwarvish spear", C.P_SPEAR],
    ["silver spear", C.P_SPEAR],
    ["javelin", C.P_SPEAR],
    ["trident", C.P_TRIDENT],
    ["dagger", C.P_DAGGER],
    ["elven dagger", C.P_DAGGER],
    ["orcish dagger", C.P_DAGGER],
    ["silver dagger", C.P_DAGGER],
    ["athame", C.P_DAGGER],
    ["scalpel", C.P_KNIFE],
    ["knife", C.P_KNIFE],
    ["stiletto", C.P_KNIFE],
    ["worm tooth", C.P_KNIFE],
    ["crysknife", C.P_KNIFE],
    ["axe", C.P_AXE],
    ["battle-axe", C.P_AXE],
    ["short sword", C.P_SHORT_SWORD],
    ["elven short sword", C.P_SHORT_SWORD],
    ["orcish short sword", C.P_SHORT_SWORD],
    ["dwarvish short sword", C.P_SHORT_SWORD],
    ["scimitar", C.P_SABER],
    ["silver saber", C.P_SABER],
    ["broadsword", C.P_BROAD_SWORD],
    ["elven broadsword", C.P_BROAD_SWORD],
    ["long sword", C.P_LONG_SWORD],
    ["two-handed sword", C.P_TWO_HANDED_SWORD],
    ["katana", C.P_LONG_SWORD],
    ["tsurugi", C.P_TWO_HANDED_SWORD],
    ["runesword", C.P_BROAD_SWORD],
    ["partisan", C.P_POLEARMS],
    ["ranseur", C.P_POLEARMS],
    ["spetum", C.P_POLEARMS],
    ["glaive", C.P_POLEARMS],
    ["halberd", C.P_POLEARMS],
    ["bardiche", C.P_POLEARMS],
    ["voulge", C.P_POLEARMS],
    ["fauchard", C.P_POLEARMS],
    ["guisarme", C.P_POLEARMS],
    ["bill-guisarme", C.P_POLEARMS],
    ["lucern hammer", C.P_POLEARMS],
    ["bec de corbin", C.P_POLEARMS],
    ["dwarvish mattock", C.P_PICK_AXE],
    ["lance", C.P_LANCE],
    ["mace", C.P_MACE],
    ["silver mace", C.P_MACE],
    ["morning star", C.P_MORNING_STAR],
    ["war hammer", C.P_HAMMER],
    ["club", C.P_CLUB],
    ["rubber hose", C.P_WHIP],
    ["quarterstaff", C.P_QUARTERSTAFF],
    ["aklys", C.P_CLUB],
    ["flail", C.P_FLAIL],
    ["bullwhip", C.P_WHIP],
    ["bow", C.P_BOW],
    ["elven bow", C.P_BOW],
    ["orcish bow", C.P_BOW],
    ["yumi", C.P_BOW],
    ["sling", C.P_SLING],
    ["crossbow", C.P_CROSSBOW],
    ["pick-axe", C.P_PICK_AXE],
    ["grappling hook", C.P_FLAIL],
    ["unicorn horn", C.P_UNICORN_HORN],
]);

export const SKILL_NAMES = [
    'no skill', 'dagger', 'knife', 'axe', 'pick-axe', 'short sword', 'broadsword',
    'long sword', 'two-handed sword', 'saber', 'club', 'mace', 'morning star',
    'flail', 'hammer', 'quarterstaff', 'polearms', 'spear', 'trident', 'lance',
    'bow', 'sling', 'crossbow', 'dart', 'shuriken', 'boomerang', 'whip', 'unicorn horn',
    'attack spells', 'healing spells', 'divination spells', 'enchantment spells',
    'clerical spells', 'escape spells', 'matter spells', 'bare handed combat',
    'two weapon combat', 'riding',
];
export const SKILL_LEVEL_NAMES = ['Unknown', 'Unskilled', 'Basic', 'Skilled', 'Expert', 'Master', 'Grand Master'];
const SPELL_SKILLS = ['attack', 'healing', 'divination', 'enchantment', 'cleric', 'escape', 'matter'];
const INITIAL_SPELL_SKILLS = {
    Healer: [C.P_HEALING_SPELL], Monk: [C.P_HEALING_SPELL], Priest: [C.P_CLERIC_SPELL],
    Wizard: [C.P_ATTACK_SPELL, C.P_ENCHANTMENT_SPELL],
};

export function spellSkillType(category) {
    const index = SPELL_SKILLS.indexOf(String(category || '').replace(/ spells$/, '').replace('clerical', 'cleric'));
    return index < 0 ? C.P_NONE : C.P_ATTACK_SPELL + index;
}

export function skillName(skill) {
    const role = game.urole?.name?.m || game._startup_role;
    return skill === C.P_BARE_HANDED_COMBAT && ['Samurai', 'Monk'].includes(role)
        ? 'martial arts' : SKILL_NAMES[skill];
}

export function objectWeaponSkill(obj) {
    if (!obj) return C.P_BARE_HANDED_COMBAT;
    if (obj.cls && !['weapon', 'tool', 'gem'].includes(obj.cls)) return C.P_NONE;
    if (obj.oc_skill != null) return obj.oc_skill;
    if (obj.cls === 'gem') return -C.P_SLING;
    const name = String(obj.actualKind || obj.kind || '').toLowerCase();
    return OBJECT_SKILLS.get(JAPANESE_ITEM_ALIASES.get(name) || name) || C.P_NONE;
}

// C weapon.c:weapon_hit_bonus and weapon_dam_bonus share the same category
// selection. Two-weapon penalties depend on object identity, not weapon kind.
export function weaponSkillBonuses(obj, level = skill => game.u.weapon_skills?.[skill]?.skill || 0) {
    const u = game.u, weaponType = Math.abs(objectWeaponSkill(obj));
    const primary = u.uwep || game.inventory?.find(item => item.wielded);
    const secondary = u.uswapwep || game.inventory?.find(item => item.alternate);
    const dual = u.twoweap && obj && (obj === primary || obj === secondary);
    const type = dual ? C.P_TWO_WEAPON_COMBAT : weaponType;
    let skill = level(type), hit = 0, damage = 0;
    if (dual) skill = Math.min(skill, level(weaponType));
    if (type && (type <= C.P_LAST_WEAPON || dual)) {
        const rank = Math.max(C.P_UNSKILLED, Math.min(C.P_EXPERT, skill)) - 1;
        hit = (dual ? [-9, -7, -5, -3] : [-4, 0, 2, 3])[rank];
        damage = (dual ? [-3, -1, 0, 1] : [-2, 0, 1, 2])[rank];
    } else if (type === C.P_BARE_HANDED_COMBAT) {
        const rank = Math.max(C.P_UNSKILLED, skill) - 1;
        const martial = ['Monk', 'Samurai'].includes(game.urole?.name?.m || game._startup_role);
        hit = Math.trunc((rank + 2) * (martial ? 2 : 1) / 2);
        damage = Math.trunc((rank + 1) * (martial ? 3 : 1) / 2);
    }
    if (u.usteed) {
        const riding = level(C.P_RIDING);
        if (riding <= C.P_UNSKILLED) hit -= 2;
        else if (riding === C.P_BASIC) hit--;
        if (u.twoweap) hit -= 2;
        if (!dual && riding >= C.P_SKILLED) damage += riding - C.P_BASIC;
    }
    return { hit, damage };
}

// C steed.c:exercise_steed counts movement attempts which reach domove's
// tentative-position phase, including a subsequently refused pet displacement.
export function exerciseSteed() {
    if (!game.u.usteed) return '';
    game.u.urideturns = (game.u.urideturns || 0) + 1;
    if (game.u.urideturns < 100) return '';
    game.u.urideturns = 0;
    return useSkill(C.P_RIDING, 1);
}

export function skillPracticeNeeded(level) {
    return level * level * 20;
}

export function skillSlotsRequired(skill) {
    const level = game.u.weapon_skills[skill].skill;
    return skill <= C.P_LAST_WEAPON || skill === C.P_TWO_WEAPON_COMBAT ? level : Math.trunc((level + 1) / 2);
}

export function canAdvanceSkill(skill, speedy = false) {
    const u = game.u, record = u.weapon_skills?.[skill];
    if (!record?.skill || record.skill >= record.max_skill || (u.skills_advanced || 0) >= C.P_SKILL_LIMIT) return false;
    if (game.flags?.debug && speedy) return true;
    return record.advance >= skillPracticeNeeded(record.skill) && (u.weapon_slots || 0) >= skillSlotsRequired(skill);
}

export function couldAdvanceSkill(skill) {
    const u = game.u, record = u.weapon_skills?.[skill];
    return !!record?.skill && record.skill < record.max_skill && (u.skills_advanced || 0) < C.P_SKILL_LIMIT
        && record.advance >= skillPracticeNeeded(record.skill);
}

export function peakedSkill(skill) {
    const record = game.u.weapon_skills?.[skill];
    return !!record?.skill && record.skill >= record.max_skill && record.advance >= skillPracticeNeeded(record.skill);
}

export function unrestrictWeaponSkill(skill) {
    const record = game.u.weapon_skills?.[skill];
    if (record && !record.skill) Object.assign(record, { skill: C.P_UNSKILLED, max_skill: C.P_BASIC, advance: 0 });
}

export function initializeSkills(role, inventory = game.inventory || []) {
    const u = game.u;
    u.weapon_skills = Array.from({ length: C.P_NUM_SKILLS }, () => ({ skill: 0, max_skill: 0, advance: 0 }));
    u.weapon_slots = 0; u.skills_advanced = 0; u.skill_record = [];
    for (const obj of inventory) {
        const skill = objectWeaponSkill(obj);
        // is_ammo excludes sling stones and bow/crossbow ammo, not darts.
        if (skill <= -C.P_BOW && skill >= -C.P_CROSSBOW) continue;
        if (skill) u.weapon_skills[Math.abs(skill)].skill = C.P_BASIC;
    }
    for (const skill of INITIAL_SPELL_SKILLS[role] || []) u.weapon_skills[skill].skill = C.P_BASIC;
    for (const [skill, max] of ROLE_SKILL_LIMITS[role]) {
        u.weapon_skills[skill].max_skill = max;
        if (!u.weapon_skills[skill].skill) u.weapon_skills[skill].skill = C.P_UNSKILLED;
    }
    if (u.weapon_skills[C.P_BARE_HANDED_COMBAT].max_skill > C.P_EXPERT)
        u.weapon_skills[C.P_BARE_HANDED_COMBAT].skill = C.P_BASIC;
    if (role === 'Knight') u.weapon_skills[C.P_RIDING].skill = C.P_BASIC;
    for (const record of u.weapon_skills) {
        if (!record.skill) continue;
        record.max_skill = Math.max(record.skill, record.max_skill);
        record.advance = skillPracticeNeeded(record.skill - 1);
    }
    // Every role's special spell category already occurs in these C tables.
    // Pauper reinitialization happens after ordinary inventory-based skills.
    if (u.uroleplay?.pauper) {
        for (const record of u.weapon_skills) if (record.skill > C.P_UNSKILLED) {
            record.skill = C.P_UNSKILLED; record.advance = 0;
        }
        u.weapon_slots = 2;
    }
}

export function useSkill(skill, degree) {
    const record = game.u?.weapon_skills?.[skill];
    if (!skill || !record?.skill) return '';
    const before = canAdvanceSkill(skill);
    record.advance = (record.advance + degree) & 0xffff; // C unsigned short.
    if (before || !canAdvanceSkill(skill)) return '';
    const type = skill <= C.P_LAST_WEAPON ? 'weapon ' : skill <= C.P_LAST_SPELL ? 'spell casting ' : 'fighting ';
    return `You feel more confident in your ${type}skills.`;
}

export function addWeaponSkill(count) {
    const u = game.u;
    const before = Array.from({ length: C.P_NUM_SKILLS }, (_, skill) => canAdvanceSkill(skill)).filter(Boolean).length;
    u.weapon_slots = (u.weapon_slots || 0) + count;
    const after = Array.from({ length: C.P_NUM_SKILLS }, (_, skill) => canAdvanceSkill(skill)).filter(Boolean).length;
    return after > before ? 'You feel more confident in your skills.' : '';
}

// C give_may_advance_msg calls handle_tip immediately after the confidence line.
export function skillAdvanceTip() {
    if (game.flags?.tips === false || game.context?.tips & 1) return '';
    game.context ??= {};
    game.context.tips = (game.context.tips || 0) | 1;
    return '(Tip: use the #enhance command to advance them.)';
}

export function advanceSkill(skill) {
    const u = game.u, record = u.weapon_skills[skill];
    u.weapon_slots -= skillSlotsRequired(skill);
    record.skill++;
    u.skill_record ??= [];
    u.skill_record[u.skills_advanced++] = skill;
    return `You are now ${record.skill >= record.max_skill ? 'most' : 'more'} skilled in ${skillName(skill)}.`;
}

export function loseWeaponSkill(count) {
    const u = game.u;
    while (count-- > 0) {
        if (u.weapon_slots) u.weapon_slots--;
        else if (u.skills_advanced) {
            const skill = u.skill_record[--u.skills_advanced];
            if (u.weapon_skills[skill].skill <= C.P_UNSKILLED) throw new Error('Invalid skill advancement history');
            u.weapon_skills[skill].skill--;
            u.weapon_slots = skillSlotsRequired(skill) - 1;
        }
    }
}

export function drainWeaponSkill(count) {
    const u = game.u, drained = new Set();
    while (count-- > 0 && u.skills_advanced) {
        const index = rn2(u.skills_advanced), skill = u.skill_record[index];
        u.skill_record.splice(index, 1); u.skills_advanced--;
        const record = u.weapon_skills[skill];
        if (record.skill <= C.P_UNSKILLED) throw new Error('Invalid skill advancement history');
        record.skill--; drained.add(skill);
        u.weapon_slots += skillSlotsRequired(skill);
        const current = skillPracticeNeeded(record.skill), previous = skillPracticeNeeded(record.skill - 1);
        if (record.advance >= current) record.advance = previous + rn2(current - previous);
    }
    return [...drained].sort((a, b) => a - b).map(skill =>
        `You forget ${u.weapon_skills[skill].skill >= C.P_BASIC ? 'some of ' : ''}your training in ${skillName(skill)}.`);
}

export function skillMenuEntries(speedy = false) {
    const records = game.u.weapon_skills;
    const available = records.filter((_, skill) => canAdvanceSkill(skill, speedy)).length;
    const waiting = records.filter((_, skill) => !canAdvanceSkill(skill, speedy) && couldAdvanceSkill(skill)).length;
    const peaked = records.filter((_, skill) => !canAdvanceSkill(skill, speedy) && !couldAdvanceSkill(skill) && peakedSkill(skill)).length;
    const selectable = available + waiting + peaked > 0;
    let title = available ? 'Pick a skill to advance:' : 'Current skills:';
    if (game.flags?.debug && !speedy) title += `  (${game.u.weapon_slots} slot${game.u.weapon_slots === 1 ? '' : 's'} available)`;
    const entries = [{ text: title, heading: true }, { text: '' }];
    if (waiting) entries.push({ text: `(Skill${waiting === 1 ? '' : 's'} flagged by "*" may be enhanced ${game.u.ulevel < 30
        ? "when you're more experienced" : 'if skill slots become available'}.)` });
    if (peaked) entries.push({ text: `(Skill${peaked === 1 ? '' : 's'} flagged by "#" cannot be enhanced any further.)` });
    if (waiting || peaked) entries.push({ text: '' });
    const longest = Math.max(...records.map((record, skill) => record.skill ? skillName(skill).length : 0));
    for (const [first, last, name] of [[35, 37, 'Fighting Skills'], [1, 27, 'Weapon Skills'], [28, 34, 'Spellcasting Skills']]) {
        entries.push({ text: name, heading: true });
        for (let skill = first; skill <= last; skill++) {
            const record = records[skill];
            if (!record.skill) continue;
            const can = canAdvanceSkill(skill, speedy);
            const prefix = !selectable || can ? '' : couldAdvanceSkill(skill) ? '  * ' : peakedSkill(skill) ? '  # ' : '    ';
            const level = SKILL_LEVEL_NAMES[record.skill];
            const text = game.flags?.debug
                ? ` ${prefix}${skillName(skill).padEnd(longest)} ${level.padEnd(12)} ${String(record.advance).padStart(5)}(${String(skillPracticeNeeded(record.skill)).padStart(4)})`
                : ` ${prefix} ${skillName(skill).padEnd(longest)} [${level}]`;
            entries.push({ text, skill: can ? skill : null });
        }
    }
    return { entries, available };
}
