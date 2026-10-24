// @ts-nocheck
// optmenu.js — the in-game Options menu (the 'O' command → doset()).
// C ref: src/options.c doset() (~8803) / doset_simple_menu() (8554) builds an
// NHW_MENU listing the set_in_game options grouped by section (General,
// Behavior, Map, Status), each row "name\t[value]"; tty renders the value
// column right-aligned via a cursor-forward escape.  doset is a GENERALCMD:
// it consumes NO turn and NO RNG.  Selecting a boolean option toggles it in
// place and re-renders; pickup_types opens the object-class submenu
// (choose_classes_menu, win/tty path); Enter/ESC exit.
//
// autodig/autopickup boolean toggles, and the pickup_types submenu.  The menu
// content (labels + ordering) is fixed (it is the static set_in_game projection
// of allopt[]); only the [value] fields are state-dependent.  Rendered
import { game } from './gstate.js';
import { dlb_file_lines, OPTMENUHELP } from './dispfile.js';
import { ECMD_OK, gs, PARANOID_BONES } from './const.js';
import { nhgetch } from './input.js';
import { flush_screen, pline, force_more, docrt, dec_mode } from './display.js';
import { update_inventory } from './inventory_refresh.js';
/* C options.c:8944 — the generic compound-option path reads its value with
 * getlin(); mungspaces (objnam.c) normalises it before it is stored. */
import { getlin } from './wizcmds.js';
import { mungspaces, strsubst } from './mklev.js';
import { optfn_fruit_set, optfn_statushilites_set, count_status_hilites, optfn_hilite_status_set, handler_autopickup_exception, handle_add_list_remove, compound_option_value, status_fieldname, optfn_boulder_set, DISCLOSURE_OPTIONS, END_DISCLOSE_DEFAULT, parse_pickup_types, PARANOIA_OPTS, PARANOID_CONFIRMATION_DEFAULT_BITS, BURDENTYPE } from './options.js';
import { reset_needed_visuals, option_state } from './options_runtime.js';
import { vision_recalc } from './vision.js';
import { optfn_suppress_alert_set } from './feature_alert.js';
import { number_pad_value, parseautocomplete } from './cmd_config.js';
import { reset_commands, update_rest_on_space, cmdbind_get, bind_key, cmd_from_func, visctrl } from './cmd_binds.js';
import { EXTCMDLIST } from './cmd_extcmd_data.js';
import { pgetchar, key2txt, list_vanquished_set_vanq_order } from './cmd.js';
import { display_text_window } from './com_pager.js';
import { TtyMenu, PICK_ANY, PICK_ONE, PICK_NONE, ATR_NONE, menu_heading_text, menu_heading_sgr } from './tty_menu.js';
import { menutype } from './menustyle.js';
import { MENU_TRADITIONAL, MENU_COMBINATION } from './const.js';
import { colornames, attrnames, attr2attrname, clr2colorname, match_str2clr } from './coloratt.js';
import { choose_disco_sort } from './o_init.js';
/* C ref: wintty.c process_menu_window's overlay composition — the shared
 * map-under-window renderer every other overlay in this port uses. */
import { build_window_screen, menu_search_case } from './com_pager.js';
import { DOSET_BOOLS, DOSET_COMPOUNDS, DOSET_OTHERS, LONGEST_OPTION_NAME,
         term_for_boolean } from './doset_data.js';
/* C ref: options.c:8060 oc_to_str — see js/drawing.js for why it lives there. */
import { oc_to_str, def_char_to_objclass, def_oc_syms_chars } from './drawing.js';

// C ref: cmd.c set_cursor — record the tty cursor position after a window draw.
function set_cursor(col, row) {
    const disp = game?.nhDisplay;
    if (disp) { disp.cursorCol = col; disp.cursorRow = row; }
}

const SCREEN_ROWS = 24; /* tty LI */
const SCREEN_COLS = 80; /* tty CO */
const VALUE_COL = 29;   /* visible column where the "[value]" field starts (incl. 1-space margin) */
const HEADER_COL = 33;  /* visible column the reverse-video section header pads to */

// ── option-menu model ────────────────────────────────────────────────────
// Each non-boolean ("comp"/"othr") option carries a value() producing the
// bracketed string; booleans carry a flag key read from game.flags.
// `name` is the displayed label, `kind` is 'bool' | 'comp' | 'othr' | 'sub'.
// The accelerator letters (a, b, c, ...) are assigned per-page in render order
// (C: add_menu cycles a-zA-Z), so they are NOT stored — they fall out of the
// row index within a page.

function boolStr(on) { return on ? 'X' : ' '; }

function pickupTypesStr() {
    const ocl = oc_to_str(game.flags?.pickup_types);
    return ocl ? ocl : 'all';
}

// The fixed set_in_game menu, grouped by section.  Mirrors the allopt[] order
// projected to {setwhere==set_in_game} (optlist.h).  Each entry:
//   { name, kind, flag?, value?, suffix? }
// suffix is the trailing "  (for autopickup)" note rendered AFTER the [value].
const PAGES = [
    // Page 1: General + Behavior
    [
        { section: 'General' },
        /* C optlist.h:339 NHOPTC(fruit, ...) has has_handler = No, so doset()
         * takes the GENERIC compound-option path: getlin("Set fruit to what?")
         * then parseoptions("fruit:<answer>").  optfn_fruit's do_set
         * (options.c:1715-1767) mungspaces()es the answer and copies it into
         * svp.pl_fruit — which is js/gstate.js game.pl_fruit, the same field
         * objnam.c reads — defaulting back to "slime mold" when it is empty. */
        { name: 'fruit', kind: 'comp', hasHandler: false,
          value: () => game.pl_fruit || 'slime mold',
          set: (v) => {
              const msg = optfn_fruit_set(mungspaces(v));
              if (msg) game._pending_message = msg;
          } },
        { name: 'number_pad', kind: 'sub', value: number_pad_value },
        { name: 'price_quotes', kind: 'bool', flag: 'price_quotes' },
        { section: 'Behavior' },
        { name: 'autodig', kind: 'bool', flag: 'autodig' },
        { name: 'autoopen', kind: 'bool', flag: 'autoopen', defOn: true },
        /* C ref: include/optlist.h:184 — the 'autopickup' boolean's storage IS
         * flags.pickup (`bp` = &flags.pickup); there is no separate flags.autopickup.
         * options.js (nethackrc) and dotogglepickup ('@') both write flags.pickup, so
         * the menu must toggle and display the same field or the three writers
         * disagree and the pickup_types/autopick path reads a flag nobody set. */
        { name: 'autopickup', kind: 'bool', flag: 'pickup' },
        { name: 'autopickup exceptions', kind: 'othr', value: () => `(${(game.apelist || []).length} currently set)` },
        { name: 'autoquiver', kind: 'bool', flag: 'autoquiver' },
        { name: 'autounlock', kind: 'comp', value: autounlockStr },
        { name: 'cmdassist', kind: 'bool', flag: 'cmdassist', defOn: true },
        { name: 'dropped_nopick', kind: 'bool', flag: 'dropped_nopick', defOn: true, suffix: '  (for autopickup)' },
        { name: 'fireassist', kind: 'bool', flag: 'fireassist', defOn: true },
        { name: 'pickup_stolen', kind: 'bool', flag: 'pickup_stolen', defOn: true, suffix: '  (for autopickup)' },
        { name: 'pickup_thrown', kind: 'bool', flag: 'pickup_thrown', defOn: true, suffix: '  (for autopickup)' },
        { name: 'pickup_types', kind: 'sub', value: pickupTypesStr, suffix: '  (for autopickup)' },
        { name: 'pushweapon', kind: 'bool', flag: 'pushweapon' },
    ],
    // Page 2: Map + Status
    [
        { section: 'Map' },
        { name: 'bgcolors', kind: 'bool', flag: 'bgcolors', defOn: true },
        { name: 'color', kind: 'bool', flag: 'color', defOn: true },
        { name: 'customcolors', kind: 'bool', flag: 'customcolors', defOn: true },
        { name: 'customsymbols', kind: 'bool', flag: 'customsymbols', defOn: true },
        { name: 'hilite_pet', kind: 'bool', flag: 'hilite_pet' },
        { name: 'hilite_pile', kind: 'bool', flag: 'hilite_pile' },
        { name: 'showrace', kind: 'bool', flag: 'showrace' },
        { name: 'sparkle', kind: 'bool', flag: 'sparkle', defOn: true },
        /* C options.c:8614-8618: simple and full menus call the same get_val
         * handler (optfn_symset, options.c:4205-4215). */
        { name: 'symset', kind: 'comp', value: DOSET_COMPOUNDS.find(r => r.name === 'symset').val },
        { section: 'Status' },
        { name: 'hitpointbar', kind: 'bool', flag: 'hitpointbar' },
        { name: 'menu colors', kind: 'othr', value: () => `(${(game.menu_colorings || []).length} currently set)` },
        { name: 'showexp', kind: 'bool', flag: 'showexp' },
        { name: 'status condition fields', kind: 'othr', value: () => `(${cond_enabled_count()} currently set)` },
        { name: 'status highlight rules', kind: 'othr', value: () => `(${count_status_hilites()} currently set)` },
        /* C options.c:4067-4105 — statuslines is a generic compound option;
         * selecting it must enter getlin and parse atoi(op), rather than being
         * treated as a read-only menu row.  The tty renderer still has the
         * port's fixed two status rows, but retain the C iflags state and mark
         * the existing status redraw path when the option changes. */
        { name: 'statuslines', kind: 'comp', hasHandler: false,
          value: () => ((game.iflags?.wc2_statuslines ?? 2) < 3 ? '2' : '3'),
          set: async (v) => {
              const text = String(v ?? '');
              /* C atoi(): leading whitespace and an optional sign are accepted;
               * parsing stops at the first non-digit. */
              const match = text.match(/^[\t\n\r\f\v ]*([+-]?\d+)/);
              const n = match ? Number(match[1]) : 0;
              if (n < 2 || n > 3)
                  return `'statuslines:${text}' is invalid; must be 2 or 3.`;
              game.iflags ||= {};
              game.iflags.wc2_statuslines = n;
              if (game.disp) game.disp.botl = 1;
              return null;
          } },
        { name: 'time', kind: 'bool', flag: 'time' },
    ],
];

/* C optlist.h NHOPTB(name, box, ...) — which struct the option lives in.
 * js/doset_data.js carries it as the generated `box` column. */
const _OPT_BOX = new Map(DOSET_BOOLS.map((r) => [r.fld || r.name, r.box]));
function _optBox(flag) { return _OPT_BOX.get(flag) || 'flags'; }

// flag default-on table (defaults match optlist.h Off/On).  A boolean's
// displayed value is game.flags[flag] if defined, else its default.
const _SIMPLE_STORAGE = new Map(DOSET_BOOLS.map((r) => [r.name, r]));
function simpleBox(entry) {
    const row = _SIMPLE_STORAGE.get(entry.name);
    if (!row) return { obj: (game.flags || (game.flags = {})), fld: entry.flag };
    let o = game;
    for (const part of row.box.split('.')) {
        if (!o[part] || typeof o[part] !== 'object') o[part] = {};
        o = o[part];
    }
    return { obj: o, fld: row.fld };
}
function flagOn(entry) {
    const { obj, fld } = simpleBox(entry);
    const v = obj[fld];
    if (v === undefined || v === null) return !!entry.defOn;
    return !!v;
}

// Build the bracketed [value] string for a row (without the brackets).
function valueStr(entry) {
    if (entry.kind === 'bool') return boolStr(flagOn(entry));
    return entry.value();
}

// Emit "<prefix><gap-fill><tail>" reaching the value at `targetCol`.  The tty
// uses a literal-space gap when small (<=4) else a cursor-forward escape.
// `prefixLen` is the VISIBLE length already emitted (margin + label).
function padTo(prefix, prefixLen, targetCol, tail) {
    const gap = targetCol - prefixLen;
    let fill;
    if (gap <= 0) fill = '';
    else if (gap > 4) fill = `\x1b[${gap}C`;
    else fill = ' '.repeat(Math.max(0, gap));
    return prefix + fill + tail;
}

/* C optlist.h — the trailing `desc`/`descr` argument of each NHOPT* row.  doset_simple
 * shows it under the option while gs.simple_options_help is set (options.c:8635-8639). */
const OPT_DESCR = {
    fruit: 'name of a fruit you enjoy eating',
    number_pad: 'use the number pad for movement',
    price_quotes: 'display prices you have seen for unidentified objects',
    autodig: 'dig if moving and wielding a digging tool',
    autoopen: 'walking into a door attempts to open it',
    autopickup: 'automatically pick up objects',
    'autopickup exceptions': 'edit autopickup exceptions',
    autoquiver: 'fill empty quiver automatically when firing',
    autounlock: 'action to take when encountering locked door or chest',
    cmdassist: 'give help for errors on direction input',
    dropped_nopick: "don't autopickup dropped items",
    fireassist: 'fire-command tries to be helpful',
    pickup_stolen: 'autopickup stolen items',
    pickup_thrown: 'autopickup thrown items',
    pickup_types: 'types of objects to pick up automatically',
    pushweapon: 'previous weapon goes to secondary slot',
    bgcolors: 'use background color for some map hilighting',
    color: 'use color in map',
    customcolors: 'use custom colors in map',
    customsymbols: 'use custom utf8 symbols in map',
    hilite_pet: 'use highlight for pets',
    hilite_pile: 'highlight piles of items',
    showrace: 'show your character by race rather than role',
    sparkle: 'display sparkly effect when resisting magic',
    symset: 'load a set of display symbols from symbols file',
    hitpointbar: 'show colored bar for hit points',
    'menu colors': 'change colors used in menus',
    showexp: 'show experience points in status line',
    'status condition fields': 'change status condition highlighting',
    'status highlight rules': 'change status line highlighting',
    statuslines: '2 or 3 lines for status display',
    time: 'display game turns in status line',
};

/* C options.c:8566-8574 — "show help" adds this note ahead of the '?' row. */
const HELP_NOTE = " Use command '#optionsfull' to get the complete options list.";
const MENU_PAGE_ROWS = SCREEN_ROWS - 1;   /* tty keeps the last row for "(N of M)" */

function helpOn() { return !!game.simple_options_help; }

function sectionLines(section) {
    // blank line then reverse-video section header padded to HEADER_COL.
    const visible = ' ' + section; // visible text after the SGR start (incl leading space)
    const prefixVisLen = 1 /*margin*/ + visible.length;
    /* headings take iflags.menu_headings (options.c:2197), not a fixed inverse */
    const sgr = menu_heading_sgr();
    const body = ' ' + (sgr.length ? `\x1b[${sgr.join(';')}m` : '') + visible;
    return ['', padTo(body, prefixVisLen, HEADER_COL, sgr.length ? '\x1b[0m' : '')];
}

