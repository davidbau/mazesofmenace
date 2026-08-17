// region.js — gas-cloud / NhRegion subset.
// C ref: region.c create_gas_cloud / make_gas_cloud / visible_region_at /
// clear_regions / run_regions / expire_gas_cloud / in_out_region /
// m_in_out_region / update_monster_region / inside_gas_cloud;
// region_danger / region_safety (pray);
// read.c valid_cloud_pos.
// Named omissions: numeric cmap glyph ints (JS tags
// 'S_poisoncloud'/'S_cloud'); binary save_regions format; force
// fields; incremental fill_point (JS uses vision_reset);
// create_msg_region (#if 0; never sets enter/leave_msg in live C);
// can_enter/leave/enter/leave table indices (gas NO_CALLBACK);
// attach_2_m skip is m_in_out_region (D-1176; update_monster_region
// does not skip — C); region_danger / region_safety still use geometry
// (run_regions hero inside_f uses the REG_HERO_INSIDE bit, D-1169);
// mfndpos m_poisongas_ok D-1159 (mon.js; this file keeps a local clone
// — mon.js imports visible_region_at). fumaroles whoosh D-1156. Walk
// in_out_region D-1157. hurtle_step in_out_region D-1165. goto_level
// in_out_region D-1166. mhurtle_step m_in_out_region D-1176. youmonst
// m_postmove_effect D-1167 (trail at u.ux0). allmain moveloop fumaroles
// D-1168. allmain youmonst m_everyturn_effect D-1175 (fog at u.ux).
// Selection create D-1158. rloc_to update_monster_region D-1161; mhitm
// mdisplacem D-1174 (dbridge named).
// Level leave stashes the regions array (D-0675).

import { game } from './gstate.js';
import { rn2, rn1, d, rnd } from './rng.js';
import { pline, You_feel } from './display.js';
import {
    isok, ACCESSIBLE, COLNO, ROWNO, u_at, TIMEOUT, REG_HERO_INSIDE,
    REG_NOT_HEROS,
    PLNMSG_ENVELOPED_IN_GAS, KILLED_BY_AN, EYE, LUNG, POISON_RES,
    M_SEEN_POISON, M_POISONGAS_OK, M_POISONGAS_MINOR, M_POISONGAS_BAD,
    Is_waterlevel,
} from './const.js';
import {
    is_pool, is_lava, losehp, maybe_half_phys, finish_maybe_wail,
} from './hack.js';
import { recalc_block_point, cansee } from './vision.js';
import {
    monsterNames, nonliving, breathless, haseyes, is_vampshifter,
    MR_POISON,
} from './monsters.js';
import { objectNames } from './objects.js';
import { makeplural } from './objnam.js';
import { body_part } from './polyself.js';
import { Monnam } from './do_name.js';
import { monstseesu, monstunseesu } from './mondata.js';
import { dist2 } from './hacklib.js';

const MAX_CLOUD_SIZE = 150;
const INSIDE_GAS_CLOUD = 1; // JS inside_f tag (C callbacks[] uses 0)
const EXPIRE_GAS_CLOUD = 1; // C region.c callbacks[] index
const NO_CALLBACK = -1; // C region.c
const AT_BREA = 12; // C monattk.h
const AD_DRST = 7;
const AD_RBRE = 242;
const MS_SILENT = 0;
const PM_FOG_CLOUD = monsterNames.indexOf('PM_FOG_CLOUD');
const PM_HEZROU = monsterNames.indexOf('PM_HEZROU');
const PM_VROCK = monsterNames.indexOf('PM_VROCK');
const TOWEL = objectNames.indexOf('TOWEL');

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

/** C region.h hero_inside / set_hero_inside / clear_hero_inside. */
function hero_inside(reg) {
    return ((reg.player_flags | 0) & REG_HERO_INSIDE) !== 0;
}
function set_hero_inside(reg) {
    reg.player_flags = (reg.player_flags | 0) | REG_HERO_INSIDE;
}
function clear_hero_inside(reg) {
    reg.player_flags = (reg.player_flags | 0) & ~REG_HERO_INSIDE;
}
/** C region.h set_heros_fault — clear REG_NOT_HEROS. */
function set_heros_fault(reg) {
    reg.player_flags = (reg.player_flags | 0) & ~REG_NOT_HEROS;
}
/** C region.h clear_heros_fault — set REG_NOT_HEROS (natural clouds). */
export function clear_heros_fault(reg) {
    reg.player_flags = (reg.player_flags | 0) | REG_NOT_HEROS;
}
/** C region.h heros_fault — REG_NOT_HEROS clear. */
function heros_fault(reg) {
    return ((reg.player_flags | 0) & REG_NOT_HEROS) === 0;
}

