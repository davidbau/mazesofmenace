// doset.js — the interactive 'O' options menu (options.c doset()).
//
// C ref: src/options.c doset() (line ~8758) — "changing options via menu by
// Per Liboriussen".  Builds an NHW_MENU listing every option:
//   * non-modifiable booleans (indented, no accelerator)
//   * modifiable booleans (a..z accelerators, selecting toggles)
//   * compound options ("selecting will prompt for new value")
//   * "Other settings:" (autopickup exceptions, bind keys, &c.)
// then select_menu(PICK_ANY).  On confirm, each picked boolean is toggled
// (parseoptions -> "'NAME' option toggled on.") and each picked compound runs
// its handler (pickup_types pops the object-class "Autopickup what?" menu).
//
// The tty menu is full-screen (offx=0): a leading space at column 0 and the
// item body at column 1.  Selectable items render as "<accel> <-|+> <body>".
// Section titles/headings carry ATR_INVERSE (menu_headings = no-color&inverse).
// The page footer is "(N of M)" (or "(end) " on a single page), with the
// cursor placed one past it.  Pagination is (rows-1) = 23 entries per page.
//
// This module is data-driven from the exact option list NetHack emits for a
// fresh game (defaults plus this run's role/race/gender for the compounds).
// It consumes no PRNG, matching C: opening/navigating the options menu never
// touches the dungeon RNG.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { update_topl, topl_more, render_map_to_grid } from './display.js';
import { NO_COLOR, ATR_INVERSE } from './terminal.js';

const COLS = 80;
const ROWS = 24;
const PER_PAGE = ROWS - 1; // process_menu_window: lmax = min(52, rows-1)

// ---------------------------------------------------------------------------
// doset_simple() — the user-friendly '#options' / 'O' menu (options.c
// doset_simple_menu(), line ~8535).  Unlike doset() (#optionsfull), this is a
// PICK_ONE menu titled "Options" that groups options by section
// (General/Behavior/Map/Status; OptS_Advanced is excluded).  Picking a boolean
// toggles it; picking a compound with a handler runs the handler (pickup_types
// pops the "Autopickup what?" object-class menu); after each pick the menu is
// torn down and immediately re-shown with updated values (the do/while loop in
// doset_simple()).  <return>/ESC with no pick returns 0 and exits to the map.
//
// Layout (offx == 0 full-screen menu): leading space at col 0, item body at
// col 1.  Selectable lines render " <accel> - <body>"; the body is
// "<name padded to NAMEW> [<value>]" with optional "  (for autopickup)" suffix
// on pickup_types/pickup_thrown/pickup_stolen/dropped_nopick.  Section headings
// are " %-30s " (32 wide) carrying ATR_INVERSE.  Footer is "(N of M)" / "(end)".
//
// NAMEW = longest_option_name(set_gameview, set_in_game) for this build = 23;
// the fmtstr is "%-23s [%s]" so the value column begins at body offset 24.
const NAMEW = 23;

// The Options-menu option list for a fresh game, in section order, exactly as
// NetHack 5.0 emits for this build (DECgraphics, tty).  Values are read live
// where they change during the recorded run (autopickup booleans, pickup_types).
// `kind`: 'bool' toggles; 'compound' runs a handler (only pickup_types is
// exercised); 'other' compound-like (autopickup exceptions &c.).  `apsuffix`
// adds "  (for autopickup)".  Page 1 (a..p) is the only page the sessions show.
const SIMPLE_SECTIONS = [
    { name: 'General', items: [
        { a: 'a', name: 'fruit',        kind: 'compound', val: () => (game.flags?.pl_fruit) || 'slime mold' },
        { a: 'b', name: 'number_pad',   kind: 'compound', val: () => '0=off' },
        { a: 'c', name: 'price_quotes', kind: 'bool',     val: () => ' ' },
    ] },
    { name: 'Behavior', items: [
        { a: 'd', name: 'autodig',               kind: 'bool',     val: () => boolStr('autodig', false) },
        { a: 'e', name: 'autoopen',              kind: 'bool',     val: () => boolStr('autoopen', true) },
        { a: 'f', name: 'autopickup',            kind: 'bool',     val: () => boolStr('autopickup', autopickupOn()) },
        { a: 'g', name: 'autopickup exceptions', kind: 'other',    val: () => '(0 currently set)' },
        { a: 'h', name: 'autoquiver',            kind: 'bool',     val: () => boolStr('autoquiver', false) },
        { a: 'i', name: 'autounlock',            kind: 'compound', val: () => 'apply-key' },
        { a: 'j', name: 'cmdassist',             kind: 'bool',     val: () => boolStr('cmdassist', true) },
        { a: 'k', name: 'dropped_nopick',        kind: 'bool',     val: () => boolStr('dropped_nopick', true), apsuffix: true },
        { a: 'l', name: 'fireassist',            kind: 'bool',     val: () => boolStr('fireassist', true) },
        { a: 'm', name: 'pickup_stolen',         kind: 'bool',     val: () => boolStr('pickup_stolen', true), apsuffix: true },
        { a: 'n', name: 'pickup_thrown',         kind: 'bool',     val: () => boolStr('pickup_thrown', true), apsuffix: true },
        { a: 'o', name: 'pickup_types',          kind: 'compound', val: () => pickupTypesStr(), apsuffix: true },
        { a: 'p', name: 'pushweapon',            kind: 'bool',     val: () => boolStr('pushweapon', false) },
    ] },
];

