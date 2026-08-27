// do_wear.js — wearing and taking off armour.
// C ref: src/do_wear.c
//
// Only find_ac() so far. It matters at startup because u.uac is 0 out of the
// zeroed `struct you` and stays 0 through newgame(): the status line under the
// legacy window shows AC:0 for every role, armoured or not, and only
// moveloop_preamble()'s find_ac() turns that into the real number.

import { game } from './gstate.js';
import { mons } from './monst_data.js';
import { objects, ONAMES, OCLASSES } from './objects_data.js';
import { W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU, W_TOOL,
         W_RINGL, W_RINGR, W_AMUL, W_WEP, W_SWAPWEP, W_QUIVER, AC_MAX,
         ECMD_TIME, TT_BEARTRAP, TT_INFLOOR, I_SPECIAL,
         WORN_ARMOR, WORN_CLOAK, WORN_SHIRT, WORN_HELMET, WORN_GLOVES,
         WORN_SHIELD, WORN_BOOTS, WORN_AMUL, WORN_BLINDF,
         LEFT_RING, RIGHT_RING, TIMEOUT, A_DEX, INTRINSIC } from './const.js';
import { setworn } from './worn.js';
import { welded, is_sword } from './wield.js';
import { bimanual, is_metallic } from './obj.js';
import { Is_dragon_armor, nolimbs, nohands, verysmall } from './mondata.js';
import { sgn } from './hacklib.js';
import { erode_obj, is_flammable, is_rustprone, is_crackable, is_rottable,
         is_corrodeable, is_damageable } from './trap.js';
import { erosion_matters } from './mkobj.js';
import { rn2, rnd } from './rng.js';
import { ERODE_BURN, ERODE_RUST, ERODE_CRACK, ERODE_ROT, ERODE_CORRODE,
         ERODE_NONE, EF_PAY, EF_DESTROY, ER_NOTHING,
         ER_DESTROYED } from './const.js';
import { stop_occupation } from './allmain.js';
import { pline } from './display.js';
import { You, You_feel, You_cant, Your } from './pline.js';
import { an, xname, doname, the, gloves_simple_name,
         suit_simple_name } from './objnam.js';
import { makeknown, observe_object } from './o_init.js';
import { prinv, update_inventory, ECMD_OK } from './invent.js';
import { nomul, unmul } from './hack.js';
import { tty_yn_function } from './tty/topl.js';
import { encumber_msg } from './attrib.js';

const OCLASSES_ARMOR = OCLASSES.ARMOR_CLASS;
const OCLASSES_RING = OCLASSES.RING_CLASS;
const OCLASSES_AMULET = OCLASSES.AMULET_CLASS;

export function worn(mask) {
    return (game.invent || []).find(o => (o.owornmask & mask) !== 0) || null;
}

// include/obj.h:126 greatest_erosion()
export function greatest_erosion(obj) {
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

    if (((u.intrinsic?.HProtection || 0) & INTRINSIC) !== 0)
        uac -= (u.ublessed || 0);
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
    if (!game.u.uarm)   /* no known instances of !uarm here but play it safe */
        return 0;
    if (!game.u.uarm.known) {
        game.u.uarm.known = 1; /* +/- evident because of status line AC */
        note_unported_do_wear('Armor_on:update_inventory');
    }
    /* src/do_wear.c dragon_armor_handling(): blue dragon armor grants an
       extra speed property in addition to its ordinary shock resistance. */
    if (game.u.uarm.otyp === ONAMES.BLUE_DRAGON_SCALES
        || game.u.uarm.otyp === ONAMES.BLUE_DRAGON_SCALE_MAIL) {
        const hfast = game.u.intrinsic?.HFast | 0;
        const efast = game.u.uprops?.FAST | 0;
        const fast = !!(hfast || efast);
        const very_fast = !!((hfast & TIMEOUT) || efast);
        if (!very_fast)
            await You(`speed up${fast ? ' a bit more' : ''}.`);
        (game.u.uprops ||= {}).FAST = efast | W_ARM;
    } else if (Is_dragon_armor(game.u.uarm)) {
        note_unported_do_wear('Armor_on:dragon_armor_handling');
    }
    if (game.u.uarm.oartifact)
        note_unported_do_wear('Armor_on:artifact_light');
    return 0;
}

/* Every armor-slot on-handler ends by revealing the item's enchantment: the
   status-line AC change makes its +/- value evident. Slot-specific magical
   effects remain in their dedicated handlers; these common tails cover the
   ordinary armor paths. */
function reveal_worn_armor(mask) {
    const obj = worn(mask);
    if (obj && !obj.known) {
        obj.known = 1;
        update_inventory();
    }
    return 0;
}

