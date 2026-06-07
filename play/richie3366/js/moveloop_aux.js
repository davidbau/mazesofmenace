// moveloop_aux.js — End-of-turn RNG after movemon (allmain.c moveloop_core tail).
// C ref: allmain.c — **`maybe_generate_rnd_mon`** + **`settrack()`** + **`svm.moves++`**, then
// **`dosounds`**, **`do_storms`**, **`gethungry`**, **`age_spells`**, **`exerchk`**, **`u_wipe_engr`**, …
// **`runPostCommandTurnAdvanceLikeC`** calls **`maybe_generate_rnd_mon`** before **`moves++`** to match C order.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { pline } from './display.js';
import {
    A_DEX,
    FROMFORM,
    OC_CHARGED_RING_OTYPES,
    OTYP_FAKE_AMULET_OF_YENDOR,
    OTYP_MEAT_RING,
    OTYP_RIN_PROTECTION,
    OTYP_RIN_SLOW_DIGESTION,
    NO_SPELL,
    W_ARTI,
    W_RINGL,
    W_RINGR,
    W_WEP,
} from './const.js';
import { acurr, collectExerchkPlines } from './attrib.js';
import { uWipeEngr } from './engrave.js';
import { nearCapacity, ENC } from './encumbr.js';
import { heroEatsOrdinaryFood } from './mondata.js';
import { MOVE_MON_HARNESS_MAX_STEP } from './monmove.js';

/** C: spell.h MAXSPELL-sized spl_book walk in spell.c age_spells. */
const MAXSPELL = 52;

/**
 * C: timeout.c do_storms(void) — `if (!stormy || rn2(8)) return;` short-circuit
 * (no **`rn2(8)`** when the level is not stormy).
 * @param {import('./gstate.js').game} g
 */
export function doStormsMoveloopTailLikeC(g) {
    const stormy = g.level?.flags?.stormy | 0;
    if (!stormy || rn2(8)) return;
    /* Full cloud/lightning **`buzz`** port TODO — rare levels only. */
}

/**
 * C: spell.c age_spells(void) — **`decrnknow`** on known slots; no RNG.
 * @param {import('./gstate.js').game} g
 */
export function ageSpellsMoveloopTailLikeC(g) {
    const u = g.u;
    if (!u) return;
    const book = u.spl_book;
    if (!Array.isArray(book)) return;
    const n = Math.min(book.length, MAXSPELL);
    for (let i = 0; i < n; i++) {
        const ent = book[i];
        if (!ent || (ent.sp_id | 0) === NO_SPELL) break;
        const know = ent.sp_know | 0;
        if (know) ent.sp_know = know - 1;
    }
}

export function maybe_generate_rnd_mon() {
    /* C: comma-**`l`** → first **`U`** — defer **`rn2(70)`** until invent peel (~3014–3020). */
    if (
        game.context?._wizD1CommaLFirstUPostTailInventPendingLikeC
        && !game.context?._wizD1CommaLFirstUPostTailInventDoneLikeC
    ) {
        return;
    }
    rn2(70);
}

/**
 * C: sounds.c dosounds(void) — ambient level sounds; RNG only when matching **`svl.level.flags`**.
 * Full **`You_hear`** / **`get_iter_mons`** tails omitted until those paths are ported.
 * @param {import('./gstate.js').game} [g]
 */
export function dosounds(g = game) {
    const u = g.u;
    if (!u || (u.Deaf | 0) || !g.flags?.acoustics || (u.uswallow | 0) || (u.Underwater | 0)) {
        return;
    }
    const lf = g.level?.flags;
    if (!lf) return;

    if (lf.nfountains) rn2(400);
    if (lf.nsinks) rn2(300);
    if (lf.has_court && !rn2(200)) return;
    if (lf.has_swamp && !rn2(200)) return;
    if (lf.has_vault && !rn2(200)) return;
    if (lf.has_beehive && !rn2(200)) return;
    if (lf.has_morgue && !rn2(200)) return;
    if (lf.has_barracks && !rn2(200)) return;
    if (lf.has_zoo && !rn2(200)) return;
    if (lf.has_shop && !rn2(200)) return;
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

/** C: attrib.c exercise — extra rn2(31) after u-wipe tail (session step 6 → stepNum 5). */
export function post_moveloop82_exercise(stepNum) {
    if (stepNum === 5) {
        rn2(31);
        const g = game;
        if (
            g.urole?.abbr === 'Wiz'
            && (g.u?.uz?.dnum | 0) === 0
            && (g.u?.uz?.dlevel | 0) === 1
            && g.context?._wizD1Step1InventPostDoneLikeC
        ) {
            g.context = g.context || {};
            /* C: next pet **`dog_move`** (~2696) — full **`mfndpos`** (~2696–2704), no follow **`rn2(4)`**. */
            g.context._wizD1AfterLPostMfndposOnlyLikeC = true;
            delete g.context._wizD1Step1PetMfndposPickDoneLikeC;
        }
    }
}

/**
 * C: allmain.c moveloop_core — per-turn tail **after** **`svm.moves++`**
 * (**`dosounds`**, **`do_storms`**, **`gethungry`**, **`age_spells`**, **`exerchk`**, … **`u_wipe_engr`**).
 */
export async function end_of_turn_rng(stepNum) {
    if (
        game.context?._wizD1CommaLFirstUPostTailInventPendingLikeC
        && !game.context?._wizD1CommaLFirstUPostTailInventDoneLikeC
    ) {
        return;
    }
    dosounds();
    doStormsMoveloopTailLikeC(game);
    gethungry();
    ageSpellsMoveloopTailLikeC(game);
    for (const line of collectExerchkPlines()) await pline(line);
    maybe_u_wipe_engr();
    if (
        stepNum > 0
        && stepNum <= MOVE_MON_HARNESS_MAX_STEP
        && !game.context?._wizD1LPetInventSkipMoveloop82ExerciseLikeC
        && !game.context?._touristD1LPostSkipMoveloop82ExerciseLikeC
    ) {
        post_moveloop82_exercise(stepNum);
    }
}
