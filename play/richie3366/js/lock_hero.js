// lock_hero.js — lock.c **`pick_lock`** / **`picklock()`** + **`doopen_indir`** (autoopen).
// C ref: lock.c **`pick_lock()`** / **`picklock()`** — box **`ch`** + cursed halve; door **`ch`** (**`CREDIT_CARD`** **`2*dex+20*rog`**, **`LOCK_PICK`** **`3*dex+30*rog`**, key **`70+dex`**);
//        door **`b_trapped("door", FINGER)`**, **`D_NODOOR`**, shop **`add_damage`** (**`SHOP_DOOR_COST`**), **`newsym`**; **`is_magic_key`** + **`D_TRAPPED`** door — **`y_n`** disarm (no **`tknown`** on door).
// **`doopen_indir`**: **`rnl(20)`** strength open, trapped door **`b_trapped`**. Omits drawbridge/portcullis, mimic **`stumble_onto_mimic`**, **`autounlock`**, **`get_adjacent_loc`**.

import { pline, flush_screen, newsym } from './display.js';
import { nhgetch } from './input.js';
import { acurr, exercise } from './attrib.js';
import {
    A_STR,
    A_DEX,
    A_CON,
    A_WIS,
    isok,
    IS_DOOR,
    D_NODOOR,
    D_ISOPEN,
    D_BROKEN,
    D_LOCKED,
    D_TRAPPED,
    D_CLOSED,
    SHOP_DOOR_COST,
    TT_PIT,
    ECMD_OK,
    ECMD_TIME,
} from './const.js';
import { rn2, rnl } from './rng.js';
import { raceptr, verysmall } from './mondata.js';
import { nohandsPermonstLikeC } from './hero_hands.js';
import { chestTrapHeroLikeC } from './trap.js';
import { cansee } from './vision.js';
import { bTrappedDoorFootLikeC } from './kick.js';
import { addDamageAt, inRoomsShopbaseRoomnos } from './shop.js';

/** @see water_damage.js / objects.h — CHEST 216; SKELETON_KEY / LOCK_PICK / CREDIT_CARD 222–224. */
const OTYP_CHEST = 216;
const OTYP_SKELETON_KEY = 222;
const OTYP_LOCK_PICK = 223;
const OTYP_CREDIT_CARD = 224;

/**
 * C: lock.c **`doopen_indir(x,y)`** — open closed door at **`(x,y)`** (hero autoopen / `#open` subset).
 * @param {import('./gstate.js').game} g
 * @param {number} x
 * @param {number} y
 * @returns {Promise<number>} **`ECMD_OK`** | **`ECMD_TIME`**
 */
export async function doopenIndirHeroLikeC(g, x, y) {
    const u = g.u;
    const ptr = raceptr(g.youmonst);
    if (nohandsPermonstLikeC(ptr)) {
        await pline("You can't open anything -- you have no hands!");
        return ECMD_OK;
    }

    if (!isok(x, y)) return ECMD_OK;

    if ((u?.utrap | 0) && (u.utraptype | 0) === TT_PIT) {
        await pline("You can't reach over the edge of the pit.");
        return ECMD_OK;
    }

    const loc = g.level?.at(x, y);
    if (!loc || !IS_DOOR(loc.typ | 0)) {
        await pline("You see no door there.");
        return ECMD_OK;
    }

    const dm0 = loc.doormask | 0;
    if (!(dm0 & D_CLOSED)) {
        let mesg = ' is locked';
        if (dm0 === D_BROKEN) mesg = ' is broken';
        else if (dm0 === D_NODOOR) mesg = 'way has no door';
        else if (dm0 === D_ISOPEN) mesg = ' is already open';
        else if (!(dm0 & D_LOCKED)) mesg = ' is already open';
        await pline(`This door${mesg}.`);
        return ECMD_OK;
    }

    if (verysmall(ptr)) {
        await pline("You're too small to pull the door open.");
        return ECMD_OK;
    }

    const threshold = Math.trunc((acurr(A_STR) + acurr(A_DEX) + acurr(A_CON)) / 3);
    if (rnl(20) < threshold) {
        await pline('The door opens.');
        if (dm0 & D_TRAPPED) {
            await bTrappedDoorFootLikeC(g);
            loc.doormask = D_NODOOR;
            if (inRoomsShopbaseRoomnos(g, x, y).length) addDamageAt(g, x, y, SHOP_DOOR_COST);
        } else {
            loc.doormask = D_ISOPEN;
        }
        newsym(x, y);
    } else {
        exercise(A_STR, true);
        await pline('The door resists!');
    }
    return ECMD_TIME;
}

