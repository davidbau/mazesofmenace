// options.js — .nethackrc option parsing.
// C ref: src/options.c. The option table itself is generated from
// include/optlist.h into js/optlist.js by tools/gen-optlist.mjs.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { more, TOPLINE_NEED_MORE } from './display.js';
import {
    NHW_MENU, ATR_NONE,
    tty_create_nhwindow, tty_destroy_nhwindow, tty_start_menu, tty_add_menu,
    tty_add_menu_str, tty_end_menu, tty_display_nhwindow,
} from './tty/wintty.js';
import { MENU_ITEMFLAGS_NONE, MENU_BEHAVE_STANDARD } from './const.js';
import { NO_COLOR } from './terminal.js';
import { allopt, findOption } from './optlist.js';

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
        tty_display_nhwindow(win);

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
