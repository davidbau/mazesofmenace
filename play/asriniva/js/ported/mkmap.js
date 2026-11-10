/* NetHack 5.0	mkmap.c	$NHDT-Date: 1717432093 2024/06/03 16:28:13 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.40 $ */
/* Copyright (c) J. C. Collet, M. Stephenson and D. Cohrs, 1992   */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from './c-runtime.js';

/* JavaScript translation of mkmap.c. Fourteen original function boundaries
 * remain. Typed C views preserve stored fields; explicit casts preserve C
 * automatic and parameter widths. The new_loc macro expands to the same
 * row-strided temporary byte array. Addressable coords use stack-local views,
 * and room assignment copies all struct bytes. Pointer walks use roomNext
 * and roomBefore, with equality by address. goto joinm exits a labelled block
 * at the original target. RNG annotations retain Clang's caller locations.
 */
// #include "sp_lev.h"

// #define HEIGHT (ROWNO - 1)
// #define WIDTH (COLNO - 2)

// staticfn void init_map(schar);
// staticfn void init_fill(schar, schar);
// staticfn schar get_map(coordxy, coordxy, schar);
// staticfn void pass_one(schar, schar);
// staticfn void pass_two(schar, schar);
// staticfn void pass_three(schar, schar);
// staticfn void join_map_cleanup(void);
// staticfn void join_map(schar, schar);
// staticfn void finish_map(schar, schar, boolean, boolean, boolean);
// staticfn void remove_room(unsigned);
// void mkmap(lev_init *);

export function init_map(bg_typ)
{
    bg_typ = C.char(bg_typ);

    let x, y;

    for (x = C.coordxy(1); x < C.COLNO; x = C.coordxy(x + 1))
        for (y = C.coordxy(0); y < C.ROWNO; y = C.coordxy(y + 1)) {
            C.levl[x][y].roomno = C.NO_ROOM;
            C.levl[x][y].typ = bg_typ;
            C.levl[x][y].lit = 0;
        }
}

export function init_fill(bg_typ, fg_typ)
{
    bg_typ = C.char(bg_typ);
    fg_typ = C.char(fg_typ);

    const HEIGHT = C.ROWNO - 1;
    const WIDTH = C.COLNO - 2;
    let x, y;
    let limit, count;

    limit = BigInt(Math.trunc((WIDTH * HEIGHT * 2) / 5));
    count = 0n;
    while (count < limit) {
        x = C.coordxy(C.rn1(WIDTH - 1, 2, 45, 'init_fill'));
        y = C.coordxy(C.rnd(HEIGHT - 1, 46, 'init_fill'));
        if (C.levl[x][y].typ == bg_typ) {
            C.levl[x][y].typ = fg_typ;
            count++;
        }
    }
}

export function get_map(col, row, bg_typ)
{
    col = C.coordxy(col);
    row = C.coordxy(row);
    bg_typ = C.char(bg_typ);

    const HEIGHT = C.ROWNO - 1;
    const WIDTH = C.COLNO - 2;
    if (col <= 0 || row < 0 || col > WIDTH || row >= HEIGHT)
        return bg_typ;
    return C.levl[col][row].typ;
}

const dirs = [
    -1, -1 /**/, -1,  0 /**/, -1, 1 /**/, 0, -1 /**/,
     0,  1 /**/,  1, -1 /**/,  1, 0 /**/, 1,  1
];

export function pass_one(bg_typ, fg_typ)
{
    bg_typ = C.char(bg_typ);
    fg_typ = C.char(fg_typ);

    const HEIGHT = C.ROWNO - 1;
    const WIDTH = C.COLNO - 2;
    let x, y;
    let count, dr;

    for (x = C.coordxy(2); x <= WIDTH; x = C.coordxy(x + 1))
        for (y = C.coordxy(1); y < HEIGHT; y = C.coordxy(y + 1)) {
            for (count = 0, dr = 0; dr < 8; dr++)
                if (get_map(x + dirs[dr * 2], y + dirs[(dr * 2) + 1], bg_typ)
                    == fg_typ)
                    count++;

            switch (count) {
            case 0: /* death */
            case 1:
            case 2:
                C.levl[x][y].typ = bg_typ;
                break;
            case 5:
            case 6:
            case 7:
            case 8:
                C.levl[x][y].typ = fg_typ;
                break;
            default:
                break;
            }
        }
}

// #define new_loc(i, j) *(gn.new_locations + ((j) * (WIDTH + 1)) + (i))

