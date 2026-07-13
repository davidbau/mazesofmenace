// pickup.js — Floor look / autopickup / manual `,` pickup.
// C ref: pickup.c — check_here(), pickup(), pickup_object(), pick_obj();
//        hack.c — spoteffects(), dopickup(), pickup_checks().

import { game } from './gstate.js';
import {
    objects_at, obj_extract_self, splitobj,
} from './mkobj.js';
import { look_here, observe_object } from './invent.js';
import { nomul } from './hack.js';
import { flush_screen, pline, newsym } from './display.js';
import { addinv } from './u_init.js';
import { xprname } from './objnam.js';
import { can_reach_floor } from './engrave.js';
import {
    ECMD_OK, ECMD_TIME, OBJ_FLOOR,
} from './const.js';

/**
 * C ref: pickup.c check_here — count floor objects and look_here / engr.
 * Named omissions: flags.mention_decor → describe_decor / LOOKHERE_SKIP_DFEATURE;
 * uchain skip.
 */
export async function check_here(picked_some) {
    const u = game.u;
    if (!u) return;

    let ct = 0;
    for (let obj = objects_at(u.ux, u.uy); obj; obj = obj.nexthere) {
        // C: if (obj != uchain) ct++;
        ct++;
    }

    let lhflags = picked_some ? 0x1 : 0; // LOOKHERE_PICKED_SOME
    // mention_decor / describe_decor → LOOKHERE_SKIP_DFEATURE deferred

    if (ct) {
        if (game.context?.run) nomul(0);
        await flush_screen(1);
        await look_here(ct, lhflags);
    } else {
        // C: read_engr_at(u.ux, u.uy) when no floor objects
        const { read_engr_at } = await import('./engrave.js');
        await read_engr_at(u.ux, u.uy);
    }
}

/**
 * C ref: pickup.c pick_obj — extract from floor/minvent, addinv.
 * Named omissions: shop addtobill / remote_burglary; engulfer minvent path.
 */
export async function pick_obj(otmp) {
    if (!otmp) return otmp;
    const ox = otmp.ox | 0;
    const oy = otmp.oy | 0;
    const fromfloor = otmp.where === OBJ_FLOOR;
    obj_extract_self(otmp);
    if (fromfloor) newsym(ox, oy);
    return addinv(otmp);
}

/**
 * C ref: pickup.c pickup_prinv — encumbrance-prefix prinv.
 * Overload/nearload prefix deferred; bare prinv when capacity unchanged.
 */
async function pickup_prinv(obj, count) {
    void count;
    // C: prinv(prefix, obj, count) — null prefix → "ilet - doname."
    await pline(xprname(obj, undefined, true));
}

/**
 * C ref: pickup.c pickup_object — lift one floor/minvent object into invent.
 * Branch envelope: observe_object; splitobj when count < quan; pick_obj +
 * prinv. Named omissions: uchain; engulfer worn; touch_artifact; CORPSE
 * fatal/rider; SCR_SCARE_MONSTER dust; lift_object carry_count fail;
 * LOADSTONE no-split; ghostly; gold botl.
 */
export async function pickup_object(obj, count, telekinesis) {
    if (!obj) return 0;
    void telekinesis;

    if (!game.u?.Blind) observe_object(obj);

    let quan = count > 0 ? count : (obj.quan || 1);
    if (quan > (obj.quan || 1)) quan = obj.quan || 1;

    // lift_object carry_count deferred — always liftable for now
    // C: LOADSTONE never splits (named omission: always allow split here;
    // AUTOSELECT full-quan path never hits this branch)
    if (quan > 0 && quan < (obj.quan || 1)) {
        obj = splitobj(obj, quan);
    }

    obj = await pick_obj(obj);
    await pickup_prinv(obj, quan);
    return 1;
}

/**
 * C ref: pickup.c pickup(what).
 * Ported envelope: autopickup && !flags.pickup → check_here(FALSE);
 * manual `,` with non-traditional menu + AUTOSELECT_SINGLE: one floor
 * object → pickup_object without prompt (returns n_tried>0 → time).
 * Deferred: unconscious skip, pool/lava/reach gates beyond can_reach_floor,
 * notake, run-stop before autopick, autopick()/query_objlist multi,
 * traditional yn/query_classes, hideunder, newsym_force.
 */
export async function pickup(what) {
    const autopickup = what > 0;
    const count = what < 0 ? -what : 0;

    // C: autopickup && !flags.pickup → check_here(FALSE); return 0
    if (autopickup && !game.flags?.pickup) {
        const u = game.u;
        if (u && objects_at(u.ux, u.uy)
            && game.context?.run && game.context.run !== 8
            && !game.context?.nopick) {
            nomul(0);
        }
        await check_here(false);
        return 0;
    }

    const u = game.u;
    if (!u) return 0;

    if (!can_reach_floor(true)) {
        // C: describe_decor / read_engr_at arms deferred
        return 0;
    }

    let ct = 0;
    let first = null;
    for (let obj = objects_at(u.ux, u.uy); obj; obj = obj.nexthere) {
        ct++;
        if (!first) first = obj;
    }
    if (ct === 0) return 0;

    // C: menu_style != TRADITIONAL → query_objlist + AUTOSELECT_SINGLE
    // One eligible object: auto-select without menu (no extra keys).
    if (ct === 1) {
        const lcount = count > 0
            ? Math.min(first.quan || 1, count)
            : 0;
        const res = await pickup_object(first, lcount, false);
        return res > 0 ? 1 : 0; // n_tried > 0
    }

    // Multi-object query_objlist / traditional path deferred
    await pline('There are several objects here.');
    return 0;
}

/**
 * C ref: hack.c pickup_checks — preflight for #pickup / `,`.
 * Returns >=0 → dopickup done (1=TIME, 0=OK); -1 → normal pickup;
 * -2 engulfer loot deferred as 0.
 * Named omissions: pool/lava dive plines; furniture-specific nothing msgs
 * (generic "nothing here" used); engulfer tongue/loot_mon.
 */
function pickup_checks() {
    const u = game.u;
    if (!u) return 0;

    if (u.uswallow) {
        // loot_mon / tongue paths deferred
        return 0;
    }
    if (!objects_at(u.ux, u.uy)) return 0; // nothing / furniture → ECMD_OK
    if (!can_reach_floor(true)) return 0;
    return -1;
}

/**
 * C ref: hack.c dopickup — `#pickup` / `,` command.
 * Clears multi + command_count; pickup_checks then pickup(-count).
 */
export async function dopickup() {
    const count = (game.context?.command_count | 0);
    if (game.context) game.context.command_count = 0;
    game.multi = 0;

    const ret = pickup_checks();
    if (ret >= 0) {
        if (ret === 0 && !objects_at(game.u?.ux, game.u?.uy)) {
            await pline('There is nothing here to pick up.');
        }
        return ret ? ECMD_TIME : ECMD_OK;
    }
    // ret == -1: normal floor pickup
    const tried = await pickup(-count);
    return tried ? ECMD_TIME : ECMD_OK;
}

/**
 * C ref: hack.c spoteffects(pick).
 * Ported envelope: pick → pickup(1). Deferred: recursion guards, pool,
 * special room, sink fall, levitation timeout, pit/trap order, Warning ice,
 * hidden monster surprise.
 */
export async function spoteffects(pick) {
    if (pick) await pickup(1);
}
