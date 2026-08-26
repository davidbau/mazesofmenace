// dig.js — Monster tunneling / terrain dig / wand dig / pickaxe occupation.
// C ref: dig.c mdig_tunnel / zap_dig / draft_message / watch_dig /
//        dig_check / fillholetyp / digactualhole / liquid_flow /
//        bury_an_obj / bury_objs / unearth_objs / rot_organic /
//        dig_typ / pick_can_reach / is_digging / holetime / dig /
//        digcheck_fail_message / use_pick_axe / use_pick_axe2 / dighole /
//        furniture_handled / dig_up_grave; dbridge.c destroy_drawbridge;
//        zap.c fracture_rock / break_statue; trap.c fill_pit;
//        apply.c maybe_dunk_boulders; hack.c may_dig.
//        (D-0941 watch_dig; D-0950 break-wand dig; D-0951 pickaxe dig;
//        D-0954 furniture_handled + HOLE goto_level; D-0957 dig_up_grave;
//        D-0959 destroy_drawbridge; D-0960 mkcavearea earth;
//        D-0961 impact_drop / down_gate / drop_to;
//        D-0962 conjoined_pits / autodig quiet / boulder-fill;
//        D-0963 desecrate_altar / god_zaps_you;
//        D-0967 bury/unearth/obj_ice_effects wire;
//        D-1375 use_pick_axe2 u_wipe_engr(3) axe-scratch)

import { game } from './gstate.js';
import { rn1, rn2, rnd } from './rng.js';
import {
    newsym, pline, You_feel, tmp_at, nh_delay_output, verbalize,
    feel_newsym, flush_screen, flush_topl_more, pline_mon,
} from './display.js';
import { cansee, recalc_block_point, vision_recalc } from './vision.js';
import { cvt_sdoor_to_door } from './detect.js';
import {
    mksobj_at, objects_at, obj_extract_self, delobj, place_object, weight,
    set_corpsenm, add_to_buried, stackobj, is_organic, start_timer, stop_timer,
    obj_ice_effects,
} from './mkobj.js';
import {
    in_rooms, in_town, stop_occupation, is_pool, is_lava, is_moat,
    confdir, losehp, maybe_half_phys, nomul, switch_terrain,
} from './hack.js';
import { objectNames } from './generated/objects_data.js';
import { WEAPON_CLASS, TOOL_CLASS, GEM_CLASS, POTION_CLASS, COIN_CLASS } from './objects.js';
import { CLR_WHITE } from './terminal.js';
import {
    is_watch, is_flyer, is_floater, grounded, MZ_HUGE, passes_walls,
} from './monsters.js';
import {
    PM_DWARF, PM_ELF, PM_RANGER, PM_ARCHEOLOGIST, PM_SAMURAI, PM_WIZARD,
} from './generated/monsters_data.js';
import { m_canseeu } from './mondata.js';
import { an, An, the, simpleonames, xname } from './objnam.js';
import { hliquid, Monnam } from './do_name.js';
import { stairway_at } from './mklev.js';
import {
    t_at, maketrap, seetrap, feeltrap, set_utrap, reset_utrap, deltrap,
    delfloortrap, trapname, mintrap, b_trapped, conjoined_pits,
    activate_statue_trap,
} from './trap.js';
import { nhgetch } from './input.js';
import { set_occupation, can_reach_floor, del_engr_at, u_wipe_engr } from './engrave.js';
import { wield_tool, welded } from './wield.js';
import {
    Fumbling, adjalign, acurr, A_STR, A_WIS, exercise,
} from './attrib.js';
import { dbon } from './weapon.js';
import { depth } from './hacklib.js';
import { get_level } from './dungeon.js';
import { align_str } from './roles.js';
import { count_wsegs, worm_known } from './worm.js';
import {
    dogushforth, dryup, breaksink, SET_FOUNTAIN_WARNED,
} from './fountain.js';
import {
    find_drawbridge, is_drawbridge_wall, destroy_drawbridge,
} from './dbridge.js';
import { obj_resists } from './dogmove.js';
import { unpunish, punish } from './read.js';
import {
    IS_STWALL, IS_TREE, IS_WALL, IS_OBSTRUCTED, IS_DOOR, IS_FOUNTAIN,
    IS_THRONE, IS_ALTAR, IS_ROOM, IS_SINK, IS_FURNITURE, IS_GRAVE,
    Amask2align, AM_MASK, A_NONE, A_LAWFUL,
    W_NONDIGGABLE, SDOOR, SCORR, CORR, ROOM, DOOR, TREE, STONE,
    D_NODOOR, D_BROKEN, D_TRAPPED, D_CLOSED, D_LOCKED,
    SHOPBASE, SHOP_DOOR_COST, SHOP_PIT_COST, TT_PIT, TT_WEB, isok,
    Is_earthlevel, Is_airlevel, Is_waterlevel,
    Can_dig_down, Is_stronghold, Is_botlevel, DISP_BEAM, DISP_END,
    DIGCHECK_PASSED, DIGCHECK_PASSED_PITONLY, DIGCHECK_PASSED_DESTROY_TRAP,
    DIGCHECK_FAILED,
    DIGCHECK_FAIL_ONLADDER, DIGCHECK_FAIL_ONSTAIRS,
    DIGCHECK_FAIL_THRONE, DIGCHECK_FAIL_ALTAR, DIGCHECK_FAIL_AIRLEVEL,
    DIGCHECK_FAIL_WATERLEVEL, DIGCHECK_FAIL_TOOHARD,
    DIGCHECK_FAIL_UNDESTROYABLETRAP, DIGCHECK_FAIL_CANTDIG,
    DIGCHECK_FAIL_BOULDER, DIGCHECK_FAIL_OBJ_POOL_OR_TRAP,
    PIT, HOLE, MAGIC_PORTAL, VIBRATING_SQUARE, AM_SANCTUM,
    MOAT, POOL, LAVAPOOL, COLNO, ROWNO, is_pit, is_hole, u_at,
    DIGTYP_UNDIGGABLE, DIGTYP_ROCK, DIGTYP_STATUE, DIGTYP_BOULDER,
    DIGTYP_DOOR, DIGTYP_TREE,
    ECMD_OK, ECMD_TIME, ECMD_CANCEL,
    P_PICK_AXE, P_AXE, IRONBARS, LAVAWALL, IS_WATERWALL,
    WEB, LANDMINE, BEAR_TRAP, TRAPDOOR, KILLED_BY, NO_PART,
    TT_BURIEDBALL, TT_INFLOOR, DRAWBRIDGE_DOWN, MIGR_RANDOM,
    TAINT_AGE, MM_NOMSG, IN_SIGHT, COULD_SEE, RLOC_NOMSG,
    xytodir, DIR_180, DIR_ERR,
    ICE, DRAWBRIDGE_UP, DB_UNDER, DB_ICE,
    ROT_ORGANIC, TIMER_OBJECT, Has_contents, OBJ_FREE,
    CORPSTAT_HISTORIC, STATUE_TRAP,
} from './const.js';

const BOULDER = objectNames.indexOf('BOULDER');
const ROCK = objectNames.indexOf('ROCK');
const STATUE = objectNames.indexOf('STATUE');
const CORPSE = objectNames.indexOf('CORPSE');
const LEASH = objectNames.indexOf('LEASH');
const POT_OIL = objectNames.indexOf('POT_OIL');
const TREEFRUITS = [
    objectNames.indexOf('APPLE'),
    objectNames.indexOf('ORANGE'),
    objectNames.indexOf('PEAR'),
    objectNames.indexOf('BANANA'),
    objectNames.indexOf('EUCALYPTUS_LEAF'),
].filter((i) => i >= 0);

/** Lateral + vertical dir chars for use_pick_axe getdir filter. */
const DIG_DIR_CHARS = [
    { ch: 'h', dx: -1, dy: 0, dz: 0 },
    { ch: 'j', dx: 0, dy: 1, dz: 0 },
    { ch: 'k', dx: 0, dy: -1, dz: 0 },
    { ch: 'l', dx: 1, dy: 0, dz: 0 },
    { ch: 'y', dx: -1, dy: -1, dz: 0 },
    { ch: 'u', dx: 1, dy: -1, dz: 0 },
    { ch: 'b', dx: -1, dy: 1, dz: 0 },
    { ch: 'n', dx: 1, dy: 1, dz: 0 },
    { ch: '<', dx: 0, dy: 0, dz: -1 },
    { ch: '>', dx: 0, dy: 0, dz: 1 },
];

function dist2(x0, y0, x1, y1) {
    const dx = x0 - x1;
    const dy = y0 - y1;
    return dx * dx + dy * dy;
}

/**
 * C: `#define wall_info flags` — one field. JS sometimes writes W_* bits to
 * `flags` while WM_MASK orientation lives on `wall_info` (D-0865). OR both
 * for dig/passwall checks so nondiggable maze walls are honored.
 */
function rm_wall_info(lev) {
    return ((lev.wall_info | 0) | (lev.flags | 0));
}

/** C ref: hack.c may_dig — diggable unless STWALL/TREE + W_NONDIGGABLE. */
export function may_dig(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev) return false;
    const typ = lev.typ;
    return !((IS_STWALL(typ) || IS_TREE(typ))
        && (rm_wall_info(lev) & W_NONDIGGABLE));
}

function closed_door(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    return !!((loc.doormask || 0) & (D_CLOSED | D_LOCKED));
}

function sobj_at(otyp, x, y) {
    for (let o = objects_at(x, y); o; o = o.nexthere) {
        if (o.otyp === otyp) return o;
    }
    return null;
}

function canseemon(mtmp) {
    if (!mtmp) return false;
    if (mtmp.wormno) {
        if (!worm_known(mtmp)) return false;
        return !mtmp.minvis;
    }
    if (!mtmp.mx) return false;
    if (!cansee(mtmp.mx, mtmp.my)) return false;
    return !mtmp.minvis;
}

function Unaware() {
    return ((game.u?.multi | 0) < 0) && !!game.u?.usleep;
}

function Blind() {
    return !!(game.u?.Blind || game.u?.ublind);
}

/** Local m_at — avoid dig.js ↔ mon.js cycle (mon imports may_dig). */
function m_at(x, y) {
    for (const m of game.fmon || []) {
        if (m && (m.mx | 0) === (x | 0) && (m.my | 0) === (y | 0)
            && (m.mhp | 0) > 0) {
            return m;
        }
    }
    return null;
}

/** C: cmap_to_glyph(S_digbeam) — defsym '*' CLR_WHITE. */
function digbeam_glyph() {
    return { ch: '*', color: CLR_WHITE, dec: false };
}

/** C ref: dig.c draft_message — Hallucination branches deferred. */
async function draft_message(unexpected) {
    if (game.u?.Hallucination) return;
    if (unexpected) await You_feel('an unexpected draft.');
    else await You_feel('a draft.');
}

/**
 * C ref: dig.c is_digging — occupation == dig.
 */
export function is_digging() {
    return game.occupation === dig;
}

/** C: BY_OBJECT ((struct monst *) 0) — wand break / object dig. */
const BY_OBJECT = null;

/** C ref: trap.h undestroyable_trap — portal / vibrating square. */
function undestroyable_trap(ttyp) {
    return ttyp === MAGIC_PORTAL || ttyp === VIBRATING_SQUARE;
}

/** C ref: dbridge.c is_pool_or_lava — wrappers ride shared is_pool/is_lava. */
function is_pool_or_lava(x, y) {
    return is_pool(x, y) || is_lava(x, y);
}

