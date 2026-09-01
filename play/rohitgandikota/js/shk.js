// shk.js — shopkeeper behaviour.
// C ref: src/shk.c
//
// Billing and ordinary price quotes are ported alongside movement and pursuit.
// Credit, selling, robbery, the shop entry/exit dance, and the shopkeeper's
// own combat are not ported. js/shknam.js holds the naming and stocking half
// (shtypes, nameshk, stock_room), which is src/shknam.c.

import { game } from './gstate.js';
import { ESHK, SHOPBASE, IS_DOOR, ROOMOFFSET, NO_ROOM, A_CHA, MAXULEV,
         HUNGRY, PICK_ANY, MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE,
         ECMD_OK, ECMD_TIME, G_GONE, COST_BITE, COST_DSTROY, COST_OPEN, A_WIS,
         M_AP_TYPE, M_AP_NOTHING, M_AP_MONSTER, MIGR_APPROX_XY, RLOC_NOMSG,
         NON_PM, REPAIR_DELAY, BOLT_LIM, D_BROKEN, D_CLOSED, IS_ROOM,
         IS_WALL, SVALL, u_at, HAND, PRONOUN_NO_IT, PRONOUN_HALLU }
    from './const.js';
import { in_rooms } from './hack.js';
import { distu, dist2, distmin, online2, isok } from './hacklib.js';
import { m_canseeu, inhishop, mdistu } from './monmove.js';
import { move_special } from './priest.js';
import { addinv, carrying, sobj_at, currency, money_cnt, freeinv,
         contained_gold, hidden_gold, weight } from './invent.js';
import { m_at, t_at, wake_nearto } from './mon.js';
import { Blind, Deaf, Invis } from './youprop.js';
import { ACURR, Fast, adjalign, exercise } from './attrib.js';
import { ONAMES, OCLASSES, MATERIALS } from './objects_data.js';
import { PMNAMES, MSOUND, MFLAGS } from './monst_data.js';
import { Has_contents, Is_candle } from './obj.js';
import { DEADMONSTER, helpless } from './monst.js';
import { is_demon, is_elf, is_human, passes_walls, vegetarian,
         pronoun_gender } from './mondata.js';
import { poly_gender, mbodypart } from './polyself.js';
import { rn2, rnd } from './rng.js';
import { bot, pline, canseemon, canspotmon, newsym, sensemon }
    from './display.js';
import { an, doname, simpleonames, xname, The } from './objnam.js';
import { next_ident, splitobj } from './mkobj.js';
import { OBJ_CONTAINED, OBJ_FLOOR, OBJ_FREE, OBJ_INVENT, OBJ_ONBILL }
    from './obj.js';
import { s_suffix } from './hacklib.js';
import { shtypes, VEGETARIAN_CLASS } from './shknam.js';
import { Hello, genders } from './role.js';
import { ATR_NONE, NHW_MENU, tty_add_menu, tty_create_nhwindow,
         tty_destroy_nhwindow, tty_end_menu, tty_select_menu,
         tty_start_menu, ATR_INVERSE } from './tty/wintty.js';
import { NO_COLOR } from './terminal.js';
import { tty_yn_function } from './tty/topl.js';
import { arti_cost } from './artifact.js';
import { block_point, cansee } from './vision.js';
import { del_engr_at } from './engrave.js';
import { Norep, You_feel, You_hear } from './pline.js';

// src/shk.c:1449 hot_pursuit() — the shopkeeper starts following you.
//
// The isshk guard is not redundant: wakeup() calls this for any peaceful
// monster that turns out to be a shopkeeper, and setmangry's callers do not
// pre-filter, so a non-shk reaching here must return without touching
// eshk (which it does not have).
//
// `customer` is stamped with the player name because a shopkeeper tracks
// WHO owes; `following` is what makes it chase you off the level.
//
// The two clear_no_charge calls are shopkeeper networking: being chased by
// one shopkeeper voids the no-charge flag on every object on the floor of
// this level, including inside containers and including other shopkeepers'
// stock. That is deliberate -- the shops share information about a thief.
export function hot_pursuit(shkp) {
    if (!shkp.isshk)
        return;

    const eshk = shkp.eshk || ESHK(shkp);
    if (eshk) {
        shkp.mpeaceful = 0;
        if (!eshk.surcharge) {
            eshk.surcharge = true;
            for (const bp of eshk.bill_p || [])
                bp.price += Math.trunc((bp.price + 2) / 3);
        }
        eshk.customer = game.plname || '';
        eshk.following = 1;
    }

    const clear = (objects) => {
        for (const obj of objects || []) {
            obj.no_charge = 0;
            clear(obj.cobj);
        }
    };
    clear(game.level?.objects);
    for (const mon of game.level?.monsters || []) {
        if (mon.mtame)
            clear(mon.minvent);
    }
}

function note_unported_shk(what) {
    (game.unported ||= new Set()).add('shk:' + what);
    return false;
}

// src/shk.c:439 record_price_quote()
export function record_price_quote(otyp, price, buyprice) {
    const oc = game.objects?.[otyp];
    if (!oc)
        return;
    const min = buyprice ? 'oc_buy_minseen' : 'oc_sell_minseen';
    const max = buyprice ? 'oc_buy_maxseen' : 'oc_sell_maxseen';
    if (price > (oc[max] ?? 0))
        oc[max] = price;
    if ((oc[min] ?? -1) < 0 || price < oc[min])
        oc[min] = price;
}

// src/shk.c:56 IS_SHOP() — local macro: room rtype is a shop type.
// block_door()/block_entry() pass the roomno with ROOMOFFSET still added,
// unlike most callers which subtract it first — a C quirk kept as-is: the
// off-by-ROOMOFFSET slot is usually past nroom, whose rtype reads as
// ordinary, so these functions almost always see IS_SHOP() false.
function IS_SHOP(roomidx) {
    const r = (game.level?.rooms || [])[roomidx]
        || (game.level?.subrooms || [])
            .find(room => room.roomnoidx === roomidx);
    return !!r && r.rtype >= SHOPBASE;
}

// src/shk.c:568 inside_shop(), unlike in_rooms(), this excludes the room's
// boundary squares. Shop goods on the shopkeeper's own post are also free.
export function inside_shop(x, y) {
    const loc = game.level?.at(x, y);
    const rno = loc?.roomno ?? NO_ROOM;
    if (rno < ROOMOFFSET || loc.edge || !IS_SHOP(rno - ROOMOFFSET))
        return NO_ROOM;
    return rno;
}

// src/shk.c:1052 shop_keeper(), rooms keep their resident directly.
export function shop_keeper(roomno) {
    if (roomno < ROOMOFFSET)
        return null;
    const roomidx = roomno - ROOMOFFSET;
    const room = game.level?.rooms?.[roomidx]
        || (game.level?.subrooms || [])
            .find(candidate => candidate.roomnoidx === roomidx);
    const shkp = room?.resident || null;
    if (!shkp || !(shkp.eshk || ESHK(shkp)))
        return null;
    if (!shkp.mpeaceful && !(shkp.eshk || ESHK(shkp)).surcharge)
        note_unported_shk('shop_keeper:rile_shk');
    return shkp;
}

// src/shk.c:723 deserted_shop(): report an absent shopkeeper, distinguishing
// a genuinely empty shop from one containing seen or unseen monsters.
async function deserted_shop(enterstring) {
    const roomno = enterstring.charCodeAt(0) - ROOMOFFSET;
    const room = game.level?.rooms?.[roomno];
    if (!room)
        return;

    let seen = 0, total = 0;
    for (let x = room.lx; x <= room.hx; ++x) {
        for (let y = room.ly; y <= room.hy; ++y) {
            if (x === game.u.ux && y === game.u.uy)
                continue;
            const mon = m_at(x, y);
            if (!mon)
                continue;
            ++total;
            const appearance = M_AP_TYPE(mon);
            if (sensemon(mon)
                || ((appearance === M_AP_NOTHING
                     || appearance === M_AP_MONSTER)
                    && canseemon(mon)))
                ++seen;
        }
    }

    const blindTelepat = !!(game.u.intrinsic?.HTelepat
                             || game.u.uprops?.TELEPAT);
    if (Blind() && !(blindTelepat || game.u.uprops?.DETECT_MONSTERS))
        ++total;
    await pline(`This shop ${seen < total ? 'seems to be' : 'is'} ${
        !total ? 'deserted' : 'untended'}.`);
}

// src/shk.c:751 u_entered_shop(), including tended and untended entry.
export async function u_entered_shop(enterstring) {
    if (!enterstring)
        return;

    const roomno = enterstring.charCodeAt(0);
    const shkp = shop_keeper(roomno);
    const emptyShops = game._empty_shops || '';
    if (!shkp) {
        if (!emptyShops.includes(enterstring[0])
            && in_rooms(game.u.ux, game.u.uy, SHOPBASE)
               !== in_rooms(game.u.ux0, game.u.uy0, SHOPBASE))
            await deserted_shop(enterstring);
        game._empty_shops = game.u.ushops || '';
        game.u.ushops = '';
        return;
    }
    if (!inhishop(shkp)) {
        if (!emptyShops.includes(enterstring[0]))
            await deserted_shop(enterstring);
        game._empty_shops = game.u.ushops || '';
        game.u.ushops = '';
        return;
    }

    const { ACH_SHOP, record_achievement } = await import('./insight.js');
    record_achievement(ACH_SHOP);

    const eshk = shkp.eshk || ESHK(shkp);
    if (!Array.isArray(eshk.bill_p))
        eshk.bill_p = [];
    const customer = eshk.customer || '';
    if ((!(eshk.visitct | 0) || customer)
        && customer.toLowerCase() !== (game.plname || '').toLowerCase()) {
        eshk.visitct = 0;
        eshk.following = 0;
        eshk.customer = game.plname || '';
        shkp.mpeaceful = 1;
        if (eshk.surcharge) {
            eshk.surcharge = false;
            for (const bp of eshk.bill_p)
                bp.price -= Math.trunc((bp.price + 3) / 4);
        }
    }

    if (muteshk(shkp) || eshk.following)
        return;
    if (Invis()) {
        await pline(`${shopkeeper_name(shkp)} senses your presence.`);
        if (!Deaf() && !muteshk(shkp)) {
            await pline('"Invisible customers are not welcome!"');
        } else {
            const pronoun = shkp.female ? 'she' : 'he';
            await pline(`${shopkeeper_name(shkp)} stands firm as if ${
                pronoun} knows you are there.`);
        }
        return;
    }
    if (!shkp.mpeaceful || eshk.surcharge || eshk.robbed) {
        note_unported_shk('u_entered_shop:special_dialogue');
        return;
    }

    const roomidx = roomno - ROOMOFFSET;
    const room = game.level?.rooms?.[roomidx]
        || (game.level?.subrooms || [])
            .find(candidate => candidate.roomnoidx === roomidx);
    const rt = room?.rtype ?? SHOPBASE;
    const shopname = shtypes[rt - SHOPBASE]?.name || 'shop';
    const again = (eshk.visitct | 0) ? ' again' : '';
    if (!Deaf()) {
        await pline(`"${Hello(shkp)}, ${game.plname}!  Welcome${again} to `
                    + `${s_suffix(shopkeeper_name(shkp))} ${shopname}!"`);
    } else {
        await pline(`You enter ${s_suffix(shopkeeper_name(shkp))} ${shopname}${again}!`);
    }
    eshk.visitct = (eshk.visitct | 0) + 1;
}

// src/shk.c:5350 costly_spot(), is (x,y) a square this shopkeeper charges
// for? The keeper must still be in her shop, and her normal post is exempt.
export function costly_spot(x, y) {
    if (!game.level?.flags?.has_shop)
        return false;

    const rooms = in_rooms(x, y, SHOPBASE);
    const shkp = shop_keeper(rooms ? rooms.charCodeAt(0) : NO_ROOM);
    if (!shkp || !inhishop(shkp))
        return false;
    const eshk = shkp.eshk || ESHK(shkp);
    return !!inside_shop(x, y)
        && !(x === eshk.shk.x && y === eshk.shk.y);
}

function add_up_bill(shkp) {
    const eshk = shkp.eshk || ESHK(shkp);
    return (eshk.bill_p || []).reduce(
        (total, bp) => total + bp.price * bp.bquan, 0);
}

