// mon_arrive.js — C dog.c mon_arrive subset (migrating_mons on level entry).
// C ref: dog.c mon_arrive(), mon_catchup_elapsed_time(); stairs.c stairway_find*.

import {
    COLNO, ROWNO, ROOMOFFSET, MAGIC_PORTAL,
    MIGR_RANDOM, MIGR_APPROX_XY, MIGR_EXACT_XY,
    MIGR_STAIRS_UP, MIGR_STAIRS_DOWN, MIGR_LADDER_UP, MIGR_LADDER_DOWN,
    MIGR_SSTAIRS, MIGR_PORTAL, MIGR_WITH_HERO, MIGR_LEFTOVERS,
    In_endgame, IS_WALL,
    MON_STILL_ARRIVING, MON_MIGRATING, MON_LIMBO,
    MON_ARRIVE_WITH_YOU, MON_ARRIVE_BEFORE_YOU, MON_ARRIVE_AFTER_YOU, WIZ_ARRIVE,
} from './const.js';
import { rn1, rn2 } from './rng.js';
import { newsym } from './display.js';
import { insideRoomLikeC } from './hacklib.js';
import { goodposNullMonLikeC, goodposNewMonster, enextoNearMon } from './walkable.js';
import { monArriveLeftoversDeliverLikeC } from './deliver_obj_to_mon.js';
import { stairwayFindFromLikeC, stairwayFindLikeC } from './decor.js';
import { inRoomsTypewantedRoomnos } from './shop.js';
import { dealWithOvercrowding, mIntoLimbo } from './mon_limbo.js';

/**
 * C: dog.c `mon_catchup_elapsed_time` — status timers + rn2 recovery (subset).
 * @param {object} mtmp
 * @param {number} nmv
 */
function monCatchupElapsedTimeLikeC(mtmp, nmv) {
    let imv = nmv | 0;
    if (imv <= 0) return;
    if (imv > 0x7fffffff) imv = 0x7fffffff;

    if (mtmp.mblinded) {
        mtmp.mblinded = imv >= (mtmp.mblinded | 0) ? 1 : (mtmp.mblinded | 0) - imv;
    }
    if (mtmp.mfrozen) {
        mtmp.mfrozen = imv >= (mtmp.mfrozen | 0) ? 1 : (mtmp.mfrozen | 0) - imv;
    }
    if (mtmp.mfleetim) {
        mtmp.mfleetim = imv >= (mtmp.mfleetim | 0) ? 1 : (mtmp.mfleetim | 0) - imv;
    }
    if (mtmp.mtrapped && rn2(imv + 1) > 20) mtmp.mtrapped = 0;
    if (mtmp.mconf && rn2(imv + 1) > 25) mtmp.mconf = 0;
    if (mtmp.mstun && rn2(imv + 1) > 5) mtmp.mstun = 0;
}

/** C: mkroom.c `somex` / `somey` */
function somexMonArriveLikeC(croom) {
    return rn1((croom.hx | 0) - (croom.lx | 0) + 1, croom.lx | 0);
}

function someyMonArriveLikeC(croom) {
    return rn1((croom.hy | 0) - (croom.ly | 0) + 1, croom.ly | 0);
}

/** C: mkroom.c `somexy` — irregular themed rooms + subroom avoidance. */
function somexyMonArriveLikeC(g, croom, c) {
    const lvl = g.level;
    if (!lvl || !croom) return false;
    if (croom.irregular) {
        const roomno = (croom.roomnoidx | 0) + ROOMOFFSET;
        let tryct = 0;
        while (tryct++ < 100) {
            c.x = somexMonArriveLikeC(croom);
            c.y = someyMonArriveLikeC(croom);
            const loc = lvl.at(c.x, c.y);
            if (loc && !loc.edge && (loc.roomno | 0) === roomno) return true;
        }
        for (let x = croom.lx | 0; x <= (croom.hx | 0); x++) {
            for (let y = croom.ly | 0; y <= (croom.hy | 0); y++) {
                const loc = lvl.at(x, y);
                if (loc && !loc.edge && (loc.roomno | 0) === roomno) {
                    c.x = x;
                    c.y = y;
                    return true;
                }
            }
        }
        return false;
    }
    if (!(croom.nsubrooms | 0)) {
        c.x = somexMonArriveLikeC(croom);
        c.y = someyMonArriveLikeC(croom);
        return true;
    }
    let tryct = 0;
    while (tryct++ < 100) {
        c.x = somexMonArriveLikeC(croom);
        c.y = someyMonArriveLikeC(croom);
        const loc = lvl.at(c.x, c.y);
        if (loc && IS_WALL(loc.typ)) continue;
        let inSub = false;
        for (let i = 0; i < (croom.nsubrooms | 0); i++) {
            const sub = croom.sbrooms?.[i];
            if (sub && insideRoomLikeC(g, sub, c.x, c.y)) {
                inSub = true;
                break;
            }
        }
        if (!inSub) return true;
    }
    return false;
}

