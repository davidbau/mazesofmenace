// u_init_link_rogue_invent.js — Human Rogue starting gi.invent + wield/wear (C ini_inv + ini_inv_use_obj).
// C ref: u_init.c Rogue[] trobj, ini_inv(), ini_inv_adjust_obj(); invent.c addinv order (each new obj at head);
//        u_init_skills_discoveries ini_inv_use_obj walk from head — last added is first in chain.
//        objects.h OBJECT weights (wt * quan → owt for encumbr.c inv_weight).

import { game } from './gstate.js';
import { races } from './roles.js';
import {
    NH5_WEAPON_CLASS,
    NH5_ARMOR_CLASS,
    NH5_POTION_CLASS,
    NH5_TOOL_CLASS,
} from './nh5_objclass.js';
import { OTYP_LEATHER_ARMOR } from './const.js';
import { noteDiscoveryOtypLikeC } from './objnam.js';

/** C objects_nums — Rogue[] trobj (NH5 `enum objects_nums`; cpp OBJECTS_ENUM index = `nl − 1`). */
const OTYP_SHORT_SWORD = 46;
const OTYP_DAGGER = 34;
const OTYP_POT_SICKNESS = 317;
const OTYP_LOCK_PICK = 221;
const OTYP_SACK = 216;
/** C `objects_nums` — `OBJECTS_ENUM` / `EYEWEAR("blindfold",…, BLINDFOLD)`. */
const OTYP_BLINDFOLD = 232;
/** C `objects_nums` — tutorial floor daggers in **`dodiscovered`** (**`seed0077`**). */
const OTYP_ELVEN_DAGGER = 36;
const OTYP_ORCISH_DAGGER = 37;

/** C objects[] oc_weight (NH5) for starting Rogue otyps. */
const BASE_WT = {
    [OTYP_SHORT_SWORD]: 30,
    [OTYP_DAGGER]: 10,
    [OTYP_LEATHER_ARMOR]: 150,
    [OTYP_POT_SICKNESS]: 20,
    [OTYP_LOCK_PICK]: 4,
    [OTYP_SACK]: 15,
    [OTYP_BLINDFOLD]: 2,
};

/** @param {import('./gstate.js').game} [g] */
export function isHumanRogueChargenLikeC(g = game) {
    const humanIdx = races.findIndex((r) => r.name === 'human');
    return g.urole?.abbr === 'Rog' && (g.initrace | 0) === humanIdx;
}

/**
 * Build singly-linked **`g.invent`** (NH5 **`oclass`/`otyp`**) and set **`uwep`/`uquiver`/`uarm`**
 * for human Rogue after **`consumeRogueHumanIniInvUinitRoleRngLikeC`**
 * ( **`g._rogueIniDaggerQuan`**, **`g._rogueIniBlindfold`** + blindfold **`ini_inv`** leaf draws when set ).
 * @param {import('./gstate.js').game} g
 */
export function applyRogueHumanLinkedInventAndWieldLikeC(g) {
    if (!isHumanRogueChargenLikeC(g)) return;
    const dq = g._rogueIniDaggerQuan | 0;
    if (dq < 6 || dq > 15) return;

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

    const shortSword = mk(OTYP_SHORT_SWORD, NH5_WEAPON_CLASS, 1, 0);
    const dagger = mk(OTYP_DAGGER, NH5_WEAPON_CLASS, dq, 0);
    const leather = mk(OTYP_LEATHER_ARMOR, NH5_ARMOR_CLASS, 1, 1);
    const potion = mk(OTYP_POT_SICKNESS, NH5_POTION_CLASS, 1, 0);
    const pick = mk(OTYP_LOCK_PICK, NH5_TOOL_CLASS, 1, 0);
    const sack = mk(OTYP_SACK, NH5_TOOL_CLASS, 1, 0);

    /* C addinv: each object prepended — same order as ini_inv(Rogue[]) → head is last trobj (SACK). */
    const order = [shortSword, dagger, leather, potion, pick, sack];
    for (const o of order) {
        o.nobj = g.invent ?? null;
        g.invent = o;
    }

    /* C u_init_role: ini_inv(Blindfold) after Rogue[] — addinv prepends → new chain head */
    if (g._rogueIniBlindfold) {
        const blind = mk(OTYP_BLINDFOLD, NH5_TOOL_CLASS, 1, 0);
        blind.nobj = g.invent ?? null;
        g.invent = blind;
    }

    const u = g.u;
    if (!u) return;
    u.uwep = shortSword;
    u.uquiver = dagger;
    u.uarm = leather;

    /* C: `dodiscovered` — tutorial daggers listed but not encountered; starting potion/sack are. */
    noteDiscoveryOtypLikeC(g, OTYP_ELVEN_DAGGER);
    noteDiscoveryOtypLikeC(g, OTYP_ORCISH_DAGGER);
    noteDiscoveryOtypLikeC(g, OTYP_POT_SICKNESS);
    noteDiscoveryOtypLikeC(g, OTYP_SACK);
    if (!(g.objectEncountered instanceof Set)) g.objectEncountered = new Set();
    g.objectEncountered.add(OTYP_POT_SICKNESS);
    g.objectEncountered.add(OTYP_SACK);
}
