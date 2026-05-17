// hitfloor_hero.js — dothrow.c hitfloor + do.c dropz/dropy/dropx (hero feet) subset.
// C ref: dothrow.c hitfloor(), do.c dropz(), dropy(), dropx(); do.c doaltarobj() subset.

import { pline, newsym } from './display.js';
import { placeFloorObjectInLevel, stackObjOnFloorInLevel } from './floorobj.js';
import { checkShopObjAfterHeroPlaceLikeC } from './shop.js';
import { encumberMsg } from './pickup.js';
import {
    IS_SOFT,
    IS_ALTAR,
    IS_POOL,
    IS_LAVA,
    ICE,
    HOLE,
    TRAPDOOR,
    PIT,
    SPIKED_PIT,
    Is_earthlevel,
} from './const.js';
import { heroBreaksObjLikeC, BRK_FROM_INV } from './obj_break_dothrow.js';
import { doname } from './objnam.js';
import { flooreffectsObjAtLikeC } from './flooreffects_hero.js';
import { doaltarobjLikeC } from './doaltarobj.js';
import { shipObjectThrownHeroLikeC } from './impact_drop.js';

/** C: objects_nums — **`WAN_STRIKING`** ( **`dothrow.c`** **`hitfloor`** verb ). */
const OTYP_WAN_STRIKING = 415;

/**
 * C: dungeon.c **`surface()`** + **`dothrow.c`** **`hitfloor`** trap overrides (**`tseen`**).
 * @param {import('./gstate.js').game} g
 */
function surfaceStringHitfloorVerboseLikeC(g, x, y) {
    const u = g.u;
    const t = g.level?.at(x | 0, y | 0)?.typ | 0;
    const uw = (u?.underwater | 0) !== 0;
    if (IS_POOL(t) && uw) return 'bottom';
    if (IS_POOL(t)) return 'water';
    if (t === ICE) return 'ice';
    if (IS_LAVA(t)) return 'lava';
    const traps = g.level?.traps;
    const trap = traps?.find((tr) => (tr.tx | 0) === (x | 0) && (tr.ty | 0) === (y | 0));
    if (trap?.tseen) {
        const tt = trap.ttyp | 0;
        if (tt === TRAPDOOR) return 'trap door';
        if (tt === HOLE) return 'edge of the hole';
        if (tt === PIT || tt === SPIKED_PIT) return 'edge of the pit';
    }
    if (Is_earthlevel(u?.uz)) return 'ground';
    return 'floor';
}

/**
 * C: **`shk.c`** **`ship_object`** — delegates to **`impact_drop.js`** **`shipObjectThrownHeroLikeC`**.
 */
async function shipObjectHeroAtLikeC(g, obj, x, y, shopFloor) {
    return shipObjectThrownHeroLikeC(g, obj, x | 0, y | 0, !!shopFloor);
}

/**
 * C: **`do.c`** **`dropz(obj, with_impact)`** — **`flooreffects`** / **`place_object`** /
 * **`check_shop_obj`** / **`stackobj`** / **`newsym`** / **`encumber_msg`** (**subset**:
 * **`flooreffects`** lava/pool only; uwep/uball, **`Blind`+`Levitation`** **`map_object`**, container impact omitted).
 * @param {import('./gstate.js').game} g
 * @param {boolean} withImpact — C only toggles **`container_impact_dmg`** / **`impact_disturbs_zombies`**
 */
export async function dropzAtHeroFeetLikeC(g, obj, withImpact) {
    void withImpact;
    const u = g.u;
    if (!u || !obj) return;

    if (u.uswallow) {
        /* C: mpickobj / engulfer_digests_food — floor placement wrong; keep object at hero tile until ported */
        const x = u.ux | 0;
        const y = u.uy | 0;
        placeFloorObjectInLevel(g, obj, x, y);
        await checkShopObjAfterHeroPlaceLikeC(g, obj, x, y);
        stackObjOnFloorInLevel(g, obj);
        await newsym(x, y);
        await encumberMsg();
        return;
    }

    const x = u.ux | 0;
    const y = u.uy | 0;
    if (await flooreffectsObjAtLikeC(g, obj, x, y, 'drop')) return;

    placeFloorObjectInLevel(g, obj, x, y);
    await checkShopObjAfterHeroPlaceLikeC(g, obj, x, y);
    stackObjOnFloorInLevel(g, obj);
    await newsym(x, y);
    await encumberMsg();
}

/** C: **`do.c`** **`dropy`** → **`dropz(obj, FALSE)`**. */
export async function dropyHeroAtFeetLikeC(g, obj) {
    await dropzAtHeroFeetLikeC(g, obj, false);
}

/**
 * C: **`dothrow.c`** **`hitfloor(obj, verbosely)`** — soft / water / swallow → **`dropy`**;
 * else altar / verbose pline, **`hero_breaks`**, **`ship_object`**, **`dropz(..., TRUE)`**.
 * @param {import('./gstate.js').game} g
 * @param {boolean} verbosely
 */
export async function hitfloorHeroLikeC(g, obj, verbosely) {
    const u = g.u;
    if (!u || !obj) return;
    const x = u.ux | 0;
    const y = u.uy | 0;
    const ltyp = g.level?.at(x, y)?.typ | 0;

    if (IS_SOFT(ltyp) || (u.uinwater | 0) !== 0 || (u.uswallow | 0) !== 0) {
        await dropyHeroAtFeetLikeC(g, obj);
        return;
    }

    if (IS_ALTAR(ltyp)) {
        await doaltarobjLikeC(g, obj);
    } else if (verbosely) {
        const verb = (obj.otyp | 0) === OTYP_WAN_STRIKING ? 'strikes' : 'hits';
        const surf = surfaceStringHitfloorVerboseLikeC(g, x, y);
        await pline(`${doname(obj, g)} ${verb} the ${surf}.`);
    }

    if (await heroBreaksObjLikeC(g, obj, x, y, BRK_FROM_INV)) return;
    if (await shipObjectHeroAtLikeC(g, obj, x, y, false)) return;
    await dropzAtHeroFeetLikeC(g, obj, true);
}

/**
 * C: **`do.c`** **`dropx`** after **`freeinv`** — **`!uswallow`**: **`ship_object`**, **`IS_ALTAR`** **`doaltarobj`**, **`dropy`**.
 * @param {import('./gstate.js').game} g
 */
export async function dropxHeroAfterFreeinvLikeC(g, obj) {
    const u = g.u;
    if (!u || !obj) return;
    const x = u.ux | 0;
    const y = u.uy | 0;
    if (!(u.uswallow | 0)) {
        if (await shipObjectHeroAtLikeC(g, obj, x, y, false)) return;
        const ltyp = g.level?.at(x, y)?.typ | 0;
        if (IS_ALTAR(ltyp)) await doaltarobjLikeC(g, obj);
    }
    await dropyHeroAtFeetLikeC(g, obj);
}
