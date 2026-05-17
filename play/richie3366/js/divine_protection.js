// divine_protection.js — C pray.c / priest.c / sit.c hooks for divine Protection (youprop HProtection).
// C refs: pray.c pleased() pat_on_head case 5 (HTelepat/HFast/HStealth/HProtection), angrygods u.ublessed clear;
//         priest.c donation block; sit.c case 10 strip.

import {
    PROTECTION,
    FROMOUTSIDE,
    INTRINSIC,
} from './const.js';
import { rn1, rn2 } from './rng.js';
import { findAc } from './u_init_find_ac.js';
import { pline } from './display.js';
import { uGnameHeroLikeC } from './pray_align_gname_like_c.js';

/** @param {import('./gstate.js').game} g */
function alignGnameUalignTypeLikeC(g) {
    return uGnameHeroLikeC(g);
}

/** @param {import('./gstate.js').game} g */
function markBotlFindAc(g) {
    g.disp = g.disp || {};
    g.disp.botl = true;
    findAc(g);
}

/** @param {import('./gstate.js').game} g */
function protIntrinsic(g) {
    return g?.u?.uprops?.[PROTECTION]?.intrinsic | 0;
}

/** @param {import('./gstate.js').game} g */
function setProtIntrinsic(g, v) {
    const slot = g?.u?.uprops?.[PROTECTION];
    if (!slot) return;
    slot.intrinsic = v | 0;
}

/**
 * C: pray.c **`angrygods`** — **`u.ublessed = 0`** (blessing magnitude; does not strip **`HProtection`**).
 * @param {import('./gstate.js').game} g
 */
export function clearUblessedAngryGodsLikeC(g) {
    const u = g?.u;
    if (!u) return;
    u.ublessed = 0;
    markBotlFindAc(g);
}

/**
 * C: pray.c **`pleased`** switch case **5** else branch — gods grant intrinsic Protection / **`u.ublessed`**.
 * (After Telepathy / Fast / Stealth intrinsic branches are exhausted.)
 * @param {import('./gstate.js').game} g
 */
export function grantGodsFifthPleasedGiftProtectionLikeC(g) {
    const u = g?.u;
    if (!u) return;
    const hi = protIntrinsic(g);
    if ((hi & INTRINSIC) === 0) {
        setProtIntrinsic(g, hi | FROMOUTSIDE);
        if (!(u.ublessed | 0)) u.ublessed = rn1(3, 2);
    } else {
        u.ublessed = (u.ublessed | 0) + 1;
    }
    markBotlFindAc(g);
}

/**
 * C: pray.c **`pleased`** — **`pat_on_head`** **`switch (rn2((Luck+6)>>1))`** case **5** only
 * (**`godvoice`**, Telepathy / Fast / Stealth / Protection + **`verbalize`**).
 * @param {import('./gstate.js').game} g
 */
export async function applyPleasedPatOnHeadCase5IntrinsicGiftsLikeC(g) {
    const u = g?.u;
    if (!u) return;
    const gnm = alignGnameUalignTypeLikeC(g);
    const msg = '"and thus I grant thee the gift of %s!"';
    await pline(`The voice of ${gnm} thunders: "Thou hast pleased me with thy progress,"`);
    if (((u.HTelepat | 0) & INTRINSIC) === 0) {
        u.HTelepat = (u.HTelepat | 0) | FROMOUTSIDE;
        markBotlFindAc(g);
        await pline(msg.replace('%s', 'Telepathy'));
    } else if (((u.HFast | 0) & INTRINSIC) === 0) {
        u.HFast = (u.HFast | 0) | FROMOUTSIDE;
        markBotlFindAc(g);
        await pline(msg.replace('%s', 'Speed'));
    } else if (((u.HStealth | 0) & INTRINSIC) === 0) {
        u.HStealth = (u.HStealth | 0) | FROMOUTSIDE;
        markBotlFindAc(g);
        await pline(msg.replace('%s', 'Stealth'));
    } else {
        grantGodsFifthPleasedGiftProtectionLikeC(g);
        await pline(msg.replace('%s', 'my protection'));
    }
    await pline('Use it wisely in my name!');
}

/**
 * C: priest.c donation path — if **`!(HProtection & INTRINSIC)`** then **`HProtection |= FROMOUTSIDE`**
 * (gremlin theft recovery comment in C).
 * @returns {boolean} true if intrinsic was absent before (caller may treat orig ublessed as **-1** for messaging).
 */
export function ensureHProtectionIntrinsicForPriestDonationLikeC(g) {
    const hi = protIntrinsic(g);
    if ((hi & INTRINSIC) !== 0) return false;
    setProtIntrinsic(g, hi | FROMOUTSIDE);
    markBotlFindAc(g);
    return true;
}

/**
 * C: priest.c — **`for (; offer >= (2 * suggested); offer -= (2 * suggested))`** ublessed bumps.
 * @param {import('./gstate.js').game} g
 * @param {number} offer
 * @param {number} suggested
 */
export function applyPriestDonationUblessedLoopLikeC(g, offer, suggested) {
    const u = g?.u;
    if (!u) return;
    let off = offer | 0;
    const step = (suggested | 0) * 2;
    if (step <= 0) return;
    for (; off >= step; off -= step) {
        const ub = u.ublessed | 0;
        if (!ub) u.ublessed = rn1(3, 2);
        else if (ub < 20 && (ub < 9 || !rn2(ub))) u.ublessed = ub + 1;
    }
    markBotlFindAc(g);
}

/**
 * C: sit.c **`attrcurse`** switch case **10** / crow-hall strip — **`HProtection &= ~INTRINSIC`**.
 * @returns {boolean} true if intrinsic Protection was present and cleared
 */
export function stripHProtectionIntrinsicSitCrowHallLikeC(g) {
    const hi = protIntrinsic(g);
    if ((hi & INTRINSIC) === 0) return false;
    setProtIntrinsic(g, hi & ~INTRINSIC);
    markBotlFindAc(g);
    return true;
}
