// u_init_link_samurai_invent.js — Human Samurai starting gi.invent + wield (C Samurai[] + ini_inv_use_obj).
// C ref: u_init.c Samurai[] trobj, ini_inv(), ini_inv_adjust_obj(); invent.c addinv (prepend chain);
//        ini_inv_use_obj — uwep katana, uswapwep short sword, uquiver ya, uarm splint (subset).

import { game } from './gstate.js';
import { NH5_WEAPON_CLASS, NH5_ARMOR_CLASS, NH5_TOOL_CLASS } from './nh5_objclass.js';

/** C `objects_nums` / cpp OBJECTS_ENUM indices (NH5; splint +2 vs cpp ≥ dragon block per `u_init_find_ac.js`). */
const OTYP_YA = 22;
const OTYP_SHORT_SWORD = 47;
const OTYP_KATANA = 57;
const OTYP_YUMI = 86;
/** NH5 — matches **`OBJECTS_A_AC_ARMOR`** splint row **125**. */
const OTYP_SPLINT_MAIL = 125;
/** C `objects[]` — blindfold (**`BLINDED`**, black cloth) 233. */
const OTYP_BLINDFOLD = 233;

/** C `objects[]` oc_weight × quan → owt (subset). */
const BASE_WT = {
    [OTYP_KATANA]: 40,
    [OTYP_SHORT_SWORD]: 30,
    [OTYP_YUMI]: 30,
    [OTYP_YA]: 1,
    [OTYP_SPLINT_MAIL]: 400,
    [OTYP_BLINDFOLD]: 2,
};

/** @param {import('./gstate.js').game} [g] */
export function isHumanSamuraiChargenLikeC(g = game) {
    return g.urole?.abbr === 'Sam';
}

/**
 * Build singly-linked **`g.invent`** and set **`uwep`/`uswapwep`/`uquiver`/`uarm`**
 * for human Samurai ( **`g._samuraiIniYaQuan`** **26–45** from **`consumeSamuraiHumanIniInvUinitRoleRngLikeC`** ).
 * @param {import('./gstate.js').game} g
 */
export function applySamuraiHumanLinkedInventAndWieldLikeC(g) {
    if (!isHumanSamuraiChargenLikeC(g)) return;
    const yq = g._samuraiIniYaQuan | 0;
    const yaQuan = yq >= 26 && yq <= 45 ? yq : 35; /* stub mid until fastforward consumes **`u_init_role`** */

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

    const katana = mk(OTYP_KATANA, NH5_WEAPON_CLASS, 1, 0);
    const wakizashi = mk(OTYP_SHORT_SWORD, NH5_WEAPON_CLASS, 1, 0);
    const yumi = mk(OTYP_YUMI, NH5_WEAPON_CLASS, 1, 0);
    const ya = mk(OTYP_YA, NH5_WEAPON_CLASS, yaQuan, 0);
    const splint = mk(OTYP_SPLINT_MAIL, NH5_ARMOR_CLASS, 1, 0);

    /* C addinv prepend order — last **`trobj`** row becomes chain head (like Rogue **`SACK`**). */
    const order = [katana, wakizashi, yumi, ya, splint];
    for (const o of order) {
        o.nobj = g.invent ?? null;
        g.invent = o;
    }

    if (g._samuraiIniBlindfold) {
        const blind = mk(OTYP_BLINDFOLD, NH5_TOOL_CLASS, 1, 0);
        blind.nobj = g.invent ?? null;
        g.invent = blind;
    }

    const u = g.u;
    if (!u) return;
    u.uwep = katana;
    u.uswapwep = wakizashi;
    u.uquiver = ya;
    u.uarm = splint;
}
