// sounds.js — ambient level noises.
// C ref: src/sounds.c
//
// dosounds() runs once per turn and its draws are gated on what the level
// contains, in a fixed order: fountains first, then sinks. A level with
// fountains but no sinks draws rn2(400); one with sinks but no fountains draws
// rn2(300); one with both draws rn2(400) and then, only if that missed, still
// draws rn2(300) — the tests are independent `if`s, not a chain.

import { game } from './gstate.js';
import { MFLAGS } from './monst_data.js';
import { canseemon } from './display.js';
import { helpless } from './monst.js';
import { rn2 } from './rng.js';
import { ECMD_OK, IS_WALL, SDOOR, isok } from './const.js';
import { getdir } from './cmd.js';
import { m_at } from './mon.js';
import { Deaf, Hallucination } from './youprop.js';
import { pline_The } from './pline.js';
import { pline } from './display.js';

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

    const tx = game.u.ux + game.u.dx, ty = game.u.uy + game.u.dy;
    if (!isok(tx, ty))
        return ECMD_OK;

    const mtmp = m_at(tx, ty);

    if (!mtmp || mtmp.mundetected) {
        /* src/sounds.c:1335 — a statue at the target: recorded (vobj_at plus
           the hallucination monster name). */
        const loc = game.level.at(tx, ty);
        if (!Deaf() && (IS_WALL(loc.typ) || loc.typ === SDOOR)) {
            /* Talking to a wall; a secret door remains hidden by behaving
               like a wall. The Blind arm needs lastseentyp and is recorded. */
            /* this tree tracks blindness as game.u.ublind */
            if (game.u?.ublind) {
                note_unported_sounds('dochat:blind_wall');
            } else if (!Hallucination()) {
                await pline("It's like talking to a wall.");
            } else {
                const walltalk = [
                    "gripes about its job.",
                    "tells you a funny joke!",
                    "insults your heritage!",
                    "chuckles.",
                    "guffaws merrily!",
                    "deprecates your exploration efforts.",
                    "suggests a stint of rehab...",
                    "doesn't seem to be interested.",
                ];
                let idx = rn2(10);

                if (idx >= walltalk.length)
                    idx = walltalk.length - 1;
                await pline_The(`wall ${walltalk[idx]}`);
            }
            return ECMD_OK;
        }
    }

    if (!mtmp || mtmp.mundetected)
        return ECMD_OK; /* "talking to thin air" */

    note_unported_sounds('dochat:domonnoise');
    return ECMD_OK;
}

function note_unported_sounds(what) {
    (game.unported ||= new Set()).add(what);
}

// src/sounds.c growl() — the monster makes a noise.
//
// The early return is on helpless() OR msound == MS_SILENT, so a sleeping,
// paralysed or genuinely mute monster is silent and costs nothing.
//
// The structure below the verb lookup is the part worth keeping exactly:
// the pline and the run-interrupt are inside `canseemon(mtmp) || !Deaf`,
// but wake_nearto() is OUTSIDE it, inside only `if (growl_verb)`. The noise
// wakes nearby monsters whether or not YOU hear it. Folding wake_nearto in
// with the message -- they read as one event -- would make a deaf hero's
// growls silent to the whole level.
//
// The radius is mlevel * 18, so a bigger monster wakes a wider circle.
//
// ROLL_FROM(h_sounds) is a draw but only under Hallucination. growl_sound
// (a table lookup on msound) and wake_nearto are recorded.
export function growl(mtmp) {
    let growl_verb = 0;

    if (helpless(mtmp) || game.mons[mtmp.mnum].msound === MFLAGS.MS_SILENT)
        return;

    /* presumably nearness and soundok checks have already been made */
    if (game.u.uprops?.HALLUC)
        growl_verb = note_sounds_unported('growl:h_sounds');   /* ROLL_FROM */
    else
        growl_verb = note_sounds_unported('growl:growl_sound');
    if (growl_verb) {
        if (canseemon(mtmp) || !game.u.uprops?.DEAF) {
            note_sounds_unported('growl:pline');
            if (game.context?.run)
                note_sounds_unported('growl:nomul');
        }
        /* OUTSIDE the canseemon check on purpose */
        note_sounds_unported('growl:wake_nearto');
    }
}

const note_sounds_unported = (w) => {
    (game.unported ||= new Set()).add('sounds:' + w);
    return 0;
};
