// role.js -- character role/race/gender/alignment selection.
// C ref: src/role.c

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import {
    A_CHAOTIC, A_LAWFUL, A_NEUTRAL, A_NONE,
    PICK_RANDOM, PICK_RIGID,
    ROLE_ALIGNMASK, ROLE_ALIGNS, ROLE_CHAOTIC, ROLE_FEMALE,
    ROLE_GENDERS, ROLE_GENDMASK, ROLE_LAWFUL, ROLE_MALE,
    ROLE_NEUTER, ROLE_NEUTRAL, ROLE_NONE, ROLE_RACEMASK, ROLE_RANDOM,
} from './const.js';

const MH_HUMAN = 0x0008;
const MH_ELF = 0x0010;
const MH_DWARF = 0x0020;
const MH_GNOME = 0x0040;
const MH_ORC = 0x0080;

export const roles = [
    {
        name: { m: 'Archeologist', f: null },
        rank: [{ m: 'Digger', f: null }, { m: 'Field Worker', f: null }, { m: 'Investigator', f: null }, { m: 'Exhumer', f: null }, { m: 'Excavator', f: null }, { m: 'Spelunker', f: null }, { m: 'Speleologist', f: null }, { m: 'Collector', f: null }, { m: 'Curator', f: null }],
        filecode: 'Arc',
        mnum: 0,
        allow: MH_HUMAN | MH_DWARF | MH_GNOME | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL | ROLE_NEUTRAL,
        gods: ['Quetzalcoatl', 'Camaxtli', 'Huhetotl'],
        xlev: 14, initrecord: 10,
        // C ref: role.c roles[] spell-statistics block (drives spell.c
        // percent_success): { base, heal, shld, armr, stat (A_INT=1/A_WIS=2),
        // spec (special-spell otyp), sbon }.
        spel: { base: 5, heal: 0, shld: 2, armr: 10, stat: 1, spec: 396 /*magic mapping*/, sbon: -4 },
    },
    {
        name: { m: 'Barbarian', f: null },
        rank: [{ m: 'Plunderer', f: 'Plunderess' }, { m: 'Pillager', f: null }, { m: 'Bandit', f: null }, { m: 'Brigand', f: null }, { m: 'Raider', f: null }, { m: 'Reaver', f: null }, { m: 'Slayer', f: null }, { m: 'Chieftain', f: 'Chieftainess' }, { m: 'Conqueror', f: 'Conqueress' }],
        filecode: 'Bar',
        mnum: 1,
        allow: MH_HUMAN | MH_ORC | ROLE_MALE | ROLE_FEMALE | ROLE_NEUTRAL | ROLE_CHAOTIC,
        gods: ['Mitra', 'Crom', 'Set'],
        xlev: 10, initrecord: 10,
        spel: { base: 14, heal: 0, shld: 0, armr: 8, stat: 1, spec: 388 /*haste self*/, sbon: -4 },
    },
    {
        name: { m: 'Caveman', f: 'Cavewoman' },
        rank: [{ m: 'Troglodyte', f: null }, { m: 'Aborigine', f: null }, { m: 'Wanderer', f: null }, { m: 'Vagrant', f: null }, { m: 'Wayfarer', f: null }, { m: 'Roamer', f: null }, { m: 'Nomad', f: null }, { m: 'Rover', f: null }, { m: 'Pioneer', f: null }],
        filecode: 'Cav',
        mnum: 2,
        allow: MH_HUMAN | MH_DWARF | MH_GNOME | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL | ROLE_NEUTRAL,
        gods: ['Anu', '_Ishtar', 'Anshar'],
        xlev: 10, initrecord: 0,
        spel: { base: 12, heal: 0, shld: 1, armr: 8, stat: 1, spec: 366 /*dig*/, sbon: -4 },
    },
    {
        name: { m: 'Healer', f: null },
        rank: [{ m: 'Rhizotomist', f: null }, { m: 'Empiric', f: null }, { m: 'Embalmer', f: null }, { m: 'Dresser', f: null }, { m: 'Medicus ossium', f: 'Medica ossium' }, { m: 'Herbalist', f: null }, { m: 'Magister', f: 'Magistra' }, { m: 'Physician', f: null }, { m: 'Chirurgeon', f: null }],
        filecode: 'Hea',
        mnum: 3,
        allow: MH_HUMAN | MH_GNOME | ROLE_MALE | ROLE_FEMALE | ROLE_NEUTRAL,
        gods: ['_Athena', 'Hermes', 'Poseidon'],
        xlev: 20, initrecord: 10,
        spel: { base: 3, heal: -3, shld: 2, armr: 10, stat: 2, spec: 386 /*cure sickness*/, sbon: -4 },
    },
    {
        name: { m: 'Knight', f: null },
        rank: [{ m: 'Gallant', f: null }, { m: 'Esquire', f: null }, { m: 'Bachelor', f: null }, { m: 'Sergeant', f: null }, { m: 'Knight', f: null }, { m: 'Banneret', f: null }, { m: 'Chevalier', f: 'Chevaliere' }, { m: 'Seignieur', f: 'Dame' }, { m: 'Paladin', f: null }],
        filecode: 'Kni',
        mnum: 4,
        allow: MH_HUMAN | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL,
        gods: ['Lugh', '_Brigit', 'Manannan Mac Lir'],
        xlev: 10, initrecord: 10,
        spel: { base: 8, heal: -2, shld: 0, armr: 9, stat: 2, spec: 398 /*turn undead*/, sbon: -4 },
    },
    {
        name: { m: 'Monk', f: null },
        rank: [{ m: 'Candidate', f: null }, { m: 'Novice', f: null }, { m: 'Initiate', f: null }, { m: 'Student of Stones', f: null }, { m: 'Student of Waters', f: null }, { m: 'Student of Metals', f: null }, { m: 'Student of Winds', f: null }, { m: 'Student of Fire', f: null }, { m: 'Master', f: null }],
        filecode: 'Mon',
        mnum: 5,
        allow: MH_HUMAN | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL | ROLE_NEUTRAL | ROLE_CHAOTIC,
        gods: ['Shan Lai Ching', 'Chih Sung-tzu', 'Huan Ti'],
        xlev: 10, initrecord: 10,
        spel: { base: 8, heal: -2, shld: 2, armr: 20, stat: 2, spec: 392 /*restore ability*/, sbon: -4 },
    },
    {
        name: { m: 'Priest', f: 'Priestess' },
        rank: [{ m: 'Aspirant', f: null }, { m: 'Acolyte', f: null }, { m: 'Adept', f: null }, { m: 'Priest', f: 'Priestess' }, { m: 'Curate', f: null }, { m: 'Canon', f: 'Canoness' }, { m: 'Lama', f: null }, { m: 'Patriarch', f: 'Matriarch' }, { m: 'High Priest', f: 'High Priestess' }],
        filecode: 'Pri',
        mnum: 6,
        allow: MH_HUMAN | MH_ELF | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL | ROLE_NEUTRAL | ROLE_CHAOTIC,
        gods: null,
        xlev: 10, initrecord: 0,
        spel: { base: 3, heal: -2, shld: 2, armr: 10, stat: 2, spec: 395 /*remove curse*/, sbon: -4 },
    },
    {
        name: { m: 'Rogue', f: null },
        rank: [{ m: 'Footpad', f: null }, { m: 'Cutpurse', f: null }, { m: 'Rogue', f: null }, { m: 'Pilferer', f: null }, { m: 'Robber', f: null }, { m: 'Burglar', f: null }, { m: 'Filcher', f: null }, { m: 'Magsman', f: 'Magswoman' }, { m: 'Thief', f: null }],
        filecode: 'Rog',
        mnum: 8,
        allow: MH_HUMAN | MH_ORC | ROLE_MALE | ROLE_FEMALE | ROLE_CHAOTIC,
        gods: ['Issek', 'Mog', 'Kos'],
        xlev: 11, initrecord: 10,
        spel: { base: 8, heal: 0, shld: 1, armr: 9, stat: 1, spec: 394 /*detect treasure*/, sbon: -4 },
    },
    {
        name: { m: 'Ranger', f: null },
        rank: [{ m: 'Tenderfoot', f: null }, { m: 'Lookout', f: null }, { m: 'Trailblazer', f: null }, { m: 'Reconnoiterer', f: 'Reconnoiteress' }, { m: 'Scout', f: null }, { m: 'Arbalester', f: null }, { m: 'Archer', f: null }, { m: 'Sharpshooter', f: null }, { m: 'Marksman', f: 'Markswoman' }],
        filecode: 'Ran',
        mnum: 7,
        allow: MH_HUMAN | MH_ELF | MH_GNOME | MH_ORC | ROLE_MALE | ROLE_FEMALE | ROLE_NEUTRAL | ROLE_CHAOTIC,
        gods: ['Mercury', '_Venus', 'Mars'],
        xlev: 12, initrecord: 10,
        spel: { base: 9, heal: 2, shld: 1, armr: 10, stat: 1, spec: 393 /*invisibility*/, sbon: -4 },
    },
    {
        name: { m: 'Samurai', f: null },
        rank: [{ m: 'Hatamoto', f: null }, { m: 'Ronin', f: null }, { m: 'Ninja', f: 'Kunoichi' }, { m: 'Joshu', f: null }, { m: 'Ryoshu', f: null }, { m: 'Kokushu', f: null }, { m: 'Daimyo', f: null }, { m: 'Kuge', f: null }, { m: 'Shogun', f: null }],
        filecode: 'Sam',
        mnum: 9,
        allow: MH_HUMAN | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL,
        gods: ['_Amaterasu Omikami', 'Raijin', 'Susanowo'],
        xlev: 11, initrecord: 10,
        spel: { base: 10, heal: 0, shld: 0, armr: 8, stat: 1, spec: 385 /*clairvoyance*/, sbon: -4 },
    },
    {
        name: { m: 'Tourist', f: null },
        rank: [{ m: 'Rambler', f: null }, { m: 'Sightseer', f: null }, { m: 'Excursionist', f: null }, { m: 'Peregrinator', f: 'Peregrinatrix' }, { m: 'Traveler', f: null }, { m: 'Journeyer', f: null }, { m: 'Voyager', f: null }, { m: 'Explorer', f: null }, { m: 'Adventurer', f: null }],
        filecode: 'Tou',
        mnum: 10,
        allow: MH_HUMAN | ROLE_MALE | ROLE_FEMALE | ROLE_NEUTRAL,
        gods: ['Blind Io', '_The Lady', 'Offler'],
        xlev: 14, initrecord: 0,
        spel: { base: 5, heal: 1, shld: 2, armr: 10, stat: 1, spec: 387 /*charm monster*/, sbon: -4 },
    },
    {
        name: { m: 'Valkyrie', f: null },
        rank: [{ m: 'Stripling', f: null }, { m: 'Skirmisher', f: null }, { m: 'Fighter', f: null }, { m: 'Man-at-arms', f: 'Woman-at-arms' }, { m: 'Warrior', f: null }, { m: 'Swashbuckler', f: null }, { m: 'Hero', f: 'Heroine' }, { m: 'Champion', f: null }, { m: 'Lord', f: 'Lady' }],
        filecode: 'Val',
        mnum: 11,
        allow: MH_HUMAN | MH_DWARF | ROLE_FEMALE | ROLE_LAWFUL | ROLE_NEUTRAL,
        gods: ['Tyr', 'Odin', 'Loki'],
        xlev: 10, initrecord: 0,
        spel: { base: 10, heal: -2, shld: 0, armr: 9, stat: 2, spec: 369 /*cone of cold*/, sbon: -4 },
    },
    {
        name: { m: 'Wizard', f: null },
        rank: [{ m: 'Evoker', f: null }, { m: 'Conjurer', f: null }, { m: 'Thaumaturge', f: null }, { m: 'Magician', f: null }, { m: 'Enchanter', f: 'Enchantress' }, { m: 'Sorcerer', f: 'Sorceress' }, { m: 'Necromancer', f: null }, { m: 'Wizard', f: null }, { m: 'Mage', f: null }],
        filecode: 'Wiz',
        mnum: 12,
        allow: MH_HUMAN | MH_ELF | MH_GNOME | MH_ORC | ROLE_MALE | ROLE_FEMALE | ROLE_NEUTRAL | ROLE_CHAOTIC,
        gods: ['Ptah', 'Thoth', 'Anhur'],
        xlev: 12, initrecord: 0,
        spel: { base: 1, heal: 0, shld: 3, armr: 10, stat: 1, spec: 367 /*magic missile*/, sbon: -4 },
    },
];

