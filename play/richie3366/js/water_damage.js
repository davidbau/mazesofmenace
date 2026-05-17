// water_damage.js — Hero + monster inventory wetting (trap.c water_damage / water_damage_chain subset).
// C ref: trap.c water_damage(), water_damage_chain(); apply.c splash_lit() — lantern/brass
// nuance and snuff_candle not ported. `g.acidCtx` mirrors **`ga.acid_ctx`** for **`pot_acid_damage`**
// wording during **`water_damage_chain`**; **`gb.bhitpos`** save/restore still TODO. **`erode_obj`**
// / **`makeknown`** / **`blank_novel`** partial. Monster path: C **`carried(obj)`** false — no hero **`Your`**
// plines; **`splash_lit`** minvent uses **`The cxname goes out!`** when visible.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { pline } from './display.js';
import { updateInventory } from './invent.js';
import { obliterateObjectInLevel } from './floorobj.js';
import { NH5_POTION_CLASS, NH5_SCROLL_CLASS, NH5_SPBOOK_CLASS, NH5_WAND_CLASS, NH5_ARMOR_CLASS, NH5_RING_CLASS, NH5_AMULET_CLASS } from './nh5_objclass.js';
import { OC_SKILL_ROW_BY_OTYP } from './obj_oc_skill_data.js';

/** @see include/objects.h — `SKELETON_KEY` **222** ⇒ seven **`CONTAINER`** lines **215–221**. */
const OTYP_LARGE_BOX = 215;
const OTYP_CHEST = 216;
const OTYP_ICE_BOX = 217;
const OTYP_SACK = 218;
const OTYP_OILSKIN_SACK = 219;
const OTYP_BAG_OF_HOLDING = 220;
const OTYP_BAG_OF_TRICKS = 221;
const OTYP_TOWEL = 235;
const OTYP_CAN_OF_GREASE = 241;

/** C: trap.c / do_wear.c — `water_damage` / `erode_obj` return values (subset). */
export const ER_NOTHING = 0;
export const ER_DAMAGED = 1;
export const ER_DESTROYED = 2;
export const ER_GREASED = 3;

/** C: obj.h Is_container — NH5 **`CONTAINER`** macro list. */
const CONTAINER_OTYPES = new Set([
    OTYP_LARGE_BOX,
    OTYP_CHEST,
    OTYP_ICE_BOX,
    OTYP_SACK,
    OTYP_OILSKIN_SACK,
    OTYP_BAG_OF_HOLDING,
    OTYP_BAG_OF_TRICKS,
]);

/** C: obj.h Waterproof_container — oilskin, ice box, large box, chest. */
function isWaterproofContainerTyp(otyp) {
    const t = otyp | 0;
    return t === OTYP_OILSKIN_SACK || t === OTYP_ICE_BOX || t === OTYP_LARGE_BOX || t === OTYP_CHEST;
}

export function isContainerOtyp(otyp) {
    return CONTAINER_OTYPES.has(otyp | 0);
}

/** Human-readable noun for **`Some water gets into your …`** ( **`cxname`** subset). */
const CONTAINER_PHRASE = new Map([
    [OTYP_LARGE_BOX, 'large box'],
    [OTYP_CHEST, 'chest'],
    [OTYP_ICE_BOX, 'ice box'],
    [OTYP_SACK, 'sack'],
    [OTYP_OILSKIN_SACK, 'oilskin sack'],
    [OTYP_BAG_OF_HOLDING, 'bag of holding'],
    [OTYP_BAG_OF_TRICKS, 'bag of tricks'],
]);

/** Minimal stand-in for **`cxname`** / container wording (**`trap.c`** **`hliquid`/`ostr`**). */
export function waterDamageObjPhrase(obj) {
    const t = obj.otyp | 0;
    const c = CONTAINER_PHRASE.get(t);
    if (c) return c;
    const row = OC_SKILL_ROW_BY_OTYP.get(t);
    if (row) return row.name.toLowerCase().replace(/_/g, ' ');
    return 'item';
}

/** @see include/objects.h `objects_nums` (NetHack 5.0) — potions block then scrolls then spellbooks. */
const OTYP_POT_GAIN_ABILITY = 296;
const OTYP_POT_WATER = 321;
const OTYP_POT_ACID = 319;
const OTYP_SCR_BLANK_PAPER = 365;
const OTYP_SPE_DIG = 366;
/** C: **`objects_nums`** **`SPE_BLANK_PAPER`** (NH **5.0.0** **`objclass.h`** + **`objects.h`**). */
const OTYP_SPE_BLANK_PAPER = 406;
/** C: **`SPE_NOVEL`**. */
const OTYP_SPE_NOVEL = 407;
/** C: **`SPE_BOOK_OF_THE_DEAD`** (not **`WAN_LIGHT`** **409**). */
const OTYP_SPE_BOOK_OF_THE_DEAD = 408;
const OTYP_WAND_FIRST = 409;
const OTYP_WAND_LAST = 433;
/** C: **`objects.h`** armor block — NH5 **`objects_nums`** **90..173**. */
const OTYP_ARMOR_FIRST = 90;
const OTYP_ARMOR_LAST = 173;

