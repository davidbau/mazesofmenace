// steal.js: theft and monster-inventory release.
// C ref: src/steal.c

import { game } from './gstate.js';
import { cansee } from './vision.js';
import { doname, armor_simple_name, yname, simpleonames, Tobjnam, makeplural, otense } from './objnam.js';
import { Monnam, Some_Monnam, Adjmonnam, pmname, upstart } from './do_name.js';
import { pline_xy, You, impossible } from './pline.js';
import { newsym, pline, urgent_pline } from './display.js';
import { place_object, unknow_object, add_to_minv } from './mkobj.js';
import { freeinv, stackobj, obj_extract_self, carry_obj_effects, count_unpaid } from './invent.js';
import { flooreffects } from './do.js';
import { obj_sheds_light, snuff_light_source } from './light.js';
import { attacktype, is_animal, dmgtype, throws_rocks, touch_petrifies } from './mondata.js';
import { ATTKS, MONSYMS, MFLAGS } from './monst_data.js';
import { canseemon, canspotmon } from './display.js';
import { LOST_NONE, LOST_THROWN, LOST_DROPPED, LOST_STOLEN,
         W_ARMOR, W_ACCESSORY, W_WEAPONS,
         RLOC_MSG, Mgender, engulfing_u } from './const.js';
import { OCLASSES, ONAMES } from './objects_data.js';
import { droppables } from './dog.js';
import { costly_spot, subfrombill, shop_keeper, find_objowner } from './shk.js';
import { obj_resists } from './zap.js';
import { any_quest_artifact, is_quest_artifact } from './questpgr.js';
import { W_SADDLE } from './const.js';
import { rn2, rn1, rnd } from './rng.js';
import { setnotworn } from './worn.js';
import { stop_occupation } from './allmain.js';
import { encumber_msg } from './attrib.js';
import { donning, doffing, stop_donning, cancel_don, Armor_off, Cloak_off, Boots_off, Gloves_off, Helmet_off, Shield_off, Shirt_off, Amulet_off, Ring_gone, Blindf_off, worn } from './do_wear.js';
import { uwepgone, uswapwepgone, uqwepgone, welded } from './wield.js';
import { unpunish } from './read.js';
import { skinback, body_part } from './polyself.js';
import { setworn } from './worn.js';
import { W_AMUL, W_RING, W_TOOL, W_BALL, W_CHAIN, OBJ_DELETED, W_ARM, W_ARMC, W_ARMF, W_ARMG, W_ARMH, W_ARMS, W_ARMU } from './const.js';
import { LEFT_RING, RIGHT_RING, LEFT_HANDED, TT_BURIEDBALL,
         PLNMSG_MON_TAKES_OFF_ITEM } from './const.js';
import { Unaware, Blind } from './youprop.js';
import { inv_cnt, nomul } from './hack.js';
import { distu } from './hacklib.js';
import { maybe_finished_meal } from './eat.js';
import { can_carry } from './mon.js';
import { monnear, monflee } from './monmove.js';
import { tele_restrict, rloc } from './teleport.js';
import { DEADMONSTER } from './monst.js';
import { bimanual, Has_contents } from './obj.js';
import { o_unleash } from './apply.js';
import { openholdingtrap, minstapetrify } from './trap.js';
import { touch_artifact } from './artifact.js';
import { HAND, OBJ_INVENT } from './const.js';

// src/steal.c:120 thiefdead()
export function thiefdead() {
    game.stealmid = 0;
    if (game.afternmv === stealarm) {
        game.afternmv = unstolenarm;
        game.nomovemsg = null;
    }
}

// src/steal.c:133 unresponsive()
export function unresponsive() {
    if ((game.multi | 0) >= 0)
        return false;
    return Unaware() || !!(game.multi_reason
        && (game.multi_reason.startsWith('frozen')
            || game.multi_reason.startsWith('paralyzed')));
}

