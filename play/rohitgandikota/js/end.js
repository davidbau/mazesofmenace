// end.js — the death sequence.
// C ref: src/end.c
//
// Seven of the 44 public sessions have their first divergence here, and not
// because of an RNG bug: they DIE and start a new game, and this port keeps
// playing a hero C has already killed. Every frame after that point is wrong.
//
// src/end.c is 1948 lines and done/done_in_by/really_done between them spend
// ZERO draws. The whole sequence is screens -- the DYWYPI prompt, the
// tombstone, the final inventory, the score -- and then a new game, whose
// u_init() and mklev() are where draws resume.

import { game } from './gstate.js';

function note_unported_end(what) {
    (game.unported ||= new Set()).add(what);
}

// src/end.c done() — the hero's game is over.
//
// `how` is one of the DIED/CHOKING/POISONING/... reasons in include/hack.h.
// Nothing here draws; done() prints and then either restores a life or ends
// the game.
export function done(how) {
    /* life-saving, the DYWYPI prompt, the tombstone, the final inventory and
       the score all need the end-of-game windows; and restarting needs
       newgame() to run a second time in this process. */
    note_unported_end(`done:${how}`);
    game.program_state_gameover = true;
}

// src/rip.c:27 rip_txt[] — the tombstone, verbatim. Sixteen fixed lines; the
// blank interior rows are filled in by outrip() with the hero's name, the
// gold, the death reason (up to four lines) and the year.
const rip_txt = [
    "                       ----------",
    "                      /          \\",
    "                     /    REST    \\",
    "                    /      IN      \\",
    "                   /     PEACE      \\",
    "                  /                  \\",
    "                  |                  |",   /* Name of player */
    "                  |                  |",   /* Amount of $ */
    "                  |                  |",   /* Type of death */
    "                  |                  |",   /* . */
    "                  |                  |",   /* . */
    "                  |                  |",   /* . */
    "                  |       1001       |",   /* Real year of death */
    "                 *|     *  *  *      | *",
    "        _________)/\\\\_//(\\/(/\\)/\\//\\/|_)_______",
];

// src/rip.c STONE_LINE_CENT — the column the interior text centres on.
const STONE_LINE_CENT = 28;

// src/rip.c center() — centre `text` on STONE_LINE_CENT within one stone line.
function center(line, text) {
    const i = STONE_LINE_CENT - Math.trunc((text.length + 1) / 2);
    return line.slice(0, i) + text + line.slice(i + text.length);
}

// src/rip.c genl_outrip() — fill the stone and hand it to the window port.
//
// The recorded ground truth is seed0030 step 75, whose name line reads
//     "                  |      Quincy      |"
// which is exactly center() applied to the plain hero name.
export function genl_outrip(hero, gold, deathReason, year) {
    const stone = rip_txt.slice();
    let line = 6;

    stone[line++] = center(stone[line - 1], hero);
    stone[line++] = center(stone[line - 1], `${gold} Au`);
    for (const part of String(deathReason).split('\n').slice(0, 4))
        stone[line++] = center(stone[line - 1], part);
    stone[12] = center(stone[12], String(year));

    return stone;
}
