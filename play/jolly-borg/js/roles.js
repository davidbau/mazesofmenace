// roles.js — Role, race, gender, alignment data and selection helpers.
// C ref: role.c — roles[], races[], aligns[], genders[].

import {
    MH_HUMAN, MH_ELF, MH_DWARF, MH_GNOME, MH_ORC,
    ROLE_MALE, ROLE_FEMALE, ROLE_NEUTER,
    ROLE_LAWFUL, ROLE_NEUTRAL, ROLE_CHAOTIC,
    ROLE_NONE, ROLE_RANDOM,
    ROLE_GENDERS, ROLE_ALIGNS,
    ROLE_RACEMASK, ROLE_GENDMASK, ROLE_ALIGNMASK,
} from './const.js';
import { rn2 } from './rng.js';

// Roles table (subset of fields needed for chargen + attributes).
export const roles = [
    {
        name: { m: 'Archeologist', f: 'Archeologist' },
        rank: [
            { m: 'Digger', f: 'Digger' },
            { m: 'Field Worker', f: 'Field Worker' },
            { m: 'Investigator', f: 'Investigator' },
            { m: 'Exhumer', f: 'Exhumer' },
            { m: 'Excavator', f: 'Excavator' },
            { m: 'Spelunker', f: 'Spelunker' },
            { m: 'Speleologist', f: 'Speleologist' },
            { m: 'Collector', f: 'Collector' },
            { m: 'Curator', f: 'Curator' },
        ],
        lgod: 'Quetzalcoatl', ngod: 'Camaxtli', cgod: 'Huhetotl',
        filecode: 'Arc',
        allow: MH_HUMAN | MH_DWARF | MH_GNOME | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL | ROLE_NEUTRAL,
        attrbase: [7, 10, 10, 7, 7, 7],
        attrdist: [20, 20, 20, 10, 20, 10],
        hpadv: { infix: 11, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
        xlev: 14,
        initrecord: 10,
    },
    {
        name: { m: 'Barbarian', f: 'Barbarian' },
        rank: [
            { m: 'Plunderer', f: 'Plunderess' },
            { m: 'Pillager', f: 'Pillager' },
            { m: 'Bandit', f: 'Bandit' },
            { m: 'Brigand', f: 'Brigand' },
            { m: 'Raider', f: 'Raider' },
            { m: 'Reaver', f: 'Reaver' },
            { m: 'Slayer', f: 'Slayer' },
            { m: 'Chieftain', f: 'Chieftainess' },
            { m: 'Conqueror', f: 'Conqueress' },
        ],
        lgod: 'Mitra', ngod: 'Crom', cgod: 'Set',
        filecode: 'Bar',
        allow: MH_HUMAN | MH_ORC | ROLE_MALE | ROLE_FEMALE | ROLE_NEUTRAL | ROLE_CHAOTIC,
        attrbase: [16, 7, 7, 15, 16, 6],
        attrdist: [30, 6, 7, 20, 30, 7],
        hpadv: { infix: 14, inrnd: 0, lofix: 0, lornd: 10, hifix: 2, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
        xlev: 10,
        initrecord: 10,
    },
    {
        name: { m: 'Caveman', f: 'Cavewoman' },
        rank: [
            { m: 'Troglodyte', f: 'Troglodyte' },
            { m: 'Aborigine', f: 'Aborigine' },
            { m: 'Wanderer', f: 'Wanderer' },
            { m: 'Vagrant', f: 'Vagrant' },
            { m: 'Wayfarer', f: 'Wayfarer' },
            { m: 'Roamer', f: 'Roamer' },
            { m: 'Nomad', f: 'Nomad' },
            { m: 'Rover', f: 'Rover' },
            { m: 'Pioneer', f: 'Pioneer' },
        ],
        lgod: 'Anu', ngod: '_Ishtar', cgod: 'Anshar',
        filecode: 'Cav',
        allow: MH_HUMAN | MH_DWARF | MH_GNOME | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL | ROLE_NEUTRAL,
        attrbase: [10, 7, 7, 7, 8, 6],
        attrdist: [30, 6, 7, 20, 30, 7],
        hpadv: { infix: 14, inrnd: 0, lofix: 0, lornd: 8, hifix: 2, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
        xlev: 10,
        initrecord: 0,
    },
    {
        name: { m: 'Healer', f: 'Healer' },
        rank: [
            { m: 'Rhizotomist', f: 'Rhizotomist' },
            { m: 'Empiric', f: 'Empiric' },
            { m: 'Embalmer', f: 'Embalmer' },
            { m: 'Dresser', f: 'Dresser' },
            { m: 'Medicus ossium', f: 'Medica ossium' },
            { m: 'Herbalist', f: 'Herbalist' },
            { m: 'Magister', f: 'Magister' },
            { m: 'Physician', f: 'Physician' },
            { m: 'Chirurgeon', f: 'Chirurgeon' },
        ],
        lgod: '_Athena', ngod: 'Hermes', cgod: 'Poseidon',
        filecode: 'Hea',
        allow: MH_HUMAN | MH_GNOME | ROLE_MALE | ROLE_FEMALE | ROLE_NEUTRAL,
        attrbase: [7, 7, 13, 7, 11, 16],
        attrdist: [15, 20, 20, 15, 25, 5],
        hpadv: { infix: 11, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
        enadv: { infix: 1, inrnd: 4, lofix: 0, lornd: 1, hifix: 0, hirnd: 2 },
        xlev: 20,
        initrecord: 10,
    },
    {
        name: { m: 'Knight', f: 'Knight' },
        rank: [
            { m: 'Gallant', f: 'Gallant' },
            { m: 'Esquire', f: 'Esquire' },
            { m: 'Bachelor', f: 'Bachelor' },
            { m: 'Sergeant', f: 'Sergeant' },
            { m: 'Knight', f: 'Knight' },
            { m: 'Banneret', f: 'Banneret' },
            { m: 'Chevalier', f: 'Chevaliere' },
            { m: 'Seignieur', f: 'Dame' },
            { m: 'Paladin', f: 'Paladin' },
        ],
        lgod: 'Lugh', ngod: '_Brigit', cgod: 'Manannan Mac Lir',
        filecode: 'Kni',
        allow: MH_HUMAN | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL,
        attrbase: [13, 7, 14, 8, 10, 17],
        attrdist: [30, 15, 15, 10, 20, 10],
        hpadv: { infix: 14, inrnd: 0, lofix: 0, lornd: 8, hifix: 2, hirnd: 0 },
        enadv: { infix: 1, inrnd: 4, lofix: 0, lornd: 1, hifix: 0, hirnd: 2 },
        xlev: 10,
        initrecord: 10,
    },
    {
        name: { m: 'Monk', f: 'Monk' },
        rank: [
            { m: 'Candidate', f: 'Candidate' },
            { m: 'Novice', f: 'Novice' },
            { m: 'Initiate', f: 'Initiate' },
            { m: 'Student of Stones', f: 'Student of Stones' },
            { m: 'Student of Waters', f: 'Student of Waters' },
            { m: 'Student of Metals', f: 'Student of Metals' },
            { m: 'Student of Winds', f: 'Student of Winds' },
            { m: 'Student of Fire', f: 'Student of Fire' },
            { m: 'Master', f: 'Master' },
        ],
        lgod: 'Shan Lai Ching', ngod: 'Chih Sung-tzu', cgod: 'Huan Ti',
        filecode: 'Mon',
        allow: MH_HUMAN | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL | ROLE_NEUTRAL | ROLE_CHAOTIC,
        attrbase: [10, 7, 8, 8, 7, 7],
        attrdist: [25, 10, 20, 20, 15, 10],
        hpadv: { infix: 12, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
        enadv: { infix: 2, inrnd: 2, lofix: 0, lornd: 2, hifix: 0, hirnd: 2 },
        xlev: 10,
        initrecord: 10,
    },
    {
        name: { m: 'Priest', f: 'Priestess' },
        rank: [
            { m: 'Aspirant', f: 'Aspirant' },
            { m: 'Acolyte', f: 'Acolyte' },
            { m: 'Adept', f: 'Adept' },
            { m: 'Priest', f: 'Priestess' },
            { m: 'Curate', f: 'Curate' },
            { m: 'Canon', f: 'Canoness' },
            { m: 'Lama', f: 'Lama' },
            { m: 'Patriarch', f: 'Matriarch' },
            { m: 'High Priest', f: 'High Priestess' },
        ],
        lgod: null, ngod: null, cgod: null,
        filecode: 'Pri',
        allow: MH_HUMAN | MH_ELF | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL | ROLE_NEUTRAL | ROLE_CHAOTIC,
        attrbase: [7, 7, 10, 7, 7, 7],
        attrdist: [15, 10, 30, 15, 20, 10],
        hpadv: { infix: 12, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
        enadv: { infix: 4, inrnd: 3, lofix: 0, lornd: 2, hifix: 0, hirnd: 2 },
        xlev: 10,
        initrecord: 0,
    },
    {
        name: { m: 'Rogue', f: 'Rogue' },
        rank: [
            { m: 'Footpad', f: 'Footpad' },
            { m: 'Cutpurse', f: 'Cutpurse' },
            { m: 'Rogue', f: 'Rogue' },
            { m: 'Pilferer', f: 'Pilferer' },
            { m: 'Robber', f: 'Robber' },
            { m: 'Burglar', f: 'Burglar' },
            { m: 'Filcher', f: 'Filcher' },
            { m: 'Magsman', f: 'Magswoman' },
            { m: 'Thief', f: 'Thief' },
        ],
        lgod: 'Issek', ngod: 'Mog', cgod: 'Kos',
        filecode: 'Rog',
        allow: MH_HUMAN | MH_ORC | ROLE_MALE | ROLE_FEMALE | ROLE_CHAOTIC,
        attrbase: [7, 7, 7, 10, 7, 6],
        attrdist: [20, 10, 10, 30, 20, 10],
        hpadv: { infix: 10, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
        xlev: 11,
        initrecord: 10,
    },
    {
        name: { m: 'Ranger', f: 'Ranger' },
        rank: [
            { m: 'Tenderfoot', f: 'Tenderfoot' },
            { m: 'Lookout', f: 'Lookout' },
            { m: 'Trailblazer', f: 'Trailblazer' },
            { m: 'Reconnoiterer', f: 'Reconnoiteress' },
            { m: 'Scout', f: 'Scout' },
            { m: 'Arbalester', f: 'Arbalester' },
            { m: 'Archer', f: 'Archer' },
            { m: 'Sharpshooter', f: 'Sharpshooter' },
            { m: 'Marksman', f: 'Markswoman' },
        ],
        lgod: 'Mercury', ngod: '_Venus', cgod: 'Mars',
        filecode: 'Ran',
        allow: MH_HUMAN | MH_ELF | MH_GNOME | MH_ORC | ROLE_MALE | ROLE_FEMALE | ROLE_NEUTRAL | ROLE_CHAOTIC,
        attrbase: [13, 13, 13, 9, 13, 7],
        attrdist: [30, 10, 10, 20, 20, 10],
        hpadv: { infix: 13, inrnd: 0, lofix: 0, lornd: 6, hifix: 1, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
        xlev: 12,
        initrecord: 10,
    },
    {
        name: { m: 'Samurai', f: 'Samurai' },
        rank: [
            { m: 'Hatamoto', f: 'Hatamoto' },
            { m: 'Ronin', f: 'Ronin' },
            { m: 'Ninja', f: 'Kunoichi' },
            { m: 'Joshu', f: 'Joshu' },
            { m: 'Ryoshu', f: 'Ryoshu' },
            { m: 'Kokushu', f: 'Kokushu' },
            { m: 'Daimyo', f: 'Daimyo' },
            { m: 'Kuge', f: 'Kuge' },
            { m: 'Shogun', f: 'Shogun' },
        ],
        lgod: 'Amaterasu Omikami', ngod: 'Raijin', cgod: 'Susanowo',
        filecode: 'Sam',
        allow: MH_HUMAN | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL,
        attrbase: [10, 8, 7, 10, 17, 6],
        attrdist: [30, 10, 8, 30, 14, 8],
        hpadv: { infix: 13, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
        xlev: 11,
        initrecord: 10,
    },
    {
        name: { m: 'Tourist', f: 'Tourist' },
        rank: [
            { m: 'Rambler', f: 'Rambler' },
            { m: 'Sightseer', f: 'Sightseer' },
            { m: 'Excursionist', f: 'Excursionist' },
            { m: 'Peregrinator', f: 'Peregrinatrix' },
            { m: 'Traveler', f: 'Traveler' },
            { m: 'Journeyer', f: 'Journeyer' },
            { m: 'Voyager', f: 'Voyager' },
            { m: 'Explorer', f: 'Explorer' },
            { m: 'Adventurer', f: 'Adventurer' },
        ],
        lgod: 'Blind Io', ngod: 'The Lady', cgod: 'Offler',
        filecode: 'Tou',
        allow: MH_HUMAN | ROLE_MALE | ROLE_FEMALE | ROLE_NEUTRAL,
        attrbase: [7, 10, 6, 7, 7, 10],
        attrdist: [15, 10, 10, 15, 30, 20],
        hpadv: { infix: 8, inrnd: 0, lofix: 0, lornd: 8, hifix: 0, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
        xlev: 14,
        initrecord: 0,
    },
    {
        name: { m: 'Valkyrie', f: 'Valkyrie' },
        rank: [
            { m: 'Stripling', f: 'Stripling' },
            { m: 'Skirmisher', f: 'Skirmisher' },
            { m: 'Fighter', f: 'Fighter' },
            { m: 'Man-at-arms', f: 'Woman-at-arms' },
            { m: 'Warrior', f: 'Warrior' },
            { m: 'Swashbuckler', f: 'Swashbuckler' },
            { m: 'Hero', f: 'Heroine' },
            { m: 'Champion', f: 'Champion' },
            { m: 'Lord', f: 'Lady' },
        ],
        lgod: 'Tyr', ngod: 'Odin', cgod: 'Loki',
        filecode: 'Val',
        allow: MH_HUMAN | MH_DWARF | ROLE_FEMALE | ROLE_LAWFUL | ROLE_NEUTRAL,
        attrbase: [10, 7, 7, 7, 10, 7],
        attrdist: [30, 6, 7, 20, 30, 7],
        hpadv: { infix: 14, inrnd: 0, lofix: 0, lornd: 8, hifix: 2, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 },
        xlev: 10,
        initrecord: 0,
    },
    {
        name: { m: 'Wizard', f: 'Wizard' },
        rank: [
            { m: 'Evoker', f: 'Evoker' },
            { m: 'Conjurer', f: 'Conjurer' },
            { m: 'Thaumaturge', f: 'Thaumaturge' },
            { m: 'Magician', f: 'Magician' },
            { m: 'Enchanter', f: 'Enchantress' },
            { m: 'Sorcerer', f: 'Sorceress' },
            { m: 'Necromancer', f: 'Necromancer' },
            { m: 'Wizard', f: 'Wizard' },
            { m: 'Mage', f: 'Mage' },
        ],
        lgod: 'Ptah', ngod: 'Thoth', cgod: 'Anhur',
        filecode: 'Wiz',
        allow: MH_HUMAN | MH_ELF | MH_GNOME | MH_ORC | ROLE_MALE | ROLE_FEMALE | ROLE_NEUTRAL | ROLE_CHAOTIC,
        attrbase: [7, 10, 7, 7, 7, 7],
        attrdist: [10, 30, 10, 20, 20, 10],
        hpadv: { infix: 10, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 },
        enadv: { infix: 4, inrnd: 3, lofix: 0, lornd: 2, hifix: 0, hirnd: 3 },
        xlev: 12,
        initrecord: 0,
    },
];

export const races = [
    {
        name: 'human', adj: 'human', filecode: 'Hum',
        allow: MH_HUMAN | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL | ROLE_NEUTRAL | ROLE_CHAOTIC,
        selfmask: MH_HUMAN,
        attrmin: [3, 3, 3, 3, 3, 3],
        attrmax: [18, 18, 18, 18, 18, 18],
        hpadv: { infix: 2, inrnd: 0, lofix: 0, lornd: 2, hifix: 1, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 2, lornd: 0, hifix: 2, hirnd: 0 },
    },
    {
        name: 'elf', adj: 'elven', filecode: 'Elf',
        allow: MH_ELF | ROLE_MALE | ROLE_FEMALE | ROLE_CHAOTIC,
        selfmask: MH_ELF,
        attrmin: [3, 3, 3, 3, 3, 3],
        attrmax: [18, 20, 20, 18, 16, 18],
        hpadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 1, hirnd: 0 },
        enadv: { infix: 2, inrnd: 0, lofix: 3, lornd: 0, hifix: 3, hirnd: 0 },
    },
    {
        name: 'dwarf', adj: 'dwarven', filecode: 'Dwa',
        allow: MH_DWARF | ROLE_MALE | ROLE_FEMALE | ROLE_LAWFUL,
        selfmask: MH_DWARF,
        attrmin: [3, 3, 3, 3, 3, 3],
        attrmax: [18, 16, 16, 20, 20, 16],
        hpadv: { infix: 4, inrnd: 0, lofix: 0, lornd: 3, hifix: 2, hirnd: 0 },
        enadv: { infix: 0, inrnd: 0, lofix: 0, lornd: 0, hifix: 0, hirnd: 0 },
    },
    {
        name: 'gnome', adj: 'gnomish', filecode: 'Gno',
        allow: MH_GNOME | ROLE_MALE | ROLE_FEMALE | ROLE_NEUTRAL,
        selfmask: MH_GNOME,
        attrmin: [3, 3, 3, 3, 3, 3],
        attrmax: [18, 19, 18, 18, 18, 18],
        hpadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 0 },
        enadv: { infix: 2, inrnd: 0, lofix: 2, lornd: 0, hifix: 2, hirnd: 0 },
    },
    {
        name: 'orc', adj: 'orcish', filecode: 'Orc',
        allow: MH_ORC | ROLE_MALE | ROLE_FEMALE | ROLE_CHAOTIC,
        selfmask: MH_ORC,
        attrmin: [3, 3, 3, 3, 3, 3],
        attrmax: [18, 16, 16, 18, 18, 16],
        hpadv: { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 0 },
        enadv: { infix: 1, inrnd: 0, lofix: 1, lornd: 0, hifix: 1, hirnd: 0 },
    },
];

export const genders = [
    { name: 'male', value: 0, allow: ROLE_MALE },
    { name: 'female', value: 1, allow: ROLE_FEMALE },
    { name: 'neuter', value: 2, allow: ROLE_NEUTER },
];

export const aligns = [
    { name: 'lawful', value: 1, allow: ROLE_LAWFUL },
    { name: 'neutral', value: 0, allow: ROLE_NEUTRAL },
    { name: 'chaotic', value: -1, allow: ROLE_CHAOTIC },
];

export function findRole(name) {
    if (!name) return null;
    const lc = String(name).toLowerCase();
    return roles.find(r => r.name.m.toLowerCase() === lc || r.name.f.toLowerCase() === lc);
}

export function findRace(name) {
    if (!name) return null;
    const lc = String(name).toLowerCase();
    return races.find(r => r.name.toLowerCase() === lc);
}

export function str2role(str) {
    if (!str) return ROLE_NONE;
    const lc = String(str).toLowerCase();
    if (lc === 'random') return ROLE_RANDOM;
    for (let i = 0; i < roles.length; i++) {
        const r = roles[i];
        if (r.name.m.toLowerCase().startsWith(lc) || r.name.f.toLowerCase().startsWith(lc)) return i;
    }
    return ROLE_NONE;
}

export function str2race(str) {
    if (!str) return ROLE_NONE;
    const lc = String(str).toLowerCase();
    if (lc === 'random') return ROLE_RANDOM;
    for (let i = 0; i < races.length; i++) {
        if (races[i].name.toLowerCase().startsWith(lc)) return i;
    }
    return ROLE_NONE;
}

export function str2gend(str) {
    if (!str) return ROLE_NONE;
    const lc = String(str).toLowerCase();
    if (lc === 'random') return ROLE_RANDOM;
    for (let i = 0; i < ROLE_GENDERS; i++) {
        if (genders[i].name.toLowerCase().startsWith(lc)) return i;
    }
    return ROLE_NONE;
}

export function str2align(str) {
    if (!str) return ROLE_NONE;
    const lc = String(str).toLowerCase();
    if (lc === 'random') return ROLE_RANDOM;
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (aligns[i].name.toLowerCase().startsWith(lc)) return i;
    }
    return ROLE_NONE;
}

export function ok_role(rolenum, racenum, gendnum, alignnum) {
    if (rolenum >= 0 && rolenum < roles.length) {
        const allow = roles[rolenum].allow;
        if (racenum >= 0 && racenum < races.length && !(allow & races[racenum].allow & ROLE_RACEMASK)) return false;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS && !(allow & genders[gendnum].allow & ROLE_GENDMASK)) return false;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS && !(allow & aligns[alignnum].allow & ROLE_ALIGNMASK)) return false;
        return true;
    }
    // Random role: check whether any selection is possible.
    for (let i = 0; i < roles.length; i++) {
        const allow = roles[i].allow;
        if (racenum >= 0 && racenum < races.length && !(allow & races[racenum].allow & ROLE_RACEMASK)) continue;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS && !(allow & genders[gendnum].allow & ROLE_GENDMASK)) continue;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS && !(allow & aligns[alignnum].allow & ROLE_ALIGNMASK)) continue;
        return true;
    }
    return false;
}

export function ok_race(rolenum, racenum, gendnum, alignnum) {
    if (racenum >= 0 && racenum < races.length) {
        const allow = races[racenum].allow;
        if (rolenum >= 0 && rolenum < roles.length && !(allow & roles[rolenum].allow & ROLE_RACEMASK)) return false;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS && !(allow & genders[gendnum].allow & ROLE_GENDMASK)) return false;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS && !(allow & aligns[alignnum].allow & ROLE_ALIGNMASK)) return false;
        return true;
    }
    for (let i = 0; i < races.length; i++) {
        const allow = races[i].allow;
        if (rolenum >= 0 && rolenum < roles.length && !(allow & roles[rolenum].allow & ROLE_RACEMASK)) continue;
        if (gendnum >= 0 && gendnum < ROLE_GENDERS && !(allow & genders[gendnum].allow & ROLE_GENDMASK)) continue;
        if (alignnum >= 0 && alignnum < ROLE_ALIGNS && !(allow & aligns[alignnum].allow & ROLE_ALIGNMASK)) continue;
        return true;
    }
    return false;
}

export function ok_gend(rolenum, racenum, gendnum, alignnum) {
    if (gendnum >= 0 && gendnum < ROLE_GENDERS) {
        const allow = genders[gendnum].allow;
        if (rolenum >= 0 && rolenum < roles.length && !(allow & roles[rolenum].allow & ROLE_GENDMASK)) return false;
        if (racenum >= 0 && racenum < races.length && !(allow & races[racenum].allow & ROLE_GENDMASK)) return false;
        return true;
    }
    for (let i = 0; i < ROLE_GENDERS; i++) {
        const allow = genders[i].allow;
        if (rolenum >= 0 && rolenum < roles.length && !(allow & roles[rolenum].allow & ROLE_GENDMASK)) continue;
        if (racenum >= 0 && racenum < races.length && !(allow & races[racenum].allow & ROLE_GENDMASK)) continue;
        return true;
    }
    return false;
}

export function ok_align(rolenum, racenum, gendnum, alignnum) {
    if (alignnum >= 0 && alignnum < ROLE_ALIGNS) {
        const allow = aligns[alignnum].allow;
        if (rolenum >= 0 && rolenum < roles.length && !(allow & roles[rolenum].allow & ROLE_ALIGNMASK)) return false;
        if (racenum >= 0 && racenum < races.length && !(allow & races[racenum].allow & ROLE_ALIGNMASK)) return false;
        return true;
    }
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        const allow = aligns[i].allow;
        if (rolenum >= 0 && rolenum < roles.length && !(allow & roles[rolenum].allow & ROLE_ALIGNMASK)) continue;
        if (racenum >= 0 && racenum < races.length && !(allow & races[racenum].allow & ROLE_ALIGNMASK)) continue;
        return true;
    }
    return false;
}

