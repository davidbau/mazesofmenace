// track.js — Hero movement trail (see_monsters / scent heuristics).
// C ref: track.c initrack(), settrack(), gettrack(), hastrack(), UTSZ.

import { game } from './gstate.js';
import { distmin } from './hacklib.js';

export const UTSZ = 100;

/** C: initrack() — clear ring buffer of recent hero coordinates. */
export function initrack() {
    game._track = {
        utcnt: 0,
        utpnt: 0,
        buf: Array.from({ length: UTSZ }, () => ({ x: 0, y: 0 })),
    };
}

/**
 * C: settrack() — record current hero position in the ring.
 * Skips when RIN_STEALTH is worn on either hand (uleft / uright).
 */
export function settrack() {
    const tr = game._track;
    const u = game.u;
    if (!tr || u?.ux === undefined || u?.uy === undefined) return;

    /* C: return early if RIN_STEALTH on uleft or uright — wire when hands are ported */

    let { utcnt, utpnt, buf } = tr;
    if (utcnt < UTSZ) utcnt++;
    if (utpnt === UTSZ) utpnt = 0;
    buf[utpnt].x = u.ux;
    buf[utpnt].y = u.uy;
    utpnt++;
    tr.utcnt = utcnt;
    tr.utpnt = utpnt;
}

/**
 * C: gettrack(x, y) — nearest trail cell Chebyshev-adjacent to (x,y);
 * returns null if hero stood on (x,y) (ndist 0) or no match.
 */
export function gettrack(x, y) {
    const tr = game._track;
    if (!tr) return null;

    let cnt = tr.utcnt;
    let tc = tr.utpnt;
    const { buf } = tr;

    while (cnt--) {
        if (tc === 0) tc = UTSZ - 1;
        else tc--;

        const cell = buf[tc];
        const ndist = distmin(x, y, cell.x, cell.y);
        if (ndist <= 1) return ndist ? { x: cell.x, y: cell.y } : null;
    }
    return null;
}

/** C: hastrack(x, y) — linear scan utrack[0..utcnt), matching upstream. */
export function hastrack(x, y) {
    const tr = game._track;
    if (!tr) return false;
    const { utcnt, buf } = tr;
    for (let i = 0; i < utcnt; i++) {
        if (buf[i].x === x && buf[i].y === y) return true;
    }
    return false;
}
