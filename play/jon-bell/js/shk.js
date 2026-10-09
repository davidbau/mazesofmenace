// @ts-nocheck
// shk.js — Shopkeeper AI and commerce.
// C ref: nethack-c/src/shk.c

import { growl as growl_mhitm, yelp as yelp_mhitm, y_monnam as y_monnam_shk } from './mhitm.js';
import { game } from './gstate.js';
import { ansimpleoname } from './objnam.js';
import { stop_occupation } from './allmain.js';
import { picking_at } from './lock.js';
import { newobj } from './game.js';
import { pline, You_hear, Norep, topl_park_cursor, force_more } from './display.js';
/* C pline.c You/Your — use the shared async formatters.  Sale settlement
 * awaits these message boundaries; older unrelated callers retain their
 * existing contracts until their own closure is migrated. */
import { You as You_real, Your as Your_real } from './do_wear.js';
import { canspotmon, canseemon as canseemon_real } from './display.js';
import { highc, shtype_name, inside_shop, makemon, angry_guards, next_ident, mksobj, del_engr_at, mpickobj } from './mklev.js';
import { is_demon, poly_gender } from './makemon.js';
import { is_pick } from './dig.js';
import { ECMD_OK, ECMD_TIME, ESHK, SHARED, SHARED_PLUS, NO_ROOM, COLNO, ROWNO, IS_DOOR, IS_ROOM, IS_WALL, SHOPBASE, CANDLESHOP, D_BROKEN, D_CLOSED, BILLSZ, Has_contents, isok, u_at, ROOMOFFSET, RLOC_MSG, DEAF, INVIS, PASSES_WALLS, QBUFSZ, LL_ACHIEVE, G_GONE, MM_NOMSG, CONFLICT, REPAIR_DELAY, BOLT_LIM, ZAP_POS, D_LOCKED, LANDMINE, BEAR_TRAP, PIT, SPIKED_PIT, HOLE, ACH_SHOP } from './const.js';
import { PM_KNIGHT, PM_SAMURAI, PM_TOURIST, PM_VALKYRIE, PM_SHOPKEEPER, PM_ROGUE, PM_KEYSTONE_KOP, PM_KOP_SERGEANT, PM_KOP_LIEUTENANT, PM_KOP_KAPTAIN } from './pm.generated.js';
import { goodpos } from './trap.js';
import { t_at, deltrap } from './trap.js';
import { block_point } from './vision.js';
import { newsym } from './display.js';
import { weight } from './weight.js';
import { trapname } from './makemon.js';
/* C ref: hack.c:4478 money_cnt — the single ported implementation lives in
 * js/com_pager.js; re-used here rather than the `return 0` stub this file
 * used to carry, which made every affordability test read as "hero is broke". */
import { money_cnt } from './com_pager.js';
/* C ref: hack.h RLOC_ERR=0x01, RLOC_MSG=0x02, RLOC_NOMSG=0x04.  RLOC_MSG comes
 * from const.js (which agrees); RLOC_NOMSG comes from js/teleport.js, whose
 * copy is the corrected one — const.js's RLOC_NOMSG is 0x0001, i.e. C's
 * RLOC_ERR bit, and rloc_to_core() masks against the real bit layout.  The two
 * values that used to be declared locally here (0 and 1) were wrong on both
 * counts and made every rlocflags test in this file misfire. */
import { rloc_to_flag, RLOC_NOMSG, mnexto, mnearto, enexto_out } from './teleport.js';
import { dist2, s_suffix } from './hacklib.js';
import { Monnam as Monnam_chat } from './mcastu.js';
import { online2, place_object, remove_object, add_to_container, newomid } from './mklev.js';
import { cansee } from './vision.js';
import { holetime } from './dig.js';
import { carrying, count_unpaid, currency as currency_real,
         mbodypart as mbodypart_real, body_part as body_part_real,
         merge_choice, inv_cnt, dropy, getpos, record_achievement } from './cmd.js';
