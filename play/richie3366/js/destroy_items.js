// destroy_items.js — Hero + monster inventory destruction by fire / cold / electricity (zap.c subset).
// C ref: zap.c destroy_items(), destroyable(), maybe_destroy_item() — AD_FIRE + AD_COLD + AD_DISN + AD_ELEC + AD_ACID (monattk.h);
// inventory_resistance_check / u_adtyp_resistance_obj (hero subset); wizard **`item_what`** suffix;
// deferred stacks; hero fire potionbreathe (**`potion_breathe.js`**).
// **`Ring_gone`** / **`setnotworn`** (**`wear.js`** **`ringGoneHeroLikeC`** / **`setnotwornHeroMinimalLikeC`**). **`ignite_items`** → **`ignite_items.js`**.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { pline } from './display.js';
import { nh5HeroObjectClass, removeObjFromHeroInvent } from './water_damage.js';
import {
    NH5_POTION_CLASS,
    NH5_SCROLL_CLASS,
    NH5_SPBOOK_CLASS,
    NH5_RING_CLASS,
    NH5_WAND_CLASS,
} from './nh5_objclass.js';
import { OC_SKILL_ROW_BY_OTYP } from './obj_oc_skill_data.js';
import { updateInventory } from './invent.js';
import { losehp, maybeHalfPhys } from './mthrowu.js';
import { exercise } from './attrib.js';
import {
    A_STR,
    KILLED_BY,
    KILLED_BY_AN,
    W_RING,
    OC_CHARGED_RING_OTYPES,
    OTYP_RIN_SHOCK_RESISTANCE,
    OTYP_DWARVISH_CLOAK,
    FIRE_RES,
    COLD_RES,
    SHOCK_RES,
    DISINT_RES,
    ACID_RES,
} from './const.js';
import { raceptr, fireResistant, breathless, haseyes } from './mondata.js';
import { WAN_LIGHTNING } from './buzz.js';
import { discoverScrollOtyp } from './discover_scroll.js';
import { ringGoneHeroLikeC, setnotwornHeroMinimalLikeC } from './wear.js';
import { potionbreatheObjBreakLikeC } from './potion_breathe.js';

/** C: monattk.h AD_FIRE */
export const AD_FIRE = 2;
/** C: monattk.h AD_COLD — cloak **`u_adtyp`** branch with **`AD_FIRE`**. */
export const AD_COLD = 3;
/** C: monattk.h AD_DISN — **`u_adtyp_resistance_obj`** / **`insight.c`** item bulk protection (no **`destroy_items`** path in this fork yet). */
export const AD_DISN = 5;
/** C: monattk.h AD_ELEC — zap.c **`destroy_items`**, trap.c **`chest_trap`**. */
export const AD_ELEC = 6;
/** C: monattk.h AD_ACID — **`u_adtyp`** / **`insight.c`** only here (no **`destroy_items`** branch yet). */
export const AD_ACID = 8;

/** C: objects.h OBJECTS_ENUM (NH 5.0 cpp) — fire/cold/shock rings. */
const OTYP_RIN_COLD_RESISTANCE = 189;
const OTYP_RIN_SHOCK_RESISTANCE_ENUM = 190;

/** C: zap.c adtyp_to_prop — subset used by **`u_adtyp_resistance_obj`** / **`destroy_items`** AD types. */
function adtypToPropDestroyItemsLikeC(dmgtyp) {
    switch (dmgtyp | 0) {
        case AD_FIRE:
            return FIRE_RES;
        case AD_COLD:
            return COLD_RES;
        case AD_DISN:
            return DISINT_RES;
        case AD_ELEC:
            return SHOCK_RES;
        case AD_ACID:
            return ACID_RES;
        default:
            return 0;
    }
}

function ringOtypMatchesDestroyAdtypPropLikeC(otyp, prop) {
    const t = otyp | 0;
    if (prop === FIRE_RES) return t === OTYP_RIN_FIRE_RESISTANCE;
    if (prop === COLD_RES) return t === OTYP_RIN_COLD_RESISTANCE;
    if (prop === SHOCK_RES) {
        return t === OTYP_RIN_SHOCK_RESISTANCE_ENUM || t === (OTYP_RIN_SHOCK_RESISTANCE | 0);
    }
    return false;
}

/**
 * C: zap.c **`destroyable`** / **`u_adtyp_resistance_obj`** — one body slot contributes inventory
 * protection for **`dmgtyp`** ( **`oc_oprop`**, dwarvish cloak **90%**, resist **ring otyps** on finger).
 */
function heroBodySlotProtectsInventoryDestroyDmgtypLikeC(g, obj, dmgtyp, prop) {
    if (!obj) return false;
    if ((obj.oc_oprop | 0) === prop) return true;
    if (obj === g.u?.uarmc) {
        const typ = obj.otyp | 0;
        const d = dmgtyp | 0;
        if (typ === OTYP_DWARVISH_CLOAK && (d === AD_FIRE || d === AD_COLD)) return true;
    }
    if (obj === g.u?.uleft || obj === g.u?.uright) {
        return ringOtypMatchesDestroyAdtypPropLikeC(obj.otyp | 0, prop);
    }
    return false;
}

