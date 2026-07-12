// trap.js — Trap trigger subset for monster steps.
// C ref: trap.c — t_at, t_missile, thitm, mintrap, trapeffect_dart_trap (monster).

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { mksobj, place_object, weight } from './mkobj.js';
import { find_mac } from './mhitm.js';
import { newsym, pline } from './display.js';
import { doname } from './objnam.js';
import { DART_TRAP, FORCETRAP, FORCEBUNGLE } from './const.js';
import { objectNames } from './objects.js';
import { monsterNames } from './monsters.js';

const DART = objectNames.indexOf('DART');

// C ref: trap.h enum trap_result
export const Trap_Effect_Finished = 0;
export const Trap_Is_Gone = 1;
export const Trap_Killed_Mon = 2;
export const Trap_Caught_Mon = 3;
export const Trap_Moved_Mon = 4;

export const NO_TRAP_FLAGS = 0;

// C ref: trap.c t_at()
export function t_at(x, y) {
    const traps = game.level?.traps;
    if (!traps) return null;
    for (const t of traps) {
        if (t && t.tx === x && t.ty === y) return t;
    }
    return null;
}

// C ref: trap.c t_missile() — single arrow/dart/rock for a trap
function t_missile(otyp, trap) {
    const otmp = mksobj(otyp, true, false);
    otmp.quan = 1;
    otmp.owt = weight(otmp);
    otmp.opoisoned = 0;
    otmp.ox = trap.tx;
    otmp.oy = trap.ty;
    return otmp;
}

// C ref: mkobj.c stackobj — merge omitted (no RNG on miss-path dart drop)
function stackobj(_obj) {
    /* named omission: merge same-otyp floor stacks */
}

// C ref: monnam.c Monnam — trap miss/hit messages use "The <type>" for pets
function Monnam(mon) {
    const raw = mon?.data?.name || monsterNames[mon?.mnum] || 'monster';
    const plain = String(raw).replace(/^PM_/, '').replace(/_/g, ' ').toLowerCase();
    return `The ${plain}`;
}

// C: cansee stub — lit/visible early-session cells treated as seen
function cansee(_x, _y) {
    return true;
}

// C ref: trap.c thitm() — monster hit by trap missile
async function thitm(tlev, mon, obj, d_override, _nocorpse) {
    let strike;
    if (d_override) {
        strike = 1;
    } else if (obj) {
        strike = (find_mac(mon) + tlev + (obj.spe | 0) <= rnd(20)) ? 1 : 0;
    } else {
        strike = (find_mac(mon) + tlev <= rnd(20)) ? 1 : 0;
    }

    if (!strike) {
        // C: pline before place_object — triggers --More-- after prior cursemsg
        if (obj && cansee(mon.mx, mon.my)) {
            await pline(`${Monnam(mon)} is almost hit by ${doname(obj)}!`);
        }
    } else {
        // Hit path: apply damage; miss is the verified early-session path.
        // Full dmgval/monkilled deferred.
        if (obj && cansee(mon.mx, mon.my)) {
            await pline(`${Monnam(mon)} is hit by ${doname(obj)}!`);
        }
        let dam = 1;
        if (d_override) {
            dam = d_override;
        } else if (obj) {
            // C: dam = dmgval(obj, mon); clamp to >= 1 — stub 1 until dmgval ported
            dam = 1;
        }
        mon.mhp = (mon.mhp || 0) - dam;
        if (mon.mhp <= 0) {
            mon.mhp = 0;
            // monkilled omitted — mark dead for caller
            if (obj) { /* dealloc_obj stub */ }
            return true;
        }
        if (obj) { /* dealloc_obj stub — missile used up on hit */ }
        return false;
    }

    // C: place missile on miss (or d_override path)
    if (obj && (!strike || d_override)) {
        place_object(obj, mon.mx, mon.my);
        stackobj(obj);
    }
    return false;
}

// C ref: trap.c seetrap()
export function seetrap(trap) {
    if (trap && !trap.tseen) {
        trap.tseen = true;
        newsym(trap.tx, trap.ty);
    }
}

// C ref: trap.c trapeffect_dart_trap — monster branch only
async function trapeffect_dart_trap(mtmp, trap) {
    // Hero branch omitted (named omission)
    if (trap.once && trap.tseen && !rn2(15)) {
        // deltrap omitted visually; remove from list
        const traps = game.level?.traps;
        if (traps) {
            const i = traps.indexOf(trap);
            if (i >= 0) traps.splice(i, 1);
        }
        newsym(mtmp.mx, mtmp.my);
        return Trap_Is_Gone;
    }
    trap.once = true;
    const otmp = t_missile(DART, trap);
    if (!rn2(6)) otmp.opoisoned = 1;
    // C: if (in_sight) seetrap(trap);
    seetrap(trap);
    const trapkilled = await thitm(7, mtmp, otmp, 0, false);
    return trapkilled ? Trap_Killed_Mon
        : (mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished);
}

// C ref: trap.c trapeffect_selector — dart only; other types no-op
async function trapeffect_selector(mtmp, trap, _trflags) {
    switch (trap.ttyp) {
    case DART_TRAP:
        return trapeffect_dart_trap(mtmp, trap);
    default:
        // Named omission: arrow/bear/pit/… monster trap effects
        return Trap_Effect_Finished;
    }
}

/**
 * C ref: trap.c mintrap() — monster steps on a trap.
 * Early-session envelope: unseen dart trap on a pet (no already_seen skip,
 * no madeby_u, not flying). Other trap types and escape paths deferred.
 */
export async function mintrap(mtmp, mintrapflags = NO_TRAP_FLAGS) {
    const trap = t_at(mtmp.mx, mtmp.my);
    if (!trap) {
        mtmp.mtrapped = 0;
        return Trap_Effect_Finished;
    }
    if (mtmp.mtrapped) {
        // Already trapped escape path omitted
        return mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
    }

    const forcetrap = (mintrapflags & FORCETRAP) !== 0;
    const forcebungle = (mintrapflags & FORCEBUNGLE) !== 0;
    // mon_knows_traps stub: pets start without trap knowledge
    const already_seen = false;

    if (!forcetrap) {
        // floor_trigger + check_in_air omitted (pets on floor)
        if (already_seen && rn2(4) && !forcebungle) {
            return Trap_Effect_Finished;
        }
    }

    // mon_learns_traps / mons_see_trap / madeby_u rnl omitted (no RNG here)
    return await trapeffect_selector(mtmp, trap, mintrapflags);
}
