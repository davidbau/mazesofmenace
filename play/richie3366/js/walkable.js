// walkable.js — Terrain blocking for hero/monster moves (shared stub).
// C ref: hack.c test_move(), crawl_destination(); teleport.c goodpos(), enexto_core() (NEW_ENEXTO);
// monmove.c accessible().

import { game } from './gstate.js';
import {
    ACCESSIBLE,
    DOOR, D_BROKEN, D_CLOSED, D_LOCKED, D_NODOOR, IS_DOOR, IS_OBSTRUCTED, IS_STWALL,
    IRONBARS, W_NONPASSWALL, isok,
    COLNO, ROWNO,
    POOL, MOAT, WATER, LAVAPOOL, LAVAWALL, OTYP_BOULDER,
    ICE, STONE, DRAWBRIDGE_UP, DB_UNDER, DB_ICE, DB_MOAT, DB_LAVA,
    In_sokoban, Is_rogue_level, PM_GRID_BUG, PM_FLOATING_EYE, WT_TOOMUCH_DIAGONAL,
    GP_CHECKSCARY, GP_AVOID_MONPOS, GP_ALLOW_XY, MM_IGNOREWATER, MM_IGNORELAVA,
    xdir, ydir, N_DIRS,
} from './const.js';
import {
    isFlyer, isFloater, isClinger, raceptr, swims, amphibious, fireResistant,
    passesWalls, throwsRocks, amorphous, passesBars,
    bigmonst, isWhirly, slithy, noncorporeal, canFogHero, likesLava, S_EEL,
} from './mondata.js';
import { goodposOnscaryMdatLikeC } from './distfleeck_mon.js';
import { isPoolCellLikeC } from './fillholetyp.js';
import { floorObjKey } from './floorobj.js';
import { rn2 } from './rng.js';
import { CC_NO_FLAGS, collectCoordsLikeC } from './collect_coords.js';

/**
 * C: hack.c may_passwall(x,y)
 * @param {number} x
 * @param {number} y
 * @param {Record<string, unknown>} [g]
 */
export function mayPasswall(x, y, g = game) {
    const loc = g.level?.at(x, y);
    if (!loc) return false;
    return !((IS_STWALL(loc.typ)) && ((loc.wall_info | 0) & W_NONPASSWALL));
}

/** C: monmove.c closed_door — loc must be from `g.level.at`. */
export function isClosedDoorLoc(loc) {
    return loc.typ === DOOR && ((loc.doormask | 0) & (D_CLOSED | D_LOCKED)) !== 0;
}

/**
 * C: hack.c doorless_door(x,y) — archway / broken frame only (rogue level: never "doorless").
 * @param {number} x
 * @param {number} y
 * @param {Record<string, unknown>} [g]
 */
export function doorlessDoorAt(x, y, g = game) {
    const loc = g.level?.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    if (Is_rogue_level(g.u?.uz)) return false;
    const mask = loc.doormask | 0;
    return (mask & ~(D_NODOOR | D_BROKEN)) === 0;
}

/**
 * C: shk.c block_door — shopkeeper blocks diagonal shop exit (debit/bill/robbed).
 * @returns {boolean}
 */
export function blockDoorAt(_x, _y, _g = game) {
    return false;
}

/**
 * C: shk.c block_entry — broken shop door + shk blocks diagonal entry.
 * @returns {boolean}
 */
export function blockEntryAt(_newx, _newy, _g = game) {
    return false;
}

/** C: mkobj.c / decl — boulder on floor stack (teleport.c goodpos `sobj_at(BOULDER, …)`). */
function sobjAtBoulder(x, y, g = game) {
    const heads = g.level?.floorObjHeads;
    if (!heads) return false;
    for (let o = heads.get(floorObjKey(x, y)) ?? null; o; o = o.nexthere) {
        if ((o.otyp | 0) === OTYP_BOULDER) return true;
    }
    return false;
}

