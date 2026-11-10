/* NetHack 5.0	steal.c	$NHDT-Date: 1720895742 2024/07/13 18:35:42 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.132 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2012. */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from './c-runtime.js';


/* proportional subset of gold; return value actually fits in an int */
export function somegold(lmoney)
{
    lmoney = C.long(lmoney);
    let igold = (lmoney >= C.long(C.LARGEST_INT)) ? C.LARGEST_INT : C.int(lmoney);

    if (igold < 50)
        ; /* all gold */
    else if (igold < 100)
        igold = (C.rn2(igold - 25 + 1, 21, 0) + 25);
    else if (igold < 500)
        igold = (C.rn2(igold - 50 + 1, 23, 0) + 50);
    else if (igold < 1000)
        igold = (C.rn2(igold - 100 + 1, 25, 0) + 100);
    else if (igold < 5000)
        igold = (C.rn2(igold - 500 + 1, 27, 0) + 500);
    else if (igold < 10000)
        igold = (C.rn2(igold - 1000 + 1, 29, 0) + 1000);
    else
        igold = (C.rn2(igold - 5000 + 1, 31, 0) + 5000);

    return C.long(igold);
}

/*
 * Find the first (and hopefully only) gold object in a chain.
 * Used when leprechaun (or you as leprechaun) looks for
 * someone else's gold.  Returns a pointer so the gold may
 * be seized without further searching.
 * May search containers too.
 * Deals in gold only, as leprechauns don't care for lesser coins.
*/
export function findgold(argchain)
{
    let chain = argchain; /* allow arg to be nonnull */

    while (chain && chain.otyp != C.GOLD_PIECE)
        chain = chain.nobj;
    return chain;
}

/*
 * Steal gold coins only.  Leprechauns don't care for lesser coins.
*/
export function stealgold(mtmp)
{
    let fgold = C.g_at(C.u.ux, C.u.uy);
    let ygold;
    let tmp;
    let who;
    let whose, what;

    /* skip lesser coins on the floor */
    while (fgold && fgold.otyp != C.GOLD_PIECE)
        fgold = fgold.nexthere;

    /* Do you have real gold? */
    ygold = findgold(C.gi.invent);

    if (fgold && (!ygold || fgold.quan > ygold.quan || !C.rn2(5, 73, 1))) {
        C.obj_extract_self(fgold);
        C.add_to_minv(mtmp, fgold);
        C.newsym(C.u.ux, C.u.uy);
        if (C.u.usteed) {
            who = C.u.usteed;
            whose = C.s_suffix(C.y_monnam(who));
            what = C.makeplural(C.mbodypart(who, C.FOOT));
        } else {
            who = C.gy.youmonst;
            whose = "your";
            what = C.makeplural(C.body_part(C.FOOT));
        }
        /* [ avoid "between your rear regions" :-] */
        if (C.slithy(who.data))
            what = "coils";
        /* reduce "rear hooves/claws" to "hooves/claws" */
        if (!C.strncmp(what, "rear ", 5))
            what += 5;
        C.pline("%s quickly snatches some gold from %s %s %s!", C.Monnam(mtmp),
              (C.Levitation || C.Flying) ? "beneath" : "between", whose, what);
        if (!ygold || !C.rn2(5, 94, 1)) {
            if (!C.tele_restrict(mtmp))
                C.rloc(mtmp, C.RLOC_MSG);
            C.monflee(mtmp, 0, 0, 0);
        }
    } else if (ygold) {
        let gold_price = C.objects[C.GOLD_PIECE].oc_cost;

        tmp = C.long(somegold(C.money_cnt(C.gi.invent)) + C.long(gold_price) - 1n) / C.long(gold_price);
        tmp = C.min(tmp, ygold.quan);
        if (tmp < ygold.quan)
            ygold = C.splitobj(ygold, tmp);
        else
            C.setnotworn(ygold);
        C.freeinv(ygold);
        C.add_to_minv(mtmp, ygold);
        C.Your("purse feels lighter.");
        if (!C.tele_restrict(mtmp))
            C.rloc(mtmp, C.RLOC_MSG);
        C.monflee(mtmp, 0, 0, 0);
        C.disp.botl = 1;
    }
}

/* monster who was stealing from hero has just died */
export function thiefdead()
{
    /* hero is busy taking off an item of armor which takes multiple turns */
    C.gs.stealmid = 0;
    if (C.ga.afternmv == stealarm) {
        C.ga.afternmv = unstolenarm;
        C.gn.nomovemsg = 0;
    }
}

/* checks whether hero can be responsive to seduction attempts; similar to
   Unaware but also includes paralysis */
export function unresponsive()
{
    if (C.gm.multi >= 0)
        return 0;

    return (C.unconscious() || C.is_fainted()
            || (C.gm.multi_reason
                && (!C.strncmp(C.gm.multi_reason, "frozen", 6)
                    || !C.strncmp(C.gm.multi_reason, "paralyzed", 9)))) ? 1 : 0;
}

