// steed.js — riding.
// C ref: src/steed.c
//
// Only the two pieces makedog() needs are here so far. put_saddle_on_mon()
// DRAWS: with no saddle passed it calls mksobj(SADDLE, ...), which spends a
// next_ident(). A Knight's starting pony is saddled this way, so skipping it
// lost a draw in the middle of character creation and shifted every later
// call on those sessions.

import { game } from './gstate.js';
import { MONSYMS, MFLAGS } from './monst_data.js';
import { humanoid, amorphous, noncorporeal, is_whirly,
         unsolid } from './mondata.js';
import { which_armor } from './worn.js';
import { mksobj } from './mkobj.js';
import { ONAMES } from './objects_data.js';
import { W_SADDLE } from './const.js';
import { OBJ_MINVENT } from './obj.js';

// src/steed.c:8 steeds[] — the monster classes that can be ridden.
const steeds = [
    MONSYMS.S_QUADRUPED, MONSYMS.S_UNICORN, MONSYMS.S_ANGEL,
    MONSYMS.S_CENTAUR, MONSYMS.S_DRAGON, MONSYMS.S_JABBERWOCK,
];

// src/steed.c:26 can_saddle()
export function can_saddle(mtmp) {
    const ptr = mtmp.data;

    return steeds.includes(ptr.mlet) && ptr.msize >= MFLAGS.MZ_MEDIUM
        && (!humanoid(ptr) || ptr.mlet === MONSYMS.S_CENTAUR)
        && !amorphous(ptr) && !noncorporeal(ptr) && !is_whirly(ptr)
        && !unsolid(ptr);
}

// src/steed.c put_saddle_on_mon() — saddle `mtmp`, making the saddle if the
// caller did not supply one.
//
// The mksobj() is the draw. fully_identify_obj() is discovery bookkeeping and
// update_mon_extrinsics() is a no-op for a saddle, which grants nothing.
export function put_saddle_on_mon(saddle, mtmp) {
    if (!can_saddle(mtmp) || which_armor(mtmp, W_SADDLE))
        return;

    if (!saddle) {
        saddle = mksobj(ONAMES.SADDLE, true, false);
        if (!saddle)
            return;
    }

    (mtmp.minvent ||= []).unshift(saddle);      /* mpickobj() */
    saddle.where = OBJ_MINVENT;
    saddle.ocarry = mtmp;

    mtmp.misc_worn_check = (mtmp.misc_worn_check || 0) | W_SADDLE;
    saddle.owornmask = W_SADDLE;
    saddle.leashmon = mtmp.m_id;
}
