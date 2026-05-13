// sounds.js — Sound events.
// C ref: sounds.c

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { pline } from './display.js';
import { Is_oracle_level } from './const.js';

export async function dosounds() {
    const g = game;
    // Deaf or acoustics disabled
    if (g.u?.uprops?.deaf || g.flags?.acoustics === false || g.u?.uswallow || g.u?.uprops?.underwater)
        return;

    const hallu = (g.u?.uprops?.hallucination) ? 1 : 0;
    const lvl = g.level;
    if (!lvl) return;

    if (lvl.flags.nfountains && !rn2(400)) {
        const msg = ["bubbling water.", "water falling on coins.", "the splashing of a naiad.", "a soda fountain!"];
        await pline("You hear " + msg[rn2(3) + hallu]);
    }
    if (lvl.flags.nsinks && !rn2(300)) {
        const msg = ["a slow drip.", "a gurgling noise.", "dishes being washed!"];
        await pline("You hear " + msg[rn2(2) + hallu]);
    }
    if (lvl.flags.has_zoo && !rn2(200)) {
        // Ambient zoo monster sounds are not rendered yet.  The gate belongs
        // here so the turn tail keeps the same RNG ownership as sounds.c.
        return;
    }
    if (Is_oracle_level(g.u?.uz) && !rn2(400)) {
        // C ref: sounds.c:dosounds(); Oracle level has a final ambient
        // sound gate after ordinary feature/special-room sound gates.
        return;
    }
    // TODO: Implement more sounds (throne, swamp, vault, beehive, etc.)
}