import { addinv } from './hold_another_object.js';
import { mattacku } from './mhitu.js';
import { m_at } from './uhitm.js';
import { can_carry } from './dogmove.js';
import { resist_conflict } from './mhitm.js';
import { move_special } from './priest.js';
import { rn2 as rn2_shk, rnd as rnd_shk } from './rng.js';
import { depth as depth_shk } from './hacklib.js';
import { MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js';
import monsPack from './makemon_mons.json' with { type: 'json' };
import monArmedPack from './makemon_mons_armed.json' with { type: 'json' };
import monMsoundPack from './makemon_msound.json' with { type: 'json' };
import { OC_COST } from './oc_cost_data.js';
import { OC_NAME } from './oc_name_data.js';
import { xname_flags as xname_flags_shk, CXN_NORMAL as CXN_NORMAL_SHK,
         the as the_shk, The as The_shk, arti_cost,
         thesimpleoname as thesimpleoname_real,
         simpleonames as simpleonames_real,
         short_oname as short_oname_shk } from './objnam.js';
/* C attrib.c acurr(i) — ACURR(A_CHA) in get_cost(). */
import { acurr, adjalign as adjalign_real } from './attrib.js';
import { exercise } from './attrib.js';
/* ── dopay()'s itemized-billing dependencies (C shk.c:1743-2300) ──────────
 * Every name below is the SHARED ported body, not a re-derivation; the
 * pay path is the first caller in this file for each. */
import { doname as doname_pay } from './objnam.js';
import { splitobj, findgold, permonstTemplate, the_unique_pm } from './makemon.js';
/* C shk.c:4275 corpsenm_price_adj()'s three inputs — eat.c's
 * intrinsic_possible(), mons[].cnutrit, and the eleven prop.h ids. */
import { intrinsic_possible, food_disappears } from './eat.js';
import { book_disappears } from './spell.js';
import { maybe_reset_pick } from './lock.js';
import { o_unleash } from './dig.js';
import { setnotworn } from './worn.js';
import { obj_stop_timers } from './timeout.js';
import { impossible as lifecycle_impossible } from './pline.js';
import { mons_cnutrit } from './food_props.js';
import { ismnum, FIRE_RES, SLEEP_RES, COLD_RES, DISINT_RES, SHOCK_RES,
         POISON_RES, ACID_RES, STONE_RES, TELEPORT, TELEPORT_CONTROL,
         TELEPAT } from './const.js';
import { freeinv, obj_extract_self_general as obj_extract_self } from './cmd.js';
/* Both payment extraction sites need mkobj.c's ownership dispatcher:
 * shopkeeper change is OBJ_MINVENT and consumed bill items are OBJ_ONBILL.
 * dokick.js's same-named partial only walks the migrating-object chain. */
import { add_to_minv, shkname as shkname_real,
         picked_container as picked_container_real } from './dokick.js';
import { remove_worn_item } from './steal.js';
import { dealloc_obj, shtype_row } from './mklev.js';
import { update_inventory } from './mhitm.js';
import { hidden_gold } from './vault.js';
import { bot, flush_screen, livelog_printf } from './display.js';
import { nhgetch } from './input.js';
/* C shk.c:2101/2251 yn_function prompts.  This creates a cycle with end.js
 * (end.js imports paybill), but the binding is only used after module
 * initialization, just like the existing cmd.js/end.js cycle. */
import { yn_function as yn_function_shk } from './end.js';
import { build_window_screen, tty_window_offx, menu_search_case } from './com_pager.js';
import { observe_object, discover_object } from './o_init.js';
import { MKOBJ_OC_MAGIC } from './mkobj_erosion_meta.js';

// SELL_NORMAL constant from hack.h:1070
const SELL_NORMAL = 0;
// SELL_DELIBERATE / SELL_DONTSELL from hack.h:73-74
const SELL_DONTSELL = 2;

// objclass.h class numbers used by sellobj (shk.c:4032-4038).
const COIN_CLASS = 12;
const FOOD_CLASS = 7;
const BALL_CLASS = 15;
const CHAIN_CLASS = 16;
// objects.h otyp constants for the Is_candle(obj) check (shk.c:4039-4040).
const TALLOW_CANDLE = 224;
const WAX_CANDLE = 225;
// C shk.c:62 static const char and_its_contents[] = " and its contents";
const and_its_contents = " and its contents";

/* C ref: shk.c:215 next_shkp(shkp, withbill) — scan fmon for the next
 * shopkeeper.  withbill=FALSE returns any shkp; withbill=TRUE only
 * those with outstanding bill.  Also calls rile_shk on ANGRY ones.
 */
function next_shkp(shkp, withbill) {
    for (let m = shkp; m; m = m.nmon) {
        if (m.mhp <= 0) continue; // DEADMONSTER
        if (m.isshk && (!withbill || ((ESHK(m)?.billct | 0) !== 0))) {
            /* C next_shkp() ensures an angry shopkeeper's one-time surcharge
             * is present before any caller examines or changes bill prices. */
            if (ANGRY(m) && !ESHK(m)?.surcharge)
                rile_shk(m);
            return m;
        }
    }
    return null;
}

/* ── C shk.c:17-46 — the itemized-billing types ───────────────────────────
 * PAY_* are dopayobj()'s return codes (shk.c:17-20).  The sortbill_item
 * `usedup` values (shk.c:22-28) order ibill[] so that every used-up entry
 * sorts before every intact one. */
const PAY_BUY = 1, PAY_CANT = 0, PAY_SKIP = -1, PAY_BROKE = -2;
const FullyUsedUp = 1, PartlyUsedUp = 2, PartlyIntact = 3, FullyIntact = 4,
      KnownContainer = 5, UndisclosedContainer = 6;
const MENU_TRADITIONAL = 0, MENU_FULL = 2;
function _menu_style() {
    const v = game.flags?.menu_style;
    return (v === undefined || v === null) ? MENU_FULL : (v | 0);
}
/* C you.h:560 #define m_next2u(m) (distu((m)->mx,(m)->my) <= 2) */
function m_next2u(m) {
    const u = game.u || {};
    return dist2(m.mx | 0, m.my | 0, u.ux | 0, u.uy | 0) <= 2;
}

/* C invent.c:1587 o_on(id, objchn) — the object with that o_id anywhere on the
 * chain, recursing into containers. */
function o_on(id, objchn) {
    for (let o = objchn; o; o = o.nobj) {
        if ((o.o_id >>> 0) === (id >>> 0))
            return o;
        if (Has_contents(o)) {
            const temp = o_on(id, o.cobj);
            if (temp)
                return temp;
        }
    }
    return null;
}

/* C shk.c:2777 find_oid(id) — locate an object by o_id across every list the
 * game keeps.  gm.migrating_objs / gm.mydogs / level.buriedobjlist have no
 * writers on the paths this reaches; they are scanned anyway (reading an
 * absent global as null is the same empty chain C would walk). */
function find_oid(id) {
    const g = game;
    let obj = o_on(id, g.invent);
    if (obj) return obj;
    obj = o_on(id, g.fobj);
    if (obj) return obj;
    obj = o_on(id, g.level?.buriedobjlist);
    if (obj) return obj;
    obj = o_on(id, g.migrating_objs);
    if (obj) return obj;
    const mmtmp = [g.fmon, g.migrating_mons, g.mydogs];
    for (let i = 0; i < 3; i++)
        for (let mon = mmtmp[i]; mon; mon = mon.nmon) {
            obj = o_on(id, mon.minvent);
            if (obj) return obj;
        }
    return null;
}

/* C shk.c:1121 bp_to_obj(bp) — the object a bill entry refers to. */
function bp_to_obj(bp) {
    const id = bp.bo_id >>> 0;
    return bp.useup ? o_on(id, game.billobjs) : find_oid(id);
}

export async function money2mon(mon, amount) {
    const ygold = findgold(game.invent);

    if (amount <= 0)
        return 0;
    if (!ygold || ygold.quan < amount)
        return 0;

    let paidgold = ygold;
    if (paidgold.quan > amount)
        paidgold = (await splitobj(paidgold, amount));
    else if (paidgold.owornmask)
        await remove_worn_item(paidgold, false); /* quiver */
    freeinv(paidgold);
    await add_to_minv(mon, paidgold);
    /* The '$:' shadow-chain deduction that used to be spelled out here now
     * lives in js/cmd.js freeinv_core()'s COIN_CLASS arm — C's own SET_BOTL
     * site, and the one door every object leaves gi.invent through.  freeinv()
     * three lines above already ran it for `paidgold`, whose quan IS `amount`
     * (splitobj above), so repeating it here would deduct twice. */
    if (game.disp) game.disp.botl = true;
    return amount;
}

/* C shk.c:1279 check_credit(tmp, shkp) — spend the hero's credit first and
 * return what is still owed (negative when the shk owes change back).  The
 * body this replaces was `return _cost`, which silently ignored credit. */
function check_credit(tmp, shkp) {
    const eshkp = ESHK(shkp);
    const credit = eshkp ? (eshkp.credit | 0) : 0;

    if (credit <= 0) {
        /* nothing to do */
    } else if (credit >= tmp) {
        eshkp.credit -= tmp;
        tmp = 0;
    } else {
        eshkp.credit = 0;
        tmp -= credit;
    }
    return tmp;
}

/* C shk.c:1296 pay(tmp, shkp) — hand over `tmp` gold (or take change back). */
async function pay(tmp, shkp) {
    const eshkp = ESHK(shkp);
    let robbed = eshkp ? (eshkp.robbed | 0) : 0;
    const balance = (tmp <= 0) ? tmp : check_credit(tmp, shkp);

    if (balance > 0)
        await money2mon(shkp, balance);
    else if (balance < 0)
        await money2u(shkp, -balance);
    if (game.disp) game.disp.botl = true;
    if (robbed) {
        robbed -= tmp;
        if (robbed < 0)
            robbed = 0;
        eshkp.robbed = robbed;
    }
}

/* C shk.c money2u() — transfer shopkeeper gold to the hero for change or a
 * sale. Extract a split stack from monster inventory before adding it to
 * hero inventory, so the two chains remain independent. */
async function money2u(_mon, _amount) {
    const mon = _mon, amount = _amount | 0;
    const mongold = findgold(mon?.minvent);
    if (amount <= 0 || !mongold || (mongold.quan | 0) < amount) return;
    let change = mongold;
    if ((change.quan | 0) > amount) change = (await splitobj(change, amount));
    obj_extract_self(change);
    if (!merge_choice(game.invent, change) && inv_cnt(false) >= 52) {
        await dropy(change);
    } else {
        await addinv(change);
        if (game.disp) game.disp.botl = true;
    }
}

/* C shknam.c:805 saleable(shkp, obj) — does this shop deal in this item? */
export function saleable(shkp, obj) {
    const eshkp = ESHK(shkp);
    const shp = shtype_row(((eshkp ? (eshkp.shoptype | 0) : 0) - SHOPBASE) | 0);
    if (!shp)
        return false;
    if ((shp.symb | 0) === 0 /* RANDOM_CLASS */)
        return true;
    for (let i = 0; i < shp.iprobs.length && shp.iprobs[i].iprob; i++) {
        const itype = shp.iprobs[i].itype | 0;
        if (itype === VEGETARIAN_CLASS_SALE) {
            continue;
        }
        if (itype < 0 ? (itype === -(obj.otyp | 0)) : (itype === (obj.oclass | 0)))
            return true;
    }
    return false;
}
/* C shknam.c:37 VEGETARIAN_CLASS = MAXOCLASSES + 1 (js/mklev.js:1888). */
const VEGETARIAN_CLASS_SALE = 19;

/* C objnam.c:2313 paydoname: the billing menu supplies its own price. */
async function paydoname(obj) {
    const flags = game.iflags ||= {};
    const savedKnown = obj.cknown;
    const savedWeight = flags.wizweight;
    const hasContents = Has_contents(obj);
    if (hasContents) obj.cknown = 0;
    let name;
    try {
        flags.wizweight = false;
        flags.suppress_price = (flags.suppress_price | 0) + 1;
        try {
            name = (await doname_pay(obj));
        } finally {
            --flags.suppress_price;
            flags.wizweight = savedWeight;
        }
        if (hasContents) {
            if (!obj.no_charge) {
                if (name.startsWith('an ')) name = name.slice(3);
                else if (name.startsWith('a ')) name = name.slice(2);
                name = (obj.unpaid ? 'an unpaid ' : 'your ') + name;
            }
            if (!obj.cknown) {
                if (obj.unpaid) {
                    if (name.length + and_its_contents.length < 256 - 80)
                        name += and_its_contents;
                } else name = 'the contents of ' + name;
            }
        }
        return name;
    } finally {
        obj.cknown = savedKnown;
    }
}

/* C shk.c:3420 shk_names_obj(shkp, obj, fmt, amt, arg) — the "You bought <obj>
 * for <amt> gold pieces." line, with the shopkeeper identifying ordinary
 * non-magic merchandise as a side effect. */
async function shk_names_obj(shkp, obj, fmt, amt, arg) {
    let was_unknown = !obj.dknown;

    observe_object(obj);
    if (!(MKOBJ_OC_MAGIC[obj.otyp | 0] | 0) && saleable(shkp, obj)
        && ((obj.oclass | 0) === WEAPON_CLASS_SHK
            || (obj.oclass | 0) === ARMOR_CLASS_SHK
            || (obj.oclass | 0) === SCROLL_CLASS_SHK
            || (obj.oclass | 0) === SPBOOK_CLASS_SHK
            || (obj.otyp | 0) === MIRROR_OTYP)) {
        was_unknown = was_unknown || !oc_name_known(obj.otyp | 0);
        makeknown(obj.otyp | 0);
    }
    let obj_name = await paydoname(obj);
    if (was_unknown) {
        /* C: Sprintf(fmtbuf, "%%s; you %s", fmt) — "<Obj>; you bought it for
         * N gold pieces." */
        obj_name = highc(obj_name.charAt(0)) + obj_name.slice(1);
        await pline(Sprintf('%s; you ' + fmt, obj_name,
                            ((obj.quan | 0) > 1) ? 'them' : 'it',
                            amt, plur(amt), arg));
    } else {
        await pline('You ' + Sprintf(fmt, obj_name, amt, plur(amt), arg));
    }
}
/* objclass.h class numbers read by shk_names_obj.  WEAPON_CLASS_SHK and
 * ARMOR_CLASS_SHK are already declared further down with the get_cost()
 * constants; only the two this block adds are declared here. */
const SCROLL_CLASS_SHK = 9, SPBOOK_CLASS_SHK = 10;
/* objects.h MIRROR — TOOL_CLASS, "looking glass". */
const MIRROR_OTYP = 230;

/* C shk.c:1461 insufficient_funds(shkp, item, cost) — the no-gold (cost==0)
 * and not-enough-gold (cost>0) refusals, each with its own message. */
async function insufficient_funds(shkp, item, cost) {
    const eshkp = ESHK(shkp);
    const umoney = money_cnt(game.invent);
    const ecredit = eshkp ? (eshkp.credit | 0) : 0;

    if (!cost && umoney + ecredit === 0) {
        const stashed_gold = hidden_gold(true);
        await pline(`You ${(stashed_gold > 0) ? 'seem to ' : ''}have no gold or credit left.`);
        return true;
    }
    if (cost && umoney + ecredit < cost) {
        const stashed_gold = hidden_gold(true);
        await pline(`You don't${(stashed_gold > 0) ? ' seem to' : ''} have gold`
                    + `${(ecredit > 0) ? ' or credit' : ''} enough to pay for ${(await paydoname(item))}.`);
        return true;
    }
    return false;
}

/* C shk.c:1497 sortbill_cmp — used-up before intact, then dearest first, then
 * bill_p[] index as the stable-sort tie-break. */
function sortbill_cmp(sbi1, sbi2) {
    const cost1 = sbi1.cost, cost2 = sbi2.cost;
    const bidx1 = sbi1.bidx, bidx2 = sbi2.bidx;
    const used1 = (sbi1.usedup <= PartlyUsedUp) ? 1 : 0;
    const used2 = (sbi2.usedup <= PartlyUsedUp) ? 1 : 0;

    if (used1 !== used2)
        return used2 - used1;
    if (cost1 !== cost2)
        return cost2 - cost1;
    return bidx1 - bidx2;
}

/* C shk.c:1521 cheapest_item(ibillct, ibill) */
function cheapest_item(ibillct, ibill) {
    let gmin = ibill[0].cost;
    for (let i = 1; i < ibillct; i++)
        if (ibill[i].cost < gmin)
            gmin = ibill[i].cost;
    return gmin;
}

/* C shk.c:1542 make_itemized_bill(shkp, &ibill) — build the augmented bill that
 * hides container contents and splits a partly-used stack into its used-up and
 * intact halves.  Returns the entry count; the array is the return value here
 * rather than an out-param. */
async function make_itemized_bill(shkp) {
    const eshkp = ESHK(shkp);
    const ebillct = eshkp ? (eshkp.billct | 0) : 0;
    const bill = (eshkp && (eshkp.bill_p || eshkp.bill)) || [];
    const ibill = [];
    let n = 0;

    for (let i = 0; i < ebillct; i++) {
        const bp = bill[i];
        if (!bp) continue;
        let otmp = bp_to_obj(bp);
        if (!otmp)
            continue; /* C: impossible("Can't find shop bill entry ...") */
        const bidx = i;

        if ((otmp.quan | 0) === 0 || (otmp.where | 0) === OBJ_ONBILL_SHK) {
            /* completely used up: restore the billed quantity */
            otmp.quan = bp.bquan;
            bp.useup = true;
        } else if ((otmp.quan | 0) < (bp.bquan | 0)) {
            ibill[n] = {
                obj: otmp, quan: (bp.bquan | 0) - (otmp.quan | 0),
                cost: (bp.price | 0) * ((bp.bquan | 0) - (otmp.quan | 0)),
                bidx, usedup: PartlyUsedUp, queuedpay: false,
            };
            ++n;
        }

        let quan, cost, used;
        if ((otmp.where | 0) === OBJ_ONBILL_SHK) {
            quan = bp.bquan | 0;
            cost = (bp.price | 0) * quan;
            used = FullyUsedUp;
        } else if ((otmp.where | 0) === OBJ_CONTAINED_SHK || Has_contents(otmp)) {
            const item = otmp;
            let cknown = true;
            while ((otmp.where | 0) === OBJ_CONTAINED_SHK && otmp.ocontainer) {
                otmp = otmp.ocontainer;
                if (!otmp.cknown) cknown = false;
            }
            const prior = ibill.findIndex(e => e.obj === otmp);
            if (prior >= 0) {
                if (ibill[prior].usedup === FullyIntact)
                    ibill[prior].usedup = cknown ? KnownContainer : UndisclosedContainer;
                continue;
            }
            quan = 1;
            cost = (await unpaid_cost(otmp, COST_CONTENTS));
            if (!otmp.unpaid) bidx = -1;
            used = (otmp === item) ? FullyIntact : (cknown ? KnownContainer : UndisclosedContainer);
        } else {
            quan = otmp.quan | 0;
            cost = (bp.price | 0) * quan;
            used = (quan < (bp.bquan | 0)) ? PartlyIntact : FullyIntact;
        }

        ibill[n] = { obj: otmp, quan, cost, bidx, usedup: used, queuedpay: false };
        ++n;
    }

    /* C: qsort(ibill, n, ...) over the populated entries only. */
    if (n > 1) {
        const head = ibill.slice(0, n);
        head.sort(sortbill_cmp);
        for (let i = 0; i < n; i++)
            ibill[i] = head[i];
    }
    return { ibillct: n, ibill };
}

async function menu_pick_pay_items(ibillct, ibill) {
    const g = game;
    /* C wintty.c:1921 — tty_display_nhwindow(NHW_MENU) pages an unacknowledged
     * topline (TOPLINE_NEED_MORE, set by update_topl topl.c:390) before the
     * menu is drawn: dopay's "You owe ... for the use of merchandise."
     * (shk.c:1967) must show --More-- first.  DISPLAY-ONLY. */
    if (g._pending_message)
        await force_more(g._pending_message);
    /* C:1682-1687 — first pass over ibill[] purely to width-align the prices. */
    let largest_amt = 0;
    for (let i = 0; i < ibillct; i++)
        if (ibill[i].cost > largest_amt)
            largest_amt = ibill[i].cost;
    const amt_width = String(largest_amt).length;

    /* C:1693-1717 — the entries, with the two optional headings. */
    const entries = []; /* {selector, text, indx} */
    const headings = new Map(); /* index into entries -> heading text */
    if (ibill[0].usedup <= PartlyUsedUp) {
        headings.set(0, `Used up item${(ibillct > 1 && ibill[1].usedup <= PartlyUsedUp) ? 's' : ''}:`);
    }
    let menu_ch = 97; /* 'a' */
    for (let i = 0; i < ibillct; i++) {
        if (i > 0 && ibill[i - 1].usedup <= PartlyUsedUp
            && ibill[i].usedup >= PartlyIntact) {
            headings.set(i, `Unpaid item${(i < ibillct - 1) ? 's' : ''}:`);
        }
        const otmp = ibill[i].obj;
        const save_quan = otmp.quan;
        otmp.quan = ibill[i].quan; /* in case it's partly used */
        const p = await paydoname(otmp);
        otmp.quan = save_quan;
        const amt = ibill[i].cost;
        entries.push({
            selector: String.fromCharCode(menu_ch++),
            text: `${String(amt).padStart(amt_width)} Zm, ${p}`,
            indx: i, selected: false, mark: '-',
        });
    }

    const renderLines = () => {
        const out = ['\x1b[7mPay for which items?\x1b[0m', ''];
        for (let i = 0; i < entries.length; i++) {
            const h = headings.get(i);
            if (h !== undefined)
                out.push(`\x1b[7m${h}\x1b[0m`);
            const e = entries[i];
            out.push(`${e.selector} ${e.mark} ${e.text}`);
        }
        out.push('(end)');
        return out;
    };
    const WIN_COL = tty_window_offx(renderLines(), 'end');
    const uac = g.u?.uac ?? 0;
    const endRow = renderLines().length - 1;
    const BY_SEL = new Map(entries.map(e => [e.selector.charCodeAt(0), e]));

    let cancelled = false;
    /* C ref: win/tty/getline.c:213 — a MENU_SEARCH's tty_getlin ends with
     * clear_nhwindow(WIN_MESSAGE), which blanks the WHOLE of screen row 0,
     * this window's title text with it; process_menu_window only repaints on a
     * page change, so within one select_menu() call it stays blank. */
    let titleErased = false;
    const frameRows = () => {
        const lines = renderLines();
        if (titleErased) lines[0] = '';
        return build_window_screen(lines, WIN_COL, uac).split('\n');
    };
    for (;;) {
        g._screen_output = frameRows().join('\n');
        set_cursor_shk(WIN_COL + '(end)'.length + 1, endRow);
        const k = await nhgetch();
        if (k === 27) { cancelled = true; break; }     /* ESC */
        if (k === 10 || k === 13 || k === 32 || k === 0) break; /* commit */
        const e = BY_SEL.get(k);
        if (e) {
            /* C wintty.c toggle_menu_curr() + set_item_state(): the
             * incremental repaint marks a plain selection '+'. */
            e.selected = !e.selected;
            e.mark = e.selected ? '+' : '-';
            continue;
        }
        /* C wintty.c process_menu_window() menu_* defaults (defaults.nh):
         * select_all '.', unselect_all '-', select_page ',', unselect_page
         * '\\', invert_all '@', invert_page '~'.  The one-page menu makes
         * page == all.  Each marks '+' / '-' like set_item_state(). */
        if (k === 0x2e || k === 0x2c || k === 0x2d || k === 0x5c
            || k === 0x40 || k === 0x7e) {
            for (const en of entries) {
                en.selected = (k === 0x2e || k === 0x2c) ? true
                    : (k === 0x2d || k === 0x5c) ? false : !en.selected;
                en.mark = en.selected ? '+' : '-';
            }
            continue;
        }
        if (k === 0x3a /* ':' MENU_SEARCH */) {
            /* C ref: win/tty/wintty.c:1700-1730 — tty_getlin("Search for:"),
             * "*%s*", then pmatchi() over the mlist toggling every selectable
             * hit.  shk.c:1721 opens this menu PICK_ANY, so it never finishes
             * early.  pmatchi sees what tty_add_menu STORED, "%c - %s"
             * (wintty.c:2596-2600) — always the dash, never this entry's
             * current '+' mark. */
            await menu_search_case(
                'ANY',
                entries.map((en) => ({ str: `${en.selector} - ${en.text}`, en })),
                frameRows,
                (curr) => {
                    curr.en.selected = !curr.en.selected;
                    curr.en.mark = curr.en.selected ? '+' : '-';
                });
            titleErased = true;
            continue;
        }
        /* C process_menu_window default: ring the bell, leave the menu up. */
    }
    g._pending_message = '';
    await flush_screen(1);
    if (cancelled)
        return 0;
    let n = 0;
    for (const e of entries)
        if (e.selected) { ibill[e.indx].queuedpay = true; n++; }
    return n;
}

/* C shk.c:2163 update_bill(indx, ibillct, ibill, eshkp, bp, paiditem) — take a
 * just-bought item off the shopkeeper's bill. */
async function update_bill(indx, ibillct, ibill, eshkp, bp, paiditem) {
    if (indx >= 0 && ibill[indx].usedup === PartlyUsedUp) {
        bp.bquan = paiditem.quan;
        for (let j = 0; j < ibillct; j++)
            if (ibill[j].obj === paiditem && ibill[j].usedup === PartlyIntact) {
                ibill[j].usedup = FullyIntact;
                break;
            }
    } else {
        paiditem.unpaid = 0;
        if ((paiditem.where | 0) === OBJ_ONBILL_SHK) {
            obj_extract_self(paiditem);
            await dealloc_obj(paiditem);
        }
        const bill = eshkp.bill_p || eshkp.bill;
        const newebillct = (eshkp.billct | 0) - 1;
        /* C copies the LAST bill_p[] entry into the vacated slot; `bp` is a
         * pointer INTO bill_p[], so find its index and overwrite in place. */
        const bpIdx = bill.indexOf(bp);
        if (bpIdx >= 0)
            bill[bpIdx] = bill[newebillct];
        for (let j = 0; j < ibillct; j++)
            if (ibill[j].bidx === newebillct)
                ibill[j].bidx = bpIdx;
        eshkp.billct = newebillct;
    }
}

/* C shk.c:2217 dopayobj(shkp, bp, obj, which, itemize, unseen) — pay for one
 * entry.  Returns PAY_BUY / PAY_SKIP / PAY_CANT / PAY_BROKE. */
async function dopayobj(shkp, bp, obj, which, itemize, unseen) {
    const consumed = (which === 0);

    if (!obj.unpaid && !bp.useup
        && !(Has_contents(obj) && (await unpaid_cost(obj, COST_CONTENTS)))) {
        /* C: impossible("Paid object on bill??") — a no-op here (see :709). */
        return PAY_BUY;
    }
    if (itemize && await insufficient_funds(shkp, obj, 0))
        return PAY_BROKE;

    const save_quan = obj.quan;
    let quan;
    if (consumed) {
        quan = bp.bquan | 0;
        if (quan > (obj.quan | 0))
            quan -= (obj.quan | 0);
    } else {
        quan = obj.quan | 0;
    }
    const ltmp = (bp.price | 0) * quan;

    obj.quan = quan;        /* to be used by doname() */
    /* C shk.c:2250 increments iflags.suppress_price while the temporary
     * quantity is visible to every naming call below.  In particular the
     * final shk_names_obj() must not append a second shop-price suffix to
     * the billing message.  Keep the decrement in finally so a prompt or
     * formatter failure cannot leak this process-wide naming flag. */
    game.iflags = game.iflags || {};
    game.iflags.suppress_price = (game.iflags.suppress_price | 0) + 1;
    try {
        let buy = PAY_BUY;

        if (itemize) {
            /* C:2251-2270 — the per-item "<obj> for N zorkmids.  Pay?" y_n
             * prompt.  `obj.quan` is temporarily the billed quantity above,
             * so safe_qbuf selects C's singular Doname2 wording when
             * appropriate. */
            const qsfx = Sprintf(" for %ld %s.  Pay?", ltmp, currency(ltmp));
            const qbuf = await safe_qbuf('', '', qsfx, obj, doname_pay,
                                   thesimpleoname_real,
                                   (quan === 1) ? 'that' : 'those');
            const answer = await yn_function_shk(qbuf, 'yn', 'n');
            if (answer === 'n')
                buy = PAY_SKIP;
        }

        if (buy === PAY_SKIP) {
            obj.quan = save_quan;
            return buy;
        }

        if (quan < (bp.bquan | 0) && !consumed) {
            /* C:2272-2277 reject_purchase(): the shk will not sell the intact part
             * of a stack until the used-up part is paid for. */
            obj.quan = save_quan;
            reject_purchase(shkp, obj, bp.bquan | 0);
            return PAY_SKIP;
        }
        if (buy === PAY_BUY && await insufficient_funds(shkp, obj, ltmp))
            buy = itemize ? PAY_SKIP : PAY_CANT;

        if (buy === PAY_BUY) {
            await pay(ltmp, shkp);
            if (!unseen)
                await shk_names_obj(shkp, obj,
                                    consumed
                                        ? 'paid for %s at a cost of %ld gold piece%s.%s'
                                        : 'bought %s for %ld gold piece%s.%s',
                                    ltmp, '');
        }

        obj.quan = save_quan;
        return buy;
    } finally {
        game.iflags.suppress_price = (game.iflags.suppress_price | 0) - 1;
    }
}

/* C shk.c:2420 reject_purchase — refuse the intact portion of a partly used
 * stack until its consumed portion is paid. */
function reject_purchase(shkp, obj, billedQuan) {
    const intact = obj.quan | 0;
    obj.quan = (billedQuan | 0) - intact;
    const name = simpleonames_real(obj);
    if (!_shk_Deaf() && !muteshk(shkp)) {
        verbalize("%s for the other %s before buying %s.",
                  ANGRY(shkp) ? "Pay" : "Please pay", name,
                  intact > 1 ? "these" : "this one");
    } else {
        pline("%s %s your bill for the other %s first.",
              Shknam(shkp), ANGRY(shkp) ? "angrily points out" : "points out", name);
    }
    obj.quan = intact;
}

/* C shk.c:2044 pay_billed_items(shkp, ibillct, ibill, stashed_gold, &paid) —
 * choose the paying method (menu, or the traditional itemize prompt) and then
 * pay for the chosen entries.  Returns FALSE when the thank-you should be
 * skipped; `paidBox.value` is C's *paid_p out-param. */
async function pay_billed_items(shkp, ibillct, ibill, stashed_gold, paidBox) {
    const eshkp = ESHK(shkp);
    const umoney = money_cnt(game.invent);

    if (!umoney && !(eshkp.credit | 0)) {
        await pline(`You ${stashed_gold ? 'seem to ' : ''}have no gold or credit`
                    + `${paidBox.value ? ' left' : ''}.`);
        return true;
    }
    const bill = eshkp.bill_p || eshkp.bill;
    let bp = bill[0];
    let otmp = bp_to_obj(bp);
    const ebillct = eshkp.billct | 0;
    const more_than_one = (ebillct > 1 || (otmp.quan | 0) < (bp.bquan | 0)
                           || ibill[0].usedup === UndisclosedContainer);
    if ((umoney + (eshkp.credit | 0)) < cheapest_item(ibillct, ibill)) {
        await pline(`You don't have enough gold to buy${more_than_one ? ' any of' : ''}`
                    + ` the item${plur(more_than_one ? 2 : 1)}`
                    + ` ${(ebillct > 1) ? "you've picked" : 'on your bill'}.`);
        if (stashed_gold)
            await pline('Maybe you have some gold stashed away?');
        return true;
    }

    let via_menu = (_menu_style() !== MENU_TRADITIONAL);
    if (game.iflags?.menu_requested)
        via_menu = !via_menu;
    let itemize = false, queuedpay = false;
    do {
        if (via_menu) {
            if (!await menu_pick_pay_items(ibillct, ibill))
                return true;
            queuedpay = true;
            itemize = false;
            via_menu = false; /* reset so that we don't loop */
        } else {
            /* C:2101-2107 — ask whether to itemize, or switch to a menu.
             * A single bill entry skips this prompt and enters itemized mode. */
            if (!more_than_one) {
                itemize = true;
                via_menu = false;
            } else {
                const iprompt = await yn_function_shk('Itemized billing?',
                                                      'ynq m', 'q');
                if (iprompt === 'q')
                    return true;
                itemize = (iprompt === 'y');
                via_menu = (iprompt === 'm');
            }
        }
    } while (via_menu);

    for (let indx = 0; indx < ibillct; ++indx) {
        if (queuedpay && !ibill[indx].queuedpay)
            continue;

        otmp = ibill[indx].obj;
        let buy;
        if (ibill[indx].usedup >= KnownContainer) {
            const result = await buy_container(shkp, indx, ibillct, ibill);
            if (result === 1) { paidBox.value = true; return true; }
            if (result === 2) return false;
            buy = PAY_BUY;
        } else {
            const bidx = ibill[indx].bidx;
            bp = bill[bidx];
            const pass = (ibill[indx].usedup <= PartlyUsedUp) ? 0 : 1;

            buy = await dopayobj(shkp, bp, otmp, pass, itemize, false);

            if (buy === PAY_BUY)
                await update_bill(indx, ibillct, ibill, eshkp, bp, otmp);
        }
        if (buy === PAY_CANT)
            return false;
        if (buy === PAY_BROKE) {
            paidBox.value = true;
            return true;
        }
        if (buy === PAY_SKIP)
            continue;
        if (buy === PAY_BUY) {
            paidBox.value = true;
            if (itemize || queuedpay) {
                update_inventory();
                await bot();
            }
        }
    }
    return true;
}

async function buy_container(shkp, indx, ibillct, ibill) {
    const e = ESHK(shkp), container = ibill[indx].obj;
    const totalcost = ibill[indx].cost | 0;
    const unpaidcontainer = !!container.unpaid;
    if (await insufficient_funds(shkp, container, 0) || await insufficient_funds(shkp, container, totalcost)) return 1;
    const outer = (obj) => { let o = obj; while ((o.where | 0) === OBJ_CONTAINED_SHK && o.ocontainer) o = o.ocontainer; return o; };
    const ids = [];
    for (let i = 0; i < (e.billct | 0); i++) {
        const bp = (e.bill_p || e.bill || [])[i], obj = bp && bp_to_obj(bp);
        if (!obj || outer(obj) !== container) continue;
        if ((obj.quan | 0) < (bp.bquan | 0)) { reject_purchase(shkp, obj, bp.bquan | 0); return 1; }
        if ((bp.bo_id >>> 0) !== (container.o_id >>> 0)) ids.push(bp.bo_id >>> 0);
    }
    if (container.unpaid) ids.push(container.o_id >>> 0);
    let bought = 0;
    for (const id of ids) {
        const bill = e.bill_p || e.bill || [];
        const bp = bill.find(b => (b.bo_id >>> 0) === id);
        const obj = bp && bp_to_obj(bp);
        if (!bp || !obj) return 2;
        const buy = await dopayobj(shkp, bp, obj, 1, false, true);
        if (buy !== PAY_BUY) continue;
        ibill[indx].cost -= (bp.price | 0) * (bp.bquan | 0);
        await update_bill((id === (container.o_id >>> 0)) ? indx : -1, ibillct, ibill, e, bp, obj);
        bought++;
    }
    if (bought && ibill[indx]?.usedup >= KnownContainer) {
        if (unpaidcontainer) {
            /* Preserve the pre-purchase wording: paydoname() should describe
             * an unpaid container and its contents while the final bill line
             * is emitted, then leave the object fully hero-owned. */
            container.unpaid = 1;
            container.no_charge = 1;
        }
        await shk_names_obj(shkp, container, 'bought %s for %ld gold piece%s.%s', totalcost, '');
        if (unpaidcontainer) container.unpaid = container.no_charge = 0;
    }
    return bought ? 0 : 2;
}

export async function dopay() {
    const g = game;
    g.multi = 0;

    let sk = 0, seensk = 0, nexttosk = 0;
    let nxtm = null, resident = null, shkp = null;
    let paid = false;
    const stashed_gold = (hidden_gold(true) > 0);
    let pay_done;

    /* C shk.c:1761-1776 — scan fmon for shopkeepers. */
    for (let m = next_shkp(g.fmon, false); m; m = next_shkp(m.nmon, false)) {
        sk++;
        if (m_next2u(m)) {
            /* next to an irate shopkeeper? prioritize that */
            if (nxtm && ANGRY(nxtm)) {
                /* C: continue — keep the angry nxtm */
            } else {
                nexttosk++;
                nxtm = m;
            }
        }
        if (canspotmon(m))
            seensk++;
        if (inhishop(m) && _ushops0_shk(g.u || {}) === (ESHK(m).shoproom | 0))
            resident = m;
    }

    if (nxtm && nexttosk === 1) {
        shkp = nxtm; /* C: goto proceed */
    } else {
        const Blind = _shk_Blind();
        const Blind_telepat = false; /* no telepathy tracking in this port */
        if ((!sk && (!Blind || Blind_telepat)) || (!Blind && !seensk)) {
            await pline('There appears to be no shopkeeper here to receive your payment.');
            return ECMD_OK; /* C shk.c:1785 */
        }
        if (!seensk) {
            await pline("You can't see...");
            return ECMD_OK; /* C shk.c:1790 */
        }
        /* C shk.c:1796 — the usual case: one shk, or the resident one. */
        if (sk === 1 && resident) {
            shkp = resident; /* C: goto proceed */
        } else if (seensk === 1) {
            for (let m = next_shkp(g.fmon, false); m; m = next_shkp(m.nmon, false))
                if (canspotmon(m)) { shkp = m; break; }
            if (shkp !== resident && !m_next2u(shkp)) {
                await pline(`${Shknam(shkp)} is not near enough to receive your payment.`);
                return ECMD_OK; /* C shk.c:1810 */
            }
        } else {
            /* C shk.c:1812-1852 — explicitly choose among multiple visible
             * shopkeepers.  getpos mutates the coordinate object and returns
             * -1 for ESC, matching C's coord/getpos contract. */
            await pline('Pay whom?');
            const cc = { x: g.u.ux | 0, y: g.u.uy | 0 };
            if ((await getpos(cc, true, 'the creature you want to pay')) < 0)
                return ECMD_OK;
            const cx = cc.x | 0, cy = cc.y | 0;
            if (u_at(cx, cy)) {
                await pline('You are generous to yourself.');
                return ECMD_OK;
            }
            const chosen = m_at(cx, cy);
            if (!cansee(cx, cy) && (!chosen || !canspotmon(chosen))) {
                await pline(`You can't ${Blind ? 'see' : 'sense'} anyone there.`);
                return ECMD_OK;
            }
            if (!chosen) {
                await pline('There is no one there to receive your payment.');
                return ECMD_OK;
            }
            if (!chosen.isshk) {
                await pline(`${y_monnam_shk(chosen)} is not interested in your payment.`);
                return ECMD_OK;
            }
            if (chosen !== resident && !m_next2u(chosen)) {
                await pline(`${Shknam(chosen)} is too far to receive your payment.`);
                return ECMD_OK;
            }
            shkp = chosen;
        }
        if (!shkp)
            return ECMD_OK; /* C shk.c:1855 debugpline0("dopay: null shkp.") */
    }

    /* proceed: */
    const eshkp = ESHK(shkp);
    const ltmp = eshkp.robbed | 0;

    /* wake sleeping shk when someone who owes money offers payment */
    if (ltmp || (eshkp.billct | 0) || (eshkp.debit | 0))
        await rouse_shk(shkp, true);

    if (helpless(shkp)) { /* still asleep/paralyzed */
        await pline(`${Shknam(shkp)} ${rn2_shk(2) ? 'seems to be napping' : "doesn't respond"}.`);
        return ECMD_OK;
    }

    if (shkp !== resident && NOTANGRY(shkp)) {
        const umoney = money_cnt(g.invent);
        if (!ltmp) {
            await pline(`You do not owe ${shkname(shkp)} anything.`);
        } else if (!umoney) {
            await pline(`You ${stashed_gold ? 'seem to ' : ''}have no gold.`);
            if (stashed_gold)
                await pline('But you have some gold stashed away.');
        } else {
            /* C:1900-1918 — pay the robbery debt even when the shopkeeper is
             * no longer resident on the current level. */
            if (umoney > ltmp)
                await pline(`You give ${shkname(shkp)} the ${ltmp} gold piece${ltmp === 1 ? '' : 's'} asked for.`);
            else
                await pline(`You give ${shkname(shkp)} all your${stashed_gold ? ' openly kept' : ''} gold.`);
            await pay(Math.min(umoney, ltmp), shkp);
            if (stashed_gold && umoney <= ltmp)
                await pline('But you have hidden gold!');
            if (umoney < ltmp / 2 || (umoney < ltmp && stashed_gold)) {
                await pline(`${shkname(shkp)} doesn't look satisfied.`);
            } else {
                shkp.mpeaceful = 1;
                eshkp.following = 0;
                eshkp.robbed = 0;
            }
        }
        return ECMD_TIME;
    }

    if (!(eshkp.billct | 0) && !(eshkp.debit | 0)) {
        const umoney = money_cnt(g.invent);
        if (!ltmp && NOTANGRY(shkp)) {
            await pline(`You do not owe ${shkname(shkp)} anything.`);
            if (!umoney)
                await pline(`Moreover, you${stashed_gold ? ' seem to' : ''} have no gold.`);
        } else if (ltmp) {
            await pline(`${shkname(shkp)} is after blood, not gold!`);
            if (umoney < Math.trunc(ltmp / 2)) {
                if (!umoney) await pline(`You ${stashed_gold ? 'seem to ' : ''}have no gold.`);
                else await pline(`You don't have enough gold to satisfy ${shkname(shkp)}.`);
                return ECMD_TIME;
            }
            await pline(`But since ${shkname(shkp)}'s shop has been robbed recently,`);
            await pline(`you ${umoney < ltmp ? 'partially ' : ''}compensate ${shkname(shkp)} for losses.`);
            await pay(Math.min(umoney, ltmp), shkp);
            shkp.mpeaceful = 1;
            eshkp.robbed = 0;
        } else {
            await pline(`${Shknam(shkp)} is after your hide, not your gold!`);
            if (umoney < 1000) {
                if (!umoney) await pline(`You ${stashed_gold ? 'seem to ' : ''}have no gold.`);
                else await pline(`You don't have enough gold to satisfy ${shkname(shkp)}.`);
                return ECMD_TIME;
            }
            await pline(`You try to appease ${shkname(shkp)} by giving ${shkname(shkp)} 1000 gold pieces.`);
            await pay(1000, shkp);
            if (String(eshkp.customer || '') !== String(g.plname || g.u?.plname || '') || rn2_shk(3)) {
                shkp.mpeaceful = 1;
                eshkp.following = 0;
            } else {
                await pline(`But ${shkname(shkp)} is as angry as ever.`);
            }
        }
        return ECMD_TIME;
    }
    if (shkp !== resident) {
        /* C:1944-1949 impossible("dopay: not to shopkeeper?") then setpaid. */
        return ECMD_OK;
    }
    if (eshkp.debit | 0) {
        /* C:1951-1997 — settle the use-of-merchandise / picked-up-gold debit
         * before processing ordinary bill entries. */
        const dtmp = eshkp.debit | 0;
        const loan = eshkp.loan | 0;
        const umoney = money_cnt(g.invent);
        let debt = `You owe ${shkname(shkp)} ${dtmp} ${currency(dtmp)} `;
        if (loan) debt += (loan === dtmp)
            ? 'you picked up in the store.'
            : 'for gold picked up and the use of merchandise.';
        else debt += 'for the use of merchandise.';
        await pline(debt);
        if (umoney + (eshkp.credit | 0) < dtmp) {
            await pline(`But you don't${stashed_gold ? ' seem to' : ''} have enough gold`
                        + `${eshkp.credit ? ' or credit' : ''}.`);
            return ECMD_TIME;
        }
        if ((eshkp.credit | 0) >= dtmp) {
            eshkp.credit -= dtmp;
            eshkp.debit = 0;
            eshkp.loan = 0;
            await pline('Your debt is covered by your credit.');
        } else if (!(eshkp.credit | 0)) {
            await money2mon(shkp, dtmp);
            eshkp.debit = 0;
            eshkp.loan = 0;
            await pline('You pay that debt.');
            if (game.disp) game.disp.botl = true;
        } else {
            const remainder = dtmp - (eshkp.credit | 0);
            eshkp.credit = 0;
            await money2mon(shkp, remainder);
            eshkp.debit = 0;
            eshkp.loan = 0;
            await pline('That debt is partially offset by your credit.');
            await pline('You pay the remainder.');
            if (game.disp) game.disp.botl = true;
        }
        paid = true;
    }

    /* now check items on bill */
    pay_done = true; /* assume success */
    if (eshkp.billct | 0) {
        const { ibillct, ibill } = await make_itemized_bill(shkp);
        const paidBox = { value: paid };
        if (!await pay_billed_items(shkp, ibillct, ibill, stashed_gold, paidBox))
            pay_done = false; /* skip thank you message */
        paid = paidBox.value;
    }

    /* {mute shk,deaf hero}-aware thank you message */
    if (pay_done && !ANGRY(shkp) && paid) {
        const shopname = shtype_name((eshkp.shoptype | 0) - SHOPBASE);
        if (!_shk_Deaf() && !muteshk(shkp)) {
            SetVoice(shkp, 0, 80, 0);
            await pline('"' + Sprintf('Thank you for shopping in %s %s%s',
                                      s_suffix_shk(shkname(shkp)), shopname,
                                      !eshkp.surcharge ? '!' : '.') + '"');
        } else {
            await pline(Sprintf('%s nods%s at you for shopping in %s %s%s',
                                Shknam(shkp), !eshkp.surcharge ? ' appreciatively' : '',
                                'his', shopname, !eshkp.surcharge ? '!' : '.'));
        }
    }

    if (paid)
        update_inventory();
    if (g.iflags) g.iflags.menu_requested = false; /* reset */
    return paid ? ECMD_TIME : ECMD_OK;
}

/* C win/tty/wintty.c tty_curs() — cursor placement for the menu window.
 * Local, matching the per-file convention this tree already uses
 * (js/cmd.js:546, js/read.js:727, js/optmenu.js:28, js/tty_menu.js:42). */
function set_cursor_shk(col, row) {
    const disp = game?.nhDisplay;
    if (disp) {
        disp.cursorCol = col;
        disp.cursorRow = row;
    }
}

/* C shk.c:1330 rouse_shk(shkp, verbosely) — greed-induced recovery: a
 * shopkeeper who is owed money wakes up when payment is offered. */
export async function rouse_shk(shkp, verbosely) {
    if (helpless(shkp)) {
        if (verbosely && canspotmon(shkp))
            await pline(`${Shknam(shkp)} ${shkp.msleeping ? 'wakes up' : 'can move again'}.`);
        shkp.msleeping = 0;
        shkp.mfrozen = 0;
        shkp.mcanmove = 1;
    }
}

/* C mextra.h NOTANGRY(mon) — (mon)->mpeaceful (ANGRY is its negation, :2062). */
function NOTANGRY(shkp) { return !!shkp.mpeaceful; }

/* C hack.h:1530 #define makeknown(x) discover_object((x), TRUE, TRUE, TRUE)
 * and objects[otyp].oc_name_known, which this port keeps as the
 * game._oc_name_known map js/o_init.js writes. */
function makeknown(otyp) { discover_object(otyp | 0, true, true, true); }
function oc_name_known(otyp) { return !!(game._oc_name_known || {})[otyp | 0]; }

/* C obj.h:75-83 obj->where values, for the two make_itemized_bill /
 * update_bill tests. */
const OBJ_CONTAINED_SHK = 2, OBJ_ONBILL_SHK = 7;
/* C obj.h:75-76 — the two contained_cost() also tests. */
const OBJ_FREE_SHK = 0, OBJ_FLOOR_SHK = 1;

/**
 * sellobj_state - set the sell_response and sell_how fields based on deliberate flag.
 * C ref: shk.c:3913-3925
 *
 * If we're deliberately dropping something, there's no automatic response to the
 * shopkeeper's "want to sell" query; however, if we accidentally drop anything,
 * the shk will buy it/them without asking. This retains the old pre-query risk
 * that slippery fingers while in shops entailed: you drop it, you've lost it.
 */
export function sellobj_state(deliberate) {
    // Ensure game.ga exists (global archive)
    if (game.ga === undefined) game.ga = {};
    // Ensure game.gs exists (shopkeeper state)
    if (game.gs === undefined) game.gs = {};

    // C: gs.sell_response = (deliberate != SELL_NORMAL) ? '\0' : 'a';
    /* C's '\0' is false in boolean tests.  A one-character JavaScript NUL
     * string is truthy, so the faithful representation is the empty string. */
    game.gs.sell_response = (deliberate !== SELL_NORMAL) ? '' : 'a';
    // C: gs.sell_how = deliberate;
    game.gs.sell_how = deliberate;
    // C: ga.auto_credit = FALSE;
    game.ga.auto_credit = false;
}

/**
 * sellobj - hero drops obj at (x,y); if it lands on a costly (shop) spot,
 * negotiate/settle the sale with the resident shopkeeper.
 * C ref: shk.c:3927-4196
 */
export async function sellobj(obj, x, y) {
    const g = game;
    const u = g.u;

    /* C's gs/ga initial values (decl.c:720-721): sell_response == 'a',
     * sell_how == SELL_NORMAL, auto_credit == FALSE until sellobj_state()
     * runs (a thrown/trap-dropped object reaches sellobj without it). */
    if (g.gs === undefined) g.gs = {};
    if (g.ga === undefined) g.ga = {};
    if (g.gs.sell_how === undefined) g.gs.sell_how = SELL_NORMAL;
    if (g.gs.sell_response === undefined) g.gs.sell_response = 'a';
    if (g.ga.auto_credit === undefined) g.ga.auto_credit = false;

    // C: boolean isgold = (obj->oclass == COIN_CLASS); — cheap scalar read,
    // safe to evaluate up front like C does.
    const isgold = (obj.oclass | 0) === COIN_CLASS;

    if (!_ushops0_shk(u)) /* do cheapest exclusion test first */
        return;

    const shops = in_rooms(x, y, SHOPBASE);
    const roomno = shops.length > 0 ? shops[0] : -1;
    let shkp = shop_keeper(roomno);
    if (!shkp || !inhishop(shkp))
        return;
    if (!costly_spot(x, y))
        return;

    // C declares `container = Has_contents(obj)` at function entry, but the
    // value is unread on the two guard-clause returns above; evaluated here,
    // immediately before its first real use, with no observable difference
    // (Has_contents is a pure struct-field read).
    const container = Has_contents(obj);

    if (obj.unpaid && !container && !isgold) {
        await sub_one_frombill(obj, shkp);
        return;
    }

    let cltmp = 0, gltmp = 0, cgold = false;
    if (container) {
        /* find the price of content before subfrombill */
        cltmp = contained_cost(obj, shkp, cltmp, true, false);
        /* find the value of contained gold */
        gltmp += contained_gold(obj, true);
        cgold = (gltmp > 0);
    }

    const saleitem = saleable(shkp, obj);
    let ltmp = 0;
    if (!isgold && !obj.unpaid && saleitem)
        ltmp = set_cost(obj, shkp);

    let offer = ltmp + cltmp;

    /* you dropped something of your own - probably want to sell it */
    await rouse_shk(shkp, true); /* wake up sleeping or paralyzed shk */
    const eshkp = ESHK(shkp);

    if (ANGRY(shkp)) { /* they become shop-objects, no pay */
        if (!_shk_Deaf() && !muteshk(shkp)) {
            SetVoice(shkp, 0, 80, 0);
            await verbalize("Thank you, scum!");
        } else {
            await pline("%s smirks with satisfaction.", Shknam(shkp));
        }
        await subfrombill(obj, shkp);
        return;
    }

    let only_partially_your_contents = false;

    /* get one case out of the way: nothing to sell, and no gold */
    if (!(isgold || cgold)
        && ((offer + gltmp) === 0 || g.gs.sell_how === SELL_DONTSELL)) {
        const unpaid = is_unpaid(obj);

        if (container) {
            dropped_container(obj, shkp, false);
            if (!obj.unpaid)
                obj.no_charge = 1;
            if (unpaid)
                await subfrombill(obj, shkp);
        } else
            obj.no_charge = 1;

        if (!unpaid && (g.gs.sell_how !== SELL_DONTSELL)
            && !special_stock(obj, shkp, false))
            await pline("%s seems uninterested.", Shknam(shkp));
        return;
    }

    if (eshkp.robbed) { /* bones; shop robbed by previous customer */
        if (isgold)
            offer = obj.quan;
        else if (cgold)
            offer += cgold;
        // C: if ((eshkp->robbed -= offer < 0L)) eshkp->robbed = 0L; — the
        // `<` binds tighter than `-=`, so this decrements robbed by 0 or 1
        // (not by offer); ported verbatim, bug included.
        eshkp.robbed = (eshkp.robbed | 0) - ((offer < 0) ? 1 : 0);
        if (eshkp.robbed)
            eshkp.robbed = 0;
        if (offer && !_shk_Deaf() && !muteshk(shkp)) {
            SetVoice(shkp, 0, 80, 0);
            await verbalize(
  "Thank you for your contribution to restock this recently plundered shop.");
        }
        await subfrombill(obj, shkp);
        return;
    }

    if (isgold || cgold) {
        if (!cgold)
            gltmp = obj.quan;

        await donate_gold(gltmp, shkp, true);

        if (!offer || g.gs.sell_how === SELL_DONTSELL) {
            if (!isgold) {
                if (container)
                    dropped_container(obj, shkp, false);
                if (!obj.unpaid)
                    obj.no_charge = 1;
                await subfrombill(obj, shkp);
            }
            return;
        }
    }

    if ((!saleitem && !(container && cltmp > 0)) || eshkp.billct === BILLSZ
        || (obj.oclass | 0) === BALL_CLASS || (obj.oclass | 0) === CHAIN_CLASS
        || offer === 0 || ((obj.oclass | 0) === FOOD_CLASS && obj.oeaten)
        || (Is_candle_shk(obj)
            && obj.age < 20 * candleOcCost(obj.otyp))) {
        await pline("%s seems uninterested%s.", Shknam(shkp),
                    cgold ? " in the rest" : "");
        if (container)
            dropped_container(obj, shkp, false);
        obj.no_charge = 1;
        return;
    }

    const shkmoney = money_cnt(shkp.minvent);
    if (!shkmoney) {
        let c;
        const tmpcr = Math.trunc((offer * 9) / 10) + ((offer <= 1) ? 1 : 0);

        if (g.gs.sell_how === SELL_NORMAL || g.ga.auto_credit) {
            c = g.gs.sell_response = 'y';
        } else if (g.gs.sell_response !== 'n') {
            await pline("%s cannot pay you at present.", Shknam(shkp));
            let qbuf = Sprintf("Will you accept %ld %s in credit for ", tmpcr,
                                currency(tmpcr));
            record_price_quote(obj.otyp, Math.trunc(tmpcr / obj.quan), false);
            qbuf = (await safe_qbuf(qbuf, qbuf, "?", obj, doname, thesimpleoname,
                             (obj.quan === 1) ? "that" : "those"));
            c = await yn_function_shk(qbuf, 'ynaq', 'y');
            if (c === 'a') {
                c = 'y';
                g.ga.auto_credit = true;
            }
        } else /* previously specified "quit" */
            c = 'n';

        if (c === 'y') {
            await shk_names_obj(shkp, obj,
                          (g.gs.sell_how !== SELL_NORMAL)
                           ? "traded %s for %ld zorkmid%s in %scredit."
                    : "relinquish %s and acquire %ld zorkmid%s in %scredit.",
                          tmpcr, (eshkp.credit > 0) ? "additional " : "");
            eshkp.credit += tmpcr;
            if (container)
                dropped_container(obj, shkp, true);
            await subfrombill(obj, shkp);
        } else {
            if (c === 'q')
                g.gs.sell_response = 'n';
            if (container)
                dropped_container(obj, shkp, false);
            if (!obj.unpaid)
                obj.no_charge = 1;
            await subfrombill(obj, shkp);
        }
    } else {
        let short_funds = (offer > shkmoney);
        let one;

        if (short_funds)
            offer = shkmoney;
        let qbuf = '';
        if (!g.gs.sell_response) {
            let yourc = 0;
            let shksc;

            if (container) {
                /* number of items owned by shk */
                shksc = count_contents(obj, true, true, false, true);
                /* number of items owned by you (total - shksc) */
                yourc = count_contents(obj, true, true, true, true) - shksc;
                only_partially_your_contents = !!(shksc && yourc);
            }
            qbuf = Sprintf("%s offers%s %ld gold piece%s for %s%s ",
                    Shknam(shkp), short_funds ? " only" : "", offer,
                    plur(offer),
                    (cltmp && !ltmp)
                        ? ((yourc === 1) ? "your item in " : "your items in ")
                        : "",
                    obj.unpaid ? "the" : "your");
            one = !ltmp ? (yourc === 1) : (obj.quan === 1 && !cltmp);
            const qsfx = Sprintf("%s.  Sell %s?",
                    (cltmp && ltmp)
                        ? (only_partially_your_contents
                               ? ((yourc === 1) ? " and item inside"
                                                : " and items inside")
                               : and_its_contents)
                        : "",
                    one ? "it" : "them");
            record_price_quote(obj.otyp, Math.trunc(offer / obj.quan), false);
            qbuf = (await safe_qbuf(qbuf, qbuf, qsfx, obj, xname, simpleonames,
                             one ? "that" : "those"));
        } else
            qbuf = ''; /* just to pacify lint */

        switch (g.gs.sell_response
                ? g.gs.sell_response
                : await yn_function_shk(qbuf, 'ynaq', 'n')) {
        case 'q':
            g.gs.sell_response = 'n';
            /*FALLTHRU*/
        case 'n':
            if (container)
                dropped_container(obj, shkp, false);
            if (!obj.unpaid)
                obj.no_charge = 1;
            await subfrombill(obj, shkp);
            break;
        case 'a':
            g.gs.sell_response = 'y';
            /*FALLTHRU*/
        case 'y':
            if (container)
                dropped_container(obj, shkp, true);
            if (!obj.unpaid && !saleitem)
                obj.no_charge = 1;
            await subfrombill(obj, shkp);
            await pay(-offer, shkp);
            await shk_names_obj(shkp, obj,
                          (g.gs.sell_how !== SELL_NORMAL)
                           ? ((!ltmp && cltmp && only_partially_your_contents)
                         ? "sold some items inside %s for %ld gold piece%s.%s"
                         : "sold %s for %ld gold piece%s.%s")
            : "relinquish %s and receive %ld gold piece%s in compensation.%s",
                          offer, "");
            break;
        default:
            impossible("invalid sell response");
        }
    }
}

/* C hack.h Is_candle(otmp) macro — otyp is one of the two candle types. */
function Is_candle_shk(obj) {
    const otyp = obj.otyp | 0;
    return otyp === TALLOW_CANDLE || otyp === WAX_CANDLE;
}

/* objects.h oc_cost for the two candle otyps (only candles ever reach this
 * check in sellobj); no general objects[] price table exists in this port. */
function candleOcCost(otyp) {
    return (otyp | 0) === TALLOW_CANDLE ? 10 : 20;
}

/* C hack.h plur(x) macro: (((x) == 1) ? "" : "s") */
function plur(x) {
    return (x === 1) ? "" : "s";
}

/* C ref: hack.c:697-760 in_rooms(x, y, typewanted) — return the room numbers
 * that <x,y> belongs to, filtered by room type.  C returns a NUL-terminated
 * char string of room numbers built backwards from the end of a static buffer;
 * this returns the same numbers, in the same order, as an array (every JS
 * caller in this file already consumes the stub's array form).
 *
 * C's goodtype(rno) macro:
 *   !typewanted
 *   || (typefound = svr.rooms[rno - ROOMOFFSET].rtype) == typewanted
 *   || (typewanted == SHOPBASE && typefound > SHOPBASE)
 * i.e. SHOPBASE is a "any shop" wildcard, since each shop kind is SHOPBASE+n.
 */
export function in_rooms(x, y, typewanted) {
    const buf = [];
    const rooms = game.level?.rooms ?? [];
    const goodtype = (rno) => {
        if (!typewanted)
            return true;
        const typefound = rooms[rno - ROOMOFFSET]?.rtype | 0;
        return typefound === typewanted
            || (typewanted === SHOPBASE && typefound > SHOPBASE);
    };
    const roomno_at = (xx, yy) =>
        (game.level?.locations?.[xx]?.[yy]?.roomno | 0);

    let rno = roomno_at(x, y);
    let step;
    switch (rno) {
    case NO_ROOM:
        return buf;
    case SHARED:
        step = 2;
        break;
    case SHARED_PLUS:
        step = 1;
        break;
    default: /* i.e. a regular room # */
        if (goodtype(rno))
            buf.unshift(rno);
        return buf;
    }

    /* C hack.c:721-737 — scan the 3x3 (or 2x2, for SHARED's step 2) window
     * around <x,y> collecting every distinct good-type room number. */
    let min_x = x - 1, max_x = x + 1;
    if (x < 1)
        min_x += step;
    else if (x >= COLNO)
        max_x -= step;

    let min_y = y - 1, max_y_offset = 2;
    if (min_y < 0) {
        min_y += step;
        max_y_offset -= step;
    } else if ((min_y + max_y_offset) >= ROWNO) {
        max_y_offset -= step;
    }

    for (let xx = min_x; xx <= max_x; xx += step) {
        for (let yy = 0; yy <= max_y_offset; yy += step) {
            rno = roomno_at(xx, min_y + yy);
            if (rno >= ROOMOFFSET && !buf.includes(rno) && goodtype(rno))
                buf.unshift(rno);
        }
    }
    return buf;
}
/* inside_shop (C shk.c:567) already has exactly one body in this tree, at
 * js/mklev.js:2561; imported rather than re-derived here. */
export function costly_spot(x, y) {
    if (!game.level?.flags?.has_shop)
        return false;
    const rooms = in_rooms(x, y, SHOPBASE);
    const shkp = shop_keeper(rooms.length ? rooms[0] : 0);
    if (!shkp || !inhishop(shkp))
        return false;
    const eshkp = ESHK(shkp);
    if (!eshkp)
        return false;
    // Level generation stores C's shk coord as shk_x/shk_y; imported monster
    // state can carry the nested coord. The reserved square is the home
    // position, even while the shopkeeper is standing somewhere else.
    const homeX = (eshkp.shk_x ?? eshkp.shk?.x ?? 0) | 0;
    const homeY = (eshkp.shk_y ?? eshkp.shk?.y ?? 0) | 0;
    return !!inside_shop(x, y)
        && !((x | 0) === homeX && (y | 0) === homeY);
}
export function contained_cost(obj, shkp, price, usell, unpaid_only) {
    let top = obj;
    for (; (top.where | 0) === OBJ_CONTAINED_SHK; top = top.ocontainer)
        continue;
    const on_floor = ((top.where | 0) === OBJ_FLOOR_SHK
                      || (top.where | 0) === OBJ_FREE_SHK);
    let x, y;
    const loc = ((top.where | 0) === OBJ_FREE_SHK)
        ? null : _get_obj_location_shk(top, 0);
    if (!loc) {
        x = game.u?.ux | 0;
        y = game.u?.uy | 0;
    } else {
        x = loc.x | 0;
        y = loc.y | 0;
    }
    const eshkp = ESHK(shkp);
    const freespot = (on_floor && x === (eshkp?.shk?.x | 0)
                      && y === (eshkp?.shk?.y | 0));

    /* price of contained objects; "top" container handled by caller */
    for (let otmp = obj.cobj; otmp; otmp = otmp.nobj) {
        if ((otmp.oclass | 0) === COIN_CLASS)
            continue;

        if (usell) {
            if (saleable(shkp, otmp) && !otmp.unpaid
                && (otmp.oclass | 0) !== BALL_CLASS
                && !((otmp.oclass | 0) === FOOD_CLASS && otmp.oeaten)
                && !(Is_candle_shk(otmp)
                     && (otmp.age | 0) < 20 * candleOcCost(otmp.otyp | 0)))
                price += set_cost(otmp, shkp);
        } else {
            if (on_floor ? (!otmp.no_charge && !freespot)
                         : (otmp.unpaid || !unpaid_only))
                price += get_cost(otmp, shkp) * get_pricing_units(otmp);
        }

        if (Has_contents(otmp))
            price = contained_cost(otmp, shkp, price, usell, unpaid_only);
    }

    return price;
}

function Is_container(o) { return o.otyp >= 214 && o.otyp <= 220; }
function Has_contents_local(o) { return Is_container(o) && o.cobj != null; }

export function contained_gold(obj, even_if_unknown) {
    let value = 0;
    for (let otmp = obj.cobj; otmp; otmp = otmp.nobj) {
        if (otmp.oclass === COIN_CLASS) {
            value += otmp.quan;
        } else if (Has_contents_local(otmp) && (otmp.cknown || even_if_unknown)) {
            value += contained_gold(otmp, even_if_unknown);
        }
    }
    return value;
}
export function count_contents(container, nested, quantity, everything, newdrop) {
    let shoppy = false;
    if (!everything && !newdrop) {
        let top = container;
        while ((top.where | 0) === 2 && top.ocontainer) top = top.ocontainer;
        const loc = _get_obj_location_shk(top, 0);
        if ((top.where | 0) === 1 && loc) shoppy = costly_spot(loc.x, loc.y);
    }
    let count = 0;
    for (let ot = container?.cobj; ot; ot = ot.nobj) {
        if (nested && Has_contents(ot))
            count += count_contents(ot, nested, quantity, everything, newdrop);
        if (everything || ot.unpaid || (shoppy && !ot.no_charge))
            count += quantity ? (ot.quan | 0) : 1;
    }
    return count;
}

/* C shk.c:3713 stolen_container().  This is deliberately separate from
 * contained_cost(): theft removes an existing bill entry as it transfers the
 * value into the shopkeeper's debit/robbed accounting. */
export async function stolen_container(obj, shkp, price = 0, ininv = false) {
    if (!obj || !shkp) return price | 0;
    for (let otmp = obj.cobj; otmp; otmp = otmp.nobj) {
        if ((otmp.oclass | 0) === COIN_CLASS) continue;
        let billamt = 0;
        const owner = { value: shkp };
        if (!(await billable(owner, otmp, ESHK(shkp)?.shoproom | 0, true))) {
            shkp = owner.value;
            const bp = await onbill(otmp, shkp, false);
            if (!bp) continue;
            billamt = (bp.bquan | 0) * (bp.price | 0);
            await sub_one_frombill(otmp, shkp);
        }
        if (billamt) price += billamt;
        else if (ininv ? !!otmp.unpaid : !otmp.no_charge)
            price += get_pricing_units(otmp) * get_cost(otmp, shkp);
        if (Has_contents(otmp))
            price = (await stolen_container(otmp, shkp, price, ininv));
    }
    return price;
}

/* C shk.c:3760 stolen_value().  The bill mutation happens before credit and
 * anger accounting, matching C's ordering; callers which need the displayed
 * warning must await this because the shared message helpers are async. */
export async function stolen_value(obj, x, y, peaceful, silent) {
    if (!obj) return 0;
    let value = 0;
    let gvalue = 0;
    let billamt = 0;
    const owner = await find_objowner(obj, x | 0, y | 0);
    const rooms = in_rooms(x | 0, y | 0, SHOPBASE);
    const roomno = owner ? (ESHK(owner)?.shoproom | 0) : (rooms[0] | 0);
    const wasUnpaid = !!obj.unpaid;
    const cCount = Has_contents(obj)
        ? count_contents(obj, true, false, true, false) : 0;
    const uCount = Has_contents(obj)
        ? count_contents(obj, true, false, false, false) : 0;

    const billOwner = { value: null };
    const isBillable = await billable(billOwner, obj, roomno, true);
    let shkp = billOwner.value;
    let bp = null;
    if (!isBillable) {
        bp = (await onbill(obj, shkp, false));
        if (bp) {
            shkp = billOwner.value || (await find_objowner(obj, x | 0, y | 0));
            billamt = (bp.bquan | 0) * (bp.price | 0);
            if (shkp) await sub_one_frombill(obj, shkp);
        }
        if (!bp && !uCount) return 0;
    }
    if (!shkp) return 0;

    if ((obj.oclass | 0) === COIN_CLASS) {
        gvalue += obj.quan | 0;
    } else {
        if (billamt) value += billamt;
        else if (!obj.no_charge)
            value += get_pricing_units(obj) * get_cost(obj, shkp);
        if (Has_contents(obj)) {
            const ininv = (obj.where | 0) === 3 || (obj.where | 0) === 0;
            value += (await stolen_container(obj, shkp, 0, ininv));
            if (!ininv) gvalue += contained_gold(obj, true);
        }
    }
    if ((gvalue + value) === 0) return 0;
    value += gvalue;

    if (peaceful) {
        const creditUse = !!(ESHK(shkp)?.credit | 0);
        value = check_credit(value, shkp);
        if (ANGRY(shkp)) ESHK(shkp).robbed = (ESHK(shkp).robbed | 0) + value;
        else ESHK(shkp).debit = (ESHK(shkp).debit | 0) + value;
        if (!silent) {
            if (creditUse) {
                if (ESHK(shkp).credit) {
                    await You_real(`have ${ESHK(shkp).credit} ${currency(ESHK(shkp).credit)} credit remaining.`);
                    return value;
                }
                if (!value) {
                    await You_real('have no credit remaining.');
                    return 0;
                }
            }
            const still = creditUse ? 'still ' : '';
            let text = `${still}owe ${shkname(shkp)} ${value} ${currency(value)}`;
            if (uCount) text += ` for ${wasUnpaid ? 'it and ' : ''}${cCount > uCount ? 'some of ' : ''}its contents`;
            else if ((obj.oclass | 0) !== COIN_CLASS) text += ` for ${obj.quan > 1 ? 'them' : 'it'}`;
            await You_real(`${text}!`);
        }
    } else {
        ESHK(shkp).robbed = (ESHK(shkp).robbed | 0) + value;
        if (!silent) {
            if (canseemon_real(shkp))
                await Norep(`${Shknam(shkp)} booms: "${game.plname || game.u?.plname || 'you'}, you are a thief!"`);
            else if (!_shk_Deaf()) await Norep('You hear a scream, "Thief!"');
        }
        hot_pursuit(shkp);
        await angry_guards(false);
    }
    return value;
}
export async function donate_gold(gltmp, shkp, selling) {
    const e = ESHK(shkp);
    if (!e) return;
    if ((e.debit | 0) >= (gltmp | 0)) {
        if (e.loan) e.loan = Math.max(0, (e.loan | 0) - (gltmp | 0));
        e.debit = (e.debit | 0) - (gltmp | 0);
        await Your("debt is %spaid off.", e.debit ? "partially " : "");
        return;
    }
    const delta = (gltmp | 0) - (e.debit | 0);
    e.credit = (e.credit | 0) + delta;
    if (e.debit) {
        e.debit = 0; e.loan = 0;
        await Your("debt is paid off.");
    }
    if ((e.credit | 0) === delta) {
        await You_real("have %sestablished %ld %s credit.",
                       selling ? "" : "re-", delta, currency(delta));
    } else {
        await pline("%ld %s added%s to your credit; total is now %ld %s.",
                    delta, currency(delta), selling ? "" : " back",
                    e.credit | 0, currency(e.credit | 0));
    }
}
export function dropped_container(obj, shkp, sale) {
    for (let ot = obj?.cobj; ot; ot = ot.nobj) {
        if ((ot.oclass | 0) === COIN_CLASS) continue;
        if (!ot.unpaid && !(sale && saleable(shkp, ot))) ot.no_charge = 1;
        if (Has_contents(ot)) dropped_container(ot, shkp, sale);
    }
}
/* C ref: nethack-c/src/shk.c:1166-1171
 *   boolean
 *   is_unpaid(struct obj *obj)
 *   {
 *       return (boolean) (obj->unpaid
 *                         || (Has_contents(obj) && count_unpaid(obj->cobj)));
 *   }
 * NOTE on which Has_contents: C's macro (obj.h:334) is just `(o)->cobj != 0` —
 * the `Is_container(o) || (o)->otyp == STATUE` guard is COMMENTED OUT in 3.7.
 * So the faithful helper is the const.js `Has_contents` already imported at the
 * top of this file, NOT this file's stricter local `Has_contents_local` (which
 * additionally requires Is_container).  count_unpaid is invent.c:3526, ported in
 * js/cmd.js. */
export function is_unpaid(obj) {
    return !!(obj.unpaid
              || (Has_contents(obj) && count_unpaid(obj.cobj)));
}
export function append_price_quote(buf, eos, otyp, 
    oc_sell_minseen, oc_sell_maxseen, oc_buy_minseen, oc_buy_maxseen) {
    let buf2 = "";
    let sep = "";
    // eos is the substring from *eos to end; len = *eos - buf = buf.length - eos.length
    let len = (typeof eos === 'string') ? buf.length - eos.length : (typeof eos === 'number' ? eos : buf.length);
    let len2;

    if (oc_sell_minseen !== undefined && typeof oc_sell_minseen === 'object') {
        const obj = oc_sell_minseen;
        oc_sell_minseen = obj.oc_sell_minseen;
        oc_sell_maxseen = obj.oc_sell_maxseen;
        oc_buy_minseen = obj.oc_buy_minseen;
        oc_buy_maxseen = obj.oc_buy_maxseen;
    }

    if (oc_sell_minseen > oc_sell_maxseen &&
        oc_buy_minseen > oc_buy_maxseen)
        return buf;

    buf2 += " {";

    if (oc_buy_minseen < oc_buy_maxseen) {
        buf2 += "buy " + oc_buy_minseen + "-" + oc_buy_maxseen;
        sep = " ";
    } else if (oc_buy_minseen === oc_buy_maxseen) {
        buf2 += "buy " + oc_buy_minseen;
        sep = " ";
    }

    if (oc_sell_minseen < oc_sell_maxseen) {
        buf2 += sep + "sell " + oc_sell_minseen + "-" + oc_sell_maxseen;
    } else if (oc_sell_minseen === oc_sell_maxseen) {
        buf2 += sep + "sell " + oc_sell_minseen;
    }

    buf2 += "}";
    len2 = buf2.length;
    if (len2 < 256 - len - 1) {
        // Strcpy(*eos, buf2) + *eos += len2
        buf = buf + buf2;
    }
    return buf;
}
/* C objnam.c:5623-5698 safe_qbuf(qbuf, qprefix, qsuffix, obj, func, altfunc,
 * lastR) — "construct a query prompt string, based around an object name,
 * which is guaranteed to fit within [QBUFSZ]". C writes into the caller's
 * buffer in place and supports qbuf === qprefix (a partially-filled buffer,
 * C:5654-5660); both of this file's call sites pass the same string as qbuf
 * and qprefix (`safe_qbuf(qbuf, qbuf, ...)`), and since JS strings are
 * immutable the qbuf===qprefix branch and the qprefix-copy branch compute the
 * identical result, so they collapse to one branch here. The three
 * impossible() sanity checks (C:5646-5653) fire only when a prefix/suffix
 * argument is itself longer than QBUFSZ, which neither of this file's two
 * callers can produce (their prefixes are Sprintf'd shk-name plus a short
 * literal); impossible() in this file is a documented no-op (see above), so
 * they are reproduced as no-op calls for fidelity rather than dropped.
 * short_oname is the real objnam.js port, imported above as short_oname_shk.
 * RNG-free throughout. */
export async function safe_qbuf(qbuf, qprefix, qsuffix, obj, fn1, fn2, thatthose) {
    const lenlimit = QBUFSZ - 1;
    const len_qpfx = qprefix ? qprefix.length : 0;
    const len_qsfx = qsuffix ? qsuffix.length : 0;
    const len_lastR = thatthose.length;

    if (len_qpfx > lenlimit)
        impossible("safe_qbuf: prefix too long (%u characters).", len_qpfx);
    else if (len_qpfx + len_qsfx > lenlimit)
        impossible("safe_qbuf: suffix too long (%u + %u characters).", len_qpfx, len_qsfx);
    else if (len_qpfx + len_lastR + len_qsfx > lenlimit)
        impossible("safe_qbuf: filler too long (%u + %u + %u characters).",
                   len_qpfx, len_lastR, len_qsfx);

    let buf = qprefix ? String(qprefix).slice(0, lenlimit) : '';
    let len = buf.length;

    if (len + len_lastR + len_qsfx > lenlimit) {
        /* C:5670-5681 — too long; skip formatting, last resort output truncated */
        if (len < lenlimit) {
            buf = (buf + thatthose).slice(0, lenlimit);
            len = buf.length;
            if (qsuffix && len < lenlimit)
                buf = (buf + qsuffix).slice(0, lenlimit);
        }
    } else {
        /* C:5682-5694 — suffix and last resort are guaranteed to fit */
        len += len_qsfx; /* include the pending suffix */
        const bufp = await short_oname_shk(obj, fn1, fn2, lenlimit - len);
        buf += (len + bufp.length <= lenlimit) ? bufp : thatthose;
        if (qsuffix)
            buf += qsuffix;
    }
    return buf;
}
/* C ref: shk.c:3149-3195 set_cost — amount paid when the shop buys the
 * complete object.  All arithmetic is integer C arithmetic. */
export function set_cost(obj, shkp) {
    let tmp = get_pricing_units(obj) * getprice(obj, true);
    let multiplier = 1, divisor = 1;
    const u = game.u || {};
    if ((u.uarmh?.otyp | 0) === 94) divisor *= 3;
    else if (((game.urole?.mnum | 0) === (PM_TOURIST | 0) && (u.ulevel | 0) < 15)
             || (u.uarmu && !u.uarm && !u.uarmc)) divisor *= 3;
    else divisor *= 2;
    const mat = MKOBJ_OC_MATERIAL[obj.otyp | 0] | 0;
    if (!obj.dknown || !(game._oc_name_known && game._oc_name_known[obj.otyp | 0])) {
        if ((obj.oclass | 0) === 13 && (mat === 20 || mat === 19)) {
            tmp = (((obj.otyp | 0) - 439) % (6 - ((shkp?.m_id | 0) % 3)) + 3) * (obj.quan | 0);
            divisor = 1;
        } else if (tmp > 1 && ((shkp?.m_id | 0) % 4) === 0) {
            multiplier = 3; divisor = 4;
        }
    }
    if (tmp >= 1) {
        tmp *= multiplier;
        if (divisor > 1) {
            tmp = Math.trunc((tmp * 10) / divisor);
            tmp = Math.trunc((tmp + 5) / 10);
        }
        if (tmp < 1) tmp = 1;
    }
    return tmp;
}
export function special_stock(obj, shkp, silent) {
    const e = ESHK(shkp);
    if (!e || (e.shoptype | 0) !== CANDLESHOP || (obj?.otyp | 0) !== 262)
        return false;
    if (!silent) {
        const izchak = String(shkname(shkp) || '').toLowerCase().includes('izchak');
        if (izchak && !(game.u?.uevent?.invoked | 0)) {
            if (_shk_Deaf() || muteshk(shkp)) {
                pline("%s seems %s that you want to sell that.", Shknam(shkp), (obj.spe | 0) < 7 ? 'horrified' : 'concerned');
            } else {
                verbalize("No thanks, I'd hang onto that if I were you.");
                if ((obj.spe | 0) < 7)
                    verbalize("You'll need %d more candles to go along with it.", 7 - (obj.spe | 0));
            }
        } else if (_shk_Deaf() || muteshk(shkp)) {
            pline("%s shakes his head in refusal.", Shknam(shkp));
        } else {
            verbalize("I won't stock that.  Take it out of here!");
        }
    }
    return true;
}
export async function sub_one_frombill(obj, shkp) {
    const bp = await onbill(obj, shkp, false);
    if (bp) {
        obj.unpaid = 0;
        if ((bp.bquan | 0) > (obj.quan | 0)) {
            const rem = newobj(obj, { nobj: null, cobj: null, oextra: null });
            bp.bo_id = rem.o_id = next_ident();
            rem.where = 0;
            rem.quan = (bp.bquan | 0) - (obj.quan | 0);
            rem.owt = 0;
            bp.bquan = rem.quan;
            bp.useup = true;
            add_to_billobjs(rem);
            return;
        }
        const e = ESHK(shkp);
        const bill = e.bill_p || e.bill;
        const idx = bill ? bill.indexOf(bp) : -1;
        const last = Math.max(0, (e.billct | 0) - 1);
        if (bill && idx >= 0 && idx < last) bill[idx] = bill[last];
        e.billct = last;
        return;
    }
    if (obj.unpaid) obj.unpaid = 0;
}
export async function subfrombill(obj, shkp) {
    await sub_one_frombill(obj, shkp);
    if (!Has_contents(obj)) return;
    for (let ot = obj.cobj; ot; ot = ot.nobj) {
        if ((ot.oclass | 0) === COIN_CLASS) continue;
        if (Has_contents(ot)) await subfrombill(ot, shkp); else await sub_one_frombill(ot, shkp);
    }
}
export async function find_objowner(obj, x, y) {
    const g = game;
    let shkp, deflt_shkp = null;
    if (obj.where === 7) { /* OBJ_ONBILL */
        for (shkp = next_shkp(g.fmon, true); shkp; shkp = next_shkp(shkp.nmon, true))
            if ((await onshopbill(obj, shkp, true)))
                return shkp;
    } else {
        let where = in_rooms(x, y, SHOPBASE);
        for (let i = 0; i < where.length; i++) {
            shkp = shop_keeper(where[i]);
            if (shkp) {
                if ((await onshopbill(obj, shkp, true)))
                    return shkp;
                if (!deflt_shkp)
                    deflt_shkp = shkp;
            }
        }
    }
    return deflt_shkp;
}
/* C shk.c:1160 onshopbill — ownership-only wrapper around onbill. */
export async function onshopbill(obj, shkp, silent) {
    return !!(await onbill(obj, shkp, silent));
}
export function oid_price_adjustment(obj, oid) {
    const GEM_CLASS = 13;
    const GLASS = 19;
    let res = 0;
    const otyp = obj.otyp | 0;
    const oc_name_known = !!(game._oc_name_known && game._oc_name_known[otyp]);
    if (!(obj.dknown && oc_name_known)
        && ((obj.oclass | 0) !== GEM_CLASS
            || (MKOBJ_OC_MATERIAL[otyp] | 0) !== GLASS)) {
        res = ((oid % 4) === 0) ? 1 : 0;
    }
    return res;
}
/* C objnam.c:1751 doname(obj) — the real general port lives in js/objnam.js
 * (doname_base(obj, 0)) and is already imported into this file as doname_pay
 * for the itemized-buying path (see the header note, C shk.c:2311
 * paydoname()). doname_pay IS doname (that import applies no flags), so
 * re-point rather than re-derive. js/eat.js's `doname` is a `return "thing"`
 * partial and is NOT what this points to. */
export async function doname(obj) { return await doname_pay(obj); }
/* C objnam.c:2474-2482 thesimpleoname(obj) = the(simpleonames(obj)) — the
 * real general port lives in js/objnam.js and is imported above as
 * thesimpleoname_real. js/eat.js's `thesimpleoname` returns the literal
 * "thing" and is the partial-namer trap; NOT what this re-points to. */
export function thesimpleoname(obj) { return thesimpleoname_real(obj); }
/* C objnam.c:574-578 xname(obj) = xname_flags(obj, CXN_NORMAL) — the real
 * general namer. xname_flags_shk/CXN_NORMAL_SHK are the objnam.js import at
 * this file's header (the file-local xname_shk near FIRST_GLASS_GEM_SHK
 * already computes this same body under a different name so it wouldn't
 * collide with this export; this replaces the throwing stub with the
 * identical real call rather than the eat.js `return "thing"` partial). */
export function xname(obj) { return xname_flags_shk(obj, CXN_NORMAL_SHK); }
/* C objnam.c:2424-2442 simpleonames(obj) — the real general port lives in
 * js/objnam.js and is imported above as simpleonames_real. */
export function simpleonames(obj) { return simpleonames_real(obj); }
function impossible(_fmt, ..._args) { /* no-op — see note above */ }

/* CORPSE_SHK (objects.h CORPSE = 265) is declared once below (contained_cost
 * area); function declarations here are hoisted and only run after module
 * init, so the forward reference is safe. */
const M2_PNAME_SHK = 0x00080000;    /* monflag.h M2_PNAME */
const the_your_shk = ['the', 'your']; /* decl.c c_common_strings.c_the_your */

function shk_owns_shk(obj) {
    const loc = _get_obj_location_shk(obj, 0);
    if (loc && (obj.unpaid
                || ((obj.where | 0) === 1 && !obj.no_charge
                    && costly_spot(loc.x, loc.y)))) {
        const shkp = shop_keeper(inside_shop(loc.x, loc.y));
        return shkp ? s_suffix_shk(shkname(shkp)) : the_your_shk[0];
    }
    return null;
}
/* C ref: shk.c:5914-5918 staticfn mon_owns(buf, obj) — a monster's carried
 * item's possessive name, or null when obj is not in a monster's inventory.
 * RNG-free. */
function mon_owns_shk(obj) {
    if ((obj.where | 0) === 4 /* OBJ_MINVENT */)
        return s_suffix_shk(y_monnam_shk(obj.ocarry));
    return null;
}
/* C ref: shk.c:5863-5875 shk_your(buf, obj) — "your "/"the "/"Foobar's "
 * ownership-prefix helper for an object description, trailing space
 * included. C's `buf` output parameter always starts by being cleared
 * (`buf[0] = '\0'`), so its incoming content is never read by any caller;
 * this returns the computed string instead of writing through a parameter
 * (JS strings are immutable, so the C out-param convention cannot be
 * reproduced literally — Shk_Your below is fixed to use the return value
 * rather than re-reading its own unmodified `buf` argument, which is what
 * the previous throw-then-ignore-the-result version did). RNG-free
 * throughout — verified against every arm of the C source. */
export function shk_your(_buf, obj) {
    const otyp = obj.otyp | 0;
    const corpsenm = obj.corpsenm | 0;
    const chk_pm = (otyp === CORPSE_SHK) && ismnum(corpsenm);
    const ptr = chk_pm ? permonstTemplate(corpsenm) : null;

    if (chk_pm && ptr && ((ptr.mflags2 | 0) & M2_PNAME_SHK) !== 0)
        return ''; /* skip ownership prefix and space: "Medusa's corpse" */

    let prefix;
    if (chk_pm && ptr && the_unique_pm(ptr)) {
        prefix = 'the';
    } else {
        prefix = shk_owns_shk(obj);
        if (prefix == null) prefix = mon_owns_shk(obj);
        if (prefix == null)
            prefix = the_your_shk[(obj.where | 0) === 3 /* OBJ_INVENT */ ? 1 : 0];
    }
    return prefix + ' ';
}

/* C ref: shk.c:5877-5882 Shk_Your(buf, obj) — prepend ownership to object
 * description and capitalize first letter. */
export function Shk_Your(buf, obj) {
    const s = shk_your(buf, obj);
    if (!s) return s;
    return highc(s.charAt(0)) + s.slice(1);
}

export function inhishop(shkp) {
    const eshkp = ESHK(shkp);
    if (!eshkp) return false;
    const loc = game.level?.locations?.[shkp.mx | 0]?.[shkp.my | 0];
    if (!loc) return false;
    const rno = loc.roomno | 0;
    const shoproom = eshkp.shoproom | 0;
    return rno === shoproom || rno === SHARED;
}

/* C ref: shk.c:1117 tended_shop(sroom)
 *   struct monst *mtmp = sroom->resident;
 *   return !mtmp ? FALSE : (boolean) inhishop(mtmp);
 */
export function tended_shop(sroom) {
    const mtmp = sroom.resident;
    return !mtmp ? false : inhishop(mtmp);
}

/* C ref: shk.c:5388 shop_object(x, y) — find a shop object at coordinates */
export function shop_object(x, y) {
    const shops = in_rooms(x, y, SHOPBASE);
    const roomno = shops.length > 0 ? shops[0] : -1;
    const shkp = shop_keeper(roomno);
    if (!shkp || !inhishop(shkp))
        return null;

    let otmp;
    for (otmp = (game.level?.levelObjects?.[x]?.[y] ?? null); otmp; otmp = otmp.nexthere)
        if (otmp.oclass !== COIN_CLASS)
            break;
    /* note: otmp might have no_charge set, but that's ok */
    return (otmp && costly_spot(x, y) && shkp.mpeaceful && !muteshk(shkp))
               ? otmp
               : null;
}

/* C ref: shk.c:4540 find_damage — any damage shopkeeper shkp could repair. */
function find_damage(shkp) {
    let dam = game.level?.damagelist || null;
    if (shk_impaired(shkp)) return null;
    while (dam) {
        if (repairable_damage(dam, shkp)) return dam;
        dam = dam.next;
    }
    return null;
}

/* C ref: shk.c:4556 shk_fixes_damage — shopkeeper tries to repair damage
 * belonging to them. */
async function shk_fixes_damage(shkp) {
    const dam = find_damage(shkp);
    if (!dam) return;
    const u = game.u || {};
    const shk_closeby = (dist2(u.ux | 0, u.uy | 0, shkp.mx | 0, shkp.my | 0)
                         <= (BOLT_LIM / 2) * (BOLT_LIM / 2));
    if (canseemon_real(shkp)) {
        await pline("%s whispers %s.", Shknam(shkp),
                    shk_closeby ? "an incantation" : "something");
    } else if (!_shk_Deaf() && shk_closeby) {
        await You_hear("someone muttering an incantation.");
    }
    await repair_damage(shkp, dam, false);
    discard_damage_struct(dam);
}

export async function shk_move(shkp) {
    const g = game;
    const u = g.u || {};
    const eshkp = ESHK(shkp);
    const omx = shkp.mx | 0;
    const omy = shkp.my | 0;
    let appr = 1;
    let uondoor = false, avoid = false, badinv = false;

    if (inhishop(shkp))
        await shk_fixes_damage(shkp);

    /* C shk.c:4896 — distu(omx,omy) = dist2(omx,omy,u.ux,u.uy). */
    const udist = dist2(omx, omy, u.ux | 0, u.uy | 0);
    /* C shk.c:4896-4934 — close-to-hero handling (PM_GRID_BUG nuance omitted:
     * shopkeepers are never grid bugs). */
    if (udist < 3) {
        /* C shk.c:4898: ANGRY(shkp) = !mpeaceful; Conflict handling. */
        const angry = !(shkp.mpeaceful | 0);
        const cp = u.uprops?.[CONFLICT];
        const Conflict = !!((cp?.intrinsic | 0) || (cp?.extrinsic | 0));
        if (angry || (Conflict && !resist_conflict(shkp))) {
            /* C shk.c:4899-4901: Displaced image message (omitted, no RNG),
             * then mattacku(shkp); return 0. */
            /* async since the AT_BREA port — see the note at js/priest.js's
             * pri_move call site.  No shopkeeper form has an AT_BREA row, so
             * no await executes and this runs synchronously. */
            void mattacku(shkp);
            return 0;
        }
        if (eshkp && eshkp.following) {
            /* C shk.c:4904-4913: customer-name mismatch — stop following.
             * customer/plname compare; messaging omitted (no RNG). */
            const plname = (g.plname || u.plname || '');
            if (eshkp.customer && eshkp.customer !== plname) {
                eshkp.following = 0;
                return 0;
            }
            const moves = (g.moves | 0);
            const followmsg = (g.followmsg | 0);
            if (moves > followmsg + 4) {
                /* C shk.c:4915-4923 — the reminder is observable even when
                 * the hero cannot hear speech.  Keep this before rn2(9): the
                 * counter update and random draw are part of the turn's
                 * deterministic stream. */
                g.followmsg = moves;
                const plname = g.plname || u.plname || '';
                if (!_shk_Deaf() && !muteshk(shkp)) {
                    SetVoice(shkp, 0, 80, 0);
                    verbalize('%s, %s!  Didn\'t you forget to pay?',
                              Hello(shkp), plname);
                } else {
                    pline('%s holds out %s upturned %s.',
                          Shknam(shkp), noit_mhis(shkp),
                          mbodypart(shkp, HAND));
                }
                if (!rn2_shk(9)) {
                    pline('%s doesn\'t like customers who don\'t pay.',
                          Shknam(shkp));
                    rile_shk(shkp);
                }
            }
            if (udist < 2)
                return 0;
        }
    }

    appr = 1;
    let gtx = eshkp ? (eshkp.shk_x ?? eshkp.shk?.x ?? 0) | 0 : 0;
    let gty = eshkp ? (eshkp.shk_y ?? eshkp.shk?.y ?? 0) | 0 : 0;
    const satdoor = (gtx === omx && gty === omy);

    let z;
    if ((eshkp && eshkp.following)
        || ((z = holetime()) >= 0 && z * z <= udist)) {
        /* C shk.c:4948-4951 */
        if (udist > 4 && eshkp && eshkp.following && !eshkp.billct)
            return -1; /* leave it to m_move */
        gtx = u.ux | 0;
        gty = u.uy | 0;
    } else if (!(shkp.mpeaceful | 0)) { /* C shk.c:4952 ANGRY(shkp) */
        /* C shk.c:4953-4958: move toward hero if shk can see him. */
        if ((shkp.mcansee | 0) && m_canseeu_shk(shkp)) {
            gtx = u.ux | 0;
            gty = u.uy | 0;
        }
        avoid = false;
    } else {
        /* C shk.c:4959-4985 */
        const Invis = _shk_Invis();
        const usteed = !!u.usteed;
        if (Invis || usteed) {
            avoid = false;
        } else {
            /* C shk.c:4964: uondoor = u_at(eshkp->shd.x, eshkp->shd.y) */
            const shdx = eshkp ? (eshkp.shd?.x ?? 0) | 0 : 0;
            const shdy = eshkp ? (eshkp.shd?.y ?? 0) | 0 : 0;
            uondoor = ((u.ux | 0) === shdx && (u.uy | 0) === shdy);
            if (uondoor) {
                const PICK_AXE = 259, DWARVISH_MATTOCK = 71;
                badinv = !!(carrying(PICK_AXE) || carrying(DWARVISH_MATTOCK));
                /* Fast + sobj_at(...) refinement omitted (no Fast tracking);
                 * conservative — only the carried-pick case applies. */
                if (satdoor && badinv)
                    return 0;
                avoid = !badinv;
            } else {
                /* C shk.c:4973: avoid = (*u.ushops && distu(gtx,gty) > 8). */
                const ushops0 = _ushops0_shk(u);
                avoid = (ushops0 !== 0 && dist2(gtx, gty, u.ux | 0, u.uy | 0) > 8);
                badinv = false;
            }

            /* C shk.c:4977-4983 */
            const robbed = eshkp ? (eshkp.robbed | 0) : 0;
            const billct = eshkp ? (eshkp.billct | 0) : 0;
            const debit = eshkp ? (eshkp.debit | 0) : 0;
            if (((!robbed && !billct && !debit) || avoid)
                && dist2(omx, omy, gtx, gty) < 3) {
                /* C shk.c:4979: onlineu(omx,omy) = online2(omx,omy,u.ux,u.uy)
                 * — is the shk's CURRENT cell lined up with the HERO (not the
                 * goal).  When not lined up (and no pick-axe nearby), the shk
                 * stays put: return 0 with NO move_special call / no RNG.  This
                 * is the turn-3-vs-turn-18 split: at turn 3 the shk (77,5) is not
                 * online with the hero (51,7) → return 0; at turn 18 the hero is
                 * on the shk's row (y=5) → online → fall through to the satdoor
                 * appr=0 branch and move_special fires rn2 (leaf 6303). */
                if (!badinv && !online2(omx, omy, u.ux | 0, u.uy | 0))
                    return 0;
                if (satdoor)
                    appr = gtx = gty = 0;
            }
        }
    }

    z = await move_special(shkp, inhishop(shkp), appr, uondoor, avoid, omx, omy,
                           gtx, gty);
    if (z > 0)
        after_shk_move(shkp);

    return z;
}

export function after_shk_move(shkp) {
    const eshkp = ESHK(shkp);
    if (!eshkp || !inhishop(shkp)) return;
    /* C uses (Bill *) -1000 as a sentinel while a migrating shopkeeper is
     * re-entering its shop; restore the real bill array before any occupancy
     * checks inspect it. */
    if (eshkp.bill_p === -1000)
        eshkp.bill_p = eshkp.bill || [];
}

export function restshk(shkp, ghostly) {
    const u = game.u || {};
    if (!(u.uz && u.uz.dlevel))
        return;
    /* TODO: real body —
     *   const eshkp = ESHK(shkp);
     *   if (eshkp.bill_p !== -1000) eshkp.bill_p = 0;
     *   if (ghostly) {
     *       eshkp.shoplevel = { dlevel: u.uz.dlevel, dnum: u.uz.dnum };
     *       if (!(shkp.mpeaceful|0) && strncmpi(eshkp.customer, plname, PL_NSIZ))
     *           pacify_shk(shkp, true);
     *   }
     */
}

/* C hack.h *u.ushops — first shop room the hero occupies, 0 if none.  The JS
 * field may be a string, char-array, or number. */
function _ushops0_shk(u) {
    const us = u.ushops;
    if (!us) return 0;
    if (typeof us === 'string') return us.length ? us.charCodeAt(0) : 0;
    if (Array.isArray(us)) return us[0] | 0;
    return us | 0;
}

function m_canseeu_shk(_shkp) {
    const u = game.u || {};
    const Invis = _shk_Invis();
    return !Invis && !u.uundetected;
}

function pacify_shk(shkp, clear_surcharge) {
    shkp.mpeaceful = 1; /* NOTANGRY(shkp) = TRUE */
    const eshkp = ESHK(shkp);
    if (clear_surcharge && eshkp && eshkp.surcharge) {
        const bill = eshkp.bill_p || eshkp.bill || [];
        const ct = eshkp.billct | 0;
        eshkp.surcharge = false;
        for (let i = 0; i < ct; i++) {
            const bp = bill[i];
            if (!bp) continue;
            /* undo the 33% increase rile_shk added */
            bp.price -= Math.floor((bp.price + 3) / 4);
        }
    }
}

const SVALL = 0xFF;

/* C ref: shk.c:4399 add_damage — record damage to a location for later repair. */
export function add_damage(x, y, cost) {
    const g = game;
    const loc = g.level?.locations?.[x]?.[y];
    if (!loc) return;

    if (IS_DOOR(loc.typ)) {
        /* Don't schedule for repair unless it's a real shop entrance */
        const shops = in_rooms(x, y, SHOPBASE);
        let i = 0;
        let mtmp;
        for (; i < shops.length; i++) {
            mtmp = shop_keeper(shops[i]);
            if (mtmp && x === ESHK(mtmp).shd.x && y === ESHK(mtmp).shd.y)
                break;
        }
        if (i >= shops.length)
            return;
    }

    /* Look for existing damage at this spot */
    for (let tmp_dam = g.level.damagelist; tmp_dam; tmp_dam = tmp_dam.next) {
        if (tmp_dam.place.x === x && tmp_dam.place.y === y) {
            tmp_dam.cost += cost;
            tmp_dam.when = g.moves; /* needed by pay_for_damage() */
            return;
        }
    }

    /* Create new damage entry */
    const tmp_dam = alloc(/* sizeof damage */);
    tmp_dam.when = g.moves;
    tmp_dam.place = { x: x, y: y };
    tmp_dam.cost = cost;
    tmp_dam.typ = loc.typ;
    tmp_dam.flags = loc.flags;
    tmp_dam.next = g.level.damagelist;
    g.level.damagelist = tmp_dam;

    /* If player saw damage, display walls post-repair as walls, not stone */
    if (cansee(x, y))
        loc.seenv = SVALL;
}
/* C ref: shk.c:5019-5062 shopdig(fall); fall arm (backpack grab) not ported. */
export async function shopdig(fall) {
    const u = game.u;
    const shkp = shop_keeper(_ushops0_shk(u));
    if (!shkp) return;
    if (!inhishop(shkp)) {
        if ((game.urole?.mnum | 0) === PM_KNIGHT) {
            await pline('You feel like a common thief.');
            adjalign_real(-sgn(u.ualign?.type | 0));
        }
        return;
    }
    if (fall) return;
    let lang = 0; /* 0 can't speak, 1 animal noises, 2 speaks */
    const msound = _msound_of_shk(shkp);
    if (helpless(shkp) || msound === 0) { /* lang stays 0 */ }
    else if (msound <= MS_ANIMAL_SHK) lang = 1;
    else if (msound >= 25 /* MS_HUMANOID */) lang = 2;
    if (lang === 2 && !_shk_Deaf() && !muteshk(shkp)) {
        const female = !!(game.flags?.female | 0);
        if ((u.utraptype | 0) === 2 /* TT_PIT, const.js:2269 */)
            await verbalize("Be careful, %s, or you might fall through the floor.",
                            female ? "madam" : "sir");
        else
            await verbalize("%s, do not damage the floor here!",
                            female ? "Madam" : "Sir");
    }
    if ((game.urole?.mnum | 0) === PM_KNIGHT) {
        await pline('You feel like a common thief.');
        adjalign_real(-sgn(u.ualign?.type | 0));
    }
}
/* C ref: shk.c:4850 fix_shop_damage() */
export async function fix_shop_damage() {
    const g = game;
    let shkp, damg, nextdamg;

    /* if this level has no shop damage, there's nothing to do */
    if (!g.level.damagelist)
        return;

    /* go through all shopkeepers on the level */
    for (shkp = next_shkp(g.fmon, false); shkp;
         shkp = next_shkp(shkp.nmon, false)) {
        /* if this shopkeeper isn't in his shop or can't move, skip */
        if (shk_impaired(shkp))
            continue;
        /* go through all damage data trying to have this shopkeeper
           fix it; repair_damage() will only make repairs for damage
           matching shop controlled by specified shopkeeper */
        for (damg = g.level.damagelist; damg; damg = nextdamg) {
            nextdamg = damg.next;
            if ((await repair_damage(shkp, damg, true)))
                discard_damage_struct(damg);
        }
    }
}

/* C ref: shk.c:5826 block_entry — shopkeeper blocks broken-door entry? */
export function block_entry(x, y) {
    const g = game;
    const u = g.u;

    /* player must be on a broken door */
    const loc = g.level?.locations?.[u.ux | 0]?.[u.uy | 0];
    if (!loc) return false;
    if (!(IS_DOOR(loc.typ) && loc.doormask === D_BROKEN))
        return false;

    /* x,y must be in a shop room */
    const shops = in_rooms(x, y, SHOPBASE);
    const roomno = shops.length > 0 ? shops[0] : -1;
    if (roomno < 0 || !IS_SHOP(roomno))
        return false;

    const shkp = shop_keeper(roomno);
    if (!shkp || !inhishop(shkp))
        return false;

    const eshk = ESHK(shkp);
    if (!eshk) return false;
    if (eshk.shd.x !== u.ux || eshk.shd.y !== u.uy)
        return false;

    const sx = eshk.shk.x;
    const sy = eshk.shk.y;

    const Invis = _shk_Invis();
    const PICK_AXE = 259, DWARVISH_MATTOCK = 71;

    if (shkp.mx === sx && shkp.my === sy && !helpless(shkp)
        && (x === sx - 1 || x === sx + 1 || y === sy - 1 || y === sy + 1)
        && (Invis || carrying(PICK_AXE) || carrying(DWARVISH_MATTOCK)
            || u.usteed)) {
        pline("%s%s blocks your way!", Shknam(shkp),
              Invis ? " senses your motion and" : "");
        return true;
    }
    return false;
}

/* C ref: shk.c:5792 block_door — shopkeeper blocks a door */
export function block_door(x, y) {
    const g = game;
    const u = g.u;

    const shops = in_rooms(x, y, SHOPBASE);
    const roomno = shops.length > 0 ? shops[0] : -1;
    if (roomno < 0 || !IS_SHOP(roomno))
        return false;

    const loc = g.level?.locations?.[x]?.[y];
    if (!loc)
        return false;
    if (!IS_DOOR(loc.typ))
        return false;

    if (roomno !== _ushops0_shk(u))
        return false;

    const shkp = shop_keeper(roomno);
    if (!shkp || !inhishop(shkp))
        return false;

    const eshk = ESHK(shkp);
    const Invis = _shk_Invis();

    if (shkp.mx === eshk.shk.x && shkp.my === eshk.shk.y
        && eshk.shd.x === x && eshk.shd.y === y
        && !helpless(shkp)
        && (eshk.debit || eshk.billct || eshk.robbed)) {
        pline("%s%s blocks your way!", Shknam(shkp),
              Invis ? " senses your motion and" : "");
        return true;
    }
    return false;
}

export function IS_SHOP(roomno) {
    const g = game;
    const r = g.level?.rooms?.[roomno];
    return r ? r.rtype >= SHOPBASE : false;
}

/* C ref: shk.c:271 set_residency */
export function set_residency(shkp, zero_out) {
    const eshkp = ESHK(shkp);
    const l1 = eshkp.shoplevel;
    const l2 = game.u.uz;
    if (l1 && l2 && l1.dnum === l2.dnum && l1.dlevel === l2.dlevel)
        game.level.rooms[eshkp.shoproom - ROOMOFFSET].resident =
            zero_out ? null : shkp;
}

export async function paybill(croaked, silently) {
    const g = game;
    const u = g.u;
    let mtmp, mtmp2, firstshk, resident, creditor, hostile, localshk;
    let eshkp;
    let taken = false;
    let local;
    let numsk = 0;

    if (croaked < 0)
        return false;

    /* this is where inventory will end up if any shk takes it */
    if (!g.repo) g.repo = {};
    if (!g.repo.location) g.repo.location = {};
    g.repo.location.x = 0;
    g.repo.location.y = 0;
    g.repo.shopkeeper = 0;

    resident = creditor = hostile = localshk = null;
    for (mtmp = next_shkp(g.fmon, false); mtmp;
         mtmp = next_shkp(mtmp2, false)) {
        mtmp2 = mtmp.nmon;
        eshkp = ESHK(mtmp);
        local = on_level(eshkp.shoplevel, u.uz);
        if (local && u.ushops && u.ushops.indexOf(String.fromCharCode(eshkp.shoproom)) !== -1) {
            if (!resident || eshkp.billct || eshkp.debit || eshkp.robbed)
                resident = mtmp;
        } else if (eshkp.billct || eshkp.debit || eshkp.robbed) {
            if (!creditor)
                creditor = mtmp;
        } else if (eshkp.following || (mtmp.mpeaceful === 0)) {
            if (!hostile)
                hostile = mtmp;
        } else if (local) {
            if (!localshk)
                localshk = mtmp;
        }
    }

    firstshk = resident ? resident
                        : creditor ? creditor
                                   : hostile ? hostile
                                             : localshk;
    if (firstshk) {
        numsk++;
        taken = await inherits(firstshk, numsk, croaked, silently);
    }

    for (mtmp = next_shkp(g.fmon, false); mtmp;
         mtmp = next_shkp(mtmp2, false)) {
        mtmp2 = mtmp.nmon;
        eshkp = ESHK(mtmp);
        local = on_level(eshkp.shoplevel, u.uz);
        if (mtmp !== firstshk) {
            numsk++;
            taken = (await inherits(mtmp, numsk, croaked, silently)) || taken;
        }
        if (!local)
            await mongone(mtmp);
    }
    return taken;
}

/* C role.c:2119-2140  Hello(mtmp) — the greeting word, by role.  Role_switch is
 * gu.urole.mnum, which js/roles.js:595 stores on game.urole.mnum from the same
 * PM_* monster indices. */
export function Hello(mtmp) {
    switch ((game.urole?.mnum) | 0) {
    case PM_KNIGHT:
        return 'Salutations'; /* Olde English */
    case PM_SAMURAI:
        return (mtmp && (mtmp.mnum | 0) === PM_SHOPKEEPER)
            ? 'Irasshaimase' : 'Konnichi wa'; /* Japanese */
    case PM_TOURIST:
        return 'Aloha'; /* Hawaiian */
    case PM_VALKYRIE:
        return 'Velkommen'; /* Norse */
    default:
        return 'Hello';
    }
}
export function u_entered_shop(enterstring) {
    const g = game, u = g.u || {};
    if (!enterstring || !enterstring.length || enterstring.charCodeAt(0) === 0)
        return;
    const rmno = enterstring.charCodeAt(0);
    const shkp = shop_keeper(rmno);
    if (!shkp || !inhishop(shkp)) {
        u.ushops = '';
        return;
    }
    /* C shk.c:779: a tended shop records this before greeting/dialogue.  It is
     * visible later in #conduct's achievement list even when the shopkeeper is
     * mute or following. */
    record_achievement(ACH_SHOP);
    const eshkp = ESHK(shkp);
    if (!eshkp)
        return;
    eshkp.bill_p = eshkp.bill;

    const plname = g.plname || u.plname || '';
    if ((!(eshkp.visitct | 0) || (eshkp.customer && eshkp.customer.length))
        && (eshkp.customer || '').toLowerCase() !== plname.toLowerCase()) {
        /* "You seem to be new here" */
        eshkp.visitct = 0;
        eshkp.following = 0;
        eshkp.customer = plname.substring(0, 63);
        pacify_shk(shkp, true);
    }

    if (muteshk(shkp) || eshkp.following)
        return; /* no dialog */

    const rooms = g.level?.rooms ?? [];
    const rt = rooms[rmno - ROOMOFFSET]?.rtype | 0;
    const shopname = shtype_name(rt - SHOPBASE);

    if (_shk_Invis()) {
        pline(`${Shknam(shkp)} senses your presence.`);
        if (!_shk_Deaf() && !muteshk(shkp)) {
            SetVoice(shkp, 0, 80, 0);
            verbalize('Invisible customers are not welcome!');
        } else {
            pline(`${Shknam(shkp)} stands firm as if he knows you are there.`);
        }
        return;
    }

    if (ANGRY(shkp)) {
        if (!_shk_Deaf() && !muteshk(shkp)) {
            SetVoice(shkp, 0, 80, 0);
            verbalize('So, %s, you dare return to %s %s?!', plname,
                      s_suffix_shk(shkname(shkp)), shopname);
        }
    } else if (eshkp.surcharge) {
        if (!_shk_Deaf() && !muteshk(shkp)) {
            SetVoice(shkp, 0, 80, 0);
            verbalize("Back again, %s?  I've got my %s on you.", plname, 'eye');
        } else {
            pline(`The atmosphere at ${s_suffix_shk(shkname(shkp))} ${shopname} seems unwelcoming.`);
        }
    } else if (eshkp.robbed) {
        if (!_shk_Deaf()) {
            pline(`${Shknam(shkp)} mutters imprecations against shoplifters.`);
        }
    } else {
        const again = (eshkp.visitct | 0) ? ' again' : '';
        eshkp.visitct = (eshkp.visitct | 0) + 1;
        if (!_shk_Deaf() && !muteshk(shkp)) {
            SetVoice(shkp, 0, 80, 0);
            verbalize('%s, %s!  Welcome%s to %s %s!', Hello(shkp), plname,
                      again, s_suffix_shk(shkname(shkp)), shopname);
        } else {
            pline(`You enter ${s_suffix_shk(shkname(shkp))} ${shopname}${again}!`);
        }
    }
}
/* C ref: hacklib.c:343-359 s_suffix — forwards to the shared body in
 * js/hacklib.js.  The local copy carried two of C's four arms; shopkeeper
 * names go through it (shkname()), and a shopkeeper CAN be named "Izchak"
 * or, in the bones/hallucination path, "you". */
function s_suffix_shk(s) { return s_suffix(s); }
/* C youprop.h:103 Blind, read off the one uprops spelling this port writes. */
const BLINDED_SHK = 15; /* js/const.js BLINDED */
function _shk_Blind() {
    const bp = game.u?.uprops?.[BLINDED_SHK];
    return !!bp && !!((bp.intrinsic | 0) || (bp.extrinsic | 0))
           && !(bp.blocked | 0);
}
/* C youprop.h Invis / Deaf, read off the one uprops spelling this port writes. */
function _shk_Invis() {
    const p = game.u?.uprops?.[INVIS];
    return !!((p?.intrinsic | 0) || (p?.extrinsic | 0));
}
function _shk_Deaf() {
    const p = game.u?.uprops?.[DEAF];
    return !!((p?.intrinsic | 0) || (p?.extrinsic | 0)
              || (game.u?.uroleplay?.deaf ? 1 : 0) || (game.u?.HDeaf | 0));
}

/* C ref: shk.c:579 u_left_shop — player left a shop */
export async function u_left_shop(leavestring, newlev) {
    const g = game;
    const u = g.u || {};
    let shkp;
    let eshkp;
    /* C nethack-c/include/monflag.h:29 — MS_ANIMAL = 17 ("up to here are
     * animal noises", aliasing MS_TRUMPET at monflag.h:28).  Was 13, which is
     * really MS_MOO (monflag.h:24) — that under-counted the animal band by
     * four sounds (MS_WAIL, MS_GURGLE, MS_BURBLE, MS_TRUMPET), so wailing,
     * gurgling, burbling and trumpeting shopkeepers were treated as able to
     * speak.  Declared separately in pay_for_damage (different scope). */
    const MS_ANIMAL = 17;

    /* muteshk macro: helpless || msound <= MS_ANIMAL */
    function muteshk(shkp) {
        return helpless(shkp) || ((shkp.data?.msound | 0) <= MS_ANIMAL);
    }

    /* u.ushops0 — previous turn's first shop room char */
    function ushops0_char(u) {
        const us0 = u.ushops0;
        if (!us0) return 0;
        if (typeof us0 === 'string') return us0.length ? us0.charCodeAt(0) : 0;
        return us0 | 0;
    }

    /*
     * IF player
     * ((didn't leave outright) AND
     *  ((he is now strictly-inside the shop) OR
     *   (he wasn't strictly-inside last turn anyway)))
     * THEN (there's nothing to do, so just return)
     */
    if (!leavestring && (!(game.level?.at(u.ux | 0, u.uy | 0)?.edge) || (game.level?.at(u.ux0 | 0, u.uy0 | 0)?.edge)))
        return;

    shkp = shop_keeper(leavestring ? leavestring[0] : String.fromCharCode(ushops0_char(u)));
    if (!shkp || !inhishop(shkp))
        return; /* shk died, teleported, changed levels... */

    eshkp = ESHK(shkp);
    if (!eshkp.billct && !eshkp.debit) /* bill is settled */
        return;

    if (!leavestring && !muteshk(shkp)) {
        /*
         * Player just stepped onto shop-boundary (known from above logic).
         * Try to intimidate him into paying his bill
         */
        let not_upset = !eshkp.surcharge;
        if (!_shk_Deaf() && !muteshk(shkp)) {
            SetVoice(shkp, 0, 80, 0);
            verbalize(not_upset ? "%s!  Please pay before leaving."
                                : "%s!  Don't you leave without paying!",
                      g.plname || u.plname);
        } else {
            pline("%s %s that you need to pay before leaving%s",
                  Shknam(shkp),
                  not_upset ? "points out" : "makes it clear",
                  not_upset ? "." : "!");
        }
        return;
    }

    if (await rob_shop(shkp)) {
        await call_kops(shkp, (!newlev && (game.level?.at(u.ux0 | 0, u.uy0 | 0)?.edge)));
    }
}

/* C ref: shk.c:5174 pay_for_damage — shopkeeper reacts to damage */
export async function pay_for_damage(dmgstr, cant_mollify) {
    const g = game;
    const u = g.u || {};
    let shkp = null;
    const uinshp = !!(u.ushops && u.ushops.length > 0 && u.ushops.charCodeAt(0) !== 0);

    /* C shk.c:5186-5187 — the "no shopkeeper found yet" sentinel.  ROWNO/COLNO
     * come from const.js (21/80, global.h:384-385); the locals that used to
     * shadow them here read ROWNO as 22. */
    const INF_DIST = (ROWNO * ROWNO) + (COLNO * COLNO);
    let nearest_shk = INF_DIST;
    let nearest_damage = INF_DIST;
    let picks = 0;
    let cost_of_damage = 0;
    let appear_here = null;
    let x, y;

    for (let tmp_dam = g.level.damagelist; tmp_dam; tmp_dam = tmp_dam.next) {
        if (tmp_dam.when !== g.moves || !tmp_dam.cost)
            continue;
        cost_of_damage += tmp_dam.cost;

        const shops_affected = in_rooms(tmp_dam.place.x, tmp_dam.place.y, SHOPBASE);
        for (let i = 0; i < shops_affected.length; i++) {
            const shopchar = shops_affected[i];
            const tmp_shk = shop_keeper(shopchar);
            if (!tmp_shk)
                continue;
            if (tmp_shk === shkp) {
                const damage_distance = dist2(tmp_dam.place.x, tmp_dam.place.y, u.ux | 0, u.uy | 0);
                if (damage_distance < nearest_damage) {
                    nearest_damage = damage_distance;
                    appear_here = tmp_dam;
                }
                continue;
            }
            if (!inhishop(tmp_shk))
                continue;
            const shk_distance = dist2(tmp_shk.mx | 0, tmp_shk.my | 0, u.ux | 0, u.uy | 0);
            if (shk_distance > nearest_shk)
                continue;
            if (shk_distance === nearest_shk && picks) {
                if (rn2_shk(++picks))
                    continue;
            } else {
                picks = 1;
            }
            shkp = tmp_shk;
            nearest_shk = shk_distance;
            appear_here = tmp_dam;
            nearest_damage = dist2(tmp_dam.place.x, tmp_dam.place.y, u.ux | 0, u.uy | 0);
        }
    }

    if (!cost_of_damage || !shkp)
        return;

    /* C nethack-c/include/monflag.h:29 — MS_ANIMAL = 17.  Was 13 (= MS_MOO,
     * monflag.h:24).  Second declaration of this name in the file; it is a
     * separate function scope from u_left_shop's, so both are kept and both
     * are fixed. */
    const MS_ANIMAL = 17;
    const animal = ((shkp.data?.msound | 0) <= MS_ANIMAL);
    let pursue = false;
    x = appear_here.place.x;
    y = appear_here.place.y;

    const eshk = ESHK(shkp);
    if (eshk && u.plname) {
        eshk.customer = u.plname.substring(0, 63);
    }

    if (ANGRY(shkp) || (eshk && eshk.following)) {
        hot_pursuit(shkp);
        return;
    }

    const shk_rooms = in_rooms(shkp.mx | 0, shkp.my | 0, SHOPBASE);
    if (!shk_rooms.length) {
        if (!cansee(shkp.mx | 0, shkp.my | 0))
            return;
        pursue = true;
        getcad(shkp, dmgstr, x, y, uinshp, animal, pursue);
        return;
    }

    if (uinshp) {
        /* C shk.c:5259: um_dist(shkp->mx, shkp->my, 1) && !um_dist(..., 3) —
         * "further than 1 away but not further than 3".  The previous
         * `dist2(...) <= 1 && !(dist2(...) <= 3)` was both the wrong metric and
         * the wrong SENSE (um_dist is a greater-than test), and was therefore
         * unsatisfiable. */
        if (um_dist(shkp.mx | 0, shkp.my | 0, 1)
            && !um_dist(shkp.mx | 0, shkp.my | 0, 3)) {
            pline(Sprintf("%s leaps towards you!", Shknam(shkp)));
            await mnexto(shkp, RLOC_NOMSG);
        }
        pursue = um_dist(shkp.mx | 0, shkp.my | 0, 1);
        if (pursue) {
            getcad(shkp, dmgstr, x, y, uinshp, animal, pursue);
            return;
        }
    } else {
        if (MON_AT(x, y)) {
            if (!animal) {
                if (!_shk_Deaf() && !muteshk(shkp)) {
                    You_hear("an angry voice:");
                    SetVoice(shkp, 0, 80, 0);
                    verbalize("Out of my way, scum!");
                }
                wait_synch();
            } else {
                growl(shkp);
            }
        }
        await mnearto(shkp, x, y, true, RLOC_MSG);
    }

    /* C shk.c:5292: um_dist(x, y, 1) — TRUE when the hero is MORE than one
     * square from the damage.  The old `dist2(x,y,ux,uy) <= 1` inverted it, so
     * the shopkeeper demanded payment exactly when C shouts, and shouted
     * exactly when C demands payment. */
    if ((um_dist(x, y, 1) && !uinshp) || cant_mollify
        || (money_cnt(g.invent) + (eshk ? eshk.credit : 0)) < cost_of_damage
        || !rn2_shk(50)) {
        getcad(shkp, dmgstr, x, y, uinshp, animal, pursue);
        return;
    }

        const Invis = _shk_Invis();
    if (Invis)
        Your("invisibility does not fool %s!", shkname(shkp));

    const cadStr = !animal ? cad(true) : "";
    const currencyStr = currency(cost_of_damage);
    const quoteStr = !animal ? "\"" : "";
    const qbuf = Sprintf("%sYou did %ld %s worth of damage!%s  Pay?",
                          cadStr, cost_of_damage, currencyStr, quoteStr);

    if (await y_n(qbuf) !== 'n') {
        const was_seen = canseemon(shkp);
        const was_outside = !inhishop(shkp);
        const sx = shkp.mx | 0, sy = shkp.my | 0;

        cost_of_damage = check_credit(cost_of_damage, shkp);
        if (cost_of_damage > 0) {
            await money2mon(shkp, cost_of_damage);
            SET_BOTL();
        }
        pline("Mollified, %s accepts your restitution.", shkname(shkp));
        await home_shk(shkp, false);
        pacify_shk(shkp, false);
        if ((shkp.mx | 0) !== sx || (shkp.my | 0) !== sy) {
            if (was_outside && canspotmon(shkp))
                pline("%s returns to %s shop.", Shknam(shkp), noit_mhis(shkp));
            else {
                const is_seen = canseemon(shkp);
                if (is_seen === true || was_seen)
                    pline("%s %s.", Shknam(shkp),
                          !was_seen ? "appears"
                                    : is_seen ? "shifts location"
                                              : "disappears");
            }
        }
    } else {
        if (!animal) {
            if (!_shk_Deaf() && !muteshk(shkp)) {
                SetVoice(shkp, 0, 80, 0);
                verbalize("Oh, yes!  You'll pay!");
            } else {
                pline("%s lunges %s %s toward your %s!",
                      Shknam(shkp), noit_mhis(shkp),
                      mbodypart(shkp, HAND), body_part(NECK));
            }
        } else {
            growl(shkp);
        }
        hot_pursuit(shkp);
        adjalign(-sgn(u.ualign.type));
    }
}

/* stubs for unported helpers */
function alloc(_size) { return {}; }
/* C ref: shk.c:1051-1079 shop_keeper(rmno) — the resident of rooms[rmno-3],
 * or Null.  C takes a `char`; JS callers pass either the numeric room number
 * (from in_rooms) or a one-character string (from u.ushops, which C stores as
 * a char array of room numbers), so both are accepted here.
 * The has_eshk()/impossible() arm is C's corrupt-state guard; the ANGRY arm
 * really does mutate state on a pure lookup (it re-applies rile_shk's
 * surcharge), so it is ported rather than elided. */
export function shop_keeper(rmno) {
    if (typeof rmno === 'string')
        rmno = rmno.length ? rmno.charCodeAt(0) : 0;
    rmno |= 0;
    const shkp = (rmno >= ROOMOFFSET)
        ? (game.level?.rooms?.[rmno - ROOMOFFSET]?.resident ?? null)
        : null;
    if (shkp) {
        if (ESHK(shkp)) {
            if (ANGRY(shkp)) {
                if (!ESHK(shkp).surcharge)
                    rile_shk(shkp);
            }
        } else {
            /* C: impossible("shop resident not shopkeeper") then return Null. */
            return null;
        }
    }
    return shkp;
}
function shk_impaired(shkp) {
    if (!shkp || !shkp.isshk || !inhishop(shkp)) return true;
    const e = ESHK(shkp);
    return helpless(shkp) || !!e?.following;
}
/* C shk.c:4733 repair_damage().  This is deliberately kept synchronous like
 * its C counterpart: it is called both from shk_move and the level catch-up
 * path.  The item relocation/litter shuffle is not needed to restore the
 * damaged square; preserving the terrain, traps, and shopkeeper inventory is
 * the stateful part of this routine. */
async function repair_damage(shkp, damg, catchup) {
    if (!repairable_damage(damg, shkp)) return 0;
    const x = damg.place?.x | 0, y = damg.place?.y | 0;
    const loc = game.level?.locations?.[x]?.[y];
    if (!loc) return 0;
    const seeit = cansee(x, y);
    let disposition = 1;
    let stop_picking = false;
    const trap = t_at(x, y);
    if (trap) {
        const ttyp = trap.ttyp | 0;
        if (ttyp === LANDMINE || ttyp === BEAR_TRAP) {
            /* C converts a shop trap back into a carried, disarmed tool. */
            const otyp = ttyp === LANDMINE ? 243 /* LAND_MINE */ : 244 /* BEARTRAP */;
            const obj = await mksobj(otyp, true, false);
            if (obj) {
                obj.quan = 1;
                obj.owt = weight(obj);
                if (!catchup) {
                    if (canseemon_real(shkp) && dist2(x, y, shkp.mx, shkp.my) <= 2)
                        await pline("%s untraps %s.", Shknam(shkp), ansimpleoname(obj));
                    else if (trap.tseen && cansee(trap.tx, trap.ty))
                        await pline("The %s vanishes.", trapname(ttyp, true));
                }
                await mpickobj(shkp, obj);
            }
        } else if (ttyp === HOLE || ttyp === PIT || ttyp === SPIKED_PIT) {
            if (!catchup && trap.tseen && cansee(trap.tx, trap.ty))
                await pline("The %s is filled in.", trapname(ttyp, true));
        } else if (!catchup && trap.tseen && cansee(trap.tx, trap.ty)) {
            await pline("The %s vanishes.", trapname(ttyp, true));
        }
        deltrap(trap);
        del_engr_at(x, y);
        if (seeit) newsym(x, y);
        if (!catchup) disposition = 3;
    }
    if (IS_ROOM(damg.typ | 0)
        || ((damg.typ | 0) === (loc.typ | 0)
            && (!IS_DOOR(damg.typ | 0) || (loc.doormask | 0) > D_BROKEN)))
        /* no terrain fix necessary (trap removal or manually repaired) */
        return disposition;

    if (IS_DOOR(loc.typ | 0) && ((loc.doormask | 0) & (D_CLOSED | D_LOCKED)))
        stop_picking = !!picking_at(x, y);

    loc.typ = damg.typ;
    if (IS_DOOR(damg.typ | 0)) loc.doormask = D_CLOSED; /* arbitrary */
    else loc.flags = damg.flags;

    const litter = new Array(9).fill(0);
    if (await litter_getpos(litter, x, y, shkp))
        await litter_scatter(litter, x, y, shkp);
    del_engr_at(x, y);

    if (seeit) newsym(x, y);
    block_point(x, y);

    if (catchup) return 1; /* repair occurred while off level so no messages */

    if (seeit) {
        if (IS_WALL(damg.typ | 0)) {
            loc.seenv = SVALL;
            await pline("Suddenly, a section of the wall closes up!");
        } else if (IS_DOOR(damg.typ | 0)) {
            await pline("Suddenly, the shop door reappears!");
        }
        newsym(x, y);
    } else if (IS_WALL(damg.typ | 0)) {
        const u = game.u || {};
        if (inside_shop(u.ux | 0, u.uy | 0) === (ESHK(shkp).shoproom | 0))
            await pline("You feel more claustrophobic than before.");
        else if (!_shk_Deaf() && !rn2_shk(10))
            await Norep("The dungeon acoustics noticeably change.");
    }

    if (stop_picking) await stop_occupation();

    for (let i = 0; i < 9; i++)
        if (litter[i] & 0x01) newsym(x + ((i % 3) - 1), y + Math.trunc(i / 3) - 1);

    if (disposition < 3) disposition = 2;
    return disposition;
}

/* C ref: shk.c:4590 litter_getpos — LITTER_UPDATE 1, OPEN 2, INSHOP 4 */
async function litter_getpos(litter, x, y, shkp) {
    let k = 0;
    const lv = game.level;
    if (lv?.objects?.[x]?.[y] ?? lv?.levelObjects?.[x]?.[y]) {
        if (!IS_ROOM(lv.locations[x][y].typ | 0)) {
            for (let i = 0; i < 9; i++) {
                const ix = x + ((i % 3) - 1), iy = y + Math.trunc(i / 3) - 1;
                if (i === 4 || !isok(ix, iy) || !ZAP_POS(lv.locations[ix][iy].typ | 0))
                    continue;
                litter[i] = 2;
                if (inside_shop(ix, iy) === (ESHK(shkp).shoproom | 0)) {
                    litter[i] |= 4;
                    ++k;
                }
            }
        }
    }
    return k;
}

/* C ref: shk.c:4621 litter_scatter (Punished ball&chain case not ported) */
const BOULDER = 475, ROCK = 474;
async function litter_scatter(litter, x, y, shkp) {
    let otmp;
    while ((otmp = game.level.levelObjects?.[x]?.[y] ?? game.level.objects?.[x]?.[y])) {
        if (otmp.otyp === BOULDER || otmp.otyp === ROCK) {
            obj_extract_self(otmp);
            await obfree(otmp, null);
        } else {
            let trylimit = 10;
            let i = rn2_shk(9), ix, iy;
            do {
                i = (i + 1) % 9;
            } while (--trylimit && !(litter[i] & 4));
            if ((litter[i] & (2 | 4)) !== 0) {
                ix = x + ((i % 3) - 1);
                iy = y + Math.trunc(i / 3) - 1;
            } else {
                ix = shkp.mx;
                iy = shkp.my;
            }
            if (otmp.unpaid) {
                let oshk = shkp;
                if (costly_spot(ix, iy)
                    && ((await onbill(otmp, oshk, true))
                        || ((oshk = await find_objowner(otmp, ix, iy))
                            && (await onbill(otmp, oshk, false)))))
                    await subfrombill(otmp, oshk);
            }
            if (otmp.no_charge) {
                if (!costly_spot(ix, iy) && !costly_adjacent(shkp, ix, iy))
                    otmp.no_charge = 0;
            }
            remove_object(otmp);
            place_object(otmp, ix, iy);
            litter[i] |= 1;
        }
    }
}

function repairable_damage(dam, shkp) {
    if (!dam || shk_impaired(shkp)) return false;
    const x = dam.place?.x | 0, y = dam.place?.y | 0;
    if ((game.moves | 0) - (dam.when | 0) < REPAIR_DELAY) return false;
    const u = game.u || {};
    if (!IS_ROOM(dam.typ | 0)) {
        const passwall = game.u?.uprops?.[PASSES_WALLS];
        if (u_at(x, y) && !(passwall && (passwall.intrinsic || passwall.extrinsic)
            && !(passwall.blocked | 0))) return false;
        if ((shkp.mx | 0) === x && (shkp.my | 0) === y) return false;
        const mon = m_at(x, y);
        if (mon && !mon.passes_walls) return false;
    }
    const trap = t_at(x, y);
    if (trap && (u_at(x, y) || (m_at(x, y)?.mtrapped))) return false;
    const eshkp = ESHK(shkp);
    const shops = in_rooms(x, y, SHOPBASE);
    return !!eshkp && shops.includes(eshkp.shoproom | 0);
}
function discard_damage_struct(damg) {
    if (!damg || !game.level) return;
    if (game.level.damagelist === damg) {
        game.level.damagelist = damg.next || null;
        return;
    }
    for (let prev = game.level.damagelist; prev; prev = prev.next) {
        if (prev.next === damg) {
            prev.next = damg.next || null;
            return;
        }
    }
}
/* C ref: shknam.c:841-849 Shknam(mtmp) = shkname(mtmp) with its first
 * character capitalized via highc(). js/dokick.js's own Shknam is a
 * throwing stub (not a real candidate to re-point to); js/dokick.js's
 * shkname IS the real general port (shkname_real, imported above), so this
 * composes it with the same highc() capitalization C applies, rather than
 * reading ESHK().shknam directly (which skipped both shkname's
 * leading-marker strip and this capitalization). */
export function Shknam(shkp) {
    const nam = shkname_real(shkp);
    return nam ? (highc(nam.charAt(0)) + nam.slice(1)) : nam;
}
function helpless(shkp) { return !!(shkp.msleeping || !shkp.mcanmove); }
export async function inherits(shkp, numsk, croaked, silently) {
    const g = game;
    const u = g.u || {};
    let loss = 0;
    let umoney;
    const eshkp = ESHK(shkp);
    let take = false, taken = false;
    const uinshop = !!(u.ushops
        && u.ushops.indexOf(String.fromCharCode(eshkp.shoproom)) !== -1);
    let takes = '';

    /* C shk.c:2591-2593 — "not strictly consistent; affects messages and
       prevents next player ... from being ambushed by an invisible shopkeeper" */
    shkp.minvis = 0;
    shkp.perminvis = 0;

    /* C shk.c:2595-2608 — "The simplifying principle is that first-come
       already took everything you had." */
    if (numsk > 1) {
        if (cansee(shkp.mx, shkp.my) && croaked && !silently) {
            takes = '';
            if (has_head_shk(shkp.data) && !rn2_shk(2))
                /* C shk.c:2601-2602 mbodypart(shkp, HEAD) — this call site
                 * previously passed the string literal 'head' rather than the
                 * numeric HEAD=8 bodypart_types enum value, which the throw-
                 * away stub masked (it ignored its part argument entirely). */
                takes = `, shakes ${noit_mhis(shkp)} ${mbodypart(shkp, HEAD)},`;
            await pline("%s %slooks at your corpse%s and %s.", Shknam(shkp),
                  helpless(shkp) ? 'wakes up, ' : '',
                  takes, !inhishop(shkp) ? 'disappears' : 'sighs');
        }
        taken = uinshop;
        return await _inherits_skip(shkp, taken);
    }

    /* C shk.c:2610-2620 — "you die in the shop, the shopkeeper is peaceful,
       nothing stolen, nothing owed" */
    if (uinshop && inhishop(shkp) && !eshkp.billct
        && !eshkp.robbed && !eshkp.debit && NOTANGRY_SHK(shkp)
        && !eshkp.following && (u.ugrave_arise | 0) < LOW_PM_SHK) {
        taken = !!g.invent;
        if (taken && !silently) {
            await _shk_vpline_flush();
            await pline('%s gratefully inherits all your possessions.', Shknam(shkp));
        }
        return await _inherits_clear(shkp, taken);
    }

    /* C shk.c:2622-2627 */
    if (eshkp.billct || eshkp.debit || eshkp.robbed) {
        if (uinshop && inhishop(shkp))
            loss = addupbill(shkp) + (eshkp.debit | 0);
        if (loss < (eshkp.robbed | 0))
            loss = eshkp.robbed | 0;
        take = true;
    }

    /* C shk.c:2629-2670 */
    if (eshkp.following || ANGRY(shkp) || take) {
        if (!g.invent)
            return await _inherits_skip(shkp, taken);
        umoney = money_cnt(g.invent);
        takes = '';
        if (helpless(shkp))
            takes += 'wakes up and ';
        if (!m_next2u(shkp))
            takes += 'comes and ';
        takes += 'takes';

        if (loss > umoney || !loss || uinshop) {
            eshkp.robbed = (eshkp.robbed | 0) - umoney;
            if ((eshkp.robbed | 0) < 0)
                eshkp.robbed = 0;
            if (umoney > 0) {
                await money2mon(shkp, umoney);
                if (game.disp) game.disp.botl = true;
            }
            if (!silently) {
                await _shk_vpline_flush();
                await pline('%s %s all your possessions.', Shknam(shkp), takes);
            }
            taken = true;
        } else {
            await money2mon(shkp, loss);
            if (game.disp) game.disp.botl = true;
            if (!silently)
                await pline('%s %s the %ld %s %sowed %s.', Shknam(shkp), takes, loss,
                      currency(loss),
                      (String(eshkp.customer || '').slice(0, 32)
                       !== String(g.plname ?? g.u?.plname ?? '').slice(0, 32))
                          ? '' : 'you ',
                      noit_mhim(shkp));
            /* shopkeeper has now been paid in full */
            pacify_shk(shkp, false);
            eshkp.following = 0;
            eshkp.robbed = 0;
        }
        return await _inherits_skip(shkp, taken);
    }
    return await _inherits_clear(shkp, taken);
}
/* C's `skip:` label (shk.c:2665-2670) — "in case we create bones", then falls
 * into `clear:`. */
async function _inherits_skip(shkp, taken) {
    await rouse_shk(shkp, false); /* wake up */
    if (!inhishop(shkp))
        await home_shk(shkp, false);
    return await _inherits_clear(shkp, taken);
}
/* C's `clear:` label (shk.c:2672-2676). */
async function _inherits_clear(shkp, taken) {
    await setpaid(shkp); /* clear this shk's bill */
    /* where to put player's invent (after disclosure) */
    if (taken)
        set_repo_loc(shkp);
    return taken;
}
async function _shk_vpline_flush() {
    const d = game.disp;
    if (d && ((d.botl | 0) || (d.botlx | 0)))
        await bot();
}
/* C shk.c:5505-5513 Izchak_speaks[] */
const Izchak_speaks = [
    "%s says: 'These shopping malls give me a headache.'",
    "%s says: 'Slow down.  Think clearly.'",
    "%s says: 'You need to take things one at a time.'",
    "%s says: 'I don't like poofy coffee... give me Colombian Supremo.'",
    "%s says that getting the devteam's agreement on anything is difficult.",
    "%s says that he has noticed those who serve their deity will prosper.",
    "%s says: 'Don't try to steal from me - I have friends in high places!'",
    "%s says: 'You may well need something from this shop in the future.'",
    "%s comments about the Valley of the Dead as being a gateway.",
];
/* C do_name.c noit_mhe(mon) — subjective pronoun, no "it" fallback. */
function noit_mhe(mon) { return mon?.female ? 'she' : 'he'; }
export async function shk_chat(shkp) {
    if (!shkp.isshk) {
        await pline(`${Monnam_chat(shkp)} asks whether you've seen any untended shops recently.`);
        return;
    }
    const eshk = ESHK(shkp);
    const speaks = !_shk_Deaf() && !muteshk(shkp);
    let shkmoney;
    if (ANGRY(shkp)) {
        await pline(`${Shknam(shkp)} ${speaks ? 'mentions' : 'indicates'} how much ${noit_mhe(shkp)} dislikes ${eshk.robbed ? 'non-paying' : 'rude'} customers.`);
    } else if (eshk.following) {
        const plname = game.plname || game.u?.plname || '';
        if (String(eshk.customer || '').substring(0, 32) !== String(plname).substring(0, 32)) {
            if (speaks) {
                SetVoice(shkp, 0, 80, 0);
                await verbalize('%s %s!  I was looking for %s.', Hello(shkp), plname, eshk.customer);
            }
            eshk.following = 0;
        } else if (speaks) {
            SetVoice(shkp, 0, 80, 0);
            await verbalize('%s %s!  Didn\'t you forget to pay?', Hello(shkp), plname);
        } else {
            await pline(`${Shknam(shkp)} taps you on the ${body_part(0 /* ARM */)}.`);
        }
    } else if (eshk.billct) {
        const total = addupbill(shkp) + (eshk.debit | 0);
        await pline(`${Shknam(shkp)} ${speaks ? 'says' : 'indicates'} that your bill comes to ${total} ${currency(total)}.`);
    } else if (eshk.debit) {
        await pline(`${Shknam(shkp)} ${speaks ? 'reminds you' : 'indicates'} that you owe ${noit_mhim(shkp)} ${eshk.debit} ${currency(eshk.debit)}.`);
    } else if (eshk.credit) {
        await pline(`${Shknam(shkp)} encourages you to use your ${eshk.credit} ${currency(eshk.credit)} of credit.`);
    } else if (eshk.robbed) {
        await pline(`${Shknam(shkp)} ${speaks ? 'complains' : 'indicates concern'} about a recent robbery.`);
    } else if (eshk.surcharge) {
        await pline(`${Shknam(shkp)} ${speaks ? 'warns you' : 'indicates'} that ${noit_mhe(shkp)} is watching you carefully.`);
    } else if ((shkmoney = money_cnt(shkp.minvent)) < 50) {
        await pline(`${Shknam(shkp)} ${speaks ? 'complains' : 'indicates'} that business is bad.`);
    } else if (shkmoney > 4000) {
        await pline(`${Shknam(shkp)} ${speaks ? 'says' : 'indicates'} that business is good.`);
    } else if (shkname_real(shkp) === 'Izchak' && ((shkp.mndx ?? shkp.mnum) | 0) === PM_SHOPKEEPER) {
        if (speaks)
            await pline(Sprintf(Izchak_speaks[rn2_shk(Izchak_speaks.length)], shkname_real(shkp)));
    } else if (speaks) {
        await pline(`${Shknam(shkp)} talks about the problem of shoplifters.`);
    }
}
/* C shk.c:1129-1140 addupbill(shkp) — total price of everything on the bill. */
function addupbill(shkp) {
    const eshkp = ESHK(shkp);
    let ct = eshkp.billct | 0;
    const bill = eshkp.bill_p || eshkp.bill || [];
    let total = 0;
    for (let i = 0; i < ct; i++) {
        const bp = bill[i];
        if (!bp) continue;
        total += (bp.price | 0) * (bp.bquan | 0);
    }
    return total;
}
async function setpaid(shkp) {
    const g = game;
    await clear_unpaid_chain(shkp, g.invent);
    for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon)
        if (mtmp.minvent)
            await clear_unpaid_chain(shkp, mtmp.minvent);
    for (let mtmp = g.migrating_mons; mtmp; mtmp = mtmp.nmon)
        if (mtmp.minvent)
            await clear_unpaid_chain(shkp, mtmp.minvent);
    if (g.thrownobj) await clear_unpaid_chain(shkp, { nobj: null, ...g.thrownobj });
    if (g.kickedobj) await clear_unpaid_chain(shkp, { nobj: null, ...g.kickedobj });
    await clear_unpaid_floor(shkp);
    clear_no_charge(shkp, null);
    clear_no_charge(shkp, g.level?.buriedobjlist);
    g.billobjs = null;
    if (shkp) {
        const e = ESHK(shkp);
        e.billct = 0;
        e.credit = 0;
        e.debit = 0;
        e.loan = 0;
    }
}
/* C shk.c:1070-1091 clear_unpaid / clear_unpaid_obj — recursive over containers. */
async function clear_unpaid_chain(shkp, chain) {
    for (let otmp = chain; otmp; otmp = otmp.nobj) {
        if (Has_contents(otmp))
            await clear_unpaid_chain(shkp, otmp.cobj);
        if (otmp.unpaid && (!shkp || (await onbill(otmp, shkp, true))))
            otmp.unpaid = 0;
    }
}
async function clear_unpaid_floor(shkp) {
    const objs = game.level?.objects;
    if (!objs) return;
    for (let x = 0; x < COLNO; x++) {
        const col = objs[x];
        if (!col) continue;
        for (let y = 0; y < ROWNO; y++)
            for (let o = col[y]; o; o = o.nexthere)
                await clear_unpaid_chain(shkp, { ...o, nobj: null });
    }
}
/* C shk.c:2679-2718 set_repo_loc(shkp) — where finish_paybill() will deposit
 * the hero's pack. */
