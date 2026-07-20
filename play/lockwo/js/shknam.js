// shknam.js — shop stocking (stock_room / shkinit / mkshobj_at).
// C ref: shknam.c.
//
// Imported by sp_lev.js (fill_special_room).  Does NOT import sp_lev.js, so no
// circular dependency.  The shop-type table + get_shop_item live in shtypes.js
// (a leaf module) so makemon.js's set_mimic_sym can share them.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { depth } from './hacklib.js';
import { distmin } from './hacklib.js';
import { IS_ROOM, ROOMOFFSET, D_NODOOR, D_ISOPEN, D_LOCKED, D_TRAPPED,
         SDOOR, DOOR, CORR, ROOM, MM_ESHK } from './const.js';
import { mksobj, mksobj_at, mkobj_at, objects } from './mkobj.js';
import { set_tin_variety, HEALTHY_TIN } from './eat.js';
import { makemon, mkclass, name_to_pmidx, monster_by_pmidx } from './makemon.js';
import { make_engr_at } from './engrave.js';
import { shtypes, get_shop_item, VEGETARIAN_CLASS } from './shtypes.js';

const FOOD_CLASS = 7;
const S_MIMIC = 13;
const SKELETON_KEY = 221, TOUCHSTONE = 263, SCR_CHARGING = 343;
const DUST = 2;      // engrave.h DUST

// C ref: shknam.c veggy_item() — a FOOD_CLASS item whose material is VEGGY
// or which is an egg.  (Tins/corpses are handled per-object; shkveg only
// passes object types, so the corpse/tin branches default to non-veggy here.)
const VEGGY_MATERIAL = 3; // mkobj.js VEGGY material index
const EGG_OTYP = 266;
function veggy_item_type(otyp) {
    const o = objects[otyp];
    if (!o || o.oc_class !== FOOD_CLASS) return false;
    if (o.material === VEGGY_MATERIAL || otyp === EGG_OTYP) return true;
    return false;
}

// C ref: shknam.c shkveg() — pick a random vegetarian food item by oc_prob.
function shkveg() {
    const oclass = FOOD_CLASS;
    const ok = [];
    let maxprob = 0;
    // find the first FOOD_CLASS object index (svb.bases[FOOD_CLASS]).
    let base = 0;
    for (let i = 0; i < objects.length; i++) {
        if (objects[i] && objects[i].oc_class === oclass) { base = i; break; }
    }
    for (let i = base; i < objects.length; i++) {
        if (!objects[i] || objects[i].oc_class !== oclass) break;
        if (veggy_item_type(i)) { ok.push(i); maxprob += (objects[i].oc_prob || 0); }
    }
    if (maxprob < 1 || ok.length === 0) return EGG_OTYP;
    let prob = rnd(maxprob);
    let j = 0, i = ok[0];
    while ((prob -= (objects[i].oc_prob || 0)) > 0) { j++; i = ok[j]; }
    return i;
}

const TIN_OTYP = 296;
// C ref: shknam.c mkveggy_at().
function mkveggy_at(sx, sy) {
    const obj = mksobj_at(shkveg(), sx, sy, true, true);
    if (obj && obj.otyp === TIN_OTYP && typeof set_tin_variety === 'function')
        set_tin_variety(obj, HEALTHY_TIN);
    return obj;
}

// C ref: rm.h MON_AT — a live monster occupies <x,y>.
function MON_AT(x, y) {
    for (const m of game.level?.monsters || []) {
        if (m.mx === x && m.my === y && (m.mhp == null || m.mhp > 0)) return true;
    }
    return false;
}

