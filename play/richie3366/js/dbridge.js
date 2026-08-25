// dbridge.js — Drawbridge find / open / close / destroy.
// C ref: dbridge.c is_drawbridge_wall / find_drawbridge /
//        get_wall_for_db / open_drawbridge / close_drawbridge /
//        destroy_drawbridge; invent.c delallobj (open/close).
// Envelope (D-0959/D-0977): terrain + messages + wake + trap/engr
// clear + vision/stronghold flags; dig furniture_handled / dighole;
// music passtune open/close.
// Named omit: set_entity/do_entity crush death; revive_nasty; scatter
// iron-chain debris rn2 loop; flooreffects body (boulder → delobj in
// liquid); nokiller; Blind/Unaware You_see polish.

import { game } from './gstate.js';
import { pline, newsym } from './display.js';
import { cansee, recalc_block_point, vision_recalc } from './vision.js';
import { obj_extract_self, delobj, objects_at } from './mkobj.js';
import { t_at, deltrap } from './trap.js';
import { del_engr_at } from './engrave.js';
import { hliquid } from './do_name.js';
import { objectNames } from './generated/objects_data.js';
import { dist2 } from './hacklib.js';
import { unpunish } from './read.js';
import {
    isok, u_at, IS_DRAWBRIDGE, DRAWBRIDGE_UP, DRAWBRIDGE_DOWN,
    DB_NORTH, DB_SOUTH, DB_EAST, DB_WEST, DB_DIR, DB_MOAT, DB_LAVA, DB_ICE,
    DB_UNDER, W_NONDIGGABLE,
    DOOR, D_NODOOR, DBWALL, MOAT, LAVAPOOL, ROOM, ICE, ICED_MOAT,
    Is_stronghold,
} from './const.js';

const BOULDER = objectNames.indexOf('BOULDER');

/** C ref: pline.c You_hear — acoustics/Deaf; Unaware/Underwater deferred. */
async function You_hear(line) {
    const u = game.u || {};
    if (u.Deaf || game.flags?.acoustics === false) return;
    await pline(`You hear ${line}`);
}

/**
 * C ref: pline.c You_see — "You see " prefix; Blind→sense / Unaware deferred.
 */
async function You_see(line) {
    const u = game.u || {};
    const blind = !!((u.HBlinded | 0) || (u.EBlinded | 0) || u.Blind);
    if (blind) await pline(`You sense ${line}`);
    else await pline(`You see ${line}`);
}

/** C ref: distu — squared distance from hero. */
function distu(x, y) {
    const u = game.u || {};
    return dist2(u.ux | 0, u.uy | 0, x | 0, y | 0);
}

/**
 * C ref: invent.c delallobj — destroy floor pile at (x,y) for drawbridge.
 * Named omit: none beyond delobj invocation-item resist path.
 */
function delallobj(x, y) {
    const u = game.u || {};
    let otmp = objects_at(x, y);
    while (otmp) {
        if (otmp === u.uball) unpunish();
        // after unpunish(), or might get deallocated chain
        const otmp2 = otmp.nexthere;
        if (otmp === u.uchain) {
            otmp = otmp2;
            continue;
        }
        delobj(otmp);
        otmp = otmp2;
    }
}

/** C ref: mon.c wake_nearto — clear sleep/wait within dist2 (no RNG). */
function wake_nearto(x, y, distance) {
    for (const mtmp of game.fmon || []) {
        if (!mtmp || mtmp.mx == null) continue;
        const dx = (mtmp.mx | 0) - (x | 0);
        const dy = (mtmp.my | 0) - (y | 0);
        if (distance === 0 || dx * dx + dy * dy < distance) {
            mtmp.msleeping = 0;
            if (mtmp.mstrategy != null) mtmp.mstrategy &= ~0x01;
        }
    }
}

/** C ref: mkobj.c sobj_at — first floor object of otyp at (x,y). */
function sobj_at(otyp, x, y) {
    for (let o = objects_at(x, y); o; o = o.nexthere) {
        if ((o.otyp | 0) === (otyp | 0)) return o;
    }
    return null;
}

/**
 * C ref: dbridge.c is_drawbridge_wall — DB dir if (x,y) is portcullis
 * DOOR/DBWALL adjacent to a drawbridge, else -1.
 */
