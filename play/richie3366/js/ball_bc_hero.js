// ball_bc_hero.js — ball.c placebc / unplacebc / ballrelease subset for hero level changes.
// C ref: ball.c placebc_core(), unplacebc_core(), ballrelease(); do.c goto_level Punished hooks.

import { placeFloorObjectInLevel, stackObjOnFloorInLevel, unlinkFloorObjectInLevel } from './floorobj.js';
import { removeObjFromHeroInvent } from './water_damage.js';
import { flooreffectsObjAtLikeC } from './flooreffects_hero.js';
import { pline, newsym } from './display.js';
import { Is_waterlevel, POOL, is_pit, is_hole } from './const.js';
import { weldedUwepLikeC } from './hero_hands.js';
import { encumberMsg } from './pickup.js';
import { nearCapacity, ENC, syncHeroInvWeightNetLikeC } from './encumbr.js';
import { dist2, distmin } from './hacklib.js';
import { rn1, rn2, rnd } from './rng.js';
import { losehp, maybeHalfPhys } from './mthrowu.js';
import { heroPunishedLikeC } from './punish_hero.js';
import { isPoolCellLikeC } from './fillholetyp.js';
import { tAt } from './search.js';
import { nomul } from './timeout.js';
import { heroLuck } from './water_damage.js';
import { raceptr } from './mondata.js';
import { spotEffects } from './spoteffects.js';

/** C: ball.c — ball & chain stack order at hero feet. */
export const BCPOS_DIFFER = 0;
export const BCPOS_CHAIN = 1;
export const BCPOS_BALL = 2;

/** C: you.h — felt ball/chain when blind. */
export const BC_BALL = 0x01;
export const BC_CHAIN = 0x02;

/** @param {import('./gstate.js').game} g */
function objectCarriedByHeroLikeC(g, obj) {
    if (!obj) return false;
    for (let o = g.invent; o; o = o.nobj) {
        if (o === obj) return true;
        if (o.cobj) {
            for (let c = o.cobj; c; c = c.nobj) {
                if (c === obj) return true;
            }
        }
    }
    return false;
}

/** @param {Record<string, unknown>} obj */
function objectOnFloorLikeC(obj) {
    return (obj.ox | 0) >= 0 && (obj.oy | 0) >= 0;
}

/**
 * C: ball.c **`placebc_core`** — flooreffects, floor placement at **`u.ux`/`u.uy`**, **`newsym`**.
 * Omits **`u.bglyph`/`u.cglyph`** blind glyph save and **`bcrestriction`**.
 * @param {import('./gstate.js').game} g
 */
export async function placebcHeroLikeC(g) {
    const u = g.u;
    const chain = g.uchain;
    const ball = g.uball;
    if (!u || !chain || !ball) return;

    const ux = u.ux | 0;
    const uy = u.uy | 0;

    await flooreffectsObjAtLikeC(g, chain, ux, uy, '');

    if (objectCarriedByHeroLikeC(g, ball)) {
        u.bc_order = BCPOS_DIFFER;
    } else {
        await flooreffectsObjAtLikeC(g, ball, ux, uy, '');
        if (objectOnFloorLikeC(ball)) unlinkFloorObjectInLevel(g, ball);
        removeObjFromHeroInvent(g, ball);
        placeFloorObjectInLevel(g, ball, ux, uy);
        stackObjOnFloorInLevel(g, ball);
        u.bc_order = BCPOS_CHAIN;
    }

    if (objectOnFloorLikeC(chain)) unlinkFloorObjectInLevel(g, chain);
    removeObjFromHeroInvent(g, chain);
    placeFloorObjectInLevel(g, chain, ux, uy);
    stackObjOnFloorInLevel(g, chain);

    newsym(ux, uy);
    u.bc_felt = 0;
}

/**
 * C: ball.c **`unplacebc_core`** — extract ball/chain from floor; swallowed/waterlevel subset.
 * @param {import('./gstate.js').game} g
 */
