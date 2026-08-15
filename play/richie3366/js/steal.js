// steal.js — Monster theft from hero inventory (partial).
// C ref: steal.c steal / worn_item_removal / inv_cnt / somegold.
//
// Branch envelope (this peel): nymph AD_SITM/AD_SEDU via mhitm_ad_sedu —
// weighted invent pick, worn accessory clear, non-delay armor, freeinv+mpickobj;
// somegold proportional gold (dipfountain bath / stealgold).
// Named omissions: monkey_business cant_take / ROLL_FROM how[]; stealarm
// afternmv; Punished/uchain/buried-ball nothing_to_steal; Adornment ring
// priority when gloves absent; leash; shop subfrombill; petrify corpse;
// full armor_simple_name / Some_Monnam / yname polish; stop_donning.

import { game } from './gstate.js';
import { rn2, rn1 } from './rng.js';
import {
    W_ARMOR, W_ACCESSORY, W_WEAPONS,
    W_ARM, W_ARMC, W_ARMH, W_ARMS, W_ARMG, W_ARMF, W_ARMU,
    W_AMUL, W_RING, W_TOOL, W_RINGL, W_RINGR,
    LEFT_RING, RIGHT_RING, ADORNED, LOST_STOLEN,
    LARGEST_INT, PLNMSG_MON_TAKES_OFF_ITEM,
} from './const.js';
import {
    COIN_CLASS, ARMOR_CLASS, TOOL_CLASS, AMULET_CLASS, RING_CLASS,
    FOOD_CLASS, objectNames,
} from './objects.js';
import { monnear } from './mon.js';
import { is_animal, throws_rocks } from './monsters.js';
import { canspotmon, pline } from './display.js';
import { Monnam } from './do_name.js';
import { doname } from './objnam.js';
import { setworn } from './do_wear.js';
import { setuwep, setuswapwep, setuqwep } from './wield.js';
import { mpickobj } from './makemon.js';
import { nomul, stop_occupation } from './hack.js';
import { encumber_msg, freeinv_core } from './invent.js';
import { hero_conflict } from './mondata.js';

/**
 * C ref: invent.c inv_cnt — count invent entries; inclgold includes COIN_CLASS.
 */
export function inv_cnt(inclgold) {
    const invent = game.invent || [];
    let n = 0;
    for (const otmp of invent) {
        if (!inclgold && otmp.oclass === COIN_CLASS) continue;
        n++;
    }
    return n;
}

/**
 * C ref: steal.c somegold — proportional subset of gold (fits in int).
 * Used by dipfountain bath (fountain.c) and leprechaun stealgold.
 */
export function somegold(lmoney) {
    let igold = lmoney >= LARGEST_INT ? LARGEST_INT : (lmoney | 0);
    if (igold < 50) {
        ; /* all gold */
    } else if (igold < 100) {
        igold = rn1(igold - 25 + 1, 25);
    } else if (igold < 500) {
        igold = rn1(igold - 50 + 1, 50);
    } else if (igold < 1000) {
        igold = rn1(igold - 100 + 1, 100);
    } else if (igold < 5000) {
        igold = rn1(igold - 500 + 1, 500);
    } else if (igold < 10000) {
        igold = rn1(igold - 1000 + 1, 1000);
    } else {
        igold = rn1(igold - 5000 + 1, 5000);
    }
    return igold;
}

/** C Adornment ≡ u.uprops[ADORNED].extrinsic */
function Adornment() {
    return game.u?.uprops?.[ADORNED]?.extrinsic | 0;
}

/** Approximate C Some_Monnam — unseen → Someone / Something. */
function Some_Monnam(mtmp) {
    if (canspotmon(mtmp)) return Monnam(mtmp);
    return is_animal(mtmp?.data) ? 'Something' : 'Someone';
}

/**
 * C ref: steal.c worn_item_removal — pline + remove_worn_item(obj, TRUE).
 * Slot clear via setworn / setuwep subset; Lev/Fly descent deferred.
 */
