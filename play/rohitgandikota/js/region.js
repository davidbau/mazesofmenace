// region.js — gas clouds and other timed area effects.
// C ref: src/region.c
//
// Point clouds can be built either by runtime effects or directly from a
// special-level selection. The queries run for real: does_block() asks
// visible_region_at() for every map square during vision recalculation.

import { pline, newsym } from './display.js';
import { game } from './gstate.js';

import { rn1, rn2, rnd } from './rng.js';
import { isok, distu } from './hacklib.js';
import { M_POISONGAS_OK, REG_NOT_HEROS, REG_HERO_INSIDE,
    PLNMSG_ENVELOPED_IN_GAS, COLNO, ROWNO, EYE, LUNG, KILLED_BY_AN,
    M_SEEN_POISON, FM_FMON, MONST_INC, Something, u_at } from './const.js';
import { m_poisongas_ok, m_at, wake_nearto, setmangry, killed, monkilled } from './mon.js';
import { You, Your, You_see, pline_The } from './pline.js';
import { Blind, Poison_resistance, Half_physical_damage, Half_gas_damage } from './youprop.js';
import { is_silent, haseyes, resists_poison, monstseesu, monstunseesu } from './mondata.js';
import { DEADMONSTER } from './monst.js';
import { Monnam } from './do_name.js';
import { make_blinded } from './potion.js';
import { body_part } from './polyself.js';
import { makeplural } from './objnam.js';
import { losehp } from './hack.js';
import { find_mid } from './light.js';
import { cansee, does_block, block_point, unblock_point } from './vision.js';
import { cmap_names } from './drawing_data.js';
import { PMNAMES, ATTKS } from './monst_data.js';
import { selection_getbounds, selection_getpoint } from './selvar.js';
import { valid_cloud_pos } from './read.js';

/* region.c MAX_CLOUD_SIZE */
const MAX_CLOUD_SIZE = 150;

// src/region.c:13/46 callback indices.
const NO_CALLBACK = -1, INSIDE_GAS_CLOUD = 0, EXPIRE_GAS_CLOUD = 1;

// src/region.c:46 callbacks[]
const callbacks = [inside_gas_cloud, expire_gas_cloud];

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

// src/region.c:80 create_region()
export function create_region(rects, nrect) {
    const reg = {
        bounding_box: nrect > 0 ? { ...rects[0] }
            : { lx: COLNO, ly: ROWNO, hx: 0, hy: 0 },
        nrects: nrect, rects: [], ttl: -1, attach_2_u: false, attach_2_m: 0,
        enter_msg: null, leave_msg: null, expire_f: NO_CALLBACK,
        enter_f: NO_CALLBACK, can_enter_f: NO_CALLBACK,
        leave_f: NO_CALLBACK, can_leave_f: NO_CALLBACK, inside_f: NO_CALLBACK,
        player_flags: REG_NOT_HEROS, n_monst: 0, max_monst: 0, monsters: [],
        arg: 0, visible: false, glyph_cmap: 0,
    };
    for (let i = 0; i < nrect; i++) {
        if (rects[i].lx < reg.bounding_box.lx) reg.bounding_box.lx = rects[i].lx;
        if (rects[i].ly < reg.bounding_box.ly) reg.bounding_box.ly = rects[i].ly;
        if (rects[i].hx > reg.bounding_box.hx) reg.bounding_box.hx = rects[i].hx;
        if (rects[i].hy > reg.bounding_box.hy) reg.bounding_box.hy = rects[i].hy;
        reg.rects[i] = { ...rects[i] };
    }
    return reg;
}

// src/region.c:136 add_rect_to_reg()
export function add_rect_to_reg(reg, rect) {
    reg.rects[reg.nrects++] = { ...rect };
    if (reg.bounding_box.lx > rect.lx) reg.bounding_box.lx = rect.lx;
    if (reg.bounding_box.ly > rect.ly) reg.bounding_box.ly = rect.ly;
    if (reg.bounding_box.hx < rect.hx) reg.bounding_box.hx = rect.hx;
    if (reg.bounding_box.hy < rect.hy) reg.bounding_box.hy = rect.hy;
}

