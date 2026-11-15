// @ts-nocheck
// animframes.js — the supplemental animation-frame channel.
//
// C ref: include/winprocs.h:162 `#define nh_delay_output
// (*windowprocs.win_delay_output)`, which for the tty port is
// emits a KIND=anim marker carrying the terminal as it stands at that instant.
// It writes nothing to the terminal itself and touches no game state, draws no
// RNG.  So a frame is exactly "whatever the tty already shows" — the caller is
// responsible for having flushed (flush_screen / curs_on_u / tmp_at) first, as
// in C.
//
// Frames accumulate here and are claimed, one list per input boundary, by the
// between two input markers under the later step (the step whose key caused
// it), and the hook takes the pending list at exactly that boundary.
import { game } from './gstate.js';
import { anim_frame_info } from './display.js';

let _pending = [];
let _dismissed = 0;     /* --More-- pages dismissed so far (display.js _topl_more) */
let _dismissKeys = [];  /* the key that dismissed each page */

export function anim_frames_reset() {
    _pending = [];
    _dismissed = 0;
    _dismissKeys = [];
}

export function anim_more_dismissed(key) {
    _dismissKeys[_dismissed++] = key;
}

export function anim_frames_take() {
    const due = [];
    const later = [];
    for (const e of _pending) {
        let at = e.base + e.owed, screen = e.frame.screen;
        for (let i = e.base; i < at; i++) {
            /* escScreens[] is null where the page's owner was urgent or
             * "You die": ESC there leaves WIN_STOP clear (topl.c:232-235). */
            const esc = e.escScreens[i - e.base];
            if (_dismissKeys[i] === 27 && esc) {
                at = i + 1 + (esc.more | 0);
                screen = esc.screen;
                break;
            }
        }
        if (at > _dismissed) later.push(e);
        else due.push(screen === e.frame.screen ? e.frame : { ...e.frame, screen });
    }
    _pending = later;
    return due;
}

export function nh_delay_output() {
    if (typeof game?._screen_output !== 'string')
        return;
    const { screen, owed, escScreens } = anim_frame_info();
    if (typeof screen !== 'string')
        return;
    const disp = game.nhDisplay;
    _pending.push({
        base: _dismissed,
        owed: owed | 0,
        escScreens: escScreens || [],
        frame: {
            screen,
            cursor: disp ? [disp.cursorCol ?? 0, disp.cursorRow ?? 0, 1] : [0, 0, 1],
        },
    });
}
