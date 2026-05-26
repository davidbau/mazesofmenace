// keepdogs_hero.js — dog.c keepdogs() subset for goto_level.
// C ref: dog.c keepdogs(), mondata.c levl_follower(); mon.c helpless().

import {
    STRAT_WAITFORU,
    ESHK,
    EPRI,
    EGD,
    NO_TRAP_FLAGS,
    MIGR_EXACT_XY,
    M_AP_NOTHING,
    ROOMOFFSET,
} from './const.js';
import { pline, newsym } from './display.js';
import { onLevelLikeC } from './hacklib.js';
import { monnearMonsterXYLikeC } from './mon_geom.js';
import {
    levlFollowerLikeC,
    monHasAmulet,
    humanoidLikeC,
    raceptr,
} from './mondata.js';
import { migrateMonToLevelLikeC } from './mon_limbo.js';
import { cansee } from './vision.js';
import { mintrap, mUnleashMonLikeC } from './trap.js';
import { mdropSpecialObjsHeroLikeC } from './vault_hero.js';

/** C: mon.c **`helpless(mtmp)`** — **`mfrozen`/`mcanmove`** subset. */
function helplessMonsterKeepdogsLikeC(mtmp) {
    if (!mtmp) return false;
    if ((mtmp.mfrozen | 0) > 0) return true;
    return (mtmp.mcanmove | 0) === 0;
}

/** C: mondata.h **`canseemon`** subset for **`keepdogs`** plines. */
function canseemonKeepdogsLikeC(g, mtmp) {
    const u = g.u;
    if (!mtmp || !u) return false;
    if (u.usteed === mtmp) return true;
    if ((mtmp.minvis | 0) && !(u.See_invisible | 0)) return false;
    return cansee(mtmp.mx, mtmp.my);
}

/** C: mon.c **`Monnam`** — stub until **`x_monnam`**. */
function monnamKeepdogsLikeC(mtmp) {
    const n = mtmp?.data?.mname || mtmp?.monnam;
    if (n) return `the ${n}`;
    return 'the monster';
}

/** C: monst.h **`MAX_NUM_WORMS`** — segment count cap during migration. */
const MAX_NUM_WORMS = 32;

/** C: defsym **`S_MIMIC`** (monster class letter). */
const S_MIMIC = 13;

/**
 * C: dogmove.c **`finish_meating(mtmp)`** — clear eating; reset non-mimic appearance.
 * @param {import('./gstate.js').game} g
 */
export function finishMeatingHeroLikeC(g, mtmp) {
    if (!mtmp) return;
    mtmp.meating = 0;
    const ap = mtmp.m_ap_type | 0;
    const mlet = raceptr(mtmp)?.mlet | 0;
    if (ap !== M_AP_NOTHING && mlet !== S_MIMIC) {
        mtmp.m_ap_type = M_AP_NOTHING;
        mtmp.mappearance = 0;
        const mx = mtmp.mx | 0;
        const my = mtmp.my | 0;
        if (mx) newsym(mx, my);
    }
    void g;
}

/** C: worm.c **`count_wsegs`** — 0 when worm tail chains not modeled on level. */
function countWsegsHeroLikeC(g, mtmp) {
    const wn = mtmp.wormno | 0;
    if (!wn) return 0;
    const tail = g.level?.wormTails?.[wn];
    if (!tail) return 0;
    let n = 0;
    for (let s = tail.nseg; s; s = s.nseg) n++;
    return n;
}

/** C: worm.c **`wormgone`** — discard tail chain; clear live **`wormno`** index. */
function wormgoneHeroLikeC(g, mtmp) {
    const wn = mtmp.wormno | 0;
    if (!wn) return;
    if (g.level?.wormTails) delete g.level.wormTails[wn];
    if (g.level?.wormHeads) g.level.wormHeads[wn] = null;
    mtmp.wormno = 0;
}

/** C: shk.c **`set_residency(shkp, TRUE)`** — clear shop **`resident`** when shk leaves level. */
function setResidencyShkClearLikeC(g, mtmp) {
    const e = ESHK(mtmp);
    const shoproom = e?.shoproom | 0;
    if (!shoproom || !g.level?.rooms) return;
    const r = g.level.rooms[shoproom - ROOMOFFSET];
    if (r) r.resident = null;
}

/**
 * C: dog.c **`mon_leave(mtmp)`** — minvent **`no_charge`**, shk residency, worm segment count.
 * @returns {number} tail segment count for migration **`wormno`** overload
 */
export function monLeaveHeroLikeC(g, mtmp) {
    if (!mtmp) return 0;
    for (let obj = mtmp.minvent; obj; obj = obj.nobj) {
        obj.no_charge = 0;
    }
    if (mtmp.isshk) setResidencyShkClearLikeC(g, mtmp);

    let numSegs = 0;
    if (mtmp.wormno) {
        const mx = mtmp.mx | 0;
        const my = mtmp.my | 0;
        numSegs = countWsegsHeroLikeC(g, mtmp);
        if (numSegs > MAX_NUM_WORMS - 1) numSegs = MAX_NUM_WORMS - 1;
        wormgoneHeroLikeC(g, mtmp);
        if (mx) {
            mtmp.mx = mx;
            mtmp.my = my;
        }
    }
    return numSegs;
}

