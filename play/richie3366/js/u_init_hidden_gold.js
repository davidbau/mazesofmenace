// u_init_hidden_gold.js — Gold carried inside containers on the hero.
// C ref: vault.c hidden_gold(); shk.c contained_gold().

import { game } from './gstate.js';
import { Has_contents } from './const.js';

/** C: objects.h GOLD_PIECE — aligned with mklev.js / objnam.js stubs */
const GOLD_PIECE = 466;

function isCoinClass(o) {
    if (!o) return false;
    if (o.otyp === GOLD_PIECE) return true;
    /* C: objects[otyp].oc_class == COIN_CLASS ('$') when oclass is set */
    return o.oclass === '$';
}

/**
 * C: shk.c contained_gold(obj, even_if_unknown) — nested containers.
 * @param {object} obj — container with optional cobj chain
 * @param {boolean} evenIfUnknown — if true, count unknown contents (cknown falsy)
 * @returns {number}
 */
export function containedGold(obj, evenIfUnknown) {
    if (!obj || !Has_contents(obj)) return 0;
    let value = 0;
    for (let o = obj.cobj; o; o = o.nobj) {
        if (isCoinClass(o)) value += o.quan | 0;
        else if (Has_contents(o) && (o.cknown || evenIfUnknown))
            value += containedGold(o, evenIfUnknown);
    }
    return value;
}

/**
 * C: vault.c hidden_gold(even_if_unknown)
 * @param {object} [g] — game bag (default `game`)
 * @param {boolean} [evenIfUnknown]
 * @returns {number}
 */
export function hiddenGold(g = game, evenIfUnknown = true) {
    let value = 0;
    const inv = g.invent;
    if (!inv) return 0;
    for (let obj = inv; obj; obj = obj.nobj) {
        if (Has_contents(obj) && (obj.cknown || evenIfUnknown))
            value += containedGold(obj, evenIfUnknown);
    }
    return value;
}

/**
 * C: u_init.c u_init_inventory_attrs — u.umoney0 += hidden_gold(TRUE)
 * after ini_inv (so sacks may hold gold). Syncs `g._goldCount` with `u.umoney0`.
 * @param {object} [g]
 * @returns {number} amount added
 */
export function applyHiddenGoldToUmoney0(g = game) {
    const u = g.u;
    if (!u) return 0;
    const h = hiddenGold(g, true);
    if (!h) return 0;
    u.umoney0 = (u.umoney0 | 0) + h;
    g._goldCount = u.umoney0;
    return h;
}
