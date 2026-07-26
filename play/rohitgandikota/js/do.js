// do.js — commands that move the hero between levels, and the level change
// itself.
// C ref: src/do.c
//
// Seven of the 44 public sessions have their FIRST divergence inside mklev()
// because C descends a staircase and this port does not. getbones() is simply
// the first draw the new level makes; the missing piece is everything above it.

import { game } from './gstate.js';
import { ECMD_OK, ECMD_TIME } from './const.js';
import { rn2, rnd } from './rng.js';

/* mklev() lives in js/mklev.js, which this file's callers already pull in.
   A dynamic import() here hits the same partially-initialised module the
   somexy cycle did, so it goes through a wire like everything else. */
let mklev_fn = null;
export function do_wire_mklev(fn) { mklev_fn = fn; }

function note_unported_do(what) {
    (game.unported ||= new Set()).add(what);
}

// src/dungeon.c stairway_at() — the staircase on this square, or null.
export function stairway_at(x, y) {
    for (let s = game.stairs; s; s = s.next)
        if (s.sx === x && s.sy === y)
            return s;
    return null;
}

// src/do.c dodown() — the '>' command.
//
// Only the plain staircase path is ported. dodown's own two draws are the
// !rn2(3) / rnd(4) pair for falling through a trapdoor, which is a different
// branch; the staircase path spends none.
export async function dodown() {
    let stairs_down = false, ladder_down = false;
    const stway = stairway_at(game.u.ux, game.u.uy);

    if (stway && !stway.up) {
        stairs_down = !stway.isladder;
        ladder_down = !stairs_down;
    }

    /* levitation, being stuck, u_rooted, trapdoors and holes each have their
       own arm above this in C; none is reachable without those subsystems */
    if (!stairs_down && !ladder_down) {
        note_unported_do('dodown:not_on_stairs');
        return ECMD_OK;
    }

    await next_level(true);
    return ECMD_TIME;
}

// src/dungeon.c:1497 next_level() — descend to whatever this staircase leads to.
export async function next_level(at_stairs) {
    const stway = stairway_at(game.u.ux, game.u.uy);

    if (at_stairs && stway)
        stway.u_traversed = true;

    let newlevel;
    if (at_stairs && stway) {
        newlevel = { dnum: stway.tolev.dnum, dlevel: stway.tolev.dlevel };
    } else {
        newlevel = { dnum: game.u.uz.dnum, dlevel: game.u.uz.dlevel + 1 };
    }
    await goto_level(newlevel, at_stairs, false, false);
}

// src/do.c goto_level() — the level change.
//
// Only the "entering this level for the first time" arm is ported, which is
// the one a first descent takes:
//
//     if (!(svl.level_info[new_ledger].flags & LFILE_EXISTS)) {
//         mklev();          <- already ported
//         new = TRUE;
//     } else { ...reload the saved level from its file... }
//
// Three of goto_level's four draws are the Mysterious Force
// (rn2(4 + mysteryforce), rn2(odds), rn2(diff + 2)), which fires only in the
// Quest, and the fourth is rnd(3) falling damage. A plain staircase descent
// spends none of them, so this path adds no draws of its own -- everything it
// changes in the stream comes from mklev() running at all.
export async function goto_level(newlevel, at_stairs, falling, portal) {
    game.u.uz = { dnum: newlevel.dnum, dlevel: newlevel.dlevel };
    (game.visited_ledgers ||= new Set());

    const ledger = `${newlevel.dnum}:${newlevel.dlevel}`;
    if (game.visited_ledgers.has(ledger)) {
        /* returning to a previously visited level; C reloads it from its
           level file, which needs the save/restore code */
        note_unported_do('goto_level:reload_level_file');
        return;
    }
    game.visited_ledgers.add(ledger);

    /* entering this level for the first time; make it now */
    await mklev_fn();

    if (at_stairs)
        u_on_dnstairs();

    /* losedogs() brings the pets across; it needs the migration list */
    note_unported_do('goto_level:losedogs');
}

// src/do.c u_on_dnstairs() — put the hero on the down staircase of the new
// level. C uses the UP staircase when arriving from above.
function u_on_dnstairs() {
    const up = game.level?.upstair;
    if (up) {
        game.u.ux = up.x;
        game.u.uy = up.y;
        return;
    }
    note_unported_do('u_on_dnstairs:no_upstair');
}
