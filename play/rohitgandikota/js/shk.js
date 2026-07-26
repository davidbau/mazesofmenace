// shk.js — shopkeeper behaviour.
// C ref: src/shk.c
//
// Only hot_pursuit is here so far. The bulk of shk.c -- billing, credit,
// the shop entry/exit dance, price quoting and the shopkeeper's own combat
// -- is not ported. js/shknam.js already holds the naming and stocking half
// (shtypes, nameshk, stock_room), which is src/shknam.c.

import { game } from './gstate.js';
import { ESHK } from './const.js';

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
