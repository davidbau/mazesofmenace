// sp_lev.js — special level and special room machinery.
// C ref: src/sp_lev.c
//
// Despite living in the file that hosts the Lua level loader, fill_special_room
// is plain C and has nothing to do with the interpreter. It was the first
// divergence in 12 of the 44 public sessions, all of them on the vault case:
// a vault is filled with gold, one pile per square, and each pile draws
// rn1(abs(depth) * 100, 51) — an rn2(100) — plus the next_ident of the object
// itself.

import { game } from './gstate.js';
import { rn1 } from './rng.js';
import { depth } from './dungeon.js';
import { mkgold } from './mkobj.js';
import {
    OROOM, THEMEROOM, VAULT, COURT, ZOO, BEEHIVE, ANTHOLE, COCKNEST,
    LEPREHALL, MORGUE, BARRACKS, TEMPLE, SWAMP, SHOPBASE,
    FILL_NONE, FILL_NORMAL,
} from './const.js';

// src/sp_lev.c:2731 fill_special_room()
export function fill_special_room(croom) {
    if (!croom)
        return;

    /* subrooms first, so an unfilled outer room does not block a special
       subroom and vice versa */
    for (const sub of croom.sbrooms || [])
        fill_special_room(sub);

    if (croom.rtype === OROOM || croom.rtype === THEMEROOM
        || croom.needfill === FILL_NONE)
        return;

    if (croom.needfill === FILL_NORMAL) {
        if (croom.rtype >= SHOPBASE) {
            /* stock_room() is a separate subsystem (shop inventory); it is
               not reached by any session that currently gets this far. */
            note_unported('stock_room');
            game.level.flags.has_shop = true;
            return;
        }

        switch (croom.rtype) {
        case VAULT:
            for (let x = croom.lx; x <= croom.hx; x++)
                for (let y = croom.ly; y <= croom.hy; y++)
                    mkgold(rn1(Math.abs(depth(game.u.uz)) * 100, 51), x, y);
            break;
        case COURT:
        case ZOO:
        case BEEHIVE:
        case ANTHOLE:
        case COCKNEST:
        case LEPREHALL:
        case MORGUE:
        case BARRACKS:
            note_unported(`fill_zoo rtype=${croom.rtype}`);
            break;
        default:
            break;
        }
    }

    /* the level flags are set regardless of needfill */
    const f = game.level.flags;
    switch (croom.rtype) {
    case VAULT:    f.has_vault = true; break;
    case ZOO:      f.has_zoo = true; break;
    case COURT:    f.has_court = true; break;
    case MORGUE:   f.has_morgue = true; break;
    case BEEHIVE:  f.has_beehive = true; break;
    case BARRACKS: f.has_barracks = true; break;
    case TEMPLE:   f.has_temple = true; break;
    case SWAMP:    f.has_swamp = true; break;
    default: break;
    }
}

function note_unported(what) {
    (game.unported ||= new Set()).add(what);
}
