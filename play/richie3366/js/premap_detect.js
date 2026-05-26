// premap_detect.js — C detect.c premap_detect (sokoban pre-mapped levels).
// C ref: detect.c premap_detect(), skip_premap_detect().

import {
    COLNO, ROWNO, STONE, SDOOR, SVALL, W_NONDIGGABLE, W_NONPASSWALL, OTYP_BOULDER,
} from './const.js';
import { mapBackgroundLikeC, mapObjectLikeC, mapTrapLikeC } from './display.js';
import { floorObjKey } from './floorobj.js';

/** C: detect.c skip_premap_detect */
function skipPremapDetectLikeC(loc) {
    if (!loc) return true;
    return (loc.typ | 0) === STONE
        && ((loc.wall_info | 0) & (W_NONDIGGABLE | W_NONPASSWALL)) !== 0;
}

/** C: mkobj.c sobj_at(BOULDER, x, y). */
function sobjAtBoulderPremapLikeC(g, x, y) {
    const head = g.level?.floorObjHeads?.get(floorObjKey(x | 0, y | 0));
    if (!head) return null;
    for (let o = head; o; o = o.nexthere) {
        if ((o.otyp | 0) === OTYP_BOULDER) return o;
    }
    return null;
}

/**
 * C: detect.c premap_detect — no RNG.
 * @param {import('./gstate.js').game} g
 */
export function premapDetectLikeC(g) {
    const map = g.level;
    if (!map) return;
    for (let x = 1; x < COLNO; x++) {
        for (let y = 0; y < ROWNO; y++) {
            const loc = map.at(x, y);
            if (!loc || skipPremapDetectLikeC(loc)) continue;
            loc.seenv = SVALL;
            loc.waslit = true;
            if ((loc.typ | 0) === SDOOR) loc.wall_info = 0;
            mapBackgroundLikeC(x, y, true);
            const boulder = sobjAtBoulderPremapLikeC(g, x, y);
            if (boulder) mapObjectLikeC(boulder, true);
        }
    }
    for (const t of map.traps || []) {
        t.tseen = 1;
        mapTrapLikeC(t, true);
    }
}
