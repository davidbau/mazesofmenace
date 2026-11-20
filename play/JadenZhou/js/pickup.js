// pickup.js — picking up objects.
// C ref: pickup.c
//
// Ported so far: the start of pickup(), up to autopickup's early return
// when there's nothing at the hero's spot.  autopick(), query_objlist(),
// check_here() and the rest of pickup.c are not ported yet.

import { game } from './gstate.js';
import { is_pool, is_lava } from './makemon.js';
import { engr_at } from './engrave.js';
import { near_capacity } from './hack.js';
import { You, Your, You_cant, pline } from './display.js';
import { rn2 } from './rng.js';
import { check_capacity } from './hack.js';
import { get_adjacent_loc } from './cmd.js';
import { Is_container } from './mkobj.js';
import { isok, IS_GRAVE, CONFUSION, STUNNED, ECMD_OK, ECMD_TIME } from './const.js';
import { m_at } from './makemon.js';
import { mon_nam } from './do_name.js';
import { M1_NOHANDS, M1_NOLIMBS } from './monsters.js';
import { BLINDED, HAND } from './const.js';
import { CORPSE, BAG_OF_TRICKS } from './objects.js';
import { t_at, is_pit } from './trap.js';
import { can_reach_floor } from './engrave.js';
import { freehand } from './wield.js';
import { body_part } from './insight.js';
import { the } from './iactions.js';
import { xname } from './objnam.js';
import { autokey, AUTOUNLOCK_APPLY_KEY, AUTOUNLOCK_UNTRAP,
         AUTOUNLOCK_FORCE } from './lock.js';

// C ref: display.h OBJ_AT() -> level.objects[x][y] != 0
function OBJ_AT(x, y) {
    for (const o of game.level?.objects || [])
        if (o.ox === x && o.oy === y && o.where === 'OBJ_FLOOR')
            return true;
    return false;
}

// C ref: engrave.c read_engr_at() -- only the nothing-to-read case is
// ported yet
function read_engr_at(x, y) {
    const ep = engr_at(x, y);
    if (ep && ep.engr_txt?.actual_text?.[0])
        throw new Error('read_engr_at(): reading an engraving not ported yet');
}

// C ref: pickup.c pickup()
/*
 * Pick up objects from the ground (or from a monster's inventory if
 * swallowed).  'what' > 0 means autopickup; < 0 means pick up -what
 * of something.
 */
export async function pickup(what) /* should be a long */ {
    const u = game.u;
    const autopickup = what > 0;

    /* we might have arrived here while fainted or sleeping, via
       random teleport or levitation timeout; if so, skip check_here
       and read_engr_at in addition to bypassing autopickup itself */
    if (autopickup && game.multi < 0 /* && unconscious() */)
        throw new Error('pickup(): unconscious() not ported yet');

    /* used by pickup_object() for encumbrance feedback */
    game.pickup_encumbrance = 0;

    if (!u.uswallow) {
        /* no auto-pick if no-pick move, nothing there, or in a pool */
        if (autopickup && (game.context?.nopick || !OBJ_AT(u.ux, u.uy)
                           || (is_pool(u.ux, u.uy) && !u.uinwater)
                           || is_lava(u.ux, u.uy))) {
            if (game.flags?.mention_decor)
                throw new Error('pickup(): describe_decor() not ported yet');
            read_engr_at(u.ux, u.uy);
            return 0;
        }
    }
    throw new Error('pickup(): picking up objects not ported yet');
}

// C ref: pickup.c encumber_msg()
export async function encumber_msg() {
    const newcap = near_capacity();
    const oldcap = game.oldcap || 0;

    if (oldcap < newcap) {
        switch (newcap) {
        case 1:
            await Your("movements are slowed slightly because of your load.");
            break;
        case 2:
            await You("rebalance your load.  Movement is difficult.");
            break;
        case 3:
            throw new Error('encumber_msg(): stagger() not ported yet');
        default:
            await You(`${newcap === 4 ? "can barely" : "can't even"} move a handspan with this load!`);
            break;
        }
        game.disp_botl = true;
    } else if (oldcap > newcap) {
        switch (newcap) {
        case 0:
            await Your("movements are now unencumbered.");
            break;
        case 1:
            await Your("movements are only slowed slightly by your load.");
            break;
        case 2:
            await You("rebalance your load.  Movement is still difficult.");
            break;
        case 3:
            throw new Error('encumber_msg(): stagger() not ported yet');
        }
        game.disp_botl = true;
    }

    game.oldcap = newcap;
    return newcap;
}

