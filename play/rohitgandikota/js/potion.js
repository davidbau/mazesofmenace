// potion.js — mirrors nethack-c/upstream/src/potion.c
//
// Only the blindness toggle is ported so far; the potion effects themselves
// are not. Functions arrive here in C file order as they are needed.

import { game } from './gstate.js';
import { pline } from './display.js';
import { vision_recalc } from './vision.js';
import { Blind, Blind_telepat, Infravision, Hallucination,
         See_invisible } from './youprop.js';
import { WARN_OF_MON, W_WEP } from './const.js';

function note_unported_potion(what) {
    (game.unported_potion ||= new Set()).add(what);
}

// src/potion.c:336 toggle_blindness() — called after blindness has just been
// toggled, in either direction.
export function toggle_blindness() {
    /* EWarn_of_mon is the raw extrinsic mask, not a boolean: the C tests
       whether the WIELDED weapon is what confers the warning, which is what
       makes Sting/Orcrist "quiver". youprop's Warn_of_mon() would collapse
       that to a yes/no and lose the W_WEP term. */
    const Stinging = !!(game.u?.uwep
                        && (game.u?.uprops?.[WARN_OF_MON]?.extrinsic & W_WEP));

    /* blindness has just been toggled */
    game.botl = true;          /* status conditions need update */
    game.vision_full_recalc = 1; /* vision has changed */
    /* this vision recalculation used to be deferred until moveloop(),
       but that made it possible for vision irregularities to occur
       (cited case was force bolt hitting an adjacent potion of blindness
       and then a secret door; hero was blinded by vapors but then got the
       message "a door appears in the wall" because wall spot was IN_SIGHT) */
    vision_recalc(0);
    if (Blind_telepat() || Infravision() || Stinging)
        note_unported_potion('toggle_blindness:see_monsters');
    /*
     * Avoid either of the sequences
     * "Sting starts glowing", [become blind], "Sting stops quivering" or
     * "Sting starts quivering", [regain sight], "Sting stops glowing"
     * by giving "Sting is quivering" when becoming blind or
     * "Sting is glowing" when regaining sight so that the eventual
     * "stops" message matches the most recent "Sting is ..." one.
     */
    if (Stinging)
        note_unported_potion('toggle_blindness:Sting_effects');
    /* update dknown flag for inventory picked up while blind */
    if (!Blind())
        note_unported_potion('toggle_blindness:learn_unseen_invent');
}

// src/potion.c:471 self_invis_message()
export async function self_invis_message() {
    await pline(`${Hallucination() ? "Far out, man!  You"
                                   : "Gee!  All of a sudden, you"} ${
        See_invisible() ? "can see right through yourself"
                        : "can't see yourself"}.`);
}
