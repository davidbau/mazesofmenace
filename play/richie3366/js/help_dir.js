// help_dir.js — C cmd.c help_dir / show_direction_keys (getdir cmdassist subset).
// C ref: cmd.c help_dir(), show_direction_keys(); getdir() invalid direction + cmdassist.

import { game } from './gstate.js';
import { NO_COLOR } from './terminal.js';

/** C: cmd.c show_direction_keys + help_dir tail — vi movement (default dirchars). */
const GETDIR_HELP_LINES = [
    [2, 'Valid direction keys are:'],
    [3, '          y  k  u'],
    [4, '           \\ | / '],
    [5, '          h- . -l'],
    [6, '           / | \\ '],
    [7, '          b  j  n'],
    [9, '          <  up'],
    [10, '          >  down'],
    [11, '          .  direct at yourself'],
    [13, '(Suppress this message with !cmdassist in config file.)'],
];

/**
 * C: cmd.c help_dir — NHW_TEXT over map; row 0 keeps cmdassist pline.
 * @param {import('./game_display.js').GameDisplay} display
 */
export function paintGetdirHelpOverlayLikeC(display) {
    for (const [row, line] of GETDIR_HELP_LINES) {
        for (let c = 0; c < Math.min(line.length, display.cols); c++)
            display.setCell(c, row, line[c], NO_COLOR, 0);
    }
}

/** C: cmd.c help_dir after invalid getdir direction (cmdassist on). */
export function openGetdirHelpOverlayLikeC(g = game, msg = 'Invalid direction key!') {
    g._pending_message = `cmdassist: ${msg}`;
    g._getdirHelpOverlayLikeC = true;
    g._getdirHelpNeedMoreLikeC = true;
    g._toplineNeedMore = false;
    g._showDefmoreOnTopline = false;
    g._retainMessageAfterCommand = true;
}

export function closeGetdirHelpOverlayLikeC(g = game) {
    g._getdirHelpOverlayLikeC = false;
    g._getdirHelpNeedMoreLikeC = false;
}