export function pass_two(bg_typ, fg_typ)
{
    bg_typ = C.char(bg_typ);
    fg_typ = C.char(fg_typ);

    const HEIGHT = C.ROWNO - 1;
    const WIDTH = C.COLNO - 2;
    let x, y;
    let count, dr;

    for (x = C.coordxy(2); x <= WIDTH; x = C.coordxy(x + 1))
        for (y = C.coordxy(1); y < HEIGHT; y = C.coordxy(y + 1)) {
            for (count = 0, dr = 0; dr < 8; dr++)
                if (get_map(x + dirs[dr * 2], y + dirs[(dr * 2) + 1], bg_typ)
                    == fg_typ)
                    count++;
            if (count == 5)
                C.gn.new_locations[C.newLocIndex(x, y)] = bg_typ;
            else
                C.gn.new_locations[C.newLocIndex(x, y)] = get_map(x, y, bg_typ);
        }

    for (x = C.coordxy(2); x <= WIDTH; x = C.coordxy(x + 1))
        for (y = C.coordxy(1); y < HEIGHT; y = C.coordxy(y + 1))
            C.levl[x][y].typ = C.gn.new_locations[C.newLocIndex(x, y)];
}

export function pass_three(bg_typ, fg_typ)
{
    bg_typ = C.char(bg_typ);
    fg_typ = C.char(fg_typ);

    const HEIGHT = C.ROWNO - 1;
    const WIDTH = C.COLNO - 2;
    let x, y;
    let count, dr;

    for (x = C.coordxy(2); x <= WIDTH; x = C.coordxy(x + 1))
        for (y = C.coordxy(1); y < HEIGHT; y = C.coordxy(y + 1)) {
            for (count = 0, dr = 0; dr < 8; dr++)
                if (get_map(x + dirs[dr * 2], y + dirs[(dr * 2) + 1], bg_typ)
                    == fg_typ)
                    count++;
            if (count < 3)
                C.gn.new_locations[C.newLocIndex(x, y)] = bg_typ;
            else
                C.gn.new_locations[C.newLocIndex(x, y)] = get_map(x, y, bg_typ);
        }

    for (x = C.coordxy(2); x <= WIDTH; x = C.coordxy(x + 1))
        for (y = C.coordxy(1); y < HEIGHT; y = C.coordxy(y + 1))
            C.levl[x][y].typ = C.gn.new_locations[C.newLocIndex(x, y)];
}

/*
 * use a flooding algorithm to find all locations that should
 * have the same rm number as the current location.
 * if anyroom is TRUE, use IS_ROOM to check room membership instead of
 * exactly matching levl[sx][sy].typ and walls are included as well.
 */
