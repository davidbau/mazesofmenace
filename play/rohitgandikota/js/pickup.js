// pickup.js — picking things up off the floor, and looking at what is there.
// C ref: src/pickup.c
//
// Only the paths a session with autopickup OFF can reach are here so far:
// stepping onto objects routes pickup(1) -> check_here() -> look_here().
// The actual pick-up machinery (query_objlist, pickup_object, autopickup
// exceptions) is absent and recorded, never faked.

import { def_oc_syms } from './drawing_data.js';
import { game } from './gstate.js';
import { addinv, prinv, obj_extract_self, inv_order, let_to_name } from './invent.js';
import { observe_object } from './o_init.js';
import { doname, xname, the } from './objnam.js';
import { Is_container } from './obj.js';
import { check_capacity } from './hack.js';
import { ECMD_OK, ECMD_TIME } from './const.js';
import { upstart } from './do_name.js';

/* src/hacklib.c The() — the() with the first letter capitalised. */
const The = (s2) => upstart(the(s2));
import { ONAMES } from './objects_data.js';
import { newsym, pline } from './display.js';
import { UNENCUMBERED } from './const.js';
import { costly_spot } from './shk.js';
import { near_capacity } from './attrib.js';
import { In_sokoban } from './dungeon.js';
import { read_engr_at } from './engrave.js';
import { rn2 } from './rng.js';
import { OBJ_AT, LOOKHERE_NOFLAGS, LOOKHERE_PICKED_SOME } from './const.js';
import { You } from './pline.js';
import { flush_screen } from './display.js';
import { look_here } from './invent.js';
import { nomul } from './hack.js';
import { t_at, is_pool, is_lava } from './mon.js';
import { unconscious } from './trap.js';
import { is_pit } from './const.js';
import { Levitation } from './youprop.js';

function note_unported_pickup(what) {
    (game.unported ||= new Set()).add(what);
}

// src/hack.c can_reach_floor() — is the floor in reach?
//
// The trap parameter widens reach inside a pit. Riding, being stuck to a
// ceiling clinger, and polyform reach limits are states that cannot occur
// yet; levitation can, via potions and rings.
export function can_reach_floor(check_pit) {
    if (game.u.uswallow)
        return false;
    if (Levitation())
        return false;
    return true;
}

// src/pickup.c:430 check_here() — look at the objects at our location.
export async function check_here(picked_some) {
    let ct = 0;
    const lhflags = picked_some ? LOOKHERE_PICKED_SOME : LOOKHERE_NOFLAGS;

    if (game.flags?.mention_decor)
        note_unported_pickup('check_here:describe_decor');

    /* count the objects here */
    for (const obj of game.level?.objects || []) {
        if (obj.ox === game.u.ux && obj.oy === game.u.uy
            && obj !== game.uchain)
            ct++;
    }

    /* If there are objects here, take a look. */
    if (ct) {
        if (game.context.run)
            nomul(0);
        await flush_screen(1);
        await look_here(ct, lhflags);
    } else {
        await read_engr_at(game.u.ux, game.u.uy);
    }
}

