// u_init_adjabil.js — XL intrinsic grants from role/race (subset of adjabil).
// C ref: attrib.c adjabil(); u_init.c u_init_misc calls adjabil(0, 1) with u.ulevel==0.
//
// Ported: role_abil / elf_abil / orc_abil tables for **ulevel == 1** entries only;
// **add_weapon_skill** / **lose_weapon_skill** when **oldlevel > 0** and level changes
// (weapon.c via attrib.c adjabil).
// Not ported: full intrinsic **adjabil** for XL>1, FROMEXPER/FROMRACE bit layout,
// postadjabil / see_monsters, dwarf/gnome/elf infravision (no u field yet).

import { game } from './gstate.js';
import { addWeaponSkill, loseWeaponSkill } from './u_init_skills.js';

/** Role abbrev → u.* keys granted at XL 1 (attrib.c arc_abil … wiz_abil). */
const XL1_BY_ROLE_ABBR = {
    Arc: ['Searching'],
    Bar: ['Poison_resistance'],
    Hea: ['Poison_resistance'],
    Mon: ['Fast', 'Sleep_resistance', 'See_invisible'],
    Ran: ['Searching'],
    Rog: ['Stealth'],
    Sam: ['Fast'],
    Val: ['Cold_resistance'],
};

const MANAGED = [
    'Poison_resistance', 'Stealth', 'Fast', 'Searching', 'Cold_resistance',
    'Sleep_resistance', 'See_invisible',
];

function clearManaged() {
    const u = game.u;
    if (!u) return;
    for (const k of MANAGED) u[k] = 0;
}

/**
 * @param {number} oldlevel
 * @param {number} newlevel
 */
export function applyAdjabil(oldlevel, newlevel) {
    if (oldlevel === 0 && newlevel === 1) {
        clearManaged();
        const u = game.u;
        if (!u) return;
        const abbr = game.urole?.abbr;
        const keys = abbr && Object.prototype.hasOwnProperty.call(XL1_BY_ROLE_ABBR, abbr)
            ? XL1_BY_ROLE_ABBR[abbr]
            : undefined;
        if (keys) {
            for (const k of keys) u[k] = 1;
        }
        /* C: attrib.c orc_abil — XL 1 poison + infravision (infravision not in JS u yet) */
        if (game.urace?.name === 'orc') u.Poison_resistance = 1;
        return;
    }
    /* C: attrib.c adjabil — weapon slots on XL change when oldlevel > 0 */
    if (oldlevel > 0) {
        if (newlevel > oldlevel) addWeaponSkill(game.u, newlevel - oldlevel);
        else if (newlevel < oldlevel) loseWeaponSkill(game.u, oldlevel - newlevel);
    }
}
