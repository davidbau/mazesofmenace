// roles.js — Role, race, gender, alignment data.
// C ref: role.c — roles[], races[], aligns[], genders[], Hello()
//
// mnum / race.mnum are monster-table IDs (PM_*), not roles[]/races[] indexes.
// roles[] order must match C (Rogue before Ranger) for pantheon randrole().

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
    monsterNames,
} from './generated/monsters_data.js';
import { game } from './gstate.js';
import {
    A_CHAOTIC, A_NEUTRAL, A_LAWFUL, A_INT, A_WIS,
    MH_HUMAN, MH_ELF, MH_DWARF, MH_GNOME, MH_ORC,
} from './const.js';

function pm(name) {
    const i = monsterNames.indexOf(name);
    return i >= 0 ? i : NON_PM;
}

// STR18(n) encoding used as racial Str max (attrib.h / role.c).
const STR18_100 = 18 + 100;
const STR18_50 = 18 + 50;

// C ref: you.h RoleAdvance — { infix, inrnd, lofix, lornd, hifix, hirnd }
function adv(infix, inrnd, lofix, lornd, hifix, hirnd) {
    return { infix, inrnd, lofix, lornd, hifix, hirnd };
}

export const roles = [
    // C: roles[] index 0..12 — pantheon randrole uses rn2(SIZE(roles)-1)
    {
        // C: name.f is 0 unless a distinct female role name exists
        name: { m: 'Archeologist', f: null },
        mnum: PM_ARCHEOLOGIST,
        petnum: NON_PM,
        neminum: pm('PM_MINION_OF_HUHETOTL'),
        title: [
            { m: 'Digger', f: 'Digger' },
            { m: 'Field Worker', f: 'Field Worker' },
        ],
        lgod: 'Quetzalcoatl',
        ngod: 'Camaxtli',
        cgod: 'Huhetotl',
        // C: { 7, 10, 10, 7, 7, 7 } / { 20, 20, 20, 10, 20, 10 }
        attrbase: [7, 10, 10, 7, 7, 7],
        attrdist: [20, 20, 20, 10, 20, 10],
        xlev: 14,
        initrecord: 10,
        // C: { 11, 0, 0, 8, 1, 0 } / { 1, 0, 0, 1, 0, 1 }
        hpadv: adv(11, 0, 0, 8, 1, 0),
        enadv: adv(1, 0, 0, 1, 0, 1),
        // C: spelbase..spelsbon (role.c)
        spelbase: 5, spelheal: 0, spelshld: 2, spelarmr: 10,
        spelstat: A_INT, spelspec: 'SPE_MAGIC_MAPPING', spelsbon: -4,
        allow: 0x306e,
    },
    {
        name: { m: 'Barbarian', f: null },
        mnum: PM_BARBARIAN,
        petnum: NON_PM,
        neminum: pm('PM_THOTH_AMON'),
        title: [
            { m: 'Plunderer', f: 'Plunderess' },
            { m: 'Pillager', f: 'Pillager' },
        ],
        lgod: 'Mitra',
        ngod: 'Crom',
        cgod: 'Set',
        // C: { 16, 7, 7, 15, 16, 6 } / { 30, 6, 7, 20, 30, 7 }
        attrbase: [16, 7, 7, 15, 16, 6],
        attrdist: [30, 6, 7, 20, 30, 7],
        xlev: 10,
        initrecord: 10,
        // C: { 14, 0, 0, 10, 2, 0 } / { 1, 0, 0, 1, 0, 1 }
        hpadv: adv(14, 0, 0, 10, 2, 0),
        enadv: adv(1, 0, 0, 1, 0, 1),
        spelbase: 14, spelheal: 0, spelshld: 0, spelarmr: 8,
        spelstat: A_INT, spelspec: 'SPE_HASTE_SELF', spelsbon: -4,
        allow: 0x308b,
    },
    {
        name: { m: 'Caveman', f: 'Cavewoman' },
        mnum: PM_CAVE_DWELLER,
        petnum: pm('PM_LITTLE_DOG'),
        neminum: pm('PM_CHROMATIC_DRAGON'),
        title: [
            { m: 'Troglodyte', f: 'Troglodyte' },
            { m: 'Aborigine', f: 'Aborigine' },
        ],
        lgod: 'Anu',
        ngod: '_Ishtar',
        cgod: 'Anshar',
        // C: { 10, 7, 7, 7, 8, 6 } / { 30, 6, 7, 20, 30, 7 }
        attrbase: [10, 7, 7, 7, 8, 6],
        attrdist: [30, 6, 7, 20, 30, 7],
        // C: xlev 10, initrecord 0 (role.c after enadv)
        xlev: 10,
        initrecord: 0,
        // C: { 14, 0, 0, 8, 2, 0 } / { 1, 0, 0, 1, 0, 1 }
        hpadv: adv(14, 0, 0, 8, 2, 0),
        enadv: adv(1, 0, 0, 1, 0, 1),
        spelbase: 12, spelheal: 0, spelshld: 1, spelarmr: 8,
        spelstat: A_INT, spelspec: 'SPE_DIG', spelsbon: -4,
        allow: 0x306e,
    },
    {
        name: { m: 'Healer', f: null },
        mnum: PM_HEALER,
        petnum: NON_PM,
        neminum: pm('PM_CYCLOPS'),
        title: [
            { m: 'Rhizotomist', f: 'Rhizotomist' },
            { m: 'Empiric', f: 'Empiric' },
        ],
        lgod: '_Athena',
        ngod: 'Hermes',
        cgod: 'Poseidon',
        // C: { 7, 7, 13, 7, 11, 16 } / { 15, 20, 20, 15, 25, 5 }
        attrbase: [7, 7, 13, 7, 11, 16],
        attrdist: [15, 20, 20, 15, 25, 5],
        xlev: 20,
        initrecord: 10,
        // C: { 11, 0, 0, 8, 1, 0 } / { 1, 4, 0, 1, 0, 2 }
        hpadv: adv(11, 0, 0, 8, 1, 0),
        enadv: adv(1, 4, 0, 1, 0, 2),
        spelbase: 3, spelheal: -3, spelshld: 2, spelarmr: 10,
        spelstat: A_WIS, spelspec: 'SPE_CURE_SICKNESS', spelsbon: -4,
        allow: 0x304a,
    },
    {
        name: { m: 'Knight', f: null },
        mnum: PM_KNIGHT,
        petnum: pm('PM_PONY'),
        neminum: pm('PM_IXOTH'),
        title: [
            { m: 'Gallant', f: 'Gallant' },
            { m: 'Esquire', f: 'Esquire' },
        ],
        lgod: 'Lugh',
        ngod: '_Brigit',
        cgod: 'Manannan Mac Lir',
        // C: { 13, 7, 14, 8, 10, 17 } / { 30, 15, 15, 10, 20, 10 }
        attrbase: [13, 7, 14, 8, 10, 17],
        attrdist: [30, 15, 15, 10, 20, 10],
        xlev: 10,
        initrecord: 10,
        // C: { 14, 0, 0, 8, 2, 0 } / { 1, 4, 0, 1, 0, 2 }
        hpadv: adv(14, 0, 0, 8, 2, 0),
        enadv: adv(1, 4, 0, 1, 0, 2),
        spelbase: 8, spelheal: -2, spelshld: 0, spelarmr: 9,
        spelstat: A_WIS, spelspec: 'SPE_TURN_UNDEAD', spelsbon: -4,
        allow: 0x300c,
    },
    {
        name: { m: 'Monk', f: null },
        mnum: PM_MONK,
        petnum: NON_PM,
        neminum: pm('PM_MASTER_KAEN'),
        title: [
            { m: 'Candidate', f: 'Candidate' },
            { m: 'Novice', f: 'Novice' },
        ],
        lgod: 'Shan Lai Ching',
        ngod: 'Chih Sung-tzu',
        cgod: 'Huan Ti',
        // C: { 10, 7, 8, 8, 7, 7 } / { 25, 10, 20, 20, 15, 10 }
        attrbase: [10, 7, 8, 8, 7, 7],
        attrdist: [25, 10, 20, 20, 15, 10],
        xlev: 10,
        initrecord: 10,
        // C: { 12, 0, 0, 8, 1, 0 } / { 2, 2, 0, 2, 0, 2 }
        hpadv: adv(12, 0, 0, 8, 1, 0),
        enadv: adv(2, 2, 0, 2, 0, 2),
        spelbase: 8, spelheal: -2, spelshld: 2, spelarmr: 20,
        spelstat: A_WIS, spelspec: 'SPE_RESTORE_ABILITY', spelsbon: -4,
        allow: 0x300f,
    },
    // C ref: role.c Priest — no fixed deities; pantheon via randrole
    {
        name: { m: 'Priest', f: 'Priestess' },
        mnum: PM_CLERIC,
        petnum: NON_PM,
        neminum: pm('PM_NALZOK'),
        title: [
            { m: 'Aspirant', f: 'Aspirant' },
            { m: 'Acolyte', f: 'Acolyte' },
        ],
        lgod: null,
        ngod: null,
        cgod: null,
        attrbase: [7, 7, 10, 7, 7, 7],
        attrdist: [15, 10, 30, 15, 20, 10],
        xlev: 10,
        initrecord: 0,
        // C: { 12, 0, 0, 8, 1, 0 } / { 4, 3, 0, 2, 0, 2 }
        hpadv: adv(12, 0, 0, 8, 1, 0),
        enadv: adv(4, 3, 0, 2, 0, 2),
        spelbase: 3, spelheal: -2, spelshld: 2, spelarmr: 10,
        spelstat: A_WIS, spelspec: 'SPE_REMOVE_CURSE', spelsbon: -4,
        allow: 0x301f,
    },
    // C: Rogue precedes Ranger (command-line -R tradition + pantheon indices)
    {
        name: { m: 'Rogue', f: null },
        mnum: PM_ROGUE,
        petnum: NON_PM,
        neminum: pm('PM_MASTER_ASSASSIN'),
        title: [
            { m: 'Footpad', f: 'Footpad' },
            { m: 'Cutpurse', f: 'Cutpurse' },
        ],
        lgod: 'Issek',
        ngod: 'Mog',
        cgod: 'Kos',
        attrbase: [7, 7, 7, 10, 7, 6],
        attrdist: [20, 10, 10, 30, 20, 10],
        // C: xlev 11, initrecord 10
        xlev: 11,
        initrecord: 10,
        hpadv: adv(10, 0, 0, 8, 1, 0),
        enadv: adv(1, 0, 0, 1, 0, 1),
        spelbase: 8, spelheal: 0, spelshld: 1, spelarmr: 9,
        spelstat: A_INT, spelspec: 'SPE_DETECT_TREASURE', spelsbon: -4,
        allow: 0x3089,
    },
    {
        name: { m: 'Ranger', f: null },
        mnum: PM_RANGER,
        petnum: pm('PM_LITTLE_DOG'),
        neminum: pm('PM_SCORPIUS'),
        title: [
            { m: 'Tenderfoot', f: 'Tenderfoot' },
            { m: 'Lookout', f: 'Lookout' },
        ],
        lgod: 'Mercury',
        ngod: '_Venus',
        cgod: 'Mars',
        // C: { 13, 13, 13, 9, 13, 7 } / { 30, 10, 10, 20, 20, 10 }
        attrbase: [13, 13, 13, 9, 13, 7],
        attrdist: [30, 10, 10, 20, 20, 10],
        xlev: 12,
        initrecord: 10,
        // C: { 13, 0, 0, 6, 1, 0 } / { 1, 0, 0, 1, 0, 1 }
        hpadv: adv(13, 0, 0, 6, 1, 0),
        enadv: adv(1, 0, 0, 1, 0, 1),
        spelbase: 9, spelheal: 2, spelshld: 1, spelarmr: 10,
        spelstat: A_INT, spelspec: 'SPE_INVISIBILITY', spelsbon: -4,
        allow: 0x30db,
    },
    {
        name: { m: 'Samurai', f: null },
        mnum: PM_SAMURAI,
        petnum: pm('PM_LITTLE_DOG'),
        neminum: pm('PM_ASHIKAGA_TAKAUJI'),
        title: [
            { m: 'Hatamoto', f: 'Hatamoto' },
            { m: 'Ronin', f: 'Ronin' },
        ],
        lgod: '_Amaterasu Omikami',
        ngod: 'Raijin',
        cgod: 'Susanowo',
        // C: { 10, 8, 7, 10, 17, 6 } / { 30, 10, 8, 30, 14, 8 }
        attrbase: [10, 8, 7, 10, 17, 6],
        attrdist: [30, 10, 8, 30, 14, 8],
        xlev: 11,
        initrecord: 10,
        // C: { 13, 0, 0, 8, 1, 0 } / { 1, 0, 0, 1, 0, 1 }
        hpadv: adv(13, 0, 0, 8, 1, 0),
        enadv: adv(1, 0, 0, 1, 0, 1),
        spelbase: 10, spelheal: 0, spelshld: 0, spelarmr: 8,
        spelstat: A_INT, spelspec: 'SPE_CLAIRVOYANCE', spelsbon: -4,
        allow: 0x300c,
    },
    {
        name: { m: 'Tourist', f: null },
        mnum: PM_TOURIST,
        petnum: NON_PM,
        neminum: pm('PM_MASTER_OF_THIEVES'),
        title: [
            { m: 'Rambler', f: 'Rambler' },
            { m: 'Sightseer', f: 'Sightseer' },
        ],
        lgod: 'Blind Io',
        ngod: '_The Lady',
        cgod: 'Offler',
        attrbase: [7, 10, 6, 7, 7, 10],
        attrdist: [15, 10, 10, 15, 30, 20],
        xlev: 14,
        initrecord: 0,
        hpadv: adv(8, 0, 0, 8, 0, 0),
        enadv: adv(1, 0, 0, 1, 0, 1),
        spelbase: 5, spelheal: 1, spelshld: 2, spelarmr: 10,
        spelstat: A_INT, spelspec: 'SPE_CHARM_MONSTER', spelsbon: -4,
        allow: 0x300a,
    },
    {
        name: { m: 'Valkyrie', f: null },
        mnum: PM_VALKYRIE,
        petnum: NON_PM,
        neminum: pm('PM_LORD_SURTUR'),
        title: [
            { m: 'Stripling', f: 'Stripling' },
            { m: 'Skirmisher', f: 'Skirmisher' },
        ],
        lgod: 'Tyr',
        ngod: 'Odin',
        cgod: 'Loki',
        // C: { 10, 7, 7, 7, 10, 7 } / { 30, 6, 7, 20, 30, 7 }
        attrbase: [10, 7, 7, 7, 10, 7],
        attrdist: [30, 6, 7, 20, 30, 7],
        // C: xlev 10, initrecord 0
        xlev: 10,
        initrecord: 0,
        // C: { 14, 0, 0, 8, 2, 0 } / { 1, 0, 0, 1, 0, 1 }
        hpadv: adv(14, 0, 0, 8, 2, 0),
        enadv: adv(1, 0, 0, 1, 0, 1),
        spelbase: 10, spelheal: -2, spelshld: 0, spelarmr: 9,
        spelstat: A_WIS, spelspec: 'SPE_CONE_OF_COLD', spelsbon: -4,
        allow: 0x202e,
    },
    {
        name: { m: 'Wizard', f: null },
        mnum: PM_WIZARD,
        petnum: pm('PM_KITTEN'),
        neminum: pm('PM_DARK_ONE'),
        title: [
            { m: 'Evoker', f: 'Evoker' },
            { m: 'Conjurer', f: 'Conjurer' },
        ],
        lgod: 'Ptah',
        ngod: 'Thoth',
        cgod: 'Anhur',
        attrbase: [7, 10, 7, 7, 7, 7],
        attrdist: [10, 30, 10, 20, 20, 10],
        xlev: 12,
        initrecord: 0,
        hpadv: adv(10, 0, 0, 8, 1, 0),
        enadv: adv(4, 3, 0, 2, 0, 3),
        spelbase: 1, spelheal: 0, spelshld: 3, spelarmr: 10,
        spelstat: A_INT, spelspec: 'SPE_MAGIC_MISSILE', spelsbon: -4,
        allow: 0x30db,
    },
];

