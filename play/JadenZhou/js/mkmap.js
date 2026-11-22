// mkmap.js — the cave-style ("mines") level generator.
// C ref: mkmap.c — init_map, init_fill, get_map, pass_one, pass_two,
// pass_three, flood_fill_rm, join_map_cleanup, join_map, finish_map,
// litstate_rnd, mkmap.
//
// Not ported: remove_rooms()/remove_room() (no caller in the C source).

import { game } from './gstate.js';
import { rn2, rnd, rn1 } from './rng.js';
import { depth } from './dungeon.js';
import {
    COLNO, ROWNO, IS_ROOM, IS_WALL, IS_DOOR, SDOOR, NO_ROOM, SHARED, isok,
    IS_OBSTRUCTED, TREE, LAVAPOOL, ICE, ICED_POOL, ICED_MOAT, OROOM,
    ROOMOFFSET, MAXNROFROOMS,
} from './const.js';
import { add_room, somexy, dig_corridor } from './mklev.js';
import { wallify_map } from './sp_lev.js';

function impossible(msg) { console.error(`impossible: ${msg}`); }

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

// C ref: mkmap.c init_map()
function init_map(bg_typ) {
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const lev = game.level.at(x, y);
            lev.roomno = NO_ROOM;
            lev.typ = bg_typ;
            lev.lit = false;
        }
}

// C ref: mkmap.c init_fill()
function init_fill(bg_typ, fg_typ) {
    let x, y;
    const limit = Math.trunc((WIDTH * HEIGHT * 2) / 5);
    let count = 0;

    while (count < limit) {
        x = rn1(WIDTH - 1, 2);
        y = rnd(HEIGHT - 1);
        if (game.level.at(x, y).typ === bg_typ) {
            game.level.at(x, y).typ = fg_typ;
            count++;
        }
    }
}

// C ref: mkmap.c get_map()
function get_map(col, row, bg_typ) {
    if (col <= 0 || row < 0 || col > WIDTH || row >= HEIGHT)
        return bg_typ;
    return game.level.at(col, row).typ;
}

// C ref: mkmap.c dirs[]
const dirs = [
    -1, -1 /**/, -1,  0 /**/, -1, 1 /**/, 0, -1 /**/,
     0,  1 /**/,  1, -1 /**/,  1, 0 /**/, 1,  1,
];

// C ref: mkmap.c pass_one()
function pass_one(bg_typ, fg_typ) {
    let count, dr;

    for (let x = 2; x <= WIDTH; x++)
        for (let y = 1; y < HEIGHT; y++) {
            for (count = 0, dr = 0; dr < 8; dr++)
                if (get_map(x + dirs[dr * 2], y + dirs[(dr * 2) + 1], bg_typ)
                    === fg_typ)
                    count++;

            switch (count) {
            case 0: /* death */
            case 1:
            case 2:
                game.level.at(x, y).typ = bg_typ;
                break;
            case 5:
            case 6:
            case 7:
            case 8:
                game.level.at(x, y).typ = fg_typ;
                break;
            default:
                break;
            }
        }
}

// C ref: mkmap.c new_loc() -- gn.new_locations[(j) * (WIDTH + 1) + (i)]
function new_loc_idx(i, j) { return (j * (WIDTH + 1)) + i; }

// C ref: mkmap.c pass_two()
function pass_two(bg_typ, fg_typ) {
    const new_locations = game.new_locations;
    let count, dr;

    for (let x = 2; x <= WIDTH; x++)
        for (let y = 1; y < HEIGHT; y++) {
            for (count = 0, dr = 0; dr < 8; dr++)
                if (get_map(x + dirs[dr * 2], y + dirs[(dr * 2) + 1], bg_typ)
                    === fg_typ)
                    count++;
            if (count === 5)
                new_locations[new_loc_idx(x, y)] = bg_typ;
            else
                new_locations[new_loc_idx(x, y)] = get_map(x, y, bg_typ);
        }

    for (let x = 2; x <= WIDTH; x++)
        for (let y = 1; y < HEIGHT; y++)
            game.level.at(x, y).typ = new_locations[new_loc_idx(x, y)];
}

