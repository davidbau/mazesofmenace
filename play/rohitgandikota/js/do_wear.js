// do_wear.js — wearing and taking off armour.
// C ref: src/do_wear.c
//
// Only find_ac() so far. It matters at startup because u.uac is 0 out of the
// zeroed `struct you` and stays 0 through newgame(): the status line under the
// legacy window shows AC:0 for every role, armoured or not, and only
// moveloop_preamble()'s find_ac() turns that into the real number.

import { game } from './gstate.js';
import { You, You_cant } from './pline.js';
import { is_helmet, is_metallic, is_crackable } from './obj.js';
/* worn.js imports cancel_doff from here, so this is a 2-cycle -- as in C,
   where do_wear.c and worn.c call each other. Safe because setworn is used
   at CALL time, not at module load. */
import { setworn } from './worn.js';
import { rnd } from './rng.js';
import { mons } from './monst_data.js';
import { objects, ONAMES } from './objects_data.js';
import { W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU,
         W_RINGL, W_RINGR, W_AMUL, AC_MAX, I_SPECIAL,
         FUMBLING, TIMEOUT, ACID_RES, FAST, LEVITATION,
         FROMOUTSIDE } from './const.js';
import { sgn } from './hacklib.js';

/* src/do_wear.c:9-15 — the file's static message strings. Module-scoped here
   because they are file-static in the C. */
const unknown_type = "Unknown type of %s (%d)";
const c_armor = "armor", c_suit = "suit",
      c_shirt = "shirt", c_cloak = "cloak",
      c_gloves = "gloves", c_boots = "boots",
      c_helmet = "helmet", c_shield = "shield",
      c_weapon = "weapon", c_sword = "sword",
      c_axe = "axe", c_that_ = "that";

// src/do_wear.c:2011 already_wearing()
//
// The C tests `cc == c_that_` by POINTER, so only the call that literally
// passes c_that_ gets the '!'. Comparing by value here is equivalent because
// c_that_ is the one and only source of the string "that" in these calls; if a
// caller ever passes a separate "that" literal, this would diverge.
export async function already_wearing(cc) {
    await You(`are already wearing ${cc}${cc === c_that_ ? '!' : '.'}`);
}

// src/do_wear.c:2017 already_wearing2()
export async function already_wearing2(cc1, cc2) {
    await You_cant(`wear ${cc1} because you're wearing ${cc2} there already.`);
}

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
// src/do_wear.c:568 hard_helmet() — hard helms protect against falling rocks.
export function hard_helmet(obj) {
    if (!obj || !is_helmet(obj))
        return false;
    return (is_metallic(obj) || is_crackable(obj)) ? true : false;
}

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

    if (!((t.mask | 0) & I_SPECIAL) && donning(obj))
        cancel_don();

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

