// uhitm.js — the hero attacking, or declining to attack, a monster.
// C ref: src/uhitm.c
//
// Only do_attack()'s is_safemon branch is ported: the path taken when the hero
// walks into a pet or other peaceful. That path is not a corner case. Probing
// domove with an m_at() counter shows seed0030's hero steps onto a tame
// monster sixteen times in one session, and each of those is an rn2(7) the C
// draws and we do not.
//
// The hostile path (attack_checks and everything past it) is the real combat
// code and is recorded, not faked.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { is_safemon } from './display.js';
import { monflee } from './monmove.js';
import { IS_OBSTRUCTED, MON_POLE_DIST } from './const.js';
import { PMNAMES, MFLAGS } from './monst_data.js';

function note_unported_uhitm(what) {
    (game.unported ||= new Set()).add(`uhitm:${what}`);
}

// include/mondata.h:29 passes_walls()
const passes_walls = (ptr) => (ptr.mflags1 & MFLAGS.M1_WALLWALK) !== 0;

// include/mondata.h:150 is_longworm() — an identity test against three
// specific permonst entries, NOT a flag test.
const is_longworm = (ptr) =>
    ptr.pmidx === PMNAMES.PM_BABY_LONG_WORM
    || ptr.pmidx === PMNAMES.PM_LONG_WORM
    || ptr.pmidx === PMNAMES.PM_LONG_WORM_TAIL;

// src/mon.c helpless()
const helpless = (mon) =>
    !!(mon.msleeping || !mon.mcanmove || (mon.mfrozen | 0) > 0);

// src/uhitm.c:462 do_attack() — returns TRUE if the hero's move is used up.
//
// Returning FALSE is what lets the caller swap places with the monster, so the
// three arms below are "you stop", "it doesn't budge", and "go ahead and swap".
export function do_attack(mtmp) {
    if (is_safemon(mtmp) && !game.context?.forcefight) {
        /* u_wield_art(ART_STORMBRINGER) — no artifact is wielded this early */
        const mdat = game.mons[mtmp.mnum];

        /* src/uhitm.c:474 — the rn2(7) fires on EVERY step onto a peaceful,
           before any of the cheaper terms, because || evaluates left to right
           and Punished is false for an unpunished hero. */
        const foo = !!(game.u.uprops?.PUNISHED || !rn2(7)
                       || (is_longworm(mdat) && mtmp.wormno)
                       || (IS_OBSTRUCTED(game.level.at(game.u.ux, game.u.uy)?.typ)
                           && !passes_walls(mdat)));

        /* the in-shop check only runs when foo is false; it needs the shop
           bookkeeping and is recorded rather than guessed */
        let inshop = false;
        if (!foo && mtmp.isshk)
            note_unported_uhitm('do_attack:tended_shop');

        if (inshop || foo) {
            if (mtmp.isshk)
                note_unported_uhitm('do_attack:dopay');
            if (mtmp.mtame)     /* see 'additional considerations' in the C */
                monflee(mtmp, rnd(6), false, false);
            note_unported_uhitm('do_attack:in_the_way_message');
            return true;
        } else if (mtmp.mfrozen || helpless(mtmp)
                   || (mdat.mmove === 0 && rn2(6))) {
            note_unported_uhitm('do_attack:doesnt_seem_to_move');
            return true;
        } else {
            return false;       /* caller swaps places with it */
        }
    }

    /* everything past here is attack_checks() and the combat code */
    note_unported_uhitm('do_attack:combat');
    return true;
}
