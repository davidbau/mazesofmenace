// @ts-nocheck
// pickup_container.js — use_container() take-out / put-in menu.
// C ref: pickup.c:2959 use_container(), :2721 out_container(), :2552 in_container(),
//        :3252 menu_loot(), :3383 in_or_out_menu(), :1226 query_category(),
//        invent.c addinv/prinv, invent.c:1979 encumber_msg.
//
// use_container for an unlocked, untrapped box).  The interactive flow:
//   1. in_or_out_menu  — "Do what with the <box>?" PICK_ONE menu (':oibrs q').
//   2. on 'o' (take out): menu_loot(0, FALSE).  With flags.menu_style==MENU_FULL,
//      menu_loot calls query_category; a SINGLE object category short-circuits
//      (pickup.c:1288 "no point in actually showing a menu for a single
//      category") and returns that class WITHOUT a menu, so we go straight to
//      query_objlist("Take out what?", box->cobj, ...) — the PICK_ANY item menu.
//   3. out_container on each selected item: obj_extract_self from the box,
//      recompute box weight, addinv to the hero, prinv "<let> - <name>.".
//
// Ordinary non-shop transfers consume no RNG (lift_object for a non-coin,
// non-over-weight item fires no rn2; weight() is RNG-free). Shop payments can
// split gold and allocate an object ID. Another observable effect is
// structural: the taken-out item leaves the box's
// cobj chain and is appended to gi.invent, so the next dog_goal hero-inventory
// food scan (dogmove.c:618) fires obj_resists()->rn2(100) once per inventory

import { ECMD_OK, ECMD_TIME, OBJ_FREE, OBJ_INVENT,
         PARANOID_AUTOALL, PARANOID_CONFIRM,
         SELL_NORMAL, SELL_DELIBERATE, SELL_DONTSELL, OBJ_FLOOR,
         MAY_HIT, MAY_DESTROY, KILLED_BY_AN,
         GETOBJ_EXCLUDE, GETOBJ_EXCLUDE_SELECTABLE,
         GETOBJ_SUGGEST, GETOBJ_PROMPT, GETOBJ_ALLOWCNT,
         NO_MINVENT, MM_ADJACENTOK, MM_NOMSG, FOOT, ONAME_NO_FLAGS,
         HAND, HALLUC, HALLUC_RES } from './const.js';
import { paranoid_ynq } from './paranoid.js';

const COIN_CLASS = 12; /* objclass.h COIN_CLASS — gold */
import { game } from './gstate.js';
import { chest_trap } from './trap.js';
import { nomul } from './allmain.js';
import { pline, urgent_pline, Norep, flush_screen, bot, force_more, canspotmon } from './display.js';
import { build_window_screen, tty_window_offx } from './com_pager.js';
import { nhgetch } from './input.js';
import { weight } from './weight.js';
import { doname_with_price, simpleonames, cxname_singular, getObjDescr, Tobjnam, xname, the, The, otense, oname } from './objnam.js';
/* C ref: pickup.c in_container's freeinv/add_to_container/weight trio. */
import { freeinv, welded, weldmsg, setuwep, setuswapwep, setuqwep, snuff_lit,
         useup, useupf, obj_here, obj_extract_self_general,
         getObjFromGetobj, body_part, u_handsy } from './cmd.js';
import { add_to_container, set_bknown, makemon, set_corpsenm } from './mklev.js';
import { obj_is_burning, get_obj_location } from './light.js';
import { addinv } from './hold_another_object.js';
import { pickup_prinv, fatal_corpse_mistake, lift_object } from './pickup.js';
import { splitobj, unsplitobj, permonstTemplate, removed_from_icebox, set_malign } from './makemon.js';
import { age_is_relative, stop_timer } from './timeout.js';
import { ROT_CORPSE, REVIVE_MON, SHRINK_GLOB } from './const.js';
import { PM_ICE_TROLL, PM_HOUSECAT } from './pm.generated.js';
import { christen_monst } from './mhitm.js';
import { mon_nam, newexplevel } from './uhitm.js';
import { rndmonnam } from './do_name.js';
import { more_experienced } from './exper.js';
import { touch_artifact_youmonst } from './wizcmds.js';
import { Blind } from './vision.js';
/* C ref: mkobj.h Is_box / obj.h welded(); W_ARMOR|W_ACCESSORY owornmask bits. */
import { W_ARMOR, W_ACCESSORY } from './const.js';
const ICE_BOX_OTYP = 216; /* objects.h ICE_BOX (js/pickup.js:153) */
import { observe_object, discover_object } from './o_init.js';
import { sellobj_state, sellobj, costly_spot, shk_your, addtobill, pick_pick,
         currency, shop_keeper, stolen_value } from './shk.js';
import { obfree, scatter, losehp } from './dokick.js';
import { rn2, d } from './rng.js';


function set_cursor(col, row) {
    const disp = game?.nhDisplay;
    if (disp) {
        disp.cursorCol = col;
        disp.cursorRow = row;
    }
}

/* C ref: pickup.c:2025 Is_container — LARGE_BOX(214)..BAG_OF_TRICKS(220). */
function Is_container(obj) {
    const otyp = obj ? (obj.otyp | 0) : 0;
    return otyp >= 214 && otyp <= 220;
}

/* C ref: include/obj.h Has_contents — box has a cobj chain. */
function Has_contents(obj) {
    return !!(obj && obj.cobj);
}

/* C obj.h SchroedingersBox: the special flag survives a live observation
 * when no monster can be created, including final disclosure. */
export function SchroedingersBox(obj) {
    return !!obj && obj.otyp === 214 && obj.spe === 1;
}

/* C pickup.c:2826 observe_quantum_cat.  Keep observation separate from opening:
 * disclosure resolves the same draw with both creation and messages disabled. */
export async function observe_quantum_cat(box, makecat, givemsg) {
    const name = "Schroedinger's Cat";
    const alive = !rn2(2);
    const x = { value: 0 }, y = { value: 0 };
    if (get_obj_location(box, x, y, 0)) {
        box.ox = x.value;
        box.oy = y.value;
    }
    const deadcat = box.cobj;
    if (alive) {
        const livecat = makecat
            ? await makemon(permonstTemplate(PM_HOUSECAT), box.ox, box.oy,
                            NO_MINVENT | MM_ADJACENTOK | MM_NOMSG)
            : null;
        if (livecat) {
            livecat.mpeaceful = 1;
            set_malign(livecat);
            if (givemsg) {
                if (!canspotmon(livecat))
                    await pline(`You think something brushed your ${body_part(FOOT)}.`);
                else
                    await pline(`${_Upstart(mon_nam(livecat))} inside the box is still alive!`);
            }
            christen_monst(livecat, name);
            if (deadcat) {
                obj_extract_self_general(deadcat);
                await obfree(deadcat, null);
            }
            box.owt = weight(box);
            box.spe = 0;
            if (!game.context?.mon_moving) {
                more_experienced(10, 20);
                await newexplevel();
            }
        }
    } else {
        box.spe = 0;
        if (givemsg) {
            const props = game.u?.uprops;
            const hallucinating = !!props?.[HALLUC]?.intrinsic
                && !(props?.[HALLUC_RES]?.intrinsic || props?.[HALLUC_RES]?.extrinsic);
            await pline(`The ${hallucinating ? rndmonnam() : 'housecat'} inside the box is dead!`);
        }
        if (deadcat) {
            deadcat.age = game.moves;
            set_corpsenm(deadcat, PM_HOUSECAT);
            oname(deadcat, name, ONAME_NO_FLAGS);
            if (!game.context?.mon_moving) {
                more_experienced(20, 10);
                await newexplevel();
            }
        }
    }
}

/* C pickup.c:2957 stash_ok(), the getobj classifier for use_container's
 * single-item stash action.  The active container remains selectable by an
 * explicitly typed inventory letter so in_container() can give its specific
 * "That would be an interesting topological exercise" refusal. */
export function stash_ok(obj) {
    if (!obj)
        return GETOBJ_EXCLUDE;
    if (!game.current_container || obj === game.current_container)
        return GETOBJ_EXCLUDE_SELECTABLE;
    return GETOBJ_SUGGEST;
}

const BAG_OF_HOLDING_OTYP = 219;
const BAG_OF_TRICKS_OTYP = 220;
const WAN_CANCELLATION_OTYP = 423;

function Is_mbag(obj) {
    const typ = obj?.otyp | 0;
    return typ === BAG_OF_HOLDING_OTYP || typ === BAG_OF_TRICKS_OTYP;
}