function entryLine(entry, acc) {
    const label = `${acc} - ${entry.name}`;
    const prefix = ' ' + label;           // 1-space margin + label
    const prefixLen = prefix.length;       // visible length (no escapes here)
    const tail = `[${valueStr(entry)}]` + (entry.suffix || '');
    // C fmtstr_tab_doset_simple uses an unpadded name and a literal tab.
    return game.iflags?.menu_tab_sep ? prefix + '\x1b[1C' + tail
           : padTo(prefix, prefixLen, VALUE_COL, tail);
}

/* C options.c:8566-8639 with gs.simple_options_help set: the flat menu line list
 * (note, "hide help" row, each option followed by "    <descr>" and a blank) cut
 * into tty pages of MENU_PAGE_ROWS lines.  Accelerators restart at 'a' per page
 * (wintty.c:2721), so each page carries its own letter -> entry map. */
function helpPages() {
    const items = [
        { line: ' ' + menu_heading_text('Options') }, { line: '' },
        { line: HELP_NOTE }, { line: ' ? - hide help' },
    ];
    for (const page of PAGES) {
        for (const entry of page) {
            if (entry.section) {
                for (const l of sectionLines(entry.section)) items.push({ line: l });
                continue;
            }
            items.push({ entry });
            const d = OPT_DESCR[entry.name];
            if (d) { items.push({ line: '\x1b[5C' + d }); items.push({ line: '' }); }
        }
    }
    const pages = [];
    for (let i = 0; i < items.length; i += MENU_PAGE_ROWS) {
        const lines = [];
        const accel = new Map();
        let letter = 'a'.charCodeAt(0);
        for (const it of items.slice(i, i + MENU_PAGE_ROWS)) {
            if (it.entry) {
                const acc = String.fromCharCode(letter++);
                accel.set(acc, it.entry);
                lines.push(entryLine(it.entry, acc));
            } else lines.push(it.line);
        }
        pages.push({ lines, accel });
    }
    return pages;
}

function pageCount() { return helpOn() ? helpPages().length : PAGES.length; }

// Build the rendered text lines for one menu page (no leading 24-row framing).
// Returns array of line strings (each already includes its 1-space left margin).
function buildPageLines(pageIdx) {
    if (helpOn()) {
        const hp = helpPages();
        return [...hp[pageIdx].lines, ` (${pageIdx + 1} of ${hp.length})`];
    }
    const page = PAGES[pageIdx];
    const lines = [];
    // Page 1 carries the title + "? - show help" header rows; page 2 does not.
    if (pageIdx === 0) {
        lines.push(' ' + menu_heading_text('Options'));
        lines.push('');
        lines.push(' ? - show help');
    }
    let letter = 'a'.charCodeAt(0);
    for (const entry of page) {
        if (entry.section) {
            lines.push(...sectionLines(entry.section));
            continue;
        }
        lines.push(entryLine(entry, String.fromCharCode(letter++)));
    }
    // footer "(N of M)"
    lines.push(` (${pageIdx + 1} of ${PAGES.length})`);
    return lines;
}

// Map a page's selectable letters to their entry objects (skipping sections).
function pageAccelMap(pageIdx) {
    if (helpOn()) return helpPages()[pageIdx].accel;
    const page = PAGES[pageIdx];
    const map = new Map();
    let letter = 'a'.charCodeAt(0);
    for (const entry of page) {
        if (entry.section) continue;
        map.set(String.fromCharCode(letter++), entry);
    }
    return map;
}

/* The rows of a page as the tty last drew them.  `row0Erased` is C's
 * getline.c:213 clear_nhwindow(WIN_MESSAGE) after a MENU_SEARCH: it blanks the
 * WHOLE of screen row 0 — the menu's own reverse-video title on page 1, or the
 * first option row on any later page — and process_menu_window only repaints a
 * page when page_start is reset, so it stays blank until the page changes or
 * select_menu is re-entered. */
function pageFrameRows(pageIdx, row0Erased) {
    const lines = buildPageLines(pageIdx).slice(0, SCREEN_ROWS);
    if (row0Erased && lines.length) lines[0] = '';
    return lines;
}

// Render a full-screen options page into _screen_output (24 rows, col 0).
function renderPage(pageIdx, row0Erased) {
    const lines = pageFrameRows(pageIdx, row0Erased);
    game._screen_output = lines.slice(0, SCREEN_ROWS).join('\n');
    // Cursor: just past the footer line ("(N of M)").  C tty leaves the cursor
    // at the end of the last drawn menu line.  Footer is at row lines.length-1.
    const footerRow = lines.length - 1;
    const footerVis = ` (${pageIdx + 1} of ${pageCount()})`.length;
    set_cursor(footerVis, footerRow);
    game._pending_message = '';
}

// ── pickup_types submenu (choose_classes_menu) ───────────────────────────
// C ref: win/tty choose_classes_menu — an overlay PICK_ANY menu at col 17.
// Rows: one per object class (symbol + 2 spaces + explanation), then a blank,
// then "A - All classes of objects", two note lines, "(end)".  Selecting a
// class (by its accelerator a-o OR by typing the class symbol) toggles a "+".
const PICKUP_CLASSES = [
    { sym: '$', name: 'pile of coins' },
    { sym: '"', name: 'amulet' },
    { sym: ')', name: 'weapon' },
    { sym: '[', name: 'suit or piece of armor' },
    { sym: '%', name: 'piece of food' },
    { sym: '?', name: 'scroll' },
    { sym: '+', name: 'spellbook' },
    { sym: '!', name: 'potion' },
    { sym: '=', name: 'ring' },
    { sym: '/', name: 'wand' },
    { sym: '(', name: 'useful item (pick-axe, key, lamp...)' },
    { sym: '*', name: 'gem or rock' },
    { sym: '`', name: 'boulder or statue' },
    { sym: '0', name: 'iron ball' },
    { sym: '_', name: 'iron chain' },
    { sym: '.', name: 'splash of venom' },
];
function renderPickupSubmenu(marks, bgRows, classes, preserveStatus, titleErased = false) {
    const body = [];
    /* C ref: getline.c:213 clear_nhwindow(WIN_MESSAGE) blanks row 0 after a
     * MENU_SEARCH getlin, and process_menu_window does not repaint the page, so
     * the title stays erased until the menu is re-entered. */
    body.push(titleErased ? null : 'Autopickup what?');
    body.push(null);
    let letter = 'a'.charCodeAt(0);
    for (const c of classes) {
        const acc = String.fromCharCode(letter++);
        const mark = marks.get(c.sym) || '-';
        body.push(`${acc} ${mark} ${c.sym}  ${c.name}`);
    }
    body.push(null);
    /* C ref: windows.c:1717-1723 — the "all classes" row is added with
     * any.a_int == ' ' and MENU_ITEMFLAGS_SKIPINVERT, and is deliberately never
     * preselected, so its mark starts '-' and can only ever become '+'. */
    body.push(`A ${marks.get('A') || '-'}    All classes of objects`);
    body.push('Note: when no choices are selected, "all" is implied.');
    body.push(game.flags?.pickup
        ? "Toggle off 'autopickup' to not pick up anything."
        : "Toggle on 'autopickup' to automatically pick these things up.");
    body.push('(end)');
    /* C ref: wintty.c:1925-1928 — `!iflags.menu_overlay` drops the NHW_MENU to
     * offx 0; `!cw->offx` then clears the whole screen (wintty.c:1407) and every
     * row is written from tty_curs(window, 1, n), i.e. a 1-space left margin.
     * The footer is the single-page morestr "(end) " (wintty.c:2740) and the
     * cursor sits just past it. */
    if (game.iflags?.menu_overlay === false || game.iflags?.menu_overlay === 0) {
        const fsRows = body.map((t, i) => (t === null ? ''
            : i === 0 ? ` ${menu_heading_text(t)}` : ` ${t}`));
        fsRows[fsRows.length - 1] = ' (end) ';
        game._screen_output = fsRows.join('\n');
        set_cursor('(end) '.length + 1, fsRows.length - 1);
        game._pending_message = '';
        return;
    }
    const widest = body.reduce((m, t) => (t && t.length > m ? t.length : m), 0);
    /* C ref: wintty.c:1925-1928 — `!iflags.menu_overlay` drops the menu to
     * offx 0 on a cleared screen (term_clear_screen), content at col 1, with
     * nothing of the map or status left behind. */
    if (game.iflags?.menu_overlay === false || game.iflags?.menu_overlay === 0) {
        game._screen_output = body.map((t, i) => (t === null ? ''
            : i === 0 ? ` ${menu_heading_text(t)}` : ` ${t}`)).join('\n');
        set_cursor('(end)'.length + 2, body.length - 1);
        game._pending_message = '';
        return;
    }
    const col = Math.max(0, SCREEN_COLS - widest - 2);
    /* C ref: wintty.c:1925-1928 — `!iflags.menu_overlay` forces offx 0 and
     * term_clear_screen(): a full-screen menu, content at col 1, nothing of
     * the map or status rows kept behind it. */
    if (game.iflags?.menu_overlay === false || game.iflags?.menu_overlay === 0) {
        const full = body.map((t, i) => (t === null ? ''
            : i === 0 ? ` ${menu_heading_text(t)}` : ` ${t}`));
        game._screen_output = full.join('\n');
        set_cursor('(end) '.length + 1, full.length - 1);
        game._pending_message = '';
        return;
    }
    const pre = `\x1b[${col}C`;
    const lines = body.map((t, i) => (t === null ? ''
        : i === 0 ? `${pre}${menu_heading_text(t)}` : `${pre}${t}`));
    if (!bgRows) {
        const winLines = body.map((t, i) => (t === null ? ''
            : i === 0 ? menu_heading_text(t) : t));
        game._screen_output = build_window_screen(
            winLines, col, undefined, preserveStatus ? undefined : 0);
        set_cursor(col + '(end)'.length + 1, winLines.length - 1);
        game._pending_message = '';
        return;
    }
    const out = lines.slice(0, SCREEN_ROWS);
    for (let r = out.length; r < SCREEN_ROWS; r++) {
        if (bgRows[r] === undefined) break;
        out.push(bgRows[r]);
    }
    game._screen_output = out.join('\n');
    set_cursor(col + '(end)'.length + 1, lines.length - 1);
    game._pending_message = '';
}

async function numberPadSubmenu() {
    const rows = [
        menu_heading_text('Select number_pad mode:'), '',
        'a -  0 (off)', 'b -  1 (on)',
        'c -  2 (on, MSDOS compatible)',
        'd -  3 (on, phone-style digit layout)',
        'e -  4 (on, phone-style layout, MSDOS compatible)',
        "f - -1 (off, 'z' to move upper-left, 'y' to zap wands)",
        '(end)',
    ];
    let idx = -1;
    while (idx < 0) {
        game._screen_output = build_window_screen(rows, 24, undefined, 0);
        set_cursor(30, 8);
        game._pending_message = '';
        const key = await nhgetch();
        if (key === 27 || key === 10 || key === 13 || key === 32)
            return;
        const ch = String.fromCharCode(key);
        idx = 'abcdef'.indexOf(ch);
        if (idx < 0) idx = '012345'.indexOf(ch);
    }
    const modes = [[false, 0], [true, 0], [true, 1], [true, 2], [true, 3], [false, 1]];
    const [on, mode] = modes[idx];
    game.iflags ||= {};
    game.iflags.num_pad_mode = mode;
    game.iflags.num_pad = on;
    reset_commands(false);
}

