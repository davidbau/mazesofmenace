// mkmap.js — map-level helpers shared by the special-level loader.
// C ref: src/mkmap.c

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { depth } from './dungeon.js';
import { isok } from './hacklib.js';
import { COLNO, ROWNO, NO_ROOM, SHARED, SDOOR,
         IS_WALL, IS_DOOR, IS_ROOM } from './const.js';

// src/mkmap.c:442 litstate_rnd()
//
// Two draws, always, because `rnd(1 + abs(depth))` on any reachable level is
// far below 11 and C's && never short-circuits past the rn2(77).
export function litstate_rnd(litstate) {
    if (litstate < 0)
        return (rnd(1 + Math.abs(depth(game.u.uz))) < 11 && rn2(77)) ? 1 : 0;
    return litstate ? 1 : 0;
}

// src/mkmap.c:153 flood_fill_rm() — claim a connected region of one terrain
// type for room `rmno`, recording its bounding box in gm.min_rx..gm.max_ry.
//
// Draws nothing. It is here because lspo_region()'s irregular branch is what
// turns a stamped themeroom map into a room the rest of mklev can see.
export function flood_fill_rm(sx, sy, rmno, lit, anyroom) {
    const map = game.level;
    const at = (x, y) => map.at(x, y);
    const g = game;
    const fg_typ = at(sx, sy).typ;

    /* back up to find leftmost uninitialized location */
    while (sx > 0 && (anyroom ? IS_ROOM(at(sx, sy).typ)
                              : at(sx, sy).typ === fg_typ)
           && at(sx, sy).roomno !== rmno)
        sx--;
    sx++;   /* compensate for extra decrement */

    if (sx < g.min_rx) g.min_rx = sx;
    if (sy < g.min_ry) g.min_ry = sy;

    let i;
    for (i = sx; i <= COLNO - 1 && at(i, sy) && at(i, sy).typ === fg_typ; i++) {
        at(i, sy).roomno = rmno;
        at(i, sy).lit = !!lit;
        if (anyroom) {
            /* add walls to room as well */
            for (let ii = (i === sx ? i - 1 : i); ii <= i + 1; ii++)
                for (let jj = sy - 1; jj <= sy + 1; jj++) {
                    if (!isok(ii, jj)) continue;
                    const l = at(ii, jj);
                    if (!l) continue;
                    if (IS_WALL(l.typ) || IS_DOOR(l.typ) || l.typ === SDOOR) {
                        l.edge = 1;
                        if (lit) l.lit = true;
                        if ((l.roomno ?? NO_ROOM) === NO_ROOM) l.roomno = rmno;
                        else if (l.roomno !== rmno) l.roomno = SHARED;
                    }
                }
        }
    }
    const nx = i;

    const sweep = (dy) => {
        if (!isok(sx, sy + dy)) return;
        for (let j = sx; j < nx; j++) {
            const straight = at(j, sy + dy);
            if (straight && straight.typ === fg_typ) {
                if (straight.roomno !== rmno)
                    flood_fill_rm(j, sy + dy, rmno, lit, anyroom);
            } else {
                const left = at(j - 1, sy + dy);
                if ((j > sx || isok(j - 1, sy + dy))
                    && left && left.typ === fg_typ && left.roomno !== rmno)
                    flood_fill_rm(j - 1, sy + dy, rmno, lit, anyroom);
                const right = at(j + 1, sy + dy);
                if ((j < nx - 1 || isok(j + 1, sy + dy))
                    && right && right.typ === fg_typ && right.roomno !== rmno)
                    flood_fill_rm(j + 1, sy + dy, rmno, lit, anyroom);
            }
        }
    };
    sweep(-1);
    sweep(1);

    if (nx > g.max_rx) g.max_rx = nx - 1;  /* nx is just past valid region */
    if (sy > g.max_ry) g.max_ry = sy;
}
