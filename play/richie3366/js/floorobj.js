// floorobj.js — Floor object chains (nexthere) at (x,y).
// C ref: mkobj.c place_object(), rm.c / invent floor lists;
//        dig.c bury_objs() / unearth_objs() (**`buriedObjHeads`**, **`stackobj`**, **`buried_ball`**),
//        dig.c buried_ball_to_freedom() / read.c punish() (**`buried_ball_to_punishment`** unearthed ball).
//
// Shared by mklev.js and trap/missile code so traps can drop projectiles
// without importing the full level generator.

import { game } from './gstate.js';
import { NH5_BALL_CLASS, NH5_CHAIN_CLASS } from './nh5_objclass.js';
import {
    TT_BURIEDBALL, TT_INFLOOR, ROT_ORGANIC,
    OTYP_HEAVY_IRON_BALL, OTYP_IRON_CHAIN, WT_IRON_BALL_BASE, WT_IRON_BALL_INCR,
} from './const.js';
import { dist2 } from './hacklib.js';
import { rnd } from './rng.js';
import { newsym } from './display.js';
import { permonstHuman, amorphous, isWhirly, unsolid } from './mondata.js';
import { stopNhObjTimer } from './obj_rot_timer.js';

/** C: mkobj_corpse.js **`CORPSE_OTYP`** — local literal avoids **`floorobj`↔`mkobj_corpse`** import cycle. */
const CORPSE_OTYP = 471;

export function floorObjKey(x, y) {
    return `${x},${y}`;
}

/** C: invent.c **`mergable(otmp, obj)`** subset for floor **`stackobj`** (no glob / oil / rider / bill). */
function mergableFloorStackSubset(otmp, obj) {
    if (!otmp || !obj || otmp === obj) return false;
    if ((otmp.otyp | 0) !== (obj.otyp | 0)) return false;
    if ((otmp.nomerge | 0) || (obj.nomerge | 0)) return false;
    if ((otmp.cursed | 0) !== (obj.cursed | 0) || (otmp.blessed | 0) !== (obj.blessed | 0)) return false;
    if ((otmp.unpaid | 0) !== (obj.unpaid | 0) || (otmp.no_charge | 0) !== (obj.no_charge | 0)) return false;
    if ((otmp.spe | 0) !== (obj.spe | 0)) return false;
    if ((otmp.otyp | 0) === CORPSE_OTYP && (otmp.corpsenm | 0) !== (obj.corpsenm | 0)) return false;
    return true;
}

/**
 * C: invent.c **`stackobj(obj)`** after **`place_object`** — merge **`obj`** into another floor stack at **`(ox,oy)`**.
 * Survivor is **`obj`** (C **`merged(&obj,&otmp)`** absorbs **`otmp`** into **`obj`**).
 * @returns {boolean} true when **`obj`** absorbed another stack (**`merged`** path)
 */
export function stackObjOnFloorInLevel(g, obj) {
    const lvl = g.level;
    if (!lvl?.floorObjHeads || !obj) return false;
    const k = floorObjKey(obj.ox | 0, obj.oy | 0);
    const head = lvl.floorObjHeads.get(k);
    for (let otmp = head; otmp; otmp = otmp.nexthere) {
        if (otmp === obj) continue;
        if (!mergableFloorStackSubset(obj, otmp)) continue;
        obj.quan = (obj.quan | 0) + (otmp.quan | 0);
        obj.owt = Math.max(1, (obj.owt | 0) + (otmp.owt | 0));
        unlinkFloorObjectInLevel(g, otmp);
        const arr = lvl.objects;
        if (arr) {
            const i = arr.indexOf(otmp);
            if (i >= 0) arr.splice(i, 1);
        }
        otmp.nexthere = null;
        return true;
    }
    return false;
}

