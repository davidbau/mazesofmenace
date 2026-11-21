// do_wear.js -- wearing armor and accessories.
// C ref: do_wear.c
//
// Ported so far: the #wear and #puton commands up to choosing the object
// (equip_ok(), wear_ok(), puton_ok() and their getobj() calls); putting
// the chosen object on (accessory_or_armor_on()) and canwearobj() are
// not ported yet.

import { game } from './gstate.js';
import { pline, You } from './display.js';
import { getobj } from './invent.js';
import { GETOBJ_SUGGEST, GETOBJ_DOWNPLAY, GETOBJ_EXCLUDE,
         GETOBJ_EXCLUDE_INACCESS, GETOBJ_NOFLAGS, ECMD_OK, ECMD_CANCEL,
         ECMD_TIME, W_ARMOR, W_ACCESSORY } from './const.js';
import { ARMOR_CLASS, RING_CLASS, AMULET_CLASS, MEAT_RING, BLINDFOLD, TOWEL,
         LENSES } from './objects.js';
import { M1_NOHANDS, MZ_SMALL, M1_NOLIMBS, M1_HUMANOID, M1_NOHEAD,
         M3_INFRAVISION } from './monsters.js';
import { xname, an } from './objnam.js';
import { vision_recalc } from './vision.js';
import { HEAD, BLINDED, TELEPAT, INFRAVISION } from './const.js';
import * as O from './objects.js';
import { prinv } from './invent.js';
import { tty_yn_function } from './wintty.js';
import { body_part } from './insight.js';
import { setworn, setuwep, setuswapwep, setuqwep, bimanual, welded,
         retouch_object } from './wield.js';
import { W_RING, W_AMUL, W_TOOL, W_SADDLE, W_WEAPONS, LEFT_RING, RIGHT_RING,
         FINGER, GLIB } from './const.js';
import { W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU, W_WEP,
         W_SWAPWEP, W_QUIVER, I_SPECIAL, ACID_RES, TT_BEARTRAP, TT_INFLOOR,
         HAND, FOOT } from './const.js';
import { objects, ARM_SUIT, ARM_SHIELD, ARM_HELM, ARM_GLOVES, ARM_BOOTS,
         ARM_CLOAK, ARM_SHIRT } from './objects.js';
import { PM_ARCHEOLOGIST, PM_COCKATRICE, PM_CHICKATRICE } from './monsters.js';
import { You_cant } from './display.js';
import { doname, cloak_simple_name, suit_simple_name, helm_simple_name,
         gloves_simple_name, boots_simple_name, shield_simple_name,
         shirt_simple_name } from './objnam.js';
import { the } from './iactions.js';
import { change_luck } from './attrib.js';
import { nomul } from './hack.js';
import { encumber_msg } from './pickup.js';

// C's impossible() (pline.c) is not ported yet.
function impossible(msg) { console.error(`impossible: ${msg}`); }

/* C ref: mondata.h nohands(), verysmall() */
function nohands(ptr) { return (ptr.mflags1 & M1_NOHANDS) !== 0; }
function verysmall(ptr) { return ptr.msize < MZ_SMALL; }

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
    if (obj.oclass === ARMOR_CLASS && !removing)
        throw new Error('equip_ok(): canwearobj() not ported yet');

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
        && game.uarmg && game.uarmf)
        throw new Error('doputon(): fingers_or_gloves() message not ported yet');
    const otmp = await getobj("put on", puton_ok, GETOBJ_NOFLAGS);
    return otmp ? await accessory_or_armor_on(otmp) : ECMD_CANCEL;
}

// C ref: do_wear.c on_msg()
async function on_msg(otmp) {
    /* on_msg() for rings and amulets just shows add-to-invent feedback */
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
        if (otmp.oartifact)
            throw new Error('on_msg(): obj_is_pname() not ported yet');
        await You(`are now wearing ${an(otmp_name)}${how}.`);
    }
}

/* C ref: you.h Blind -- Blinded intrinsic or extrinsic (blindfold),
   not blocked */
function Blind() {
    const p = game.u.uprops?.[BLINDED];
    return !!((p?.intrinsic || p?.extrinsic) && !p?.blocked);
}

