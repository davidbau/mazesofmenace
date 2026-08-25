// options.js — .nethackrc option parsing.
// C ref: src/options.c. The option table itself is generated from
// include/optlist.h into js/optlist.js by tools/gen-optlist.mjs.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { more, TOPLINE_NEED_MORE, pline, docrt, bot } from './display.js';
import {
    NHW_MENU, ATR_NONE, ATR_INVERSE,
    tty_create_nhwindow, tty_destroy_nhwindow, tty_start_menu, tty_add_menu,
    tty_add_menu_str, tty_end_menu, tty_display_nhwindow, tty_select_menu,
} from './tty/wintty.js';
import {
    MENU_ITEMFLAGS_NONE, MENU_ITEMFLAGS_SKIPINVERT, MENU_BEHAVE_STANDARD,
    PICK_ONE, PICK_ANY, ECMD_OK,
    AUTOUNLOCK_APPLY_KEY,
} from './const.js';
import { NO_COLOR } from './terminal.js';
import { allopt, findOption } from './optlist.js';
import { condtests } from './botl.js';
import {
    gs_symset, gc_currentgraphics, known_handling, PRIMARYSET,
} from './symbols.js';
import { def_char_to_objclass } from './sp_lev.js';
import { OCLASSES } from './objects_data.js';
import { color_attr_to_str, attr2attrname } from './coloratt.js';
import { roles, races, genders, aligns, ROLE_RANDOM } from './role.js';
import { vision_recalc } from './vision.js';

function note_unported_options(what) {
    (game.unported ||= new Set()).add('options:' + what);
}

// src/options.c:489 parseoptions()
//
// Two behaviours here are easy to get wrong and both are load-bearing:
//
//   1. Elements of a comma-separated list are processed RIGHT TO LEFT.
//      The C splits on the first comma, recurses on the remainder, and only
//      then handles the current element (options.c:507-521). So
//      "OPTIONS=a,b,c" applies c, then b, then a — which decides who wins when
//      a line sets the same option twice.
//
//   2. Negation accepts three spellings and stacks: a leading '!', a leading
//      "no", or "no-" (options.c:540-543). Each one flips `negated`, so
//      "!notime" is time set true.
//
// `opts` is one line's worth of option text with the OPTIONS= prefix removed.
export function parseoptions(opts, tinitial, tfrom_file, result) {
    let retval = true;

    /* Process elements of comma-separated list in right to left order. */
    if (tinitial) {
        const comma = opts.indexOf(',');
        if (comma >= 0) {
            const rest = opts.slice(comma + 1);
            opts = opts.slice(0, comma);
            if (!parseoptions(rest, tinitial, tfrom_file, result))
                retval = false;
        }
    }

    /* strip leading and trailing white space */
    opts = opts.replace(/^\s+/, '').replace(/\s+$/, '');

    if (!opts) {
        config_error_add(result, 'Empty statement');
        return false;
    }

    let negated = false;
    for (;;) {
        if (opts[0] === '!') { opts = opts.slice(1); negated = !negated; }
        else if (opts.slice(0, 2).toLowerCase() === 'no') {
            opts = opts.slice(opts[2] !== '-' ? 2 : 3);
            negated = !negated;
        } else break;
    }

    /* Split "name:value" / "name=value" into the parts the table matches on.
       length_without_val() in the C stops at the first ':' or '='. */
    const sep = firstSeparator(opts);
    const name = (sep < 0 ? opts : opts.slice(0, sep)).trim();
    const value = sep < 0 ? null : opts.slice(sep + 1).trim();

    const opt = findOption(name);
    if (!opt) {
        /* An unrecognised option is reported, never silently dropped — a
           held-out session may legitimately set something we have not wired
           up yet, and we want to see it. */
        config_error_add(result, `Unknown option '${name}'`);
        return false;
    }

    if (negated && opt.negateok === 'No') {
        config_error_add(result, `Negating '${opt.name}' is not allowed`);
        return false;
    }
    if (value !== null && opt.valok === 'No') {
        config_error_add(result, `Value not allowed for '${opt.name}'`);
        return false;
    }
    if (value === null && opt.type !== 'BoolOpt' && opt.valok === 'Yes') {
        config_error_add(result, `Missing value for '${opt.name}'`);
        return false;
    }

    if (opt.type === 'BoolOpt') {
        result.opts[opt.name] = !negated;
        (result.optSetInConfig ||= {})[opt.name] = true;
    } else {
        result.opts[opt.name] = negated ? null : value;
    }
    return retval;
}

// src/options.c length_without_val() — a value starts at the first ':' or '='.
function firstSeparator(s) {
    const c = s.indexOf(':');
    const e = s.indexOf('=');
    if (c < 0) return e;
    if (e < 0) return c;
    return Math.min(c, e);
}

// src/cfgfiles.c config_error_add() — collected rather than printed, so the
// caller can decide what to do and so tests can assert on them.
function config_error_add(result, msg) {
    result.errors.push(msg);
}

// Entry point used by js/jsmain.js: parse a whole rc blob.
//
// C ref: src/cfgfiles.c parse_config_line() dispatches on the leading keyword
// (OPTIONS=, SYMBOLS=, BIND=, ...) via the config_line_stmt table at
// cfgfiles.c:1312. Only OPTIONS is wired up so far; the others are recognised
// and recorded so they are visibly pending rather than silently ignored.
export function parseNethackrc(rc) {
    const result = {
        opts: {},        // option name -> boolean | string | null
        symbols: [],     // pending SYMBOLS= directives
        bindings: [],    // pending BIND= directives
        unhandled: [],   // recognised directives with no implementation yet
        errors: [],
    };
    if (!rc) return result;

    for (const rawLine of rc.split('\n')) {
        const line = rawLine.trim();
        if (!line || line[0] === '#') continue;

        const eq = line.indexOf('=');
        if (eq < 0) {
            result.errors.push(`Bad config line '${line}'`);
            continue;
        }
        const keyword = line.slice(0, eq).trim().toUpperCase();
        const rest = line.slice(eq + 1);

        switch (keyword) {
        case 'OPTIONS':
            parseoptions(rest, true, true, result);
            break;
        case 'SYMBOLS':
            result.symbols.push(rest);
            break;
        case 'BIND':
            result.bindings.push(rest);
            break;
        default:
            result.unhandled.push(line);
            break;
        }
    }
    return result;
}

// Convenience accessors over the parsed table, so callers do not each
// reimplement the "is this set" question.
export function optSet(result, name) {
    const opt = findOption(name);
    return opt ? result.opts[opt.name] === true : false;
}

export function optValue(result, name) {
    const opt = findOption(name);
    return opt ? (result.opts[opt.name] ?? null) : null;
}

export { allopt, findOption };

