// C ref: obj.h
import { game } from './gstate.js';
import { fobj, set_fobj } from './decl.js';
import { BOULDER, COIN_CLASS, GOLD_PIECE } from './objects.js';
import { rnd } from './rng.js';
import { depth, level_difficulty } from './hacklib.js';

export const OBJ_FREE = 0;
export const OBJ_FLOOR = 1;
export const OBJ_CONTAINED = 2;
export const OBJ_INVENT = 3;
export const OBJ_MINVENT = 4;
export const OBJ_MIGRATING = 5;
export const OBJ_BURIED = 6;
export const OBJ_ONBILL = 7;

export function newobj() {
    return {
        nobj: null,
        nexthere: null,
        ocontainer: null,
        ocarry: null,
        cobj: null,
        o_id: 0,
        ox: 0,
        oy: 0,
        otyp: 0,
        owt: 0,
        quan: 0,
        spe: 0,
        oclass: 0,
        invlet: 0,
        oartifact: 0,
        where: 0,
        timed: 0,
        cursed: 0,
        blessed: 0,
        unpaid: 0,
        no_charge: 0,
        recharged: 0,
        lamplit: 0,
        known: 0,
        dknown: 0,
        bknown: 0,
        rknown: 0,
        cknown: 0,
        lknown: 0,
        tknown: 0,
        nomerge: 0,
        oeroded: 0,
        oeroded2: 0,
        oerodeproof: 0,
        olocked: 0,
        obroken: 0,
        otrapped: 0,
        globby: 0,
        greased: 0,
        in_use: 0,
        bypass: 0,
        pickup_prev: 0,
        ghostly: 0,
        how_lost: 0,
        named_how: 0,
        corpsenm: -1,
        usecount: 0,
        oeaten: 0,
        age: 0,
        owornmask: 0,
        lua_ref_cnt: 0,
        omigr_from_dnum: 0,
        omigr_from_dlevel: 0,
        oextra: null
    };
}

export function place_object(otmp, x, y) {
    if (otmp.where !== OBJ_FREE) {
        throw new Error(`place_object: obj "${otmp.otyp}" [${otmp.where}] not free`);
    }

    let otmp2 = game.level.objects[x][y];

    // TODO: obj_no_longer_held(otmp);
    // TODO: block_point(x, y); for boulder

    if (otmp2 && otmp2.otyp === BOULDER && otmp.otyp !== BOULDER) {
        let curr = otmp2;
        while (curr.nexthere && curr.nexthere.otyp === BOULDER) {
            curr = curr.nexthere;
        }
        otmp.nexthere = curr.nexthere;
        curr.nexthere = otmp;
    } else {
        otmp.nexthere = otmp2;
        game.level.objects[x][y] = otmp;
    }

    otmp.ox = x;
    otmp.oy = y;
    otmp.where = OBJ_FLOOR;

    // TODO: no_charge update logic if outside shop

    otmp.nobj = fobj;
    set_fobj(otmp);

    // TODO: obj_timer_checks if otmp.timed
}

export function extract_nexthere(obj, head_ptr) {
    let curr = head_ptr;
    let prev = null;

    for (; curr; prev = curr, curr = curr.nexthere) {
        if (curr === obj) {
            if (prev) {
                prev.nexthere = curr.nexthere;
            } else {
                head_ptr = curr.nexthere;
            }
            break;
        }
    }

    if (!curr) throw new Error("extract_nexthere: object lost");
    obj.nexthere = null;
    return head_ptr;
}

export function extract_nobj(obj, head_ptr) {
    let curr = head_ptr;
    let prev = null;

    for (; curr; prev = curr, curr = curr.nobj) {
        if (curr === obj) {
            if (prev) {
                prev.nobj = curr.nobj;
            } else {
                head_ptr = curr.nobj;
            }
            break;
        }
    }

    if (!curr) throw new Error("extract_nobj: object lost");
    obj.where = OBJ_FREE;
    obj.nobj = null;
    return head_ptr;
}

export function mkgold(amount, x, y) {
    let gold = g_at(x, y);

    if (amount <= 0) {
        const depthVal = depth(game.u?.uz);
        const dunLevel = level_difficulty();
        const mul = rnd(Math.trunc(30 / Math.max(12 - depthVal, 2)));

        amount = 1 + rnd(dunLevel + 2) * mul;
    }
    if (gold) {
        gold.quan += amount;
    } else {
        // C ref uses mksobj_at, which creates and places. We stub it here by creating newobj and placing it.
        // TODO: replace with mksobj_at when implemented
        gold = newobj();
        gold.otyp = GOLD_PIECE;
        gold.oclass = COIN_CLASS;
        place_object(gold, x, y);
        gold.quan = amount;
    }
    gold.owt = weight(gold);
    return gold;
}

export function weight(obj) {
    if (!obj) return 0;

    // In C, wt is initialized to objects[obj->otyp].oc_weight.
    // We haven't implemented full objects.js import for oc_weight for all items yet,
    // but we can implement the COIN_CLASS specific logic requested by the user.
    if (obj.oclass === COIN_CLASS) {
        let wt = Math.trunc((obj.quan + 50) / 100);
        return Math.max(wt, 1);
    }

    // Fallback for non-gold items until full weight is ported
    return obj.owt || 1;
}

export function remove_object(otmp) {
    const x = otmp.ox;
    const y = otmp.oy;

    if (otmp.where !== OBJ_FLOOR) {
        throw new Error(`remove_object: obj where=${otmp.where}, not on floor`);
    }

    game.level.objects[x][y] = extract_nexthere(otmp, game.level.objects[x][y]);
    set_fobj(extract_nobj(otmp, fobj));

    // TODO: recalc_block_point for boulder
    // TODO: obj_timer_checks if timed
}

export function g_at(x, y) {
    let obj = game.level.objects[x][y];
    while (obj) {
        if (obj.oclass === COIN_CLASS) return obj;
        obj = obj.nexthere;
    }
    return null;
}

export function obj_extract_self(obj) {
    switch (obj.where) {
        case OBJ_FREE:
        // case OBJ_LUAFREE:
        // case OBJ_DELETED:
            break;
        case OBJ_FLOOR:
            remove_object(obj);
            break;
        // Stub for now, other list extractions
        default:
            // console.warn(`obj_extract_self: unhandled where=${obj.where}`);
            break;
    }
}
