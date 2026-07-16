// do_wear.js — Wear / take-off / put-on (partial).
// C ref: do_wear.c — dowear, doputon, canwearobj, accessory_or_armor_on,
// Amulet_on, Armor_on, dotakeoff, armor_or_accessory_off, armoroff, *_off.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, flush_topl_more, pline } from './display.js';
import { yn_function } from './getline.js';
import { an, doname, the, xname, xprname } from './objnam.js';
import { find_ac } from './u_init.js';
import { change_luck } from './attrib.js';
import { nomul, unmul, stop_occupation } from './hack.js';
import { retouch_object } from './artifact.js';
import {
    W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU, W_ARMOR,
    W_RING, W_RINGL, W_RINGR, W_AMUL, W_TOOL, W_WEAPONS, W_WEP, W_SWAPWEP,
    W_QUIVER, LEFT_RING, RIGHT_RING,
    ERODE_BURN, ERODE_RUST, ERODE_ROT, ERODE_CORRODE, ERODE_CRACK, ERODE_NONE,
    ER_NOTHING, ER_DESTROYED, EF_PAY, EF_DESTROY,
} from './const.js';
import {
    ARMOR_CLASS, RING_CLASS, AMULET_CLASS,
    objectNames, objectNameStrs,
} from './objects.js';
import { PM_ARCHEOLOGIST } from './monsters.js';
import {
    is_flammable, is_rustprone, is_rottable, is_corrodeable, is_crackable,
    erosion_matters, is_damageable,
} from './mkobj.js';
import { erode_obj } from './trap.js';
import { rn2 } from './rng.js';

const FEDORA = objectNames.indexOf('FEDORA');
const MEAT_RING = objectNames.indexOf('MEAT_RING');
const BLINDFOLD = objectNames.indexOf('BLINDFOLD');
const TOWEL = objectNames.indexOf('TOWEL');
const LENSES = objectNames.indexOf('LENSES');
const AMULET_OF_ESP = objectNames.indexOf('AMULET_OF_ESP');
const AMULET_OF_LIFE_SAVING = objectNames.indexOf('AMULET_OF_LIFE_SAVING');
const AMULET_VERSUS_POISON = objectNames.indexOf('AMULET_VERSUS_POISON');
const AMULET_OF_REFLECTION = objectNames.indexOf('AMULET_OF_REFLECTION');
const FAKE_AMULET_OF_YENDOR = objectNames.indexOf('FAKE_AMULET_OF_YENDOR');
const AMULET_OF_YENDOR = objectNames.indexOf('AMULET_OF_YENDOR');
const AMULET_OF_UNCHANGING = objectNames.indexOf('AMULET_OF_UNCHANGING');
const AMULET_OF_GUARDING = objectNames.indexOf('AMULET_OF_GUARDING');

// C ref: objclass.h ARM_* — oc_skill / oc_subtyp / oc_armcat
const ARM_SUIT = 0;
const ARM_SHIELD = 1;
const ARM_HELM = 2;
const ARM_GLOVES = 3;
const ARM_BOOTS = 4;
const ARM_CLOAK = 5;
const ARM_SHIRT = 6;

const W_ACCESSORY = W_RING | W_AMUL | W_TOOL;

let Narmorpieces = 0;
let Naccessories = 0;

function armcat(obj) {
    return game.objects?.[obj?.otyp]?.oc_skill ?? -1;
}

function is_shirt(obj) {
    return obj?.oclass === ARMOR_CLASS && armcat(obj) === ARM_SHIRT;
}
function is_suit(obj) {
    return obj?.oclass === ARMOR_CLASS && armcat(obj) === ARM_SUIT;
}
function is_cloak(obj) {
    return obj?.oclass === ARMOR_CLASS && armcat(obj) === ARM_CLOAK;
}
function is_shield(obj) {
    return obj?.oclass === ARMOR_CLASS && armcat(obj) === ARM_SHIELD;
}
function is_helmet(obj) {
    return obj?.oclass === ARMOR_CLASS && armcat(obj) === ARM_HELM;
}
function is_gloves(obj) {
    return obj?.oclass === ARMOR_CLASS && armcat(obj) === ARM_GLOVES;
}
function is_boots(obj) {
    return obj?.oclass === ARMOR_CLASS && armcat(obj) === ARM_BOOTS;
}

/** C ref: do_wear.c off_msg */
async function off_msg(otmp) {
    if (game.flags?.verbose !== false) {
        await pline(`You were wearing ${doname(otmp)}.`);
    }
}