// src/steal.c:147 unstolenarm()
async function unstolenarm() {
    let obj;
    for (const candidate of game.invent || []) {
        if (candidate.o_id === game.stealoid) {
            obj = candidate;
            break;
        }
    }
    game.stealoid = 0;
    if (obj)
        await You(`finish taking off your ${armor_simple_name(obj)}.`);
    return 0;
}

// src/steal.c:165 stealarm()
async function stealarm() {
    botm: {
        if (!game.stealoid || !game.stealmid)
            break botm;
        for (const otmp of game.invent || []) {
            if (otmp.o_id === game.stealoid) {
                for (const mtmp of game.level.monsters) {
                    if (mtmp.m_id === game.stealmid) {
                        if (DEADMONSTER(mtmp)) {
                            await impossible('stealarm(): dead monster stealing');
                            break botm;
                        }
                        if (!dmgtype(mtmp.data, ATTKS.AD_SITM)
                            || distu(mtmp.mx, mtmp.my) > 2)
                            break botm;
                        if (otmp.unpaid)
                            subfrombill(otmp, shop_keeper(game.u.ushops?.[0]));
                        freeinv(otmp);
                        await pline(`${Monnam(mtmp)} steals ${doname(otmp)}!`);
                        await mpickobj(mtmp, otmp);
                        await monflee(mtmp, 0, false, false);
                        if (!await tele_restrict(mtmp))
                            await rloc(mtmp, RLOC_MSG);
                        break;
                    }
                }
                break;
            }
        }
    }
    game.stealoid = game.stealmid = 0;
    return 0;
}

// src/steal.c:213 remove_worn_item() — take a worn or wielded object out of
// its slot, running the slot's take-off side effects. unchain_ball says
// whether a ball or chain being removed unpunishes the hero.
export async function remove_worn_item(obj, unchain_ball) {
    const u = game.u;

    if (donning(obj))
        cancel_don();
    if (!obj.owornmask)
        return;

    const oldinuse = obj.in_use;
    obj.in_use = 1;
    if (obj.owornmask & W_ARMOR) {
        if (obj === u.uskin) {
            /* impossible("Removing embedded scales?") */
            await skinback(true); /* uarm = uskin; uskin = 0; */
        }
        if (obj === worn(W_ARM))
            await Armor_off();
        else if (obj === worn(W_ARMC))
            await Cloak_off(obj);
        else if (obj === worn(W_ARMF))
            await Boots_off(obj);
        else if (obj === worn(W_ARMG))
            await Gloves_off(obj);
        else if (obj === worn(W_ARMH))
            await Helmet_off(obj);
        else if (obj === worn(W_ARMS))
            await Shield_off();
        else if (obj === worn(W_ARMU))
            await Shirt_off();
        else
            setworn(null, obj.owornmask & W_ARMOR);
    } else if (obj.owornmask & W_AMUL) {
        await Amulet_off();
    } else if (obj.owornmask & W_RING) {
        await Ring_gone(obj);
    } else if (obj.owornmask & W_TOOL) {
        await Blindf_off(obj);
    } else if (obj.owornmask & W_WEAPONS) {
        if (obj === u.uwep)
            await uwepgone();
        if (obj === u.uswapwep)
            uswapwepgone();
        if (obj === u.uquiver)
            uqwepgone();
    }

    if (obj.owornmask & (W_BALL | W_CHAIN)) {
        if (unchain_ball)
            unpunish();
    } else if (obj.owornmask) {
        /* catchall */
        setnotworn(obj);
    }
    /* if (obj->where == OBJ_DELETED) debugpline1("remove_worn_item() \"%s\" deleted!", ...) */
    obj.in_use = oldinuse;
}

function note_unported_steal(what) {
    (game.unported ||= new Set()).add(what);
}

