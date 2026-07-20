// ball.js — Ball & chain placement (partial).
// C ref: ball.c placebc / placebc_core.
//
// Named omissions: flooreffects rust; bc_order/bglyph/cglyph; Blind set_bc;
// unplacebc / ballrelease / ballfall / drag_ball; bcrestriction /
// breadcrumbs; carried-ball BCPOS_DIFFER arm.

import { game } from './gstate.js';
import { place_object } from './mkobj.js';
import { newsym } from './display.js';
import { OBJ_FREE } from './const.js';

/**
 * C ref: ball.c placebc → placebc_core.
 * Places uball (if not carried) and uchain under the hero.
 */
export function placebc() {
    const u = game.u || {};
    const uball = u.uball;
    const uchain = u.uchain;
    if (!uchain || !uball) return;
    // C: if (uchain && uchain->where != OBJ_FREE) impossible; return
    if (uchain.where != null && uchain.where !== OBJ_FREE) return;

    // flooreffects(uchain/uball) deferred (iron — no RNG on ordinary floors)
    // C: carried(uball) → skip floor place; else place_object(uball)
    const invent = game.invent || [];
    const ballCarried = invent.includes(uball);
    if (!ballCarried) place_object(uball, u.ux | 0, u.uy | 0);
    place_object(uchain, u.ux | 0, u.uy | 0);
    newsym(u.ux | 0, u.uy | 0);
}
