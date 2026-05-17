// obj_break_dothrow.js — dothrow.c breaktest / breakmsg / breaks() subset for dokick.c obj_delivery().
// C ref: dothrow.c breaktest(), breakmsg(), breaks(), breakobj() potion branch; potion.c potionbreathe().

import { rn2 } from './rng.js';
import { pline, newsym } from './display.js';
import { cansee } from './vision.js';
import { objResists } from './obj_resists.js';
import { raceptr, breathless, haseyes, eyecountLikeC, halfGasDamageHeroLikeC } from './mondata.js';
import { ismnum } from './const.js';
import { NH5_POTION_CLASS, NH5_ARMOR_CLASS, NH5_GEM_CLASS } from './nh5_objclass.js';
import { potionbreatheObjBreakLikeC } from './potion_breathe.js';
import { obliterateObjectInLevel } from './floorobj.js';
import { doname } from './objnam.js';
import { distmin } from './hacklib.js';
import { changeLuck } from './attrib.js';
import { breakobjHeroShopFloorTailLikeC } from './shop.js';

/** C: objects.h enum via **`OBJECTS_ENUM`** preprocessor dump (NH 5.0). */
const OTYP_EXPENSIVE_CAMERA = 229;
const OTYP_MIRROR = 230;
const OTYP_CRYSTAL_BALL = 231;
const OTYP_LENSES = 232;
const OTYP_EGG = 266;
const OTYP_MELON = 280;
const OTYP_CREAM_PIE = 287;
/** C: `POT_WATER` in `objects_nums` — `breaktest`/`breakmsg` discriminant for all potions. */
const OTYP_POT_WATER = 321;
const OTYP_BLINDING_VENOM = 478;
const OTYP_ACID_VENOM = 479;

const OC_GLASS = 19;

/** C: **`dothrow.c`** **`BRK_FROM_INV`** — hero **`break2`** / **`hero_breaks`** inventory flag. */
export const BRK_FROM_INV = 0x01;

/**
 * C: dothrow.c **`breaktest(obj)`**.
 * @param {import('./gstate.js').game} g
 * @param {{ otyp?: number, oclass?: number, oartifact?: number, oc_material?: number, oc_crackable?: number }} obj
 * @returns {boolean}
 */
export function breaktestLikeC(g, obj) {
    void g;
    if (!obj) return false;
    let nonbreakchance = 1;
    if ((obj.oclass | 0) === NH5_ARMOR_CLASS && (obj.oc_material | 0) === OC_GLASS) {
        nonbreakchance = 90;
    }
    if (objResists(obj, nonbreakchance, 99)) return false;
    if (
        (obj.oc_material | 0) === OC_GLASS
        && !(obj.oartifact | 0)
        && (obj.oclass | 0) !== NH5_GEM_CLASS
    ) {
        return true;
    }
    const disc = (obj.oclass | 0) === NH5_POTION_CLASS ? OTYP_POT_WATER : obj.otyp | 0;
    switch (disc) {
        case OTYP_EXPENSIVE_CAMERA:
        case OTYP_POT_WATER:
        case OTYP_EGG:
        case OTYP_CREAM_PIE:
        case OTYP_MELON:
        case OTYP_ACID_VENOM:
        case OTYP_BLINDING_VENOM:
            return true;
        default:
            return false;
    }
}

function heroBlindLikeC(g) {
    const u = g.u;
    return !!(u?.ublind || (u?.timed?.blind ?? 0) > 0);
}

function next2uLikeC(g, x, y) {
    const u = g.u;
    if (!u) return false;
    return distmin(u.ux | 0, u.uy | 0, x | 0, y | 0) <= 1;
}

/**
 * C: dothrow.c `breakobj` — potion vapors when `next2u` (**`potionbreathe`**); smell when not water / half-gas.
 * @param {import('./gstate.js').game} g
 * @param {object} obj
 * @param {number} x
 * @param {number} y
 */
async function potionVaporsBreakobjSubsetLikeC(g, obj, x, y) {
    if ((obj.oclass | 0) !== NH5_POTION_CLASS) return;
    if (!next2uLikeC(g, x, y)) return;
    const ptr = raceptr(g.youmonst);
    if (breathless(ptr) && !haseyes(ptr)) return;
    const halfGas = halfGasDamageHeroLikeC(g);
    const otyp = obj.otyp | 0;
    if (otyp !== OTYP_POT_WATER && !halfGas) {
        if (!breathless(ptr)) await pline('You smell a peculiar odor...');
        else {
            const ec = eyecountLikeC(ptr);
            if (ec === 1) await pline('Your eye waters.');
            else await pline('Your eyes water.');
        }
    }
    await potionbreatheObjBreakLikeC(g, obj);
}

