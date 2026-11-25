// steal.js — monsters acquiring and releasing objects.
// C ref: steal.c mpickobj(), mdrop_obj(), relobj();
// invent.c carry_obj_effects(); worn.c extract_from_minvent()

import { any_quest_artifact } from './wizard.js';
import { game } from './gstate.js';
import { unpunish } from './read.js';
import { add_to_minv, obj_extract_self, place_object, unknow_object } from './mkobj.js';
import { canseemon, canspotmon } from './display.js';
import { monnear } from './mon.js';
import * as O from './objects.js';
import { cansee } from './vision.js';
import { newsym, pline } from './display.js';
import { distant_name, doname } from './objnam.js';
import { Monnam } from './do_name.js';
import { stackobj, carry_obj_effects } from './invent.js';
import { flooreffects, obj_no_longer_held } from './do.js';
import { droppables, obj_resists } from './dogmove.js';
import { artifact_exists, artifact_light } from './artifact.js';
import { ONAME_NO_FLAGS, RLOC_MSG } from './const.js';
import { LOST_NONE, LOST_THROWN, LOST_DROPPED, LOST_STOLEN, W_ARM, W_WEP,
         W_SADDLE } from './const.js';
import { update_mon_extrinsics, update_mon_extrinsics_g } from './worn.js';
import { mwepgone } from './weapon.js';
import { check_gear_next_turn } from './mon.js';
import { W_ARMOR, W_AMUL, W_RING, W_TOOL, W_WEAPONS, W_BALL,
         W_CHAIN } from './const.js';
import { uwepgone, uswapwepgone, uqwepgone } from './wield.js';
import { donning, cancel_don, Armor_off, Cloak_off, Boots_off, Gloves_off,
         Helmet_off, Shield_off, Shirt_off, Amulet_off,
         Blindf_off } from './do_wear.js';
import { setworn, setnotworn } from './worn.js';
import { rn1, rn2, rnd, ROLL_FROM } from './rng.js';
import { Some_Monnam, Adjmonnam, y_monnam } from './do_name.js';
import { inv_cnt, nomul } from './hack.js';
import { maybe_finished_meal } from './eat.js';
import { is_fainted } from './eat.js';
import { doffing, stop_donning } from './do_wear.js';
import { stop_occupation } from './allmain.js';
import { freeinv, count_unpaid } from './invent.js';
import { armor_simple_name, yname, makeplural } from './objnam.js';
import { s_suffix, distu, strsubst } from './hacklib.js';
import { tele_restrict, rloc } from './teleport.js';
import { monflee } from './monmove.js';
import { welded } from './wield.js';
import { can_carry } from './dogmove.js';
import { subfrombill, shop_keeper, mbodypart, find_objowner } from './shk.js';
import { encumber_msg } from './pickup.js';
import { dmgtype, can_teleport, is_animal, slithy, throws_rocks,
         touch_petrifies } from './mondata.js';
import { body_part } from './insight.js';
import { urgent_pline } from './display.js';
import { add_to_minv as add_to_minv_core } from './mkobj.js';
import { splitobj } from './mkobj.js';
import { strstri } from './hacklib.js';
import { money_cnt } from './u_init.js';
import * as M from './monsters.js';
import { mons, AD_SITM } from './monsters.js';
import { PLNMSG_MON_TAKES_OFF_ITEM, W_ACCESSORY, W_ARMG, TT_BURIEDBALL,
         ADORNED, LEFT_RING, RIGHT_RING, CONFLICT, BLINDED, LEVITATION,
         FLYING, FOOT } from './const.js';
import { ART_ORB_OF_DETECTION } from './artilist.js';
import { Punished, Blind, Adornment, Conflict, Levitation, Flying } from './youprop.js';
import { Ring_gone as Ring_gone_st } from './do_wear.js';
import { obj_sheds_light, snuff_light_source } from './light.js';
import { engulfing_u } from './const.js';
import { AT_ENGL } from './monsters.js';
import { skinback } from './polyself.js';
import { openholdingtrap, unconscious } from './trap.js';
import { minstapetrify } from './trap.js';
import { impossible } from './hack.js';
import { end_burn } from './timeout.js';
import { costly_spot } from './shk.js';
import { in_rooms } from './hack.js';
import { SHOPBASE } from './const.js';
import { bimanual } from './objects.js';