/* called via (*ga.afternmv)() when hero finishes taking off armor that
   was slated to be stolen but the thief died in the interim */
export function unstolenarm()
{
    let obj;

    /* find the object before clearing stealoid; it has already become
       not-worn and is still in hero's inventory */
    for (obj = C.gi.invent; obj; obj = obj.nobj)
        if (obj.o_id == C.gs.stealoid)
            break;
    C.gs.stealoid = 0;
    if (obj) {
        C.You("finish taking off your %s.", C.armor_simple_name(obj));
    }
    return 0;
}

/* finish stealing an item of armor which takes multiple turns to take off */
export function stealarm()
{
    let mtmp;
    let otmp, nextobj;

 botm: {
    if (!C.gs.stealoid || !C.gs.stealmid)
        break botm;

    for (otmp = C.gi.invent; otmp; otmp = nextobj) {
        nextobj = otmp.nobj;
        if (otmp.o_id == C.gs.stealoid) {
            for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
                if (mtmp.m_id == C.gs.stealmid) {
                    if (C.DEADMONSTER(mtmp)) {
                        C.impossible("stealarm(): dead monster stealing");
                        break botm; /* (could just use 'break' here) */
                    }
                    /* maybe the thief polymorphed into something without a
                       steal attack, or perhaps while stealing hero's suit
                       the thief took away other items causing hero to fall
                       into water or lava and then teleport to safety */
                    if (!C.dmgtype(mtmp.data, C.AD_SITM)
                        || C.distu(mtmp.mx, mtmp.my) > 2)
                        break botm; /* (could just use 'break' here) */
                    if (otmp.unpaid)
                        C.subfrombill(otmp, C.shop_keeper(C.loadChar(C.u.ushops)));
                    C.freeinv(otmp);
                    C.pline("%s steals %s!", C.Monnam(mtmp), C.doname(otmp));
                    mpickobj(mtmp, otmp); /* may free otmp */
                    /* Implies seduction, "you gladly hand over ..."
                       so we don't set mavenge bit here. */
                    C.monflee(mtmp, 0, 0, 0);
                    if (!C.tele_restrict(mtmp))
                        C.rloc(mtmp, C.RLOC_MSG);
                    break;
                }
            }
            break;
        }
    }
    }
    C.gs.stealoid = C.gs.stealmid = 0; /* in case only one has been reset so far */
    return 0;
}

/* An object you're wearing has been taken off by a monster (theft or
   seduction).  Also used if a worn item gets transformed (stone to flesh). */
export function remove_worn_item(obj, unchain_ball) /* whether to unpunish or just unwield */
{
    let oldinuse;

    if (C.donning(obj))
        C.cancel_don();
    if (!obj.owornmask)
        return;

    /*
     * Losing worn gear might drop hero into water or lava or onto a
     * location-changing trap or take away the ability to breathe in water.
     * Marking it 'in_use' prevents emergency_disrobe() from dropping it
     * and lava_effects() from destroying it; other cases impacting object
     * location (or destruction) might still have issues.
     *
     * Note:  if a hangup save occurs when 'in_use' is set, the item will
     * be destroyed via useup() during restore.  Maybe remove_worn_item()
     * and emergency_disrobe() should switch to using obj->bypass instead
     * but that would need a lot more cooperation by callers.  It's a
     * tradeoff between protecting the player against unintentional hangup
     * and defending the game against deliberate hangup when player sees a
     * message about something undesirable followed by --More--.
     */
    oldinuse = obj.in_use;
    obj.in_use = 1;

    if (obj.owornmask & C.W_ARMOR) {
        if (obj.address == (C.uskin?.address ?? 0)) {
            C.impossible("Removing embedded scales?");
            C.skinback(1); /* uarm = uskin; uskin = 0; */
        }
        if (obj.address == (C.uarm?.address ?? 0))
            C.Armor_off();
        else if (obj.address == (C.uarmc?.address ?? 0))
            C.Cloak_off();
        else if (obj.address == (C.uarmf?.address ?? 0))
            C.Boots_off();
        else if (obj.address == (C.uarmg?.address ?? 0))
            C.Gloves_off();
        else if (obj.address == (C.uarmh?.address ?? 0))
            C.Helmet_off();
        else if (obj.address == (C.uarms?.address ?? 0))
            C.Shield_off();
        else if (obj.address == (C.uarmu?.address ?? 0))
            C.Shirt_off();
        /* catchall -- should never happen */
        else
            C.setworn(0, obj.owornmask & C.W_ARMOR);
    } else if (obj.owornmask & C.W_AMUL) {
        C.Amulet_off();
    } else if (obj.owornmask & C.W_RING) {
        C.Ring_gone(obj);
    } else if (obj.owornmask & C.W_TOOL) {
        C.Blindf_off(obj);
    } else if (obj.owornmask & C.W_WEAPONS) {
        if (obj.address == (C.uwep?.address ?? 0))
            C.uwepgone();
        if (obj.address == (C.uswapwep?.address ?? 0))
            C.uswapwepgone();
        if (obj.address == (C.uquiver?.address ?? 0))
            C.uqwepgone();
    }

    if (obj.owornmask & (C.W_BALL | C.W_CHAIN)) {
        if (unchain_ball)
            C.unpunish();
    } else if (obj.owornmask) {
        /* catchall */
        C.setnotworn(obj);
    }

    if (obj.where == C.OBJ_DELETED) {
        if (C.debugcore("steal.c", 1)) {
            let save_plnmsg = C.iflags.last_msg;
            C.pline("remove_worn_item() \"%s\" deleted!", C.simpleonames(obj));
            C.iflags.last_msg = save_plnmsg;
        }
    }
    obj.in_use = oldinuse;
}

