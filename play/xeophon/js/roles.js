// roles.js — Role, race, gender, alignment data.
// C ref: role.c — roles[], races[], aligns[], genders[]
//
// STUB: contestants should port the full role data from C.
// This minimal version provides just enough for Tourist.

export const roles = [
    { name: { m: 'Archeologist', f: 'Archeologist' }, mnum: 0 },
    { name: { m: 'Barbarian', f: 'Barbarian' }, mnum: 1 },
    { name: { m: 'Caveman', f: 'Cavewoman' }, mnum: 2 },
    { name: { m: 'Healer', f: 'Healer' }, mnum: 3 },
    { name: { m: 'Knight', f: 'Knight' }, mnum: 4 },
    { name: { m: 'Monk', f: 'Monk' }, mnum: 5 },
    { name: { m: 'Priest', f: 'Priestess' }, mnum: 6 },
    { name: { m: 'Ranger', f: 'Ranger' }, mnum: 7 },
    { name: { m: 'Rogue', f: 'Rogue' }, mnum: 8 },
    { name: { m: 'Samurai', f: 'Samurai' }, mnum: 9 },
    { name: { m: 'Tourist', f: 'Tourist' }, mnum: 10,
      title: [
          { m: 'Rambler', f: 'Rambler' },
          { m: 'Sightseer', f: 'Sightseer' },
      ],
    },
    { name: { m: 'Valkyrie', f: 'Valkyrie' }, mnum: 11 },
    { name: { m: 'Wizard', f: 'Wizard' }, mnum: 12 },
];

export const races = [
    { name: 'human', adj: 'human', mnum: 0 },
    { name: 'elf', adj: 'elven', mnum: 1 },
    { name: 'dwarf', adj: 'dwarven', mnum: 2 },
    { name: 'gnome', adj: 'gnomish', mnum: 3 },
    { name: 'orc', adj: 'orcish', mnum: 4 },
];

export const aligns = [
    { name: 'lawful', value: 1 },
    { name: 'neutral', value: 0 },
    { name: 'chaotic', value: -1 },
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

// C role.c rank names, shared by hero status and monster-player names.
export const ROLE_RANKS = {
    Archeologist: [
        ['Digger'], ['Field Worker'], ['Investigator'], ['Exhumer'], ['Excavator'],
        ['Spelunker'], ['Speleologist'], ['Collector'], ['Curator'],
    ],
    Barbarian: [
        ['Plunderer', 'Plunderess'], ['Pillager'], ['Bandit'], ['Brigand'], ['Raider'],
        ['Reaver'], ['Slayer'], ['Chieftain', 'Chieftainess'], ['Conqueror', 'Conqueress'],
    ],
    Caveman: [
        ['Troglodyte'], ['Aborigine'], ['Wanderer'], ['Vagrant'], ['Wayfarer'],
        ['Roamer'], ['Nomad'], ['Rover'], ['Pioneer'],
    ],
    Healer: [
        ['Rhizotomist'], ['Empiric'], ['Embalmer'], ['Dresser'], ['Medicus ossium', 'Medica ossium'],
        ['Herbalist'], ['Magister', 'Magistra'], ['Physician'], ['Chirurgeon'],
    ],
    Knight: [
        ['Gallant'], ['Esquire'], ['Bachelor'], ['Sergeant'], ['Knight'],
        ['Banneret'], ['Chevalier', 'Chevaliere'], ['Seignieur', 'Dame'], ['Paladin'],
    ],
    Monk: [
        ['Candidate'], ['Novice'], ['Initiate'], ['Student of Stones'], ['Student of Waters'],
        ['Student of Metals'], ['Student of Winds'], ['Student of Fire'], ['Master'],
    ],
    Priest: [
        ['Aspirant'], ['Acolyte'], ['Adept'], ['Priest', 'Priestess'], ['Curate'],
        ['Canon', 'Canoness'], ['Lama'], ['Patriarch', 'Matriarch'], ['High Priest', 'High Priestess'],
    ],
    Ranger: [
        ['Tenderfoot'], ['Lookout'], ['Trailblazer'], ['Reconnoiterer', 'Reconnoiteress'], ['Scout'],
        ['Arbalester'], ['Archer'], ['Sharpshooter'], ['Marksman', 'Markswoman'],
    ],
    Rogue: [
        ['Footpad'], ['Cutpurse'], ['Rogue'], ['Pilferer'], ['Robber'],
        ['Burglar'], ['Filcher'], ['Magsman', 'Magswoman'], ['Thief'],
    ],
    Samurai: [
        ['Hatamoto'], ['Ronin'], ['Ninja', 'Kunoichi'], ['Joshu'], ['Ryoshu'],
        ['Kokushu'], ['Daimyo'], ['Kuge'], ['Shogun'],
    ],
    Tourist: [
        ['Rambler'], ['Sightseer'], ['Excursionist'], ['Peregrinator', 'Peregrinatrix'], ['Traveler'],
        ['Journeyer'], ['Voyager'], ['Explorer'], ['Adventurer'],
    ],
    Valkyrie: [
        ['Stripling'], ['Skirmisher'], ['Fighter'], ['Man-at-arms', 'Woman-at-arms'], ['Warrior'],
        ['Swashbuckler'], ['Hero', 'Heroine'], ['Champion'], ['Lord', 'Lady'],
    ],
    Wizard: [
        ['Evoker'], ['Conjurer'], ['Thaumaturge'], ['Magician'], ['Enchanter', 'Enchantress'],
        ['Sorcerer', 'Sorceress'], ['Necromancer'], ['Wizard'], ['Mage'],
    ],
};

// C role.c:roles[]: quest leader, guardian, and nemesis species names.
export const QUEST_ROLE_MONSTERS = {
    Archeologist: ['Lord Carnarvon', 'student', 'Minion of Huhetotl'],
    Barbarian: ['Pelias', 'chieftain', 'Thoth Amon'],
    Caveman: ['Shaman Karnov', 'neanderthal', 'Chromatic Dragon'],
    Healer: ['Hippocrates', 'attendant', 'Cyclops'],
    Knight: ['King Arthur', 'page', 'Ixoth'],
    Monk: ['Grand Master', 'abbot', 'Master Kaen'],
    Priest: ['Arch Priest', 'acolyte', 'Nalzok'],
    Ranger: ['Orion', 'hunter', 'Scorpius'],
    Rogue: ['Master of Thieves', 'thug', 'Master Assassin'],
    Samurai: ['Lord Sato', 'roshi', 'Ashikaga Takauji'],
    Tourist: ['Twoflower', 'guide', 'Master of Thieves'],
    Valkyrie: ['Norn', 'warrior', 'Lord Surtur'],
    Wizard: ['Neferet the Green', 'apprentice', 'Dark One'],
};
