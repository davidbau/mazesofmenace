// steal.js — C ref: src/steal.c.
//
// A monster taking things off the hero.  The entry point is steal(), reached
// from uhitm.c mhitm_ad_sedu() when a nymph / succubus / monkey lands its
// AD_SITM or AD_SEDU attack (js/monmove.js mhitm_ad_sedu).  The two other
// steal.c routines that this port already had — relobj() (death drops) and
// mdrop_obj() — live in js/uhitm.js and js/dogmove.js next to their callers.
//
// RNG shape of the covered path (a nymph stealing a worn ring):
//   steal(): rn2(weighted inventory total)      [which item]
//   -> worn_item_removal() -> remove_worn_item()   [no RNG]
//   -> "<Mon> stole <item>."                       [no RNG]
// and then, back in mhitm_ad_sedu(), rloc(mtmp, RLOC_MSG) picks the escape
// square with its own rnd(COLNO-1)/rn2(ROWNO) pairs (js/teleport.js).

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { dist2 } from './hacklib.js';
import { objects, BOULDER, CORPSE, COIN_CLASS, ARMOR_CLASS, RING_CLASS,
    AMULET_CLASS, TOOL_CLASS, FOOD_CLASS } from './mkobj.js';
import { PLNMSG_MON_TAKES_OFF_ITEM } from './const.js';
import { update_topl } from './display.js';
import { Blind } from './vision.js';
import { canspotmon, Monnam } from './uhitm.js';
import { is_animal, humanoid, throws_rocks_flag } from './monflags_data.js';
import {
    inv_cnt, freeinv, encumber_msg, doname_invent, remove_worn_item,
    worn_item_removal, oc_delay, W_ARMOR_WORN, W_ACCESSORY_WORN,
} from './invent.js';

// C ref: monsym.h S_NYMPH — the class whose "<Mon> takes off ..." preface makes
// the follow-up theft message use "She" instead of repeating the name.
const S_NYMPH_MCLS = 12;
// C ref: obj.h how_lost values.
const LOST_NONE = 0, LOST_STOLEN = 2;

// C ref: mon.c monnear(mon, x, y) — is the monster close enough to attack?
// (The NODIAG grid-bug refinement doesn't matter for a thief.)
function monnear(mon, x, y) { return dist2(mon.mx, mon.my, x, y) < 3; }

// C ref: do_name.c some_mon_nam()/Some_Monnam() — like Monnam(), but an unseen
// thief is "Someone" (humanoid) or "Something" rather than "It".
export function Some_Monnam(mtmp) {
    if (!canspotmon(mtmp)) return humanoid(mtmp?.data) ? 'Someone' : 'Something';
    return Monnam(mtmp);
}

// C ref: steal.c somegold(lmoney) — the proportional slice of the hero's purse
// a leprechaun grabs.
export function somegold(lmoney) {
    const LARGEST_INT = 32767;
    let igold = (lmoney >= LARGEST_INT) ? LARGEST_INT : (lmoney | 0);
    if (igold < 50) { /* all gold */ }
    else if (igold < 100) igold = rn1(igold - 25 + 1, 25);
    else if (igold < 500) igold = rn1(igold - 50 + 1, 50);
    else if (igold < 1000) igold = rn1(igold - 100 + 1, 100);
    else if (igold < 5000) igold = rn1(igold - 500 + 1, 500);
    else if (igold < 10000) igold = rn1(igold - 1000 + 1, 1000);
    else igold = rn1(igold - 5000 + 1, 5000);
    return igold;
}
// C ref: rnd.c rn1(x, y) = rn2(x) + y.
function rn1(x, y) { return rn2(x) + y; }

// C ref: steal.c findgold(chain) — first gold object in an object chain.
export function findgold(chain) {
    for (const o of (chain || [])) if (o.oclass === COIN_CLASS) return o;
    return null;
}

// C ref: steal.c unresponsive() — can the hero be charmed into disrobing?  A
// helpless (unconscious / fainted / frozen / paralyzed) hero cannot.
function unresponsive() {
    if ((game.multi ?? 0) >= 0) return false;
    const why = game.multi_reason || '';
    return why.startsWith('frozen') || why.startsWith('paralyzed');
}

// C ref: do_wear.c doffing(obj) / stop_donning(obj) — is a multi-turn dressing
// maneuver in progress on this very object, and if so cancel it and report the
// delay that was still outstanding.  This port drives delayed donning through
// invent.js start_occupation() rather than C's afternmv hook and no covered
// session is mid-maneuver when a thief strikes, so both report "not donning".
function doffing(_obj) { return false; }
function stop_donning(_obj) { return 0; }

