// shk.js — Shopkeeper movement + shop enter/leave (partial).
// C ref: shk.c shk_move / after_shk_move / u_entered_shop / u_left_shop;
//        paybill / inherits / set_repo_loc / money2mon; priest.c move_special;
//        addtobill / append_honorific / get_cost / getprice / billable;
//        get_cost_of_shop_item / doname_with_price (D-0460);
//        is_unpaid / unpaid_cost + doname unpaid suffix (D-0461);
//        dopay / pay_billed_items / dopayobj / menu_pick_pay_items (subset).
// Named omissions: shk_fixes_damage body; holetime dig follow; angry
// Displaced pline; following verbalize;
// pri_move altar mill rn1; m_break_boulder; m_move_aggress;
// Fast + sobj_at pickaxe doorway block / dochug; m_canseeu for angry chase;
// resist_conflict; deserted_shop body; ACH_SHOP mapseen; Hallu shkname;
// angry/surcharge/robbed welcome arms; Invis welcome; leave-bill verbalize;
// addupbill body; clear_unpaid/no_charge walks in setpaid; mongone full;
// mnearto home_shk; paygd; M1_NOHEAD has_head (assume headed for shk path);
// container bill_box_content / contained_cost; remote_burglary; gem glass
// pseudo-ID in get_cost; arti_cost; Hallu currency ROLL_FROM; costly_gold;
// pricequotes; get_obj_location buried/minvent;
// dopay: debit/robbed/angry appease; used-up/container bill arms;
// traditional itemize ynq; observe_object/makeknown in shk_names_obj;
// getpos pay-whom; container paydoname rewrite; contained_cost.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { dist2, online2 } from './hacklib.js';
import { in_rooms } from './hack.js';
import {
    ESHK, IS_ROOM, NOTONL, u_at, isok, ROOMOFFSET, SHOPBASE, ACH_SHOP,
    OBJ_MINVENT, OBJ_FLOOR, OBJ_CONTAINED, OBJ_INVENT, NO_ROOM,
    LOW_PM, Has_contents, MAXULEV, ECMD_OK, ECMD_TIME,
    COST_CONTENTS, COST_SINGLEOBJ,
} from './const.js';
import {
    COIN_CLASS, FOOD_CLASS, WAND_CLASS, POTION_CLASS, ARMOR_CLASS,
    WEAPON_CLASS, TOOL_CLASS, GEM_CLASS, objects, POT_WATER,
} from './objects.js';
import { newsym, pline, verbalize, docrt, flush_screen } from './display.js';
import { cansee } from './vision.js';
import { objectNames } from './generated/objects_data.js';
import { mattacku } from './mhitu.js';
import { PM_GRID_BUG, PM_TOURIST } from './generated/monsters_data.js';
import { Hello } from './roles.js';
import { shtypes, shkname, Shknam } from './shknam.js';
import { splitobj } from './mkobj.js';
import { add_to_minv } from './makemon.js';
import { acurr, A_CHA } from './attrib.js';
import { xname, doname, paydoname, set_doname_shop_suffix } from './objnam.js';
import { is_human } from './monsters.js';
import { nhgetch } from './input.js';
import { paint_corner_nhw_menu } from './invent.js';
import { ATR_INVERSE } from './terminal.js';

const PICK_AXE = objectNames.indexOf('PICK_AXE');
const DWARVISH_MATTOCK = objectNames.indexOf('DWARVISH_MATTOCK');
/** C monflag.h MS_ANIMAL — animal noises ceiling for muteshk. */
const MS_ANIMAL = 17;
/** C monflag.h MS_SELL — shopkeeper when tables omit msound. */
const MS_SELL = 39;

/** C: ANGRY(mon) ≡ !mpeaceful */
function ANGRY(mon) {
    return !mon?.mpeaceful;
}

/** C: helpless — msleeping || !mcanmove */
function helpless(mtmp) {
    return !!(mtmp?.msleeping || mtmp?.mcanmove === 0);
}

/**
 * C: muteshk — helpless or msound <= MS_ANIMAL.
 * Generated tables often omit msound; isshk → MS_SELL.
 */
function muteshk(shkp) {
    if (helpless(shkp)) return true;
    let ms = shkp?.data?.msound;
    if (ms == null) ms = shkp?.isshk ? MS_SELL : 0;
    return (ms | 0) <= MS_ANIMAL;
}

/** C ref: hacklib.c s_suffix */
function s_suffix(s) {
    const buf = String(s ?? '');
    const low = buf.toLowerCase();
    if (low === 'it') return `${buf}s`;
    if (low === 'you') return `${buf}r`;
    if (buf.endsWith('s') || buf.endsWith('S')) return `${buf}'`;
    return `${buf}'s`;
}

/** C ref: shk.c pacify_shk — peaceful + optional surcharge undo (bill deferred). */
function pacify_shk(shkp, clear_surcharge) {
    if (!shkp) return;
    shkp.mpeaceful = 1;
    const eshk = ESHK(shkp);
    if (clear_surcharge && eshk?.surcharge) {
        eshk.surcharge = false;
        // bill price undo deferred (no bill_p walk yet)
    }
}

/** C ref: insight/achieve record_achievement — ACH_SHOP stub (mapseen deferred). */
function record_achievement(_ach) {
    // full uachieved / livelog deferred
}

/**
 * C ref: shk.c shop_keeper — rooms[rmno-ROOMOFFSET].resident with eshk.
 * Angry surcharge rile_shk deferred.
 */
export function shop_keeper(rmno) {
    const code = typeof rmno === 'string' ? rmno.charCodeAt(0) : (rmno | 0);
    if (code < ROOMOFFSET) return null;
    const shkp = game.level?.rooms?.[code - ROOMOFFSET]?.resident || null;
    if (!shkp) return null;
    if (!ESHK(shkp)) return null;
    // ANGRY → rile_shk deferred
    return shkp;
}

/**
 * C ref: shk.c u_left_shop — leave/boundary bill prompts.
 * Named omissions: rob_shop / call_kops; leave verbalize when billct/debit.
 */
export async function u_left_shop(leavestring, _newlev) {
    const u = game.u;
    if (!u) return;
    const leave = leavestring || '';
    const loc = game.level?.at?.(u.ux, u.uy);
    const loc0 = game.level?.at?.(u.ux0, u.uy0);
    // C: if (!*leavestring && (!edge || edge0)) return;
    if (!leave && (!(loc?.edge) || loc0?.edge)) return;

    const rmCh = leave ? leave.charCodeAt(0) : (u.ushops0 || '').charCodeAt(0);
    const shkp = shop_keeper(rmCh);
    if (!shkp || !inhishop(shkp)) return;

    const eshkp = ESHK(shkp);
    if (!((eshkp?.billct | 0) || (eshkp?.debit | 0))) return;

    // bill unpaid arms (verbalize / rob_shop) deferred
}

/**
 * C ref: shk.c u_entered_shop — welcome / deserted / blocking.
 * Covered: tended peaceful first-visit Welcome verbalize.
 * Deferred: deserted_shop; angry/surcharge/robbed/Invis arms; pickaxe/
 * steed/Fast doorway block + dochug; inside_shop gate for those arms.
 */
