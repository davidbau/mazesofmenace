// body_part_hero.js — Hero body-part strings (polyself.c mbodypart / hack.c body_part subset).
// C ref: polyself.c mbodypart(&gy.youmonst, part); dig.c zap_dig vertical — pline(**`body_part(HEAD)`**);
//        defsym.h MONSYM indices (**`S_*`**); **`shop.js`** **`PM_STALKER`** **153** (**`mons[]`** order in this fork).
//
// **`PM_JELLYFISH`** — NH **5.0.0** **`include/monsters.h`** **`MON(...)`** order ( **`PM_FLOATING_EYE`** **29** matches **`js/const.js`**).

import { raceptr, slithy, humanoidLikeC } from './mondata.js';

/** C: defsym.h MONSYM — subset for **`mbodypart`** HEAD routing. */
const S_BLOB = 2;
const S_COCKATRICE = 3;
const S_EYE = 5;
const S_JELLY = 10;
const S_VORTEX = 22;
const S_LIGHT = 25;
const S_FUNGUS = 32;
const S_DRAGON = 30;
const S_SPIDER = 19;
const S_WORM = 23;
const S_CENTAUR = 29;
const S_UNICORN = 21;
const S_PUDDING = 42;
const S_EEL = 57;
const S_ELEMENTAL = 31;
/** C: defsym.h MONSYM — bat / bird (e.g. **`PM_RAVEN`** uses **`bird_parts`**). */
const S_BAT = 28;
/** C: defsym.h **`MONSYM`** — **`mbodypart`** LEG dog/feline/rodent → **`horse_parts[LEG]`**. */
const S_DOG = 4;
const S_FELINE = 6;
const S_RODENT = 18;

/** C: **`mons[]`** index — NH **5.0.0** **`monsters.h`** **`MON(NAM(\"jellyfish\")`…`JELLYFISH)`** ( **`mbodypart`**: **`S_EEL`** → **`jelly_parts`**, not **`fish_parts`**). */
const PM_JELLYFISH = 323;
/** C: **`mons[]`** index — NH **5.0.0** **`monsters.h`** **`MON(NAM(\"owlbear\")`…`OWLBEAR)`** (**`S_YETI`** but **`mbodypart`** dog-branch **`PM_OWLBEAR`** → **`horse_parts[LEG]`**). */
const PM_OWLBEAR = 241;

/** C: **`mons[]`** index — matches **`shop.js`** stalker / **`invisible`** tests in this fork. */
const PM_STALKER = 153;

/**
 * C: polyself.c **`mbodypart(&gy.youmonst, HEAD)`** — most forms **`"head"`**; light **`"beam"`**, sphere **`"body"`**,
 * jelly **`"cerebral area"`**, worm **`"anterior segment"`**, spider **`"cephalothorax"`**, vortex/elemental **`"central core"`**,
 * fungus **`"cap area"`**.
 * @param {import('./gstate.js').game} g
 * @returns {string}
 */
export function mbodypartHeroHeadLikeC(g) {
    const ptr = raceptr(g?.youmonst);
    const ml = ptr.mlet | 0;
    const mn = ptr.mnum | 0;

    if (ml === S_LIGHT) return 'beam';

    if (mn === PM_STALKER) return 'head';

    if (ml === S_EEL) {
        if (mn === PM_JELLYFISH) return 'cerebral area'; /* C: jelly_parts[HEAD] */
        return 'head'; /* C: fish_parts[HEAD] */
    }

    if (ml === S_WORM) return 'anterior segment';
    if (ml === S_SPIDER) return 'cephalothorax';

    if (slithy(ptr)) return 'head'; /* C: snake_parts[HEAD]; dragon uses this only with **`part == HAIR`**. */

    if (ml === S_EYE) return 'body';

    if (ml === S_JELLY || ml === S_BLOB || ml === S_PUDDING) return 'cerebral area';

    if (ml === S_VORTEX || ml === S_ELEMENTAL) return 'central core';

    if (ml === S_FUNGUS) return 'cap area';

    if (humanoidLikeC(ptr)) return 'head';

    if (ml === S_COCKATRICE || ml === S_CENTAUR || ml === S_UNICORN) return 'head';

    return 'head';
}