/**
 * C: zap.c **`item_what(dmgtyp)`** — wizard only; suffix for **`enl_msg`** (**`" by your …"`**).
 * Omits C **`cloak_simple_name`** / **`suit_simple_name`** / …; uses **`objShortPhrase`** on the chosen object.
 * @param {typeof game} g
 * @param {number} dmgtyp
 * @returns {string}
 */
export function itemWhatAdtypInventoryProtectWizardLikeC(g, dmgtyp) {
    if (!(g.flags?.wizard)) return '';
    if (!uAdtypResistanceObjPercentHeroLikeC(g, dmgtyp)) return '';
    const u = g.u;
    if (!u) return '';
    const prop = adtypToPropDestroyItemsLikeC(dmgtyp);
    if (!prop) return '';
    const slotsInItemWhatOrder = [
        u.uarmc,
        u.uarm,
        u.uarmu,
        u.uarmh,
        u.uarmg,
        u.uarmf,
        u.uarms,
    ];
    for (let i = 0; i < slotsInItemWhatOrder.length; i++) {
        const o = slotsInItemWhatOrder[i];
        if (heroBodySlotProtectsInventoryDestroyDmgtypLikeC(g, o, dmgtyp, prop)) {
            return ` by your ${objShortPhrase(o)}`;
        }
    }
    if (u.uamul && heroBodySlotProtectsInventoryDestroyDmgtypLikeC(g, u.uamul, dmgtyp, prop)) {
        return ` by your ${objShortPhrase(u.uamul)}`;
    }
    if (u.ublindf && heroBodySlotProtectsInventoryDestroyDmgtypLikeC(g, u.ublindf, dmgtyp, prop)) {
        return ` by your ${objShortPhrase(u.ublindf)}`;
    }
    const lr = [u.uleft, u.uright];
    const l0 = lr[0];
    const l1 = lr[1];
    if (
        l0 &&
        l1 &&
        ringOtypMatchesDestroyAdtypPropLikeC(l0.otyp | 0, prop) &&
        ringOtypMatchesDestroyAdtypPropLikeC(l1.otyp | 0, prop)
    ) {
        return ' by your rings';
    }
    if (l0 && heroBodySlotProtectsInventoryDestroyDmgtypLikeC(g, l0, dmgtyp, prop)) {
        return ` by your ${objShortPhrase(l0)}`;
    }
    if (l1 && heroBodySlotProtectsInventoryDestroyDmgtypLikeC(g, l1, dmgtyp, prop)) {
        return ` by your ${objShortPhrase(l1)}`;
    }
    if (u.uwep && heroBodySlotProtectsInventoryDestroyDmgtypLikeC(g, u.uwep, dmgtyp, prop)) {
        return ` by your ${objShortPhrase(u.uwep)}`;
    }
    if (u.uswapwep && (u.uswapwep.oc_oprop | 0) === prop) {
        return ` by your ${objShortPhrase(u.uswapwep)}`;
    }
    return '';
}

/** C: zap.c u_adtyp_resistance_obj — worn oc_oprop, dwarvish cloak 90% fire/cold, ring otyps (NH5 enum). */
export function uAdtypResistanceObjPercentHeroLikeC(g, dmgtyp) {
    const prop = adtypToPropDestroyItemsLikeC(dmgtyp);
    if (!prop) return 0;
    const u = g.u;
    if (!u) return 0;
    const slots = [
        u.uarm,
        u.uarmc,
        u.uarmf,
        u.uarmg,
        u.uarmh,
        u.uarms,
        u.uarmu,
        u.uamul,
        u.ublindf,
        u.uleft,
        u.uright,
        u.uwep,
        u.uswapwep,
        u.uarmb,
    ];
    for (let i = 0; i < slots.length; i++) {
        const o = slots[i];
        if (!o) continue;
        if ((o.oc_oprop | 0) === prop) return 99;
    }
    const cloak = u.uarmc;
    if (cloak && ((dmgtyp | 0) === AD_FIRE || (dmgtyp | 0) === AD_COLD)) {
        if ((cloak.otyp | 0) === OTYP_DWARVISH_CLOAK) return 90;
    }
    const lr = [u.uleft, u.uright];
    for (let j = 0; j < lr.length; j++) {
        const ri = lr[j];
        if (!ri) continue;
        const t = ri.otyp | 0;
        if (ringOtypMatchesDestroyAdtypPropLikeC(t, prop)) return 99;
    }
    return 0;
}

/** C: zap.c inventory_resistance_check — hero only; rn2(100) when prob > 0. */
export function inventoryResistanceCheckHeroLikeC(g, dmgtyp) {
    const prob = uAdtypResistanceObjPercentHeroLikeC(g, dmgtyp);
    if (!prob) return false;
    return rn2(100) < prob;
}

