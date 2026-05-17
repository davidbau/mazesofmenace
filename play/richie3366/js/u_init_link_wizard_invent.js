// u_init_link_wizard_invent.js — Human Wizard starting g.invent + wield/wear (C Wizard[] + blindfold).
// C ref: u_init.c Wizard[] trobj, ini_inv(), ini_inv_use_obj — uwep quarterstaff, uarmc cloak MR.

import { game } from './gstate.js';
import { races } from './roles.js';
import {
    NH5_ARMOR_CLASS,
    NH5_POTION_CLASS,
    NH5_RING_CLASS,
    NH5_SCROLL_CLASS,
    NH5_SPBOOK_CLASS,
    NH5_TOOL_CLASS,
    NH5_WAND_CLASS,
    NH5_WEAPON_CLASS,
} from './nh5_objclass.js';
import { findAc } from './u_init_find_ac.js';

const OTYP_QUARTERSTAFF = 79;
const OTYP_CLOAK_OF_MAGIC_RESISTANCE = 148;
const OTYP_MAGIC_MARKER = 242;
const OTYP_SPE_FORCE_BOLT = 375;
const OTYP_BLINDFOLD = 232;

const BASE_WT = {
    [OTYP_QUARTERSTAFF]: 40,
    [OTYP_CLOAK_OF_MAGIC_RESISTANCE]: 10,
    [OTYP_MAGIC_MARKER]: 2,
    [OTYP_SPE_FORCE_BOLT]: 50,
    [OTYP_BLINDFOLD]: 2,
};

/** @param {import('./gstate.js').game} [g] */
export function isHumanWizardChargenLikeC(g = game) {
    const humanIdx = races.findIndex((r) => r.name === 'human');
    return g.urole?.abbr === 'Wiz' && (g.initrace | 0) === humanIdx;
}

/**
 * Linked **`g.invent`** + **`u.uwep`/`u.uarmc`** after **`consumeWizardHumanIniInvUinitRoleRngLikeC`**.
 * @param {import('./gstate.js').game} g
 */
export function applyWizardHumanLinkedInventAndWearLikeC(g) {
    if (!isHumanWizardChargenLikeC(g)) return;

    const wandO = g._wizardIniWandOtyp | 0;
    const rings = g._wizardIniRingOtyps ?? [];
    const pots = g._wizardIniPotionOtyps ?? [];
    const scrolls = g._wizardIniScrollOtyps ?? [];
    const book2 = g._wizardIniSecondSpellbookOtyp | 0;
    const mmSpe = g._wizardIniMagicmarkerSpe | 0;
    const rq = g._wizardIniRingQuan | 0;
    const pq = g._wizardIniPotionQuan | 0;
    const sq = g._wizardIniScrollQuan | 0;
    if (!wandO || rings.length !== rq || pots.length !== pq || scrolls.length !== sq || book2 < 1 || mmSpe < 19) return;

    g.invent = null;

    /** @returns {{ otyp: number, oclass: number, quan: number, spe: number, owt: number, oartifact: number, nobj: null, cursed?: number, blessed?: number }} */
    function mk(otyp, oclass, quan, spe) {
        let w = BASE_WT[otyp];
        if (w == null) {
            if (oclass === NH5_WAND_CLASS) w = 7;
            else if (oclass === NH5_RING_CLASS) w = 3;
            else if (oclass === NH5_POTION_CLASS) w = 20;
            else if (oclass === NH5_SCROLL_CLASS) w = 5;
            else if (oclass === NH5_SPBOOK_CLASS) w = 50;
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

    const staff = mk(OTYP_QUARTERSTAFF, NH5_WEAPON_CLASS, 1, 1);
    staff.blessed = 1;
    const cloak = mk(OTYP_CLOAK_OF_MAGIC_RESISTANCE, NH5_ARMOR_CLASS, 1, 0);
    const wand = mk(wandO, NH5_WAND_CLASS, 1, 0);

    /** @type {ReturnType<typeof mk>[]} */
    const order = [staff, cloak, wand];
    for (const ro of rings) order.push(mk(ro | 0, NH5_RING_CLASS, 1, 0));
    for (const po of pots) order.push(mk(po | 0, NH5_POTION_CLASS, 1, 0));
    for (const so of scrolls) order.push(mk(so | 0, NH5_SCROLL_CLASS, 1, 0));

    const fb = mk(OTYP_SPE_FORCE_BOLT, NH5_SPBOOK_CLASS, 1, 0);
    fb.blessed = 1;
    order.push(fb);

    const sb = mk(book2, NH5_SPBOOK_CLASS, 1, 0);
    order.push(sb);

    const mm = mk(OTYP_MAGIC_MARKER, NH5_TOOL_CLASS, 1, mmSpe);
    order.push(mm);

    if (g._wizardIniBlindfold) {
        order.push(mk(OTYP_BLINDFOLD, NH5_TOOL_CLASS, 1, 0));
    }

    for (const o of order) {
        o.nobj = g.invent ?? null;
        g.invent = o;
    }

    const u = g.u;
    if (!u) return;
    u.uwep = staff;
    u.uswapwep = null;
    u.uarm = null;
    u.uarmg = null;
    u.uarmh = null;
    u.uarms = null;
    u.uarmc = cloak;
    u.uarmu = null;
    u.uarmf = null;
    findAc(g);
}
