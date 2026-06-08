// roles.js — Role, race, gender, alignment data.
// C ref: role.c — roles[], races[], aligns[], genders[]
//
// STUB: contestants should port the full role data from C.
// This minimal version provides just enough for Tourist.

export const roles = [
    { name: { m: 'Archeologist', f: 'Archeologist' }, mnum: 0,
      gods: { lawful: 'Quetzalcoatl', neutral: 'Camaxtli', chaotic: 'Huhetotl' },
      quest: { leader: 'LORD_CARNARVON', nemesis: 'MINION_OF_HUHETOTL' },
      initrecord: 10,
      title: [
          { m: 'Digger', f: 'Digger' },
          { m: 'Field Worker', f: 'Field Worker' },
          { m: 'Investigator', f: 'Investigator' },
          { m: 'Exhumer', f: 'Exhumer' },
          { m: 'Excavator', f: 'Excavator' },
          { m: 'Spelunker', f: 'Spelunker' },
          { m: 'Speleologist', f: 'Speleologist' },
          { m: 'Collector', f: 'Collector' },
          { m: 'Curator', f: 'Curator' },
      ] },
    { name: { m: 'Barbarian', f: 'Barbarian' }, mnum: 1,
      gods: { lawful: 'Mitra', neutral: 'Crom', chaotic: 'Set' },
      quest: { leader: 'PELIAS', nemesis: 'THOTH_AMON' },
      initrecord: 10,
      title: [
          { m: 'Plunderer', f: 'Plunderess' },
          { m: 'Pillager', f: 'Pillager' },
          { m: 'Bandit', f: 'Bandit' },
          { m: 'Brigand', f: 'Brigand' },
          { m: 'Raider', f: 'Raider' },
          { m: 'Reaver', f: 'Reaver' },
          { m: 'Slayer', f: 'Slayer' },
          { m: 'Chieftain', f: 'Chieftainess' },
          { m: 'Conqueror', f: 'Conqueress' },
      ] },
    { name: { m: 'Caveman', f: 'Cavewoman' }, mnum: 2,
      gods: { lawful: 'Anu', neutral: 'Ishtar', chaotic: 'Anshar' },
      quest: { leader: 'SHAMAN_KARNOV', nemesis: 'CHROMATIC_DRAGON' },
      initrecord: 0,
      title: [
          { m: 'Troglodyte', f: 'Troglodyte' },
          { m: 'Aborigine', f: 'Aborigine' },
          { m: 'Wanderer', f: 'Wanderer' },
          { m: 'Vagrant', f: 'Vagrant' },
          { m: 'Wayfarer', f: 'Wayfarer' },
          { m: 'Roamer', f: 'Roamer' },
          { m: 'Nomad', f: 'Nomad' },
          { m: 'Rover', f: 'Rover' },
          { m: 'Pioneer', f: 'Pioneer' },
      ] },
    { name: { m: 'Healer', f: 'Healer' }, mnum: 3,
      gods: { lawful: 'Athena', neutral: 'Hermes', chaotic: 'Poseidon' },
      quest: { leader: 'HIPPOCRATES', nemesis: 'CYCLOPS' },
      initrecord: 10,
      title: [
          { m: 'Rhizotomist', f: 'Rhizotomist' },
          { m: 'Empiric', f: 'Empiric' },
      ],
    },
    { name: { m: 'Knight', f: 'Knight' }, mnum: 4,
      gods: { lawful: 'Lugh', neutral: 'Brigit', chaotic: 'Manannan Mac Lir' },
      quest: { leader: 'KING_ARTHUR', nemesis: 'IXOTH' },
      initrecord: 10,
      title: [
          { m: 'Gallant', f: 'Gallant' },
          { m: 'Esquire', f: 'Esquire' },
          { m: 'Bachelor', f: 'Bachelor' },
          { m: 'Sergeant', f: 'Sergeant' },
          { m: 'Knight', f: 'Knight' },
          { m: 'Banneret', f: 'Banneret' },
          { m: 'Chevalier', f: 'Chevaliere' },
          { m: 'Seignieur', f: 'Dame' },
          { m: 'Paladin', f: 'Paladin' },
      ] },
    { name: { m: 'Monk', f: 'Monk' }, mnum: 5,
      gods: { lawful: 'Shan Lai Ching', neutral: 'Chih Sung-tzu', chaotic: 'Huan Ti' },
      quest: { leader: 'GRAND_MASTER', nemesis: 'MASTER_KAEN' },
      initrecord: 10,
      title: [{ m: 'Candidate', f: 'Candidate' }] },
    { name: { m: 'Priest', f: 'Priestess' }, mnum: 6,
      quest: { leader: 'ARCH_PRIEST', nemesis: 'NALZOK' },
      initrecord: 0,
      title: [
          { m: 'Aspirant', f: 'Aspirant' },
          { m: 'Acolyte', f: 'Acolyte' },
          { m: 'Adept', f: 'Adept' },
          { m: 'Priest', f: 'Priestess' },
          { m: 'Curate', f: 'Curate' },
          { m: 'Canon', f: 'Canoness' },
          { m: 'Lama', f: 'Lama' },
          { m: 'Patriarch', f: 'Matriarch' },
          { m: 'High Priest', f: 'High Priestess' },
      ] },
    { name: { m: 'Ranger', f: 'Ranger' }, mnum: 7,
      gods: { lawful: 'Mercury', neutral: 'Venus', chaotic: 'Mars' },
      quest: { leader: 'ORION', nemesis: 'SCORPIUS' },
      initrecord: 10,
      title: [{ m: 'Tenderfoot', f: 'Tenderfoot' }] },
    { name: { m: 'Rogue', f: 'Rogue' }, mnum: 8,
      gods: { lawful: 'Issek', neutral: 'Mog', chaotic: 'Kos' },
      quest: { leader: 'MASTER_OF_THIEVES', nemesis: 'MASTER_ASSASSIN' },
      initrecord: 10,
      title: [{ m: 'Footpad', f: 'Footpad' }] },
    { name: { m: 'Samurai', f: 'Samurai' }, mnum: 9,
      gods: { lawful: 'Amaterasu Omikami', neutral: 'Raijin', chaotic: 'Susanowo' },
      quest: { leader: 'LORD_SATO', nemesis: 'ASHIKAGA_TAKAUJI' },
      initrecord: 10,
      title: [{ m: 'Hatamoto', f: 'Hatamoto' }] },
    { name: { m: 'Tourist', f: 'Tourist' }, mnum: 10,
      gods: { lawful: 'Blind Io', neutral: 'The Lady', chaotic: 'Offler' },
      quest: { leader: 'TWOFLOWER', nemesis: 'MASTER_OF_THIEVES' },
      initrecord: 0,
      title: [
          { m: 'Rambler', f: 'Rambler' },
          { m: 'Sightseer', f: 'Sightseer' },
      ],
    },
    { name: { m: 'Valkyrie', f: 'Valkyrie' }, mnum: 11,
      gods: { lawful: 'Tyr', neutral: 'Odin', chaotic: 'Loki' },
      quest: { leader: 'NORN', nemesis: 'LORD_SURTUR' },
      initrecord: 0,
      title: [{ m: 'Stripling', f: 'Stripling' }] },
    { name: { m: 'Wizard', f: 'Wizard' }, mnum: 12,
      gods: { lawful: 'Ptah', neutral: 'Thoth', chaotic: 'Anhur' },
      quest: { leader: 'NEFERET_THE_GREEN', nemesis: 'DARK_ONE' },
      initrecord: 0,
      title: [
          { m: 'Evoker', f: 'Evoker' },
          { m: 'Conjurer', f: 'Conjurer' },
          { m: 'Thaumaturge', f: 'Thaumaturge' },
          { m: 'Magician', f: 'Magician' },
          { m: 'Enchanter', f: 'Enchantress' },
          { m: 'Sorcerer', f: 'Sorceress' },
          { m: 'Necromancer', f: 'Necromancer' },
          { m: 'Wizard', f: 'Wizard' },
          { m: 'Mage', f: 'Mage' },
      ] },
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
    if (typeof name !== 'string' || !name) return null;
    const lc = name.toLowerCase();
    return roles.find(r => r.name.m.toLowerCase() === lc || r.name.f.toLowerCase() === lc);
}

