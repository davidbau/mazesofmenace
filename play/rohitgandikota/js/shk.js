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
         ECMD_OK, ECMD_TIME } from './const.js';
import { in_rooms } from './hack.js';
import { distu, dist2, online2 } from './hacklib.js';
import { m_canseeu, inhishop } from './monmove.js';
import { move_special } from './priest.js';
import { carrying, sobj_at, currency, money_cnt, freeinv } from './invent.js';
import { wake_nearto } from './mon.js';
import { Deaf, Invis } from './youprop.js';
import { ACURR, Fast } from './attrib.js';
import { ONAMES, OCLASSES, MATERIALS } from './objects_data.js';
import { PMNAMES, MSOUND } from './monst_data.js';
import { Has_contents, Is_candle } from './obj.js';
import { helpless } from './monst.js';
import { is_elf, is_human } from './mondata.js';
import { rn2 } from './rng.js';
import { bot, pline } from './display.js';
import { doname, xname } from './objnam.js';
import { splitobj } from './mkobj.js';
import { OBJ_FREE } from './obj.js';
import { s_suffix } from './hacklib.js';
import { shtypes } from './shknam.js';
import { Hello } from './role.js';
import { ATR_NONE, NHW_MENU, tty_add_menu, tty_create_nhwindow,
         tty_destroy_nhwindow, tty_end_menu, tty_select_menu,
         tty_start_menu } from './tty/wintty.js';
import { NO_COLOR } from './terminal.js';

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

    note_unported_shk('hot_pursuit:rile_shk');

    const eshk = shkp.eshk || ESHK(shkp);
    if (eshk) {
        eshk.customer = game.plname || '';
        eshk.following = 1;
    }

    /* shopkeeper networking: clear obj->no_charge for all obj on the floor
       of this level (including inside containers on floor), even those that
       are in other shopkeepers' shops */
    note_unported_shk('hot_pursuit:clear_no_charge');
    note_unported_shk('hot_pursuit:clear_no_charge_pets');
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
    const r = (game.level?.rooms || [])[roomidx];
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
    const shkp = game.level?.rooms?.[roomno - ROOMOFFSET]?.resident || null;
    if (!shkp || !(shkp.eshk || ESHK(shkp)))
        return null;
    if (!shkp.mpeaceful && !(shkp.eshk || ESHK(shkp)).surcharge)
        note_unported_shk('shop_keeper:rile_shk');
    return shkp;
}

