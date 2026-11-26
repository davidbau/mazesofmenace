// do_wear.js -- wearing armor and accessories.
// C ref: do_wear.c
//
// Ported so far: the #wear and #puton commands (equip_ok(), wear_ok(),
// puton_ok(), canwearobj(), accessory_or_armor_on()), the armor X_on()
// routines (run directly or as afternmv after the donning delay), rings
// whose effect is only their extrinsic property, Amulet_on() for the
// common amulets, Blindf_on(), #takeoff with the X_off() routines, and
// donning()/doffing()/cancel_don()/cancel_doff().

import { x_monnam, hcolor } from './do_name.js';
import { ARTICLE_YOUR, SUPPRESS_SADDLE, SUPPRESS_HALLUCINATION, NECK,
         Is_waterlevel, Is_airlevel } from './const.js';
import { curse } from './mkobj.js';
import { Hallucination, Underwater, Swimming, Breathless } from './youprop.js';
import { ACURR, ABASE, ABON, ATEMP } from './attrib.js';
import { begin_burn, end_burn } from './timeout.js';
import { hliquid } from './potion.js';
import { drown } from './trap.js';
import { is_pool_or_lava } from './hack.js';
import { set_bc } from './ball.js';
import { M1_SWIM, M1_AMPHIBIOUS } from './monsters.js';
import { cantweararm } from './worn.js';
import { has_horns } from './polyself.js';
import { impossible } from './hack.js';
import { is_flyer, nohands, verysmall, bigmonst, humanoid, slithy,
         noncorporeal, is_whirly, mindless, has_head, breathless,
         num_horns } from './mondata.js';
import { itimeout } from './potion.js';
import { game } from './gstate.js';
import { make_slimed, make_glib, make_hallucinated } from './potion.js';
import { pline, You, Your, There, pline_The, newsym, see_monsters,
         You_feel } from './display.js';
import { getobj, silly_thing } from './invent.js';
import { GETOBJ_SUGGEST, GETOBJ_DOWNPLAY, GETOBJ_EXCLUDE,
         GETOBJ_EXCLUDE_INACCESS, GETOBJ_NOFLAGS, ECMD_OK, ECMD_CANCEL,
         ECMD_TIME, W_ARMOR, W_ACCESSORY } from './const.js';
import { ARMOR_CLASS, RING_CLASS, AMULET_CLASS, MEAT_RING, BLINDFOLD, TOWEL,
         LENSES, is_helmet, is_shield, is_cloak, is_shirt, is_suit, is_sword,
         is_flimsy, is_boots, is_gloves, bimanual, is_metallic, is_crackable,
         is_rustprone, is_corrodeable } from './objects.js';
import { M1_NOHANDS, MZ_SMALL, MZ_LARGE, MZ_HUGE, M1_NOLIMBS, M1_HUMANOID,
         M1_NOHEAD, M1_SLITHY, M1_FLY, M1_MINDLESS, M1_BREATHLESS, S_CENTAUR,
         S_GHOST, S_VORTEX, mons, PM_AIR_ELEMENTAL, PM_MARILITH,
         PM_WINGED_GARGOYLE, PM_HORNED_DEVIL, PM_MINOTAUR, PM_ASMODEUS,
         PM_BALROG, PM_WHITE_UNICORN, PM_GRAY_UNICORN, PM_BLACK_UNICORN,
         PM_KI_RIN, PM_WIZARD } from './monsters.js';
import { xname, an, makeplural, Tobjnam, obj_is_pname } from './objnam.js';
import { vision_recalc } from './vision.js';
import { HEAD, BLINDED, TELEPAT, INFRAVISION } from './const.js';
import * as O from './objects.js';
import { prinv } from './invent.js';
import { tty_yn_function } from './wintty.js';
import { body_part } from './insight.js';
import { setworn, setuwep, setuswapwep, setuqwep, welded,
         retouch_object } from './wield.js';
import { W_RING, W_AMUL, W_TOOL, W_SADDLE, W_WEAPONS, LEFT_RING, RIGHT_RING,
         FINGER, GLIB } from './const.js';
import { W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU, W_WEP,
         W_SWAPWEP, W_QUIVER, I_SPECIAL, ACID_RES, TT_BEARTRAP, TT_INFLOOR,
         TT_LAVA, TT_BURIEDBALL, HAND, FOOT, LEG, FACE } from './const.js';
import { STEALTH, DISPLACED, INVIS, SEE_INVIS, DETECT_MONSTERS, FLYING,
         LEVITATION, FUMBLING, SLEEPY, MAGICAL_BREATHING, SLIMED,
         UNCHANGING, FAST, DRAIN_RES, SICK_RES, FREE_ACTION, STONE_RES,
         SLOW_DIGESTION, A_CHA, A_DEX, A_INT, A_WIS, TIMEOUT, STRANGLED, INTRINSIC,
         P_SHORT_SWORD, P_SABER } from './const.js';
import { objects, ARM_SUIT, ARM_SHIELD, ARM_HELM, ARM_GLOVES, ARM_BOOTS,
         ARM_CLOAK, ARM_SHIRT } from './objects.js';
import { PM_ARCHEOLOGIST, PM_COCKATRICE, PM_CHICKATRICE, PM_CLERIC } from './monsters.js';
import { WARN_OF_MON } from './const.js';
import { addinv_core2 } from './invent.js';
import { You_cant } from './display.js';
import { doname, cloak_simple_name, suit_simple_name, helm_simple_name,
         gloves_simple_name, boots_simple_name, shield_simple_name,
         shirt_simple_name } from './objnam.js';
import { the, thesimpleoname } from './iactions.js';
import { change_luck } from './attrib.js';
import { nomul } from './hack.js';
import { encumber_msg } from './pickup.js';
import { racial_exception } from './worn.js';
import { surface } from './iactions.js';
import { discover_object, makeknown } from './o_init.js';
import { find_ac } from './u_init.js';
import { remove_worn_item } from './steal.js';
import { float_vs_flight } from './polyself.js';
import { unmul } from './allmain.js';
import { monsndx } from './mondata.js';
import { rnd } from './rng.js';
import { region_danger } from './region.js';
import { Blind, Glib, Invisible, Levitation, Flying } from './youprop.js';
import { Upolyd, Role_if } from './const.js';
import { uprop } from './youprop.js';
import { setnotworn as setnotworn_dw } from './worn.js';
import { arti_light_description } from './light.js';
import { Yname2, otense } from './objnam.js';
import { rn2 as rn2_dw } from './rng.js';
import { which_armor as which_armor_dw } from './worn.js';
import { erode_obj } from './trap.js';
import { stop_occupation as stop_occupation_dw } from './allmain.js';
import { is_flammable, is_rottable, erosion_matters,
         is_damageable } from './mkobj.js';
import { ERODE_BURN, ERODE_RUST, ERODE_CRACK, ERODE_ROT, ERODE_CORRODE,
         ERODE_NONE, ER_NOTHING, ER_DESTROYED, EF_PAY,
         EF_DESTROY } from './const.js';
import { WORN_BLINDF as WORN_BLINDF_DW, W_WEP as W_WEP_DW,
         WORN_SHIELD as WORN_SHIELD_DW, WORN_GLOVES as WORN_GLOVES_DW,
         LEFT_RING as LEFT_RING_DW, RIGHT_RING as RIGHT_RING_DW,
         WORN_CLOAK as WORN_CLOAK_DW, WORN_HELMET as WORN_HELMET_DW,
         WORN_AMUL as WORN_AMUL_DW, WORN_ARMOR as WORN_ARMOR_DW,
         WORN_SHIRT as WORN_SHIRT_DW, WORN_BOOTS as WORN_BOOTS_DW,
         W_SWAPWEP as W_SWAPWEP_DW, W_QUIVER as W_QUIVER_DW,
         MENU_FULL as MENU_FULL_DW, MENU_TRADITIONAL as MENU_TRADITIONAL_DW,
         MENU_COMBINATION as MENU_COMBINATION_DW, WORN_TYPES as WORN_TYPES_DW,
         ALL_TYPES as ALL_TYPES_DW, UNPAID_TYPES as UNPAID_TYPES_DW,
         BUCX_TYPES as BUCX_TYPES_DW, PICK_ANY as PICK_ANY_DW,
         ALL_TYPES_SELECTED as ALL_TYPES_SELECTED_DW,
         SIGNAL_NOMENU as SIGNAL_NOMENU_DW, USE_INVLET as USE_INVLET_DW,
         INVORDER_SORT as INVORDER_SORT_DW } from './const.js';
import { empty_handed as empty_handed_dw } from './insight.js';
import { set_occupation as set_occupation_dw } from './allmain.js';
import { wearing_armor as wearing_armor_dw, is_worn as is_worn_dw } from './invent.js';
import { add_valid_menu_class as add_valid_menu_class_dw,
         menu_class_present as menu_class_present_dw,
         is_worn_by_type as is_worn_by_type_dw,
         query_category as query_category_dw,
         query_objlist as query_objlist_dw } from './pickup.js';
import { is_pool as is_pool_bo, is_lava as is_lava_bo } from './makemon.js';
import { M1_CLING as M1_CLING_BO } from './monsters.js';
import { has_ceiling as has_ceiling_bo } from './insight.js';
import { spoteffects as spoteffects_bo } from './hack.js';
import { float_down as float_down_bo } from './trap.js';
import { FROMOUTSIDE as FROMOUTSIDE_BO } from './const.js';
import { artifact_light } from './artifact.js';
import { obj_resists as obj_resists_dw } from './dogmove.js';
import { urgent_pline as urgent_pline_dw } from './display.js';
import { vtense as vtense_dw } from './objnam.js';
import { useup as useup_dw } from './invent.js';
import { selftouch as selftouch_dw } from './trap.js';
import { float_up as float_up_dw } from './trap.js';
import { gulp_blnd_check } from './mhitu.js';

/* C ref: decl.c c_armor ... c_that_ */
const c_armor = "armor", c_suit = "suit", c_shirt = "shirt",
    c_cloak = "cloak", c_gloves = "gloves", c_boots = "boots",
    c_helmet = "helmet", c_shield = "shield", c_weapon = "weapon",
    c_sword = "sword", c_axe = "axe", c_that_ = "that";
void c_helmet;

/* C ref: obj.h WrappingAllowed() */
function WrappingAllowed(mptr) {
    return humanoid(mptr) && mptr.msize >= MZ_SMALL && mptr.msize <= MZ_HUGE
        && !noncorporeal(mptr) && mptr.mlet !== S_CENTAUR
        && mptr !== mons[PM_WINGED_GARGOYLE] && mptr !== mons[PM_MARILITH];
}

// C ref: do_wear.c fingers_or_gloves() -- plural "fingers" or optionally
// "gloves"
export function fingers_or_gloves(check_gloves) {
    return ((check_gloves && game.uarmg)
            ? gloves_simple_name(game.uarmg) /* "gloves" or "gauntlets" */
            : makeplural(body_part(FINGER))); /* "fingers" */
}

// C ref: do_wear.c equip_ok() -- getobj callback for objects to wear or
// remove
function equip_ok(obj, removing, accessory) {
    if (!obj)
        return GETOBJ_EXCLUDE;

    /* ignore for putting on if already worn, or removing if not worn */
    const is_worn = ((obj.owornmask & (W_ARMOR | W_ACCESSORY)) !== 0);
    if (removing !== is_worn)
        return GETOBJ_EXCLUDE_INACCESS;

    /* exclude most object classes outright */
    if (obj.oclass !== ARMOR_CLASS && obj.oclass !== RING_CLASS
        && obj.oclass !== AMULET_CLASS) {
        /* ... except for a few wearable exceptions outside these classes */
        if (obj.otyp !== MEAT_RING && obj.otyp !== BLINDFOLD
            && obj.otyp !== TOWEL && obj.otyp !== LENSES)
            return GETOBJ_EXCLUDE;
    }

    /* armor with 'P' or 'R' or accessory with 'W' or 'T' */
    if (accessory !== (obj.oclass !== ARMOR_CLASS))
        return GETOBJ_DOWNPLAY;

    /* armor we can't wear, e.g. from polyform */
    if (obj.oclass === ARMOR_CLASS && !removing
        && !canwearobj_quiet(obj, { mask: 0 }))
        return GETOBJ_EXCLUDE_INACCESS;

    /* removing inaccessible equipment */
    if (removing && !game.item_action_in_progress) {
        if (inaccessible_equipment(obj, null,
                                   (obj.oclass === RING_CLASS)))
            return GETOBJ_EXCLUDE_INACCESS;
    }

    /* all good to go */
    return GETOBJ_SUGGEST;
}

// C ref: do_wear.c puton_ok(), wear_ok()
function puton_ok(obj) {
    return equip_ok(obj, false, true);
}
function wear_ok(obj) {
    return equip_ok(obj, false, false);
}

// C ref: do_wear.c dowear() -- the #wear command
export async function dowear() {
    /* cantweararm() checks for suits of armor, not what we want here;
       verysmall() or nohands() checks for shields, gloves, etc... */
    if (verysmall(game.youmonst.data) || nohands(game.youmonst.data)) {
        await pline("Don't even bother.");
        return ECMD_OK;
    }
    if (game.uarm && game.uarmu && game.uarmc && game.uarmh && game.uarms
        && game.uarmg && game.uarmf && game.uleft && game.uright
        && game.uamul && game.ublindf) {
        /* 'W' message doesn't mention accessories */
        await You("are already wearing a full complement of armor.");
        return ECMD_OK;
    }
    const otmp = await getobj("wear", wear_ok, GETOBJ_NOFLAGS);
    return otmp ? await accessory_or_armor_on(otmp) : ECMD_CANCEL;
}

// C ref: do_wear.c doputon() -- the #puton command
export async function doputon() {
    if (game.uleft && game.uright && game.uamul && game.ublindf
        && game.uarm && game.uarmu && game.uarmc && game.uarmh && game.uarms
        && game.uarmg && game.uarmf) {
        /* 'P' message doesn't mention armor */
        await Your(`${humanoid(game.youmonst.data) ? "ring-" : ""}${
            fingers_or_gloves(false)} are full, and you're already wearing an amulet and ${
            (game.ublindf.otyp === LENSES) ? "some lenses" : "a blindfold"}.`);
        return ECMD_OK;
    }
    const otmp = await getobj("put on", puton_ok, GETOBJ_NOFLAGS);
    return otmp ? await accessory_or_armor_on(otmp) : ECMD_CANCEL;
}

// C ref: do_wear.c on_msg() -- for items that involve no delay
async function on_msg(otmp) {
    /* on_msg() for rings and amulets just shows add-to-invent feedback
       [after caller calls setworn(), for suffix: "(on {left|right} hand)"
       or "(being worn)"]; eyewear too unless giving verbose message below */
    if ((otmp.owornmask & (W_RING | W_AMUL)) !== 0
        || ((otmp.owornmask & W_TOOL) !== 0 && !(game.flags?.verbose ?? true))) {
        await prinv(null, otmp, 0);
        return;
    }
    if (game.flags?.verbose ?? true) {
        /* call xname() before obj_is_pname(); formatting obj's name
           might set obj->dknown and that affects the pname test */
        const otmp_name = xname(otmp);
        let how = '';

        if (otmp.otyp === TOWEL)
            how = ` around your ${body_part(HEAD)}`;
        await You(`are now wearing ${
            obj_is_pname(otmp) ? the(otmp_name) : an(otmp_name)}${how}.`);
    }
}