async function Cloak_on() {
    const uarmc = worn(W_ARMC);
    if (!uarmc)
        return 0;
    const prop = PROP_KEYS[objects[uarmc.otyp].oc_oprop];
    const oldprop = (game.u.uprops?.[prop] || 0) & ~WORN_CLOAK;

    if (uarmc.otyp === ONAMES.CLOAK_OF_DISPLACEMENT
        && !oldprop && !game.u.intrinsic?.HDisplaced
        && !game.u.blocked?.DISPLACED
        && ((!game.u.ublind && !game.u.uswallow && !game.u.uprops?.INVIS)
            || game.u.unblind_telepat_range >= 0
            || game.u.uprops?.DETECT_MONSTERS)) {
        makeknown(uarmc.otyp);
        await You_feel('that monsters have difficulty pinpointing your location.');
    } else if (uarmc.otyp === ONAMES.CLOAK_OF_PROTECTION) {
        makeknown(uarmc.otyp);
    }
    return reveal_worn_armor(W_ARMC);
}
function Helmet_on() { return reveal_worn_armor(W_ARMH); }
function Gloves_on() {
    const uarmg = worn(W_ARMG);
    if (!uarmg)
        return 0;

    switch (uarmg.otyp) {
    case ONAMES.GAUNTLETS_OF_POWER:
        makeknown(uarmg.otyp);
        (game.disp ||= {}).botl = true;
        break;
    case ONAMES.GAUNTLETS_OF_DEXTERITY:
        if (uarmg.spe) {
            makeknown(uarmg.otyp);
            game.u.abon.a[A_DEX] += uarmg.spe;
        }
        (game.disp ||= {}).botl = true;
        break;
    case ONAMES.GAUNTLETS_OF_FUMBLING: {
        const intrinsic = (game.u.intrinsic ||= {});
        const old = intrinsic.HFumbling || 0;
        const oldprop = (game.u.uprops?.FUMBLING || 0) & ~WORN_GLOVES;
        if (!oldprop && !(old & ~TIMEOUT))
            intrinsic.HFumbling = (old & ~TIMEOUT)
                | Math.min(TIMEOUT, (old & TIMEOUT) + rnd(20));
        break;
    }
    }
    return reveal_worn_armor(W_ARMG);
}
function Shield_on() { return reveal_worn_armor(W_ARMS); }
function Shirt_on()  { return reveal_worn_armor(W_ARMU); }

/* include/prop.h enum prop_types, index -> uprops key. The flat uprops map
   keys by the C constant's name; setworn's generic property arm (src/worn.c)
   writes through this table when gear is put on. Index 0 is unused in C. */
export const PROP_KEYS = [null,
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

    if (game.u.ublindf && (!obj || obj === game.u.ublindf))
        note_unported_do_wear('set_wear:Blindf_on');
    for (const mask of [W_RINGR, W_RINGL]) {
        const o = slotobj(mask);
        if (o && (!obj || obj === o))
            note_unported_do_wear('set_wear:Ring_on');
    }
    {
        const o = slotobj(W_AMUL);
        if (o && (!obj || obj === o))
            note_unported_do_wear('set_wear:Amulet_on');
    }

    /* the worn items' oc_oprop extrinsics were granted by setworn() when
       u_init dressed the hero, exactly as in C; the handlers here add only
       their slot-specific side effects (messages are suppressed at initial
       don, C gates them on gi.initial_don) */
    for (const [mask, arm] of [[W_ARMU, 'Shirt_on'], [W_ARM, 'Armor_on'],
                               [W_ARMC, 'Cloak_on'], [W_ARMF, 'Boots_on'],
                               [W_ARMG, 'Gloves_on'], [W_ARMH, 'Helmet_on'],
                               [W_ARMS, 'Shield_on']]) {
        const o = slotobj(mask);
        if (o && (!obj || obj === o)) {
            if (arm === 'Armor_on')
                Armor_on();
        }
    }

    game.initial_don = false;
}

function note_unported_do_wear(what) {
    (game.unported ||= new Set()).add('do_wear:' + what);
}

/* ---- the wear/take-off command layer (src/do_wear.c:1729-2489) ---- */

/* include/obj.h:278 — each of these is TWO tests in C: the object is armour
   AND its oc_armcat matches. oc_subtyp is a union field that means the weapon
   skill for a weapon, so without the class test a weapon whose skill happens
   to be 1 reads as a shield. */
const is_suit   = (o) => o.oclass === OCLASSES.ARMOR_CLASS
                         && objects[o.otyp].oc_subtyp === 0; /* ARM_SUIT */
const is_shield = (o) => o.oclass === OCLASSES.ARMOR_CLASS
                         && objects[o.otyp].oc_subtyp === 1;
const is_helmet = (o) => o.oclass === OCLASSES.ARMOR_CLASS
                         && objects[o.otyp].oc_subtyp === 2;
const is_gloves = (o) => o.oclass === OCLASSES.ARMOR_CLASS
                         && objects[o.otyp].oc_subtyp === 3;
const is_boots  = (o) => objects[o.otyp].oc_subtyp === 4;
const is_cloak  = (o) => objects[o.otyp].oc_subtyp === 5;
const is_shirt  = (o) => objects[o.otyp].oc_subtyp === 6;

/* setworn()/setnotworn() live in js/worn.js (src/worn.c), imported above.
   The reduced local copies that only tracked owornmask and a boolean
   property flag were replaced when the worn[] table landed there. */

/* src/do_wear.c:1574 donning() — is a multi-turn wear of otmp in progress?
   ga.afternmv can only hold a handler this port has; comparisons against
   unported handlers are vacuously false, exactly as if they could never be
   in progress (they cannot: nothing sets afternmv to a missing function). */
export function donning(otmp) {
    let result = false;

    if (doffing(otmp))
        result = true;
    else if (otmp === game.u.uarm)
        result = (game.afternmv === Armor_on);
    else if (otmp === game.u.uarmc)
        result = (game.afternmv === Cloak_on);
    else if (otmp === game.u.uarmh)
        result = (game.afternmv === Helmet_on);
    else if (otmp === game.u.uarmg)
        result = (game.afternmv === Gloves_on);
    else if (otmp === game.u.uarmf)
        result = (game.afternmv === Boots_on);
    else if (otmp === game.u.uarms)
        result = (game.afternmv === Shield_on);
    else if (otmp === game.u.uarmu)
        result = (game.afternmv === Shirt_on);

    return result;
}

