// u_init_link_priest_invent.js — Human Priest/Priestess starting g.invent + wield/wear (C Priest[] + optional marker/lamp).
// C ref: u_init.c Priest[] trobj, ini_inv(), ini_inv_use_obj — mace uwep, robe uarm, small shield uarms.

import { game } from './gstate.js';
import { races } from './roles.js';
import {
    NH5_ARMOR_CLASS,
    NH5_FOOD_CLASS,
    NH5_POTION_CLASS,
    NH5_SPBOOK_CLASS,
    NH5_TOOL_CLASS,
    NH5_WEAPON_CLASS,
} from './nh5_objclass.js';
import { findAc } from './u_init_find_ac.js';

const OTYP_MACE = 74;
const OTYP_ROBE = 144;
const OTYP_SMALL_SHIELD = 151;
const OTYP_POT_WATER = 321;
const OTYP_CLOVE_GARLIC = 284;
const OTYP_SPRIG_WOLFSBANE = 283;
/** C `objects[]` — **`MAGIC_MARKER`** 243. */
const OTYP_MAGIC_MARKER = 243;
const OTYP_OIL_LAMP = 228;

const BASE_WT = {
    [OTYP_MACE]: 30,
    [OTYP_ROBE]: 15,
    [OTYP_SMALL_SHIELD]: 30,
    [OTYP_POT_WATER]: 20,
    [OTYP_CLOVE_GARLIC]: 1,
    [OTYP_SPRIG_WOLFSBANE]: 1,
    [OTYP_MAGIC_MARKER]: 2,
    [OTYP_OIL_LAMP]: 20,
};

/** @param {import('./gstate.js').game} [g] */
export function isHumanPriestChargenLikeC(g = game) {
    const humanIdx = races.findIndex((r) => r.name === 'human');
    return g.urole?.abbr === 'Pri' && (g.initrace | 0) === humanIdx;
}

/**
 * Linked **`g.invent`** + **`uwep`/`uarm`/`uarms`** after **`consumePriestHumanIniInvUinitRoleRngLikeC`**.
 * @param {import('./gstate.js').game} g
 */
export function applyPriestHumanLinkedInventAndWearLikeC(g) {
    if (!isHumanPriestChargenLikeC(g)) return;
    const books = g._priestIniSpellbookOtyps;
    if (!Array.isArray(books) || books.length !== 2) return;
    for (const b of books) {
        const t = b | 0;
        if (t < 360 || t > 408) return;
    }
    if (g._priestIniMagicmarker) {
        const spe = g._priestIniMagicmarkerSpe | 0;
        if (spe < 19 || spe > 22) return;
    }

    g.invent = null;

    /** @returns {{ otyp: number, oclass: number, quan: number, spe: number, owt: number, oartifact: number, nobj: null, cursed?: number, blessed?: number }} */
    function mk(otyp, oclass, quan, spe) {
        let w = BASE_WT[otyp];
        if (w == null) {
            if (oclass === NH5_SPBOOK_CLASS) w = 50;
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

    const mace = mk(OTYP_MACE, NH5_WEAPON_CLASS, 1, 1);
    mace.blessed = 1;
    const robe = mk(OTYP_ROBE, NH5_ARMOR_CLASS, 1, 0);
    const shield = mk(OTYP_SMALL_SHIELD, NH5_ARMOR_CLASS, 1, 0);

    /** @type {ReturnType<typeof mk>[]} */
    const order = [mace, robe, shield];
    for (let i = 0; i < 4; i++) {
        const hw = mk(OTYP_POT_WATER, NH5_POTION_CLASS, 1, 0);
        hw.blessed = 1;
        order.push(hw);
    }
    order.push(mk(OTYP_CLOVE_GARLIC, NH5_FOOD_CLASS, 1, 0));
    order.push(mk(OTYP_SPRIG_WOLFSBANE, NH5_FOOD_CLASS, 1, 0));
    order.push(mk(books[0] | 0, NH5_SPBOOK_CLASS, 1, 0));
    order.push(mk(books[1] | 0, NH5_SPBOOK_CLASS, 1, 0));

    if (g._priestIniMagicmarker) {
        order.push(mk(OTYP_MAGIC_MARKER, NH5_TOOL_CLASS, 1, g._priestIniMagicmarkerSpe | 0));
    } else if (g._priestIniLamp) {
        order.push(mk(OTYP_OIL_LAMP, NH5_TOOL_CLASS, 1, 1));
    }

    for (const o of order) {
        o.nobj = g.invent ?? null;
        g.invent = o;
    }

    const u = g.u;
    if (!u) return;
    u.uwep = mace;
    u.uarm = robe;
    u.uarms = shield;
    u.uarmg = null;
    u.uarmc = null;
    u.uarmh = null;
    u.uarmu = null;
    u.uarmf = null;
    u.uswapwep = null;
    findAc(g);
}
