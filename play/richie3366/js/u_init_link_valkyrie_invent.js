// u_init_link_valkyrie_invent.js — Human Valkyrie starting gi.invent + wield (C Valkyrie[] + ini_inv_use_obj).
// C ref: u_init.c Valkyrie[] trobj, ini_inv(), ini_inv_adjust_obj(); invent.c addinv (prepend chain);
//        ini_inv_use_obj — uwep spear, uswapwep dagger, uarms small shield.

import { game } from './gstate.js';
import { iniInvSubstOtypForChargenLikeC } from './u_init_ini_inv_obj_substitution_like_c.js';
import {
    NH5_WEAPON_CLASS,
    NH5_ARMOR_CLASS,
    NH5_FOOD_CLASS,
    NH5_TOOL_CLASS,
} from './nh5_objclass.js';

/** NH5 `objects_nums` — cpp **`OBJECTS_ENUM` − 1** where map key is **28** (`obj_oc_skill_data.js` **SPEAR**). */
const OTYP_SPEAR = 27;
/** Same pattern as Rogue dagger (**`u_init_role_rng.js`** / **`u_init_link_rogue_invent.js`**). */
const OTYP_DAGGER = 35;
/** Matches **`OBJECTS_A_AC_ARMOR`** small shield row **151** (`u_init_find_ac.js`). */
const OTYP_SMALL_SHIELD = 151;
/** Align with **`mklev.js`** FOOD_RATION anchor for NH5 food class. */
const OTYP_FOOD_RATION = 143;
const OTYP_OIL_LAMP = 228;

/** C `objects[]` oc_weight × quan → owt (subset). */
const BASE_WT = {
    [OTYP_SPEAR]: 30,
    [OTYP_DAGGER]: 10,
    [OTYP_SMALL_SHIELD]: 30,
    [OTYP_FOOD_RATION]: 5,
    [OTYP_OIL_LAMP]: 20,
};

/** @param {import('./gstate.js').game} [g] */
export function isValkyrieChargenLikeC(g = game) {
    return g.urole?.abbr === 'Val';
}

/** @deprecated use {@link isValkyrieChargenLikeC} */
export function isHumanValkyrieChargenLikeC(g = game) {
    return isValkyrieChargenLikeC(g);
}

/**
 * Linked **`g.invent`** + **`uwep`/`uswapwep`/`uarms`** after **`consumeValkyrieHumanIniInvUinitRoleRngLikeC`**.
 * @param {import('./gstate.js').game} g
 */
export function applyValkyrieHumanLinkedInventAndWieldLikeC(g) {
    if (!isValkyrieChargenLikeC(g)) return;
    const fq = g._valkyrieIniFoodQuan | 0;
    const foodQuan = fq >= 1 && fq <= 2 ? fq : 1;

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

    const sub = (otyp) => iniInvSubstOtypForChargenLikeC(otyp, g);
    const spear = mk(sub(OTYP_SPEAR), NH5_WEAPON_CLASS, 1, 1);
    const dagger = mk(sub(OTYP_DAGGER), NH5_WEAPON_CLASS, 1, 0);
    const shield = mk(sub(OTYP_SMALL_SHIELD), NH5_ARMOR_CLASS, 1, 3);
    const food = mk(OTYP_FOOD_RATION, NH5_FOOD_CLASS, foodQuan, 0);

    const order = [spear, dagger, shield, food];
    if (g._valkyrieIniLamp) {
        order.push(mk(OTYP_OIL_LAMP, NH5_TOOL_CLASS, 1, 1));
    }
    for (const o of order) {
        o.nobj = g.invent ?? null;
        g.invent = o;
    }

    const u = g.u;
    if (!u) return;
    u.uwep = spear;
    u.uswapwep = dagger;
    u.uarms = shield;
}