/** C ref: dungeon.c surface — enough for dig messages. */
function surface(x, y) {
    const loc = game.level?.at(x, y);
    const typ = loc?.typ ?? 0;
    if (IS_FOUNTAIN(typ)) return 'fountain';
    if (IS_ALTAR(typ)) return 'altar';
    if (IS_WALL(typ) || IS_STWALL(typ)) return 'wall';
    if (IS_DOOR(typ)) return 'doorway';
    if (IS_ROOM(typ) && !Is_earthlevel(game.u?.uz)) return 'floor';
    return 'ground';
}

/** C: dungeon.c ledger_no — local copy (avoid dig↔do cycle). */
function ledger_no(lev) {
    const dnum = lev?.dnum | 0;
    const dlevel = lev?.dlevel | 0;
    const dun = game.dungeons?.[dnum];
    return ((dun?.ledger_start | 0) + dlevel) | 0;
}

/**
 * C ref: dig.c furniture_handled — dig destroys fountain/sink/drawbridge
 * instead of creating a pit/hole.
 * Envelope (D-0954/D-0959): fountain dogushforth+SET_WARNED+dryup;
 * breaksink; DRAWBRIDGE_DOWN / drawbridge wall → find+destroy.
 * Named omit: destroy crush/entity + iron-chain scatter (dbridge.js).
 * @returns {Promise<boolean>}
 */
async function furniture_handled(x, y, madeby_u) {
    const lev = game.level?.at(x, y);
    if (!lev) return false;
    if (IS_FOUNTAIN(lev.typ)) {
        await dogushforth(false);
        SET_FOUNTAIN_WARNED(x, y); // force dryup
        await dryup(x, y, madeby_u);
        return true;
    }
    if (IS_SINK(lev.typ)) {
        await breaksink(x, y);
        return true;
    }
    if (lev.typ === DRAWBRIDGE_DOWN || is_drawbridge_wall(x, y) >= 0) {
        const xy = { x: x | 0, y: y | 0 };
        find_drawbridge(xy);
        await destroy_drawbridge(xy.x, xy.y);
        return true;
    }
    return false;
}

/**
 * C ref: dig.c dig_check — may a digger create PIT/HOLE here?
 * @param {object|null} madeby BY_YOU / monster / BY_OBJECT(null)
 * @returns {number} DIGCHECK_*
 */
export function dig_check(madeby, x, y) {
    const ttmp = t_at(x, y);
    const lev = game.level?.at(x, y);
    if (!lev) return DIGCHECK_FAIL_TOOHARD;

    const stway = stairway_at(x, y);
    if (stway) {
        return stway.isladder
            ? DIGCHECK_FAIL_ONLADDER
            : DIGCHECK_FAIL_ONSTAIRS;
    }
    if (IS_THRONE(lev.typ) && madeby !== BY_OBJECT) {
        return DIGCHECK_FAIL_THRONE;
    }
    if (IS_ALTAR(lev.typ)
        && (madeby !== BY_OBJECT
            || ((lev.altarmask | 0) & AM_SANCTUM) !== 0)) {
        return DIGCHECK_FAIL_ALTAR;
    }
    if (Is_airlevel(game.u?.uz)) return DIGCHECK_FAIL_AIRLEVEL;
    if (Is_waterlevel(game.u?.uz)) return DIGCHECK_FAIL_WATERLEVEL;
    if (IS_OBSTRUCTED(lev.typ) && lev.typ !== SDOOR
        && (rm_wall_info(lev) & W_NONDIGGABLE) !== 0) {
        return DIGCHECK_FAIL_TOOHARD;
    }
    if (ttmp && undestroyable_trap(ttmp.ttyp)) {
        return DIGCHECK_FAIL_UNDESTROYABLETRAP;
    }
    if (!Can_dig_down(game.u?.uz) && !lev.candig) {
        if (ttmp) {
            if (!is_hole(ttmp.ttyp) && !is_pit(ttmp.ttyp)) {
                return DIGCHECK_PASSED_DESTROY_TRAP;
            }
            return DIGCHECK_FAIL_CANTDIG;
        }
        return DIGCHECK_PASSED_PITONLY;
    }
    if (sobj_at(BOULDER, x, y)) return DIGCHECK_FAIL_BOULDER;
    if (madeby === BY_OBJECT && (ttmp || is_pool_or_lava(x, y))) {
        return DIGCHECK_FAIL_OBJ_POOL_OR_TRAP;
    }
    return DIGCHECK_PASSED;
}

/**
 * C ref: dig.c fillholetyp — adjacent liquid to fill a new hole, else ROOM.
 */
export function fillholetyp(x, y, fill_if_any) {
    const lo_x = Math.max(1, x - 1);
    const hi_x = Math.min(x + 1, COLNO - 1);
    const lo_y = Math.max(0, y - 1);
    const hi_y = Math.min(y + 1, ROWNO - 1);
    let pool_cnt = 0;
    let moat_cnt = 0;
    let lava_cnt = 0;

    for (let x1 = lo_x; x1 <= hi_x; x1++) {
        for (let y1 = lo_y; y1 <= hi_y; y1++) {
            if (is_moat(x1, y1)) moat_cnt++;
            else if (is_pool(x1, y1)) pool_cnt++;
            else if (is_lava(x1, y1)) lava_cnt++;
        }
    }

    if (!fill_if_any) pool_cnt = (pool_cnt / 3) | 0;

    if ((lava_cnt > moat_cnt + pool_cnt && rn2(lava_cnt + 1))
        || (lava_cnt && fill_if_any)) {
        return LAVAPOOL;
    }
    if ((moat_cnt > 0 && rn2(moat_cnt + 1)) || (moat_cnt && fill_if_any)) {
        return MOAT;
    }
    if ((pool_cnt > 0 && rn2(pool_cnt + 1)) || (pool_cnt && fill_if_any)) {
        return POOL;
    }
    return ROOM;
}

/** C ref: dbridge.c / rm.h is_ice — ICE or drawbridge-under DB_ICE. */
function is_ice(x, y) {
    if (!isok(x, y)) return false;
    const lev = game.level?.at?.(x, y);
    if (!lev) return false;
    if ((lev.typ | 0) === ICE) return true;
    return (lev.typ | 0) === DRAWBRIDGE_UP
        && ((lev.drawbridgemask | 0) & DB_UNDER) === DB_ICE;
}

/**
 * C ref: dig.c bury_an_obj — floor obj → buriedobjlist (or merge rock/
 * boulder). Returns nexthere predecessor chain link for bury_objs loop.
 * Named omit: end_burn lamplit; shop stolen_value callers handle separately.
 */
export async function bury_an_obj(otmp, dealloced) {
    if (dealloced) dealloced.v = false;
    const u = game.u || {};
    if (otmp === u.uball) {
        unpunish();
        set_utrap(rn1(50, 20), TT_BURIEDBALL);
        await pline('The iron ball gets buried!');
    }
    const otmp2 = otmp.nexthere || null;
    if (otmp === u.uchain || obj_resists(otmp, 0, 0)) return otmp2;

    if (otmp.otyp === LEASH && (otmp.leashmon | 0) !== 0) {
        const { o_unleash } = await import('./apply.js');
        o_unleash(otmp);
    }
    // end_burn(lamplit && otyp != POT_OIL) deferred
    if (otmp.lamplit && otmp.otyp !== POT_OIL) {
        otmp.lamplit = 0;
    }

    obj_extract_self(otmp);

    const under_ice = is_ice(otmp.ox | 0, otmp.oy | 0);
    if ((otmp.otyp === ROCK && !under_ice) || otmp.otyp === BOULDER) {
        if (dealloced) dealloced.v = true;
        otmp.quan = 0;
        otmp.where = OBJ_FREE;
        otmp.timed = 0;
        return otmp2;
    }
    if (otmp.otyp === CORPSE) {
        // C: should cancel timer if under_ice — still a C TODO
    } else if ((under_ice
        ? (otmp.oclass === POTION_CLASS)
        : is_organic(otmp))
        && !obj_resists(otmp, 5, 95)) {
        start_timer(
            (under_ice ? 0 : 250) + rnd(250),
            TIMER_OBJECT,
            ROT_ORGANIC,
            otmp,
        );
    }
    add_to_buried(otmp);
    return otmp2;
}

/**
 * C ref: dig.c bury_objs — bury every floor object at <x,y>.
 * Shop stolen_value + bury merchandise owe (D-0983).
 */
export async function bury_objs(x, y) {
    const rooms = in_rooms(x, y, SHOPBASE) || '';
    const { shop_keeper, costly_spot, stolen_value } = await import('./shk.js');
    const { shkname } = await import('./shknam.js');
    const shkp = shop_keeper(rooms ? rooms.charCodeAt(0) : 0);
    const costly = !!(shkp && costly_spot(x, y));
    let loss = 0;
    const currency = (amt) => ((amt | 0) === 1 ? 'zorkmid' : 'zorkmids');

    for (let otmp = objects_at(x, y); otmp; ) {
        if (costly && !game.context?.mon_moving) {
            loss += await stolen_value(otmp, x, y, !!shkp.mpeaceful, true);
            if ((otmp.oclass | 0) !== COIN_CLASS) otmp.no_charge = 1;
        }
        otmp = await bury_an_obj(otmp, null);
    }
    del_engr_at(x, y);
    newsym(x, y);
    // maybe_unhide_at deferred
    if (costly && loss) {
        await pline(
            `You owe ${shkname(shkp)} ${loss} ${currency(loss)} for burying merchandise.`,
        );
    }
}

/**
 * C ref: dig.c unearth_objs — buriedobjlist at <x,y> → floor pile.
 * Named omit: buried_ball / buried_ball_to_punishment arm.
 */
export function unearth_objs(x, y) {
    let otmp = game.level?.buriedobjlist || null;
    while (otmp) {
        const otmp2 = otmp.nobj || null;
        if ((otmp.ox | 0) === (x | 0) && (otmp.oy | 0) === (y | 0)) {
            // buried_ball_to_punishment deferred
            obj_extract_self(otmp);
            if (otmp.timed) stop_timer(ROT_ORGANIC, otmp);
            place_object(otmp, x, y);
            stackobj(otmp);
        }
        otmp = otmp2;
    }
    del_engr_at(x, y);
    newsym(x, y);
}

const HEAVY_IRON_BALL = objectNames.indexOf('HEAVY_IRON_BALL');

/**
 * C ref: dig.c buried_ball — nearest buried HEAVY_IRON_BALL within dist2≤8.
 * Mutates cc.{x,y} to ball coords when found off-target.
 * @param {{x:number,y:number}} cc
 * @returns {object|null}
 */
function buried_ball(cc) {
    const u = game.u || {};
    let ball = null;
    let bdist = 0;
    if (!(u.utrap | 0) || (u.utraptype | 0) === TT_BURIEDBALL) {
        for (let otmp = game.level?.buriedobjlist || null; otmp; otmp = otmp.nobj) {
            if ((otmp.otyp | 0) !== HEAVY_IRON_BALL) continue;
            if ((otmp.ox | 0) === (cc.x | 0) && (otmp.oy | 0) === (cc.y | 0)) {
                return otmp;
            }
            const odist = dist2(otmp.ox | 0, otmp.oy | 0, cc.x | 0, cc.y | 0);
            if (odist <= 8 && (!ball || odist < bdist)) {
                ball = otmp;
                bdist = odist;
            }
        }
    }
    if (ball) {
        cc.x = ball.ox | 0;
        cc.y = ball.oy | 0;
    }
    return ball;
}

