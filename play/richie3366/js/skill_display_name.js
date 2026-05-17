// skill_display_name.js — P_NAME(skill) subset for plines (weapon.c).
// C ref: weapon.c skill_names_indices[], odd_skill_names[], barehands_or_martial[],
//        martial_bonus() → P_NAME() macro.

import {
    P_NONE,
    P_NUM_SKILLS,
    P_BARE_HANDED_COMBAT,
} from './const.js';

/**
 * NetHack 5.0 `P_NAME(skill)` — approximate OBJ_NAME / odd_skill_names strings
 * for `#enhance` / skill_advance You() plines.
 * @param {number} skill
 * @param {{ urole?: { abbr?: string } }} [g]
 */
export function pSkillDisplayName(skill, g) {
    if (skill <= P_NONE || skill >= P_NUM_SKILLS) return 'skill';
    if (skill === P_BARE_HANDED_COMBAT) {
        const abbr = g?.urole?.abbr;
        if (abbr === 'Sam' || abbr === 'Mon') return 'martial arts';
        return 'bare handed combat';
    }
    return P_SKILL_DISPLAY_NAME[skill] || 'skill';
}

/** Index = p_skills enum (P_NONE …); [0] unused. */
const P_SKILL_DISPLAY_NAME = [
    '',
    'dagger',
    'knife',
    'axe',
    'pick-axe',
    'short sword',
    'broadsword',
    'long sword',
    'two-handed sword',
    'saber',
    'club',
    'mace',
    'morning star',
    'flail',
    'hammer',
    'quarterstaff',
    'polearms',
    'spear',
    'trident',
    'lance',
    'bow',
    'sling',
    'crossbow',
    'dart',
    'shuriken',
    'boomerang',
    'whip',
    'unicorn horn',
    'attack spells',
    'healing spells',
    'divination spells',
    'enchantment spells',
    'clerical spells',
    'escape spells',
    'matter spells',
    '',
    'two weapon combat',
    'riding',
];