/* C ref: display.h level.objects[x][y] -- the pile at <x,y>, top first */
function objects_at(x, y) {
    return (game.level?.objects || []).filter(
        o => o.ox === x && o.oy === y && o.where === 'OBJ_FLOOR');
}

// C ref: pickup.c container_at() -- is there a container at x,y;
// optional: return count of containers at x,y
export function container_at(x, y, countem) {
    let container_count = 0;

    for (const cobj of objects_at(x, y)) {
        if (Is_container(cobj)) {
            container_count++;
            if (!countem)
                break;
        }
    }
    return container_count;
}

// C ref: pickup.c mon_beside()
function mon_beside(x, y) {
    for (let i = -1; i <= 1; i++)
        for (let j = -1; j <= 1; j++) {
            const nx = x + i, ny = y + j;
            if (isok(nx, ny) && m_at(nx, ny))
                return true;
        }
    return false;
}

/* C ref: you.h Confusion, Stunned */
function u_prop(p) {
    const up = game.u?.uprops?.[p];
    return !!(up?.intrinsic || up?.extrinsic);
}

// C ref: pickup.c able_to_loot()
async function able_to_loot(x, y, looting) { /* loot vs tip */
    const verb = looting ? "loot" : "tip";
    const t = t_at(x, y);

    if (!can_reach_floor(!!(t && is_pit(t.ttyp)))) {
        throw new Error('able_to_loot(): cant_reach_floor() not ported yet');
    } else if ((is_pool(x, y) && (looting || !game.u.uinwater)) || is_lava(x, y)) {
        throw new Error('able_to_loot(): looting in water/lava not ported yet');
    } else if ((game.youmonst.data.mflags1 & M1_NOLIMBS) === M1_NOLIMBS) {
        await pline(`Without limbs, you cannot ${verb} anything.`);
        return false;
    } else if (looting && !freehand()) {
        await pline(`Without a free ${body_part(HAND)}, you cannot loot anything.`);
        return false;
    }
    return true;
}

// C ref: pickup.c do_loot_cont() -- a locked container so far;
// use_container() is not ported yet
async function do_loot_cont(cobj, cindex, ccount) {
    void cindex;
    if (!cobj)
        return ECMD_OK;
    if (cobj.olocked) {
        const res = ECMD_OK;

        if (cobj.lknown)
            throw new Error('do_loot_cont(): The() not ported yet');
        else
            await pline(`Hmmm, ${the(xname(cobj))} turns out to be locked.`);
        cobj.lknown = 1;

        const autounlock = game.flags.autounlock ?? AUTOUNLOCK_APPLY_KEY;
        if (autounlock) {
            let unlocktool = null;

            game.u.dz = 0; /* might be non-zero from previous command since
                            * #loot isn't a move command; pick_lock() cares */
            if (((autounlock & AUTOUNLOCK_APPLY_KEY) !== 0
                 && (unlocktool = autokey(true)) !== null)
                || (autounlock & AUTOUNLOCK_UNTRAP) !== 0) {
                throw new Error('do_loot_cont(): pick_lock() not ported yet');
            }
            if ((autounlock & AUTOUNLOCK_FORCE) !== 0 && ccount === 1)
                throw new Error('do_loot_cont(): u_have_forceable_weapon() not ported yet');
        }
        return res;
    }
    cobj.lknown = 1; /* floor container, so no need for update_inventory() */

    if (cobj.otyp === BAG_OF_TRICKS)
        throw new Error('do_loot_cont(): bag of tricks not ported yet');
    throw new Error('do_loot_cont(): use_container() not ported yet');
}

// C ref: pickup.c doloot() -- the #loot command
export async function doloot() {
    let res;

    game.loot_reset_justpicked = true;
    res = await doloot_core();
    game.loot_reset_justpicked = false;
    return res;
}