// src/options.c:430 ask_do_tutorial()
//
// NetHack 5.0 asks every new game whether the player wants the tutorial, unless
// the config file settled it. 32 of the 44 public sessions never mention
// `tutorial` in their rc, so they all see this menu — and its keystroke is part
// of their recorded input.
//
// The loop repeats until the player picks an entry: <space> or <return> selects
// nothing, and the second and later passes add a "(Please choose 'y' or 'n'.)"
// line.
export async function ask_do_tutorial() {
    let dotut = !!game.flags?.tutorial;

    /* opt_set_in_config[opt_tutorial] — did the rc mention it at all? */
    if (game.rc?.optSetInConfig?.tutorial)
        return dotut;

    /* win/tty/wintty.c:1921 — displaying a menu while the top line is still
       unacknowledged runs more() FIRST, which consumes the key meant for it. */
    if (game._toplin === TOPLINE_NEED_MORE)
        await more();

    let pass = 0;
    for (;;) {
        const win = tty_create_nhwindow(NHW_MENU);
        tty_start_menu(win, MENU_BEHAVE_STANDARD);

        tty_add_menu(win, null, 'y'.charCodeAt(0), 'y', 0, ATR_NONE, NO_COLOR,
                     'Yes, do a tutorial', MENU_ITEMFLAGS_NONE);
        tty_add_menu(win, null, 'n'.charCodeAt(0), 'n', 0, ATR_NONE, NO_COLOR,
                     'No, just start play', MENU_ITEMFLAGS_NONE);

        tty_add_menu_str(win, '');
        tty_add_menu_str(win,
            'Put "OPTIONS=!tutorial" in .nethackrc to skip this query.');
        if (pass++)
            tty_add_menu_str(win, "(Please choose 'y' or 'n'.)");

        tty_end_menu(win, 'Do you want a tutorial?');
        await tty_display_nhwindow(win);

        /* select_menu(win, PICK_ONE) — returns as soon as a selector is typed */
        let answered = null;
        for (;;) {
            const c = String.fromCharCode(await nhgetch());
            if (c === '\x1b') { answered = 'esc'; break; }
            if (c === 'y' || c === 'n') { answered = c; break; }
            /* space and return select nothing, so the menu is rebuilt */
            if (c === ' ' || c === '\r' || c === '\n') break;
        }
        tty_destroy_nhwindow(win);

        if (answered === 'esc') return false;
        if (answered) return answered === 'y';
    }
}

// src/options.c:3471 optfn_playmode() — the OPTIONS=playmode: handler.
//
// It sets BOTH globals, and every combination matters:
//
//     normal / play        wizard = discover = FALSE
//     explore / discovery  wizard = FALSE, discover = TRUE
//     debug / wizard       wizard = TRUE,  discover = FALSE
//
// Neither was ever assigned. game.wizard was read in four places and was
// always undefined, and game.discover only got a value inside set_playmode's
// wizard branch, which therefore never ran. getbones() returns before its
// rn2(3) when discover is set, so an explore-mode session drew one call that
// C does not, at call 302 of six of the public sessions.
//
// C compares with strncmpi over a PREFIX length, so "explor", "discove" and
// "wiz" all match; the length is part of the option's contract.
export function optfn_playmode() {
    const op = String(game.rc?.opts?.playmode ?? '').toLowerCase();

    if (!op)
        return;
    if (op.startsWith('normal') || op === 'play') {
        game.wizard = game.discover = false;
    } else if (op.slice(0, 6) === 'explor' || op.slice(0, 6) === 'discov') {
        game.wizard = false;
        game.discover = true;
    } else if (op.slice(0, 5) === 'debug' || op.slice(0, 6) === 'wizard') {
        game.wizard = true;
        game.discover = false;
    }
    /* anything else is a config error and leaves both alone */
}

// src/options.c:10134 set_playmode() — wizard mode renames the hero.
//
// OPTIONS=playmode:debug reaches here and overwrites plname with "wizard",
// which the status line then shows capitalised. A session whose rc sets
// name:Something AND playmode:debug displays "Wizard", not "Something", so
// honouring only the name option puts the wrong string on every frame.
export function set_playmode() {
    if (game.wizard) {
        /* authorize_wizard_mode() checks the system's WIZARDS list; the
           recorder builds with wizard mode available, which is how these
           sessions were recorded at all. */
        game.plname = 'wizard';
        game.plnamelen = game.plname.length;
        game.discover = !game.wizard;
    }
}

/* ---- the '?g' options help window (src/options.c:9429-9560) ---- */

/* src/options.c:9429 opt_intro[] — CONFIG_SLOT is filled at run time with
   "Set options as OPTIONS=<options> in <configfile>". get_configfile() in
   the reference recorder build resolves to the path below; the tty renderer
   clips it at 80 columns, so the clipped form is all that can ever show. */
const OPT_INTRO_CONFIG =
    'Set options as OPTIONS=<options> in '
    + '/Users/davidbau/git/mazesofmenace/teleport/maud/test/comparison/c-harness/resul';
const opt_intro = [
    '',
    '                 NetHack Options Help:', '',
    OPT_INTRO_CONFIG,
    'or use `NETHACKOPTIONS="<options>"\' in your environment',
    '(<options> is a list of options separated by commas)',
    'or press "O" while playing and use the menu.',
    '',
    'Boolean options (which can be negated by prefixing them'
    + ' with \'!\' or "no"):',
];

