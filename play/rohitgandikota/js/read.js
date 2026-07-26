// read.js — reading scrolls and spellbooks.
// C ref: src/read.c
//
// Only doread()'s head so far, and it is ported for one reason: getobj()
// CONSUMES A KEYSTROKE. With 'r' undispatched the inventory letter that
// follows it ran as a command instead, so every read in a session put all
// later keys out of step. That is a whole-session divergence from one
// missing call, and it is the same failure the 'f' and #chat gaps caused.
//
// The per-scroll effects are a large switch and are recorded by object name.

import { game } from './gstate.js';
import { getobj } from './invent.js';
import { ECMD_OK, ECMD_TIME } from './invent.js';
import { ECMD_CANCEL, GETOBJ_PROMPT, EXT_ENCUMBER } from './const.js';
import { near_capacity } from './attrib.js';
import { You_cant } from './pline.js';
import { ONAMES, OCLASSES } from './objects_data.js';
import { pline } from './display.js';

// src/hack.c check_capacity() — refuse an action while overloaded.
export async function check_capacity(str) {
    if (near_capacity() >= EXT_ENCUMBER) {
        await You_cant('do that while carrying so much stuff.');
        return 1;
    }
    return 0;
}

// src/read.c doread() — the 'r' command.
//
// C reads while blind in most cases, and while confused with an alternate
// outcome; neither state is tracked yet, so neither is guessed at.
export async function doread(read_ok) {
    if (await check_capacity(null))
        return ECMD_OK;

    /* THE KEY CONSUMPTION. C prompts with GETOBJ_PROMPT, so the letter is
       read here rather than falling through to the command loop. */
    const scroll = await getobj('read', read_ok, GETOBJ_PROMPT);
    if (!scroll)
        return ECMD_CANCEL;

    scroll.pickup_prev = 0; /* no longer 'just picked up' */

    /* src/read.c — reading something that is neither a scroll nor a
       spellbook. read_ok returns GETOBJ_DOWNPLAY for those rather than
       EXCLUDE, so the letter is still selectable and this arm is genuinely
       reachable. silly_thing_to is "That is a silly thing to %s."
       (src/decl.c:43). No turn is spent. */
    if (scroll.oclass !== OCLASSES.SCROLL_CLASS
        && scroll.oclass !== OCLASSES.SPBOOK_CLASS) {
        await pline('That is a silly thing to read.');
        return ECMD_OK;
    }

    /* src/read.c — the per-item switch. Each arm needs its own subsystem
       (rumours, spellbook study, the scroll effects table), so the item is
       named rather than lumped, which lets the reach tool rank them. */
    const name = Object.keys(ONAMES).find(k => ONAMES[k] === scroll.otyp);
    (game.unported ||= new Set()).add(`doread:${name ?? scroll.otyp}`);
    return ECMD_TIME;
}
