// melt_ice.js — Ice terrain melts to water (fire trap, zaps, etc.).
// C ref: zap.c melt_ice(), trap.c trap_ice_effects() / cnv_trap_obj(),
//        do.c boulder_hits_pool(), mkobj.c obj_ice_effects(), dig.c unearth_objs(),
//        mon.c minliquid_core() (pool/waterwall/lava/fountain/gremlin/golem/usteed/eel; **`rloc`** subset **`enextoNearMon`**; **`monflee`** land eel; **`split_mon`/`dryup`** gremlin; pool survivor **`water_damage_chain`**+**`rloc(RLOC_NOMSG)`**+**`deal_with_overcrowding`** after **`mondied`/`xkilled`**; lava **`fire_damage_chain`** + **`rloc`** + **`deal_with_overcrowding`**).
//
// Still TODO vs C: corpse **`ROT_ORGANIC`** start on all bury paths; **`bury_objs`** full **`get_cost`**/**`getprice`** / angry surcharge (**`shop.js`** bill rows need **`addtobill`**);
// **`dig.c`/`read.c`** **`buried_ball`/`punish`** (**`floorobj.js`**) — **`placebc`** blind glyphs / **`uswallow`**; beam/breath vectors; **`boulder_hits_pool`** **`recalc_block_point`**/**`wake_nearto`**/**`u.uinwater`**; hero pool on melt uses **`drown.js`** (**`hack.c`** **`spoteffects`** is **`cmd.js`**/**`spoteffects.js`** for normal moves).

import { pline, newsym } from './display.js';
import { vision_recalc, cansee } from './vision.js';
import { tAt, delTrap } from './search.js';
import { maybeHeroPoolEnter } from './drown.js';
import { rnd, rn1, rn2, d } from './rng.js';
import {
    floorObjKey,
    placeFloorObject,
    placeFloorObjectInLevel,
    stackObjOnFloorInLevel,
    prependBuriedObjectInLevel,
    unlinkFloorObject,
    buryFloorChainAt,
    unearthBuriedChainAt,
    obliterateObjectInLevel,
} from './floorobj.js';
import { delEngrAt } from './engrave.js';
import { isPoolOrLavaCellLikeC } from './fillholetyp.js';
import {
    raceptr,
    isFlyer,
    isFloater,
    isClinger,
    cantDrown,
    monsterLeavesCorpse,
    likesLava,
    fireResistant,
    breathless,
    canTeleportMon,
    teleRestrictMon,
    S_EEL,
} from './mondata.js';
import { CORPSE_OTYP, placeCorpseForMonster } from './mkobj_corpse.js';
import { dist2 } from './hacklib.js';
import { heroPassesWalls, enextoNearMon } from './walkable.js';
import { spotStopTimersMeltIceAway, startMeltIceAwayTimer, refirmMeltIceTimerAt } from './level_timers.js';
import { fixWallSpinesRect } from './wall_spine.js';
import { applyBuryObjsShopCreditAndDebt, shknamDisplay } from './shop.js';
import { monflee, ensureMonsterMtrack } from './monflee.js';
import { splitMon, dryupAt } from './split_mon.js';
import { fireDamageChain } from './fire_damage.js';
import { waterDamageChain } from './water_damage.js';
import { dealWithOvercrowding } from './mon_limbo.js';
import { objTimerChecksMkobj, ROT_ICE_ADJUSTMENT } from './obj_rot_timer.js';
import {
    ICE,
    POOL,
    MOAT,
    ICED_POOL,
    ICED_MOAT,
    DB_FLOOR,
    DB_ICE,
    DB_UNDER,
    IS_DRAWBRIDGE,
    IS_POOL,
    IS_LAVA,
    IS_WATERWALL,
    LAVAWALL,
    DRAWBRIDGE_UP,
    TT_LAVA,
    TT_INFLOOR,
    u_at,
    LANDMINE,
    BEAR_TRAP,
    MAGIC_PORTAL,
    VIBRATING_SQUARE,
    isok,
    ROOM,
    OTYP_BOULDER,
    COLNO,
    ROWNO,
    VWALL,
    HWALL,
    IS_WALL,
    Is_waterlevel,
    IS_FOUNTAIN,
    engulfing_u,
    XKILL_NOCORPSE,
    XKILL_NOMSG,
    PM_GREMLIN,
    PM_IRON_GOLEM,
    PM_WATER_ELEMENTAL,
    RLOC_MSG,
    RLOC_NOMSG,
} from './const.js';