// Run the pickup_types submenu select loop.  PICK_ANY: class accelerators and
// class symbols toggle selection in place; Enter/space confirm, ESC cancels.
// On confirm, write the selected symbols (in PICKUP_CLASSES order) to
// game.flags.pickup_types.  Consumes NO RNG.
async function pickupTypesSubmenu(bgRows, preserveStatus = false) {
    const g = game;
    /* C ref: options.c:3330-3352 optfn_pickup_types(do_set) — under
     * menustyle:traditional/combination the value is read with getlin
     * ("New pickup_types: [<inv order> am] (<cur>|all)"), and only an answer
     * starting with 'm' falls through to the choose_classes_menu picker. */
    if (g.flags?.menu_style === MENU_TRADITIONAL || g.flags?.menu_style === MENU_COMBINATION) {
        const tbuf = oc_to_str(g.flags?.pickup_types);
        const ocl = (g.flags?.inv_order || [12, 5, 2, 3, 7, 9, 10, 8, 4, 11, 6, 13, 14, 15, 16])
            .map((oc) => def_oc_syms_chars[oc]).join('');
        /* The menu window overdrew the status rows; like "Set %s to what?" the
         * getlin repaints only topline + map, so rows 22-23 stay blank. */
        /* The menu window overdrew rows 22-23 and getlin repaints only topline+map
         * (js/display.js _status_blanked; same as the 'Set X to what?' getlin). */
        g._status_blanked = true;
        /* The full-screen Options menu was just dismissed (docrt); bot() has
         * not run, so the physical status rows are blank, not that menu's
         * last page (tty_menu.js _statusBlankAfterDocrt). */
        if (!bgRows && !preserveStatus) g._statusBlankAfterDocrt = true;
        /* The menu window overdrew the status rows; getlin repaints only the
         * topline + map (see the 'Set X to what?' arm; js/display.js _status_blanked). */
        g._status_blanked = true;
        g._status_blanked = !preserveStatus;
        /* tty_dismiss_nhwindow of the full-screen Options menu repaints the MAP
         * only; status rows stay blank until bot() (wintty.c). */
        if (!bgRows && !preserveStatus)
            game._screen_output = build_window_screen([], SCREEN_COLS + 1, undefined, 0);
        /* The dismissed Options window overdrew rows 22-23 and getlin
         * suppresses bot(), so the prompt shows blank status rows (as for
         * doset_simple's no-handler getlin, js/optmenu.js 'Set %s to what?'). */
        g._status_blanked = !preserveStatus;
        const raw = await getlin(`New pickup_types: [${ocl} am] (${tbuf || 'all'})`);
        g._status_blanked = false;
        const wasspace = raw.charAt(0) === ' ';
        let op = mungspaces(raw);
        if (wasspace && !op) { /* spaces remove the old value */ }
        else if (!op || op.charAt(0) === '\x1b') op = tbuf; /* restore */
        else if (op.charAt(0) === 'm') op = null;
        if (op !== null) {
            g.flags = g.flags || {};
            g.flags.pickup_types = parse_pickup_types(op);
            /* options.c:3367-3372 — a bad class symbol sets badopt; the error
             * names `op`, already advanced to the terminating NUL (''). */
            const rest = op.replace(/^ +/, '');
            if (rest.charAt(0) !== 'a' && rest.charAt(0) !== 'A'
                && [...rest].some((ch) => def_char_to_objclass(ch.charCodeAt(0)) === 18
                    || rest.indexOf(ch) !== rest.lastIndexOf(ch)))
                await force_more("Unknown pickup_types parameter ''.");
            return;
        }
    }
    // C options.c:3358 adds venom to the inventory classes only in wizard mode.
    // C options.c:3334,3358 — the class list is oc_to_str(flags.inv_order), so a
    // packorder change reorders this menu; venom is appended last in wizard mode.
    const invOrder = g.flags?.inv_order || [12, 5, 2, 3, 7, 9, 10, 8, 4, 11, 6, 13, 14, 15, 16];
    const bySym = new Map(PICKUP_CLASSES.map(c => [c.sym, c]));
    const classes = [];
    for (const oc of invOrder) {
        const c = bySym.get(def_oc_syms_chars[oc]);
        if (c && c.sym !== '.') classes.push(c);
    }
    if (g.flags?.debug) classes.push(bySym.get('.'));
    /* Seed the working set from the current flag value — C ref: windows.c:1691-1695
     * `if (way && *class_select) if (strchr(class_select, *class_list)) selected =
     * TRUE;`, i.e. choose_classes_menu is handed the CURRENT pickup_types as
     * class_select and preselects those rows.  Preselected rows paint '*'; see
     * renderPickupSubmenu. */
    const cur = new Set(oc_to_str(g.flags?.pickup_types));
    const marks = new Map();
    for (const c of classes) marks.set(c.sym, cur.has(c.sym) ? '*' : '-');
    /* The 'A' row's own selection state, tracked separately because C tracks it
     * as a separate menu item whose a_int is ' ' rather than as a class. */
    let allPicked = false;
    const symByAcc = new Map();
    let letter = 'a'.charCodeAt(0);
    for (const c of classes) symByAcc.set(String.fromCharCode(letter++), c.sym);
    const symSet = new Set(classes.map((c) => c.sym));
    /* C ref: windows.c:1644-1760 choose_classes_menu adds each row as
     * "%c - %s" (wintty.c:2596-2600 tty_add_menu), and the 'A' row last; the
     * MENU_SEARCH ':' case (wintty.c:1700-1730) matches the typed text against
     * those strings and toggles every hit. */
    const mlist = [];
    {
        let acc = 'a'.charCodeAt(0);
        for (const c of classes)
            mlist.push({ str: `${String.fromCharCode(acc++)} - ${c.sym}  ${c.name}`, sym: c.sym });
        mlist.push({ str: 'A - All classes of objects', sym: 'A' });
    }
    let titleErased = false;
    while (true) {
        // No flush_screen (it would rebuild _screen_output from the map).
        renderPickupSubmenu(marks, bgRows, classes, preserveStatus, titleErased);
        const frame = game._screen_output;
        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        if (key === 27 /* ESC */) {
            return; // cancel: leave flag unchanged
        }
        if (key === 10 || key === 13 || key === 32 /* Enter / space confirm */) {
            break;
        }
        if (key === 0x3a /* ':' MENU_SEARCH — a menu command, never a selector */) {
            await menu_search_case('ANY', mlist, () => frame.split('\n'), (curr) => {
                if (curr.sym === 'A') {
                    allPicked = !allPicked;
                    marks.set('A', allPicked ? '+' : '-');
                    return;
                }
                if (cur.has(curr.sym)) cur.delete(curr.sym); else cur.add(curr.sym);
                marks.set(curr.sym, cur.has(curr.sym) ? '+' : '-');
            });
            titleErased = true;   /* getline.c:213 blanked row 0; menu not repainted */
            continue;
        }
        if (ch === 'A') {
            /* C ref: windows.c:1746-1753 — 'A' is an ordinary PICK_ANY toggle on
             * a separate menu row; it does NOT select every class row.  Its
             * meaning is applied at COMMIT, where choose_classes_menu scans the
             * picks for the a_int == ' ' entry and collapses the whole result to
             * that one item ("it means 'use a blank list' rather than 'collect
             * every possible choice'"), which optfn_pickup_types then parses as
             * the empty list, i.e. "all".  Selecting every class instead left
             * fifteen '+' marks on screen where C shows fifteen '-' and one, and
             * stored fifteen symbols where C stores none — the two are the same
             * autopickup behaviour but a different menu and a different
             * "[all]" vs "[$\"…]" value on the parent Options page. */
            allPicked = !allPicked;
            marks.set('A', allPicked ? '+' : '-');
            continue;
        }
        if (ch === '.' || ch === '-' || ch === '@') {
            for (const c of classes) {
                const selected = ch === '.' || (ch === '@' && !cur.has(c.sym));
                if (selected) cur.add(c.sym); else cur.delete(c.sym);
                marks.set(c.sym, selected ? '+' : '-');
            }
            continue;
        }
        if (symByAcc.has(ch)) {
            const sym = symByAcc.get(ch);
            if (cur.has(sym)) cur.delete(sym); else cur.add(sym);
            /* set_item_state, not the initial paint: always '+', never '*'. */
            marks.set(sym, cur.has(sym) ? '+' : '-');
            continue;
        }
        if (symSet.has(ch)) {
            // typed the class symbol directly
            if (cur.has(ch)) cur.delete(ch); else cur.add(ch);
            marks.set(ch, cur.has(ch) ? '+' : '-');
            continue;
        }
        // ignore any other key (menu stays displayed)
    }
    /* commit: store in PICKUP_CLASSES order (= C's def_inv_order, options.c:118,
     * which is the order choose_classes_menu was handed its class_list in and so
     * the order it writes class_select back in — windows.c:1745-1746).
     *
     * Stored as a STRING, not the array this used to build: C's
     * flags.pickup_types is a char[] and every reader in this port
     * (js/cmd.js:33727 autopick_testobj, :18248 enlightenment, :28350
     * dotogglepickup, js/doset_data.js:56, pickupTypesStr above) treats it as a
     * character sequence.  Two shapes for one field is what let a reader be
     * written against only one of them; oc_to_str still accepts both so a
     * half-updated caller cannot throw. */
    g.flags = g.flags || {};
    /* C ref: windows.c:1746-1753 — an 'A' pick collapses the result to the empty
     * list before optfn_pickup_types ever sees it. */
    g.flags.pickup_types = allPicked ? ''
        : classes.filter((c) => cur.has(c.sym)).map((c) => c.sym).join('');
}

/* C ref: options.c:3330-3361 optfn_pickup_types(do_handler arm).  Under
 * menustyle traditional/combination the class picker is NOT opened directly:
 * a getlin("New pickup_types: [<inv_order> am] (<current|all>)") is asked first
 * and only an answer starting with 'm' falls into choose_classes_menu.  An
 * answer of only spaces clears the list; empty/ESC restores the old value. */
async function optfn_pickup_types_handler(preserveStatus) {
    const g = game;
    const style = g.flags?.menu_style ?? 2;
    if (style !== 0 /* MENU_TRADITIONAL */ && style !== 1 /* MENU_COMBINATION */) {
        await pickupTypesSubmenu(undefined, preserveStatus);
        return;
    }
    const tbuf = oc_to_str(g.flags?.pickup_types);
    const invOrder = g.flags?.inv_order || [12, 5, 2, 3, 7, 9, 10, 8, 4, 11, 6, 13, 14, 15, 16];
    const ocl = invOrder.map((oc) => def_oc_syms_chars[oc]).join('');
    g._status_blanked = !preserveStatus; /* tty_dismiss of the Options window leaves status rows blank until bot() */
    /* The dismissed Options window overdrew rows 22-23 and getlin suppresses
     * bot(), so the prompt shows blank status rows unless a toggle message
     * already repainted them (same rule as the no-handler getlin below). */
    g._status_blanked = !preserveStatus;
    const abuf = await getlin(`New pickup_types: [${ocl} am] (${tbuf || 'all'})`);
    g._status_blanked = false;
    const wasspace = abuf.charAt(0) === ' ';
    const op = mungspaces(abuf);
    g.flags = g.flags || {};
    if (wasspace && !op) {
        g.flags.pickup_types = '';
    } else if (!op || op.charAt(0) === '\x1b') {
        /* restore: unchanged */
    } else if (op.charAt(0) === 'm') {
        await pickupTypesSubmenu(undefined, preserveStatus);
    } else {
        g.flags.pickup_types = parse_pickup_types(op);
        const trimmed = op.replace(/^ +/, '');
        if (!/^[aA]/.test(trimmed) && g.flags.pickup_types.length !== trimmed.length)
            await pline("Unknown pickup_types parameter ''.");
    }
}

// ── doset_simple() — the 'O' command ──────────────────────────────────────
// C ref: options.c:8707 doset_simple / :8536 doset_simple_menu — the
// user-friendly options menu, titled "Options" and grouped by OptSection.
// GENERALCMD: no turn, no RNG.  Drives the paging/toggle/submenu loop until
// Enter/ESC, then returns (the caller redraws the map).
/* C ref: win/tty/wintty.c:2591-2605 tty_add_menu — a SELECTABLE entry's stored
 * str, which is what MENU_SEARCH's pmatchi() matches against (wintty.c:1714),
 * is `Sprintf(buf, "%c - ", ch ? ch : '?')` followed by the caller's text.
 * doset_simple_menu passes ch == 0 for every OPTION row (options.c:8632-8633),
 * so tty_add_menu stores those as "? - ..." — but tty_end_menu then writes the
 * ASSIGNED accelerator back over the first byte (wintty.c:2721
 * `curr->str[0] = curr->selector = menu_ch`), so what pmatchi actually sees is
 * "<letter> - <text>" with the letter restarting at 'a' on every page.  The
 * help row passes '?' explicitly (options.c:8576-8579), so `!curr->selector`
 * is false for it and it keeps both its selector and its stored "? - ".
 *
 * The row text itself is options.c:8555's fmtstr "%-Ns [%s]", or "%s\t[%s]"
 * when menu_tab_sep is enabled, plus the "  (for autopickup)" note. Keep the
 * stored spaces/tab, not the cursor-forward escapes used by buildPageLines().
 *
 * Entries in add_menu CALL order across every page, because the search walks
 * cw->mlist head-first and is not page-scoped (wintty.c:1716-1729). */
const DOSET_SIMPLE_HELP_ROW = Symbol('doset_simple help row');
function dosetSimpleSearchList() {
    const list = [{ str: helpOn() ? '? - hide help' : '? - show help',
                    entry: DOSET_SIMPLE_HELP_ROW }];
    for (let p = 0; p < pageCount(); p++)
        for (const [letter, entry] of pageAccelMap(p))
            list.push({
                str: dosetRow(`${letter} - `, entry.name, valueStr(entry))
                     + (entry.suffix || ''),
                entry,
            });
    return list;
}

export async function doset_simple() {
    const g = game;
    g.flags = g.flags || {};
    let pageIdx = 0;
    /* C ref: getline.c:213 — the MENU_SEARCH getlin's closing
     * clear_nhwindow(WIN_MESSAGE) blanks screen row 0 and the page is not
     * repainted, so it stays blank until the page changes or select_menu is
     * re-entered (both of which redraw from page_start). */
    let titleErased = false;
    /* C wintty.c:1334-1399,1565-1612 counting/count/reset_count: digits build
     * a count and ESC while counting only stops the count. */
    let counting = false, count = 0, reset_count = true;
    while (true) {
        if (reset_count) { counting = false; count = 0; }
        else reset_count = true;
        // renderPage sets game._screen_output to the menu frame; the nhgetch
        // NOT flush_screen here — flush_screen's _buildScreenOutput would rebuild
        // _screen_output from the map and clobber the menu (the dohelp /
        // dodiscovered full-screen-menu pattern: set _screen_output, then nhgetch).
        renderPage(pageIdx, titleErased);
        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        if (key >= 48 && key <= 57) {
            count = count * 10 + (key - 48);
            if (count !== 0) { counting = true; reset_count = false; }
            continue;
        }
        if (key === 27 /* ESC */ && counting) continue;
        if (key === 27 /* ESC */) break;
        if (key === 10 || key === 13 /* Enter: exit */) break;
        if (key === 32 /* space: next page (wraps off the end → exit) */) {
            if (pageIdx + 1 < pageCount()) { pageIdx++; titleErased = false; continue; }
            break;
        }
        /* C ref: wintty.c:1606-1610 — MENU_NEXT_PAGE '>' advances a page, and
         * on the last page does NOTHING ("stop '>' doing the same" as ' ' finishing
         * there).  Only ' ' finishes; '>' repaints the same page. */
        if (ch === '>') {
            if (pageIdx + 1 < pageCount()) { pageIdx++; titleErased = false; }
            continue;
        }
        if (ch === '<') {
            if (pageIdx > 0) { pageIdx--; titleErased = false; }
            continue;
        }
        /* C ref: wintty.c:1611-1625 — MENU_FIRST_PAGE '^' / MENU_LAST_PAGE '|'
         * jump to the first / last page and are no-ops already there. */
        if (ch === '^' || ch === '|') {
            const dest = ch === '^' ? 0 : pageCount() - 1;
            if (pageIdx !== dest) { pageIdx = dest; titleErased = false; }
            continue;
        }
        // a letter accelerator on the current page → toggle / submenu.
        const accMap = pageAccelMap(pageIdx);
        let searchPick = null;
        if (!accMap.has(ch) && key === 0x3a /* ':' MENU_SEARCH */) {
            await menu_search_case('ONE', dosetSimpleSearchList(),
                () => pageFrameRows(pageIdx, titleErased),
                (curr) => { searchPick = curr.entry; });
            titleErased = true;
            if (!searchPick) continue;   /* no match: menu stays up, row 0 blank */
            if (searchPick === DOSET_SIMPLE_HELP_ROW) {
                /* C options.c:8657-8659 — k == -2 toggles gs.simple_options_help
                 * and `goto redo_opt_help` rebuilds the menu from page 1. */
                g.simple_options_help = !g.simple_options_help;
                pageIdx = 0; titleErased = false; continue;
            }
        }
        if (accMap.has(ch) || searchPick) {
            const entry = searchPick || accMap.get(ch);
            titleErased = false;   /* a pick ends select_menu; the next one repaints */
            if (entry.kind === 'bool') {
                const { obj, fld } = simpleBox(entry);
                obj[fld] = !flagOn(entry);
                /* C options.c:5344-5349,5386-5390 optfn_boolean: showscore/showvers/showexp/time/hitpointbar call
                 * status_initialize(REASSESS_ONLY), which sets gu.update_all; botl.c:1575-1577
                 * then zeroes every field's time and chg, dropping the up/down temp hilites. */
                if (['showscore', 'showvers', 'showexp', 'time', 'hitpointbar'].includes(entry.name)) delete g._blTemp;
                if (entry.name === 'color') {
                    g.iflags.use_color = !!obj[fld];
                    /* C options.c:8727: reset_needed_visuals redraws before
                     * doset_simple offers the menu again. */
                    g.go ||= {};
                    g.go.opt_need_redraw = g.go.opt_need_glyph_reset = true;
                    await reset_needed_visuals();
                }
                if (entry.name === 'hilite_pet') {
                    /* C options.c:3109 (optfn_boolean/hilite_pet): petattr
                     * defaults to ATR_INVERSE and opt_need_redraw is set, so
                     * doset_simple()'s reset_needed_visuals() (options.c:8997)
                     * docrt()s the map before the menu is re-offered. */
                    if (g.iflags.wc_hilite_pet && !g.iflags.wc2_petattr)
                        g.iflags.wc2_petattr = 7; /* ATR_INVERSE (wintype.h) */
                    await docrt();
                }
                pageIdx = 0;
                continue;
            }
            if (entry.kind === 'sub') {
                if (entry.name === 'number_pad') await numberPadSubmenu();
                else await pickupTypesSubmenu();
                pageIdx = 0;
                continue;
            }
            if (entry.hasHandler === false && entry.set) {
                g._status_blanked = true;
                const abuf = await getlin(`Set ${entry.name} to what?`);
                g._status_blanked = false;
                /* C: if (abuf[0] == '\033') continue; — cancel applies nothing
                 * and falls through to the menu redraw. */
                if (abuf !== '\x1b') {
                    const result = await entry.set(abuf);
                    if (result)
                        await force_more(result);
                }
                pageIdx = 0;
                continue;
            }
            if (entry.name === 'symset') {
                /* C options.c:6321 handler_symset -> symbols.c:906 do_symset(). */
                await handler_symset(false);
                g.go.opt_need_redraw = true;
                pageIdx = 0;
                continue;
            }
            if (entry.name === 'autounlock') {
                /* C options.c:8930-8953 -> handler_autounlock (has_handler). */
                await handler_autounlock(false);
                pageIdx = 0;
                continue;
            }
            if (entry.name === 'autopickup exceptions') {
                await handler_autopickup_exception(false);
                pageIdx = 0;
                continue;
            }
            // comp/othr options WITH a C handler open their own picker; none of
            // re-render (no RNG, stream stays aligned).
            pageIdx = 0;
            continue;
        }
        /* '?' is the help row's selector, which only exists on page 1
         * (wintty.c process_menu_window matches within the current page).
         * C options.c:8657-8659 toggles gs.simple_options_help and rebuilds. */
        if (ch === '?' && pageIdx === 0) {
            g.simple_options_help = !g.simple_options_help;
            titleErased = false;
            continue;
        }
        // any other key: ignore, menu stays displayed.
    }
    g._pending_message = '';
    /* C: this handler returns ECMD_OK on every path; rhack() maps it. */
    return ECMD_OK;
}