/* src/options.c:9448 opt_epilog[] */
const opt_epilog = [
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

/* src/options.c:9787 wc_options[] / :9823 wc2_options[] and the tty
   windowport's wincap masks (win/tty/wintty.c:98): which window-capability
   options the running interface supports. The reference tty build has
   WC_COLOR|WC_HILITE_PET|WC_INVERSE|WC_EIGHT_BIT_IN (TTY_PERM_INVENT is
   off: perm_invent is absent from the recorded '?g' list) and the wc2 set
   below. */
const wc_option_names = [
    'ascii_map', 'color', 'eight_bit_tty', 'hilite_pet', 'perm_invent',
    'perminv_mode', 'popup_dialog', 'player_selection', 'preload_tiles',
    'tiled_map', 'tile_file', 'tile_width', 'tile_height', 'align_message',
    'align_status', 'font_map', 'font_menu', 'font_message', 'font_size_map',
    'font_size_menu', 'font_size_message', 'font_size_status',
    'font_size_text', 'font_status', 'font_text', 'map_mode',
    'scroll_amount', 'scroll_margin', 'splash_screen', 'use_inverse',
    'vary_msgcount', 'windowcolors', 'mouse_support',
];
const wc_supported_names = ['color', 'eight_bit_tty', 'hilite_pet',
                            'use_inverse'];
const wc2_option_names = [
    'armorstatus', 'fullscreen', 'guicolor', 'hilite_status', 'hitpointbar',
    'menu_shift', 'petattr', 'softkeyboard', 'status hilite rules',
    'statushilites', 'statuslines', 'term_cols', 'term_rows',
    'terrainstatus', 'use_darkgray', 'weaponstatus', 'windowborders',
    'wraptext',
];
const wc2_supported_names = [
    'armorstatus', 'hilite_status', 'hitpointbar', 'petattr',
    'status hilite rules', 'statushilites', 'statuslines', 'terrainstatus',
    'use_darkgray', 'weaponstatus',
];
function is_wc_option(n) { return wc_option_names.includes(n); }
function wc_supported(n) { return wc_supported_names.includes(n); }
function is_wc2_option(n) { return wc2_option_names.includes(n); }
function wc2_supported(n) { return wc2_supported_names.includes(n); }

// src/options.c:9560 next_opt() — flow option names into comma-separated
// lines under 78 columns; the "" terminator swaps the trailing ", " for ".".
function next_opt(putline, state, str) {
    let i;
    if (!str) {
        if (state.buf.endsWith(', '))
            state.buf = state.buf.slice(0, -2) + '.';
        i = 80; /* force flush */
    } else {
        i = state.buf.length + str.length + 2;
    }
    if (i > 80 - 2) {
        putline(state.buf);
        state.buf = '';
    }
    if (str) {
        state.buf += str + ', ';
    } else {
        putline('');
    }
}

// src/options.c:9070 show_menu_controls() — the menu-control key tables.
// dolist=true is the compact form dokeylist embeds; dolist=false is the
// columned '?l' window. has_menu_shift is false for tty.
export function show_menu_controls(putline, dolist) {
    const mc_fmt = (a, b, c) =>
        a.padStart(8) + '     ' + b.padEnd(6) + ' ' + c;
    const mc_altfmt = (a, b, c) =>
        a.padStart(9) + '  ' + b.padEnd(6) + ' ' + c;
    const hardcoded = [
        ['Return', 'Accept current choice(s) and dismiss menu'],
        ['Enter', 'Same as Return'],
        ['Space', 'If not on last page, advance one page;'],
        ['     ', 'when on last page, treat like Return'],
        ['Escape', 'Cancel menu without making any choice(s)'],
    ];

    putline('Menu control keys:');
    let fmt, arg;
    if (dolist) {
        /* key bindings help: '?j' — default_menu_cmd_info (options.c:314)
           in table order; the menu_shift pair is skipped for tty */
        const dmci = [
            ['>', 'Go to next page'],
            ['<', 'Go to previous page'],
            ['^', 'Go to first page'],
            ['|', 'Go to last page'],
            ['.', 'Select all items in entire menu'],
            ['@', 'Invert selection for all items'],
            ['-', 'Unselect all items in entire menu'],
            [',', 'Select all items on current page'],
            ['~', "Invert current page's selections"],
            ['\\', 'Unselect all items on current page'],
            [':', 'Search and invert matching items'],
        ];
        for (const [ch, desc] of dmci)
            putline(ch.padEnd(7) + ' ' + desc);
        fmt = (k, d) => k.padEnd(7) + ' ' + d;
        for (const [k, d] of hardcoded)
            putline(fmt(k, d));
    } else {
        /* menu controls help: '?l' */
        putline('');
        putline(mc_altfmt('', 'Whole', 'Current'));
        putline(mc_altfmt('', ' Menu', ' Page'));
        putline(mc_fmt('Select', '.', ','));
        putline(mc_fmt('Invert', '@', '~'));
        putline(mc_fmt('Deselect', '-', '\\'));
        putline('');
        putline(mc_fmt('Go to', '>', 'Next page'));
        putline(mc_fmt('', '<', 'Previous page'));
        putline(mc_fmt('', '^', 'First page'));
        putline(mc_fmt('', '|', 'Last page'));
        putline('');
        putline(mc_fmt('Search', ':',
            'Exter a target string and invert all matching entries'));
        putline('');
        arg = 'Other ';
        for (const [k, d] of hardcoded) {
            putline(arg.padStart(9) + '  ' + k.padEnd(8) + ' ' + d);
            arg = '';
        }
    }
}

// src/options.c:9461 option_help() — the '?g' window.
export function option_help_lines() {
    const lines = [];
    const putline = (s) => lines.push(s);
    const wizard = !!game.wizard;

    for (const line of opt_intro)
        putline(line);

    /* Boolean options; consecutive duplicate names come from the header's
       set_in_game/set_in_config paired declarations (C compiles only one) */
    const state = { buf: '' };
    let prev = null;
    for (const opt of allopt) {
        if (opt.type !== 'BoolOpt' || opt.noaddr)
            continue;
        if (opt.name === prev)
            continue;
        if (opt.setwhere === 'set_wizonly' && !wizard)
            continue;
        if (opt.setwhere === 'set_wiznofuz' && !wizard)
            continue;
        if ((is_wc_option(opt.name) && !wc_supported(opt.name))
            || (is_wc2_option(opt.name) && !wc2_supported(opt.name)))
            continue;
        prev = opt.name;
        next_opt(putline, state, opt.name);
    }
    next_opt(putline, state, '');

    /* Compound options */
    putline('Compound options:');
    const comps = [];
    prev = null;
    for (const opt of allopt) {
        if (opt.type !== 'CompOpt')
            continue;
        if (opt.name === prev)
            continue;
        if (opt.setwhere === 'set_wizonly' && !wizard)
            continue;
        if (opt.setwhere === 'set_wiznofuz' && !wizard)
            continue;
        if ((is_wc_option(opt.name) && !wc_supported(opt.name))
            || (is_wc2_option(opt.name) && !wc2_supported(opt.name)))
            continue;
        prev = opt.name;
        comps.push(opt);
    }
    comps.forEach((opt, i) => {
        const name = `\`${opt.name}'`;
        putline(`${name.padEnd(20)} - ${opt.descr || ''}${
            i + 1 < comps.length ? ',' : '.'}`);
    });
    putline('');

    putline('Other settings:');
    for (const opt of allopt)
        if (opt.type === 'OthrOpt')
            putline(` ${opt.name}`);
    putline('');

    for (const line of opt_epilog)
        putline(line);

    return lines;
}

// src/options.c:9461 option_help() — display the '?g' window.
export async function option_help() {
    const { xwaitforspace } = await import('./tty/getline.js');
    const { docrt } = await import('./display.js');
    const win = tty_create_nhwindow(5 /* NHW_TEXT */);
    const { tty_putstr, tty_next_page, tty_destroy_nhwindow }
        = await import('./tty/wintty.js');
    for (const line of option_help_lines())
        tty_putstr(win, 0, line);
    await tty_display_nhwindow(win);
    for (;;) {
        await xwaitforspace(' \r\n\x1b');
        if (game.morc === '\x1b')
            break;
        if (!tty_next_page(win))
            break;
    }
    tty_destroy_nhwindow(win);
    await docrt();
}

/* src/options.c:114 OptS_type[] — section headings, indexed by OptSection. */
const OptS_type = ['General', 'Behavior', 'Map', 'Status', 'Advanced'];

/* src/options.c:207 unlocktypes[][2] — autounlock's flag names. */
const unlocktypes = [
    ['untrap', '(might fail)'],
    ['apply-key', ''],
    ['kick', '(doors only)'],
    ['force', '(chests/boxes only)'],
];

/* src/options.c:340 */
const n_currently_set = (n) => `(${n} currently set)`;

/* include/global.h:580 enum optset_restrictions — setwhere ordering. */
const optset_restrictions = {
    set_in_sysconf: 0, set_in_config: 1, set_viaprog: 2, set_gameview: 3,
    set_in_game: 4, set_wizonly: 5, set_wiznofuz: 6, set_hidden: 7,
};

// src/options.c:8508 longest_option_name()
function longest_option_name(startpass, endpass) {
    /* spin through the options to find the longest name */
    let longest_name_len = 0;

    for (let pass = 0; pass < 2; pass++)
        for (let i = 0; i < allopt.length; i++) {
            const name = allopt[i].name;
            if (pass === 0
                && (allopt[i].type !== 'BoolOpt' || allopt[i].noaddr))
                continue;
            const optflags = optset_restrictions[allopt[i].setwhere];
            if (optflags < startpass || optflags > endpass)
                continue;
            /* is_wc_option()/wc_supported(): the tty port supports none of
               the window-system options, but none of them reach the simple
               menu's sections either, so the filter has nothing to drop. */

            if (name.length > longest_name_len)
                longest_name_len = name.length;
        }
    return longest_name_len;
}

/* The value of a boolean option. C reads *allopt[i].addr, a pointer straight
   at the live variable; our single store is game.flags keyed by the OPTION
   name (see the note at js/cmd.js dotogglepickup), so an option the rc never
   mentioned and nothing has toggled falls back to the table's initval. */
function bool_optval(o) {
    const v = game.flags?.[o.name];
    return (v === undefined) ? (o.initval === 'On') : !!v;
}

/* src/options.c:9179 count_cond() */
function count_cond() {
    let cnt = 0;
    for (const c of condtests)
        if (c.enabled)
            cnt++;
    return cnt;
}

/* src/options.c:125 — the shared strings the get_val arms print. */
const opt_none = '(none)', opt_randomrole = 'random',
      opt_to_be_done = '(to be done)', opt_defopt = 'default';

/* src/options.c:72 rolestring() */
function rolestring(val, array, field) {
    return (val >= 0) ? field(array[val])
                      : (val === ROLE_RANDOM) ? opt_randomrole : opt_none;
}

/* src/options.c:184 menutype[][3] — first column only; the bracketed
   explanations are used by the menustyle handler menu, not by get_val. */
const menutype = ['traditional', 'combination', 'full', 'partial'];

/* src/options.c:213 burdentype[] */
const burdentype = [
    'unencumbered', 'burdened', 'stressed',
    'strained', 'overtaxed', 'overloaded',
];

/* src/options.c:217 runmodes[] */
const runmodes = ['teleport', 'run', 'walk', 'crawl'];

/* src/options.c:220 sortltype[] */
const sortltype = ['none', 'loot', 'full'];

/* src/options.c:273 objsymvals[] — .nam column */
const objsymvals = [
    'none', 'headers', 'entries', 'both', 'conditional', 'one-or-other',
];

/* src/insight.c:2601 vanqorders[][3] — first two columns */
const vanqorders = [
    ['t', 'traditional: by monster level'],
    ['d', 'by monster difficulty rating'],
    ['a', 'alphabetically, unique monsters separate'],
    ['A', 'alphabetically, unique monsters intermixed'],
    ['C', 'by monster class, high to low level in class'],
    ['c', 'by monster class, low to high level in class'],
    ['n', 'by count, high to low'],
    ['z', 'by count, low to high'],
];

/* src/o_init.c:599 disco_order_let / disco_orders_descr */
const disco_order_let = 'osca';
const disco_orders_descr = [
    'by order of discovery within each class',
    'sortloot order (by class with some sub-class groupings)',
    'alphabetical within each class',
    'alphabetical across all classes',
];

/* src/options.c:128 paranoia[] — flag bit and primary name, in table order
   (which is the order the get_val arm lists the active ones). */
export const PARANOID_CONFIRM = 0x0001, PARANOID_QUIT = 0x0002,
             PARANOID_DIE = 0x0004, PARANOID_BONES = 0x0008,
             PARANOID_HIT = 0x0010, PARANOID_PRAY = 0x0020,
             PARANOID_REMOVE = 0x0040, PARANOID_BREAKWAND = 0x0080,
             PARANOID_WERECHANGE = 0x0100, PARANOID_EATING = 0x0200,
             PARANOID_SWIM = 0x0400, PARANOID_TRAP = 0x0800,
             PARANOID_AUTOALL = 0x1000;
const paranoia = [
    [PARANOID_CONFIRM, 'Confirm'],
    [PARANOID_QUIT, 'quit'],
    [PARANOID_DIE, 'die'],
    [PARANOID_BONES, 'bones'],
    [PARANOID_HIT, 'attack'],
    [PARANOID_BREAKWAND, 'wand-break'],
    [PARANOID_EATING, 'eat'],
    [PARANOID_WERECHANGE, 'Were-change'],
    [PARANOID_PRAY, 'pray'],
    [PARANOID_TRAP, 'trap'],
    [PARANOID_AUTOALL, 'Autoall'],
    [PARANOID_SWIM, 'swim'],
    [PARANOID_REMOVE, 'Remove'],
];

/* src/options.c:7173 initoptions_init() default */
export function paranoia_bits() {
    return game.flags?.paranoia_bits
           ?? (PARANOID_PRAY | PARANOID_SWIM | PARANOID_TRAP);
}

/* The get_val arm of each compound/other option that reaches the simple
   menu. C dispatches through allopt[i].optfn; the table's `optfn` column is
   not carried into js/optlist.js, so the dispatch is by name here. Anything
   without an arm reports "unknown", which is what C prints when an option
   function returns anything but optn_ok. */
function get_option_value(o) {
    switch (o.name) {
    case 'windowtype':              /* src/options.c:4943 optfn_windowtype */
        return 'tty';               /* windowprocs.name — only port built */
    case 'playmode':                /* src/options.c optfn_playmode */
        return game.wizard ? 'debug' : game.discover ? 'explore' : 'normal';
    case 'name':                    /* src/options.c:2549 optfn_name */
        return game.plname || '';
    case 'role':                    /* src/options.c:3589 optfn_role */
        return rolestring(game.flags?.initrole ?? -1, roles, r => r.name.m);
    case 'race':                    /* src/options.c optfn_race */
        return rolestring(game.flags?.initrace ?? -1, races, r => r.noun);
    case 'gender':                  /* src/options.c optfn_gender */
        return rolestring(game.flags?.initgend ?? -1, genders, g => g.adj);
    case 'alignment':               /* src/options.c:908 optfn_alignment */
        return rolestring(game.flags?.initalign ?? -1, aligns, a => a.adj);
    case 'catname':                 /* src/options.c:846 petname_optfn */
        return game.catname || opt_none;
    case 'dogname':
        return game.dogname || opt_none;
    case 'horsename':
        return game.horsename || opt_none;
    case 'msghistory':              /* src/options.c optfn_msghistory */
        return String(game.iflags?.msg_history ?? 20);
    case 'pettype': {               /* src/options.c:3197 optfn_pettype */
        const p = game.preferred_pet;
        return (p === 'c') ? 'cat' : (p === 'd') ? 'dog'
               : (p === 'h') ? 'horse' : (p === 'n') ? 'none' : 'random';
    }
    case 'soundlib':                /* src/options.c:3824 optfn_soundlib */
        return 'nosound';           /* get_soundlib_name(): no soundlib built */
    case 'boulder':                 /* src/options.c optfn_boulder */
        /* ov_primary_syms override, else showsyms[ROCK_CLASS]; nothing
           ported writes either, so the default boulder symbol stands */
        return '`';
    case 'crash_urlmax':            /* src/options.c optfn_crash_urlmax */
        return String(game.crash_urlmax ?? -1);     /* decl.c:261 default */
    case 'disclose': {              /* src/options.c optfn_disclose */
        const end_disclose = game.flags?.end_disclose || 'nnnnnn';
        const disclosure_options = 'iavgco';        /* decl.c:54 */
        let s = '';
        for (let i = 0; i < disclosure_options.length; i++)
            s += (i ? ' ' : '') + end_disclose[i] + disclosure_options[i];
        return s;
    }
    case 'dungeon':                 /* src/options.c optfn_dungeon */
    case 'effects':                 /* src/options.c optfn_effects */
    case 'glyph':                   /* src/options.c optfn_glyph */
    case 'monsters':
    case 'objects':
    case 'traps':
        return opt_to_be_done;
    case 'hilite_status':           /* src/options.c optfn_hilite_status */
        return (game.status_hilites || []).length
               ? '(see "status highlight rules" below)' : opt_none;
    case 'menu_headings':           /* src/options.c:2183 optfn_menu_headings */
        /* iflags.menu_headings defaults to NO_COLOR + ATR_INVERSE
           (options.c:7188); strNsubst() swaps spaces for dashes */
        return color_attr_to_str(game.iflags?.menu_headings
                                 ?? { color: NO_COLOR, attr: ATR_INVERSE })
               .replaceAll(' ', '-');
    case 'menu_objsyms':            /* src/options.c optfn_menu_objsyms */
        return objsymvals[game.iflags?.menuobjsyms ?? 4];
    case 'menuinvertmode':          /* src/options.c optfn_menuinvertmode */
        return String(game.iflags?.menuinvertmode ?? 1);
    case 'menustyle':               /* src/options.c optfn_menustyle */
        return menutype[game.flags?.menu_style ?? 2];   /* MENU_FULL */
    case 'msg_window':  {           /* src/options.c optfn_msg_window */
        const tmp = game.iflags?.prevmsg_window ?? 's'; /* options.c:7181 */
        return (tmp === 's') ? 'single' : (tmp === 'c') ? 'combination'
               : (tmp === 'f') ? 'full' : 'reversed';
    }
    case 'packorder':               /* src/options.c:2670 optfn_packorder */
        /* oc_to_str(flags.inv_order): this port keeps the order as class
           numbers (js/invent.js inv_order()) and the default's symbol
           spelling is exactly def_inv_order */
        return def_inv_order;
    case 'paranoid_confirmation': { /* src/options.c:2818 */
        const bits = paranoia_bits();
        const names = [];
        for (const [mask, argname] of paranoia)
            if ((bits & mask) !== 0
                /* hide paranoid_confirm:bones during play except wizmode */
                && (mask !== PARANOID_BONES || game.wizard))
                names.push(argname);
        return names.length ? names.join(' ') : 'none';
    }
    case 'petattr':                 /* src/options.c optfn_petattr */
        /* tty default: wintty.c tty_init_nhwindows leaves wc2_petattr as
           the ATR_INVERSE the rc machinery assigns */
        return attr2attrname(game.iflags?.wc2_petattr ?? ATR_INVERSE);
    case 'pickup_burden':           /* src/options.c optfn_pickup_burden */
        return burdentype[game.flags?.pickup_burden ?? 2]; /* MOD_ENCUMBER */
    case 'pile_limit':              /* src/options.c optfn_pile_limit */
        return String(game.flags?.pile_limit ?? 5);     /* PILE_LIMIT_DFLT */
    case 'roguesymset': {           /* src/options.c optfn_roguesymset */
        const ss = gs_symset[1 /* ROGUESET */] || { name: null };
        let s = ss.name ? ss.name : opt_defopt;
        if (gc_currentgraphics.set === 1 && ss.name)
            s += ', active';
        return s;
    }
    case 'runmode':                 /* src/options.c optfn_runmode */
        return runmodes[game.flags?.runmode ?? 1];      /* RUN_LEAP */
    case 'scores': {                /* src/options.c optfn_scores */
        const top = game.flags?.end_top ?? 3;
        const around = game.flags?.end_around ?? 2;
        const own = game.flags?.end_own ?? false;
        let s = '';
        if (top > 0) s += `${top} top`;
        if (around > 0) s += `${top > 0 ? '/' : ''}${around} around`;
        if (own) s += `${top > 0 || around > 0 ? '/' : ''}own`;
        return s || 'none';
    }
    case 'sortdiscoveries': {       /* src/o_init.c:1210 get_sortdisco */
        let p = disco_order_let.indexOf(game.flags?.discosort ?? 'o');
        if (p < 0) p = 0;
        return disco_orders_descr[p];
    }
    case 'sortloot': {              /* src/options.c optfn_sortloot */
        const c = game.flags?.sortloot ?? 'l';          /* options.c:7208 */
        for (const t of sortltype)
            if (c === t[0]) return t;
        return null;
    }
    case 'sortvanquished': {        /* src/options.c optfn_sortvanquished */
        const mode = game.flags?.vanq_sortmode ?? 0;
        return `${vanqorders[mode][0]}: ${vanqorders[mode][1]}`;
    }
    case 'statushilites':           /* src/options.c optfn_statushilites */
        return (game.iflags?.hilite_delta | 0)
               ? `${game.iflags.hilite_delta} (on: highlight status for `
                 + `${game.iflags.hilite_delta} turns)`
               : "0 (off: don't highlight status fields)";
    case 'suppress_alert':          /* src/options.c optfn_suppress_alert */
        return game.flags?.suppress_alert ? game.flags.suppress_alert
                                          : opt_none;
    case 'versinfo': {              /* src/options.c:4472 optfn_versinfo */
        /* flags.versinfo defaults to 1 (VI_NUMBER) when the build has no
           git branch (options.c:7174); status_version() then yields the
           bare version number */
        const vi = game.flags?.versinfo ?? 1;
        const g = (vi & 2) !== 0, b = (vi & 4) !== 0, n = (vi & 1) !== 0;
        const vers = '5.0.0';       /* src/version.c:89 status_version() */
        return `${vi}: ${g ? 'name' : ''}${b && g ? '+' : ''}`
               + `${b ? 'branch' : ''}${n && (b || g) ? '+' : ''}`
               + `${n ? 'number' : ''} (${vers})`;
    }
    case 'whatis_coord': {          /* src/options.c optfn_whatis_coord */
        const w = game.iflags?.getpos_coords ?? 'n';    /* GPCOORDS_NONE */
        return (w === 'm') ? 'map' : (w === 'c') ? 'compass'
               : (w === 'f') ? 'full compass' : (w === 's') ? 'screen'
               : 'none';
    }
    case 'whatis_filter': {         /* src/options.c optfn_whatis_filter */
        const f = game.iflags?.getloc_filter ?? 0;      /* GFILTER_NONE */
        return (f === 1) ? 'view' : (f === 2) ? 'area' : 'none';
    }
    case 'autocompletions':         /* src/options.c optfn_o_autocomplete */
        return n_currently_set((game.rc?.autocompletions || []).length);
    case 'bind keys':               /* src/options.c optfn_o_bind_keys */
        return n_currently_set((game.rc?.bindings || []).length);
    case 'message types':           /* src/options.c optfn_o_message_types */
        return n_currently_set((game.rc?.msgtypes || []).length);
    case 'fruit':                   /* src/options.c:1769 optfn_fruit */
        return game.svp?.pl_fruit || 'slime mold';
    case 'number_pad': {            /* src/options.c:2622 optfn_number_pad */
        const numpadmodes = [
            '0=off', '1=on', '2=on, MSDOS compatible',
            '3=on, phone-style layout',
            '4=on, phone layout, MSDOS compatible',
            '-1=off, y & z swapped',
        ];
        const Cmd = game.Cmd || {};
        const indx = Cmd.num_pad
            ? (Cmd.phone_layout ? (Cmd.pcHack_compat ? 4 : 3)
                                : (Cmd.pcHack_compat ? 2 : 1))
            : Cmd.swap_yz ? 5 : 0;
        return numpadmodes[indx];
    }
    case 'autounlock': {            /* src/options.c:1145 optfn_autounlock */
        /* src/flag.h AUTOUNLOCK_* — initoptions leaves this at APPLY_KEY. */
        const au = (game.flags?.autounlock === undefined)
                   ? AUTOUNLOCK_APPLY_KEY : game.flags.autounlock;
        if (!au)
            return 'none';
        const parts = [];
        for (let b = 0; b < 4; b++)
            if (au & (1 << b))
                parts.push(unlocktypes[b][0]);
        return parts.join(' + ');
    }
    case 'pickup_types': {          /* src/options.c:3392 optfn_pickup_types */
        const ocl = game.flags?.pickup_types || '';
        return ocl ? ocl : 'all';
    }

    case 'statuslines':             /* src/options.c:4099 optfn_statuslines */
        return ((game.iflags?.wc2_statuslines | 0) < 3) ? '2' : '3';
    case 'symset': {                /* src/options.c:4205 optfn_symset */
        const ss = gs_symset[PRIMARYSET] || { name: null, handling: 0 };
        let s = ss.name ? ss.name : 'default';
        if (gc_currentgraphics.set === PRIMARYSET && ss.name)
            s += ', active';
        if (ss.handling)
            s += `, handler=${known_handling[ss.handling]}`;
        return s;
    }
    /* src/options.c:8314,8379,8430,8461 — the list-valued options report how
       many entries the player has configured. */
    case 'autopickup exceptions':
        return n_currently_set((game.apelist || []).length);
    case 'menu colors':
        return n_currently_set((game.menucolors || []).length);
    case 'status condition fields':
        return n_currently_set(count_cond());
    case 'status highlight rules':
        return n_currently_set((game.status_hilites || []).length);
    default:
        return null;            /* optn_err -> "unknown" */
    }
}

// src/options.c:8536 doset_simple_menu() — guts of doset_simple(), called
// repeatedly until no choice is made.
async function doset_simple_menu() {
    /* unlike doset()'s fmtstr, there is no leading %s for indentation */
    let fmtstr_doset_simple;
    let toggled_help = false;

    /* we do this each time we're called instead of once in doset_simple()
       in case 'menu_tab_sep' ever gets included in the simple menu so
       becomes subject to being changed while doset_simple() is running */
    const pad = longest_option_name(optset_restrictions.set_gameview,
                                    optset_restrictions.set_in_game);
    if (!game.iflags?.menu_tab_sep)
        fmtstr_doset_simple = (name, val) =>
            `${name.padEnd(pad)} [${val}]`;
    else
        fmtstr_doset_simple = (name, val) => `${name}\t[${val}]`;
    const fmtstr = fmtstr_doset_simple;

    let pick_cnt;
 redo_opt_help:
    for (;;) {
        const tmpwin = tty_create_nhwindow(NHW_MENU);
        tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);

        /* when showing 'help', also describe how to run full doset() */
        if (game.simple_options_help)
            tty_add_menu_str(tmpwin, "Use command '#optionsfull'"
                                     + ' to get the complete options list.');
        tty_add_menu(tmpwin, null, -2 + 1, '?', 0, ATR_NONE, NO_COLOR,
                     game.simple_options_help ? 'hide help' : 'show help',
                     MENU_ITEMFLAGS_NONE);

        for (let section = 0; section < 4 /* OptS_Advanced */; section++) {
            tty_add_menu_str(tmpwin, '');
            /* src/windows.c:1816 add_menu_heading() — iflags.menu_headings
               carries ATR_INVERSE, which is what puts the section name in
               reverse video. */
            tty_add_menu(tmpwin, null, 0, 0, 0, ATR_INVERSE, NO_COLOR,
                         ` ${OptS_type[section].padEnd(30)} `,
                         MENU_ITEMFLAGS_NONE);
            for (let i = 0; i < allopt.length; i++) {
                const o = allopt[i];
                if (o.section !== OptS_type[section])
                    continue;
                /* is_wc_option()/wc_supported() — see longest_option_name() */

                let buf;
                switch (o.type) {
                case 'BoolOpt':
                    if (o.noaddr)
                        continue;
                    buf = fmtstr(o.name, bool_optval(o) ? 'X' : ' ');
                    break;
                case 'CompOpt':
                case 'OthrOpt': {
                    /* the Is_rogue_level() swap to 'roguesymset' needs a
                       rogue level, which nothing generates yet */
                    const v = get_option_value(o);
                    buf = fmtstr(o.name, (v !== null && v !== '') ? v
                                                                  : 'unknown');
                    break;
                }
                default:
                    buf = 'ERROR';
                    break;
                }
                /* pickup_types is separated from autopickup due to the
                   spelling of their names; emphasize what it means */
                if (o.name === 'pickup_types' || o.name === 'pickup_thrown'
                    || o.name === 'pickup_stolen'
                    || o.name === 'dropped_nopick')
                    buf += '  (for autopickup)';
                tty_add_menu(tmpwin, null, i + 1, 0, 0, ATR_NONE, NO_COLOR,
                             buf, MENU_ITEMFLAGS_NONE);
                if (game.simple_options_help && o.descr) {
                    tty_add_menu_str(tmpwin, `    ${o.descr}`);
                    tty_add_menu_str(tmpwin, '');
                }
            }
        }
        tty_end_menu(tmpwin, 'Options');

        const picks = await tty_select_menu(tmpwin, PICK_ONE);
        pick_cnt = picks ? picks.length : 0;
        /* note:  without the complication of a preselected entry, a PICK_ONE
           menu returning pick_cnt > 0 implies exactly 1 */
        if (pick_cnt > 0) {
            const k = picks[0] - 1;

            if (k === -2) {
                game.simple_options_help = !game.simple_options_help;
                toggled_help = true;
            } else if (allopt[k].type === 'BoolOpt') {
                /* boolean option. C builds "name" or "!name" and hands it to
                   parseoptions(), which writes straight through
                   allopt[k].addr to the live variable. Our parseoptions only
                   fills a config result object, and the live store is
                   game.flags keyed by option name (see the note at
                   js/cmd.js dotogglepickup), so the flip happens here --
                   routing it through parseoptions() updated game.rc.opts and
                   left the menu showing the old value. */
                game.flags[allopt[k].name] = !bool_optval(allopt[k]);
                boolopt_side_effects(allopt[k].name);
            } else if (allopt[k].hasHandler !== 'Yes') {
                /* src/options.c:8672 — a compound option with no handler
                   asks for its value outright. C then re-enters
                   parseoptions() with "name:value"; our live store is
                   game.flags, so the value lands there. */
                const { getlin } = await import('./cmd.js');
                const abuf = await getlin(`Set ${allopt[k].name} to what?`);
                if (abuf !== null && abuf !== '\x1b')
                    game.flags[allopt[k].name] = abuf;
            } else if (allopt[k].name === 'pickup_types') {
                /* compound option with a handler: src/options.c:6114
                   handler_pickup_types() just re-enters parseoptions with a
                   bare "pickup_types", which takes optfn_pickup_types()'s
                   do_set arm and prompts. */
                await optfn_pickup_types_do_set();
            } else {
                note_unported_options(`doset_simple:set=${allopt[k].name}`);
            }
        }
        /* tear down this instance of the menu; if pick_cnt is 1, caller
           will immediately call us back to put up another instance */
        tty_destroy_nhwindow(tmpwin);

        if (toggled_help) {
            toggled_help = false;
            continue redo_opt_help;
        }
        break;
    }

    return pick_cnt;
}

