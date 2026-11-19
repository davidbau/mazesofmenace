// sys.js — system options (sysconf) and the unix play-mode checks.
// C ref: sys.c sys_early_init(), sys/unix/unixmain.c authorize_wizard_mode(),
//        authorize_explore_mode(), check_user_string().
//
// C reads sysopt from the installed SYSCF file at startup. JS can't read
// files, so the values of the recorder's installed sysconf
// (games/lib/nethackdir/sysconf) that the ported code uses are set here.

import { game } from './gstate.js';

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
