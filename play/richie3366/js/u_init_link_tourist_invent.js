// u_init_link_tourist_invent.js — Human Tourist starting g.invent + wield/wear (C Tourist[] + ini_inv_use_obj).
// C ref: u_init.c Tourist[] trobj, ini_inv(), ini_inv_adjust_obj(); invent.c addinv;
//        ini_inv_use_obj — darts uquiver+uwep ammo, Hawaiian shirt uarmu.

import { game } from './gstate.js';
import { races } from './roles.js';
import {
    NH5_ARMOR_CLASS,
    NH5_POTION_CLASS,
    NH5_SCROLL_CLASS,
    NH5_TOOL_CLASS,
    NH5_WEAPON_CLASS,
} from './nh5_objclass.js';
import { findAc } from './u_init_find_ac.js';

const OTYP_DART = 25;
const OTYP_HAWAIIAN_SHIRT = 137;
const OTYP_POT_EXTRA_HEALING = 307;
const OTYP_SCR_MAGIC_MAPPING = 337;
const OTYP_EXPENSIVE_CAMERA = 230;
const OTYP_CREDIT_CARD = 224;
const OTYP_TIN_OPENER = 240;
const OTYP_LEASH = 237;
const OTYP_TOWEL = 235;
const OTYP_MAGIC_MARKER = 242;

const BASE_WT = {
    [OTYP_DART]: 1,
    [OTYP_HAWAIIAN_SHIRT]: 5,
    [OTYP_POT_EXTRA_HEALING]: 20,
    [OTYP_SCR_MAGIC_MAPPING]: 5,
    [OTYP_EXPENSIVE_CAMERA]: 12,
    [OTYP_CREDIT_CARD]: 1,
    [OTYP_TIN_OPENER]: 4,
    [OTYP_LEASH]: 2,
    [OTYP_TOWEL]: 2,
    [OTYP_MAGIC_MARKER]: 2,
};

/** @param {import('./gstate.js').game} [g] */
export function isHumanTouristChargenLikeC(g = game) {
    const humanIdx = races.findIndex((r) => r.name === 'human');
    return g.urole?.abbr === 'Tou' && (g.initrace | 0) === humanIdx;
}

/**
 * Linked **`g.invent`** + **`u.uwep`/`u.uquiver`/`u.uarmu`** after **`consumeTouristHumanIniInvUinitRoleRngLikeC`**.
 * @param {import('./gstate.js').game} g
 */
export function applyTouristHumanLinkedInventAndWearLikeC(g) {
    if (!isHumanTouristChargenLikeC(g)) return;
    const dq = g._touristIniDartQuan | 0;
    if (dq < 21 || dq > 40) return;
    const camSpe = g._touristIniCameraSpe | 0;
    if (camSpe < 30 || camSpe > 99) return;
    const extra = g._touristIniExtra;
    if (extra != null && extra !== 'tinopener' && extra !== 'leash' && extra !== 'towel' && extra !== 'marker') return;
    if (extra === 'marker') {
        const ms = g._touristIniMagicmarkerSpe | 0;
        if (ms < 19 || ms > 22) return;
    }

    g.invent = null;

    /** @returns {{ otyp: number, oclass: number, quan: number, spe: number, owt: number, oartifact: number, nobj: null, cursed?: number, blessed?: number }} */
    function mk(otyp, oclass, quan, spe) {
        let w = BASE_WT[otyp];
        if (w == null) w = 1;
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

    const darts = mk(OTYP_DART, NH5_WEAPON_CLASS, dq, 2);
    const shirt = mk(OTYP_HAWAIIAN_SHIRT, NH5_ARMOR_CLASS, 1, 0);
    const p1 = mk(OTYP_POT_EXTRA_HEALING, NH5_POTION_CLASS, 1, 0);
    const p2 = mk(OTYP_POT_EXTRA_HEALING, NH5_POTION_CLASS, 1, 0);
    const s1 = mk(OTYP_SCR_MAGIC_MAPPING, NH5_SCROLL_CLASS, 1, 0);
    const s2 = mk(OTYP_SCR_MAGIC_MAPPING, NH5_SCROLL_CLASS, 1, 0);
    const s3 = mk(OTYP_SCR_MAGIC_MAPPING, NH5_SCROLL_CLASS, 1, 0);
    const s4 = mk(OTYP_SCR_MAGIC_MAPPING, NH5_SCROLL_CLASS, 1, 0);
    const camera = mk(OTYP_EXPENSIVE_CAMERA, NH5_TOOL_CLASS, 1, camSpe);
    const card = mk(OTYP_CREDIT_CARD, NH5_TOOL_CLASS, 1, 0);

    /** @type {ReturnType<typeof mk>[]} */
    const order = [darts, shirt, p1, p2, s1, s2, s3, s4, camera, card];
    if (extra === 'tinopener') order.push(mk(OTYP_TIN_OPENER, NH5_TOOL_CLASS, 1, 0));
    else if (extra === 'leash') order.push(mk(OTYP_LEASH, NH5_TOOL_CLASS, 1, 0));
    else if (extra === 'towel') order.push(mk(OTYP_TOWEL, NH5_TOOL_CLASS, 1, 0));
    else if (extra === 'marker') order.push(mk(OTYP_MAGIC_MARKER, NH5_TOOL_CLASS, 1, g._touristIniMagicmarkerSpe | 0));

    for (const o of order) {
        o.nobj = g.invent ?? null;
        g.invent = o;
    }

    const u = g.u;
    if (u) {
        u.uwep = darts;
        u.uquiver = darts;
        u.uarmu = shirt;
        u.uswapwep = null;
        u.uarm = null;
        u.uarmc = null;
        u.uarmh = null;
        u.uarmg = null;
        u.uarms = null;
        u.uarmf = null;
    }
    findAc(g);
}
