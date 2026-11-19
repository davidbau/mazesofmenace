// mkmap.js — random map helpers.
// C ref: mkmap.c — litstate_rnd, flood_fill_rm.
//
// Not ported yet: mkmap() itself (the cave-style level generator) and the
// join_map helpers.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { depth } from './dungeon.js';
import {
    COLNO, ROWNO, IS_ROOM, IS_WALL, IS_DOOR, SDOOR, NO_ROOM, SHARED, isok,
} from './const.js';

const HEIGHT = ROWNO - 1;
const WIDTH = COLNO - 2;

// C ref: mkmap.c litstate_rnd()
export function litstate_rnd(litstate) {
    if (litstate < 0)
        return (rnd(1 + Math.abs(depth(game.u.uz))) < 11 && rn2(77)) ? true : false;
    return !!litstate;
}

// C ref: mkmap.c flood_fill_rm()
/*
 * use a flooding algorithm to find all locations that should
 * have the same rm number as the current location.
 * if anyroom is TRUE, use IS_ROOM to check room membership instead of
 * exactly matching levl[sx][sy].typ and walls are included as well.
 */
export function flood_fill_rm(sx, sy, rmno, lit, anyroom) {
    const levl = (x, y) => game.level.at(x, y);
    let i, nx;
    const fg_typ = levl(sx, sy).typ;

    /* back up to find leftmost uninitialized location */
    while (sx > 0 && (anyroom ? IS_ROOM(levl(sx, sy).typ)
                              : levl(sx, sy).typ === fg_typ)
           && levl(sx, sy).roomno !== rmno)
        sx--;
    sx++; /* compensate for extra decrement */

    /* assume sx,sy is valid */
    if (sx < game.min_rx)
        game.min_rx = sx;
    if (sy < game.min_ry)
        game.min_ry = sy;

    for (i = sx; i <= WIDTH && levl(i, sy).typ === fg_typ; i++) {
        levl(i, sy).roomno = rmno;
        levl(i, sy).lit = lit;
        if (anyroom) {
            /* add walls to room as well */
            for (let ii = (i === sx ? i - 1 : i); ii <= i + 1; ii++)
                for (let jj = sy - 1; jj <= sy + 1; jj++)
                    if (isok(ii, jj) && (IS_WALL(levl(ii, jj).typ)
                                         || IS_DOOR(levl(ii, jj).typ)
                                         || levl(ii, jj).typ === SDOOR)) {
                        levl(ii, jj).edge = true;
                        if (lit)
                            levl(ii, jj).lit = lit;

                        if (levl(ii, jj).roomno === NO_ROOM)
                            levl(ii, jj).roomno = rmno;
                        else if (levl(ii, jj).roomno !== rmno)
                            levl(ii, jj).roomno = SHARED;
                    }
        }
        game.n_loc_filled = (game.n_loc_filled || 0) + 1;
    }
    nx = i;

    if (isok(sx, sy - 1)) {
        for (i = sx; i < nx; i++)
            if (levl(i, sy - 1).typ === fg_typ) {
                if (levl(i, sy - 1).roomno !== rmno)
                    flood_fill_rm(i, sy - 1, rmno, lit, anyroom);
            } else {
                if ((i > sx || isok(i - 1, sy - 1))
                    && levl(i - 1, sy - 1).typ === fg_typ) {
                    if (levl(i - 1, sy - 1).roomno !== rmno)
                        flood_fill_rm(i - 1, sy - 1, rmno, lit, anyroom);
                }
                if ((i < nx - 1 || isok(i + 1, sy - 1))
                    && levl(i + 1, sy - 1).typ === fg_typ) {
                    if (levl(i + 1, sy - 1).roomno !== rmno)
                        flood_fill_rm(i + 1, sy - 1, rmno, lit, anyroom);
                }
            }
    }
    if (isok(sx, sy + 1)) {
        for (i = sx; i < nx; i++)
            if (levl(i, sy + 1).typ === fg_typ) {
                if (levl(i, sy + 1).roomno !== rmno)
                    flood_fill_rm(i, sy + 1, rmno, lit, anyroom);
            } else {
                if ((i > sx || isok(i - 1, sy + 1))
                    && levl(i - 1, sy + 1).typ === fg_typ) {
                    if (levl(i - 1, sy + 1).roomno !== rmno)
                        flood_fill_rm(i - 1, sy + 1, rmno, lit, anyroom);
                }
                if ((i < nx - 1 || isok(i + 1, sy + 1))
                    && levl(i + 1, sy + 1).typ === fg_typ) {
                    if (levl(i + 1, sy + 1).roomno !== rmno)
                        flood_fill_rm(i + 1, sy + 1, rmno, lit, anyroom);
                }
            }
    }

    if (nx > game.max_rx)
        game.max_rx = nx - 1; /* nx is just past valid region */
    if (sy > game.max_ry)
        game.max_ry = sy;
}

export { HEIGHT, WIDTH };
