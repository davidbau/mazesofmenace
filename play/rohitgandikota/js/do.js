import { VIBRATING_SQUARE } from './const.js';
import { You_cant } from './pline.js';
import { OCLASSES } from './objects_data.js';
import { IS_SINK } from './const.js';
import { can_reach_floor } from './engrave.js';
import { is_lava } from './mon.js';
import { is_pool } from './mon.js';
import { t_at } from './mon.js';
import { setuqwep } from './wield.js';
import { impact_disturbs_zombies } from './hack.js';
import { stackobj } from './invent.js';
// do.js — commands that move the hero between levels, and the level change
// itself.
// C ref: src/do.c
//
// Seven of the 44 public sessions have their FIRST divergence inside mklev()
// because C descends a staircase and this port does not. getbones() is simply
// the first draw the new level makes; the missing piece is everything above it.

import { game } from './gstate.js';
import { reset_occupations } from './cmd.js';
import { welded } from './wield.js';
import { ONAMES } from './objects_data.js';
import { encumber_msg } from './attrib.js';
import { freeinv, getobj, any_obj_ok } from './invent.js';
import { place_object } from './mkobj.js';
import { pline, newsym } from './display.js';
import { ECMD_OK, ECMD_TIME, ECMD_FAIL, LOST_DROPPED, GETOBJ_PROMPT, GETOBJ_ALLOWCNT, W_ARMOR, W_ACCESSORY, W_SADDLE, IS_ALTAR } from './const.js';
import { rn2, rnd } from './rng.js';

/* mklev() lives in js/mklev.js, which this file's callers already pull in.
   A dynamic import() here hits the same partially-initialised module the
   somexy cycle did, so it goes through a wire like everything else. */
let mklev_fn = null;
export function do_wire_mklev(fn) { mklev_fn = fn; }

/* js/dokick.js holds ship_object(), which dropx() calls. It is wired rather
   than imported: importing it here re-enters do.js during its own
   initialisation and hits the mklev_fn dead zone above. js/cmd.js does the
   wiring, as it already does for mklev and sp_lev. */
let ship_object_fn = null;
export function do_wire_dokick(fn) { ship_object_fn = fn; }

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
        /* src/do.c dodown() — the levitation, stuck, u_rooted, trapdoor and
           hole arms all sit above this and need subsystems that are absent;
           each records. What C actually does when none of them applies is
           print "You can't go down here." and spend no turn.
           The " yet" suffix is for the vibrating square. */
        const trap = t_at(game.u.ux, game.u.uy);
        if (game.flags?.autodig && !game.context?.nopick && game.u.uwep)
            note_unported_do('dodown:autodig');
        await You_cant('go down here'
                       + ((trap && trap.ttyp === VIBRATING_SQUARE) ? ' yet' : '')
                       + '.');
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

// include/you.h:354 enum utotypes
export const UTOTYPE_NONE = 0x00;
export const UTOTYPE_ATSTAIRS = 0x01;
export const UTOTYPE_FALLING = 0x02;
export const UTOTYPE_PORTAL = 0x04;
export const UTOTYPE_RMPORTAL = 0x10;
export const UTOTYPE_DEFERRED = 0x20;

// src/do.c schedule_goto() — arrange to change level at the END of this turn.
//
// The level change is DEFERRED rather than immediate: the command that asks
// for it finishes first, and moveloop_core acts on u.utotype after rhack()
// returns. UTOTYPE_DEFERRED is always ORed in so that UTOTYPE_NONE, which is
// zero, still leaves a non-zero value for that test to see.
export function schedule_goto(tolev, utotype_flags, pre_msg, post_msg) {
    game.u.utotype = utotype_flags | UTOTYPE_DEFERRED;
    game.u.utolev = { dnum: tolev.dnum, dlevel: tolev.dlevel };

    if (pre_msg) game.dfr_pre_msg = pre_msg;
    if (post_msg) game.dfr_post_msg = post_msg;
}

// src/do.c deferred_goto() — carry out a scheduled level change.
export async function deferred_goto() {
    const uz = game.u.uz, to = game.u.utolev;

    if (!(uz.dnum === to.dnum && uz.dlevel === to.dlevel)) {
        const typmask = game.u.utotype;   /* goto_level zeroes it */
        const dest = { dnum: to.dnum, dlevel: to.dlevel };
        const oldlev = { dnum: uz.dnum, dlevel: uz.dlevel };

        if (game.dfr_pre_msg)
            await pline(game.dfr_pre_msg);

        await goto_level(dest, !!(typmask & UTOTYPE_ATSTAIRS),
                         !!(typmask & UTOTYPE_FALLING),
                         !!(typmask & UTOTYPE_PORTAL));

        if (typmask & UTOTYPE_RMPORTAL)
            note_unported_do('deferred_goto:remove portal');

        if (game.dfr_post_msg
            && !(game.u.uz.dnum === oldlev.dnum
                 && game.u.uz.dlevel === oldlev.dlevel))
            await pline(game.dfr_post_msg);
    }

    game.u.utotype = UTOTYPE_NONE;      /* the caller keys off this */
    game.dfr_pre_msg = null;
    game.dfr_post_msg = null;
}