/**
 * C: you.h Luck + LUCKADD (subset).
 * @param {typeof game} g
 */
export function heroLuck(g) {
    const u = g.u;
    return (u?.LUCKADD ?? 0) + (u?.uluck ?? 0);
}

/**
 * NH5 object class, or inferred from **`otyp`** range when **`oclass`** unset.
 * @param {{ otyp?: number, oclass?: number }} obj
 */
export function nh5HeroObjectClass(obj) {
    if (obj.oclass != null && obj.oclass !== undefined) return obj.oclass | 0;
    const row = OC_SKILL_ROW_BY_OTYP.get(obj.otyp | 0);
    if (row) return row.oclass;
    const t = obj.otyp | 0;
    if (t >= 201 && t <= 213) return NH5_AMULET_CLASS;
    if (t >= 174 && t <= 200) return NH5_RING_CLASS;
    if (t >= OTYP_ARMOR_FIRST && t <= OTYP_ARMOR_LAST) return NH5_ARMOR_CLASS;
    if (t >= OTYP_POT_GAIN_ABILITY && t <= OTYP_POT_WATER) return NH5_POTION_CLASS;
    if (t > OTYP_POT_WATER && t <= OTYP_SCR_BLANK_PAPER) return NH5_SCROLL_CLASS;
    if (t >= OTYP_WAND_FIRST && t <= OTYP_WAND_LAST) return NH5_WAND_CLASS;
    if (t >= OTYP_SPE_DIG && t <= OTYP_SPE_BOOK_OF_THE_DEAD) return NH5_SPBOOK_CLASS;
    return -1;
}

/**
 * C: zap.c / apply.c — remove **`obj`** from **`mtmp.minvent`** (**`nobj`** chain).
 * @param {object} mtmp
 * @param {{ nobj?: unknown }} victim
 */
export function removeObjFromMinvent(mtmp, victim) {
    if (!mtmp || !victim) return;
    if (mtmp.minvent === victim) {
        mtmp.minvent = victim.nobj ?? null;
        return;
    }
    let p = mtmp.minvent;
    while (p?.nobj) {
        if (p.nobj === victim) {
            p.nobj = victim.nobj;
            return;
        }
        p = p.nobj;
    }
}

/**
 * Remove one node from **`g.invent`** singly-linked list (**`nobj`**).
 * @param {typeof game} g
 * @param {{ nobj?: unknown }} victim
 */
export function removeObjFromHeroInvent(g, victim) {
    let prev = /** @type {{ nobj?: unknown } | null} */ (null);
    for (let o = g.invent; o; o = o.nobj) {
        if (o === victim) {
            if (prev) prev.nobj = o.nobj;
            else g.invent = o.nobj;
            return;
        }
        prev = o;
    }
}

/**
 * C: trap.c `struct acid_ctx` on `struct g_globals` — valid only inside **`water_damage_chain`**.
 * @param {typeof game} g
 */
function acidCtx(g) {
    if (!g.acidCtx) g.acidCtx = { ctx_valid: false, dkn_boom: 0, unk_boom: 0 };
    return g.acidCtx;
}

/**
 * C: trap.c pot_acid_damage() — explode plines + **`delobj`**; **`ga.acid_ctx`** drives A vs Another / Some vs More.
 * @param {typeof game} g
 * @param {{ quan?: number, dknown?: number }} obj
 * @param {boolean} described — C: grease washed off first (**`pline_The` "potion… explode"**)
 * @param {object|null} [carrierMon] — C: `!carried(obj)` → remove from **`mtmp.minvent`**
 * @param {{ floorPool?: boolean }|null} [monCtx] — **`do.c`** **`flooreffects`** pool: free object (**`obliterateObjectInLevel`**)
 */