/* C ref: color.h NH_BLACK */
const NH_BLACK = "black";

/* C ref: mondata.h cant_drown() */
function cant_drown(ptr) {
    return ((ptr.mflags1 & M1_SWIM) !== 0 || (ptr.mflags1 & M1_AMPHIBIOUS) !== 0
            || breathless(ptr));
}

// C ref: do_wear.c toggle_stealth() -- putting on or taking off an item
// which confers stealth; give feedback and discover it iff stealth state
// is changing
async function toggle_stealth(obj,
                              oldprop, /* prop[].extrinsic, with obj->owornmask pre-stripped */
                              on) {
    const g = game;
    if (on ? g.initial_don : takeoff_ctx().cancelled_don)
        return;

    if (!oldprop /* extrinsic stealth from something else */
        && !uprop(STEALTH).intrinsic /* intrinsic stealth */
        && !uprop(STEALTH).blocked) { /* stealth blocked by something */
        if (obj.otyp === O.RIN_STEALTH)
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
            const riding = (g.u.usteed != null);

            await You(`${riding ? "and " : "sure"}${
                riding ? x_monnam(g.u.usteed, ARTICLE_YOUR, null,
                                  (SUPPRESS_SADDLE | SUPPRESS_HALLUCINATION),
                                  false)
                       : ""} are noisy.`);
        }
    }
}

// C ref: do_wear.c toggle_displacement() -- putting on or taking off an
// item which confers displacement
async function toggle_displacement(obj,
                                   oldprop, /* prop[].extrinsic, with obj->owornmask
                                               stripped by caller */
                                   on) {
    const g = game;
    const u = g.u;
    if (on ? g.initial_don : takeoff_ctx().cancelled_don)
        return;

    const Unblind_telepat = !!uprop(TELEPAT).extrinsic;
    const Blind_telepat = !!(uprop(TELEPAT).intrinsic || uprop(TELEPAT).extrinsic);
    const Detect_monsters = !!(uprop(DETECT_MONSTERS).intrinsic
                               || uprop(DETECT_MONSTERS).extrinsic);
    if (!oldprop /* extrinsic displacement from something else */
        && !(uprop(DISPLACED).intrinsic) /* timed, from eating */
        && !(uprop(DISPLACED).blocked) /* (theoretical) */
        /* we don't use canseeself() here because it augments vision
           with touch, which isn't appropriate for deciding whether
           we'll notice that monsters have trouble spotting the hero */
        && ((!Blind()         /* see anything */
             && !u.uswallow /* see surroundings */
             && !Invisible()) /* see self */
            /* actively sensing nearby monsters via telepathy or extended
               monster detection overrides vision considerations because
               hero also senses self in this situation */
            || (Unblind_telepat
                || (Blind_telepat && Blind())
                || Detect_monsters))) {
        if (obj)
            makeknown(obj.otyp);

        await You_feel(`that monsters${on ? "" : " no longer"} have difficulty pinpointing your location.`);
    }
}

/*
 * The Type_on() functions should be called *after* setworn().
 * The Type_off() functions call setworn() themselves.
 * [Blindf_on() is an exception and calls setworn() itself.]
 */

// C ref: timeout.c itimeout(), itimeout_incr(), incr_itimeout()
function incr_itimeout(prop, incr) {
    const p = uprop(prop);
    p.intrinsic = (p.intrinsic & ~TIMEOUT) | itimeout((p.intrinsic & TIMEOUT) + incr);
}

// C ref: do_wear.c Boots_on()
async function Boots_on() {
    const g = game;
    const u = g.u;
    const oldprop = uprop(objects[g.uarmf.otyp].oc_oprop).extrinsic & ~W_ARMF;

    switch (g.uarmf.otyp) {
    case O.LOW_BOOTS:
    case O.IRON_SHOES:
    case O.HIGH_BOOTS:
    case O.JUMPING_BOOTS:
    case O.KICKING_BOOTS:
        break;
    case O.WATER_WALKING_BOOTS:
        /* spoteffects() doesn't get called here; pooleffects() is called
           during movement and u.uinwater is already False after setworn() */
        if (u.uinwater)
            await spoteffects_bo(true);
        /* init'd in accessory_or_armor_on() and only used here */
        if (g.wasinwater) {
            if (!u.uinwater)
                makeknown(O.WATER_WALKING_BOOTS);
            g.wasinwater = 0;
        }
        break;
    case O.SPEED_BOOTS:
        /* Speed boots are still better than intrinsic speed, */
        /* though not better than potion speed */
        if (!oldprop && !(uprop(FAST).intrinsic & TIMEOUT)) {
            makeknown(g.uarmf.otyp);
            await You_feel(`yourself speed up${
                (oldprop || uprop(FAST).intrinsic) ? " a bit more" : ""}.`);
        }
        break;
    case O.ELVEN_BOOTS:
        await toggle_stealth(g.uarmf, oldprop, true);
        break;
    case O.FUMBLE_BOOTS:
        if (!oldprop && !(uprop(FUMBLING).intrinsic & ~TIMEOUT))
            incr_itimeout(FUMBLING, rnd(20));
        break;
    case O.LEVITATION_BOOTS:
        if (!oldprop && !uprop(LEVITATION).intrinsic
            && !((uprop(LEVITATION).blocked || 0) & FROMOUTSIDE_BO)) {
            g.uarmf.known = 1; /* might come off if putting on over a sink,
                                * so uarmf could be Null below; status line
                                * gets updated during brief interval they're
                                * worn so hero and player learn enchantment */
            g.disp_botl = true; /* status hilites might mark AC changed */
            makeknown(g.uarmf.otyp);
            await float_up_dw();
            if (Levitation())
                await spoteffects_bo(false); /* for sink effect */
        } else {
            float_vs_flight(); /* maybe toggle BFlying's I_SPECIAL */
        }
        break;
    default:
        impossible(`Unknown type of boots (${g.uarmf.otyp})`);
    }
    /* uarmf could be Null here (levitation boots put on over a sink) */
    if (g.uarmf && !g.uarmf.known) {
        g.uarmf.known = 1; /* boots' +/- evident because of status line AC */
        /* update_inventory(): no perm_invent */
    }
    return 0;
}

// C ref: do_wear.c Cloak_on()
async function Cloak_on() {
    const g = game;
    const oldprop = uprop(objects[g.uarmc.otyp].oc_oprop).extrinsic & ~W_ARMC;

    switch (g.uarmc.otyp) {
    case O.ORCISH_CLOAK:
    case O.DWARVISH_CLOAK:
    case O.CLOAK_OF_MAGIC_RESISTANCE:
    case O.ROBE:
    case O.LEATHER_CLOAK:
        break;
    case O.CLOAK_OF_PROTECTION:
        makeknown(g.uarmc.otyp);
        break;
    case O.ELVEN_CLOAK:
        await toggle_stealth(g.uarmc, oldprop, true);
        break;
    case O.CLOAK_OF_DISPLACEMENT:
        await toggle_displacement(g.uarmc, oldprop, true);
        break;
    case O.MUMMY_WRAPPING:
    case O.CLOAK_OF_INVISIBILITY:
        throw new Error('Cloak_on(): invisibility cloaks not ported yet');
    case O.OILSKIN_CLOAK:
        await pline(`${Tobjnam(g.uarmc, "fit")} very tightly.`);
        break;
    /* Alchemy smock gives poison _and_ acid resistance */
    case O.ALCHEMY_SMOCK:
        uprop(ACID_RES).extrinsic |= W_ARMC;
        break;
    default:
        impossible(`Unknown type of cloak (${g.uarmc.otyp})`);
    }
    if (g.uarmc && !g.uarmc.known) { /* no known instance of !uarmc here */
        g.uarmc.known = 1; /* cloak's +/- evident because of status line AC */
        /* update_inventory(): no perm_invent */
    }
    return 0;
}

// C ref: do_wear.c Helmet_on()
async function Helmet_on() {
    const g = game;
    switch (g.uarmh.otyp) {
    case O.FEDORA:
        if (Role_if(PM_ARCHEOLOGIST))
            change_luck(1);
        break;
    case O.HELMET:
    case O.DENTED_POT:
    case O.ELVEN_LEATHER_HELM:
    case O.DWARVISH_IRON_HELM:
    case O.ORCISH_HELM:
    case O.HELM_OF_TELEPATHY:
        break;
    case O.HELM_OF_CAUTION:
        see_monsters();
        break;
    case O.HELM_OF_BRILLIANCE:
        adj_abon(g.uarmh, g.uarmh.spe);
        break;
    case O.CORNUTHAUM:
        /* people think marked wizards know what they're talking about,
           but it takes trained arrogance to pull it off, and the actual
           enchantment of the hat is irrelevant */
        g.u.abon.a[A_CHA] += (Role_if(PM_WIZARD) ? 1 : -1);
        g.disp_botl = true;
        makeknown(g.uarmh.otyp);
        break;
    case O.HELM_OF_OPPOSITE_ALIGNMENT:
        throw new Error('Helmet_on(): uchangealign() not ported yet');
    case O.DUNCE_CAP: {
        const uarmh = g.uarmh;
        if (uarmh && !uarmh.cursed) {
            if (Blind())
                await pline(`${Tobjnam(uarmh, "vibrate")} for a moment.`);
            else
                await pline(`${Tobjnam(uarmh, "glow")} ${hcolor(NH_BLACK)} for a moment.`);
            curse(uarmh);
            /* curse() doesn't touch bknown so doesn't update persistent
               inventory; do so now [set_bknown() calls update_inventory()] */
            if (Blind())
                uarmh.bknown = 0; /* set_bknown(uarmh, 0): lose bknown if previously set */
            else if (Role_if(PM_CLERIC))
                uarmh.bknown = 1; /* set_bknown(uarmh, 1): (bknown should already be set) */
            /* else if (uarmh->bknown) update_inventory(): no perm_invent */
        }
        g.disp_botl = true; /* reveal new alignment or INT & WIS */
        if (Hallucination()) {
            await pline("My brain hurts!"); /* Monty Python's Flying Circus */
        } else if (g.uarmh && g.uarmh.otyp === O.DUNCE_CAP) {
            await You_feel(`${ /* track INT change; ignore WIS */
                ACURR(A_INT)
                    <= (ABASE(A_INT) + ABON(A_INT) + ATEMP(A_INT))
                    ? "like sitting in a corner"
                    : "giddy"}.`);
        } else {
            /* [message formerly given here moved to uchangealign()] */
            makeknown(O.HELM_OF_OPPOSITE_ALIGNMENT);
        }
        break;
    }
    default:
        impossible(`Unknown type of helmet (${g.uarmh.otyp})`);
    }
    /* uarmh could be Null due to uchangealign() */
    if (g.uarmh && !g.uarmh.known) {
        g.uarmh.known = 1; /* helmet's +/- evident because of status line AC */
        /* update_inventory(): no perm_invent */
    }
    return 0;
}

// C ref: do_wear.c hard_helmet() -- headgear that protects against bonks
export function hard_helmet(obj) {
    if (!obj || !is_helmet(obj))
        return false;
    return (is_metallic(obj) || is_crackable(obj)) ? true : false;
}

// C ref: do_wear.c Gloves_on()
async function Gloves_on() {
    const g = game;
    const oldprop = uprop(objects[g.uarmg.otyp].oc_oprop).extrinsic & ~W_ARMG;

    switch (g.uarmg.otyp) {
    case O.LEATHER_GLOVES:
        break;
    case O.GAUNTLETS_OF_FUMBLING:
        if (!oldprop && !(uprop(FUMBLING).intrinsic & ~TIMEOUT))
            incr_itimeout(FUMBLING, rnd(20));
        break;
    case O.GAUNTLETS_OF_POWER:
        makeknown(g.uarmg.otyp);
        g.disp_botl = true; /* taken care of in attrib.c */
        break;
    case O.GAUNTLETS_OF_DEXTERITY:
        adj_abon(g.uarmg, g.uarmg.spe);
        break;
    default:
        impossible(`Unknown type of gloves (${g.uarmg.otyp})`);
    }
    if (!g.uarmg.known) {
        g.uarmg.known = 1; /* gloves' +/- evident because of status line AC */
        /* update_inventory(): no perm_invent */
    }
    return 0;
}

// C ref: do_wear.c Shield_on()
async function Shield_on() {
    const g = game;
    /* no shield currently requires special handling when put on, but we
       keep this uncommented in case somebody adds a new one which does
       [the magical shields are handled by setting u.uprops[*].extrinsic
       in setworn() called by armor_or_accessory_on() before Shield_on()] */
    switch (g.uarms.otyp) {
    case O.SMALL_SHIELD:
    case O.SHIELD_OF_DRAIN_RESISTANCE:
    case O.SHIELD_OF_SHOCK_RESISTANCE:
    case O.ELVEN_SHIELD:
    case O.URUK_HAI_SHIELD:
    case O.ORCISH_SHIELD:
    case O.DWARVISH_ROUNDSHIELD:
    case O.LARGE_SHIELD:
    case O.SHIELD_OF_REFLECTION:
        break;
    default:
        impossible(`Unknown type of shield (${g.uarms.otyp})`);
    }
    if (!g.uarms.known) {
        g.uarms.known = 1; /* shield's +/- evident because of status line AC */
        /* update_inventory(): no perm_invent */
    }
    return 0;
}

// C ref: do_wear.c Shirt_on()
async function Shirt_on() {
    const g = game;
    /* no shirt currently requires special handling when put on, but we
       keep this uncommented in case somebody adds a new one which does */
    switch (g.uarmu.otyp) {
    case O.HAWAIIAN_SHIRT:
    case O.T_SHIRT:
        break;
    default:
        impossible(`Unknown type of shirt (${g.uarmu.otyp})`);
    }
    if (!g.uarmu.known) {
        g.uarmu.known = 1; /* shirt's +/- evident because of status line AC */
        /* update_inventory(): no perm_invent */
    }
    return 0;
}

// C ref: do_wear.c Armor_on()
async function Armor_on() {
    const g = game;
    if (!g.uarm) /* no known instances of !uarm here but play it safe */
        return 0;
    if (!g.uarm.known) {
        g.uarm.known = 1; /* suit's +/- evident because of status line AC */
        /* update_inventory(): no perm_invent */
    }
    await dragon_armor_handling(g.uarm, true, true);
    /* gold DSM requires extra handling since it emits light when worn;
       do that after the special armor handling */
    if (artifact_light(g.uarm) && !g.uarm.lamplit) {
        begin_burn(g.uarm, false);
        if (!Blind())
            await pline(`${Yname2(g.uarm)} ${otense(g.uarm, "begin")} to shine ${
                arti_light_description(g.uarm)}!`);
    }
    return 0;
}