export const races = [
    {
        name: 'human',
        noun: 'human',
        adj: 'human',
        filecode: 'Hum',
        mnum: 0,
        allow: MH_HUMAN | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL | ROLE_NEUTRAL | ROLE_CHAOTIC,
        selfmask: MH_HUMAN,
    },
    {
        name: 'elf',
        noun: 'elf',
        adj: 'elven',
        filecode: 'Elf',
        mnum: 1,
        allow: MH_ELF | ROLE_MALE | ROLE_FEMALE | ROLE_CHAOTIC,
        selfmask: MH_ELF,
    },
    {
        name: 'dwarf',
        noun: 'dwarf',
        adj: 'dwarven',
        filecode: 'Dwa',
        mnum: 2,
        allow: MH_DWARF | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL,
        selfmask: MH_DWARF,
    },
    {
        name: 'gnome',
        noun: 'gnome',
        adj: 'gnomish',
        filecode: 'Gno',
        mnum: 3,
        allow: MH_GNOME | ROLE_MALE | ROLE_FEMALE | ROLE_NEUTRAL,
        selfmask: MH_GNOME,
    },
    {
        name: 'orc',
        noun: 'orc',
        adj: 'orcish',
        filecode: 'Orc',
        mnum: 4,
        allow: MH_ORC | ROLE_MALE | ROLE_FEMALE | ROLE_CHAOTIC,
        selfmask: MH_ORC,
    },
];

