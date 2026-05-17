// stinking_cloud_hero.js — read.c stinking cloud scroll + region.c create_gas_cloud RNG.
// C ref: read.c **`valid_cloud_pos`**, **`can_center_cloud`**, **`do_stinking_cloud`** (~3065–3105);
//        **`region.c`** **`create_gas_cloud`** (~1212–1308), **`make_gas_cloud`** envelope (**~1197–1204**).
//
// **`getpos`** / **`tmp_at`** hilite not ported — center defaults to **`u.ux`/`u.uy`** (C initial **`cc`**).

import { ACCESSIBLE } from './const.js';
import { isok, dist2 } from './hacklib.js';
import { isPoolCellLikeC, isLavaCellLikeC } from './fillholetyp.js';
import { cansee } from './vision.js';
import { rn1, rn2 } from './rng.js';
import { pline } from './display.js';
import { NH5_SCROLL_CLASS } from './nh5_objclass.js';

/** C: **`read.c`** **`valid_cloud_pos`**. */
export function validCloudPosHeroLikeC(g, x, y) {
    const xi = x | 0;
    const yi = y | 0;
    if (!isok(xi, yi)) return false;
    const loc = g.level?.at(xi, yi);
    if (!loc) return false;
    const typ = loc.typ | 0;
    if (ACCESSIBLE(typ)) return true;
    return isPoolCellLikeC(g, xi, yi) || isLavaCellLikeC(g, xi, yi);
}

/** C: **`read.c`** **`can_center_cloud`**. */
export function canCenterCloudHeroReadLikeC(g, x, y) {
    const xi = x | 0;
    const yi = y | 0;
    if (!validCloudPosHeroLikeC(g, xi, yi)) return false;
    if (!cansee(xi, yi)) return false;
    const u = g?.u;
    if (!u) return false;
    return dist2(xi, yi, u.ux | 0, u.uy | 0) < 32;
}

/** C: **`mkobj.c`** **`bcsign`** / **`obj.h`** — **+1** blessed, **-1** cursed, else **0**. */
export function bcsignObjLikeC(obj) {
    if (!obj) return 0;
    return (!!(obj.blessed | 0) | 0) - (!!(obj.cursed | 0) | 0);
}

/** C: **`region.c`** **`is_hero_inside_gas_cloud`** — no **`gr.regions`** in JS yet. */
function isHeroInsideGasCloudHeroStub(_g) {
    return false;
}

/** C: **`mon.c`** **`m_poisongas_ok`** — stub (**`M_POISONGAS_BAD`**) until poly gas rules are ported. */
function mPoisongasOkHeroStub(_g) {
    return 0;
}

/**
 * C: **`region.c`** **`create_gas_cloud`** — BFS **`rn2`** shuffle + **`nvalid==4`** skip + **`rn1(3,4)`** TTL;
 * **`make_gas_cloud`** envelope when hero lies in new cloud and **`damage`** (**`gi.in_mklev`** and **`mon_moving`** omitted).
 * @param {import('./gstate.js').game} g
 * @returns {Promise<void>}
 */