/**
 * C: dog.c `mon_arrive` wander block after locale resolved.
 * @param {import('./gstate.js').game} g
 */
function monArriveWanderLikeC(g, xlocale, ylocale, wander) {
    const w = wander | 0;
    if (!w) return { x: xlocale | 0, y: ylocale | 0 };

    const rnos = inRoomsTypewantedRoomnos(g, xlocale, ylocale, 0);
    if (rnos.length) {
        const croom = g.level?.rooms?.[(rnos[0] | 0) - ROOMOFFSET];
        const c = { x: 0, y: 0 };
        if (croom && somexyMonArriveLikeC(g, croom, c)) return c;
        return { x: 0, y: 0 };
    }

    let i = Math.max(1, (xlocale | 0) - w);
    let j = Math.min(COLNO - 1, (xlocale | 0) + w);
    const x = rn1(j - i, i);
    i = Math.max(0, (ylocale | 0) - w);
    j = Math.min(ROWNO - 1, (ylocale | 0) + w);
    const y = rn1(j - i, i);
    return { x, y };
}

/**
 * C: dog.c `mon_arrive` — resolve destination before `MIGR_LEFTOVERS` delivery.
 * @param {import('./gstate.js').game} g
 * @param {object} entry
 * @returns {{ xlocale: number, ylocale: number, wander: number }}
 */
function resolveMonArriveLocaleLikeC(g, entry) {
    const u = g.u;
    const mtmp = entry.mtmp;
    const xyloc = entry.migrateTyp | 0;
    const fromdlev = {
        dnum: entry.fromDnum ?? u?.uz?.dnum ?? 0,
        dlevel: entry.fromDlevel ?? u?.uz?.dlevel ?? 0,
    };

    let xlocale = entry.xWas | 0;
    let ylocale = entry.yWas | 0;
    let wander = 0;

    const moves = g.moves | 0;
    const mlstmv = mtmp?.mlstmv | 0;
    if (mlstmv < moves - 1) {
        const nmv = moves - 1 - mlstmv;
        monCatchupElapsedTimeLikeC(mtmp, nmv);
        wander = Math.min(nmv, 8);
    }

    switch (xyloc) {
    case MIGR_APPROX_XY:
        break;
    case MIGR_EXACT_XY:
        wander = 0;
        break;
    case MIGR_WITH_HERO:
        xlocale = u?.ux | 0;
        ylocale = u?.uy | 0;
        break;
    case MIGR_STAIRS_UP:
    case MIGR_STAIRS_DOWN: {
        const st = stairwayFindFromLikeC(g, fromdlev, false);
        if (st) {
            xlocale = st.sx | 0;
            ylocale = st.sy | 0;
        } else {
            xlocale = 0;
            ylocale = 0;
        }
        break;
    }
    case MIGR_LADDER_UP:
    case MIGR_LADDER_DOWN: {
        const st = stairwayFindFromLikeC(g, fromdlev, true);
        if (st) {
            xlocale = st.sx | 0;
            ylocale = st.sy | 0;
        } else {
            xlocale = 0;
            ylocale = 0;
        }
        break;
    }
    case MIGR_SSTAIRS: {
        const st = stairwayFindLikeC(g, fromdlev);
        if (st) {
            xlocale = st.sx | 0;
            ylocale = st.sy | 0;
        } else {
            xlocale = 0;
            ylocale = 0;
        }
        break;
    }
    case MIGR_PORTAL:
        if (In_endgame(u?.uz)) {
            const box = g.updest;
            if (box) {
                xlocale = rn1((box.nhx | 0) - (box.nlx | 0) + 1, box.nlx | 0);
                ylocale = rn1((box.nhy | 0) - (box.nly | 0) + 1, box.nly | 0);
            }
            break;
        }
        for (const t of g.level?.traps || []) {
            if ((t.ttyp | 0) === MAGIC_PORTAL) {
                xlocale = t.tx | 0;
                ylocale = t.ty | 0;
                break;
            }
        }
        if (!xlocale && !ylocale) {
            xlocale = 0;
            ylocale = 0;
        }
        break;
    default:
    case MIGR_RANDOM:
        xlocale = 0;
        ylocale = 0;
        break;
    }

    if (xyloc === MIGR_EXACT_XY) wander = 0;
    if (xlocale && wander) {
        const w = monArriveWanderLikeC(g, xlocale, ylocale, wander);
        xlocale = w.x;
        ylocale = w.y;
    }

    return { xlocale, ylocale, wander };
}

