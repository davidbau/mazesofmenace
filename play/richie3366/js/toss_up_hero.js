// toss_up_hero.js — dothrow.c toss_up() subset (hero throws upward, object falls on head).
// C ref: dothrow.c toss_up(); dungeon.c has_ceiling(); hack.c calc_capacity (see encumbr.js).

import { pline } from './display.js';
import { ceilingStringHeroLikeC } from './spoteffects.js';
import { hitfloorHeroLikeC } from './hitfloor_hero.js';
import {
    breakmsgObjDeliveryLikeC,
    breaktestLikeC,
    heroBreaksObjLikeC,
    BRK_FROM_INV,
} from './obj_break_dothrow.js';
import { doname } from './objnam.js';
import { In_endgame, Is_earthlevel, ismnum } from './const.js';
import { CORPSE_OTYP } from './mkobj_corpse.js';
import { stubPermonstForCorpsenm } from './mondata.js';
import { dmgval, losehp, maybeHalfPhys } from './mthrowu.js';
import { rnd } from './rng.js';
import { NH5_POTION_CLASS, NH5_SCROLL_CLASS } from './nh5_objclass.js';

/** C: **`weight.h`** **`WT_TO_DMG`**. */
const WT_TO_DMG = 100;
/** C: **`objects.h`** **`CLOTH`** material for **`harmless_missile`** default branch. */
const OC_MATERIAL_CLOTH = 6;
/** C: **`objects_nums`** — egg / blinding venom for **`toss_up`** branches. */
const OTYP_EGG_TOSS = 266;
const OTYP_BLINDING_VENOM = 478;

/**
 * C: **`dungeon.c`** **`has_ceiling(d_level *lev)`** — endgame non-earth has no ceiling.
 * @param {import('./gstate.js').game} g
 */
export function hasCeilingHeroUzLikeC(g) {
    const uz = g.u?.uz;
    if (!uz) return true;
    return !(In_endgame(uz) && !Is_earthlevel(uz));
}

function doname2CapsLikeC(g, obj) {
    const s = doname(obj, g);
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function heroBlindTossUp(u) {
    return !!(u?.ublind || (u?.timed?.blind ?? 0) > 0);
}

/** C: **`dothrow.c`** **`harmless_missile`** — scroll / cloth / small food list subset. */
function harmlessMissileTossUpLikeC(obj) {
    if (!obj) return false;
    if ((obj.oclass | 0) === NH5_SCROLL_CLASS) return true;
    if ((obj.oc_material | 0) === OC_MATERIAL_CLOTH) return true;
    const ot = obj.otyp | 0;
    if (ot === OTYP_BLINDING_VENOM) return true;
    return false;
}

function petrifierEggCorpseTossUpLikeC(obj) {
    if (!obj) return false;
    const t = obj.otyp | 0;
    if (t !== OTYP_EGG_TOSS && t !== CORPSE_OTYP) return false;
    if (!ismnum(obj.corpsenm | 0)) return false;
    const p = stubPermonstForCorpsenm(obj.corpsenm | 0);
    const n = String(p?.mname || '').toLowerCase();
    return n.includes('cockatrice');
}

/**
 * C: **`dothrow.c`** **`toss_up(obj, hitsroof)`** — omits **`potionhit`**, full egg petrify **`done(STONING)`**,
 * **`cream_pie`/`blinding_venom`** blind timers, **`artifact_hit`**, **`hard_helmet`** and **`helm_simple_name`** nuance,
 * **`stone_missile`** / **`passes_rocks`**, **`poly_when_stoned`**.
 * @returns {Promise<boolean>} false if object destroyed at ceiling (C false).
 */
export async function tossUpHeroThrowitLikeC(g, obj, hitsRoof) {
    const u = g.u;
    if (!u || !obj) return false;
    const x = u.ux | 0;
    const y = u.uy | 0;
    const ceilingNm = ceilingStringHeroLikeC(g, x, y);

    let action;
    if (!hasCeilingHeroUzLikeC(g)) {
        action = 'flies up into';
    } else if (hitsRoof && breaktestLikeC(g, obj)) {
        await pline(`${doname2CapsLikeC(g, obj)} hits the ${ceilingNm}.`);
        await breakmsgObjDeliveryLikeC(g, obj, !heroBlindTossUp(u));
        const destroyed = await heroBreaksObjLikeC(g, obj, x, y, BRK_FROM_INV);
        if (!destroyed) {
            await hitfloorHeroLikeC(g, obj, false);
            return true;
        }
        return false;
    } else if (hitsRoof) {
        action = 'hits';
    } else {
        action = 'almost hits';
    }

    await pline(
        `${doname2CapsLikeC(g, obj)} ${action} the ${ceilingNm}, then falls back on top of your head.`,
    );

    if ((obj.oclass | 0) === NH5_POTION_CLASS) {
        await hitfloorHeroLikeC(g, obj, true);
        return true;
    }

    if (breaktestLikeC(g, obj)) {
        await breakmsgObjDeliveryLikeC(g, obj, !heroBlindTossUp(u));
        const destroyed = await heroBreaksObjLikeC(g, obj, x, y, BRK_FROM_INV);
        if (destroyed) return false;
        const ot = obj.otyp | 0;
        if (ot === OTYP_EGG_TOSS && petrifierEggCorpseTossUpLikeC(obj)) {
            await pline("You've got it all over your face!");
        } else if (ot === OTYP_BLINDING_VENOM) {
            await pline("You've got it all over your face!");
        }
        await hitfloorHeroLikeC(g, obj, false);
        return true;
    }

    if (harmlessMissileTossUpLikeC(obj)) {
        await pline("It doesn't hurt.");
        await hitfloorHeroLikeC(g, obj, false);
        return true;
    }

    let dmg = dmgval(obj, /** @type {any} */ ({ data: null }));
    if (dmg <= 0) {
        const w = obj.owt | 0;
        dmg = Math.max(1, Math.trunc((w + WT_TO_DMG - 1) / WT_TO_DMG));
        if (dmg > 1) dmg = rnd(dmg);
        if (dmg > 6) dmg = 6;
    }
    dmg = maybeHalfPhys(dmg);
    if (dmg > 0) losehp(dmg, 'falling object', 0);
    await hitfloorHeroLikeC(g, obj, true);
    return true;
}
