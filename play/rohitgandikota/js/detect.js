// detect.js — searching and detection.
// C ref: src/detect.c

import { game } from './gstate.js';
import { rnl } from './rng.js';
import { isok } from './hacklib.js';
import { newsym } from './display.js';
import { You } from './pline.js';
import { m_at, t_at } from './mon.js';
import { Is_rogue_level, WM_MASK, D_LOCKED, D_CLOSED, ROWNO, COLNO } from './const.js';
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

/* src/vision.c:27 circle_data start offsets — circle_ptr(z) */
const circle_start = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66, 78, 91];
const circle_data_findit = [
    0, 1, 1, 2, 2, 1, 3, 3, 2, 1, 4, 4, 4, 3, 2, 5, 5, 5, 4, 3, 2,
    6, 6, 6, 5, 5, 4, 2, 7, 7, 7, 6, 6, 5, 4, 2, 8, 8, 8, 7, 7, 6, 6, 4, 2,
];

// src/detect.c:1589 cvt_sdoor_to_door()
export function cvt_sdoor_to_door(lev) {
    let newmask = lev.doormask & ~WM_MASK;

    if (Is_rogue_level(game.u.uz)) {
        /* rogue didn't have doors, only doorways */
        newmask = D_NODOOR;
    } else {
        /* newly exposed door is closed */
        if (!(newmask & D_LOCKED))
            newmask |= D_CLOSED;
    }
    lev.typ = DOOR;
    lev.doormask = newmask;
}

// src/detect.c:1639 findone() — reveal what hides on one square.
function findone(zx, zy, found) {
    const lev = game.level.at(zx, zy);
    if (!lev)
        return;
    const ttmp = t_at(zx, zy);
    let mtmp = m_at(zx, zy);
    if (mtmp && mtmp.mhp <= 0)
        mtmp = null;

    if (lev.typ === SDOOR) {
        cvt_sdoor_to_door(lev);         /* sets lev.typ = DOOR */
        lev.seenv = 0xff;               /* foundone: SVALL */
        newsym(zx, zy);
        found.num_sdoors++;
    } else if (lev.typ === SCORR) {
        lev.typ = CORR;
        lev.seenv = 0xff;
        newsym(zx, zy);
        found.num_scorrs++;
    }

    if (ttmp && !ttmp.tseen && ttmp.ttyp !== STATUE_TRAP_T) {
        ttmp.tseen = 1;
        newsym(zx, zy);
        found.num_traps++;
    }
    /* trapped doors and trapped containers add dummy-trap reveals */
    if (lev.typ === DOOR && (lev.doormask & 0x10 /* D_TRAPPED */))
        note_unported_detect('findone:trapped_door');

    if (mtmp && (mtmp.mundetected || M_AP_TYPE_D(mtmp))) {
        if (M_AP_TYPE_D(mtmp)) {
            note_unported_detect('findone:seemimic');
        } else if (mtmp.mundetected) {
            mtmp.mundetected = 0;
            newsym(zx, zy);
        }
        found.num_mons++;
    }
}

const M_AP_TYPE_D = (m) => (m.m_ap_type ?? 0);
const STATUE_TRAP_T = 11;   /* include/trap.h STATUE_TRAP */

// src/detect.c:1792 findit() — the wand of secret door detection sweep.
export async function findit() {
    let num = 0;

    if (game.u.uswallow)
        return 0;

    const found = { num_sdoors: 0, num_scorrs: 0, num_traps: 0,
                    num_mons: 0 };
    /* do_clear_area(u.ux, u.uy, BOLT_LIM=8, findone) — hero-centered
       circle walk (src/vision.c:2107) */
    const range = 8;
    const limits = circle_start[range];
    const uy = game.u.uy, ux = game.u.ux;
    for (let y = Math.max(0, uy - range);
         y <= Math.min(ROWNO - 1, uy + range); y++) {
        const offset = circle_data_findit[limits + Math.abs(y - uy)];
        for (let x = Math.max(1, ux - offset);
             x <= Math.min(COLNO - 1, ux + offset); x++)
            findone(x, y, found);
    }

    const k = (found.num_sdoors ? 1 : 0) + (found.num_scorrs ? 1 : 0)
            + (found.num_traps ? 1 : 0) + (found.num_mons ? 1 : 0);
    let buf = '';
    if (found.num_sdoors) {
        buf += (found.num_sdoors > 1) ? `${found.num_sdoors} secret doors`
                                      : 'a secret door';
        num += found.num_sdoors;
    }
    if (found.num_scorrs) {
        if (buf) buf += (k === 2) ? ' and ' : ', ';
        buf += (found.num_scorrs > 1) ? `${found.num_scorrs} secret corridors`
                                      : 'a secret corridor';
        num += found.num_scorrs;
    }
    if (found.num_traps) {
        if (buf) buf += (k === 3 && !found.num_mons) ? ', and '
                        : (k === 2) ? ' and ' : ', ';
        buf += (found.num_traps > 1) ? `${found.num_traps} traps` : 'a trap';
        num += found.num_traps;
    }
    if (found.num_mons) {
        if (buf) buf += (k > 2) ? ', and ' : ' and ';
        buf += (found.num_mons > 1) ? `${found.num_mons} hidden monsters`
                                    : 'a hidden monster';
        num += found.num_mons;
    }
    if (buf)
        await You(`reveal ${buf}!`);
    if (!num)
        await You("don't find anything.");
    return num;
}

function note_unported_detect(what) {
    (game.unported ||= new Set()).add('detect:' + what);
}
