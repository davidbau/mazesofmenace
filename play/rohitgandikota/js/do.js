import { setuqwep, setuwep, setuswapwep, weldmsg } from './wield.js';
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
import { reset_occupations, set_move_cmd } from './cmd.js';
import { welded } from './wield.js';
import { ONAMES } from './objects_data.js';
import { encumber_msg } from './attrib.js';
import { freeinv, getobj, any_obj_ok } from './invent.js';
import { place_object } from './mkobj.js';
import { pline, newsym } from './display.js';
import { You, You_cant, Your } from './pline.js';
import { near_capacity } from './attrib.js';
import { u_locomotion } from './hack.js';
import { ECMD_OK, ECMD_TIME, ECMD_FAIL, LOST_DROPPED, GETOBJ_PROMPT, GETOBJ_ALLOWCNT, W_ARMOR, W_ACCESSORY, W_SADDLE, IS_ALTAR, UNENCUMBERED, DIR_DOWN, DIR_UP, SLT_ENCUMBER, is_pit, is_hole, u_at, OBJ_FREE, VIBRATING_SQUARE, A_DEX, BOTH_SIDES } from './const.js';
import { t_at, m_at, is_pool, is_lava } from './mon.js';
import { is_pick } from './mon.js';
import { cansee } from './vision.js';
import { OCLASSES } from './objects_data.js';
import { rn2, rnd } from './rng.js';

/* mklev() lives in js/mklev.js, which this file's callers already pull in.
   A dynamic import() here hits the same partially-initialised module the
   somexy cycle did, so it goes through a wire like everything else. */
/* var, not let: wired from cmd.js's top level, which can run before this
   body evaluates (see the add_room_fn note in js/sp_lev.js). */
var mklev_fn;
export function do_wire_mklev(fn) { mklev_fn = fn; }

/* js/dokick.js holds ship_object(), which dropx() calls. It is wired rather
   than imported: importing it here re-enters do.js during its own
   initialisation and hits the mklev_fn dead zone above. js/cmd.js does the
   wiring, as it already does for mklev and sp_lev. */
/* var, not let: same reason as mklev_fn above. */
var ship_object_fn;
export function do_wire_dokick(fn) { ship_object_fn = fn; }

function note_unported_do(what) {
    (game.unported ||= new Set()).add(what);
}