/** C: dbridge.c `db_under_typ` — terrain under a raised drawbridge span. */
function dbUnderTypLikeC(mask) {
    switch ((mask | 0) & DB_UNDER) {
        case DB_ICE:
            return ICE;
        case DB_LAVA:
            return LAVAPOOL;
        case DB_MOAT:
            return MOAT;
        default:
            return STONE;
    }
}

/**
 * C: rm.h `SURFACE_AT` — underlying terrain when typ is `DRAWBRIDGE_UP`.
 * @param {number} x
 * @param {number} y
 * @param {Record<string, unknown>} [g]
 */
function surfaceTypAtForGoodposLikeC(x, y, g = game) {
    const loc = g.level?.at(x | 0, y | 0);
    if (!loc) return STONE;
    const typ = loc.typ | 0;
    if (typ === DRAWBRIDGE_UP) return dbUnderTypLikeC(loc.drawbridgemask | 0);
    return typ;
}

/**
 * C: monmove.c `accessible` — `ACCESSIBLE(SURFACE_AT)` && !`closed_door` on raw `levl`.
 * @param {number} x
 * @param {number} y
 * @param {Record<string, unknown>} [g]
 */
export function accessibleAtMonmoveLikeC(x, y, g = game) {
    const loc = g.level?.at(x | 0, y | 0);
    if (!loc) return false;
    if (!ACCESSIBLE(surfaceTypAtForGoodposLikeC(x, y, g))) return false;
    if (isClosedDoorLoc(loc)) return false;
    return true;
}

/**
 * C: teleport.c `goodpos(x, y, NULL, 0)` — objects / `rloco` (no `GP_*`, no monster body checks).
 * Rejects hero square; allows co-location with monsters; uses `accessible` + boulder rule with `mdat==NULL`.
 * @param {number} x
 * @param {number} y
 * @param {Record<string, unknown>} [g]
 */
export function goodposNullMonLikeC(x, y, g = game) {
    if (!isok(x, y)) return false;
    const u = g.u;
    if (u && (u.ux | 0) === (x | 0) && (u.uy | 0) === (y | 0)) return false;
    const loc = g.level?.at(x | 0, y | 0);
    if (!loc) return false;
    if (!accessibleAtMonmoveLikeC(x, y, g)) return false;
    if (sobjAtBoulder(x, y, g)) return false;
    return true;
}

/** C: youprop.h Passes_walls — intrinsic/extrinsic; else innate `passes_walls(raceptr(youmonst))`. */
export function heroPassesWalls(g = game) {
    const u = /** @type {Record<string, unknown>} */ (g.u);
    if ((u?.HPasses_walls | 0) || (u?.EPasses_walls | 0) || (u?.Passes_walls | 0)) return true;
    return passesWalls(raceptr(g.youmonst));
}

function isWaterTerrain(typ) {
    return typ === POOL || typ === MOAT || typ === WATER;
}

function isLavaTerrain(typ) {
    return typ === LAVAPOOL || typ === LAVAWALL;
}

/**
 * True when water/lava at `typ` blocks this body (land-bound on that liquid).
 * @param {*} ptr
 * @param {number} typ
 */
function liquidTerrainBlocksRaceptr(ptr, typ) {
    if (isWaterTerrain(typ)) {
        if (isFlyer(ptr) || isFloater(ptr)) return false;
        if (swims(ptr) || amphibious(ptr)) return false;
        return true;
    }
    if (isLavaTerrain(typ)) {
        if (isFlyer(ptr) || isFloater(ptr)) return false;
        if (fireResistant(ptr)) return false;
        return true;
    }
    return false;
}

/**
 * C: hack.c test_move() — `IS_OBSTRUCTED || IRONBARS`, closed doors.
 * IRONBARS: `passes_walls`/`may_passwall`, `passes_bars` (incl. `dmgtype` AD_RUST/AD_CORR, metallivorous);
 * C also gates `still_chewing` for rust/corr/metallivorous on `DO_MOVE` — not ported (no `context.digging`).
 * @param {*} ptr `raceptr(mtmp)` or `raceptr(youmonst)`.
 * @param {{ hero?: boolean }} [opts] hero: use `heroPassesWalls` for `Passes_walls` intrinsic/extrinsic.
 */
