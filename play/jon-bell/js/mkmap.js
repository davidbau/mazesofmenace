// mkmap.ts — C ref: mkmap.c
// @ts-nocheck — sibling imports from hand-maintained js/*.js.
import { game } from './gstate.js';
import { rnd, rn2, rn1 } from './rng.js';
import { depth as depth_of_level } from './hacklib.js';
import { IS_WALL, IS_DOOR, IS_ROOM, IS_OBSTRUCTED, isok, SDOOR, NO_ROOM, SHARED,
         COLNO, ROWNO, TREE, LAVAPOOL, ICE, ICED_POOL, ICED_MOAT,
         MAXNROFROOMS, ROOMOFFSET, OROOM } from './const.js';
import { impossible } from './steed.js';
/* mkmap.c's join_map() reaches into the mklev.c room machinery (add_room,
 * somexy) and sp_lev.c's wallify_map.  js/mklev.js already imports
 * litstate_rnd from this file, so this is a module cycle — it resolves
 * because every binding below is a hoisted `function` declaration used only
 * at call time, never at module-evaluation time. */
import { add_room, somexy, dig_corridor } from './mklev.js';
import { wallify_map } from './sp_lev.js';
/* C ref: mkmap.c:443-447 boolean litstate_rnd(int litstate)
 *   if (litstate < 0)
 *       return (rnd(1 + abs(depth(&u.uz))) < 11 && rn2(77)) ? TRUE : FALSE;
 *   return (boolean) litstate;
 * `boolean` is `schar` (nethack-c/include/global.h:83), so the non-negative
 * path is a TRUNCATION to signed char, not a normalisation to 0/1: C returns
 * 29 for litstate == 29.  Every call site uses the result as a truth value
 * (or coerces with `lit ? 1 : 0`), so this is behaviourally inert in play. */
export function litstate_rnd(litstate) {
    if (litstate < 0) {
        const d = depth_of_level(game.u?.uz);
        const threshold = 1 + Math.abs(d);
        const r = rnd(threshold);
        if (r >= 11)
            return false;
        return rn2(77) !== 0;
    }
    return ((litstate | 0) << 24) >> 24; /* (boolean) litstate — schar cast */
}

/* C: #define HEIGHT (ROWNO - 1), #define WIDTH (COLNO - 2) */
const WIDTH = 78;   /* COLNO - 2, COLNO = 80 */
const HEIGHT = 20;  /* ROWNO - 1, ROWNO = 21 */
const N_P1_ITER = 1;
const N_P2_ITER = 1;
const N_P3_ITER = 2;

export async function mkmap(init_lev) {
    const bg_typ = init_lev.bg, fg_typ = init_lev.fg;
    const smooth = init_lev.smoothed, join = init_lev.joined;
    let lit = init_lev.lit;
    const walled = init_lev.walled;
    let i;

    lit = litstate_rnd(lit);

    if (!game.gn) game.gn = {};
    if (!game.gm) game.gm = {};
    /* C: gn.new_locations = alloc((WIDTH + 1) * HEIGHT) — a raw char scratch
     * buffer indexed by new_loc(i,j) = *(gn.new_locations + j*(WIDTH+1) + i). */
    game.gn.new_locations = new Array((WIDTH + 1) * HEIGHT).fill(0);

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
        await join_map(bg_typ, fg_typ);

    finish_map(fg_typ, bg_typ, Boolean(lit), Boolean(walled),
               init_lev.icedpools);
    /* a walled, joined level is cavernous, not mazelike -dlc */
    if (walled && join) {
        game.level.flags.is_maze_lev = false;
        game.level.flags.is_cavernous_lev = true;
    }
    game.gn.new_locations = null; /* free(gn.new_locations) */
}