export function is_drawbridge_wall(x, y) {
    if (!isok(x, y)) return -1;
    const lev = game.level?.at(x, y);
    if (!lev) return -1;
    if (lev.typ !== DOOR && lev.typ !== DBWALL) return -1;

    const e = game.level.at(x + 1, y);
    if (e && IS_DRAWBRIDGE(e.typ)
        && ((e.drawbridgemask | 0) & DB_DIR) === DB_WEST) {
        return DB_WEST;
    }
    const w = game.level.at(x - 1, y);
    if (w && IS_DRAWBRIDGE(w.typ)
        && ((w.drawbridgemask | 0) & DB_DIR) === DB_EAST) {
        return DB_EAST;
    }
    const n = game.level.at(x, y - 1);
    if (n && IS_DRAWBRIDGE(n.typ)
        && ((n.drawbridgemask | 0) & DB_DIR) === DB_SOUTH) {
        return DB_SOUTH;
    }
    const s = game.level.at(x, y + 1);
    if (s && IS_DRAWBRIDGE(s.typ)
        && ((s.drawbridgemask | 0) & DB_DIR) === DB_NORTH) {
        return DB_NORTH;
    }
    return -1;
}

/**
 * C ref: dbridge.c is_db_wall :169–173 — closed portcullis (typ == DBWALL).
 * Callers: zap.c zap_updown WAN_OPENING / WAN_STRIKING / WAN_LOCKING;
 * lock/hack/dig named.
 */
export function is_db_wall(x, y) {
    return (game.level?.at(x, y)?.typ | 0) === DBWALL;
}

/**
 * C ref: dbridge.c find_drawbridge — if (xy) is bridge or wall, set to
 * bridge coords and return true.
 * @param {{x:number,y:number}} xy mutable
 */
export function find_drawbridge(xy) {
    const lev = game.level?.at(xy.x, xy.y);
    if (lev && IS_DRAWBRIDGE(lev.typ)) return true;
    const dir = is_drawbridge_wall(xy.x, xy.y);
    if (dir >= 0) {
        switch (dir) {
        case DB_NORTH: xy.y++; break;
        case DB_SOUTH: xy.y--; break;
        case DB_EAST: xy.x--; break;
        case DB_WEST: xy.x++; break;
        }
        return true;
    }
    return false;
}

/**
 * C ref: dbridge.c get_wall_for_db — move (xy) from bridge to wall cell.
 * @param {{x:number,y:number}} xy mutable
 */
export function get_wall_for_db(xy) {
    const lev = game.level?.at(xy.x, xy.y);
    const dir = (lev?.drawbridgemask | 0) & DB_DIR;
    switch (dir) {
    case DB_NORTH: xy.y--; break;
    case DB_SOUTH: xy.y++; break;
    case DB_EAST: xy.x++; break;
    case DB_WEST: xy.x--; break;
    }
}

/**
 * C ref: dbridge.c close_drawbridge — raise bridge at (x,y).
 * Terrain + messages + delallobj + traps/engr + vision. Crush/entity
 * and revive_nasty deferred (named omit).
 */
export async function close_drawbridge(x, y) {
    const lev1 = game.level?.at(x, y);
    if (!lev1 || lev1.typ !== DRAWBRIDGE_DOWN) return;

    const wall = { x: x | 0, y: y | 0 };
    get_wall_for_db(wall);
    const x2 = wall.x | 0;
    const y2 = wall.y | 0;
    const lev2 = game.level?.at(x2, y2);
    if (!lev2) return;

    const u = game.u || {};
    if (cansee(x, y) || cansee(x2, y2)) {
        const coming = (((u.ux | 0) === (x | 0) || (u.uy | 0) === (y | 0))
                && !u.Underwater)
            || distu(x2, y2) < distu(x, y);
        await You_see(`a drawbridge ${coming ? 'coming' : 'going'} up!`);
    } else {
        await You_hear('chains rattling and gears turning.');
    }

    lev1.typ = DRAWBRIDGE_UP;
    lev2.typ = DBWALL;
    switch ((lev1.drawbridgemask | 0) & DB_DIR) {
    case DB_NORTH:
    case DB_SOUTH:
        lev2.horizontal = true;
        break;
    case DB_WEST:
    case DB_EAST:
        lev2.horizontal = false;
        break;
    }
    lev2.wall_info = (lev2.wall_info | 0) | W_NONDIGGABLE;
    // set_entity / do_entity deferred

    if (objects_at(x, y) && !(u.Deaf || game.flags?.acoustics === false)) {
        await You_hear('smashing and crushing.');
    }
    // revive_nasty deferred
    delallobj(x, y);
    delallobj(x2, y2);
    {
        const t = t_at(x, y);
        if (t) deltrap(t);
    }
    {
        const t = t_at(x2, y2);
        if (t) deltrap(t);
    }
    del_engr_at(x, y);
    del_engr_at(x2, y2);
    newsym(x, y);
    newsym(x2, y2);
    recalc_block_point(x2, y2); // C block_point
    vision_recalc(0);
    // nokiller deferred
}

/**
 * C ref: dbridge.c open_drawbridge — lower bridge at (x,y).
 * Terrain + messages + delallobj + traps/engr + vision + stronghold
 * uopened_dbridge. Crush/entity and revive_nasty deferred.
 */