export function unplacebcHeroLikeC(g) {
    const u = g.u;
    const chain = g.uchain;
    const ball = g.uball;
    if (!u) return;

    if (u.uswallow | 0) {
        if (Is_waterlevel(u.uz)) {
            if (ball && !objectCarriedByHeroLikeC(g, ball) && objectOnFloorLikeC(ball)) {
                unlinkFloorObjectInLevel(g, ball);
            }
            if (chain && objectOnFloorLikeC(chain)) unlinkFloorObjectInLevel(g, chain);
        }
        return;
    }

    if (ball && !objectCarriedByHeroLikeC(g, ball) && objectOnFloorLikeC(ball)) {
        unlinkFloorObjectInLevel(g, ball);
        newsym(ball.ox | 0, ball.oy | 0);
    }
    if (chain && objectOnFloorLikeC(chain)) {
        unlinkFloorObjectInLevel(g, chain);
        newsym(chain.ox | 0, chain.oy | 0);
    }
    u.bc_felt = 0;
}

/**
 * C: ball.c **`placebc_core`** — sync subset for **`sp_lev.c` `flip_level(..., extras)`** tail
 * (**`#wizfliplevel`**) after **`unplacebc`** when ball/chain split across flip area.
 * Skips **`flooreffects`** / async **`newsym`** ( **`flip_level`** ends with **`vision_reset`**).
 * @param {import('./gstate.js').game} g
 */
export function placebcHeroSyncForFlipLikeC(g) {
    const u = g.u;
    const chain = g.uchain;
    const ball = g.uball;
    if (!u || !chain || !ball) return;

    const ux = u.ux | 0;
    const uy = u.uy | 0;

    if (objectCarriedByHeroLikeC(g, ball)) {
        u.bc_order = BCPOS_DIFFER;
    } else {
        if (objectOnFloorLikeC(ball)) unlinkFloorObjectInLevel(g, ball);
        removeObjFromHeroInvent(g, ball);
        placeFloorObjectInLevel(g, ball, ux, uy);
        stackObjOnFloorInLevel(g, ball);
        u.bc_order = BCPOS_CHAIN;
    }
    if (objectOnFloorLikeC(chain)) unlinkFloorObjectInLevel(g, chain);
    removeObjFromHeroInvent(g, chain);
    placeFloorObjectInLevel(g, chain, ux, uy);
    stackObjOnFloorInLevel(g, chain);
    u.bc_felt = 0;
}

/**
 * C: wield.c **`welded(uball)`** — ball welded only when wielded as **`uwep`** and **`will_weld`**.
 * @param {import('./gstate.js').game} g
 */
export function weldedUballLikeC(g) {
    const ball = g.uball;
    return !!(ball && weldedUwepLikeC(g, ball));
}

/**
 * C: ball.c **`ballrelease(boolean showmsg)`** — drop carried ball from grip (not floor placement).
 * @param {import('./gstate.js').game} g
 * @param {boolean} showmsg
 */
export async function ballreleaseHeroLikeC(g, showmsg) {
    const u = g.u;
    const ball = g.uball;
    if (!u || !ball || !objectCarriedByHeroLikeC(g, ball) || weldedUballLikeC(g)) return;

    if (showmsg) await pline('Startled, you drop the iron ball.');
    if (u.uwep === ball) u.uwep = null;
    if (u.uswapwep === ball) u.uswapwep = null;
    if (u.uquiver === ball) u.uquiver = null;
    removeObjFromHeroInvent(g, ball);
    syncHeroInvWeightNetLikeC(g);
    await encumberMsg();
}

/** C: do_wear.c **`hard_helmet(uarmh)`** — metallic/crackable helm materials. */
function hardHelmetUarmhLikeC(helm) {
    if (!helm) return false;
    const m = helm.oc_material | 0;
    if (m === 11 || m === 12 || m === 13) return true;
    if (m === 19) return true;
    return !!(helm.oc_crackable | 0);
}

/**
 * C: ball.c **`ballfall()`** — trap-door / hole fall: ball may hit hero before **`placebc`**.
 * @param {import('./gstate.js').game} g
 */