/** C: objects.h — LAND_MINE / BEARTRAP (`objects_nums` / obj_oc_skill_data.js). */
const OTYP_LAND_MINE = 244;
const OTYP_BEARTRAP = 245;

/**
 * C: mkobj.c **`obj_ice_effects`** — corpses **`on_ice`** coming off ice: **`obj_timer_checks`** when **`timed`**,
 * else manual age tail (**`ROT_ICE_ADJUSTMENT`**) matching C off-ice branch when **`tleft==0`** path skipped.
 * @param {'floor'|'buried'} where
 */
function objIceCorpsesOffIceChain(g, chainHead, x, y, where) {
    void x;
    void y;
    void where;
    const moves = g.moves ?? 0;
    for (let o = /** @type {any} */ (chainHead); o; o = o.nexthere) {
        if ((o.otyp | 0) !== CORPSE_OTYP || !o.on_ice) continue;
        o.on_ice = 0;
        const age = moves - (o.age | 0);
        o.age = (o.age | 0) + Math.trunc((age * (ROT_ICE_ADJUSTMENT - 1)) / ROT_ICE_ADJUSTMENT);
    }
}

/** C: mkobj.c **`obj_ice_effects(x, y, FALSE)`** — floor: **`obj_timer_checks`** + corpse **`on_ice`** tail (**`TRUE`** path: **`objIceEffectsFreezeAt`**). Exported for **`hack.c`** **`spot_checks`**. */
export function objIceEffectsAt(g, x, y) {
    const head = g.level?.floorObjHeads?.get(floorObjKey(x, y));
    for (let o = head; o; o = o.nexthere) {
        if (o.timed) objTimerChecksMkobj(g, o, x, y, 0, 'floor', isIceAt);
    }
    objIceCorpsesOffIceChain(g, head, x, y, 'floor');
}

/** C: mkobj.c **`obj_ice_effects(x, y, TRUE)`** — **`timed`** objects only (**`dig.c`** **`liquid_flow`**). */
export function objIceEffectsDigLiquidFlowLikeC(g, x, y) {
    const head = g.level?.floorObjHeads?.get(floorObjKey(x, y));
    for (let o = head; o; o = o.nexthere) {
        if (o.timed) objTimerChecksMkobj(g, o, x, y, 0, 'floor', isIceAt);
    }
    const buried = g.level?.buriedObjHeads?.get(floorObjKey(x, y));
    for (let o = buried; o; o = o.nexthere) {
        if (o.timed) objTimerChecksMkobj(g, o, x, y, 0, 'buried', isIceAt);
    }
}

/** C: mkobj.c **`obj_ice_effects`** buried pass — same order before **`unearth_objs`**. */
function objIceEffectsOffIceBuriedAt(g, x, y) {
    const head = g.level?.buriedObjHeads?.get(floorObjKey(x, y));
    for (let o = head; o; o = o.nexthere) {
        if (o.timed) objTimerChecksMkobj(g, o, x, y, 0, 'buried', isIceAt);
    }
    objIceCorpsesOffIceChain(g, head, x, y, 'buried');
}

/** C: dig.c **`unearth_objs(x, y)`** — **`del_engr_at`**, **`newsym`**. */
function unearthObjsAt(g, x, y) {
    unearthBuriedChainAt(g, x, y);
    delEngrAt(x, y);
    newsym(x, y);
}

/**
 * C: dig.c **`bury_objs(x, y)`** — per-object **`stolen_value`** (**`silent` TRUE**) + **`no_charge`**,
 * then **`bury_an_obj`** chain (**`buryFloorChainAt`**), **`del_engr_at`**, **`newsym`**.
 */
async function buryObjsAt(g, x, y) {
    const { loss, costly, shkp } = await applyBuryObjsShopCreditAndDebt(g, x, y);
    buryFloorChainAt(g, x, y);
    delEngrAt(x, y);
    newsym(x, y);
    if (costly && loss && shkp) {
        await pline(`You owe ${shknamDisplay(shkp)} ${loss} zorkmids for burying merchandise.`);
    }
}

/** C: **`dig.c`** **`bury_objs`** — exported for **`do.c`** **`flooreffects`** boulder-in-pit tail. */
export async function buryObjsAtLikeC(g, x, y) {
    return buryObjsAt(g, x, y);
}

/**
 * C: mkobj.c **`obj_ice_effects(x, y, TRUE)`** — floor + buried: **`obj_timer_checks`** for **`timed`** corpses
 * on new ice (**`on_ice`** set inside **`obj_timer_checks`** when rot timer exists).
 * @param {import('./gstate.js').game} g
 */
