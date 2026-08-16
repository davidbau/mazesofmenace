// do_wear.js — Wear / take-off / put-on (partial).
// C ref: do_wear.c — dowear, doputon, canwearobj, accessory_or_armor_on,
// Amulet_on, Armor_on, dotakeoff, armor_or_accessory_off, armoroff, *_off.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import {
    flush_screen, flush_topl_more, pline, You_feel, mark_topline_prompt,
    newsym, see_monsters, urgent_pline,
} from './display.js';
import { yn_function } from './getline.js';
import { an, doname, the, xname, xprname, vtense, otyp_is_charged } from './objnam.js';
import { find_ac } from './u_init.js';
import {
    A_STR, A_CON, A_CHA, acurr, extremeattr, change_luck, Fast, Very_fast,
} from './attrib.js';
import { nomul, unmul, stop_occupation } from './hack.js';
import { retouch_object } from './artifact.js';
import { welded, setuwep, setuswapwep, setuqwep } from './wield.js';
import { makeknown, observe_object } from './invent.js';
import { obj_resists } from './dogmove.js';
import {
    W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU, W_ARMOR,
    W_RING, W_RINGL, W_RINGR, W_AMUL, W_TOOL, W_WEAPONS, W_WEP, W_SWAPWEP,
    W_QUIVER, W_BALL, W_CHAIN, LEFT_RING, RIGHT_RING, W_ART,
    ERODE_BURN, ERODE_RUST, ERODE_ROT, ERODE_CORRODE, ERODE_CRACK, ERODE_NONE,
    ER_NOTHING, ER_DESTROYED, EF_PAY, EF_DESTROY,
    TIMEOUT, BLINDED, FAST, TELEPAT, STEALTH, WORN_BOOTS, WORN_CLOAK, WORN_GLOVES,
    DISPLACED, INVIS, SEE_INVIS, LEVITATION, PROT_FROM_SHAPE_CHANGERS,
    DRAIN_RES, SICK_RES, INFRAVISION, STONE_RES, SLOW_DIGESTION, FREE_ACTION,
    BOLT_LIM, LEFT_HANDED, GLIB, FROMOUTSIDE,
    ARTICLE_YOUR, SUPPRESS_SADDLE, SUPPRESS_HALLUCINATION,
} from './const.js';
import { x_monnam } from './do_name.js';
import {
    ARMOR_CLASS, RING_CLASS, AMULET_CLASS, WEAPON_CLASS, TOOL_CLASS,
    objectNames, objectNameStrs,
} from './objects.js';
import { PM_ARCHEOLOGIST, nolimbs, nohands, verysmall } from './monsters.js';
import {
    is_flammable, is_rustprone, is_rottable, is_corrodeable, is_crackable,
    erosion_matters, is_damageable,
} from './mkobj.js';
import { erode_obj, selftouch } from './trap.js';
import { rn2, rnd } from './rng.js';
import { vision_recalc, set_mimic_blocking } from './vision.js';
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
const AMULET_OF_ESP = objectNames.indexOf('AMULET_OF_ESP');
const AMULET_OF_LIFE_SAVING = objectNames.indexOf('AMULET_OF_LIFE_SAVING');
const AMULET_VERSUS_POISON = objectNames.indexOf('AMULET_VERSUS_POISON');
const AMULET_OF_REFLECTION = objectNames.indexOf('AMULET_OF_REFLECTION');
const FAKE_AMULET_OF_YENDOR = objectNames.indexOf('FAKE_AMULET_OF_YENDOR');
const AMULET_OF_YENDOR = objectNames.indexOf('AMULET_OF_YENDOR');
const AMULET_OF_UNCHANGING = objectNames.indexOf('AMULET_OF_UNCHANGING');
const AMULET_OF_GUARDING = objectNames.indexOf('AMULET_OF_GUARDING');
const AMULET_OF_RESTFUL_SLEEP = objectNames.indexOf('AMULET_OF_RESTFUL_SLEEP');
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
 * Named omit: welded(uwep) branch; Glib fingers_or_gloves retry pline.
 */
