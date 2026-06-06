// makemon.js — Create monsters (stub until makemon.c is ported).
// C ref: makemon.c makemon(); rndmonst() path for ptr === null.

import { game } from './gstate.js';
import { depth as depth_of_level } from './hacklib.js';
import {
    MONS_MLET,
    MONS_MLEVEL,
} from './mons_rndmonst_ini_inv_data.js';
import {
    isArmedPtrLikeC,
    isFemalePtrLikeC,
    isMalePtrLikeC,
    isNeuterPtrLikeC,
    permonstFromMndxLikeC,
    throwsRocks,
} from './mondata.js';
import {
    mInitinvMklevLikeC,
    mInitweapMklevLikeC,
} from './makemon_m_initweap_inv_like_c.js';
import { monTrackInitLikeC } from './monflee.js';
import {
    GP_AVOID_MONPOS,
    GP_CHECKSCARY,
    In_sokoban,
    MM_EDOG,
    MM_IGNOREWATER,
    NO_MINVENT,
} from './const.js';
import { newedogLikeC } from './dog.js';
import { enextoCoreLikeC, goodposMakemonLikeC } from './walkable.js';

import { MM_ANGRY, MM_FEMALE, MM_MALE } from './const.js';
import { peaceMindedLikeC } from './makemon_peace_minded.js';
import { rndmonstLikeC } from './makemon_rndmonst.js';
import { deliverObjToMonLikeC, DF_NONE } from './deliver_obj_to_mon.js';
import { d, rnd, rn2 } from './rng.js';

/** C: mondata.h is_ndemon — `mons[mndx].mlet` in S_IMP..S_DEMON. */
function isNdemonMndxLikeC(mndx) {
    const mlet = MONS_MLET[mndx | 0] | 0;
    return mlet >= 5 && mlet <= 10;
}

const PM_WUMPUS = 86;
const PM_LONG_WORM = 114;
/** C: monsters.h **`PM_GIANT_EEL`** (block index 328; was wrongly 326 = piranha). */
const PM_GIANT_EEL = 328;

/** C: dungeon.c level_difficulty — depth of current level. */
function levelDifficultyLikeC() {
    return depth_of_level(game.u?.uz) | 0;
}

/** C: monsters.h LVL() first arg — starting pets (MONS_MLEVEL table still has legacy offset). */
const PM_LITTLE_DOG = 16;
const PM_KITTEN = 34;

/** C: makemon.c adj_lev — simplified for contest mons[0..SPECIAL_PM). */
function adjLevMndxLikeC(mndx) {
    const n = mndx | 0;
    let mlevel = MONS_MLEVEL[n] | 0;
    if (n === PM_LITTLE_DOG || n === PM_KITTEN) mlevel = 2;
    if (mlevel > 49) return 50;
    let tmp = mlevel;
    let tmp2 = levelDifficultyLikeC() - tmp;
    if (tmp2 < 0) tmp--;
    else tmp += Math.trunc(tmp2 / 5);
    tmp2 = (game.u?.ulevel | 0) - mlevel;
    if (tmp2 > 0) tmp += Math.trunc(tmp2 / 4);
    tmp2 = Math.trunc((3 * mlevel) / 2);
    if (tmp2 > 49) tmp2 = 49;
    if (tmp > tmp2) tmp = tmp2;
    return tmp > 0 ? tmp : 0;
}

/**
 * C: makemon.c newmonhp — sets `m_lev = adj_lev(ptr)`; `!m_lev` → `rnd(4)` else `d(m_lev, 8)`; bump if `mhpmax == basehp`.
 * @param {{ m_lev?: number, mhp?: number, mhpmax?: number }} mtmp
 * @param {number} mndx
 */
function newmonhpMtmpLikeC(mtmp, mndx) {
    const mLev = adjLevMndxLikeC(mndx);
    mtmp.m_lev = mLev;
    let basehp = 0;
    let hp;
    if (!mLev) {
        basehp = 1;
        hp = rnd(4);
    } else {
        basehp = mLev;
        hp = d(mLev, 8);
    }
    if (hp === basehp) hp += 1;
    mtmp.mhp = hp;
    mtmp.mhpmax = hp;
}