/**
 * C ref: dig.c buried_ball_to_punishment — unbury nearest ball and punish().
 * Named omit: RUST_METAL timer stop (C #if 0). Other callers (trapmove
 * wriggle, unearth_objs, digactualhole, level_tele, domagicportal)
 * still named.
 */
export async function buried_ball_to_punishment() {
    const u = game.u || {};
    const cc = { x: u.ux | 0, y: u.uy | 0 };
    const ball = buried_ball(cc);
    if (ball) {
        obj_extract_self(ball);
        // RUST_METAL stop_timer is C #if 0
        await punish(ball); /* reuse_ball flag for unearthed buried ball */
        reset_utrap(false);
        del_engr_at(cc.x, cc.y);
        newsym(cc.x, cc.y);
    }
}

/**
 * C ref: dig.c buried_ball_to_freedom — unbury ball, reset TT_BURIEDBALL.
 * Named omit: RUST_METAL timer stop (C #if 0).
 */
export function buried_ball_to_freedom() {
    const u = game.u || {};
    const cc = { x: u.ux | 0, y: u.uy | 0 };
    const ball = buried_ball(cc);
    if (ball) {
        obj_extract_self(ball);
        place_object(ball, cc.x, cc.y);
        stackobj(ball);
        reset_utrap(true);
        del_engr_at(cc.x, cc.y);
        newsym(cc.x, cc.y);
    }
}

/**
 * C ref: dig.c rot_organic — buried organic finished rotting; contents
 * re-buried then container freed.
 */
export async function rot_organic(obj) {
    if (!obj) return;
    while (Has_contents(obj)) {
        const child = obj.cobj;
        if (!child) break;
        child.ox = obj.ox | 0;
        child.oy = obj.oy | 0;
        await bury_an_obj(child, null);
    }
    obj_extract_self(obj);
    obj.quan = 0;
    obj.where = OBJ_FREE;
    obj.timed = 0;
}

/**
 * C ref: dig.c liquid_flow — after terrain set to pool/moat/lava.
 * Branch envelope (D-0967): delfloortrap; obj_ice_effects + unearth_objs;
 * fillmsg; hero pooleffects deferred; mon minliquid.
 * Named omit: fire_damage_chain / water_damage_chain on released objs.
 */
export async function liquid_flow(x, y, typ, ttmp, fillmsg) {
    if (!is_pool_or_lava(x, y)) return;
    if (ttmp) deltrap(ttmp);
    obj_ice_effects(x, y, true);
    unearth_objs(x, y);
    if (fillmsg) {
        const liq = hliquid(typ === LAVAPOOL ? 'lava' : 'water');
        await pline(String(fillmsg).replace('%s', liq));
    }
    // fire_damage_chain / water_damage_chain deferred
    if (u_at(x, y)) {
        // pooleffects deferred
    } else {
        const mon = m_at(x, y);
        if (mon) {
            const { minliquid } = await import('./mon.js');
            await minliquid(mon);
        }
    }
}

/**
 * C ref: dig.c digactualhole — create PIT or HOLE trap + side effects.
 * Branch envelope (D-0950/D-0954/D-0958/D-0961/D-0963): furniture_handled;
 * maketrap; furniture fall msg; desecrate_altar on hero/obj altar dig;
 * shop add_damage / pay ruin; PIT at_u set_utrap + wake_nearby; HOLE hero
 * fall goto_level + shopdig(1) pack snatch; mon teleport_pet migrate;
 * impact_drop floor objs through hole.
 * PIT after wake_nearby and HOLE at_u await switch_terrain then
 * re-read Lev/Fly (D-1269; C dig.c:733 / :757). maketrap PIT/HOLE
 * set_levltyp STONE/SCORR→CORR / wall|SDOOR (D-1280);
 * DRAWBRIDGE_UP ice→floor (D-1296). Named omit:
 * buried_ball_to_punishment; make_angry_shk; ship_object;
 * shop add_damage; liquid_flow.
 */
export async function digactualhole(x, y, madeby, ttyp) {
    const lev = game.level?.at(x, y);
    if (!lev) return;
    const u = game.u || {};
    const madeby_u = madeby === game.youmonst;
    const madeby_obj = madeby === BY_OBJECT;
    const heros_fault = madeby_u || madeby_obj;
    const atHero = u_at(x, y);
    /* C: wont_fall = Levitation || Flying (youprop.h macros). */
    let wont_fall = !!(Levitation() || Flying());
    const mtmp0 = m_at(x, y);

    if (atHero && u.utrap) {
        if ((u.utraptype | 0) === TT_BURIEDBALL) {
            // buried_ball_to_punishment deferred
        } else if ((u.utraptype | 0) === TT_INFLOOR) {
            reset_utrap(false);
        }
    }

    if (await furniture_handled(x, y, madeby_u)) return;

    if (ttyp !== PIT && !Can_dig_down(u.uz) && !lev.candig) {
        ttyp = PIT;
    }

    const old_typ = lev.typ;
    let furniture = '';
    let surface_type;
    let old_aligntyp = A_NONE;
    if (IS_FURNITURE(lev.typ)) {
        surface_type = (IS_ROOM(lev.typ) && !Is_earthlevel(u.uz))
            ? 'floor' : 'ground';
        if (IS_ALTAR(lev.typ)) {
            old_aligntyp = Amask2align((lev.altarmask | 0) & AM_MASK);
            furniture = `${align_str(old_aligntyp)} `;
        }
        furniture += surface(x, y);
    } else {
        surface_type = surface(x, y);
    }
    const shopdoor = IS_DOOR(lev.typ) && !!in_rooms(x, y, SHOPBASE);
    const oldobjs = objects_at(x, y);

    const ttmp = maketrap(x, y, ttyp);
    if (!ttmp) return;
    const newobjs = objects_at(x, y);
    ttmp.madeby_u = heros_fault;
    ttmp.tseen = 0;
    if (cansee(x, y)) seetrap(ttmp);
    else if (madeby_u) feeltrap(ttmp);

    const tname = trapname(ttyp, true);
    const in_thru = ttyp === HOLE ? 'through' : 'in';
    if (madeby_u) {
        if (x !== (u.ux | 0) || y !== (u.uy | 0)) {
            await pline(`You dig an adjacent ${tname}.`);
        } else {
            await pline(`You dig ${an(tname)} ${in_thru} the ${surface_type}.`);
        }
    } else if (!madeby_obj && madeby && canseemon(madeby)) {
        await pline(
            `${Monnam(madeby)} digs ${an(tname)} ${in_thru} the ${surface_type}.`,
        );
    } else if (cansee(x, y) && game.flags?.verbose !== false) {
        if (IS_STWALL(old_typ)) {
            await pline(
                `The ${surface_type} crumbles into ${an(tname)}.`,
            );
        } else {
            await pline(`${An(tname)} appears in the ${surface_type}.`);
        }
    }
    if (IS_FURNITURE(old_typ) && cansee(x, y)) {
        await pline(`The ${furniture} falls into the ${tname}!`);
    }
    // C: wrath should immediately follow altar destruction message
    if (heros_fault && IS_ALTAR(old_typ)) {
        const { desecrate_altar } = await import('./pray.js');
        await desecrate_altar(false, old_aligntyp);
    }

    if (ttyp === PIT) {
        if (shopdoor && heros_fault) {
            const { pay_for_damage } = await import('./shk.js');
            await pay_for_damage('ruin', false);
        } else {
            const { add_damage } = await import('./shk.js');
            add_damage(x, y, heros_fault ? SHOP_PIT_COST : 0);
        }
        if (madeby_u) wake_nearby(false);
        /* C dig.c:731–735 — digging down while encased in solid rock
         * which is blocking levitation or flight. Unconditional on PIT
         * (hero cell, not the hole coords). */
        await switch_terrain();
        if (Levitation() || Flying()) wont_fall = true;

        if (atHero) {
            if (!wont_fall) {
                set_utrap(rn1(4, 2), TT_PIT);
                if (game.vision) game.vision.full_recalc = 1;
            } else {
                reset_utrap(true);
            }
            if (oldobjs !== newobjs) {
                const { pickup } = await import('./pickup.js');
                await pickup(1);
            }
        } else {
            const mtmp = mtmp0 || m_at(x, y);
            if (mtmp) {
                if (is_flyer(mtmp.data) || is_floater(mtmp.data)) {
                    if (canseemon(mtmp)) {
                        await pline(
                            `${Monnam(mtmp)} ${
                                is_flyer(mtmp.data) ? 'flies' : 'floats'
                            } over the pit.`,
                        );
                    }
                } else if (mtmp !== madeby) {
                    await mintrap(mtmp, 0);
                }
            }
        }
    } else {
        // HOLE
        if (atHero) {
            /* C dig.c:754–759 — same encased-rock unblock; HOLE only at_u. */
            await switch_terrain();
            if (Levitation() || Flying()) wont_fall = true;
            // next_to_u leash gate — pet may jerk hero back (D-1005)
            if (!u.ustuck && !wont_fall) {
                const { next_to_u } = await import('./apply.js');
                if (!(await next_to_u())) {
                    await pline('You are jerked back by your pet!');
                    wont_fall = true;
                }
            }

            if (u.ustuck || wont_fall) {
                if (newobjs) {
                    const { impact_drop } = await import('./dokick.js');
                    await impact_drop(null, x, y, 0);
                }
                if (oldobjs !== newobjs) {
                    const { pickup } = await import('./pickup.js');
                    await pickup(1);
                }
                if (shopdoor && heros_fault) {
                    const { pay_for_damage } = await import('./shk.js');
                    await pay_for_damage('ruin', false);
                }
            } else {
                if (u.ushops && heros_fault) {
                    const { shopdig } = await import('./shk.js');
                    await shopdig(1); // shk might snatch pack
                } else {
                    const { pay_for_damage } = await import('./shk.js');
                    await pay_for_damage('dig into', true);
                }
                await pline('You fall through...');
                const newlevel = {
                    dnum: u.uz?.dnum | 0,
                    dlevel: (u.uz?.dlevel | 0) + 1,
                };
                const { goto_level } = await import('./do.js');
                await goto_level(newlevel, false, true, false);
                const { spoteffects } = await import('./pickup.js');
                await spoteffects(false);
            }
        } else {
            if (shopdoor && heros_fault) {
                const { pay_for_damage } = await import('./shk.js');
                await pay_for_damage('ruin', false);
            }
            if (newobjs) {
                const { impact_drop } = await import('./dokick.js');
                await impact_drop(null, x, y, 0);
            }
            const mtmp = mtmp0 || m_at(x, y);
            if (mtmp) {
                if (!grounded(mtmp.data)
                    || (mtmp.wormno && count_wsegs(mtmp) > 5)
                    || (mtmp.data?.msize | 0) >= MZ_HUGE) {
                    newsym(x, y);
                    return;
                }
                if (mtmp === u.ustuck) {
                    newsym(x, y);
                    return;
                }
                const { teleport_pet, migrate_to_level } = await import(
                    './teleport.js',
                );
                if (await teleport_pet(mtmp, false)) {
                    const tolevel = { dnum: 0, dlevel: 1 };
                    if (Is_stronghold(u.uz)) {
                        const v = game.valley_level;
                        if (v) {
                            tolevel.dnum = v.dnum | 0;
                            tolevel.dlevel = v.dlevel | 0;
                        } else {
                            newsym(x, y);
                            return;
                        }
                    } else if (Is_botlevel(u.uz)) {
                        if (canseemon(mtmp)) {
                            await pline(`${Monnam(mtmp)} avoids the trap.`);
                        }
                        newsym(x, y);
                        return;
                    } else {
                        get_level(tolevel, depth(u.uz) + 1);
                    }
                    // make_angry_shk deferred when mtmp.isshk
                    migrate_to_level(
                        mtmp, ledger_no(tolevel), MIGR_RANDOM, null,
                    );
                }
            }
        }
    }
    newsym(x, y);
}