export function flood_fill_rm(sx, sy, rmno, lit, anyroom) {
    let i, nx;
    const fg_typ = game.level.at(sx, sy).typ;

    /* back up to find leftmost uninitialized location */
    while (sx > 0 && (anyroom ? IS_ROOM(game.level.at(sx, sy).typ)
                              : game.level.at(sx, sy).typ === fg_typ)
           && (game.level.at(sx, sy).roomno | 0) !== rmno)
        sx--;
    sx++; /* compensate for extra decrement */

    /* assume sx,sy is valid */
    if (!game.gm) game.gm = {};
    if (!game.gn) game.gn = {};
    if (sx < game.gm.min_rx)
        game.gm.min_rx = sx;
    if (sy < game.gm.min_ry)
        game.gm.min_ry = sy;

    for (i = sx; i <= WIDTH && game.level.at(i, sy).typ === fg_typ; i++) {
        game.level.at(i, sy).roomno = rmno;
        game.level.at(i, sy).lit = lit;
        if (anyroom) {
            /* add walls to room as well */
            let ii, jj;
            for (ii = (i === sx ? i - 1 : i); ii <= i + 1; ii++)
                for (jj = sy - 1; jj <= sy + 1; jj++)
                    if (isok(ii, jj) && (IS_WALL(game.level.at(ii, jj).typ)
                                         || IS_DOOR(game.level.at(ii, jj).typ)
                                         || game.level.at(ii, jj).typ === SDOOR)) {
                        game.level.at(ii, jj).edge = 1;
                        if (lit)
                            game.level.at(ii, jj).lit = lit;

                        if (game.level.at(ii, jj).roomno === NO_ROOM)
                            game.level.at(ii, jj).roomno = rmno;
                        else if ((game.level.at(ii, jj).roomno | 0) !== rmno)
                            game.level.at(ii, jj).roomno = SHARED;
                    }
        }
        game.gn.n_loc_filled++;
    }
    nx = i;

    if (isok(sx, sy - 1)) {
        for (i = sx; i < nx; i++)
            if (game.level.at(i, sy - 1).typ === fg_typ) {
                if ((game.level.at(i, sy - 1).roomno | 0) !== rmno)
                    flood_fill_rm(i, sy - 1, rmno, lit, anyroom);
            } else {
                if ((i > sx || isok(i - 1, sy - 1))
                    && game.level.at(i - 1, sy - 1).typ === fg_typ) {
                    if ((game.level.at(i - 1, sy - 1).roomno | 0) !== rmno)
                        flood_fill_rm(i - 1, sy - 1, rmno, lit, anyroom);
                }
                if ((i < nx - 1 || isok(i + 1, sy - 1))
                    && game.level.at(i + 1, sy - 1).typ === fg_typ) {
                    if ((game.level.at(i + 1, sy - 1).roomno | 0) !== rmno)
                        flood_fill_rm(i + 1, sy - 1, rmno, lit, anyroom);
                }
            }
    }
    if (isok(sx, sy + 1)) {
        for (i = sx; i < nx; i++)
            if (game.level.at(i, sy + 1).typ === fg_typ) {
                if ((game.level.at(i, sy + 1).roomno | 0) !== rmno)
                    flood_fill_rm(i, sy + 1, rmno, lit, anyroom);
            } else {
                if ((i > sx || isok(i - 1, sy + 1))
                    && game.level.at(i - 1, sy + 1).typ === fg_typ) {
                    if ((game.level.at(i - 1, sy + 1).roomno | 0) !== rmno)
                        flood_fill_rm(i - 1, sy + 1, rmno, lit, anyroom);
                }
                if ((i < nx - 1 || isok(i + 1, sy + 1))
                    && game.level.at(i + 1, sy + 1).typ === fg_typ) {
                    if ((game.level.at(i + 1, sy + 1).roomno | 0) !== rmno)
                        flood_fill_rm(i + 1, sy + 1, rmno, lit, anyroom);
                }
            }
    }

    if (nx > game.gm.max_rx)
        game.gm.max_rx = nx - 1; /* nx is just past valid region */
    if (sy > game.gm.max_ry)
        game.gm.max_ry = sy;
}

function init_map(bg_typ) {
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const loc = game.level.at(x, y);
            loc.roomno = NO_ROOM;
            loc.typ = bg_typ;
            loc.lit = false;
        }
}