export function pick_role(racenum, gendnum, alignnum, pickhow) {
    const set = [];
    for (let i = 0; i < roles.length; i++) {
        if (ok_role(i, racenum, gendnum, alignnum)
            && ok_race(i, racenum >= 0 ? racenum : ROLE_RANDOM, gendnum, alignnum)
            && ok_gend(i, racenum, gendnum >= 0 ? gendnum : ROLE_RANDOM, alignnum)
            && ok_align(i, racenum, gendnum, alignnum >= 0 ? alignnum : ROLE_RANDOM)) {
            set.push(i);
        }
    }
    if (set.length === 0 || (set.length > 1 && pickhow === 'rigid')) return ROLE_NONE;
    return set[rn2(set.length)];
}

export function pick_race(rolenum, gendnum, alignnum, pickhow) {
    const set = [];
    for (let i = 0; i < races.length; i++) if (ok_race(rolenum, i, gendnum, alignnum)) set.push(i);
    if (set.length === 0 || (set.length > 1 && pickhow === 'rigid')) return ROLE_NONE;
    return set[rn2(set.length)];
}

export function pick_gend(rolenum, racenum, alignnum, pickhow) {
    const set = [];
    for (let i = 0; i < ROLE_GENDERS; i++) if (ok_gend(rolenum, racenum, i, alignnum)) set.push(i);
    if (set.length === 0 || (set.length > 1 && pickhow === 'rigid')) return ROLE_NONE;
    return set[rn2(set.length)];
}

