// fire_damage.js — trap.c fire_damage() / fire_damage_chain() subset (hero + monster invent).
// C ref: trap.c fire_damage(), fire_damage_chain(); do.c flooreffects() → lava_damage() (subset);
// apply.c catch_lit() — monster minvent uses **`ignitableAmbientFire`** + **`rn2(2)`** cursed lamp.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { pline } from './display.js';
import { cansee, couldsee } from './vision.js';
import {
    heroLuck,
    nh5HeroObjectClass,
    isContainerOtyp,
    removeObjFromHeroInvent,
    removeObjFromMinvent,
    waterDamageObjPhrase,
    ER_DESTROYED,
} from './water_damage.js';
import { NH5_POTION_CLASS, NH5_SCROLL_CLASS, NH5_SPBOOK_CLASS } from './nh5_objclass.js';
import { updateInventory } from './invent.js';
import { erodeObjBurnWithEfDestroy } from './erode_obj.js';
import { catchLitObjMinimal, ignitableAmbientFire } from './ignite_items.js';
import { placeFloorObject, obliterateObjectInLevel } from './floorobj.js';
import { Has_contents, IS_LAVA, FIRE_RES } from './const.js';
import { WAN_FIRE } from './buzz.js';

/** C: mklev.js / objects.h — **`STATUE`**. */
const OTYP_STATUE = 472;
const OTYP_ICE_BOX = 217;
const OTYP_CHEST = 216;
const OTYP_LARGE_BOX = 215;
const OTYP_SCR_FIRE = 338;
const OTYP_SPE_FIREBALL = 368;
const OTYP_SPE_BOOK_OF_THE_DEAD = 408;
const OTYP_POT_OIL = 320;
const OTYP_FIRE_HORN = 252;
const OTYP_BRASS_LANTERN = 227;
const OTYP_OIL_LAMP = 228;
const OTYP_MAGIC_LAMP = 229;
const OTYP_TALLOW_CANDLE = 225;
const OTYP_WAX_CANDLE = 226;

/** C: include/objclass.h — **`DRAGON_HIDE`** (materials **<** this may **`lava_damage`**-burn). */
const DRAGON_HIDE_MAT = 10;

/** C: zap.c **`destroy_strings`** rows for **`AD_FIRE`** scroll / book / potion (**`fire_damage`**). */
const DS_BOIL_POTION = 1;
const DS_BOIL_OIL = 2;
const DS_BURN_SCROLL = 3;
const DS_BURN_SPELLBOOK = 4;

const DESTROY_STRINGS = [
    ['freezes and shatters', 'freeze and shatter', 'shattered potion'],
    ['boils and explodes', 'boil and explode', 'boiling potion'],
    ['ignites and explodes', 'ignite and explode', 'exploding potion'],
    ['catches fire and burns', 'catch fire and burn', 'burning scroll'],
    ['catches fire and burns', 'catch fire and burn', 'burning book'],
];

/**
 * C: zap.c **`obj_resists(obj, 0, 0)`** — artifacts survive **`lava_damage`** except Book (**subset**).
 * @param {{ oartifact?: number, otyp?: number }} obj
 */
function objResistsArtifactLikeC(obj) {
    return !!(obj?.oartifact | 0);
}

/**
 * C: trap.c **`lava_damage()`** — instant burn vs **`fire_damage(..., TRUE)`** tail (**subset**).
 * @param {typeof game} g
 * @returns {Promise<boolean>} **true** if object destroyed / consumed
 */
async function lavaDamageDisplaced(g, obj, x, y) {
    if (!obj) return false;
    const t = obj.otyp | 0;
    if (objResistsArtifactLikeC(obj) && t !== OTYP_SPE_BOOK_OF_THE_DEAD) return false;

    const mat = obj.oc_material | 0;
    const ocls = nh5HeroObjectClass(obj);
    if (
        mat > 0 &&
        mat < DRAGON_HIDE_MAT &&
        ocls !== NH5_SCROLL_CLASS &&
        ocls !== NH5_SPBOOK_CLASS &&
        (obj.oc_oprop | 0) !== FIRE_RES &&
        t !== WAN_FIRE &&
        t !== OTYP_FIRE_HORN &&
        !(obj.oerodeproof | 0) &&
        !Has_contents(obj)
    ) {
        if (cansee(x, y)) {
            const blind = !!(g.u?.ublind | 0) || (g.u?.timed?.blind ?? 0) > 0;
            const ph = waterDamageObjPhrase(obj);
            if (blind) await pline('Something burns up!');
            else await pline(`You see ${ph} hit lava and burn up!`);
        }
        obliterateObjectInLevel(g, obj);
        return true;
    }

    return fireDamageOne(obj, true, g, x, y, null, { skipCatchLit: true });
}