/** C: artilist.h / **`arti_enum`** — **`ART_MASTER_KEY_OF_THIEVERY`** (**`oartifact`** index). */
const ART_MASTER_KEY_OF_THIEVERY = 30;

/**
 * C: artifact.c **`is_magic_key(&youmonst, obj)`** — Master Key: rogue + non-cursed, else blessed.
 * @param {import('./gstate.js').game} g
 * @param {{ oartifact?: number, blessed?: number, cursed?: number }|null|undefined} obj
 */
export function isMagicKeyHeroToolLikeC(g, obj) {
    if (!obj || (obj.oartifact | 0) !== ART_MASTER_KEY_OF_THIEVERY) return false;
    const rogue = g?.urole?.abbr === 'Rog';
    if (rogue) return (obj.cursed | 0) === 0;
    return (obj.blessed | 0) !== 0;
}

/** C: lock.c `lock_action()` — locked box + unlock attempt: pick/card → **`picking the lock`**, else chest/box unlock strings. */
export function lockActionPhrasePicklockBoxUnlockLikeC(box, pickOtyp) {
    const p = pickOtyp | 0;
    if (p === OTYP_LOCK_PICK || p === OTYP_CREDIT_CARD) return 'picking the lock';
    if ((box?.otyp | 0) === OTYP_CHEST) return 'unlocking the chest';
    return 'unlocking the box';
}

/**
 * C: lock.c `autokey()`-style first choice — own key beats pick beats card (no quest-artifact nuance).
 * @returns {object|null}
 */
export function heroFirstLockToolObjLikeC(g) {
    let key = null;
    let pick = null;
    let card = null;
    for (let o = g.invent; o; o = o.nobj) {
        const t = o.otyp | 0;
        if (t === OTYP_SKELETON_KEY) {
            if (!key) key = o;
        } else if (t === OTYP_LOCK_PICK) {
            if (!pick) pick = o;
        } else if (t === OTYP_CREDIT_CARD) {
            if (!card) card = o;
        }
    }
    return key || pick || card || null;
}

/**
 * @returns {number|null} otyp of chosen tool, or null
 */
export function heroFirstLockToolOtypLikeC(g) {
    const tool = heroFirstLockToolObjLikeC(g);
    return tool ? tool.otyp | 0 : null;
}

/**
 * C: lock.c **`pick_lock()`** at hero feet — **`switch (picktyp)`** **`ch`** for **`Is_box`**, **`otmp->cursed`** halves.
 * @param {import('./gstate.js').game} g
 * @param {{ cursed?: number, otyp?: number }} box
 * @param {number} pickOtyp
 * @returns {number}
 */
export function picklockFloorBoxChanceHeroLikeC(g, box, pickOtyp) {
    const dex = acurr(A_DEX) | 0;
    const rogue = g?.urole?.abbr === 'Rog' ? 1 : 0;
    const p = pickOtyp | 0;
    let ch = 0;
    if (p === OTYP_CREDIT_CARD) ch = dex + 20 * rogue;
    else if (p === OTYP_LOCK_PICK) ch = 4 * dex + 25 * rogue;
    else if (p === OTYP_SKELETON_KEY) ch = 75 + dex;
    if (box && (box.cursed | 0)) ch = Math.trunc(ch / 2);
    return ch + (box?._picklockChanceBonus | 0);
}

/**
 * C: lock.c **`pick_lock()`** adjacent door — **`switch (picktyp)`** **`ch`** (**`CREDIT_CARD`** **`2*dex+20*rog`**, **`LOCK_PICK`** **`3*dex+30*rog`**, **`SKELETON_KEY`** **`70+dex`**).
 * @param {import('./gstate.js').game} g
 * @param {number} pickOtyp
 * @returns {number}
 */
export function picklockDoorChanceHeroLikeC(g, pickOtyp) {
    const dex = acurr(A_DEX) | 0;
    const rogue = g?.urole?.abbr === 'Rog' ? 1 : 0;
    const p = pickOtyp | 0;
    if (p === OTYP_CREDIT_CARD) return 2 * dex + 20 * rogue;
    if (p === OTYP_LOCK_PICK) return 3 * dex + 30 * rogue;
    if (p === OTYP_SKELETON_KEY) return 70 + dex;
    return 0;
}

/**
 * C: lock.c **`lock_action()`** when **`gx.xlock.door`** (**`picktyp`** vs locked state).
 * @param {{ doormask?: number }} loc
 * @param {number} pickOtyp
 */
