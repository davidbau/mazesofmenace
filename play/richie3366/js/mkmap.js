// mkmap.js — Cavernous-level cellular-automata generator.
// C ref: nethack-c/upstream/src/mkmap.c — get_map, pass_one, pass_two,
// pass_three, remove_room, remove_rooms, init_map, init_fill, litstate_rnd,
// mkmap, join_map, join_map_cleanup, finish_map.
// Canonical home for the mkmap.c envelope; the live LVLINIT_MINES path in
// js/mklev.js splev_initlev awaits mkmap() here. wallify_map itself lives
// in js/mklev.js (C sp_lev.c:2864) and is imported, not cloned.
// RNG: init_fill draws rn1/rnd, litstate_rnd draws rnd/rn2 on the negative
// arm, join_map draws via somexy/dig_corridor/rn2(3); the six D-1902
// functions plus finish_map draw nothing.

import { game } from './gstate.js';
import {
    COLNO, ROWNO, ROOMOFFSET, NO_ROOM, MAXNROFROOMS, OROOM,
    TREE, LAVAPOOL, ICE, ICED_POOL, ICED_MOAT,
    IS_OBSTRUCTED, IS_WALL,
} from './const.js';
import { impossible } from './display.js';
import { rn2, rnd, rn1 } from './rng.js';
import { depth as depth_of_level } from './hacklib.js';
// Shared callees live in js/mklev.js (same C order, same argument order):
// wallify_map (C sp_lev.c:2864), add_room/somexy/dig_corridor (C mklev.c),
// mkmap_flood_fill_rm (C flood_fill_rm). join_map/join_map_cleanup/
// finish_map below are canonical here (C mkmap.c:245-363).
import {
    wallify_map,
    add_room, somexy, dig_corridor, mkmap_flood_fill_rm,
} from './mklev.js';

// C mkmap.c:8-9: HEIGHT is (ROWNO-1), WIDTH is (COLNO-2).
const HEIGHT = ROWNO - 1;
const WIDTH = COLNO - 2;

// C mkmap.c:62-65: 8-neighbour offsets, row-major pairs.
const DIRS = [
    -1, -1, -1, 0, -1, 1, 0, -1,
    0, 1, 1, -1, 1, 0, 1, 1,
];

// C ref: mkmap.c:54-60 get_map().
// Out-of-range reads report the background type, exactly like C.
export function get_map(col, row, bg_typ) {
    if (col <= 0 || row < 0 || col > WIDTH || row >= HEIGHT)
        return bg_typ;
    const loc = game.level.at(col, row);
    return loc ? loc.typ : bg_typ;
}

// Count fg_typ cells among the 8 neighbours of (x, y). C mkmap.c:75-78,
// :108-111, :131-134 (identical loop in all three passes).
function count_neighbours(x, y, bg_typ, fg_typ) {
    let count = 0;
    for (let dr = 0; dr < 8; dr++)
        if (get_map(x + DIRS[dr * 2], y + DIRS[dr * 2 + 1], bg_typ) === fg_typ)
            count++;
    return count;
}

// C ref: mkmap.c:67-96 pass_one().
// In-place cellular automaton step: 0-2 fg neighbours kill the cell,
// 5-8 breed it, 3-4 leave it. Writes go straight to levl, so later cells
// in the same sweep already see updated neighbours — preserved here.
export function pass_one(bg_typ, fg_typ) {
    const map = game.level;
    for (let x = 2; x <= WIDTH; x++)
        for (let y = 1; y < HEIGHT; y++) {
            const count = count_neighbours(x, y, bg_typ, fg_typ);
            switch (count) {
            case 0: /* death */
            case 1:
            case 2:
                map.at(x, y).typ = bg_typ;
                break;
            case 5:
            case 6:
            case 7:
            case 8:
                map.at(x, y).typ = fg_typ;
                break;
            default:
                break;
            }
        }
}

// Scratch-buffer layout. C mkmap.c:98:
// new_loc(i,j) is *(gn.new_locations + j*(WIDTH+1) + i); gn.new_locations is
// alloc'd once per mkmap() (:460) and freed at :485. Every pass below fully
// rewrites its region before the copy-back loop reads it, so a per-call
// scratch array is observationally identical to the reused C buffer.
function new_loc_index(i, j) {
    return j * (WIDTH + 1) + i;
}

// C ref: mkmap.c:100-121 pass_two().
// Double-buffered: exactly-5 neighbours become bg, everything else keeps
// its current type; the second loop copies the buffer back to levl.
export function pass_two(bg_typ, fg_typ) {
    const map = game.level;
    const nl = new Array((WIDTH + 1) * HEIGHT);
    for (let x = 2; x <= WIDTH; x++)
        for (let y = 1; y < HEIGHT; y++) {
            if (count_neighbours(x, y, bg_typ, fg_typ) === 5)
                nl[new_loc_index(x, y)] = bg_typ;
            else
                nl[new_loc_index(x, y)] = get_map(x, y, bg_typ);
        }

    for (let x = 2; x <= WIDTH; x++)
        for (let y = 1; y < HEIGHT; y++)
            map.at(x, y).typ = nl[new_loc_index(x, y)];
}