export function flood_fill_rm(
    sx,
    sy,
    rmno,
    lit,
    anyroom)
{
    sx = C.coordxy(sx);
    sy = C.coordxy(sy);
    rmno = C.int(rmno);
    lit = C.boolean(lit);
    anyroom = C.boolean(anyroom);

    const WIDTH = C.COLNO - 2;
    let i, nx;
    let fg_typ = C.levl[sx][sy].typ;

    /* back up to find leftmost uninitialized location */
    while (sx > 0 && (anyroom ? C.IS_ROOM(C.levl[sx][sy].typ)
                              : C.levl[sx][sy].typ == fg_typ)
           && C.levl[sx][sy].roomno != rmno)
        sx = C.coordxy(sx - 1);
    sx = C.coordxy(sx + 1); /* compensate for extra decrement */

    /* assume sx,sy is valid */
    if (sx < C.gm.min_rx)
        C.gm.min_rx = sx;
    if (sy < C.gm.min_ry)
        C.gm.min_ry = sy;

    for (i = C.coordxy(sx); i <= WIDTH && C.levl[i][sy].typ == fg_typ; i = C.coordxy(i + 1)) {
        C.levl[i][sy].roomno = rmno;
        C.levl[i][sy].lit = lit;
        if (anyroom) {
            /* add walls to room as well */
            let ii, jj;
            for (ii = C.coordxy((i == sx ? i - 1 : i)); ii <= i + 1; ii = C.coordxy(ii + 1))
                for (jj = C.coordxy(sy - 1); jj <= sy + 1; jj = C.coordxy(jj + 1))
                    if (C.isok(ii, jj) && (C.IS_WALL(C.levl[ii][jj].typ)
                                         || C.IS_DOOR(C.levl[ii][jj].typ)
                                         || C.levl[ii][jj].typ == C.SDOOR)) {
                        C.levl[ii][jj].edge = 1;
                        if (lit)
                            C.levl[ii][jj].lit = lit;

                        if (C.levl[ii][jj].roomno == C.NO_ROOM)
                            C.levl[ii][jj].roomno = rmno;
                        else if (C.levl[ii][jj].roomno != rmno)
                            C.levl[ii][jj].roomno = C.SHARED;
                    }
        }
        C.gn.n_loc_filled++;
    }
    nx = C.coordxy(i);

    if (C.isok(sx, sy - 1)) {
        for (i = C.coordxy(sx); i < nx; i = C.coordxy(i + 1))
            if (C.levl[i][sy - 1].typ == fg_typ) {
                if (C.levl[i][sy - 1].roomno != rmno)
                    flood_fill_rm(i, sy - 1, rmno, lit, anyroom);
            } else {
                if ((i > sx || C.isok(i - 1, sy - 1))
                    && C.levl[i - 1][sy - 1].typ == fg_typ) {
                    if (C.levl[i - 1][sy - 1].roomno != rmno)
                        flood_fill_rm(i - 1, sy - 1, rmno, lit, anyroom);
                }
                if ((i < nx - 1 || C.isok(i + 1, sy - 1))
                    && C.levl[i + 1][sy - 1].typ == fg_typ) {
                    if (C.levl[i + 1][sy - 1].roomno != rmno)
                        flood_fill_rm(i + 1, sy - 1, rmno, lit, anyroom);
                }
            }
    }
    if (C.isok(sx, sy + 1)) {
        for (i = C.coordxy(sx); i < nx; i = C.coordxy(i + 1))
            if (C.levl[i][sy + 1].typ == fg_typ) {
                if (C.levl[i][sy + 1].roomno != rmno)
                    flood_fill_rm(i, sy + 1, rmno, lit, anyroom);
            } else {
                if ((i > sx || C.isok(i - 1, sy + 1))
                    && C.levl[i - 1][sy + 1].typ == fg_typ) {
                    if (C.levl[i - 1][sy + 1].roomno != rmno)
                        flood_fill_rm(i - 1, sy + 1, rmno, lit, anyroom);
                }
                if ((i < nx - 1 || C.isok(i + 1, sy + 1))
                    && C.levl[i + 1][sy + 1].typ == fg_typ) {
                    if (C.levl[i + 1][sy + 1].roomno != rmno)
                        flood_fill_rm(i + 1, sy + 1, rmno, lit, anyroom);
                }
            }
    }

    if (nx > C.gm.max_rx)
        C.gm.max_rx = nx - 1; /* nx is just past valid region */
    if (sy > C.gm.max_ry)
        C.gm.max_ry = sy;
}

/* join_map uses temporary rooms; clean up after it */
export function join_map_cleanup()
{
    let x, y;

    for (x = C.coordxy(1); x < C.COLNO; x = C.coordxy(x + 1))
        for (y = C.coordxy(0); y < C.ROWNO; y = C.coordxy(y + 1))
            C.levl[x][y].roomno = C.NO_ROOM;
    C.svn.nroom = C.gn.nsubroom = 0;
    C.svr.rooms[C.svn.nroom].hx = C.gs.subrooms[C.gn.nsubroom].hx = -1;
}

