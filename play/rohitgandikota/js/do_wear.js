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
         W_RINGL, W_RINGR, W_AMUL, AC_MAX, I_SPECIAL } from './const.js';
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

// src/do_wear.c set_wear() — apply the on-effects of worn gear.
//
// With obj null it walks EVERY worn slot; with an object it does just that
// one. C's `!obj ? uslot != 0 : (obj == uslot)` is that test written once per
// slot, and the ORDER is fixed: blindfold, right ring, left ring, amulet,
// then shirt, suit, cloak, boots, gloves, helmet, shield.
//
// Only Armor_on is ported. The other nine slot handlers -- Blindf_on,
// Ring_on, Amulet_on, Shirt_on, Cloak_on, Boots_on, Gloves_on, Helmet_on,
// Shield_on -- do not exist yet and are recorded by slot, so game.unported
// names which one a divergence wanted.
export function set_wear(obj) {
    game.initial_don = !obj;

    if (!obj ? game.ublindf : (obj === game.ublindf))
        note_unported_do_wear('set_wear:Blindf_on');
    if (!obj ? game.uright : (obj === game.uright))
        note_unported_do_wear('set_wear:Ring_on:right');
    if (!obj ? game.uleft : (obj === game.uleft))
        note_unported_do_wear('set_wear:Ring_on:left');
    if (!obj ? game.uamul : (obj === game.uamul))
        note_unported_do_wear('set_wear:Amulet_on');

    if (!obj ? game.uarmu : (obj === game.uarmu))
        note_unported_do_wear('set_wear:Shirt_on');
    if (!obj ? game.uarm : (obj === game.uarm))
        Armor_on();
    if (!obj ? game.uarmc : (obj === game.uarmc))
        note_unported_do_wear('set_wear:Cloak_on');
    if (!obj ? game.uarmf : (obj === game.uarmf))
        note_unported_do_wear('set_wear:Boots_on');
    if (!obj ? game.uarmg : (obj === game.uarmg))
        note_unported_do_wear('set_wear:Gloves_on');
    if (!obj ? game.uarmh : (obj === game.uarmh))
        note_unported_do_wear('set_wear:Helmet_on');
    if (!obj ? game.uarms : (obj === game.uarms))
        note_unported_do_wear('set_wear:Shield_on');

    game.initial_don = false;
}

function note_unported_do_wear(what) {
    (game.unported ||= new Set()).add('do_wear:' + what);
}

// src/do_wear.c:1645 cancel_doff() — called by setworn() for the old item in
// a slot, and by setnotworn() for a specific item.
//
// The mask clear is the whole observable effect for us and is ported exactly.
//
// The cancel_don() arm is recorded: donning() and cancel_don() are both
// absent. C's comment explains why the I_SPECIAL guard exists -- do_takeoff()
// sets that flag so a setworn(0) reached via <X>_off() does NOT cancel the
// don, which is what lets the 'A' command continue to its next selected item.
// Approximating that would break multi-item takeoff in a way no current
// session exercises.
export function cancel_doff(obj, slotmask) {
    const t = (game.context.takeoff ||= {});

    if (!((t.mask | 0) & I_SPECIAL))
        note_unported_do_wear('cancel_doff:donning_cancel_don');

    t.mask = (t.mask | 0) & ~slotmask;
}
