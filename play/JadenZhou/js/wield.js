// wield.js -- wielding weapons.
// C ref: wield.c
//
// Ported so far: welded() with its will_weld()/erodeable_wep() macros,
// obj.h is_weptool()/bimanual(), and engrave.c freehand().

import { retouch_object, arti_speak, undiscovered_artifact,
         artifact_light } from './artifact.js';
import { ART_EYES_OF_THE_OVERWORLD } from './artilist.js';
import { game } from './gstate.js';
import { P_NONE, P_BOW, P_CROSSBOW, P_DART, P_BOOMERANG, P_POLEARMS, P_LANCE,
         W_WEP, W_SWAPWEP, W_QUIVER } from './const.js';
import { objects, WEAPON_CLASS, TOOL_CLASS, GEM_CLASS, TIN_OPENER,
         HEAVY_IRON_BALL, IRON_CHAIN, TOWEL, CORPSE, AKLYS, SILVER, is_weptool,
         bimanual, is_launcher, is_ammo, ammo_and_launcher, is_missile,
         is_pole, is_wet_towel, is_sword } from './objects.js';
import { ECMD_OK, ECMD_TIME, ECMD_FAIL, W_ARMOR, W_ACCESSORY,
         W_SADDLE, W_RINGL, W_RINGR, W_TOOL, W_ARM, W_ARMC, W_ARMH, W_ARMS,
         W_ARMG, W_ARMF, W_ARMU, W_AMUL, W_BALL, W_CHAIN, I_SPECIAL } from './const.js';
import { w_blocks } from './worn.js';
import { PM_MONK } from './monsters.js';
import { M1_NOHANDS, M2_DEMON, M2_WERE, S_IMP, S_VAMPIRE, MZ_SMALL, mons,
         PM_SHADE, PM_TENGU } from './monsters.js';
import { pline, You, You_cant } from './display.js';
import { rnd } from './rng.js';
import { AT_WEAP } from './monsters.js';
import { HAND, GLIB, A_DEX } from './const.js';
import { makeplural } from './objnam.js';
import { body_part, empty_handed as empty_handed_wl } from './insight.js';
import { ACURR } from './attrib.js';
import { prinv, getobj, hands_obj, splittable, freeinv } from './invent.js';
import { addinv } from './u_init.js';
import { splitobj, unsplitobj } from './mkobj.js';
import { reset_remarm } from './do_wear.js';
import { simpleonames } from './iactions.js';
import { vtense, otense } from './objnam.js';
import { inv_cnt } from './hack.js';
import { Shk_Your } from './shk.js';
import { tty_yn_function } from './wintty.js';
import { LENSES, ARMOR_CLASS, ARM_GLOVES, ARM_BOOTS } from './objects.js';
import { GETOBJ_SUGGEST, GETOBJ_DOWNPLAY, GETOBJ_PROMPT, GETOBJ_ALLOWCNT,
         ECMD_CANCEL, GETOBJ_EXCLUDE } from './const.js';
import { COIN_CLASS } from './objects.js';
import { setworn } from './worn.js';
import { BATTLE_AXE as BATTLE_AXE_WL } from './objects.js';
import { P_SHORT_SWORD as P_SHORT_SWORD_WL, P_SABER as P_SABER_WL } from './const.js';
import { xname as xname_wl, yname as yname_wl, doname as doname_wl,
         The as The_wl, aobjnam as aobjnam_wl } from './objnam.js';
import { Yname2, Yobjnam2 } from './objnam.js';
import { arti_light_description } from './light.js';
import { begin_burn, end_burn } from './timeout.js';
import { Tobjnam } from './objnam.js';
import { yobjnam } from './objnam.js';
import { Your } from './display.js';
import { dropx } from './do.js';
import { Blind } from './youprop.js';
import { nohands, verysmall, could_twoweap, cantwield } from './mondata.js';

// C ref: worn.c setworn() -- in worn.js
export { setworn };

// C ref: wield.c setuwep()
export function setuwep(obj) {
    const olduwep = game.uwep;

    if (obj === game.uwep)
        return; /* necessary to not set gu.unweapon */
    setworn(obj, W_WEP);
    /* Ogresmasher/Sunsword handling: setworn() refuses artifacts so far */
    void olduwep;
    if (obj) {
        game.unweapon = (obj.oclass === WEAPON_CLASS)
            ? is_launcher(obj) || is_ammo(obj) || is_missile(obj)
              || (is_pole(obj) && !game.u.usteed)
            : !is_weptool(obj) && !is_wet_towel(obj);
    } else
        game.unweapon = true; /* for "bare hands" message */
}