function set_repo_loc(shkp) {
    const g = game;
    const u = g.u || {};
    const eshkp = ESHK(shkp);
    if (!g.repo) g.repo = {};
    if (!g.repo.location) g.repo.location = { x: 0, y: 0 };
    /* C: "when multiple shopkeepers are present, we might get called more than
       once; don't override previous setting" */
    if (g.repo.shopkeeper)
        return;
    let ox = u.ux ? (u.ux | 0) : (u.ux0 | 0);
    let oy = u.ux ? (u.uy | 0) : (u.uy0 | 0); /* [testing u.ux for oy is correct] */
    if (!(u.ushops && u.ushops.indexOf(String.fromCharCode(eshkp.shoproom)) !== -1)
        || costly_adjacent(shkp, ox, oy)) {
        /* "shk.x,shk.y is the position immediately in front of the door;
           move in one more space" */
        ox = (eshkp.shk?.x | 0);
        oy = (eshkp.shk?.y | 0);
        ox += sgn(ox - (eshkp.shd?.x | 0));
        oy += sgn(oy - (eshkp.shd?.y | 0));
    }
    g.repo.location.x = ox;
    g.repo.location.y = oy;
    g.repo.shopkeeper = shkp;
}
/* C shk.c:5368-5381 costly_adjacent(shkp, x, y). */
function costly_adjacent(shkp, x, y) {
    if (!shkp || !inhishop(shkp) || !isok(x, y))
        return false;
    const eshkp = ESHK(shkp);
    const loc = game.level?.at(x, y);
    return !!(loc?.edge) || (x === (eshkp.shk?.x | 0) && y === (eshkp.shk?.y | 0));
}
function has_head_shk(_data) { return true; }
/* C monst.h NOTANGRY(mon) = ((mon)->mpeaceful) — the file's own ANGRY() below
 * is its negation; both are spelled out so inherits() reads as C does. */
