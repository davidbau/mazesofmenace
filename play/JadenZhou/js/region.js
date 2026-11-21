// region.js — regions (gas clouds) on the current level.
// C ref: region.c — inside_rect, inside_region, create_region,
// add_rect_to_reg, add_mon_to_reg, mon_in_region, add_region,
// is_hero_inside_gas_cloud, make_gas_cloud, create_gas_cloud_selection.
//
// C keeps the active regions in gr.regions[] / svn.n_regions and saves
// them with the level (save_regions/rest_regions). JS keeps them on the
// level itself, game.level.regions, which gives the same per-level list.
//
// Ported so far: creating gas clouds during level creation (themed "Cloud
// room" via des.gas_cloud). Not ported yet: run_regions() and the region
// callbacks (inside_gas_cloud, expire_gas_cloud), in_out_region(),
// m_in_out_region(), showing regions on the map (show_region()), and
// create_gas_cloud() (the breadth-first cloud that rolls dice).

import { game } from './gstate.js';
import { COLNO, ROWNO, isok, REG_HERO_INSIDE, REG_NOT_HEROS, MONST_INC } from './const.js';
import { m_at } from './makemon.js';
import { block_point, cansee } from './vision.js';
import { newsym } from './display.js';
import { selection_getbounds, selection_getpoint } from './selvar.js';

const NO_CALLBACK = -1;
// C ref: region.c callbacks[] indices
const INSIDE_GAS_CLOUD = 0;
const EXPIRE_GAS_CLOUD = 1;
// C ref: defsym.h S_cloud, S_poisoncloud (cmap indices)
const S_cloud = 47;
const S_poisoncloud = 86;

// C ref: region.h hero_inside() etc.
export function hero_inside(r) { return (r.player_flags & REG_HERO_INSIDE) !== 0; }
export function heros_fault(r) { return !(r.player_flags & REG_NOT_HEROS); }
function set_hero_inside(r) { r.player_flags |= REG_HERO_INSIDE; }
function clear_hero_inside(r) { r.player_flags &= ~REG_HERO_INSIDE; }
function set_heros_fault(r) { r.player_flags &= ~REG_NOT_HEROS; }
function clear_heros_fault(r) { r.player_flags |= REG_NOT_HEROS; }

// gr.regions / svn.n_regions for the current level
export function level_regions() {
    if (!game.level.regions)
        game.level.regions = [];
    return game.level.regions;
}

// C ref: region.c inside_rect()
export function inside_rect(r, x, y) {
    return (x >= r.lx && x <= r.hx && y >= r.ly && y <= r.hy);
}

// C ref: region.c inside_region()
/*
 * Check if a point is inside a region.
 */
export function inside_region(reg, x, y) {
    if (!reg || !inside_rect(reg.bounding_box, x, y))
        return false;
    for (let i = 0; i < reg.nrects; i++)
        if (inside_rect(reg.rects[i], x, y))
            return true;
    return false;
}

// C ref: region.c create_region()
/*
 * Create a region. It does not activate it.
 */
export function create_region(rects, nrect) {
    const reg = {};

    /* Determines bounding box */
    if (nrect > 0) {
        reg.bounding_box = { ...rects[0] };
    } else {
        reg.bounding_box = { lx: COLNO, ly: ROWNO, hx: 0 /* 1 */, hy: 0 };
    }
    reg.nrects = nrect;
    reg.rects = [];
    for (let i = 0; i < nrect; i++) {
        if (rects[i].lx < reg.bounding_box.lx)
            reg.bounding_box.lx = rects[i].lx;
        if (rects[i].ly < reg.bounding_box.ly)
            reg.bounding_box.ly = rects[i].ly;
        if (rects[i].hx > reg.bounding_box.hx)
            reg.bounding_box.hx = rects[i].hx;
        if (rects[i].hy > reg.bounding_box.hy)
            reg.bounding_box.hy = rects[i].hy;
        reg.rects[i] = { ...rects[i] };
    }
    reg.ttl = -1; /* Defaults */
    reg.attach_2_u = false;
    reg.attach_2_m = 0;
    reg.enter_msg = null;
    reg.leave_msg = null;
    reg.expire_f = NO_CALLBACK;
    reg.enter_f = NO_CALLBACK;
    reg.can_enter_f = NO_CALLBACK;
    reg.leave_f = NO_CALLBACK;
    reg.can_leave_f = NO_CALLBACK;
    reg.inside_f = NO_CALLBACK;
    reg.player_flags = 0;
    clear_hero_inside(reg);
    clear_heros_fault(reg);
    reg.n_monst = 0;
    reg.max_monst = 0;
    reg.monsters = [];
    reg.arg = { a_int: 0 };
    reg.visible = false;
    reg.glyph = 0;
    return reg;
}

// C ref: region.c add_rect_to_reg()
/*
 * Add rectangle to region.
 */
