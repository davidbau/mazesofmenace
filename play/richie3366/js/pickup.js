// pickup.js — Autopickup, encumbrance messages, pickup_prev flags.
// C ref: pickup.c reset_justpicked(), encumber_msg(), pickup(), check_here(); invent.c look_here();
//        hack.c near_capacity via encumbr.js; pickup.c **`use_container`** trapped / **`in_container`** → **`chest_trap`** (**`#l`** harness).

import { game } from './gstate.js';
import { pline, flush_screen } from './display.js';
import { stagger, raceptr } from './mondata.js';
import { nearCapacity, syncHeroInvWeightNetLikeC } from './encumbr.js';
import { OBJ_AT, IS_POOL, IS_LAVA, is_pit } from './const.js';
import { readEngrAt, canReachFloor } from './engrave.js';
import { describeDecor, levlTypAt, dfeatureAt, formatDfeatureForThereIs } from './decor.js';
import { doname } from './objnam.js';
import { tAt } from './search.js';
import { floorObjKey } from './floorobj.js';
import { nomul } from './timeout.js';
import { isContainerOtyp } from './water_damage.js';
import { chestTrapHeroLikeC, theObjnamLikeC } from './trap.js';
import { uHandsyHeroLikeC } from './hero_hands.js';

/** C: reset_justpicked(olist) — clear pickup_prev on each object in the chain. */
export function resetJustPicked(olist) {
    const list = olist ?? game.invent;
    if (!list) return;
    for (let o = list; o; o = o.nobj) o.pickup_prev = 0;
}

/**
 * C: raceptr(&youmonst) for encumber_msg stagger(..., 'stagger').
 * @returns {import('./mondata.js').Permonst}
 */
function encumberStaggerPtr() {
    return raceptr(game.youmonst);
}

/**
 * C: encumber_msg() — pline when near_capacity() crosses go.oldcap.
 */
export async function encumberMsg() {
    const g = game;
    const u = g.u;
    if (u && (u.weight_cap | 0) > 1) syncHeroInvWeightNetLikeC(g);
    const newcap = nearCapacity();
    const old = g._encumberOldCap ?? 0;

    if (old < newcap) {
        switch (newcap) {
        case 1:
            await pline('Your movements are slowed slightly because of your load.');
            break;
        case 2:
            await pline('You rebalance your load.  Movement is difficult.');
            break;
        case 3:
            await pline(`You ${stagger(encumberStaggerPtr(), 'stagger')} under your heavy load.  Movement is very hard.`);
            break;
        default:
            await pline(
                newcap === 4
                    ? 'You can barely move a handspan with this load!'
                    : "You can't even move a handspan with this load!",
            );
            break;
        }
        g.disp = g.disp || {};
        g.disp.botl = true;
    } else if (old > newcap) {
        switch (newcap) {
        case 0:
            await pline('Your movements are now unencumbered.');
            break;
        case 1:
            await pline('Your movements are only slowed slightly by your load.');
            break;
        case 2:
            await pline('You rebalance your load.  Movement is still difficult.');
            break;
        case 3:
            await pline(`You ${stagger(encumberStaggerPtr(), 'stagger')} under your load.  Movement is still very hard.`);
            break;
        default:
            break;
        }
        g.disp = g.disp || {};
        g.disp.botl = true;
    }
    g._encumberOldCap = newcap;
}

/** C: hack.h LOOKHERE_SKIP_DFEATURE */
const LOOKHERE_SKIP_DFEATURE = 2;

/** C: pickup.c LOOKHERE_PICKED_SOME */
const LOOKHERE_PICKED_SOME = 1;

function heroSurfaceTyp() {
    const u = game.u;
    return levlTypAt(u?.ux, u?.uy);
}

/**
 * C: invent.c look_here() — non-blind subset: dfeature line, pile summary, doname list.
 * @param {number} objCnt — object count (excluding uchain), from check_here
 * @param {number} lhflags — LOOKHERE_*
 */
