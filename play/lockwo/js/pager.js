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
import { option_help_lines } from './options.js';
import { NO_COLOR, ATR_INVERSE } from './terminal.js';
import { HELP, SHELP, HISTORY, OPTIONFILE, OPTMENUHELP, USAGEHELP, LICENSE }
    from './pager_data.js';
import { EXTCMD_TABLE } from './cmd_data.js';
// cmd.js <-> pager.js is a static cycle (cmd.js imports dohelp); both names
// crossing it are hoisted `export function` declarations, so it resolves.
import { Cmd_dirchars, Cmd_num_pad, Cmd_pcHack_compat } from './cmd.js';

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
    { text: 'List of game options.', fn: option_help },
    { text: 'Longer explanation of game options.', fn: dispfile_optionfile },
    { text: "Using the '#optionsfull' or 'm O' command to set options.", fn: dispfile_optmenu },
    { text: 'Full list of keyboard commands.', fn: dokeylist },
    { text: 'List of extended commands.', fn: null },
    { text: 'List menu control keys.', fn: domenucontrols },
    { text: "Description of NetHack's command line.", fn: dispfile_usagehelp },
    { text: 'The NetHack license.', fn: dispfile_license },
    { text: 'Support information.', fn: docontact },
    { text: 'List of wizard-mode commands.', fn: null, wizonly: true },
];

// C ref: pager.c hmenu_doextversion()/dispfile_*()/dohistory() — thin wrappers
// that each display one help/data file (or the version info) full-screen.
async function hmenu_doextversion() { await doextversion(); }
// C ref: options.c option_help() — full-screen text window listing all options.
async function option_help() { await display_text_window(option_help_lines()); }
async function dispfile_help() { await display_file(HELP); }
async function dispfile_shelp() { await display_file(SHELP); }
async function dohistory() { await display_file(HISTORY); }
async function dispfile_optionfile() { await display_file(OPTIONFILE); }
async function dispfile_optmenu() { await display_file(OPTMENUHELP); }
async function dispfile_usagehelp() { await display_file(USAGEHELP); }
async function dispfile_license() { await display_file(LICENSE); }