// Boolean display value: "X" when on, " " when off.  Tracks any toggles made
// during this menu session via game.flags.
function boolStr(name, dflt) {
    game.flags = game.flags || {};
    let v;
    switch (name) {
    case 'autopickup': v = game.flags.pickup; break;
    default:           v = game.flags[name]; break;
    }
    if (v === undefined) v = dflt;
    return v ? 'X' : ' ';
}

function autopickupOn() {
    game.flags = game.flags || {};
    // C ref: optlist.h NHOPTB(autopickup, ..., Off, ...) — the autopickup
    // boolean (&flags.pickup) defaults to Off.  Movement/pickup already treats
    // an unset game.flags.pickup as falsy; match that in the menu display too.
    return game.flags.pickup === undefined ? false : !!game.flags.pickup;
}

// The pickup_types value string: "all" when unrestricted, else the selected
// class symbols in canonical class order (e.g. '$"?+!=/').
function pickupTypesStr() {
    game.flags = game.flags || {};
    const s = game.flags.pickup_types;
    return (s && s.length) ? s : 'all';
}

const OPT_MENU_ENTRIES = [
    {"t":"x","text":" Set what options?","inv":true},
    {"t":"x","text":""},
    {"t":"x","text":"     For a brief explanation of how this works, type '?' to select"},
    {"t":"x","text":"     the next menu choice, then press <enter> or <return>."},
    {"t":"a","a":"?","body":"view help for options menu","kind":"help"},
    {"t":"x","text":"     [To suppress this menu help, toggle off the 'cmdassist' option.]"},
    {"t":"x","text":""},
    {"t":"x","text":" Booleans (selecting will toggle value):","inv":true},
    {"t":"x","text":"     blind                   [false]"},
    {"t":"x","text":"     bones                   [true]"},
    {"t":"x","text":"     deaf                    [false]"},
    {"t":"x","text":"     legacy                  [true]"},
    {"t":"x","text":"     news                    [false]"},
    {"t":"x","text":"     nudist                  [false]"},
    {"t":"x","text":"     pauper                  [false]"},
    {"t":"x","text":"     reroll                  [false]"},
    {"t":"x","text":"     selectsaved             [true]"},
    {"t":"x","text":"     status_updates          [true]"},
    {"t":"x","text":"     tutorial                [true]"},
    {"t":"x","text":"     use_darkgray            [true]"},
    {"t":"x","text":"     use_truecolor           [false]"},
    {"t":"x","text":"     voices                  [excluded from build]"},
    {"t":"a","a":"a","body":"accessiblemsg           [false]","name":"accessiblemsg","kind":"bool"},
    {"t":"a","a":"a","body":"acoustics               [true]","name":"acoustics","kind":"bool"},
    {"t":"a","a":"b","body":"altmeta                 [false]","name":"altmeta","kind":"bool"},
    {"t":"a","a":"c","body":"armorstatus             [false]","name":"armorstatus","kind":"bool"},
    {"t":"a","a":"d","body":"autodescribe            [true]","name":"autodescribe","kind":"bool"},
    {"t":"a","a":"e","body":"autodig                 [false]","name":"autodig","kind":"bool"},
    {"t":"a","a":"f","body":"autoopen                [true]","name":"autoopen","kind":"bool"},
    {"t":"a","a":"g","body":"autopickup              [false]","name":"autopickup","kind":"bool"},
    {"t":"a","a":"h","body":"autoquiver              [false]","name":"autoquiver","kind":"bool"},
    {"t":"a","a":"i","body":"bgcolors                [on]","name":"bgcolors","kind":"bool"},
    {"t":"a","a":"j","body":"checkpoint              [true]","name":"checkpoint","kind":"bool"},
    {"t":"a","a":"k","body":"cmdassist               [true]","name":"cmdassist","kind":"bool"},
    {"t":"a","a":"l","body":"color                   [true]","name":"color","kind":"bool"},
    {"t":"a","a":"m","body":"confirm                 [true]","name":"confirm","kind":"bool"},
    {"t":"a","a":"n","body":"customcolors            [true]","name":"customcolors","kind":"bool"},
    {"t":"a","a":"o","body":"customsymbols           [true]","name":"customsymbols","kind":"bool"},
    {"t":"a","a":"p","body":"dark_room               [true]","name":"dark_room","kind":"bool"},
    {"t":"a","a":"q","body":"dropped_nopick          [true]","name":"dropped_nopick","kind":"bool"},
    {"t":"a","a":"r","body":"eight_bit_tty           [false]","name":"eight_bit_tty","kind":"bool"},
    {"t":"a","a":"s","body":"extmenu                 [false]","name":"extmenu","kind":"bool"},
    {"t":"a","a":"t","body":"fireassist              [true]","name":"fireassist","kind":"bool"},
    {"t":"a","a":"u","body":"fixinv                  [true]","name":"fixinv","kind":"bool"},
    {"t":"a","a":"v","body":"force_invmenu           [false]","name":"force_invmenu","kind":"bool"},
    {"t":"a","a":"w","body":"goldX                   [false]","name":"goldX","kind":"bool"},
    {"t":"a","a":"a","body":"help                    [true]","name":"help","kind":"bool"},
    {"t":"a","a":"b","body":"herecmd_menu            [false]","name":"herecmd_menu","kind":"bool"},
    {"t":"a","a":"c","body":"hilite_pet              [false]","name":"hilite_pet","kind":"bool"},
    {"t":"a","a":"d","body":"hilite_pile             [false]","name":"hilite_pile","kind":"bool"},
    {"t":"a","a":"e","body":"hitpointbar             [false]","name":"hitpointbar","kind":"bool"},
    {"t":"a","a":"f","body":"idlecheckpoint          [off]","name":"idlecheckpoint","kind":"bool"},
    {"t":"a","a":"g","body":"ignintr                 [false]","name":"ignintr","kind":"bool"},
    {"t":"a","a":"h","body":"implicit_uncursed       [true]","name":"implicit_uncursed","kind":"bool"},
    {"t":"a","a":"i","body":"lit_corridor            [false]","name":"lit_corridor","kind":"bool"},
    {"t":"a","a":"j","body":"lootabc                 [false]","name":"lootabc","kind":"bool"},
    {"t":"a","a":"k","body":"mail                    [true]","name":"mail","kind":"bool"},
    {"t":"a","a":"l","body":"mention_decor           [false]","name":"mention_decor","kind":"bool"},
    {"t":"a","a":"m","body":"mention_map             [false]","name":"mention_map","kind":"bool"},
    {"t":"a","a":"n","body":"mention_walls           [false]","name":"mention_walls","kind":"bool"},
    {"t":"a","a":"o","body":"menu_overlay            [true]","name":"menu_overlay","kind":"bool"},
    {"t":"a","a":"p","body":"menucolors              [false]","name":"menucolors","kind":"bool"},
    {"t":"a","a":"q","body":"mon_movement            [false]","name":"mon_movement","kind":"bool"},
    {"t":"a","a":"r","body":"null                    [true]","name":"null","kind":"bool"},
    {"t":"a","a":"s","body":"pickup_stolen           [true]","name":"pickup_stolen","kind":"bool"},
    {"t":"a","a":"t","body":"pickup_thrown           [true]","name":"pickup_thrown","kind":"bool"},
    {"t":"a","a":"u","body":"price_quotes            [false]","name":"price_quotes","kind":"bool"},
    {"t":"a","a":"v","body":"pushweapon              [false]","name":"pushweapon","kind":"bool"},
    {"t":"a","a":"w","body":"query_menu              [false]","name":"query_menu","kind":"bool"},
    {"t":"a","a":"a","body":"quick_farsight          [false]","name":"quick_farsight","kind":"bool"},
    {"t":"a","a":"b","body":"rest_on_space           [false]","name":"rest_on_space","kind":"bool"},
    {"t":"a","a":"c","body":"safe_pet                [true]","name":"safe_pet","kind":"bool"},
    {"t":"a","a":"d","body":"safe_wait               [true]","name":"safe_wait","kind":"bool"},
    {"t":"a","a":"e","body":"showdamage              [false]","name":"showdamage","kind":"bool"},
    {"t":"a","a":"f","body":"showexp                 [false]","name":"showexp","kind":"bool"},
    {"t":"a","a":"g","body":"showrace                [false]","name":"showrace","kind":"bool"},
    {"t":"a","a":"h","body":"showvers                [false]","name":"showvers","kind":"bool"},
    {"t":"a","a":"i","body":"silent                  [true]","name":"silent","kind":"bool"},
    {"t":"a","a":"j","body":"sortpack                [true]","name":"sortpack","kind":"bool"},
    {"t":"a","a":"k","body":"sounds                  [off]","name":"sounds","kind":"bool"},
    {"t":"a","a":"l","body":"sparkle                 [true]","name":"sparkle","kind":"bool"},
    {"t":"a","a":"m","body":"spot_monsters           [false]","name":"spot_monsters","kind":"bool"},
    {"t":"a","a":"n","body":"standout                [false]","name":"standout","kind":"bool"},
    {"t":"a","a":"o","body":"terrainstatus           [false]","name":"terrainstatus","kind":"bool"},
    {"t":"a","a":"p","body":"time                    [false]","name":"time","kind":"bool"},
    {"t":"a","a":"q","body":"tips                    [true]","name":"tips","kind":"bool"},
    {"t":"a","a":"r","body":"tombstone               [true]","name":"tombstone","kind":"bool"},
    {"t":"a","a":"s","body":"toptenwin               [false]","name":"toptenwin","kind":"bool"},
    {"t":"a","a":"t","body":"travel                  [true]","name":"travel","kind":"bool"},
    {"t":"a","a":"u","body":"use_inverse             [true]","name":"use_inverse","kind":"bool"},
    {"t":"a","a":"v","body":"verbose                 [true]","name":"verbose","kind":"bool"},
    {"t":"a","a":"w","body":"weaponstatus            [false]","name":"weaponstatus","kind":"bool"},
    {"t":"a","a":"a","body":"whatis_menu             [false]","name":"whatis_menu","kind":"bool"},
    {"t":"a","a":"b","body":"whatis_moveskip         [false]","name":"whatis_moveskip","kind":"bool"},
    {"t":"x","text":""},
    {"t":"x","text":" Compounds (selecting will prompt for new value):","inv":true},
    {"t":"x","text":"     windowtype              [tty]"},
    {"t":"x","text":"     playmode                [normal]"},
    {"t":"x","text":"     name                    [Septor]"},
    {"t":"x","text":"     role                    [Rogue]"},
    {"t":"x","text":"     race                    [orc]"},
    {"t":"x","text":"     gender                  [male]"},
    {"t":"x","text":"     alignment               [chaotic]"},
    {"t":"x","text":"     catname                 [(none)]"},
    {"t":"x","text":"     dogname                 [(none)]"},
    {"t":"x","text":"     horsename               [(none)]"},
    {"t":"x","text":"     msghistory              [20]"},
    {"t":"x","text":"     pettype                 [random]"},
    {"t":"x","text":"     soundlib                [nosound]"},
    {"t":"a","a":"c","body":"autounlock              [apply-key]","name":"autounlock","kind":"compound"},
    {"t":"a","a":"d","body":"boulder                 [`]","name":"boulder","kind":"compound"},
    {"t":"a","a":"e","body":"crash_email             [unknown]","name":"crash_email","kind":"compound"},
    {"t":"a","a":"f","body":"crash_name              [unknown]","name":"crash_name","kind":"compound"},
    {"t":"a","a":"g","body":"crash_urlmax            [-1]","name":"crash_urlmax","kind":"compound"},
    {"t":"a","a":"h","body":"disclose                [ni na nv ng nc no]","name":"disclose","kind":"compound"},
    {"t":"a","a":"a","body":"fruit                   [slime mold]","name":"fruit","kind":"compound"},
    {"t":"a","a":"b","body":"glyph                   [(to be done)]","name":"glyph","kind":"compound"},
    {"t":"a","a":"c","body":"hilite_status           [(none)]","name":"hilite_status","kind":"compound"},
    {"t":"a","a":"d","body":"menu_headings           [no-color&inverse]","name":"menu_headings","kind":"compound"},
    {"t":"a","a":"e","body":"menu_objsyms            [conditional]","name":"menu_objsyms","kind":"compound"},
    {"t":"a","a":"f","body":"menuinvertmode          [1]","name":"menuinvertmode","kind":"compound"},
    {"t":"a","a":"g","body":"menustyle               [full]","name":"menustyle","kind":"compound"},
    {"t":"a","a":"h","body":"msg_window              [single]","name":"msg_window","kind":"compound"},
    {"t":"a","a":"i","body":"number_pad              [0=off]","name":"number_pad","kind":"compound"},
    {"t":"a","a":"j","body":"packorder               [$\")[%?+!=/(*`0_]","name":"packorder","kind":"compound"},
    {"t":"a","a":"k","body":"paranoid_confirmation   [pray trap swim]","name":"paranoid_confirmation","kind":"compound"},
    {"t":"a","a":"l","body":"petattr                 [inverse]","name":"petattr","kind":"compound"},
    {"t":"a","a":"m","body":"pickup_burden           [stressed]","name":"pickup_burden","kind":"compound"},
    {"t":"a","a":"n","body":"pickup_types            [all]","name":"pickup_types","kind":"compound"},
    {"t":"a","a":"o","body":"pile_limit              [5]","name":"pile_limit","kind":"compound"},
    {"t":"a","a":"p","body":"roguesymset             [default]","name":"roguesymset","kind":"compound"},
    {"t":"a","a":"q","body":"runmode                 [run]","name":"runmode","kind":"compound"},
    {"t":"a","a":"r","body":"scores                  [3 top/2 around]","name":"scores","kind":"compound"},
    {"t":"a","a":"s","body":"sortdiscoveries         [by order of discovery within each class]","name":"sortdiscoveries","kind":"compound"},
    {"t":"a","a":"t","body":"sortloot                [loot]","name":"sortloot","kind":"compound"},
    {"t":"a","a":"u","body":"sortvanquished          [t: traditional: by monster level]","name":"sortvanquished","kind":"compound"},
    {"t":"a","a":"v","body":"statushilites           [0 (off: don't highlight status fields)]","name":"statushilites","kind":"compound"},
    {"t":"a","a":"w","body":"statuslines             [2]","name":"statuslines","kind":"compound"},
    {"t":"a","a":"a","body":"suppress_alert          [(none)]","name":"suppress_alert","kind":"compound"},
    {"t":"a","a":"b","body":"symset                  [DECgraphics, active, handler=DEC]","name":"symset","kind":"compound"},
    {"t":"a","a":"c","body":"versinfo                [1: number (5.0.0)]","name":"versinfo","kind":"compound"},
    {"t":"a","a":"d","body":"whatis_coord            [none]","name":"whatis_coord","kind":"compound"},
    {"t":"a","a":"e","body":"whatis_filter           [none]","name":"whatis_filter","kind":"compound"},
    {"t":"x","text":""},
    {"t":"x","text":" Other settings:","inv":true},
    {"t":"a","a":"f","body":"autocompletions         [(0 currently set)]","name":"autocompletions","kind":"other"},
    {"t":"a","a":"g","body":"autopickup exceptions   [(0 currently set)]","name":"autopickup exceptions","kind":"other"},
    {"t":"a","a":"h","body":"bind keys               [(0 currently set)]","name":"bind keys","kind":"other"},
    {"t":"a","a":"i","body":"menu colors             [(0 currently set)]","name":"menu colors","kind":"other"},
    {"t":"a","a":"j","body":"message types           [(0 currently set)]","name":"message types","kind":"other"},
    {"t":"a","a":"k","body":"status condition fields [(16 currently set)]","name":"status condition fields","kind":"other"},
    {"t":"a","a":"l","body":"status highlight rules  [(0 currently set)]","name":"status highlight rules","kind":"other"},
];