// C ref: do_wear.c Amulet_on()
async function Amulet_on(amul) {
    const g = game;
    let on_msg_done = false;

    /* make sure amulet isn't wielded/alt-wielded/quivered, before wearing */
    await remove_worn_item(amul, false);
    setworn(amul, W_AMUL);

    switch (g.uamul.otyp) {
    case O.AMULET_OF_ESP:
    case O.AMULET_OF_LIFE_SAVING:
    case O.AMULET_VERSUS_POISON:
    case O.AMULET_OF_REFLECTION:
    case O.FAKE_AMULET_OF_YENDOR:
        break;
    case O.AMULET_OF_MAGICAL_BREATHING: {
        /* amulet is already on; we need to check hero's gas-cloud status
           when it was off */
        uprop(MAGICAL_BREATHING).extrinsic &= ~W_AMUL;
        const was_in_poison_gas = region_danger();
        uprop(MAGICAL_BREATHING).extrinsic |= W_AMUL;
        if (was_in_poison_gas)
            throw new Error('Amulet_on(): leaving poison gas not ported yet');
        /* no need to check for becoming able to breathe underwater;
           if we are underwater, we already can or we would have drowned */
        break;
    }
    case O.AMULET_OF_UNCHANGING:
        if (uprop(SLIMED).intrinsic)
            await make_slimed(0, null);
        break;
    case O.AMULET_OF_CHANGE:
        throw new Error('Amulet_on(): amulet of change (change_sex()) not ported yet');
    case O.AMULET_OF_STRANGULATION:
        /* note: might already be Strangled (via #wizintrinsic) */
        if (can_be_strangled_you() && !uprop(STRANGLED).intrinsic)
            throw new Error('Amulet_on(): amulet of strangulation not ported yet');
        break;
    case O.AMULET_OF_RESTFUL_SLEEP: {
        const newnap = rnd(98) + 2, oldnap = (uprop(SLEEPY).intrinsic & TIMEOUT);

        if (newnap < oldnap || oldnap === 0)
            /* avoid clobbering FROMOUTSIDE bit, which might have
               gotten set by previously eating one of these amulets */
            uprop(SLEEPY).intrinsic = (uprop(SLEEPY).intrinsic & ~TIMEOUT) | newnap;
        break;
    }
    case O.AMULET_OF_FLYING:
        /* setworn() has already set extrinsic flying */
        float_vs_flight(); /* block flying if levitating */
        if (Flying()) {
            /* to determine whether this flight is new we have to muck
               about in the Flying intrinsic (actually extrinsic) */
            uprop(FLYING).extrinsic &= ~W_AMUL;
            const already_flying = Flying();
            uprop(FLYING).extrinsic |= W_AMUL;

            if (!already_flying) {
                makeknown(O.AMULET_OF_FLYING);
                await on_msg(g.uamul);
                on_msg_done = true;
                g.disp_botl = true; /* status: 'Fly' On */
                await You("are now in flight.");
            }
        }
        break;
    case O.AMULET_OF_GUARDING:
        makeknown(O.AMULET_OF_GUARDING);
        find_ac();
        break;
    case O.AMULET_OF_YENDOR:
        break;
    }

    if (!on_msg_done)
        await on_msg(g.uamul);
}

// C ref: do_wear.c Amulet_off()
export async function Amulet_off() {
    const g = game;
    const amul = g.uamul; /* for off_msg() after setworn(NULL,W_AMUL) */
    let mkn = false, early_off_msg = false;

    takeoff_ctx().mask &= ~W_AMUL;

    switch (g.uamul.otyp) {
    case O.AMULET_OF_ESP:
        /* need to update ability before calling see_monsters() */
        setworn(null, W_AMUL);
        await off_msg(amul);
        early_off_msg = true;

        see_monsters();
        break;
    case O.AMULET_OF_LIFE_SAVING:
    case O.AMULET_VERSUS_POISON:
    case O.AMULET_OF_REFLECTION:
    case O.AMULET_OF_CHANGE:
    case O.AMULET_OF_UNCHANGING:
    case O.FAKE_AMULET_OF_YENDOR:
        break;
    case O.AMULET_OF_MAGICAL_BREATHING:
        /* amulet is currently still on; take it off before calling drown()
           and region_danger(); call off_msg() before specific messages */
        setworn(null, W_AMUL);
        await off_msg(amul); /* 'uamul' has been set to Null */
        early_off_msg = true;

        if (Underwater()) {
            if (!cant_drown(game.youmonst.data) && !Swimming()) {
                await You(`suddenly inhale an unhealthy amount of ${hliquid("water")}!`);
                mkn = true; /* in case of life-saving */
                await drown();
            }
        }
        if (region_danger()) {
            /* "breathing": wouldn't get here otherwise */
            await You("are breathing poison gas!");
            mkn = true;
        }
        break;
    case O.AMULET_OF_STRANGULATION:
        setworn(null, W_AMUL);
        await off_msg(amul);
        early_off_msg = true;

        if (uprop(STRANGLED).intrinsic) { /* Strangled */
            uprop(STRANGLED).intrinsic = 0; /* Strangled = 0L */
            g.disp_botl = true;
            if (Breathless())
                await Your(`${body_part(NECK)} is no longer constricted!`);
            else
                await You("can breathe more easily!");
            mkn = true;
        }
        break;
    case O.AMULET_OF_RESTFUL_SLEEP:
        setworn(null, W_AMUL);
        /* HSleepy = 0L; -- avoid clobbering FROMOUTSIDE bit */
        if (!uprop(SLEEPY).extrinsic && !(uprop(SLEEPY).intrinsic & ~TIMEOUT))
            uprop(SLEEPY).intrinsic &= ~TIMEOUT; /* clear timeout bits */
        break;
    case O.AMULET_OF_FLYING: {
        const was_flying = Flying();

        /* remove amulet 'early' to determine whether Flying changes;
           also in case spoteffects() does something with the amulet */
        setworn(null, W_AMUL);
        await off_msg(amul);
        early_off_msg = true;

        float_vs_flight(); /* probably not needed here */
        if (was_flying && !Flying()) {
            const u = g.u;
            g.disp_botl = true; /* status: 'Fly' Off */
            await You(`${(is_pool_or_lava(u.ux, u.uy)
                          || Is_waterlevel(u.uz) || Is_airlevel(u.uz))
                             ? "stop flying"
                             : "land"}.`);
            mkn = true; /* makeknown(AMULET_OF_FLYING) */
            await spoteffects_bo(true);
        }
        break;
    }
    case O.AMULET_OF_GUARDING:
        find_ac();
        break;
    case O.AMULET_OF_YENDOR:
        break;
    }

    setworn(null, W_AMUL);
    if (!early_off_msg)
        await off_msg(amul); /* (not 'uamul'; it's Null now) */
    if (mkn)
        makeknown(amul.otyp);
}

// C ref: mon.c can_be_strangled() -- for the hero
function can_be_strangled_you() {
    const ptr = game.youmonst.data;
    if (!has_head(ptr))
        return false;
    /* hero can't be mindless but poly'ing into mindless form can
       confer strangulation protection */
    const nobrainer = mindless(ptr);
    const nonbreathing = (breathless(ptr)
                          || !!uprop(MAGICAL_BREATHING).extrinsic
                          || !!uprop(MAGICAL_BREATHING).intrinsic);
    return (!nobrainer || !nonbreathing);
}

// C ref: do_wear.c learnring()
function learnring(ring, observed) {
    const ringtype = ring.otyp;

    /* if effect was observable then we usually discover the type */
    if (observed) {
        /* if we already know the ring type which accomplishes this
           effect (assumes there is at most one type for each effect),
           mark this ring as having been seen (no need for makeknown);
           otherwise if we have seen this ring, discover its type */
        if (objects[ringtype].oc_name_known)
            ring.dknown = 1;
        else if (ring.dknown)
            makeknown(ringtype);
    }

    /* make enchantment of charged ring known (might be +0) and update
       perm invent window if we've seen this ring and know its type */
    if (ring.dknown && objects[ringtype].oc_name_known) {
        if (objects[ringtype].oc_charged)
            ring.known = 1;
        /* update_inventory(): no perm_invent */
    }
}

// C ref: do_wear.c adj_abon()
export function adj_abon(otmp, delta) {
    const g = game;
    if (g.uarmg && g.uarmg === otmp && otmp.otyp === O.GAUNTLETS_OF_DEXTERITY) {
        if (delta) {
            makeknown(g.uarmg.otyp);
            g.u.abon.a[A_DEX] += (delta);
        }
        g.disp_botl = true;
    }
    if (g.uarmh && g.uarmh === otmp && otmp.otyp === O.HELM_OF_BRILLIANCE) {
        if (delta) {
            makeknown(g.uarmh.otyp);
            g.u.abon.a[A_INT] += (delta);
            g.u.abon.a[A_WIS] += (delta);
        }
        g.disp_botl = true;
    }
}

/* C ref: you.h Blind -- Blinded intrinsic or extrinsic (blindfold),
   not blocked */

// C ref: potion.c toggle_blindness() -- blindness has just been toggled
export async function toggle_blindness() {
    const g = game;
    const Stinging = !!(g.uwep && (uprop(WARN_OF_MON).extrinsic & W_WEP) !== 0);
    const Blind_telepat = !!(uprop(TELEPAT).intrinsic || uprop(TELEPAT).extrinsic);
    const Infravision = !!((uprop(INFRAVISION).intrinsic || uprop(INFRAVISION).extrinsic)
                           && !uprop(INFRAVISION).blocked);

    /* blindness has just been toggled */
    g.disp_botl = true; /* status conditions need update */
    g.vision_full_recalc = 1; /* vision has changed */
    /* this vision recalculation used to be deferred until moveloop(),
       but that made it possible for vision irregularities to occur */
    vision_recalc(0);
    if (Blind_telepat || Infravision || Stinging)
        see_monsters(); /* also counts EWarn_of_mon monsters */
    if (Stinging)
        throw new Error('toggle_blindness(): Sting_effects() not ported yet');
    /* update dknown flag for inventory picked up while blind */
    if (!Blind())
        await learn_unseen_invent();
}

// C ref: invent.c learn_unseen_invent()
async function learn_unseen_invent() {
    if (Blind())
        return; /* sanity check */

    for (let otmp = game.invent; otmp; otmp = otmp.nobj) {
        if (otmp.dknown && (otmp.bknown || !Role_if(PM_CLERIC))
            && (otmp.oclass !== O.SCROLL_CLASS || !Role_if(PM_ARCHEOLOGIST)))
            continue; /* already seen */
        /* xname() will set dknown, perhaps bknown (for priest[ess]);
           result from xname() is immediately released for re-use */
        xname(otmp);
        await addinv_core2(otmp); /* you react to seeing the object */
    }
    /* update_inventory(): no perm_invent */
}

// C ref: do_wear.c Blindf_on()
export async function Blindf_on(otmp) {
    const already_blind = Blind();
    let changed = false;

    /* blindfold might be wielded; release it for wearing */
    await remove_worn_item(otmp, false);
    setworn(otmp, W_TOOL);
    await on_msg(otmp);

    if (Blind() && !already_blind) {
        changed = true;
        if (game.flags?.verbose ?? true)
            await You_cant("see any more.");
        /* set ball&chain variables before the hero goes blind */
        if (game.uball) /* Punished */
            set_bc(0);
    } else if (already_blind && !Blind()) {
        changed = true;
        /* "You are now wearing the Eyes of the Overworld." */
        if (game.u.uroleplay?.blind) {
            /* this can only happen by putting on the Eyes of the Overworld;
               that shouldn't actually produce a permanent cure, but we
               can't let the "blind from birth" conduct remain intact */
            await pline("For the first time in your life, you can see!");
            game.u.uroleplay.blind = false;
        } else
            await You("can see!");
    }
    if (changed) {
        await toggle_blindness(); /* potion.c */
    }
}

// C ref: do_wear.c Blindf_off()
export async function Blindf_off(otmp) {
    const g = game;
    const was_blind = Blind();
    let changed = false;
    const nooffmsg = !otmp;

    if (!otmp)
        otmp = g.ublindf;
    if (!otmp) {
        impossible("Blindf_off without eyewear?");
        return;
    }
    takeoff_ctx().mask &= ~W_TOOL;
    setworn(null, otmp.owornmask);
    if (!nooffmsg)
        await off_msg(otmp);

    if (Blind()) {
        if (was_blind) {
            /* "still cannot see" makes no sense when removing lenses
               since they can't have been the cause of your blindness */
            if (otmp.otyp !== LENSES)
                await You("still cannot see.");
        } else {
            changed = true; /* !was_blind */
            /* "You were wearing the Eyes of the Overworld." */
            await You_cant("see anything now!");
            /* set ball&chain variables before the hero goes blind */
            if (g.uball) /* Punished */
                set_bc(0);
        }
    } else if (was_blind) {
        if (!(await gulp_blnd_check())) {
            changed = true; /* !Blind */
            await You("can see again.");
        }
    }
    if (changed) {
        await toggle_blindness(); /* potion.c */
    }
}

// C ref: do_wear.c Ring_on() -- rings whose effect is only the
// extrinsic property so far
export function Ring_on(obj) {
    /* make sure ring isn't wielded; can't use remove_worn_item()
       here because it has already been set worn in a ring slot */
    if (obj === game.uwep)
        setuwep(null);
    else if (obj === game.uswapwep)
        setuswapwep(null);
    else if (obj === game.uquiver)
        setuqwep(null);

    switch (obj.otyp) {
    case O.RIN_TELEPORTATION:
    case O.RIN_REGENERATION:
    case O.RIN_SEARCHING:
    case O.RIN_HUNGER:
    case O.RIN_AGGRAVATE_MONSTER:
    case O.RIN_POISON_RESISTANCE:
    case O.RIN_FIRE_RESISTANCE:
    case O.RIN_COLD_RESISTANCE:
    case O.RIN_SHOCK_RESISTANCE:
    case O.RIN_CONFLICT:
    case O.RIN_TELEPORT_CONTROL:
    case O.RIN_POLYMORPH:
    case O.RIN_POLYMORPH_CONTROL:
    case O.RIN_FREE_ACTION:
    case O.RIN_SLOW_DIGESTION:
    case O.RIN_SUSTAIN_ABILITY:
        break;
    case O.MEAT_RING:
        /* wearing a meat ring does not affect vegan conduct */
        break;
    default:
        throw new Error('Ring_on(): this ring\'s effect is not ported yet');
    }
}

