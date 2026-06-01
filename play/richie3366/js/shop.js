// shop.js — Shopkeeper and shop-adjacent hooks.
// C ref: shk.c fix_shop_damage(), repair_damage() (**`LANDMINE`/`BEAR_TRAP`** **`mksobj`/`mpickobj`**,
//        **`litter_getpos`/`litter_scatter`/`litter_newsyms`**, **`block_point`** via **`vision_recalc`**),
//        repairable_damage(), shk_impaired(), next_shkp();
//        find_objowner(), stolen_value()/stolen_container() subset for dig.c bury_objs; adisturb(), costly_spot(), add_damage();
//        invent.c useupf() billing; hack.c in_rooms() for **`SHOPBASE`**;
//        shk.c **`shopdig()`** ( **`dig.c`** **`digactualhole`** HOLE + **`trap.c`** **`fall_through`** );
//        **`mon.c`** **`angry_guards`** (**`angryGuardsSilentLikeC`**).

import { game } from './gstate.js';
import { contextLeavingTutorialActiveLikeC } from './tutorial_branch.js';
import { pline, newsym, mapInvisibleCellLikeC, soundeffectStubLikeC, youHearLikeC } from './display.js';
import { unlinkFloorObject, floorObjKey, unlinkFloorObjectInLevel, placeFloorObjectInLevel, stackObjOnFloorInLevel, obliterateObjectInLevel } from './floorobj.js';
import { cansee, couldsee, vision_recalc } from './vision.js';
import { delEngrAt } from './engrave.js';
import { doname } from './objnam.js';
import {
    raceptr,
    passesWalls,
    stubPermonstForCorpsenm,
    MR_FIRE,
    MR_SLEEP,
    noncorporeal,
    S_ELEMENTAL,
    locomotion,
    nolimbs,
    isWatchMonsterLikeC,
} from './mondata.js';
import { heroPassesWalls, enextoNearMon, goodposNewMonster } from './walkable.js';
import { dist2 } from './hacklib.js';
import { rn2, rnd } from './rng.js';
import { nhgetch } from './input.js';
import { changeLuck, acurr } from './attrib.js';
import {
    NH5_COIN_CLASS,
    NH5_FOOD_CLASS,
    NH5_GEM_CLASS,
    NH5_ARMOR_CLASS,
    NH5_WEAPON_CLASS,
    NH5_TOOL_CLASS,
    NH5_POTION_CLASS,
    NH5_WAND_CLASS,
    NH5_SCROLL_CLASS,
    NH5_RING_CLASS,
    NH5_AMULET_CLASS,
    NH5_SPBOOK_CLASS,
    NH5_RANDOM_CLASS,
    NH5_BALL_CLASS,
} from './nh5_objclass.js';
import {
    A_CHA,
    MAXULEV,
    NON_PM,
    ismnum,
    FIRE_RES,
    SLEEP_RES,
    COLD_RES,
    DISINT_RES,
    SHOCK_RES,
    POISON_RES,
    ACID_RES,
    STONE_RES,
    TELEPORT,
    TELEPORT_CONTROL,
    TELEPAT,
    OTYP_HAWAIIAN_SHIRT,
    COST_UNBLSS,
    COST_UNCURS,
} from './const.js';
import { UHS } from './hunger.js';
import { objectOcCost } from './obj_oc_cost_data.js';
import { containedGold } from './u_init_hidden_gold.js';
import { dealWithOvercrowding } from './mon_limbo.js';
import { removeObjFromHeroInvent } from './water_damage.js';
import {
    OROOM,
    NO_ROOM,
    SHARED,
    SHARED_PLUS,
    ROOMOFFSET,
    TEMPLE,
    SHOPBASE,
    UNIQUESHOP,
    IS_DOOR,
    IS_ROOM,
    SVALL,
    SHOP_DOOR_COST,
    ESHK,
    COLNO,
    ROWNO,
    REPAIR_DELAY,
    D_BROKEN,
    D_CLOSED,
    Has_contents,
    OBJ_ONBILL,
    OBJ_FLOOR,
    OBJ_FREE,
    OBJ_CONTAINED,
    LANDMINE,
    BEAR_TRAP,
    ZAP_POS,
    isok,
    OTYP_BOULDER,
    IS_WALL,
    IS_POOL,
    TT_PIT,
    W_SWAPWEP,
    W_QUIVER,
    BOLT_LIM,
} from './const.js';

/**
 * C: hack.c **`in_rooms`** **`goodtype`** for **`SHOPBASE`** (shop + specialized shops).
 * @param {number} rt
 */
function rtypeIsShopClassForInRooms(rt) {
    const t = rt | 0;
    return t === SHOPBASE || (t > SHOPBASE && t <= UNIQUESHOP);
}

/** C: `svr.rooms[rno - ROOMOFFSET].rtype` — **JS** **`g.level.rooms`** index. */
function roomRtypeForLevlRoomno(g, roomno) {
    const idx = (roomno | 0) - ROOMOFFSET;
    if (idx < 0) return OROOM;
    const room = g.level?.rooms?.[idx];
    if (!room || (room.hx | 0) < 0) return OROOM;
    return room.rtype ?? OROOM;
}

/** C: hack.c **`in_rooms`** **`goodtype`** — **`typewanted` `0`** ⇒ any **`roomno` `>= ROOMOFFSET`**; else **`rtype`** match (or **`SHOPBASE`** range). */
function inRoomsGoodtypeLikeC(g, roomno, typewanted) {
    const rn = roomno | 0;
    if (rn < ROOMOFFSET) return false;
    if (!typewanted) return true;
    const typefound = roomRtypeForLevlRoomno(g, rn);
    if ((typewanted | 0) === SHOPBASE) return typefound === SHOPBASE || (typefound > SHOPBASE && typefound <= UNIQUESHOP);
    return (typefound | 0) === (typewanted | 0);
}

/**
 * @param {import('./gstate.js').game} g
 * @param {number[]} acc
 * @param {number} roomno
 * @param {number} typewanted
 */
function pushRoomnoInRoomsGoodtypeUnique(g, acc, roomno, typewanted) {
    const rn = roomno | 0;
    if (!inRoomsGoodtypeLikeC(g, rn, typewanted)) return;
    if (acc.includes(rn)) return;
    acc.push(rn);
}

/**
 * C: hack.c **`in_rooms(x, y, typewanted)`** — **`SHARED`** / **`SHARED_PLUS`** neighbor scan.
 * @param {import('./gstate.js').game} g
 * @param {number} cx
 * @param {number} cy
 * @param {number} step
 * @param {number} typewanted
 */
function inRoomsTypewantedSharedNeighborScan(g, cx, cy, step, typewanted) {
    let min_x = cx - 1;
    let max_x = cx + 1;
    if (cx < 1) min_x += step;
    else if (cx >= COLNO) max_x -= step;

    let min_y = cy - 1;
    let max_y_offset = 2;
    if (min_y < 0) {
        min_y += step;
        max_y_offset -= step;
    } else if (min_y + max_y_offset >= ROWNO) max_y_offset -= step;

    const out = [];
    for (let xx = min_x; xx <= max_x; xx += step) {
        let yOff = 0;
        let loc = g.level?.at(xx, min_y + yOff);
        if (loc) pushRoomnoInRoomsGoodtypeUnique(g, out, loc.roomno | 0, typewanted);
        yOff += step;
        if (yOff > max_y_offset) continue;
        loc = g.level?.at(xx, min_y + yOff);
        if (loc) pushRoomnoInRoomsGoodtypeUnique(g, out, loc.roomno | 0, typewanted);
        yOff += step;
        if (yOff > max_y_offset) continue;
        loc = g.level?.at(xx, min_y + yOff);
        if (loc) pushRoomnoInRoomsGoodtypeUnique(g, out, loc.roomno | 0, typewanted);
    }
    return out;
}

/**
 * C: hack.c **`in_rooms(x, y, typewanted)`** — full **`SHARED`** / **`SHARED_PLUS`** handling; **`typewanted` `0`** lists all rooms at **`(x,y)`** (C **`in_rooms(..., 0)`**).
 * @param {import('./gstate.js').game} g
 * @param {number} x
 * @param {number} y
 * @param {number} typewanted
 * @returns {number[]}
 */
export function inRoomsTypewantedRoomnos(g, x, y, typewanted) {
    const tw = typewanted | 0;
    const loc = g.level?.at(x | 0, y | 0);
    if (!loc) return [];
    const rno = loc.roomno | 0;
    if (rno === NO_ROOM || rno === 0) return [];
    if (rno === SHARED) return inRoomsTypewantedSharedNeighborScan(g, x | 0, y | 0, 2, tw);
    if (rno === SHARED_PLUS) return inRoomsTypewantedSharedNeighborScan(g, x | 0, y | 0, 1, tw);
    if (!inRoomsGoodtypeLikeC(g, rno, tw)) return [];
    return [rno];
}

/** C: priest.c **`temple_occupied(u.urooms)`** — first **`u.urooms`** letter whose **`rtype`** is **`TEMPLE`**; else scan **`in_rooms(u.ux,u.uy,0)`** fallback when **`u.urooms`** unset. */
export function templeOccupiedFromUUroomsLikeC(g) {
    const u = g.u;
    if (!u) return 0;
    const roomsStr = u.urooms;
    if (typeof roomsStr === 'string' && roomsStr.length) {
        for (let i = 0; i < roomsStr.length; i++) {
            const c = roomsStr.charCodeAt(i);
            if (inRoomsGoodtypeLikeC(g, c, TEMPLE)) return c;
        }
        return 0;
    }
    const allAtHero = inRoomsTypewantedRoomnos(g, u.ux | 0, u.uy | 0, 0);
    for (const c of allAtHero) {
        if (inRoomsGoodtypeLikeC(g, c, TEMPLE)) return c;
    }
    return 0;
}

/** C: hack.c **`in_rooms`** **`goodtype`** for **`SHOPBASE`** (matches **`rtype`** test). */
function roomnoIsShopbaseForInRooms(g, roomno) {
    const rt = roomRtypeForLevlRoomno(g, roomno);
    return rtypeIsShopClassForInRooms(rt);
}

/**
 * C: hack.c **`in_rooms`** **`SHOPBASE`** branch — append **`roomno`** if **`>= ROOMOFFSET`**,
 * **`goodtype`**, and not already listed (C **`strchr(ptr, rno)`**).
 * @param {import('./gstate.js').game} g
 * @param {number[]} acc
 * @param {number} roomno
 */
function pushShopbaseRoomnoUnique(g, acc, roomno) {
    const rn = roomno | 0;
    if (rn < ROOMOFFSET) return;
    if (!roomnoIsShopbaseForInRooms(g, rn)) return;
    if (acc.includes(rn)) return;
    acc.push(rn);
}

/**
 * C: hack.c **`in_rooms(x, y, SHOPBASE)`** — **`SHARED`** / **`SHARED_PLUS`** neighbor scan
 * (**`step`** 2 vs 1, same **`min_x`/`max_x`/`min_y`/`max_y_offset`** edge rules).
 * @param {import('./gstate.js').game} g
 * @param {number} cx
 * @param {number} cy
 * @param {number} step
 * @returns {number[]}
 */
function inRoomsShopbaseSharedNeighborScan(g, cx, cy, step) {
    let min_x = cx - 1;
    let max_x = cx + 1;
    if (cx < 1) min_x += step;
    else if (cx >= COLNO) max_x -= step;

    let min_y = cy - 1;
    let max_y_offset = 2;
    if (min_y < 0) {
        min_y += step;
        max_y_offset -= step;
    } else if (min_y + max_y_offset >= ROWNO) max_y_offset -= step;

    const out = [];
    for (let xx = min_x; xx <= max_x; xx += step) {
        let yOff = 0;
        let loc = g.level?.at(xx, min_y + yOff);
        if (loc) pushShopbaseRoomnoUnique(g, out, loc.roomno | 0);
        yOff += step;
        if (yOff > max_y_offset) continue;
        loc = g.level?.at(xx, min_y + yOff);
        if (loc) pushShopbaseRoomnoUnique(g, out, loc.roomno | 0);
        yOff += step;
        if (yOff > max_y_offset) continue;
        loc = g.level?.at(xx, min_y + yOff);
        if (loc) pushShopbaseRoomnoUnique(g, out, loc.roomno | 0);
    }
    return out;
}

/**
 * C: hack.c **`in_rooms(x, y, SHOPBASE)`** — full **`SHARED`** and **`SHARED_PLUS`** handling.
 * @param {import('./gstate.js').game} g
 * @param {number} x
 * @param {number} y
 * @returns {number[]} `levl.roomno` values (C stores as **`char`** IDs).
 */
export function inRoomsShopbaseRoomnos(g, x, y) {
    const loc = g.level?.at(x | 0, y | 0);
    if (!loc) return [];
    const rno = loc.roomno | 0;
    if (rno === NO_ROOM || rno === 0) return [];
    if (rno === SHARED) return inRoomsShopbaseSharedNeighborScan(g, x | 0, y | 0, 2);
    if (rno === SHARED_PLUS) return inRoomsShopbaseSharedNeighborScan(g, x | 0, y | 0, 1);
    const rt = roomRtypeForLevlRoomno(g, rno);
    if (!rtypeIsShopClassForInRooms(rt)) return [];
    return [rno];
}

/**
 * C: shk.c **`inside_shop(x, y)`** — strictly inside shop (**`roomno`**, not boundary **`edge`**, **`IS_SHOP`**).
 * @returns {number} **`levl.roomno`** or **`NO_ROOM`**
 */
export function insideShopLevlRoomno(g, x, y) {
    const loc = g.level?.at(x | 0, y | 0);
    if (!loc) return NO_ROOM;
    const rno = loc.roomno | 0;
    if (rno < ROOMOFFSET || loc.edge || !roomnoIsShopbaseForInRooms(g, rno)) return NO_ROOM;
    return rno;
}

/**
 * C: **`mextra.h`** **`eshk.shoproom`** is **`(sroom - svr.rooms) + ROOMOFFSET`** (**`shknam.c`**), i.e. **`levl.roomno`** form.
 * Accept legacy **`0..n-1`** index if **`shoproom < ROOMOFFSET`**.
 * @param {*} [eshk]
 */
function eshkShoproomAsLevlRno(eshk) {
    const s = eshk?.shoproom | 0;
    if (s >= ROOMOFFSET) return s;
    return s + ROOMOFFSET;
}

/** C: shk.c **`shop_keeper(rmno)`** — find resident shk for **`levl.roomno`** **`rmno`**. */
export function shopKeeperForLevlRoomno(g, roomno) {
    const target = roomno | 0;
    if (target < ROOMOFFSET) return null;
    for (const m of g.level?.monsters ?? []) {
        if (!(m.isshk | 0)) continue;
        const e = ESHK(m);
        if (!e) continue;
        if (eshkShoproomAsLevlRno(e) === target) return m;
    }
    return null;
}

/** C: dungeon.c **`on_level(&eshk->shoplevel, &u.uz)`** — stub **`dnum`** when missing. */
function onLevelWithHero(g, shoplevel) {
    const uz = g.u?.uz;
    if (!uz) return true;
    if (!shoplevel || shoplevel.dlevel == null) return true;
    const dnum = shoplevel.dnum != null ? shoplevel.dnum | 0 : uz.dnum | 0;
    return (shoplevel.dlevel | 0) === (uz.dlevel | 0) && dnum === (uz.dnum | 0);
}

/** C: shk.c **`inhishop(shkp)`** */
function inHishop(g, shkp) {
    const e = ESHK(shkp);
    if (!shkp || !(shkp.isshk | 0) || !e) return false;
    if (!onLevelWithHero(g, e.shoplevel)) return false;
    const rnos = inRoomsShopbaseRoomnos(g, shkp.mx | 0, shkp.my | 0);
    return rnos.includes(eshkShoproomAsLevlRno(e));
}

/**
 * C: shk.c **`tended_shop(sroom)`** — **`in_rooms(mtmp->mx,my,SHOPBASE)`** loop in **`do_attack`**.
 * @param {import('./gstate.js').game} g
 * @param {number} x
 * @param {number} y
 */
export function tendedShopAtXYLikeC(g, x, y) {
    for (const rno of inRoomsShopbaseRoomnos(g, x | 0, y | 0)) {
        const shk = shopKeeperForLevlRoomno(g, rno);
        if (shk && inHishop(g, shk)) return true;
    }
    return false;
}

