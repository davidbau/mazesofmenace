// u_init_link_healer_invent.js — Human Healer starting g.invent + wield/wear (C Healer[] + optional Lamp).
// C ref: u_init.c Healer[] trobj, ini_inv(), ini_inv_use_obj — uwep scalpel, uarmg leather gloves +1.

import { game } from './gstate.js';
import {
    NH5_ARMOR_CLASS,
    NH5_FOOD_CLASS,
    NH5_POTION_CLASS,
    NH5_SPBOOK_CLASS,
    NH5_TOOL_CLASS,
    NH5_WAND_CLASS,
    NH5_WEAPON_CLASS,
} from './nh5_objclass.js';

/** C `objects[]` — **`SCALPEL`** (39 is knife/stiletto line). */
const OTYP_SCALPEL = 40;
const OTYP_LEATHER_GLOVES = 160;
const OTYP_STETHOSCOPE = 238;
const OTYP_POT_HEALING = 306;
const OTYP_POT_EXTRA_HEALING = 307;
const OTYP_SPE_HEALING = 374;
const OTYP_SPE_EXTRA_HEALING = 391;
const OTYP_SPE_STONE_TO_FLESH = 405;
const OTYP_APPLE = 277;
const OTYP_OIL_LAMP = 228;

const BASE_WT = {
    [OTYP_SCALPEL]: 5,
    [OTYP_LEATHER_GLOVES]: 10,
    [OTYP_STETHOSCOPE]: 4,
    [OTYP_POT_HEALING]: 20,
    [OTYP_POT_EXTRA_HEALING]: 20,
    [OTYP_SPE_HEALING]: 50,
    [OTYP_SPE_EXTRA_HEALING]: 50,
    [OTYP_SPE_STONE_TO_FLESH]: 50,
    [OTYP_APPLE]: 2,
    [OTYP_OIL_LAMP]: 20,
};

/** @param {import('./gstate.js').game} [g] */
export function isHealerChargenLikeC(g = game) {
    return g.urole?.abbr === 'Hea';
}

/** @deprecated use {@link isHealerChargenLikeC} */
export function isHumanHealerChargenLikeC(g = game) {
    return isHealerChargenLikeC(g);
}

/**
 * Linked **`g.invent`** + **`u.uwep`/`u.uarmg`** after **`consumeHealerHumanIniInvUinitRoleRngLikeC`**.
 * @param {import('./gstate.js').game} g
 */
export function applyHealerHumanLinkedInventAndWearLikeC(g) {
    if (!isHealerChargenLikeC(g)) return;

    const wandO = g._healerIniWandOtyp | 0;
    if (wandO < 409 || wandO > 433) return;

    const apples = g._healerIniAppleQuans;
    if (!Array.isArray(apples) || apples.length < 5 || apples.length > 5) return;
    for (const q of apples) {
        if ((q | 0) < 1 || (q | 0) > 2) return;
    }

    g.invent = null;

    /** @returns {{ otyp: number, oclass: number, quan: number, spe: number, owt: number, oartifact: number, nobj: null, cursed?: number, blessed?: number }} */
    function mk(otyp, oclass, quan, spe) {
        let w = BASE_WT[otyp];
        if (w == null) {
            if (oclass === NH5_WAND_CLASS) w = 7;
            else w = 1;
        }
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

    const scalpel = mk(OTYP_SCALPEL, NH5_WEAPON_CLASS, 1, 0);
    const gloves = mk(OTYP_LEATHER_GLOVES, NH5_ARMOR_CLASS, 1, 1);
    const steth = mk(OTYP_STETHOSCOPE, NH5_TOOL_CLASS, 1, 0);

    /** @type {ReturnType<typeof mk>[]} */
    const order = [scalpel, gloves, steth];
    for (let i = 0; i < 4; i++) order.push(mk(OTYP_POT_HEALING, NH5_POTION_CLASS, 1, 0));
    for (let i = 0; i < 4; i++) order.push(mk(OTYP_POT_EXTRA_HEALING, NH5_POTION_CLASS, 1, 0));

    const wand = mk(wandO, NH5_WAND_CLASS, 1, 0);
    order.push(wand);

    const sb1 = mk(OTYP_SPE_HEALING, NH5_SPBOOK_CLASS, 1, 0);
    sb1.blessed = 1;
    const sb2 = mk(OTYP_SPE_EXTRA_HEALING, NH5_SPBOOK_CLASS, 1, 0);
    sb2.blessed = 1;
    const sb3 = mk(OTYP_SPE_STONE_TO_FLESH, NH5_SPBOOK_CLASS, 1, 0);
    sb3.blessed = 1;
    order.push(sb1, sb2, sb3);

    for (const q of apples) {
        order.push(mk(OTYP_APPLE, NH5_FOOD_CLASS, q | 0, 0));
    }

    if (g._healerIniLamp) {
        order.push(mk(OTYP_OIL_LAMP, NH5_TOOL_CLASS, 1, 1));
    }

    for (const o of order) {
        o.nobj = g.invent ?? null;
        g.invent = o;
    }

    const u = g.u;
    if (!u) return;
    u.uwep = scalpel;
    u.uswapwep = null;
    u.uarm = null;
    u.uarmc = null;
    u.uarmh = null;
    u.uarmu = null;
    u.uarmg = gloves;
    u.uarms = null;
    u.uarmf = null;
}