export const genders = [
    { name: 'male', adj: 'male', filecode: 'Mal', value: 0, allow: ROLE_MALE },
    { name: 'female', adj: 'female', filecode: 'Fem', value: 1, allow: ROLE_FEMALE },
];

export const aligns = [
    { name: 'law', adj: 'lawful', filecode: 'Law', allow: ROLE_LAWFUL, value: A_LAWFUL },
    { name: 'balance', adj: 'neutral', filecode: 'Neu', allow: ROLE_NEUTRAL, value: A_NEUTRAL },
    { name: 'chaos', adj: 'chaotic', filecode: 'Cha', allow: ROLE_CHAOTIC, value: A_CHAOTIC },
];

export const ROLE_PRIEST = 6;
export const ROLE_TOURIST = 10;

function IndexOkT(idx, arr) {
    return Number.isInteger(idx) && idx >= 0 && idx < arr.length;
}

function rfilter() {
    return game.rfilter || { roles: [], mask: 0 };
}

function roleBlocked(rolenum) {
    return !!rfilter().roles?.[rolenum];
}

function maskBlocked(mask) {
    return !!(rfilter().mask & mask);
}

// C ref: role.c gotrolefilter() — TRUE if any role/race/gender/alignment
// filtering is currently active (used for the "Set/Reset ... filtering" label).
export function gotrolefilter() {
    const f = rfilter();
    if (f.mask) return true;
    if (Array.isArray(f.roles)) for (const v of f.roles) if (v) return true;
    return false;
}

function normalizeName(str) {
    return String(str || '').trim().toLowerCase();
}

function isRandomString(str) {
    const s = normalizeName(str);
    return s === '*' || s === '@' || 'random'.startsWith(s);
}

export function validrole(rolenum) {
    return IndexOkT(rolenum, roles);
}

export function randrole(for_display = false) {
    void for_display;
    return rn2(roles.length);
}

export function randrole_filtered() {
    const set = [];

    for (let i = 0; i < roles.length; i++) {
        if (ok_role(i, ROLE_NONE, ROLE_NONE, ROLE_NONE)
            && ok_race(i, ROLE_RANDOM, ROLE_NONE, ROLE_NONE)
            && ok_gend(i, ROLE_NONE, ROLE_RANDOM, ROLE_NONE)
            && ok_align(i, ROLE_NONE, ROLE_NONE, ROLE_RANDOM))
            set.push(i);
    }
    return set.length ? set[rn2(set.length)] : randrole(false);
}

