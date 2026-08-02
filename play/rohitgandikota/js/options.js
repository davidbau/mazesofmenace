// options.js — .nethackrc option parsing.
// C ref: src/options.c. The option table itself is generated from
// include/optlist.h into js/optlist.js by tools/gen-optlist.mjs.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { more, TOPLINE_NEED_MORE } from './display.js';
import {
    NHW_MENU, ATR_NONE, ATR_INVERSE,
    tty_create_nhwindow, tty_destroy_nhwindow, tty_start_menu, tty_add_menu,
    tty_add_menu_str, tty_end_menu, tty_display_nhwindow, tty_select_menu,
} from './tty/wintty.js';
import {
    MENU_ITEMFLAGS_NONE, MENU_BEHAVE_STANDARD, PICK_ONE, ECMD_OK,
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

/* The get_val arm of each compound/other option that reaches the simple
   menu. C dispatches through allopt[i].optfn; the table's `optfn` column is
   not carried into js/optlist.js, so the dispatch is by name here. Anything
   without an arm reports "unknown", which is what C prints when an option
   function returns anything but optn_ok. */
function get_option_value(o) {
    switch (o.name) {
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
                /* boolean option */
                parseoptions(`${bool_optval(allopt[k]) ? '!' : ''}${
                                 allopt[k].name}`, false, false, game.rc);
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
        note_unported_options('doset_simple:menu_requested->doset');
        return ECMD_OK;
    }

    /* select and change one option at a time, then reprocess the menu
       with updated settings to offer chance for further change */
    do {
        pickedone = await doset_simple_menu();
        /* go.opt_need_redraw drives reset_needed_visuals()+flush_screen(1);
           nothing ported sets it, and the flush-model audit this port still
           owes C is the blocker for adding it (see docs/plan/NOTES.md). */
    } while (pickedone > 0);
    return ECMD_OK;
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