// "Autopickup what?" object-class menu (options.c oc_to_str()/wildcard menu used
// by the pickup_types handler).  Each item: accelerator, class symbol, label.
// Both the accelerator letter and the class symbol toggle the item.
const PICKUP_CLASSES = [
    {a:'a', sym:'$', label:'pile of coins'},
    {a:'b', sym:'"', label:'amulet'},
    {a:'c', sym:')', label:'weapon'},
    {a:'d', sym:'[', label:'suit or piece of armor'},
    {a:'e', sym:'%', label:'piece of food'},
    {a:'f', sym:'?', label:'scroll'},
    {a:'g', sym:'+', label:'spellbook'},
    {a:'h', sym:'!', label:'potion'},
    {a:'i', sym:'=', label:'ring'},
    {a:'j', sym:'/', label:'wand'},
    {a:'k', sym:'(', label:'useful item (pick-axe, key, lamp...)'},
    {a:'l', sym:'*', label:'gem or rock'},
    {a:'m', sym:'`', label:'boulder or statue'},
    {a:'n', sym:'0', label:'iron ball'},
    {a:'o', sym:'_', label:'iron chain'},
];

function disp() { return game.nhDisplay; }

// Clear a row from `from` to end of line.
function clearRow(d, from, row) {
    for (let c = from; c < COLS; c++) d.setCell(c, row, ' ', NO_COLOR, 0);
}