// C ref: potion.c toggle_blindness() -- blindness has just been toggled
function toggle_blindness() {
    game.disp_botl = true; /* status conditions need update */
    game.vision_full_recalc = 1; /* vision has changed */
    vision_recalc(0);
    /* Blind_telepat || Infravision || Stinging: see_monsters() */
    if (game.u.uprops?.[TELEPAT]?.intrinsic || game.u.uprops?.[TELEPAT]?.extrinsic
        || game.u.uprops?.[INFRAVISION]?.intrinsic || game.u.uprops?.[INFRAVISION]?.extrinsic)
        throw new Error('toggle_blindness(): see_monsters() not ported yet');
    /* update dknown flag for inventory picked up while blind */
    if (!Blind())
        throw new Error('toggle_blindness(): learn_unseen_invent() not ported yet');
}

// C ref: do_wear.c Blindf_on()
async function Blindf_on(otmp) {
    const already_blind = Blind();
    let changed = false;

    /* blindfold might be wielded; release it for wearing */
    if (otmp.owornmask)
        throw new Error('Blindf_on(): remove_worn_item() not ported yet');
    setworn(otmp, W_TOOL);
    await on_msg(otmp);

    if (Blind() && !already_blind) {
        changed = true;
        if (game.flags?.verbose ?? true)
            await pline("You can't see any more."); /* You_cant() */
        /* set ball&chain variables before the hero goes blind */
        if (game.uball)
            throw new Error('Blindf_on(): set_bc() not ported yet');
    } else if (already_blind && !Blind()) {
        throw new Error('Blindf_on(): regaining sight not ported yet');
    }
    if (changed) {
        toggle_blindness(); /* potion.c */
    }
}