// C ref: pager.c docontact() — "Support information." full-screen text window.
// The sysopt.support / SYSCF-WIZARDS branches print a "local support" line only
// when the build's sysconf sets them; this build sets neither, so only the
// development-team lines show.  DEVTEAM_EMAIL / DEVTEAM_URL are build-constant
// macros from include/hack.h.
const DEVTEAM_EMAIL = 'devteam@nethack.org';
const DEVTEAM_URL = 'https://www.nethack.org/';
async function docontact() {
    await display_text_window([
        'To contact the NetHack development team directly,',
        `see the 'Contact' form on our website or email <${DEVTEAM_EMAIL}>.`,
        '',
        'For more information on NetHack, or to report a bug,',
        `visit our website "${DEVTEAM_URL}".`,
    ]);
}

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
function movecmd(key, mode) {
    // C ref: cmd.c reset_commands() — with number_pad the run key is M(digit)
    // and there is no per-direction rush key at all.
    const dirs = Cmd_dirchars().slice(0, 8);
    const ch = String.fromCharCode(key & 0xff);
    if (mode === 'walk') return dirs.includes(ch);
    if (Cmd_num_pad())
        return mode === 'run' && dirs.includes(String.fromCharCode(key & 0x7f));
    if (mode === 'run') return dirs.toUpperCase().includes(ch);
    if (mode === 'rush') {
        for (const d of dirs) if ((d.charCodeAt(0) & 0x1f) === key) return true;
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
    // C ref: cmd.c key2extcmddesc() digit block — with number_pad the digits
    // are movement, so only '5'/M-5 (the run|rush prefix, swapped by
    // pcHack_compat) and '0'/M-0 describe themselves; the rest fall through to
    // the command table.  Without number_pad every digit starts a count.
    if ((ch >= '0' && ch <= '9')
        || (Cmd_num_pad() && (key & 0x7f) >= 0x30 && (key & 0x7f) <= 0x39)) {
        const M_5 = 0x80 | 0x35, M_0 = 0x80 | 0x30;
        if (!Cmd_num_pad()) return 'start of, or continuation of, a count';
        if (key === 0x35 || key === M_5)
            return `${(!!Cmd_pcHack_compat() !== (key === M_5)) ? 'run' : 'rush'} prefix`;
        if (key === 0x30 || (Cmd_pcHack_compat() && key === M_0))
            return "synonym for 'i'";
    }
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
export async function dowhatdoes() {
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

// ---------------------------------------------------------------------------
// dokeylist() — "Full list of keyboard commands." ('?k').  C ref: cmd.c
// dokeylist(): a full-screen NHW_TEXT window that lists every key and the
// command bound to it (like dat/hh but generated from the live key bindings),
// grouped into Directional keys / Miscellaneous keys / Menu control keys /
// General commands / Game commands (/ Debug mode commands in wizard mode).
//
// The listing is entirely build-constant here: it derives from the command
// table (cmd_data.js EXTCMD_TABLE == cmd.c extcmdlist[]) and the default key
// bindings that cmd.c commands_init()/reset_commands() install.  No RNG and no
// game state (other than wizard mode) affect it.

// ANSI control / meta transforms (cmd.c C()/M() macros).
function ctrlKey(ch) { return ch.charCodeAt(0) & 0x1f; }
function metaKey(ch) { return (typeof ch === 'string' ? ch.charCodeAt(0) : ch) | 0x80; }
function padRight(s, n) { return s.length >= n ? s : s + ' '.repeat(n - s.length); }
function padLeft(s, n) { return s.length >= n ? s : ' '.repeat(n - s.length) + s; }
// The command's raw C flag expression is kept verbatim in cmd_data.js, so a
// flag test is a substring match on that expression.
function cmdHasFlag(e, f) { return !!e.flags && e.flags.includes(f); }

// cmd.c reset_commands() movement layout: sdir[] = "hykulnjb><"; the first 8
// chars are the direction keys W,NW,N,NE,E,SE,S,SW.
const NHKF_COUNT_KEY = 0x6e;   // cmd.c spkeys_binds[] NHKF_COUNT == 'n'

// Build the default key -> command map exactly as cmd.c installs it:
//   commands_init(): bind every extcmdlist entry with a non-zero default key
//   (later duplicates overwrite the binding), then the explicit bind_key()
//   overrides; reset_commands(): the movement keys (h/y/k/u/l/n/j/b and their
//   Shift and Ctrl forms) are then rebound to movement commands, overwriting
//   whatever those keys held.
function buildKeymap() {
    const map = new Map(); // key code -> extcmd entry
    for (const e of EXTCMD_TABLE) if (e.key) map.set(e.key, e);
    const byTxt = (t) => EXTCMD_TABLE.find((e) => e.txt === t);
    const overrides = [
        [ctrlKey('l'), 'redraw'], ['h'.charCodeAt(0), 'help'],
        ['j'.charCodeAt(0), 'jump'], ['k'.charCodeAt(0), 'kick'],
        ['l'.charCodeAt(0), 'loot'], [ctrlKey('n'), 'annotate'],
        ['N'.charCodeAt(0), 'name'], ['u'.charCodeAt(0), 'untrap'],
        ['5'.charCodeAt(0), 'run'], [metaKey('5'), 'rush'],
        ['-'.charCodeAt(0), 'fight'], [metaKey('O'), 'overview'],
        [metaKey('2'), 'twoweapon'], [metaKey('N'), 'name'],
    ];
    for (const [k, t] of overrides) { const e = byTxt(t); if (e) map.set(k, e); }
    // Movement rebind (MOVEMENTCMD) overwrites the movement keys; which keys
    // those are follows Cmd.dirchars, and with number_pad only the walk digit
    // and its Meta form are claimed (digits have no Shift/Ctrl form).
    const moveMarker = { txt: '', desc: '', flags: 'MOVEMENTCMD' };
    const num_pad = Cmd_num_pad();
    for (const ch of Cmd_dirchars().slice(0, 8)) {
        const lc = ch.charCodeAt(0);
        map.set(lc, moveMarker);                                  // walk
        if (num_pad) {
            map.set(0x80 | lc, moveMarker);                       // run (Meta)
        } else {
            map.set(ch.toUpperCase().charCodeAt(0), moveMarker);  // run (Shift)
            map.set(lc & 0x1f, moveMarker);                       // rush (Ctrl)
        }
    }
    return map;
}

// cmd.c keylist_func_has_key(): TRUE if extcmd is bound to some key that is
// not already flagged used.
function keylistFuncHasKey(keymap, extcmd, keysAlreadyUsed) {
    for (let i = 0; i < 256; i++) {
        if (keysAlreadyUsed[i]) continue;
        if (keymap.get(i) === extcmd) return true;
    }
    return false;
}

// cmd.c keylist_putcmds(): list (or, when docount, count) commands whose flags
// satisfy incl/excl.  Keyed commands come first (ascending key), then keyless
// commands in table order.  Mutates keysUsed only on the emit pass.
function keylistPutcmds(lines, keymap, keysUsed, docount, incl, excl) {
    const keysAlreadyUsed = keysUsed.slice();
    let count = 0;
    const inclOk = (e) => !incl.length || incl.some((f) => cmdHasFlag(e, f));
    const exclBad = (e) => excl.length && excl.some((f) => cmdHasFlag(e, f));
    for (let i = 0; i < 256; i++) {
        if (keysUsed[i]) continue;
        if (i === 0x20) continue; // ' ' unbound unless rest_on_space (default off)
        const b = keymap.get(i);
        if (b) {
            if (!inclOk(b) || exclBad(b)) continue;
            if (docount) { count++; continue; }
            lines.push(padRight(key2txt(i), 7) + ' ' + padRight(b.txt, 13) + ' ' + b.desc);
            keysUsed[i] = true;
        }
    }
    for (const e of EXTCMD_TABLE) {
        if (!inclOk(e) || exclBad(e)) continue;
        if (keylistFuncHasKey(keymap, e, keysAlreadyUsed)) continue;
        if (docount) { count++; continue; }
        lines.push('#' + padRight(e.txt, 20) + ' ' + e.desc);
    }
    return count;
}

// options.c default_menu_cmd_info[] with the default menu command keys (the
// MENU_* constant chars) and options.c show_menu_controls(win, TRUE) layout.
const MENU_CMD_INFO = [
    ['>', 'Go to next page'], ['<', 'Go to previous page'],
    ['^', 'Go to first page'], ['|', 'Go to last page'],
    ['.', 'Select all items in entire menu'], ['@', 'Invert selection for all items'],
    ['-', 'Unselect all items in entire menu'], [',', 'Select all items on current page'],
    ['~', "Invert current page's selections"], ['\\', 'Unselect all items on current page'],
    [':', 'Search and invert matching items'],
];
const MENU_CTRL_HARDCODED = [
    ['Return', 'Accept current choice(s) and dismiss menu'],
    ['Enter', 'Same as Return'],
    ['Space', 'If not on last page, advance one page;'],
    ['     ', 'when on last page, treat like Return'],
    ['Escape', 'Cancel menu without making any choice(s)'],
];

async function dokeylist() {
    const wizard = !!game.flags?.debug;
    const keymap = buildKeymap();
    const lines = [];
    const dirchars = Cmd_dirchars();
    const num_pad = Cmd_num_pad();
    const dc = (i) => dirchars[i];

    lines.push('');
    lines.push(padLeft('', 7) + ' ' + '    Full Current Key Bindings List');
    lines.push(padLeft('', 7) + ' ' + '(also commands with no key assignment)');

    // Directional keys — show_direction_keys(win, '.', FALSE).
    lines.push('');
    lines.push('Directional keys:');
    lines.push('          ' + dc(1) + '  ' + dc(2) + '  ' + dc(3));
    lines.push('           \\ | / ');
    lines.push('          ' + dc(0) + '- . -' + dc(4));
    lines.push('           / | \\ ');
    lines.push('          ' + dc(7) + '  ' + dc(6) + '  ' + dc(5));
    lines.push('');
    // C ref: cmd.c dokeylist() — with number_pad the Ctrl rush paragraph is
    // dropped entirely and the run modifier is "Meta" rather than "Shift".
    if (!num_pad) {
        lines.push('Ctrl+<direction> will run in specified direction until something very');
        lines.push(padLeft('', 7) + ' ' + 'interesting is seen.');
    }
    lines.push((num_pad ? 'Meta' : 'Shift')
               + '+<direction> will run in specified direction until you encounter');
    lines.push(padLeft('', 7) + ' ' + 'an obstacle.');

    // Miscellaneous keys — misc_keys[]: <esc> always, the count prefix only
    // when number_pad is on (cmd.c misc_keys[].numpad) + the SIGINT line for ^C.
    lines.push('');
    lines.push('Miscellaneous keys:');
    lines.push(padRight(key2txt(0o33), 7) + ' ' + 'cancel current prompt or pending prefix');
    if (num_pad)
        lines.push(padRight(key2txt(NHKF_COUNT_KEY), 7)
                   + ' ' + 'Prefix: for digits when preceding a command with a count');
    lines.push(padRight(key2txt(ctrlKey('c')), 7) + ' interrupt: break out of NetHack (SIGINT)');

    // Menu control keys — show_menu_controls(win, TRUE).
    lines.push('');
    lines.push('Menu control keys:');
    for (const [k, d] of MENU_CMD_INFO)
        lines.push(padRight(visctrl(k.charCodeAt(0)), 7) + ' ' + d);
    for (const [k, d] of MENU_CTRL_HARDCODED)
        lines.push('' + padRight(k, 7) + ' ' + d);

    // keys_used: ^C reserved (NO_SIGNAL) + <esc> (the one active misc_key).
    const keysUsed = new Array(256).fill(false);
    keysUsed[ctrlKey('c')] = true;
    keysUsed[0o33] = true;
    if (num_pad) keysUsed[NHKF_COUNT_KEY] = true;   // misc_keys[] NHKF_COUNT

    const IGNORE = ['WIZMODECMD', 'INTERNALCMD', 'MOVEMENTCMD'];
    if (keylistPutcmds(lines, keymap, keysUsed, true, ['GENERALCMD'], IGNORE)) {
        lines.push('');
        lines.push('General commands:');
        keylistPutcmds(lines, keymap, keysUsed, false, ['GENERALCMD'], IGNORE);
    }
    if (keylistPutcmds(lines, keymap, keysUsed, true, [], ['GENERALCMD', ...IGNORE])) {
        lines.push('');
        lines.push('Game commands:');
        keylistPutcmds(lines, keymap, keysUsed, false, [], ['GENERALCMD', ...IGNORE]);
    }
    if (wizard && keylistPutcmds(lines, keymap, keysUsed, true, ['WIZMODECMD'], ['INTERNALCMD'])) {
        lines.push('');
        lines.push('Debug mode commands:');
        keylistPutcmds(lines, keymap, keysUsed, false, ['WIZMODECMD'], ['INTERNALCMD']);
    }

    await display_text_window(lines);
}

// domenucontrols() — "List menu control keys." ('?l').  C ref: pager.c
// domenucontrols() -> options.c show_menu_controls(win, FALSE): a two-column
// "Whole Menu / Current Page" table of the default menu command keys, then the
// hardcoded Return/Enter/Space/Escape entries.  All keys are the get_menu_cmd_key
// defaults (the MENU_* constant chars); has_menu_shift is off for tty so the
// "Pan view" rows are omitted.
async function domenucontrols() {
    const lines = [];
    const mcFmt = (a, b, c) => padLeft(a, 8) + '     ' + padRight(b, 6) + ' ' + c;
    const mcAlt = (a, b, c) => padLeft(a, 9) + '  ' + padRight(b, 6) + ' ' + c;
    const vc = (ch) => visctrl(ch.charCodeAt(0));

    lines.push('Menu control keys:');
    lines.push('');
    lines.push(mcAlt('', 'Whole', 'Current'));
    lines.push(mcAlt('', ' Menu', ' Page'));
    lines.push(mcFmt('Select', vc('.'), vc(',')));
    lines.push(mcFmt('Invert', vc('@'), vc('~')));
    lines.push(mcFmt('Deselect', vc('-'), vc('\\')));
    lines.push('');
    lines.push(mcFmt('Go to', vc('>'), 'Next page'));
    lines.push(mcFmt('', vc('<'), 'Previous page'));
    lines.push(mcFmt('', vc('^'), 'First page'));
    lines.push(mcFmt('', vc('|'), 'Last page'));
    lines.push('');
    lines.push(mcFmt('Search', vc(':'),
        'Exter a target string and invert all matching entries'));
    lines.push('');
    // hardcoded[]: fmt "%9s  %-8s %s"; first row prefixed "Other ", then blank.
    let arg = 'Other ';
    for (const [k, d] of MENU_CTRL_HARDCODED) {
        lines.push(padLeft(arg, 9) + '  ' + padRight(k, 8) + ' ' + d);
        arg = '';
    }
    await display_text_window(lines);
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

// ---------------------------------------------------------------------------
// The tty PICK_ONE menu response loop, and do_look()'s "What do you want to
// look at:" menu that uses it.
//
// C ref: win/tty/wintty.c process_menu_window() (cw->how == PICK_ONE) plus
// win/tty/getline.c xwaitforspace(resp), which does the accept/bell filtering
// BEFORE the menu switch ever sees the key.  The port previously read a single
// key and treated anything unrecognised as a cancel; C rings the bell and
// re-reads with the menu still on screen, so every stray keystroke over an open
// menu left our display a whole command out of step.

// wintype.h MENU_* menu-window keyboard commands, in win/tty/wintty.c
// default_menu_cmds[] order.  MENUCOMMAND bindings would populate
// gm.mapped_menu_cmds/gm.mapped_menu_op; with none set map_menu_cmd() is the
// identity, which is the only case reachable from a config-less recording.
const MENU_FIRST_PAGE = '^', MENU_LAST_PAGE = '|', MENU_NEXT_PAGE = '>',
      MENU_PREVIOUS_PAGE = '<', MENU_SELECT_ALL = '.', MENU_UNSELECT_ALL = '-',
      MENU_INVERT_ALL = '@', MENU_SELECT_PAGE = ',', MENU_UNSELECT_PAGE = '\\',
      MENU_INVERT_PAGE = '~', MENU_SEARCH = ':';
const DEFAULT_MENU_CMDS =
    MENU_FIRST_PAGE + MENU_LAST_PAGE + MENU_NEXT_PAGE + MENU_PREVIOUS_PAGE
    + MENU_SELECT_ALL + MENU_UNSELECT_ALL + MENU_INVERT_ALL + MENU_SELECT_PAGE
    + MENU_UNSELECT_PAGE + MENU_INVERT_PAGE + MENU_SEARCH;
const GOLD_SYM = '$';

// C ref: getline.c xwaitforspace(s) — read keys until one is acceptable,
// ringing the bell for the rest.  Returns C's `morc`: '\0' for return/newline,
// '\033' for escape, else the accepted character.  ttyDisplay->dismiss_more is
// 0 outside topl.c's --More--, so the `c == x` arm never fires here.
async function xwaitforspace(s) {
    for (;;) {
        const c = await nhgetch();
        if (c === 10 || c === 13) return '\0';
        if (c === 27) return '\x1b';
        const ch = String.fromCharCode(c);
        if (s.indexOf(ch) >= 0) return ch;
        // tty_nhbell(): the key is discarded, nothing is redrawn, read again.
    }
}

// C ref: process_menu_window() gacc[] collection.  A group accelerator only
// enters gacc when it differs from its own entry's selector (or is GOLD_SYM),
// and for PICK_ONE only when exactly one entry claims it.
function menu_group_accels(items, pick_one) {
    const gcnt = new Map();
    let n = 0;
    for (const it of items)
        if (it.gsel && it.gsel !== it.ch) {
            n++;
            gcnt.set(it.gsel, (gcnt.get(it.gsel) || 0) + 1);
        }
    let gacc = '';
    if (n > 0)
        for (const it of items)
            if (it.gsel && (it.gsel !== it.ch || it.gsel === GOLD_SYM)
                && gacc.indexOf(it.gsel) < 0
                && (!pick_one || gcnt.get(it.gsel) === 1))
                gacc += it.gsel;
    return gacc;
}

// C ref: process_menu_window() with cw->how == PICK_ONE, for a menu that fits
// on one page (cw->npages == 1, which is every menu this drives).  `items` is
// the add_menu() order; entries with no `ch` are add_menu_str() headers.
// `render` redraws the window and parks the cursor after the morestr, which is
// what C's "just put the cursor back" else-branch does on every re-read.
// Returns the selected entry's a_char, or null when the menu was cancelled or
// committed with nothing picked.
export async function menu_select_pick_one(items, render) {
    const gacc = menu_group_accels(items, /*pick_one=*/true);

    // resp[]: the page's selectors, then gacc, then the always-accepted keys.
    // resp_len covers selectors+gacc: a key inside it is an explicit choice and
    // is NOT re-read as a mapped menu command.
    let resp = '';
    for (const it of items) if (it.ch) resp += it.ch;
    resp += gacc;
    const resp_len = resp.length;
    resp += ' ' + '0123456789\x1b\n\r' + DEFAULT_MENU_CMDS;

    let counting = false, count = 0, reset_count = true;
    for (;;) {
        if (reset_count) { counting = false; count = 0; } else reset_count = true;

        render(items);
        const raw = await xwaitforspace(resp);

        // MENU_EXPLICIT_CHOICE: a selector/group key keeps its own meaning even
        // when it also happens to be a menu command (':' vs a ':' selector).
        const explicit = raw !== '\0' && resp.indexOf(raw) >= 0
                         && resp.indexOf(raw) < resp_len;
        const morc = explicit ? raw : map_menu_cmd(raw);

        if (!explicit && morc >= '0' && morc <= '9') {
            // '0'..'9' start/extend a count unless the digit is a group accel.
            if (!counting && gacc.indexOf(morc) >= 0) {
                const hit = items.find((it) => it.gsel === morc);
                if (hit) return hit.ch;
                continue;
            }
            count = count * 10 + (morc.charCodeAt(0) - 48);
            if (count !== 0) { counting = true; reset_count = false; }
            continue;
        }
        if (!explicit && morc === '\x1b') {
            // ESC while counting only stops the count; otherwise it cancels.
            if (!counting) return null;
            continue;
        }
        if (!explicit && (morc === '\0')) return null;   // committed, no pick
        if (!explicit && morc === ' ') return null;      // single page: finish
        if (!explicit && (morc === MENU_NEXT_PAGE || morc === MENU_PREVIOUS_PAGE
                          || morc === MENU_FIRST_PAGE || morc === MENU_LAST_PAGE))
            continue;                                    // single page: no-op
        if (!explicit && (morc === MENU_SELECT_PAGE || morc === MENU_UNSELECT_PAGE
                          || morc === MENU_INVERT_PAGE || morc === MENU_SELECT_ALL
                          || morc === MENU_UNSELECT_ALL || morc === MENU_INVERT_ALL))
            continue;                    // PICK_ANY-only, or nothing selected
        if (!explicit && morc === MENU_SEARCH) {
            const picked = await menu_search_pick_one(items);
            if (picked) return picked;
            continue;
        }

        // default: an explicit choice (or an unmapped key that reached here).
        if (gacc.indexOf(morc) >= 0) {
            // invert_all(..., morc): for PICK_ONE gacc holds only keys that
            // match exactly one entry, so this selects that entry and finishes.
            const hit = items.find((it) => it.gsel === morc);
            if (hit) return hit.ch;
            continue;
        }
        const sel = items.find((it) => it.ch === morc);
        if (sel) return sel.ch;
        // Not in resp at all cannot happen (xwaitforspace filtered); anything
        // else falls through as C's tty_nhbell() no-op.
    }
}

// C ref: options.c map_menu_cmd() — identity without MENUCOMMAND bindings.
function map_menu_cmd(ch) { return ch; }

// C ref: process_menu_window() case MENU_SEARCH — tty_getlin("Search for:"),
// then the first entry whose displayed string matches "*<reply>*" (pmatchi, so
// case-insensitively) is selected and PICK_ONE finishes.
async function menu_search_pick_one(items) {
    const { hooked_tty_getlin } = await import('./extcmd-handlers.js');
    const reply = await hooked_tty_getlin('Search for:', null);
    if (!reply || reply[0] === '\x1b') return null;
    const needle = reply.toLowerCase();
    for (const it of items)
        if (it.ch && (it.str || '').toLowerCase().indexOf(needle) >= 0)
            return it.ch;
    return null;
}

// C ref: pager.c do_look() — the "What do you want to look at:" menu entries,
// in add_menu() order.  add_menu()'s 4th/5th arguments are the selector and the
// group accelerator; with flags.lootabc unset the selector is the entry's own
// a_char and the group accelerators preserve the original y|n question ('y' =>
// the map, 'n' => by symbol/name) plus '^'/'"'/'`'/'|' for the list choices.
// The second block is suppressed while swallowed or hallucinating, exactly as
// in C, because the screen then can't show what those choices scan for.
export function whatis_menu_items() {
    const lootabc = !!game?.flags?.lootabc;
    const u = game?.u;
    const Hallucination = ((u?.uprops?.Hallucination || 0) > 0)
                          || !!u?.HHallucination || !!u?.uhallu;
    const at = (ch, gsel, desc) =>
        ({ ch, gsel: lootabc ? 0 : gsel, desc, str: `${ch} - ${desc}` });

    const items = [
        at('/', 'y', 'something on the map'),
        // [don't use 'i' as lootabc group accelerator because it will make the
        // regular 'i' choice inaccessible]
        at('i', 0, "something you're carrying"),
        at('?', 'n', 'something else (by symbol or name)'),
    ];
    if (!u?.uswallow && !Hallucination) {
        items.push({ blank: true });   // add_menu_str(win, "")
        items.push(at('m', 0, 'nearby monsters'));
        items.push(at('M', 0, 'all monsters shown on map'));
        items.push(at('o', 0, 'nearby objects'));
        items.push(at('O', 0, 'all objects shown on map'));
        items.push(at('t', '^', 'nearby traps'));
        items.push(at('T', '"', 'all seen or remembered traps'));
        // [don't use 'e' as lootabc group accelerator]
        items.push(at('e', '`', 'nearby engravings'));
        items.push(at('E', '|', 'all seen or remembered engravings'));
    }
    if (lootabc) {
        // flags.lootabc relabels the entries a/b/c/... and the group
        // accelerators become '/', '?' and each list entry's own letter.
        const abc = 'abcdefghijklmnopqrstuvwxyz';
        let n = 0;
        for (const it of items) {
            if (it.blank) continue;
            const gsel = it.ch === 'i' ? 0 : it.ch === '/' ? '/'
                       : it.ch === '?' ? '?' : it.ch === 'e' ? 0 : it.ch;
            it.gsel = gsel;
            it.sel = abc[n++];
            it.str = `${it.sel} - ${it.desc}`;
        }
        // The a_char stays the mnemonic; only the typed selector changes.
        for (const it of items) if (!it.blank) { it.a_char = it.ch; it.ch = it.sel; }
    }
    return items;
}

// C ref: pager.c do_look() — build the menu, run select_menu(PICK_ONE) and hand
// back the chosen a_char (C's `i`, which stays '\0' -> the `default:`/'q' arm
// when nothing was picked).
export async function whatis_menu_pick(render) {
    const items = whatis_menu_items();
    const picked = await menu_select_pick_one(items, render);
    if (!picked) return 'q';
    const hit = items.find((it) => it.ch === picked);
    return (hit && hit.a_char) ? hit.a_char : picked;
}
