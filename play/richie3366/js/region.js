// region.js — gas-cloud / NhRegion subset.
// C ref: region.c create_gas_cloud / make_gas_cloud / visible_region_at;
// read.c valid_cloud_pos.
// Named omissions: run_regions damage/expire callbacks; region glyphs /
// vision block_point; hero enveloped pline; create_gas_cloud_selection;
// save/rest_regions; force fields.

import { game } from './gstate.js';
import { rn2, rn1 } from './rng.js';
import { isok, ACCESSIBLE, u_at } from './const.js';
import { is_pool, is_lava } from './hack.js';

const MAX_CLOUD_SIZE = 150;
const INSIDE_GAS_CLOUD = 1; // callback index stand-in

/**
 * C ref: read.c valid_cloud_pos — ACCESSIBLE | pool | lava.
 */
export function valid_cloud_pos(x, y) {
    if (!isok(x, y)) return false;
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    return ACCESSIBLE(loc.typ) || is_pool(x, y) || is_lava(x, y);
}

/**
 * C ref: region.c visible_region_at — first visible region covering (x,y).
 */
export function visible_region_at(x, y) {
    const regs = game.regions || [];
    for (const reg of regs) {
        if (!reg.visible || reg.ttl === -2) continue;
        if (inside_region(reg, x, y)) return reg;
    }
    return null;
}

function inside_region(reg, x, y) {
    const rects = reg.rects || [];
    for (const r of rects) {
        if (x >= r.lx && x <= r.hx && y >= r.ly && y <= r.hy) return true;
    }
    return false;
}

function is_hero_inside_gas_cloud() {
    const regs = game.regions || [];
    const u = game.u || {};
    for (const reg of regs) {
        if (reg.inside_f === INSIDE_GAS_CLOUD
            && inside_region(reg, u.ux | 0, u.uy | 0)) {
            return true;
        }
    }
    return false;
}

/**
 * C ref: region.c make_gas_cloud — register region; hero message deferred.
 */
function make_gas_cloud(cloud, damage, _inside_cloud) {
    cloud.inside_f = INSIDE_GAS_CLOUD;
    cloud.arg = damage | 0;
    cloud.visible = true;
    // glyph / set_heros_fault / enveloped pline deferred
    if (!game.regions) game.regions = [];
    game.regions.push(cloud);
}

/**
 * C ref: region.c create_gas_cloud — BFS expand + ttl = rn1(3,4).
 * Size-1 (fog/Hezrou/Steam): no expand RNG, only ttl.
 */
export function create_gas_cloud(x, y, cloudsize, damage) {
    const xcoords = new Array(MAX_CLOUD_SIZE);
    const ycoords = new Array(MAX_CLOUD_SIZE);
    xcoords[0] = x;
    ycoords[0] = y;
    let newidx = 1;
    let inside_cloud = is_hero_inside_gas_cloud();

    // C: single-point on hero + (!damage || m_poisongas_ok) — message gate only
    // (m_poisongas_ok body deferred: damage>0 keeps prior inside_cloud)
    if (!game.context?.mon_moving && u_at(x, y) && cloudsize === 1 && !damage) {
        inside_cloud = true;
    }

    if (cloudsize > MAX_CLOUD_SIZE) cloudsize = MAX_CLOUD_SIZE;

    for (let curridx = 0; curridx < newidx; curridx++) {
        if (newidx >= cloudsize) break;
        const xx = xcoords[curridx];
        const yy = ycoords[curridx];

        // Fisher-Yates shuffle of 4 cardinals
        const dirs = [
            { x: 0, y: -1 }, { x: 0, y: 1 },
            { x: -1, y: 0 }, { x: 1, y: 0 },
        ];
        for (let i = 4; i > 0; --i) {
            const swapidx = rn2(i);
            const tmp = dirs[swapidx];
            dirs[swapidx] = dirs[i - 1];
            dirs[i - 1] = tmp;
        }
        let nvalid = 0;
        for (let i = 0; i < 4; ++i) {
            const dx = dirs[i].x;
            const dy = dirs[i].y;
            let isunpicked = true;
            if (valid_cloud_pos(xx + dx, yy + dy)) {
                nvalid++;
                for (let j = 0; j < newidx; ++j) {
                    if (xcoords[j] === xx + dx && ycoords[j] === yy + dy) {
                        isunpicked = false;
                        break;
                    }
                }
                if (nvalid === 4 && !rn2(2)) continue;
                if (isunpicked) {
                    xcoords[newidx] = xx + dx;
                    ycoords[newidx] = yy + dy;
                    newidx++;
                }
            }
            if (newidx >= cloudsize) break;
        }
    }

    const cloud = { rects: [], ttl: -1, visible: false, inside_f: 0, arg: 0 };
    for (let i = 0; i < newidx; ++i) {
        cloud.rects.push({
            lx: xcoords[i], hx: xcoords[i],
            ly: ycoords[i], hy: ycoords[i],
        });
    }
    // C: cloud->ttl = rn1(3, 4); then scale if constrained
    cloud.ttl = rn1(3, 4);
    cloud.ttl = Math.trunc((cloud.ttl * cloudsize) / newidx);

    make_gas_cloud(cloud, damage, inside_cloud);
    return cloud;
}
