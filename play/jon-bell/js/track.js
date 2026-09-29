// @ts-nocheck
// track.js — C ref: nethack-c/src/track.c
// Hero footstep ring buffer used by pet AI (dog_goal FARAWAY block via gettrack).
// Faithful port, bug-for-bug: UTSZ ring buffer, RIN_STEALTH suppression, the
// distmin<=1 / ndist==0 -> NULL semantics of gettrack().
import { game } from './gstate.js';

const UTSZ = 100;
// C objects.h ring ordering: RIN_BASE(173)=RIN_ADORNMENT ... RIN_STEALTH=181.
const RIN_STEALTH = 181;

// C: static int utcnt, utpnt; static coord utrack[UTSZ];
// Held on the game object so save/restore and replay reset are centralized.
function trackState() {
    let t = game._track;
    if (!t) {
        t = game._track = {
            utcnt: 0,
            utpnt: 0,
            utrack: Array.from({ length: UTSZ }, () => ({ x: 0, y: 0 })),
        };
    }
    return t;
}

// C ref: track.c:14 initrack()
export function initrack() {
    const t = trackState();
    t.utcnt = 0;
    t.utpnt = 0;
    for (let i = 0; i < UTSZ; i++) {
        t.utrack[i].x = 0;
        t.utrack[i].y = 0;
    }
}

// C ref: track.c:23 settrack()
export function settrack() {
    const u = game.u;
    if (!u)
        return;
    // C: if ((uleft && uleft->otyp == RIN_STEALTH)
    //     || (uright && uright->otyp == RIN_STEALTH)) return;
    if ((u.uleft && (u.uleft.otyp | 0) === RIN_STEALTH)
        || (u.uright && (u.uright.otyp | 0) === RIN_STEALTH))
        return;

    const t = trackState();
    if (t.utcnt < UTSZ)
        t.utcnt++;
    if (t.utpnt === UTSZ)
        t.utpnt = 0;
    t.utrack[t.utpnt].x = u.ux | 0;
    t.utrack[t.utpnt].y = u.uy | 0;
    t.utpnt++;
}

// distmin — C ref: hack.h distmin(x0,y0,x1,y1) = max(|dx|,|dy|)
function distmin(x0, y0, x1, y1) {
    return Math.max(Math.abs((x0 | 0) - (x1 | 0)), Math.abs((y0 | 0) - (y1 | 0)));
}

// C ref: track.c:41 gettrack(x, y)
// Returns a track coord {x,y} on or next to (x,y) last tracked by the hero,
// or null if no such track.  Walks the ring buffer backwards from utpnt.
// Faithful bug: returns null (not the coord) when the nearest track is the
// query cell itself (ndist==0), and only considers the FIRST track within
// distmin<=1 reached walking backwards.
export function gettrack(x, y) {
    const t = trackState();
    let cnt = t.utcnt;
    // C: for (tc = &utrack[utpnt]; cnt--;) { if (tc==utrack) tc=&utrack[UTSZ-1]; else tc--; ... }
    let idx = t.utpnt; // pointer position (one past the last written)
    while (cnt-- > 0) {
        if (idx === 0)
            idx = UTSZ - 1;
        else
            idx--;
        const tc = t.utrack[idx];
        const ndist = distmin(x, y, tc.x, tc.y);
        if (ndist <= 1)
            return ndist ? { x: tc.x, y: tc.y } : null;
    }
    return null;
}

// C ref: track.c:62 hastrack(x, y)
export function hastrack(x, y) {
    const t = trackState();
    for (let i = 0; i < t.utcnt; i++)
        if (t.utrack[i].x === (x | 0) && t.utrack[i].y === (y | 0))
            return true;
    return false;
}

// update_file(nhfp) / release_data(nhfp) macros (hack.h): nhfp->mode bits.
// Reproduced inline (calls_macro_or_libc), same pattern as js/dungeon.js's
// save_exclusions.
const COUNTING = 0x01;
const WRITING = 0x02;
const FREEING = 0x04;
function update_file(nhfp) {
    return nhfp.mode & (COUNTING | WRITING);
}
function release_data(nhfp) {
    return nhfp.mode & FREEING;
}

// Sfo_int/Sfo_nhcoord (savefile.h) — libc-level save-file field writers; no
// JS save-file byte model exists, so these are faithful no-op stubs
// (calls_macro_or_libc), same pattern as js/dungeon.js's Sfo_int/Sfo_coordxy.
function Sfo_int(nhfp, val, name) { /* no-op stub */ }
function Sfo_nhcoord(nhfp, val, name) { /* no-op stub */ }

// Sfi_int/Sfi_nhcoord (savefile.h) — libc-level save-file field readers; no
// JS save-file byte model exists, so these are faithful no-op stubs
// (calls_macro_or_libc), same pattern as js/dungeon.js's Sfi_int/Sfi_coordxy.
function Sfi_int(nhfp, val, name) { return val; }
function Sfi_nhcoord(nhfp, val, name) { return val; }

function panic(msg) {
    throw new Error(msg);
}

// C ref: track.c:75 save_track(nhfp)
export function save_track(nhfp) {
    const t = trackState();
    if (update_file(nhfp)) {
        Sfo_int(nhfp, t.utcnt, "track-utcnt");
        Sfo_int(nhfp, t.utpnt, "track-utpnt");
        for (let i = 0; i < t.utcnt; i++) {
            Sfo_nhcoord(nhfp, t.utrack[i], "utrack");
        }
    }
    if (release_data(nhfp))
        initrack();
}

// C ref: track.c:92 rest_track(nhfp)
export function rest_track(nhfp) {
    const t = trackState();
    let i;

    t.utcnt = Sfi_int(nhfp, t.utcnt, "track-utcnt");
    t.utpnt = Sfi_int(nhfp, t.utpnt, "track-utpnt");

    if (t.utcnt > UTSZ || t.utpnt > UTSZ)
        panic("rest_track: impossible pt counts");
    for (i = 0; i < t.utcnt; i++) {
        t.utrack[i] = Sfi_nhcoord(nhfp, t.utrack[i], "utrack");
    }
}