/**
 * C ref: trap.c fill_pit — boulder settles into pit/hole.
 * flooreffects body thin: extract + deltrap + delobj boulder.
 */
export function fill_pit(x, y) {
    const t = t_at(x, y);
    if (!t || !(is_pit(t.ttyp) || is_hole(t.ttyp))) return;
    const otmp = sobj_at(BOULDER, x, y);
    if (!otmp) return;
    obj_extract_self(otmp);
    deltrap(t);
    delobj(otmp);
    newsym(x, y);
}

/**
 * C ref: apply.c maybe_dunk_boulders — dunk boulders into pool/lava.
 * boulder_hits_pool deferred → extract+delobj while liquid present.
 */
export function maybe_dunk_boulders(x, y) {
    while (is_pool_or_lava(x, y)) {
        const otmp = sobj_at(BOULDER, x, y);
        if (!otmp) break;
        obj_extract_self(otmp);
        delobj(otmp);
    }
}

/**
 * C ref: dig.c watchman_canseeu — peaceful watch who can see the hero.
 */
function watchman_canseeu(mtmp) {
    return !!(is_watch(mtmp?.data) && mtmp.mcansee && m_canseeu(mtmp)
        && mtmp.mpeaceful);
}

/**
 * C ref: mon.c get_iter_mons — first living on-map mon where bfunc is true.
 */
function get_iter_mons(bfunc) {
    for (const mtmp of game.fmon || []) {
        if (!mtmp || (mtmp.mhp | 0) <= 0) continue;
        if ((mtmp.mx | 0) <= 0) continue;
        if (bfunc(mtmp)) return mtmp;
    }
    return null;
}

/**
 * C ref: dig.c watch_dig — town watch warns / arrests on wall/door damage.
 * Branch envelope: in_town + closed_door/SDOOR/WALL/FOUNTAIN/TREE;
 * find peaceful watching watchman; warn once then angry_guards on zap
 * or second offense; stop_occupation when digging.
 * Named omit: SetVoice.
 */
export async function watch_dig(mtmp, x, y, zap) {
    const lev = game.level?.at(x, y);
    if (!lev) return;
    if (!in_town(x, y)) return;
    if (!(closed_door(x, y) || lev.typ === SDOOR || IS_WALL(lev.typ)
        || IS_FOUNTAIN(lev.typ) || IS_TREE(lev.typ))) {
        return;
    }
    let watch = mtmp;
    if (!watch) watch = get_iter_mons(watchman_canseeu);
    if (!watch) return;

    if (!game.context) game.context = {};
    if (!game.context.digging) game.context.digging = {};
    const digging = game.context.digging;

    if (zap || digging.warned) {
        await verbalize("Halt, vandal!  You're under arrest!");
        // Lazy: mon.js imports dig.js statically.
        const { angry_guards } = await import('./mon.js');
        const Deaf = !!((game.u?.HDeaf | 0) || (game.u?.EDeaf | 0)
            || game.u?.uroleplay?.deaf || game.u?.Deaf);
        await angry_guards(!!Deaf);
    } else {
        let str;
        if (IS_DOOR(lev.typ)) str = 'door';
        else if (IS_TREE(lev.typ)) str = 'tree';
        else if (IS_OBSTRUCTED(lev.typ)) str = 'wall';
        else str = 'fountain';
        await verbalize(`Hey, stop damaging that ${str}!`);
        digging.warned = true;
    }
    if (is_digging()) await stop_occupation();
}

/**
 * C ref: mkobj.c rnd_treefruit_at — ROLL_FROM(treefruits) mksobj_at.
 */
function rnd_treefruit_at(x, y) {
    if (!TREEFRUITS.length) return null;
    return mksobj_at(TREEFRUITS[rn2(TREEFRUITS.length)], x, y, true, false);
}

/**
 * C ref: monmove.c mb_trapped subset — door trap after digger eats door.
 * wake_nearto / mon_learns_traps / full mondead deferred.
 */
async function mb_trapped(mtmp, canseeit) {
    if (game.flags?.verbose !== false) {
        if (canseeit && !Unaware()) {
            await pline_mon(mtmp, 'KABOOM!!  You see a door explode.');
        } else if (!game.u?.Deaf) {
            const far = dist2(mtmp.mx, mtmp.my, game.u.ux, game.u.uy) > 7 * 7;
            await pline(`You hear a ${far ? 'distant' : 'nearby'} explosion.`);
        }
    }
    mtmp.mstun = 1;
    mtmp.mhp -= rnd(15);
    if ((mtmp.mhp | 0) < 1) {
        mtmp.mhp = 0;
        mtmp.mx = 0;
        mtmp.my = 0;
        return true;
    }
    return false;
}

/**
 * C ref: dig.c mdig_tunnel — return true if monster died.
 * Branch envelope: SDOOR convert; closed-door eat (+trap); SCORR open;
 * open-floor early return (still burns pile=rnd(12)); WALL/TREE/STONE dig;
 * maze→ROOM / cavernous→CORR / else DOOR; pile&lt;5 boulder/rock or fruit.
 * Named omissions: Hallucination draft; Soundeffect; full mondead on
 * trap death; pay_for_damage.
 */
export async function mdig_tunnel(mtmp) {
    const pile = rnd(12);
    const here = game.level?.at(mtmp.mx, mtmp.my);
    if (!here) return false;

    if (here.typ === SDOOR) cvt_sdoor_to_door(here);

    if (closed_door(mtmp.mx, mtmp.my)) {
        if (in_rooms(mtmp.mx, mtmp.my, SHOPBASE)) {
            const { add_damage } = await import('./shk.js');
            add_damage(mtmp.mx, mtmp.my, 0);
        }
        const sawit = canseemon(mtmp);
        const trapped = !!((here.doormask || 0) & D_TRAPPED);
        here.doormask = trapped ? D_NODOOR : D_BROKEN;
        if (here.flags !== undefined) here.flags = here.doormask;
        recalc_block_point(mtmp.mx, mtmp.my);
        newsym(mtmp.mx, mtmp.my);
        if (trapped) {
            const seeit = canseemon(mtmp);
            if (await mb_trapped(mtmp, sawit || seeit)) {
                if (mtmp.mx) newsym(mtmp.mx, mtmp.my);
                return true;
            }
        } else if (game.flags?.verbose !== false) {
            if (!Unaware() && !rn2(3)) await draft_message(true);
        }
        return false;
    }

    if (here.typ === SCORR) {
        here.typ = CORR;
        here.flags = 0;
        recalc_block_point(mtmp.mx, mtmp.my);
        newsym(mtmp.mx, mtmp.my);
        await draft_message(false);
        return false;
    }

    if (!IS_OBSTRUCTED(here.typ) && !IS_TREE(here.typ)) {
        return false;
    }

    if ((rm_wall_info(here) & W_NONDIGGABLE) !== 0) {
        return false;
    }

    const lf = game.level?.flags || {};
    if (IS_WALL(here.typ)) {
        if (game.flags?.verbose !== false && !rn2(5)) {
            if (!game.u?.Deaf) await pline('You hear crashing rock.');
        }
        if (in_rooms(mtmp.mx, mtmp.my, SHOPBASE)) {
            const { add_damage } = await import('./shk.js');
            add_damage(mtmp.mx, mtmp.my, 0);
        }
        if (lf.is_maze_lev) {
            here.typ = ROOM;
            here.flags = 0;
        } else if (lf.is_cavernous_lev && !in_town(mtmp.mx, mtmp.my)) {
            here.typ = CORR;
            here.flags = 0;
        } else {
            here.typ = DOOR;
            here.doormask = D_NODOOR;
            if (here.flags !== undefined) here.flags = D_NODOOR;
        }
    } else if (IS_TREE(here.typ) || here.typ === TREE) {
        here.typ = ROOM;
        here.flags = 0;
        if (pile && pile < 5) rnd_treefruit_at(mtmp.mx, mtmp.my);
    } else {
        // stone / other obstructed
        here.typ = CORR;
        here.flags = 0;
        if (pile && pile < 5) {
            mksobj_at(
                (pile === 1) ? BOULDER : ROCK,
                mtmp.mx, mtmp.my, true, false,
            );
        }
    }
    newsym(mtmp.mx, mtmp.my);
    if (!sobj_at(BOULDER, mtmp.mx, mtmp.my)) {
        recalc_block_point(mtmp.mx, mtmp.my);
    }
    return false;
}

/**
 * C ref: dig.c zap_dig — wand/spell dig beam across the level.
 * Branch envelope: horizontal digdepth=rn1(18,8) + door/SDOOR + maze_dig
 * wall/tree/stone + ordinary IS_OBSTRUCTED dig; DISP_BEAM trail.
 * watch_dig + shop add_damage wired (D-0941); pay_for_damage (D-0942).
 * Named omissions: swallowed pierce; u.dz falling-rock / dighole;
 * pitdig conjoined / adj_pit_checks / pit_flow.
 */
export async function zap_dig() {
    const u = game.u;
    if (!u) return;

    if (u.uswallow) {
        // pierce / expels deferred
        return;
    }

    if (u.dz) {
        // ceiling rock / dighole deferred
        return;
    }

    let shopdoor = false;
    let shopwall = false;
    const maze_dig = !!(game.level?.flags?.is_maze_lev) && !Is_earthlevel(u.uz);
    let zx = (u.ux | 0) + (u.dx | 0);
    let zy = (u.uy | 0) + (u.dy | 0);
    const pitdig = !!(u.utrap && u.utraptype === TT_PIT);
    // trap_with_u / xytodir used only by deferred pitdig body

    let digdepth = rn1(18, 8);
    tmp_at(DISP_BEAM, digbeam_glyph());
    try {
        while (--digdepth >= 0) {
            if (!isok(zx, zy)) break;
            const room = game.level?.at(zx, zy);
            if (!room) break;
            tmp_at(zx, zy);
            await nh_delay_output();

            if (pitdig) {
                // conjoined pits / dighole deferred — one adjacent only
                break;
            } else if (closed_door(zx, zy) || room.typ === SDOOR) {
                if (in_rooms(zx, zy, SHOPBASE)) {
                    const { add_damage } = await import('./shk.js');
                    add_damage(zx, zy, SHOP_DOOR_COST);
                    shopdoor = true;
                }
                if (room.typ === SDOOR) {
                    room.typ = DOOR;
                } else if (cansee(zx, zy)) {
                    await pline('The door is razed!');
                }
                await watch_dig(null, zx, zy, true);
                room.doormask = D_NODOOR;
                if (room.flags !== undefined) room.flags = D_NODOOR;
                recalc_block_point(zx, zy);
                digdepth -= 2;
                if (maze_dig) break;
            } else if (maze_dig) {
                if (IS_WALL(room.typ)) {
                    if (!(rm_wall_info(room) & W_NONDIGGABLE)) {
                        if (in_rooms(zx, zy, SHOPBASE)) {
                            shopwall = true;
                        }
                        await watch_dig(null, zx, zy, true);
                        room.typ = ROOM;
                        room.flags = 0;
                        recalc_block_point(zx, zy);
                    } else if (!Blind()) {
                        await pline('The wall glows then fades.');
                    }
                    break;
                } else if (IS_TREE(room.typ)) {
                    if (!(rm_wall_info(room) & W_NONDIGGABLE)) {
                        room.typ = ROOM;
                        room.flags = 0;
                        recalc_block_point(zx, zy);
                    } else if (!Blind()) {
                        await pline('The tree shudders but is unharmed.');
                    }
                    break;
                } else if (room.typ === STONE || room.typ === SCORR) {
                    if (!(rm_wall_info(room) & W_NONDIGGABLE)) {
                        room.typ = CORR;
                        room.flags = 0;
                        recalc_block_point(zx, zy);
                    } else if (!Blind()) {
                        await pline('The rock glows then fades.');
                    }
                    break;
                }
            } else if (IS_OBSTRUCTED(room.typ)) {
                if (!may_dig(zx, zy)) break;
                if (IS_WALL(room.typ) || room.typ === SDOOR) {
                    if (in_rooms(zx, zy, SHOPBASE)) {
                        shopwall = true;
                    }
                    await watch_dig(null, zx, zy, true);
                    if (game.level?.flags?.is_cavernous_lev
                        && !in_town(zx, zy)) {
                        room.typ = CORR;
                        room.flags = 0;
                    } else {
                        room.typ = DOOR;
                        room.doormask = D_NODOOR;
                        if (room.flags !== undefined) room.flags = D_NODOOR;
                    }
                    digdepth -= 2;
                } else if (IS_TREE(room.typ)) {
                    room.typ = ROOM;
                    room.flags = 0;
                    digdepth -= 2;
                } else {
                    room.typ = CORR;
                    room.flags = 0;
                    digdepth--;
                }
                recalc_block_point(zx, zy);
            }
            zx += u.dx | 0;
            zy += u.dy | 0;
        }
    } finally {
        tmp_at(DISP_END, 0);
    }

    // pit_flow deferred
    if (shopdoor || shopwall) {
        const { pay_for_damage } = await import('./shk.js');
        await pay_for_damage(shopdoor ? 'destroy' : 'dig into', false);
    }
}