function clear_unpaid(objects) {
    for (const obj of objects || []) {
        obj.unpaid = 0;
        clear_unpaid(obj.cobj);
    }
}

function setpaid(shkp) {
    clear_unpaid(game.invent);
    clear_unpaid(game.level?.objects);
    for (const mon of game.level?.monsters || [])
        clear_unpaid(mon.minvent);

    const eshk = shkp.eshk || ESHK(shkp);
    eshk.bill_p = [];
    eshk.billct = 0;
    eshk.credit = 0;
    eshk.debit = 0;
    eshk.loan = 0;
}

// src/shk.c:1461 make_angry_shk(). Pending transactions become robbery
// before the keeper starts pursuing the customer.
export async function make_angry_shk(shkp) {
    const eshk = shkp.eshk || ESHK(shkp);
    if (eshk.billct || eshk.debit || eshk.loan || eshk.credit) {
        eshk.robbed = (eshk.robbed || 0) + add_up_bill(shkp)
            + (eshk.debit || 0) + (eshk.loan || 0) - (eshk.credit || 0);
        eshk.robbed = Math.max(0, eshk.robbed);
        setpaid(shkp);
    }
    await pline(`${shopkeeper_name(shkp)} ${shkp.mpeaceful
        ? 'gets angry' : 'is furious'}!`);
    hot_pursuit(shkp);
}

// src/zap.c:1970 poly_obj() shop tail. Transforming merchandise angers its
// resident even though the replacement object itself is not on the bill.
export async function shop_object_transformed(obj, replacement, x, y) {
    if ((!replacement || replacement.where === OBJ_INVENT) && !obj.unpaid)
        return;
    if (!costly_spot(x, y))
        return;

    const rooms = in_rooms(x, y, SHOPBASE);
    const shkp = shop_keeper(rooms ? rooms.charCodeAt(0) : NO_ROOM);
    if (!shkp || !inhishop(shkp))
        return;
    if (obj.no_charge
        && (!Has_contents(obj) || !contained_purchase_cost(obj, shkp)))
        return;

    if (!shkp.mpeaceful) {
        await Norep(`${shopkeeper_name(shkp)} is furious!`);
        return;
    }

    const heroRoom = in_rooms(game.u.ux, game.u.uy, 0)?.[0] || '';
    const keeperRoom = in_rooms(shkp.mx, shkp.my, 0)?.[0] || '';
    if ((game.u.ushops || '').length && heroRoom === keeperRoom
        && !costly_spot(game.u.ux, game.u.uy)) {
        await make_angry_shk(shkp);
    } else {
        await pline(`${shopkeeper_name(shkp)} gets angry!`);
        hot_pursuit(shkp);
    }
}

// src/shk.c:235 shkgone(): remove a dead shopkeeper's room residency and
// stop treating the former stock as shop-owned merchandise.
export function shkgone(shkp) {
    const eshk = shkp.eshk || ESHK(shkp);
    const roomno = (eshk?.shoproom ?? NO_ROOM) - ROOMOFFSET;
    const room = game.level?.rooms?.[roomno];
    if (!eshk || !room)
        return;
    if (eshk.shoplevel
        && (eshk.shoplevel.dnum !== game.u.uz.dnum
            || eshk.shoplevel.dlevel !== game.u.uz.dlevel))
        return;

    room.resident = null;
    for (const obj of game.level?.objects || []) {
        if (obj.ox >= room.lx && obj.ox <= room.hx
            && obj.oy >= room.ly && obj.oy <= room.hy)
            obj.no_charge = 0;
    }

    const roomchar = String.fromCharCode(eshk.shoproom);
    if ((game.u.ushops || '').includes(roomchar)) {
        setpaid(shkp);
        game.u.ushops = [...game.u.ushops]
            .filter(ch => ch !== roomchar).join('');
    }
}

async function makekops(origin) {
    const [{ depth }, { enexto }, { makemon, MM_NOMSG }] = await Promise.all([
        import('./dungeon.js'), import('./teleport.js'), import('./makemon.js'),
    ]);
    const count = Math.abs(depth(game.u.uz)) + rnd(5);
    const counts = [count, Math.trunc(count / 3) + 1,
                    Math.trunc(count / 6), Math.trunc(count / 9)];
    const types = [PMNAMES.PM_KEYSTONE_KOP, PMNAMES.PM_KOP_SERGEANT,
                   PMNAMES.PM_KOP_LIEUTENANT, PMNAMES.PM_KOP_KAPTAIN];
    const spot = { x: origin.x, y: origin.y };

    for (let k = 0; k < types.length; ++k) {
        if (!counts[k])
            break;
        const mndx = types[k];
        if ((game.mvitals?.[mndx]?.mvflags || 0) & G_GONE)
            continue;
        for (let left = counts[k]; left > 0; --left) {
            if (enexto(spot, spot.x, spot.y, game.mons[mndx])) {
                makemon(game.mons[mndx], spot.x, spot.y, MM_NOMSG);
            }
        }
    }
}

async function call_kops(shkp, nearshop) {
    await pline('An alarm sounds!');
    const types = [PMNAMES.PM_KEYSTONE_KOP, PMNAMES.PM_KOP_SERGEANT,
                   PMNAMES.PM_KOP_LIEUTENANT, PMNAMES.PM_KOP_KAPTAIN];
    if (types.every(mndx =>
        ((game.mvitals?.[mndx]?.mvflags || 0) & G_GONE))) {
        if (game.flags?.verbose !== false)
            await pline('But no one seems to respond to it.');
        return;
    }

    if (nearshop) {
        if (game.flags?.verbose !== false)
            await pline('The Keystone Kops appear!');
        await makekops({ x: game.u.ux, y: game.u.uy });
        return;
    }

    if (game.flags?.verbose !== false)
        await pline('The Keystone Kops are after you!');
    const { choose_stairs } = await import('./wizard.js');
    const stairs = { sx: 0, sy: 0 };
    choose_stairs(stairs, true);
    if (isok(stairs.sx, stairs.sy))
        await makekops({ x: stairs.sx, y: stairs.sy });
    await makekops({ x: shkp.mx, y: shkp.my });
}

async function rob_shop(shkp) {
    const eshk = shkp.eshk || ESHK(shkp);
    let total = add_up_bill(shkp) + (eshk.debit || 0);
    if ((eshk.credit || 0) >= total) {
        await pline(`Your credit of ${eshk.credit} ${currency(eshk.credit)} is used to cover your shopping bill.`);
        total = 0;
    } else {
        await pline('You escaped the shop without paying!');
        total -= eshk.credit || 0;
    }
    setpaid(shkp);
    if (!total)
        return false;

    eshk.robbed = (eshk.robbed || 0) + total;
    await pline(`You stole ${total} ${currency(total)} worth of merchandise.`);
    if (game.urole?.mnum !== PMNAMES.PM_ROGUE)
        adjalign(-Math.sign(game.u.ualign?.type || 0));
    hot_pursuit(shkp);
    return true;
}

// src/shk.c u_left_shop(), including credit settlement and the Kops alarm.
export async function u_left_shop(leavestring, newlev) {
    const u = game.u;
    if (!leavestring
        && (!game.level?.at(u.ux, u.uy)?.edge
            || game.level?.at(u.ux0, u.uy0)?.edge))
        return;

    const roomno = (leavestring || u.ushops0 || '').charCodeAt(0);
    const shkp = shop_keeper(roomno);
    if (!shkp || !inhishop(shkp))
        return;
    const eshk = shkp.eshk || ESHK(shkp);
    if (!eshk.billct && !eshk.debit)
        return;

    if (!leavestring && !muteshk(shkp)) {
        const warning = eshk.surcharge
            ? `${game.plname}!  Don't you leave without paying!`
            : `${game.plname}!  Please pay before leaving.`;
        await pline(`"${warning}"`);
        return;
    }

    if (await rob_shop(shkp))
        await call_kops(shkp, !newlev && !!game.level?.at(u.ux0, u.uy0)?.edge);
}

// src/shk.c:2846 get_pricing_units(). Ordinary stacks price by quantity;
// globs price by their current weight.
function get_pricing_units(obj) {
    let units = obj.quan || 1;
    if (obj.globby) {
        const unitWeight = game.objects[obj.otyp]?.oc_weight || 0;
        const currentWeight = obj.owt > 0 ? obj.owt : weight(obj);
        if (unitWeight)
            units = Math.trunc((currentWeight + unitWeight - 1) / unitWeight);
    }
    return units;
}

// src/shk.c:2995 contained_cost(), purchase side. A floor container's
// player-owned contents are marked no_charge; every other non-coin object is
// shop stock and contributes its full stack price.
function contained_purchase_cost(obj, shkp) {
    let price = 0;
    for (const contained of obj.cobj || []) {
        if (contained.oclass !== OCLASSES.COIN_CLASS
            && !contained.no_charge) {
            price += get_cost(contained, shkp)
                   * get_pricing_units(contained);
        }
        if (Has_contents(contained))
            price += contained_purchase_cost(contained, shkp);
    }
    return price;
}

// src/shk.c:2809 get_cost_of_shop_item(), including floor containers.
function get_cost_of_shop_item(obj) {
    let nocharge = -1;
    let top = obj;
    while (top.where === OBJ_CONTAINED && top.ocontainer)
        top = top.ocontainer;
    const x = top.ox, y = top.oy;
    const shop = in_rooms(x, y, SHOPBASE);
    if (!(game.u.ushops || '') || obj.oclass === OCLASSES.COIN_CLASS
        || !shop || shop[0] !== game.u.ushops[0])
        return { price: 0, nocharge };

    const shkp = shop_keeper(inside_shop(x, y));
    if (!shkp || !inhishop(shkp))
        return { price: 0, nocharge };
    const eshk = shkp.eshk || ESHK(shkp);
    const onfloor = top.where === undefined || top.where === 1;
    const freespot = onfloor && x === eshk.shk.x && y === eshk.shk.y;
    nocharge = onfloor && (!!obj.no_charge || freespot) ? 1 : 0;
    let price = nocharge ? 0 : get_cost(obj, shkp) * get_pricing_units(obj);
    if (Has_contents(obj) && !freespot)
        price += contained_purchase_cost(obj, shkp);
    return { price, nocharge };
}

// src/objnam.c:1761 doname_with_price(), ordinary floor-object arm.
export function doname_with_price(obj) {
    let result = doname(obj);
    if (obj.unpaid)
        return result;

    const { price, nocharge } = get_cost_of_shop_item(obj);
    if (price > 0) {
        result += ` (${nocharge ? 'contents' : 'for sale'}, ${price} ${currency(price)})`;
        record_price_quote(obj.otyp, Math.trunc(price / (obj.quan || 1)), true);
    } else if (nocharge > 0) {
        result += ' (no charge)';
    }
    return result;
}

// src/shk.c:4275 corpsenm_price_adj(), the species premium for tins, eggs,
// and corpses. Each conveyable intrinsic has its own fixed weight.
function corpsenm_price_adj(obj) {
    if (obj.otyp !== ONAMES.TIN && obj.otyp !== ONAMES.EGG
        && obj.otyp !== ONAMES.CORPSE)
        return 0;
    const ptr = game.mons[obj.corpsenm];
    if (!ptr)
        return 0;

    const conveyance_costs = [
        [0x01, 2], [0x04, 3], [0x02, 2], [0x08, 5],
        [0x10, 4], [0x20, 2], [0x40, 1], [0x80, 3],
    ];
    let multiplier = 1;
    for (const [mask, cost] of conveyance_costs)
        if (ptr.mconveys & mask)
            multiplier += cost;
    if (ptr.mflags1 & MFLAGS.M1_TPORT)
        multiplier += 2;
    if (ptr.mflags1 & MFLAGS.M1_TPORT_CNTRL)
        multiplier += 3;
    if (ptr === game.mons[PMNAMES.PM_FLOATING_EYE]
        || ptr === game.mons[PMNAMES.PM_MIND_FLAYER]
        || ptr === game.mons[PMNAMES.PM_MASTER_MIND_FLAYER])
        multiplier += 5;
    if (ptr.geno & MFLAGS.G_UNIQ)
        multiplier += 50;

    let value = Math.max(1, (ptr.mlevel - 1) * 2);
    if (obj.otyp === ONAMES.CORPSE)
        value += Math.max(1, Math.trunc(ptr.cnutrit / 30));
    return value * multiplier;
}