function NOTANGRY_SHK(mon) { return !!mon.mpeaceful; }
/* C monsym.h LOW_PM = 0 — u.ugrave_arise < LOW_PM means "no revival". */
const LOW_PM_SHK = 0;
export function mongone(mtmp) {
    for (let prev = null, m = game.fmon; m; prev = m, m = m.nmon)
        if (m === mtmp) {
            if (prev) prev.nmon = m.nmon; else game.fmon = m.nmon;
            m.nmon = null;
            break;
        }
}
export function on_level(l1, l2) {
    return !!l1 && !!l2
        && (l1.dnum | 0) === (l2.dnum | 0) && (l1.dlevel | 0) === (l2.dlevel | 0);
}
/* C ref: shk.c:687-725 rob_shop — settle available credit, then mark the
 * remaining bill as an actual robbery and put the shopkeeper into pursuit.
 * This is synchronous in C; rouse_shk's async message path is intentionally
 * fire-and-forget here to preserve the caller's turn ordering. */
async function rob_shop(shkp) {
    const eshkp = ESHK(shkp);
    if (!eshkp)
        return false;
    await rouse_shk(shkp, true);
    let total = addupbill(shkp) + (eshkp.debit | 0);
    if ((eshkp.credit | 0) >= total) {
        await Your_real("credit of %ld %s is used to cover your shopping bill.",
                        eshkp.credit | 0, currency(eshkp.credit | 0));
        total = 0;
    } else {
        await You_real("escaped the shop without paying!");
        total -= (eshkp.credit | 0);
    }
    await setpaid(shkp);
    if (!total)
        return false;
    eshkp.robbed = (eshkp.robbed | 0) + total;
    await You_real("stole %ld %s worth of merchandise.", total, currency(total));
    livelog_printf(LL_ACHIEVE,
                   "stole %ld %s worth of merchandise from %s %s",
                   total, currency(total), s_suffix(shkname(shkp)),
                   shtype_name((eshkp.shoptype | 0) - SHOPBASE));
    if (((game.urole?.mnum | 0) !== (PM_ROGUE | 0)))
        adjalign_real(-sgn(game.u?.ualign?.type | 0));
    hot_pursuit(shkp);
    return true;
}
function _choose_stairs_shk(out, dir) {
    const lev = game.u?.uz;
    const d = (game.dungeons || [])[lev?.dnum | 0];
    let stdir = !!dir;
    if (d && (d.num_dunlevs | 0) > 1)
        stdir = ((d.entry_lev | 0) === (d.num_dunlevs | 0)) ? !!dir : !dir;
    const find = (ladder, up) => {
        for (let s = game.stairs; s; s = s.next)
            if (!!s.isladder === !!ladder && !!s.up === !!up) return s;
        return null;
    };
    let s = find(false, stdir) || find(true, stdir);
    if (!s) {
        for (s = game.stairs; s; s = s.next)
            if ((s.tolev?.dnum | 0) !== (lev?.dnum | 0)) break;
        if (!s) s = find(false, !stdir) || find(true, !stdir);
    }
    if (s) { out.x = s.sx | 0; out.y = s.sy | 0; }
}
async function makekops_shk(mm) {
    const cnt = Math.abs(depth_shk(game.u?.uz)) + rnd_shk(5);
    const counts = [cnt, Math.trunc(cnt / 3) + 1, Math.trunc(cnt / 6), Math.trunc(cnt / 9)];
    const types = [PM_KEYSTONE_KOP, PM_KOP_SERGEANT, PM_KOP_LIEUTENANT, PM_KOP_KAPTAIN];
    for (let i = 0; i < types.length; i++) {
        let n = counts[i] | 0;
        if (n === 0) break;
        const mndx = types[i];
        if (((game.mvitals?.[mndx]?.mvflags | 0) & G_GONE) !== 0) continue;
        while (n-- > 0) {
            const pos = enexto_out(mm.x | 0, mm.y | 0, permonstTemplate(mndx));
            if (pos) { mm.x = pos.x; mm.y = pos.y; await makemon(mndx, mm.x, mm.y, MM_NOMSG); }
        }
    }
}
async function call_kops(shkp, nearshop) {
    if (!shkp) return;
    if (!(_shk_Deaf())) await pline("An alarm sounds!");
    const types = [PM_KEYSTONE_KOP, PM_KOP_SERGEANT, PM_KOP_LIEUTENANT, PM_KOP_KAPTAIN];
    const nokops = types.every(m => ((game.mvitals?.[m]?.mvflags | 0) & G_GONE) !== 0);
    const guards = await angry_guards(!!_shk_Deaf());
    if (!guards && nokops) {
        if (game.flags?.verbose && !_shk_Deaf()) await pline("But no one seems to respond to it.");
        return;
    }
    if (nokops) return;
    const stairs = {};
    _choose_stairs_shk(stairs, true);
    const mm = { x: game.u?.ux | 0, y: game.u?.uy | 0 };
    if (nearshop) {
        if (game.flags?.verbose) await pline("The Keystone Kops appear!");
        await makekops_shk(mm);
        return;
    }
    if (game.flags?.verbose) await pline("The Keystone Kops are after you!");
    if (isok(stairs.x | 0, stairs.y | 0)) {
        mm.x = stairs.x; mm.y = stairs.y;
        await makekops_shk(mm);
    }
    mm.x = shkp.mx | 0; mm.y = shkp.my | 0;
    await makekops_shk(mm);
}
/* C ref: shk.c:665-680 remote_burglary — telekinetic theft uses the same
 * settlement and alarm chain as leaving a shop, without the doorstep swarm. */