/* C pickup.c:2488 mbag_explodes(). */
export function mbag_explodes(obj, depthin) {
    const typ = obj?.otyp | 0;
    if ((typ === WAN_CANCELLATION_OTYP || typ === BAG_OF_TRICKS_OTYP)
        && (obj.spe | 0) <= 0)
        return false;
    if ((Is_mbag(obj) || typ === WAN_CANCELLATION_OTYP)
        && rn2(1 << Math.min(depthin | 0, 7)) <= (depthin | 0))
        return true;
    for (let it = obj?.cobj; it; it = it.nobj)
        if (mbag_explodes(it, (depthin | 0) + 1))
            return true;
    return false;
}

async function mbag_item_gone(held, item, silent) {
    if (!silent) {
        if (item.dknown)
            await pline(`${_Upstart((await _item_doname(item)))} ${otense(item, 'have')} vanished!`);
        else
            await pline(`You ${Blind() ? 'notice' : 'see'} ${(await _item_doname(item))} disappear!`);
    }
    let loss = 0;
    const shop = game.u?.ushops;
    const shkp = shop ? shop_keeper(shop.charCodeAt?.(0) || shop[0]) : null;
    if (shkp && (held ? !!item.unpaid : costly_spot(game.u.ux, game.u.uy)))
        loss = await stolen_value(item, game.u.ux, game.u.uy,
                                  !!shkp.mpeaceful, true);
    await obfree(item, null);
    return loss | 0;
}

async function do_boh_explosion(boh, onFloor) {
    boh.in_use = 1;
    for (let it = boh.cobj; it;) {
        const next = it.nobj;
        if (!rn2(13)) {
            obj_extract_self_general(it);
            await mbag_item_gone(!onFloor, it, true);
        } else {
            it.ox = game.u.ux | 0;
            it.oy = game.u.uy | 0;
            await scatter(it.ox, it.oy, 4, MAY_HIT | MAY_DESTROY, it);
        }
        it = next;
    }
}

async function boh_loss(container, held) {
    if (!Is_mbag(container) || !container.cursed || !Has_contents(container))
        return 0;
    let loss = 0;
    for (let it = container.cobj; it;) {
        const next = it.nobj;
        if (!rn2(13)) {
            obj_extract_self_general(it);
            loss += await mbag_item_gone(held, it, false);
        }
        it = next;
    }
    return loss;
}

function _box_xname(obj) {
    return simpleonames(obj);
}
function _the(str) { return 'the ' + str; }
/* C ref: obj.h:332 carried(o) := ((o)->where == OBJ_INVENT).  Same resolution
 * js/do_wear.js:4023 yname() settled on: this port does not maintain obj.where
 * on every inventory path, so walk the gi.invent chain, which it does maintain. */
function _carried_box(o) {
    if (!o) return false;
    if ((o.where | 0) === 3 /* OBJ_INVENT */) return true;
    for (let p = game.invent; p; p = p.nobj)
        if (p === o) return true;
    return false;
}
function _yname_box(o) {
    let prefix = shk_your('', o);
    // Preserve the existing carried-chain fallback until every acquisition
    // path maintains where; shop ownership takes precedence over "your".
    if (prefix === 'the ' && _carried_box(o)) prefix = 'your ';
    return prefix + _box_xname(o);
}
function _Yname_box(o) {
    return _Upstart(_yname_box(o));
}

async function _item_doname(obj) {
    return await doname_with_price(obj);
}

/* ---------------------------------------------------------------------------
 * obj_extract_self — C ref: mkobj.c obj_extract_self / extract_nobj.
 * Remove obj from whichever chain it lives on.  For a contained item that is
 * box->cobj (linked by nobj); unlink it and clear obj->where to OBJ_FREE. */
function _extract_from_container(box, obj) {
    if (box.cobj === obj) {
        box.cobj = obj.nobj ?? null;
    } else {
        let p = box.cobj;
        while (p && p.nobj !== obj) p = p.nobj;
        if (p) p.nobj = obj.nobj ?? null;
    }
    obj.nobj = null;
    obj.ocontainer = null;
    obj.where = OBJ_FREE;
}

/* ---------------------------------------------------------------------------
 * out_container — C ref: pickup.c:2721.  Take obj out of current_container and
 * add to the hero's inventory after touch and capacity checks. Returns -1
 * to stop looting, 0 when declined, and 1 when an item was removed.
 */
async function out_container(box, obj) {
    const isGold = (obj.oclass | 0) === COIN_CLASS;
    if (isGold) obj.owt = weight(obj);
    if (obj.oartifact) {
        const touched = await touch_artifact_youmonst(obj);
        const blast = game._touch_artifact_blast_msg;
        game._touch_artifact_blast_msg = null;
        if (blast) await force_more(blast);
        if (!touched) {
            await pline('%s your grasp!', Tobjnam(obj, 'evade'));
            return 0;
        }
    }
    if (await fatal_corpse_mistake(obj, false)) return -1;
    const cnt = { v: obj.quan };
    const result = await lift_object(obj, box, cnt, false);
    if (result <= 0) return result;
    const count = cnt.v;
    if (obj.quan !== count && obj.otyp !== 471 /* LOADSTONE */)
        obj = (await splitobj(obj, count));
    _extract_from_container(box, obj);
    box.owt = weight(box);
    if ((box.otyp | 0) === ICE_BOX_OTYP) removed_from_icebox(obj);
    if (!obj.unpaid && !_carried_box(box) && costly_spot(box.ox, box.oy)) {
        obj.ox = box.ox;
        obj.oy = box.oy;
        await addtobill(obj, false, false, false);
    }
    await pick_pick(obj);
    const otmp = await addinv(obj);
    await pickup_prinv(otmp, count, 'removing');
    if (isGold) await bot();
    return 1;
}