// src/do_wear.c Helmet_on() — the afternmv callback for putting on a helmet.
//
// NO DRAWS, so errors here cost screens rather than the stream.
//
// The structural feature to preserve is the FALLTHROUGH: after
// HELM_OF_OPPOSITE_ALIGNMENT does its uchangealign(), C falls through into
// DUNCE_CAP, so both helmets share the curse-and-glow block. Collapsing them
// into separate cases would drop that, and the shared block is where the
// helm of opposite alignment actually gets cursed.
//
// It also guards `if (uarmh && ...)` INSIDE that block, because
// uchangealign() can drop or destroy the helm -- falling onto a polymorph
// trap or into water. Keep the null checks; they are not defensive padding.
export function Helmet_on() {
    if (!game.u.uarmh)
        return 0;

    let fell_through = false;

    switch (game.u.uarmh.otyp) {
    case ONAMES.FEDORA:
        /* Role_if(PM_ARCHEOLOGIST) -> change_luck(1) */
        note_unported_do_wear('Helmet_on:fedora_archeologist_luck');
        break;
    case ONAMES.HELMET:
    case ONAMES.DENTED_POT:
    case ONAMES.ELVEN_LEATHER_HELM:
    case ONAMES.DWARVISH_IRON_HELM:
    case ONAMES.ORCISH_HELM:
    case ONAMES.HELM_OF_TELEPATHY:
        break;
    case ONAMES.HELM_OF_CAUTION:
        note_unported_do_wear('Helmet_on:see_monsters');
        break;
    case ONAMES.HELM_OF_BRILLIANCE:
        note_unported_do_wear('Helmet_on:adj_abon');
        break;
    case ONAMES.CORNUTHAUM:
        /* marked wizards get a CHA bonus, everyone else a penalty */
        note_unported_do_wear('Helmet_on:cornuthaum_cha');
        break;
    case ONAMES.HELM_OF_OPPOSITE_ALIGNMENT:
        game.u.uarmh.known = 1;  /* here because uarmh could get cleared */
        note_unported_do_wear('Helmet_on:uchangealign');
        fell_through = true;     /* C: FALLTHROUGH into DUNCE_CAP */
        /* fall through */
    case ONAMES.DUNCE_CAP:
        /* uarmh may be gone: uchangealign can drop or destroy it */
        if (game.u.uarmh && !game.u.uarmh.cursed)
            note_unported_do_wear('Helmet_on:curse_and_glow');
        note_unported_do_wear('Helmet_on:botl_and_feel_msg');
        break;
    default:
        note_unported_do_wear('Helmet_on:impossible_unknown_type');
        break;
    }

    /* uarmh could be null due to uchangealign() */
    if (game.u.uarmh && !game.u.uarmh.known) {
        game.u.uarmh.known = 1; /* +/- evident because of status line AC */
        note_unported_do_wear('Helmet_on:update_inventory');
    }
    return 0;
}

// src/do_wear.c:1574 donning() — is this object currently being PUT ON?
//
// A chain of identity tests against ga.afternmv, which is why all seven _on
// callbacks had to exist first. In C an undefined comparand is a compile
// error; in JS `game.afternmv === Shirt_on` with Shirt_on undefined becomes
// `=== undefined`, which is TRUE whenever no occupation is armed -- so a
// partial port would have reported "donning" for every object in six of
// seven slots. All seven are ported now, so every arm is a real comparison.
//
// doffing() is checked FIRST and short-circuits, matching C: an object being
// taken off is not being put on.
export function donning(otmp) {
    let result = false;

    /* 'W' (or 'P' used for armor) sets ga.afternmv */
    if (doffing(otmp))
        result = true;
    else if (otmp === game.u.uarm)
        result = (game.afternmv === Armor_on);
    else if (otmp === game.u.uarmu)
        result = (game.afternmv === Shirt_on);
    else if (otmp === game.u.uarmc)
        result = (game.afternmv === Cloak_on);
    else if (otmp === game.u.uarmf)
        result = (game.afternmv === Boots_on);
    else if (otmp === game.u.uarmh)
        result = (game.afternmv === Helmet_on);
    else if (otmp === game.u.uarmg)
        result = (game.afternmv === Gloves_on);
    else if (otmp === game.u.uarms)
        result = (game.afternmv === Shield_on);

    return result;
}

// src/do_wear.c:1602 doffing() — is this object currently being TAKEN OFF?
//
// Same shape, but each armour arm also accepts a takeoff.what match, because
// the 'A' command queues slots there rather than setting afternmv. The
// _off callbacks are NOT ported, so those halves are guarded: comparing
// against an undefined _off would be the exact hazard donning avoids.
//
// The 1-turn items -- amulet, rings, blindfold -- test ONLY takeoff.what in
// C, so their arms are complete rather than partial.
export function doffing(otmp) {
    const what = game.context?.takeoff?.what | 0;
    const a = game.afternmv;
    let result = false;

    /* 'T' (or 'R' used for armor) sets ga.afternmv, 'A' sets takeoff.what.
       Both halves are live now that every _off callback is ported. */
    if (otmp === game.u.uarm)
        result = (a === Armor_off || what === W_ARM);
    else if (otmp === game.u.uarmu)
        result = (a === Shirt_off || what === W_ARMU);
    else if (otmp === game.u.uarmc)
        result = (a === Cloak_off || what === W_ARMC);
    else if (otmp === game.u.uarmf)
        result = (a === Boots_off || what === W_ARMF);
    else if (otmp === game.u.uarmh)
        result = (a === Helmet_off || what === W_ARMH);
    else if (otmp === game.u.uarmg)
        result = (a === Gloves_off || what === W_ARMG);
    else if (otmp === game.u.uarms)
        result = (a === Shield_off || what === W_ARMS);
    /* these 1-turn items need no afternmv check even in C */
    else if (otmp === game.u.uamul)
        result = (what === W_AMUL);
    else if (otmp === game.u.uleft)
        result = (what === W_RINGL);
    else if (otmp === game.u.uright)
        result = (what === W_RINGR);

    return result;
}

