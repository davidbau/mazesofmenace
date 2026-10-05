// rip.js — the tombstone.
// C ref: src/rip.c

import { game } from './gstate.js';
import { tty_putstr } from './tty/wintty.js';
import { formatkiller } from './end.js';

// src/rip.c:27 rip_txt[] — the tombstone, verbatim.
const rip_txt = [
    '                       ----------',
    '                      /          \\',
    '                     /    REST    \\',
    '                    /      IN      \\',
    '                   /     PEACE      \\',
    '                  /                  \\',
    '                  |                  |',   /* Name of player */
    '                  |                  |',   /* Amount of $ */
    '                  |                  |',   /* Type of death */
    '                  |                  |',   /* . */
    '                  |                  |',   /* . */
    '                  |                  |',   /* . */
    '                  |       1001       |',   /* Real year of death */
    '                 *|     *  *  *      | *',
    '        _________)/\\\\_//(\\/(/\\)/\\//\\/|_)_______',
];

// src/rip.c:68-73
const STONE_LINE_LEN = 16;   /* # chars that fit on one line */
const STONE_LINE_CENT = 28;  /* char[] element of center of stone face */
const NAME_LINE = 6, GOLD_LINE = 7, DEATH_LINE = 8, YEAR_LINE = 12;

// src/rip.c:76 center()
function center(stone, line, text) {
    const i = STONE_LINE_CENT - Math.trunc((text.length + 1) / 2);
    stone[line] = stone[line].slice(0, i) + text
                  + stone[line].slice(i + text.length);
}

// src/rip.c:95 genl_outrip() — fill the stone and write it into the
// end-of-game text window.
export function genl_outrip(tmpwin, how) {
    const stone = rip_txt.slice();

    /* Put name on stone */
    center(stone, NAME_LINE, String(game.plname || '').slice(0, STONE_LINE_LEN));

    /* Put $ on stone */
    let cash = Math.max(game.done_money ?? 0, 0);
    if (cash > 999999999) cash = 999999999;
    center(stone, GOLD_LINE, `${cash} Au`);

    /* Put together death description, split over up to four stone lines */
    let dpx = formatkiller(how, false);
    for (let line = DEATH_LINE; line < YEAR_LINE; line++) {
        let i0 = dpx.length;
        if (i0 > STONE_LINE_LEN) {
            let i;
            for (i = STONE_LINE_LEN; i > 0 && i0 > STONE_LINE_LEN; --i)
                if (dpx[i] === ' ')
                    i0 = i;
            if (!i)
                i0 = STONE_LINE_LEN;
        }
        const tmpchar = dpx[i0];
        center(stone, line, dpx.slice(0, i0));
        if (tmpchar !== ' ')
            dpx = dpx.slice(i0);
        else
            dpx = dpx.slice(i0 + 1);
        if (!dpx.length) break;
    }

    /* Put year on stone — yyyymmdd(when)/10000 % 10000 */
    const dt = game.fixed_datetime || '20261231000000';
    center(stone, YEAR_LINE, dt.slice(0, 4).padStart(4));

    tty_putstr(tmpwin, 0, '');
    for (const line of stone)
        tty_putstr(tmpwin, 0, line);
    tty_putstr(tmpwin, 0, '');
    tty_putstr(tmpwin, 0, '');
}