// C ref: mkmap.c:123-144 pass_three().
// Double-buffered smoothing: fewer than 3 fg neighbours become bg,
// everything else keeps its type; then copy back.
export function pass_three(bg_typ, fg_typ) {
    const map = game.level;
    const nl = new Array((WIDTH + 1) * HEIGHT);
    for (let x = 2; x <= WIDTH; x++)
        for (let y = 1; y < HEIGHT; y++) {
            if (count_neighbours(x, y, bg_typ, fg_typ) < 3)
                nl[new_loc_index(x, y)] = bg_typ;
            else
                nl[new_loc_index(x, y)] = get_map(x, y, bg_typ);
        }

    for (let x = 2; x <= WIDTH; x++)
        for (let y = 1; y < HEIGHT; y++)
            map.at(x, y).typ = nl[new_loc_index(x, y)];
}

// C ref: mkmap.c:438-440 — tuning knobs for the cavern CA driver below.
// Kept as named exports (not inlined literals) so the driver cites C.
export const N_P1_ITER = 1; /* tune map generation via this value */
export const N_P2_ITER = 1; /* tune map generation via this value */
export const N_P3_ITER = 2; /* tune map smoothing via this value */

// C ref: mkmap.c:23-34 init_map().
// Blanket-fill: every cell x in [1,COLNO), y in [0,ROWNO) gets NO_ROOM,
// the background type, and lit FALSE — field order preserved.
export function init_map(bg_typ) {
    const map = game.level;
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const loc = map.at(x, y);
            if (!loc) continue;
            loc.roomno = NO_ROOM;
            loc.typ = bg_typ;
            loc.lit = false;
        }
}

// C ref: mkmap.c:36-52 init_fill().
// RNG envelope: scatter exactly limit = (WIDTH*HEIGHT*2)/5 foreground cells
// at x = rn1(WIDTH-1, 2) in [2,WIDTH], y = rnd(HEIGHT-1) in [1,HEIGHT-1];
// occupied cells do not count (loop retries without drawing extra RNG).
export function init_fill(bg_typ, fg_typ) {
    const map = game.level;
    const limit = (WIDTH * HEIGHT * 2) / 5;
    let count = 0;
    while (count < limit) {
        const x = rn1(WIDTH - 1, 2);
        const y = rnd(HEIGHT - 1);
        const loc = map.at(x, y);
        if (loc && loc.typ === bg_typ) {
            loc.typ = fg_typ;
            count++;
        }
    }
}

// C ref: mkmap.c:442-448 litstate_rnd().
// Negative input resolves against dungeon depth: rnd(1+|depth|) < 11 gates
// rn2(77), exactly like C's short-circuit &&. Non-negative passes through
// as boolean (C returns (boolean) litstate into an xint16).
export function litstate_rnd(litstate) {
    if (litstate < 0) {
        const d = depth_of_level(game.u?.uz);
        return (rnd(1 + Math.abs(d)) < 11 && rn2(77)) ? true : false;
    }
    return !!litstate;
}

// C ref: mkmap.c:245-255 join_map_cleanup().
// Strips every roomno (the joined regions were fictitious bookkeeping),
// then resets the room lists. C :253-254 assigns after the counters reset:
// svr.rooms[svn.nroom].hx = gs.subrooms[gn.nsubroom].hx = -1, i.e. slot 0
// of both lists. JS subrooms[0] is rooms[MAXNROFROOMS+1] (mklev.js
// clear_level_structures/add_subroom layout); both slots get the same
// hx = -1 tombstone add_room uses, instead of mutating a stale room object.
export function join_map_cleanup() {
    const g = game;
    const map = g.level;
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const loc = map.at(x, y);
            if (loc) loc.roomno = NO_ROOM;
        }
    g.level.nroom = 0;
    g.level.nsubroom = 0;
    if (!g.level.rooms) g.level.rooms = [];
    g.level.rooms[0] = { hx: -1 };
    g.level.rooms[MAXNROFROOMS + 1] = { hx: -1 };
}