// C ref: do_wear.c Ring_off_or_gone()
async function Ring_off_or_gone(obj, gone) {
    const g = game;
    const mask = (obj.owornmask & W_RING);

    if (g.context.takeoff)
        g.context.takeoff.mask &= ~mask;
    /* if (!(u.uprops[objects[obj->otyp].oc_oprop].extrinsic & mask))
           impossible("Strange... I didn't know you had that ring."); */
    if (gone)
        setnotworn_dw(obj);
    else
        setworn(null, obj.owornmask);

    switch (obj.otyp) {
    case O.RIN_TELEPORTATION:
    case O.RIN_REGENERATION:
    case O.RIN_SEARCHING:
    case O.RIN_HUNGER:
    case O.RIN_AGGRAVATE_MONSTER:
    case O.RIN_POISON_RESISTANCE:
    case O.RIN_FIRE_RESISTANCE:
    case O.RIN_COLD_RESISTANCE:
    case O.RIN_SHOCK_RESISTANCE:
    case O.RIN_CONFLICT:
    case O.RIN_TELEPORT_CONTROL:
    case O.RIN_POLYMORPH:
    case O.RIN_POLYMORPH_CONTROL:
    case O.RIN_FREE_ACTION:
    case O.RIN_SLOW_DIGESTION:
    case O.RIN_SUSTAIN_ABILITY:
    case O.MEAT_RING:
        break;
    case O.RIN_STEALTH: {
        const st = g.u.uprops[STEALTH];
        await toggle_stealth(obj, ((st ? st.extrinsic : 0) & ~mask), false);
        break;
    }
    case O.RIN_INCREASE_ACCURACY: /* KMH */
        g.u.uhitinc -= obj.spe;
        break;
    case O.RIN_INCREASE_DAMAGE:
        g.u.udaminc -= obj.spe;
        break;
    case O.RIN_PROTECTION: {
        /* might have been put on while blind and we can now see
           or perhaps been forgotten due to amnesia */
        const observable = (obj.spe !== 0);
        learnring(obj, observable);
        if (obj.spe)
            find_ac(); /* updates botl */
        break;
    }
    default:
        throw new Error('Ring_off_or_gone(): this ring\'s effect is not ported yet');
    }
}

// C ref: do_wear.c Ring_off()
export async function Ring_off(obj) {
    await Ring_off_or_gone(obj, false);
}

// C ref: do_wear.c Ring_gone()
export async function Ring_gone(obj) {
    await Ring_off_or_gone(obj, true);
}

// C ref: do_wear.c set_wear() -- called in moveloop()'s prologue to set
// side-effects of worn start-up items; also used by poly_obj() when a
// worn item gets transformed
export async function set_wear(obj) { /* if Null, do all worn items; otherwise just obj */
    const g = game;
    g.initial_don = !obj;

    if (!obj ? !!g.ublindf : (obj === g.ublindf))
        await Blindf_on(g.ublindf);
    if (!obj ? !!g.uright : (obj === g.uright))
        Ring_on(g.uright);
    if (!obj ? !!g.uleft : (obj === g.uleft))
        Ring_on(g.uleft);
    if (!obj ? !!g.uamul : (obj === g.uamul))
        await Amulet_on(g.uamul);

    if (!obj ? !!g.uarmu : (obj === g.uarmu))
        await Shirt_on();
    if (!obj ? !!g.uarm : (obj === g.uarm))
        await Armor_on();
    if (!obj ? !!g.uarmc : (obj === g.uarmc))
        await Cloak_on();
    if (!obj ? !!g.uarmf : (obj === g.uarmf))
        await Boots_on();
    if (!obj ? !!g.uarmg : (obj === g.uarmg))
        await Gloves_on();
    if (!obj ? !!g.uarmh : (obj === g.uarmh))
        await Helmet_on();
    if (!obj ? !!g.uarms : (obj === g.uarms))
        await Shield_on();

    g.initial_don = false;
}

// C ref: do_wear.c already_wearing(), already_wearing2()
async function already_wearing(cc) {
    await You(`are already wearing ${cc}${(cc === c_that_) ? '!' : '.'}`);
}
async function already_wearing2(cc1, cc2) {
    await You_cant(`wear ${cc1} because you're wearing ${cc2} there already.`);
}

// C ref: do_wear.c canwearobj() -- checks to see whether the player can
// wear a piece of armor
//   inputs: otmp (the piece of armor)
//           noisy (if TRUE give error messages, otherwise be quiet about it)
//   output: mask (otmp's armor type), in maskp.mask
// The noisy messages make this async; getobj callbacks are synchronous,
// so canwearobj_quiet() runs the same checks with noisy FALSE.
function canwearobj_core(otmp, maskp, msgs) {
    const g = game;
    const u = g.u;
    const ptr = g.youmonst.data;
    let err = 0;

    /* this is the same check as for 'W' (dowear), but different message,
       in case we get here via 'P' (doputon) */
    if (verysmall(ptr) || nohands(ptr)) {
        msgs.push(['You', "can't wear any armor in your current form."]);
        return 0;
    }

    const which = is_cloak(otmp) ? c_cloak
            : is_shirt(otmp) ? c_shirt
              : is_suit(otmp) ? c_suit
                : null;
    if (which && cantweararm(ptr)
        /* same exception for cloaks as used in m_dowear() */
        && (which !== c_cloak
            || ((otmp.otyp !== O.MUMMY_WRAPPING)
                ? ptr.msize !== MZ_SMALL
                : !WrappingAllowed(ptr)))
        && (racial_exception(g.youmonst, otmp) < 1)) {
        msgs.push(['pline_The', `${which} will not fit on your body.`]);
        return 0;
    } else if (otmp.owornmask & W_ARMOR) {
        msgs.push(['already_wearing', c_that_]);
        return 0;
    }

    if (welded(g.uwep) && bimanual(g.uwep) && (is_suit(otmp) || is_shirt(otmp))) {
        msgs.push(['You', `cannot do that while holding your ${
            is_sword(g.uwep) ? c_sword : c_weapon}.`]);
        return 0;
    }

    if (is_helmet(otmp)) {
        if (g.uarmh) {
            msgs.push(['already_wearing', an(helm_simple_name(g.uarmh))]);
            err++;
        } else if (Upolyd() && has_horns(ptr) && !is_flimsy(otmp)) {
            /* (flimsy exception matches polyself handling) */
            msgs.push(['pline_The', `${helm_simple_name(otmp)} won't fit over your horn${
                num_horns(ptr) === 1 ? "" : "s"}.`]);
            err++;
        } else
            maskp.mask = W_ARMH;
    } else if (is_shield(otmp)) {
        if (g.uarms) {
            msgs.push(['already_wearing', an(c_shield)]);
            err++;
        } else if (g.uwep && bimanual(g.uwep)) {
            msgs.push(['You', `cannot wear a shield while wielding a two-handed ${
                is_sword(g.uwep) ? c_sword : (g.uwep.otyp === O.BATTLE_AXE)
                                               ? c_axe
                                               : c_weapon}.`]);
            err++;
        } else if (u.twoweap) {
            msgs.push(['You', "cannot wear a shield while wielding two weapons."]);
            err++;
        } else
            maskp.mask = W_ARMS;
    } else if (is_boots(otmp)) {
        if (g.uarmf) {
            msgs.push(['already_wearing', c_boots]);
            err++;
        } else if (Upolyd() && slithy(ptr)) {
            msgs.push(['You', "have no feet..."]); /* not body_part(FOOT) */
            err++;
        } else if (Upolyd() && ptr.mlet === S_CENTAUR) {
            /* break_armor() pushes boots off for centaurs, so don't let
               dowear() put them back on;
               makeplural(body_part(FOOT)) would yield "rear hooves" here,
               which sounds odd, so use hard-coded "hooves" */
            msgs.push(['You', `have too many hooves to wear ${c_boots}.`]);
            err++;
        } else if (u.utrap
                   && (u.utraptype === TT_BEARTRAP || u.utraptype === TT_INFLOOR
                       || u.utraptype === TT_LAVA
                       || u.utraptype === TT_BURIEDBALL)) {
            if (u.utraptype === TT_BEARTRAP) {
                msgs.push(['Your', `${body_part(FOOT)} is trapped!`]);
            } else if (u.utraptype === TT_INFLOOR || u.utraptype === TT_LAVA) {
                msgs.push(['Your', `${makeplural(body_part(FOOT))} are stuck in the ${
                    surface(u.ux, u.uy)}!`]);
            } else { /*TT_BURIEDBALL*/
                msgs.push(['Your', `${body_part(LEG)} is attached to the buried ball!`]);
            }
            err++;
        } else
            maskp.mask = W_ARMF;
    } else if (is_gloves(otmp)) {
        if (g.uarmg) {
            msgs.push(['already_wearing', c_gloves]);
            err++;
        } else if (welded(g.uwep)) {
            msgs.push(['You', `cannot wear gloves over your ${
                is_sword(g.uwep) ? c_sword : c_weapon}.`]);
            err++;
        } else if (uprop(GLIB).intrinsic) {
            /* prevent slippery bare fingers from transferring to
               gloved fingers */
            msgs.push(['Your', `${fingers_or_gloves(false)} are too slippery to pull on ${
                gloves_simple_name(otmp)}.`]);
            err++;
        } else
            maskp.mask = W_ARMG;
    } else if (is_shirt(otmp)) {
        if (g.uarm || g.uarmc || g.uarmu) {
            if (g.uarmu) {
                msgs.push(['already_wearing', an(c_shirt)]);
            } else {
                msgs.push(['You_cant', `wear that over your ${
                    (g.uarm && !g.uarmc) ? c_armor
                                         : cloak_simple_name(g.uarmc)}.`]);
            }
            err++;
        } else
            maskp.mask = W_ARMU;
    } else if (is_cloak(otmp)) {
        if (g.uarmc) {
            msgs.push(['already_wearing', an(cloak_simple_name(g.uarmc))]);
            err++;
        } else
            maskp.mask = W_ARMC;
    } else if (is_suit(otmp)) {
        if (g.uarmc) {
            msgs.push(['You', `cannot wear armor over a ${cloak_simple_name(g.uarmc)}.`]);
            err++;
        } else if (g.uarm) {
            msgs.push(['already_wearing', "some armor"]);
            err++;
        } else
            maskp.mask = W_ARM;
    } else {
        /* getobj can't do this after setting its allow_all flag; that
           happens if you have armor for slots that are covered up or
           extra armor for slots that are filled */
        msgs.push(['silly_thing', "wear"]);
        err++;
    }
    /* Unnecessary since now only weapons and special items like pick-axes get
     * welded to your hand, not armor
        if (welded(otmp)) {
            if (!err++) {
                if (noisy) weldmsg(otmp);
            }
        }
     */
    return err ? 0 : 1;
}

function canwearobj_quiet(otmp, maskp) {
    return canwearobj_core(otmp, maskp, []);
}

export async function canwearobj(otmp, maskp, noisy) {
    const msgs = [];
    const res = canwearobj_core(otmp, maskp, msgs);
    if (noisy) {
        for (const [how, txt] of msgs) {
            switch (how) {
            case 'You': await You(txt); break;
            case 'Your': await Your(txt); break;
            case 'You_cant': await You_cant(txt); break;
            case 'pline_The': await pline_The(txt); break;
            case 'already_wearing': await already_wearing(txt); break;
            case 'silly_thing': await silly_thing(txt, otmp); break;
            }
        }
    }
    return res;
}

// C ref: do_wear.c accessory_or_armor_on()
async function accessory_or_armor_on(obj) {
    const g = game;
    const u = g.u;
    let mask = 0;

    if (obj.owornmask & (W_ACCESSORY | W_ARMOR)) {
        await already_wearing(c_that_);
        return ECMD_OK;
    }
    const armor = (obj.oclass === ARMOR_CLASS);
    const ring = (obj.oclass === RING_CLASS || obj.otyp === MEAT_RING);
    const amulet = (obj.oclass === AMULET_CLASS);
    const eyewear = (obj.otyp === BLINDFOLD || obj.otyp === TOWEL
                     || obj.otyp === LENSES);
    /* checks which are performed prior to actually touching the item */
    if (armor) {
        const maskp = { mask: 0 };
        if (!(await canwearobj(obj, maskp, true)))
            return ECMD_OK;
        mask = maskp.mask;

        const qstart_level = g.dungeon_topology?.d_qstart_level;
        if (obj.otyp === O.HELM_OF_OPPOSITE_ALIGNMENT
            && qstart_level && qstart_level.dnum === u.uz.dnum) /* in quest */
            throw new Error('accessory_or_armor_on(): helm of opposite alignment in the quest not ported yet');
    } else {
        /*
         * FIXME:
         *  except for the rings/nolimbs case, this allows you to put on
         *  accessories without having any hands to manipulate them, and
         *  to put them on when poly'd into a tiny or huge form where
         *  they shouldn't fit.  [If the latter situation changes, make
         *  comparable change to break_armor(polyself.c).]
         */

        /* accessory */
        if (ring) {
            let answer;
            let res = 0;

            if ((g.youmonst.data.mflags1 & M1_NOLIMBS) === M1_NOLIMBS) {
                await You("cannot make the ring stick to your body.");
                return ECMD_OK;
            }
            if (g.uleft && g.uright) {
                await There(`are no more ${humanoid(g.youmonst.data) ? "ring-" : ""}${
                    fingers_or_gloves(false)} to fill.`);
                return ECMD_OK;
            }
            if (g.uleft) {
                mask = RIGHT_RING;
            } else if (g.uright) {
                mask = LEFT_RING;
            } else {
                do {
                    const qbuf = `Which ${(g.youmonst.data.mflags1 & M1_HUMANOID) ? "ring-" : ""}`
                        + `${body_part(FINGER)}, Right or Left?`;
                    answer = await tty_yn_function(qbuf, "rl", '\0');
                    switch (answer) {
                    case '\0':
                    case '\x1b':
                        return ECMD_OK;
                    case 'l':
                    case 'L':
                        mask = LEFT_RING;
                        break;
                    case 'r':
                    case 'R':
                        mask = RIGHT_RING;
                        break;
                    }
                } while (!mask);
            }
            if (g.uarmg && uprop(GLIB).intrinsic)
                throw new Error('accessory_or_armor_on(): slippery gloves not ported yet');
            if (g.uarmg && g.uarmg.cursed)
                throw new Error('accessory_or_armor_on(): cursed gloves not ported yet');
            if (g.uwep) {
                res = !g.uwep.bknown; /* check this before calling welded() */
                if (((mask === RIGHT_RING && !u.uhandedness)
                     || (mask === LEFT_RING && u.uhandedness)
                     || bimanual(g.uwep)) && welded(g.uwep))
                    throw new Error('accessory_or_armor_on(): welded weapon hand not ported yet');
                void res;
            }
        } else if (amulet) {
            if (g.uamul) {
                await already_wearing("an amulet");
                return ECMD_OK;
            }
        } else if (eyewear) {
            if (!has_head(g.youmonst.data))
                throw new Error('accessory_or_armor_on(): no-head message not ported yet');
            if (g.ublindf) {
                if (g.ublindf.otyp === TOWEL)
                    await Your(`${body_part(FACE)} is already covered by a towel.`);
                else if (g.ublindf.otyp === BLINDFOLD) {
                    if (obj.otyp === LENSES)
                        await already_wearing2("lenses", "a blindfold");
                    else
                        await already_wearing("a blindfold");
                } else if (g.ublindf.otyp === LENSES) {
                    if (obj.otyp === BLINDFOLD)
                        await already_wearing2("a blindfold", "some lenses");
                    else
                        await already_wearing("some lenses");
                } else {
                    await already_wearing("something"); /* ??? */
                }
                return ECMD_OK;
            }
        } else {
            /* neither armor nor accessory */
            await You_cant("wear that!");
            return ECMD_OK;
        }
    }

    if (!(await retouch_object(obj, false)))
        return ECMD_TIME; /* costs a turn even though it didn't get worn */

    if (armor) {
        /* if the armor is wielded, release it for wearing (won't be
           welded even if cursed; that only happens for weapons/weptools) */
        if (obj.owornmask & W_WEAPONS)
            await remove_worn_item(obj, false);
        /*
         * Setting obj->known=1 is done because setworn() causes hero's AC
         * to change so armor's +/- value is evident via the status line.
         * We used to set it here because of that, but then it would stick
         * if a nymph stole the armor before it was fully worn.  Delay it
         * until the afternmv action.  The player may still know this armor's
         * +/- amount if donning gets interrupted, but the hero won't.
         */
        g.wasinwater = u.uinwater; /* for WWALKING; Boots_on() is too late */
        setworn(obj, mask);
        /* if there's no delay, we'll execute 'afternmv' immediately */
        if (obj === g.uarm)
            g.afternmv = Armor_on;
        else if (obj === g.uarmh)
            g.afternmv = Helmet_on;
        else if (obj === g.uarmg)
            g.afternmv = Gloves_on;
        else if (obj === g.uarmf)
            g.afternmv = Boots_on;
        else if (obj === g.uarms)
            g.afternmv = Shield_on;
        else if (obj === g.uarmc)
            g.afternmv = Cloak_on;
        else if (obj === g.uarmu)
            g.afternmv = Shirt_on;
        else
            throw new Error(`panic: wearing armor not worn as armor? [${obj.owornmask}]`);

        const delay = -objects[obj.otyp].oc_delay;
        if (delay) {
            nomul(delay);
            g.multi_reason = "dressing up";
            g.nomovemsg = "You finish your dressing maneuver.";
        } else {
            await unmul(""); /* call afternmv, clear it+nomovemsg+multi_reason */
            await on_msg(obj);
        }
        takeoff_ctx().mask = takeoff_ctx().what = 0;
        /* gw.wasinwater = 0U; // can't clear this yet; Boots_on() needs it
         * and gets called via afternmv() after this routine has returned */
    } else { /* not armor */
        if (ring) {
            /* Ring_on() expects ring to already be worn as uleft or uright */
            setworn(obj, mask);
            Ring_on(obj);
            /* is_worn(): 'obj' will always be worn here except when putting
               on a ring of levitation while at a sink location */
            if (obj.owornmask & (W_ARMOR | W_ACCESSORY | W_SADDLE | W_WEAPONS))
                await on_msg(obj);
        } else if (amulet) {
            /* setworn() and on_msg() handled by Amulet_on() */
            await Amulet_on(obj);
        } else if (eyewear) {
            /* setworn() and on_msg() handled by Blindf_on() */
            await Blindf_on(obj);
        } else {
            impossible(`putting on unexpected type of accessory: ${obj.otyp}`);
        }
    }
    return ECMD_TIME;
}

