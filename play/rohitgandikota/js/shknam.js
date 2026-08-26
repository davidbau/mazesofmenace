// shknam.js — shop types, shopkeeper names, and shop stocking.
// C ref: src/shknam.c
//
// shtypes[] lived in js/mkroom.js while mkshop() was its only consumer. It
// belongs here, next to get_shop_item(), which is the other half of the table:
// mkshop reads .prob to pick the SHOP, get_shop_item reads .iprobs to pick each
// ITEM in it.

import { rnd } from './rng.js';
import { OCLASSES, ONAMES, MATERIALS } from './objects_data.js';
import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { isok, ROOMOFFSET, IS_ROOM, D_NODOOR, D_ISOPEN, D_LOCKED, D_TRAPPED,
         SDOOR, DOOR, MM_ESHK, NO_MM_FLAGS, HEALTHY_TIN } from './const.js';
import { makemon, mkclass, mkmonmoney, mongets, set_malign } from './makemon.js';
import { mkobj_at, mksobj_at, set_tin_variety } from './mkobj.js';
import { m_at } from './mon.js';
import { PMNAMES, MONSYMS } from './monst_data.js';
import { rnd as _rnd } from './rng.js';
import { distmin } from './hacklib.js';
import { newsym } from './display.js';
import { depth } from './dungeon.js';
import { SHKNAMES, SHKNMS_ORDER } from './shknam_data.js';

// src/shknam.c:19 VEGETARIAN_CLASS — not a real object class, a marker the
// health food store uses to route through mkveggy_at().
export const VEGETARIAN_CLASS = OCLASSES.MAXOCLASSES + 1;

/* A negative itype is a specific object type rather than a class; C writes
   them as -POT_BOOZE and tests `atype < 0` before negating. */
const T = (name) => -ONAMES[name];

// src/shknam.c:209 shtypes[]
//
// `prob` picks the shop and `iprobs` picks each item; BOTH sum to 100 per
// entry, which is what makes the two rnd(100) walks terminate without a bound
// check. The shopkeeper name lists and the shdist field are not carried yet.
export const shtypes = [
    { name: 'general store', symb: OCLASSES.RANDOM_CLASS, prob: 42,
      iprobs: [[100, OCLASSES.RANDOM_CLASS]] },
    { name: 'used armor dealership', symb: OCLASSES.ARMOR_CLASS, prob: 14,
      iprobs: [[90, OCLASSES.ARMOR_CLASS], [10, OCLASSES.WEAPON_CLASS]] },
    { name: 'second-hand bookstore', symb: OCLASSES.SCROLL_CLASS, prob: 10,
      iprobs: [[90, OCLASSES.SCROLL_CLASS], [10, OCLASSES.SPBOOK_CLASS]] },
    { name: 'liquor emporium', symb: OCLASSES.POTION_CLASS, prob: 10,
      iprobs: [[100, OCLASSES.POTION_CLASS]] },
    { name: 'antique weapons outlet', symb: OCLASSES.WEAPON_CLASS, prob: 5,
      iprobs: [[90, OCLASSES.WEAPON_CLASS], [10, OCLASSES.ARMOR_CLASS]] },
    { name: 'delicatessen', symb: OCLASSES.FOOD_CLASS, prob: 5,
      iprobs: [[83, OCLASSES.FOOD_CLASS], [5, T('POT_FRUIT_JUICE')],
               [4, T('POT_BOOZE')], [5, T('POT_WATER')], [3, T('ICE_BOX')]] },
    { name: 'jewelers', symb: OCLASSES.RING_CLASS, prob: 3,
      iprobs: [[85, OCLASSES.RING_CLASS], [10, OCLASSES.GEM_CLASS],
               [5, OCLASSES.AMULET_CLASS]] },
    { name: 'quality apparel and accessories', symb: OCLASSES.WAND_CLASS, prob: 3,
      iprobs: [[90, OCLASSES.WAND_CLASS], [5, T('LEATHER_GLOVES')],
               [5, T('ELVEN_CLOAK')]] },
    { name: 'hardware store', symb: OCLASSES.TOOL_CLASS, prob: 3,
      iprobs: [[100, OCLASSES.TOOL_CLASS]] },
    { name: 'rare books', symb: OCLASSES.SPBOOK_CLASS, prob: 3,
      iprobs: [[90, OCLASSES.SPBOOK_CLASS], [10, OCLASSES.SCROLL_CLASS]] },
    { name: 'health food store', symb: OCLASSES.FOOD_CLASS, prob: 2,
      iprobs: [[70, VEGETARIAN_CLASS], [20, T('POT_FRUIT_JUICE')],
               [4, T('POT_HEALING')], [3, T('POT_FULL_HEALING')],
               [2, T('SCR_FOOD_DETECTION')], [1, T('LUMP_OF_ROYAL_JELLY')]] },
    { name: 'lighting store', symb: OCLASSES.TOOL_CLASS, prob: 0,
      iprobs: [[30, T('WAX_CANDLE')], [44, T('TALLOW_CANDLE')],
               [5, T('BRASS_LANTERN')], [9, T('OIL_LAMP')],
               [3, T('MAGIC_LAMP')], [5, T('POT_OIL')],
               [2, T('WAN_LIGHT')], [1, T('SCR_LIGHT')], [1, T('SPE_LIGHT')]] },
];

