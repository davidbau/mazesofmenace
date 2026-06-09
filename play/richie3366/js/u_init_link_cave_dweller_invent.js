// u_init_link_cave_dweller_invent.js — Human Cave dweller starting g.invent + wield (C Cave_man[] + ini_inv_use_obj).
// C ref: u_init.c Cave_man[] trobj, ini_inv(), ini_inv_adjust_obj(); invent.c addinv (prepend chain);
//        ini_inv_use_obj — club uwep, sling uswapwep, flint/rock quiver rules (subset: merged stacks).

import { game } from './gstate.js';
import { NH5_WEAPON_CLASS, NH5_ARMOR_CLASS, NH5_GEM_CLASS } from './nh5_objclass.js';
import { OTYP_LEATHER_ARMOR } from './const.js';

const OTYP_CLUB = 78;
const OTYP_SLING = 87;
const OTYP_FLINT = 473;
const OTYP_ROCK = 474;

/** C `objects[]` oc_weight × quan → owt (subset). */
const BASE_WT = {
    [OTYP_CLUB]: 30,
    [OTYP_SLING]: 20,
    [OTYP_FLINT]: 10,
    [OTYP_ROCK]: 10,
    [OTYP_LEATHER_ARMOR]: 150,
};

/** @param {import('./gstate.js').game} [g] */
export function isHumanCaveDwellerChargenLikeC(g = game) {
    return g.urole?.abbr === 'Cav';
}

/**
 * Linked **`g.invent`** + **`uwep`/`uswapwep`/`uarm`/`uquiver`** after **`consumeCaveDwellerHumanIniInvUinitRoleRngLikeC`**.
 * @param {import('./gstate.js').game} g
 */
export function applyCaveDwellerHumanLinkedInventAndWearLikeC(g) {
    if (!isHumanCaveDwellerChargenLikeC(g)) return;
    const nf = g._caveIniNFlintTrobj | 0;
    const nr = g._caveIniNRockTrobj | 0;
    if (nf < 10 || nf > 20 || nr < 3 || nr > 4) return;
    const fq = g._caveIniFlintQuan | 0;
    const rq = g._caveIniRockQuan | 0;
    if (fq < nf || fq > nf * 2 || rq < nr * 6 || rq > nr * 11) return;

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

    const club = mk(OTYP_CLUB, NH5_WEAPON_CLASS, 1, 1);
    const sling = mk(OTYP_SLING, NH5_WEAPON_CLASS, 1, 2);
    const flint = mk(OTYP_FLINT, NH5_GEM_CLASS, fq, 0);
    const rock = mk(OTYP_ROCK, NH5_GEM_CLASS, rq, 0);
    const leather = mk(OTYP_LEATHER_ARMOR, NH5_ARMOR_CLASS, 1, 0);

    const order = [club, sling, flint, rock, leather];
    for (const o of order) {
        o.nobj = g.invent ?? null;
        g.invent = o;
    }

    const u = g.u;
    if (u) {
        u.uwep = club;
        u.uswapwep = sling;
        u.uarm = leather;
        u.uquiver = flint;
    }
}
