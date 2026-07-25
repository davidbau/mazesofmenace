// eat.js — nutrition.
// C ref: src/eat.c
//
// Only gethungry()'s once-per-turn draw is ported. 5.0 randomised the trigger:
// it used to be (moves % 20), and is now an explicit rn2(20), which is why a
// port that tracks the turn counter correctly still has to make the call.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { NOT_HUNGRY, ECMD_OK, ECMD_TIME } from './const.js';
import { getobj } from './invent.js';

// src/eat.c:3170 gethungry()
export function gethungry() {
    const u = game.u;

    if (u.uinvulnerable)
        return;                       /* forced to fast while praying */

    /* src/eat.c:3191 — rn2(20) replaces the old (int) (svm.moves % 20L) */
    const accessorytime = rn2(20);

    if (accessorytime % 2) {
        /* regeneration and encumbrance burn food; neither is ported */
    } else {
        /* ring of hunger / slow digestion; not ported */
    }

    if (u.uhunger !== undefined)
        u.uhunger--;
}

// src/eat.c:126 init_uhunger() — the hero starts well fed.
//
// exerper() reads uhunger every tenth move to decide which attribute to
// exercise, and each branch spends a different draw: NOT_HUNGRY exercises
// Constitution with rn2(19), while SATIATED and FAINTING both decrement with
// rn2(2). Leaving uhunger unset made every comparison fall through to FAINTING
// and drew the wrong one.
export function init_uhunger() {
    game.u.uhunger = 900;
    game.u.uhs = NOT_HUNGRY;
}

// src/eat.c floorfood() — offer each edible thing at the hero's feet with a
// y/n prompt, then fall through to getobj() for something carried.
//
// Each floor prompt reads ONE key, so the total depends on what is underfoot:
// a bear trap, iron bars, gold and a food item each add one. That makes the
// count data-dependent, and our floor contents are known to differ from C's on
// some levels, so guessing it would misalign a session rather than fix it.
// Only the clean case is ported — nothing edible underfoot, straight to
// getobj — and anything else is recorded.
export async function floorfood(verb, corpsecheck) {
    const here = (game.level?.objects || [])
        .filter(o => o.ox === game.u.ux && o.oy === game.u.uy);
    const trap = (game.level?.traps || [])
        .find(t => t.tx === game.u.ux && t.ty === game.u.uy);

    if (trap || here.length) {
        note_unported_eat('floorfood:floor prompts');
        return null;
    }

    return await getobj(verb, null, 0);
}

// src/eat.c doeat() — the 'e' command.
//
// The eating itself needs the nutrition, corpse and tin code. What is ported is
// the object prompt, because a session that eats and does not have its
// inventory letter consumed runs that letter as a command instead.
export async function doeat() {
    const otmp = await floorfood('eat', 0);

    if (!otmp)
        return ECMD_OK;

    note_unported_eat('doeat:eating');
    return ECMD_TIME;
}

function note_unported_eat(what) {
    (game.unported ||= new Set()).add(what);
}