// ── doset() — the '#optionsfull' command, reached in play as 'm O' ────────
// C ref: options.c:8758 doset().  Unlike doset_simple() this lists ALL of
// allopt[] projected to [set_gameview .. set_in_game], in three sections
// (Booleans / Compounds / Other settings), titled "Set what options?", and it
// is a PICK_ANY menu: selections accumulate across pages and are all applied
// when the menu commits.  The row list lives in js/doset_data.js, generated
// from the C headers (see that file's provenance header).
//
// C ref: cmd.c:1779-1784 — 'O' is #options -> doset_simple, and #optionsfull
// -> doset is bound to NO key; the only way to reach doset in play is the 'm'
// prefix, which doset_simple() turns into a doset() call (options.c:8712).

/* C ref: options.c:8757/8821 — choose the padded or tab-separated fmtstr.
 * Store literal tabs here: MENU_SEARCH matches the original menu text. */
function dosetRow(indentOrAccel, name, value) {
    if (game.iflags?.menu_tab_sep)
        return `${indentOrAccel}${name}\t[${value}]`;
    return `${indentOrAccel}${name.padEnd(LONGEST_OPTION_NAME)} [${value}]`;
}

/* Resolve a doset_data `box`.`fld` pair (the C NHOPTB bool_p storage) against
 * the live game, creating the container so a toggle has somewhere to land. */
function boolBox(row) {
    let o = game;
    for (const part of row.box.split('.')) {
        if (!o[part] || typeof o[part] !== 'object') o[part] = {};
        o = o[part];
    }
    return o;
}
function boolValue(row) {
    const v = boolBox(row)[row.fld];
    return (v === undefined || v === null) ? row.init : !!v;
}

async function drainTopline() {
    await flush_screen(1);
    if (game._pending_message) await force_more(game._pending_message);
    game._pending_message = '';
}

/* C options.c:handler_menustyle. The full options menu has been dismissed;
 * retain its status-paint state while the submenu overlays the map. */
export async function handler_menustyle(preserveStatus = false) {
    const old_menu_style = game.flags.menu_style;
    const sep = game.iflags.menu_tab_sep ? '\t' : ' ';
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    for (let i = 0; i < menutype.length; i++) {
        const [name, first, second] = menutype[i];
        m.add_menu(i + 1, name[0], ATR_NONE, name.padEnd(12) + sep + first,
            false, i === old_menu_style);
        m.add_menu_str(' '.repeat(16) + sep + second);
    }
    m.end_menu('Select menustyle:');
    const { count, picks } = await m.select_menu(PICK_ONE);
    if (count > 0) {
        let i = picks[0] - 1;
        if (count > 1 && i === old_menu_style) i = picks[1] - 1;
        game.flags.menu_style = i;
    }
    const chngd = game.flags.menu_style !== old_menu_style;
    if (chngd || game.flags.verbose)
        await pline(`'menustyle' ${chngd ? 'changed to' : 'is still'} "${menutype[game.flags.menu_style][0]}".`);
}

/* C options.c:273 objsymvals[] */
const objsymvals = [
    [0, 'none', "don't show object symbols in menus"],
    [1, 'headers', 'show object symbols in menu header lines'],
    [2, 'entries', 'show object symbols in individual menu entries'],
    [3, 'both', 'show object symbols in headers and menu entries'],
    [4, 'conditional', 'show objsyms in entries if no headers are shown'],
    [5, 'one-or-other', 'show objsyms in header, in entries if no header'],
];

/* C options.c:7446 set_menuobjsyms_flags */
function set_menuobjsyms_flags(newobjsyms) {
    game.iflags.menuobjsyms = newobjsyms;
    game.iflags.menu_head_objsym = (newobjsyms & 1) !== 0;
    game.iflags.use_menu_glyphs = (newobjsyms & (2 | 4)) !== 0;
}

/* C options.c:5796 handler_menu_objsyms (tty). */
export async function handler_menu_objsyms(preserveStatus = false) {
    const sep = game.iflags.menu_tab_sep ? '\t' : ' ';
    const cur = game.iflags.menuobjsyms ?? 4;
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    for (let i = 0; i < objsymvals.length; i++) {
        const [num, nam, descr] = objsymvals[i];
        const buf = nam.slice(0, 12).padEnd(12) + sep + descr.slice(0, 60);
        m.add_menu(i + 1, String(i), ATR_NONE, buf, false, num === cur);
    }
    m.end_menu('Set object symbols in menus to what?');
    const { count, picks } = await m.select_menu(PICK_ONE);
    if (count > 0) {
        let i = picks[0] - 1;
        if (count > 1 && i === cur) i = picks[1] - 1;
        set_menuobjsyms_flags(i);
    }
}

/* C coloratt.c:530 basic_menu_colors(TRUE): temporary menucolor patterns that
 * match the colour names (built last-in/first-out; black, white and no color
 * are skipped), with 'menucolors' forced on.  Returns the restorer. */
function basic_menu_colors() {
    const save_use = game.iflags.use_menu_color;
    const save_colorings = game.menu_colorings;
    const cols = [];
    for (const { name, color } of colornames) {
        if (!name) break;
        if (color === 0 || color === 15 || color === 8) continue;
        cols.unshift({ match: new RegExp(name), color, attr: 0 });
    }
    game.iflags.use_menu_color = true;
    game.menu_colorings = cols;
    return () => {
        game.iflags.use_menu_color = save_use;
        game.menu_colorings = save_colorings;
    };
}

/* C coloratt.c:475 query_color; returns -1 on ESC. */
async function query_color(prompt, dflt_color, preserveStatus) {
    const restore = basic_menu_colors();
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    for (let i = 0; i < colornames.length; i++) {
        if (!colornames[i].name) break;
        m.add_menu(i + 1, 0, ATR_NONE, colornames[i].name, false,
                   colornames[i].color === dflt_color);
    }
    m.end_menu(prompt || 'Pick a color');
    const { count, picks } = await m.select_menu(PICK_ONE);
    restore();
    if (count > 0) {
        let i = colornames[picks[0] - 1].color;
        if (count === 2 && i === 8) i = colornames[picks[1] - 1].color;
        return i;
    } else if (count === 0) {
        return dflt_color;
    }
    return -1;
}

/* C coloratt.c:380 query_attr (PICK_ONE case); returns -1 on ESC. */
async function query_attr_one(prompt, dflt_attr, preserveStatus) {
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    for (let i = 0; i < attrnames.length; i++) {
        if (!attrnames[i].name) break;
        m.add_menu(i + 1, 0, ATR_NONE, attrnames[i].name, false,
                   attrnames[i].attr === dflt_attr);
        /* tty term_start_attr: C ATR_BOLD/ULINE/INVERSE only (this port's
         * ATR_* numbering differs from C's, so carry the SGR code itself). */
        const sgr = { 1: 1, 4: 4, 7: 7 }[attrnames[i].attr];
        if (sgr) m.mlist[m.mlist.length - 1].sgr = [sgr];
    }
    m.end_menu(prompt || 'Pick an attribute');
    const { count, picks } = await m.select_menu(PICK_ONE);
    if (count > 0) {
        let j = picks[0] - 1;
        if (count === 2 && attrnames[j].attr === dflt_attr) j = picks[1] - 1;
        return attrnames[j].attr;
    } else if (count === 0) {
        return dflt_attr;
    }
    return -1;
}

/* C options.c:5779 handler_menu_headings + coloratt.c:304 query_color_attr. */
export async function handler_menu_headings(preserveStatus = false) {
    const mh = game.iflags.menu_headings ||= { color: 8, attr: 7 };
    const prompt = 'How to highlight menu headings:';
    const c = await query_color(prompt, mh.color, preserveStatus);
    if (c === -1) return;
    const a = await query_attr_one(prompt, mh.attr, true);
    if (a === -1) return;
    mh.color = c;
    mh.attr = a;
}

/* C botl.c:703 initblstats[]: [fldname, anytype (S string, I int, L long, M mask),
 * idxmax >= 0 (INIT_BLSTATP)]. */
const INITBLSTATS = [
    ['title', 'S'], ['strength', 'I'], ['dexterity', 'I'], ['constitution', 'I'],
    ['intelligence', 'I'], ['wisdom', 'I'], ['charisma', 'I'], ['alignment', 'S'],
    ['score', 'L'], ['carrying-capacity', 'I'], ['gold', 'L'], ['power', 'I', true],
    ['power-max', 'I'], ['experience-level', 'I', true], ['armor-class', 'I'],
    ['HD', 'I'], ['time', 'L'], ['hunger', 'I'], ['hitpoints', 'I', true],
    ['hitpoints-max', 'I'], ['dungeon-level', 'S'], ['experience', 'L', true],
    ['condition', 'M'], ['version', 'S'], ['weapon', 'S'], ['armor', 'S'], ['terrain', 'S'],
];


/* C botl.c:781-815 conditions[].ranking and botl.c:817-848 condtests[]
 * (useroption, enabled default), in condtests order. */
const CONDTESTS = [
    ['barehanded', 20, false], ['blind', 10, true], ['busy', 20, false], ['conf', 10, true],
    ['deaf', 10, true], ['iron', 15, true], ['fly', 10, true], ['foodPois', 6, true],
    ['glowhands', 20, false], ['grab', 2, true], ['hallucinat', 10, true], ['held', 20, false],
    ['ice', 20, false], ['lava', 8, true], ['levitate', 10, true], ['paralyzed', 20, false],
    ['ride', 10, true], ['sleep', 20, false], ['slime', 6, true], ['slip', 20, false],
    ['stone', 6, true], ['strngl', 4, true], ['stun', 10, true], ['submerged', 15, false],
    ['termIll', 6, true], ['tethered', 20, false], ['trap', 20, false], ['unconscious', 20, false],
    ['woundedlegs', 20, false], ['holding', 20, false],
];
function cond_enabled_arr() {
    if (!game._condEnabled) game._condEnabled = CONDTESTS.map(c => c[2]);
    return game._condEnabled;
}
function cond_enabled_count() { return cond_enabled_arr().filter(Boolean).length; }
const strcmpi = (a, b) => { a = a.toLowerCase(); b = b.toLowerCase(); return a < b ? -1 : a > b ? 1 : 0; };

/* C botl.c:1376 cond_menu: toggle status conditions; returns true iff changed. */
async function cond_menu() {
    const enabled = cond_enabled_arr();
    const menutitle = ['alphabetically', 'by ranking'];
    let idx = 0, res, showmenu = true;
    const choice = new Array(CONDTESTS.length).fill(false);
    game.condmenu_sortorder |= 0;
    do {
        const sequence = CONDTESTS.map((_, i) => i);
        sequence.sort(game.condmenu_sortorder
            ? (a, b) => (CONDTESTS[a][1] - CONDTESTS[b][1]) || strcmpi(CONDTESTS[a][0], CONDTESTS[b][0])
            : (a, b) => strcmpi(CONDTESTS[a][0], CONDTESTS[b][0]));
        const m = new TtyMenu();
        const so = game.condmenu_sortorder;
        m.add_menu(1, 'S', ATR_NONE, `change sort order from "${menutitle[so]}" to "${menutitle[1 - so]}"`, true, false);
        m.add_menu_heading(`sorted ${menutitle[so]}`);
        for (const i of sequence) {
            choice[i] = false;
            m.add_menu(i + 2, 0, ATR_NONE, `cond_${CONDTESTS[i][0].padEnd(14)}`, false, enabled[i]);
        }
        m.end_menu('Choose status conditions to toggle');
        const r = await m.select_menu(PICK_ANY);
        res = r.count;
        showmenu = false;
        if (res > 0) {
            for (let i = 0; i < res; i++) {
                idx = r.picks[i];
                if (idx === 1) {
                    game.condmenu_sortorder = 1 - so;
                    showmenu = true;
                    break;
                } else {
                    idx -= 2;
                    choice[idx] = true;
                }
            }
        }
    } while (showmenu);
    let changed = false;
    if (res >= 0) {
        for (let i = 0; i < CONDTESTS.length; i++) {
            if (enabled[i] !== choice[i]) {
                enabled[i] = choice[i];
                if (game.flags) game.flags['cond_' + CONDTESTS[i][0]] = choice[i];
                changed = true;
            }
        }
        if (changed) game.botl = true;
    }
    return changed;
}

/* C botl.c:3707 status_hilite_menu_choose_behavior; returns the BL_TH_* value,
 * 0 (BL_TH_NONE) for no pick, -1 (BL_TH_NONE - 1) for a cancelled menu. */
