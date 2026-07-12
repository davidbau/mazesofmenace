// roles.js — Role, race, gender, alignment data.
// C ref: role.c — roles[], races[], aligns[], genders[], Hello()
//
// mnum / race.mnum are monster-table IDs (PM_*), not roles[]/races[] indexes.

import {
    PM_ARCHEOLOGIST,
    PM_BARBARIAN,
    PM_CAVE_DWELLER,
    PM_HEALER,
    PM_KNIGHT,
    PM_MONK,
    PM_CLERIC,
    PM_RANGER,
    PM_ROGUE,
    PM_SAMURAI,
    PM_TOURIST,
    PM_VALKYRIE,
    PM_WIZARD,
    PM_HUMAN,
    PM_ELF,
    PM_DWARF,
    PM_GNOME,
    PM_ORC,
    NON_PM,
} from './generated/monsters_data.js';
import { A_CHAOTIC, A_NEUTRAL, A_LAWFUL } from './const.js';

// STR18(n) encoding used as racial Str max (attrib.h / role.c).
const STR18_100 = 18 + 100;
const STR18_50 = 18 + 50;

// C ref: you.h RoleAdvance — { infix, inrnd, lofix, lornd, hifix, hirnd }
function adv(infix, inrnd, lofix, lornd, hifix, hirnd) {
    return { infix, inrnd, lofix, lornd, hifix, hirnd };
}

export const roles = [
    { name: { m: 'Archeologist', f: 'Archeologist' }, mnum: PM_ARCHEOLOGIST, petnum: NON_PM },
    { name: { m: 'Barbarian', f: 'Barbarian' }, mnum: PM_BARBARIAN, petnum: NON_PM },
    { name: { m: 'Caveman', f: 'Cavewoman' }, mnum: PM_CAVE_DWELLER, petnum: NON_PM },
    { name: { m: 'Healer', f: 'Healer' }, mnum: PM_HEALER, petnum: NON_PM },
    { name: { m: 'Knight', f: 'Knight' }, mnum: PM_KNIGHT, petnum: NON_PM },
    { name: { m: 'Monk', f: 'Monk' }, mnum: PM_MONK, petnum: NON_PM },
    { name: { m: 'Priest', f: 'Priestess' }, mnum: PM_CLERIC, petnum: NON_PM },
    { name: { m: 'Ranger', f: 'Ranger' }, mnum: PM_RANGER, petnum: NON_PM },
    // C ref: role.c Rogue
    {
        name: { m: 'Rogue', f: 'Rogue' },
        mnum: PM_ROGUE,
        petnum: NON_PM,
        title: [
            { m: 'Footpad', f: 'Footpad' },
            { m: 'Cutpurse', f: 'Cutpurse' },
        ],
        lgod: 'Issek',
        ngod: 'Mog',
        cgod: 'Kos',
        attrbase: [7, 7, 7, 10, 7, 6],
        attrdist: [20, 10, 10, 30, 20, 10],
        initrecord: 0,
        // C: { 10, 0, 0, 8, 1, 0 } / { 1, 0, 0, 1, 0, 1 }
        hpadv: adv(10, 0, 0, 8, 1, 0),
        enadv: adv(1, 0, 0, 1, 0, 1),
    },
    { name: { m: 'Samurai', f: 'Samurai' }, mnum: PM_SAMURAI, petnum: NON_PM },
    // C ref: role.c Tourist — attrbase / attrdist / ranks
    {
        name: { m: 'Tourist', f: 'Tourist' },
        mnum: PM_TOURIST,
        petnum: NON_PM,
        title: [
            { m: 'Rambler', f: 'Rambler' },
            { m: 'Sightseer', f: 'Sightseer' },
        ],
        // C: leading '_' marks goddess; align_gname strips it
        lgod: 'Blind Io',
        ngod: '_The Lady',
        cgod: 'Offler',
        attrbase: [7, 10, 6, 7, 7, 10],
        attrdist: [15, 10, 10, 15, 30, 20],
        initrecord: 0,
        // C: { 8, 0, 0, 8, 0, 0 } / { 1, 0, 0, 1, 0, 1 }
        hpadv: adv(8, 0, 0, 8, 0, 0),
        enadv: adv(1, 0, 0, 1, 0, 1),
    },
    { name: { m: 'Valkyrie', f: 'Valkyrie' }, mnum: PM_VALKYRIE, petnum: NON_PM },
    { name: { m: 'Wizard', f: 'Wizard' }, mnum: PM_WIZARD, petnum: NON_PM },
];