export async function createGasCloudRndBurnHeroLikeC(g, x, y, cloudsizeIn, damage) {
    const MAX_CLOUD_SIZE = 150;
    const u = g?.u;
    const monMoving = !!(g?.svc?.context?.mon_moving);
    let cloudsize = cloudsizeIn | 0;
    if (cloudsize > MAX_CLOUD_SIZE) cloudsize = MAX_CLOUD_SIZE;

    const xcoords = /** @type {number[]} */ ([]);
    const ycoords = /** @type {number[]} */ ([]);
    xcoords[0] = x | 0;
    ycoords[0] = y | 0;
    let newidx = 1;
    const insideCloudBefore = isHeroInsideGasCloudHeroStub(g);
    const ux = u?.ux | 0;
    const uy = u?.uy | 0;
    /* C: single-point harmless cloud on hero — **`inside_cloud`** for **`make_gas_cloud`**; RNG order preserved. */
    if (
        !monMoving
        && ux === (x | 0)
        && uy === (y | 0)
        && cloudsize === 1
        && (!damage || mPoisongasOkHeroStub(g) === 2)
    ) {
        /* would set **`inside_cloud`** true in C */
    }

    for (let curridx = 0; curridx < newidx; curridx++) {
        if (newidx >= cloudsize) break;
        const xx = xcoords[curridx];
        const yy = ycoords[curridx];
        /** @type {{ x: number; y: number }[]} */
        const dirs = [
            { x: 0, y: -1 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
            { x: 1, y: 0 },
        ];
        for (let i = 4; i > 0; --i) {
            const swapidx = rn2(i);
            const tmp = dirs[swapidx];
            dirs[swapidx] = dirs[i - 1];
            dirs[i - 1] = tmp;
        }
        let nvalid = 0;
        for (let i = 0; i < 4; ++i) {
            const dx = dirs[i].x;
            const dy = dirs[i].y;
            let isunpicked = true;
            if (validCloudPosHeroLikeC(g, xx + dx, yy + dy)) {
                nvalid++;
                for (let j = 0; j < newidx; ++j) {
                    if (xcoords[j] === xx + dx && ycoords[j] === yy + dy) {
                        isunpicked = false;
                        break;
                    }
                }
                if (nvalid === 4 && !rn2(2)) {
                    /* C: skip adding this direction (rhombus disruption) */
                } else if (isunpicked) {
                    xcoords[newidx] = xx + dx;
                    ycoords[newidx] = yy + dy;
                    newidx++;
                }
            }
            if (newidx >= cloudsize) break;
        }
    }

    let ttl = rn1(3, 4);
    ttl = Math.floor((ttl * cloudsize) / newidx);
    void ttl;

    if (!monMoving && !insideCloudBefore && damage) {
        let heroIn = false;
        for (let i = 0; i < newidx; i++) {
            if (xcoords[i] === ux && ycoords[i] === uy) {
                heroIn = true;
                break;
            }
        }
        if (heroIn && !(u?.Breathless | 0)) {
            await pline('You are enveloped in a cloud of noxious gas!');
        }
    }
}

/** @param {import('./gstate.js').game} g */
function heroHallucinatingLikeC(g) {
    const u = g?.u;
    if (!u) return false;
    return !!(u.Hallucination | 0) || (u.timed?.hallucination ?? 0) > 0;
}

/** C: **`read.c`** **`do_stinking_cloud`** — **`getpos`** omitted (**`cc`** = hero); **`create_gas_cloud`** sizes from **`bcsign`**.
 * @param {import('./gstate.js').game} g
 * @param {{ oclass?: number; blessed?: number; cursed?: number }} sobj
 * @param {boolean} mentionStinking C **`already_known`** → **`mention_stinking`** arg
 */
export async function doStinkingCloudHeroReadScrollLikeC(g, sobj, mentionStinking) {
    const u = g?.u;
    if (!u) return;

    const where = mentionStinking ? 'stinking ' : '';
    await pline(`Where do you want to center the ${where}cloud?`);

    const cc = { x: u.ux | 0, y: u.uy | 0 };
    if (!canCenterCloudHeroReadLikeC(g, cc.x, cc.y)) {
        if (heroHallucinatingLikeC(g)) await pline('Ugh... someone cut the cheese.');
        else if ((sobj?.oclass | 0) === NH5_SCROLL_CLASS) {
            await pline('The scroll crumbles with a whiff of rotten eggs.');
        } else {
            await pline('You smell a whiff of rotten eggs.');
        }
        return;
    }

    const bc = bcsignObjLikeC(sobj);
    const cloudsize = 15 + 10 * bc;
    const damage = 8 + 4 * bc;
    await createGasCloudRndBurnHeroLikeC(g, cc.x, cc.y, cloudsize, damage);
}
