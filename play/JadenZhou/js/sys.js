// sys.js — system options (sysconf) and the unix play-mode checks.
// C ref: sys.c sys_early_init(), sys/unix/unixmain.c authorize_wizard_mode(),
//        authorize_explore_mode(), check_user_string().
//
// C reads sysopt from the installed SYSCF file at startup. JS can't read
// files, so the values of the recorder's installed sysconf
// (games/lib/nethackdir/sysconf) that the ported code uses are set here.

import { game } from './gstate.js';
import { pline } from './display.js';

// C ref: sys.c sys_early_init() + sysconf (WIZARDS, EXPLORERS, GENERICUSERS)
export function sys_early_init() {
    game.sysopt = {
        wizards: '*',
        explorers: '*',
        genericusers: 'play player game games nethack nethacker ec2-user',
        bones_pools: 0, /* sys.c default; BONES_POOLS is commented out */
    };
}

// C ref: unixmain.c check_user_string()
/* the hero's login name isn't available to the JS port, so only the
   "everyone" wildcard can match */
function check_user_string(optstr) {
    return optstr === '*';
}

// C ref: unixmain.c authorize_wizard_mode()
/* validate wizard mode if player has requested access to it */
export function authorize_wizard_mode() {
    const sysopt = game.sysopt;

    if (sysopt.wizards && sysopt.wizards[0]) {
        if (check_user_string(sysopt.wizards))
            return true;
    }
    game.iflags.wiz_error_flag = true; /* not being allowed into wizard mode */
    return false;
}

// C ref: unixmain.c authorize_explore_mode()
/* similar to above, validate explore mode access */
export function authorize_explore_mode() {
    const sysopt = game.sysopt;

    if (sysopt.explorers && sysopt.explorers[0]) {
        if (check_user_string(sysopt.explorers))
            return true;
    }
    game.iflags.explore_error_flag = true; /* not allowed into explore mode */
    return false;
}

// C ref: pline.c You() -- pline() with "You " prepended
async function You(line) {
    await pline(`You ${line}`);
}

// C ref: unixmain.c wd_message()
export async function wd_message() {
    const sysopt = game.sysopt;

    if (game.iflags.wiz_error_flag) {
        if (sysopt.wizards && sysopt.wizards[0]) {
            throw new Error('wd_message(): build_english_list() not ported yet');
        } else {
            await You("cannot access debug (wizard) mode.");
        }
        game.flags.debug = false; /* (paranoia) */
        if (!game.iflags.explore_error_flag)
            await pline("Entering explore/discovery mode instead.");
    } else if (game.iflags.explore_error_flag) {
        await You("cannot access explore mode."); /* same as enter_explore_mode */
        game.flags.explore = game.iflags.deferred_X = false; /* (more paranoia) */
    } else if (game.flags.explore)
        await You("are in non-scoring explore/discovery mode.");
}
