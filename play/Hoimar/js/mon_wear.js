import { OBJECT_DELAY, OBJECT_MATERIAL } from './object_data.js';
import {
    I_SPECIAL,
    W_AMUL, W_ARM, W_ARMC, W_ARMF, W_ARMG, W_ARMH, W_ARMS, W_ARMU,
    W_SADDLE,
} from './const.js';
import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { randomHallucinatedMonsterName } from './random_text.js';

const M1_NOHANDS = 0x00002000;
const M1_MINDLESS = 0x00010000;
const M1_HUMANOID = 0x00020000;
const M1_ANIMAL = 0x00040000;
const M1_SLITHY = 0x00080000;
const M1_AMORPHOUS = 0x00000004;
const M1_UNSOLID = 0x00100000;
const MZ_SMALL = 1;
const MZ_HUMAN = 2;
const MZ_LARGE = 3;
const MZ_HUGE = 4;
const LEATHER = 7;
const RUBBER_HOSE = 78;
const MUMMY_WRAPPING = 138;
const ELVEN_LEATHER_HELM = 89;
const ELVEN_MITHRIL_COAT = 127;
const ELVEN_CLOAK = 139;
const ELVEN_SHIELD = 153;
const ELVEN_BOOTS = 169;
const ELVEN_ARMOR = new Set([
    ELVEN_LEATHER_HELM, ELVEN_MITHRIL_COAT, ELVEN_CLOAK, ELVEN_SHIELD, ELVEN_BOOTS,
]);

function mon_has_hands(mtmp) {
    return !((mtmp.data?.mflags1 ?? 0) & M1_NOHANDS);
}

function mon_is_mindless(mtmp) {
    return !!((mtmp.data?.mflags1 ?? 0) & M1_MINDLESS);
}

function mon_is_animal(mtmp) {
    return !!((mtmp.data?.mflags1 ?? 0) & M1_ANIMAL);
}

function mon_is_verysmall(mtmp) {
    return (mtmp.data?.msize ?? MZ_HUMAN) < MZ_SMALL;
}

function mon_is_humanoid(mtmp) {
    return !!((mtmp.data?.mflags1 ?? 0) & M1_HUMANOID);
}

function mon_is_noncorporeal(mtmp) {
    return mtmp.data?.mlet === 'S_GHOST';
}

function mon_is_amorphous(mtmp) {
    return !!((mtmp.data?.mflags1 ?? 0) & M1_AMORPHOUS);
}

function mon_is_unsolid(mtmp) {
    return !!((mtmp.data?.mflags1 ?? 0) & M1_UNSOLID);
}

function mon_is_whirly(mtmp) {
    return mtmp.data?.mlet === 'S_VORTEX' || mtmp.data?.name === 'AIR_ELEMENTAL';
}

function mon_slips_armor(mtmp) {
    const size = mtmp.data?.msize ?? MZ_HUMAN;
    return mon_is_whirly(mtmp) || size <= MZ_SMALL || mon_is_noncorporeal(mtmp);
}

function mon_breaks_armor(mtmp) {
    if (mon_slips_armor(mtmp)) return false;
    const size = mtmp.data?.msize ?? MZ_HUMAN;
    return size >= MZ_LARGE
        || (size > MZ_SMALL && !mon_is_humanoid(mtmp))
        || mtmp.data?.name === 'MARILITH'
        || mtmp.data?.name === 'WINGED_GARGOYLE';
}

function mon_cant_wear_armor(mtmp) {
    return mon_breaks_armor(mtmp) || mon_slips_armor(mtmp);
}

function mon_wrapping_allowed(mtmp) {
    const size = mtmp.data?.msize ?? MZ_HUMAN;
    return mon_is_humanoid(mtmp)
        && size >= MZ_SMALL && size <= MZ_HUGE
        && !mon_is_noncorporeal(mtmp)
        && mtmp.data?.mlet !== 'S_CENTAUR'
        && mtmp.data?.name !== 'WINGED_GARGOYLE'
        && mtmp.data?.name !== 'MARILITH';
}