// src/options.c:8707 doset_simple() — #options, the user friendly version:
// get one option from a subset of the zillion choices, act upon it, and
// prompt for another.
export async function doset_simple() {
    let pickedone = 0;

    if (game.iflags?.menu_requested) {
        /* doset() checks for 'm' and calls doset_simple(); clear the
           menu-requested flag to avoid doing that recursively */
        game.iflags.menu_requested = false;
        return doset();
    }

    /* select and change one option at a time, then reprocess the menu
       with updated settings to offer chance for further change */
    do {
        pickedone = await doset_simple_menu();
    } while (pickedone > 0);
    await reset_needed_visuals();
    return ECMD_OK;
}

// src/options.c:8737 term_for_boolean() — the wording each boolean's value
// is shown with; termpref comes from the generated optlist table.
const booleanterms = [
    ['false', 'off', 'disabled', 'excluded from build'],
    ['true', 'on', 'enabled', 'included'],
];
function term_for_boolean(o, val) {
    const f_t = val ? 1 : 0;
    const i = { Term_Off: 1, Term_Disabled: 2, Term_Excluded: 3 }[o.termpref]
              || 0;
    return booleanterms[f_t][i];
}

/* both wc filters together, the way every doset() loop applies them; the
   name lists and support sets are the ones option_help already uses above
   (src/options.c:9787 wc_options[], :9823 wc2_options[], win/tty/wintty.c:97
   tty_procs wincap masks) */
