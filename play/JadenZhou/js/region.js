// region.js — regions (gas clouds) on the current level.
// C ref: region.c — inside_rect, inside_region, create_region,
// add_rect_to_reg, add_mon_to_reg, remove_mon_from_reg, mon_in_region,
// free_region, add_region, remove_region, clear_regions, run_regions,
// in_out_region, m_in_out_region, update_player_regions,
// update_monster_region, reg_damg, any_visible_region, visible_region_at,
// show_region, save_regions/rest_regions (save.js/restore.js call the
// parts here), expire_gas_cloud, inside_gas_cloud,
// is_hero_inside_gas_cloud, make_gas_cloud, create_gas_cloud,
// create_gas_cloud_selection, region_danger, region_safety.
//
// C keeps the active regions in gr.regions[] / svn.n_regions and saves
// them with the level (save_regions/rest_regions). JS keeps them on the
// level itself, game.level.regions, which gives the same per-level list
// (same order: add_region() appends, remove_region() moves the last
// region into the freed slot).
//
// Region glyphs: JS has no glyph numbers; a region's glyph is the cmap
// index of its symbol (cmap_to_glyph() below), which show_region() draws.
// The force-field and message regions (create_msg_region(),
// create_force_field(), clone_region(), replace_mon_regions(),
// remove_mon_from_regions()) are `#if 0' in C and aren't ported.

import { game } from './gstate.js';
import { COLNO, ROWNO, isok, REG_HERO_INSIDE, REG_NOT_HEROS, MONST_INC,
         KILLED_BY_AN, M_POISONGAS_OK, M_SEEN_POISON, EYE, LUNG,
         POISON_RES, MAGICAL_BREATHING, BLINDED, TIMEOUT, TELEDS_NO_FLAGS,
         u_at, PLNMSG_ENVELOPED_IN_GAS, ACCESSIBLE } from './const.js';
import { mons, PM_FOG_CLOUD, AD_DRST, MS_SILENT, M1_NOEYES,
         M1_BREATHLESS } from './monsters.js';
import { rn2, rnd, rn1, d } from './rng.js';
import { m_at, nonliving, is_pool, is_lava } from './makemon.js';
import { block_point, unblock_point, cansee, does_block } from './vision.js';
import { newsym, show_glyph_cell, pline, pline_The, You, Your, You_see,
         You_feel, Blind } from './display.js';
import { selection_getbounds, selection_getpoint } from './selvar.js';
import { m_poisongas_ok, wake_nearto, setmangry, killed,
         monkilled } from './mon.js';
import { makeplural } from './objnam.js';
import { body_part } from './insight.js';
import { make_blinded, set_itimeout } from './potion.js';
import { losehp, Maybe_Half_Phys } from './trap.js';
import { monstseesu, monstunseesu } from './uhitm.js';
import { Monnam } from './do_name.js';
import { safe_teleds } from './teleport.js';
import { resists_poison } from './mondata.js';
import { dist2 } from './hacklib.js';
import { CLR_GRAY, CLR_BRIGHT_GREEN } from './terminal.js';
import { TOWEL } from './objects.js';

const NO_CALLBACK = -1;
// C ref: defsym.h S_cloud, S_poisoncloud (cmap indices)
export const S_cloud = 47;
export const S_poisoncloud = 86;

// C ref: display.h cmap_to_glyph() -- see the header comment: a region
// glyph is its cmap index
export function cmap_to_glyph(cmap) { return cmap; }

// C ref: region.h hero_inside() etc.
export function hero_inside(r) { return (r.player_flags & REG_HERO_INSIDE) !== 0; }
export function heros_fault(r) { return !(r.player_flags & REG_NOT_HEROS); }
function set_hero_inside(r) { r.player_flags |= REG_HERO_INSIDE; }
function clear_hero_inside(r) { r.player_flags &= ~REG_HERO_INSIDE; }
function set_heros_fault(r) { r.player_flags &= ~REG_NOT_HEROS; }
export function clear_heros_fault(r) { r.player_flags |= REG_NOT_HEROS; }

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
    /* reg->attach_2_o = NULL; */
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
    reg.glyph = 0; /* cmap_to_glyph(S_stone) */
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