export function lockActionPhrasePicklockDoorLikeC(loc, pickOtyp) {
    const dm = loc?.doormask | 0;
    const locked = !!(dm & D_LOCKED);
    const p = pickOtyp | 0;
    if (!locked) return 'locking the door';
    if (p === OTYP_LOCK_PICK || p === OTYP_CREDIT_CARD) return 'picking the lock';
    return 'unlocking the door';
}

/**
 * C: lock.c **`pick_lock()`** / **`picklock()`** — neighbor **`(ux+dx,uy+dy)`** door (**`IS_DOOR`**), same occupation loop as box; success **`b_trapped`** / **`doormask`** toggle.
 *
 * @param {import('./gstate.js').game} g
 * @param {number} dx
 * @param {number} dy
 * @returns {Promise<
 *   | null
 *   | 'success'
 *   | 'gave_up'
 *   | 'disarmed_trap'
 *   | 'stopped_at_trap'
 *   | 'interrupted'
 *   | 'pit_cant_reach'
 *   | 'user_cancel'
 *   | 'monster_block'
 *   | 'bad_door_state'
 *   | 'credit_lock'
 *   | 'no_tool'
 * >}
 */
export async function tryPicklockAdjacentDoorHeroLikeC(g, dx, dy) {
    if ((dx | 0) === 0 && (dy | 0) === 0) return null;

    const u = g.u;
    if (!u || !g.level) return null;

    if ((u.utrap | 0) && (u.utraptype | 0) === TT_PIT) {
        await pline("You can't reach over the edge of the pit.");
        return 'pit_cant_reach';
    }

    const x = (u.ux + dx) | 0;
    const y = (u.uy + dy) | 0;
    if (!isok(x, y)) return null;

    const loc0 = g.level.at(x, y);
    if (!loc0 || !IS_DOOR(loc0.typ | 0)) return null;

    const mtmp = g.level.monsters?.find((m) => (m.mx | 0) === x && (m.my | 0) === y && (m.mhp | 0) > 0) ?? null;
    if (mtmp && cansee(x, y)) {
        const pickObjProbe = heroFirstLockToolObjLikeC(g);
        const pt = pickObjProbe?.otyp | 0;
        if (pt === OTYP_CREDIT_CARD && (mtmp.isshk | 0)) {
            await pline('The shopkeeper intones: "No checks, no credit, no problem."');
        } else {
            const nm = mtmp.monnam || mtmp.data?.mname || 'it';
            await pline(`I don't think ${nm} would appreciate that.`);
        }
        return 'monster_block';
    }

    const pickObj = heroFirstLockToolObjLikeC(g);
    if (!pickObj) {
        await pline("You don't have anything to pick that lock with.");
        return 'no_tool';
    }

    const pickOtyp = pickObj.otyp | 0;
    const dm0 = loc0.doormask | 0;
    switch (dm0) {
        case D_NODOOR:
            await pline('This doorway has no door.');
            return 'bad_door_state';
        case D_ISOPEN:
            await pline('You cannot lock an open door.');
            return 'bad_door_state';
        case D_BROKEN:
            await pline('This door is broken.');
            return 'bad_door_state';
        default:
            break;
    }

    if (pickOtyp === OTYP_CREDIT_CARD && !(dm0 & D_LOCKED)) {
        await pline("You can't lock a door with a credit card.");
        return 'credit_lock';
    }

    const locking = !(dm0 & D_LOCKED);
    await pline(`${locking ? 'Lock' : 'Unlock'} it? [yn]`);
    await flush_screen(1);
    const yn = await nhgetch();
    if (yn !== 121 && yn !== 89) return 'user_cancel';

    let chance = picklockDoorChanceHeroLikeC(g, pickOtyp);
    const magicKey = isMagicKeyHeroToolLikeC(g, pickObj);
    const ptr = raceptr(g.youmonst);
    let usedtime = 0;

    for (;;) {
        const loc = g.level.at(x, y);
        if (!loc || !IS_DOOR(loc.typ | 0)) return 'interrupted';

        const idx = usedtime++;
        const phrase = lockActionPhrasePicklockDoorLikeC(loc, pickOtyp);
        if (idx >= 50 || nohandsPermonstLikeC(ptr)) {
            await pline(`You give up your attempt at ${phrase}.`);
            exercise(A_DEX, true);
            return 'gave_up';
        }
        if (rn2(100) >= chance) continue;

        const dm = loc.doormask | 0;
        if ((dm & D_TRAPPED) && magicKey) {
            chance += 20;
            await pline('Do you want to try to disarm it? [yn]');
            await flush_screen(1);
            const ans = await nhgetch();
            const yes = ans === 121 || ans === 89;
            if (yes) {
                loc.doormask = (loc.doormask | 0) & ~D_TRAPPED;
                const alreadyUnlocked = !((loc.doormask | 0) & D_LOCKED);
                await pline(
                    `You succeed in disarming the trap.  The door is still ${alreadyUnlocked ? 'un' : ''}locked.`,
                );
                exercise(A_WIS, true);
                return 'disarmed_trap';
            }
            await pline(`You stop ${phrase}.`);
            exercise(A_WIS, false);
            return 'stopped_at_trap';
        }

        await pline(`You succeed in ${phrase}.`);
        const dm2 = loc.doormask | 0;
        if (dm2 & D_TRAPPED) {
            await bTrappedDoorFootLikeC(g);
            loc.doormask = D_NODOOR;
            if (inRoomsShopbaseRoomnos(g, x, y).length) addDamageAt(g, x, y, SHOP_DOOR_COST);
            newsym(x, y);
        } else if (dm2 & D_LOCKED) {
            loc.doormask = D_CLOSED;
        } else {
            loc.doormask = D_LOCKED;
        }
        exercise(A_DEX, true);
        return 'success';
    }
}

