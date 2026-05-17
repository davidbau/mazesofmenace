// drawbridge.js — dbridge.c drawbridge helpers + destroy_drawbridge() subset for dig.c dighole.
// C ref: dbridge.c is_drawbridge_wall(), find_drawbridge(), destroy_drawbridge().
//
// Ported: wall probe + find span; destroy terrain (**`MOAT`/`LAVAPOOL`** vs **`ROOM`/`ICE`**),
// portcullis **`DOOR`/`D_NODOOR`**, **`deltrap`** both cells, **`del_engr`**, **`wake_nearto`** stub,
// **`rn2(6)`** debris (**`mksobj_at`** **`next_ident`** + **`scatter`** MAY_HIT force 1) simplified movement
// (**`ZAP_POS`**, **`closed_door`**, **`IS_SINK`** stop) without C **`e_died`/`thitu`**/**`ohitmon`**.
// Deferred: **`set_entity`/`do_entity`/`e_died`**, **`unblock_point`/`does_block`**, **`Is_stronghold`**
// **`uevent`**, **`flooreffects`** boulder-on-span, full **`scatter`**.

import { pline, newsym } from './display.js';
import { vision_recalc, cansee } from './vision.js';
import { delEngrAt } from './engrave.js';
import {
    isok,
    DOOR,
    DBWALL,
    DB_NORTH,
    DB_SOUTH,
    DB_EAST,
    DB_WEST,
    DB_DIR,
    DB_UNDER,
    DB_MOAT,
    DB_LAVA,
    DB_ICE,
    DRAWBRIDGE_UP,
    IS_DRAWBRIDGE,
    MOAT,
    LAVAPOOL,
    ICE,
    D_NODOOR,
    OTYP_BOULDER,
    OTYP_IRON_CHAIN,
    STONE,
    ZAP_POS,
    SINK,
} from './const.js';
import { rn2, rnd } from './rng.js';
import {
    placeFloorObjectInLevel,
    unlinkFloorObjectInLevel,
    stackObjOnFloorInLevel,
    obliterateObjectInLevel,
} from './floorobj.js';
import { isClosedDoorLoc } from './walkable.js';

/** C: decl.c **`xdir`/`ydir`** first eight compass indices (**`N_DIRS`**). */
const XDIR8 = [-1, -1, 0, 1, 1, 1, 0, -1];
const YDIR8 = [0, -1, -1, -1, 0, 1, 1, 1];

/** C: do_name.c **`hliquid`** when not hallucinating — return **`liquidpref`**. */
function hliquidLikeC(liquidpref) {
    return liquidpref || 'water';
}

function wakeNeartoStub(_x, _y, _dist) {
    void _x;
    void _y;
    void _dist;
}

function trapAtInLevel(g, x, y) {
    const traps = g.level?.traps;
    if (!traps?.length) return null;
    const xi = x | 0;
    const yi = y | 0;
    return traps.find((t) => (t.tx | 0) === xi && (t.ty | 0) === yi) ?? null;
}

function delTrapInLevel(g, trap) {
    const traps = g.level?.traps;
    if (!traps || !trap) return;
    const i = traps.indexOf(trap);
    if (i >= 0) traps.splice(i, 1);
}

function sobjFirstBoulderAt(g, x, y) {
    const heads = g.level?.floorObjHeads;
    if (!heads) return null;
    const k = `${x | 0},${y | 0}`;
    for (let o = heads.get(k) ?? null; o; o = o.nexthere) {
        if ((o.otyp | 0) === OTYP_BOULDER) return o;
    }
    return null;
}

/**
 * C: dbridge.c **`is_drawbridge_wall(x,y)`** — returns **`DB_*`** direction or **`-1`**.
 * @param {import('./gstate.js').game} g
 */
