// hack.js — the hero's movement and the terrain predicates that go with it.
// C ref: src/hack.c
//
// These three predicates decide, for every monster and for the hero, whether a
// square can be entered. They had been living in mon.js and dog.js because
// those were their first callers; their C home is hack.c and this is it.
//
// None of them draws.

import { game } from './gstate.js';
import {
    IS_STWALL, IS_TREE, IS_OBSTRUCTED,
    W_NONDIGGABLE, W_NONPASSWALL,

    ROOMOFFSET, SHOPBASE, NO_ROOM, SHARED, SHARED_PLUS, COLNO, ROWNO,} from './const.js';
import { sobj_at } from './invent.js';
import { done } from './end.js';
import { DIED } from './const.js';
import { ONAMES } from './objects_data.js';
import { In_sokoban } from './dungeon.js';
import { tunnels, needspick, passes_walls } from './mondata.js';

// src/hack.c:922 may_dig() — intended to be called only on ROCKs or TREEs. A
// non-diggable wall or tree cannot be tunnelled through, which is what stops
// can_reach_location() routing a pet's path through solid rock.
export function may_dig(x, y) {
    const lev = game.level.at(x, y);
    if (!lev)
        return false;

    return !((IS_STWALL(lev.typ) || IS_TREE(lev.typ))
             && (lev.wall_info & W_NONDIGGABLE));
}

// src/hack.c may_passwall() — a phasing monster still cannot cross a wall the
// level generator marked non-passable (vault walls, the Sanctum).
export function may_passwall(x, y) {
    const lev = game.level.at(x, y);
    if (!lev)
        return false;

    return !(IS_STWALL(lev.typ) && (lev.wall_info & W_NONPASSWALL));
}

// src/hack.c:939 bad_rock() — is this square one a monster cannot walk through?
//
// The port used to carry only three of the five terms. It was missing
// `|| !may_dig(x, y)`, so a tunneller with no pick was let through undiggable
// rock, and it was missing `&& may_passwall(x, y)`, so a phasing monster was
// let through a vault wall. Both errors open paths the C never opens, and a
// pet that believes it can reach a square walks a different route to it.
export function bad_rock(mdat, x, y) {
    const lev = game.level?.at(x, y);
    if (!lev)
        return true;

    return ((In_sokoban(game.u.uz) && sobj_at(ONAMES.BOULDER, x, y))
            || (IS_OBSTRUCTED(lev.typ)
                && (!tunnels(mdat) || needspick(mdat) || !may_dig(x, y))
                && !(passes_walls(mdat) && may_passwall(x, y))));
}

// src/hack.c:4256 losehp() — the hero takes damage, and dies if it reaches 0.
//
// This is the main route into done(). It draws nothing itself; showdamage and
// end_running are display and movement bookkeeping.
export function losehp(n, knam, k_format) {
    /* Upolyd's rehumanize path needs polymorph state */
    game.u.uhp -= n;
    if (game.u.uhp > game.u.uhpmax)
        game.u.uhpmax = game.u.uhp;     /* perhaps n was negative */

    if (game.u.uhp < 1) {
        game.killer = { format: k_format, name: knam };
        done(DIED);
    }
}

// src/hack.c:3498 in_rooms() — the room numbers touching (x,y), as a string.
//
// Returns a STRING of room numbers, not a boolean, and callers test it with
// `*in_rooms(...)` — i.e. "is it non-empty". The odd shape comes from a square
// on a shared wall belonging to more than one room: SHARED steps by 2 to skip
// the diagonals, SHARED_PLUS steps by 1 to include them, and a plain room
// number short-circuits to just itself.
//
// `typewanted` filters: 0 accepts any room, SHOPBASE accepts every shop type.
// No draws anywhere in it.
export function in_rooms(x, y, typewanted) {
    /* svr.rooms in the C. The live array is game.level.rooms, assigned by
       mklev; game.rooms is initialised once in js/game.js and never written,
       so reading it here made every TYPE-FILTERED lookup fail -- in_rooms(x,
       y, SHOPBASE) and in_rooms(x, y, TEMPLE) always returned empty. */
    const rooms = game.level?.rooms || [];
    const goodtype = (rno) => {
        if (!typewanted)
            return true;
        const typefound = rooms[rno - ROOMOFFSET]?.rtype;
        return typefound === typewanted
            || (typewanted === SHOPBASE && typefound > SHOPBASE);
    };

    let out = '';
    const push = (rno) => { out = String.fromCharCode(rno) + out; };

    let rno = game.level?.at(x, y)?.roomno ?? NO_ROOM;
    let step;
    switch (rno) {
    case NO_ROOM:
        return out;
    case SHARED:
        step = 2;
        break;
    case SHARED_PLUS:
        step = 1;
        break;
    default:                            /* a regular room number */
        if (goodtype(rno))
            push(rno);
        return out;
    }

    let min_x = x - 1, max_x = x + 1;
    if (x < 1) min_x += step;
    else if (x >= COLNO) max_x -= step;

    let min_y = y - 1, max_y_offset = 2;
    if (min_y < 0) {
        min_y += step;
        max_y_offset -= step;
    } else if ((min_y + max_y_offset) >= ROWNO) {
        max_y_offset -= step;
    }

    for (let xx = min_x; xx <= max_x; xx += step)
        for (let yy = 0; yy <= max_y_offset; yy += step) {
            rno = game.level?.at(xx, min_y + yy)?.roomno ?? NO_ROOM;
            if (rno >= ROOMOFFSET && !out.includes(String.fromCharCode(rno))
                && goodtype(rno))
                push(rno);
        }
    return out;
}

/* js/monmove.js needs in_rooms() but cannot import this file without closing
   a cycle, and adding the import to the entry point perturbs module init order
   (see STATUS). Publishing on the shared game object avoids both. */
game.in_rooms = in_rooms;
