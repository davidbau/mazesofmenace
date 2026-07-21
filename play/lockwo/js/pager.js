// pager.js — help/pager commands (pager.c).
//
// C ref: src/pager.c dohelp() (the '?' command) and the shared display_file()
// path.  dohelp() pops a PICK_ONE menu of help topics ("Select one item:") and
// runs the chosen topic's handler; most handlers display a full-screen NHW_TEXT
// window (version info, the long-description help file, the license, etc.).
//
// The menu is an overlay NHW_MENU (offx > 0): the columns to its left and the
// rows below it keep showing the underlying map, exactly like C's tty
// tty_display_nhwindow() which repaints only the window's own cells.  The topic
// windows are full-screen NHW_TEXT windows paged with "--More--".
//
// No dungeon RNG is consumed and no game time elapses (dohelp returns ECMD_OK).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { render_map_to_grid, pline, topl_more, flush_screen } from './display.js';
import { renderWindowScreen, dismiss_invent_screen } from './invent.js';
import { doextversion } from './version.js';
import { NO_COLOR, ATR_INVERSE } from './terminal.js';
import { HELP, SHELP, HISTORY, OPTIONFILE, OPTMENUHELP, USAGEHELP, LICENSE }
    from './pager_data.js';
import { EXTCMD_TABLE } from './cmd_data.js';

const COLS = 80;
const ROWS = 24;

function disp() { return game.nhDisplay; }

// ---------------------------------------------------------------------------
// Shared full-screen text-window pager.
//
// C ref: win/tty/wintty.c process_text_window() — a full-screen NHW_TEXT window
// shows (rows-1) = 23 content lines per page, with "--More--" parked at row
// (rows-1) = 23; every page (including the last) shows "--More--" because dmore
// falls back to defmorestr for text windows.  The --More-- prompt is
// xwaitforspace(quitchars) with quitchars = " \r\n\033": <space>/<return>
// advance to the next page (and dismiss after the last), <esc> cancels the rest
// of the document, and any OTHER key rings the bell and is ignored — the same
// page stays shown and is re-read.  On dismissal tty tears the window down and
// the map is redrawn (docrt), which dismiss_invent_screen() reproduces.
//
// `lines` may be plain strings (ATR_NONE) or {text, attr} objects.
export async function display_text_window(lines) {
    const perPage = ROWS - 1; // 23 content lines; footer on row 23
    const pages = [];
    for (let i = 0; i < lines.length; i += perPage)
        pages.push(lines.slice(i, i + perPage));
    if (pages.length === 0) pages.push([]);

    let pi = 0;
    while (pi < pages.length) {
        renderWindowScreen(pages[pi], {
            menu: false,
            footer: '--More--',
            footerRow: ROWS - 1,
            footerCol: 0,
            modal: 'textwin',
        });
        const c = await nhgetch();
        if (c === 27) break;                       // ESC: cancel remaining pages
        if (c === 32 || c === 13 || c === 10) { pi++; continue; } // advance
        // any other key: ignored (bell) — re-render the same page and re-read
    }
    // Tear the window down and restore the map (docrt + flush_screen).
    await dismiss_invent_screen();
}

// C ref: pager.c display_file(fname, complain) -> win/tty/wintty.c
// tty_display_file(): read the named help/data file line by line (newline
// stripped, tabs expanded) into a full-screen NHW_TEXT window and page it with
// "--More--".  The file contents are build-constant, embedded in pager_data.js.
export async function display_file(lines) {
    await display_text_window(lines);
}

// ---------------------------------------------------------------------------
// dohelp() — the '?' help menu.

// C ref: pager.c help_menu_items[] — the ordered list of help topics.  Each
// entry has a display string and a handler.  dispfile_debughelp ("List of
// wizard-mode commands.") is only shown in debug/wizard mode; the '%s' text
// slot is the "Using the ... command to set options." line, whose %s is filled
// by setopt_cmd() — for this build (O bound to doset_simple, #optionsfull with
// no key) that expands to "'#optionsfull' or 'm O'".
const HELP_MENU_ITEMS = [
    { text: 'About NetHack (version information).', fn: hmenu_doextversion },
    { text: 'Long description of the game and commands.', fn: dispfile_help },
    { text: 'List of game commands.', fn: dispfile_shelp },
    { text: 'Concise history of NetHack.', fn: dohistory },
    { text: 'Info on a character in the game display.', fn: null },
    { text: 'Info on what a given key does.', fn: dowhatdoes },
    { text: 'List of game options.', fn: null },
    { text: 'Longer explanation of game options.', fn: dispfile_optionfile },
    { text: "Using the '#optionsfull' or 'm O' command to set options.", fn: dispfile_optmenu },
    { text: 'Full list of keyboard commands.', fn: null },
    { text: 'List of extended commands.', fn: null },
    { text: 'List menu control keys.', fn: null },
    { text: "Description of NetHack's command line.", fn: dispfile_usagehelp },
    { text: 'The NetHack license.', fn: dispfile_license },
    { text: 'Support information.', fn: null },
    { text: 'List of wizard-mode commands.', fn: null, wizonly: true },
];

