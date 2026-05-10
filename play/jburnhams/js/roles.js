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
    { name: { m: 'Rogue', f: 'Rogue' }, mnum: 7 },
    { name: { m: 'Ranger', f: 'Ranger' }, mnum: 8 },
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

// Appended role and race attributes based on extraction
roles[0].attrbase = [7, 10, 10, 7, 7, 7];
roles[0].attrdist = [20, 20, 20, 10, 20, 10];
roles[0].enadv = { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 };

roles[1].attrbase = [16, 7, 7, 15, 16, 6];
roles[1].attrdist = [30, 6, 7, 20, 30, 7];
roles[1].enadv = { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 };

roles[2].attrbase = [10, 7, 7, 7, 8, 6];
roles[2].attrdist = [30, 6, 7, 20, 30, 7];
roles[2].enadv = { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 };

roles[3].attrbase = [7, 7, 13, 7, 11, 16];
roles[3].attrdist = [15, 20, 20, 15, 25, 5];
roles[3].enadv = { infix: 1, inrnd: 4, lofix: 0, lornd: 1, hifix: 0, hirnd: 2 };

roles[4].attrbase = [13, 7, 14, 8, 10, 17];
roles[4].attrdist = [30, 15, 15, 10, 20, 10];
roles[4].enadv = { infix: 1, inrnd: 4, lofix: 0, lornd: 1, hifix: 0, hirnd: 2 };

roles[5].attrbase = [10, 7, 8, 8, 7, 7];
roles[5].attrdist = [25, 10, 20, 20, 15, 10];
roles[5].enadv = { infix: 2, inrnd: 2, lofix: 0, lornd: 2, hifix: 0, hirnd: 2 };

roles[6].attrbase = [7, 7, 10, 7, 7, 7];
roles[6].attrdist = [15, 10, 30, 15, 20, 10];
roles[6].enadv = { infix: 4, inrnd: 3, lofix: 0, lornd: 2, hifix: 0, hirnd: 2 };

roles[7].attrbase = [7, 7, 7, 10, 7, 6];
roles[7].attrdist = [20, 10, 10, 30, 20, 10];
roles[7].enadv = { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 };

roles[8].attrbase = [13, 13, 13, 9, 13, 7];
roles[8].attrdist = [30, 10, 10, 20, 20, 10];
roles[8].enadv = { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 };

roles[9].attrbase = [10, 8, 7, 10, 17, 6];
roles[9].attrdist = [30, 10, 8, 30, 14, 8];
roles[9].enadv = { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 };

roles[10].attrbase = [7, 10, 6, 7, 7, 10];
roles[10].attrdist = [15, 10, 10, 15, 30, 20];
roles[10].enadv = { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 };

roles[11].attrbase = [10, 7, 7, 7, 10, 7];
roles[11].attrdist = [30, 6, 7, 20, 30, 7];
roles[11].enadv = { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 1 };

roles[12].attrbase = [7, 10, 7, 7, 7, 7];
roles[12].attrdist = [10, 30, 10, 20, 20, 10];
roles[12].enadv = { infix: 4, inrnd: 3, lofix: 0, lornd: 2, hifix: 0, hirnd: 3 };

races[0].attrmax = [118, 18, 18, 18, 18, 18 ];
races[0].enadv = { infix: 1, inrnd: 0, lofix: 2, lornd: 0, hifix: 2, hirnd: 0 };

races[1].attrmax = [18, 20, 20, 18, 16, 18 ];
races[1].enadv = { infix: 2, inrnd: 0, lofix: 3, lornd: 0, hifix: 3, hirnd: 0 };

races[2].attrmax = [118, 16, 16, 20, 20, 16 ];
races[2].enadv = { infix: 0, inrnd: 0, lofix: 0, lornd: 0, hifix: 0, hirnd: 0 };

races[3].attrmax = [18+50, 19, 18, 18, 18, 18 ];
races[3].enadv = { infix: 2, inrnd: 0, lofix: 2, lornd: 0, hifix: 2, hirnd: 0 };

races[4].attrmax = [18+50, 16, 16, 18, 18, 16 ];
races[4].enadv = { infix: 1, inrnd: 0, lofix: 1, lornd: 0, hifix: 1, hirnd: 0 };


// Appended hpadv attributes based on extraction
roles[0].hpadv = { infix: 11, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 };
roles[1].hpadv = { infix: 14, inrnd: 0, lofix: 0, lornd: 10, hifix: 2, hirnd: 0 };
roles[2].hpadv = { infix: 14, inrnd: 0, lofix: 0, lornd: 8, hifix: 2, hirnd: 0 };
roles[3].hpadv = { infix: 11, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 };
roles[4].hpadv = { infix: 14, inrnd: 0, lofix: 0, lornd: 8, hifix: 2, hirnd: 0 };
roles[5].hpadv = { infix: 12, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 };
roles[6].hpadv = { infix: 12, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 };
roles[7].hpadv = { infix: 10, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 };
roles[8].hpadv = { infix: 13, inrnd: 0, lofix: 0, lornd: 6, hifix: 1, hirnd: 0 };
roles[9].hpadv = { infix: 13, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 };
roles[10].hpadv = { infix: 8, inrnd: 0, lofix: 0, lornd: 8, hifix: 0, hirnd: 0 };
roles[11].hpadv = { infix: 14, inrnd: 0, lofix: 0, lornd: 8, hifix: 2, hirnd: 0 };
roles[12].hpadv = { infix: 10, inrnd: 0, lofix: 0, lornd: 8, hifix: 1, hirnd: 0 };

races[0].hpadv = { infix: 2, inrnd: 0, lofix: 0, lornd: 2, hifix: 1, hirnd: 0 };
races[1].hpadv = { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 1, hirnd: 0 };
races[2].hpadv = { infix: 4, inrnd: 0, lofix: 0, lornd: 3, hifix: 2, hirnd: 0 };
races[3].hpadv = { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 0 };
races[4].hpadv = { infix: 1, inrnd: 0, lofix: 0, lornd: 1, hifix: 0, hirnd: 0 };

// Appended xlev values
roles[0].xlev = 14;
roles[1].xlev = 10;
roles[2].xlev = 10;
roles[3].xlev = 20;
roles[4].xlev = 10;
roles[5].xlev = 10;
roles[6].xlev = 10;
roles[7].xlev = 11;
roles[8].xlev = 12;
roles[9].xlev = 11;
roles[10].xlev = 14;
roles[11].xlev = 10;
roles[12].xlev = 12;