/* C ref: context.h struct takeoff_info (svc.context.takeoff) */
function takeoff_ctx() {
    const g = game;
    if (!g.context) g.context = {};
    if (!g.context.takeoff)
        g.context.takeoff = { mask: 0, what: 0, delay: 0,
                              cancelled_don: false, disrobing: '' };
    return g.context.takeoff;
}

// C ref: do_wear.c off_msg()
async function off_msg(otmp) {
    if (game.flags.verbose)
        await You(`were wearing ${doname(otmp)}.`);
}

// C ref: do_wear.c Boots_off()
export async function Boots_off() {
    const g = game;
    const otmp = g.uarmf;
    const otyp = otmp.otyp;
    const oldprop = uprop(objects[otyp].oc_oprop).extrinsic & ~W_ARMF; /* WORN_BOOTS */
    const tk = takeoff_ctx();

    tk.mask &= ~W_ARMF;
    /* For levitation, float_down() returns if Levitation, so we
     * must do a setworn() _before_ the levitation case.
     */
    setworn(null, W_ARMF);
    switch (otyp) {
    case O.SPEED_BOOTS: {
        const HFast = uprop(FAST).intrinsic, EFast = uprop(FAST).extrinsic;
        const Very_fast = ((HFast & ~INTRINSIC) || EFast);
        if (!Very_fast && !tk.cancelled_don) {
            makeknown(otyp);
            await You_feel(`yourself slow down${(HFast || EFast) ? " a bit" : ""}.`);
        }
        break;
    }
    case O.WATER_WALKING_BOOTS: {
        const u = g.u;
        /* check for lava since fireproofed boots make it viable */
        if ((is_pool_bo(u.ux, u.uy) || is_lava_bo(u.ux, u.uy))
            && !Levitation() && !Flying()
            && !((g.youmonst.data.mflags1 & M1_CLING_BO) /* is_clinger() */
                 && has_ceiling_bo(u.uz))
            && !tk.cancelled_don
            /* avoid recursive call to lava_effects() */
            && !g.iflags.in_lava_effects) {
            /* make boots known in case you survive the drowning */
            makeknown(otyp);
            await spoteffects_bo(true);
        }
        break;
    }
    case O.ELVEN_BOOTS:
        await toggle_stealth(otmp, oldprop, false);
        break;
    case O.FUMBLE_BOOTS:
        if (!oldprop && !(uprop(FUMBLING).intrinsic & ~TIMEOUT))
            uprop(FUMBLING).intrinsic = uprop(FUMBLING).extrinsic = 0; /* HFumbling = EFumbling = 0 */
        break;
    case O.LEVITATION_BOOTS:
        if (!oldprop && !uprop(LEVITATION).intrinsic
            && !((uprop(LEVITATION).blocked || 0) & FROMOUTSIDE_BO)
            && !tk.cancelled_don) {
            /* lava_effects() sets in_lava_effects and calls Boots_off()
               so hero is already in midst of floating down */
            if (!g.iflags.in_lava_effects)
                await float_down_bo(0, 0);
            makeknown(otyp);
        } else {
            float_vs_flight(); /* maybe toggle (BFlying & I_SPECIAL) */
        }
        break;
    case O.LOW_BOOTS:
    case O.IRON_SHOES:
    case O.HIGH_BOOTS:
    case O.JUMPING_BOOTS:
    case O.KICKING_BOOTS:
        break;
    default:
        impossible(`Boots_off(): unknown type of boots (${otyp})`);
    }
    tk.cancelled_don = false;
    return 0;
}

// C ref: do_wear.c Cloak_off()
export async function Cloak_off() {
    const g = game;
    const otmp = g.uarmc;
    const otyp = otmp.otyp;
    const oldprop = uprop(objects[otyp].oc_oprop).extrinsic & ~W_ARMC;

    takeoff_ctx().mask &= ~W_ARMC;
    /* For mummy wrapping, taking it off first resets `Invisible'. */
    setworn(null, W_ARMC);
    switch (otyp) {
    case O.ORCISH_CLOAK:
    case O.DWARVISH_CLOAK:
    case O.CLOAK_OF_PROTECTION:
    case O.CLOAK_OF_MAGIC_RESISTANCE:
    case O.OILSKIN_CLOAK:
    case O.ROBE:
    case O.LEATHER_CLOAK:
        break;
    case O.ELVEN_CLOAK:
        await toggle_stealth(otmp, oldprop, false);
        break;
    case O.CLOAK_OF_DISPLACEMENT:
        await toggle_displacement(otmp, oldprop, false);
        break;
    case O.MUMMY_WRAPPING:
    case O.CLOAK_OF_INVISIBILITY:
        throw new Error('Cloak_off(): invisibility cloaks not ported yet');
    /* Alchemy smock gives poison _and_ acid resistance */
    case O.ALCHEMY_SMOCK:
        uprop(ACID_RES).extrinsic &= ~W_ARMC;
        break;
    default:
        impossible(`Cloak_off(): unknown type of cloak (${otyp})`);
    }
    return 0;
}

// C ref: do_wear.c Helmet_off()
export async function Helmet_off() {
    const g = game;
    const tk = takeoff_ctx();
    tk.mask &= ~W_ARMH;

    switch (g.uarmh.otyp) {
    case O.FEDORA:
        if (Role_if(PM_ARCHEOLOGIST))
            change_luck(-1);
        break;
    case O.HELMET:
    case O.DENTED_POT:
    case O.ELVEN_LEATHER_HELM:
    case O.DWARVISH_IRON_HELM:
    case O.ORCISH_HELM:
        break;
    case O.DUNCE_CAP:
        g.disp_botl = true;
        break;
    case O.CORNUTHAUM:
        if (!tk.cancelled_don) {
            g.u.abon.a[A_CHA] += (Role_if(PM_WIZARD) ? -1 : 1);
            g.disp_botl = true;
        }
        break;
    case O.HELM_OF_TELEPATHY:
    case O.HELM_OF_CAUTION:
        /* need to update ability before calling see_monsters() */
        setworn(null, W_ARMH);
        see_monsters();
        return 0;
    case O.HELM_OF_BRILLIANCE:
        if (!tk.cancelled_don)
            adj_abon(g.uarmh, -g.uarmh.spe);
        break;
    case O.HELM_OF_OPPOSITE_ALIGNMENT:
        throw new Error('Helmet_off(): uchangealign() not ported yet');
    default:
        impossible(`Helmet_off(): unknown type of helmet (${g.uarmh.otyp})`);
    }
    setworn(null, W_ARMH);
    tk.cancelled_don = false;
    return 0;
}

// C ref: do_wear.c Gloves_off()
export async function Gloves_off() {
    const g = game;
    const tk = takeoff_ctx();
    const oldprop =
        uprop(objects[g.uarmg.otyp].oc_oprop).extrinsic & ~W_ARMG; /* WORN_GLOVES */
    tk.mask &= ~W_ARMG;

    switch (g.uarmg.otyp) {
    case O.LEATHER_GLOVES:
        break;
    case O.GAUNTLETS_OF_FUMBLING:
        if (!oldprop && !(uprop(FUMBLING).intrinsic & ~TIMEOUT))
            uprop(FUMBLING).intrinsic = uprop(FUMBLING).extrinsic = 0; /* HFumbling = EFumbling = 0 */
        break;
    case O.GAUNTLETS_OF_POWER:
        makeknown(g.uarmg.otyp);
        g.disp_botl = true; /* taken care of in attrib.c */
        break;
    case O.GAUNTLETS_OF_DEXTERITY:
        if (!tk.cancelled_don)
            adj_abon(g.uarmg, -g.uarmg.spe);
        break;
    default:
        impossible(`Gloves_off(): unknown type of gloves (${g.uarmg.otyp})`);
    }
    setworn(null, W_ARMG);
    tk.cancelled_don = false;
    await encumber_msg(); /* immediate feedback for GoP */

    /* usually can't remove gloves when they're slippery but it can
       be done by having them fall off (polymorph), stolen, or
       destroyed (scroll, overenchantment, monster spell); if that
       happens, 'cure' slippery fingers so that it doesn't transfer
       from gloves to bare hands */
    if (Glib())
        make_glib(0); /* for update_inventory() */

    /* prevent wielding cockatrice when not wearing gloves */
    if ((g.uwep && g.uwep.otyp === O.CORPSE)
        || (g.u.twoweap && g.uswapwep && g.uswapwep.otyp === O.CORPSE))
        throw new Error('Gloves_off(): wielding_corpse() not ported yet');

    /* condtests[bl_bareh].enabled: the bareh status condition isn't
       ported (off by default) */
    return 0;
}

// C ref: do_wear.c Shield_off()
export async function Shield_off() {
    const g = game;
    takeoff_ctx().mask &= ~W_ARMS;

    /* no shield currently requires special handling when taken off, but we
       keep this uncommented in case somebody adds a new one which does */
    switch (g.uarms.otyp) {
    case O.SMALL_SHIELD:
    case O.SHIELD_OF_DRAIN_RESISTANCE:
    case O.SHIELD_OF_SHOCK_RESISTANCE:
    case O.ELVEN_SHIELD:
    case O.URUK_HAI_SHIELD:
    case O.ORCISH_SHIELD:
    case O.DWARVISH_ROUNDSHIELD:
    case O.LARGE_SHIELD:
    case O.SHIELD_OF_REFLECTION:
        break;
    default:
        impossible(`Shield_off(): unknown type of shield (${g.uarms.otyp})`);
    }

    setworn(null, W_ARMS);
    return 0;
}

// C ref: do_wear.c Shirt_off()
export async function Shirt_off() {
    const g = game;
    takeoff_ctx().mask &= ~W_ARMU;

    /* no shirt currently requires special handling when taken off, but we
       keep this uncommented in case somebody adds a new one which does */
    switch (g.uarmu.otyp) {
    case O.HAWAIIAN_SHIRT:
    case O.T_SHIRT:
        break;
    default:
        impossible(`Shirt_off(): unknown type of shirt (${g.uarmu.otyp})`);
    }

    setworn(null, W_ARMU);
    return 0;
}

// C ref: do_wear.c Armor_off()
export async function Armor_off() {
    const g = game;
    const otmp = g.uarm;
    const tk = takeoff_ctx();
    const was_arti_light = otmp && otmp.lamplit && artifact_light(otmp);

    tk.mask &= ~W_ARM;
    setworn(null, W_ARM);
    tk.cancelled_don = false;

    /* taking off yellow dragon scales/mail might be fatal; arti_light
       comes from gold dragon scales/mail so they don't overlap, but
       conceptually the non-fatal change should be done before the
       potentially fatal change in case the latter results in bones */
    if (was_arti_light && !artifact_light(otmp)) {
        end_burn(otmp, false);
        if (!Blind())
            await pline(`${Tobjnam(otmp, "stop")} shining.`);
    }
    await dragon_armor_handling(otmp, false, true);

    return 0;
}

// C ref: do_wear.c Armor_gone()
/* The gone functions differ from the off functions in that if you die from
 * taking it off and have life saving, you still die.
 */
export async function Armor_gone() {
    const g = game;
    const otmp = g.uarm;
    const tk = takeoff_ctx();

    const was_arti_light = otmp && otmp.lamplit && artifact_light(otmp);

    tk.mask &= ~W_ARM;
    setnotworn_dw(g.uarm);
    tk.cancelled_don = false;

    /* losing yellow dragon scales/mail might be fatal; arti_light
       comes from gold dragon scales/mail so they don't overlap, but
       conceptually the non-fatal change should be done before the
       potentially fatal change in case the latter results in bones */
    if (was_arti_light && !artifact_light(otmp)) {
        end_burn(otmp, false);
        if (!Blind())
            await pline(`${Tobjnam(otmp, "stop")} shining.`);
    }
    await dragon_armor_handling(otmp, false, false);

    return 0;
}

