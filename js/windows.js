// windows.js -- NetHack windowing abstraction layer
// Mirrors src/windows.c + win/tty/wintty.c + win/tty/topl.c

import { nhgetch as defaultNhgetch } from './input.js';

// Window types (wintype.h)
export const NHW_MESSAGE    = 1;
export const NHW_STATUS     = 2;
export const NHW_MAP        = 3;
export const NHW_MENU       = 4;
export const NHW_TEXT       = 5;
export const NHW_PERMINVENT = 6;

// Selection modes (winprocs.h)
export const PICK_NONE = 0;
export const PICK_ONE  = 1;
export const PICK_ANY  = 2;

// Menu behaviours
export const MENU_BEHAVE_STANDARD = 0;
export const MENU_BEHAVE_PERMINV  = 1;

// Text attributes (color.h ATR_*)
export const ATR_NONE      =  0;
export const ATR_ULINE     =  1;
export const ATR_BOLD      =  2;
export const ATR_BLINK     =  4;
export const ATR_INVERSE   =  8;
export const ATR_URGENT    = 16;
export const ATR_NOHISTORY = 32;

// Window ID globals (mirrors decl.c WIN_MESSAGE / WIN_MAP etc.)
export let WIN_MESSAGE, WIN_STATUS, WIN_MAP, WIN_INVEN, BASE_WINDOW;

// --- Internal module state ---
const MAXWIN = 20;
const wins = new Array(MAXWIN).fill(null);

const ttyDisplay = {
    toplin: 0,    // TOPLINE_EMPTY
    inmore: false,
    inread: false,
};

const TOPLINE_EMPTY     = 0;
const TOPLINE_NON_EMPTY = 1;
// const TOPLINE_NEED_MORE = 2;  // reserved for future use

let _display          = null;
let _nhgetch          = defaultNhgetch;
let _rerenderCallback = null;

// WinDesc: mirrors struct WinDesc in win/tty/wintty.h
class WinDesc {
    constructor(type) {
        this.type      = type;
        this.flags     = 0;
        this.active    = false;
        this.mbehavior = MENU_BEHAVE_STANDARD;
        this.data      = [];   // message history or text lines
        this.mlist     = [];   // [{glyphinfo, id, ch, gch, attr, clr, str, itemflags}]
        this.how       = PICK_NONE;
        this.prompt    = '';
    }
}

function allocWin() {
    for (let i = 1; i < MAXWIN; i++) {
        if (!wins[i]) return i;
    }
    throw new Error('nhwindow: out of window slots');
}

// init_nhwindows(display, nhgetch_fn, rerenderFn)
// C ref: tty_init_nhwindows()
export function init_nhwindows(display, nhgetch_fn, rerenderFn) {
    _display          = display;
    if (nhgetch_fn) _nhgetch = nhgetch_fn;
    _rerenderCallback = rerenderFn || null;

    wins.fill(null);
    ttyDisplay.toplin = TOPLINE_EMPTY;
    ttyDisplay.inmore = false;
    ttyDisplay.inread = false;

    WIN_MESSAGE = allocWin();
    wins[WIN_MESSAGE] = new WinDesc(NHW_MESSAGE);
    BASE_WINDOW = WIN_MESSAGE;
}

// create_nhwindow(type) — C ref: tty_create_nhwindow()
export function create_nhwindow(type) {
    const id = allocWin();
    wins[id] = new WinDesc(type);
    return id;
}

// clear_nhwindow(win) — C ref: tty_clear_nhwindow()
export function clear_nhwindow(win) {
    const w = wins[win];
    if (!w) return;
    w.data   = [];
    w.mlist  = [];
    w.how    = PICK_NONE;
    w.prompt = '';
}

// display_nhwindow(win, blocking) — C ref: tty_display_nhwindow()
export async function display_nhwindow(win, blocking) {
    const w = wins[win];
    if (!w) return;
    if (w.type === NHW_MESSAGE && blocking && ttyDisplay.toplin === TOPLINE_NON_EMPTY) {
        if (_display?.putstr_message) _display.putstr_message('--More--');
        await _nhgetch();
        ttyDisplay.toplin = TOPLINE_EMPTY;
    }
}

// destroy_nhwindow(win) — C ref: tty_destroy_nhwindow()
// Frees the window slot; for menu/text windows triggers a game-view rerender.
export function destroy_nhwindow(win) {
    const w = wins[win];
    if (!w) return;
    const type = w.type;
    wins[win] = null;
    if ((type === NHW_MENU || type === NHW_TEXT) && _rerenderCallback) {
        _rerenderCallback();
    }
}