// C ref: wield.c setuqwep()
export function setuqwep(obj) {
    setworn(obj, W_QUIVER);
}

// C ref: wield.c setuswapwep()
export function setuswapwep(obj) {
    setworn(obj, W_SWAPWEP);
}

/* C ref: wield.c TWOWEAPOK() */
function TWOWEAPOK(obj) {
    return (obj.oclass === WEAPON_CLASS)
        ? !(is_launcher(obj) || is_ammo(obj) || is_missile(obj))
        : is_weptool(obj);
}

// C ref: wield.c can_twoweapon()
export async function can_twoweapon() {
    const g = game;
    let otmp;

    if (!could_twoweap(g.youmonst.data)) {
        if (g.u.umonnum !== g.u.umonster) /* Upolyd */
            await You_cant("use two weapons in your current form.");
        else
            await pline(`${makeplural((g.flags.female && g.urole.name.f)
                                      ? g.urole.name.f : g.urole.name.m)
                          } aren't able to use two weapons at once.`);
    } else if (!g.uwep || !g.uswapwep) {
        let hand_s = body_part(HAND);

        if (!g.uwep && !g.uswapwep)
            hand_s = makeplural(hand_s);
        /* "your hands are empty" or "your {left|right} hand is empty" */
        await pline(`Your ${g.uwep ? "left " : g.uswapwep ? "right " : ""}${
            hand_s} ${vtense(hand_s, "are")} empty.`);
    } else if (!TWOWEAPOK(g.uwep) || !TWOWEAPOK(g.uswapwep)) {
        otmp = !TWOWEAPOK(g.uwep) ? g.uwep : g.uswapwep;
        await pline(`${Yname2(otmp)} ${is_plural(otmp) ? "aren't" : "isn't a"} suitable ${
            (otmp === g.uwep) ? "primary" : "secondary"} weapon${
            (otmp.quan === 1) ? "" : "s"}.`); /* plur(otmp->quan) */
    } else if (bimanual(g.uwep) || bimanual(g.uswapwep)) {
        otmp = bimanual(g.uwep) ? g.uwep : g.uswapwep;
        await pline(`${Yname2(otmp)} isn't one-handed.`);
    } else if (g.uarms) {
        await You_cant("use two weapons while wearing a shield.");
    } else if (g.uswapwep.oartifact) {
        await pline(`${Yobjnam2(g.uswapwep, "resist")} being held second to another weapon!`);
    } else if (g.uswapwep.otyp === CORPSE /* && cant_wield_corpse(uswapwep) */) {
        throw new Error('can_twoweapon(): cant_wield_corpse() not ported yet');
    } else if (game.u.uprops[GLIB]?.intrinsic || game.u.uprops[GLIB]?.extrinsic
               || g.uswapwep.cursed) {
        throw new Error('can_twoweapon(): drop_uswapwep() not ported yet');
    } else
        return true;
    return false;
}

// C ref: wield.c set_twoweap()
export function set_twoweap(on_off) {
    if (on_off !== !!game.u.twoweap) {
        game.u.twoweap = on_off;
        if (game.flags.weaponstatus)
            game.disp_botl = true;
    }
}

// C ref: wield.c dotwoweapon()
/* the #twoweapon command */
export async function dotwoweapon() {
    /* You can always toggle it off */
    if (game.u.twoweap) {
        await You("switch to your primary weapon.");
        set_twoweap(false); /* u.twoweap = FALSE */
        /* update_inventory(): no perm_invent */
        return ECMD_OK;
    }

    /* May we use two weapons? */
    if (await can_twoweapon()) {
        /* Success! */
        await You("begin two-weapon combat.");
        set_twoweap(true); /* u.twoweap = TRUE */
        /* update_inventory(): no perm_invent */
        return (rnd(20) > ACURR(A_DEX)) ? ECMD_TIME : ECMD_OK;
    }
    return ECMD_OK;
}