export function str2role(str) {
    if (typeof str === 'number') return validrole(str) ? str : ROLE_NONE;
    if (!str) return ROLE_NONE;
    const s = normalizeName(str);

    for (let i = 0; i < roles.length; i++) {
        const role = roles[i];
        if (role.name.m.toLowerCase().startsWith(s))
            return i;
        if (role.name.f && role.name.f.toLowerCase().startsWith(s))
            return i;
        if (role.filecode.toLowerCase() === s)
            return i;
    }
    return isRandomString(str) ? ROLE_RANDOM : ROLE_NONE;
}

export function validrace(rolenum, racenum) {
    return IndexOkT(racenum, races)
        && IndexOkT(rolenum, roles)
        && !!(roles[rolenum].allow & races[racenum].allow & ROLE_RACEMASK);
}

export function randrace(rolenum) {
    let n = 0;

    for (let i = 0; i < races.length; i++)
        if (roles[rolenum].allow & races[i].allow & ROLE_RACEMASK)
            n++;
    if (n)
        n = Math.trunc(rn2(n * 100) / 100);
    for (let i = 0; i < races.length; i++) {
        if (roles[rolenum].allow & races[i].allow & ROLE_RACEMASK) {
            if (n)
                n--;
            else
                return i;
        }
    }
    return rn2(races.length);
}

export function str2race(str) {
    if (typeof str === 'number') return IndexOkT(str, races) ? str : ROLE_NONE;
    if (!str) return ROLE_NONE;
    const s = normalizeName(str);

    for (let i = 0; i < races.length; i++) {
        const race = races[i];
        if (race.noun.toLowerCase().startsWith(s))
            return i;
        if (race.adj.toLowerCase().startsWith(s))
            return i;
        if (race.filecode.toLowerCase() === s)
            return i;
    }
    return isRandomString(str) ? ROLE_RANDOM : ROLE_NONE;
}

export function validgend(rolenum, racenum, gendnum) {
    return gendnum >= 0 && gendnum < ROLE_GENDERS
        && IndexOkT(rolenum, roles)
        && IndexOkT(racenum, races)
        && !!(roles[rolenum].allow & races[racenum].allow
              & genders[gendnum].allow & ROLE_GENDMASK);
}

export function randgend(rolenum, racenum) {
    let n = 0;

    for (let i = 0; i < ROLE_GENDERS; i++)
        if (roles[rolenum].allow & races[racenum].allow & genders[i].allow
            & ROLE_GENDMASK)
            n++;
    if (n)
        n = rn2(n);
    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (roles[rolenum].allow & races[racenum].allow & genders[i].allow
            & ROLE_GENDMASK) {
            if (n)
                n--;
            else
                return i;
        }
    }
    return rn2(ROLE_GENDERS);
}

export function str2gend(str) {
    if (typeof str === 'number') return str >= 0 && str < ROLE_GENDERS ? str : ROLE_NONE;
    if (!str) return ROLE_NONE;
    const s = normalizeName(str);

    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (genders[i].adj.toLowerCase().startsWith(s))
            return i;
        if (genders[i].filecode.toLowerCase() === s)
            return i;
    }
    return isRandomString(str) ? ROLE_RANDOM : ROLE_NONE;
}

export function validalign(rolenum, racenum, alignnum) {
    return alignnum >= 0 && alignnum < ROLE_ALIGNS
        && IndexOkT(rolenum, roles)
        && IndexOkT(racenum, races)
        && !!(roles[rolenum].allow & races[racenum].allow
              & aligns[alignnum].allow & ROLE_ALIGNMASK);
}

export function randalign(rolenum, racenum) {
    let n = 0;

    for (let i = 0; i < ROLE_ALIGNS; i++)
        if (roles[rolenum].allow & races[racenum].allow & aligns[i].allow
            & ROLE_ALIGNMASK)
            n++;
    if (n)
        n = rn2(n);
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (roles[rolenum].allow & races[racenum].allow & aligns[i].allow
            & ROLE_ALIGNMASK) {
            if (n)
                n--;
            else
                return i;
        }
    }
    return rn2(ROLE_ALIGNS);
}

export function str2align(str) {
    if (typeof str === 'number') return str >= 0 && str < ROLE_ALIGNS ? str : ROLE_NONE;
    if (!str) return ROLE_NONE;
    const s = normalizeName(str);

    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (aligns[i].adj.toLowerCase().startsWith(s))
            return i;
        if (aligns[i].filecode.toLowerCase() === s)
            return i;
    }
    return isRandomString(str) ? ROLE_RANDOM : ROLE_NONE;
}

export function ok_role(rolenum, racenum, gendnum, alignnum) {
    let allow;

    if (IndexOkT(rolenum, roles)) {
        if (roleBlocked(rolenum))
            return false;
        allow = roles[rolenum].allow;
        if (IndexOkT(racenum, races)
            && !(allow & races[racenum].allow & ROLE_RACEMASK))
            return false;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS
            && !(allow & genders[gendnum].allow & ROLE_GENDMASK))
            return false;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS
            && !(allow & aligns[alignnum].allow & ROLE_ALIGNMASK))
            return false;
        return true;
    }

    for (let i = 0; i < roles.length; i++) {
        if (roleBlocked(i))
            continue;
        allow = roles[i].allow;
        if (IndexOkT(racenum, races)
            && !(allow & races[racenum].allow & ROLE_RACEMASK))
            continue;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS
            && !(allow & genders[gendnum].allow & ROLE_GENDMASK))
            continue;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS
            && !(allow & aligns[alignnum].allow & ROLE_ALIGNMASK))
            continue;
        return true;
    }
    return false;
}