/** C ref: obj.h is_pick — WEAPON/TOOL with P_PICK_AXE skill. */
function is_pick(obj) {
    if (!obj) return false;
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== TOOL_CLASS) return false;
    return (game.objects?.[obj.otyp]?.oc_skill ?? 0) === P_PICK_AXE;
}

/** C ref: obj.h is_axe — WEAPON/TOOL with P_AXE skill. */
function is_axe(obj) {
    if (!obj) return false;
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== TOOL_CLASS) return false;
    return (game.objects?.[obj.otyp]?.oc_skill ?? 0) === P_AXE;
}

/** C ref: obj.h bimanual — WEAPON/TOOL with oc_bimanual (oc_big). */
function bimanual(obj) {
    if (!obj) return false;
    return !!(game.objects?.[obj.otyp]?.oc_bimanual
        || game.objects?.[obj.otyp]?.oc_big);
}

/** C ref: obj.h greatest_erosion — max(oeroded, oeroded2). */
function greatest_erosion(obj) {
    if (!obj) return 0;
    return Math.max(obj.oeroded | 0, obj.oeroded2 | 0);
}

/** C ref: weapon.c abon — strength band used in dig effort. */
function abon() {
    const str = acurr(A_STR);
    const STR18_50 = 18 + 50;
    let sbon;
    if (str < 6) sbon = -2;
    else if (str < 8) sbon = -1;
    else if (str < 17) sbon = 0;
    else if (str <= 18) sbon = 1;
    else if (str < STR18_50) sbon = 1;
    else sbon = 2;
    if ((game.u?.ulevel | 0) < 3) sbon += 1;
    return sbon;
}

function Race_if(pm) {
    return (game.urace?.mnum | 0) === (pm | 0);
}

function Role_if(pm) {
    return (game.urole?.mnum | 0) === (pm | 0);
}

function Hallucination() {
    const u = game.u || {};
    return !!(u.Hallucination
        || ((u.HHallucination | 0) || (u.EHallucination | 0)));
}

/** C hacklib.c sgn */
function sgn(n) {
    return n > 0 ? 1 : n < 0 ? -1 : 0;
}

/**
 * C ref: mkobj.c mk_tt_object — CORPSE/STATUE with role pm (topten deferred).
 * Used by dig_up_grave; empty RECORD path burns rnd(10) then rn1 role.
 */
function mk_tt_object(objtype, x, y) {
    const initialize_it = objtype !== STATUE;
    const otmp = mksobj_at(objtype, x, y, initialize_it, false);
    if (!otmp) return null;
    rnd(10); // C get_rnd_toptenentry after successful open
    set_corpsenm(otmp, rn1(PM_WIZARD - PM_ARCHEOLOGIST + 1, PM_ARCHEOLOGIST));
    return otmp;
}

function Flying() {
    const u = game.u || {};
    if (u.Flying) return true;
    return !!(((u.HFlying | 0) || (u.EFlying | 0)) && !(u.BFlying | 0));
}

function Levitation() {
    const u = game.u || {};
    if (u.Levitation) return true;
    return !!(((u.HLevitation | 0) || (u.ELevitation | 0))
        && !(u.BLevitation | 0));
}

function on_level(a, b) {
    return !!a && !!b
        && (a.dnum | 0) === (b.dnum | 0)
        && (a.dlevel | 0) === (b.dlevel | 0);
}

function assign_level(dest, src) {
    if (!dest || !src) return;
    dest.dnum = src.dnum | 0;
    dest.dlevel = src.dlevel | 0;
}

function next2u(x, y) {
    const u = game.u || {};
    const dx = (x | 0) - (u.ux | 0);
    const dy = (y | 0) - (u.uy | 0);
    return (dx * dx + dy * dy) <= 2;
}

function ensure_digging() {
    if (!game.context) game.context = {};
    if (!game.context.digging) {
        game.context.digging = {
            pos: { x: 0, y: 0 },
            level: { dnum: 0, dlevel: -1 },
            effort: 0,
            down: false,
            chew: false,
            warned: false,
            quiet: false,
            lastdigtime: 0,
        };
    }
    const d = game.context.digging;
    if (!d.pos) d.pos = { x: 0, y: 0 };
    if (!d.level) d.level = { dnum: 0, dlevel: -1 };
    return d;
}

/** C mon.c wake_nearby stub — clear nearby sleep (subset). */
function wake_nearby(_petcall) {
    const u = game.u || {};
    for (const m of game.fmon || []) {
        if (!m || (m.mhp | 0) <= 0) continue;
        const dx = (m.mx | 0) - (u.ux | 0);
        const dy = (m.my | 0) - (u.uy | 0);
        if (dx * dx + dy * dy > 100) continue;
        if (m.msleeping) m.msleeping = 0;
        if (m.mstrategy) m.mstrategy &= ~0x01; /* WAIT deferred polish */
    }
}

/**
 * C ref: dig.c rm_waslit — ROOM waslit at hero or nearby waslit.
 */
function rm_waslit() {
    const u = game.u || {};
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    const here = game.level?.at(ux, uy);
    if (here && here.typ === ROOM && here.waslit) return true;
    for (let x = ux - 2; x < ux + 3; x++) {
        for (let y = uy - 1; y < uy + 2; y++) {
            if (isok(x, y) && game.level?.at(x, y)?.waslit) return true;
        }
    }
    return false;
}

/**
 * C ref: dig.c mkcavepos — one cell of earth-level cave collapse/extend.
 * Named omit: Soundeffect (no RNG).
 */
async function mkcavepos(x, y, dist, waslit, rockit) {
    if (!isok(x, y)) return;
    const lev = game.level?.at(x, y);
    if (!lev) return;

    if (rockit) {
        if (IS_OBSTRUCTED(lev.typ)) return;
        if (t_at(x, y)) return; /* don't cover the portal */
        const mtmp = m_at(x, y);
        if (mtmp && !passes_walls(mtmp.data)) {
            const { rloc } = await import('./teleport.js');
            await rloc(mtmp, RLOC_NOMSG);
        }
    } else if (lev.typ === ROOM) {
        return;
    }

    recalc_block_point(x, y); /* C unblock_point — JS rebuilds block map */

    lev.seenv = 0;
    lev.doormask = 0;
    if (lev.flags !== undefined) lev.flags = 0;
    if (dist < 3) lev.lit = rockit ? false : true;
    if (waslit) lev.waslit = rockit ? false : true;
    lev.horizontal = false;
    /* short-circuit vision recalc */
    if (game.viz_array?.[y]) {
        game.viz_array[y][x] = (dist < 3) ? (IN_SIGHT | COULD_SEE) : COULD_SEE;
    }
    lev.typ = rockit ? STONE : ROOM;
    if (dist >= 3) {
        /* C impossible — keep soft for held-out */
    }
    feel_newsym(x, y);
}

/**
 * C ref: dig.c mkcavearea — widen cave (ROOM) or collapse ceiling (STONE)
 * around hero on earth level.
 */
async function mkcavearea(rockit) {
    const u = game.u || {};
    let xmin = u.ux | 0;
    let xmax = u.ux | 0;
    let ymin = u.uy | 0;
    let ymax = u.uy | 0;
    const waslit = rm_waslit();

    if (rockit) {
        await pline('Crash!  The ceiling collapses around you!');
    } else {
        const here = game.level?.at(u.ux | 0, u.uy | 0);
        await pline(
            `A mysterious force ${
                here?.typ === CORR ? 'creates a' : 'extends the'
            } cave around you!`,
        );
    }
    await flush_topl_more(); /* display_nhwindow(WIN_MESSAGE, TRUE) */

    for (let dist = 1; dist <= 2; dist++) {
        xmin--;
        xmax++;
        if (dist < 2) {
            ymin--;
            ymax++;
            for (let i = xmin + 1; i < xmax; i++) {
                await mkcavepos(i, ymin, dist, waslit, rockit);
                await mkcavepos(i, ymax, dist, waslit, rockit);
            }
        }
        for (let i = ymin; i <= ymax; i++) {
            await mkcavepos(xmin, i, dist, waslit, rockit);
            await mkcavepos(xmax, i, dist, waslit, rockit);
        }
        flush_screen(1);
        await nh_delay_output();
    }

    const ulev = game.level?.at(u.ux | 0, u.uy | 0);
    if (!rockit && ulev && ulev.typ === CORR) {
        ulev.typ = ROOM;
        if (waslit) ulev.waslit = true;
        newsym(u.ux | 0, u.uy | 0);
    }
    if (game.vision) game.vision.full_recalc = 1;
    else game.vision_full_recalc = 1;
}

/**
 * C ref: dig.c pick_can_reach — pit/bimanual/Flying reach for statue/boulder.
 * Branch envelope (D-0962): conjoined_pits when both hero and target in pits.
 */
function pick_can_reach(pick, x, y) {
    const t = t_at(x, y);
    const target_in_pit = !!(t && is_pit(t.ttyp) && t.tseen);
    const u = game.u || {};
    if (u.utrap && u.utraptype === TT_PIT) {
        if (target_in_pit) {
            return conjoined_pits(t, t_at(u.ux | 0, u.uy | 0), false);
        }
        return bimanual(pick);
    }
    if (bimanual(pick) || Flying()) return true;
    if (!target_in_pit) return true;
    return false;
}

/**
 * C ref: dig.c dig_typ — classify dig target at (x,y) for pick/axe.
 */