/**
 * C: lock.c **`picklock()`** occupation — **`usedtime++ >= 50 || nohands`**, then **`rn2(100) >= chance`** busy; else success tail
 * (including **`is_magic_key`** + **`otrapped`** **`y_n`** branch before normal unlock).
 * @param {import('./gstate.js').game} g
 * @param {object} box
 * @returns {Promise<'success'|'gave_up'|'disarmed_trap'|'stopped_at_trap'|null>}
 */
export async function tryPicklockFloorBoxOccupationRngHeroLikeC(g, box) {
    if (!box) return null;
    const pickObj = heroFirstLockToolObjLikeC(g);
    if (!pickObj) return null;
    const pickOtyp = pickObj.otyp | 0;
    let chance = picklockFloorBoxChanceHeroLikeC(g, box, pickOtyp);
    const phrase = lockActionPhrasePicklockBoxUnlockLikeC(box, pickOtyp);
    const ptr = raceptr(g.youmonst);
    let usedtime = 0;
    for (;;) {
        const idx = usedtime++;
        if (idx >= 50 || nohandsPermonstLikeC(ptr)) {
            await pline(`You give up your attempt at ${phrase}.`);
            exercise(A_DEX, true);
            return 'gave_up';
        }
        if (rn2(100) >= chance) continue;
        if ((box.otrapped | 0) && isMagicKeyHeroToolLikeC(g, pickObj)) {
            box._picklockChanceBonus = (box._picklockChanceBonus | 0) + 20;
            chance += 20;
            if (!(box.tknown | 0)) await pline('You find a trap!');
            box.tknown = 1;
            await pline('Do you want to try to disarm it? [yn]');
            await flush_screen(1);
            const ans = await nhgetch();
            const yes = ans === 121 || ans === 89;
            if (yes) {
                box.otrapped = 0;
                box.tknown = 0;
                const what = (box.otyp | 0) === OTYP_CHEST ? 'chest' : 'box';
                const alreadyUnlocked = !(box.olocked | 0);
                await pline(
                    `You succeed in disarming the trap.  The ${what} is still ${alreadyUnlocked ? 'un' : ''}locked.`,
                );
                exercise(A_WIS, true);
                return 'disarmed_trap';
            }
            await pline(`You stop ${phrase}.`);
            exercise(A_WIS, false);
            return 'stopped_at_trap';
        }
        await applyPicklockSucceededOnFloorBoxHeroLikeC(g, box, pickOtyp);
        return 'success';
    }
}

/**
 * C: lock.c picklock() — **`You("succeed in %s.", lock_action())`**, **`box->olocked = !olocked`**, **`lknown = 1`**, **`if (otrapped) chest_trap(box, FINGER, FALSE)`**, **`exercise(A_DEX, TRUE)`**.
 * @param {import('./gstate.js').game} g
 * @param {object} box — floor container (**`Is_box`** subset: **`isContainerOtyp`** in JS)
 * @param {number} pickOtyp — tool **`otyp`** for **`lock_action()`** phrase only
 */
export async function applyPicklockSucceededOnFloorBoxHeroLikeC(g, box, pickOtyp) {
    if (!box) return;
    const phrase = lockActionPhrasePicklockBoxUnlockLikeC(box, pickOtyp);
    await pline(`You succeed in ${phrase}.`);
    box.olocked = (box.olocked | 0) ? 0 : 1;
    box.lknown = 1;
    if (box.otrapped | 0) {
        await chestTrapHeroLikeC(g, box, 3, false);
    }
    exercise(A_DEX, true);
}