// src/do_wear.c:1603 doffing() — is removal of otmp in progress or pending?
export function doffing(otmp) {
    const what = game.context_takeoff?.what || 0;
    let result = false;

    /* 'T' (or 'R' used for armor) sets ga.afternmv, 'A' sets takeoff.what */
    if (otmp === game.u.uarmf)
        result = (what === WORN_BOOTS);   /* Boots_off is not an afternmv */
    else if (otmp === game.u.uarm)
        result = (what === WORN_ARMOR);
    else if (otmp === game.u.uarmu)
        result = (what === WORN_SHIRT);
    else if (otmp === game.u.uarmc)
        result = (what === WORN_CLOAK);
    else if (otmp === game.u.uarmh)
        result = (what === WORN_HELMET);
    else if (otmp === game.u.uarmg)
        result = (what === WORN_GLOVES);
    else if (otmp === game.u.uarms)
        result = (what === WORN_SHIELD);
    /* these 1-turn items don't need 'ga.afternmv' checks */
    else if (otmp === game.u.uamul)
        result = (what === WORN_AMUL);
    else if (otmp === game.u.uleft)
        result = (what === LEFT_RING);
    else if (otmp === game.u.uright)
        result = (what === RIGHT_RING);
    else if (otmp === game.u.ublindf)
        result = (what === WORN_BLINDF);
    else if (otmp === game.u.uwep)
        result = (what === W_WEP);
    else if (otmp === game.u.uswapwep)
        result = (what === W_SWAPWEP);
    else if (otmp === game.u.uquiver)
        result = (what === W_QUIVER);

    return result;
}

// src/do_wear.c:1664 cancel_don() — the piece being donned/doffed vanished.
export function cancel_don() {
    const tk = (game.context_takeoff ||= { mask: 0 });
    /* afternmv never has some of these values because every item of the
       corresponding armor category takes 1 turn to wear, but check all of
       them anyway (only the ported handlers can appear on this tree) */
    tk.cancelled_don = (game.afternmv === Armor_on
                        || game.afternmv === Cloak_on
                        || game.afternmv === Helmet_on
                        || game.afternmv === Gloves_on
                        || game.afternmv === Boots_on
                        || game.afternmv === Shield_on
                        || game.afternmv === Shirt_on);
    game.afternmv = null;
    game.nomovemsg = null;
    game.multi = 0;
    tk.delay = 0;
    tk.what = 0;
}

// src/do_wear.c:1645 cancel_doff() — called by setworn() for the old item in
// a slot, or by setnotworn() for a specific item.
export function cancel_doff(obj, slotmask) {
    const tk = (game.context_takeoff ||= { mask: 0 });

    if (!(tk.mask & I_SPECIAL) && donning(obj))
        cancel_don(); /* applies to doffing too */
    tk.mask &= ~slotmask;
}

// src/do_wear.c:68 off_msg() / :76 on_msg()
async function off_msg(otmp) {
    if (game.flags?.verbose !== false)
        await You(`were wearing ${doname(otmp)}.`);
}

async function on_msg(otmp) {
    if ((otmp.owornmask & (W_RINGL | W_RINGR | W_AMUL)) !== 0) {
        await prinv(null, otmp, 0);
        return;
    }
    if (game.flags?.verbose !== false) {
        const otmp_name = xname(otmp);
        /* obj_is_pname() only for artifacts */
        await You(`are now wearing ${an(otmp_name)}.`);
    }
}

// src/do_wear.c:187 Boots_on()
export async function Boots_on() {
    const uarmf = worn(W_ARMF);
    if (!uarmf) return;
    const oldprop = (game.u.uprops?.FUMBLING || 0) & ~WORN_BOOTS;
    switch (uarmf.otyp) {
    case ONAMES.LOW_BOOTS:
    case ONAMES.IRON_SHOES:
    case ONAMES.HIGH_BOOTS:
    case ONAMES.JUMPING_BOOTS:
    case ONAMES.KICKING_BOOTS:
        break;
    case ONAMES.SPEED_BOOTS:
        /* oldprop: extrinsic speed from another source; none exists */
        if (!(game.u.intrinsic?.HFast)) {
            makeknown(uarmf.otyp);
            await You_feel('yourself speed up.');
        } else {
            makeknown(uarmf.otyp);
            await You_feel('yourself speed up a bit more.');
        }
        break;
    case ONAMES.WATER_WALKING_BOOTS:
    case ONAMES.ELVEN_BOOTS:
    case ONAMES.LEVITATION_BOOTS:
    default:
        note_unported_do_wear(`Boots_on:otyp=${uarmf.otyp}`);
        break;
    case ONAMES.FUMBLE_BOOTS: {
        const intrinsic = (game.u.intrinsic ||= {});
        const old = intrinsic.HFumbling || 0;
        if (!oldprop && !(old & ~TIMEOUT)) {
            const timeout = Math.min(TIMEOUT, (old & TIMEOUT) + rnd(20));
            intrinsic.HFumbling = (old & ~TIMEOUT) | timeout;
        }
        break;
    }
    }
    if (game.u.uarmf && !game.u.uarmf.known) {
        game.u.uarmf.known = 1;
        update_inventory();
    }
}

// src/do_wear.c:239 Boots_off()
async function Boots_off(otmp) {
    switch (otmp.otyp) {
    case ONAMES.SPEED_BOOTS:
        if (!(game.u.intrinsic?.HFast)) {
            makeknown(otmp.otyp);
            await You_feel('yourself slow down.');
        } else {
            makeknown(otmp.otyp);
            await You_feel('yourself slow down a bit.');
        }
        break;
    case ONAMES.LOW_BOOTS:
    case ONAMES.IRON_SHOES:
    case ONAMES.HIGH_BOOTS:
    case ONAMES.JUMPING_BOOTS:
    case ONAMES.KICKING_BOOTS:
        break;
    default:
        note_unported_do_wear(`Boots_off:otyp=${otmp.otyp}`);
        break;
    }
}