/** C: zap.c DMG_DESTROY_SCALE / MAX_ITEMS_DESTROYED */
const DMG_DESTROY_SCALE = 5;
const MAX_ITEMS_DESTROYED = 20;

/** @see water_damage.js — NH5 scroll / spellbook / potion blocks */
const OTYP_POT_OIL = 320;
const OTYP_SCR_FIRE = 338; /* objects.h SCROLL order to SCR_FIRE */
const OTYP_SPE_BOOK_OF_THE_DEAD = 408;
const OTYP_SPE_FIREBALL = 368;

/** C: zap.c destroy_strings[dindx] — AD_COLD uses row **0** (freeze / shattered potion). */
const DS_FREEZE_POTION = 0;

/** C: zap.c destroy_strings[dindx][0 singular verb, 1 plural, 2 killer] — AD_FIRE rows */
const DS_BOIL_POTION = 1;
const DS_BOIL_OIL = 2;
const DS_BURN_SCROLL = 3;
const DS_BURN_SPELLBOOK = 4;
const DS_SHOCK_RING = 5;
const DS_EXPLODE_WAND = 6;

const DESTROY_STRINGS = [
    ['freezes and shatters', 'freeze and shatter', 'shattered potion'],
    ['boils and explodes', 'boil and explode', 'boiling potion'],
    ['ignites and explodes', 'ignite and explode', 'exploding potion'],
    ['catches fire and burns', 'catch fire and burn', 'burning scroll'],
    ['catches fire and burns', '', 'burning book'],
    ['turns to dust and vanishes', 'turn to dust and vanish', ''],
    ['breaks apart and explodes', 'break apart and explode', 'exploding wand'],
];

/**
 * C: zap.c destroyable(obj, AD_FIRE) — oclass via NH5; SCR_FIRE / SPE_FIREBALL immune.
 * @param {{ otyp?: number, oclass?: number, quan?: number, in_use?: number, oartifact?: number }} obj
 */
function destroyableHeroFire(obj) {
    if (!obj) return false;
    if (obj.oartifact | 0) return false;
    const quan = obj.quan ?? 1;
    if ((obj.in_use | 0) && quan <= 1) return false;
    const t = obj.otyp | 0;
    if (t === OTYP_SCR_FIRE || t === OTYP_SPE_FIREBALL) return false;
    const oc = nh5HeroObjectClass(obj);
    return oc === NH5_POTION_CLASS || oc === NH5_SCROLL_CLASS || oc === NH5_SPBOOK_CLASS;
}

/**
 * C: zap.c **`destroyable(obj, AD_COLD)`** — non-oil potions only.
 * @param {{ otyp?: number, oclass?: number, quan?: number, in_use?: number, oartifact?: number }} obj
 */
function destroyableHeroCold(obj) {
    if (!obj) return false;
    if (obj.oartifact | 0) return false;
    const quan = obj.quan ?? 1;
    if ((obj.in_use | 0) && quan <= 1) return false;
    const oc = nh5HeroObjectClass(obj);
    if (oc !== NH5_POTION_CLASS) return false;
    return (obj.otyp | 0) !== OTYP_POT_OIL;
}

function objShortPhrase(obj) {
    const row = OC_SKILL_ROW_BY_OTYP.get(obj.otyp | 0);
    if (row) return row.name.toLowerCase().replace(/_/g, ' ');
    return 'item';
}

/**
 * C: zap.c maybe_destroy_item(carrier, obj, AD_FIRE) — hero subset (**`potionbreathe`** when
 * **`POTION_CLASS`** after pline; **`!breathless` || `haseyes`**); **`Ring_gone`** + **`setnotworn`**
 * before **`useup`**; **`inventoryResistanceCheckHeroLikeC`**).
 * @param {typeof game} g
 * @param {{ otyp?: number, oclass?: number, quan?: number, in_use?: number, dknown?: number }} obj
 * @returns {Promise<number>} extra damage (C dmg_out); hero lava ignores return value
 */
