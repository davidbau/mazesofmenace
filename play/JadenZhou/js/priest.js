// priest.js -- temple priests.
// C ref: priest.c -- priestini(), p_coaligned(), mon_aligntyp().
//
// Ported so far: what mktemple() needs at level creation. Priest movement
// (pri_move), temple entry (intemple) and donations are not ported yet.

import { game } from './gstate.js';
import { rn2, rn1 } from './rng.js';
import { mons, PM_HIGH_CLERIC, PM_ALIGNED_CLERIC } from './monsters.js';
import { AMULET_OF_YENDOR } from './objects.js';
import {
    A_NONE, A_LAWFUL, A_CHAOTIC, A_NEUTRAL, N_DIRS, ROOMOFFSET, ALL_TRAPS,
    MM_EPRI, RLOC_NOMSG, W_ARMC, Amask2align,
} from './const.js';
import { on_level, assign_level } from './dungeon.js';
import { makemon, mongets, set_malign, m_at, MON_AT } from './makemon.js';
import { mkobj, curse, uncurse, SPBOOK_no_NOVEL } from './mkobj.js';
import { mpickobj } from './steal.js';
import { which_armor } from './worn.js';
import { mon_learns_traps } from './mondata.js';
import { rloc } from './teleport.js';
import { pm_good_location } from './sp_lev.js';

// C ref: hack.c xdir[], ydir[]; DIR_CLAMP()
const xdir = [-1, -1, 0, 1, 1, 1, 0, -1, 0, 0];
const ydir = [0, -1, -1, -1, 0, 1, 1, 1, 0, 0];
function DIR_CLAMP(dir) { return ((dir + N_DIRS) % N_DIRS); }

// C ref: priest.c mon_aligntyp()
/* get a monster's alignment type without caller needing EPRI & EMIN */
export function mon_aligntyp(mon) {
    const algn = mon.ispriest ? mon.epri.shralign
                 : mon.isminion ? mon.emin.min_align
                   : mon.data.maligntyp;

    if (algn === A_NONE)
        return A_NONE; /* negative but differs from chaotic */
    return (algn > 0) ? A_LAWFUL : (algn < 0) ? A_CHAOTIC : A_NEUTRAL;
}

// C ref: priest.c priestini()
/* exclusively for mktemple() */
export async function priestini(
    lvl,
    sroom,
    sx, sy,
    sanctum) /* is it the seat of the high priest? */
{
    let priest;
    let otmp;
    let cnt;
    let px = 0, py = 0, i;
    const si = rn2(N_DIRS);
    const prim = mons[sanctum ? PM_HIGH_CLERIC : PM_ALIGNED_CLERIC];

    for (i = 0; i < N_DIRS; i++) {
        px = sx + xdir[DIR_CLAMP(i + si)];
        py = sy + ydir[DIR_CLAMP(i + si)];
        if (pm_good_location(px, py, prim))
            break;
    }
    if (i === N_DIRS)
        px = sx, py = sy;

    if (MON_AT(px, py))
        await rloc(m_at(px, py), RLOC_NOMSG); /* insurance */

    priest = makemon(prim, px, py, MM_EPRI);
    if (priest) {
        const epri = priest.epri;
        epri.shroom = sroom.roomnoidx + ROOMOFFSET;
        epri.shralign = Amask2align(game.level.at(sx, sy).altarmask);
        epri.shrpos = { x: sx, y: sy };
        epri.shrlevel = { dnum: 0, dlevel: 0 };
        assign_level(epri.shrlevel, lvl);
        mon_learns_traps(priest, ALL_TRAPS); /* traps are known */
        priest.mpeaceful = 1;
        priest.ispriest = 1;
        priest.isminion = 0;
        priest.msleeping = 0;
        set_malign(priest); /* mpeaceful may have changed */

        /* now his/her goodies... */
        if (sanctum && epri.shralign === A_NONE
            && on_level(game.dungeon_topology.d_sanctum_level, game.u.uz)) {
            mongets(priest, AMULET_OF_YENDOR);
        }
        /* 2 to 4 spellbooks */
        for (cnt = rn1(3, 2); cnt > 0; --cnt) {
            mpickobj(priest, mkobj(SPBOOK_no_NOVEL, false));
        }
        /* robe [via makemon()] */
        if (rn2(2) && (otmp = which_armor(priest, W_ARMC)) !== null
            && otmp !== undefined) {
            if (p_coaligned(priest))
                uncurse(otmp);
            else
                curse(otmp);
        }
    }
}

// C ref: priest.c forget_temple_entry()
/* reset the move counters used to limit temple entry feedback;
   leaving the level and then returning yields a fresh start */
export function forget_temple_entry(priest) {
    const epri_p = priest.ispriest ? priest.epri : null;

    if (!epri_p) {
        console.error('impossible: attempting to manipulate shrine data for non-priest?');
        return;
    }
    epri_p.intone_time = epri_p.enter_time = epri_p.peaceful_time
        = epri_p.hostile_time = 0;
}

// C ref: priest.c p_coaligned()
export function p_coaligned(priest) {
    return (game.u.ualign.type === mon_aligntyp(priest));
}