export function dig_typ(otmp, x, y) {
    if (!isok(x, y) || !otmp || (!is_pick(otmp) && !is_axe(otmp))) {
        return DIGTYP_UNDIGGABLE;
    }
    const ltyp = game.level?.at(x, y)?.typ ?? 0;
    if (is_axe(otmp)) {
        if (closed_door(x, y)) return DIGTYP_DOOR;
        if (IS_TREE(ltyp)) return DIGTYP_TREE;
        return DIGTYP_UNDIGGABLE;
    }
    if (sobj_at(STATUE, x, y) && pick_can_reach(otmp, x, y)) {
        return DIGTYP_STATUE;
    }
    if (sobj_at(BOULDER, x, y) && pick_can_reach(otmp, x, y)) {
        return DIGTYP_BOULDER;
    }
    if (closed_door(x, y)) return DIGTYP_DOOR;
    if (IS_TREE(ltyp)) return DIGTYP_UNDIGGABLE;
    if (IS_OBSTRUCTED(ltyp)
        && (!game.level?.flags?.arboreal || IS_WALL(ltyp))) {
        return DIGTYP_ROCK;
    }
    return DIGTYP_UNDIGGABLE;
}

/**
 * C ref: dig.c holetime — shopkeeper rough dig ETA; -1 if not digging in shop.
 */
export function holetime() {
    if (game.occupation !== dig) return -1;
    const ushops = game.u?.ushops || '';
    if (!ushops) return -1;
    const effort = ensure_digging().effort | 0;
    return Math.trunc((250 - effort) / 20);
}

/**
 * C ref: dig.c digcheck_fail_message — pline for dig_check failures.
 */
export async function digcheck_fail_message(digresult, madeby, x, y) {
    if ((digresult | 0) < DIGCHECK_FAILED) return;
    const uwep = game.u?.uwep;
    const verb = (madeby === game.youmonst && uwep && is_axe(uwep))
        ? 'chop'
        : 'dig in';
    switch (digresult) {
    case DIGCHECK_FAIL_AIRLEVEL:
        await pline(`You cannot ${verb} thin air.`);
        break;
    case DIGCHECK_FAIL_ALTAR:
        await pline('The altar is too hard to break apart.');
        break;
    case DIGCHECK_FAIL_BOULDER:
        await pline(`There isn't enough room to ${verb} here.`);
        break;
    case DIGCHECK_FAIL_ONLADDER:
        await pline('The ladder resists your effort.');
        break;
    case DIGCHECK_FAIL_ONSTAIRS:
        await pline(`The stairs are too hard to ${verb}.`);
        break;
    case DIGCHECK_FAIL_THRONE:
        await pline('The throne is too hard to break apart.');
        break;
    case DIGCHECK_FAIL_CANTDIG:
    case DIGCHECK_FAIL_TOOHARD:
    case DIGCHECK_FAIL_UNDESTROYABLETRAP:
        await pline(`The ${surface(x, y)} here is too hard to ${verb}.`);
        break;
    case DIGCHECK_FAIL_WATERLEVEL:
        await pline(`The ${hliquid('water')} splashes and subsides.`);
        break;
    default:
        break;
    }
}

/**
 * C ref: zap.c fracture_rock — boulder/statue → ROCK pile (shop bill thin).
 */
export function fracture_rock(obj) {
    if (!obj) return;
    const x = obj.ox | 0;
    const y = obj.oy | 0;
    // shop billable / sokoban_guilt deferred
    obj.otyp = ROCK;
    obj.oclass = GEM_CLASS;
    obj.quan = rn1(60, 7);
    obj.owt = weight(obj);
    obj.dknown = obj.bknown = obj.rknown = 0;
    obj.known = game.objects?.[obj.otyp]?.oc_uses_known ? 0 : 1;
    if (obj.oextra) obj.oextra = null;
    if (obj.where === 1 /* OBJ_FLOOR */ || (obj.ox != null && obj.oy != null)) {
        obj_extract_self(obj);
        place_object(obj, x, y);
        recalc_block_point(x, y);
        vision_recalc(0);
        if (cansee(x, y)) newsym(x, y);
    }
}

/**
 * C ref: zap.c break_statue — STATUE_TRAP activate_shatter or contents
 * out + fracture_rock; Archeologist historic guilt when by hero.
 */
export async function break_statue(obj) {
    if (!obj) return false;
    const x = obj.ox | 0;
    const y = obj.oy | 0;
    const trap = t_at(x, y);
    const by_you = !game.context?.mon_moving;
    if (trap && (trap.ttyp | 0) === STATUE_TRAP
        && (await activate_statue_trap(trap, x, y, true))) {
        return false;
    }
    while (obj.cobj) {
        const item = obj.cobj;
        obj_extract_self(item);
        place_object(item, x, y);
    }
    if (by_you && Role_if(PM_ARCHEOLOGIST)
        && ((obj.spe | 0) & CORPSTAT_HISTORIC)) {
        await You_feel('guilty about damaging such a historic statue.');
        adjalign(-1);
    }
    obj.spe = 0;
    fracture_rock(obj);
    return true;
}

/**
 * C ref: dig.c dig_up_grave — grave-robbing after digactualhole(PIT).
 * Branch envelope (D-0957): WIS exercise; Archeologist/Samurai/Lawful
 * align; emptygrave→default; rn2(5) corpse/zombie/mummy/empty; typ=ROOM;
 * clear flags/horizontal; del_engr_at; newsym.
 * Named omit: none in this helper (callers still omit drawbridge/boulder).
 */
export async function dig_up_grave(cc) {
    const u = game.u || {};
    let dig_x = u.ux | 0;
    let dig_y = u.uy | 0;
    if (cc) {
        dig_x = cc.x | 0;
        dig_y = cc.y | 0;
        if (!isok(dig_x, dig_y)) return;
    }
    const lev = game.level?.at(dig_x, dig_y);
    if (!lev) return;

    // Grave-robbing is frowned upon...
    exercise(A_WIS, false);
    const alignType = u.ualign?.type | 0;
    if (Role_if(PM_ARCHEOLOGIST)) {
        adjalign(-sgn(alignType) * 3);
        await You_feel('like a despicable grave-robber!');
    } else if (Role_if(PM_SAMURAI)) {
        adjalign(-sgn(alignType));
        await pline('You disturb the honorable dead!');
    } else if (alignType === A_LAWFUL) {
        if ((u.ualign?.record | 0) > -10) adjalign(-1);
        await pline('You have violated the sanctity of this grave!');
    }

    // -1: force default case for empty grave (C emptygrave ≡ flags)
    const what_happens = (lev.flags | 0) ? -1 : rn2(5);
    switch (what_happens) {
    case 0:
    case 1: {
        await pline('You unearth a corpse.');
        const otmp = mk_tt_object(CORPSE, dig_x, dig_y);
        if (otmp) otmp.age = (otmp.age | 0) - (TAINT_AGE + 1);
        break;
    }
    case 2: {
        if (!Blind()) {
            await pline(
                `${Hallucination()
                    ? 'Dude!  The living dead'
                    : "The grave's owner is very upset"}!`,
            );
        }
        {
            const { makemon, mkclass } = await import('./makemon.js');
            makemon(mkclass('S_ZOMBIE', 0), dig_x, dig_y, MM_NOMSG);
        }
        break;
    }
    case 3: {
        if (!Blind()) {
            await pline(
                `${Hallucination()
                    ? 'I want my mummy'
                    : "You've disturbed a tomb"}!`,
            );
        }
        {
            const { makemon, mkclass } = await import('./makemon.js');
            makemon(mkclass('S_MUMMY', 0), dig_x, dig_y, MM_NOMSG);
        }
        break;
    }
    default:
        await pline('The grave is unoccupied.  Strange...');
        break;
    }
    lev.typ = ROOM;
    lev.flags = 0; // clear emptygrave
    lev.horizontal = 0; // clear disturbed
    del_engr_at(dig_x, dig_y);
    newsym(dig_x, dig_y);
}

/**
 * C ref: dig.c dighole — create PIT/HOLE under hero (pickaxe down path).
 * Branch envelope: dig_check hard fails; pool/lava splash; drawbridge
 * destroy (D-0959); boulder fill / settle (D-0962); IS_GRAVE →
 * digactualhole(PIT)+dig_up_grave (D-0957); fillholetyp liquid;
 * digactualhole PIT/HOLE.
 * Named omit: magical traps explode; DRAWBRIDGE_UP fluid polish;
 * spot_checks; by_magic traps.
 */
export async function dighole(pit_only, _by_magic, cc) {
    const u = game.u || {};
    let dig_x = u.ux | 0;
    let dig_y = u.uy | 0;
    if (cc) {
        dig_x = cc.x | 0;
        dig_y = cc.y | 0;
        if (!isok(dig_x, dig_y)) return false;
    }
    let ttmp = t_at(dig_x, dig_y);
    const lev = game.level?.at(dig_x, dig_y);
    if (!lev) return false;
    const dig_check_result = dig_check(game.youmonst, dig_x, dig_y);
    const nohole = dig_check_result === DIGCHECK_FAIL_CANTDIG
        || dig_check_result === DIGCHECK_FAIL_TOOHARD;
    const old_typ = lev.typ;

    if ((ttmp && (undestroyable_trap(ttmp.ttyp) || nohole))
        || (IS_OBSTRUCTED(old_typ) && old_typ !== SDOOR
            && (rm_wall_info(lev) & W_NONDIGGABLE) !== 0)) {
        const th = (dig_x !== (u.ux | 0) || dig_y !== (u.uy | 0)) ? 't' : '';
        await pline(
            `The ${surface(dig_x, dig_y)} ${th}here is too hard to dig in.`,
        );
        return false;
    }
    if (is_pool_or_lava(dig_x, dig_y)) {
        await pline(
            `The ${hliquid(is_lava(dig_x, dig_y) ? 'lava' : 'water')} `
            + 'sloshes furiously for a moment, then subsides.',
        );
        wake_nearby(false);
        return false;
    }
    if (old_typ === DRAWBRIDGE_DOWN || is_drawbridge_wall(dig_x, dig_y) >= 0) {
        if (pit_only) {
            await pline('The drawbridge seems too hard to dig through.');
            return false;
        }
        const xy = { x: dig_x | 0, y: dig_y | 0 };
        find_drawbridge(xy);
        await destroy_drawbridge(xy.x, xy.y);
        return true;
    }
    // C: dig.c dighole boulder settles into pit or fills hole (D-0962).
    // Does not set retval — digging "fails" because no hole remains.
    const boulder_here = sobj_at(BOULDER, dig_x, dig_y);
    if (boulder_here) {
        if (ttmp && is_pit(ttmp.ttyp) && rn2(2)) {
            const adj = (dig_x !== (u.ux | 0) || dig_y !== (u.uy | 0))
                ? 'adjacent ' : '';
            await pline(`The boulder settles into the ${adj}pit.`);
            ttmp.ttyp = PIT; // crush spikes
        } else {
            await pline('KADOOM!  The boulder falls in!');
            wake_nearby(false);
            delfloortrap(ttmp);
        }
        delobj(boulder_here);
        return false;
    }
    if (IS_GRAVE(old_typ)) {
        await digactualhole(dig_x, dig_y, game.youmonst, PIT);
        await dig_up_grave(cc);
        return true;
    }
    if (IS_THRONE(old_typ)) {
        await pline('The throne is too hard to break apart.');
        return false;
    }
    if (IS_ALTAR(old_typ)) {
        await pline('The altar is too hard to break apart.');
        return false;
    }

    const typ = fillholetyp(dig_x, dig_y, false);
    lev.flags = 0;
    if (typ !== ROOM) {
        if (!(await furniture_handled(dig_x, dig_y, true))) {
            lev.typ = typ;
            await liquid_flow(
                dig_x, dig_y, typ, ttmp,
                'As you dig, the hole fills with %s!',
            );
        }
        return true;
    }
    ttmp = t_at(dig_x, dig_y);
    if (nohole || pit_only
        || dig_check_result === DIGCHECK_PASSED_DESTROY_TRAP
        || dig_check_result === DIGCHECK_PASSED_PITONLY) {
        await digactualhole(dig_x, dig_y, game.youmonst, PIT);
    } else {
        await digactualhole(dig_x, dig_y, game.youmonst, HOLE);
    }
    return true;
}

