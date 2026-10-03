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
import { ECMD_OK } from './const.js';
import { nhgetch } from './input.js';
import { flush_screen, pline, force_more, docrt } from './display.js';
/* C options.c:8944 — the generic compound-option path reads its value with
 * getlin(); mungspaces (objnam.c) normalises it before it is stored. */
import { getlin } from './wizcmds.js';
import { mungspaces } from './mklev.js';
import { optfn_fruit_set } from './options.js';
import { optfn_suppress_alert_set } from './feature_alert.js';
import { number_pad_value } from './cmd_config.js';
import { reset_commands, update_rest_on_space } from './cmd_binds.js';
import { TtyMenu, PICK_ANY, PICK_ONE, ATR_NONE } from './tty_menu.js';
import { menutype } from './menustyle.js';
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
        { name: 'autopickup exceptions', kind: 'othr', value: () => '(0 currently set)' },
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
        { name: 'symset', kind: 'comp', value: () => 'DECgraphics, active, handler=DEC' },
        { section: 'Status' },
        { name: 'hitpointbar', kind: 'bool', flag: 'hitpointbar' },
        { name: 'menu colors', kind: 'othr', value: () => '(0 currently set)' },
        { name: 'showexp', kind: 'bool', flag: 'showexp' },
        { name: 'status condition fields', kind: 'othr', value: () => '(16 currently set)' },
        { name: 'status highlight rules', kind: 'othr', value: () => '(0 currently set)' },
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
function renderPickupSubmenu(marks, bgRows, classes, preserveStatus) {
    const body = [];
    body.push('Autopickup what?');
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
    while (true) {
        // No flush_screen (it would rebuild _screen_output from the map).
        renderPickupSubmenu(marks, bgRows, classes, preserveStatus);
        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        if (key === 27 /* ESC */) {
            return; // cancel: leave flag unchanged
        }
        if (key === 10 || key === 13 || key === 32 /* Enter / space confirm */) {
            break;
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
        if (ch === '>') {
            if (pageIdx + 1 < pageCount()) { pageIdx++; titleErased = false; continue; }
            break;
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
                if (entry.name === 'color')
                    g.iflags.use_color = !!obj[fld];
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
            if (entry.name === 'autounlock') {
                /* C options.c:8930-8953 -> handler_autounlock (has_handler). */
                await handler_autounlock(false);
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

export async function doset() {
    const g = game;
    g.flags = g.flags || {};
    g.iflags = g.iflags || {};
    /* C ref: options.c:8773 — `boolean skiphelp = !iflags.cmdassist`.  The
     * cmdassist row itself is one of the booleans below, so this reads the
     * same storage the menu shows. */
    let skiphelp = !((g.iflags.cmdassist === undefined) ? true : g.iflags.cmdassist);
    let gavehelp = false;

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
            const value = (row.name === 'number_pad' ? number_pad_value() : row.val()) || 'unknown';
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
                    if (ent.row.name === 'rest_on_space') update_rest_on_space();
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
                } else if (ent.row.name === 'runmode') {
                    await drainTopline();
                    await handler_runmode(statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'menustyle') {
                    await drainTopline();
                    await handler_menustyle(statusRefreshed);
                    statusRefreshed = true;
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

    /* C: this handler returns ECMD_OK on every path; rhack() maps it. */
    return ECMD_OK;
}