// src/steal.c:14 somegold() — choose the proportional amount used by theft
// and by a fountain taking part of the hero's money.
export function somegold(lmoney) {
    let gold = Math.min(lmoney, 0x7fffffff);

    if (gold < 50)
        return gold;
    if (gold < 100)
        return rn1(gold - 25 + 1, 25);
    if (gold < 500)
        return rn1(gold - 50 + 1, 50);
    if (gold < 1000)
        return rn1(gold - 100 + 1, 100);
    if (gold < 5000)
        return rn1(gold - 500 + 1, 500);
    if (gold < 10000)
        return rn1(gold - 1000 + 1, 1000);
    return rn1(gold - 5000 + 1, 5000);
}

// src/steal.c:294 worn_item_removal()
async function worn_item_removal(mon, obj) {
    let objbuf = doname(obj);
    objbuf = objbuf.replace(/^(?:the|an|a) /, obj === game.u.uchain ? 'the ' : 'your ');
    objbuf = objbuf.replace(' (being worn)', '')
                   .replace(' (alternate weapon; not wielded)', '');
    const p = objbuf.toLowerCase().indexOf(' (on ');
    if (p >= 0 && (objbuf.startsWith('left ', p + 5)
                   || objbuf.startsWith('right ', p + 5)))
        objbuf = objbuf.slice(0, p + 2) + objbuf.slice(p + 2).replace('on', 'from');
    const verb = (obj.owornmask & W_WEAPONS) ? 'disarms'
               : (obj.owornmask & W_ACCESSORY) ? 'removes' : 'takes off';
    await pline(`${Some_Monnam(mon)} ${verb} ${objbuf}.`);
    game.iflags.last_msg = PLNMSG_MON_TAKES_OFF_ITEM;
    await remove_worn_item(obj, true);
}