// C ref: wield.c uwepgone()
export function uwepgone() {
    const uwep = game.uwep;
    if (uwep) {
        if (artifact_light(uwep) && uwep.lamplit) {
            end_burn(uwep, false);
            if (!Blind()) /* uwepgone() is synchronous */
                throw new Error('uwepgone(): "stops shining" message in a synchronous caller not ported yet');
        }
        setworn(null, W_WEP);
        game.unweapon = true;
        /* update_inventory(): no perm_invent */
    }
}

// C ref: wield.c uswapwepgone()
export function uswapwepgone() {
    if (game.uswapwep) {
        setworn(null, W_SWAPWEP);
        /* update_inventory(): no perm_invent */
    }
}

// C ref: wield.c uqwepgone()
export function uqwepgone() {
    if (game.uquiver) {
        setworn(null, W_QUIVER);
        /* update_inventory(): no perm_invent */
    }
}

// C ref: artifact.c retouch_object() (ported in artifact.js)
export { retouch_object };

// C ref: wield.c ready_weapon()
export async function ready_weapon(wep) {
    /* Separated function so swapping works easily */
    let res = ECMD_OK;
    const was_twoweap = game.u.twoweap, had_wep = (game.uwep != null);

    if (!wep) {
        /* No weapon */
        if (game.uwep) {
            await You(`are ${empty_handed_wl()}.`);
            setuwep(null);
            res = ECMD_TIME;
        } else
            await You(`are already ${empty_handed_wl()}.`);
    } else if (wep.otyp === CORPSE) {
        throw new Error('ready_weapon(): cant_wield_corpse() not ported yet');
    } else if (game.uarms && bimanual(wep)) {
        await You(`cannot wield a two-handed ${
            is_sword(wep) ? "sword" : wep.otyp === BATTLE_AXE_WL ? "axe"
                                                                    : "weapon"} while wearing a shield.`);
        res = ECMD_FAIL;
    } else if (!(await retouch_object(wep, false))) {
        res = ECMD_TIME; /* takes a turn even though it doesn't get wielded */
    } else {
        /* Weapon WILL be wielded after this point */
        res = ECMD_TIME;
        if (will_weld(wep)) {
            let tmp = xname_wl(wep);
            const thestr = "The ";

            if (!tmp.startsWith(thestr) && The_wl(tmp).startsWith(thestr))
                tmp = thestr;
            else
                tmp = "";
            await pline(`${tmp}${aobjnam_wl(wep, "weld")} ${
                (wep.quan === 1) ? "itself" : "themselves"} to your ${ /* a3 */
                bimanual(wep) ? ""
                    : (!game.u.uhandedness /* URIGHTY */ ? "dominant right "
                                                         : "dominant left ")}${
                bimanual(wep) ? makeplural(body_part(HAND)) : body_part(HAND)}!`);
            wep.bknown = 1; /* set_bknown(wep, 1) */
        } else {
            /* The message must be printed before setuwep (since
             * you might die and be revived from changing weapons),
             * and the message must be before the death message and
             * Lifesaved rewielding.  Yet we want the message to
             * say "weapon in hand", thus this kludge. */
            const dummy = wep.owornmask;

            wep.owornmask |= W_WEP;
            if (wep.otyp === AKLYS && (wep.owornmask & W_WEP) !== 0)
                await You("secure the tether.");
            await prinv(null, wep, 0);
            wep.owornmask = dummy;
        }

        setuwep(wep);
        if (was_twoweap && !game.u.twoweap && (game.flags?.verbose ?? true)) {
            /* skip this message if we already got "empty handed" one above;
               also, Null is not safe for neither TWOWEAPOK() or bimanual() */
            if (game.uwep)
                await You(`${(TWOWEAPOK(game.uwep) && !bimanual(game.uwep))
                             ? "are no longer using two weapons at once"
                             : "can no longer wield two weapons at once"}.`);
        }

        /* KMH -- Talking artifacts are finally implemented */
        if (wep.oartifact) {
            res |= await arti_speak(wep); /* sets ECMD_TIME bit if artifact speaks */
        }

        if (artifact_light(wep) && !wep.lamplit) {
            begin_burn(wep, false);
            if (!Blind())
                await pline(`${Tobjnam(wep, "begin")} to shine ${arti_light_description(wep)}!`);
        }
        if (wep.unpaid)
            throw new Error('ready_weapon(): shopkeeper warning not ported yet');
    }
    if ((had_wep !== (game.uwep != null)))
        game.disp_botl = true; /* condtests[bl_bareh].enabled */
    return res;
}

