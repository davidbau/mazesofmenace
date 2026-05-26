// u_init_post_mklev.js — C u_init.c u_init_role / ini_inv RNG after mklev (allmain.c newgame).
// C ref: allmain.c newgame — mklev, u_on_upstairs, vision_reset, check_special_room(FALSE), makedog,
//        u_init_inventory_attrs().

import { rn2, rnd } from './rng.js';
import { game } from './gstate.js';
import { races } from './roles.js';
import { applyRoleStartingUmoney0 } from './u_init_money.js';
import { initIniInvStub } from './ini_inv_stub.js';
import { applyHiddenGoldToUmoney0 } from './u_init_hidden_gold.js';
import { applyInitAttrPipeline, uInitCarryAttrBoostLikeC } from './u_init_attr.js';
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
 * C: u_init_role + ini_inv PRNG (inside u_init_inventory_attrs after makedog).
 * @param {import('./gstate.js').game} [g]
 */
export function runUInitRoleRngAfterMklevLikeC(g = game) {
    void g;
    /* C: u_init.c u_init_role — svm.moves = 1L before ini_inv (invent init boundary). */
    g.moves = 1;
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
    /* C: u_init_role PM_WIZARD — ini_inv(Wizard[]) same for all races (race extras in u_init_race). */
    if (game.urole?.abbr === 'Wiz') {
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

/**
 * C: u_init.c u_init_inventory_attrs() — role/race invent RNG, money, ini_inv, attrs (no skill_init).
 * @param {import('./gstate.js').game} [g]
 */
export function uInitInventoryAttrsLikeC(g = game) {
    runUInitRoleRngAfterMklevLikeC(g);
    applyRoleStartingUmoney0();
    initIniInvStub(g);
    applyHiddenGoldToUmoney0(g);
    applyInitAttrPipeline(75);
    uInitCarryAttrBoostLikeC(g);
}
