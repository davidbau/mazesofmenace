// makemon.js — Create monsters (stub until makemon.c is ported).
// C ref: makemon.c makemon(); rndmonst() path for ptr === null.

import { game } from './gstate.js';
import { depth as depth_of_level } from './hacklib.js';
import {
    MONS_MLET,
    MONS_MFLAGS2,
    MONS_MLEVEL,
} from './mons_rndmonst_ini_inv_data.js';
import { permonstFromMndxLikeC, throwsRocks } from './mondata.js';
import { monTrackInitLikeC } from './monflee.js';
import { GP_AVOID_MONPOS, GP_CHECKSCARY, In_sokoban, MM_IGNOREWATER } from './const.js';
import { goodposMakemonLikeC } from './walkable.js';

/** C: monflag.h M2_NEUTER */
const M2_NEUTER = 0x00040000;
import { rndmonstLikeC } from './makemon_rndmonst.js';
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

/** C: makemon.c adj_lev — simplified for contest mons[0..SPECIAL_PM). */
function adjLevMndxLikeC(mndx) {
    const mlevel = MONS_MLEVEL[mndx | 0] | 0;
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

/** C: makemon.c **`newmonhp`** when **`!m_lev`** — **`rnd(4)`**, bump if **`mhpmax == basehp`**. */
function newmonhpRnd4BoostLikeC() {
    let hp = rnd(4);
    if (hp === 1) hp = 2;
    return hp;
}

/** C: makemon.c newmonhp — `!m_lev` → `rnd(4)`; else `d(m_lev, 8)` + min-2 boost. */
function newmonhpMndxLikeC(mndx) {
    const mLev = adjLevMndxLikeC(mndx);
    if (!mLev) return newmonhpRnd4BoostLikeC();
    let hp = d(mLev, 8);
    if (hp === mLev) hp += 1;
    return hp;
}

/** C: makemon.c m_initinv — comparisons still evaluate `rn2(50)` / `rn2(100)`. */
function mInitinvMklevLikeC(mLev) {
    void mLev;
    if ((mLev | 0) > rn2(50)) {
        /* rnd_defensive_item — not ported */
    }
    if ((mLev | 0) > rn2(100)) {
        /* rnd_misc_item — not ported */
    }
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
    let mnum = 0;
    if (mdat === null) {
        let tryct = 0;
        mnum = -1;
        do {
            const picked = rndmonstLikeC();
            if (picked < 0) return null;
            const fakemon = { data: permonstFromMndxLikeC(picked), mnum: picked, mx: 0, my: 0, wormno: 0 };
            const gpflags = ((mmflags & MM_IGNOREWATER) ? MM_IGNOREWATER : 0)
                | GP_CHECKSCARY
                | GP_AVOID_MONPOS;
            const posOk = goodposMakemonLikeC(
                px,
                py,
                fakemon,
                gpflags,
                game,
                game.in_mklev ? { skipLandEelRn2: true } : {}
            );
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
    /* C: fill_ordinary_room **`rndmonst`** — **`newmonhp`** with **`m_lev==0`** → one **`rnd(4)`** only. */
    const hp = (game.in_mklev && mdat === null)
        ? newmonhpRnd4BoostLikeC()
        : newmonhpMndxLikeC(mnum);
    const mtmp = {
        mx: px,
        my: py,
        mhp: hp,
        mhpmax: hp,
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
    monTrackInitLikeC(mtmp);
    mtmp.m_lev = (game.in_mklev && mdat === null) ? 0 : adjLevMndxLikeC(mnum);
    mtmp.mgenmklev = game.in_mklev ? 1 : 0;
    /* C: makemon.c — `femaleok = !is_male(ptr) && !is_neuter(ptr)`; neuter skips `rn2(2)`. */
    const femaleok = ((MONS_MFLAGS2[mnum | 0] | 0) & M2_NEUTER) === 0;
    if (femaleok) {
        void rn2(2); /* mtmp->female = rn2(2) */
    }
    mInitinvMklevLikeC(adjLevMndxLikeC(mnum));
    /* C: makemon.c allow_minvent — `!rn2(100)` evaluated before `is_domestic` short-circuit. */
    if (!rn2(100)) {
        /* put_saddle_on_mon — not ported */
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
    const mons = game.level?.monsters;
    if (mons) mons.unshift(mtmp);
    else if (game.level) game.level.monsters = [mtmp];
    return mtmp;
}

/** @deprecated Use rndmonstLikeC — legacy stub for mkcorpstat until ported. */
export function rndmonnum() {
    return rndmonstLikeC();
}
