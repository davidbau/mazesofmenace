// dig_hero.js — Hero dig completion (**`dig.c`** **`dig()`** **`effort > 100`** wall/door slice).
// C ref: dig.c **`dig()`** (shop wall/door/secret door); detect.c **`cvt_sdoor_to_door`**;
//        trap.c **`b_trapped`** (**`NO_PART`**) via **`kick.js`** **`bTrappedItemHeroLikeC`**.
//
// Deferred vs C: statue/boulder/stone/tree/earth **`rn2`**; **`simpleonames(uwep)`**; **`feel_newsym`**/**`unblock_point`**;
// full **`dig()`** occupation / **`dig_check`** / **`dig_typ`**.

import { pline, newsym } from './display.js';
import { vision_recalc } from './vision.js';
import { isClosedDoorLoc } from './walkable.js';
import { addDamageAt, inRoomsShopbaseRoomnos } from './shop.js';
import {
    shopWallHandDigDamageCostLikeC,
    payAfterHeroHandDigShopWallDamageLikeC,
    payAfterHeroHandDigShopDoorBreakLikeC,
} from './dig_pay.js';
import { bTrappedItemHeroLikeC } from './kick.js';
import { inTownLikeC } from './hacklib.js';
import {
    IS_WALL,
    IS_DOOR,
    SDOOR,
    DOOR,
    ROOM,
    CORR,
    D_NODOOR,
    D_BROKEN,
    D_CLOSED,
    D_LOCKED,
    D_TRAPPED,
    SHOP_DOOR_COST,
    WM_MASK,
    Is_rogue_level,
} from './const.js';

/**
 * C: detect.c **`cvt_sdoor_to_door`**
 * @param {import('./gstate.js').game} g
 * @param {object} loc
 */
export function cvtSdoorToDoorLikeC(g, loc) {
    let newmask = (loc.doormask | 0) & ~WM_MASK;
    if (Is_rogue_level(g.u?.uz)) {
        newmask = D_NODOOR;
    } else if (!(newmask & D_LOCKED)) {
        newmask |= D_CLOSED;
    }
    loc.typ = DOOR;
    loc.doormask = newmask;
    if ('arboreal_sdoor' in loc) loc.arboreal_sdoor = 0;
}

/**
 * C: dig.c **`dig()`** — **`svc.context.digging.effort > 100`** branch for **`IS_WALL`**, **`SDOOR`**,
 * **`closed_door`** only (caller must not use on statue/boulder/rock/tree).
 *
 * @param {import('./gstate.js').game} g
 * @param {number} dpx
 * @param {number} dpy
 * @returns {Promise<boolean>} true if this cell matched a handled branch
 */
export async function heroDigCompleteWallDoorOrSecretLikeC(g, dpx, dpy) {
    const loc = g.level?.at(dpx | 0, dpy | 0);
    if (!loc || !g.u) return false;

    const shopedge = inRoomsShopbaseRoomnos(g, dpx | 0, dpy | 0).length > 0;
    /** @type {string|null} */
    let digtxt = null;
    /** @type {'damage'|'break'|null} */
    let dmgtxt = null;

    const typ = loc.typ | 0;

    /** @type {'door'|'secret door'} */
    let trapItem = 'door';

    if (IS_WALL(typ)) {
        if (shopedge) {
            addDamageAt(g, dpx | 0, dpy | 0, shopWallHandDigDamageCostLikeC(g));
            dmgtxt = 'damage';
        }
        if (g.level?.flags?.is_maze_lev) {
            loc.typ = ROOM;
            loc.flags = 0;
        } else if (g.level?.flags?.is_cavernous_lev && !inTownLikeC(g, dpx, dpy)) {
            loc.typ = CORR;
            loc.flags = 0;
        } else {
            loc.typ = DOOR;
            loc.doormask = D_NODOOR;
        }
        digtxt = 'You make an opening in the wall.';
    } else if (typ === SDOOR) {
        trapItem = 'secret door';
        cvtSdoorToDoorLikeC(g, loc);
        digtxt = 'You break through a secret door!';
        if (!((loc.doormask | 0) & D_TRAPPED)) loc.doormask = D_BROKEN;
    } else if (isClosedDoorLoc(loc)) {
        digtxt = 'You break through the door with your digging tool.';
        if (shopedge) {
            addDamageAt(g, dpx | 0, dpy | 0, SHOP_DOOR_COST);
            dmgtxt = 'break';
        }
        if (!((loc.doormask | 0) & D_TRAPPED)) loc.doormask = D_BROKEN;
    } else {
        return false;
    }

    vision_recalc(1);
    newsym(dpx | 0, dpy | 0);
    if (digtxt) await pline(digtxt);
    if (dmgtxt === 'damage') await payAfterHeroHandDigShopWallDamageLikeC(g);
    else if (dmgtxt === 'break') await payAfterHeroHandDigShopDoorBreakLikeC(g);

    /* C: dig.c — trapped door after **`pay_for_damage`** (earth **`makemon`** branch omitted). */
    if (IS_DOOR(loc.typ | 0) && ((loc.doormask | 0) & D_TRAPPED)) {
        loc.doormask = D_NODOOR;
        await bTrappedItemHeroLikeC(g, trapItem, true);
        vision_recalc(1);
        newsym(dpx | 0, dpy | 0);
    }
    return true;
}