// src/do_wear.c cancel_don() — the armour being donned/doffed has vanished.
//
// Every one of the seven identity tests is a real comparison now. C notes
// that afternmv never actually holds some of these values, because every
// item in those categories takes one turn to wear, "but check all of them
// anyway" -- so the redundant arms are deliberate and stay.
//
// cancelled_don is the output: it tells the caller a DON was interrupted
// rather than a doff, which is what stops donning() from dereferencing a
// freed object when it would otherwise finish.
export function cancel_don() {
    const t = (game.context.takeoff ||= {});

    t.cancelled_don = (game.afternmv === Cloak_on
                       || game.afternmv === Armor_on
                       || game.afternmv === Shirt_on
                       || game.afternmv === Helmet_on
                       || game.afternmv === Gloves_on
                       || game.afternmv === Boots_on
                       || game.afternmv === Shield_on);
    game.afternmv = null;
    note_unported_do_wear('cancel_don:nomovemsg');
    game.multi = 0;
    t.delay = 0;
    t.what = 0;
}

// src/do_wear.c Shirt_off() — the afternmv callback for taking off a shirt.
//
// The _off callbacks share a shape the _on ones do not: they clear their
// slot from takeoff.mask FIRST and call setworn(0, slot) LAST, so the slot
// is empty by the time they return. setworn now does the extrinsic
// bookkeeping, so removing a shirt genuinely revokes whatever it conferred.
export function Shirt_off() {
    const t = (game.context.takeoff ||= {});
    t.mask = (t.mask | 0) & ~W_ARMU;

    if (game.u.uarmu) {
        switch (game.u.uarmu.otyp) {
        case ONAMES.HAWAIIAN_SHIRT:
        case ONAMES.T_SHIRT:
            break;
        default:
            note_unported_do_wear('Shirt_off:impossible_unknown_type');
            break;
        }
    }

    setworn(null, W_ARMU);
    return 0;
}

// src/do_wear.c Armor_off() — the afternmv callback for taking off a suit.
//
// Note the ORDER C is careful about and its comment explains: the
// artifact-light change is done BEFORE dragon_armor_handling, because taking
// off yellow dragon scales can be fatal and "the non-fatal change should be
// done before the potentially fatal change in case the latter results in
// bones". Reordering these would put a corpse in the wrong state.
//
// It also clears cancelled_don, which cancel_don() sets -- so a don that was
// interrupted stops being remembered once the suit is actually off.
export function Armor_off() {
    const otmp = game.u.uarm;
    const t = (game.context.takeoff ||= {});

    t.mask = (t.mask | 0) & ~W_ARM;
    setworn(null, W_ARM);
    t.cancelled_don = false;

    /* was_arti_light / end_burn: artifact_light exists but end_burn and the
       message do not, and dragon_armor_handling is unported. */
    if (otmp)
        note_unported_do_wear('Armor_off:arti_light_and_dragon_armor');

    return 0;
}