/**
 * C: mon.c `mnearto(mtmp, x, y, FALSE, RLOC_NOMSG)` — placement subset.
 * @returns {Promise<boolean>}
 */
async function mneartoMonArriveLikeC(g, mtmp, tx, ty) {
    const xi = tx | 0;
    const yi = ty | 0;
    const sx = mtmp.mx | 0;
    const sy = mtmp.my | 0;
    if (sx === xi && sy === yi) return true;

    const blocker = g.level?.monsters?.find(
        (m) => m !== mtmp && (m.mx | 0) === xi && (m.my | 0) === yi,
    );
    if (blocker) {
        const bdest = enextoNearMon(g, xi, yi, blocker);
        if (!bdest) {
            await dealWithOvercrowding(g, blocker);
        } else {
            const bx0 = blocker.mx | 0;
            const by0 = blocker.my | 0;
            blocker.mx = bdest.x | 0;
            blocker.my = bdest.y | 0;
            newsym(bx0, by0);
            newsym(blocker.mx, blocker.my);
        }
    }

    let nx = xi;
    let ny = yi;
    if (!goodposNewMonster(xi, yi, mtmp, g)) {
        const mm = enextoNearMon(g, xi, yi, mtmp);
        if (!mm) return false;
        nx = mm.x | 0;
        ny = mm.y | 0;
    }

    newsym(sx, sy);
    mtmp.mx = nx;
    mtmp.my = ny;
    const mons = g.level?.monsters;
    if (mons && !mons.includes(mtmp)) {
        mons.unshift(mtmp);
    } else if (g.level && !mons) {
        g.level.monsters = [mtmp];
    }
    newsym(nx, ny);
    return true;
}

/**
 * C: dog.c `mon_arrive` — `rloc(mtmp, RLOC_NOMSG)` when locale unset.
 * @param {import('./gstate.js').game} g
 * @param {object} mtmp
 */
function rlocMonArriveLikeC(g, mtmp) {
    return placeMigratingMonRandomLikeC(g, mtmp);
}

/**
 * C: dog.c `mon_arrive` — `MIGR_RANDOM` / `rloc` random placement.
 * @param {import('./gstate.js').game} g
 * @param {object} mtmp
 * @returns {boolean}
 */
function placeMigratingMonRandomLikeC(g, mtmp) {
    let tryLimit = 4000;
    let tx = 0;
    let ty = 0;
    do {
        tx = rn1(COLNO - 3, 2);
        ty = rn2(ROWNO);
        if (!--tryLimit) return false;
    } while (!goodposNullMonLikeC(tx, ty, g));
    mtmp.mx = tx | 0;
    mtmp.my = ty | 0;
    const mons = g.level?.monsters;
    if (mons) mons.unshift(mtmp);
    else if (g.level) g.level.monsters = [mtmp];
    newsym(tx, ty);
    return true;
}

/** C: mon.c relmon — remove from fmon; optional failed_arrivals list */
function relmonFailedArrivalLikeC(g, mtmp) {
    const mons = g.level?.monsters;
    const i = mons ? mons.indexOf(mtmp) : -1;
    if (i >= 0) {
        mons.splice(i, 1);
        const mx = mtmp.mx | 0;
        const my = mtmp.my | 0;
        if (mx) newsym(mx, my);
    }
    mtmp.mx = 0;
    mtmp.my = 0;
    if (!g.failedArrivals) g.failedArrivals = [];
    g.failedArrivals.push(mtmp);
}

/** C: dog.c mon_arrive — prepend to fmon before placement attempt */
function prependFmonMonArriveLikeC(g, mtmp) {
    if (!g.level) return;
    const mons = g.level.monsters;
    if (!mons) g.level.monsters = [mtmp];
    else if (!mons.includes(mtmp)) mons.unshift(mtmp);
}

/**
 * C: dog.c mon_arrive(With_you) — rn2 tame/peaceful vs mnexto near hero.
 * @param {import('./gstate.js').game} g
 */
async function monArriveWithYouLikeC(g, mtmp) {
    const u = g.u;
    if (!u || !mtmp) return false;
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    const blocked = g.level?.monsters?.some(
        (m) => m !== mtmp && (m.mx | 0) === ux && (m.my | 0) === uy,
    );
    const tame = mtmp.mtame | 0;
    const peaceful = mtmp.mpeaceful | 0;
    if (!blocked && !rn2(tame ? 10 : peaceful ? 5 : 2)) {
        mtmp.mx = ux;
        mtmp.my = uy;
        newsym(ux, uy);
        return true;
    }
    const dest = enextoNearMon(g, ux, uy, mtmp);
    if (!dest) {
        await dealWithOvercrowding(g, mtmp);
        return true;
    }
    mtmp.mx = dest.x | 0;
    mtmp.my = dest.y | 0;
    newsym(dest.x, dest.y);
    return true;
}