// src/region.c:161 add_mon_to_reg()
export function add_mon_to_reg(reg, mon) {
    /* long worms are handled specially; a worm's segments span squares so
       only include it once no matter how segments the region contains */
    if (mon_in_region(reg, mon)) {
        /* if (mon->data != &mons[PM_LONG_WORM]) impossible(...) */
        return;
    }
    if (reg.max_monst <= reg.n_monst)
        reg.max_monst += MONST_INC;
    reg.monsters[reg.n_monst++] = mon.m_id;
}

// src/region.c:192 remove_mon_from_reg()
export function remove_mon_from_reg(reg, mon) {
    for (let i = 0; i < reg.n_monst; i++)
        if (reg.monsters[i] === mon.m_id) {
            reg.n_monst--;
            reg.monsters[i] = reg.monsters[reg.n_monst];
            return;
        }
}

// src/region.c:210 mon_in_region(); is the monster inside the region's
// monster list?
export function mon_in_region(reg, mon) {
    for (let i = 0; i < reg.n_monst; i++)
        if (reg.monsters[i] === mon.m_id)
            return true;
    return false;
}

// src/region.c:285 add_region()
export function add_region(reg) {
    (game.regions ||= []).push(reg);
    for (let i = reg.bounding_box.lx; i <= reg.bounding_box.hx; i++)
        for (let j = reg.bounding_box.ly; j <= reg.bounding_box.hy; j++) {
            let is_inside = false;
            if (!isok(i, j))
                continue;
            if (inside_region(reg, i, j)) {
                is_inside = true;
                const mtmp = m_at(i, j);
                if (mtmp)
                    add_mon_to_reg(reg, mtmp);
            }
            if (reg.visible) {
                if (is_inside)
                    block_point(i, j);
                if (cansee(i, j))
                    newsym(i, j);
            }
        }
    if (inside_region(reg, game.u.ux, game.u.uy))
        reg.player_flags |= REG_HERO_INSIDE;
    else
        reg.player_flags &= ~REG_HERO_INSIDE;
}

// src/region.c:345 remove_region()
export function remove_region(reg) {
    const rs = game.regions || [];
    const i = rs.indexOf(reg);
    if (i < 0)
        return;
    const last = rs.pop();
    if (i !== rs.length)
        rs[i] = last;
    reg.ttl = -2;
    if (reg.visible) {
        const tmp_uinwater = game.u.uinwater;
        for (let pass = 1; pass <= (Blind() ? 1 : 2); pass++) {
            game.u.uinwater = pass === 1 ? 0 : tmp_uinwater;
            for (let x = reg.bounding_box.lx; x <= reg.bounding_box.hx; x++)
                for (let y = reg.bounding_box.ly; y <= reg.bounding_box.hy; y++)
                    if (isok(x, y) && inside_region(reg, x, y)) {
                        if (pass === 1) {
                            if (!does_block(x, y, game.level.at(x, y)))
                                unblock_point(x, y);
                        } else if (cansee(x, y)) {
                            newsym(x, y);
                        }
                    }
        }
        game.u.uinwater = tmp_uinwater;
    }
}

// src/region.c:741 save_regions(), callbacks are numeric indices.
export function save_regions() {
    return {moves: game.moves, regions: structuredClone(game.regions || [])};
}

// src/region.c:799 rest_regions()
export function rest_regions(saved, ghostly, idmap) {
    game.regions = structuredClone(saved?.regions || []);
    const elapsed = ghostly ? 0 : game.moves - (saved?.moves ?? game.moves);
    for (const reg of game.regions) {
        if (reg.ttl >= 0)
            reg.ttl = Math.max(0, reg.ttl - elapsed);
        if (ghostly)
            reg.player_flags = (reg.player_flags & ~REG_HERO_INSIDE) | REG_NOT_HEROS;
        reg.max_monst = reg.n_monst;
        reg.monsters.length = reg.n_monst;
    }
    for (let i = game.regions.length - 1; i >= 0; i--) {
        const reg = game.regions[i];
        if (reg.ttl === 0) {
            remove_region(reg);
        } else if (ghostly) {
            // reset_region_mids swaps the last entry into a missing one's
            // slot, so a filtered copy would change later callback order.
            let j = 0;
            while (j < reg.n_monst) {
                const id = idmap.get(reg.monsters[j]);
                if (id)
                    reg.monsters[j++] = id;
                else
                    reg.monsters[j] = reg.monsters[--reg.n_monst];
            }
        }
    }
}