/** C ref: invent.c prinv(NULL, otmp, 0) — "ilet - doname." via xprname(dot) */
async function prinv(otmp) {
    await pline(xprname(otmp, undefined, true));
}

/**
 * C ref: objnam.c obj_is_pname — artifact + oname; full ID required unless
 * gameover/override_ID. Named omit: not_fully_identified detail / iflags.
 */
function obj_is_pname(obj) {
    if (!obj?.oartifact || !obj.oextra?.oname) return false;
    // C: !gameover && !override_ID → require fully identified
    if (obj.known && obj.dknown && obj.bknown) return true;
    return false;
}

/** C ref: do_wear.c on_msg — rings/amulets use prinv; armor uses verbose You(). */
async function on_msg(otmp) {
    if ((otmp.owornmask || 0) & (W_RING | W_AMUL)) {
        await prinv(otmp);
        return;
    }
    if (((otmp.owornmask || 0) & W_TOOL) && game.flags?.verbose === false) {
        await prinv(otmp);
        return;
    }
    if (game.flags?.verbose !== false) {
        // C: xname before obj_is_pname (formatting may set dknown)
        const otmp_name = xname(otmp);
        let how = '';
        if (otmp.otyp === TOWEL) {
            // C: body_part(HEAD); human "head" — poly deferred
            how = ' around your head';
        }
        const named = obj_is_pname(otmp) ? the(otmp_name) : an(otmp_name);
        await pline(`You are now wearing ${named}${how}.`);
    }
}

/** C ref: do_wear.c already_wearing */
async function already_wearing(cc) {
    const punct = cc === 'that' ? '!' : '.';
    await pline(`You are already wearing ${cc}${punct}`);
}

/** C ref: do_wear.c cursed — message + bknown when stuck */
function cursed_check(otmp) {
    if (!otmp) return false;
    if (otmp.cursed) {
        const plural = (otmp.quan || 1) > 1;
        game._cursed_takeoff_msg = plural
            ? "You can't.  They are cursed."
            : "You can't.  It is cursed.";
        otmp.bknown = 1;
        return true;
    }
    return false;
}

/**
 * C ref: do_wear.c count_worn_stuff
 * @returns {object|null} default single piece when count is 1
 */
function count_worn_stuff(accessorizing) {
    const u = game.u || {};
    Narmorpieces = 0;
    Naccessories = 0;
    let otmp = null;

    const moreArmor = (x) => {
        if (x) {
            Narmorpieces++;
            otmp = x;
        }
    };
    moreArmor(u.uarmh);
    moreArmor(u.uarms);
    moreArmor(u.uarmg);
    moreArmor(u.uarmf);
    // outermost body layer only
    if (u.uarmc) moreArmor(u.uarmc);
    else if (u.uarm) moreArmor(u.uarm);
    else if (u.uarmu) moreArmor(u.uarmu);

    let armorDefault = accessorizing ? null : otmp;

    otmp = null;
    const moreAcc = (x) => {
        if (x) {
            Naccessories++;
            otmp = x;
        }
    };
    moreAcc(u.uleft);
    moreAcc(u.uright);
    moreAcc(u.uamul);
    moreAcc(u.ublindf);

    return accessorizing ? otmp : armorDefault;
}

/**
 * C ref: worn.c setworn — slot pointer + owornmask; prop/oc_oprop deferred.
 * @param {object|null} obj
 * @param {number} mask
 */