/* C ref: global.h LARGEST_INT */
const LARGEST_INT = 32767;

/* C ref: shk.c shop_keeper(*u.ushops) */
function ushops_keeper() {
    return shop_keeper(game.u.ushops ? (game.u.ushops.charCodeAt(0) || 0) : 0);
}
/* C ref: decl.h RING_ON_PRIMARY, RING_ON_SECONDARY */
function RING_ON_PRIMARY() { return game.u.uhandedness ? game.uleft : game.uright; }
function RING_ON_SECONDARY() { return game.u.uhandedness ? game.uright : game.uleft; }

// C ref: steal.c findgold()
/* Is there gold in the chain? Deals in gold only, as leprechauns don't
   care for lesser coins. */
export function findgold(argchain) {
    let chain = argchain; /* allow arg to be nonnull */

    if (Array.isArray(chain)) {
        /* a monster's minvent: JS arrays are oldest first, C's chain
           starts with the newest object */
        for (let i = chain.length - 1; i >= 0; i--)
            if (chain[i].otyp === O.GOLD_PIECE)
                return chain[i];
        return null;
    }
    while (chain && chain.otyp !== O.GOLD_PIECE)
        chain = chain.nobj;
    return chain;
}

// C ref: steal.c stealgold()
/*
 * Steal gold coins only.  Leprechauns don't care for lesser coins.
*/
export async function stealgold(mtmp) {
    const u = game.u;
    /* g_at(u.ux, u.uy), then skip lesser coins on the floor: the first
       gold piece in the pile at the hero's spot (nexthere order) */
    let fgold = null;
    let ygold;
    let tmp;

    for (const o of game.level.objects || [])
        if (o.ox === u.ux && o.oy === u.uy && o.where === 'OBJ_FLOOR'
            && o.otyp === O.GOLD_PIECE) {
            fgold = o;
            break;
        }

    /* Do you have real gold? */
    ygold = findgold(game.invent);

    if (fgold && (!ygold || fgold.quan > ygold.quan || !rn2(5))) {
        let who, whose, what;

        obj_extract_self(fgold);
        add_to_minv_core(mtmp, fgold);
        newsym(u.ux, u.uy);
        if (u.usteed) {
            who = u.usteed;
            whose = s_suffix(y_monnam(who));
            what = makeplural(mbodypart(who, FOOT));
        } else {
            who = game.youmonst;
            whose = "your";
            what = makeplural(body_part(FOOT));
        }
        /* [ avoid "between your rear regions" :-] */
        if (slithy(who.data))
            what = "coils";
        /* reduce "rear hooves/claws" to "hooves/claws" */
        if (what.startsWith("rear "))
            what = what.slice(5);
        await pline(`${Monnam(mtmp)} quickly snatches some gold from ${
            (Levitation() || Flying()) ? "beneath" : "between"} ${whose} ${what}!`);
        if (!ygold || !rn2(5)) {
            if (!await tele_restrict(mtmp))
                await rloc(mtmp, RLOC_MSG);
            await monflee(mtmp, 0, false, false);
        }
    } else if (ygold) {
        const gold_price = O.objects[O.GOLD_PIECE].oc_cost;

        tmp = Math.trunc((somegold(money_cnt(game.invent)) + gold_price - 1) / gold_price);
        tmp = Math.min(tmp, ygold.quan);
        if (tmp < ygold.quan)
            ygold = splitobj(ygold, tmp);
        else
            setnotworn(ygold);
        freeinv(ygold);
        add_to_minv_core(mtmp, ygold);
        await pline("Your purse feels lighter."); /* Your() */
        if (!await tele_restrict(mtmp))
            await rloc(mtmp, RLOC_MSG);
        await monflee(mtmp, 0, false, false);
        game.disp_botl = true;
    }
}

