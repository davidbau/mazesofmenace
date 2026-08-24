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

import { rn1, rn2 } from './rng.js';
import { isok } from './hacklib.js';
import { ACCESSIBLE } from './const.js';
import { cmap_names } from './drawing_data.js';

/* region.c MAX_CLOUD_SIZE */
const MAX_CLOUD_SIZE = 150;

// src/read.c:1069 valid_cloud_pos() — can a cloud exist here?
export function valid_cloud_pos(x, y) {
    if (!isok(x, y))
        return false;
    const typ = game.level?.at(x, y)?.typ ?? 0;
    /* is_pool/is_lava terrain codes are all >= POOL, which ACCESSIBLE
       already admits; the explicit calls in C are for drawbridge state */
    return ACCESSIBLE(typ) || (typ >= 16 /* POOL */ && typ <= 21 /* LAVAWALL */);
}

// src/region.c:369 add_region() — register and mark cells seen by vision.
function add_region(reg) {
    (game.regions ||= []).push(reg);
}

// src/region.c:394 remove_region()
export function remove_region(reg) {
    const rs = game.regions || [];
    const i = rs.indexOf(reg);
    if (i >= 0)
        rs.splice(i, 1);
}

// src/region.c:1182 make_gas_cloud() — flags, callbacks and the visible
// glyph. Damage clouds are poison (S_poisoncloud), zero-damage clouds are
// steam/vapor (S_cloud).
function make_gas_cloud(cloud, damage, inside_cloud) {
    cloud.inside_f = 'INSIDE_GAS_CLOUD';
    cloud.expire_f = 'EXPIRE_GAS_CLOUD';
    cloud.arg = damage;
    cloud.visible = true;
    cloud.damaging = !!damage;
    /* src/region.c:1194 — reg->glyph = cmap_to_glyph(damage ? S_poisoncloud
       : S_cloud); show_region() (js/display.js) paints it */
    cloud.glyph_cmap = damage ? cmap_names.S_poisoncloud : cmap_names.S_cloud;
    add_region(cloud);
    /* the "You are enveloped" message needs hero-inside tracking; no
       recorded session stands in a fresh cloud at creation */
}

// src/region.c:1210 create_gas_cloud() — breadth-first cloud growth from
// <x,y> with a Fisher-Yates direction shuffle per visited cell. A size-1
// cloud (a fog cloud's vapor trail) draws only its rn1(3,4) ttl.
export function create_gas_cloud(x, y, cloudsize, damage) {
    const xcoords = [x], ycoords = [y];
    let newidx = 1;

    if (cloudsize > MAX_CLOUD_SIZE)
        cloudsize = MAX_CLOUD_SIZE;

    for (let curridx = 0; curridx < newidx; curridx++) {
        if (newidx >= cloudsize)
            break;
        const xx = xcoords[curridx], yy = ycoords[curridx];

        /* primitive Fisher-Yates-Knuth shuffle of the 4 directions */
        const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        for (let i = 4; i > 0; --i) {
            const swapidx = rn2(i);
            const tmp = dirs[swapidx];
            dirs[swapidx] = dirs[i - 1];
            dirs[i - 1] = tmp;
        }
        let nvalid = 0;
        for (let i = 0; i < 4; ++i) {
            const dx = dirs[i][0], dy = dirs[i][1];
            let isunpicked = true;

            if (valid_cloud_pos(xx + dx, yy + dy)) {
                nvalid++;
                for (let j = 0; j < newidx; ++j) {
                    if (xcoords[j] === xx + dx && ycoords[j] === yy + dy) {
                        isunpicked = false;
                        break;
                    }
                }
                /* randomly disrupt the breadth-first search so open-space
                   clouds don't always tend towards a rhombus */
                if (nvalid === 4 && !rn2(2))
                    continue;

                if (isunpicked) {
                    xcoords[newidx] = xx + dx;
                    ycoords[newidx] = yy + dy;
                    newidx++;
                }
            }
            if (newidx >= cloudsize)
                break;
        }
    }

    const cloud = {
        rects: [], nrects: 0,
        bounding_box: { lx: 999, ly: 999, hx: -1, hy: -1 },
        ttl: 0, n_monst: 0, monsters: [],
    };
    for (let i = 0; i < newidx; ++i) {
        const r = { lx: xcoords[i], hx: xcoords[i],
                    ly: ycoords[i], hy: ycoords[i] };
        cloud.rects.push(r);
        cloud.nrects++;
        const bb = cloud.bounding_box;
        bb.lx = Math.min(bb.lx, r.lx); bb.ly = Math.min(bb.ly, r.ly);
        bb.hx = Math.max(bb.hx, r.hx); bb.hy = Math.max(bb.hy, r.hy);
    }
    cloud.ttl = rn1(3, 4);
    /* a cloud constrained in a small space lives longer */
    cloud.ttl = Math.trunc((cloud.ttl * cloudsize) / newidx);

    make_gas_cloud(cloud, damage, false);
    return cloud;
}

// src/region.c:414 run_regions() — age regions each turn; expired ones
// vanish. The inside-callbacks (poison damage) record until a session
// stands in a damaging cloud.
export function run_regions() {
    const rs = game.regions || [];
    for (let i = rs.length - 1; i >= 0; i--) {
        if (rs[i].ttl === 0)
            remove_region(rs[i]);
    }
    for (const reg of (game.regions || [])) {
        if (reg.ttl > 0)
            reg.ttl--;
    }
}