async function maybeDestroyItemHeroFire(g, obj) {
    const u = g.u;
    if (!u) return 0;
    if (inventoryResistanceCheckHeroLikeC(g, AD_FIRE)) return 0;

    const t = obj.otyp | 0;
    if (t === OTYP_SPE_BOOK_OF_THE_DEAD) {
        const blind = !!(u.ublind | 0) || (u.timed?.blind ?? 0) > 0;
        if (!blind) {
            await pline(
                'The Book of the Dead glows a strange dark red, but remains intact.',
            );
        }
        return 0;
    }

    const origQuan = obj.quan ?? 1;
    let quan = Math.max(1, origQuan);
    if (obj.in_use | 0) quan -= 1;

    const fireRes = !!(u.Fire_resistance | 0);
    let dindx = 0;
    let dmg = 0;
    const oc = nh5HeroObjectClass(obj);

    if (oc === NH5_POTION_CLASS) {
        dindx = t === OTYP_POT_OIL ? DS_BOIL_OIL : DS_BOIL_POTION;
        dmg = rnd(6);
    } else if (oc === NH5_SCROLL_CLASS) {
        dindx = DS_BURN_SCROLL;
        dmg = 1;
    } else if (oc === NH5_SPBOOK_CLASS) {
        dindx = DS_BURN_SPELLBOOK;
        dmg = 1;
    } else {
        return 0;
    }

    const xresist =
        oc !== NH5_POTION_CLASS && fireRes;

    let cnt = 0;
    for (let i = 0; i < quan; i++) if (!rn2(3)) cnt++;
    if (!cnt) return 0;

    if (oc === NH5_SCROLL_CLASS && (obj.dknown | 0)) {
        discoverScrollOtyp(g, t);
    }

    const str = DESTROY_STRINGS[dindx];
    const verbIdx = cnt > 1 ? 1 : 0;
    const verb = str[verbIdx] || str[0];
    let mult = '';
    if (cnt === 1 && quan === 1) mult = 'Your ';
    else if (cnt === 1) mult = 'One of your ';
    else if (cnt < quan) mult = 'Some of your ';
    else if (quan === 2) mult = 'Both of your ';
    else mult = 'All of your ';
    const base = objShortPhrase(obj);
    const noun = cnt === 1 && quan === 1 ? base : `${base}s`;
    await pline(`${mult}${noun} ${verb}!`);

    if (oc === NH5_POTION_CLASS) {
        const ptr = raceptr(g.youmonst);
        if (!breathless(ptr) || haseyes(ptr)) {
            await potionbreatheObjBreakLikeC(g, obj);
        }
    }

    if ((obj.owornmask | 0) !== 0) {
        if ((obj.owornmask | 0) & W_RING) ringGoneHeroLikeC(g, obj);
        else setnotwornHeroMinimalLikeC(g, obj);
    }

    const newQuan = origQuan - cnt;
    if (newQuan <= 0) removeObjFromHeroInvent(g, obj);
    else obj.quan = newQuan;
    if (g.iflags?.perm_invent) updateInventory();

    if (dmg && !xresist) {
        const how = str[2];
        const one = cnt === 1;
        const killer = one ? how : `${how}s`;
        losehp(dmg, killer, one ? KILLED_BY_AN : KILLED_BY);
        exercise(A_STR, false);
    }
    return dmg;
}

/**
 * C: zap.c **`maybe_destroy_item(&youmonst, obj, AD_COLD)`** — no potionbreathe (**`dmgtyp != AD_COLD`** in C).
 * @param {typeof game} g
 * @param {object} obj
 * @returns {Promise<number>}
 */
async function maybeDestroyItemHeroCold(g, obj) {
    const u = g.u;
    if (!u || !obj) return 0;
    if (inventoryResistanceCheckHeroLikeC(g, AD_COLD)) return 0;

    const oc = nh5HeroObjectClass(obj);
    if (oc !== NH5_POTION_CLASS) return 0;
    if ((obj.otyp | 0) === OTYP_POT_OIL) return 0;

    const origQuan = obj.quan ?? 1;
    let quan = Math.max(1, origQuan);
    if (obj.in_use | 0) quan -= 1;

    const dindx = DS_FREEZE_POTION;
    const dmg = rnd(4);
    const xresist = 0;

    let cnt = 0;
    for (let i = 0; i < quan; i++) if (!rn2(3)) cnt++;
    if (!cnt) return 0;

    const str = DESTROY_STRINGS[dindx];
    const verbIdx = cnt > 1 ? 1 : 0;
    const verb = str[verbIdx] || str[0];
    let mult = '';
    if (cnt === 1 && quan === 1) mult = 'Your ';
    else if (cnt === 1) mult = 'One of your ';
    else if (cnt < quan) mult = 'Some of your ';
    else if (quan === 2) mult = 'Both of your ';
    else mult = 'All of your ';
    const base = objShortPhrase(obj);
    const noun = cnt === 1 && quan === 1 ? base : `${base}s`;
    await pline(`${mult}${noun} ${verb}!`);

    if ((obj.owornmask | 0) !== 0) {
        if ((obj.owornmask | 0) & W_RING) ringGoneHeroLikeC(g, obj);
        else setnotwornHeroMinimalLikeC(g, obj);
    }

    const newQuan = origQuan - cnt;
    if (newQuan <= 0) removeObjFromHeroInvent(g, obj);
    else obj.quan = newQuan;
    if (g.iflags?.perm_invent) updateInventory();

    if (dmg && !xresist) {
        const how = str[2];
        const one = cnt === 1;
        const killer = one ? how : `${how}s`;
        losehp(dmg, killer, one ? KILLED_BY_AN : KILLED_BY);
        exercise(A_STR, false);
    }
    return dmg;
}