async function status_hilite_menu_choose_behavior(fld, preserveStatus) {
    const [fldname, at, hasMax] = INITBLSTATS[fld];
    const isCond = fldname === 'condition', isCap = fldname === 'carrying-capacity';
    const isHunger = fldname === 'hunger';
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    let nopts = 0, onlybeh = 0;
    const ent = (beh, ch, text) => { m.add_menu(beh, ch, ATR_NONE, text, false, false); onlybeh = beh; nopts++; };
    if (!isCond) ent(105, 'a', `Always highlight ${fldname}`);
    if (isCond) ent(103, 'b', 'Bitmask of conditions');
    if (!isCond && fldname !== 'version') ent(102, 'c', `${fldname} value changes`);
    if (!isCap && !isHunger && (at === 'I' || at === 'L')) ent(101, 'n', 'Number threshold');
    if (hasMax) ent(100, 'p', 'Percentage threshold');
    if (fldname === 'hitpoints') ent(106, 'C', `Highlight critically low ${fldname}`);
    if (at === 'S' || isCap || isHunger) ent(104, 't', `${fldname} text match`);
    m.end_menu(`Select ${fldname} field hilite behavior:`);
    let beh = -1;
    if (nopts > 1) {
        const { count, picks } = await m.select_menu(PICK_ONE);
        if (count > 0) beh = picks[0];
        else if (count === 0) beh = 0;
    } else if (onlybeh !== 0) {
        beh = onlybeh;
    }
    return beh;
}

/* C botl.c:3570 status_hilite_linestr_gather over the raw rules options.js
 * keeps: one line per threshold, by field index (blstats[0][i].thresholds,
 * appended in rule order, botl.c status_hilite_add_threshold), each rendered
 * by status_hilite2str (botl.c:3590) from parse_status_hl2's classification
 * (botl.c:2814-2990).  Rules split on spaces as parse_status_hl1 does
 * (botl.c:2606-2640, lowercased).  Condition rules are not modelled per
 * cond_maps (botl.c:3488): each distinct rule is one 'condition' line. */
const HL_ATTRBITS = [[1, 2, 'bold'], [2, 4, 'dim'], [3, 8, 'italic'], [4, 16, 'underline'],
    [5, 32, 'blink'], [7, 64, 'inverse']];
function status_hilite2str_rules(spec) {
    const out = [], fz = s => s.replace(/[ \-_]/g, '').toLowerCase();
    for (const one of spec.toLowerCase().split(' ').filter(Boolean)) {
        const s = one.split('/');
        const fldname = status_fieldname(s[0]);
        const fld = INITBLSTATS.findIndex(([n]) => n === fldname);
        if (fld < 0 || fldname === 'condition' || fldname === 'characteristics') continue;
        const at = INITBLSTATS[fld][1];
        for (let i = 1; i < s.length && s[i]; i += 2) {
            const t = s[i];
            let beh;
            if (!s[i + 1] || t === 'always') { beh = 'always'; if (!s[i + 1]) i--; }
            else if ((t === 'up' || t === 'down') && at !== 'S') beh = t;
            else if (t === 'up' || t === 'down' || t === 'changed') beh = 'changed';
            else if (fldname === 'hitpoints' && t === 'criticalhp') beh = 'criticalhp';
            else if (/^[<>]?=?[-+]?[0-9]+%?$/.test(t) && at !== 'S') {
                const op = /^(<=|>=|<|>)/.exec(t)?.[1] || '=';
                beh = `${op}${parseInt(t.replace(/[%<>=+]/g, ''), 10)}${t.includes('%') ? '%' : ''}`;
            } else {
                const arr = fldname === 'carrying-capacity'
                    ? ['Burdened', 'Stressed', 'Strained', 'Overtaxed', 'Overloaded']
                    : fldname === 'alignment' ? ['chaotic', 'neutral', 'lawful']
                    : fldname === 'hunger' ? ['Satiated', 'Hungry', 'Weak', 'Fainting', 'Fainted', 'Starved']
                    : null;
                const k = arr ? arr.find(a => a.toLowerCase() === t) : null;
                if (k) beh = k;
                else if (at === 'S') beh = t.trim();
                else break; /* config_error: rule rejected */
            }
            let clr = null, attr = 0;
            for (const sf of (s[i + 1] || '').split(/[&+]/)) {
                const a = attrnames.find(x => x.name && fz(x.name) === fz(sf));
                if (a && a.attr === 0) attr = 1;
                else if (a) attr |= HL_ATTRBITS.find(b => b[0] === a.attr)[1];
                else clr = match_str2clr(sf, true);
            }
            let clrbuf = (clr2colorname(clr ?? 8 /* NO_COLOR */) || '').replace(/ /g, '-');
            if (attr === 1) clrbuf += '&normal';
            else if (attr) clrbuf += '&' + HL_ATTRBITS.filter(b => attr & b[1]).map(b => b[2]).join('+');
            const str = `${INITBLSTATS[fld][0]}/${beh}/${clrbuf}`;
            out.push({ fld, str: fld === 0 ? str : str.replace(/ /g, '') });
        }
    }
    return out;
}
function status_hilite_linestr_gather() {
    const lines = (game.status_field_hilites || []).flatMap(status_hilite2str_rules)
        .map((l, k) => ({ ...l, k })).sort((a, b) => a.fld - b.fld || a.k - b.k);
    const cfld = INITBLSTATS.findIndex(([n]) => n === 'condition');
    for (const spec of new Set((game.status_condition_hilites || []).map(x => x.toLowerCase())))
        lines.push({ fld: cfld, str: spec.replace(/ /g, '') });
    return lines;
}

/* C botl.c:4447 status_hilites_viewall. */
async function status_hilites_viewall(lines) {
    await display_text_window(lines.map(l => `OPTIONS=hilite_status: ${l.str}`));
}

/* C botl.c:4498 status_hilite_menu.  Picking a field with no rules reaches
 * status_hilite_menu_add() at its choose_behavior step (botl.c:3922-3931);
 * a cancelled behavior menu returns FALSE and the field menu is redone.
 * Defining a rule, and status_hilite_menu_fld's menu for a field that has
 * rules (botl.c:4369), are not ported. */
export async function status_hilite_menu(preserveStatus = false) {
    for (;;) {
        const lines = status_hilite_linestr_gather();
        const m = new TtyMenu(); /* 26 rows + header: full-screen, not an overlay */
        if (lines.length) {
            m.add_menu(-1, 0, ATR_NONE, 'View all hilites in config format', false, false);
            m.add_menu_str('');
        }
        INITBLSTATS.forEach(([name], i) => {
            const count = lines.filter(l => l.fld === i).length;
            if (name === 'score' && !count) return; /* no SCORE_ON_BOTL */
            m.add_menu(i + 1, 0, ATR_NONE,
                name.padEnd(18) + (count ? ` (${count} defined)` : ''), false, false);
        });
        m.end_menu('Status hilites:');
        const { count, picks } = await m.select_menu(PICK_ONE);
        if (count <= 0) {
            if (lines.length && !game.iflags.hilite_delta) game.iflags.hilite_delta = 3;
            return;
        }
        const fld = picks[0] - 1;
        if (fld < 0) {
            await status_hilites_viewall(lines);
            continue;
        }
        if (lines.some(l => l.fld === fld))
            throw new Error('not yet ported: status_hilite_menu_fld rules menu');
        /* the 24-row menu window covered the status rows and its dismissal
         * does not repaint them: the pending "You see your kitten." --More--
         * (and the submenu after it) stand over blank status rows */
        game._status_blanked = game._decStaleFrom != null;
        await drainTopline();
        game._status_blanked = false;
        const beh = await status_hilite_menu_choose_behavior(fld, true);
        if (beh > 0) throw new Error('not yet ported: status_hilite_menu_add value entry');
        preserveStatus = true;
    }
}

/* C options.c:7701 query_msgtype: ids are msgtyp + 1 (show, hide, stop, norep). */
const MSGTYPE_DESCR = [['show', 'Show message normally'], ['hide', 'Hide message'],
    ['stop', 'Prompt for more after the message'], ['norep', 'Do not repeat the message']];
async function query_msgtype(preserveStatus) {
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    MSGTYPE_DESCR.forEach(([, d], i) => m.add_menu(i + 1, 0, ATR_NONE, d, false, false));
    m.end_menu('How to show the message');
    const { count, picks } = await m.select_menu(PICK_ONE);
    return count > 0 ? picks[0] - 1 : -1;
}

/* C options.c:6502 handler_msgtype. */
export async function handler_msgtype(preserveStatus = false) {
    for (;;) {
        const rules = game.msgtypes ||= [];
        const opt_idx = await handle_add_list_remove('message type', rules.length, preserveStatus);
        if (opt_idx === 3) return;
        if (opt_idx === 0) {
            game._status_blanked = !preserveStatus;
            const mtbuf = mungspaces(await getlin('What new message pattern?'));
            game._status_blanked = false;
            if (mtbuf[0] === '\x1b') return;
            let re = null;
            if (mtbuf) {
                try { re = new RegExp(mtbuf); } catch (e) {
                    /* C options.c:7871 test_regex_pattern -> config_erradd (cfgfiles.c:1557-1563):
                       interactive 'O' reports the regcomp (glibc) error via pline + wait_synch. */
                    const m = String(e.message);
                    const desc = /Nothing to repeat/.test(m) ? 'repetition-operator operand invalid'
                        : /Unterminated group|Unmatched \)|parenthes/i.test(m) ? 'Unmatched ( or \\('
                        : /Unterminated character class/.test(m) ? 'Unmatched [, [^, [:, [., or [='
                        : /Invalid regular expression/.test(m) ? 'Invalid regular expression' : m;
                    await force_more(`MSGTYPE regex: ${desc}.`);
                    preserveStatus = true; /* wait_synch -> flush_screen -> bot() repainted the status rows */
                    re = null;
                }
            }
            if (re) {
                const mttyp = await query_msgtype(true);
                if (mttyp !== -1)
                    rules.unshift({ type: MSGTYPE_DESCR[mttyp][0], regex: re, pattern: mtbuf });
            }
            continue;
        }
        const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
        rules.forEach((r, i) => {
            const pat = r.pattern ?? r.regex.source;
            const ln = 255 - (r.type.padEnd(5).length + 2) - 1;
            m.add_menu(i + 1, 0, ATR_NONE, `${r.type.padEnd(5)} "${pat.length > ln ? pat.slice(0, ln - 3) + '..."' : pat + '"'}`, false, false);
        });
        m.end_menu(opt_idx === 1 ? 'List of message types' : 'Remove which message types');
        const { count, picks } = await m.select_menu(opt_idx === 1 ? PICK_NONE : PICK_ANY);
        if (count > 0) {
            for (let k = 0; k < count; k++) rules.splice(picks[k] - 1 - k, 1);
        }
        if (count < 0) return;
    }
}

/* C options.c:6407 handler_menu_colors.  Add and exit are ported; the list /
 * remove arms (opt_idx 1, 2) need the menucolor list menus and are not. */
export async function handler_menu_colors(preserveStatus = false) {
    for (;;) {
        const nmc = (game.menu_colorings || []).length;
        const opt_idx = await handle_add_list_remove('menucolor', nmc, preserveStatus);
        if (opt_idx === 3) break;
        if (opt_idx !== 0) {
            /* C options.c:6448-6497 list (1) / remove (2) */
            const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
            (game.menu_colorings || []).forEach((tmp, i) => {
                const sattr = attr2attrname(tmp.attr);
                const sclr = clr2colorname(tmp.color).replace(/ /g, '-');
                const buf = `""=${sclr}${tmp.attr !== 0 ? '&' + sattr : ''}`;
                const ln = 256 - buf.length - 1;
                const o = tmp.origstr ?? tmp.match.source;
                const mcbuf = '"' + (o.length > ln ? o.slice(0, ln - 3) + '...' : o) + buf.slice(1);
                m.add_menu(i + 1, 0, ATR_NONE, mcbuf, false, false);
            });
            m.end_menu(opt_idx === 1 ? 'List of menu colors' : 'Remove which menu colors');
            const { count, picks } = await m.select_menu(opt_idx === 1 ? PICK_NONE : PICK_ANY);
            if (count > 0) {
                for (let k = 0; k < count; k++) game.menu_colorings.splice(picks[k] - 1 - k, 1);
            }
            if (count < 0) break;
            continue;
        }
        game._status_blanked = !preserveStatus;
        const mcbuf = mungspaces(await getlin('What new menucolor pattern?'));
        game._status_blanked = false;
        if (mcbuf[0] === '\x1b') break;
        if (!mcbuf) continue;
        let re;
        try { re = new RegExp(mcbuf); } catch (e) { continue; }
        const mcclr = await query_color(null, 8, true);
        if (mcclr === -1) continue;
        const mcattr = await query_attr_one(null, 0, true);
        if (mcattr === -1) continue;
        /* coloratt.c:543 add_menu_coloring_parsed prepends */
        (game.menu_colorings ||= []).unshift({ match: re, color: mcclr, attr: mcattr, origstr: mcbuf });
        game.iflags.use_menu_color = true;
    }
    /* C options.c:6417-6424 */
    if (game.iflags?.use_menu_color && game.iflags?.perm_invent) update_inventory();
}

/* C options.c:4067-4098 optfn_statuslines(do_set); returns the error text. */
function optfn_statuslines_set(text) {
    const match = text.match(/^[\t\n\r\f\v ]*([+-]?\d+)/);
    const n = match ? Number(match[1]) : 0;
    if (n < 2 || n > 3)
        return `'statuslines:${text}' is invalid; must be 2 or 3.`;
    game.iflags ||= {};
    game.iflags.wc2_statuslines = n;
    if (game.disp) game.disp.botl = 1;
    return null;
}

/* C options.c:195 msgwind[] */
const msgwind = [
    ['single', '[show one old message at a time,', ' most recent first]'],
    ['combination', '[for consecutive ^P requests, use', " 'single' for first two, then 'full']"],
    ['full', '[show all available messages,', ' oldest first and most recent last]'],
    ['reversed', '[show all available messages,', ' most recent first]'],
];

/* C options.c:5831 handler_msg_window (tty). */
export async function handler_msg_window(preserveStatus = false) {
    const iflags = game.iflags ||= {};
    const sep = iflags.menu_tab_sep ? '\t' : ' ';
    const old_prevmsg_window = iflags.prevmsg_window ?? 's';
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    for (let i = 0; i < msgwind.length; i++) {
        const [name, first, second] = msgwind[i];
        m.add_menu(i + 1, name[0], ATR_NONE, name.slice(0, 12).padEnd(12) + sep + first.slice(0, 60),
            false, name[0] === old_prevmsg_window);
        m.add_menu_str(' '.repeat(16) + sep + second.slice(0, 60));
    }
    m.end_menu('Select message history display type:');
    const { count, picks } = await m.select_menu(PICK_ONE);
    if (count > 0) {
        let i = picks[0] - 1;
        if (count > 1 && msgwind[i][0][0] === old_prevmsg_window) i = picks[1] - 1;
        iflags.prevmsg_window = msgwind[i][0][0];
    }
    const chngd = iflags.prevmsg_window !== old_prevmsg_window;
    if (chngd || game.flags.verbose) {
        /* optfn_msg_window get_val */
        const cur = msgwind.find(w => w[0][0] === iflags.prevmsg_window)?.[0] ?? 'single';
        await pline(`'msg_window' ${chngd ? 'changed to' : 'is still'} "${cur}".`);
    }
}

