/* NetHack 5.0	rip.c	$NHDT-Date: 1597967808 2020/08/20 23:56:48 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.33 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2017. */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from '../c-runtime/context.js';

/* Defining TEXT_TOMBSTONE causes genl_outrip() to exist, but it doesn't
   necessarily have to be used by a binary with multiple window-ports */

/* A normal tombstone for end of game display. */
const rip_txt_normal = [
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
    "        _________)/\\\\_//(\\/(/\\)/\\//\\/|_)_______", 0
];
/* char[] element of center of stone face */
/* NH320_DEDICATION */
/* NetHack 3.2.x displayed a dual tombstone as a tribute to Izchak. */
const rip_txt_dedication = [
    "              ----------                      ----------",
    "             /          \\                    /          \\",
    "            /    REST    \\                  /    This    \\",
    "           /      IN      \\                /  release of  \\",
    "          /     PEACE      \\              /   NetHack is   \\",
    "         /                  \\            /   dedicated to   \\",
    "         |                  |            |  the memory of   |",
    "         |                  |            |                  |",
    "         |                  |            |  Izchak Miller   |",
    "         |                  |            |   1935 - 1994    |",
    "         |                  |            |                  |",
    "         |                  |            |     Ascended     |",
    "         |       1001       |            |                  |",
    "      *  |     *  *  *      | *        * |      *  *  *     | *",
    (" _____)/\\|\\__//(\\/(/\\)/\\//\\/|_)___"
     + "_____)/|\\\\_/_/(\\/(/\\)/\\/\\/|_)____"),
    0
];
/* char[] element of center of stone face */
/* NH320_DEDICATION */
const STONE_LINE_LEN = 16; /* # chars that fit on one line
                            * (note 1 ' ' border)           */
const NAME_LINE = 6; /* *char[] line # for player name */
const GOLD_LINE = 7; /* *char[] line # for amount of gold */
const DEATH_LINE = 8; /* *char[] line # for death description */
const YEAR_LINE = 12; /* *char[] line # for year */

/* JavaScript translation of rip.c: the configured tombstone selects one of
 * the unchanged templates above. C char pointers and char** remain numeric
 * addresses; pointer-array accesses use the generated C pointer stride.
 * Heap accesses fetch the current view after allocation or C callbacks.
 * Local buf uses scoped C stack storage, and C long/time_t use BigInt.
 * The centering division uses Math.floor for the original unsigned size_t
 * shift, without JS's 32-bit shift truncation. Both function boundaries and
 * all original text wrapping/output decisions remain unchanged.
 */

function center(line, text)
{
    const STONE_LINE_CENT = C.NH320_DEDICATION ? 19 : 28;
    let ip, op;
    ip = text;
    op = C.pointer(C.gr.rip + line * C.pointerSize)
         + STONE_LINE_CENT - Math.floor((C.strlen(text) + 1) / 2);
    while (C.HEAP8[ip])
        C.HEAPU8[op++] = C.HEAP8[ip++];
}

export function genl_outrip(tmpwin, how, when)
{
    const rip_txt = C.NH320_DEDICATION ? rip_txt_dedication : rip_txt_normal;
    let dp;
    let dpx;
    const buf = C.stackAlloc(C.BUFSZ);
    let x;
    let line, year;
    let cash;

    C.gr.rip = dp = C.alloc(rip_txt.length * C.pointerSize);
    for (x = 0; rip_txt[x]; ++x)
        C.storePointer(dp + x * C.pointerSize, C.dupstr(rip_txt[x]));
    C.storePointer(dp + x * C.pointerSize, 0);

    /* Put name on stone */
    C.Sprintf(buf, "%.*s", STONE_LINE_LEN, C.svp.plname);
    center(NAME_LINE, buf);

    /* Put $ on stone */
    cash = C.gd.done_money > 0n ? C.gd.done_money : 0n;
    /* arbitrary upper limit; practical upper limit is quite a bit less */
    if (cash > 999999999n)
        cash = 999999999n;
    C.Sprintf(buf, "%ld Au", cash);
    center(GOLD_LINE, buf);

    /* Put together death description */
    C.formatkiller(buf, C.BUFSZ, how, 0);

    /* Put death type on stone */
    for (line = DEATH_LINE, dpx = buf; line < YEAR_LINE; line++) {
        let tmpchar;
        let i, i0 = C.strlen(dpx) | 0;

        if (i0 > STONE_LINE_LEN) {
            for (i = STONE_LINE_LEN; (i > 0) && (i0 > STONE_LINE_LEN); --i)
                if (C.HEAP8[dpx + i] == 32)
                    i0 = i;
            if (!i)
                i0 = STONE_LINE_LEN;
        }
        tmpchar = C.HEAP8[dpx + i0];
        C.HEAPU8[dpx + i0] = 0;
        center(line, dpx);
        if (tmpchar != 32) {
            C.HEAPU8[dpx + i0] = tmpchar;
            dpx = dpx + i0;
        } else
            dpx = dpx + i0 + 1;
    }

    /* Put year on stone */
    year = Number((C.yyyymmdd(when) / 10000n) % 10000n);
    C.Sprintf(buf, "%4d", year);
    center(YEAR_LINE, buf);

    if (C.DUMPLOG && tmpwin == 0)
        C.dump_forward_putstr(0, 0, "Game over:", 1);
    else
        C.putstr(tmpwin, 0, "");

    for (; C.pointer(dp); dp += C.pointerSize)
        C.putstr(tmpwin, 0, C.pointer(dp));

    C.putstr(tmpwin, 0, "");
    if (!C.DUMPLOG || tmpwin != 0)
        C.putstr(tmpwin, 0, "");

    for (x = 0; rip_txt[x]; x++) {
        C.free(C.pointer(C.gr.rip + x * C.pointerSize));
    }
    C.free(C.gr.rip);
    C.gr.rip = 0;
}

/* TEXT_TOMBSTONE */

/*rip.c*/
