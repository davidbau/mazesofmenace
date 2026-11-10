/* NetHack 5.0	track.c	$NHDT-Date: 1596498219 2020/08/03 23:43:39 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.12 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Kenneth Lorber, Kensington, Maryland, 2015. */
/* NetHack may be freely redistributed.  See license for details. */
/* track.c - version 1.0.2 */

import { C, T } from './c-runtime.js';

const UTSZ = 100;

/* JavaScript translation of track.c: the original static counters and coord
 * array live in the per-game binding T, with C-addressable backing storage
 * for the unchanged save/restore functions. Pointer walks use coord views'
 * address/index metadata; memset uses the current heap view. The SFCTOOL
 * utility build retains its C source; this module implements the game TU.
 * All six original function boundaries remain unchanged.
 */

export function initrack()
{
    T.utcnt = T.utpnt = 0;
    C.HEAPU8.fill(0, T.utrack.address, T.utrack.address + C.CoordSize * UTSZ);
}

/* add to track */
export function settrack()
{
    if ((C.uleft && C.uleft.otyp == C.RIN_STEALTH)
        || (C.uright && C.uright.otyp == C.RIN_STEALTH))
        return;

    if (T.utcnt < UTSZ)
        T.utcnt++;
    if (T.utpnt == UTSZ)
        T.utpnt = 0;
    T.utrack[T.utpnt].x = C.u.ux;
    T.utrack[T.utpnt].y = C.u.uy;
    T.utpnt++;
}

/* get a track coord on or next to x,y and last tracked by hero,
   returns null if no such track */
export function gettrack(x, y)
{
    let cnt, ndist;
    let tc;
    cnt = T.utcnt;
    for (tc = T.utrack[T.utpnt]; cnt--;) {
        if (tc.address == T.utrack.address)
            tc = T.utrack[UTSZ - 1];
        else
            tc = T.utrack[tc.index - 1];
        ndist = C.distmin(x, y, tc.x, tc.y);

        if (ndist <= 1)
            return (ndist ? tc : 0);
    }
    return 0;
}
/* !SFCTOOL */

/* return TRUE if x,y has hero tracks on it */
export function hastrack(x, y)
{
    let i;

    for (i = 0; i < T.utcnt; i++)
        if (T.utrack[i].x == x && T.utrack[i].y == y)
            return 1;

    return 0;
}

/* save the hero tracking info */
export function save_track(nhfp)
{
    if (C.update_file(nhfp)) {
        let i;

        C.Sfo_int(nhfp, T.utcntAddress, "track-utcnt");
        C.Sfo_int(nhfp, T.utpntAddress, "track-utpnt");
        for (i = 0; i < T.utcnt; i++) {
            C.Sfo_nhcoord(nhfp, T.utrack[i].address, "utrack");
        }
    }
    if (C.release_data(nhfp))
        initrack();
}

/* restore the hero tracking info */
export function rest_track(nhfp)
{
    let i;

    C.Sfi_int(nhfp, T.utcntAddress, "track-utcnt");
    C.Sfi_int(nhfp, T.utpntAddress, "track-utpnt");

    if (T.utcnt > UTSZ || T.utpnt > UTSZ)
        C.trackPanic();
    for (i = 0; i < T.utcnt; i++) {
        C.Sfi_nhcoord(nhfp, T.utrack[i].address, "utrack");
    }
}

/*track.c*/