function objIceEffectsFreezeAt(g, x, y) {
    const k = floorObjKey(x, y);
    const floorH = g.level?.floorObjHeads?.get(k);
    const buriedH = g.level?.buriedObjHeads?.get(k);
    for (let o = floorH; o; o = o.nexthere) {
        if (o.timed) objTimerChecksMkobj(g, o, x, y, 0, 'floor', isIceAt);
    }
    for (let o = buriedH; o; o = o.nexthere) {
        if (o.timed) objTimerChecksMkobj(g, o, x, y, 0, 'buried', isIceAt);
    }
}

/** C: trap.c undestroyable_trap — subset for trap_ice_effects deltrap branch. */
function undestroyableTrapTtyp(ttyp) {
    return ttyp === MAGIC_PORTAL || ttyp === VIBRATING_SQUARE;
}

/** C: mkobj.c mksobj(otyp, init, FALSE) — next_ident + minimal otmp (mklev.js parity). */
function mksobjLikeMelt(otyp, init) {
    const otmp = {
        otyp,
        ox: -1,
        oy: -1,
        quan: 1,
        owt: 1,
        cursed: false,
        blessed: false,
        olocked: false,
        spe: 0,
        opoisoned: 0,
    };
    rnd(2); /* C: next_ident */
    if (init && otmp) {
        if (otyp >= 270 && otyp < 300) {
            const r = rn2(4);
            otmp.cursed = r === 0;
            otmp.blessed = false;
        } else if (otyp >= 230 && otyp < 270) {
            const r = rn2(4);
            otmp.cursed = r === 0;
            otmp.blessed = false;
        }
    }
    return otmp;
}

/**
 * C: trap.c **`cnv_trap_obj(otyp, cnt, ttmp, bury_it)`** — **`place_object`**, **`bury_an_obj`**
 * vs **`stackobj`**, **`newsym`**, hero **`utrap`**, mon **`mtrapped`**, **`deltrap`**.
 * @param {import('./gstate.js').game} g
 * @param {{ tx: number, ty: number, ttyp?: number }} ttmp
 * @param {number} otyp
 * @param {number} cnt
 * @param {boolean} buryIt
 */
export function cnvTrapObjLikeC(g, ttmp, otyp, cnt, buryIt) {
    if (!g || !ttmp) return;
    const otmp = mksobjLikeMelt(otyp, true);
    otmp.quan = Math.max(1, cnt | 0);
    otmp.owt = Math.max(1, otmp.owt | 0);
    /* C: only dart traps keep poison */
    otmp.opoisoned = 0;
    const tx = ttmp.tx | 0;
    const ty = ttmp.ty | 0;
    placeFloorObjectInLevel(g, otmp, tx, ty);
    if (buryIt) prependBuriedObjectInLevel(g, otmp);
    else stackObjOnFloorInLevel(g, otmp);
    newsym(tx, ty);
    const u = g.u;
    if (u && (u.utrap | 0) !== 0 && (u.ux | 0) === tx && (u.uy | 0) === ty) {
        u.utrap = 0;
        u.utraptype = 0;
    }
    const mtmp = g.level?.monsters?.find((m) => (m.mx | 0) === tx && (m.my | 0) === ty);
    if (mtmp && (mtmp.mtrapped | 0)) mtmp.mtrapped = 0;
    delTrap(ttmp);
}

/**
 * C: is_ice(x,y) — ICE terrain, or drawbridge span with DB_ICE underneath.
 * @param {import('./gstate.js').game} g
 */
export function isIceAt(g, x, y) {
    const loc = g.level?.at(x, y);
    if (!loc) return false;
    if (loc.typ === ICE) return true;
    if (IS_DRAWBRIDGE(loc.typ) && (loc.flags & DB_UNDER) === DB_ICE) return true;
    return false;
}

/**
 * C: trap.c trap_ice_effects(x, y, ice_is_melting) when ice_is_melting TRUE.
 * @param {import('./gstate.js').game} g
 */
function trapIceEffectsOnMelt(g, x, y) {
    const ttmp = tAt(x, y);
    if (!ttmp) return;

    const mtmp = g.level?.monsters?.find((m) => m.mx === x && m.my === y);
    if (mtmp && (mtmp.mtrapped | 0)) mtmp.mtrapped = 0;

    if (ttmp.ttyp === LANDMINE || ttmp.ttyp === BEAR_TRAP) {
        const otyp = ttmp.ttyp === LANDMINE ? OTYP_LAND_MINE : OTYP_BEARTRAP;
        cnvTrapObjLikeC(g, ttmp, otyp, 1, false);
    } else if (!undestroyableTrapTtyp(ttmp.ttyp)) {
        delTrap(ttmp);
    }
}

