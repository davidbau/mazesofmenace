// role_init.js — Extra RNG calls from role_init().
// C ref: role.c role_init() lines 2022-2078.
//
// role_init() checks leader gender, then nemesis gender, then Priest pantheon.
// All quest leaders have explicit M2_MALE or M2_FEMALE → no rn2 for leaders.
// Nemesis gender: rn2(100) only if nemesis lacks M2_MALE/M2_FEMALE/M2_NEUTER:
//   Arc  (0): MINION_OF_HUHETOTL — no gender flags → rn2(100)
//   Wiz (12): DARK_ONE           — no gender flags → rn2(100)
// Priest (6): lgod=NULL → rn2(13) loop (randrole(FALSE)) until non-Priest found

import { rn2 } from './rng.js';

// Map role name strings (as used in OPTIONS=role:X) to role indices 0-12.
// C ref: role.c roles[] array order (Rogue precedes Ranger by design).
const ROLE_NAME_TO_IDX = {
    'archeologist': 0, 'arc': 0,
    'barbarian': 1,    'bar': 1,
    'caveman': 2,      'cav': 2, 'cavewoman': 2,
    'healer': 3,       'hea': 3,
    'knight': 4,       'kni': 4,
    'monk': 5,         'mon': 5,
    'priest': 6,       'pri': 6, 'priestess': 6,
    'rogue': 7,        'rog': 7,
    'ranger': 8,       'ran': 8,
    'samurai': 9,      'sam': 9,
    'tourist': 10,     'tou': 10,
    'valkyrie': 11,    'val': 11,
    'wizard': 12,      'wiz': 12,
};

export const ROLE_ARC    = 0;
export const ROLE_PRIEST = 6;
export const ROLE_WIZ    = 12;

// Convert a role name string (from OPTIONS=role:X) to a role index 0-12.
// Returns -1 if not recognized.
export function roleNameToIdx(name) {
    if (typeof name !== 'string') return name; // already a number or -1
    return ROLE_NAME_TO_IDX[name.toLowerCase()] ?? -1;
}

// C ref: role.c role_init() lines 2022-2078.
// roleIdx: integer 0-12, or -1 if unknown/random (no extra calls in that case).
// Order mirrors C: leader gender → nemesis gender → Priest pantheon.
export function role_init_extra(roleIdx) {
    // Leader gender: all leaders have explicit M2_MALE/M2_FEMALE → no rn2

    // Nemesis gender: rn2(100) if nemesis has no explicit gender flag
    if (roleIdx === ROLE_ARC || roleIdx === ROLE_WIZ) {
        rn2(100);
    }

    // Priest pantheon: lgod=NULL → loop randrole(FALSE) until non-Priest found
    if (roleIdx === ROLE_PRIEST) {
        let trycnt = 0;
        let pantheon = ROLE_PRIEST;
        while (pantheon === ROLE_PRIEST && ++trycnt < 100) {
            pantheon = rn2(13); // randrole(FALSE) = rn2(13)
        }
    }
}