/** C: mon.c **`helpless`** subset (**`mfrozen`/`mcanmove`**). */
function helplessShk(mtmp) {
    if (!mtmp) return false;
    if ((mtmp.mfrozen | 0) > 0) return true;
    return (mtmp.mcanmove | 0) === 0;
}

/** C: shk.c **`shk_impaired`** */
function shkImpaired(g, shkp) {
    if (!shkp || !(shkp.isshk | 0)) return true;
    if (!inHishop(g, shkp)) return true;
    const e = ESHK(shkp);
    if (helplessShk(shkp) || (e?.following | 0)) return true;
    return false;
}

/** C: mondata.h **`canspotmon`** subset — steed / invis / **`cansee`**. */
function canspotMonShkcatchLikeC(g, mtmp) {
    const u = g.u;
    if (!mtmp || !u) return false;
    if ((u.usteed | 0) && u.usteed === mtmp) return true;
    if ((mtmp.minvis | 0) && !(u.See_invisible | 0)) return false;
    return cansee(mtmp.mx | 0, mtmp.my | 0);
}

/**
 * C: mon.c **`mnearto(mtmp, x, y, TRUE, RLOC_NOMSG)`** — return **2** if another monster was displaced (**`move_other`**).
 * Omits **`mon_leaving_level`** / full **`goodpos`** / **`rloc_to_flag`** parity; uses **`goodposNewMonster`** + **`enextoNearMon`** + **`dealWithOvercrowding`**.
 * @returns {Promise<number>} **0** fail, **1** moved without displacing, **2** displaced another
 */
async function mneartoThrownPickForShkcatchLikeC(g, mtmp, tx, ty) {
    const xi = tx | 0;
    const yi = ty | 0;
    const sx = mtmp.mx | 0;
    const sy = mtmp.my | 0;
    if (sx === xi && sy === yi) return 1;

    const blocker = g.level?.monsters?.find(
        (m) => m !== mtmp && (m.mx | 0) === xi && (m.my | 0) === yi,
    );
    let displaced = false;

    if (blocker) {
        const bdest = enextoNearMon(g, xi, yi, blocker);
        if (!bdest) await dealWithOvercrowding(g, blocker);
        else {
            displaced = true;
            const bx0 = blocker.mx | 0;
            const by0 = blocker.my | 0;
            blocker.mx = bdest.x | 0;
            blocker.my = bdest.y | 0;
            await newsym(bx0, by0);
            await newsym(blocker.mx, blocker.my);
        }
    }

    let nx = xi;
    let ny = yi;
    if (!goodposNewMonster(xi, yi, mtmp, g)) {
        const mm = enextoNearMon(g, xi, yi, mtmp);
        if (!mm) return 0;
        nx = mm.x | 0;
        ny = mm.y | 0;
    }

    await newsym(sx, sy);
    mtmp.mx = nx;
    mtmp.my = ny;
    await newsym(nx, ny);

    return displaced ? 2 : 1;
}

/**
 * C: shk.c **`shkcatch`** — shopkeeper catches a thrown pick-axe inside a shop.
 * Omits **`SetVoice`**, **`nh_delay_output`/`mark_synch`** (display flush).
 * @param {import('./gstate.js').game} g
 * @returns {Promise<object|null>} shopkeeper monst if catch, else null
 */
export async function shkcatchThrownPickHeroLikeC(g, obj, x, y) {
    const u = g.u;
    if (!u || !obj) return null;
    if (contextLeavingTutorialActiveLikeC(g)) return null;
    const xi = x | 0;
    const yi = y | 0;
    const rmno = insideShopLevlRoomno(g, xi, yi);
    if (rmno === NO_ROOM) return null;
    const shkp = shopKeeperForLevlRoomno(g, rmno);
    if (!shkp || !inHishop(g, shkp)) return null;
    if (helplessShk(shkp)) return null;

    const heroRnos = inRoomsShopbaseRoomnos(g, u.ux | 0, u.uy | 0);
    const heroInShop = insideShopLevlRoomno(g, u.ux | 0, u.uy | 0) !== NO_ROOM;
    const firstHero = heroRnos.length ? heroRnos[0] | 0 : null;
    const e = ESHK(shkp);
    const shkRoom = e ? eshkShoproomAsLevlRno(e) : NO_ROOM;
    if (firstHero === shkRoom && heroInShop) return null;

    if (dist2(shkp.mx | 0, shkp.my | 0, xi, yi) >= 3) return null;
    if ((shkp.mx | 0) === xi && (shkp.my | 0) === yi) return null;

    const mnear = await mneartoThrownPickForShkcatchLikeC(g, shkp, xi, yi);
    if (mnear === 2 && !heroDeafShopdig(g) && !muteshkShk(shkp)) {
        await pline(`${shknamDisplay(shkp)} says "Out of my way, scum!"`);
    }

    if (cansee(xi, yi)) {
        const reach =
            xi === (shkp.mx | 0) && yi === (shkp.my | 0) ? '' : ' reaches over and';
        await pline(`${shknamDisplay(shkp)} nimbly${reach} catches ${doname(obj, g)}.`);
        if (!canspotMonShkcatchLikeC(g, shkp)) mapInvisibleCellLikeC(shkp.mx | 0, shkp.my | 0);
    }
    subfrombillLikeC(g, obj, shkp);
    mpickobjShk(g, shkp, obj);
    return shkp;
}

/** C: trap.c **`t_at`** using **`g.level.traps`**. */
function trapAtIn(g, x, y) {
    const traps = g.level?.traps;
    if (!traps?.length) return null;
    return traps.find((t) => (t.tx | 0) === (x | 0) && (t.ty | 0) === (y | 0)) ?? null;
}

function delTrapIn(g, trap) {
    const traps = g.level?.traps;
    if (!traps) return;
    const i = traps.indexOf(trap);
    if (i >= 0) traps.splice(i, 1);
}

/** C: objects.c ROCK — **`litter_scatter`** merge into wall. */
const OTYP_ROCK_REPAIR = 467;

/** C: trap.h **`LAND_MINE`/`BEARTRAP`** otyp for **`mksobj`** (**`melt_ice.js`** parity). */
const OTYP_LAND_MINE_SHK = 244;
const OTYP_BEARTRAP_SHK = 245;

const LITTER_OPEN = 1;
const LITTER_INSHOP = 2;
const LITTER_UPDATE = 4;

function horiz9(i) {
    return (i % 3) - 1;
}

function vert9(i) {
    return Math.trunc(i / 3) - 1;
}

/**
 * C: shk.c **`litter_getpos`** — subset (**`Punished`/`uball`/`uchain`** not ported).
 * @param {number[]} litter
 */
function litterGetposShopRepair(g, litter, x, y, shkp) {
    for (let i = 0; i < 9; i++) litter[i] = 0;
    const loc = g.level?.at(x, y);
    const head = g.level?.floorObjHeads?.get(floorObjKey(x, y));
    if (!head || !loc || IS_ROOM(loc.typ | 0)) return 0;
    const e = ESHK(shkp);
    const shopR = eshkShoproomAsLevlRno(e);
    let k = 0;
    for (let i = 0; i < 9; i++) {
        if (i === 4) continue;
        const ix = x + horiz9(i);
        const iy = y + vert9(i);
        if (!isok(ix, iy)) continue;
        const l2 = g.level?.at(ix, iy);
        if (!l2 || !ZAP_POS(l2.typ | 0)) continue;
        litter[i] = LITTER_OPEN;
        if ((insideShopLevlRoomno(g, ix, iy) | 0) === (shopR | 0)) {
            litter[i] |= LITTER_INSHOP;
            k += 1;
        }
    }
    return k;
}

/**
 * C: shk.c **`litter_scatter`** — subset (no **`unplacebc`**, bill **`subfrombill`** not ported).
 * @param {number[]} litter
 */
function litterScatterShopRepair(g, litter, x, y, shkp) {
    for (;;) {
        const head = g.level?.floorObjHeads?.get(floorObjKey(x, y));
        if (!head) break;
        const otmp = head;
        const ot = otmp.otyp | 0;
        if (ot === OTYP_BOULDER || ot === OTYP_ROCK_REPAIR) {
            obliterateObjectInLevel(g, otmp);
            continue;
        }
        let trylimit = 10;
        let i = rn2(9);
        let destIx = shkp.mx | 0;
        let destIy = shkp.my | 0;
        let li = -1;
        while (--trylimit > 0) {
            i = (i + 1) % 9;
            if (i === 4) continue;
            if (!((litter[i] | 0) & LITTER_INSHOP)) continue;
            if (((litter[i] | 0) & (LITTER_OPEN | LITTER_INSHOP)) !== 0) {
                destIx = x + horiz9(i);
                destIy = y + vert9(i);
                li = i;
                break;
            }
        }
        unlinkFloorObjectInLevel(g, otmp);
        placeFloorObjectInLevel(g, otmp, destIx, destIy);
        stackObjOnFloorInLevel(g, otmp);
        if (li >= 0) litter[li] |= LITTER_UPDATE;
        newsym(destIx, destIy);
    }
}

/** C: shk.c **`litter_newsyms`**. */
function litterNewsymsRepair(litter, x, y) {
    for (let i = 0; i < 9; i++) {
        if ((litter[i] | 0) & LITTER_UPDATE) newsym(x + horiz9(i), y + vert9(i));
    }
}

/** C: mkobj.c **`mksobj`** + **`weight`** subset for **`repair_damage`** trap conversion. */
function mksobjTrapObjForShopRepair(g, ttyp) {
    void g;
    rnd(2); /* C: next_ident */
    const otyp = (ttyp | 0) === LANDMINE ? OTYP_LAND_MINE_SHK : OTYP_BEARTRAP_SHK;
    const otmp = {
        otyp,
        ox: -1,
        oy: -1,
        quan: 1,
        owt: (ttyp | 0) === LANDMINE ? 30 : 125,
        cursed: false,
        blessed: false,
        olocked: false,
        spe: 0,
        opoisoned: 0,
        nobj: null,
    };
    if (otyp >= 230 && otyp < 300) {
        const r = rn2(4);
        otmp.cursed = r === 0;
        otmp.blessed = false;
    }
    return otmp;
}

/** C: steed.c / pick.c **`mpickobj(shkp, otmp)`** — prepend **`minvent`**. */
function mpickobjShk(g, shkp, otmp) {
    if (!shkp || !otmp) return;
    otmp.ox = -1;
    otmp.oy = -1;
    otmp.nobj = shkp.minvent ?? null;
    shkp.minvent = otmp;
    const arr = g.level?.objects;
    if (arr && !arr.includes(otmp)) arr.push(otmp);
}

/** C: hack.c **`block_point`** — vision/lighting (**`recalc_block_point`** not ported). */
function repairBlockPoint(g, _x, _y) {
    void _x;
    void _y;
    vision_recalc(1);
}

/** C: mon.c **`m_at`** on **`g.level.monsters`**. */
function monAtG(g, x, y) {
    return g.level?.monsters?.find((m) => (m.mx | 0) === (x | 0) && (m.my | 0) === (y | 0)) ?? null;
}

/** C: shk.c **`repairable_damage`** */
function repairableDamage(g, shkp, dam) {
    if (!dam || shkImpaired(g, shkp)) return false;
    const x = dam.x | 0;
    const y = dam.y | 0;
    const e = ESHK(shkp);
    if (!e) return false;
    if ((g.moves | 0) - (dam.when | 0) < REPAIR_DELAY) return false;

    const loc = g.level?.at(x, y);
    if (!loc) return false;

    const savedTyp = dam.typ | 0;
    if (!IS_ROOM(savedTyp)) {
        const ux = g.u?.ux | 0;
        const uy = g.u?.uy | 0;
        if (ux === x && uy === y && !heroPassesWalls(g)) return false;
        if ((shkp.mx | 0) === x && (shkp.my | 0) === y) return false;
        const mtmp = monAtG(g, x, y);
        if (mtmp && !passesWalls(raceptr(mtmp))) return false;
    }
    const ttmp = trapAtIn(g, x, y);
    if (ttmp) {
        const ux = g.u?.ux | 0;
        const uy = g.u?.uy | 0;
        if (ux === x && uy === y) return false;
        const mtmp2 = monAtG(g, x, y);
        if (mtmp2 && (mtmp2.mtrapped | 0)) return false;
    }
    const shopR = eshkShoproomAsLevlRno(e);
    if (!inRoomsShopbaseRoomnos(g, x, y).includes(shopR)) return false;
    return true;
}

/**
 * C: shk.c **`repair_damage(shkp, tmp_dam, TRUE)`** subset for **`fix_shop_damage`** catch-up:
 * **`LANDMINE`/`BEAR_TRAP`** → **`mksobj`/`mpickobj`** then **`deltrap`**; wall/door restore with
 * **`litter_getpos`/`litter_scatter`**, **`block_point`** (**`vision_recalc`**), **`litter_newsyms`**.
 * Omits **`picking_at`**, **`pline`** messages (**`catchup`** TRUE); defers if floor objects at **`(x,y)`**.
 * @returns {boolean} whether damage entry should be discarded (**C non-zero **`repair_damage`**).
 */
function repairDamageCatchup(g, shkp, dam) {
    if (!repairableDamage(g, shkp, dam)) return false;
    const x = dam.x | 0;
    const y = dam.y | 0;
    const loc = g.level?.at(x, y);
    if (!loc) return false;

    const heads = g.level?.floorObjHeads;
    if (heads?.get(floorObjKey(x, y))) return false;

    let disposition = 1;
    const ttmp = trapAtIn(g, x, y);
    if (ttmp) {
        const tt = ttmp.ttyp | 0;
        if (tt === LANDMINE || tt === BEAR_TRAP) {
            const otmp = mksobjTrapObjForShopRepair(g, tt);
            mpickobjShk(g, shkp, otmp);
        }
        delTrapIn(g, ttmp);
        delEngrAt(x, y);
        if (cansee(x, y)) newsym(x, y);
        disposition = 3;
    }

    const savedTyp = dam.typ | 0;
    const curTyp = loc.typ | 0;
    const curMask = loc.doormask | 0;
    if (IS_ROOM(savedTyp) || (savedTyp === curTyp && (!IS_DOOR(savedTyp) || curMask > D_BROKEN))) {
        return disposition !== 0;
    }

    loc.typ = savedTyp;
    if (IS_DOOR(savedTyp)) loc.doormask = D_CLOSED;
    else loc.flags = dam.flags | 0;

    const litter = new Array(9).fill(0);
    if (litterGetposShopRepair(g, litter, x, y, shkp) > 0) {
        litterScatterShopRepair(g, litter, x, y, shkp);
    }
    delEngrAt(x, y);
    if (cansee(x, y)) {
        newsym(x, y);
        if (IS_WALL(savedTyp)) loc.seenv = SVALL;
    }
    repairBlockPoint(g, x, y);
    litterNewsymsRepair(litter, x, y);
    vision_recalc(1);

    return disposition !== 0;
}

/**
 * C: shk.c add_damage(x, y, cost) — door entrance check; **`damagelist`** merge; **`seenv`** if **`cansee`**.
 * @param {import('./gstate.js').game} g
 * @param {number} x
 * @param {number} y
 * @param {number} cost
 */
export function addDamageAt(g, x, y, cost) {
    /* C: shk.c **`add_damage`** — defer new **`damagelist`** rows while **`leaving_tutorial`**. */
    if (contextLeavingTutorialActiveLikeC(g)) return;
    const loc = g.level?.at(x | 0, y | 0);
    if (!loc) return;
    if (IS_DOOR(loc.typ)) {
        const rnos = inRoomsShopbaseRoomnos(g, x, y);
        let matched = false;
        for (let i = 0; i < rnos.length; i++) {
            const roomno = rnos[i];
            const mtmp = shopKeeperForLevlRoomno(g, roomno);
            const e = ESHK(mtmp);
            const sx = e?.shd?.x;
            const sy = e?.shd?.y;
            if (mtmp && e && (sx | 0) === (x | 0) && (sy | 0) === (y | 0)) {
                matched = true;
                break;
            }
        }
        if (!matched) return;
    }
    const lvl = g.level;
    if (!lvl) return;
    if (!lvl.damagelist) lvl.damagelist = [];
    const list = lvl.damagelist;
    const when = g.moves ?? 0;
    const ex = list.find((d) => (d.x | 0) === (x | 0) && (d.y | 0) === (y | 0));
    if (ex) {
        ex.cost = (ex.cost | 0) + (cost | 0);
        ex.when = when;
    } else {
        list.push({
            x: x | 0,
            y: y | 0,
            cost: cost | 0,
            when,
            typ: loc.typ | 0,
            flags: loc.flags | 0,
        });
    }
    if (cansee(x | 0, y | 0)) loc.seenv = SVALL;
}

