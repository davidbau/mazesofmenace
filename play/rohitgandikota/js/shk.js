// shk.js — shopkeeper behaviour.
// C ref: src/shk.c
//
// Only hot_pursuit is here so far. The bulk of shk.c -- billing, credit,
// the shop entry/exit dance, price quoting and the shopkeeper's own combat
// -- is not ported. js/shknam.js already holds the naming and stocking half
// (shtypes, nameshk, stock_room), which is src/shknam.c.

import { game } from './gstate.js';
import { ESHK, SHOPBASE, IS_DOOR } from './const.js';
import { in_rooms } from './hack.js';
import { distu, dist2, online2 } from './hacklib.js';
import { m_canseeu } from './monmove.js';
import { move_special } from './priest.js';
import { carrying, sobj_at } from './invent.js';
import { wake_nearto } from './mon.js';
import { Invis } from './youprop.js';
import { Fast } from './attrib.js';
import { ONAMES } from './objects_data.js';

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

    const eshk = ESHK(shkp);
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

// src/shk.c costly_spot() — is (x,y) a square a shopkeeper charges for?
//
// The has_shop early return is ported in full and is what answers on every
// ordinary level, which is why useupf() can call this safely today. The rest
// needs shop_keeper(), in_rooms(), inhishop() and ESHK's shk coordinates,
// none of which exist yet. A level that DOES have a shop records rather than
// guessing: answering FALSE there would silently let the hero consume shop
// goods for free.
export function costly_spot(x, y) {
    if (!game.level?.flags?.has_shop)
        return false;

    (game.unported ||= new Set()).add('shk:costly_spot');
    return false;
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
import { inhishop } from './monmove.js';
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
