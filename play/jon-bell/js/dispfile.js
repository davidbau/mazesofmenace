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
// pinned by the recorded frames: dlb_fopen the file, putstr every line verbatim
// into a create_nhwindow(NHW_TEXT) window, display_nhwindow.  That is the same
// full-screen text window com_pager.js/build_text_window_screen already models
// for pager.c's look_all scans — 23 lines per page, "--More--" on row 23 with
// the cursor at column 8, one quitchars[] keystroke per page.
//
//   dat/help     10/10 pages (steps 113-122)   dat/optmenu    2/2 (180-181)
//   dat/hh        7/7   pages (steps 125-131)  dat/usagehlp   7/7 (200-206)
//   dat/history  15/15 pages (steps 134-148)   dat/license    5/5 (209-213)
//
// DISPLAY-CHANNEL ONLY: display_file consumes keystrokes, never RNG.

import { dat_content } from './dat_source.js';

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



export function dlb_file_lines(fname) {
    if (_cache.has(fname))
        return _cache.get(fname);
    /* dat_content() is called OUTSIDE any catch on purpose: a "this name
     * differs between 3.7 and 5.0 and was never vendored" throw must not be
     * laundered into C's benign "Cannot open" arm.  (No topic constant below
     * is in that set today, so this cannot fire — it is here so it stays
     * true.) */
    const raw = dat_content(fname);
    const lines = raw === null ? null : raw.replace(/\n$/, '').split('\n');
    _cache.set(fname, lines);
    return lines;
}