/**
 * C: **`do.c`** **`flooreffects`** → **`trap.c`** **`lava_damage`** (**`lavaDamageDisplaced`**).
 * @param {import('./gstate.js').game} g
 * @returns {Promise<boolean>} true if object destroyed
 */
export async function lavaDamageFromFlooreffectsLikeC(g, obj, x, y) {
    return lavaDamageDisplaced(g, obj, x, y);
}

/**
 * C: apply.c **`catch_lit`** for **`OBJ_MINVENT`** — **`cansee(mx,my)`** drives feedback (**subset**).
 * @param {typeof game} g
 * @param {{ lamplit?: number, otyp?: number, spe?: number, cursed?: number, age?: number }} obj
 */
async function catchLitMinventFire(g, obj, visMon) {
    if (!obj || (obj.lamplit | 0)) return false;
    if (!ignitableAmbientFire(obj)) return false;
    const t = obj.otyp | 0;
    const spe = obj.spe | 0;
    if (t === OTYP_BRASS_LANTERN) return false;
    if (t === OTYP_MAGIC_LAMP && spe === 0) return false;
    if ((t === OTYP_WAX_CANDLE || t === OTYP_TALLOW_CANDLE) && obj.age != null && (obj.age | 0) === 0)
        return false;
    if ((t === OTYP_OIL_LAMP || t === OTYP_MAGIC_LAMP) && (obj.cursed | 0) && !rn2(2)) return false;

    const blind = !!(g.u?.ublind | 0) || (g.u?.timed?.blind ?? 0) > 0;
    const base = waterDamageObjPhrase(obj);
    if (visMon && !blind) await pline(`The ${base} catches light!`);
    else if (visMon && blind) await pline(`The ${base} feels warm.`);
    obj.lamplit = 1;
    return true;
}

function monPossessivePrefix(mtmp) {
    const n = mtmp?.monnam || mtmp?.data?.mname || 'monster';
    return `${n}'s`;
}

/**
 * C: trap.c **`fire_damage(obj, force, x, y)`** — **returns true** if **`delobj`** destroyed the object.
 * @param {typeof game} g
 * @param {{ mtmp?: object, visMon?: boolean }|null} [monCtx] — monster **`minvent`** when set
 * @param {{ skipCatchLit?: boolean }} [opts] — **`lavaDamageDisplaced`** → **`fire_damage(TRUE)`** (no **`catch_lit`**)
 */