/** C: take off chain before move — remove otmp from floorObjHeads at its coords (**`game.level`**). */
export function unlinkFloorObject(otmp) {
    const lvl = game.level;
    if (!lvl?.floorObjHeads || !otmp || otmp.ox < 0 || otmp.oy < 0) return;
    const k = floorObjKey(otmp.ox, otmp.oy);
    const head = lvl.floorObjHeads.get(k) ?? null;
    if (head === otmp) {
        if (otmp.nexthere) lvl.floorObjHeads.set(k, otmp.nexthere);
        else lvl.floorObjHeads.delete(k);
    } else if (head) {
        let cur = head;
        while (cur?.nexthere) {
            if (cur.nexthere === otmp) {
                cur.nexthere = otmp.nexthere;
                break;
            }
            cur = cur.nexthere;
        }
    }
    otmp.nexthere = null;
}

/** C: **`unlinkFloorObject`** with explicit **`g.level`** (avoid **`game`** mismatch). */
export function unlinkFloorObjectInLevel(g, otmp) {
    const lvl = g.level;
    if (!lvl?.floorObjHeads || !otmp || otmp.ox < 0 || otmp.oy < 0) return;
    const k = floorObjKey(otmp.ox, otmp.oy);
    const head = lvl.floorObjHeads.get(k) ?? null;
    if (head === otmp) {
        if (otmp.nexthere) lvl.floorObjHeads.set(k, otmp.nexthere);
        else lvl.floorObjHeads.delete(k);
    } else if (head) {
        let cur = head;
        while (cur?.nexthere) {
            if (cur.nexthere === otmp) {
                cur.nexthere = otmp.nexthere;
                break;
            }
            cur = cur.nexthere;
        }
    }
    otmp.nexthere = null;
}

/** C: **`rm.c`**-style remove from **`buriedObjHeads`** at **`otmp.ox`/`otmp.oy`**. */
export function unlinkBuriedObjectInLevel(g, otmp) {
    const lvl = g.level;
    if (!lvl?.buriedObjHeads || !otmp || otmp.ox < 0 || otmp.oy < 0) return;
    const k = floorObjKey(otmp.ox, otmp.oy);
    const head = lvl.buriedObjHeads.get(k) ?? null;
    if (head === otmp) {
        if (otmp.nexthere) lvl.buriedObjHeads.set(k, otmp.nexthere);
        else lvl.buriedObjHeads.delete(k);
    } else if (head) {
        let cur = head;
        while (cur?.nexthere) {
            if (cur.nexthere === otmp) {
                cur.nexthere = otmp.nexthere;
                break;
            }
            cur = cur.nexthere;
        }
    }
    otmp.nexthere = null;
}

/**
 * C: mkobj.c **`place_object(otmp, x, y)`** with explicit **`g.level`**.
 * @param {import('./gstate.js').game} g
 */
export function placeFloorObjectInLevel(g, otmp, x, y) {
    const lvl = g.level;
    if (!lvl || !otmp) return;
    const xi = x | 0;
    const yi = y | 0;
    if (otmp.ox >= 0 && otmp.oy >= 0 && (otmp.ox !== xi || otmp.oy !== yi)) unlinkFloorObjectInLevel(g, otmp);
    if (!lvl.floorObjHeads) lvl.floorObjHeads = new Map();
    const k = floorObjKey(xi, yi);
    otmp.ox = xi;
    otmp.oy = yi;
    const prev = lvl.floorObjHeads.get(k) ?? null;
    otmp.nexthere = prev;
    lvl.floorObjHeads.set(k, otmp);
    if (!lvl.objects.includes(otmp)) lvl.objects.push(otmp);
}

/** @param {import('./gstate.js').game} g */
function heroPermonstForPunish(g) {
    const u = g.u;
    if (!(u?.Upolyd | 0)) return g.urace?.permonst ?? permonstHuman;
    return g.youmonst?.data ?? permonstHuman;
}

/** C: engrave.c del_engr_at — explicit **`g.level`** (avoid **`game`** mismatch). */
function delEngrAtInLevel(g, x, y) {
    const L = g.level;
    if (!L?.engravings?.length) return;
    const xi = x | 0;
    const yi = y | 0;
    const n = L.engravings.length;
    L.engravings = L.engravings.filter((e) => e.engr_x !== xi || e.engr_y !== yi);
    if (L.engravings.length < n) newsym(xi, yi);
}

/** C: **`o_init.c`** **`init_oclass_probs`** — NH **5.0.0** **`objects.h`** single **`IRON_CHAIN`** and **`HEAVY_IRON_BALL`** per class (**`oc_prob`** **1000**). */
const MKOBJ_OCLASS_PROB_CHAIN_OR_BALL_SINGLETON = 1000;