/**
 * C: zap.c **`m_useup`**-style — remove **`obj`** from **`mtmp.minvent`** or decrement **`quan`**.
 * @param {object} mtmp
 * @param {object} obj
 */
function removeObjFromMonInvent(mtmp, obj) {
    if (!mtmp || !obj) return;
    if (mtmp.minvent === obj) {
        mtmp.minvent = obj.nobj ?? null;
        return;
    }
    let p = mtmp.minvent;
    while (p?.nobj) {
        if (p.nobj === obj) {
            p.nobj = obj.nobj;
            return;
        }
        p = p.nobj;
    }
}

/**
 * C: zap.c **`maybe_destroy_item(mon, obj, AD_FIRE)`** — monster carrier (**`!u_carry`**).
 * @param {typeof game} g
 * @param {object} mtmp
 * @param {object} obj
 * @param {boolean} visMon — C **`canseemon(carrier)`**
 * @returns {Promise<number>} damage to apply later (**`xtradmg`** sum)
 */
async function maybeDestroyItemMonFire(g, mtmp, obj, visMon) {
    const u = g.u;
    if (!u || !obj) return 0;

    const t = obj.otyp | 0;
    if (t === OTYP_SPE_BOOK_OF_THE_DEAD) {
        const blind = !!(u.ublind | 0) || (u.timed?.blind ?? 0) > 0;
        if (visMon && !blind) {
            await pline(
                'The Book of the Dead glows a strange dark red, but remains intact.',
            );
        }
        return 0;
    }

    const origQuan = obj.quan ?? 1;
    let quan = Math.max(1, origQuan);
    if (obj.in_use | 0) quan -= 1;

    const fireResMon = fireResistant(raceptr(mtmp));
    let dindx = 0;
    let dmg = 0;
    const oc = nh5HeroObjectClass(obj);

    if (oc === NH5_POTION_CLASS) {
        dindx = t === OTYP_POT_OIL ? DS_BOIL_OIL : DS_BOIL_POTION;
        dmg = rnd(6);
    } else if (oc === NH5_SCROLL_CLASS) {
        dindx = DS_BURN_SCROLL;
        dmg = 1;
    } else if (oc === NH5_SPBOOK_CLASS) {
        dindx = DS_BURN_SPELLBOOK;
        dmg = 1;
    } else {
        return 0;
    }

    const xresist = oc !== NH5_POTION_CLASS && fireResMon;

    let cnt = 0;
    for (let i = 0; i < quan; i++) if (!rn2(3)) cnt++;
    if (!cnt) return 0;

    /* C: zap.c maybe_destroy_item — u_carry||vis pline uses yname; hero path + visible mon
     * learn scroll otyp when appearance was known (invent.c makeknown-style). */
    if (oc === NH5_SCROLL_CLASS && (obj.dknown | 0) && visMon) {
        discoverScrollOtyp(g, t);
    }

    const str = DESTROY_STRINGS[dindx];
    const verbIdx = cnt > 1 ? 1 : 0;
    const verb = str[verbIdx] || str[0];
    let mult = '';
    if (visMon) {
        const n = mtmp?.monnam || mtmp?.data?.mname || 'monster';
        if (cnt === 1 && quan === 1) mult = `${n}'s `;
        else if (cnt === 1) mult = `One of ${n}'s `;
        else if (cnt < quan) mult = `Some of ${n}'s `;
        else if (quan === 2) mult = `Both of ${n}'s `;
        else mult = `All of ${n}'s `;
        const base = objShortPhrase(obj);
        const noun = cnt === 1 && quan === 1 ? base : `${base}s`;
        await pline(`${mult}${noun} ${verb}!`);
    }

    const newQuan = origQuan - cnt;
    if (newQuan <= 0) removeObjFromMonInvent(mtmp, obj);
    else obj.quan = newQuan;

    if (dmg && !xresist) return dmg;
    return 0;
}

/**
 * C: zap.c **`maybe_destroy_item(mon, obj, AD_COLD)`** — monster; potions only (**`visMon`** plines).
 * @param {typeof game} g
 * @param {object} mtmp
 * @param {object} obj
 * @param {boolean} visMon
 * @returns {Promise<number>}
 */