export function setworn(obj, mask) {
    const u = game.u || (game.u = {});
    const clearOne = (slot, bit) => {
        if (!(mask & bit)) return;
        const old = u[slot];
        if (old) old.owornmask = (old.owornmask || 0) & ~bit;
        u[slot] = null;
    };

    if (!obj) {
        clearOne('uarm', W_ARM);
        clearOne('uarmc', W_ARMC);
        clearOne('uarmh', W_ARMH);
        clearOne('uarms', W_ARMS);
        clearOne('uarmg', W_ARMG);
        clearOne('uarmf', W_ARMF);
        clearOne('uarmu', W_ARMU);
        if (mask & W_RING) {
            // caller clears specific left/right; both bits share W_RING in takeoff
            if (mask === W_RING || (mask & W_RING) === W_RING) {
                clearOne('uleft', W_RING);
                clearOne('uright', W_RING);
            }
        }
        clearOne('uamul', W_AMUL);
        clearOne('ublindf', W_TOOL);
        find_ac();
        return;
    }

    // Place into the matching armor/accessory slot for this mask.
    if (mask & W_ARM) {
        clearOne('uarm', W_ARM);
        obj.owornmask = (obj.owornmask || 0) | W_ARM;
        u.uarm = obj;
    } else if (mask & W_ARMC) {
        clearOne('uarmc', W_ARMC);
        obj.owornmask = (obj.owornmask || 0) | W_ARMC;
        u.uarmc = obj;
    } else if (mask & W_ARMH) {
        clearOne('uarmh', W_ARMH);
        obj.owornmask = (obj.owornmask || 0) | W_ARMH;
        u.uarmh = obj;
    } else if (mask & W_ARMS) {
        clearOne('uarms', W_ARMS);
        obj.owornmask = (obj.owornmask || 0) | W_ARMS;
        u.uarms = obj;
    } else if (mask & W_ARMG) {
        clearOne('uarmg', W_ARMG);
        obj.owornmask = (obj.owornmask || 0) | W_ARMG;
        u.uarmg = obj;
    } else if (mask & W_ARMF) {
        clearOne('uarmf', W_ARMF);
        obj.owornmask = (obj.owornmask || 0) | W_ARMF;
        u.uarmf = obj;
    } else if (mask & W_ARMU) {
        clearOne('uarmu', W_ARMU);
        obj.owornmask = (obj.owornmask || 0) | W_ARMU;
        u.uarmu = obj;
    } else if (mask & W_AMUL) {
        clearOne('uamul', W_AMUL);
        obj.owornmask = (obj.owornmask || 0) | W_AMUL;
        u.uamul = obj;
    } else if (mask & W_RINGL) {
        clearOne('uleft', W_RINGL);
        obj.owornmask = (obj.owornmask || 0) | W_RINGL;
        u.uleft = obj;
    } else if (mask & W_RINGR) {
        clearOne('uright', W_RINGR);
        obj.owornmask = (obj.owornmask || 0) | W_RINGR;
        u.uright = obj;
    } else if (mask & W_TOOL) {
        clearOne('ublindf', W_TOOL);
        obj.owornmask = (obj.owornmask || 0) | W_TOOL;
        u.ublindf = obj;
    }
    find_ac();
}

/**
 * C ref: worn.c remove_worn_item — clear weapon/quiver wear before accessory don.
 * Full prop/artifact/light paths deferred.
 */
function remove_worn_item(obj) {
    if (!obj) return;
    const u = game.u || {};
    const mask = obj.owornmask || 0;
    if (mask & W_WEP) {
        if (u.uwep === obj) u.uwep = null;
        obj.owornmask &= ~W_WEP;
    }
    if (mask & W_SWAPWEP) {
        if (u.uswapwep === obj) u.uswapwep = null;
        obj.owornmask &= ~W_SWAPWEP;
    }
    if (mask & W_QUIVER) {
        if (u.uquiver === obj) u.uquiver = null;
        obj.owornmask &= ~W_QUIVER;
    }
}

/** Clear a worn slot (C setworn(NULL, mask) subset). */
function clear_worn(mask) {
    setworn(null, mask);
}

/** C ref: do_wear.c Armor_off — suit; dragon/arti deferred */
function Armor_off() {
    clear_worn(W_ARM);
    return 0;
}

/** C ref: do_wear.c Helmet_off — fedora luck; other magic helms deferred */
function Helmet_off() {
    const u = game.u || {};
    const helm = u.uarmh;
    if (helm && helm.otyp === FEDORA && game.urole?.mnum === PM_ARCHEOLOGIST) {
        change_luck(-1);
    }
    clear_worn(W_ARMH);
    return 0;
}

function Cloak_off() {
    clear_worn(W_ARMC);
    return 0;
}
function Shield_off() {
    clear_worn(W_ARMS);
    return 0;
}
function Gloves_off() {
    clear_worn(W_ARMG);
    return 0;
}
function Boots_off() {
    clear_worn(W_ARMF);
    return 0;
}
function Shirt_off() {
    clear_worn(W_ARMU);
    return 0;
}

/**
 * C ref: do_wear.c Armor_on — known + dragon handling deferred beyond AC.
 * Reflection/etc from oc_oprop via setworn still deferred.
 */
async function Armor_on() {
    const uarm = game.u?.uarm;
    if (!uarm) return 0;
    if (!uarm.known) {
        uarm.known = 1;
    }
    // dragon_armor_handling / artifact_light deferred
    find_ac();
    return 0;
}

