// track.js — track hero location for following monsters.
// C ref: track.c

import { game } from './gstate.js';
import { distmin } from './hacklib.js';
import { RIN_STEALTH } from './objects.js';

const UTSZ = 100;

function trk() {
    if (!game._track)
        game._track = { utcnt: 0, utpnt: 0,
                        utrack: Array.from({ length: UTSZ }, () => ({ x: 0, y: 0 })) };
    return game._track;
}

// C ref: track.c initrack()
export function initrack() {
    game._track = null;
    trk();
}

// C ref: track.c settrack()
export function settrack() {
    const u = game.u;
    const t = trk();

    if ((game.uleft && game.uleft.otyp === RIN_STEALTH)
        || (game.uright && game.uright.otyp === RIN_STEALTH))
        return;

    if (t.utcnt < UTSZ)
        t.utcnt++;
    if (t.utpnt === UTSZ)
        t.utpnt = 0;
    t.utrack[t.utpnt].x = u.ux;
    t.utrack[t.utpnt].y = u.uy;
    t.utpnt++;
}

// C ref: track.c gettrack()
// return a pointer to a track coordinate adjacent to (x,y), or null
export function gettrack(x, y) {
    const t = trk();
    let cnt = t.utcnt;
    let tc = t.utpnt; /* index into utrack[] */

    while (cnt--) {
        if (tc === 0)
            tc = UTSZ - 1;
        else
            tc--;
        const ndist = distmin(x, y, t.utrack[tc].x, t.utrack[tc].y);

        if (ndist <= 1)
            return (ndist ? t.utrack[tc] : null);
    }
    return null;
}

// C ref: track.c hastrack()
export function hastrack(x, y) {
    const t = trk();
    for (let i = 0; i < t.utcnt; i++)
        if (t.utrack[i].x === x && t.utrack[i].y === y)
            return true;
    return false;
}