/**
 * C ref: dig.c dig — pickaxe/axe occupation tick.
 * Branch envelope: weapon/level/pos gates; dig_check / petrified / hard wall;
 * Fumbling; effort + dwarf ×2; down → traps / dighole; lateral finish
 * statue/boulder/rock/wall/door/tree + shop pay; mid-effort hit msg.
 * Named omit: altar_wrath/angry_priest; earth elemental
 * debris; drawbridge wall string; steed fumble.
 * @returns {number} 1 continue, 0 done
 */
async function dig() {
    const u = game.u || {};
    const digging = ensure_digging();
    const dpx = digging.pos.x | 0;
    const dpy = digging.pos.y | 0;
    const uwep = u.uwep;
    const ispick = !!(uwep && is_pick(uwep));
    const verb = (!uwep || is_pick(uwep)) ? 'dig into' : 'chop through';
    let dcresult = DIGCHECK_PASSED;
    const lev = game.level?.at(dpx, dpy);
    if (!lev) return 0;

    if (u.uswallow || !uwep || (!ispick && !is_axe(uwep))
        || !on_level(digging.level, u.uz)
        || (digging.down
            ? (dpx !== (u.ux | 0) || dpy !== (u.uy | 0))
            : !next2u(dpx, dpy))) {
        return 0;
    }

    if (digging.down) {
        dcresult = dig_check(game.youmonst, u.ux | 0, u.uy | 0);
        if ((dcresult | 0) >= DIGCHECK_FAILED) {
            await digcheck_fail_message(dcresult, game.youmonst, u.ux | 0, u.uy | 0);
            return 0;
        }
    } else {
        if (IS_TREE(lev.typ) && !may_dig(dpx, dpy)
            && dig_typ(uwep, dpx, dpy) === DIGTYP_TREE) {
            await pline('This tree seems to be petrified.');
            return 0;
        }
        if (IS_OBSTRUCTED(lev.typ) && !may_dig(dpx, dpy)
            && dig_typ(uwep, dpx, dpy) === DIGTYP_ROCK) {
            await pline(`This wall is too hard to ${verb}.`);
            return 0;
        }
    }

    if (Fumbling() && !rn2(3)) {
        switch (rn2(3)) {
        case 0:
            if (!welded(uwep)) {
                await pline(`You fumble and drop ${yname_dig(uwep)}.`);
                const { dropx } = await import('./do.js');
                await dropx(uwep);
            } else {
                await pline(
                    `Ouch!  ${Yobjnam2_dig(uwep, 'bounce')} and `
                    + `${otense_dig(uwep, 'hit')} you!`,
                );
                const { set_wounded_legs } = await import('./trap.js');
                const { RIGHT_SIDE } = await import('./const.js');
                await set_wounded_legs(RIGHT_SIDE, 5 + rnd(5));
            }
            break;
        case 1:
            await pline(
                `Bang!  You hit with the broad side of ${the(xname(uwep))}!`,
            );
            wake_nearby(false);
            break;
        default:
            await pline('Your swing misses its mark.');
            break;
        }
        return 0;
    }

    digging.effort = (digging.effort | 0)
        + 10 + rn2(5) + abon() + (uwep.spe | 0) - greatest_erosion(uwep)
        + (u.udaminc | 0);
    if (Race_if(PM_DWARF)) digging.effort *= 2;

    if (digging.down) {
        const ttmp = t_at(dpx, dpy);
        if ((digging.effort | 0) > 250
            || (ttmp && ttmp.ttyp === HOLE)) {
            await dighole(false, false, null);
            game.context.digging = {};
            return 0;
        }
        if ((digging.effort | 0) <= 50
            || (ttmp && (ttmp.ttyp === TRAPDOOR || is_pit(ttmp.ttyp)))) {
            return 1;
        }
        if (ttmp && (ttmp.ttyp === LANDMINE
            || (ttmp.ttyp === BEAR_TRAP && !u.utrap))) {
            const { dotrap } = await import('./trap.js');
            const { FORCETRAP } = await import('./const.js');
            await dotrap(ttmp, FORCETRAP);
            game.context.digging = {};
            return 0;
        }
        if (ttmp && ttmp.ttyp === BEAR_TRAP && u.utrap) {
            // rnl bear-trap self-hit / destroy — thin destroy path
            await pline(
                `You destroy the bear trap with ${yobjnam_dig(uwep)}.`,
            );
            deltrap(ttmp);
            reset_utrap(true);
            digging.effort = 0;
            return 0;
        }
        if (ttmp && dcresult === DIGCHECK_PASSED_DESTROY_TRAP) {
            const ttmpname = trapname(ttmp.ttyp, false);
            if (ispick) {
                await pline(
                    `You destroy ${ttmp.tseen ? the(ttmpname) : an(ttmpname)} `
                    + `with ${yobjnam_dig(uwep)}.`,
                );
            }
            deltrap(ttmp);
            digging.effort = 0;
            return 0;
        }
        // altar_wrath deferred
        if (await dighole(true, false, null)) {
            digging.level.dnum = 0;
            digging.level.dlevel = -1;
        }
        return 0;
    }

    if ((digging.effort | 0) > 100) {
        let digtxt = null;
        let dmgtxt = null;
        const shopedge = !!in_rooms(dpx, dpy, SHOPBASE);
        const digtyp = dig_typ(uwep, dpx, dpy);

        if (digtyp === DIGTYP_STATUE) {
            const obj = sobj_at(STATUE, dpx, dpy);
            if (obj) {
                if (await break_statue(obj)) digtxt = 'The statue shatters.';
                else digtxt = null;
            }
        } else if (digtyp === DIGTYP_BOULDER) {
            const obj = sobj_at(BOULDER, dpx, dpy);
            if (obj) {
                fracture_rock(obj);
                const bobj = sobj_at(BOULDER, dpx, dpy);
                if (bobj) {
                    obj_extract_self(bobj);
                    place_object(bobj, dpx, dpy);
                }
                digtxt = 'The boulder falls apart.';
            }
        } else if (lev.typ === STONE || lev.typ === SCORR || IS_TREE(lev.typ)) {
            // C dig.c earth-level mkcavearea before ordinary rock/tree finish
            if (Is_earthlevel(u.uz)) {
                if (uwep.blessed && !rn2(3)) {
                    await mkcavearea(false);
                    digging.lastdigtime = game.moves | 0;
                    digging.quiet = false;
                    digging.level.dnum = 0;
                    digging.level.dlevel = -1;
                    return 0;
                } else if ((uwep.cursed && !rn2(4))
                    || (!uwep.blessed && !rn2(6))) {
                    await mkcavearea(true);
                    digging.lastdigtime = game.moves | 0;
                    digging.quiet = false;
                    digging.level.dnum = 0;
                    digging.level.dlevel = -1;
                    return 0;
                }
            }
            if (digtyp === DIGTYP_TREE) {
                digtxt = 'You cut down the tree.';
                lev.typ = ROOM;
                lev.flags = 0;
                if (!rn2(5)) rnd_treefruit_at(dpx, dpy);
                if (Race_if(PM_ELF) || Role_if(PM_RANGER)) adjalign(-1);
            } else {
                digtxt = 'You succeed in cutting away some rock.';
                lev.typ = CORR;
                lev.flags = 0;
            }
        } else if (IS_WALL(lev.typ)) {
            if (shopedge) {
                const { add_damage, shop_wall_dmg } = await import('./shk.js');
                add_damage(dpx, dpy, shop_wall_dmg());
                dmgtxt = 'damage';
            }
            if (game.level?.flags?.is_maze_lev) {
                lev.typ = ROOM;
                lev.flags = 0;
            } else if (game.level?.flags?.is_cavernous_lev
                && !in_town(dpx, dpy)) {
                lev.typ = CORR;
                lev.flags = 0;
            } else {
                lev.typ = DOOR;
                lev.doormask = D_NODOOR;
            }
            digtxt = 'You make an opening in the wall.';
        } else if (lev.typ === SDOOR) {
            cvt_sdoor_to_door(lev);
            digtxt = 'You break through a secret door!';
            if (!((lev.doormask | 0) & D_TRAPPED)) lev.doormask = D_BROKEN;
        } else if (closed_door(dpx, dpy)) {
            digtxt = `You break through the door with your ${simpleonames(uwep)}.`;
            if (shopedge) {
                const { add_damage } = await import('./shk.js');
                add_damage(dpx, dpy, SHOP_DOOR_COST);
                dmgtxt = 'break';
            }
            if (!((lev.doormask | 0) & D_TRAPPED)) lev.doormask = D_BROKEN;
        } else {
            return 0;
        }

        recalc_block_point(dpx, dpy);
        feel_newsym(dpx, dpy);
        if (digtxt && !digging.quiet) await pline(digtxt);
        if (dmgtxt) {
            const { pay_for_damage } = await import('./shk.js');
            await pay_for_damage(dmgtxt, false);
        }
        // earth elemental debris deferred
        if (IS_DOOR(lev.typ) && ((lev.doormask | 0) & D_TRAPPED)) {
            lev.doormask = D_NODOOR;
            await b_trapped('door', NO_PART);
            recalc_block_point(dpx, dpy);
            newsym(dpx, dpy);
        }
        digging.lastdigtime = game.moves | 0;
        digging.quiet = false;
        digging.level.dnum = 0;
        digging.level.dlevel = -1;
        return 0;
    }

    // not enough effort yet
    const d_target = ['', 'rock', 'statue', 'boulder', 'door', 'tree'];
    const dig_target = dig_typ(uwep, dpx, dpy);
    if (IS_WALL(lev.typ) || dig_target === DIGTYP_DOOR) {
        if (in_rooms(dpx, dpy, SHOPBASE)) {
            await pline(
                `This ${IS_DOOR(lev.typ) ? 'door' : 'wall'} seems too hard to ${verb}.`,
            );
            return 0;
        }
    } else if (dig_target === DIGTYP_UNDIGGABLE
        || (dig_target === DIGTYP_ROCK && !IS_OBSTRUCTED(lev.typ))) {
        return 0;
    }
    if (!game.did_dig_msg) {
        await pline(`You hit the ${d_target[dig_target]} with all your might.`);
        wake_nearby(false);
        game.did_dig_msg = true;
    }
    return 1;
}

function yname_dig(obj) {
    return obj ? `your ${xname(obj)}` : 'your weapon';
}

function yobjnam_dig(obj) {
    return yname_dig(obj);
}

function Yobjnam2_dig(obj, verb) {
    return `Your ${xname(obj)} ${verb}s`;
}

function otense_dig(_obj, verb) {
    return verb;
}

