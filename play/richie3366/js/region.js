// region.js — gas-cloud / NhRegion subset.
// C ref: region.c create_gas_cloud / make_gas_cloud / visible_region_at /
// clear_regions / run_regions / m_in_out_region / inside_gas_cloud;
// read.c valid_cloud_pos.
// Named omissions: inside_f damage/pline (dam>0); dissipation plines;
// numeric cmap glyph ints (JS tags 'S_poisoncloud'/'S_cloud'); hero
// enveloped pline; create_gas_cloud_selection; binary save_regions
// format; force fields; incremental fill_point (JS uses vision_reset);
// can_enter/leave/enter/leave callbacks (gas has none); attach_2_m/u.
// Level leave stashes the regions array (D-0675).

import { game } from './gstate.js';
import { rn2, rn1 } from './rng.js';
import { isok, ACCESSIBLE, u_at } from './const.js';
import { is_pool, is_lava } from './hack.js';
import { recalc_block_point } from './vision.js';
import { monsterNames } from './monsters.js';

const MAX_CLOUD_SIZE = 150;
const INSIDE_GAS_CLOUD = 1; // callback index stand-in
const PM_FOG_CLOUD = monsterNames.indexOf('PM_FOG_CLOUD');

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

/**
 * C ref: mon.c mfndpos gas_glyph — cmap_to_glyph(S_poisoncloud).
 * make_gas_cloud tags damage clouds 'S_poisoncloud', fog/steam 'S_cloud'.
 */
