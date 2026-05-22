// mfndpos_mon.js — Monster neighbor positions (mon.c mfndpos / mon_allowflags).
// C ref: mon.c mfndpos() ~2140+, mon_allowflags() ~2064+; include/mfndpos.h.

import { ALLOW_M, ALLOW_SANCT, ALLOW_SSM, ALLOW_U, isok, COLNO, ROWNO, TEMPLE } from './const.js';
import { accessibleAtMonmoveLikeC } from './walkable.js';
import { onScaryMonsterLikeC, inYourSanctuaryMonsterLikeC } from './distfleeck_mon.js';
import { raceptr, isRiderMnum, passesWalls } from './mondata.js';
import { inRoomsTypewantedRoomnos } from './shop.js';

/** @typedef {{ cnt: number, poss: {x:number,y:number}[], info: number[] }} MfndposData */

/** @param {import('./gstate.js').game} g */
function monAtXY(g, x, y) {
    return g.level?.monsters?.find((m) => (m.mx | 0) === x && (m.my | 0) === y && (m.mhp | 0) > 0) ?? null;
}

/**
 * C: mon.c **`mon_allowflags(mtmp)`** (subset for hostile/peaceful dungeon monsters).
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
export function monAllowflagsMonsterLikeC(g, mtmp) {
    let allowflags = 0;
    if (mtmp.mtame | 0) allowflags |= ALLOW_M | ALLOW_SSM;
    else if (mtmp.mpeaceful | 0) allowflags |= ALLOW_SANCT | ALLOW_SSM;
    else allowflags |= ALLOW_U;
    if (passesWalls(raceptr(mtmp))) allowflags |= 0x04000000; /* ALLOW_WALL */
    const ptr = raceptr(mtmp);
    if (isRiderMnum(ptr?.mnum | 0)) allowflags |= ALLOW_SANCT;
    void g;
    return allowflags;
}

/**
 * C: mon.c **`mfndpos(mon, data, flag)`** — subset for **`m_move`** position pick on normal floors.
 * Omits pools/lava/gas, doors, traps, boulders, garlic, worm_cross, **`monlineu`** NOTONL.
 *
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} flag
 * @returns {MfndposData}
 */
export function mfndposMonsterLikeC(g, mtmp, flag) {
    const data = { cnt: 0, poss: [], info: [] };
    const x = mtmp.mx | 0;
    const y = mtmp.my | 0;
    const u = g.u;
    const ux = u?.ux | 0;
    const uy = u?.uy | 0;
    const maxx = Math.min(x + 1, COLNO - 1);
    const maxy = Math.min(y + 1, ROWNO - 1);

    for (let nx = Math.max(1, x - 1); nx <= maxx; nx++) {
        for (let ny = Math.max(0, y - 1); ny <= maxy; ny++) {
            if (nx === x && ny === y) continue;
            if (!isok(nx, ny)) continue;
            if (!accessibleAtMonmoveLikeC(nx, ny, g)) continue;

            const other = monAtXY(g, nx, ny);
            if (other && other !== mtmp) {
                if (!(flag & ALLOW_M)) continue;
            }

            let info = 0;
            const dispx = nx;
            const dispy = ny;
            if (onScaryMonsterLikeC(g, dispx, dispy, mtmp)) {
                if (!(flag & ALLOW_SSM)) continue;
                info |= ALLOW_SSM;
            }

            if ((nx === ux && ny === uy) || (nx === (mtmp.mux | 0) && ny === (mtmp.muy | 0))) {
                if (!(flag & ALLOW_U)) continue;
                if (nx === ux && ny === uy) {
                    mtmp.mux = ux;
                    mtmp.muy = uy;
                }
                info |= ALLOW_U;
            }

            if (other && other !== mtmp && (flag & ALLOW_M)) {
                info |= ALLOW_M;
            }

            const tins = inRoomsTypewantedRoomnos(g, nx, ny, TEMPLE);
            if ((tins[0] | 0) && inYourSanctuaryMonsterLikeC(g, mtmp)) {
                if (!(flag & ALLOW_SANCT)) continue;
                info |= ALLOW_SANCT;
            }

            const cnt = data.cnt;
            data.poss[cnt] = { x: nx, y: ny };
            data.info[cnt] = info;
            data.cnt = cnt + 1;
            if (data.cnt >= 9) return data;
        }
    }
    return data;
}
