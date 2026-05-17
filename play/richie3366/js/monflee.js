// monflee.js — Monster begins fleeing (monmove.c).
// C ref: monmove.c monflee(), mon_track_clear(); mon.c minliquid_core (land eel).

import { game } from './gstate.js';
import { pline } from './display.js';
import { cansee } from './vision.js';
import { raceptr } from './mondata.js';

/** C: monmove.c **`MTSZ`** — ring size for **`mtrack`** (subset). */
const MTSZ = 4;

/** C: monmove.c **`mon_track_clear`** — zero **`mtrack`** ring. */
export function monTrackClear(mtmp) {
    if (!mtmp?.mtrack || !Array.isArray(mtmp.mtrack)) return;
    for (const c of mtmp.mtrack) {
        if (c && typeof c === 'object') {
            c.x = 0;
            c.y = 0;
        }
    }
}

/** C: mon.c **`canspotmon`**-style for flee plines (no **`u.usteed`** / mimic subset). */
function canseemonFlee(g, mtmp) {
    const u = g.u;
    if (!u || !mtmp) return false;
    if (u.usteed === mtmp) return true;
    if ((mtmp.minvis | 0) && !(u.See_invisible | 0)) return false;
    return cansee(mtmp.mx | 0, mtmp.my | 0);
}

function monNamCap(mtmp) {
    const raw = mtmp?.monnam || mtmp?.data?.mname || 'the monster';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * C: monmove.c **`monflee(mtmp, fleetime, first, fleemsg)`**.
 * Omits **`release_hero`**, **`flees_light`**, vrock gas, **`M_AP_TYPE`** mimic guards, **`Adjmonnam`** immobile branch.
 *
 * @param {typeof game} [g]
 * @param {Record<string, unknown>} mtmp
 * @param {number} fleetime — **0** clears timed flee; else capped **127**
 * @param {boolean} first — when **true** and already **`mflee`**, inner timer/message block skipped (**`mon_track_clear`** still runs)
 * @param {boolean} fleemsg
 */
export async function monflee(g = game, mtmp, fleetime, first, fleemsg) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    /* C: `mtmp == u.ustuck` → `release_hero` — not ported */
    if (mtmp === g.u?.ustuck) {
        /* defer */
    }

    if (!first || !(mtmp.mflee | 0)) {
        const ft = fleetime | 0;
        if (!ft) {
            mtmp.mfleetim = 0;
        } else if (!(mtmp.mflee | 0) || (mtmp.mfleetim | 0)) {
            let add = ft + (mtmp.mfleetim | 0);
            if (add === 1) add++;
            mtmp.mfleetim = Math.min(add, 127);
        }
        if (!(mtmp.mflee | 0) && fleemsg && canseemonFlee(g, mtmp)) {
            if (!(mtmp.mcanmove | 0) || !((raceptr(mtmp)?.mmove) | 0)) {
                await pline(`${monNamCap(mtmp)} seems to flinch.`);
            } else {
                await pline(`${monNamCap(mtmp)} turns to flee.`);
            }
        }
        mtmp.mflee = 1;
    }
    monTrackClear(mtmp);
}

/**
 * C: monmove.c **`m_init`**-style **`mtrack`** ring — allocate once for **`mon_track`** / **`mon_track_clear`**.
 * @param {Record<string, unknown>} mtmp
 */
export function ensureMonsterMtrack(mtmp) {
    if (!mtmp || mtmp.mtrack) return;
    mtmp.mtrack = Array.from({ length: MTSZ }, () => ({ x: 0, y: 0 }));
}