async function Helmet_on() {
    const h = game.u?.uarmh;
    if (h && !h.known) h.known = 1;
    if (h && h.otyp === FEDORA && game.urole?.mnum === PM_ARCHEOLOGIST) {
        change_luck(1);
    }
    find_ac();
    return 0;
}
async function Cloak_on() {
    const o = game.u?.uarmc;
    if (o && !o.known) o.known = 1;
    find_ac();
    return 0;
}
async function Shield_on() {
    const o = game.u?.uarms;
    if (o && !o.known) o.known = 1;
    find_ac();
    return 0;
}
async function Gloves_on() {
    const o = game.u?.uarmg;
    if (o && !o.known) o.known = 1;
    find_ac();
    return 0;
}
async function Boots_on() {
    const o = game.u?.uarmf;
    if (o && !o.known) o.known = 1;
    find_ac();
    return 0;
}
async function Shirt_on() {
    const o = game.u?.uarmu;
    if (o && !o.known) o.known = 1;
    find_ac();
    return 0;
}

/**
 * C ref: objnam.c suit_simple_name — "mail"/"jacket"/"suit" (dragon deferred).
 */
function suit_simple_name(suit) {
    if (!suit) return 'suit';
    const suitnm = objectNameStrs[suit.otyp] || '';
    if (suitnm.length > 5 && suitnm.endsWith(' mail')) return 'mail';
    if (suitnm.length > 7 && suitnm.endsWith(' jacket')) return 'jacket';
    return 'suit';
}

/** C ref: objnam.c cloak/helm/gloves/boots/shield/shirt_simple_name — subset */
function armor_doff_simple_name(otmp) {
    switch (armcat(otmp)) {
        case ARM_SUIT: return suit_simple_name(otmp);
        case ARM_SHIELD: return 'shield';
        case ARM_HELM: return 'helmet'; // hard vs hat deferred
        case ARM_GLOVES: return 'gloves';
        case ARM_BOOTS: return 'boots';
        case ARM_CLOAK: return 'cloak'; // robe/smock deferred
        case ARM_SHIRT: return 'shirt';
        default: return 'armor';
    }
}

/**
 * C ref: do_wear.c armoroff — oc_delay → nomul/afternmv; else immediate *_off.
 * Returns 1 on success (ECMD_TIME caller), 0 if cursed/blocked.
 */
async function armoroff(otmp) {
    if (cursed_check(otmp)) {
        await pline(game._cursed_takeoff_msg || "You can't.  It is cursed.");
        return 0;
    }
    const delay = -(game.objects?.[otmp.otyp]?.oc_delay ?? 0);
    const cat = armcat(otmp);
    if (delay) {
        // C: nomul(-oc_delay); afternmv = *_off; nomovemsg finish taking off
        nomul(delay);
        game.multi_reason = 'disrobing';
        if (cat === ARM_SUIT) game.afternmv = Armor_off;
        else if (cat === ARM_SHIELD) game.afternmv = Shield_off;
        else if (cat === ARM_HELM) game.afternmv = Helmet_off;
        else if (cat === ARM_GLOVES) game.afternmv = Gloves_off;
        else if (cat === ARM_BOOTS) game.afternmv = Boots_off;
        else if (cat === ARM_CLOAK) game.afternmv = Cloak_off;
        else if (cat === ARM_SHIRT) game.afternmv = Shirt_off;
        else game.afternmv = null;
        const what = armor_doff_simple_name(otmp);
        game.nomovemsg = `You finish taking off your ${what}.`;
        // takeoff.mask clear deferred with full A-command path
        return 1;
    }
    // No delay — immediate remove + off_msg (fedora/leather jacket)
    const u = game.u || {};
    if (otmp === u.uarm) Armor_off();
    else if (otmp === u.uarmc) Cloak_off();
    else if (otmp === u.uarmh) Helmet_off();
    else if (otmp === u.uarms) Shield_off();
    else if (otmp === u.uarmg) Gloves_off();
    else if (otmp === u.uarmf) Boots_off();
    else if (otmp === u.uarmu) Shirt_off();
    else {
        otmp.owornmask = (otmp.owornmask || 0) & ~W_ARMOR;
    }
    await off_msg(otmp);
    find_ac();
    return 1;
}

/**
 * C ref: do_wear.c armor_or_accessory_off — armor path; accessories partial.
 * @returns {number} 0 = no time, 1 = took time
 */
