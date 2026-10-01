// js/food_props.js — the objects[] FOOD_CLASS static columns, plus the two
// pure nutrition helpers that read them.
//
// C ref: include/objects.h FOOD(name, prob, delay, wt, unk, material, nutrition,
// ...) — the per-otyp { oc_delay, oc_nutrition } pair for every FOOD_CLASS otyp
// fields, so every caller must read them from this table exactly as C reads
// objects[otyp].
//
// This is a LEAF module: it imports nothing but the corpse-stat JSON, so both
// js/eat.js (the hero's own eating) and js/dogmove.js (dog_nutrition) can pull
// from it without closing an import cycle.  Keeping one copy is deliberate — a
// second transcription of this table in a second file is how the two sides
// silently drift apart.

import corpseData from './eat_corpse_data.json' with { type: 'json' };

/* Corpse nutrition (cnutrit), pack-aligned with makemon_mons.json / dogmove.js
 * MONS_CWT.  Generated from include/monsters.h SIZ() keyed by PM index. */
const MONS_CNUTRIT = /** @type {number[]} */ (corpseData.cnutrit || []);

export const CORPSE_OTYP_FP = 265;

/* [otyp] -> [oc_delay, oc_nutrition].  Transcribed leaf-for-leaf from
 * include/objects.h. */
export const FOOD_PROPS = {
    264: [2, 200],  /* tripe ration */
    265: [1, 0],    /* corpse (nutrition comes from corpsenm.cnutrit) */
    266: [1, 80],   /* egg */
    267: [1, 5],    /* meatball */
    268: [1, 5],    /* meat stick */
    269: [20, 2000],/* enormous meatball */
    270: [1, 5],    /* meat ring */
    271: [2, 20],   /* glob of gray ooze */
    272: [2, 20],   /* glob of brown pudding */
    273: [2, 20],   /* glob of green slime */
    274: [2, 20],   /* glob of black pudding */
    275: [1, 30],   /* kelp frond */
    276: [1, 1],    /* eucalyptus leaf */
    277: [1, 50],   /* apple */
    278: [1, 80],   /* orange */
    279: [1, 50],   /* pear */
    280: [1, 100],  /* melon */
    281: [1, 80],   /* banana */
    282: [1, 50],   /* carrot */
    283: [1, 40],   /* sprig of wolfsbane */
    284: [1, 40],   /* clove of garlic */
    285: [1, 250],  /* slime mold */
    286: [1, 200],  /* lump of royal jelly */
    287: [1, 100],  /* cream pie */
    288: [1, 100],  /* candy bar */
    289: [1, 40],   /* fortune cookie */
    290: [2, 200],  /* pancake */
    291: [2, 800],  /* lembas wafer */
    292: [3, 600],  /* cram ration */
    293: [5, 800],  /* food ration */
    294: [1, 400],  /* K-ration */
    295: [1, 300],  /* C-ration */
    296: [0, 0],    /* tin */
};

/* objects[otyp].oc_delay */
export function oc_delay(otyp) {
    const p = FOOD_PROPS[otyp | 0];
    return p ? (p[0] | 0) : 0;
}

/* objects[otyp].oc_nutrition */
export function oc_nutrition(otyp) {
    const p = FOOD_PROPS[otyp | 0];
    return p ? (p[1] | 0) : 0;
}

/* mons[mndx].cnutrit */
export function mons_cnutrit(mndx) {
    const m = mndx | 0;
    return (m >= 0 && m < MONS_CNUTRIT.length) ? (MONS_CNUTRIT[m] | 0) : 0;
}

/* C eat.c:325 obj_nutrition(otmp):
 *   nut = (otmp->otyp == CORPSE) ? mons[otmp->corpsenm].cnutrit
 *         : otmp->globby ? otmp->owt
 *         : objects[otmp->otyp].oc_nutrition;
 */
export function obj_nutrition(otmp) {
    if ((otmp.otyp | 0) === CORPSE_OTYP_FP)
        return mons_cnutrit(otmp.corpsenm | 0);
    if (otmp.globby) return otmp.owt | 0;
    return oc_nutrition(otmp.otyp | 0);
}

/* C eat.c:3788 eaten_stat(int base, struct obj *obj) — scale `base` by the
 * object's partially-eaten fraction.  obj_nutrition() is read FIRST because C
 * comments that it may modify obj->oeaten.  impossible() is a no-op in JS, so
 * the over-nutritious branch just clamps, exactly as C does after reporting. */
export function eaten_stat(base, obj) {
    const full_amount = obj_nutrition(obj) | 0;
    let uneaten_amt = (obj.oeaten | 0);

    if (uneaten_amt > full_amount)
        uneaten_amt = full_amount;

    base = full_amount
        ? Math.trunc(((base | 0) * uneaten_amt) / full_amount)
        : 0;
    return base < 1 ? 1 : base;
}
