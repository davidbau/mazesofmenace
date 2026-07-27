// zap.js — wands, spells and the rays they throw.
// C ref: src/zap.c
//
// Only obj_resists() is here so far. It is the first thing needed from this
// file because meatmetal() calls it before eating anything, which puts its
// rn2(100) into the stream ahead of the next monster's turn.

import { game } from './gstate.js';
import { OCLASSES } from './objects_data.js';
import { DEADMONSTER } from './monst.js';
import { killed, shieldeff_mon } from './mon.js';
import { ONAMES } from './objects_data.js';
import { rn2 } from './rng.js';

import { is_rider } from './mondata.js';

// src/zap.c:1459 obj_resists() — does this object survive being destroyed?
//
// ochance/achance are PERCENTAGES, and the artifact one is checked against the
// same single draw, so the rn2(100) is spent whether or not the object is an
// artifact. Skipping the draw for ordinary objects would desynchronise the
// stream even when the answer happened to be right.
export function obj_resists(obj, ochance, achance) {
    if (obj.otyp === ONAMES.AMULET_OF_YENDOR
        || obj.otyp === ONAMES.SPE_BOOK_OF_THE_DEAD
        || obj.otyp === ONAMES.CANDELABRUM_OF_INVOCATION
        || obj.otyp === ONAMES.BELL_OF_OPENING
        || (obj.otyp === ONAMES.CORPSE && is_rider(game.mons[obj.corpsenm]))) {
        return true;
    } else {
        const chance = rn2(100);

        return chance < (obj.oartifact ? achance : ochance);
    }
}

// src/zap.c:3547 exclam() — the punctuation that ends a hit message, and it
// encodes the damage: "?" for a negative force, "." for 4 or less, "!" above
// that. force == 0 happens with e.g. a sleep ray.
export function exclam(force) {
    return (force < 0) ? '?' : (force <= 4) ? '.' : '!';
}

// src/zap.c:6100 resist() — the magic-resistance saving throw.
//
// One draw, and its MODULUS is computed rather than constant:
//
//     resisted = rn2(100 + alev - dlev) < mtmp->data->mr;
//
// alev comes from the item class attacking (a wand is 12, an instrument or
// artifact 10, a scroll 9, a potion 6, a ring 5, a spell your own level) and
// dlev from the monster, clamped to 50 above and raised to 1 below. So the
// span of the roll differs per call and rn2's argument is NOT interchangeable
// with a fixed 100 -- getting alev wrong changes the stream, not just the
// odds.
//
// The fake-player shortcut returns BEFORE the draw, so a Conflict ring test
// against an mplayer costs nothing.
//
// Damage halving is (damage + 1) / 2, rounding UP, so a resisted 1 point
// still does 1.
//
// shieldeff_mon, monkilled and the m_using distinction are recorded; killed
// is real.
export function resist(mtmp, oclass, damage, tell) {
    let alev, dlev;

    /* fake players always pass resistance test against Conflict */
    if (oclass === OCLASSES.RING_CLASS && !damage && !tell
        && note_zap_unported('resist:is_mplayer'))
        return 1;                       /* NO DRAW on this path */

    /* attack level */
    switch (oclass) {
    case OCLASSES.WAND_CLASS:   alev = 12; break;
    case OCLASSES.TOOL_CLASS:   alev = 10; break;   /* instrument */
    case OCLASSES.WEAPON_CLASS: alev = 10; break;   /* artifact */
    case OCLASSES.SCROLL_CLASS: alev = 9;  break;
    case OCLASSES.POTION_CLASS: alev = 6;  break;
    case OCLASSES.RING_CLASS:   alev = 5;  break;
    default:                    alev = game.u.ulevel; break;   /* spell */
    }
    /* defense level */
    dlev = mtmp.m_lev;
    if (dlev > 50)
        dlev = 50;
    else if (dlev < 1)
        dlev = note_zap_unported('resist:is_mplayer2') ? game.u.ulevel : 1;

    const resisted = rn2(100 + alev - dlev) < game.mons[mtmp.mnum].mr;
    if (resisted) {
        if (tell)
            shieldeff_mon(mtmp);
        damage = ((damage + 1) / 2) | 0;
    }

    if (damage) {
        mtmp.mhp -= damage;
        if (DEADMONSTER(mtmp)) {
            if (game.m_using)
                note_zap_unported('resist:monkilled');
            else
                killed(mtmp);
        }
    }
    return resisted;
}

const note_zap_unported = (w) => {
    (game.unported ||= new Set()).add('zap:' + w);
    return false;
};
