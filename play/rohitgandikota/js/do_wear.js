// do_wear.js — wearing and taking off armour.
// C ref: src/do_wear.c
//
// Only find_ac() so far. It matters at startup because u.uac is 0 out of the
// zeroed `struct you` and stays 0 through newgame(): the status line under the
// legacy window shows AC:0 for every role, armoured or not, and only
// moveloop_preamble()'s find_ac() turns that into the real number.

import { game } from './gstate.js';
import { rnd } from './rng.js';
import { mons } from './monst_data.js';
import { objects, ONAMES } from './objects_data.js';
import { W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU,
         W_RINGL, W_RINGR, W_AMUL, AC_MAX, I_SPECIAL,
         FUMBLING, TIMEOUT, ACID_RES, FAST, LEVITATION,
         FROMOUTSIDE } from './const.js';
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
    /* reads game.u.uarm, the slot js/worn.js's worn[] table actually writes;
       this read game.uarm, which nothing assigns -- the same defect fixed in
       js/uhitm.js and js/do.js for uwep. */
    if (!game.u.uarm)   /* no known instances of !uarm here but play it safe */
        return 0;
    if (!game.u.uarm.known) {
        game.u.uarm.known = 1; /* +/- evident because of status line AC */
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

// src/do_wear.c Shirt_on() — the afternmv callback for putting on a shirt.
//
// C's own comment is the point: "no shirt currently requires special
// handling when put on, but we keep this uncommented in case somebody adds
// a new one which does". So the switch does nothing for the two real
// shirts and exists only to catch an unrecognised otyp.
//
// Ported with that shape intact rather than collapsed to the `known` check,
// because the empty switch IS the C and a 5.1 shirt with an effect would
// land in it.
export function Shirt_on() {
    if (!game.u.uarmu)
        return 0;

    switch (game.u.uarmu.otyp) {
    case ONAMES.HAWAIIAN_SHIRT:
    case ONAMES.T_SHIRT:
        break;
    default:
        /* C calls impossible(unknown_type, c_shirt, uarmu->otyp) */
        note_unported_do_wear('Shirt_on:impossible_unknown_type');
        break;
    }

    if (!game.u.uarmu.known) {
        game.u.uarmu.known = 1; /* +/- evident because of status line AC */
        note_unported_do_wear('Shirt_on:update_inventory');
    }
    return 0;
}

// src/do_wear.c Shield_on() — the afternmv callback for putting on a shield.
//
// Same shape as Shirt_on: the switch does nothing for every real shield and
// exists to catch an unrecognised otyp. C's comment explains why even the
// MAGICAL shields need no case here -- "the magical shields are handled by
// setting u.uprops[*].extrinsic in setworn() called by
// armor_or_accessory_on() before Shield_on()". That path now works in this
// port, so a shield of reflection genuinely confers its property before this
// callback runs.
export function Shield_on() {
    if (!game.u.uarms)
        return 0;

    switch (game.u.uarms.otyp) {
    case ONAMES.SMALL_SHIELD:
    case ONAMES.SHIELD_OF_DRAIN_RESISTANCE:
    case ONAMES.SHIELD_OF_SHOCK_RESISTANCE:
    case ONAMES.ELVEN_SHIELD:
    case ONAMES.URUK_HAI_SHIELD:
    case ONAMES.ORCISH_SHIELD:
    case ONAMES.DWARVISH_ROUNDSHIELD:
    case ONAMES.LARGE_SHIELD:
    case ONAMES.SHIELD_OF_REFLECTION:
        break;
    default:
        /* C calls impossible(unknown_type, c_shield, uarms->otyp) */
        note_unported_do_wear('Shield_on:impossible_unknown_type');
        break;
    }

    if (!game.u.uarms.known) {
        game.u.uarms.known = 1; /* +/- evident because of status line AC */
        note_unported_do_wear('Shield_on:update_inventory');
    }
    return 0;
}

// src/do_wear.c Gloves_on() — the afternmv callback for putting on gloves.
//
// THE FUMBLING ARM DRAWS, and its guard has to be exact or the stream moves:
//
//     if (!oldprop && !(HFumbling & ~TIMEOUT))
//         incr_itimeout(&HFumbling, rnd(20));
//
// oldprop is the extrinsic bits for this glove's property MINUS the gloves
// slot itself, so it asks "did something else already confer this?". Both it
// and HFumbling are readable now that uprops exists and is keyed by the
// property number, so the guard is ported exactly and the rnd(20) fires
// where C fires it. Only the timeout APPLICATION is recorded, since
// incr_itimeout is not ported -- the draw happens either way.
//
// The other arms need makeknown and adj_abon, neither ported.
export function Gloves_on() {
    if (!game.u.uarmg)
        return 0;

    const prop = game.objects[game.u.uarmg.otyp].oc_oprop;
    const oldprop = (game.u.uprops?.[prop]?.extrinsic ?? 0) & ~W_ARMG;
    const HFumbling = game.u.uprops?.[FUMBLING]?.intrinsic ?? 0;

    switch (game.u.uarmg.otyp) {
    case ONAMES.LEATHER_GLOVES:
        break;
    case ONAMES.GAUNTLETS_OF_FUMBLING:
        if (!oldprop && !(HFumbling & ~TIMEOUT)) {
            rnd(20);            /* incr_itimeout(&HFumbling, rnd(20)) */
            note_unported_do_wear('Gloves_on:incr_itimeout');
        }
        break;
    case ONAMES.GAUNTLETS_OF_POWER:
        note_unported_do_wear('Gloves_on:makeknown_and_botl');
        break;
    case ONAMES.GAUNTLETS_OF_DEXTERITY:
        note_unported_do_wear('Gloves_on:adj_abon');
        break;
    default:
        note_unported_do_wear('Gloves_on:impossible_unknown_type');
        break;
    }

    if (!game.u.uarmg.known) {
        game.u.uarmg.known = 1; /* +/- evident because of status line AC */
        note_unported_do_wear('Gloves_on:update_inventory');
    }
    return 0;
}

// src/do_wear.c Cloak_on() — the afternmv callback for putting on a cloak.
//
// NO DRAWS anywhere in it, so a mistake here costs screens rather than
// desyncing the stream. The arms are messages and two toggles, except the
// last one which does real work:
//
//     case ALCHEMY_SMOCK: EAcid_resistance |= WORN_CLOAK;
//
// That is the alchemy smock's SECOND property. objects[].oc_oprop can only
// name one, so setworn() confers poison resistance and this line adds acid
// resistance by hand -- see altprop() in src/worn.c, which describes the
// same workaround. It is portable now that uprops exists, so it is done
// rather than recorded.
export function Cloak_on() {
    if (!game.u.uarmc)
        return 0;

    const prop = game.objects[game.u.uarmc.otyp].oc_oprop;
    const oldprop = (game.u.uprops?.[prop]?.extrinsic ?? 0) & ~W_ARMC;

    switch (game.u.uarmc.otyp) {
    case ONAMES.ORCISH_CLOAK:
    case ONAMES.DWARVISH_CLOAK:
    case ONAMES.CLOAK_OF_MAGIC_RESISTANCE:
    case ONAMES.ROBE:
    case ONAMES.LEATHER_CLOAK:
        break;
    case ONAMES.CLOAK_OF_PROTECTION:
        note_unported_do_wear('Cloak_on:makeknown');
        break;
    case ONAMES.ELVEN_CLOAK:
        note_unported_do_wear('Cloak_on:toggle_stealth');
        break;
    case ONAMES.CLOAK_OF_DISPLACEMENT:
        note_unported_do_wear('Cloak_on:toggle_displacement');
        break;
    case ONAMES.MUMMY_WRAPPING:
        /* already worn, so C cheats here and checks visibility directly */
        note_unported_do_wear('Cloak_on:mummy_wrapping_msg');
        break;
    case ONAMES.CLOAK_OF_INVISIBILITY:
        if (!oldprop)
            note_unported_do_wear('Cloak_on:invisibility_msg');
        break;
    case ONAMES.OILSKIN_CLOAK:
        break;
    case ONAMES.ALCHEMY_SMOCK:
        /* the smock's second property: oc_oprop names only one */
        uprop_dw(ACID_RES).extrinsic |= W_ARMC;
        break;
    default:
        note_unported_do_wear('Cloak_on:impossible_unknown_type');
        break;
    }

    if (!game.u.uarmc.known) {
        game.u.uarmc.known = 1; /* +/- evident because of status line AC */
        note_unported_do_wear('Cloak_on:update_inventory');
    }
    return 0;
}

/* same shape as js/worn.js's uprop(): entries are created on first write,
   since JS has no zero-initialised global struct. */
function uprop_dw(p) {
    const u = (game.u.uprops ||= []);
    return (u[p] ||= { intrinsic: 0, extrinsic: 0, blocked: 0 });
}

// src/do_wear.c Boots_on() — the afternmv callback for putting on boots.
//
// ONE DRAW, in the fumble-boots arm, with the same guard Gloves_on uses:
//
//     if (!oldprop && !(HFumbling & ~TIMEOUT))
//         incr_itimeout(&HFumbling, rnd(20));
//
// Ported exactly for the same reason -- oldprop and HFumbling are readable
// now, so the rnd(20) fires where C fires it and only the application is
// recorded.
//
// The speed-boots and levitation arms have GUARDS worth porting even though
// their effects are recorded, because the guards decide whether C would
// have drawn or messaged at all. Note the levitation guard tests
// BLevitation & FROMOUTSIDE, not just blocked -- an outside-blocked hero
// takes the float_vs_flight branch instead.
export function Boots_on() {
    if (!game.u.uarmf)
        return 0;

    const prop = game.objects[game.u.uarmf.otyp].oc_oprop;
    const oldprop = (game.u.uprops?.[prop]?.extrinsic ?? 0) & ~W_ARMF;
    const HFumbling = game.u.uprops?.[FUMBLING]?.intrinsic ?? 0;
    const HFast = game.u.uprops?.[FAST]?.intrinsic ?? 0;
    const HLevitation = game.u.uprops?.[LEVITATION]?.intrinsic ?? 0;
    const BLevitation = game.u.uprops?.[LEVITATION]?.blocked ?? 0;

    switch (game.u.uarmf.otyp) {
    case ONAMES.LOW_BOOTS:
    case ONAMES.IRON_SHOES:
    case ONAMES.HIGH_BOOTS:
    case ONAMES.JUMPING_BOOTS:
    case ONAMES.KICKING_BOOTS:
        break;
    case ONAMES.WATER_WALKING_BOOTS:
        note_unported_do_wear('Boots_on:water_walking_spoteffects');
        break;
    case ONAMES.SPEED_BOOTS:
        /* speed boots beat intrinsic speed but not potion speed */
        if (!oldprop && !(HFast & TIMEOUT))
            note_unported_do_wear('Boots_on:speed_msg');
        break;
    case ONAMES.ELVEN_BOOTS:
        note_unported_do_wear('Boots_on:toggle_stealth');
        break;
    case ONAMES.FUMBLE_BOOTS:
        if (!oldprop && !(HFumbling & ~TIMEOUT)) {
            rnd(20);        /* incr_itimeout(&HFumbling, rnd(20)) */
            note_unported_do_wear('Boots_on:incr_itimeout');
        }
        break;
    case ONAMES.LEVITATION_BOOTS:
        if (!oldprop && !HLevitation && !(BLevitation & FROMOUTSIDE)) {
            game.u.uarmf.known = 1;   /* may come off over a sink */
            note_unported_do_wear('Boots_on:float_up');
        } else {
            note_unported_do_wear('Boots_on:float_vs_flight');
        }
        break;
    default:
        note_unported_do_wear('Boots_on:impossible_unknown_type');
        break;
    }

    /* uarmf could be null here (levitation boots put on over a sink) */
    if (game.u.uarmf && !game.u.uarmf.known) {
        game.u.uarmf.known = 1; /* +/- evident because of status line AC */
        note_unported_do_wear('Boots_on:update_inventory');
    }
    return 0;
}