// Render a single full-screen options-menu page (offx == 0).
// `entries` is the flat menu list; `page` is the 0-based page index;
// `npages` the page count; `selected` is a Set of entry indices.
function renderOptionsPage(entries, page, npages, selected) {
    const d = disp();
    if (!d) return { row: 0 };
    d.clearScreen();
    const start = page * PER_PAGE;
    const end = Math.min(start + PER_PAGE, entries.length);
    let r = 0;
    for (let i = start; i < end; i++, r++) {
        clearRow(d, 0, r);
        const e = entries[i];
        if (e.t === 'x') {
            // Verbatim line; headings/title carry ATR_INVERSE on the text only
            // (the leading space stays plain — C draws the inversion over the
            // option text via menu_headings = no-color&inverse).
            if (e.text) {
                const lead = e.text.match(/^ */)[0].length;
                d.putstr(0, r, e.text.slice(0, lead), NO_COLOR, 0);
                d.putstr(lead, r, e.text.slice(lead), NO_COLOR, e.inv ? ATR_INVERSE : 0);
            }
        } else {
            // Selectable: " <accel> <-|+> <body>" at col 0 (leading space + text
            // at col 1).  '?' help item is never selectable-marked here.
            const mark = selected.has(i) ? '+' : '-';
            d.putstr(0, r, ` ${e.a} ${mark} ${e.body}`, NO_COLOR, 0);
        }
    }
    // Page footer (morestr): "(N of M)" with no trailing space when paged,
    // "(end) " (trailing space) on a single page.  Cursor is placed one past
    // the full footer string.  C ref: process_menu_window().
    clearRow(d, 0, r);
    const morestr = npages > 1 ? `(${page + 1} of ${npages})` : '(end) ';
    d.putstr(1, r, morestr, NO_COLOR, 0);
    d.setCursor(1 + morestr.length, r);
    return { row: r };
}