export function add_rect_to_reg(reg, rect) {
    reg.rects[reg.nrects] = { ...rect };
    reg.nrects++;
    /* Update bounding box if needed */
    if (reg.bounding_box.lx > rect.lx)
        reg.bounding_box.lx = rect.lx;
    if (reg.bounding_box.ly > rect.ly)
        reg.bounding_box.ly = rect.ly;
    if (reg.bounding_box.hx < rect.hx)
        reg.bounding_box.hx = rect.hx;
    if (reg.bounding_box.hy < rect.hy)
        reg.bounding_box.hy = rect.hy;
}

// C ref: region.c add_mon_to_reg()
/*
 * Add a monster to the region
 */
export function add_mon_to_reg(reg, mon) {
    /* if this is a long worm, it might already be present in the region;
       only include it once no matter how segments the region contains */
    if (mon_in_region(reg, mon)) {
        /* impossible("add_mon_to_reg: ... already in region") unless a
           long worm */
        return;
    }
    if (reg.max_monst <= reg.n_monst)
        reg.max_monst += MONST_INC;
    reg.monsters[reg.n_monst++] = mon.m_id;
}

// C ref: region.c mon_in_region()
/*
 * Check if a monster is inside the region.
 * It's probably quicker to check with the region internal list
 * than to check for coordinates.
 */
export function mon_in_region(reg, mon) {
    for (let i = 0; i < reg.n_monst; i++)
        if (reg.monsters[i] === mon.m_id)
            return true;
    return false;
}

// C ref: region.c add_region()
/*
 * Add a region to the list.
 * This actually activates the region.
 */
export function add_region(reg) {
    const regions = level_regions();

    regions.push(reg);
    /* Check for monsters inside the region */
    for (let i = reg.bounding_box.lx; i <= reg.bounding_box.hx; i++)
        for (let j = reg.bounding_box.ly; j <= reg.bounding_box.hy; j++) {
            let mtmp;
            let is_inside = false;

            /* Some regions can cross the level boundaries */
            if (!isok(i, j))
                continue;
            if (inside_region(reg, i, j)) {
                is_inside = true;
                /* if there's a monster here, add it to the region */
                if ((mtmp = m_at(i, j)) != null) {
                    add_mon_to_reg(reg, mtmp);
                }
            }
            if (reg.visible) {
                if (is_inside)
                    block_point(i, j);
                if (cansee(i, j))
                    newsym(i, j);
            }
        }
    /* Check for player now... */
    if (inside_region(reg, game.u.ux, game.u.uy))
        set_hero_inside(reg);
    else
        clear_hero_inside(reg);
}

// C ref: region.c is_hero_inside_gas_cloud()
function is_hero_inside_gas_cloud() {
    for (const reg of level_regions())
        if (hero_inside(reg) && reg.inside_f === INSIDE_GAS_CLOUD)
            return true;
    return false;
}

// C ref: region.c make_gas_cloud()
/* details of gas cloud creation which are common to create_gas_cloud()
   and create_gas_cloud_selection() */
function make_gas_cloud(cloud, damage, inside_cloud) {
    if (!game.in_mklev && !game.context?.mon_moving)
        set_heros_fault(cloud); /* assume player has created it */
    cloud.inside_f = INSIDE_GAS_CLOUD;
    cloud.expire_f = EXPIRE_GAS_CLOUD;
    cloud.arg = { a_int: damage };
    cloud.visible = true;
    /* cmap_to_glyph(damage ? S_poisoncloud : S_cloud): the cmap index */
    cloud.glyph_cmap = damage ? S_poisoncloud : S_cloud;
    add_region(cloud);

    if (!game.in_mklev && !inside_cloud && is_hero_inside_gas_cloud())
        throw new Error('make_gas_cloud(): "You are enveloped in a cloud" message not ported yet');
}

// C ref: region.c visible_region_at()
/* Return the first visible region at <x,y>, or null */
export function visible_region_at(x, y) {
    for (const reg of level_regions()) {
        if (!reg.visible || reg.ttl === -2)
            continue;
        if (inside_region(reg, x, y))
            return reg;
    }
    return null;
}

// C ref: region.c create_gas_cloud()
/* Create a gas cloud which starts at (x,y) and grows outward from it via
 * breadth-first search.  Not ported yet: once created, a temporary cloud
 * needs run_regions() aging/expiry and vision blocking, which JS lacks. */
export function create_gas_cloud(x, y, cloudsize, damage) {
    void x; void y; void cloudsize; void damage;
    throw new Error('create_gas_cloud() not ported yet (needs run_regions() and vision blocking)');
}

// C ref: region.c create_gas_cloud_selection()
/* create a single gas cloud from selection */
export function create_gas_cloud_selection(sel, damage) {
    const r = { lx: 0, ly: 0, hx: 0, hy: 0 };
    const inside_cloud = is_hero_inside_gas_cloud();

    selection_getbounds(sel, r);

    const cloud = create_region(null, 0);
    for (let x = r.lx; x <= r.hx; x++)
        for (let y = r.ly; y <= r.hy; y++)
            if (selection_getpoint(x, y, sel)) {
                const tmprect = { lx: x, hx: x, ly: y, hy: y };
                add_rect_to_reg(cloud, tmprect);
            }

    make_gas_cloud(cloud, damage, inside_cloud);
    return cloud;
}
