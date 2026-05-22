// disturb_mon.js — Wake sleeping monsters (monmove.c disturb).
// C ref: monmove.c disturb() ~327–357; dochug ~727 before wipe_engr.

import { rn2 } from './rng.js';
import { couldsee } from './vision.js';
import { dist2 } from './hacklib.js';
import { raceptr } from './mondata.js';

/** C: defsym.h — nymph class letter. */
const S_NYMPH = 51;
/** C: monsters.h — jabberwock. */
const PM_JABBERWOCK = 131;
/** C: defsym.h — leprechaun. */
const S_LEPRECHAUN = 46;
/** C: defsym.h — dog. */
const S_DOG = 100;
/** C: defsym.h — human. */
const S_HUMAN_MONSYM = 53;
/** C: monsters.h — ettin. */
const PM_ETTIN = 172;

/**
 * C: monmove.c **`disturb(mtmp)`** — may wake **`msleeping`** monster; consumes RNG when checks run.
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @returns {boolean} true if monster was awakened
 */
export function disturbMonsterLikeC(g, mtmp) {
    const u = g?.u;
    if (!u || !mtmp) return false;
    const mx = mtmp.mx | 0;
    const my = mtmp.my | 0;
    if (!couldsee(mx, my)) return false;
    if (dist2(mx, my, u.ux | 0, u.uy | 0) > 100) return false;

    const ptr = raceptr(mtmp);
    const stealth = u.Stealth | 0;
    if (stealth && !((ptr?.mnum | 0) === PM_ETTIN && !rn2(10))) return false;

    const mlet = ptr?.mlet | 0;
    const mnum = ptr?.mnum | 0;
    if (
        (mlet === S_NYMPH || mnum === PM_JABBERWOCK || mlet === S_LEPRECHAUN)
        && !rn2(50)
    ) {
        return false;
    }

    const aggravate = u.Aggravate_monster | 0;
    if (
        aggravate
        || mlet === S_DOG
        || mlet === S_HUMAN_MONSYM
        || (!rn2(7) && (mtmp.mappearance | 0) === 0)
    ) {
        mtmp.msleeping = 0;
        return true;
    }
    return false;
}