/**
 * C: zap.c zap_over_floor — **`if (*in_rooms(…,SHOPBASE))`** **`add_damage`** before **`lev->doormask`**.
 * @param {import('./gstate.js').game} g
 * @param {number} x
 * @param {number} y
 * @param {number} type
 * @param {{ value?: boolean }|null} shopdamage
 */
export function applyZapShopDoorDamage(g, x, y, type, shopdamage) {
    const rnos = inRoomsShopbaseRoomnos(g, x, y);
    if (rnos.length === 0) return;
    if ((type | 0) >= 0) {
        addDamageAt(g, x, y, SHOP_DOOR_COST);
        if (shopdamage) shopdamage.value = true;
    } else {
        addDamageAt(g, x, y, 0);
    }
}

/**
 * C: shk.c **`fix_shop_damage()`** — on restore, each unimpaired in-shop shk **`repair_damage(..., TRUE)`**
 * on **`level.damagelist`** entries (**`discard_damage_struct`**).
 * @param {import('./gstate.js').game} [g]
 */
export function fixShopDamage(g = game) {
    const list = g.level?.damagelist;
    if (!list?.length) return;
    /* C: shk.c **`fix_shop_damage`** — defer catch-up while tutorial exit housekeeping ( **`leaving_tutorial`** ). */
    if (contextLeavingTutorialActiveLikeC(g)) return;

    const monsters = g.level?.monsters ?? [];
    for (const shkp of monsters) {
        if (!(shkp.isshk | 0)) continue;
        if (shkImpaired(g, shkp)) continue;
        for (let i = list.length - 1; i >= 0; i--) {
            const damg = list[i];
            if (repairDamageCatchup(g, shkp, damg)) list.splice(i, 1);
        }
    }
}

/** C: **`hack.h`** **`PL_NSIZ`** — customer string cap. */
const PL_NSIZ_PAY = 36;
/** C: **`monflag.h`** **`MS_ANIMAL`**. */
const MS_ANIMAL_SHK = 17;
/** C: **`monflag.h`** **`MS_HUMANOID`**. */
const MS_HUMANOID_SHOPDIG = 25;
/** C: **`objects.h`** **`LEASH`** otyp. */
const OTYP_LEASH_SHOPDIG = 237;
/** C: **`role.c`** **`PM_KNIGHT`** / **`urole`** — JS **`roles[]`** Knight **`mnum`**. */
const PM_KNIGHT_MNUM_SHOPDIG = 4;

/** C: **`hack.c`** `*u.ushops` non-empty ⇒ hero occupies at least one **`SHOPBASE`** room (**`in_rooms`**). */
export function heroInShopOccupancyLikeUshops(g) {
    const u = g.u;
    if (!u) return false;
    return inRoomsShopbaseRoomnos(g, u.ux | 0, u.uy | 0).length > 0;
}

/**
 * C: **`dokick.c`** **`ship_object`** — **`stolen_value(..., peaceful, FALSE)`** for **`shop_floor_obj`**
 * without **`unpaid`**: **`costly_spot(u.ux,u.uy) && strchr(u.urooms, *in_rooms(ox,oy,SHOPBASE))`**.
 * JS approximates **`strchr(u.urooms, …)`** by membership of the first **`SHOPBASE`** **`roomno`**
 * at **`(ox,oy)`** in **`in_rooms`**’s list for the hero tile (**`SHARED`** expansion matches **`inRoomsShopbaseRoomnos`**).
 * @param {import('./gstate.js').game} g
 * @param {number} objOx — C **`otmp->ox`**
 * @param {number} objOy — C **`otmp->oy`**
 */
export function peacefulStolenValueShipObjectShopFloorLikeC(g, objOx, objOy) {
    if (contextLeavingTutorialActiveLikeC(g)) return false;
    const u = g.u;
    if (!u) return false;
    if (!costlySpot(g, u.ux | 0, u.uy | 0)) return false;
    const atObj = inRoomsShopbaseRoomnos(g, objOx | 0, objOy | 0);
    if (!atObj.length) return false;
    const first = atObj[0] | 0;
    const atHero = inRoomsShopbaseRoomnos(g, u.ux | 0, u.uy | 0);
    return atHero.includes(first);
}

/**
 * C: **`hack.c`** **`move_update`** — **`Strcpy(u.ushops0, u.ushops)`** before **`u.ux`/`u.uy`** advance.
 * Call immediately **before** any hero square change so **`dothrow.c`** **`check_shop_obj`** can use **`u.ushops0`**.
 * @param {import('./gstate.js').game} g
 */
export function snapshotUshops0FromHeroTileLikeC(g) {
    const u = g.u;
    if (!u) return;
    const r = inRoomsShopbaseRoomnos(g, u.ux | 0, u.uy | 0);
    u.ushops0 = r.length ? [...r] : [];
}

function shopdigPickShkpLikeC(g) {
    const u = g.u;
    if (!u) return null;
    const rnos = inRoomsShopbaseRoomnos(g, u.ux | 0, u.uy | 0);
    if (!rnos.length) return null;
    return shopKeeperForLevlRoomno(g, rnos[0] | 0);
}

function heroDeafShopdig(g) {
    return (g.u?.timed?.deaf ?? 0) > 0;
}

/** C: **`attrib.c`** **`adjalign(-sgn(u.ualign.type))`** — negative **`record`/`abuse`** subset. */
function adjalignSgnUalignTypeShopdig(g) {
    const u = g.u;
    if (!u) return;
    const t = u.ualign?.type ?? 0;
    const sgn = t > 0 ? 1 : t < 0 ? -1 : 0;
    const n = -sgn;
    if (!n) return;
    u.ualign = u.ualign || { type: 0, record: 0, abuse: 0 };
    const rec = u.ualign.record | 0;
    const newalign = rec + n;
    if (newalign < rec) u.ualign.record = newalign;
    const newabuse = (u.ualign.abuse | 0) - n;
    if (newabuse > (u.ualign.abuse | 0)) u.ualign.abuse = newabuse;
}

/** C: **`you.h`** **`m_next2u`** — **`distu(mtmp->mx, mtmp->my) <= 2`**. */
function mNext2uShopdig(g, mtmp) {
    const u = g.u;
    if (!u || !mtmp) return false;
    return dist2(mtmp.mx | 0, mtmp.my | 0, u.ux | 0, u.uy | 0) <= 2;
}

/**
 * C: **`mon.c`** **`mnexto(shkp, RLOC_MSG)`** near hero (**`enexto`**, **`deal_with_overcrowding`**).
 * @param {import('./gstate.js').game} g
 */
async function mnextoShkForShopdigLikeC(g, shkp) {
    const u = g.u;
    if (!u || !shkp) return;
    if (shkp === u.usteed) {
        shkp.mx = u.ux | 0;
        shkp.my = u.uy | 0;
        return;
    }
    const dest = enextoNearMon(g, u.ux | 0, u.uy | 0, shkp);
    if (!dest) {
        await dealWithOvercrowding(g, shkp);
        return;
    }
    const ox = shkp.mx | 0;
    const oy = shkp.my | 0;
    shkp.mx = dest.x | 0;
    shkp.my = dest.y | 0;
    newsym(ox, oy);
    newsym(shkp.mx, shkp.my);
}

/**
 * C: **`shk.c`** **`shopdig(fall)`** — digging in shop (**`fall` 0**) or floor gives way (**`fall` 1** pack snatch).
 * @param {import('./gstate.js').game} g
 * @param {number} fall
 */
export async function shopdigLikeC(g, fall) {
    if (contextLeavingTutorialActiveLikeC(g)) return;
    const shkp = shopdigPickShkpLikeC(g);
    if (!shkp) return;

    const shkPtr = raceptr(shkp);
    const ms = shkPtr?.msound ?? 0;

    let lang = 0;
    if (helplessShk(shkp) || ms === 0) {
        /* lang 0 */
    } else if (ms <= MS_ANIMAL_SHK) {
        lang = 1;
    } else if (ms >= MS_HUMANOID_SHOPDIG) {
        lang = 2;
    }

    if (!fall) {
        if (lang === 2 && !heroDeafShopdig(g) && !muteshkShk(shkp)) {
            const female = !!(g.flags?.female);
            const honor = female ? 'madam' : 'sir';
            const cap = female ? 'Madam' : 'Sir';
            if ((g.u?.utraptype | 0) === TT_PIT) {
                await pline(
                    `${shknamDisplay(shkp)} shouts: "Be careful, ${honor}, or you might fall through the floor."`,
                );
            } else {
                await pline(`${shknamDisplay(shkp)} shouts: "${cap}, do not damage the floor here!"`);
            }
        }
        if ((g.urole?.mnum | 0) === PM_KNIGHT_MNUM_SHOPDIG) {
            await pline('You feel like a common thief.');
            adjalignSgnUalignTypeShopdig(g);
        }
        return;
    }

    if (!inHishop(g, shkp)) {
        if ((g.urole?.mnum | 0) === PM_KNIGHT_MNUM_SHOPDIG) {
            await pline('You feel like a common thief.');
            adjalignSgnUalignTypeShopdig(g);
        }
        return;
    }

    const e = ESHK(shkp);
    const billOrDebit = eshkBillCountForNextShkp(e) > 0 || (e?.debit | 0) > 0;
    if (umDistHero(g, shkp.mx | 0, shkp.my | 0, 5) || helplessShk(shkp) || !billOrDebit) return;

    let grabs = 'grabs';
    if (nolimbs(shkPtr)) grabs = 'knocks off';

    if (!mNext2uShopdig(g, shkp)) {
        await mnextoShkForShopdigLikeC(g, shkp);
        if (!mNext2uShopdig(g, shkp)) {
            if (lang === 2) {
                await pline(`${shknamDisplay(shkp)} curses you in anger and frustration!`);
            } else if (lang === 1) {
                await pline(`${shknamDisplay(shkp)} growls.`);
            }
            rileShkMinimal(shkp);
            return;
        }
        const loco = locomotion(shkPtr, 'leap');
        const locoPlural = loco.endsWith('s') ? loco : `${loco}s`;
        await pline(`${shknamDisplay(shkp)} ${locoPlural}, and ${grabs} your backpack!`);
    } else {
        await pline(`${shknamDisplay(shkp)} ${grabs} your backpack!`);
    }

    const u = g.u;
    if (!u) return;
    const wMask = ~(W_SWAPWEP | W_QUIVER);
    for (let obj = g.invent, obj2; obj; obj = obj2) {
        obj2 = obj.nobj;
        if (((obj.owornmask | 0) & wMask) !== 0) continue;
        if (obj === u.uswapwep && u.twoweap) continue;
        if ((obj.otyp | 0) === OTYP_LEASH_SHOPDIG && (obj.leashmon | 0)) continue;

        removeObjFromHeroInvent(g, obj);
        subOneFromBill(obj, shkp);
        mpickobjShk(g, shkp, obj);
    }
}

/** C: **`apply.c`** **`um_dist(x, y, n)`** — hero farther than **`n`** on x or y axis. */
function umDistHero(g, x, y, n) {
    const ux = g.u?.ux | 0;
    const uy = g.u?.uy | 0;
    return Math.abs(ux - (x | 0)) > n || Math.abs(uy - (y | 0)) > n;
}

export function shknamDisplay(shkp) {
    return shkp?.monnam || shkp?.data?.mname || 'The shopkeeper';
}

function muteshkShk(shkp) {
    if (helplessShk(shkp)) return true;
    const ms = shkp?.data?.msound ?? 0;
    return (ms | 0) <= MS_ANIMAL_SHK;
}

/** C: **`shk.c`** **`rile_shk`** — angry + surcharge flag (**`bill`** price loop not ported). */
function rileShkMinimal(shkp) {
    shkp.mpeaceful = 0;
    const e = ESHK(shkp);
    if (e) e.surcharge = 1;
}

/**
 * C: **`shk.c`** **`hot_pursuit`** — **`rile_shk`**, customer, **`following`**;
 * omits **`clear_no_charge`** / **`clear_no_charge_pets`**.
 * @param {import('./gstate.js').game} g
 */
export async function hotPursuitShk(g, shkp) {
    if (contextLeavingTutorialActiveLikeC(g)) return;
    if (!(shkp?.isshk | 0)) return;
    rileShkMinimal(shkp);
    const e = ESHK(shkp);
    const pn = g.plname ? String(g.plname) : 'Player';
    if (e) {
        e.customer = pn.slice(0, PL_NSIZ_PAY);
        e.following = 1;
    }
}

/** C: **`decl.c`/`allmain.c`** **`gh.hero_seq`** — **`moves << 3`** (**no per-submove `++`** yet). */
export function heroSeqLikeC(g) {
    return (g.moves | 0) << 3;
}

/** C: **`invent.c`** **`currency(amount)`** — hallucination picks random unit name. */
export function currencyAmountLikeC(g, amount) {
    const n = amount | 0;
    const halluc = !!(g.u?.Hallucination | 0);
    const currencies = [
        'zorkmid',
        'gold coin',
        'dollar',
        'yen',
        'wolfram',
        'credit',
        'ducat',
        'peso',
        'florin',
        'mark',
        'schilling',
        'zloty',
        'dirham',
        'forint',
        'tenga',
        'shekel',
        'newt',
        'wen',
        'hongzhou dollar',
        'Koku',
        'Crumb',
        'Penny',
        'Fleury',
        'Bolt',
        'Milicent',
        'Gold piece',
        'Solaris',
        'Joule',
        'Credit',
        'Galleon',
        'Pence',
        'Lira',
        'Ankh-Morpork dollar',
        'royal jelly',
        'Au',
        'Ducaton',
        'Drachma',
        'Beebz',
        'Gil',
        'Galactic Credit',
        'Triganic Pu',
        'woolong',
        'zorkmid',
    ];
    let w = 'zorkmid';
    if (halluc) w = currencies[rnd(currencies.length)] ?? 'zorkmid';
    return n === 1 ? w : `${w}s`;
}

/** C: hack.h **`plur(n)`** — **`""`** vs **`"s"`** (whistle line in **`angry_guards`**). */
function plurS(n) {
    return (n | 0) === 1 ? '' : 's';
}

/** C: **`Sprintf(buf, "guard%s", plur(n))`** — **`guard`** / **`guards`**. */
function angryGuardsGuardBufLikeC(n) {
    return (n | 0) === 1 ? 'guard' : 'guards';
}

/** C: **`monflag.h`** **`M1_MINDLESS`** — **`display.h`** **`tp_sensemon`** only (JS **`M1_HIDE`** reuses another value; do not use **`is_hider`** here). */
const M1_MINDLESS_TELEPATHY = 0x00010000;

/**
 * C: **`youprop.h`** / **`attrib.c`** — hero blind for telepathy (**`Blind`**).
 * @param {import('./gstate.js').game['u']|null|undefined} u
 */
function heroBlindTelepathyGateLikeC(u) {
    return !!(u?.ublind || (u?.timed?.blind ?? 0) > 0);
}

/**
 * C: **`display.h`** **`_tp_sensemon`** — **`!mindless`** and blind vs unblind extrinsic telepathy range.
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
function tpSenseMonAngryGuardsLikeC(g, mtmp) {
    const ptr = raceptr(mtmp);
    if (((ptr?.mflags1 ?? 0) & M1_MINDLESS_TELEPATHY) !== 0) return false;
    const u = g.u;
    if (!u) return false;
    const HT = (u.HTelepat | 0) !== 0;
    const ET = (u.ETelepat | 0) !== 0;
    const blind = heroBlindTelepathyGateLikeC(u);
    if (blind) return HT || ET;
    if (!ET) return false;
    const lim = (u.unblind_telepat_range | 0) || (BOLT_LIM * BOLT_LIM);
    return dist2(u.ux | 0, u.uy | 0, mtmp.mx | 0, mtmp.my | 0) <= lim;
}

/**
 * C: **`context.h`** **`warntype_info`** — **`svc.context.warntype`** fields **`obj`**, **`polyd`**, **`species`**.
 * @param {import('./gstate.js').game} g
 */