export async function ballfallHeroLikeC(g) {
    const u = g.u;
    const ball = g.uball;
    if (!ball) return;
    if (objectCarriedByHeroLikeC(g, ball) && weldedUballLikeC(g)) return;

    const ux = u.ux | 0;
    const uy = u.uy | 0;
    const getsHit =
        ((ball.ox | 0) !== ux || (ball.oy | 0) !== uy)
        && (u.uwep === ball ? false : !!rn2(5));

    await ballreleaseHeroLikeC(g, true);
    if (!getsHit) return;

    let dmg = rn1(7, 25);
    await pline('The iron ball falls on your head.');
    const helm = u.uarmh;
    if (helm) {
        if (hardHelmetUarmhLikeC(helm)) {
            await pline('Fortunately, you are wearing a hard helmet.');
            dmg = 3;
        } else if (g.flags?.verbose) {
            await pline('Your headgear does not protect you.');
        }
    }
    losehp(maybeHalfPhys(dmg), 'crunched in the head by an iron ball', 0);
}

/** C: ball.c **`IS_CHAIN_ROCK`** — deferred; treat as never blocked until **`IS_OBSTRUCTED`** wired. */
function isChainRockStub() {
    return false;
}

/** C: mon.c **`m_at`**. */
function monAtBallDragLikeC(g, x, y) {
    const xi = x | 0;
    const yi = y | 0;
    for (const m of g.level?.monsters ?? []) {
        if ((m.mx | 0) === xi && (m.my | 0) === yi) return m;
    }
    return null;
}

/** C: trap.c **`find_mac(mtmp)`** — **`mtmp.mac`** or **`permonst.ac`**. */
function findMacBallDragLikeC(mtmp) {
    return (mtmp.mac ?? raceptr(mtmp)?.ac ?? 10) | 0;
}

/** C: uhitm.c **`omon_adj`** — deferred; no RNG until ported. */
function omonAdjBallDragStub() {
    return 0;
}

/**
 * C: ball.c **`drag:`** pool/pit test — chain over pool (not mere water continuation) or pit/hole trap.
 * @param {import('./gstate.js').game} g
 */
function chainOverPoolOrPitLikeC(g, chain, ball) {
    const cx = chain.ox | 0;
    const cy = chain.oy | 0;
    if (isPoolCellLikeC(g, cx, cy)) {
        const chainLoc = g.level?.at(cx, cy);
        const chainTyp = chainLoc?.typ | 0;
        if (chainTyp === POOL) return true;
        const bx = ball.ox | 0;
        const by = ball.oy | 0;
        if (!isPoolCellLikeC(g, bx, by)) return true;
        const ballLoc = g.level?.at(bx, by);
        return (ballLoc?.typ | 0) === POOL;
    }
    const t = tAt(cx, cy);
    if (t) {
        const tt = t.ttyp | 0;
        if (is_pit(tt) || is_hole(tt)) return true;
    }
    return false;
}

/**
 * C: ball.c **`drag:`** pool/pit — levitation pline or non-lev jerk-back + **`spoteffects(TRUE)`**.
 * @returns {Promise<boolean>} true when drag aborted (**`return FALSE`** path)
 */
async function dragBallPoolPitJerkBackLikeC(g, out) {
    const u = g.u;
    const ball = g.uball;
    const chain = g.uchain;
    if (!u || !ball || !chain || !chainOverPoolOrPitLikeC(g, chain, ball)) return false;

    const cx = chain.ox | 0;
    const cy = chain.oy | 0;
    const t = tAt(cx, cy);

    if (u.Levitation) {
        await pline('You feel a tug from the iron ball.');
        if (t) t.tseen = 1;
        return false;
    }

    await pline('You are jerked back by the iron ball!');
    const victim = monAtBallDragLikeC(g, cx, cy);
    if (victim) {
        const dieroll = rnd(20);
        const tmp = -2 + (heroLuck(g) | 0) + findMacBallDragLikeC(victim) + omonAdjBallDragStub();
        if (tmp >= dieroll) {
            /* C: **`hmon(victim, uball, HMON_DRAGGED, dieroll)`** — full **`hmon`** deferred */
        }
        /* C: **`miss`** — no extra RNG in this slice */
    }
    if (!monAtBallDragLikeC(g, cx, cy)) {
        u.ux = cx;
        u.uy = cy;
        newsym(u.ux0 | 0, u.uy0 | 0);
    }
    nomul(0);

    out.bcControl = BC_BALL;
    moveBcHeroLikeC(g, 1, BC_BALL, out.ballx, out.bally, out.chainx, out.chainy);
    out.ballx = cx;
    out.bally = cy;
    moveBcHeroLikeC(g, 0, BC_BALL, out.ballx, out.bally, out.chainx, out.chainy);
    await spotEffects(g, true, {});
    out.ok = false;
    return true;
}