async function lookHere(objCnt, lhflags) {
    const g = game;
    const u = g.u;
    if (!u) return;

    const pickedSome = (lhflags & LOOKHERE_PICKED_SOME) !== 0;
    const skipDfeature = (lhflags & LOOKHERE_SKIP_DFEATURE) !== 0;
    const pileLimit = g.flags?.pile_limit ?? 0;
    const skipObjects = pileLimit > 0 && objCnt >= pileLimit;

    const ohead = g.level?.floorObjHeads?.get(`${u.ux},${u.uy}`) ?? null;
    const objs = [];
    for (let o = ohead; o; o = o.nexthere) {
        if (o !== g.uchain) objs.push(o);
    }

    let dfeature = dfeatureAt(u.ux, u.uy);
    if (dfeature === 'pool of water' && u.underwater) dfeature = null;

    async function plineThereIsDfeature() {
        if (!dfeature || skipDfeature) return;
        const art = formatDfeatureForThereIs(dfeature);
        if (!art) return;
        await pline(`There is ${art} here.`);
    }

    const verb = u.ublind ? 'feel' : 'see';

    if (u.ublind) {
        /* C: invent.c look_here() blind branch — port feel_location / You() when Blind */
        await readEngrAt(u.ux, u.uy);
        return;
    }

    const ltyp = levlTypAt(u.ux, u.uy);
    const inLavaFeet = IS_LAVA(ltyp);
    const inPoolFeet = IS_POOL(ltyp) && !u.underwater;

    if (objs.length === 0 || inLavaFeet || inPoolFeet) {
        await plineThereIsDfeature();
        await readEngrAt(u.ux, u.uy);
        if (!skipObjects && (u.ublind || !dfeature)) {
            await pline(`You ${verb} no objects here.`);
        }
        return;
    }

    if (skipObjects) {
        await plineThereIsDfeature();
        await readEngrAt(u.ux, u.uy);
        if (objCnt === 1 && objs[0] && (objs[0].quan ?? 1) === 1) {
            await pline(pickedSome ? 'There is another object here.' : 'There is an object here.');
        } else {
            const w = objCnt === 2 ? 'two'
                : objCnt < 5 ? 'a few'
                    : objCnt < 10 ? 'several'
                        : 'many';
            await pline(`There are ${w}${pickedSome ? ' more' : ''} objects here.`);
        }
        return;
    }

    if (objs.length === 1) {
        await plineThereIsDfeature();
        await readEngrAt(u.ux, u.uy);
        await pline(`You see here ${doname(objs[0])}.`);
        return;
    }

    await plineThereIsDfeature();
    await pline('Things that are here:');
    for (const ob of objs) await pline(`  ${doname(ob)}`);
    await readEngrAt(u.ux, u.uy);
}

/**
 * C: invent.c dolook() — **`look_here(0, LOOKHERE_NOFLAGS)`** (not pickup.c check_here).
 */
export async function dolookHeroLikeC() {
    await lookHere(0, 0);
    game._toplineNeedMore = false;
}

/**
 * C: pickup.c check_here(boolean picked_some)
 */
export async function checkHere(pickedSome) {
    const g = game;
    const u = g.u;
    if (!u) return;
    if (g.flags?.mention_decor) {
        await describeDecor();
    }

    let ct = 0;
    let o = g.level?.floorObjHeads?.get(`${u.ux},${u.uy}`) ?? null;
    while (o) {
        if (o !== g.uchain) ct++;
        o = o.nexthere;
    }

    if (ct) {
        if (g.context?.run) g.context.run = 0;
        await flush_screen(1);
        const lhflags = pickedSome ? LOOKHERE_PICKED_SOME : 0;
        await lookHere(ct, lhflags);
    } else {
        await readEngrAt(u.ux, u.uy);
    }
}

/** C: notake(ptr) — hero cannot pick up (e.g. worm belly). Stub: false. */
function notake() {
    return false;
}

/**
 * C: pickup.c pickup(int what) — partial port: swallow, levitation/pool/lava,
 * autopickup + !flags.pickup, and early returns that match moveloop_preamble(1).
 * @param {number} what — >0 autopickup, 0 interactive, <0 count (not ported)
 * @returns {Promise<number>} 1 if pickup attempted, else 0 (C uses mixed semantics)
 */