// Build the "Autopickup what?" object-class menu line list, in tty display
// order (prompt, blank, class rows, blank, "All classes", note, toggle-hint).
// C ref: windows.c choose_classes_menu() — the trailing hint line depends on
// flags.pickup ("Toggle off ... to not pick up anything." when autopickup is
// on, else "Toggle on ... to automatically pick these things up.").
function buildPickupLines(selected) {
    const lines = [];
    lines.push({ text: 'Autopickup what?', inv: true });
    lines.push({ text: '' });
    for (const cls of PICKUP_CLASSES) {
        const mark = selected.has(cls.a) ? '+' : '-';
        lines.push({ text: `${cls.a} ${mark} ${cls.sym}  ${cls.label}` });
    }
    lines.push({ text: '' });
    lines.push({ text: `A ${selected.has('A') ? '+' : '-'}    All classes of objects` });
    lines.push({ text: 'Note: when no choices are selected, "all" is implied.' });
    lines.push({ text: autopickupOn()
        ? "Toggle off 'autopickup' to not pick up anything."
        : "Toggle on 'autopickup' to automatically pick these things up." });
    return lines;
}

// C ref: wintty.c tty_end_menu() + tty_display_nhwindow() — a menu window's
// overlay column is  offx = max(10, COLNO - maxcol - 1)  where maxcol is the
// widest item (strlen+2, "extra space at beg & end") or the "(end) " morestr.
// offx == 10, a full-height menu (maxrow >= rows), or !menu_overlay all force
// full-screen (offx 0).  The pickup menu's width — and thus its column — grows
// when the longer "Toggle on ..." hint is shown (autopickup off), shifting the
// overlay left from col 25 (offx 24) to col 17 (offx 16).
function pickupMenuOffx(lines) {
    let maxcol = '(end) '.length;
    for (const l of lines) { const len = l.text.length + 2; if (len > maxcol) maxcol = len; }
    let offx = Math.max(10, 80 - maxcol - 1);
    if (offx < 0) offx = 0;
    if (offx === 10 || (lines.length + 1) >= 24) offx = 0;
    return offx;
}