export const races = [
    // C ref: role.c races[] — hpadv/enadv Init columns feed newhp()/newpw() at ulevel==0
    // C: races[] selfmask / lovemask / hatemask (role.c) — peace_minded
    {
        name: 'human',
        adj: 'human',
        noun: 'human',
        filecode: 'Hum',
        mnum: PM_HUMAN,
        attrmin: [3, 3, 3, 3, 3, 3],
        attrmax: [STR18_100, 18, 18, 18, 18, 18],
        hpadv: adv(2, 0, 0, 2, 1, 0),
        enadv: adv(1, 0, 2, 0, 2, 0),
        allow: 0x300f,
        selfmask: MH_HUMAN,
        lovemask: 0,
        hatemask: MH_GNOME | MH_ORC,
    },
    {
        name: 'elf',
        adj: 'elven',
        noun: 'elf',
        filecode: 'Elf',
        mnum: PM_ELF,
        attrmin: [3, 3, 3, 3, 3, 3],
        attrmax: [18, 20, 20, 18, 16, 18],
        hpadv: adv(1, 0, 0, 1, 1, 0),
        enadv: adv(2, 0, 3, 0, 3, 0),
        allow: 0x3011,
        selfmask: MH_ELF,
        lovemask: MH_ELF,
        hatemask: MH_ORC,
    },
    {
        name: 'dwarf',
        adj: 'dwarven',
        noun: 'dwarf',
        filecode: 'Dwa',
        mnum: PM_DWARF,
        attrmin: [3, 3, 3, 3, 3, 3],
        attrmax: [STR18_100, 16, 16, 20, 20, 16],
        hpadv: adv(4, 0, 0, 3, 2, 0),
        enadv: adv(0, 0, 0, 0, 0, 0),
        allow: 0x3024,
        selfmask: MH_DWARF,
        lovemask: MH_DWARF | MH_GNOME,
        hatemask: MH_ORC,
    },
    {
        name: 'gnome',
        adj: 'gnomish',
        noun: 'gnome',
        filecode: 'Gno',
        mnum: PM_GNOME,
        attrmin: [3, 3, 3, 3, 3, 3],
        attrmax: [STR18_50, 19, 18, 18, 18, 18],
        hpadv: adv(1, 0, 0, 1, 0, 0),
        enadv: adv(2, 0, 2, 0, 2, 0),
        allow: 0x3042,
        selfmask: MH_GNOME,
        lovemask: MH_DWARF | MH_GNOME,
        hatemask: MH_HUMAN,
    },
    {
        name: 'orc',
        adj: 'orcish',
        noun: 'orc',
        filecode: 'Orc',
        mnum: PM_ORC,
        attrmin: [3, 3, 3, 3, 3, 3],
        attrmax: [STR18_50, 16, 16, 18, 18, 16],
        // Rogue+orc init HP = 10+1 = 11 (not human fallback 10+2 = 12)
        hpadv: adv(1, 0, 0, 1, 0, 0),
        enadv: adv(1, 0, 1, 0, 1, 0),
        allow: 0x3081,
        selfmask: MH_ORC,
        lovemask: 0,
        hatemask: MH_HUMAN | MH_ELF | MH_DWARF,
    },
];