function ensureContextWarntypeLikeC(g) {
    const c = g.context || (g.context = {});
    if (!c.warntype) {
        c.warntype = { obj: 0, polyd: 0, species: null, speciesidx: -1 };
    }
    return c.warntype;
}

/**
 * C: **`hack.h`** **`MATCH_WARN_OF_MON(mon)`** with **`youprop.h`** **`Warn_of_mon`** (**`HWarn_of_mon || EWarn_of_mon`**).
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
function matchWarnOfMonAngryGuardsLikeC(g, mtmp) {
    const u = g.u;
    if (!u || !mtmp) return false;
    if (((u.HWarn_of_mon | 0) | (u.EWarn_of_mon | 0)) === 0) return false;
    const ptr = raceptr(mtmp);
    const wt = ensureContextWarntypeLikeC(g);
    if (wt.species && ptr && wt.species === ptr) return true;
    const m2 = ptr?.mflags2 | 0;
    if ((wt.obj | 0) & m2) return true;
    if ((wt.polyd | 0) & m2) return true;
    return false;
}

/**
 * C: **`display.h`** **`_sensemon`** — swallow / underwater pool gate + **`Detect_monsters`** + **`tp_sensemon`** + **`MATCH_WARN_OF_MON`**.
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
function senseMonAngryGuardsLikeC(g, mtmp) {
    const u = g.u;
    if (!u || !mtmp) return false;
    if ((u.uswallow | 0) && u.ustuck !== mtmp) return false;
    if ((u.underwater | 0) !== 0) {
        const mx = mtmp.mx | 0;
        const my = mtmp.my | 0;
        const loc = g.level?.at(mx, my);
        const poolHere = loc ? IS_POOL(loc.typ | 0) : false;
        if (!(dist2(u.ux | 0, u.uy | 0, mx, my) <= 2 && poolHere)) return false;
    }
    const HDet = (u.HDetect_monsters | 0) !== 0;
    const EDet = (u.EDetect_monsters | 0) !== 0;
    return !!(
        HDet ||
        EDet ||
        tpSenseMonAngryGuardsLikeC(g, mtmp) ||
        matchWarnOfMonAngryGuardsLikeC(g, mtmp)
    );
}

/**
 * C: **`display.h`** **`_canseemon`** worm omitted — **`mon_visible`** (**`mundetected`**, invis vs **`See_invisible`**, **`cansee`**).
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
function canseemonAngryGuardsLikeC(g, mtmp) {
    const u = g.u;
    if (!u || !mtmp) return false;
    if (u.usteed === mtmp) return true;
    if ((mtmp.mundetected | 0) !== 0) return false;
    if ((mtmp.minvis | 0) && !(u.See_invisible | 0)) return false;
    const mx = mtmp.mx | 0;
    const my = mtmp.my | 0;
    if (cansee(mx, my)) return true;
    const ptr = raceptr(mtmp);
    /* C: **`monflag.h`** **`M3_INFRAVISIBLE`** (**`0x0200`**) + **`youprop.h`** **`Infravision`**. */
    if (
        !heroBlindTelepathyGateLikeC(u) &&
        (u.Infravision | 0) &&
        ((ptr?.mflags3 ?? 0) & 0x0200) !== 0 &&
        couldsee(mx, my)
    ) {
        return true;
    }
    return false;
}

/** C: **`display.h`** **`canspotmon(mon)`** — **`canseemon(mon) || sensemon(mon)`**. */
function canspotMonAngryGuardsLikeC(g, mtmp) {
    return canseemonAngryGuardsLikeC(g, mtmp) || senseMonAngryGuardsLikeC(g, mtmp);
}

/** C: **`mon.c`** **`mcanmove`** gate for anger/adjacency counts — **`mcanmove`** false only when explicitly **0**. */
function mcanmoveMonsterAngryGuardsLikeC(mtmp) {
    const mv = mtmp.mcanmove;
    if (mv === undefined || mv === null) return true;
    return (mv | 0) !== 0;
}

/**
 * C: **`mon.c`** **`angry_guards(silent)`** — peaceful **`is_watch`** watchmen become hostile; plines unless **`silent`** (**`Deaf`**).
 * **`Soundeffect`** → **`soundeffectStubLikeC`** (**`display.js`**, no audio in fork). **`canspotmon`** (**`canseemon`**: **`mundetected`**, invis, **`cansee`** / infravision stub; **`sensemon`**: swallow, underwater pool, **`Detect_monsters`**, **`tp_sensemon`**, **`MATCH_WARN_OF_MON`** via **`g.context.warntype`**); whistle line via **`youHearLikeC`** (**`You_hear`**). Wake / get / approach phrasing matches C **`plur`** + **`vtense`** on **`guard`/`guards`**.
 * @returns {boolean} true if any watchman existed (C return after **`ct`**).
 */
export async function angryGuardsSilentLikeC(g, silent) {
    const u = g?.u;
    if (!u) return false;
    /* C: mon.c **`angry_guards`** — defer watchmen wake while **`leaving_tutorial`**. */
    if (contextLeavingTutorialActiveLikeC(g)) return false;
    let ct = 0;
    let nct = 0;
    let sct = 0;
    let slct = 0;
    const mons = g.level?.monsters ?? [];
    for (let i = 0; i < mons.length; i++) {
        const mtmp = mons[i];
        if ((mtmp.mhp | 0) <= 0) continue;
        if (!isWatchMonsterLikeC(mtmp)) continue;
        if (!(mtmp.mpeaceful | 0)) continue;
        ct++;
        if (canspotMonAngryGuardsLikeC(g, mtmp) && mcanmoveMonsterAngryGuardsLikeC(mtmp)) {
            if (mNext2uShopdig(g, mtmp)) nct++;
            else sct++;
        }
        if ((mtmp.msleeping | 0) || (mtmp.mfrozen | 0)) {
            slct++;
            mtmp.msleeping = 0;
            mtmp.mfrozen = 0;
        }
        mtmp.mpeaceful = 0;
    }
    if (!ct) return false;
    if (!silent) {
        if (slct) {
            const buf = angryGuardsGuardBufLikeC(slct);
            const v = slct === 1 ? 'wakes' : 'wake';
            await pline(`The ${buf} ${v} up.`);
        }
        if (nct) {
            const buf = angryGuardsGuardBufLikeC(nct);
            const v = nct === 1 ? 'gets' : 'get';
            await pline(`The ${buf} ${v} angry!`);
        } else if (sct) {
            if (sct === 1) await pline('An angry guard is approaching!');
            else await pline('Angry guards are approaching!');
        } else {
            await soundeffectStubLikeC(g, 0, 100);
            const poss = ct === 1 ? "a guard's" : "guards'";
            await youHearLikeC(`You hear the shrill sound of ${poss} whistle${plurS(ct)}.`);
        }
    }
    return true;
}

/**
 * C: **`shk.c`** **`make_angry_shk`** — merge pending bill/debit/loan/credit into **`robbed`**, **`setpaid`** stub, pline, **`hot_pursuit`**.
 * @param {import('./gstate.js').game} g
 */
export async function makeAngryShkLikeC(g, shkp, ox, oy) {
    if (contextLeavingTutorialActiveLikeC(g)) return;
    void ox;
    void oy;
    const e = ESHK(shkp);
    if (!e || !(shkp?.isshk | 0)) return;
    const debit = e.debit | 0;
    const loan = e.loan | 0;
    const credit = e.credit | 0;
    const billct = e.billct | 0;
    if (billct || debit || loan || credit) {
        /** C: **`addupbill`** — stub **0** until full **`ibill`/`bill_p`** port. */
        const addup = 0;
        e.robbed = Math.max(0, (e.robbed | 0) + addup + debit + loan - credit);
        e.debit = 0;
        e.loan = 0;
        e.credit = 0;
        e.billct = 0;
        if (Array.isArray(e.bill)) e.bill.length = 0;
    }
    const wasCalm = !!(shkp.mpeaceful | 0);
    await pline(`${shknamDisplay(shkp)} ${wasCalm ? 'gets angry' : 'is furious'}!`);
    await hotPursuitShk(g, shkp);
}

/**
 * C: **`shk.c`** **`subfrombill`** — recursive **`sub_one_frombill`** over **`cobj`** (skips **`COIN_CLASS`** children like C).
 * @param {import('./gstate.js').game} g
 */
function subfrombillLikeC(g, obj, shkp) {
    void g;
    subOneFromBill(obj, shkp);
    if (!Has_contents(obj)) return;
    for (let otmp = obj.cobj; otmp; otmp = otmp.nobj) {
        if ((otmp.oclass | 0) === NH5_COIN_CLASS) continue;
        if (Has_contents(otmp)) subfrombillLikeC(g, otmp, shkp);
        else subOneFromBill(otmp, shkp);
    }
}

/** C: **`shk.c`** **`money_cnt(mtmp->minvent)`** — gold **`quan`** sum. */
function moneyCntMinventShk(shkp) {
    let n = 0;
    for (let o = shkp?.minvent; o; o = o.nobj) {
        if ((o.oclass | 0) === NH5_COIN_CLASS) n += o.quan | 0;
    }
    return n;
}

/** C: **`shk.c`** deduct gold from **`minvent`** (**`COIN_CLASS`** chain) — subset for **`sellobj`** pay. */
function deductGoldFromShkMinventLikeC(shkp, amt) {
    let need = amt | 0;
    if (need <= 0 || !shkp) return;
    while (need > 0) {
        let prev = /** @type {object | null} */ (null);
        let o = shkp.minvent ?? null;
        let progressed = false;
        while (o) {
            if ((o.oclass | 0) === NH5_COIN_CLASS) {
                progressed = true;
                const q = o.quan | 0;
                if (q <= need) {
                    need -= q;
                    const nx = o.nobj ?? null;
                    if (prev) prev.nobj = nx;
                    else shkp.minvent = nx;
                    o.nobj = null;
                } else {
                    o.quan = q - need;
                    need = 0;
                }
                break;
            }
            prev = o;
            o = o.nobj;
        }
        if (!progressed) break;
    }
}

/**
 * C: **`shk.c`** **`donate_gold(gltmp, shkp, selling)`** — **`debit`/`loan`/`credit`** + plines.
 * @param {boolean} selling — C **`selling`** (**`TRUE`** = dropped in shop; **`FALSE`** kicked in, unused here).
 */
async function donateGoldLikeC(g, gltmp, shkp, selling) {
    const e = ESHK(shkp);
    if (!e) return;
    const gl = gltmp | 0;
    if (gl <= 0) return;
    const debit = e.debit | 0;
    if (debit >= gl) {
        const loan = e.loan | 0;
        if (loan) {
            if (loan > gl) e.loan = loan - gl;
            else e.loan = 0;
        }
        e.debit = debit - gl;
        await pline(`Your debt is ${e.debit ? 'partially ' : ''}paid off.`);
        return;
    }
    const delta = gl - debit;
    e.credit = (e.credit | 0) + delta;
    if (debit) {
        e.debit = 0;
        e.loan = 0;
        await pline('Your debt is paid off.');
    }
    const cred = e.credit | 0;
    if (cred === delta) {
        await pline(
            `You have ${selling ? '' : 're-'}established ${delta} ${currencyAmountLikeC(g, delta)} credit.`,
        );
    } else {
        await pline(
            `${delta} ${currencyAmountLikeC(g, delta)} added${selling ? '' : ' back'} to your credit; total is now ${cred} ${currencyAmountLikeC(g, cred)}.`,
        );
    }
}

/**
 * C: **`shk.c`** **`sellobj`** subset for **`dothrow.c`** **`check_shop_obj`** (**`!unpaid`**, costly same-shop floor).
 * Omits **`ynaq`**, **`dropped_container`**, bones **`robbed`**, **`SPECIAL_STOCK`**.
 */
async function sellobjCheckShopMinLikeC(g, obj, _x, _y, shkp) {
    void _x;
    void _y;
    if (contextLeavingTutorialActiveLikeC(g)) return;
    if (!shkp || !obj) return;
    shkp.msleeping = 0;
    if (shkpAngry(shkp)) {
        subfrombillLikeC(g, obj, shkp);
        await pline(`${shknamDisplay(shkp)} smirks with satisfaction.`);
        return;
    }
    const isgold = (obj.oclass | 0) === NH5_COIN_CLASS;
    const container = Has_contents(obj);
    let gltmp = container ? containedGold(obj, true) : 0;
    const cgold = gltmp > 0;
    let cltmp = 0;
    if (container) cltmp = containedCostStolenBury(g, obj, shkp, 0, true, false);
    const saleitem = saleableLikeC(g, shkp, obj);
    let ltmp = 0;
    if (!isgold && !(obj.unpaid | 0) && saleitem) ltmp = setCostLikeC(g, obj, shkp);
    const offer = ltmp + cltmp;

    if (isgold || cgold) {
        if (!cgold) gltmp = Math.max(0, obj.quan | 0);
        await donateGoldLikeC(g, gltmp, shkp, true);
        if (!offer) {
            subfrombillLikeC(g, obj, shkp);
            if (!isgold && !(obj.unpaid | 0)) obj.no_charge = 1;
            return;
        }
    }

    if (!(isgold || cgold) && offer + gltmp === 0) {
        obj.no_charge = 1;
        await pline(`${shknamDisplay(shkp)} seems uninterested.`);
        return;
    }

    if (offer > 0) {
        const shkmoney = moneyCntMinventShk(shkp);
        const pay = Math.min(offer, shkmoney);
        if (pay > 0) {
            g._goldCount = (g._goldCount | 0) + pay;
            deductGoldFromShkMinventLikeC(shkp, pay);
            await pline(`${shknamDisplay(shkp)} pays you ${currencyAmountLikeC(g, pay)}.`);
        } else {
            const e = ESHK(shkp);
            const tmpcr = Math.trunc((offer * 9) / 10) + (offer <= 1 ? 1 : 0);
            if (e) e.credit = (e.credit | 0) + tmpcr;
            await pline(
                `${shknamDisplay(shkp)} cannot pay you at present; you accept ${tmpcr} ${currencyAmountLikeC(g, tmpcr)} in credit.`,
            );
        }
        subfrombillLikeC(g, obj, shkp);
        return;
    }

    obj.no_charge = 1;
    await pline(`${shknamDisplay(shkp)} seems uninterested.`);
}

/**
 * C: **`dothrow.c`** **`check_shop_obj(obj, x, y, broken)`** (**`u.ushops`** keeper via **`shopdigPickShkpLikeC`**).
 * Outer test uses **`*in_rooms(x,y,SHOPBASE) != *u.ushops`** (first SHOPBASE roomno vs hero’s first); inner adds **`u.ushops0`** (**`dothrow.c`** comment).
 * @param {import('./gstate.js').game} g
 * @param {boolean} broken — C **`broken`**
 */
export async function checkShopObjLikeC(g, obj, x, y, broken) {
    const xh = x | 0;
    const yh = y | 0;
    if (!g.u || !obj) return;
    /* C: **`dothrow.c`** / **`shk.c`** — defer shop-object billing while **`leaving_tutorial`**. */
    if (contextLeavingTutorialActiveLikeC(g)) return;
    const shkp = shopdigPickShkpLikeC(g);
    if (!shkp) return;

    const costly = costlySpot(g, xh, yh);
    const heroR = inRoomsShopbaseRoomnos(g, g.u.ux | 0, g.u.uy | 0);
    const landR = inRoomsShopbaseRoomnos(g, xh, yh);
    const prevR = Array.isArray(g.u.ushops0) ? g.u.ushops0 : [];
    /** C: **`*in_rooms(...,SHOPBASE)`** / **`*u.ushops`** — first encoded shop room letter; empty ⇒ **`-1`**. */
    const enc = (/** @type {number[]} */ a) => (a.length ? a[0] : -1);
    const encLand = enc(landR);
    const encHero = enc(heroR);
    const encPrev = enc(prevR);

    if (broken || !costly || encLand !== encHero) {
        if (obj.unpaid | 0) {
            await stolenValueMerchBurySilent(g, obj, g.u.ux | 0, g.u.uy | 0, shkp, false);
        }
        if (broken) obj.no_charge = 1;
        return;
    }

    if (costly && (encLand === encHero || encLand === encPrev)) {
        if (obj.unpaid | 0) {
            const gtg = Has_contents(obj) ? containedGold(obj, true) : 0;
            subfrombillLikeC(g, obj, shkp);
            if (gtg > 0) await donateGoldLikeC(g, gtg, shkp, true);
        } else if (xh !== (shkp.mx | 0) || yh !== (shkp.my | 0)) {
            await sellobjCheckShopMinLikeC(g, obj, xh, yh, shkp);
        }
    }
}