// src/do_wear.c:963 Amulet_on() — setworn and on_msg are its own business.
export async function Amulet_on(amul) {
    setworn(amul, W_AMUL);
    find_ac();  /* C: the AMULET_OF_GUARDING arm recomputes AC */
    switch (amul.otyp) {
    case ONAMES.AMULET_OF_ESP:
    case ONAMES.AMULET_OF_LIFE_SAVING:
    case ONAMES.AMULET_VERSUS_POISON:
    case ONAMES.AMULET_OF_REFLECTION:
    case ONAMES.FAKE_AMULET_OF_YENDOR:
        break;
    case ONAMES.AMULET_OF_RESTFUL_SLEEP: {
        const intrinsic = (game.u.intrinsic ||= {});
        const oldnap = (intrinsic.HSleepy || 0) & TIMEOUT;
        const newnap = rnd(98) + 2;
        if (newnap < oldnap || oldnap === 0)
            intrinsic.HSleepy = ((intrinsic.HSleepy || 0) & ~TIMEOUT)
                                | newnap;
        break;
    }
    default:
        note_unported_do_wear(`Amulet_on:otyp=${amul.otyp}`);
        break;
    }
    await on_msg(amul);
}

// src/do_wear.c:1030 Amulet_off() — does its own off_msg.
export async function Amulet_off() {
    const uamul = worn(W_AMUL);
    if (!uamul) return;
    await off_msg(uamul);
    switch (uamul.otyp) {
    case ONAMES.AMULET_OF_ESP:
    case ONAMES.AMULET_OF_LIFE_SAVING:
    case ONAMES.AMULET_VERSUS_POISON:
    case ONAMES.AMULET_OF_REFLECTION:
    case ONAMES.FAKE_AMULET_OF_YENDOR:
        break;
    default:
        note_unported_do_wear(`Amulet_off:otyp=${uamul.otyp}`);
        break;
    }
    setworn(null, W_AMUL);   /* src/do_wear.c:1100 */
    find_ac();
}

// src/do_wear.c:1193 learnring(): reveal an observed effect and, once the
// type is known, the enchantment of a charged ring.
function learnring(ring, observed) {
    const ringtype = ring.otyp;
    if (observed) {
        if (game.objects[ringtype].oc_name_known)
            observe_object(ring);
        else if (ring.dknown)
            makeknown(ringtype);
    }
    if (ring.dknown && game.objects[ringtype].oc_name_known) {
        if (game.objects[ringtype].oc_charged)
            ring.known = 1;
        update_inventory();
    }
}

// src/do_wear.c Ring_on()/Ring_off().
async function Ring_on(obj) {
    switch (obj.otyp) {
    case ONAMES.RIN_ADORNMENT:
    case ONAMES.RIN_STEALTH:
    case ONAMES.RIN_SUSTAIN_ABILITY:
    case ONAMES.RIN_WARNING:
        break;
    case ONAMES.RIN_PROTECTION:
        learnring(obj, obj.spe !== 0);
        if (obj.spe)
            find_ac();
        break;
    default:
        note_unported_do_wear(`Ring_on:otyp=${obj.otyp}`);
        break;
    }
}

async function Ring_off(obj) {
    const observable = obj.otyp === ONAMES.RIN_PROTECTION && obj.spe !== 0;
    setworn(null, obj.owornmask & (W_RINGL | W_RINGR));
    if (obj.otyp === ONAMES.RIN_PROTECTION) {
        learnring(obj, observable);
        if (obj.spe)
            find_ac();
    } else {
        find_ac();
        note_unported_do_wear(`Ring_off:otyp=${obj.otyp}`);
    }
}

// src/do_wear.c:2030 canwearobj() — find the slot; refuse with C's message
// when it is taken. The polymorph, trap and welded-weapon arms record.
// src/do_wear.c:1911 canwearobj() — which slot this armor would occupy, or
// 0 with the reason. The silent core is synchronous so equip_ok() (the
// getobj filter, src/do_wear.c:3413) can consult it per item; the async
// wrapper prints the failure when the caller asked for noise.
export function canwearobj_core(otmp) {
    const fail = (msg) => ({ mask: 0, msg });
    const already_wearing = (cc) => fail(() => You(`are already wearing ${cc}.`));

    if (otmp.owornmask & (W_ARM | W_ARMC | W_ARMH | W_ARMS | W_ARMG
                          | W_ARMF | W_ARMU))
        return already_wearing('that');
    if (is_helmet(otmp)) {
        const uarmh = worn(W_ARMH);
        if (uarmh)
            return already_wearing(an(helm_simple_name(uarmh)));
        return { mask: W_ARMH };
    } else if (is_shield(otmp)) {
        const uarms = worn(W_ARMS);
        if (uarms) return already_wearing('a shield');
        if (game.u.uwep && bimanual_obj(game.u.uwep))
            return fail(() => You(
                'cannot wear a shield while wielding a two-handed weapon.'));
        return { mask: W_ARMS };
    } else if (is_boots(otmp)) {
        const uarmf = worn(W_ARMF);
        if (uarmf) return already_wearing('boots');
        if (game.u.utrap) {
            note_unported_do_wear('canwearobj:boots_trapped');
            return { mask: 0 };
        }
        return { mask: W_ARMF };
    } else if (is_gloves(otmp)) {
        const uarmg = worn(W_ARMG);
        if (uarmg) return already_wearing('gloves');
        return { mask: W_ARMG };
    } else if (is_shirt(otmp)) {
        const uarm = worn(W_ARM), uarmc = worn(W_ARMC), uarmu = worn(W_ARMU);
        if (uarm || uarmc || uarmu) {
            if (uarmu)
                return already_wearing('a shirt');
            return fail(() => You(`can't wear that over your ${
                (uarm && !uarmc) ? 'armor'
                : cloak_simple_name(uarmc)}.`));
        }
        return { mask: W_ARMU };
    } else if (is_cloak(otmp)) {
        const uarmc = worn(W_ARMC);
        if (uarmc)
            return already_wearing(an(cloak_simple_name(uarmc)));
        return { mask: W_ARMC };
    } else if (is_suit(otmp)) {
        const uarmc = worn(W_ARMC);
        if (uarmc)
            return fail(() => You(`cannot wear armor over a ${
                cloak_simple_name(uarmc)}.`));
        if (worn(W_ARM)) return already_wearing('some armor');
        return { mask: W_ARM };
    }
    note_unported_do_wear(`canwearobj:otyp=${otmp.otyp}`);
    return { mask: 0 };
}

