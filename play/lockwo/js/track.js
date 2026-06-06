// track.js — hero footprint tracking ring buffer.
// C ref: src/track.c — utrack[UTSZ], settrack(), gettrack(), hastrack().
// Used by dogmove.c dog_goal(): when a pet is out of the master's sight it
// follows the hero's recorded footprints (gettrack) instead of the hero's
// actual position, which changes the pet's goal and hence its mfndpos/rn2
// candidate selection.

import { game } from './gstate.js';

const UTSZ = 100;

// State lives on `game` so it resets per segment (game object is recreated).
function trk() {
    if (!game._utrack) {
        game._utrack = new Array(UTSZ);
        for (let i = 0; i < UTSZ; i++) game._utrack[i] = { x: 0, y: 0 };
        game._utcnt = 0;
        game._utpnt = 0;
    }
    return game._utrack;
}

// C ref: track.c initrack() — clear the ring buffer.
export function initrack() {
    game._utrack = new Array(UTSZ);
    for (let i = 0; i < UTSZ; i++) game._utrack[i] = { x: 0, y: 0 };
    game._utcnt = 0;
    game._utpnt = 0;
}

// C ref: track.c settrack() — append the hero's current position to the ring
// buffer.  A stealthy hero (ring of stealth) leaves no track; the starter
// roles never wear one, but the guard is preserved for faithfulness.
export function settrack() {
    const u = game.u;
    // uleft/uright ring-of-stealth: not modelled for the starter pack.
    const tk = trk();
    if (game._utcnt < UTSZ) game._utcnt++;
    if (game._utpnt === UTSZ) game._utpnt = 0;
    tk[game._utpnt].x = u.ux;
    tk[game._utpnt].y = u.uy;
    game._utpnt++;
}

function distmin(x0, y0, x1, y1) {
    return Math.max(Math.abs(x0 - x1), Math.abs(y0 - y1));
}

// C ref: track.c gettrack(x,y) — return the most recent track coord that is on
// or adjacent (distmin <= 1) to (x,y).  Returns null when (x,y) is itself the
// freshest track (ndist==0 returns 0 in C) or no nearby track exists.  Walks
// the ring backwards from the most recent entry.
export function gettrack(x, y) {
    const tk = trk();
    let cnt = game._utcnt;
    let idx = game._utpnt; // points one past the most recent
    while (cnt-- > 0) {
        if (idx === 0) idx = UTSZ - 1;
        else idx--;
        const tc = tk[idx];
        const ndist = distmin(x, y, tc.x, tc.y);
        if (ndist <= 1)
            return ndist ? { x: tc.x, y: tc.y } : null;
    }
    return null;
}

// C ref: track.c hastrack(x,y) — does (x,y) have hero tracks on it?
export function hastrack(x, y) {
    const tk = trk();
    for (let i = 0; i < game._utcnt; i++)
        if (tk[i].x === x && tk[i].y === y) return true;
    return false;
}
