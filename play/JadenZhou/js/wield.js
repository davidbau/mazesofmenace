// wield.js -- wielding weapons.
// C ref: wield.c
//
// Ported so far: welded() with its will_weld()/erodeable_wep() macros,
// obj.h is_weptool()/bimanual(), and engrave.c freehand().

import { game } from './gstate.js';
import { P_NONE, P_BOW, P_CROSSBOW, P_DART, P_BOOMERANG, P_POLEARMS, P_LANCE,
         W_WEP, W_SWAPWEP, W_QUIVER } from './const.js';
import { objects, WEAPON_CLASS, TOOL_CLASS, GEM_CLASS, TIN_OPENER,
         HEAVY_IRON_BALL, IRON_CHAIN, TOWEL, CORPSE, AKLYS, SILVER } from './objects.js';
import { ECMD_OK, ECMD_TIME, ECMD_FAIL, W_ARMOR, W_ACCESSORY,
         W_SADDLE, W_RINGL, W_RINGR, W_TOOL } from './const.js';
import { M1_NOHANDS, M2_DEMON, M2_WERE, S_IMP, S_VAMPIRE, MZ_SMALL, mons,
         PM_SHADE, PM_TENGU } from './monsters.js';
import { pline, You } from './display.js';
import { prinv, getobj, hands_obj, splittable, freeinv } from './invent.js';
import { addinv } from './u_init.js';
import { splitobj } from './mkobj.js';
import { simpleonames } from './iactions.js';
import { vtense } from './objnam.js';
import { highc } from './hacklib.js';
import { tty_yn_function } from './wintty.js';
import { LENSES, ARMOR_CLASS, ARM_GLOVES, ARM_BOOTS } from './objects.js';
import { GETOBJ_SUGGEST, GETOBJ_DOWNPLAY, GETOBJ_PROMPT, GETOBJ_ALLOWCNT,
         ECMD_CANCEL } from './const.js';
import { COIN_CLASS } from './objects.js';

// C ref: obj.h is_weptool()
export function is_weptool(o) {
    return o.oclass === TOOL_CLASS && objects[o.otyp].oc_skill !== P_NONE;
}

// C ref: obj.h bimanual()
export function bimanual(otmp) {
    return ((otmp.oclass === WEAPON_CLASS || otmp.oclass === TOOL_CLASS)
            && !!objects[otmp.otyp].oc_bimanual);
}

// C ref: obj.h is_launcher(), is_ammo(), matching_launcher(),
// ammo_and_launcher(), is_missile(), is_pole(), is_wet_towel()
export function is_launcher(otmp) {
    return (otmp.oclass === WEAPON_CLASS && objects[otmp.otyp].oc_skill >= P_BOW
            && objects[otmp.otyp].oc_skill <= P_CROSSBOW);
}
export function is_ammo(otmp) {
    return ((otmp.oclass === WEAPON_CLASS || otmp.oclass === GEM_CLASS)
            && objects[otmp.otyp].oc_skill >= -P_CROSSBOW
            && objects[otmp.otyp].oc_skill <= -P_BOW);
}
export function matching_launcher(a, l) {
    return !!(l && objects[a.otyp].oc_skill === -objects[l.otyp].oc_skill);
}
export function ammo_and_launcher(a, l) {
    return is_ammo(a) && matching_launcher(a, l);
}
export function is_missile(otmp) {
    return ((otmp.oclass === WEAPON_CLASS || otmp.oclass === TOOL_CLASS)
            && objects[otmp.otyp].oc_skill >= -P_BOOMERANG
            && objects[otmp.otyp].oc_skill <= -P_DART);
}
export function is_pole(otmp) {
    /* is_art(otmp, ART_SNICKERSNEE): artifacts aren't ported here yet */
    return ((otmp.oclass === WEAPON_CLASS || otmp.oclass === TOOL_CLASS)
            && (objects[otmp.otyp].oc_skill === P_POLEARMS
                || objects[otmp.otyp].oc_skill === P_LANCE));
}
export function is_wet_towel(o) { return o.otyp === TOWEL && o.spe > 0; }