async function in_or_out_menu(promptText, box, outokay, inokay, alreadyused, more_containers) {
    const g = game;
    /* tty display_nhwindow pages an occupied message window before painting a
     * menu over it.  This is observable after ':' reports an empty container. */
    if (g._pending_message)
        await force_more(g._pending_message);
    const boxname = _box_xname(box);
    /* Menu lines mirror C in_or_out_menu add_menu order: ':', then (outokay) 'o',
     * (inokay) 'i', (outokay) 'b', (inokay) 'r'+'s', blank, (more) 'n', 'q'. */
    const lines = [];
    lines.push(`\x1b[7m${promptText}\x1b[0m`);
    lines.push('');
    const LOOTCHARS = '_:oibrsnq';
    const ABC_CHARS = '_:abcdenq';
    const sel = (g.flags && g.flags.lootabc) ? ABC_CHARS : LOOTCHARS;
    /* {disp, canon} in display order — `disp` is the key C paints and accepts,
     * `canon` is what in_or_out_menu hands back to menu_loot. */
    const items = [];
    const additem = (idx, text) => {
        lines.push(`${sel[idx]} - ${text}`);
        items.push({ disp: sel[idx], canon: LOOTCHARS[idx] });
    };
    additem(1, `Look inside the ${boxname}`);
    if (outokay) additem(2, 'take something out');
    if (inokay)  additem(3, 'put something in');
    if (outokay) additem(4, `${inokay ? 'both; ' : ''}take out, then put in`);
    if (inokay) {
        additem(5, `${outokay ? 'both reversed; ' : ''}put in, then take out`);
        additem(6, `stash one item into the ${boxname}`);
    }
    lines.push('');
    if (more_containers) additem(7, 'loot next container');
    /* 'q' default-selected when no next container: shown with '*'. */
    const qDefault = !more_containers;
    lines.push(`${sel[8]} ${qDefault ? '*' : '-'} ${alreadyused ? 'done' : 'do nothing'}`);
    items.push({ disp: sel[8], canon: LOOTCHARS[8] });
    lines.push('(end)');

    const maxLen = lines.reduce((m, ln) => {
        const vis = ln.replace(/\x1b\[[0-9;]*m/g, '');
        return Math.max(m, vis.length);
    }, 0);
    /* tty window origin is capped at column 41 even for a narrow menu. */
    const WIN_COL = Math.min(41, 80 - maxLen - 2);
    const uac = g.u?.uac ?? 0;
    const screenOutput = build_window_screen(lines, WIN_COL, uac);
    const endRow = lines.length - 1;
    const endCursorCol = WIN_COL + 5 + 1; /* WIN_COL + len('(end)') + 1 */

    const BYKEY = new Map(items.map((it) => [it.disp.charCodeAt(0), it.canon]));
    const cancelDefault = qDefault ? 'q' : 'n';
    let chosen = cancelDefault;
    while (true) {
        g._screen_output = screenOutput;
        set_cursor(endCursorCol, endRow);
        const k = await nhgetch();
        if (k === 27 /* ESC */) { chosen = 'q'; break; }
        if (k === 32 /* SPACE */) { chosen = cancelDefault; break; }
        /* RETURN/ENTER selects the default (the SELECTED entry: 'q' or 'n'). */
        if (k === 10 || k === 13) { chosen = cancelDefault; break; }
        if (BYKEY.has(k)) { chosen = BYKEY.get(k); break; }
        /* C tty: any other non-accelerator key is ignored; menu stays up. */
    }
    g._pending_message = '';
    await flush_screen(1);
    return chosen;
}

/* C ref: options.c:136 def_inv_order and invent.c:4789 let_to_name's names[] —
 * the class ORDER query_category walks (`pack = flags.inv_order`) and the class
 * HEADING each entry shows.  Same two tables js/cmd.js's display_pickinv uses. */
const _QC_INV_ORDER = [12, 5, 2, 3, 7, 9, 10, 8, 4, 11, 6, 13, 14, 15, 16];
const _QC_CLASS_NAME = {
    1: 'Illegal objects', 2: 'Weapons', 3: 'Armor', 4: 'Rings', 5: 'Amulets',
    6: 'Tools', 7: 'Comestibles', 8: 'Potions', 9: 'Scrolls', 10: 'Spellbooks',
    11: 'Wands', 12: 'Coins', 13: 'Gems/Stones', 14: 'Boulders/Statues',
    15: 'Iron balls', 16: 'Chains',
};
/* C ref: include/defsym.h OBJCLASS() column 2 — def_oc_syms[oclass].sym, the
 * class symbol add_menu() is handed as each class/object row's GROUP
 * accelerator (pickup.c:1378, :1136). */
const _QC_CLASS_SYM = {
    1: ']', 2: ')', 3: '[', 4: '=', 5: '"', 6: '(', 7: '%', 8: '!', 9: '?',
    10: '+', 11: '/', 12: '$', 13: '*', 14: '`', 15: '0', 16: '_',
};

/* C ref: invent.c:259-297 loot_classify's FOOD_CLASS subclass switch.  The
 * other classes' subclass tables (ARMOR oc_armcat, WEAPON oc_skill, TOOL
 * container/instrument, GEM oc_material x discovery) are NOT ported and fall to
 * C's own `default: k = 1`; stated rather than faked, and no worse than the
 * previous state, which had no subclass tier at all. */
/* otyps resolved from js/oc_name_data.js OC_NAME (the generated objects.h
 * name table), not guessed: slime mold 285, tin 296, egg 266, corpse 265. */
const _SLIME_MOLD_OTYP = 285, _TIN_OTYP = 296, _EGG_OTYP = 266, _CORPSE_OTYP = 265;
function _loot_subclass(obj) {
    if ((obj.oclass | 0) !== 7 /* FOOD_CLASS */)
        return 1;
    switch (obj.otyp | 0) {
    case _SLIME_MOLD_OTYP: return 1;
    case _TIN_OTYP:        return 3;
    case _EGG_OTYP:        return 4;
    case _CORPSE_OTYP:     return 5;
    default:               return obj.globby ? 6 : 2;
    }
}
/* C ref: invent.c:295-300 — discovery status:
 *     !seen ? 1 : (discovered || !OBJ_DESCR(objects[otyp])) ? 4
 *       : objects[otyp].oc_uname ? 3 : 2
 * "first unseen, then seen but not named or discovered, then named, lastly
 * discovered".  oc_uname (a player-assigned type name) has no JS storage, so
 * the 3 tier cannot fire; stated. */
function _loot_disco(obj) {
    const otyp = obj.otyp | 0;
    if (!(obj.dknown | 0)) return 1;
    const discovered = !!(game._oc_name_known && game._oc_name_known[otyp]);
    if (discovered || !getObjDescr(otyp)) return 4;
    return 2;
}
/* C ref: invent.c:309-380 loot_xname(obj) — cxname_singular() with the
 * prefixes that would perturb alphabetical order suppressed (potion dilution,
 * water's holy/unholy, towel wetness, glob size, a user-assigned name).  None
 * of those five can fire for the objects this port sorts today; the base call
 * is what orders "jackal corpse" before "kobold corpse". */
function _loot_xname(obj) {
    return String(cxname_singular(obj) || '');
}
function _loot_classify(obj) {
    /* C invent.c:170-171 — the dknown side effect; Blind is not tracked on
     * this path (a blind hero cannot read a container menu's item names
     * either, so the gap is self-cancelling here). */
    if (!Blind()) observe_object(obj);   /* C invent.c:170-171 */
    /* C invent.c:174-181 — class order.  flags.sortpack is On by default
     * (optlist.h:687 opt_out/On), so the table is flags.inv_order. */
    const k = _QC_INV_ORDER.indexOf(obj.oclass | 0);
    return (k >= 0) ? (1 + k) : (1 + _QC_INV_ORDER.length + 1);
}
/* C invent.c invletter_value(), including overflow and gold letters. */
function _invletter_value(letter) {
    const c = letter | 0;
    return c >= 97 && c <= 122 ? c - 97 + 2
        : c >= 65 && c <= 90 ? c - 65 + 28
        : c === 36 ? 1 : c === 35 ? 54 : 55;
}
function _sortloot(list, byInvlet = false) {
    const arr = [];
    for (let o = list; o; o = o.nobj) arr.push({ obj: o, indx: arr.length, orderclass: 0 });
    /* C invent.c:632 — `if (mode && n > 1)`; no comparisons, no classify. */
    if (arr.length > 1) {
        for (const sli of arr) {
            sli.orderclass = _loot_classify(sli.obj);
            sli.subclass = _loot_subclass(sli.obj);
            sli.disco = _loot_disco(sli.obj);
            sli.str = _loot_xname(sli.obj);
            /* C invent.c:404-405 — the BUCX tier, "bigger is better". */
            sli.bucx = (sli.obj.bknown
                        ? (sli.obj.blessed ? 3 : !sli.obj.cursed ? 2 : 1) : 0);
        }
        arr.sort((a, b) => {
            const classOrder = a.orderclass - b.orderclass;
            if (classOrder) return classOrder;
            /* C SORTLOOT_PACK|SORTLOOT_INVLET skips subclass, discovery,
             * and name tiers. Inventory selection retains letter order. */
            if (byInvlet)
                return _invletter_value(a.obj.invlet) - _invletter_value(b.obj.invlet)
                    || (a.indx - b.indx);
            return (a.subclass - b.subclass)
                || (a.disco - b.disco)
                || _strcmpi(a.str, b.str)
                || (b.bucx - a.bucx)
                || (a.indx - b.indx);
        });
    }
    return arr.map((sli) => sli.obj);
}
/* C ref: hacklib.c strcmpi() — case-insensitive strcmp; returns the sign of the
 * first differing BYTE, so it must NOT be localeCompare (which collates). */
function _strcmpi(a, b) {
    const x = String(a).toLowerCase(), y = String(b).toLowerCase();
    if (x === y) return 0;
    const n = Math.min(x.length, y.length);
    for (let i = 0; i < n; i++) {
        const d = x.charCodeAt(i) - y.charCodeAt(i);
        if (d) return d;
    }
    return x.length - y.length;
}

export async function container_contents(list, identified, all_containers, reportempty,
                                        statusClipCol = undefined) {
    /* C:1604/1668 — `for (box = list; box; box = box->nobj) { ... if
     * (!all_containers) break; }`.  This was written as a single-box function
     * because its only caller (use_container) passes the box itself with
     * all_containers FALSE, which is the one-iteration case.  end.c:639's
     * disclosure call passes gi.invent with all_containers TRUE and needs the
     * real walk. */
    for (let box = list; box; box = box.nobj) {
        await _container_contents_one(box, identified, all_containers, reportempty,
                                      statusClipCol);
        if (!all_containers)
            break;
    }
}
async function _container_contents_one(box, identified, all_containers, reportempty,
                                       statusClipCol = undefined) {
    const g = game;
    if (!(Is_container(box) || (box.otyp | 0) === 476 /* STATUE */))
        return;
    /* C:1606-1611 */
    if (!box.cknown || (identified && !box.lknown)) {
        box.cknown = 1; /* we're looking at the contents now */
        if (identified)
            box.lknown = 1;
        /* update_inventory(): pure display refresh. */
    }
    /* C:1612-1613 — BAG_OF_TRICKS is the wrong type of container. */
    if ((box.otyp | 0) === 220 /* BAG_OF_TRICKS */)
        return;
    if (box.cobj) {
        const cat = SchroedingersBox(box);
        const lines = [];
        /* C:1624-1625 */
        lines.push(`Contents of ${_the(_box_xname(box))}:`);
        /* C:1626-1627 — the blank line is skipped only while dumping. */
        lines.push('');
        /* C:1628 buf[0] = buf[1] = ' ' — every item row carries two leading
         * spaces, which build_window_screen() renders as an indent from the
         * window column. */
        if (!cat) {
            for (const obj of _sortloot(box.cobj)) {
                if (identified) {
                    /* C end.c:1640-1646 — identified listings discover and
                     * fully identify each contained object. */
                    discover_object(obj.otyp | 0, true, true, false);
                    obj.dknown = 1;
                    obj.known = 1;
                    obj.bknown = 1;
                    obj.rknown = 1;
                    if (Is_container(obj) || (obj.otyp | 0) === 476 /* STATUE */) {
                        obj.cknown = 1;
                        obj.lknown = 1;
                    }
                }
                lines.push('  ' + (await _item_doname(obj)));
            }
        } else {
            lines.push("  Schroedinger's cat!");
        }
        /* C:1655 display_nhwindow(tmpwin, TRUE) -> process_text_window. */
        lines.push('--More--');
        const WIN_COL = tty_window_offx(lines, 'more');
        const uac = g.u?.uac ?? 0;
        const moreRow = lines.length - 1;
        const moreCursorCol = WIN_COL + '--More--'.length;
        /* The disclosure inventory menu is dismissed immediately before this
         * text window.  tty_dismiss_nhwindow()'s docorner clears the right
         * part of both status rows, and process_text_window does not repaint
         * those rows.  Carry the previous menu's surviving prefix into this
         * frame (end.c disclose() passes it); ordinary container lookups have
         * no predecessor clip and retain the normal full status. */
        const screenOutput = build_window_screen(lines, WIN_COL, uac,
                                                 statusClipCol);
        /* C wintty.c:1546 — a pending topline is paged before the window
         * covers it (tty_display_nhwindow(WIN_MESSAGE, TRUE)). */
        for (;;) {
            g._screen_output = screenOutput;
            set_cursor(moreCursorCol, moreRow);
            const raw = await nhgetch();
            const k = typeof raw === 'number' ? raw : (raw?.charCodeAt(0) ?? 0);
            /* C dmore(cw, quitchars) -> xwaitforspace(" \r\n\033"). */
            if (k === 32 || k === 10 || k === 13 || k === 27)
                break;
        }
        g._pending_message = '';
        await flush_screen(1);
        /* C:1658-1660 — `if (all_containers) container_contents(box->cobj,
         * identified, TRUE, reportempty);` — recurse into nested boxes. */
        if (all_containers)
            await container_contents(box.cobj, identified, true, reportempty,
                                     statusClipCol);
    } else if (reportempty) {
        /* C:1663-1664 */
        /* C pickup.c:3139 pline1(emptymsg), built at pickup.c:3084 from
         * Ysimple_name2(container) — "The bag is empty.", article included.
         * The article was MISSING here, so this site said "Bag is empty." */
        await pline(`${_Upstart(_the(_box_xname(box)))} is empty.`);
    }
}

/* C ref: objnam.c upstart() over thesimpleoname() — "The large box is empty."
 * thesimpleoname prefixes "the"; upstart capitalises the first letter. */
function _Upstart(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

const _MENU_SELECT_ALL = 0x2e /* '.' */, _MENU_UNSELECT_ALL = 0x2d /* '-' */,
      _MENU_INVERT_ALL = 0x40 /* '@' */, _MENU_SELECT_PAGE = 0x2c /* ',' */,
      _MENU_UNSELECT_PAGE = 0x5c /* '\\' */, _MENU_INVERT_PAGE = 0x7e /* '~' */;
function _invert_test(mode, skipinvert, is_selected) {
    if (!skipinvert)
        return true;
    return is_selected ? true : false;
}
async function _tty_pick_any_menu(renderLines, items, winColFooter) {
    const g = game;
    /* Same tty window boundary as in_or_out_menu: an insertion message must be
     * acknowledged before reversed looting opens its take-out menu. */
    if (g._pending_message)
        await force_more(g._pending_message);
    let count = 0, counting = false;
    let page = 0;
    const bulk = (mode, apply) => {
        for (const it of items) {
            if (!_invert_test(mode, it.skipinvert,
                              mode === 0 ? it.selected : (mode === 2)))
                continue;
            apply(it);
        }
    };
    for (;;) {
        const allLines = renderLines();
        /* tty_end_menu fits 23 menu rows above the page indicator on a
         * 24-row terminal.  Short menus retain their ordinary `(end)` row;
         * tall ones replace that synthetic row with `(N of M)`. */
        const tall = allLines.length > 24;
        const body = tall && allLines[allLines.length - 1] === '(end)'
            ? allLines.slice(0, -1) : allLines;
        const pageSize = 23;
        const pageCount = tall ? Math.ceil(body.length / pageSize) : 1;
        if (page >= pageCount) page = pageCount - 1;
        const start = page * pageSize, end = Math.min(body.length, start + pageSize);
        let lines = tall
            ? [...body.slice(start, end), `(${page + 1} of ${pageCount})`]
            : allLines;
        const footerRow = lines.length - 1;
        const lineItems = allLines._itemsByLine || [];
        const visibleItems = new Set(lineItems.slice(start, end).filter(Boolean));
        if (tall) {
            /* tty menus remain full-screen even when the last page is short;
             * blank every physical row below its immediate page footer. */
            /* A single blank is truthy to the overlay composer, so rows 22/23
             * are erased as window rows rather than repainted as status. */
            while (lines.length < 24) lines.push('');
        }
        /* tty_end_menu promotes a menu which fills rows-1 to the full-screen
         * layout at column 1; shorter menus are right-aligned overlays. */
        const WIN_COL = tall ? 1 : lines.length >= 24 ? 1
            : tty_window_offx(lines, winColFooter);
        const uac = g.u?.uac ?? 0;
        g._pending_message = '';
        g._topl_sticky = null;
        g._screen_output = build_window_screen(lines, WIN_COL, uac,
                                               tall ? 0 : undefined);
        set_cursor(tall
            ? WIN_COL + String(lines[footerRow] || '').length
            : WIN_COL + 6,
            tall ? footerRow : lines.length - 1);
        const raw = await nhgetch();
        const k = typeof raw === 'number' ? raw : (raw?.charCodeAt(0) ?? 0);
        const ch = String.fromCharCode(k);
        /* C wintty.c:1552-1558 — explicit menu selection outranks a mapped
         * menu command with the same spelling. */
        const hit = items.find((it) => it.sel === ch
            && (!tall || visibleItems.has(it)));
        if (hit) {
            if (counting && count > 0) {
                hit.selected = true;
                hit.count = count;
            } else {
                hit.selected = !hit.selected;
                hit.count = -1;
            }
            count = 0;
            counting = false;
            continue;
        }
        if (k >= 48 && k <= 57) {
            const digit = k - 48;
            const next = count * 10 + digit;
            if (Number.isSafeInteger(next)) count = next;
            if (count !== 0) counting = true; /* ignore leading zeroes */
            continue;
        }
        if (k === 27) { /* ESC cancels a count first, then the whole menu */
            if (counting) {
                count = 0;
                counting = false;
                continue;
            }
            for (const it of items) it.selected = false;
            return true; /* cancelled */
        }
        if (k === 10 || k === 13) /* Return commits from any page */
            return false;
        if (k === 32 || k === 62 /* > */) {
            count = 0; counting = false;
            if (page < pageCount - 1) { page++; continue; }
            if (k === 32) return false; /* space finishes on the last page */
            continue;                  /* > is inert there */
        }
        if (k === 60 /* < */) {
            count = 0; counting = false;
            if (page > 0) page--;
            continue;
        }
        if (k === 94 /* ^ */) {
            count = 0; counting = false; page = 0; continue;
        }
        if (k === 124 /* | */) {
            count = 0; counting = false; page = pageCount - 1; continue;
        }
        if (k === _MENU_SELECT_ALL || k === _MENU_SELECT_PAGE) {
            count = 0; counting = false;
            const targets = k === _MENU_SELECT_PAGE ? visibleItems : null;
            bulk(1, (it) => { if (!targets || targets.has(it)) {
                it.selected = true; it.count = -1;
            }});
            continue;
        }
        if (k === _MENU_UNSELECT_ALL || k === _MENU_UNSELECT_PAGE) {
            count = 0; counting = false;
            const targets = k === _MENU_UNSELECT_PAGE ? visibleItems : null;
            bulk(2, (it) => { if (!targets || targets.has(it)) {
                it.selected = false; it.count = -1;
            }});
            continue;
        }
        if (k === _MENU_INVERT_ALL || k === _MENU_INVERT_PAGE) {
            count = 0; counting = false;
            const targets = k === _MENU_INVERT_PAGE ? visibleItems : null;
            bulk(0, (it) => { if (!targets || targets.has(it)) {
                it.selected = !it.selected; it.count = -1;
            }});
            continue;
        }
        /* C:1740-1748 group accelerator — invert every row in that group. */
        if (!counting && ch !== '\0' && items.some((it) => it.gsel === ch)) {
            for (const it of items)
                if (it.gsel === ch) { it.selected = !it.selected; it.count = -1; }
            continue;
        }
        /* C:1735-1739 — anything else rings the bell; the menu stays up. */
        count = 0;
        counting = false;
    }
}

async function query_category_takeout(box) {
    const contents = [];
    for (let o = box.cobj; o; o = o.nobj) contents.push(o);
    return await _query_category(contents, 'Take out', false);
}
/* C ref: pickup.c:1226 query_category(), reached from menu_loot() at :3287
 * with olist = put_in ? gi.invent : current_container->cobj and the SAME
 * mflags (ALL_TYPES | UNPAID_TYPES | BUCX_TYPES | CHOOSE_ALL | JUSTPICKED).
 * The only difference between the take-out and put-in menus is the list it
 * walks and the "%s what type of objects?" action word — plus the 'P' row,
 * which C emits from JUSTPICKED for either direction but which only a put-in
 * list can populate (pickup_prev is set on things the hero just picked up). */
async function _query_category(contents, action, withJustPicked) {

    const _ir = (game.flags && game.flags.initrole != null) ? (game.flags.initrole | 0) : -1;
    /* PM_CLERIC is role index 6 in this port (same shape as js/dogmove.js). */
    const _isCleric = _ir >= 0 ? _ir === 6
        : ((game.urole && game.urole.mnum != null) ? (game.urole.mnum | 0) : -1) === 6;
    const _buc = (o) => {
        /* C invent.c:3554-3555 count_buc: priests always know BUC */
        if (_isCleric) o.bknown = ((o.oclass | 0) !== COIN_CLASS);
        if ((o.oclass | 0) === COIN_CLASS)
            return (game.flags && game.flags.goldX) ? 'X' : 'U';
        if (!o.bknown) return 'X';
        return o.blessed ? 'B' : (o.cursed ? 'C' : 'U');
    };
    /* C's cluster order is alphabetical: B, C, U, X (pickup.c:1404-1433). */
    const _BUC_ROWS = [
        ['B', 'Items known to be Blessed'],
        ['C', 'Items known to be Cursed'],
        ['U', 'Items known to be Uncursed'],
        ['X', 'Items of unknown Bless/Curse status'],
    ];
    const bucPresent = _BUC_ROWS.filter(([c]) => contents.some((o) => _buc(o) === c));
    const num_buc_types = bucPresent.length;

    /* C:1283-1285 — JUSTPICKED is in menu_loot's mflags for BOTH directions. */
    const justPicked = withJustPicked ? contents.filter((o) => o.pickup_prev) : [];

    /* C count_categories(olist, qflags) — distinct oclasses in the list, in
     * flags.inv_order order (the `pack` walk at pickup.c:1348-1372). */
    const present = [];
    for (const oc of _QC_INV_ORDER)
        if (contents.some(o => (o.oclass | 0) === oc)) present.push(oc);
    for (const o of contents) {
        const oc = o.oclass | 0;
        if (!present.includes(oc)) present.push(oc);
    }
    const ccount = present.length;

    /* C pickup.c:1288 — a single category with at most one BUCX entry and no
     * unpaid/usedup rows needs no menu; the class is returned directly. */
    if (ccount === 1 && num_buc_types <= 1)
        return { menuShown: false, autopick: false, lootEverything: false,
                 allCategories: false, classes: new Set(present) };

    const show_a = ccount > 1;   /* ALL_TYPES is always in the take-out flags */
    const bits = game.flags?.paranoia_bits | 0;
    const verifyAll = !!(bits & PARANOID_AUTOALL);
    game.ga ||= {};
    let hintLine = null;
    if (!verifyAll) {
        if (!(game.ga.A_first_hint | 0) || (game.iflags?.cmdassist ?? true))
            hintLine = '    (ignored unless some other choices are also picked)';
        game.ga.A_first_hint = (game.ga.A_first_hint | 0) + 1;
    } else if (show_a) {
        if (!(game.ga.A_second_hint | 0) || (game.iflags?.cmdassist ?? true))
            hintLine = "    (if no other choices are picked, 'a' is implied)";
        game.ga.A_second_hint = (game.ga.A_second_hint | 0) + 1;
    }

    /* Build the menu.  `items` is the SELECTABLE rows in display order, as
     * process_menu_window sees them; `entries` carries the rendering. */
    const entries = [];  /* { key, txt, kind, oclass?, item } */
    const items = [];
    const addrow = (key, txt, kind, oclass, skipinvert, gsel) => {
        const item = { sel: key, gsel: gsel || 0, skipinvert, selected: false };
        entries.push({ key, txt, kind, oclass, item });
        items.push(item);
    };
    /* C:1316-1330 CHOOSE_ALL.  MENU_ITEMFLAGS_SKIPINVERT. */
    addrow('A', 'Auto-select every relevant item', 'A', undefined, true, 0);
    /* C:1349-1359 ALL_TYPES.  Also SKIPINVERT. */
    let invlet = 'a';
    if (show_a) {
        addrow('a', 'All types', 'ALL', undefined, true, 0);
        invlet = 'b';
    }
    for (const oc of present) {
        addrow(invlet, _QC_CLASS_NAME[oc] ?? 'Items', 'CLASS', oc, false,
               _QC_CLASS_SYM[oc] || 0);
        invlet = String.fromCharCode(invlet.charCodeAt(0) + 1);
    }
    /* C:1404-1433 the BUCX cluster; every row SKIPINVERT. */
    for (const [c, txt] of bucPresent)
        addrow(c, txt, 'BUCX', undefined, true, 0);
    /* C:1435-1449 the JUSTPICKED row.  count_justpicked/find_justpicked
     * (pickup.c:635-657) walk the list for obj->pickup_prev; one such item
     * names itself, several become "Items you just picked up".  SKIPINVERT. */
    if (justPicked.length) {
        addrow('P', justPicked.length === 1
                    ? `Just picked up: ${(await _item_doname(justPicked[0]))}`
                    : 'Items you just picked up',
               'P', undefined, true, 0);
    }

    const render = () => {
        const out = [`\x1b[7m${action} what type of objects?\x1b[0m`, ''];
        const itemByLine = [null, null];
        /* C:1387-1391 — ONE blank separator before the whole BUCX cluster,
         * not one per row. */
        let clusterOpened = false;
        for (const e of entries) {
            /* C:1379-1382 — ONE blank line opens the whole
             * unpaid/usedup/BUCX/justpicked block. */
            if ((e.kind === 'BUCX' || e.kind === 'P') && !clusterOpened) {
                out.push('');
                itemByLine.push(null);
                clusterOpened = true;
            }
            out.push(`${e.key} ${e.item.selected ? (e.item.count > 0 ? '#' : '+') : '-'} ${e.txt}`);
            itemByLine.push(e.item);
            if (e.kind === 'A') {
                if (hintLine) { out.push(hintLine); itemByLine.push(null); }
                out.push('');
                itemByLine.push(null);
            }
        }
        out.push('(end)');
        itemByLine.push(null);
        out._itemsByLine = itemByLine;
        return out;
    };

    const cancelled = await _tty_pick_any_menu(render, items, 'end');
    game._pending_message = '';
    await flush_screen(1);
    if (cancelled)
        return { menuShown: true, autopick: false, lootEverything: false,
                 allCategories: false, classes: new Set() };

    let selected = entries.filter((e) => e.item.selected);
    const aIndex = selected.findIndex((e) => e.kind === 'A');
    if (aIndex >= 0 && verifyAll) {
        const answer = await paranoid_ynq(!!(bits & PARANOID_CONFIRM),
                                           'Really autoselect All?', true);
        if (answer === 'n') {
            if (selected.length > 1) {
                selected.splice(aIndex, 1);
            } else {
                /* C query_category: lone A declined under ParanoidAutoAll
                 * becomes the lowercase-a ALL_TYPES_SELECTED choice. */
                selected = [{ kind: 'ALL', item: { selected: true } }];
            }
        } else if (answer !== 'y') {
            return { menuShown: true, autopick: false, lootEverything: false,
                     allCategories: false, classes: new Set() };
        }
    } else if (aIndex >= 0 && selected.length === 1) {
        /* Without paranoid_confirm:A, A is only a modifier for another
         * category choice; by itself query_category rejects it. */
        await pline('No relevant items selected.');
        return { menuShown: true, autopick: false, lootEverything: false,
                 allCategories: false, classes: new Set() };
    }

    /* C pickup.c:3297-3310 keeps AutoAll separate from lowercase-a.  AutoAll
     * bypasses query_objlist and traverses the raw object chain; later class,
     * BUC, or P choices narrow that traversal by clearing loot_everything. */
    let autopick = false;
    let lootEverything = false;
    let allCategories = false;
    let justPickedCount = 0;
    const classes = new Set();
    for (const e of selected) {
        if (e.kind === 'A') {
            autopick = lootEverything = true;
        } else if (e.kind === 'ALL') {
            allCategories = true;
        } else if (e.kind === 'CLASS') {
            classes.add(e.oclass);
            lootEverything = false;
        } else if (e.kind === 'BUCX') {
            classes.add(e.key);
            lootEverything = false;
        }
        /* C:3300-3304 — 'P' sets loot_justpicked and adds 'P' as a valid menu
         * class; loot_everything is cleared.  allow_category's gp.picked_filter
         * arm then accepts only pickup_prev items. */
        else if (e.kind === 'P') {
            classes.add('P');
            justPickedCount = Math.max(0, e.item.count || 0);
            lootEverything = false;
        }
    }
    return { menuShown: true, autopick, lootEverything,
             allCategories, classes, justPickedCount };
}

const _BUCX_KEYS = new Set(['B', 'C', 'U', 'X']);
function _qc_allow(obj, sel) {
    /* C:958-963 gp.picked_filter — 'P' restricts to objects the hero just
     * picked up.  It is an AND with the other filter types, like every other. */
    if (sel.classes.has('P') && !obj.pickup_prev) return false;
    /* C:3297-3300 — 'A' (loot_everything) and ALL_TYPES both reach
     * query_objlist as allow_all, not as allow_category. */
    if (sel.allCategories) return true;
    const classFilter = [...sel.classes].some((c) => typeof c === 'number');
    const bucxFilter = [...sel.classes].some((c) => _BUCX_KEYS.has(c));
    /* C:938-942 — no filter of any kind matches nothing.  'P' IS a filter
     * type, so a lone 'P' pick must not fall into this "nothing selected" arm. */
    if (!classFilter && !bucxFilter) return sel.classes.has('P');
    const oclass = obj.oclass | 0;
    /* C:948-950 — an explicit request for coins overrides everything else. */
    if (oclass === COIN_CLASS && classFilter)
        return sel.classes.has(COIN_CLASS);
    /* C:993-995 */
    if (classFilter && !sel.classes.has(oclass)) return false;
    /* C:1002-1017 */
    if (bucxFilter) {
        const bucx = (oclass === COIN_CLASS)
            ? ((game.flags && game.flags.goldX) ? 'X' : 'U')
            : (!obj.bknown ? 'X' : (obj.blessed ? 'B' : (obj.cursed ? 'C' : 'U')));
        if (!sel.classes.has(bucx)) return false;
    }
    return true;
}

async function menu_loot_takeout(box, eligible) {
    /* C query_objlist lists only the objects the caller's filter accepts;
     * `eligible` IS that filtered list, in cobj order. */
    const contents = eligible || (() => {
        const a = []; for (let o = box.cobj; o; o = o.nobj) a.push(o); return a;
    })();
    /* C pickup.c:3363 `if (!put_in) gc.current_container->cknown = 1;` runs in
     * menu_loot before query_objlist, not here; kept for the eligible-empty
     * path's sake at the call site. */
    box.cknown = 1;
    return await _menu_loot_items(box.cobj, contents, 'Take out', false);
}
/* C ref: pickup.c:3358-3366 menu_loot's put_in call to query_objlist —
 *     mflags = INVORDER_SORT | INCLUDE_VENOM;
 *     if (put_in && flags.invlet_constant) mflags |= USE_INVLET;
 *     ...
 *     query_objlist("Put in what?", &gi.invent, mflags, ..., allow)
 * flags.invlet_constant is the 'fixinv' option, initval On (optlist.h), so the
 * rows are keyed by each object's OWN invlet, not by a fresh a/b/c run. */
async function menu_loot_putin(eligible) {
    return await _menu_loot_items(game.invent, eligible, 'Put in', true);
}
/* The body shared by both directions.  `chainHead` is the nobj chain
 * query_objlist walks (container contents or gi.invent) and `contents` is the
 * subset the caller's allow() accepted. */
async function _menu_loot_items(chainHead, contents, action, useInvlet) {

    /* C pickup.c:1079-1087: default sortloot='l' sorts container contents by
     * description, but USE_INVLET selects letter order for the hero's pack.
     * sortloot='f' requests description order for both directions. */
    const byInvlet = useInvlet && game.flags?.sortloot !== 'f';
    const sorted = _sortloot(chainHead, byInvlet).filter((o) => contents.includes(o));

    /* C:1103-1141 the pack walk: one heading per contributing class, rows in
     * sortloot order within the class. */
    const entries = [];  /* { text, item? } in display order */
    const items = [];
    let first = true;
    for (const oc of _QC_INV_ORDER) {
        let printed_type_name = false;
        for (const o of sorted) {
            if ((o.oclass | 0) !== oc) continue;
            if (!printed_type_name) {
                /* C add_menu_heading(let_to_name(...)) — reverse video. */
                entries.push({ heading: _QC_CLASS_NAME[oc] ?? 'Items' });
                printed_type_name = true;
            }
            /* C:1133-1135 add_menu's `ch` argument:
             *   (qflags & USE_INVLET) ? curr->invlet
             *     : (first && curr->oclass == COIN_CLASS) ? '$' : 0 */
            const explicitSel = useInvlet
                ? (o.invlet ? String.fromCharCode(o.invlet | 0) : 0)
                : ((first && oc === COIN_CLASS) ? '$' : 0);
            const item = { sel: explicitSel, gsel: _QC_CLASS_SYM[oc] || 0,
                           skipinvert: false, selected: false, count: -1, obj: o };
            entries.push({ item });
            items.push(item);
            first = false;
        }
    }
    /* C wintty.c:2715-2726 tty_end_menu — assign 'a'..'z' then 'A'..'Z' to
     * every selectable row that did NOT come with a selector of its own. */
    let menu_ch = 97 /* 'a' */;
    for (const it of items) {
        if (it.sel) continue;
        it.sel = String.fromCharCode(menu_ch);
        menu_ch = (menu_ch === 122 /* 'z' */) ? 65 /* 'A' */ : menu_ch + 1;
    }
    /* C:1140 doname_with_price(curr) — evaluated once, AFTER sortloot has set
     * dknown, and cached so the row text cannot change mid-menu. */
    for (const e of entries)
        if (e.item) e.text = (await _item_doname(e.item.obj));

    const renderLines = () => {
        const out = [`\x1b[7m${action} what?\x1b[0m`, ''];
        const itemByLine = [null, null];
        for (const e of entries) {
            if (e.heading !== undefined) {
                out.push(`\x1b[7m${e.heading}\x1b[0m`);
                itemByLine.push(null);
            } else {
                out.push(`${e.item.sel} ${e.item.selected
                    ? (e.item.count > 0 ? '#' : '+') : '-'} ${e.text}`);
                itemByLine.push(e.item);
            }
        }
        out.push('(end)');
        itemByLine.push(null);
        out._itemsByLine = itemByLine;
        return out;
    };

    const cancelled = await _tty_pick_any_menu(renderLines, items, 'end');
    game._pending_message = '';
    await flush_screen(1);
    if (cancelled) return [];
    return items.filter((it) => it.selected)
        .map((it) => ({ obj: it.obj, count: it.count }));
}

async function in_container(obj) {
    const g = game;
    const box = g.current_container;
    if (!box)
        return 0;
    const u = g.u;
    const floorContainer = !_carried_box(box);
    let wasUnpaid = false;
    /* C:2566-2569 uball/uchain, C:2570-2572 the container itself. */
    if (obj === u.uball || obj === u.uchain) {
        await pline('You must be kidding.');
        return 0;
    }
    if (obj === box) {
        await pline('That would be an interesting topological exercise.');
        return 0;
    }
    /* C:2573-2577 — W_ARMOR | W_ACCESSORY. */
    if ((obj.owornmask | 0) & (W_ARMOR | W_ACCESSORY)) {
        await Norep(`You cannot ${(box.otyp | 0) === ICE_BOX_OTYP ? 'refrigerate' : 'stash'} something you are wearing.`);
        return 0;
    }
    if ((obj.otyp | 0) === 471 /* LOADSTONE */ && obj.cursed) {
        set_bknown(obj, 1);
        await pline(`The stone${obj.quan === 1 ? '' : 's'} won't leave your person.`);
        return 0;
    }
    // AMULET_OF_YENDOR, CANDELABRUM_OF_INVOCATION, BELL_OF_OPENING, BOOK_OF_THE_DEAD.
    if ([213, 262, 263, 409].includes(obj.otyp | 0)) {
        await pline('%s cannot be confined in such trappings.', The(xname(obj)));
        return 0;
    }
    if ((obj.otyp | 0) === 236 /* LEASH */ && obj.leashmon) {
        await pline('%s attached to your pet.', Tobjnam(obj, 'are'));
        return 0;
    }
    if (obj === u.uwep && welded(obj)) {
        await weldmsg(obj);
        return 0;
    }
    /* C pickup.c:2599-2610 clears weapon slots before freeinv(), so doname()
     * in the insertion message no longer describes the object as wielded. */
    if (obj === u.uwep) {
        await setuwep(null);
        if (u.uwep) return 0;
    }
    else if (obj === u.uswapwep) await setuswapwep(null);
    else if (obj === u.uquiver) await setuqwep(null);
    if (await fatal_corpse_mistake(obj, false)) return -1;
    /* C:2617-2622 — boxes, boulders and big statues do not fit. */
    const type = obj.otyp | 0;
    if (type === ICE_BOX_OTYP || type === 214 /* LARGE_BOX */
        || type === 215 /* CHEST */ || type === 475 /* BOULDER */
        || (type === 476 /* STATUE */
            && (permonstTemplate(obj.corpsenm)?.msize ?? 0) >= 3 /* MZ_LARGE */)) {
        await pline(`You cannot fit ${the(xname(obj))} into ${the(xname(box))}.`);
        return 0;
    }

    freeinv(obj);                                             /* C:2624 */
    if (obj_is_burning(obj)) await snuff_lit(obj);
    /* The '$:' shadow-chain deduction that used to be spelled out here now
     * lives in js/cmd.js freeinv_core()'s COIN_CLASS arm — C's own SET_BOTL
     * site, and the one door every object leaves gi.invent through.  freeinv()
     * on the line above already ran it; repeating it would deduct twice. */

    if (floorContainer && costly_spot(u.ux, u.uy)
        && (obj.oclass | 0) !== COIN_CLASS) {
        wasUnpaid = !!obj.unpaid;
        if (g.gs.sellobj_first) {
            sellobj_state(box.no_charge ? SELL_DONTSELL : SELL_DELIBERATE);
            g.gs.sellobj_first = false;
        }
        await sellobj(obj, u.ux, u.uy);
    }

    /* C pickup.c:2644-2657: freeze absolute ages and suspend corpse/glob
     * timers. Fuel-bearing objects already use relative age and skip this. */
    if ((box.otyp | 0) === ICE_BOX_OTYP && !age_is_relative(obj)) {
        obj.age = (g.moves | 0) - (obj.age | 0);
        if ((obj.otyp | 0) === 265 /* CORPSE */) {
            if (obj.timed) {
                stop_timer(ROT_CORPSE, { a_obj: obj, a_long: null });
                stop_timer(REVIVE_MON, { a_obj: obj, a_long: null });
            }
            if (obj.corpsenm === PM_ICE_TROLL && obj.oextra?.omonst)
                obj.oextra.omonst.mcan = 0;
        } else if (obj.globby && obj.timed) {
            stop_timer(SHRINK_GLOB, { a_obj: obj, a_long: null });
        }
    } else if (Is_mbag(box) && mbag_explodes(obj, 0)) {
        await urgent_pline(`As you put ${(await _item_doname(obj))} inside, you are blasted by a magical explosion!`);
        if (wasUnpaid)
            await addtobill(obj, false, false, true);
        if ((obj.otyp | 0) === BAG_OF_HOLDING_OTYP)
            await do_boh_explosion(obj, (obj.where | 0) === OBJ_FLOOR);
        await obfree(obj, null);
        if (floorContainer && costly_spot(box.ox, box.oy)) {
            const noCharge = box.no_charge;
            await addtobill(box, false, false, false);
            box.no_charge = noCharge;
        }
        await do_boh_explosion(box, floorContainer);
        if (!floorContainer)
            await useup(box);
        else if (obj_here(box, u.ux, u.uy))
            await useupf(box, box.quan);
        else
            throw new Error('in_container: bag not found');
        await losehp(d(6, 6), 'magical explosion', KILLED_BY_AN);
        g.current_container = null;
    }

    if (g.current_container) {
    /* C:2699-2701 — You("put %s into %s.", doname(obj), the(xname(container))).
     * "the", not yname: C builds buf from the(xname()) even for a carried bag,
     * which is why the recorded line is "You put 1163 gold pieces into the
     * bag." while the menu above it said "your bag". */
    await pline(`You put ${(await _item_doname(obj))} into ${_the(_box_xname(box))}.`);
    /* C:2702-2704: gold credit follows the put message, before linking the
     * object into the container. sellobj itself checks the shop at ox,oy. */
    if (floorContainer && (obj.oclass | 0) === COIN_CLASS)
        await sellobj(obj, box.ox, box.oy);
    await add_to_container(box, obj);                               /* C:2705 */
    box.owt = weight(box);                                    /* C:2706 */
    }
    /* C:2712 bot() — status refresh; gold left the purse. */
    if (g.disp) g.disp.botl = 1;
    return g.current_container ? 1 : -1;
}

/* ---------------------------------------------------------------------------
 * use_container — C ref: pickup.c:2959.
 */
export async function use_container_impl(cobjRef, held, more_containers) {
    const g = game;
    const obj = cobjRef.obj;
    if (!obj) return ECMD_OK;

    g.abort_looting = false;
    g.gs ||= {};
    g.gs.sellobj_first = true;
    let used = ECMD_OK;

    if (!(await u_handsy()))
        return ECMD_OK;

    if (!obj.lknown) {
        obj.lknown = 1;
    }
    if (obj.olocked) {
        await pline(`The ${_box_xname(obj)} is locked.${held ? '  You must put it down to unlock.' : ''}`);
        return ECMD_OK;
    }
    if (obj.otrapped) {
        if (held)
            await pline(`You open the ${_box_xname(obj)}...`);
        await chest_trap(obj, HAND, false);
        /* C pickup.c:2994-3000 — every trap attempt consumes a turn; the
         * freeze branch already installed a longer negative multi count. */
        if ((game.multi | 0) >= 0) {
            nomul(-1);
            game.multi_reason = 'opening a container';
            game.nomovemsg = '';
        }
        g.abort_looting = true;
        return ECMD_TIME;
    }

    g.current_container = obj; /* for in/out_container */

    const quantumCat = SchroedingersBox(obj);
    if (quantumCat) {
        await observe_quantum_cat(obj, true, true);
        used = ECMD_TIME;
    }

    /* C pickup.c:3016-3027 cursed magic-bag attrition occurs before the
     * action prompt.  A zero-value loss can still remove ordinary contents,
     * but only lost shop value consumes the turn and prints the debt total. */
    const cursedMbag = Is_mbag(obj) && obj.cursed && Has_contents(obj);
    if (cursedMbag) {
        const loss = await boh_loss(obj, held);
        if (loss) {
            used = ECMD_TIME;
            await pline(`You owe ${loss} ${currency(loss)} for lost merchandise.`);
            obj.owt = weight(obj);
        }
    }

    const inokay = (g.invent != null
                    && (g.invent !== obj || obj.nobj != null));
    /* outokay: box has contents. */
    const outokay = Has_contents(obj);
    /* pickup.c:3044-3047 preformats this before any transfer; the same text is
     * reused by out-first and reversed out-after-in. */
    const emptymsg = `${_Yname_box(obj)} is ${quantumCat || cursedMbag ? 'now ' : ''}empty.`;

    /* C: the in_or_out_menu / yn_function prompt loop (repeats on '?'/':'). */
    let c;
    for (;;) {
        const outmaybe = (outokay || !obj.cknown);
        const promptText = outmaybe
            ? `Do what with ${_yname_box(obj)}?`
            : `${_Yname_box(obj)} is ${cursedMbag ? 'now ' : ''}empty.  Do what with it?`;
        if (!inokay && !outmaybe) {
            c = 'b';
        } else {
            c = await in_or_out_menu(promptText, obj, outmaybe, inokay,
                                     (used !== ECMD_OK), more_containers);
        }
        if (c === '?') {
            /* explain_container_prompt — not exercised; loop again. */
            continue;
        } else if (c === ':') { /* note: will set obj->cknown */
            /* C pickup.c:3119-3123 — gaining info costs a turn, then the
             * contents window (which is what sets cknown). */
            if (!obj.cknown) used = ECMD_TIME;
            await container_contents(obj, false, false, true);
            continue;
        }
        break;
    }

    if (c === 'q') g.abort_looting = true;
    if (c === 'n' || c === 'q') {
        return _containerdone(obj, used, cobjRef);
    }
    const loot_out = (c === 'o' || c === 'b' || c === 'r');
    const loot_in = (c === 'i' || c === 'b' || c === 'r');
    const loot_in_first = (c === 'r');
    const stash_one = (c === 's');

    /* out-only or out before in */
    if (loot_out && !loot_in_first) {
        if (!Has_contents(obj)) {
            await pline(emptymsg);
            if (!obj.cknown) used = ECMD_TIME;
            obj.cknown = 1;
        } else {
            /* C pickup.c:3282-3311 menu_loot — with flags.menu_style ==
             * MENU_FULL (the default) the TYPE filter menu comes first. */
            g.pickup_encumbrance = 0;
            const sel = await query_category_takeout(obj);
            if (!sel.autopick && !sel.allCategories && sel.classes.size === 0) {
                /* C: return ECMD_OK from menu_loot — no menu, no cknown. */
            } else if (sel.autopick) {
                /* C menu_loot autopick walks the container's internal nobj
                 * chain, not sortloot/query_objlist display order.  Cache next
                 * before extraction mutates the chain. */
                obj.cknown = 1;
                let nlooted = 0;
                for (let it = obj.cobj; it && g.current_container;) {
                    const next = it.nobj;
                    if (sel.lootEverything || sel.allCategories
                        || _qc_allow(it, sel)) {
                        const res = await out_container(obj, it);
                        if (res < 0) break;
                        nlooted += res;
                    }
                    it = next;
                }
                if (nlooted) used |= ECMD_TIME;
            } else {
                const eligible = [];
                for (let o = obj.cobj; o; o = o.nobj)
                    if (_qc_allow(o, sel)) eligible.push(o);
                /* C pickup.c:3360 — `if (!put_in) current_container->cknown = 1`
                 * runs before query_objlist, i.e. whether or not the filter
                 * matches anything. */
                obj.cknown = 1;
                if (eligible.length) {
                    const picked = await menu_loot_takeout(obj, eligible);
                    // C menu_loot counts selected rows even when transfer is refused.
                    if (picked.length) used |= ECMD_TIME;
                    for (const pick of picked) {
                        const original = pick.obj;
                        let it = original;
                        if (pick.count > 0 && pick.count < (original.quan | 0))
                            it = (await splitobj(original, pick.count));
                        const res = await out_container(obj, it);
                        if (res <= 0 && it !== original && g.current_container)
                            await unsplitobj(it);
                        if (res < 0) break;
                    }
                }
            }
        }
    }

    /* C pickup.c:3160-3166 — recalculate 'inokay' after a take-out, then the
     * "don't have anything to put in" refusal. */
    let inokay2 = (g.invent && (g.invent !== obj || g.invent.nobj));
    let do_in = loot_in, do_stash = stash_one;
    if ((do_in || do_stash) && !inokay2) {
        await pline(`You don't have anything${g.invent ? ' else' : ''} to ${do_stash ? 'stash' : 'put in'}.`);
        do_in = do_stash = false;
    }

    /* C pickup.c:3175-3181 — menu_loot(0, TRUE): the put-in type menu, then
     * the put-in item menu, then in_container() on each pick. */
    if (do_in) {
        g.pickup_encumbrance = 0; // C menu_loot resets report suppression.
        const invlist = [];
        for (let o = g.invent; o; o = o.nobj) invlist.push(o);
        const sel = await _query_category(invlist, 'Put in', true);
        if (sel.menuShown && !sel.autopick
            && !sel.allCategories && sel.classes.size === 0) {
            /* C:3293-3294 `if (!n) return ECMD_OK;` — nothing picked. */
        } else if (sel.autopick) {
            let nlooted = 0;
            for (let it = g.invent; it && g.current_container;) {
                const next = it.nobj;
                if (sel.lootEverything || sel.allCategories
                    || _qc_allow(it, sel)) {
                    const res = await in_container(it);
                    if (res < 0) break;
                    nlooted += res;
                }
                it = next;
            }
            if (nlooted) used |= ECMD_TIME;
        } else {
            /* C menu_loot: a single just-picked stack bypasses query_objlist,
             * including when P was combined with other category choices.
             * The attempt costs a turn even if in_container refuses it. */
            const justPicked = sel.classes.has('P')
                ? invlist.filter((o) => o.pickup_prev) : [];
            if (justPicked.length === 1) {
                let it = justPicked[0];
                if (sel.justPickedCount > 0 && sel.justPickedCount < it.quan)
                    it = (await splitobj(it, sel.justPickedCount));
                used |= ECMD_TIME;
                await in_container(it);
            } else {
                const eligible = invlist.filter((o) => _qc_allow(o, sel));
                if (eligible.length) {
                    const picked = await menu_loot_putin(eligible);
                    if (picked.length) used |= ECMD_TIME;
                    for (const pick of picked) {
                        const original = pick.obj;
                        let it = original;
                        if (pick.count > 0 && pick.count < (original.quan | 0))
                            it = (await splitobj(original, pick.count));
                        const res = await in_container(it);
                        if (res <= 0 && it !== original && g.current_container)
                            await unsplitobj(it);
                        if (res < 0) break;
                        if (!g.current_container) break;
                    }
                }
            }
        }
    }
    /* C pickup.c:3182-3193 — single-item stash uses the shared getobj reader,
     * whose ALLOWCNT path returns a split child.  A simple refusal recombines
     * that child; -1 means the container vanished and deliberately counts as a
     * used action without attempting to unsplit into the destroyed container. */
    if (!do_in && do_stash) {
        const picked = await getObjFromGetobj(
            'stash', stash_ok, GETOBJ_PROMPT | GETOBJ_ALLOWCNT);
        if (picked) {
            const res = await in_container(picked);
            if (res)
                used = ECMD_TIME;
            else
                await unsplitobj(picked);
        }
    }

    /* C pickup.c:3195 — an insertion can destroy a magic bag, in which case
     * the reversed take-out half is suppressed and containerdone marks the
     * whole multi-container loot operation aborted. */
    let do_out_after = loot_out && loot_in_first && !!g.current_container;
    if (do_out_after) {
        if (!Has_contents(g.current_container)) {
            await pline(emptymsg);
            if (!g.current_container.cknown) used = ECMD_TIME;
            g.current_container.cknown = 1;
        } else {
            g.pickup_encumbrance = 0;
            const sel = await query_category_takeout(g.current_container);
            if (!sel.autopick && !sel.allCategories && sel.classes.size === 0) {
                /* menu_loot cancelled before learning the contents */
            } else if (sel.autopick) {
                g.current_container.cknown = 1;
                let nlooted = 0;
                for (let it = g.current_container.cobj;
                     it && g.current_container;) {
                    const next = it.nobj;
                    if (sel.lootEverything || sel.allCategories
                        || _qc_allow(it, sel)) {
                        const res = await out_container(g.current_container, it);
                        if (res < 0) break;
                        nlooted += res;
                    }
                    it = next;
                }
                if (nlooted) used |= ECMD_TIME;
            } else {
                const box = g.current_container;
                const eligible = [];
                for (let o = box.cobj; o; o = o.nobj)
                    if (_qc_allow(o, sel)) eligible.push(o);
                box.cknown = 1;
                if (eligible.length) {
                    const selected = await menu_loot_takeout(box, eligible);
                    if (selected.length) used |= ECMD_TIME;
                    for (const pick of selected) {
                        const original = pick.obj;
                        let it = original;
                        if (pick.count > 0 && pick.count < (original.quan | 0))
                            it = (await splitobj(original, pick.count));
                        const res = await out_container(box, it);
                        if (res <= 0 && it !== original && g.current_container)
                            await unsplitobj(it);
                        if (res < 0) break;
                    }
                }
            }
        }
    }

    return _containerdone(obj, used, cobjRef);
}

/* C ref: pickup.c:3195 containerdone label. */
function _containerdone(box, used, cobjRef) {
    const g = game;
    if (used) {
        if (g.current_container) g.current_container.cknown = 1;
        /* update_inventory: pure display refresh, RNG-free. */
    }
    /* C restores accidental-sale handling even when an in_container attempt
     * failed, and writes the possibly-destroyed container back through objp. */
    sellobj_state(SELL_NORMAL);
    if (cobjRef) cobjRef.obj = g.current_container || null;
    if (g.current_container) {
        g.current_container = 0;
    } else {
        g.abort_looting = true;
    }
    return used;
}
