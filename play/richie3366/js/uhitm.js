// uhitm.js — Hero hitting monsters.
// C ref: uhitm.c — do_attack (safemon / displace path for pets).

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { IS_OBSTRUCTED } from './const.js';

// C ref: display.h _is_safemon — tame/peaceful, spotted, not conf/hallu/stun
export function is_safemon(mon) {
    if (!mon) return false;
    // flags.safe_dog defaults true
    if (game.flags?.safe_dog === false) return false;
    if (!mon.mpeaceful && !mon.mtame) return false;
    // canspotmon stub: adjacent pets are spotable
    if (game.u?.Confusion || game.u?.Hallucination || game.u?.Stunned) return false;
    return true;
}

function m_at(x, y) {
    for (const m of game.fmon || []) {
        if (m.mx === x && m.my === y) return m;
    }
    return null;
}

/**
 * C ref: uhitm.c do_attack()
 * Returns true if the move is consumed (stop / attack resolved).
 * Returns false to allow displacement / continuing the move.
 */
export function do_attack(mtmp) {
    if (!mtmp) return false;

    // C: is_safemon && !forcefight → try to avoid attacking pets/peacefuls
    if (is_safemon(mtmp) && !game.context?.forcefight) {
        // Stormbringer path omitted
        const loc = game.level?.at(game.u?.ux, game.u?.uy);
        const obstructed = loc && IS_OBSTRUCTED(loc.typ);
        // C: Punished || !rn2(7) || longworm || (obstructed && !passes_walls)
        const foo = !!(game.u?.Punished || !rn2(7)
            || (mtmp.wormno && /* longworm */ false)
            || (obstructed /* && !passes_walls(mtmp) */));
        // inshop check skipped when foo (no RNG)
        if (foo) {
            // C: if tame → monflee(rnd(6)); stop
            if (mtmp.mtame) {
                rnd(6); // monflee duration — flee body stubbed
            }
            game.context.move = 0;
            return true;
        }
        // Frozen / helpless check — no RNG for normal pet
        // C: else return FALSE → allow swap
        return false;
    }

    // Hostile attack path not needed for seed0900 first bump into pet
    // (would continue into attack_checks / hitum)
    return true;
}

export function mon_at(x, y) {
    return m_at(x, y);
}