// C ref: cmd.c stop_occupation() — "you're going to notice the theft".  This
// port has no single go.occupation slot (each multi-turn activity carries its
// own flag in allmain.js); nothing is occupying the hero on the turns a thief
// reaches steal() in the covered sessions, so there is nothing to interrupt.
function stop_occupation() { /* no occupation to stop */ }

// C ref: hack.c nomul(nval) — make the hero busy for |nval| turns.
function nomul(nval) {
    if ((game.multi ?? 0) < nval) return;
    game.multi = nval;
}

// C ref: steal.c mpickobj(mtmp, otmp) — put a just-taken object into the
// monster's inventory.  Returns 1 if otmp was freed by a merge.  No RNG.
export function mpickobj(mtmp, otmp) {
    if (!otmp) return 1;
    // uball/uchain, gt.thrownobj/gk.kickedobj and the shop-bill and
    // light-source cases are all inert for the thefts these sessions see.
    otmp.no_charge = 0;
    if (!mtmp.mtame) {
        // unknow_object() when the thief can't be seen: the covered thefts are
        // all in plain sight, so the hero's knowledge of the item survives.
        if (otmp.how_lost === LOST_THROWN) otmp.how_lost = LOST_STOLEN;
        else if (otmp.how_lost === LOST_DROPPED) otmp.how_lost = LOST_NONE;
    }
    // add_to_minv(): merge with an identical stack already carried, else append.
    mtmp.minvent = mtmp.minvent || [];
    for (const o of mtmp.minvent) {
        if (mergable(o, otmp)) {
            o.quan = (o.quan || 1) + (otmp.quan || 1);
            return 1;                                  /* otmp was freed */
        }
    }
    otmp.where = 'minvent';
    otmp.ocarry = mtmp;
    mtmp.minvent.push(otmp);
    return 0;
}
// C ref: obj.h how_lost values used by mpickobj's autopickup bookkeeping.
const LOST_THROWN = 1, LOST_DROPPED = 3;

// C ref: mkobj.c mergable(otmp, obj) — reduced to the identity tests that
// matter for a stolen item: same type/enchantment/BUC, and only for the classes
// that actually stack (a corpse never merges; armor/rings/amulets/tools are
// one-per-object).  A wrong "yes" here would silently destroy the theft, so the
// test is deliberately conservative.
function mergable(o, otmp) {
    if (o.otyp !== otmp.otyp || o.oclass !== otmp.oclass) return false;
    if (o.oclass === ARMOR_CLASS || o.oclass === RING_CLASS
        || o.oclass === AMULET_CLASS || o.oclass === TOOL_CLASS
        || o.otyp === CORPSE) return false;
    return (o.spe | 0) === (otmp.spe | 0)
        && !!o.cursed === !!otmp.cursed && !!o.blessed === !!otmp.blessed;
}