// src/shk.c:4319 getprice(), base price before the buyer-specific charisma,
// knowledge, clothing, and anger adjustments below.
function getprice(obj, shk_buying = false) {
    let tmp = game.objects[obj.otyp]?.oc_cost ?? 0;

    if (obj.oartifact) {
        tmp = arti_cost(obj);
        if (shk_buying)
            tmp = Math.trunc(tmp / 4);
    }
    switch (obj.oclass) {
    case OCLASSES.FOOD_CLASS:
        tmp += corpsenm_price_adj(obj);
        if ((game.u.uhs ?? 0) >= HUNGRY && !shk_buying)
            tmp *= game.u.uhs;
        if (obj.oeaten)
            tmp = 0;
        break;
    case OCLASSES.WAND_CLASS:
        if (obj.spe === -1)
            tmp = 0;
        break;
    case OCLASSES.POTION_CLASS:
        if (obj.otyp === ONAMES.POT_WATER && !obj.blessed && !obj.cursed)
            tmp = 0;
        break;
    case OCLASSES.ARMOR_CLASS:
    case OCLASSES.WEAPON_CLASS:
        if (obj.spe > 0)
            tmp += 10 * obj.spe;
        break;
    case OCLASSES.TOOL_CLASS:
        if (Is_candle(obj)
            && (obj.age ?? 0) < 20 * (game.objects[obj.otyp]?.oc_cost ?? 0))
            tmp = Math.trunc(tmp / 2);
        break;
    }
    return tmp;
}

// src/shk.c:2877 get_cost(), what the shopkeeper charges for one item.
function get_cost(obj, shkp) {
    let tmp = getprice(obj);
    let multiplier = 1, divisor = 1;
    const ocl = game.objects[obj.otyp];

    if (!tmp)
        tmp = 5;
    if (!obj.dknown || !ocl.oc_name_known) {
        if (obj.oclass === OCLASSES.GEM_CLASS
            && ocl.oc_material === MATERIALS.GLASS) {
            const pairs = [
                [ONAMES.DIAMOND, ONAMES.OPAL],
                [ONAMES.SAPPHIRE, ONAMES.AQUAMARINE],
                [ONAMES.RUBY, ONAMES.JASPER],
                [ONAMES.AMBER, ONAMES.TOPAZ],
                [ONAMES.JACINTH, ONAMES.AGATE],
                [ONAMES.CITRINE, ONAMES.CHRYSOBERYL],
                [ONAMES.BLACK_OPAL, ONAMES.JET],
                [ONAMES.EMERALD, ONAMES.JADE],
                [ONAMES.AMETHYST, ONAMES.FLUORITE],
            ];
            const pair = pairs[obj.otyp - ONAMES.FIRST_GLASS_GEM];
            const dt = String(game.fixed_datetime || '');
            const birthday = dt.length === 14
                ? Date.UTC(Number(dt.slice(0, 4)), Number(dt.slice(4, 6)) - 1,
                           Number(dt.slice(6, 8)), Number(dt.slice(8, 10)),
                           Number(dt.slice(10, 12)), Number(dt.slice(12, 14)))
                    / 1000 + 4 * 60 * 60
                : 0;
            const pseudorand = ((birthday | 0) % obj.otyp)
                             >= Math.trunc(obj.otyp / 2);
            if (pair)
                tmp = game.objects[pair[pseudorand ? 0 : 1]].oc_cost;
        } else if ((obj.o_id % 4) === 0) {
            multiplier *= 4;
            divisor *= 3;
        }
    }

    const u = game.u;
    const tourist = game.urole?.mnum === PMNAMES.PM_TOURIST
                 || game.urole?.mnum === 'PM_TOURIST';
    if (u.uarmh?.otyp === ONAMES.DUNCE_CAP) {
        multiplier *= 4;
        divisor *= 3;
    } else if ((tourist && u.ulevel < MAXULEV / 2)
               || (u.uarmu && !u.uarm && !u.uarmc)) {
        multiplier *= 4;
        divisor *= 3;
    }

    const charisma = ACURR(A_CHA);
    if (charisma > 18) {
        divisor *= 2;
    } else if (charisma === 18) {
        multiplier *= 2;
        divisor *= 3;
    } else if (charisma >= 16) {
        multiplier *= 3;
        divisor *= 4;
    } else if (charisma <= 5) {
        multiplier *= 2;
    } else if (charisma <= 7) {
        multiplier *= 3;
        divisor *= 2;
    } else if (charisma <= 10) {
        multiplier *= 4;
        divisor *= 3;
    }

    tmp *= multiplier;
    if (divisor > 1) {
        tmp *= 10;
        tmp = Math.trunc(tmp / divisor);
        tmp += 5;
        tmp = Math.trunc(tmp / 10);
    }
    tmp = Math.max(1, tmp);
    if (obj.oartifact)
        tmp *= 4;
    const eshk = shkp.eshk || ESHK(shkp);
    if (eshk.surcharge)
        tmp += Math.trunc((tmp + 2) / 3);
    return tmp;
}

function add_one_tobill(obj, dummy, shkp) {
    const eshk = shkp.eshk || ESHK(shkp);
    if (!Array.isArray(eshk.bill_p))
        eshk.bill_p = [];
    if (eshk.bill_p.length >= 200)
        return false;

    let price = get_cost(obj, shkp);
    if (obj.globby)
        price *= get_pricing_units(obj);
    eshk.bill_p.push({
        bo_id: obj.o_id,
        useup: !!dummy,
        price,
        bquan: obj.quan,
    });
    eshk.billct = eshk.bill_p.length;
    obj.unpaid = 1;
    return true;
}

function append_honorific() {
    const honored = [
        'good', 'honored', 'most gracious', 'esteemed',
        'most renowned and sacred',
    ];
    let result = honored[rn2(honored.length - 1)
                         + (game.u.uevent?.udemigod ? 1 : 0)];
    const ptr = game.youmonst?.data;
    const vampire = game.u.umonnum === PMNAMES.PM_VAMPIRE
                 || game.u.umonnum === PMNAMES.PM_VAMPIRE_LEADER
                 || game.u.umonnum === PMNAMES.PM_VLAD_THE_IMPALER;
    if (vampire)
        result += game.flags?.female ? ' dark lady' : ' dark lord';
    else if ((ptr && is_elf(ptr)) || game.urace?.mnum === PMNAMES.PM_ELF)
        result += game.flags?.female ? ' hiril' : ' hir';
    else if (ptr && !is_human(ptr))
        result += ' creature';
    else
        result += game.flags?.female ? ' lady' : ' sir';
    return result;
}

function muteshk(shkp) {
    return helpless(shkp) || (shkp.data?.msound ?? 0) <= MSOUND.MS_ANIMAL;
}

// src/shk.c cost_per_charge() and check_unpaid_usage(). Using a charge from
// unpaid merchandise adds a separate usage debt without changing store credit.
function cost_per_charge(shkp, obj, altusage) {
    let cost = get_cost(obj, shkp);
    if (obj.otyp === ONAMES.MAGIC_LAMP) {
        cost = altusage
            ? cost + Math.trunc(cost / 3)
            : game.objects[ONAMES.OIL_LAMP].oc_cost;
    } else if (obj.otyp === ONAMES.MAGIC_MARKER) {
        cost = Math.trunc(cost / 2);
    } else if (obj.otyp === ONAMES.BAG_OF_TRICKS
               || obj.otyp === ONAMES.HORN_OF_PLENTY) {
        if (!altusage)
            cost = Math.trunc(cost / 5);
    } else if (obj.otyp === ONAMES.CRYSTAL_BALL
               || obj.otyp === ONAMES.OIL_LAMP
               || obj.otyp === ONAMES.BRASS_LANTERN
               || (obj.otyp >= ONAMES.MAGIC_FLUTE
                   && obj.otyp <= ONAMES.DRUM_OF_EARTHQUAKE)
               || obj.oclass === OCLASSES.WAND_CLASS) {
        if (obj.spe > 1)
            cost = Math.trunc(cost / 4);
    } else if (obj.oclass === OCLASSES.SPBOOK_CLASS) {
        cost -= Math.trunc(cost / 5);
    } else if (obj.otyp === ONAMES.CAN_OF_GREASE
               || obj.otyp === ONAMES.TINNING_KIT
               || obj.otyp === ONAMES.EXPENSIVE_CAMERA) {
        cost = Math.trunc(cost / 10);
    } else if (obj.otyp === ONAMES.POT_OIL) {
        cost = Math.trunc(cost / 5);
    }
    return cost;
}

export async function check_unpaid_usage(obj, altusage = false) {
    if (!obj?.unpaid || !(game.u.ushops || '').length
        || (obj.spe <= 0 && game.objects[obj.otyp]?.oc_charged))
        return;
    const shkp = shop_keeper(game.u.ushops.charCodeAt(0));
    if (!shkp || !inhishop(shkp))
        return;
    const cost = cost_per_charge(shkp, obj, altusage);
    if (!cost)
        return;

    const eshk = shkp.eshk || ESHK(shkp);
    let message;
    if (obj.oclass === OCLASSES.SPBOOK_CLASS) {
        const gender = is_demon(game.youmonst?.data) ? 3 : poly_gender();
        const address = ['cad', 'minx', 'beast', 'fiend'][gender] || 'thing';
        const preface = rn2(2) ? `This is no free library, ${address}!  ` : '';
        message = `${preface}You owe${eshk.debit ? ' an additional' : ''}`
                + ` ${cost} ${currency(cost)}.`;
    } else if (obj.otyp === ONAMES.POT_OIL) {
        message = `That will cost you ${cost} ${currency(cost)}`
                + ' (Yendorian Fuel Tax).';
    } else if (altusage && (obj.otyp === ONAMES.BAG_OF_TRICKS
                            || obj.otyp === ONAMES.HORN_OF_PLENTY)) {
        let preface = '';
        if (!rn2(3))
            preface = 'Whoa!  ';
        if (!rn2(3))
            preface = 'Watch it!  ';
        message = `${preface}Emptying that will cost you ${cost} ${currency(cost)}.`;
    } else {
        const first = !rn2(3) ? 'Hey!  ' : '';
        const second = !rn2(3) ? 'Ahem.  ' : '';
        message = `${first}${second}Usage fee, ${cost} ${currency(cost)}.`;
    }

    if (!Deaf() && !muteshk(shkp)) {
        await pline(`"${message}"`);
        exercise(A_WIS, true);
    }
    eshk.debit = (eshk.debit || 0) + cost;
}

export async function check_unpaid(obj) {
    await check_unpaid_usage(obj, false);
}

// src/shk.c:3085 picked_container(). Once a container leaves the floor, its
// contents no longer use floor-only no_charge ownership markers.
function picked_container(obj) {
    for (const contained of obj.cobj || []) {
        if (contained.oclass === OCLASSES.COIN_CLASS)
            continue;
        contained.no_charge = 0;
        if (Has_contents(contained))
            picked_container(contained);
    }
}

// src/shk.c:3385 bill_box_content(). Bill every shop-owned non-coin object in
// a container, including objects inside nested containers.
function bill_box_content(obj, dummy, shkp) {
    for (const contained of obj.cobj || []) {
        if (contained.oclass === OCLASSES.COIN_CLASS)
            continue;
        if (!contained.no_charge)
            add_one_tobill(contained, dummy, shkp);
        if (Has_contents(contained))
            bill_box_content(contained, dummy, shkp);
    }
}

function count_unpaid_contents(obj) {
    let count = 0;
    for (const contained of obj.cobj || []) {
        if (contained.unpaid)
            count += 1;
        if (Has_contents(contained))
            count += count_unpaid_contents(contained);
    }
    return count;
}

// src/shk.c:5745 costly_gold(). Picking shop-floor gold back up first consumes
// credit, then becomes debt and a loan if the credit is insufficient.
async function costly_gold(amount, shkp, silent) {
    const eshk = shkp.eshk || ESHK(shkp);
    if ((eshk.credit || 0) >= amount) {
        if (!silent) {
            await pline(eshk.credit > amount
                ? `Your credit is reduced by ${amount} ${currency(amount)}.`
                : 'Your credit is erased.');
        }
        eshk.credit -= amount;
        return;
    }

    const delta = amount - (eshk.credit || 0);
    if (!silent) {
        if (eshk.credit)
            await pline('Your credit is erased.');
        await pline(eshk.debit
            ? `Your debt increases by ${delta} ${currency(delta)}.`
            : `You owe ${shopkeeper_name(shkp)} ${delta} ${currency(delta)}.`);
    }
    eshk.debit = (eshk.debit || 0) + delta;
    eshk.loan = (eshk.loan || 0) + delta;
    eshk.credit = 0;
}