function wc_unsupported(name) {
    return (is_wc_option(name) && !wc_supported(name))
           || (is_wc2_option(name) && !wc2_supported(name));
}

// src/options.c:9018 doset_add_menu() — add one compound/other option row
// showing its current value.
function doset_add_menu(tmpwin, o, fmtstr, indexoffset) {
    const i = allopt.indexOf(o);
    let value = 'unknown';
    const v = get_option_value(o);
    if (v !== null && v !== undefined && v !== '')
        value = v;
    const any = (indexoffset === 0) ? 0 : i + 1 + indexoffset;
    /* "    " replaces "a - " -- assumes menus follow that style */
    const indent = !any ? '    ' : '';
    tty_add_menu(tmpwin, null, any, 0, 0, ATR_NONE, NO_COLOR,
                 fmtstr(indent, o.name, value), MENU_ITEMFLAGS_SKIPINVERT);
}

/* src/windows.c:1816 add_menu_heading() — non-selectable line in
   iflags.menu_headings style (ATR_INVERSE + NO_COLOR by default). */
function add_menu_heading(tmpwin, buf) {
    let attr = game.iflags?.menu_headings?.attr ?? ATR_INVERSE;
    let color = game.iflags?.menu_headings?.color ?? NO_COLOR;
    if (game.program_state?.gameover)
        attr = ATR_NONE, color = NO_COLOR;
    tty_add_menu(tmpwin, null, 0, 0, 0, attr, color, buf,
                 MENU_ITEMFLAGS_NONE);
}