/**
 * C: **`dothrow.c`** after **`place_object`** (missile lands / **`drop`**) —
 * **`if ((*u.ushops || obj->unpaid) && obj != uball) check_shop_obj(obj, x, y, FALSE);`**
 * @param {import('./gstate.js').game} g
 */
export async function checkShopObjAfterHeroPlaceLikeC(g, obj, x, y) {
    const u = g.u;
    if (!u || !obj) return;
    if (obj === g.uball) return;
    if (!(heroInShopOccupancyLikeUshops(g) || (obj.unpaid | 0))) return;
    await checkShopObjLikeC(g, obj, x | 0, y | 0, false);
}

/** C: **`dothrow.c`** **`check_shop_obj(obj, x, y, TRUE)`** — delegates to **`checkShopObjLikeC(..., true)`**. */
export async function checkShopObjBrokenTrueLikeC(g, obj, x, y) {
    await checkShopObjLikeC(g, obj, x | 0, y | 0, true);
}

/**
 * C: **`dothrow.c`** **`breakobj`** floor + **`hero_caused`** shop tail (**`check_shop_obj`** invent/unpaid / floor).
 * @param {import('./gstate.js').game} g
 * @param {boolean} fromInvent — C **`from_invent`**
 */
export async function breakobjHeroShopFloorTailLikeC(g, obj, x, y, fromInvent) {
    const u = g.u;
    if (!u) return;
    if (contextLeavingTutorialActiveLikeC(g)) return;

    if ((fromInvent || (obj.unpaid | 0)) && (heroInShopOccupancyLikeUshops(g) || (obj.unpaid | 0))) {
        await checkShopObjBrokenTrueLikeC(g, obj, x | 0, y | 0);
        return;
    }

    if ((obj.no_charge | 0) || !costlySpot(g, x | 0, y | 0)) return;

    const rnosObj = inRoomsShopbaseRoomnos(g, x | 0, y | 0);
    if (!rnosObj.length) return;
    const shkp = shopKeeperForLevlRoomno(g, rnosObj[0] | 0);
    if (!shkp) return;

    const e = ESHK(shkp);
    if (!e) return;

    const hs = heroSeqLikeC(g);
    if (e.break_seq === undefined) e.break_seq = -1;
    if (hs !== (e.break_seq | 0)) {
        e.seq_peaceful = !!(shkp.mpeaceful | 0);
    }

    const billingPeaceful = !!(e.seq_peaceful | 0);
    const stolenVal = await stolenValueMerchBurySilent(
        g, obj, x | 0, y | 0, shkp, false, billingPeaceful,
    );

    const rHeroList = inRoomsShopbaseRoomnos(g, u.ux | 0, u.uy | 0);
    const rHero = rHeroList[0] ?? -1;
    const rObj = rnosObj[0] | 0;
    const heroInsideShop = insideShopLevlRoomno(g, u.ux | 0, u.uy | 0) !== NO_ROOM;
    const mismatchOrOutside = rObj !== (rHero | 0) || !heroInsideShop;

    if (stolenVal > 0 && mismatchOrOutside && hs !== (e.break_seq | 0)) {
        await makeAngryShkLikeC(g, shkp, x | 0, y | 0);
    }
    e.break_seq = hs;
}

/** C: **`shk.c`** **`pacify_shk(shkp, FALSE)`** subset — peaceful; **`surcharge`** cleared (**`bill`** undo skipped). */
function pacifyShkMinimal(shkp) {
    shkp.mpeaceful = 1;
    const m = /** @type {Record<string, unknown>} */ (shkp);
    m.mAngry = 0;
    const e = ESHK(shkp);
    if (e) {
        e.following = 0;
        e.surcharge = 0;
    }
}

/** C: **`shk.c`** **`money_cnt(gi.invent)`** subset — **`g._goldCount`** + **`u.umoney`**. */
function moneyCntInvent(g) {
    return (g._goldCount | 0) + (g.u?.umoney | 0);
}

/** C: **`shk.c`** **`money_cnt(gi.invent)`** — exported for **`priest.c`** / **`minion.c`** **`bribe`** callers. */
export function moneyCntInventLikeC(g) {
    return moneyCntInvent(g);
}

/** C: **`shk.c`** **`money_cnt(mtmp->minvent)`** — gold **`quan`** sum (any monster). */
export function moneyCntMinventLikeC(mtmp) {
    let n = 0;
    for (let o = mtmp?.minvent; o; o = o.nobj) {
        if ((o.oclass | 0) === NH5_COIN_CLASS) n += o.quan | 0;
    }
    return n;
}

/**
 * C: **`shk.c`** **`money2mon`** — deduct hero gold (**`g._goldCount`** / **`u.umoney`**); no **`minvent`** attach yet.
 * @param {import('./gstate.js').game} g
 * @param {number} amt
 */
export function money2monDeductHeroLikeC(g, amt) {
    money2monShk(g, null, amt);
}

/** C: **`shk.c`** **`money2mon`** subset — deduct hero gold. */
function money2monShk(g, _shkp, amt) {
    let n = amt | 0;
    if (n <= 0) return;
    let gc = g._goldCount | 0;
    if (gc >= n) {
        g._goldCount = gc - n;
        return;
    }
    n -= gc;
    g._goldCount = 0;
    if (g.u) g.u.umoney = Math.max(0, (g.u.umoney | 0) - n);
}

/**
 * C: **`shk.c`** **`check_credit`** — **`pline_The`** → **`pline`**.
 * @returns {number} remaining zorkmids owed after credit applied
 */
async function checkCreditShk(g, tmp, shkp) {
    const e = ESHK(shkp);
    let credit = e?.credit | 0;
    let t = tmp | 0;
    if (credit === 0) return t;
    if (credit >= t) {
        await pline('The price is deducted from your credit.');
        if (e) e.credit = credit - t;
        return 0;
    }
    await pline('The price is partially covered by your credit.');
    if (e) e.credit = 0;
    return t - credit;
}

/** C: **`shk.c`** **`home_shk(shkp, FALSE)`** — move shk to **`eshk.shk`** (**`mnearto`** stub). */
function homeShkMinimal(g, shkp) {
    const e = ESHK(shkp);
    if (!e) return;
    const hx = e.shk?.x;
    const hy = e.shk?.y;
    if (hx == null || hy == null) return;
    shkp.mx = hx | 0;
    shkp.my = hy | 0;
    if (g.level?.flags) g.level.flags.has_shop = 1;
}

/**
 * C: **`shk.c`** **`getcad`** + **`hot_pursuit`** tail — no **`SetVoice`/`Deaf`** split beyond **`muteshk`**;
 * **`ROLL_FROM(angrytexts)`** → fixed **`furious`**.
 * @param {import('./gstate.js').game} g
 */
async function getCadShop(g, shkp, dmgstr, x, y, uinshp, animal, pursue) {
    const dugwall = dmgstr === 'dig into' || dmgstr === 'damage';
    const what = dugwall ? 'shop' : 'door';
    if (muteshkShk(shkp)) {
        if (animal && !helplessShk(shkp)) await pline(`${shknamDisplay(shkp)} yelps!`);
    } else if (pursue || uinshp || !umDistHero(g, x, y, 1)) {
        await pline(`${shknamDisplay(shkp)} howls angrily: \"How dare you ${dmgstr} my ${what}!\"`);
    } else {
        await pline(`${shknamDisplay(shkp)} shouts: \"Who dared ${dmgstr} my ${what}!\"`);
    }
    await hotPursuitShk(g, shkp);
}

/**
 * C: **`shk.c`** **`pay_for_damage`** — damagelist scan (**`when == moves`** && **`cost`**), nearest shk tie-break;
 * **`getcad`/`hot_pursuit`**, **`y_n`** pay path (**`check_credit`/`money2mon`/`pacify_shk`/`home_shk`** subset).
 * Omits **`mnexto`/`mnearto`** movement (**`homeShkMinimal`** teleport), **`Invis`** cad honorific, **`adjalign`** precision,
 * **`canspotmon`/`canseemon`** full parity, **`sleep`/`wait_synch`**, **`body_part`/`mbodypart`** deaf branch.
 * @param {import('./gstate.js').game} [g]
 * @param {string} dmgstr — C verb phrase (**`"dig into"`** / **`"damage"`** / door strings from callers).
 * @param {boolean} [cantMollify]
 */
export async function payForDamage(g = game, dmgstr, cantMollify = false) {
    const str = dmgstr != null ? String(dmgstr) : 'damage';
    const list = g.level?.damagelist;
    if (!list?.length) return;
    /* C: shk.c **`pay_for_damage`** — defer billing / **`y_n`** while **`leaving_tutorial`**. */
    if (contextLeavingTutorialActiveLikeC(g)) return;

    const moves = g.moves | 0;
    /** @type {{ x: number, y: number, cost?: number, when?: number, typ?: number, flags?: number } | null} */
    let appearHere = null;
    let shkp = null;
    let costOfDamage = 0;
    const nearestShkCap = ROWNO * ROWNO + COLNO * COLNO;
    let nearestShk = nearestShkCap;
    let nearestDamage = nearestShkCap;
    let picks = 0;

    for (let di = 0; di < list.length; di++) {
        const tmpDam = list[di];
        if ((tmpDam.when | 0) !== moves || !(tmpDam.cost | 0)) continue;
        costOfDamage += tmpDam.cost | 0;
        const dx = tmpDam.x | 0;
        const dy = tmpDam.y | 0;
        const shopsAffected = inRoomsShopbaseRoomnos(g, dx, dy);
        for (let si = 0; si < shopsAffected.length; si++) {
            const roomChar = shopsAffected[si];
            const tmpShk = shopKeeperForLevlRoomno(g, roomChar);
            if (!tmpShk) continue;
            if (tmpShk === shkp) {
                const damageDistance = dist2(dx, dy, g.u?.ux | 0, g.u?.uy | 0);
                if (damageDistance < nearestDamage) {
                    nearestDamage = damageDistance;
                    appearHere = tmpDam;
                }
                continue;
            }
            if (!inHishop(g, tmpShk)) continue;
            const shkDistance = dist2(tmpShk.mx | 0, tmpShk.my | 0, g.u?.ux | 0, g.u?.uy | 0);
            if (shkDistance > nearestShk) continue;
            if (shkDistance === nearestShk && picks) {
                if (rn2(++picks)) continue;
            } else picks = 1;
            shkp = tmpShk;
            nearestShk = shkDistance;
            appearHere = tmpDam;
            nearestDamage = dist2(dx, dy, g.u?.ux | 0, g.u?.uy | 0);
        }
    }

    if (!costOfDamage || !shkp || !appearHere) return;

    const e = ESHK(shkp);
    const pn = g.plname ? String(g.plname) : 'Player';
    if (e) e.customer = pn.slice(0, PL_NSIZ_PAY);

    if (!(shkp.mpeaceful | 0) || (e?.following | 0)) {
        await hotPursuitShk(g, shkp);
        return;
    }

    const animal = (shkp.data?.msound ?? 0) <= MS_ANIMAL_SHK;
    const uinshp = inRoomsShopbaseRoomnos(g, g.u?.ux | 0, g.u?.uy | 0).length > 0;
    const x = appearHere.x | 0;
    const y = appearHere.y | 0;

    const shkInShop = inRoomsShopbaseRoomnos(g, shkp.mx | 0, shkp.my | 0).length > 0;
    if (!shkInShop) {
        if (!cansee(shkp.mx | 0, shkp.my | 0)) return;
        await getCadShop(g, shkp, str, x, y, uinshp, animal, true);
        return;
    }

    let pursue = false;

    if (uinshp) {
        if (!umDistHero(g, shkp.mx | 0, shkp.my | 0, 1) && umDistHero(g, shkp.mx | 0, shkp.my | 0, 3)) {
            await pline(`${shknamDisplay(shkp)} leaps towards you!`);
            /* C: **`mnexto(shkp, RLOC_NOMSG)`** — not ported */
        }
        pursue = umDistHero(g, shkp.mx | 0, shkp.my | 0, 1);
        if (pursue) {
            await getCadShop(g, shkp, str, x, y, uinshp, animal, pursue);
            return;
        }
    } else {
        if (monAtG(g, x, y)) {
            if (!animal) {
                await pline('You hear an angry voice: \"Out of my way, scum!\"');
            } else {
                await pline(`${shknamDisplay(shkp)} growls.`);
            }
        }
        /* C: **`mnearto(shkp, x, y, TRUE, RLOC_MSG)`** — not ported */
    }

    const heroInvis = !!(g.u?.HInvis | 0) || !!(g.u?.EInvis | 0);
    const brokeOrAngry =
        (umDistHero(g, x, y, 1) && !uinshp)
        || cantMollify
        || moneyCntInvent(g) + (e?.credit | 0) < costOfDamage
        || !rn2(50);
    if (brokeOrAngry) {
        await getCadShop(g, shkp, str, x, y, uinshp, animal, pursue);
        return;
    }

    if (heroInvis) await pline(`Your invisibility does not fool ${shknamDisplay(shkp)}!`);
    const cadPre = !animal ? 'Cad!  ' : '';
    const cadPost = !animal ? '"' : '';
    const qbuf = `${cadPre}You did ${costOfDamage} zorkmids worth of damage!${cadPost}  Pay?`;
    await pline(qbuf);
    const code = await nhgetch();
    const ch = typeof code === 'number' ? String.fromCharCode(code) : String(code);
    if (ch.toLowerCase() !== 'n') {
        const wasSeen = cansee(shkp.mx | 0, shkp.my | 0);
        const wasOutside = !inHishop(g, shkp);
        const sx = shkp.mx | 0;
        const sy = shkp.my | 0;
        let payAmt = costOfDamage;
        payAmt = await checkCreditShk(g, payAmt, shkp);
        if (payAmt > 0) {
            money2monShk(g, shkp, payAmt);
            g.disp = g.disp || {};
            g.disp.botl = true;
        }
        await pline(`Mollified, ${shknamDisplay(shkp)} accepts your restitution.`);
        homeShkMinimal(g, shkp);
        pacifyShkMinimal(shkp);
        if ((shkp.mx | 0) !== sx || (shkp.my | 0) !== sy) {
            if (wasOutside && cansee(shkp.mx | 0, shkp.my | 0)) {
                await pline(`${shknamDisplay(shkp)} returns to his shop.`);
            } else if (cansee(shkp.mx | 0, shkp.my | 0) || wasSeen) {
                const msg = !wasSeen ? 'appears' : cansee(shkp.mx | 0, shkp.my | 0) ? 'shifts location' : 'disappears';
                await pline(`${shknamDisplay(shkp)} ${msg}.`);
            }
        }
    } else {
        if (!animal) {
            await pline(`${shknamDisplay(shkp)} snarls: \"Oh, yes!  You'll pay!\"`);
        } else {
            await pline(`${shknamDisplay(shkp)} growls.`);
        }
        await hotPursuitShk(g, shkp);
        changeLuck(-1);
    }
}

/**
 * C: shk.c costly_spot(x,y) — strictly inside shop (**`inside_shop`**) but not **`eshk.shk`** service square.
 * @param {object} [g]
 * @param {number} x
 * @param {number} y
 */
export function costlySpot(g = game, x, y) {
    const xh = x | 0;
    const yh = y | 0;
    if (!(g.level?.flags?.has_shop | 0)) return false;
    const rnos = inRoomsShopbaseRoomnos(g, xh, yh);
    if (!rnos.length) return false;
    const shkp = shopKeeperForLevlRoomno(g, rnos[0]);
    if (!shkp || !inHishop(g, shkp)) return false;
    const eshkp = ESHK(shkp);
    if (!eshkp) return false;
    if (insideShopLevlRoomno(g, xh, yh) === NO_ROOM) return false;
    const sx = eshkp.shk?.x != null ? eshkp.shk.x | 0 : shkp.mx | 0;
    const sy = eshkp.shk?.y != null ? eshkp.shk.y | 0 : shkp.my | 0;
    return !(xh === sx && yh === sy);
}

