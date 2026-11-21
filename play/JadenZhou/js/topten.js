// topten.js -- the high score list.
// C ref: topten.c -- get_rnd_toptenentry(), tt_oname().
//
// The record file lives in the contest's virtual filesystem (storage.js).
// The recorder starts every session with an empty record file, and the
// port never writes one (topten() is not ported yet), so readentry() of a
// non-empty record is not ported yet either.

import { game } from './gstate.js';
import { rnd } from './rng.js';
import { vfsReadFile } from './storage.js';

// C ref: config.h RECORD
const RECORD = 'record';

// C ref: topten.c get_rnd_toptenentry()
function get_rnd_toptenentry() {
    let rank;

    /* rfile = fopen_datafile(RECORD, "r", SCOREPREFIX): the recorder
       creates the record file (empty) before every session */
    const rfile = vfsReadFile(RECORD) || '';

    rank = rnd(game.sysopt.tt_oname_maxrank);
    /* pickentry: */
    if (rfile.length)
        throw new Error('get_rnd_toptenentry(): readentry() not ported yet');
    /* an empty file: readentry() leaves tt->points == 0 for the first
       entry; if (rank > 1) { rank = 1; rewind(rfile); goto pickentry; }
       finds the same, so there is no entry */
    void rank;
    return null;
}

// C ref: topten.c tt_oname()
/*
 * Attach random player name and class from high score list
 * to an object (for statues or morgue corpses).
 */
export function tt_oname(otmp) {
    if (!otmp)
        return null;

    const tt = get_rnd_toptenentry();

    if (!tt)
        return null;

    /* set_corpsenm(otmp, classmon(tt->plrole)); ... oname(otmp, tt->name) */
    throw new Error('tt_oname(): classmon()/oname() of a record entry not ported yet');
}
