// u_init_link_archeologist_invent.js — Human Archeologist starting g.invent + wield/wear (C Archeologist[] + optional packs).
// C ref: u_init.c Archeologist[] trobj, ini_inv(), ini_inv_adjust_obj, u_init_role PM_ARCHEOLOGIST optional Tinopener/Lamp/Magicmarker;
//        ini_inv_use_obj — uwep bullwhip, uarmu leather jacket, uarmh fedora.

import { game } from './gstate.js';
import {
    NH5_ARMOR_CLASS,
    NH5_FOOD_CLASS,
    NH5_GEM_CLASS,
    NH5_TOOL_CLASS,
    NH5_WEAPON_CLASS,
} from './nh5_objclass.js';

const OTYP_BULLWHIP = 82;
const OTYP_LEATHER_JACKET = 136;
const OTYP_FEDORA = 93;
const OTYP_FOOD_RATION = 143;
const OTYP_PICK_AXE = 260;
const OTYP_TINNING_KIT = 239;
const OTYP_TOUCHSTONE = 472;
const OTYP_SACK = 216;
const OTYP_TIN_OPENER = 240;
const OTYP_OIL_LAMP = 228;
/** C `objects[]` — **`MAGIC_MARKER`** 243. */
const OTYP_MAGIC_MARKER = 243;

const BASE_WT = {
    [OTYP_BULLWHIP]: 20,
    [OTYP_LEATHER_JACKET]: 30,
    [OTYP_FEDORA]: 3,
    [OTYP_FOOD_RATION]: 20,
    [OTYP_PICK_AXE]: 100,
    [OTYP_TINNING_KIT]: 100,
    [OTYP_TOUCHSTONE]: 10,
    [OTYP_SACK]: 15,
    [OTYP_TIN_OPENER]: 4,
    [OTYP_OIL_LAMP]: 20,
    [OTYP_MAGIC_MARKER]: 2,
};

/** @param {import('./gstate.js').game} [g] */
export function isHumanArcheologistChargenLikeC(g = game) {
    return g.urole?.abbr === 'Arc';
}

/**
 * Linked **`g.invent`** + **`u.uwep`/`u.uarmu`/`u.uarmh`** after **`consumeArcheologistHumanIniInvUinitRoleRngLikeC`**.
 * @param {import('./gstate.js').game} g
 */
export function applyArcheologistHumanLinkedInventAndWearLikeC(g) {
    if (!isHumanArcheologistChargenLikeC(g)) return;

    const rations = g._archIniFoodRationQuans;
    if (!Array.isArray(rations) || rations.length !== 3) return;
    for (const q of rations) {
        if ((q | 0) < 1 || (q | 0) > 2) return;
    }
    const tinSpe = g._archIniTinningSpe | 0;
    if (tinSpe < 30 || tinSpe > 99) return;

    const extra = g._archIniExtra;
    if (extra === 'marker') {
        const ms = g._archIniMagicmarkerSpe | 0;
        if (ms < 19 || ms > 22) return;
    }

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

    const whip = mk(OTYP_BULLWHIP, NH5_WEAPON_CLASS, 1, 2);
    whip.blessed = 1;
    const jacket = mk(OTYP_LEATHER_JACKET, NH5_ARMOR_CLASS, 1, 0);
    const fedora = mk(OTYP_FEDORA, NH5_ARMOR_CLASS, 1, 0);

    /** @type {ReturnType<typeof mk>[]} */
    const order = [whip, jacket, fedora];
    for (const q of rations) {
        order.push(mk(OTYP_FOOD_RATION, NH5_FOOD_CLASS, q | 0, 0));
    }
    order.push(mk(OTYP_PICK_AXE, NH5_TOOL_CLASS, 1, 0));
    order.push(mk(OTYP_TINNING_KIT, NH5_TOOL_CLASS, 1, tinSpe));
    order.push(mk(OTYP_TOUCHSTONE, NH5_GEM_CLASS, 1, 0));
    order.push(mk(OTYP_SACK, NH5_TOOL_CLASS, 1, 0));

    if (extra === 'tin') {
        order.push(mk(OTYP_TIN_OPENER, NH5_TOOL_CLASS, 1, 0));
    } else if (extra === 'lamp') {
        order.push(mk(OTYP_OIL_LAMP, NH5_TOOL_CLASS, 1, 1));
    } else if (extra === 'marker') {
        order.push(mk(OTYP_MAGIC_MARKER, NH5_TOOL_CLASS, 1, g._archIniMagicmarkerSpe | 0));
    }

    for (const o of order) {
        o.nobj = g.invent ?? null;
        g.invent = o;
    }

    const u = g.u;
    if (!u) return;
    u.uwep = whip;
    u.uswapwep = null;
    u.uarm = null;
    u.uarmc = null;
    u.uarmh = fedora;
    u.uarmu = jacket;
    u.uarmg = null;
    u.uarms = null;
    u.uarmf = null;
}
