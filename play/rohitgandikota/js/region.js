// region.js — gas clouds and other timed area effects.
// C ref: src/region.c
//
// Point clouds can be built either by runtime effects or directly from a
// special-level selection. The queries run for real: does_block() asks
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

import { rn1, rn2, rnd } from './rng.js';
import { isok } from './hacklib.js';
import { ACCESSIBLE } from './const.js';
import { cmap_names } from './drawing_data.js';
import { PMNAMES } from './monst_data.js';
import { selection_getbounds, selection_getpoint } from './selvar.js';

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
    if (reg.visible) {
        for (let x = reg.bounding_box.lx; x <= reg.bounding_box.hx; ++x)
            for (let y = reg.bounding_box.ly; y <= reg.bounding_box.hy; ++y) {
                if (!isok(x, y))
                    continue;
                if (inside_region(reg, x, y))
                    game._block_point_ref?.(x, y);
                if (game._cansee_ref?.(x, y))
                    game._newsym_ref?.(x, y);
            }
    }
    reg.hero_inside = inside_region(reg, game.u.ux, game.u.uy);
}

// src/region.c:394 remove_region()
export function remove_region(reg) {
    const rs = game.regions || [];
    const i = rs.indexOf(reg);
    if (i >= 0) {
        rs.splice(i, 1);
        reg.ttl = -2;
        if (reg.visible) {
            for (let x = reg.bounding_box.lx; x <= reg.bounding_box.hx; ++x)
                for (let y = reg.bounding_box.ly; y <= reg.bounding_box.hy; ++y)
                    if (isok(x, y) && inside_region(reg, x, y))
                        game._recalc_block_point_ref?.(x, y);
        }
    }
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
    /* add_region records whether the hero starts inside the cloud so the
       per-turn callback can apply its effects. */
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

// src/region.c:1315 create_gas_cloud_selection(). Special-level clouds have
// no random lifetime: create_region() leaves ttl at -1, so they persist.
export function create_gas_cloud_selection(sel, damage) {
    const bounds = { lx: 0, ly: 0, hx: 0, hy: 0 };
    selection_getbounds(sel, bounds);
    const cloud = {
        rects: [], nrects: 0,
        bounding_box: { lx: 999, ly: 999, hx: -1, hy: -1 },
        ttl: -1, n_monst: 0, monsters: [],
    };

    for (let x = bounds.lx; x <= bounds.hx; x++)
        for (let y = bounds.ly; y <= bounds.hy; y++)
            if (selection_getpoint(x, y, sel)) {
                cloud.rects.push({ lx: x, hx: x, ly: y, hy: y });
                cloud.nrects++;
                cloud.bounding_box.lx = Math.min(cloud.bounding_box.lx, x);
                cloud.bounding_box.ly = Math.min(cloud.bounding_box.ly, y);
                cloud.bounding_box.hx = Math.max(cloud.bounding_box.hx, x);
                cloud.bounding_box.hy = Math.max(cloud.bounding_box.hy, y);
            }

    make_gas_cloud(cloud, damage, false);
    return cloud;
}

// src/region.c:1090 inside_gas_cloud(), the hero branch.
async function inside_gas_cloud(reg) {
    let damage = reg.arg | 0;
    if (damage < 1)
        return;

    const { breathless } = await import('./mondata.js');
    if (breathless(game.youmonst.data))
        return;

    const { Blind, Poison_resistance } = await import('./youprop.js');
    const { You, Your } = await import('./pline.js');
    const { pline } = await import('./display.js');
    const { body_part } = await import('./polyself.js');
    const { makeplural } = await import('./objnam.js');
    const { EYE, LUNG, KILLED_BY_AN } = await import('./const.js');

    if (!Blind()) {
        await Your(`${makeplural(body_part(EYE))} sting.`);
        const { make_blinded } = await import('./potion.js');
        await make_blinded(1, false);
    }
    if (!Poison_resistance()) {
        await pline(`Something is burning your ${makeplural(body_part(LUNG))}!`);
        await You('cough and spit blood!');
        const { wake_nearto } = await import('./mon.js');
        wake_nearto(game.u.ux, game.u.uy, 2);
        damage = rnd(damage) + 5;
        if (game.u.uprops?.HALF_PHDAM)
            damage = Math.trunc((damage + 1) / 2);
        if (game.u.uprops?.HALF_GAS_DAMAGE)
            damage = Math.trunc((damage + 1) / 2);
        const { losehp } = await import('./hack.js');
        await losehp(damage, 'gas cloud', KILLED_BY_AN);
    } else {
        await You('cough!');
        const { wake_nearto } = await import('./mon.js');
        wake_nearto(game.u.ux, game.u.uy, 2);
    }
}

// src/region.c:414 run_regions(), age regions and apply inside callbacks.
export async function run_regions() {
    const rs = game.regions || [];
    for (let i = rs.length - 1; i >= 0; i--) {
        if (rs[i].ttl === 0)
            remove_region(rs[i]);
    }
    for (const reg of (game.regions || [])) {
        if (reg.ttl > 0)
            reg.ttl--;
        if (reg.inside_f === 'INSIDE_GAS_CLOUD' && reg.hero_inside)
            await inside_gas_cloud(reg);
        /* src/region.c:1091 inside_gas_cloud(). Fog clouds sustain any
           gas cloud around them, including harmless vapor trails. */
        if (reg.inside_f === 'INSIDE_GAS_CLOUD' && reg.ttl < 20) {
            for (const mon of (game.level?.monsters || [])) {
                if (mon.mhp > 0 && mon.mnum === PMNAMES.PM_FOG_CLOUD
                    && inside_region(reg, mon.mx, mon.my)) {
                    reg.ttl += 5;
                }
            }
        }
    }
}
