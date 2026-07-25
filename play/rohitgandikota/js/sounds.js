// sounds.js — ambient level noises.
// C ref: src/sounds.c
//
// dosounds() runs once per turn and its draws are gated on what the level
// contains, in a fixed order: fountains first, then sinks. A level with
// fountains but no sinks draws rn2(400); one with sinks but no fountains draws
// rn2(300); one with both draws rn2(400) and then, only if that missed, still
// draws rn2(300) — the tests are independent `if`s, not a chain.

import { game } from './gstate.js';
import { rn2 } from './rng.js';

// src/sounds.c:202 dosounds()
export function dosounds() {
    const u = game.u;
    if (u.uswallow || u.Underwater)
        return;
    if (game.flags?.acoustics === false)
        return;

    const f = game.level?.flags || {};

    if (f.nfountains && !rn2(400)) {
        /* You_hear1(fountain_msg[rn2(3) + hallu]) */
        rn2(3);
    }
    if (f.nsinks && !rn2(300)) {
        rn2(2);
    }
    if (f.has_court && !rn2(200)) {
        note_unported('dosounds throne room');
    }
    if (f.has_swamp && !rn2(200)) {
        note_unported('dosounds swamp');
    }
    if (f.has_vault && !rn2(200)) {
        note_unported('dosounds vault');
    }
    if (f.has_beehive && !rn2(200)) {
        note_unported('dosounds beehive');
    }
    if (f.has_morgue && !rn2(200)) {
        note_unported('dosounds morgue');
    }
    if (f.has_barracks && !rn2(200)) {
        note_unported('dosounds barracks');
    }
    if (f.has_zoo && !rn2(200)) {
        note_unported('dosounds zoo');
    }
    if (f.has_shop && !rn2(200)) {
        note_unported('dosounds shop');
    }
}

function note_unported(what) {
    (game.unported ||= new Set()).add(what);
}
