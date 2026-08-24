// topten.js — the high-score list.
// C ref: src/topten.c
//
// Only the wizard/discover arm is live: those modes never touch the record
// file, they just say so. The real list needs the record file and the
// score-insertion walk, which no replayed session can reach (every recorded
// death is in debug mode).

import { game } from './gstate.js';
import { tty_raw_print } from './tty/wintty.js';
import { rn1, rn2, rnd } from './rng.js';
import { PMNAMES } from './monst_data.js';

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

// src/topten.c:1381 get_rnd_toptenentry() — pick a random scorefile entry.
// The rnd(tt_oname_maxrank) draw happens BEFORE the file is read, so an
// empty record (every wizard/debug game skips score insertion) still costs
// the draw and returns null.
export function get_rnd_toptenentry() {
    const maxrank = 10;             /* sysconf tt_oname_maxrank default */
    rnd(maxrank);
    /* the port's record store: wizard-mode games never insert, so the
       walk over stored entries finds nothing */
    const entries = game.topten_entries ?? [];
    if (!entries.length)
        return null;
    return entries[0] ?? null;
}

// src/topten.c:1356 classmon() — role filecode to its monster.
// roles[] resolved through game to stay out of the role_data import cycle.
function classmon(plch) {
    for (const r of (game.roles_table ?? [])) {
        if (r.filecode === plch) {
            if (r.mnum !== undefined && r.mnum !== -1)
                return (typeof r.mnum === 'string') ? PMNAMES[r.mnum] : r.mnum;
            return PMNAMES.PM_HUMAN;
        }
    }
    if (plch === 'E')
        return PMNAMES.PM_RANGER;
    return PMNAMES.PM_HUMAN_MUMMY;
}

// src/topten.c:1445 tt_doppel() — a doppelganger takes a top-ten hero's
// role and name, or a random role when the scorefile is empty.
export function tt_doppel(mon) {
    const tt = rn2(13) ? get_rnd_toptenentry() : null;
    let ret;

    if (!tt) {
        ret = rn1(PMNAMES.PM_WIZARD - PMNAMES.PM_ARCHEOLOGIST + 1,
                  PMNAMES.PM_ARCHEOLOGIST);
    } else {
        if (tt.plgend?.[0] === 'F')
            mon.female = 1;
        else if (tt.plgend?.[0] === 'M')
            mon.female = 0;
        ret = classmon(tt.plrole);
        /* christen only when the player can see the doppelganger */
        note_unported_topten('tt_doppel:christen');
    }
    return ret;
}
