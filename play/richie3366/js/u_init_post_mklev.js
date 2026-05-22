// u_init_post_mklev.js — C u_init.c u_init_role / ini_inv RNG after mklev (allmain.c newgame).
// C ref: allmain.c newgame — svm.moves = 1, then u_init_role before u_init_inventory_attrs.
//
// Per-role chains live in u_init_role_rng.js; generic roles still replay leaf draws below
// until full ini_inv is ported. Delete the generic tail as roles move to real code.

import { rn2, rnd } from './rng.js';
import { game } from './gstate.js';
import { races } from './roles.js';
import {
    consumeRogueHumanIniInvUinitRoleRngLikeC,
    consumeSamuraiHumanIniInvUinitRoleRngLikeC,
    consumeValkyrieHumanIniInvUinitRoleRngLikeC,
    consumeKnightHumanIniInvUinitRoleRngLikeC,
    consumeMonkHumanIniInvUinitRoleRngLikeC,
    consumeWizardHumanIniInvUinitRoleRngLikeC,
    consumeArcheologistHumanIniInvUinitRoleRngLikeC,
    consumeHealerHumanIniInvUinitRoleRngLikeC,
    consumePriestHumanIniInvUinitRoleRngLikeC,
    consumeBarbarianHumanIniInvUinitRoleRngLikeC,
    consumeCaveDwellerHumanIniInvUinitRoleRngLikeC,
    consumeRangerHumanIniInvUinitRoleRngLikeC,
    consumeTouristHumanIniInvUinitRoleRngLikeC,
} from './u_init_role_rng.js';

/**
 * C: u_init_role + ini_inv PRNG after mklev, before u_init_inventory_attrs / init_attr.
 * @param {import('./gstate.js').game} [g]
 */
export function runUInitRoleRngAfterMklevLikeC(g = game) {
    void g;
    const humanIdx = races.findIndex((r) => r.name === 'human');
    const rog = game.urole?.abbr === 'Rog' && (game.initrace | 0) === humanIdx;
    if (rog) {
        consumeRogueHumanIniInvUinitRoleRngLikeC();
        return;
    }
    const sam = game.urole?.abbr === 'Sam' && (game.initrace | 0) === humanIdx;
    if (sam) {
        consumeSamuraiHumanIniInvUinitRoleRngLikeC();
        return;
    }
    const val = game.urole?.abbr === 'Val' && (game.initrace | 0) === humanIdx;
    if (val) {
        consumeValkyrieHumanIniInvUinitRoleRngLikeC();
        return;
    }
    const kni = game.urole?.abbr === 'Kni' && (game.initrace | 0) === humanIdx;
    if (kni) {
        consumeKnightHumanIniInvUinitRoleRngLikeC();
        return;
    }
    const mon = game.urole?.abbr === 'Mon' && (game.initrace | 0) === humanIdx;
    if (mon) {
        consumeMonkHumanIniInvUinitRoleRngLikeC();
        return;
    }
    const wiz = game.urole?.abbr === 'Wiz' && (game.initrace | 0) === humanIdx;
    if (wiz) {
        consumeWizardHumanIniInvUinitRoleRngLikeC();
        return;
    }
    const arc = game.urole?.abbr === 'Arc' && (game.initrace | 0) === humanIdx;
    if (arc) {
        consumeArcheologistHumanIniInvUinitRoleRngLikeC();
        return;
    }
    const hea = game.urole?.abbr === 'Hea' && (game.initrace | 0) === humanIdx;
    if (hea) {
        consumeHealerHumanIniInvUinitRoleRngLikeC();
        return;
    }
    const pri = game.urole?.abbr === 'Pri' && (game.initrace | 0) === humanIdx;
    if (pri) {
        consumePriestHumanIniInvUinitRoleRngLikeC();
        return;
    }
    const bar = game.urole?.abbr === 'Bar' && (game.initrace | 0) === humanIdx;
    if (bar) {
        consumeBarbarianHumanIniInvUinitRoleRngLikeC();
        return;
    }
    const ran = game.urole?.abbr === 'Ran' && (game.initrace | 0) === humanIdx;
    if (ran) {
        consumeRangerHumanIniInvUinitRoleRngLikeC();
        return;
    }
    const tou = game.urole?.abbr === 'Tou' && (game.initrace | 0) === humanIdx;
    if (tou) {
        consumeTouristHumanIniInvUinitRoleRngLikeC();
        return;
    }
    const cav = game.urole?.abbr === 'Cav' && (game.initrace | 0) === humanIdx;
    if (cav) {
        consumeCaveDwellerHumanIniInvUinitRoleRngLikeC();
        return;
    }
    /* Generic u_init_role replay — delete as each role gets u_init_role_rng.js. */
    rn2(20); rnd(2); rn2(6); rn2(11); rn2(10); rn2(10); rn2(100); rn2(20); rn2(1);
    rnd(1000); rnd(2); rn2(6); rnd(1000); rnd(2); rn2(6); rnd(1000); rnd(2); rn2(6); rnd(1000);
    rnd(2); rn2(6); rnd(1000); rnd(2); rn2(6); rnd(1000); rnd(2); rn2(6); rnd(1000); rnd(2);
    rn2(6); rnd(1000); rnd(2); rn2(6); rnd(1000); rnd(2); rn2(6); rnd(1000); rnd(2); rn2(6);
    rn2(3); rn2(4); rn2(5); rn2(7); rn2(8); rn2(11); rn2(15); rn2(16); rn2(21); rn2(15); rn2(10);
    rn2(6); rn2(1); rnd(2); rn2(4); rn2(2); rnd(2); rn2(4); rn2(2); rn2(1); rnd(2); rn2(4);
    rnd(2); rn2(4); rnd(2); rn2(4); rnd(2); rn2(4); rn2(1); rnd(2); rn2(10); rn2(11); rn2(10);
    rn2(10); rn2(1); rnd(2); rn2(70); rn2(1); rn2(1); rnd(2); rn2(1); rn2(25); rn2(25); rn2(25);
    rn2(20); rn2(1); rnd(2);
}
