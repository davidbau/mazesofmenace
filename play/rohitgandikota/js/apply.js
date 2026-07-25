// apply.js — the 'a' command.
// C ref: src/apply.c

import { game } from './gstate.js';
import { ONAMES } from './objects_data.js';
import { ECMD_OK, ECMD_TIME } from './const.js';
import { getobj } from './invent.js';
import { getdir, get_adjacent_loc } from './cmd.js';

function note_unported_apply(what) {
    (game.unported ||= new Set()).add(what);
}

/* src/apply.c:4285 — the lock tools. pick_lock() reaches get_adjacent_loc(),
   so applying one consumes a DIRECTION key. Missing that left the direction to
   run as a movement command, which is exactly what made an earlier attempt at
   this command cost seed0077 a screen: its rogue applies item `e`, the lock
   pick, and the `j` after it is a direction in C and a move in ours. */
const LOCK_TOOLS = [ONAMES.LOCK_PICK, ONAMES.CREDIT_CARD, ONAMES.SKELETON_KEY];

/* src/apply.c — these five reach getdir() through use_whip, use_stethoscope,
   use_mirror, use_camera and use_figurine. */
const NEEDS_DIR = [ONAMES.BULLWHIP, ONAMES.STETHOSCOPE, ONAMES.MIRROR,
                   ONAMES.EXPENSIVE_CAMERA, ONAMES.FIGURINE];

/* src/apply.c:4344 — use_lamp() is void, so doapply's `int res = ECMD_TIME`
   survives and applying a lamp takes a turn. */
const LAMPS = [ONAMES.OIL_LAMP, ONAMES.MAGIC_LAMP, ONAMES.BRASS_LANTERN];

// src/apply.c doapply() — the 'a' command.
export async function doapply() {
    const obj = await getobj('use or apply', null, 0);

    if (!obj)
        return ECMD_OK; /* ECMD_CANCEL */

    if (LOCK_TOOLS.includes(obj.otyp)) {
        const cc = { x: 0, y: 0 };
        if (!await get_adjacent_loc(null, 'Invalid location!',
                                    game.u.ux, game.u.uy, cc))
            return ECMD_OK;
        /* src/apply.c:4288 — ECMD_TIME only when pick_lock() did something,
           and the lock machinery is not ported. */
        note_unported_apply('pick_lock');
        return ECMD_OK;
    }

    if (NEEDS_DIR.includes(obj.otyp)) {
        if (!await getdir(null))
            return ECMD_OK;
        note_unported_apply(`apply:dir otyp=${obj.otyp}`);
        return ECMD_TIME;
    }

    if (LAMPS.includes(obj.otyp))
        return ECMD_TIME;

    note_unported_apply(`apply:otyp=${obj.otyp}`);
    return ECMD_OK;
}