// C ref: steal.c thiefdead()
/* monster who was stealing from hero has just died */
export function thiefdead() {
    /* hero is busy taking off an item of armor which takes multiple turns */
    game.stealmid = 0;
    if (game.afternmv === stealarm) {
        game.afternmv = unstolenarm;
        game.nomovemsg = null;
    }
}

// C ref: steal.c unresponsive()
/* checks whether hero can be responsive to seduction attempts; similar to
   Unaware but also includes paralysis */
export function unresponsive() {
    if (game.multi >= 0)
        return false;

    return (unconscious() || is_fainted()
            || !!(game.multi_reason
                  && (game.multi_reason.startsWith("frozen")
                      || game.multi_reason.startsWith("paralyzed"))));
}

// C ref: steal.c unstolenarm()
/* called via (*ga.afternmv)() when hero finishes taking off armor that
   was slated to be stolen but the thief died in the interim */
async function unstolenarm() {
    let obj;

    /* find the object before clearing stealoid; it has already become
       not-worn and is still in hero's inventory */
    for (obj = game.invent; obj; obj = obj.nobj)
        if (obj.o_id === game.stealoid)
            break;
    game.stealoid = 0;
    if (obj) {
        await pline(`You finish taking off your ${armor_simple_name(obj)}.`); /* You() */
    }
    return 0;
}

// C ref: steal.c stealarm()
/* finish stealing an item of armor which takes multiple turns to take off */
async function stealarm() {
    let otmp, nextobj;

    if (!game.stealoid || !game.stealmid)
        return botm();

    for (otmp = game.invent; otmp; otmp = nextobj) {
        nextobj = otmp.nobj;
        if (otmp.o_id === game.stealoid) {
            for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
                if (mtmp.m_id === game.stealmid) {
                    if (mtmp.mhp < 1) { /* DEADMONSTER(mtmp) */
                        /* impossible("stealarm(): dead monster stealing") */
                        return botm(); /* (could just use 'break' here) */
                    }
                    /* maybe the thief polymorphed into something without a
                       steal attack, or perhaps while stealing hero's suit
                       the thief took away other items causing hero to fall
                       into water or lava and then teleport to safety */
                    if (!dmgtype(mtmp.data, AD_SITM)
                        || distu(mtmp.mx, mtmp.my) > 2)
                        return botm(); /* (could just use 'break' here) */
                    if (otmp.unpaid)
                        subfrombill(otmp, ushops_keeper());
                    freeinv(otmp);
                    await pline(`${Monnam(mtmp)} steals ${doname(otmp)}!`);
                    mpickobj(mtmp, otmp); /* may free otmp */
                    /* Implies seduction, "you gladly hand over ..."
                       so we don't set mavenge bit here. */
                    await monflee(mtmp, 0, false, false);
                    if (!await tele_restrict(mtmp))
                        await rloc(mtmp, RLOC_MSG);
                    break;
                }
            }
            break;
        }
    }
    return botm();

    function botm() {
        game.stealoid = game.stealmid = 0; /* in case only one has been reset so far */
        return 0;
    }
}
export { stealarm };

// C ref: steal.c somegold()
export function somegold(lmoney) {
    let igold = (lmoney >= LARGEST_INT) ? LARGEST_INT : lmoney;

    if (igold < 50)
        ; /* all gold */
    else if (igold < 100)
        igold = rn1(igold - 25 + 1, 25);
    else if (igold < 500)
        igold = rn1(igold - 50 + 1, 50);
    else if (igold < 1000)
        igold = rn1(igold - 100 + 1, 100);
    else if (igold < 5000)
        igold = rn1(igold - 500 + 1, 500);
    else if (igold < 10000)
        igold = rn1(igold - 1000 + 1, 1000);
    else
        igold = rn1(igold - 5000 + 1, 5000);

    return igold;
}

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
        if (obj === g.uskin) {
            impossible("Removing embedded scales?");
            await skinback(true); /* uarm = uskin; uskin = 0; */
        }
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
        await Ring_gone_st(obj);
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
            await unpunish();
    } else if (obj.owornmask) {
        /* catchall */
        setnotworn(obj);
    }

    obj.in_use = oldinuse;
}

