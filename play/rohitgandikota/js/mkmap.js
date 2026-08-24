// mkmap.js — map-level helpers shared by the special-level loader.
// C ref: src/mkmap.c

import { game } from './gstate.js';
import { rn1, rn2, rnd } from './rng.js';
import { depth } from './dungeon.js';
import { isok } from './hacklib.js';
import { COLNO, ROWNO, NO_ROOM, SHARED, SDOOR,
         IS_WALL, IS_DOOR, IS_ROOM, IS_OBSTRUCTED,
         TREE, LAVAPOOL, ICE, ICED_POOL, ICED_MOAT,
         OROOM, ROOMOFFSET, MAXNROFROOMS } from './const.js';
/* mklev.js imports litstate_rnd from here; both sides export function
   declarations, which hoist, so the cycle resolves. */
import { add_room, somexy, dig_corridor } from './mklev.js';
import { wallify_map } from './sp_lev.js';

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
    /* C bound is WIDTH (COLNO - 2): the fill never claims the last column */
    for (i = sx; i <= COLNO - 2 && at(i, sy) && at(i, sy).typ === fg_typ; i++) {
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
        g.n_loc_filled = (g.n_loc_filled ?? 0) + 1;
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

/* HEIGHT/WIDTH per mkmap.c:8 — the fill area, not the full grid */
const HEIGHT = ROWNO - 1;
const WIDTH = COLNO - 2;

// src/mkmap.c:23 init_map()
function init_map(bg_typ) {
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const loc = game.level.at(x, y);
            loc.roomno = NO_ROOM;
            loc.typ = bg_typ;
            loc.lit = false;
        }
}

// src/mkmap.c:36 init_fill() — scatter fg_typ over 2/5 of the map.
function init_fill(bg_typ, fg_typ) {
    const limit = ((WIDTH * HEIGHT * 2) / 5) | 0;
    let count = 0;
    while (count < limit) {
        const x = rn1(WIDTH - 1, 2);
        const y = rnd(HEIGHT - 1);
        const loc = game.level.at(x, y);
        if (loc.typ === bg_typ) {
            loc.typ = fg_typ;
            count++;
        }
    }
}

// src/mkmap.c:54 get_map()
function get_map(col, row, bg_typ) {
    if (col <= 0 || row < 0 || col > WIDTH || row >= HEIGHT)
        return bg_typ;
    return game.level.at(col, row).typ;
}

// src/mkmap.c:62 dirs[]
const dirs = [
    -1, -1,  -1, 0,  -1, 1,  0, -1,
     0,  1,   1, -1,  1, 0,  1, 1,
];

