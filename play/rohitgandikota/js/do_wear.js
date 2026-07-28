// do_wear.js — wearing and taking off armour.
// C ref: src/do_wear.c
//
// Only find_ac() so far. It matters at startup because u.uac is 0 out of the
// zeroed `struct you` and stays 0 through newgame(): the status line under the
// legacy window shows AC:0 for every role, armoured or not, and only
// moveloop_preamble()'s find_ac() turns that into the real number.

import { game } from './gstate.js';
import { mons } from './monst_data.js';
import { objects, ONAMES } from './objects_data.js';
import { W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU,
         W_RINGL, W_RINGR, W_AMUL, AC_MAX } from './const.js';
import { sgn } from './hacklib.js';

export function worn(mask) {
    return (game.invent || []).find(o => (o.owornmask & mask) !== 0) || null;
}

// include/obj.h:126 greatest_erosion()
function greatest_erosion(obj) {
    const a = obj.oeroded || 0, b = obj.oeroded2 || 0;
    return a > b ? a : b;
}

// include/hack.h:1526 ARM_BONUS(). include/objclass.h:102 aliases a_ac onto
// the oc_oc1 union member, which is the name the generated table carries.
export function ARM_BONUS(obj) {
    const a_ac = objects[obj.otyp].oc_oc1;
    return a_ac + (obj.spe || 0) - Math.min(greatest_erosion(obj), a_ac);
}

// src/do_wear.c:1500 find_ac()
export function find_ac() {
    const u = game.u;
    let uac = mons[u.umonnum ?? 0].ac;   /* base AC for the current form */

    for (const mask of [W_ARM, W_ARMC, W_ARMH, W_ARMF, W_ARMS, W_ARMG, W_ARMU]) {
        const obj = worn(mask);
        if (obj) uac -= ARM_BONUS(obj);
    }
    for (const mask of [W_RINGL, W_RINGR]) {
        const obj = worn(mask);
        if (obj && obj.otyp === ONAMES.RIN_PROTECTION) uac -= (obj.spe || 0);
    }
    const amul = worn(W_AMUL);
    if (amul && amul.otyp === ONAMES.AMULET_OF_GUARDING) uac -= 2;

    /* HProtection and u.uspellprot are both zero for a new hero */
    uac -= (u.uspellprot || 0);

    if (Math.abs(uac) > AC_MAX) uac = sgn(uac) * AC_MAX;

    if (uac !== u.uac) {
        u.uac = uac;
        game.disp = game.disp || {};
        game.disp.botl = true;
    }
}

// src/do_wear.c Armor_on() — called when a suit becomes worn.
//
// The core is two lines and it is SCREEN-VISIBLE: setting uarm.known makes
// the suit's enchantment evident, which is what lets the status line show the
// real AC. C's comment says exactly that.
//
// dragon_armor_handling and the artifact-light branch (begin_burn plus its
// "begins to shine" message) are recorded; neither fires for ordinary
// starting armour.
export function Armor_on() {
    if (!game.uarm)     /* no known instances of !uarm here but play it safe */
        return 0;
    if (!game.uarm.known) {
        game.uarm.known = 1;   /* +/- evident because of status line AC */
        note_unported_do_wear('Armor_on:update_inventory');
    }
    note_unported_do_wear('Armor_on:dragon_armor_handling');
    note_unported_do_wear('Armor_on:artifact_light');
    return 0;
}

/* include/prop.h enum prop_types, index -> uprops key. The flat uprops map
   keys by the C constant's name; setworn's generic property arm (src/worn.c)
   writes through this table when gear is put on. Index 0 is unused in C. */