/* during theft of a worn item: remove_worn_item(), prefaced by a message */
export function worn_item_removal(mon, obj)
{
    let objbuf = C.stackAlloc(C.BUFSZ), article = C.stackAlloc(20), p;
    let verb;
    let strip_art;

    C.Strcpy(objbuf, C.doname(obj));
    /* massage the object description */
    strip_art = !C.strncmp(objbuf, "the ", 4) ? 4
                : !C.strncmp(objbuf, "an ", 3) ? 3
                  : !C.strncmp(objbuf, "a ", 2) ? 2
                    : 0;
    if (strip_art) { /* convert "a/an/the <object>" to "your object" */
        C.copynchars(article, objbuf, strip_art);
        /* when removing attached iron ball, caller passes 'uchain';
           when formatted, it will be "an iron chain (attached to you)";
           change "an" to "the" rather than to "your" in that situation */
        C.strsubst(objbuf, article, (obj.address == (C.uchain?.address ?? 0)) ? "the " : "your ");
    }
    /* these ought to be guarded against matching user-supplied name */
    C.strsubst(objbuf, " (being worn)", "");
    C.strsubst(objbuf, " (alternate weapon; not wielded)", "");
    /* convert "ring (on left hand)" to "ring (from left hand)" */
    if ((p = C.strstri(objbuf, " (on "))
        && (!C.strncmp(p + 5, "left ", 5) || !C.strncmp(p + 5, "right ", 6)))
        C.strsubst(p + 2, "on", "from");

    /* slightly iffy for alternate weapon that isn't actively dual-wielded,
       but it's better to alert the player to the change in equipment than
       to suppress the message for that case */
    verb = ((obj.owornmask & C.W_WEAPONS) != 0n) ? "disarms"
           : ((obj.owornmask & C.W_ACCESSORY) != 0n) ? "removes"
             : "takes off";
    C.pline("%s %s %s.", C.Some_Monnam(mon), verb, objbuf);
    C.iflags.last_msg = C.PLNMSG_MON_TAKES_OFF_ITEM;
    /* removal might trigger more messages (due to loss of Lev|Fly;
       descending happens before the theft in progress finishes) */
    remove_worn_item(obj, 1);
}

/* Returns 1 when something was stolen (or at least, when N should flee now),
 * returns -1 if the monster died in the attempt.
 * Avoid stealing the object 'stealoid'.
 * Nymphs and monkeys won't steal coins (so that their "steal item" attack
 * doesn't become a superset of leprechaun's "steal gold" attack).
 */