export async function u_entered_shop(enterstring) {
    if (!enterstring) return;
    const u = game.u;
    if (!u) return;

    const enterCh = enterstring.charCodeAt(0);
    const shkp = shop_keeper(enterCh);
    if (!shkp) {
        // deserted_shop deferred; clear ushops like C empty path
        u.ushops = '';
        return;
    }

    const eshkp = ESHK(shkp);
    if (!inhishop(shkp)) {
        u.ushops = '';
        return;
    }

    record_achievement(ACH_SHOP);
    eshkp.bill_p = eshkp.bill || null;

    const plname = game.plname || '';
    const cust = eshkp.customer || '';
    if ((!eshkp.visitct || cust)
        && cust.toLowerCase() !== plname.toLowerCase().slice(0, 32)) {
        eshkp.visitct = 0;
        eshkp.following = 0;
        eshkp.customer = plname.slice(0, 32);
        pacify_shk(shkp, true);
    }

    if (muteshk(shkp) || eshkp.following) return;

    if (u.Invis) {
        // Invis welcome arms deferred
        return;
    }

    const rt = game.level?.rooms?.[enterCh - ROOMOFFSET]?.rtype | 0;
    const shopName = shtypes[rt - SHOPBASE]?.name || 'shop';

    if (ANGRY(shkp) || eshkp.surcharge || eshkp.robbed) {
        // angry / surcharge / robbed welcome arms deferred
        return;
    }

    const deaf = !!(u.Deaf || (u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf);
    if (!deaf && !muteshk(shkp)) {
        const again = eshkp.visitct++ ? ' again' : '';
        await verbalize(
            `${Hello(shkp)}, ${plname}!  Welcome${again} to ${s_suffix(shkname(shkp))} ${shopName}!`,
        );
    } else {
        const again = eshkp.visitct++ ? ' again' : '';
        await pline(
            `You enter ${s_suffix(shkname(shkp))} ${shopName}${again}!`,
        );
    }
    // doorway pickaxe / steed / Fast block + dochug deferred
}

/** C ref: shk.c inhishop — roomno match (full in_rooms / on_level deferred). */
export function inhishop(shkp) {
    const eshk = ESHK(shkp);
    if (!eshk || shkp.mx == null) return false;
    const loc = game.level?.at?.(shkp.mx, shkp.my);
    return !!loc && ((loc.roomno | 0) === (eshk.shoproom | 0));
}

/** C mextra.h BILLSZ */
const BILLSZ = 200;
/** C obj_material_types GLASS */
const GLASS = 19;
const DUNCE_CAP = objectNames.indexOf('DUNCE_CAP');
const HUNGRY = 2; // C you.h SATIATED=0 … HUNGRY=2

/** C: IS_SHOP(x) — rooms[x].rtype >= SHOPBASE. */
function IS_SHOP(roomIdx) {
    return ((game.level?.rooms?.[roomIdx]?.rtype | 0) >= SHOPBASE);
}

/**
 * C ref: shk.c inside_shop — roomno char, or NO_ROOM if not in shop proper.
 * Truthy when in a shop (callers use as boolean or shop_keeper arg).
 */
function inside_shop(x, y) {
    const loc = game.level?.at?.(x, y);
    if (!loc) return NO_ROOM;
    let rno = loc.roomno | 0;
    if ((rno < ROOMOFFSET) || loc.edge || !IS_SHOP(rno - ROOMOFFSET)) {
        rno = NO_ROOM;
    }
    return rno;
}

/**
 * C ref: zap.c get_obj_location — subset for shop pricing (floor/invent/
 * contained). BURIED_TOO / minvent deferred unless locflags request.
 */
function get_obj_location(obj, locflags = 0) {
    if (!obj) return null;
    switch (obj.where) {
    case OBJ_INVENT:
        return { x: game.u?.ux | 0, y: game.u?.uy | 0 };
    case OBJ_FLOOR:
        return { x: obj.ox | 0, y: obj.oy | 0 };
    case OBJ_CONTAINED:
        if (locflags & 0x1) { // CONTAINED_TOO
            return get_obj_location(obj.ocontainer, locflags);
        }
        return null;
    default:
        return null;
    }
}

/**
 * C ref: shk.c costly_spot — shop goods square (not shk free spot).
 */
export function costly_spot(x, y) {
    if (!game.level?.flags?.has_shop) return false;
    const rooms = in_rooms(x, y, SHOPBASE);
    if (!rooms) return false;
    const shkp = shop_keeper(rooms.charCodeAt(0));
    if (!shkp || !inhishop(shkp)) return false;
    const eshkp = ESHK(shkp);
    return inside_shop(x, y)
        && !((x | 0) === (eshkp.shk?.x | 0) && (y | 0) === (eshkp.shk?.y | 0));
}

/** C invent.c currency — Hallu ROLL_FROM deferred → always zorkmid(s). */
function currency(amount) {
    return (amount | 0) === 1 ? 'zorkmid' : 'zorkmids';
}

function Role_if(pm) {
    return game.urole?.mnum === pm;
}

/** C shk.c oid_price_adjustment — no RNG. */
function oid_price_adjustment(obj, oid) {
    const otyp = obj?.otyp | 0;
    const oc = objects()?.[otyp];
    if ((obj?.dknown && oc?.oc_name_known)
        || ((obj?.oclass | 0) === GEM_CLASS && (oc?.oc_material | 0) === GLASS)) {
        return 0;
    }
    return ((oid | 0) % 4) === 0 ? 1 : 0;
}

/** C shk.c get_pricing_units — quan; globby weight deferred → quan. */
function get_pricing_units(obj) {
    return (obj?.quan | 0) || 1;
}

/**
 * C ref: invent.c count_unpaid — unpaid items in list incl. contents.
 */
function count_unpaid(list) {
    let count = 0;
    for (let otmp = list; otmp; otmp = otmp.nobj) {
        if (otmp.unpaid) count++;
        if (Has_contents(otmp)) count += count_unpaid(otmp.cobj);
    }
    return count;
}

/**
 * C ref: shk.c is_unpaid — object or any contents on a shop bill.
 */
export function is_unpaid(obj) {
    return !!(obj?.unpaid
        || (Has_contents(obj) && count_unpaid(obj.cobj)));
}

/**
 * C ref: shk.c unpaid_cost — bill price for unpaid invent / contents.
 * Named omissions: contained_cost when COST_CONTENTS && Has_contents;
 * impossible() when unpaid but not on bill.
 */
export function unpaid_cost(unp_obj, cost_type) {
    let amt = 0;
    let shkp = null;
    let bp = null;
    const ushops = game.u?.ushops || '';
    for (let i = 0; i < ushops.length; i++) {
        shkp = shop_keeper(ushops.charCodeAt(i));
        if (!shkp) continue;
        bp = onbill(unp_obj, shkp, true);
        if (bp) {
            amt = bp.price | 0;
            if (cost_type !== COST_SINGLEOBJ) {
                amt *= (unp_obj.quan | 0) || 1;
            }
        }
        if (cost_type === COST_CONTENTS && Has_contents(unp_obj)) {
            // contained_cost deferred — outer bill amt only for now
        }
        if (bp || (!unp_obj.unpaid && amt)) break;
    }
    // C: if (!shkp || (unp_obj->unpaid && !bp)) impossible(...);
    return amt;
}

/**
 * C ref: objnam.c doname_base unpaid arm (is_unpaid → unpaid_cost).
 * Wired into plain doname via set_doname_shop_suffix(…, with_price ignored).
 * Named omissions: record_price_quote; contained_cost contents label path
 * still uses unpaid_cost amt without nested walk.
 */
function append_doname_unpaid_suffix(obj, bp, _with_price) {
    if (game.iflags?.suppress_price || game.program_state?.restoring) {
        return bp;
    }
    if (!is_unpaid(obj)) return bp;
    const quotedprice = unpaid_cost(obj, COST_CONTENTS);
    const pricebuf = `${quotedprice} ${currency(quotedprice)}`;
    const label = obj.unpaid ? 'unpaid' : 'contents';
    return `${bp} (${label}, ${pricebuf})`;
}

/**
 * C ref: shk.c get_cost_of_shop_item — price of floor/shop goods for doname.
 * Named omissions: contained_cost for Has_contents; globby weight units.
 * @returns {{ cost: number, nochrg: number }}
 *   nochrg: 1 no charge, 0 shop-owned, -1 not in shop
 */
export function get_cost_of_shop_item(obj) {
    let nochrg = -1;
    let cost = 0;
    const u = game.u;
    const ushops = u?.ushops || '';
    if (!ushops || !obj
        || (obj.oclass | 0) === COIN_CLASS
        || obj === u?.uball || obj === u?.uchain) {
        return { cost, nochrg };
    }
    const loc = get_obj_location(obj, 0x1); // CONTAINED_TOO
    if (!loc) return { cost, nochrg };
    const { x, y } = loc;
    const rooms = in_rooms(x, y, SHOPBASE);
    if (!rooms || rooms.charCodeAt(0) !== ushops.charCodeAt(0)) {
        return { cost, nochrg };
    }
    const shkp = shop_keeper(inside_shop(x, y));
    if (!shkp || !inhishop(shkp)) return { cost, nochrg };

    let top = obj;
    while (top?.where === OBJ_CONTAINED) top = top.ocontainer;
    const eshkp = ESHK(shkp);
    const freespot = top?.where === OBJ_FLOOR
        && (x | 0) === (eshkp?.shk?.x | 0)
        && (y | 0) === (eshkp?.shk?.y | 0);
    // no_charge only for floor items; freespot implicitly no charge
    nochrg = (top?.where === OBJ_FLOOR && (obj.no_charge || freespot)) ? 1 : 0;

    const carriedTop = top?.where === OBJ_INVENT;
    if (carriedTop ? !!obj.unpaid : !nochrg) {
        cost = get_pricing_units(obj) * get_cost(obj, shkp);
    }
    // Has_contents && !freespot → contained_cost deferred
    return { cost, nochrg };
}

/**
 * C ref: objnam.c doname_with_price → doname_base(DONAME_WITH_PRICE).
 * Plain doname already applies unpaid (C first else-if); this only adds
 * for-sale / no-charge when !is_unpaid.
 * Named omissions: pricequotes append; contained_cost contents bill.
 */
export function doname_with_price(obj) {
    let bp = doname(obj);
    if (game.iflags?.suppress_price || game.program_state?.restoring) {
        return bp;
    }
    // C: else if (is_unpaid) already handled inside doname
    if (is_unpaid(obj)) return bp;
    const { cost: price, nochrg } = get_cost_of_shop_item(obj);
    if (price > 0) {
        const pricebuf = `${price} ${currency(price)}`;
        bp += ` (${nochrg ? 'contents' : 'for sale'}, ${pricebuf})`;
    } else if (nochrg > 0) {
        bp += ' (no charge)';
    }
    return bp;
}

// Wire C doname_base unpaid arm into objnam.doname.
set_doname_shop_suffix(append_doname_unpaid_suffix);

/**
 * C ref: shk.c getprice — base oc_cost + class tweaks.
 * Named omissions: arti_cost; corpsenm_price_adj; full candle Is_candle.
 */
function getprice(obj, shk_buying) {
    const oc = objects()?.[obj?.otyp | 0];
    let tmp = (oc?.oc_cost | 0);
    if (obj?.oartifact) {
        // arti_cost deferred — leave table cost; get_cost still *4 later
        if (shk_buying) tmp = Math.trunc(tmp / 4);
    }
    switch (obj?.oclass | 0) {
    case FOOD_CLASS: {
        const u = game.u;
        if ((u?.uhs | 0) >= HUNGRY && !shk_buying) tmp *= (u.uhs | 0);
        if (obj.oeaten) tmp = 0;
        break;
    }
    case WAND_CLASS:
        if ((obj.spe | 0) === -1) tmp = 0;
        break;
    case POTION_CLASS:
        if ((obj.otyp | 0) === (POT_WATER | 0) && !obj.blessed && !obj.cursed) {
            tmp = 0;
        }
        break;
    case ARMOR_CLASS:
    case WEAPON_CLASS:
        if ((obj.spe | 0) > 0) tmp += 10 * (obj.spe | 0);
        break;
    case TOOL_CLASS:
        // Is_candle age < 20*oc_cost → /2 deferred (needs candle predicate)
        break;
    default:
        break;
    }
    return tmp;
}

/**
 * C ref: shk.c get_cost — charge for one unit.
 * Named omissions: glass-gem pseudo-ID table; bill-price reuse FIXME.
 */
function get_cost(obj, shkp) {
    let tmp = getprice(obj, false);
    let multiplier = 1;
    let divisor = 1;
    if (!tmp) tmp = 5;

    const oc = objects()?.[obj?.otyp | 0];
    if (!obj?.dknown || !oc?.oc_name_known) {
        if ((obj?.oclass | 0) === GEM_CLASS && (oc?.oc_material | 0) === GLASS) {
            // glass gem pseudo-ID → objects[i].oc_cost deferred; keep tmp
        } else if (oid_price_adjustment(obj, obj?.o_id | 0) > 0) {
            multiplier *= 4;
            divisor *= 3;
        }
    }

    const u = game.u;
    if (u?.uarmh && (u.uarmh.otyp | 0) === DUNCE_CAP) {
        multiplier *= 4;
        divisor *= 3;
    } else if ((Role_if(PM_TOURIST) && (u?.ulevel | 0) < Math.trunc(MAXULEV / 2))
        || (u?.uarmu && !u.uarm && !u.uarmc)) {
        multiplier *= 4;
        divisor *= 3;
    }

    const cha = acurr(A_CHA);
    if (cha > 18) divisor *= 2;
    else if (cha === 18) {
        multiplier *= 2;
        divisor *= 3;
    } else if (cha >= 16) {
        multiplier *= 3;
        divisor *= 4;
    } else if (cha <= 5) multiplier *= 2;
    else if (cha <= 7) {
        multiplier *= 3;
        divisor *= 2;
    } else if (cha <= 10) {
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
    if (tmp <= 0) tmp = 1;
    if (obj?.oartifact) tmp *= 4;
    if (shkp && ESHK(shkp)?.surcharge) {
        tmp += Math.trunc((tmp + 2) / 3);
    }
    return tmp;
}

/** C shk.c onbill — find bill entry by o_id. */
function onbill(obj, shkp, _silent) {
    const eshkp = ESHK(shkp);
    if (!eshkp || !obj) return null;
    const bill = eshkp.bill_p || eshkp.bill;
    if (!bill) return null;
    const id = obj.o_id | 0;
    const n = eshkp.billct | 0;
    for (let i = 0; i < n; i++) {
        if ((bill[i]?.bo_id | 0) === id) return bill[i];
    }
    return null;
}

/**
 * C ref: shk.c billable — shk thinks item is hers.
 * Named omissions: contained_cost/contained_gold no_charge container arms.
 */
export function billable(shkHolder, obj, roomno, reset_nocharge) {
    let shkp = shkHolder.shkp;
    if (!shkp) {
        if (!roomno) return false;
        shkp = shop_keeper(roomno);
        if (!shkp || !inhishop(shkp)) return false;
        shkHolder.shkp = shkp;
    }
    if (onbill(obj, shkp, false)
        || ((obj?.oclass | 0) === FOOD_CLASS && obj?.oeaten)) {
        return false;
    }
    if (obj?.no_charge) {
        // container no_charge / contained_* deferred — simple empty → not billable
        if (!Has_contents(obj)) {
            shkp = null;
        }
        if (reset_nocharge && !shkp && (obj.oclass | 0) !== COIN_CLASS) {
            obj.no_charge = 0;
        }
    }
    return !!shkp;
}

/**
 * C ref: shk.c add_one_tobill.
 * Named omissions: dummy→billobjs; globby OMID; record_price_quote.
 */
function add_one_tobill(obj, dummy, shkp) {
    const eshkp = ESHK(shkp);
    if (!eshkp || !obj) return;
    if (!eshkp.bill) eshkp.bill = [];
    if (!eshkp.bill_p) eshkp.bill_p = eshkp.bill;

    const holder = { shkp };
    if (!billable(holder, obj, game.u?.ushops?.[0] || 0, true)) {
        return;
    }
    if ((eshkp.billct | 0) === BILLSZ) {
        return;
    }

    const bct = eshkp.billct | 0;
    const bp = {
        bo_id: obj.o_id | 0,
        bquan: obj.quan | 0,
        useup: !!dummy,
        price: get_cost(obj, shkp),
    };
    if (obj.globby) bp.price *= get_pricing_units(obj);
    eshkp.bill_p[bct] = bp;
    eshkp.billct = bct + 1;
    obj.unpaid = 1;
}

/**
 * C ref: shk.c append_honorific — rn2(SIZE(honored)-1) + udemigod.
 * Vampire/elf race suffixes: human path via is_human; others → creature.
 */
function append_honorific(bufRef) {
    const honored = [
        'good', 'honored', 'most gracious', 'esteemed',
        'most renowned and sacred',
    ];
    const udemi = game.u?.uevent?.udemigod ? 1 : 0;
    bufRef.s += honored[rn2(honored.length - 1) + udemi];
    const ptr = game.youmonst?.data;
    // is_vampire / maybe_polyd elf deferred
    if (!is_human(ptr)) bufRef.s += ' creature';
    else if (game.flags?.female) bufRef.s += ' lady';
    else bufRef.s += ' sir';
}

/**
 * C ref: shk.c addtobill — unpaid pickup quote path.
 * Covered: non-container ininv `"For you,"` + append_honorific.
 * Deferred: container bill; costly_gold; remote silent; Deaf list-price arm
 * fully; Angry "scum" still wired.
 */
export async function addtobill(obj, ininv, dummy, silent) {
    const holder = { shkp: null };
    const roomCh = (game.u?.ushops || '')[0] || '\0';
    if (!billable(holder, obj, roomCh, true)) return;
    const shkp = holder.shkp;

    if ((obj?.oclass | 0) === COIN_CLASS) {
        // costly_gold deferred
        return;
    }
    if ((ESHK(shkp)?.billct | 0) === BILLSZ) {
        if (!silent) await pline('You got that for free!');
        return;
    }

    let ltmp = 0;
    const container = Has_contents(obj);
    if (!obj.no_charge) {
        ltmp = get_cost(obj, shkp);
        if (obj.globby) ltmp *= get_pricing_units(obj);
    }
    if (obj.no_charge && !container) {
        obj.no_charge = 0;
        return;
    }

    let contentscount = 0;
    if (container) {
        // bill_box_content / contained_cost deferred — still bill outer if priced
        if (ltmp) add_one_tobill(obj, dummy, shkp);
        if (obj.no_charge) obj.no_charge = 0;
        contentscount = 0;
    } else {
        add_one_tobill(obj, dummy, shkp);
    }

    const u = game.u;
    const deaf = !!(u?.Deaf || (u?.HDeaf | 0) || (u?.EDeaf | 0)
        || u?.uroleplay?.deaf);
    if (!deaf && !muteshk(shkp) && !silent) {
        if (!ltmp) {
            await pline(`${Shknam(shkp)} has no interest in ${xname(obj)}.`);
            return;
        }
        if (!ininv) {
            await pline(
                `${xname(obj)} will cost you ${ltmp} ${currency(ltmp)}${(obj.quan | 0) > 1 ? ' each' : ''}.`,
            );
        } else {
            const buf = { s: '"For you,' };
            if (ANGRY(shkp)) {
                buf.s += ' scum;';
            } else if (!ESHK(shkp)?.surcharge) {
                buf.s += ' ';
                append_honorific(buf);
                buf.s += '; only';
            }
            const saveQuan = obj.quan;
            obj.quan = 1;
            const forWhat = (saveQuan > 1)
                ? 'per'
                : (contentscount && !obj.unpaid)
                    ? 'for the contents of this'
                    : 'for this';
            const contents = (contentscount && obj.unpaid) ? ' and its contents' : '';
            await pline(
                `${buf.s} ${ltmp} ${currency(ltmp)} ${forWhat} ${xname(obj)}${contents}."`,
            );
            obj.quan = saveQuan;
        }
    } else if (!silent) {
        if (ltmp) {
            await pline(
                `The list price of ${xname(obj)} is ${ltmp} ${currency(ltmp)}${(obj.quan | 0) > 1 ? ' each' : ''}.`,
            );
        } else {
            await pline(`${Shknam(shkp)} does not notice.`);
        }
    }
}

/** C ref: invent.c carrying — first matching otyp in hero invent. */
function carrying(otyp) {
    if (otyp < 0) return null;
    for (let o = game.u?.invent; o; o = o.nobj) {
        if (o.otyp === otyp) return o;
    }
    return null;
}

/** C ref: dig.c holetime — dig occupation in shop; stub: not digging. */
function holetime() {
    return -1;
}

/** C: onlineu(xx,yy) → online2(xx,yy,u.ux,u.uy) */
function onlineu(xx, yy) {
    const u = game.u;
    if (!u) return false;
    return online2(xx, yy, u.ux, u.uy);
}

/**
 * C ref: priest.c move_special — shared shk/priest step picker.
 * Returns 1 moved, 0 didn't, -2 died. (m_move_aggress / boulder deferred.)
 * Lazy-imports mon.js helpers to avoid mon→monmove→shk→mon cycle.
 */
export async function move_special(mtmp, in_his_shop, appr, uondoor, avoid,
    omx, omy, ggx, ggy) {
    if (omx === ggx && omy === ggy) return 0;
    if (mtmp.mconf) {
        avoid = false;
        appr = 0;
    }

    const { mon_allowflags, mfndpos, m_at, ALLOW_M } = await import('./mon.js');

    let nix = omx;
    let niy = omy;
    let ninfo = 0;
    const allowflags = mon_allowflags(mtmp);
    const mfp = { cnt: 0, poss: [], info: [] };
    const cnt = mfndpos(mtmp, mfp, allowflags);

    if (mtmp.isshk && avoid && uondoor) {
        let canAvoid = false;
        for (let i = 0; i < cnt; i++) {
            if (!(mfp.info[i] & NOTONL)) {
                canAvoid = true;
                break;
            }
        }
        if (!canAvoid) avoid = false;
    }

    const GDIST = (x, y) => dist2(x, y, ggx, ggy);

    function pick_move() {
        let chcnt = 0;
        nix = omx;
        niy = omy;
        ninfo = 0;
        for (let i = 0; i < cnt; i++) {
            const nx = mfp.poss[i].x;
            const ny = mfp.poss[i].y;
            const loc = game.level?.at?.(nx, ny);
            if (IS_ROOM(loc?.typ)
                || (mtmp.isshk && (!in_his_shop || ESHK(mtmp)?.following))) {
                if (avoid && (mfp.info[i] & NOTONL) && !(mfp.info[i] & ALLOW_M)) {
                    continue;
                }
                if ((!appr && !rn2(++chcnt))
                    || (appr && GDIST(nx, ny) < GDIST(nix, niy))
                    || (mfp.info[i] & ALLOW_M)) {
                    nix = nx;
                    niy = ny;
                    ninfo = mfp.info[i];
                }
            }
        }
    }

    pick_move();

    if (mtmp.ispriest && avoid && nix === omx && niy === omy
        && onlineu(omx, omy)) {
        avoid = false;
        pick_move();
    }

    if (nix !== omx || niy !== omy) {
        if (m_at(nix, niy) || u_at(nix, niy)) return 0;
        if (!isok(nix, niy)) return 0;
        mtmp.mx = nix;
        mtmp.my = niy;
        newsym(nix, niy);
        void ninfo;
        return 1;
    }
    return 0;
}

/**
 * C ref: shk.c shk_move — returns 1 moved, 0 didn't, -1 let m_move,
 * -2 died.
 */
export async function shk_move(shkp) {
    const eshkp = ESHK(shkp);
    if (!eshkp) return 0;

    const omx = shkp.mx;
    const omy = shkp.my;
    const u = game.u;

    // shk_fixes_damage deferred (no damage chain)

    const udist = dist2(omx, omy, u.ux, u.uy);
    // C: udist < 3 && (data != GRID_BUG || same row/col)
    if (udist < 3 && (shkp.mnum !== PM_GRID_BUG || omx === u.ux || omy === u.uy)) {
        // resist_conflict stubbed false → Conflict always engages when set
        if (ANGRY(shkp) || game.Conflict) {
            await mattacku(shkp);
            return 0;
        }
        if (eshkp.following) {
            // customer / followmsg verbalize / rile_shk deferred
            if (udist < 2) return 0;
        }
    }

    let appr = 1;
    let gtx = eshkp.shk?.x | 0;
    let gty = eshkp.shk?.y | 0;
    const satdoor = (gtx === omx && gty === omy);
    let uondoor = false;
    let avoid = false;
    let badinv = false;

    const zHole = holetime();
    if (eshkp.following || (zHole >= 0 && zHole * zHole <= udist)) {
        if (udist > 4 && eshkp.following && !eshkp.billct) {
            return -1; // leave it to m_move
        }
        gtx = u.ux;
        gty = u.uy;
    } else if (ANGRY(shkp)) {
        if (shkp.mcansee) {
            gtx = u.ux;
            gty = u.uy;
        }
        avoid = false;
    } else {
        if (u.Invis || u.usteed) {
            avoid = false;
        } else {
            uondoor = u_at(eshkp.shd?.x | 0, eshkp.shd?.y | 0);
            if (uondoor) {
                badinv = !!(carrying(PICK_AXE) || carrying(DWARVISH_MATTOCK));
                // Fast + sobj_at pickaxe deferred
                if (satdoor && badinv) return 0;
                avoid = !badinv;
            } else {
                const ushops = u.ushops || '';
                avoid = !!(ushops && dist2(u.ux, u.uy, gtx, gty) > 8);
                badinv = false;
            }

            const GDIST = (x, y) => dist2(x, y, gtx, gty);
            if (((!eshkp.robbed && !eshkp.billct && !eshkp.debit) || avoid)
                && GDIST(omx, omy) < 3) {
                if (!badinv && !onlineu(omx, omy)) return 0;
                if (satdoor) {
                    appr = 0;
                    gtx = 0;
                    gty = 0;
                }
            }
        }
    }

    const z = await move_special(
        shkp, inhishop(shkp), appr, uondoor, avoid, omx, omy, gtx, gty,
    );
    // after_shk_move bill_p reset deferred
    return z;
}

import { gd_move as vault_gd_move } from './vault.js';

/**
 * C ref: vault.c gd_move — re-export peaceful escort subset from vault.js.
 */
export async function gd_move(grd) {
    return vault_gd_move(grd);
}

/**
 * C ref: priest.c pri_move — stub: stay put without altar mill rn1.
 * Named omission: histemple_at / Conflict chase / rn1(3,-1) mill.
 */
export function pri_move(_priest) {
    return 0;
}

/** C: has_head — !(mflags1 & M1_NOHEAD); M1_NOHEAD not in JS tables. */
function has_head(_ptr) {
    return true;
}

/** C ref: you.h m_next2u — squared dist ≤ 2. */
function m_next2u(mtmp) {
    const u = game.u || {};
    const dx = (mtmp.mx | 0) - (u.ux | 0);
    const dy = (mtmp.my | 0) - (u.uy | 0);
    return dx * dx + dy * dy <= 2;
}

/** C ref: dungeon.c on_level */
function on_level(a, b) {
    return !!a && !!b
        && (a.dnum | 0) === (b.dnum | 0)
        && (a.dlevel | 0) === (b.dlevel | 0);
}

/** C: strchr(u.ushops, shoproom) */
function uin_shoproom(shoproom) {
    const ushops = game.u?.ushops || '';
    return ushops.includes(String.fromCharCode(shoproom | 0));
}

/** C ref: invent.c money_cnt — invent is a JS array. */
function money_cnt(invent) {
    let sum = 0;
    for (const o of invent || []) {
        if (o.oclass === COIN_CLASS) sum += o.quan | 0;
    }
    return sum;
}

/** C ref: steal.c findgold — first GOLD_PIECE / COIN on invent array. */
function findgold_invent() {
    const goldOtyp = objectNames.indexOf('GOLD_PIECE');
    for (const o of game.invent || []) {
        if (o.oclass === COIN_CLASS || o.otyp === goldOtyp) return o;
    }
    return null;
}

/**
 * C ref: shk.c money2mon — move hero gold into mon minvent.
 * C freeinv → freeinv_core sets disp.botl; botl uses money_cnt(invent).
 * JS botl `$:` caches game._goldCount (addinv/drop maintain it) — decrement
 * here so pay paints the post-payment wallet.
 * Named omissions: remove_worn_item quiver; impossible arms.
 */
export function money2mon(mon, amount) {
    if (amount <= 0 || !mon) return 0;
    let ygold = findgold_invent();
    if (!ygold || (ygold.quan | 0) < amount) return 0;
    if ((ygold.quan | 0) > amount) {
        ygold = splitobj(ygold, amount);
        // splitobj leaves parent in invent with reduced quan; child not
        // listed in invent[] — freeinv of child is a no-op (C removes
        // the split child from the invent chain).
    } else {
        const inv = game.invent || [];
        const idx = inv.indexOf(ygold);
        if (idx >= 0) inv.splice(idx, 1);
    }
    if (!ygold) return 0;
    ygold.where = OBJ_MINVENT;
    add_to_minv(mon, ygold);
    // Mirror C freeinv_core COIN botl refresh via cached wallet.
    game._goldCount = Math.max(0, (game._goldCount || 0) - amount);
    if (game.flags) game.flags.botl = true;
    return amount;
}

/**
 * C ref: shk.c setpaid — clear bill counters (unpaid/no_charge walks deferred).
 */
function setpaid(shkp) {
    // clear_unpaid / clear_no_charge / billobjs deferred
    if (!shkp) return;
    const eshk = ESHK(shkp);
    if (!eshk) return;
    eshk.billct = 0;
    eshk.credit = 0;
    eshk.debit = 0;
    eshk.loan = 0;
}

/** C ref: shk.c rile_shk — angry + surcharge on bill (bill walk deferred). */
function rile_shk(shkp) {
    if (!shkp) return;
    shkp.mpeaceful = 0;
    const eshk = ESHK(shkp);
    if (eshk && !eshk.surcharge) {
        eshk.surcharge = true;
        // bill_p price bump deferred when billct==0 (common for angry combat)
    }
}

/**
 * C ref: shk.c next_shkp — next live isshk; optional withbill filter.
 */
function next_shkp(startIdx, withbill) {
    const fmon = game.fmon || [];
    for (let i = startIdx; i < fmon.length; i++) {
        const shkp = fmon[i];
        if (!shkp || ((shkp.mhp | 0) < 1)) continue;
        if (!shkp.isshk) continue;
        const eshk = ESHK(shkp);
        if (!eshk) continue;
        if ((eshk.billct | 0) || !withbill) {
            if (ANGRY(shkp) && !eshk.surcharge) rile_shk(shkp);
            return { shkp, nextIdx: i + 1 };
        }
    }
    return { shkp: null, nextIdx: fmon.length };
}

/** C ref: shk.c addupbill — stub 0 until bill_p walk ported. */
function addupbill(_shkp) {
    return 0;
}

/**
 * C ref: shk.c rouse_shk — wake/unfreeze; verbosely pline deferred here
 * (inherits passes FALSE).
 */
function rouse_shk(shkp, _verbosely) {
    if (!helpless(shkp)) return;
    shkp.msleeping = 0;
    shkp.mfrozen = 0;
    shkp.mcanmove = 1;
}

/**
 * C ref: shk.c home_shk — return to shk.x,shk.y (mnearto/RLOC deferred).
 */
function home_shk(shkp, _killkops) {
    const eshk = ESHK(shkp);
    if (!eshk?.shk) return;
    const x = eshk.shk.x | 0;
    const y = eshk.shk.y | 0;
    const ox = shkp.mx;
    const oy = shkp.my;
    if (ox === x && oy === y) return;
    shkp.mx = x;
    shkp.my = y;
    if (ox != null && oy != null) newsym(ox, oy);
    newsym(x, y);
    if (game.level?.flags) game.level.flags.has_shop = 1;
    // after_shk_move / kops deferred
}

/** C ref: shk.c costly_adjacent — edge or free spot. */
function costly_adjacent(shkp, x, y) {
    if (!shkp || !inhishop(shkp) || !isok(x, y)) return false;
    const eshk = ESHK(shkp);
    const loc = game.level?.at?.(x, y);
    return !!(loc?.edge || (x === (eshk.shk?.x | 0) && y === (eshk.shk?.y | 0)));
}

/**
 * C ref: shk.c set_repo_loc — where finish_paybill drops invent.
 */
function set_repo_loc(shkp) {
    if (!game.repo) game.repo = { location: { x: 0, y: 0 }, shopkeeper: null };
    if (game.repo.shopkeeper) return;
    const eshk = ESHK(shkp);
    const u = game.u || {};
    let ox = u.ux ? u.ux : (u.ux0 | 0);
    let oy = u.ux ? u.uy : (u.uy0 | 0);
    if (!uin_shoproom(eshk.shoproom) || costly_adjacent(shkp, ox, oy)) {
        ox = eshk.shk?.x | 0;
        oy = eshk.shk?.y | 0;
        const sgn = (n) => (n > 0 ? 1 : n < 0 ? -1 : 0);
        ox += sgn(ox - (eshk.shd?.x | 0));
        oy += sgn(oy - (eshk.shd?.y | 0));
    }
    game.repo.location = { x: ox, y: oy };
    game.repo.shopkeeper = shkp;
}

/** Remove nonlocal shk from fmon (full mongone deferred). */
function mongone_nonlocal(mtmp) {
    const fmon = game.fmon || [];
    const i = fmon.indexOf(mtmp);
    if (i >= 0) fmon.splice(i, 1);
    const eshk = ESHK(mtmp);
    if (eshk) {
        const room = game.level?.rooms?.[((eshk.shoproom | 0) - ROOMOFFSET)];
        if (room?.resident === mtmp) room.resident = null;
    }
}

/**
 * C ref: shk.c inherits — first shk may take invent; pline possessions.
 * Covered: numsk==1 angry/following/owed → "takes all your possessions";
 * peaceful in-shop inherit; numsk>1 corpse glance (+ optional rn2).
 * Deferred: partial gold owed arm currency pline; mbodypart/noit_mhis text.
 */
async function inherits(shkp, numsk, croaked, silently) {
    const eshkp = ESHK(shkp);
    if (!eshkp) return false;
    let loss = 0;
    let take = false;
    let taken = false;
    const uinshop = uin_shoproom(eshkp.shoproom);
    let takes = '';

    shkp.minvis = 0;
    shkp.perminvis = 0;

    if (numsk > 1) {
        if (cansee(shkp.mx, shkp.my) && croaked && !silently) {
            takes = '';
            if (has_head(shkp.data) && !rn2(2)) {
                takes = `, shakes ${shkp.female ? 'her' : 'his'} head,`;
            }
            await pline(
                `${Shknam(shkp)} ${helpless(shkp) ? 'wakes up, ' : ''}looks at your corpse${takes} and ${!inhishop(shkp) ? 'disappears' : 'sighs'}.`,
            );
        }
        taken = uinshop;
        // skip → rouse/home below
        rouse_shk(shkp, false);
        if (!inhishop(shkp)) home_shk(shkp, false);
        setpaid(shkp);
        if (taken) set_repo_loc(shkp);
        return taken;
    }

    // peaceful shop death, nothing owed
    if (uinshop && inhishop(shkp) && !(eshkp.billct | 0)
        && !(eshkp.robbed | 0) && !(eshkp.debit | 0) && !ANGRY(shkp)
        && !eshkp.following
        && ((game.u?.ugrave_arise ?? LOW_PM - 1) < LOW_PM)) {
        taken = !!(game.invent && game.invent.length);
        if (taken && !silently) {
            await pline(
                `${Shknam(shkp)} gratefully inherits all your possessions.`,
            );
        }
        setpaid(shkp);
        if (taken) set_repo_loc(shkp);
        return taken;
    }

    if ((eshkp.billct | 0) || (eshkp.debit | 0) || (eshkp.robbed | 0)) {
        if (uinshop && inhishop(shkp)) {
            loss = addupbill(shkp) + (eshkp.debit | 0);
        }
        if (loss < (eshkp.robbed | 0)) loss = eshkp.robbed | 0;
        take = true;
    }

    if (eshkp.following || ANGRY(shkp) || take) {
        if (!(game.invent && game.invent.length)) {
            rouse_shk(shkp, false);
            if (!inhishop(shkp)) home_shk(shkp, false);
            setpaid(shkp);
            return false;
        }
        const umoney = money_cnt(game.invent);
        takes = '';
        if (helpless(shkp)) takes += 'wakes up and ';
        if (!m_next2u(shkp)) takes += 'comes and ';
        takes += 'takes';

        if (loss > umoney || !loss || uinshop) {
            eshkp.robbed = (eshkp.robbed | 0) - umoney;
            if (eshkp.robbed < 0) eshkp.robbed = 0;
            if (umoney > 0) money2mon(shkp, umoney);
            if (!silently) {
                await pline(
                    `${Shknam(shkp)} ${takes} all your possessions.`,
                );
            }
            taken = true;
        } else {
            money2mon(shkp, loss);
            if (!silently) {
                // currency / customer / noit_mhim deferred — rare partial path
                await pline(
                    `${Shknam(shkp)} ${takes} the ${loss} gold pieces owed ${shkp.female ? 'her' : 'him'}.`,
                );
            }
            pacify_shk(shkp, false);
            eshkp.following = 0;
            eshkp.robbed = 0;
        }
        rouse_shk(shkp, false);
        if (!inhishop(shkp)) home_shk(shkp, false);
    }
    setpaid(shkp);
    if (taken) set_repo_loc(shkp);
    return taken;
}

/**
 * C ref: shk.c paybill — prioritize shk; inherits may pline before message flush.
 * croaked: -1 escaped, 0 quit, 1 died.
 */
export async function paybill(croaked, silently) {
    if (croaked < 0) return false;

    if (!game.repo) game.repo = { location: { x: 0, y: 0 }, shopkeeper: null };
    game.repo.location = { x: 0, y: 0 };
    game.repo.shopkeeper = null;

    let resident = null;
    let creditor = null;
    let hostile = null;
    let localshk = null;

    let { shkp: mtmp, nextIdx } = next_shkp(0, false);
    while (mtmp) {
        const eshkp = ESHK(mtmp);
        const local = on_level(eshkp?.shoplevel, game.u?.uz);
        if (local && uin_shoproom(eshkp.shoproom)) {
            if (!resident || (eshkp.billct | 0) || (eshkp.debit | 0)
                || (eshkp.robbed | 0)) {
                resident = mtmp;
            }
        } else if ((eshkp.billct | 0) || (eshkp.debit | 0) || (eshkp.robbed | 0)) {
            if (!creditor) creditor = mtmp;
        } else if (eshkp.following || ANGRY(mtmp)) {
            if (!hostile) hostile = mtmp;
        } else if (local) {
            if (!localshk) localshk = mtmp;
        }
        ({ shkp: mtmp, nextIdx } = next_shkp(nextIdx, false));
    }

    const firstshk = resident || creditor || hostile || localshk;
    let numsk = 0;
    let taken = false;
    if (firstshk) {
        numsk++;
        taken = await inherits(firstshk, numsk, croaked, silently);
    }

    // Re-scan: other shks + mongone nonlocal (snapshot — mongone mutates fmon)
    const shks = [];
    ({ shkp: mtmp, nextIdx } = next_shkp(0, false));
    while (mtmp) {
        shks.push(mtmp);
        ({ shkp: mtmp, nextIdx } = next_shkp(nextIdx, false));
    }
    for (const m of shks) {
        const eshkp = ESHK(m);
        const local = on_level(eshkp?.shoplevel, game.u?.uz);
        if (m !== firstshk) {
            numsk++;
            taken = (await inherits(m, numsk, croaked, silently)) || taken;
        }
        if (!local) mongone_nonlocal(m);
    }
    return taken;
}

/** C shk.c billitem_status FullyIntact — ordinary unpaid. */
const FullyIntact = 4;
/** C shk.c PAY_* dopayobj results. */
const PAY_BUY = 1;

/**
 * C ref: mkobj.c find_oid — invent walk (floor/buried/billobjs deferred).
 */
function bp_to_obj(bp) {
    const id = bp?.bo_id | 0;
    if (!id) return null;
    for (const o of game.invent || []) {
        if ((o?.o_id | 0) === id) return o;
    }
    return null;
}

/**
 * C ref: shk.c check_credit — apply shop credit toward tmp.
 * Named omissions: pline_The credit messages (silent when credit==0).
 */
function check_credit(tmp, shkp) {
    const eshkp = ESHK(shkp);
    let credit = eshkp?.credit | 0;
    if (!credit) return tmp;
    if (credit >= tmp) {
        eshkp.credit = credit - tmp;
        return 0;
    }
    eshkp.credit = 0;
    return tmp - credit;
}

/**
 * C ref: shk.c pay — money2mon after credit; robbed trim deferred detail.
 */
function pay(tmp, shkp) {
    const eshkp = ESHK(shkp);
    const robbed = eshkp?.robbed | 0;
    const balance = tmp <= 0 ? tmp : check_credit(tmp, shkp);
    if (balance > 0) money2mon(shkp, balance);
    // money2u credit-refund deferred
    if (game.flags) game.flags.botl = true;
    if (robbed && eshkp) {
        eshkp.robbed = Math.max(0, robbed - tmp);
    }
}

/**
 * C ref: shk.c make_itemized_bill — FullyIntact invent unpaid only.
 * Deferred: used-up / PartlyIntact / container KnownContainer arms; qsort.
 */
function make_itemized_bill(shkp) {
    const eshkp = ESHK(shkp);
    const bill = eshkp?.bill_p || eshkp?.bill || [];
    const ibill = [];
    const ebillct = eshkp?.billct | 0;
    for (let i = 0; i < ebillct; i++) {
        const bp = bill[i];
        const otmp = bp_to_obj(bp);
        if (!otmp) continue;
        // containers / used-up billobjs deferred
        if (Has_contents(otmp)) continue;
        const quan = otmp.quan | 0;
        const cost = (bp.price | 0) * quan;
        ibill.push({
            obj: otmp,
            quan,
            cost,
            bidx: i,
            usedup: FullyIntact,
            queuedpay: false,
        });
    }
    return ibill;
}

/**
 * C ref: shk.c menu_pick_pay_items — PICK_ANY "Pay for which items?".
 * Letter toggle; Return confirms; ESC cancels. SELECT_ALL `.` deferred
 * (session uses item letter `a`).
 */
async function menu_pick_pay_items(ibill) {
    if (!ibill.length) return 0;
    let largest = 0;
    for (const e of ibill) {
        if ((e.cost | 0) > largest) largest = e.cost | 0;
    }
    const amtWidth = String(largest).length;
    const items = ibill.map((e, i) => ({
        ibillIdx: i,
        letch: String.fromCharCode('a'.charCodeAt(0) + i),
        selected: false,
        cost: e.cost | 0,
        obj: e.obj,
    }));

    for (;;) {
        const entries = [
            { text: 'Pay for which items?', attr: ATR_INVERSE },
            { text: '', attr: 0 },
        ];
        for (const it of items) {
            const mark = it.selected ? '+' : '-';
            const nm = paydoname(it.obj);
            const amt = String(it.cost).padStart(amtWidth, ' ');
            entries.push({
                text: `${it.letch} ${mark} ${amt} Zm, ${nm}`,
                attr: 0,
            });
        }
        await paint_corner_nhw_menu(entries, '(end) ');
        await flush_screen(1);
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);

        if (key === 27) return 0;
        if (key === 13 || key === 10 || key === 32) {
            let n = 0;
            for (const it of items) {
                if (!it.selected) continue;
                ibill[it.ibillIdx].queuedpay = true;
                n++;
            }
            return n;
        }
        const ch = String.fromCharCode(key);
        const hit = items.find((it) => it.letch === ch);
        if (hit) hit.selected = !hit.selected;
        // invalid (incl. stray `p`/`y`/`W`) → re-prompt like C select_menu
    }
}

/**
 * C ref: shk.c update_bill — clear unpaid; swap-remove bill slot.
 * PartlyUsedUp / OBJ_ONBILL dealloc deferred.
 */
function update_bill_simple(eshkp, bp, paiditem) {
    paiditem.unpaid = 0;
    const bill = eshkp.bill_p || eshkp.bill;
    const newebillct = (eshkp.billct | 0) - 1;
    const idx = bill.indexOf(bp);
    if (idx >= 0 && newebillct >= 0) {
        bill[idx] = bill[newebillct];
        bill[newebillct] = undefined;
    }
    eshkp.billct = Math.max(0, newebillct);
}

/**
 * C ref: shk.c dopayobj — non-itemize unpaid buy (which==1).
 * Named omissions: itemize yn; partly-used reject; consumed/used-up;
 * insufficient_funds plines; suppress_price quan dance detail.
 */
async function dopayobj(shkp, bp, obj, _which, _itemize, unseen) {
    if (!obj?.unpaid && !bp?.useup) return 0; // not PAY_BUY
    const quan = obj.quan | 0;
    const ltmp = (bp.price | 0) * quan;
    const umoney = money_cnt(game.invent);
    const credit = ESHK(shkp)?.credit | 0;
    if (umoney + credit < ltmp) return 0;

    pay(ltmp, shkp);
    if (!unseen) {
        // C: shk_names_obj → You("bought %s for %ld gold piece%s.%s", …)
        // observe_object/makeknown deferred; paydoname suppresses unpaid
        const nm = paydoname(obj);
        const pcs = ltmp === 1 ? '' : 's';
        await pline(`You bought ${nm} for ${ltmp} gold piece${pcs}.`);
    }
    return PAY_BUY;
}

/**
 * C ref: shk.c pay_billed_items — menu path only (via_menu).
 * Traditional itemize / 'm' toggle deferred; always menu like non-Traditional.
 */
async function pay_billed_items(shkp, ibill, paidRef) {
    const eshkp = ESHK(shkp);
    const umoney = money_cnt(game.invent);
    if (!umoney && !(eshkp?.credit | 0)) {
        await pline('You have no gold or credit.');
        return true;
    }
    if (!await menu_pick_pay_items(ibill)) return true;

    for (let indx = 0; indx < ibill.length; indx++) {
        if (!ibill[indx].queuedpay) continue;
        const otmp = ibill[indx].obj;
        const bidx = ibill[indx].bidx | 0;
        const bp = (eshkp.bill_p || eshkp.bill)[bidx];
        if (!bp || !otmp) continue;
        const buy = await dopayobj(shkp, bp, otmp, 1, false, false);
        if (buy === PAY_BUY) {
            update_bill_simple(eshkp, bp, otmp);
            paidRef.paid = true;
        }
    }
    return true;
}

/**
 * C ref: shk.c dopay — #pay / `p`.
 * Covered: single resident shk; bill menu → money2mon/splitobj next_ident;
 * thank-you verbalize; ECMD_TIME when paid.
 * Deferred: multi-shk getpos; debit; robbed/angry appease; used-up/containers;
 * traditional itemize; mute/Deaf thank-you nod; hidden_gold stashed msgs.
 */
export async function dopay() {
    game.multi = 0;
    let sk = 0;
    let seensk = 0;
    let nexttosk = 0;
    let nxtm = null;
    let resident = null;

    let walk = next_shkp(0, false);
    while (walk.shkp) {
        const m = walk.shkp;
        sk++;
        if (m_next2u(m)) {
            if (!(nxtm && ANGRY(nxtm))) {
                nexttosk++;
                nxtm = m;
            }
        }
        // canspotmon stub: live isshk on map counts as seen
        if ((m.mhp | 0) > 0 && (m.mx | 0) > 0) seensk++;
        const eshk = ESHK(m);
        const ushops0 = (game.u?.ushops || '').charCodeAt(0) || 0;
        if (inhishop(m) && ushops0 === (eshk?.shoproom | 0)) {
            resident = m;
        }
        walk = next_shkp(walk.nextIdx, false);
    }

    let shkp = null;
    if (nxtm && nexttosk === 1) {
        shkp = nxtm;
    } else if ((!sk && !seensk) || (!seensk && sk)) {
        await pline('There appears to be no shopkeeper here to receive your payment.');
        return ECMD_OK;
    } else if (sk === 1 && resident) {
        shkp = resident;
    } else if (seensk === 1) {
        walk = next_shkp(0, false);
        while (walk.shkp) {
            if ((walk.shkp.mhp | 0) > 0 && (walk.shkp.mx | 0) > 0) {
                shkp = walk.shkp;
                break;
            }
            walk = next_shkp(walk.nextIdx, false);
        }
        if (shkp && shkp !== resident && !m_next2u(shkp)) {
            await pline(`${Shknam(shkp)} is not near enough to receive your payment.`);
            return ECMD_OK;
        }
    } else {
        // multi-shk getpos deferred — prefer resident
        shkp = resident;
        if (!shkp) {
            await pline('There appears to be no shopkeeper here to receive your payment.');
            return ECMD_OK;
        }
    }

    const eshkp = ESHK(shkp);
    if (!eshkp) return ECMD_OK;

    if (helpless(shkp)) {
        await pline(`${Shknam(shkp)} ${rn2(2) ? 'seems to be napping' : "doesn't respond"}.`);
        return ECMD_OK;
    }

    // debit / robbed / angry non-bill paths deferred
    if (!(eshkp.billct | 0) && !(eshkp.debit | 0)) {
        await pline(`You do not owe ${shkname(shkp)} anything.`);
        return ECMD_OK;
    }

    let paid = false;
    let pay_done = true;
    if (eshkp.billct | 0) {
        const ibill = make_itemized_bill(shkp);
        const paidRef = { paid: false };
        if (!await pay_billed_items(shkp, ibill, paidRef)) pay_done = false;
        paid = paidRef.paid;
    }

    if (pay_done && !ANGRY(shkp) && paid) {
        const u = game.u;
        const deaf = !!(u?.Deaf || (u?.HDeaf | 0) || (u?.EDeaf | 0));
        if (!deaf && !muteshk(shkp)) {
            const st = shtypes[(eshkp.shoptype | 0) - SHOPBASE];
            const shopNm = st?.name || 'shop';
            const bang = eshkp.surcharge ? '.' : '!';
            await verbalize(
                `Thank you for shopping in ${s_suffix(shkname(shkp))} ${shopNm}${bang}`,
            );
        }
    }

    if (game.iflags) game.iflags.menu_requested = false;
    return paid ? ECMD_TIME : ECMD_OK;
}
