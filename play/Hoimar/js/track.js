// track.js - Hero track ring for monster pathing.
// C ref: track.c settrack(), gettrack(), initrack().

import { game } from './gstate.js';
import { W_RING } from './const.js';

const UTSZ = 100;
const RIN_STEALTH = 181;

export function initrack() {
    game._utrack = [];
}

function wearing_stealth_ring() {
    return (game.inventory || []).some((obj) => obj?.otyp === RIN_STEALTH
        && (obj.wornSide || ((obj.owornmask || 0) & W_RING)));
}

export function settrack() {
    if (!game.u || wearing_stealth_ring()) return;
    if (!Array.isArray(game._utrack)) game._utrack = [];
    game._utrack.push({ x: game.u.ux, y: game.u.uy });
    if (game._utrack.length > UTSZ) game._utrack.splice(0, game._utrack.length - UTSZ);
}

function distmin(x0, y0, x1, y1) {
    return Math.max(Math.abs(x0 - x1), Math.abs(y0 - y1));
}

export function gettrack(x, y) {
    const tracks = game._utrack || [];
    for (let i = tracks.length - 1; i >= 0; i--) {
        const tc = tracks[i];
        const ndist = distmin(x, y, tc.x, tc.y);
        if (ndist <= 1) return ndist ? tc : null;
    }
    return null;
}
