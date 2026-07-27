// do_wear.js — wearing and taking off armour.
// C ref: src/do_wear.c
//
// Only find_ac() so far. It matters at startup because u.uac is 0 out of the
// zeroed `struct you` and stays 0 through newgame(): the status line under the
// legacy window shows AC:0 for every role, armoured or not, and only
// moveloop_preamble()'s find_ac() turns that into the real number.

import { game } from './gstate.js';
import { see_monsters, set_mimic_blocking, newsym } from './display.js';
import { self_invis_message } from './potion.js';
import { float_vs_flight } from './polyself.js';
import { extremeattr, ACURR, encumber_msg } from './attrib.js';
import { x_monnam } from './do_name.js';
import { update_inventory } from './invent.js';
import { observe_object, makeknown } from './o_init.js';
import { toggle_blindness } from './potion.js';
import { getobj } from './invent.js';
import { pline } from './display.js';
import { retouch_object } from './artifact.js';
import { remove_worn_item } from './steal.js';
import { nomul, unmul } from './hack.js';
import { prinv } from './invent.js';
import { verysmall, nohands, cantweararm, has_horns, num_horns, slithy, humanoid } from './mondata.js';
import { welded, setuwep, setuswapwep, setuqwep } from './wield.js';
import { Glib, Blind, Punished, Levitation, Flying, H, B, Invis } from './youprop.js';
import { silly_thing } from './invent.js';
import { gloves_simple_name, makeplural, an, helm_simple_name, cloak_simple_name, doname, xname, obj_is_pname } from './objnam.js';
import { body_part } from './polyself.js';
import { You, You_cant, Your, pline_The } from './pline.js';
import { is_helmet, is_metallic, is_crackable, is_cloak, is_shirt, is_suit, is_shield, is_boots, is_gloves, is_flimsy, bimanual, is_sword, WrappingAllowed } from './obj.js';
/* worn.js imports cancel_doff from here, so this is a 2-cycle -- as in C,
   where do_wear.c and worn.c call each other. Safe because setworn is used
   at CALL time, not at module load. */
import { setworn, racial_exception } from './worn.js';
import { rnd } from './rng.js';
import { mons, MFLAGS, MONSYMS } from './monst_data.js';
import { objects, ONAMES, OCLASSES } from './objects_data.js';
import { W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU, W_RINGL, W_RINGR, W_AMUL, AC_MAX, I_SPECIAL, FUMBLING, TIMEOUT, ACID_RES, FAST, LEVITATION, FROMOUTSIDE, FINGER, W_ARMOR, plur, LEG, FOOT, TT_BEARTRAP, TT_INFLOOR, TT_LAVA, TT_BURIEDBALL, Upolyd, W_RING, W_TOOL, HEAD, ECMD_OK, ECMD_TIME, W_ACCESSORY, GETOBJ_EXCLUDE, GETOBJ_EXCLUDE_INACCESS, GETOBJ_DOWNPLAY, GETOBJ_SUGGEST, GETOBJ_NOFLAGS, ECMD_CANCEL, STEALTH, ARTICLE_YOUR, SUPPRESS_SADDLE, SUPPRESS_HALLUCINATION, SEE_INVIS, INVIS, A_STR, A_CON, A_CHA } from './const.js';
import { sgn } from './hacklib.js';

// src/do_wear.c:76 on_msg() — for items that involve no delay.
//
// on_msg() for rings and amulets just shows add-to-invent feedback [after
// caller calls setworn(), for suffix: "(on {left|right} hand)" or "(being
// worn)"]; eyewear too unless giving verbose message below.
export async function on_msg(otmp) {
    if ((otmp.owornmask & (W_RING | W_AMUL)) !== 0
        || ((otmp.owornmask & W_TOOL) !== 0 && !game.flags.verbose)) {
        await prinv(null, otmp, 0);
        return;
    }

    if (game.flags.verbose) {
        let how;
        /* call xname() before obj_is_pname(); formatting obj's name
           might set obj->dknown and that affects the pname test */
        const otmp_name = xname(otmp);

        how = '';
        if (otmp.otyp === ONAMES.TOWEL)
            how = ` around your ${body_part(HEAD)}`;
        /* the() is only reachable for a NAMED ARTIFACT. It needs CapitalMon,
           which needs init_CapMons and the whole rumors/bogusmon list, so it
           is recorded rather than ported; every ordinary object takes an(). */
        let named;
        if (obj_is_pname(otmp)) {
            note_unported_do_wear('on_msg:the');
            named = otmp_name;
        } else {
            named = an(otmp_name);
        }
        await You(`are now wearing ${named}${how}.`);
    }
}

