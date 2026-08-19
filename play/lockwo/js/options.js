// options.js — Parse .nethackrc options.
// C ref: options.c — handles OPTIONS=, BIND=, etc.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { NO_COLOR } from './terminal.js';

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
// recorded screen itself, so we can never reproduce its exact characters and
// that one substituted line is always lost.  But C's initoptions() always
// resolves *some* (non-empty) configfile path before option_help() can run
// (cfgfiles.c set_configfile_name() fallback chain always sets one), and
// tty_putstr()'s line-break-on-overflow (ported below as wput()) always
// splits "Set options as OPTIONS=<options> in <cfg>" onto its own line
// whenever that combined string doesn't fit in COLNO — which it never does
// for any real absolute path.  Losing that split (by leaving the substituted
// text empty, so the combined line fits on one row after all) shifts every
// following putstr() line up by one row and costs many more matches than the
// single unrecoverable line does, so we still emit the split's second line —
// just with unknown/empty content instead of a fabricated path.
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
    wput(L, 'Set options as OPTIONS=<options> in');
    wput(L, OPT_CONFIGFILE);
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

// C ref: options.c sym_val() — reduce a SYMBOLS= value string to the single
// display character it names.  Only the common forms actually reachable from
// a config file are handled: a bare character, or a single-quoted character
// (optionally backslash-escaped).
function symVal(strval) {
    if (!strval) return '';
    if (strval.length <= 1) return strval;
    if (strval[0] === "'") {
        const close = strval.lastIndexOf("'");
        let inner = close > 0 ? strval.slice(1, close) : strval.slice(1);
        if (inner[0] === '\\' && inner.length >= 2) return inner[1];
        return inner[0] || '';
    }
    return strval[0];
}

// C ref: symbols.c parsesymbols() — parse "S_name:char[,S_name2:char2,...]"
// from a SYMBOLS= line and record each cmap symbol's display-character
// override.  display.js consults this map when rendering terrain glyphs.
function parseSymbols(str, result) {
    for (const elem of str.split(',')) {
        const s = elem.trim();
        if (!s) continue;
        const idx = s.indexOf(':');
        if (idx < 0) continue;
        const name = s.slice(0, idx).trim();
        const val = symVal(s.slice(idx + 1).trim());
        if (!name || !val) continue;
        result.symoverride[name] = val;
    }
}

// ---------------------------------------------------------------------------
// AUTOPICKUP_EXCEPTION= and the config-error machinery.
//
// C ref: cfgfiles.c config_error_init()/config_error_nextline()/config_erradd()
// /config_error_done().  Every message goes through pline(), which this early
// (iflags.window_inited still FALSE) is raw_print() — so the "errors" are
// SCREEN CONTENT written by the recorder's raw shadow-buffer writer, and the
// dismissal is a getret() that eats input.  Both are modelled here.

// The frame is per-parse rather than a stack: parseNethackrc reads one file.
let config_error_data = null;

function config_error_init(sourcename) {
    config_error_data = {
        line_num: 0, num_errors: 0, origline_shown: false,
        source: sourcename || '', raw: [],
    };
}

// Called for EVERY physical line, comments and blanks included — which is why
// "Line 5" can name a line parse_config_line() never sees.
function config_error_nextline(line) {
    const ced = config_error_data;
    if (!ced) return;
    ced.line_num++;
    ced.origline_shown = false;
    ced.origline = line || '';
}

// C ref: cfgfiles.c config_erradd().  The period is added to the MESSAGE, not
// to buf[], and only when buf doesn't already end in one of ".!?".
function config_error_add(buf) {
    const ced = config_error_data;
    if (!buf) buf = 'Unknown error';
    const punct = '.!?'.includes(buf[buf.length - 1]) ? '' : '.';
    if (!ced) return;
    ced.num_errors++;
    if (!ced.origline_shown) {
        ced.raw.push('\n' + ced.origline);
        ced.origline_shown = true;
    }
    const lineno = ced.line_num > 0 ? `Line ${ced.line_num}: ` : '';
    ced.raw.push(` * ${lineno}${buf}${punct}`);
}

// C ref: cfgfiles.c config_error_done() — the trailing count line, then
// wait_synch().  `configfile` is the RESOLVED $HOME/.nethackrc, i.e. an
// absolute path that exists only inside the recorded screen; emit the
// unresolved cfgfiles.c default_configfile instead (that row is lost either
// way, and a fabricated path would be an environment hardcode).
const DEFAULT_CONFIGFILE = '.nethackrc';