export function physicalObstacleBlocksBody(ptr, x, y, g = game, opts = {}) {
    const hero = !!opts.hero;
    if (!isok(x, y)) return true;
    const loc = g.level?.at(x, y);
    if (!loc) return true;
    const typ = loc.typ;
    const passW = hero ? heroPassesWalls(g) : passesWalls(ptr);

    if (IS_OBSTRUCTED(typ) || typ === IRONBARS) {
        if (passW && mayPasswall(x, y, g)) return false;
        if (typ === IRONBARS && (passW || passesBars(ptr))) return false;
        return true;
    }
    if (isClosedDoorLoc(loc)) return true;
    return false;
}

/**
 * True if (x,y) cannot be walked onto by the **hero** (walls, stone, iron bars, closed doors).
 * C ref: hack.c test_move() obstructed + door slice.
 * @param {number} x
 * @param {number} y
 * @param {Record<string, unknown>} [g]
 */
export function blocksMovementAt(x, y, g = game) {
    return physicalObstacleBlocksBody(raceptr(g.youmonst), x, y, g, { hero: true });
}

/**
 * C: teleport.c goodpos(x, y, &gy.youmonst, 0) — hero-only subset (no GP_* / scary / worm / steed).
 * Another monster on `(x,y)` rejects (hero not in `level.monsters[]` in this harness).
 * @param {number} x
 * @param {number} y
 * @param {Record<string, unknown>} [g]
 */
export function goodposHero(x, y, g = game) {
    if (!isok(x, y)) return false;
    const loc = g.level?.at(x, y);
    if (!loc) return false;
    if (g.level?.monsters?.some((m) => m.mx === x && m.my === y)) return false;

    const typ = loc.typ;
    const ptr = raceptr(g.youmonst);

    if (isWaterTerrain(typ) || isLavaTerrain(typ)) return !terrainBlocksDisplaceForHero(x, y, g);

    if (heroPassesWalls(g) && mayPasswall(x, y, g)) return true;
    if (amorphous(ptr) && isClosedDoorLoc(loc)) return true;

    if (!ACCESSIBLE(typ)) return false;
    if (isClosedDoorLoc(loc)) return false;

    if (sobjAtBoulder(x, y, g) && !throwsRocks(ptr)) return false;
    return true;
}

/**
 * C: teleport.c **`goodpos(x,y,mtmp,0)`** subset for **new** monster placement (no worm, no GP_*).
 * @param {number} x
 * @param {number} y
 * @param {{ data?: import('./mondata.js').Permonst }} mtmp
 * @param {Record<string, unknown>} [g]
 */
/** C: mon.c **`m_in_air`** subset for **`teleport.c`** **`goodpos`**. */
function mInAirMtmpLikeC(mtmp) {
    const ptr = raceptr(mtmp);
    if (isFlyer(ptr) || isFloater(ptr)) return true;
    return isClinger(ptr) && (mtmp.mundetected | 0) !== 0;
}

/** C: dbridge.c **`is_pool(x,y)`** — includes **`is_moat`** (drawbridge under moat, etc.). */
function isPoolCellGoodposLikeC(g, x, y) {
    return isPoolCellLikeC(g, x, y);
}

/**
 * C: teleport.c **`goodpos(x,y,mtmp,gpflags)`** — **`makemon`** / **`enexto`** fakemon path.
 * @param {number} x
 * @param {number} y
 * @param {{ data?: unknown, mnum?: number, mx?: number, my?: number, wormno?: number, m_id?: number }} mtmp
 * @param {number} [gpflags]
 * @param {Record<string, unknown>} [g]
 */
