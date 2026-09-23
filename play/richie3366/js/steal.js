// steal.js — Monster theft from hero inventory (partial).
// C ref: steal.c steal / worn_item_removal / remove_worn_item / inv_cnt /
// somegold / findgold.
//
// Branch envelope (this peel): nymph AD_SITM/AD_SEDU via mhitm_ad_sedu —
// weighted invent pick, worn accessory clear, non-delay armor, freeinv+mpickobj;
// somegold proportional gold (dipfountain bath / stealgold).
// **stealamulet** (D-1945): quest-artifact sweep else uhave amulet/bell/book/
// menorah otyp sweep, outer-gear strip, shop subfrombill, mpickobj steal
// pline, teleporter rloc(RLOC_MSG), encumber_msg.
// **remove_worn_item** (D-1086): W_ARMOR → do_wear.c *_off; leftover
// owornmask → setnotworn pointer-walk; W_BALL|W_CHAIN + unchain → unpunish;
// W_WEAPONS → *gone. Named omit: donning/cancel_don; in_use; uskin
// skinback; Amulet_off; Ring_gone / Blindf_off (still setworn).
// **stealarm + unstolenarm** (D-2271): multi-turn armor-steal completion
// via afternmv (stealoid/stealmid, shop subfrombill, freeinv+mpickobj,
// monflee+rloc) and dead-thief unstolenarm restore (thiefdead swap lives
// in mhitm.js next to the C caller mon.c:2783).
// **steal** (D-2748): whole C `:343–614` body in C order —
// nothing_to_steal (Punished uchain / buried-ball / live Blind() /
// gold-only),
// Adornment ring priority, retry pick (!tmp → nothing_to_steal, !otmp →
// impossible), glove/cloak/shirt substitution, stealoid gate, BOULDER
// retry-once → cant_take, monkey curse-stickiness/can_carry → cant_take,
// LEASH (monkey-cursed → cant_take, else o_unleash), doffing/stop_donning,
// worn switch (TOOL/AMULET/RING/FOOD; ARMOR_CLASS delay clamp +
// monkey/unresponsive rn2(10) cant_take + charm/seduce stealarm path +
// strange-worn impossible), weapon/ball&chain, yname objnambuf, mavenge,
// unpaid subfrombill, nymph "She" shorten, urgent stole pline,
// petrify-corpse minstapetrify → -1.
// Named omissions: C assert(uball) debug no-op; o_id-null guard on the
// stealoid compare (JS-artifact safety; real o_ids start at 1).

import { game } from './gstate.js';
import { rn2, rn1, rnd } from './rng.js';
import {
    W_ARMOR, W_ACCESSORY, W_WEAPONS, W_ARMG,
    W_AMUL, W_RING, W_TOOL, W_RINGL, W_RINGR, W_BALL, W_CHAIN,
    LEFT_RING, RIGHT_RING, LEFT_HANDED, TT_BURIEDBALL, ADORNED, LOST_STOLEN,
    LARGEST_INT, PLNMSG_MON_TAKES_OFF_ITEM, FAINTED, RLOC_MSG, FOOT,
} from './const.js';
import {
    COIN_CLASS, ARMOR_CLASS, WEAPON_CLASS, TOOL_CLASS, AMULET_CLASS, RING_CLASS,
    FOOD_CLASS, objectNames, objects,
} from './objects.js';
import { monnear, dist2 } from './mon.js';
import { is_animal, throws_rocks, can_teleport, slithy, dmgtype, touch_petrifies, mons } from './monsters.js';
import { subfrombill, shop_keeper, money_cnt } from './shk.js';
import { tele_restrict, rloc } from './teleport.js';
import { ART_ORB_OF_DETECTION } from './generated/artifacts_data.js';
import { canspotmon, pline, urgent_pline, newsym, impossible } from './display.js';
import { Monnam, Some_Monnam, Adjmonnam, s_suffix, y_monnam } from './do_name.js';
import { doname, yname, makeplural } from './objnam.js';
import {
    setworn, armor_simple_name, doffing, stop_donning,
    Armor_off, Cloak_off, Boots_off, Gloves_off,
    Helmet_off, Shield_off, Shirt_off, Amulet_off,
} from './do_wear.js';
import { uwepgone, uswapwepgone, uqwepgone, welded } from './wield.js';
import { mpickobj } from './makemon.js';
import { nomul, stop_occupation } from './hack.js';
import { maybe_finished_meal } from './eat.js';
import { o_unleash } from './apply.js';
import { openholdingtrap, minstapetrify } from './trap.js';
import { Blind, encumber_msg, freeinv_core } from './invent.js';
import { can_carry } from './monmove.js';
import { hero_conflict } from './mondata.js';
import { g_at, add_to_minv, obj_extract_self, splitobj } from './mkobj.js';
import { mbodypart, body_part } from './polyself.js';
import { monflee } from './monmove.js';
import { Levitation, Flying } from './mhitu.js';

