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
import { ECMD_OK } from './const.js';
import { getdir } from './cmd.js';
import { m_at } from './mon.js';

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

// src/sounds.c:1257 dochat() — the 'c' command.
//
// Its one input read is getdir("Talk to whom?"), so chatting costs TWO keys:
// the command and the direction. Leaving it unhandled ran the direction key as
// a movement command, the same failure that made an unhandled 'f' walk the hero
// a square east.
//
// The early exits above getdir — polymorphed mute, strangled, swallowed,
// underwater, standing on shop merchandise — all return before reading
// anything, and none is reachable for an ordinary hero on an ordinary level.
export async function dochat() {
    if (!await getdir('Talk to whom? (in what direction)'))
        return ECMD_OK; /* ECMD_CANCEL */

    /* src/sounds.c — chatting downward, at yourself, or at empty air all
       return without a turn; only domonnoise() on a real monster can take one,
       and that needs the monster-sound tables. */
    if (game.u.dz)
        return ECMD_OK;
    if (game.u.dx === 0 && game.u.dy === 0)
        return ECMD_OK;

    const mtmp = m_at(game.u.ux + game.u.dx, game.u.uy + game.u.dy);
    if (!mtmp)
        return ECMD_OK; /* "talking to thin air" */

    note_unported_sounds('dochat:domonnoise');
    return ECMD_OK;
}

function note_unported_sounds(what) {
    (game.unported ||= new Set()).add(what);
}