// src/do.c:162 flooreffects() — what happens to an object landing at (x,y).
// Returns true when the object is consumed (drowned, burned, plugged a pit,
// shattered), so the caller must not place it. The common case, plain floor,
// takes no arm, draws nothing, and returns false.
//
// The deep arms record, each gated on the terrain or object that would need
// it: boulder_hits_pool and the pit-plugging boulder block, lava_damage,
// water_damage, the teetering-hero tumble, glob merging, doaltarobj, and the
// 5.0 hot-ground potion shatter (level.flags.temperature > 0, Gehennom).
export async function flooreffects(obj, x, y, verb) {
    let t, res = false;

    /* C: panic("flooreffects: obj not free") */
    /* make sure things like water_damage() have no pointers to follow;
       this port's objects have no nobj/nexthere chain links to clear */
    const save_bhitpos = game.bhitpos;
    game.bhitpos = { x, y };

    if (obj.otyp === ONAMES.BOULDER && (is_pool(x, y) || is_lava(x, y))) {
        note_unported_do('flooreffects:boulder_hits_pool');
    } else if (obj.otyp === ONAMES.BOULDER && (t = t_at(x, y)) != null
               && (is_pit(t.ttyp) || is_hole(t.ttyp))) {
        /* the trapped-victim damage, the plug message and delfloortrap */
        note_unported_do('flooreffects:boulder_plug');
    } else if (is_lava(x, y)) {
        note_unported_do('flooreffects:lava_damage');
    } else if (is_pool(x, y)) {
        note_unported_do('flooreffects:water_damage');
    } else if (u_at(x, y) && (t = t_at(x, y)) != null
               && (is_pit(t.ttyp) || is_hole(t.ttyp))) {
        /* C gates on uteetering_at_seen_pit(t) || uescaped_shaft(t) */
        if (is_pit(t.ttyp)) {
            note_unported_do('flooreffects:pit_tumble_msg');
        } else if (ship_object_fn && ship_object_fn(obj, x, y, false)) {
            /* ship_object prints "the item falls through the hole" */
            res = true;
        }
    } else if (obj.globby) {
        note_unported_do('flooreffects:obj_meld');
    } else if (game.context?.mon_moving
               && IS_ALTAR(game.level.at(x, y)?.typ) && cansee(x, y)) {
        note_unported_do('flooreffects:doaltarobj');
    } else if (obj.oclass === OCLASSES.POTION_CLASS
               && (game.level?.flags?.temperature ?? 0) > 0) {
        note_unported_do('flooreffects:hot_ground_potion');
    }

    game.bhitpos = save_bhitpos;
    return res;
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
// src/do.c:1660 doup() — the '<' command.
//
// The pit climb, stuck-steed, held-by-monster and no-return confirmation arms
// are recorded. prev_level() needs goto_level's reload path, which is not
// ported, so climbing an actual staircase records; the common
// "You can't go up here." is real.
export async function doup() {
    const stway = stairway_at(game.u.ux, game.u.uy);

    set_move_cmd(DIR_UP, 0);

    if (!stway || !stway.up) {
        await You_cant('go up here.');
        return ECMD_OK;
    }
    if (near_capacity() > SLT_ENCUMBER) {
        note_unported_do('doup:load_too_heavy');
        return ECMD_TIME;
    }
    note_unported_do('doup:prev_level');
    return ECMD_TIME;
}

export async function dodown() {
    set_move_cmd(DIR_DOWN, 0);

    let stairs_down = false, ladder_down = false;
    const stway = stairway_at(game.u.ux, game.u.uy);

    if (stway && !stway.up) {
        stairs_down = !stway.isladder;
        ladder_down = !stairs_down;
    }

    /* levitation, being stuck, u_rooted and the hider arms sit above this
       in C; none is reachable without those subsystems */
    if (!stairs_down && !ladder_down) {
        const trap = t_at(game.u.ux, game.u.uy);
        if (trap && is_pit(trap.ttyp) && trap.tseen) {
            /* C: uteetering_at_seen_pit/uescaped_shaft -> dotrap(TOOKPLUNGE) */
            note_unported_do('dodown:pit_plunge');
            return ECMD_TIME;
        } else if (!trap || !is_hole(trap.ttyp) || !trap.tseen) {
            if (game.flags.autodig && !game.context?.nopick
                && game.u.uwep && is_pick(game.u.uwep)) {
                note_unported_do('dodown:autodig');
                return ECMD_OK;
            } else {
                await You_cant(`go down here${
                    (trap && trap.ttyp === VIBRATING_SQUARE) ? ' yet' : ''}.`);
                return ECMD_OK;
            }
        }
        /* a seen hole or trapdoor: the descent needs goto_level's fall arm */
        note_unported_do('dodown:fall_through_hole');
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
    const up = (depth_do(newlevel) < depth_do(game.u.uz));

    /* src/do.c:1585 keepdogs() — adjacent followers leave the map with the
       hero BEFORE the old level is left */
    const { keepdogs, losedogs } = await import('./dog.js');
    keepdogs(false);

    game.u.uz = { dnum: newlevel.dnum, dlevel: newlevel.dlevel };
    (game.visited_ledgers ||= new Set());

    /* src/do.c:1678 — track the deepest level reached in this dungeon
       (builds_up dungeons track their SHALLOWEST dlevel instead) */
    {
        const dgn = game.dungeons?.[game.u.uz.dnum];
        const { builds_up } = await import('./dungeon.js');
        if (dgn) {
            if (!builds_up(game.u.uz)) {
                if (game.u.uz.dlevel > (dgn.dunlev_ureached ?? 0))
                    dgn.dunlev_ureached = game.u.uz.dlevel;
            } else if (!dgn.dunlev_ureached
                       || game.u.uz.dlevel < dgn.dunlev_ureached) {
                dgn.dunlev_ureached = game.u.uz.dlevel;
            }
        }
    }

    /* src/do.c:1690 — reset the default level change destination areas;
       the special level code may override these */
    game.updest = { lx: 0, ly: 0, hx: 0, hy: 0,
                    nlx: 0, nly: 0, nhx: 0, nhy: 0 };
    game.dndest = { lx: 0, ly: 0, hx: 0, hy: 0,
                    nlx: 0, nly: 0, nhx: 0, nhy: 0 };

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

    /* src/do.c:1716-1720 — do this prior to level-change pline messages:
       clear the old level's line-of-sight and POSTPONE all map flushes.
       Every pline between here and the closing flush_screen(-1) paints its
       text over the OLD level's map, which is what the recordings show
       under "You descend the stairs.--More--". */
    {
        const { vision_reset } = await import('./vision.js');
        const { flush_screen } = await import('./display.js');
        vision_reset();
        game.vision_full_recalc = 0;
        await flush_screen(-1);
    }

    if (at_stairs) {
        u_on_dnstairs();

        /* src/do.c:1774 — the arrival message. Levitation, Flying and the
           encumbered/Punished/Fumbling fall are all recorded; the ordinary
           descent is the one every recorded game takes. `at_ladder` is
           false for a staircase. */
        if (!game.u.dz) {
            ; /* stayed on same level? (no transit effects) */
        } else if (up) {
            if (game.flags?.verbose)
                await pline(`You ${u_locomotion('climb')} up the stairs.`);
        } else if (game.u.uprops?.FLYING || game.u.uprops?.LEVITATION
                   || near_capacity() > UNENCUMBERED || game.uball
                   || game.u.uprops?.FUMBLING) {
            note_unported_do('goto_level:fly_or_fall_arrival');
        } else { /* ordinary descent */
            if (game.flags?.verbose)
                await You('descend the stairs.');
        }
    } else { /* trap door or level_tele or In_endgame */
        const { u_on_rndspot } = await import('./dungeon.js');
        await u_on_rndspot(up ? 1 : 0);
    }

    /* obj_delivery() — migrating objects; none exist yet */
    losedogs();

    /* src/do.c:1826 — hero might be arriving at a spot containing a
       monster; u_collide_m moves one or the other */
    const { m_at, mnexto } = await import('./mon.js');
    const collider = m_at(game.u.ux, game.u.uy);
    if (collider)
        await u_collide_m(collider, m_at, mnexto);

    /* src/do.c:1837 — reset the screen: vision blockages for the new
       map, then a full redraw with vision recalc */
    const { vision_reset, vision_recalc } = await import('./vision.js');
    const { docrt, flush_screen } = await import('./display.js');
    vision_reset();
    game.vision_full_recalc = 1;
    vision_recalc(0);
    await docrt();
    await flush_screen(-1);
}

// src/do.c:1411 u_collide_m() — the hero and a monster landed on the same
// square: half the time the hero steps aside (enexto draw), otherwise the
// monster is moved next to the hero (mnexto draws). The fallback rloc/limbo
// arm is recorded.
async function u_collide_m(mtmp, m_at, mnexto) {
    const { enexto_core } = await import('./teleport.js');
    const { goodpos } = await import('./makemon.js');
    const { GP_CHECKSCARY } = await import('./const.js');
    const { game: g } = await import('./gstate.js');

    const cc = { x: 0, y: 0 };
    const next2u = (x, y) => {
        const dx = x - g.u.ux, dy = y - g.u.uy;
        return dx * dx + dy * dy <= 2;
    };
    if (!rn2(2)
        && (enexto_core(cc, g.u.ux, g.u.uy, g.youmonst?.data, GP_CHECKSCARY,
                        goodpos)
            || enexto_core(cc, g.u.ux, g.u.uy, g.youmonst?.data, 0, goodpos))
        && next2u(cc.x, cc.y)) {
        g.u.ux = cc.x; /* u_on_newpos */
        g.u.uy = cc.y;
    } else {
        mnexto(mtmp);
    }

    if (m_at(g.u.ux, g.u.uy))
        note_unported_do('u_collide_m:rloc_limbo');
}

/* src/dungeon.c depth() — local copy to keep this module's import graph
   acyclic (dungeon.js dynamically imports mkmaze.js which imports mklev.js
   which reaches back here through deferred_goto's users). */
function depth_do(dlev) {
    return (game.dungeons?.[dlev.dnum]?.depth_start ?? 1) + dlev.dlevel - 1;
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
export async function dropz(obj, with_impact) {
    if (obj === game.u.uwep)
        setuwep(null);          /* src/do.c:810 */
    if (obj === game.u.uquiver)
        setuqwep(null);         /* src/do.c:812 */
    if (obj === game.u.uswapwep)
        setuswapwep(null);      /* src/do.c:814 */

    if (game.u.uswallow) {
        note_unported_do('dropz:engulfer_branch');
    } else {
        if (await flooreffects(obj, game.u.ux, game.u.uy, 'drop'))
            return;
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
export async function dropy(obj) {
    await dropz(obj, false);
}

// src/do.c dropx() — take it out of inventory, then put it down.
//
// freeinv FIRST, then the placement. ship_object is the chute that swallows
// an object on a Sokoban or level-teleporter square and RETURNS EARLY, so
// nothing reaches the floor there; doaltarobj sets bknown when it lands on
// an altar.
export async function dropx(obj) {
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
    await dropy(obj);
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
export async function drop(obj) {
    if (!obj)
        return ECMD_FAIL;
    if (!canletgo(obj, 'drop'))
        return ECMD_FAIL;
    if (obj.otyp === ONAMES.CORPSE
        && note_unported_do('drop:better_not_try_to_drop_that'))
        return ECMD_FAIL;
    if (obj === game.u.uwep) {
        if (welded(game.u.uwep)) {
            await weldmsg(obj);
            return ECMD_FAIL;
        }
        setuwep(null);          /* src/do.c:727 */
    }
    if (obj === game.u.uquiver)
        setuqwep(null);
    if (obj === game.u.uswapwep)
        setuswapwep(null);

    if (game.u.uswallow) {
        note_unported_do('drop:engulfed_branch');
    } else {
        note_unported_do('drop:levitation_and_message');
    }
    obj.how_lost = LOST_DROPPED;
    await dropx(obj);
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
    const result = await drop(await getobj('drop', any_obj_ok,
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

// src/do.c:2325 cmd_safety_prevention() — refuse a no-op command next to a
// spottable hostile (flags.safe_wait defaults On).
async function cmd_safety_prevention(ucverb, cmddesc, act) {
    if ((game.flags?.safe_wait ?? true) && !game.iflags_menu_requested
        && !(game.multi ?? 0)) {
        const { monster_nearby } = await import('./hack.js');
        /* iflags.cmdassist defaults On, so the hint suffix always prints */
        const buf = `  Use 'm' prefix to force ${cmddesc}.`;
        if (monster_nearby()) {
            await pline(`${act}${buf}`);
            return true;
        }
        /* danger_uprops(): Stoned/Slimed/Strangled/Sick — none tracked */
    }
    return false;
}

// src/do.c:2350 donull() — the '.' command: do nothing == rest.
export async function donull() {
    if (await cmd_safety_prevention('Waiting', 'a no-op (to rest)',
                                    'Are you waiting to get hit?'))
        return ECMD_OK;
    return ECMD_TIME; /* Do nothing, but let other things happen */
}


// src/do.c:2426 set_wounded_legs() — wound the hero's leg(s): one temporary
// Dex point the first time, a recovery timer (kept at the max of old and
// new), and which side, tracked with the worn-ring bits.
export async function set_wounded_legs(side, timex) {
    game.disp ||= {};
    game.disp.botl = true;
    const intr = (game.u.intrinsic ||= {});
    const wounded = (intr.HWounded_legs || 0) > 0 || (game.u.EWounded_legs || 0);
    if (!wounded)
        game.u.atemp.a[A_DEX]--;

    if (!wounded || (intr.HWounded_legs || 0) < timex)
        intr.HWounded_legs = timex;
    game.u.EWounded_legs = (game.u.EWounded_legs || 0) | side;
    await encumber_msg();   /* the Dex loss shifts carrying capacity */
}

// src/do.c:2449 heal_legs() — 0: ordinary, 1: dismounting, 2: petrifying.
export async function heal_legs(how) {
    const intr = game.u.intrinsic || {};
    const wounded = (intr.HWounded_legs || 0) > 0 || (game.u.EWounded_legs || 0);
    if (wounded) {
        game.disp ||= {};
        game.disp.botl = true;
        if (game.u.atemp.a[A_DEX] < 0)
            game.u.atemp.a[A_DEX]++;

        if (!game.u.usteed && how !== 2) {
            const both = (game.u.EWounded_legs & BOTH_SIDES) === BOTH_SIDES;
            const legs = both ? 'legs' : 'leg';
            await Your(`${legs} ${both ? 'feel' : 'feels'} better.`);
        }

        intr.HWounded_legs = 0;
        game.u.EWounded_legs = 0;

        if (how === 0)
            await encumber_msg();
    }
}