// C ref: wield.c doswapweapon() -- the #swap command
export async function doswapweapon() {
    let result = 0;

    /* May we attempt this? */
    game.multi = 0;
    if (cantwield(game.youmonst.data)) {
        await pline("Don't be ridiculous!");
        return ECMD_FAIL;
    }
    if (welded(game.uwep)) {
        await weldmsg(game.uwep);
        return ECMD_FAIL;
    }

    /* Unwield your current secondary weapon */
    const oldwep = game.uwep;
    const oldswap = game.uswapwep;
    setuswapwep(null);

    /* Set your new primary weapon */
    result = await ready_weapon(oldswap);

    /* Set your new secondary weapon */
    if (game.uwep === oldwep) {
        /* Wield failed for some reason */
        setuswapwep(oldswap);
    } else {
        setuswapwep(oldwep);
        if (game.uswapwep)
            await prinv(null, game.uswapwep, 0);
        else
            await You("have no secondary weapon readied.");
    }

    if (game.u.twoweap && !await can_twoweapon())
        await untwoweapon();

    return result;
}

const invlet_basic = 52;

// C ref: wield.c wield_ok() -- getobj callback for weapons and weapon-tools
function wield_ok(obj) {
    if (!obj)
        return GETOBJ_SUGGEST;

    if (obj.oclass === COIN_CLASS)
        return GETOBJ_EXCLUDE;

    if (obj.oclass === WEAPON_CLASS || is_weptool(obj))
        return GETOBJ_SUGGEST;

    return GETOBJ_DOWNPLAY;
}

// C ref: wield.c dowield() -- the #wield command
export async function dowield() {
    let qbuf;
    let wep;

    /* May we attempt this? */
    game.multi = 0;
    if (cantwield(game.youmonst.data)) {
        await pline("Don't be ridiculous!");
        return ECMD_FAIL;
    }
    /* Keep going even if inventory is completely empty, since wielding '-'
       to wield nothing can be construed as a positive act even when done
       so redundantly. */

    /* Prompt for a new weapon */
    if (game.context?.objsplit) { /* clear_splitobjs() */
        game.context.objsplit.parent_oid = 0;
        game.context.objsplit.child_oid = 0;
    }
    if (!(wep = await getobj("wield", wield_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT))) {
        /* Cancelled */
        return ECMD_CANCEL;
    } else if (wep === game.uwep) {
        return await already_wielded(wep);
    } else if (welded(game.uwep)) {
        await weldmsg(game.uwep);
        /* previously interrupted armor removal mustn't be resumed */
        reset_remarm();
        /* if player chose a partial stack but can't wield it, undo split */
        if (wep.o_id && wep.o_id === game.context?.objsplit?.child_oid)
            unsplitobj(wep);
        return ECMD_FAIL;
    } else if (wep.o_id && wep.o_id === game.context?.objsplit?.child_oid) {
        /* if wep is the result of supplying a count to getobj()
           we don't want to split something already wielded; for
           any other item, we need to give it its own inventory slot */
        if (game.uwep && game.uwep.o_id === game.context.objsplit.parent_oid) {
            unsplitobj(wep);
            /* wep was merged back to uwep, already_wielded uses wep */
            wep = game.uwep;
            return await already_wielded(wep);
        }
        await finish_splitting(wep);
        return await wielding(wep);
    }

    /* Handle no object, or object in other slot */
    if (wep === hands_obj) {
        wep = null;
    } else if (wep === game.uswapwep) {
        return await doswapweapon();
    } else if (wep === game.uquiver) {
        const uquiver = game.uquiver;
        /* offer to split stack if multiple are quivered */
        if (uquiver.quan > 1 && inv_cnt(false) < invlet_basic
            && splittable(uquiver)) {
            qbuf = `You have ${uquiver.quan} ${simpleonames(uquiver)} readied.  Wield one?`;
            switch (await ynq(qbuf)) {
            case 'q':
                return ECMD_OK;
            case 'y':
                /* leave N-1 quivered, split off 1 to wield */
                wep = splitobj(uquiver, 1);
                await finish_splitting(wep);
                return await wielding(wep);
            default:
                break;
            }
            qbuf = "Wield all of them instead?";
        } else {
            const use_plural = (is_plural(uquiver) || pair_of(uquiver));

            qbuf = `You have ${!use_plural ? "that" : "those"} readied.  Wield ${
                !use_plural ? "it" : "them"} instead?`;
        }
        /* require confirmation to wield the quivered weapon */
        if ((await ynq(qbuf)) !== 'y') {
            qbuf = Shk_Your(uquiver); /* replace qbuf[] contents */
            await pline(`${qbuf}${simpleonames(uquiver)} ${otense(uquiver, "remain")} readied.`);
            return ECMD_OK;
        }
        /* wielding whole readied stack, so no longer quivered */
        setuqwep(null);
    } else if (wep.owornmask & (W_ARMOR | W_ACCESSORY | W_SADDLE)) {
        await You("cannot wield that!");
        return ECMD_FAIL;
    }

    return await wielding(wep);
}