// C ref: do_wear.c dragon_armor_handling() -- handle extra abilities for
// hero wearing dragon scale armor
async function dragon_armor_handling(otmp,   /* armor being put on or taken off */
                                     puton,  /* True: on, False: off */
                                     on_purpose) { /* voluntary removal; not applicable for putting on */
    const g = game;
    void on_purpose;
    if (!otmp)
        return;

    const Very_fast = () => !!((uprop(FAST).intrinsic & ~INTRINSIC)
                               || uprop(FAST).extrinsic);
    const Fast = () => !!(uprop(FAST).intrinsic || uprop(FAST).extrinsic);
    switch (otmp.otyp) {
        /* grey: no extra effect */
        /* silver: no extra effect */
    case O.BLACK_DRAGON_SCALES:
    case O.BLACK_DRAGON_SCALE_MAIL:
        if (puton) {
            uprop(DRAIN_RES).extrinsic |= W_ARM;
        } else {
            uprop(DRAIN_RES).extrinsic &= ~W_ARM;
        }
        break;
    case O.BLUE_DRAGON_SCALES:
    case O.BLUE_DRAGON_SCALE_MAIL:
        if (puton) {
            if (!Very_fast())
                await You(`speed up${Fast() ? " a bit more" : ""}.`);
            uprop(FAST).extrinsic |= W_ARM;
        } else {
            uprop(FAST).extrinsic &= ~W_ARM;
            if (!Very_fast() && !takeoff_ctx().cancelled_don)
                await You("slow down.");
        }
        break;
    case O.GREEN_DRAGON_SCALES:
    case O.GREEN_DRAGON_SCALE_MAIL:
        if (puton) {
            uprop(SICK_RES).extrinsic |= W_ARM;
        } else {
            uprop(SICK_RES).extrinsic &= ~W_ARM;
        }
        break;
    case O.RED_DRAGON_SCALES:
    case O.RED_DRAGON_SCALE_MAIL:
        if (puton) {
            uprop(INFRAVISION).extrinsic |= W_ARM;
        } else {
            uprop(INFRAVISION).extrinsic &= ~W_ARM;
        }
        see_monsters();
        break;
    case O.GOLD_DRAGON_SCALES:
    case O.GOLD_DRAGON_SCALE_MAIL:
        await make_hallucinated(puton ? 0 : 1,
                                game.program_state?.restoring ? false : true,
                                W_ARM);
        break;
    case O.ORANGE_DRAGON_SCALES:
    case O.ORANGE_DRAGON_SCALE_MAIL:
        if (puton) {
            uprop(FREE_ACTION).extrinsic |= W_ARM;
        } else {
            uprop(FREE_ACTION).extrinsic &= ~W_ARM;
        }
        break;
    case O.YELLOW_DRAGON_SCALES:
    case O.YELLOW_DRAGON_SCALE_MAIL:
        if (puton) {
            uprop(STONE_RES).extrinsic |= W_ARM;
        } else {
            uprop(STONE_RES).extrinsic &= ~W_ARM;

            /* prevent wielding cockatrice after losing stoning resistance
               when not wearing gloves; the uswapwep case is always a no-op */
            if (!g.uarmg && ((g.uwep && g.uwep.otyp === O.CORPSE)
                             || (g.uswapwep && g.uswapwep.otyp === O.CORPSE)))
                throw new Error('dragon_armor_handling(): wielding_corpse() not ported yet');
        }
        break;
    case O.WHITE_DRAGON_SCALES:
    case O.WHITE_DRAGON_SCALE_MAIL:
        if (puton) {
            uprop(SLOW_DIGESTION).extrinsic |= W_ARM;
        } else {
            uprop(SLOW_DIGESTION).extrinsic &= ~W_ARM;
        }
        break;
    default:
        break;
    }
}

// C ref: do_wear.c donning() -- check whether the target object is
// currently being put on (or taken off--also checks for doffing--[why?])
export function donning(otmp) {
    const g = game;
    let result = false;

    /* 'W' (or 'P' used for armor) sets afternmv */
    if (doffing(otmp))
        result = true;
    else if (otmp === g.uarm)
        result = (g.afternmv === Armor_on);
    else if (otmp === g.uarmu)
        result = (g.afternmv === Shirt_on);
    else if (otmp === g.uarmc)
        result = (g.afternmv === Cloak_on);
    else if (otmp === g.uarmf)
        result = (g.afternmv === Boots_on);
    else if (otmp === g.uarmh)
        result = (g.afternmv === Helmet_on);
    else if (otmp === g.uarmg)
        result = (g.afternmv === Gloves_on);
    else if (otmp === g.uarms)
        result = (g.afternmv === Shield_on);

    return result;
}

// C ref: do_wear.c doffing() -- check whether the target object is
// currently being taken off, so that stop_donning() and steal() can vary
// messages and doname() can vary "(being worn)" suffix
export function doffing(otmp) {
    const g = game;
    const what = takeoff_ctx().what;
    let result = false;

    /* 'T' (or 'R' used for armor) sets afternmv, 'A' sets takeoff.what */
    if (otmp === g.uarm)
        result = (g.afternmv === Armor_off || what === W_ARM);
    else if (otmp === g.uarmu)
        result = (g.afternmv === Shirt_off || what === W_ARMU);
    else if (otmp === g.uarmc)
        result = (g.afternmv === Cloak_off || what === W_ARMC);
    else if (otmp === g.uarmf)
        result = (g.afternmv === Boots_off || what === W_ARMF);
    else if (otmp === g.uarmh)
        result = (g.afternmv === Helmet_off || what === W_ARMH);
    else if (otmp === g.uarmg)
        result = (g.afternmv === Gloves_off || what === W_ARMG);
    else if (otmp === g.uarms)
        result = (g.afternmv === Shield_off || what === W_ARMS);
    /* these 1-turn items don't need 'afternmv' checks */
    else if (otmp === g.uamul)
        result = (what === W_AMUL);
    else if (otmp === g.uleft)
        result = (what === LEFT_RING);
    else if (otmp === g.uright)
        result = (what === RIGHT_RING);
    else if (otmp === g.ublindf)
        result = (what === W_TOOL);
    else if (otmp === g.uwep)
        result = (what === W_WEP);
    else if (otmp === g.uswapwep)
        result = (what === W_SWAPWEP);
    else if (otmp === g.uquiver)
        result = (what === W_QUIVER);

    return result;
}

// C ref: do_wear.c cancel_doff()
/* despite their names, cancel_don() and cancel_doff() both apply to both
   donning and doffing... */
export function cancel_doff(obj, slotmask) {
    const tk = takeoff_ctx();
    /* Called by setworn() for old item in specified slot or by setnotworn()
     * for specified item.  We don't want to call cancel_don() if we got
     * here via <X>_off() -> setworn((struct obj *) 0) -> cancel_doff()
     * because that would stop the 'A' command from continuing with next
     * selected item.  So do_takeoff() sets a flag in takeoff.mask for us.
     * [For taking off an individual item with 'T'/'R'/'w-', it doesn't
     * matter whether cancel_don() gets called here--the item has already
     * been removed by now.]
     */
    if (!(tk.mask & I_SPECIAL) && donning(obj))
        cancel_don(); /* applies to doffing too */
    tk.mask &= ~slotmask;
}

// C ref: do_wear.c cancel_don()
/* despite their names, cancel_don() and cancel_doff() both apply to both
   donning and doffing... */
export function cancel_don() {
    const g = game;
    const tk = takeoff_ctx();
    /* the piece of armor we were donning/doffing has vanished, so stop
     * wasting time on it (and don't dereference it when donning would
     * otherwise finish); afternmv never has some of these values because
     * every item of the corresponding armor category takes 1 turn to wear,
     * but check all of them anyway
     */
    tk.cancelled_don = (g.afternmv === Cloak_on
                        || g.afternmv === Armor_on
                        || g.afternmv === Shirt_on
                        || g.afternmv === Helmet_on
                        || g.afternmv === Gloves_on
                        || g.afternmv === Boots_on
                        || g.afternmv === Shield_on);
    g.afternmv = null;
    g.nomovemsg = null;
    g.multi = 0;
    tk.delay = 0;
    tk.what = 0;
}

// C ref: do_wear.c stop_donning()
/* called by steal() during theft from hero; interrupt donning/doffing */
export async function stop_donning(
    stolenobj) /* no mesg if stolenobj is already being doffed */ {
    const g = game;
    let buf;
    let otmp;
    let putting_on;
    let result = 0;

    for (otmp = g.invent; otmp; otmp = otmp.nobj)
        if ((otmp.owornmask & W_ARMOR) && donning(otmp))
            break;
    /* at most one item will pass donning() test at any given time */
    if (!otmp)
        return 0;

    /* donning() returns True when doffing too; doffing() is more specific */
    putting_on = !doffing(otmp);
    /* cancel_don() looks at afternmv; it can also cancel doffing */
    cancel_don();
    /* don't want <armor>_on() or <armor>_off() being called
       by unmul() since the on or off action isn't completing */
    g.afternmv = null;
    if (putting_on || otmp !== stolenobj) {
        buf = `You stop ${putting_on ? "putting on" : "taking off"} ${
            thesimpleoname(otmp)}.`;
    } else {
        buf = "";   /* silently stop doffing stolenobj */
        result = -g.multi; /* remember this before calling unmul() */
    }
    await unmul(buf);
    /* while putting on, item becomes worn immediately but side-effects are
       deferred until the delay expires; when interrupted, make it unworn
       (while taking off, item stays worn until the delay expires; when
       interrupted, leave it worn) */
    if (putting_on)
        await remove_worn_item(otmp, false);

    return result;
}

// C ref: do_wear.c count_worn_stuff()
/* assign values to Narmorpieces and Naccessories */
let Narmorpieces = 0, Naccessories = 0;
function count_worn_stuff(which, /* caller wants this when count is 1 */
                          accessorizing) {
    const g = game;
    let otmp;

    Narmorpieces = Naccessories = 0;

    const MOREWORN = (x, isarmor) => {
        if (x) { if (isarmor) Narmorpieces++; else Naccessories++; otmp = x; }
    };
    otmp = null;
    MOREWORN(g.uarmh, true);
    MOREWORN(g.uarms, true);
    MOREWORN(g.uarmg, true);
    MOREWORN(g.uarmf, true);
    /* for cloak/suit/shirt, we only count the outermost item so that it
       can be taken off without confirmation if final count ends up as 1 */
    if (g.uarmc)
        MOREWORN(g.uarmc, true);
    else if (g.uarm)
        MOREWORN(g.uarm, true);
    else if (g.uarmu)
        MOREWORN(g.uarmu, true);
    if (!accessorizing)
        which.obj = otmp; /* default item iff Narmorpieces is 1 */

    otmp = null;
    MOREWORN(g.uleft, false);
    MOREWORN(g.uright, false);
    MOREWORN(g.uamul, false);
    MOREWORN(g.ublindf, false);
    if (accessorizing)
        which.obj = otmp; /* default item iff Naccessories is 1 */
}

// C ref: do_wear.c armor_or_accessory_off()
/* take off one piece or armor or one accessory;
   shared by dotakeoff('T') and doremring('R') */
async function armor_or_accessory_off(obj) {
    const g = game;
    if (!(obj.owornmask & (W_ARMOR | W_ACCESSORY))) {
        await You("are not wearing that.");
        return ECMD_OK;
    }
    if (obj === g.uskin
        || ((obj === g.uarm) && g.uarmc)
        || ((obj === g.uarmu) && (g.uarmc || g.uarm))) {
        let why = '', what = '';

        if (obj !== g.uskin) {
            if (g.uarmc)
                what += cloak_simple_name(g.uarmc);
            if ((obj === g.uarmu) && g.uarm) {
                if (g.uarmc)
                    what += " and ";
                what += suit_simple_name(g.uarm);
            }
            why = ` without taking off your ${what} first`;
        } else {
            why = "; it's embedded";
        }
        await You_cant(`take that off${why}.`);
        return ECMD_OK;
    }

    reset_remarm(); /* clear context.takeoff.mask and context.takeoff.what */
    await select_off(obj);
    if (!takeoff_ctx().mask)
        return ECMD_OK;
    /* none of armoroff()/Ring_/Amulet/Blindf_off() use context.takeoff.mask */
    reset_remarm();

    if (obj.owornmask & W_ARMOR) {
        await armoroff(obj);
    } else if (obj === g.uright || obj === g.uleft) {
        /* Sometimes we want to give the off_msg before removing and
         * sometimes after; for instance, "you were wearing a moonstone
         * ring (on right hand)" is desired but "you were wearing a
         * square amulet (being worn)" is not because of the redundant
         * "being worn".
         */
        await off_msg(obj);
        await Ring_off(obj);
    } else if (obj === g.uamul) {
        await Amulet_off(); /* does its own off_msg */
    } else if (obj === g.ublindf) {
        await Blindf_off(obj); /* does its own off_msg */
    } else {
        impossible(`removing strange accessory: ${obj.otyp}`);
        if (obj.owornmask)
            await remove_worn_item(obj, false);
    }
    return ECMD_TIME;
}

// C ref: do_wear.c dotakeoff()
/* the #takeoff command - remove worn armor */
export async function dotakeoff() {
    const g = game;
    const which = { obj: null };
    let otmp;

    count_worn_stuff(which, false);
    otmp = which.obj;
    if (!Narmorpieces && !Naccessories) {
        /* assert( GRAY_DRAGON_SCALES > YELLOW_DRAGON_SCALE_MAIL ); */
        if (g.uskin)
            await pline(`The ${g.uskin.otyp >= O.GRAY_DRAGON_SCALES
                               ? "dragon scales are"
                               : "dragon scale mail is"} merged with your skin!`);
        else
            await pline("Not wearing any armor or accessories.");
        return ECMD_OK;
    }
    if (Narmorpieces !== 1 || ParanoidRemove() || g.item_action_in_progress)
        otmp = await getobj("take off", takeoff_ok, GETOBJ_NOFLAGS);
    if (!otmp)
        return ECMD_CANCEL;

    return await armor_or_accessory_off(otmp);
}

// C ref: do_wear.c ia_dotakeoff()
/* 'i' or 'I[' followed by <invlet> and then 'T';
   plain dotakeoff() would not give any feedback when picking suit
   covered by cloak, or shirt covered by suit and/or cloak, due to the
   default behavior of equip_ok() (skipping inaccessible items) */
export async function ia_dotakeoff() {
    let res;

    game.item_action_in_progress = true;
    try {
        res = await dotakeoff();
    } finally {
        game.item_action_in_progress = false;
    }
    return res;
}

/* C ref: flag.h ParanoidRemove -- flags.paranoia_bits is
   PARANOID_PRAY | PARANOID_SWIM | PARANOID_TRAP by default (options.c
   initoptions_init()); parsing the paranoid_confirmation option isn't
   ported */
function ParanoidRemove() {
    if (game.flags.paranoid_confirmation !== undefined
        || game.flags.paranoid_confirm !== undefined)
        throw new Error('paranoia_bits: the paranoid_confirmation option is not ported yet');
    return false;
}