export const races = [
    // C ref: role.c races[] — hpadv/enadv Init columns feed newhp()/newpw() at ulevel==0
    {
        name: 'human',
        adj: 'human',
        noun: 'human',
        mnum: PM_HUMAN,
        attrmin: [3, 3, 3, 3, 3, 3],
        attrmax: [STR18_100, 18, 18, 18, 18, 18],
        // C: { 2, 0, 0, 2, 1, 0 } / { 1, 0, 2, 0, 2, 0 }
        hpadv: adv(2, 0, 0, 2, 1, 0),
        enadv: adv(1, 0, 2, 0, 2, 0),
    },
    {
        name: 'elf',
        adj: 'elven',
        noun: 'elf',
        mnum: PM_ELF,
        attrmin: [3, 3, 3, 3, 3, 3],
        attrmax: [18, 20, 20, 18, 16, 18],
        // C: { 1, 0, 0, 1, 1, 0 } / { 2, 0, 3, 0, 3, 0 }
        hpadv: adv(1, 0, 0, 1, 1, 0),
        enadv: adv(2, 0, 3, 0, 3, 0),
    },
    {
        name: 'dwarf',
        adj: 'dwarven',
        noun: 'dwarf',
        mnum: PM_DWARF,
        attrmin: [3, 3, 3, 3, 3, 3],
        attrmax: [STR18_100, 16, 16, 20, 20, 16],
        // C: { 4, 0, 0, 3, 2, 0 } / { 0, 0, 0, 0, 0, 0 }
        hpadv: adv(4, 0, 0, 3, 2, 0),
        enadv: adv(0, 0, 0, 0, 0, 0),
    },
    {
        name: 'gnome',
        adj: 'gnomish',
        noun: 'gnome',
        mnum: PM_GNOME,
        attrmin: [3, 3, 3, 3, 3, 3],
        attrmax: [STR18_50, 19, 18, 18, 18, 18],
        // C: { 1, 0, 0, 1, 0, 0 } / { 2, 0, 2, 0, 2, 0 }
        hpadv: adv(1, 0, 0, 1, 0, 0),
        enadv: adv(2, 0, 2, 0, 2, 0),
    },
    {
        name: 'orc',
        adj: 'orcish',
        noun: 'orc',
        mnum: PM_ORC,
        attrmin: [3, 3, 3, 3, 3, 3],
        attrmax: [STR18_50, 16, 16, 18, 18, 16],
        // C: { 1, 0, 0, 1, 0, 0 } / { 1, 0, 1, 0, 1, 0 }
        // Rogue+orc init HP = 10+1 = 11 (not human fallback 10+2 = 12)
        hpadv: adv(1, 0, 0, 1, 0, 0),
        enadv: adv(1, 0, 1, 0, 1, 0),
    },
];

export const aligns = [
    { name: 'lawful', value: A_LAWFUL },
    { name: 'neutral', value: A_NEUTRAL },
    { name: 'chaotic', value: A_CHAOTIC },
];

export const genders = [
    { name: 'male', value: 0 },
    { name: 'female', value: 1 },
];

export function findRole(name) {
    if (!name) return null;
    const lc = name.toLowerCase();
    return roles.find(r => r.name.m.toLowerCase() === lc || r.name.f.toLowerCase() === lc);
}

export function findRace(name) {
    if (!name) return null;
    const lc = name.toLowerCase();
    return races.find(r => r.name.toLowerCase() === lc);
}

export function findAlign(name) {
    if (!name) return null;
    const lc = String(name).toLowerCase();
    return aligns.find(a => a.name === lc);
}

// C ref: role.c Hello() — mnum from caller (game.urole.mnum)
export function Hello(mnum) {
    if (mnum === PM_KNIGHT) return 'Salutations';
    if (mnum === PM_SAMURAI) return 'Konnichi wa';
    if (mnum === PM_TOURIST) return 'Aloha';
    if (mnum === PM_VALKYRIE) return 'Velkommen';
    return 'Hello';
}

// C ref: align.c / extern align_str()
export function align_str(a) {
    if (a === A_LAWFUL) return 'lawful';
    if (a === A_CHAOTIC) return 'chaotic';
    return 'neutral';
}

// C ref: pray.c align_gname — pantheon by alignment; strip leading '_'
export function align_gname(urole, a) {
    const r = urole || {};
    let gnam;
    if (a === A_LAWFUL) gnam = r.lgod || 'Blind Io';
    else if (a === A_CHAOTIC) gnam = r.cgod || 'Offler';
    else gnam = r.ngod || '_The Lady';
    if (gnam.charAt(0) === '_') gnam = gnam.slice(1);
    return gnam;
}

// C ref: pray.c align_gtitle — "goddess" iff raw name starts with '_'
export function align_gtitle(urole, a) {
    const r = urole || {};
    let gnam;
    if (a === A_LAWFUL) gnam = r.lgod;
    else if (a === A_CHAOTIC) gnam = r.cgod;
    else gnam = r.ngod;
    if (gnam && gnam.charAt(0) === '_') return 'goddess';
    return 'god';
}

export function u_gname(urole, ualignType) {
    return align_gname(urole, ualignType ?? A_NEUTRAL);
}
