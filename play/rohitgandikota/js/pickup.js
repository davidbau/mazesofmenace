// pickup.js — picking things up off the floor, and looking at what is there.
// C ref: src/pickup.c
//
// Only the paths a session with autopickup OFF can reach are here so far:
// stepping onto objects routes pickup(1) -> check_here() -> look_here().
// The actual pick-up machinery (query_objlist, pickup_object, autopickup
// exceptions) is absent and recorded, never faked.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { OBJ_AT, LOOKHERE_NOFLAGS, LOOKHERE_PICKED_SOME } from './const.js';
import { You } from './pline.js';
import { flush_screen } from './display.js';
import { look_here } from './invent.js';
import { nomul } from './hack.js';
import { t_at, is_pool, is_lava } from './mon.js';
import { unconscious } from './trap.js';
import { is_pit } from './const.js';
import { Levitation } from './youprop.js';

function note_unported_pickup(what) {
    (game.unported ||= new Set()).add(what);
}

// src/hack.c can_reach_floor() — is the floor in reach?
//
// The trap parameter widens reach inside a pit. Riding, being stuck to a
// ceiling clinger, and polyform reach limits are states that cannot occur
// yet; levitation can, via potions and rings.
export function can_reach_floor(check_pit) {
    if (game.u.uswallow)
        return false;
    if (Levitation())
        return false;
    return true;
}

// src/pickup.c:430 check_here() — look at the objects at our location.
export async function check_here(picked_some) {
    let ct = 0;
    const lhflags = picked_some ? LOOKHERE_PICKED_SOME : LOOKHERE_NOFLAGS;

    if (game.flags?.mention_decor)
        note_unported_pickup('check_here:describe_decor');

    /* count the objects here */
    for (const obj of game.level?.objects || []) {
        if (obj.ox === game.u.ux && obj.oy === game.u.uy
            && obj !== game.uchain)
            ct++;
    }

    /* If there are objects here, take a look. */
    if (ct) {
        if (game.context.run)
            nomul(0);
        await flush_screen(1);
        await look_here(ct, lhflags);
    } else {
        /* read_engr_at(u.ux, u.uy) — draws and prints only when an engraving
           is underfoot */
        if ((game.level?.engravings || []).some(e => e.engr_x === game.u.ux
                                                && e.engr_y === game.u.uy))
            note_unported_pickup('check_here:read_engr_at');
    }
}

// src/pickup.c:475 pickup() — main pickup routine.
//
// `what` > 0 means autopickup is in progress; < 0 means "pick N"; 0 is the
// explicit ',' command. With flags.pickup off (the recorded rc default —
// optlist.h initval is Off in 5.0), an autopickup call lands in the
// check_here() arm and only looks. The true picking flows are recorded.
export async function pickup(what) {
    const autopickup = what > 0;

    /* we might have arrived here while fainted or sleeping */
    if (autopickup && game.multi < 0 && unconscious()) {
        return 0;
    }

    if (!game.u.uswallow) {
        /* no auto-pick if no-pick move, nothing there, or in a pool */
        if (autopickup && (game.context.nopick || !OBJ_AT(game.u.ux, game.u.uy)
                           || (is_pool(game.u.ux, game.u.uy) && !game.u.uinwater)
                           || is_lava(game.u.ux, game.u.uy))) {
            if (game.flags?.mention_decor)
                note_unported_pickup('pickup:describe_decor');
            if ((game.level?.engravings || []).some(e => e.engr_x === game.u.ux
                                                    && e.engr_y === game.u.uy))
                note_unported_pickup('pickup:read_engr_at');
            return 0;
        }
        /* no pickup if levitating & not on air or water level */
        const t = t_at(game.u.ux, game.u.uy);
        if (!can_reach_floor(!!(t && is_pit(t.ttyp)))) {
            note_unported_pickup('pickup:cant_reach_floor');
            return 0;
        }
        if ((game.multi && !game.context.run)
            || (autopickup && !game.flags?.autopickup)) {
            await check_here(false);
            return 0;
        }

        /* if there's anything here, stop running */
        if (OBJ_AT(game.u.ux, game.u.uy) && game.context.run
            && game.context.run !== 8 && !game.context.nopick)
            nomul(0);
    }

    /* the real picking flows: menus, counts, autopickup exceptions */
    note_unported_pickup('pickup:pick_flow');
    return 0;
}