// src/steal.c:343 steal()
export async function steal(mtmp, objnambuf = null) {
    const u = game.u;
    let otmp = null, named = 0, retrycnt = 0;
    const monkey_business = is_animal(mtmp.data);
    const seen = canspotmon(mtmp);
    const was_punished = !!u.uball;

    if (objnambuf)
        objnambuf.value = '';
    if (!monnear(mtmp, u.ux, u.uy))
        return 0;
    let Monnambuf = Some_Monnam(mtmp);
    if (game.occupation)
        await maybe_finished_meal(false);

    // C's two shared goto targets retain the selected object and cached name.
    const nothing_to_steal = async () => {
        if (u.uball && !monkey_business && rn2(4)) {
            await worn_item_removal(mtmp, u.uchain);
        } else if (u.utrap && u.utraptype === TT_BURIEDBALL
                   && !monkey_business && !rn2(4)) {
            await pline(`${Monnambuf} takes off your unseen chain.`);
            await openholdingtrap(game.youmonst, { v: false });
        } else if (Blind()) {
            await pline('Somebody tries to rob you, but finds nothing to steal.');
        } else if (inv_cnt(true) > inv_cnt(false)) {
            await pline(`${Monnambuf} tries to rob you, but isn't interested in gold.`);
        } else {
            await pline(`${Monnambuf} tries to rob you, but there is nothing to steal!`);
        }
        return 1;
    };
    const cant_take = async () => {
        const how = ['steal', 'snatch', 'grab', 'take'];
        const verb = how[rn2(how.length)];
        await pline(`${Monnambuf} tries to ${verb} ${
            (otmp.owornmask & W_ARMOR) ? 'your ' : ''}${
            (otmp.owornmask & W_ARMOR) ? armor_simple_name(otmp)
                                     : yname(otmp)} but gives up.`);
        return !rn2(Math.trunc(inv_cnt(false) / 5) + 2) ? 1 : 0;
    };

    const icnt = inv_cnt(false);
    if (!icnt || (icnt === 1 && u.uskin))
        return nothing_to_steal();

    if (!monkey_business && !u.uarmg) {
        if ((u.uprops?.ADORNED | 0) & LEFT_RING)
            otmp = u.uleft;
        else if ((u.uprops?.ADORNED | 0) & RIGHT_RING)
            otmp = u.uright;
    }
    for (;;) {
        if (!otmp) {
            let tmp = 0;
            for (const obj of game.invent || [])
                if ((!u.uarm || obj !== u.uarmc) && obj !== u.uskin
                    && obj.oclass !== OCLASSES.COIN_CLASS)
                    tmp += (obj.owornmask & (W_ARMOR | W_ACCESSORY)) ? 5 : 1;
            if (!tmp)
                return nothing_to_steal();
            tmp = rn2(tmp);
            for (const obj of game.invent || []) {
                if ((!u.uarm || obj !== u.uarmc) && obj !== u.uskin
                    && obj.oclass !== OCLASSES.COIN_CLASS) {
                    tmp -= (obj.owornmask & (W_ARMOR | W_ACCESSORY)) ? 5 : 1;
                    if (tmp < 0) {
                        otmp = obj;
                        break;
                    }
                }
            }
            if (!otmp) {
                await impossible('Steal fails!');
                return 0;
            }
            if ((otmp === u.uleft || otmp === u.uright) && u.uarmg)
                otmp = u.uarmg;
            if (otmp === u.uarmg && u.uwep)
                otmp = u.uwep;
            else if (otmp === u.uarm && u.uarmc)
                otmp = u.uarmc;
            else if (otmp === u.uarmu && u.uarmc)
                otmp = u.uarmc;
            else if (otmp === u.uarmu && u.uarm)
                otmp = u.uarm;
        }
        if (otmp.o_id === game.stealoid)
            return 0;
        if (otmp.otyp === ONAMES.BOULDER && !throws_rocks(mtmp.data)) {
            if (!retrycnt++) {
                otmp = null;
                continue;
            }
            return cant_take();
        }
        break;
    }

    if (monkey_business) {
        let ostuck;
        const ring_on_primary = u.uhandedness === LEFT_HANDED ? u.uleft : u.uright;
        const ring_on_secondary = u.uhandedness === LEFT_HANDED ? u.uright : u.uleft;
        if (otmp === u.uball)
            ostuck = true;
        else if (otmp === u.uquiver || (otmp === u.uswapwep && !u.twoweap))
            ostuck = false;
        else
            ostuck = ((otmp.cursed && otmp.owornmask)
                || (otmp === ring_on_primary && welded(u.uwep))
                || (otmp === ring_on_secondary && welded(u.uwep) && bimanual(u.uwep)));
        if (ostuck || can_carry(mtmp, otmp) === 0)
            return cant_take();
    }

    if (otmp.otyp === ONAMES.LEASH && otmp.leashmon) {
        if (monkey_business && otmp.cursed)
            return cant_take();
        o_unleash(otmp);
    }

    const was_doffing = doffing(otmp);
    const olddelay = await stop_donning(otmp);
    await stop_occupation();
    if (otmp.owornmask & (W_ARMOR | W_ACCESSORY)) {
        switch (otmp.oclass) {
        case OCLASSES.TOOL_CLASS:
        case OCLASSES.AMULET_CLASS:
        case OCLASSES.RING_CLASS:
        case OCLASSES.FOOD_CLASS:
            await worn_item_removal(mtmp, otmp);
            break;
        case OCLASSES.ARMOR_CLASS: {
            let armordelay = game.objects[otmp.otyp].oc_delay;
            if (olddelay > 0 && olddelay < armordelay)
                armordelay = olddelay;
            if (monkey_business || unresponsive()) {
                if (armordelay >= 1 && !olddelay && rn2(10))
                    return cant_take();
                await worn_item_removal(mtmp, otmp);
                break;
            } else {
                const curssv = otmp.cursed;
                otmp.cursed = 0;
                const slowly = armordelay >= 1 || (game.multi | 0) < 0;
                if (game.flags.female)
                    await urgent_pline(`${!seen ? 'She' : Monnambuf} charms you.  You gladly ${
                        curssv ? 'let her take' : !slowly ? 'hand over'
                        : was_doffing ? 'continue removing' : 'start removing'} your ${armor_simple_name(otmp)}.`);
                else
                    await urgent_pline(`${!seen ? 'She' : Adjmonnam(mtmp, 'beautiful')} seduces you and ${
                        curssv ? 'helps you to take' : !slowly ? 'you take'
                        : was_doffing ? 'you continue taking' : 'you start taking'} off your ${armor_simple_name(otmp)}.`);
                named++;
                nomul(-armordelay);
                game.multi_reason = 'taking off clothes';
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
        }
        default:
            await impossible(`Tried to steal a strange worn thing. [${otmp.oclass}]`);
        }
        if (!seen && canspotmon(mtmp))
            Monnambuf = Monnam(mtmp);
    } else if (otmp.owornmask) {
        const item = otmp === u.uball ? u.uchain : otmp;
        await worn_item_removal(mtmp, item);
        if (otmp.owornmask & W_WEAPONS)
            await remove_worn_item(otmp, false);
    }

    if (objnambuf)
        objnambuf.value = yname(otmp);
    if (!(u.intrinsic?.HConflict || u.uprops?.CONFLICT)
        && !(was_punished && !u.uball))
        mtmp.mavenge = 1;
    if (otmp.unpaid)
        subfrombill(otmp, shop_keeper(u.ushops?.[0]));
    freeinv(otmp);
    if (game.iflags.last_msg === PLNMSG_MON_TAKES_OFF_ITEM
        && mtmp.data.mlet === MONSYMS.S_NYMPH)
        named++;
    await urgent_pline(`${named ? 'She' : Monnambuf} stole ${doname(otmp)}.`);
    await encumber_msg();
    const could_petrify = otmp.otyp === ONAMES.CORPSE
        && touch_petrifies(game.mons[otmp.corpsenm]);
    otmp.how_lost = LOST_STOLEN;
    await mpickobj(mtmp, otmp);
    if (could_petrify && !(mtmp.misc_worn_check & W_ARMG)) {
        await minstapetrify(mtmp, true);
        return -1;
    }
    return (game.multi | 0) < 0 ? 0 : 1;
}

// src/steal.c:689 stealamulet(), used by the Wizard and quest nemeses. Quest
// artifacts take priority, followed by the Amulet and invocation tools.
export async function stealamulet(mtmp) {
    const inventory = game.invent || [];
    let candidates = inventory.filter(any_quest_artifact);

    if (!candidates.length) {
        let real = 0, fake = 0;
        if (game.u.uhave?.amulet) {
            real = ONAMES.AMULET_OF_YENDOR;
            fake = ONAMES.FAKE_AMULET_OF_YENDOR;
        } else if (game.u.uhave?.bell) {
            real = ONAMES.BELL_OF_OPENING;
            fake = ONAMES.BELL;
        } else if (game.u.uhave?.book) {
            real = ONAMES.SPE_BOOK_OF_THE_DEAD;
        } else if (game.u.uhave?.menorah) {
            real = ONAMES.CANDELABRUM_OF_INVOCATION;
        } else {
            return;
        }
        candidates = inventory.filter(obj => obj.otyp === real
            || (obj.otyp === fake && !mtmp.iswiz));
    }

    if (!candidates.length)
        return;
    const otmp = candidates.length > 1 ? candidates[rnd(candidates.length) - 1]
                                        : candidates[candidates.length - 1];
    const u = game.u;

    if ((otmp === u.uarm || otmp === u.uarmu) && u.uarmc)
        await worn_item_removal(mtmp, u.uarmc);
    if (otmp === u.uarmu && u.uarm)
        await worn_item_removal(mtmp, u.uarm);
    if ((otmp === u.uarmg
         || ((otmp === u.uright || otmp === u.uleft) && u.uarmg))
        && u.uwep) {
        if (u.twoweap && u.uswapwep)
            await worn_item_removal(mtmp, u.uswapwep);
        await worn_item_removal(mtmp, u.uwep);
    }
    if ((otmp === u.uright || otmp === u.uleft) && u.uarmg)
        await worn_item_removal(mtmp, u.uarmg);
    if (otmp.owornmask)
        await worn_item_removal(mtmp, otmp);
    if (otmp.unpaid)
        note_unported_steal('stealamulet:subfrombill');

    freeinv(otmp);
    const stolenName = doname(otmp);
    await mpickobj(mtmp, otmp);
    await pline(`${Some_Monnam(mtmp)} steals ${stolenName}!`);
    if ((mtmp.data.mflags1 & MFLAGS.M1_TPORT) !== 0) {
        const { tele_restrict, rloc } = await import('./teleport.js');
        if (!await tele_restrict(mtmp))
            await rloc(mtmp, RLOC_MSG);
    }
    await encumber_msg();
}

// src/steal.c:776 maybe_absorb_item()
export async function maybe_absorb_item(mon, obj, ochance, achance) {
    if (obj === game.u.uball || obj === game.u.uchain
        || obj.oclass === OCLASSES.ROCK_CLASS
        || obj_resists(obj, 100 - ochance, 100 - achance)
        || !await touch_artifact(obj, mon))
        return;

    if (obj.where === OBJ_INVENT) {
        if (obj.owornmask)
            await remove_worn_item(obj, true);
        if (obj.unpaid)
            subfrombill(obj, shop_keeper(game.u.ushops?.[0]));
        if (cansee(mon.mx, mon.my)) {
            await pline(`${Some_Monnam(mon)} pulls ${yname(obj)} away from you and absorbs ${obj.quan > 1 ? 'them' : 'it'}!`);
        } else {
            let hand_s = body_part(HAND);
            if (bimanual(obj))
                hand_s = makeplural(hand_s);
            await pline(`${upstart(yname(obj))} ${otense(obj, 'are')} pulled from your ${hand_s}!`);
        }
        freeinv(obj);
        await encumber_msg();
    } else if (canspotmon(mon)) {
        await pline(`${Monnam(mon)} absorbs ${yname(obj)}!`);
    }
    await mpickobj(mon, obj);
}

// src/steal.c:814 mdrop_obj() — monster puts one object on its own square.
export async function mdrop_obj(mon, obj, verbosely) {
    const omx = mon.mx, omy = mon.my;
    const unwornmask = obj.owornmask || 0;
    /* C calls distant_name(obj, doname) BEFORE extraction for its possible
       side-effects (find_artifact); this tree has no artifact discovery, so
       doname supplies the name the pline uses. */
    const obj_name = doname(obj);

    /* extract_from_minvent(mon, obj, FALSE, TRUE) — unlink, keep intrinsics
       for the update_mon_extrinsics call below. */
    obj_extract_self(obj);
    obj.owornmask = 0;

    /* don't charge for an owned saddle on dead steed (provided that the
       hero is within the same shop at the time) */
    if (unwornmask && mon.mtame && (unwornmask & W_SADDLE) !== 0
        && !obj.unpaid && costly_spot(omx, omy)) {
        /* the in_rooms() membership test needs shop room chains */
        note_unported_steal('mdrop_obj:saddle_no_charge');
        obj.no_charge = 1;
    }

    if (verbosely && cansee(omx, omy))
        /* pline_mon(mon, ...) — a message anchored at the monster */
        await pline_xy(omx, omy, `${Monnam(mon)} drops ${obj_name}.`);

    /* src/steal.c — flooreffects(obj, x, y, "fall") consumes the object when
       it lands in water, lava or a pit; only place it when it survived */
    if (!await flooreffects(obj, omx, omy, 'fall')) {
        place_object(obj, omx, omy);
        stackobj(obj);
    }

    /* removing worn gear adjusts the monster's properties */
    if (mon.mhp > 0 && unwornmask)
        note_unported_steal('mdrop_obj:update_mon_extrinsics');
}

// src/steal.c:852 mdrop_special_objs() — rescue the Amulet, invocation
// tools, Rider corpses and the current role's quest artifact before a pack
// is discarded.
//
// The DRAW is obj_resists(obj, 0, 0): one rn2(100) per ordinary object even
// though a 0% chance can never pass, so scanning a monster's pack costs one
// call per item. The rescue arm itself (mdrop_obj / rloco) is only reachable
// when one of those unique objects is actually carried — never during quest
// START generation — and is recorded rather than half-done, because
// mdrop_obj is async and this runs inside the synchronous create_monster.
export function mdrop_special_objs(mon) {
    /* C caches obj->nobj before the body because the drop unlinks obj;
       walking a snapshot of the chain is the same traversal. */
    for (const obj of [...(mon.minvent || [])]) {
        if (obj_resists(obj, 0, 0) || is_quest_artifact(obj)) {
            note_unported_steal('mdrop_special_objs:rescue');
        }
    }
}

// src/steal.c:875 relobj() — release the objects the creature is carrying.
export async function relobj(mtmp, show, is_pet) {
    const omx = mtmp.mx, omy = mtmp.my;

    /* vault guard's gold goes away rather than be dropped */
    if (mtmp.isgd)
        note_unported_steal('relobj:vault_guard_gold');

    let otmp;
    while ((otmp = is_pet ? droppables(mtmp) : (mtmp.minvent || [])[0])) {
        await mdrop_obj(mtmp, otmp, is_pet && !!game.flags?.verbose);
    }

    if (show && cansee(omx, omy))
        newsym(omx, omy);
}

// src/steal.c:618 mpickobj() — a monster takes possession of an object.
// Returns 1 when the object merged into an existing stack (and is gone).
//
export function mpickobj(mtmp, otmp) {
    if (!otmp) {
        return impossible(`monster (${pmname(mtmp.data, Mgender(mtmp))}) taking or picking up nothing?`)
            .then(() => 1);
    } else if (otmp === game.u.uball || otmp === game.u.uchain) {
        return impossible(`monster (${pmname(mtmp.data, Mgender(mtmp))}) taking or picking up attached ${
            otmp === game.u.uchain ? 'chain' : 'ball'} (${simpleonames(otmp)})?`)
            .then(() => 0);
    }
    /* if monster is acquiring a thrown or kicked object, the throwing
       or kicking code shouldn't continue to track and place it */
    if (otmp === game.thrownobj)
        game.thrownobj = null;
    else if (otmp === game.kickedobj)
        game.kickedobj = null;
    /* an unpaid item can be on the floor; if a monster picks it up, take
       it off the shop bill */
    if (otmp.unpaid || (Has_contents(otmp) && count_unpaid(otmp.cobj)))
        subfrombill(otmp, find_objowner(otmp, otmp.ox, otmp.oy));
    const snuff_otmp = obj_sheds_light(otmp) && attacktype(mtmp.data, ATTKS.AT_ENGL);

    // Construction stays synchronous; runtime feedback finishes before acquisition.
    const acquire = () => {
        otmp.no_charge = 0;
        if (!mtmp.mtame) {
            if (!canseemon(mtmp) && mtmp !== game.u.ustuck)
                unknow_object(otmp);
            if (otmp.how_lost === LOST_THROWN)
                otmp.how_lost = LOST_STOLEN;
            else if (otmp.how_lost === LOST_DROPPED)
                otmp.how_lost = LOST_NONE;
        }
        /* Must do carrying effects on object prior to add_to_minv(). */
        carry_obj_effects(otmp);
        const freed_otmp = add_to_minv(mtmp, otmp);
        if (snuff_otmp)
            snuff_light_source(mtmp.mx, mtmp.my);
        return freed_otmp;
    };
    if (snuff_otmp && engulfing_u(mtmp) && !Blind()) {
        return (async () => {
            await pline(`${Tobjnam(otmp, 'go')} out.`);
            return acquire();
        })();
    }
    return acquire();
}