export function goodposMakemonLikeC(x, y, mtmp, gpflags = 0, g = game) {
    if (!isok(x, y)) return false;
    const ignorewater = (gpflags & MM_IGNOREWATER) !== 0;
    const ignorelava = (gpflags & MM_IGNORELAVA) !== 0;
    const checkscary = (gpflags & GP_CHECKSCARY) !== 0;
    const avoidMonpos = (gpflags & GP_AVOID_MONPOS) !== 0;

    const u = g.u;
    if (u && (u.ux | 0) === x && (u.uy | 0) === y) return false;

    if (avoidMonpos && g.level?.monsters?.some((m) => (m.mx | 0) === x && (m.my | 0) === y)) {
        return false;
    }

    const ptr = raceptr(mtmp);
    if (!ptr) return goodposNullMonLikeC(x, y, g);

    if (mtmp) {
        const mtmp2 = g.level?.monsters?.find((m) => (m.mx | 0) === x && (m.my | 0) === y);
        if (mtmp2 && (mtmp2 !== mtmp || (mtmp.wormno | 0))) return false;
    }

    const loc = g.level?.at(x, y);
    if (!loc) return false;

    if (isPoolCellGoodposLikeC(g, x, y) && !ignorewater) {
        if (swims(ptr) || mInAirMtmpLikeC(mtmp)) return true;
        return false;
    }
    if ((ptr.mlet | 0) === S_EEL && !ignorewater) {
        if (rn2(13)) {
            return false;
        }
    }

    if (isLavaTerrain(loc.typ | 0) && !ignorelava) {
        if ((ptr.mnum | 0) === PM_FLOATING_EYE) return false;
        if (mInAirMtmpLikeC(mtmp) || likesLava(ptr)) return true;
        return false;
    }

    if (passesWalls(ptr) && mayPasswall(x, y, g)) return true;
    if (amorphous(ptr) && isClosedDoorLoc(loc)) return true;

    if (checkscary) {
        if (mtmp.m_id) {
            /* full onscary needs m_id — not used for mklev fakemon */
            return false;
        }
        if (goodposOnscaryMdatLikeC(g, x, y, ptr)) return false;
    }

    if (!accessibleAtMonmoveLikeC(x, y, g)) {
        if (!(isPoolCellGoodposLikeC(g, x, y) && ignorewater)
            && !(isLavaTerrain(loc.typ | 0) && ignorelava)) {
            return false;
        }
    }

    if (sobjAtBoulder(x, y, g) && !throwsRocks(ptr)) return false;
    return true;
}

export function goodposNewMonster(x, y, mtmp, g = game) {
    if (!isok(x, y)) return false;
    const u = g.u;
    if (u && (u.ux | 0) === x && (u.uy | 0) === y) return false;
    if (g.level?.monsters?.some((m) => (m.mx | 0) === x && (m.my | 0) === y)) return false;
    const loc = g.level?.at(x, y);
    if (!loc) return false;
    const ptr = raceptr(mtmp);

    const typ = loc.typ;
    if (isWaterTerrain(typ) || isLavaTerrain(typ)) {
        return !terrainBlocksDisplaceForMon(mtmp, x, y, g);
    }

    if (passesWalls(ptr) && mayPasswall(x, y, g)) return true;
    if (amorphous(ptr) && isClosedDoorLoc(loc)) return true;

    if (!ACCESSIBLE(typ)) return false;
    if (isClosedDoorLoc(loc)) return false;

    if (sobjAtBoulder(x, y, g) && !throwsRocks(ptr)) return false;
    return true;
}

/**
 * C: teleport.c **`enexto_core`** (**`NEW_ENEXTO`**) — **`collect_coords`** near then map-wide, **`goodpos`** scan.
 * @param {import('./gstate.js').game} g
 * @param {{ x: number, y: number }} cc — output coord
 * @param {number} xx
 * @param {number} yy
 * @param {import('./mondata.js').Permonst} mdat
 * @param {number} entflags
 * @returns {boolean}
 */