/** C: shk.c **`ANGRY(mon)`** — **`!mpeaceful`**. */
function shkpAngry(shkp) {
    return !(shkp?.mpeaceful | 0);
}

/** C: monflag.h `MR_*` — `mconveys` bits (eat.c **`intrinsic_possible`**). */
const MR_COLD = 0x02;
const MR_DISINT = 0x08;
const MR_ELEC = 0x10;
const MR_POISON = 0x20;
const MR_ACID = 0x40;
const MR_STONE = 0x80;
/** C: monflag.h `G_UNIQ` — **`unique_corpstat`** (mondata.h). */
const G_UNIQ = 0x1000;
/** C: monflag.h `M1_TPORT` / `M1_TPORT_CNTRL` — mondata.h **`can_teleport`** / **`control_teleport`**. */
const M1_TPORT = 0x02000000;
const M1_TPORT_CNTRL = 0x04000000;

/** C: objects.h — `objects_nums` / cpp OBJECTS_INIT (clang `POTION_CLASS`/`ARMOR_CLASS` walks). */
const OTYP_CORPSE = 265;
const OTYP_EGG = 266;
const OTYP_TIN = 295;
const OTYP_POT_WATER = 321;
const OTYP_DUNCE_CAP = 94;
const OTYP_TALLOW_CANDLE = 225;
const OTYP_WAX_CANDLE = 226;
const OTYP_BRASS_LANTERN = 227;
const OTYP_OIL_LAMP = 228;
const OTYP_MAGIC_LAMP = 229;
const OTYP_POT_OIL = 320;
/** C: shknam.c **`#define VEGETARIAN_CLASS (MAXOCLASSES + 1)`** — NH5 **`MAXOCLASSES`** = 18 (**`VENOM_CLASS`**). */
const NH5_VEGETARIAN_PSEUDO_CLASS = 19;
/** C: objects.h `FIRST_REAL_GEM` / `FIRST_GLASS_GEM` — gem **`otyp`** ranges. */
const OTYP_FIRST_REAL_GEM = 439;
const OTYP_LAST_REAL_GEM = 460;
const OTYP_FIRST_GLASS_GEM = 461;
const OTYP_LAST_GLASS_GEM = 469;
const OTYP_FLINT = 473;
/** C: monsters.h **`PM_*`** via **`MONS_ENUM`** cpp token order (0-based **`mnum`**). */
const PM_STALKER = 153;
const PM_BLACK_PUDDING = 209;
const PM_LEATHER_GOLEM = 253;
const PM_FLESH_GOLEM = 255;
/** C: defsym.h **`MONSYM`** indices (`S_*`). */
const S_BLOB = 2;
const S_JELLY = 10;
const S_FUNGUS = 32;
const S_VORTEX = 22;
const S_LIGHT = 25;
const S_GOLEM = 55;
const S_PUDDING = 42;
/** C: objclass.h **`VEGGY`** material. */
const OC_MATERIAL_VEGGY = 3;
/** C: shknam.c **`shtypes[]`** — only **`symb`/`iprobs`** used by **`saleable`** ( **`shkgeneral`** fn ptr omitted). */
const SHK_SHTYPES_FOR_SALEABLE = [
    { symb: NH5_RANDOM_CLASS, iprobs: [[NH5_RANDOM_CLASS, 100], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]] },
    { symb: NH5_ARMOR_CLASS, iprobs: [[NH5_ARMOR_CLASS, 90], [NH5_WEAPON_CLASS, 10], [0, 0], [0, 0], [0, 0], [0, 0]] },
    { symb: NH5_SCROLL_CLASS, iprobs: [[NH5_SCROLL_CLASS, 90], [NH5_SPBOOK_CLASS, 10], [0, 0], [0, 0], [0, 0], [0, 0]] },
    { symb: NH5_POTION_CLASS, iprobs: [[NH5_POTION_CLASS, 100], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]] },
    { symb: NH5_WEAPON_CLASS, iprobs: [[NH5_WEAPON_CLASS, 90], [NH5_ARMOR_CLASS, 10], [0, 0], [0, 0], [0, 0], [0, 0]] },
    {
        symb: NH5_FOOD_CLASS,
        iprobs: [
            [NH5_FOOD_CLASS, 83],
            [-319, 5],
            [-317, 4],
            [-322, 5],
            [-216, 3],
            [0, 0],
        ],
    },
    { symb: NH5_RING_CLASS, iprobs: [[NH5_RING_CLASS, 85], [NH5_GEM_CLASS, 10], [NH5_AMULET_CLASS, 5], [0, 0], [0, 0], [0, 0]] },
    { symb: NH5_WAND_CLASS, iprobs: [[NH5_WAND_CLASS, 90], [-144, 5], [-90, 5], [0, 0], [0, 0], [0, 0]] },
    { symb: NH5_TOOL_CLASS, iprobs: [[NH5_TOOL_CLASS, 100], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]] },
    { symb: NH5_SPBOOK_CLASS, iprobs: [[NH5_SPBOOK_CLASS, 90], [NH5_SCROLL_CLASS, 10], [0, 0], [0, 0], [0, 0], [0, 0]] },
    {
        symb: NH5_FOOD_CLASS,
        iprobs: [
            [NH5_VEGETARIAN_PSEUDO_CLASS, 70],
            [-319, 20],
            [-307, 4],
            [-315, 3],
            [-335, 2],
            [-285, 1],
        ],
    },
    {
        symb: NH5_TOOL_CLASS,
        iprobs: [
            [-226, 30],
            [-225, 44],
            [-227, 5],
            [-228, 9],
            [-229, 3],
            [-321, 5],
            [-409, 2],
            [-332, 1],
            [-372, 1],
            [0, 0],
            [0, 0],
            [0, 0],
        ],
    },
];

/** C: **`mextra.h`** **`eshk.shoptype`** or room **`rtype`** (**`mkroom.h`** **`SHOPBASE`**…). */
function eshkShoptypeLikeC(g, shkp) {
    const e = ESHK(shkp);
    if (!e) return SHOPBASE;
    if (e.shoptype != null) return e.shoptype | 0;
    return roomRtypeForLevlRoomno(g, eshkShoproomAsLevlRno(e));
}

/** C: mondata.h **`vegan`** / **`vegetarian`**. */
function veganMonsterLikeC(ptr) {
    if (!ptr) return false;
    const ml = ptr.mlet | 0;
    const mn = ptr.mnum | 0;
    if (
        ml === S_BLOB
        || ml === S_JELLY
        || ml === S_FUNGUS
        || ml === S_VORTEX
        || ml === S_LIGHT
        || (ml === S_ELEMENTAL && mn !== PM_STALKER)
        || (ml === S_GOLEM && mn !== PM_FLESH_GOLEM && mn !== PM_LEATHER_GOLEM)
        || noncorporeal(ptr)
    ) {
        return true;
    }
    return false;
}

/** C: mondata.h **`vegetarian`**. */
function vegetarianMonsterLikeC(ptr) {
    if (!ptr) return false;
    if (veganMonsterLikeC(ptr)) return true;
    const ml = ptr.mlet | 0;
    const mn = ptr.mnum | 0;
    return ml === S_PUDDING && mn !== PM_BLACK_PUDDING;
}

/**
 * C: shknam.c **`veggy_item`**
 * @param {object|null} obj
 */
function veggyItemLikeC(obj) {
    if (!obj) return false;
    const otyp = obj.otyp | 0;
    const oclass = obj.oclass | 0;
    const corpsenm = obj.corpsenm | 0;
    if (oclass !== NH5_FOOD_CLASS) return false;
    const mat = obj.oc_material != null ? obj.oc_material | 0 : 0;
    if (mat === OC_MATERIAL_VEGGY || otyp === OTYP_EGG) return true;
    if (otyp === OTYP_TIN && corpsenm === NON_PM) return (obj.spe | 0) === 1;
    if (otyp === OTYP_TIN || otyp === OTYP_CORPSE) {
        return ismnum(corpsenm) && vegetarianMonsterLikeC(stubPermonstForCorpsenm(corpsenm));
    }
    return false;
}

/**
 * C: shknam.c **`saleable`**
 * @param {import('./gstate.js').game} g
 */
function saleableLikeC(g, shkp, obj) {
    const e = ESHK(shkp);
    if (!e) return true;
    const shpIndx = (eshkShoptypeLikeC(g, shkp) | 0) - SHOPBASE;
    if (shpIndx < 0 || shpIndx >= SHK_SHTYPES_FOR_SALEABLE.length) return true;
    const shp = SHK_SHTYPES_FOR_SALEABLE[shpIndx];
    if (shp.symb === NH5_RANDOM_CLASS) return true;
    for (let i = 0; i < shp.iprobs.length; i++) {
        const itype = shp.iprobs[i][0] | 0;
        const iprob = shp.iprobs[i][1] | 0;
        if (!iprob) break;
        if (itype === NH5_VEGETARIAN_PSEUDO_CLASS) {
            if (veggyItemLikeC(obj)) return true;
        } else if (itype < 0) {
            if (itype === -(obj.otyp | 0)) return true;
        } else if (itype === (obj.oclass | 0)) {
            return true;
        }
    }
    return false;
}

/**
 * C: shk.c **`set_cost`**
 * @param {import('./gstate.js').game} g
 */
function setCostLikeC(g, obj, shkp) {
    let tmp = getPricingUnitsStolenBury(obj) * getpriceLikeC(g, obj, true);
    let multiplier = 1;
    let divisor = 1;
    const u = g.u;
    const uarmh = u?.uarmh;
    if (uarmh && (uarmh.otyp | 0) === OTYP_DUNCE_CAP) divisor *= 3;
    else if (
        (u?.urole?.abbr === 'Tou' && (u?.ulevel | 0) < Math.trunc(MAXULEV / 2))
        || (u?.uarmu && !u?.uarm && !u?.uarmc && (u.uarmu.otyp | 0) === OTYP_HAWAIIAN_SHIRT)
    ) {
        divisor *= 3;
    } else {
        divisor *= 2;
    }

    const otyp = obj.otyp | 0;
    const oclass = obj.oclass | 0;
    if (!(obj.dknown | 0) || !objectOcNameKnownForShop(otyp, oclass)) {
        if (oclass === NH5_GEM_CLASS) {
            if (
                (otyp >= OTYP_FIRST_REAL_GEM && otyp <= OTYP_LAST_REAL_GEM)
                || (otyp >= OTYP_FIRST_GLASS_GEM && otyp <= OTYP_LAST_GLASS_GEM)
            ) {
                const mid = (shkp?.m_id ?? shkp?.mid ?? 0) | 0;
                tmp = ((otyp - OTYP_FIRST_REAL_GEM) % (6 - (mid % 3)));
                tmp = (tmp + 3) * Math.max(1, obj.quan | 0);
                divisor = 1;
            }
        } else if (tmp > 1 && !((shkp?.m_id ?? shkp?.mid ?? 0) % 4)) {
            multiplier *= 3;
            divisor *= 4;
        }
    }

    if (tmp >= 1) {
        tmp *= multiplier;
        if (divisor > 1) {
            tmp *= 10;
            tmp = Math.trunc(tmp / divisor);
            tmp += 5;
            tmp = Math.trunc(tmp / 10);
        }
        if (tmp < 1) tmp = 1;
    }

    return tmp | 0;
}

/** C: mondata.h **`can_teleport`** / **`control_teleport`**. */
function canTeleportMon(ptr) {
    return ((ptr?.mflags1 ?? 0) & M1_TPORT) !== 0;
}
function controlTeleportMon(ptr) {
    return ((ptr?.mflags1 ?? 0) & M1_TPORT_CNTRL) !== 0;
}

/** C: mondata.h **`telepathic`** — `mons[]` identity (**`PM_*`** from **`monsters.h`** MON order). */
function telepathicMon(ptr) {
    const m = ptr?.mnum | 0;
    return m === 29 || m === 50 || m === 51;
}

/** C: mondata.h **`unique_corpstat`** */
function uniqueCorpstat(ptr) {
    return ((ptr?.geno ?? 0) & G_UNIQ) !== 0;
}

/**
 * C: shk.c **`oid_price_adjustment`**
 * @param {object} obj
 * @param {number} oid — unsigned **`o_id`**
 */
function oidPriceAdjustmentLikeC(obj, oid) {
    const otyp = obj.otyp | 0;
    const oclass = obj.oclass | 0;
    if ((obj.dknown | 0) && objectOcNameKnownForShop(otyp, oclass)) return 0;
    if (oclass === NH5_GEM_CLASS && objectMaterialIsGlassLikeC(otyp, oclass)) return 0;
    return (oid >>> 0) % 4 === 0 ? 1 : 0;
}

/** C: `objects[otyp].oc_material == GLASS` — worthless glass **`otyp`** range matches NH5 table. */
function objectMaterialIsGlassLikeC(otyp, oclass) {
    const t = otyp | 0;
    if ((oclass | 0) !== NH5_GEM_CLASS) return false;
    return t >= OTYP_FIRST_GLASS_GEM && t <= OTYP_LAST_GLASS_GEM;
}

/**
 * C: `objects[otyp].oc_name_known` — JS: non-gems known; gems unknown until a fuller discovery port.
 * @param {number} otyp
 * @param {number} oclass
 */
function objectOcNameKnownForShop(otyp, oclass) {
    void otyp;
    return (oclass | 0) !== NH5_GEM_CLASS;
}

/** C: eat.c **`intrinsic_possible`** — uses **`ptr->mconveys`**. */
function intrinsicPossibleEatC(type, ptr) {
    const cv = (ptr?.mconveys ?? ptr?.mresists ?? 0) | 0;
    switch (type) {
        case FIRE_RES:
            return (cv & MR_FIRE) !== 0;
        case SLEEP_RES:
            return (cv & MR_SLEEP) !== 0;
        case COLD_RES:
            return (cv & MR_COLD) !== 0;
        case DISINT_RES:
            return (cv & MR_DISINT) !== 0;
        case SHOCK_RES:
            return (cv & MR_ELEC) !== 0;
        case POISON_RES:
            return (cv & MR_POISON) !== 0;
        case ACID_RES:
            return (cv & MR_ACID) !== 0;
        case STONE_RES:
            return (cv & MR_STONE) !== 0;
        case TELEPORT:
            return canTeleportMon(ptr);
        case TELEPORT_CONTROL:
            return controlTeleportMon(ptr);
        case TELEPAT:
            return telepathicMon(ptr);
        default:
            return false;
    }
}

/** C: shk.c **`corpsenm_price_adj`** */
function corpsenmPriceAdjLikeC(obj) {
    const t = obj.otyp | 0;
    const cm = obj.corpsenm | 0;
    if ((t !== OTYP_TIN && t !== OTYP_EGG && t !== OTYP_CORPSE) || !ismnum(cm)) return 0;
    const ptr = stubPermonstForCorpsenm(cm);
    const icost = [
        [FIRE_RES, 2],
        [SLEEP_RES, 3],
        [COLD_RES, 2],
        [DISINT_RES, 5],
        [SHOCK_RES, 4],
        [POISON_RES, 2],
        [ACID_RES, 1],
        [STONE_RES, 3],
        [TELEPORT, 2],
        [TELEPORT_CONTROL, 3],
        [TELEPAT, 5],
    ];
    let tmp = 1;
    for (let i = 0; i < icost.length; i++) {
        if (intrinsicPossibleEatC(icost[i][0], ptr)) tmp += icost[i][1];
    }
    if (uniqueCorpstat(ptr)) tmp += 50;
    const mlevel = Math.max(0, (ptr.mlevel ?? 1) | 0);
    let val = Math.max(1, (mlevel - 1) * 2);
    if (t === OTYP_CORPSE) {
        const nut = ptr.cnutrit | 0;
        val += Math.max(1, Math.trunc(nut / 30));
    }
    val *= tmp;
    return val;
}

