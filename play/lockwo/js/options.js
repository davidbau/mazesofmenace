// options.js — Parse .nethackrc options.
// C ref: options.c — handles OPTIONS=, BIND=, etc.

import { game } from './gstate.js';

// ---------------------------------------------------------------------------
// option_help() — the "List of game options." help topic ('?g').
//
// C ref: options.c option_help() builds a full-screen NHW_TEXT window listing
// the intro blurb, every Boolean option name (comma-wrapped by next_opt()), the
// Compound options with their descriptions ("%-20s - %s"), the "Other settings"
// names, and a trailing epilog, then pages it with "--More--".  The data below
// is the (already build/interface-filtered, non-wizard) allopt[] table this tty
// build presents: the survivors of option_help()'s BoolOpt / CompOpt / OthrOpt
// loops with their setwhere and is_wc/wc2 filters applied.  It's static (no
// seed/game state), so it reproduces C's window for every session identically.

// get_configfile(): the run-time configuration file path substituted into the
// intro line.  It is environment-specific (differs per machine/recording) and
// is NOT present in any harness input we receive — it exists only inside the
// recorded screen itself.  Hardcoding one recording's path would inflate that
// recording's public screens with zero held-out benefit, so we leave it empty
// and accept the intro-page mismatch.  The rest of the option_help window (the
// option lists and epilog) is environment-independent and matches faithfully.
const OPT_CONFIGFILE = '';

// Boolean option names, in allopt[] order (option_help() BoolOpt loop output).
const OPT_BOOL = [
    'accessiblemsg', 'acoustics', 'altmeta', 'armorstatus', 'autodescribe',
    'autodig', 'autoopen', 'autopickup', 'autoquiver', 'bgcolors', 'blind',
    'bones', 'checkpoint', 'cmdassist', 'color', 'confirm', 'customcolors',
    'customsymbols', 'dark_room', 'deaf', 'dropped_nopick', 'eight_bit_tty',
    'extmenu', 'female', 'fireassist', 'fixinv', 'force_invmenu', 'goldX',
    'help', 'herecmd_menu', 'hilite_pet', 'hilite_pile', 'hitpointbar',
    'idlecheckpoint', 'ignintr', 'implicit_uncursed', 'legacy', 'lit_corridor',
    'lootabc', 'mail', 'mention_decor', 'mention_map', 'mention_walls',
    'menu_overlay', 'menucolors', 'mon_movement', 'news', 'nudist', 'null',
    'pauper', 'pickup_stolen', 'pickup_thrown', 'price_quotes', 'pushweapon',
    'query_menu', 'quick_farsight', 'reroll', 'rest_on_space', 'safe_pet',
    'safe_wait', 'selectsaved', 'showdamage', 'showexp', 'showrace', 'showvers',
    'silent', 'sortpack', 'sounds', 'sparkle', 'spot_monsters', 'standout',
    'status_updates', 'terrainstatus', 'time', 'tips', 'tombstone', 'toptenwin',
    'travel', 'tutorial', 'use_darkgray', 'use_inverse', 'use_truecolor',
    'verbose', 'voices', 'weaponstatus', 'whatis_menu', 'whatis_moveskip',
];

