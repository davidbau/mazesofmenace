// set_apparxy_mon.js — C monmove.c set_apparxy(): monster’s idea of hero position (mux, muy).
// C ref: monmove.c set_apparxy ~2198–2265; can_ooze/can_fog ~2356–2370 (subset).

import { isok, PM_DISPLACER_BEAST, PM_XORN } from './const.js';
import { rn2 } from './rng.js';
import { couldsee } from './vision.js';
import {
    raceptr,
    passesWalls,
    amorphous,
    isVampshifterMonsterLikeC,
} from './mondata.js';
import { moneyCntInventLikeC } from './shop.js';
import { isClosedDoorLoc, accessibleAtMonmoveLikeC } from './walkable.js';

/** C: monflag.h M1_SEE_INVIS — perceives() for Invis vs set_apparxy notseen. */
const M1_SEE_INVIS = 0x01000000;

function heroInvisLikeC(u) {
    if (!u) return false;
    return !!((u.HInvis | 0) || (u.EInvis | 0) || (u.BInvis | 0));
}

function perceivesPtrLikeC(ptr) {
    return ((ptr?.mflags1 ?? 0) & M1_SEE_INVIS) !== 0;
}

/** C: monmove.c can_ooze — amorphous && !stuff_prevents_passage (passage stub: none). */
function canOozeMonsterLikeC(mtmp) {
    const ptr = raceptr(mtmp);
    return !!(ptr && amorphous(ptr));
}

/** C: monmove.c can_fog — vampshifter fog under door; omits genod / Protection_from_shape_changers / stuff_prevents. */
function canFogMonsterLikeC(g, mtmp) {
    return isVampshifterMonsterLikeC(mtmp);
}

function closedDoorAtLikeC(g, x, y) {
    const loc = g.level?.at(x | 0, y | 0);
    return !!(loc && isClosedDoorLoc(loc));
}

function apparxyCellInvalidLikeC(g, mtmp, mx, my, displ, ux, uy, ptr) {
    if (!isok(mx, my)) return true;
    const mmx = mtmp.mx | 0;
    const mmy = mtmp.my | 0;
    if (displ !== 2 && mx === mmx && my === mmy) return true;
    if (
        (mx !== ux || my !== uy) &&
        !passesWalls(ptr) &&
        !(
            accessibleAtMonmoveLikeC(mx, my, g) ||
            (closedDoorAtLikeC(g, mx, my) && (canOozeMonsterLikeC(mtmp) || canFogMonsterLikeC(g, mtmp)))
        )
    )
        return true;
    if (!couldsee(mx, my)) return true;
    return false;
}

/**
 * C: monmove.c set_apparxy(mtmp).
 * @param {import('./gstate.js').game} g
 * @param {*} mtmp
 */
export function setApparxyMonsterLikeC(g, mtmp) {
    if (!mtmp) return;
    const u = g.u;
    if (!u) return;
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    const ptr = raceptr(mtmp);
    let mx = mtmp.mux !== undefined && mtmp.mux !== null ? mtmp.mux | 0 : ux;
    let my = mtmp.muy !== undefined && mtmp.muy !== null ? mtmp.muy | 0 : uy;

    if ((mtmp.mtame | 0) !== 0 || mtmp === u.ustuck || (mx === ux && my === uy)) {
        mtmp.mux = ux;
        mtmp.muy = uy;
        return;
    }

    const mcansee = (mtmp.mcansee | 0) !== 0;
    const invis = heroInvisLikeC(u);
    const notseen = !mcansee || (invis && !perceivesPtrLikeC(ptr));
    const displaced = (u.Displaced | 0) !== 0;
    const isDisplacerBeast = (ptr?.mnum | 0) === PM_DISPLACER_BEAST;
    const notthere = displaced && !isDisplacerBeast;
    const underwater = (u.Underwater | 0) !== 0;

    /** @type {number} */
    let displ;
    if (underwater) {
        displ = 1;
    } else if (notseen) {
        const umoney = moneyCntInventLikeC(g);
        const xorn = (ptr?.mnum | 0) === PM_XORN;
        displ = xorn && umoney ? 0 : 1;
    } else if (notthere) {
        displ = couldsee(mx, my) ? 2 : 1;
    } else {
        displ = 0;
    }

    if (!displ) {
        mtmp.mux = ux;
        mtmp.muy = uy;
        return;
    }

    const gotu = notseen ? !rn2(3) : notthere ? !rn2(4) : false;

    if (!gotu) {
        let try_cnt = 0;
        for (;;) {
            if (++try_cnt > 200) {
                mx = ux;
                my = uy;
                break;
            }
            mx = ux - displ + rn2(2 * displ + 1);
            my = uy - displ + rn2(2 * displ + 1);
            if (!apparxyCellInvalidLikeC(g, mtmp, mx, my, displ, ux, uy, ptr)) break;
        }
    } else {
        mx = ux;
        my = uy;
    }

    mtmp.mux = mx;
    mtmp.muy = my;
}