async function potAcidDamageMinimal(g, obj, described, carrierMon = null, monCtx = null) {
    const ctx = acidCtx(g);
    const quan = Math.max(1, obj.quan ?? 1);
    const one = quan <= 1;
    let exploded = false;
    if (ctx.ctx_valid) {
        exploded = (obj.dknown | 0) ? ctx.dkn_boom > 0 : ctx.unk_boom > 0;
    }
    if (described) {
        await pline(one ? 'The potion explodes!' : 'The potions explode!');
    } else {
        const bufp = one ? 'potion' : 'potions';
        const prefix = !exploded ? (one ? 'A ' : 'Some ') : (one ? 'Another ' : 'More ');
        const verb = one ? 'explodes' : 'explode';
        await pline(`${prefix}${bufp} ${verb}!`);
    }
    if (ctx.ctx_valid) {
        if (obj.dknown | 0) ctx.dkn_boom++;
        else ctx.unk_boom++;
    }
    const floorPool = !!(monCtx && monCtx.floorPool);
    if (carrierMon) removeObjFromMinvent(carrierMon, obj);
    else if (floorPool) obliterateObjectInLevel(g, obj);
    else removeObjFromHeroInvent(g, obj);
    if (!carrierMon && !floorPool && g.iflags?.perm_invent) updateInventory();
}

/**
 * C: apply.c splash_lit → snuff_lit — hero **`Your cxname`** vs minvent **`The cxname`** (**`Yname2`** subset).
 * @param {{ lamplit?: number, otyp?: number }} obj
 * @param {typeof game} [g]
 * @param {{ creature?: 'hero' | 'minvent', visMon?: boolean }} [litCtx] — minvent: C **`OBJ_MINVENT`** + **`cansee`**
 * @returns {Promise<boolean>} true if extinguished (C: truthy → `water_damage` returns ER_DAMAGED)
 */
export async function splashLitOne(obj, g = game, litCtx) {
    if (!obj || !(obj.lamplit | 0)) return false;
    const minv = litCtx?.creature === 'minvent';
    if (!minv) {
        await pline(`Your ${waterDamageObjPhrase(obj)} goes out!`);
    } else if (litCtx?.visMon) {
        await pline(`The ${waterDamageObjPhrase(obj)} goes out!`);
    }
    obj.lamplit = 0;
    if (!minv && g.iflags?.perm_invent) updateInventory();
    return true;
}

/**
 * C: trap.c water_damage() — order before luck: splash_lit → grease / towel / containers / waterproof;
 * then luck + scroll / spellbook / potion; else erode_obj (not ported) → ER_NOTHING.
 * @param {typeof game} g
 * @param {{ otyp?: number, oclass?: number, quan?: number, dknown?: number, odiluted?: number, spestudied?: number, blessed?: number, cursed?: number, greased?: number, spe?: number, cobj?: unknown, lamplit?: number }} obj
 * @param {boolean} force
 * @param {{ mtmp?: object, visMon?: boolean, floorPool?: boolean }|undefined} [monCtx] — hero: omit; minvent: **`mtmp`**; pool **`flooreffects`**: **`{ floorPool: true }`**
 * @returns {Promise<number>} ER_* (`ER_NOTHING` when obj null)
 */