export function join_map(bg_typ, fg_typ)
{
    bg_typ = C.char(bg_typ);
    fg_typ = C.char(fg_typ);

    const HEIGHT = C.ROWNO - 1;
    const WIDTH = C.COLNO - 2;
    let croom, croom2;

    let x, y, sx, sy;
    let sm = C.coordLocal(), em = C.coordLocal();

    /* first, use flood filling to find all of the regions that need joining
     */
    joinm: {
    for (x = C.coordxy(2); x <= WIDTH; x = C.coordxy(x + 1))
        for (y = C.coordxy(1); y < HEIGHT; y = C.coordxy(y + 1)) {
            if (C.levl[x][y].typ == fg_typ && C.levl[x][y].roomno == C.NO_ROOM) {
                C.gm.min_rx = C.gm.max_rx = x;
                C.gm.min_ry = C.gm.max_ry = y;
                C.gn.n_loc_filled = 0;
                flood_fill_rm(x, y, C.svn.nroom + C.ROOMOFFSET, 0, 0);
                if (C.gn.n_loc_filled > 3) {
                    C.add_room(C.gm.min_rx, C.gm.min_ry, C.gm.max_rx, C.gm.max_ry,
                             0, C.OROOM, 1);
                    C.svr.rooms[C.svn.nroom - 1].irregular = 1;
                    if (C.svn.nroom >= (C.MAXNROFROOMS * 2))
                        break joinm;
                } else {
                    /*
                     * it's a tiny hole; erase it from the map to avoid
                     * having the player end up here with no way out.
                     */
                    for (sx = C.coordxy(C.gm.min_rx); sx <= C.gm.max_rx; sx = C.coordxy(sx + 1))
                        for (sy = C.coordxy(C.gm.min_ry); sy <= C.gm.max_ry; sy = C.coordxy(sy + 1))
                            if (C.levl[sx][sy].roomno
                                == C.svn.nroom + C.ROOMOFFSET) {
                                C.levl[sx][sy].typ = bg_typ;
                                C.levl[sx][sy].roomno = C.NO_ROOM;
                            }
                }
            }
        }

    }
// joinm:
    /*
     * Ok, now we can actually join the regions with fg_typ's.
     * The rooms are already sorted due to the previous loop,
     * so don't call sort_rooms(), which can screw up the roomno's
     * validity in the levl structure.
     */
    for (croom = C.svr.rooms[0], croom2 = C.roomNext(croom);
         C.roomBefore(croom2, C.svr.rooms[C.svn.nroom]); ) {
        /* pick random starting and end locations for "corridor" */
        if (!C.somexy(croom, sm) || !C.somexy(croom2, em)) {
            /* ack! -- the level is going to be busted */
            /* arbitrarily pick centers of both rooms and hope for the best */
            C.impossible("No start/end room loc in join_map.");
            sm.x = croom.lx + Math.trunc((croom.hx - croom.lx) / 2);
            sm.y = croom.ly + Math.trunc((croom.hy - croom.ly) / 2);
            em.x = croom2.lx + Math.trunc((croom2.hx - croom2.lx) / 2);
            em.y = croom2.ly + Math.trunc((croom2.hy - croom2.ly) / 2);
        }

        C.dig_corridor(sm, em, 0, 0, fg_typ, bg_typ);

        /* choose next region to join */
        /* only increment croom if croom and croom2 are non-overlapping */
        if (croom2.lx > croom.hx
            || ((croom2.ly > croom.hy || croom2.hy < croom.ly)
                && C.rn2(3, 322, 'join_map'))) {
            croom = croom2;
        }
        croom2 = C.roomNext(croom2); /* always increment the next room */
    }
    join_map_cleanup();
}

export function finish_map(
    fg_typ,
    bg_typ,
    lit,
    walled,
    icedpools)
{
    fg_typ = C.char(fg_typ);
    bg_typ = C.char(bg_typ);
    lit = C.boolean(lit);
    walled = C.boolean(walled);
    icedpools = C.boolean(icedpools);

    let x, y;

    if (walled)
        C.wallify_map(1, 0, C.COLNO-1, C.ROWNO-1);

    if (lit) {
        for (x = C.coordxy(1); x < C.COLNO; x = C.coordxy(x + 1))
            for (y = C.coordxy(0); y < C.ROWNO; y = C.coordxy(y + 1))
                if ((!C.IS_OBSTRUCTED(fg_typ) && C.levl[x][y].typ == fg_typ)
                    || (!C.IS_OBSTRUCTED(bg_typ) && C.levl[x][y].typ == bg_typ)
                    || (bg_typ == C.TREE && C.levl[x][y].typ == bg_typ)
                    || (walled && C.IS_WALL(C.levl[x][y].typ)))
                    C.levl[x][y].lit = 1;
        for (x = C.coordxy(0); x < C.svn.nroom; x = C.coordxy(x + 1))
            C.svr.rooms[x].rlit = 1;
    }
    /* light lava even if everything's otherwise unlit;
       ice might be frozen pool rather than frozen moat */
    for (x = C.coordxy(1); x < C.COLNO; x = C.coordxy(x + 1))
        for (y = C.coordxy(0); y < C.ROWNO; y = C.coordxy(y + 1)) {
            if (C.levl[x][y].typ == C.LAVAPOOL)
                C.levl[x][y].lit = 1;
            else if (C.levl[x][y].typ == C.ICE)
                C.levl[x][y].icedpool = icedpools ? C.ICED_POOL : C.ICED_MOAT;
        }
}