export function steal(mtmp, objnambuf)
{
    let otmp;
    let Monnambuf = C.stackAlloc(C.BUFSZ);
    let tmp, could_petrify, armordelay, olddelay, icnt,
        named = 0, retrycnt = 0;
    let monkey_business = C.is_animal(mtmp.data),
            seen = C.canspotmon(mtmp),
            was_doffing, was_punished = C.Punished;

    if (objnambuf)
        C.HEAPU8[objnambuf] = '\0'.charCodeAt(0);
    /* the following is true if successful on first of two attacks. */
    if (!C.monnear(mtmp, C.u.ux, C.u.uy))
        return 0;

    /* stealing a worn item might drop hero into water or lava where
       teleporting to safety could result in a previously visible thief
       no longer being visible; it could also be a case of a blinded
       hero being able to see via wearing the Eyes of the Overworld and
       having those stolen; remember the name as it is now; if unseen,
       nymphs will be "Someone" and monkeys will be "Something" */
    C.Strcpy(Monnambuf, C.Some_Monnam(mtmp));

    /* food being eaten might already be used up but will not have
       been removed from inventory yet; we don't want to steal that,
       so this will cause it to be removed now */
    if (C.go.occupation)
        C.maybe_finished_meal(0);

    icnt = C.inv_cnt(0); /* don't include gold */
    let _label = "";
 dispatch:
    for (;;) {
        switch (_label) {
        case "":
            _label = (!icnt || (icnt == 1 && C.uskin)) ? "nothing_to_steal" : "choose_ring";
            continue dispatch;
        case "nothing_to_steal": {
        /* Not even a thousand men in armor can strip a naked man. */
        /* nymphs might target uchain if invent is empty; monkeys won't;
           hero becomes unpunished but nymph ends up empty handed */
        if (C.Punished && !monkey_business && C.rn2(4, 379, 2)) {
            /* uball is not carried (uchain never is) */
            C.assert(C.uball != 0 && C.uball.where == C.OBJ_FLOOR);
            worn_item_removal(mtmp, C.uchain);
        } else if (C.u.utrap && C.u.utraptype == C.TT_BURIEDBALL
                   && !monkey_business && !C.rn2(4, 384, 2)) {
            let dummy = C.booleanLocal();

            /* buried ball is not tracked via 'uball' and there is no chain
               at all (hence no uchain to take off) */
            C.pline("%s takes off your unseen chain.", Monnambuf);
            C.openholdingtrap(C.gy.youmonst, dummy);
        } else if (C.Blind) {
            C.pline("Somebody tries to rob you, but finds nothing to steal.");
        } else if (C.inv_cnt(1) > C.inv_cnt(0)) {
            C.pline("%s tries to rob you, but isn't interested in gold.",
                  Monnambuf);
        } else {
            C.pline("%s tries to rob you, but there is nothing to steal!",
                  Monnambuf);
        }
        return 1; /* let her flee */
        }
        case "choose_ring": {
    if (monkey_business || C.uarmg) {
        ; /* skip ring special cases */
    } else if (C.Adornment & C.LEFT_RING) {
        otmp = C.uleft;
        { _label = "gotobj"; continue dispatch; }
    } else if (C.Adornment & C.RIGHT_RING) {
        otmp = C.uright;
        { _label = "gotobj"; continue dispatch; }
    }

            _label = "retry";
            continue dispatch;
        }
        case "retry": {
    tmp = 0;
    for (otmp = C.gi.invent; otmp; otmp = otmp.nobj)
        if ((!C.uarm || otmp.address != (C.uarmc?.address ?? 0)) && otmp.address != (C.uskin?.address ?? 0)
            && otmp.oclass != C.COIN_CLASS)
            tmp += (otmp.owornmask & (C.W_ARMOR | C.W_ACCESSORY)) ? 5 : 1;
    if (!tmp)
        { _label = "nothing_to_steal"; continue dispatch; }
    tmp = C.rn2(tmp, 421, 2);
    for (otmp = C.gi.invent; otmp; otmp = otmp.nobj)
        if ((!C.uarm || otmp.address != (C.uarmc?.address ?? 0)) && otmp.address != (C.uskin?.address ?? 0)
            && otmp.oclass != C.COIN_CLASS) {
            tmp -= (otmp.owornmask & (C.W_ARMOR | C.W_ACCESSORY)) ? 5 : 1;
            if (tmp < 0)
                break;
        }
    if (!otmp) {
        C.impossible("Steal fails!");
        return 0;
    }
    /* can't steal ring(s) while wearing gloves */
    if ((otmp.address == (C.uleft?.address ?? 0) || otmp.address == (C.uright?.address ?? 0)) && C.uarmg)
        otmp = C.uarmg;
    /* can't steal gloves while wielding - so steal the wielded item. */
    if (otmp.address == (C.uarmg?.address ?? 0) && C.uwep)
        otmp = C.uwep;
    /* can't steal armor while wearing cloak - so steal the cloak. */
    else if (otmp.address == (C.uarm?.address ?? 0) && C.uarmc)
        otmp = C.uarmc;
    /* can't steal shirt while wearing cloak or suit */
    else if (otmp.address == (C.uarmu?.address ?? 0) && C.uarmc)
        otmp = C.uarmc;
    else if (otmp.address == (C.uarmu?.address ?? 0) && C.uarm)
        otmp = C.uarm;

            _label = "gotobj";
            continue dispatch;
        }
        case "gotobj": {
    if (otmp.o_id == C.gs.stealoid)
        return 0;

    if (otmp.otyp == C.BOULDER && !C.throws_rocks(mtmp.data)) {
        if (!retrycnt++)
            { _label = "retry"; continue dispatch; }
        { _label = "cant_take"; continue dispatch; }
    }
    /* animals can't overcome curse stickiness nor unlock chains */
    if (monkey_business) {
        let ostuck;

        /* is the player prevented from voluntarily giving up this item?
           (ignores loadstones; the !can_carry() check will catch those) */
        if (otmp.address == (C.uball?.address ?? 0))
            ostuck = 1; /* effectively worn; curse is implicit */
        else if (otmp.address == (C.uquiver?.address ?? 0) || (otmp.address == (C.uswapwep?.address ?? 0) && !C.u.twoweap))
            ostuck = 0; /* not really worn; curse doesn't matter */
        else
            ostuck = ((otmp.cursed && otmp.owornmask)
                      /* nymphs can steal rings from under
                         cursed weapon but animals can't */
                      || (otmp.address == (C.RING_ON_PRIMARY?.address ?? 0) && C.welded(C.uwep))
                      || (otmp.address == (C.RING_ON_SECONDARY?.address ?? 0) && C.welded(C.uwep)
                          && C.bimanual(C.uwep)));

        if (ostuck || C.can_carry(mtmp, otmp) == 0) {
            _label = "cant_take";
            continue dispatch;
        }
    }
            _label = "proceed";
            continue dispatch;
        }
        case "cant_take": {
            const how = [
                "steal", "snatch", "grab", "take"
            ];
            C.pline("%s tries to %s %s%s but gives up.", Monnambuf,
                  how[C.rn2(how.length, 481, 2)],
                  (otmp.owornmask & C.W_ARMOR) ? "your " : "",
                  (otmp.owornmask & C.W_ARMOR) ? C.armor_simple_name(otmp)
                                              : C.yname(otmp));
            /* the fewer items you have, the less likely the thief
               is going to stick around to try again (0) instead of
               running away (1) */
            return !C.rn2(Math.trunc(C.inv_cnt(0) / 5) + 2, 488, 2) ? 1 : 0;
        }
        case "proceed": {
    if (otmp.otyp == C.LEASH && otmp.leashmon) {
        if (monkey_business && otmp.cursed)
            { _label = "cant_take"; continue dispatch; }
        C.o_unleash(otmp);
    }

    was_doffing = C.doffing(otmp);
    /* stop donning/doffing now so that afternmv won't be clobbered
       below; stop_occupation doesn't handle donning/doffing */
    olddelay = C.stop_donning(otmp);
    /* you're going to notice the theft... */
    C.stop_occupation();

    if (otmp.owornmask & (C.W_ARMOR | C.W_ACCESSORY)) {
        switch (otmp.oclass) {
        case C.TOOL_CLASS:
        case C.AMULET_CLASS:
        case C.RING_CLASS:
        case C.FOOD_CLASS: /* meat ring */
            worn_item_removal(mtmp, otmp);
            break;
        case C.ARMOR_CLASS:
            armordelay = C.objects[otmp.otyp].oc_delay;
            if (olddelay > 0 && olddelay < armordelay)
                armordelay = olddelay;
            if (monkey_business || unresponsive()) {
                /* animals usually don't have enough patience to take off
                   items which require extra time; unconscious or paralyzed
                   hero can't be charmed into taking off his own armor */
                if (armordelay >= 1 && !olddelay && C.rn2(10, 521, 2))
                    { _label = "cant_take"; continue dispatch; }
                worn_item_removal(mtmp, otmp);
                break;
            } else {
                let curssv = otmp.cursed;
                let slowly;

                otmp.cursed = 0;
                slowly = (armordelay >= 1 || C.gm.multi < 0);
                if (C.flags.female)
                    C.urgent_pline("%s charms you.  You gladly %s your %s.",
                                 !seen ? "She" : Monnambuf,
                                 curssv ? "let her take"
                                 : !slowly ? "hand over"
                                   : was_doffing ? "continue removing"
                                     : "start removing",
                                 C.armor_simple_name(otmp));
                else
                    C.urgent_pline("%s seduces you and %s off your %s.",
                                 !seen ? "She" : C.Adjmonnam(mtmp, "beautiful"),
                                 curssv ? "helps you to take"
                                 : !slowly ? "you take"
                                   : was_doffing ? "you continue taking"
                                     : "you start taking",
                                 C.armor_simple_name(otmp));
                named++;
                /* the following is to set multi for later on */
                C.nomul(-armordelay);
                C.gm.multi_reason = "taking off clothes";
                C.gn.nomovemsg = 0;
                remove_worn_item(otmp, 1);
                otmp.cursed = curssv;
                if (C.gm.multi < 0) {
                    C.gs.stealoid = otmp.o_id;
                    C.gs.stealmid = mtmp.m_id;
                    C.ga.afternmv = stealarm;
                    return 0;
                }
            }
            break;
        default:
            C.impossible("Tried to steal a strange worn thing. [%d]",
                       otmp.oclass);
        }
        /* hero's blindfold might have just been stolen; if so, replace
           cached "Someone" or "Something" with Monnam */
        if (!seen && C.canspotmon(mtmp))
            C.Strcpy(Monnambuf, C.Monnam(mtmp));
    } else if (otmp.owornmask) { /* weapon or ball&chain */
        let item = otmp;

        if (otmp.address == (C.uball?.address ?? 0)) /* non-Null uball implies non-Null uchain */
            item = C.uchain; /* yields a more accurate 'takes off' message */
        worn_item_removal(mtmp, item);
        /* if we switched from uball to uchain for the preface message,
           then unpunish() took place and both those pointers are now Null,
           with 'item' a stale pointer to freed chain; the ball is still
           present though and 'otmp' is still valid; if uball was also
           wielded or quivered, the corresponding weapon pointer hasn't
           been cleared yet; do that, with no preface message this time */
        if ((otmp.owornmask & C.W_WEAPONS) != 0n)
            remove_worn_item(otmp, 0);
    }

    /* do this before removing it from inventory */
    if (objnambuf)
        C.Strcpy(objnambuf, C.yname(otmp));
    /* usually set mavenge bit so knights won't suffer an alignment penalty
       during retaliation; not applicable for removing attached iron ball */
    if (!C.Conflict && !(was_punished && !C.Punished))
        mtmp.mavenge = 1;

    if (otmp.unpaid)
        C.subfrombill(otmp, C.shop_keeper(C.loadChar(C.u.ushops)));
    C.freeinv(otmp);

    /* if we just gave a message about removing a worn item and there have
       been no intervening messages, shorten '<mon> stole <item>' message */
    if (C.iflags.last_msg == C.PLNMSG_MON_TAKES_OFF_ITEM
        && mtmp.data.mlet == C.S_NYMPH)
        ++named;
    C.urgent_pline("%s stole %s.", named ? "She" : Monnambuf, C.doname(otmp));
    C.encumber_msg();
    could_petrify = (otmp.otyp == C.CORPSE
                     && C.touch_petrifies(C.mons[otmp.corpsenm]));
    otmp.how_lost = C.LOST_STOLEN;
    mpickobj(mtmp, otmp); /* may free otmp */
    if (could_petrify && !(mtmp.misc_worn_check & C.W_ARMG)) {
        C.minstapetrify(mtmp, 1);
        return -1;
    }
    return (C.gm.multi < 0) ? 0 : 1;
        }
        }
    }
}