// src/do_wear.c Shield_off() — the afternmv callback for removing a shield.
//
// Same shape as Shirt_off: mask cleared first, switch that does nothing but
// catch an unknown otyp, setworn(0, slot) last. The magical shields need no
// case here for the same reason they need none in Shield_on -- setworn
// handles their extrinsic, and it does so in both directions now.
export function Shield_off() {
    const t = (game.context.takeoff ||= {});
    t.mask = (t.mask | 0) & ~W_ARMS;

    if (game.u.uarms) {
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
            note_unported_do_wear('Shield_off:impossible_unknown_type');
            break;
        }
    }

    setworn(null, W_ARMS);
    return 0;
}

// src/do_wear.c Helmet_off() — the afternmv callback for removing a helmet.
//
// No draws. Two structural details worth keeping:
//
// 1. The telepathy/caution arm RETURNS EARLY, calling setworn() itself and
//    then see_monsters(). C's comment says why -- "need to update ability
//    before calling see_monsters()" -- so the slot must be empty before the
//    redraw. It does NOT fall through to the shared setworn at the bottom,
//    and it does not clear cancelled_don either.
//
// 2. cancelled_don gates the CORNUTHAUM and HELM_OF_BRILLIANCE arms. Those
//    reverse a bonus applied when the helm went on, so if the don was
//    interrupted the bonus was never applied and must not be reversed. That
//    flag is set by cancel_don(), which is now ported, so the guard is real
//    rather than decorative.
export function Helmet_off() {
    const t = (game.context.takeoff ||= {});
    t.mask = (t.mask | 0) & ~W_ARMH;

    if (!game.u.uarmh) {
        setworn(null, W_ARMH);
        t.cancelled_don = false;
        return 0;
    }

    switch (game.u.uarmh.otyp) {
    case ONAMES.FEDORA:
        note_unported_do_wear('Helmet_off:fedora_archeologist_luck');
        break;
    case ONAMES.HELMET:
    case ONAMES.DENTED_POT:
    case ONAMES.ELVEN_LEATHER_HELM:
    case ONAMES.DWARVISH_IRON_HELM:
    case ONAMES.ORCISH_HELM:
        break;
    case ONAMES.DUNCE_CAP:
        note_unported_do_wear('Helmet_off:botl');
        break;
    case ONAMES.CORNUTHAUM:
        if (!t.cancelled_don)
            note_unported_do_wear('Helmet_off:cornuthaum_cha');
        break;
    case ONAMES.HELM_OF_TELEPATHY:
    case ONAMES.HELM_OF_CAUTION:
        /* ability must be updated before see_monsters(); early return, so
           cancelled_don is deliberately NOT cleared here */
        setworn(null, W_ARMH);
        note_unported_do_wear('Helmet_off:see_monsters');
        return 0;
    case ONAMES.HELM_OF_BRILLIANCE:
        if (!t.cancelled_don)
            note_unported_do_wear('Helmet_off:adj_abon');
        break;
    case ONAMES.HELM_OF_OPPOSITE_ALIGNMENT:
        note_unported_do_wear('Helmet_off:uchangealign');
        break;
    default:
        note_unported_do_wear('Helmet_off:impossible_unknown_type');
        break;
    }

    setworn(null, W_ARMH);
    t.cancelled_don = false;
    return 0;
}

