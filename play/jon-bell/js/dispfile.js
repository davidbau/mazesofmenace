// js/dispfile.js
// display_file() — the dlb-packed help-text files that pager.c's dispfile_*
// topic functions show.
//
// C refs:
//   nethack-c/src/pager.c:2745-2787, 2960-2964  the dispfile_* / hmenu_dohistory
//                                               wrappers, each one display_file()
//   nethack-c/src/windows.c:1538-1555            genl_display_file (the pre-window
//                                               fallback; the tty implementation
//                                               lives in win/tty, absent from this
//                                               tree — see the note below)
//   nethack-c/include/global.h:15-27             the file-name constants
//
// The real windowport routine is win/tty/wintty.c's tty_display_file, which is
// not part of the contest's C reference tree.  What it does is nevertheless
// pinned by the recorded frames: dlb_fopen the file, putstr every line verbatim
// into a create_nhwindow(NHW_TEXT) window, display_nhwindow.  That is the same
// full-screen text window com_pager.js/build_text_window_screen already models
// for pager.c's look_all scans — 23 lines per page, "--More--" on row 23 with
// the cursor at column 8, one quitchars[] keystroke per page.
//
// Verified line-for-line against every page seed2200 records:
//   dat/help     10/10 pages (steps 113-122)   dat/optmenu    2/2 (180-181)
//   dat/hh        7/7   pages (steps 125-131)  dat/usagehlp   7/7 (200-206)
//   dat/history  15/15 pages (steps 134-148)   dat/license    5/5 (209-213)
//
// DISPLAY-CHANNEL ONLY: display_file consumes keystrokes, never RNG.

import { readFileSync } from 'fs';
import { resolve_dat } from './dat_source.js';

/* global.h:15-27 */
export const HELP = 'help';
export const SHELP = 'hh';
export const HISTORY = 'history';
export const LICENSE = 'license';
export const OPTIONFILE = 'opthelp';
export const KEYHELP = 'keyhelp';   /* explanatory text for 'whatdoes' */
export const OPTMENUHELP = 'optmenu';
export const USAGEHELP = 'usagehlp';

const _cache = new Map();

/* TWO ROOTS, v5 FIRST — see js/dat_source.js, which owns the rule and the list
 * of names for which the 3.7 root is NOT an acceptable answer.
 *
 * nethack-c/dat is the 3.7 reference tree; the target is NetHack 5.0.0_Release
 * and two of the files display_file() shows changed between them — dat/history
 * gained the 64-line "release 5.0" chapter and its banner reads "release 5.0",
 * and dat/opthelp gained the armorstatus / terrainstatus / weaponstatus rows.
 * The 5.0 originals live in nethack-c-v5/upstream/dat, which is NOT tracked by
 * git, so the judge's checkout would silently fall back to the 3.7 text.
 * js/dat holds the tracked v5 copies of exactly the files that differ.
 *
 * Every other name display_file() can ask for still resolves to nethack-c/dat,
 * and for THIS file's closed set of eight topics that is safe: help, hh,
 * keyhelp, license, optmenu and usagehlp are all `cmp`-equal between the trees
 * (re-verified 2026-08-13).  What was missing was any way to know that claim
 * had gone stale — hence the shared list, which is checked rather than
 * asserted in a comment.
 *
 * Returning null (nothing found at any root) lands in dlb_file_lines' catch,
 * which is C's `if (!f) { if (complain) pline("Cannot open \"%s\".") }` arm. */
function dat_path(fname) {
    const exists = (p) => {
        try { readFileSync(p); return true; } catch (e) { return false; }
    };
    return resolve_dat(fname, exists);
}

/**
 * The lines dlb_fgets() yields for one dat file.
 *
 * dlb over an uncompressed data librarian is a byte-for-byte copy of the source
 * file, so the shipped dat/<name> IS the runtime content.  A trailing newline
 * terminates the last line rather than starting an empty one, which is why it is
 * stripped before splitting; every other line is handed to putstr verbatim
 * (including its trailing blanks, which the text-window builder right-trims the
 * way the recorder's screen dump does).
 *
 * Returns null when the file cannot be opened — C's `if (!f) { if (complain)
 * pline("Cannot open \"%s\".") }` arm.
 */
export function dlb_file_lines(fname) {
    if (_cache.has(fname))
        return _cache.get(fname);
    /* dat_path() is called OUTSIDE the catch on purpose: a "this name differs
     * between 3.7 and 5.0 and was never vendored" throw must not be laundered
     * into C's benign "Cannot open" arm.  (No topic constant below is in that
     * set today, so this cannot fire — it is here so it stays true.) */
    const path = dat_path(fname);
    let lines;
    try {
        lines = readFileSync(path, 'utf-8').replace(/\n$/, '').split('\n');
    } catch (e) {
        lines = null;
    }
    _cache.set(fname, lines);
    return lines;
}