/** C: artifact.c **`arti_cost`** — no **`artilist`** in JS yet: explicit **`cost`** or **`100 * oc_cost`**. */
function artiCostLikeC(g, obj) {
    const ax = obj.oartifact | 0;
    if (!ax) return objectOcCost(obj.otyp | 0);
    const row = g?.artilist?.[ax];
    const c = row?.cost | 0;
    if (c) return c;
    return 100 * (objectOcCost(obj.otyp | 0) | 0);
}

/** C: obj.h **`Is_candle`** — tallow / wax candle **`otyp`**s. */
function isCandleOtyp(otyp) {
    const t = otyp | 0;
    return t === OTYP_TALLOW_CANDLE || t === OTYP_WAX_CANDLE;
}

/**
 * C: shk.c **`getprice`**
 * @param {import('./gstate.js').game} g
 * @param {object} obj
 * @param {boolean} shkBuying
 */
function getpriceLikeC(g, obj, shkBuying) {
    let tmp = objectOcCost(obj.otyp | 0);
    if (obj.oartifact | 0) {
        tmp = artiCostLikeC(g, obj);
        if (shkBuying) tmp = Math.trunc(tmp / 4);
    }
    const oc = obj.oclass | 0;
    switch (oc) {
        case NH5_FOOD_CLASS: {
            tmp += corpsenmPriceAdjLikeC(obj);
            const uhs = g.u?.uhs | 0;
            if (uhs >= UHS.HUNGRY && !shkBuying) tmp *= uhs;
            if (obj.oeaten | 0) tmp = 0;
            break;
        }
        case NH5_WAND_CLASS:
            if ((obj.spe | 0) === -1) tmp = 0;
            break;
        case NH5_POTION_CLASS:
            if ((obj.otyp | 0) === OTYP_POT_WATER && !(obj.blessed | 0) && !(obj.cursed | 0)) tmp = 0;
            break;
        case NH5_ARMOR_CLASS:
        case NH5_WEAPON_CLASS:
            if ((obj.spe | 0) > 0) tmp += 10 * (obj.spe | 0);
            break;
        case NH5_TOOL_CLASS:
            if (isCandleOtyp(obj.otyp | 0)) {
                const base = objectOcCost(obj.otyp | 0);
                if ((obj.age | 0) < 20 * base) tmp = Math.trunc(tmp / 2);
            }
            break;
        default:
            break;
    }
    return tmp;
}

/**
 * C: shk.c **`get_cost`** — shop charge to hero (**`getprice(..., FALSE)`** + adjustments + angry surcharge).
 * @param {import('./gstate.js').game} g
 * @param {object} obj
 * @param {object|null} shkp
 */
function getCostStolenBuryUnit(g, obj, shkp) {
    let tmp = getpriceLikeC(g, obj, false);
    if (!tmp) tmp = 5;
    let multiplier = 1;
    let divisor = 1;
    const otyp = obj.otyp | 0;
    const oclass = obj.oclass | 0;
    const oid = (obj.o_id ?? 0) >>> 0;
    if (!(obj.dknown | 0) || !objectOcNameKnownForShop(otyp, oclass)) {
        if (oclass === NH5_GEM_CLASS && objectMaterialIsGlassLikeC(otyp, oclass)) {
            const u = g.u;
            const birthday = (u?.ubirthday != null ? u.ubirthday >>> 0 : 0x9e3779b9) >>> 0;
            const pseudorand = (birthday % otyp) >= otyp / 2;
            const sw = [
                [440, 452],
                [443, 448],
                [441, 456],
                [449, 450],
                [442, 459],
                [447, 453],
                [444, 451],
                [445, 460],
                [455, 457],
            ];
            const idx = otyp - OTYP_FIRST_GLASS_GEM;
            let repl = 440;
            if (idx >= 0 && idx < sw.length) {
                const [a, b] = sw[idx];
                repl = pseudorand ? a : b;
            }
            tmp = objectOcCost(repl);
        } else if (oidPriceAdjustmentLikeC(obj, oid) > 0) {
            multiplier *= 4;
            divisor *= 3;
        }
    }
    const u = g.u;
    const uarmh = u?.uarmh;
    if (uarmh && (uarmh.otyp | 0) === OTYP_DUNCE_CAP) {
        multiplier *= 4;
        divisor *= 3;
    } else if (
        (u?.urole?.abbr === 'Tou' && (u?.ulevel | 0) < Math.trunc(MAXULEV / 2))
        || (u?.uarmu && !u?.uarm && !u?.uarmc && (u.uarmu.otyp | 0) === OTYP_HAWAIIAN_SHIRT)
    ) {
        multiplier *= 4;
        divisor *= 3;
    }
    const cha = acurr(A_CHA);
    if (cha > 18) divisor *= 2;
    else if (cha === 18) {
        multiplier *= 2;
        divisor *= 3;
    } else if (cha >= 16) {
        multiplier *= 3;
        divisor *= 4;
    } else if (cha <= 5) multiplier *= 2;
    else if (cha <= 7) {
        multiplier *= 3;
        divisor *= 2;
    } else if (cha <= 10) {
        multiplier *= 4;
        divisor *= 3;
    }
    tmp *= multiplier;
    if (divisor > 1) {
        tmp *= 10;
        tmp = Math.trunc(tmp / divisor);
        tmp += 5;
        tmp = Math.trunc(tmp / 10);
    }
    if (tmp <= 0) tmp = 1;
    if (obj.oartifact | 0) tmp *= 4;
    const e = shkp ? ESHK(shkp) : null;
    if (shkp && e && (e.surcharge | 0)) tmp += Math.trunc((tmp + 2) / 3);
    return tmp | 0;
}

/** C: shk.c **`get_pricing_units`** — **`quan`**; **`globby`** weight pricing not ported. */
function getPricingUnitsStolenBury(obj) {
    return Math.max(1, obj.quan | 0);
}

/**
 * C: shk.c **`picked_container`** — clear **`no_charge`** on nested contents (subset, no **`dropped_container`**).
 * @param {object} obj
 */
export function pickedContainerNoChargeClear(obj) {
    for (let otmp = obj?.cobj; otmp; otmp = otmp.nobj) {
        if ((otmp.oclass | 0) === NH5_COIN_CLASS) continue;
        if (otmp.no_charge | 0) otmp.no_charge = 0;
        if (Has_contents(otmp)) pickedContainerNoChargeClear(otmp);
    }
}

/** C: shk.c **`count_contents`** unpaid branch subset — recursive unpaid **`cobj`**. */
function countUnpaidContentsCobj(obj) {
    let n = 0;
    for (let o = obj?.cobj; o; o = o.nobj) {
        if ((o.oclass | 0) === NH5_COIN_CLASS) continue;
        if (o.unpaid | 0) n++;
        if (Has_contents(o)) n += countUnpaidContentsCobj(o);
    }
    return n;
}

/** C: **`shk.c`** **`count_contents`** all non-coin **`cobj`** (subset for **`stolen_value`** pline **`c_count`**). */
function countAllContentsNonCoinCobj(obj) {
    let n = 0;
    for (let o = obj?.cobj; o; o = o.nobj) {
        if ((o.oclass | 0) === NH5_COIN_CLASS) continue;
        n++;
        if (Has_contents(o)) n += countAllContentsNonCoinCobj(o);
    }
    return n;
}

/**
 * C: **`shk.c`** **`contained_cost`** top container walk (**`OBJ_CONTAINED`** / **`ocontainer`** not in JS yet).
 * @param {object} obj
 */
function containerTopForContainedCost(obj) {
    let top = obj;
    while (top && (top.where | 0) === OBJ_CONTAINED && top.ocontainer) {
        top = top.ocontainer;
    }
    return top || obj;
}

/**
 * C: **`shk.c`** **`contained_cost`** — floor buy (**`usell` FALSE**) uses **`getCostStolenBuryUnit`**;
 * **`usell` TRUE** uses **`saleableLikeC`** + **`setCostLikeC`** ( **`shknam.c`** / **`set_cost`** ).
 * @param {import('./gstate.js').game} g
 * @param {boolean} usell — C **`usell`**
 * @param {boolean} unpaidOnly — C **`unpaid_only`**
 */
function containedCostStolenBury(g, obj, shkp, price, usell, unpaidOnly) {
    let out = price | 0;
    if (!shkp || !Has_contents(obj)) return out;
    const top = containerTopForContainedCost(obj);
    const tw = top.where != null ? (top.where | 0) : OBJ_FLOOR;
    const onFloor = tw === OBJ_FLOOR || tw === OBJ_FREE;
    let x = top.ox ?? 0;
    let y = top.oy ?? 0;
    if (tw === OBJ_FREE || top.ox == null || top.oy == null) {
        x = g.u?.ux | 0;
        y = g.u?.uy | 0;
    }
    const e = ESHK(shkp);
    const sx = e?.shk?.x != null ? e.shk.x | 0 : shkp.mx | 0;
    const sy = e?.shk?.y != null ? e.shk.y | 0 : shkp.my | 0;
    const freespot = onFloor && (x | 0) === (sx | 0) && (y | 0) === (sy | 0);

    for (let otmp = obj.cobj; otmp; otmp = otmp.nobj) {
        if ((otmp.oclass | 0) === NH5_COIN_CLASS) continue;
        if (usell) {
            if (saleableLikeC(g, shkp, otmp) && !(otmp.unpaid | 0)
                && (otmp.oclass | 0) !== NH5_BALL_CLASS
                && !((otmp.oclass | 0) === NH5_FOOD_CLASS && (otmp.oeaten | 0))
                && !(isCandleOtyp(otmp.otyp | 0)
                    && (otmp.age | 0) < 20 * (objectOcCost(otmp.otyp | 0) | 0))) {
                out += setCostLikeC(g, otmp, shkp);
            }
        } else if (onFloor
            ? (!(otmp.no_charge | 0) && !freespot)
            : ((otmp.unpaid | 0) || !unpaidOnly)) {
            out += getPricingUnitsStolenBury(otmp) * getCostStolenBuryUnit(g, otmp, shkp);
        }
        if (Has_contents(otmp)) {
            out = containedCostStolenBury(g, otmp, shkp, out, usell, unpaidOnly);
        }
    }
    return out;
}

/**
 * Ensure **`eshk.bill_p`** exists (C **`bill_p`** / **`billct`**; JS keeps **`billct`** in sync when present).
 * @param {*} eshk
 */
function ensureEshopBillP(eshk) {
    if (!eshk) return;
    if (!eshk.bill_p) eshk.bill_p = [];
}

/**
 * C: shk.c **`onbill(obj, shkp, silent)`** — match **`bo_id`** or live **`obj`** ref on **`bill_p`**.
 * @returns {{ bp: { bquan: number, price: number, bo_id?: number, obj?: object, useup?: boolean }, idx: number } | null}
 */
function onBillSlot(obj, shkp) {
    if (!shkp || !(obj.unpaid | 0)) return null;
    const eshk = ESHK(shkp);
    if (!eshk) return null;
    ensureEshopBillP(eshk);
    const arr = eshk.bill_p;
    const oid = obj.o_id;
    for (let i = 0; i < arr.length; i++) {
        const bp = arr[i];
        if (bp.obj === obj || (oid != null && bp.bo_id === oid)) return { bp, idx: i };
    }
    return null;
}

/**
 * C: shk.c **`alter_cost(obj, amt)`** — raise **`bill_p`**.**`price`** when **`get_cost`** exceeds old (**`amt`** **0**),
 * or set from **`amt`** (**`amt` &lt; 0** → **`-amt`**).
 * @param {import('./gstate.js').game} g
 * @param {object} obj
 * @param {number} amt
 * @returns {boolean} whether a bill line was updated
 */
export function alterCostShopBillObjLikeC(g, obj, amt) {
    if (!(obj?.unpaid | 0)) return false;
    for (const shkp of iterateNextShkpLikeC(g, true)) {
        const slot = onBillSlot(obj, shkp);
        if (!slot) continue;
        const bp = slot.bp;
        const a = amt | 0;
        const newPrice = !a ? getCostStolenBuryUnit(g, obj, shkp) : a < 0 ? -a : a;
        const old = bp.price | 0;
        if (newPrice > old || a < 0) {
            bp.price = newPrice;
            g.disp = g.disp || {};
            g.disp.botl = true;
            return true;
        }
        return false;
    }
    return false;
}

/** C: mkobj.c **`alteration_verbs[]`** — index must match **`COST_*`** in **`hack.h`**. */
const ALTERATION_VERBS_MKOBJ = [
    'cancel',
    'drain',
    'uncharge',
    'unbless',
    'uncurse',
    'disenchant',
    'degrade',
    'dilute',
    'erase',
    'burn',
    'neutralize',
    'destroy',
    'splatter',
    'bite',
    'open',
    'break the lock on',
    'rust',
    'rot',
    'tarnish',
    'crack',
];

/**
 * @param {import('./gstate.js').game} g
 * @param {object} obj
 * @returns {{ shkp: object, slot: { bp: object, idx: number } } | null}
 */
function shkpOnBillSlotForUnpaidObjLikeC(g, obj) {
    if (!(obj?.unpaid | 0)) return null;
    for (const shkp of iterateNextShkpLikeC(g, true)) {
        const slot = onBillSlot(obj, shkp);
        if (slot) return { shkp, slot };
    }
    return null;
}

/** Bill **`bo_id`** for **`OBJ_FREE`** dummy rows (**`bill_dummy_object`**). */
function nextBillDummyOidLikeC(g) {
    const seq = ((g._billDummyOidSeq = (g._billDummyOidSeq | 0) + 1) | 0) >>> 0;
    return (0xbd110000 ^ seq) >>> 0;
}

/**
 * C: mkobj.c **`bill_dummy_object(otmp)`** — hero invent / unpaid (**`subfrombill`**, phantom **`bill_p`** row, **`alter_cost(dummy,-cost)`**).
 * @param {import('./gstate.js').game} g
 * @param {object} obj — real invent object (**`unpaid`** cleared by **`sub_one_frombill`**)
 * @param {object} shkp
 */
function billDummyObjectUnpaidHeroInventLikeC(g, obj, shkp) {
    const slot0 = onBillSlot(obj, shkp);
    if (!slot0) return;
    const cost = slot0.bp.price | 0;
    subOneFromBill(obj, shkp);
    const eshk = ESHK(shkp);
    if (!eshk) return;
    ensureEshopBillP(eshk);
    const dummy = { ...obj };
    dummy.nobj = undefined;
    dummy.nexthere = undefined;
    dummy.ocontainer = undefined;
    dummy.cobj = undefined;
    dummy.owornmask = 0;
    dummy.o_id = nextBillDummyOidLikeC(g);
    dummy.unpaid = 0;
    const bq = Math.max(1, obj.quan | 0);
    const unit = getCostStolenBuryUnit(g, dummy, shkp);
    eshk.bill_p.push({
        bo_id: dummy.o_id,
        bquan: bq,
        price: unit,
        useup: true,
    });
    if (typeof eshk.billct === 'number') eshk.billct = (eshk.billct | 0) + 1;
    else eshk.billct = eshk.bill_p.length;
    dummy.unpaid = 1;
    alterCostShopBillObjLikeC(g, dummy, -cost);
    g.disp = g.disp || {};
    g.disp.botl = true;
}

/**
 * C: mkobj.c **`costly_alteration(obj, alter_type)`** — **`OBJ_INVENT`** / unpaid only (**`read.c`** shop **`POT_WATER`** **`COST_UNCURS`**).
 * @param {import('./gstate.js').game} g
 * @param {object} obj
 * @param {number} alterType — **`COST_UNCURS`** etc.
 */
export async function costlyAlterationUnpaidHeroInventLikeC(g, obj, alterType) {
    if (!(obj?.unpaid | 0)) return;
    const pair = shkpOnBillSlotForUnpaidObjLikeC(g, obj);
    if (!pair) return;
    const { shkp } = pair;
    const at = alterType | 0;
    if (at < 0 || at >= ALTERATION_VERBS_MKOBJ.length) return;
    const learnBknown = at === COST_UNCURS || at === COST_UNBLSS;
    if (learnBknown) {
        obj.bknown = 1;
    }
    const q = Math.max(1, obj.quan | 0);
    const those = q === 1 ? 'that' : 'those';
    const them = q === 1 ? 'it' : 'them';
    const verb = ALTERATION_VERBS_MKOBJ[at] ?? 'alter';
    void shkp;
    await pline(`You ${verb} ${those} ${doname(obj, g)}, you pay for ${them}!`);
    billDummyObjectUnpaidHeroInventLikeC(g, obj, shkp);
}