/** C: mkobj.c sobj_at(BOULDER, x, y) — first boulder in floor chain. */
function sobjAtBoulder(g, x, y) {
    const head = g.level?.floorObjHeads?.get(floorObjKey(x, y)) ?? null;
    for (let o = head; o; o = o.nexthere) {
        if ((o.otyp | 0) === OTYP_BOULDER) return o;
    }
    return null;
}

/** C: mon.c **`m_in_air`** — omits **`has_ceiling(&u.uz)`** (stub true like **`trap.js`**). */
function mInAir(mtmp) {
    const ptr = raceptr(mtmp);
    if (isFlyer(ptr) || isFloater(ptr)) return true;
    return isClinger(ptr) && (mtmp.mundetected | 0) !== 0;
}

function killMonsterOnPoolFill(g, mtmp, xkillFlags = 0) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    const x = mtmp.mx | 0;
    const y = mtmp.my | 0;
    mtmp.mhp = 0;
    if (g.level && isok(x, y) && monsterLeavesCorpse(mtmp, g, xkillFlags)) placeCorpseForMonster(mtmp, x, y);
    const arr = g.level?.monsters;
    if (arr) {
        const i = arr.indexOf(mtmp);
        if (i >= 0) arr.splice(i, 1);
    }
}

/**
 * C: mon.c **`minliquid_core`** pool drowning — **`mondied`** vs **`xkilled(XKILL_NOMSG)`**, then if
 * **`!DEADMONSTER(mtmp)`**: **`water_damage_chain(minvent,FALSE)`**, **`rloc(mtmp,RLOC_NOMSG)`**,
 * else **`deal_with_overcrowding`**. **`killMonsterOnPoolFill`** stands in for **`mondied`/`xkilled`**
 * until full monster death (**`lifesaved`**, **`vampshifter`**, &c.) exists.
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 */
async function poolMinliquidMondiedThenSurvivorTail(g, mtmp) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    const monMoving = !!(g.svc?.context?.mon_moving);
    const xkill = monMoving ? 0 : XKILL_NOMSG;
    killMonsterOnPoolFill(g, mtmp, xkill);
    if ((mtmp.mhp | 0) <= 0 || !g.level?.monsters?.includes(mtmp)) return;
    if (mInAir(mtmp)) return;
    const mx = mtmp.mx | 0;
    const my = mtmp.my | 0;
    const vis = cansee(mx, my);
    await waterDamageChain(mtmp.minvent, false, g, { mtmp, visMon: vis });
    if (!(await rlocMinliquidEscape(g, mtmp, RLOC_NOMSG))) await dealWithOvercrowding(g, mtmp);
}

/** C: mon.c minliquid + mondata.c **`on_fire`** death phrase (**`boils away`/`melts away`/`burns to a crisp`**). */
function lavaDestPhraseForMnum(mnum) {
    const m = mnum | 0;
    if (m === PM_WATER_ELEMENTAL) return 'boils away';
    return 'burns to a crisp';
}

function monPlineName(mtmp) {
    const name = mtmp?.monnam || mtmp?.data?.mname;
    return name || 'the monster';
}

