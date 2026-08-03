// region.js — gas clouds and other timed area effects.
// C ref: src/region.c
//
// Only the point-membership queries are ported so far; nothing that creates
// a region exists yet, so game.regions stays empty until create_gas_cloud()
// and friends arrive. The queries still run for real: does_block() asks
// visible_region_at() for every map square during vision recalculation.

import { game } from './gstate.js';

// src/region.c:54 inside_rect()
export function inside_rect(r, x, y) {
    return x >= r.lx && x <= r.hx && y >= r.ly && y <= r.hy;
}

// src/region.c:66 inside_region()
export function inside_region(reg, x, y) {
    if (!reg || !inside_rect(reg.bounding_box, x, y))
        return false;
    for (let i = 0; i < reg.nrects; i++)
        if (inside_rect(reg.rects[i], x, y))
            return true;
    return false;
}

// src/region.c:719 visible_region_at()
export function visible_region_at(x, y) {
    const regions = game.regions || [];
    for (let i = 0; i < regions.length; i++) {
        if (!regions[i].visible || regions[i].ttl === -2)
            continue;
        if (inside_region(regions[i], x, y))
            return regions[i];
    }
    return null;
}
