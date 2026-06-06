// u_init_link_barbarian_invent.js — Human Barbarian starting g.invent + wield/wear (C Barbarian_*[] + ini_inv_use_obj).
// C ref: u_init.c Barbarian_0/Barbarian_1 trobj, ini_inv(), ini_inv_adjust_obj(); invent.c addinv (prepend chain);
//        objects.h oc_weight (subset).

import { game } from './gstate.js';
import { races } from './roles.js';
import {
    NH5_WEAPON_CLASS,
    NH5_ARMOR_CLASS,
    NH5_FOOD_CLASS,
    NH5_TOOL_CLASS,
} from './nh5_objclass.js';

/** NH5 `objects_nums` — cpp **`OBJECTS_ENUM` − 1** (`u_init_role_rng.js` / **`obj_oc_skill_data.js`**). */
/** C `objects_nums` / `obj_oc_skill_data.js`. */
const OTYP_TWO_HANDED_SWORD = 56;
const OTYP_AXE = 45;
const OTYP_BATTLE_AXE = 46;
const OTYP_SHORT_SWORD = 47;
const OTYP_RING_MAIL = 133;
const OTYP_FOOD_RATION = 143;
const OTYP_OIL_LAMP = 228;

/** C `objects[]` oc_weight × quan → owt (subset). */
const BASE_WT = {
    [OTYP_TWO_HANDED_SWORD]: 150,
    [OTYP_AXE]: 60,
    [OTYP_BATTLE_AXE]: 120,
    [OTYP_SHORT_SWORD]: 30,
    [OTYP_RING_MAIL]: 250,
    [OTYP_FOOD_RATION]: 5,
    [OTYP_OIL_LAMP]: 20,
};

/** @param {import('./gstate.js').game} [g] */
export function isHumanBarbarianChargenLikeC(g = game) {
    const humanIdx = races.findIndex((r) => r.name === 'human');
    return g.urole?.abbr === 'Bar' && (g.initrace | 0) === humanIdx;
}

/**
 * Linked **`g.invent`** + **`uwep`/`uswapwep`/`uarm`** after **`consumeBarbarianHumanIniInvUinitRoleRngLikeC`**
 * (**`g._barbarianIniPack0`**, **`g._barbarianIniFoodQuan`**, **`g._barbarianIniLamp`**).
 * @param {import('./gstate.js').game} g
 */
export function applyBarbarianHumanLinkedInventAndWearLikeC(g) {
    if (!isHumanBarbarianChargenLikeC(g)) return;
    if (g._barbarianIniPack0 !== true && g._barbarianIniPack0 !== false) return;
    const fq = g._barbarianIniFoodQuan | 0;
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

    const ringMail = mk(OTYP_RING_MAIL, NH5_ARMOR_CLASS, 1, 1);
    const food = mk(OTYP_FOOD_RATION, NH5_FOOD_CLASS, foodQuan, 0);

    if (g._barbarianIniPack0) {
        const twoH = mk(OTYP_TWO_HANDED_SWORD, NH5_WEAPON_CLASS, 1, 0);
        const axe = mk(OTYP_AXE, NH5_WEAPON_CLASS, 1, 0);
        const order = [twoH, axe, ringMail, food];
        for (const o of order) {
            o.nobj = g.invent ?? null;
            g.invent = o;
        }
        if (g._barbarianIniLamp) {
            const lamp = mk(OTYP_OIL_LAMP, NH5_TOOL_CLASS, 1, 1);
            lamp.nobj = g.invent ?? null;
            g.invent = lamp;
        }
        const u = g.u;
        if (u) {
            u.uwep = twoH;
            u.uswapwep = axe;
            u.uarm = ringMail;
        }
    } else {
        const battle = mk(OTYP_BATTLE_AXE, NH5_WEAPON_CLASS, 1, 0);
        const shortSword = mk(OTYP_SHORT_SWORD, NH5_WEAPON_CLASS, 1, 0);
        const order = [battle, shortSword, ringMail, food];
        for (const o of order) {
            o.nobj = g.invent ?? null;
            g.invent = o;
        }
        if (g._barbarianIniLamp) {
            const lamp = mk(OTYP_OIL_LAMP, NH5_TOOL_CLASS, 1, 1);
            lamp.nobj = g.invent ?? null;
            g.invent = lamp;
        }
        const u = g.u;
        if (u) {
            u.uwep = battle;
            u.uswapwep = shortSword;
            u.uarm = ringMail;
        }
    }

}