async function worn_item_removal(mon, obj) {
    if (!obj) return;
    const verb = ((obj.owornmask || 0) & W_WEAPONS) !== 0 ? 'disarms'
        : ((obj.owornmask || 0) & W_ACCESSORY) !== 0 ? 'removes'
            : 'takes off';
    let objbuf = doname(obj);
    // strip a/an/the → your (uchain "the" arm deferred)
    if (objbuf.startsWith('the ')) objbuf = `your ${objbuf.slice(4)}`;
    else if (objbuf.startsWith('an ')) objbuf = `your ${objbuf.slice(3)}`;
    else if (objbuf.startsWith('a ')) objbuf = `your ${objbuf.slice(2)}`;
    objbuf = objbuf.replace(' (being worn)', '');
    objbuf = objbuf.replace(' (alternate weapon; not wielded)', '');
    // C: convert "ring (on left/right hand)" → "(from … hand)"
    const onHand = objbuf.indexOf(' (on ');
    if (onHand >= 0) {
        const after = objbuf.slice(onHand + 5); // after " (on "
        if (after.startsWith('left ') || after.startsWith('right ')) {
            objbuf = `${objbuf.slice(0, onHand + 2)}from${objbuf.slice(onHand + 4)}`;
        }
    }
    await pline(`${Some_Monnam(mon)} ${verb} ${objbuf}.`);
    // C: iflags.last_msg = PLNMSG_MON_TAKES_OFF_ITEM
    if (!game.iflags) game.iflags = {};
    game.iflags.last_msg = PLNMSG_MON_TAKES_OFF_ITEM;
    remove_worn_item_steal(obj);
}

/**
 * C ref: worn.c remove_worn_item — unwear before freeinv.
 * Armor/accessory via setworn(NULL); weapons via setu*wep.
 */
function remove_worn_item_steal(obj) {
    if (!obj) return;
    const u = game.u || {};
    const mask = obj.owornmask || 0;
    if (mask & W_ARMOR) {
        if (obj === u.uarm) setworn(null, W_ARM);
        else if (obj === u.uarmc) setworn(null, W_ARMC);
        else if (obj === u.uarmh) setworn(null, W_ARMH);
        else if (obj === u.uarms) setworn(null, W_ARMS);
        else if (obj === u.uarmg) setworn(null, W_ARMG);
        else if (obj === u.uarmf) setworn(null, W_ARMF);
        else if (obj === u.uarmu) setworn(null, W_ARMU);
        else setworn(null, mask & W_ARMOR);
    } else if (mask & W_AMUL) {
        setworn(null, W_AMUL);
    } else if (mask & W_RING) {
        if (obj === u.uleft) setworn(null, W_RINGL);
        else if (obj === u.uright) setworn(null, W_RINGR);
        else setworn(null, W_RING);
    } else if (mask & W_TOOL) {
        setworn(null, W_TOOL);
    } else if (mask & W_WEAPONS) {
        if (obj === u.uwep) setuwep(null);
        if (obj === u.uswapwep) setuswapwep(null);
        if (obj === u.uquiver) setuqwep(null);
    }
    obj.owornmask = 0;
}

/** C invent.c freeinv — splice from game.invent array. */
function freeinv(otmp) {
    const inv = game.invent || [];
    const idx = inv.indexOf(otmp);
    if (idx >= 0) inv.splice(idx, 1);
    otmp.nobj = null;
    freeinv_core(otmp);
}

/**
 * C ref: steal.c steal — returns 1 flee-ok, 0 no-flee/stealoid, -1 thief died.
 * @param {object} mtmp
 * @param {{ value: string }|null} objnambuf out-param for animal flee pline
 */
