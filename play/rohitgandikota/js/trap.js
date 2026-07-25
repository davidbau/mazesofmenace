// trap.js — traps.
// C ref: src/trap.c
//
// Only the level-generation entry points are here so far. maketrap() itself
// still lives in js/mklev.js alongside the rest of the level builder; this file
// holds the pieces of src/trap.c it calls into, so that a grep for a C symbol
// finds it in the file its C twin lives in.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { In_quest } from './const.js';

// src/dungeon.c dunlevs_in_dungeon()
function dunlevs_in_dungeon(lev) {
    return game.dungeons[lev.dnum].num_dunlevs;
}

// src/dungeon.c dunlev()
function dunlev(lev) {
    return lev.dlevel;
}

// include/dungeon.h In_hell() — the Gehennom branch.
function In_hell(lev) {
    return lev.dnum === game.hell_dnum;
}

// src/trap.c:418 dng_bottom() — how far down a hole can reach, stopping at the
// quest's locate level and, before the invocation, one short of Gehennom's.
function dng_bottom(lev) {
    let bottom = dunlevs_in_dungeon(lev);

    if (In_quest(lev)) {
        const qlocate_depth = game.qlocate_level?.dlevel ?? bottom;
        if ((game.dungeons[lev.dnum].dunlev_ureached ?? 0) < qlocate_depth)
            bottom = qlocate_depth;
    } else if (In_hell(lev)) {
        if (!game.u?.uevent?.invoked)
            bottom -= 1;
    }
    return bottom;
}

// src/trap.c:442 hole_destination() — where a hole or trapdoor drops you.
//
// One rn2(4) per level of descent, so it usually stops after a single draw but
// occasionally tunnels several levels down. maketrap() calls this at CREATION
// time for every HOLE and TRAPDOOR, which is why a level with a trapdoor on it
// costs draws the rest of the stream depends on.
export function hole_destination(dst) {
    const bottom = dng_bottom(game.u.uz);

    dst.dnum = game.u.uz.dnum;
    dst.dlevel = dunlev(game.u.uz);
    while (dst.dlevel < bottom) {
        dst.dlevel++;
        if (rn2(4))
            break;
    }
}
