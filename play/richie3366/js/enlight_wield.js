// enlight_wield.js — Weapon / hands lines for #attributes (enlightenment).
// C ref: cmd.c (weaponless / uwep / twoweapon branch before skill titles).

/** C: humanoid() on hero — vanilla `urace` forms with normal hands (poly later). */
const HUMANOID_RACE_ADJ = new Set(['human', 'elven', 'dwarven', 'gnomish', 'orcish']);

function humanoidHero(g) {
    const adj = g?.urace?.adj;
    if (!adj) return true;
    return HUMANOID_RACE_ADJ.has(adj);
}

/**
 * @param {object} u — game.u
 * @param {object} g — game
 */
export function enlightWieldLine(u, g) {
    if (u.twoweap)
        return '  You are wielding two weapons at once.';
    if (u.uwep) {
        if (typeof u.uwep === 'string')
            return `  You are wielding ${u.uwep}.`;
        // C: weapon_descr(uwep) — port with obj/invent
        return '  You are wielding something.';
    }
    if (u.uarmg)
        return '  You are empty handed.';
    if (humanoidHero(g))
        return '  You are bare handed.';
    return '  You are not wielding anything.';
}

/** C: skill title after wield state — bare-handed stub until weapon.c. */
export function enlightWieldSkillLine(u) {
    if (!u.uwep)
        return '  You are unskilled in bare handed combat.';
    return '  You are unskilled in that weapon type.';
}