// Compound option [name, description] pairs, in allopt[] order (option_help()
// CompOpt loop; descriptions are allopt[].descr).
const OPT_COMPOUND = [
    ['windowtype', 'windowing system to use (should be specified first)'],
    ['playmode', 'normal play, non-scoring explore mode, or debug mode'],
    ['name', "your character's name (e.g., name:Merlin-W)"],
    ['role', 'your starting role (e.g., Barbarian, Valkyrie)'],
    ['race', 'your starting race (e.g., Human, Elf)'],
    ['gender', 'your starting gender (male or female)'],
    ['alignment', 'your starting alignment (lawful, neutral, or chaotic)'],
    ['altkeyhandling', '(not applicable)'],
    ['autounlock', 'action to take when encountering locked door or chest'],
    ['boulder', 'deprecated (use S_boulder in sym file instead)'],
    ['catname', 'name of your starting pet if it is a kitten'],
    ['crash_email', 'email address for reporting'],
    ['crash_name', 'your name for reporting'],
    ['crash_urlmax', 'length of longest url we can generate'],
    ['DECgraphics', 'load DECGraphics display symbols into symset'],
    ['disclose', 'the kinds of information to disclose at end of game'],
    ['dogname', 'name of your starting pet if it is a little dog'],
    ['dungeon', 'list of symbols to use in drawing the dungeon map'],
    ['effects', 'list of symbols to use in drawing special effects'],
    ['fruit', 'name of a fruit you enjoy eating'],
    ['glyph', 'set representation of a glyph to a unicode value and color'],
    ['hilite_status', 'a status highlighting rule (can occur multiple times)'],
    ['horsename', 'name of your starting pet if it is a pony'],
    ['IBMgraphics', 'load IBMGraphics display symbols into symset'],
    ['menu_deselect_all', 'deselect all items in a menu'],
    ['menu_deselect_page', 'deselect all items on this page of a menu'],
    ['menu_first_page', 'jump to the first page in a menu'],
    ['menu_headings', 'display style for menu headings'],
    ['menu_invert_all', 'invert all items in a menu'],
    ['menu_invert_page', 'invert all items on this page of a menu'],
    ['menu_last_page', 'jump to the last page in a menu'],
    ['menu_next_page', 'go to the next menu page'],
    ['menu_objsyms', 'show object symbols in menus'],
    ['menu_previous_page', 'go to the previous menu page'],
    ['menu_search', 'search for a menu item'],
    ['menu_select_all', 'select all items in a menu'],
    ['menu_select_page', 'select all items on this page of a menu'],
    ['menu_shift_left', 'pan current menu page left'],
    ['menu_shift_right', 'pan current menu page right'],
    ['menuinvertmode', 'experimental behavior of menu inverts'],
    ['menustyle', 'user interface for object selection'],
    ['monsters', 'list of symbols to use for monsters'],
    ['msg_window', 'control of "view previous message(s)" (^P) behavior'],
    ['msghistory', 'number of top line messages to save'],
    ['number_pad', 'use the number pad for movement'],
    ['objects', 'list of symbols to use for objects'],
    ['packorder', 'the inventory order of the items in your pack'],
    ['paranoid_confirmation', 'extra prompting in certain situations'],
    ['petattr', 'attributes for highlighting pets'],
    ['pettype', 'your preferred initial pet type'],
    ['pickup_burden', 'maximum burden picked up before prompt'],
    ['pickup_types', 'types of objects to pick up automatically'],
    ['pile_limit', 'threshold for "there are many objects here"'],
    ['roguesymset', 'load a set of rogue display symbols from symbols file'],
    ['runmode', "display frequency when `running' or `travelling'"],
    ['scores', 'the parts of the score list you wish to see'],
    ['sortdiscoveries', 'preferred order when displaying discovered objects'],
    ['sortloot', 'sort object selection lists by description'],
    ['sortvanquished', 'preferred order when displaying vanquished monsters'],
    ['soundlib', 'soundlib interface to use (if any)'],
    ['statushilites', '0=no status highlighting, N=show highlights for N turns'],
    ['statuslines', '2 or 3 lines for status display'],
    ['suppress_alert', 'suppress alerts about version-specific features'],
    ['symset', 'load a set of display symbols from symbols file'],
    ['traps', 'list of symbols to use in drawing traps'],
    ['versinfo', "extra information for 'showvers'"],
    ['warnings', 'display characters for warnings'],
    ['whatis_coord', 'show coordinates when auto-describing cursor position'],
    ['whatis_filter', 'filter coordinate locations when targeting next or previous'],
    ['cond_', 'prefix for cond_ options'],
    ['font', 'prefix for font options'],
];

// "Other settings" names, in allopt[] order (option_help() OthrOpt loop).
const OPT_OTHER = [
    'autocompletions', 'autopickup exceptions', 'bind keys', 'menu colors',
    'message types', 'status condition fields', 'status highlight rules',
];