// C ref: pickup.c doloot_core() -- loot a container on the floor or loot
// saddle from mon; looting containers (able_to_loot(), do_loot_cont())
// and monsters (loot_mon()) are not ported yet
async function doloot_core() {
    let c = -1;
    let timepassed = 0;
    const cc = { x: 0, y: 0 };
    let underfoot = true;
    const dont_find_anything = "don't find anything";
    let mtmp;
    const prev_inquiry = 0;
    const prev_loot = false;
    let num_conts = 0;

    game.abort_looting = false;

    if (await check_capacity(null)) {
        /* "Can't do that while carrying so much stuff." */
        return ECMD_OK;
    }
    if (game.youmonst.data.mflags1 & M1_NOHANDS) {
        await You("have no hands!"); /* not `body_part(HAND)' */
        return ECMD_OK;
    }
    if (u_prop(CONFUSION)) {
        if (rn2(6))
            throw new Error('doloot_core(): reverse_loot() not ported yet');
        if (rn2(2)) {
            await pline("Being confused, you find nothing to loot.");
            return ECMD_TIME; /* costs a turn */
        } /* else fallthrough to normal looting */
    }
    cc.x = game.u.ux;
    cc.y = game.u.uy;

    let goto_lootmon = !!game.iflags?.menu_requested;
    for (;;) {
        if (!goto_lootmon) {
            /* lootcont: */
            if ((num_conts = container_at(cc.x, cc.y, true)) > 0) {
                let anyfound = false;

                if (!(await able_to_loot(cc.x, cc.y, true)))
                    return ECMD_OK;

                if (u_prop(BLINDED) && !game.uarmg
                    && objects_at(cc.x, cc.y).some(o => o.otyp === CORPSE))
                    throw new Error('doloot_core(): will_feel_cockatrice() not ported yet');

                if (num_conts > 1) {
                    throw new Error('doloot_core(): "Loot which containers?" menu not ported yet');
                } else {
                    for (const cobj of objects_at(cc.x, cc.y)) {
                        if (Is_container(cobj)) {
                            anyfound = true;
                            timepassed |= await do_loot_cont(cobj, 1, 1);
                            if (game.abort_looting)
                                /* chest trap or magic bag explosion or <esc> */
                                return (timepassed ? ECMD_TIME : ECMD_OK);
                        }
                    }
                    if (anyfound)
                        c = 'y';
                }
            } else if (IS_GRAVE(game.level.at(cc.x, cc.y).typ)) {
                await You("need to dig up the grave to effectively loot it...");
            }
        }
        goto_lootmon = false;

        /*
         * 3.3.1 introduced directional looting for some things.
         */
        /* lootmon: */
        if (c !== 'y' && (mon_beside(game.u.ux, game.u.uy)
                          || game.iflags?.menu_requested)) {
            const looted_mon = false;
            if (!(await get_adjacent_loc("Loot in what direction?",
                                         "Invalid loot location",
                                         game.u.ux, game.u.uy, cc)))
                return ECMD_OK;
            underfoot = (cc.x === game.u.ux && cc.y === game.u.uy);
            if (underfoot && container_at(cc.x, cc.y, false))
                continue; /* goto lootcont */
            if (game.u.dz < 0)
                throw new Error('doloot_core(): ceiling() not ported yet');
            mtmp = m_at(cc.x, cc.y);
            if (mtmp)
                throw new Error('doloot_core(): loot_mon() not ported yet');
            /* always use a turn when choosing a direction is impaired,
               even if you've successfully targeted a saddled creature
               and then answered "no" to the "remove its saddle?" prompt */
            if (u_prop(CONFUSION) || u_prop(STUNNED))
                timepassed = 1;

            /* Preserve pre-3.3.1 behavior for containers.
             * Adjust this if-block to allow container looting
             * from one square away to change that in the future.
             */
            if (!looted_mon) {
                if (!underfoot && container_at(cc.x, cc.y, false)) {
                    if (mtmp) {
                        await You_cant(`loot anything ${prev_inquiry ? "else " : ""}there with ${mon_nam(mtmp)} in the way.`);
                        return (timepassed ? ECMD_TIME : ECMD_OK);
                    } else {
                        await You("have to be at a container to loot it.");
                    }
                } else {
                    await You(`${dont_find_anything} ${(prev_inquiry || prev_loot) ? "else " : ""}${!underfoot ? "t" : ""}here to loot.`);
                    return (timepassed ? ECMD_TIME : ECMD_OK);
                }
            }
        } else if (c !== 'y' && c !== 'n') {
            await You(`${dont_find_anything} ${underfoot ? "here" : "there"} to loot.`);
        }
        void num_conts;
        return (timepassed ? ECMD_TIME : ECMD_OK);
    }
}
