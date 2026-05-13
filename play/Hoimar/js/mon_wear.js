import { OBJECT_DELAY } from './object_data.js';
import { W_ARMF } from './const.js';

const M1_NOHANDS = 0x00002000;
const M1_MINDLESS = 0x00010000;
const M1_ANIMAL = 0x00040000;
const M1_SLITHY = 0x00080000;

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

function is_boots(obj) {
    return obj?.otyp >= 163 && obj?.otyp <= 172;
}

export function m_dowear_basic(mtmp, creation = false) {
    if (mtmp.mfrozen) return;
    // C ref: worn.c:m_dowear() rejects no-hand, animal, and most mindless
    // monsters before trying armor slots. This port currently models W_ARMF.
    if (!mon_has_hands(mtmp) || mon_is_animal(mtmp) || mon_is_mindless(mtmp)) return;
    if (!mon_has_feet_slot(mtmp)) return;
    if (mtmp.misc_worn_check & W_ARMF) return;
    const boots = (mtmp.inventory || []).find((obj) => is_boots(obj) && !obj.owornmask);
    if (!boots) return;
    mtmp.misc_worn_check = (mtmp.misc_worn_check || 0) | W_ARMF;
    boots.owornmask = (boots.owornmask || 0) | W_ARMF;
    if (!creation) {
        mtmp.mfrozen = OBJECT_DELAY[boots.otyp] || 0;
        if (mtmp.mfrozen) mtmp.mcanmove = 0;
    }
}