export function pick_align(rolenum, racenum, gendnum, pickhow) {
    let alignsOk = 0;
    for (let i = 0; i < ROLE_ALIGNS; i++) if (ok_align(rolenum, racenum, gendnum, i)) alignsOk++;
    if (alignsOk === 0 || (alignsOk > 1 && pickhow === 'rigid')) return ROLE_NONE;
    alignsOk = rn2(alignsOk);
    for (let i = 0; i < ROLE_ALIGNS; i++) {
        if (ok_align(rolenum, racenum, gendnum, i)) {
            if (alignsOk === 0) return i;
            alignsOk--;
        }
    }
    return ROLE_NONE;
}

export function rigid_role_checks(flags) {
    let tmp;
    if (flags.initrole === ROLE_RANDOM) {
        tmp = pick_role(flags.initrace, flags.initgend, flags.initalign, 'random');
        flags.initrole = tmp >= 0 ? tmp : randrole();
    }
    if (flags.initrace === ROLE_RANDOM
        && (tmp = pick_race(flags.initrole, flags.initgend, flags.initalign, 'random')) !== ROLE_NONE)
        flags.initrace = tmp;
    if (flags.initalign === ROLE_RANDOM
        && (tmp = pick_align(flags.initrole, flags.initrace, flags.initgend, 'random')) !== ROLE_NONE)
        flags.initalign = tmp;
    if (flags.initgend === ROLE_RANDOM
        && (tmp = pick_gend(flags.initrole, flags.initrace, flags.initalign, 'random')) !== ROLE_NONE)
        flags.initgend = tmp;

    if (flags.initrole !== ROLE_NONE) {
        if (flags.initrace === ROLE_NONE)
            flags.initrace = pick_race(flags.initrole, flags.initgend, flags.initalign, 'rigid');
        if (flags.initalign === ROLE_NONE)
            flags.initalign = pick_align(flags.initrole, flags.initrace, flags.initgend, 'rigid');
        if (flags.initgend === ROLE_NONE)
            flags.initgend = pick_gend(flags.initrole, flags.initrace, flags.initalign, 'rigid');
    }
}

export function randrole() {
    return rn2(roles.length);
}

export function align_gname(role, alignment) {
    let name = null;
    if (alignment > 0) name = role.lgod;
    else if (alignment < 0) name = role.cgod;
    else name = role.ngod;
    if (!name) return '';
    return name.startsWith('_') ? name.slice(1) : name;
}

export function align_gtitle(role, alignment) {
    let name = null;
    if (alignment > 0) name = role.lgod;
    else if (alignment < 0) name = role.cgod;
    else name = role.ngod;
    if (name && name.startsWith('_')) return 'goddess';
    return 'god';
}

export function rank_of(role, level, female) {
    const idx = Math.max(0, Math.min(role.rank.length - 1, Math.floor((level - 1) / 3)));
    const r = role.rank[idx] || role.rank[0];
    if (!r) return 'Adventurer';
    return female ? (r.f || r.m) : (r.m || r.f);
}