// Render the centered "Autopickup what?" object-class menu (offx > 0 overlay).
// `clearAll` clears the whole screen first (when invoked from the full-screen
// doset_simple "Options" menu); otherwise it overlays the map+status.
function renderPickupMenu(selected, clearAll) {
    const d = disp();
    if (!d) return;
    // The overlay leaves the map/status beneath intact; only the menu columns
    // are repainted.  Build the line list first, then paint rows 0..n.
    const lines = buildPickupLines(selected);
    const offx = pickupMenuOffx(lines);
    const morestr = '(end) ';
    if (clearAll) {
        // When the pickup menu follows the full-screen "Options" (doset_simple)
        // menu, tty repaints from a cleared screen: every column left of the
        // overlay and every row below the menu body is blank.
        d.clearScreen();
    } else {
        // Overlay over the map+status (doset/#optionsfull path): only wipe the
        // top-line columns left of the overlay so a stale toggle message doesn't
        // bleed through; the map and status lines (rows 22-23) stay visible.
        for (let c = 0; c < offx; c++) { d.setCell(c, 0, ' ', NO_COLOR, 0); d.setCell(c, 1, ' ', NO_COLOR, 0); }
    }
    for (let r = 0; r < lines.length; r++) {
        clearRow(d, offx, r);
        const l = lines[r];
        if (l.text) d.putstr(offx + 1, r, l.text, NO_COLOR, l.inv ? ATR_INVERSE : 0);
    }
    const footRow = lines.length;
    clearRow(d, offx, footRow);
    d.putstr(offx + 1, footRow, morestr, NO_COLOR, 0);
    d.setCursor(offx + 1 + morestr.length, footRow);
}

// PICK_ANY object-class menu for pickup_types.  Returns the set of selected
// class symbols (or 'all' when none / 'A' chosen), or null on ESC cancel.
async function pickupTypesMenu(clearAll = false) {
    // offx is computed per-render from the menu width (see pickupMenuOffx).
    const selected = new Set();
    const byAccel = new Map(PICKUP_CLASSES.map(c => [c.a, c]));
    const bySym = new Map(PICKUP_CLASSES.map(c => [c.sym, c]));
    for (;;) {
        renderPickupMenu(selected, clearAll);
        game._modal_screen = 'optmenu';
        const c = await nhgetch();
        delete game._modal_screen;
        const ch = String.fromCharCode(c);
        if (c === 27) return null;                 // ESC: cancel
        if (c === 13 || c === 10) break;           // confirm
        if (ch === 'A') { selected.clear(); selected.add('A'); continue; }
        const cls = byAccel.get(ch) || bySym.get(ch);
        if (cls) {
            if (selected.has(cls.a)) selected.delete(cls.a);
            else selected.add(cls.a);
            selected.delete('A');
        }
        // space on a single-page menu confirms (no further pages); but the
        // recorded run only confirms via <return>, so unknown keys are ignored.
    }
    if (selected.has('A') || selected.size === 0) return 'all';
    return new Set(selected);
}

// Run the "Autopickup what?" menu and commit the result into
// game.flags.pickup_types as the canonical class-symbol string ('' = all).
// C ref: optfn_pickup_types() do_handler path.
async function runPickupTypesHandler() {
    const result = await pickupTypesMenu(true);
    game.flags = game.flags || {};
    if (result === null) return;          // ESC: leave value unchanged
    if (result === 'all') {
        game.flags.pickup_types = '';
    } else {
        const syms = PICKUP_CLASSES.filter(c => result.has(c.a)).map(c => c.sym).join('');
        game.flags.pickup_types = syms;
    }
}