/* C ref: wield.c dowield() -- its already_wielded: label */
async function already_wielded(wep) {
    await You("are already wielding that!");
    if (is_weptool(wep) || is_wet_towel(wep))
        game.unweapon = false; /* [see setuwep()] */
    return ECMD_FAIL;
}

/* C ref: wield.c dowield() -- its wielding: label */
async function wielding(wep) {
    /* Set your new primary weapon */
    const oldwep = game.uwep;
    const result = await ready_weapon(wep);
    if (game.flags.pushweapon && oldwep && game.uwep !== oldwep)
        setuswapwep(oldwep);
    await untwoweapon();

    return result;
}

// C ref: wield.c drop_uswapwep()
/* uswapwep has become cursed while in two-weapon combat mode or hero is
   attempting to dual-wield when it is already cursed or hands are slippery */
export async function drop_uswapwep() {
    const obj = game.uswapwep;

    /* this used to use makeplural(body_part(HAND)) but in order to be
       dual-wielded, or to get this far attempting to achieve that,
       uswapwep must be one-handed; since it's secondary, the hand must
       be the left one */
    const left_hand = `left ${body_part(HAND)}`;
    if (!obj.cursed)
        /* attempting to two-weapon while Glib */
        await pline(`${Yobjnam2(obj, "slip")} from your ${left_hand}!`);
    else if (!game.u.twoweap)
        /* attempting to two-weapon when uswapwep is cursed */
        await pline(`${Yobjnam2(obj, "evade")} your grasp and ${
            otense(obj, "drop")} from your ${left_hand}!`);
    else
        /* already two-weaponing but can't anymore because uswapwep has
           become cursed */
        await Your(`${left_hand} spasms and drops ${yobjnam(obj, null)}!`);
    await dropx(obj);
}

// C ref: wield.c untwoweapon()
export async function untwoweapon() {
    if (game.u.twoweap) {
        await You("can no longer wield two weapons at once."); /* can_no_longer_twoweap */
        set_twoweap(false); /* u.twoweap = FALSE */
        /* update_inventory(): no perm_invent */
    }
}

/* C ref: hack.h ynq() */
async function ynq(query) {
    return await tty_yn_function(query, "ynq", 'q');
}


/* C ref: obj.h is_plural(), pair_of() */
export function is_plural(o) {
    return (o.quan !== 1
            /* "the Eyes of the Overworld" are plural, but
               "a pair of lenses named the Eyes of the Overworld" is not */
            || (o.oartifact === ART_EYES_OF_THE_OVERWORLD
                && !undiscovered_artifact(ART_EYES_OF_THE_OVERWORLD)));
}
function pair_of(o) {
    return (o.otyp === LENSES
            || (o.oclass === ARMOR_CLASS
                && (objects[o.otyp].oc_armcat === ARM_GLOVES
                    || objects[o.otyp].oc_armcat === ARM_BOOTS)));
}


// C ref: wield.c finish_splitting()
async function finish_splitting(obj) {
    /* obj was split off from something; give it its own invlet */
    freeinv(obj);
    /* addinv_nomerge(obj) */
    const save_nomerge = obj.nomerge;
    obj.nomerge = 1;
    await addinv(obj);
    obj.nomerge = save_nomerge;
}