// C ref: shknam.c mkshobj_at() — make an object of the appropriate type for a
// shop square.  shp is a shtypes[] entry; shp_indx its index.
function mkshobj_at(shp, shp_indx, sx, sy, mkspecl) {
    // 3.6 tribute: rare/secondhand bookstore special spot gets a novel.
    if (mkspecl && (shp.name === 'rare books' || shp.name === 'second-hand bookstore')) {
        const novel = mksobj_at(/*SPE_NOVEL*/ 384, sx, sy, false, false);
        if (novel) game._tribute_bookstock = true;
        return;
    }

    if (rn2(100) < depth(game.u?.uz) && !MON_AT(sx, sy)) {
        const ptr = mkclass(S_MIMIC, 0);
        if (ptr) {
            const m = makemon(ptr, sx, sy, 0 /*NO_MM_FLAGS*/);
            if (m) return; // mimic created
        }
    }
    const atype = get_shop_item(shp_indx);
    if (atype === VEGETARIAN_CLASS) {
        mkveggy_at(sx, sy);
    } else if (atype < 0) {
        mksobj_at(-atype, sx, sy, true, true);
    } else {
        mkobj_at(atype, sx, sy, true);
    }
}

// C ref: shknam.c good_shopdoor() — find the shop entrance door and the inside
// square adjacent to it.  Returns the doors[] index (svd.doors) or -1.
function good_shopdoor(sroom) {
    const doors = game.level?.doors || [];
    for (let i = 0; i < (sroom.doorct || 0); i++) {
        const di = sroom.fdoor + i;
        const d = doors[di];
        if (!d) continue;
        let sx = d.x, sy = d.y;
        // Regular rectangular shop: shift the door coordinate one square inside.
        if (sx === sroom.lx - 1) sx++;
        else if (sx === sroom.hx + 1) sx--;
        else if (sy === sroom.ly - 1) sy++;
        else if (sy === sroom.hy + 1) sy--;
        else continue;
        return { di, sx, sy };
    }
    return { di: -1, sx: 0, sy: 0 };
}

// C ref: shknam.c shkinit() — create the shopkeeper monster.
function shkinit(shp, sroom) {
    const sd = good_shopdoor(sroom);
    if (sd.di < 0) return -1;
    const { di: sh, sx, sy } = sd;

    const shkPmidx = name_to_pmidx('shopkeeper');
    const shkPtr = monster_by_pmidx(shkPmidx);
    const shk = makemon(shkPtr, sx, sy, MM_ESHK);
    if (!shk) return -1;
    shk.isshk = 1;
    shk.mpeaceful = 1;
    shk.msleeping = 0;
    shk.eshk = shk.eshk || {};
    shk.eshk.shoproom = (sroom.roomnoidx ?? 0) + ROOMOFFSET;
    sroom.resident = shk;
    shk.eshk.shoptype = sroom.rtype;
    shk.eshk.shd = game.level.doors[sh];
    shk.eshk.shk = { x: sx, y: sy };

    // C ref: mkmonmoney(shk, 1000 + 30 * rnd(100)) — initial capital.  The gold
    // is a real mksobj(GOLD_PIECE, FALSE) -> next_ident rnd(2).
    const amount = 1000 + 30 * rnd(100);
    if (amount > 0) mksobj(/*GOLD_PIECE*/ 437, false, false);

    if (shp.shknms === 'rings') mongets_shk(shk, TOUCHSTONE);
    if (shp.shknms === 'tools' || shp.shknms === 'wands'
        || (shp.shknms === 'rings' && rn2(2))
        || (shp.shknms === 'general' && rn2(5))) {
        mongets_shk(shk, SCR_CHARGING);
    }
    // nameshk() consumes no RNG for the general/most cases except shktools
    // (rn2(names_avail)).  Only the hardware store uses shktools; the general
    // store (seed5002) does not.  Port the shktools draw for faithfulness.
    if (shp.shknms === 'tools') {
        // C ref: nameshk() shktools branch — rn2(names_avail) per trycnt; the
        // first iteration always succeeds (name unused), so a single draw.
        rn2(SHKTOOLS_COUNT);
    }
    return sh;
}

// Number of entries in C's shktools[] name array (shknam.c).  Used only to
// reproduce the shktools nameshk rn2(names_avail) draw for hardware stores.
const SHKTOOLS_COUNT = 16;