// C ref: region.c remove_mon_from_reg()
export function remove_mon_from_reg(reg, mon) {
    for (let i = 0; i < reg.n_monst; i++)
        if (reg.monsters[i] === mon.m_id) {
            reg.n_monst--;
            reg.monsters[i] = reg.monsters[reg.n_monst];
            return;
        }
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

// C ref: region.c free_region()
/*
 * Free mem from region.
 */
export function free_region(reg) {
    /* the garbage collector frees the region; drop its lists so that a
       stale reference can't be mistaken for a live region */
    if (reg) {
        reg.rects = [];
        reg.monsters = [];
    }
}

// C ref: region.c add_region()
/*
 * Add a region to the list.
 * This actually activates the region.
 */
export function add_region(reg) {
    const regions = level_regions();

    regions.push(reg); /* gr.regions[svn.n_regions++] = reg */
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

// C ref: region.c remove_region()
/*
 * Remove a region from the list & free it.
 */
export function remove_region(reg) {
    const regions = level_regions();
    let i;

    for (i = 0; i < regions.length; i++)
        if (regions[i] === reg)
            break;
    if (i === regions.length)
        return;

    /* remove region before potential newsym() calls, but don't free it yet */
    const last = regions.pop(); /* --svn.n_regions */
    if (i !== regions.length)
        regions[i] = last; /* gr.regions[i] = gr.regions[svn.n_regions] */

    /* Update screen if necessary */
    reg.ttl = -2; /* for visible_region_at */
    if (reg.visible) {
        const u = game.u;
        const tmp_uinwater = u.uinwater;

        /* need to process the region's spots twice, first unblocking all
           locations which no longer block line-of-sight, then redrawing
           spots within revised line-of-sight; skip second pass if blind */
        for (let pass = 1; pass <= (Blind() ? 1 : 2); ++pass) {
            u.uinwater = (pass === 1) ? 0 : tmp_uinwater;

            for (let x = reg.bounding_box.lx; x <= reg.bounding_box.hx; x++)
                for (let y = reg.bounding_box.ly; y <= reg.bounding_box.hy; y++)
                    if (isok(x, y) && inside_region(reg, x, y)) {
                        if (pass === 1) {
                            if (!does_block(x, y, game.level.at(x, y)))
                                unblock_point(x, y);
                        } else { /* pass==2 */
                            if (cansee(x, y))
                                newsym(x, y);
                        }
                    }
        }
        u.uinwater = tmp_uinwater;
    }
    free_region(reg);
}

// C ref: region.c clear_regions()
/*
 * Remove all regions and clear all related data.  This must be done
 * when changing level, for instance.
 */
export function clear_regions() {
    for (const reg of level_regions())
        free_region(reg);
    game.level.regions = [];
}

/* C ref: region.c callbacks[] -- INSIDE_GAS_CLOUD 0, EXPIRE_GAS_CLOUD 1 */
const INSIDE_GAS_CLOUD = 0;
const EXPIRE_GAS_CLOUD = 1;
async function call_region_callback(f_indx, p1, p2) {
    switch (f_indx) {
    case INSIDE_GAS_CLOUD:
        return await inside_gas_cloud(p1, p2);
    case EXPIRE_GAS_CLOUD:
        return expire_gas_cloud(p1, p2);
    default:
        throw new Error(`region callback ${f_indx}: no such callback`);
    }
}

// C ref: mon.c find_mid(nid, FM_FMON)
function find_mid_fmon(nid) {
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon)
        if (mtmp.m_id === nid)
            return mtmp;
    return null;
}

// C ref: region.c run_regions()
/*
 * This function is called every turn.
 * It makes the regions age, if necessary and calls the appropriate
 * callbacks when needed.
 */
export async function run_regions() {
    const regions = level_regions();
    let f_indx;

    /* reset some messaging variables */
    game.gas_cloud_diss_within = false;
    game.gas_cloud_diss_seen = 0;

    /* End of life ? */
    /* Do it backward because the array will be modified */
    for (let i = regions.length - 1; i >= 0; i--) {
        if (regions[i].ttl === 0) {
            if ((f_indx = regions[i].expire_f) === NO_CALLBACK
                || (await call_region_callback(f_indx, regions[i], null)))
                remove_region(regions[i]);
        }
    }

    /* Process remaining regions */
    for (let i = 0; i < regions.length; i++) {
        /* Make the region age */
        if (regions[i].ttl > 0)
            regions[i].ttl--;
        /* Check if player is inside region */
        f_indx = regions[i].inside_f;
        if (f_indx !== NO_CALLBACK && hero_inside(regions[i]))
            await call_region_callback(f_indx, regions[i], null);
        /* Check if any monster is inside region */
        if (f_indx !== NO_CALLBACK) {
            for (let j = 0; j < regions[i].n_monst; j++) {
                const mtmp = find_mid_fmon(regions[i].monsters[j]);

                if (!mtmp || mtmp.mhp < 1 /* DEADMONSTER() */
                    || (await call_region_callback(f_indx, regions[i], mtmp))) {
                    /* The monster died, remove it from list */
                    const k = (regions[i].n_monst -= 1);
                    regions[i].monsters[j] = regions[i].monsters[k];
                    regions[i].monsters[k] = 0;
                    --j; /* current slot has been reused; recheck it next */
                }
            }
        }
    }

    if (game.gas_cloud_diss_within) {
        await pline_The("gas cloud around you dissipates.");
        /* normally won't see additional dissipation when within */
        /* FIXME? this assumes that additional dissipation is close by */
        if ((game.u.xray_range || 0) <= 1)
            game.gas_cloud_diss_seen = 0;
        game.gas_cloud_diss_within = false;
    }
    if (game.gas_cloud_diss_seen) {
        await You_see(`${(game.gas_cloud_diss_seen === 1) ? "a" : "some"} gas cloud${
            (game.gas_cloud_diss_seen === 1) ? "" : "s"} dissipate.`);
        game.gas_cloud_diss_seen = 0;
    }
}

// C ref: region.c in_out_region()
/*
 * check whether player enters/leaves one or more regions.
 */
export async function in_out_region(x, y) {
    const regions = level_regions();
    let f_indx = 0;

    /* First check if hero can do the move */
    for (let i = 0; i < regions.length; i++) {
        if (regions[i].attach_2_u)
            continue;
        if (inside_region(regions[i], x, y)
            ? (!hero_inside(regions[i])
               && (f_indx = regions[i].can_enter_f) !== NO_CALLBACK)
            : (hero_inside(regions[i])
               && (f_indx = regions[i].can_leave_f) !== NO_CALLBACK)) {
            if (!(await call_region_callback(f_indx, regions[i], null)))
                return false;
        }
    }

    /* Callbacks for the regions hero does leave */
    for (let i = 0; i < regions.length; i++) {
        if (regions[i].attach_2_u)
            continue;
        if (hero_inside(regions[i])
            && !inside_region(regions[i], x, y)) {
            clear_hero_inside(regions[i]);
            if (regions[i].leave_msg != null)
                await pline(regions[i].leave_msg);
            if ((f_indx = regions[i].leave_f) !== NO_CALLBACK)
                await call_region_callback(f_indx, regions[i], null);
        }
    }

    /* Callbacks for the regions hero does enter */
    for (let i = 0; i < regions.length; i++) {
        if (regions[i].attach_2_u)
            continue;
        if (!hero_inside(regions[i])
            && inside_region(regions[i], x, y)) {
            set_hero_inside(regions[i]);
            if (regions[i].enter_msg != null)
                await pline(regions[i].enter_msg);
            if ((f_indx = regions[i].enter_f) !== NO_CALLBACK)
                await call_region_callback(f_indx, regions[i], null);
        }
    }

    return true;
}

// C ref: region.c m_in_out_region()
/*
 * check whether a monster enters/leaves one or more regions.
 */
export async function m_in_out_region(mon, x, y) {
    const regions = level_regions();
    let f_indx = 0;

    /* First check if mon can do the move */
    for (let i = 0; i < regions.length; i++) {
        if (regions[i].attach_2_m === mon.m_id)
            continue;
        if (inside_region(regions[i], x, y)
            ? (!mon_in_region(regions[i], mon)
               && (f_indx = regions[i].can_enter_f) !== NO_CALLBACK)
            : (mon_in_region(regions[i], mon)
               && (f_indx = regions[i].can_leave_f) !== NO_CALLBACK)) {
            if (!(await call_region_callback(f_indx, regions[i], mon)))
                return false;
        }
    }

    /* Callbacks for the regions mon does leave */
    for (let i = 0; i < regions.length; i++) {
        if (regions[i].attach_2_m === mon.m_id)
            continue;
        if (mon_in_region(regions[i], mon)
            && !inside_region(regions[i], x, y)) {
            remove_mon_from_reg(regions[i], mon);
            if ((f_indx = regions[i].leave_f) !== NO_CALLBACK)
                await call_region_callback(f_indx, regions[i], mon);
        }
    }

    /* Callbacks for the regions mon does enter */
    for (let i = 0; i < regions.length; i++) {
        if (regions[i].attach_2_m === mon.m_id)
            continue;
        if (!mon_in_region(regions[i], mon)
            && inside_region(regions[i], x, y)) {
            add_mon_to_reg(regions[i], mon);
            if ((f_indx = regions[i].enter_f) !== NO_CALLBACK)
                await call_region_callback(f_indx, regions[i], mon);
        }
    }

    return true;
}

// C ref: region.c update_player_regions()
/*
 * Checks player's regions after a teleport for instance.
 */
export function update_player_regions() {
    for (const reg of level_regions())
        if (!reg.attach_2_u && inside_region(reg, game.u.ux, game.u.uy))
            set_hero_inside(reg);
        else
            clear_hero_inside(reg);
}

// C ref: region.c update_monster_region()
/*
 * Ditto for a specified monster.
 */
export function update_monster_region(mon) {
    for (const reg of level_regions()) {
        if (inside_region(reg, mon.mx, mon.my)) {
            if (!mon_in_region(reg, mon))
                add_mon_to_reg(reg, mon);
        } else {
            if (mon_in_region(reg, mon))
                remove_mon_from_reg(reg, mon);
        }
    }
}

// C ref: region.c reg_damg()
/* per-turn damage inflicted by visible region; hides details from caller */
export function reg_damg(reg) {
    const damg = (!reg.visible || reg.ttl === -2) ? 0 : reg.arg.a_int;

    return damg;
}

// C ref: region.c any_visible_region()
/* check whether current level has any visible regions */
export function any_visible_region() {
    for (const reg of level_regions()) {
        if (!reg.visible || reg.ttl === -2)
            continue;
        return true;
    }
    return false;
}

// C ref: region.c visible_region_at()
/*
 * Check if a spot is under a visible region (eg: gas cloud).
 * Returns null if not, otherwise returns region.
 */
export function visible_region_at(x, y) {
    if (!game.level)
        return null;
    for (const reg of level_regions()) {
        if (!reg.visible || reg.ttl === -2)
            continue;
        if (inside_region(reg, x, y))
            return reg;
    }
    return null;
}

// C ref: region.c show_region() -- show_glyph(x, y, reg->glyph); the
// cloud symbols are defsym.h's (the DECgraphics symset keeps them)
export function show_region(reg, x, y) {
    switch (reg.glyph) {
    case S_poisoncloud:
        show_glyph_cell(x, y, '#', CLR_BRIGHT_GREEN, false, 0, 'cmap');
        break;
    case S_cloud:
        show_glyph_cell(x, y, '#', CLR_GRAY, false, 0, 'cmap');
        break;
    default:
        throw new Error(`show_region(): region glyph ${reg.glyph} not ported yet`);
    }
}

// C ref: region.c save_regions() -- the per-region fields; save.js writes
// them with the level
export function save_regions_data() {
    return { tmstamp: game.moves, regions: level_regions() };
}

// C ref: region.c rest_regions()
export function rest_regions_data(data, ghostly) {
    clear_regions(); /* Just for security */
    let tmstamp = data ? data.tmstamp : 0;
    if (ghostly)
        tmstamp = 0;
    else
        tmstamp = (game.moves - tmstamp);
    const regions = level_regions();
    for (const r of (data ? data.regions : []) || []) {
        /* check for expired region */
        if (r.ttl >= 0)
            r.ttl = (r.ttl > tmstamp) ? r.ttl - tmstamp : 0;
        if (ghostly) { /* settings pertained to old player */
            clear_hero_inside(r);
            clear_heros_fault(r);
        }
        r.max_monst = r.n_monst;
        regions.push(r);
    }
    /* remove expired regions, do not trigger the expire_f callback (yet!);
       also update monster lists if this data is coming from a bones file */
    for (let i = regions.length - 1; i >= 0; i--) {
        const r = regions[i];
        if (r.ttl === 0)
            remove_region(r);
        else if (ghostly && r.n_monst > 0)
            throw new Error('rest_regions(): reset_region_mids() not ported yet');
    }
}

// C ref: region.c expire_gas_cloud()
/*
 * Here is an example of an expire function that may prolong
 * region life after some mods...
 */
function expire_gas_cloud(reg, p2) {
    void p2;
    let damage = reg.arg.a_int;

    /* If it was a thick cloud, it dissipates a little first */
    if (damage >= 5) {
        damage = Math.trunc(damage / 2); /* It dissipates, let's do less damage */
        reg.arg = { a_int: damage };
        reg.ttl = 2; /* Here's the trick : reset ttl */
        return false;  /* THEN return FALSE, means "still there" */
    }

    /* The cloud no longer blocks vision.  cansee() checks shouldn't be made
       until all blocked spots have been unblocked, so we need two passes */
    for (let pass = 1; pass <= (Blind() ? 1 : 2); ++pass) {
        for (let x = reg.bounding_box.lx; x <= reg.bounding_box.hx; x++) {
            for (let y = reg.bounding_box.ly; y <= reg.bounding_box.hy; y++) {
                if (inside_region(reg, x, y)) {
                    if (pass === 1) {
                        if (!does_block(x, y, game.level.at(x, y)))
                            unblock_point(x, y);
                    } else { /* pass==2 */
                        if (!game.u.uswallow) {
                            if (u_at(x, y))
                                game.gas_cloud_diss_within = true;
                            else if (cansee(x, y))
                                game.gas_cloud_diss_seen = (game.gas_cloud_diss_seen || 0) + 1;
                        }
                    }
                }
            }
        }
    }

    return true; /* OK, it's gone, you can free it! */
}

/* C ref: youprop.h Poison_resistance, Half_physical_damage,
   Half_gas_damage */
function uhas(p) {
    const P = game.u.uprops[p];
    return !!(P && (P.intrinsic || P.extrinsic));
}
function Half_gas_damage() {
    const ublindf = game.ublindf;
    return !!(ublindf && ublindf.otyp === TOWEL && ublindf.spe > 0);
}

// C ref: region.c inside_gas_cloud()
/* returns True if p2 is killed by region p1, False otherwise */
async function inside_gas_cloud(reg, p2) {
    let mtmp = p2;
    const umon = mtmp ? mtmp : game.youmonst;
    let dam = reg.arg.a_int;
    const u = game.u;

    /*
     * Gas clouds can't be targeted at water locations, but they can
     * start next to water and spread over it.
     */

    /* fog clouds maintain gas clouds, even poisonous ones */
    if (reg.ttl < 20 && umon && umon.data === mons[PM_FOG_CLOUD])
        reg.ttl += 5;

    if (dam < 1)
        return false; /* if no damage then there's nothing to do here... */

    if (!mtmp) { /* hero is indicated by Null rather than by &youmonst */
        if (m_poisongas_ok(game.youmonst) === M_POISONGAS_OK)
            return false;
        if (!Blind()) {
            await Your(`${makeplural(body_part(EYE))} sting.`);
            await make_blinded(1, false);
        }
        if (!uhas(POISON_RES)) {
            await pline(`Something is burning your ${
                makeplural(body_part(LUNG))}!`);
            await You("cough and spit blood!");
            await wake_nearto(u.ux, u.uy, 2);
            dam = Maybe_Half_Phys(rnd(dam) + 5);
            if (Half_gas_damage()) /* worn towel */
                dam = Math.trunc((dam + 1) / 2);
            await losehp(dam, "gas cloud", KILLED_BY_AN);
            monstunseesu(M_SEEN_POISON);
            return false;
        } else {
            await You("cough!");
            await wake_nearto(u.ux, u.uy, 2);
            monstseesu(M_SEEN_POISON);
            return false;
        }
    } else { /* A monster is inside the cloud */
        mtmp = p2;

        if (m_poisongas_ok(mtmp) !== M_POISONGAS_OK) {
            if (mtmp.data.msound !== MS_SILENT) { /* !is_silent() */
                if (cansee(mtmp.mx, mtmp.my)
                    || (dist2(mtmp.mx, mtmp.my, u.ux, u.uy) < 8)) /* distu() */
                    await pline(`${Monnam(mtmp)} coughs!`);
                await wake_nearto(mtmp.mx, mtmp.my, 2);
            }
            if (heros_fault(reg))
                await setmangry(mtmp, true);
            if ((mtmp.data.mflags1 & M1_NOEYES) === 0 /* haseyes() */
                && mtmp.mcansee) {
                mtmp.mblinded = 1;
                mtmp.mcansee = 0;
            }
            if (resists_poison(mtmp))
                return false;
            mtmp.mhp -= rnd(dam) + 5;
            if (mtmp.mhp < 1) { /* DEADMONSTER() */
                if (heros_fault(reg))
                    await killed(mtmp);
                else
                    await monkilled(mtmp, "gas cloud", AD_DRST);
                if (mtmp.mhp < 1) { /* not lifesaved */
                    return true;
                }
            }
        }
    }
    return false; /* Monster is still alive */
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
async function make_gas_cloud(cloud, damage, inside_cloud) {
    if (!game.in_mklev && !game.context?.mon_moving)
        set_heros_fault(cloud); /* assume player has created it */
    cloud.inside_f = INSIDE_GAS_CLOUD;
    cloud.expire_f = EXPIRE_GAS_CLOUD;
    cloud.arg = { a_int: damage };
    cloud.visible = true;
    cloud.glyph = cmap_to_glyph(damage ? S_poisoncloud : S_cloud);
    add_region(cloud);

    if (!game.in_mklev && !inside_cloud && is_hero_inside_gas_cloud()) {
        await You(`are enveloped in a cloud of ${
            /* FIXME: "steam" is wrong if this cloud is just the trail of
               a fog cloud's movement; changing to "vapor" would handle
               that but seems a step backward when it really is steam */
            damage ? "noxious gas" : "steam"}!`);
        game.iflags.last_msg = PLNMSG_ENVELOPED_IN_GAS;
    }
}
/* make_gas_cloud() from a synchronous caller (des.gas_cloud during level
   creation, where no message is given) */
function make_gas_cloud_sync(cloud, damage, inside_cloud) {
    if (!game.in_mklev && !game.context?.mon_moving)
        set_heros_fault(cloud); /* assume player has created it */
    cloud.inside_f = INSIDE_GAS_CLOUD;
    cloud.expire_f = EXPIRE_GAS_CLOUD;
    cloud.arg = { a_int: damage };
    cloud.visible = true;
    cloud.glyph = cmap_to_glyph(damage ? S_poisoncloud : S_cloud);
    add_region(cloud);

    if (!game.in_mklev && !inside_cloud && is_hero_inside_gas_cloud())
        throw new Error('make_gas_cloud(): "You are enveloped in a cloud" from a synchronous caller not ported yet');
}


// C ref: region.c create_gas_cloud()
/* Create a gas cloud which starts at (x,y) and grows outward from it via
 * breadth-first search.
 * cloudsize is the number of squares the cloud will attempt to fill.
 * damage is how much it deals to afflicted creatures. */
const MAX_CLOUD_SIZE = 150;
export async function create_gas_cloud(x, y, cloudsize, damage) {
    let cloud;
    let i, j;
    const tmprect = { lx: 0, ly: 0, hx: 0, hy: 0 };

    /* store visited coords */
    const xcoords = new Array(MAX_CLOUD_SIZE);
    const ycoords = new Array(MAX_CLOUD_SIZE);
    xcoords[0] = x;
    ycoords[0] = y;
    let curridx;
    let newidx = 1; /* initial spot is already taken */
    let inside_cloud = is_hero_inside_gas_cloud();

    /* a single-point cloud on hero and it deals no damage.
       probably a natural cause of being polyed. don't message about it */
    if (!game.context?.mon_moving && u_at(x, y) && cloudsize === 1
        && (!damage
            || (damage && m_poisongas_ok(game.youmonst) === M_POISONGAS_OK)))
        inside_cloud = true;

    if (cloudsize > MAX_CLOUD_SIZE) {
        /* impossible("create_gas_cloud: cloud too large (%d)!", cloudsize) */
        cloudsize = MAX_CLOUD_SIZE;
    }

    for (curridx = 0; curridx < newidx; curridx++) {
        if (newidx >= cloudsize)
            break;
        const xx = xcoords[curridx];
        const yy = ycoords[curridx];
        /* Do NOT check for if there is already a gas cloud created at some
         * other time at this position. They can overlap. */

        /* Primitive Fisher-Yates-Knuth shuffle to randomize the order of
         * directions chosen. */
        const dirs = [ { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 } ];
        for (i = 4; i > 0; --i) {
            const swapidx = rn2(i);
            const tmp = dirs[swapidx];

            dirs[swapidx] = dirs[i - 1];
            dirs[i - 1] = tmp;
        }
        let nvalid = 0; /* # of valid adjacent spots */
        for (i = 0; i < 4; ++i) {
            /* try all 4 cardinal directions */
            const dx = dirs[i].x, dy = dirs[i].y;
            let isunpicked = true;

            if (valid_cloud_pos(xx + dx, yy + dy)) {
                nvalid++;
                /* don't pick a location we've already picked */
                for (j = 0; j < newidx; ++j) {
                    if (xcoords[j] === xx + dx && ycoords[j] === yy + dy) {
                        isunpicked = false;
                        break;
                    }
                }
                /* randomly disrupt the natural breadth-first search, so that
                 * clouds released in open spaces don't always tend towards a
                 * rhombus shape */
                if (nvalid === 4 && !rn2(2))
                    continue;

                if (isunpicked) {
                    xcoords[newidx] = xx + dx;
                    ycoords[newidx] = yy + dy;
                    newidx++;
                }
            }
            if (newidx >= cloudsize) {
                /* don't try further directions */
                break;
            }
        }
    }
    /* We have now either filled up xcoord and ycoord entirely or run out
       of space.  In either case, newidx is the correct total number of
       coordinates inserted. */
    cloud = create_region(null, 0);
    for (i = 0; i < newidx; ++i) {
        tmprect.lx = tmprect.hx = xcoords[i];
        tmprect.ly = tmprect.hy = ycoords[i];
        add_rect_to_reg(cloud, tmprect);
    }
    cloud.ttl = rn1(3, 4);
    /* If cloud was constrained in small space, give it more time to live. */
    cloud.ttl = Math.trunc((cloud.ttl * cloudsize) / newidx);

    await make_gas_cloud(cloud, damage, inside_cloud);
    return cloud;
}

// C ref: read.c valid_cloud_pos()
/* is <x,y> a spot where a gas cloud can spread to? */
function valid_cloud_pos(x, y) {
    if (!isok(x, y))
        return false;
    const typ = game.level.at(x, y).typ;
    /* ACCESSIBLE(typ) || is_pool(x, y) || is_lava(x, y) */
    return ACCESSIBLE(typ) || is_pool(x, y) || is_lava(x, y);
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

    make_gas_cloud_sync(cloud, damage, inside_cloud);
    return cloud;
}

// C ref: region.c region_danger()
/* for checking troubles during prayer; is hero at risk? */
export function region_danger() {
    let n = 0;

    for (const reg of level_regions()) {
        /* only care about regions that hero is in */
        if (!hero_inside(reg))
            continue;
        const f_indx = reg.inside_f;
        /* the only type of region we understand is gas_cloud */
        if (f_indx === INSIDE_GAS_CLOUD) {
            /* completely harmless if you don't need to breathe */
            if (nonliving(game.youmonst.data)
                /* Breathless */
                || uhas(MAGICAL_BREATHING)
                || (game.youmonst.data.mflags1 & M1_BREATHLESS) !== 0)
                continue;
            /* minor inconvenience if you're poison resistant;
               not harmful enough to be a prayer-level trouble */
            if (uhas(POISON_RES))
                continue;
            ++n;
        }
    }
    return n ? true : false;
}

// C ref: region.c region_safety()
/* for fixing trouble at end of prayer;
   danger detected at start of prayer might have expired by now */
export async function region_safety() {
    let r = null;
    let n = 0;

    for (const reg of level_regions()) {
        /* only care about regions that hero is in */
        if (!hero_inside(reg))
            continue;
        const f_indx = reg.inside_f;
        /* the only type of region we understand is gas_cloud */
        if (f_indx === INSIDE_GAS_CLOUD) {
            if (!n++ && reg.ttl >= 0)
                r = reg;
        }
    }

    if (n > 1 || (n === 1 && !r)) {
        /* multiple overlapping cloud regions or non-expiring one */
        await safe_teleds(TELEDS_NO_FLAGS);
        /* maybe there's no safe place available; must get hero out of danger
           or prayer's "fix all troubles" result will get stuck in a loop */
        if (region_danger()) {
            set_itimeout(MAGICAL_BREATHING, d(4, 4) + 4);
            /* not already Breathless or wouldn't be in region danger */
            await You_feel("able to breathe.");
        }
    } else if (r) {
        remove_region(r);
        await pline_The("gas cloud enveloping you dissipates.");
    } else {
        /* cloud dissipated on its own, so nothing needs to be done */
        await pline_The("gas cloud has dissipated.");
    }
    /* maybe cure blindness too */
    if (((game.u.uprops[BLINDED]?.intrinsic || 0) & TIMEOUT) === 1) /* BlindedTimeout */
        await make_blinded(0, true);
}
