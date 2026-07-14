// rip.js — ASCII tombstone for end-of-game.
// C ref: rip.c genl_outrip / center (TEXT_TOMBSTONE).

import { game } from './gstate.js';
import { yyyymmdd } from './calendar.js';

const RIP_TXT = [
    '                       ----------',
    '                      /          \\',
    '                     /    REST    \\',
    '                    /      IN      \\',
    '                   /     PEACE      \\',
    '                  /                  \\',
    '                  |                  |', // NAME_LINE
    '                  |                  |', // GOLD_LINE
    '                  |                  |', // DEATH_LINE
    '                  |                  |',
    '                  |                  |',
    '                  |                  |',
    '                  |       1001       |', // YEAR_LINE
    '                 *|     *  *  *      | *',
    '        _________)/\\\\_//(\\/(/\\)/\\//\\/|_)_______',
];

const STONE_LINE_CENT = 28;
const STONE_LINE_LEN = 16;
const NAME_LINE = 6;
const GOLD_LINE = 7;
const DEATH_LINE = 8;
const YEAR_LINE = 12;

function center(rip, line, text) {
    const row = rip[line];
    const chars = [...row];
    const start = STONE_LINE_CENT - ((text.length + 1) >> 1);
    for (let i = 0; i < text.length; i++) {
        if (start + i >= 0 && start + i < chars.length) chars[start + i] = text[i];
    }
    rip[line] = chars.join('');
}

/**
 * C ref: rip.c genl_outrip — build tombstone lines (caller displays).
 * `deathDesc` is formatkiller(how, FALSE) from end.js.
 * Named omissions: NH320 dual stone; DUMPLOG Game over header.
 * @param {string} deathDesc
 * @param {number} [when]
 * @returns {string[]}
 */
export function genl_outrip_lines(deathDesc, when = 0) {
    const rip = RIP_TXT.map((s) => s);
    const plname = String(game.plname || '');
    center(rip, NAME_LINE, plname.slice(0, STONE_LINE_LEN));

    let cash = Math.max(game._done_money | 0, 0);
    if (cash > 999999999) cash = 999999999;
    center(rip, GOLD_LINE, `${cash} Au`);

    let dpx = String(deathDesc || '');
    for (let line = DEATH_LINE; line < YEAR_LINE; line++) {
        let i0 = dpx.length;
        if (i0 > STONE_LINE_LEN) {
            let i = STONE_LINE_LEN;
            for (; i > 0 && i0 > STONE_LINE_LEN; --i) {
                if (dpx[i] === ' ') i0 = i;
            }
            if (!i) i0 = STONE_LINE_LEN;
        }
        const chunk = dpx.slice(0, i0);
        center(rip, line, chunk);
        if (i0 < dpx.length && dpx[i0] === ' ') dpx = dpx.slice(i0 + 1);
        else dpx = dpx.slice(i0);
    }

    const year = ((yyyymmdd(when) / 10000) | 0) % 10000;
    center(rip, YEAR_LINE, String(year).padStart(4, ' '));

    return rip;
}