const GOLD_PIECE = objectNames.indexOf('GOLD_PIECE');
const BOULDER = objectNames.indexOf('BOULDER');
const LEASH = objectNames.indexOf('LEASH');
const CORPSE = objectNames.indexOf('CORPSE');
// stealamulet quest/invocation targets (C otyp constants via objects[] index)
const AMULET_OF_YENDOR = objectNames.indexOf('AMULET_OF_YENDOR');
const FAKE_AMULET_OF_YENDOR = objectNames.indexOf('FAKE_AMULET_OF_YENDOR');
const BELL_OF_OPENING = objectNames.indexOf('BELL_OF_OPENING');
const BELL = objectNames.indexOf('BELL');
const SPE_BOOK_OF_THE_DEAD = objectNames.indexOf('SPE_BOOK_OF_THE_DEAD');
const CANDELABRUM_OF_INVOCATION = objectNames.indexOf('CANDELABRUM_OF_INVOCATION');

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
 * C ref: steal.c stealgold `:57–116` — mhitu AD_SGLD (leprechaun) theft.
 * Floor gold under the hero (lesser coins skipped) is taken when the hero
 * carries none, the pile is bigger, or !rn2(5) — C short-circuit, so the
 * draw only happens when both exist and the pile isn't bigger; else a
 * somegold() share of the purse. Either branch may rloc(RLOC_MSG) +
 * monflee. Caller: mhitu.js mhitm_ad_sgld_u.
 */
