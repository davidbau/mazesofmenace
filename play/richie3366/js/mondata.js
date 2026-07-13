// mondata.js — Monster name lookup (partial).
// C ref: mondata.c name_to_mon / name_to_monplus

import { monsterNames, NON_PM, LOW_PM } from './monsters.js';

/** PM_SILVER_DRAGON → "silver dragon" */
function pm_to_name(pmName) {
    if (!pmName || !pmName.startsWith('PM_')) return '';
    return pmName.slice(3).toLowerCase().replace(/_/g, ' ');
}

const ALT_NAMES = [
    // C ref: mondata.c name_to_monplus alt_spl — grey↔gray dragons
    { name: 'grey dragon', mndx: () => monsterNames.indexOf('PM_GRAY_DRAGON') },
    { name: 'baby grey dragon', mndx: () => monsterNames.indexOf('PM_BABY_GRAY_DRAGON') },
];

/**
 * C ref: mondata.c name_to_monplus — longest prefix match; returns mndx.
 * remainder_p: { rest: string } optional out for unmatched suffix.
 */
export function name_to_monplus(in_str, remainder_p = null) {
    if (remainder_p) remainder_p.rest = null;
    if (!in_str) return NON_PM;

    let str = in_str;
    if (str.toLowerCase().startsWith('a ')) str = str.slice(2);
    else if (str.toLowerCase().startsWith('an ')) str = str.slice(3);
    else if (str.toLowerCase().startsWith('the ')) str = str.slice(4);

    const lower = str.toLowerCase();
    let best = NON_PM;
    let bestLen = 0;
    let bestRest = null;

    const tryMatch = (cand, mndx) => {
        if (mndx < LOW_PM && mndx !== 0) return;
        if (mndx < 0) return;
        const cl = cand.toLowerCase();
        if (!lower.startsWith(cl)) return;
        const after = str.slice(cand.length);
        // Must be end, or space / plural suffix boundary (C subset)
        if (after.length === 0
            || after[0] === ' '
            || after.toLowerCase().startsWith('s ')
            || after.toLowerCase().startsWith('es ')
            || after.toLowerCase().startsWith("'s ")) {
            if (cand.length > bestLen) {
                bestLen = cand.length;
                best = mndx;
                bestRest = after;
            }
        }
    };

    for (let i = 0; i < monsterNames.length; i++) {
        const nm = pm_to_name(monsterNames[i]);
        if (nm) tryMatch(nm, i);
    }
    for (const alt of ALT_NAMES) {
        tryMatch(alt.name, alt.mndx());
    }

    if (best >= LOW_PM || best === 0) {
        if (remainder_p) remainder_p.rest = bestRest ?? '';
        return best;
    }
    return NON_PM;
}

/** C ref: mondata.c name_to_mon */
export function name_to_mon(in_str) {
    return name_to_monplus(in_str, null);
}