/* Returns 1 if otmp is free'd, 0 otherwise. */
export function mpickobj(mtmp, otmp)
{
    let freed_otmp;
    let snuff_otmp = 0;

    if (!otmp) {
        C.impossible("monster (%s) taking or picking up nothing?",
                   C.pmname(mtmp.data, C.Mgender(mtmp)));
        return 1;
    } else if (otmp.address == (C.uball?.address ?? 0) || otmp.address == (C.uchain?.address ?? 0)) {
        C.impossible("monster (%s) taking or picking up attached %s (%s)?",
                   C.pmname(mtmp.data, C.Mgender(mtmp)),
                   (otmp.address == (C.uchain?.address ?? 0)) ? "chain" : "ball", C.simpleonames(otmp));
        return 0;
    }
    /* if monster is acquiring a thrown or kicked object, the throwing
       or kicking code shouldn't continue to track and place it */
    if (otmp.address == (C.gt.thrownobj?.address ?? 0))
        C.gt.thrownobj = 0;
    else if (otmp.address == (C.gk.kickedobj?.address ?? 0))
        C.gk.kickedobj = 0;
    /* an unpaid item can be on the floor; if a monster picks it up, take
       it off the shop bill */
    if (otmp.unpaid || (C.Has_contents(otmp) && C.count_unpaid(otmp.cobj))) {
        C.subfrombill(otmp, C.find_objowner(otmp, otmp.ox, otmp.oy));
    }
    /* don't want hidden light source inside the monster; assumes that
       engulfers won't have external inventories; whirly monsters cause
       the light to be extinguished rather than letting it shine through */
    if (C.obj_sheds_light(otmp) && C.attacktype(mtmp.data, C.AT_ENGL)) {
        /* this is probably a burning object that you dropped or threw */
        if (C.engulfing_u(mtmp) && !C.Blind)
            C.pline("%s out.", C.Tobjnam(otmp, "go"));
        snuff_otmp = 1;
    }
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
        if (!C.canseemon(mtmp) && mtmp.address != (C.u.ustuck?.address ?? 0))
            C.unknow_object(otmp);
        /* if otmp has flags set for how it left hero's inventory, change
           those flags; if thrown, now stolen and autopickup might override
           pickup_types and autopickup exceptions based on 'pickup_stolen'
           rather than 'pickup_thrown'; if previously stolen, stays stolen;
           if previously dropped, now forgotten and autopickup will operate
           normally regardless of the setting for 'dropped_nopick' */
        if (otmp.how_lost == C.LOST_THROWN)
            otmp.how_lost = C.LOST_STOLEN;
        else if (otmp.how_lost == C.LOST_DROPPED)
            otmp.how_lost = C.LOST_NONE;
    }
    /* Must do carrying effects on object prior to add_to_minv() */
    C.carry_obj_effects(otmp);
    /* add_to_minv() might free otmp [if merged with something else],
       so we have to call it after doing the object checks */
    freed_otmp = C.add_to_minv(mtmp, otmp);
    /* and we had to defer this until object is in mtmp's inventory */
    if (snuff_otmp)
        C.snuff_light_source(mtmp.mx, mtmp.my);
    return freed_otmp;
}

