// priest.js — temple priests.
// C ref: src/priest.c
//
// Only priestini() and p_coaligned() are here so far, which is what mktemple()
// needs. The priest's behaviour (temple donations, anger, the shrine checks)
// is a separate job and is absent rather than stubbed.

import { game } from './gstate.js';
import { rn2, rn1 } from './rng.js';
import { xdir, ydir, N_DIRS, MM_EPRI, ROOMOFFSET, A_NONE, W_ARMC } from './const.js';
import { makemon, mpickobj, set_malign } from './makemon.js';
import { mkobj, curse, uncurse, SPBOOK_no_NOVEL } from './mkobj.js';
import { which_armor } from './worn.js';
import { pm_good_location } from './sp_lev.js';
import { m_at } from './mon.js';
import { PMNAMES } from './monst_data.js';
import { Amask2align } from './const.js';

function note_unported_priest(what) {
    (game.unported ||= new Set()).add(`priest:${what}`);
}

// include/hack.h:662 DIR_CLAMP()
const DIR_CLAMP = (dir) => (dir + N_DIRS) % N_DIRS;

// src/priest.c:220 priestini() — create the temple priest.
//
// Draws, in order, and all of them matter because mktemple() is otherwise
// only terrain: rn2(N_DIRS) picks which direction to start scanning from,
// then makemon, then rn1(3, 2) spellbooks with one mkobj each, then rn2(2)
// for whether the robe is blessed or cursed.
export function priestini(lvl, sroom, sx, sy, sanctum) {
    let px = 0, py = 0, i;
    const si = rn2(N_DIRS);
    const prim = game.mons[sanctum ? PMNAMES.PM_HIGH_CLERIC
                                   : PMNAMES.PM_ALIGNED_CLERIC];

    for (i = 0; i < N_DIRS; i++) {
        px = sx + xdir[DIR_CLAMP(i + si)];
        py = sy + ydir[DIR_CLAMP(i + si)];
        if (pm_good_location(px, py, prim))
            break;
    }
    if (i === N_DIRS) {
        px = sx; py = sy;
    }

    if (m_at(px, py))
        note_unported_priest('priestini:rloc');     /* insurance */

    const priest = makemon(prim, px, py, MM_EPRI);
    if (priest) {
        priest.epri = {
            shroom: game.level.rooms.indexOf(sroom) + ROOMOFFSET,
            shralign: Amask2align(game.level.at(sx, sy).altarmask),
            shrpos: { x: sx, y: sy },
            shrlevel: { ...lvl },
        };
        priest.mpeaceful = 1;
        priest.ispriest = 1;
        priest.isminion = 0;
        priest.msleeping = 0;
        set_malign(priest);     /* mpeaceful may have changed */

        /* now his/her goodies... */
        if (sanctum && priest.epri.shralign === A_NONE)
            note_unported_priest('priestini:amulet_of_yendor');

        /* 2 to 4 spellbooks */
        for (let cnt = rn1(3, 2); cnt > 0; --cnt)
            mpickobj(priest, mkobj(SPBOOK_no_NOVEL, false));

        /* robe [via makemon()] */
        let otmp;
        if (rn2(2) && (otmp = which_armor(priest, W_ARMC)) !== null
            && otmp !== undefined) {
            if (p_coaligned(priest))
                uncurse(otmp);
            else
                curse(otmp);
        }
    }
}

// src/priest.c:370 p_coaligned()
export function p_coaligned(priest) {
    return game.u.ualign.type === mon_aligntyp(priest);
}

// src/priest.c mon_aligntyp() — js/monmove.js has the copy this would import;
// it is imported rather than restated so the two cannot drift.
import { mon_aligntyp } from './monmove.js';

/* js/monmove.js needs p_coaligned but cannot import this module without
   closing a cycle; publish it on the shared game object instead. */
game.p_coaligned = p_coaligned;
