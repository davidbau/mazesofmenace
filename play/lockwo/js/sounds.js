// sounds.js — Ambient level sounds emitted once per turn.
// C ref: sounds.c dosounds().
//
// Only the RNG side-effects matter for parity.  Each gated probe is driven
// by the current level's flags (data-driven, no per-seed special casing),
// matching the C order exactly; the first probe that "fires" returns.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { phase_of_the_moon, night, FULL_MOON } from './calendar.js';

// C ref: sounds.c dosounds().  Deaf/acoustics/swallow/underwater short-circuit
// before any roll.  Each `level.flags.*` clause rolls rn2(N) when the feature
// is present and returns after producing a (suppressed) message.
export function dosounds() {
    const g = game;
    if (g.flags?.acoustics === false || g.u?.uswallow || g.u?.uunderwater)
        return;

    const lf = g.level?.flags || {};
    const hallu = 0; // Hallucination not modeled in the move loop

    if (lf.nfountains && !rn2(400)) { rn2(3); return; }
    if (lf.nsinks && !rn2(300)) { rn2(2); return; }
    if (lf.has_court && !rn2(200)) { return; }
    if (lf.has_swamp && !rn2(200)) { rn2(2); return; }
    if (lf.has_vault && !rn2(200)) { return; }
    if (lf.has_beehive && !rn2(200)) { return; }
    if (lf.has_morgue && !rn2(200)) { return; }
    if (lf.has_barracks && !rn2(200)) { rn2(3); return; }
    if (lf.has_zoo && !rn2(200)) { return; }
    if (lf.has_shop && !rn2(200)) { rn2(2); return; }
    if (lf.has_temple && !rn2(200)) { return; }
    // oracle-level chant: rn2(400) — only on the oracle level (not modeled).
}

// ── ECMD_* return codes (cmd.h) ──
const ECMD_OK = 0;
const ECMD_TIME = 1;

// C ref: sounds.c domonnoise(mtmp) — the speech/sound a monster makes when the
// hero #chats with it.  Only the animal-sound classes the contest pets fall
// into are modelled (dogs -> MS_BARK).  Every domonnoise() path returns
// ECMD_TIME (a turn elapses); the bark/whine selection itself rolls no RNG.
//
// Non-modelled msounds fall through to the silent ECMD_TIME tail — the only
// chat targets in the owned sessions are the starter dog and empty squares.
export async function domonnoise(mtmp) {
    const { pline } = await import('./display.js');
    const { Monnam } = await import('./uhitm.js');
    if (game.u?.Deaf) return ECMD_OK;

    const mlet = mtmp?.data?.mlet;
    let pline_msg = null;

    if (mlet === 'd') { // S_DOG -> MS_BARK
        if (phase_of_the_moon() === FULL_MOON && night()) {
            pline_msg = 'howls.';
        } else if (mtmp.mpeaceful) {
            const moves = game.moves || 1;
            const hungrytime = mtmp.edog ? (mtmp.edog.hungrytime ?? 0) : 0;
            if (mtmp.mtame
                && (mtmp.mconf || mtmp.mflee || mtmp.mtrapped
                    || moves > hungrytime || mtmp.mtame < 5))
                pline_msg = 'whines.';
            else if (mtmp.mtame && hungrytime > moves + 1000)
                pline_msg = 'yips.';
            else
                pline_msg = 'barks.'; // (dingoes excepted; not a starter pet)
        } else {
            pline_msg = 'growls.';
        }
    }

    if (pline_msg) await pline(`${Monnam(mtmp)} ${pline_msg}`);
    return ECMD_TIME;
}
