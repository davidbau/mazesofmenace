// dog.js — the starting pet.
// C ref: src/dog.c
//
// makedog() runs between u_on_upstairs() and u_init_inventory_attrs()
// (src/allmain.c:814), not with the rest of hero setup. Getting that ordering
// wrong puts the pet's draws on the wrong side of the inventory's.
//
// The cost is small but very visible in the log: one rn2(2) from pet_type()
// when the role has no fixed pet, then a whole collect_coords() ring shuffle
// from enexto() to place it.

import { game } from './gstate.js';
import { obj_resists } from './zap.js';
import { MFLAGS } from './monst_data.js';
import { rn2 } from './rng.js';
import { PMNAMES } from './monst_data.js';
import { makemon, MM_EDOG, NO_MINVENT } from './makemon.js';

const NON_PM = -1;

// gu.urole.petnum is a PM_ name in the generated role table.
function petnumOf(role) {
    const p = role?.petnum;
    if (typeof p === 'number') return p;
    if (!p || p === 'NON_PM') return NON_PM;
    return PMNAMES[p] !== undefined ? PMNAMES[p] : NON_PM;
}

// src/dog.c:93 pet_type()
export function pet_type() {
    const petnum = petnumOf(game.urole);
    if (petnum !== NON_PM)
        return petnum;
    if (game.preferred_pet === 'c')
        return PMNAMES.PM_KITTEN;
    if (game.preferred_pet === 'd')
        return PMNAMES.PM_LITTLE_DOG;
    return rn2(2) ? PMNAMES.PM_KITTEN : PMNAMES.PM_LITTLE_DOG;
}

// src/dog.c:111 makedog()
export function makedog() {
    if (game.preferred_pet === 'n') {
        game.context.startingpet_typ = NON_PM;
        return null;
    }

    const pettype = game.context.startingpet_typ = pet_type();

    /* NO_MINVENT stops makemon() giving a pony an already-worn saddle */
    const mtmp = makemon(game.mons[pettype], game.u.ux, game.u.uy,
                         MM_EDOG | NO_MINVENT);
    if (!mtmp)
        return null;

    initedog(mtmp);
    return mtmp;
}

// src/dog.c initedog() — tame flags only, no draw.
function initedog(mtmp) {
    mtmp.mtame = 10;
    mtmp.mpeaceful = 1;
    mtmp.mavenge = 0;
    mtmp.mleashed = 0;
}

// ---------------------------------------------------------------------------
// The pet's turn. dog_goal() scans a 5-square radius for something worth
// walking to, and calls dogfood() on every object it finds.
// ---------------------------------------------------------------------------

// include/dog.h — dogfood() return values, best first.
export const DOGFOOD = 0, CADAVER = 1, ACCFOOD = 2, MANFOOD = 3, APPORT = 4,
             POISON = 5, UNDEF = 6, TABU = 7;

// src/dog.c:995 dogfood() — only the part that draws is ported.
//
// The second test is the one that matters for the stream:
//
//     if (is_quest_artifact(obj) || obj_resists(obj, 0, 95))
//
// obj_resists always draws rn2(100) for an ordinary object and, with ochance 0,
// always returns false. So EVERY object the pet looks at costs exactly one
// rn2(100) here — which is why the recordings show obj_resists arriving before
// dog_goal's own rn2(8) rather than after it, even though the C line that names
// can_carry() sits later in the same condition.
export function dogfood(mon, obj) {
    if (obj.opoisoned && !resists_poison(mon))
        return POISON;
    if (is_quest_artifact(obj) || obj_resists(obj, 0, 95))
        return obj.cursed ? TABU : APPORT;

    /* The classification that follows draws nothing: it is a switch on
       oclass and a set of predicate tests. Not ported yet — reaching it is
       recorded so the gap is visible rather than guessed at. */
    note_unported('dogfood classification');
    return UNDEF;
}

/* src/artifact.c is not ported; no session generates a quest artifact this
   early, and the call draws nothing either way. */
function is_quest_artifact(obj) { return false; }

/* src/mondata.h resists_poison() */
function resists_poison(mon) {
    return !!(mon.data?.mresists & MFLAGS.MR_POISON);
}

function note_unported(what) {
    (game.unported ||= new Set()).add(what);
}