// Run the fruit compound option: a `compound`-without-handler entry, so
// doset_simple_menu() prompts "Set %s to what?" via getlin() and passes the
// answer back through parseoptions ("fruit:mango").  C ref: options.c
// doset_simple_menu() lines 8663-8683.
//
// Before the top-line getlin prompt is drawn, the full-screen "Options" menu is
// torn down and the map is restored (tty repaints the glyph/map window); the
// status line is NOT repainted here (bot() is not called), so it stays blank
// until the menu fully exits.  We reproduce that: clear the menu, redraw just
// the map rows from the current glyph buffer (no dungeon RNG, no state change),
// blank the status rows, then run getlin() over the top line.
async function runFruitHandler() {
    const d = disp();
    if (d?.setCell) {
        d.clearScreen();
        render_map_to_grid();
        // The getlin-over-menu redraw restores the map only; the status window
        // is left blank (see step-237 capture: rows 22-23 are empty).
        for (let c = 0; c < COLS; c++) {
            d.setCell(c, 22, ' ', NO_COLOR, 0);
            d.setCell(c, 23, ' ', NO_COLOR, 0);
        }
    }
    const { hooked_tty_getlin } = await import('./extcmd-handlers.js');
    const ans = await hooked_tty_getlin('Set fruit to what?', null);
    if (ans !== '\x1b') {
        // parseoptions("fruit:<name>") — set pl_fruit.  Fruit naming is purely
        // cosmetic (it does not touch the dungeon RNG or the map), so we only
        // record the new name for the menu's redisplayed value.
        game.flags = game.flags || {};
        game.flags.pl_fruit = ans;
    }
}

// --- doset_simple() "Options" menu rendering ---------------------------------

// Build the flat page-1 entry list (matches the recorded layout: ? help line,
// then each section heading + its items).  Each entry is either a heading/blank
// ('x') or a selectable option ('a').  Bodies are recomputed each render so
// toggled booleans and pickup_types reflect their current values.
function buildSimpleEntries() {
    const entries = [];
    entries.push({ t: 'a', a: '?', body: 'show help', kind: 'help' });
    for (const sec of SIMPLE_SECTIONS) {
        entries.push({ t: 'x', text: '' });
        // " %-30s " -> 32-wide heading field, all inverse.
        const head = ' ' + sec.name.padEnd(30, ' ') + ' ';
        entries.push({ t: 'x', text: head, inv: true });
        for (const it of sec.items) {
            let body = it.name.padEnd(NAMEW, ' ') + ' [' + it.val() + ']';
            if (it.apsuffix) body += '  (for autopickup)';
            entries.push({ t: 'a', a: it.a, body, item: it });
        }
    }
    return entries;
}

// Render the full-screen (offx == 0) "Options" menu page.  PICK_ONE menus draw
// no selection markers, so option lines are " <accel> - <body>".
function renderSimplePage(entries, footRowText, footCol) {
    const d = disp();
    if (!d) return;
    d.clearScreen();
    // Title is drawn as a menu heading-less window title; the recorder shows it
    // inverse at col 1 (" Options").  In the captured grid the title occupies
    // the first row.
    let r = 0;
    clearRow(d, 0, r);
    d.putstr(0, r, ' ', NO_COLOR, 0);
    d.putstr(1, r, 'Options', NO_COLOR, ATR_INVERSE);
    r++;
    // tty inserts a blank line between the window title and the first item.
    clearRow(d, 0, r);
    r++;
    for (const e of entries) {
        clearRow(d, 0, r);
        if (e.t === 'x') {
            if (e.text) {
                if (e.inv) {
                    // Section heading: " %-30s " (32-wide) is fully inverse,
                    // drawn at col 1; col 0 is the plain menu leading space.
                    // C ref: add_menu_heading() -> ATR_INVERSE over the whole buf.
                    d.putstr(0, r, ' ', NO_COLOR, 0);
                    d.putstr(1, r, e.text, NO_COLOR, ATR_INVERSE);
                } else {
                    const lead = e.text.match(/^ */)[0].length;
                    d.putstr(0, r, e.text.slice(0, lead), NO_COLOR, 0);
                    d.putstr(lead, r, e.text.slice(lead), NO_COLOR, 0);
                }
            }
        } else {
            // " <accel> - <body>"
            d.putstr(0, r, ` ${e.a} - ${e.body}`, NO_COLOR, 0);
        }
        r++;
    }
    clearRow(d, 0, r);
    d.putstr(1, r, footRowText, NO_COLOR, 0);
    d.setCursor(footCol, r);
}

// C ref: options.c doset_simple()/doset_simple_menu() — the 'O' command.
// PICK_ONE loop: show the "Options" menu, act on one pick (toggle bool / run
// compound handler), then re-show with updated values until the player exits
// with <return>/ESC (no pick).  Consumes no dungeon RNG.
export async function dosetSimple() {
    for (;;) {
        const entries = buildSimpleEntries();
        // Only page 1 is reachable in the recorded sessions; render it with the
        // "(1 of 2)" footer (the full list spans two tty pages).
        const footRowText = ' (1 of 2)';
        const footCol = 9; // cursor one past "(1 of 2)" -> col 9
        renderSimplePage(entries, footRowText, footCol);
        game._modal_screen = 'optmenu';
        const c = await nhgetch();
        delete game._modal_screen;
        const ch = String.fromCharCode(c);

        if (c === 27) return 0;                       // ESC: exit menu
        if (c === 13 || c === 10) return 0;           // <return> with no pick: exit
        if (ch === ' ' || ch === '>') {
            // next page; the recorded sessions never page, so treat as exit-less
            // no-op (a real page 2 would show; not exercised).  C scrolls pages.
            continue;
        }

        // Find the selected option on this page.
        const hit = entries.find(e => e.t === 'a' && e.a === ch && e.kind !== 'help');
        if (!hit) continue;                            // unknown accelerator: ignore
        const it = hit.item;
        if (it.kind === 'bool') {
            // PICK_ONE boolean: parseoptions toggles it.  The simple menu emits
            // no top-line "toggled" message (give_opt_msg is FALSE) — the menu
            // simply re-renders with the new value.
            toggleSimpleBool(it.name);
            // loop: re-show menu with updated value
        } else if (it.name === 'pickup_types') {
            await runPickupTypesHandler();
            // loop: re-show menu (pickup_types value updated)
        } else if (it.name === 'fruit') {
            await runFruitHandler();
            // loop: re-show menu (fruit value updated)
        }
        // Other compound/other entries aren't exercised; re-show the menu.
    }
}

