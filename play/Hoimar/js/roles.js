// roles.js — Role, race, gender, alignment data.
// C ref: role.c — roles[], races[], aligns[], genders[]
//
// STUB: contestants should port the full role data from C.
// This minimal version provides just enough for Tourist.

export const roles = [
    { name: { m: 'Archeologist', f: 'Archeologist' }, mnum: 0,
      title: [{ m: 'Digger', f: 'Digger' }] },
    { name: { m: 'Barbarian', f: 'Barbarian' }, mnum: 1,
      title: [{ m: 'Plunderer', f: 'Plunderess' }] },
    { name: { m: 'Caveman', f: 'Cavewoman' }, mnum: 2,
      title: [{ m: 'Troglodyte', f: 'Troglodyte' }] },
    { name: { m: 'Healer', f: 'Healer' }, mnum: 3,
      gods: { lawful: 'Athena', neutral: 'Hermes', chaotic: 'Poseidon' },
      title: [
          { m: 'Rhizotomist', f: 'Rhizotomist' },
          { m: 'Empiric', f: 'Empiric' },
      ],
    },
    { name: { m: 'Knight', f: 'Knight' }, mnum: 4,
      title: [{ m: 'Gallant', f: 'Gallant' }] },
    { name: { m: 'Monk', f: 'Monk' }, mnum: 5,
      title: [{ m: 'Candidate', f: 'Candidate' }] },
    { name: { m: 'Priest', f: 'Priestess' }, mnum: 6,
      title: [{ m: 'Aspirant', f: 'Aspirant' }] },
    { name: { m: 'Ranger', f: 'Ranger' }, mnum: 7,
      title: [{ m: 'Tenderfoot', f: 'Tenderfoot' }] },
    { name: { m: 'Rogue', f: 'Rogue' }, mnum: 8,
      gods: { lawful: 'Issek', neutral: 'Mog', chaotic: 'Kos' },
      title: [{ m: 'Footpad', f: 'Footpad' }] },
    { name: { m: 'Samurai', f: 'Samurai' }, mnum: 9,
      title: [{ m: 'Hatamoto', f: 'Hatamoto' }] },
    { name: { m: 'Tourist', f: 'Tourist' }, mnum: 10,
      title: [
          { m: 'Rambler', f: 'Rambler' },
          { m: 'Sightseer', f: 'Sightseer' },
      ],
    },
    { name: { m: 'Valkyrie', f: 'Valkyrie' }, mnum: 11,
      title: [{ m: 'Stripling', f: 'Stripling' }] },
    { name: { m: 'Wizard', f: 'Wizard' }, mnum: 12,
      gods: { lawful: 'Ptah', neutral: 'Thoth', chaotic: 'Anhur' },
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
    const title = role.title?.[rankIndexForLevel(level)];
    if (!title) return female ? (role.name?.f || role.name?.m) : role.name?.m;
    return female ? (title.f || title.m) : title.m;
}

export function roleGod(role, alignName = 'neutral') {
    return role?.gods?.[alignName] || role?.gods?.neutral || 'Marduk';
}