// src/do.c dropz() — put the object on the floor (or into the engulfer).
//
// The three wielded-slot clears come FIRST: an object being dropped must stop
// being the weapon, quiver or offhand before it leaves inventory, or those
// pointers dangle.
//
// flooreffects RETURNS EARLY when the object is destroyed on landing -- water,
// lava, a trapdoor -- so place_object is skipped entirely in that case. Calling
// place_object unconditionally would leave a destroyed object on the map.
//
// encumber_msg() runs at the very end and OUTSIDE the swallow branch, so
// dropping while engulfed still reports the weight change.
//
// The engulfer branch, flooreffects, container impact, zombie disturbance,
// ball dropping, shop selling, stackobj and the blind-levitation map_object
// are recorded.
export function dropz(obj, with_impact) {
    if (obj === game.u.uwep)
        note_unported_do('dropz:setuwep');
    if (obj === game.uquiver)
        setuqwep(null);         /* src/do.c -- ported at wield.js:113 */
    if (obj === game.uswapwep)
        note_unported_do('dropz:setuswapwep');

    if (game.u.uswallow) {
        note_unported_do('dropz:engulfer_branch');
    } else {
        /* src/do.c flooreffects() — returns TRUE when the object did NOT
           come to rest on the floor: a boulder filling a pool or pit, or
           the object burning in lava, sinking in water, or falling into a
           hole. On ordinary dry floor with no trap it returns FALSE and the
           caller places the object, which is what happens here.

           Recording unconditionally claimed a gap on every drop; it now
           fires only where C could actually answer TRUE. */
        {
            const t = t_at(game.u.ux, game.u.uy);
            if (obj.otyp === ONAMES.BOULDER || t
                || is_pool(game.u.ux, game.u.uy)
                || is_lava(game.u.ux, game.u.uy)) {
                if (note_unported_do('dropz:flooreffects'))
                    return;
            }
        }
        place_object(obj, game.u.ux, game.u.uy);
        if (with_impact)
            note_unported_do('dropz:container_impact_dmg');
        impact_disturbs_zombies(obj, with_impact);
        if (obj === game.uball)
            note_unported_do('dropz:drop_ball');
        else if (game.level?.flags?.has_shop)
            note_unported_do('dropz:sellobj');
        stackobj(obj);
        newsym(game.u.ux, game.u.uy);   /* remap location under self */
    }
    encumber_msg();
}

// src/do.c dropy() — dropz with no impact.
export function dropy(obj) {
    dropz(obj, false);
}

// src/do.c dropx() — take it out of inventory, then put it down.
//
// freeinv FIRST, then the placement. ship_object is the chute that swallows
// an object on a Sokoban or level-teleporter square and RETURNS EARLY, so
// nothing reaches the floor there; doaltarobj sets bknown when it lands on
// an altar.
export function dropx(obj) {
    freeinv(obj);
    if (!game.u.uswallow) {
        /* src/do.c:298 — ship_object() sends the object down a hole or
           stairs and returns TRUE when it did, in which case dropy() must
           not also place it. */
        if (ship_object_fn && ship_object_fn(obj, game.u.ux, game.u.uy, false))
            return;
        if (IS_ALTAR(game.level.at(game.u.ux, game.u.uy)?.typ))
            note_unported_do('dropx:doaltarobj');   /* sets bknown */
    }
    dropy(obj);
}