function chainInMiddleLikeC(x, y, hx, hy, bx, by) {
    return distmin(x, y, hx, hy) <= 1 && distmin(hx, hy, bx, by) <= 1;
}

/**
 * C: ball.c **`move_bc`** — non-blind before/after subset (omits blind glyph dance).
 * @param {import('./gstate.js').game} g
 */
export function moveBcHeroLikeC(g, before, control, ballx, bally, chainx, chainy) {
    const u = g.u;
    const ball = g.uball;
    const chain = g.uchain;
    if (!u || !chain) return;

    const onFloor = ball && !objectCarriedByHeroLikeC(g, ball);
    const bx = ballx | 0;
    const by = bally | 0;
    const cx = chainx | 0;
    const cy = chainy | 0;

    if (before) {
        if (objectOnFloorLikeC(chain)) {
            unlinkFloorObjectInLevel(g, chain);
            newsym(chain.ox | 0, chain.oy | 0);
        }
        if (onFloor && objectOnFloorLikeC(ball)) {
            unlinkFloorObjectInLevel(g, ball);
            newsym(ball.ox | 0, ball.oy | 0);
        }
        return;
    }

    if ((control & BC_CHAIN) || (!(control & BC_BALL) && (u.bc_order | 0) === BCPOS_CHAIN)) {
        if (onFloor) {
            placeFloorObjectInLevel(g, ball, bx, by);
            stackObjOnFloorInLevel(g, ball);
        }
        placeFloorObjectInLevel(g, chain, cx, cy);
        stackObjOnFloorInLevel(g, chain);
    } else {
        placeFloorObjectInLevel(g, chain, cx, cy);
        stackObjOnFloorInLevel(g, chain);
        if (onFloor) {
            placeFloorObjectInLevel(g, ball, bx, by);
            stackObjOnFloorInLevel(g, ball);
        }
    }
    newsym(cx, cy);
    if (onFloor) newsym(bx, by);
}

/**
 * C: ball.c **`drag_ball`** — subset for **`teleport.c`** **`teleds`** (chain drag + teleport fallback).
 * **`IS_CHAIN_ROCK`** deferred; pool/pit jerk-back at **`drag:`** label.
 * @returns {Promise<{ ok: boolean, bcControl: number, ballx: number, bally: number, chainx: number, chainy: number }>}
 */
