// wizcmds.js — wizard-mode commands.
// C ref: wizcmds.c
//
// Ported so far: the #levelchange prompt (wiz_level_change()) and the ^W
// wish (wiz_wish(), zap.c makewish()); the level changes
// themselves (losexp(), pluslvl()) and most of hold_another_object()
// (merging, inventory letters, prinv()) are not ported yet.

import { game } from './gstate.js';
import { pline } from './display.js';
import { tty_getlin } from './wintty.js';
import { MAXULEV, IRONBARS, ICE, Is_airlevel, Is_waterlevel } from './const.js';
import { rn1 } from './rng.js';
import { readobjnam } from './objnam.js';
import { addinv } from './u_init.js';
import { prinv } from './invent.js';
import * as O from './objects.js';

// C ref: wizcmds.c wiz_level_change() -- #levelchange
export async function wiz_level_change() {
    const u = game.u;
    let newlevel = 0;
    let ret;

    let buf = await tty_getlin("To what experience level do you want to be set?");
    buf = buf.replace(/[ \t]+/g, ' ').trim(); /* mungspaces() */
    if (buf[0] === '\x1b' || buf === '')
        ret = 0;
    else {
        /* sscanf(buf, "%d%c", &newlevel, &dummy) */
        const m = /^([+-]?\d+)(.?)/.exec(buf);
        ret = m ? (m[2] ? 2 : 1) : 0;
        if (m) newlevel = parseInt(m[1], 10);
    }

    if (ret !== 1) {
        await pline("Never mind.");
        return 0; /* ECMD_OK */
    }
    if (newlevel === u.ulevel) {
        await pline("You are already that experienced."); /* You() */
    } else if (newlevel < u.ulevel) {
        if (u.ulevel === 1) {
            await pline("You are already as inexperienced as you can get.");
            return 0;
        }
        /* while (u.ulevel > newlevel) losexp("#levelchange");
           -- not ported yet */
        return 0;
    } else {
        if (u.ulevel >= MAXULEV) {
            await pline("You are already as experienced as you can get.");
            return 0;
        }
        /* while (u.ulevel < newlevel) pluslvl(FALSE); -- not ported yet */
        return 0;
    }
    /* blessed full healing or restore ability won't fix any lost levels */
    u.ulevelmax = u.ulevel;
    return 0; /* ECMD_OK */
}

const MAXWISHTRY = 5;
const thats_enough_tries = "That's enough tries!";

// C ref: invent.c hold_another_object() -- only the plain "add it to
// inventory" path is ported; addinv() is the simplified u_init.js one
// (no merging, no inventory letters yet)
async function hold_another_object(obj, drop_fmt, drop_arg, hold_msg) {
    /* if (!Blind) observe_object(obj) -- not ported yet */
    if (obj.oartifact)
        throw new Error('hold_another_object(): artifacts are not ported yet');
    if (game.u.Fumbling)
        throw new Error('hold_another_object(): Fumbling is not ported yet');
    if (obj.otyp === O.CORPSE && obj.wishedfor)
        throw new Error('hold_another_object(): wished-for corpse is not ported yet');
    /* prev_encumbr = near_capacity() ...; inv_cnt()/near_capacity() drop
       check -- not ported yet */
    const oquan = obj.quan;
    obj = addinv(obj); /* addinv_core0(obj, NULL, FALSE) */
    /* if (flags.autoquiver && !uquiver && !obj->owornmask
           && (is_missile(obj) || ammo_and_launcher(obj, uwep)
               || ammo_and_launcher(obj, uswapwep)))
           setuqwep(obj); -- not ported yet */
    if (hold_msg || drop_fmt)
        await prinv(hold_msg, obj, oquan);
    /* update_inventory(); encumber_msg() -- not ported yet */
    void drop_arg;
    return obj;
}

// C ref: zap.c makewish()
async function makewish() {
    const g = game;
    const u = g.u;
    let buf;
    let tries = 0;
    let otmp;
    const nothing = {}; /* only its address matters */
    const oldwisharti = u.uconduct.wisharti || 0;

    g.context.resume_wish = 0;
    if (g.flags.verbose)
        await pline("You may wish for an object."); /* You() */
    for (;;) { /* retry: */
        let promptbuf = "For what do you wish";
        if (g.iflags.cmdassist !== false && tries > 0)
            promptbuf += " (enter 'help' for assistance)";
        promptbuf += "?";

        /* iflags.menu_requested && wish_history[0]: wish_history_menu()
           -- not ported yet */
        buf = await tty_getlin(promptbuf);

        buf = buf.replace(/[ \t]+/g, ' ').trim(); /* mungspaces() */
        if (buf[0] === '\x1b') {
            buf = '';
        } else if (buf.toLowerCase() === "help") {
            throw new Error('wishcmdassist() is not ported yet');
        }
        const bufcpy = buf;
        otmp = readobjnam(buf, nothing);
        if (!otmp) {
            await pline("Nothing fitting that description exists in the game.");
            if (++tries < MAXWISHTRY)
                continue;
            await pline(thats_enough_tries);
            otmp = readobjnam(null, null);
            if (!otmp)
                return; /* for safety; should never happen */
        } else if (otmp === nothing) {
            /* livelog_printf(LL_WISH, "declined to make a wish") */
            return;
        } else if (otmp === 'hands_obj') {
            /* wish_history_add(bufcpy) -- not ported yet */
            return;
        }
        void bufcpy; /* wish_history_add(bufcpy) -- not ported yet */
        break;
    }

    if (otmp.oartifact)
        throw new Error('artifact_origin() for a wished-for artifact is not ported yet');

    /* wisharti conduct handled in readobjnam(); livelog -- not ported */
    if (!u.uconduct.wishes) u.uconduct.wishes = 0;
    u.uconduct.wishes++;

    if (otmp.otyp === O.CORPSE)
        throw new Error('makewish(): corpse wishes (u_safe_from_fatal_corpse) are not ported yet');
    if (u.uswallow || u.uinwater)
        throw new Error('makewish(): wishing while engulfed/underwater is not ported yet');
    /* verb: "slip" / "materialize" / "drop" -- only used by
       The(aobjnam(otmp, verb)), which is not ported yet (it is the
       drop_arg, shown only on the drop path that throws above) */
    const typ = g.level.at(u.ux, u.uy).typ;
    const oops_msg = (u.uswallow
                      ? "Oops!  %s out of your reach!"
                      : (Is_airlevel(u.uz) || Is_waterlevel(u.uz)
                         || typ < IRONBARS || typ >= ICE)
                        ? "Oops!  %s away from you!"
                        : !(otmp.otyp === O.CORPSE && otmp.wishedfor)
                          ? "Oops!  %s to the floor!"
                          : "Careful! %s on the floor!");

    await hold_another_object(otmp, oops_msg, null, null);
    u.ublesscnt += rn1(100, 50); /* the gods take notice */
    void oldwisharti;
}

// C ref: wizcmds.c wiz_wish() -- ^W
/* Unlimited wishes for debug mode by Paul Polderman */
export async function wiz_wish() {
    const g = game;
    if (g.flags.debug) {
        const save_verbose = g.flags.verbose;

        g.flags.verbose = false;
        await makewish();
        g.flags.verbose = save_verbose;
        /* encumber_msg() -- not ported yet */
    } else
        await pline("Unavailable command 'wizwish'."); /* unavailcmd */
    return 0; /* ECMD_OK */
}