/** C: hack.c **`body_part(FOOT)`** for humanoid hero — **`"foot"`** ( **`makeplural` → `"feet"`** in pray.c **`at_your_feet`**). */
export function bodyPartHeroFootLikeC() {
    return 'foot';
}

/** C: objnam.c **`makeplural("foot")`** — pray.c **`at_your_feet`** feet line. */
export function makePluralHeroFootLikeC() {
    return 'feet';
}

/**
 * C: polyself.c **`mbodypart(&gy.youmonst, LEG)`** — read.c **`seffect_remove_curse`** clasp (**`body_part(LEG)`**).
 * Subset: dog/feline/rodent / **`PM_OWLBEAR`** **`rear leg`**; slithy **`rear region`**; spider **`leg`**; worm **`posterior`**;
 * **`PM_JELLYFISH`** **`lower pseudopod`**; other eels **`peduncle`**; humanoid **`leg`**; default **`rear limb`**.
 * @param {import('./gstate.js').game} g
 * @returns {string}
 */
export function mbodypartHeroLegLikeC(g) {
    const ptr = raceptr(g?.youmonst);
    const ml = ptr.mlet | 0;
    const mn = ptr.mnum | 0;
    if (ml === S_DOG || ml === S_FELINE || ml === S_RODENT || mn === PM_OWLBEAR) {
        return 'rear leg';
    }
    if (slithy(ptr)) {
        return 'rear region';
    }
    if (ml === S_SPIDER) {
        return 'leg';
    }
    if (ml === S_WORM) {
        return 'posterior';
    }
    if (mn === PM_JELLYFISH) {
        return 'lower pseudopod';
    }
    if (ml === S_EEL && mn !== PM_JELLYFISH) {
        return 'peduncle';
    }
    if (humanoidLikeC(ptr)) {
        return 'leg';
    }
    return 'rear limb';
}

/**
 * C: polyself.c **`mbodypart(mon, STOMACH)`** (**`bodypart_types.STOMACH` == 18**) — pray.c **`at_your_feet`** swallow line.
 * Subset of C’s **`if`/`else` chain** (same string for many branches); covers light / sphere / vortex / elemental / fungus /
 * spider / worm / slithy / jelly-class / fish / bird / horse / humanoid / default animal.
 * @param {{ data?: unknown, mnum?: number }|null|undefined} mtmp
 * @returns {string}
 */
export function mbodypartMonsterStomachLikeC(mtmp) {
    const ptr = raceptr(mtmp);
    const ml = ptr.mlet | 0;

    if (ml === S_COCKATRICE) return 'stomach'; /* C: **`bird_parts[STOMACH]`** */
    if (ml === S_BAT) return 'stomach'; /* C: **`PM_RAVEN`** → **`bird_parts`** */
    if (ml === S_CENTAUR || ml === S_UNICORN) return 'stomach'; /* C: **`horse_parts[STOMACH]`** (+ Ki-rin / Rothe non-hair) */
    if (ml === S_LIGHT) return 'beam'; /* C: S_LIGHT non-hand branch */
    if (ml === S_EYE) return 'interior'; /* C: **`sphere_parts[STOMACH]`** */
    if (ml === S_VORTEX || ml === S_ELEMENTAL) return 'interior'; /* C: **`vortex_parts[STOMACH]`** */
    if (ml === S_FUNGUS) return 'interior'; /* C: **`fungus_parts[STOMACH]`** */
    if (ml === S_SPIDER) return 'digestive tract'; /* C: **`spider_parts[STOMACH]`** */
    if (ml === S_WORM) return 'stomach'; /* C: **`worm_parts[STOMACH]`** */
    if (slithy(ptr)) return 'stomach'; /* C: **`snake_parts[STOMACH]`** ( **`slithy`** || dragon+HAIR; STOMACH uses snake when slithy) */
    if (ml === S_JELLY || ml === S_BLOB || ml === S_PUDDING) return 'stomach'; /* C: **`jelly_parts`** (+ jellyfish **`S_EEL`**) */
    if (ml === S_EEL) return 'stomach'; /* C: **`fish_parts`** / **`jelly_parts`** STOMACH — both **`stomach`** */
    if (humanoidLikeC(ptr)) return 'stomach'; /* C: **`humanoid_parts[STOMACH]`** (incl. **`S_YETI`**) */
    return 'stomach'; /* C: **`animal_parts[STOMACH]`** */
}