export function isDrawbridgeWallLikeC(g, x, y) {
    const xi = x | 0;
    const yi = y | 0;
    if (!isok(xi, yi)) return -1;
    const lev = g.level?.at(xi, yi);
    if (!lev) return -1;
    const t = lev.typ | 0;
    if (t !== DOOR && t !== DBWALL) return -1;

    if (isok(xi + 1, yi)) {
        const e = g.level.at(xi + 1, yi);
        const et = e?.typ | 0;
        if (IS_DRAWBRIDGE(et) && ((e.drawbridgemask | 0) & DB_DIR) === DB_WEST) return DB_WEST;
    }
    if (isok(xi - 1, yi)) {
        const w = g.level.at(xi - 1, yi);
        const wt = w?.typ | 0;
        if (IS_DRAWBRIDGE(wt) && ((w.drawbridgemask | 0) & DB_DIR) === DB_EAST) return DB_EAST;
    }
    if (isok(xi, yi - 1)) {
        const n = g.level.at(xi, yi - 1);
        const nt = n?.typ | 0;
        if (IS_DRAWBRIDGE(nt) && ((n.drawbridgemask | 0) & DB_DIR) === DB_SOUTH) return DB_SOUTH;
    }
    if (isok(xi, yi + 1)) {
        const s = g.level.at(xi, yi + 1);
        const st = s?.typ | 0;
        if (IS_DRAWBRIDGE(st) && ((s.drawbridgemask | 0) & DB_DIR) === DB_NORTH) return DB_NORTH;
    }
    return -1;
}

/**
 * C: dbridge.c **`find_drawbridge(x,y)`** — mutates **`c`** to span coords; returns whether resolved.
 * @param {import('./gstate.js').game} g
 * @param {{ x: number, y: number }} c
 */
export function findDrawbridgeCoordsLikeC(g, c) {
    const lev = g.level?.at(c.x | 0, c.y | 0);
    if (!lev) return false;
    const t = lev.typ | 0;
    if (IS_DRAWBRIDGE(t)) return true;
    const dir = isDrawbridgeWallLikeC(g, c.x | 0, c.y | 0);
    if (dir < 0) return false;
    switch (dir) {
        case DB_NORTH:
            c.y++;
            break;
        case DB_SOUTH:
            c.y--;
            break;
        case DB_EAST:
            c.x--;
            break;
        case DB_WEST:
            c.x++;
            break;
        default:
            return false;
    }
    return true;
}

/** C: dbridge.c **`get_wall_for_db`** — span **`(bx,by)`** → portcullis **`(x2,y2)`**. */
function wallCoordsForDrawbridgeSpanLikeC(g, bx, by) {
    const lev = g.level?.at(bx | 0, by | 0);
    let x2 = bx | 0;
    let y2 = by | 0;
    const dir = (lev?.drawbridgemask | 0) & DB_DIR;
    switch (dir) {
        case DB_NORTH:
            y2--;
            break;
        case DB_SOUTH:
            y2++;
            break;
        case DB_EAST:
            x2++;
            break;
        case DB_WEST:
            x2--;
            break;
        default:
            break;
    }
    return { x2, y2 };
}

/**
 * C: explode.c **`scatter(..., MAY_HIT, otmp)`** — single-object, **`blastforce`** 1, movement only.
 * @param {import('./gstate.js').game} g
 * @param {number} sx
 * @param {number} sy
 * @param {object} otmp
 */
function scatterOneMayHitForce1LikeC(g, sx, sy, otmp) {
    unlinkFloorObjectInLevel(g, otmp);
    const tmpDir = rn2(8);
    const dx = XDIR8[tmpDir];
    const dy = YDIR8[tmpDir];
    const blastforce = 1;
    let tmp = blastforce - Math.trunc((otmp.owt | 0) / 40);
    if (tmp < 1) tmp = 1;
    let range = rnd(tmp);
    let ox = sx | 0;
    let oy = sy | 0;
    let stopped = false;
    while (range > 0 && !stopped) {
        range--;
        const nx = ox + dx;
        const ny = oy + dy;
        if (!isok(nx, ny)) {
            stopped = true;
            break;
        }
        const loc = g.level.at(nx, ny);
        const typ = loc ? loc.typ | 0 : STONE;
        if (!ZAP_POS(typ) || isClosedDoorLoc(loc)) {
            stopped = true;
            break;
        }
        if (typ === SINK) {
            stopped = true;
            break;
        }
        /* C: **`MAY_HIT`** hero/monster — not ported (would pull in **`thitu`/`ohitmon`** RNG). */
        ox = nx;
        oy = ny;
    }
    placeFloorObjectInLevel(g, otmp, ox, oy);
    stackObjOnFloorInLevel(g, otmp);
    newsym(ox, oy);
}