async function maybeDestroyItemMonCold(g, mtmp, obj, visMon) {
    if (!g.u || !obj || !mtmp) return 0;

    const oc = nh5HeroObjectClass(obj);
    if (oc !== NH5_POTION_CLASS) return 0;
    if ((obj.otyp | 0) === OTYP_POT_OIL) return 0;

    const origQuan = obj.quan ?? 1;
    let quan = Math.max(1, origQuan);
    if (obj.in_use | 0) quan -= 1;

    const dindx = DS_FREEZE_POTION;
    const dmg = rnd(4);
    const xresist = 0;

    let cnt = 0;
    for (let i = 0; i < quan; i++) if (!rn2(3)) cnt++;
    if (!cnt) return 0;

    const str = DESTROY_STRINGS[dindx];
    const verbIdx = cnt > 1 ? 1 : 0;
    const verb = str[verbIdx] || str[0];
    if (visMon) {
        const n = mtmp?.monnam || mtmp?.data?.mname || 'monster';
        let mult = '';
        if (cnt === 1 && quan === 1) mult = `${n}'s `;
        else if (cnt === 1) mult = `One of ${n}'s `;
        else if (cnt < quan) mult = `Some of ${n}'s `;
        else if (quan === 2) mult = `Both of ${n}'s `;
        else mult = `All of ${n}'s `;
        const base = objShortPhrase(obj);
        const noun = cnt === 1 && quan === 1 ? base : `${base}s`;
        await pline(`${mult}${noun} ${verb}!`);
    }

    const newQuan = origQuan - cnt;
    if (newQuan <= 0) removeObjFromMonInvent(mtmp, obj);
    else obj.quan = newQuan;

    if (dmg && !xresist) return dmg;
    return 0;
}

/**
 * C: zap.c destroy_items(mon, AD_FIRE, dmg_in) — no bypass / defer (**`u_carry`** false).
 * @param {typeof game} g
 * @param {object} mtmp
 * @param {number} dmgIn
 * @param {boolean} visMon — C **`canseemon(mon)`** for destroy plines
 * @returns {Promise<number>}
 */
export async function destroyItemsMonFire(g, mtmp, dmgIn, visMon) {
    const dmg0 = dmgIn | 0;
    let limit = Math.trunc(dmg0 / DMG_DESTROY_SCALE);
    if (dmg0 % DMG_DESTROY_SCALE > rn2(DMG_DESTROY_SCALE)) limit++;
    if (limit > MAX_ITEMS_DESTROYED) limit = MAX_ITEMS_DESTROYED;
    if (limit < 1) return 0;

    const chain = mtmp?.minvent;
    if (!chain) return 0;

    /** @type {Array<{ ref: object | null, deferred: boolean } | undefined>} */
    const slots = [];
    let eligStacks = 0;

    for (let o = chain; o; o = o.nobj) {
        if (!destroyableHeroFire(o)) continue;
        const i = eligStacks < limit ? eligStacks : rn2(eligStacks);
        eligStacks++;
        if (i < 0 || i >= limit) continue;
        slots[i] = { ref: o, deferred: false };
    }
    if (eligStacks > limit) eligStacks = limit;

    let dmgOut = 0;
    for (let i = 0; i < eligStacks; i++) {
        const slot = slots[i];
        const o = slot?.ref;
        if (o && !slot.deferred) dmgOut += await maybeDestroyItemMonFire(g, mtmp, o, visMon);
    }
    return dmgOut;
}

/**
 * C: zap.c **`destroy_items(mon, AD_COLD, dmg_in)`** — same limit/slot selection as **`AD_FIRE`**.
 * @param {typeof game} g
 * @param {object} mtmp
 * @param {number} dmgIn
 * @param {boolean} visMon
 * @returns {Promise<number>}
 */
export async function destroyItemsMonCold(g, mtmp, dmgIn, visMon) {
    const dmg0 = dmgIn | 0;
    let limit = Math.trunc(dmg0 / DMG_DESTROY_SCALE);
    if (dmg0 % DMG_DESTROY_SCALE > rn2(DMG_DESTROY_SCALE)) limit++;
    if (limit > MAX_ITEMS_DESTROYED) limit = MAX_ITEMS_DESTROYED;
    if (limit < 1) return 0;

    const chain = mtmp?.minvent;
    if (!chain) return 0;

    /** @type {Array<{ ref: object | null, deferred: boolean } | undefined>} */
    const slots = [];
    let eligStacks = 0;

    for (let o = chain; o; o = o.nobj) {
        if (!destroyableHeroCold(o)) continue;
        const i = eligStacks < limit ? eligStacks : rn2(eligStacks);
        eligStacks++;
        if (i < 0 || i >= limit) continue;
        slots[i] = { ref: o, deferred: false };
    }
    if (eligStacks > limit) eligStacks = limit;

    let dmgOut = 0;
    for (let i = 0; i < eligStacks; i++) {
        const slot = slots[i];
        const o = slot?.ref;
        if (o && !slot.deferred) dmgOut += await maybeDestroyItemMonCold(g, mtmp, o, visMon);
    }
    return dmgOut;
}

/**
 * C: zap.c destroy_items(&gy.youmonst, AD_FIRE, dmg_in) — bypass/deferred paths omitted;
 * second-pass verification uses object identity (no **`o_id`** yet).
 * @param {typeof game} [g]
 * @param {number} dmgIn — e.g. **`trap.c`** **`lava_effects`** **`d(6,6)`** roll
 * @returns {Promise<number>} summed extra damage from destroyed potions (C return value)
 */
