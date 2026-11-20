// dig.js -- burying objects (C ref: dig.c), plus dbridge.c is_ice().
//
// Only the parts reached during level creation are ported so far.

import { game } from './gstate.js';
import { rnd } from './rng.js';
import { ICE, DRAWBRIDGE_UP, DB_UNDER, DB_ICE, isok } from './const.js';
import {
    ROCK, BOULDER, CORPSE, LEASH, POT_OIL, POTION_CLASS, is_organic,
} from './objects.js';
import { obj_resists } from './dogmove.js';

// C ref: dbridge.c is_ice()
export function is_ice(x, y) {
    if (!isok(x, y))
        return false;
    const loc = game.level.at(x, y);
    const ltyp = loc.typ;
    if (ltyp === ICE || (ltyp === DRAWBRIDGE_UP
                         && ((loc.drawbridgemask || 0) & DB_UNDER) === DB_ICE))
        return true;
    return false;
}

// C ref: mkobj.c obj_extract_self() / remove_object() -- the cases
// bury_an_obj() reaches: floor objects live in game.level.objects.
function obj_extract_self(obj) {
    switch (obj.where) {
    case 'OBJ_FLOOR': {
        const fobj = game.level.objects || [];
        const i = fobj.indexOf(obj);
        if (i >= 0)
            fobj.splice(i, 1);
        obj.where = 'OBJ_FREE';
        break;
    }
    case 'OBJ_FREE':
        break;
    default:
        throw new Error(`obj_extract_self: where=${obj.where} is not ported yet`);
    }
}

// C ref: dig.c add_to_buried()
function add_to_buried(obj) {
    if (obj.where !== 'OBJ_FREE')
        throw new Error('add_to_buried: obj not free');
    obj.where = 'OBJ_BURIED';
    /* obj->nobj = svl.level.buriedobjlist; buriedobjlist = obj; */
    if (!game.level.buriedobjlist) game.level.buriedobjlist = [];
    game.level.buriedobjlist.unshift(obj);
}

// C ref: dig.c bury_an_obj()
/* Returns the next object in the pile (otmp->nexthere); the floor pile
   is read from game.level.objects. dealloced (optional) gets .v set. */
export function bury_an_obj(otmp, dealloced) {
    if (dealloced)
        dealloced.v = false;
    if (otmp === game.uball)
        throw new Error('bury_an_obj: burying the iron ball is not ported yet');
    /* after unpunish(), or might get deallocated chain */
    const pile = (game.level.objects || []).filter(
        o => o.ox === otmp.ox && o.oy === otmp.oy);
    const otmp2 = pile[pile.indexOf(otmp) + 1] || null;
    /*
     * obj_resists(,0,0) prevents Rider corpses from being buried.
     * It also prevents The Amulet and invocation tools from being
     * buried.
     */
    if (otmp === game.uchain || obj_resists(otmp, 0, 0))
        return otmp2;

    if (otmp.otyp === LEASH && otmp.leashmon)
        throw new Error('bury_an_obj: o_unleash() is not ported yet');

    if (otmp.lamplit && otmp.otyp !== POT_OIL)
        throw new Error('bury_an_obj: end_burn() is not ported yet');

    obj_extract_self(otmp);

    const under_ice = is_ice(otmp.ox, otmp.oy);
    if ((otmp.otyp === ROCK && !under_ice) || otmp.otyp === BOULDER) {
        /* merges into burying material; boulder removal is for #wizbury */
        if (dealloced)
            dealloced.v = true;
        /* obfree(otmp, (struct obj *) 0): nothing to free in JS */
        otmp.where = 'OBJ_DELETED';
        return otmp2;
    }
    /*
     * Start a rot on organic material.  Not corpses -- they
     * are already handled.
     */
    if (otmp.otyp === CORPSE) {
        ; /* should cancel timer if under_ice */
    } else if ((under_ice ? (otmp.oclass === POTION_CLASS) : is_organic(otmp))
               && !obj_resists(otmp, 5, 95)) {
        /* (void) start_timer(...): timers are not ported yet */
        otmp.timer = { when: (under_ice ? 0 : 250) + rnd(250),
                       action: 'ROT_ORGANIC' };
    }
    add_to_buried(otmp);
    return otmp2;
}