// C ref: worn.c setworn() -- the weapon slots (W_WEP, W_SWAPWEP,
// W_QUIVER); armor and accessories aren't handled here yet
const weapon_slots = [
    { w_mask: W_WEP, w_obj: 'uwep' },
    { w_mask: W_SWAPWEP, w_obj: 'uswapwep' },
    { w_mask: W_QUIVER, w_obj: 'uquiver' },
    { w_mask: W_RINGL, w_obj: 'uleft' },
    { w_mask: W_RINGR, w_obj: 'uright' },
    { w_mask: W_TOOL, w_obj: 'ublindf' },
];
export function setworn(obj, mask) {
    if (mask & ~(W_WEP | W_SWAPWEP | W_QUIVER | W_RINGL | W_RINGR | W_TOOL))
        throw new Error('setworn(): armor/amulet/eyewear slots not ported yet');
    for (const wp of weapon_slots) {
        if (wp.w_mask & mask) {
            const oobj = game[wp.w_obj];
            if (oobj) {
                if (game.u.twoweap && (oobj.owornmask & (W_WEP | W_SWAPWEP)))
                    game.u.twoweap = false; /* set_twoweap(FALSE) */
                oobj.owornmask &= ~wp.w_mask;
                if (wp.w_mask & ~(W_SWAPWEP | W_QUIVER)) {
                    const p = objects[oobj.otyp].oc_oprop;
                    if (p)
                        throw new Error('setworn(): extrinsic-granting weapon not ported yet');
                    if (oobj.oartifact)
                        throw new Error('setworn(): set_artifact_intrinsic() not ported yet');
                }
                /* cancel_doff(): no armor removal in progress for weapons */
            }
            game[wp.w_obj] = obj;
            if (obj) {
                obj.owornmask = (obj.owornmask || 0) | wp.w_mask;
                if (wp.w_mask & ~(W_SWAPWEP | W_QUIVER)) {
                    if (obj.oclass === WEAPON_CLASS || is_weptool(obj)
                        || mask !== W_WEP) {
                        const p = objects[obj.otyp].oc_oprop;
                        if (p && (wp.w_mask & (W_RINGL | W_RINGR | W_TOOL))) {
                            /* u.uprops[p].extrinsic |= wp->w_mask */
                            const up = game.u.uprops[p];
                            up.extrinsic = (up.extrinsic || 0) | wp.w_mask;
                            /* w_blocks(): rings don't block properties */
                        } else if (p)
                            throw new Error('setworn(): extrinsic-granting weapon not ported yet');
                    }
                    if (obj.oartifact)
                        throw new Error('setworn(): set_artifact_intrinsic() not ported yet');
                }
            }
        }
    }
    /* update_inventory(): no perm_invent */
}

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

/* C ref: mondata.h cantwield() */
function cantwield(ptr) {
    return (nohands(ptr) || verysmall(ptr));
}
function nohands(ptr) { return (ptr.mflags1 & M1_NOHANDS) !== 0; }
function verysmall(ptr) { return ptr.msize < MZ_SMALL; }

// C ref: artifact.c retouch_object() -- only the hero-can-handle-it case
export function retouch_object(wep) {
    if (wep.oartifact)
        throw new Error('retouch_object(): touch_artifact() not ported yet');
    if (objects[wep.otyp].oc_material === SILVER && Hate_silver())
        throw new Error('retouch_object(): silver damage not ported yet');
    return true;
}
/* C ref: you.h Hate_silver; mondata.h hates_silver() */
function Hate_silver() {
    const ptr = game.youmonst?.data;
    return ((game.u.ulycn ?? -1) >= 0
            || !!(ptr && ((ptr.mflags2 & M2_WERE) || ptr.mlet === S_VAMPIRE
                          || (ptr.mflags2 & M2_DEMON) || ptr === mons[PM_SHADE]
                          || (ptr.mlet === S_IMP && ptr !== mons[PM_TENGU]))));
}

