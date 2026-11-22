// rip.js -- the text tombstone.
// C ref: rip.c genl_outrip() (TEXT_TOMBSTONE; NH320_DEDICATION and
// DUMPLOG aren't defined in this build)

import { game } from './gstate.js';
import { formatkiller } from './topten.js';
import { yyyymmdd } from './calendar.js';
import { tty_putstr } from './wintty.js';

// C ref: rip.c rip_txt[]
const rip_txt = [
    "                       ----------",
    "                      /          \\",
    "                     /    REST    \\",
    "                    /      IN      \\",
    "                   /     PEACE      \\",
    "                  /                  \\",
    "                  |                  |", /* Name of player */
    "                  |                  |", /* Amount of $ */
    "                  |                  |", /* Type of death */
    "                  |                  |", /* . */
    "                  |                  |", /* . */
    "                  |                  |", /* . */
    "                  |       1001       |", /* Real year of death */
    "                 *|     *  *  *      | *",
    "        _________)/\\\\_//(\\/(/\\)/\\//\\/|_)_______",
];
const STONE_LINE_CENT = 28; /* char[] element of center of stone face */
const STONE_LINE_LEN = 16; /* # chars that fit on one line
                            * (note 1 ' ' border)           */
const NAME_LINE = 6; /* *char[] line # for player name */
const GOLD_LINE = 7; /* *char[] line # for amount of gold */
const DEATH_LINE = 8; /* *char[] line # for death description */
const YEAR_LINE = 12; /* *char[] line # for year */

// C ref: rip.c center()
function center(rip, line, text) {
    const op = STONE_LINE_CENT - ((text.length + 1) >> 1);
    rip[line] = rip[line].slice(0, op) + text + rip[line].slice(op + text.length);
}

// C ref: rip.c genl_outrip()
export async function genl_outrip(tmpwin, how, when) {
    const rip = rip_txt.slice(); /* gr.rip: dupstr() of each line */
    let buf, x, line, year, cash;

    /* Put name on stone */
    buf = game.plname.slice(0, STONE_LINE_LEN);
    center(rip, NAME_LINE, buf);

    /* Put $ on stone */
    cash = Math.max(game.done_money, 0);
    /* arbitrary upper limit; practical upper limit is quite a bit less */
    if (cash > 999999999)
        cash = 999999999;
    buf = `${cash} Au`;
    center(rip, GOLD_LINE, buf);

    /* Put together death description */
    buf = formatkiller(256 /* BUFSZ */, how, false);

    /* Put death type on stone */
    let dpx = buf;
    for (line = DEATH_LINE; line < YEAR_LINE; line++) {
        let i, i0 = dpx.length;

        if (i0 > STONE_LINE_LEN) {
            for (i = STONE_LINE_LEN; (i > 0) && (i0 > STONE_LINE_LEN); --i)
                if (dpx[i] === ' ')
                    i0 = i;
            if (!i)
                i0 = STONE_LINE_LEN;
        }
        const tmpchar = (i0 < dpx.length) ? dpx[i0] : '\0';
        center(rip, line, dpx.slice(0, i0));
        if (tmpchar !== ' ') {
            dpx = dpx.slice(i0);
        } else
            dpx = dpx.slice(i0 + 1);
    }

    /* Put year on stone */
    year = Math.trunc(yyyymmdd(when) / 10000) % 10000;
    buf = String(year).padStart(4);
    center(rip, YEAR_LINE, buf);

    await tty_putstr(tmpwin, 0, "");

    for (x = 0; x < rip.length; x++)
        await tty_putstr(tmpwin, 0, rip[x]);

    await tty_putstr(tmpwin, 0, "");
    await tty_putstr(tmpwin, 0, "");
}