export function pick_role(racenum, gendnum, alignnum, pickhow) {
    const set = [];

    for (let i = 0; i < roles.length; i++) {
        if (ok_role(i, racenum, gendnum, alignnum)
            && ok_race(i, (racenum >= 0) ? racenum : ROLE_RANDOM,
                       gendnum, alignnum)
            && ok_gend(i, racenum,
                       (gendnum >= 0) ? gendnum : ROLE_RANDOM, alignnum)
            && ok_align(i, racenum,
                        gendnum, (alignnum >= 0) ? alignnum : ROLE_RANDOM))
            set.push(i);
    }
    if (set.length === 0 || (set.length > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    return set[rn2(set.length)];
}

export function ok_race(rolenum, racenum, gendnum, alignnum) {
    let allow;

    if (IndexOkT(racenum, races)) {
        if (maskBlocked(races[racenum].selfmask))
            return false;
        allow = races[racenum].allow;
        if (IndexOkT(rolenum, roles)
            && !(allow & roles[rolenum].allow & ROLE_RACEMASK))
            return false;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS
            && !(allow & genders[gendnum].allow & ROLE_GENDMASK))
            return false;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS
            && !(allow & aligns[alignnum].allow & ROLE_ALIGNMASK))
            return false;
        return true;
    }

    for (let i = 0; i < races.length; i++) {
        if (maskBlocked(races[i].selfmask))
            continue;
        allow = races[i].allow;
        if (IndexOkT(rolenum, roles)
            && !(allow & roles[rolenum].allow & ROLE_RACEMASK))
            continue;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS
            && !(allow & genders[gendnum].allow & ROLE_GENDMASK))
            continue;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS
            && !(allow & aligns[alignnum].allow & ROLE_ALIGNMASK))
            continue;
        return true;
    }
    return false;
}

export function pick_race(rolenum, gendnum, alignnum, pickhow) {
    let races_ok = 0;

    for (let i = 0; i < races.length; i++) {
        if (ok_race(rolenum, i, gendnum, alignnum))
            races_ok++;
    }
    if (races_ok === 0 || (races_ok > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    races_ok = rn2(races_ok);
    for (let i = 0; i < races.length; i++) {
        if (ok_race(rolenum, i, gendnum, alignnum)) {
            if (races_ok === 0)
                return i;
            races_ok--;
        }
    }
    return ROLE_NONE;
}

export function ok_gend(rolenum, racenum, gendnum, alignnum) {
    void alignnum;
    let allow;

    if (gendnum >= 0 && gendnum < ROLE_GENDERS) {
        if (maskBlocked(genders[gendnum].allow))
            return false;
        allow = genders[gendnum].allow;
        if (IndexOkT(rolenum, roles)
            && !(allow & roles[rolenum].allow & ROLE_GENDMASK))
            return false;
        if (IndexOkT(racenum, races)
            && !(allow & races[racenum].allow & ROLE_GENDMASK))
            return false;
        return true;
    }

    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (maskBlocked(genders[i].allow))
            continue;
        allow = genders[i].allow;
        if (IndexOkT(rolenum, roles)
            && !(allow & roles[rolenum].allow & ROLE_GENDMASK))
            continue;
        if (IndexOkT(racenum, races)
            && !(allow & races[racenum].allow & ROLE_GENDMASK))
            continue;
        return true;
    }
    return false;
}

export function pick_gend(rolenum, racenum, alignnum, pickhow) {
    let gends_ok = 0;

    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (ok_gend(rolenum, racenum, i, alignnum))
            gends_ok++;
    }
    if (gends_ok === 0 || (gends_ok > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    gends_ok = rn2(gends_ok);
    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (ok_gend(rolenum, racenum, i, alignnum)) {
            if (gends_ok === 0)
                return i;
            gends_ok--;
        }
    }
    return ROLE_NONE;
}

export function ok_align(rolenum, racenum, gendnum, alignnum) {
    void gendnum;
    let allow;

    if (alignnum >= 0 && alignnum < ROLE_ALIGNS) {
        if (maskBlocked(aligns[alignnum].allow))
            return false;
        allow = aligns[alignnum].allow;
        if (IndexOkT(rolenum, roles)
            && !(allow & roles[rolenum].allow & ROLE_ALIGNMASK))
            return false;
        if (IndexOkT(racenum, races)
            && !(allow & races[racenum].allow & ROLE_ALIGNMASK))
            return false;
        return true;
    }

    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (maskBlocked(aligns[i].allow))
            continue;
        allow = aligns[i].allow;
        if (IndexOkT(rolenum, roles)
            && !(allow & roles[rolenum].allow & ROLE_ALIGNMASK))
            continue;
        if (IndexOkT(racenum, races)
            && !(allow & races[racenum].allow & ROLE_ALIGNMASK))
            continue;
        return true;
    }
    return false;
}

export function pick_align(rolenum, racenum, gendnum, pickhow) {
    let aligns_ok = 0;

    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (ok_align(rolenum, racenum, gendnum, i))
            aligns_ok++;
    }
    if (aligns_ok === 0 || (aligns_ok > 1 && pickhow === PICK_RIGID))
        return ROLE_NONE;
    aligns_ok = rn2(aligns_ok);
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (ok_align(rolenum, racenum, gendnum, i)) {
            if (aligns_ok === 0)
                return i;
            aligns_ok--;
        }
    }
    return ROLE_NONE;
}