// C ref: mkmap.c:257-328 join_map().
// Flood-fill every fg_typ region into a room (tiny holes of 3 or fewer
// cells are erased to bg instead), then join consecutive rooms with
// dig_corridor corridors. The rooms arrive pre-sorted from the fill loop,
// so C deliberately skips sort_rooms() (it would invalidate levl roomnos)
// — preserved: no sort call here. The fill is mklev's counting
// mkmap_flood_fill_rm (C flood_fill_rm, with the gn.n_loc_filled counter
// carried as bounds.n_filled). Async only for the C :304-310 somexy-failure
// impossible() arm (JS impossible awaits a bug pline).
export async function join_map(bg_typ, fg_typ) {
    const g = game;
    const map = g.level;
    outer:
    for (let x = 2; x <= WIDTH; x++)
        for (let y = 1; y < HEIGHT; y++) {
            const loc = map.at(x, y);
            if (!loc || loc.typ !== fg_typ || loc.roomno !== NO_ROOM)
                continue;
            // C :268-271 gm.min/max reset + gn.n_loc_filled = 0; the JS
            // flood fill carries them as a bounds object.
            const bounds = {
                min_rx: x, max_rx: x, min_ry: y, max_ry: y, n_filled: 0,
            };
            mkmap_flood_fill_rm(x, y, g.level.nroom + ROOMOFFSET,
                false, false, bounds);
            if (bounds.n_filled > 3) {
                // C :274-279 add_room(..., FALSE, OROOM, TRUE) + irregular.
                add_room(bounds.min_rx, bounds.min_ry,
                    bounds.max_rx, bounds.max_ry, false, OROOM, true);
                const croom = g.level.rooms[g.level.nroom - 1];
                if (croom) croom.irregular = true;
                // C :280-281 goto joinm past MAXNROFROOMS*2 rooms.
                if (g.level.nroom >= MAXNROFROOMS * 2)
                    break outer;
            } else {
                // C :282-295 tiny hole: erase cells stamped with the
                // un-incremented nroom + ROOMOFFSET marker.
                const rmno = g.level.nroom + ROOMOFFSET;
                for (let sx = bounds.min_rx; sx <= bounds.max_rx; sx++)
                    for (let sy = bounds.min_ry; sy <= bounds.max_ry; sy++) {
                        const cell = map.at(sx, sy);
                        if (cell && cell.roomno === rmno) {
                            cell.typ = bg_typ;
                            cell.roomno = NO_ROOM;
                        }
                    }
            }
        }
    // joinm: C :296-326 corridor join pass over consecutive room pairs.
    let ci = 0;
    let cj = 1;
    while (cj < g.level.nroom) {
        const croom = g.level.rooms[ci];
        const croom2 = g.level.rooms[cj];
        if (!croom || !croom2) break;
        const sm = { x: 0, y: 0 };
        const em = { x: 0, y: 0 };
        // C :302 short-circuit: the second somexy runs only if the first
        // succeeded (somex/somey draw RNG — order preserved).
        if (!somexy(croom, sm) || !somexy(croom2, em)) {
            // C :303-310 ack — busted level; room centres + hope.
            await impossible('No start/end room loc in join_map.');
            sm.x = croom.lx + (((croom.hx - croom.lx) / 2) | 0);
            sm.y = croom.ly + (((croom.hy - croom.ly) / 2) | 0);
            em.x = croom2.lx + (((croom2.hx - croom2.lx) / 2) | 0);
            em.y = croom2.ly + (((croom2.hy - croom2.ly) / 2) | 0);
        }
        // C :312 dig_corridor(&sm, &em, NULL, FALSE, fg_typ, bg_typ).
        dig_corridor(sm, em, null, false, fg_typ, bg_typ);
        // C :316-321 advance: step croom forward only on non-overlap
        // (rn2(3) is drawn only when lx overlaps but ly does not —
        // the || / && short-circuit is load-bearing for RNG).
        if (croom2.lx > croom.hx
            || ((croom2.ly > croom.hy || croom2.hy < croom.ly) && rn2(3))) {
            ci = cj;
        }
        cj++;
    }
    join_map_cleanup();
}

// C ref: mkmap.c:330-363 finish_map().
// Wallify, light, then lava-ice, in C order. walled runs wallify_map over
// the whole map first; lit lights every fg/bg cell (plus fresh walls when
// walled) and stamps every room rlit; lava cells always light even when
// unlit, and ice records frozen-pool vs frozen-moat from icedpools.
// C :361 uses the rm.h ICED_POOL/ICED_MOAT codes (8/16), not 1/2.
// Draws no RNG.
export function finish_map(fg_typ, bg_typ, lit, walled, icedpools) {
    const map = game.level;
    if (walled)
        wallify_map(1, 0, COLNO - 1, ROWNO - 1);

    if (lit) {
        for (let x = 1; x < COLNO; x++)
            for (let y = 0; y < ROWNO; y++) {
                const loc = map.at(x, y);
                if (!loc) continue;
                if ((!IS_OBSTRUCTED(fg_typ) && loc.typ === fg_typ)
                    || (!IS_OBSTRUCTED(bg_typ) && loc.typ === bg_typ)
                    || (bg_typ === TREE && loc.typ === bg_typ)
                    || (walled && IS_WALL(loc.typ)))
                    loc.lit = true;
            }
        for (let x = 0; x < (game.level.nroom | 0); x++)
            if (game.level.rooms[x]) game.level.rooms[x].rlit = 1;
    }
    /* light lava even if everything's otherwise unlit;
       ice might be frozen pool rather than frozen moat */
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const loc = map.at(x, y);
            if (!loc) continue;
            if (loc.typ === LAVAPOOL)
                loc.lit = true;
            else if (loc.typ === ICE)
                loc.icedpool = icedpools ? ICED_POOL : ICED_MOAT;
        }
}