// src/do_wear.c Cloak_off() — the afternmv callback for removing a cloak.
//
// No draws. THE ORDER IS THE SUBTLE PART and C flags it: oldprop is read
// BEFORE setworn clears the slot, and setworn is called BEFORE the switch --
// "For mummy wrapping, taking it off first resets `Invisible'." So the
// mummy-wrapping and invisibility arms test a state that setworn has
// already changed. Moving setworn below the switch would invert both.
//
// The alchemy smock's second property is cleared here, mirroring Cloak_on:
// oc_oprop names only poison resistance, so acid resistance is removed by
// hand.
export function Cloak_off() {
    const otmp = game.u.uarmc;
    if (!otmp) {
        setworn(null, W_ARMC);
        return 0;
    }
    const otyp = otmp.otyp;
    const prop = game.objects[otyp].oc_oprop;
    /* read BEFORE setworn clears the slot */
    const oldprop = (game.u.uprops?.[prop]?.extrinsic ?? 0) & ~W_ARMC;

    const t = (game.context.takeoff ||= {});
    t.mask = (t.mask | 0) & ~W_ARMC;

    /* for mummy wrapping, taking it off first resets Invisible */
    setworn(null, W_ARMC);

    switch (otyp) {
    case ONAMES.ORCISH_CLOAK:
    case ONAMES.DWARVISH_CLOAK:
    case ONAMES.CLOAK_OF_PROTECTION:
    case ONAMES.CLOAK_OF_MAGIC_RESISTANCE:
    case ONAMES.OILSKIN_CLOAK:
    case ONAMES.ROBE:
    case ONAMES.LEATHER_CLOAK:
        break;
    case ONAMES.ELVEN_CLOAK:
        note_unported_do_wear('Cloak_off:toggle_stealth');
        break;
    case ONAMES.CLOAK_OF_DISPLACEMENT:
        note_unported_do_wear('Cloak_off:toggle_displacement');
        break;
    case ONAMES.MUMMY_WRAPPING:
        note_unported_do_wear('Cloak_off:mummy_wrapping_msg');
        break;
    case ONAMES.CLOAK_OF_INVISIBILITY:
        if (!oldprop)
            note_unported_do_wear('Cloak_off:invisibility_msg');
        break;
    case ONAMES.ALCHEMY_SMOCK:
        /* the smock's second property: oc_oprop names only one */
        uprop_dw(ACID_RES).extrinsic &= ~W_ARMC;
        break;
    default:
        note_unported_do_wear('Cloak_off:impossible_unknown_type');
        break;
    }
    return 0;
}

// src/do_wear.c Gloves_off() — the afternmv callback for removing gloves.
//
// No draws. Three details worth keeping:
//
// 1. `gloves` is captured BEFORE setworn nulls uarmg, because the cockatrice
//    checks at the bottom need the object after the slot is empty. C's own
//    comment says so: "needed after uarmg has been set to Null".
//
// 2. on_purpose distinguishes a deliberate removal from gloves falling off,
//    being stolen or destroyed -- it feeds wielding_corpse, which decides
//    whether touching a cockatrice corpse is fatal. Captured before the slot
//    is cleared for the same reason.
//
// 3. The fumbling arm CLEARS both halves (HFumbling = EFumbling = 0) rather
//    than just the extrinsic, under the same guard Gloves_on used to set the
//    timeout. That is now expressible.
export function Gloves_off() {
    const gloves = game.u.uarmg;      /* needed after uarmg becomes null */
    if (!gloves) {
        setworn(null, W_ARMG);
        return 0;
    }
    const prop = game.objects[gloves.otyp].oc_oprop;
    const oldprop = (game.u.uprops?.[prop]?.extrinsic ?? 0) & ~W_ARMG;
    const HFumbling = game.u.uprops?.[FUMBLING]?.intrinsic ?? 0;
    /* on_purpose: a deliberate removal, not fallen off / stolen / destroyed */
    const on_purpose = !game.context?.mon_moving && !gloves.in_use;

    const t = (game.context.takeoff ||= {});
    t.mask = (t.mask | 0) & ~W_ARMG;

    switch (gloves.otyp) {
    case ONAMES.LEATHER_GLOVES:
        break;
    case ONAMES.GAUNTLETS_OF_FUMBLING:
        if (!oldprop && !(HFumbling & ~TIMEOUT)) {
            const u = (game.u.uprops ||= []);
            const e = (u[FUMBLING] ||= { intrinsic: 0, extrinsic: 0, blocked: 0 });
            e.intrinsic = 0;      /* HFumbling = EFumbling = 0 */
            e.extrinsic = 0;
        }
        break;
    case ONAMES.GAUNTLETS_OF_POWER:
        note_unported_do_wear('Gloves_off:makeknown_and_botl');
        break;
    case ONAMES.GAUNTLETS_OF_DEXTERITY:
        if (!t.cancelled_don)
            note_unported_do_wear('Gloves_off:adj_abon');
        break;
    default:
        note_unported_do_wear('Gloves_off:impossible_unknown_type');
        break;
    }

    setworn(null, W_ARMG);
    t.cancelled_don = false;
    note_unported_do_wear('Gloves_off:encumber_msg');

    /* Glib: slippery fingers must not transfer from gloves to bare hands */
    note_unported_do_wear('Gloves_off:make_glib');

    /* prevent wielding a cockatrice corpse bare-handed */
    if (game.u.uwep && game.u.uwep.otyp === ONAMES.CORPSE)
        note_unported_do_wear('Gloves_off:wielding_corpse');
    if (game.u.twoweap && game.u.uswapwep
        && game.u.uswapwep.otyp === ONAMES.CORPSE)
        note_unported_do_wear('Gloves_off:wielding_corpse_swap');

    return 0;
}

