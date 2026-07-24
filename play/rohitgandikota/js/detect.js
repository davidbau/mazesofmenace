// detect.js — searching and detection.
// C ref: src/detect.c

import { game } from './gstate.js';
import { rnl } from './rng.js';
import { isok } from './hacklib.js';
import { newsym } from './display.js';
import { SDOOR, SCORR, DOOR, CORR, D_NODOOR } from './const.js';

// src/detect.c:1893 dosearch0() — intrinsic autosearch vs explicit searching.
//
// Returns non-zero when the search consumed a turn, which is what makes
// dosearch() return ECMD_TIME and the move loop advance svm.moves.
//
// The only randomness is rnl(7 - fund) per adjacent secret door or corridor,
// so a search with nothing hidden nearby draws nothing at all — which is what
// the recordings show for seed8000's two 's' keys.
export function dosearch0(aflag) {
    const u = game.u;
    let x, y;

    if (u.uswallow) {
        /* Norep("What are you looking for?  The exit?") — no draw */
        return 1;
    }

    /* fund: artifact search bonus plus lenses. Neither is reachable until
       artifacts and eyewear are ported, so it is 0 here; the expression is
       kept in the C's shape so the bonus slots in where C puts it. */
    let fund = 0;
    if (fund > 5)
        fund = 5;

    for (x = u.ux - 1; x < u.ux + 2; x++)
        for (y = u.uy - 1; y < u.uy + 2; y++) {
            if (!isok(x, y))
                continue;
            if (x === u.ux && y === u.uy)
                continue;

            const loc = game.level?.at(x, y);
            if (!loc) continue;

            if (loc.typ === SDOOR) {
                if (rnl(7 - fund))
                    continue;
                /* cvt_sdoor_to_door(): .typ = DOOR */
                loc.typ = DOOR;
                loc.doormask = D_NODOOR;
                newsym(x, y);
            } else if (loc.typ === SCORR) {
                if (rnl(7 - fund))
                    continue;
                loc.typ = CORR;
                newsym(x, y);
            }
            /* The monster-finding and trap-finding branches of the C live
               here. They are not ported yet because monsters and traps are
               not; when they land, they go in this else-branch. */
        }
    return 1;
}

// src/detect.c dosearch()
export function dosearch() {
    return dosearch0(0);
}
