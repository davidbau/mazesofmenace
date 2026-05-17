// burn_floor_objects.js — Floor scrolls / books / slime glob burn + ignite (zap.c subset).
// C ref: zap.c burn_floor_objects(); trap.c dofiretrap() tail (see_it, u_caused TRUE).

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { pline } from './display.js';
import { floorObjKey, unlinkFloorObject } from './floorobj.js';
import { igniteItemsChain } from './ignite_items.js';
import { nh5HeroObjectClass } from './water_damage.js';
import { NH5_FOOD_CLASS, NH5_SCROLL_CLASS, NH5_SPBOOK_CLASS } from './nh5_objclass.js';
import { OTYP_GLOB_OF_GREEN_SLIME } from './const.js';
import { An, distantNameBurnFloor, makePluralBurn, xnameBurnFloor } from './objnam.js';
import { objResists } from './obj_resists.js';
import { useupfFloor } from './shop.js';

const OTYP_SCR_FIRE = 338;
const OTYP_SPE_FIREBALL = 368;

/**
 * @param {{ oclass?: number, otyp?: number }} obj
 * @returns {boolean}
 */
function burnableFloorObj(obj) {
    const t = obj.otyp | 0;
    if (t === OTYP_SCR_FIRE || t === OTYP_SPE_FIREBALL) return false;
    if (objResists(obj, 2, 100)) return false;
    const oc = nh5HeroObjectClass(obj);
    if (oc === NH5_SCROLL_CLASS || oc === NH5_SPBOOK_CLASS) return true;
    if (oc === NH5_FOOD_CLASS && t === OTYP_GLOB_OF_GREEN_SLIME) return true;
    return false;
}

/**
 * @param {typeof game} g
 * @param {object} otmp
 */
function removeFloorObjFromLevel(g, otmp) {
    unlinkFloorObject(otmp);
    const arr = g.level?.objects;
    if (arr) {
        const i = arr.indexOf(otmp);
        if (i >= 0) arr.splice(i, 1);
    }
}

/**
 * C: zap.c burn_floor_objects(x, y, give_feedback, u_caused) — **`useupf`** when **`u_caused`**;
 * **`distant_name`/`xname`** + **`An`** for plines; else **`delobj`** / **`quan`** without billing.
 * @param {typeof game} [g]
 * @param {number} x
 * @param {number} y
 * @param {boolean} giveFeedback
 * @param {boolean} uCaused
 * @returns {Promise<number>} count burned (C return; **`ignite_items`** does not add)
 */
export async function burnFloorObjects(g = game, x, y, giveFeedback, uCaused) {
    const lvl = g.level;
    if (!lvl?.floorObjHeads) return 0;
    const k = floorObjKey(x, y);
    let cnt = 0;

    for (let obj = lvl.floorObjHeads.get(k) ?? null; obj; ) {
        const obj2 = obj.nexthere ?? null;
        if (burnableFloorObj(obj)) {
            const scrquan = obj.quan ?? 1;
            let delquan = 0;
            for (let i = scrquan; i > 0; i--) {
                if (!rn2(3)) delquan++;
            }
            if (delquan) {
                let buf1 = '';
                let buf2 = '';
                if (giveFeedback) {
                    const saveq = obj.quan ?? 1;
                    obj.quan = 1;
                    buf1 =
                        (g.u?.ux | 0) === x && (g.u?.uy | 0) === y
                            ? xnameBurnFloor(obj, g)
                            : distantNameBurnFloor(obj, x, y, g);
                    obj.quan = 2;
                    buf2 =
                        (g.u?.ux | 0) === x && (g.u?.uy | 0) === y
                            ? xnameBurnFloor(obj, g)
                            : distantNameBurnFloor(obj, x, y, g);
                    obj.quan = saveq;
                    buf2 = makePluralBurn(buf2);
                }
                if (uCaused) useupfFloor(g, obj, delquan);
                else if (delquan < scrquan) {
                    obj.quan = scrquan - delquan;
                } else {
                    removeFloorObjFromLevel(g, obj);
                }
                cnt += delquan;
                if (giveFeedback) {
                    if (delquan > 1) {
                        await pline(`${delquan} ${buf2} burn.`);
                    } else {
                        await pline(`${An(buf1)} burns.`);
                    }
                }
            }
        }
        obj = obj2;
    }

    const head = lvl.floorObjHeads.get(k) ?? null;
    await igniteItemsChain(g, head, { here: true });
    return cnt;
}