/* C options.c:5675 handler_disclose. */
const DISCLOSURE_NAMES = ['inventory', 'attributes', 'vanquished', 'genocides', 'conduct', 'overview'];
export async function handler_disclose(preserveStatus = false) {
    const cur = [...(game.flags?.end_disclose || END_DISCLOSE_DEFAULT)];
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    DISCLOSURE_NAMES.forEach((n, i) => m.add_menu(i + 1, DISCLOSURE_OPTIONS[i], ATR_NONE,
        `${n.padEnd(12)}[${cur[i]}${DISCLOSURE_OPTIONS[i]}]`, false, false));
    m.end_menu('Change which disclosure options categories:');
    const { count, picks } = await m.select_menu(PICK_ANY);
    const disc = new Array(DISCLOSURE_NAMES.length).fill(0);
    if (count > 0) for (const p of picks) disc[p - 1] = 1;
    for (let i = 0; i < DISCLOSURE_NAMES.length; i++) {
        if (!disc[i]) continue;
        const c = cur[i];
        const vg = DISCLOSURE_NAMES[i][0] === 'v' || DISCLOSURE_NAMES[i][0] === 'g';
        const items = [['-', 'Never disclose, without prompting'],
                       ['+', 'Always disclose, without prompting']];
        if (vg) items.push(['#', 'Always disclose, pick sort order from menu']);
        items.push(['n', 'Prompt, with default answer of "No"'],
                   ['y', 'Prompt, with default answer of "Yes"']);
        if (vg) items.push(['?', 'Prompt, with default answer of "Ask" to request sort menu']);
        const m2 = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
        for (const [ch, txt] of items) m2.add_menu(ch.charCodeAt(0), 0, ATR_NONE, txt, false, c === ch);
        m2.end_menu(`Disclosure options for ${DISCLOSURE_NAMES[i]}:`);
        const r = await m2.select_menu(PICK_ONE);
        if (r.count > 0) {
            let nc = String.fromCharCode(r.picks[0]);
            if (r.count > 1 && nc === c) nc = String.fromCharCode(r.picks[1]);
            cur[i] = nc;
            (game.flags ||= {}).end_disclose = cur.join('');
        }
    }
}

/* C options.c:5951 handler_paranoid_confirmation: a PICK_ANY submenu over
 * paranoia[] whose ids are the flagmask bits themselves (any.a_int), with the
 * live bits preselected.  bones is hidden outside wizard mode.  A confirmed
 * commit RESETS flags.paranoia_bits even when no item ends up picked (the
 * player toggled the preselected bits off); ESC (count -1) leaves it alone. */
export async function handler_paranoid_confirmation(preserveStatus = false) {
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    const bits = game.flags?.paranoia_bits ?? PARANOID_CONFIRMATION_DEFAULT_BITS;
    for (const p of PARANOIA_OPTS) {
        if (!p.mask) break; /* "none"/"all" rows: rc parsing only */
        if (p.mask === PARANOID_BONES && !game.flags?.debug) continue;
        let explain = p.explain;
        /* C options.c:5968-5984 — the 'swim' explanation names the 'm'
         * movement prefix; when that key is bound elsewhere or unbound,
         * substitute the replacement (first occurrence, strsubst). */
        if (explain.includes("'m'")) {
            const mkey = cmd_from_func('do_reqmenu');
            if (mkey !== 0x6d) {
                const mbuf = mkey
                    ? `'${visctrl(mkey).slice(0, 9)}'`
                    /* cmdname_from_func(do_reqmenu) is the "reqmenu" entry of
                     * EXTCMDLIST, '#' prefixed unless already present. */
                    : "'#reqmenu'";
                explain = strsubst(explain, "'m'", mbuf);
            }
        }
        m.add_menu(p.mask, p.name[0], ATR_NONE, explain, false,
                   (bits & p.mask) !== 0);
    }
    m.end_menu('Actions requiring extra confirmation:');
    const { count, picks } = await m.select_menu(PICK_ANY);
    if (count >= 0) {
        let n = 0;
        for (const mask of picks) n |= mask;
        (game.flags ||= {}).paranoia_bits = n;
    }
}

/* C options.c:6153 handler_petattr — query_attr is PICK_ONE here because the
 * prompt does not start with "Choose" (coloratt.c:396); ESC (tmp == -1)
 * leaves the attribute alone. */
export async function handler_petattr(preserveStatus = false) {
    const iflags = (game.iflags ||= {});
    const tmp = await query_attr_one('Select pet highlight attribute',
        iflags.wc2_petattr ?? 7 /* ATR_INVERSE */, preserveStatus);
    if (tmp !== -1) {
        iflags.wc2_petattr = tmp;
        /* C: iflags.hilite_pet = (wc2_petattr != ATR_NONE); the port's storage
         * is the wc_hilite_pet spelling (optlist.h:366, flag.h:508 alias). */
        iflags.wc_hilite_pet = tmp !== 0;
        /* go.opt_initial is never set when handlers run (rc parsing calls
         * optfn do_set, not do_handler), so the redraw is unconditional. */
        (game.go ||= {}).opt_need_redraw = true;
    }
}

/* C options.c:6085 handler_pickup_burden: PICK_ONE over burdentype[], ids
 * i+1, NO preselection; the first pick (no group toggles exist) indexes
 * flags.pickup_burden. */
export async function handler_pickup_burden(preserveStatus = false) {
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    BURDENTYPE.forEach((n, i) => m.add_menu(i + 1, 'ubsntl'[i], ATR_NONE, n,
        false, false));
    m.end_menu('Select encumbrance level:');
    const { count, picks } = await m.select_menu(PICK_ONE);
    if (count > 0) (game.flags ||= {}).pickup_burden = picks[0] - 1;
}

/* C options.c:6123 handler_runmode. */
const runmodes = ['teleport', 'run', 'walk', 'crawl'];
export async function handler_runmode(preserveStatus = false) {
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    runmodes.forEach((n, i) => m.add_menu(i + 1, n[0], ATR_NONE, n, false, false));
    m.end_menu('Select run/travel display mode:');
    const { count, picks } = await m.select_menu(PICK_ONE);
    if (count > 0) game.flags.runmode = picks[0] - 1;
}

/* C options.c:6206 handler_whatis_coord: PICK_ONE; the id is the GPCOORDS
 * letter itself (any.a_char), the current setting is preselected. */
export async function handler_whatis_coord(preserveStatus = false) {
    const iflags = (game.iflags ||= {});
    const gpc = iflags.getpos_coords || 'n';
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    const ent = (c, s) => m.add_menu(c.charCodeAt(0), c, ATR_NONE, s, false, gpc === c);
    ent('c', "compass ('east' or '3s' or '2n,4w')");
    ent('f', "full compass ('east' or '3south' or '2north,4west')");
    ent('m', 'map <x,y>');
    ent('s', 'screen [row,column]');
    ent('n', 'none (no coordinates displayed)');
    m.add_menu_str('');
    m.add_menu_str(`map: upper-left: <1,0>, lower-right: <79,20>${game.flags?.verbose ? '; column 0 unused, off left edge' : ''}`);
    m.add_menu_str(`screen: upper-left: [02,01], lower-right: [22,79]${game.flags?.verbose ? '; column 80 is not used' : ''}`);
    m.add_menu_str('');
    m.end_menu('Select coordinate display when auto-describing a map position:');
    const { count, picks } = await m.select_menu(PICK_ONE);
    if (count > 0) {
        iflags.getpos_coords = String.fromCharCode(picks[0]);
        if (count > 1 && iflags.getpos_coords === gpc)
            iflags.getpos_coords = String.fromCharCode(picks[1]);
    }
}

/* C options.c:6573 handler_versinfo: PICK_ANY over VI_NUMBER/VI_NAME/VI_BRANCH
 * (ids 1/2/4, selectors n/g/b), current bits preselected.  No git branch in
 * the scored build, so the third entry reads "(not applicable)" (released). */
export async function handler_versinfo(preserveStatus = false) {
    const flags = (game.flags ||= {});
    const vi = flags.versinfo ?? 1;
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    m.add_menu(1, 'n', ATR_NONE, 'version number', false, !!(vi & 1));
    m.add_menu(2, 'g', ATR_NONE, 'game name', false, !!(vi & 2));
    m.add_menu(4, 'b', ATR_NONE, '(not applicable)', false, !!(vi & 4));
    m.end_menu('Select version information flags:');
    const { count, picks } = await m.select_menu(PICK_ANY);
    if (count > 0) {
        let newval = 0;
        for (const p of picks) newval |= p;
        newval &= 7;
        if (newval) flags.versinfo = newval;
    }
}

/* C options.c:6254 handler_whatis_filter: ids are GFILTER_x + 1. */
export async function handler_whatis_filter(preserveStatus = false) {
    const iflags = (game.iflags ||= {});
    const gfilt = iflags.getloc_filter || 0;
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    [['n', 'no filtering'], ['v', 'in view only'], ['a', 'in same area']].forEach(([c, s], i) =>
        m.add_menu(i + 1, c, ATR_NONE, s, false, gfilt === i));
    m.end_menu('Select location filtering when going for next/previous map position:');
    const { count, picks } = await m.select_menu(PICK_ONE);
    if (count > 0) {
        iflags.getloc_filter = picks[0] - 1;
        if (count > 1 && iflags.getloc_filter === gfilt) iflags.getloc_filter = picks[1] - 1;
    }
}

/* C options.c:220 sortltype[]: none / loot / full. */
const sortltypes = ['none', 'loot', 'full'];
/* C options.c:6165 handler_sortloot.  The menu is PICK_ONE; the currently
 * selected sortloot entry is preselected (MENU_ITEMFLAGS_SELECTED), and a
 * second pick of that same entry resolves to the next one (options.c:6190). */
export async function handler_sortloot(preserveStatus = false) {
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    sortltypes.forEach((n, i) => m.add_menu(i + 1, n[0], ATR_NONE, n, false,
        game.flags.sortloot === n[0]));
    m.end_menu('Select loot sorting type:');
    const { count, picks } = await m.select_menu(PICK_ONE);
    if (count > 0) {
        let c = sortltypes[picks[0] - 1][0];
        if (count > 1 && c === game.flags.sortloot) c = sortltypes[picks[1] - 1][0];
        game.flags.sortloot = c;
        /* C options.c:6197: changing sortloot affects the persistent inventory. */
        if (game.iflags?.perm_invent) update_inventory();
    }
}

/* C insight.c:2601 vanqorders[][0..1] */
const VANQ_OPT = [
    ['t', 'traditional: by monster level'], ['d', 'by monster difficulty rating'],
    ['a', 'alphabetically, unique monsters separate'],
    ['A', 'alphabetically, unique monsters intermixed'],
    ['C', 'by monster class, high to low level in class'],
    ['c', 'by monster class, low to high level in class'],
    ['n', 'by count, high to low'], ['z', 'by count, low to high'],
];

/* C options.c:207 unlocktypes[] */
const unlocktypes = [
    ['untrap', '(might fail)'], ['apply-key', ''],
    ['kick', '(doors only)'], ['force', '(chests/boxes only)'],
];
/* flags.autounlock defaults to AUTOUNLOCK_APPLY_KEY (flag.h:75). */
function autounlockFlags() {
    const f = game.flags?.autounlock;
    return f === undefined ? 2 : f;
}
/* C options.c:1145 optfn_autounlock get_val: names joined with ' + ', or "none". */
function autounlockStr() {
    const f = autounlockFlags();
    if (!f) return 'none';
    return unlocktypes.filter((_, i) => f & (1 << i)).map(t => t[0]).join(' + ');
}

/* C dat/symbols pick-list: [name, handling, description, restriction].  The
 * file is not vendored under js/dat (V5_DIVERGENT), so the symset headers
 * read_sym_file() collects with gs.symset[].name == NULL (symbols.c:497-552)
 * are tabled here.  MACgraphics (H_MAC) is skipped by do_symset() on non-Mac
 * builds; Rogue* sets carry the "rogue" restriction. */
const SYMSET_LIST = [
    ['plain', 0, "same as default symbols, except '+' for corner walls", ''],
    ['Blank', 0, 'completely blank symbols', ''],
    ['IBMgraphics', 1, 'special line-drawing characters used for walls', ''],
    ['IBMGraphics_1', 1, '', ''],
    ['IBMGraphics_2', 1, '', ''],
    ['RogueIBM', 1, '', 'rogue'],
    ['RogueEpyx', 1, 'rogue level color symbol set like Epyx Rogue', 'rogue'],
    ['RogueWindows', 1, '', 'rogue'],
    ['curses', 2, 'approximation of IBMgraphics using DECgraphics', 'primary'],
    ['DECgraphics', 2, 'special line-drawing characters used for walls', 'primary'],
    ['Enhanced1', 5, 'Enhanced with Unicode glyphs and 24-bit color', 'primary'],
    ['Enhanced2', 5, 'Enhanced with more Unicode glyphs and 24-bit color', 'primary'],
    ['AmigaFont', 0, 'Amiga hack.font line-drawing and effect characters', ''],
];

/* C symbols.c:909 do_symset(): both pickers share the restriction filter. */
export async function handler_symset(preserveStatus = false, rogueflag = false) {
    const cur = gs.symset[rogueflag ? 1 : 0];
    const symset_name = cur.name;
    const sets = SYMSET_LIST.filter((s) => s[3] !== (rogueflag ? 'primary' : 'rogue'));
    let biggest = 'Default Symbols'.length;
    for (const s of sets) biggest = Math.max(biggest, s[0].length);
    let defindx = 0;
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    if (!symset_name) defindx = 1;
    m.add_menu(1, 0, ATR_NONE, 'Default Symbols', false, defindx === 1);
    sets.forEach((s, i) => {
        const id = i + 2;
        if (symset_name && s[0].toLowerCase() === symset_name.toLowerCase()) defindx = id;
        m.add_menu(id, 0, ATR_NONE, s[0].padEnd(biggest + 2) + ' ' + s[2], false, id === defindx);
    });
    m.end_menu(`Select ${rogueflag ? 'rogue level ' : ''}symbol set:`);
    const { count, picks } = await m.select_menu(PICK_ONE);
    let chosen = -2;
    if (count > 0) {
        chosen = picks[0];
        if (count === 2 && chosen === defindx) chosen = picks[1];
        chosen -= 2;
    } else if (count === 0 && defindx > 0) {
        chosen = defindx - 2;
    }
    if (chosen > -1) {
        const sl = sets[chosen];
        if (!sl) return true;
        const wasDec = dec_mode();
        cur.name = sl[0];
        cur.handling = sl[1];
        /* rows still physically drawn under the old DEC shift until a window
         * is dismissed over them (see com_pager render_map_row_clipped) */
        if (wasDec && !dec_mode()) game._decStaleFrom = 0;
        /* C symbols.c:909-1090 do_symset — init_primary_symbols() resets every
         * showsym to its defsym default before read_sym_file loads the set, so
         * S_darkroom paints '.' until reglyph_darkroom() restores the alias to
         * S_room (display.c:1860-1897) at the doset tail's
         * reset_needed_visuals.  display.js re-derives glyphs from this flag
         * (see _remap_remembered_ibm / _terrain_glyph_base ROOM). */
        game._symsetDarkroomPending = true;
    } else if (chosen === -1) {
        cur.name = null;
        cur.handling = 0;
    }
    return true;
}