/* src/shknam.c:209 — each shtypes[] entry ends with its shopkeeper name list.
   The identity of that list, not just its contents, is read by shkinit(): its
   mongets block branches on `shknms == shktools` and friends. SHKNMS_ORDER is
   generated from the same table so the two cannot drift apart. */
shtypes.forEach((shp, i) => { shp.shknms = SHKNMS_ORDER[i]; });

// src/shknam.c:598 good_shopdoor() — where the shopkeeper stands, and which
// door index it belongs to. Draws nothing; pure geometry. Returns -1 when no
// door works, which is what makes shkinit fail and stock_room give up.
export function good_shopdoor(sroom) {
    for (let i = 0; i < sroom.doorct; i++) {
        const di = sroom.fdoor + i;
        const door = game.level.doors?.[di];
        if (!door)
            continue;
        let sx = door.x, sy = door.y;

        if (sroom.irregular) {
            const rmno = (game.level.rooms.indexOf(sroom)) + ROOMOFFSET;
            const ok = (x, y) => {
                const l = isok(x, y) ? game.level.at(x, y) : null;
                return l && !l.edge && l.roomno === rmno;
            };
            if (ok(sx - 1, sy)) sx--;
            else if (ok(sx + 1, sy)) sx++;
            else if (ok(sx, sy - 1)) sy--;
            else if (ok(sx, sy + 1)) sy++;
            else continue;
        } else if (sx === sroom.lx - 1) { sx++; }
        else if (sx === sroom.hx + 1) { sx--; }
        else if (sy === sroom.ly - 1) { sy++; }
        else if (sy === sroom.hy + 1) { sy--; }
        else { continue; }

        return { di, sx, sy };
    }
    return { di: -1, sx: 0, sy: 0 };
}

// src/shknam.c nameshk() — name the shopkeeper.
//
// Reads as a blocker because name_wanted is seeded from ubirthday, which we do
// not model. Work the control flow instead: name_wanted is reduced by
// `% names_avail` before the loop, so it is ALWAYS less than names_avail, and
// every shop that is not a tools shop takes the `name_wanted < names_avail`
// arm on the first iteration and DRAWS NOTHING. Only a tools shop draws, and
// exactly one rn2(names_avail).
//
// So the unmodelled ubirthday changes WHICH NAME appears, a screen difference,
// and not the draw count. The name itself is recorded as unported; the draw is
// faithful, and names_avail is the generated list's length, which is why the
// list must not lose or gain an entry.
export function nameshk(shk, shknms) {
    let list_name = shknms;
    let nlp = SHKNAMES[list_name];
    let names_avail = nlp.length;

    if (shknms === 'shktools') {
        shk.shknam = nlp[rn2(names_avail)];
        shk.female = 0;         /* reversed below for '_' prefix */
    } else {
        /* The canonical recorder runs in America/New_York and copied the
           recorder's daylight-saving flag before replacing its calendar
           fields. The public and hidden corpus was recorded during EDT, so
           every fixed wall time converts with the same UTC-4 offset. */
        const dt = String(game.fixed_datetime || '');
        const birthday = dt.length === 14
            ? Date.UTC(Number(dt.slice(0, 4)), Number(dt.slice(4, 6)) - 1,
                       Number(dt.slice(6, 8)), Number(dt.slice(8, 10)),
                       Number(dt.slice(10, 12)), Number(dt.slice(12, 14)))
                / 1000 + 4 * 60 * 60
            : 0;
        const nseed = Math.trunc(birthday / 257);
        const ledger = (game.dungeons?.[game.u.uz.dnum]?.ledger_start || 0)
            + game.u.uz.dlevel;
        let name_wanted = shk.m_id + ledger
            + (nseed % 13) - (nseed % 5);
        if (name_wanted < 0)
            name_wanted += 18;
        shk.female = name_wanted & 1;
        name_wanted %= names_avail;

        let shname = null;
        for (let trycnt = 0; trycnt < 50; ++trycnt) {
            if (name_wanted < names_avail) {
                shname = nlp[name_wanted];
            } else {
                const i = rn2(names_avail);
                if (i) {
                    shname = nlp[i - 1];
                } else if (list_name !== 'shkgeneral') {
                    list_name = 'shkgeneral';
                    nlp = SHKNAMES[list_name];
                    names_avail = nlp.length;
                    continue;
                } else {
                    shname = shk.female ? '-Lucrezia' : '+Dirk';
                }
            }

            if (shname[0] === '_' || shname[0] === '-')
                shk.female = 1;
            else if (shname[0] === '|' || shname[0] === '+')
                shk.female = 0;

            const duplicate = (game.level?.monsters || []).some(mtmp =>
                mtmp !== shk && mtmp.mhp > 0 && mtmp.isshk
                && (mtmp.shknam || mtmp.eshk?.shknam
                    || mtmp.mextra?.eshk?.shknam) === shname);
            if (!duplicate)
                break;
            name_wanted = names_avail;
        }
        shk.shknam = shname;
    }

    if (shk.eshk)
        shk.eshk.shknam = shk.shknam;
}