export function rigid_role_checks(sel) {
    let tmp;

    if (sel.role === ROLE_RANDOM) {
        sel.role = pick_role(sel.race, sel.gender, sel.align, PICK_RANDOM);
        if (sel.role < 0)
            sel.role = randrole_filtered();
    }
    if (sel.race === ROLE_RANDOM
        && (tmp = pick_race(sel.role, sel.gender, sel.align, PICK_RANDOM)) !== ROLE_NONE)
        sel.race = tmp;
    if (sel.align === ROLE_RANDOM
        && (tmp = pick_align(sel.role, sel.race, sel.gender, PICK_RANDOM)) !== ROLE_NONE)
        sel.align = tmp;
    if (sel.gender === ROLE_RANDOM
        && (tmp = pick_gend(sel.role, sel.race, sel.align, PICK_RANDOM)) !== ROLE_NONE)
        sel.gender = tmp;

    if (sel.role !== ROLE_NONE) {
        if (sel.race === ROLE_NONE)
            sel.race = pick_race(sel.role, sel.gender, sel.align, PICK_RIGID);
        if (sel.align === ROLE_NONE)
            sel.align = pick_align(sel.role, sel.race, sel.gender, PICK_RIGID);
        if (sel.gender === ROLE_NONE)
            sel.gender = pick_gend(sel.role, sel.race, sel.align, PICK_RIGID);
    }
    return sel;
}

export function roleName(rolenum, female = false) {
    const role = roles[rolenum];
    if (!role) return 'Adventurer';
    return (female && role.name.f) || role.name.m;
}

export function rankName(rolenum, female = false) {
    return rank_of(1, rolenum, female);
}

// C ref: botl.c:298 xlev_to_rank(xlev) — 1..2 => 0, 3..5 => 1, 6..9 => 2, ...
export function xlev_to_rank(xlev) {
    return (xlev <= 2) ? 0 : (xlev <= 30) ? Math.trunc((xlev + 2) / 4) : 8;
}

// Player-monster (PM_) numbers, matching roles[].mnum.
const PM_KNIGHT = 4;
const PM_SAMURAI = 9;
const PM_TOURIST = 10;
const PM_VALKYRIE = 11;

// C ref: botl.c:332 rank_of(lev, monnum, female) — the rank walks DOWN from
// xlev_to_rank(lev) until an entry exists, so a role whose rank[i] has no
// female form falls back to the male form of the SAME index, not to a lower one.
export function rank_of(lev, rolenum, female = false) {
    const role = roles[rolenum];
    if (!role) return 'Player';
    for (let i = xlev_to_rank(lev); i >= 0; i--) {
        const r = role.rank?.[i];
        if (!r) continue;
        if (female && r.f) return r.f;
        if (r.m) return r.m;
    }
    return (female && role.name?.f) || role.name?.m || 'Player';
}

// C ref: role.c Hello() — role-specific greeting word for welcome().
export function Hello(rolenum, mtmp) {
    switch (rolenum) {
    case PM_KNIGHT:
        return 'Salutations';
    case PM_SAMURAI:
        return (mtmp && mtmp.data?.name === 'shopkeeper')
            ? 'Irasshaimase' : 'Konnichi wa';
    case PM_TOURIST:
        return 'Aloha';
    case PM_VALKYRIE:
        return (mtmp && mtmp.data?.name === 'mail daemon') ? 'Hail' : 'Velkommen';
    default:
        return 'Hello';
    }
}

// roles[].gods is [lawfulGod, neutralGod, chaoticGod].
function godForAlign(rolenum, alignType) {
    // C ref: role.c role_init — a role with no own gods (Priest) inherits the
    // randomly chosen flags.pantheon role's god names.  rolenum is the index into
    // the roles[] array (NOT the PM_ mnum; the two differ for Rogue/Ranger).
    let gods = roles[rolenum]?.gods;
    if (!gods && Number.isInteger(game.pantheon))
        gods = roles[game.pantheon]?.gods;
    if (!gods) return null;
    if (alignType === A_LAWFUL) return gods[0];
    if (alignType === A_NEUTRAL) return gods[1];
    if (alignType === A_CHAOTIC) return gods[2];
    return null;
}

// C ref: pray.c align_gname() — deity name for the hero's alignment.
// A goddess name is stored with a leading '_' which is stripped here.
export function align_gname(rolenum, alignType) {
    if (alignType === A_NONE) return 'Moloch';
    let gnam = godForAlign(rolenum, alignType);
    if (!gnam) return 'someone';
    if (gnam[0] === '_') gnam = gnam.slice(1);
    return gnam;
}

// C ref: pray.c align_gtitle() — "god" or "goddess" (goddess marked by '_').
export function align_gtitle(rolenum, alignType) {
    const gnam = godForAlign(rolenum, alignType);
    return (gnam && gnam[0] === '_') ? 'goddess' : 'god';
}

export function roleFromGame() {
    return validrole(game.initrole) ? roles[game.initrole] : null;
}

export function selectionIsComplete(sel) {
    return validrole(sel.role)
        && IndexOkT(sel.race, races)
        && sel.gender >= 0 && sel.gender < ROLE_GENDERS
        && sel.align >= 0 && sel.align < ROLE_ALIGNS;
}

export function apply_selection(sel) {
    game.initrole = sel.role;
    game.initrace = sel.race;
    game.initgend = sel.gender;
    game.initalign = sel.align;
}

