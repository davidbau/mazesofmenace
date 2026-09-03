// do_wear.js — Wear / take-off / put-on (partial).
// C ref: do_wear.c — dowear, doputon, canwearobj, accessory_or_armor_on,
// Amulet_on, Amulet_off, Armor_on, dotakeoff, doddoremarm, take_off,
// do_takeoff, remarm_swapwep, menu_remarm, armor_or_accessory_off,
// armoroff, *_off.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import {
    flush_screen, flush_topl_more, pline, You_feel, mark_topline_prompt,
    newsym, see_monsters, urgent_pline, impossible,
} from './display.js';
import { yn_function } from './getline.js';
import { an, doname, the, xname, xprname, vtense, makeplural, body_part_latebound } from './objnam.js';
import { find_ac } from './u_init.js';
import {
    A_STR, A_CON, A_CHA, acurr, extremeattr, change_luck, Fast, Very_fast,
} from './attrib.js';
import { nomul, unmul, stop_occupation } from './hack.js';
import { retouch_object, set_artifact_intrinsic } from './artifact.js';
import {
    welded, setuwep, setuswapwep, setuqwep, empty_handed, is_weptool,
    set_twoweap,
} from './wield.js';
import { cmdq_pop } from './cmd.js';
import { set_occupation } from './engrave.js';
import {
    makeknown, observe_object, ggetobj, is_worn, silly_thing, update_inventory,
} from './invent.js';
import { w_blocks } from './worn.js';
import { monstunseesu_prop } from './mondata.js';
import {
    add_valid_menu_class, menu_class_present, query_category, query_objlist,
    is_worn_by_type,
} from './pickup.js';
import { obj_resists } from './dogmove.js';
import { toggle_blindness } from './do.js';
import {
    W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU, W_ARMOR,
    W_RING, W_RINGL, W_RINGR, W_AMUL, W_TOOL, W_WEAPONS, W_WEP, W_SWAPWEP,
    W_QUIVER, W_BALL, W_CHAIN, LEFT_RING, RIGHT_RING, W_ART,
    ECMD_OK, ECMD_FAIL, ECMD_TIME, HANDS_SYM, CMDQ_KEY,
    ERODE_BURN, ERODE_RUST, ERODE_ROT, ERODE_CORRODE, ERODE_CRACK, ERODE_NONE,
    ER_NOTHING, ER_DESTROYED, EF_PAY, EF_DESTROY,
    TIMEOUT, BLINDED, FAST, TELEPAT, STEALTH, SLEEPY, I_SPECIAL,
    WORN_BOOTS, WORN_CLOAK, WORN_GLOVES,
    WORN_HELMET, WORN_SHIELD, WORN_SHIRT, WORN_ARMOR, WORN_BLINDF, WORN_AMUL,
    DISPLACED, INVIS, SEE_INVIS, CLAIRVOYANT, LEVITATION,
    PROT_FROM_SHAPE_CHANGERS,
    DRAIN_RES, SICK_RES, INFRAVISION, STONE_RES, SLOW_DIGESTION, FREE_ACTION,
    BOLT_LIM, LEFT_HANDED, GLIB, FROMOUTSIDE,
    ARTICLE_YOUR, SUPPRESS_SADDLE, SUPPRESS_HALLUCINATION,
    MENU_TRADITIONAL, MENU_COMBINATION, MENU_FULL,
    ALL_FINISHED, ALL_TYPES_SELECTED, ALL_TYPES, WORN_TYPES, UNPAID_TYPES,
    BUCX_TYPES, SIGNAL_NOMENU, USE_INVLET, INVORDER_SORT, PICK_ANY,
    HAND, FOOT, TT_BEARTRAP, TT_INFLOOR, P_SHORT_SWORD, P_SABER,
    rightleftchars,
} from './const.js';
import { x_monnam } from './do_name.js';
import {
    ARMOR_CLASS, RING_CLASS, AMULET_CLASS, WEAPON_CLASS, TOOL_CLASS,
    objectNames, objectNameStrs,
} from './objects.js';
import { PM_ARCHEOLOGIST, PM_MONK, nolimbs, nohands, verysmall } from './monsters.js';
import {
    is_flammable, is_rustprone, is_rottable, is_corrodeable, is_crackable,
    erosion_matters, is_damageable,
} from './mkobj.js';
import { erode_obj, selftouch } from './trap.js';
import { rn2, rnd } from './rng.js';
import { set_mimic_blocking } from './vision.js';
import { restartcham, rescham } from './mon.js';

const FEDORA = objectNames.indexOf('FEDORA');
const MEAT_RING = objectNames.indexOf('MEAT_RING');
const GAUNTLETS_OF_POWER = objectNames.indexOf('GAUNTLETS_OF_POWER');
const GAUNTLETS_OF_FUMBLING = objectNames.indexOf('GAUNTLETS_OF_FUMBLING');
const CLOAK_OF_PROTECTION = objectNames.indexOf('CLOAK_OF_PROTECTION');
const CLOAK_OF_DISPLACEMENT = objectNames.indexOf('CLOAK_OF_DISPLACEMENT');
const BLINDFOLD = objectNames.indexOf('BLINDFOLD');
const TOWEL = objectNames.indexOf('TOWEL');
const LENSES = objectNames.indexOf('LENSES');
const BATTLE_AXE = objectNames.indexOf('BATTLE_AXE');
const AMULET_OF_ESP = objectNames.indexOf('AMULET_OF_ESP');
const AMULET_OF_LIFE_SAVING = objectNames.indexOf('AMULET_OF_LIFE_SAVING');
const AMULET_VERSUS_POISON = objectNames.indexOf('AMULET_VERSUS_POISON');
const AMULET_OF_REFLECTION = objectNames.indexOf('AMULET_OF_REFLECTION');
const FAKE_AMULET_OF_YENDOR = objectNames.indexOf('FAKE_AMULET_OF_YENDOR');
const AMULET_OF_YENDOR = objectNames.indexOf('AMULET_OF_YENDOR');
const AMULET_OF_UNCHANGING = objectNames.indexOf('AMULET_OF_UNCHANGING');
const AMULET_OF_GUARDING = objectNames.indexOf('AMULET_OF_GUARDING');
const AMULET_OF_RESTFUL_SLEEP = objectNames.indexOf('AMULET_OF_RESTFUL_SLEEP');
const AMULET_OF_CHANGE = objectNames.indexOf('AMULET_OF_CHANGE');
const AMULET_OF_STRANGULATION = objectNames.indexOf('AMULET_OF_STRANGULATION');
const AMULET_OF_FLYING = objectNames.indexOf('AMULET_OF_FLYING');
const AMULET_OF_MAGICAL_BREATHING = objectNames.indexOf('AMULET_OF_MAGICAL_BREATHING');
const FUMBLE_BOOTS = objectNames.indexOf('FUMBLE_BOOTS');
const SPEED_BOOTS = objectNames.indexOf('SPEED_BOOTS');
const ELVEN_BOOTS = objectNames.indexOf('ELVEN_BOOTS');
const ELVEN_CLOAK = objectNames.indexOf('ELVEN_CLOAK');
const BLACK_DRAGON_SCALES = objectNames.indexOf('BLACK_DRAGON_SCALES');
const BLACK_DRAGON_SCALE_MAIL = objectNames.indexOf('BLACK_DRAGON_SCALE_MAIL');
const BLUE_DRAGON_SCALES = objectNames.indexOf('BLUE_DRAGON_SCALES');
const BLUE_DRAGON_SCALE_MAIL = objectNames.indexOf('BLUE_DRAGON_SCALE_MAIL');
const GREEN_DRAGON_SCALES = objectNames.indexOf('GREEN_DRAGON_SCALES');
const GREEN_DRAGON_SCALE_MAIL = objectNames.indexOf('GREEN_DRAGON_SCALE_MAIL');
const RED_DRAGON_SCALES = objectNames.indexOf('RED_DRAGON_SCALES');
const RED_DRAGON_SCALE_MAIL = objectNames.indexOf('RED_DRAGON_SCALE_MAIL');
const GOLD_DRAGON_SCALES = objectNames.indexOf('GOLD_DRAGON_SCALES');
const GOLD_DRAGON_SCALE_MAIL = objectNames.indexOf('GOLD_DRAGON_SCALE_MAIL');
const ORANGE_DRAGON_SCALES = objectNames.indexOf('ORANGE_DRAGON_SCALES');
const ORANGE_DRAGON_SCALE_MAIL = objectNames.indexOf('ORANGE_DRAGON_SCALE_MAIL');
const YELLOW_DRAGON_SCALES = objectNames.indexOf('YELLOW_DRAGON_SCALES');
const YELLOW_DRAGON_SCALE_MAIL = objectNames.indexOf('YELLOW_DRAGON_SCALE_MAIL');
const WHITE_DRAGON_SCALES = objectNames.indexOf('WHITE_DRAGON_SCALES');
const WHITE_DRAGON_SCALE_MAIL = objectNames.indexOf('WHITE_DRAGON_SCALE_MAIL');

const RIN_SEE_INVISIBLE = objectNames.indexOf('RIN_SEE_INVISIBLE');
const RIN_INVISIBILITY = objectNames.indexOf('RIN_INVISIBILITY');
const RIN_LEVITATION = objectNames.indexOf('RIN_LEVITATION');
const RIN_WARNING = objectNames.indexOf('RIN_WARNING');
const RIN_STEALTH = objectNames.indexOf('RIN_STEALTH');
const RIN_GAIN_STRENGTH = objectNames.indexOf('RIN_GAIN_STRENGTH');
const RIN_GAIN_CONSTITUTION = objectNames.indexOf('RIN_GAIN_CONSTITUTION');
const RIN_ADORNMENT = objectNames.indexOf('RIN_ADORNMENT');
const RIN_INCREASE_ACCURACY = objectNames.indexOf('RIN_INCREASE_ACCURACY');
const RIN_INCREASE_DAMAGE = objectNames.indexOf('RIN_INCREASE_DAMAGE');
const RIN_PROTECTION = objectNames.indexOf('RIN_PROTECTION');
const RIN_PROTECTION_FROM_SHAPE_CHAN =
    objectNames.indexOf('RIN_PROTECTION_FROM_SHAPE_CHAN');

// C ref: objclass.h ARM_* — oc_skill / oc_subtyp / oc_armcat
const ARM_SUIT = 0;
const ARM_SHIELD = 1;
const ARM_HELM = 2;
const ARM_GLOVES = 3;
const ARM_BOOTS = 4;
const ARM_CLOAK = 5;
const ARM_SHIRT = 6;

const W_ACCESSORY = W_RING | W_AMUL | W_TOOL;