// src/mkmap.c:67 pass_one() — cellular-automaton birth/death, in place.
function pass_one(bg_typ, fg_typ) {
    for (let x = 2; x <= WIDTH; x++)
        for (let y = 1; y < HEIGHT; y++) {
            let count = 0;
            for (let dr = 0; dr < 8; dr++)
                if (get_map(x + dirs[dr * 2], y + dirs[dr * 2 + 1], bg_typ)
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

/* gn.new_locations scratch buffer for the double-buffered passes */
let new_locations = null;
const new_loc_get = (i, j) => new_locations[j * (WIDTH + 1) + i];
const new_loc_set = (i, j, v) => { new_locations[j * (WIDTH + 1) + i] = v; };

// src/mkmap.c:100 pass_two() — kill exactly-5-neighbour cells, buffered.
function pass_two(bg_typ, fg_typ) {
    for (let x = 2; x <= WIDTH; x++)
        for (let y = 1; y < HEIGHT; y++) {
            let count = 0;
            for (let dr = 0; dr < 8; dr++)
                if (get_map(x + dirs[dr * 2], y + dirs[dr * 2 + 1], bg_typ)
                    === fg_typ)
                    count++;
            if (count === 5)
                new_loc_set(x, y, bg_typ);
            else
                new_loc_set(x, y, get_map(x, y, bg_typ));
        }
    for (let x = 2; x <= WIDTH; x++)
        for (let y = 1; y < HEIGHT; y++)
            game.level.at(x, y).typ = new_loc_get(x, y);
}

// src/mkmap.c:123 pass_three() — smooth: fewer than 3 neighbours dies.
function pass_three(bg_typ, fg_typ) {
    for (let x = 2; x <= WIDTH; x++)
        for (let y = 1; y < HEIGHT; y++) {
            let count = 0;
            for (let dr = 0; dr < 8; dr++)
                if (get_map(x + dirs[dr * 2], y + dirs[dr * 2 + 1], bg_typ)
                    === fg_typ)
                    count++;
            if (count < 3)
                new_loc_set(x, y, bg_typ);
            else
                new_loc_set(x, y, get_map(x, y, bg_typ));
        }
    for (let x = 2; x <= WIDTH; x++)
        for (let y = 1; y < HEIGHT; y++)
            game.level.at(x, y).typ = new_loc_get(x, y);
}

// src/mkmap.c:245 join_map_cleanup() — join_map uses temporary rooms.
function join_map_cleanup() {
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++)
            game.level.at(x, y).roomno = NO_ROOM;
    game.level.nroom = 0;
    game.level.nsubroom = 0;
    game.level.rooms.length = 0;
    game.level.rooms[0] = { hx: -1 };
    if (game.level.subrooms) game.level.subrooms.length = 0;
}

// src/mkmap.c:257 join_map() — flood-fill regions into temporary rooms,
// then dig corridors between successive rooms.
function join_map(bg_typ, fg_typ) {
    const g = game;

    /* first, use flood filling to find all of the regions that need
       joining */
    for (let x = 2; x <= WIDTH; x++)
        for (let y = 1; y < HEIGHT; y++) {
            const loc = g.level.at(x, y);
            if (loc.typ === fg_typ && (loc.roomno ?? NO_ROOM) === NO_ROOM) {
                g.min_rx = g.max_rx = x;
                g.min_ry = g.max_ry = y;
                g.n_loc_filled = 0;
                flood_fill_rm(x, y, g.level.nroom + ROOMOFFSET,
                              false, false);
                if (g.n_loc_filled > 3) {
                    add_room(g.min_rx, g.min_ry, g.max_rx, g.max_ry,
                             false, OROOM, true);
                    g.level.rooms[g.level.nroom - 1].irregular = true;
                    if (g.level.nroom >= MAXNROFROOMS * 2) {
                        x = WIDTH + 1; /* goto joinm */
                        break;
                    }
                } else {
                    /* it's a tiny hole; erase it from the map to avoid
                       having the player end up here with no way out */
                    for (let sx = g.min_rx; sx <= g.max_rx; sx++)
                        for (let sy = g.min_ry; sy <= g.max_ry; sy++)
                            if (g.level.at(sx, sy).roomno
                                === g.level.nroom + ROOMOFFSET) {
                                g.level.at(sx, sy).typ = bg_typ;
                                g.level.at(sx, sy).roomno = NO_ROOM;
                            }
                }
            }
        }

    /* the rooms are already sorted; don't call sort_rooms(), which can
       screw up the roomno's validity in the levl structure */
    for (let ci = 0, cj = 1; cj < g.level.nroom; ) {
        const croom = g.level.rooms[ci], croom2 = g.level.rooms[cj];
        const sm = {}, em = {};
        if (!somexy(croom, sm) || !somexy(croom2, em)) {
            /* impossible("No start/end room loc in join_map.") */
            sm.x = croom.lx + (((croom.hx - croom.lx) / 2) | 0);
            sm.y = croom.ly + (((croom.hy - croom.ly) / 2) | 0);
            em.x = croom2.lx + (((croom2.hx - croom2.lx) / 2) | 0);
            em.y = croom2.ly + (((croom2.hy - croom2.ly) / 2) | 0);
        }

        dig_corridor(sm, em, null, false, fg_typ, bg_typ);

        /* only increment croom if croom and croom2 are non-overlapping */
        if (croom2.lx > croom.hx
            || ((croom2.ly > croom.hy || croom2.hy < croom.ly) && rn2(3))) {
            ci = cj;
        }
        cj++; /* always increment the next room */
    }
    join_map_cleanup();
}

// src/mkmap.c:330 finish_map()
function finish_map(fg_typ, bg_typ, lit, walled, icedpools) {
    if (walled)
        wallify_map(1, 0, COLNO - 1, ROWNO - 1);

    if (lit) {
        for (let x = 1; x < COLNO; x++)
            for (let y = 0; y < ROWNO; y++) {
                const loc = game.level.at(x, y);
                if ((!IS_OBSTRUCTED(fg_typ) && loc.typ === fg_typ)
                    || (!IS_OBSTRUCTED(bg_typ) && loc.typ === bg_typ)
                    || (bg_typ === TREE && loc.typ === bg_typ)
                    || (walled && IS_WALL(loc.typ)))
                    loc.lit = true;
            }
        for (let x = 0; x < game.level.nroom; x++)
            game.level.rooms[x].rlit = 1;
    }
    /* light lava even if everything's otherwise unlit;
       ice might be frozen pool rather than frozen moat */
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const loc = game.level.at(x, y);
            if (loc.typ === LAVAPOOL)
                loc.lit = true;
            else if (loc.typ === ICE)
                loc.icedpool = icedpools ? ICED_POOL : ICED_MOAT;
        }
}

// src/mkmap.c:378 remove_rooms() — when a level processed by join_map is
// overlaid by a MAP, rooms fully inside the region are removed.
export function remove_rooms(lx, ly, hx, hy) {
    for (let i = game.level.nroom - 1; i >= 0; --i) {
        const croom = game.level.rooms[i];
        if (croom.hx < lx || croom.lx >= hx
            || croom.hy < ly || croom.ly >= hy)
            continue; /* no overlap */

        if (croom.lx < lx || croom.hx >= hx
            || croom.ly < ly || croom.hy >= hy) { /* partial overlap */
            if (!croom.irregular)
                impossible('regular room in joined map');
        } else {
            /* total overlap, remove the room */
            remove_room(i);
        }
    }
}

// src/mkmap.c:411 remove_room() — swap the last room over the removed one.
function remove_room(roomno) {
    const g = game;
    const croom = g.level.rooms[roomno];
    g.level.nroom--;
    const maxroom = g.level.rooms[g.level.nroom];

    if (croom !== maxroom) {
        Object.assign(croom, maxroom);
        /* since maxroom moved, update affected level roomno values */
        const oroomno = g.level.nroom + ROOMOFFSET;
        const nroomno = roomno + ROOMOFFSET;
        for (let x = croom.lx; x <= croom.hx; ++x)
            for (let y = croom.ly; y <= croom.hy; ++y) {
                if (g.level.at(x, y).roomno === oroomno)
                    g.level.at(x, y).roomno = nroomno;
            }
    }

    maxroom.hx = -1; /* just like add_room */
    g.level.rooms.length = g.level.nroom + 1;
}

/* src/mkmap.c:438 — tuning iterations */
const N_P1_ITER = 1;
const N_P2_ITER = 1;
const N_P3_ITER = 2;

// src/mkmap.c:450 mkmap() — the cellular-automaton cave generator behind
// LVLINIT_MINES ("mines" style level_init): scatter, birth/death passes,
// optional smoothing, optional joining, then walls and light.
export function mkmap(init_lev) {
    const bg_typ = init_lev.bg, fg_typ = init_lev.fg;
    const smooth = init_lev.smoothed, join = init_lev.joined;
    let lit = init_lev.lit;
    const walled = init_lev.walled;

    lit = litstate_rnd(lit);

    new_locations = new Array((WIDTH + 1) * HEIGHT).fill(0);

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

    finish_map(fg_typ, bg_typ, !!lit, !!walled, !!init_lev.icedpools);
    /* a walled, joined level is cavernous, not mazelike -dlc */
    if (walled && join) {
        game.level.flags.is_maze_lev = false;
        game.level.flags.is_cavernous_lev = true;
    }
    new_locations = null;
}