// C ref: mkmap.c pass_three()
function pass_three(bg_typ, fg_typ) {
    const new_locations = game.new_locations;
    let count, dr;

    for (let x = 2; x <= WIDTH; x++)
        for (let y = 1; y < HEIGHT; y++) {
            for (count = 0, dr = 0; dr < 8; dr++)
                if (get_map(x + dirs[dr * 2], y + dirs[(dr * 2) + 1], bg_typ)
                    === fg_typ)
                    count++;
            if (count < 3)
                new_locations[new_loc_idx(x, y)] = bg_typ;
            else
                new_locations[new_loc_idx(x, y)] = get_map(x, y, bg_typ);
        }

    for (let x = 2; x <= WIDTH; x++)
        for (let y = 1; y < HEIGHT; y++)
            game.level.at(x, y).typ = new_locations[new_loc_idx(x, y)];
}

// C ref: mkmap.c join_map_cleanup()
/* join_map uses temporary rooms; clean up after it */
function join_map_cleanup() {
    const lvl = game.level;

    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++)
            lvl.at(x, y).roomno = NO_ROOM;
    lvl.nroom = lvl.nsubroom = 0;
    /* svr.rooms[svn.nroom].hx = gs.subrooms[gn.nsubroom].hx = -1; the
       temporary room entries are dropped along with it */
    lvl.rooms.length = 0;
    lvl.rooms[lvl.nroom] = { hx: -1 };
    lvl.subrooms.length = 0;
    lvl.subrooms[lvl.nsubroom] = { hx: -1 };
}

// C ref: mkmap.c join_map()
function join_map(bg_typ, fg_typ) {
    const g = game;
    const lvl = g.level;
    let croom, croom2;
    let sx, sy;
    const sm = { x: 0, y: 0 }, em = { x: 0, y: 0 };

    /* first, use flood filling to find all of the regions that need joining
     */
    joinm:
    for (let x = 2; x <= WIDTH; x++)
        for (let y = 1; y < HEIGHT; y++) {
            if (lvl.at(x, y).typ === fg_typ && lvl.at(x, y).roomno === NO_ROOM) {
                g.min_rx = g.max_rx = x;
                g.min_ry = g.max_ry = y;
                g.n_loc_filled = 0;
                flood_fill_rm(x, y, lvl.nroom + ROOMOFFSET, false, false);
                if (g.n_loc_filled > 3) {
                    add_room(g.min_rx, g.min_ry, g.max_rx, g.max_ry,
                             false, OROOM, true);
                    lvl.rooms[lvl.nroom - 1].irregular = true;
                    if (lvl.nroom >= (MAXNROFROOMS * 2))
                        break joinm;
                } else {
                    /*
                     * it's a tiny hole; erase it from the map to avoid
                     * having the player end up here with no way out.
                     */
                    for (sx = g.min_rx; sx <= g.max_rx; sx++)
                        for (sy = g.min_ry; sy <= g.max_ry; sy++)
                            if (lvl.at(sx, sy).roomno
                                === lvl.nroom + ROOMOFFSET) {
                                lvl.at(sx, sy).typ = bg_typ;
                                lvl.at(sx, sy).roomno = NO_ROOM;
                            }
                }
            }
        }

    /* joinm: */
    /*
     * Ok, now we can actually join the regions with fg_typ's.
     * The rooms are already sorted due to the previous loop,
     * so don't call sort_rooms(), which can screw up the roomno's
     * validity in the levl structure.
     */
    let ci = 0, ci2 = 1;
    while (ci2 < lvl.nroom) {
        croom = lvl.rooms[ci];
        croom2 = lvl.rooms[ci2];
        /* pick random starting and end locations for "corridor" */
        if (!somexy(croom, sm) || !somexy(croom2, em)) {
            /* ack! -- the level is going to be busted */
            /* arbitrarily pick centers of both rooms and hope for the best */
            impossible("No start/end room loc in join_map.");
            sm.x = croom.lx + Math.trunc((croom.hx - croom.lx) / 2);
            sm.y = croom.ly + Math.trunc((croom.hy - croom.ly) / 2);
            em.x = croom2.lx + Math.trunc((croom2.hx - croom2.lx) / 2);
            em.y = croom2.ly + Math.trunc((croom2.hy - croom2.ly) / 2);
        }

        dig_corridor(sm, em, null, false, fg_typ, bg_typ);

        /* choose next region to join */
        /* only increment croom if croom and croom2 are non-overlapping */
        if (croom2.lx > croom.hx
            || ((croom2.ly > croom.hy || croom2.hy < croom.ly)
                && rn2(3))) {
            ci = ci2;
        }
        ci2++; /* always increment the next room */
    }
    join_map_cleanup();
}