// C ref: do_wear.c Ring_on() -- rings whose effect is only the
// extrinsic property so far
function Ring_on(obj) {
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

// C ref: do_wear.c accessory_or_armor_on() -- worn items and rings so
// far; armor, amulets and eyewear are not ported yet
async function accessory_or_armor_on(obj) {
    let mask = 0;

    if (obj.owornmask & (W_ACCESSORY | W_ARMOR)) {
        await You("are already wearing that!"); /* already_wearing(c_that_) */
        return ECMD_OK;
    }
    const armor = (obj.oclass === ARMOR_CLASS);
    const ring = (obj.oclass === RING_CLASS || obj.otyp === MEAT_RING);
    const amulet = (obj.oclass === AMULET_CLASS);
    const eyewear = (obj.otyp === BLINDFOLD || obj.otyp === TOWEL
                     || obj.otyp === LENSES);
    /* checks which are performed prior to actually touching the item */
    if (armor) {
        throw new Error('accessory_or_armor_on(): canwearobj() not ported yet');
    } else {
        /* accessory */
        if (ring) {
            let answer;
            let res = 0;

            if ((game.youmonst.data.mflags1 & M1_NOLIMBS) === M1_NOLIMBS) {
                await You("cannot make the ring stick to your body.");
                return ECMD_OK;
            }
            if (game.uleft && game.uright)
                throw new Error('accessory_or_armor_on(): fingers_or_gloves() message not ported yet');
            if (game.uleft) {
                mask = RIGHT_RING;
            } else if (game.uright) {
                mask = LEFT_RING;
            } else {
                do {
                    const qbuf = `Which ${(game.youmonst.data.mflags1 & M1_HUMANOID) ? "ring-" : ""}`
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
            if (game.uarmg && game.u.uprops?.[GLIB]?.intrinsic)
                throw new Error('accessory_or_armor_on(): slippery gloves not ported yet');
            if (game.uarmg && game.uarmg.cursed)
                throw new Error('accessory_or_armor_on(): cursed gloves not ported yet');
            if (game.uwep) {
                res = !game.uwep.bknown; /* check this before calling welded() */
                if (((mask === RIGHT_RING && !game.u.uhandedness)
                     || (mask === LEFT_RING && game.u.uhandedness)
                     || bimanual(game.uwep)) && welded(game.uwep))
                    throw new Error('accessory_or_armor_on(): welded weapon hand not ported yet');
                void res;
            }
        } else if (amulet) {
            throw new Error('accessory_or_armor_on(): amulets not ported yet');
        } else if (eyewear) {
            if (game.youmonst.data.mflags1 & M1_NOHEAD)
                throw new Error('accessory_or_armor_on(): no-head message not ported yet');
            if (game.ublindf)
                throw new Error('accessory_or_armor_on(): already wearing eyewear not ported yet');
        } else {
            /* neither armor nor accessory */
            await pline("You can't wear that!"); /* You_cant() */
            return ECMD_OK;
        }
    }

    if (!retouch_object(obj))
        return ECMD_TIME; /* costs a turn even though it didn't get worn */

    /* not armor */
    if (ring) {
        /* Ring_on() expects ring to already be worn as uleft or uright */
        setworn(obj, mask);
        Ring_on(obj);
        /* is_worn(): 'obj' will always be worn here except when putting
           on a ring of levitation while at a sink location */
        if (obj.owornmask & (W_ARMOR | W_ACCESSORY | W_SADDLE | W_WEAPONS))
            await on_msg(obj);
    } else if (amulet) {
        throw new Error('accessory_or_armor_on(): Amulet_on() not ported yet');
    } else if (eyewear) {
        /* setworn() and on_msg() handled by Blindf_on() */
        await Blindf_on(obj);
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

/* C ref: youprop.h u.uprops[] entry */
function uprop(p) {
    const u = game.u;
    if (!u.uprops[p]) u.uprops[p] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    return u.uprops[p];
}
function Glib() { return !!(uprop(GLIB).intrinsic || uprop(GLIB).extrinsic); }
/* C ref: role.h Role_if() */
function Role_if(pm) { return game.urole.mnum === pm; }
/* C ref: obj.h is_boots(), is_gloves() */
function is_boots(otmp) {
    return otmp.oclass === ARMOR_CLASS && objects[otmp.otyp].oc_armcat === ARM_BOOTS;
}
function is_gloves(otmp) {
    return otmp.oclass === ARMOR_CLASS && objects[otmp.otyp].oc_armcat === ARM_GLOVES;
}

// C ref: do_wear.c off_msg()
async function off_msg(otmp) {
    if (game.flags.verbose)
        await You(`were wearing ${doname(otmp)}.`);
}

// C ref: do_wear.c Boots_off()
async function Boots_off() {
    const g = game;
    const otmp = g.uarmf;
    const otyp = otmp.otyp;
    const oldprop = uprop(objects[otyp].oc_oprop).extrinsic & ~W_ARMF;
    void oldprop;

    takeoff_ctx().mask &= ~W_ARMF;
    /* For levitation, float_down() returns if Levitation, so we
     * must do a setworn() _before_ the levitation case.
     */
    setworn(null, W_ARMF);
    switch (otyp) {
    case O.SPEED_BOOTS:
    case O.WATER_WALKING_BOOTS:
    case O.ELVEN_BOOTS:
    case O.FUMBLE_BOOTS:
    case O.LEVITATION_BOOTS:
        throw new Error('Boots_off(): magic boots not ported yet');
    case O.LOW_BOOTS:
    case O.IRON_SHOES:
    case O.HIGH_BOOTS:
    case O.JUMPING_BOOTS:
    case O.KICKING_BOOTS:
        break;
    default:
        impossible(`Boots_off(): unknown type of boots (${otyp})`);
    }
    takeoff_ctx().cancelled_don = false;
    return 0;
}

// C ref: do_wear.c Cloak_off()
async function Cloak_off() {
    const g = game;
    const otmp = g.uarmc;
    const otyp = otmp.otyp;
    const oldprop = uprop(objects[otyp].oc_oprop).extrinsic & ~W_ARMC;
    void oldprop;

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
        throw new Error('Cloak_off(): toggle_stealth() not ported yet');
    case O.CLOAK_OF_DISPLACEMENT:
        throw new Error('Cloak_off(): toggle_displacement() not ported yet');
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
async function Helmet_off() {
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
        if (!tk.cancelled_don)
            throw new Error('Helmet_off(): cornuthaum ABON(A_CHA) not ported yet');
        break;
    case O.HELM_OF_TELEPATHY:
    case O.HELM_OF_CAUTION:
        /* need to update ability before calling see_monsters() */
        throw new Error('Helmet_off(): helm of telepathy/caution see_monsters() not ported yet');
    case O.HELM_OF_BRILLIANCE:
        if (!tk.cancelled_don)
            throw new Error('Helmet_off(): adj_abon() not ported yet');
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
async function Gloves_off() {
    const g = game;
    const tk = takeoff_ctx();
    tk.mask &= ~W_ARMG;

    switch (g.uarmg.otyp) {
    case O.LEATHER_GLOVES:
        break;
    case O.GAUNTLETS_OF_FUMBLING:
    case O.GAUNTLETS_OF_POWER:
    case O.GAUNTLETS_OF_DEXTERITY:
        throw new Error('Gloves_off(): magic gloves not ported yet');
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
        throw new Error('Gloves_off(): make_glib(0) not ported yet');

    /* prevent wielding cockatrice when not wearing gloves */
    if ((g.uwep && g.uwep.otyp === O.CORPSE)
        || (g.u.twoweap && g.uswapwep && g.uswapwep.otyp === O.CORPSE))
        throw new Error('Gloves_off(): wielding_corpse() not ported yet');

    /* condtests[bl_bareh].enabled: the bareh status condition isn't
       ported (off by default) */
    return 0;
}

// C ref: do_wear.c Shield_off()
async function Shield_off() {
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
async function Shirt_off() {
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
async function Armor_off() {
    const g = game;
    const otmp = g.uarm;
    const tk = takeoff_ctx();

    if (otmp && otmp.lamplit)
        throw new Error('Armor_off(): artifact_light() end_burn() not ported yet');
    tk.mask &= ~W_ARM;
    setworn(null, W_ARM);
    tk.cancelled_don = false;

    /* taking off yellow dragon scales/mail might be fatal; arti_light
       comes from gold dragon scales/mail so they don't overlap, but
       conceptually the non-fatal change should be done before the
       potentially fatal change in case the latter results in bones */
    dragon_armor_handling(otmp, false, true);

    return 0;
}

// C ref: do_wear.c dragon_armor_handling() -- only armor without dragon
// scale effects
function dragon_armor_handling(otmp, puton, on_purpose) {
    void puton; void on_purpose;
    if (!otmp)
        return;
    if (otmp.otyp >= O.GRAY_DRAGON_SCALE_MAIL
        && otmp.otyp <= O.YELLOW_DRAGON_SCALES)
        throw new Error('dragon_armor_handling(): dragon scale effects not ported yet');
}

// C ref: do_wear.c cancel_don()
export function cancel_don() {
    const g = game;
    const tk = takeoff_ctx();
    /* the piece of armor we were donning/doffing has vanished, so stop
     * wasting time on it (and don't dereference it when donning would
     * otherwise finish)
     */
    /* afternmv == Boots_on || Helmet_on || Gloves_on || Armor_on: none of
       the delayed X_on() routines is ported yet, so afternmv can't be one */
    tk.cancelled_don = false;
    g.afternmv = null;
    g.nomovemsg = null;
    g.multi = 0;
    tk.delay = 0;
    tk.what = 0;
}

// C ref: do_wear.c cancel_doff()
/* called by steal() during theft from hero; interrupt donning/doffing */
export function cancel_doff(obj, slotmask) {
    void obj;
    const tk = takeoff_ctx();
    /* Called by setworn() for old item in specified slot or by setnotworn()
     * for specified item.  We don't want to call cancel_don() if we got
     * here via <X>_off() -> setworn((struct obj *)0) -> cancel_doff()
     * because that would stop the 'A' command from continuing with next
     * selected item.  So do_takeoff() sets a flag in takeoff.mask for us.
     * [For taking off an individual item with 'T' or 'R', taking off
     * cloak before suit or shirt, the flag isn't set because we're not
     * there.]
     */
    if (!(tk.mask & I_SPECIAL))
        cancel_don();
    tk.mask &= ~slotmask;
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
        throw new Error('armor_or_accessory_off(): Ring_off() not ported yet');
    } else if (obj === g.uamul) {
        throw new Error('armor_or_accessory_off(): Amulet_off() not ported yet');
    } else if (obj === g.ublindf) {
        throw new Error('armor_or_accessory_off(): Blindf_off() not ported yet');
    } else {
        impossible(`removing strange accessory: ${obj.otyp}`);
        if (obj.owornmask)
            throw new Error('armor_or_accessory_off(): remove_worn_item() not ported yet');
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
async function cursed(otmp) {
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
function inaccessible_equipment(obj,
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