function mon_has_feet_slot(mtmp) {
    const flags1 = mtmp.data?.mflags1 ?? 0;
    return !(flags1 & M1_SLITHY) && mtmp.data?.mlet !== 'S_CENTAUR';
}

function mon_has_horns(mtmp) {
    return ['HORNED_DEVIL', 'MINOTAUR', 'ASMODEUS', 'BALROG',
        'WHITE_UNICORN', 'GRAY_UNICORN', 'BLACK_UNICORN', 'KI_RIN']
        .includes(mtmp.data?.name);
}

function can_saddle_basic(mtmp) {
    const mlet = mtmp.data?.mlet;
    return ['S_QUADRUPED', 'S_UNICORN', 'S_ANGEL', 'S_CENTAUR', 'S_DRAGON', 'S_JABBERWOCK'].includes(mlet)
        && (mtmp.data?.msize ?? MZ_HUMAN) >= MZ_HUMAN
        && (!mon_is_humanoid(mtmp) || mlet === 'S_CENTAUR')
        && !mon_is_amorphous(mtmp)
        && !mon_is_noncorporeal(mtmp)
        && !mon_is_whirly(mtmp)
        && !mon_is_unsolid(mtmp);
}

function is_flimsy_object(obj) {
    return (OBJECT_MATERIAL[obj?.otyp] ?? 0) <= LEATHER || obj?.otyp === RUBBER_HOSE;
}

function can_wear_suit_slot(mtmp) {
    // C refs: src/worn.c:m_dowear(), src/mondata.c:breakarm().
    return !mon_cant_wear_armor(mtmp);
}

function can_wear_cloak_object(mtmp, obj, canWearSuit) {
    if (canWearSuit) return true;
    if (!mon_wrapping_allowed(mtmp)) return false;
    return (mtmp.data?.msize ?? MZ_HUMAN) <= MZ_HUMAN || obj?.otyp === MUMMY_WRAPPING;
}