/** C youprop.h Blind — (H||E) && !B; roleplay blind. */
function Blind() {
    const u = game.u || {};
    if (u.uroleplay?.blind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

/** C youprop.h Half_gas_damage — damp/wet towel (spe > 0). */
function Half_gas_damage() {
    const t = game.u?.ublindf;
    return !!(t && TOWEL >= 0 && t.otyp === TOWEL && (t.spe | 0) > 0);
}

/** C mondata.h is_silent — msound == MS_SILENT. */
function is_silent(ptr) {
    return (ptr?.msound | 0) === MS_SILENT;
}

/** C mondata.h immune_poisongas — Hezrou or Vrock (mndx; JS mons() allocs). */
function immune_poisongas(ptr) {
    const n = ptr?.mndx ?? -1;
    return n === PM_HEZROU || n === PM_VROCK;
}

/**
 * C ref: mondata.c attacktype_fordmg — first mattk with aatyp+adtyp.
 */
function attacktype_fordmg(ptr, atyp, dtyp) {
    const slots = ptr?.mattk;
    if (!slots) return null;
    for (let i = 0; i < slots.length; i++) {
        const a = slots[i];
        if ((a?.aatyp | 0) === atyp
            && (dtyp === -1 || (a?.adtyp | 0) === dtyp)) {
            return a;
        }
    }
    return null;
}

/**
 * C ref: monst.h resists_poison → Resists_Elem(POISON_RES) subset:
 * data.mresists | mextrinsics | mintrinsics. Artifact/worn grants named.
 */
function resists_poison(mtmp) {
    if (!mtmp || mtmp === game.youmonst) return Poison_resistance();
    const bits = (mtmp.data?.mresists | 0)
        | (mtmp.mextrinsics | 0)
        | (mtmp.mintrinsics | 0);
    return !!(bits & MR_POISON);
}

function distu(x, y) {
    const u = game.u || {};
    return dist2(x, y, u.ux | 0, u.uy | 0);
}

/**
 * C ref: mon.c m_poisongas_ok — OK / MINOR / BAD for gas clouds.
 * null mtmp ≡ hero (&youmonst). Local clone of mon.js (D-1159);
 * import cycle: mon.js pulls visible_region_at from here.
 */
function m_poisongas_ok(mtmp) {
    const is_you = !mtmp || mtmp === game.youmonst;
    const ptr = (mtmp || game.youmonst)?.data;
    if (nonliving(ptr) || is_vampshifter(mtmp || game.youmonst)
        || breathless(ptr) || immune_poisongas(ptr)) {
        return M_POISONGAS_OK;
    }
    const u = game.u || {};
    const px = is_you ? (u.ux | 0) : (mtmp.mx | 0);
    const py = is_you ? (u.uy | 0) : (mtmp.my | 0);
    if ((ptr?.mlet === 'S_EEL' || Is_waterlevel(u.uz)) && is_pool(px, py)) {
        return M_POISONGAS_OK;
    }
    if (attacktype_fordmg(ptr, AT_BREA, AD_DRST)
        || attacktype_fordmg(ptr, AT_BREA, AD_RBRE)) {
        return M_POISONGAS_OK;
    }
    if (is_you && (u.uinvulnerable || Breathless() || u.uinwater)) {
        return M_POISONGAS_OK;
    }
    if (is_you ? Poison_resistance() : resists_poison(mtmp)) {
        return M_POISONGAS_MINOR;
    }
    return M_POISONGAS_BAD;
}

function callback_set(f) {
    return f != null && f !== NO_CALLBACK;
}

/**
 * C region.c callbacks[] is inside_gas/expire_gas only; enter/leave
 * are always NO_CALLBACK in live C (force field #if 0). A function
 * value is for a canary / future enter_force_field.
 */
function invoke_region_cb(f_indx, reg, arg) {
    if (typeof f_indx === 'function') return !!f_indx(reg, arg);
    return true;
}

function is_hero_inside_gas_cloud() {
    /* C region.c:1168–1176 — REG_HERO_INSIDE bit, not geometry.
     * Walk in_out_region (D-1157), hurtle_step (D-1165), goto_level
     * (D-1166), and teleds update_player_regions keep the bit live;
     * add_region still sets it from dest. */
    for (const reg of game.regions || []) {
        if (hero_inside(reg) && reg.inside_f === INSIDE_GAS_CLOUD) {
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
 * C ref: region.c inside_gas_cloud — fog TTL; dam>0 hero/mon HP.
 * Returns true if p2 died (drop from reg.monsters). Hero is null.
 */
async function inside_gas_cloud(reg, mtmp) {
    const umon = mtmp || game.youmonst;
    const mnum = umon?.mnum ?? umon?.data?.mndx ?? -1;
    // C: fog clouds maintain gas clouds, even poisonous ones
    if ((reg.ttl | 0) < 20 && umon && mnum === PM_FOG_CLOUD) {
        reg.ttl = (reg.ttl | 0) + 5;
    }
    const dam0 = reg.arg | 0;
    if (dam0 < 1) return false;

    if (!mtmp) {
        if (m_poisongas_ok(game.youmonst) === M_POISONGAS_OK) return false;
        if (!Blind()) {
            await pline(`Your ${makeplural(body_part(EYE))} sting.`);
            const { make_blinded } = await import('./do.js');
            await make_blinded(1, false);
        }
        if (!Poison_resistance()) {
            await pline(
                `Something is burning your ${makeplural(body_part(LUNG))}!`,
            );
            await pline('You cough and spit blood!');
            const u = game.u || {};
            const { wake_nearto } = await import('./mon.js');
            await wake_nearto(u.ux | 0, u.uy | 0, 2);
            let dam = maybe_half_phys(rnd(dam0) + 5);
            if (Half_gas_damage()) dam = Math.trunc((dam + 1) / 2);
            losehp(dam, 'gas cloud', KILLED_BY_AN);
            if (game._losehp_needs_done) {
                const { finish_losehp_done } = await import('./end.js');
                await finish_losehp_done();
                return false;
            }
            await finish_maybe_wail();
            monstunseesu(M_SEEN_POISON);
            return false;
        }
        await pline('You cough!');
        {
            const u = game.u || {};
            const { wake_nearto } = await import('./mon.js');
            await wake_nearto(u.ux | 0, u.uy | 0, 2);
        }
        monstseesu(M_SEEN_POISON);
        return false;
    }

    if (m_poisongas_ok(mtmp) !== M_POISONGAS_OK) {
        if (!is_silent(mtmp.data)) {
            if (cansee(mtmp.mx, mtmp.my) || distu(mtmp.mx, mtmp.my) < 8) {
                await pline(`${Monnam(mtmp)} coughs!`);
            }
            const { wake_nearto } = await import('./mon.js');
            await wake_nearto(mtmp.mx | 0, mtmp.my | 0, 2);
        }
        if (heros_fault(reg)) {
            const { setmangry } = await import('./mon.js');
            setmangry(mtmp, true);
        }
        if (haseyes(mtmp.data) && mtmp.mcansee) {
            mtmp.mblinded = 1;
            mtmp.mcansee = 0;
        }
        if (resists_poison(mtmp)) return false;
        mtmp.mhp = (mtmp.mhp | 0) - (rnd(dam0) + 5);
        if ((mtmp.mhp | 0) < 1) {
            if (heros_fault(reg)) {
                const { killed } = await import('./uhitm.js');
                await killed(mtmp);
            } else {
                const { monkilled } = await import('./mhitm.js');
                await monkilled(mtmp, 'gas cloud', AD_DRST);
            }
            if ((mtmp.mhp | 0) < 1) return true;
        }
    }
    return false;
}

/**
 * C ref: region.c make_gas_cloud — register region then maybe envelop.
 * C add_region scans m_at into reg->monsters and block_point; JS rebuilds
 * vision via recalc_block_point (full vision_reset).
 */
async function make_gas_cloud(cloud, damage, inside_cloud) {
    // C: !gi.in_mklev && !svc.context.mon_moving → set_heros_fault
    // (create_region already clear_heros_fault / REG_NOT_HEROS).
    if (!game.in_mklev && !game.gi?.in_mklev && !game.context?.mon_moving) {
        set_heros_fault(cloud);
    }
    cloud.inside_f = INSIDE_GAS_CLOUD;
    cloud.expire_f = EXPIRE_GAS_CLOUD;
    cloud.arg = damage | 0;
    // C: cmap_to_glyph(damage ? S_poisoncloud : S_cloud) — mfndpos only
    // avoids poisoncloud (damage>0). Numeric cmap deferred; tag suffices.
    cloud.glyph = damage ? 'S_poisoncloud' : 'S_cloud';
    cloud.visible = true;
    if (!cloud.monsters) cloud.monsters = [];
    /* C create_region defaults + add_region hero_inside. */
    if (cloud.can_enter_f == null) cloud.can_enter_f = NO_CALLBACK;
    if (cloud.can_leave_f == null) cloud.can_leave_f = NO_CALLBACK;
    if (cloud.enter_f == null) cloud.enter_f = NO_CALLBACK;
    if (cloud.leave_f == null) cloud.leave_f = NO_CALLBACK;
    if (cloud.attach_2_m == null) cloud.attach_2_m = 0;
    cloud.attach_2_u = !!cloud.attach_2_u;
    cloud.player_flags = cloud.player_flags | 0;
    {
        const u = game.u || {};
        if (inside_region(cloud, u.ux | 0, u.uy | 0)) set_hero_inside(cloud);
        else clear_hero_inside(cloud);
    }
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
    // C: !in_mklev && !inside_cloud && is_hero_inside_gas_cloud
    if (!game.in_mklev && !game.gi?.in_mklev
        && !inside_cloud && is_hero_inside_gas_cloud()) {
        await pline(
            `You are enveloped in a cloud of ${
                damage ? 'noxious gas' : 'steam'}!`,
        );
        if (!game.iflags) game.iflags = {};
        game.iflags.last_msg = PLNMSG_ENVELOPED_IN_GAS;
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
 * C ref: region.c in_out_region — can_enter/leave then membership.
 * Gas has NO_CALLBACK enter/leave so this never rejects; it still
 * updates REG_HERO_INSIDE. pline1(leave_msg) after clear, then
 * pline1(enter_msg) after set, when the pointer is non-NULL (D-1143).
 * create_msg_region is #if 0 so live gas never sets those strings;
 * save/rest can still restore them. hack.c walk caller D-1157;
 * dothrow.c hurtle_step D-1165; do.c goto_level D-1166.
 * Monster analog is m_in_out_region (walk; mhurtle_step D-1176).
 */
export async function in_out_region(x, y) {
    const regs = game.regions || [];

    /* First check if hero can do the move */
    for (const reg of regs) {
        if (reg.attach_2_u) continue;
        const dest_in = inside_region(reg, x, y);
        let f_indx = NO_CALLBACK;
        const need = dest_in
            ? (!hero_inside(reg)
                && callback_set(f_indx = (reg.can_enter_f ?? NO_CALLBACK)))
            : (hero_inside(reg)
                && callback_set(f_indx = (reg.can_leave_f ?? NO_CALLBACK)));
        if (need && !invoke_region_cb(f_indx, reg, null)) return false;
    }

    /* Callbacks for the regions hero does leave */
    for (const reg of regs) {
        if (reg.attach_2_u) continue;
        if (hero_inside(reg) && !inside_region(reg, x, y)) {
            clear_hero_inside(reg);
            /* C: if (leave_msg != 0) pline1(leave_msg); */
            if (reg.leave_msg != null) await pline(reg.leave_msg);
            const f_indx = reg.leave_f ?? NO_CALLBACK;
            if (callback_set(f_indx)) invoke_region_cb(f_indx, reg, null);
        }
    }

    /* Callbacks for the regions hero does enter */
    for (const reg of regs) {
        if (reg.attach_2_u) continue;
        if (!hero_inside(reg) && inside_region(reg, x, y)) {
            set_hero_inside(reg);
            /* C: if (enter_msg != 0) pline1(enter_msg); */
            if (reg.enter_msg != null) await pline(reg.enter_msg);
            const f_indx = reg.enter_f ?? NO_CALLBACK;
            if (callback_set(f_indx)) invoke_region_cb(f_indx, reg, null);
        }
    }
    return true;
}

/**
 * C ref: region.c update_player_regions — teleds after u_on_newpos
 * / fill_pit / placebc. Absolute REG_HERO_INSIDE from (u.ux,u.uy).
 * attach_2_u always clear_hero_inside (C dangling else of
 * !attach_2_u && inside). No enter/leave callbacks or msgs —
 * those are in_out_region (teleok probes; hack.c walk D-1157;
 * dothrow.c hurtle_step D-1165; do.c goto_level D-1166).
 */
export function update_player_regions() {
    const u = game.u || {};
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    for (const reg of game.regions || []) {
        if (!reg.attach_2_u && inside_region(reg, ux, uy)) {
            set_hero_inside(reg);
        } else {
            clear_hero_inside(reg);
        }
    }
}

/**
 * C ref: region.c update_monster_region — rloc_to_core after
 * place_monster, before worm tail (teleport.c:1685, D-1161).
 * Absolute membership from (mon.mx, mon.my). No can_enter/leave
 * or enter/leave callbacks — those are m_in_out_region (walk /
 * mhurtle_step D-1176). C does not skip attach_2_m here. mhitm
 * mdisplacem D-1174 (after both place_monster + defender worm tail).
 * dbridge named.
 */
export function update_monster_region(mon) {
    const mx = mon.mx | 0;
    const my = mon.my | 0;
    for (const reg of game.regions || []) {
        if (inside_region(reg, mx, my)) {
            if (!mon_in_region(reg, mon)) add_mon_to_reg(reg, mon);
        } else {
            if (mon_in_region(reg, mon)) remove_mon_from_reg(reg, mon);
        }
    }
}

/**
 * C ref: region.c m_in_out_region — dest (x,y) before place (walk;
 * dothrow.c mhurtle_step D-1176). Skip attach_2_m == m_id. can_enter/
 * can_leave may reject; then leave_f after remove, enter_f after add.
 * Gas NO_CALLBACK never rejects. rloc uses update_monster_region
 * (no callbacks). No enter/leave msgs (hero in_out_region only).
 */
export function m_in_out_region(mon, x, y) {
    if (!mon) return true;
    const regs = game.regions || [];
    const mid = mon.m_id | 0;

    /* First check if mon can do the move */
    for (const reg of regs) {
        if ((reg.attach_2_m | 0) === mid) continue;
        const dest_in = inside_region(reg, x, y);
        let f_indx = NO_CALLBACK;
        const need = dest_in
            ? (!mon_in_region(reg, mon)
                && callback_set(f_indx = (reg.can_enter_f ?? NO_CALLBACK)))
            : (mon_in_region(reg, mon)
                && callback_set(f_indx = (reg.can_leave_f ?? NO_CALLBACK)));
        if (need && !invoke_region_cb(f_indx, reg, mon)) return false;
    }

    /* Callbacks for the regions mon does leave */
    for (const reg of regs) {
        if ((reg.attach_2_m | 0) === mid) continue;
        if (mon_in_region(reg, mon) && !inside_region(reg, x, y)) {
            remove_mon_from_reg(reg, mon);
            const f_indx = reg.leave_f ?? NO_CALLBACK;
            if (callback_set(f_indx)) invoke_region_cb(f_indx, reg, mon);
        }
    }

    /* Callbacks for the regions mon does enter */
    for (const reg of regs) {
        if ((reg.attach_2_m | 0) === mid) continue;
        if (!mon_in_region(reg, mon) && inside_region(reg, x, y)) {
            add_mon_to_reg(reg, mon);
            const f_indx = reg.enter_f ?? NO_CALLBACK;
            if (callback_set(f_indx)) invoke_region_cb(f_indx, reg, mon);
        }
    }
    return true;
}

/**
 * C hack.h plur — "" when n==1 else "s".
 */
function plur(n) {
    return (n | 0) === 1 ? '' : 's';
}

/**
 * C ref: pline.c You_see — "You see " prefix; Blind → "You sense".
 * Unaware deferred.
 */
async function You_see(line) {
    if (Blind()) await pline(`You sense ${line}`);
    else await pline(`You see ${line}`);
}

/**
 * C NhRegion bounding_box from rects — expire_gas_cloud scans this
 * then inside_region, so overlapping rects count once.
 */
function region_bounding_box(reg) {
    const rects = reg.rects || [];
    if (!rects.length) return { lx: 1, hx: 0, ly: 0, hy: -1 };
    let lx = rects[0].lx | 0;
    let hx = rects[0].hx | 0;
    let ly = rects[0].ly | 0;
    let hy = rects[0].hy | 0;
    for (let i = 1; i < rects.length; i++) {
        const r = rects[i];
        if ((r.lx | 0) < lx) lx = r.lx | 0;
        if ((r.hx | 0) > hx) hx = r.hx | 0;
        if ((r.ly | 0) < ly) ly = r.ly | 0;
        if ((r.hy | 0) > hy) hy = r.hy | 0;
    }
    return { lx, hx, ly, hy };
}

/**
 * C ref: region.c expire_gas_cloud — thick cloud halves arg and
 * resets ttl=2 (keep); thin cloud counts dissipation cells then
 * returns TRUE so run_regions remove_region. Pass 1 C unblock is a
 * no-op while the region is still visible (does_block sees it);
 * JS rebuilds in remove_region after ttl=-2. Pass 2 uses current
 * cansee (C viz_array; unblock only sets vision_full_recalc).
 */
function expire_gas_cloud(reg) {
    let damage = reg.arg | 0;
    /* If it was a thick cloud, it dissipates a little first */
    if (damage >= 5) {
        damage = (damage / 2) | 0;
        reg.arg = damage;
        reg.ttl = 2; /* Here's the trick : reset ttl */
        return false; /* still there */
    }

    const u = game.u || {};
    const gg = game.gg || (game.gg = {});
    const passes = Blind() ? 1 : 2;
    const box = region_bounding_box(reg);
    for (let pass = 1; pass <= passes; ++pass) {
        for (let x = box.lx; x <= box.hx; x++) {
            for (let y = box.ly; y <= box.hy; y++) {
                if (!inside_region(reg, x, y)) continue;
                if (pass === 1) {
                    /* C: !does_block → unblock_point. Gas still
                       visible so does_block stays true; remove_region
                       unblocks after ttl=-2. */
                } else if (!u.uswallow) {
                    if (u_at(x, y)) gg.gas_cloud_diss_within = true;
                    else if (cansee(x, y)) {
                        gg.gas_cloud_diss_seen = (gg.gas_cloud_diss_seen | 0) + 1;
                    }
                }
            }
        }
    }
    return true; /* gone — caller free it */
}

/**
 * C ref: region.c run_regions — ttl expiry then age + inside_f
 * callbacks, then gas dissipation plines (D-1155).
 * Envelope: gas-cloud ttl; fog-in-cloud TTL refresh (D-0834);
 * inside_f dam>0 hero/mon HP (D-1146); expire_gas_cloud thick
 * halve + thin diss_within / diss_seen plines.
 * Hero inside_f uses hero_inside() (D-1169; C 439–441), not
 * inside_region(u.ux,u.uy). Walk / hurtle_step / goto_level /
 * teleds keep the bit (D-1157 / D-1165 / D-1166 / D-1130).
 * region_danger / region_safety still geometric (named).
 * Polyed Hezrou/Steam walk leaves a size-1 trail at u.ux0 (D-1167).
 */
export async function run_regions() {
    const gg = game.gg || (game.gg = {});
    /* reset some messaging variables */
    gg.gas_cloud_diss_within = false;
    gg.gas_cloud_diss_seen = 0;

    const regs = game.regions || [];
    // End of life — backward because remove mutates the array
    for (let i = regs.length - 1; i >= 0; i--) {
        const reg = regs[i];
        if ((reg.ttl | 0) !== 0) continue;
        // C: expire_f == NO_CALLBACK || callback() → remove_region
        const f_indx = reg.expire_f ?? NO_CALLBACK;
        if (f_indx === NO_CALLBACK || expire_gas_cloud(reg)) {
            remove_region(reg);
        }
    }
    // Age remaining + inside_f (fog maintains vapor; dam>0 HP)
    for (const reg of game.regions || []) {
        if ((reg.ttl | 0) > 0) reg.ttl = (reg.ttl | 0) - 1;
        if (reg.inside_f !== INSIDE_GAS_CLOUD) continue;
        /* C region.c:439–441 — f_indx != NO_CALLBACK &&
         * hero_inside(reg) then callbacks[f_indx](reg, Null). */
        if (hero_inside(reg)) {
            await inside_gas_cloud(reg, null);
            if (game.program_state?.gameover) return;
        }
        const mids = reg.monsters || [];
        for (let j = 0; j < mids.length; j++) {
            const mtmp = find_mid(mids[j]);
            if (!mtmp || (mtmp.mhp | 0) <= 0
                || await inside_gas_cloud(reg, mtmp)) {
                mids[j] = mids[mids.length - 1];
                mids.pop();
                j--;
            }
            if (game.program_state?.gameover) return;
        }
    }

    if (gg.gas_cloud_diss_within) {
        await pline('The gas cloud around you dissipates.');
        /* normally won't see additional dissipation when within */
        if ((game.u?.xray_range | 0) <= 1) gg.gas_cloud_diss_seen = 0;
        gg.gas_cloud_diss_within = false;
    }
    if (gg.gas_cloud_diss_seen) {
        const n = gg.gas_cloud_diss_seen | 0;
        await You_see(
            `${n === 1 ? 'a' : 'some'} gas cloud${plur(n)} dissipate.`,
        );
        gg.gas_cloud_diss_seen = 0;
    }
}

/**
 * C ref: region.c create_gas_cloud — BFS expand + ttl = rn1(3,4).
 * Size-1 (fog/Hezrou/Steam): no expand RNG, only ttl.
 */
export async function create_gas_cloud(x, y, cloudsize, damage) {
    const xcoords = new Array(MAX_CLOUD_SIZE);
    const ycoords = new Array(MAX_CLOUD_SIZE);
    xcoords[0] = x;
    ycoords[0] = y;
    let newidx = 1;
    let inside_cloud = is_hero_inside_gas_cloud();

    // C: single-point on hero + (!damage || m_poisongas_ok==OK)
    if (!game.context?.mon_moving && u_at(x, y) && cloudsize === 1
        && (!(damage | 0)
            || m_poisongas_ok(game.youmonst) === M_POISONGAS_OK)) {
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

    // C create_region: clear_heros_fault (REG_NOT_HEROS) before make_gas_cloud
    const cloud = {
        rects: [], ttl: -1, visible: false, inside_f: 0, arg: 0,
        player_flags: REG_NOT_HEROS,
    };
    for (let i = 0; i < newidx; ++i) {
        cloud.rects.push({
            lx: xcoords[i], hx: xcoords[i],
            ly: ycoords[i], hy: ycoords[i],
        });
    }
    // C: cloud->ttl = rn1(3, 4); then scale if constrained
    cloud.ttl = rn1(3, 4);
    cloud.ttl = Math.trunc((cloud.ttl * cloudsize) / newidx);

    await make_gas_cloud(cloud, damage, inside_cloud);
    return cloud;
}

/**
 * C ref: selvar.c selection_getbounds — dirty recalc omitted (JS
 * Set-backed sels keep lx..hy live). Empty (lx >= COLNO) → full map
 * so the scan matches C's getpoint-all-false walk.
 */
function selection_getbounds(sel) {
    if (!sel) return { lx: 0, ly: 0, hx: COLNO - 1, hy: ROWNO - 1 };
    const lx = sel.lx | 0;
    if (lx >= COLNO) return { lx: 0, ly: 0, hx: COLNO - 1, hy: ROWNO - 1 };
    return {
        lx,
        ly: sel.ly | 0,
        hx: sel.hx | 0,
        hy: sel.hy | 0,
    };
}

/** C ref: selvar.c selection_getpoint — Set-backed JS selection. */
function selection_getpoint_sel(x, y, sel) {
    if (!sel || x < 0 || y < 0 || x >= COLNO || y >= ROWNO) return 0;
    return sel.pts?.has(`${x},${y}`) ? 1 : 0;
}

/**
 * C ref: region.c create_gas_cloud_selection — 1×1 rects from the
 * selection bitmap, then make_gas_cloud. No BFS, no rn1 ttl (stays
 * create_region -1 unless the caller overwrites). x-outer then y.
 */
export async function create_gas_cloud_selection(sel, damage) {
    const inside_cloud = is_hero_inside_gas_cloud();
    const r = selection_getbounds(sel);
    // C create_region: clear_heros_fault (REG_NOT_HEROS) before make_gas_cloud
    const cloud = {
        rects: [], ttl: -1, visible: false, inside_f: 0, arg: 0,
        player_flags: REG_NOT_HEROS,
    };
    for (let x = r.lx; x <= r.hx; x++) {
        for (let y = r.ly; y <= r.hy; y++) {
            if (selection_getpoint_sel(x, y, sel)) {
                cloud.rects.push({ lx: x, hx: x, ly: y, hy: y });
            }
        }
    }
    await make_gas_cloud(cloud, damage, inside_cloud);
    return cloud;
}

/** C youprop.h Poison_resistance — H || E || flag || uprops. */
function Poison_resistance() {
    const u = game.u || {};
    const p = u.uprops?.[POISON_RES];
    return !!((u.HPoison_resistance | 0) || (u.EPoison_resistance | 0)
        || u.Poison_resistance
        || (p?.intrinsic | 0) || (p?.extrinsic | 0));
}

/** C youprop.h Breathless — magical breathing || breathless(form). */
function Breathless() {
    const u = game.u || {};
    if ((u.HMagical_breathing | 0) || (u.EMagical_breathing | 0)
        || u.Magical_breathing) {
        return true;
    }
    const data = game.youmonst?.data;
    return data ? breathless(data) : false;
}

/**
 * C ref: region.c region_danger — prayer trouble: hero in damaging gas.
 * Completely harmless when nonliving/Breathless; Poison_resistance skips.
 * Membership still uses inside_region geometry (named; C uses
 * hero_inside()). run_regions inside_f is the bit (D-1169).
 */
export function region_danger() {
    const u = game.u || {};
    const data = game.youmonst?.data;
    let n = 0;
    for (const reg of game.regions || []) {
        if (!inside_region(reg, u.ux | 0, u.uy | 0)) continue;
        if (reg.inside_f !== INSIDE_GAS_CLOUD) continue;
        if ((data && nonliving(data)) || Breathless()) continue;
        if (Poison_resistance()) continue;
        ++n;
    }
    return n > 0;
}

/**
 * C ref: region.c region_safety — clear prayer gas-cloud trouble.
 * Envelope: multi/non-expiring → safe_teleds (+ Magical_breathing if
 * still in danger); single expiring → remove_region; already gone msg.
 * Membership still geometric (named; C uses hero_inside()).
 * Named omissions: BlindedTimeout==1 make_blinded polish.
 */
export async function region_safety() {
    const u = game.u || (game.u = {});
    let r = null;
    let n = 0;
    for (const reg of game.regions || []) {
        if (!inside_region(reg, u.ux | 0, u.uy | 0)) continue;
        if (reg.inside_f !== INSIDE_GAS_CLOUD) continue;
        if (!n++ && (reg.ttl | 0) >= 0) r = reg;
    }

    if (n > 1 || (n === 1 && !r)) {
        const { safe_teleds } = await import('./teleport.js');
        const { TELEDS_NO_FLAGS } = await import('./const.js');
        await safe_teleds(TELEDS_NO_FLAGS);
        if (region_danger()) {
            // C: set_itimeout(&HMagical_breathing, d(4,4)+4)
            const xt = d(4, 4) + 4;
            u.HMagical_breathing = ((u.HMagical_breathing | 0) & ~TIMEOUT)
                | (xt >= TIMEOUT ? TIMEOUT : xt);
            await You_feel('able to breathe.');
        }
    } else if (r) {
        remove_region(r);
        await pline('The gas cloud enveloping you dissipates.');
    } else {
        await pline('The gas cloud has dissipated.');
    }
    // BlindedTimeout==1 make_blinded deferred (do.js↔region cycle)
}