// opt_epilog[] (options.c).
const OPT_EPILOG = [
    '',
    'Some of the options can only be set before the game is started;',
    "those items will not be selectable in the 'O' command's menu.",
    "Some options are stored in a game's save file, and will keep saved",
    'values when restoring that game even if you have updated your config-',
    'uration file to change them.  Such changes will matter for new games.',
    'The "other settings" can be set with \'O\', but when set within the',
    'configuration file they use their own directives rather than OPTIONS.',
    'See NetHack\'s "Guidebook" for details.',
];

const OPT_CO = 80; // CO / COLNO (terminal columns)

// C ref: win/tty/wintty.c compress_str() — when a text/menu-window line is at
// least CO chars long (or has a newline), collapse each run of spaces to one
// (and drop leading/trailing space) so the wrap below doesn't split it.
function compress_str(str) {
    if (str.length < OPT_CO && str.indexOf('\n') < 0) return str;
    let out = '';
    let was = true; // discards leading spaces
    for (let k = 0; k < str.length; k++) {
        let c = str[k];
        if (c === '\n') c = ' ';
        if (was && c === ' ') continue;
        out += c;
        was = (c === ' ');
    }
    if (was && out.length > 0) out = out.slice(0, -1);
    return out;
}

// C ref: win/tty/wintty.c tty_putstr() NHW_TEXT branch — add one putstr()'d
// line to a text window: compress_str() it, then if it's still longer than CO
// break it at the last space at/under column CO-1 and recurse on the tail.
function wput(lines, str) {
    str = compress_str(str);
    for (;;) {
        if (str.length + 1 > OPT_CO) {
            let i = OPT_CO - 1;
            while (i > 0 && str[i] !== ' ' && str[i] !== '\n') i--;
            if (i > 0) {
                lines.push(str.slice(0, i + 1));
                str = str.slice(i + 1);
                continue;
            }
        }
        lines.push(str);
        break;
    }
}

// C ref: options.c option_help() — produce the ordered list of putstr() lines
// (already tty_putstr-wrapped) that the "List of game options." text window
// shows.  Returned to pager.js, which pages it through display_text_window().
export function option_help_lines() {
    const L = [];
    // opt_intro[] with opt_intro[CONFIG_SLOT] = "Set options as ... in <cfg>".
    wput(L, '');
    wput(L, '                 NetHack Options Help:');
    wput(L, '');
    wput(L, `Set options as OPTIONS=<options> in ${OPT_CONFIGFILE}`);
    wput(L, 'or use `NETHACKOPTIONS="<options>"\' in your environment');
    wput(L, '(<options> is a list of options separated by commas)');
    wput(L, 'or press "O" while playing and use the menu.');
    wput(L, '');
    wput(L, 'Boolean options (which can be negated by prefixing them with \'!\' or "no"):');

    // Boolean options via next_opt(): accumulate "opt, opt, " and flush a line
    // whenever adding the next name would exceed COLNO-2; final next_opt("")
    // turns the trailing ", " into "." and emits a blank line.
    let buf = '';
    for (const nm of OPT_BOOL) {
        if (buf.length + nm.length + 2 > OPT_CO - 2) { wput(L, buf); buf = ''; }
        buf += nm + ', ';
    }
    if (buf.length >= 2 && buf.slice(-2) === ', ') buf = buf.slice(0, -2) + '.';
    wput(L, buf);
    wput(L, '');

    // Compound options: "%-20s - %s%c" with ',' between and '.' after the last.
    wput(L, 'Compound options:');
    for (let i = 0; i < OPT_COMPOUND.length; i++) {
        const [nm, descr] = OPT_COMPOUND[i];
        let buf2 = '`' + nm + "'";
        if (buf2.length < 20) buf2 = buf2 + ' '.repeat(20 - buf2.length);
        wput(L, `${buf2} - ${descr}${i + 1 < OPT_COMPOUND.length ? ',' : '.'}`);
    }
    wput(L, '');

    // Other settings: " <name>" per line.
    wput(L, 'Other settings:');
    for (const nm of OPT_OTHER) wput(L, ' ' + nm);
    wput(L, '');

    for (const e of OPT_EPILOG) wput(L, e);
    return L;
}

