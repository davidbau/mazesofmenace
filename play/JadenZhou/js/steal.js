// steal.js — monsters acquiring and releasing objects.
// C ref: steal.c mpickobj(), mdrop_obj(), relobj();
// invent.c carry_obj_effects(); worn.c extract_from_minvent()

import { game } from './gstate.js';
import { add_to_minv, obj_extract_self, place_object, unknow_object } from './mkobj.js';
import { canseemon } from './display.js';
import * as O from './objects.js';
import { cansee } from './vision.js';
import { newsym, pline } from './display.js';
import { distant_name, doname } from './objnam.js';
import { Monnam } from './do_name.js';
import { stackobj, carry_obj_effects } from './invent.js';
import { flooreffects, obj_no_longer_held } from './do.js';
import { droppables, obj_resists } from './dogmove.js';
import { artifact_exists } from './artifact.js';
import { ONAME_NO_FLAGS } from './const.js';
import { LOST_NONE, LOST_THROWN, LOST_DROPPED, LOST_STOLEN, W_ARM, W_WEP,
         W_SADDLE } from './const.js';
import { update_mon_extrinsics, update_mon_extrinsics_sync } from './worn.js';
import { mwepgone } from './weapon.js';
import { check_gear_next_turn } from './mon.js';
import { W_ARMOR, W_AMUL, W_RING, W_TOOL, W_WEAPONS, W_BALL,
         W_CHAIN } from './const.js';
import { uwepgone, uswapwepgone, uqwepgone } from './wield.js';
import { donning, cancel_don, Armor_off, Cloak_off, Boots_off, Gloves_off,
         Helmet_off, Shield_off, Shirt_off, Amulet_off,
         Blindf_off } from './do_wear.js';
import { setworn } from './worn.js';

// C ref: steal.c remove_worn_item() -- rings (Ring_gone()), the ball and
// chain and setnotworn() aren't ported yet
export async function remove_worn_item(obj,
                                       unchain_ball) /* whether to unpunish or just unwield */ {
    const g = game;
    if (donning(obj))
        cancel_don();
    if (!obj.owornmask)
        return;

    /*
     * Losing worn gear might drop hero into water or lava or onto a
     * location-changing trap or take away the ability to breathe in water.
     * Marking it 'in_use' prevents emergency_disrobe() from dropping it
     * and lava_effects() from destroying it.
     */
    const oldinuse = obj.in_use;
    obj.in_use = 1;

    if (obj.owornmask & W_ARMOR) {
        if (obj === g.uskin)
            throw new Error('remove_worn_item(): skinback() not ported yet');
        if (obj === g.uarm)
            await Armor_off();
        else if (obj === g.uarmc)
            await Cloak_off();
        else if (obj === g.uarmf)
            await Boots_off();
        else if (obj === g.uarmg)
            await Gloves_off();
        else if (obj === g.uarmh)
            await Helmet_off();
        else if (obj === g.uarms)
            await Shield_off();
        else if (obj === g.uarmu)
            await Shirt_off();
        /* catchall -- should never happen */
        else
            setworn(null, obj.owornmask & W_ARMOR);
    } else if (obj.owornmask & W_AMUL) {
        await Amulet_off();
    } else if (obj.owornmask & W_RING) {
        throw new Error('remove_worn_item(): Ring_gone() not ported yet');
    } else if (obj.owornmask & W_TOOL) {
        await Blindf_off(obj);
    } else if (obj.owornmask & W_WEAPONS) {
        if (obj === g.uwep)
            uwepgone();
        if (obj === g.uswapwep)
            uswapwepgone();
        if (obj === g.uquiver)
            uqwepgone();
    }

    if (obj.owornmask & (W_BALL | W_CHAIN)) {
        if (unchain_ball)
            throw new Error('remove_worn_item(): unpunish() not ported yet');
    } else if (obj.owornmask) {
        /* catchall */
        throw new Error('remove_worn_item(): setnotworn() not ported yet');
    }

    obj.in_use = oldinuse;
}