// src/pickup.c:475 pickup() — main pickup routine.
//
// `what` > 0 means autopickup is in progress; < 0 means "pick N"; 0 is the
// explicit ',' command. With flags.pickup off (the recorded rc default —
// optlist.h initval is Off in 5.0), an autopickup call lands in the
// check_here() arm and only looks. The true picking flows are recorded.
export async function pickup(what) {
    const autopickup = what > 0;

    /* we might have arrived here while fainted or sleeping */
    if (autopickup && game.multi < 0 && unconscious()) {
        return 0;
    }

    if (!game.u.uswallow) {
        /* no auto-pick if no-pick move, nothing there, or in a pool */
        if (autopickup && (game.context.nopick || !OBJ_AT(game.u.ux, game.u.uy)
                           || (is_pool(game.u.ux, game.u.uy) && !game.u.uinwater)
                           || is_lava(game.u.ux, game.u.uy))) {
            if (game.flags?.mention_decor)
                note_unported_pickup('pickup:describe_decor');
            await read_engr_at(game.u.ux, game.u.uy);
            return 0;
        }
        /* no pickup if levitating & not on air or water level */
        const t = t_at(game.u.ux, game.u.uy);
        if (!can_reach_floor(!!(t && is_pit(t.ttyp)))) {
            note_unported_pickup('pickup:cant_reach_floor');
            return 0;
        }
        if ((game.multi && !game.context.run)
            || (autopickup && !game.flags?.autopickup)) {
            await check_here(false);
            return 0;
        }

        /* if there's anything here, stop running */
        if (OBJ_AT(game.u.ux, game.u.uy) && game.context.run
            && game.context.run !== 8 && !game.context.nopick)
            nomul(0);
    }

    /* src/pickup.c:1085 query_objlist() — with AUTOSELECT_SINGLE set, a
       single candidate is taken WITHOUT a menu; two or more raise one. */
    let here = (game.level?.objects || [])
        .filter(o => o.ox === game.u.ux && o.oy === game.u.uy
                     && o !== game.uchain);
    /* src/pickup.c:975 autopick() — autopickup takes the eligible objects
       with no menu at all, so the class filter has to run here or every
       object on the square gets grabbed regardless of pickup_types. */
    if (autopickup)
        here = here.filter(o => autopick_testobj(o));
    if (here.length === 0)
        return 0;
    if (here.length > 1) {
        const picked = await query_objlist('Pick up what?', here);
        let n_picked = 0;
        for (const obj of picked)
            if ((await pickup_object(obj, obj.quan, false)) > 0)
                n_picked++;
        return n_picked ? 1 : 0;
    }

    return (await pickup_object(here[0], here[0].quan, false)) > 0 ? 1 : 0;
}

// src/pickup.c:930 autopick_testobj() — is this object eligible for
// autopickup? Only the pickup_types test is live: costly_spot() needs shop
// floors, and the pickup_thrown / pickup_stolen / dropped_nopick overrides
// need obj.how_lost, which nothing sets yet.
function autopick_testobj(otmp) {
    const otypes = game.flags?.pickup_types || '';

    if (otmp.how_lost)
        note_unported_pickup('autopick_testobj:how_lost');
    if (game.apelist)
        note_unported_pickup('autopick_testobj:exceptions');

    /* check for pickup_types */
    return !otypes || otypes.includes(def_oc_syms[otmp.oclass]);
}

// src/pickup.c:1025 query_objlist() — the PICK_ANY menu over a pile.
//
// C sorts the list into class order with a heading per class, exactly as the
// inventory menu does, and assigns a,b,c... down the list rather than reusing
// any inventory letter. Returns the chosen objects in menu order.
async function query_objlist(qstr, olist) {
    const { tty_create_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
            tty_display_nhwindow, tty_select_menu, tty_destroy_nhwindow,
            ATR_NONE, ATR_INVERSE, NHW_MENU } = await import('./tty/wintty.js');
    const { MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE, NO_COLOR, PICK_ANY }
        = await import('./const.js');
    const { docrt } = await import('./display.js');

    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);

    /* sortloot's class grouping: C walks flags.inv_order and emits a heading
       for each class that has anything in the pile */
    const bylet = new Map();
    let let_ = 'a';
    for (const oclass of inv_order()) {
        const items = olist.filter(o => o.oclass === oclass);
        if (!items.length)
            continue;
        tty_add_menu(win, null, 0, 0, 0, ATR_INVERSE, NO_COLOR,
                     let_to_name(oclass), MENU_ITEMFLAGS_NONE);
        for (const o of items) {
            if (!game.u?.ublind)
                observe_object(o);
            bylet.set(let_, o);
            tty_add_menu(win, null, let_.charCodeAt(0), let_, 0, ATR_NONE,
                         NO_COLOR, doname(o), MENU_ITEMFLAGS_NONE);
            let_ = String.fromCharCode(let_.charCodeAt(0) + 1);
        }
    }
    tty_end_menu(win, qstr);
    await tty_display_nhwindow(win);

    const ids = await tty_select_menu(win, PICK_ANY);
    tty_destroy_nhwindow(win);
    await docrt();

    return ids.map(id => bylet.get(String.fromCharCode(id))).filter(Boolean);
}