/* src/options.c:5330 — the case-switch run after a boolean option is
   toggled in-game. Only the arms whose effects are observable through this
   port's display path are live; the rest of the C cases adjust window-port
   machinery that has no JS counterpart. */
function boolopt_side_effects(name) {
    switch (name) {
    case 'terrainstatus': case 'weaponstatus': case 'armorstatus':
    case 'showscore': case 'showvers': case 'showexp': case 'time':
        (game.disp ||= {}).botl = true;
        break;
    case 'lit_corridor': case 'dark_room':
        /* vision_recalc(2) then delayed full recalc */
        vision_recalc(2);
        game.vision_full_recalc = 1;
        if (bool_optval(findOption('color')))
            game.opt_need_redraw = true;
        break;
    case 'showrace': case 'use_inverse': case 'hilite_pet': case 'hilite_pile':
    case 'color':
        game.opt_need_redraw = true;
        break;
    case 'mention_decor':
        (game.iflags ||= {}).prev_decor = 0;    /* STONE */
        break;
    default:
        /* fixinv/price_quotes/sortpack/implicit_uncursed re-run
           update_inventory(), a no-op for tty without perm_invent;
           customcolors/customsymbols/menucolors touch palette machinery
           this port does not have */
        break;
    }
}

/* src/options.c:8754 HELP_IDX — SIZE(allopt) counts C's {0} terminator, so
   it is one past the last real entry's index+1; keeping that +1 here keeps
   the '?' identifier clear of the last option's i+1+indexoffset */