async function armor_or_accessory_off(obj) {
    const u = game.u || {};
    const worn = (obj.owornmask || 0) & (W_ARMOR | W_ACCESSORY);
    if (!worn) {
        await pline('You are not wearing that.');
        return 0;
    }
    // Layering: suit under cloak, shirt under suit/cloak
    if (
        (obj === u.uarm && u.uarmc)
        || (obj === u.uarmu && (u.uarmc || u.uarm))
    ) {
        const parts = [];
        if (u.uarmc) parts.push('cloak');
        if (obj === u.uarmu && u.uarm) parts.push('suit');
        await pline(
            `You can't take that off without taking off your ${parts.join(' and ')} first.`,
        );
        return 0;
    }

    if ((obj.owornmask || 0) & W_ARMOR) {
        return armoroff(obj);
    }

    // Accessory path (rings/amulet/eyewear) — cursed gate + clear slot
    if (cursed_check(obj)) {
        await pline(game._cursed_takeoff_msg || "You can't.  It is cursed.");
        return 0;
    }
    if (obj === u.uleft || obj === u.uright) {
        await off_msg(obj);
        if (obj === u.uleft) {
            obj.owornmask = (obj.owornmask || 0) & ~W_RING;
            u.uleft = null;
        } else {
            obj.owornmask = (obj.owornmask || 0) & ~W_RING;
            u.uright = null;
        }
        return 1;
    }
    if (obj === u.uamul) {
        obj.owornmask = (obj.owornmask || 0) & ~W_AMUL;
        u.uamul = null;
        await off_msg(obj);
        return 1;
    }
    if (obj === u.ublindf) {
        obj.owornmask = (obj.owornmask || 0) & ~W_TOOL;
        u.ublindf = null;
        await off_msg(obj);
        return 1;
    }
    return 0;
}

function takeoff_lets() {
    const inv = game.invent || [];
    const lets = [];
    for (const o of inv) {
        if (!o?.invlet) continue;
        if ((o.owornmask || 0) & (W_ARMOR | W_ACCESSORY)) lets.push(o.invlet);
    }
    lets.sort();
    if (!lets.length) return '';
    return lets.join('');
}

/** C ref: invent.c getobj("take off", takeoff_ok, …) */
async function getobj_takeoff() {
    const lets = takeoff_lets();
    const query = lets
        ? `What do you want to take off? [${lets} or ?*]`
        : 'What do you want to take off? [*]';
    const prompt = `${query} `;
    game._pending_message = prompt;
    await flush_screen(1);
    const disp = game.nhDisplay;
    if (disp?.setCursor) disp.setCursor(prompt.length, 0);

    const key = await nhgetch();
    const ch = String.fromCharCode(key);
    if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
        if (game.flags?.verbose !== false) await pline('Never mind.');
        return null;
    }
    if (ch === '?' || ch === '*') {
        await pline('Never mind.');
        return null;
    }
    const otmp = (game.invent || []).find((o) => o.invlet === ch);
    if (!otmp) {
        await pline("You don't have that object.");
        return null;
    }
    if (!((otmp.owornmask || 0) & (W_ARMOR | W_ACCESSORY))) {
        await pline('You are not wearing that.');
        return null;
    }
    return otmp;
}

/**
 * C ref: do_wear.c dotakeoff — 'T' command.
 * @returns {number} 0 = no turn, 1 = took time
 */
export async function dotakeoff() {
    let otmp = count_worn_stuff(false);
    if (!Narmorpieces && !Naccessories) {
        await pline('Not wearing any armor or accessories.');
        return 0;
    }
    const paranoid = !!(game.flags?.paranoid_confirm?.remove
        || game.flags?.paranoid_remove);
    if (Narmorpieces !== 1 || paranoid) {
        otmp = await getobj_takeoff();
    }
    if (!otmp) return 0;
    return armor_or_accessory_off(otmp);
}

/**
 * C ref: do_wear.c canwearobj — slot/mask for armor; poly/weld/trap gates
 * mostly deferred (human form always ok).
 * @returns {Promise<number>} 1 ok (mask out), 0 fail
 */
export async function canwearobj(otmp, maskOut, noisy) {
    const u = game.u || {};
    let err = 0;
    let mask = 0;

    if ((otmp.owornmask || 0) & W_ARMOR) {
        if (noisy) await pline('You are already wearing that.');
        return 0;
    }

    if (is_helmet(otmp)) {
        if (u.uarmh) {
            if (noisy) await pline('You are already wearing a helmet.');
            err++;
        } else mask = W_ARMH;
    } else if (is_shield(otmp)) {
        if (u.uarms) {
            if (noisy) await pline('You are already wearing a shield.');
            err++;
        } else mask = W_ARMS;
    } else if (is_boots(otmp)) {
        if (u.uarmf) {
            if (noisy) await pline('You are already wearing boots.');
            err++;
        } else mask = W_ARMF;
    } else if (is_gloves(otmp)) {
        if (u.uarmg) {
            if (noisy) await pline('You are already wearing gloves.');
            err++;
        } else mask = W_ARMG;
    } else if (is_shirt(otmp)) {
        if (u.uarm || u.uarmc || u.uarmu) {
            if (noisy) {
                if (u.uarmu) await pline('You are already wearing a shirt.');
                else await pline("You can't wear that over your armor.");
            }
            err++;
        } else mask = W_ARMU;
    } else if (is_cloak(otmp)) {
        if (u.uarmc) {
            if (noisy) await pline('You are already wearing a cloak.');
            err++;
        } else mask = W_ARMC;
    } else if (is_suit(otmp)) {
        if (u.uarmc) {
            if (noisy) await pline('You cannot wear armor over a cloak.');
            err++;
        } else if (u.uarm) {
            if (noisy) await pline('You are already wearing some armor.');
            err++;
        } else mask = W_ARM;
    } else {
        if (noisy) await pline("You can't wear that.");
        err++;
    }

    if (!err) maskOut.mask = mask;
    return !err ? 1 : 0;
}