export async function destroyItemsYoumonstFire(g = game, dmgIn) {
    const dmg0 = dmgIn | 0;
    let limit = Math.trunc(dmg0 / DMG_DESTROY_SCALE);
    if (dmg0 % DMG_DESTROY_SCALE > rn2(DMG_DESTROY_SCALE)) limit++;
    if (limit > MAX_ITEMS_DESTROYED) limit = MAX_ITEMS_DESTROYED;
    if (limit < 1) return 0;

    const chain = g.invent;
    if (!chain) return 0;

    /** @type {Array<{ ref: object | null, deferred: boolean } | undefined>} */
    const slots = [];
    let eligStacks = 0;

    for (let o = chain; o; o = o.nobj) {
        if (!destroyableHeroFire(o)) continue;
        const i = eligStacks < limit ? eligStacks : rn2(eligStacks);
        eligStacks++;
        if (i < 0 || i >= limit) continue;
        slots[i] = { ref: o, deferred: false };
    }
    if (eligStacks > limit) eligStacks = limit;

    let dmgOut = 0;
    for (let i = 0; i < eligStacks; i++) {
        const slot = slots[i];
        const o = slot?.ref;
        if (o && !slot.deferred) dmgOut += await maybeDestroyItemHeroFire(g, o);
    }
    return dmgOut;
}

/**
 * C: zap.c **`destroy_items(&gy.youmonst, AD_COLD, dmg_in)`** — non-oil potions; bypass/deferred omitted.
 * @param {typeof game} [g]
 * @param {number} dmgIn
 * @returns {Promise<number>}
 */
export async function destroyItemsYoumonstCold(g = game, dmgIn) {
    const dmg0 = dmgIn | 0;
    let limit = Math.trunc(dmg0 / DMG_DESTROY_SCALE);
    if (dmg0 % DMG_DESTROY_SCALE > rn2(DMG_DESTROY_SCALE)) limit++;
    if (limit > MAX_ITEMS_DESTROYED) limit = MAX_ITEMS_DESTROYED;
    if (limit < 1) return 0;

    const chain = g.invent;
    if (!chain) return 0;

    /** @type {Array<{ ref: object | null, deferred: boolean } | undefined>} */
    const slots = [];
    let eligStacks = 0;

    for (let o = chain; o; o = o.nobj) {
        if (!destroyableHeroCold(o)) continue;
        const i = eligStacks < limit ? eligStacks : rn2(eligStacks);
        eligStacks++;
        if (i < 0 || i >= limit) continue;
        slots[i] = { ref: o, deferred: false };
    }
    if (eligStacks > limit) eligStacks = limit;

    let dmgOut = 0;
    for (let i = 0; i < eligStacks; i++) {
        const slot = slots[i];
        const o = slot?.ref;
        if (o && !slot.deferred) dmgOut += await maybeDestroyItemHeroCold(g, o);
    }
    return dmgOut;
}

/** C: objclass.h **`IRON`…`MITHRIL`** — **`is_metallic`** subset for gloves vs ring shock. */
function isMetallicMaterialElec(m) {
    const x = m | 0;
    return x >= 11 && x <= 17;
}

/**
 * C: zap.c **`destroyable(obj, AD_ELEC)`** — rings except shock; wands except lightning.
 * @param {{ otyp?: number, oclass?: number, quan?: number, in_use?: number, oartifact?: number }} obj
 */
function destroyableHeroElec(obj) {
    if (!obj) return false;
    if (obj.oartifact | 0) return false;
    const quan = obj.quan ?? 1;
    if ((obj.in_use | 0) && quan <= 1) return false;
    const oc = nh5HeroObjectClass(obj);
    const t = obj.otyp | 0;
    if (oc === NH5_RING_CLASS) return t !== OTYP_RIN_SHOCK_RESISTANCE;
    if (oc === NH5_WAND_CLASS) return t !== WAN_LIGHTNING;
    return false;
}

/**
 * C: read.c **`recharge(obj, 0)`** — **`RING_CLASS`** **`oc_charged`** branch only (**`curse_bless`** 0).
 * @param {typeof game} g
 */
async function rechargeRingHeroElecLikeC(g, obj) {
    const u = g.u;
    if (!u || !obj) return;
    const spe = obj.spe | 0;
    if (spe > rn2(7) || spe <= -5) {
        await pline(`Your ${objShortPhrase(obj)} momentarily pulsates, then explodes!`);
        const isOn = obj === u.uleft || obj === u.uright;
        if (isOn) {
            if (u.uleft === obj) u.uleft = null;
            if (u.uright === obj) u.uright = null;
            obj.owornmask = 0;
        }
        const dam = rnd(3 * Math.max(1, Math.abs(spe)));
        removeObjFromHeroInvent(g, obj);
        losehp(maybeHalfPhys(dam), 'exploding ring', KILLED_BY_AN);
        exercise(A_STR, false);
        if (g.iflags?.perm_invent) updateInventory();
    } else {
        await pline(`Your ${objShortPhrase(obj)} spins clockwise for a moment.`);
        obj.spe = (obj.spe | 0) + 1;
        if (g.iflags?.perm_invent) updateInventory();
    }
}