// C ref: steal.c steal(mtmp, objnambuf) — a monster steals one item from the
// hero.  Returns 1 when something was taken (or at least when the thief should
// flee now), 0 when nothing happened, -1 if the thief died in the attempt.
// `objnambuf` is an out-parameter object ({ value: '' }) mirroring C's char
// buffer; only the monkey-flees message reads it.
export async function steal(mtmp, objnambuf) {
    const u = game.u;
    const invent = game.invent || [];
    let otmp = null;
    let named = 0, retrycnt = 0;
    const monkey_business = is_animal(mtmp.data);
    const seen = canspotmon(mtmp);
    // Punished (ball & chain) never applies to the covered heroes.
    const was_punished = false;

    if (objnambuf) objnambuf.value = '';
    /* true if successful on first of two attacks */
    if (!monnear(mtmp, u.ux, u.uy)) return 0;

    let Monnambuf = Some_Monnam(mtmp);

    // go.occupation -> maybe_finished_meal(FALSE): removes a just-finished
    // meal from inventory so it can't be stolen.  Nothing is being eaten on
    // the turns a thief strikes in the covered sessions.

    const nothing_to_steal = async () => {
        // The Punished / buried-ball branches need a ball & chain, which the
        // covered heroes never carry.
        if (Blind()) {
            await update_topl('Somebody tries to rob you, but finds nothing to steal.');
        } else if (inv_cnt(true) > inv_cnt(false)) {
            await update_topl(`${Monnambuf} tries to rob you, but isn't interested in gold.`);
        } else {
            await update_topl(`${Monnambuf} tries to rob you, but there is nothing to steal!`);
        }
        return 1; /* let her flee */
    };

    const icnt = inv_cnt(false); /* don't include gold */
    if (!icnt) return await nothing_to_steal();

    // "Skip ring special cases" for an animal or a gloved hero; otherwise a
    // worn ring of adornment is grabbed first, with no random selection.
    let gotobj = false;
    if (monkey_business || game.uarmg) {
        /* skip ring special cases */
    } else if (game.uleft && game.uleft.otyp === RIN_ADORNMENT) {
        otmp = game.uleft; gotobj = true;
    } else if (game.uright && game.uright.otyp === RIN_ADORNMENT) {
        otmp = game.uright; gotobj = true;
    }

    // C's `goto retry` (a boulder that can't be taken) re-runs the weighted
    // pick once; `goto cant_take` is the animal give-up message.
    const cant_take = async () => {
        const how = ['steal', 'snatch', 'grab', 'take'];
        const verb = how[rn2(how.length)];   /* ROLL_FROM(how) */
        const worn = (otmp.owornmask || 0) & W_ARMOR_WORN;
        await update_topl(`${Monnambuf} tries to ${verb} `
            + `${worn ? 'your ' : ''}${worn ? armor_simple_name(otmp) : yname(otmp)}`
            + ' but gives up.');
        /* the fewer items you have, the less likely the thief sticks around */
        return rn2(Math.floor(inv_cnt(false) / 5) + 2) ? 0 : 1;
    };

    while (!gotobj) {
        let tmp = 0;
        for (const o of invent)
            if ((!game.uarm || o !== game.uarmc) && o.oclass !== COIN_CLASS)
                tmp += ((o.owornmask || 0) & (W_ARMOR_WORN | W_ACCESSORY_WORN)) ? 5 : 1;
        if (!tmp) return await nothing_to_steal();
        tmp = rn2(tmp);
        otmp = null;
        for (const o of invent) {
            if ((!game.uarm || o !== game.uarmc) && o.oclass !== COIN_CLASS) {
                tmp -= ((o.owornmask || 0) & (W_ARMOR_WORN | W_ACCESSORY_WORN)) ? 5 : 1;
                if (tmp < 0) { otmp = o; break; }
            }
        }
        if (!otmp) return 0;                     /* impossible("Steal fails!") */

        /* can't steal ring(s) while wearing gloves */
        if ((otmp === game.uleft || otmp === game.uright) && game.uarmg)
            otmp = game.uarmg;
        /* can't steal gloves while wielding - so steal the wielded item */
        if (otmp === game.uarmg && game.uwep) otmp = game.uwep;
        /* can't steal armor while wearing cloak - so steal the cloak */
        else if (otmp === game.uarm && game.uarmc) otmp = game.uarmc;
        /* can't steal shirt while wearing cloak or suit */
        else if (otmp === game.uarmu && game.uarmc) otmp = game.uarmc;
        else if (otmp === game.uarmu && game.uarm) otmp = game.uarm;

        if (otmp.otyp === BOULDER && !throws_rocks_flag(mtmp.data)) {
            if (!retrycnt++) continue;           /* goto retry */
            return await cant_take();
        }
        break;
    }

    if (otmp.o_id === game.stealoid) return 0;

    /* animals can't overcome curse stickiness nor unlock chains */
    if (monkey_business) {
        const ostuck = ((otmp.cursed && otmp.owornmask)
            || (otmp === game.uright && welded(game.uwep))
            || (otmp === game.uleft && welded(game.uwep) && bimanual(game.uwep)));
        if (ostuck || !can_carry(mtmp, otmp)) return await cant_take();
    }

    // A leashed leash is unleashed first; no leash is ever in use here.

    const was_doffing = doffing(otmp);
    /* stop donning/doffing now so that afternmv won't be clobbered below */
    const olddelay = stop_donning(otmp);
    /* you're going to notice the theft... */
    stop_occupation();

    if ((otmp.owornmask || 0) & (W_ARMOR_WORN | W_ACCESSORY_WORN)) {
        switch (otmp.oclass) {
        case TOOL_CLASS:
        case AMULET_CLASS:
        case RING_CLASS:
        case FOOD_CLASS: /* meat ring */
            await worn_item_removal(mtmp, otmp);
            break;
        case ARMOR_CLASS: {
            let armordelay = oc_delay(otmp.otyp);
            if (olddelay > 0 && olddelay < armordelay) armordelay = olddelay;
            if (monkey_business || unresponsive()) {
                /* animals usually lack the patience for a slow removal, and a
                   helpless hero can't be charmed into disrobing */
                if (armordelay >= 1 && !olddelay && rn2(10)) return await cant_take();
                await worn_item_removal(mtmp, otmp);
                break;
            } else {
                const curssv = otmp.cursed;
                otmp.cursed = 0;
                const slowly = (armordelay >= 1 || (game.multi ?? 0) < 0);
                if (game.flags?.female) {
                    await update_topl(`${!seen ? 'She' : Monnambuf} charms you.  You gladly `
                        + `${curssv ? 'let her take'
                            : !slowly ? 'hand over'
                                : was_doffing ? 'continue removing' : 'start removing'} `
                        + `your ${armor_simple_name(otmp)}.`);
                } else {
                    await update_topl(`${!seen ? 'She' : Adjmonnam(mtmp, 'beautiful')} seduces you and `
                        + `${curssv ? 'helps you to take'
                            : !slowly ? 'you take'
                                : was_doffing ? 'you continue taking' : 'you start taking'} `
                        + `off your ${armor_simple_name(otmp)}.`);
                }
                named++;
                /* set multi for later on */
                nomul(-armordelay);
                game.multi_reason = 'taking off clothes';
                await remove_worn_item(otmp, true);
                otmp.cursed = curssv;
                if ((game.multi ?? 0) < 0) {
                    // The hero keeps taking the piece off over the next turns;
                    // stealarm() finishes the theft via the afternmv hook, which
                    // this port doesn't carry.  Record the pending theft so the
                    // item can't be stolen twice and stop here, exactly as C's
                    // `return 0` does for this turn.
                    game.stealoid = otmp.o_id;
                    game.stealmid = mtmp.m_id;
                    return 0;
                }
            }
            break;
        }
        default:
            break; /* impossible("Tried to steal a strange worn thing.") */
        }
        /* the blindfold might have just been stolen; refresh the cached name */
        if (!seen && canspotmon(mtmp)) Monnambuf = Monnam(mtmp);
    } else if (otmp.owornmask) { /* weapon (ball & chain never applies here) */
        await worn_item_removal(mtmp, otmp);
    }

    /* do this before removing it from inventory */
    if (objnambuf) objnambuf.value = yname(otmp);
    /* set mavenge so knights don't suffer an alignment penalty in retaliation */
    if (!was_punished) mtmp.mavenge = 1;    /* !Conflict: never in these sessions */

    freeinv(otmp);

    /* if we just gave a "<mon> takes off ..." message with nothing in between,
       shorten the '<mon> stole <item>' message to "She stole ..." */
    if (game.last_msg === PLNMSG_MON_TAKES_OFF_ITEM
        && mtmp.data?.mcls === S_NYMPH_MCLS)
        ++named;
    await update_topl(`${named ? 'She' : Monnambuf} stole ${doname_invent(otmp)}.`);
    await encumber_msg();
    // could_petrify (a cockatrice corpse) needs a corpse in inventory.
    otmp.how_lost = LOST_STOLEN;
    mpickobj(mtmp, otmp);
    return ((game.multi ?? 0) < 0) ? 0 : 1;
}

