// teleport_hero.js — teleport.c safe_teleds / teleds subset for hero.
// C ref: teleport.c safe_teleds(), teleds(), teleok(); do.c goto_level mystery-force same-level.

import { COLNO, ROWNO, VIBRATING_SQUARE, is_pit, is_hole, TELEDS_NO_FLAGS } from './const.js';
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
import { unplacebcHeroLikeC, placebcHeroLikeC } from './ball_bc_hero.js';
import { heroPunishedLikeC } from './punish_hero.js';

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
 * C: teleport.c **`teleds(nux, nuy, flags)`** — hero move subset (no drag_ball / vault guard).
 * @param {import('./gstate.js').game} g
 */
export async function teledsHeroLikeC(g, nux, nuy, teledsFlags) {
    const u = g.u;
    if (!u || !g.level) return;

    const ux0 = u.ux | 0;
    const uy0 = u.uy | 0;
    const nxi = nux | 0;
    const nyi = nuy | 0;

    if (heroPunishedLikeC(g)) unplacebcHeroLikeC(g);

    u.utrap = 0;
    u.utraptype = 0;
    u.ustuck = 0;

    u.ux = nxi;
    u.uy = nyi;

    if (heroPunishedLikeC(g)) await placebcHeroLikeC(g);

    newsym(ux0, uy0);
    newsym(nxi, nyi);
    vision_recalc(0);
    await spotEffects(g, true);
    vision_recalc(1);
    void teledsFlags;
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