/**
 * C: makemon(struct permonst *mdat, coordxy x, coordxy y, mmflags_nht mmflags)
 * @returns {{ mx: number, my: number, mhp: number, mhpmax: number, msleeping: number, mpeaceful: number, mtame: number, mnum: number, mcanmove?: number, mfrozen?: number, mvflags?: number }|null}
 */
export function makemon(mdat, x, y, mmflags) {
    let px = x | 0;
    let py = y | 0;
    if (px === 0 && py === 0) {
        px = game.u?.ux | 0;
        py = game.u?.uy | 0;
    }
    const u = game.u;
    const byyou = u && px === (u.ux | 0) && py === (u.uy | 0);
    const gpflags = ((mmflags & MM_IGNOREWATER) ? MM_IGNOREWATER : 0)
        | GP_CHECKSCARY
        | GP_AVOID_MONPOS;
    let ptrForPlacement = null;
    if (mdat && typeof mdat === 'object') {
        if (typeof mdat.mnum === 'number') {
            ptrForPlacement = mdat.data || permonstFromMndxLikeC(mdat.mnum);
        } else if (mdat.data) {
            ptrForPlacement = mdat.data;
        }
    }
    if (byyou && !game.in_mklev && ptrForPlacement) {
        const cc = { x: 0, y: 0 };
        if (
            !enextoCoreLikeC(game, cc, px, py, ptrForPlacement, gpflags)
            && !enextoCoreLikeC(
                game,
                cc,
                px,
                py,
                ptrForPlacement,
                gpflags & ~GP_CHECKSCARY,
            )
        ) {
            return null;
        }
        px = cc.x;
        py = cc.y;
        if (typeof globalThis.__diagMakemonEnextoLikeC === 'function') {
            globalThis.__diagMakemonEnextoLikeC(
                game, game.u?.ux | 0, game.u?.uy | 0, ptrForPlacement, gpflags, cc,
            );
        }
    }
    let mnum = 0;
    if (mdat === null) {
        let tryct = 0;
        mnum = -1;
        do {
            const picked = rndmonstLikeC();
            if (picked < 0) return null;
            const fakemon = { data: permonstFromMndxLikeC(picked), mnum: picked, mx: 0, my: 0, wormno: 0 };
            const posOk = goodposMakemonLikeC(px, py, fakemon, gpflags, game);
            const ok = !(
                (tryct === 0 && throwsRocks(fakemon.data) && In_sokoban(game.u?.uz))
                || !posOk
            );
            if (ok) {
                mnum = picked;
                break;
            }
        } while (++tryct <= 50);
        if (mnum < 0) return null;
    } else if (mdat && typeof mdat === 'object' && typeof mdat.mnum === 'number') {
        mnum = mdat.mnum | 0;
    }
    rnd(2); /* C: makemon.c mtmp->m_id = next_ident() */
    const mtmp = {
        mx: px,
        my: py,
        mhp: 0,
        mhpmax: 0,
        msleeping: 0,
        mpeaceful: 0,
        mtame: 0,
        mnum,
        data: permonstFromMndxLikeC(mnum),
        mcanmove: 1,
        mcansee: 1,
        mfrozen: 0,
        mflee: 0,
        mfleetim: 0,
        movement: 0,
        mgenmklev: 0,
        mstrategy: 0,
    };
    newmonhpMtmpLikeC(mtmp, mnum);
    monTrackInitLikeC(mtmp);
    mtmp.mgenmklev = game.in_mklev ? 1 : 0;
    const allowMinvent = (mmflags & NO_MINVENT) === 0;
    /* C: makemon.c — femaleok/maleok; fixed gender skips `rn2(2)` in else branch. */
    const ptr = mtmp.data;
    const femaleok = !isMalePtrLikeC(ptr) && !isNeuterPtrLikeC(ptr);
    const maleok = !isFemalePtrLikeC(ptr) && !isNeuterPtrLikeC(ptr);
    const mm = mmflags | 0;
    if (isFemalePtrLikeC(ptr) || ((mm & MM_FEMALE) !== 0 && femaleok)) {
        mtmp.female = 1;
    } else if (isMalePtrLikeC(ptr) || ((mm & MM_MALE) !== 0 && maleok)) {
        mtmp.female = 0;
    } else if (femaleok) {
        mtmp.female = rn2(2);
    } else {
        mtmp.female = 0;
    }
    /* C: makemon.c sets mpeaceful via peace_minded(ptr) for every monster; gate to
     * MM_EDOG until mklev makemon volume matches C (avoids stray rn2 on seed8000). */
    if ((mmflags | 0) & MM_EDOG) {
        mtmp.mpeaceful = ((mmflags | 0) & MM_ANGRY) ? 0 : (peaceMindedLikeC(game, ptr) ? 1 : 0);
    }
    if ((mmflags | 0) & MM_EDOG) {
        newedogLikeC(mtmp);
    }
    if (allowMinvent) {
        if (isArmedPtrLikeC(ptr)) {
            mInitweapMklevLikeC(mtmp);
        }
        mInitinvMklevLikeC(mtmp);
        /* C: makemon.c — `!rn2(100)` domestic saddle (starting pet uses NO_MINVENT). */
        if (!rn2(100)) {
            /* put_saddle_on_mon — not ported */
        }
    }
    if (game.in_mklev && !game.u?.uhave?.amulet) {
        const n = mnum | 0;
        /* C: makemon.c — `rn2(5)` only if ndemon/wumpus/worm/eel (short-circuit). */
        if (
            (isNdemonMndxLikeC(n)
                || n === (PM_WUMPUS | 0)
                || n === (PM_LONG_WORM | 0)
                || n === (PM_GIANT_EEL | 0))
            && rn2(5)
        ) {
            mtmp.msleeping = 1;
        }
    }
    if (allowMinvent && game.migratingObjs?.length) {
        deliverObjToMonLikeC(game, mtmp, 1, DF_NONE);
    }
    const mons = game.level?.monsters;
    if (mons) mons.unshift(mtmp);
    else if (game.level) game.level.monsters = [mtmp];
    return mtmp;
}