/* C options.c:5624 handler_autounlock. */
export async function handler_autounlock(preserveStatus = false) {
    const oldflags = autounlockFlags();
    const sep = game.iflags?.menu_tab_sep ? '\t' : ' ';
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    unlocktypes.forEach(([n, d], i) => {
        const buf = n.slice(0, 10).padEnd(10) + sep + d.slice(0, 40);
        m.add_menu(i + 1, n[0], ATR_NONE, buf, false, !!(oldflags & (1 << i)));
    });
    m.end_menu("Select 'autounlock' actions:");
    const { count, picks } = await m.select_menu(PICK_ANY);
    game.flags ||= {};
    if (count > 0) {
        let nf = 0;
        for (const p of picks) nf |= (1 << (p - 1));
        game.flags.autounlock = nf;
    } else if (count === 0) {
        game.flags.autounlock = 0;
    } else {
        game.flags.autounlock = oldflags;
    }
    const chngd = game.flags.autounlock !== oldflags;
    if (chngd || game.flags.verbose)
        await pline(`'autounlock' ${chngd ? 'changed to' : 'is still'} '${autounlockStr()}'.`);
}

/* C cmd.c:2208 count_bind_keys() — extended commands bound to a non-default
 * key, plus commands that should have a key but have none. */
function count_bind_keys() {
    const keys = new Uint8Array(256);
    let nbinds = 0;
    for (let bind = game.Cmd?.cmdbinds; bind; bind = bind.next) {
        keys[bind.key] = 1;
        if (bind.userbind && bind.cmd && bind.cmd.key !== bind.key) nbinds++;
    }
    for (const ec of EXTCMDLIST)
        if (ec.key && !keys[ec.key]) nbinds++;
    return nbinds;
}

/* C cmd.c:2243 get_changed_key_binds(NULL) — text window form. */
async function get_changed_key_binds() {
    const lines = [];
    const keys = new Uint8Array(256);
    for (let bind = game.Cmd?.cmdbinds; bind; bind = bind.next) {
        keys[bind.key] = 1;
        if (bind.userbind && bind.cmd && bind.cmd.key !== bind.key) {
            if (bind.cmd.flags & 0x4000 /* CMD_PARAM */)
                lines.push(`BIND=${key2txt(bind.key)}:${bind.cmd.name}(${bind.param})`);
            else
                lines.push(`BIND=${key2txt(bind.key)}:${bind.cmd.name}`);
        }
    }
    for (const ec of EXTCMDLIST)
        if (ec.key && !keys[ec.key])
            lines.push(`BIND=${key2txt(ec.key)}:nothing`);
    await display_text_window(lines);
}

/* C cmd.c:2291 handler_rebind_keys_add(keyfirst). */
/* Returns true when something flushed the topline/status (pline). */
async function handler_rebind_keys_add(keyfirst) {
    let key = 0, flushed = false;
    if (keyfirst) {
        await pline('Bind which key? ');
        await flush_screen(0);
        /* tty_putstr leaves the cursor just past the topline text (cw->curx = 16) */
        set_cursor('Bind which key? '.length, 0);
        key = (await pgetchar()) & 0xff;
        if (!key || key === 27) return true;
    }
    /* ~170 items span several pages, so tty_display_nhwindow() uses the
     * whole screen (offx 0), unlike the two-line "Do what?" overlay. */
    await drainTopline();
    const m = new TtyMenu();
    if (key) {
        const bind = cmdbind_get(key);
        if (bind && bind.cmd)
            m.add_menu_str(`Key '${key2txt(key)}' is currently bound to "${bind.cmd.name}".`);
        else
            m.add_menu_str(`Key '${key2txt(key)}' is not bound to anything.`);
        m.add_menu_str('');
    }
    m.add_menu(-1, 0, ATR_NONE, 'nothing: unbind the key', false, false);
    m.add_menu_str('');
    EXTCMDLIST.forEach((ec, i) => {
        if (ec.flags & (0x0400 | 0x0040 | 0x0010)) return; /* MOVEMENTCMD|INTERNALCMD|CMD_NOT_AVAILABLE */
        m.add_menu(i + 1, 0, ATR_NONE, `${ec.name}: ${ec.desc}`, false, false);
    });
    m.end_menu(key ? `Bind '${key2txt(key)}' to what command?` : 'Bind what command?');
    const { count, picks } = await m.select_menu(PICK_ONE);
    if (count > 0) {
        const i = picks[0];
        let ec = null, cmdstr;
        if (i === -1) {
            cmdstr = 'nothing';
        } else {
            ec = EXTCMDLIST[i - 1];
            if (ec.flags & 0x4000 /* CMD_PARAM */) {
                const parambuf = mungspaces(await getlin(`Command ${ec.name} requires a parameter:`));
                cmdstr = `${ec.name}(${parambuf})`;
            } else {
                cmdstr = ec.name;
            }
        }
        if (!key) {
            await pline('Bind which key? ');
            await flush_screen(1);
            flushed = true; /* painted AFTER the full-screen command menu */
            key = (await pgetchar()) & 0xff;
            if (!key || key === 27) return true;
        }
        const prevcmd = cmdbind_get(key);
        if (bind_key(key, cmdstr, true)) {
            if (prevcmd && prevcmd.cmd !== ec)
                flushed = true, await pline(`Changed key '${key2txt(key)}' from "${prevcmd.cmd.name}" to "${cmdstr}".`);
            else if (!prevcmd)
                flushed = true, await pline(`Bound key '${key2txt(key)}' to "${cmdstr}".`);
        } else {
            await pline('Key binding failed?!');
            flushed = true;
        }
    }
    return flushed;
}

/* C cmd.c:2449 handler_change_autocompletions. */
export async function handler_change_autocompletions(preserveStatus = false) {
    const AUTOCOMPLETE = 0x0002, AUTOCOMP_ADJ = 0x2000;
    const CMD_NOT_AVAILABLE = 0x0010, INTERNALCMD = 0x0040;
    const m = new TtyMenu();
    EXTCMDLIST.forEach((ec, i) => {
        if ((ec.flags & (INTERNALCMD | CMD_NOT_AVAILABLE)) !== 0) return;
        if (ec.name.length < 2) return;
        const buf = `${(ec.flags & AUTOCOMP_ADJ) ? '*' : ' '} ${ec.name}: ${ec.desc}`;
        m.add_menu(i + 1, 0, ATR_NONE, buf, false, !!(ec.flags & AUTOCOMPLETE));
    });
    m.end_menu('Which commands autocomplete?');
    const { count, picks } = await m.select_menu(PICK_ANY);
    if (count >= 0) {
        const chosen = new Set(picks.slice(0, count));
        EXTCMDLIST.forEach((ec, i) => {
            if ((ec.flags & (INTERNALCMD | CMD_NOT_AVAILABLE)) !== 0) return;
            if (ec.name.length < 2) return;
            parseautocomplete(ec.name, chosen.has(i + 1));
        });
    }
}

/* C cmd.c:2408 handler_rebind_keys. */
export async function handler_rebind_keys() {
    /* The options window blanked the status rows; once any sub-step has
     * flushed (pline, --More--), later menus overlay a painted status. */
    let statusPainted = false;
    for (;;) {
        /* C: opening the window over a pending topline message more()s it. */
        await drainTopline();
        const m = new TtyMenu({ overlay: true, statusClipCol: statusPainted ? undefined : 0 });
        m.add_menu(1, 0, ATR_NONE, 'bind key to a command', false, false);
        m.add_menu(2, 0, ATR_NONE, 'bind command to a key', false, false);
        if (count_bind_keys())
            m.add_menu(3, 0, ATR_NONE, 'view changed key binds', false, false);
        m.end_menu('Do what?');
        const { count, picks } = await m.select_menu(PICK_ONE);
        if (count <= 0) return;
        const i = picks[0];
        if (i === 1 || i === 2) { if (await handler_rebind_keys_add(i === 1)) statusPainted = true; }
        else if (i === 3) { await get_changed_key_binds(); statusPainted = true; }
    }
}

