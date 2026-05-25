// enlight_wield.js — Weapon / hands lines for #attributes (enlightenment).
// C ref: insight.c status_enlightenment(); weapon.c weapon_descr(), skill_level_name(), skill_name().

import {
    P_NONE,
    P_ISRESTRICTED,
    P_UNSKILLED,
    P_BASIC,
    P_SKILLED,
    P_EXPERT,
    P_MASTER,
    P_GRAND_MASTER,
} from './const.js';
import { an } from './decor.js';
import { pSkillDisplayName } from './skill_display_name.js';
import { weaponType, isAmmo } from './weapon_kind.js';
import { canAdvance } from './u_init_skills.js';

/** C: humanoid() on hero — vanilla `urace` forms with normal hands (poly later). */
const HUMANOID_RACE_ADJ = new Set(['human', 'elven', 'dwarven', 'gnomish', 'orcish']);

function humanoidHero(g) {
    const adj = g?.urace?.adj;
    if (!adj) return true;
    return HUMANOID_RACE_ADJ.has(adj);
}

/** C: weapon.c weapon_descr — P_NAME(weapon_type(obj)) for weapons. */
function weaponDescrLikeC(obj, g) {
    const wtype = weaponType(obj);
    if (wtype === P_NONE) return 'item';
    return pSkillDisplayName(wtype, g);
}

/** C: weapon.c skill_level_name + insight.c lcase(). */
function skillLevelNameLowerLikeC(skillIdx, u) {
    const lvl = u.weapon_skills?.[skillIdx]?.skill ?? P_ISRESTRICTED;
    switch (lvl) {
    case P_ISRESTRICTED: return 'no';
    case P_UNSKILLED: return 'unskilled';
    case P_BASIC: return 'basic';
    case P_SKILLED: return 'skilled';
    case P_EXPERT: return 'expert';
    case P_MASTER: return 'master';
    case P_GRAND_MASTER: return 'grand master';
    default: return 'unknown';
    }
}

/**
 * @param {object} u — game.u
 * @param {object} g — game
 */
export function enlightWieldLine(u, g) {
    if (u.twoweap)
        return '  You are wielding two weapons at once.';
    if (!u.uwep) {
        if (u.uarmg)
            return '  You are empty handed.';
        if (humanoidHero(g))
            return '  You are bare handed.';
        return '  You are not wielding anything.';
    }
    if (typeof u.uwep === 'string')
        return `  You are wielding ${u.uwep}.`;
    const what = weaponDescrLikeC(u.uwep, g);
    if (/^(armor|food|venom)$/i.test(what))
        return `  You are wielding some ${what}.`;
    return `  You are wielding ${an(what)}.`;
}

/** C: insight.c status_enlightenment — skill with current weapon. */
export function enlightWieldSkillLine(u, g) {
    const uwep = u.uwep;
    if (!uwep || typeof uwep === 'string') {
        const wtype = P_NONE;
        const sklvl = u.weapon_skills?.[wtype]?.skill ?? P_UNSKILLED;
        if (sklvl === P_UNSKILLED)
            return '  You are unskilled in bare handed combat.';
        return '  You are unskilled in that weapon type.';
    }
    const wtype = weaponType(uwep);
    if (wtype === P_NONE || isAmmo(uwep))
        return '  You are unskilled in that weapon type.';
    const sklvl = u.weapon_skills?.[wtype]?.skill ?? P_UNSKILLED;
    const hav = sklvl !== P_UNSKILLED && sklvl !== P_SKILLED;
    const sklvlbuf = skillLevelNameLowerLikeC(wtype, u);
    const skname = pSkillDisplayName(wtype, g);
    let buf = hav
        ? `  You have ${sklvlbuf} skill with ${skname}.`
        : `  You are ${sklvlbuf} in ${skname}.`;
    if (!u.twoweap && canAdvance(u, wtype, false, g))
        buf += ' and can enhance that';
    return buf;
}