export async function canwearobj(otmp, noisy) {
    const r = canwearobj_core(otmp);
    if (!r.mask && noisy && r.msg)
        await r.msg();
    return r.mask;
}

/* include/obj.h bimanual() needs both hands */
function bimanual_obj(o) {
    return objects[o.otyp].oc_bimanual
        || (objects[o.otyp].oc_class === 2 /* WEAPON */
            && objects[o.otyp].oc_big);
}

export function helm_simple_name(h) {
    /* "hat" for flimsy headgear, else "helm" */
    if (!h)
        return 'hat';
    return hard_helmet(h) ? 'helm' : 'hat';
}
export function cloak_simple_name(c) {
    if (c) {
        switch (c.otyp) {
        case ONAMES.ROBE: return 'robe';
        case ONAMES.MUMMY_WRAPPING: return 'wrapping';
        case ONAMES.ALCHEMY_SMOCK:
            return (objects[c.otyp].oc_name_known && c.dknown)
                ? 'smock' : 'apron';
        default: break;
        }
    }
    return 'cloak';
}

// src/do_wear.c:2201 accessory_or_armor_on()
export async function accessory_or_armor_on(obj) {
    let mask = 0;
    const armor = obj.oclass === OCLASSES_ARMOR;
    const ring = obj.oclass === OCLASSES_RING || obj.otyp === ONAMES.MEAT_RING;
    const amulet = obj.oclass === OCLASSES_AMULET;
    const eyewear = obj.otyp === ONAMES.BLINDFOLD || obj.otyp === ONAMES.TOWEL
        || obj.otyp === ONAMES.LENSES;

    if (obj.owornmask & (W_ARM | W_ARMC | W_ARMH | W_ARMS | W_ARMG | W_ARMF
                         | W_ARMU | W_RINGL | W_RINGR | W_AMUL)) {
        await You('are already wearing that!');
        return ECMD_OK;
    }

    if (armor) {
        mask = await canwearobj(obj, true);
        if (!mask)
            return ECMD_OK;
    } else if (ring) {
        if (nolimbs(game.youmonst.data)) {
            await You('cannot make the ring stick to your body.');
            return ECMD_OK;
        }
        const uleft = worn(W_RINGL), uright = worn(W_RINGR);
        if (uleft && uright) {
            await pline('There are no more ring-fingers to fill.');
            return ECMD_OK;
        }
        if (uleft) {
            mask = W_RINGR;
        } else if (uright) {
            mask = W_RINGL;
        } else {
            for (;;) {
                const answer = await tty_yn_function(
                    'Which ring-finger, Right or Left?', 'rl', '\0');
                if (answer === '\0' || answer === '\x1b')
                    return ECMD_OK;
                if (answer === 'l' || answer === 'L') { mask = W_RINGL; break; }
                if (answer === 'r' || answer === 'R') { mask = W_RINGR; break; }
            }
        }
        if (worn(W_ARMG) && worn(W_ARMG).cursed) {
            note_unported_do_wear('accessory_on:cursed_gloves');
            return ECMD_OK;
        }
    } else if (amulet) {
        if (worn(W_AMUL)) {
            await You('are already wearing an amulet.');
            return ECMD_OK;
        }
    } else if (eyewear) {
        /* src/do_wear.c:2324 — has_head() is true for every current hero
           form; the ublindf conflict messages */
        const ub = worn(W_TOOL);
        if (ub) {
            if (ub.otyp === ONAMES.TOWEL)
                await Your('face is already covered by a towel.');
            else if (ub.otyp === ONAMES.BLINDFOLD)
                await You(`are already wearing ${
                    obj.otyp === ONAMES.LENSES ? 'lenses' : 'a blindfold'}.`);
            else if (ub.otyp === ONAMES.LENSES)
                await You(`are already wearing ${
                    obj.otyp === ONAMES.BLINDFOLD ? 'a blindfold'
                                                  : 'some lenses'}.`);
            return ECMD_OK;
        }
    } else {
        await You("can't wear that!");
        return ECMD_OK;
    }

    /* retouch_object(): silver/artifact touch effects; nothing reachable */

    if (armor) {
        setworn(obj, mask);
        let afternmv = null;
        if (mask === W_ARM) afternmv = Armor_on;
        else if (mask === W_ARMC) afternmv = Cloak_on;
        else if (mask === W_ARMH) afternmv = Helmet_on;
        else if (mask === W_ARMG) afternmv = Gloves_on;
        else if (mask === W_ARMF) afternmv = Boots_on;
        else if (mask === W_ARMS) afternmv = Shield_on;
        else if (mask === W_ARMU) afternmv = Shirt_on;

        const delay = -(objects[obj.otyp].oc_delay || 0);
        if (delay) {
            game.afternmv = afternmv;
            nomul(delay);
            game.multi_reason = 'dressing up';
            game.nomovemsg = 'You finish your dressing maneuver.';
        } else {
            game.afternmv = afternmv;
            await unmul('');
            await on_msg(obj);
        }
    } else if (ring) {
        setworn(obj, mask);
        await Ring_on(obj);
        await on_msg(obj);
    } else if (amulet) {
        await Amulet_on(obj);
    } else if (eyewear) {
        await Blindf_on(obj);
    }
    return ECMD_TIME;
}