function racial_exception(mtmp, obj) {
    // C ref: src/worn.c:racial_exception().
    if (mtmp.data?.name === 'HOBBIT' && ELVEN_ARMOR.has(obj?.otyp)) return true;
    return false;
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

function monster_hallu_pronoun_side_effects() {
    if (!hallucinating()) return;
    // C refs: worn.c:mon_break_armor(), you.h:mhim()/mhis(),
    // mondata.c:pronoun_gender(). mon_break_armor() computes both pronouns
    // at entry, before any armor-slot tests.
    rn2(4);
    rn2(4);
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

function remove_from_inventory(mtmp, obj) {
    const inv = mtmp?.inventory || [];
    const idx = inv.indexOf(obj);
    const wornMask = obj?.owornmask || 0;
    if (idx >= 0) inv.splice(idx, 1);
    if (mtmp?.mw === obj) mtmp.mw = null;
    if (obj) obj.owornmask = 0;
    if (mtmp) {
        mtmp.misc_worn_check = (mtmp.misc_worn_check || 0) & ~wornMask;
        if (wornMask) mtmp.misc_worn_check |= I_SPECIAL;
    }
}

function useup_monster_armor(mtmp, obj) {
    remove_from_inventory(mtmp, obj);
}

function lose_monster_armor(mtmp, obj, dropObject) {
    remove_from_inventory(mtmp, obj);
    if (obj && dropObject) dropObject(mtmp, obj);
}

function first_unworn_in_slot(mtmp, slot, acceptsObject = null) {
    return (mtmp.inventory || []).find((obj) => object_slot(obj) === slot
        && !obj.owornmask
        && (!acceptsObject || acceptsObject(obj))) || null;
}

function m_dowear_type_basic(mtmp, slot, creation = false, acceptsObject = null) {
    if (mtmp.mfrozen) return false;
    if (!creation) mon_name_side_effect();
    const old = worn_in_slot(mtmp, slot);
    const best = first_unworn_in_slot(mtmp, slot, acceptsObject);
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
    if (mon_is_verysmall(mtmp) || !mon_has_hands(mtmp)
        || mon_is_animal(mtmp) || mon_is_mindless(mtmp)) return;
    const canWearSuit = can_wear_suit_slot(mtmp);
    m_dowear_type_basic(mtmp, W_AMUL, creation);
    if (canWearSuit && !(mtmp.misc_worn_check & W_ARM))
        m_dowear_type_basic(mtmp, W_ARMU, creation);
    if (canWearSuit || mon_wrapping_allowed(mtmp))
        m_dowear_type_basic(mtmp, W_ARMC, creation,
            (obj) => can_wear_cloak_object(mtmp, obj, canWearSuit));
    m_dowear_type_basic(mtmp, W_ARMH, creation);
    m_dowear_type_basic(mtmp, W_ARMS, creation);
    m_dowear_type_basic(mtmp, W_ARMG, creation);
    if (mon_has_feet_slot(mtmp)) m_dowear_type_basic(mtmp, W_ARMF, creation);
    m_dowear_type_basic(mtmp, W_ARM, creation,
        (obj) => canWearSuit || racial_exception(mtmp, obj));
}

export function mon_break_armor_basic(mtmp, options = {}) {
    if (!mtmp) return;
    const dropObject = options.dropObject || null;
    monster_hallu_pronoun_side_effects();
    const breakArmor = mon_breaks_armor(mtmp);
    const slipArmor = !breakArmor && mon_slips_armor(mtmp);
    if (breakArmor) {
        let obj = worn_in_slot(mtmp, W_ARM);
        if (obj) useup_monster_armor(mtmp, obj);
        obj = worn_in_slot(mtmp, W_ARMC);
        if (obj && (obj.otyp !== MUMMY_WRAPPING || !mon_wrapping_allowed(mtmp))) {
            if (obj.oartifact) lose_monster_armor(mtmp, obj, dropObject);
            else useup_monster_armor(mtmp, obj);
        }
        obj = worn_in_slot(mtmp, W_ARMU);
        if (obj) useup_monster_armor(mtmp, obj);
    } else if (slipArmor) {
        let obj = worn_in_slot(mtmp, W_ARM);
        if (obj) lose_monster_armor(mtmp, obj, dropObject);
        obj = worn_in_slot(mtmp, W_ARMC);
        if (obj && (obj.otyp !== MUMMY_WRAPPING || !mon_wrapping_allowed(mtmp)))
            lose_monster_armor(mtmp, obj, dropObject);
        obj = worn_in_slot(mtmp, W_ARMU);
        if (obj) lose_monster_armor(mtmp, obj, dropObject);
    }
    const handlessOrTiny = !mon_has_hands(mtmp) || mon_is_verysmall(mtmp);
    if (handlessOrTiny) {
        let obj = worn_in_slot(mtmp, W_ARMG);
        if (obj) lose_monster_armor(mtmp, obj, dropObject);
        obj = worn_in_slot(mtmp, W_ARMS);
        if (obj) lose_monster_armor(mtmp, obj, dropObject);
    }
    if (handlessOrTiny || mon_has_horns(mtmp)) {
        const obj = worn_in_slot(mtmp, W_ARMH);
        if (obj && (handlessOrTiny || !is_flimsy_object(obj)))
            lose_monster_armor(mtmp, obj, dropObject);
    }
    if (handlessOrTiny || ((mtmp.data?.mflags1 ?? 0) & M1_SLITHY) || mtmp.data?.mlet === 'S_CENTAUR') {
        const obj = worn_in_slot(mtmp, W_ARMF);
        if (obj) lose_monster_armor(mtmp, obj, dropObject);
    }
    if (!can_saddle_basic(mtmp)) {
        const obj = worn_in_slot(mtmp, W_SADDLE);
        if (obj) lose_monster_armor(mtmp, obj, dropObject);
    }
}