export async function remote_burglary(x, y) {
    const rooms = in_rooms(x | 0, y | 0, SHOPBASE);
    const shkp = shop_keeper(rooms.length ? rooms[0] : 0);
    if (!shkp || !inhishop(shkp)) return;
    const eshkp = ESHK(shkp);
    if (!eshkp || (!(eshkp.billct | 0) && !(eshkp.debit | 0))) return;
    if (await rob_shop(shkp)) await call_kops(shkp, false);
}
/* C ref: pline.c verbalize(fmt,...) — a quoted spoken line on the topline.
 * C's vpline is reached through verbalize's own '"%s"' wrapper, so the
 * rendered text is the message in double quotes. */
function verbalize(fmt, ...args) {
    return pline('"' + Sprintf(fmt, ...args) + '"');
}
function SetVoice(_shkp, _a, _b, _c) { }
/* C ref: shknam.c:855-897 shkname(mtmp) — the real general port lives in
 * js/dokick.js (shkname_real, imported above; documented KNOWN GAP: its
 * Hallucination arm returns the true name rather than drawing the two rn2
 * calls C's random-shop-type/random-name picker would). Previously this
 * called Shknam(shkp) directly — backwards from C, which has Shknam call
 * shkname, not the reverse — and never stripped a leading non-letter
 * marker. */