export function enextoCoreLikeC(g, cc, xx, yy, mdat, entflags) {
    const candy = /** @type {{ x: number, y: number }[]} */ (
        new Array(ROWNO * (COLNO - 1))
    );
    const fakemon = { data: mdat, mnum: mdat?.mnum, mx: 0, my: 0, wormno: 0 };
    const allowXy = (entflags & GP_ALLOW_XY) !== 0;

    const nearcandyct = collectCoordsLikeC(candy, xx, yy, 3, CC_NO_FLAGS, null, g);
    for (let i = 0; i < nearcandyct; i++) {
        const c = candy[i];
        if (goodposMakemonLikeC(c.x, c.y, fakemon, entflags, g)) {
            cc.x = c.x;
            cc.y = c.y;
            return true;
        }
    }

    const allcandyct = collectCoordsLikeC(candy, xx, yy, 0, CC_NO_FLAGS, null, g);
    for (let i = nearcandyct; i < allcandyct; i++) {
        const c = candy[i];
        if (goodposMakemonLikeC(c.x, c.y, fakemon, entflags, g)) {
            cc.x = c.x;
            cc.y = c.y;
            return true;
        }
    }

    cc.x = xx;
    cc.y = yy;
    if (allowXy && goodposMakemonLikeC(xx, yy, fakemon, entflags, g)) return true;
    return false;
}

/**
 * C: teleport.c **`enexto_core`** (**`!NEW_ENEXTO`** ring walk) — up to **15** **`goodpos`** candidates, **`rn2`** pick.
 * @param {Record<string, unknown>} g
 * @param {number} xx
 * @param {number} yy
 * @param {{ data?: import('./mondata.js').Permonst }} fakemon
 * @returns {{ x: number, y: number } | null}
 */
export function enextoNearMon(g, xx, yy, fakemon) {
    const MAX_GOOD = 15;
    /** @type {{ x: number; y: number }[]} */
    const good = [];
    const xh = xx | 0;
    const yh = yy | 0;
    const xmax = Math.max(xh - 1, COLNO - 1 - xh);
    const ymax = Math.max(yh - 0, ROWNO - 1 - yh);
    const rangemax = Math.max(xmax, ymax);
    let range = 1;
    while (range <= rangemax && good.length < MAX_GOOD) {
        const xmin = Math.max(1, xh - range);
        const xmax2 = Math.min(COLNO - 1, xh + range);
        const ymin = Math.max(0, yh - range);
        const ymax2 = Math.min(ROWNO - 1, yh + range);
        for (let x = xmin; x <= xmax2 && good.length < MAX_GOOD; x++) {
            if (goodposNewMonster(x, ymin, fakemon, g)) good.push({ x, y: ymin });
            if (good.length >= MAX_GOOD) break;
            if (ymin !== ymax2 && goodposNewMonster(x, ymax2, fakemon, g)) good.push({ x, y: ymax2 });
        }
        if (good.length >= MAX_GOOD) break;
        for (let y = ymin; y < ymax2 && good.length < MAX_GOOD; y++) {
            if (goodposNewMonster(xmin, y, fakemon, g)) good.push({ x: xmin, y });
            if (good.length >= MAX_GOOD) break;
            if (xmin !== xmax2 && goodposNewMonster(xmax2, y, fakemon, g)) good.push({ x: xmax2, y });
        }
        range++;
    }
    if (!good.length) return null;
    const i = rn2(good.length);
    return good[i] ?? null;
}

/**
 * C: hack.c crawl_destination(x, y) — drown escape + findtravelpath one-step diagonal.
 * Does not include test_move’s “diagonal out of doorway” on hero’s tile (C omits it here).
 * @param {number} x
 * @param {number} y
 * @param {Record<string, unknown>} [g]
 */