export async function open_drawbridge(x, y) {
    const lev1 = game.level?.at(x, y);
    if (!lev1 || lev1.typ !== DRAWBRIDGE_UP) return;

    const wall = { x: x | 0, y: y | 0 };
    get_wall_for_db(wall);
    const x2 = wall.x | 0;
    const y2 = wall.y | 0;
    const lev2 = game.level?.at(x2, y2);
    if (!lev2) return;

    if (cansee(x, y) || cansee(x2, y2)) {
        const going = distu(x2, y2) < distu(x, y);
        await You_see(`a drawbridge ${going ? 'going' : 'coming'} down!`);
    } else {
        await You_hear('gears turning and chains rattling.');
    }

    lev1.typ = DRAWBRIDGE_DOWN;
    lev2.typ = DOOR;
    lev2.doormask = D_NODOOR;
    // set_entity / do_entity deferred

    // revive_nasty deferred
    delallobj(x, y);
    {
        const t = t_at(x, y);
        if (t) deltrap(t);
    }
    {
        const t = t_at(x2, y2);
        if (t) deltrap(t);
    }
    del_engr_at(x, y);
    del_engr_at(x2, y2);
    newsym(x, y);
    newsym(x2, y2);
    recalc_block_point(x2, y2); // C unblock_point — JS rebuilds
    vision_recalc(0);
    if (Is_stronghold(game.u?.uz)) {
        const uu = game.u || {};
        if (!uu.uevent) uu.uevent = {};
        uu.uevent.uopened_dbridge = true;
    }
    // nokiller deferred
}

/**
 * C ref: dbridge.c destroy_drawbridge — collapse bridge at (x,y).
 * Terrain + messages + wake + clear traps/engr + vision + stronghold
 * flags. Crush/entity and iron-chain scatter deferred (named omit).
 */
export async function destroy_drawbridge(x, y) {
    const lev1 = game.level?.at(x, y);
    if (!lev1 || !IS_DRAWBRIDGE(lev1.typ)) return;

    const wall = { x: x | 0, y: y | 0 };
    get_wall_for_db(wall);
    const x2 = wall.x | 0;
    const y2 = wall.y | 0;
    const lev2 = game.level?.at(x2, y2);
    if (!lev2) return;

    // C: (mask & DB_UNDER) == DB_MOAT || == DB_LAVA (DB_MOAT is 0).
    const underBits = (lev1.drawbridgemask | 0) & DB_UNDER;
    const isMoatOrLava = underBits === DB_MOAT || underBits === DB_LAVA;

    if (isMoatOrLava) {
        const lava = underBits === DB_LAVA;
        if (lev1.typ === DRAWBRIDGE_UP) {
            if (cansee(x2, y2) || u_at(x2, y2)) {
                await pline(
                    `The portcullis of the drawbridge falls into the ${
                        lava ? hliquid('lava') : 'moat'
                    }!`,
                );
            } else {
                await You_hear('a loud *SPLASH*!');
            }
        } else {
            if (cansee(x, y) || u_at(x, y)) {
                await pline(
                    `The drawbridge collapses into the ${
                        lava ? hliquid('lava') : 'moat'
                    }!`,
                );
            } else {
                await You_hear('a loud *SPLASH*!');
            }
        }
        lev1.typ = lava ? LAVAPOOL : MOAT;
        lev1.drawbridgemask = 0;
        const otmp2 = sobj_at(BOULDER, x, y);
        if (otmp2) {
            // flooreffects deferred — dunk boulder into liquid
            obj_extract_self(otmp2);
            delobj(otmp2);
        }
    } else {
        if (cansee(x, y) || u_at(x, y)) {
            await pline('The drawbridge disintegrates!');
        } else {
            await You_hear('a loud *CRASH*!');
        }
        const iceUnder = ((lev1.drawbridgemask | 0) & DB_ICE) !== 0;
        lev1.typ = iceUnder ? ICE : ROOM;
        lev1.icedpool = iceUnder ? ICED_MOAT : 0;
    }

    wake_nearto(x, y, 500);
    lev2.typ = DOOR;
    lev2.doormask = D_NODOOR;

    {
        const t = t_at(x, y);
        if (t) deltrap(t);
    }
    {
        const t = t_at(x2, y2);
        if (t) deltrap(t);
    }
    del_engr_at(x, y);
    del_engr_at(x2, y2);
    // scatter IRON_CHAIN debris rn2(6) loop deferred (no partial RNG)

    newsym(x, y);
    newsym(x2, y2);
    recalc_block_point(x2, y2);
    vision_recalc(0);

    if (Is_stronghold(game.u?.uz)) {
        const u = game.u || {};
        if (!u.uevent) u.uevent = {};
        u.uevent.uopened_dbridge = true;
        u.uevent.uheard_tune = 3;
    }
    // set_entity / do_entity / e_died crush deferred
}