// C ref: onames.h RIN_ADORNMENT — the ring a thief grabs before rolling.
const RIN_ADORNMENT = 173;

// C ref: do_wear.c armor_simple_name(obj) — "suit"/"cloak"/"helmet"/"shield"/
// "gloves"/"boots"/"shirt" for the take-off messages.
function armor_simple_name(obj) {
    const name = objects[obj.otyp]?.name || 'armor';
    if (/shield/.test(name)) return 'shield';
    if (/helm|hat|cap|pot/.test(name)) return 'helmet';
    if (/gloves|gauntlets/.test(name)) return 'gloves';
    if (/boots|shoes/.test(name)) return 'boots';
    if (/cloak|robe/.test(name)) return 'cloak';
    if (/shirt/.test(name)) return 'shirt';
    return 'suit';
}

// C ref: do_name.c yname(obj) — "your <obj>" for a carried item.
function yname(obj) { return `your ${objects[obj.otyp]?.name || 'thing'}`; }

// C ref: do_name.c Adjmonnam(mtmp, adj) — "The beautiful nymph".  Only the
// male-hero seduction message uses it; the covered hero is female.
function Adjmonnam(mtmp, adj) {
    const s = Monnam(mtmp);
    return s.replace(/^The /, `The ${adj} `);
}

// C ref: wield.c welded(obj) / objects[].oc_bimanual — a cursed wielded weapon
// welds to the hand.  Only consulted on the animal-thief path.
function welded(obj) { return !!obj && obj === game.uwep && !!obj.cursed; }
// C ref: objclass.h bimanual(otmp) — objects[].oc_bimanual.  Only reached on
// the animal-thief path, which no covered session exercises.
function bimanual(_obj) { return false; }

// C ref: mon.c can_carry(mtmp, otmp) — weight/loadstone/Amulet limits.  The
// monkey path is the only caller; the covered sessions have no monkeys.
function can_carry(_mtmp, _otmp) { return 1; }
