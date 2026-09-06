// options.js — .nethackrc option parsing.
// C ref: src/options.c. The option table itself is generated from
// include/optlist.h into js/optlist.js by tools/gen-optlist.mjs.

import { game } from './gstate.js';
import { more, TOPLINE_NEED_MORE, pline, docrt, bot } from './display.js';
import {
    NHW_MENU, ATR_NONE, ATR_INVERSE,
    tty_create_nhwindow, tty_destroy_nhwindow, tty_start_menu, tty_add_menu,
    tty_add_menu_str, tty_end_menu, tty_display_nhwindow, tty_select_menu,
} from './tty/wintty.js';
import {
    MENU_ITEMFLAGS_NONE, MENU_ITEMFLAGS_SELECTED, MENU_ITEMFLAGS_SKIPINVERT,
    MENU_BEHAVE_STANDARD,
    PICK_ONE, PICK_ANY, ECMD_OK,
    AUTOUNLOCK_APPLY_KEY, MENU_TRADITIONAL, MENU_COMBINATION,
    GPCOORDS_NONE, GPCOORDS_COMPASS, GPCOORDS_COMFULL, GPCOORDS_MAP,
    GPCOORDS_SCREEN, COLNO, ROWNO, PL_FSIZ, ismnum,
} from './const.js';
import { NO_COLOR } from './terminal.js';
import { allopt, findOption } from './optlist.js';
import { condtests } from './botl.js';
import {
    assign_graphics, gs_symset, gc_currentgraphics, known_handling,
    primary_symsets, PRIMARYSET, ROGUESET, parsesymbols, switch_symbols,
} from './symbols.js';
import { def_char_to_objclass } from './sp_lev.js';
import { OCLASSES } from './objects_data.js';
import { color_attr_to_str, attr2attrname } from './coloratt.js';
import { roles, races, genders, aligns, ROLE_RANDOM } from './role.js';
import { vision_recalc } from './vision.js';
import { reassign, update_inventory, inv_order } from './invent.js';
import { def_oc_syms } from './drawing_data.js';
import { choose_disco_sort, get_sortdisco } from './o_init.js';
import { mungspaces } from './hacklib.js';
import { fruit_from_name, makesingular, OBJ_NAME } from './objnam.js';
import { name_to_mon } from './mondata.js';
import { sanitize_name } from './bones.js';
import { rnd } from './rng.js';

function note_unported_options(what) {
    (game.unported ||= new Set()).add('options:' + what);
}

// src/options.c optfn_fruit() and initoptions_finish().
export function set_fruit_name(value, initial = false) {
    const name = mungspaces(value ?? '');
    if (initial)
        game.ffruit = null;
    let forig = null;
    if (!initial) {
        const fnum = {v: 0};
        if (!fruit_from_name(name, false, fnum)) {
            if (!game.flags.made_fruit)
                forig = fruit_from_name(game.svp.pl_fruit, false, null);
            if (!forig && fnum.v >= 100) {
                config_error_add(game.rc,
                    "Doing that so many times isn't very fruitful.");
                return game.svp.pl_fruit;
            }
        }
    }
    game.svp ||= {};
    game.svp.pl_fruit = sanitize_name(nmcpy(name, PL_FSIZ)) || 'slime mold';
    fruitadd(game.svp, forig);
    return game.svp.pl_fruit;
}

// src/options.c:6861 nmcpy(), strings return the destination contents.
function nmcpy(src, maxlen) {
    return src.split(',')[0].slice(0, maxlen - 1);
}