async function wear_lets() {
    const lets = [];
    for (const o of game.invent || []) {
        if (!o?.invlet) continue;
        if ((o.owornmask || 0) & (W_ARMOR | W_ACCESSORY)) continue;
        if (o.oclass === ARMOR_CLASS) {
            const dummy = { mask: 0 };
            if (await canwearobj(o, dummy, false)) lets.push(o.invlet);
        } else if (
            o.oclass === RING_CLASS
            || o.oclass === AMULET_CLASS
            || objectNames[o.otyp] === 'BLINDFOLD'
            || objectNames[o.otyp] === 'TOWEL'
            || objectNames[o.otyp] === 'LENSES'
            || objectNames[o.otyp] === 'MEAT_RING'
        ) {
            // accessories selectable via W (C DOWNPLAY) — letter still works
            lets.push(o.invlet);
        }
    }
    return lets.join('');
}

/** C ref: invent.c getobj("wear", wear_ok, GETOBJ_NOFLAGS) */
async function getobj_wear() {
    for (;;) {
        await flush_topl_more();
        const lets = await wear_lets();
        const query = lets
            ? `What do you want to wear? [${lets} or ?*]`
            : 'What do you want to wear? [*?]';
        const prompt = `${query} `;
        game._pending_message = prompt;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(prompt.length, 0);

        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        if (ch === '?' || ch === '*') {
            await pline('Never mind.');
            return null;
        }
        const otmp = (game.invent || []).find((o) => o.invlet === ch);
        if (!otmp) {
            await pline("You don't have that object.");
            continue;
        }
        game._pending_message = '';
        return otmp;
    }
}

async function puton_lets() {
    // C puton_ok: suggest accessories; armor is DOWNPLAY (letter still works)
    const lets = [];
    for (const o of game.invent || []) {
        if (!o?.invlet) continue;
        if ((o.owornmask || 0) & (W_ARMOR | W_ACCESSORY)) continue;
        if (
            o.oclass === RING_CLASS
            || o.oclass === AMULET_CLASS
            || o.otyp === BLINDFOLD
            || o.otyp === TOWEL
            || o.otyp === LENSES
            || o.otyp === MEAT_RING
        ) {
            lets.push(o.invlet);
        } else if (o.oclass === ARMOR_CLASS) {
            const dummy = { mask: 0 };
            if (await canwearobj(o, dummy, false)) lets.push(o.invlet);
        }
    }
    return lets.join('');
}

/** C ref: invent.c getobj("put on", puton_ok, GETOBJ_NOFLAGS) */
async function getobj_puton() {
    for (;;) {
        await flush_topl_more();
        const lets = await puton_lets();
        const query = lets
            ? `What do you want to put on? [${lets} or ?*]`
            : 'What do you want to put on? [*?]';
        const prompt = `${query} `;
        game._pending_message = prompt;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(prompt.length, 0);

        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        if (ch === '?' || ch === '*') {
            await pline('Never mind.');
            return null;
        }
        const otmp = (game.invent || []).find((o) => o.invlet === ch);
        if (!otmp) {
            await pline("You don't have that object.");
            continue;
        }
        game._pending_message = '';
        return otmp;
    }
}

/**
 * C ref: do_wear.c Amulet_on — setworn + on_msg for ordinary amulets.
 * Special cases (change/strangle/sleep/flying/breathing/ESP see_monsters)
 * deferred beyond setworn + default on_msg.
 */