export async function doset() {
    const g = game;
    g.flags = g.flags || {};
    g.iflags = g.iflags || {};
    g.go ||= {}; // C's option redraw flags are zero-initialized globals.
    /* C ref: options.c:8773 — `boolean skiphelp = !iflags.cmdassist`.  The
     * cmdassist row itself is one of the booleans below, so this reads the
     * same storage the menu shows. */
    let skiphelp = !((g.iflags.cmdassist === undefined) ? true : g.iflags.cmdassist);
    let gavehelp = false;

    let needVisuals = false;
    for (;;) { /* C: `rerun:` */
        const m = new TtyMenu();
        /* rows[k] is the option behind a_int k+1; HELP_A_INT is the '?' row. */
        const rows = [];
        const HELP_A_INT = -1;

        /* C ref: options.c:8788-8809 — the cmdassist help block.  helptext[]
         * has exactly one NULL, and the '?' menu entry is inserted there. */
        if (!skiphelp) {
            const helptext = [
                "For a brief explanation of how this works, type '?' to select",
                'the next menu choice, then press <enter> or <return>.',
                null, /* the '?' entry goes here */
                "[To suppress this menu help, toggle off the 'cmdassist' option.]",
                '',
            ];
            for (const h of helptext) {
                if (h !== null) {
                    /* C: Sprintf(buf, "%4s%.75s", "", helptext[i]) */
                    m.add_menu_str('    ' + h.slice(0, 75));
                } else {
                    m.add_menu(HELP_A_INT, '?', ATR_NONE, 'view help for options menu', true);
                }
            }
        }

        /* C ref: options.c:8829-8862 — booleans, pass 0 (non-modifiable, shown
         * indented and unselectable) then pass 1 (modifiable). */
        m.add_menu_heading('Booleans (selecting will toggle value):');
        for (const pass of [0, 1]) {
            for (const row of DOSET_BOOLS) {
                if (row.pass !== pass) continue;
                /* C options.c:8842-8847 — wizard-only rows are included when
                 * playmode is debug; set_wiznofuz rows disappear for the
                 * runtime debug_fuzzer flag. */
                if (row.wizardOnly && !g.flags.debug) continue;
                if (row.wizNoFuz && g.iflags.debug_fuzzer) continue;
                const value = boolValue(row);
                /* C: indent = (pass == 0 && !menu_tab_sep) ? "    " : "" */
                const text = dosetRow(pass === 0 && !g.iflags.menu_tab_sep ? '    ' : '', row.name,
                                      term_for_boolean(row, value));
                if (pass === 0) {
                    m.add_menu_str(text);
                } else {
                    rows.push({ kind: 'bool', row });
                    m.add_menu(rows.length, 0, ATR_NONE, text, true);
                }
            }
        }

        /* C ref: options.c:8864-8882 — compounds. */
        m.add_menu_str('');
        m.add_menu_heading('Compounds (selecting will prompt for new value):');
        for (const row of DOSET_COMPOUNDS) {
            /* C ref: options.c:9026 doset_add_menu — an optfn that returns an
             * empty string leaves the value at its "unknown" default. */
            const value = (row.name === 'number_pad' ? number_pad_value() : compound_option_value(row.name) ?? row.val()) || 'unknown';
            if (!row.sel) {
                m.add_menu_str(dosetRow('    ', row.name, value));
            } else {
                rows.push({ kind: 'comp', row });
                m.add_menu(rows.length, 0, ATR_NONE, dosetRow('', row.name, value), true);
            }
        }

        /* C ref: options.c:8884-8898 — "Other settings". */
        m.add_menu_str('');
        m.add_menu_heading('Other settings:');
        for (const row of DOSET_OTHERS) {
            const value = row.val() || 'unknown';
            if (!row.sel) {
                m.add_menu_str(dosetRow('    ', row.name, value));
            } else {
                rows.push({ kind: 'othr', row });
                m.add_menu(rows.length, 0, ATR_NONE, dosetRow('', row.name, value), true);
            }
        }

        m.end_menu('Set what options?');
        /* C options.c:8903-8904: both flags are cleared before the menu is put up,
         * so the startup symset's pending redraw does not survive into the walk. */
        g.go.opt_need_redraw = g.go.opt_need_glyph_reset = false;
        const { count, picks } = await m.select_menu(PICK_ANY);
        /* C wintty.c tty_dismiss_nhwindow(NHW_MENU) docrt()s the map, whose cls()
         * blanks the physical screen: a RogueEpyx hero square (\x01 paints no
         * glyph) must not keep a cell painted before the full-screen menu. */
        g._epyxPhys = null;

        let statusRefreshed = false;
        if (count > 0) {
            /* C ref: options.c:8909-8959 — walk the picks in menu order and
             * either invert the boolean or run the compound's handler. */
            for (const a of picks) {
                if (a === HELP_A_INT) {
                    /* C options.c:8917-8918: display_file(OPTMENUHELP, FALSE) */
                    g._pending_message = '';
                    await display_text_window(dlb_file_lines(OPTMENUHELP));
                    gavehelp = true;
                    continue;
                }
                const ent = rows[a - 1];
                if (!ent) continue;
                if (ent.kind === 'bool') {
                    /* C: Sprintf(buf, "%s%s", *addr ? "!" : "", name);
                     *    parseoptions(buf, FALSE, FALSE);
                     * which lands in optfn_boolean and flips the storage. */
                    const box = boolBox(ent.row);
                    const negated = boolValue(ent.row);
                    box[ent.row.fld] = !negated;
                    /* C flag.h:507 aliases use_color to wc_color; options.c:5408-5410
                     * requests a glyph reset and redraw when this option changes. */
                    if (ent.row.name === 'color') {
                        g._gm_use_color ??= g.iflags.use_color;
                        g.iflags.use_color = !negated;
                        g.go.opt_need_redraw = g.go.opt_need_glyph_reset = true;
                        needVisuals = true;
                    }
                    if (ent.row.name === 'rest_on_space') update_rest_on_space();
                    /* same status_initialize(REASSESS_ONLY) -> update_all reset as doset_simple */
                    if (['showscore', 'showvers', 'showexp', 'time', 'hitpointbar'].includes(ent.row.name)) delete g._blTemp;
                    /* C options.c:5376-5385: these toggles reset glyphs and
                     * redraw after the pick walk, acknowledging pending messages
                     * through reset_needed_visuals() -> docrt() -> cls(). */
                    if (['wizmgender', 'showrace', 'use_inverse', 'hilite_pile',
                         'perm_invent', 'ascii_map', 'tiled_map'].includes(ent.row.name)) {
                        g.go.opt_need_redraw = g.go.opt_need_glyph_reset = true;
                        needVisuals = true;
                    }
                    /* C optfn_boolean (options.c:5412-5416): these set the pending-visual flags. */
                    if (ent.row.name === 'customcolors') { g.go.opt_reset_customcolors = true; needVisuals = true; }
                    if (ent.row.name === 'customsymbols') { g.go.opt_reset_customsymbols = true; needVisuals = true; }
                    /* C optfn_boolean (options.c:5369-5385): dark_room and lit_corridor
                     * shut down vision, delay the full recalc, and request a darkroom
                     * redraw. Without it the doset walk never reaches reset_needed_visuals()
                     * and the cls()'s --More-- on the toggled message is lost. */
                    if (ent.row.name === 'dark_room' || ent.row.name === 'lit_corridor') {
                        vision_recalc(2);
                        g.vision_full_recalc = 1;
                        if (g.iflags.use_color) g.go.opt_need_redraw = true;
                        needVisuals = true;
                    }
                    if (ent.row.name === 'hitpointbar'
                        && (!g.windowprocs || (g.windowprocs.wincap2 & (0x8 | 0x80)))) {
                        g.go.opt_need_redraw = true;
                        needVisuals = true;
                    }
                    /* C ref: options.c:5438-5440 — give_opt_msg is TRUE on the
                     * doset() path (only doset_simple clears it). */
                    if (ent.row.name === 'idlecheckpoint') {
                        /* C options.c:5313-5319: no IDLECHECKPOINT support; the option is
                         * forced back off and give_opt_msg is FALSE (no toggled message). */
                        await pline("There is no underlying support for 'idlecheckpoint' compiled in.");
                        g.iflags.idlecheckpoint = false;
                        /* give_opt_msg is a file static that only doset_simple restores
                         * (options.c:8733): full doset leaves it FALSE for good. */
                        option_state().give_opt_msg = false;
                    } else if (option_state().give_opt_msg)
                    await pline(`'${ent.row.name}' option toggled ${!negated ? 'on' : 'off'}.`);
                    if (option_state().give_opt_msg || ent.row.name === 'idlecheckpoint') {
                        await flush_screen(1);
                        statusRefreshed = true;
                    }
                } else if (ent.row.name === 'pickup_types') {
                    /* C: has_handler -> optfn_pickup_types(do_handler) ->
                     * handler_pickup_types -> the object-class picker. */
                    await drainTopline();
                    await optfn_pickup_types_handler(statusRefreshed);
                    statusRefreshed = false;
                } else if (ent.row.name === 'autopickup exceptions') {
                    await drainTopline();
                    await handler_autopickup_exception(statusRefreshed);
                } else if (ent.row.name === 'number_pad') {
                    await drainTopline();
                    await numberPadSubmenu();
                    statusRefreshed = true;
                } else if (ent.row.name === 'autounlock') {
                    await drainTopline();
                    await handler_autounlock(statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'msg_window') {
                    await drainTopline();
                    await handler_msg_window(statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'autocompletions') {
                    await drainTopline();
                    await handler_change_autocompletions(statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'bind keys') {
                    await drainTopline();
                    await handler_rebind_keys();
                    statusRefreshed = true;
                } else if (ent.row.name === 'whatis_coord') {
                    await drainTopline();
                    await handler_whatis_coord(statusRefreshed);
                    /* the overlay menu does not cover the status rows, so a status
                     * left blank by handler_symset (statusRefreshed false after a
                     * DEC->other change) is still blank for the next menu */
                    statusRefreshed = game._decStaleFrom == null;
                } else if (ent.row.name === 'whatis_filter') {
                    await drainTopline();
                    await handler_whatis_filter(statusRefreshed);
                    statusRefreshed = game._decStaleFrom == null;
                } else if (ent.row.name === 'versinfo') {
                    /* C options.c:4512-4516 optfn_versinfo(do_handler) */
                    await drainTopline();
                    const vi0 = game.flags?.versinfo ?? 1;
                    await handler_versinfo(statusRefreshed);
                    const vi1 = game.flags?.versinfo ?? 1;
                    await pline("'versinfo' %s %d.",
                        vi1 === vi0 ? 'not changed, still' : 'changed to', vi1);
                    /* options.c:4530-4533: a change sets go.opt_need_redraw */
                    if (vi1 !== vi0) { g.go.opt_need_redraw = true; needVisuals = true; }
                    statusRefreshed = true;
                } else if (ent.row.name === 'runmode') {
                    await drainTopline();
                    await handler_runmode(statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'disclose') {
                    await drainTopline();
                    await handler_disclose(statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'sortdiscoveries') {
                    await drainTopline();
                    await choose_disco_sort(0, statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'sortloot') {
                    await drainTopline();
                    await handler_sortloot(statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'sortvanquished') {
                    /* C options.c:4001 optfn_sortvanquished -> set_vanq_order(TRUE) */
                    await drainTopline();
                    const prevVanq = game.flags.vanq_sortmode | 0;
                    await list_vanquished_set_vanq_order(true, statusRefreshed ? undefined : 0);
                    /* C options.c:3997-4002: pline after set_vanq_order */
                    const vm = game.flags.vanq_sortmode | 0;
                    await pline("'sortvanquished' %s \"%s: %s\".",
                        vm === prevVanq ? 'not changed, still' : 'changed to',
                        VANQ_OPT[vm][0], VANQ_OPT[vm][1]);
                    statusRefreshed = true;
                } else if (ent.row.name === 'menu_headings') {
                    await drainTopline();
                    await handler_menu_headings(statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'menu colors') {
                    await drainTopline();
                    await handler_menu_colors(statusRefreshed);
                    statusRefreshed = game._decStaleFrom == null;
                } else if (ent.row.name === 'message types') {
                    await drainTopline();
                    await handler_msgtype(statusRefreshed);
                    statusRefreshed = game._decStaleFrom == null;
                } else if (ent.row.name === 'status condition fields') {
                    await drainTopline();
                    await cond_menu();
                    statusRefreshed = game._decStaleFrom == null;
                } else if (ent.row.name === 'status highlight rules') {
                    await drainTopline();
                    await status_hilite_menu(statusRefreshed);
                    statusRefreshed = game._decStaleFrom == null;
                } else if (ent.row.name === 'menu_objsyms') {
                    await drainTopline();
                    await handler_menu_objsyms(statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'menustyle') {
                    await drainTopline();
                    await handler_menustyle(statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'paranoid_confirmation') {
                    await drainTopline();
                    await handler_paranoid_confirmation(statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'petattr') {
                    await drainTopline();
                    await handler_petattr(statusRefreshed);
                    /* handler_petattr set go.opt_need_redraw; doset's tail
                     * runs reset_needed_visuals() (options.c:8973) which
                     * docrt()s so the pet repaints under the new attribute. */
                    needVisuals = true;
                    statusRefreshed = true;
                } else if (ent.row.name === 'pickup_burden') {
                    await drainTopline();
                    await handler_pickup_burden(statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'symset' || ent.row.name === 'roguesymset') {
                    /* C options.c:6325 handler_symset(), 8939 do_handler. */
                    await drainTopline();
                    await handler_symset(statusRefreshed, ent.row.name === 'roguesymset');
                    g.go.opt_need_redraw = true;
                    needVisuals = true;
                    statusRefreshed = false;
                } else if (ent.row.hasHandler === false) {
                    /* C ref: options.c:8944-8953 — no handler, so getlin.  The
                     * pending mention's --More-- (opening the getlin window)
                     * stands over the status rows the menu overdrew. */
                    g._status_blanked = !statusRefreshed;
                    await drainTopline();
                    g._status_blanked = false;
                    /* C pline.c vpline flushes status before each toggle
                     * message.  getline.c disables bot() inside getlin, so
                     * preserve that already painted status; only a prompt
                     * entered directly after the menu has blank status. */
                    g._status_blanked = !statusRefreshed;
                    const abuf = await getlin(`Set ${ent.row.name} to what?`);
                    g._status_blanked = false;
                    if (abuf !== '\x1b' && ent.row.name === 'fruit') {
                        /* C options.c:1725-1760 optfn_fruit(do_set) — see the
                         * PAGES 'fruit' entry above for why writing pl_fruit
                         * alone is not enough. */
                        const msg = optfn_fruit_set(mungspaces(abuf));
                        if (msg) g._pending_message = msg;
                    } else if (abuf !== '\x1b' && ent.row.name === 'hilite_status') {
                        const hlmsg = optfn_hilite_status_set(mungspaces(abuf));
                        if (hlmsg) await pline(hlmsg);
                    } else if (abuf !== '\x1b' && ent.row.name === 'statushilites') {
                        optfn_statushilites_set(g.iflags, mungspaces(abuf));
                    } else if (abuf !== '\x1b' && (ent.row.name === 'crash_email' || ent.row.name === 'crash_name')) {
                        /* C options.c:1274-1290 / 1300-1316 optfn_crash_email/name(do_set):
                         * string_for_opt() then gc.crash_* = dupstr(op); an empty
                         * answer is optn_err and leaves it unchanged. */
                        const op = mungspaces(abuf);
                        if (op) game.gc[ent.row.name] = op;
                    } else if (abuf !== '\x1b' && ent.row.name === 'crash_urlmax') {
                        /* C options.c:1311-1331 optfn_crash_urlmax(do_set):
                         * atoi(op); below 75 is optn_err, else gc.crash_urlmax. */
                        const op = mungspaces(abuf);
                        if (op) {
                            const temp = parseInt(op, 10) || 0;
                            if (temp >= 75) game.gc.crash_urlmax = temp;
                        }
                    } else if (abuf !== '\x1b' && ent.row.name === 'menuinvertmode') {
                        /* C options.c:2297-2308 optfn_menuinvertmode(do_set):
                         * atoi(op); outside 0..2 is optn_err. */
                        const op = mungspaces(abuf);
                        if (op) {
                            const mode = parseInt(op, 10) || 0;
                            if (mode >= 0 && mode <= 2) g.iflags.menuinvertmode = mode;
                        }
                    } else if (abuf !== '\x1b' && ent.row.name === 'scores') {
                        /* C options.c:3676-3733 optfn_scores(do_set): "5t[op] 5a[round] o[wn]" */
                        const fl = g.flags;
                        fl.end_top = fl.end_around = 0; fl.end_own = false;
                        let op = mungspaces(abuf);
                        scoresParse: while (op.length) {
                            let inum = 1;
                            const neg = op[0] === '!' || /^no/i.test(op);
                            if (neg) op = op.slice(op[0] === '!' ? 1 : (op[2] !== '-' ? 2 : 3));
                            const m = /^\d+/.exec(op);
                            if (m) { inum = parseInt(m[0], 10); op = op.slice(m[0].length); }
                            op = op.replace(/^ +/, '');
                            switch ((op[0] || '').toLowerCase()) {
                            case 't': fl.end_top = neg ? 0 : inum; break;
                            case 'a': fl.end_around = neg ? 0 : inum; break;
                            case 'o': fl.end_own = !(neg || !inum); break;
                            case 'n': fl.end_top = fl.end_around = 0; fl.end_own = false; break;
                            default: break scoresParse; /* config_error_add path: not ported */
                            }
                            op = op.replace(/^[A-Za-z]+/, '').replace(/^ +/, '').replace(/^\//, '');
                        }
                    } else if (abuf !== '\x1b' && ent.row.name === 'pile_limit') {
                        /* C options.c:3404-3428 optfn_pile_limit(do_set):
                         * atoi(op); an empty value is PILE_LIMIT_DFLT (5) and
                         * a negative result falls back to it as well. */
                        const op = mungspaces(abuf);
                        let lim = op ? (parseInt(op, 10) || 0) : 5;
                        if (lim < 0) lim = 5;
                        g.flags.pile_limit = lim;
                    } else if (abuf !== '\x1b' && ent.row.name === 'packorder') {
                        /* C options.c:2670-2680 optfn_packorder(do_set) -> 7466
                         * change_inv_order: COIN first unless named, keep good
                         * entries, append omissions from the previous order. */
                        const op = mungspaces(abuf);
                        if (op) {
                            const previous = g.flags.inv_order || [12, 5, 2, 3, 7, 9, 10, 8, 4, 11, 6, 13, 14, 15, 16];
                            const order = op.includes('$') ? [] : [12];
                            for (let i = 0; i < op.length; i++) {
                                const oc = def_char_to_objclass(op.charCodeAt(i));
                                if (oc !== 18 && previous.includes(oc) && !op.includes(op[i], i + 1))
                                    order.push(oc);
                            }
                            g.flags.inv_order = order.concat(previous.filter(oc => !order.includes(oc)));
                        }
                    } else if (abuf !== '\x1b' && ent.row.name === 'statuslines') {
                        /* C options.c:4067-4098 optfn_statuslines(do_set) */
                        const message = optfn_statuslines_set(mungspaces(abuf));
                        if (!message) {
                            /* options.c:4091-4092: go.opt_need_redraw = TRUE */
                            g.go.opt_need_redraw = true;
                            needVisuals = true;
                        }
                        if (message) {
                            /* getline.c leaves bot() disabled: the --More-- is raised
                             * with the status rows still blank. */
                            g._pending_message = message;
                            g._status_blanked = true;
                            await drainTopline();
                            g._status_blanked = false;
                            statusRefreshed = false;
                        }
                    } else if (abuf !== '\x1b' && ent.row.name === 'boulder') {
                        needVisuals = (await optfn_boulder_set(mungspaces(abuf))) || needVisuals;
                    } else if (abuf !== '\x1b' && ent.row.name === 'suppress_alert') {
                        const { message } = optfn_suppress_alert_set(g.flags, mungspaces(abuf), false, false);
                        if (message) await pline(message);
                    }
                }
            }
        }

        /* C ref: options.c:8964-8970 — when '?' was the ONLY pick, rebuild the
         * menu without the help block and ask again. */
        if (count === 1 && gavehelp) {
            skiphelp = true;
            gavehelp = false;
            continue;
        }
        break;
    }

    /* C options.c:8973 doset(): reset_needed_visuals() after the pick walk. */
    if (needVisuals) await reset_needed_visuals();
    game._decStaleFrom = null;
    /* C: this handler returns ECMD_OK on every path; rhack() maps it. */
    return ECMD_OK;
}
