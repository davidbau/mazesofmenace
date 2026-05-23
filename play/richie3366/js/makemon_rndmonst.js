// makemon_rndmonst.js — C makemon.c rndmonst() / rndmonst_adj().
// C refs: makemon.c rndmonst_adj, align_shift, temperature_shift, uncommon, wrong_elem_type;
//         monst.h monmin_difficulty / monmax_difficulty; dungeon.c level_difficulty.

import {
    ALIGNWEIGHT,
    A_NEUTRAL,
    AM_CHAOTIC,
    AM_LAWFUL,
    AM_NEUTRAL,
    AM_NONE,
    G_GONE,
    In_endgame,
    In_hell,
    Is_astralevel,
    Is_earthlevel,
    Is_firelevel,
    Is_waterlevel,
    Is_airlevel,
    Is_rogue_level,
    LOW_PM,
} from './const.js';

const G_UNIQ = 0x1000;
const G_NOHELL = 0x0800;
const G_HELL = 0x0400;
const G_NOGEN = 0x0200;
/** C `monflag.h` `G_FREQ` mask */
const G_FREQ = 0x0007;
import { game } from './gstate.js';
import { depth as depth_of_level } from './hacklib.js';
import {
    MR_COLD,
    MR_FIRE,
    S_ELEMENTAL,
    amorphous,
    fireResistant,
    isFloater,
    isFlyer,
    isHomeElemental,
    isWhirly,
    noncorporeal,
    permonstFromMndxLikeC,
    swims,
} from './mondata.js';

/** C: defsym.h `MONSYM(20, 't', TRAPPER, S_TRAPPER, …)`. */
const S_TRAPPER = 20;
import {
    MONS_GENO_PLAN_B,
    MONS_MLET,
    MONS_RNDMONST_DIFFICULTY,
    MONS_RNDMONST_MALIGNTYP,
} from './mons_rndmonst_ini_inv_data.js';
import { isSpecialHeroUzLikeC } from './sp_levchn.js';
import { rn2 } from './rng.js';

/** C `permonst.h` — first post-normal monster index. */
const SPECIAL_PM = 338;

/** C `permonst.h` — no monster selected. */
const NON_PM = -1;

/** C: defsym.h MONSYM display chars indexed by `mlet` (`S_*`). */
const DEF_MONSYM_DISPLAY = /** @type {readonly string[]} */ (Object.freeze([
    '\0',
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    '@', ' ', '\'', '&', ';', ':', '~', ']',
]));

/** C: mondata.h monsym(ptr) — `def_monsyms[(int) ptr->mlet].sym`. */
function monsymCharLikeC(mlet) {
    return DEF_MONSYM_DISPLAY[mlet | 0] ?? '\0';
}

/** C: ctype isupper(monsym(ptr)). */
function isupperMonsymLikeC(mlet) {
    const ch = monsymCharLikeC(mlet);
    return ch >= 'A' && ch <= 'Z';
}

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

let alignShiftCachedMoves = -1;
let alignShiftCachedAlign = AM_NONE;

/** C: makemon.c align_shift — special level or `dungeons[dnum].flags.align`. */
function dungeonAlignRndmonstLikeC() {
    const moves = game.moves | 0;
    if (alignShiftCachedMoves !== moves) {
        alignShiftCachedMoves = moves;
        const sp = isSpecialHeroUzLikeC(game);
        const dnum = game.u?.uz?.dnum | 0;
        alignShiftCachedAlign = (sp?.flags?.align ?? game.dungeons?.[dnum]?.flags?.align ?? AM_NONE) | 0;
    }
    return alignShiftCachedAlign;
}

/** C: makemon.c align_shift(ptr). */
function alignShiftRndmonstLikeC(mndx) {
    const mal = MONS_RNDMONST_MALIGNTYP[mndx] | 0;
    switch (dungeonAlignRndmonstLikeC()) {
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

/** C: mondata.c pm_resistance(ptr, MR_*) — innate `mresists` only. */
function pmResistanceRndmonstLikeC(ptr, mr) {
    return ((ptr?.mresists ?? 0) & mr) !== 0;
}

/** C: makemon.c temperature_shift(ptr). */
function temperatureShiftRndmonstLikeC(ptr) {
    const temp = game.level?.flags?.temperature | 0;
    if (!temp) return 0;
    const mr = temp > 0 ? MR_FIRE : MR_COLD;
    if (pmResistanceRndmonstLikeC(ptr, mr)) return 3;
    return 0;
}

/**
 * C: makemon.c wrong_elem_type(ptr) — elemental planes / endgame.
 * @param {import('./mondata.js').Permonst} ptr
 */
function wrongElemTypeRndmonstLikeC(ptr) {
    const uz = game.u?.uz;
    if ((ptr.mlet | 0) === S_ELEMENTAL) {
        return !isHomeElemental({ mnum: ptr.mnum | 0, data: ptr }, uz);
    }
    if (Is_earthlevel(uz)) {
        return false;
    }
    if (Is_waterlevel(uz)) {
        return !swims(ptr);
    }
    if (Is_firelevel(uz)) {
        return !fireResistant(ptr);
    }
    if (Is_airlevel(uz)) {
        if (isFlyer(ptr) && (ptr.mlet | 0) !== S_TRAPPER) return false;
        if (isFloater(ptr) || amorphous(ptr) || noncorporeal(ptr) || isWhirly(ptr)) return false;
        return true;
    }
    return false;
}

/** C: makemon.c qt_montype() — quest-only; not ported. */
function qtMontypeRndmonstLikeC() {
    return NON_PM;
}

/**
 * C: makemon.c rndmonst_adj — weighted reservoir over [LOW_PM, SPECIAL_PM).
 * @param {number} minadj
 * @param {number} maxadj
 * @returns {number} mndx or NON_PM
 */
export function rndmonstAdjLikeC(minadj = 0, maxadj = 0) {
    const uz = game.u?.uz;
    const qd = game.quest_dnum;
    if (qd != null && (uz?.dnum | 0) === (qd | 0) && rn2(7) !== 0) {
        const qt = qtMontypeRndmonstLikeC();
        if (qt !== NON_PM) return qt | 0;
    }

    const zlevel = levelDifficultyLikeC();
    const ulevel = game.u?.ulevel | 0;
    const minmlev = Math.trunc(zlevel / 6) + (minadj | 0);
    const maxmlev = Math.trunc((zlevel + ulevel) / 2) + (maxadj | 0);
    const inhell = In_hell(uz);
    const upper = Is_rogue_level(uz);
    const elemlevel = In_endgame(uz) && !Is_astralevel(uz);

    let totalweight = 0;
    let selectedMndx = NON_PM;

    for (let mndx = LOW_PM; mndx < SPECIAL_PM; mndx++) {
        const diff = MONS_RNDMONST_DIFFICULTY[mndx] | 0;
        if (diff < minmlev || diff > maxmlev) continue;
        const mlet = MONS_MLET[mndx] | 0;
        if (upper && !isupperMonsymLikeC(mlet)) continue;
        const ptr = permonstFromMndxLikeC(mndx);
        if (elemlevel && wrongElemTypeRndmonstLikeC(ptr)) continue;
        if (uncommonRndmonstLikeC(mndx)) continue;
        if (inhell && (MONS_GENO_PLAN_B[mndx] & G_NOHELL) !== 0) continue;

        let weight = (MONS_GENO_PLAN_B[mndx] & G_FREQ) + alignShiftRndmonstLikeC(mndx);
        weight += temperatureShiftRndmonstLikeC(ptr);
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
