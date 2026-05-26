// attack.js — Hero vs monster melee (domove bump → uhitm.c subset).
// C ref: hack.c do_attack(), uhitm.c

import { game } from './gstate.js';
import { pline } from './display.js';
import { bumpMeleeAttackLikeC } from './uhitm_hero.js';

/**
 * C: domove → do_attack / uhitm — bump into adjacent monster.
 * Peaceful: `cmd.js` domove swaps places (hack.c displace); this function
 * still guards direct callers — pline only, no hit / no practice.
 * @param {{ mpeaceful?: number, mhp?: number, mx?: number, my?: number, mnum?: number, mvflags?: number, monnam?: string, isshk?: number, ispriest?: number, isgd?: number, data?: { mname?: string, mnum?: number, mvflags?: number } }} mtmp
 * @param {{ xkillFlags?: number }} [opts] — C `mondead`/`xkilled` flags (e.g. `XKILL_NOCORPSE`).
 */
export async function doBumpMeleeAttack(mtmp, opts = {}) {
    void opts;
    if (!mtmp) return;
    if (mtmp.mpeaceful | 0) {
        await pline('You stop to avoid hitting the peaceful creature.');
        return;
    }
    const g = game;
    g.u = g.u || {};
    g.u.dx = (mtmp.mx | 0) - (g.u.ux | 0);
    g.u.dy = (mtmp.my | 0) - (g.u.uy | 0);
    await bumpMeleeAttackLikeC(g, mtmp);
}
