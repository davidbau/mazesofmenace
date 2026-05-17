// ignite_items.js — Light ignitable carried/floor objects from ambient fire (trap.c subset).
// C ref: trap.c ignite_items(); apply.c catch_lit() — begin_burn / shop / snuff_candle / brass
// nuance mostly stubbed; get_obj_location / costly_spot / Blind wording aligned in spirit.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { pline } from './display.js';
import { updateInventory } from './invent.js';
import { OC_SKILL_ROW_BY_OTYP } from './obj_oc_skill_data.js';

const OTYP_TALLOW_CANDLE = 225;
const OTYP_WAX_CANDLE = 226;
const OTYP_BRASS_LANTERN = 227;
const OTYP_OIL_LAMP = 228;
const OTYP_MAGIC_LAMP = 229;
const OTYP_POT_OIL = 320;

/**
 * C: obj.h **`ignitable(otmp)`** — NH5 **`otyp`** (subset; **`CANDELABRUM_OF_INVOCATION`** when wired);
 * shared by **`catch_lit`** / **`ignite_items`** / **`fire_damage`**.
 * @param {{ otyp?: number, spe?: number }} obj
 */
export function ignitableAmbientFire(obj) {
    const t = obj.otyp | 0;
    const spe = obj.spe | 0;
    if (t === OTYP_TALLOW_CANDLE || t === OTYP_WAX_CANDLE) return true;
    if (t === OTYP_BRASS_LANTERN || t === OTYP_OIL_LAMP) return true;
    if (t === OTYP_MAGIC_LAMP && spe > 0) return true;
    if (t === OTYP_POT_OIL) return true;
    return false;
}

function ignitableHero(obj) {
    return ignitableAmbientFire(obj);
}

function phraseTyp(obj) {
    const row = OC_SKILL_ROW_BY_OTYP.get(obj.otyp | 0);
    if (row) return row.name.toLowerCase().replace(/_/g, ' ');
    return 'item';
}

/**
 * C: apply.c catch_lit(obj) — hero inventory / seen floor; **`begin_burn(obj, FALSE)`** stubbed as **`lamplit`**.
 * @param {typeof game} g
 * @param {{ otyp?: number, spe?: number, cursed?: number, lamplit?: number, in_use?: number, age?: number }} obj
 * @returns {Promise<boolean>}
 */
export async function catchLitObjMinimal(g, obj) {
    const u = g.u;
    if (!u || !obj) return false;
    if (obj.lamplit | 0) return false;
    if (obj.in_use | 0) return false;
    if (!ignitableHero(obj)) return false;

    const t = obj.otyp | 0;
    const spe = obj.spe | 0;

    /* C: brass lantern not lit by ambient fire */
    if (t === OTYP_BRASS_LANTERN) return false;
    /* C: magic lamp spe==0 (wished) — not ignited */
    if (t === OTYP_MAGIC_LAMP && spe === 0) return false;
    /* C: age_is_relative && age==0 — out of fuel (candles); omit until burn timers exist */
    if ((t === OTYP_WAX_CANDLE || t === OTYP_TALLOW_CANDLE) && obj.age != null && (obj.age | 0) === 0)
        return false;

    if (
        (t === OTYP_OIL_LAMP || t === OTYP_MAGIC_LAMP) &&
        (obj.cursed | 0) &&
        !rn2(2)
    ) {
        return false;
    }

    const blind = !!(u.ublind | 0) || (u.timed?.blind ?? 0) > 0;
    const base = phraseTyp(obj);
    if (blind) await pline(`Your ${base} feels warm.`);
    else await pline(`Your ${base} catches light!`);

    /* C: begin_burn(obj, FALSE) — lantern/candle age, **`snuff_candle`**, brass split — stub */
    obj.lamplit = 1;
    if (g.iflags?.perm_invent) updateInventory();
    return true;
}

/**
 * C: trap.c ignite_items(objchn) — walk **`nobj`** (hero invent) or **`nexthere`** (floor); if not
 * **`lamplit`** and not **`in_use`**, **`catch_lit`**.
 * @param {typeof game} g
 * @param {unknown} objchn
 * @param {{ here?: boolean }} [opts] — **`here`** true → **`nexthere`** chain (floor pile)
 */
export async function igniteItemsChain(g = game, objchn, opts = {}) {
    const here = !!opts.here;
    let o = objchn;
    while (o) {
        const next = here ? o.nexthere : o.nobj;
        if (!(o.lamplit | 0) && !(o.in_use | 0)) await catchLitObjMinimal(g, o);
        o = next;
    }
}

/** C: `ignite_items(gi.invent)` after lava **`burn_stuff`**. */
export async function igniteHeroInventory(g = game) {
    await igniteItemsChain(g, g.invent, { here: false });
}

/**
 * C: apply.c **`catch_lit(obj)`** when **`obj`** is on **`mtmp.minvent`** — pline only if **`visMon`**.
 * @param {typeof game} g
 * @param {object} mtmp
 * @param {{ otyp?: number, spe?: number, cursed?: number, lamplit?: number, in_use?: number, age?: number }} obj
 * @param {boolean} visMon
 */
export async function catchLitMinventObj(g, mtmp, obj, visMon) {
    if (!mtmp || !obj) return false;
    if (obj.lamplit | 0) return false;
    if (obj.in_use | 0) return false;
    if (!ignitableHero(obj)) return false;

    const t = obj.otyp | 0;
    const spe = obj.spe | 0;

    if (t === OTYP_BRASS_LANTERN) return false;
    if (t === OTYP_MAGIC_LAMP && spe === 0) return false;
    if ((t === OTYP_WAX_CANDLE || t === OTYP_TALLOW_CANDLE) && obj.age != null && (obj.age | 0) === 0)
        return false;

    if (
        (t === OTYP_OIL_LAMP || t === OTYP_MAGIC_LAMP) &&
        (obj.cursed | 0) &&
        !rn2(2)
    ) {
        return false;
    }

    const u = g.u;
    const blind = !!(u?.ublind | 0) || (u?.timed?.blind ?? 0) > 0;
    const base = phraseTyp(obj);
    const n = mtmp?.monnam || mtmp?.data?.mname || 'monster';
    if (visMon) {
        if (blind) await pline(`${n}'s ${base} feels warm.`);
        else await pline(`${n}'s ${base} catches light!`);
    }

    obj.lamplit = 1;
    return true;
}

/**
 * C: trap.c **`ignite_items(mtmp->minvent)`** after **`destroy_items`** on fire trap.
 * @param {typeof game} g
 * @param {{ minvent?: object }} mtmp
 * @param {boolean} visMon
 */
export async function igniteMinvent(g, mtmp, visMon) {
    let o = mtmp?.minvent;
    while (o) {
        const next = o.nobj;
        if (!(o.lamplit | 0) && !(o.in_use | 0)) await catchLitMinventObj(g, mtmp, o, visMon);
        o = next;
    }
}