export async function stealgold(mtmp) {
    const u = game.u || {};
    let fgold = g_at(u.ux, u.uy);

    /* skip lesser coins on the floor */
    while (fgold && fgold.otyp !== GOLD_PIECE) fgold = fgold.nexthere;

    /* Do you have real gold? — C findgold(gi.invent); JS invent is an array */
    let ygold = (game.invent || []).find((o) => o && o.otyp === GOLD_PIECE) || null;

    if (fgold && (!ygold || (fgold.quan | 0) > (ygold.quan | 0) || !rn2(5))) {
        obj_extract_self(fgold);
        add_to_minv(mtmp, fgold);
        newsym(u.ux, u.uy);
        let who, whose, what;
        if (u.usteed) {
            who = u.usteed;
            whose = s_suffix(y_monnam(who));
            what = makeplural(mbodypart(who, FOOT));
        } else {
            who = game.youmonst;
            whose = 'your';
            what = makeplural(body_part(FOOT));
        }
        /* [ avoid "between your rear regions" :-] */
        if (slithy(who?.data)) what = 'coils';
        /* reduce "rear hooves/claws" to "hooves/claws" */
        if (what.startsWith('rear ')) what = what.slice(5);
        await pline(`${Monnam(mtmp)} quickly snatches some gold from ${
            (Levitation() || Flying()) ? 'beneath' : 'between'} ${whose} ${what}!`);
        if (!ygold || !rn2(5)) {
            if (!(await tele_restrict(mtmp))) await rloc(mtmp, RLOC_MSG);
            await monflee(mtmp, 0, false, false);
        }
    } else if (ygold) {
        const gold_price = objects()[GOLD_PIECE].oc_cost | 0;
        let tmp = Math.trunc((somegold(money_cnt(game.invent)) + gold_price - 1)
                             / gold_price);
        tmp = Math.min(tmp, ygold.quan | 0);
        if (tmp < (ygold.quan | 0)) {
            ygold = splitobj(ygold, tmp);
        } else {
            const { setnotworn } = await import('./do.js');
            setnotworn(ygold);
        }
        freeinv(ygold);
        add_to_minv(mtmp, ygold);
        await pline('Your purse feels lighter.');
        if (!(await tele_restrict(mtmp))) await rloc(mtmp, RLOC_MSG);
        await monflee(mtmp, 0, false, false);
        if (game.disp) game.disp.botl = true;
        if (game.flags) game.flags.botl = true;
    }
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

/* C obj.h:257 bimanual — WEAPON/TOOL with oc_bimanual (a C macro, expanded
   here like the dig.js/muse.js copies; steal.c:473 RING_ON_SECONDARY arm). */
function bimanual(obj) {
    if (!obj) return false;
    return (obj.oclass === WEAPON_CLASS || obj.oclass === TOOL_CLASS)
        && !!(objects()[obj.otyp]?.oc_bimanual);
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
 * Named omit: donning/cancel_don; in_use; uskin skinback;
 * Ring_gone / Blindf_off still setworn.
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
        else if (obj === u.uarmg) await Gloves_off();
        else if (obj === u.uarmh) await Helmet_off();
        else if (obj === u.uarms) Shield_off();
        else if (obj === u.uarmu) Shirt_off();
        else setworn(null, obj.owornmask & W_ARMOR);
    } else if (obj.owornmask & W_AMUL) {
        // C steal.c:264–265 — Amulet_off() does its own off_msg.
        await Amulet_off();
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
 * C ref: steal.c steal `:343–614` — monster theft from the hero (nymphs,
 * leprechauns, animals). Returns 1 flee-ok, 0 no-flee/stealoid, -1 thief
 * died. C order: monnear gate; Monnambuf snapshot; maybe_finished_meal;
 * inv gate → nothing_to_steal (Punished uchain / buried-ball unseen chain
 * / Blind / gold-only / generic); Adornment ring priority; retry weighted
 * pick (empty → nothing_to_steal; null → impossible); glove/cloak/shirt
 * substitution; gotobj stealoid gate; BOULDER retry-once else cant_take;
 * monkey curse-stickiness/can_carry → cant_take; LEASH (monkey-cursed →
 * cant_take, else o_unleash); doffing + stop_donning + stop_occupation;
 * worn armor/accessory switch (TOOL/AMULET/RING/FOOD worn_item_removal;
 * ARMOR_CLASS armordelay clamp, monkey/unresponsive rn2(10) cant_take,
 * charm/seduce nomul + stealarm path, strange-worn impossible; blindfold
 * Monnambuf refresh); weapon/ball&chain (uball→uchain message item);
 * objnambuf yname; mavenge; unpaid subfrombill; freeinv; nymph "She"
 * shorten; urgent stole pline; encumber_msg; petrify corpse
 * minstapetrify → -1; multi<0 → 0 else 1.
 * C caller: uhitm.c:4673 mhitm_ad_sedu mhitu arm → js/mhitu.js:2208
 * mhitm_ad_sedu_u switch (wired).
 * @param {object} mtmp
 * @param {{ value: string }|null} objnambuf out-param for animal flee pline
 */
export async function steal(mtmp, objnambuf) {
    const u = game.u || {};
    /* C `:348–351` — snapshot at entry. C Punished ≡ (uball != 0)
       (youprop.h:77) — uchain alone never counts. */
    const monkey_business = is_animal(mtmp.data);
    const seen = canspotmon(mtmp);
    const was_punished = !!u.uball;
    if (objnambuf) objnambuf.value = '';
    /* the following is true if successful on first of two attacks. */
    if (!monnear(mtmp, u.ux, u.uy)) return 0;

    /* C `:357–366` — stealing a worn item might drop the hero into
       water/lava or take the Eyes; remember the name as it is now; if
       unseen, nymphs are "Someone" and monkeys "Something". */
    let Monnambuf = Some_Monnam(mtmp);

    /* C `:367–371` — food being eaten might already be used up but not yet
       removed from inventory; finish it now so it cannot be stolen. */
    if (game.occupation) await maybe_finished_meal(false);

    /* C `:375–399` nothing_to_steal — closure: C `goto nothing_to_steal`
       re-enters from the inv gate and the empty retry pick. */
    const nothing_to_steal = async () => {
        /* nymphs might target uchain if invent is empty; monkeys won't;
           hero becomes unpunished but nymph ends up empty handed */
        if (u.uball && !monkey_business && rn2(4)) {
            /* uball is not carried (uchain never is) */
            await worn_item_removal(mtmp, u.uchain);
        } else if ((u.utrap | 0) && (u.utraptype | 0) === TT_BURIEDBALL
                   && !monkey_business && !rn2(4)) {
            /* buried ball is not tracked via 'uball' and there is no chain
               at all (hence no uchain to take off) */
            await pline(`${Monnambuf} takes off your unseen chain.`);
            await openholdingtrap(game.youmonst);
        } else if (Blind()) {
            /* C `:384` youprop.h:103 — (HBlinded || EBlinded) && !BBlinded.
               Live invent.js Blind() (also uroleplay.blind). */
            await pline('Somebody tries to rob you, but finds nothing to steal.');
        } else if (inv_cnt(true) > inv_cnt(false)) {
            await pline(`${Monnambuf} tries to rob you, but isn't interested in gold.`);
        } else {
            await pline(`${Monnambuf} tries to rob you, but there is nothing to steal!`);
        }
        return 1; /* let her flee */
    };

    const icnt = inv_cnt(false); /* don't include gold */
    if (!icnt || (icnt === 1 && u.uskin)) {
        /* Not even a thousand men in armor can strip a naked man. */
        return nothing_to_steal();
    }

    /* C `:401–409` — ring special cases (skipped for animals/gloves). */
    let otmp = null;
    let gotobj = false; /* C `goto gotobj` — skip the weighted pick once */
    if (monkey_business || u.uarmg) {
        ; /* skip ring special cases */
    } else if (Adornment() & LEFT_RING) {
        otmp = u.uleft;
        gotobj = true;
    } else if (Adornment() & RIGHT_RING) {
        otmp = u.uright;
        gotobj = true;
    }

    /* C `:480–495` cant_take — closure: message + stay-or-flee roll.
       Reached from the boulder, monkey-stickiness and monkey-leash arms. */
    const cant_take = async (obj) => {
        /* C `:480–482` static how[] + hack.h:1493 ROLL_FROM ≡ how[rn2(4)] */
        const how = ['steal', 'snatch', 'grab', 'take'];
        const isArmor = ((obj.owornmask || 0) & W_ARMOR) !== 0;
        await pline(`${Monnambuf} tries to ${how[rn2(how.length)]} `
            + `${isArmor ? 'your ' : ''}`
            + `${isArmor ? armor_simple_name(obj) : yname(obj)} but gives up.`);
        /* the fewer items you have, the less likely the thief
           is going to stick around to try again (0) instead of
           running away (1) */
        return rn2(Math.trunc(inv_cnt(false) / 5) + 2) ? 0 : 1;
    };

    let named = 0;
    let retrycnt = 0;
    for (;;) {
        if (!gotobj) {
            /* C `:411–431` retry — armor/accessory weighs 5, else 1;
               uarmc skipped while suited; uskin and gold never counted. */
            let tmp = 0;
            for (const o of game.invent || []) {
                if ((!u.uarm || o !== u.uarmc) && o !== u.uskin
                    && o.oclass !== COIN_CLASS)
                    tmp += ((o.owornmask || 0) & (W_ARMOR | W_ACCESSORY)) ? 5 : 1;
            }
            if (!tmp) return nothing_to_steal();
            tmp = rn2(tmp);
            otmp = null;
            for (const o of game.invent || []) {
                if ((!u.uarm || o !== u.uarmc) && o !== u.uskin
                    && o.oclass !== COIN_CLASS) {
                    tmp -= ((o.owornmask || 0) & (W_ARMOR | W_ACCESSORY)) ? 5 : 1;
                    if (tmp < 0) { otmp = o; break; }
                }
            }
            if (!otmp) {
                await impossible('Steal fails!');
                return 0;
            }
            /* can't steal ring(s) while wearing gloves */
            if ((otmp === u.uleft || otmp === u.uright) && u.uarmg)
                otmp = u.uarmg;
            /* can't steal gloves while wielding - so steal the wielded item. */
            if (otmp === u.uarmg && u.uwep)
                otmp = u.uwep;
            /* can't steal armor while wearing cloak - so steal the cloak. */
            else if (otmp === u.uarm && u.uarmc)
                otmp = u.uarmc;
            /* can't steal shirt while wearing cloak or suit */
            else if (otmp === u.uarmu && u.uarmc)
                otmp = u.uarmc;
            else if (otmp === u.uarmu && u.uarm)
                otmp = u.uarm;
        }
        gotobj = false; /* only skip the pick once */

        /* C `:451–452` gotobj — theft already scheduled via stealarm.
           o_id is never 0 for real objects (next_ident starts at 1);
           the null guard only skips o_id-less JS artifacts. */
        if (otmp.o_id != null && (otmp.o_id | 0) === (game.stealoid | 0))
            return 0;

        /* C `:454–458` — boulders retry once, then give up. */
        if (otmp.otyp === BOULDER && !throws_rocks(mtmp.data)) {
            if (!retrycnt++) continue; /* goto retry */
            return cant_take(otmp); /* goto cant_take */
        }
        break;
    }

    /* C `:459–498` — animals can't overcome curse stickiness nor unlock
       chains (ignores loadstones; the !can_carry check catches those). */
    if (monkey_business) {
        let ostuck;
        if (otmp === u.uball)
            ostuck = true; /* effectively worn; curse is implicit */
        else if (otmp === u.uquiver || (otmp === u.uswapwep && !u.twoweap))
            ostuck = false; /* not really worn; curse doesn't matter */
        else {
            /* C you.h:566–567 RING_ON_PRIMARY ≡ ULEFTY ? uleft : uright */
            const ULEFTY = (u.uhandedness | 0) === LEFT_HANDED;
            const ring_primary = ULEFTY ? u.uleft : u.uright;
            const ring_secondary = ULEFTY ? u.uright : u.uleft;
            ostuck = !!((otmp.cursed && (otmp.owornmask | 0))
                      /* nymphs can steal rings from under
                         cursed weapon but animals can't */
                      || (otmp === ring_primary && welded(u.uwep))
                      || (otmp === ring_secondary && welded(u.uwep)
                          && bimanual(u.uwep)));
        }
        if (ostuck || can_carry(mtmp, otmp) === 0)
            return cant_take(otmp);
    }

    /* C `:500–505` — unleash before stealing a leash. */
    if (otmp.otyp === LEASH && otmp.leashmon) {
        if (monkey_business && otmp.cursed)
            return cant_take(otmp);
        o_unleash(otmp);
    }

    /* C `:507–513` — stop donning/doffing now so afternmv won't be
       clobbered below; stop_occupation doesn't handle donning/doffing.
       You're going to notice the theft... */
    const was_doffing = doffing(otmp);
    const olddelay = await stop_donning(otmp);
    await stop_occupation();

    if ((otmp.owornmask | 0) & (W_ARMOR | W_ACCESSORY)) {
        switch (otmp.oclass) {
        case TOOL_CLASS:
        case AMULET_CLASS:
        case RING_CLASS:
        case FOOD_CLASS: /* meat ring */
            await worn_item_removal(mtmp, otmp);
            break;
        case ARMOR_CLASS: {
            /* C `:528–530` — an in-progress doff delay shortens the charm. */
            let armordelay = objects()[otmp.otyp]?.oc_delay | 0;
            if (olddelay > 0 && olddelay < armordelay)
                armordelay = olddelay;
            if (monkey_business || unresponsive()) {
                /* animals usually don't have enough patience to take off
                   items which require extra time; unconscious or paralyzed
                   hero can't be charmed into taking off his own armor */
                if (armordelay >= 1 && !olddelay && rn2(10))
                    return cant_take(otmp);
                await worn_item_removal(mtmp, otmp);
                break;
            }
            const curssv = otmp.cursed | 0;
            otmp.cursed = 0;
            const slowly = (armordelay >= 1 || (game.multi | 0) < 0);
            if (game.flags?.female) {
                await urgent_pline(`${!seen ? 'She' : Monnambuf} charms you.  `
                    + `You gladly ${curssv ? 'let her take'
                        : !slowly ? 'hand over'
                        : was_doffing ? 'continue removing'
                        : 'start removing'} your ${armor_simple_name(otmp)}.`);
            } else {
                await urgent_pline(`${!seen ? 'She' : Adjmonnam(mtmp, 'beautiful')} `
                    + `seduces you and ${curssv ? 'helps you to take'
                        : !slowly ? 'you take'
                        : was_doffing ? 'you continue taking'
                        : 'you start taking'} off your ${armor_simple_name(otmp)}.`);
            }
            named++;
            /* the following is to set multi for later on */
            nomul(-armordelay);
            game.multi_reason = 'taking off clothes';
            game.nomovemsg = null;
            await remove_worn_item(otmp, true);
            otmp.cursed = curssv;
            if ((game.multi | 0) < 0) {
                game.stealoid = otmp.o_id | 0;
                game.stealmid = mtmp.m_id | 0;
                game.afternmv = stealarm;
                return 0;
            }
            break;
        }
        default:
            await impossible('Tried to steal a strange worn thing. [%d]',
                otmp.oclass);
        }
        /* C `:594–596` — hero's blindfold might have just been stolen; if
           so, replace cached "Someone"/"Something" with Monnam. */
        if (!seen && canspotmon(mtmp))
            Monnambuf = Monnam(mtmp);
    } else if ((otmp.owornmask | 0)) { /* weapon or ball&chain */
        let item = otmp;
        if (otmp === u.uball) /* non-Null uball implies non-Null uchain */
            item = u.uchain || otmp; /* more accurate 'takes off' message */
        await worn_item_removal(mtmp, item);
        /* if we switched from uball to uchain for the preface message,
           then unpunish() took place and both those pointers are now Null,
           with 'item' a stale pointer to freed chain; the ball is still
           present though and 'otmp' is still valid; if uball was also
           wielded or quivered, the corresponding weapon pointer hasn't
           been cleared yet; do that, with no preface message this time */
        if (((otmp.owornmask || 0) & W_WEAPONS) !== 0)
            await remove_worn_item(otmp, false);
    }

    /* do this before removing it from inventory */
    if (objnambuf) objnambuf.value = yname(otmp);
    /* usually set mavenge bit so knights won't suffer an alignment penalty
       during retaliation; not applicable for removing attached iron ball */
    if (!hero_conflict() && !(was_punished && !u.uball))
        mtmp.mavenge = 1;

    if (otmp.unpaid)
        subfrombill(otmp, shop_keeper((u.ushops || '')[0]));
    freeinv(otmp);

    /* if we just gave a message about removing a worn item and there have
       been no intervening messages, shorten '<mon> stole <item>' message */
    if ((game.iflags?.last_msg | 0) === PLNMSG_MON_TAKES_OFF_ITEM
        && mtmp.data?.mlet === 'S_NYMPH')
        ++named;
    await urgent_pline(`${named ? 'She' : Monnambuf} stole ${doname(otmp)}.`);
    await encumber_msg();
    const could_petrify = (otmp.otyp === CORPSE
                     && touch_petrifies(mons(otmp.corpsenm)));
    otmp.how_lost = LOST_STOLEN;
    mpickobj(mtmp, otmp); /* may free otmp */
    if (could_petrify && !((mtmp.misc_worn_check | 0) & W_ARMG)) {
        await minstapetrify(mtmp, true);
        return -1;
    }
    return (game.multi | 0) < 0 ? 0 : 1;
}

/* AD_SITM — monattk.h:63 — steals item (nymphs); dmgtype gate in stealarm. */
const AD_SITM = 21;

/**
 * C ref: steal.c unstolenarm `:144–162` — called via afternmv when the hero
 * finishes taking off armor that was slated to be stolen but the thief died
 * in the interim (thiefdead swapped stealarm → unstolenarm). Finds the
 * stealoid object before clearing stealoid (already not-worn, still in
 * invent), You() finish message if still present. Returns 0.
 */
export async function unstolenarm() {
    const stealoid = game.stealoid | 0;
    let obj = null;
    for (const o of game.invent || []) {
        if ((o.o_id | 0) === stealoid) { obj = o; break; }
    }
    game.stealoid = 0;
    if (obj) {
        await pline(`You finish taking off your ${armor_simple_name(obj)}.`);
    }
    return 0;
}

/**
 * C ref: steal.c stealarm `:165–211` — finish stealing armor that took
 * multiple turns to take off (afternmv set by steal() when multi < 0).
 * stealoid/stealmid gate → find stealoid in invent → find stealmid on fmon
 * (DEADMONSTER impossible arm) → dmgtype AD_SITM + distu ≤ 2 gates → shop
 * subfrombill → freeinv → pline → mpickobj → monflee → rloc. botm clears
 * both stealoid and stealmid in every path. Returns 0.
 */
export async function stealarm() {
    if (!(game.stealoid | 0) || !(game.stealmid | 0)) {
        game.stealoid = 0;
        game.stealmid = 0;
        return 0;
    }
    const stealoid = game.stealoid | 0;
    const stealmid = game.stealmid | 0;
    const u = game.u || {};
    for (const otmp of game.invent || []) {
        if ((otmp.o_id | 0) !== stealoid) continue;
        for (const mtmp of game.fmon || []) {
            if ((mtmp.m_id | 0) !== stealmid) continue;
            if ((mtmp.mhp | 0) <= 0) {
                await impossible('stealarm(): dead monster stealing');
                game.stealoid = 0;
                game.stealmid = 0;
                return 0;
            }
            /* C distu(xx,yy) ≡ dist2(xx,yy,u.ux,u.uy) (hack.h:1531). */
            if (!dmgtype(mtmp.data, AD_SITM)
                || dist2(mtmp.mx, mtmp.my, u.ux, u.uy) > 2) {
                game.stealoid = 0;
                game.stealmid = 0;
                return 0;
            }
            if (otmp.unpaid) subfrombill(otmp, shop_keeper((u.ushops || '')[0]));
            freeinv(otmp);
            const buf = doname(otmp);
            await pline(`${Monnam(mtmp)} steals ${buf}!`);
            mpickobj(mtmp, otmp); /* may free otmp */
            /* Implies seduction — no mavenge bit (C steal.c:199-200). */
            await monflee(mtmp, 0, false, false);
            if (!(await tele_restrict(mtmp))) await rloc(mtmp, RLOC_MSG);
            break;
        }
        break;
    }
    game.stealoid = 0;
    game.stealmid = 0; /* in case only one has been reset so far */
    return 0;
}

/**
 * C ref: steal.c stealamulet `:688–767` — Wizard/quest-nemesis snatch
 * (uhitm.c mhitm_ad_samu `!rn2(20)` arm; caller wiring named below).
 * C order: quest-artifact sweep (random pick past the first so invent
 * order can't influence the theft) else uhave amulet/bell/book/menorah
 * otyp sweep (fake amulet/bell count unless mtmp iswiz); outer-gear
 * strip (suit cloak, shirt armor, gloves via weapon first + twoweap
 * swap, ring gloves); worn target strip; shop subfrombill; freeinv;
 * doname captured before mpickobj (merge may free otmp); steal pline;
 * teleporter rloc(RLOC_MSG); encumber_msg.
 * `any_quest_artifact` is the obj.h macro (`oartifact >=
 * ART_ORB_OF_DETECTION`), inlined at both sweeps per the muse.js idiom.
 */
export async function stealamulet(mtmp) {
    const u = game.u || {};
    const invent = game.invent || [];
    let otmp = null;
    let real = 0, fake = 0, n = 0;

    /* target every quest artifact, not just current role's;
       if hero has more than one, choose randomly so that player
       can't use inventory ordering to influence the theft */
    for (const obj of invent) {
        if ((obj.oartifact | 0) >= ART_ORB_OF_DETECTION) {
            ++n;
            otmp = obj;
        }
    }
    if (n > 1) {
        n = rnd(n);
        for (const obj of invent) {
            if (((obj.oartifact | 0) >= ART_ORB_OF_DETECTION) && !--n) {
                otmp = obj;
                break;
            }
        }
    }

    if (!otmp) {
        /* if we didn't find any quest artifact, find another valuable item */
        const uhave = u.uhave || {};
        if (uhave.amulet) {
            real = AMULET_OF_YENDOR;
            fake = FAKE_AMULET_OF_YENDOR;
        } else if (uhave.bell) {
            real = BELL_OF_OPENING;
            fake = BELL;
        } else if (uhave.book) {
            real = SPE_BOOK_OF_THE_DEAD;
        } else if (uhave.menorah) {
            real = CANDELABRUM_OF_INVOCATION;
        } else {
            return; /* you have nothing of special interest */
        }

        /* If we get here, real and fake have been set up. */
        for (const obj of invent) {
            if (obj.otyp === real || (obj.otyp === fake && !mtmp.iswiz)) {
                ++n;
                otmp = obj;
            }
        }
        if (n > 1) {
            n = rnd(n);
            for (const obj of invent) {
                if ((obj.otyp === real
                     || (obj.otyp === fake && !mtmp.iswiz)) && !--n) {
                    otmp = obj;
                    break;
                }
            }
        }
    }

    if (otmp) { /* we have something to snatch */
        /* take off outer gear if we're targeting [hypothetical]
           quest artifact suit, shirt, gloves, or rings */
        if ((otmp === u.uarm || otmp === u.uarmu) && u.uarmc) {
            await worn_item_removal(mtmp, u.uarmc);
        }
        if (otmp === u.uarmu && u.uarm) {
            await worn_item_removal(mtmp, u.uarm);
        }
        if ((otmp === u.uarmg || ((otmp === u.uright || otmp === u.uleft) && u.uarmg))
            && u.uwep) {
            /* gloves are about to be unworn; unwield weapon(s) first */
            if (u.twoweap) { /* remove_worn_item(uswapwep) indirectly */
                await worn_item_removal(mtmp, u.uswapwep); /* clears u.twoweap */
            }
            await worn_item_removal(mtmp, u.uwep);
        }
        if ((otmp === u.uright || otmp === u.uleft) && u.uarmg) {
            /* calls Gloves_off() to handle wielded cockatrice corpse */
            await worn_item_removal(mtmp, u.uarmg);
        }

        /* finally, steal the target item */
        if (otmp.owornmask) {
            await worn_item_removal(mtmp, otmp);
        }
        if (otmp.unpaid) {
            subfrombill(otmp, shop_keeper((u.ushops || '')[0]));
        }
        freeinv(otmp);
        const buf = doname(otmp);
        mpickobj(mtmp, otmp); /* could merge and free otmp but won't */
        await pline(`${Some_Monnam(mtmp)} steals ${buf}!`);
        if (can_teleport(mtmp.data) && !(await tele_restrict(mtmp))) {
            await rloc(mtmp, RLOC_MSG);
        }
        await encumber_msg();
    }
}
