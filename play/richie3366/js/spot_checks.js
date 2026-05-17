// spot_checks.js — hack.c spot_checks() (ICE / DRAWBRIDGE_UP subset).
// C ref: hack.c spot_checks(x, y, old_typ)

import { ICE, DRAWBRIDGE_UP, DB_ICE, DB_UNDER } from './const.js';
import { spotTimeLeftMeltIceAway, spotStopTimersMeltIceAway } from './level_timers.js';
import { objIceEffectsAt } from './melt_ice.js';

/**
 * C: hack.c spot_checks(x, y, old_typ)
 * @param {import('./gstate.js').game} g
 * @param {number} x
 * @param {number} y
 * @param {number} oldTyp — terrain **before** the operation that may have changed the cell
 */
export function spotChecksLikeC(g, x, y, oldTyp) {
    const xi = x | 0;
    const yi = y | 0;
    const loc = g.level?.at(xi, yi);
    if (!loc) return;

    const newTyp = loc.typ | 0;
    const ot = oldTyp | 0;
    let dbIceNow = false;

    switch (ot) {
        case DRAWBRIDGE_UP:
            dbIceNow = ((loc.drawbridgemask | 0) & DB_UNDER) === DB_ICE;
        /* fallthrough */
        case ICE: {
            if (newTyp !== ot || (ot === DRAWBRIDGE_UP && !dbIceNow)) {
                if (spotTimeLeftMeltIceAway(g, xi, yi)) {
                    spotStopTimersMeltIceAway(g, xi, yi);
                }
                objIceEffectsAt(g, xi, yi);
            }
            break;
        }
        default:
            break;
    }
}