// src/do_wear.c:66 off_msg()
export async function off_msg(otmp) {
    if (game.flags.verbose)
        await You(`were wearing ${doname(otmp)}.`);
}

// src/do_wear.c:60 fingers_or_gloves() — plural "fingers" or optionally the
// worn gloves' own word ("gloves" or "gauntlets").
//
// NOTE this creates a do_wear -> objnam import edge, and js/objnam.js already
// imports hard_helmet from here. The cycle is safe because every binding
// involved is a hoisted function declaration used only inside function bodies,
// never read at module-init time.
export function fingers_or_gloves(check_gloves) {
    return ((check_gloves && game.u.uarmg)
            ? gloves_simple_name(game.u.uarmg) /* "gloves" or "gauntlets" */
            : makeplural(body_part(FINGER))); /* "fingers" */
}

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
export async function Armor_on() {
    /* reads game.u.uarm, the slot js/worn.js's worn[] table actually writes;
       this read game.uarm, which nothing assigns -- the same defect fixed in
       js/uhitm.js and js/do.js for uwep. */
    if (!game.u.uarm)   /* no known instances of !uarm here but play it safe */
        return 0;
    if (!game.u.uarm.known) {
        game.u.uarm.known = 1; /* +/- evident because of status line AC */
        update_inventory();
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
export async function set_wear(obj) {
    game.initial_don = !obj;

    if (!obj ? game.u.ublindf : (obj === game.u.ublindf))
        await Blindf_on(game.u.ublindf);
    if (!obj ? game.u.uright : (obj === game.u.uright))
        await Ring_on(game.u.uright);
    if (!obj ? game.u.uleft : (obj === game.u.uleft))
        await Ring_on(game.u.uleft);
    if (!obj ? game.u.uamul : (obj === game.u.uamul))
        note_unported_do_wear('set_wear:Amulet_on');

    if (!obj ? game.u.uarmu : (obj === game.u.uarmu))
        await Shirt_on();
    if (!obj ? game.u.uarm : (obj === game.u.uarm))
        await Armor_on();
    if (!obj ? game.u.uarmc : (obj === game.u.uarmc))
        await Cloak_on();
    if (!obj ? game.u.uarmf : (obj === game.u.uarmf))
        await Boots_on();
    if (!obj ? game.u.uarmg : (obj === game.u.uarmg))
        await Gloves_on();
    if (!obj ? game.u.uarmh : (obj === game.u.uarmh))
        await Helmet_on();
    if (!obj ? game.u.uarms : (obj === game.u.uarms))
        await Shield_on();

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
export async function Shirt_on() {
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
        update_inventory();
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
export async function Shield_on() {
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
        update_inventory();
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
export async function Gloves_on() {
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
        update_inventory();
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
export async function Cloak_on() {
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
        makeknown(game.u.uarmc.otyp);
        break;
    case ONAMES.ELVEN_CLOAK:
        await toggle_stealth(game.u.uarmc, oldprop, true);
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
        update_inventory();
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
export async function Boots_on() {
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
        await toggle_stealth(game.u.uarmf, oldprop, true);
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
            float_vs_flight();
        }
        break;
    default:
        note_unported_do_wear('Boots_on:impossible_unknown_type');
        break;
    }

    /* uarmf could be null here (levitation boots put on over a sink) */
    if (game.u.uarmf && !game.u.uarmf.known) {
        game.u.uarmf.known = 1; /* +/- evident because of status line AC */
        update_inventory();
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
export async function Helmet_on() {
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
        see_monsters();
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
        update_inventory();
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
        see_monsters();
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
export async function Cloak_off() {
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
        await toggle_stealth(otmp, oldprop, false);
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
export async function Gloves_off() {
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
    await encumber_msg(); /* immediate feedback for GoP */

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
export async function Boots_off() {
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
        await toggle_stealth(otmp, oldprop, false);
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
            float_vs_flight();
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

/*
 * src/do_wear.c:2030 canwearobj() — may the hero wear this piece of armor?
 *
 * inputs: otmp (the piece of armor)
 *         noisy (if true give error messages, otherwise be quiet about it)
 * output: mask — an out-parameter. C takes `long *mask`; here it is an object
 *         whose .mask field is assigned, so callers pass `{ mask: 0 }` and read
 *         it back. Only the success paths write it, exactly as in the C.
 *
 * Returns !err. No RNG draws anywhere in this function; every branch is either
 * a validation or a message.
 *
 * async because js/pline.js's message helpers are async.
 */
export async function canwearobj(otmp, mask, noisy) {
    let err = 0;
    let which;

    /* this is the same check as for 'W' (dowear), but different message,
       in case we get here via 'P' (doputon) */
    if (verysmall(game.youmonst.data) || nohands(game.youmonst.data)) {
        if (noisy)
            await You("can't wear any armor in your current form.");
        return 0;
    }

    which = is_cloak(otmp) ? c_cloak
            : is_shirt(otmp) ? c_shirt
              : is_suit(otmp) ? c_suit
                : 0;
    if (which && cantweararm(game.youmonst.data)
        /* same exception for cloaks as used in m_dowear() */
        && (which !== c_cloak
            || ((otmp.otyp !== ONAMES.MUMMY_WRAPPING)
                ? game.youmonst.data.msize !== MFLAGS.MZ_SMALL
                : !WrappingAllowed(game.youmonst.data)))
        && (racial_exception(game.youmonst, otmp) < 1)) {
        if (noisy)
            await pline_The(`${which} will not fit on your body.`);
        return 0;
    } else if (otmp.owornmask & W_ARMOR) {
        if (noisy)
            await already_wearing(c_that_);
        return 0;
    }

    if (welded(game.u.uwep) && bimanual(game.u.uwep)
        && (is_suit(otmp) || is_shirt(otmp))) {
        if (noisy)
            await You(`cannot do that while holding your ${is_sword(game.u.uwep) ? c_sword : c_weapon}.`);
        return 0;
    }

    if (is_helmet(otmp)) {
        if (game.u.uarmh) {
            if (noisy)
                await already_wearing(an(helm_simple_name(game.u.uarmh)));
            err++;
        } else if (Upolyd(game.u) && has_horns(game.youmonst.data) && !is_flimsy(otmp)) {
            /* (flimsy exception matches polyself handling) */
            if (noisy)
                await pline_The(`${helm_simple_name(otmp)} won't fit over your horn${plur(num_horns(game.youmonst.data))}.`);
            err++;
        } else
            mask.mask = W_ARMH;
    } else if (is_shield(otmp)) {
        if (game.u.uarms) {
            if (noisy)
                await already_wearing(an(c_shield));
            err++;
        } else if (game.u.uwep && bimanual(game.u.uwep)) {
            if (noisy)
                await You(`cannot wear a shield while wielding a two-handed ${is_sword(game.u.uwep) ? c_sword : (game.u.uwep.otyp === ONAMES.BATTLE_AXE) ? c_axe : c_weapon}.`);
            err++;
        } else if (game.u.twoweap) {
            if (noisy)
                await You("cannot wear a shield while wielding two weapons.");
            err++;
        } else
            mask.mask = W_ARMS;
    } else if (is_boots(otmp)) {
        if (game.u.uarmf) {
            if (noisy)
                await already_wearing(c_boots);
            err++;
        } else if (Upolyd(game.u) && slithy(game.youmonst.data)) {
            if (noisy)
                await You("have no feet..."); /* not body_part(FOOT) */
            err++;
        } else if (Upolyd(game.u) && game.youmonst.data.mlet === MONSYMS.S_CENTAUR) {
            /* break_armor() pushes boots off for centaurs, so don't let
               dowear() put them back on;
               makeplural(body_part(FOOT)) would yield "rear hooves" here,
               which sounds odd, so use hard-coded "hooves" */
            if (noisy)
                await You(`have too many hooves to wear ${c_boots}.`);
            err++;
        } else if (game.u.utrap
                   && (game.u.utraptype === TT_BEARTRAP
                       || game.u.utraptype === TT_INFLOOR
                       || game.u.utraptype === TT_LAVA
                       || game.u.utraptype === TT_BURIEDBALL)) {
            if (game.u.utraptype === TT_BEARTRAP) {
                if (noisy)
                    await Your(`${body_part(FOOT)} is trapped!`);
            } else if (game.u.utraptype === TT_INFLOOR || game.u.utraptype === TT_LAVA) {
                /* the message needs surface(u.ux, u.uy), src/dungeon.c:1750,
                   which is not ported (it needs the swallow/pool/ice/lava/
                   altar/grave/fountain/stairs terrain stack). Recorded rather
                   than guessing a surface word. */
                if (noisy)
                    note_unported_do_wear('canwearobj:surface');
            } else { /*TT_BURIEDBALL*/
                if (noisy)
                    await Your(`${body_part(LEG)} is attached to the buried ball!`);
            }
            err++;
        } else
            mask.mask = W_ARMF;
    } else if (is_gloves(otmp)) {
        if (game.u.uarmg) {
            if (noisy)
                await already_wearing(c_gloves);
            err++;
        } else if (welded(game.u.uwep)) {
            if (noisy)
                await You(`cannot wear gloves over your ${is_sword(game.u.uwep) ? c_sword : c_weapon}.`);
            err++;
        } else if (Glib()) {
            /* prevent slippery bare fingers from transferring to
               gloved fingers */
            if (noisy)
                await Your(`${fingers_or_gloves(false)} are too slippery to pull on ${gloves_simple_name(otmp)}.`);
            err++;
        } else
            mask.mask = W_ARMG;
    } else if (is_shirt(otmp)) {
        if (game.u.uarm || game.u.uarmc || game.u.uarmu) {
            if (game.u.uarmu) {
                if (noisy)
                    await already_wearing(an(c_shirt));
            } else {
                if (noisy)
                    await You_cant(`wear that over your ${(game.u.uarm && !game.u.uarmc) ? c_armor : cloak_simple_name(game.u.uarmc)}.`);
            }
            err++;
        } else
            mask.mask = W_ARMU;
    } else if (is_cloak(otmp)) {
        if (game.u.uarmc) {
            if (noisy)
                await already_wearing(an(cloak_simple_name(game.u.uarmc)));
            err++;
        } else
            mask.mask = W_ARMC;
    } else if (is_suit(otmp)) {
        if (game.u.uarmc) {
            if (noisy)
                await You(`cannot wear armor over a ${cloak_simple_name(game.u.uarmc)}.`);
            err++;
        } else if (game.u.uarm) {
            if (noisy)
                await already_wearing("some armor");
            err++;
        } else
            mask.mask = W_ARM;
    } else {
        /* getobj can't do this after setting its allow_all flag; that
           happens if you have armor for slots that are covered up or
           extra armor for slots that are filled */
        if (noisy)
            await silly_thing("wear", otmp);
        err++;
    }
    /* the welded(otmp) arm below this in the C is commented out — only weapons
       and pick-axes weld to your hand now, not armor. Not ported: not built. */
    return !err ? 1 : 0;
}

/*
 * src/do_wear.c:2209 accessory_or_armor_on() — the shared body of 'W' and 'P'.
 *
 * The ARMOR arm is ported in full. The ACCESSORY arm (rings, amulets, eyewear)
 * is recorded, not written: it needs yn_function() for the "Which ring-finger,
 * Right or Left?" prompt loop, plus Ring_on/Amulet_on/Blindf_on, set_bknown,
 * is_worn, ansimpleoname and safe_typename. Returning a plausible value there
 * would silently wear the wrong thing, so it records and returns ECMD_OK.
 *
 * async: canwearobj() and the message helpers are.
 */
export async function accessory_or_armor_on(obj) {
    const mask = { mask: 0 };
    let armor, ring, amulet, eyewear;

    if (obj.owornmask & (W_ACCESSORY | W_ARMOR)) {
        await already_wearing(c_that_);
        return ECMD_OK;
    }
    armor = (obj.oclass === OCLASSES.ARMOR_CLASS);
    ring = (obj.oclass === OCLASSES.RING_CLASS || obj.otyp === ONAMES.MEAT_RING);
    amulet = (obj.oclass === OCLASSES.AMULET_CLASS);
    eyewear = (obj.otyp === ONAMES.BLINDFOLD || obj.otyp === ONAMES.TOWEL
               || obj.otyp === ONAMES.LENSES);
    /* checks which are performed prior to actually touching the item */
    if (armor) {
        if (!await canwearobj(obj, mask, true))
            return ECMD_OK;

        if (obj.otyp === ONAMES.HELM_OF_OPPOSITE_ALIGNMENT) {
            /* the C also tests qstart_level.dnum == u.uz.dnum (in quest);
               qstart_level is not ported, so the whole arm is recorded. */
            note_unported_do_wear('accessory_or_armor_on:helm_opposite_quest');
        }
    } else {
        /* accessory: rings, amulets, eyewear — see the header comment */
        if (ring || amulet || eyewear)
            note_unported_do_wear('accessory_or_armor_on:accessory');
        else
            await You_cant("wear that!");
        return ECMD_OK;
    }

    if (!retouch_object(obj, false))
        return ECMD_TIME; /* costs a turn even though it didn't get worn */

    /* armor */
    let delay;
    /* if the armor is wielded, release it for wearing (won't be
       welded even if cursed; that only happens for weapons/weptools) */
    if (obj.owornmask & W_WEAPONS)
        await remove_worn_item(obj, false);
    /*
     * Setting obj->known=1 is NOT done here; the C delays it to the afternmv
     * action so a nymph stealing the armor mid-don doesn't leak its +/-.
     */
    game.wasinwater = game.u.uinwater; /* for WWALKING; Boots_on() is too late */
    setworn(obj, mask.mask);
    /* if there's no delay, we'll execute 'afternmv' immediately */
    if (obj === game.u.uarm)
        game.afternmv = Armor_on;
    else if (obj === game.u.uarmh)
        game.afternmv = Helmet_on;
    else if (obj === game.u.uarmg)
        game.afternmv = Gloves_on;
    else if (obj === game.u.uarmf)
        game.afternmv = Boots_on;
    else if (obj === game.u.uarms)
        game.afternmv = Shield_on;
    else if (obj === game.u.uarmc)
        game.afternmv = Cloak_on;
    else if (obj === game.u.uarmu)
        game.afternmv = Shirt_on;
    else
        note_unported_do_wear('accessory_or_armor_on:panic'); /* C panic()s */

    delay = -game.objects[obj.otyp].oc_delay;
    if (delay) {
        nomul(delay);
        game.multi_reason = "dressing up";
        /* nomovemsg is not tracked in this port; see js/hack.js */
        note_unported_do_wear('accessory_or_armor_on:nomovemsg');
    } else {
        await unmul(""); /* call afternmv, clear it+nomovemsg+multi_reason */
        await on_msg(obj);
    }
    game.context.takeoff.mask = game.context.takeoff.what = 0;
    return ECMD_TIME;
}

/* src/do_wear.c:3404 equip_ok() — not a getobj callback; unifies code among
   the other 4 getobj callbacks.
 *
 * async because canwearobj() is. js/invent.js's getobj_letters() awaits its
 * callback for exactly this reason.
 */
async function equip_ok(obj, removing, accessory) {
    let is_worn_;
    const dummymask = { mask: 0 };

    if (!obj)
        return GETOBJ_EXCLUDE;

    /* ignore for putting on if already worn, or removing if not worn */
    is_worn_ = ((obj.owornmask & (W_ARMOR | W_ACCESSORY)) !== 0);
    if (removing !== is_worn_)   /* C: removing ^ is_worn, both booleans */
        return GETOBJ_EXCLUDE_INACCESS;

    /* exclude most object classes outright */
    if (obj.oclass !== OCLASSES.ARMOR_CLASS && obj.oclass !== OCLASSES.RING_CLASS
        && obj.oclass !== OCLASSES.AMULET_CLASS) {
        /* ... except for a few wearable exceptions outside these classes */
        if (obj.otyp !== ONAMES.MEAT_RING && obj.otyp !== ONAMES.BLINDFOLD
            && obj.otyp !== ONAMES.TOWEL && obj.otyp !== ONAMES.LENSES)
            return GETOBJ_EXCLUDE;
    }

    /* armor with 'P' or 'R' or accessory with 'W' or 'T' */
    if (accessory !== (obj.oclass !== OCLASSES.ARMOR_CLASS))
        return GETOBJ_DOWNPLAY;

    /* armor we can't wear, e.g. from polyform */
    if (obj.oclass === OCLASSES.ARMOR_CLASS && !removing
        && !await canwearobj(obj, dummymask, false))
        return GETOBJ_DOWNPLAY;

    /* removing inaccessible equipment. inaccessible_equipment() is not ported
       and neither is gi.item_action_in_progress, so this arm is recorded. It
       is unreachable from wear_ok/puton_ok, which pass removing=false. */
    if (removing)
        note_unported_do_wear('equip_ok:inaccessible_equipment');

    /* all good to go */
    return GETOBJ_SUGGEST;
}

/* src/do_wear.c wear_ok() — getobj callback for W command */
export async function wear_ok(obj) {
    return await equip_ok(obj, false, false);
}

/* src/do_wear.c takeoff_ok() — getobj callback for T command */
export async function takeoff_ok(obj) {
    return await equip_ok(obj, true, false);
}

/* src/do_wear.c puton_ok() — getobj callback for P command */
export async function puton_ok(obj) {
    return await equip_ok(obj, false, true);
}

/* src/do_wear.c remove_ok() — getobj callback for R command */
export async function remove_ok(obj) {
    return await equip_ok(obj, true, true);
}

// src/do_wear.c:2432 dowear() — the #wear command.
export async function dowear() {
    let otmp;

    /* cantweararm() checks for suits of armor, not what we want here;
       verysmall() or nohands() checks for shields, gloves, etc... */
    if (verysmall(game.youmonst.data) || nohands(game.youmonst.data)) {
        await pline("Don't even bother.");
        return ECMD_OK;
    }
    if (game.u.uarm && game.u.uarmu && game.u.uarmc && game.u.uarmh
        && game.u.uarms && game.u.uarmg && game.u.uarmf
        && game.u.uleft && game.u.uright && game.u.uamul && game.u.ublindf) {
        /* 'W' message doesn't mention accessories */
        await You("are already wearing a full complement of armor.");
        return ECMD_OK;
    }
    otmp = await getobj("wear", wear_ok, GETOBJ_NOFLAGS);
    return otmp ? await accessory_or_armor_on(otmp) : ECMD_CANCEL;
}

// src/do_wear.c:2454 doputon() — the #puton command.
export async function doputon() {
    let otmp;

    if (game.u.uleft && game.u.uright && game.u.uamul && game.u.ublindf
        && game.u.uarm && game.u.uarmu && game.u.uarmc && game.u.uarmh
        && game.u.uarms && game.u.uarmg && game.u.uarmf) {
        /* 'P' message doesn't mention armor */
        await Your(`${humanoid(game.youmonst.data) ? "ring-" : ""}${fingers_or_gloves(false)} are full, and you're already wearing an amulet and ${(game.u.ublindf.otyp === ONAMES.LENSES) ? "some lenses" : "a blindfold"}.`);
        return ECMD_OK;
    }
    otmp = await getobj("put on", puton_ok, GETOBJ_NOFLAGS);
    return otmp ? await accessory_or_armor_on(otmp) : ECMD_CANCEL;
}

// src/do_wear.c:1461 Blindf_on() — put on a blindfold, towel or lenses.
export async function Blindf_on(otmp) {
    const already_blind = Blind();
    let changed = false;

    /* blindfold might be wielded; release it for wearing */
    await remove_worn_item(otmp, false);
    setworn(otmp, W_TOOL);
    await on_msg(otmp);

    if (Blind() && !already_blind) {
        changed = true;
        if (game.flags.verbose)
            await You_cant("see any more.");
        /* set ball&chain variables before the hero goes blind.
           set_bc() (src/ball.c:380) needs the ball/chain glyph bookkeeping
           (bc_order, remove_object, newsym, place_object) and is reachable
           only while Punished, so it is recorded. */
        if (Punished())
            note_unported_do_wear('Blindf_on:set_bc');
    } else if (already_blind && !Blind()) {
        changed = true;
        /* "You are now wearing the Eyes of the Overworld." */
        if (game.u.uroleplay.blind) {
            /* this can only happen by putting on the Eyes of the Overworld;
               that shouldn't actually produce a permanent cure, but we
               can't let the "blind from birth" conduct remain intact */
            await pline("For the first time in your life, you can see!");
            game.u.uroleplay.blind = false;
        } else
            await You("can see!");
    }
    if (changed) {
        toggle_blindness(); /* potion.c */
    }
}

// src/do_wear.c:1193 learnring() — the hero may learn a ring's type and/or
// enchantment after wearing it.
export function learnring(ring, observed) {
    const ringtype = ring.otyp;

    /* if effect was observable then we usually discover the type */
    if (observed) {
        /* if we already know the ring type which accomplishes this
           effect (assumes there is at most one type for each effect),
           mark this ring as having been seen (no need for makeknown);
           otherwise if we have seen this ring, discover its type */
        if (game.objects[ringtype].oc_name_known)
            observe_object(ring);
        else if (ring.dknown)
            makeknown(ringtype);
        /* the #if 0 else-arm in the C (see learnwand()) is not built */
    }

    /* make enchantment of charged ring known (might be +0) and update
       perm invent window if we've seen this ring and know its type */
    if (ring.dknown && game.objects[ringtype].oc_name_known) {
        if (game.objects[ringtype].oc_charged)
            ring.known = 1;
        update_inventory();
    }
}

// src/do_wear.c:107 toggle_stealth() — putting on or taking off an item which
// confers stealth; give feedback and discover it iff stealth state is changing.
//
// Stealth is blocked by riding unless hero+steed fly (handled with BStealth by
// the mount and dismount routines).
//
// oldprop is prop[].extrinsic with obj->owornmask PRE-STRIPPED by the caller,
// so a nonzero value means some OTHER item is already conferring stealth.
export async function toggle_stealth(obj, oldprop, on) {
    if (on ? game.initial_don : game.context.takeoff.cancelled_don)
        return;

    if (!oldprop /* extrinsic stealth from something else */
        && !H(STEALTH) /* intrinsic stealth */
        && !B(STEALTH)) { /* stealth blocked by something */
        if (obj.otyp === ONAMES.RIN_STEALTH)
            learnring(obj, true);
        else /* discover elven cloak or elven boots */
            makeknown(obj.otyp);

        if (on) {
            if (!is_boots(obj))
                await You("move very quietly.");
            else if (Levitation() || Flying())
                await You("float imperceptibly.");
            else
                await You("walk very quietly.");
        } else {
            const riding = (game.u.usteed != null);

            /* C: You("%s%s are noisy.", riding ? "and " : "sure", ...) —
               so NOT riding gives "You sure are noisy." and riding gives
               "You and <your steed> are noisy." The "sure"/"and " pair is
               easy to misread as a typo; it is not. */
            await You(`${riding ? "and " : "sure"}${riding
                ? x_monnam(game.u.usteed, ARTICLE_YOUR, null,
                           (SUPPRESS_SADDLE | SUPPRESS_HALLUCINATION), false)
                : ""} are noisy.`);
        }
    }
}

// src/do_wear.c:1223 adjust_attrib() — a ring of gain/adornment changes an
// attribute; learn its enchantment iff the change was observable.
export function adjust_attrib(obj, which, val) {
    let old_attrib;
    let observable;

    old_attrib = ACURR(which);
    /* C: ABON(which) += val, i.e. u.abon.a[which] */
    game.u.abon.a[which] += val;
    observable = (old_attrib !== ACURR(which));
    /* if didn't change, usually means ring is +0 but might
        be because nonzero couldn't go below min or above max;
        learn +0 enchantment if attribute value is not stuck
        at a limit [and ring has been seen and its type is
        already discovered, both handled by learnring()] */
    if (observable || !extremeattr(which))
        learnring(obj, observable);
    game.botl = true;
}

/*
 * src/do_wear.c:1242 Ring_on() — the ring is already worn in a slot; apply its
 * effect.
 *
 * Three arms are recorded rather than written, each blocked on a subsystem:
 *   RIN_PROTECTION_FROM_SHAPE_CHAN -> rescham() -> normal_shape() -> newcham(),
 *     the 257-line polymorph engine.
 *   RIN_LEVITATION's float_up() (src/trap.c:3937) and spoteffects().
 * Every other case is real. Most ring types legitimately do nothing here --
 * the long fallthrough of `break`s at the top is the C's, not a placeholder.
 */
export async function Ring_on(obj) {
    let oldprop = game.u.uprops?.[game.objects[obj.otyp].oc_oprop]?.extrinsic | 0;
    let observable;

    /* make sure ring isn't wielded; can't use remove_worn_item()
       here because it has already been set worn in a ring slot */
    if (obj === game.u.uwep)
        setuwep(null);
    else if (obj === game.u.uswapwep)
        setuswapwep(null);
    else if (obj === game.u.uquiver)
        setuqwep(null);

    /* only mask out W_RING when we don't have both
       left and right rings of the same type */
    if ((oldprop & W_RING) !== W_RING)
        oldprop &= ~W_RING;

    switch (obj.otyp) {
    case ONAMES.RIN_TELEPORTATION:
    case ONAMES.RIN_REGENERATION:
    case ONAMES.RIN_SEARCHING:
    case ONAMES.RIN_HUNGER:
    case ONAMES.RIN_AGGRAVATE_MONSTER:
    case ONAMES.RIN_POISON_RESISTANCE:
    case ONAMES.RIN_FIRE_RESISTANCE:
    case ONAMES.RIN_COLD_RESISTANCE:
    case ONAMES.RIN_SHOCK_RESISTANCE:
    case ONAMES.RIN_CONFLICT:
    case ONAMES.RIN_TELEPORT_CONTROL:
    case ONAMES.RIN_POLYMORPH:
    case ONAMES.RIN_POLYMORPH_CONTROL:
    case ONAMES.RIN_FREE_ACTION:
    case ONAMES.RIN_SLOW_DIGESTION:
    case ONAMES.RIN_SUSTAIN_ABILITY:
        break;
    case ONAMES.MEAT_RING:
        /* wearing a meat ring does not affect vegan conduct */
        break;
    case ONAMES.RIN_STEALTH:
        await toggle_stealth(obj, oldprop, true);
        break;
    case ONAMES.RIN_WARNING:
        see_monsters();
        break;
    case ONAMES.RIN_SEE_INVISIBLE:
        /* can now see invisible monsters */
        set_mimic_blocking(); /* do special mimic handling */
        see_monsters();

        if (Invis() && !oldprop && !H(SEE_INVIS) && !Blind()) {
            newsym(game.u.ux, game.u.uy);
            await pline("Suddenly you are transparent, but there!");
            learnring(obj, true);
        }
        break;
    case ONAMES.RIN_INVISIBILITY:
        if (!oldprop && !H(INVIS) && !B(INVIS) && !Blind()) {
            learnring(obj, true);
            newsym(game.u.ux, game.u.uy);
            await self_invis_message();
        }
        break;
    case ONAMES.RIN_LEVITATION:
        if (!oldprop && !H(LEVITATION)
            && !(game.u.uprops?.[LEVITATION]?.blocked & FROMOUTSIDE)) {
            note_unported_do_wear('Ring_on:float_up');
            learnring(obj, true);
            if (Levitation())
                note_unported_do_wear('Ring_on:spoteffects'); /* for sinks */
        } else {
            float_vs_flight(); /* maybe toggle (BFlying & I_SPECIAL) */
        }
        break;
    case ONAMES.RIN_GAIN_STRENGTH:
        adjust_attrib(obj, A_STR, obj.spe);
        break;
    case ONAMES.RIN_GAIN_CONSTITUTION:
        adjust_attrib(obj, A_CON, obj.spe);
        break;
    case ONAMES.RIN_ADORNMENT:
        adjust_attrib(obj, A_CHA, obj.spe);
        break;
    case ONAMES.RIN_INCREASE_ACCURACY: /* KMH */
        game.u.uhitinc += obj.spe;
        break;
    case ONAMES.RIN_INCREASE_DAMAGE:
        game.u.udaminc += obj.spe;
        break;
    case ONAMES.RIN_PROTECTION_FROM_SHAPE_CHAN:
        note_unported_do_wear('Ring_on:rescham');
        break;
    case ONAMES.RIN_PROTECTION:
        /* usually learn enchantment and discover type;
           won't happen if ring is unseen or if it's +0
           and the type hasn't been discovered yet */
        observable = (obj.spe !== 0);
        learnring(obj, observable);
        if (obj.spe)
            find_ac(); /* updates botl */
        break;
    }
}