async function Amulet_on(amul) {
    remove_worn_item(amul);
    setworn(amul, W_AMUL);
    const otyp = amul.otyp;
    // Life saving / reflection / poison / ESP / fake / Yendor: no extra body
    if (
        otyp === AMULET_OF_ESP
        || otyp === AMULET_OF_LIFE_SAVING
        || otyp === AMULET_VERSUS_POISON
        || otyp === AMULET_OF_REFLECTION
        || otyp === FAKE_AMULET_OF_YENDOR
        || otyp === AMULET_OF_YENDOR
        || otyp === AMULET_OF_UNCHANGING
        || otyp === AMULET_OF_GUARDING
    ) {
        // Guarding would makeknown+find_ac in C; find_ac already via setworn
        if (otyp === AMULET_OF_GUARDING) {
            // makeknown deferred
        }
        await on_msg(amul);
        return;
    }
    // Other otyps (change/strangle/sleep/flying/breathing): setworn done;
    // side-effect bodies deferred — still emit on_msg like the default path.
    await on_msg(amul);
}

/**
 * Ask Right/Left for a ring when both hands free.
 * C ref: do_wear.c accessory_or_armor_on —
 *   yn_function(qbuf, rightleftchars, '\0', TRUE).
 * Deferred: poly/non-humanoid body_part(FINGER) / nolimbs; query_menu.
 */
async function choose_ring_hand() {
    // C: Sprintf(qbuf, "Which %s%s, Right or Left?", "ring-", finger)
    // yn_function / tty_yn_function appends " [rl] " (no (def) when '\0').
    const q = 'Which ring-finger, Right or Left?';
    for (;;) {
        const answer = await yn_function(q, 'rl', '\0');
        if (!answer || answer === '\0') return 0;
        if (answer === 'l') return LEFT_RING;
        if (answer === 'r') return RIGHT_RING;
        // C: while (!mask) — only reachable if yn returns unexpected
    }
}

/**
 * C ref: do_wear.c accessory_or_armor_on — armor delay + accessory put-on.
 * Ring Glib/cursed-gloves/welded gates, Blindf_on specials, and exotic
 * amulet side effects deferred.
 * @returns {number} 0 = no turn / fail, 1 = took time
 */
async function accessory_or_armor_on(obj) {
    if ((obj.owornmask || 0) & (W_ACCESSORY | W_ARMOR)) {
        await already_wearing('that');
        return 0;
    }

    const u = game.u || {};
    const armor = obj.oclass === ARMOR_CLASS;
    const ring = obj.oclass === RING_CLASS || obj.otyp === MEAT_RING;
    const amulet = obj.oclass === AMULET_CLASS;
    const eyewear = obj.otyp === BLINDFOLD || obj.otyp === TOWEL
        || obj.otyp === LENSES;

    let mask = 0;

    if (armor) {
        const maskBox = { mask: 0 };
        if (!(await canwearobj(obj, maskBox, true))) return 0;
        mask = maskBox.mask;
    } else if (ring) {
        if (u.uleft && u.uright) {
            await pline('There are no more ring-fingers to fill.');
            return 0;
        }
        if (u.uleft) mask = RIGHT_RING;
        else if (u.uright) mask = LEFT_RING;
        else {
            mask = await choose_ring_hand();
            if (!mask) return 0;
        }
        // Glib / cursed gloves / welded weapon gates deferred
    } else if (amulet) {
        if (u.uamul) {
            await already_wearing('an amulet');
            return 0;
        }
    } else if (eyewear) {
        if (u.ublindf) {
            await already_wearing(
                u.ublindf.otyp === LENSES ? 'some lenses' : 'a blindfold',
            );
            return 0;
        }
    } else {
        await pline("You can't wear that!");
        return 0;
    }

    if (!(await retouch_object(obj, false))) {
        return 1; // C: ECMD_TIME even when not worn
    }

    if (armor) {
        // Release from weapon slots if needed
        if ((obj.owornmask || 0) & W_WEAPONS) {
            remove_worn_item(obj);
        }

        setworn(obj, mask);
        if (obj === u.uarm) game.afternmv = Armor_on;
        else if (obj === u.uarmh) game.afternmv = Helmet_on;
        else if (obj === u.uarmg) game.afternmv = Gloves_on;
        else if (obj === u.uarmf) game.afternmv = Boots_on;
        else if (obj === u.uarms) game.afternmv = Shield_on;
        else if (obj === u.uarmc) game.afternmv = Cloak_on;
        else if (obj === u.uarmu) game.afternmv = Shirt_on;
        else game.afternmv = null;

        const delay = -(game.objects?.[obj.otyp]?.oc_delay ?? 0);
        if (delay) {
            nomul(delay);
            game.multi_reason = 'dressing up';
            game.nomovemsg = 'You finish your dressing maneuver.';
        } else {
            await unmul('');
            await on_msg(obj);
        }
        return 1;
    }

    // Accessory
    if (ring) {
        setworn(obj, mask);
        // Ring_on body (learnring / attribs) deferred
        await on_msg(obj);
    } else if (amulet) {
        await Amulet_on(obj);
    } else if (eyewear) {
        // Blindf_on body deferred — setworn + on_msg only
        remove_worn_item(obj);
        setworn(obj, W_TOOL);
        await on_msg(obj);
    }
    return 1;
}