export async function steal(mtmp, objnambuf) {
    if (objnambuf) objnambuf.value = '';
    const u = game.u || {};
    if (!monnear(mtmp, u.ux, u.uy)) return 0;

    const monkey_business = is_animal(mtmp.data);
    const seen = canspotmon(mtmp);
    let Monnambuf = Some_Monnam(mtmp);
    let named = 0;
    let retrycnt = 0;
    const was_punished = !!(u.uball || u.uchain);

    // occupation meal finish deferred
    const icnt = inv_cnt(false);
    if (!icnt || (icnt === 1 && u.uskin)) {
        // nothing_to_steal: Punished/Blind arms deferred — still return 1
        await pline(
            Blind_steal()
                ? 'Somebody tries to rob you, but finds nothing to steal.'
                : `${Monnambuf} tries to rob you, but there is nothing to steal!`,
        );
        return 1;
    }

    let otmp = null;
    let from_adornment = false;
    if (monkey_business || u.uarmg) {
        // skip ring special cases
    } else if (Adornment() & LEFT_RING) {
        otmp = u.uleft;
        from_adornment = true;
    } else if (Adornment() & RIGHT_RING) {
        otmp = u.uright;
        from_adornment = true;
    }

    const invent = () => game.invent || [];

    const pick_weighted = () => {
        let tmp = 0;
        for (const o of invent()) {
            if ((!u.uarm || o !== u.uarmc) && o !== u.uskin
                && o.oclass !== COIN_CLASS) {
                tmp += ((o.owornmask || 0) & (W_ARMOR | W_ACCESSORY)) ? 5 : 1;
            }
        }
        if (!tmp) return null;
        tmp = rn2(tmp);
        let chosen = null;
        for (const o of invent()) {
            if ((!u.uarm || o !== u.uarmc) && o !== u.uskin
                && o.oclass !== COIN_CLASS) {
                tmp -= ((o.owornmask || 0) & (W_ARMOR | W_ACCESSORY)) ? 5 : 1;
                if (tmp < 0) {
                    chosen = o;
                    break;
                }
            }
        }
        return chosen;
    };

    // retry: / gotobj:
    for (;;) {
        if (!from_adornment) {
            otmp = pick_weighted();
            if (!otmp) {
                await pline(
                    `${Monnambuf} tries to rob you, but there is nothing to steal!`,
                );
                return 1;
            }
            // gloves/cloak substitutions (C after weighted pick)
            if ((otmp === u.uleft || otmp === u.uright) && u.uarmg) {
                otmp = u.uarmg;
            }
            if (otmp === u.uarmg && u.uwep) otmp = u.uwep;
            else if (otmp === u.uarm && u.uarmc) otmp = u.uarmc;
            else if (otmp === u.uarmu && u.uarmc) otmp = u.uarmc;
            else if (otmp === u.uarmu && u.uarm) otmp = u.uarm;
        }
        from_adornment = false; // only skip pick once

        if (otmp.o_id != null && (game.stealoid | 0) !== 0
            && otmp.o_id === (game.stealoid | 0)) {
            return 0;
        }

        const BOULDER = objectNames.indexOf('BOULDER');
        if (otmp.otyp === BOULDER && !throws_rocks(mtmp.data)) {
            if (!retrycnt++) continue; // goto retry
            return 1; // cant_take deferred
        }
        break;
    }

    // monkey_business cant_take / curse stickiness deferred (nymphs skip)

    await stop_occupation();

    if ((otmp.owornmask || 0) & (W_ARMOR | W_ACCESSORY)) {
        const oclass = otmp.oclass;
        if (oclass === TOOL_CLASS || oclass === AMULET_CLASS
            || oclass === RING_CLASS || oclass === FOOD_CLASS) {
            await worn_item_removal(mtmp, otmp);
        } else if (oclass === ARMOR_CLASS) {
            const oc = game.objects?.[otmp.otyp];
            let armordelay = oc?.oc_delay | 0;
            if (monkey_business) {
                // animals: rn2(10) cant_take when delay — named omission stub
                if (armordelay >= 1 && rn2(10)) return 1;
                await worn_item_removal(mtmp, otmp);
            } else {
                const curssv = otmp.cursed | 0;
                otmp.cursed = 0;
                const slowly = armordelay >= 1 || (game.multi | 0) < 0;
                const female = !!(game.flags?.female);
                if (female) {
                    await pline(
                        `${!seen ? 'She' : Monnambuf} charms you.  `
                        + `You gladly ${curssv ? 'let her take'
                            : !slowly ? 'hand over'
                                : 'start removing'} your armor.`,
                    );
                } else {
                    await pline(
                        `${!seen ? 'She' : Monnambuf} seduces you and `
                        + `${curssv ? 'helps you to take'
                            : !slowly ? 'you take'
                                : 'you start taking'} off your armor.`,
                    );
                }
                named++;
                nomul(-armordelay);
                game.multi_reason = 'taking off clothes';
                game.nomovemsg = null;
                remove_worn_item_steal(otmp);
                otmp.cursed = curssv;
                if ((game.multi | 0) < 0) {
                    game.stealoid = otmp.o_id | 0;
                    game.stealmid = mtmp.m_id | 0;
                    // afternmv = stealarm deferred
                    return 0;
                }
            }
        }
        if (!seen && canspotmon(mtmp)) Monnambuf = Monnam(mtmp);
    } else if (otmp.owornmask) {
        // weapon or ball&chain
        let item = otmp;
        if (otmp === u.uball) item = u.uchain || otmp;
        await worn_item_removal(mtmp, item);
        if ((otmp.owornmask || 0) & W_WEAPONS) remove_worn_item_steal(otmp);
    }

    if (objnambuf) objnambuf.value = doname(otmp); // yname approx

    if (!hero_conflict() && !(was_punished && !(u.uball || u.uchain))) {
        mtmp.mavenge = 1;
    }

    freeinv(otmp);
    // C: after worn_item_removal, nymph shortens stole-msg to "She"
    if ((game.iflags?.last_msg | 0) === PLNMSG_MON_TAKES_OFF_ITEM
        && mtmp.data?.mlet === 'S_NYMPH') {
        named++;
    }
    await pline(`${named ? 'She' : Monnambuf} stole ${doname(otmp)}.`);
    await encumber_msg();
    otmp.how_lost = LOST_STOLEN;
    mpickobj(mtmp, otmp);
    // petrify corpse arm deferred
    return (game.multi | 0) < 0 ? 0 : 1;
}

function Blind_steal() {
    const u = game.u || {};
    return !!(u.Blind || u.ublind);
}
