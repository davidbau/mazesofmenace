// gazemu_mhitu.js — C mhitu.c gazemu() subset for Medusa m_respond (AD_STON gaze).
// C ref: mhitu.c gazemu ~1668–1897 (AD_STON + **`react`** tail); mon.c m_respond_medusa ~4107–4117.

import {
    G_GENOD,
    M_ATTK_AGR_DIED,
    M_ATTK_MISS,
    PM_MEDUSA,
    PM_STONE_GOLEM,
    STONE_RES,
    REFLECTING,
} from './const.js';
import { rn1, rn2 } from './rng.js';
import { couldsee, cansee } from './vision.js';
import { losehp } from './mthrowu.js';
import { mCanSeeHeroMonsterLikeC } from './mon_seen_res.js';
import { permonstHuman } from './mondata.js';

/** C: monattk.h */
const AT_GAZE = 15;
/** C: monattk.h */
const AD_STON = 18;
/** C: defsym.h MONSYM — S_GOLEM */
const S_GOLEM = 55;
/** C: mhitu.c **`reactions[]`** length for **`rn2(SIZE(reactions))`**. */
const GAZEMU_REACT_SZ = 8;

/**
 * C: mhitu.c tail **`if (react >= 0)`** — Hallucination **`rn2(3)`** + **`rn2(SIZE)`**;
 * **`pline_mon`** prefix **`!rn2(3)`** / **`!rn2(2)`** ( **`already`** always false for **`AD_STON`** unaware in practice).
 * @param {import('./gstate.js').game} g
 * @param {number} react
 * @param {boolean} already
 */
function gazemuCancelledReactTailLikeC(g, react, already) {
    if (react < 0) return;
    let r = react;
    if (heroHallucinationGazemuLikeC(g) && rn2(3) !== 0) r = rn2(GAZEMU_REACT_SZ);
    void r;
    if (rn2(3) === 0) return;
    if (!already) rn2(2);
}

/**
 * C: mondata.h **`canseemon`** subset — steed / invis / **`cansee`** (see **`kick.js`** / **`trap.js`**).
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
function canseemonGazemuLikeC(g, mtmp) {
    const u = g.u;
    if (!mtmp || !u) return false;
    if (u.usteed === mtmp) return true;
    if ((mtmp.minvis | 0) && !(u.See_invisible | 0)) return false;
    return cansee(mtmp.mx | 0, mtmp.my | 0);
}

function heroHallucinationGazemuLikeC(g) {
    const u = g.u;
    if (!u) return false;
    return !!(u.Hallucination | 0) || (u.timed?.hallucination ?? 0) > 0;
}

/** C: **`prop.h`** **`Stone_resistance`** — **`u.uprops[STONE_RES]`** intrinsic/extrinsic subset. */
function heroStoneResistanceGazemuLikeC(g) {
    const st = g.u?.uprops?.[STONE_RES];
    return ((st?.intrinsic | 0) | (st?.extrinsic | 0)) !== 0;
}

/** C: **`prop.h`** **`Reflecting`** + **`EReflecting`** subset (**`god_zaps_hero.js`** pattern). */
function heroReflectingGazemuLikeC(g) {
    const u = g.u;
    if (!u) return false;
    if (u.Reflecting | 0) return true;
    return ((u.uprops?.[REFLECTING]?.extrinsic | 0) !== 0);
}

/**
 * C: mondata.c **`poly_when_stoned`** — non–stone-golem golems become stone golem unless genocided.
 * @param {import('./gstate.js').game} g
 */
function polyWhenStonedHeroGazemuLikeC(g) {
    const ptr = g.youmonst?.data ?? permonstHuman;
    if ((ptr.mlet | 0) !== S_GOLEM) return false;
    if ((ptr.mnum | 0) === PM_STONE_GOLEM) return false;
    if (((g.mvitals?.[PM_STONE_GOLEM]?.mvflags | 0) & G_GENOD) !== 0) return false;
    return true;
}

/**
 * C: polyself.c **`polymon(PM_STONE_GOLEM)`** — minimal success path (**`rn1(500,500)`** timer only).
 * Omits conduct, **`set_uasmon`**, gender **`rn2(10)`**, **`make_stoned`**, inventory tails.
 * @returns {number} **1** if poly “succeeded”, **0** if genocided (C early return).
 */
function polymonStoneGolemGazemuMinimalLikeC(g) {
    const u = g.u;
    if (!u) return 0;
    const mndx = PM_STONE_GOLEM;
    if (((g.mvitals?.[mndx]?.mvflags | 0) & G_GENOD) !== 0) return 0;
    u.mtimedone = rn1(500, 500);
    u.umonnum = mndx;
    u.Upolyd = 1;
    g.youmonst = g.youmonst || {};
    g.youmonst.mnum = mndx;
    g.youmonst.data = {
        mlet: S_GOLEM,
        mnum: mndx,
        mflags1: 0,
        mflags2: 0,
        mflags3: 0,
        msize: 3,
        mmove: 12,
        mlevel: 14,
        ac: 2,
        mvflags: 0,
        mresists: 0,
    };
    return 1;
}

