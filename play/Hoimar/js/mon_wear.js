import { OBJECT_DELAY } from './object_data.js';
import {
    W_AMUL, W_ARM, W_ARMC, W_ARMF, W_ARMG, W_ARMH, W_ARMS, W_ARMU,
} from './const.js';
import { game } from './gstate.js';
import { randomHallucinatedMonsterName } from './random_text.js';

const M1_NOHANDS = 0x00002000;
const M1_MINDLESS = 0x00010000;
const M1_ANIMAL = 0x00040000;
const M1_SLITHY = 0x00080000;
const MZ_HUMAN = 2;

function mon_has_hands(mtmp) {
    return !((mtmp.data?.mflags1 ?? 0) & M1_NOHANDS);
}

function mon_is_mindless(mtmp) {
    return !!((mtmp.data?.mflags1 ?? 0) & M1_MINDLESS);
}

function mon_is_animal(mtmp) {
    return !!((mtmp.data?.mflags1 ?? 0) & M1_ANIMAL);
}

function mon_has_feet_slot(mtmp) {
    const flags1 = mtmp.data?.mflags1 ?? 0;
    return !(flags1 & M1_SLITHY) && mtmp.data?.mlet !== 'S_CENTAUR';
}

function can_wear_suit_slot(mtmp) {
    // C ref: mondata.h:cantweararm(). The generated data carries msize for
    // ordinary humanoids used in current evidence; unknown sizes default to
    // human-sized rather than suppressing the C slot scan.
    return (mtmp.data?.msize ?? MZ_HUMAN) >= MZ_HUMAN;
}

function hallucinating() {
    return !!((game.u?.uhallucination || game.u?.uprops?.hallucination)
        && !game.program_state?.gameover);
}

function mon_name_side_effect() {
    // C ref: worn.c:m_dowear_type() copies mon_nam(mon) before checking
    // whether the slot has a better item. Under Hallucination this consumes
    // rndmonnam() display RNG even when no wear message follows.
    if (hallucinating()) randomHallucinatedMonsterName('the');
}

function object_slot(obj) {
    const otyp = obj?.otyp;
    if (otyp >= 89 && otyp <= 100) return W_ARMH;
    if (otyp >= 101 && otyp <= 135) return W_ARM;
    if (otyp >= 136 && otyp <= 137) return W_ARMU;
    if (otyp >= 138 && otyp <= 149) return W_ARMC;
    if (otyp >= 150 && otyp <= 158) return W_ARMS;
    if (otyp >= 159 && otyp <= 162) return W_ARMG;
    if (is_boots(obj)) return W_ARMF;
    if (otyp >= 201 && otyp <= 213) return W_AMUL;
    return 0;
}

function is_boots(obj) {
    return obj?.otyp >= 163 && obj?.otyp <= 172;
}

function worn_in_slot(mtmp, slot) {
    return (mtmp.inventory || []).find((obj) => (obj.owornmask || 0) & slot) || null;
}

function first_unworn_in_slot(mtmp, slot) {
    return (mtmp.inventory || []).find((obj) => object_slot(obj) === slot && !obj.owornmask) || null;
}

function m_dowear_type_basic(mtmp, slot, creation = false) {
    if (mtmp.mfrozen) return false;
    if (!creation) mon_name_side_effect();
    const old = worn_in_slot(mtmp, slot);
    const best = first_unworn_in_slot(mtmp, slot);
    if (!best || old) return false;
    mtmp.misc_worn_check = (mtmp.misc_worn_check || 0) | slot;
    best.owornmask = (best.owornmask || 0) | slot;
    if (!creation) {
        mtmp.mfrozen = OBJECT_DELAY[best.otyp] || 0;
        if (mtmp.mfrozen) mtmp.mcanmove = 0;
    }
    return true;
}

export function m_dowear_basic(mtmp, creation = false) {
    if (mtmp.mfrozen) return;
    // C ref: worn.c:m_dowear() rejects no-hand, animal, and most mindless
    // monsters before trying armor slots.
    if (!mon_has_hands(mtmp) || mon_is_animal(mtmp) || mon_is_mindless(mtmp)) return;
    const canWearSuit = can_wear_suit_slot(mtmp);
    m_dowear_type_basic(mtmp, W_AMUL, creation);
    if (canWearSuit && !(mtmp.misc_worn_check & W_ARM))
        m_dowear_type_basic(mtmp, W_ARMU, creation);
    if (canWearSuit) m_dowear_type_basic(mtmp, W_ARMC, creation);
    m_dowear_type_basic(mtmp, W_ARMH, creation);
    m_dowear_type_basic(mtmp, W_ARMS, creation);
    m_dowear_type_basic(mtmp, W_ARMG, creation);
    if (mon_has_feet_slot(mtmp)) m_dowear_type_basic(mtmp, W_ARMF, creation);
    if (canWearSuit) m_dowear_type_basic(mtmp, W_ARM, creation);
}
