// minion_summon_hero.js — C minion.c summon_minion subset (pray.c angrygods case 7–8).
// C ref: minion.c summon_minion() (~197); pray.c angrygods (~760).

import {
    A_CHAOTIC,
    A_LAWFUL,
    A_NEUTRAL,
    A_NONE,
    MM_EMIN,
    MM_NOMSG,
    NON_PM,
    PM_AIR_ELEMENTAL,
    PM_EARTH_ELEMENTAL,
    PM_FIRE_ELEMENTAL,
    PM_WATER_ELEMENTAL,
} from './const.js';
import { rn2 } from './rng.js';
import { makemon } from './makemon.js';
import { lminionMndxHeroLikeC, ndemonMndxHeroLikeC } from './mkclass_aligned_hero.js';

/** C: minion.c **`elementals[]`** + **`ROLL_FROM`**. */
const ELEMENTALS = [PM_AIR_ELEMENTAL, PM_FIRE_ELEMENTAL, PM_EARTH_ELEMENTAL, PM_WATER_ELEMENTAL];

/**
 * C: minion.c **`summon_minion(alignment, talk)`** — **`talk`** false for **`angrygods`** case **7–8**.
 * **`makemon`** / **`fmon`** / **`EMIN`** / deaf **`pline`** tail still partial; RNG through **`mkclass_aligned`** + **`makemon`** matches **`makemon.js`** stub.
 * @param {import('./gstate.js').game} g
 * @param {number} alignment — resp **`aligntyp`**
 * @param {boolean} talk
 */
export function summonMinionHeroLikeC(g, alignment, talk) {
    void talk;
    const u = g?.u;
    if (!u) return;

    const al = alignment | 0;
    let mnum = NON_PM;
    if (al === (A_LAWFUL | 0)) mnum = lminionMndxHeroLikeC(g);
    else if (al === (A_NEUTRAL | 0)) mnum = ELEMENTALS[rn2(4)] | 0;
    else if (al === (A_CHAOTIC | 0) || al === (A_NONE | 0)) mnum = ndemonMndxHeroLikeC(g, al);
    else mnum = ndemonMndxHeroLikeC(g, A_NONE);

    if (mnum === NON_PM) return;

    const mm = MM_EMIN | MM_NOMSG;
    const mon = makemon({ mnum }, u.ux | 0, u.uy | 0, mm);
    if (mon) mon.mpeaceful = 0;
}
