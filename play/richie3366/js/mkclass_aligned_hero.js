// mkclass_aligned_hero.js — C makemon.c mkclass / mkclass_aligned subset for summon_minion / lminion / ndemon.
// C ref: makemon.c mkclass_aligned() (~1880), init_mongen_order (~1806), mk_gen_ok (~1735), adj_lev (~2015), montoostrong (monst.h).

import { depth as depthOfLevel } from './hacklib.js';
import { rn2, rnd } from './rng.js';
import {
    MONS_GENO_PLAN_B,
    MONS_MFLAGS2,
    MONS_MLET,
    MONS_MLEVEL,
    MONS_RNDMONST_DIFFICULTY,
    MONS_RNDMONST_MALIGNTYP,
} from './mons_rndmonst_ini_inv_data.js';
import { A_NONE, NON_PM, In_hell } from './const.js';

const SPECIAL_PM = 338;
const MAXMCLASSES = 60;
const PM_WIZARD_OF_YENDOR = 286;
const S_LICH = 38;

const G_UNIQ = 0x1000;
const G_NOHELL = 0x0800;
const G_HELL = 0x0400;
const G_NOGEN = 0x0200;
const G_GENO = 0x0020;
const G_NOCORPSE = 0x0010;
const G_FREQ = 0x0007;
const G_IGNORE = 0x8000;
const G_GENOD = 0x02;
const G_EXTINCT = 0x01;
const G_GONE = G_GENOD | G_EXTINCT;

const M2_LORD = 0x400;
const M2_PRINCE = 0x800;

const PLACEHOLDER_MNDX = new Set([73, 170, 261, 265]);

/** @type {number[]|null} */
let _mongenOrder = null;

function sgn(x) {
    const v = x | 0;
    return v > 0 ? 1 : v < 0 ? -1 : 0;
}

function initMongenOrderLikeC() {
    if (_mongenOrder) return _mongenOrder;
    const arr = Array.from({ length: SPECIAL_PM }, (_, i) => i);
    arr.sort((a, b) => {
        const da = (MONS_RNDMONST_DIFFICULTY[a] | 0) | ((MONS_MLET[a] | 0) << 8);
        const db = (MONS_RNDMONST_DIFFICULTY[b] | 0) | ((MONS_MLET[b] | 0) << 8);
        return da - db;
    });
    _mongenOrder = arr;
    return arr;
}

function levelDifficultyHeroLikeC(g) {
    return depthOfLevel(g?.u?.uz) | 0;
}

/**
 * C: makemon.c **`adj_lev`** ( **`struct permonst *`** → **`mndx`** here).
 * @param {import('./gstate.js').game} g
 * @param {number} mndx
 */
function adjLevMndxHeroLikeC(g, mndx) {
    const u = g?.u;
    const ulevel = u?.ulevel | 0;
    let tmp;
    if ((mndx | 0) === PM_WIZARD_OF_YENDOR) {
        const died = g?.mvitals?.[PM_WIZARD_OF_YENDOR]?.died | 0;
        tmp = (MONS_MLEVEL[mndx] | 0) + died;
        if (tmp > 49) tmp = 49;
        return tmp;
    }
    tmp = MONS_MLEVEL[mndx] | 0;
    if (tmp > 49) return 50;
    let tmp2 = levelDifficultyHeroLikeC(g) - tmp;
    if (tmp2 < 0) tmp--;
    else tmp += Math.trunc(tmp2 / 5);
    tmp2 = ulevel - (MONS_MLEVEL[mndx] | 0);
    if (tmp2 > 0) tmp += Math.trunc(tmp2 / 4);
    tmp2 = Math.trunc((3 * (MONS_MLEVEL[mndx] | 0)) / 2);
    if (tmp2 > 49) tmp2 = 49;
    if (tmp > tmp2) return tmp2;
    return tmp > 0 ? tmp : 0;
}

/**
 * C: makemon.c **`mk_gen_ok`**
 * @param {import('./gstate.js').game} g
 * @param {number} mndx
 * @param {number} mvflagsmask
 * @param {number} genomask
 */
function mkGenOkHeroLikeC(g, mndx, mvflagsmask, genomask) {
    const geno = MONS_GENO_PLAN_B[mndx] | 0;
    const mv = g?.mvitals?.[mndx]?.mvflags | 0;
    if ((mv & mvflagsmask) !== 0) return false;
    if ((geno & genomask) !== 0) return false;
    if (PLACEHOLDER_MNDX.has(mndx | 0)) return false;
    return true;
}

/**
 * C: makemon.c **`mkclass_aligned`** — returns **`mons[]`** index or **`NON_PM`**.
 * @param {import('./gstate.js').game} g
 * @param {number} classNum — **`S_*`** **`MONSYM`** index
 * @param {number} spc
 * @param {number} atyp — **`A_*`** alignment filter (**`A_NONE`** = no filter)
 */