// src/region.c:414 run_regions(), age regions and apply inside callbacks.
export async function run_regions() {
    const rs = game.regions || [];
    game.gas_cloud_diss_within = false;
    game.gas_cloud_diss_seen = 0;
    for (let i = rs.length - 1; i >= 0; i--) {
        if (rs[i].ttl === 0) {
            const f_indx = rs[i].expire_f;
            if (f_indx === NO_CALLBACK || await callbacks[f_indx](rs[i], null))
                remove_region(rs[i]);
        }
    }
    for (const reg of rs) {
        if (reg.ttl > 0)
            reg.ttl--;
        const f_indx = reg.inside_f;
        if (f_indx !== NO_CALLBACK && (reg.player_flags & REG_HERO_INSIDE))
            await callbacks[f_indx](reg, null);
        if (f_indx !== NO_CALLBACK) {
            for (let j = 0; j < reg.n_monst; j++) {
                const mtmp = find_mid(reg.monsters[j], FM_FMON);
                if (!mtmp || DEADMONSTER(mtmp) || await callbacks[f_indx](reg, mtmp)) {
                    const k = --reg.n_monst;
                    reg.monsters[j] = reg.monsters[k];
                    reg.monsters[k] = 0;
                    j--;
                }
            }
        }
    }
    if (game.gas_cloud_diss_within) {
        await pline_The('gas cloud around you dissipates.');
        if (game.u.xray_range <= 1)
            game.gas_cloud_diss_seen = 0;
        game.gas_cloud_diss_within = false;
    }
    if (game.gas_cloud_diss_seen) {
        const n = game.gas_cloud_diss_seen;
        await You_see(`${n === 1 ? 'a' : 'some'} gas cloud${n === 1 ? '' : 's'} dissipate.`);
        game.gas_cloud_diss_seen = 0;
    }
}

// src/region.c:480 in_out_region()
export async function in_out_region(x, y) {
    const regions = game.regions || [];
    let f_indx = NO_CALLBACK;

    /* First check if hero can do the move */
    for (const reg of regions) {
        if (reg.attach_2_u)
            continue;
        if (inside_region(reg, x, y)
            ? (!(reg.player_flags & REG_HERO_INSIDE)
               && (f_indx = reg.can_enter_f) !== NO_CALLBACK)
            : ((reg.player_flags & REG_HERO_INSIDE)
               && (f_indx = reg.can_leave_f) !== NO_CALLBACK)) {
            if (!(await callbacks[f_indx](reg, null)))
                return false;
        }
    }

    /* Callbacks for the regions hero does leave */
    for (const reg of regions) {
        if (reg.attach_2_u)
            continue;
        if ((reg.player_flags & REG_HERO_INSIDE) && !inside_region(reg, x, y)) {
            reg.player_flags &= ~REG_HERO_INSIDE;
            if (reg.leave_msg != null)
                await pline(reg.leave_msg);
            if ((f_indx = reg.leave_f) !== NO_CALLBACK)
                await callbacks[f_indx](reg, null);
        }
    }

    /* Callbacks for the regions hero does enter */
    for (const reg of regions) {
        if (reg.attach_2_u)
            continue;
        if (!(reg.player_flags & REG_HERO_INSIDE) && inside_region(reg, x, y)) {
            reg.player_flags |= REG_HERO_INSIDE;
            if (reg.enter_msg != null)
                await pline(reg.enter_msg);
            if ((f_indx = reg.enter_f) !== NO_CALLBACK)
                await callbacks[f_indx](reg, null);
        }
    }

    return true;
}

// src/region.c:533 m_in_out_region()
export async function m_in_out_region(mon, x, y) {
    const regions = game.regions || [];
    let f_indx = NO_CALLBACK;

    /* First check if mon can do the move */
    for (const reg of regions) {
        if (reg.attach_2_m === mon.m_id)
            continue;
        if (inside_region(reg, x, y)
            ? (!mon_in_region(reg, mon)
               && (f_indx = reg.can_enter_f) !== NO_CALLBACK)
            : (mon_in_region(reg, mon)
               && (f_indx = reg.can_leave_f) !== NO_CALLBACK)) {
            if (!(await callbacks[f_indx](reg, mon)))
                return false;
        }
    }

    /* Callbacks for the regions mon does leave */
    for (const reg of regions) {
        if (reg.attach_2_m === mon.m_id)
            continue;
        if (mon_in_region(reg, mon) && !inside_region(reg, x, y)) {
            remove_mon_from_reg(reg, mon);
            if ((f_indx = reg.leave_f) !== NO_CALLBACK)
                await callbacks[f_indx](reg, mon);
        }
    }

    /* Callbacks for the regions mon does enter */
    for (const reg of regions) {
        if (reg.attach_2_m === mon.m_id)
            continue;
        if (!mon_in_region(reg, mon) && inside_region(reg, x, y)) {
            add_mon_to_reg(reg, mon);
            if ((f_indx = reg.enter_f) !== NO_CALLBACK)
                await callbacks[f_indx](reg, mon);
        }
    }

    return true;
}

