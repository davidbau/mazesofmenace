// steal.js — Monster theft from hero inventory (partial).
// C ref: steal.c steal / worn_item_removal / remove_worn_item / inv_cnt /
// somegold / findgold.
//
// Branch envelope (this peel): nymph AD_SITM/AD_SEDU via mhitm_ad_sedu —
// weighted invent pick, worn accessory clear, non-delay armor, freeinv+mpickobj;
// somegold proportional gold (dipfountain bath / stealgold).
// **remove_worn_item** (D-1086): W_ARMOR → do_wear.c *_off; leftover
// owornmask → setnotworn pointer-walk; W_BALL|W_CHAIN + unchain → unpunish;
// W_WEAPONS → *gone. Named omit: donning/cancel_don; in_use; uskin
// skinback; Amulet_off; Ring_gone / Blindf_off (still setworn).
// Named omissions: monkey_business cant_take / ROLL_FROM how[]; stealarm
// afternmv; Punished/uchain/buried-ball nothing_to_steal; Adornment ring
// priority when gloves absent; leash; shop subfrombill; petrify corpse;
// full armor_simple_name / Some_Monnam / yname polish; stop_donning.

import { game } from './gstate.js';
import { rn2, rn1 } from './rng.js';
import {
    W_ARMOR, W_ACCESSORY, W_WEAPONS,
    W_AMUL, W_RING, W_TOOL, W_RINGL, W_RINGR, W_BALL, W_CHAIN,
    LEFT_RING, RIGHT_RING, ADORNED, LOST_STOLEN,
    LARGEST_INT, PLNMSG_MON_TAKES_OFF_ITEM, FAINTED,
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
import {
    setworn,
    Armor_off, Cloak_off, Boots_off, Gloves_off,
    Helmet_off, Shield_off, Shirt_off,
} from './do_wear.js';
import { uwepgone, uswapwepgone, uqwepgone } from './wield.js';
import { mpickobj } from './makemon.js';
import { nomul, stop_occupation } from './hack.js';
import { encumber_msg, freeinv_core } from './invent.js';
import { hero_conflict } from './mondata.js';

const GOLD_PIECE = objectNames.indexOf('GOLD_PIECE');

/**
 * C ref: steal.c findgold `:44–52` — first GOLD_PIECE on an nobj chain
 * (no container walk). Callers: detect.c gold_detect; makemon/monmove
 * still have local clones.
 */
export function findgold(argchain) {
    let chain = argchain;
    while (chain && chain.otyp !== GOLD_PIECE) chain = chain.nobj;
    return chain || null;
}

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
 * C ref: steal.c unresponsive `:131–142`.
 * Callers: mhitu.c doseduce; steal.c monkey_business (named).
 */
export function unresponsive() {
    if ((game.multi | 0) >= 0) return false;
    const u = game.u || {};
    // C trap.c unconscious — usleep or wake-msg prefixes (multi already < 0)
    const msg = game.nomovemsg || '';
    const unconscious = !!(u.usleep
        || msg.startsWith('You awake')
        || msg.startsWith('You regain con')
        || msg.startsWith('You are consci'));
    const fainted = (u.uhs | 0) === FAINTED;
    const reason = game.multi_reason || '';
    return unconscious || fainted
        || reason.startsWith('frozen')
        || reason.startsWith('paralyzed');
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
 * Lev/Fly descent still from *_off bodies (named omit on those).
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
    await remove_worn_item(obj, true);
}

/**
 * C ref: steal.c remove_worn_item(obj, unchain_ball).
 * take_gold / cursed_book pass FALSE; worn_item_removal / steal armor
 * pass TRUE. W_ARMOR dispatches do_wear.c *_off (D-1086); leftover
 * bits use do.js setnotworn pointer-walk; W_BALL|W_CHAIN + unchain
 * calls read.c unpunish.
 * Named omit: donning/cancel_don; in_use; uskin skinback; Amulet_off
 * (setworn W_AMUL stand-in); Ring_gone / Blindf_off still setworn.
 */
export async function remove_worn_item(obj, unchain_ball) {
    if (!obj) return;
    // C: if (donning(obj)) cancel_don(); named omit
    if (!obj.owornmask) return;

    const u = game.u || {};
    // C: oldinuse = obj->in_use; obj->in_use = 1; restore at end — named omit

    if (obj.owornmask & W_ARMOR) {
        if (obj === u.uskin) {
            // C skinback(TRUE) — named omit (no skinback in JS)
        }
        if (obj === u.uarm) await Armor_off();
        else if (obj === u.uarmc) await Cloak_off();
        else if (obj === u.uarmf) await Boots_off();
        else if (obj === u.uarmg) Gloves_off();
        else if (obj === u.uarmh) Helmet_off();
        else if (obj === u.uarms) Shield_off();
        else if (obj === u.uarmu) Shirt_off();
        else setworn(null, obj.owornmask & W_ARMOR);
    } else if (obj.owornmask & W_AMUL) {
        // C Amulet_off() — named omit
        setworn(null, W_AMUL);
    } else if (obj.owornmask & W_RING) {
        // C Ring_gone(obj) — named omit this iter
        if (obj === u.uleft) setworn(null, W_RINGL);
        else if (obj === u.uright) setworn(null, W_RINGR);
        else setworn(null, W_RING);
    } else if (obj.owornmask & W_TOOL) {
        // C Blindf_off(obj) — named omit this iter
        setworn(null, W_TOOL);
    } else if (obj.owornmask & W_WEAPONS) {
        if (obj === u.uwep) await uwepgone();
        if (obj === u.uswapwep) uswapwepgone();
        if (obj === u.uquiver) uqwepgone();
    }

    if (obj.owornmask & (W_BALL | W_CHAIN)) {
        if (unchain_ball) {
            const { unpunish } = await import('./read.js');
            unpunish();
        }
    } else if (obj.owornmask) {
        const { setnotworn } = await import('./do.js');
        setnotworn(obj);
    }
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
                await remove_worn_item(otmp, true);
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
        if ((otmp.owornmask || 0) & W_WEAPONS) {
            await remove_worn_item(otmp, false);
        }
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