export function mkclassAlignedMndxHeroLikeC(g, classNum, spc, atyp) {
    const mongenOrder = initMongenOrderLikeC();
    const nums = new Int32Array(SPECIAL_PM + 1);
    const mclassMaxf = new Int8Array(MAXMCLASSES);
    let first;
    let last;
    let num = 0;
    const maxmlev = Math.trunc(levelDifficultyHeroLikeC(g) / 2);
    const gehennom = In_hell(g?.u?.uz) ? 1 : 0;
    const u = g?.u;
    const atypV = atyp | 0;

    if ((classNum | 0) < 1 || (classNum | 0) >= MAXMCLASSES) return NON_PM;

    /* C: **`init_mongen_order`** fills **`mclass_maxf`** from raw **`mons[i]`** indices (**`0..NUMMONS-1`**); contest slice **`0..SPECIAL_PM-1`**. */
    for (let i = 0; i < SPECIAL_PM; i++) {
        const mlet = MONS_MLET[i] | 0;
        const fq = (MONS_GENO_PLAN_B[i] | 0) & G_FREQ;
        if (fq > (mclassMaxf[mlet] | 0)) mclassMaxf[mlet] = fq;
    }

    const zeroFreqForEntireClass = (mclassMaxf[classNum | 0] | 0) === 0;

    for (first = 0; first < SPECIAL_PM; first++) {
        const mi = mongenOrder[first] | 0;
        if ((MONS_MLET[mi] | 0) === (classNum | 0)) break;
    }
    if (first === SPECIAL_PM) return NON_PM;

    let mvMask = G_GONE;
    let spcLocal = spc | 0;
    if ((spcLocal & G_IGNORE) !== 0) {
        mvMask = 0;
        spcLocal &= ~G_IGNORE;
    }

    for (last = first; last < SPECIAL_PM && (MONS_MLET[mongenOrder[last] | 0] | 0) === (classNum | 0); last++) {
        const mndx = mongenOrder[last] | 0;
        if (atypV !== (A_NONE | 0) && sgn(MONS_RNDMONST_MALIGNTYP[mndx] | 0) !== sgn(atypV)) continue;

        let gnMask = G_NOGEN | G_UNIQ;
        if (rn2(9) || (classNum | 0) === S_LICH) gnMask |= gehennom ? G_NOHELL : G_HELL;
        gnMask &= ~spcLocal;

        if (mkGenOkHeroLikeC(g, mndx, mvMask, gnMask)) {
            if (
                num &&
                (MONS_RNDMONST_DIFFICULTY[mndx] | 0) > maxmlev &&
                (MONS_RNDMONST_DIFFICULTY[mndx] | 0) >
                    (MONS_RNDMONST_DIFFICULTY[mongenOrder[last - 1] | 0] | 0) &&
                rn2(2)
            )
                break;
            let k = (MONS_GENO_PLAN_B[mndx] | 0) & G_FREQ;
            if (k > 0 || (k = zeroFreqForEntireClass ? 1 : 0) > 0) {
                nums[mndx] = k + 1 - (adjLevMndxHeroLikeC(g, mndx) > ((u?.ulevel | 0) * 2) ? 1 : 0);
                num += nums[mndx];
            }
        }
    }
    if (!num) return NON_PM;

    for (num = rnd(num); first < last; first++) {
        const mndx = mongenOrder[first] | 0;
        if ((num -= nums[mndx]) <= 0) break;
    }
    const pick = mongenOrder[first] | 0;
    return nums[pick] ? pick : NON_PM;
}

/**
 * C: minion.c **`lminion`**
 * @param {import('./gstate.js').game} g
 */
export function lminionMndxHeroLikeC(g) {
    const S_ANGEL = 27;
    for (let tryct = 0; tryct < 20; tryct++) {
        const mndx = mkclassAlignedMndxHeroLikeC(g, S_ANGEL, 0, A_NONE);
        if (mndx !== NON_PM && ((MONS_MFLAGS2[mndx] | 0) & (M2_LORD | M2_PRINCE)) === 0) return mndx;
    }
    return NON_PM;
}

/**
 * C: minion.c **`ndemon`**
 * @param {import('./gstate.js').game} g
 * @param {number} atyp
 */
export function ndemonMndxHeroLikeC(g, atyp) {
    const S_DEMON = 56;
    const mndx = mkclassAlignedMndxHeroLikeC(g, S_DEMON, 0, atyp | 0);
    if (mndx === NON_PM) return NON_PM;
    const m2 = MONS_MFLAGS2[mndx] | 0;
    if ((MONS_MLET[mndx] | 0) === S_DEMON && (m2 & (M2_LORD | M2_PRINCE)) === 0) return mndx;
    return NON_PM;
}