// C ref: pager.c hmenu_doextversion()/dispfile_*()/dohistory() — thin wrappers
// that each display one help/data file (or the version info) full-screen.
async function hmenu_doextversion() { await doextversion(); }
async function dispfile_help() { await display_file(HELP); }
async function dispfile_shelp() { await display_file(SHELP); }
async function dohistory() { await display_file(HISTORY); }
async function dispfile_optionfile() { await display_file(OPTIONFILE); }
async function dispfile_optmenu() { await display_file(OPTMENUHELP); }
async function dispfile_usagehelp() { await display_file(USAGEHELP); }
async function dispfile_license() { await display_file(LICENSE); }

// ---------------------------------------------------------------------------
// dowhatdoes() — the "Info on what a given key does" help choice ('?f'), also
// the #whatdoes extended command.  C ref: pager.c dowhatdoes().

// C ref: hacklib.c visctrl() — printable representation of a key: M- prefix for
// the meta bit, ^X for control chars, ^? for DEL, else the character itself.
function visctrl(c) {
    let out = '';
    if (c & 0x80) out += 'M-';
    c &= 0x7f;
    if (c < 0o40) out += '^' + String.fromCharCode(c | 0o100);
    else if (c === 0o177) out += '^' + String.fromCharCode(c & ~0o100);
    else out += String.fromCharCode(c);
    return out;
}

// C ref: cmd.c key2txt() — like visctrl() but with word forms for the keys
// whose visctrl form would be ambiguous/unreadable in a help listing.
function key2txt(c) {
    if (c === 0x20) return '<space>';
    if (c === 0o33) return '<esc>';
    if (c === 0x0a) return '<enter>';
    if (c === 0o177) return '<del>';
    return visctrl(c);
}

// Default rogue-like movement keys (number_pad off): walk = h j k l y u b n,
// run = the capitalized forms, rush = the Ctrl forms.  C ref: cmd.c movecmd()
// against the default gc.Cmd movement keymap.
const DIRLETTERS = 'hjklyubn';
function movecmd(key, mode) {
    const ch = String.fromCharCode(key & 0xff);
    if (mode === 'walk') return DIRLETTERS.includes(ch);
    if (mode === 'run') return DIRLETTERS.toUpperCase().includes(ch);
    if (mode === 'rush') {
        for (const d of DIRLETTERS) if ((d.charCodeAt(0) & 0x1f) === key) return true;
        return false;
    }
    return false;
}

// key -> extcmdlist entry, from the default key bindings (cmd.c reset_commands
// binds each extcmdlist entry's default key; later entries override earlier).
const KEY2CMD = (() => {
    const m = new Map();
    for (const e of EXTCMD_TABLE)
        if (e.key !== null && e.key !== 0) m.set(e.key, e);
    return m;
})();

// C ref: cmd.c key2extcmddesc() — describe the command bound to a key.  Checks
// movement (walk/run/rush) and count digits and the ESC prefix before the
// extended-command binding, then formats "<desc> (#<txt>)" with the reqmenu
// two-line and "(##)" special cases.  Returns null when the key is unbound.
function key2extcmddesc(key) {
    if (movecmd(key, 'walk')) return 'move';
    if (movecmd(key, 'rush')) return 'rush';
    if (movecmd(key, 'run')) return 'run';
    const ch = String.fromCharCode(key & 0xff);
    if (ch >= '0' && ch <= '9') return 'start of, or continuation of, a count';
    if (key === 0o33) return 'cancel current prompt or pending prefix';
    const e = KEY2CMD.get(key);
    if (e && e.txt) {
        let buf = `${e.desc} (#${e.txt})`;
        if (/^prefix:/i.test(buf) && /^reqmenu$/i.test(e.txt))
            buf = buf.replace(/prefix:/i,
                'movement prefix: move without autopickup and without attacking'
                + '\nnon-movement prefix:');
        return buf.replace(' (##)', '');
    }
    return null;
}

// C ref: pager.c dowhatdoes_core() — build the one-line "<key padded to 8><desc>."
// description for key q, or null if it is not a command.
function dowhatdoes_core(q) {
    const ec_desc = key2extcmddesc(q & 0xff);
    if (ec_desc !== null) {
        const kt = key2txt(q & 0xff);
        return kt.padEnd(8, ' ') + ec_desc + '.';
    }
    return null;
}

