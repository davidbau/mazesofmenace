// mon.js — Monster movement allotment and per-turn monster upkeep.
// C ref: mon.c
//
// Ported so far: mcalcmove().

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { MSLOW, MFAST, NORMAL_SPEED } from './const.js';

// C ref: mon.c mcalcmove()
export function mcalcmove(mon,
                          m_moving) /* True: adjust for moving;
                                     * False: just adjust for speed */
{
    const u = game.u;
    let mmove = mon.data.mmove;
    let mmove_adj;

    /* Note: MSLOW's `+ 1' prevents slowed speed 1 getting reduced to 0;
     *       MFAST's `+ 2' prevents hasted speed 1 from becoming a no-op;
     *       both adjustments have negligible effect on higher speeds.
     */
    if (mon.mspeed === MSLOW) {
        /* slow-monster effects work better against faster monsters: they
           lose 1/3 of their speed below 12 but 2/3 of their speed above */
        if (mmove < NORMAL_SPEED)
            mmove = Math.trunc((2 * mmove + 1) / 3);
        else
            mmove = 4 + Math.trunc(mmove / 3);
    } else if (mon.mspeed === MFAST)
        mmove = Math.trunc((4 * mmove + 2) / 3);

    if (mon === u.usteed && u.ugallop && game.context.mv) {
        /* increase movement by a factor of 1.5; also increase variance of
           movement speed (if it's naturally 24, we don't want it to always
           become 36) */
        mmove = Math.trunc(((rn2(2) ? 4 : 5) * mmove) / 3);
    }

    if (m_moving) {
        /* Randomly round the monster's speed to a multiple of NORMAL_SPEED.
           This makes it impossible for the player to predict when they'll
           get a free turn (thus preventing exploits like "melee kiting"),
           while retaining guarantees about shopkeepers not being outsped
           by a normal-speed player, normal-speed players being unable
           to open up a gap when fleeing a normal-speed monster, etc. */
        mmove_adj = mmove % NORMAL_SPEED;
        mmove -= mmove_adj;
        if (rn2(NORMAL_SPEED) < mmove_adj)
            mmove += NORMAL_SPEED;
    }
    return mmove;
}
