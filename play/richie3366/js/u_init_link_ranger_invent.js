// u_init_link_ranger_invent.js — Human Ranger starting g.invent + wield/wear (C Ranger[] + ini_inv_use_obj).
// C ref: u_init.c Ranger[] trobj, ini_inv(), ini_inv_adjust_obj(); invent.c addinv (prepend chain);
//        ini_inv_use_obj — dagger uwep, bow uswapwep, first arrow stack uquiver, cloak uarmc.

import { game } from './gstate.js';
import { races } from './roles.js';
import { NH5_WEAPON_CLASS, NH5_ARMOR_CLASS, NH5_FOOD_CLASS } from './nh5_objclass.js';
import { findAc } from './u_init_find_ac.js';

/** C `objects_nums` / repo Rogue dagger anchor (NH5 invent **`otyp`**). */
const OTYP_DAGGER = 34;
const OTYP_BOW = 84;
const OTYP_ARROW = 19;
const OTYP_CLOAK_OF_DISPLACEMENT = 150;
const OTYP_CRAM_RATION = 145;

/** C `objects[]` oc_weight × quan → owt (subset). */
const BASE_WT = {
    [OTYP_DAGGER]: 10,
    [OTYP_BOW]: 30,
    [OTYP_ARROW]: 1,
    [OTYP_CLOAK_OF_DISPLACEMENT]: 10,
    [OTYP_CRAM_RATION]: 15,
};

/** @param {import('./gstate.js').game} [g] */
export function isHumanRangerChargenLikeC(g = game) {
    const humanIdx = races.findIndex((r) => r.name === 'human');
    return g.urole?.abbr === 'Ran' && (g.initrace | 0) === humanIdx;
}

/**
 * Linked **`g.invent`** + **`uwep`/`uswapwep`/`uquiver`/`uarmc`** after **`consumeRangerHumanIniInvUinitRoleRngLikeC`**.
 * @param {import('./gstate.js').game} g
 */
export function applyRangerHumanLinkedInventAndWearLikeC(g) {
    if (!isHumanRangerChargenLikeC(g)) return;
    const a1 = g._rangerIniArrow1Quan | 0;
    const a2 = g._rangerIniArrow2Quan | 0;
    if (a1 < 50 || a1 > 59 || a2 < 30 || a2 > 39) return;
    const nc = g._rangerIniCramN | 0;
    const cq = g._rangerIniCramQuans;
    if (nc < 4 || nc > 5 || !Array.isArray(cq) || cq.length !== nc) return;
    let cramSum = 0;
    for (const q of cq) {
        const qq = q | 0;
        if (qq < 1 || qq > 2) return;
        cramSum += qq;
    }
    if (cramSum < nc || cramSum > nc * 2) return;

    g.invent = null;

    /** @returns {{ otyp: number, oclass: number, quan: number, spe: number, owt: number, oartifact: number, nobj: null, cursed?: number, blessed?: number }} */
    function mk(otyp, oclass, quan, spe) {
        const w = BASE_WT[otyp] ?? 1;
        const q = quan | 0;
        return {
            otyp: otyp | 0,
            oclass: oclass | 0,
            quan: q,
            spe: spe | 0,
            owt: Math.max(1, w * q),
            oartifact: 0,
            nobj: null,
            cursed: 0,
            blessed: 0,
        };
    }

    const dagger = mk(OTYP_DAGGER, NH5_WEAPON_CLASS, 1, 1);
    const bow = mk(OTYP_BOW, NH5_WEAPON_CLASS, 1, 1);
    const arr1 = mk(OTYP_ARROW, NH5_WEAPON_CLASS, a1, 2);
    const arr2 = mk(OTYP_ARROW, NH5_WEAPON_CLASS, a2, 0);
    const cloak = mk(OTYP_CLOAK_OF_DISPLACEMENT, NH5_ARMOR_CLASS, 1, 2);
    /** @type {typeof dagger[]} */
    const crams = [];
    for (let i = 0; i < nc; i++) {
        crams.push(mk(OTYP_CRAM_RATION, NH5_FOOD_CLASS, cq[i] | 0, 0));
    }

    const order = [dagger, bow, arr1, arr2, cloak, ...crams];
    for (const o of order) {
        o.nobj = g.invent ?? null;
        g.invent = o;
    }

    const u = g.u;
    if (u) {
        u.uwep = dagger;
        u.uswapwep = bow;
        u.uquiver = arr1;
        u.uarmc = cloak;
    }
    findAc(g);
}