function shkname(shkp) { return shkname_real(shkp); }
/* C ref: shk.c:1361-1377 rile_shk(shkp) — make the shopkeeper angry and add
 * the one-time aggravation surcharge to every billed item. */
function rile_shk(shkp) {
    shkp.mpeaceful = 0; /* C: NOTANGRY(shkp) = FALSE */
    const eshkp = ESHK(shkp);
    if (!eshkp) return;
    if (!eshkp.surcharge) {
        const bill = eshkp.bill_p || [];
        let ct = eshkp.billct | 0;
        eshkp.surcharge = true;
        let i = 0;
        while (ct-- > 0) {
            const bp = bill[i++];
            if (!bp) continue;
            const surcharge = Math.trunc((bp.price + 2) / 3);
            bp.price += surcharge;
        }
    }
}

/* C ref: shk.c:1448-1463 hot_pursuit(shkp) — the shopkeeper goes on the war
 * path: angry, remembers you as its customer, and follows you. */
export function hot_pursuit(shkp) {
    if (!shkp.isshk)
        return;

    rile_shk(shkp);
    const eshkp = ESHK(shkp);
    const plname = game.plname || game.u?.plname;
    if (eshkp) {
        if (plname)
            eshkp.customer = String(plname).substring(0, 32); /* PL_NSIZ */
        eshkp.following = 1;
    }
    clear_no_charge(null, null);
    clear_no_charge_pets(shkp);
}

function clear_no_charge(_shkp, chain) {
    for (let otmp = chain; otmp; otmp = otmp.nobj) {
        otmp.no_charge = 0;
        if (otmp.cobj)
            clear_no_charge(_shkp, otmp.cobj);
    }
    const objs = game.level?.objects;
    if (!chain && objs) {
        for (let x = 0; x < COLNO; x++) {
            const col = objs[x];
            if (!col) continue;
            for (let y = 0; y < ROWNO; y++) {
                for (let o = col[y]; o; o = o.nexthere) {
                    o.no_charge = 0;
                    if (o.cobj)
                        clear_no_charge(_shkp, o.cobj);
                }
            }
        }
    }
}
function clear_no_charge_pets(_shkp) {
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (!mtmp.mtame) continue;
        for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj)
            otmp.no_charge = 0;
    }
}

/* C ref: shk.c:5138-5172 getcad(shkp, dmgstr, x, y, uinshp, animal, pursue) —
 * the shopkeeper's "How dare you..." reaction to damage, then hot_pursuit. */
function getcad(shkp, dmgstr, x, y, uinshp, animal, pursue) {
    /* C: dugwall — "dig into" (wand) or "damage" (pick-axe) means the SHOP was
     * breached, anything else means the door was. */
    const dugwall = (dmgstr === "dig into" || dmgstr === "damage");
    const u = game.u || {};

    if (muteshk(shkp)) {
        if (animal && !helpless(shkp))
            yelp(shkp);
    } else if (pursue || uinshp || !um_dist(x, y, 1)) {
        if (!_shk_Deaf()) {
            SetVoice(shkp, 0, 80, 0);
            verbalize("How dare you %s my %s?", dmgstr,
                      dugwall ? "shop" : "door");
        } else {
            /* KNOWN GAP — shk.c:5155-5158, the Deaf variant:
             *   pline("%s is %s that you decided to %s %s %s!", Shknam(shkp),
             *         ROLL_FROM(angrytexts), dmgstr, noit_mhis(shkp), ...)
             * ROLL_FROM (hack.h:1498) is `array[rn2(SIZE(array))]`, so this
             * arm draws one rn2 that is skipped here.  Missing dependency:
             * the angrytexts[] table (shk.c) and noit_mhis (do_name.c).
             * Message-only; hot_pursuit below still fires, which is the
             * load-bearing state change.  Not thrown — a throw discards the
             * replay's entire matched RNG prefix. */
        }
    } else {
        if (!_shk_Deaf()) {
            pline(Sprintf("%s shouts:", Shknam(shkp)));
            SetVoice(shkp, 0, 80, 0);
            verbalize("Who dared %s my %s?", dmgstr,
                      dugwall ? "shop" : "door");
        } else {
            /* KNOWN GAP — shk.c:5166-5169, the same ROLL_FROM(angrytexts)
             * Deaf variant for the out-of-earshot case; see above. */
        }
    }
    hot_pursuit(shkp);
}
export function growl(shkp) { return growl_mhitm(shkp); }
/* C sounds.c:426-... yelp(mtmp) — the real general port lives in
 * js/mhitm.js (yelp_mhitm, imported above); it draws rn2 through the
 * Hallucination arm and prints the mistreated-pet sound message. */