// C ref: steal.c worn_item_removal()
/* during theft of a worn item: remove_worn_item(), prefaced by a message */
async function worn_item_removal(mon, obj) {
    let objbuf, p;
    let verb;
    let strip_art;

    objbuf = doname(obj);
    /* massage the object description */
    strip_art = objbuf.startsWith("the ") ? 4
                : objbuf.startsWith("an ") ? 3
                  : objbuf.startsWith("a ") ? 2
                    : 0;
    if (strip_art) { /* convert "a/an/the <object>" to "your object" */
        const article = objbuf.slice(0, strip_art);
        /* when removing attached iron ball, caller passes 'uchain';
           when formatted, it will be "an iron chain (attached to you)";
           change "an" to "the" rather than to "your" in that situation */
        objbuf = strsubst(objbuf, article, (obj === game.uchain) ? "the " : "your ");
    }
    /* these ought to be guarded against matching user-supplied name */
    objbuf = strsubst(objbuf, " (being worn)", "");
    objbuf = strsubst(objbuf, " (alternate weapon; not wielded)", "");
    /* convert "ring (on left hand)" to "ring (from left hand)" */
    if ((p = strstri(objbuf, " (on ")) >= 0
        && (objbuf.startsWith("left ", p + 5) || objbuf.startsWith("right ", p + 5)))
        objbuf = objbuf.slice(0, p + 2) + strsubst(objbuf.slice(p + 2), "on", "from");

    /* slightly iffy for alternate weapon that isn't actively dual-wielded,
       but it's better to alert the player to the change in equipment than
       to suppress the message for that case */
    verb = ((obj.owornmask & W_WEAPONS) !== 0) ? "disarms"
           : ((obj.owornmask & W_ACCESSORY) !== 0) ? "removes"
             : "takes off";
    await pline(`${Some_Monnam(mon)} ${verb} ${objbuf}.`);
    game.iflags.last_msg = PLNMSG_MON_TAKES_OFF_ITEM;
    /* removal might trigger more messages (due to loss of Lev|Fly;
       descending happens before the theft in progress finishes) */
    await remove_worn_item(obj, true);
}

// C ref: steal.c steal()
/* Returns 1 when something was stolen (or at least, when N should flee now),
 * returns -1 if the monster died in the attempt.
 * Avoid stealing the object 'stealoid'.
 * Nymphs and monkeys won't steal coins (so that their "steal item" attack
 * doesn't become a superset of leprechaun's "steal gold" attack).
 * objnambuf: { buf } receives yname() of the stolen object, or ''.
 */