/**
 * C: **`mkobj.c`** **`mkobj(CHAIN_CLASS, TRUE)`** — **`rnd(go.oclass_prob_totals[CHAIN_CLASS])`** + **`mksobj`** (**`CHAIN_CLASS`** **`mksobj_init`** is empty; chain stays uncursed).
 */
export function mksobjIronChainMkobjPunishLikeC() {
    rnd(MKOBJ_OCLASS_PROB_CHAIN_OR_BALL_SINGLETON);
    return {
        otyp: OTYP_IRON_CHAIN,
        oclass: NH5_CHAIN_CLASS,
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
}

/**
 * C: **`mkobj.c`** **`mkobj(BALL_CLASS, TRUE)`** — same **`rnd(oclass_prob_total)`** pattern as chain (**`BALL_CLASS`** init empty).
 */
export function mksobjHeavyIronBallMkobjPunishLikeC() {
    rnd(MKOBJ_OCLASS_PROB_CHAIN_OR_BALL_SINGLETON);
    return {
        otyp: OTYP_HEAVY_IRON_BALL,
        oclass: NH5_BALL_CLASS,
        ox: -1,
        oy: -1,
        quan: 1,
        owt: WT_IRON_BALL_BASE,
        cursed: false,
        blessed: false,
        olocked: false,
        spe: 0,
        opoisoned: 0,
    };
}

/**
 * C: read.c **`punish(sobj)`** subset when **`sobj`** is unearthed **`HEAVY_IRON_BALL`** (**`reuse_ball`** path).
 * Skips **`setworn`/`placebc`** vision blind details; **`amorphous`** branch matches **`dropy(reuse_ball)`**.
 * @param {import('./gstate.js').game} g
 */
function punishUnearthedIronBallRead(g, ball) {
    const u = g.u;
    if (!u || !ball) return;
    const ptr = heroPermonstForPunish(g);
    if (amorphous(ptr) || isWhirly(ptr) || unsolid(ptr)) {
        placeFloorObjectInLevel(g, ball, u.ux | 0, u.uy | 0);
        stackObjOnFloorInLevel(g, ball);
        return;
    }
    if (g.uball) {
        const levy = ball.cursed ? 1 : 0;
        g.uball.owt = (g.uball.owt | 0) + WT_IRON_BALL_INCR * (1 + levy);
        if (ball !== g.uball) {
            const arr = g.level?.objects;
            const i = arr ? arr.indexOf(ball) : -1;
            if (i >= 0) arr.splice(i, 1);
            ball.nexthere = null;
        }
        return;
    }
    const chain = mksobjIronChainMkobjPunishLikeC();
    g.uchain = chain;
    g.uball = ball;
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    placeFloorObjectInLevel(g, ball, ux, uy);
    stackObjOnFloorInLevel(g, ball);
    placeFloorObjectInLevel(g, chain, ux, uy);
    stackObjOnFloorInLevel(g, chain);
}

/**
 * C: dig.c **`buried_ball(coord *cc)`** — walk buried objects; exact **`HEAVY_IRON_BALL`** at **`cc`** wins;
 * else nearest within **`dist2 <= 8`** (**`bdist`** tie: first seen in map iteration order).
 * @param {import('./gstate.js').game} g
 * @param {{ x: number, y: number }} cc in/out (**`cc`** → ball coords when nearest is off-center)
 * @returns {object|null}
 */
export function buriedBallFromCoord(g, cc) {
    const u = g.u;
    if (u && (u.utrap | 0) && (u.utraptype | 0) !== TT_BURIEDBALL) return null;
    const xh = cc.x | 0;
    const yh = cc.y | 0;
    let ball = null;
    let bdist = 0x7fffffff;
    const heads = g.level?.buriedObjHeads;
    if (!heads) return null;
    for (const head of heads.values()) {
        for (let otmp = head; otmp; otmp = otmp.nexthere) {
            if ((otmp.otyp | 0) !== OTYP_HEAVY_IRON_BALL) continue;
            if ((otmp.ox | 0) === xh && (otmp.oy | 0) === yh) return otmp;
            const odist = dist2(otmp.ox | 0, otmp.oy | 0, xh, yh);
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
 * C: dig.c **`buried_ball`** starting at **`(x,y)`** — thin wrapper (**`cc`** scratch).
 */
export function buriedBallAtCellForUnearth(g, x, y) {
    const cc = { x: x | 0, y: y | 0 };
    return buriedBallFromCoord(g, cc);
}

/**
 * C: dig.c **`buried_ball_to_freedom`** — **`buried_ball`**, **`obj_extract_self`**, **`place_object`**, **`stackobj`**,
 * **`reset_utrap(TRUE)`** (**`float_up`/`You can fly.`** not ported), **`del_engr_at`**, **`newsym`**.
 * @param {import('./gstate.js').game} g
 * @returns {boolean} true when a ball was unearthed (**`reset_utrap`** ran)
 */
export function buriedBallToFreedomLikeC(g) {
    const u = g?.u;
    if (!u || !(u.utrap | 0) || (u.utraptype | 0) !== TT_BURIEDBALL) return false;
    const cc = { x: u.ux | 0, y: u.uy | 0 };
    const ball = buriedBallFromCoord(g, cc);
    if (!ball) return false;
    unlinkBuriedObjectInLevel(g, ball);
    placeFloorObjectInLevel(g, ball, cc.x | 0, cc.y | 0);
    stackObjOnFloorInLevel(g, ball);
    u.utrap = 0;
    u.utraptype = 0;
    delEngrAtInLevel(g, cc.x | 0, cc.y | 0);
    newsym(cc.x | 0, cc.y | 0);
    return true;
}

/**
 * C: dig.c **`digactualhole`** — start of routine: hero on **`(x,y)`** with **`u.utrap`** (**`TT_BURIEDBALL`** /
 * **`TT_INFLOOR`**) before pit/hole/trap placement effects.
 * @param {import('./gstate.js').game} g
 */
export function digactualHoleHeroUtrapSubset(g, x, y) {
    const u = g.u;
    if (!u) return;
    if ((u.ux | 0) !== (x | 0) || (u.uy | 0) !== (y | 0)) return;
    if (!(u.utrap | 0)) return;
    const typ = u.utraptype | 0;
    if (typ === TT_BURIEDBALL) {
        buriedBallToPunishmentFull(g);
    } else if (typ === TT_INFLOOR) {
        u.utrap = 0;
        u.utraptype = 0;
    }
}

/**
 * C: dig.c **`buried_ball_to_punishment`** — **`buried_ball(&u.ux)`**, **`obj_extract_self`**, read.c **`punish`**, **`reset_utrap`**, **`del_engr_at`**, **`newsym`**.
 * @param {import('./gstate.js').game} g
 */
export function buriedBallToPunishmentFull(g) {
    const u = g.u;
    if (!u) return;
    const cc = { x: u.ux | 0, y: u.uy | 0 };
    const ball = buriedBallFromCoord(g, cc);
    if (!ball) return;
    unlinkBuriedObjectInLevel(g, ball);
    punishUnearthedIronBallRead(g, ball);
    u.utrap = 0;
    u.utraptype = 0;
    delEngrAtInLevel(g, cc.x, cc.y);
    newsym(cc.x, cc.y);
}

/**
 * C: dig.c **`unearth_objs(x, y)`** — per buried object: **`buried_ball`/`TT_BURIEDBALL`** vs **`place_object`+`stackobj`**;
 * **`ROT_ORGANIC`** **`stop_timer`** via **`stopNhObjTimer`** (**`ROT_CORPSE`** timers unchanged).
 * @param {import('./gstate.js').game} g
 */
export function unearthObjsDigInLevel(g, x, y) {
    const lvl = g.level;
    if (!lvl?.buriedObjHeads) return;
    const xh = x | 0;
    const yh = y | 0;
    const k = floorObjKey(xh, yh);
    const ccProbe = { x: xh, y: yh };
    const bball = buriedBallFromCoord(g, ccProbe);
    const u = g.u;
    let head = lvl.buriedObjHeads.get(k) ?? null;
    while (head) {
        const otmp = head;
        head = otmp.nexthere;
        if (bball && otmp === bball && (u?.utrap | 0) && (u?.utraptype | 0) === TT_BURIEDBALL) {
            buriedBallToPunishmentFull(g);
        } else {
            unlinkBuriedObjectInLevel(g, otmp);
            if (otmp.timed) {
                stopNhObjTimer(g, otmp, ROT_ORGANIC);
            }
            placeFloorObjectInLevel(g, otmp, xh, yh);
            stackObjOnFloorInLevel(g, otmp);
        }
    }
}

/**
 * C: dig.c **`bury_objs`** — entire floor **`nexthere`** chain at **`(x,y)`** moves to **`buriedObjHeads`**.
 * Shop billing (**`stolen_value`** subset + **`no_charge`**) runs in **`melt_ice.js`** before this (**`shop.js`**).
 * @param {import('./gstate.js').game} g
 */
export function buryFloorChainAt(g, x, y) {
    const lvl = g.level;
    if (!lvl?.floorObjHeads) return;
    const k = floorObjKey(x | 0, y | 0);
    const floorHead = lvl.floorObjHeads.get(k);
    if (!floorHead) return;
    lvl.floorObjHeads.delete(k);
    if (!lvl.buriedObjHeads) lvl.buriedObjHeads = new Map();
    const buriedPrev = lvl.buriedObjHeads.get(k) ?? null;
    let tail = floorHead;
    while (tail.nexthere) tail = tail.nexthere;
    tail.nexthere = buriedPrev;
    lvl.buriedObjHeads.set(k, floorHead);
}

/**
 * C: dig.c **`unearth_objs`** — delegates to **`unearthObjsDigInLevel`** (**`stackobj`/`buried_ball`** subset).
 * @param {import('./gstate.js').game} g
 */
export function unearthBuriedChainAt(g, x, y) {
    unearthObjsDigInLevel(g, x, y);
}

/**
 * C: dig.c **`bury_an_obj`** subset — prepend one object onto **`buriedObjHeads`** at **`(ox,oy)`**.
 * @param {import('./gstate.js').game} g
 */
export function prependBuriedObjectInLevel(g, otmp) {
    const lvl = g.level;
    if (!lvl || !otmp) return;
    const xi = otmp.ox | 0;
    const yi = otmp.oy | 0;
    unlinkFloorObjectInLevel(g, otmp);
    unlinkBuriedObjectInLevel(g, otmp);
    if (!lvl.buriedObjHeads) lvl.buriedObjHeads = new Map();
    const k = floorObjKey(xi, yi);
    const prev = lvl.buriedObjHeads.get(k) ?? null;
    otmp.nexthere = prev;
    lvl.buriedObjHeads.set(k, otmp);
    otmp.ox = xi;
    otmp.oy = yi;
    if (!lvl.objects.includes(otmp)) lvl.objects.push(otmp);
}

/**
 * Remove **`otmp`** from floor/buried chains and **`level.objects`** (**`obfree`** / **`obj_extract_self`** subset).
 * @param {import('./gstate.js').game} g
 */
export function obliterateObjectInLevel(g, otmp) {
    if (!otmp) return;
    unlinkFloorObjectInLevel(g, otmp);
    unlinkBuriedObjectInLevel(g, otmp);
    const arr = g.level?.objects;
    if (arr) {
        const i = arr.indexOf(otmp);
        if (i >= 0) arr.splice(i, 1);
    }
    otmp.nexthere = null;
}

/** C: mkobj.c place_object(otmp, x, y) */
export function placeFloorObject(otmp, x, y) {
    const lvl = game.level;
    if (!lvl || !otmp) return;
    if (otmp.ox >= 0 && otmp.oy >= 0 && (otmp.ox !== x || otmp.oy !== y)) unlinkFloorObject(otmp);
    if (!lvl.floorObjHeads) lvl.floorObjHeads = new Map();
    const k = floorObjKey(x, y);
    otmp.ox = x;
    otmp.oy = y;
    const prev = lvl.floorObjHeads.get(k) ?? null;
    otmp.nexthere = prev;
    lvl.floorObjHeads.set(k, otmp);
    if (!lvl.objects.includes(otmp)) lvl.objects.push(otmp);
}