/* C do_wear.c takeoff_order — 'A' occupation walks this, not wear order. */
const takeoff_order = [
    WORN_BLINDF, W_WEP, WORN_SHIELD, WORN_GLOVES, LEFT_RING,
    RIGHT_RING, WORN_CLOAK, WORN_HELMET, WORN_AMUL, WORN_ARMOR,
    WORN_SHIRT, WORN_BOOTS, W_SWAPWEP, W_QUIVER, 0,
];

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
export async function off_msg(otmp) {
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

/**
 * C ref: do_wear.c cursed — message + bknown when stuck.
 * Plural when boots/gloves/lenses or quan>1 (not quan alone).
 * uwep uses welded(); Glib fingers_or_gloves retry pline named.
 */
export function cursed_check(otmp) {
    if (!otmp) return false;
    const stuck = (otmp === game.u?.uwep) ? welded(otmp) : !!otmp.cursed;
    if (stuck) {
        const use_plural = is_boots(otmp) || is_gloves(otmp)
            || otmp.otyp === LENSES || (otmp.quan || 1) > 1;
        game._cursed_takeoff_msg = use_plural
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
 * C ref: worn.c setworn — confer/clear objects[].oc_oprop extrinsic bit.
 * Artifact spfx is `set_artifact_intrinsic` (D-1558), not this helper.
 * SWAPWEP/QUIVER skip, w_blocks, and monstunseesu_prop live in setworn
 * (D-1757), not here. Named: mirror of most E* flats (BLINDED/FAST/
 * TELEPAT/STEALTH/LEVITATION only so far).
 */
export function confer_oc_oprop(obj, mask, on) {
    if (!obj) return;
    // C: prop #0 unused; items with no conferred property use 0
    const p = (game.objects?.[obj.otyp]?.oc_oprop | 0);
    if (!p) return;
    const u = game.u || (game.u = {});
    if (!u.uprops) u.uprops = {};
    if (!u.uprops[p]) u.uprops[p] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    if (on) u.uprops[p].extrinsic = (u.uprops[p].extrinsic | 0) | mask;
    else u.uprops[p].extrinsic = (u.uprops[p].extrinsic | 0) & ~mask;
    // C youprop.h EBlinded/EFast/ETelepat/EStealth ≡ uprops[].extrinsic.
    if (p === BLINDED) {
        if (on) u.EBlinded = (u.EBlinded | 0) | mask;
        else u.EBlinded = (u.EBlinded | 0) & ~mask;
    } else if (p === FAST) {
        if (on) u.EFast = (u.EFast | 0) | mask;
        else u.EFast = (u.EFast | 0) & ~mask;
    } else if (p === TELEPAT) {
        if (on) u.ETelepat = (u.ETelepat | 0) | mask;
        else u.ETelepat = (u.ETelepat | 0) & ~mask;
    } else if (p === STEALTH) {
        if (on) u.EStealth = (u.EStealth | 0) | mask;
        else u.EStealth = (u.EStealth | 0) & ~mask;
    } else if (p === LEVITATION) {
        // C youprop.h ELevitation ≡ uprops[LEVITATION].extrinsic (D-0976)
        if (on) u.ELevitation = (u.ELevitation | 0) | mask;
        else u.ELevitation = (u.ELevitation | 0) & ~mask;
    }
}

/**
 * C ref: worn.c recalc_telepat_range — BOLT_LIM² per worn TELEPAT object
 * (+1 if artifact ESP via ETelepat & W_ART). Sets u.unblind_telepat_range
 * to -1 when no sources.
 */
export function recalc_telepat_range() {
    const u = game.u || (game.u = {});
    const objs = game.objects || {};
    let nobjs = 0;
    const slots = [
        u.uarm, u.uarmc, u.uarmh, u.uarms, u.uarmg, u.uarmf, u.uarmu,
        u.uleft, u.uright, u.uwep, u.uswapwep, u.uquiver, u.uamul, u.ublindf,
    ];
    for (const o of slots) {
        if (o && (objs[o.otyp]?.oc_oprop | 0) === TELEPAT) nobjs++;
    }
    // C: artifacts with SPFX_ESP counted once via ETelepat & W_ART
    if ((u.ETelepat | 0) & W_ART) nobjs++;
    if (nobjs) u.unblind_telepat_range = (BOLT_LIM * BOLT_LIM) * nobjs;
    else u.unblind_telepat_range = -1;
}

/**
 * C ref: youprop.h E* macros — write uprops[prop].extrinsic + flat mirror.
 * @param {number} propIdx
 * @param {string} flatField
 * @param {number} mask
 * @param {boolean} on
 */
function set_extrinsic_bit(propIdx, flatField, mask, on) {
    const u = game.u || (game.u = {});
    if (!u.uprops) u.uprops = {};
    if (!u.uprops[propIdx]) {
        u.uprops[propIdx] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    }
    if (on) {
        u.uprops[propIdx].extrinsic = (u.uprops[propIdx].extrinsic | 0) | mask;
        u[flatField] = (u[flatField] | 0) | mask;
    } else {
        u.uprops[propIdx].extrinsic = (u.uprops[propIdx].extrinsic | 0) & ~mask;
        u[flatField] = (u[flatField] | 0) & ~mask;
    }
}

/**
 * C ref: do_wear.c dragon_armor_handling — suit/scales special extrinsics.
 * Named omissions: gold make_hallucinated; red see_monsters; yellow
 * wielding_corpse on doff; artifact_light begin_burn/end_burn in Armor_*.
 * @param {object|null} otmp
 * @param {boolean} puton
 * @param {boolean} [_on_purpose=true]
 */
async function dragon_armor_handling(otmp, puton, _on_purpose = true) {
    if (!otmp) return;
    const otyp = otmp.otyp | 0;
    switch (otyp) {
        case BLACK_DRAGON_SCALES:
        case BLACK_DRAGON_SCALE_MAIL:
            set_extrinsic_bit(DRAIN_RES, 'EDrain_resistance', W_ARM, puton);
            break;
        case BLUE_DRAGON_SCALES:
        case BLUE_DRAGON_SCALE_MAIL:
            if (puton) {
                // C: if (!Very_fast) You("speed up%s.", Fast ? " a bit more" : "");
                if (!Very_fast()) {
                    await pline(`You speed up${Fast() ? ' a bit more' : ''}.`);
                }
                set_extrinsic_bit(FAST, 'EFast', W_ARM, true);
            } else {
                set_extrinsic_bit(FAST, 'EFast', W_ARM, false);
                // C: if (!Very_fast && !takeoff.cancelled_don) You("slow down.");
                if (!Very_fast() && !game.context?.takeoff?.cancelled_don) {
                    await pline('You slow down.');
                }
            }
            break;
        case GREEN_DRAGON_SCALES:
        case GREEN_DRAGON_SCALE_MAIL:
            set_extrinsic_bit(SICK_RES, 'ESick_resistance', W_ARM, puton);
            break;
        case RED_DRAGON_SCALES:
        case RED_DRAGON_SCALE_MAIL:
            set_extrinsic_bit(INFRAVISION, 'EInfravision', W_ARM, puton);
            // see_monsters() deferred
            break;
        case GOLD_DRAGON_SCALES:
        case GOLD_DRAGON_SCALE_MAIL:
            // make_hallucinated(!puton, …, W_ARM) deferred
            break;
        case ORANGE_DRAGON_SCALES:
        case ORANGE_DRAGON_SCALE_MAIL:
            set_extrinsic_bit(FREE_ACTION, 'EFree_action', W_ARM, puton);
            // C Free_action macro is extrinsic-only; also mirror flat Free_action
            {
                const u = game.u || (game.u = {});
                if (puton) u.Free_action = (u.Free_action | 0) | W_ARM;
                else u.Free_action = (u.Free_action | 0) & ~W_ARM;
            }
            break;
        case YELLOW_DRAGON_SCALES:
        case YELLOW_DRAGON_SCALE_MAIL:
            set_extrinsic_bit(STONE_RES, 'EStone_resistance', W_ARM, puton);
            // wielding_corpse on doff deferred
            break;
        case WHITE_DRAGON_SCALES:
        case WHITE_DRAGON_SCALE_MAIL:
            set_extrinsic_bit(SLOW_DIGESTION, 'ESlow_digestion', W_ARM, puton);
            break;
        default:
            break;
    }
}

/** C worn.c worn[] — hero slot pointer name + mask. */
const WORN = [
    ['uarm', W_ARM],
    ['uarmc', W_ARMC],
    ['uarmh', W_ARMH],
    ['uarms', W_ARMS],
    ['uarmg', W_ARMG],
    ['uarmf', W_ARMF],
    ['uarmu', W_ARMU],
    ['uleft', W_RINGL],
    ['uright', W_RINGR],
    ['uwep', W_WEP],
    ['uswapwep', W_SWAPWEP],
    ['uquiver', W_QUIVER],
    ['uamul', W_AMUL],
    ['ublindf', W_TOOL],
    ['uball', W_BALL],
    ['uchain', W_CHAIN],
];

/**
 * C youprop.h B* ≡ uprops[].blocked. JS Blind/Invis clones still read
 * the flat mirrors confer_oc_oprop uses for E*.
 */
function apply_w_blocks(obj, mask, slotMask, on) {
    const p = w_blocks(obj, mask);
    if (!p) return;
    const u = game.u || (game.u = {});
    if (!u.uprops) u.uprops = {};
    if (!u.uprops[p]) u.uprops[p] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    if (on) u.uprops[p].blocked = (u.uprops[p].blocked | 0) | slotMask;
    else u.uprops[p].blocked = (u.uprops[p].blocked | 0) & ~slotMask;
    if (p === BLINDED) {
        u.BBlinded = on ? (u.BBlinded | 0) | slotMask : (u.BBlinded | 0) & ~slotMask;
    } else if (p === INVIS) {
        u.BInvis = on ? (u.BInvis | 0) | slotMask : (u.BInvis | 0) & ~slotMask;
    } else if (p === CLAIRVOYANT) {
        u.BClairvoyant = on
            ? (u.BClairvoyant | 0) | slotMask
            : (u.BClairvoyant | 0) & ~slotMask;
    }
}

/**
 * C ref: worn.c setworn `:72–145` — worn[] walk + oc_oprop extrinsic
 * + w_blocks blocked + SWAPWEP/QUIVER skip + weapon-class gate
 * + oartifact `set_artifact_intrinsic` (D-1558; Eyes XRAY W_TOOL).
 * Does **not** call find_ac (C worn.c); allmain once-per-input and a few
 * explicit callers (Ring_on protection, Amulet_on guarding) update uac.
 * opts.skip_find_ac retained as a no-op for D-0722 polyself callers.
 * cancel_doff is D-1766 (I_SPECIAL skip in do_takeoff).
 * @param {object|null} obj
 * @param {number} mask
 */
export function setworn(obj, mask, opts = null) {
    const u = game.u || (game.u = {});
    void opts; // skip_find_ac no-op — setworn never find_ac (D-0810)
    mask = mask | 0;

    if ((mask & (W_ARM | I_SPECIAL)) === (W_ARM | I_SPECIAL)) {
        u.uskin = obj || null;
    } else {
        for (const [slot, wmask] of WORN) {
            if (!(wmask & mask)) continue;
            const oobj = u[slot] || null;
            if (oobj && !((oobj.owornmask | 0) & wmask)) {
                const hex = (wmask >>> 0).toString(16).padStart(8, '0');
                impossible(`Setworn: mask=0x${hex}.`);
            }
            if (oobj) {
                if (u.twoweap && ((oobj.owornmask | 0) & (W_WEP | W_SWAPWEP))) {
                    set_twoweap(false);
                }
                oobj.owornmask = (oobj.owornmask | 0) & ~wmask;
                if (wmask & ~(W_SWAPWEP | W_QUIVER)) {
                    confer_oc_oprop(oobj, wmask, false);
                    monstunseesu_prop(game.objects?.[oobj.otyp]?.oc_oprop | 0);
                    apply_w_blocks(oobj, mask, wmask, false);
                    if (oobj.oartifact) set_artifact_intrinsic(oobj, false, mask);
                }
                // wearing or removal in progress / 'A' pending
                cancel_doff(oobj, wmask);
            }
            u[slot] = obj || null;
            if (obj) {
                obj.owornmask = (obj.owornmask | 0) | wmask;
                if (wmask & ~(W_SWAPWEP | W_QUIVER)) {
                    if (obj.oclass === WEAPON_CLASS || is_weptool(obj)
                        || mask !== W_WEP) {
                        confer_oc_oprop(obj, wmask, true);
                        apply_w_blocks(obj, mask, wmask, true);
                    }
                    if (obj.oartifact) set_artifact_intrinsic(obj, true, mask);
                }
            }
        }
        if (obj && ((obj.owornmask | 0) & W_ARMOR) !== 0) {
            if (!u.uroleplay) u.uroleplay = {};
            u.uroleplay.nudist = false;
        }
        if (!game.iflags) game.iflags = {};
        game.iflags.tux_penalty = !!(u.uarm
            && (game.urole?.mnum | 0) === PM_MONK
            && game.urole?.spelarmr);
    }
    if ((game.flags?.weaponstatus && (mask & W_WEP) !== 0)
        || (game.flags?.armorstatus && (mask & W_ARMOR) !== 0)) {
        if (!game.disp) game.disp = {};
        game.disp.botl = true;
    }
    // C worn.c setworn — no find_ac (D-0810); delay-0 Cloak_on More
    // must paint stale u.uac until allmain find_ac.
    update_inventory();
    recalc_telepat_range();
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

/** C ref: do_wear.c Armor_off — suit; arti_light end_burn deferred */
export async function Armor_off() {
    const otmp = game.u?.uarm;
    clear_worn(W_ARM);
    // C: setworn(NULL) then dragon_armor_handling(otmp, FALSE, TRUE)
    await dragon_armor_handling(otmp, false, true);
    return 0;
}

/** C ref: do_wear.c Helmet_off — fedora luck; other magic helms deferred */
export function Helmet_off() {
    const u = game.u || {};
    const helm = u.uarmh;
    if (helm && helm.otyp === FEDORA && game.urole?.mnum === PM_ARCHEOLOGIST) {
        change_luck(-1);
    }
    clear_worn(W_ARMH);
    return 0;
}

/**
 * C ref: do_wear.c Cloak_off — setworn then ELVEN toggle_stealth /
 * DISPLACEMENT toggle_displacement. Named omissions: mummy wrapping /
 * invisibility / alchemy-smock acid arms.
 */
export async function Cloak_off() {
    const u = game.u || {};
    const otmp = u.uarmc;
    if (!otmp) {
        clear_worn(W_ARMC);
        return 0;
    }
    const otyp = otmp.otyp | 0;
    const oprop = game.objects?.[otyp]?.oc_oprop | 0;
    const oldprop = (u.uprops?.[oprop]?.extrinsic | 0) & ~WORN_CLOAK;
    if (game.context?.takeoff) {
        game.context.takeoff.mask =
            (game.context.takeoff.mask | 0) & ~W_ARMC;
    }
    clear_worn(W_ARMC);
    if (otyp === ELVEN_CLOAK) {
        await toggle_stealth(otmp, oldprop, false);
    } else if (otyp === CLOAK_OF_DISPLACEMENT) {
        await toggle_displacement(otmp, oldprop, false);
    }
    // MUMMY_WRAPPING / CLOAK_OF_INVISIBILITY / ALCHEMY_SMOCK deferred
    return 0;
}
export function Shield_off() {
    clear_worn(W_ARMS);
    return 0;
}
export function Gloves_off() {
    clear_worn(W_ARMG);
    return 0;
}
/**
 * C ref: do_wear.c Boots_off — setworn then ELVEN toggle_stealth.
 * Named omissions: SPEED slow-down; water-walking spoteffects;
 * FUMBLE clear; LEVITATION float_down.
 */
export async function Boots_off() {
    const u = game.u || {};
    const otmp = u.uarmf;
    if (!otmp) {
        clear_worn(W_ARMF);
        return 0;
    }
    const otyp = otmp.otyp | 0;
    const oprop = game.objects?.[otyp]?.oc_oprop | 0;
    const oldprop = (u.uprops?.[oprop]?.extrinsic | 0) & ~WORN_BOOTS;
    if (game.context?.takeoff) {
        game.context.takeoff.mask =
            (game.context.takeoff.mask | 0) & ~W_ARMF;
    }
    clear_worn(W_ARMF);
    if (otyp === ELVEN_BOOTS) {
        await toggle_stealth(otmp, oldprop, false);
    }
    // SPEED / WATER_WALKING / FUMBLE / LEVITATION deferred
    if (game.context?.takeoff) {
        game.context.takeoff.cancelled_don = false;
    }
    return 0;
}
export function Shirt_off() {
    clear_worn(W_ARMU);
    return 0;
}

/**
 * C ref: do_wear.c Armor_on — known + dragon_armor_handling.
 * Named omission: artifact_light begin_burn (gold DSM light).
 */
async function Armor_on() {
    const uarm = game.u?.uarm;
    if (!uarm) return 0;
    if (!uarm.known) {
        uarm.known = 1;
    }
    await dragon_armor_handling(uarm, true, true);
    // artifact_light begin_burn deferred
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
/**
 * C ref: do_wear.c toggle_stealth — discover + feedback when extrinsic
 * stealth state changes (ring / elven cloak / elven boots). Riding
 * blocks stealth via BStealth elsewhere; message still names steed.
 */
export async function toggle_stealth(obj, oldprop, on) {
    if (on ? game._initial_don : game.context?.takeoff?.cancelled_don) {
        return;
    }
    const u = game.u || {};
    const hStealth = (u.HStealth | 0)
        | (u.uprops?.[STEALTH]?.intrinsic | 0);
    const bStealth = (u.BStealth | 0)
        | (u.uprops?.[STEALTH]?.blocked | 0);
    if (!oldprop && !hStealth && !bStealth) {
        if ((obj.otyp | 0) === RIN_STEALTH) learnring(obj, true);
        else makeknown(obj.otyp);
        if (on) {
            if (!is_boots(obj)) await pline('You move very quietly.');
            else if (Levitation_dw() || Flying_dw()) {
                await pline('You float imperceptibly.');
            } else {
                await pline('You walk very quietly.');
            }
        } else {
            const riding = !!u.usteed;
            const steedBit = riding
                ? x_monnam(
                    u.usteed, ARTICLE_YOUR, null,
                    SUPPRESS_SADDLE | SUPPRESS_HALLUCINATION, false,
                )
                : '';
            await pline(
                `You ${riding ? 'and ' : 'sure'}${steedBit} are noisy.`,
            );
        }
    }
}

/**
 * C ref: do_wear.c toggle_displacement — discover + You_feel when state
 * changes and hero can see/sense self. Timed-displacement (obj null) and
 * Blind_telepat-only sensing deferred when not needed for extrinsic cloak.
 */
/** C ref: do_wear.c toggle_displacement — cloak / corpse Displaced msg. */
export async function toggle_displacement(obj, oldprop, on) {
    if (on ? game._initial_don : game.context?.takeoff?.cancelled_don) return;
    const u = game.u || {};
    const prop = u.uprops?.[DISPLACED];
    const intrinsic = (prop?.intrinsic | 0) || (u.HDisplaced | 0);
    const blocked = prop?.blocked | 0;
    const can_notice = (!Blind() && !u.uswallow && !hero_Invisible())
        || !!(u.ETelepat || u.Unblind_telepat
            || u.Detect_monsters || (u.HDetect_monsters | 0)
            || (u.EDetect_monsters | 0));
    if (!oldprop && !intrinsic && !blocked && can_notice) {
        if (obj) makeknown(obj.otyp);
        await You_feel(
            `that monsters${on ? '' : ' no longer'} have difficulty pinpointing your location.`,
        );
    }
}

/** C youprop.h Invisible — Invis && !See_invisible. */
function hero_Invisible() {
    const u = game.u || {};
    const invis = !!(u.Invis
        || (((u.HInvis | 0) || (u.EInvis | 0) || (u.uprops?.[INVIS]?.extrinsic | 0)
            || (u.uprops?.[INVIS]?.intrinsic | 0)) && !(u.BInvis | 0)));
    const seeInv = !!(u.See_invisible
        || (u.HSee_invisible | 0) || (u.ESee_invisible | 0));
    return invis && !seeInv;
}

/**
 * C ref: do_wear.c Cloak_on — PROTECTION makeknown; DISPLACEMENT
 * toggle_displacement; ELVEN_CLOAK toggle_stealth (D-0970). Named
 * omissions: MUMMY_WRAPPING / INVISIBILITY / OILSKIN / ALCHEMY_SMOCK;
 * update_inventory.
 */
async function Cloak_on() {
    const o = game.u?.uarmc;
    if (!o) return 0;
    const u = game.u || {};
    const oprop = game.objects?.[o.otyp]?.oc_oprop | 0;
    const extr = u.uprops?.[oprop]?.extrinsic | 0;
    const oldprop = extr & ~WORN_CLOAK;

    if (o.otyp === CLOAK_OF_PROTECTION) {
        makeknown(o.otyp);
    } else if (o.otyp === ELVEN_CLOAK) {
        await toggle_stealth(o, oldprop, true);
    } else if (o.otyp === CLOAK_OF_DISPLACEMENT) {
        await toggle_displacement(o, oldprop, true);
    }
    // MUMMY / INVIS / OILSKIN / ALCHEMY deferred
    // C Cloak_on: known=1 for status-line AC; no find_ac here (D-0810).
    // Delay-0 displacement You_feel --More-- must show pre-cloak uac.
    if (!o.known) o.known = 1;
    return 0;
}
async function Shield_on() {
    const o = game.u?.uarms;
    if (o && !o.known) o.known = 1;
    find_ac();
    return 0;
}
/**
 * C ref: do_wear.c Gloves_on — POWER makeknown→exercise(A_WIS) (D-0783);
 * FUMBLING incr_itimeout. Named omissions: DEX adj_abon; update_inventory;
 * Gloves_off.
 */
async function Gloves_on() {
    const o = game.u?.uarmg;
    if (!o) return 0;
    const u = game.u || {};
    const oprop = game.objects?.[o.otyp]?.oc_oprop | 0;
    const extr = u.uprops?.[oprop]?.extrinsic | 0;
    const oldprop = extr & ~WORN_GLOVES;

    if (o.otyp === GAUNTLETS_OF_FUMBLING) {
        if (!u.uprops) u.uprops = {};
        const prop = u.uprops[oprop] || (u.uprops[oprop] = {
            intrinsic: 0, extrinsic: 0, blocked: 0,
        });
        const hCur = (u.HFumbling | 0) | (prop.intrinsic | 0);
        if (!oldprop && !(hCur & ~TIMEOUT)) {
            const next = (hCur & TIMEOUT) + rnd(20);
            const hNext = (hCur & ~TIMEOUT) | (next & TIMEOUT);
            u.HFumbling = hNext;
            prop.intrinsic = hNext;
        }
    } else if (o.otyp === GAUNTLETS_OF_POWER) {
        // C: makeknown(uarmg->otyp); botl = TRUE
        makeknown(o.otyp);
        if (!game.flags) game.flags = {};
        game.flags.botl = true;
    }
    // GAUNTLETS_OF_DEXTERITY adj_abon deferred
    if (!o.known) o.known = 1;
    find_ac();
    return 0;
}
/**
 * C ref: do_wear.c Boots_on — FUMBLE_BOOTS incr_itimeout; SPEED_BOOTS
 * makeknown→exercise(A_WIS) + You_feel speed up (D-0744); ELVEN_BOOTS
 * toggle_stealth (D-0970). Named omissions: water-walking/levitation;
 * update_inventory; Boots_off SPEED slow-down.
 */
async function Boots_on() {
    const o = game.u?.uarmf;
    if (!o) return 0;
    const u = game.u || (game.u = {});
    const oprop = game.objects?.[o.otyp]?.oc_oprop | 0;
    const extr = u.uprops?.[oprop]?.extrinsic | 0;
    // C: oldprop = uprops[oc_oprop].extrinsic & ~WORN_BOOTS
    const oldprop = extr & ~WORN_BOOTS;

    if (o.otyp === FUMBLE_BOOTS) {
        // C: if (!oldprop && !(HFumbling & ~TIMEOUT)) incr_itimeout(&HFumbling, rnd(20));
        // HFumbling ≡ uprops[FUMBLING].intrinsic — keep flat + uprops in sync.
        if (!u.uprops) u.uprops = {};
        const prop = u.uprops[oprop] || (u.uprops[oprop] = {
            intrinsic: 0, extrinsic: 0, blocked: 0,
        });
        const hCur = (u.HFumbling | 0) | (prop.intrinsic | 0);
        if (!oldprop && !(hCur & ~TIMEOUT)) {
            const next = (hCur & TIMEOUT) + rnd(20);
            const hNext = (hCur & ~TIMEOUT) | (next & TIMEOUT);
            u.HFumbling = hNext;
            prop.intrinsic = hNext;
        }
    } else if (o.otyp === SPEED_BOOTS) {
        // C: if (!oldprop && !(HFast & TIMEOUT)) makeknown + You_feel
        const hFast = (u.HFast | 0) | (u.uprops?.[FAST]?.intrinsic | 0);
        if (!oldprop && !(hFast & TIMEOUT)) {
            makeknown(o.otyp);
            const more = (oldprop || hFast) ? ' a bit more' : '';
            await You_feel(`yourself speed up${more}.`);
        }
    } else if (o.otyp === ELVEN_BOOTS) {
        await toggle_stealth(o, oldprop, true);
    }
    // WATER_WALKING / LEVITATION cases deferred
    if (!o.known) o.known = 1;
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
 * C ref: do_wear.c set_wear — side-effects of already-worn gear.
 * Called from moveloop_preamble (!resuming) after ini_inv slots are set;
 * also poly_obj path when a worn item transforms (obj != null).
 * Named omissions: initial_don skips stealth/displacement msgs;
 * Blindf_on Punished set_bc; Amulet_on exotic bodies beyond RESTFUL_SLEEP.
 * @param {object|null} [obj=null] Null → all worn slots; else that object only.
 */
export async function set_wear(obj = null) {
    const u = game.u || {};
    const all = !obj;
    // C: gi.initial_don = !obj;
    game._initial_don = all;

    if ((all ? u.ublindf : obj === u.ublindf) && u.ublindf) {
        await Blindf_on(u.ublindf);
    }
    if ((all ? u.uright : obj === u.uright) && u.uright) {
        await Ring_on(u.uright);
    }
    if ((all ? u.uleft : obj === u.uleft) && u.uleft) {
        await Ring_on(u.uleft);
    }
    if ((all ? u.uamul : obj === u.uamul) && u.uamul) {
        await Amulet_on(u.uamul);
    }

    if ((all ? u.uarmu : obj === u.uarmu) && u.uarmu) await Shirt_on();
    if ((all ? u.uarm : obj === u.uarm) && u.uarm) await Armor_on();
    if ((all ? u.uarmc : obj === u.uarmc) && u.uarmc) await Cloak_on();
    if ((all ? u.uarmf : obj === u.uarmf) && u.uarmf) await Boots_on();
    if ((all ? u.uarmg : obj === u.uarmg) && u.uarmg) await Gloves_on();
    if ((all ? u.uarmh : obj === u.uarmh) && u.uarmh) await Helmet_on();
    if ((all ? u.uarms : obj === u.uarms) && u.uarms) await Shield_on();

    game._initial_don = false;
}

/**
 * C ref: objnam.c suit_simple_name — "mail"/"jacket"/"suit" (dragon deferred).
 */
export function suit_simple_name(suit) {
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
    // C armoroff: *_off + off_msg only — no find_ac (D-0883 / ≡D-0810
    // stale-botl until allmain once-per-input find_ac).
    const u = game.u || {};
    if (otmp === u.uarm) await Armor_off();
    else if (otmp === u.uarmc) await Cloak_off();
    else if (otmp === u.uarmh) Helmet_off();
    else if (otmp === u.uarms) Shield_off();
    else if (otmp === u.uarmg) Gloves_off();
    else if (otmp === u.uarmf) await Boots_off();
    else if (otmp === u.uarmu) Shirt_off();
    else {
        otmp.owornmask = (otmp.owornmask || 0) & ~W_ARMOR;
    }
    await off_msg(otmp);
    // takeoff.mask clear deferred with full A-command path
    return 1;
}

/** C youprop.h Blind — HBlinded || EBlinded, not blocked. */
function Blind() {
    const u = game.u || {};
    if (u.Blind || u.ublind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

/**
 * C ref: do_wear.c Blindf_on — setworn + on_msg + see-any-more / toggle.
 * Named omissions: Punished set_bc; Eyes of Overworld birth-blind clear
 * is live; gulp_blnd_check is Blindf_off.
 */
export async function Blindf_on(otmp) {
    const already_blind = Blind();
    remove_worn_item(otmp);
    setworn(otmp, W_TOOL);
    await on_msg(otmp);

    let changed = false;
    if (Blind() && !already_blind) {
        changed = true;
        if (game.flags?.verbose !== false) {
            await pline("You can't see any more.");
        }
    } else if (already_blind && !Blind()) {
        changed = true;
        if (game.u?.uroleplay?.blind) {
            await pline('For the first time in your life, you can see!');
            game.u.uroleplay.blind = false;
        } else {
            await pline('You can see!');
        }
    }
    if (changed) {
        await toggle_blindness();
    }
}

/**
 * C ref: do_wear.c Blindf_off — clear eyewear + see-again / still-blind.
 * Named omissions: gulp_blnd_check; Punished set_bc.
 */
export async function Blindf_off(otmp) {
    const u = game.u || (game.u = {});
    const was_blind = Blind();
    if (!otmp) otmp = u.ublindf;
    if (!otmp) return;

    setworn(null, W_TOOL);
    await off_msg(otmp);

    let changed = false;
    if (Blind()) {
        if (was_blind) {
            if (otmp.otyp !== LENSES) {
                await pline('You still cannot see.');
            }
        } else {
            changed = true;
            await pline("You can't see anything now!");
        }
    } else if (was_blind) {
        changed = true;
        await pline('You can see again.');
    }
    if (changed) {
        await toggle_blindness();
    }
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
            confer_oc_oprop(obj, W_RINGL, false);
            obj.owornmask = (obj.owornmask || 0) & ~W_RING;
            u.uleft = null;
        } else {
            confer_oc_oprop(obj, W_RINGR, false);
            obj.owornmask = (obj.owornmask || 0) & ~W_RING;
            u.uright = null;
        }
        return 1;
    }
    if (obj === u.uamul) {
        await Amulet_off(); /* C: does its own off_msg */
        return 1;
    }
    if (obj === u.ublindf) {
        await Blindf_off(obj);
        return 1;
    }
    return 0;
}

function takeoff_lets() {
    // C takeoff_ok / equip_ok(removing, accessory=FALSE): SUGGEST worn
    // armor only; accessories are GETOBJ_DOWNPLAY (selectable, not listed).
    const inv = game.invent || [];
    const lets = [];
    for (const o of inv) {
        if (!o?.invlet) continue;
        if ((o.owornmask || 0) & W_ARMOR) lets.push(o.invlet);
    }
    lets.sort();
    if (!lets.length) return '';
    return lets.join('');
}

/**
 * C ref: invent.c getobj("take off", takeoff_ok, GETOBJ_NOFLAGS)
 * via yn_function(qbuf, NULL, '\0'). Leave gt.toplines on success —
 * delayed armoroff has no off_msg until afternmv; parse clears after
 * next-command nhgetch (same as getobj_drop).
 */
async function getobj_takeoff() {
    for (;;) {
        await flush_topl_more();
        const lets = takeoff_lets();
        const query = lets
            ? `What do you want to take off? [${lets} or ?*]`
            : 'What do you want to take off? [*]';
        // C invent.c getobj → yn_function(qbuf, (char *)0, '\0', FALSE)
        const ch = await yn_function(query, null, '\0', false);
        if (ch === '\x1b' || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        if (ch === '?' || ch === '*') {
            // ?/* pickinv deferred — cancel like prior stub
            await pline('Never mind.');
            return null;
        }
        const otmp = (game.invent || []).find((o) => o.invlet === ch);
        if (!otmp) {
            // C invent.c getobj: You("don't have that object."); continue;
            await pline("You don't have that object.");
            continue;
        }
        if (!((otmp.owornmask || 0) & (W_ARMOR | W_ACCESSORY))) {
            await pline('You are not wearing that.');
            return null;
        }
        // C: leave gt.toplines for parse clear_nhwindow(WIN_MESSAGE)
        mark_topline_prompt(game._pending_message);
        return otmp;
    }
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
 * C ref: invent.c wearing_armor — any armor slot occupied.
 */
function wearing_armor() {
    const u = game.u || {};
    return !!(u.uarm || u.uarmc || u.uarmf || u.uarmg
        || u.uarmh || u.uarms || u.uarmu);
}

/**
 * C do_wear.c select_off `:2694–2821`. Sets takeoff.mask; does not
 * remove the item (`take_off` occupation is D-1619).
 * Named omit: better_not_take_that_off stoning-corpse gloves yn;
 * gloves_simple_name gauntlets; cloak_simple_name robe; surface()
 * infloor noun (uses "floor").
 * @param {object|null} otmp
 * @returns {Promise<number>} always 0 like C
 */
async function select_off(otmp) {
    if (!otmp) return 0;
    const u = game.u || {};
    if (!game.context) game.context = {};
    if (!game.context.takeoff) game.context.takeoff = {};
    const to = game.context.takeoff;

    if (otmp === u.uright || otmp === u.uleft) {
        if (nolimbs(game.youmonst?.data)) {
            await pline('The ring is stuck.');
            return 0;
        }
        const RING_ON_PRIMARY = ((u.uhandedness | 0) === LEFT_HANDED)
            ? u.uleft : u.uright;
        let why = null;
        let buf = '';
        if (u.uwep && welded(u.uwep)
            && (otmp === RING_ON_PRIMARY || ring_bimanual(u.uwep))) {
            buf = `free a weapon ${body_part_latebound(HAND)}`;
            why = u.uwep;
        } else if (u.uarmg && (u.uarmg.cursed || hero_glib())) {
            const glib = hero_glib();
            buf = `take off your ${glib ? 'slippery ' : ''}gloves`;
            why = glib ? { bknown: 0 } : u.uarmg;
        }
        if (why) {
            await pline(`You cannot ${buf} to remove the ring.`);
            why.bknown = 1;
            return 0;
        }
    }
    if (otmp === u.uarmg) {
        if (u.uwep && welded(u.uwep)) {
            const sk = game.objects?.[u.uwep.otyp]?.oc_skill | 0;
            const weap = (u.uwep.oclass === WEAPON_CLASS
                && sk >= P_SHORT_SWORD && sk <= P_SABER)
                ? 'sword' : 'weapon';
            await pline(
                `You are unable to take off your gloves while wielding that ${weap}.`,
            );
            u.uwep.bknown = 1;
            return 0;
        }
        if (hero_glib()) {
            const art = u.uarmg.unpaid ? 'The' : 'Your';
            await pline(`${art} gloves are too slippery to take off.`);
            return 0;
        }
        /* better_not_take_that_off named omit */
    }
    if (otmp === u.uarmf) {
        if (u.utrap && (u.utraptype | 0) === TT_BEARTRAP) {
            await pline(
                `The bear trap prevents you from pulling your ${body_part_latebound(FOOT)} out.`,
            );
            return 0;
        }
        if (u.utrap && (u.utraptype | 0) === TT_INFLOOR) {
            await pline(
                `You are stuck in the floor, and cannot pull your ${makeplural(body_part_latebound(FOOT))} out.`,
            );
            return 0;
        }
    }
    if (otmp === u.uarm || otmp === u.uarmu) {
        let why = null;
        let buf = '';
        if (u.uarmc && u.uarmc.cursed) {
            buf = 'remove your cloak';
            why = u.uarmc;
        } else if (otmp === u.uarmu && u.uarm && u.uarm.cursed) {
            buf = 'remove your suit';
            why = u.uarm;
        } else if (u.uwep && welded(u.uwep) && ring_bimanual(u.uwep)) {
            const sk = game.objects?.[u.uwep.otyp]?.oc_skill | 0;
            const weap = ((u.uwep.otyp | 0) === BATTLE_AXE) ? 'axe'
                : (u.uwep.oclass === WEAPON_CLASS
                    && sk >= P_SHORT_SWORD && sk <= P_SABER)
                    ? 'sword' : 'weapon';
            buf = `release your ${weap}`;
            why = u.uwep;
        }
        if (why) {
            await pline(`You cannot ${buf} to take off ${the(xname(otmp))}.`);
            why.bknown = 1;
            return 0;
        }
    }
    if (otmp === u.uquiver || (otmp === u.uswapwep && !u.twoweap)) {
        /* removable even when cursed */
    } else if (cursed_check(otmp)) {
        await pline(game._cursed_takeoff_msg || "You can't.  It is cursed.");
        return 0;
    }

    if (otmp === u.uarm) to.mask = (to.mask | 0) | WORN_ARMOR;
    else if (otmp === u.uarmc) to.mask = (to.mask | 0) | WORN_CLOAK;
    else if (otmp === u.uarmf) to.mask = (to.mask | 0) | WORN_BOOTS;
    else if (otmp === u.uarmg) to.mask = (to.mask | 0) | WORN_GLOVES;
    else if (otmp === u.uarmh) to.mask = (to.mask | 0) | WORN_HELMET;
    else if (otmp === u.uarms) to.mask = (to.mask | 0) | WORN_SHIELD;
    else if (otmp === u.uarmu) to.mask = (to.mask | 0) | WORN_SHIRT;
    else if (otmp === u.uleft) to.mask = (to.mask | 0) | LEFT_RING;
    else if (otmp === u.uright) to.mask = (to.mask | 0) | RIGHT_RING;
    else if (otmp === u.uamul) to.mask = (to.mask | 0) | WORN_AMUL;
    else if (otmp === u.ublindf) to.mask = (to.mask | 0) | WORN_BLINDF;
    else if (otmp === u.uwep) to.mask = (to.mask | 0) | W_WEP;
    else if (otmp === u.uswapwep) to.mask = (to.mask | 0) | W_SWAPWEP;
    else if (otmp === u.uquiver) to.mask = (to.mask | 0) | W_QUIVER;
    else await impossible(`select_off: ${doname(otmp)}???`);

    return 0;
}

/**
 * C do_wear.c cursed — message + bknown when stuck (do_takeoff).
 * Body is cursed_check; Glib fingers_or_gloves retry pline named.
 * @param {object|null} otmp
 * @returns {Promise<boolean>} true when the item stays on
 */
async function cursed_blocks(otmp) {
    if (!otmp) {
        await impossible('cursed without otmp');
        return false;
    }
    if (cursed_check(otmp)) {
        await pline(game._cursed_takeoff_msg || "You can't.  It is cursed.");
        return true;
    }
    return false;
}

function oc_delay_of(obj) {
    if (!obj) return 0;
    return game.objects?.[obj.otyp]?.oc_delay | 0;
}

function takeoff_info() {
    if (!game.context) game.context = {};
    if (!game.context.takeoff) game.context.takeoff = {};
    const doff = game.context.takeoff;
    if (doff.mask == null) doff.mask = 0;
    if (doff.what == null) doff.what = 0;
    if (doff.delay == null) doff.delay = 0;
    return doff;
}

/**
 * C do_wear.c reset_remarm `:3013–3018`.
 * Caller: cmd.c reset_occupations (doddrop, D-1635).
 */
export function reset_remarm() {
    const doff = takeoff_info();
    doff.what = 0;
    doff.mask = 0;
    doff.disrobing = '';
}

/**
 * C do_wear.c do_takeoff `:2823–2896`. Occupation tick actually removes
 * `takeoff.what`. I_SPECIAL so setworn→cancel_doff does not cancel_don
 * mid-'A' (D-1766).
 * @returns {Promise<object|null>}
 */
async function do_takeoff() {
    const u = game.u || {};
    let otmp = null;
    const was_twoweap = !!u.twoweap;
    const doff = takeoff_info();

    doff.mask = (doff.mask | 0) | I_SPECIAL;
    if (doff.what === W_WEP) {
        if (!(await cursed_blocks(u.uwep))) {
            setuwep(null);
            if (was_twoweap) {
                await pline('You are no longer wielding either weapon.');
            } else {
                await pline(`You are ${empty_handed()}.`);
            }
        }
    } else if (doff.what === W_SWAPWEP) {
        setuswapwep(null);
        await pline(
            `You ${was_twoweap ? 'are ' : ''}no longer ${
                was_twoweap
                    ? 'wielding two weapons at once'
                    : 'have a second weapon readied'
            }.`,
        );
    } else if (doff.what === W_QUIVER) {
        setuqwep(null);
        await pline('You no longer have ammunition readied.');
    } else if (doff.what === WORN_ARMOR) {
        otmp = u.uarm;
        if (!(await cursed_blocks(otmp))) await Armor_off();
    } else if (doff.what === WORN_CLOAK) {
        otmp = u.uarmc;
        if (!(await cursed_blocks(otmp))) await Cloak_off();
    } else if (doff.what === WORN_BOOTS) {
        otmp = u.uarmf;
        if (!(await cursed_blocks(otmp))) await Boots_off();
    } else if (doff.what === WORN_GLOVES) {
        otmp = u.uarmg;
        if (!(await cursed_blocks(otmp))) Gloves_off();
    } else if (doff.what === WORN_HELMET) {
        otmp = u.uarmh;
        if (!(await cursed_blocks(otmp))) Helmet_off();
    } else if (doff.what === WORN_SHIELD) {
        otmp = u.uarms;
        if (!(await cursed_blocks(otmp))) Shield_off();
    } else if (doff.what === WORN_SHIRT) {
        otmp = u.uarmu;
        if (!(await cursed_blocks(otmp))) Shirt_off();
    } else if (doff.what === WORN_AMUL) {
        otmp = u.uamul;
        if (!(await cursed_blocks(otmp))) await Amulet_off();
    } else if (doff.what === LEFT_RING) {
        otmp = u.uleft;
        if (!(await cursed_blocks(otmp))) await Ring_off(u.uleft);
    } else if (doff.what === RIGHT_RING) {
        otmp = u.uright;
        if (!(await cursed_blocks(otmp))) await Ring_off(u.uright);
    } else if (doff.what === WORN_BLINDF) {
        if (!(await cursed_blocks(u.ublindf))) await Blindf_off(u.ublindf);
    } else {
        await impossible(`do_takeoff: taking off ${doff.what}`);
    }
    doff.mask = (doff.mask | 0) & ~I_SPECIAL;
    return otmp;
}

/**
 * C do_wear.c remarm_swapwep `:3060–3087`. Caller: iactions.c
 * itemactions_pushkeys IA_UNWIELD when otmp==uswapwep (`#altunwield`
 * INTERNALCMD). Pops canned HANDS_SYM; reset_remarm then do_takeoff
 * W_SWAPWEP. Cursed secondary still comes off; TIME if gone or bknown
 * flipped.
 * @returns {Promise<number>}
 */
export async function remarm_swapwep() {
    const cmdq = cmdq_pop();
    let isKey = false;
    let keych = '\0';
    if (cmdq) {
        isKey = cmdq.typ === CMDQ_KEY || cmdq.typ === 'key';
        if (isKey) {
            keych = typeof cmdq.key === 'string'
                ? cmdq.key.charAt(0)
                : String.fromCharCode(cmdq.key | 0);
        }
    }
    const u = game.u || {};
    if (!isKey || keych !== HANDS_SYM || !u.uswapwep) return ECMD_FAIL;

    const oldbknown = u.uswapwep.bknown | 0;
    reset_remarm();
    const doff = takeoff_info();
    doff.what = W_SWAPWEP;
    doff.mask = W_SWAPWEP;
    await do_takeoff();
    return (!u.uswapwep || (u.uswapwep.bknown | 0) !== oldbknown)
        ? ECMD_TIME
        : ECMD_OK;
}

/**
 * C do_wear.c take_off `:2899–2987`. Occupation for 'A' / #takeoffall.
 * Delay uses oc_delay; cloak/suit extra when taking armor or shirt;
 * occupation start subtracts 1. menu_remarm is D-1630.
 * @returns {Promise<number>} 1 still busy, 0 finished
 */
async function take_off() {
    const u = game.u || {};
    const doff = takeoff_info();

    if (doff.what) {
        if ((doff.delay | 0) > 0) {
            doff.delay = (doff.delay | 0) - 1;
            return 1;
        }
        const otmpDone = await do_takeoff();
        if (otmpDone) await off_msg(otmpDone);
        doff.mask = (doff.mask | 0) & ~(doff.what | 0);
        doff.what = 0;
    }

    let i;
    for (i = 0; takeoff_order[i]; i++) {
        if ((doff.mask | 0) & takeoff_order[i]) {
            doff.what = takeoff_order[i];
            break;
        }
    }

    let otmp = null;
    doff.delay = 0;

    if ((doff.what | 0) === 0) {
        await pline(`You finish ${doff.disrobing || 'disrobing'}.`);
        return 0;
    } else if (doff.what === W_WEP) {
        doff.delay = 1;
    } else if (doff.what === W_SWAPWEP) {
        doff.delay = 1;
    } else if (doff.what === W_QUIVER) {
        doff.delay = 1;
    } else if (doff.what === WORN_ARMOR) {
        otmp = u.uarm;
        /* cloak on: 2×cloak delay + 1 (C kludge; cloaks are delay 0) */
        if (u.uarmc) doff.delay += 2 * oc_delay_of(u.uarmc) + 1;
    } else if (doff.what === WORN_CLOAK) {
        otmp = u.uarmc;
    } else if (doff.what === WORN_BOOTS) {
        otmp = u.uarmf;
    } else if (doff.what === WORN_GLOVES) {
        otmp = u.uarmg;
    } else if (doff.what === WORN_HELMET) {
        otmp = u.uarmh;
    } else if (doff.what === WORN_SHIELD) {
        otmp = u.uarms;
    } else if (doff.what === WORN_SHIRT) {
        otmp = u.uarmu;
        if (u.uarm) doff.delay += 2 * oc_delay_of(u.uarm);
        if (u.uarmc) doff.delay += 2 * oc_delay_of(u.uarmc) + 1;
    } else if (doff.what === WORN_AMUL) {
        doff.delay = 1;
    } else if (doff.what === LEFT_RING) {
        doff.delay = 1;
    } else if (doff.what === RIGHT_RING) {
        doff.delay = 1;
    } else if (doff.what === WORN_BLINDF) {
        doff.delay = 1;
    } else {
        await impossible(`take_off: taking off ${doff.what}`);
        return 0;
    }

    if (otmp) doff.delay += oc_delay_of(otmp);
    if ((doff.delay | 0) > 0) doff.delay = (doff.delay | 0) - 1;

    set_occupation(take_off, doff.disrobing || 'disrobing', 0);
    return 1;
}

/**
 * C do_wear.c menu_remarm `:3089–3138`.
 * MENU_FULL: query_category then query_objlist PICK_ANY.
 * MENU_COMBINATION: ggetobj combo then the same object list.
 * retry from TRADITIONAL `'m'` (ggetobj -2/-3).
 * Named omit: obj_to_glyph in query_objlist; ParanoidAutoAll (not passed).
 * @param {number} retry
 * @returns {Promise<number>} 0
 */
async function menu_remarm(retry) {
    let all_worn_categories = true;

    if (retry) {
        all_worn_categories = (retry === -2);
    } else if ((game.flags?.menu_style ?? MENU_FULL) === MENU_FULL) {
        all_worn_categories = false;
        const cats = await query_category(
            'What type of things do you want to take off?',
            game.invent,
            WORN_TYPES | ALL_TYPES | UNPAID_TYPES | BUCX_TYPES,
            PICK_ANY,
        );
        if (!cats.length) return 0;
        for (const pick of cats) {
            if (pick.a_int === ALL_TYPES_SELECTED) all_worn_categories = true;
            else add_valid_menu_class(pick.a_int);
        }
    } else if ((game.flags?.menu_style ?? MENU_FULL) === MENU_COMBINATION) {
        const ggofeedback = { bits: 0 };
        const i = await ggetobj('take off', select_off, 0, true, ggofeedback);
        if (ggofeedback.bits & ALL_FINISHED) return 0;
        all_worn_categories = (i === -2);
    }
    if (menu_class_present('u')
        || menu_class_present('B') || menu_class_present('U')
        || menu_class_present('C') || menu_class_present('X')) {
        all_worn_categories = false;
    }

    const allow = all_worn_categories ? is_worn : is_worn_by_type;
    const { n, pick_list } = await query_objlist(
        'What do you want to take off?',
        game.invent,
        SIGNAL_NOMENU | USE_INVLET | INVORDER_SORT,
        PICK_ANY,
        allow,
    );
    if (n > 0) {
        for (const pick of pick_list) {
            await select_off(pick.obj);
        }
    } else if (n < 0
        && (game.flags?.menu_style ?? MENU_FULL) !== MENU_COMBINATION) {
        await pline('There is nothing else you can remove or unwield.');
    }
    return 0;
}

/**
 * C ref: do_wear.c doddoremarm — #takeoffall / 'A'.
 * Empty-worn: You("are not wearing anything.") ECMD_OK.
 * MENU_TRADITIONAL ggetobj("take off", select_off) + askchain (D-1602).
 * take_off occupation after mask (D-1619). menu_remarm FULL/COMBINATION
 * + TRADITIONAL `'m'` (D-1630).
 */
export async function doddoremarm() {
    const u = game.u || {};
    const to = takeoff_info();
    if (to.what || to.mask) {
        const verb = to.disrobing || 'disrobing';
        await pline(`You continue ${verb}.`);
        set_occupation(take_off, verb, 0);
        return ECMD_OK;
    }
    if (!u.uwep && !u.uswapwep && !u.uquiver && !u.uamul && !u.ublindf
        && !u.uleft && !u.uright && !wearing_armor()) {
        await pline('You are not wearing anything.');
        return ECMD_OK;
    }

    add_valid_menu_class(0);
    const style = game.flags?.menu_style ?? MENU_FULL;
    let result = 0;
    if (style !== MENU_TRADITIONAL
        || (result = await ggetobj('take off', select_off, 0, false, null))
            < -1) {
        await menu_remarm(result);
    }
    if (to.mask) {
        to.disrobing = ((to.mask & ~W_WEAPONS) !== 0)
            ? 'disrobing' : 'disarming';
        await take_off();
    }
    return ECMD_OK;
}

/**
 * C ref: do_wear.c canwearobj — slot/mask for armor; poly/weld/trap gates
 * mostly deferred (human form always ok). Noisy else → silly_thing("wear")
 * (D-1682; C `:2189–2194`).
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
        /* C `:2189–2194` getobj can't do this after allow_all;
           extra / covered-slot armor → silly_thing("wear"). */
        if (noisy) await silly_thing('wear', otmp);
        err++;
    }

    if (!err) maskOut.mask = mask;
    return !err ? 1 : 0;
}

async function wear_lets() {
    // C wear_ok / equip_ok(FALSE, accessory=FALSE): SUGGEST wearable armor;
    // accessories are GETOBJ_DOWNPLAY (letter still works, not in prompt).
    const lets = [];
    for (const o of game.invent || []) {
        if (!o?.invlet) continue;
        if ((o.owornmask || 0) & (W_ARMOR | W_ACCESSORY)) continue;
        if (o.oclass === ARMOR_CLASS) {
            const dummy = { mask: 0 };
            if (await canwearobj(o, dummy, false)) lets.push(o.invlet);
        }
    }
    return lets.sort().join('');
}

/** C ref: invent.c getobj("wear", wear_ok, GETOBJ_NOFLAGS) */
async function getobj_wear() {
    for (;;) {
        await flush_topl_more();
        const lets = await wear_lets();
        // C invent.c getobj: empty suggested buf → " [*]" (not "[*?]");
        // DOWNPLAY accessories set forceprompt so the prompt still appears.
        const query = lets
            ? `What do you want to wear? [${lets} or ?*]`
            : 'What do you want to wear? [*]';
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
    // C puton_ok / equip_ok(FALSE, accessory=TRUE): SUGGEST accessories;
    // armor is GETOBJ_DOWNPLAY (letter still works, not in prompt).
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
        }
    }
    return lets.sort().join('');
}

/** C ref: invent.c getobj("put on", puton_ok, GETOBJ_NOFLAGS) */
async function getobj_puton() {
    for (;;) {
        await flush_topl_more();
        const lets = await puton_lets();
        // C invent.c getobj: empty suggested buf → " [*]" (not "[*?]")
        const query = lets
            ? `What do you want to put on? [${lets} or ?*]`
            : 'What do you want to put on? [*]';
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
 * C ref: do_wear.c Amulet_on — setworn + on_msg; RESTFUL_SLEEP sets HSleepy.
 * Deferred: change/strangle/flying/breathing bodies; ESP see_monsters;
 * Guarding makeknown; nh_timeout SLEEPY dialogue.
 */
async function Amulet_on(amul) {
    remove_worn_item(amul);
    setworn(amul, W_AMUL);
    const otyp = amul.otyp;
    let on_msg_done = false;

    if (otyp === AMULET_OF_RESTFUL_SLEEP) {
        // C: newnap = rnd(98)+2; oldnap = HSleepy & TIMEOUT;
        // if (newnap < oldnap || oldnap == 0) HSleepy = (HSleepy & ~TIMEOUT) | newnap;
        const u = game.u || (game.u = {});
        const newnap = rnd(98) + 2;
        const oldnap = (u.HSleepy | 0) & TIMEOUT;
        if (newnap < oldnap || oldnap === 0) {
            u.HSleepy = ((u.HSleepy | 0) & ~TIMEOUT) | newnap;
        }
    } else if (
        otyp === AMULET_OF_ESP
        || otyp === AMULET_OF_LIFE_SAVING
        || otyp === AMULET_VERSUS_POISON
        || otyp === AMULET_OF_REFLECTION
        || otyp === FAKE_AMULET_OF_YENDOR
        || otyp === AMULET_OF_YENDOR
        || otyp === AMULET_OF_UNCHANGING
    ) {
        // change/strangle/flying/breathing side-effect bodies deferred
    } else if (otyp === AMULET_OF_GUARDING) {
        // C Amulet_on: makeknown + find_ac (setworn does not find_ac; D-0810)
        makeknown(AMULET_OF_GUARDING);
        find_ac();
    }
    // C: if (!on_msg_done) on_msg(uamul);
    if (!on_msg_done) await on_msg(amul);
}

/**
 * C do_wear.c Amulet_off `:1089–1189`. setworn + off_msg; ESP
 * see_monsters; RESTFUL_SLEEP clear HSleepy TIMEOUT; GUARDING find_ac.
 * Named omit: MAGICAL_BREATHING drown/region_danger; STRANGULATION
 * Breathless; FLYING land/spoteffects; CHANGE.
 */
export async function Amulet_off() {
    const u = game.u || {};
    const amul = u.uamul;
    if (!amul) return;
    let mkn = false;
    let early_off_msg = false;
    const doff = takeoff_info();
    doff.mask = (doff.mask | 0) & ~W_AMUL;
    const otyp = amul.otyp | 0;

    switch (otyp) {
    case AMULET_OF_ESP:
        setworn(null, W_AMUL);
        await off_msg(amul);
        early_off_msg = true;
        see_monsters();
        break;
    case AMULET_OF_LIFE_SAVING:
    case AMULET_VERSUS_POISON:
    case AMULET_OF_REFLECTION:
    case AMULET_OF_CHANGE:
    case AMULET_OF_UNCHANGING:
    case FAKE_AMULET_OF_YENDOR:
        break;
    case AMULET_OF_MAGICAL_BREATHING:
        /* drown / region_danger named omit — still setworn below */
        break;
    case AMULET_OF_STRANGULATION:
        /* Strangled / Breathless named omit — still setworn below */
        break;
    case AMULET_OF_RESTFUL_SLEEP:
        setworn(null, W_AMUL);
        /* HSleepy = 0L would clobber FROMOUTSIDE */
        if (!((u.ESleepy | 0) || (u.uprops?.[SLEEPY]?.extrinsic | 0))
            && !((u.HSleepy | 0) & ~TIMEOUT)) {
            u.HSleepy = (u.HSleepy | 0) & ~TIMEOUT;
        }
        break;
    case AMULET_OF_FLYING:
        /* float_vs_flight / land / spoteffects named omit */
        break;
    case AMULET_OF_GUARDING:
        find_ac();
        break;
    case AMULET_OF_YENDOR:
        break;
    default:
        break;
    }

    setworn(null, W_AMUL);
    if (!early_off_msg) await off_msg(amul);
    if (mkn) makeknown(amul.otyp);
}

/**
 * Ask Right/Left for a ring when both hands free.
 * C ref: do_wear.c accessory_or_armor_on —
 *   yn_function(qbuf, rightleftchars, '\0', TRUE).
 * query_menu is D-1728 (`resp === rightleftchars`). Named: poly
 * body_part(FINGER) wording.
 */
async function choose_ring_hand() {
    // C: Sprintf(qbuf, "Which %s%s, Right or Left?", "ring-", finger)
    // yn_function / tty_yn_function appends " [rl] " (no (def) when '\0').
    const q = 'Which ring-finger, Right or Left?';
    for (;;) {
        const answer = await yn_function(q, rightleftchars, '\0');
        if (!answer || answer === '\0') return 0;
        if (answer === 'l' || answer === 'L') return LEFT_RING;
        if (answer === 'r' || answer === 'R') return RIGHT_RING;
        // C: while (!mask) — only reachable if yn returns unexpected
    }
}

/** C ref: obj.h bimanual — WEAPON/TOOL with oc_bimanual (oc_big). */
function ring_bimanual(obj) {
    if (!obj) return false;
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== TOOL_CLASS) return false;
    return !!(game.objects?.[obj.otyp]?.oc_big);
}

/** C ref: youprop.h Glib — uprops[GLIB].intrinsic. */
function hero_glib() {
    return !!((game.u?.uprops?.[GLIB]?.intrinsic | 0)
        || (game.u?.Glib | 0));
}

/**
 * C ref: do_wear.c accessory_or_armor_on — armor delay + accessory put-on.
 * Exotic amulet side effects deferred. Blindf_on / Blindf_off ported
 * (Punished set_bc still named).
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
        // C: nolimbs before hand choice — ECMD_OK, no Right/Left yn
        if (nolimbs(game.youmonst?.data)) {
            await pline('You cannot make the ring stick to your body.');
            return 0;
        }
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
        // C ref: do_wear.c accessory_or_armor_on — Glib / cursed gloves /
        // welded uwep gates after hand choice (D-0699).
        if (u.uarmg && hero_glib()) {
            await pline(
                'Your gloves are too slippery to remove, so you cannot put on the ring.',
            );
            return 1; // C: always ECMD_TIME
        }
        if (u.uarmg && u.uarmg.cursed) {
            const learned = !u.uarmg.bknown;
            u.uarmg.bknown = 1;
            await pline('You cannot remove your gloves to put on the ring.');
            return learned ? 1 : 0;
        }
        if (u.uwep) {
            const learned = !u.uwep.bknown;
            const urighty = (u.uhandedness | 0) !== LEFT_HANDED;
            const ulefty = (u.uhandedness | 0) === LEFT_HANDED;
            if (((mask === RIGHT_RING && urighty)
                    || (mask === LEFT_RING && ulefty)
                    || ring_bimanual(u.uwep))
                && welded(u.uwep)) {
                const hand = ring_bimanual(u.uwep) ? 'hands' : 'hand';
                await pline(
                    `You cannot free your weapon ${hand} to put on the ring.`,
                );
                return learned ? 1 : 0;
            }
        }
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
        // C: Ring_on expects ring already worn as uleft/uright
        setworn(obj, mask);
        await Ring_on(obj);
        // C: is_worn — levitation at sink may have removed the ring
        if ((obj.owornmask | 0) & (W_ARMOR | W_RING | W_AMUL | W_TOOL
            | W_WEAPONS /* | W_SADDLE */)) {
            await on_msg(obj);
        }
    } else if (amulet) {
        await Amulet_on(obj);
    } else if (eyewear) {
        // C: Blindf_on handles setworn + on_msg + blindness toggle
        await Blindf_on(obj);
    }
    return 1;
}

/**
 * C ref: do_wear.c dowear — 'W' command.
 * @returns {number} 0 = no turn / cancel, 1 = took time
 */
export async function dowear() {
    // C: verysmall || nohands → "Don't even bother." (ECMD_OK, no getobj)
    const ptr = game.youmonst?.data;
    if (verysmall(ptr) || nohands(ptr)) {
        await pline("Don't even bother.");
        return 0;
    }
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

/** C youprop.h See_invisible / Invisible / Blind / Protection_from_shape_changers */
function See_invisible_dw() {
    const u = game.u || {};
    return !!((u.HSee_invisible | 0) || (u.ESee_invisible | 0)
        || u.See_invisible
        || (u.uprops?.[SEE_INVIS]?.intrinsic | 0)
        || (u.uprops?.[SEE_INVIS]?.extrinsic | 0));
}
function Invis_dw() {
    const u = game.u || {};
    return !!((u.HInvis | 0) || (u.EInvis | 0) || u.Invis
        || (u.uprops?.[INVIS]?.intrinsic | 0)
        || (u.uprops?.[INVIS]?.extrinsic | 0));
}
function Invisible_dw() {
    return Invis_dw() && !See_invisible_dw();
}
function Blind_dw() {
    const u = game.u || {};
    return !!(u.Blind || ((u.HBlinded | 0) & TIMEOUT) || (u.EBlinded | 0)
        || u.uroleplay?.blind);
}
function Protection_from_shape_changers_dw() {
    const u = game.u || {};
    return !!(u.HProtection_from_shape_changers
        || u.EProtection_from_shape_changers
        || u.Protection_from_shape_changers
        || (u.uprops?.[PROT_FROM_SHAPE_CHANGERS]?.intrinsic | 0)
        || (u.uprops?.[PROT_FROM_SHAPE_CHANGERS]?.extrinsic | 0));
}

/** C youprop.h Levitation — (H||E) && !B. */
function Levitation_dw() {
    const u = game.u || {};
    if (u.Levitation) return true;
    return !!(((u.HLevitation | 0) || (u.ELevitation | 0))
        && !(u.BLevitation | 0));
}

/** C youprop.h Flying — (H||E) && !B; steed-flyer arm deferred. */
function Flying_dw() {
    const u = game.u || {};
    if (u.Flying) return true;
    return !!(((u.HFlying | 0) || (u.EFlying | 0))
        && !(u.BFlying | 0));
}

/**
 * C ref: do_wear.c learnring — discover type / known enchantment when seen.
 * Named omit: update_inventory (perm invent redraw).
 */
function learnring(ring, observed) {
    if (!ring) return;
    const ringtype = ring.otyp | 0;
    const oc = game.objects?.[ringtype];
    if (observed) {
        if (oc?.oc_name_known) observe_object(ring);
        else if (ring.dknown) makeknown(ringtype);
    }
    if (ring.dknown && oc?.oc_name_known) {
        if (oc?.oc_charged) ring.known = 1;
        // update_inventory deferred
    }
}

/**
 * C ref: do_wear.c adjust_attrib — ABON delta; learnring when ACURR changes
 * or attribute is not at extreme.
 */
function adjust_attrib(obj, which, val) {
    const u = game.u || (game.u = {});
    if (!u.abon) u.abon = { a: [0, 0, 0, 0, 0, 0] };
    if (!u.abon.a) u.abon.a = [0, 0, 0, 0, 0, 0];
    const old_attrib = acurr(which);
    u.abon.a[which] = (u.abon.a[which] | 0) + (val | 0);
    const observable = old_attrib !== acurr(which);
    if (observable || !extremeattr(which)) learnring(obj, observable);
    if (game.flags) game.flags.botl = true;
    if (game.disp) game.disp.botl = true;
}

/**
 * C ref: do_wear.c Ring_on — side effects after setworn into a ring slot.
 * Branch envelope: unwield if needed; SEE_INVIS/INVIS/LEVITATION messages +
 * float_up/spoteffects; adjust_attrib STR/CON/CHA; accuracy/damage;
 * PROTECTION learnring+find_ac; PfSC rescham; WARNING see_monsters;
 * RIN_STEALTH toggle_stealth (D-0970). Named omissions: none for sink
 * fall (dosinkfall via spoteffects D-0976).
 */
export async function Ring_on(obj) {
    if (!obj) return;
    const u = game.u || (game.u = {});
    const oprop = game.objects?.[obj.otyp]?.oc_oprop | 0;
    let oldprop = u.uprops?.[oprop]?.extrinsic | 0;
    // make sure ring isn't wielded
    if (obj === u.uwep) setuwep(null);
    else if (obj === u.uswapwep) setuswapwep(null);
    else if (obj === u.uquiver) setuqwep(null);

    if ((oldprop & W_RING) !== W_RING) oldprop &= ~W_RING;

    const otyp = obj.otyp | 0;
    switch (otyp) {
    case RIN_STEALTH:
        await toggle_stealth(obj, oldprop, true);
        break;
    case RIN_WARNING:
        see_monsters();
        break;
    case RIN_SEE_INVISIBLE:
        set_mimic_blocking();
        see_monsters();
        if (Invis_dw() && !oldprop && !(u.HSee_invisible | 0) && !Blind_dw()) {
            newsym(u.ux | 0, u.uy | 0);
            await pline('Suddenly you are transparent, but there!');
            learnring(obj, true);
        }
        break;
    case RIN_INVISIBILITY:
        if (!oldprop && !(u.HInvis | 0) && !(u.BInvis | 0) && !Blind_dw()) {
            learnring(obj, true);
            newsym(u.ux | 0, u.uy | 0);
            const { self_invis_message } = await import('./trap.js');
            await self_invis_message();
        }
        break;
    case RIN_LEVITATION:
        if (!oldprop && !(u.HLevitation | 0)
            && !((u.BLevitation | 0) & FROMOUTSIDE)) {
            const { float_up } = await import('./trap.js');
            await float_up();
            learnring(obj, true);
            if (Levitation_dw()) {
                const { spoteffects } = await import('./pickup.js');
                await spoteffects(false);
            }
        } else {
            const { float_vs_flight } = await import('./polyself.js');
            float_vs_flight();
        }
        break;
    case RIN_GAIN_STRENGTH:
        adjust_attrib(obj, A_STR, obj.spe | 0);
        break;
    case RIN_GAIN_CONSTITUTION:
        adjust_attrib(obj, A_CON, obj.spe | 0);
        break;
    case RIN_ADORNMENT:
        adjust_attrib(obj, A_CHA, obj.spe | 0);
        break;
    case RIN_INCREASE_ACCURACY:
        u.uhitinc = (u.uhitinc | 0) + (obj.spe | 0);
        break;
    case RIN_INCREASE_DAMAGE:
        u.udaminc = (u.udaminc | 0) + (obj.spe | 0);
        break;
    case RIN_PROTECTION_FROM_SHAPE_CHAN:
        await rescham();
        break;
    case RIN_PROTECTION: {
        const observable = (obj.spe | 0) !== 0;
        learnring(obj, observable);
        if (obj.spe) find_ac();
        break;
    }
    default:
        break;
    }
}

/**
 * C ref: do_wear.c Ring_off_or_gone — clear ring slot + otyp side effects.
 * Branch envelope: setworn clear; SEE_INVIS/INVIS messages + set_mimic_blocking;
 * LEVITATION float_down; accuracy/damage; PROTECTION find_ac; PfSC restartcham;
 * WARNING see_monsters; adjust_attrib STR/CON/CHA; learnring;
 * RIN_STEALTH toggle_stealth (D-0970). Named omissions: none for sink
 * fall (dosinkfall via spoteffects D-0976).
 * @param {object} obj
 * @param {boolean} gone TRUE → destroy/eat path (setnotworn ≡ clear slots)
 */
export async function Ring_off_or_gone(obj, gone) {
    if (!obj) return;
    const u = game.u || (game.u = {});
    const mask = (obj.owornmask | 0) & W_RING;
    if (game.context?.takeoff) {
        game.context.takeoff.mask =
            (game.context.takeoff.mask | 0) & ~mask;
    }
    // gone vs off: both clear via setworn(null, …); setnotworn ≡ clear slots
    void gone;
    if (mask & W_RINGL) setworn(null, W_RINGL);
    if (mask & W_RINGR) setworn(null, W_RINGR);
    // If owornmask already cleared, fall back to slot identity
    if (!(mask & W_RING)) {
        if (obj === u.uleft) setworn(null, W_RINGL);
        else if (obj === u.uright) setworn(null, W_RINGR);
    }

    const otyp = obj.otyp | 0;
    switch (otyp) {
    case RIN_STEALTH:
        // C: toggle_stealth(obj, (EStealth & ~mask), FALSE)
        await toggle_stealth(obj, (u.EStealth | 0) & ~mask, false);
        break;
    case RIN_WARNING:
        see_monsters();
        break;
    case RIN_SEE_INVISIBLE:
        if (!See_invisible_dw()) {
            set_mimic_blocking();
            see_monsters();
        }
        if (Invisible_dw() && !Blind_dw()) {
            newsym(u.ux | 0, u.uy | 0);
            await pline('Suddenly you cannot see yourself.');
            learnring(obj, true);
        }
        break;
    case RIN_INVISIBILITY:
        if (!Invis_dw() && !(u.BInvis | 0) && !Blind_dw()) {
            newsym(u.ux | 0, u.uy | 0);
            await pline(
                `Your body seems to unfade${See_invisible_dw() ? ' completely' : '..'}.`,
            );
            learnring(obj, true);
        }
        break;
    case RIN_LEVITATION:
        if (!((u.BLevitation | 0) & FROMOUTSIDE)) {
            const { float_down } = await import('./trap.js');
            await float_down(0, 0);
            if (!Levitation_dw()) learnring(obj, true);
        } else {
            const { float_vs_flight } = await import('./polyself.js');
            float_vs_flight();
        }
        break;
    case RIN_INCREASE_ACCURACY:
        u.uhitinc = (u.uhitinc | 0) - (obj.spe | 0);
        break;
    case RIN_INCREASE_DAMAGE:
        u.udaminc = (u.udaminc | 0) - (obj.spe | 0);
        break;
    case RIN_PROTECTION: {
        const observable = (obj.spe | 0) !== 0;
        learnring(obj, observable);
        if (obj.spe) find_ac();
        break;
    }
    case RIN_PROTECTION_FROM_SHAPE_CHAN:
        if (!Protection_from_shape_changers_dw()) restartcham();
        break;
    case RIN_GAIN_STRENGTH:
        adjust_attrib(obj, A_STR, -(obj.spe | 0));
        break;
    case RIN_GAIN_CONSTITUTION:
        adjust_attrib(obj, A_CON, -(obj.spe | 0));
        break;
    case RIN_ADORNMENT:
        adjust_attrib(obj, A_CHA, -(obj.spe | 0));
        break;
    default:
        break;
    }
}

/**
 * C ref: do_wear.c Ring_off — Ring_off_or_gone(obj, FALSE).
 */
export async function Ring_off(obj) {
    await Ring_off_or_gone(obj, false);
}

/**
 * C ref: do_wear.c Ring_gone — Ring_off_or_gone(obj, TRUE).
 */
export async function Ring_gone(obj) {
    await Ring_off_or_gone(obj, true);
}

/**
 * C do_wear.c cancel_doff `:1643–1659`. setworn old slot item /
 * setnotworn. Skip cancel_don when I_SPECIAL (do_takeoff 'A'
 * continuation). Always clear slotmask from takeoff.mask.
 * @param {object} obj
 * @param {number} slotmask
 */
export function cancel_doff(obj, slotmask) {
    const doff = takeoff_info();
    if (!((doff.mask | 0) & I_SPECIAL) && donning(obj)) {
        cancel_don(); /* applies to doffing too */
    }
    doff.mask = (doff.mask | 0) & ~slotmask;
}

/**
 * C ref: do_wear.c cancel_don — clear afternmv / multi / takeoff delay.
 * Applies to donning and doffing (C comment).
 */
function cancel_don() {
    const af = game.afternmv;
    if (!game.context) game.context = {};
    if (!game.context.takeoff) game.context.takeoff = {};
    game.context.takeoff.cancelled_don = (af === Cloak_on
        || af === Armor_on
        || af === Shirt_on
        || af === Helmet_on
        || af === Gloves_on
        || af === Boots_on
        || af === Shield_on);
    game.afternmv = null;
    game.nomovemsg = null;
    game.multi = 0;
    game.context.takeoff.delay = 0;
    game.context.takeoff.what = 0;
}

/**
 * C ref: do_wear.c doffing `:1600–1640` — armor via afternmv or
 * takeoff.what; 1-turn accessories/weapons via takeoff.what only.
 */
function doffing(otmp) {
    if (!otmp) return false;
    const u = game.u || {};
    const what = game.context?.takeoff?.what | 0;
    const af = game.afternmv;
    if (otmp === u.uarm) return af === Armor_off || what === WORN_ARMOR;
    if (otmp === u.uarmu) return af === Shirt_off || what === WORN_SHIRT;
    if (otmp === u.uarmc) return af === Cloak_off || what === WORN_CLOAK;
    if (otmp === u.uarmf) return af === Boots_off || what === WORN_BOOTS;
    if (otmp === u.uarmh) return af === Helmet_off || what === WORN_HELMET;
    if (otmp === u.uarmg) return af === Gloves_off || what === WORN_GLOVES;
    if (otmp === u.uarms) return af === Shield_off || what === WORN_SHIELD;
    if (otmp === u.uamul) return what === WORN_AMUL;
    if (otmp === u.uleft) return what === LEFT_RING;
    if (otmp === u.uright) return what === RIGHT_RING;
    if (otmp === u.ublindf) return what === WORN_BLINDF;
    if (otmp === u.uwep) return what === W_WEP;
    if (otmp === u.uswapwep) return what === W_SWAPWEP;
    if (otmp === u.uquiver) return what === W_QUIVER;
    return false;
}

/**
 * C ref: do_wear.c donning — put-on or take-off in progress for otmp.
 */
function donning(otmp) {
    if (!otmp) return false;
    if (doffing(otmp)) return true;
    const u = game.u || {};
    const af = game.afternmv;
    if (otmp === u.uarm) return af === Armor_on;
    if (otmp === u.uarmu) return af === Shirt_on;
    if (otmp === u.uarmc) return af === Cloak_on;
    if (otmp === u.uarmf) return af === Boots_on;
    if (otmp === u.uarmh) return af === Helmet_on;
    if (otmp === u.uarmg) return af === Gloves_on;
    if (otmp === u.uarms) return af === Shield_on;
    return false;
}

/**
 * C ref: do_wear.c stop_donning — interrupt multi-turn armor don/doff.
 * Called from hack.c dosinkfall (and steal). Named omissions: full
 * remove_worn_item armor prop polish beyond setworn clear; accessory
 * takeoff.what-only arms; thesimpleoname vs doname wording.
 * @param {object|null} stolenobj no mesg when already doffing this
 * @returns {Promise<number>} 0, or -multi when silently stopping doff
 */
export async function stop_donning(stolenobj) {
    let otmp = null;
    for (const o of game.invent || []) {
        if (((o.owornmask | 0) & W_ARMOR) && donning(o)) {
            otmp = o;
            break;
        }
    }
    if (!otmp) return 0;

    const putting_on = !doffing(otmp);
    cancel_don();
    // don't want *_on/*_off via unmul — action isn't completing
    game.afternmv = null;
    let result = 0;
    let buf = '';
    if (putting_on || otmp !== stolenobj) {
        const { thesimpleoname } = await import('./objnam.js');
        buf = `You stop ${putting_on ? 'putting on' : 'taking off'} ${thesimpleoname(otmp)}.`;
    } else {
        result = -((game.multi | 0)); // C: before unmul; multi already 0 via cancel_don
    }
    await unmul(buf);
    if (putting_on) {
        // C: remove_worn_item(otmp, FALSE) — clear slot; setworn handles props
        const mask = (otmp.owornmask | 0) & W_ARMOR;
        if (mask) setworn(null, mask);
    }
    return result;
}

/**
 * C ref: invent.c useup — invent consume one (no obj_resists). Local for
 * wornarm_destroyed; floor path not needed for disintegrate_arm.
 */
function invent_useup(otmp) {
    if (!otmp) return;
    if ((otmp.quan || 1) > 1) {
        otmp.quan--;
        return;
    }
    const inv = game.invent || [];
    const idx = inv.indexOf(otmp);
    if (idx >= 0) inv.splice(idx, 1);
    otmp.quan = 0;
    otmp.where = 0; // OBJ_FREE
}

/**
 * C ref: do_wear.c maybe_destroy_armor — match atmp, obj_resists(0,90).
 * @returns {object|null}
 */
function maybe_destroy_armor(armor, atmp, resistedRef) {
    if (armor && (!atmp || atmp === armor)
        && ((resistedRef.v = obj_resists(armor, 0, 90)) === false)) {
        armor.in_use = 1;
        return armor;
    }
    return null;
}

/**
 * C ref: do_wear.c wornarm_destroyed — *_off then invent useup.
 * Named omissions: cancel_don when donning; lava dunk side-effect free.
 */
async function wornarm_destroyed(wornarm) {
    if (!wornarm) return;
    const u = game.u || {};
    const wornoid = wornarm.o_id;
    // cancel_don deferred
    if (wornarm === u.uarmc) await Cloak_off();
    else if (wornarm === u.uarm) await Armor_off();
    else if (wornarm === u.uarmu) Shirt_off();
    else if (wornarm === u.uarmh) Helmet_off();
    else if (wornarm === u.uarmg) Gloves_off();
    else if (wornarm === u.uarmf) await Boots_off();
    else if (wornarm === u.uarms) Shield_off();

    for (const invobj of game.invent || []) {
        if (invobj === wornarm && invobj.o_id === wornoid) {
            invent_useup(wornarm);
            break;
        }
    }
}

/**
 * C ref: do_wear.c disintegrate_arm — destroy one worn armor piece
 * (god_zaps_you / dragon breath / destroy-armor scroll).
 * Named omissions: end_burn lamplit DSM; cancel_don;
 * cloak/suit name polish beyond armor_doff_simple_name.
 * @param {object|null} atmp specific piece or null for any
 * @returns {Promise<number>} 1 if destroyed, else 0
 */
export async function disintegrate_arm(atmp) {
    const u = game.u || {};
    let otmp = null;
    const resistedc = { v: false };
    const resistedsuit = { v: false };
    const resisted = { v: false };
    let losing_gloves = false;

    if ((otmp = maybe_destroy_armor(u.uarmc, atmp, resistedc))) {
        await urgent_pline(
            `Your ${armor_doff_simple_name(otmp)} crumbles and turns to dust!`,
        );
    } else if (!resistedc.v
        && (otmp = maybe_destroy_armor(u.uarm, atmp, resistedsuit))) {
        const suit = armor_doff_simple_name(otmp);
        // end_burn deferred
        await urgent_pline(
            `Your ${suit} ${vtense(suit, 'turn')} to dust and `
            + `${vtense(suit, 'fall')} to the ground!`,
        );
    } else if (!resistedc.v && !resistedsuit.v
        && (otmp = maybe_destroy_armor(u.uarmu, atmp, resisted))) {
        await urgent_pline(
            'Your shirt crumbles into tiny threads and falls apart!',
        );
    } else if ((otmp = maybe_destroy_armor(u.uarmh, atmp, resisted))) {
        await urgent_pline(
            `Your ${armor_doff_simple_name(otmp)} turns to dust and is blown away!`,
        );
    } else if ((otmp = maybe_destroy_armor(u.uarmg, atmp, resisted))) {
        await urgent_pline(
            `Your ${armor_doff_simple_name(otmp)} vanish!`,
        );
        losing_gloves = true;
    } else if ((otmp = maybe_destroy_armor(u.uarmf, atmp, resisted))) {
        await urgent_pline(
            `Your ${armor_doff_simple_name(otmp)} disintegrate!`,
        );
    } else if ((otmp = maybe_destroy_armor(u.uarms, atmp, resisted))) {
        await urgent_pline(
            `Your ${armor_doff_simple_name(otmp)} crumbles away!`,
        );
    } else {
        return 0;
    }

    await wornarm_destroyed(otmp);
    if (losing_gloves) await selftouch('You');
    await stop_occupation();
    return 1;
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

/**
 * C ref: do_wear.c stuck_ring — cursed/welded blocker for removing ring.
 * Used by pray fix_worst_trouble levitation / Fixed_abil paths.
 * @param {object|null} ring
 * @param {number} otyp
 * @returns {object|null}
 */
export function stuck_ring(ring, otyp) {
    const u = game.u || {};
    if (ring !== u.uleft && ring !== u.uright) {
        // C: impossible("stuck_ring: neither left nor right?");
        return null;
    }
    if (ring && (ring.otyp | 0) === (otyp | 0)) {
        const data = game.youmonst?.data;
        if (nolimbs(data) && u.uamul
            && (u.uamul.otyp | 0) === AMULET_OF_UNCHANGING && u.uamul.cursed) {
            return u.uamul;
        }
        const RING_ON_PRIMARY = ((u.uhandedness | 0) === LEFT_HANDED)
            ? u.uleft
            : u.uright;
        if (u.uwep && welded(u.uwep)
            && (ring === RING_ON_PRIMARY || ring_bimanual(u.uwep))) {
            return u.uwep;
        }
        if (u.uarmg && u.uarmg.cursed) return u.uarmg;
        if (ring.cursed) return ring;
        if (u.uarmg && (u.Glib | 0)) return u.uarmg;
    }
    return null;
}

/**
 * C ref: do_wear.c unchanger — worn AMULET_OF_UNCHANGING if any.
 * @returns {object|null}
 */
export function unchanger() {
    const u = game.u || {};
    if (u.uamul && (u.uamul.otyp | 0) === AMULET_OF_UNCHANGING) return u.uamul;
    return null;
}