function monPlineNameCap(mtmp) {
    const s = monPlineName(mtmp);
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * C: teleport.c **`rloc`/`rloc_to_core`** — minliquid escape subset: **`enextoNearMon`** + **`newsym`**.
 * Omits **`u.usteed`→`tele()`**, random **`collect_coords`** scan, **`rloc_pos_ok`** (**`onscary`**, regions),
 * worm tails, shop **`stolen_value`**, appear/vanish phrasing vs full **`distu`**.
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @param {number} flags — **`RLOC_MSG`** / **`RLOC_NOMSG`**
 */
async function rlocMinliquidEscape(g, mtmp, flags) {
    if (!mtmp) return false;
    const u = g.u;
    if (u && mtmp === u.usteed) return false;
    const ox = mtmp.mx | 0;
    const oy = mtmp.my | 0;
    if (!isok(ox, oy)) return false;
    const dest = enextoNearMon(g, ox, oy, mtmp);
    if (!dest) return false;
    const nx = dest.x | 0;
    const ny = dest.y | 0;
    if (nx === ox && ny === oy) return false;
    if (!g.level?.at(nx, ny)) return false;
    mtmp.mx = nx;
    mtmp.my = ny;
    newsym(ox, oy);
    newsym(nx, ny);
    const f = flags | 0;
    if ((f & RLOC_MSG) !== 0 && (f & RLOC_NOMSG) === 0 && (cansee(ox, oy) || cansee(nx, ny))) {
        await pline(`${monPlineNameCap(mtmp)} vanishes!`);
    }
    return true;
}

/**
 * C: do.c boulder_hits_pool — fill path: terrain, mondied (skip m_in_air), delfloortrap,
 * bury_objs, newsym; drawbridge-up keeps typ, sets DB_FLOOR on loc.flags mask.
 * Deferred vs C: recalc_block_point, wake_nearto, u.uinwater / next2u lava splash, waterbody_name.
 * @param {import('./gstate.js').game} g
 * @returns {Promise<boolean>} false when not pool/lava (C would impossible from melt_ice)
 */
/**
 * C: **`do.c`** **`boulder_hits_pool(otmp, rx, ry, pushing)`** — pool/lava fill vs sink;
 * boulder always consumed (**`obfree`/`useupf`** in C). Safe when **`otmp`** is not yet **`place_object`**’d
 * (**`flooreffects`** before **`place_object`**): **`obliterateObjectInLevel`** clears floor/invent links.
 * @param {import('./gstate.js').game} g
 * @returns {Promise<boolean>} true when **`is_pool_or_lava`**
 */
export async function boulderHitsPoolLikeC(g, otmp, rx, ry, pushing) {
    if (!otmp || (otmp.otyp | 0) !== OTYP_BOULDER) return false;
    const loc = g.level?.at(rx, ry);
    if (!loc) return false;
    const typ = loc.typ | 0;
    const lava = IS_LAVA(typ);
    const poolOrLava = IS_POOL(typ) || lava;
    if (!poolOrLava) return false;

    const what = lava ? 'lava' : 'water';
    const chance = rn2(10); /* C: before fills_up — plane 0%, waterwall 50%, lava 10%, else water 90% */
    const fillsUp = Is_waterlevel(g.u?.uz)
        ? false
        : IS_WATERWALL(typ)
            ? chance < 5
            : lava
                ? chance === 0
                : chance !== 0;

    if (fillsUp) {
        const ttmp = tAt(rx, ry);
        if (typ === DRAWBRIDGE_UP) {
            loc.flags = ((loc.flags | 0) & ~DB_UNDER) | DB_FLOOR;
        } else {
            loc.typ = ROOM;
            loc.flags = 0;
            /* C: recalc_block_point(rx,ry); JS block_point not ported */
        }
        const mtmp = g.level?.monsters?.find((m) => m.mx === rx && m.my === ry);
        if (mtmp && (mtmp.mhp | 0) > 0 && !mInAir(mtmp)) killMonsterOnPoolFill(g, mtmp);
        if (ttmp) delTrap(ttmp);
        await buryObjsAt(g, rx, ry);
        newsym(rx, ry);
        const u = g.u;
        const verbose = !!(g.flags?.verbose);
        if (pushing) {
            await pline(`You push the boulder into the ${what}.`);
            if (verbose && !u?.ublind && !(u?.timed?.blind)) await pline('Now you can cross it!');
        }
    }

    const u = g.u;
    const verbose = !!(g.flags?.verbose);
    if (!fillsUp || !pushing) {
        const seeSplash = pushing ? !(u?.ublind) && !(u?.timed?.blind) : cansee(rx, ry) || u_at(rx, ry);
        if (seeSplash) {
            const verb = fillsUp ? 'fills' : 'falls into';
            await pline(`There is a large splash as the boulder ${verb} the ${what}.`);
        }
        if (!fillsUp && verbose && (pushing ? !(u?.ublind) : cansee(rx, ry))) {
            await pline('It sinks without a trace!');
        }
    }

    obliterateObjectInLevel(g, otmp);
    return true;
}

/**
 * C: **`apply.c`** **`maybe_dunk_boulders(x, y)`** — while square is pool or lava and a boulder
 * sits there, **`obj_extract_self`** then **`boulder_hits_pool(..., FALSE)`**.
 * @param {import('./gstate.js').game} g
 */
export async function maybeDunkBouldersLikeC(g, x, y) {
    const xi = x | 0;
    const yi = y | 0;
    while (isPoolOrLavaCellLikeC(g, xi, yi)) {
        const otmp = sobjAtBoulder(g, xi, yi);
        if (!otmp) break;
        unlinkFloorObject(otmp);
        await boulderHitsPoolLikeC(g, otmp, xi, yi, false);
    }
}

/**
 * C: mon.c **`minliquid_core`** — liquid/fountain vs monster (**`melt_ice`** pool fill, etc.).
 * Still TODO: full **`rloc`** (**`usteed`/`tele()`**, **`collect_coords`**, **`rloc_pos_ok`**),
 * full **`mondied`/`xkilled`** (pool survivor tail only runs when **`DEADMONSTER`** false after death),
 * full **`monflee`** (**`release_hero`**, **`flees_light`**, vrock), full **`on_fire`** / Gehennom **`noteleport`** / covetous bypass.
 * @param {import('./gstate.js').game} g
 */
async function minliquidMonsterAfterMelt(g, mtmp) {
    if (!mtmp) return;
    const x = mtmp.mx | 0;
    const y = mtmp.my | 0;
    const loc = g.level?.at(x, y);
    if (!loc) return;
    const typ = loc.typ | 0;
    const ptr = raceptr(mtmp);
    const waterwall = IS_WATERWALL(typ);
    const inpool = IS_POOL(typ)
        && (!(isFlyer(ptr) || isFloater(ptr)) || Is_waterlevel(g.u?.uz));
    const inlava = IS_LAVA(typ) && !(isFlyer(ptr) || isFloater(ptr));
    const infountain = IS_FOUNTAIN(typ);

    const u = g.u;
    if (u && mtmp === u.usteed && ((u.Flying | 0) || (u.Levitation | 0)) && !waterwall) return;

    if ((mtmp.mnum | 0) === PM_GREMLIN && (inpool || infountain) && rn2(3)) {
        /* C: mon.c — split_mon(mtmp,0); if true dryup(mx,my,FALSE); water_damage_chain(minvent,FALSE) */
        if (await splitMon(g, mtmp, null)) await dryupAt(g, x, y, false);
        if (inpool) {
            const vis = cansee(x, y);
            await waterDamageChain(mtmp.minvent, false, g, { mtmp, visMon: vis });
        }
        return;
    }
    if ((mtmp.mnum | 0) === PM_IRON_GOLEM && inpool && !rn2(5)) {
        const dam = d(2, 6);
        if (cansee(x, y)) await pline(`${monPlineNameCap(mtmp)} rusts.`);
        mtmp.mhp = (mtmp.mhp | 0) - dam;
        if ((mtmp.mhpmax | 0) > dam) mtmp.mhpmax = (mtmp.mhpmax | 0) - dam;
        if ((mtmp.mhp | 0) <= 0) {
            killMonsterOnPoolFill(g, mtmp, 0);
            return;
        }
        if (mtmp.minvent) {
            const vis = cansee(x, y);
            await waterDamageChain(mtmp.minvent, false, g, { mtmp, visMon: vis });
        }
        return;
    }

    const monMoving = !!(g.svc?.context?.mon_moving);

    if (inlava) {
        if (!isClinger(ptr) && !likesLava(ptr)) {
            if (canTeleportMon(ptr) && !teleRestrictMon(g, mtmp)) {
                if (await rlocMinliquidEscape(g, mtmp, RLOC_MSG)) return;
            }
            if (!fireResistant(ptr)) {
                if (cansee(x, y)) {
                    const how = lavaDestPhraseForMnum(mtmp.mnum | 0);
                    await pline(`${monPlineNameCap(mtmp)} ${how}.`);
                }
                if ((mtmp.mhp | 0) > 0) killMonsterOnPoolFill(g, mtmp, XKILL_NOCORPSE);
            } else {
                mtmp.mhp = (mtmp.mhp | 0) - 1;
                if ((mtmp.mhp | 0) <= 0) {
                    if (cansee(x, y)) await pline(`${monPlineNameCap(mtmp)} surrenders to the fire.`);
                    killMonsterOnPoolFill(g, mtmp, XKILL_NOCORPSE);
                } else if (cansee(x, y)) {
                    await pline(`${monPlineNameCap(mtmp)} burns slightly.`);
                }
            }
            if ((mtmp.mhp | 0) > 0 && g.level?.monsters?.includes(mtmp)) {
                if (!mInAir(mtmp) && !likesLava(ptr)) {
                    const vis = cansee(x, y);
                    if (mtmp.minvent) {
                        await fireDamageChain(mtmp.minvent, false, false, x, y, g, { mtmp, visMon: vis });
                    }
                    if (!(await rlocMinliquidEscape(g, mtmp, RLOC_MSG))) await dealWithOvercrowding(g, mtmp);
                }
            }
        }
        return;
    }

    if (inpool || waterwall) {
        if ((waterwall || !isClinger(ptr)) && !cantDrown(ptr)) {
            if (canTeleportMon(ptr) && !teleRestrictMon(g, mtmp)) {
                if (await rlocMinliquidEscape(g, mtmp, RLOC_MSG)) return;
            }
            const name = monPlineName(mtmp);
            if (cansee(x, y)) {
                if (monMoving) await pline(`${monPlineNameCap(mtmp)} drowns.`);
                else await pline(`You drown ${name}.`);
            }
            if (engulfing_u(mtmp)) {
                await pline(`${monPlineNameCap(mtmp)} sinks as water rushes in and flushes you out.`);
            }
            await poolMinliquidMondiedThenSurvivorTail(g, mtmp);
        }
        return;
    }

    if ((ptr.mlet | 0) === S_EEL && !Is_waterlevel(g.u?.uz) && !breathless(ptr)) {
        if ((mtmp.mhp | 0) > 1 && rn2(mtmp.mhp | 0) > rn2(8)) mtmp.mhp = (mtmp.mhp | 0) - 1;
        /* C: monmove.c monflee(mtmp, 2, FALSE, FALSE) */
        ensureMonsterMtrack(mtmp);
        await monflee(g, mtmp, 2, false, false);
    }
}

/**
 * C: zap.c zap_over_floor() — **`ZT_COLD`** on pool / moat / lava / drawbridge / waterwall / existing ice (subset).
 * Schedules **`start_melt_ice_timeout`** when non-lava water becomes **`ICE`** or drawbridge span gains **`DB_ICE`**.
 * @param {import('./gstate.js').game} g
 * @param {boolean} seeIt — C **`see_it`**
 * @returns {Promise<number>} C **`zap_over_floor`** **`rangemod`** contribution for this tile
 */
export async function coldZapHitsWaterAt(g, x, y, seeIt) {
    if (isIceAt(g, x, y)) {
        refirmMeltIceTimerAt(g, x, y);
        return 0;
    }
    const loc = g.level?.at(x, y);
    if (!loc) return 0;
    const typ = loc.typ | 0;
    const lavawall = typ === LAVAWALL;

    if (IS_WATERWALL(typ)) {
        if (seeIt) await pline('The water freezes for a moment.');
        else if (g.u && dist2(x, y, g.u.ux | 0, g.u.uy | 0) <= 9) await pline('You hear a soft crackling.');
        return -1000;
    }

    /* C: zap.c zap_over_floor ZT_COLD — lavawall + temperature vs full solidify */
    if (lavawall) {
        const temp = (g.level?.flags?.temperature ?? 0) | 0;
        const chance = Math.max(2, 5 + temp * 10);
        if (rn2(chance)) {
            if (seeIt) await pline('The lava freezes for a moment.');
            else if (g.u && dist2(x, y, g.u.ux | 0, g.u.uy | 0) <= 9) await pline('You hear a soft crackling.');
            return -1000;
        }
    }

    if (IS_LAVA(typ)) {
        await buryObjsAt(g, x, y);
        let spineX1 = x;
        let spineY1 = y;
        let spineX2 = x;
        let spineY2 = y;
        if (lavawall) {
            const nWall = isok(x, y - 1) && IS_WALL(g.level?.at(x, y - 1)?.typ | 0);
            const sWall = isok(x, y + 1) && IS_WALL(g.level?.at(x, y + 1)?.typ | 0);
            loc.typ = (nWall || sWall) ? VWALL : HWALL;
            loc.horizontal = loc.typ === HWALL;
            loc.flags = 0;
            spineX1 = Math.max(0, x - 1);
            spineY1 = Math.max(0, y - 1);
            spineX2 = Math.min(COLNO - 1, x + 1);
            spineY2 = Math.min(ROWNO - 1, y + 1);
            fixWallSpinesRect(g, spineX1, spineY1, spineX2, spineY2);
            g.vision_full_recalc = 1;
        } else {
            loc.typ = ROOM;
            loc.flags = 0;
        }
        if (seeIt) await pline('The lava cools and solidifies.');
        if (lavawall) {
            for (let xi = spineX1; xi <= spineX2; xi++) {
                for (let yi = spineY1; yi <= spineY2; yi++) {
                    newsym(xi, yi);
                }
            }
        } else {
            newsym(x, y);
        }

        const u = g.u;
        if (u && u_at(x, y) && (u.utrap | 0) !== 0 && (u.utraptype | 0) === TT_LAVA) {
            if (heroPassesWalls(g)) {
                await pline('You pass through the now-solid rock.');
                u.utrap = 0;
                u.utraptype = 0;
            } else {
                u.utrap = rn1(50, 20);
                u.utraptype = TT_INFLOOR;
                await pline('You are firmly stuck in the cooling rock.');
            }
            g.disp = g.disp || {};
            g.disp.botl = true;
        }
        return -3;
    }

    if (typ === DRAWBRIDGE_UP) {
        await buryObjsAt(g, x, y);
        loc.flags = (loc.flags & ~DB_UNDER) | DB_ICE;
        if (seeIt) await pline('The water under the drawbridge freezes solid.');
        else if (g.u && dist2(x, y, g.u.ux | 0, g.u.uy | 0) <= 9) await pline('You hear a crackling sound.');
        newsym(x, y);
        startMeltIceAwayTimer(g, x, y, 0);
        objIceEffectsFreezeAt(g, x, y);
        return -3;
    }

    if (typ === POOL || typ === MOAT) {
        await buryObjsAt(g, x, y);
        const moat = typ === MOAT;
        loc.flags = (loc.flags & ~(ICED_POOL | ICED_MOAT)) | (typ === POOL ? ICED_POOL : ICED_MOAT);
        loc.typ = ICE;
        if (seeIt) {
            if (moat) await pline('The moat is bridged with ice!');
            else await pline('The water freezes.');
        } else if (g.u && dist2(x, y, g.u.ux | 0, g.u.uy | 0) <= 9) {
            await pline('You hear a crackling sound.');
        }
        newsym(x, y);

        const u = g.u;
        if (u && u_at(x, y) && (u.underwater | 0)) {
            u.underwater = 0;
            g.vision_full_recalc = 1;
        }
        const mtmp = g.level?.monsters?.find((m) => m.mx === x && m.my === y);
        if (mtmp && (mtmp.mundetected | 0) && swims(raceptr(mtmp))) mtmp.mundetected = 0;

        startMeltIceAwayTimer(g, x, y, 0);
        objIceEffectsFreezeAt(g, x, y);
        return -3;
    }
    return 0;
}

/**
 * C: zap.c melt_ice(x, y, msg) — order matched; some helpers still stubs (see file header).
 * @param {import('./gstate.js').game} g
 * @param {string|null|undefined} msg — null/undefined → default Norep string
 */
export async function meltIceAt(g, x, y, msg) {
    if (!isIceAt(g, x, y)) return;

    const text = msg ?? 'The ice crackles and melts.';
    const loc = g.level?.at(x, y);
    if (!loc) return;

    if (IS_DRAWBRIDGE(loc.typ)) {
        loc.flags &= ~DB_ICE;
    } else if (loc.typ === ICE) {
        const moatIce = (loc.flags & ICED_MOAT) !== 0;
        const poolIce = (loc.flags & ICED_POOL) !== 0;
        loc.typ = !moatIce && poolIce ? POOL : MOAT;
        loc.flags &= ~(ICED_POOL | ICED_MOAT);
    }

    spotStopTimersMeltIceAway(g, x, y);
    if (tAt(x, y)) trapIceEffectsOnMelt(g, x, y);
    objIceEffectsAt(g, x, y);
    /* C **`melt_ice`** only **`obj_ice_effects(FALSE)`** (floor); buried corpses **`on_ice`** from freeze need the same off-ice age fix before **`unearth_objs`**. */
    objIceEffectsOffIceBuriedAt(g, x, y);
    unearthObjsAt(g, x, y);

    const u = g.u;
    if ((u?.underwater | 0) !== 0) vision_recalc(1);

    newsym(x, y);

    if (cansee(x, y) || u_at(x, y)) await pline(text);

    const poolStill = () => {
        const l = g.level?.at(x, y);
        return !!(l && IS_POOL(l.typ | 0));
    };
    if (sobjAtBoulder(g, x, y)) {
        if (cansee(x, y) || u_at(x, y)) await pline('A boulder settles...');
        let otmp;
        do {
            otmp = sobjAtBoulder(g, x, y);
            if (!otmp) break;
            unlinkFloorObject(otmp);
            if (!(await boulderHitsPoolLikeC(g, otmp, x, y, false))) break;
        } while (poolStill() && sobjAtBoulder(g, x, y));
        newsym(x, y);
    }

    if (u_at(x, y) && u) {
        await maybeHeroPoolEnter(g, { fromDx: u.dx | 0, fromDy: u.dy | 0 });
    } else if (IS_POOL(g.level?.at(x, y)?.typ | 0)) {
        const mtmp = g.level?.monsters?.find((m) => m.mx === x && m.my === y);
        if (mtmp) await minliquidMonsterAfterMelt(g, mtmp);
    }
}

/** C: mon.c **`minliquid(mtmp)`** — export for **`dig.c`** **`liquid_flow`**. */
export async function minliquidMonsterAtCellLikeC(g, mtmp) {
    return minliquidMonsterAfterMelt(g, mtmp);
}
