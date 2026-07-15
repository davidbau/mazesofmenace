// track.js — Hero footstep track ring buffer.
// C ref: track.c — initrack, settrack, gettrack, hastrack,
// save_track, rest_track.
//
// Branch envelope: UTSZ ring, stealth-ring skip, gettrack ndist<=1
// (on-cell → null, adjacent → coord). In-memory save_track/rest_track
// for goto_level stash (D-0367). Named omissions: SFCTOOL-only paths.

import { game } from './gstate.js';
import { objectNames } from './objects.js';
import { distmin } from './mon.js';

const UTSZ = 100;
const RIN_STEALTH = objectNames.indexOf('RIN_STEALTH');

let utcnt = 0;
let utpnt = 0;
const utrack = Array.from({ length: UTSZ }, () => ({ x: 0, y: 0 }));

/** C ref: track.c initrack() */
export function initrack() {
    utcnt = 0;
    utpnt = 0;
    for (let i = 0; i < UTSZ; i++) {
        utrack[i].x = 0;
        utrack[i].y = 0;
    }
}

/**
 * C ref: track.c save_track — snapshot ring for level stash, then clear.
 * In-memory stand-in for Sfo_*; release_data arm always initrack().
 * C writes utcnt/utpnt and utrack[0..utcnt).
 */
export function save_track() {
    const n = Math.min(UTSZ, utcnt | 0);
    const snap = {
        utcnt: n,
        utpnt: utpnt | 0,
        utrack: [],
    };
    for (let i = 0; i < n; i++) {
        snap.utrack.push({ x: utrack[i].x | 0, y: utrack[i].y | 0 });
    }
    initrack();
    return snap;
}

/**
 * C ref: track.c rest_track — restore ring from level stash.
 */
export function rest_track(snap) {
    initrack();
    if (!snap) return;
    utcnt = Math.min(UTSZ, snap.utcnt | 0);
    utpnt = snap.utpnt | 0;
    if (utcnt > UTSZ || utpnt > UTSZ) {
        initrack();
        return;
    }
    for (let i = 0; i < utcnt; i++) {
        const c = snap.utrack?.[i];
        utrack[i].x = c ? (c.x | 0) : 0;
        utrack[i].y = c ? (c.y | 0) : 0;
    }
}

/** C ref: track.c settrack() — call once per new turn after u_calc_moveamt */
export function settrack() {
    const u = game.u || {};
    if ((u.uleft && u.uleft.otyp === RIN_STEALTH)
        || (u.uright && u.uright.otyp === RIN_STEALTH)) {
        return;
    }
    if (utcnt < UTSZ) utcnt++;
    if (utpnt === UTSZ) utpnt = 0;
    utrack[utpnt].x = u.ux;
    utrack[utpnt].y = u.uy;
    utpnt++;
}

/**
 * C ref: track.c gettrack() — newest-first walk of the ring.
 * Returns `{x,y}` for an adjacent track, or null if none / on-cell.
 */
export function gettrack(x, y) {
    let cnt = utcnt;
    let ti = utpnt;
    while (cnt--) {
        if (ti === 0) ti = UTSZ - 1;
        else ti--;
        const tc = utrack[ti];
        const ndist = distmin(x, y, tc.x, tc.y);
        if (ndist <= 1) {
            // C: return (ndist ? tc : 0) — on pet cell → null
            return ndist ? { x: tc.x, y: tc.y } : null;
        }
    }
    return null;
}

/** C ref: track.c hastrack() */
export function hastrack(x, y) {
    for (let i = 0; i < utcnt; i++) {
        if (utrack[i].x === x && utrack[i].y === y) return true;
    }
    return false;
}