/**
 * C ref: do_wear.c dowear — 'W' command.
 * @returns {number} 0 = no turn / cancel, 1 = took time
 */
export async function dowear() {
    // verysmall/nohands deferred — humanoid always ok
    const u = game.u || {};
    if (
        u.uarm && u.uarmu && u.uarmc && u.uarmh && u.uarms && u.uarmg && u.uarmf
        && u.uleft && u.uright && u.uamul && u.ublindf
    ) {
        await pline('You are already wearing a full complement of armor.');
        return 0;
    }
    const otmp = await getobj_wear();
    if (!otmp) return 0;
    return accessory_or_armor_on(otmp);
}

/**
 * C ref: do_wear.c doputon — 'P' command.
 * @returns {number} 0 = no turn / cancel, 1 = took time
 */
export async function doputon() {
    const u = game.u || {};
    if (
        u.uleft && u.uright && u.uamul && u.ublindf
        && u.uarm && u.uarmu && u.uarmc && u.uarmh && u.uarms && u.uarmg && u.uarmf
    ) {
        await pline(
            "Your ring-fingers are full, and you're already wearing an amulet and a blindfold.",
        );
        return 0;
    }
    const otmp = await getobj_puton();
    if (!otmp) return 0;
    return accessory_or_armor_on(otmp);
}

/**
 * C ref: do_wear.c some_armor — pick a worn armor piece (cloak/suit/shirt
 * preferred; helm/gloves/boots/shield may steal via rn2(4)).
 * Hero-only envelope (which_armor monster path deferred).
 */
export function some_armor(_victim) {
    const u = game.u || {};
    let otmph = u.uarmc || u.uarm || u.uarmu || null;
    let otmp = u.uarmh;
    if (otmp && (!otmph || !rn2(4))) otmph = otmp;
    otmp = u.uarmg;
    if (otmp && (!otmph || !rn2(4))) otmph = otmp;
    otmp = u.uarmf;
    if (otmp && (!otmph || !rn2(4))) otmph = otmp;
    otmp = u.uarms;
    if (otmp && (!otmph || !rn2(4))) otmph = otmp;
    return otmph;
}

/** C ref: do_wear.c obj_erode_type */
function obj_erode_type(otmp) {
    if (is_flammable(otmp)) return ERODE_BURN;
    if (is_rustprone(otmp)) return ERODE_RUST;
    if (is_crackable(otmp)) return ERODE_CRACK;
    if (is_rottable(otmp)) return ERODE_ROT;
    if (is_corrodeable(otmp)) return ERODE_CORRODE;
    return ERODE_NONE;
}

/**
 * C ref: do_wear.c destroy_arm — erode rn2(4)+1 random worn armor pieces;
 * stop early on ER_DESTROYED. Named omissions: none for the gather/hit loop.
 *
 * @returns {Promise<number>} 1 if any damage/destroy, else 0
 */
export async function destroy_arm() {
    const u = game.u || {};
    const armors = [];
    if (u.uarm) armors.push(u.uarm);
    if (u.uarmc) armors.push(u.uarmc);
    if (u.uarmh) armors.push(u.uarmh);
    if (u.uarms) armors.push(u.uarms);
    if (u.uarmg) armors.push(u.uarmg);
    if (u.uarmf) armors.push(u.uarmf);
    if (u.uarmu) armors.push(u.uarmu);
    const idx = armors.length;
    if (!idx) return 0;

    const hits = rn2(4) + 1;
    let ret = 0;
    for (let i = 0; i < hits; i++) {
        const otmp = armors[rn2(idx)];
        if (!otmp) continue;
        if (erosion_matters(otmp) && is_damageable(otmp) && !otmp.oerodeproof) {
            const erosion = obj_erode_type(otmp);
            if (erosion !== ERODE_NONE) {
                const r = await erode_obj(
                    otmp, xname(otmp), erosion, EF_PAY | EF_DESTROY,
                );
                if (r !== ER_NOTHING) ret = 1;
                if (r === ER_DESTROYED) break;
            }
        }
    }
    if (ret) await stop_occupation();
    return ret;
}
