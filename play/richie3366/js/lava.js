// lava.js — Hero stepping on molten lava (trap.c lava_effects() subset).
// C ref: trap.c lava_effects() — d(6,6) first; feel_newsym; burn_away_slime; likes_lava;
// usurvive; in_use; boots; !Fire_resistance (death/lifesave mostly TODO); fire-resist sink;
// burn_stuff: zap.c destroy_items(AD_FIRE) + ignite_items (ignite_items.js).

import { game } from './gstate.js';
import { IS_LAVA, TT_LAVA } from './const.js';
import { d, rn1 } from './rng.js';
import { feelNewsym, pline } from './display.js';
import { likesLava, permonstHuman } from './mondata.js';
import { losehp } from './mthrowu.js';
import { destroyItemsYoumonstFire } from './destroy_items.js';
import { igniteHeroInventory } from './ignite_items.js';
import { burnAwaySlime } from './timeout.js';

/**
 * C: trap.c lava_effects() — **`d(6,6)`** before **`feel_newsym`**; **`burn_away_slime`**;
 * **`likes_lava`** early exit; **`usurvive`**; fire-resist **`else if (!Wwalking …)`** sink +
 * **`set_utrap`** (**`rn1`**); **`!Fire_resistance && Wwalking && usurvive`** burn **`losehp`**;
 * **`iflags.in_lava_effects`** re-entry guard. Call from movement after pool (**`spoteffects`** order).
 * @param {typeof game} [g]
 * @returns {Promise<boolean>} reserved (**`TRUE`** = life-saved in C); always **false** for now
 */
export async function maybeHeroLavaEffects(g = game) {
    const u = g.u;
    if (!u) return false;
    const loc = g.level?.at(u.ux, u.uy);
    if (!loc || !IS_LAVA(loc.typ)) return false;

    g.iflags = g.iflags || {};
    if (g.iflags.in_lava_effects | 0) return false;

    g.iflags.in_lava_effects = (g.iflags.in_lava_effects | 0) + 1;
    try {
        /* C: int dmg = d(6, 6); — rolled unconditionally before feel_newsym */
        const dmg = d(6, 6);
        feelNewsym(u.ux, u.uy);
        await burnAwaySlime(g);
        const mdat = g.youmonst?.data ?? permonstHuman;
        if (likesLava(mdat)) return false;

        const fireRes = !!(u.Fire_resistance | 0);
        const wwalk = !!(u.Wwalking | 0);
        const uhp = u.uhp ?? 0;
        const usurvive = fireRes || (wwalk && dmg < uhp);

        /* C: if (!usurvive) mark flammable invent in_use — TODO when invent modeled */
        void usurvive;
        /* C: organic uarmf burst + Boots_off + useup — TODO */

        if (!fireRes) {
            if (wwalk) {
                await pline('The lava here burns you!');
                if (usurvive) losehp(dmg, 'molten lava', 0);
                /* C: !usurvive → invent destruction loop, done(BURNING), lifesave — TODO + RNG */
            } else {
                /* C: You fall into … + in_use destruction + done(BURNING) — TODO + RNG */
                await pline('You fall into the lava!');
            }
        } else if (!wwalk && (!(u.utrap ?? 0) || (u.utraptype ?? 0) !== TT_LAVA)) {
            /* C: boil_away = !Fire_resistance → false here; set_uttrap(rn1(4,4)+(rn1(4,12)<<8), TT_LAVA) */
            u.utrap = rn1(4, 4) + (rn1(4, 12) << 8);
            u.utraptype = TT_LAVA;
            await pline('You sink into the lava, but it only burns slightly.');
            if (uhp > 1) losehp(1, 'molten lava', 0);
        }
        /* C: burn_stuff — destroy_items(&gy.youmonst, AD_FIRE, dmg); ignite_items(gi.invent) */
        await destroyItemsYoumonstFire(g, dmg);
        await igniteHeroInventory(g);
    } finally {
        g.iflags.in_lava_effects = Math.max(0, (g.iflags.in_lava_effects | 0) - 1);
    }
    return false;
}
