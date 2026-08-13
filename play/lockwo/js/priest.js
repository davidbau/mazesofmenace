// priest.js — temple priest creation.
// C ref: priest.c priestini().
//
// Only the level-generation entry point is ported: priestini() is called from
// mkroom.c mktemple() and from sp_lev.c create_altar() (des.altar with
// type="shrine"/"sanctum"), and it is the sole RNG consumer of the temple fill.

import { game } from './gstate.js';
import { rn2, rn1 } from './rng.js';
import { isok, ROOMOFFSET, Amask2align, A_NONE, MM_EPRI } from './const.js';
import { mkobj, SPBOOK_no_NOVEL, curse, uncurse,
         AMULET_OF_YENDOR } from './mkobj.js';
import { makemon, monster_by_pmidx, name_to_pmidx,
         mongets_pub, mpickobj } from './makemon.js';
import { is_ok_location, pm_to_humidity } from './sp_lev.js';

// C ref: decl.c xdir[]/ydir[] and hack.h N_DIRS / DIR_CLAMP.  N_DIRS is 8 (the
// eight compass directions; N_DIRS_Z adds up/down which priestini never uses).
const N_DIRS = 8;
const xdir = [-1, -1, 0, 1, 1, 1, 0, -1];
const ydir = [0, -1, -1, -1, 0, 1, 1, 1];
const DIR_CLAMP = (dir) => ((dir + N_DIRS) % N_DIRS);

// C ref: sp_lev.c pm_good_location() — is_ok_location() with the species'
// own humidity requirements.  No RNG.
function pm_good_location(x, y, pm) {
    if (!isok(x, y)) return false;
    return is_ok_location(x, y, pm_to_humidity(pm));
}

// C ref: rm.h MON_AT / mon.c m_at.
function m_at(x, y) {
    for (const m of game.level?.monsters || [])
        if (m.mx === x && m.my === y && (m.mhp == null || m.mhp > 0)) return m;
    return null;
}

// C ref: mon.c p_coaligned() — the priest's shrine alignment matches the
// hero's.  No RNG.
export function p_coaligned(priest) {
    const ualign = game.u?.ualign?.type ?? A_NONE;
    return (priest?.epri?.shralign ?? A_NONE) === ualign;
}

// C ref: worn.c which_armor(mon, W_ARMC) — the cloak slot.  m_initinv gives an
// aligned cleric a robe and worn.c m_dowear puts it on, so the slot is filled by
// the ROBE when one was generated.  No RNG.
const ROBE = 143;
function which_cloak(mtmp) {
    for (const o of mtmp?.minvent || [])
        if (o && o.otyp === ROBE) return o;
    return null;
}

// C ref: priest.c priestini(lvl, sroom, sx, sy, sanctum) — "exclusively for
// mktemple()" (and sp_lev.c's create_altar shrine case).  Places the temple
// priest next to the shrine and hands out its goodies.
//
// RNG, in order: rn2(N_DIRS) for the direction scan start; makemon() for the
// cleric itself; rn1(3, 2) spellbooks (each a full mkobj(SPBOOK_no_NOVEL));
// and a final rn2(2) for the robe curse/uncurse — that rn2 is the LEFT operand
// of C's `rn2(2) && (otmp = which_armor(...)) != 0`, so it is always drawn.
export function priestini(lvl, sroom, sx, sy, sanctum) {
    const prim = monster_by_pmidx(
        name_to_pmidx(sanctum ? 'high cleric' : 'aligned cleric'));
    if (!prim) return null;

    let px = 0, py = 0;
    const si = rn2(N_DIRS);                       // priest.c:229
    let i;
    for (i = 0; i < N_DIRS; i++) {
        px = sx + xdir[DIR_CLAMP(i + si)];
        py = sy + ydir[DIR_CLAMP(i + si)];
        if (pm_good_location(px, py, prim)) break;
    }
    if (i === N_DIRS) { px = sx; py = sy; }

    // C: `if (MON_AT(px, py)) rloc(m_at(px, py), RLOC_NOMSG);` — insurance for
    // a monster already standing on the chosen square.  rloc() would draw, but
    // the temple is stocked before any monster is placed on a special level, so
    // this is unreachable there; leave the square to makemon's own handling
    // rather than guess at rloc's stream.
    if (m_at(px, py)) return null;

    const priest = makemon(prim, px, py, MM_EPRI);
    if (!priest) return null;

    priest.epri = priest.epri || {};
    priest.epri.shroom = (sroom?.roomnoidx ?? 0) + ROOMOFFSET;
    priest.epri.shralign = Amask2align(game.level?.at(sx, sy)?.altarmask ?? 0);
    priest.epri.shrpos = { x: sx, y: sy };
    priest.epri.shrlevel = lvl ? { dnum: lvl.dnum, dlevel: lvl.dlevel } : null;
    priest.mtrapseen = ~0;               // mon_learns_traps(priest, ALL_TRAPS)
    priest.mpeaceful = 1;
    priest.ispriest = 1;
    priest.isminion = 0;
    priest.msleeping = 0;
    // set_malign(priest) writes only mtmp->malign; no RNG.

    // C ref: priest.c:260-263 — the high priest of Moloch holds the real
    // Amulet.  mongets() -> mksobj(AMULET_OF_YENDOR, TRUE, FALSE) is three
    // draws: next_ident (mkobj.c:521), the AMULET_CLASS rn2(10) (mkobj.c:1063)
    // and blessorcurse's rn2(10) (mkobj.c:1846).
    const sl = game.sanctum_level, uz = game.u?.uz;
    if (sanctum && priest.epri.shralign === A_NONE
        && sl && uz && sl.dnum === uz.dnum && sl.dlevel === uz.dlevel)
        mongets_pub(priest, AMULET_OF_YENDOR);

    // 2 to 4 spellbooks.
    for (let cnt = rn1(3, 2); cnt > 0; --cnt)   // priest.c:265
        mpickobj(priest, mkobj(SPBOOK_no_NOVEL, false));

    // robe [via makemon()]
    if (rn2(2)) {                              // priest.c:269
        const otmp = which_cloak(priest);
        if (otmp) {
            if (p_coaligned(priest)) uncurse(otmp);
            else curse(otmp);
        }
    }
    return priest;
}