// src/shk.c:3490 addtobill(), including container contents and gold.
export async function addtobill(obj, ininv, dummy, silent) {
    const roomno = game.u.ushops ? game.u.ushops.charCodeAt(0) : NO_ROOM;
    const shkp = shop_keeper(roomno);
    if (!shkp || !inhishop(shkp) || obj.unpaid
        || (obj.oclass === OCLASSES.FOOD_CLASS && obj.oeaten))
        return;

    const container = Has_contents(obj);
    const contentsPrice = container ? contained_purchase_cost(obj, shkp) : 0;
    const containedGold = container ? contained_gold(obj, true) : 0;
    if (obj.no_charge
        && (!container || (!contentsPrice && !containedGold))) {
        if (obj.oclass !== OCLASSES.COIN_CLASS) {
            obj.no_charge = 0;
            if (container)
                picked_container(obj);
        }
        return;
    }
    if (obj.oclass === OCLASSES.COIN_CLASS) {
        await costly_gold(obj.quan || 1, shkp, silent);
        return;
    }

    const eshk = shkp.eshk || ESHK(shkp);
    if ((eshk.billct ?? 0) >= 200) {
        if (!silent)
            await pline('You got that for free!');
        return;
    }

    let price = !obj.no_charge ? get_cost(obj, shkp) : 0;
    if (price && obj.globby)
        price *= get_pricing_units(obj);
    let contentsCount = 0;
    if (container) {
        if (price)
            add_one_tobill(obj, dummy, shkp);
        if (contentsPrice)
            bill_box_content(obj, dummy, shkp);
        picked_container(obj);
        price += contentsPrice;

        if (containedGold) {
            await costly_gold(containedGold, shkp, silent);
            if (!price)
                return;
        }
        obj.no_charge = 0;
        contentsCount = count_unpaid_contents(obj);
    } else if (!add_one_tobill(obj, dummy, shkp)) {
        return;
    }

    if (silent)
        return;

    if (!Deaf() && !muteshk(shkp)) {
        if (!ininv) {
            await pline(`${The(xname(obj))} will cost you ${price} ${currency(price)}`
                        + `${obj.quan > 1 ? ' each' : ''}.`);
            return;
        }

        let quote = '"For you,';
        if (!shkp.mpeaceful) {
            quote += ' scum;';
        } else if (!eshk.surcharge) {
            quote += ` ${append_honorific()}; only`;
        }
        const saveQuan = obj.quan;
        obj.quan = 1;
        const relation = saveQuan > 1 ? 'per'
            : (contentsCount && !obj.unpaid)
                ? 'for the contents of this' : 'for this';
        quote += ` ${price} ${currency(price)} ${relation} ${xname(obj)}`
               + `${contentsCount && obj.unpaid ? ' and its contents' : ''}."`;
        obj.quan = saveQuan;
        await pline(quote);
    } else {
        const subject = contentsCount && !obj.unpaid
            ? `the contents of the ${xname(obj)}`
            : `the ${xname(obj)}${contentsCount && obj.unpaid
                ? ' and its contents' : ''}`;
        await pline(`The list price of ${subject} is ${price} ${currency(price)}`
                    + `${obj.quan > 1 ? ' each' : ''}.`);
    }
}

function shopkeeper_name(shkp) {
    const raw = shkp.shknam || shkp.eshk?.shknam
        || shkp.mextra?.eshk?.shknam || 'the shopkeeper';
    return /^[-+_|=]/.test(raw) ? raw.slice(1) : raw;
}

/* src/objnam.c paydoname() suppresses the carried-item price because the pay
   menu puts its own aligned amount first. Container contents are hidden and
   ownership is described relative to the outer container. */
function paydoname(obj) {
    const unpaid = obj.unpaid;
    const cknown = obj.cknown;
    obj.unpaid = 0;
    if (Has_contents(obj))
        obj.cknown = 0;
    game.iflags.suppress_price = (game.iflags.suppress_price || 0) + 1;
    let name = doname(obj);
    game.iflags.suppress_price -= 1;
    obj.unpaid = unpaid;
    obj.cknown = cknown;

    if (Has_contents(obj)) {
        if (!obj.no_charge) {
            name = name.replace(/^(?:an? )/, '');
            name = unpaid ? `an unpaid ${name}` : `your ${name}`;
        }
        name = unpaid ? `${name} and its contents`
                      : `the contents of ${name}`;
    }
    return name;
}

/* src/shk.c make_itemized_bill(). Contained bill entries collapse into one
   outer-container row, while ordinary and fully used-up entries stay
   itemized individually. */
function itemized_bill(eshk) {
    const result = [];
    const byId = new Map();
    const indexObjects = (objects) => {
        for (const obj of objects || []) {
            byId.set(obj.o_id, obj);
            indexObjects(obj.cobj);
        }
    };
    indexObjects(game.invent);
    indexObjects(game.billobjs);

    const outerContainer = (obj) => {
        let top = obj;
        while (top.where === OBJ_CONTAINED && top.ocontainer)
            top = top.ocontainer;
        return top;
    };
    const grouped = new Set();

    for (let bidx = 0; bidx < (eshk.bill_p || []).length; ++bidx) {
        const bp = eshk.bill_p[bidx];
        if (bp.useup) {
            const obj = bp.obj || byId.get(bp.bo_id);
            if (obj) {
                result.push({ obj, bp, bidx, cost: bp.price * bp.bquan,
                              usedup: true });
                continue;
            }
        }
        const obj = byId.get(bp.bo_id);
        if (!obj || !obj.unpaid || bp.useup || obj.quan !== bp.bquan) {
            note_unported_shk('dopay:nonordinary_bill_entry');
            continue;
        }

        const top = outerContainer(obj);
        if (obj.where === OBJ_CONTAINED || Has_contents(obj)) {
            const entries = [];
            for (let j = 0; j < (eshk.bill_p || []).length; ++j) {
                const nestedBp = eshk.bill_p[j];
                const nestedObj = byId.get(nestedBp.bo_id);
                if (!nestedBp.useup && nestedObj?.unpaid
                    && nestedObj.quan === nestedBp.bquan
                    && outerContainer(nestedObj) === top) {
                    entries.push({ obj: nestedObj, bp: nestedBp, bidx: j });
                }
            }
            const hasBilledContents = entries.some(entry => entry.obj !== top);
            if ((top !== obj || hasBilledContents) && !grouped.has(top)) {
                grouped.add(top);
                result.push({
                    obj: top,
                    bp: entries.find(entry => entry.obj === top)?.bp || null,
                    bidx: entries.find(entry => entry.obj === top)?.bidx ?? -1,
                    cost: entries.reduce((sum, entry) =>
                        sum + entry.bp.price * (entry.obj.quan || 1), 0),
                    usedup: false,
                    container: true,
                    entries,
                });
                continue;
            }
            if (grouped.has(top))
                continue;
        }
        result.push({ obj, bp, bidx, cost: bp.price * obj.quan,
                      usedup: false });
    }
    result.sort((a, b) => (Number(b.usedup) - Number(a.usedup))
                          || (b.cost - a.cost) || (a.bidx - b.bidx));
    return result;
}

const SELL_NORMAL = 0;
const SELL_DELIBERATE = 1;
const SELL_DONTSELL = 2;

// src/shk.c sellobj_state(). Deliberate drops ask before selling, while
// accidental and multi-object drops can reuse one response.
export function sellobj_state(deliberate) {
    game.sell_response = deliberate !== SELL_NORMAL ? '' : 'a';
    game.sell_how = deliberate;
    game.auto_credit = false;
}

function saleable(shkp, obj) {
    const eshk = shkp.eshk || ESHK(shkp);
    const shop = shtypes[(eshk.shoptype || SHOPBASE) - SHOPBASE];
    if (!shop || shop.symb === OCLASSES.RANDOM_CLASS)
        return true;
    for (const [, itype] of shop.iprobs || []) {
        if (itype === VEGETARIAN_CLASS) {
            const otyp = obj.otyp;
            const corpsenm = obj.corpsenm ?? NON_PM;
            if (obj.oclass === OCLASSES.FOOD_CLASS
                && (game.objects[otyp].oc_material === MATERIALS.VEGGY
                    || otyp === ONAMES.EGG
                    || (otyp === ONAMES.TIN && corpsenm === NON_PM
                        && obj.spe === 1)
                    || ((otyp === ONAMES.TIN || otyp === ONAMES.CORPSE)
                        && corpsenm >= 0 && corpsenm < game.mons.length
                        && vegetarian(game.mons[corpsenm]))))
                return true;
            continue;
        }
        if (itype < 0 ? itype === -obj.otyp : itype === obj.oclass)
            return true;
    }
    return false;
}

// src/shk.c set_cost(), the amount a shopkeeper offers for ordinary goods.
function set_cost(obj, shkp) {
    let amount = (obj.quan || 1) * getprice(obj, true);
    let multiplier = 1;
    let divisor = 1;
    const u = game.u;
    const tourist = game.urole?.mnum === PMNAMES.PM_TOURIST
                 || game.urole?.mnum === 'PM_TOURIST';

    if (u.uarmh?.otyp === ONAMES.DUNCE_CAP) {
        divisor *= 3;
    } else if ((tourist && u.ulevel < MAXULEV / 2)
               || (u.uarmu && !u.uarm && !u.uarmc)) {
        divisor *= 3;
    } else {
        divisor *= 2;
    }

    const ocl = game.objects[obj.otyp];
    if (!obj.dknown || !ocl.oc_name_known) {
        if (obj.oclass === OCLASSES.GEM_CLASS) {
            if (ocl.oc_material === MATERIALS.GEMSTONE
                || ocl.oc_material === MATERIALS.GLASS) {
                amount = (obj.otyp - ONAMES.FIRST_REAL_GEM)
                       % (6 - (shkp.m_id || 0) % 3);
                amount = (amount + 3) * (obj.quan || 1);
                divisor = 1;
            }
        } else if (amount > 1 && !((shkp.m_id || 0) % 4)) {
            multiplier *= 3;
            divisor *= 4;
        }
    }

    if (amount >= 1) {
        amount *= multiplier;
        if (divisor > 1)
            amount = Math.trunc((Math.trunc(amount * 10 / divisor) + 5) / 10);
        amount = Math.max(1, amount);
    }
    return amount;
}

// src/shk.c:2995 contained_cost() and src/invent.c:3620 count_contents().
// During a new drop, unpaid contents still belong to the shopkeeper and all
// other contents still belong to the hero. The offer only includes saleable
// hero-owned objects, while the counts drive the container-specific prompt.
function contained_sale_summary(obj, shkp) {
    let cost = 0;
    let shopCount = 0;
    let heroCount = 0;
    for (const contained of obj.cobj || []) {
        if (Has_contents(contained)) {
            const nested = contained_sale_summary(contained, shkp);
            cost += nested.cost;
            shopCount += nested.shopCount;
            heroCount += nested.heroCount;
        }
        if (contained.unpaid) {
            shopCount += contained.quan || 1;
        } else {
            heroCount += contained.quan || 1;
            if (contained.oclass !== OCLASSES.COIN_CLASS
                && contained.oclass !== OCLASSES.BALL_CLASS
                && saleable(shkp, contained)
                && !(contained.oclass === OCLASSES.FOOD_CLASS
                     && contained.oeaten)
                && !(Is_candle(contained)
                     && (contained.age ?? 0)
                        < 20 * (game.objects[contained.otyp]?.oc_cost ?? 0))) {
                cost += set_cost(contained, shkp);
            }
        }
    }
    return { cost, shopCount, heroCount };
}

// src/shk.c:3064 dropped_container(). Mark the portions of a newly dropped
// container which the shopkeeper did not buy as player-owned floor objects.
function dropped_container(obj, shkp, sale) {
    for (const contained of obj.cobj || []) {
        if (contained.oclass !== OCLASSES.COIN_CLASS
            && !contained.unpaid
            && !(sale && saleable(shkp, contained))) {
            contained.no_charge = 1;
        }
        if (Has_contents(contained))
            dropped_container(contained, shkp, sale);
    }
}