// src/pickup.c:1803 pickup_object() — take one object off the floor.
//
// The Sokoban boulder, loadstone, artifact-touch, cockatrice and scroll of
// scare monster arms are recorded; lift_object's encumbrance messages too.
export async function pickup_object(obj, count, telekinesis) {
    if (obj.quan < count)
        return 0;                       /* impossible() in C */

    if (obj === game.uchain)
        return 0;                       /* do not pick up attached chain */
    if (obj.oartifact || obj.otyp === ONAMES.SCR_SCARE_MONSTER
        || obj.otyp === ONAMES.LOADSTONE
        || (obj.otyp === ONAMES.BOULDER && In_sokoban(game.u.uz))) {
        note_unported_pickup('pickup_object:special_object');
        return 0;
    }
    if (obj.otyp === ONAMES.CORPSE)
        note_unported_pickup('pickup_object:corpse_checks');

    /* lift_object(obj, NULL, &count, telekinesis) — its weight arms print
       and can refuse; the plain case returns 1 */
    if (near_capacity() > UNENCUMBERED)
        note_unported_pickup('pickup_object:lift_object_encumbered');

    obj = pick_obj(obj);
    await pickup_prinv(obj, count);
    return 1;
}

// src/pickup.c:1897 pick_obj() — off the floor and into inventory.
function pick_obj(otmp) {
    const ox = otmp.ox, oy = otmp.oy;

    if (costly_spot(ox, oy))
        note_unported_pickup('pick_obj:shop');
    obj_extract_self(otmp);
    newsym(ox, oy);
    return addinv(otmp);
}

// src/pickup.c pickup_prinv() — "k - a goblin corpse."
async function pickup_prinv(obj, count) {
    await prinv(null, obj, count);
}


// src/pickup.c:2075 do_loot_cont() / loot_container() — open one container.
//
// The locked arm is what a chest the hero has not opened before hits: the
// message differs by whether its locked state was already known, and either
// way lknown becomes set. autounlock, the chest trap and use_container's
// menu are recorded.
async function do_loot_cont(cobj, ccount, ci) {
    if (!cobj)
        return false;
    if (cobj.olocked) {
        if (cobj.lknown)
            await pline(`${The(xname(cobj))} is locked.`);
        else
            await pline(`Hmmm, ${the(xname(cobj))} turns out to be locked.`);
        cobj.lknown = 1;
        if (game.flags?.autounlock)
            note_unported_pickup('do_loot_cont:autounlock');
        return false;
    }
    cobj.lknown = 1;
    note_unported_pickup('do_loot_cont:use_container');
    return false;
}

// src/pickup.c:2166 doloot() — the #loot command.
//
// Only the container-underfoot path is ported. The confused arm, the blind
// cockatrice check, the multi-container menu, grave digging and the
// directional monster-looting tail are recorded.
export async function doloot() {
    if (check_capacity(null))
        return ECMD_OK;

    if (game.u.uprops?.CONFUSION) {
        note_unported_pickup('doloot:confused');
        return ECMD_OK;
    }

    const here = (game.level?.objects || [])
        .filter(o => o.ox === game.u.ux && o.oy === game.u.uy
                     && Is_container(o));

    if (here.length > 1) {
        note_unported_pickup('doloot:multiple_containers');
        return ECMD_OK;
    }
    if (here.length === 1) {
        const timepassed = await do_loot_cont(here[0], 1, 1);
        return timepassed ? ECMD_TIME : ECMD_OK;
    }

    /* the grave arm and the directional "Loot in what direction?" tail */
    note_unported_pickup('doloot:nothing_underfoot');
    return ECMD_OK;
}
