// moveloop_aux.js — End-of-turn RNG after movemon (allmain.c moveloop_core tail).
// C ref: allmain.c (maybe_generate_rnd_mon, dosounds, …), eat.c gethungry (called from allmain after moves++).
//
// `pre_moveloop82_exercise` / `post_moveloop82_exercise` still replay bare `rn2` for session harness.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import {
    A_DEX,
    FROMFORM,
    OC_CHARGED_RING_OTYPES,
    OTYP_FAKE_AMULET_OF_YENDOR,
    OTYP_MEAT_RING,
    OTYP_RIN_PROTECTION,
    OTYP_RIN_SLOW_DIGESTION,
    W_ARTI,
    W_RINGL,
    W_RINGR,
    W_WEP,
} from './const.js';
import { acurr } from './attrib.js';
import { uWipeEngr } from './engrave.js';
import { nearCapacity, ENC } from './encumbr.js';
import { heroEatsOrdinaryFood } from './mondata.js';

export function maybe_generate_rnd_mon() {
    rn2(70);
}

export function dosounds() {
    rn2(300);
}

/** C: eat.c gethungry — (HRegeneration & ~FROMFORM) || (ERegeneration & ~(W_ARTI | W_WEP)) */
function gethungryRegenerationDrains(u) {
    const h = u.HRegeneration | 0;
    const e = u.ERegeneration | 0;
    return (h & ~FROMFORM) !== 0 || (e & ~(W_ARTI | W_WEP)) !== 0;
}

/** C: eat.c gethungry — HConflict || (EConflict & (~W_ARTI)) */
function gethungryConflictDrains(u) {
    if (u.HConflict | 0) return true;
    return ((u.EConflict | 0) & ~W_ARTI) !== 0;
}

/**
 * C: eat.c gethungry(void) — ordinary uhunger--, accessorytime = rn2(20),
 * odd/even branches (regen/conflict masks), switch 0/4/8/12/16; newuhs from allmain.
 */
/** C: eat.c objects[otyp].oc_charged — RING() chrg bit; full invent may override on otmp later. */
function ringOcCharged(ot) {
    return OC_CHARGED_RING_OTYPES.has(ot | 0);
}

/** C: eat.c gethungry case 4 — uleft. */
function gethungryLeftRing(uleft, u) {
    if (!uleft) return;
    const ot = uleft.otyp | 0;
    if (ot === OTYP_MEAT_RING) return;
    const spe = uleft.spe | 0;
    const ep = u.EProtection | 0;
    const protCase =
        ot === OTYP_RIN_PROTECTION &&
        spe === 0 &&
        ((ep & ~W_RINGL) === 0 ||
            ((ep & ~W_RINGL) === W_RINGR &&
                u.uright &&
                (u.uright.otyp | 0) === OTYP_RIN_PROTECTION &&
                !(u.uright.spe | 0)));
    if (spe !== 0 || !ringOcCharged(ot) || protCase) u.uhunger--;
}

/** C: eat.c gethungry case 12 — uright. */
function gethungryRightRing(uright, u) {
    if (!uright) return;
    const ot = uright.otyp | 0;
    if (ot === OTYP_MEAT_RING) return;
    const spe = uright.spe | 0;
    const ep = u.EProtection | 0;
    const protCase = ot === OTYP_RIN_PROTECTION && spe === 0 && (ep & ~W_RINGR) === 0;
    if (spe !== 0 || !ringOcCharged(ot) || protCase) u.uhunger--;
}

export function gethungry() {
    const u = game.u;
    if (!u || typeof u.uhunger !== 'number') return;
    if (u.uinvulnerable || game.iflags?.debug_hunger) return;

    /* C: (!Unaware || !rn2(10)) && (carnivorous||herbivorous||metallivorous)(youmonst.data) && !Slow_digestion */
    const unaware = u.Unaware | 0;
    if ((!unaware || !rn2(10)) && heroEatsOrdinaryFood() && !u.Slow_digestion) u.uhunger--;

    const accessorytime = rn2(20);
    if (accessorytime % 2) {
        if (gethungryRegenerationDrains(u)) u.uhunger--;
        if (nearCapacity() > ENC.SLT_ENCUMBER) u.uhunger--;
    } else {
        if (u.Hunger) u.uhunger--;
        if (gethungryConflictDrains(u)) u.uhunger--;
    }
    /* C: eat.c gethungry — switch (accessorytime); even cases 0,4,8,12,16 */
    switch (accessorytime) {
        case 0: {
            /* C: Slow_digestion && neither hand wears ring of slow digestion */
            const noSdRing = (h) => !h || (h.otyp | 0) !== OTYP_RIN_SLOW_DIGESTION;
            if ((u.Slow_digestion | 0) && noSdRing(u.uright) && noSdRing(u.uleft)) u.uhunger--;
            break;
        }
        case 4:
            gethungryLeftRing(u.uleft, u);
            break;
        case 12:
            gethungryRightRing(u.uright, u);
            break;
        case 8:
            if (u.uamul && (u.uamul.otyp | 0) !== OTYP_FAKE_AMULET_OF_YENDOR) u.uhunger--;
            break;
        case 16:
            if (u.uhave?.amulet) u.uhunger--;
            break;
        default:
            break;
    }
    /* C: eat.c gethungry — newuhs(TRUE) after hunger math (wired from allmain.js). */
}

/** C: allmain.c — if (!rn2(40 + ACURR(A_DEX) * 3)) u_wipe_engr(rnd(3)); */
export function maybe_u_wipe_engr() {
    const u = game.u;
    if (!u) return;
    const dex = acurr(A_DEX);
    const denom = 40 + Math.trunc(dex * 3);
    if (!rn2(denom)) uWipeEngr(rnd(3));
}

/** C: attrib.c exercise — rn2(19) before final moveloop rn2(82) on some turns. */
export function pre_moveloop82_exercise(stepNum) {
    if (stepNum === 9) rn2(19);
}

/** C: allmain.c moveloop_core — trailing rn2(82) in this session build. */
export function moveloop_core_rng82() {
    rn2(82);
}

/** C: attrib.c exercise — extra rn2(31) after rn2(82) on harness step 6. */
export function post_moveloop82_exercise(stepNum) {
    if (stepNum === 6) rn2(31);
}

/** Full tail after movemon for one game-time step (harness range only). */
export function end_of_turn_rng(stepNum) {
    maybe_generate_rnd_mon();
    dosounds();
    maybe_u_wipe_engr();
    pre_moveloop82_exercise(stepNum);
    moveloop_core_rng82();
    post_moveloop82_exercise(stepNum);
}