// src/do_wear.c:1461 Blindf_on() — wear a blindfold/towel/lenses. The
// wielded-release, ball&chain and Eyes-of-the-Overworld arms need absent
// state; the blindness toggle itself is the live path.
async function toggle_blindness() {
    (game.disp ||= {}).botl = true;
    game.vision_full_recalc = 1;
    const { vision_recalc } = await import('./vision.js');
    vision_recalc(0);
}

export async function Blindf_on(otmp) {
    const already_blind = !!game.u.ublind;

    setworn(otmp, W_TOOL);
    await on_msg(otmp);

    /* Blind: the blindfold's W_TOOL wear makes the hero blind */
    if (otmp.otyp === ONAMES.BLINDFOLD || otmp.otyp === ONAMES.TOWEL)
        game.u.ublind = 1;

    if (game.u.ublind && !already_blind) {
        if (game.flags?.verbose)
            await You_cant('see any more.');
        await toggle_blindness();
    } else if (already_blind && !game.u.ublind) {
        await You('can see!');
        await toggle_blindness();
    }
}

// src/do_wear.c:1893 cursed() — check if something worn is cursed _and_
// unremovable; prints the refusal and learns bknown.
export async function cursed(otmp) {
    const uwep = worn(W_WEP);
    if ((otmp === uwep) ? welded(otmp) : !!otmp.cursed) {
        const use_plural = is_boots(otmp) || is_gloves(otmp)
                           || otmp.otyp === ONAMES.LENSES || otmp.quan > 1;
        /* Glib (slippery fingers) arm omitted: Glib is not tracked yet */
        await You(`can't.  ${use_plural ? 'They are' : 'It is'} cursed.`);
        otmp.bknown = 1;
        return 1;
    }
    return 0;
}

// src/do_wear.c:2696 select_off() — vet removal and accumulate the takeoff
// mask; a refusal prints its reason and leaves the mask empty.
async function select_off(otmp) {
    if (!otmp) return 0;
    const uwep = worn(W_WEP), uarmg = worn(W_ARMG), uarmc = worn(W_ARMC),
          uarm = worn(W_ARM);
    const uleft = worn(W_RINGL), uright = worn(W_RINGR);
    if (!game.context_takeoff) game.context_takeoff = { mask: 0 };

    /* special ring checks; RING_ON_PRIMARY is the right hand (righty) */
    if (otmp === uright || otmp === uleft) {
        let buf = null, why = null;
        if (welded(uwep) && (otmp === uright || bimanual(uwep))) {
            buf = 'free a weapon hand';
            why = uwep;
        } else if (uarmg && uarmg.cursed) {
            buf = `take off your ${gloves_simple_name(uarmg)}`;
            why = uarmg;
        }
        if (why) {
            await You(`cannot ${buf} to remove the ring.`);
            why.bknown = 1;
            return 0;
        }
    }
    /* special glove checks */
    if (otmp === uarmg) {
        if (welded(uwep)) {
            await You('are unable to take off your gloves'
                      + ` while wielding that ${is_sword(uwep) ? 'sword' : 'weapon'}.`);
            uwep.bknown = 1;
            return 0;
        }
        /* Glib arm and better_not_take_that_off (stoning-corpse paranoia
           prompt) omitted: Glib and that prompt are not tracked yet */
    }
    /* special boot checks */
    if (otmp === worn(W_ARMF)) {
        if (game.u.utrap && game.u.utraptype === TT_BEARTRAP) {
            await pline('The bear trap prevents you from pulling your foot out.');
            return 0;
        } else if (game.u.utrap && game.u.utraptype === TT_INFLOOR) {
            await You('are stuck in the floor, and cannot pull your feet out.');
            return 0;
        }
    }
    /* special suit and shirt checks */
    if (otmp === uarm || otmp === worn(W_ARMU)) {
        let buf = null, why = null;
        if (uarmc && uarmc.cursed) {
            buf = `remove your ${cloak_simple_name(uarmc)}`;
            why = uarmc;
        } else if (otmp === worn(W_ARMU) && uarm && uarm.cursed) {
            buf = 'remove your suit';
            why = uarm;
        } else if (welded(uwep) && bimanual(uwep)) {
            buf = `release your ${is_sword(uwep) ? 'sword' : 'weapon'}`;
            why = uwep;
        }
        if (why) {
            await You(`cannot ${buf} to take off ${the(xname(otmp))}.`);
            why.bknown = 1;
            return 0;
        }
    }
    /* basic curse check */
    if (await cursed(otmp))
        return 0;

    game.context_takeoff.mask |= otmp.owornmask
        & (W_ARM | W_ARMC | W_ARMF | W_ARMG | W_ARMH | W_ARMS | W_ARMU
           | W_RINGL | W_RINGR | W_AMUL | W_TOOL | W_WEP);
    return 0;
}

// src/do_wear.c:3016 reset_remarm()
export function reset_remarm() {
    game.context_takeoff = { mask: 0 };
}

