// bones.js — bones files.
// C ref: src/bones.c
//
// The bones FILE itself (open/save/compression) is not modelled; what this
// port carries is the part the terminal shows and the RNG feels: whether
// bones are possible at all (can_make_bones draws), the inventory drop with
// its per-item curse and scatter rolls, and the ghost left behind.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { depth } from './dungeon.js';
import { isok } from './hacklib.js';
import { m_at } from './mon.js';
import { obj_extract_self } from './invent.js';
import { curse, place_object } from './mkobj.js';
import { MAGIC_PORTAL } from './const.js';
import { PMNAMES, MMFLAGS } from './monst_data.js';

function note_unported_bones(what) {
    (game.unported ||= new Set()).add('bones:' + what);
}

// src/bones.c:356 can_make_bones()
export function can_make_bones() {
    if (!(game.flags?.bones ?? true))
        return false;
    /* ledger_no bounds always hold for a real dungeon level here */
    if (no_bones_level(game.u.uz))
        return false;
    if (game.u.uswallow)
        return false;
    if (!Is_branchlev_bones(game.u.uz)) {
        /* no bones on non-branches with portals */
        for (const t of game.level?.traps || [])
            if (t.ttyp === MAGIC_PORTAL)
                return false;
    }
    if (depth(game.u.uz) <= 0
        || (!rn2(1 + (depth(game.u.uz) >> 2)) /* fewer ghosts on low levels */
            && !game.wizard))
        return false;
    if (game.discover)
        return false;
    return true;
}

/* src/dungeon.c Is_branchlev() — a branch has an end on this level. */
function Is_branchlev_bones(lev) {
    for (const br of (game.branches || [])) {
        if ((br.end1.dnum === lev.dnum && br.end1.dlevel === lev.dlevel)
            || (br.end2.dnum === lev.dnum && br.end2.dlevel === lev.dlevel))
            return br;
    }
    return null;
}

// src/dungeon.c no_bones_level() — special levels that ban bones.
function no_bones_level(lev) {
    const sl = game.special_levels || {};
    const on = (l) => l && lev.dnum === l.dnum && lev.dlevel === l.dlevel;
    /* C checks: sstairs level, dungeon flags.no_bones (Vlad's, endgame),
       oracle, Sokoban gift level, Knox, quest start */
    return on(sl.oracle_level) || on(sl.knox_level) || on(sl.qstart_level);
}

// src/bones.c:226 give_to_nearby_mon() — hand a dropped item to a random
// adjacent item-liking monster, if any can carry it.
function give_to_nearby_mon(otmp, x, y) {
    let selected = null, nmon = 0;
    for (let xx = x - 1; xx <= x + 1; ++xx) {
        for (let yy = y - 1; yy <= y + 1; ++yy) {
            if (!isok(xx, yy)) continue;
            if (xx === game.u.ux && yy === game.u.uy) continue;
            const mtmp = m_at(xx, yy);
            if (!mtmp) continue;
            const md = game.mons[mtmp.mnum];
            if (!likes_stuff(md)) continue;
            nmon++;
            if (!rn2(nmon))
                selected = mtmp;
        }
    }
    if (selected) {
        /* can_carry then add_to_minv; weight capacity for a scavenger next
           to a fresh corpse virtually always holds */
        note_unported_bones('give_to_nearby_mon:can_carry');
        (selected.minvent ||= []).push(otmp);
        otmp.where = 4; /* OBJ_MINVENT */
        otmp.ocarry = selected;
    } else {
        place_object(otmp, x, y);
    }
}

/* include/mondata.h likes_gold/gems/objs/magic — monflag.h M2_ bits */
function likes_stuff(md) {
    const M2_GREEDY = 0x10000000, M2_JEWELS = 0x20000000,
          M2_COLLECT = 0x40000000, M2_MAGIC = 0x80000000;
    return !!((md.mflags2 ?? md.flags2 ?? 0) & (M2_GREEDY | M2_JEWELS | M2_COLLECT | M2_MAGIC));
}

// src/bones.c:264 drop_upon_death() — all inventory is dropped, usually
// cursed; each item draws rn2(5) for the curse and, with no receiving
// monster or container, rn2(8) for the nearby-scavenger chance.
export function drop_upon_death(mtmp, cont, x, y) {
    let otmp;
    while ((otmp = (game.invent || [])[0]) != null) {
        obj_extract_self(otmp);
        /* obj_no_longer_held / lamp snuffing: no burning gear modelled */
        otmp.owornmask = 0;

        if (rn2(5))
            curse(otmp);
        if (mtmp) {
            (mtmp.minvent ||= []).push(otmp);
            otmp.where = 4; /* OBJ_MINVENT */
            otmp.ocarry = mtmp;
        } else if (cont) {
            (cont.cobj ||= []).push(otmp);
            otmp.where = 2; /* OBJ_CONTAINED */
            otmp.ocontainer = cont;
        } else if (!rn2(8)) {
            give_to_nearby_mon(otmp, x, y);
        } else {
            place_object(otmp, x, y);
        }
    }
}

// src/bones.c:403 savebones() — the make_bones arm. The bones file write is
// not modelled; the level-state effects (inventory dropped, the sleeping
// ghost with the hero's name) are.
export async function savebones(how, corpse) {
    const u = game.u;

    /* open_bonesfile(): none exists in this tree, straight to make_bones */

    /* unleash_all / unpunish / dismount: none modelled for these heroes */
    /* remove_mon_from_bones + dmonsfree: unique-monster cleanup */
    /* forget_engravings, fruit renumbering: bones-file state only */

    if (u.ugrave_arise == null || u.ugrave_arise < 0) {
        /* drop everything, then leave a ghost */
        drop_upon_death(null, null, u.ux, u.uy);
        const { makemon } = await import('./makemon.js');
        game.in_mklev = true; /* allow creation on the hero's square */
        const mtmp = await makemon(game.mons[PMNAMES.PM_GHOST], u.ux, u.uy,
                                   MMFLAGS.MM_NONAME);
        game.in_mklev = false;
        if (!mtmp)
            return;
        mtmp.mname = game.plname; /* christen_monst */
        if (corpse)
            note_unported_bones('savebones:obj_attach_mid');

        mtmp.m_lev = u.ulevel ? u.ulevel : 1;
        mtmp.mhp = mtmp.mhpmax = u.uhpmax;
        mtmp.female = game.flags?.female ? 1 : 0;
        mtmp.msleeping = 1;
    } else {
        note_unported_bones(`savebones:ugrave_arise=${u.ugrave_arise}`);
    }

    /* resetobjs + the actual write + newbones cemetery record: file-level
       state the next getbones would read; recorded */
    note_unported_bones('savebones:bones file write');
}