export async function steal(mtmp, objnambuf) {
    const u = game.u;
    let otmp;
    let Monnambuf;
    let tmp, could_petrify, armordelay, olddelay, icnt,
        named = 0, retrycnt = 0;
    const monkey_business = is_animal(mtmp.data),
          seen = canspotmon(mtmp),
          was_punished = Punished();
    let was_doffing;

    if (objnambuf)
        objnambuf.buf = '';
    /* the following is true if successful on first of two attacks. */
    if (!monnear(mtmp, u.ux, u.uy))
        return 0;

    /* stealing a worn item might drop hero into water or lava where
       teleporting to safety could result in a previously visible thief
       no longer being visible; it could also be a case of a blinded
       hero being able to see via wearing the Eyes of the Overworld and
       having those stolen; remember the name as it is now; if unseen,
       nymphs will be "Someone" and monkeys will be "Something" */
    Monnambuf = Some_Monnam(mtmp);

    /* food being eaten might already be used up but will not have
       been removed from inventory yet; we don't want to steal that,
       so this will cause it to be removed now */
    if (game.occupation)
        await maybe_finished_meal(false);

    /* the C goto targets nothing_to_steal and cant_take are the code
       after these labelled blocks, so their rolls stay in steal() */
    cant_take: {
        nothing_to_steal: {
            icnt = inv_cnt(false); /* don't include gold */
            if (!icnt || (icnt === 1 && game.uskin))
                /* Not even a thousand men in armor can strip a naked man. */
                break nothing_to_steal;

            let gotobj = false;
            if (monkey_business || game.uarmg) {
                ; /* skip ring special cases */
            } else if (Adornment() & LEFT_RING) {
                otmp = game.uleft;
                gotobj = true;
            } else if (Adornment() & RIGHT_RING) {
                otmp = game.uright;
                gotobj = true;
            }

            for (;;) { /* retry: */
                if (!gotobj) {
                    tmp = 0;
                    for (otmp = game.invent; otmp; otmp = otmp.nobj)
                        if ((!game.uarm || otmp !== game.uarmc) && otmp !== game.uskin
                            && otmp.oclass !== O.COIN_CLASS)
                            tmp += (otmp.owornmask & (W_ARMOR | W_ACCESSORY)) ? 5 : 1;
                    if (!tmp)
                        break nothing_to_steal;
                    tmp = rn2(tmp);
                    for (otmp = game.invent; otmp; otmp = otmp.nobj)
                        if ((!game.uarm || otmp !== game.uarmc) && otmp !== game.uskin
                            && otmp.oclass !== O.COIN_CLASS) {
                            tmp -= (otmp.owornmask & (W_ARMOR | W_ACCESSORY)) ? 5 : 1;
                            if (tmp < 0)
                                break;
                        }
                    if (!otmp) {
                        /* impossible("Steal fails!") */
                        return 0;
                    }
                    /* can't steal ring(s) while wearing gloves */
                    if ((otmp === game.uleft || otmp === game.uright) && game.uarmg)
                        otmp = game.uarmg;
                    /* can't steal gloves while wielding - so steal the wielded item. */
                    if (otmp === game.uarmg && game.uwep)
                        otmp = game.uwep;
                    /* can't steal armor while wearing cloak - so steal the cloak. */
                    else if (otmp === game.uarm && game.uarmc)
                        otmp = game.uarmc;
                    /* can't steal shirt while wearing cloak or suit */
                    else if (otmp === game.uarmu && game.uarmc)
                        otmp = game.uarmc;
                    else if (otmp === game.uarmu && game.uarm)
                        otmp = game.uarm;
                }
                gotobj = false;

                /* gotobj: */
                if (otmp.o_id === game.stealoid)
                    return 0;

                if (otmp.otyp === O.BOULDER && !throws_rocks(mtmp.data)) {
                    if (!retrycnt++)
                        continue; /* goto retry */
                    break cant_take;
                }
                break;
            }
            /* animals can't overcome curse stickiness nor unlock chains */
            if (monkey_business) {
                let ostuck;

                /* is the player prevented from voluntarily giving up this item?
                   (ignores loadstones; the !can_carry() check will catch those) */
                if (otmp === game.uball)
                    ostuck = true; /* effectively worn; curse is implicit */
                else if (otmp === game.uquiver || (otmp === game.uswapwep && !u.twoweap))
                    ostuck = false; /* not really worn; curse doesn't matter */
                else
                    ostuck = ((otmp.cursed && otmp.owornmask)
                              /* nymphs can steal rings from under
                                 cursed weapon but animals can't */
                              || (otmp === RING_ON_PRIMARY() && welded(game.uwep))
                              || (otmp === RING_ON_SECONDARY() && welded(game.uwep)
                                  && bimanual(game.uwep)));

                if (ostuck || can_carry(mtmp, otmp) === 0)
                    break cant_take;
            }

            if (otmp.otyp === O.LEASH && otmp.leashmon) {
                if (monkey_business && otmp.cursed)
                    break cant_take;
                throw new Error('steal(): o_unleash() not ported yet');
            }

            was_doffing = doffing(otmp);
            /* stop donning/doffing now so that afternmv won't be clobbered
               below; stop_occupation doesn't handle donning/doffing */
            olddelay = await stop_donning(otmp);
            /* you're going to notice the theft... */
            await stop_occupation();

            if (otmp.owornmask & (W_ARMOR | W_ACCESSORY)) {
                switch (otmp.oclass) {
                case O.TOOL_CLASS:
                case O.AMULET_CLASS:
                case O.RING_CLASS:
                case O.FOOD_CLASS: /* meat ring */
                    await worn_item_removal(mtmp, otmp);
                    break;
                case O.ARMOR_CLASS:
                    armordelay = O.objects[otmp.otyp].oc_delay;
                    if (olddelay > 0 && olddelay < armordelay)
                        armordelay = olddelay;
                    if (monkey_business || unresponsive()) {
                        /* animals usually don't have enough patience to take off
                           items which require extra time; unconscious or paralyzed
                           hero can't be charmed into taking off his own armor */
                        if (armordelay >= 1 && !olddelay && rn2(10))
                            break cant_take;
                        await worn_item_removal(mtmp, otmp);
                        break;
                    } else {
                        const curssv = otmp.cursed;
                        let slowly;

                        otmp.cursed = 0;
                        slowly = (armordelay >= 1 || game.multi < 0);
                        if (game.flags.female)
                            await urgent_pline(`${!seen ? "She" : Monnambuf} charms you.  You gladly ${
                                curssv ? "let her take"
                                : !slowly ? "hand over"
                                  : was_doffing ? "continue removing"
                                    : "start removing"} your ${armor_simple_name(otmp)}.`);
                        else
                            await urgent_pline(`${!seen ? "She" : Adjmonnam(mtmp, "beautiful")} seduces you and ${
                                curssv ? "helps you to take"
                                : !slowly ? "you take"
                                  : was_doffing ? "you continue taking"
                                    : "you start taking"} off your ${armor_simple_name(otmp)}.`);
                        named++;
                        /* the following is to set multi for later on */
                        nomul(-armordelay);
                        game.multi_reason = "taking off clothes";
                        game.nomovemsg = null;
                        await remove_worn_item(otmp, true);
                        otmp.cursed = curssv;
                        if (game.multi < 0) {
                            game.stealoid = otmp.o_id;
                            game.stealmid = mtmp.m_id;
                            game.afternmv = stealarm;
                            return 0;
                        }
                    }
                    break;
                default:
                    /* impossible("Tried to steal a strange worn thing. [%d]") */
                    break;
                }
                /* hero's blindfold might have just been stolen; if so, replace
                   cached "Someone" or "Something" with Monnam */
                if (!seen && canspotmon(mtmp))
                    Monnambuf = Monnam(mtmp);
            } else if (otmp.owornmask) { /* weapon or ball&chain */
                let item = otmp;

                if (otmp === game.uball) /* non-Null uball implies non-Null uchain */
                    item = game.uchain; /* yields a more accurate 'takes off' message */
                await worn_item_removal(mtmp, item);
                /* if we switched from uball to uchain for the preface message,
                   then unpunish() took place and both those pointers are now Null,
                   with 'item' a stale pointer to freed chain; the ball is still
                   present though and 'otmp' is still valid; if uball was also
                   wielded or quivered, the corresponding weapon pointer hasn't
                   been cleared yet; do that, with no preface message this time */
                if ((otmp.owornmask & W_WEAPONS) !== 0)
                    await remove_worn_item(otmp, false);
            }

            /* do this before removing it from inventory */
            if (objnambuf)
                objnambuf.buf = yname(otmp);
            /* usually set mavenge bit so knights won't suffer an alignment penalty
               during retaliation; not applicable for removing attached iron ball */
            if (!Conflict() && !(was_punished && !Punished()))
                mtmp.mavenge = 1;

            if (otmp.unpaid)
                subfrombill(otmp, ushops_keeper());
            freeinv(otmp);

            /* if we just gave a message about removing a worn item and there have
               been no intervening messages, shorten '<mon> stole <item>' message */
            if (game.iflags.last_msg === PLNMSG_MON_TAKES_OFF_ITEM
                && mtmp.data.mlet === M.S_NYMPH)
                ++named;
            await urgent_pline(`${named ? "She" : Monnambuf} stole ${doname(otmp)}.`);
            await encumber_msg();
            could_petrify = (otmp.otyp === O.CORPSE
                             && touch_petrifies(mons[otmp.corpsenm]));
            otmp.how_lost = LOST_STOLEN;
            mpickobj(mtmp, otmp); /* may free otmp */
            if (could_petrify && !((mtmp.misc_worn_check || 0) & W_ARMG)) {
                await minstapetrify(mtmp, true);
                return -1;
            }
            return (game.multi < 0) ? 0 : 1;
        }
        /* nothing_to_steal: */
        /* nymphs might target uchain if invent is empty; monkeys won't;
           hero becomes unpunished but nymph ends up empty handed */
        if (Punished() && !monkey_business && rn2(4)) {
            /* uball is not carried (uchain never is) */
            await worn_item_removal(mtmp, game.uchain);
        } else if (u.utrap && u.utraptype === TT_BURIEDBALL
                   && !monkey_business && !rn2(4)) {
            /* buried ball is not tracked via 'uball' and there is no chain
               at all (hence no uchain to take off) */
            await pline(`${Monnambuf} takes off your unseen chain.`);
            const dummy = { v: false };
            await openholdingtrap(game.youmonst, dummy);
        } else if (Blind()) {
            await pline("Somebody tries to rob you, but finds nothing to steal.");
        } else if (inv_cnt(true) > inv_cnt(false)) {
            await pline(`${Monnambuf} tries to rob you, but isn't interested in gold.`);
        } else {
            await pline(`${Monnambuf} tries to rob you, but there is nothing to steal!`);
        }
        return 1; /* let her flee */
    }
    /* cant_take: */
    const how = [ "steal", "snatch", "grab", "take" ];
    await pline(`${Monnambuf} tries to ${ROLL_FROM(how)} ${
        (otmp.owornmask & W_ARMOR) ? "your " : ""}${
        (otmp.owornmask & W_ARMOR) ? armor_simple_name(otmp) : yname(otmp)} but gives up.`);
    /* the fewer items you have, the less likely the thief
       is going to stick around to try again (0) instead of
       running away (1) */
    return !rn2(Math.trunc(inv_cnt(false) / 5) + 2) ? 1 : 0;
}