// src/do_wear.c:76 armoroff()
async function armoroff(otmp) {
    const delay = -(objects[otmp.otyp].oc_delay || 0);

    if (await cursed(otmp))
        return 0;
    const cat = objects[otmp.otyp].oc_subtyp;
    const names = ['suit', 'shield', 'helmet', 'gloves', 'boots',
                   'cloak', 'shirt'];
    let what = names[cat] || 'armor';
    if (cat === 0) what = suit_simple_name(otmp);
    if (cat === 5) what = cloak_simple_name(otmp);
    if (cat === 2) what = helm_simple_name(otmp);

    if (delay) {
        nomul(delay);
        game.multi_reason = 'disrobing';
        game.afternmv = async () => {
            await slot_off(otmp);
        };
        game.nomovemsg = `You finish taking off your ${what}.`;
    } else {
        await slot_off(otmp);
        await off_msg(otmp);
    }
    return 1;
}

/* the per-slot *_off handlers, folded: drop the worn state and run the
   slot-specific feedback that is ported (Boots_off's speed message) */
async function slot_off(otmp) {
    const mask = otmp.owornmask
        & (W_ARM | W_ARMC | W_ARMH | W_ARMS | W_ARMG | W_ARMF | W_ARMU);
    if (otmp.owornmask & W_ARMF)
        await Boots_off(otmp);
    if (otmp.owornmask & W_ARMG) {
        await Gloves_off(otmp);
        return;
    }
    if (otmp.owornmask & W_ARM) {
        /* Armor_off clears setworn's primary property before removing the
           second property supplied by blue dragon armor. */
        setworn(null, W_ARM);
        if (otmp.otyp === ONAMES.BLUE_DRAGON_SCALES
            || otmp.otyp === ONAMES.BLUE_DRAGON_SCALE_MAIL) {
            const left = (game.u.uprops?.FAST | 0) & ~W_ARM;
            if (left)
                game.u.uprops.FAST = left;
            else if (game.u.uprops)
                delete game.u.uprops.FAST;
            const hfast = game.u.intrinsic?.HFast | 0;
            const efast = game.u.uprops?.FAST | 0;
            if (!((hfast & TIMEOUT) || efast)
                && !game.context_takeoff?.cancelled_don)
                await You('slow down.');
        }
    } else {
        setworn(null, mask); /* each C *_off handler clears its own slot */
    }
}

async function Gloves_off(otmp) {
    switch (otmp.otyp) {
    case ONAMES.GAUNTLETS_OF_POWER:
        makeknown(otmp.otyp);
        (game.disp ||= {}).botl = true;
        break;
    case ONAMES.GAUNTLETS_OF_DEXTERITY:
        if (!game.context_takeoff?.cancelled_don && otmp.spe) {
            makeknown(otmp.otyp);
            game.u.abon.a[A_DEX] -= otmp.spe;
        }
        (game.disp ||= {}).botl = true;
        break;
    case ONAMES.GAUNTLETS_OF_FUMBLING: {
        const oldprop = (game.u.uprops?.FUMBLING || 0) & ~WORN_GLOVES;
        const intrinsic = (game.u.intrinsic ||= {});
        if (!oldprop && !((intrinsic.HFumbling || 0) & ~TIMEOUT)) {
            intrinsic.HFumbling = 0;
            if (game.u.uprops)
                delete game.u.uprops.FUMBLING;
        }
        break;
    }
    }
    setworn(null, W_ARMG);
    await encumber_msg();
}

// src/do_wear.c:1771 armor_or_accessory_off()
export async function armor_or_accessory_off(obj) {
    if (!(obj.owornmask & (W_ARM | W_ARMC | W_ARMH | W_ARMS | W_ARMG | W_ARMF
                           | W_ARMU | W_RINGL | W_RINGR | W_AMUL | W_TOOL))) {
        await You('are not wearing that.');
        return ECMD_OK;
    }
    const uarm = worn(W_ARM), uarmc = worn(W_ARMC), uarmu = worn(W_ARMU);
    if ((obj === uarm && uarmc) || (obj === uarmu && (uarmc || uarm))) {
        let what = '';
        if (uarmc) what += cloak_simple_name(uarmc);
        if (obj === uarmu && uarm) {
            if (uarmc) what += ' and ';
            what += 'suit';
        }
        await You(`can't take that off without taking off your ${what} first.`);
        return ECMD_OK;
    }

    reset_remarm(); /* clear context.takeoff.mask */
    await select_off(obj);
    if (!game.context_takeoff.mask)
        return ECMD_OK;
    /* none of armoroff()/Ring_/Amulet/Blindf_off() use context.takeoff.mask */
    reset_remarm();

    if (obj.owornmask & (W_ARM | W_ARMC | W_ARMH | W_ARMS | W_ARMG | W_ARMF
                         | W_ARMU)) {
        await armoroff(obj);
    } else if (obj.owornmask & (W_RINGL | W_RINGR)) {
        await off_msg(obj);
        await Ring_off(obj);
    } else if (obj.owornmask & W_AMUL) {
        await Amulet_off();
    } else if (obj.owornmask & W_TOOL) {
        await Blindf_off(obj);
    }
    return ECMD_TIME;
}

// src/do_wear.c:1495 Blindf_off()
export async function Blindf_off(otmp) {
    const was_blind = !!game.u.ublind;

    setworn(null, W_TOOL);   /* src/do_wear.c Blindf_off */
    await off_msg(otmp);

    if (otmp.otyp === ONAMES.BLINDFOLD || otmp.otyp === ONAMES.TOWEL)
        game.u.ublind = 0;

    if (game.u.ublind) {
        if (was_blind) {
            if (otmp.otyp !== ONAMES.LENSES)
                await You('still cannot see.');
        } else {
            await You_cant('see anything now!');
        }
        await toggle_blindness();
    } else if (was_blind) {
        /* gulp_blnd_check() needs the engulfed state; absent */
        await You('can see again.');
        await toggle_blindness();
    }
}

