// unixmain.js — the pieces of sys/unix/unixmain.c the JS driver needs.
// C ref: sys/unix/unixmain.c
//
// The driver in js/jsmain.js plays main()'s role; only the helpers that emit
// player-visible output live here so a grep for the C symbol finds them.

import { game } from './gstate.js';
import { You } from './pline.js';
import { pline } from './display.js';

// sys/unix/unixmain.c:656 wd_message() — report the play mode after newgame().
//
// The wizard/explore error arms need sysconf restrictions the runner never
// sets, so only their flags are read; the discover arm is the live one and
// prints right after welcome(), which is why an explore session's second
// --More-- is this line.
export async function wd_message() {
    if (game.iflags?.wiz_error_flag) {
        await You('cannot access debug (wizard) mode.');
        game.wizard = false; /* (paranoia) */
        if (!game.iflags?.explore_error_flag)
            await pline('Entering explore/discovery mode instead.');
    } else if (game.iflags?.explore_error_flag) {
        await You('cannot access explore mode.'); /* same as enter_explore_mode */
        game.discover = false;
    } else if (game.discover) {
        await You('are in non-scoring explore/discovery mode.');
    }
}
