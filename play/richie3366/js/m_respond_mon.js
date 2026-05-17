// m_respond_mon.js — C mon.c m_respond(); monmove.c dochug callsite (~752–755).
// C ref: mon.c m_respond ~4122–4130, m_respond_shrieker ~4088–4104 (makemon + aggravate), wizard.c aggravate ~494–510.

import {
    G_GENOD,
    NO_MM_FLAGS,
    PM_BABY_PURPLE_WORM,
    PM_ERINYS,
    PM_MEDUSA,
    PM_PURPLE_WORM,
    inWTowerLikeC,
} from './const.js';
import { gazemuMedusaMrespondMonsterLikeC } from './gazemu_mhitu.js';
import { depth } from './hacklib.js';
import { makemon } from './makemon.js';
import { MONS_RNDMONST_DIFFICULTY } from './mons_rndmonst_ini_inv_data.js';
import { rn2 } from './rng.js';
import { couldsee } from './vision.js';
import { raceptr } from './mondata.js';
import { mCanSeeHeroMonsterLikeC } from './mon_seen_res.js';

/** C: monflag.h `MS_SHRIEK` — shrieker / mimics-with-shriek. */
const MS_SHRIEK = 18;

/** C: apply.c `um_dist(x,y,n)` — true if `|ux-x|>n` or `|uy-y|>n` (else hero within axis box). */
function umDistLikeC(g, x, y, n) {
    const ux = g.u?.ux | 0;
    const uy = g.u?.uy | 0;
    return Math.abs(ux - (x | 0)) > n || Math.abs(uy - (y | 0)) > n;
}

function heroDeafLikeC(g) {
    return (g.u?.timed?.deaf ?? 0) > 0;
}

/** C: monst.h **`monmax_difficulty_lev`** / **`montoostrong`** — **`depth(&u.uz)`** subset (**`level_difficulty`** TODO). */
function monmaxDifficultyLevShriekerLikeC(g) {
    const lev = depth(g.u?.uz) | 0;
    return Math.trunc((lev + (g.u?.ulevel | 0)) / 2);
}

/** C: **`montoostrong(PM_PURPLE_WORM, monmax_difficulty_lev())`**. */
function montoostrongPurpleWormShriekerLikeC(g) {
    const d = MONS_RNDMONST_DIFFICULTY[PM_PURPLE_WORM] | 0;
    return d > monmaxDifficultyLevShriekerLikeC(g);
}

/**
 * C: mon.c **`m_respond_shrieker`** — **`!rn2(10)`** then **`makemon(rn2(13)?0:…worm…, 0, 0, NO_MM_FLAGS)`**.
 * @param {import('./gstate.js').game} g
 * @returns {object|null}
 */
function mRespondShriekerMakemonLikeC(g) {
    const r13 = rn2(13);
    if (r13 !== 0) {
        return makemon(null, 0, 0, NO_MM_FLAGS);
    }
    const mnum = montoostrongPurpleWormShriekerLikeC(g) ? PM_BABY_PURPLE_WORM : PM_PURPLE_WORM;
    if (((g.mvitals?.[mnum]?.mvflags | 0) & G_GENOD) !== 0) return null;
    return makemon({ mnum }, 0, 0, NO_MM_FLAGS);
}

/** C: monst.h `STRAT_WAITFORU` | `STRAT_APPEARMSG` — cleared by aggravate(). */
const STRAT_AGGR_MASK = 0x20000000 | 0x80000000;

/**
 * C: wizard.c aggravate() — wake same W-tower region; `rn2(5)` may unfreeze immobile mons.
 * **`In_W_tower`** via **`onWTowerLevelLikeC`** / **`game.dndest`** when **`wiz*_level`** + bounds are wired.
 * @param {import('./gstate.js').game} g
 */
export function aggravateMonstersLikeC(g) {
    const mons = g.level?.monsters;
    if (!mons?.length) return;
    const ux = g.u?.ux | 0;
    const uy = g.u?.uy | 0;
    const inWTowerHero = inWTowerLikeC(ux, uy, g);
    for (const m of mons) {
        if ((m.mhp | 0) <= 0) continue;
        const inWTowerMon = inWTowerLikeC(m.mx | 0, m.my | 0, g);
        if (inWTowerHero !== inWTowerMon) continue;
        m.mstrategy = (m.mstrategy | 0) & ~STRAT_AGGR_MASK;
        m.msleeping = 0;
        const can = m.mcanmove === undefined ? 1 : m.mcanmove | 0;
        if (!can && !rn2(5)) {
            m.mfrozen = 0;
            m.mcanmove = 1;
        }
    }
}

/**
 * C: mon.c m_respond(mtmp) — between flee-teleport and mflee courage in dochug.
 * Medusa → **`gazemu_mhitu.js`** **`gazemuMedusaMrespondMonsterLikeC`** (**`mhitu.c`** **`gazemu`** **`AD_STON`** subset).
 * @param {import('./gstate.js').game} g
 * @param {*} mtmp
 */
export function mRespondMonsterDochugLikeC(g, mtmp) {
    if (!mtmp) return;
    const ptr = raceptr(mtmp);
    if (!ptr) return;
    const mx = mtmp.mx | 0;
    const my = mtmp.my | 0;

    if ((ptr.msound | 0) === MS_SHRIEK && !umDistLikeC(g, mx, my, 1)) {
        if (!heroDeafLikeC(g)) {
            /* C: pline + stop_occupation — display only; no RNG. */
        }
        if (!rn2(10)) {
            const spawned = mRespondShriekerMakemonLikeC(g);
            if (spawned) {
                const mons = g.level?.monsters;
                if (mons) mons.push(spawned);
            }
        }
        aggravateMonstersLikeC(g);
    }

    if ((ptr.mnum | 0) === PM_MEDUSA && couldsee(mx, my)) {
        gazemuMedusaMrespondMonsterLikeC(g, mtmp);
    }

    if ((ptr.mnum | 0) === PM_ERINYS && !(mtmp.mpeaceful | 0) && mCanSeeHeroMonsterLikeC(mtmp)) {
        aggravateMonstersLikeC(g);
    }
}