function config_error_done(result) {
    const ced = config_error_data;
    config_error_data = null;
    if (!ced || !ced.num_errors) return;
    const n = ced.num_errors;
    ced.raw.push(`\n${n} error${n === 1 ? '' : 's'} `
                 + `${ced.source === 'command line' ? 'on' : 'in'} `
                 + `${ced.source || DEFAULT_CONFIGFILE}.\n`);
    result.config_error_raw = ced.raw;
    result.config_error_count = n;
}

// C ref: options.c add_autopickup_exception() — one sscanf per accepted form.
// This mimics `sscanf(mapping, "\"<%253[^\"]\" %c", text, &end)`: the literal
// quote, an optional grab/nograb marker, a non-empty run of up to 253
// non-quote characters, the closing quote, then (after optional whitespace)
// one trailing character.  Returns the number of fields assigned, so a
// half-matched pattern reports 0 and the caller falls through, exactly as C's
// short-circuited || chain does.
function sscanf_ape(mapping, lead) {
    let i = 0;
    if (mapping[i] !== '"') return { n: 0 };
    i++;
    if (lead) {
        if (mapping[i] !== lead) return { n: 0 };
        i++;
    }
    const start = i;
    while (i < mapping.length && mapping[i] !== '"' && i - start < 253) i++;
    if (i === start) return { n: 0 };           /* scanset matched nothing */
    const text = mapping.slice(start, i);
    if (mapping[i] !== '"') return { n: 0 };    /* literal '"' unmatched */
    i++;
    while (i < mapping.length && isspace(mapping[i])) i++;
    if (i >= mapping.length) return { n: 1, text };
    return { n: 2, text, end: mapping[i] };
}

// C ref: options.c add_autopickup_exception().  ape->pattern is a POSIX
// EXTENDED regex (sys/share/posixregex.c regex_compile passes REG_EXTENDED)
// matched unanchored against the object description, NOT a glob.
function add_autopickup_exception(mapping, result) {
    const APE_regex_error = 'regex error in AUTOPICKUP_EXCEPTION';
    const APE_syntax_error = 'syntax error in AUTOPICKUP_EXCEPTION';
    let grab = false;

    let r = sscanf_ape(mapping, '<');
    if (r.n === 1 || (r.n === 2 && r.end === '#')) {
        grab = true;
    } else {
        r = sscanf_ape(mapping, '>');
        /* C's `||` chain reassigns n (and end) from the bare-quote sscanf
           whenever the '>' one didn't return exactly 1, so `">pat" #` is
           accepted by the third form with '>' left INSIDE the pattern. */
        if (r.n !== 1) r = sscanf_ape(mapping, '');
        if (!(r.n === 1 || (r.n === 2 && r.end === '#'))) {
            config_error_add(APE_syntax_error);
            return 0;
        }
        grab = false;
    }

    let re;
    try {
        re = new RegExp(r.text);
    } catch (e) {
        config_error_add(`${APE_regex_error}: ${e.message}`);
        return 0;
    }
    /* ape->next = ga.apelist: newest first, which is the order
       check_autopickup_exceptions() walks */
    result.apelist.unshift({ pattern: r.text, grab, regex: re });
    return 1;
}

