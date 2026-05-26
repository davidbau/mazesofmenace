// teleport_hero.js — teleport.c safe_teleds / teleds subset for hero.
// C ref: teleport.c safe_teleds(), teleds(), teleok(); do.c goto_level mystery-force same-level.

import {
    COLNO,
    ROWNO,
    VIBRATING_SQUARE,
    is_pit,
    is_hole,
    TELEDS_NO_FLAGS,
    TELEDS_ALLOW_DRAG,
    SLT_ENCUMBER,
    VAULT,
} from './const.js';
import { rnd, rn2 } from './rng.js';
import {
    collectCoordsLikeC,
    CC_RING_PAIRS,
    CC_SKIP_MONS,
    CC_SKIP_INACCS,
} from './collect_coords.js';
import { goodposHero } from './walkable.js';
import { tAt } from './search.js';
import { newsym } from './display.js';
import { vision_recalc } from './vision.js';
import { spotEffects } from './spoteffects.js';
import {
    unplacebcHeroLikeC,
    placebcHeroLikeC,
    dragBallHeroLikeC,
    moveBcHeroLikeC,
    ballActiveForTeledsLikeC,
} from './ball_bc_hero.js';
import { distmin } from './hacklib.js';
import { nearCapacity } from './encumbr.js';
import { floorObjKey } from './floorobj.js';
import { fillPitInLevel } from './trap.js';
import { inRoomsTypewantedRoomnos } from './shop.js';
import {
    vaultOccupiedFromUroomsLikeC,
    findGdHeroLikeC,
    uleftvaultHeroLikeC,
} from './vault_hero.js';

/**
 * C: teleport.c **`tele_jump_ok`** / **`in_out_region`** — stubs **TRUE** until regions wired.
 */
function teleJumpOkHeroStub() {
    return true;
}

function inOutRegionHeroStub() {
    return true;
}

/**
 * C: teleport.c **`teleok(x, y, trapok)`** — hero destination check.
 * @param {import('./gstate.js').game} g
 */
export function teleokHeroLikeC(g, x, y, trapok) {
    const xi = x | 0;
    const yi = y | 0;
    if (!trapok) {
        const trap = tAt(xi, yi);
        if (trap) {
            const tt = trap.ttyp | 0;
            const u = g.u;
            if (tt === VIBRATING_SQUARE) {
                /* allow */
            } else if ((is_pit(tt) || is_hole(tt)) && (u?.Levitation || u?.Flying)) {
                /* allow */
            } else {
                return false;
            }
        }
    }
    if (!goodposHero(xi, yi, g)) return false;
    if (!teleJumpOkHeroStub()) return false;
    if (!inOutRegionHeroStub()) return false;
    return true;
}

/**
 * C: teleport.c **`teleds(nux, nuy, flags)`** — hero move with **`drag_ball`** / **`placebc`** order.
 * Deferred: **`buried_ball_to_punishment`**, swallowed **`docrt`**, verbose teleport line.
 * @param {import('./gstate.js').game} g
 */