// C ref: wield.c ready_weapon()
export async function ready_weapon(wep) {
    /* Separated function so swapping works easily */
    let res = ECMD_OK;
    const was_twoweap = game.u.twoweap, had_wep = (game.uwep != null);

    if (!wep) {
        /* No weapon */
        throw new Error('ready_weapon(): empty_handed() not ported yet');
    } else if (wep.otyp === CORPSE) {
        throw new Error('ready_weapon(): cant_wield_corpse() not ported yet');
    } else if (game.uarms && bimanual(wep)) {
        throw new Error('ready_weapon(): two-handed weapon with a shield not ported yet');
    } else if (!retouch_object(wep)) {
        res = ECMD_TIME; /* takes a turn even though it doesn't get wielded */
    } else {
        /* Weapon WILL be wielded after this point */
        res = ECMD_TIME;
        if (will_weld(wep)) {
            throw new Error('ready_weapon(): welding message not ported yet');
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
        if (was_twoweap && !game.u.twoweap && (game.flags?.verbose ?? true))
            throw new Error('ready_weapon(): no-longer-twoweapon message not ported yet');

        if (wep.oartifact)
            throw new Error('ready_weapon(): arti_speak() not ported yet');
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
    if (welded(game.uwep))
        throw new Error('doswapweapon(): weldmsg() not ported yet');

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

    if (game.u.twoweap)
        throw new Error('doswapweapon(): can_twoweapon() not ported yet');

    return result;
}

const invlet_basic = 52;

/* C ref: hack.h ynq() */
async function ynq(query) {
    return await tty_yn_function(query, "ynq", 'q');
}

// C ref: hack.c inv_cnt()
function inv_cnt(incl_gold) {
    let ct = 0;
    for (let otmp = game.invent; otmp; otmp = otmp.nobj)
        if (incl_gold || otmp.invlet !== '$')
            ct++;
    return ct;
}

/* C ref: obj.h is_plural() (undiscovered_artifact() isn't ported),
   pair_of() */
function is_plural(o) {
    if (o.oartifact)
        throw new Error('is_plural(): undiscovered_artifact() not ported yet');
    return o.quan !== 1;
}
function pair_of(o) {
    return (o.otyp === LENSES
            || (o.oclass === ARMOR_CLASS
                && (objects[o.otyp].oc_armcat === ARM_GLOVES
                    || objects[o.otyp].oc_armcat === ARM_BOOTS)));
}

// C ref: objnam.c otense()
function otense(otmp, verb) {
    /* verb is given in plural (without trailing s).  Return as input
       if the result of xname(otmp) would be plural. */
    if (!is_plural(otmp))
        return vtense(null, verb);
    return verb;
}

// C ref: shk.c Shk_Your()/shk_your() -- the hero's own (unpaid-free,
// carried) objects
function Shk_Your(obj) {
    let buf;
    if (obj.otyp === CORPSE)
        throw new Error('shk_your(): corpse ownership not ported yet');
    else if (obj.unpaid || obj.where === 'OBJ_MINVENT'
             || obj.where === 'OBJ_FLOOR')
        throw new Error('shk_your(): shk_owns()/mon_owns() not ported yet');
    else
        buf = (obj.where === 'OBJ_INVENT') ? "your" : "the"; /* the_your[carried(obj)] */
    buf += " ";
    return highc(buf[0]) + buf.slice(1);
}

// C ref: wield.c finish_splitting()
function finish_splitting(obj) {
    /* obj was split off from something; give it its own invlet */
    freeinv(obj);
    /* addinv_nomerge(obj) */
    const save_nomerge = obj.nomerge;
    obj.nomerge = 1;
    addinv(obj);
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
// #fire when refilling empty quiver; readying the chosen object is not
// ported yet
export async function doquiver_core(verb) { /* "ready" or "fire" */
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
        throw new Error('doquiver_core(): readying part of a stack not ported yet');
    } else if (newquiver === game.uquiver) {
        /* already_quivered: */
        await pline("That ammunition is already readied!");
        return ECMD_OK;
    } else if (newquiver.owornmask & (W_ARMOR | W_ACCESSORY | W_SADDLE)) {
        await You(`cannot ${verb} that!`);
        return ECMD_OK;
    } else if (newquiver === game.uwep) {
        throw new Error('doquiver_core(): readying the wielded weapon not ported yet');
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
                finish_splitting(newquiver);
                return await quivering(verb, newquiver);
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
        if (game.u.twoweap)
            throw new Error('doquiver_core(): untwoweapon() not ported yet');
    }

    return await quivering(verb, newquiver);
}

/* C ref: wield.c doquiver_core() -- its quivering: label */
async function quivering(verb, newquiver) {
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
       should take time; was_uwep and was_twoweap can't be set yet */
    return ECMD_OK;
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

// C ref: engrave.c freehand()
export function freehand() {
    const uwep = game.uwep, uarms = game.uarms;
    return (!uwep || !welded(uwep)
            || (!bimanual(uwep) && (!uarms || !uarms.cursed)));
}
