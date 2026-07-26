// mhitm.js — one monster attacking another.
// C ref: src/mhitm.c
//
// This is the monster-vs-monster twin of js/uhitm.js. A pet attacking a newt
// runs through here, which is why it matters well before the hero fights
// anything unusual: dog_move()'s attack branch and pet_ranged_attk() both end
// in mattackm(), and until that lands a pet that decides to attack does
// nothing instead.
//
// Ported so far: the three leaves below. mattackm() itself, hitmm(), mdamagem()
// and passivemm() are NOT here yet -- see docs/plan/STATUS.md for the sizing.

import { game } from './gstate.js';
import { Deaf } from './youprop.js';
import { You_hear } from './pline.js';
import { M_AP_TYPE } from './const.js';
import { ATTKS } from './monst_data.js';
import { seemimic } from './mon.js';
import { newsym, canspotmon, pline } from './display.js';
import { mdistu } from './monmove.js';
import { Monnam, mon_nam_too } from './do_name.js';
import { could_seduce } from './mhitu.js';

// src/mhitm.c:27 noises() — the message when a fight happens out of sight.
//
// The rate limit is the interesting part and it is stateful in a way that is
// easy to drop: a noise is reported only when the far/near classification
// CHANGES, or when more than 10 moves have passed since the last one. So a
// long brawl in the next room produces one message, not one per blow.
//
// gf.far_noise and gn.noisetime are C globals; they live on `game` here.
export async function noises(magr, mattk) {
    const farq = (mdistu(magr) > 15);

    if (!Deaf() && (farq !== game.far_noise || game.moves - (game.noisetime | 0) > 10)) {
        game.far_noise = farq;
        game.noisetime = game.moves;
        await You_hear(
            ((mattk.aatyp === ATTKS.AT_EXPL) ? 'an explosion' : 'some noises')
            + (farq ? ' in the distance' : '') + '.');
    }
}

// src/mhitm.c:40 pre_mm_attack() — bring both parties out of hiding.
//
// C's comment is worth keeping: this happens even when the hero cannot see it,
// "because the formerly concealed monster is now in action". A mimic that
// attacks stops being a mimic whether or not anyone is watching.
//
// Note `showit` is only ever set when gv.vis is already true, so the newsym()
// calls it guards are for the case where the hero CAN see the square but the
// creature was concealed a moment ago.
export function pre_mm_attack(magr, mdef) {
    let showit = false;

    /* unhiding or unmimicking happens even if hero can't see it
       because the formerly concealed monster is now in action */
    if (M_AP_TYPE(mdef)) {
        seemimic(mdef);
        showit ||= game.vis;
    } else if (mdef.mundetected) {
        mdef.mundetected = 0;
        showit ||= game.vis;
    }
    if (M_AP_TYPE(magr)) {
        seemimic(magr);
        showit ||= game.vis;
    } else if (magr.mundetected) {
        magr.mundetected = 0;
        showit ||= game.vis;
    }

    if (game.vis) {
        if (!canspotmon(magr))
            map_invisible(magr.mx, magr.my);
        else if (showit)
            newsym(magr.mx, magr.my);
        if (!canspotmon(mdef))
            map_invisible(mdef.mx, mdef.my);
        else if (showit)
            newsym(mdef.mx, mdef.my);
    }
}

// src/display.c:378 map_invisible() — remember an unseen monster as 'I'.
//
// Needs the glyph layer (GLYPH_INVISIBLE and show_glyph), which is not ported,
// so it is recorded rather than guessed. Painting the wrong thing here would
// put an 'I' on the map that C does not put there, or miss one it does.
function map_invisible(x, y) {
    (game.unported ||= new Set()).add('display:map_invisible');
}

// src/mhitm.c:76 missmm() — feedback for a monster-vs-monster attack that misses.
//
// The seduction arm is not a flavour detail: could_seduce() decides between
// "misses" and "pretends to be friendly to", and a mcan'd (cancelled) monster
// always misses regardless.
export async function missmm(magr, mdef, mattk) {
    pre_mm_attack(magr, mdef);

    if (game.vis) {
        await pline(`${Monnam(magr)} ${
            (magr.mcan || !could_seduce(magr, mdef, mattk))
                ? 'misses' : 'pretends to be friendly to'
        } ${mon_nam_too(mdef, magr)}.`);
    } else {
        await noises(magr, mattk);
    }
}
