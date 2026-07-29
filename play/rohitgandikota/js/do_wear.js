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
import { W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU,
         W_RINGL, W_RINGR, W_AMUL, AC_MAX, ECMD_TIME } from './const.js';
import { sgn } from './hacklib.js';
import { pline } from './display.js';
import { You, You_feel } from './pline.js';
import { an, xname, doname } from './objnam.js';
import { makeknown } from './o_init.js';
import { prinv, update_inventory, ECMD_OK } from './invent.js';
import { nomul, unmul } from './hack.js';
import { tty_yn_function } from './tty/topl.js';

const OCLASSES_ARMOR = OCLASSES.ARMOR_CLASS;
const OCLASSES_RING = OCLASSES.RING_CLASS;
const OCLASSES_AMULET = OCLASSES.AMULET_CLASS;

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

/* ---- the wear/take-off command layer (src/do_wear.c:1729-2489) ---- */

/* include/objclass.h armour categories via oc_subtyp */
const is_suit   = (o) => objects[o.otyp].oc_subtyp === 0; /* ARM_SUIT */
const is_shield = (o) => objects[o.otyp].oc_subtyp === 1;
const is_helmet = (o) => objects[o.otyp].oc_subtyp === 2;
const is_gloves = (o) => objects[o.otyp].oc_subtyp === 3;
const is_boots  = (o) => objects[o.otyp].oc_subtyp === 4;
const is_cloak  = (o) => objects[o.otyp].oc_subtyp === 5;
const is_shirt  = (o) => objects[o.otyp].oc_subtyp === 6;

/* src/worn.c setworn()/setnotworn(), reduced to the fields this port keeps:
   the object's owornmask, its oc_oprop as a uprops flag, and the AC. */
export function setworn(obj, mask) {
    const old = worn(mask);
    if (old && old !== obj) {
        old.owornmask &= ~mask;
        remove_worn_oprop(old);
    }
    if (obj) {
        obj.owornmask = (obj.owornmask || 0) | mask;
        apply_worn_oprop(obj);
    }
    find_ac();
    update_inventory();
}

function setnotworn(obj, mask) {
    if (!obj) return;
    obj.owornmask &= ~mask;
    remove_worn_oprop(obj);
    find_ac();
    update_inventory();
}

/* undo apply_worn_oprop; a single boolean flag stands in for C's extrinsic
   mask, which is exact while only one worn item grants a property */
function remove_worn_oprop(o) {
    const p = o ? objects[o.otyp].oc_oprop : 0;
    if (p && PROP_KEYS[p] && game.u.uprops)
        delete game.u.uprops[PROP_KEYS[p]];
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
    case ONAMES.FUMBLE_BOOTS:
    case ONAMES.LEVITATION_BOOTS:
    default:
        note_unported_do_wear(`Boots_on:otyp=${uarmf.otyp}`);
        break;
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
    switch (amul.otyp) {
    case ONAMES.AMULET_OF_ESP:
    case ONAMES.AMULET_OF_LIFE_SAVING:
    case ONAMES.AMULET_VERSUS_POISON:
    case ONAMES.AMULET_OF_REFLECTION:
    case ONAMES.FAKE_AMULET_OF_YENDOR:
        break;
    default:
        note_unported_do_wear(`Amulet_on:otyp=${amul.otyp}`);
        break;
    }
    await on_msg(amul);
}

// src/do_wear.c:1030 Amulet_off() — does its own off_msg.
async function Amulet_off() {
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
    setnotworn(uamul, W_AMUL);
}

// src/do_wear.c Ring_on()/Ring_off() — only the property grant and the
// makeknown-adjacent arms that never draw are live; everything else records.
async function Ring_on(obj) {
    switch (obj.otyp) {
    case ONAMES.RIN_ADORNMENT:
    case ONAMES.RIN_STEALTH:
    case ONAMES.RIN_SUSTAIN_ABILITY:
    case ONAMES.RIN_WARNING:
    case ONAMES.RIN_PROTECTION:
        break;
    default:
        note_unported_do_wear(`Ring_on:otyp=${obj.otyp}`);
        break;
    }
}

async function Ring_off(obj) {
    setnotworn(obj, obj.owornmask & (W_RINGL | W_RINGR));
    note_unported_do_wear(`Ring_off:otyp=${obj.otyp}`);
}