export function findRace(name) {
    if (typeof name !== 'string' || !name) return null;
    const lc = name.toLowerCase();
    return races.find(r => r.name.toLowerCase() === lc);
}

export function findAlign(name) {
    if (typeof name !== 'string' || !name) return null;
    const lc = name.toLowerCase();
    return aligns.find(a => a.name.toLowerCase() === lc);
}

export function roleGreeting(role, monsterName = null) {
    const roleName = role?.name?.m;
    switch (role?.mnum ?? roles.find(r => r.name.m === roleName || r.name.f === roleName)?.mnum) {
    case 4:
        return 'Salutations';
    case 9:
        return monsterName === 'shopkeeper' ? 'Irasshaimase' : 'Konnichi wa';
    case 10:
        return 'Aloha';
    case 11:
        return monsterName === 'mail daemon' ? 'Hallo' : 'Velkommen';
    default:
        return 'Hello';
    }
}

export function roleWithStartingRank(role) {
    if (!role) return null;
    const title = role.title?.[0];
    if (!title) return role;
    return {
        ...role,
        rank: {
            m: title.m,
            f: title.f || title.m,
        },
    };
}

export function rankIndexForLevel(level) {
    const xlev = Number(level) || 1;
    if (xlev <= 2) return 0;
    if (xlev <= 30) return Math.trunc((xlev + 2) / 4);
    return 8;
}

export function roleRankForLevel(role, level, female = false) {
    if (!role) return null;
    // C ref: src/botl.c:rank_of().  Start at the level's rank index and
    // fall back through lower role ranks before using the role name.
    for (let i = rankIndexForLevel(level); i >= 0; --i) {
        const title = role.title?.[i];
        if (!title) continue;
        if (female && title.f) return title.f;
        if (title.m) return title.m;
    }
    return female ? (role.name?.f || role.name?.m) : role.name?.m;
}

export function roleGod(role, alignName = 'neutral') {
    return role?.gods?.[alignName] || role?.gods?.neutral || 'Marduk';
}