// C ref: win/tty/termcap.c nomux_enter_raw_mode()/nomux_raw_putch() driving
// wintty.c getret() via wait_synch().  Two recorder facts make this load
// bearing far past the error screen itself:
//   - nomux_raw_active is never cleared, so from the first pre-window-init
//     raw_print onward the CAPTURED cursor is this writer's row/col, whatever
//     the game later draws.  jsmain's capture hook and js/save.js read
//     game._nomux_raw for that.
//   - xputs() (getret()'s "Hit return to continue: ") was never hooked by the
//     capture patch, so it is absent from the recorded screen and must not be
//     drawn here.
export async function config_error_report(result) {
    const raw = result?.config_error_raw;
    if (!raw || !raw.length) return;
    const disp = game.nhDisplay;
    const rows = disp?.rows ?? 24, cols = disp?.cols ?? 80;
    /* nomux_enter_raw_mode() clears the shadow buffer: exit_nhwindows/settty
       switch off the alt screen, so the visible terminal is blank first. */
    if (disp?.clearScreen) disp.clearScreen();
    let row = 0, col = 0;
    const putch = (ch) => {
        if (ch === '\n') { row++; col = 0; return; }
        if (ch.charCodeAt(0) < 32) return;
        if (row >= 0 && row < rows && col >= 0 && col < cols)
            disp?.putstr?.(col, row, ch, NO_COLOR, 0);
        col++;
    };
    for (const s of raw) {
        for (const ch of s) putch(ch);
        putch('\n'); /* puts() / tty_raw_print_bold both append one */
    }
    game._nomux_raw = { row, col };
    if (disp?.setCursor) disp.setCursor(col, row);

    /* getline.c xwaitforspace(): iflags.cbreak is still FALSE this early
       (setftty() runs from tty_init_nhwindows), so the entire cbreak branch is
       skipped — neither space nor ESC dismisses this, ONLY '\n' or '\r'.  Every
       key before that is one captured input boundary with an unchanged screen. */
    for (;;) {
        const c = await nhgetch();
        if (c === 10 || c === 13) break;
    }
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

// ---------------------------------------------------------------------------
// C ref: include/optlist.h allopt[] — every NHOPTB/NHOPTC/NHOPTP/NHOPTO entry
// in table order, with this build's #ifdefs resolved (recorder CFLAGS are
// `-DNOTPARMDECL -DNO_TIMED_DELAY`, hints file macosx-minimal).  Table order is
// load-bearing twice over: parseoptions() stops at the FIRST match, so
// `font_map` is found before the trailing `font` prefix entry, and
// determine_ambiguities() needs every name present or the minmatch lengths all
// come out too short.  Columns are `name|alias|type|flags`:
//   type   B = BoolOpt, C = CompOpt, O = OthrOpt
//   flags  n = negateok, v = valok, d = dupeok, p = pfx (an NHOPTP prefix
//          option, matched with str_start_is() instead of by minmatch),
//          0 = allopt[].addr is NULL in this build so optfn_boolean() takes its
//          "silent retreat" and sets nothing, w = setwhere is set_wiznofuz,
//          which optfn_boolean() rejects when go.opt_initial (i.e. from a
//          config file).
const ALLOPT_DATA = `windowtype||C|v
playmode||C|v
name||C|v
role|character|C|nvd
race||C|nvd
gender||C|nvd
alignment|align|C|nvd
accessiblemsg||B|n
acoustics||B|n
align_message||C|nv
align_status||C|v
altkeyhandling|altkeyhandler|C|v
altmeta||B|n
armorstatus||B|n
ascii_map||B|n
autocompletions||O|v
autodescribe||B|n
autodig||B|n
autoopen||B|n
autopickup||B|n
autopickup exceptions||O|v
autoquiver||B|n
autounlock||C|nv
bgcolors||B|n
bind keys||O|v
BIOS||B|0
blind|permablind|B|n
bones||B|n
boulder||C|v
catname||C|v
checkpoint||B|n
cmdassist||B|n
color|colour|B|n
confirm||B|n
crash_email||C|v
crash_name||C|v
crash_urlmax||C|v
customcolors|customcolours|B|n
customsymbols|customsymbols|B|n
dark_room||B|n
deaf|permadeaf|B|n
DECgraphics||C|nv
debug_hunger||B|nw
debug_mongen||B|nw
debug_overwrite_stairs||B|nw
disclose||C|nv
dogname||C|v
dropped_nopick||B|n
dungeon||C|v
effects||C|v
eight_bit_tty||B|n
extmenu||B|n
female|male|B|n
fireassist||B|n
fixinv||B|n
font_map||C|nvd
font_menu||C|nvd
font_message||C|nvd
font_size_map||C|nvd
font_size_menu||C|nvd
font_size_message||C|nvd
font_size_status||C|nvd
font_size_text||C|nvd
font_status||C|nvd
font_text||C|nvd
force_invmenu||B|n
fruit||C|v
fullscreen||B|n
glyph||C|vd
goldX||B|n
guicolor||B|n
help||B|n
herecmd_menu||B|n
hilite_pet||B|n
hilite_pile||B|n
hilite_status||C|nvd
hitpointbar||B|n
horsename||C|v
IBMgraphics||C|nv
idlecheckpoint||B|n
ignintr||B|n
implicit_uncursed||B|n
legacy||B|n
lit_corridor||B|n
lootabc||B|n
mail||B|n
map_mode||C|nv
mention_decor||B|n
mention_map||B|n
mention_walls||B|n
menu_deselect_all||C|v
menu_deselect_page||C|v
menu_first_page||C|v
menu_headings||C|nv
menu_invert_all||C|v
menu_invert_page||C|v
menu_last_page||C|v
menu_next_page||C|v
menu_objsyms|use_menu_glyphs|C|nv
menu_overlay||B|n
menu_previous_page||C|v
menu_search||C|v
menu_select_all||C|v
menu_select_page||C|v
menu_shift_left||C|v
menu_shift_right||C|v
menu_tab_sep||B|n
menucolors||B|nv
menu colors||O|v
menuinvertmode||C|v
menustyle||C|nv
message types||O|v
mon_movement||B|n
monpolycontrol||B|n
montelecontrol||B|n
monsters||C|v
mouse_support||C|v
msg_window||C|nv
msghistory||C|nv
news||B|n
nudist||B|n
null||B|n
number_pad||C|v
objects||C|v
packorder||C|v
paranoid_confirmation|prayconfirm|C|nvd
pauper||B|n
perm_invent||B|n
perminv_mode||C|nv
petattr||C|v
pettype|pet|C|nv
pickup_burden||C|v
pickup_stolen||B|n
pickup_thrown||B|n
pickup_types||C|v
pile_limit||C|nv
player_selection||C|v
popup_dialog||B|n
preload_tiles||B|n
price_quotes||B|n
pushweapon||B|n
query_menu||B|n
quick_farsight||B|n
rawio||B|0
reroll||B|n
rest_on_space||B|n
roguesymset||C|v
runmode||C|nv
safe_pet||B|n
safe_wait||B|n
sanity_check||B|n
scores||C|v
scroll_amount||C|nv
scroll_margin||C|nv
selectsaved||B|n
showdamage||B|n
showexp||B|n
showrace||B|n
showscore||B|n0
showvers||B|n
silent||B|n
softkeyboard||B|n
sortdiscoveries||C|nv
sortloot||C|v
sortpack||B|n
sortvanquished||C|nv
soundlib||C|v
sounds||B|n
sparkle||B|n
spot_monsters||B|n
splash_screen||B|n
standout||B|n
status_updates||B|n
status condition fields||O|v
statushilites||C|nvd
status highlight rules||O|v
statuslines||C|v
suppress_alert||C|vd
symset||C|v
term_cols|termcolumns|C|v
term_rows||C|v
terrainstatus||B|n
tile_file||C|v
tile_height||C|nv
tile_width||C|nv
tiled_map||B|n
time||B|n
timed_delay||B|0
tips||B|n
tombstone||B|n
toptenwin||B|n
traps||C|v
travel||B|n
travel_debug||B|n
tutorial||B|n
use_darkgray||B|n
use_inverse||B|n
use_truecolor|use_truecolour|B|n
vary_msgcount||C|v
verbose||B|n
versinfo||C|v
voices||B|n
vt_tiledata||B|n0
vt_sounddata||B|n0
warnings||C|v
weaponstatus||B|n
whatis_coord||C|nv
whatis_filter||C|nv
whatis_menu||B|n
whatis_moveskip||B|n
windowborders||C|nv
windowcolors||C|vd
wizmgender||B|n
wizweight||B|n
wraptext||B|n
cond_||C|ndp
font||C|nvdp`;

const ALLOPT = ALLOPT_DATA.split('\n').map((line) => {
    const [name, alias, typ, f] = line.split('|');
    return {
        name, alias: alias || null, typ,
        negateok: f.includes('n'), valok: f.includes('v'),
        dupeok: f.includes('d'), pfx: f.includes('p'),
        noaddr: f.includes('0'), wiznofuz: f.includes('w'),
        minmatch: 0,
    };
});

// C ref: hacklib.c lowc() — ASCII-only, so JS toLowerCase() (which also folds
// e.g. U+0130) is not a substitute.
function lowc(c) {
    return (c >= 'A' && c <= 'Z') ? String.fromCharCode(c.charCodeAt(0) + 32) : c;
}

function isspace(c) {
    return c === ' ' || c === '\t' || c === '\n' || c === '\v' || c === '\f' || c === '\r';
}

// strncmpi(a, b, n) == 0.  Both operands are NUL-terminated in C, so a run that
// reaches the end of one string but not the other is a mismatch.
function strncmpi_eq(a, b, n) {
    for (let i = 0; i < n; i++) {
        const ea = i >= a.length, eb = i >= b.length;
        if (ea || eb) return ea && eb;
        if (lowc(a[i]) !== lowc(b[i])) return false;
    }
    return true;
}

function strcmpi_eq(a, b) {
    return a.length === b.length && strncmpi_eq(a, b, a.length);
}

// C ref: options.c length_without_val() — the length of the option name part,
// i.e. up to the first ':' or '=' (whichever comes first) with any whitespace
// in front of it backed over.
function length_without_val(user_string, len) {
    let p = user_string.indexOf(':');
    const q = user_string.indexOf('=');
    if (p < 0 || (q >= 0 && q < p)) p = q;
    if (p >= 0) {
        while (p > 0 && isspace(user_string[p - 1])) p--;
        return p;
    }
    return len;
}

// C ref: options.c match_optname() — the user's text, minus any ":value", must
// be a case-insensitive leading substring of the option name and at least
// min_length characters long.
function match_optname(user_string, optn_name, min_length, val_allowed) {
    let len = user_string.length;
    if (val_allowed) len = length_without_val(user_string, len);
    return len >= min_length && strncmpi_eq(optn_name, user_string, len);
}

// C ref: hacklib.c str_start_is().
function str_start_is(str, chkstr, caseblind) {
    for (let i = 0; ; i++) {
        if (i >= str.length) return i >= chkstr.length;
        if (i >= chkstr.length) return true;
        const t1 = caseblind ? lowc(str[i]) : str[i];
        const t2 = caseblind ? lowc(chkstr[i]) : chkstr[i];
        if (t1 !== t2) return false;
    }
}

// C ref: options.c determine_ambiguities() — for each option, the length of its
// longest shared leading prefix with any other option name, plus one; floored
// at 3 and capped at the name's own length.  Run once at startup in C
// (initoptions_init), once at module load here.
function determine_ambiguities() {
    const needed = ALLOPT.map(() => 0);
    for (let i = 0; i < ALLOPT.length; i++) {
        for (let j = 0; j < ALLOPT.length; j++) {
            if (j === i) continue;
            const p1 = ALLOPT[i].name, p2 = ALLOPT[j].name;
            let tmpneeded = 1, k = 0;
            while (k < p1.length && k < p2.length && lowc(p1[k]) === lowc(p2[k])) {
                tmpneeded++; k++;
            }
            if (tmpneeded > needed[i]) needed[i] = tmpneeded;
            if (tmpneeded > needed[j]) needed[j] = tmpneeded;
        }
    }
    for (let i = 0; i < ALLOPT.length; i++) {
        const len = ALLOPT[i].name.length;
        ALLOPT[i].minmatch = (needed[i] < 3) ? 3 : (needed[i] <= len) ? needed[i] : len;
    }
}
determine_ambiguities();

// C ref: options.c string_for_opt() — everything past the first ':' or '='.
// Leading spaces are NOT stripped; each optfn decides what to do with them.
function string_for_opt(opts) {
    let colon = opts.indexOf(':');
    const equals = opts.indexOf('=');
    if (colon < 0 || (equals >= 0 && equals < colon)) colon = equals;
    if (colon < 0 || colon + 1 >= opts.length) return '';
    return opts.slice(colon + 1);
}

// C ref: options.c nmcpy() — copy up to maxlen-1 chars, stopping at a comma.
function nmcpy(src, maxlen) {
    const comma = src.indexOf(',');
    return (comma >= 0 ? src.slice(0, comma) : src).slice(0, maxlen - 1);
}

// The boolean option names our engine reads under a different field than the C
// option name.  Everything else lands on result.flags[<C option name>], which
// is the stable key the number_pad / status-line / autopickup lanes read.
function set_boolean(name, value, result) {
    switch (name) {
    case 'autopickup': result.flags.pickup = value; break;      // C: flags.pickup
    case 'fixinv': result.flags.invlet_constant = value; break; // C: flags.invlet_constant
    case 'splash_screen': result.iflags.wc_splash_screen = value; break;
    case 'tutorial':
        result.flags.tutorial = value;
        // allmain.js gates the "Do you want a tutorial?" prompt on this, which
        // is C's opt_set_in_config[opt_tutorial] — set for either polarity.
        result.tutorial_set = true;
        break;
    default: result.flags[name] = value; break;
    }
}

// C ref: options.c optfn_boolean().
function optfn_boolean(o, negated, opts, op, result) {
    if (o.noaddr) return;   /* silent retreat */
    if (o.wiznofuz) return; /* go.opt_initial && set_wiznofuz */

    if (op !== '') {
        if (negated) return; /* "Negated boolean should not have a parameter" */
        const ln = op.length;
        if (strncmpi_eq(op, 'true', ln) || strncmpi_eq(op, 'yes', ln)
            || strcmpi_eq(op, 'on')
            || (op[0] >= '0' && op[0] <= '9' && parseInt(op, 10) === 1)) {
            negated = false;
        } else if (strncmpi_eq(op, 'false', ln) || strncmpi_eq(op, 'no', ln)
                   || strcmpi_eq(op, 'off')
                   || (op[0] >= '0' && op[0] <= '9' && parseInt(op, 10) === 0)) {
            negated = true;
        } else if (!o.valok) {
            return;
        }
    }

    // "Before the change": opt_female is reached under either its own name or
    // its "male" alias, and which one the user typed flips the sense.
    if (o.name === 'female') {
        const n = Math.max(op.length, 3);
        if (strncmpi_eq(opts, 'female', n)) { result.gender = negated ? 'male' : 'female'; return; }
        if (strncmpi_eq(opts, 'male', n)) { result.gender = negated ? 'female' : 'male'; return; }
    }

    set_boolean(o.name, !negated, result);

    // "After the change".
    if (o.name === 'pauper') set_boolean('nudist', !negated, result);
    else if (o.name === 'ascii_map') result.iflags.wc_tiled_map = negated;
    else if (o.name === 'tiled_map') result.iflags.wc_ascii_map = negated;
}

// C ref: options.c optfn_pettype() — one letter decides, and a bare "!pettype"
// with no value means "no pet".
function optfn_pettype(negated, op, result) {
    if (op === '') {
        if (negated) result.preferred_pet = 'n';
        return;
    }
    result.flags.pettype = op;
    switch (lowc(op[0])) {
    case 'd': result.preferred_pet = 'd'; break;
    case 'c': case 'f': result.preferred_pet = 'c'; break;
    case 'h': case 'q': result.preferred_pet = 'h'; break;
    case 'n': result.preferred_pet = 'n'; break;
    case 'r': case '*': result.preferred_pet = ''; break; // gp.preferred_pet = '\0'
    default: break;                                       // "Unrecognized pet type"
    }
}

// The compound-option handlers (options.c optfn_<name>()).  Only the ones whose
// value our engine actually consumes are modelled; the rest are recorded under
// their C option name so the lane that implements the effect can read them.
function optfn_compound(o, negated, opts, op, result) {
    // C ref: optfn_DECgraphics()/optfn_IBMgraphics() — deprecated spellings of
    // symset:<name>, and they refuse to load if a symset is already chosen.
    if (o.name === 'DECgraphics' || o.name === 'IBMgraphics') {
        if (!negated && !result.symset) result.symset = o.name;
        return;
    }
    // pettype is the one compound option whose value is optional (its
    // string_for_env_opt() call passes val_optional = negated).
    if (o.name === 'pettype') { optfn_pettype(negated, op, result); return; }
    // A prefix option's suffix is part of the user's text, so there is no
    // canonical name to key on; store it under the whole name it typed.
    if (o.pfx) {
        const key = opts.slice(0, length_without_val(opts, opts.length)).toLowerCase();
        result.flags[key] = (o.valok && op !== '') ? op : !negated;
        return;
    }
    if (op === '') return; /* "Missing parameter for ..." */

    switch (o.name) {
    case 'name': result.name = nmcpy(op, 32); return;   // PL_NSIZ
    // C ref: optfn_boulder() — deprecated spelling of SYMBOLS=S_boulder:c.
    case 'boulder': result.symoverride.S_boulder = symVal(op); return;
    case 'symset': result.symset = op; return;
    case 'msg_window': result.iflags.prevmsg_window = op; return;
    case 'playmode':
        // C ref: set_playmode() — "explore" sets discover (read back off
        // flags.playmode by allmain.js/bones.js/tutorial.js) and "debug" sets
        // wizard, which jsmain.js reads as flags.debug and which also forces
        // the player name to "wizard".
        result.flags.playmode = op;
        if (op === 'debug') result.flags.debug = true;
        return;
    // role/race/gender/alignment: a negated value is C's role FILTER
    // (gotrolefilter), which selects among the remaining choices rather than
    // fixing one, so there is nothing to store.
    case 'role': case 'race': case 'gender':
        if (!negated) result[o.name] = op;
        return;
    case 'alignment':
        if (!negated) result.align = op;
        return;
    default: result.flags[o.name] = op; return;
    }
}

// C ref: options.c parseoptions() — one element of a comma-separated OPTIONS
// list, or the whole list (it splits and recurses itself).
function parseoptions(optstr, tinitial, result) {
    let opts = optstr;

    // Elements are processed RIGHT TO LEFT: split at the first comma and
    // recurse on the rest before handling the current element.  So with a
    // duplicated option the LEFTMOST occurrence is applied last and wins.
    if (tinitial) {
        const comma = opts.indexOf(',');
        if (comma >= 0) {
            parseoptions(opts.slice(comma + 1), tinitial, result);
            opts = opts.slice(0, comma);
        }
    }
    if (opts.length > 128) return; // BUFSZ / 2

    while (opts.length && isspace(opts[0])) opts = opts.slice(1);
    while (opts.length && isspace(opts[opts.length - 1])) opts = opts.slice(0, -1);
    if (!opts) return;

    // options.c:540 — a LOOP, so "!no", "nono" and the "no-" spelling all work.
    // Note there is no re-trim afterwards, so "no legacy" does NOT parse.
    let negated = false;
    while (opts[0] === '!' || strncmpi_eq(opts, 'no', 2)) {
        opts = opts.slice(opts[0] === '!' ? 1 : (opts[2] !== '-') ? 2 : 3);
        negated = !negated;
    }

    let optlen = opts.length;
    const optlen_wo_val = length_without_val(opts, optlen);
    if (optlen_wo_val < optlen) optlen = optlen_wo_val;

    let matchidx = -1, got_match = false;
    for (let i = 0; i < ALLOPT.length; i++) {
        const o = ALLOPT[i];
        got_match = false;
        if (o.pfx && str_start_is(opts, o.name, true)) {
            matchidx = i;
            got_match = true;
        }
        if (!got_match) got_match = match_optname(opts, o.name, o.minmatch, true);
        if (got_match) {
            if (!o.pfx && optlen < o.minmatch) break; /* ambiguous */
            matchidx = i;
            break;
        }
    }

    // Second pass over the aliases, which must match at their full length.
    if (!got_match) {
        for (let i = 0; i < ALLOPT.length; i++) {
            const o = ALLOPT[i];
            if (!o.alias) continue;
            if (match_optname(opts, o.alias, o.alias.length, true)) {
                matchidx = i;
                got_match = true;
                break;
            }
        }
    }

    if (got_match && matchidx >= 0) {
        const o = ALLOPT[matchidx];
        if (negated && !o.negateok) return; /* bad_negation() */
        const op = string_for_opt(opts);
        if (o.typ === 'B') optfn_boolean(o, negated, opts, op, result);
        else if (o.typ === 'C') optfn_compound(o, negated, opts, op, result);
        return;
    }

    // Unmatched, but a symbol override?
    if (opts.startsWith('S_')) parseSymbols(opts, result);
}

// C ref: cfgfiles.c config_line_stmt[] — [directive name, minimum number of
// characters that must match].  Matched with match_varname(), which is just
// match_optname(..., val_allowed=TRUE): the text before the '=' or ':' must be
// a case-insensitive leading substring of the name and at least that long, so
// "BIND=" reaches BINDINGS and "SYMB=" reaches SYMBOLS.  Table order breaks ties
// (ROGUESYMBOLS is listed ahead of SYMBOLS).  The syscnf_only entries are left
// out because parse_config_line() skips them unless it is reading sysconf, and
// the USER_SOUNDS pair is absent from this build.
const CONFIG_LINE_STMT = [
    ['OPTIONS', 4], ['AUTOPICKUP_EXCEPTION', 5], ['BINDINGS', 4],
    ['AUTOCOMPLETE', 5], ['MSGTYPE', 7], ['HACKDIR', 4], ['LEVELDIR', 4],
    ['LEVELS', 4], ['SAVEDIR', 4], ['BONESDIR', 5], ['DATADIR', 4],
    ['SCOREDIR', 4], ['LOCKDIR', 4], ['CONFIGDIR', 4], ['TROUBLEDIR', 4],
    ['NAME', 4], ['ROLE', 4], ['CHARACTER', 4], ['dogname', 3], ['catname', 3],
    ['BOULDER', 3], ['MENUCOLOR', 9], ['HILITE_STATUS', 6], ['WARNINGS', 5],
    ['ROGUESYMBOLS', 4], ['SYMBOLS', 4], ['WIZKIT', 6], ['QT_TILEWIDTH', 12],
    ['QT_TILEHEIGHT', 13], ['QT_FONTSIZE', 11], ['QT_COMPACT', 10],
];

// C ref: hacklib.c mungspaces() — tab to space, runs of spaces to one,
// leading/trailing space dropped; a newline ends the string.
function mungspaces(bp) {
    let out = '', was_space = true;
    for (let i = 0; i < bp.length; i++) {
        let c = bp[i];
        if (c === '\n') break;
        if (c === '\t') c = ' ';
        if (c !== ' ' || !was_space) out += c;
        was_space = (c === ' ');
    }
    if (was_space && out.length) out = out.slice(0, -1);
    return out;
}

// C ref: cfgfiles.c find_optparam() — index of the first '=' or ':'.
function find_optparam(buf) {
    let bufp = buf.indexOf('=');
    const altp = buf.indexOf(':');
    if (bufp < 0 || (altp >= 0 && altp < bufp)) bufp = altp;
    return bufp;
}

// C ref: cfgfiles.c parse_config_line().
function parse_config_line(origbuf, result) {
    while (origbuf[0] === ' ' || origbuf[0] === '\t') origbuf = origbuf.slice(1);
    const buf = mungspaces(origbuf);
    const sep = find_optparam(buf);
    if (sep < 0) return; /* "Not a config statement, missing '='" */
    let bufp = buf.slice(sep + 1);
    if (bufp[0] === ' ') bufp = bufp.slice(1);

    for (const [nm, len] of CONFIG_LINE_STMT) {
        if (!match_optname(buf, nm, len, true)) continue;
        switch (nm) {
        // config_line_stmt[].origbuf is TRUE only for OPTIONS, so
        // cnf_line_OPTIONS() re-finds the separator in the UNMUNGED line and
        // hands the rest to parseoptions() (which does its own space handling).
        case 'OPTIONS': parseoptions(origbuf.slice(find_optparam(origbuf) + 1), true, result); return;
        // C ref: cfgfiles.c cnf_line_AUTOPICKUP_EXCEPTION().
        case 'AUTOPICKUP_EXCEPTION': add_autopickup_exception(bufp, result); return;
        case 'BINDINGS': parseBindings(bufp, result); return;
        case 'SYMBOLS': parseSymbols(bufp, result); return;
        case 'NAME': result.name = bufp.slice(0, 31); return; // PL_NSIZ - 1
        case 'ROLE': case 'CHARACTER': result.role = bufp; return;
        case 'dogname': case 'catname': result.flags[nm] = bufp; return;
        // C ref: cnf_line_BOULDER() — get_uchars() into ov_primary_syms[].
        case 'BOULDER': result.symoverride.S_boulder = symVal(bufp); return;
        // ROGUESYMBOLS targets ROGUESET, which display.js does not model; the
        // rest are directories / 'O'-menu editors with no effect on a screen.
        default: return;
        }
    }
}

export function parseNethackrc(rc) {
    const result = {
        name: '', role: -1, race: -1, gender: -1, align: -1,
        flags: {}, iflags: {}, keybind: {}, symoverride: {}, apelist: [],
    };
    if (!rc) return result;

    config_error_init('');
    // C ref: cfgfiles.c read_config_file() — leading whitespace is skipped and
    // blank / '#' comment lines never reach parse_config_line().  But
    // config_error_nextline() runs for EVERY physical line, so the line number
    // an error reports counts blanks and comments too.
    for (const rawLine of rc.split('\n')) {
        config_error_nextline(rawLine.replace(/[ \t\r]+$/, ''));
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        parse_config_line(line, result);
    }
    config_error_done(result);
    return result;
}
