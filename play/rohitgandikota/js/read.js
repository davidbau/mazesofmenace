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
import { do_mapping } from './detect.js';
import { makeknown } from './o_init.js';
import { useup } from './invent.js';
import { exercise } from './attrib.js';
import { A_WIS } from './const.js';

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

    /* src/read.c:617 — the scroll path. Blind and confused readings need
       state no session reaches yet. */
    game.known = false;
    const nodisappear = (otyp === ONAMES.SCR_FIRE
                         || (otyp === ONAMES.SCR_REMOVE_CURSE
                             && scroll.cursed));
    await pline(nodisappear ? 'You read the scroll.'
                            : 'As you read the scroll, it disappears.');

    if (!await seffects(scroll)) {
        if (!game.objects[otyp].oc_name_known) {
            if (game.known)
                learnscroll(scroll);
            /* else trycall() asks for a name; not reachable while known
               stays false only for effectless scrolls we record */
        }
        if (otyp !== ONAMES.SCR_BLANK_PAPER)
            useup(scroll);
    }
    return ECMD_TIME;
}

// src/read.c:308 learnscroll() — reading identifies the scroll type.
function learnscroll(sobj) {
    /* it's implied hero became literate */
    makeknown(sobj.otyp);
}

// src/read.c:2263 seffects() — scroll effects, one arm per type. Only
// magic mapping is live; every other scroll records with its otyp so the
// gap is visible per type. Returns true when the scroll was already used
// up by its own arm.
async function seffects(sobj) {
    const otyp = sobj.otyp;

    /* src/read.c:2199 — "just for trying": any magical scroll exercises
       wisdom before its effect, the same dispatcher prologue weffects has */
    if (game.objects[otyp].oc_magic)
        exercise(A_WIS, true);

    switch (otyp) {
    case ONAMES.SCR_MAGIC_MAPPING:
    case ONAMES.SPE_MAGIC_MAPPING:
        await seffect_magic_mapping(sobj);
        break;
    default:
        note_unported_read(`seffects:otyp=${otyp}`);
        break;
    }
    return false;
}

// src/read.c:2100 seffect_magic_mapping()
async function seffect_magic_mapping(sobj) {
    const sblessed = !!sobj.blessed, scursed = !!sobj.cursed;
    const confused = !!game.u.uprops?.CONFUSION?.intrinsic;

    if (game.level?.flags?.nommap) {
        note_unported_read('seffect_magic_mapping:nommap');
        return;
    }
    if (sblessed)
        note_unported_read('seffect_magic_mapping:blessed_reveal');
    game.known = true;

    await pline('A map coalesces in your mind!');
    const cval = (scursed && !confused);
    if (cval)
        note_unported_read('seffect_magic_mapping:cursed_confusion');
    /* notice_mon_off/_on wrap the mapping so newly drawn monsters are not
       announced */
    do_mapping();
}
