// potion.js -- quaffing potions.
// C ref: potion.c
//
// Ported so far: the #quaff command up to choosing the potion
// (drink_ok() and dodrink()'s getobj()); drinking from fountains and
// sinks and the potion effects are not ported yet.

import { game } from './gstate.js';
import { pline } from './display.js';
import { getobj } from './invent.js';
import { can_reach_floor } from './engrave.js';
import { GETOBJ_SUGGEST, GETOBJ_EXCLUDE, GETOBJ_EXCLUDE_NONINVENT,
         GETOBJ_NOFLAGS, ECMD_OK, ECMD_CANCEL, STRANGLED, IS_FOUNTAIN,
         IS_SINK } from './const.js';
import { POTION_CLASS } from './objects.js';

let drink_ok_extra = 0;

/* C ref: you.h Strangled, Underwater */
function Strangled() {
    const p = game.u?.uprops?.[STRANGLED];
    return !!(p?.intrinsic || p?.extrinsic);
}

// C ref: potion.c drink_ok() -- getobj callback for object to drink from
function drink_ok(obj) {
    /* getobj()'s callback to test whether hands/self is a valid "item" to
       pick is used here to communicate the fact that player has already
       passed up an opportunity to perform the action (drink or dip) on a
       non-inventory dungeon feature */
    if (!obj)
        return drink_ok_extra ? GETOBJ_EXCLUDE_NONINVENT : GETOBJ_EXCLUDE;

    if (obj.oclass === POTION_CLASS)
        return GETOBJ_SUGGEST;

    return GETOBJ_EXCLUDE;
}

// C ref: potion.c dodrink() -- the #quaff command
export async function dodrink() {
    if (Strangled()) {
        await pline("If you can't breathe air, how can you drink liquid?");
        return ECMD_OK;
    }

    drink_ok_extra = 0;
    /* preceding 'q'/#quaff with 'm' skips the possibility of drinking
       from fountains, sinks, and surrounding water plus the prompting
       which those entail */
    if (!game.iflags?.menu_requested) {
        const typ = game.level.at(game.u.ux, game.u.uy).typ;
        /* Is there a fountain to drink from here? */
        if (IS_FOUNTAIN(typ) && can_reach_floor(false))
            throw new Error('dodrink(): "Drink from the fountain?" not ported yet');
        /* Or a kitchen sink? */
        if (IS_SINK(typ) && can_reach_floor(false))
            throw new Error('dodrink(): "Drink from the sink?" not ported yet');
        /* Or are you surrounded by water? */
        if (game.u.uinwater && !game.u.uswallow)
            throw new Error('dodrink(): drinking the water around you not ported yet');
    }

    const otmp = await getobj("drink", drink_ok, GETOBJ_NOFLAGS);
    if (!otmp)
        return ECMD_CANCEL;
    throw new Error('dodrink(): drinking a potion not ported yet');
}
