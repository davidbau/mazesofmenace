// enlght_patrons.js — Quest deity lines for #attributes (enlightenment background).
// C ref: insight.c background_enlightenment; pray.c align_gname / u_gname; role.c pantheon.

import { game } from './gstate.js';
import {
    A_LAWFUL,
    A_NEUTRAL,
    A_CHAOTIC,
    A_NONE,
    A_CURRENT,
    A_ORIGINAL,
} from './const.js';
import { alignGnameLikeC, uGnameHeroLikeC } from './pray_align_gname_like_c.js';

/** C: insight.c align_str */
function alignStrLikeC(alignment) {
    switch (alignment | 0) {
        case A_CHAOTIC:
            return 'chaotic';
        case A_NEUTRAL:
            return 'neutral';
        case A_LAWFUL:
            return 'lawful';
        case A_NONE:
            return 'unaligned';
        default:
            return 'unknown';
    }
}

/**
 * C: insight.c background_enlightenment — pantheon sentences (enlght_out).
 * @param {import('./gstate.js').game} [g]
 * @param {boolean} [final]
 * @returns {string[]}
 */
export function enlightMissionLinesLikeC(g = game, final = false) {
    const u = g.u || {};
    const al = u.ualign?.type ?? A_NEUTRAL;
    const ualignbase = u.ualignbase;
    const aCur = ualignbase?.[A_CURRENT] ?? al;
    const aOrig = ualignbase?.[A_ORIGINAL] ?? al;

    let alignAdverb = '';
    if (al !== aCur) alignAdverb = final ? 'temporarily ' : 'currently ';
    else if (al !== aOrig) alignAdverb = final ? 'belatedly ' : 'now ';
    else if (!u.uconduct?.gnostic && (g.moves ?? 0) > 1000) alignAdverb = 'nominally ';

    const youAre = final ? 'You were' : 'You are';
    const opposed = final ? 'was' : 'is';

    const line1 = `  ${youAre} ${alignAdverb}${alignStrLikeC(al)}, on a mission for ${uGnameHeroLikeC(g)}`;

    let line2 = `  who ${opposed} opposed by`;
    if (al !== A_LAWFUL) {
        line2 += ` ${alignGnameLikeC(g, A_LAWFUL)} (${alignStrLikeC(A_LAWFUL)}) and`;
    }
    if (al !== A_NEUTRAL) {
        line2 += ` ${alignGnameLikeC(g, A_NEUTRAL)} (${alignStrLikeC(A_NEUTRAL)})`;
        if (al !== A_CHAOTIC) line2 += ' and';
    }
    if (al !== A_CHAOTIC) {
        line2 += ` ${alignGnameLikeC(g, A_CHAOTIC)} (${alignStrLikeC(A_CHAOTIC)})`;
    }
    line2 += '.';

    return [line1, line2];
}