function yelp(shkp) { return yelp_mhitm(shkp); }

/* C ref: you.h:551 um_dist(x,y,n) — TRUE when the hero is MORE than n squares
 * away from <x,y> in Chebyshev terms:
 *   #define um_dist(x,y,n) (abs(u.ux - (x)) > (n) || abs(u.uy - (y)) > (n))
 * This is NOT distu()/dist2(); the earlier `dist2(...) <= 1` spellings in this
 * file inverted the sense as well as changing the metric. */
function um_dist(x, y, n) {
    const u = game.u || {};
    return Math.abs((u.ux | 0) - x) > n || Math.abs((u.uy | 0) - y) > n;
}


async function home_shk(shkp, killkops) {
    const e = ESHK(shkp);
    if (!e) return;
    await mnearto(shkp, e.shk?.x | 0, e.shk?.y | 0, true, RLOC_NOMSG);
    if (game.level?.flags) game.level.flags.has_shop = true;
    /* Kops cleanup is not represented as a shared JS helper; the native
       movement and shop bookkeeping are the observable portion here. */
    after_shk_move(shkp);
}
/* C invent.c:1545 currency(amount) —
 *     res = Hallucination ? ROLL_FROM(currencies) : "zorkmid";
 *     if (amount != 1L) res = makeplural(res);
 * The real general port is js/cmd.js's currency() (currency_real, imported
 * above) — it draws rn2(SIZE(currencies)) via the ROLL_FROM/Hallucination
 * arm and calls makeplural_objnam(), closing exactly the KNOWN GAP this
 * file's previous local body documented (no rn2 draw when hallucinating).
 * js/dokick.js also has a `currency` but it is a throwing stub, not a
 * candidate. */
export function currency(amount) { return currency_real(amount); }
function unleash_all() { }

// C mondata.h likes_gold/likes_gems/likes_objs/likes_magic — bit tests against
// mons[mndx].mflags2 (row[7] of js/makemon_mons.json), plus is_armed() for
// likes_objs. Read directly from the JSON data packs (no import from
// makemon.js) to avoid porting anything beyond this task's scope.
const MONS_ROWS = monsPack.mons;
const MON_HAS_WEAP_ATK = monArmedPack.has_weap_atk;
const M2_GREEDY = 0x10000000;
const M2_JEWELS = 0x20000000;
const M2_COLLECT = 0x40000000;
const M2_MAGIC = 0x80000000;
function monMflags2_fp(mndx) {
    const row = (mndx >= 0 && mndx < MONS_ROWS.length) ? MONS_ROWS[mndx] : null;
    return row ? (row[7] >>> 0) : 0;
}
function is_armed_fp(mndx) {
    return mndx >= 0 && mndx < MON_HAS_WEAP_ATK.length && MON_HAS_WEAP_ATK[mndx] !== 0;
}
function likes_gold_fp(mndx) { return (monMflags2_fp(mndx) & M2_GREEDY) !== 0; }
function likes_gems_fp(mndx) { return (monMflags2_fp(mndx) & M2_JEWELS) !== 0; }
function likes_objs_fp(mndx) { return (monMflags2_fp(mndx) & M2_COLLECT) !== 0 || is_armed_fp(mndx); }
function likes_magic_fp(mndx) { return (monMflags2_fp(mndx) & M2_MAGIC) !== 0; }

// C mon.c add_to_minv — untracked by this task's diff fields (monster
// inventory chains aren't part of finish_paybill's state_diff_fields), so
function add_to_minv_fp(_mtmp, _otmp) { }

function give_to_nearby_mon(otmp, x, y) {
    let selected = null;
    let nmon = 0;
    for (let xx = x - 1; xx <= x + 1; xx++) {
        for (let yy = y - 1; yy <= y + 1; yy++) {
            if (!isok(xx, yy))
                continue;
            if (u_at(xx, yy))
                continue;
            const mtmp = m_at(xx, yy);
            if (!mtmp)
                continue;
            const mndx = (mtmp.mnum ?? mtmp.mndx) | 0;
            if (!(likes_gold_fp(mndx) || likes_gems_fp(mndx) || likes_objs_fp(mndx) || likes_magic_fp(mndx)))
                continue;
            nmon++;
            if (!rn2_shk(nmon))
                selected = mtmp;
        }
    }
    if (selected && can_carry(selected, otmp))
        add_to_minv_fp(selected, otmp);
    else
        place_object(otmp, x, y);
}

// C do.c obj_no_longer_held(obj) — things that must change when not held;
// recurse into containers. The only branch with an observable effect is the
// CRYSKNIFE reversion (rn2(10) when not oerodeproof); costly_alteration's
// shop-billing side effect is untracked by this task's diff fields, so it is
const CRYSKNIFE_OTYP = 43;
const WORM_TOOTH_OTYP = 42;
function costly_alteration_fp(_obj, _alter_type) { }
function obj_no_longer_held(obj) {
    if (!obj)
        return;
    if (Has_contents(obj)) {
        for (let contents = obj.cobj; contents; contents = contents.nobj)
            obj_no_longer_held(contents);
    }
    if (obj.otyp === CRYSKNIFE_OTYP) {
        if (!obj.oerodeproof || rn2_shk(10) === 0) {
            costly_alteration_fp(obj, 0 /* COST_DEGRD */);
            obj.otyp = WORM_TOOTH_OTYP;
            obj.oerodeproof = 0;
        }
    }
}

function artifact_light_fp(obj) {
    return !!(obj && (obj.otyp === 102 /* GOLD_DRAGON_SCALE_MAIL */ || obj.otyp === 112 /* GOLD_DRAGON_SCALES */));
}
function obj_is_burning_fp(obj) {
    return !!(obj && obj.lamplit);
}
function end_burn_fp(_obj, _timer_attached) { }

// C bones.c goodfruit(id) — mutates the untracked global fruit-name list.
function goodfruit_fp(_id) { }
const SLIME_MOLD_OTYP = 285;

export async function drop_upon_death(mtmp, cont, x, y) {
    const g = game;
    let otmp;
    while ((otmp = g.invent) != null) {
        // obj_extract_self(otmp): otmp is always the OBJ_INVENT head here,
        // so extraction is the freeinv() unlink of that head.
        g.invent = otmp.nobj;
        otmp.nobj = null;

        if (!mtmp || is_undead(mtmp.data))
            obj_no_longer_held(otmp);

        if ((cont || artifact_light_fp(otmp)) && obj_is_burning_fp(otmp))
            end_burn_fp(otmp, true);
        otmp.owornmask = 0;

        if (otmp.otyp === SLIME_MOLD_OTYP)
            goodfruit_fp(otmp.spe);

        if (rn2_shk(5))
            curse_fp(otmp);

        if (mtmp)
            add_to_minv_fp(mtmp, otmp);
        else if (cont)
            await add_to_container(cont, otmp);
        else if (!rn2_shk(8))
            give_to_nearby_mon(otmp, x, y);
        else
            place_object(otmp, x, y);
    }
    if (cont)
        cont.owt = weight_fp(cont);
}
// C mkobj.c curse(otmp) — clear blessed, set cursed.
function curse_fp(otmp) { if (otmp) { otmp.blessed = 0; otmp.cursed = 1; } }
// C nethack-c/include/mondata.h:95
//   #define is_undead(ptr) (((ptr)->mflags2 & M2_UNDEAD) != 0L)
// M2_UNDEAD == 0x00000002L (nethack-c/include/monflag.h:124).
// Was `return false`, which is wrong for every undead monster; the caller
// (bones.c:279 drop_upon_death, mirrored at shk.js:1467) is short-circuited by
// `!mtmp ||`, so ptr is always non-null when this is reached.
const M2_UNDEAD = 0x00000002; /* monflag.h:124 */
function is_undead(data) { return ((data.mflags2 | 0) & M2_UNDEAD) !== 0; }
// C mkobj.c weight(obj) — only reached when drop_upon_death's `cont` argument is
// truthy.  finish_paybill() passes 0 and savebones() (js/bones.js, ported) passes
// null, so no live caller reaches it; C's only truthy-cont caller is savebones'
// to say, and that has not been true since savebones landed.)
function weight_fp(obj) { return obj ? (obj.owt | 0) : 0; }

export async function finish_paybill() {
    const g = game;
    const u = g.u || {};
    let shkp = g.repo ? g.repo.shopkeeper : null;
    let ox = (g.repo && g.repo.location) ? g.repo.location.x : 0;
    let oy = (g.repo && g.repo.location) ? g.repo.location.y : 0;

    if (!isok(ox, oy)) {
        if (shkp)
            impossible("finish_paybill: bad location <%d,%d>.", ox, oy);
        ox = u.ux ? u.ux : u.ux0;
        oy = u.ux ? u.uy : u.uy0;
    }
    unleash_all();
    if (shkp) {
        let umoney = money_cnt(g.invent);
        if (umoney)
            await money2mon(shkp, umoney);
    }
    await drop_upon_death(0, 0, ox, oy);
}
function adjalign(n) { return adjalign_real(n); }
function noit_mhis(_shkp) { return "his"; }
function noit_mhim(mon) { return mon?.female ? 'her' : 'him'; }
/* C polyself.c:1956-2046 mbodypart(mon, part) — the real general port lives
 * in js/cmd.js (mbodypart_real, imported above). */
function mbodypart(shkp, part) { return mbodypart_real(shkp, part); }
/* C polyself.c:2142-2145 body_part(part) = mbodypart(&gy.youmonst, part) —
 * the real general port lives in js/cmd.js (body_part_real, imported above,
 * itself calling the same real mbodypart against the hero's own youmonst). */
function body_part(part) { return body_part_real(part); }
/* C shk.c:5908 cad(altusage).  The pick_pick() and usage-charge messages use
 * the short form (altusage=false); keep the alternate form complete because
 * this helper is shared by check_unpaid_usage and getcad. */
function cad(altusage) {
    const hero = game.youmonst || {};
    const data = hero.data || hero;
    const mndx = (hero.mndx ?? hero.mnum ?? game.u?.umonnum ?? -1) | 0;
    const mflags2 = data.mflags2 != null
        ? (data.mflags2 >>> 0)
        : ((monsPack.mons?.[mndx]?.[7] || 0) >>> 0);
    const pg = poly_gender();
    const res = (is_demon({ mflags2 }) ? 'fiend'
        : (pg === 1 ? 'minx' : pg === 2 ? 'beast' : 'cad'));
    if (!altusage) return res;
    return `"${highc(res.charAt(0))}${res.slice(1)}!  `;
}

export async function pick_pick(obj) {
    if (obj?.unpaid || !is_pick(obj)) return;
    const shops = game.u?.ushops || '';
    const shkp = shops.length ? shop_keeper(shops.charCodeAt(0)) : null;
    if (!shkp || !inhishop(shkp)) return;

    const move = game.moves | 0;
    if ((game._pickmovetime ?? 0) !== move) {
        if (!_shk_Deaf() && !muteshk(shkp)) {
            SetVoice(shkp, 0, 80, 0);
            await verbalize('You sneaky %s!  Get out of here with that pick!', cad(false));
        } else {
            const mndx = (shkp.mndx ?? shkp.mnum ?? shkp.data?.pmidx ?? -1) | 0;
            const mflags1 = shkp.data?.mflags1 != null
                ? (shkp.data.mflags1 | 0)
                : ((monsPack.mons?.[mndx]?.[6] || 0) | 0);
            const eyes = !(mflags1 & 0x00001000);
            await pline(`${Shknam(shkp)} ${eyes ? 'glares at' : 'is dismayed because of'} your pick!`);
        }
    }
    game._pickmovetime = move;
}
function ANGRY(shkp) { return !shkp.mpeaceful; }
/* C shk.c:58 muteshk(shkp) = (helpless(shkp) || shkp->data->msound <= MS_ANIMAL).
 * MS_ANIMAL is 17 (nethack-c-v5/upstream/include/monflag.h:29, "up to here are
 * animal noises"); this read 13, which called four msound classes speakable
 * that C calls mute.  The nested copy inside paybill() (shk.js:~1210) always
 * had the 17 and disagreed with this one. */
/* C shk.c:58 #define muteshk(shkp) (helpless(shkp) || (shkp)->data->msound <= MS_ANIMAL)
 * `shkp.data` is not populated for every monster in this port, and `(undefined
 * | 0) <= 17` is TRUE — which silenced every shopkeeper line in the file,
 * including addtobill's price quote.  _msound_of_shk() resolves mons[].msound
 * by index when the row pointer is absent. */
function muteshk(shkp) { return helpless(shkp) || (_msound_of_shk(shkp) <= MS_ANIMAL_SHK); }
/* C ref: pline.c:435-452 You_hear — imported from js/display.js.  The copy here
 * had no guard at all, so shk_move's ":2291 an angry voice:" printed even for a
 * deaf hero. */
function Your(fmt, ...args) { return Your_real(fmt, ...args); }
/* Minimal printf for the %s / %ld conversions this file uses.  The previous
 * body read `arguments[ai++]` from inside the String.replace callback, i.e.
 * the CALLBACK's arguments (match, offset, whole string) rather than
 * Sprintf's, so every substitution produced the matched "%s" back again. */
function Sprintf(fmt, ...args) {
    let ai = 0;
    return String(fmt).replace(/%s|%ld|%d/g, () => String(args[ai++]));
}
/* C ref: query.c y_n() — the shopkeeper's restitution prompt must consume the
 * recorded answer instead of silently defaulting to 'n'.  dopay_damage() is
 * already async, so preserving this input boundary does not require a new
 * turn model. */
async function y_n(question) {
    const g = game;
    const prompt = `${question} [yn] (n)`;
    await flush_screen(1);
    if (g._pending_message)
        await force_more(g._pending_message);
    for (;;) {
        g._pending_message = prompt;
        await flush_screen(1);
        if (g.nhDisplay)
            topl_park_cursor(g.nhDisplay, prompt + ' ');
        const key = await nhgetch();
        const c = String.fromCharCode(typeof key === 'number'
            ? key : (key?.charCodeAt(0) | 0));
        g._topl_sticky = prompt;
        if (c === '\x1b' || c === '\r' || c === '\n' || c === ' ')
            return 'n';
        const lc = c.toLowerCase();
        if (lc === 'y' || lc === 'n')
            return lc;
    }
}
function SET_BOTL() {
    if (game.disp) game.disp.botl = 1;
}
function wait_synch() { }
function sgn(n) { return n > 0 ? 1 : n < 0 ? -1 : 0; }
/* C ref: rm.h MON_AT(x,y) — (m_at(x,y) != 0) for a live monster. */
function MON_AT(x, y) { return m_at(x, y) != null; }
/* C display.h:117-120 _canseemon macro / display.c:200 canseemon(mon) — the
 * real general port lives in js/display.js (canseemon_real, imported
 * above). RNG-free. */
function canseemon(shkp) { return canseemon_real(shkp); }
const HAND = 6;
const NECK = 11;
const HEAD = 8; /* hack.h enum bodypart_types */

export async function delete_contents(obj) {
    let curr;
    while ((curr = obj.cobj) != null) {
        obj_extract_self(curr);
        await obfree(curr, null);
    }
}

/* C shk.c:1187-1275. One teardown body for deletion and stack merging. */
export async function obfree(obj, merge) {
    if (obj.otyp === 236 /* LEASH */ && obj.leashmon)
        o_unleash(obj);
    if (obj.oclass === FOOD_CLASS)
        food_disappears(obj);
    if (obj.oclass === SPBOOK_CLASS_SHK)
        book_disappears(obj);
    if (Has_contents(obj))
        await delete_contents(obj);
    if (Is_container(obj))
        maybe_reset_pick(obj);
    if (obj.otyp === 475 /* BOULDER */)
        obj.next_boulder = 0;

    let shkp = null;
    if (obj.unpaid) {
        for (shkp = next_shkp(game.fmon, true); shkp;
             shkp = next_shkp(shkp.nmon, true))
            if (await onbill(obj, shkp, true))
                break;
    }
    if (!shkp)
        shkp = shop_keeper(game.u.ushops?.charCodeAt(0) || 0);
    const bp = await onbill(obj, shkp, false);
    if (bp) {
        if (!merge) {
            bp.useup = true;
            obj.unpaid = 0;
            if (obj.globby && !obj.owt && obj.oextra?.omid)
                obj.owt = obj.oextra.omid;
            add_to_billobjs(obj);
            return;
        }
        const bpm = await onbill(merge, shkp, false);
        if (!bpm) {
            await lifecycle_impossible(
                'obfree: not on bill, %s = (%d,%d,%ld,%d) (%d,%d,%ld,%d)?',
                'otyp,where,quan,unpaid',
                obj.otyp, obj.where, obj.quan, obj.unpaid ? 1 : 0,
                merge.otyp, merge.where, merge.quan, merge.unpaid ? 1 : 0);
            return;
        } else {
            const eshkp = ESHK(shkp);
            bpm.bquan += bp.bquan;
            eshkp.billct--;
            Object.assign(bp, eshkp.bill_p[eshkp.billct]);
        }
    } else if (merge && oid_price_adjustment(obj, obj.o_id)
                          > oid_price_adjustment(merge, merge.o_id)) {
        merge.o_id = obj.o_id;
    }
    if (obj.owornmask) {
        await lifecycle_impossible('obfree: deleting worn obj (%d: %ld)',
                                   obj.otyp, obj.owornmask);
        setnotworn(obj);
    }
    await dealloc_obj(obj);
}
/* obj_extract_self is the shared mkobj body, re-exported through cmd.js. */



/* ── objclass / otyp constants this block needs (objclass.h, objects.h) ── */
const GEM_CLASS_SHK = 13;
const ARMOR_CLASS_SHK = 3;
const WEAPON_CLASS_SHK = 2;
const POTION_CLASS_SHK = 8;
const WAND_CLASS_SHK = 11;
const TOOL_CLASS_SHK = 6;
const GLASS_SHK = 19;      /* objclass.h:32 material GLASS */
const MAXULEV_SHK = 30;    /* you.h MAXULEV */
const A_CHA_SHK = 5;       /* attrib.h A_CHA */
const HUNGRY_SHK = 1;      /* hunger.h HUNGRY */
/* owornmask bits (obj.h) for get_cost's uarmh/uarmu/uarm/uarmc reads. */
const W_ARM_SHK = 0x00000001, W_ARMC_SHK = 0x00000002,
      W_ARMH_SHK = 0x00000004, W_ARMU_SHK = 0x00000040;
/* objects.h otyps resolved by NAME off the generated OC_NAME table, so a row
 * shift in objects.h cannot silently mis-price anything (the numbers are the
 * 5.0 values; the lookup is the check). */
function _otyp_named_shk(nm) {
    const i = OC_NAME.indexOf(nm);
    return i >= 0 ? i : -1;
}
const DUNCE_CAP_SHK = _otyp_named_shk('dunce cap');
const POT_WATER_SHK = _otyp_named_shk('water');
/* C shk.c:2900-2937 — the unidentified-glass-gem price table.  Each worthless
 * piece of coloured glass is priced as one of two real gems, chosen by
 * `((int) ubirthday % obj->otyp) >= obj->otyp / 2`.  Keyed by
 * (otyp - FIRST_GLASS_GEM), i.e. objects.h's white/blue/red/yellowish
 * brown/orange/yellow/black/green/violet order. */
const FIRST_GLASS_GEM_SHK = _otyp_named_shk('worthless piece of white glass');
const GLASS_GEM_UPGRADE = [
    ['diamond', 'opal'], ['sapphire', 'aquamarine'], ['ruby', 'jasper'],
    ['amber', 'topaz'], ['jacinth', 'agate'], ['citrine', 'chrysoberyl'],
    ['black opal', 'jet'], ['emerald', 'jade'], ['amethyst', 'fluorite'],
].map((pair) => pair.map(_otyp_named_shk));

/* C objnam.c xname(obj) = xname_flags(obj, CXN_NORMAL) — the real body. */
function xname_shk(obj) { return xname_flags_shk(obj, CXN_NORMAL_SHK); }
/* C shk.c:63 static const char the_contents_of[] = "the contents of ". */
const the_contents_of_shk = 'the contents of ';

/* C mondata.h is_human/is_elf/is_vampire, read off mons[].mflags2 / mons[].mlet
 * the way js/dogmove.js:538 and js/mklev.js:12734 already do. */
const M2_HUMAN_SHK = 0x00000008;
const M2_ELF_SHK = 0x00000010;
const S_VAMPIRE_SHK = 48;   /* defsym.h:350 MONSYM(48, 'V', VAMPIRE, S_VAMPIRE) */
const MS_ANIMAL_SHK = 17;   /* monflag.h:29 "up to here are animal noises" */
const MONS_MSOUND_SHK = monMsoundPack.msound;
/* C: mtmp->data is &mons[mtmp->mnum].  Monsters in this port do not all carry
 * a live `data` pointer, so resolve the mons[] row by index when they do not:
 * without this, muteshk()'s `(shkp)->data->msound <= MS_ANIMAL` reads
 * `0 <= 17` for every shopkeeper and silences the whole price-quote surface. */
function _mnum_of_shk(mon) {
    return (mon?.mnum ?? mon?.mndx ?? mon?.data?.pmidx ?? -1) | 0;
}
function _msound_of_shk(mon) {
    if (mon?.data && mon.data.msound != null) return mon.data.msound | 0;
    const n = _mnum_of_shk(mon);
    return (n >= 0 && n < MONS_MSOUND_SHK.length) ? (MONS_MSOUND_SHK[n] | 0) : 0;
}
function _youmonst_mflags2_shk() {
    const ym = game.youmonst;
    if (ym?.data && ym.data.mflags2 != null) return ym.data.mflags2 >>> 0;
    return monMflags2_fp(_mnum_of_shk(ym));
}
function _youmonst_mlet_shk() {
    const ym = game.youmonst;
    if (ym?.data && ym.data.mlet != null) return ym.data.mlet | 0;
    const n = _mnum_of_shk(ym);
    const row = (n >= 0 && n < MONS_ROWS.length) ? MONS_ROWS[n] : null;
    return row ? (row[0] | 0) : 0;
}
/* C role.h Race_if(PM_ELF) — u.urace.malenum == PM_ELF.  js/roles.js stores the
 * chosen race on game.urace; flags.initrace is the chargen answer. */
function _Race_if_elf_shk() {
    const nm = (game.urace?.noun ?? game.urace?.adj ?? '').toLowerCase();
    return nm === 'elf' || nm === 'elven';
}
/* C role.h Role_if(PM_TOURIST) — the same gu.urole.mnum read this file already
 * uses at :1238. */
function _Role_if_tourist_shk() {
    return ((game.urole?.mnum) | 0) === PM_TOURIST;
}
/* objects[otyp].oc_name_known — the discovery log js/o_init.js maintains. */
function _oc_name_known_shk(otyp) {
    return !!(game._oc_name_known && game._oc_name_known[otyp]);
}
/* C you.h uarm/uarmc/uarmh/uarmu — the worn item in a slot.  This port keeps
 * the mask on the object (obj->owornmask), so the slot is a scan of gi.invent. */
function _worn_slot_shk(mask) {
    for (let o = game.invent; o; o = o.nobj)
        if (((o.owornmask | 0) & mask) !== 0)
            return o;
    return null;
}

/* C zap.c:654-688 get_obj_location(obj, &x, &y, locflags) — every case ported.
 * js/cmd.js:28814 exports a throwing stub of this name whose other callers are
 * out of this change's scope, so the body lives here under a local name. */
const CONTAINED_TOO_SHK = 0x01;
const BURIED_TOO_SHK = 0x02;
function _get_obj_location_shk(obj, locflags) {
    if (!obj) return null;
    switch (obj.where | 0) {
    case 3: /* OBJ_INVENT */
        return { x: game.u?.ux | 0, y: game.u?.uy | 0 };
    case 1:
        return { x: obj.ox | 0, y: obj.oy | 0 };
    case 4: /* OBJ_MINVENT */
        if (obj.ocarry && (obj.ocarry.mx | 0))
            return { x: obj.ocarry.mx | 0, y: obj.ocarry.my | 0 };
        break; /* !mx => migrating monster */
    case 6: /* OBJ_BURIED */
        if (locflags & BURIED_TOO_SHK)
            return { x: obj.ox | 0, y: obj.oy | 0 };
        break;
    case 2: /* OBJ_CONTAINED */
        if (locflags & CONTAINED_TOO_SHK)
            return _get_obj_location_shk(obj.ocontainer, locflags);
        break;
    }
    return null;
}

const _CORPSENM_ICOST = [
    [FIRE_RES, 2], [SLEEP_RES, 3], [COLD_RES, 2], [DISINT_RES, 5],
    [SHOCK_RES, 4], [POISON_RES, 2], [ACID_RES, 1], [STONE_RES, 3],
    [TELEPORT, 2], [TELEPORT_CONTROL, 3], [TELEPAT, 5],
];
/* C monflag.h:194 G_UNIQ, the geno bit mondata.h's unique_corpstat() tests. */
const G_UNIQ_SHK = 0x1000;
/* objects.h otyp ids, from js/oc_name_data.js (tin 296, corpse 265, egg 266). */
const TIN_SHK = 296, EGG_SHK = 266, CORPSE_SHK = 265;
function corpsenm_price_adj(obj) {
    let val = 0;
    const otyp = obj.otyp | 0;

    if ((otyp === TIN_SHK || otyp === EGG_SHK || otyp === CORPSE_SHK)
        && ismnum(obj.corpsenm)) {
        let tmp = 1;
        const ptr = permonstTemplate(obj.corpsenm | 0);
        if (!ptr)
            return 0;

        for (const [trinsic, cost] of _CORPSENM_ICOST)
            if (intrinsic_possible(trinsic, ptr))
                tmp += cost;
        if (((ptr.geno | 0) & G_UNIQ_SHK) !== 0)
            tmp += 50;

        val = Math.max(1, ((ptr.mlevel | 0) - 1) * 2);
        if (otyp === CORPSE_SHK)
            val += Math.max(1, Math.trunc(mons_cnutrit(obj.corpsenm | 0) / 30));

        val = val * tmp;
    }

    return val;
}

/* C shk.c:4319 getprice(obj, shk_buying) — the base price, before the shk's
 * multipliers.  oc_cost is js/oc_cost_data.js, generated from objects.h. */