// C ref: steal.c mpickobj()
/* Returns 1 if otmp is free'd, 0 otherwise. */
export function mpickobj(mtmp, otmp) {
    if (!otmp)
        throw new Error('mpickobj(): monster taking or picking up nothing?');
    /* if monster is acquiring a thrown or kicked object, the throwing
       or kicking code shouldn't continue to track and place it */
    if (otmp === game.thrownobj)
        game.thrownobj = null;
    else if (otmp === game.kickedobj)
        game.kickedobj = null;
    /* an unpaid item can be on the floor; if a monster picks it up, take
       it off the shop bill */
    if (otmp.unpaid || (otmp.cobj && otmp.cobj.some(o => o.unpaid)))
        throw new Error('mpickobj(): subfrombill() not ported yet');
    /* don't want hidden light source inside the monster */
    if (otmp.lamplit)
        throw new Error('mpickobj(): obj_sheds_light() not ported yet');
    /* for hero owned object on shop floor, mtmp is taking possession
       and if it's eventually dropped in a shop, shk will claim it */
    otmp.no_charge = 0;
    /* some object handling is only done if mtmp isn't a pet */
    if (!mtmp.mtame) {
        /* if monst is unseen, some info hero knows about this object becomes
           lost; continual pickup and drop by pets makes this too annoying if
           it is applied to them; when engulfed (where monster can't be seen
           because vision is disabled), or when held (or poly'd and holding)
           while blind, behave as if the monster can be 'seen' by touch */
        if (!canseemon(mtmp) && mtmp !== game.u.ustuck)
            unknow_object(otmp);
        /* if otmp has flags set for how it left hero's inventory, change
           those flags; if thrown, now stolen and autopickup might override
           pickup_types and autopickup exceptions based on 'pickup_stolen'
           rather than 'pickup_thrown'; if previously stolen, stays stolen;
           if previously dropped, now forgotten and autopickup will operate
           normally regardless of the setting for 'dropped_nopick' */
        if (otmp.how_lost === LOST_THROWN)
            otmp.how_lost = LOST_STOLEN;
        else if (otmp.how_lost === LOST_DROPPED)
            otmp.how_lost = LOST_NONE;
    }
    /* Must do carrying effects on object prior to add_to_minv() */
    carry_obj_effects(otmp);
    /* add_to_minv() might free otmp [if merged with something else],
       so we have to call it after doing the object checks */
    const freed_otmp = add_to_minv(mtmp, otmp);
    return freed_otmp;
}

// C ref: worn.c extract_from_minvent() -- removing worn or wielded gear
// (update_mon_extrinsics(), mwepgone()) is not ported yet
/* Remove an object from a monster's inventory. */
export function extract_from_minvent(
    mon,
    obj,
    do_extrinsics, /* whether to call update_mon_extrinsics */
    silently)      /* doesn't affect all possible messages,
                    * just update_mon_extrinsics's */
{
    const unwornmask = obj.owornmask || 0;

    /*
     * At its core this is just obj_extract_self(), but it also handles
     * any updates that need to happen if the gear is equipped or in
     * some other sort of state that needs handling.
     * Note that like obj_extract_self(), this leaves obj free.
     */

    if (obj.where !== 'OBJ_MINVENT')
        throw new Error('extract_from_minvent called on object not in minvent');
    /* handle gold dragon scales/scale-mail (lit when worn) before clearing
       obj->owornmask because artifact_light() expects that to be W_ARM */
    if ((unwornmask & W_ARM) !== 0 && obj.lamplit
        && (obj.otyp === O.GOLD_DRAGON_SCALE_MAIL
            || obj.otyp === O.GOLD_DRAGON_SCALES))
        throw new Error('extract_from_minvent(): end_burn() not ported yet');

    obj_extract_self(obj);
    obj.owornmask = 0;
    if (unwornmask) {
        if (!(mon.mhp < 1) && do_extrinsics) { /* !DEADMONSTER(mon) */
            if (!silently)
                throw new Error('extract_from_minvent(): update_mon_extrinsics() messages not ported yet');
            update_mon_extrinsics_sync(mon, obj, false);
        }
        mon.misc_worn_check = (mon.misc_worn_check || 0) & ~unwornmask;
        /* give monster a chance to wear other equipment on its next
           move instead of waiting until it picks something up */
        check_gear_next_turn(mon);
    }
    obj_no_longer_held(obj);
    if (unwornmask & W_WEP) {
        mwepgone(mon); /* unwields and sets weapon_check to NEED_WEAPON */
    }
}