/**
 * C: muse.c **`mon_reflects`** — inventory not ported; always false until **`which_armor`** on mons.
 * @returns {boolean}
 */
function monReflectsGazemuStubLikeC() {
    return false;
}

function removeMonsterFromLevelGazemuLikeC(g, mtmp) {
    const mons = g.level?.monsters;
    if (!mons?.length) return;
    const i = mons.indexOf(mtmp);
    if (i >= 0) mons.splice(i, 1);
    mtmp.mhp = 0;
}

/**
 * C: mhitu.c **`gazemu(mtmp, mattk)`** — **`AD_STON`** branch + shared **`react`** tail.
 * Omits **`pline`/`You`/`done(STONING)`** display; **`killed`/`monstone`** → **`removeMonsterFromLevelGazemuLikeC`**;
 * hero stoning → **`losehp`** only (**`end.c`** **`really_done`** not ported).
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {{ adtyp?: number, aatyp?: number }} mattk
 * @returns {number} **`M_ATTK_*`**
 */
export function gazemuMonsterHeroAdStonLikeC(g, mtmp, mattk) {
    if (!mtmp || !g.u) return M_ATTK_MISS;
    if ((mattk?.adtyp | 0) !== AD_STON) return M_ATTK_MISS;

    const mx = mtmp.mx | 0;
    const my = mtmp.my | 0;
    const ptr = /** @type {{ mnum?: number }} */ (mtmp.data) || {};
    const isMedusa = (mtmp.mnum | 0) === PM_MEDUSA || (ptr.mnum | 0) === PM_MEDUSA;

    /* C: `m_seenres(mtmp, cvt_adtyp_to_mseenres(AD_STON))` — **`M_SEEN_NOTHING`** (0); never skips. */

    const reflectable = heroReflectingGazemuLikeC(g) && couldsee(mx, my) && isMedusa;
    let cancelled = (mtmp.mcan | 0) !== 0;
    const unaware = (g.u.Unaware | 0) !== 0;
    if ((heroHallucinationGazemuLikeC(g) && rn2(4) !== 0) || (unaware && !reflectable)) cancelled = true;

    const mcansee = mtmp.mcansee === 0 ? 0 : 1;
    /** C: `mcanseeu` — used by other **`adtyp`**; keep for parity if **`mcansee`** wiring changes. */
    void (canseemonGazemuLikeC(g, mtmp) && couldsee(mx, my) && mcansee !== 0);

    let react = -1;
    const already = false;

    if (cancelled || !mcansee) {
        if (!canseemonGazemuLikeC(g, mtmp)) {
            /* silently */
        } else if (unaware) {
            react = isMedusa ? 4 : 2;
        } else if (isMedusa && heroHallucinationGazemuLikeC(g) && rn2(3) === 0) {
            /* pline "Someone seems overdue…" */
        } else {
            /* pline_mon ineffectual gaze */
        }
        gazemuCancelledReactTailLikeC(g, react, already);
        return M_ATTK_MISS;
    }

    if (reflectable) {
        const useeit = canseemonGazemuLikeC(g, mtmp);
        void useeit; /* C: ureflects — display only */
        if (monReflectsGazemuStubLikeC()) return M_ATTK_MISS;
        if (!mCanSeeHeroMonsterLikeC(mtmp)) return M_ATTK_MISS;
        g.stoned = 1;
        removeMonsterFromLevelGazemuLikeC(g, mtmp);
        g.stoned = 0;
        if ((mtmp.mhp | 0) > 0) return M_ATTK_MISS;
        return M_ATTK_AGR_DIED;
    }

    if (
        canseemonGazemuLikeC(g, mtmp) &&
        couldsee(mx, my) &&
        !heroStoneResistanceGazemuLikeC(g) &&
        !unaware
    ) {
        if (polyWhenStonedHeroGazemuLikeC(g) && polymonStoneGolemGazemuMinimalLikeC(g)) {
            return M_ATTK_MISS;
        }
        const u = g.u;
        const hp = u.uhp | 0;
        if (hp > 0) losehp(hp + 999, '', 0);
        return M_ATTK_MISS;
    }

    return M_ATTK_MISS;
}

/**
 * C: mon.c **`m_respond_medusa`** — first **`AT_GAZE`** attack (**`AD_STON`** for Medusa).
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export function gazemuMedusaMrespondMonsterLikeC(g, mtmp) {
    const mattkList = /** @type {readonly { aatyp?: number, adtyp?: number }[]|undefined} */ (
        /** @type {{ mattk?: readonly { aatyp?: number, adtyp?: number }[] }} */ (mtmp.data)?.mattk
    );
    let mattk = /** @type {{ aatyp: number, adtyp: number }} */ ({ aatyp: AT_GAZE, adtyp: AD_STON });
    if (mattkList?.length) {
        const found = mattkList.find((a) => (a.aatyp | 0) === AT_GAZE);
        if (found) mattk = { aatyp: found.aatyp | 0, adtyp: found.adtyp | 0 };
    }
    return gazemuMonsterHeroAdStonLikeC(g, mtmp, mattk);
}