export async function teledsHeroLikeC(g, nux, nuy, teledsFlags) {
    const u = g.u;
    if (!u || !g.level) return;

    const nxi = nux | 0;
    const nyi = nuy | 0;
    const ux0 = u.ux | 0;
    const uy0 = u.uy | 0;

    let allowDrag = ((teledsFlags | 0) & TELEDS_ALLOW_DRAG) !== 0;
    let ballActive = ballActiveForTeledsLikeC(g);
    const ball = g.uball;

    if (
        ballActive
        && (nearCapacity(g) > SLT_ENCUMBER || distmin(ux0, uy0, nxi, nyi) > 1)
    ) {
        allowDrag = false;
    }

    let ballStillInRange = false;
    if (ballActive && ball && !objectCarriedByHeroForTeleds(g, ball)) {
        if (distmin(nxi, nyi, ball.ox | 0, ball.oy | 0) <= 2) {
            ballStillInRange = true;
        } else if (!allowDrag) {
            unplacebcHeroLikeC(g);
        }
    }

    u.utrap = 0;
    u.utraptype = 0;
    u.ustuck = 0;
    u.ux0 = ux0;
    u.uy0 = uy0;

    if (ballActive && (ballStillInRange || allowDrag)) {
        const dr = await dragBallHeroLikeC(g, nxi, nyi, allowDrag);
        if (dr.ok) {
            moveBcHeroLikeC(
                g,
                0,
                dr.bcControl,
                dr.ballx,
                dr.bally,
                dr.chainx,
                dr.chainy,
            );
        } else if (ballActiveForTeledsLikeC(g)) {
            unplacebcHeroLikeC(g);
        }
    }

    u.ux = nxi;
    u.uy = nyi;

    await fillPitInLevel(g, ux0, uy0);

    if (ballActive && g.uchain && !objOnFloorHeadsLikeC(g, g.uchain)) {
        await placebcHeroLikeC(g);
    }

    newsym(ux0, uy0);
    newsym(nxi, nyi);
    vision_recalc(0);

    const vaultGuard = vaultOccupiedFromUroomsLikeC(g) ? findGdHeroLikeC(g) : null;
    if (vaultGuard) {
        const saveUrooms = u.urooms;
        const vaultRnos = inRoomsTypewantedRoomnos(g, nxi, nyi, VAULT);
        u.urooms = vaultRnos.length ? String.fromCharCode(vaultRnos[0]) : '';
        if (!vaultOccupiedFromUroomsLikeC(g)) {
            await uleftvaultHeroLikeC(g, vaultGuard);
        }
        u.urooms = saveUrooms;
    }

    await spotEffects(g, true);
    vision_recalc(1);
}

/** @param {import('./gstate.js').game} g */
function objectCarriedByHeroForTeleds(g, obj) {
    for (let o = g.invent; o; o = o.nobj) {
        if (o === obj) return true;
    }
    return false;
}

/** C: **`uchain->where != OBJ_FREE`** — chain still in **`floorObjHeads`**. */
function objOnFloorHeadsLikeC(g, otmp) {
    if (!otmp || (otmp.ox | 0) < 0 || (otmp.oy | 0) < 0) return false;
    const head = g.level?.floorObjHeads?.get(floorObjKey(otmp.ox | 0, otmp.oy | 0));
    for (let o = head; o; o = o.nexthere) {
        if (o === otmp) return true;
    }
    return false;
}

/**
 * C: teleport.c **`safe_teleds(teleds_flags)`** — find safe spot and **`teleds`**.
 * @returns {Promise<boolean>} false when no spot found (C rare).
 */
export async function safeTeledsHeroLikeC(g, teledsFlags) {
    for (let tcnt = 0; tcnt < 40; tcnt++) {
        const nux = rnd(COLNO - 1);
        const nuy = rn2(ROWNO);
        if (teleokHeroLikeC(g, nux, nuy, false)) {
            await teledsHeroLikeC(g, nux, nuy, teledsFlags);
            return true;
        }
    }

    const u = g.u;
    if (!u) return false;
    const candy = new Array(ROWNO * (COLNO - 1));
    const candycount = collectCoordsLikeC(
        candy,
        u.ux | 0,
        u.uy | 0,
        0,
        CC_RING_PAIRS | CC_SKIP_MONS | CC_SKIP_INACCS,
        (x, y) => teleokHeroLikeC(g, x, y, false),
        g,
    );

    let backupX = 0;
    let backupY = 0;
    for (let tcnt = 0; tcnt < candycount; tcnt++) {
        const nux = candy[tcnt].x | 0;
        const nuy = candy[tcnt].y | 0;
        if (teleokHeroLikeC(g, nux, nuy, false)) {
            await teledsHeroLikeC(g, nux, nuy, teledsFlags);
            return true;
        }
        if (!backupX && tAt(nux, nuy) && teleokHeroLikeC(g, nux, nuy, true)) {
            backupX = nux;
            backupY = nuy;
        }
    }
    if (backupX) {
        await teledsHeroLikeC(g, backupX, backupY, teledsFlags);
        return true;
    }
    return false;
}

export { TELEDS_NO_FLAGS };
