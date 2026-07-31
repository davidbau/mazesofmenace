// rip.js — text tombstone (genl_outrip / outrip).
// C refs: src/rip.c (TEXT_TOMBSTONE block: rip_txt[], center(), genl_outrip()).

import { deathSummary, farewellRow, deathSummaryRows } from './end.js';
import { game } from './gstate.js';

// A normal tombstone for end of game display (rip.c:26-41).
/* eslint-disable no-useless-escape */
const RIP_TXT = [
    '                       ----------',
    '                      /          \\',
    '                     /    REST    \\',
    '                    /      IN      \\',
    '                   /     PEACE      \\',
    '                  /                  \\',
    '                  |                  |', /* Name of player */
    '                  |                  |', /* Amount of $ */
    '                  |                  |', /* Type of death */
    '                  |                  |', /* . */
    '                  |                  |', /* . */
    '                  |                  |', /* . */
    '                  |       1001       |', /* Real year of death */
    '                 *|     *  *  *      | *',
    '        _________)/\\\\_//(\\/(/\\)/\\//\\/|_)_______',
];
/* eslint-enable no-useless-escape */

const STONE_LINE_CENT = 28; /* char[] element of center of stone face (rip.c:48) */
const STONE_LINE_LEN = 16;  /* # chars that fit on stone face line (rip.c:54) */
const NAME_LINE = 6;   /* line # for player name */
const GOLD_LINE = 7;   /* line # for amount of gold */
const DEATH_LINE = 8;  /* line # for death description */
const YEAR_LINE = 12;  /* line # for year */

// C ref: center() (rip.c:67-75) — write `text` into stone line, centered
// around STONE_LINE_CENT.
function center(lines, line, text) {
    const chars = [...lines[line]];
    let col = STONE_LINE_CENT - ((text.length + 1) >> 1);
    for (let i = 0; i < text.length; i++, col++)
        chars[col] = text[i];
    lines[line] = chars.join('');
}

// yyyymmdd()/10000 % 10000 for the death year (rip.c:124-126 uses
// yyyymmdd(when); the JS engine carries the fixed clock on game._datetime
// as "YYYYMMDDHHMMSS").
function ripYear() {
    const dt = String(game._datetime || '');
    const year = parseInt(dt.slice(0, 4), 10);
    return Number.isFinite(year) && dt.length >= 8 ? year % 10000 : 2026;
}

// C ref: genl_outrip() (rip.c:79-158).  Returns the 15 tombstone lines with
// the name / gold / death-type / year substitutions applied.
export function genlOutrip({ name, gold: cash, deathText, year }) {
    const lines = RIP_TXT.slice();

    /* Put name on stone */
    center(lines, NAME_LINE, String(name).slice(0, STONE_LINE_LEN));

    /* Put $ on stone */
    cash = Math.max(cash | 0, 0);
    if (cash > 999999999) /* arbitrary upper limit (rip.c:104-106) */
        cash = 999999999;
    center(lines, GOLD_LINE, `${cash} Au`);

    /* Put death type on stone, wrapped at STONE_LINE_LEN (rip.c:113-134) */
    let dpx = String(deathText || '');
    for (let line = DEATH_LINE; line < YEAR_LINE; line++) {
        let i0 = dpx.length;

        if (i0 > STONE_LINE_LEN) {
            /* latest space at index <= STONE_LINE_LEN (rip.c:119-121) */
            let found = -1;
            for (let i = STONE_LINE_LEN; i > 0; --i) {
                if (dpx[i] === ' ') { found = i; break; }
            }
            i0 = found >= 0 ? found : STONE_LINE_LEN;
        }
        center(lines, line, dpx.slice(0, i0));
        if (dpx[i0] !== ' ') {
            dpx = dpx.slice(i0);
        } else {
            dpx = dpx.slice(i0 + 1);
        }
    }

    /* Put year on stone */
    center(lines, YEAR_LINE, String(year).padStart(4));

    return lines;
}

// Convert the full-width stone lines into the slim overlay rows the tty
// window emits: each row is [row, col, text] with leading whitespace folded
// into `col` (rows 1..15 on screen; genl_outrip() emits a blank putstr()
// at row 0 and two blank rows after the stone, rip.c:135-158).
export function ripStoneOverlayRows(opts) {
    const lines = genlOutrip(opts);
    return lines.map((text, index) => {
        const trimmed = text.trimStart();
        return [index + 1, text.length - trimmed.length, trimmed];
    });
}

// Full end-of-game "grave" screen: tombstone + farewell + summary coda
// (really_done() printing into the NHW_TEXT endwin, end.c:1563-1708).
export function deathGraveLines() {
    const dsum = deathSummary();
    const rows = ripStoneOverlayRows({
        name: dsum.name,
        gold: dsum.gold,
        deathText: dsum.cause,
        year: ripYear(),
    });
    rows.push([18, 0, farewellRow(dsum)]);
    const summary = deathSummaryRows(dsum);
    rows.push([20, 0, summary[0]]);
    rows.push([21, 0, summary[1]]);
    rows.push([22, 0, summary[2]]);
    rows.push([23, 0, '--More--']);
    return rows;
}