export const aligns = [
    // C: adj / filecode / allow / value — adj used in plsel headers
    { name: 'lawful', adj: 'lawful', filecode: 'Law', allow: 0x04, value: A_LAWFUL },
    { name: 'neutral', adj: 'neutral', filecode: 'Neu', allow: 0x02, value: A_NEUTRAL },
    { name: 'chaotic', adj: 'chaotic', filecode: 'Cha', allow: 0x01, value: A_CHAOTIC },
];

export const genders = [
    // C: adj / pronouns / filecode / allow — ROLE_MALE/FEMALE
    { name: 'male', adj: 'male', filecode: 'Mal', allow: 0x1000, value: 0 },
    { name: 'female', adj: 'female', filecode: 'Fem', allow: 0x2000, value: 1 },
];

export function findRole(name) {
    if (!name) return null;
    const lc = name.toLowerCase();
    return roles.find(r => r.name.m.toLowerCase() === lc
        || (r.name.f && r.name.f.toLowerCase() === lc));
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

// C ref: role.c Hello(mtmp) — Role_switch greeting; mtmp for Samurai shk /
// Valkyrie mail. Also accepts numeric mnum (allmain welcome path).
export function Hello(arg) {
    const mtmp = (arg && typeof arg === 'object') ? arg : null;
    const mnum = (typeof arg === 'number') ? arg : (game.urole?.mnum);
    if (mnum === PM_KNIGHT) return 'Salutations';
    if (mnum === PM_SAMURAI) {
        // C: mtmp && mtmp->data == &mons[PM_SHOPKEEPER]
        if (mtmp && (mtmp.isshk || mtmp.data?.name === 'PM_SHOPKEEPER')) {
            return 'Irasshaimase';
        }
        return 'Konnichi wa';
    }
    if (mnum === PM_TOURIST) return 'Aloha';
    if (mnum === PM_VALKYRIE) return 'Velkommen';
    return 'Hello';
}

/** C ref: role.c Goodbye — Role_switch farewell; uses game.urole.mnum. */
export function Goodbye() {
    const mnum = game.urole?.mnum;
    if (mnum === PM_KNIGHT) return 'Fare thee well';
    if (mnum === PM_SAMURAI) return 'Sayonara';
    if (mnum === PM_TOURIST) return 'Aloha';
    if (mnum === PM_VALKYRIE) return 'Farvel';
    return 'Goodbye';
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