// src/region.c:582 update_player_regions()
export function update_player_regions() {
    for (const reg of game.regions || []) {
        if (!reg.attach_2_u && inside_region(reg, game.u.ux, game.u.uy))
            reg.player_flags |= REG_HERO_INSIDE;
        else
            reg.player_flags &= ~REG_HERO_INSIDE;
    }
}

// src/region.c:598 update_monster_region(); a monster moved: fix its
// membership in every region
export function update_monster_region(mon) {
    const regions = game.regions || [];

    for (let i = 0; i < regions.length; i++) {
        if (inside_region(regions[i], mon.mx, mon.my)) {
            if (!mon_in_region(regions[i], mon))
                add_mon_to_reg(regions[i], mon);
        } else {
            if (mon_in_region(regions[i], mon))
                remove_mon_from_reg(regions[i], mon);
        }
    }
}

// src/region.c:651 reg_damg()
export function reg_damg(reg) {
    return !reg.visible || reg.ttl === -2 ? 0 : reg.arg;
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

// src/region.c:1046 expire_gas_cloud()
export function expire_gas_cloud(reg) {
    let damage = reg.arg;
    if (damage >= 5) {
        damage = Math.trunc(damage / 2);
        reg.arg = damage;
        reg.ttl = 2;
        return false;
    }
    for (let pass = 1; pass <= (Blind() ? 1 : 2); pass++)
        for (let x = reg.bounding_box.lx; x <= reg.bounding_box.hx; x++)
            for (let y = reg.bounding_box.ly; y <= reg.bounding_box.hy; y++)
                if (inside_region(reg, x, y)) {
                    if (pass === 1) {
                        if (!does_block(x, y, game.level.at(x, y)))
                            unblock_point(x, y);
                    } else if (!game.u.uswallow) {
                        if (u_at(x, y))
                            game.gas_cloud_diss_within = true;
                        else if (cansee(x, y))
                            game.gas_cloud_diss_seen++;
                    }
                }
    return true;
}

// src/region.c:1091 inside_gas_cloud()
export async function inside_gas_cloud(reg, mtmp) {
    const umon = mtmp || game.youmonst;
    let dam = reg.arg;
    if (reg.ttl < 20 && umon && umon.mnum === PMNAMES.PM_FOG_CLOUD)
        reg.ttl += 5;
    if (dam < 1)
        return false;

    if (!mtmp) {
        if (m_poisongas_ok(game.youmonst) === M_POISONGAS_OK)
            return false;
        if (!Blind()) {
            await Your(`${makeplural(body_part(EYE))} sting.`);
            await make_blinded(1, false);
        }
        if (!Poison_resistance()) {
            await pline(`${Something} is burning your ${makeplural(body_part(LUNG))}!`);
            await You('cough and spit blood!');
            await wake_nearto(game.u.ux, game.u.uy, 2);
            dam = rnd(dam) + 5;
            if (Half_physical_damage())
                dam = Math.trunc((dam + 1) / 2);
            if (Half_gas_damage())
                dam = Math.trunc((dam + 1) / 2);
            await losehp(dam, 'gas cloud', KILLED_BY_AN);
            monstunseesu(M_SEEN_POISON);
            return false;
        } else {
            await You('cough!');
            await wake_nearto(game.u.ux, game.u.uy, 2);
            monstseesu(M_SEEN_POISON);
            return false;
        }
    } else if (m_poisongas_ok(mtmp) !== M_POISONGAS_OK) {
        if (!is_silent(mtmp.data)) {
            if (cansee(mtmp.mx, mtmp.my) || distu(mtmp.mx, mtmp.my) < 8)
                await pline(`${Monnam(mtmp)} coughs!`);
            await wake_nearto(mtmp.mx, mtmp.my, 2);
        }
        if (!(reg.player_flags & REG_NOT_HEROS))
            await setmangry(mtmp, true);
        if (haseyes(mtmp.data) && mtmp.mcansee) {
            mtmp.mblinded = 1;
            mtmp.mcansee = 0;
        }
        if (resists_poison(mtmp))
            return false;
        mtmp.mhp -= rnd(dam) + 5;
        if (DEADMONSTER(mtmp)) {
            if (!(reg.player_flags & REG_NOT_HEROS))
                await killed(mtmp);
            else
                await monkilled(mtmp, 'gas cloud', ATTKS.AD_DRST);
            if (DEADMONSTER(mtmp))
                return true;
        }
    }
    return false;
}

// src/region.c:1168 is_hero_inside_gas_cloud()
function is_hero_inside_gas_cloud() {
    return (game.regions || []).some(reg => (reg.player_flags & REG_HERO_INSIDE)
        && reg.inside_f === INSIDE_GAS_CLOUD);
}

// src/region.c:1182 make_gas_cloud() — flags, callbacks and the visible
// glyph. Damage clouds are poison (S_poisoncloud), zero-damage clouds are
// steam/vapor (S_cloud).
function make_gas_cloud(cloud, damage, inside_cloud) {
    if (!game.in_mklev && !game.context?.mon_moving)
        cloud.player_flags &= ~REG_NOT_HEROS;
    cloud.inside_f = INSIDE_GAS_CLOUD;
    cloud.expire_f = EXPIRE_GAS_CLOUD;
    cloud.arg = damage;
    cloud.visible = true;
    cloud.damaging = !!damage;
    /* src/region.c:1194 — reg->glyph = cmap_to_glyph(damage ? S_poisoncloud
       : S_cloud); show_region() (js/display.js) paints it */
    cloud.glyph_cmap = damage ? cmap_names.S_poisoncloud : cmap_names.S_cloud;
    add_region(cloud);
    if (!game.in_mklev && !inside_cloud && is_hero_inside_gas_cloud())
        return (async () => {
            await You(`are enveloped in a cloud of ${damage ? 'noxious gas' : 'steam'}!`);
            game.iflags.last_msg = PLNMSG_ENVELOPED_IN_GAS;
        })();
}

// src/region.c:1210 create_gas_cloud() — breadth-first cloud growth from
// <x,y> with a Fisher-Yates direction shuffle per visited cell. A size-1
// cloud (a fog cloud's vapor trail) draws only its rn1(3,4) ttl.
export function create_gas_cloud(x, y, cloudsize, damage) {
    const xcoords = [x], ycoords = [y];
    let newidx = 1;
    let inside_cloud = is_hero_inside_gas_cloud();
    if (!game.context?.mon_moving && game.u.ux === x && game.u.uy === y
        && cloudsize === 1 && (!damage
            || (damage && m_poisongas_ok(game.youmonst) === M_POISONGAS_OK)))
        inside_cloud = true;

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

    const cloud = create_region(null, 0);
    for (let i = 0; i < newidx; ++i) {
        const r = { lx: xcoords[i], hx: xcoords[i],
                    ly: ycoords[i], hy: ycoords[i] };
        add_rect_to_reg(cloud, r);
    }
    cloud.ttl = rn1(3, 4);
    /* a cloud constrained in a small space lives longer */
    cloud.ttl = Math.trunc((cloud.ttl * cloudsize) / newidx);

    const message = make_gas_cloud(cloud, damage, inside_cloud);
    return message ? message.then(() => cloud) : cloud;
}

// src/region.c:1315 create_gas_cloud_selection(). Special-level clouds have
// no random lifetime: create_region() leaves ttl at -1, so they persist.
export function create_gas_cloud_selection(sel, damage) {
    const inside_cloud = is_hero_inside_gas_cloud();
    const bounds = { lx: 0, ly: 0, hx: 0, hy: 0 };
    selection_getbounds(sel, bounds);
    const cloud = create_region(null, 0);

    for (let x = bounds.lx; x <= bounds.hx; x++)
        for (let y = bounds.ly; y <= bounds.hy; y++)
            if (selection_getpoint(x, y, sel)) {
                add_rect_to_reg(cloud, { lx: x, hx: x, ly: y, hy: y });
            }

    const message = make_gas_cloud(cloud, damage, inside_cloud);
    return message ? message.then(() => cloud) : cloud;
}
