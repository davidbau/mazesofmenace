// ball_bc_hero.js — ball.c placebc / unplacebc / ballrelease subset for hero level changes.
// C ref: ball.c placebc_core(), unplacebc_core(), ballrelease(); do.c goto_level Punished hooks.

import { placeFloorObjectInLevel, stackObjOnFloorInLevel, unlinkFloorObjectInLevel } from './floorobj.js';
import { removeObjFromHeroInvent } from './water_damage.js';
import { flooreffectsObjAtLikeC } from './flooreffects_hero.js';
import { pline, newsym } from './display.js';
import { Is_waterlevel } from './const.js';
import { weldedUwepLikeC } from './hero_hands.js';
import { encumberMsg } from './pickup.js';
import { syncHeroInvWeightNetLikeC } from './encumbr.js';
import { rn1, rn2 } from './rng.js';
import { losehp, maybeHalfPhys } from './mthrowu.js';

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
