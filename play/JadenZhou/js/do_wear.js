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
    if (removing && !game.item_action_in_progress)
        throw new Error('equip_ok(): inaccessible_equipment() not ported yet');

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
