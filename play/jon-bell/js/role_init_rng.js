// @ts-nocheck
// role_init_rng.js — RNG consumed during C role_init() before init_dungeons().
// C ref: role.c — pantheon pick, quest nemesis gender.
import { rn2 } from './rng.js';
import { NUM_ROLES } from './roles.js';
/** C roles[].lgod — only Priest uses borrowed pantheon (role.c ~285). */
export const ROLE_HAS_LGOD = [
    true,
    true,
    true,
    true,
    true,
    true,
    false, /* Priest */
    true,
    true,
    true,
    true,
    true,
    true,
];
/**
 * C: role_init() pantheon loop — while (!roles[pantheon].lgod) pantheon = randrole(FALSE);
 * randrole(FALSE) is rn2(SIZE(roles) - 1) == rn2(NUM_ROLES) for NetHack 3.7.
 *
 * @param {number} initrole C roles[] index, or -1 if unset
 * @returns {number} the chosen pantheon index (same as initrole when it has lgod)
 */
export function consumeRolePantheonPickRng(initrole) {
    if (initrole < 0 || initrole >= NUM_ROLES)
        return initrole;
    let pantheon = initrole;
    let trycnt = 0;
    while (!ROLE_HAS_LGOD[pantheon] && ++trycnt < 100)
        pantheon = rn2(NUM_ROLES);
    return pantheon;
}
/**
 * C: svq.quest_status.nemgend = ... : is_male(pm) ? 0 : (rn2(100) < 50)
 * when the nemesis is not neuter/female/male (no M2_NEUTER/M2_FEMALE/M2_MALE).
 * In NetHack 3.7 only Archeologist (Minion of Huhetotl) and Wizard (Dark One).
 *
 * @param {number} initrole C roles[] index, or -1 if unset
 */
export function consumeQuestNemesisGenderRng(initrole) {
    if (initrole === 0 || initrole === 12) {
        rn2(100);
    }
}