// C ref: mkmap.c finish_map()
function finish_map(fg_typ, bg_typ, lit, walled, icedpools) {
    const lvl = game.level;

    if (walled)
        wallify_map(1, 0, COLNO - 1, ROWNO - 1);

    if (lit) {
        for (let x = 1; x < COLNO; x++)
            for (let y = 0; y < ROWNO; y++)
                if ((!IS_OBSTRUCTED(fg_typ) && lvl.at(x, y).typ === fg_typ)
                    || (!IS_OBSTRUCTED(bg_typ) && lvl.at(x, y).typ === bg_typ)
                    || (bg_typ === TREE && lvl.at(x, y).typ === bg_typ)
                    || (walled && IS_WALL(lvl.at(x, y).typ)))
                    lvl.at(x, y).lit = true;
        for (let x = 0; x < lvl.nroom; x++)
            lvl.rooms[x].rlit = 1;
    }
    /* light lava even if everything's otherwise unlit;
       ice might be frozen pool rather than frozen moat */
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            if (lvl.at(x, y).typ === LAVAPOOL)
                lvl.at(x, y).lit = true;
            else if (lvl.at(x, y).typ === ICE)
                lvl.at(x, y).icedpool = icedpools ? ICED_POOL : ICED_MOAT;
        }
}

// C ref: mkmap.c N_P1_ITER, N_P2_ITER, N_P3_ITER
const N_P1_ITER = 1; /* tune map generation via this value */
const N_P2_ITER = 1; /* tune map generation via this value */
const N_P3_ITER = 2; /* tune map smoothing via this value */

// C ref: mkmap.c mkmap()
export function mkmap(init_lev) {
    const bg_typ = init_lev.bg, fg_typ = init_lev.fg;
    const smooth = init_lev.smoothed, join = init_lev.joined;
    let lit = init_lev.lit;
    const walled = init_lev.walled;

    lit = litstate_rnd(lit);

    game.new_locations = new Array((WIDTH + 1) * HEIGHT).fill(0);

    init_map(bg_typ);
    init_fill(bg_typ, fg_typ);

    for (let i = 0; i < N_P1_ITER; i++)
        pass_one(bg_typ, fg_typ);

    for (let i = 0; i < N_P2_ITER; i++)
        pass_two(bg_typ, fg_typ);

    if (smooth)
        for (let i = 0; i < N_P3_ITER; i++)
            pass_three(bg_typ, fg_typ);

    if (join)
        join_map(bg_typ, fg_typ);

    finish_map(fg_typ, bg_typ, !!lit, !!walled, init_lev.icedpools);
    /* a walled, joined level is cavernous, not mazelike -dlc */
    if (walled && join) {
        game.level.flags.is_maze_lev = false;
        game.level.flags.is_cavernous_lev = true;
    }
    game.new_locations = null; /* free(gn.new_locations) */
}

export { HEIGHT, WIDTH };