function sub_one_frombill(obj, shkp) {
    const eshk = shkp.eshk || ESHK(shkp);
    const bill = eshk.bill_p || [];
    const index = bill.findIndex(bp => bp.bo_id === obj.o_id);
    if (index < 0) {
        obj.unpaid = 0;
        return;
    }
    obj.unpaid = 0;
    if (bill[index].bquan > obj.quan) {
        note_unported_shk('sub_one_frombill:partly_used');
        bill[index].bquan -= obj.quan;
        return;
    }
    bill.splice(index, 1);
    eshk.billct = bill.length;
}

function subfrombill(obj, shkp) {
    sub_one_frombill(obj, shkp);
    for (const contained of obj.cobj || []) {
        if (contained.oclass !== OCLASSES.COIN_CLASS)
            subfrombill(contained, shkp);
    }
}

// src/shk.c:3623 splitbill() -- give the split child its own bill entry while
// preserving the parent's unit price.
export function splitbill(obj, otmp) {
    const roomno = game.u.ushops ? game.u.ushops.charCodeAt(0) : NO_ROOM;
    const shkp = shop_keeper(roomno);
    if (!shkp || !inhishop(shkp)) {
        note_unported_shk('splitbill:no_shopkeeper');
        return false;
    }
    const eshk = shkp.eshk || ESHK(shkp);
    const original = (eshk.bill_p || []).find(bp => bp.bo_id === obj.o_id);
    if (!original || original.bquan <= otmp.quan) {
        note_unported_shk('splitbill:bad_quantity');
        return false;
    }

    original.bquan -= otmp.quan;
    if ((eshk.bill_p || []).length >= 200) {
        otmp.unpaid = 0;
        return false;
    }
    eshk.bill_p.push({
        bo_id: otmp.o_id,
        bquan: otmp.quan,
        useup: false,
        price: original.price,
    });
    eshk.billct = eshk.bill_p.length;
    return true;
}

// src/mkobj.c:712 bill_dummy_object(). Preserve a fully used or altered
// shop item on the bill while releasing the live object from shop ownership.
export function bill_dummy_object(obj) {
    const roomno = game.u.ushops ? game.u.ushops.charCodeAt(0) : NO_ROOM;
    const shkp = shop_keeper(roomno);
    if (!shkp || !inhishop(shkp))
        return false;

    const eshk = shkp.eshk || ESHK(shkp);
    const original = obj.unpaid
        ? (eshk.bill_p || []).find(bp => bp.bo_id === obj.o_id)
        : null;
    const price = original?.price;
    const bquan = original?.bquan;
    if (obj.unpaid)
        subfrombill(obj, shkp);

    const dummy = {
        ...obj,
        oextra: null,
        o_id: next_ident(),
        timed: 0,
        lamplit: 0,
        owornmask: 0,
        where: OBJ_FREE,
        unpaid: 0,
        ocarry: null,
        ocontainer: null,
    };
    if (!add_one_tobill(dummy, true, shkp))
        return false;
    const billed = eshk.bill_p[eshk.bill_p.length - 1];
    if (original) {
        billed.price = price;
        billed.bquan = bquan;
    }
    billed.obj = dummy;
    dummy.where = OBJ_ONBILL;
    (game.billobjs ||= []).unshift(dummy);
    obj.no_charge = obj.where === OBJ_FLOOR || obj.where === OBJ_CONTAINED ? 1 : 0;
    obj.unpaid = 0;
    return true;
}

// src/shk.c:1187 obfree(), bill arm. A consumed unpaid object must remain
// available for the itemized bill even though it has left ordinary play.
// The non-billing lifecycle stays in invent.js, where useupall() calls it.
export function obfree_bill(obj) {
    let shkp = null;
    if (obj.unpaid) {
        shkp = (game.level?.monsters || []).find((mon) => {
            if (!mon.isshk)
                return false;
            const eshk = mon.eshk || ESHK(mon);
            return (eshk?.bill_p || []).some(bp => bp.bo_id === obj.o_id);
        }) || null;
    }
    if (!shkp && game.u.ushops)
        shkp = shop_keeper(game.u.ushops.charCodeAt(0));
    if (!shkp)
        return false;

    const eshk = shkp.eshk || ESHK(shkp);
    const bp = (eshk?.bill_p || []).find(entry => entry.bo_id === obj.o_id);
    if (!bp)
        return false;

    bp.useup = true;
    bp.obj = obj;
    obj.unpaid = 0;
    obj.where = OBJ_ONBILL;
    (game.billobjs ||= []).unshift(obj);
    return true;
}

// src/mkobj.c:752 costly_alteration(), COST_BITE, COST_OPEN, and COST_DSTROY.
// Altering shop stock replaces it with a private clone, so the used-up item
// can still be itemized.
export async function costly_alteration(obj, alter_type) {
    const verb = alter_type === COST_BITE ? 'bite'
               : alter_type === COST_OPEN ? 'open'
                 : alter_type === COST_DSTROY ? 'destroy' : null;
    const onFloor = obj.where === OBJ_FLOOR;
    const floorStock = onFloor && !obj.no_charge && costly_spot(obj.ox, obj.oy);
    if (!verb || (!obj.unpaid && !floorStock))
        return;

    const rooms = floorStock ? in_rooms(obj.ox, obj.oy, SHOPBASE)
                             : game.u.ushops;
    const roomno = rooms ? rooms.charCodeAt(0) : NO_ROOM;
    const shkp = shop_keeper(roomno);
    if (!shkp || !inhishop(shkp))
        return;
    const eshk = shkp.eshk || ESHK(shkp);
    const original = floorStock ? null
        : (eshk.bill_p || []).find(bp => bp.bo_id === obj.o_id);
    if (!floorStock && !original)
        return;

    const those = obj.quan === 1 ? 'that' : 'those';
    const them = obj.quan === 1 ? 'it' : 'them';
    if (floorStock) {
        await pline(`"You ${verb} ${those}, you pay for ${them}!"`);
    } else {
        await pline(`"You ${verb} ${those} ${simpleonames(obj)}, you pay for ${them}!"`);
    }

    let originalPrice = 0;
    let originalQuan = 0;
    if (!floorStock) {
        originalPrice = original.price;
        originalQuan = original.bquan;
        subfrombill(obj, shkp);
    }
    const dummy = {
        ...obj,
        oextra: null,
        o_id: next_ident(),
        timed: 0,
        lamplit: 0,
        owornmask: 0,
        where: OBJ_FREE,
        unpaid: 0,
        ocarry: null,
        ocontainer: null,
    };
    if (!add_one_tobill(dummy, true, shkp))
        return;
    const billed = eshk.bill_p[eshk.bill_p.length - 1];
    if (!floorStock) {
        billed.price = originalPrice;
        billed.bquan = originalQuan;
    }
    billed.obj = dummy;
    dummy.where = OBJ_ONBILL;
    (game.billobjs ||= []).unshift(dummy);
    obj.no_charge = floorStock ? 1 : 0;
    obj.unpaid = 0;
}

async function money2u(mon, amount) {
    const minvent = mon.minvent || [];
    const gold = minvent.find(obj => obj.oclass === OCLASSES.COIN_CLASS);
    if (!gold || amount <= 0 || gold.quan < amount)
        return 0;

    const paidGold = gold.quan > amount ? splitobj(gold, amount) : gold;
    if (paidGold === gold)
        minvent.splice(minvent.indexOf(gold), 1);
    paidGold.where = OBJ_FREE;
    paidGold.ocarry = null;
    await addinv(paidGold);
    (game.disp ||= {}).botl = true;
    return amount;
}

async function donate_gold(amount, shkp, selling) {
    const eshk = shkp.eshk || ESHK(shkp);
    if ((eshk.debit || 0) >= amount) {
        if (eshk.loan)
            eshk.loan = Math.max(0, eshk.loan - amount);
        eshk.debit -= amount;
        await pline(`Your debt is ${eshk.debit ? 'partially ' : ''}paid off.`);
        return;
    }

    const delta = amount - (eshk.debit || 0);
    eshk.credit = (eshk.credit || 0) + delta;
    if (eshk.debit) {
        eshk.debit = 0;
        eshk.loan = 0;
        await pline('Your debt is paid off.');
    }
    if (eshk.credit === delta) {
        await pline(`You have ${selling ? '' : 're-'}established ${delta} ${currency(delta)} credit.`);
    } else {
        await pline(`${delta} ${currency(delta)} added${selling ? '' : ' back'} to your credit; total is now ${eshk.credit} ${currency(eshk.credit)}.`);
    }
}

// src/shk.c sellobj(), ordinary objects, gold, and containers.
export async function sellobj(obj, x, y) {
    if (!(game.u.ushops || '').length)
        return;
    const rooms = in_rooms(x, y, SHOPBASE);
    const shkp = shop_keeper(rooms ? rooms.charCodeAt(0) : NO_ROOM);
    if (!shkp || !inhishop(shkp) || !costly_spot(x, y))
        return;

    const container = Has_contents(obj);
    if (obj.unpaid && !container
        && obj.oclass !== OCLASSES.COIN_CLASS) {
        sub_one_frombill(obj, shkp);
        return;
    }
    const eshk = shkp.eshk || ESHK(shkp);
    const isgold = obj.oclass === OCLASSES.COIN_CLASS;
    const containedGold = container ? contained_gold(obj, true) : 0;
    const saleitem = saleable(shkp, obj);
    const contents = container
        ? contained_sale_summary(obj, shkp)
        : { cost: 0, shopCount: 0, heroCount: 0 };
    const containerOffer = !isgold && !obj.unpaid && saleitem
        ? set_cost(obj, shkp) : 0;
    let offer = containerOffer + contents.cost;

    if (!shkp.mpeaceful) {
        await pline('"Thank you, scum!"');
        subfrombill(obj, shkp);
        return;
    }

    if (!(isgold || containedGold)
        && (!offer || game.sell_how === SELL_DONTSELL)) {
        if (container)
            dropped_container(obj, shkp, false);
        if (!obj.unpaid)
            obj.no_charge = 1;
        subfrombill(obj, shkp);
        if (game.sell_how !== SELL_DONTSELL)
            await pline(`${shopkeeper_name(shkp)} seems uninterested.`);
        return;
    }

    if (isgold || containedGold) {
        await donate_gold(containedGold || obj.quan, shkp, true);
        if (!offer || game.sell_how === SELL_DONTSELL) {
            if (!isgold) {
                dropped_container(obj, shkp, false);
                if (!obj.unpaid)
                    obj.no_charge = 1;
                subfrombill(obj, shkp);
            }
            return;
        }
    }

    const shkmoney = money_cnt(shkp.minvent || []);
    if (!shkmoney) {
        const creditOffer = Math.trunc(offer * 9 / 10) + (offer <= 1 ? 1 : 0);
        let answer = game.sell_response;
        if (game.sell_how === SELL_NORMAL || game.auto_credit) {
            answer = game.sell_response = 'y';
        } else if (answer !== 'n') {
            await pline(`${shopkeeper_name(shkp)} cannot pay you at present.`);
            answer = await tty_yn_function(
                `Will you accept ${creditOffer} ${currency(creditOffer)} in credit for ${doname(obj)}?`,
                'ynaq', 'y');
            if (answer === 'a') {
                answer = 'y';
                game.auto_credit = true;
            }
        }
        if (answer === 'y') {
            delete game._encumber_status_stale;
            if (container)
                dropped_container(obj, shkp, true);
            const tradedName = container
                ? `the contents of ${obj.no_charge
                    ? an(xname(obj)) : `your ${xname(obj)}`}`
                : doname(obj);
            await pline(`You traded ${tradedName} for ${creditOffer} zorkmid${creditOffer === 1 ? '' : 's'} in ${eshk.credit ? 'additional ' : ''}credit.`);
            eshk.credit = (eshk.credit || 0) + creditOffer;
            subfrombill(obj, shkp);
        } else {
            if (answer === 'q')
                game.sell_response = 'n';
            if (container)
                dropped_container(obj, shkp, false);
            if (!obj.unpaid)
                obj.no_charge = 1;
            subfrombill(obj, shkp);
        }
        return;
    }

    const shortFunds = offer > shkmoney;
    if (shortFunds)
        offer = shkmoney;
    record_price_quote(obj.otyp, Math.trunc(offer / (obj.quan || 1)), false);

    let answer = game.sell_response;
    if (!answer) {
        let one = (obj.quan || 1) === 1;
        let owner = 'your ';
        let contentsPrefix = '';
        let contentsSuffix = '';
        if (container) {
            owner = obj.unpaid ? 'the ' : 'your ';
            if (contents.cost && !containerOffer) {
                contentsPrefix = contents.heroCount === 1
                    ? 'your item in ' : 'your items in ';
            } else if (contents.cost && containerOffer) {
                const partiallyOwned = contents.shopCount
                    && contents.heroCount;
                contentsSuffix = partiallyOwned
                    ? (contents.heroCount === 1
                        ? ' and item inside' : ' and items inside')
                    : ' and its contents';
            }
            one = !containerOffer
                ? contents.heroCount === 1
                : (obj.quan || 1) === 1 && !contents.cost;
        }
        answer = await tty_yn_function(
            `${shopkeeper_name(shkp)} offers${shortFunds ? ' only' : ''} ${offer} gold piece${offer === 1 ? '' : 's'} for ${contentsPrefix}${owner}${xname(obj)}${contentsSuffix}.  Sell ${one ? 'it' : 'them'}?`,
            'ynaq', 'n');
    }
    if (answer === 'q') {
        game.sell_response = 'n';
        answer = 'n';
    } else if (answer === 'a') {
        game.sell_response = 'y';
        answer = 'y';
    }
    delete game._encumber_status_stale;

    if (answer !== 'y') {
        if (container)
            dropped_container(obj, shkp, false);
        if (!obj.unpaid)
            obj.no_charge = 1;
        subfrombill(obj, shkp);
        return;
    }

    if (container)
        dropped_container(obj, shkp, true);
    if (!obj.unpaid && !saleitem)
        obj.no_charge = 1;
    subfrombill(obj, shkp);
    await money2u(shkp, offer);
    const soldName = container
        ? `the contents of ${obj.no_charge
            ? an(xname(obj)) : `your ${xname(obj)}`}`
        : doname(obj);
    await pline(`You sold ${soldName} for ${offer} gold piece${offer === 1 ? '' : 's'}.`);
}

