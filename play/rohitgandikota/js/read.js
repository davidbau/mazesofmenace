// read.js — the 'r' command.
// C ref: src/read.c
//
// The spellbook route is live (doread -> study_book); scroll effects need
// seffects and stay recorded after their prompt keys are consumed.

import { game } from './gstate.js';
import { getobj, GETOBJ_PROMPT, ECMD_TIME, ECMD_OK } from './invent.js';
import { ECMD_CANCEL } from './const.js';
import { OCLASSES, ONAMES } from './objects_data.js';
import { pline } from './display.js';
import { study_book } from './spell.js';

function note_unported_read(what) {
    (game.unported ||= new Set()).add('read:' + what);
}

// src/read.c:315 read_ok() — getobj filter for 'r'; lives in js/cmd.js
// beside the other command filters and is passed in by the caller.

// src/read.c:330 doread()
export async function doread(read_ok) {
    const scroll = await getobj('read', read_ok, GETOBJ_PROMPT);
    if (!scroll)
        return ECMD_CANCEL;
    const otyp = scroll.otyp;
    scroll.pickup_prev = 0;

    /* fortune cookie / shirts / candy wrapper arms */
    if (otyp === ONAMES.FORTUNE_COOKIE || otyp === ONAMES.T_SHIRT
        || otyp === ONAMES.ALCHEMY_SMOCK || otyp === ONAMES.HAWAIIAN_SHIRT
        || otyp === ONAMES.APRON || otyp === ONAMES.CANDY_BAR) {
        note_unported_read('doread:novelty_text');
        return ECMD_TIME;
    }
    if (scroll.oclass !== OCLASSES.SCROLL_CLASS
        && scroll.oclass !== OCLASSES.SPBOOK_CLASS) {
        await pline("That is a silly thing to read.");
        return ECMD_OK;
    }
    if (game.u.ublind && otyp !== ONAMES.SPE_BOOK_OF_THE_DEAD) {
        note_unported_read('doread:blind');
        return ECMD_OK;
    }

    /* literate conduct bump — no draw, no message */
    game.u.uconduct = game.u.uconduct || {};
    game.u.uconduct.literate = (game.u.uconduct.literate || 0) + 1;

    if (scroll.oclass === OCLASSES.SPBOOK_CLASS)
        return (await study_book(scroll)) ? ECMD_TIME : ECMD_OK;

    /* the scroll path: "As you read the scroll, it disappears." + seffects */
    note_unported_read('doread:seffects');
    return ECMD_TIME;
}
