// pickup.js — picking up objects.
// C ref: pickup.c
//
// Ported so far: the start of pickup(), up to autopickup's early return
// when there's nothing at the hero's spot.  autopick(), query_objlist(),
// check_here() and the rest of pickup.c are not ported yet.

import { game } from './gstate.js';
import { is_pool, is_lava } from './makemon.js';
import { engr_at } from './engrave.js';

// C ref: display.h OBJ_AT() -> level.objects[x][y] != 0
function OBJ_AT(x, y) {
    for (const o of game.level?.objects || [])
        if (o.ox === x && o.oy === y && o.where === 'OBJ_FLOOR')
            return true;
    return false;
}

// C ref: engrave.c read_engr_at() -- only the nothing-to-read case is
// ported yet
function read_engr_at(x, y) {
    const ep = engr_at(x, y);
    if (ep && ep.engr_txt?.actual_text?.[0])
        throw new Error('read_engr_at(): reading an engraving not ported yet');
}

// C ref: pickup.c pickup()
/*
 * Pick up objects from the ground (or from a monster's inventory if
 * swallowed).  'what' > 0 means autopickup; < 0 means pick up -what
 * of something.
 */
export async function pickup(what) /* should be a long */ {
    const u = game.u;
    const autopickup = what > 0;

    /* we might have arrived here while fainted or sleeping, via
       random teleport or levitation timeout; if so, skip check_here
       and read_engr_at in addition to bypassing autopickup itself */
    if (autopickup && game.multi < 0 /* && unconscious() */)
        throw new Error('pickup(): unconscious() not ported yet');

    /* used by pickup_object() for encumbrance feedback */
    game.pickup_encumbrance = 0;

    if (!u.uswallow) {
        /* no auto-pick if no-pick move, nothing there, or in a pool */
        if (autopickup && (game.context?.nopick || !OBJ_AT(u.ux, u.uy)
                           || (is_pool(u.ux, u.uy) && !u.uinwater)
                           || is_lava(u.ux, u.uy))) {
            if (game.flags?.mention_decor)
                throw new Error('pickup(): describe_decor() not ported yet');
            read_engr_at(u.ux, u.uy);
            return 0;
        }
    }
    throw new Error('pickup(): picking up objects not ported yet');
}