const PROP_KEYS = [null,
    'FIRE_RES', 'COLD_RES', 'SLEEP_RES', 'DISINT_RES', 'SHOCK_RES',
    'POISON_RES', 'ACID_RES', 'STONE_RES', 'DRAIN_RES', 'SICK_RES',
    'INVULNERABLE', 'ANTIMAGIC', 'STUNNED', 'CONFUSION', 'BLINDED', 'DEAF',
    'SICK', 'STONED', 'STRANGLED', 'VOMITING', 'GLIB', 'SLIMED', 'HALLUC',
    'HALLUC_RES', 'FUMBLING', 'WOUNDED_LEGS', 'SLEEPY', 'HUNGER',
    'SEE_INVIS', 'TELEPAT', 'WARNING', 'WARN_OF_MON', 'WARN_UNDEAD',
    'SEARCHING', 'CLAIRVOYANT', 'INFRAVISION', 'DETECT_MONSTERS', 'BLND_RES',
    'ADORNED', 'INVIS', 'DISPLACED', 'STEALTH', 'AGGRAVATE_MONSTER',
    'CONFLICT', 'JUMPING', 'TELEPORT', 'TELEPORT_CONTROL', 'LEVITATION',
    'FLYING', 'WWALKING', 'SWIMMING', 'MAGICAL_BREATHING', 'PASSES_WALLS',
    'SLOW_DIGESTION', 'HALF_SPDAM', 'HALF_PHDAM', 'REGENERATION',
    'ENERGY_REGENERATION', 'PROTECTION', 'PROT_FROM_SHAPE_CHANGERS',
    'POLYMORPH', 'POLYMORPH_CONTROL', 'UNCHANGING', 'FAST', 'REFLECTING',
    'FREE_ACTION', 'FIXED_ABIL', 'LIFESAVED'];

/* src/worn.c setworn() — the generic arm: wearing an object grants its
   oc_oprop as an extrinsic. This is what makes a Ranger's starting cloak of
   displacement register as Displaced (a 5.0 kit change set_apparxy exposed:
   monsters aim rn2-scattered guesses at a displaced hero every turn). */
function apply_worn_oprop(o) {
    const p = o ? objects[o.otyp].oc_oprop : 0;
    if (p && PROP_KEYS[p])
        (game.u.uprops ||= {})[PROP_KEYS[p]] = 1;
}

// src/do_wear.c set_wear() — apply the on-effects of worn gear.
//
// With obj null it walks EVERY worn slot; with an object it does just that
// one. C's `!obj ? uslot != 0 : (obj == uslot)` is that test written once per
// slot, and the ORDER is fixed: blindfold, right ring, left ring, amulet,
// then shirt, suit, cloak, boots, gloves, helmet, shield.
//
// The property grant each handler relies on comes from setworn and is applied
// here per slot. The handlers' remaining effects are messages (suppressed at
// initial don) and side effects like vision recalcs; the slots whose handler
// does more than the property keep their record.
export function set_wear(obj) {
    game.initial_don = !obj;
    const slotobj = (mask) => worn(mask);

    if (game.ublindf && (!obj || obj === game.ublindf))
        note_unported_do_wear('set_wear:Blindf_on');
    for (const mask of [W_RINGR, W_RINGL]) {
        const o = slotobj(mask);
        if (o && (!obj || obj === o)) {
            apply_worn_oprop(o);
            note_unported_do_wear('set_wear:Ring_on');
        }
    }
    {
        const o = slotobj(W_AMUL);
        if (o && (!obj || obj === o)) {
            apply_worn_oprop(o);
            note_unported_do_wear('set_wear:Amulet_on');
        }
    }

    for (const [mask, arm] of [[W_ARMU, 'Shirt_on'], [W_ARM, 'Armor_on'],
                               [W_ARMC, 'Cloak_on'], [W_ARMF, 'Boots_on'],
                               [W_ARMG, 'Gloves_on'], [W_ARMH, 'Helmet_on'],
                               [W_ARMS, 'Shield_on']]) {
        const o = slotobj(mask);
        if (o && (!obj || obj === o)) {
            apply_worn_oprop(o);
            if (arm === 'Armor_on')
                Armor_on();
            /* the slot handlers' messages are suppressed at initial don
               (C gates them on gi.initial_don), so the property grant is
               the whole observable effect for a starting kit */
        }
    }

    game.initial_don = false;
}

function note_unported_do_wear(what) {
    (game.unported ||= new Set()).add('do_wear:' + what);
}
