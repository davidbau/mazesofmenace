// topten.js — the high-score list.
// C ref: src/topten.c
//
// Only the wizard/discover arm is live: those modes never touch the record
// file, they just say so. The real list needs the record file and the
// score-insertion walk, which no replayed session can reach (every recorded
// death is in debug mode).

import { game } from './gstate.js';
import { tty_raw_print } from './tty/wintty.js';

function note_unported_topten(what) {
    (game.unported ||= new Set()).add('topten:' + what);
}

// src/topten.c:165 topten_print() — raw when there is no topten window.
function topten_print(x) {
    tty_raw_print(x);
}

// src/topten.c:664 topten()
export async function topten(how) {
    /* logfile/xlogfile writes are filesystem-only */

    if (game.wizard || game.discover) {
        topten_print('');
        topten_print(`Since you were in ${game.wizard ? 'wizard' : 'discover'}`
                     + ' mode, the score list will not be checked.');
        return;
    }

    note_unported_topten('topten:record insertion');
}