/** C ref: cmd.c getdir subset — hjkl/yubn + . self + <> vertical. */
async function dig_getdir(prompt) {
    const msg = prompt || 'In what direction?';
    game._pending_message = `${msg} `;
    await flush_screen(1);
    const disp = game.nhDisplay;
    if (disp?.setCursor) disp.setCursor(game._pending_message.length, 0);
    const key = await nhgetch();
    const ch = String.fromCharCode(key);
    game._pending_message = '';
    if (!game.u) game.u = {};
    if (ch === '.') {
        game.u.dx = game.u.dy = game.u.dz = 0;
        return true;
    }
    if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') return false;
    if (ch === '<') {
        game.u.dx = game.u.dy = 0;
        game.u.dz = -1;
        return true;
    }
    if (ch === '>') {
        game.u.dx = game.u.dy = 0;
        game.u.dz = 1;
        return true;
    }
    const ent = DIG_DIR_CHARS.find((d) => d.ch === ch && d.dz === 0);
    if (!ent) return false;
    game.u.dx = ent.dx;
    game.u.dy = ent.dy;
    game.u.dz = 0;
    return true;
}

/** C ref: cmd.c cmdq_add_ec — rhack(0) awaits the function (D-1018). */
function cmdq_add_ec(fn) {
    if (!game._cmdq_canned) game._cmdq_canned = [];
    game._cmdq_canned.push(fn);
}

/** C ref: cmd.c cmdq_add_key — getobj pops CMDQ_KEY as invlet char. */
function cmdq_add_key(ch) {
    if (!game._cmdq_canned) game._cmdq_canned = [];
    const key = typeof ch === 'string' ? ch.charCodeAt(0) : ch;
    game._cmdq_canned.push({ typ: 'key', key });
}

/**
 * C ref: dig.c use_pick_axe — wield if needed, ask direction, use_pick_axe2.
 */
export async function use_pick_axe(obj) {
    const u = game.u || {};
    let res = ECMD_OK;
    if (obj !== u.uwep) {
        if (await wield_tool(obj, 'swing')) {
            // C: cmdq_add_ec(CQ_CANNED, doapply); cmdq_add_key(CQ_CANNED, obj->invlet)
            const { doapply } = await import('./apply.js');
            cmdq_add_ec(doapply);
            cmdq_add_key(obj.invlet);
            return ECMD_TIME;
        }
        return ECMD_OK;
    }
    const ispick = is_pick(obj);
    const verb = ispick ? 'dig' : 'chop';
    if (u.utrap && u.utraptype === TT_WEB) {
        await pline(
            `${!res ? 'Unfortunately' : 'But'}, you can't ${verb} while `
            + 'entangled in a web.',
        );
        return res;
    }

    const downok = !!can_reach_floor(false);
    let dirsyms = '';
    for (const d of DIG_DIR_CHARS) {
        if (u.uswallow) {
            dirsyms += d.ch;
            continue;
        }
        if (d.dz === 0) {
            const rx = (u.ux | 0) + d.dx;
            const ry = (u.uy | 0) + d.dy;
            if (!isok(rx, ry) || dig_typ(obj, rx, ry) === DIGTYP_UNDIGGABLE) {
                continue;
            }
            dirsyms += d.ch;
        } else {
            // include down when can_reach_floor; else up as silly candidate
            if ((d.dz > 0) !== downok) continue;
            dirsyms += d.ch;
        }
    }
    const qbuf = `In what direction do you want to ${verb}? [${dirsyms}]`;
    if (!(await dig_getdir(qbuf))) return res | ECMD_CANCEL;
    return use_pick_axe2(obj);
}

/**
 * C ref: dig.c use_pick_axe2 — act on u.dx/dy/dz; set dig occupation.
 * Branch envelope (D-0962): conjoined pit debris join; autodig quiet
 * on repeated rock dig; boulder/statue reach failures.
 * Named omit: Underwater; swallowed attack polish;
 * uteetering/uescaped_shaft dotrap; cant_reach_floor messaging.
 */
export async function use_pick_axe2(obj) {
    const u = game.u || {};
    const ispick = is_pick(obj);
    const verbing = ispick ? 'digging' : 'chopping';
    /* C use_pick_axe2 — trap is function-scoped; assigned in the
       teetering else-if (named) and reused for axe-down LANDMINE /
       BEAR_TRAP. */
    let trap;
    const d_action = [
        'swinging', 'digging', 'chipping the statue', 'hitting the boulder',
        'chopping at the door', 'cutting the tree',
    ];

    if (u.uswallow) {
        const { do_attack } = await import('./uhitm.js');
        if (u.ustuck) await do_attack(u.ustuck);
    } else if (u.dz < 0) {
        if (Levitation()) await pline("You don't have enough leverage.");
        else await pline("You can't reach the ceiling.");
    } else if (!u.dx && !u.dy && !u.dz) {
        let dam = rnd(2) + dbon() + (obj.spe | 0);
        if (dam <= 0) dam = 1;
        await pline(`You hit yourself with ${yname_dig(u.uwep)}.`);
        await losehp(maybe_half_phys(dam), 'own pick-axe', KILLED_BY);
        if (game.flags) game.flags.botl = true;
        return ECMD_TIME;
    } else if ((u.dz | 0) === 0) {
        confdir(false);
        const rx = (u.ux | 0) + (u.dx | 0);
        const ry = (u.uy | 0) + (u.dy | 0);
        if (!isok(rx, ry)) {
            await pline('Clash!');
            return ECMD_TIME;
        }
        const lev = game.level?.at(rx, ry);
        const mon = m_at(rx, ry);
        if (mon) {
            const { do_attack } = await import('./uhitm.js');
            if (await do_attack(mon)) return ECMD_TIME;
        }
        const dig_target = dig_typ(obj, rx, ry);
        if (dig_target === DIGTYP_UNDIGGABLE) {
            const trap = t_at(rx, ry);
            let trap_with_u;
            if (trap && trap.ttyp === WEB) {
                if (!trap.tseen) {
                    seetrap(trap);
                    await pline('There is a spider web there!');
                }
                await pline(
                    `${Yobjnam2_dig(obj, 'become')} entangled in the web.`,
                );
                nomul(-d_dice(2, 2));
                game.multi_reason = 'stuck in a spider web';
                game.nomovemsg = 'You pull free.';
            } else if (lev?.typ === IRONBARS) {
                await pline('Clang!');
                wake_nearby(false);
            } else if (lev && IS_WATERWALL(lev.typ)) {
                await pline('Splash!');
            } else if (lev?.typ === LAVAWALL) {
                await pline('Splash!');
            } else if (lev && IS_TREE(lev.typ)) {
                await pline('You need an axe to cut down a tree.');
            } else if (lev && IS_OBSTRUCTED(lev.typ)) {
                await pline('You need a pick to dig rock.');
            } else if (sobj_at(BOULDER, rx, ry) || sobj_at(STATUE, rx, ry)) {
                const boulder = sobj_at(BOULDER, rx, ry);
                const what = boulder ? 'boulder' : 'statue';
                if (!ispick) {
                    const vibrate = !rn2(3);
                    await pline(
                        `Sparks fly as you whack the ${what}.`
                        + (vibrate
                            ? '  The axe-handle vibrates violently!'
                            : ''),
                    );
                    if (vibrate) {
                        await losehp(
                            maybe_half_phys(2),
                            'axing a hard object',
                            KILLED_BY,
                        );
                    }
                    wake_nearby(false);
                } else {
                    await pline(`You can't reach the ${what}.`);
                }
            } else if (u.utrap && (u.utraptype | 0) === TT_PIT && trap
                && (trap_with_u = t_at(u.ux | 0, u.uy | 0))
                && is_pit(trap.ttyp)
                && !conjoined_pits(trap, trap_with_u, false)) {
                // C: dig.c use_pick_axe2 — clear debris / join pits (D-0962)
                const idx = xytodir(u.dx | 0, u.dy | 0);
                if (idx !== DIR_ERR) {
                    const adjidx = DIR_180(idx);
                    trap_with_u.conjoined = (trap_with_u.conjoined | 0)
                        | (1 << idx);
                    trap.conjoined = (trap.conjoined | 0) | (1 << adjidx);
                    await pline(
                        'You clear some debris from between the pits.',
                    );
                }
            } else if (u.utrap && (u.utraptype | 0) === TT_PIT
                && t_at(u.ux | 0, u.uy | 0)) {
                await pline(
                    `You swing ${yobjnam_dig(obj)}, but the rubble `
                    + 'has no place to go.',
                );
            } else {
                await pline(
                    `You swing ${yobjnam_dig(obj)} through thin air.`,
                );
            }
        } else {
            game.did_dig_msg = false;
            const digging = ensure_digging();
            digging.quiet = false;
            if ((digging.pos.x | 0) !== rx
                || (digging.pos.y | 0) !== ry
                || !on_level(digging.level, u.uz)
                || digging.down) {
                // C: autodig quiet when repeating rock dig at same spot
                if (game.flags?.autodig && dig_target === DIGTYP_ROCK
                    && !digging.down
                    && u_at(digging.pos.x | 0, digging.pos.y | 0)
                    && ((game.moves | 0) <= ((digging.lastdigtime | 0) + 2)
                        && (game.moves | 0) >= (digging.lastdigtime | 0))) {
                    game.did_dig_msg = true;
                    digging.quiet = true;
                }
                digging.down = false;
                digging.chew = false;
                digging.warned = false;
                digging.pos.x = rx;
                digging.pos.y = ry;
                assign_level(digging.level, u.uz);
                digging.effort = 0;
                if (!digging.quiet) {
                    await pline(`You start ${d_action[dig_target]}.`);
                }
            } else {
                await pline(
                    `You ${digging.chew ? 'begin' : 'continue'} `
                    + `${d_action[dig_target]}.`,
                );
                digging.chew = false;
            }
            set_occupation(dig, verbing, 0);
        }
    } else if (Is_airlevel(u.uz) || Is_waterlevel(u.uz)) {
        await pline(`You swing ${yobjnam_dig(obj)} through thin air.`);
    } else if (!can_reach_floor(false)) {
        await pline("You can't reach the floor.");
    } else if (is_pool_or_lava(u.ux | 0, u.uy | 0)) {
        await pline(
            `You cannot stay under${is_pool(u.ux | 0, u.uy | 0) ? 'water' : ' the lava'} long enough.`,
        );
    } else if (!ispick
        /* C dig.c use_pick_axe2 `:1328–1335` — axe only digs down to
           trigger/disarm LANDMINE/BEAR_TRAP; else scratch +
           u_wipe_engr(3) (D-1375; callee D-1051). uteetering /
           uescaped_shaft still named. */
        && (!(trap = t_at(u.ux | 0, u.uy | 0))
            || ((trap.ttyp | 0) !== LANDMINE
                && (trap.ttyp | 0) !== BEAR_TRAP))) {
        await pline(
            `Your ${xname(obj)} merely scratches the ${surface(u.ux | 0, u.uy | 0)}.`,
        );
        u_wipe_engr(3);
    } else {
        const digging = ensure_digging();
        if ((digging.pos.x | 0) !== (u.ux | 0)
            || (digging.pos.y | 0) !== (u.uy | 0)
            || !on_level(digging.level, u.uz)
            || !digging.down) {
            digging.chew = false;
            digging.down = true;
            digging.warned = false;
            digging.pos.x = u.ux | 0;
            digging.pos.y = u.uy | 0;
            assign_level(digging.level, u.uz);
            digging.effort = 0;
            await pline(`You start ${verbing} downward.`);
            if (u.ushops) {
                const { shopdig, add_damage } = await import('./shk.js');
                await shopdig(0);
                add_damage(u.ux | 0, u.uy | 0, SHOP_PIT_COST);
            }
        } else {
            await pline(`You continue ${verbing} downward.`);
        }
        game.did_dig_msg = false;
        set_occupation(dig, verbing, 0);
    }
    return ECMD_TIME;
}

/** C rnd.c d(n,x) — n dice of x. */
function d_dice(n, x) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += rnd(x);
    return sum;
}