export function random_player_selection(sel) {
    sel.role = pick_role(sel.race, sel.gender, sel.align, PICK_RANDOM);
    if (sel.role < 0)
        sel.role = randrole_filtered();
    sel.race = pick_race(sel.role, sel.gender, sel.align, PICK_RANDOM);
    sel.gender = pick_gend(sel.role, sel.race, sel.align, PICK_RANDOM);
    sel.align = pick_align(sel.role, sel.race, sel.gender, PICK_RANDOM);
    return sel;
}

export function first_valid_align(rolenum, racenum, gendnum) {
    for (let i = 0; i < ROLE_ALIGNS; i++)
        if (ok_align(rolenum, racenum, gendnum, i))
            return i;
    return ROLE_NONE;
}

// C ref: role.c tty_player_selection() pick4u=='n' (manual menu) branches —
// each facet block counts the valid options with ok_X() (falling back to
// validX() when none are ok) and only shows a menu when the count is > 1; a
// single-valid facet is assigned directly (no menu, no keystroke, no RNG).
// These helpers return {n, k}: n = number of valid choices, k = last valid
// index (the forced value when n == 1), mirroring the C loops exactly.
export function count_ok_race(rolenum, gendnum, alignnum) {
    let n = 0, k = 0;
    for (let i = 0; i < races.length; i++)
        if (ok_race(rolenum, i, gendnum, alignnum)) { n++; k = i; }
    if (n === 0)
        for (let i = 0; i < races.length; i++)
            if (validrace(rolenum, i)) { n++; k = i; }
    return { n, k };
}

export function count_ok_gend(rolenum, racenum, alignnum) {
    let n = 0, k = 0;
    for (let i = 0; i < ROLE_GENDERS; i++)
        if (ok_gend(rolenum, racenum, i, alignnum)) { n++; k = i; }
    if (n === 0)
        for (let i = 0; i < ROLE_GENDERS; i++)
            if (validgend(rolenum, racenum, i)) { n++; k = i; }
    return { n, k };
}

export function count_ok_align(rolenum, racenum, gendnum) {
    let n = 0, k = 0;
    for (let i = 0; i < ROLE_ALIGNS; i++)
        if (ok_align(rolenum, racenum, gendnum, i)) { n++; k = i; }
    if (n === 0)
        for (let i = 0; i < ROLE_ALIGNS; i++)
            if (validalign(rolenum, racenum, i)) { n++; k = i; }
    return { n, k };
}

// ── "Shall I pick ... for you? [ynaq]" prompt ──
// C ref: role.c gr.role_post_attribs / gr.role_pa[] — which facets still have
// to be named in the prompt's trailing list.  hack.h BP_ALIGN 0 .. BP_ROLE 3.
const BP_ALIGN = 0, BP_GEND = 1, BP_RACE = 2, BP_ROLE = 3, NUM_BP = 4;
const gr = { role_post_attribs: 0, role_pa: new Array(NUM_BP).fill(0) };

// C ref: role.c race_alignmentcount().
function race_alignmentcount(racenum) {
    let aligncount = 0;
    if (racenum !== ROLE_NONE && racenum !== ROLE_RANDOM) {
        if (races[racenum].allow & ROLE_CHAOTIC) ++aligncount;
        if (races[racenum].allow & ROLE_LAWFUL) ++aligncount;
        if (races[racenum].allow & ROLE_NEUTRAL) ++aligncount;
    }
    return aligncount;
}

// C ref: role.c role_gendercount().
function role_gendercount(rolenum) {
    let gendcount = 0;
    if (validrole(rolenum)) {
        if (roles[rolenum].allow & ROLE_MALE) ++gendcount;
        if (roles[rolenum].allow & ROLE_FEMALE) ++gendcount;
        if (roles[rolenum].allow & ROLE_NEUTER) ++gendcount;
    }
    return gendcount;
}

// C ref: role.c promptsep() — the ", " / " and " separators, driven by how many
// facets are left to list; it DECREMENTS gr.role_post_attribs as a side effect.
function promptsep(buf, num_post_attribs) {
    if (num_post_attribs > 1 && gr.role_post_attribs < num_post_attribs
        && gr.role_post_attribs > 1)
        buf += ',';
    buf += ' ';
    --gr.role_post_attribs;
    if (!gr.role_post_attribs && num_post_attribs > 1)
        buf += 'and ';
    return buf;
}

// C ref: hacklib.c s_suffix().
function s_suffix(s) {
    if (/^it$/i.test(s)) return s + 's';
    if (/^you$/i.test(s)) return s + 'r';
    return s + (s.endsWith('s') ? "'" : "'s");
}

// C ref: hacklib.c strsubst() — replaces the FIRST occurrence only.
function strsubst(bp, orig, replacement) {
    const found = bp.indexOf(orig);
    return found < 0 ? bp
        : bp.slice(0, found) + replacement + bp.slice(found + orig.length);
}