export function crawlDestinationHero(x, y, g = game) {
    if (!goodposHero(x, y, g)) return false;
    const u = /** @type {{ ux: number, uy: number, Upolyd?: number, umonnum?: number }} */ (g.u);
    if (!u) return false;
    if (x === u.ux || y === u.uy) return true;
    if ((u.Upolyd | 0) && ((u.umonnum | 0) === PM_GRID_BUG)) return false;
    if (heroPassesWalls(g)) return true;
    const destLoc = g.level?.at(x, y);
    if (destLoc && IS_DOOR(destLoc.typ) && (!doorlessDoorAt(x, y, g) || blockDoorAt(x, y, g))) return false;
    const ptr = raceptr(g.youmonst);
    if (badRock(ptr, u.ux, y, g) && badRock(ptr, x, u.uy, g) && cantSqueezeThruHero(g) !== 0) return false;
    return true;
}

/**
 * C: trap.c rnd_nextto_goodpos(&bx, &by, &gy.youmonst) — hero branch (`crawl_destination` per dir).
 * Fisher–Yates shuffle of **`N_DIRS`** indices matches C **`rn2(i)`** swap loop.
 * @param {number} bx
 * @param {number} by
 * @param {Record<string, unknown>} [g]
 * @returns {{ x: number, y: number } | null}
 */
export function rndNexttoGoodposHero(bx, by, g = game) {
    const dirs = /** @type {number[]} */ ([]);
    for (let i = 0; i < N_DIRS; i++) dirs.push(i);
    for (let i = N_DIRS; i > 0; i--) {
        const j = rn2(i);
        const k = dirs[j];
        dirs[j] = dirs[i - 1];
        dirs[i - 1] = k;
    }
    for (let i = 0; i < N_DIRS; i++) {
        const d = dirs[i];
        const nx = bx + xdir[d];
        const ny = by + ydir[d];
        if (crawlDestinationHero(nx, ny, g)) return { x: nx, y: ny };
    }
    return null;
}

/**
 * C: teleport.c goodpos() — order: pool/lava; passes_walls+may_passwall; amorphous+closed_door;
 * physical obstacle (`physicalObstacleBlocksBody`); boulder unless throws_rocks (covers boulder-in-pit).
 * @param {{ data?: unknown }} mtmp
 */
export function terrainBlocksDisplaceForMon(mtmp, x, y, g = game) {
    const loc = g.level?.at(x, y);
    if (!loc) return true;
    const typ = loc.typ;
    const ptr = raceptr(mtmp);

    if (isWaterTerrain(typ) || isLavaTerrain(typ)) {
        if (physicalObstacleBlocksBody(ptr, x, y, g, { hero: false })) return true;
        return liquidTerrainBlocksRaceptr(ptr, typ);
    }

    if (passesWalls(ptr) && mayPasswall(x, y, g)) return false;

    if (amorphous(ptr) && isClosedDoorLoc(loc)) return false;

    if (physicalObstacleBlocksBody(ptr, x, y, g, { hero: false })) return true;

    if (sobjAtBoulder(x, y, g) && !throwsRocks(ptr)) return true;

    return false;
}

/**
 * C: teleport.c goodpos() for hero destination — Levitation/Flying on liquids; `Fire_resistance`;
 * passes_walls / boulder same structure as mon.
 * @param {number} x
 * @param {number} y
 * @param {Record<string, unknown>} [g]
 */
export function terrainBlocksDisplaceForHero(x, y, g = game) {
    const loc = g.level?.at(x, y);
    if (!loc) return true;
    const typ = loc.typ;
    const ptr = raceptr(g.youmonst);

    if (isWaterTerrain(typ) || isLavaTerrain(typ)) {
        if (physicalObstacleBlocksBody(ptr, x, y, g, { hero: true })) return true;
        const u = /** @type {{ Levitation?: number, Flying?: number, Fire_resistance?: number }} */ (g.u);
        if (u?.Levitation || u?.Flying) return false;
        if (!liquidTerrainBlocksRaceptr(ptr, typ)) return false;
        if (isLavaTerrain(typ) && u?.Fire_resistance) return false;
        return true;
    }

    if (heroPassesWalls(g) && mayPasswall(x, y, g)) return false;

    if (amorphous(ptr) && isClosedDoorLoc(loc)) return false;

    if (physicalObstacleBlocksBody(ptr, x, y, g, { hero: true })) return true;

    if (sobjAtBoulder(x, y, g) && !throwsRocks(ptr)) return true;

    return false;
}