/**
 * C: zap.c **`maybe_destroy_item(mon, obj, AD_ELEC)`** — hero only; **`inventoryResistanceCheckHeroLikeC`**;
 * worn ring dust → **`ringGoneHeroLikeC`**; other worn **`setnotwornHeroMinimalLikeC`** before **`useup`**.
 * @param {typeof game} g
 */
async function maybeDestroyItemHeroElec(g, obj) {
    const u = g.u;
    if (!u || !obj) return 0;
    if (inventoryResistanceCheckHeroLikeC(g, AD_ELEC)) return 0;

    const oc = nh5HeroObjectClass(obj);
    let xresist = 0;
    let skip = 0;
    let dindx = 0;
    let dmg = 0;
    let chargeit = false;

    xresist = oc !== NH5_RING_CLASS && !!(u.Shock_resistance | 0);

    const origQuan = obj.quan ?? 1;
    let quan = Math.max(1, origQuan);
    if (obj.in_use | 0) quan -= 1;

    if (oc === NH5_RING_CLASS) {
        const wm = obj.owornmask | 0;
        const gl = u.uarmg;
        if ((wm & W_RING) && gl && !isMetallicMaterialElec(gl.oc_material | 0)) skip++;
        else if ((obj.otyp | 0) === OTYP_RIN_SHOCK_RESISTANCE) skip++;
        else if (OC_CHARGED_RING_OTYPES.has(obj.otyp | 0) && rn2(3)) chargeit = true;
        else {
            dindx = DS_SHOCK_RING;
            dmg = 0;
        }
    } else if (oc === NH5_WAND_CLASS) {
        dindx = DS_EXPLODE_WAND;
        dmg = rnd(10);
    } else {
        skip++;
    }

    if (chargeit) {
        await rechargeRingHeroElecLikeC(g, obj);
        return 0;
    }
    if (skip) return 0;

    let cnt = 0;
    for (let i = 0; i < quan; i++) if (!rn2(3)) cnt++;
    if (!cnt) return 0;

    const str = DESTROY_STRINGS[dindx];
    const verbIdx = cnt > 1 ? 1 : 0;
    const verb = str[verbIdx] || str[0];
    let mult = '';
    if (cnt === 1 && quan === 1) mult = 'Your ';
    else if (cnt === 1) mult = 'One of your ';
    else if (cnt < quan) mult = 'Some of your ';
    else if (quan === 2) mult = 'Both of your ';
    else mult = 'All of your ';
    const base = objShortPhrase(obj);
    const noun = cnt === 1 && quan === 1 ? base : `${base}s`;
    await pline(`${mult}${noun} ${verb}!`);

    if ((obj.owornmask | 0) !== 0) {
        if ((obj.owornmask | 0) & W_RING) ringGoneHeroLikeC(g, obj);
        else setnotwornHeroMinimalLikeC(g, obj);
    }

    const newQuan = origQuan - cnt;
    if (newQuan <= 0) removeObjFromHeroInvent(g, obj);
    else obj.quan = newQuan;
    if (g.iflags?.perm_invent) updateInventory();

    if (dmg && !xresist) {
        const how = str[2];
        if (how) {
            const one = cnt === 1;
            const killer = one ? how : `${how}s`;
            losehp(dmg, killer, one ? KILLED_BY_AN : KILLED_BY);
            exercise(A_STR, false);
        }
    }
    return dmg;
}

/**
 * C: zap.c **`destroy_items(&gy.youmonst, AD_ELEC, dmg_in)`** — bypass/deferred omitted.
 * @param {typeof game} [g]
 * @param {number} dmgIn
 * @returns {Promise<number>}
 */
export async function destroyItemsYoumonstElec(g = game, dmgIn) {
    const dmg0 = dmgIn | 0;
    let limit = Math.trunc(dmg0 / DMG_DESTROY_SCALE);
    if (dmg0 % DMG_DESTROY_SCALE > rn2(DMG_DESTROY_SCALE)) limit++;
    if (limit > MAX_ITEMS_DESTROYED) limit = MAX_ITEMS_DESTROYED;
    if (limit < 1) return 0;

    const chain = g.invent;
    if (!chain) return 0;

    /** @type {Array<{ ref: object | null, deferred: boolean } | undefined>} */
    const slots = [];
    let eligStacks = 0;

    for (let o = chain; o; o = o.nobj) {
        if (!destroyableHeroElec(o)) continue;
        const i = eligStacks < limit ? eligStacks : rn2(eligStacks);
        eligStacks++;
        if (i < 0 || i >= limit) continue;
        slots[i] = { ref: o, deferred: false };
    }
    if (eligStacks > limit) eligStacks = limit;

    let dmgOut = 0;
    for (let i = 0; i < eligStacks; i++) {
        const slot = slots[i];
        const o = slot?.ref;
        if (o && !slot.deferred) dmgOut += await maybeDestroyItemHeroElec(g, o);
    }
    return dmgOut;
}