export async function waterDamageOne(obj, force, g = game, monCtx) {
    if (!obj) return ER_NOTHING;

    const t = obj.otyp | 0;
    const inInvent = monCtx === undefined;
    const floorPool = !!(monCtx && monCtx.floorPool);
    const carrierMon = monCtx?.mtmp ?? null;
    const visMon = !!(monCtx && monCtx.visMon);

    /** @type {{ creature: 'minvent', visMon: boolean }|undefined} */
    let litSplashCtx;
    if (monCtx === undefined) {
        litSplashCtx = undefined;
    } else if (floorPool) {
        litSplashCtx = { creature: /** @type {const} */ ('minvent'), visMon: false };
    } else if (monCtx.mtmp) {
        litSplashCtx = { creature: /** @type {const} */ ('minvent'), visMon };
    } else {
        litSplashCtx = undefined;
    }

    if (await splashLitOne(obj, g, litSplashCtx)) return ER_DAMAGED;

    if (t === OTYP_CAN_OF_GREASE && (obj.spe | 0) > 0) return ER_NOTHING;

    if (t === OTYP_TOWEL && (obj.spe | 0) < 7) {
        /* C: wet_a_towel(obj, -rnd(7 - obj->spe), TRUE) — damp increases **`spe`** toward **7**. */
        const spe0 = obj.spe | 0;
        const delta = rnd(7 - spe0);
        obj.spe = Math.min(7, spe0 + delta);
        if (inInvent && g.iflags?.perm_invent) updateInventory();
        return ER_NOTHING;
    }

    if (obj.greased) {
        if (rn2(2) === 0) {
            obj.greased = 0;
            let described = false;
            if (inInvent) {
                await pline(`The grease on your ${waterDamageObjPhrase(obj)} washes off.`);
                described = true;
            }
            if (t === OTYP_POT_ACID) {
                await potAcidDamageMinimal(g, obj, described, carrierMon, monCtx);
                return ER_DESTROYED;
            }
            if (inInvent && g.iflags?.perm_invent) updateInventory();
        }
        return ER_GREASED;
    }

    const containerLeaks =
        isContainerOtyp(t) &&
        (!isWaterproofContainerTyp(t) || ((obj.cursed | 0) && !rn2(3)));
    if (containerLeaks) {
        if (inInvent) await pline(`Some water gets into your ${waterDamageObjPhrase(obj)}!`);
        if (obj.cobj) await waterDamageChain(obj.cobj, false, g, monCtx);
        return ER_DAMAGED;
    }

    if (isContainerOtyp(t) && isWaterproofContainerTyp(t)) {
        if (inInvent && !(g.u?.ublind | 0) && !(g.u?.underwater | 0)) {
            await pline(`The water cannot get into your ${waterDamageObjPhrase(obj)}.`);
            /* C: trap.c water_damage — makeknown(obj->otyp) for waterproof container (oilskin, etc.). */
            if (!(g.objectDiscovery instanceof Set)) g.objectDiscovery = new Set();
            g.objectDiscovery.add(t);
        }
        return ER_DAMAGED;
    }

    if (!force && heroLuck(g) + 5 > rn2(20)) return ER_NOTHING;

    const oclass = nh5HeroObjectClass(obj);

    if (oclass === NH5_SCROLL_CLASS) {
        if (t === OTYP_SCR_BLANK_PAPER) return ER_NOTHING;
        const q = obj.quan ?? 1;
        if (inInvent) await pline(q > 1 ? 'Your scrolls fade.' : 'Your scroll fades.');
        obj.otyp = OTYP_SCR_BLANK_PAPER;
        obj.dknown = 0;
        obj.spe = 0;
        if (inInvent && g.iflags?.perm_invent) updateInventory();
        return ER_DAMAGED;
    }

    if (oclass === NH5_SPBOOK_CLASS) {
        if (t === OTYP_SPE_BLANK_PAPER) return ER_NOTHING;
        if (t === OTYP_SPE_BOOK_OF_THE_DEAD) {
            if (inInvent) await pline('Steam rises from the Book of the Dead.');
            return ER_NOTHING;
        }
        const old = t;
        const q = obj.quan ?? 1;
        if (inInvent) await pline(q > 1 ? 'Your spellbooks fade.' : 'Your spellbook fades.');
        obj.otyp = OTYP_SPE_BLANK_PAPER;
        obj.dknown = 0;
        if ((obj.spestudied | 0) > 0 && old !== OTYP_SPE_NOVEL) obj.spestudied = rn2(obj.spestudied | 1);
        if (inInvent && g.iflags?.perm_invent) updateInventory();
        return ER_DAMAGED;
    }

    if (oclass === NH5_POTION_CLASS) {
        if (t === OTYP_POT_WATER) return ER_NOTHING;
        if (t === OTYP_POT_ACID) {
            await potAcidDamageMinimal(g, obj, false, carrierMon, monCtx);
            return ER_DESTROYED;
        }
        if ((obj.odiluted | 0) > 0) {
            if (inInvent) await pline('Your potion dilutes further.');
            obj.otyp = OTYP_POT_WATER;
            obj.dknown = 0;
            obj.blessed = 0;
            obj.cursed = 0;
            obj.odiluted = 0;
        } else {
            if (inInvent) await pline('Your potion dilutes.');
            obj.odiluted = (obj.odiluted | 0) + 1;
        }
        if (inInvent && g.iflags?.perm_invent) updateInventory();
        return ER_DAMAGED;
    }
    return ER_NOTHING;
}

/**
 * C: trap.c water_damage_chain(obj, here) — walk **`nobj`** or **`nexthere`**.
 * @param {unknown} obj chain head
 * @param {boolean} here floor pile (**`nexthere`**) vs hero invent (**`nobj`**)
 * @param {typeof game} [g]
 * @param {{ mtmp: object, visMon?: boolean }} [monCtx]
 */
export async function waterDamageChain(obj, here, g = game, monCtx) {
    if (!obj) return;

    /* C: trap.c water_damage_chain — init acid_ctx; bhitpos save/restore omitted until floor carry. */
    const ctx = acidCtx(g);
    ctx.dkn_boom = 0;
    ctx.unk_boom = 0;
    ctx.ctx_valid = true;

    for (let o = obj; o; ) {
        const next = here ? o.nexthere : o.nobj;
        await waterDamageOne(o, false, g, monCtx);
        o = next;
    }

    ctx.dkn_boom = 0;
    ctx.unk_boom = 0;
    ctx.ctx_valid = false;
}

/** C: `water_damage_chain(gi.invent, FALSE)` after pool / certain traps. */
export async function waterDamageChainHeroInventory(g = game) {
    if (!g.invent) return;
    await waterDamageChain(g.invent, false, g);
}