export function cursed_check(otmp) {
    if (!otmp) return false;
    if (otmp.cursed) {
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
 * Named omissions: w_blocks, artifact intrinsics, monstunseesu_prop,
 * SWAPWEP/QUIVER skip (not in this setworn path), skin/nudist/tux;
 * mirror of most E* flat fields (BLINDED→EBlinded only so far).
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

/**
 * C ref: worn.c setworn — slot pointer + owornmask + oc_oprop extrinsic.
 * Does **not** call find_ac (C worn.c); allmain once-per-input and a few
 * explicit callers (Ring_on protection, Amulet_on guarding) update uac.
 * opts.skip_find_ac retained as a no-op for D-0722 polyself callers.
 * @param {object|null} obj
 * @param {number} mask
 */
export function setworn(obj, mask, opts = null) {
    const u = game.u || (game.u = {});
    void opts; // skip_find_ac no-op — setworn never find_ac (D-0810)
    const clearOne = (slot, bit) => {
        if (!(mask & bit)) return;
        const old = u[slot];
        if (old) {
            confer_oc_oprop(old, bit, false);
            old.owornmask = (old.owornmask || 0) & ~bit;
        }
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
        // C worn.c setworn — clear left/right independently (D-0699).
        // Prior JS only cleared when mask==W_RING (both bits), so
        // setworn(null, W_RINGL|R) from steal left u.uright dangling.
        if (mask & W_RINGL) clearOne('uleft', W_RINGL);
        if (mask & W_RINGR) clearOne('uright', W_RINGR);
        clearOne('uamul', W_AMUL);
        clearOne('ublindf', W_TOOL);
        clearOne('uball', W_BALL);
        clearOne('uchain', W_CHAIN);
        // C worn.c setworn — no find_ac (D-0810 / D-0722)
        recalc_telepat_range();
        return;
    }

    // Place into the matching armor/accessory slot for this mask.
    let slotBit = 0;
    if (mask & W_ARM) {
        clearOne('uarm', W_ARM);
        slotBit = W_ARM;
        obj.owornmask = (obj.owornmask || 0) | W_ARM;
        u.uarm = obj;
    } else if (mask & W_ARMC) {
        clearOne('uarmc', W_ARMC);
        slotBit = W_ARMC;
        obj.owornmask = (obj.owornmask || 0) | W_ARMC;
        u.uarmc = obj;
    } else if (mask & W_ARMH) {
        clearOne('uarmh', W_ARMH);
        slotBit = W_ARMH;
        obj.owornmask = (obj.owornmask || 0) | W_ARMH;
        u.uarmh = obj;
    } else if (mask & W_ARMS) {
        clearOne('uarms', W_ARMS);
        slotBit = W_ARMS;
        obj.owornmask = (obj.owornmask || 0) | W_ARMS;
        u.uarms = obj;
    } else if (mask & W_ARMG) {
        clearOne('uarmg', W_ARMG);
        slotBit = W_ARMG;
        obj.owornmask = (obj.owornmask || 0) | W_ARMG;
        u.uarmg = obj;
    } else if (mask & W_ARMF) {
        clearOne('uarmf', W_ARMF);
        slotBit = W_ARMF;
        obj.owornmask = (obj.owornmask || 0) | W_ARMF;
        u.uarmf = obj;
    } else if (mask & W_ARMU) {
        clearOne('uarmu', W_ARMU);
        slotBit = W_ARMU;
        obj.owornmask = (obj.owornmask || 0) | W_ARMU;
        u.uarmu = obj;
    } else if (mask & W_AMUL) {
        clearOne('uamul', W_AMUL);
        slotBit = W_AMUL;
        obj.owornmask = (obj.owornmask || 0) | W_AMUL;
        u.uamul = obj;
    } else if (mask & W_RINGL) {
        clearOne('uleft', W_RINGL);
        slotBit = W_RINGL;
        obj.owornmask = (obj.owornmask || 0) | W_RINGL;
        u.uleft = obj;
    } else if (mask & W_RINGR) {
        clearOne('uright', W_RINGR);
        slotBit = W_RINGR;
        obj.owornmask = (obj.owornmask || 0) | W_RINGR;
        u.uright = obj;
    } else if (mask & W_TOOL) {
        clearOne('ublindf', W_TOOL);
        slotBit = W_TOOL;
        obj.owornmask = (obj.owornmask || 0) | W_TOOL;
        u.ublindf = obj;
    } else if (mask & W_BALL) {
        // C worn[] W_BALL → uball (punish / ball.c)
        clearOne('uball', W_BALL);
        slotBit = W_BALL;
        obj.owornmask = (obj.owornmask || 0) | W_BALL;
        u.uball = obj;
    } else if (mask & W_CHAIN) {
        // C worn[] W_CHAIN → uchain
        clearOne('uchain', W_CHAIN);
        slotBit = W_CHAIN;
        obj.owornmask = (obj.owornmask || 0) | W_CHAIN;
        u.uchain = obj;
    }
    if (slotBit) confer_oc_oprop(obj, slotBit, true);
    // C worn.c setworn — no find_ac (D-0810); delay-0 Cloak_on More
    // must paint stale u.uac until allmain find_ac.
    // C worn.c setworn — recalc_telepat_range after prop updates
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
 * Named omissions: Punished set_bc; Eyes of Overworld birth-blind clear;
 * full toggle_blindness see_monsters / Sting / learn_unseen_invent.
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
        if (game.flags) game.flags.botl = true;
        // C toggle_blindness → vision_recalc(0) immediately
        vision_recalc(0);
    }
}

/**
 * C ref: do_wear.c Blindf_off — clear eyewear + see-again / still-blind.
 * Named omissions: gulp_blnd_check; Punished set_bc; full toggle_blindness
 * see_monsters / Sting / learn_unseen_invent.
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
        if (game.flags) game.flags.botl = true;
        vision_recalc(0);
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
        confer_oc_oprop(obj, W_AMUL, false);
        obj.owornmask = (obj.owornmask || 0) & ~W_AMUL;
        u.uamul = null;
        await off_msg(obj);
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
        const ch = await yn_function(query, null, '\0');
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
 * Guarding makeknown; Amulet_off RESTFUL clear; nh_timeout SLEEPY dialogue.
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
 * Ask Right/Left for a ring when both hands free.
 * C ref: do_wear.c accessory_or_armor_on —
 *   yn_function(qbuf, rightleftchars, '\0', TRUE).
 * Deferred: poly/non-humanoid body_part(FINGER) wording; query_menu.
 */
async function choose_ring_hand() {
    // C: Sprintf(qbuf, "Which %s%s, Right or Left?", "ring-", finger)
    // yn_function / tty_yn_function appends " [rl] " (no (def) when '\0').
    const q = 'Which ring-finger, Right or Left?';
    for (;;) {
        const answer = await yn_function(q, 'rl', '\0');
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
 * (Punished set_bc / full toggle_blindness see_monsters still deferred).
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
        if (otyp_is_charged(ringtype) || oc.oc_charged) ring.known = 1;
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
        rescham();
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
 * C ref: do_wear.c doffing — armor currently being taken off via afternmv
 * or takeoff.what. Accessory takeoff.what arms deferred.
 */
function doffing(otmp) {
    if (!otmp) return false;
    const u = game.u || {};
    const what = game.context?.takeoff?.what | 0;
    const af = game.afternmv;
    if (otmp === u.uarm) return af === Armor_off || what === W_ARM;
    if (otmp === u.uarmu) return af === Shirt_off || what === W_ARMU;
    if (otmp === u.uarmc) return af === Cloak_off || what === W_ARMC;
    if (otmp === u.uarmf) return af === Boots_off || what === W_ARMF;
    if (otmp === u.uarmh) return af === Helmet_off || what === W_ARMH;
    if (otmp === u.uarmg) return af === Gloves_off || what === W_ARMG;
    if (otmp === u.uarms) return af === Shield_off || what === W_ARMS;
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