export function is_poisoncloud_region(reg) {
    return !!reg && reg.glyph === 'S_poisoncloud';
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

/** Local m_at — avoid mon.js cycle (mon.js imports region.js). */
function m_at_xy(x, y) {
    const seg = game._level_monsters?.get(`${x},${y}`);
    if (seg && (seg.mhp | 0) > 0) return seg;
    const steed = game.u?.usteed;
    for (const m of game.fmon || []) {
        if (m === steed) continue;
        if ((m.mhp | 0) <= 0) continue;
        if (m.mx === x && m.my === y) return m;
    }
    return null;
}

function find_mid(mid) {
    for (const m of game.fmon || []) {
        if (m.m_id === mid) return m;
    }
    return null;
}

/** C ref: region.c add_mon_to_reg / mon_in_region / remove_mon_from_reg */
function mon_in_region(reg, mon) {
    return (reg.monsters || []).includes(mon.m_id);
}

function add_mon_to_reg(reg, mon) {
    if (!mon || mon.m_id == null) return;
    if (!reg.monsters) reg.monsters = [];
    if (mon_in_region(reg, mon)) return;
    reg.monsters.push(mon.m_id);
}

function remove_mon_from_reg(reg, mon) {
    const list = reg.monsters || [];
    const i = list.indexOf(mon.m_id);
    if (i < 0) return;
    list[i] = list[list.length - 1];
    list.pop();
}

/**
 * C ref: region.c inside_gas_cloud — fog maintains vapor TTL (+5 if <20).
 * Damage/pline arms deferred when dam < 1 (fog/steam trails).
 */
function inside_gas_cloud(reg, mtmp) {
    const mnum = mtmp?.mnum ?? mtmp?.data?.mndx ?? -1;
    // C: fog clouds maintain gas clouds, even poisonous ones
    if ((reg.ttl | 0) < 20 && mtmp && mnum === PM_FOG_CLOUD) {
        reg.ttl = (reg.ttl | 0) + 5;
    }
    if ((reg.arg | 0) < 1) return false;
    // dam>0 monster/hero effects deferred
    return false;
}

/**
 * C ref: region.c make_gas_cloud — register region; hero message deferred.
 * C add_region scans m_at into reg->monsters and block_point; JS rebuilds
 * vision via recalc_block_point (full vision_reset).
 */
function make_gas_cloud(cloud, damage, _inside_cloud) {
    cloud.inside_f = INSIDE_GAS_CLOUD;
    cloud.expire_f = INSIDE_GAS_CLOUD; // gas expire marker (damage/pline deferred)
    cloud.arg = damage | 0;
    // C: cmap_to_glyph(damage ? S_poisoncloud : S_cloud) — mfndpos only
    // avoids poisoncloud (damage>0). Numeric cmap deferred; tag suffices.
    cloud.glyph = damage ? 'S_poisoncloud' : 'S_cloud';
    cloud.visible = true;
    if (!cloud.monsters) cloud.monsters = [];
    // set_heros_fault / enveloped pline deferred
    if (!game.regions) game.regions = [];
    game.regions.push(cloud);
    // C add_region: m_at scan + if (reg->visible) block_point per cell
    const rects = cloud.rects || [];
    for (const r of rects) {
        for (let x = r.lx | 0; x <= (r.hx | 0); x++) {
            for (let y = r.ly | 0; y <= (r.hy | 0); y++) {
                if (!isok(x, y) || !inside_region(cloud, x, y)) continue;
                const mtmp = m_at_xy(x, y);
                if (mtmp) add_mon_to_reg(cloud, mtmp);
            }
        }
    }
    if (rects.length) {
        recalc_block_point(rects[0].lx | 0, rects[0].ly | 0);
    } else {
        game.vision_full_recalc = 1;
    }
}

/**
 * C ref: region.c remove_region — drop region; unblock vision for gas.
 * Named omissions: newsym pass, hero_inside clear, free_region details.
 */
function remove_region(reg) {
    const regs = game.regions || [];
    const i = regs.indexOf(reg);
    if (i < 0) return;
    regs.splice(i, 1);
    // C expire_gas_cloud / remove_region → unblock_point; JS rebuilds
    if (reg.visible) {
        const rects = reg.rects || [];
        if (rects.length) {
            recalc_block_point(rects[0].lx | 0, rects[0].ly | 0);
        } else {
            game.vision_full_recalc = 1;
        }
    }
}

/**
 * C ref: region.c clear_regions — free all NhRegions (mklev clear_level_structures;
 * rest_regions security wipe). Named omissions: free_region field teardown;
 * save_regions binary format (JS stashes the array on level_info).
 */
export function clear_regions() {
    game.regions = [];
}

/**
 * C ref: region.c m_in_out_region — maintain reg.monsters on move.
 * Gas clouds have no can_enter/leave/enter/leave callbacks.
 */
export function m_in_out_region(mon, x, y) {
    if (!mon) return true;
    for (const reg of game.regions || []) {
        if (inside_region(reg, x, y)) {
            if (!mon_in_region(reg, mon)) add_mon_to_reg(reg, mon);
        } else if (mon_in_region(reg, mon)) {
            remove_mon_from_reg(reg, mon);
        }
    }
    return true;
}

/**
 * C ref: region.c run_regions — ttl expiry then age + inside_f callbacks.
 * Envelope: gas-cloud ttl; fog-in-cloud TTL refresh (D-0834).
 * Named omissions: inside_f damage on hero/monsters; dissipation plines.
 */
export function run_regions() {
    const regs = game.regions || [];
    // End of life — backward because remove mutates the array
    for (let i = regs.length - 1; i >= 0; i--) {
        const reg = regs[i];
        if ((reg.ttl | 0) !== 0) continue;
        // C: expire_f callback; gas with damage<5 unblocks and returns TRUE
        const dmg = reg.arg | 0;
        if (dmg >= 5) {
            // C: thick cloud dissipates — halve damage, ttl=2, keep
            reg.arg = (dmg / 2) | 0;
            reg.ttl = 2;
            continue;
        }
        remove_region(reg);
    }
    // Age remaining + inside_f (fog maintains vapor)
    for (const reg of game.regions || []) {
        if ((reg.ttl | 0) > 0) reg.ttl = (reg.ttl | 0) - 1;
        if (reg.inside_f !== INSIDE_GAS_CLOUD) continue;
        const u = game.u || {};
        if (inside_region(reg, u.ux | 0, u.uy | 0)) {
            inside_gas_cloud(reg, null);
        }
        const mids = reg.monsters || [];
        for (let j = 0; j < mids.length; j++) {
            const mtmp = find_mid(mids[j]);
            if (!mtmp || (mtmp.mhp | 0) <= 0) {
                mids[j] = mids[mids.length - 1];
                mids.pop();
                j--;
                continue;
            }
            inside_gas_cloud(reg, mtmp);
        }
    }
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