/* called for AD_SAMU (the Wizard and quest nemeses) */
export function stealamulet(mtmp)
{
    let buf = C.stackAlloc(C.BUFSZ);
    let otmp = 0, obj = 0;
    let real = 0, fake = 0, n;

    /* target every quest artifact, not just current role's;
       if hero has more than one, choose randomly so that player
       can't use inventory ordering to influence the theft */
    for (n = 0, obj = C.gi.invent; obj; obj = obj.nobj)
        if (C.any_quest_artifact(obj))
            ++n, otmp = obj;
    if (n > 1) {
        n = C.rnd(n, 702, 3);
        for (otmp = C.gi.invent; otmp; otmp = otmp.nobj)
            if (C.any_quest_artifact(otmp) && !--n)
                break;
    }

    if (!otmp) {
        /* if we didn't find any quest artifact, find another valuable item */
        if (C.u.uhave.amulet) {
            real = C.AMULET_OF_YENDOR;
            fake = C.FAKE_AMULET_OF_YENDOR;
        } else if (C.u.uhave.bell) {
            real = C.BELL_OF_OPENING;
            fake = C.BELL;
        } else if (C.u.uhave.book) {
            real = C.SPE_BOOK_OF_THE_DEAD;
        } else if (C.u.uhave.menorah) {
            real = C.CANDELABRUM_OF_INVOCATION;
        } else
            return; /* you have nothing of special interest */

        /* If we get here, real and fake have been set up. */
        for (n = 0, obj = C.gi.invent; obj; obj = obj.nobj)
            if (obj.otyp == real || (obj.otyp == fake && !mtmp.iswiz))
                ++n, otmp = obj;
        if (n > 1) {
            n = C.rnd(n, 728, 3);
            for (otmp = C.gi.invent; otmp; otmp = otmp.nobj)
                if ((otmp.otyp == real
                     || (otmp.otyp == fake && !mtmp.iswiz)) && !--n)
                    break;
        }
    }

    if (otmp) { /* we have something to snatch */
        /* take off outer gear if we're targeting [hypothetical]
           quest artifact suit, shirt, gloves, or rings */
        if ((otmp.address == (C.uarm?.address ?? 0) || otmp.address == (C.uarmu?.address ?? 0)) && C.uarmc)
            worn_item_removal(mtmp, C.uarmc);
        if (otmp.address == (C.uarmu?.address ?? 0) && C.uarm)
            worn_item_removal(mtmp, C.uarm);
        if ((otmp.address == (C.uarmg?.address ?? 0) || ((otmp.address == (C.uright?.address ?? 0) || otmp.address == (C.uleft?.address ?? 0)) && C.uarmg))
            && C.uwep) {
            /* gloves are about to be unworn; unwield weapon(s) first */
            if (C.u.twoweap)    /* remove_worn_item(uswapwep) indirectly */
                worn_item_removal(mtmp, C.uswapwep); /* clears u.twoweap */
            worn_item_removal(mtmp, C.uwep);
        }
        if ((otmp.address == (C.uright?.address ?? 0) || otmp.address == (C.uleft?.address ?? 0)) && C.uarmg)
            /* calls Gloves_off() to handle wielded cockatrice corpse */
            worn_item_removal(mtmp, C.uarmg);

        /* finally, steal the target item */
        if (otmp.owornmask)
            worn_item_removal(mtmp, otmp);
        if (otmp.unpaid)
            C.subfrombill(otmp, C.shop_keeper(C.loadChar(C.u.ushops)));
        C.freeinv(otmp);
        C.Strcpy(buf, C.doname(otmp));
        mpickobj(mtmp, otmp); /* could merge and free otmp but won't */
        C.pline("%s steals %s!", C.Some_Monnam(mtmp), buf);
        if (C.can_teleport(mtmp.data) && !C.tele_restrict(mtmp))
            C.rloc(mtmp, C.RLOC_MSG);
        C.encumber_msg();
    }
}

