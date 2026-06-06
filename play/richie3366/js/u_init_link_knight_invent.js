// u_init_link_knight_invent.js — Human Knight starting g.invent + wield/wear (C Knight[] + ini_inv_use_obj).
// C ref: u_init.c Knight[] trobj, ini_inv(), ini_inv_adjust_obj(); invent.c addinv;
//        ini_inv_use_obj — uwep long sword, uswapwep lance, uarm ring mail, uarmh, uarms, uarmg.

import { game } from './gstate.js';
import { races } from './roles.js';
import { NH5_WEAPON_CLASS, NH5_ARMOR_CLASS, NH5_FOOD_CLASS } from './nh5_objclass.js';

/** NH5 `objects_nums` — cpp **`OBJECTS_ENUM`** list index **277** (`obj_oc_cost_data.js` / FOOD `apple`). */
const OTYP_APPLE = 277;
/** Same — **`CARROT`** index **282**. */
const OTYP_CARROT = 282;
/** `OC_SKILL_ROW_BY_OTYP` key (**`LONG_SWORD`** cpp **54** → **55**). */
const OTYP_LONG_SWORD_MK = 55;
/** **`LANCE`** cpp **72** → **73**. */
const OTYP_LANCE_MK = 73;
/** `u_init_find_ac.js` / **`OBJECTS_A_AC_ARMOR`** — ring mail. */
const OTYP_RING_MAIL = 133;
const OTYP_HELMET = 98;
const OTYP_SMALL_SHIELD = 151;
const OTYP_LEATHER_GLOVES = 160;

/** C `objects[]` oc_weight × quan → owt (subset). */
const BASE_WT = {
    [OTYP_LONG_SWORD_MK]: 40,
    [OTYP_LANCE_MK]: 180,
    [OTYP_RING_MAIL]: 250,
    [OTYP_HELMET]: 30,
    [OTYP_SMALL_SHIELD]: 30,
    [OTYP_LEATHER_GLOVES]: 10,
    [OTYP_APPLE]: 2,
    [OTYP_CARROT]: 2,
};

/** @param {import('./gstate.js').game} [g] */
export function isHumanKnightChargenLikeC(g = game) {
    const humanIdx = races.findIndex((r) => r.name === 'human');
    return g.urole?.abbr === 'Kni' && (g.initrace | 0) === humanIdx;
}

/**
 * Linked **`g.invent`** + **`uwep`/`uswapwep`/armor slots** after **`consumeKnightHumanIniInvUinitRoleRngLikeC`**.
 * @param {import('./gstate.js').game} g
 */
export function applyKnightHumanLinkedInventAndWieldLikeC(g) {
    if (!isHumanKnightChargenLikeC(g)) return;
    const aq = g._knightIniAppleQuans;
    const cq = g._knightIniCarrotQuans;
    if (!Array.isArray(aq) || aq.length !== 10 || !Array.isArray(cq) || cq.length !== 10) return;

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

    const longSword = mk(OTYP_LONG_SWORD_MK, NH5_WEAPON_CLASS, 1, 1);
    const lance = mk(OTYP_LANCE_MK, NH5_WEAPON_CLASS, 1, 1);
    const ringMail = mk(OTYP_RING_MAIL, NH5_ARMOR_CLASS, 1, 1);
    const helmet = mk(OTYP_HELMET, NH5_ARMOR_CLASS, 1, 0);
    const shield = mk(OTYP_SMALL_SHIELD, NH5_ARMOR_CLASS, 1, 0);
    const gloves = mk(OTYP_LEATHER_GLOVES, NH5_ARMOR_CLASS, 1, 0);

    /** @type {typeof longSword[]} */
    const order = [longSword, lance, ringMail, helmet, shield, gloves];
    for (let i = 0; i < 10; i++) {
        const q = aq[i] | 0;
        order.push(mk(OTYP_APPLE, NH5_FOOD_CLASS, q >= 1 && q <= 2 ? q : 1, 0));
    }
    for (let i = 0; i < 10; i++) {
        const q = cq[i] | 0;
        order.push(mk(OTYP_CARROT, NH5_FOOD_CLASS, q >= 1 && q <= 2 ? q : 1, 0));
    }

    /* C addinv with !invlet_constant: first trobj stays at chain tail; JS linker prepends in trobj order → tail = long sword. */
    for (const o of order) {
        o.nobj = g.invent ?? null;
        g.invent = o;
    }

    const u = g.u;
    if (!u) return;
    u.uwep = longSword;
    u.uswapwep = lance;
    u.uarm = ringMail;
    u.uarmh = helmet;
    u.uarms = shield;
    u.uarmg = gloves;
}