// src/options.c:8170 fruitadd(). Passing svp preserves pl_fruit buffer identity;
// an ordinary string represents a name from bones or an orc gang.
export function fruitadd(str, replace_fruit) {
    const user_specified = str === game.svp;
    let altname = '';
    if (user_specified) {
        game.svp.pl_fruit = nmcpy(makesingular(game.svp.pl_fruit), PL_FSIZ);
        const name = game.svp.pl_fruit;
        const globpfx = name.startsWith('small ') || name.startsWith('large ') ? 6
            : name.startsWith('medium ') ? 7 : name.startsWith('very large ') ? 11 : 0;
        let found = false, numeric = false;
        // Before init_objects(), C's food-class base is still zero.
        for (let i = game.bases?.[OCLASSES.FOOD_CLASS] || 0;
             game.objects?.[i]?.oc_class === OCLASSES.FOOD_CLASS; i++) {
            if (OBJ_NAME(game.objects[i]) === name
                || (globpfx > 0 && OBJ_NAME(game.objects[i]) === name.slice(globpfx))) {
                found = true;
                break;
            }
        }
        if (!found) {
            let c = 0;
            while (name[c] >= '0' && name[c] <= '9')
                c++;
            if (!name[c] || /[ \t\r\n\v\f]/.test(name[c]))
                numeric = true;
        }
        if (found || numeric
            || name.startsWith('cursed ') || name.startsWith('uncursed ')
            || name.startsWith('blessed ') || name.startsWith('partly eaten ')
            || (name.startsWith('tin of ')
                && (name.slice(7) === 'spinach' || ismnum(name_to_mon(name.slice(7), null))))
            || name === 'empty tin' || name === 'glob'
            || (globpfx > 0 && name.slice(globpfx) === 'glob')
            || ((name.endsWith(' corpse') || name.endsWith(' egg'))
                && ismnum(name_to_mon(name, null))))
            game.svp.pl_fruit = 'candied ' + nmcpy(name, PL_FSIZ - 8);

        game.flags.made_fruit = false;
        if (replace_fruit) {
            replace_fruit.fname = game.svp.pl_fruit.slice(0, PL_FSIZ - 1);
            game.context.current_fruit = replace_fruit.fid;
            return replace_fruit.fid;
        }
        str = game.svp.pl_fruit;
    } else {
        altname = sanitize_name(str.slice(0, PL_FSIZ - 1));
        game.flags.made_fruit = true;
    }
    const highest_fruit_id = {v: 0};
    let f = fruit_from_name(altname || str, false, highest_fruit_id);
    if (!f) {
        if (highest_fruit_id.v >= 127)
            return rnd(127);
        f = {fname: (altname || str).slice(0, PL_FSIZ - 1),
             fid: highest_fruit_id.v + 1, nextf: game.ffruit};
        game.ffruit = f;
    }
    if (user_specified)
        game.context.current_fruit = f.fid;
    return f.fid;
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
        /* src/options.c:663 — Is it a symbol? */
        if (opts.startsWith('S_') && parsesymbols(opts, PRIMARYSET)) {
            switch_symbols(true);
            /* check_gold_symbol() only re-derives the status line's gold
               symbol, which this tty model reads at display time */
            return true;
        }
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
    if (value === null && opt.type !== 'BoolOpt' && opt.valok === 'Yes'
        && opt.name !== 'packorder' && opt.name !== 'pickup_types'
        && opt.name !== 'menu_objsyms' && opt.name !== 'autounlock'
        && !(opt.name === 'menustyle' && (negated || opts.length <= 5))
        && !(opt.name === 'whatis_coord' && negated)
        && !(opt.name === 'paranoid_confirmation' && negated)) {
        config_error_add(result, `Missing value for '${opt.name}'`);
        return false;
    }

    if (opt.type === 'BoolOpt') {
        result.opts[opt.name] = !negated;
        (result.optSetInConfig ||= {})[opt.name] = true;
    } else if (opt.name === 'paranoid_confirmation') {
        const current = result.opts.paranoia_bits
                        ?? DEFAULT_PARANOIA_BITS;
        const parsed = parse_paranoia_setting(value, negated, current, result);
        result.opts.paranoia_bits = parsed.bits;
        result.opts[opt.name] = negated ? null : value;
        if (!parsed.ok)
            retval = false;
    } else if (opt.name === 'pickup_burden') {
        const burden = ({
            u: 0, b: 1, s: 2, n: 3, o: 4, t: 4, l: 5,
        })[value?.charAt(0).toLowerCase()];
        if (burden === undefined) {
            config_error_add(result, `Unknown pickup_burden parameter '${value}'`);
            return false;
        }
        result.opts[opt.name] = burden;
    } else if (opt.name === 'pickup_types') {
        // src/options.c:3321 optfn_pickup_types(), configured-value arm.
        result.opts.pickup_types = '';
        let op = sep < 0 ? '' : opts.slice(sep + 1);
        if (!op) {
            if (tinitial && opts.length > 6)
                config_error_add(result, `Missing parameter for '${opts}'`);
            result.opts.autopickup = !negated;
        } else {
            while (op[0] === ' ')
                op = op.slice(1);
            if (op[0] !== 'a' && op[0] !== 'A') {
                let badopt = false;
                for (const ch of op) {
                    const oc_sym = def_char_to_objclass(ch);
                    if (oc_sym !== OCLASSES.MAXOCLASSES
                        && !result.opts.pickup_types.includes(ch))
                        result.opts.pickup_types += ch;
                    else
                        badopt = true;
                }
                if (badopt) {
                    // C reports op after advancing it to the terminator.
                    config_error_add(result, "Unknown pickup_types parameter ''");
                    retval = false;
                }
            }
        }
    } else if (opt.name === 'autounlock') {
        // src/options.c:1066 optfn_autounlock(), do_set arm.
        if (!value) {
            result.opts.autounlock = negated ? 0 : AUTOUNLOCK_APPLY_KEY;
        } else {
            let op = value, newflags = 0;
            const separator = op.includes('+') ? '+' : ' ';
            while (op !== null) {
                op = op.trim();
                const i = op.indexOf(separator);
                const next = i < 0 ? null : op.slice(i + 1);
                if (i >= 0)
                    op = op.slice(0, i).trim();
                let matched = false;
                if ('none'.startsWith(op.toLowerCase())) {
                    negated = true;
                    matched = true;
                }
                for (const [name] of unlocktypes) {
                    if (matched) break;
                    if (name.startsWith(op.toLowerCase())
                        || op.replace(/[ _-]/g, '').toLowerCase() === name.replace(/-/g, '')) {
                        const bit = 'uakf'.indexOf(op[0]);
                        if (bit >= 0) {
                            newflags |= 1 << bit;
                            matched = true;
                        }
                    }
                }
                if (!matched) {
                    config_error_add(result, `Invalid value for "autounlock": "${op}"`);
                    return false;
                }
                op = next;
            }
            if (negated && newflags !== 0) {
                config_error_add(result, `Invalid value combination for "autounlock": 'none' with some`);
                return false;
            }
            result.opts.autounlock = newflags;
        }
    } else if (opt.name === 'menustyle') {
        // src/options.c:2320 optfn_menustyle(), do_set arm.
        const order = value ? opts.slice(sep + 1) : '';
        const c = order ? order[0].toLowerCase() : negated ? 'n' : 'f';
        const style = c === 'n' || c === 't' ? 0 : c === 'c' ? 1
            : c === 'f' ? 2 : c === 'p' ? 3 : -1;
        if (style < 0) {
            config_error_add(result, `Unknown menustyle parameter '${order}'`);
            return false;
        }
        result.opts.menu_style = style;
        result.opts.menustyle = menutype[style];
    } else if (opt.name === 'menu_objsyms') {
        // src/options.c:2225 optfn_menu_objsyms(), do_set arm.
        const op = sep < 0 ? '' : opts.slice(sep + 1);
        let osyms = 0;
        if (negated) {
            osyms = 0;
        } else if (!op) {
            osyms = opts.startsWith('use_menu_glyphs') ? 2 : 1;
        } else if (/^[0-9]/.test(op)) {
            osyms = parseInt(op, 10);
            if (osyms >= objsymvals.length) {
                config_error_add(result, `Illegal menu_objsyms parameter '${op}'`);
                return false;
            }
        } else {
            for (let i = 0; i < objsymvals.length; i++) {
                const name = objsymvals[i];
                const l = op.length >= 4 ? op.length : name.length;
                if (name.slice(0, l).toLowerCase() === op.slice(0, l).toLowerCase()
                    || (i === 5 && op.toLowerCase().startsWith('one-or-the-other'))) {
                    osyms = i;
                    break;
                }
            }
        }
        result.opts.menuobjsyms = osyms;
    } else if (opt.name === 'whatis_coord') {
        // src/options.c:4703 optfn_whatis_coord(), do_set arm.
        if (negated) {
            result.opts.getpos_coords = GPCOORDS_NONE;
        } else if (value) {
            const c = value[0].toLowerCase();
            if ('ncfms'.includes(c))
                result.opts.getpos_coords = c;
            else {
                config_error_add(result, `Unknown whatis_coord parameter '${value}'`);
                return false;
            }
        } else {
            return false;
        }
    } else if (opt.name === 'sortdiscoveries') {
        // src/options.c:3863 optfn_sortdiscoveries(), initial do_set arm.
        if (negated) {
            result.opts.discosort = 'o';
        } else if (value) {
            const order = opts.slice(sep + 1);
            const c = order[0].toLowerCase();
            const i = '0123'.indexOf(c);
            if (i >= 0 || 'osca'.includes(c))
                result.opts.discosort = i >= 0 ? 'osca'[i] : c;
            else {
                config_error_add(result, `Unknown sortdiscoveries parameter '${order}'`);
                return false;
            }
        } else {
            return false;
        }
    } else if (opt.name === 'packorder') {
        // C string_for_opt returns empty_optstr for an absent/empty value.
        if (value === null || value === '')
            return false;
        const order = opts.slice(sep + 1);
        result.opts.packorder = order;
        if (!change_inv_order(order, result))
            retval = false;
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
            /* src/cfgfiles.c:1202 cnf_line_SYMBOLS() */
            result.symbols.push(rest);
            if (!parsesymbols(rest, PRIMARYSET))
                config_error_add(result, `Error in SYMBOLS definition '${rest}'`);
            break;
        case 'ROGUESYMBOLS':
            /* src/cfgfiles.c:1191 cnf_line_ROGUESYMBOLS() */
            result.symbols.push(rest);
            if (!parsesymbols(rest, ROGUESET))
                config_error_add(result, `Error in ROGUESYMBOLS definition '${rest}'`);
            break;
        case 'BIND':
        case 'BINDI':
        case 'BINDIN':
        case 'BINDING':
        case 'BINDINGS':
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
        const selected = await tty_select_menu(win, PICK_ONE);
        tty_destroy_nhwindow(win);

        if (selected.cancelled)
            return false;
        if (selected.length)
            return selected[0] === 'y'.charCodeAt(0);
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
        (game.iflags ||= {}).deferred_X = false;
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

const iflag_boolean_options = new Set([
    'debug_hunger', 'debug_mongen', 'debug_overwrite_stairs',
]);

function bool_opt_store(name) {
    return iflag_boolean_options.has(name) ? (game.iflags ||= {})
                                           : (game.flags ||= {});
}

function set_bool_optval(name, value) {
    bool_opt_store(name)[name] = value;
}

/* The value of a boolean option. C reads *allopt[i].addr, a pointer straight
   at the live variable. Most options live in game.flags here, while the three
   wizard debug switches match C's iflags fields. */
function bool_optval(o) {
    // optlist.h stores these options in u.uroleplay; pauper also sets nudist.
    if ((o.name === 'nudist' || o.name === 'pauper') && game.u?.uroleplay)
        return !!game.u.uroleplay[o.name];
    const v = bool_opt_store(o.name)[o.name];
    return (v === undefined) ? (o.initval === 'On') : !!v;
}

export function boolean_option(name) {
    const o = findOption(name);
    return !!o && o.type === 'BoolOpt' && bool_optval(o);
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

/* src/options.c:128 paranoia[] — flag bit and primary name, in table order
   (which is the order the get_val arm lists the active ones). */
export const PARANOID_CONFIRM = 0x0001, PARANOID_QUIT = 0x0002,
             PARANOID_DIE = 0x0004, PARANOID_BONES = 0x0008,
             PARANOID_HIT = 0x0010, PARANOID_PRAY = 0x0020,
             PARANOID_REMOVE = 0x0040, PARANOID_BREAKWAND = 0x0080,
             PARANOID_WERECHANGE = 0x0100, PARANOID_EATING = 0x0200,
             PARANOID_SWIM = 0x0400, PARANOID_TRAP = 0x0800,
             PARANOID_AUTOALL = 0x1000;
const DEFAULT_PARANOIA_BITS = PARANOID_PRAY | PARANOID_SWIM | PARANOID_TRAP;
const ALL_PARANOIA_BITS = PARANOID_CONFIRM | PARANOID_QUIT | PARANOID_DIE
    | PARANOID_BONES | PARANOID_HIT | PARANOID_PRAY | PARANOID_REMOVE
    | PARANOID_BREAKWAND | PARANOID_WERECHANGE | PARANOID_EATING
    | PARANOID_SWIM | PARANOID_TRAP | PARANOID_AUTOALL;
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

const paranoia_parameters = [
    [PARANOID_CONFIRM, [['confirm', 1], ['paranoia', 2]]],
    [PARANOID_QUIT, [['quit', 1], ['explore', 2]]],
    [PARANOID_DIE, [['die', 1], ['death', 2]]],
    [PARANOID_BONES, [['bones', 1]]],
    [PARANOID_HIT, [['attack', 1], ['hit', 1]]],
    [PARANOID_BREAKWAND, [['wand-break', 2], ['break-wand', 2]]],
    [PARANOID_EATING, [['eat', 1], ['continue', 4]]],
    [PARANOID_WERECHANGE, [['were-change', 2]]],
    [PARANOID_PRAY, [['pray', 1]]],
    [PARANOID_TRAP, [['trap', 1], ['move-trap', 1]]],
    [PARANOID_AUTOALL, [['autoall', 2], ['autoselect-all', 2]]],
    [PARANOID_SWIM, [['swim', 1]]],
    [PARANOID_REMOVE, [['remove', 1], ['takeoff', 1]]],
    [0, [['none', 4]]],
    [ALL_PARANOIA_BITS, [['all', 3]]],
];

function parse_paranoia_setting(value, negated, current, result) {
    if (negated) {
        if (value !== null) {
            config_error_add(result,
                             '!paranoid_confirmation does not accept a value');
            return { bits: current, ok: false };
        }
        return { bits: 0, ok: true };
    }

    let text = String(value ?? '').trim().replace(/\s+/g, ' ');
    const keep = text[0] === '+' || text[0] === '-';
    const clearing = text[0] === '-';
    let bits = keep ? current : 0;
    if (keep)
        text = text.slice(1).trimStart();

    for (let token of text.split(' ')) {
        let fieldClearing = false;
        if (token[0] === '!') {
            fieldClearing = true;
            token = token.slice(1);
        } else if (/^no[^n]/i.test(token)) {
            fieldClearing = true;
            token = token.slice(2);
        }
        const lower = token.toLowerCase();
        const entry = paranoia_parameters.find(([, names]) => names.some(
            ([name, min]) => lower.length >= min && name.startsWith(lower)));
        if (!entry) {
            config_error_add(result,
                             `Unknown paranoid_confirmation parameter '${token}'`);
            return { bits, ok: false };
        }
        const mask = entry[0];
        if (mask === 0) {
            if (!keep)
                bits = 0;
        } else if (clearing || fieldClearing) {
            bits &= ~mask;
        } else {
            bits |= mask;
        }
    }
    return { bits, ok: true };
}

/* src/options.c:7173 initoptions_init() default */
export function paranoia_bits() {
    return game.flags?.paranoia_bits
           ?? DEFAULT_PARANOIA_BITS;
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
        return game.boulder_symbol || '`';
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
        return inv_order().map(oclass => def_oc_syms[oclass]).join('');
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
    case 'sortdiscoveries':
        return get_sortdisco(false);
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
                set_bool_optval(allopt[k].name, !bool_optval(allopt[k]));
                boolopt_side_effects(allopt[k].name);
            } else if (allopt[k].hasHandler !== 'Yes') {
                /* src/options.c:8672 — a compound option with no handler
                   asks for its value outright. C then re-enters
                   parseoptions() with "name:value"; our live store is
                   game.flags, so the value lands there. */
                const { getlin } = await import('./cmd.js');
                const abuf = await getlin(`Set ${allopt[k].name} to what?`);
                if (abuf !== null && abuf !== '\x1b') {
                    if (allopt[k].name === 'fruit')
                        set_fruit_name(abuf);
                    else if (allopt[k].name === 'packorder')
                        await set_packorder(abuf);
                    else
                        game.flags[allopt[k].name] = abuf;
                }
            } else if (allopt[k].name === 'pickup_types') {
                /* compound option with a handler: src/options.c:6114
                   handler_pickup_types() just re-enters parseoptions with a
                   bare "pickup_types", which takes optfn_pickup_types()'s
                   do_set arm and prompts. */
                await optfn_pickup_types();
            } else if (allopt[k].name === 'sortdiscoveries') {
                await choose_disco_sort(0);
            } else if (allopt[k].name === 'menustyle') {
                await handler_menustyle();
            } else if (allopt[k].name === 'autounlock') {
                await handler_autounlock();
            } else if (allopt[k].name === 'menu_objsyms') {
                await handler_menu_objsyms();
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
    game.give_opt_msg = false;
    do {
        pickedone = await doset_simple_menu();
    } while (pickedone > 0);
    game.give_opt_msg = true;
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

// src/symbols.c:909 do_symset(), primary-set path for the pinned tty build.
async function do_symset() {
    const current = gs_symset[PRIMARYSET]?.name || null;
    const tmpwin = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);

    let defindx = current ? 0 : 1;
    tty_add_menu(tmpwin, null, 1, 0, 0, ATR_NONE, NO_COLOR,
                 'Default Symbols', defindx === 1
                     ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);

    const width = Math.max('Default Symbols'.length,
                           ...primary_symsets.filter(s => s.name)
                               .map(s => s.name.length)) + 2;
    for (const entry of primary_symsets) {
        if (!entry.name)
            continue;
        const id = entry.index + 2;
        if (entry.name.toLowerCase() === current?.toLowerCase())
            defindx = id;
        const text = `${entry.name.padEnd(width)} ${entry.description}`;
        tty_add_menu(tmpwin, null, id, 0, 0, ATR_NONE, NO_COLOR, text,
                     id === defindx ? MENU_ITEMFLAGS_SELECTED
                                    : MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(tmpwin, 'Select symbol set:');
    const picks = await tty_select_menu(tmpwin, PICK_ONE);

    let chosen = -2;
    if (picks.length) {
        chosen = picks[0];
        if (picks.length === 2 && chosen === defindx)
            chosen = picks[1];
        chosen -= 2;
    } else if (!picks.cancelled && defindx > 0) {
        chosen = defindx - 2;
    }
    tty_destroy_nhwindow(tmpwin);

    if (chosen >= -1) {
        const entry = primary_symsets.find(s => s.index === chosen);
        assign_graphics(entry?.name || false);
    }
    game.opt_need_redraw = true;
}

// src/cmd.c:2408 handler_rebind_keys(), the outer action picker.
async function handler_rebind_keys() {
    for (;;) {
        const win = tty_create_nhwindow(NHW_MENU);
        tty_start_menu(win, MENU_BEHAVE_STANDARD);
        tty_add_menu(win, null, 1, 0, 0, ATR_NONE, NO_COLOR,
                     'bind key to a command', MENU_ITEMFLAGS_NONE);
        tty_add_menu(win, null, 2, 0, 0, ATR_NONE, NO_COLOR,
                     'bind command to a key', MENU_ITEMFLAGS_NONE);
        if ((game.rc?.bindings || []).length)
            tty_add_menu(win, null, 3, 0, 0, ATR_NONE, NO_COLOR,
                         'view changed key binds', MENU_ITEMFLAGS_NONE);
        tty_end_menu(win, 'Do what?');
        const picks = await tty_select_menu(win, PICK_ONE);
        tty_destroy_nhwindow(win);
        if (!picks.length)
            return;

        /* The nested add, remove, and changed-bind views are independent
           input paths. Keep the outer C loop live while those are ported. */
        note_unported_options(`bind-keys:action-${picks[0]}`);
        return;
    }
}

// src/botl.c:1376 cond_menu(), the interactive status-condition picker.
async function cond_menu() {
    const menutitle = ['alphabetically', 'by ranking'];
    game.gc ||= {};
    let sortorder = game.gc.condmenu_sortorder | 0;

    for (;;) {
        const sequence = condtests.map((_, i) => i);
        sequence.sort((a, b) => {
            if (sortorder && condtests[a].rank !== condtests[b].rank)
                return condtests[a].rank - condtests[b].rank;
            const aa = condtests[a].useropt.toLowerCase();
            const bb = condtests[b].useropt.toLowerCase();
            return aa < bb ? -1 : aa > bb ? 1 : 0;
        });

        const win = tty_create_nhwindow(NHW_MENU);
        tty_start_menu(win, MENU_BEHAVE_STANDARD);
        tty_add_menu(win, null, 1, 'S', 0, ATR_NONE, NO_COLOR,
                     `change sort order from "${menutitle[sortorder]}" to "${
                         menutitle[1 - sortorder]}"`,
                     MENU_ITEMFLAGS_SKIPINVERT);
        add_menu_heading(win, `sorted ${menutitle[sortorder]}`);
        for (const idx of sequence) {
            const condition = condtests[idx];
            tty_add_menu(win, null, idx + 2, 0, 0, ATR_NONE, NO_COLOR,
                         `cond_${condition.useropt.padEnd(14)}`,
                         condition.enabled ? MENU_ITEMFLAGS_SELECTED
                                           : MENU_ITEMFLAGS_NONE);
        }
        tty_end_menu(win, 'Choose status conditions to toggle');
        const picks = await tty_select_menu(win, PICK_ANY);
        tty_destroy_nhwindow(win);

        if (picks.includes(1)) {
            sortorder = 1 - sortorder;
            game.gc.condmenu_sortorder = sortorder;
            continue;
        }
        if (picks.cancelled)
            return false;

        const enabled = new Set(picks.map(id => id - 2));
        let changed = false;
        for (let i = 0; i < condtests.length; i++) {
            if (condtests[i].enabled !== enabled.has(i)) {
                condtests[i].enabled = enabled.has(i);
                condtests[i].test = false;
                changed = true;
            }
        }
        if (changed)
            (game.disp ||= {}).botl = true;
        return changed;
    }
}

/* src/botl.c:703 initblstats[]. Most array indices match BL_* values. The
   final version, weapon, armor, and terrain entries do not, so `fld` keeps
   the enum identifier that status_hilite_menu() stores in its menu item. */
const status_fields = [
    { name: 'title', type: 'str' },
    { name: 'strength', type: 'int' },
    { name: 'dexterity', type: 'int' },
    { name: 'constitution', type: 'int' },
    { name: 'intelligence', type: 'int' },
    { name: 'wisdom', type: 'int' },
    { name: 'charisma', type: 'int' },
    { name: 'alignment', type: 'str' },
    { name: 'score', type: 'long', score: true },
    { name: 'carrying-capacity', type: 'int', enumerated: true },
    { name: 'gold', type: 'long' },
    { name: 'power', type: 'int', percentage: true },
    { name: 'power-max', type: 'int' },
    { name: 'experience-level', type: 'int', percentage: true },
    { name: 'armor-class', type: 'int' },
    { name: 'HD', type: 'int' },
    { name: 'time', type: 'long' },
    { name: 'hunger', type: 'int', enumerated: true },
    { name: 'hitpoints', type: 'int', percentage: true, critical: true },
    { name: 'hitpoints-max', type: 'int' },
    { name: 'dungeon-level', type: 'str' },
    { name: 'experience', type: 'long', percentage: true },
    { name: 'condition', type: 'mask' },
    { name: 'version', type: 'str', fld: 26 },
    { name: 'weapon', type: 'str', fld: 23 },
    { name: 'armor', type: 'str', fld: 24 },
    { name: 'terrain', type: 'str', fld: 25 },
];

const BL_TH_NONE = 0, BL_TH_VAL_PERCENTAGE = 1,
      BL_TH_UPDOWN = 2, BL_TH_VAL_ABSOLUTE = 3,
      BL_TH_TEXTMATCH = 4, BL_TH_CONDITION = 5,
      BL_TH_ALWAYS_HILITE = 6, BL_TH_CRITICALHP = 7;

// src/botl.c:3707 status_hilite_menu_choose_behavior().
async function status_hilite_menu_choose_behavior(fld) {
    const field = status_fields[fld];
    if (!field)
        return BL_TH_NONE;

    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    const add = (id, selector, text) => tty_add_menu(
        win, null, id, selector, 0, ATR_NONE, NO_COLOR, text,
        MENU_ITEMFLAGS_NONE);

    let only = BL_TH_NONE, count = 0;
    if (field.type !== 'mask') {
        add(only = BL_TH_ALWAYS_HILITE, 'a',
            `Always highlight ${field.name}`);
        count++;
    } else {
        add(only = BL_TH_CONDITION, 'b', 'Bitmask of conditions');
        count++;
    }
    if (field.type !== 'mask' && field.name !== 'version') {
        add(only = BL_TH_UPDOWN, 'c', `${field.name} value changes`);
        count++;
    }
    if (!field.enumerated && (field.type === 'int' || field.type === 'long')) {
        add(only = BL_TH_VAL_ABSOLUTE, 'n', 'Number threshold');
        count++;
    }
    if (field.percentage) {
        add(only = BL_TH_VAL_PERCENTAGE, 'p', 'Percentage threshold');
        count++;
    }
    if (field.critical) {
        add(only = BL_TH_CRITICALHP, 'C',
            `Highlight critically low ${field.name}`);
        count++;
    }
    if (field.type === 'str' || field.enumerated) {
        add(only = BL_TH_TEXTMATCH, 't', `${field.name} text match`);
        count++;
    }

    tty_end_menu(win, `Select ${field.name} field hilite behavior:`);
    let behavior = only;
    if (count > 1) {
        const picks = await tty_select_menu(win, PICK_ONE);
        behavior = picks.length ? picks[0]
                   : picks.cancelled ? BL_TH_NONE - 1 : BL_TH_NONE;
    }
    tty_destroy_nhwindow(win);
    return behavior;
}

// src/botl.c:4498 status_hilite_menu(), including its retry loop after a
// field was opened. Rule creation beyond the behavior picker is kept visible
// as pending until its value, color, and attribute dialogs are ported.
async function status_hilite_menu() {
    for (;;) {
        const win = tty_create_nhwindow(NHW_MENU);
        tty_start_menu(win, MENU_BEHAVE_STANDARD);
        for (let fld = 0; fld < status_fields.length; fld++) {
            const field = status_fields[fld];
            if (field.score)
                continue;
            const fieldId = field.fld ?? fld;
            const count = (game.status_hilites || [])
                .filter(rule => rule.fld === fieldId).length;
            let text = field.name.padEnd(18);
            if (count)
                text += ` (${count} defined)`;
            tty_add_menu(win, null, fieldId + 1, 0, 0, ATR_NONE, NO_COLOR,
                         text, MENU_ITEMFLAGS_NONE);
        }
        tty_end_menu(win, 'Status hilites:');
        const picks = await tty_select_menu(win, PICK_ONE);
        tty_destroy_nhwindow(win);
        if (!picks.length)
            return true;

        const fld = picks[0] - 1;
        const behavior = await status_hilite_menu_choose_behavior(fld);
        if (behavior > BL_TH_NONE)
            note_unported_options(`status-hilite:${status_fields[fld].name}`);
        /* With no existing rule, status_hilite_menu_fld() attempts one add
           and then the outer menu is shown again whether it succeeds or is
           cancelled. */
    }
}

/* src/windows.c:1816 add_menu_heading() — non-selectable line in
   iflags.menu_headings style (ATR_INVERSE + NO_COLOR by default). */
export function add_menu_heading(tmpwin, buf) {
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
    case 'fixinv': case 'price_quotes': case 'sortpack':
    case 'implicit_uncursed': case 'wizweight':
        if (game.flags.fixinv === false)
            reassign();
        update_inventory();
        break;
    default:
        /* customcolors/customsymbols/menucolors touch palette machinery
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
           compiled into the reference binary. The recorded DEBUG build has
           8 pages and ends at "status highlight rules". */
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
                set_bool_optval(o.name, newval);
                boolopt_side_effects(o.name);
                await pline(`'${o.name}' option toggled ${newval ? 'on'
                                                                 : 'off'}.`);
            } else if (o.hasHandler === 'Yes' && o.name === 'pickup_types') {
                /* compound option with a handler: optfn's do_handler arm */
                await optfn_pickup_types();
            } else if (o.hasHandler === 'Yes' && o.name === 'symset') {
                await do_symset();
            } else if (o.hasHandler === 'Yes' && o.name === 'sortdiscoveries') {
                await choose_disco_sort(0);
            } else if (o.hasHandler === 'Yes' && o.name === 'menustyle') {
                await handler_menustyle();
            } else if (o.hasHandler === 'Yes' && o.name === 'autounlock') {
                await handler_autounlock();
            } else if (o.hasHandler === 'Yes' && o.name === 'menu_objsyms') {
                await handler_menu_objsyms();
            } else if (o.hasHandler === 'Yes' && o.name === 'whatis_coord') {
                await handler_whatis_coord();
            } else if (o.name === 'bind keys') {
                await handler_rebind_keys();
            } else if (o.name === 'status condition fields') {
                await cond_menu();
            } else if (o.name === 'status highlight rules') {
                await status_hilite_menu();
            } else if (o.hasHandler === 'Yes') {
                note_unported_options(`doset:handler=${o.name}`);
            } else {
                /* compound option without a handler asks for the value */
                const { getlin } = await import('./cmd.js');
                const abuf = await getlin(`Set ${o.name} to what?`);
                if (abuf === null || abuf === '\x1b')
                    continue;
                if (o.name === 'packorder')
                    await set_packorder(abuf);
                else
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

// src/options.c:7446 set_menuobjsyms_flags().
export function set_menuobjsyms_flags(newobjsyms) {
    game.iflags.menuobjsyms = newobjsyms;
    game.iflags.menu_head_objsym = !!(newobjsyms & 1);
    game.iflags.use_menu_glyphs = !!(newobjsyms & (2 | 4));
}

// src/options.c:5624 handler_autounlock(), select any combination of actions.
export async function handler_autounlock() {
    const oldflags = game.flags.autounlock;
    const sep = game.iflags.menu_tab_sep ? '\t' : ' ';
    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    for (let i = 0; i < unlocktypes.length; i++) {
        const [name, description] = unlocktypes[i];
        tty_add_menu(win, null, i + 1, name[0], 0, ATR_NONE, NO_COLOR,
            name.padEnd(10) + sep + description,
            oldflags & (1 << i) ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(win, "Select 'autounlock' actions:");
    const picks = await tty_select_menu(win, PICK_ANY);
    if (picks.length) {
        let newflags = 0;
        for (const pick of picks) newflags |= 1 << (pick - 1);
        game.flags.autounlock = newflags;
    } else if (!picks.cancelled) {
        game.flags.autounlock = 0;
    }
    tty_destroy_nhwindow(win);
    const chngd = game.flags.autounlock !== oldflags;
    if ((chngd || game.flags.verbose) && game.give_opt_msg !== false) {
        const value = get_option_value({name: 'autounlock'});
        await pline(`'autounlock' ${chngd ? 'changed to' : 'is still'} '${value}'.`);
    }
    return 0;
}

// src/options.c:5795 handler_menu_objsyms().
export async function handler_menu_objsyms() {
    const descriptions = [
        "don't show object symbols in menus",
        'show object symbols in menu header lines',
        'show object symbols in individual menu entries',
        'show object symbols in headers and menu entries',
        'show objsyms in entries if no headers are shown',
        'show objsyms in header, in entries if no header',
    ];
    const sep = game.iflags.menu_tab_sep ? '\t' : ' ';
    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    for (let i = 0; i < objsymvals.length; i++) {
        const buf = objsymvals[i].padEnd(12) + sep + descriptions[i];
        tty_add_menu(win, null, i + 1, String(i), buf[0], ATR_NONE, NO_COLOR, buf,
                     i === game.iflags.menuobjsyms
                         ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(win, 'Set object symbols in menus to what?');
    const picks = await tty_select_menu(win, PICK_ONE);
    if (picks.length) {
        let i = picks[0] - 1;
        if (picks.length > 1 && i === game.iflags.menuobjsyms)
            i = picks[1] - 1;
        set_menuobjsyms_flags(i);
    }
    tty_destroy_nhwindow(win);
    return 0;
}

// src/options.c:6206 handler_whatis_coord(), the pinned tty window port.
export async function handler_whatis_coord() {
    const old = game.iflags.getpos_coords;
    const entries = [
        [GPCOORDS_COMPASS, "compass ('east' or '3s' or '2n,4w')"],
        [GPCOORDS_COMFULL, "full compass ('east' or '3south' or '2north,4west')"],
        [GPCOORDS_MAP, 'map <x,y>'],
        [GPCOORDS_SCREEN, 'screen [row,column]'],
        [GPCOORDS_NONE, 'none (no coordinates displayed)'],
    ];
    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    for (const [mode, label] of entries)
        tty_add_menu(win, null, mode, mode, 0, ATR_NONE, NO_COLOR, label,
                     old === mode ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
    tty_add_menu_str(win, '');
    tty_add_menu_str(win, `map: upper-left: <1,0>, lower-right: <${COLNO - 1},${ROWNO - 1}>${game.flags.verbose ? '; column 0 unused, off left edge' : ''}`);
    tty_add_menu_str(win, `screen: upper-left: [02,01], lower-right: [${ROWNO + 1},${COLNO - 1}]${COLNO === 80 && game.flags.verbose ? '; column 80 is not used' : ''}`);
    tty_add_menu_str(win, '');
    tty_end_menu(win, 'Select coordinate display when auto-describing a map position:');
    const picks = await tty_select_menu(win, PICK_ONE);
    if (picks.length) {
        game.iflags.getpos_coords = picks[0];
        if (picks.length > 1 && picks[0] === old)
            game.iflags.getpos_coords = picks[1];
    }
    tty_destroy_nhwindow(win);
    return 0;
}

// src/options.c:5544 handler_menustyle().
async function handler_menustyle() {
    const old_menu_style = game.flags.menu_style ?? 2;
    const descriptions = [
        ['[prompt for object class(es), then', ' ask y/n for each item in those classes]'],
        ['[prompt for object class(es), then', ' use menu for items in those classes]'],
        ['[use menu to choose class(es), then', ' use another menu for items in those]'],
        ['[skip class filtering; always', ' use menu of all available items]'],
    ];
    const sep = game.iflags?.menu_tab_sep ? '\t' : ' ';
    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    for (let i = 0; i < menutype.length; i++) {
        const buf = menutype[i].padEnd(12) + sep + descriptions[i][0];
        tty_add_menu(win, null, i + 1, buf[0], 0, ATR_NONE, NO_COLOR, buf,
                     i === old_menu_style ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
        tty_add_menu_str(win, ' '.repeat(16) + sep + descriptions[i][1]);
    }
    tty_end_menu(win, 'Select menustyle:');
    const picks = await tty_select_menu(win, PICK_ONE);
    if (picks.length) {
        let i = picks[0] - 1;
        if (picks.length > 1 && i === old_menu_style)
            i = picks[1] - 1;
        game.flags.menu_style = i;
    }
    tty_destroy_nhwindow(win);
    const style = game.flags.menu_style ?? 2;
    const chngd = style !== old_menu_style;
    if (chngd || game.flags.verbose !== false)
        await pline(`'menustyle' ${chngd ? 'changed to' : 'is still'} "${menutype[style]}".`);
    return 0;
}

// src/options.c:7466 change_inv_order(). Keep each symbol's final occurrence,
// append omitted classes in their previous order, and report every bad entry.
function change_inv_order(op, result) {
    const previous = result.opts.inv_order
        ?? [...def_inv_order].map(def_char_to_objclass);
    const order = op.includes('$') ? [] : [OCLASSES.COIN_CLASS];
    let ok = true;
    for (let i = 0; i < op.length; i++) {
        const symbol = op[i], oclass = def_char_to_objclass(symbol);
        let error = '';
        if (oclass === OCLASSES.MAXOCLASSES)
            error = `Not an object class '${symbol}'`;
        else if (!previous.includes(oclass))
            error = `Object class '${symbol}' not allowed`;
        else if (op.includes(symbol, i + 1))
            error = `Duplicate object class '${symbol}'`;
        if (error) {
            config_error_add(result, error);
            ok = false;
        } else {
            order.push(oclass);
        }
    }
    for (const oclass of previous)
        if (!order.includes(oclass))
            order.push(oclass);
    result.opts.inv_order = order;
    return ok;
}

// Interactive config_erradd() prints errors immediately with punctuation.
async function set_packorder(value) {
    value = value.trimEnd();
    if (!value)
        return; // optfn_packorder rejects empty_optstr without changing order.
    const result = { opts: game.flags, errors: [] };
    change_inv_order(value, result);
    game.flags.packorder = value;
    for (const error of result.errors)
        await pline(error + (/[.!?]$/.test(error) ? '' : '.'));
}

// src/options.c:3337 optfn_pickup_types(), interactive no-value arm.
// The configured-value arm above also validates the resulting selection.
async function optfn_pickup_types() {
    const { choose_classes_menu } = await import('./windows.js');
    const tbuf = { s: game.flags?.pickup_types || '' };
    game.flags.pickup_types = '';
    let ocl = inv_order().map(c => def_oc_syms[c]).join('');
    let use_menu = true, op = '';
    if (game.flags.menu_style === MENU_TRADITIONAL
        || game.flags.menu_style === MENU_COMBINATION) {
        const { getlin } = await import('./cmd.js');
        use_menu = false;
        const abuf = await getlin(`New pickup_types: [${ocl} am] (${tbuf.s || 'all'})`);
        const wasspace = abuf?.[0] === ' ';
        op = mungspaces(abuf || '');
        if (wasspace && !op)
            ; // one or more spaces remove the old value
        else if (!op || op[0] === '\x1b')
            op = tbuf.s;
        else if (op[0] === 'm')
            use_menu = true;
    }
    if (use_menu) {
        const venom = def_oc_syms[OCLASSES.VENOM_CLASS];
        if (game.wizard && !ocl.includes(venom))
            ocl += venom;
        await choose_classes_menu('Autopickup what?', 1, true, ocl, tbuf);
        op = tbuf.s;
    }
    // The prompt already handled an empty response. Supplying 'a' keeps its
    // all-types meaning without entering the no-value option arm again.
    while (op[0] === ' ')
        op = op.slice(1);
    const result = { opts: game.flags, errors: [] };
    parseoptions('pickup_types:' + (op || 'a'), false, false, result);
    for (const error of result.errors)
        await pline(error + (/[.!?]$/.test(error) ? '' : '.'));
}
