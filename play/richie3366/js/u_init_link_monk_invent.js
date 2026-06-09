// u_init_link_monk_invent.js — Human Monk starting g.invent + wear robe/gloves (C Monk[] + ini_inv_use_obj subset).
// C ref: u_init.c Monk[] trobj, ini_inv(), ini_inv_use_obj — uarmg leather gloves, uarm robe.

import { game } from './gstate.js';
import { NH5_ARMOR_CLASS, NH5_FOOD_CLASS, NH5_POTION_CLASS, NH5_SCROLL_CLASS, NH5_SPBOOK_CLASS, NH5_TOOL_CLASS } from './nh5_objclass.js';

const OTYP_LEATHER_GLOVES = 160;
const OTYP_ROBE = 144;
/** C `objects[]` — **`POT_HEALING`** (not **`POT_EXTRA_HEALING`** 307). */
const OTYP_POT_HEALING = 306;
const OTYP_FOOD_RATION = 143;
const OTYP_APPLE = 277;
const OTYP_ORANGE = 278;
const OTYP_FORTUNE_COOKIE = 289;
/** C `objects[]` — **`MAGIC_MARKER`** 243 (242 is figurine). */
const OTYP_MAGIC_MARKER = 243;
/** C `objects[]` — **`OIL_LAMP`** (227 is brass lantern). */
const OTYP_OIL_LAMP = 228;

const BASE_WT = {
    [OTYP_LEATHER_GLOVES]: 10,
    [OTYP_ROBE]: 15,
    [OTYP_POT_HEALING]: 7,
    [OTYP_FOOD_RATION]: 5,
    [OTYP_APPLE]: 2,
    [OTYP_ORANGE]: 2,
    [OTYP_FORTUNE_COOKIE]: 1,
    [OTYP_MAGIC_MARKER]: 2,
    [OTYP_OIL_LAMP]: 10,
};

/** @param {import('./gstate.js').game} [g] */
export function isHumanMonkChargenLikeC(g = game) {
    return g.urole?.abbr === 'Mon';
}

/**
 * Linked **`g.invent`** + **`u.uarm`/`u.uarmg`** after **`consumeMonkHumanIniInvUinitRoleRngLikeC`**.
 * @param {import('./gstate.js').game} g
 */
export function applyMonkHumanLinkedInventAndWearLikeC(g) {
    if (!isHumanMonkChargenLikeC(g)) return;

    const scrollOtyp = g._monkIniUndefScrollOtyp | 0;
    const speOtyp = g._monkIniMspellSpeOtyp | 0;
    const pq = g._monkIniPotionHealingQuan | 0;
    const rq = g._monkIniFoodRationQuan | 0;
    const aq = g._monkIniAppleQuan | 0;
    const oq = g._monkIniOrangeQuan | 0;
    const fq = g._monkIniFortuneCookieQuan | 0;
    if (scrollOtyp < 1 || speOtyp < 1 || pq < 1 || rq < 1 || aq < 1 || oq < 1 || fq < 1) return;

    g.invent = null;

    /** @returns {{ otyp: number, oclass: number, quan: number, spe: number, owt: number, oartifact: number, nobj: null, cursed?: number, blessed?: number }} */
    function mk(otyp, oclass, quan, spe) {
        let w = BASE_WT[otyp];
        if (w == null) {
            if (oclass === NH5_SCROLL_CLASS) w = 5;
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

    const gloves = mk(OTYP_LEATHER_GLOVES, NH5_ARMOR_CLASS, 1, 2);
    const robe = mk(OTYP_ROBE, NH5_ARMOR_CLASS, 1, 1);
    const scroll = mk(scrollOtyp, NH5_SCROLL_CLASS, 1, 0);

    /** @type {ReturnType<typeof mk>[]} */
    const order = [gloves, robe, scroll];
    for (let i = 0; i < pq; i++) order.push(mk(OTYP_POT_HEALING, NH5_POTION_CLASS, 1, 0));
    for (let i = 0; i < rq; i++) order.push(mk(OTYP_FOOD_RATION, NH5_FOOD_CLASS, 1, 0));
    for (let i = 0; i < aq; i++) order.push(mk(OTYP_APPLE, NH5_FOOD_CLASS, 1, 0));
    for (let i = 0; i < oq; i++) order.push(mk(OTYP_ORANGE, NH5_FOOD_CLASS, 1, 0));
    for (let i = 0; i < fq; i++) order.push(mk(OTYP_FORTUNE_COOKIE, NH5_FOOD_CLASS, 1, 0));

    const book = mk(speOtyp, NH5_SPBOOK_CLASS, 1, 0);
    book.blessed = 1;
    order.push(book);

    if (g._monkIniMagicmarker) {
        const mm = mk(OTYP_MAGIC_MARKER, NH5_TOOL_CLASS, 1, g._monkIniMagicmarkerSpe | 0);
        order.push(mm);
    } else if (g._monkIniLamp) {
        order.push(mk(OTYP_OIL_LAMP, NH5_TOOL_CLASS, 1, 1));
    }

    for (const o of order) {
        o.nobj = g.invent ?? null;
        g.invent = o;
    }

    const u = g.u;
    if (!u) return;
    u.uwep = null;
    u.uswapwep = null;
    u.uarm = robe;
    u.uarmg = gloves;
    u.uarmh = null;
    u.uarms = null;
    u.uarmc = null;
    u.uarmu = null;
    u.uarmf = null;
}