// C ref: pager.c dowhatdoes() — "Ask about '&' or '?'..." shown once, then the
// bare "What command? " prompt (yn_function with NULL resp: reads any single
// key), then the key's description is plined.  Returns ECMD_OK (no game time).
async function dowhatdoes() {
    let needMore = false;
    if (!game._dowhatdoes_once) {
        await pline("Ask about '&' or '?' to get more info.");
        game._dowhatdoes_once = true;
        needMore = true;
    }
    // yn_function("What command?", NULL, '\0', TRUE): more() the pending
    // top-line message, then show "What command? " and read one raw key.
    if (needMore) await topl_more();
    const full = 'What command? ';
    game._pending_message = full;
    game._toplines = full;
    await flush_screen(1);
    const d = disp();
    game._modal_screen = 'topl';
    if (d?.setCursor) d.setCursor(Math.min(full.length, COLS - 1), 0);
    const q = await nhgetch();
    delete game._modal_screen;

    const reslt = dowhatdoes_core(q);
    if (reslt !== null) {
        // No embedded newline for a single key (the '\n' path is only for the
        // 'm' reqmenu prefix, which isn't queried here).
        await pline(reslt);
    } else {
        const uq = q & 0xff;
        await pline(`No such command '${visctrl(uq)}', char code ${uq} (0${uq.toString(8).padStart(3, '0')} or 0x${uq.toString(16).padStart(2, '0')}).`);
    }
    return 0; // ECMD_OK
}

// Build the visible menu item list for this run (skip the wizard-mode-only
// entry outside debug mode), assigning a..z accelerators in order.
function buildHelpItems() {
    const wizard = !!game.flags?.debug;
    const items = [];
    let ch = 'a';
    for (const it of HELP_MENU_ITEMS) {
        if (it.wizonly && !wizard) continue;
        items.push({ accel: ch, text: it.text, fn: it.fn });
        ch = ch === 'z' ? 'A' : String.fromCharCode(ch.charCodeAt(0) + 1);
    }
    return items;
}

// C ref: win/tty/wintty.c tty_end_menu()/tty_display_nhwindow() — a single-page
// NHW_MENU overlay.  The window width cw->cols = max over items of
// (strlen(item)+2) [item = "<accel> - <body>"] and of the "(end) " morestr; the
// overlay column offx = max(10, COLNO - cols - 1).  The prompt "Select one
// item:" is prepended as a blank line + the title (both non-selectable).  Each
// row is drawn as a leading space at column offx followed by the item text at
// offx+1; the "(end) " footer sits on the row just past the last item with the
// cursor parked strlen("(end) ") past its start.  Columns left of offx and rows
// below the footer keep the underlying map.
export async function dohelp() {
    const items = buildHelpItems();

    // Menu line list, in display order: title, blank, then one line per item.
    // The prompt/title carries iflags.menu_headings (default "no-color&inverse")
    // via tty_menu_promptstyle, so it renders ATR_INVERSE; the rest are plain.
    const lines = [];
    lines.push({ text: 'Select one item:', attr: ATR_INVERSE });
    lines.push({ text: '', attr: 0 });
    for (const it of items) lines.push({ text: `${it.accel} - ${it.text}`, attr: 0 });

    // Window width and overlay column (see tty_end_menu()).
    let maxcol = 0;
    for (const ln of lines) maxcol = Math.max(maxcol, ln.text.length + 2);
    maxcol = Math.max(maxcol, '(end) '.length);
    let offx = Math.max(10, COLS - maxcol - 1);
    if (offx < 0) offx = 0;

    // Read one PICK_ONE selection.  A matching accelerator selects and ends the
    // menu; <esc>/<return>/<space> exit with no pick; other keys ring the bell
    // (re-read).  dohelp runs the chosen handler once and returns (no loop).
    let picked = -1;
    for (;;) {
        renderHelpMenu(offx, lines);
        game._modal_screen = 'menu';
        const c = await nhgetch();
        delete game._modal_screen;
        if (c === 27 || c === 13 || c === 10 || c === 32) break; // cancel / no pick
        const ch = String.fromCharCode(c);
        const idx = items.findIndex((it) => it.accel === ch);
        if (idx >= 0) { picked = idx; break; }
        // else: unknown accelerator, re-render and re-read
    }

    if (picked >= 0 && items[picked].fn) {
        await items[picked].fn();
    } else if (picked >= 0) {
        // Chosen topic not yet ported: dismiss the menu overlay back to the map
        // so the display is left in a consistent state (no window handler ran).
        game._modal_screen = 'menu';
        await dismiss_invent_screen();
    }
    return 0; // ECMD_OK
}

// Render the single-page help menu as an overlay: rebuild the map underneath
// (so the columns/rows the menu does not cover show the current level), clear
// the message line, then paint the menu on columns offx..79.
function renderHelpMenu(offx, lines) {
    const d = disp();
    if (!d?.setCell) return;
    d.clearScreen();          // blanks the grid incl. the message line (row 0)
    render_map_to_grid();     // map rows 1-21 + status rows 22-23 underneath

    for (let r = 0; r < lines.length; r++) {
        for (let c = offx; c < COLS; c++) d.setCell(c, r, ' ', NO_COLOR, 0);
        const ln = lines[r];
        if (ln && ln.text) d.putstr(offx + 1, r, ln.text, NO_COLOR, ln.attr || 0);
    }
    const footRow = lines.length;
    for (let c = offx; c < COLS; c++) d.setCell(c, footRow, ' ', NO_COLOR, 0);
    const morestr = '(end) ';
    d.putstr(offx + 1, footRow, morestr, NO_COLOR, 0);
    d.setCursor(offx + 1 + morestr.length, footRow);
}