export async function fireDamageOne(obj, force, g, x, y, monCtx = null, opts = null) {
    if (!obj) return false;

    const u = g.u;
    const blind = !!(u?.ublind | 0) || (u?.timed?.blind ?? 0) > 0;
    const inSight = !blind && couldsee(x, y);

    if (!opts?.skipCatchLit) {
        if (!monCtx) {
            if (await catchLitObjMinimal(g, obj)) return false;
        } else if (await catchLitMinventFire(g, obj, !!monCtx.visMon)) {
            return false;
        }
    }

    const t = obj.otyp | 0;

    if (isContainerOtyp(t) || t === OTYP_STATUE) {
        if (t === OTYP_STATUE || t === OTYP_ICE_BOX) return false;
        let chance = 20;
        if (t === OTYP_CHEST) chance = 40;
        else if (t === OTYP_LARGE_BOX) chance = 30;
        if (!force && heroLuck(g) + 5 > rn2(chance)) return false;

        const ph = waterDamageObjPhrase(obj);
        if (inSight) {
            if (!monCtx) await pline(`Your ${ph} catches fire and burns.`);
            else if (monCtx.visMon) await pline(`The ${ph} catches fire and burns.`);
        }
        if (Has_contents(obj)) {
            if (inSight) await pline('Its contents fall out.');
            let c = obj.cobj;
            obj.cobj = null;
            while (c) {
                const nx = c.nobj;
                c.nobj = null;
                c.ocontainer = undefined;
                const loc = g.level?.at(x, y);
                if (loc && IS_LAVA(loc.typ | 0)) await lavaDamageDisplaced(g, c, x, y);
                else placeFloorObject(c, x, y);
                c = nx;
            }
        }
        if (monCtx?.mtmp) {
            clearMonWornIf(monCtx.mtmp, obj);
            removeObjFromMinvent(monCtx.mtmp, obj);
        } else {
            removeObjFromHeroInvent(g, obj);
            if (g.iflags?.perm_invent) updateInventory();
        }
        return true;
    }

    if (!force && heroLuck(g) + 5 > rn2(20)) return false;

    const oc = nh5HeroObjectClass(obj);
    if (oc === NH5_SCROLL_CLASS || oc === NH5_SPBOOK_CLASS) {
        if (t === OTYP_SCR_FIRE || t === OTYP_SPE_FIREBALL) return false;
        if (t === OTYP_SPE_BOOK_OF_THE_DEAD) {
            if (inSight) await pline('Smoke rises from the Book of the Dead.');
            return false;
        }
        const dindx = oc === NH5_SCROLL_CLASS ? DS_BURN_SCROLL : DS_BURN_SPELLBOOK;
        const qi = (obj.quan ?? 1) > 1 ? 1 : 0;
        const verb = DESTROY_STRINGS[dindx][qi] || DESTROY_STRINGS[dindx][0];
        if (inSight) {
            if (!monCtx) await pline(`Your ${waterDamageObjPhrase(obj)} ${verb}.`);
            else if (monCtx.visMon) {
                const poss = monPossessivePrefix(monCtx.mtmp);
                await pline(`${poss} ${waterDamageObjPhrase(obj)} ${verb}.`);
            }
        }
        if (monCtx?.mtmp) {
            clearMonWornIf(monCtx.mtmp, obj);
            removeObjFromMinvent(monCtx.mtmp, obj);
        } else {
            removeObjFromHeroInvent(g, obj);
            if (g.iflags?.perm_invent) updateInventory();
        }
        return true;
    }

    if (oc === NH5_POTION_CLASS) {
        const dindx = t === OTYP_POT_OIL ? DS_BOIL_OIL : DS_BOIL_POTION;
        const qi = (obj.quan ?? 1) > 1 ? 1 : 0;
        const verb = DESTROY_STRINGS[dindx][qi] || DESTROY_STRINGS[dindx][0];
        if (inSight) {
            if (!monCtx) await pline(`Your ${waterDamageObjPhrase(obj)} ${verb}.`);
            else if (monCtx.visMon) {
                const poss = monPossessivePrefix(monCtx.mtmp);
                await pline(`${poss} ${waterDamageObjPhrase(obj)} ${verb}.`);
            }
        }
        if (monCtx?.mtmp) {
            clearMonWornIf(monCtx.mtmp, obj);
            removeObjFromMinvent(monCtx.mtmp, obj);
        } else {
            removeObjFromHeroInvent(g, obj);
            if (g.iflags?.perm_invent) updateInventory();
        }
        return true;
    }

    const er = await erodeObjBurnWithEfDestroy(obj, '', g, monCtx);
    return er === ER_DESTROYED;
}

function clearMonWornIf(mtmp, otmp) {
    const w = mtmp?.mworn;
    if (!w) return;
    for (const k of Object.keys(w)) {
        if (w[k] === otmp) w[k] = null;
    }
}

/**
 * C: trap.c **`fire_damage_chain(chain, force, here, x, y)`** — walk **`nobj`** or **`nexthere`**.
 * @param {typeof game} [g]
 * @param {{ mtmp?: object, visMon?: boolean }} [monCtx] — when set, removals use **`removeObjFromMinvent`**
 */
export async function fireDamageChain(chain, force, here, x, y, g = game, monCtx = null) {
    if (!chain) return 0;

    g.gb = g.gb || {};
    const prev = g.gb.bhitpos;
    g.gb.bhitpos = { x, y };

    let num = 0;
    for (let o = chain; o; ) {
        const next = here ? o.nexthere : o.nobj;
        if (await fireDamageOne(o, force, g, x, y, monCtx)) num++;
        o = next;
    }

    g.gb.bhitpos = prev;

    const u = g.u;
    if (num && u && blindLikeC(u) && !couldsee(x, y)) await pline('You smell smoke.');
    return num;
}

function blindLikeC(u) {
    return !!(u?.ublind | 0) || (u?.timed?.blind ?? 0) > 0;
}
