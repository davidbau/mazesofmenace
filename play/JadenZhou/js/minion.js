// minion.js — minions and summoned monsters.
// C ref: minion.c — monster_census().
//
// Not ported yet: the rest of minion.c (msummon(), summon_minion(),
// demon_talk(), bribe(), dprince(), dlord(), llord(), lminion(), ndemon(),
// lose_guardian_angel(), gain_guardian_angel()).

import { game } from './gstate.js';
import { canspotmon } from './display.js';

// C ref: minion.c monster_census()
/* count the number of monsters on the level */
export function monster_census(spotted) /* seen|sensed vs all */
{
    let count = 0;

    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.mhp < 1) /* DEADMONSTER() */
            continue;
        if (mtmp.isgd && mtmp.mx === 0)
            continue;
        if (spotted && !canspotmon(mtmp))
            continue;
        ++count;
    }
    return count;
}