/**
 * C: dothrow.c **`breakmsg(obj, in_view)`** — subset (**`is_crackable`** early-out; **`Wand`** default impossible omitted).
 * @param {import('./gstate.js').game} g
 * @param {object} obj
 * @param {boolean} inView
 */
export async function breakmsgObjDeliveryLikeC(g, obj, inView) {
    if (obj?.oc_crackable) return;

    const disc = (obj.oclass | 0) === NH5_POTION_CLASS ? OTYP_POT_WATER : obj.otyp | 0;
    let toPieces = '';
    switch (disc) {
        case OTYP_LENSES:
        case OTYP_MIRROR:
        case OTYP_CRYSTAL_BALL:
        case OTYP_EXPENSIVE_CAMERA:
            toPieces = ' into a thousand pieces';
        // fallthrough
        case OTYP_POT_WATER:
            if (!inView) await pline('You hear something shatter!');
            else await pline(`${doname(obj, g)} shatter${(obj.quan | 0) === 1 ? 's' : ''}${toPieces}!`);
            break;
        case OTYP_EGG:
        case OTYP_MELON:
            await pline('Splat!');
            break;
        case OTYP_CREAM_PIE:
            if (inView) await pline('What a mess!');
            break;
        case OTYP_ACID_VENOM:
        case OTYP_BLINDING_VENOM:
            await pline('Splash!');
            break;
        default:
            break;
    }
}

/**
 * C: dothrow.c **`release_camera_demon`** — **`rn2(3)`** + **`rn2(3)?…:…`** makemon (**subset**: RNG only).
 */
function releaseCameraDemonRngLikeC() {
    if (rn2(3)) return;
    void rn2(3);
}

/**
 * C: **`dothrow.c`** **`breakobj`** — mirror luck, egg luck (**subset** before shop / **`delobj`**).
 * @param {import('./gstate.js').game} g
 * @param {boolean} heroCaused
 */
function breakobjMirrorEggLuckLikeC(g, obj, heroCaused) {
    if (!heroCaused || !obj) return;
    const disc = (obj.oclass | 0) === NH5_POTION_CLASS ? OTYP_POT_WATER : obj.otyp | 0;
    if (disc === OTYP_MIRROR) changeLuck(-2);
    if (disc === OTYP_EGG && (obj.spe | 0) && ismnum(obj.corpsenm | 0)) {
        const mq = Math.min(obj.quan | 0, 5);
        changeLuck(-mq);
    }
}

/**
 * @param {{ heroCaused: boolean, fromInvent: boolean }} ctx
 * @returns {Promise<boolean>}
 */
async function breakObjectCoreLikeC(g, obj, x, y, ctx) {
    const { heroCaused, fromInvent } = ctx;
    if (!breaktestLikeC(g, obj)) return false;
    const inView = !heroBlindLikeC(g)
        && (heroCaused ? (fromInvent || cansee(x | 0, y | 0)) : cansee(x | 0, y | 0));
    await breakmsgObjDeliveryLikeC(g, obj, inView);
    breakobjMirrorEggLuckLikeC(g, obj, heroCaused);
    const disc = (obj.oclass | 0) === NH5_POTION_CLASS ? OTYP_POT_WATER : obj.otyp | 0;
    if (disc === OTYP_EXPENSIVE_CAMERA) releaseCameraDemonRngLikeC();
    if (disc === OTYP_POT_WATER) await potionVaporsBreakobjSubsetLikeC(g, obj, x, y);
    if (heroCaused) await breakobjHeroShopFloorTailLikeC(g, obj, x | 0, y | 0, !!fromInvent);
    obliterateObjectInLevel(g, obj);
    newsym(x | 0, y | 0);
    return true;
}

/**
 * C: dothrow.c **`hero_breaks`** — **`breakobj(..., TRUE, from_invent)`** (**shop floor tail** when not invent/unpaid branch).
 * @param {import('./gstate.js').game} g
 * @param {number} [breakflags] — **`BRK_FROM_INV`**
 */
export async function heroBreaksObjLikeC(g, obj, x, y, breakflags = 0) {
    const fromInvent = (breakflags & BRK_FROM_INV) !== 0;
    return breakObjectCoreLikeC(g, obj, x, y, { heroCaused: true, fromInvent });
}

/**
 * C: dothrow.c **`breaks(obj, x, y)`** — non-hero breakage; **`breakobj(..., FALSE, FALSE)`** (no shop floor tail).
 * @returns {Promise<boolean>} true if object destroyed
 */
export async function breaksObjDeliveryLikeC(g, obj, x, y) {
    return breakObjectCoreLikeC(g, obj, x, y, { heroCaused: false, fromInvent: false });
}