// src/shk.c:751 u_entered_shop(), ordinary tended-shop entry.
export async function u_entered_shop(enterstring) {
    if (!enterstring)
        return;

    const roomno = enterstring.charCodeAt(0);
    const shkp = shop_keeper(roomno);
    if (!shkp || !inhishop(shkp)) {
        note_unported_shk('u_entered_shop:untended');
        game.u.ushops = '';
        return;
    }

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
    if (Invis() || !shkp.mpeaceful || eshk.surcharge || eshk.robbed) {
        note_unported_shk('u_entered_shop:special_dialogue');
        return;
    }

    const rt = game.level?.rooms?.[roomno - ROOMOFFSET]?.rtype ?? SHOPBASE;
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

// src/shk.c:2809 get_cost_of_shop_item(), for ordinary floor stock.
function get_cost_of_shop_item(obj) {
    let nocharge = -1;
    const x = obj.ox, y = obj.oy;
    const shop = in_rooms(x, y, SHOPBASE);
    if (!(game.u.ushops || '') || obj.oclass === OCLASSES.COIN_CLASS
        || !shop || shop[0] !== game.u.ushops[0])
        return { price: 0, nocharge };

    const shkp = shop_keeper(inside_shop(x, y));
    if (!shkp || !inhishop(shkp))
        return { price: 0, nocharge };
    const eshk = shkp.eshk || ESHK(shkp);
    const onfloor = obj.where === undefined || obj.where === 1;
    const freespot = onfloor && x === eshk.shk.x && y === eshk.shk.y;
    nocharge = onfloor && (!!obj.no_charge || freespot) ? 1 : 0;
    const price = nocharge ? 0 : get_cost(obj, shkp) * (obj.quan || 1);
    return { price, nocharge };
}

// src/objnam.c:1761 doname_with_price(), ordinary floor-object arm.
export function doname_with_price(obj) {
    let result = doname(obj);
    if (obj.unpaid)
        return result;

    const { price, nocharge } = get_cost_of_shop_item(obj);
    if (price > 0) {
        result += ` (for sale, ${price} ${currency(price)})`;
        record_price_quote(obj.otyp, Math.trunc(price / (obj.quan || 1)), true);
    } else if (nocharge > 0) {
        result += ' (no charge)';
    }
    return result;
}

// src/shk.c:4319 getprice(), base price before the buyer-specific charisma,
// knowledge, clothing, and anger adjustments below.
function getprice(obj) {
    let tmp = game.objects[obj.otyp]?.oc_cost ?? 0;

    if (obj.oartifact) {
        /* Artifact list prices are separate from objects[].oc_cost. Billing
           ordinary stock remains exact while that table is not represented. */
        note_unported_shk('getprice:artifact');
    }
    switch (obj.oclass) {
    case OCLASSES.FOOD_CLASS:
        if (obj.corpsenm >= 0)
            note_unported_shk('getprice:corpsenm_price_adj');
        if ((game.u.uhs ?? 0) >= HUNGRY)
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
            note_unported_shk('get_cost:unidentified_glass_gem');
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

    eshk.bill_p.push({
        bo_id: obj.o_id,
        useup: !!dummy,
        price: get_cost(obj, shkp),
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

// src/shk.c:3490 addtobill(), add ordinary shop stock to the bill and quote
// its unit price. Container contents, gold, and used-up dummy objects still
// need their dedicated object-chain handling.
export async function addtobill(obj, ininv, dummy, silent) {
    const roomno = game.u.ushops ? game.u.ushops.charCodeAt(0) : NO_ROOM;
    const shkp = shop_keeper(roomno);
    if (!shkp || !inhishop(shkp) || obj.unpaid)
        return;
    if (obj.no_charge) {
        obj.no_charge = 0;
        if (!Has_contents(obj))
            return;
    }
    if (obj.oclass === OCLASSES.COIN_CLASS) {
        note_unported_shk('addtobill:costly_gold');
        return;
    }
    if (Has_contents(obj)) {
        note_unported_shk('addtobill:container_contents');
        return;
    }

    const eshk = shkp.eshk || ESHK(shkp);
    if ((eshk.billct ?? 0) >= 200) {
        if (!silent)
            await pline('You got that for free!');
        return;
    }

    const price = get_cost(obj, shkp);
    if (!add_one_tobill(obj, dummy, shkp))
        return;
    if (silent)
        return;

    if (!Deaf() && !muteshk(shkp)) {
        if (!ininv) {
            await pline(`${xname(obj)} will cost you ${price} ${currency(price)}`
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
        quote += ` ${price} ${currency(price)} ${saveQuan > 1 ? 'per' : 'for this'}`
               + ` ${xname(obj)}."`;
        obj.quan = saveQuan;
        await pline(quote);
    } else {
        await pline(`The list price of ${xname(obj)} is ${price} ${currency(price)}`
                    + `${obj.quan > 1 ? ' each' : ''}.`);
    }
}

function shopkeeper_name(shkp) {
    const raw = shkp.shknam || shkp.eshk?.shknam
        || shkp.mextra?.eshk?.shknam || 'the shopkeeper';
    return /^[-+_|]/.test(raw) ? raw.slice(1) : raw;
}

/* src/objnam.c paydoname() suppresses the carried-item price because the pay
   menu puts its own aligned amount first. Ordinary objects only need the
   unpaid suffix hidden. Containers have separate wording rules. */
function ordinary_paydoname(obj) {
    const unpaid = obj.unpaid;
    obj.unpaid = 0;
    const name = doname(obj);
    obj.unpaid = unpaid;
    return name;
}

/* src/shk.c make_itemized_bill() for intact ordinary inventory objects.
   Used-up portions and containers require separate billobjs and nested
   object-chain support which this object model does not have yet. */
function ordinary_itemized_bill(eshk) {
    const result = [];
    for (let bidx = 0; bidx < (eshk.bill_p || []).length; ++bidx) {
        const bp = eshk.bill_p[bidx];
        const obj = (game.invent || []).find(o => o.o_id === bp.bo_id);
        if (!obj || !obj.unpaid || bp.useup || Has_contents(obj)
            || obj.quan !== bp.bquan) {
            note_unported_shk('dopay:nonordinary_bill_entry');
            continue;
        }
        result.push({ obj, bp, bidx, cost: bp.price * obj.quan });
    }
    result.sort((a, b) => (b.cost - a.cost) || (a.bidx - b.bidx));
    return result;
}

// src/shk.c menu_pick_pay_items() -- choose intact ordinary items to buy.
async function menu_pick_pay_items(items) {
    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    const amtWidth = String(Math.max(...items.map(it => it.cost))).length;

    for (let i = 0; i < items.length; ++i) {
        const amount = String(items[i].cost).padStart(amtWidth, ' ');
        tty_add_menu(win, null, i + 1, 0, 0, ATR_NONE, NO_COLOR,
                     `${amount} Zm, ${ordinary_paydoname(items[i].obj)}`,
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

async function pay_ordinary_item(shkp, item) {
    const eshk = shkp.eshk || ESHK(shkp);
    if (money_cnt(game.invent) + (eshk.credit || 0) < item.cost) {
        await pline(`You don't have gold${eshk.credit ? ' or credit' : ''}`
                    + ` enough to pay for ${ordinary_paydoname(item.obj)}.`);
        return false;
    }

    let balance = item.cost;
    if (eshk.credit) {
        const credit = Math.min(eshk.credit, balance);
        eshk.credit -= credit;
        balance -= credit;
        await pline(credit === item.cost
            ? 'The price is deducted from your credit.'
            : 'The price is partially covered by your credit.');
    }
    if (balance && !(await money2mon(shkp, balance)))
        return false;

    const boughtName = ordinary_paydoname(item.obj);
    await pline(`You bought ${boughtName} for ${item.cost} gold piece`
                + `${item.cost === 1 ? '' : 's'}.`);

    item.obj.unpaid = 0;
    const bidx = eshk.bill_p.indexOf(item.bp);
    if (bidx >= 0)
        eshk.bill_p.splice(bidx, 1);
    eshk.billct = eshk.bill_p.length;
    await bot();
    return true;
}

// src/shk.c dopay() -- ordinary itemized payment in a tended shop.
export async function dopay() {
    game.multi = 0;
    const roomno = game.u.ushops ? game.u.ushops.charCodeAt(0) : NO_ROOM;
    const shkp = shop_keeper(roomno);
    if (!shkp || !inhishop(shkp)) {
        await pline('There appears to be no shopkeeper here to receive your payment.');
        return ECMD_OK;
    }

    const eshk = shkp.eshk || ESHK(shkp);
    if (!(eshk.billct || eshk.debit || eshk.robbed)) {
        await pline(`You do not owe ${shopkeeper_name(shkp)} anything.`);
        return ECMD_OK;
    }
    if (helpless(shkp)) {
        await pline(`${shopkeeper_name(shkp)} ${rn2(2)
            ? 'seems to be napping' : "doesn't respond"}.`);
        return ECMD_OK;
    }
    if (eshk.debit || eshk.robbed) {
        note_unported_shk('dopay:debit_or_robbery');
        return ECMD_OK;
    }

    const items = ordinary_itemized_bill(eshk);
    if (!items.length)
        return ECMD_OK;
    if (money_cnt(game.invent) + (eshk.credit || 0)
        < Math.min(...items.map(it => it.cost))) {
        await pline(`You don't have enough gold to buy`
                    + `${items.length > 1 ? ' any of' : ''} the item`
                    + `${items.length > 1 ? "s you've picked" : ' on your bill'}.`);
        return ECMD_TIME;
    }

    const selected = await menu_pick_pay_items(items);
    let paid = false;
    for (let i = 0; i < items.length; ++i) {
        if (selected.has(i) && await pay_ordinary_item(shkp, items[i]))
            paid = true;
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

// src/shk.c:5791 block_door() — an angry shopkeeper standing on his usual
// spot blocks the shop door. The room-type gates answer for every non-shop
// doorway; a real shop with an owed shopkeeper needs eshk state (shk.x/y,
// shd, debit/billct/robbed) that the shk port does not carry yet, so that
// arm records itself instead of guessing.
export function block_door(x, y) {
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

    note_unported_shk('block_door:shk_on_post');
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

// src/shk.c:4556 shk_fixes_damage() — repair one pending damage-list
// entry. The level damage list only gains entries from digging and door
// breakage, neither of which a ported path creates near a shop yet, so
// this stays a pure guard.
function shk_fixes_damage(shkp) {
    const dam = (game.level?.damagelist || []).length;
    if (!dam)
        return;
    note_unported_shk('shk_fixes_damage:repair_damage');
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
        shk_fixes_damage(shkp);

    const udist = distu(omx, omy);
    if (udist < 3 /* grid bug shk: PM_GRID_BUG can't be a shk */) {
        if (!shkp.mpeaceful /* ANGRY(shkp); Conflict unreached */) {
            const { mattacku } = await import('./mhitu.js');
            await mattacku(shkp);
            return 0;
        }
        if (eshkp.following) {
            /* the "didn't you forget to pay?" nag and the rn2(9)
               rile_shk roll */
            note_unported_shk('shk_move:following_nag');
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
