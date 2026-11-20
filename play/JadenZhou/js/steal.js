// steal.js — monsters acquiring objects.
// C ref: steal.c mpickobj(), invent.c carry_obj_effects()

import { game } from './gstate.js';
import { add_to_minv } from './mkobj.js';
import * as O from './objects.js';

// C ref: invent.c carry_obj_effects()
function carry_obj_effects(obj) {
    /* Cursed figurines can spontaneously transform when carried. */
    if (obj.otyp === O.FIGURINE) {
        if (obj.cursed && obj.corpsenm !== -1 /* NON_PM */)
            throw new Error('carry_obj_effects(): attach_fig_transform_timeout() not ported yet');
    }
}

// C ref: steal.c mpickobj()
/* Returns 1 if otmp is free'd, 0 otherwise. */
export function mpickobj(mtmp, otmp) {
    if (!otmp)
        throw new Error('mpickobj(): monster taking or picking up nothing?');
    /* if monster is acquiring a thrown or kicked object, the throwing
       or kicking code shouldn't continue to track and place it */
    if (otmp === game.thrownobj)
        game.thrownobj = null;
    else if (otmp === game.kickedobj)
        game.kickedobj = null;
    /* an unpaid item can be on the floor; if a monster picks it up, take
       it off the shop bill */
    if (otmp.unpaid || (otmp.cobj && otmp.cobj.some(o => o.unpaid)))
        throw new Error('mpickobj(): subfrombill() not ported yet');
    /* don't want hidden light source inside the monster */
    if (otmp.lamplit)
        throw new Error('mpickobj(): obj_sheds_light() not ported yet');
    /* for hero owned object on shop floor, mtmp is taking possession
       and if it's eventually dropped in a shop, shk will claim it */
    otmp.no_charge = 0;
    /* some object handling is only done if mtmp isn't a pet */
    if (!mtmp.mtame)
        throw new Error('mpickobj(): non-pet pickup (unknow_object()) not ported yet');
    /* Must do carrying effects on object prior to add_to_minv() */
    carry_obj_effects(otmp);
    /* add_to_minv() might free otmp [if merged with something else],
       so we have to call it after doing the object checks */
    const freed_otmp = add_to_minv(mtmp, otmp);
    return freed_otmp;
}