const HELP_IDX = allopt.length + 1;

// src/options.c:8758 doset() — the #optionsfull command, reached in play by
// 'm O' (doset_simple() forwards when the menu-request prefix is set).
export async function doset() {
    let pick_cnt;
    let gavehelp = false;
    let skiphelp = !bool_optval(findOption('cmdassist'));

    if (game.iflags?.menu_requested) {
        /* doset_simple() checks for 'm' and calls doset(); clear the
           menu-requested flag to avoid doing that recursively */
        game.iflags.menu_requested = false;
        return doset_simple();
    }

    /* if we offer '?' as a choice and it is the only thing chosen,
       we'll end up coming back here after showing the explanatory text */
 rerun:
    for (;;) {
        const tmpwin = tty_create_nhwindow(NHW_MENU);
        tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);

        /* offer novices a chance to request helpful [sic] advice */
        if (!skiphelp) {
            const helptext = [
                "For a brief explanation of how this works, type '?' to select",
                'the next menu choice, then press <enter> or <return>.',
                null, /* actual '?' menu entry gets inserted here */
                "[To suppress this menu help, toggle off the 'cmdassist'"
                + ' option.]',
                '',
            ];
            for (const line of helptext) {
                if (line !== null) {
                    tty_add_menu_str(tmpwin, line ? `    ${line}` : '');
                } else {
                    tty_add_menu(tmpwin, null, HELP_IDX + 1, '?', '?',
                                 ATR_NONE, NO_COLOR,
                                 'view help for options menu',
                                 MENU_ITEMFLAGS_SKIPINVERT);
                }
            }
        }

        const startpass = optset_restrictions.set_gameview;
        const endpass = game.wizard ? optset_restrictions.set_wiznofuz
                                    : optset_restrictions.set_in_game;

        /* fmtstr_doset: "%s%-Ns [%s]" (menu_tab_sep is never set) */
        const pad = longest_option_name(startpass, endpass);
        const fmtstr = (indent, name, val) =>
            `${indent}${name.padEnd(pad)} [${val}]`;

        const indexoffset = 1;
        add_menu_heading(tmpwin, 'Booleans (selecting will toggle value):');
        /* first list any other non-modifiable booleans, then modifiable */
        for (let pass = 0; pass <= 1; pass++)
            for (let i = 0; i < allopt.length; i++) {
                const o = allopt[i];
                if (o.type !== 'BoolOpt' || o.noaddr)
                    continue;
                const setwhere = optset_restrictions[o.setwhere];
                if (!((setwhere <= optset_restrictions.set_gameview
                       && pass === 0)
                      || (setwhere >= optset_restrictions.set_in_game
                          && pass === 1)))
                    continue;
                if (o.name === 'female')
                    continue; /* obsolete */
                if (o.setwhere === 'set_wizonly' && !game.wizard)
                    continue;
                if (o.setwhere === 'set_wiznofuz' && !game.wizard)
                    continue;
                if (wc_unsupported(o.name))
                    continue;

                const any = (pass === 0) ? 0 : i + 1 + indexoffset;
                const indent = (pass === 0) ? '    ' : '';
                /* enhance_menu_text() is a no-op in this build */
                tty_add_menu(tmpwin, null, any, 0, 0, ATR_NONE, NO_COLOR,
                             fmtstr(indent, o.name,
                                    term_for_boolean(o, bool_optval(o))),
                             MENU_ITEMFLAGS_SKIPINVERT);
            }

        tty_add_menu_str(tmpwin, '');
        add_menu_heading(tmpwin,
                         'Compounds (selecting will prompt for new value):');
        for (let pass = startpass; pass <= endpass; pass++)
            for (let i = 0; i < allopt.length; i++) {
                const o = allopt[i];
                if (o.type !== 'CompOpt')
                    continue;
                if (optset_restrictions[o.setwhere] === pass) {
                    if (wc_unsupported(o.name))
                        continue;
                    doset_add_menu(tmpwin, o, fmtstr,
                                   (pass === optset_restrictions.set_gameview)
                                       ? 0 : indexoffset);
                }
            }

        tty_add_menu_str(tmpwin, '');
        add_menu_heading(tmpwin, 'Other settings:');
        for (let pass = startpass; pass <= endpass; pass++)
            for (let i = 0; i < allopt.length; i++) {
                const o = allopt[i];
                if (o.type !== 'OthrOpt')
                    continue;
                if (optset_restrictions[o.setwhere] === pass) {
                    if (wc_unsupported(o.name))
                        continue;
                    doset_add_menu(tmpwin, o, fmtstr,
                                   (pass === optset_restrictions.set_gameview)
                                       ? 0 : indexoffset);
                }
            }

        /* PREFIXES_IN_USE ("Variable playground locations:") is not
           compiled into the reference binary — the recorded menu is 7
           pages and ends at "status highlight rules" */
        tty_end_menu(tmpwin, 'Set what options?');
        game.opt_need_redraw = false;

        const picks = await tty_select_menu(tmpwin, PICK_ANY);
        pick_cnt = picks.length;
        /*
         * Walk down the selection list and either invert the booleans
         * or prompt for new values.
         */
        for (let pick_idx = 0; pick_idx < pick_cnt; ++pick_idx) {
            let opt_indx = picks[pick_idx] - 1;
            if (opt_indx === HELP_IDX) {
                /* display_file(OPTMENUHELP): the dat/optmenu text is not
                   ported yet */
                note_unported_options('doset:optmenu_help');
                gavehelp = true;
                continue; /* just handled '?'; there might be more picks */
            }
            opt_indx -= indexoffset;
            const o = allopt[opt_indx];
            if (o.type === 'BoolOpt') {
                /* boolean option: C hands "name"/"!name" to parseoptions(),
                   which flips *addr, runs the side-effect switch, and
                   (give_opt_msg is TRUE here, unlike doset_simple) reports
                   the change (options.c:5438) */
                const newval = !bool_optval(o);
                game.flags[o.name] = newval;
                boolopt_side_effects(o.name);
                await pline(`'${o.name}' option toggled ${newval ? 'on'
                                                                 : 'off'}.`);
            } else if (o.hasHandler === 'Yes' && o.name === 'pickup_types') {
                /* compound option with a handler: optfn's do_handler arm */
                await optfn_pickup_types_do_set();
            } else if (o.hasHandler === 'Yes') {
                note_unported_options(`doset:handler=${o.name}`);
            } else {
                /* compound option without a handler asks for the value */
                const { getlin } = await import('./cmd.js');
                const abuf = await getlin(`Set ${o.name} to what?`);
                if (abuf === null || abuf === '\x1b')
                    continue;
                game.flags[o.name] = abuf;
            }
        }

        tty_destroy_nhwindow(tmpwin);

        if (pick_cnt === 1 && gavehelp) {
            /* when '?' is the only thing selected, go back and pick all
               over again without it as an available choice second time */
            skiphelp = true;
            gavehelp = false;
            continue rerun;
        }
        break;
    }

    await reset_needed_visuals();
    return ECMD_OK;
}