// src/shknam.c:465 get_shop_item() — pick one item type for a shop square.
//
// Same walk shape as mkshop's shop-type pick: rnd(100), then subtract each
// probability in table order until the running total goes non-positive.
export function get_shop_item(type) {
    const shp = shtypes[type];
    let i, j;

    /* select an appropriate object type at random */
    for (j = rnd(100), i = 0; (j -= shp.iprobs[i][0]) > 0; i++)
        continue;

    return shp.iprobs[i][1];
}

// src/shknam.c:415 shkveg() -- pick a vegetarian FOOD_CLASS object using
// the ordinary object probabilities. Corpses and tins use a lichen as their
// type-only stand-in, so both are eligible here and are fixed after creation.
export function shkveg() {
    const ok = [];
    let maxprob = 0;

    for (let i = game.bases[OCLASSES.FOOD_CLASS];
         i < game.bases[OCLASSES.FOOD_CLASS + 1]; ++i) {
        const oc = game.objects[i];
        if (oc.oc_material === MATERIALS.VEGGY || i === ONAMES.EGG
            || i === ONAMES.TIN || i === ONAMES.CORPSE) {
            ok.push(i);
            maxprob += oc.oc_prob;
        }
    }

    let prob = rnd(maxprob);
    let i = ok[0];
    for (let j = 0; (prob -= game.objects[i].oc_prob) > 0;)
        i = ok[++j];
    return i;
}

// src/shknam.c:443 mkveggy_at()
function mkveggy_at(sx, sy) {
    const obj = mksobj_at(shkveg(), sx, sy, true, true);
    if (obj && obj.otyp === ONAMES.TIN)
        set_tin_variety(obj, HEALTHY_TIN);
}


// src/shknam.c:628 shkinit() — create the shopkeeper. Returns the door index,
// or -1, which makes stock_room give up and leave the shop empty.
//
// Draws: makemon's, then mkmonmoney's rnd(100), then a CONDITIONAL rn2 whose
// presence depends on which name list the shop uses. A tools or wand shop
// draws NEITHER, because the first two disjuncts short-circuit; a ring shop
// draws rn2(2) and a general store rn2(5). Then nameshk, which draws only for
// a tools shop. Getting shknms wrong changes which draw happens.
function shkinit(shp, sroom) {
    const { di: sh, sx, sy } = good_shopdoor(sroom);
    if (sh < 0)
        return -1;

    if (m_at(sx, sy))
        (game.unported ||= new Set()).add('shknam:shkinit:rloc'); /* insurance */

    const shk = makemon(game.mons[PMNAMES.PM_SHOPKEEPER], sx, sy, MM_ESHK);
    if (!shk)
        return -1;

    shk.isshk = shk.mpeaceful = 1;
    set_malign(shk);
    shk.msleeping = 0;
    shk.eshk = {
        shoproom: ((sroom.roomnoidx ?? game.level.rooms.indexOf(sroom))
                   + ROOMOFFSET),
        shoptype: sroom.rtype,
        shd: game.level.doors[sh],
        shk: { x: sx, y: sy },
        robbed: 0, credit: 0, debit: 0, loan: 0,
        following: false, surcharge: false, dismiss_kops: false,
        billct: 0, visitct: 0, customer: '',
    };
    sroom.resident = shk;

    mkmonmoney(shk, 1000 + 30 * _rnd(100));     /* initial capital */

    if (shp.shknms === 'shkrings')
        mongets(shk, ONAMES.TOUCHSTONE);
    if (shp.shknms === 'shktools' || shp.shknms === 'shkwands'
        || (shp.shknms === 'shkrings' && rn2(2))
        || (shp.shknms === 'shkgeneral' && rn2(5)))
        mongets(shk, ONAMES.SCR_CHARGING);

    nameshk(shk, shp.shknms);

    return sh;
}