// C ref: wield.c ready_ok() -- getobj callback for object to ready for
// throwing/shooting; this filter lets worn items through so that caller
// can reject them
function ready_ok(obj) {
    if (!obj) /* '-', will empty quiver slot if chosen */
        return game.uquiver ? GETOBJ_SUGGEST : GETOBJ_DOWNPLAY;

    /* downplay when wielded, unless more than one */
    if (obj === game.uwep || (obj === game.uswapwep && game.u.twoweap))
        return (obj.quan === 1) ? GETOBJ_DOWNPLAY : GETOBJ_SUGGEST;

    if (is_ammo(obj)) {
        return ((game.uwep && ammo_and_launcher(obj, game.uwep))
                || (game.uswapwep && ammo_and_launcher(obj, game.uswapwep)))
            ? GETOBJ_SUGGEST
            : GETOBJ_DOWNPLAY;
    } else if (is_launcher(obj)) { /* part of 'possible extension' below */
        return GETOBJ_DOWNPLAY;
    } else {
        if (obj.oclass === WEAPON_CLASS || obj.oclass === COIN_CLASS)
            return GETOBJ_SUGGEST;
    }
    return GETOBJ_DOWNPLAY;
}

// C ref: wield.c dowieldquiver() -- the #quiver command
export async function dowieldquiver() {
    return await doquiver_core("ready");
}

