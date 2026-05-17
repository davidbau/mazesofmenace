// attr_acurr_like_c.js — C attrib.c acurr() / acurrstr() without importing encumbr.js (breaks attrib↔encumbr cycle).
// C ref: attrib.c acurr(), acurrstr(); you.h u.abon / u.atemp / u.acurr; artilist.h ART_OGRESMASHER;
//        objects.h OBJECTS_ENUM (NH5); defsym.h S_NYMPH; monsters.h PM_AMOROUS_DEMON.

import { game } from './gstate.js';
import {
    A_STR,
    A_INT,
    A_WIS,
    A_DEX,
    A_CON,
    A_CHA,
    A_MAX,
    STR18,
    STR19,
    S_NYMPH,
    PM_AMOROUS_DEMON,
    OTYP_GAUNTLETS_OF_POWER,
} from './const.js';
import { raceptr } from './mondata.js';

/** C: objects.h OBJECTS_ENUM — dunce cap. */
const OTYP_DUNCE_CAP = 94;
/** C: artilist.h — Ogresmasher (`A("Ogresmasher", …, OGRESMASHER)`); matches `artifact_light.js` indexing. */
const ART_OGRESMASHER = 16;

/** @param {{ a?: number[] }} [box] */
function attrSlot(box, x) {
    return box?.a?.[x] ?? 0;
}

/**
 * C: attrib.c acurr(int chridx) — effective attribute (abon + atemp + acurr sum, specials, 3..25 clamp).
 * @param {number} chridx A_STR … A_CHA
 * @param {import('./gstate.js').game} [g]
 * @returns {number}
 */
export function acurrLikeC(chridx, g = game) {
    const u = g?.u;
    if (chridx < 0 || chridx >= A_MAX) return 10;
    if (!u?.acurr?.a) return 10;

    const tmp = attrSlot(u.abon, chridx) + attrSlot(u.atemp, chridx) + (u.acurr.a[chridx] ?? 0);
    let result = 0;

    if (chridx === A_STR) {
        if (tmp >= STR19(25) || (u.uarmg && (u.uarmg.otyp | 0) === OTYP_GAUNTLETS_OF_POWER))
            result = STR19(25);
        else
            result = Math.max(tmp, 3);
    } else if (chridx === A_CHA) {
        const ptr = raceptr(g?.youmonst);
        const mlet = ptr?.mlet | 0;
        if (tmp < 18 && (mlet === S_NYMPH || (u.umonnum | 0) === PM_AMOROUS_DEMON))
            result = 18;
    } else if (chridx === A_CON) {
        if (u.uwep && (u.uwep.oartifact | 0) === ART_OGRESMASHER)
            result = 25;
    } else if (chridx === A_INT || chridx === A_WIS) {
        if (u.uarmh && (u.uarmh.otyp | 0) === OTYP_DUNCE_CAP)
            result = 6;
    }

    if (result === 0)
        result = tmp >= 25 ? 25 : tmp <= 3 ? 3 : tmp;

    return result | 0;
}

/**
 * C: attrib.c acurrstr(void) — condensed Str 3..25 for formulas (e.g. hack.c weight_cap).
 * @param {import('./gstate.js').game} [g]
 * @returns {number}
 */
export function acurrstrLikeC(g = game) {
    const str = acurrLikeC(A_STR, g);
    let result;
    if (str <= STR18(0))
        result = Math.max(str, 3);
    else if (str <= STR19(21))
        result = 19 + Math.trunc(str / 50);
    else
        result = Math.min(str, 125) - 100;
    return result | 0;
}