// putstr(win, attr, str) — C ref: tty_putstr()
export function putstr(win, attr, str) {
    const w = wins[win];
    if (!w) return;
    if (w.type === NHW_MESSAGE) {
        if (!(attr & ATR_NOHISTORY)) {
            w.data.push(str);
            if (w.data.length > 20) w.data.shift();
        }
        ttyDisplay.toplin = TOPLINE_NON_EMPTY;
        if (_display?.putstr_message) _display.putstr_message(str);
    } else {
        w.data.push({ attr, str });
    }
}

// start_menu(win, mbehavior) — C ref: tty_start_menu()
export function start_menu(win, mbehavior) {
    const w = wins[win];
    if (!w) return;
    w.mbehavior = mbehavior ?? MENU_BEHAVE_STANDARD;
    w.mlist     = [];
    w.data      = [];
    w.prompt    = '';
}

// add_menu(win, glyphinfo, id, ch, gch, attr, clr, str, itemflags) — C ref: tty_add_menu()
export function add_menu(win, glyphinfo, id, ch, gch, attr, clr, str, itemflags) {
    const w = wins[win];
    if (!w) return;
    w.mlist.push({ glyphinfo, id, ch, gch, attr, clr, str, itemflags });
}

// end_menu(win, prompt) — C ref: tty_end_menu()
// Assigns auto-selector letters (a-z, A-Z) to items that have ch === 0.
export function end_menu(win, prompt) {
    const w = wins[win];
    if (!w) return;
    w.prompt = prompt ?? '';
    let autoChar = 'a'.charCodeAt(0);
    for (const item of w.mlist) {
        if (!item.ch) {
            item.ch = autoChar;
            if (autoChar === 'z'.charCodeAt(0))      autoChar = 'A'.charCodeAt(0);
            else if (autoChar === 'Z'.charCodeAt(0)) autoChar = 0; // exhausted
            else                                      autoChar++;
        }
    }
}

// Build the lines array that will be shown in a menu overlay.
function buildMenuLines(w) {
    const lines = [];
    if (w.prompt) lines.push(w.prompt);
    lines.push('');
    for (const item of w.mlist) {
        const sel = item.ch ? String.fromCharCode(item.ch) + ' - ' : '    ';
        lines.push(sel + item.str);
    }
    return lines;
}

// select_menu(win, how) — C ref: tty_select_menu()
// Returns [{identifier, count}] for selected items, or null for no selection.
export async function select_menu(win, how) {
    const w = wins[win];
    if (!w) return null;
    w.how = how;

    const lines = buildMenuLines(w);
    if (_display) {
        if (typeof _display.renderChargenMenu === 'function') {
            _display.renderChargenMenu(lines, false);
        }
    }

    if (how === PICK_NONE) {
        await _nhgetch();
        return null;
    }

    if (how === PICK_ONE) {
        while (true) {
            const ch = await _nhgetch();
            // ESC, 'q', space, Enter — cancel
            if (ch === 27 || ch === 'q'.charCodeAt(0)
                || ch === ' '.charCodeAt(0) || ch === 13 || ch === 10) {
                return null;
            }
            const item = w.mlist.find(i => i.ch === ch);
            if (item) return [{ identifier: item.id, count: -1 }];
        }
    }

    if (how === PICK_ANY) {
        const selected = new Set();
        while (true) {
            const ch = await _nhgetch();
            if (ch === 13 || ch === 10) {
                // Enter — confirm selection
                const result = [];
                for (const item of w.mlist) {
                    if (item.ch && selected.has(item.ch)) {
                        result.push({ identifier: item.id, count: -1 });
                    }
                }
                return result.length > 0 ? result : null;
            }
            if (ch === 27 || ch === 'q'.charCodeAt(0)) return null;
            if (ch === '.'.charCodeAt(0)) {
                for (const item of w.mlist) if (item.ch) selected.add(item.ch);
            } else if (ch === '-'.charCodeAt(0)) {
                selected.clear();
            } else if (ch === ' '.charCodeAt(0)) {
                // Toggle all
                if (selected.size > 0) selected.clear();
                else for (const item of w.mlist) if (item.ch) selected.add(item.ch);
            } else {
                const item = w.mlist.find(i => i.ch === ch);
                if (item && item.ch) {
                    if (selected.has(item.ch)) selected.delete(item.ch);
                    else selected.add(item.ch);
                }
            }
        }
    }

    return null;
}