// C ref: makemon.c mongets() — give a monster a freshly made object.  For a
// shopkeeper (not demon/minion/mplayer/prince), the only RNG is mksobj().
function mongets_shk(mtmp, otyp) {
    if (!otyp) return null;
    return mksobj(otyp, true, false);
}

// C ref: shknam.c stock_room_goodpos() — a square eligible for stocking.
function stock_room_goodpos(sroom, rmno, shDoor, sx, sy) {
    const doors = game.level?.doors || [];
    const dd = doors[shDoor];
    if (!dd) return false;
    // Regular (non-irregular) shop edge test.
    if ((sx === sroom.lx && dd.x === sx - 1)
        || (sx === sroom.hx && dd.x === sx + 1)
        || (sy === sroom.ly && dd.y === sy - 1)
        || (sy === sroom.hy && dd.y === sy + 1))
        return false;
    const loc = game.level?.at(sx, sy);
    if (!loc || !IS_ROOM(loc.typ)) return false;
    return true;
}

// C ref: shknam.c stock_room() — stock a newly-created shop room.
export function stock_room(shp_indx, sroom) {
    const shp = shtypes[shp_indx];
    const rmno = (sroom.roomnoidx ?? 0) + ROOMOFFSET;

    const was_full = game._full_mon_gen;
    game._full_mon_gen = true;
    let sh;
    try {
        sh = shkinit(shp, sroom);
    } finally {
        game._full_mon_gen = was_full;
    }
    if (sh < 0) return;

    // Door fixups (no RNG): ensure the shop door is real and not trapped.
    const doors = game.level.doors;
    const fd = doors[sroom.fdoor];
    if (fd) {
        const loc = game.level.at(fd.x, fd.y);
        if (loc) {
            if (loc.doormask === D_NODOOR) loc.doormask = D_ISOPEN;
            if (loc.typ === SDOOR) loc.typ = DOOR;
            if (loc.doormask & D_TRAPPED) loc.doormask = D_LOCKED;
            if (loc.doormask === D_LOCKED) {
                let m = fd.x, n = fd.y;
                if (inside_shop(fd.x + 1, fd.y)) m--;
                else if (inside_shop(fd.x - 1, fd.y)) m++;
                if (inside_shop(fd.x, fd.y + 1)) n--;
                else if (inside_shop(fd.x, fd.y - 1)) n++;
                make_engr_at(m, n, 'Closed for inventory', null, 0, DUST);
                const ml = game.level.at(m, n);
                if (ml && ml.typ !== CORR && ml.typ !== ROOM) ml.typ = ROOM;
            }
        }
    }

    // C ref: tribute special-spot — choose one stocking spot to receive the
    // tribute item.  The recorder runs with tribute enabled.
    let stockcount = 0, specialspot = 0;
    if (!game._tribute_bookstock) {
        for (let sx = sroom.lx; sx <= sroom.hx; sx++)
            for (let sy = sroom.ly; sy <= sroom.hy; sy++)
                if (stock_room_goodpos(sroom, rmno, sh, sx, sy)) stockcount++;
        specialspot = rnd(stockcount); // shknam.c:777
        stockcount = 0;
    }

    const was_full2 = game._full_mon_gen;
    game._full_mon_gen = true;
    try {
        for (let sx = sroom.lx; sx <= sroom.hx; sx++)
            for (let sy = sroom.ly; sy <= sroom.hy; sy++)
                if (stock_room_goodpos(sroom, rmno, sh, sx, sy)) {
                    stockcount++;
                    mkshobj_at(shp, shp_indx, sx, sy, stockcount === specialspot);
                }
    } finally {
        game._full_mon_gen = was_full2;
    }

    if (game.level?.flags) game.level.flags.has_shop = true;
    game._tribute_bookstock = false;
}

// C ref: shk.c inside_shop() — is <x,y> inside any shop room (returns the
// shop's room number, or 0).  We only need a boolean for the door fixup.
function inside_shop(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const rno = (loc.roomno ?? 0) - ROOMOFFSET;
    if (rno < 0) return false;
    const r = game.level.rooms[rno];
    return !!(r && r.rtype >= 14 /*SHOPBASE*/);
}