// src/do_wear.c Boots_off() — the afternmv callback for removing boots.
//
// No draws. THE ORDER IS LOAD-BEARING and C spells it out: setworn is called
// BEFORE the switch because "float_down() returns if Levitation, so we must
// do a setworn() _before_ the levitation case". If the slot were cleared
// after, float_down would see the hero still levitating and do nothing --
// the hero would stay airborne with no boots on.
//
// oldprop is therefore read BEFORE setworn, as in Cloak_off.
//
// cancelled_don gates four arms here, more than any other callback: speed,
// water-walking, levitation all check it, because each reverses something
// the matching _on arm did and an interrupted don never did it.
export function Boots_off() {
    const otmp = game.u.uarmf;
    if (!otmp) {
        setworn(null, W_ARMF);
        return 0;
    }
    const otyp = otmp.otyp;
    const prop = game.objects[otyp].oc_oprop;
    const oldprop = (game.u.uprops?.[prop]?.extrinsic ?? 0) & ~W_ARMF;
    const HFumbling = game.u.uprops?.[FUMBLING]?.intrinsic ?? 0;
    const HLevitation = game.u.uprops?.[LEVITATION]?.intrinsic ?? 0;
    const BLevitation = game.u.uprops?.[LEVITATION]?.blocked ?? 0;

    const t = (game.context.takeoff ||= {});
    t.mask = (t.mask | 0) & ~W_ARMF;

    /* MUST precede the switch: float_down() returns early if Levitation */
    setworn(null, W_ARMF);

    switch (otyp) {
    case ONAMES.SPEED_BOOTS:
        if (!t.cancelled_don)
            note_unported_do_wear('Boots_off:speed_msg');
        break;
    case ONAMES.WATER_WALKING_BOOTS:
        if (!t.cancelled_don)
            note_unported_do_wear('Boots_off:water_walking_spoteffects');
        break;
    case ONAMES.ELVEN_BOOTS:
        note_unported_do_wear('Boots_off:toggle_stealth');
        break;
    case ONAMES.FUMBLE_BOOTS:
        if (!oldprop && !(HFumbling & ~TIMEOUT)) {
            const u = (game.u.uprops ||= []);
            const e = (u[FUMBLING] ||= { intrinsic: 0, extrinsic: 0, blocked: 0 });
            e.intrinsic = 0;      /* HFumbling = EFumbling = 0 */
            e.extrinsic = 0;
        }
        break;
    case ONAMES.LEVITATION_BOOTS:
        if (!oldprop && !HLevitation && !(BLevitation & FROMOUTSIDE)
            && !t.cancelled_don)
            note_unported_do_wear('Boots_off:float_down');
        else
            note_unported_do_wear('Boots_off:float_vs_flight');
        break;
    case ONAMES.LOW_BOOTS:
    case ONAMES.IRON_SHOES:
    case ONAMES.HIGH_BOOTS:
    case ONAMES.JUMPING_BOOTS:
    case ONAMES.KICKING_BOOTS:
        break;
    default:
        note_unported_do_wear('Boots_off:impossible_unknown_type');
        break;
    }

    t.cancelled_don = false;
    return 0;
}
