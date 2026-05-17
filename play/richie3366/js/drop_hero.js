// drop_hero.js — invent.c dodrop / do.c dropx subset (hero feet).
// C ref: invent.c dodrop() → dropx → dropy → dropz; wired via hitfloor_hero.js.

import { game } from './gstate.js';
import { pline } from './display.js';
import { removeObjFromHeroInvent } from './water_damage.js';
import { dropxHeroAfterFreeinvLikeC } from './hitfloor_hero.js';

/**
 * C: **`invent.c`** **`dodrop()`** subset — drop **top-of-chain** **`g.invent`** at **`u.ux,u.uy`** (**`getobj`** / multi / gold split deferred).
 * @param {import('./gstate.js').game} [g]
 */
export async function doDropOneAtHeroFeetLikeC(g = game) {
    const u = g.u;
    if (!u) return;
    const obj = g.invent;
    if (!obj) {
        await pline('You have nothing to drop.');
        g.context.move = 0;
        g._retainMessageAfterCommand = true;
        return;
    }
    removeObjFromHeroInvent(g, obj);
    await dropxHeroAfterFreeinvLikeC(g, obj);
    g.context.move = 1;
}