/* when a mimic gets poked with something, it might take that thing
   (at present, only implemented for when the hero does the poking) */
export function maybe_absorb_item(mon, obj, ochance, achance) /* percent chance for ordinary item, artifact */
{
    if (obj.address == (C.uball?.address ?? 0) || obj.address == (C.uchain?.address ?? 0) || obj.oclass == C.ROCK_CLASS
        || C.obj_resists(obj, 100 - ochance, 100 - achance)
        || !C.touch_artifact(obj, mon))
        return;

    if (C.carried(obj)) {
        if (obj.owornmask)
            remove_worn_item(obj, 1);
        if (obj.unpaid)
            C.subfrombill(obj, C.shop_keeper(C.loadChar(C.u.ushops)));
        if (C.cansee(mon.mx, mon.my)) {
            /* Some_Monnam() avoids "It pulls ... and absorbs it!"
               if hero can see the location but not the monster */
            C.pline("%s pulls %s away from you and absorbs %s!",
                  C.Some_Monnam(mon), /* Monnam() or "Something" */
                  C.yname(obj), (obj.quan > 1n) ? "them" : "it");
        } else {
            let hand_s = C.body_part(C.HAND);

            if (C.bimanual(obj))
                hand_s = C.makeplural(hand_s);
            C.pline("%s %s pulled from your %s!", C.upstart(C.yname(obj)),
                  C.otense(obj, "are"), hand_s);
        }
        C.freeinv(obj);
        C.encumber_msg();
    } else {
        /* not carried; presumably thrown or kicked */
        if (C.canspotmon(mon))
            C.pline("%s absorbs %s!", C.Monnam(mon), C.yname(obj));
    }
    /* add to mon's inventory */
    mpickobj(mon, obj);
}

