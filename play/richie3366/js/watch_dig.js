// watch_dig.js — Town watch reaction to digging damage (wand/spell/chew).
// C ref: dig.c watch_dig(), watchman_canseeu(), get_iter_mons(watchman_canseeu);
//        allmain.c stop_occupation() when is_digging() (dig_occupation.js).

import { inTownLikeC } from './hacklib.js';
import { isClosedDoorLoc } from './walkable.js';
import {
    SDOOR,
    TREE,
    STONE,
    IS_WALL,
    IS_FOUNTAIN,
    IS_DOOR,
    IS_TREE,
    IS_OBSTRUCTED,
} from './const.js';
import { pline } from './display.js';
import { isWatchMonsterLikeC } from './mondata.js';
import { mCanSeeHeroMonsterLikeC } from './mon_seen_res.js';
import { angryGuardsSilentLikeC } from './shop.js';
import { ensureContextDiggingLikeC, stopOccupationIfDiggingHeroLikeC } from './dig_occupation.js';

function isTreeCellLikeC(g, typ) {
    const t = typ | 0;
    if (t === TREE) return true;
    return !!(g.level?.flags?.arboreal && t === STONE);
}

/**
 * C: dig.c watch_dig — **`in_town`** + door / **`SDOOR`** / wall / fountain / tree
 * (**`closed_door`** / **`lev->typ == SDOOR`** / **`IS_WALL`** / **`IS_FOUNTAIN`** / **`IS_TREE`**).
 * @param {import('./gstate.js').game} g
 */
function watchDigCellQualifiesLikeC(g, x, y) {
    const loc = g.level?.at(x | 0, y | 0);
    if (!loc) return false;
    const t = loc.typ | 0;
    if (isClosedDoorLoc(loc) || t === SDOOR || IS_WALL(t) || IS_FOUNTAIN(t) || isTreeCellLikeC(g, t)) {
        return true;
    }
    return false;
}

/**
 * C: dig.c **`watchman_canseeu`** + **`get_iter_mons(watchman_canseeu)`** — first matching watch on **`g.level.monsters`**.
 * @param {import('./gstate.js').game} g
 */
function findWatchmanCanSeeHeroLikeC(g) {
    for (const m of g.level?.monsters ?? []) {
        if ((m.mhp | 0) <= 0) continue;
        if (!(m.mpeaceful | 0)) continue;
        if (!(m.mcansee | 0)) continue;
        if (!isWatchMonsterLikeC(m)) continue;
        if (!mCanSeeHeroMonsterLikeC(m)) continue;
        return m;
    }
    return null;
}

/**
 * C: dig.c watch_dig(struct monst *mtmp, coordxy x, coordxy y, boolean zap)
 *
 * **`SetVoice`** omitted; **`verbalize`** → **`pline`**. **`angry_guards`** → **`angryGuardsSilentLikeC`** (**`mon.c`** watch loop).
 * **`stop_occupation`** when **`is_digging()`** (**`dig_occupation.js`** **`occupying`**).
 *
 * @param {import('./gstate.js').game} g
 * @param {object|null|undefined} mtmp
 * @param {number} x
 * @param {number} y
 * @param {boolean} zap
 */
export async function watchDigHeroLikeC(g, mtmp, x, y, zap) {
    const xi = x | 0;
    const yi = y | 0;
    if (!inTownLikeC(g, xi, yi)) return;
    if (!watchDigCellQualifiesLikeC(g, xi, yi)) return;

    const m = mtmp ?? findWatchmanCanSeeHeroLikeC(g);
    if (!m) return;

    const dig = ensureContextDiggingLikeC(g);
    const silent = (g.u?.timed?.deaf ?? 0) > 0;

    if (zap || dig.warned) {
        if (!silent) await pline('Halt, vandal!  You\'re under arrest!');
        await angryGuardsSilentLikeC(g, silent);
    } else {
        const loc = g.level?.at(xi, yi);
        const typ = loc?.typ | 0;
        /** C: **`IS_DOOR`** / **`IS_TREE`** / **`IS_OBSTRUCTED`** else fountain. */
        let str = 'fountain';
        if (IS_DOOR(typ)) str = 'door';
        else if (IS_TREE(typ)) str = 'tree';
        else if (IS_OBSTRUCTED(typ)) str = 'wall';
        if (!silent) await pline(`Hey, stop damaging that ${str}!`);
        dig.warned = true;
    }

    await stopOccupationIfDiggingHeroLikeC(g);
}