// C ref: steal.c stealamulet()
/* called for AD_SAMU (the Wizard and quest nemeses) */
export async function stealamulet(mtmp) {
    const u = game.u;
    let buf;
    let otmp = null, obj = null;
    let real = 0, fake = 0, n;

    /* target every quest artifact, not just current role's;
       if hero has more than one, choose randomly so that player
       can't use inventory ordering to influence the theft */
    for (n = 0, obj = game.invent; obj; obj = obj.nobj)
        if (any_quest_artifact(obj))
            ++n, otmp = obj;
    if (n > 1) {
        n = rnd(n);
        for (otmp = game.invent; otmp; otmp = otmp.nobj)
            if (any_quest_artifact(otmp) && !--n)
                break;
    }

    if (!otmp) {
        /* if we didn't find any quest artifact, find another valuable item */
        if (u.uhave.amulet) {
            real = O.AMULET_OF_YENDOR;
            fake = O.FAKE_AMULET_OF_YENDOR;
        } else if (u.uhave.bell) {
            real = O.BELL_OF_OPENING;
            fake = O.BELL;
        } else if (u.uhave.book) {
            real = O.SPE_BOOK_OF_THE_DEAD;
        } else if (u.uhave.menorah) {
            real = O.CANDELABRUM_OF_INVOCATION;
        } else
            return; /* you have nothing of special interest */

        /* If we get here, real and fake have been set up. */
        for (n = 0, obj = game.invent; obj; obj = obj.nobj)
            if (obj.otyp === real || (obj.otyp === fake && !mtmp.iswiz))
                ++n, otmp = obj;
        if (n > 1) {
            n = rnd(n);
            for (otmp = game.invent; otmp; otmp = otmp.nobj)
                if ((otmp.otyp === real
                     || (otmp.otyp === fake && !mtmp.iswiz)) && !--n)
                    break;
        }
    }

    if (otmp) { /* we have something to snatch */
        /* take off outer gear if we're targeting [hypothetical]
           quest artifact suit, shirt, gloves, or rings */
        if ((otmp === game.uarm || otmp === game.uarmu) && game.uarmc)
            await worn_item_removal(mtmp, game.uarmc);
        if (otmp === game.uarmu && game.uarm)
            await worn_item_removal(mtmp, game.uarm);
        if ((otmp === game.uarmg || ((otmp === game.uright || otmp === game.uleft)
                                     && game.uarmg))
            && game.uwep) {
            /* gloves are about to be unworn; unwield weapon(s) first */
            if (u.twoweap)    /* remove_worn_item(uswapwep) indirectly */
                await worn_item_removal(mtmp, game.uswapwep); /* clears u.twoweap */
            await worn_item_removal(mtmp, game.uwep);
        }
        if ((otmp === game.uright || otmp === game.uleft) && game.uarmg)
            /* calls Gloves_off() to handle wielded cockatrice corpse */
            await worn_item_removal(mtmp, game.uarmg);

        /* finally, steal the target item */
        if (otmp.owornmask)
            await worn_item_removal(mtmp, otmp);
        if (otmp.unpaid)
            subfrombill(otmp, ushops_keeper());
        freeinv(otmp);
        buf = doname(otmp);
        mpickobj(mtmp, otmp); /* could merge and free otmp but won't */
        await pline(`${Some_Monnam(mtmp)} steals ${buf}!`);
        if (can_teleport(mtmp.data) && !await tele_restrict(mtmp))
            await rloc(mtmp, RLOC_MSG);
        await encumber_msg();
    }
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
    if (otmp.unpaid || (otmp.cobj && otmp.cobj.length /* Has_contents() */
                        && count_unpaid(otmp.cobj))) {
        subfrombill(otmp, find_objowner(otmp, otmp.ox, otmp.oy));
    }
    /* don't want hidden light source inside the monster; assumes that
       engulfers won't have external inventories; whirly monsters cause
       the light to be extinguished rather than letting it shine through */
    let snuff_otmp = false;
    if (obj_sheds_light(otmp) && mtmp.data.mattk.some(a => a.aatyp === AT_ENGL)) { /* attacktype() */
        /* this is probably a burning object that you dropped or threw */
        if (engulfing_u(mtmp) && !Blind()) /* mpickobj() is synchronous */
            throw new Error('mpickobj(): "<obj> goes out." message in a synchronous caller not ported yet');
        snuff_otmp = true;
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
    /* and we had to defer this until object is in mtmp's inventory */
    if (snuff_otmp)
        snuff_light_source(mtmp.mx, mtmp.my);
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
    for (const msg of extract_from_minvent_g(mon, obj, do_extrinsics, silently))
        throw new Error(`extract_from_minvent(): update_mon_extrinsics() message in a synchronous caller not ported yet: ${msg}`);
}
/* the body of extract_from_minvent(); yields update_mon_extrinsics()'s
   messages */
export function* extract_from_minvent_g(mon, obj, do_extrinsics, silently) {
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
    if ((unwornmask & W_ARM) !== 0 && obj.lamplit && artifact_light(obj))
        end_burn(obj, false);

    obj_extract_self(obj);
    obj.owornmask = 0;
    if (unwornmask) {
        if (!(mon.mhp < 1) && do_extrinsics) /* !DEADMONSTER(mon) */
            yield* update_mon_extrinsics_g(mon, obj, false, silently);
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
        && !obj.unpaid && costly_spot(omx, omy)
        /* being at costly_spot guarantees lev->roomno is not 0 */
        && in_rooms(game.u.ux, game.u.uy, SHOPBASE)
               .includes(String.fromCharCode(game.level.at(omx, omy).roomno))) {
        obj.no_charge = 1;
    }
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