/* C ref: mkmap.c:36-52 init_fill(schar bg_typ, schar fg_typ) — sprinkle
 * fg_typ over the map until 2/5 of the interior has been converted.
 *
 * RNG: rn1(WIDTH - 1, 2) then rnd(HEIGHT - 1), BOTH drawn on every iteration
 * (before the typ test), and the loop repeats until `count` reaches the limit
 * — so the draw count is data-dependent, not fixed.  When bg_typ == fg_typ
 * (Kni-strt's `des.level_init({ style="mines", fg=".", bg="." })`) the test is
 * always true and the loop runs exactly `limit` times.  C's `long limit` is
 * integer division: (78 * 20 * 2) / 5 = 624. */
function init_fill(bg_typ, fg_typ) {
    const limit = Math.trunc((WIDTH * HEIGHT * 2) / 5);
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

/* C ref: mkmap.c:54-60 get_map(coordxy col, coordxy row, schar bg_typ) —
 * off-map reads answer bg_typ, so the automaton sees a bg_typ border. */
function get_map(col, row, bg_typ) {
    if (col <= 0 || row < 0 || col > WIDTH || row >= HEIGHT)
        return bg_typ;
    return game.level.at(col, row).typ;
}

/* C ref: mkmap.c:62-65 — the eight neighbour offsets, as flat (dx,dy) pairs. */
const dirs = [
    -1, -1, /**/ -1, 0, /**/ -1, 1, /**/ 0, -1,
    0, 1, /**/ 1, -1, /**/ 1, 0, /**/ 1, 1,
];

/* C ref: mkmap.c:67-93 pass_one(schar bg_typ, schar fg_typ) — first cellular
 * automaton pass.  Note C writes levl[x][y] IN PLACE here (unlike pass_two /
 * pass_three, which double-buffer through gn.new_locations), so a cell's new
 * value is visible to its right/below neighbours within the same pass.  That
 * asymmetry is C's behaviour, bug or not; keep it. */
function pass_one(bg_typ, fg_typ) {
    for (let x = 2; x <= WIDTH; x++)
        for (let y = 1; y < HEIGHT; y++) {
            let count = 0;
            for (let dr = 0; dr < 8; dr++)
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

/* C ref: mkmap.c:95 #define new_loc(i, j)
 *     *(gn.new_locations + ((j) * (WIDTH + 1)) + (i)) */
function new_loc_idx(i, j) {
    return (j * (WIDTH + 1)) + i;
}

/* C ref: mkmap.c:97-118 pass_two(schar bg_typ, schar fg_typ) — double-buffered
 * pass: compute every cell into gn.new_locations, then copy back. */
function pass_two(bg_typ, fg_typ) {
    const nl = game.gn.new_locations;

    for (let x = 2; x <= WIDTH; x++)
        for (let y = 1; y < HEIGHT; y++) {
            let count = 0;
            for (let dr = 0; dr < 8; dr++)
                if (get_map(x + dirs[dr * 2], y + dirs[(dr * 2) + 1], bg_typ)
                    === fg_typ)
                    count++;
            if (count === 5)
                nl[new_loc_idx(x, y)] = bg_typ;
            else
                nl[new_loc_idx(x, y)] = get_map(x, y, bg_typ);
        }

    for (let x = 2; x <= WIDTH; x++)
        for (let y = 1; y < HEIGHT; y++)
            game.level.at(x, y).typ = nl[new_loc_idx(x, y)];
}

/* C ref: mkmap.c:120-141 pass_three(schar bg_typ, schar fg_typ) — the
 * smoothing pass; same double-buffering as pass_two, different threshold. */
function pass_three(bg_typ, fg_typ) {
    const nl = game.gn.new_locations;

    for (let x = 2; x <= WIDTH; x++)
        for (let y = 1; y < HEIGHT; y++) {
            let count = 0;
            for (let dr = 0; dr < 8; dr++)
                if (get_map(x + dirs[dr * 2], y + dirs[(dr * 2) + 1], bg_typ)
                    === fg_typ)
                    count++;
            if (count < 3)
                nl[new_loc_idx(x, y)] = bg_typ;
            else
                nl[new_loc_idx(x, y)] = get_map(x, y, bg_typ);
        }

    for (let x = 2; x <= WIDTH; x++)
        for (let y = 1; y < HEIGHT; y++)
            game.level.at(x, y).typ = nl[new_loc_idx(x, y)];
}

/* C ref: mkmap.c:245-255 join_map_cleanup(void) — join_map's rooms were only
 * scaffolding for the corridor digging; drop them.
 *   svn.nroom = gn.nsubroom = 0;
 *   svr.rooms[svn.nroom].hx = gs.subrooms[gn.nsubroom].hx = -1;
 * JS homes: svr.rooms -> game.level.rooms, svn.nroom -> game.level.nroom,
 * gs.subrooms/gn.nsubroom -> game.level._subrooms/._nsubroom (js/mkroom.js). */
function join_map_cleanup() {
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++)
            game.level.at(x, y).roomno = NO_ROOM;
    game.level.nroom = 0;
    game.level._nsubroom = 0;
    if (!game.level.rooms)
        game.level.rooms = [];
    game.level.rooms[0] = { hx: -1 };
    if (!game.level._subrooms)
        game.level._subrooms = [];
    game.level._subrooms[0] = { hx: -1 };
}

/* C ref: mkmap.c:257-326 join_map(schar bg_typ, schar fg_typ) — flood-fill the
 * fg_typ blobs into temporary rooms, erase the ones too small to stand in, and
 * dig corridors between the survivors.
 *
 * RNG: somexy() (via somex/somey) and the rn2(3) that decides whether to
 * advance the left-hand room, plus whatever dig_corridor() draws.
 * Unreachable for every level currently admitted by mklev.js's LOADER_READY
 * (Kni-strt passes joined=false); it is ported because the mines levels that
 * unblock next all pass joined=true, and a silent no-op stub would corrupt
 * them without a divergence pointing here. */
async function join_map(bg_typ, fg_typ) {
    let joinm = false;

    /* first, use flood filling to find all of the regions that need joining */
    for (let x = 2; x <= WIDTH && !joinm; x++)
        for (let y = 1; y < HEIGHT; y++) {
            const loc = game.level.at(x, y);
            if (loc.typ === fg_typ && (loc.roomno | 0) === NO_ROOM) {
                game.gm.min_rx = game.gm.max_rx = x;
                game.gm.min_ry = game.gm.max_ry = y;
                game.gn.n_loc_filled = 0;
                flood_fill_rm(x, y, game.level.nroom + ROOMOFFSET, false,
                              false);
                if (game.gn.n_loc_filled > 3) {
                    add_room(game.gm.min_rx, game.gm.min_ry, game.gm.max_rx,
                             game.gm.max_ry, false, OROOM, true);
                    game.level.rooms[game.level.nroom - 1].irregular = true;
                    if (game.level.nroom >= (MAXNROFROOMS * 2)) {
                        joinm = true; /* C: goto joinm */
                        break;
                    }
                } else {
                    /*
                     * it's a tiny hole; erase it from the map to avoid
                     * having the player end up here with no way out.
                     */
                    for (let sx = game.gm.min_rx; sx <= game.gm.max_rx; sx++)
                        for (let sy = game.gm.min_ry; sy <= game.gm.max_ry;
                             sy++) {
                            const sloc = game.level.at(sx, sy);
                            if ((sloc.roomno | 0)
                                === game.level.nroom + ROOMOFFSET) {
                                sloc.typ = bg_typ;
                                sloc.roomno = NO_ROOM;
                            }
                        }
                }
            }
        }

    /*
     * Ok, now we can actually join the regions with fg_typ's.
     * The rooms are already sorted due to the previous loop,
     * so don't call sort_rooms(), which can screw up the roomno's
     * validity in the levl structure.
     */
    for (let ci = 0, c2i = 1; c2i < game.level.nroom; ) {
        const croom = game.level.rooms[ci];
        const croom2 = game.level.rooms[c2i];
        const sm = { x: 0, y: 0 }, em = { x: 0, y: 0 };

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

        await dig_corridor(sm, em, null, false, fg_typ, bg_typ);

        /* choose next region to join */
        /* only increment croom if croom and croom2 are non-overlapping */
        if (croom2.lx > croom.hx
            || ((croom2.ly > croom.hy || croom2.hy < croom.ly)
                && rn2(3))) {
            ci = c2i;
        }
        c2i++; /* always increment the next room */
    }
    join_map_cleanup();
}

/* C ref: mkmap.c:328-361 finish_map(...) — wallify, light, and stamp the
 * ice/lava fixups.  RNG-free. */
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