// C ref: mkmap.c:450-486 mkmap().
// Cavern assembly driver: resolve lit, blanket the map, scatter the RNG
// fill, run the CA passes N_P1_ITER/N_P2_ITER (and N_P3_ITER smoothing)
// times, join the regions, finish_map (wallify/lit/lava-ice :478), then
// stamp the walled+joined level cavernous, not mazelike (-dlc :480-484).
// new_locations ownership (C :460 alloc / :485 free): C threads one
// (WIDTH+1)*HEIGHT scratch buffer through pass_two/pass_three via the
// new_loc macro. The JS passes above keep per-call scratch at the same
// new_loc layout instead (see new_loc_index); that is observationally
// identical — every pass fully rewrites its region before its copy-back
// loop reads it, and this driver calls the passes strictly sequentially —
// so there is no shared buffer for mkmap() itself to own or free.
export async function mkmap(init_lev) {
    const bg_typ = init_lev.bg;
    const fg_typ = init_lev.fg;
    const smooth = !!init_lev.smoothed;
    const join = !!init_lev.joined;
    let lit = init_lev.lit;
    const walled = !!init_lev.walled;
    let i;

    lit = litstate_rnd(lit);

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

    finish_map(fg_typ, bg_typ, !!lit, walled, !!init_lev.icedpools);
    /* a walled, joined level is cavernous, not mazelike -dlc */
    if (walled && join) {
        game.level.flags.is_maze_lev = false;
        game.level.flags.is_cavernous_lev = true;
    }
}

// C ref: mkmap.c:378-401 remove_rooms().
// Removes every room totally overlapped by [lx,hx)x[ly,hy); a partially
// overlapped room is left in place (C TODO) and, when regular, reported via
// impossible(). Async only because JS impossible() awaits a bug pline.
// Note: remove_rooms has no callers in pinned upstream src (it is extern in
// include/extern.h:1614); it is ported as the public entry C provides.
export async function remove_rooms(lx, ly, hx, hy) {
    const g = game;
    for (let i = g.level.nroom - 1; i >= 0; --i) {
        const croom = g.level.rooms[i];
        if (croom.hx < lx || croom.lx >= hx || croom.hy < ly
            || croom.ly >= hy)
            continue; /* no overlap */

        if (croom.lx < lx || croom.hx >= hx || croom.ly < ly
            || croom.hy >= hy) { /* partial overlap */
            /* TODO: ensure remaining parts of room are still joined */

            if (!croom.irregular)
                await impossible('regular room in joined map');
        } else {
            /* total overlap, remove the room */
            remove_room(i);
        }
    }
}

// C ref: mkmap.c:403-436 remove_room().
// Swaps the last room over the removed slot (corridors are already dug, so
// array order no longer matters), rewrites levl roomno cells that pointed
// at the moved room, and tombstones the dead slot with hx = -1.
export function remove_room(roomno) {
    const g = game;
    const rooms = g.level.rooms;
    const croom = rooms[roomno];
    const maxroom = rooms[--g.level.nroom];

    if (croom !== maxroom) {
        /* C does *croom = *maxroom (struct copy). JS rooms are objects, so
           copy fields into the vacated slot — never alias maxroom, or the
           hx = -1 tombstone below would also kill the moved room. */
        rooms[roomno] = { ...maxroom };

        /* since maxroom moved, update affected level roomno values */
        const oroomno = g.level.nroom + ROOMOFFSET;
        const newroomno = roomno + ROOMOFFSET;
        const moved = rooms[roomno];
        /* JS-only ownership: roomnoidx caches the slot index (dog.js,
           hack.js, mklev.js derive levl roomno from it), so restamp it like
           the C levl rewrite restamps cells. */
        moved.roomnoidx = roomno;
        for (let x = moved.lx; x <= moved.hx; ++x)
            for (let y = moved.ly; y <= moved.hy; ++y) {
                const loc = g.level.at(x, y);
                if (loc && loc.roomno === oroomno)
                    loc.roomno = newroomno;
            }
    }

    maxroom.hx = -1; /* just like add_room */
}