/*
 * TODO: If we really want to remove rooms after a map is plopped down
 * in a special level, this needs to be rewritten - the maps may have
 * holes in them ("x" mapchar), leaving parts of rooms still on the map.
 *
 * When level processed by join_map is overlaid by a MAP, some rooms may no
 * longer be valid.  All rooms in the region lx <= x < hx, ly <= y < hy are
 * removed.  Rooms partially in the region are truncated.  This function
 * must be called before the REGIONs or ROOMs of the map are processed, or
 * those rooms will be removed as well.  Assumes roomno fields in the
 * region are already cleared, and roomno and irregular fields outside the
 * region are all set.
 */
export function remove_rooms(lx, ly, hx, hy)
{
    lx = C.coordxy(lx);
    ly = C.coordxy(ly);
    hx = C.coordxy(hx);
    hy = C.coordxy(hy);

    let i;
    let croom;

    for (i = C.svn.nroom - 1; i >= 0; --i) {
        croom = C.svr.rooms[i];
        if (croom.hx < lx || croom.lx >= hx || croom.hy < ly
            || croom.ly >= hy)
            continue; /* no overlap */

        if (croom.lx < lx || croom.hx >= hx || croom.ly < ly
            || croom.hy >= hy) { /* partial overlap */
            /* TODO: ensure remaining parts of room are still joined */

            if (!croom.irregular)
                C.impossible("regular room in joined map");
        } else {
            /* total overlap, remove the room */
            remove_room((i >>> 0));
        }
    }
}

/*
 * Remove roomno from the rooms array, decrementing nroom.
 * The last room is swapped with the being-removed room and locations
 * within it have their roomno field updated.  Other rooms are unaffected.
 * Assumes level structure contents corresponding to roomno have already
 * been reset.
 * Currently handles only the removal of rooms that have no subrooms.
 */
export function remove_room(roomno)
{
    roomno >>>= 0;
    let croom = C.svr.rooms[roomno];
    let maxroom = C.svr.rooms[--C.svn.nroom];
    let x, y;
    let oroomno;

    if (croom.address != maxroom.address) {
        /* since the order in the array only matters for making corridors,
         * copy the last room over the one being removed on the assumption
         * that corridors have already been dug. */
        C.copyRoom(croom, maxroom);

        /* since maxroom moved, update affected level roomno values */
        oroomno = (C.svn.nroom + C.ROOMOFFSET) >>> 0;
        roomno = (roomno + C.ROOMOFFSET) >>> 0;
        for (x = C.coordxy(croom.lx); x <= croom.hx; x = C.coordxy(x + 1))
            for (y = C.coordxy(croom.ly); y <= croom.hy; y = C.coordxy(y + 1)) {
                if (C.levl[x][y].roomno == oroomno)
                    C.levl[x][y].roomno = roomno;
            }
    }

    maxroom.hx = -1; /* just like add_room */
}

const N_P1_ITER = 1; /* tune map generation via this value */
const N_P2_ITER = 1; /* tune map generation via this value */
const N_P3_ITER = 2; /* tune map smoothing via this value */

export function litstate_rnd(litstate)
{
    litstate = C.int(litstate);

    if (litstate < 0)
        return (C.rnd(1 + C.abs(C.depth(C.u.uz)), 446, 'litstate_rnd') < 11 && C.rn2(77, 446, 'litstate_rnd')) ? 1 : 0;
    return C.boolean(litstate);
}

export function mkmap(init_lev)
{
    const HEIGHT = C.ROWNO - 1;
    const WIDTH = C.COLNO - 2;
    let bg_typ = init_lev.bg, fg_typ = init_lev.fg;
    let smooth = init_lev.smoothed, join = init_lev.joined;
    let lit = init_lev.lit, walled = init_lev.walled;
    let i;

    lit = C.short(litstate_rnd(lit));

    C.gn.new_locations = C.alloc((WIDTH + 1) * HEIGHT);

    init_map(bg_typ);
    init_fill(bg_typ, fg_typ);

    for (i = 0; i < N_P1_ITER; i++)
        pass_one(bg_typ, fg_typ);

    for (i = 0; i < N_P2_ITER; i++)
        pass_two(bg_typ, fg_typ);

    if (smooth)
        for (i = 0; i < N_P3_ITER; i++)
            pass_three(bg_typ, fg_typ);

    if (join)
        join_map(bg_typ, fg_typ);

    finish_map(fg_typ, bg_typ, C.boolean(lit), C.boolean(walled),
               init_lev.icedpools);
    /* a walled, joined level is cavernous, not mazelike -dlc */
    if (walled && join) {
        C.svl.level.flags.is_maze_lev = 0;
        C.svl.level.flags.is_cavernous_lev = 1;
    }
    C.free(C.gn.new_locations.address);
}

/*mkmap.c*/