/**
 * C: hack.c bad_rock — used with diagonal moves; `passes_walls` on `mdat` only (not extrinsic-only stub).
 * Subset: no `tunnels`/`may_dig` rock-eater escape.
 * @param {*} ptr `raceptr(youmonst)` (or mon `data` when ported).
 */
export function badRock(ptr, x, y, g = game) {
    if (!isok(x, y)) return true;
    const loc = g.level?.at(x, y);
    if (!loc) return true;
    if (In_sokoban(g.u?.uz) && sobjAtBoulder(x, y, g)) return true;
    if (IS_OBSTRUCTED(loc.typ)) {
        if (passesWalls(ptr) && mayPasswall(x, y, g)) return false;
        return true;
    }
    return false;
}

/**
 * C: hack.c cant_squeeze_thru(&gy.youmonst) — return 0 = ok, 1 too big, 2 inventory, 3 sokoban.
 * @returns {0|1|2|3}
 */
export function cantSqueezeThruHero(g = game) {
    if (!g?.u) return 0;
    const ptr = raceptr(g.youmonst);
    if (heroPassesWalls(g)) return 0;
    if (bigmonst(ptr)
        && !(amorphous(ptr) || isWhirly(ptr) || noncorporeal(ptr) || slithy(ptr) || canFogHero(g))) {
        return 1;
    }
    const u = /** @type {{ inv_weight?: number, weight_cap?: number }} */ (g.u);
    const amt = (u?.inv_weight ?? 0) + (u?.weight_cap ?? 0);
    if (amt > WT_TOOMUCH_DIAGONAL) return 2;
    if (In_sokoban(g.u?.uz)) return 3;
    return 0;
}

/**
 * C: hack.c test_move — diagonal: doorway in/out (`doorless_door`/`block_door`/`block_entry`),
 * `bad_rock` corners + `cant_squeeze_thru`, `NODIAG` (`hack.h`). No plines (silent reject).
 * @param {number} dx
 * @param {number} dy
 * @param {number} newx
 * @param {number} newy
 * @param {Record<string, unknown>} [g]
 */
export function diagonalHeroMoveBlocked(dx, dy, newx, newy, g = game) {
    if (!dx || !dy) return false;
    if (!g?.u) return false;
    const u = /** @type {{ ux: number, uy: number, Upolyd?: number, umonnum?: number }} */ (g.u);
    const ptr = raceptr(g.youmonst);
    if ((u.Upolyd | 0) && ((u.umonnum | 0) === PM_GRID_BUG)) return true;

    /* Diagonal into an intact doorway (open door mask, not closed_door). */
    if (!heroPassesWalls(g)) {
        const destLoc = g.level?.at(newx, newy);
        if (destLoc && IS_DOOR(destLoc.typ) && !isClosedDoorLoc(destLoc)) {
            if (!doorlessDoorAt(newx, newy, g) || blockDoorAt(newx, newy, g)) return true;
        }
    }

    if (badRock(ptr, u.ux, newy, g) && badRock(ptr, newx, u.uy, g) && cantSqueezeThruHero(g) !== 0) {
        return true;
    }

    /* Diagonal out of intact doorway (C: after squeeze/worm; must run if corners not both bad_rock). */
    if (!heroPassesWalls(g)) {
        const ustLoc = g.level?.at(u.ux, u.uy);
        if (ustLoc && IS_DOOR(ustLoc.typ) && (!doorlessDoorAt(u.ux, u.uy, g) || blockEntryAt(newx, newy, g))) {
            return true;
        }
    }

    return false;
}
