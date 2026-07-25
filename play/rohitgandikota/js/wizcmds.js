// wizcmds.js — the wizard-mode extended commands.
// C ref: src/wizcmds.c
//
// These matter to a port more than their name suggests. A session recorded with
// OPTIONS=playmode:debug (seed0360, seed0399, seed0108, seed2600 and others) can
// issue any of them, and each one that prompts spends keys. A '#' command whose
// body is skipped leaves its prompt's keystrokes to be read as commands.

import { game } from './gstate.js';
import { ECMD_OK } from './const.js';
import { getlin } from './cmd.js';
import { pline } from './display.js';

function note_unported_wizcmds(what) {
    (game.unported ||= new Set()).add(what);
}

// src/wizcmds.c:446 wiz_level_change() — the #levelchange command.
//
// The parse is sscanf("%d%c"), which accepts a number with nothing after it;
// anything else, including an empty line or ESC, falls to "Never mind."
export async function wiz_level_change() {
    let newlevel = 0;
    let ret;

    const buf = mungspaces(
        await getlin('To what experience level do you want to be set?'));

    if (buf[0] === '\x1b' || buf === '') {
        ret = 0;
    } else {
        /* sscanf("%d%c", &newlevel, &dummy) returns 1 only when a number was
           read and NOTHING followed it; trailing junk gives 2. */
        const m = /^\s*([-+]?\d+)(.?)/.exec(buf);
        if (!m) {
            ret = 0;
        } else {
            newlevel = parseInt(m[1], 10);
            ret = m[2] === '' ? 1 : 2;
        }
    }

    if (ret !== 1) {
        await pline('Never mind.');   /* pline1(Never_mind) */
        return ECMD_OK;
    }

    if (newlevel === game.u.ulevel) {
        await pline('You are already that experienced.');
    } else if (newlevel < game.u.ulevel) {
        if (game.u.ulevel === 1) {
            await pline('You are already as inexperienced as you can get.');
            return ECMD_OK;
        }
        /* losexp() needs the experience and hit-point code. */
        note_unported_wizcmds('wiz_level_change:losexp');
        return ECMD_OK;
    } else {
        if (game.u.ulevel >= MAXULEV) {
            await pline('You are already as experienced as you can get.');
            return ECMD_OK;
        }
        /* pluslvl() draws for the hit-point and power gains. */
        note_unported_wizcmds('wiz_level_change:pluslvl');
        return ECMD_OK;
    }

    /* blessed full healing or restore ability won't fix any lost levels */
    game.u.ulevelmax = game.u.ulevel;
    return ECMD_OK;
}

// include/global.h:413 MAXULEV
const MAXULEV = 30;

// src/hacklib.c mungspaces() — squeeze internal runs of whitespace to one
// space and drop leading and trailing space.
function mungspaces(bp) {
    return bp.replace(/[ \t]+/g, ' ').replace(/^ | $/g, '');
}