/** C: dog.c **`keep_mon_accessible`**. */
function keepMonAccessibleLikeC(g, mtmp) {
    if (mtmp?.iswiz) return true;
    const uz = g.u?.uz;
    if (!uz || !mtmp?.mextra) return false;
    if ((mtmp.isshk | 0) && ESHK(mtmp)?.shoplevel && !onLevelLikeC(uz, ESHK(mtmp).shoplevel)) {
        return true;
    }
    if ((mtmp.ispriest | 0) && EPRI(mtmp)?.shrlevel && !onLevelLikeC(uz, EPRI(mtmp).shrlevel)) {
        return true;
    }
    if ((mtmp.isgd | 0) && EGD(mtmp)?.gdlevel && !onLevelLikeC(uz, EGD(mtmp).gdlevel)) {
        return true;
    }
    return false;
}

/**
 * C: dog.c **`keepdogs(boolean pets_only)`** — pets / followers near hero → **`gm.mydogs`**.
 * Deferred: full **`worm.c`** tail map when long worms spawn.
 * @param {import('./gstate.js').game} g
 * @param {boolean} petsOnly
 */
export async function keepdogsHeroLikeC(g, petsOnly) {
    g.gd = g.gd || {};
    g.gd.keepdogs_last_pets_only = !!petsOnly;

    const u = g.u;
    const mons = g.level?.monsters;
    if (!u || !mons?.length) {
        g.gd.keepdogs_last_tame_seen = 0;
        return;
    }

    const ux = u.ux | 0;
    const uy = u.uy | 0;
    const uhaveAmulet = !!(u.uhave?.amulet);
    let tame = 0;

    for (let i = mons.length - 1; i >= 0; i--) {
        const mtmp = mons[i];
        if (!mtmp || (mtmp.mhp | 0) <= 0) continue;

        if ((mtmp.mtame | 0) > 0) {
            tame++;
            if (petsOnly) {
                mtmp.mtrapped = 0;
                finishMeatingHeroLikeC(g, mtmp);
                mtmp.msleeping = 0;
                mtmp.mfrozen = 0;
                mtmp.mcanmove = 1;
            }
        }

        const follows =
            ((monnearMonsterXYLikeC(mtmp, ux, uy) && levlFollowerLikeC(g, mtmp))
                || (uhaveAmulet && (mtmp.iswiz | 0)))
            && (!helplessMonsterKeepdogsLikeC(mtmp) || mtmp === u.usteed)
            && !((mtmp.mstrategy | 0) & STRAT_WAITFORU);

        if (follows) {
            if (mtmp.mtrapped) await mintrap(mtmp, NO_TRAP_FLAGS);

            let stayBehind = false;

            if (mtmp === u.usteed) {
                mtmp.mtrapped = 0;
                mtmp.meating = 0;
                mdropSpecialObjsHeroLikeC(g, mtmp);
            } else if ((mtmp.meating | 0) || (mtmp.mtrapped | 0)) {
                if (canseemonKeepdogsLikeC(g, mtmp)) {
                    const who = monnamKeepdogsLikeC(mtmp);
                    const what = (mtmp.meating | 0) ? 'eating' : 'trapped';
                    await pline(`${who} is still ${what}.`);
                }
                stayBehind = true;
            } else if (monHasAmulet(mtmp)) {
                if (canseemonKeepdogsLikeC(g, mtmp)) {
                    await pline(`${monnamKeepdogsLikeC(mtmp)} seems very disoriented for a moment.`);
                }
                stayBehind = true;
            }

            if (stayBehind) {
                if (mtmp.mleashed) {
                    const ptr = raceptr(mtmp);
                    const pron = humanoidLikeC(ptr)
                        ? ((mtmp.female | 0) ? 'Her' : 'His')
                        : 'Its';
                    await pline(`${pron} leash suddenly comes loose.`);
                    await mUnleashMonLikeC(g, mtmp, false);
                }
                continue;
            }

            const numSegs = monLeaveHeroLikeC(g, mtmp);
            const mx = mtmp.mx | 0;
            const my = mtmp.my | 0;
            mons.splice(i, 1);
            if (!g.mydogs) g.mydogs = [];
            g.mydogs.push({
                mtmp,
                xWas: mx,
                yWas: my,
                wormno: numSegs,
                mlstmv: g.moves | 0,
            });
            mtmp.mx = 0;
            mtmp.my = 0;
            if (mx) newsym(mx, my);
            continue;
        }

        if (keepMonAccessibleLikeC(g, mtmp)) {
            const uz = u.uz;
            if (uz) migrateMonToLevelLikeC(g, mtmp, uz, MIGR_EXACT_XY);
            continue;
        }

        if (mtmp.mleashed) {
            await pline(`${monnamKeepdogsLikeC(mtmp)}'s leash goes slack.`);
            await mUnleashMonLikeC(g, mtmp, false);
        }
    }

    g.gd.keepdogs_last_tame_seen = tame;
}

/** @deprecated alias — use **`keepdogsHeroLikeC`**. */
export const keepdogsHeroStubLikeC = keepdogsHeroLikeC;
