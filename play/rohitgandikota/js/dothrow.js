import { game } from './gstate.js';
import { ECMD_OK, ECMD_TIME } from './const.js';
import { getobj } from './invent.js';
import { getdir } from './cmd.js';

// dothrow.js — throwing, firing, and the path a thrown thing takes.
// C ref: src/dothrow.c
//
// walk_path() is here first because several unrelated things need it: jump()
// walks the hero's leap through it, throwit() walks a missile, and the polearm
// code checks reach with it. It draws nothing at all — it is pure geometry —
// but every caller decides where something ENDS UP from its result, and a
// wrong endpoint moves the hero or an object without costing a single PRNG
// call, which is the kind of divergence the RNG log cannot show.

// src/dothrow.c throw_obj() — ask a direction, then throw.
//
// res starts at ECMD_TIME and only a cancelled getdir() changes it, so a throw
// that reaches this point takes a turn. The throw itself needs the multishot,
// trajectory and damage code; what is ported is the direction read, which is
// the second of the two extra keys 't' costs.
export async function throw_obj(obj, shotlimit) {
    const res = ECMD_TIME;

    /* ask "in what direction?" */
    if (!await getdir(null))
        return ECMD_OK; /* ECMD_CANCEL — no time passes */

    note_unported_dothrow('throw_obj:throwit');
    return res;
}

// src/dothrow.c dothrow() — the 't' command.
//
// ok_to_throw() reads nothing (it only fails for notake, nohands or being
// overloaded), then getobj() takes the object letter and throw_obj() the
// direction. Three keys in total, and leaving them unconsumed ran both as
// commands.
export async function dothrow() {
    const obj = await getobj('throw', null, 0);

    return obj ? await throw_obj(obj, 0) : ECMD_OK;
}

function note_unported_dothrow(what) {
    (game.unported ||= new Set()).add(what);
}

// src/dothrow.c:656 walk_path() — Bresenham from src to dest, calling
// check_proc at every step and stopping early when it returns false.
//
// On failure dest_cc is rewritten to the LAST square that passed, which is how
// callers learn where the path was blocked. C's comment notes the algorithm
// handles slanted moves suboptimally — a diagonal that clips a corner fails
// rather than routing around it — and that quirk is part of the behaviour.
export function walk_path(src_cc, dest_cc, check_proc, arg) {
    let err;
    let x, y, dx, dy, x_change, y_change, i, prev_x, prev_y;
    let keep_going = true;

    dx = dest_cc.x - src_cc.x;
    dy = dest_cc.y - src_cc.y;
    prev_x = x = src_cc.x;
    prev_y = y = src_cc.y;

    if (dx < 0) {
        x_change = -1;
        dx = -dx;
    } else {
        x_change = 1;
    }
    if (dy < 0) {
        y_change = -1;
        dy = -dy;
    } else {
        y_change = 1;
    }
    i = err = 0;
    if (dx < dy) {
        while (i++ < dy) {
            prev_x = x;
            prev_y = y;
            y += y_change;
            err += dx << 1;
            if (err > dy) {
                x += x_change;
                err -= dy << 1;
            }
            /* check for early exit condition */
            if (!(keep_going = check_proc(arg, x, y)))
                break;
        }
    } else {
        while (i++ < dx) {
            prev_x = x;
            prev_y = y;
            x += x_change;
            err += dy << 1;
            if (err > dx) {
                y += y_change;
                err -= dx << 1;
            }
            /* check for early exit condition */
            if (!(keep_going = check_proc(arg, x, y)))
                break;
        }
    }

    if (keep_going)
        return true; /* successful */

    dest_cc.x = prev_x;
    dest_cc.y = prev_y;
    return false;
}