// C ref: steal.c mdrop_special_objs()
/* the Amulet, invocation tools, and Rider corpses resist even when
   artifacts and ordinary objects are given 0% resistance chance;
   current role's quest artifact is rescued too--quest artifacts
   for the other roles are not */
export function mdrop_special_objs(mon) {
    /* C walks mon->minvent from its head, the newest object; JS minvent
       arrays are oldest first */
    for (const obj of (mon.minvent || []).slice().reverse()) {
        if (obj_resists(obj, 0, 0) || (obj.oartifact && obj.oartifact === game.urole.questarti))
            throw new Error('mdrop_special_objs(): rescuing special objects not ported yet');
    }
}

// C ref: mkobj.c discard_minvent()
export function discard_minvent(mtmp, uncreate_artifacts) {
    let otmp;

    while ((otmp = (mtmp.minvent && mtmp.minvent.length)
                   ? mtmp.minvent[mtmp.minvent.length - 1] : null) !== null) {
        /* this has now become very similar to m_useupall()... */
        extract_from_minvent(mtmp, otmp, true, true);
        if (uncreate_artifacts && otmp.oartifact)
            artifact_exists(otmp, otmp.oextra?.oname || '' /* safe_oname() */,
                            false, ONAME_NO_FLAGS);
        otmp.where = 'OBJ_DELETED'; /* obfree(otmp, (struct obj *) 0) */
    }
}

// C ref: steal.c mdrop_obj()
/* drop one object taken from a (possibly dead) monster's inventory */
export async function mdrop_obj(mon, obj, verbosely) {
    const omx = mon.mx, omy = mon.my;
    const unwornmask = obj.owornmask || 0;
    /* call distant_name() for its possible side-effects even if the result
       might not be printed, and do it before extracting obj from minvent */
    const obj_name = distant_name(obj, doname);

    extract_from_minvent(mon, obj, false, true);
    /* don't charge for an owned saddle on dead steed (provided
        that the hero is within the same shop at the time) */
    if (unwornmask && mon.mtame && (unwornmask & W_SADDLE) !== 0
        && !obj.unpaid && game.level.flags?.has_shop)
        throw new Error('mdrop_obj(): costly_spot() saddle check not ported yet');
    /* obj_no_longer_held(obj); -- done by place_object */
    if (verbosely && cansee(omx, omy))
        await pline(`${Monnam(mon)} drops ${obj_name}.`); /* pline_mon() */
    if (!await flooreffects(obj, omx, omy, "fall")) {
        place_object(obj, omx, omy);
        stackobj(obj);
    }
    /* do this last, after placing obj on floor; removing steed's saddle
       throws rider, possibly inflicting fatal damage and producing bones; this
       is why we had to call extract_from_minvent() with do_intrinsics=FALSE */
    if (!(mon.mhp < 1) && unwornmask) /* !DEADMONSTER(mon) */
        await update_mon_extrinsics(mon, obj, false, true);
}

// C ref: steal.c relobj()
/* release the objects the creature is carrying */
export async function relobj(mtmp, show,
                             is_pet) { /* If true, pet should keep wielded/worn items */
    const omx = mtmp.mx, omy = mtmp.my;

    /* vault guard's gold goes away rather than be dropped... */
    if (mtmp.isgd && (mtmp.minvent || []).some(o => o.oclass === O.COIN_CLASS))
        throw new Error('relobj(): vault guard gold not ported yet');

    /* C's minvent chain head is the newest object, the last one in the
       JS minvent array */
    const minvent_head = () => (mtmp.minvent?.length
                                ? mtmp.minvent[mtmp.minvent.length - 1] : null);
    let otmp;
    while ((otmp = (is_pet ? droppables(mtmp) : minvent_head())) != null) {
        await mdrop_obj(mtmp, otmp, is_pet && game.flags.verbose);
    }

    if (show && cansee(omx, omy))
        newsym(omx, omy);
}