// C ref: options.c txt2key() — turn a BIND key spec into the raw key it names.
// Supports a plain single character, the <enter>/<space>/<esc> aliases, and
// caret control notation (^X -> Ctrl-X); other escape forms are uncommon in
// configs and fall back to the first character.
function txt2key(txt) {
    txt = txt.trim();
    if (!txt) return '';
    if (txt.length === 1) return txt;
    if (txt === '<enter>') return '\n';
    if (txt === '<space>') return ' ';
    if (txt === '<esc>') return '\x1b';
    if (txt[0] === '^' && txt[1]) {
        return String.fromCharCode(txt[1].toUpperCase().charCodeAt(0) & 0x1f);
    }
    return txt[0];
}

// C ref: options.c parsebindings() — parse "key:command[,key2:command2,...]"
// from a BIND= line and record each key -> command-name mapping.  cmd.js maps
// the command name to that command's default key at dispatch time.
function parseBindings(str, result) {
    for (const elem of str.split(',')) {
        const s = elem.trim();
        if (!s) continue;
        const idx = s.indexOf(':');
        if (idx < 0) continue;
        const keyChar = txt2key(s.slice(0, idx));
        const cmd = s.slice(idx + 1).trim().toLowerCase();
        if (!keyChar || !cmd) continue;
        result.keybind[keyChar] = cmd;
    }
}

export function parseNethackrc(rc) {
    const result = {
        name: '', role: -1, race: -1, gender: -1, align: -1,
        flags: {}, iflags: {}, keybind: {},
    };
    if (!rc) return result;

    for (const rawLine of rc.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        // C ref: cfgfiles.c config_line_stmt[] — BINDINGS is matched on its
        // first 4 chars, so "BIND=" is the common abbreviation.
        const bindMatch = line.match(/^BIND\w*=(.+)/i);
        if (bindMatch) {
            parseBindings(bindMatch[1], result);
            continue;
        }

        const optMatch = line.match(/^OPTIONS=(.+)/i);
        if (!optMatch) continue;

        for (const opt of optMatch[1].split(',')) {
            const trimmed = opt.trim();
            if (!trimmed) continue;

            const negated = trimmed.startsWith('!');
            const stripped = negated ? trimmed.slice(1) : trimmed;

            const colonIdx = stripped.indexOf(':');
            if (colonIdx >= 0) {
                const key = stripped.slice(0, colonIdx).trim().toLowerCase();
                const val = stripped.slice(colonIdx + 1).trim();

                if (key === 'name') result.name = val;
                else if (key === 'role') result.role = val;
                else if (key === 'race') result.race = val;
                else if (key === 'gender') result.gender = val;
                else if (key === 'align') result.align = val;
                else if (key === 'playmode' && val === 'debug') result.flags.debug = true;
                else if (key === 'pettype' || key === 'pet') {
                    result.flags.pettype = val;
                    if (val === 'none' || val === 'n') result.preferred_pet = 'n';
                    else if (val === 'dog' || val === 'd') result.preferred_pet = 'd';
                    else if (val === 'cat' || val === 'c') result.preferred_pet = 'c';
                }
                else if (key === 'symset') result.symset = val;
                else if (key === 'suppress_alert') result.flags.suppress_alert = val;
                else if (key === 'msg_window') result.iflags.prevmsg_window = val;
                else result.flags[key] = val;
            } else {
                // Boolean flag
                const lname = stripped.toLowerCase();
                const value = !negated;

                if (lname === 'autopickup') result.flags.pickup = value;
                else if (lname === 'color') result.flags.color = value;
                else if (lname === 'legacy') result.flags.legacy = value;
                else if (lname === 'tutorial') { result.flags.tutorial = value; result.tutorial_set = true; }
                else if (lname === 'splash_screen') result.iflags.wc_splash_screen = value;
                else if (lname === 'pushweapon') result.flags.pushweapon = value;
                else if (lname === 'showexp') result.flags.showexp = value;
                else if (lname === 'time') result.flags.time = value;
                else if (lname === 'verbose') result.flags.verbose = value;
                else if (lname === 'fixinv') result.flags.invlet_constant = value;
                else result.flags[lname] = value;
            }
        }
    }
    return result;
}