// src/do.c drop() — the guards, then dropx().
//
// Four ways to fail before anything moves: no object, canletgo says no
// (cursed-and-worn, or a container in use), a corpse better_not_try_to_drop,
// and a WELDED weapon -- which prints the weld message and fails rather than
// silently declining, so the player learns why.
//
// The wielded-slot clears happen HERE as well as in dropz. That is not
// redundant in C: drop() can return ECMD_TIME through the levitation path
// below without ever reaching dropz, and the slot still has to be cleared.
//
// how_lost = LOST_DROPPED is set immediately before dropx so the object
// records how it left inventory; bones and shop code read it.
//
// The engulfed branch, the Heart of Ahriman levitation dance (ELevitation is
// forced so hitfloor happens before float_down), doname messages, canletgo,
// welded/weldmsg and hitfloor are recorded.
export function drop(obj) {
    if (!obj)
        return ECMD_FAIL;
    if (!canletgo(obj, 'drop'))
        return ECMD_FAIL;
    if (obj.otyp === ONAMES.CORPSE
        && note_unported_do('drop:better_not_try_to_drop_that'))
        return ECMD_FAIL;
    if (obj === game.u.uwep) {
        if (welded(obj)) {
            note_unported_do('drop:weldmsg');
            return ECMD_FAIL;
        }
        note_unported_do('drop:setuwep');
    }
    if (obj === game.uquiver)
        setuqwep(null);         /* src/do.c -- ported at wield.js:113 */
    if (obj === game.uswapwep)
        note_unported_do('drop:setuswapwep');

    if (game.u.uswallow) {
        note_unported_do('drop:engulfed_branch');
    } else {
        /* src/do.c drop() — two conditional arms, neither of which fires on
           an ordinary drop:
             a RING (or meat ring) onto a SINK goes to dosinkring(), and
             !can_reach_floor(TRUE) takes the levitation path with
             finesse_ahriman/hitfloor/float_down.
           can_reach_floor is now ported and answers TRUE for a hero standing
           normally, so recording unconditionally claimed a gap on every
           single drop. */
        const sink = IS_SINK(game.level.at(game.u.ux, game.u.uy)?.typ);
        if ((obj.oclass === OCLASSES.RING_CLASS
             || obj.otyp === ONAMES.MEAT_RING) && sink) {
            note_unported_do('drop:dosinkring');
            return ECMD_TIME;
        }
        if (!can_reach_floor(true))
            note_unported_do('drop:levitation_and_message');
    }
    obj.how_lost = LOST_DROPPED;
    dropx(obj);
    return ECMD_TIME;
}

// src/do.c dodrop() — the 'd' command.
//
// sellobj_state brackets the getobj so a shop prices the item as a
// DELIBERATE sale rather than an accidental one, and is restored afterwards
// whether or not anything was dropped.
export async function dodrop() {
    if (game.u.ushops?.length)
        note_unported_do('dodrop:sellobj_state:DELIBERATE');
    const result = drop(await getobj('drop', any_obj_ok,
                                     GETOBJ_PROMPT | GETOBJ_ALLOWCNT));
    if (game.u.ushops?.length)
        note_unported_do('dodrop:sellobj_state:NORMAL');
    if (result)
        reset_occupations();

    return result;
}

// src/do.c:665 canletgo() — may this object leave the hero's hands?
//
// Five refusals, and each one's MESSAGE is suppressed when `word` is empty:
// callers that only want the yes/no answer pass "" and get it silently. That
// is why the welded arm's comment warns that bknown can become set with no
// message shown.
//
//   worn armour or accessory   you cannot drop what you are wearing
//   welded uwep                and NO weldmsg here, unlike drop()
//   cursed LOADSTONE           the classic refusal, and it set_bknown()s
//   LEASH with a monster on it tied around your hand
//   the SADDLE you are on
//
// The loadstone arm carries a getobj kludge: corpsenm holds the count the
// player asked for when a stack split was refused, is used to word the
// message, and is RESET to 0 immediately after. Preserved because a leftover
// corpsenm on a loadstone would read as a corpse type.
//
// The messages, body_part/makeplural and set_bknown are recorded; every
// refusal itself is real.
export function canletgo(obj, word) {
    if (obj.owornmask & (W_ARMOR | W_ACCESSORY)) {
        if (word) note_unported_do('canletgo:wearing_msg');
        return false;
    }
    if (obj === game.u.uwep && welded(game.u.uwep)) {
        /* no weldmsg(), so uwep bknown might become set silently */
        if (word) note_unported_do('canletgo:welded_msg');
        return false;
    }
    if (obj.otyp === ONAMES.LOADSTONE && obj.cursed) {
        if (word) {
            /* getobj ignores a count for throwing; replicate its kludge */
            if (word === 'throw' && obj.quan > 1)
                obj.corpsenm = 1;
            note_unported_do('canletgo:loadstone_msg');
        }
        obj.corpsenm = 0;               /* reset */
        note_unported_do('canletgo:set_bknown');
        return false;
    }
    if (obj.otyp === ONAMES.LEASH && obj.leashmon !== 0) {
        if (word) note_unported_do('canletgo:leash_msg');
        return false;
    }
    if (obj.owornmask & W_SADDLE) {
        if (word) note_unported_do('canletgo:saddle_msg');
        return false;
    }
    return true;
}