/** C: **`next_shkp`** bill filter — **`ESHK`->`billct`** or **`bill_p`** length. */
function eshkBillCountForNextShkp(e) {
    if (!e) return 0;
    const ct = e.billct | 0;
    if (ct > 0) return ct;
    return e.bill_p?.length ?? 0;
}

/**
 * C: **`shk.c`** **`next_shkp`** tail before return — angry + **`!surcharge`** → **`rile_shk`**
 * (bill **`price`** bump loop; **`NOTANGRY`** already false when angry).
 */
function nextShkpRileIfAngryLikeC(shkp) {
    if (!shkpAngry(shkp)) return;
    const e = ESHK(shkp);
    if (!e || (e.surcharge | 0)) return;
    shkp.mpeaceful = 0;
    e.surcharge = 1;
    ensureEshopBillP(e);
    for (const bp of e.bill_p) {
        const p = bp.price | 0;
        bp.price = p + Math.trunc((p + 2) / 3);
    }
}

/**
 * C: **`shk.c`** **`next_shkp(fmon, withbill)`** order (**`g.level.monsters`** vs C **`nmon`**).
 * @param {boolean} withbill — C TRUE: require non-empty bill.
 */
function* iterateNextShkpLikeC(g, withbill) {
    for (const shkp of g.level?.monsters ?? []) {
        if ((shkp.mhp | 0) <= 0) continue;
        if (!(shkp.isshk | 0)) continue;
        const e = ESHK(shkp);
        if (!e) continue;
        if (withbill && !eshkBillCountForNextShkp(e)) continue;
        nextShkpRileIfAngryLikeC(shkp);
        yield shkp;
    }
}

/** C: **`shk.c`** **`onshopbill`** — silent bill lookup. */
function onShopBillObj(obj, shkp) {
    return onBillSlot(obj, shkp) != null;
}

/**
 * C: **`shk.c`** **`find_objowner(obj, x, y)`** — shared shop walls; **`OBJ_ONBILL`** scans bill-holding shks.
 * @param {import('./gstate.js').game} g
 * @returns {object | null}
 */
export function findObjowner(g, obj, x, y) {
    const xh = x | 0;
    const yh = y | 0;
    if ((obj?.where | 0) === OBJ_ONBILL) {
        for (const shkp of iterateNextShkpLikeC(g, true)) {
            if (onShopBillObj(obj, shkp)) return shkp;
        }
        return null;
    }
    const rnos = inRoomsShopbaseRoomnos(g, xh, yh);
    let deflt = null;
    for (const roomno of rnos) {
        const shkp = shopKeeperForLevlRoomno(g, roomno | 0);
        if (!shkp) continue;
        if (onShopBillObj(obj, shkp)) return shkp;
        if (!deflt) deflt = shkp;
    }
    return deflt;
}

/**
 * C: shk.c **`sub_one_frombill`** — remove or shrink bill line; clear **`unpaid`**.
 * Omits C **`newobj`** phantom bill row when **`bquan > obj.quan`** (shrinks **`bquan`** only).
 * @param {object} obj
 * @param {object} shkp
 */
function subOneFromBill(obj, shkp) {
    const eshk = ESHK(shkp);
    const slot = onBillSlot(obj, shkp);
    if (!slot || !eshk?.bill_p) {
        if (obj.unpaid | 0) obj.unpaid = 0;
        return;
    }
    const { bp, idx } = slot;
    obj.unpaid = 0;
    const oq = Math.max(1, obj.quan | 0);
    const bq = Math.max(0, bp.bquan | 0);
    if (bq > oq) {
        bp.bquan = bq - oq;
        return;
    }
    eshk.bill_p.splice(idx, 1);
    if (typeof eshk.billct === 'number') eshk.billct = Math.max(0, (eshk.billct | 0) - 1);
}

/**
 * C: shk.c **`billable`** subset for **`stolen_value`** / bury (**`roomno`** = shop **`levl.roomno`** id).
 * @param {{ shkp: object | null }} shkRef in/out — C **`struct monst **shkpp`**
 */
function billableStolenValue(g, shkRef, obj, roomno, resetNocharge) {
    let shkp = shkRef.shkp;
    if (!shkp) {
        if (!roomno) return false;
        shkp = shopKeeperForLevlRoomno(g, roomno | 0);
        if (!shkp || !inHishop(g, shkp)) return false;
        shkRef.shkp = shkp;
    }
    if (onBillSlot(obj, shkp)) return false;
    const oc = obj.oclass | 0;
    if (oc === NH5_FOOD_CLASS && (obj.oeaten | 0)) return false;
    if (obj.no_charge | 0) {
        if (!Has_contents(obj)
            || (containedGold(obj, true) === 0
                && containedCostStolenBury(g, obj, shkp, 0, false, !resetNocharge) === 0)) {
            shkRef.shkp = null;
        }
        if (resetNocharge && !shkRef.shkp && oc !== NH5_COIN_CLASS) {
            obj.no_charge = 0;
            if (Has_contents(obj)) pickedContainerNoChargeClear(obj);
        }
    }
    return !!shkRef.shkp;
}

/**
 * C: shk.c **`stolen_container`** — nested **`cobj`** / **`nobj`**; floor bury uses **`!no_charge`** (**`ininv` FALSE**).
 * **`billable`/`onbill`/`sub_one_frombill`** when **`eshk.bill_p`** rows exist ( **`bo_id`** or **`obj`** ref).
 */
function stolenContainerMerchBurySilent(g, obj, shkp, ininv) {
    if (!Has_contents(obj)) return 0;
    const eshk = ESHK(shkp);
    const roomno = eshk ? eshkShoproomAsLevlRno(eshk) : 0;
    let price = 0;
    for (let otmp = obj.cobj; otmp; otmp = otmp.nobj) {
        if ((otmp.oclass | 0) === NH5_COIN_CLASS) continue;
        let billamt = 0;
        const shkRef = { shkp };
        if (!billableStolenValue(g, shkRef, otmp, roomno, true)) {
            const shk2 = shkRef.shkp;
            const slot = onBillSlot(otmp, shk2);
            if (slot) {
                billamt = (slot.bp.bquan | 0) * (slot.bp.price | 0);
                subOneFromBill(otmp, shk2);
            }
        }
        if (billamt) {
            price += billamt;
        } else if (ininv ? !!(otmp.unpaid | 0) : !(otmp.no_charge | 0)) {
            price += getPricingUnitsStolenBury(otmp) * getCostStolenBuryUnit(g, otmp, shkp);
        }
        if (Has_contents(otmp)) price += stolenContainerMerchBurySilent(g, otmp, shkp, ininv);
    }
    return price;
}

/**
 * C: shk.c **`stolen_value`** — **`dig.c`** **`bury_objs`** (**`silent` TRUE**); **`dothrow.c`** **`check_shop_obj`**→**`stolen_value`** (**`silent` FALSE**).
 * **`find_objowner`** → **`roomno`** (else first **`in_rooms`** shop room); coin **`quan`**;
 * **`billable`/`onbill`/`sub_one_frombill`** then **`get_pricing_units * get_cost`** (**`obj_oc_cost_data.js`** **`oc_cost`**, **`shk.c`** **`getprice`** + **`get_cost`** including angry **`surcharge`**);
 * **`Has_contents`** → **`stolen_container`** + **`contained_gold(obj, TRUE)`** (floor **`ininv` FALSE**).
 * Still TODO: real **`mons[]`** + **`cnutrit`** for **`corpsenm_price_adj`**, C phantom bill row, **`addtobill`**.
 * @param {object | null} shkpFallback — C bury path has tile shk; used when **`billable`** leaves **`shkp` unset**.
 * @param {boolean} silent — C **`silent`**: when **TRUE**, skip **`You owe…`** / thief **`Norep`** lines and **`angry_guards`** after pursuit; **`check_credit`** plines unchanged.
 * @param {boolean} [billingPeaceful] — when set, C **`stolen_value(..., peaceful, ...)`** uses this instead of current **`mpeaceful`** (**`breakobj`** **`seq_peaceful`**).
 */
export async function stolenValueMerchBurySilent(g, obj, x, y, shkpFallback, silent, billingPeaceful) {
    if (contextLeavingTutorialActiveLikeC(g)) return 0;
    const xh = x | 0;
    const yh = y | 0;
    const owner = findObjowner(g, obj, xh, yh);
    let roomno;
    if (owner) {
        const eo = ESHK(owner);
        roomno = eo ? eshkShoproomAsLevlRno(eo) : 0;
    } else {
        const rnos = inRoomsShopbaseRoomnos(g, xh, yh);
        roomno = rnos[0] | 0;
    }
    const wasUnpaid = !!(obj.unpaid | 0);
    const uCount = Has_contents(obj) ? countUnpaidContentsCobj(obj) : 0;
    const cCount = Has_contents(obj) ? countAllContentsNonCoinCobj(obj) : 0;
    const shkRef = { shkp: /** @type {object | null} */ (null) };
    let billamt = 0;
    if (!billableStolenValue(g, shkRef, obj, roomno, true)) {
        const shk2 = shkRef.shkp;
        const slot = onBillSlot(obj, shk2);
        if (slot) {
            billamt = (slot.bp.bquan | 0) * (slot.bp.price | 0);
            subOneFromBill(obj, shk2);
        }
        if (!slot && !uCount) return 0;
    }
    const shkActive = shkRef.shkp || shkpFallback;
    if (!shkActive) return 0;
    const e = ESHK(shkActive);
    if (!e) return 0;

    const peaceful =
        billingPeaceful !== undefined ? !!billingPeaceful : !!(shkActive.mpeaceful | 0);
    let value = 0;
    let gvalue = 0;
    const oc = obj.oclass | 0;
    if (oc === NH5_COIN_CLASS) {
        gvalue += Math.max(0, obj.quan | 0);
    } else {
        if (billamt) {
            value += billamt;
        } else if (!(obj.no_charge | 0)) {
            value += getPricingUnitsStolenBury(obj) * getCostStolenBuryUnit(g, obj, shkActive);
        }
        if (Has_contents(obj)) {
            value += stolenContainerMerchBurySilent(g, obj, shkActive, false);
            gvalue += containedGold(obj, true);
        }
    }
    if (gvalue + value === 0) return 0;
    value += gvalue;

    if (peaceful) {
        const creditUse = !!(e.credit | 0);
        value = await checkCreditShk(g, value, shkActive);
        if (shkpAngry(shkActive)) e.robbed = (e.robbed | 0) + value;
        else e.debit = (e.debit | 0) + value;
        if (!silent) {
            let still = '';
            if (creditUse) {
                const credAfter = e.credit | 0;
                if (credAfter > 0) {
                    await pline(
                        `You have ${credAfter} ${currencyAmountLikeC(g, credAfter)} credit remaining.`,
                    );
                    return value;
                }
                if (!value) {
                    await pline('You have no credit remaining.');
                    return 0;
                }
                still = 'still ';
            }
            const cur = currencyAmountLikeC(g, value);
            const nm = shknamDisplay(shkActive);
            let tail = '';
            if (uCount > 0) {
                const some = cCount > uCount ? 'some of ' : '';
                const itand = wasUnpaid ? 'it and ' : '';
                tail = ` for ${itand}${some}its contents`;
            } else if (oc !== NH5_COIN_CLASS) {
                tail = (obj.quan | 0) > 1 ? ' for them' : ' for it';
            }
            await pline(`You ${still}owe ${nm} ${value} ${cur}${tail}!`);
        }
        return value;
    }
    e.robbed = (e.robbed | 0) + value;
    if (!silent) {
        if (cansee(shkActive.mx | 0, shkActive.my | 0)) {
            const cust = e?.customer ? String(e.customer) : '';
            if (!cust) {
                const pn = g.plname ? String(g.plname) : 'Player';
                if (e) e.customer = pn.slice(0, 36);
            }
            await pline(`"${g.plname || 'Player'}, you are a thief!"`);
        } else if (!heroDeafShopdig(g)) {
            await pline('You hear a scream, "Thief!"');
        }
    }
    await hotPursuitShk(g, shkActive);
    if (!silent) await angryGuardsSilentLikeC(g, false);
    return value;
}

/**
 * C: dig.c **`bury_objs`** shop pass — walk floor **`nexthere`** at **`(x,y)`** before chain is buried.
 * @returns {{ loss: number, costly: boolean, shkp: object | null }}
 */
export async function applyBuryObjsShopCreditAndDebt(g, x, y) {
    if (contextLeavingTutorialActiveLikeC(g))
        return { loss: 0, costly: false, shkp: null };
    const xh = x | 0;
    const yh = y | 0;
    const monMoving = !!(g.svc?.context?.mon_moving);
    const k = floorObjKey(xh, yh);
    const head = g.level?.floorObjHeads?.get(k);
    const rnos = inRoomsShopbaseRoomnos(g, xh, yh);
    const shkp = rnos.length ? shopKeeperForLevlRoomno(g, rnos[0]) : null;
    const costly = !!(shkp && costlySpot(g, xh, yh));
    let loss = 0;
    if (costly && !monMoving && head) {
        for (let o = head; o; o = o.nexthere) {
            loss += await stolenValueMerchBurySilent(g, o, xh, yh, shkp, true);
            if ((o.oclass | 0) !== NH5_COIN_CLASS) o.no_charge = 1;
        }
    }
    return { loss, costly, shkp };
}

/**
 * C: shk.c addtobill(otmp, …) — unpaid hero destruction in shop.
 * @param {object} _g
 * @param {object} _otmp
 * @param {number} _n
 */
function addtobillFloorStub(_g, _otmp, _n) {
    void _g;
    void _otmp;
    void _n;
}

function removeFloorObjFromLevel(g, otmp) {
    unlinkFloorObject(otmp);
    const arr = g.level?.objects;
    if (arr) {
        const i = arr.indexOf(otmp);
        if (i >= 0) arr.splice(i, 1);
    }
}

/**
 * C: invent.c useupf(obj, numused) — floor stack: **`costly_spot`** billing then **`delobj`** /
 * decrement **`quan`**. Omits **`splitobj`** (mutate stack in place), **`hideunder`**, **`mon_moving`**.
 * @param {typeof game} [g]
 * @param {{ ox?: number, oy?: number, quan?: number }} obj
 * @param {number} numused
 */
export function useupfFloor(g = game, obj, numused) {
    const scrquan = obj.quan ?? 1;
    const n = Math.min(Math.max(0, numused | 0), scrquan);
    if (n <= 0) return;

    /* C: invent.c useupf — costly **`addtobill`** / billing defer while **`leaving_tutorial`** (still consume stack). */
    if (
        !contextLeavingTutorialActiveLikeC(g)
        && costlySpot(g, obj.ox | 0, obj.oy | 0)
    ) {
        /* C: strchr(u.urooms, *in_rooms(...)) ? addtobill : stolen_value — **`addtobill`** still stub. */
        addtobillFloorStub(g, obj, n);
    }

    if (n >= scrquan) removeFloorObjFromLevel(g, obj);
    else obj.quan = scrquan - n;
}

/**
 * C: shk.c adisturb (subset) — peaceful shopkeeper / temple priest / vault guard
 * becomes hostile when struck. No-op if not those roles or already hostile.
 * @param {{ mpeaceful?: number, isshk?: number, ispriest?: number, isgd?: number, mAngry?: number }} mtmp
 */
export async function adisturb(mtmp) {
    if (contextLeavingTutorialActiveLikeC(game)) return;
    if (!mtmp) return;
    const m = /** @type {Record<string, unknown>} */ (mtmp);
    if (!(m.isshk || m.ispriest || m.isgd)) return;
    if (!(mtmp.mpeaceful | 0)) return;
    mtmp.mpeaceful = 0;
    m.mAngry = 1;
    if (m.isshk) await pline('The shopkeeper gets angry!');
    else if (m.ispriest) await pline('The priest gets angry!');
    else await pline('The guard gets angry!');
}

/** C: shk.c **`inhishop`** — used by **`monmove.c`** **`onscary`** (shopkeeper in own shop). */
export { inHishop };