// C ref: wield.c doquiver_core() -- guts of #quiver command; also used by
// #fire when refilling empty quiver
export async function doquiver_core(verb) { /* "ready" or "fire" */
    let was_uwep = false;
    const was_twoweap = game.u.twoweap;

    /* Since the quiver isn't in your hands, don't check cantwield(),
       will_weld(), touch_petrifies(), etc. */
    game.multi = 0;
    if (!game.invent) {
        /* could accept '-' to empty quiver, but there's no point since
           inventory is empty so uquiver is already Null */
        await You("have nothing to ready for firing.");
        return ECMD_OK;
    }

    /* forget last splitobj() before calling getobj() with GETOBJ_ALLOWCNT */
    if (game.context?.objsplit) {
        game.context.objsplit.parent_oid = 0;
        game.context.objsplit.child_oid = 0;
    }
    /* Prompt for a new quiver: "What do you want to {ready|fire}?" */
    let newquiver = await getobj(verb, ready_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT);

    if (!newquiver) {
        /* Cancelled */
        return ECMD_CANCEL;
    } else if (newquiver === hands_obj) { /* no object */
        /* Explicitly nothing */
        if (game.uquiver) {
            await You("now have no ammunition readied.");
            /* skip 'quivering: prinv()' */
            setuqwep(null);
        } else {
            await You("already have no ammunition readied!");
        }
        return ECMD_OK;
    } else if (game.context?.objsplit?.child_oid
               && newquiver.o_id === game.context.objsplit.child_oid) {
        /* if newquiver is the result of supplying a count to getobj()
           we don't want to split something already in the quiver;
           for any other item, we need to give it its own inventory slot */
        if (game.uquiver
            && game.uquiver.o_id === game.context.objsplit.parent_oid) {
            unsplitobj(newquiver);
            /* goto already_quivered; */
            await pline("That ammunition is already readied!");
            return ECMD_OK;
        } else if (newquiver.oclass === COIN_CLASS) {
            /* don't allow splitting a stack of coins into quiver */
            await You("can't ready only part of your gold.");
            unsplitobj(newquiver);
            return ECMD_OK;
        }
        await finish_splitting(newquiver);
    } else if (newquiver === game.uquiver) {
        /* already_quivered: */
        await pline("That ammunition is already readied!");
        return ECMD_OK;
    } else if (newquiver.owornmask & (W_ARMOR | W_ACCESSORY | W_SADDLE)) {
        await You(`cannot ${verb} that!`);
        return ECMD_OK;
    } else if (newquiver === game.uwep) {
        let qbuf;
        const uwep = game.uwep;
        const weld_res = !uwep.bknown;

        if (welded(uwep)) {
            await weldmsg(uwep);
            reset_remarm(); /* same as dowield() */
            return weld_res ? ECMD_TIME : ECMD_OK;
        }
        /* offer to split stack if wielding more than 1 */
        if (uwep.quan > 1 && inv_cnt(false) < invlet_basic
            && splittable(uwep)) {
            qbuf = `You are wielding ${uwep.quan} ${simpleonames(uwep)}.  Ready ${uwep.quan - 1} of them?`;
            switch (await ynq(qbuf)) {
            case 'q':
                return ECMD_OK;
            case 'y':
                /* leave 1 wielded, split rest off and put into quiver */
                newquiver = splitobj(uwep, uwep.quan - 1);
                await finish_splitting(newquiver);
                return await quivering(verb, newquiver, was_uwep, was_twoweap);
            default:
                break;
            }
            qbuf = "Ready all of them instead?";
        } else {
            const use_plural = (is_plural(uwep) || pair_of(uwep));

            qbuf = `You are wielding ${!use_plural ? "that" : "those"}.  Ready ${!use_plural ? "it" : "them"} instead?`;
        }
        /* require confirmation to ready the main weapon */
        if ((await ynq(qbuf)) !== 'y') {
            qbuf = Shk_Your(uwep); /* replace qbuf[] contents */
            await pline(`${qbuf}${simpleonames(uwep)} ${otense(uwep, "remain")} wielded.`);
            return ECMD_OK;
        }
        /* quivering main weapon, so no longer wielding it */
        setuwep(null);
        await untwoweapon();
        was_uwep = true;
    } else if (newquiver === game.uswapwep) {
        let qbuf;
        const uswapwep = game.uswapwep;
        if (uswapwep.quan > 1 && inv_cnt(false) < invlet_basic
            && splittable(uswapwep)) {
            qbuf = `${game.u.twoweap ? "You are dual wielding"
                                     : "Your alternate weapon is"} ${uswapwep.quan} ${simpleonames(uswapwep)}.  Ready ${uswapwep.quan - 1} of them?`;
            switch (await ynq(qbuf)) {
            case 'q':
                return ECMD_OK;
            case 'y':
                /* leave 1 alt-wielded, split rest off and put into quiver */
                newquiver = splitobj(uswapwep, uswapwep.quan - 1);
                await finish_splitting(newquiver);
                return await quivering(verb, newquiver, was_uwep, was_twoweap);
            default:
                break;
            }
            qbuf = "Ready all of them instead?";
        } else {
            const use_plural = (is_plural(uswapwep) || pair_of(uswapwep));

            qbuf = `${!use_plural ? "That is" : "Those are"} your ${game.u.twoweap ? "second" : "alternate"} weapon.  Ready ${!use_plural ? "it" : "them"} instead?`;
        }
        /* require confirmation to ready the alternate weapon */
        if ((await ynq(qbuf)) !== 'y') {
            qbuf = Shk_Your(uswapwep); /* replace qbuf[] contents */
            await pline(`${qbuf}${simpleonames(uswapwep)} ${otense(uswapwep, "remain")} ${game.u.twoweap ? "wielded" : "as secondary weapon"}.`);
            return ECMD_OK;
        }
        /* quivering alternate weapon, so no more uswapwep */
        setuswapwep(null);
        await untwoweapon();
    }

    return await quivering(verb, newquiver, was_uwep, was_twoweap);
}

/* C ref: wield.c doquiver_core() -- its quivering: label */
async function quivering(verb, newquiver, was_uwep, was_twoweap) {
    if (verb === "ready") {
        /* place item in quiver before printing so that inventory feedback
           includes "(at the ready)" */
        setuqwep(newquiver);
        await prinv(null, newquiver, 0);
    } else { /* verb=="fire", manually refilling quiver during 'f'ire */
        /* prefix item with description of action, so don't want that to
           include "(at the ready)" */
        await prinv("You ready:", newquiver, 0);
        setuqwep(newquiver);
    }

    /* quiver is a convenience slot and manipulating it ordinarily
       consumes no time, but unwielding primary or secondary weapon
       should take time (perhaps we're adjacent to a rust monster
       or disenchanter and want to hit it immediately, but not with
       something we're wielding that's vulnerable to its damage) */
    let res = 0;
    if (was_uwep) {
        await You(`are now ${empty_handed_wl()}.`);
        res = 1;
    } else if (was_twoweap && !game.u.twoweap) {
        await You("are no longer using two weapons at once."); /* are_no_longer_twoweap */
        res = 1;
    }
    return res ? ECMD_TIME : ECMD_OK;
}

