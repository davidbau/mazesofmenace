// makemon_rndmonst.js — C makemon.c rndmonst() / rndmonst_adj().
// C refs: makemon.c rndmonst_adj, align_shift, temperature_shift, uncommon;
//         monst.h monmin_difficulty / monmax_difficulty; dungeon.c level_difficulty.

import { ALIGNWEIGHT, A_NEUTRAL, AM_CHAOTIC, AM_LAWFUL, AM_NEUTRAL, AM_NONE, G_GONE, In_hell, LOW_PM } from './const.js';

const G_UNIQ = 0x1000;
const G_NOHELL = 0x0800;
const G_HELL = 0x0400;
const G_NOGEN = 0x0200;
/** C `monflag.h` `G_FREQ` mask */
const G_FREQ = 0x0007;
import { game } from './gstate.js';
import { depth as depth_of_level } from './hacklib.js';
import {
    MONS_GENO_PLAN_B,
    MONS_RNDMONST_DIFFICULTY,
    MONS_RNDMONST_MALIGNTYP,
} from './mons_rndmonst_ini_inv_data.js';
import { rn2 } from './rng.js';

/** C `permonst.h` — first post-normal monster index. */
const SPECIAL_PM = 338;

/** C `permonst.h` — no monster selected. */
const NON_PM = -1;

/** C: dungeon.c level_difficulty — depth of current level. */
function levelDifficultyLikeC() {
    return depth_of_level(game.u?.uz) | 0;
}

/** C: makemon.c uncommon — geno + mvitals + Inhell. */
function uncommonRndmonstLikeC(mndx) {
    const geno = MONS_GENO_PLAN_B[mndx] | 0;
    if ((geno & (G_NOGEN | G_UNIQ)) !== 0) return true;
    const mv = game.mvitals?.[mndx]?.mvflags | 0;
    if ((mv & G_GONE) !== 0) return true;
    if (In_hell(game.u?.uz)) return (MONS_RNDMONST_MALIGNTYP[mndx] | 0) > A_NEUTRAL;
    return (geno & G_HELL) !== 0;
}

/** C: makemon.c align_shift — main dungeon AM_NONE on D:1. */
function alignShiftRndmonstLikeC(mndx) {
    const mal = MONS_RNDMONST_MALIGNTYP[mndx] | 0;
    const dungeonAlign = AM_NONE;
    switch (dungeonAlign) {
        case AM_LAWFUL:
            return Math.trunc((mal + 20) / (2 * ALIGNWEIGHT));
        case AM_NEUTRAL:
            return Math.trunc((20 - Math.abs(mal)) / ALIGNWEIGHT);
        case AM_CHAOTIC:
            return Math.trunc((-(mal - 20)) / (2 * ALIGNWEIGHT));
        default:
            return 0;
    }
}

/** C: makemon.c temperature_shift — no level temperature on early D:1. */
function temperatureShiftRndmonstLikeC() {
    return 0;
}

/**
 * C: makemon.c rndmonst_adj — weighted reservoir over [LOW_PM, SPECIAL_PM).
 * @param {number} minadj
 * @param {number} maxadj
 * @returns {number} mndx or NON_PM
 */
export function rndmonstAdjLikeC(minadj = 0, maxadj = 0) {
    const zlevel = levelDifficultyLikeC();
    const ulevel = game.u?.ulevel | 0;
    const minmlev = Math.trunc(zlevel / 6) + (minadj | 0);
    const maxmlev = Math.trunc((zlevel + ulevel) / 2) + (maxadj | 0);
    const inhell = In_hell(game.u?.uz);

    let totalweight = 0;
    let selectedMndx = NON_PM;

    for (let mndx = LOW_PM; mndx < SPECIAL_PM; mndx++) {
        const diff = MONS_RNDMONST_DIFFICULTY[mndx] | 0;
        if (diff < minmlev || diff > maxmlev) continue;
        if (uncommonRndmonstLikeC(mndx)) continue;
        if (inhell && (MONS_GENO_PLAN_B[mndx] & G_NOHELL) !== 0) continue;

        let weight = (MONS_GENO_PLAN_B[mndx] & G_FREQ) + alignShiftRndmonstLikeC(mndx);
        weight += temperatureShiftRndmonstLikeC();
        if (weight < 0 || weight > 127) weight = 0;
        if (weight > 0) {
            totalweight += weight;
            if (rn2(totalweight) < weight) selectedMndx = mndx;
        }
    }

    if (selectedMndx === NON_PM || uncommonRndmonstLikeC(selectedMndx)) return NON_PM;
    return selectedMndx | 0;
}

/** C: makemon.c rndmonst — `rndmonst_adj(0, 0)`. */
export function rndmonstLikeC() {
    return rndmonstAdjLikeC(0, 0);
}