/* src/do_wear.c:1733 count_worn_stuff() */
function count_worn_stuff(all) {
    let armor = 0, accessories = 0, otmp = null;
    for (const mask of [W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF,
                        W_ARMU]) {
        const o = worn(mask);
        if (o) { armor++; if (!otmp) otmp = o; }
    }
    /* MOREWORN skips cloaked suit/shirt for the pick, but count includes
       only ACCESSIBLE armor; C: uarm counted only if !uarmc, uarmu only if
       !uarm && !uarmc */
    const uarm = worn(W_ARM), uarmc = worn(W_ARMC), uarmu = worn(W_ARMU);
    armor = 0; otmp = null;
    for (const [mask, blocked] of [[W_ARMH, false], [W_ARMS, false],
                                   [W_ARMG, false], [W_ARMF, false],
                                   [W_ARMC, false],
                                   [W_ARM, !!uarmc],
                                   [W_ARMU, !!(uarm || uarmc)]]) {
        const o = worn(mask);
        if (o && !blocked) { armor++; otmp = o; }
    }
    let accessory = null;
    for (const mask of [W_RINGL, W_RINGR, W_AMUL, W_TOOL]) {
        const o = worn(mask);
        if (o) {
            accessories++;
            accessory = o;
        }
    }
    return { armor, accessories, otmp: all ? accessory : otmp };
}

// src/do_wear.c:1833 dotakeoff() — the 'T' command.
export async function dotakeoff() {
    const { getobj } = await import('./invent.js');
    const { takeoff_ok } = await import('./cmd.js');
    const { armor, accessories, otmp } = count_worn_stuff(false);
    if (!armor && !accessories) {
        await pline('Not wearing any armor or accessories.');
        return ECMD_OK;
    }
    let pick = otmp;
    if (armor !== 1) {
        pick = await getobj('take off', takeoff_ok, 0);
        if (!pick)
            return ECMD_OK; /* ECMD_CANCEL */
    }
    return await armor_or_accessory_off(pick);
}

// src/do_wear.c:1874 doremring() — the 'R' command.
export async function doremring() {
    const { getobj } = await import('./invent.js');
    const { remove_ok } = await import('./cmd.js');
    const { armor, accessories, otmp } = count_worn_stuff(true);
    if (!accessories && !armor) {
        await pline('Not wearing any accessories or armor.');
        return ECMD_OK;
    }
    let pick = accessories === 1 ? otmp : null;
    if (!pick) {
        pick = await getobj('remove', remove_ok, 0);
        if (!pick)
            return ECMD_OK;
    }
    return await armor_or_accessory_off(pick);
}

// src/do_wear.c:2432 dowear() — the 'W' command.
export async function dowear() {
    if (verysmall(game.youmonst.data) || nohands(game.youmonst.data)) {
        await pline("Don't even bother.");
        return ECMD_OK;
    }
    const { getobj } = await import('./invent.js');
    const { wear_ok } = await import('./cmd.js');
    const otmp = await getobj('wear', wear_ok, 0);
    return otmp ? await accessory_or_armor_on(otmp) : ECMD_OK;
}

// src/do_wear.c:2454 doputon() — the 'P' command.
export async function doputon() {
    const { getobj } = await import('./invent.js');
    const { puton_ok } = await import('./cmd.js');
    const otmp = await getobj('put on', puton_ok, 0);
    return otmp ? await accessory_or_armor_on(otmp) : ECMD_OK;
}

// src/do_wear.c:3259 obj_erode_type() — which erosion applies to obj.
export function obj_erode_type(otmp) {
    if (is_flammable(otmp))
        return ERODE_BURN;
    else if (is_rustprone(otmp))
        return ERODE_RUST;
    else if (is_crackable(otmp))
        return ERODE_CRACK;
    else if (is_rottable(otmp))
        return ERODE_ROT;
    else if (is_corrodeable(otmp))
        return ERODE_CORRODE;
    return ERODE_NONE;
}

// src/do_wear.c:3277 destroy_arm() — erode rn2(4)+1 random worn armor
// pieces; a piece hit at max erosion is destroyed.
export async function destroy_arm() {
    const armors = [];
    const hits = rn2(4) + 1;
    let ret = 0;

    /* gather worn armor in C's uarm..uarmu order; include non-erodeable */
    for (const mask of [W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF,
                        W_ARMU]) {
        const otmp = (game.invent || [])
            .find(o => ((o.owornmask ?? 0) & mask) !== 0);
        if (otmp)
            armors.push(otmp);
    }
    if (!armors.length)
        return 0;

    for (let i = 0; i < hits; i++) {
        const otmp = armors[rn2(armors.length)];

        if (erosion_matters(otmp, game.objects) && is_damageable(otmp)
            && !otmp.oerodeproof) {
            const erosion = obj_erode_type(otmp);

            if (erosion !== ERODE_NONE) {
                const r = await erode_obj(otmp, xname(otmp), erosion,
                                          EF_PAY | EF_DESTROY);
                if (r !== ER_NOTHING)
                    ret = 1;
                if (r === ER_DESTROYED)
                    break;
            }
        }
    }

    if (ret)
        await stop_occupation();
    return ret;
}

// src/do_wear.c:568 hard_helmet() — hard helms provide better protection
// against falling rocks.
export function hard_helmet(obj) {
    if (!obj || !is_helmet(obj))
        return false;
    return (is_metallic(obj) || is_crackable(obj)) ? true : false;
}