// C ref: do_wear.c cursed()
/* Check if something worn is cursed _and_ unremovable. */
export async function cursed(otmp) {
    const g = game;
    if (!otmp) {
        impossible("cursed without otmp");
        return 0;
    }
    /* Curses, like chickens, come home to roost. */
    if ((otmp === g.uwep) ? welded(otmp) : !!otmp.cursed) {
        const use_plural = (is_boots(otmp) || is_gloves(otmp)
                            || otmp.otyp === LENSES || otmp.quan > 1);

        /* might be trying again after applying grease to hands */
        if (Glib() && otmp.bknown
            /* for weapon, we'll only get here via 'A )' */
            && (g.uarmg ? (otmp === g.uwep)
                        : ((otmp.owornmask & (W_WEP | W_RING)) !== 0)))
            throw new Error('cursed(): slippery fingers message not ported yet');
        else
            await You(`can't.  ${use_plural ? "They are" : "It is"} cursed.`);
        otmp.bknown = 1; /* set_bknown(otmp, 1) */
        return 1;
    }
    return 0;
}

// C ref: do_wear.c armoroff()
async function armoroff(otmp) {
    const g = game;
    const delay = -objects[otmp.otyp].oc_delay;
    let what = null;

    if (await cursed(otmp))
        return 0;
    /* this used to make assumptions about which types of armor had
       delays and which didn't; now both are handled for all types */
    if (delay) {
        nomul(delay);
        g.multi_reason = "disrobing";
        switch (objects[otmp.otyp].oc_armcat) {
        case ARM_SUIT:
            what = suit_simple_name(otmp);
            g.afternmv = Armor_off;
            break;
        case ARM_SHIELD:
            what = shield_simple_name(otmp);
            g.afternmv = Shield_off;
            break;
        case ARM_HELM:
            what = helm_simple_name(otmp);
            g.afternmv = Helmet_off;
            break;
        case ARM_GLOVES:
            what = gloves_simple_name(otmp);
            g.afternmv = Gloves_off;
            break;
        case ARM_BOOTS:
            what = boots_simple_name(otmp);
            g.afternmv = Boots_off;
            break;
        case ARM_CLOAK:
            what = cloak_simple_name(otmp);
            g.afternmv = Cloak_off;
            break;
        case ARM_SHIRT:
            what = shirt_simple_name(otmp);
            g.afternmv = Shirt_off;
            break;
        default:
            impossible(`Taking off unknown armor (${otmp.otyp}: ${
                objects[otmp.otyp].oc_armcat}), delay ${delay}`);
            break;
        }
        if (what) {
            g.nomovemsg = `You finish taking off your ${what}.`;
        }
    } else {
        /* no delay so no '(*afternmv)()' or 'nomovemsg' */
        switch (objects[otmp.otyp].oc_armcat) {
        case ARM_SUIT:
            await Armor_off();
            break;
        case ARM_SHIELD:
            await Shield_off();
            break;
        case ARM_HELM:
            await Helmet_off();
            break;
        case ARM_GLOVES:
            await Gloves_off();
            break;
        case ARM_BOOTS:
            await Boots_off();
            break;
        case ARM_CLOAK:
            await Cloak_off();
            break;
        case ARM_SHIRT:
            await Shirt_off();
            break;
        default:
            impossible(`Taking off unknown armor (${otmp.otyp}: ${
                objects[otmp.otyp].oc_armcat}), no delay`);
            break;
        }
        /* We want off_msg() after removing the item to
           avoid "You were wearing ____ (being worn)." */
        await off_msg(otmp);
    }
    takeoff_ctx().mask = takeoff_ctx().what = 0;
    return 1;
}

// C ref: do_wear.c select_off()
async function select_off(otmp) {
    const g = game;
    const u = g.u;
    const tk = takeoff_ctx();
    let why;
    let buf = '';

    if (!otmp)
        return 0;

    /* special ring checks */
    if (otmp === g.uright || otmp === g.uleft) {
        if ((g.youmonst.data.mflags1 & M1_NOLIMBS) === M1_NOLIMBS) { /* nolimbs() */
            await pline("The ring is stuck.");
            return 0;
        }
        why = null; /* the item which prevents ring removal */
        if (welded(g.uwep)
            && ((otmp === (u.uhandedness ? g.uleft : g.uright)) /* RING_ON_PRIMARY */
                || bimanual(g.uwep))) {
            buf = `free a weapon ${body_part(HAND)}`;
            why = g.uwep;
        } else if (g.uarmg && (g.uarmg.cursed || Glib())) {
            buf = `take off your ${Glib() ? "slippery " : ""}${
                gloves_simple_name(g.uarmg)}`;
            why = !Glib() ? g.uarmg : {};
        }
        if (why) {
            await You(`cannot ${buf} to remove the ring.`);
            why.bknown = 1; /* set_bknown(why, 1) */
            return 0;
        }
    }
    /* special glove checks */
    if (otmp === g.uarmg) {
        if (welded(g.uwep)) {
            throw new Error('select_off(): gloves under a welded weapon not ported yet');
        } else if (Glib()) {
            await pline(`${g.uarmg.unpaid ? "The" : "Your"} ${
                gloves_simple_name(g.uarmg)} are too slippery to take off.`);
            return 0;
        }
        if (await better_not_take_that_off(otmp))
            return 0;
    }
    /* special boot checks */
    if (otmp === g.uarmf) {
        if (u.utrap && u.utraptype === TT_BEARTRAP) {
            await pline(`The bear trap prevents you from pulling your ${
                body_part(FOOT)} out.`);
            return 0;
        } else if (u.utrap && u.utraptype === TT_INFLOOR) {
            throw new Error('select_off(): stuck in the floor not ported yet');
        }
    }
    /* special suit and shirt checks */
    if (otmp === g.uarm || otmp === g.uarmu) {
        why = null; /* the item which prevents disrobing */
        if (g.uarmc && g.uarmc.cursed) {
            buf = `remove your ${cloak_simple_name(g.uarmc)}`;
            why = g.uarmc;
        } else if (otmp === g.uarmu && g.uarm && g.uarm.cursed) {
            buf = "remove your suit"; /* c_suit */
            why = g.uarm;
        } else if (welded(g.uwep) && bimanual(g.uwep)) {
            throw new Error('select_off(): releasing a welded two-hander not ported yet');
        }
        if (why) {
            await You(`cannot ${buf} to take off ${the(xname(otmp))}.`);
            why.bknown = 1; /* set_bknown(why, 1) */
            return 0;
        }
    }
    /* basic curse check */
    if (otmp === g.uquiver || (otmp === g.uswapwep && !u.twoweap)) {
        ; /* some items can be removed even when cursed */
    } else {
        /* otherwise, this is fundamental */
        if (await cursed(otmp))
            return 0;
    }

    if (otmp === g.uarm)
        tk.mask |= W_ARM; /* WORN_ARMOR */
    else if (otmp === g.uarmc)
        tk.mask |= W_ARMC; /* WORN_CLOAK */
    else if (otmp === g.uarmf)
        tk.mask |= W_ARMF; /* WORN_BOOTS */
    else if (otmp === g.uarmg)
        tk.mask |= W_ARMG; /* WORN_GLOVES */
    else if (otmp === g.uarmh)
        tk.mask |= W_ARMH; /* WORN_HELMET */
    else if (otmp === g.uarms)
        tk.mask |= W_ARMS; /* WORN_SHIELD */
    else if (otmp === g.uarmu)
        tk.mask |= W_ARMU; /* WORN_SHIRT */
    else if (otmp === g.uleft)
        tk.mask |= LEFT_RING;
    else if (otmp === g.uright)
        tk.mask |= RIGHT_RING;
    else if (otmp === g.uamul)
        tk.mask |= W_AMUL; /* WORN_AMUL */
    else if (otmp === g.ublindf)
        tk.mask |= W_TOOL; /* WORN_BLINDF */
    else if (otmp === g.uwep)
        tk.mask |= W_WEP;
    else if (otmp === g.uswapwep)
        tk.mask |= W_SWAPWEP;
    else if (otmp === g.uquiver)
        tk.mask |= W_QUIVER;

    else
        impossible(`select_off: ${doname(otmp)}???`);

    return 0;
}

// C ref: do_wear.c better_not_take_that_off()
async function better_not_take_that_off(otmp) {
    void otmp;
    /* carrying_stoning_corpse() */
    for (let o = game.invent; o; o = o.nobj)
        if (o.otyp === O.CORPSE
            && (o.corpsenm === PM_COCKATRICE || o.corpsenm === PM_CHICKATRICE))
            throw new Error('better_not_take_that_off(): carrying a stoning corpse not ported yet');
    return false;
}

// C ref: do_wear.c reset_remarm()
/* clear saved context to avoid inappropriate resumption of interrupted 'A' */
export function reset_remarm() {
    const tk = takeoff_ctx();
    tk.what = tk.mask = 0;
    tk.disrobing = '';
}

// C ref: do_wear.c inaccessible_equipment()
/* used by #dip, #grease, and getobj() callbacks for 'T' and 'R';
   some criteria are different than select_off()'s */
export function inaccessible_equipment(obj,
                                      verb, /* "dip" or "grease", or null to avoid messages */
                                      only_if_known_cursed) /* ignore covering unless it is known to
                                                             * be cursed */ {
    const g = game;
    const anycovering = !only_if_known_cursed; /* more comprehensible... */
    const BLOCKSACCESS = x => (anycovering || (x.cursed && x.bknown));

    if (!obj || !obj.owornmask)
        return false; /* not inaccessible */

    /* check for suit covered by cloak */
    if (obj === g.uarm && g.uarmc && BLOCKSACCESS(g.uarmc)) {
        if (verb)
            throw new Error('inaccessible_equipment(): need-to-take-off message not ported yet');
        return true;
    }
    /* check for shirt covered by suit and/or cloak */
    if (obj === g.uarmu
        && ((g.uarm && BLOCKSACCESS(g.uarm)) || (g.uarmc && BLOCKSACCESS(g.uarmc)))) {
        if (verb)
            throw new Error('inaccessible_equipment(): need-to-take-off message not ported yet');
        return true;
    }
    /* check for ring covered by gloves */
    if ((obj === g.uleft || obj === g.uright) && g.uarmg && BLOCKSACCESS(g.uarmg)) {
        if (verb)
            throw new Error('inaccessible_equipment(): need-to-take-off message not ported yet');
        return true;
    }
    /* item is not inaccessible */
    return false;
}

// C ref: do_wear.c takeoff_ok()
/* getobj callback for T command */
function takeoff_ok(obj) {
    return equip_ok(obj, true, false);
}

// C ref: do_wear.c some_armor()
/* pick a random piece of armor worn by victim */
export function some_armor(victim) {
    const you = (victim === game.youmonst);
    let otmph, otmp;

    otmph = you ? game.uarmc : which_armor_dw(victim, W_ARMC);
    if (!otmph)
        otmph = you ? game.uarm : which_armor_dw(victim, W_ARM);
    if (!otmph)
        otmph = you ? game.uarmu : which_armor_dw(victim, W_ARMU);

    otmp = you ? game.uarmh : which_armor_dw(victim, W_ARMH);
    if (otmp && (!otmph || !rn2_dw(4)))
        otmph = otmp;
    otmp = you ? game.uarmg : which_armor_dw(victim, W_ARMG);
    if (otmp && (!otmph || !rn2_dw(4)))
        otmph = otmp;
    otmp = you ? game.uarmf : which_armor_dw(victim, W_ARMF);
    if (otmp && (!otmph || !rn2_dw(4)))
        otmph = otmp;
    otmp = you ? game.uarms : which_armor_dw(victim, W_ARMS);
    if (otmp && (!otmph || !rn2_dw(4)))
        otmph = otmp;
    return otmph || null;
}

// C ref: do_wear.c wornarm_destroyed()
/* take off the specific worn object and if it still exists after that,
   destroy it (taking off the item might already destroy it by dunking
   hero into lava) */
async function wornarm_destroyed(wornarm) {
    const g = game;
    let invobj, nextobj;
    const wornoid = wornarm.o_id;

    /* cancel_don() resets 'afternmv' when appropriate but doesn't reset
       uarmc/uarm/&c so doing this now won't interfere with the tests in
       'if (wornarm==uarmc) ... else if (wornarm==uarm) ... else ...' */
    if (donning(wornarm))
        cancel_don();

    if (wornarm === g.uarmc)
        await Cloak_off();
    else if (wornarm === g.uarm)
        await Armor_off();
    else if (wornarm === g.uarmu)
        await Shirt_off();
    else if (wornarm === g.uarmh)
        await Helmet_off();
    else if (wornarm === g.uarmg)
        await Gloves_off();
    else if (wornarm === g.uarmf)
        await Boots_off();
    else if (wornarm === g.uarms)
        await Shield_off();

    /* 'wornarm' might be destroyed as a side-effect of xxx_off() so
       using carried() to check wornarm->where==OBJ_INVENT is not viable;
       scan invent instead; if already freed it shouldn't be possible to
       have re-used the stale memory for a new item yet but verify o_id
       just in case */
    for (invobj = g.invent; invobj; invobj = nextobj) {
        nextobj = invobj.nobj;
        if (invobj === wornarm && invobj.o_id === wornoid) {
            useup_dw(wornarm);
            break;
        }
    }
}

// C ref: do_wear.c maybe_destroy_armor()
/*
 * returns impacted armor with its in_use bit set,
 * or Null. resisted.v is updated to reflect whether
 * it resisted or not */
function maybe_destroy_armor(armor, atmp, resisted) {
    if (armor && (!atmp || atmp === armor)
        && ((resisted.v = obj_resists_dw(armor, 0, 90)) === false)) {
        armor.in_use = 1;
        return armor;
    }
    return null;
}

// C ref: do_wear.c disintegrate_arm()
/* hit by destroy armor scroll/black dragon breath */
export async function disintegrate_arm(atmp) {
    const g = game;
    let otmp = null;
    let losing_gloves = false;
    const resisted = { v: false }, resistedc = { v: false },
        resistedsuit = { v: false };
    /*
     * Note: if the cloak resisted, then the suit or shirt underneath
     * wouldn't be impacted either. Likewise, if the suit resisted, the
     * shirt underneath wouldn't be impacted. Since there are no artifact
     * cloaks or suits right now, this is unlikely to come into effect,
     * but it should behave appropriately if/when the situation changes.
     */

    if ((otmp = maybe_destroy_armor(g.uarmc, atmp, resistedc)) !== null) {
        await urgent_pline_dw(`Your ${
            /* cloak/robe/apron/smock (ID'd apron)/wrapping */
            cloak_simple_name(otmp)} crumbles and turns to dust!`);
    } else if (!resistedc.v
               && (otmp = maybe_destroy_armor(g.uarm, atmp, resistedsuit)) !== null) {
        const suit = suit_simple_name(otmp);

        /* for gold DSM, we don't want Armor_gone() to report that it
           stops shining _after_ we've been told that it is destroyed */
        if (otmp.lamplit)
            end_burn(otmp, false);
        /* suit might be "dragon scales" so vtense() is needed */
        await urgent_pline_dw(`Your ${suit} ${vtense_dw(suit, "turn")} to dust and ${
            vtense_dw(suit, "fall")} to the ${surface(g.u.ux, g.u.uy)}!`);
    } else if (!resistedc.v && !resistedsuit.v
               && (otmp = maybe_destroy_armor(g.uarmu, atmp, resisted)) !== null) {
        await urgent_pline_dw(`Your ${
            shirt_simple_name(otmp)} crumbles into tiny threads and falls apart!`); /* always "shirt" */
    } else if ((otmp = maybe_destroy_armor(g.uarmh, atmp, resisted)) !== null) {
        await urgent_pline_dw(`Your ${
            helm_simple_name(otmp)} turns to dust and is blown away!`); /* "helm" or "hat" */
    } else if ((otmp = maybe_destroy_armor(g.uarmg, atmp, resisted)) !== null) {
        await urgent_pline_dw(`Your ${gloves_simple_name(otmp)} vanish!`);
        losing_gloves = true;
    } else if ((otmp = maybe_destroy_armor(g.uarmf, atmp, resisted)) !== null) {
        await urgent_pline_dw(`Your ${boots_simple_name(otmp)} disintegrate!`);
    } else if ((otmp = maybe_destroy_armor(g.uarms, atmp, resisted)) !== null) {
        await urgent_pline_dw(`Your ${shield_simple_name(otmp)} crumbles away!`);
    } else {
        return 0; /* could not destroy anything */
    }

    /* cancel_don() if applicable, Cloak_off()/Armor_off()/&c, and useup() */
    await wornarm_destroyed(otmp);
    /* glove loss means wielded weapon will be touched */
    if (losing_gloves)
        await selftouch_dw("You");

    await stop_occupation_dw();
    return 1;
}