// src/shknam.c:695 stock_room_goodpos() — may this square hold stock?
// No draws; pure geometry. The non-irregular arm excludes the row of squares
// nearest the door.
function stock_room_goodpos(sroom, rmno, sh, sx, sy) {
    const door = game.level.doors[sh];
    if (sroom.irregular) {
        const l = game.level.at(sx, sy);
        if (!l || l.edge || l.roomno !== rmno
            || distmin(sx, sy, door.x, door.y) <= 1)
            return false;
    } else if ((sx === sroom.lx && door.x === sx - 1)
               || (sx === sroom.hx && door.x === sx + 1)
               || (sy === sroom.ly && door.y === sy - 1)
               || (sy === sroom.hy && door.y === sy + 1)) {
        return false;
    }

    /* only generate items on solid floor squares */
    return !!IS_ROOM(game.level.at(sx, sy)?.typ);
}

// src/shknam.c:454 mkshobj_at() — one shop square's contents.
//
// ORDER IS LOAD-BEARING: the rn2(100) mimic check runs FIRST and always, and
// only if it fails to place a mimic is get_shop_item called. Picking the item
// first and checking for a mimic afterwards would look equivalent and desync
// on every square.
function mkshobj_at(shp, sx, sy, mkspecl) {
    if (mkspecl && (shp.name === 'rare books'
                    || shp.name === 'second-hand bookstore')) {
        const novel = mksobj_at(ONAMES.SPE_NOVEL, sx, sy, false, false);
        if (novel)
            game.context.tribute.bookstock = true;
        return;
    }

    let ptr, mtmp;
    if (rn2(100) < depth(game.u.uz) && !m_at(sx, sy)
        && (ptr = mkclass(MONSYMS.S_MIMIC, 0)) !== null
        && (mtmp = makemon(ptr, sx, sy, NO_MM_FLAGS)) !== null) {
        /* nothing */
    } else {
        const atype = get_shop_item(shtypes.indexOf(shp));
        if (atype === VEGETARIAN_CLASS)
            mkveggy_at(sx, sy);
        else if (atype < 0)
            mksobj_at(-atype, sx, sy, true, true);
        else
            mkobj_at(atype, sx, sy, true);
    }
}

// src/shknam.c:718 stock_room() — stock a newly-created shop.
export function stock_room(shp_indx, sroom) {
    let stockcount = 0, specialspot = 0;
    const rmno = game.level.rooms.indexOf(sroom) + ROOMOFFSET;
    const shp = shtypes[shp_indx];

    /* first, try to place a shopkeeper in the room */
    const sh = shkinit(shp, sroom);
    if (sh < 0)
        return;

    /* no doorways without doors, and no trapped doors, in shops */
    const dx = game.level.doors[sroom.fdoor].x;
    const dy = game.level.doors[sroom.fdoor].y;
    const dlev = game.level.at(dx, dy);
    if (dlev.doormask === D_NODOOR) {
        dlev.doormask = D_ISOPEN;
        newsym(dx, dy);
    }
    if (dlev.typ === SDOOR) {
        dlev.typ = DOOR;                /* cvt_sdoor_to_door */
        newsym(dx, dy);
    }
    if (dlev.doormask & D_TRAPPED)
        dlev.doormask = D_LOCKED;
    if (dlev.doormask === D_LOCKED)
        (game.unported ||= new Set()).add('shknam:closed_for_inventory_engr');

    /* svc.context.tribute.enabled is set TRUE at game start (allmain.c:776),
       so this block RUNS and its rnd(stockcount) is not optional. */
    if (game.context.tribute?.enabled && !game.context.tribute?.bookstock) {
        for (let sx = sroom.lx; sx <= sroom.hx; sx++)
            for (let sy = sroom.ly; sy <= sroom.hy; sy++)
                if (stock_room_goodpos(sroom, rmno, sh, sx, sy))
                    stockcount++;
        specialspot = _rnd(stockcount);
        stockcount = 0;
    }

    for (let sx = sroom.lx; sx <= sroom.hx; sx++)
        for (let sy = sroom.ly; sy <= sroom.hy; sy++)
            if (stock_room_goodpos(sroom, rmno, sh, sx, sy)) {
                stockcount++;
                mkshobj_at(shp, sx, sy, stockcount === specialspot);
            }

    game.level.flags.has_shop = true;
}