// src/do_wear.c:2030 canwearobj() — find the slot; refuse with C's message
// when it is taken. The polymorph, trap and welded-weapon arms record.
export async function canwearobj(otmp, noisy) {
    const already_wearing = async (cc) => {
        if (noisy) await You(`are already wearing ${cc}.`);
    };
    if (otmp.owornmask & (W_ARM | W_ARMC | W_ARMH | W_ARMS | W_ARMG
                          | W_ARMF | W_ARMU)) {
        await already_wearing('that');
        return 0;
    }
    if (is_helmet(otmp)) {
        const uarmh = worn(W_ARMH);
        if (uarmh) {
            await already_wearing(an(helm_simple_name(uarmh)));
            return 0;
        }
        return W_ARMH;
    } else if (is_shield(otmp)) {
        const uarms = worn(W_ARMS);
        if (uarms) { await already_wearing('a shield'); return 0; }
        if (game.u.uwep && bimanual_obj(game.u.uwep)) {
            if (noisy)
                await You('cannot wear a shield while wielding a two-handed '
                    + 'weapon.');
            return 0;
        }
        return W_ARMS;
    } else if (is_boots(otmp)) {
        const uarmf = worn(W_ARMF);
        if (uarmf) { await already_wearing('boots'); return 0; }
        if (game.u.utrap) {
            note_unported_do_wear('canwearobj:boots_trapped');
            return 0;
        }
        return W_ARMF;
    } else if (is_gloves(otmp)) {
        const uarmg = worn(W_ARMG);
        if (uarmg) { await already_wearing('gloves'); return 0; }
        return W_ARMG;
    } else if (is_shirt(otmp)) {
        const uarm = worn(W_ARM), uarmc = worn(W_ARMC), uarmu = worn(W_ARMU);
        if (uarm || uarmc || uarmu) {
            if (uarmu) {
                await already_wearing('a shirt');
            } else if (noisy) {
                await You(`can't wear that over your ${
                    (uarm && !uarmc) ? 'armor'
                    : cloak_simple_name(uarmc)}.`);
            }
            return 0;
        }
        return W_ARMU;
    } else if (is_cloak(otmp)) {
        const uarmc = worn(W_ARMC);
        if (uarmc) {
            await already_wearing(an(cloak_simple_name(uarmc)));
            return 0;
        }
        return W_ARMC;
    } else if (is_suit(otmp)) {
        const uarmc = worn(W_ARMC);
        if (uarmc) {
            if (noisy)
                await You(`cannot wear armor over a ${
                    cloak_simple_name(uarmc)}.`);
            return 0;
        }
        if (worn(W_ARM)) { await already_wearing('some armor'); return 0; }
        return W_ARM;
    }
    if (noisy)
        note_unported_do_wear(`canwearobj:otyp=${otmp.otyp}`);
    return 0;
}

/* include/obj.h bimanual() needs both hands */
function bimanual_obj(o) {
    return objects[o.otyp].oc_bimanual
        || (objects[o.otyp].oc_class === 2 /* WEAPON */
            && objects[o.otyp].oc_big);
}

function helm_simple_name(h) {
    /* "hat" for flimsy headgear, else "helmet" */
    return objects[h.otyp].oc_material <= 3 ? 'hat' : 'helmet';
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
        await You('are already wearing that.');
        return ECMD_OK;
    }

    if (armor) {
        mask = await canwearobj(obj, true);
        if (!mask)
            return ECMD_OK;
    } else if (ring) {
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
        note_unported_do_wear('accessory_on:eyewear');
        return ECMD_OK;
    } else {
        await You("can't wear that!");
        return ECMD_OK;
    }

    /* retouch_object(): silver/artifact touch effects; nothing reachable */

    if (armor) {
        setworn(obj, mask);
        let afternmv = null;
        if (mask === W_ARM) afternmv = Armor_on;
        else if (mask === W_ARMF) afternmv = Boots_on;
        /* the other slots' handlers reduce to their property grant, which
           setworn has already applied */

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
    }
    return ECMD_TIME;
}

// src/do_wear.c:76 armoroff()
async function armoroff(otmp) {
    const delay = -(objects[otmp.otyp].oc_delay || 0);

    if (otmp.cursed) {
        /* cursed(): "You can't.  It is cursed." and learn it */
        otmp.bknown = 1;
        await You("can't.  It is cursed.");
        return 0;
    }
    const cat = objects[otmp.otyp].oc_subtyp;
    const names = ['suit', 'shield', 'helmet', 'gloves', 'boots',
                   'cloak', 'shirt'];
    let what = names[cat] || 'armor';
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
    setnotworn(otmp, mask);
}

// src/do_wear.c:1771 armor_or_accessory_off()
export async function armor_or_accessory_off(obj) {
    if (!(obj.owornmask & (W_ARM | W_ARMC | W_ARMH | W_ARMS | W_ARMG | W_ARMF
                           | W_ARMU | W_RINGL | W_RINGR | W_AMUL))) {
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

    /* select_off() cursed checks: a cursed item refuses in armoroff/its
       accessory arm below */
    if (obj.owornmask & (W_ARM | W_ARMC | W_ARMH | W_ARMS | W_ARMG | W_ARMF
                         | W_ARMU)) {
        await armoroff(obj);
    } else if (obj.owornmask & (W_RINGL | W_RINGR)) {
        if (obj.cursed) {
            obj.bknown = 1;
            await You("can't.  It is cursed.");
            return ECMD_TIME;
        }
        await off_msg(obj);
        await Ring_off(obj);
    } else if (obj.owornmask & W_AMUL) {
        if (obj.cursed) {
            obj.bknown = 1;
            await You("can't.  It is cursed.");
            return ECMD_TIME;
        }
        await Amulet_off();
    }
    return ECMD_TIME;
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
    for (const mask of [W_RINGL, W_RINGR, W_AMUL]) {
        if (worn(mask)) accessories++;
    }
    return { armor, accessories, otmp };
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
    const { armor, accessories } = count_worn_stuff(true);
    if (!accessories && !armor) {
        await pline('Not wearing any accessories or armor.');
        return ECMD_OK;
    }
    let pick = null;
    const rings = [worn(W_RINGL), worn(W_RINGR), worn(W_AMUL)]
        .filter(Boolean);
    if (accessories === 1 && !armor)
        pick = rings[0];
    if (!pick) {
        pick = await getobj('remove', remove_ok, 0);
        if (!pick)
            return ECMD_OK;
    }
    return await armor_or_accessory_off(pick);
}

// src/do_wear.c:2432 dowear() — the 'W' command.
export async function dowear() {
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
