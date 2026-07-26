// track.js — the hero's recent footsteps, which trackers follow.
// C ref: src/track.c
//
// m_move() consults this whenever a monster cannot see the hero but can track:
// gettrack() replaces the monster's goal with a square the hero actually walked
// on, instead of the monster's guess at where the hero is. Neither function
// draws, but the goal decides which square m_move() picks, and that changes
// where the monster ends up while it draws exactly the same numbers.

import { game } from './gstate.js';
import { ONAMES } from './objects_data.js';
import { distmin } from './hacklib.js';

// src/track.c:9
const UTSZ = 100;

// src/track.c initrack()
export function initrack() {
    game.utcnt = game.utpnt = 0;
    game.utrack = Array.from({ length: UTSZ }, () => ({ x: 0, y: 0 }));
}

// src/track.c settrack() — called once per hero move from moveloop_core.
// A ring of the last UTSZ squares, except that a ring of stealth leaves none.
export function settrack() {
    const uleft = game.u.uleft, uright = game.u.uright;

    if ((uleft && uleft.otyp === ONAMES.RIN_STEALTH)
        || (uright && uright.otyp === ONAMES.RIN_STEALTH))
        return;

    /* C's utrack/utcnt/utpnt are zero-initialised statics; ours have to be
       created, and an undefined utpnt indexes past the ring. */
    if (!game.utrack)
        initrack();
    game.utcnt ??= 0;
    game.utpnt ??= 0;

    if (game.utcnt < UTSZ)
        game.utcnt++;
    if (game.utpnt === UTSZ)
        game.utpnt = 0;
    game.utrack[game.utpnt].x = game.u.ux;
    game.utrack[game.utpnt].y = game.u.uy;
    game.utpnt++;
}

// src/track.c gettrack() — the most recent footstep adjacent to <x,y>, walking
// the ring backwards from the newest entry. Returns null when the hero is
// standing on the square found (ndist == 0), which is why the caller can use
// the result as a goal without ever targeting the hero's own position.
export function gettrack(x, y) {
    let cnt = game.utcnt ?? 0;
    let idx = game.utpnt ?? 0;
    const utrack = game.utrack;

    if (!utrack)
        return null;

    while (cnt-- > 0) {
        if (idx === 0)
            idx = UTSZ - 1;
        else
            idx--;
        const tc = utrack[idx];
        const ndist = distmin(x, y, tc.x, tc.y);

        if (ndist <= 1)
            return ndist ? tc : null;
    }
    return null;
}

// src/track.c:63 hastrack() — has the hero been on this square recently?
//
// mfndpos() uses it with fixed_tele_trap(): a teleport trap whose destination
// is set and which the hero has walked over is treated as a route the monster
// may follow rather than a hazard to avoid.
export function hastrack(x, y) {
    for (let i = 0; i < (game.utcnt || 0); i++)
        if (game.utrack[i].x === x && game.utrack[i].y === y)
            return true;
    return false;
}