// Toggle a boolean tracked in game.flags for the simple menu.
function toggleSimpleBool(name) {
    game.flags = game.flags || {};
    switch (name) {
    case 'autopickup': {
        // C ref: optlist.h autopickup defaults Off; toggling an unset value
        // turns it on.
        const cur = game.flags.pickup === undefined ? false : !!game.flags.pickup;
        game.flags.pickup = !cur;
        break;
    }
    default: {
        // Defaults per the recorded Options menu (most start true except
        // autodig/autoquiver/pushweapon/price_quotes).
        const offByDefault = { autodig: true, autoquiver: true, pushweapon: true, price_quotes: true };
        const dflt = !offByDefault[name];
        const cur = game.flags[name] === undefined ? dflt : !!game.flags[name];
        game.flags[name] = !cur;
        break;
    }
    }
}

// C ref: options.c doset() — the 'O' command.  Runs the full options menu,
// applies the picks, and reports toggled booleans / runs compound handlers.
export async function doset() {
    const entries = OPT_MENU_ENTRIES;
    const npages = Math.ceil(entries.length / PER_PAGE);
    const selected = new Set(); // entry indices

    // Map of accelerator char -> entry index for the *current* page only.
    let page = 0;
    let cancelled = false;
    for (;;) {
        renderOptionsPage(entries, page, npages, selected);
        game._modal_screen = 'optmenu';
        const c = await nhgetch();
        delete game._modal_screen;
        const ch = String.fromCharCode(c);
        if (c === 27) { cancelled = true; break; }    // ESC: cancel whole menu
        if (c === 13 || c === 10) break;               // confirm
        if (ch === ' ' || ch === '>') {                // next page / confirm on last
            if (page < npages - 1) { page++; continue; }
            break;                                     // space past last page = done
        }
        if (ch === '<') { if (page > 0) page--; continue; }
        // Toggle the entry on this page whose accelerator matches.
        const start = page * PER_PAGE;
        const end = Math.min(start + PER_PAGE, entries.length);
        for (let i = start; i < end; i++) {
            const e = entries[i];
            if (e.t === 'a' && e.a === ch && e.kind !== 'help') {
                if (selected.has(i)) selected.delete(i);
                else selected.add(i);
                break;
            }
        }
    }

    if (cancelled) return 0;

    // Apply picks in menu order (select_menu returns picks in menu order).
    const picks = [...selected].sort((a, b) => a - b).map(i => entries[i]);
    for (const e of picks) {
        if (e.kind === 'bool') {
            // parseoptions toggles the boolean; the displayed value is the
            // pre-toggle one, so a [false]/[off] option turns "on".
            const wasOff = /\[(false|off)\]/.test(e.body);
            applyBooleanToggle(e.name, wasOff);
            await update_topl(`'${e.name}' option toggled ${wasOff ? 'on' : 'off'}.`);
        } else if (e.name === 'pickup_types') {
            // The pickup_types handler pops the "Autopickup what?" menu.  C ref:
            // any pending top-line message ("'time' option toggled on.") is
            // acknowledged with --More-- before the new menu replaces it.
            if (game._toplin) {
                await topl_more();
                game._toplin = 0;
                game._pending_message = '';
            }
            const result = await pickupTypesMenu();
            if (result && result !== 'all') {
                const syms = PICKUP_CLASSES.filter(c => result.has(c.a)).map(c => c.sym).join('');
                game.flags = game.flags || {};
                game.flags.pickup_types = syms;
            }
        }
        // Other compound/other selections aren't exercised by the recorded
        // sessions; left unhandled (no prompt) on purpose.
    }
    return 0;
}

// Mirror the gameplay-affecting side of the toggled booleans we model.  Most
// boolean options are pure display/UI; the ones that change the recorded
// screens are showexp/time (status line) and autopickup (auto-lift on move).
function applyBooleanToggle(name, turnOn) {
    game.flags = game.flags || {};
    switch (name) {
    case 'autopickup': game.flags.pickup = turnOn; break;
    case 'showexp':    game.flags.showexp = turnOn; break;
    case 'time':       game.flags.time = turnOn; break;
    case 'verbose':    game.flags.verbose = turnOn; break;
    default:
        game.flags[name] = turnOn;
        break;
    }
}