// C ref: role.c root_plselection_prompt() — "<your lawful female gnomish
// cavewoman>": every facet that is already pinned is spelled out here, and
// every facet still open sets gr.role_pa[] so build_plselection_prompt() can
// list it after the possessive.
function root_plselection_prompt(rolenum, racenum, gendnum, alignnum) {
    let buf = '', donefirst = false, gendercount = 0, aligncount = 0;

    gr.role_post_attribs = 0;
    gr.role_pa = new Array(NUM_BP).fill(0);

    if (racenum !== ROLE_NONE && racenum !== ROLE_RANDOM)
        aligncount = race_alignmentcount(racenum);

    if (alignnum !== ROLE_NONE && alignnum !== ROLE_RANDOM
        && ok_align(rolenum, racenum, gendnum, alignnum)) {
        if (donefirst) buf += ' ';
        buf += aligns[alignnum].adj;
        donefirst = true;
    } else {
        // C keeps this reset in a local, and the ok_race() tests below see it.
        if (alignnum !== ROLE_RANDOM) alignnum = ROLE_NONE;
        if ((((racenum !== ROLE_NONE && racenum !== ROLE_RANDOM)
              && ok_race(rolenum, racenum, gendnum, alignnum))
             && (aligncount > 1))
            || (racenum === ROLE_NONE || racenum === ROLE_RANDOM)) {
            gr.role_pa[BP_ALIGN] = 1;
            gr.role_post_attribs++;
        }
    }

    if (validrole(rolenum)) gendercount = role_gendercount(rolenum);

    if (gendnum !== ROLE_NONE && gendnum !== ROLE_RANDOM) {
        if (validrole(rolenum)) {
            if (rolenum !== ROLE_NONE && gendercount > 1
                && !roles[rolenum].name.f) {
                if (donefirst) buf += ' ';
                buf += genders[gendnum].adj;
                donefirst = true;
            }
        } else {
            if (donefirst) buf += ' ';
            buf += genders[gendnum].adj;
            donefirst = true;
        }
    } else if ((validrole(rolenum) && gendercount > 1) || !validrole(rolenum)) {
        gr.role_pa[BP_GEND] = 1;
        gr.role_post_attribs++;
    }

    if (racenum !== ROLE_NONE && racenum !== ROLE_RANDOM) {
        if (validrole(rolenum) && ok_race(rolenum, racenum, gendnum, alignnum)) {
            if (donefirst) buf += ' ';
            buf += (rolenum === ROLE_NONE) ? races[racenum].noun
                                           : races[racenum].adj;
            donefirst = true;
        } else if (!validrole(rolenum)) {
            if (donefirst) buf += ' ';
            buf += races[racenum].noun;
            donefirst = true;
        } else {
            gr.role_pa[BP_RACE] = 1;
            gr.role_post_attribs++;
        }
    } else {
        gr.role_pa[BP_RACE] = 1;
        gr.role_post_attribs++;
    }

    if (validrole(rolenum)) {
        if (donefirst) buf += ' ';
        if (gendnum !== ROLE_NONE) {
            buf += (gendnum === 1 && roles[rolenum].name.f)
                ? roles[rolenum].name.f : roles[rolenum].name.m;
        } else {
            buf += roles[rolenum].name.f
                ? `${roles[rolenum].name.m}/${roles[rolenum].name.f}`
                : roles[rolenum].name.m;
        }
        donefirst = true;
    } else if (rolenum === ROLE_NONE) {
        gr.role_pa[BP_ROLE] = 1;
        gr.role_post_attribs++;
    }

    if ((racenum === ROLE_NONE || racenum === ROLE_RANDOM)
        && !validrole(rolenum)) {
        if (donefirst) buf += ' ';
        buf += 'character';
    }
    return buf;
}

// C ref: role.c build_plselection_prompt() — returns the whole yn_function
// query, INCLUDING the "[ynaq]" (genl_player_setup passes choices=NULL so
// yn_function adds nothing) and C's trailing space, which the caller trims.
export function build_plselection_prompt(rolenum, racenum, gendnum, alignnum) {
    let tmpbuf = 'Shall I pick ';
    tmpbuf += (racenum !== ROLE_NONE || validrole(rolenum)) ? 'your ' : 'a ';
    tmpbuf += root_plselection_prompt(rolenum, racenum, gendnum, alignnum);
    // "pick a character's <anything>" sounds stilted, so C drops the article.
    tmpbuf = strsubst(tmpbuf, 'pick a character', 'pick character');
    let buf = s_suffix(tmpbuf);
    if (buf.endsWith("priest/priestess'")) buf += 's';

    let num_post_attribs = gr.role_post_attribs;
    if (!num_post_attribs) {
        // Mutually exclusive constraints can leave nothing to list; then C asks
        // about every facet the config did not pin.
        if (game.initrole === ROLE_NONE && !gr.role_pa[BP_ROLE])
            gr.role_pa[BP_ROLE] = ++gr.role_post_attribs;
        if (game.initrace === ROLE_NONE && !gr.role_pa[BP_RACE])
            gr.role_pa[BP_RACE] = ++gr.role_post_attribs;
        if (game.initalign === ROLE_NONE && !gr.role_pa[BP_ALIGN])
            gr.role_pa[BP_ALIGN] = ++gr.role_post_attribs;
        if (game.initgend === ROLE_NONE && !gr.role_pa[BP_GEND])
            gr.role_pa[BP_GEND] = ++gr.role_post_attribs;
        num_post_attribs = gr.role_post_attribs;
    }
    if (num_post_attribs) {
        if (gr.role_pa[BP_RACE]) { buf = promptsep(buf, num_post_attribs); buf += 'race'; }
        if (gr.role_pa[BP_ROLE]) { buf = promptsep(buf, num_post_attribs); buf += 'role'; }
        if (gr.role_pa[BP_GEND]) { buf = promptsep(buf, num_post_attribs); buf += 'gender'; }
        if (gr.role_pa[BP_ALIGN]) { buf = promptsep(buf, num_post_attribs); buf += 'alignment'; }
    }
    return `${buf} for you? [ynaq] `;
}