export async function dragBallHeroLikeC(g, x, y, allowDrag) {
    const u = g.u;
    const ball = g.uball;
    const chain = g.uchain;
    const xi = x | 0;
    const yi = y | 0;
    const out = {
        ok: true,
        bcControl: 0,
        ballx: ball?.ox | 0,
        bally: ball?.oy | 0,
        chainx: chain?.ox | 0,
        chainy: chain?.oy | 0,
    };
    if (!u || !ball || !chain) return out;

    if (dist2(xi, yi, chain.ox | 0, chain.oy | 0) <= 2) {
        moveBcHeroLikeC(g, 1, 0, out.ballx, out.bally, out.chainx, out.chainy);
        return out;
    }

    const carried = objectCarriedByHeroLikeC(g, ball);
    if (carried || distmin(xi, yi, ball.ox | 0, ball.oy | 0) <= 2) {
        out.bcControl = BC_CHAIN;
        moveBcHeroLikeC(g, 1, BC_CHAIN, out.ballx, out.bally, out.chainx, out.chainy);
        if (carried) {
            if (distmin(xi, yi, chain.ox | 0, chain.oy | 0) > 1) {
                out.chainx = u.ux | 0;
                out.chainy = u.uy | 0;
            }
            return out;
        }

        const bx = ball.ox | 0;
        const by = ball.oy | 0;
        const dBall = dist2(xi, yi, bx, by);
        switch (dBall) {
        case 8:
            out.chainx = ((bx + xi) / 2) | 0;
            out.chainy = ((by + yi) / 2) | 0;
            break;
        case 5: {
            let tempx;
            let tempy;
            let tempx2;
            let tempy2;
            if (Math.abs(xi - bx) === 1) {
                tempx = xi;
                tempx2 = bx;
                tempy = tempy2 = ((by + yi) / 2) | 0;
            } else {
                tempx = tempx2 = ((bx + xi) / 2) | 0;
                tempy = yi;
                tempy2 = by;
            }
            if (
                dist2(tempx, tempy, chain.ox | 0, chain.oy | 0)
                < dist2(tempx2, tempy2, chain.ox | 0, chain.oy | 0)
                || (dist2(tempx, tempy, chain.ox | 0, chain.oy | 0)
                    === dist2(tempx2, tempy2, chain.ox | 0, chain.oy | 0)
                    && rn2(2))
            ) {
                out.chainx = tempx;
                out.chainy = tempy;
            } else {
                out.chainx = tempx2;
                out.chainy = tempy2;
            }
            break;
        }
        case 4:
            if (!chainInMiddleLikeC(chain.ox | 0, chain.oy | 0, xi, yi, bx, by)) {
                out.chainx = ((xi + bx) / 2) | 0;
                out.chainy = ((yi + by) / 2) | 0;
            }
            break;
        case 2:
            if (
                dist2(xi, yi, bx, by) === 2
                && dist2(xi, yi, chain.ox | 0, chain.oy | 0) === 4
            ) {
                if ((chain.oy | 0) === yi) out.chainx = bx;
                else out.chainy = by;
            }
            break;
        case 1:
        case 0:
            if (!chainInMiddleLikeC(chain.ox | 0, chain.oy | 0, xi, yi, bx, by)) {
                if (chainInMiddleLikeC(u.ux | 0, u.uy | 0, xi, yi, bx, by)) {
                    out.chainx = u.ux | 0;
                    out.chainy = u.uy | 0;
                } else {
                    out.chainx = xi;
                    out.chainy = yi;
                }
            }
            break;
        default:
            break;
        }
        return out;
    }

    if (
        (nearCapacity(g) | 0) > ENC.SLT_ENCUMBER
        && dist2(xi, yi, u.ux | 0, u.uy | 0) <= 2
    ) {
        const also = g.invent ? 'carry all that and also ' : '';
        await pline(`You cannot ${also}drag the heavy iron ball.`);
        nomul(0);
        out.ok = false;
        return out;
    }

    if (await dragBallPoolPitJerkBackLikeC(g, out)) return out;

    out.bcControl = BC_BALL | BC_CHAIN;
    moveBcHeroLikeC(g, 1, out.bcControl, out.ballx, out.bally, out.chainx, out.chainy);
    if (dist2(xi, yi, u.ux | 0, u.uy | 0) > 2) {
        out.ballx = xi;
        out.bally = yi;
        out.chainx = xi;
        out.chainy = yi;
        return out;
    }

    let newchainx = u.ux | 0;
    let newchainy = u.uy | 0;
    if (
        dist2(xi, yi, chain.ox | 0, chain.oy | 0) === 4
        && !isChainRockStub(newchainx, newchainy)
    ) {
        newchainx = ((xi + (chain.ox | 0)) / 2) | 0;
        newchainy = ((yi + (chain.oy | 0)) / 2) | 0;
    }
    out.ballx = chain.ox | 0;
    out.bally = chain.oy | 0;
    out.chainx = newchainx;
    out.chainy = newchainy;
    return out;
}

/** C: teleport.c **`teleds`** — ball active when Punished and ball not **`OBJ_FREE`**. */
export function ballActiveForTeledsLikeC(g) {
    if (!heroPunishedLikeC(g)) return false;
    const ball = g.uball;
    if (!ball || !g.uchain) return false;
    return objectCarriedByHeroLikeC(g, ball) || objectOnFloorLikeC(ball);
}