// C ref: wield.c erodeable_wep() -- used by will_weld()
function erodeable_wep(optr) {
    return (optr.oclass === WEAPON_CLASS || is_weptool(optr)
            || optr.otyp === HEAVY_IRON_BALL || optr.otyp === IRON_CHAIN);
}

// C ref: wield.c will_weld() -- used by welded(), and also while wielding
export function will_weld(optr) {
    return !!(optr.cursed && (erodeable_wep(optr) || optr.otyp === TIN_OPENER));
}

// C ref: wield.c welded()
export function welded(obj) {
    if (obj && obj === game.uwep && will_weld(obj)) {
        obj.bknown = 1; /* set_bknown(obj, 1): no perm_invent update needed */
        return 1;
    }
    return 0;
}

// C ref: wield.c weldmsg()
/* give a message saying that obj is welded to your hand(s) */
export async function weldmsg(obj) {
    let savewornmask;
    let hand = body_part(HAND);

    if (bimanual(obj))
        hand = makeplural(hand);
    savewornmask = obj.owornmask;
    obj.owornmask = 0; /* suppress doname()'s "(weapon in hand)";
                        * Yobjnam2() doesn't actually need this because
                        * it is based on xname() rather than doname() */
    await pline(`${Yobjnam2(obj, "are")} welded to your ${hand}!`);
    obj.owornmask = savewornmask;
}

// C ref: engrave.c freehand()
export function freehand() {
    const uwep = game.uwep, uarms = game.uarms;
    return (!uwep || !welded(uwep)
            || (!bimanual(uwep) && (!uarms || !uarms.cursed)));
}

// C ref: wield.c wield_tool()
/* used for #rub and for applying pick-axe, whip, grappling hook or polearm */
export async function wield_tool(obj,
                                 verb) { /* "rub",&c */
    if (game.uwep && obj === game.uwep)
        return true; /* nothing to do if already wielding it */

    if (!verb)
        verb = "wield";
    const what = xname_wl(obj);
    let more_than_1 = (obj.quan > 1 || what.includes("pair of ")
                       || what.includes("s of "));

    if (obj.owornmask & (W_ARMOR | W_ACCESSORY)) {
        await You_cant(`${verb} ${yname_wl(obj)} while wearing ${
            more_than_1 ? "them" : "it"}.`);
        return false;
    }
    if (game.uwep && welded(game.uwep)) {
        if (game.flags.verbose) {
            let hand = body_part(HAND);

            if (bimanual(game.uwep))
                hand = makeplural(hand);
            if (what.includes("pair of "))
                more_than_1 = false;
            await pline(`Since your weapon is welded to your ${hand}, you cannot ${
                verb} ${more_than_1 ? "those" : "that"} ${xname_wl(obj)}.`);
        } else {
            await You_cant("do that.");
        }
        return false;
    }
    if (cantwield(game.youmonst.data)) {
        await You_cant(`hold ${more_than_1 ? "them" : "it"} strongly enough.`);
        return false;
    }
    /* check shield */
    if (game.uarms && bimanual(obj)) {
        await You(`cannot ${verb} a two-handed ${
            (obj.oclass === WEAPON_CLASS) ? "weapon" : "tool"} while wearing a shield.`);
        return false;
    }

    if (game.uquiver === obj)
        setuqwep(null);
    if (game.uswapwep === obj) {
        await doswapweapon();
        /* doswapweapon might fail */
        if (game.uswapwep === obj)
            return false;
    } else {
        const oldwep = game.uwep;

        if (will_weld(obj)) {
            /* hope none of ready_weapon()'s early returns apply here... */
            await ready_weapon(obj);
        } else {
            await You(`now wield ${doname_wl(obj)}.`);
            setuwep(obj);
        }
        if (game.flags.pushweapon && oldwep && game.uwep !== oldwep)
            setuswapwep(oldwep);
    }
    if (game.uwep && game.uwep !== obj)
        return false; /* rewielded old object after dying */
    /* applying weapon or tool that gets wielded ends two-weapon combat */
    if (game.u.twoweap)
        await untwoweapon();
    if (obj.oclass !== WEAPON_CLASS)
        game.unweapon = true;
    return true;
}