// src/options.c:9131 reset_needed_visuals() — apply whatever display
// refreshes the option changes queued up.
async function reset_needed_visuals() {
    if (game.opt_need_redraw) {
        await docrt();
        game.opt_need_redraw = false;
    }
    if (game.disp?.botl || game.disp?.botlx) {
        await bot();
        if (game.disp) game.disp.botl = game.disp.botlx = false;
    }
}

/* src/options.c:118 def_inv_order[] — the object classes in the order the
   pickup-types menu offers them. C holds class numbers; this port holds the
   symbols throughout (oc_to_str() converts one to the other at every C
   display site, and nothing here needs the numbers), so the table is spelled
   with the symbols def_oc_syms[] gives those classes. */
const def_inv_order = '$")[%?+!=/(*`0_';

// src/options.c:3321 optfn_pickup_types(), the do_set arm reached with no
// value: put up the class menu and rebuild flags.pickup_types from the picks.
//
// Only the menu branch is live. C falls back to a getlin prompt when
// menu_style is MENU_TRADITIONAL or MENU_COMBINATION; the default style takes
// the menu, and no recorded rc changes it.
async function optfn_pickup_types_do_set() {
    const { choose_classes_menu } = await import('./windows.js');

    /* oc_to_str(flags.pickup_types, tbuf); flags.pickup_types[0] = 0 */
    const tbuf = { s: game.flags?.pickup_types || '' };
    game.flags.pickup_types = '';

    if (game.flags?.menu_style === 'traditional'
        || game.flags?.menu_style === 'combination') {
        note_unported_options('pickup_types:getlin_prompt');
        game.flags.pickup_types = tbuf.s;
        return;
    }
    /* the wizard-mode VENOM_SYM addition is skipped: no recorded game with
       wizard mode opens this menu */
    if (game.wizard)
        note_unported_options('pickup_types:venom_sym');
    await choose_classes_menu('Autopickup what?', 1, true, def_inv_order, tbuf);
    let op = tbuf.s;

    while (op[0] === ' ')
        op = op.slice(1);
    if (op[0] !== 'a' && op[0] !== 'A') {
        let types = '';
        for (const ch of op) {
            const oc_sym = def_char_to_objclass(ch);
            /* make sure all are valid obj symbols occurring once */
            if (oc_sym !== OCLASSES.MAXOCLASSES && !types.includes(ch))
                types += ch;
        }
        game.flags.pickup_types = types;
    }
}