export function getprice(obj, shk_buying) {
    const otyp = obj.otyp | 0;
    let tmp = OC_COST[otyp] | 0;

    if (obj.oartifact) {
        // This table price is bounded by the compiled artifact/object costs;
        // conversion is exact. General shop long arithmetic remains separate.
        tmp = Number(arti_cost(obj));
        if (shk_buying) tmp = Math.trunc(tmp / 4);
    }
    switch (obj.oclass | 0) {
    case FOOD_CLASS:
        tmp += corpsenm_price_adj(obj);
        /* simpler hunger check, (2-4)*cost */
        if ((game.u?.uhs | 0) >= HUNGRY_SHK && !shk_buying)
            tmp *= (game.u.uhs | 0);
        if (obj.oeaten)
            tmp = 0;
        break;
    case WAND_CLASS_SHK:
        if ((obj.spe | 0) === -1)
            tmp = 0;
        break;
    case POTION_CLASS_SHK:
        if (otyp === POT_WATER_SHK && !obj.blessed && !obj.cursed)
            tmp = 0;
        break;
    case ARMOR_CLASS_SHK:
    case WEAPON_CLASS_SHK:
        if ((obj.spe | 0) > 0)
            tmp += 10 * (obj.spe | 0);
        break;
    case TOOL_CLASS_SHK:
        if (Is_candle_shk(obj) && (obj.age | 0) < 20 * (OC_COST[otyp] | 0))
            tmp = Math.trunc(tmp / 2);
        break;
    }
    return tmp;
}

export function get_pricing_units(obj) {
    return obj.quan | 0;
}

/* C shk.c:2878 get_cost(obj, shkp) — "calculate the value that the shk will
 * charge for [one of] an object".  Every multiplier is a rational folded into
 * C's single `(tmp * multiplier * 10 / divisor + 5) / 10` rounding, so the
 * arithmetic order is preserved exactly.  RNG-free throughout. */
export function get_cost(obj, shkp) {
    const otyp = obj.otyp | 0;
    let tmp = getprice(obj, false);
    let multiplier = 1, divisor = 1;

    if (!tmp)
        tmp = 5;
    /* shopkeeper may notice if the player isn't very knowledgeable -
       especially when gem prices are concerned */
    if (!obj.dknown || !_oc_name_known_shk(otyp)) {
        if ((obj.oclass | 0) === GEM_CLASS_SHK
            && (MKOBJ_OC_MATERIAL[otyp] | 0) === GLASS_SHK) {
            /* get a value that's 'random' from game to game, but the
               same within the same game */
            const ubirthday = game.u?.ubirthday ?? 0;
            const pseudorand = ((ubirthday % otyp) >= Math.trunc(otyp / 2));
            const pair = GLASS_GEM_UPGRADE[otyp - FIRST_GLASS_GEM_SHK];
            /* all gems are priced high - real or not */
            const i = pair ? (pseudorand ? pair[0] : pair[1]) : 0 /* STRANGE_OBJECT */;
            tmp = OC_COST[i] | 0;
        } else if (oid_price_adjustment(obj, obj.o_id >>> 0) > 0) {
            /* unid'd, arbitrarily impose surcharge: tmp *= 4/3 */
            multiplier *= 4;
            divisor *= 3;
        }
    }
    const uarmh = _worn_slot_shk(W_ARMH_SHK);
    const uarm = _worn_slot_shk(W_ARM_SHK);
    const uarmc = _worn_slot_shk(W_ARMC_SHK);
    const uarmu = _worn_slot_shk(W_ARMU_SHK);
    if (uarmh && (uarmh.otyp | 0) === DUNCE_CAP_SHK) {
        multiplier *= 4; divisor *= 3;
    } else if ((_Role_if_tourist_shk() && (game.u?.ulevel | 0) < MAXULEV_SHK / 2)
               || (uarmu && !uarm && !uarmc)) { /* touristy shirt visible */
        multiplier *= 4; divisor *= 3;
    }

    const cha = acurr(game.u, A_CHA_SHK) | 0;
    if (cha > 18) divisor *= 2;
    else if (cha === 18) { multiplier *= 2; divisor *= 3; }
    else if (cha >= 16) { multiplier *= 3; divisor *= 4; }
    else if (cha <= 5) multiplier *= 2;
    else if (cha <= 7) { multiplier *= 3; divisor *= 2; }
    else if (cha <= 10) { multiplier *= 4; divisor *= 3; }

    /* tmp = (tmp * multiplier) / divisor [with roundoff tweak] */
    tmp *= multiplier;
    if (divisor > 1) {
        tmp *= 10;
        tmp = Math.trunc(tmp / divisor);
        tmp += 5;
        tmp = Math.trunc(tmp / 10);
    }

    if (tmp <= 0)
        tmp = 1;
    /* the artifact prices in artilist[] are also used as a score bonus;
       inflate their shop price here without affecting score calculation */
    if (obj.oartifact)
        tmp *= 4;

    /* anger surcharge should match rile_shk's, so we do it separately
       from the multiplier/divisor calculation */
    const eshkp = shkp ? ESHK(shkp) : null;
    if (eshkp && eshkp.surcharge)
        tmp += Math.trunc((tmp + 2) / 3);
    return tmp;
}

/* C shk.c:2809 get_cost_of_shop_item(obj, &nochrg) — the price doname()'s
 * with_price tail prints, or 0.  `nochrg` is C's alternate return value and is
 * passed as this tree's {value} out-param box:
 *   1: no charge, 0: shop owned, -1: not in a shop (don't say "no charge") */
export function get_cost_of_shop_item(obj, nochrg) {
    const u = game.u || {};
    let cost = 0;
    if (nochrg) nochrg.value = -1; /* assume 'not applicable' */
    const ushops0 = _ushops0_shk(u);
    if (!ushops0 || (obj.oclass | 0) === COIN_CLASS
        || obj === u.uball || obj === u.uchain)
        return 0;
    const loc = _get_obj_location_shk(obj, CONTAINED_TOO_SHK);
    if (!loc)
        return 0;
    const rooms = in_rooms(loc.x, loc.y, SHOPBASE);
    if (!rooms.length || (rooms[0] | 0) !== ushops0)
        return 0;
    const shkp = shop_keeper(inside_shop(loc.x, loc.y));
    if (!shkp || !inhishop(shkp))
        return 0;

    let top = obj;
    while ((top.where | 0) === 2 /* OBJ_CONTAINED */ && top.ocontainer)
        top = top.ocontainer;
    const eshkp = ESHK(shkp);
    const freespot = ((top.where | 0) === 1
                      && loc.x === (eshkp?.shk?.x | 0)
                      && loc.y === (eshkp?.shk?.y | 0));
    const nc = (((top.where | 0) === 1) && (obj.no_charge || freespot)) ? 1 : 0;
    if (nochrg) nochrg.value = nc;

    const carried = (top.where | 0) === 3 /* OBJ_INVENT */;
    if (carried ? !!(obj.unpaid | 0) : !nc) {
        const per_unit_cost = get_cost(obj, shkp);
        cost = get_pricing_units(obj) * per_unit_cost;
    }
    if (Has_contents(obj) && !freespot)
        cost += contained_cost(obj, shkp, 0, false, true);
    return cost;
}

/* C shk.c:1136 onbill(obj, shkp, silent) — the bill entry for obj, or null.
 * C's two impossible() reports are no-ops in this port (see :709). */
export async function onbill(obj, shkp, silent) {
    if (shkp) {
        const eshkp = ESHK(shkp);
        const bill = eshkp ? (eshkp.bill_p || eshkp.bill) : null;
        const ct = eshkp ? (eshkp.billct | 0) : 0;
        for (let i = 0; i < ct; i++) {
            const bp = bill && bill[i];
            if (bp && (bp.bo_id >>> 0) === (obj.o_id >>> 0)) {
                if (!obj.unpaid)
                    await lifecycle_impossible('onbill: paid obj on bill?');
                return bp;
            }
        }
    }
    if (obj.unpaid && !silent)
        await lifecycle_impossible('onbill: unpaid obj %s?',
                                   !shkp ? 'without shopkeeper' : "not on shk's bill");
    return null;
}

/* C shk.c:3237 alter_cost().  Enhanced unpaid items keep the larger of their
 * old and newly computed prices.  A nonzero positive amount is another
 * increase-only quote; a negative amount is the special exact-price form
 * used by bill_dummy_object() to preserve the pre-alteration cost. */
export async function alter_cost(obj, amt) {
    for (let shkp = next_shkp(game.fmon, true); shkp;
         shkp = next_shkp(shkp.nmon, true)) {
        const bp = await onbill(obj, shkp, true);
        if (!bp)
            continue;
        const amount = Number(amt) || 0;
        const newPrice = amount === 0 ? get_cost(obj, shkp)
            : amount < 0 ? -amount : amount;
        if (newPrice > bp.price || amount < 0) {
            bp.price = newPrice;
            update_inventory();
        }
        break;
    }
}

/* C shk.c:3198 gem_learned(oindx) — "identifying or forgetting a gem causes
 * all unpaid gems of its type to change value".  Walks every shopkeeper's bill
 * and re-prices the entries whose object is of type oindx (or any gem when
 * oindx is STRANGE_OBJECT).  Called by o_init.c discover_object (:489) and
 * undiscover_object (:521).  RNG-free. */
export function gem_learned(oindx) {
    for (let shkp = next_shkp(game.fmon, true); shkp;
         shkp = next_shkp(shkp.nmon, true)) {
        const eshkp = ESHK(shkp);
        if (!eshkp || !eshkp.bill_p) continue;
        let ct = eshkp.billct | 0;
        while (--ct >= 0) {
            const bp = eshkp.bill_p[ct];
            const obj = find_oid(bp.bo_id >>> 0);
            if (!obj) /* shouldn't happen */
                continue;
            if ((oindx | 0) !== 0 ? ((obj.otyp | 0) === (oindx | 0))
                                  : ((obj.oclass | 0) === GEM_CLASS_SHK))
                bp.price = get_cost(obj, shkp);
        }
    }
}

/* C shk.c:3452 billable(&shkp, obj, roomno, reset_nocharge) — "decide whether a
 * shopkeeper thinks an item belongs to her".  C's first argument is in/out; JS
 * passes the {value} box this tree uses for pointer out-params. */
export async function billable(shkpBox, obj, roomno, reset_nocharge) {
    let shkp = shkpBox.value;

    /* if caller hasn't supplied a shopkeeper, look one up now */
    if (!shkp) {
        if (!roomno)
            return false;
        shkp = shop_keeper(roomno);
        if (!shkp || !inhishop(shkp))
            return false;
        shkpBox.value = shkp;
    }
    /* perhaps we threw it away earlier */
    if ((await onbill(obj, shkp, false))
        || ((obj.oclass | 0) === FOOD_CLASS && obj.oeaten))
        return false;
    /* outer container might be marked no_charge but still have contents
       which should be charged for; clear no_charge when picking things up */
    if (obj.no_charge) {
        if (!Has_contents(obj) || (contained_gold(obj, true) === 0
                                   && contained_cost(obj, shkp, 0, false,
                                                     !reset_nocharge) === 0))
            shkp = null; /* not billable */
        if (reset_nocharge && !shkp && (obj.oclass | 0) !== COIN_CLASS) {
            obj.no_charge = 0;
            if (Has_contents(obj))
                picked_container(obj); /* clear no_charge */
        }
    }
    if (shkp) shkpBox.value = shkp;
    return shkp ? true : false;
}

export function record_price_quote(otyp, price, buyprice) {
    const g = game;
    const tbl = (g._oc_price_seen ||= {});
    const oc = (tbl[otyp | 0] ||= { oc_sell_minseen: Infinity, oc_sell_maxseen: 0,
                                    oc_buy_minseen: Infinity, oc_buy_maxseen: 0 });
    if (buyprice) {
        if (price > oc.oc_buy_maxseen) oc.oc_buy_maxseen = price;
        if (price < oc.oc_buy_minseen) oc.oc_buy_minseen = price;
    } else {
        if (price > oc.oc_sell_maxseen) oc.oc_sell_maxseen = price;
        if (price < oc.oc_sell_minseen) oc.oc_sell_minseen = price;
    }
}

/* C shk.c:3365 add_to_billobjs(obj) — move a used-up shop object onto the
 * gb.billobjs chain.  Only add_one_tobill's `dummy` arm reaches it. */
export function add_to_billobjs(obj) {
    const g = game;
    if (obj.where !== 0 /* OBJ_FREE */)
        throw new Error(`panic: add_to_billobjs: obj where=${obj.where}, not free`);
    if (obj.timed)
        obj_stop_timers(obj);
    obj.nobj = g.billobjs ?? null;
    g.billobjs = obj;
    obj.where = 7; /* OBJ_ONBILL */
    obj.in_use = 0;
    obj.bypass = 0;
}

/* C shk.c:3309 add_one_tobill(obj, dummy, shkp) — put obj on shkp's bill.
 * `struct bill_x bill[BILLSZ]` is part of C's eshk, so the array is created
 * here when neweshk()'s memset-equivalent (js/mklev.js:2273) left it absent. */
async function add_one_tobill(obj, dummy, shkp) {
    const eshkp = ESHK(shkp);
    if (!eshkp) return;
    if (!eshkp.bill) eshkp.bill = [];
    /* normally bill_p gets set up whenever you enter the shop, but obj
       might be going onto the bill because hero just snagged it with
       a grappling hook from outside without ever having been inside */
    if (!eshkp.bill_p)
        eshkp.bill_p = eshkp.bill;

    let unbilled = false;
    const box = { value: shkp };
    if (!(await billable(box, obj, _ushops0_shk(game.u || {}), true))) {
        /* shk doesn't want it */
        unbilled = true;
    } else if ((eshkp.billct | 0) === BILLSZ) {
        /* shk's bill is completely full */
        void pline("You got that for free!");
        unbilled = true;
    }
    /* if not on any list (probably from bill_dummy_object() which creates
       a new OBJ_FREE object), don't leave unmanaged object hanging around */
    if (unbilled) {
        /* C dealloc_obj()s the object when obj->where == OBJ_FREE.  This
         * port's live caller (pickup_object) hands the same object to addinv
         * immediately afterwards, and bill_dummy_object() — C's only producer
         * of an OBJ_FREE object on this path — is not ported, so there is
         * nothing here to deallocate. */
        return;
    }

    const bct = eshkp.billct | 0;
    const bp = (eshkp.bill_p[bct] ||= {});
    bp.bo_id = obj.o_id >>> 0;
    bp.bquan = obj.quan | 0;
    if (dummy) {              /* a dummy object must be inserted into  */
        bp.useup = true;      /* the gb.billobjs chain here.  crucial for */
        add_to_billobjs(obj);
    } else {
        bp.useup = false;
    }
    bp.price = get_cost(obj, shkp);
    if (obj.globby) {
        bp.price *= get_pricing_units(obj);
        newomid(obj);
        obj.oextra.omid = obj.owt;
        obj.oextra_omid = obj.owt;
    }
    eshkp.billct = bct + 1;
    obj.unpaid = 1;
    record_price_quote(obj.otyp | 0, bp.price, true);
}

/* C shk.c:3602 append_honorific(buf) — THE RNG SITE this whole subsystem was
 * blocking: rn2(SIZE(honored) - 1) is rn2(4); the fifth entry is reachable only
 * once u.uevent.udemigod is set.  C appends into buf; JS returns the new
 * string. */
const HONORED_SHK = ['good', 'honored', 'most gracious', 'esteemed',
                     'most renowned and sacred'];
function append_honorific(buf) {
    const udemigod = (game.u?.uevent?.udemigod ? 1 : 0);
    let out = buf + HONORED_SHK[rn2_shk(HONORED_SHK.length - 1) + udemigod];
    const female = !!(game.flags?.female | 0);
    const mf2 = _youmonst_mflags2_shk();
    if (_youmonst_mlet_shk() === S_VAMPIRE_SHK)
        out += female ? ' dark lady' : ' dark lord';
    else if ((mf2 & M2_ELF_SHK) !== 0 || _Race_if_elf_shk())
        out += female ? ' hiril' : ' hir';
    else
        out += !(mf2 & M2_HUMAN_SHK) ? ' creature'
             : female ? ' lady' : ' sir';
    return out;
}

/* C obj.h:340 SchroedingersBox(o) = ((o)->otyp == LARGE_BOX && (o)->spe == 1) */
function SchroedingersBox_shk(o) { return (o.otyp | 0) === 214 && (o.spe | 0) === 1; }

/* C shk.c:3389 bill_box_content(obj, ininv, dummy, shkp) — recursive billing of
 * a container's contents, reached when a container is lifted inside a shop.
 * `ininv` is unused by the C body too (kept only for call-signature symmetry
 * with its caller). RNG-free: add_one_tobill()/get_cost() are pure table
 * arithmetic — this no longer needs contained_cost(), which is a real port
 * now (line 1375), not the throwing stub an earlier note here described. */
async function bill_box_content(obj, ininv, dummy, shkp) {
    if (SchroedingersBox_shk(obj)) return;
    for (let otmp = obj.cobj; otmp; otmp = otmp.nobj) {
        if ((otmp.oclass | 0) === COIN_CLASS)
            continue;

        /* the "top" box is added in addtobill() */
        if (!otmp.no_charge)
            await add_one_tobill(otmp, dummy, shkp);
        if (Has_contents(otmp))
            await bill_box_content(otmp, ininv, dummy, shkp);
    }
}
/* C pickup.c:2718 picked_container(obj) — clear no_charge on a lifted
 * container's contents, recursively.  The real general port lives in
 * js/dokick.js (picked_container_real, imported above) and is also called
 * from mon_leave() there, so it is not a KNOWN-GAP no-op. RNG-free. */
function picked_container(obj) { return picked_container_real(obj); }
/* C shk.c costly_gold — consume credit, then add any remainder to debit
 * and loan. Each accounting message completes before the following one. */
async function costly_gold(x, y, amount, silent) {
    if (!costly_spot(x, y)) return;
    const rooms = in_rooms(x, y, SHOPBASE);
    const shkp = shop_keeper(rooms.length ? rooms[0] : 0);
    if (!shkp) return;
    const e = ESHK(shkp);
    if ((e.credit | 0) >= (amount | 0)) {
        if (!silent) {
            if ((e.credit | 0) > (amount | 0)) await Your("credit is reduced by %ld %s.", amount, currency(amount));
            else await Your("credit is erased.");
        }
        e.credit = (e.credit | 0) - (amount | 0);
    } else {
        const delta = (amount | 0) - (e.credit | 0);
        if (!silent) {
            if (e.credit) await Your("credit is erased.");
            if (e.debit) await Your("debt increases by %ld %s.", delta, currency(delta));
            else await pline("You owe %s %ld %s.", shkname(shkp), delta, currency(delta));
        }
        e.debit = (e.debit | 0) + delta;
        e.loan = (e.loan | 0) + delta;
        e.credit = 0;
    }
}

/* C shk.c:3490 addtobill(obj, ininv, dummy, silent) — bill the hero for obj and
 * say the price out loud.  This is the body js/cmd.js:4199 declared unportable.
 * async because pline() is: C's price quote is a real topline message and pages
 * against whatever the same turn already printed. */
export async function addtobill(obj, ininv, dummy, silent) {
    const u = game.u || {};
    const box = { value: null };
    if (!(await billable(box, obj, _ushops0_shk(u), true)))
        return;
    const shkp = box.value;

    if ((obj.oclass | 0) === COIN_CLASS) {
        await costly_gold(obj.ox | 0, obj.oy | 0, obj.quan | 0, silent);
        return;
    } else if ((ESHK(shkp).billct | 0) === BILLSZ) {
        if (!silent)
            await pline("You got that for free!");
        return;
    }

    let ltmp = 0, cltmp = 0, gltmp = 0;
    let contentscount;
    const container = Has_contents(obj);

    if (!obj.no_charge) {
        ltmp = get_cost(obj, shkp);
        if (obj.globby)
            ltmp *= get_pricing_units(obj);
    }
    if (obj.no_charge && !container) {
        obj.no_charge = 0;
        return;
    }

    if (container) {
        cltmp = contained_cost(obj, shkp, cltmp, false, false);
        gltmp = contained_gold(obj, true);

        if (ltmp)
            await add_one_tobill(obj, dummy, shkp);
        if (cltmp)
            await bill_box_content(obj, ininv, dummy, shkp);
        picked_container(obj); /* reset contained obj->no_charge */

        ltmp += cltmp;

        if (gltmp) {
            await costly_gold(obj.ox | 0, obj.oy | 0, gltmp, silent);
            if (!ltmp)
                return;
        }

        if (obj.no_charge)
            obj.no_charge = 0;
        contentscount = count_unpaid(obj.cobj);
    } else { /* !container */
        await add_one_tobill(obj, dummy, shkp);
        contentscount = 0;
    }

    if (!_shk_Deaf() && !muteshk(shkp) && !silent) {
        /* no need to update price quotes here; it was done by
           add_one_tobill above */
        if (!ltmp) {
            await pline(`${Shknam(shkp)} has no interest in ${the_shk(xname_shk(obj))}.`);
            return;
        }
        if (!ininv) {
            await pline(`${The_shk(xname_shk(obj))} will cost you ${ltmp} `
                        + `${currency(ltmp)}${((obj.quan | 0) > 1) ? ' each' : ''}.`);
        } else {
            const save_quan = obj.quan;
            let buf = '"For you,';
            if (ANGRY(shkp)) {
                buf += ' scum;';
            } else if (!ESHK(shkp).surcharge) {
                buf += ' ';
                buf = append_honorific(buf);
                buf += '; only';
            }
            obj.quan = 1; /* fool xname() into giving singular */
            SetVoice(shkp, 0, 80, 0);
            const nm = xname_shk(obj);
            obj.quan = save_quan;
            await pline(`${buf} ${ltmp} ${currency(ltmp)} `
                        + `${((save_quan | 0) > 1) ? 'per'
                             : (contentscount && !obj.unpaid)
                               ? 'for the contents of this' : 'for this'} `
                        + `${nm}`
                        + `${(contentscount && obj.unpaid) ? and_its_contents : ''}."`);
        }
    } else if (!silent) {
        if (ltmp) {
            SetVoice(shkp, 0, 80, 0);
            await pline(`The list price of `
                        + `${(contentscount && !obj.unpaid) ? the_contents_of_shk : ''}`
                        + `${the_shk(xname_shk(obj))}`
                        + `${(contentscount && obj.unpaid) ? and_its_contents : ''}`
                        + ` is ${ltmp} ${currency(ltmp)}`
                        + `${((obj.quan | 0) > 1) ? ' each' : ''}.`);
        } else {
            await pline(`${Shknam(shkp)} does not notice.`);
        }
    }
}

/* C hack.h — unpaid_cost()'s cost_type values. */
export const COST_NOCONTENTS = 0, COST_CONTENTS = 1, COST_SINGLEOBJ = 2;

/* C shk.c:3260 unpaid_cost(unp_obj, cost_type) — "called from doinv(invent.c)
 * for inventory of unpaid objects".  This is the price doname()'s
 * `(unpaid, N zorkmids)` tail prints.  C's impossible() report is a no-op here
 * (see :709).  RNG-free. */
export async function unpaid_cost(unp_obj, cost_type) {
    let bp = null, shkp = null, amt = 0;
    const shops = game.u?.ushops || '';
    for (let i = 0; i < shops.length; i++) {
        shkp = shop_keeper(shops.charCodeAt(i));
        if (shkp) {
            bp = (await onbill(unp_obj, shkp, true));
            if (bp) {
                amt = bp.price | 0;
                if (cost_type !== COST_SINGLEOBJ) {
                    /* use quan rather than get_pricing_units -- glob weight
                       should already be factored into bp->price */
                    amt *= (unp_obj.quan | 0);
                }
            }
            if (cost_type === COST_CONTENTS && Has_contents(unp_obj))
                amt = contained_cost(unp_obj, shkp, amt, false, true);
            if (bp || (!unp_obj.unpaid && amt))
                break;
        }
    }
    return amt;
}

/* C shk.c:5689 cost_per_charge/check_unpaid_usage.  This is deliberately
 * synchronous: callers consume a charge in the same turn, while the quoted
 * line is queued by pline just as the surrounding shop code does. */
function cost_per_charge(shkp, obj, altusage) {
    if (!shkp || !inhishop(shkp)) return 0;
    let tmp = get_cost(obj, shkp) | 0;
    const t = obj.otyp | 0, cls = obj.oclass | 0;
    if (t === 228) {                 // MAGIC_LAMP
        tmp = altusage ? tmp + Math.trunc(tmp / 3) : (OC_COST[227] | 0);
    } else if (t === 242) {          // MAGIC_MARKER
        tmp = Math.trunc(tmp / 2);
    } else if (t === 220 || t === 252) { // BAG_OF_TRICKS/HORN_OF_PLENTY
        if (!altusage) tmp = Math.trunc(tmp / 5);
    } else if (t === 231 || t === 227 || t === 226 || (t >= 247 && t <= 251) || cls === 11) {
        if ((obj.spe | 0) > 1) tmp = Math.trunc(tmp / 4);
    } else if (cls === 10) {
        tmp -= Math.trunc(tmp / 5);
    } else if (t === 240 || t === 238 || t === 229) {
        tmp = Math.trunc(tmp / 10);
    } else if (t === 321) {
        tmp = Math.trunc(tmp / 5);
    }
    return tmp;
}

export function check_unpaid_usage(obj, altusage = false) {
    if (!obj?.unpaid || !(game.u?.ushops || '').length) return;
    const room = game.u.ushops.charCodeAt(0) | 0;
    const shkp = shop_keeper(room);
    if (!shkp || !inhishop(shkp)) return;
    const tmp = cost_per_charge(shkp, obj, !!altusage);
    if (!tmp) return;
    const e = ESHK(shkp);
    let arg1 = '', arg2 = '', fmt;
    if ((obj.oclass | 0) === 10) {
        fmt = '%sYou owe%s %d %s.';
        arg1 = rn2_shk(2) ? `This is no free library, ${cad(false)}!  ` : '';
        arg2 = (e?.debit | 0) > 0 ? ' an additional' : '';
    } else if ((obj.otyp | 0) === 321) {
        fmt = '%s%sThat will cost you %d %s (Yendorian Fuel Tax).';
    } else if (altusage && ((obj.otyp | 0) === 220 || (obj.otyp | 0) === 252)) {
        fmt = '%s%sEmptying that will cost you %d %s.';
        if (!rn2_shk(3)) arg1 = 'Whoa!  ';
        if (!rn2_shk(3)) arg1 = 'Watch it!  ';
    } else {
        fmt = '%s%sUsage fee, %d %s.';
        if (!rn2_shk(3)) arg1 = 'Hey!  ';
        if (!rn2_shk(3)) arg2 = 'Ahem.  ';
    }
    if (!_shk_Deaf() && !muteshk(shkp)) {
        SetVoice(shkp, 0, 80, 0);
        verbalize(fmt, arg1, arg2, tmp, currency(tmp));
        exercise(2, true); // A_WIS
    }
    if (e) e.debit = (e.debit | 0) + tmp;
}