/**
 * C: dbridge.c **`destroy_drawbridge(x,y)`** — span at **`(x,y)`** (**`IS_DRAWBRIDGE`**).
 * @param {import('./gstate.js').game} g
 */
export async function destroyDrawbridgeAtLikeC(g, x, y) {
    const bx = x | 0;
    const by = y | 0;
    const lev1 = g.level?.at(bx, by);
    if (!lev1 || !IS_DRAWBRIDGE(lev1.typ | 0)) return;

    const { x2, y2 } = wallCoordsForDrawbridgeSpanLikeC(g, bx, by);
    const lev2 = g.level?.at(x2, y2);
    if (!lev2) return;

    const under = lev1.drawbridgemask | 0;
    const lavaUnder = (under & DB_UNDER) === DB_LAVA;
    const moatOrLavaUnder = (under & DB_UNDER) === DB_MOAT || lavaUnder;

    const u = g.u;
    const heroAtWall = u && (u.ux | 0) === x2 && (u.uy | 0) === y2;
    const heroAtSpan = u && (u.ux | 0) === bx && (u.uy | 0) === by;

    if (moatOrLavaUnder) {
        const lava = lavaUnder;
        const liqWord = lava ? hliquidLikeC('lava') : 'moat';
        if ((lev1.typ | 0) === DRAWBRIDGE_UP) {
            if (cansee(x2, y2) || heroAtWall) {
                await pline(`The portcullis of the drawbridge falls into the ${liqWord}!`);
            } else {
                await pline('You hear a loud *SPLASH*!');
            }
        } else {
            if (cansee(bx, by) || heroAtSpan) {
                await pline(`The drawbridge collapses into the ${liqWord}!`);
            } else {
                await pline('You hear a loud *SPLASH*!');
            }
        }
        lev1.typ = lava ? LAVAPOOL : MOAT;
        lev1.drawbridgemask = 0;
        const boulderHere = sobjFirstBoulderAt(g, bx, by);
        if (boulderHere) {
            obliterateObjectInLevel(g, boulderHere);
        }
    } else {
        if (cansee(bx, by) || heroAtSpan) {
            await pline('The drawbridge disintegrates!');
        } else {
            await pline('You hear a loud *CRASH*!');
        }
        lev1.typ = (under & DB_ICE) !== 0 ? ICE : ROOM;
        lev1.drawbridgemask = 0;
    }

    wakeNeartoStub(bx, by, 500);
    lev2.typ = DOOR;
    lev2.doormask = D_NODOOR;

    const t1 = trapAtInLevel(g, bx, by);
    if (t1) delTrapInLevel(g, t1);
    const t2 = trapAtInLevel(g, x2, y2);
    if (t2) delTrapInLevel(g, t2);
    delEngrAt(bx, by);
    delEngrAt(x2, y2);

    let i = rn2(6);
    while (i > 0) {
        i--;
        const sx = rn2(2) ? bx : x2;
        const sy = rn2(2) ? by : y2;
        rnd(2); /* C: mksobj **`next_ident`** */
        const otmp = {
            otyp: OTYP_IRON_CHAIN,
            ox: -1,
            oy: -1,
            quan: 1,
            owt: 120,
            cursed: false,
            blessed: false,
            olocked: false,
            spe: 0,
            opoisoned: 0,
        };
        placeFloorObjectInLevel(g, otmp, sx, sy);
        scatterOneMayHitForce1LikeC(g, sx, sy, otmp);
    }

    newsym(bx, by);
    newsym(x2, y2);
    vision_recalc(0);
}