/** @deprecated Use rndmonstLikeC — legacy stub for mkcorpstat until ported. */
export function rndmonnum() {
    return rndmonstLikeC();
}

/**
 * C: makemon.c grow_up — victim-kill HP gain subset (**`rnd(victim.m_lev+1)`**, optional **`rn2`**).
 * Returns permonst ptr on success; null if monster died (genocide grow).
 *
 * @param {Record<string, unknown>} mtmp
 * @param {Record<string, unknown>|null} victim
 * @returns {Record<string, unknown>|null}
 */
export function growUpLikeC(mtmp, victim) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return null;
    const ptr = mtmp.data;
    if (!ptr) return ptr;

    let maxIncrease;
    let curIncrease;
    let hpThreshold;

    if (victim) {
        hpThreshold = (mtmp.m_lev | 0) * 8;
        if (!(mtmp.m_lev | 0)) hpThreshold = 4;
        maxIncrease = rnd((victim.m_lev | 0) + 1);
        if ((mtmp.mhpmax | 0) + maxIncrease > hpThreshold + 1) {
            maxIncrease = Math.max((hpThreshold + 1) - (mtmp.mhpmax | 0), 0);
        }
        curIncrease = maxIncrease > 1 ? rn2(maxIncrease) : 0;
    } else {
        maxIncrease = rnd(8);
        curIncrease = maxIncrease;
        hpThreshold = 0;
    }

    mtmp.mhpmax = (mtmp.mhpmax | 0) + maxIncrease;
    mtmp.mhp = (mtmp.mhp | 0) + curIncrease;
    if ((mtmp.mhpmax | 0) <= hpThreshold) return ptr;

    mtmp.m_lev = (mtmp.m_lev | 0) + 1;
    return ptr;
}
