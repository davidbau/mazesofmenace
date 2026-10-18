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
import { ECMD_OK, gs } from './const.js';
import { nhgetch } from './input.js';
import { flush_screen, pline, force_more, docrt } from './display.js';
import { update_inventory } from './inventory_refresh.js';
/* C options.c:8944 — the generic compound-option path reads its value with
 * getlin(); mungspaces (objnam.c) normalises it before it is stored. */
import { getlin } from './wizcmds.js';
import { mungspaces } from './mklev.js';
import { optfn_fruit_set, optfn_statushilites_set, count_status_hilites, handler_autopickup_exception, compound_option_value, optfn_boulder_set } from './options.js';
import { reset_needed_visuals } from './options_runtime.js';
import { vision_recalc } from './vision.js';
import { optfn_suppress_alert_set } from './feature_alert.js';
import { number_pad_value } from './cmd_config.js';
import { reset_commands, update_rest_on_space, cmdbind_get, bind_key } from './cmd_binds.js';
import { EXTCMDLIST } from './cmd_extcmd_data.js';
import { pgetchar, key2txt } from './cmd.js';
import { display_text_window } from './com_pager.js';
import { TtyMenu, PICK_ANY, PICK_ONE, ATR_NONE } from './tty_menu.js';
import { menutype } from './menustyle.js';
import { choose_disco_sort } from './o_init.js';
/* C ref: wintty.c process_menu_window's overlay composition — the shared
 * map-under-window renderer every other overlay in this port uses. */
import { build_window_screen, menu_search_case } from './com_pager.js';
import { DOSET_BOOLS, DOSET_COMPOUNDS, DOSET_OTHERS, LONGEST_OPTION_NAME,
         term_for_boolean } from './doset_data.js';
/* C ref: options.c:8060 oc_to_str — see js/drawing.js for why it lives there. */
import { oc_to_str } from './drawing.js';

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
        { name: 'menu colors', kind: 'othr', value: () => '(0 currently set)' },
        { name: 'showexp', kind: 'bool', flag: 'showexp' },
        { name: 'status condition fields', kind: 'othr', value: () => '(16 currently set)' },
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
    const body = ' \x1b[7m' + visible;
    return ['', padTo(body, prefixVisLen, HEADER_COL, '\x1b[0m')];
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
        { line: ' \x1b[7mOptions\x1b[0m' }, { line: '' },
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
        lines.push(' \x1b[7mOptions\x1b[0m');
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
    const widest = body.reduce((m, t) => (t && t.length > m ? t.length : m), 0);
    const col = Math.max(0, SCREEN_COLS - widest - 2);
    const pre = `\x1b[${col}C`;
    const lines = body.map((t, i) => (t === null ? ''
        : i === 0 ? `${pre}\x1b[7m${t}\x1b[0m` : `${pre}${t}`));
    if (!bgRows) {
        const winLines = body.map((t, i) => (t === null ? ''
            : i === 0 ? `\x1b[7m${t}\x1b[0m` : t));
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
        '\x1b[7mSelect number_pad mode:\x1b[0m', '',
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
    // C options.c:3358 adds venom to the inventory classes only in wizard mode.
    const classes = PICKUP_CLASSES.filter(c => c.sym !== '.' || g.flags?.debug);
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
    while (true) {
        // renderPage sets game._screen_output to the menu frame; the nhgetch
        // NOT flush_screen here — flush_screen's _buildScreenOutput would rebuild
        // _screen_output from the map and clobber the menu (the dohelp /
        // dodiscovered full-screen-menu pattern: set _screen_output, then nhgetch).
        renderPage(pageIdx, titleErased);
        const key = await nhgetch();
        const ch = String.fromCharCode(key);
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

/* C options.c:6123 handler_runmode. */
const runmodes = ['teleport', 'run', 'walk', 'crawl'];
export async function handler_runmode(preserveStatus = false) {
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    runmodes.forEach((n, i) => m.add_menu(i + 1, n[0], ATR_NONE, n, false, false));
    m.end_menu('Select run/travel display mode:');
    const { count, picks } = await m.select_menu(PICK_ONE);
    if (count > 0) game.flags.runmode = picks[0] - 1;
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
        cur.name = sl[0];
        cur.handling = sl[1];
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
        await flush_screen(1);
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
                    /* C: display_file(OPTMENUHELP) — the help text file is not
                     * in the port's dat/ yet, so nothing is drawn; the pick is
                     * still counted so the rerun below behaves as C's does. */
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
                    await pline(`'${ent.row.name}' option toggled ${!negated ? 'on' : 'off'}.`);
                    await flush_screen(1);
                    statusRefreshed = true;
                } else if (ent.row.name === 'pickup_types') {
                    /* C: has_handler -> optfn_pickup_types(do_handler) ->
                     * handler_pickup_types -> the object-class picker. */
                    await drainTopline();
                    await pickupTypesSubmenu(undefined, statusRefreshed);
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
                } else if (ent.row.name === 'bind keys') {
                    await drainTopline();
                    await handler_rebind_keys();
                    statusRefreshed = true;
                } else if (ent.row.name === 'runmode') {
                    await drainTopline();
                    await handler_runmode(statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'sortdiscoveries') {
                    await drainTopline();
                    await choose_disco_sort(0, statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'sortloot') {
                    await drainTopline();
                    await handler_sortloot(statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'menustyle') {
                    await drainTopline();
                    await handler_menustyle(statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'symset' || ent.row.name === 'roguesymset') {
                    /* C options.c:6325 handler_symset(), 8939 do_handler. */
                    await drainTopline();
                    await handler_symset(statusRefreshed, ent.row.name === 'roguesymset');
                    g.go.opt_need_redraw = true;
                    needVisuals = true;
                    statusRefreshed = false;
                } else if (ent.row.hasHandler === false) {
                    /* C ref: options.c:8944-8953 — no handler, so getlin. */
                    await drainTopline();
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
                    } else if (abuf !== '\x1b' && ent.row.name === 'statushilites') {
                        optfn_statushilites_set(g.iflags, mungspaces(abuf));
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
    /* C: this handler returns ECMD_OK on every path; rhack() maps it. */
    return ECMD_OK;
}