/* drop one object taken from a (possibly dead) monster's inventory */
export function mdrop_obj(mon, obj, verbosely)
{
    let omx = mon.mx, omy = mon.my;
    let unwornmask = obj.owornmask;
    /* call distant_name() for its possible side-effects even if the result
       might not be printed, and do it before extracting obj from minvent */
    let obj_name = C.distant_name(obj, C.doname);

    C.extract_from_minvent(mon, obj, 0, 1);
    /* don't charge for an owned saddle on dead steed (provided
        that the hero is within the same shop at the time) */
    if (unwornmask && mon.mtame && (unwornmask & C.W_SADDLE) != 0n
        && !obj.unpaid && C.costly_spot(omx, omy)
        /* being at costly_spot guarantees lev->roomno is not 0 */
        && C.strchr(C.in_rooms(C.u.ux, C.u.uy, C.SHOPBASE), C.levl[omx][omy].roomno)) {
        obj.no_charge = 1;
    }
    /* obj_no_longer_held(obj); -- done by place_object */
    if (verbosely && C.cansee(omx, omy))
        C.pline_mon(mon, "%s drops %s.", C.Monnam(mon), obj_name);
    if (!C.flooreffects(obj, omx, omy, "fall")) {
        C.place_object(obj, omx, omy);
        C.stackobj(obj);
    }
    /* do this last, after placing obj on floor; removing steed's saddle
       throws rider, possibly inflicting fatal damage and producing bones; this
       is why we had to call extract_from_minvent() with do_intrinsics=FALSE */
    if (!C.DEADMONSTER(mon) && unwornmask)
        C.update_mon_extrinsics(mon, obj, 0, 1);
}

/* some monsters bypass the normal rules for moving between levels or
   even leaving the game entirely; when that happens, prevent them from
   taking the Amulet, invocation items, or quest artifact with them */
export function mdrop_special_objs(mon)
{
    let obj, otmp;

    for (obj = mon.minvent; obj; obj = otmp) {
        otmp = obj.nobj;
        /* the Amulet, invocation tools, and Rider corpses resist even when
           artifacts and ordinary objects are given 0% resistance chance;
           current role's quest artifact is rescued too--quest artifacts
           for the other roles are not */
        if (C.obj_resists(obj, 0, 0) || C.is_quest_artifact(obj)) {
            if (mon.mx) {
                mdrop_obj(mon, obj, 0);
            } else { /* migrating monster not on map */
                C.extract_from_minvent(mon, obj, 1, 1);
                C.rloco(obj);
            }
        }
    }
}

/* release the objects the creature is carrying */
export function relobj(mtmp, show, is_pet) /* If true, pet should keep wielded/worn items */
{
    let otmp;
    let omx = mtmp.mx, omy = mtmp.my;

    /* vault guard's gold goes away rather than be dropped... */
    if (mtmp.isgd && (otmp = findgold(mtmp.minvent)) != 0) {
        if (C.canspotmon(mtmp))
            C.pline("%s gold %s.", C.s_suffix(C.Monnam(mtmp)),
                  C.canseemon(mtmp) ? "vanishes" : "seems to vanish");
        C.obj_extract_self(otmp);
        C.obfree(otmp, 0);
    } /* isgd && has gold */

    while ((otmp = (is_pet ? C.droppables(mtmp) : mtmp.minvent)) != 0) {
        mdrop_obj(mtmp, otmp, is_pet && C.flags.verbose);
    }

    if (show && C.cansee(omx, omy))
        C.newsym(omx, omy);
}

/*steal.c*/
