// priest.js — temple priests.
// C ref: src/priest.c
//
// Only priestini() is here: the shrine priest created at altar creation.
// Priest movement, chat and donations are recorded when reached.

import { game } from './gstate.js';
import { rn2, rn1 } from './rng.js';
import { makemon, mpickobj } from './makemon.js';
import { mkobj, curse, SPBOOK_no_NOVEL } from './mkobj.js';
import { pm_good_location } from './sp_lev.js';
import { PMNAMES, MMFLAGS } from './monst_data.js';
import { ROOMOFFSET, W_ARMC } from './const.js';

const xdir = [-1, -1, 0, 1, 1, 1, 0, -1];
const ydir = [0, -1, -1, -1, 0, 1, 1, 1];

function note_unported_priest(what) {
    (game.unported ||= new Set()).add('priest:' + what);
}

// src/priest.c:219 priestini() — exclusively for mktemple()/shrine altars.
export function priestini(lvl, sroom, sx, sy, sanctum) {
    const si = rn2(8);
    const prim = game.mons[sanctum ? PMNAMES.PM_HIGH_CLERIC
                                   : PMNAMES.PM_ALIGNED_CLERIC];
    let px = 0, py = 0, i;
    for (i = 0; i < 8; i++) {
        const k = (i + si) & 7;      /* DIR_CLAMP */
        px = sx + xdir[k];
        py = sy + ydir[k];
        if (pm_good_location(px, py, prim))
            break;
    }
    if (i === 8) {
        px = sx;
        py = sy;
    }

    const squatter = game.level?.monAt?.get(`${px},${py}`);
    if (squatter)
        note_unported_priest('priestini:rloc squatter');

    const priest = makemon(prim, px, py, MMFLAGS.MM_EPRI);
    if (priest) {
        priest.epri = {
            shroom: (game.level.rooms.indexOf(sroom) + ROOMOFFSET),
            shralign: Amask2align(game.level.at(sx, sy)?.altarmask ?? 0),
            shrpos: { x: sx, y: sy },
            shrlevel: { dnum: lvl.dnum, dlevel: lvl.dlevel },
        };
        priest.ispriest = 1;
        priest.isminion = 0;
        priest.mpeaceful = 1;
        priest.msleeping = 0;
        /* mon_learns_traps, set_malign: state only */

        /* now his goodies: sanctum amulet only on the sanctum level */
        if (sanctum && priest.epri.shralign === 0)
            note_unported_priest('priestini:sanctum amulet');
        /* 2 to 4 spellbooks */
        for (let cnt = rn1(3, 2); cnt > 0; --cnt)
            mpickobj(priest, mkobj(SPBOOK_no_NOVEL, false));
        /* robe [via makemon()] */
        if (rn2(2)) {
            const robe = (priest.minvent || [])
                .find(o => (o.owornmask ?? 0) & W_ARMC);
            if (robe)
                curse(robe);   /* Moloch's priest is never co-aligned */
        }
    }
}

/* include/align.h Amask2align() */
function Amask2align(amask) {
    const AM_LAWFUL = 4, AM_NEUTRAL = 2, AM_CHAOTIC = 1;
    return (amask & AM_LAWFUL) ? 1 : (amask & AM_NEUTRAL) ? 0
         : (amask & AM_CHAOTIC) ? -1 : 0 /* A_NONE-ish */;
}