// src/shk.c menu_pick_pay_items() selects intact and used-up bill entries.
async function menu_pick_pay_items(items) {
    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    const amtWidth = String(Math.max(...items.map(it => it.cost))).length;

    if (items[0].usedup) {
        const usedCount = items.filter(it => it.usedup).length;
        tty_add_menu(win, null, 0, 0, 0, ATR_INVERSE, NO_COLOR,
                     `Used up item${usedCount > 1 ? 's' : ''}:`,
                     MENU_ITEMFLAGS_NONE);
    }

    for (let i = 0; i < items.length; ++i) {
        if (i > 0 && items[i - 1].usedup && !items[i].usedup) {
            const intactCount = items.slice(i).filter(it => !it.usedup).length;
            tty_add_menu(win, null, 0, 0, 0, ATR_INVERSE, NO_COLOR,
                         `Unpaid item${intactCount > 1 ? 's' : ''}:`,
                         MENU_ITEMFLAGS_NONE);
        }
        const amount = String(items[i].cost).padStart(amtWidth, ' ');
        tty_add_menu(win, null, i + 1, 0, 0, ATR_NONE, NO_COLOR,
                     `${amount} Zm, ${paydoname(items[i].obj)}`,
                     MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(win, 'Pay for which items?');
    const picks = await tty_select_menu(win, PICK_ANY);
    tty_destroy_nhwindow(win);
    return new Set(picks.map(id => id - 1));
}

// src/shk.c money2mon() -- transfer a simple gold payment to a monster.
async function money2mon(mon, amount) {
    const gold = (game.invent || [])
        .find(obj => obj.oclass === OCLASSES.COIN_CLASS);
    if (!gold || amount <= 0 || gold.quan < amount)
        return 0;

    const paidGold = gold.quan > amount ? splitobj(gold, amount) : gold;
    freeinv(paidGold);
    paidGold.where = OBJ_FREE;
    const { mpickobj } = await import('./steal.js');
    mpickobj(mon, paidGold);
    (game.disp ||= {}).botl = true;
    return amount;
}

async function pay_item(shkp, item) {
    const eshk = shkp.eshk || ESHK(shkp);
    if (money_cnt(game.invent) + (eshk.credit || 0) < item.cost) {
        await pline(`You don't have gold${eshk.credit ? ' or credit' : ''}`
                    + ` enough to pay for ${paydoname(item.obj)}.`);
        return false;
    }

    const paymentEntries = item.container
        ? [
            ...item.entries.filter(entry => entry.obj !== item.obj),
            ...item.entries.filter(entry => entry.obj === item.obj),
        ]
        : [item];
    for (const entry of paymentEntries) {
        const entryCost = item.container
            ? entry.bp.price * entry.obj.quan : item.cost;
        let balance = entryCost;
        if (eshk.credit) {
            const credit = Math.min(eshk.credit, balance);
            eshk.credit -= credit;
            balance -= credit;
            await pline(credit === entryCost
                ? 'The price is deducted from your credit.'
                : 'The price is partially covered by your credit.');
        }
        if (balance && !(await money2mon(shkp, balance)))
            return false;
    }

    const boughtName = item.container
        ? item.obj.unpaid
            ? `${an(xname(item.obj))} and its contents`
            : `the contents of your ${xname(item.obj)}`
        : paydoname(item.obj);
    await pline(item.usedup
        ? `You paid for ${boughtName} at a cost of ${item.cost} gold piece`
          + `${item.cost === 1 ? '' : 's'}.`
        : `You bought ${boughtName} for ${item.cost} gold piece`
          + `${item.cost === 1 ? '' : 's'}.`);

    item.obj.unpaid = 0;
    if (item.usedup) {
        const billobj = (game.billobjs || []).indexOf(item.obj);
        if (billobj >= 0)
            game.billobjs.splice(billobj, 1);
    }
    const paidEntries = item.container ? item.entries : [item];
    const paidBills = new Set(paidEntries.map(entry => entry.bp));
    for (const entry of paidEntries)
        entry.obj.unpaid = 0;
    eshk.bill_p = (eshk.bill_p || []).filter(bp => !paidBills.has(bp));
    eshk.billct = eshk.bill_p.length;
    await bot();
    return true;
}

async function pay_shk(amount, shkp) {
    const eshk = shkp.eshk || ESHK(shkp);
    const robbed = eshk.robbed || 0;
    let balance = amount;

    if (eshk.credit) {
        if (eshk.credit >= balance) {
            await pline('The price is deducted from your credit.');
            eshk.credit -= balance;
            balance = 0;
        } else {
            await pline('The price is partially covered by your credit.');
            balance -= eshk.credit;
            eshk.credit = 0;
        }
    }
    if (balance > 0)
        await money2mon(shkp, balance);
    if (robbed)
        eshk.robbed = Math.max(0, robbed - amount);
    (game.disp ||= {}).botl = true;
}

function rile_shk(shkp) {
    const eshk = shkp.eshk || ESHK(shkp);
    shkp.mpeaceful = 0;
    if (!eshk.surcharge) {
        eshk.surcharge = true;
        for (const bp of eshk.bill_p || [])
            bp.price += Math.trunc((bp.price + 2) / 3);
    }
}

function live_shopkeepers() {
    const keepers = [];
    for (const mon of game.level?.monsters || []) {
        if (!mon.isshk || DEADMONSTER(mon))
            continue;
        if (!mon.mpeaceful && !(mon.eshk || ESHK(mon)).surcharge)
            rile_shk(mon);
        keepers.push(mon);
    }
    return keepers;
}

function shk_pronouns(shkp) {
    return shkp.female
        ? { he: 'she', him: 'her', his: 'her' }
        : { he: 'he', him: 'him', his: 'his' };
}

async function kops_gone(silent) {
    const kopTypes = new Set([
        PMNAMES.PM_KEYSTONE_KOP, PMNAMES.PM_KOP_SERGEANT,
        PMNAMES.PM_KOP_LIEUTENANT, PMNAMES.PM_KOP_KAPTAIN,
    ]);
    const kops = (game.level?.monsters || [])
        .filter(mon => !DEADMONSTER(mon) && kopTypes.has(mon.mnum));
    let seen = 0;
    const { mongone } = await import('./mon.js');
    for (const kop of kops) {
        if (canspotmon(kop))
            ++seen;
        mongone(kop);
    }
    if (seen && !silent) {
        await pline(seen === 1
            ? 'The Kop (disappointed) vanishes into thin air.'
            : 'The Kops (disappointed) vanish into thin air.');
    }
}

async function make_happy_shoppers(silentkops) {
    if (live_shopkeepers().some(shkp => !shkp.mpeaceful))
        return;
    await kops_gone(silentkops);
    for (const mon of game.level?.monsters || []) {
        if (mon.mnum === PMNAMES.PM_WATCHMAN
            || mon.mnum === PMNAMES.PM_WATCH_CAPTAIN)
            mon.mpeaceful = 1;
    }
}

export async function make_happy_shk(shkp, silentkops) {
    const eshk = shkp.eshk || ESHK(shkp);
    const wasmad = !shkp.mpeaceful;
    shkp.mpeaceful = 1;
    eshk.following = 0;
    eshk.robbed = 0;
    if (game.urole?.mnum !== PMNAMES.PM_ROGUE)
        adjalign(Math.sign(game.u.ualign?.type || 0));

    if (!inhishop(shkp)) {
        const name = shopkeeper_name(shkp);
        const pronouns = shk_pronouns(shkp);
        let vanished = canseemon(shkp);
        const local = eshk.shoplevel
            && eshk.shoplevel.dnum === game.u.uz.dnum
            && eshk.shoplevel.dlevel === game.u.uz.dlevel;
        if (local) {
            await home_shk(shkp);
            if (canspotmon(shkp)) {
                await pline(`${shopkeeper_name(shkp)} returns to ${pronouns.his} shop.`);
                vanished = false;
            }
        } else {
            if (sensemon(shkp))
                vanished = true;
            const { mdrop_special_objs } = await import('./steal.js');
            const { migrate_monster } = await import('./trap.js');
            mdrop_special_objs(shkp);
            const oldx = shkp.mx, oldy = shkp.my;
            migrate_monster(shkp, eshk.shoplevel || game.u.uz,
                            MIGR_APPROX_XY, eshk.shd);
            newsym(oldx, oldy);
            eshk.dismiss_kops = true;
        }
        if (vanished)
            await pline(`Satisfied, ${name} suddenly disappears!`);
    } else if (wasmad) {
        await pline(`${shopkeeper_name(shkp)} calms down.`);
    }
    await make_happy_shoppers(silentkops);
}

// src/shk.c dopay() -- nearby keepers take priority over the room resident.
export async function dopay() {
    game.multi = 0;
    const roomno = game.u.ushops ? game.u.ushops.charCodeAt(0) : NO_ROOM;
    const keepers = live_shopkeepers();
    let adjacent = null, nexttosk = 0, seen = 0;
    let resident = null;
    for (const keeper of keepers) {
        if (distu(keeper.mx, keeper.my) <= 2) {
            if (adjacent && !adjacent.mpeaceful)
                continue;
            ++nexttosk;
            adjacent = keeper;
        }
        if (canspotmon(keeper))
            ++seen;
        const keeperEshk = keeper.eshk || ESHK(keeper);
        if (inhishop(keeper) && roomno === keeperEshk.shoproom)
            resident = keeper;
    }

    let shkp = adjacent && nexttosk === 1 ? adjacent : null;
    if (!shkp && (!keepers.length || (!Blind() && !seen))) {
        await pline('There appears to be no shopkeeper here to receive your payment.');
        return ECMD_OK;
    }
    if (!shkp && !seen) {
        await pline("You can't see...");
        return ECMD_OK;
    }
    if (!shkp && keepers.length === 1 && resident) {
        shkp = resident;
    } else if (!shkp && seen === 1) {
        shkp = keepers.find(keeper => canspotmon(keeper));
        if (shkp !== resident && distu(shkp.mx, shkp.my) > 2) {
            await pline(`${shopkeeper_name(shkp)} is not near enough to receive your payment.`);
            return ECMD_OK;
        }
    }
    if (!shkp) {
        note_unported_shk('dopay:select-among-shopkeepers');
        return ECMD_OK;
    }

    const eshk = shkp.eshk || ESHK(shkp);
    const stashedGold = hidden_gold(game.invent || [], true) > 0;
    if (eshk.robbed || eshk.billct || eshk.debit) {
        shkp.msleeping = 0;
        shkp.mfrozen = 0;
        shkp.mcanmove = 1;
    }
    if (helpless(shkp)) {
        await pline(`${shopkeeper_name(shkp)} ${rn2(2)
            ? 'seems to be napping' : "doesn't respond"}.`);
        return ECMD_OK;
    }

    const pronouns = shk_pronouns(shkp);
    if (shkp !== resident && shkp.mpeaceful) {
        const cash = money_cnt(game.invent);
        const robbed = eshk.robbed || 0;
        if (!robbed) {
            await pline(`You do not owe ${shopkeeper_name(shkp)} anything.`);
        } else if (!cash) {
            await pline(`You ${stashedGold ? 'seem to ' : ''}have no gold.`);
            if (stashedGold)
                await pline('But you have some gold stashed away.');
        } else {
            if (cash > robbed) {
                await pline(`You give ${shopkeeper_name(shkp)} the ${robbed} gold piece${
                    robbed === 1 ? '' : 's'} ${pronouns.he} asked for.`);
                await pay_shk(robbed, shkp);
            } else {
                await pline(`You give ${shopkeeper_name(shkp)} all your${
                    stashedGold ? ' openly kept' : ''} gold.`);
                await pay_shk(cash, shkp);
                if (stashedGold)
                    await pline('But you have hidden gold!');
            }
            if (cash < robbed / 2 || (cash < robbed && stashedGold)) {
                await pline(`Unfortunately, ${pronouns.he} doesn't look satisfied.`);
            } else {
                await make_happy_shk(shkp, false);
            }
        }
        return ECMD_TIME;
    }

    if (!eshk.billct && !eshk.debit) {
        const cash = money_cnt(game.invent);
        const robbed = eshk.robbed || 0;
        if (!robbed && shkp.mpeaceful) {
            await pline(`You do not owe ${shopkeeper_name(shkp)} anything.`);
            if (!cash)
                await pline(`Moreover, you${stashedGold ? ' seem to' : ''} have no gold.`);
        } else if (robbed) {
            await pline(`${shopkeeper_name(shkp)} is after blood, not gold!`);
            if (cash < robbed / 2 || (cash < robbed && stashedGold)) {
                if (!cash) {
                    await pline(`Moreover, you${stashedGold ? ' seem to' : ''} have no gold.`);
                } else {
                    await pline(`Besides, you don't have enough to interest ${pronouns.him}.`);
                }
                return ECMD_TIME;
            }
            await pline(`But since ${pronouns.his} shop has been robbed recently,`);
            await pline(`you ${cash < robbed ? 'partially ' : ''}compensate ${
                shopkeeper_name(shkp)} for ${pronouns.his} losses.`);
            await pay_shk(Math.min(cash, robbed), shkp);
            await make_happy_shk(shkp, false);
        } else {
            note_unported_shk('dopay:appease-angry-unrobbed');
            return ECMD_OK;
        }
        return ECMD_TIME;
    }

    let paid = false;
    if (eshk.debit) {
        const debt = eshk.debit;
        const loan = eshk.loan || 0;
        const debtReason = loan
            ? loan === debt
                ? 'you picked up in the store.'
                : 'for gold picked up and the use of merchandise.'
            : 'for the use of merchandise.';
        await pline(`You owe ${shopkeeper_name(shkp)} ${debt} ${currency(debt)} `
                    + debtReason);

        const cash = money_cnt(game.invent);
        if (cash + (eshk.credit || 0) < debt) {
            await pline(`But you don't${stashedGold ? ' seem to' : ''}`
                        + ` have enough gold${eshk.credit ? ' or credit' : ''}.`);
            return ECMD_TIME;
        }

        if ((eshk.credit || 0) >= debt) {
            eshk.credit -= debt;
            await pline('Your debt is covered by your credit.');
        } else if (!eshk.credit) {
            await money2mon(shkp, debt);
            await pline('You pay that debt.');
            await bot();
        } else {
            const remainder = debt - eshk.credit;
            eshk.credit = 0;
            await money2mon(shkp, remainder);
            await pline('That debt is partially offset by your credit.');
            await pline('You pay the remainder.');
            await bot();
        }
        eshk.debit = 0;
        eshk.loan = 0;
        paid = true;
    }

    const items = itemized_bill(eshk);
    if (items.length) {
        if (!money_cnt(game.invent) && !(eshk.credit || 0)) {
            await pline(`You ${stashedGold ? 'seem to ' : ''}have no gold or credit`
                        + `${paid ? ' left' : ''}.`);
        } else if (money_cnt(game.invent) + (eshk.credit || 0)
                   < Math.min(...items.map(it => it.cost))) {
            await pline(`You don't have enough gold to buy`
                        + `${items.length > 1 ? ' any of' : ''} the item`
                        + `${items.length > 1 ? "s you've picked" : ' on your bill'}.`);
        } else {
            const selected = await menu_pick_pay_items(items);
            for (let i = 0; i < items.length; ++i) {
                if (selected.has(i) && await pay_item(shkp, items[i]))
                    paid = true;
            }
        }
    }

    if (paid && shkp.mpeaceful) {
        const shopName = shtypes[(eshk.shoptype || SHOPBASE) - SHOPBASE]?.name
            || 'shop';
        if (!Deaf() && !muteshk(shkp)) {
            await pline(`"Thank you for shopping in `
                        + `${s_suffix(shopkeeper_name(shkp))} ${shopName}`
                        + `${eshk.surcharge ? '.' : '!'}"`);
        } else {
            await pline(`${shopkeeper_name(shkp)} nods`
                        + `${eshk.surcharge ? '' : ' appreciatively'} at you`
                        + ` for shopping in the ${shopName}`
                        + `${eshk.surcharge ? '.' : '!'}`);
        }
    }
    game.iflags.menu_requested = false;
    return paid ? ECMD_TIME : ECMD_OK;
}

// src/shk.c:5791 block_door(). A shopkeeper on the usual post blocks a
// diagonal exit through the shop door while the customer still owes money.
export async function block_door(x, y) {
    const rooms = in_rooms(x, y, SHOPBASE);
    if (!rooms.length)
        return false;
    const roomno = rooms.charCodeAt(0);
    if (roomno < 0 || !IS_SHOP(roomno))
        return false;
    if (!IS_DOOR(game.level.at(x, y).typ))
        return false;
    if (roomno !== (game.u.ushops?.charCodeAt?.(0) ?? -1))
        return false;

    const shkp = shop_keeper(roomno);
    if (!shkp || !inhishop(shkp))
        return false;

    const eshk = shkp.eshk || ESHK(shkp);
    if (shkp.mx === eshk.shk.x && shkp.my === eshk.shk.y
        && eshk.shd.x === x && eshk.shd.y === y
        && !helpless(shkp)
        && (eshk.debit || eshk.billct || eshk.robbed)) {
        await pline(`${shopkeeper_name(shkp)}${Invis()
            ? ' senses your motion and' : ''} blocks your way!`);
        return true;
    }
    return false;
}

// src/shk.c:5826 block_entry() — an angry shopkeeper blocks diagonal entry
// through a broken shop door. Same porting state as block_door() above.
export function block_entry(x, y) {
    const ust = game.level.at(game.u.ux, game.u.uy);
    if (!(IS_DOOR(ust.typ) && ust.doormask === 4 /* D_BROKEN */))
        return false;

    const rooms = in_rooms(x, y, SHOPBASE);
    if (!rooms.length)
        return false;
    const roomno = rooms.charCodeAt(0);
    if (roomno < 0 || !IS_SHOP(roomno))
        return false;

    note_unported_shk('block_entry:shk_on_post');
    return false;
}

// src/monmove.c:189 (shared predicate lives with the C's users): is the
// shopkeeper inside his own shop? js/monmove.js holds the test.
export { inhishop };

// src/shk.c:4399 add_damage()
export function add_damage(x, y, cost) {
    const lev = game.level?.at(x, y);
    if (!lev)
        return;

    if (IS_DOOR(lev.typ)) {
        let realEntrance = false;
        for (const room of in_rooms(x, y, SHOPBASE)) {
            const shkp = shop_keeper(room.charCodeAt(0));
            const shd = shkp ? (shkp.eshk || ESHK(shkp))?.shd : null;
            if (shd && shd.x === x && shd.y === y) {
                realEntrance = true;
                break;
            }
        }
        if (!realEntrance)
            return;
    }

    const damage = game.level.damagelist ||= [];
    const old = damage.find(dam => dam.x === x && dam.y === y);
    if (old) {
        old.cost += cost;
        old.when = game.moves;
        return;
    }

    damage.unshift({
        when: game.moves,
        x,
        y,
        cost,
        typ: lev.typ,
        flags: lev.flags,
        wall_info: lev.wall_info,
        doormask: lev.doormask,
    });
    if (cansee(x, y))
        lev.seenv = SVALL;
}

function cad(altusage) {
    const gender = is_demon(game.youmonst?.data) ? 3 : poly_gender();
    const address = ['cad', 'minx', 'beast', 'fiend'][gender] || 'thing';
    if (!altusage)
        return address;
    return `"${address[0].toUpperCase()}${address.slice(1)}!  `;
}

async function getcad(shkp, dmgstr, x, y, uinshp, animal, pursue) {
    const dugwall = dmgstr === 'dig into' || dmgstr === 'damage';
    const target = dugwall ? 'shop' : 'door';

    if (muteshk(shkp)) {
        if (animal && !helpless(shkp))
            note_unported_shk('getcad:yelp');
    } else if (pursue || uinshp
               || distmin(game.u.ux, game.u.uy, x, y) <= 1) {
        if (!Deaf()) {
            await pline(`"How dare you ${dmgstr} my ${target}?"`);
        } else {
            note_unported_shk('getcad:deaf_angrytext');
            await pline(`${shopkeeper_name(shkp)} is furious that you decided to ${
                dmgstr} ${shk_pronouns(shkp).his} ${target}!`);
        }
    } else if (!Deaf()) {
        await pline(`${shopkeeper_name(shkp)} shouts:`);
        await pline(`"Who dared ${dmgstr} my ${target}?"`);
    } else {
        note_unported_shk('getcad:deaf_angrytext');
        await pline(`${shopkeeper_name(shkp)} is furious that someone decided to ${
            dmgstr} ${shk_pronouns(shkp).his} ${target}!`);
    }
    hot_pursuit(shkp);
}

async function home_shk(shkp) {
    const eshk = shkp.eshk || ESHK(shkp);
    const { mnearto } = await import('./mon.js');
    await mnearto(shkp, eshk.shk.x, eshk.shk.y, true, RLOC_NOMSG);
    game.level.flags.has_shop = 1;
    after_shk_move(shkp);
}

// src/shk.c:5174 pay_for_damage()
export async function pay_for_damage(dmgstr, cant_mollify = false) {
    let shkp = null;
    let appearHere = null;
    let cost = 0;
    let nearestShk = Number.MAX_SAFE_INTEGER;
    let nearestDamage = Number.MAX_SAFE_INTEGER;
    let picks = 0;

    for (const dam of game.level?.damagelist || []) {
        if (dam.when !== game.moves || !dam.cost)
            continue;
        cost += dam.cost;
        for (const room of in_rooms(dam.x, dam.y, SHOPBASE)) {
            const candidate = shop_keeper(room.charCodeAt(0));
            if (!candidate)
                continue;
            if (candidate === shkp) {
                const damageDistance = distu(dam.x, dam.y);
                if (damageDistance < nearestDamage) {
                    nearestDamage = damageDistance;
                    appearHere = dam;
                }
                continue;
            }
            if (!inhishop(candidate))
                continue;
            const distance = mdistu(candidate);
            if (distance > nearestShk)
                continue;
            if (distance === nearestShk && picks) {
                if (rn2(++picks))
                    continue;
            } else {
                picks = 1;
            }
            shkp = candidate;
            nearestShk = distance;
            appearHere = dam;
            nearestDamage = distu(dam.x, dam.y);
        }
    }

    if (!cost || !shkp || !appearHere)
        return;

    const eshk = shkp.eshk || ESHK(shkp);
    const uinshp = !!(game.u.ushops || '').length;
    const animal = (shkp.data?.msound ?? 0) <= MSOUND.MS_ANIMAL;
    const { x, y } = appearHere;
    eshk.customer = game.plname || '';

    if (!shkp.mpeaceful || eshk.following) {
        hot_pursuit(shkp);
        return;
    }

    if (!in_rooms(shkp.mx, shkp.my, SHOPBASE)) {
        if (cansee(shkp.mx, shkp.my))
            await getcad(shkp, dmgstr, x, y, uinshp, animal, true);
        return;
    }

    let pursue = false;
    if (uinshp) {
        const distance = distmin(game.u.ux, game.u.uy, shkp.mx, shkp.my);
        if (distance > 1 && distance <= 3) {
            await pline(`${shopkeeper_name(shkp)} leaps towards you!`);
            const { mnexto } = await import('./mon.js');
            mnexto(shkp, RLOC_NOMSG);
        }
        pursue = distmin(game.u.ux, game.u.uy, shkp.mx, shkp.my) > 1;
        if (pursue) {
            await getcad(shkp, dmgstr, x, y, uinshp, animal, pursue);
            return;
        }
    } else {
        note_unported_shk('pay_for_damage:outside_shop_appearance');
    }

    if ((!uinshp && distmin(game.u.ux, game.u.uy, x, y) > 1)
        || cant_mollify
        || money_cnt(game.invent || []) + (eshk.credit || 0) < cost
        || !rn2(50)) {
        await getcad(shkp, dmgstr, x, y, uinshp, animal, pursue);
        return;
    }

    if (Invis())
        await pline(`Your invisibility does not fool ${shopkeeper_name(shkp)}!`);
    const answer = await tty_yn_function(
        `${animal ? '' : cad(true)}You did ${cost} ${currency(cost)} worth of damage!${
            animal ? '' : '"'}  Pay?`,
        'yn', 'n');
    if (answer !== 'n') {
        const wasSeen = canseemon(shkp);
        const wasOutside = !inhishop(shkp);
        const sx = shkp.mx, sy = shkp.my;
        let balance = cost;
        if (eshk.credit) {
            if (eshk.credit >= balance) {
                await pline('The price is deducted from your credit.');
                eshk.credit -= balance;
                balance = 0;
            } else {
                await pline('The price is partially covered by your credit.');
                balance -= eshk.credit;
                eshk.credit = 0;
            }
        }
        if (balance > 0)
            await money2mon(shkp, balance);
        (game.disp ||= {}).botl = true;
        await pline(`Mollified, ${shopkeeper_name(shkp)} accepts your restitution.`);
        await home_shk(shkp);
        shkp.mpeaceful = 1;
        if (shkp.mx !== sx || shkp.my !== sy) {
            const isSeen = canseemon(shkp);
            if (wasOutside && canspotmon(shkp)) {
                await pline(`${shopkeeper_name(shkp)} returns to ${
                    shk_pronouns(shkp).his} shop.`);
            } else if (isSeen || wasSeen) {
                await pline(`${shopkeeper_name(shkp)} ${!wasSeen
                    ? 'appears' : isSeen ? 'shifts location' : 'disappears'}.`);
            }
        }
    } else {
        if (!animal && !Deaf() && !muteshk(shkp))
            await pline('"Oh, yes!  You\'ll pay!"');
        else if (animal)
            note_unported_shk('pay_for_damage:growl');
        hot_pursuit(shkp);
        adjalign(-Math.sign(game.u.ualign?.type || 0));
    }
}

function shk_impaired(shkp) {
    return !shkp || !shkp.isshk || !inhishop(shkp)
        || helpless(shkp) || !!(shkp.eshk || ESHK(shkp))?.following;
}

function repairable_damage(dam, shkp) {
    if (!dam || shk_impaired(shkp)
        || game.moves - dam.when < REPAIR_DELAY)
        return false;

    const { x, y } = dam;
    if (!IS_ROOM(dam.typ)) {
        const mon = m_at(x, y);
        if ((u_at(x, y) && !game.u.uprops?.PASSES_WALLS)
            || (x === shkp.mx && y === shkp.my)
            || (mon && !passes_walls(mon.data)))
            return false;
    }

    const trap = t_at(x, y);
    if (trap && (u_at(x, y) || m_at(x, y)?.mtrapped))
        return false;

    const room = String.fromCharCode((shkp.eshk || ESHK(shkp)).shoproom);
    return in_rooms(x, y, SHOPBASE).includes(room);
}

function find_damage(shkp) {
    if (shk_impaired(shkp))
        return null;
    return (game.level?.damagelist || [])
        .find(dam => repairable_damage(dam, shkp)) || null;
}

async function repair_damage(shkp, dam, catchup = false) {
    if (!repairable_damage(dam, shkp))
        return 0;

    const { x, y } = dam;
    const lev = game.level.at(x, y);
    const trap = t_at(x, y);
    if (trap) {
        note_unported_shk('repair_damage:trap');
        return 0;
    }

    if (IS_ROOM(dam.typ)
        || (dam.typ === lev.typ
            && (!IS_DOOR(dam.typ) || lev.doormask > D_BROKEN)))
        return 1;

    const litter = (game.level.objects || [])
        .some(obj => obj.ox === x && obj.oy === y);
    if (litter) {
        note_unported_shk('repair_damage:litter_scatter');
        return 0;
    }

    const seeit = cansee(x, y);
    lev.typ = dam.typ;
    if (IS_DOOR(dam.typ)) {
        lev.doormask = D_CLOSED;
    } else {
        lev.flags = dam.flags;
        lev.wall_info = dam.wall_info;
    }
    del_engr_at(x, y);

    if (seeit)
        newsym(x, y);
    block_point(x, y);

    if (catchup)
        return 1;

    if (seeit) {
        if (IS_WALL(dam.typ)) {
            lev.seenv = SVALL;
            await pline('Suddenly, a section of the wall closes up!');
        } else if (IS_DOOR(dam.typ)) {
            await pline('Suddenly, the shop door reappears!');
        }
        newsym(x, y);
    } else if (IS_WALL(dam.typ)) {
        const eshk = shkp.eshk || ESHK(shkp);
        if (inside_shop(game.u.ux, game.u.uy) === eshk.shoproom)
            await You_feel('more claustrophobic than before.');
        else if (!Deaf() && !rn2(10))
            await pline('The dungeon acoustics noticeably change.');
    }
    return 2;
}

// src/shk.c:4556 shk_fixes_damage()
async function shk_fixes_damage(shkp) {
    const dam = find_damage(shkp);
    if (!dam)
        return;

    const closeby = mdistu(shkp) <= (BOLT_LIM / 2) ** 2;
    if (canseemon(shkp)) {
        await pline(`${shopkeeper_name(shkp)} whispers ${
            closeby ? 'an incantation' : 'something'}.`);
    } else if (!Deaf() && closeby) {
        await You_hear('someone muttering an incantation.');
    }

    const disposition = await repair_damage(shkp, dam, false);
    if (!disposition)
        return;
    const damage = game.level.damagelist || [];
    const index = damage.indexOf(dam);
    if (index >= 0)
        damage.splice(index, 1);
}

// src/dig.c:597 holetime() — countdown until the hero's dig breaks
// through, or -1 when the hero isn't digging in a shop. The digging
// occupation is not ported, so the occupation test is by its label.
function holetime() {
    if (game.occtxt !== 'digging' || !(game.u.ushops || '').length)
        return -1;
    return Math.trunc((250 - (game.context?.digging?.effort ?? 0)) / 20);
}

// src/shk.c:4880 shk_move() — the shopkeeper's turn. Return values match
// C: -2 died, -1 "let m_move handle it", 0 stayed, 1 moved.
export async function shk_move(shkp) {
    let uondoor = false, avoid = false, badinv;

    const u = game.u;
    const eshkp = shkp.eshk;   /* extras live directly on the monster */
    const omx = shkp.mx;
    const omy = shkp.my;

    if (inhishop(shkp))
        await shk_fixes_damage(shkp);

    const udist = distu(omx, omy);
    if (udist < 3 /* grid bug shk: PM_GRID_BUG can't be a shk */) {
        if (!shkp.mpeaceful /* ANGRY(shkp); Conflict unreached */) {
            const { mattacku } = await import('./mhitu.js');
            await mattacku(shkp);
            return 0;
        }
        if (eshkp.following) {
            if ((eshkp.customer || '') !== (game.plname || '')) {
                if (!Deaf() && !muteshk(shkp)) {
                    await pline(`"${Hello(shkp)}, ${game.plname}!  I was looking for ${
                        eshkp.customer}."`);
                }
                eshkp.following = 0;
                return 0;
            }
            if ((game.moves || 0) > (game.followmsg || 0) + 4) {
                if (!Deaf() && !muteshk(shkp)) {
                    await pline(`"${Hello(shkp)}, ${game.plname}!  Didn't you forget to pay?"`);
                } else {
                    const his = genders[pronoun_gender(
                        shkp, PRONOUN_NO_IT | PRONOUN_HALLU)].his;
                    await pline(`${shopkeeper_name(shkp)} holds out ${his} upturned ${
                        mbodypart(shkp, HAND)}.`);
                }
                game.followmsg = game.moves || 0;
                if (!rn2(9)) {
                    await pline(`${shopkeeper_name(shkp)} doesn't like customers who don't pay.`);
                    rile_shk(shkp);
                }
            }
            if (udist < 2)
                return 0;
        }
    }

    let appr = 1;
    let gtx = eshkp.shk.x;
    let gty = eshkp.shk.y;
    const satdoor = (gtx === omx && gty === omy);
    let z;
    if (eshkp.following || ((z = holetime()) >= 0 && z * z <= udist)) {
        if (udist > 4 && eshkp.following && !eshkp.billct)
            return -1; /* leave it to m_move */
        gtx = u.ux;
        gty = u.uy;
    } else if (!shkp.mpeaceful) {
        /* Move towards the hero if the shopkeeper can see him. */
        if ((shkp.mcansee ?? 1) && m_canseeu(shkp)) {
            gtx = u.ux;
            gty = u.uy;
        }
        avoid = false;
    } else {
        const GDIST = (x, y) => dist2(x, y, gtx, gty);
        if (Invis() || u.usteed) {
            avoid = false;
        } else {
            uondoor = (u.ux === eshkp.shd.x && u.uy === eshkp.shd.y);
            if (uondoor) {
                badinv = (carrying(ONAMES.PICK_AXE)
                          || carrying(ONAMES.DWARVISH_MATTOCK)
                          || (Fast() && (sobj_at(ONAMES.PICK_AXE, u.ux, u.uy)
                                         || sobj_at(ONAMES.DWARVISH_MATTOCK,
                                                    u.ux, u.uy))));
                if (satdoor && badinv)
                    return 0;
                avoid = !badinv;
            } else {
                avoid = ((u.ushops || '').length > 0 && distu(gtx, gty) > 8);
                badinv = false;
            }

            if ((((eshkp.robbed | 0) === 0 && !eshkp.billct && !eshkp.debit)
                 || avoid) && GDIST(omx, omy) < 3) {
                if (!badinv && !online2(omx, omy, u.ux, u.uy))
                    return 0;
                if (satdoor) {
                    appr = 0;
                    gtx = gty = 0;
                }
            }
        }
    }

    z = await move_special(shkp, inhishop(shkp), appr, uondoor, avoid,
                           omx, omy, gtx, gty);
    if (z > 0)
        after_shk_move(shkp);

    return z;
}

// src/shk.c:4998 after_shk_move() — re-entry bookkeeping after a move.
export function after_shk_move(shkp) {
    const eshkp = shkp.eshk;
    if (eshkp.bill_p === -1000 && inhishop(shkp)) {
        /* reset bill_p, re-check occupancy: billing is not ported yet */
        note_unported_shk('after_shk_move:bill_p_reset');
    }
}

// src/shk.c:1118 tended_shop() — shop room has its shopkeeper inside.
export function tended_shop(sroom) {
    const mtmp = sroom.resident;
    return !mtmp ? false : !!inhishop(mtmp);
}

// src/shk.c:1126 noisy_shop() — shop sounds wake the neighborhood.
export function noisy_shop(sroom) {
    const mtmp = sroom.resident;
    if (mtmp && inhishop(mtmp))
        wake_nearto(mtmp.mx, mtmp.my, 11 * 11);
}