/**
 * C: dog.c `mon_arrive` — place one migrating monster on current level.
 * @param {import('./gstate.js').game} g
 * @param {object} entry
 * @param {number} when — MON_ARRIVE_* / WIZ_ARRIVE
 * @returns {Promise<boolean>}
 */
async function monArriveOneLikeC(g, entry, when) {
    const mtmp = entry.mtmp;
    if (!mtmp) return false;

    mtmp.mstate = ((mtmp.mstate | 0) | MON_STILL_ARRIVING) & ~(MON_MIGRATING | MON_LIMBO);
    prependFmonMonArriveLikeC(g, mtmp);

    if (mtmp === g.u?.usteed) {
        mtmp.mstate = (mtmp.mstate | 0) & ~MON_STILL_ARRIVING;
        return true;
    }

    if (when === MON_ARRIVE_WITH_YOU) {
        await monArriveWithYouLikeC(g, mtmp);
        mtmp.mstate = (mtmp.mstate | 0) & ~MON_STILL_ARRIVING;
        return true;
    }

    const { xlocale, ylocale } = resolveMonArriveLocaleLikeC(g, entry);
    monArriveLeftoversDeliverLikeC(g, mtmp);

    let placed;
    if (xlocale > 0 && ylocale >= 0) {
        placed = await mneartoMonArriveLikeC(g, mtmp, xlocale, ylocale);
    } else {
        placed = rlocMonArriveLikeC(g, mtmp);
    }

    if (!placed) {
        if ((when | 0) === WIZ_ARRIVE) {
            mIntoLimbo(g, mtmp);
        } else {
            relmonFailedArrivalLikeC(g, mtmp);
        }
    } else {
        mtmp.migflags = (mtmp.migflags | 0) & ~MIGR_LEFTOVERS;
    }
    mtmp.mstate = (mtmp.mstate | 0) & ~MON_STILL_ARRIVING;
    return placed;
}

/**
 * C: dog.c `losedogs` — exact-XY migraters, mydogs, then other migraters; failed → limbo.
 * Shopkeeper dismiss-kops scan deferred.
 * @param {import('./gstate.js').game} g
 */
export async function losedogsLikeC(g) {
    const uz = g.u?.uz;
    if (!uz) return;

    g.failedArrivals = [];
    const dnum = uz.dnum | 0;
    const dlevel = uz.dlevel | 0;

    let mig = g.migratingMons || [];
    let remain = [];
    for (const entry of mig) {
        if ((entry.mux | 0) === dnum && (entry.muy | 0) === dlevel
            && (entry.migrateTyp | 0) === MIGR_EXACT_XY) {
            await monArriveOneLikeC(g, entry, MON_ARRIVE_BEFORE_YOU);
        } else {
            remain.push(entry);
        }
    }
    g.migratingMons = remain;

    const mydogs = g.mydogs || [];
    g.mydogs = [];
    for (const dog of mydogs) {
        const entry = {
            mtmp: dog.mtmp,
            migrateTyp: MIGR_WITH_HERO,
            fromDnum: uz.dnum,
            fromDlevel: uz.dlevel,
            xWas: dog.xWas | 0,
            yWas: dog.yWas | 0,
        };
        if (dog.mtmp) dog.mtmp.mlstmv = dog.mlstmv | 0;
        await monArriveOneLikeC(g, entry, MON_ARRIVE_WITH_YOU);
    }

    mig = g.migratingMons || [];
    remain = [];
    for (const entry of mig) {
        if ((entry.mux | 0) === dnum && (entry.muy | 0) === dlevel
            && (entry.migrateTyp | 0) !== MIGR_EXACT_XY) {
            await monArriveOneLikeC(g, entry, MON_ARRIVE_AFTER_YOU);
        } else {
            remain.push(entry);
        }
    }
    g.migratingMons = remain;

    while (g.failedArrivals?.length) {
        const mtmp = g.failedArrivals.shift();
        prependFmonMonArriveLikeC(g, mtmp);
        mIntoLimbo(g, mtmp);
    }
}

/**
 * C: goto_level tail — `losedogs()` places migraters and pets on new level.
 * @param {import('./gstate.js').game} g
 */
export async function arriveMigratingMonsForCurrentLevelLikeC(g) {
    await losedogsLikeC(g);
}