// C ref: do_wear.c obj_erode_type()
/* return ERODE_foo erosion type which can apply to object */
function obj_erode_type(otmp) {
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

// C ref: do_wear.c destroy_arm()
/* erode a number of worn armor(s).
   if the armor is hit when max eroded, destroys it. */
export async function destroy_arm() {
    const g = game;
    const armors = [];
    let otmp;
    let i;
    const hits = rn2_dw(4) + 1;
    let ret = 0;

    /* gather worn armor; include non-erodeable ones */
    if (g.uarm) armors.push(g.uarm);
    if (g.uarmc) armors.push(g.uarmc);
    if (g.uarmh) armors.push(g.uarmh);
    if (g.uarms) armors.push(g.uarms);
    if (g.uarmg) armors.push(g.uarmg);
    if (g.uarmf) armors.push(g.uarmf);
    if (g.uarmu) armors.push(g.uarmu);
    if (!armors.length)
        return 0;

    for (i = 0; i < hits; i++) {
        otmp = armors[rn2_dw(armors.length)];

        if (erosion_matters(otmp) && is_damageable(otmp) && !otmp.oerodeproof) {
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
        await stop_occupation_dw();
    return ret;
}

// C ref: do_wear.c any_worn_armor_ok()
/* getobj callback for object to destroy with blessed destroy armor;
   suggest any worn armor, even if covered by other armor */
export function any_worn_armor_ok(obj) {
    if (obj && (obj.owornmask & W_ARMOR))
        return GETOBJ_SUGGEST;
    return GETOBJ_EXCLUDE;
}

// C ref: do_wear.c count_worn_armor()
/* number of armor pieces worn by hero */
export function count_worn_armor() {
    const g = game;
    let ret = 0;

    if (g.uarm) ret++;
    if (g.uarmc) ret++;
    if (g.uarmh) ret++;
    if (g.uarms) ret++;
    if (g.uarmg) ret++;
    if (g.uarmf) ret++;
    if (g.uarmu) ret++;

    return ret;
}


/* C ref: do_wear.c takeoff_order[] */
const takeoff_order = [
    WORN_BLINDF_DW, W_WEP_DW, WORN_SHIELD_DW, WORN_GLOVES_DW, LEFT_RING_DW,
    RIGHT_RING_DW, WORN_CLOAK_DW, WORN_HELMET_DW, WORN_AMUL_DW, WORN_ARMOR_DW,
    WORN_SHIRT_DW, WORN_BOOTS_DW, W_SWAPWEP_DW, W_QUIVER_DW, 0
];

// C ref: do_wear.c stuck_ring()
/* used for praying to check and fix levitation trouble */
export function stuck_ring(ring, otyp) {
    const g = game;

    if (ring !== g.uleft && ring !== g.uright) {
        impossible("stuck_ring: neither left nor right?");
        return null;
    }

    if (ring && ring.otyp === otyp) {
        /* reasons ring can't be removed match those checked by select_off();
           limbless case has extra checks because ordinarily it's temporary */
        if ((g.youmonst.data.mflags1 & M1_NOLIMBS) === M1_NOLIMBS /* nolimbs() */
            && g.uamul
            && g.uamul.otyp === O.AMULET_OF_UNCHANGING && g.uamul.cursed)
            return g.uamul;
        if (welded(g.uwep)
            && ((ring === (g.u.uhandedness ? g.uleft : g.uright)) /* RING_ON_PRIMARY */
                || bimanual(g.uwep)))
            return g.uwep;
        if (g.uarmg && g.uarmg.cursed)
            return g.uarmg;
        if (ring.cursed)
            return ring;
        /* normally outermost layer is processed first, but slippery gloves
           wears off quickly so uncurse ring itself before handling those */
        if (g.uarmg && Glib())
            return g.uarmg;
    }
    /* either no ring or not right type or nothing prevents its removal */
    return null;
}

// C ref: do_wear.c unchanger()
/* also for praying; find worn item that confers "Unchanging" attribute */
export function unchanger() {
    if (game.uamul && game.uamul.otyp === O.AMULET_OF_UNCHANGING)
        return game.uamul;
    return null;
}

// C ref: do_wear.c do_takeoff()
async function do_takeoff() {
    const g = game;
    let otmp = null;
    const was_twoweap = g.u.twoweap;
    const doff = takeoff_ctx();

    doff.mask |= I_SPECIAL; /* set flag for cancel_doff() */
    if (doff.what === W_WEP_DW) {
        if (!(await cursed(g.uwep))) {
            setuwep(null);
            if (was_twoweap)
                await You("are no longer wielding either weapon.");
            else
                await You(`are ${empty_handed_dw()}.`);
        }
    } else if (doff.what === W_SWAPWEP_DW) {
        setuswapwep(null);
        await You(`${was_twoweap ? "are " : ""}no longer ${
            was_twoweap ? "wielding two weapons at once"
                        : "have a second weapon readied"}.`);
    } else if (doff.what === W_QUIVER_DW) {
        setuqwep(null);
        await You("no longer have ammunition readied.");
    } else if (doff.what === WORN_ARMOR_DW) {
        otmp = g.uarm;
        if (!(await cursed(otmp)))
            await Armor_off();
    } else if (doff.what === WORN_CLOAK_DW) {
        otmp = g.uarmc;
        if (!(await cursed(otmp)))
            await Cloak_off();
    } else if (doff.what === WORN_BOOTS_DW) {
        otmp = g.uarmf;
        if (!(await cursed(otmp)))
            await Boots_off();
    } else if (doff.what === WORN_GLOVES_DW) {
        otmp = g.uarmg;
        if (!(await cursed(otmp)))
            await Gloves_off();
    } else if (doff.what === WORN_HELMET_DW) {
        otmp = g.uarmh;
        if (!(await cursed(otmp)))
            await Helmet_off();
    } else if (doff.what === WORN_SHIELD_DW) {
        otmp = g.uarms;
        if (!(await cursed(otmp)))
            await Shield_off();
    } else if (doff.what === WORN_SHIRT_DW) {
        otmp = g.uarmu;
        if (!(await cursed(otmp)))
            await Shirt_off();
    } else if (doff.what === WORN_AMUL_DW) {
        otmp = g.uamul;
        if (!(await cursed(otmp)))
            await Amulet_off();
    } else if (doff.what === LEFT_RING_DW) {
        otmp = g.uleft;
        if (!(await cursed(otmp)))
            await Ring_off(g.uleft);
    } else if (doff.what === RIGHT_RING_DW) {
        otmp = g.uright;
        if (!(await cursed(otmp)))
            await Ring_off(g.uright);
    } else if (doff.what === WORN_BLINDF_DW) {
        if (!(await cursed(g.ublindf)))
            await Blindf_off(g.ublindf);
    } else {
        impossible(`do_takeoff: taking off ${doff.what.toString(16)}`);
    }
    doff.mask &= ~I_SPECIAL; /* clear cancel_doff() flag */

    return otmp;
}

// C ref: do_wear.c take_off() -- occupation callback for 'A'
async function take_off() {
    const g = game;
    let otmp;
    const doff = takeoff_ctx();

    if (doff.what) {
        if (doff.delay > 0) {
            doff.delay--;
            return 1; /* still busy */
        }
        if ((otmp = await do_takeoff()) != null)
            await off_msg(otmp);
        doff.mask &= ~doff.what;
        doff.what = 0;
    }

    for (let i = 0; takeoff_order[i]; i++)
        if (doff.mask & takeoff_order[i]) {
            doff.what = takeoff_order[i];
            break;
        }

    otmp = null;
    doff.delay = 0;

    if (doff.what === 0) {
        await You(`finish ${doff.disrobing}.`);
        return 0;
    } else if (doff.what === W_WEP_DW) {
        doff.delay = 1;
    } else if (doff.what === W_SWAPWEP_DW) {
        doff.delay = 1;
    } else if (doff.what === W_QUIVER_DW) {
        doff.delay = 1;
    } else if (doff.what === WORN_ARMOR_DW) {
        otmp = g.uarm;
        /* If a cloak is being worn, add the time to take it off and put
         * it back on again.  Kludge alert! since that time is 0 for all
         * known cloaks, add 1 so that it actually matters...
         */
        if (g.uarmc)
            doff.delay += 2 * objects[g.uarmc.otyp].oc_delay + 1;
    } else if (doff.what === WORN_CLOAK_DW) {
        otmp = g.uarmc;
    } else if (doff.what === WORN_BOOTS_DW) {
        otmp = g.uarmf;
    } else if (doff.what === WORN_GLOVES_DW) {
        otmp = g.uarmg;
    } else if (doff.what === WORN_HELMET_DW) {
        otmp = g.uarmh;
    } else if (doff.what === WORN_SHIELD_DW) {
        otmp = g.uarms;
    } else if (doff.what === WORN_SHIRT_DW) {
        otmp = g.uarmu;
        /* add the time to take off and put back on armor and/or cloak */
        if (g.uarm)
            doff.delay += 2 * objects[g.uarm.otyp].oc_delay;
        if (g.uarmc)
            doff.delay += 2 * objects[g.uarmc.otyp].oc_delay + 1;
    } else if (doff.what === WORN_AMUL_DW) {
        doff.delay = 1;
    } else if (doff.what === LEFT_RING_DW) {
        doff.delay = 1;
    } else if (doff.what === RIGHT_RING_DW) {
        doff.delay = 1;
    } else if (doff.what === WORN_BLINDF_DW) {
        /* [this used to be 2, but 'R' (and 'T') only require 1 turn to
           remove a blindfold, so 'A' shouldn't have been requiring 2] */
        doff.delay = 1;
    } else {
        impossible(`take_off: taking off ${doff.what.toString(16)}`);
        return 0; /* force done */
    }

    if (otmp)
        doff.delay += objects[otmp.otyp].oc_delay;

    /* Since setting the occupation now starts the counter next move, that
     * would always produce a delay 1 too big per item unless we subtract
     * 1 here to account for it.
     */
    if (doff.delay > 0)
        doff.delay--;

    set_occupation_dw(take_off, doff.disrobing, 0);
    return 1; /* get busy */
}

// C ref: do_wear.c doddoremarm() -- the #takeoffall command, remove
// multiple worn items
export async function doddoremarm() {
    const g = game;
    const tk = takeoff_ctx();
    const result = 0;

    if (tk.what || tk.mask) {
        await You(`continue ${tk.disrobing}.`);
        set_occupation_dw(take_off, tk.disrobing, 0);
        return ECMD_OK;
    } else if (!g.uwep && !g.uswapwep && !g.uquiver && !g.uamul && !g.ublindf
               && !g.uleft && !g.uright && !wearing_armor_dw()) {
        await You("are not wearing anything.");
        return ECMD_OK;
    }

    add_valid_menu_class_dw(0); /* reset */
    if ((g.flags.menu_style ?? MENU_FULL_DW) !== MENU_TRADITIONAL_DW)
        await menu_remarm(result);
    else /* (result = ggetobj("take off", select_off, 0, FALSE, NULL)) < -1 */
        throw new Error('doddoremarm(): ggetobj() (menustyle:traditional) not ported yet');

    if (tk.mask) {
        tk.disrobing = ((tk.mask & ~W_WEAPONS) !== 0)
                       /* default activity for armor and/or accessories,
                          possibly combined with weapons */
                       ? "disrobing"
                       /* specific activity when handling weapons only */
                       : "disarming";
        await take_off();
    }
    /* The time to perform the command is already completely accounted for
     * in take_off(); if we return 1, that would add an extra turn to each
     * disrobe.
     */
    return ECMD_OK;
}

// C ref: do_wear.c menu_remarm()
async function menu_remarm(retry) {
    const g = game;
    let n, i = 0;
    const pick_list = [];
    let all_worn_categories = true;
    const menu_style = g.flags.menu_style ?? MENU_FULL_DW;

    if (retry) {
        all_worn_categories = (retry === -2);
    } else if (menu_style === MENU_FULL_DW) {
        all_worn_categories = false;
        n = await query_category_dw("What type of things do you want to take off?",
                                    g.invent, (WORN_TYPES_DW | ALL_TYPES_DW
                                               | UNPAID_TYPES_DW | BUCX_TYPES_DW),
                                    pick_list, PICK_ANY_DW);
        if (!n)
            return 0;
        for (i = 0; i < n; i++) {
            if (pick_list[i].item === ALL_TYPES_SELECTED_DW)
                all_worn_categories = true;
            else
                add_valid_menu_class_dw(pick_list[i].item);
        }
    } else if (menu_style === MENU_COMBINATION_DW) {
        /* i = ggetobj("take off", select_off, 0, TRUE, &ggofeedback); */
        throw new Error('menu_remarm(): ggetobj() (menustyle:combination) not ported yet');
    }
    if (menu_class_present_dw('u'.charCodeAt(0))
        || menu_class_present_dw('B'.charCodeAt(0))
        || menu_class_present_dw('U'.charCodeAt(0))
        || menu_class_present_dw('C'.charCodeAt(0))
        || menu_class_present_dw('X'.charCodeAt(0)))
        all_worn_categories = false;

    const invlist = [];
    for (let o = g.invent; o; o = o.nobj)
        invlist.push(o);
    const picks = [];
    n = await query_objlist_dw("What do you want to take off?", invlist,
                               (SIGNAL_NOMENU_DW | USE_INVLET_DW | INVORDER_SORT_DW),
                               picks, PICK_ANY_DW,
                               all_worn_categories ? is_worn_dw : is_worn_by_type_dw);
    if (n > 0) {
        for (i = 0; i < n; i++)
            await select_off(picks[i].obj);
    } else if (n < 0 && menu_style !== MENU_COMBINATION_DW) {
        await There("is nothing else you can remove or unwield.");
    }
    return 0;
}