export async function pickup(what) {
    const g = game;
    const u = g.u;
    if (!u) return 0;

    const autopickup = what > 0;
    if (what < 0) return 0;

    if (u.uswallow) return 0;

    const typ = heroSurfaceTyp() ?? 0;
    const underwater = !!u.underwater;
    const inPool = IS_POOL(typ) && !underwater;
    const inLava = IS_LAVA(typ);

    if (autopickup && (g.context?.nopick || !OBJ_AT(u.ux, u.uy) || inPool || inLava)) {
        if (g.flags?.mention_decor) await describeDecor();
        await readEngrAt(u.ux, u.uy);
        return 0;
    }

    const tr = tAt(u.ux, u.uy);
    if (!canReachFloor(!!(tr && is_pit(tr.ttyp)))) {
        await describeDecor();
        const multi = g.multi ?? 0;
        const run = g.context?.run;
        if ((multi && !run) || (autopickup && !g.flags?.pickup)) await readEngrAt(u.ux, u.uy);
        return 0;
    }

    const multi = g.multi ?? 0;
    const run = g.context?.run;
    if ((multi && !run) || (autopickup && !g.flags?.pickup) || notake()) {
        await checkHere(false);
        return 0;
    }

    /* Full interactive / autopick menu pickup deferred (pickup.c remainder). */
    return 0;
}

/**
 * C: pickup.c **`in_container`** — first floor container at **`(u.ux,u.uy)`** ( **`uchain`** skipped).
 * @param {import('./gstate.js').game} g
 * @returns {object|null}
 */
export function floorContainerAtHeroFeetPickupLikeC(g) {
    const u = g.u;
    if (!u || !g.level?.floorObjHeads) return null;
    const k = floorObjKey(u.ux | 0, u.uy | 0);
    for (let o = g.level.floorObjHeads.get(k); o; o = o.nexthere) {
        if (o === g.uchain) continue;
        if (isContainerOtyp(o.otyp | 0)) return o;
    }
    return null;
}

/**
 * C: pickup.c **`use_container`** — first **carried** (**`gi.invent`** chain) unlocked trapped container (**`#loot`** subset).
 * Omits nested-in-container pick, shop / bag-of-tricks branches. **`u_handsy`** is enforced in **`heroOpenTrappedContainerPickupLikeC`**.
 * @param {import('./gstate.js').game} g
 * @returns {object|null}
 */
export function carriedTrappedUnlockedContainerPickupLikeC(g) {
    for (let o = g.invent; o; o = o.nobj) {
        if (o === g.uchain) continue;
        if (!isContainerOtyp(o.otyp | 0)) continue;
        if (o.olocked | 0) continue;
        if (!(o.otrapped | 0)) continue;
        return o;
    }
    return null;
}

/**
 * C: pickup.c **`use_container`** / **`in_container`** — **`!olocked` && `otrapped`** → **`chest_trap(obj, HAND, FALSE)`** + **`nomul(-1)`**; **`held`** → **`You("open %s...", …)`** before **`chest_trap`**.
 * @param {import('./gstate.js').game} g
 * @param {object} obj
 * @param {boolean} held — C **`held`** (**`You("open %s...", …)`** only when true).
 * @returns {Promise<boolean>} true if **`chest_trap`** ran (**`false`** if **`u_handsy`** fails or bad **`obj`**)
 */
export async function heroOpenTrappedContainerPickupLikeC(g, obj, held) {
    if (!(await uHandsyHeroLikeC(g))) return false;
    if (!obj || !isContainerOtyp(obj.otyp | 0)) return false;
    if (obj.olocked | 0) return false;
    if (!(obj.otrapped | 0)) return false;
    if (held) await pline(`You open ${theObjnamLikeC(doname(obj, g))}...`);
    await chestTrapHeroLikeC(g, obj, 6, false);
    if ((g.multi ?? 0) >= 0) {
        nomul(-1);
        g.multi_reason = 'opening a container';
        g.nomovemsg = '';
    }
    return true;
}
