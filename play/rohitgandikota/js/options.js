// options.js — .nethackrc option parsing.
// C ref: src/options.c. The option table itself is generated from
// include/optlist.h into js/optlist.js by tools/gen-optlist.mjs.

import { game } from './gstate.js';
import { reset_commands } from './cmd.js';
import { set_vanq_order } from './insight.js';
import { pline, docrt, bot, reglyph_darkroom, flush_screen } from './display.js';
import {
    NHW_MENU, ATR_NONE, ATR_INVERSE,
    tty_create_nhwindow, tty_destroy_nhwindow, tty_start_menu, tty_add_menu,
    tty_add_menu_str, tty_end_menu, tty_display_nhwindow, tty_select_menu, tty_wait_synch } from './tty/wintty.js';
import {
    MENU_ITEMFLAGS_NONE, MENU_ITEMFLAGS_SELECTED, MENU_ITEMFLAGS_SKIPINVERT,
    MENU_ITEMFLAGS_SKIPMENUCOLORS, MENU_BEHAVE_STANDARD, BUFSZ,
    PICK_NONE, PICK_ONE, PICK_ANY, ECMD_OK,
    AUTOUNLOCK_APPLY_KEY, MENU_TRADITIONAL, MENU_COMBINATION,
    GPCOORDS_NONE, GPCOORDS_COMPASS, GPCOORDS_COMFULL, GPCOORDS_MAP,
    GPCOORDS_SCREEN, COLNO, ROWNO, PL_FSIZ, ismnum,
} from './const.js';
import { NO_COLOR } from './terminal.js';
import { allopt, findOption } from './optlist.js';
import { condtests, status_hilite_menu, count_status_hilites } from './botl.js';
import {
    assign_graphics, gs_symset, gc_currentgraphics, known_handling,
    primary_symsets, PRIMARYSET, ROGUESET, parsesymbols, switch_symbols,
} from './symbols.js';
import { def_char_to_objclass } from './sp_lev.js';
import { OCLASSES } from './objects_data.js';
import {
    color_attr_to_str, attr2attrname, clr2colorname, count_menucolors,
    add_menu_coloring, add_menu_coloring_parsed, free_one_menu_coloring,
    query_color, query_attr,
} from './coloratt.js';
import { roles, races, genders, aligns, ROLE_RANDOM } from './role.js';
import { vision_recalc } from './vision.js';
import { reassign, update_inventory, inv_order } from './invent.js';
import { def_oc_syms } from './drawing_data.js';
import { choose_disco_sort, get_sortdisco } from './o_init.js';
import { mungspaces, strNsubst } from './hacklib.js';
import {
    regex_init, regex_compile, regex_error_desc, regex_free,
} from './posixregex.js';
import { fruit_from_name, makesingular, makeplural, OBJ_NAME } from './objnam.js';
import { name_to_mon } from './mondata.js';
import { sanitize_name } from './bones.js';
import { rnd } from './rng.js';
import { def_char_to_monclass } from './drawing.js';
import { visctrl } from './hacklib.js';
import { strsubst, highc, strstri } from './hacklib.js';
import { regex_match } from './posixregex.js';
import { query_color_attr } from './coloratt.js';
import { adjust_menu_promptstyle } from './tty/wintty.js';
import { gp, ALIGN_TOP, ALIGN_BOTTOM, ALIGN_LEFT, ALIGN_RIGHT, GFILTER_NONE, GFILTER_VIEW, GFILTER_AREA, VI_NUMBER, VI_NAME, VI_BRANCH, InvOptNone, InvOptOn, InvSparse, MSGTYP_NORMAL, MSGTYP_NOREP, MSGTYP_NOSHOW, MSGTYP_STOP } from './const.js';
import { MAXMCLASSES, SYM_OFF_X, go_ov_primary_syms, go_ov_rogue_syms, escapes } from './symbols.js';
import { WARNCOUNT, SYM_BOULDER } from './const.js';
import { NUM_DISCLOSURE_OPTIONS, DISCLOSE_PROMPT_DEFAULT_YES, DISCLOSE_PROMPT_DEFAULT_NO, DISCLOSE_PROMPT_DEFAULT_SPECIAL, DISCLOSE_YES_WITHOUT_PROMPT, DISCLOSE_NO_WITHOUT_PROMPT, DISCLOSE_SPECIAL_WITHOUT_PROMPT } from './const.js';
import { RUN_TPORT, RUN_LEAP, RUN_STEP, RUN_CRAWL } from './const.js';
import { Is_rogue_level, H_MAC, H_UNK } from './const.js';
import { There } from './pline.js';

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
                config_error_add("Doing that so many times isn't very fruitful.");
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
        config_error_add('Empty statement');
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
        config_error_add(`Unknown option '${name}'`);
        return false;
    }

    if (negated && opt.negateok === 'No') {
        config_error_add(`Negating '${opt.name}' is not allowed`);
        return false;
    }
    if (value !== null && opt.valok === 'No') {
        config_error_add(`Value not allowed for '${opt.name}'`);
        return false;
    }
    if (value === null && opt.type !== 'BoolOpt' && opt.valok === 'Yes'
        && opt.name !== 'packorder' && opt.name !== 'pickup_types'
        && opt.name !== 'menu_objsyms' && opt.name !== 'autounlock'
        && !(opt.name === 'menustyle' && (negated || opts.length <= 5))
        && !(opt.name === 'whatis_coord' && negated)
        && !(opt.name === 'paranoid_confirmation' && negated)
        && !(opt.name === 'number_pad' && (opts.length <= 10 || negated || tinitial))) {
        config_error_add(`Missing value for '${opt.name}'`);
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
            config_error_add(`Unknown pickup_burden parameter '${value}'`);
            return false;
        }
        result.opts[opt.name] = burden;
    } else if (opt.name === 'runmode') {
        /* src/options.c:3627 optfn_runmode() do_set: the value is kept as
           the RUN_* index; str_start_is(whole, op) accepts any prefix of
           the mode name */
        const op = value ?? '';
        if (negated) {
            result.opts[opt.name] = RUN_TPORT;
        } else if (op !== '') {
            const lop = op.toLowerCase();
            if ('teleport'.startsWith(lop))
                result.opts[opt.name] = RUN_TPORT;
            else if ('run'.startsWith(lop))
                result.opts[opt.name] = RUN_LEAP;
            else if ('walk'.startsWith(lop))
                result.opts[opt.name] = RUN_STEP;
            else if ('crawl'.startsWith(lop))
                result.opts[opt.name] = RUN_CRAWL;
            else {
                config_error_add(`Unknown runmode parameter '${op}'`);
                return false;
            }
        } else {
            config_error_add('Value is mandatory for runmode');
            return false;
        }
    } else if (opt.name === 'pickup_types') {
        // src/options.c:3321 optfn_pickup_types(), configured-value arm.
        result.opts.pickup_types = '';
        let op = sep < 0 ? '' : opts.slice(sep + 1);
        if (!op) {
            if (tinitial && opts.length > 6)
                config_error_add(`Missing parameter for '${opts}'`);
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
                    config_error_add("Unknown pickup_types parameter ''");
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
                    config_error_add(`Invalid value for "autounlock": "${op}"`);
                    return false;
                }
                op = next;
            }
            if (negated && newflags !== 0) {
                config_error_add(`Invalid value combination for "autounlock": 'none' with some`);
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
            config_error_add(`Unknown menustyle parameter '${order}'`);
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
                config_error_add(`Illegal menu_objsyms parameter '${op}'`);
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
                config_error_add(`Unknown whatis_coord parameter '${value}'`);
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
                config_error_add(`Unknown sortdiscoveries parameter '${order}'`);
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
    } else if (opt.name === 'statuslines') {
        /* src/options.c:4099 optfn_statuslines(), the do_set arm. atoi() of
           a non-number is 0, which is out of range, so a typed "de" is
           reported as "'statuslines:de' is invalid; must be 2 or 3" and the
           return is optn_silenterr: no second message. */
        const op = value ?? '';
        let itmp = 0;
        if (op !== '')
            itmp = parseInt(op, 10) || 0;
        if (itmp < 2 || itmp > 3) {
            config_error_add(`'${opt.name}:${op}' is invalid; must be 2 or 3`);
            return false;
        }
        result.opts.statuslines = itmp;
    } else if (opt.name === 'number_pad') {
        /* src/options.c:2622 optfn_number_pad(), the do_set arm. A bare
           "number_pad" is number_pad:1 for backwards compatibility; -1..4
           set iflags.num_pad and the num_pad_mode bits (1 = MSDOS
           compatible or y/z swapped, 2 = phone layout). */
        const compat = (opts.length <= 10);
        const op = value ?? '';    /* string_for_opt(opts, compat || !opt_initial) */
        if (op === '') {
            if (compat || negated || tinitial) {
                /* for backwards compatibility, "number_pad" without a
                   value is a synonym for number_pad:1 */
                result.opts.num_pad = !negated;
                result.opts.num_pad_mode = 0;
            }
        } else if (negated) {
            config_error_add(`The ${opt.name} option may not both have a value and be negated.`);
            return false;
        } else {
            const mode = parseInt(op, 10) || 0;     /* atoi() */
            if (mode < -1 || mode > 4 || (mode === 0 && op[0] !== '0')) {
                config_error_add(`Illegal ${opt.name} parameter '${op}'`);
                return false;
            } else if (mode <= 0) {
                result.opts.num_pad = false;
                /* German keyboard; y and z keys swapped */
                result.opts.num_pad_mode = (mode < 0) ? 1 : 0; /* 0 or 1 */
            } else {                              /* mode > 0 */
                result.opts.num_pad = true;
                result.opts.num_pad_mode = 0;
                /* PC Hack / MSDOS compatibility */
                if (mode === 2 || mode === 4)
                    result.opts.num_pad_mode |= 1;
                /* phone keypad layout */
                if (mode === 3 || mode === 4)
                    result.opts.num_pad_mode |= 2;
            }
        }
        /* reset_commands(FALSE) runs once the live iflags hold these (see
           jsmain and parseoptions_interactive()); number_pad() only emits
           the terminal's keypad-mode strings, which have no screen cells */
        result.opts[opt.name] = negated ? null : value;
    } else if (opt.name === 'disclose') {
        /* src/options.c:1447 optfn_disclose(), the do_set arm: the value is a
           run of category letters (iavgco; k->v and d->o) each optionally
           preceded by one of the y/n/?/+/-/# settings; a bare "disclose" or
           "all" prompts for everything, "none" disables it all. */
        const op = value ?? '';  /* string_for_opt(opts, TRUE) */
        if (op !== '' && negated) {
            /* bad_negation(allopt[optidx].name, TRUE) */
            config_error_add(`The ${opt.name} option may not both have a value and be negated.`);
            return false;
        }
        const disclosure_options = 'iavgco';        /* decl.c:54 */
        /* "disclose" without a value means "all with prompting"
           and negated means "none without prompting" */
        if (op === '' || op.toLowerCase() === 'all'
            || op.toLowerCase() === 'none') {
            if (op !== '' && op.toLowerCase() === 'none')
                negated = true;
            result.opts.end_disclose = (negated ? '-' : 'y')
                                       .repeat(disclosure_options.length);
            result.opts[opt.name] = negated ? null : value;
            return retval;
        }
        /* flags.end_disclose is edited in place; options.c:7211 starts it
           at DISCLOSE_PROMPT_DEFAULT_NO for every category */
        const end = (result.opts.end_disclose ?? game.flags?.end_disclose
                     ?? 'nnnnnn').split('');
        let prefix_val = -1;
        for (const ch of op) {
            let c = ch.toLowerCase();
            if (c === 'k')
                c = 'v'; /* killed -> vanquished */
            if (c === 'd')
                c = 'o'; /* dungeon -> overview */
            const idx = disclosure_options.indexOf(c);
            if (idx >= 0) {
                if (prefix_val !== -1) {
                    if (c !== 'v' && c !== 'g') {
                        if (prefix_val === '?')
                            prefix_val = 'y';
                        if (prefix_val === '#')
                            prefix_val = '+';
                    }
                    end[idx] = prefix_val;
                    prefix_val = -1;
                } else
                    end[idx] = '+';
            } else if ('yn?+-#'.includes(c)) {
                prefix_val = c;
            } else if (c === ' ') {
                ; /* do nothing */
            } else {
                config_error_add(`Unknown ${opt.name} parameter '${ch}'`);
                return false;
            }
        }
        result.opts.end_disclose = end.join('');
        result.opts[opt.name] = value;
    } else if (opt.name === 'boulder') {
        /* src/options.c:1171 optfn_boulder(), the do_set arm: boulder:symbol */
        let op = value ?? '';   /* string_for_opt(opts, FALSE) */
        if (op === '')
            return false;
        op = escapes(op);
        /* note: dummy monclass #0 has symbol value '\0'; we allow that--
           attempting to set bouldersym to '^@'/'\0' will reset to default */
        const c0 = op.length ? op.charCodeAt(0) : 0;
        let clash = 0;
        if (def_char_to_monclass(op[0] ?? '\0') !== MAXMCLASSES)
            clash = c0 ? 1 : 0;
        else if (c0 >= 0x31 /* '1' */ && c0 < WARNCOUNT + 0x30 /* '0' */)
            clash = 2;
        if (c0 < 0x20) {
            config_error_add('boulder symbol cannot be a control character');
            return true;        /* optn_ok */
        } else if (clash) {
            /* symbol chosen matches a used monster or warning
               symbol which is not good - reject it */
            config_error_add(`Badoption - boulder symbol '${visctrl(op[0])}' would conflict `
                             + `with a ${(clash === 1) ? 'monster' : 'warning'} symbol`);
        } else {
            /*
             * Override the default boulder symbol.
             */
            go_ov_primary_syms[SYM_BOULDER + SYM_OFF_X] = c0;
            go_ov_rogue_syms[SYM_BOULDER + SYM_OFF_X] = c0;
            game.boulder_symbol = op[0];
            /* for 'initial', update of BOULDER symbol is done in
               initoptions_finish(), after all symset options
               have been processed; gs.showsyms[SYM_BOULDER + SYM_OFF_X] is
               read through get_othersym() in this port */
            if (!tinitial)
                game.opt_need_redraw = true;
        }
        result.opts[opt.name] = value;
    } else if (opt.name === 'scores') {
        /* src/options.c:3669 optfn_scores(), the do_set arm:
           scores:5t[op] 5a[round] o[wn] */
        let op = value ?? '';   /* string_for_opt(opts, FALSE) */
        if (op === '')
            return false;       /* optn_err */

        /* 5.0: earlier versions left old values for unspecified arguments
           if player's scores:foo option only specified some of the three;
           in particular, attempting to use 'scores:own' rather than
           'scores:0 top/0 around/own' didn't work as intended */
        result.opts.end_top = result.opts.end_around = 0;
        result.opts.end_own = false;

        if (negated)
            op = '';            /* op = eos(op) */

        const digit = (c) => c !== undefined && c >= '0' && c <= '9';
        const letter = (c) => c !== undefined && /[A-Za-z]/.test(c);
        while (op.length) {
            let inum = 1;

            let neg = (op[0] === '!') || op.slice(0, 2).toLowerCase() === 'no';
            if (neg)
                op = op.slice((op[0] === '!') ? 1 : (op[2] !== '-') ? 2 : 3);

            if (digit(op[0])) {
                inum = parseInt(op, 10);
                while (digit(op[0]))
                    op = op.slice(1);
            }
            while (op[0] === ' ')
                op = op.slice(1);

            switch ((op[0] ?? '').toLowerCase()) {
            case 't':
                result.opts.end_top = neg ? 0 : inum;
                break;
            case 'a':
                result.opts.end_around = neg ? 0 : inum;
                break;
            case 'o':
                result.opts.end_own = (neg || !inum) ? false : true;
                break;
            case 'n': /* none */
                result.opts.end_top = result.opts.end_around = 0;
                result.opts.end_own = false;
                break;
            case '-':
                if (digit(op[1])) {
                    config_error_add(`Values for ${opt.name}:top and ${
                        opt.name}:around must not be negative`);
                    return false; /* optn_silenterr */
                }
                /*FALLTHRU*/
            default:
                config_error_add(`Unknown ${opt.name} parameter '${op}'`);
                return false; /* optn_silenterr */
            }
            /* "3a" is sufficient but accept "3around" (or "3abracadabra") */
            while (letter(op[0]))
                op = op.slice(1);
            /* t, a, and o can be separated by space(s) or slash or both */
            while (op[0] === ' ')
                op = op.slice(1);
            if (op[0] === '/')
                op = op.slice(1);
        }
        result.opts[opt.name] = negated ? null : value;
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

// src/cfgfiles.c:1544 config_erradd() — while an rc or an option string is
// being parsed the messages collect on the parse result (C's
// config_error_data, set up by config_error_init()); otherwise the player
// gave a bad value at an interactive prompt and the message is shown.
let config_error_data = null;

async function config_erradd(buf) {
    if (!buf)
        buf = 'Unknown error';

    /* if buf[] doesn't end in a period, exclamation point, or question mark,
       we'll include a period (in the message, not appended to buf[]) */
    const punct = /[.!?]$/.test(buf) ? '' : '.';

    if (!config_error_data) {
        /* either very early, where pline() will use raw_print(), or
           player gave bad value when prompted by interactive 'O' command */
        await pline(`${buf}${punct}`);
        await tty_wait_synch();
        return;
    }
    config_error_data.errors.push(buf);
}

// src/cfgfiles.c:1865 config_error_add()
export function config_error_add(msg) {
    return config_erradd(msg);
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
    config_error_data = result; /* src/cfgfiles.c config_error_init() */

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
                config_error_add(`Error in SYMBOLS definition '${rest}'`);
            break;
        case 'ROGUESYMBOLS':
            /* src/cfgfiles.c:1191 cnf_line_ROGUESYMBOLS() */
            result.symbols.push(rest);
            if (!parsesymbols(rest, ROGUESET))
                config_error_add(`Error in ROGUESYMBOLS definition '${rest}'`);
            break;
        case 'MENUCOLOR':
            /* src/cfgfiles.c:1164 cnf_line_MENUCOLOR(); parse_config_line()
               has mungspaces()d the line and stepped past '=' */
            add_menu_coloring(mungspaces(rest));
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
    config_error_data = null; /* config_error_done() */
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

/* include/optlist.h — booleans whose address is an iflags field, not a
   flags one; the code that reads them (getpos autodescribe, cmdassist,
   fireassist, the menu layout switches) reads game.iflags, so the option
   menu and the rc must write the same place. */
export const iflag_boolean_options = new Set([
    'autodescribe', 'cmdassist', 'fireassist', 'menu_overlay', 'menu_tab_sep',
    'debug_hunger', 'debug_mongen', 'debug_overwrite_stairs',
    'menucolors', /* iflags.use_menu_color */
    'whatis_menu', /* iflags.getloc_usemenu */
    'whatis_moveskip', /* iflags.getloc_moveskip */
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
// src/options.c:225 perminv_modes[][3] — second column is an alias for the
// first; third is brief explanation; entries 5 and 6 are 1|4 and 2|4 (tty
// only, and TTY_PERM_INVENT is not defined in the reference build)
const perminv_modes = [
  /*0*/ ['none',      'off',        'no permanent inventory window'],
  /*1*/ ['all' ,      'on',         'all inventory except for gold'],
  /*2*/ ['full',      'gold',       'full inventory including gold'],
  /*3*/ [null,        null,         null],
  /*4*/ [null,        null,         null],
  /*5*/ [null,        null,         null],
  /*6*/ [null,        null,         null],
  /*7*/ [null,        null,         null],
  /*8*/ ['in-use',    'inuse-only', 'subset: items currently in use'],
];
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
const paranoia = [ /* flagmask, argname, explain (for interactive menu) */
    [PARANOID_CONFIRM, 'Confirm',
     'for "yes" confirmations, require "no" to reject'],
    [PARANOID_QUIT, 'quit',
     'yes vs y to quit or to enter explore mode'],
    [PARANOID_DIE, 'die',
     'yes vs y to die (explore mode or debug mode)'],
    [PARANOID_BONES, 'bones',
     'yes vs y to save bones data when dying in debug mode'],
    [PARANOID_HIT, 'attack',
     'yes vs y to attack a peaceful monster'],
    [PARANOID_BREAKWAND, 'wand-break',
     'yes vs y to break a wand via (a)pply'],
    [PARANOID_EATING, 'eat',
     'yes vs y to continue eating after first bite when satiated'],
    [PARANOID_WERECHANGE, 'Were-change',
     'yes vs y to change form when lycanthropy is controllable'],
    [PARANOID_PRAY, 'pray',
     'y required to pray (supersedes old "prayconfirm" option)'],
    [PARANOID_TRAP, 'trap',
     'y required to enter known trap unless considered harmless'],
    [PARANOID_AUTOALL, 'Autoall',
     "y required to pick filter choice 'A' for menustyle:Full"],
    [PARANOID_SWIM, 'swim',
     "'m' prefix necessary to deliberately walk into lava or water"],
    [PARANOID_REMOVE, 'Remove',
     'always pick from inventory for Remove and Takeoff'],
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
            config_error_add('!paranoid_confirmation does not accept a value');
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
            config_error_add(`Unknown paranoid_confirmation parameter '${token}'`);
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
    case 'boulder':                 /* src/options.c:1240 optfn_boulder */
        /* go.ov_primary_syms[SYM_BOULDER + SYM_OFF_X] else
           gs.showsyms[objects[BOULDER].oc_class + SYM_OFF_O] */
        return go_ov_primary_syms[SYM_BOULDER + SYM_OFF_X]
               ? String.fromCharCode(go_ov_primary_syms[SYM_BOULDER + SYM_OFF_X])
               : def_oc_syms[OCLASSES.ROCK_CLASS];
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
        return count_status_hilites()
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
        return n_currently_set(msgtype_count());
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
        return n_currently_set(count_apes());
    case 'menu colors':
        return n_currently_set(count_menucolors());
    case 'status condition fields':
        return n_currently_set(count_cond());
    case 'status highlight rules':
        return n_currently_set(count_status_hilites());
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
            } else if (allopt[k].type === 'OthrOpt') {
                /* optlist.h's "other" entries all have handlers:
                   optfn_o_menu_colors etc., do_handler arms */
                if (allopt[k].name === 'menu colors')
                    await handler_menu_colors();
                else if (allopt[k].name === 'bind keys')
                    await handler_rebind_keys();
                else if (allopt[k].name === 'status condition fields')
                    await cond_menu();
                else if (allopt[k].name === 'status highlight rules')
                    await status_hilite_menu();
                else if (allopt[k].name === 'autopickup exceptions')
                    await handler_autopickup_exception();
                else if (allopt[k].name === 'message types')
                    await handler_msgtype();
                else
                    note_unported_options(`doset_simple:other=${allopt[k].name}`);
            } else if (allopt[k].hasHandler !== 'Yes') {
                /* src/options.c:8672 — a compound option with no handler
                   asks for its value outright. C then re-enters
                   parseoptions() with "name:value"; our live store is
                   game.flags, so the value lands there. */
                const { getlin } = await import('./cmd.js');
                const abuf = await getlin(`Set ${allopt[k].name} to what?`);
                if (abuf !== null && abuf !== '\x1b') {
                    /* src/options.c:8686 — "pass the buck" to parseoptions,
                       whose option handler validates the typed value */
                    await parseoptions_interactive(`${allopt[k].name}:${abuf}`);
                }
            } else if (allopt[k].name === 'disclose') {
                /* src/options.c optfn_disclose() do_handler */
                await handler_disclose();
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
            } else if (allopt[k].name === 'msg_window') {
                await handler_msg_window();
            } else if (allopt[k].name === 'runmode') {
                await handler_runmode();
            } else if (allopt[k].name === 'number_pad') {
                await handler_number_pad();
            } else if (allopt[k].name === 'sortvanquished') {
                await optfn_sortvanquished();
            } else if (allopt[k].name === 'autounlock') {
                await handler_autounlock();
            } else if (allopt[k].name === 'menu_objsyms') {
                await handler_menu_objsyms();
            } else if (allopt[k].name === 'symset') {
                /* src/options.c handler_symset() via allopt[k].optfn */
                await do_symset(false);
            } else if (allopt[k].name === 'roguesymset') {
                await do_symset(true);
            } else if (allopt[k].name === 'whatis_coord') {
                await handler_whatis_coord();
            } else if (allopt[k].name === 'petattr') {
                await handler_petattr();
            } else if (allopt[k].name === 'align_message'
                       || allopt[k].name === 'align_status') {
                await handler_align_misc(allopt[k].name);
            } else if (allopt[k].name === 'menu_headings') {
                await handler_menu_headings();
            } else if (allopt[k].name === 'paranoid_confirmation') {
                await handler_paranoid_confirmation();
            } else if (allopt[k].name === 'perminv_mode') {
                await handler_perminv_mode();
            } else if (allopt[k].name === 'pickup_burden') {
                await handler_pickup_burden();
            } else if (allopt[k].name === 'sortloot') {
                await handler_sortloot();
            } else if (allopt[k].name === 'whatis_filter') {
                await handler_whatis_filter();
            } else if (allopt[k].name === 'versinfo') {
                await optfn_versinfo();
            } else if (allopt[k].name === 'windowborders') {
                await handler_windowborders();
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
        const flush = game.opt_need_redraw;

        /* src/options.c:8726 — after every pass, so a toggle's disp.botl
           repaints the status rows before the menu is put up again */
        await reset_needed_visuals();
        if (flush)
            await flush_screen(1);
    } while (pickedone > 0);
    game.give_opt_msg = true;
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
// src/symbols.c:909 do_symset() — the symbol set menu for the primary set
// or, with rogueflag, for the rogue level's set. The list is dat/symbols
// (primary_symsets, read at build time); sets restricted to the other level
// and MAC-handled sets are left out as the C does.
async function do_symset(rogueflag) {
    let ready_to_switch = false, nothing_to_do = false;
    let chosen = -2, defindx = 0;
    const which_set = rogueflag ? ROGUESET : PRIMARYSET;
    const symset_name = gs_symset[which_set]?.name || null;
    const symset_list = primary_symsets.filter(sl => sl.name);
    let setcount = 0;

    let biggest = 'Default Symbols'.length;
    for (const sl of symset_list) {
        if (rogueflag ? sl.primary : sl.rogue)
            continue;
        if (sl.handling === H_MAC)
            continue;
        setcount++;
        const thissize = sl.name ? sl.name.length : 0;
        if (thissize > biggest)
            biggest = thissize;
    }
    if (!setcount) {
        await There(`are no appropriate ${rogueflag ? 'rogue level' : 'primary'} symbol sets available.`);
        return true;
    }

    const tmpwin = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);
    let any = 1; /* -1 + 2 [see 'if (sl->name) {' below]*/
    if (!symset_name)
        defindx = any;
    tty_add_menu(tmpwin, null, any, 0, 0, ATR_NONE, NO_COLOR, 'Default Symbols',
                 (any === defindx) ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
    for (const sl of symset_list) {
        if (rogueflag ? sl.primary : sl.rogue)
            continue;
        if (sl.handling === H_MAC)
            continue;
        if (sl.name) {
            /* +2: both symset index and dynamic subindex
               +1 because Defaults are implicitly in slot [0];
               +1 again so that valid data is never 0 */
            any = sl.index + 2;
            if (symset_name && sl.name.toLowerCase() === symset_name.toLowerCase())
                defindx = any;
            const text = `${sl.name.padEnd(biggest + 2)} ${sl.description ? sl.description : ''}`;
            tty_add_menu(tmpwin, null, any, 0, 0, ATR_NONE, NO_COLOR, text,
                         (any === defindx) ? MENU_ITEMFLAGS_SELECTED
                                           : MENU_ITEMFLAGS_NONE);
        }
    }
    tty_end_menu(tmpwin, `Select ${rogueflag ? 'rogue level ' : ''}symbol set:`);
    const picks = await tty_select_menu(tmpwin, PICK_ONE);
    if (picks.length > 0) {
        chosen = picks[0];
        /* if picking the preselected entry yields 2, make sure
           that we're going with the non-preselected one */
        if (picks.length === 2 && chosen === defindx)
            chosen = picks[1];
        chosen -= 2; /* convert menu index to symset index;
                      * "Default symbols" have index -1 */
    } else if (picks.length === 0 && !picks.cancelled && defindx > 0) {
        chosen = defindx - 2;
    }
    tty_destroy_nhwindow(tmpwin);

    if (chosen > -1) {
        /* chose an actual symset name from file */
        const sl = symset_list.find(e => e.index === chosen);
        if (sl) {
            /* free the old one */
            gs_symset[which_set] = { name: sl.name, handling: sl.handling };
            ready_to_switch = true;
        }
    } else if (chosen === -1) {
        /* explicit selection of defaults */
        /* free the old symset name if there is one */
        gs_symset[which_set] = { name: null, handling: H_UNK };
    } else
        nothing_to_do = true;

    if (nothing_to_do)
        return true;

    /* init_rogue_symbols()/init_primary_symbols(), read_sym_file(which_set)
       and switch_symbols(): the loaded sets are the build-time tables */
    if (ready_to_switch && !rogueflag)
        switch_symbols(true);
    if (Is_rogue_level(game.u.uz)) {
        if (rogueflag)
            note_unported_options('do_symset:assign_graphics(ROGUESET)');
    } else if (!rogueflag)
        assign_graphics(gs_symset[PRIMARYSET]?.name || false);
    game.opt_need_redraw = true;
    return true;
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

/* src/options.c handler_disclose() — the disclose option's do_handler:
   pick categories, then a prompt style for each */
async function handler_disclose() {
    /* order of disclose_names[] must correspond to
       disclosure_options in decl.c */
    const disclosure_names = [
        'inventory', 'attributes', 'vanquished',
        'genocides', 'conduct',    'overview',
    ];
    const disclosure_options = 'iavgco';        /* decl.c:54 */
    const disc_cat = new Array(NUM_DISCLOSURE_OPTIONS).fill(0);
    const clr = NO_COLOR;
    const end_disclose = (game.flags.end_disclose || 'nnnnnn').split('');

    let tmpwin = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);
    for (let i = 0; i < NUM_DISCLOSURE_OPTIONS; i++) {
        const buf = `${disclosure_names[i].padEnd(12)}[${end_disclose[i]}${
            disclosure_options[i]}]`;
        tty_add_menu(tmpwin, null, i + 1, disclosure_options[i],
                     0, ATR_NONE, clr, buf, MENU_ITEMFLAGS_NONE);
        disc_cat[i] = 0;
    }
    tty_end_menu(tmpwin, 'Change which disclosure options categories:');
    const picks = await tty_select_menu(tmpwin, PICK_ANY);
    for (const pick of picks)
        disc_cat[pick - 1] = 1;
    tty_destroy_nhwindow(tmpwin);

    for (let i = 0; i < NUM_DISCLOSURE_OPTIONS; i++) {
        if (disc_cat[i]) {
            const c = end_disclose[i];
            const buf = `Disclosure options for ${disclosure_names[i]}:`;
            tmpwin = tty_create_nhwindow(NHW_MENU);
            tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);
            /* 'y','n',and '+' work as alternate selectors; '-' doesn't */
            let a_char = DISCLOSE_NO_WITHOUT_PROMPT;
            tty_add_menu(tmpwin, null, a_char, 0, a_char, ATR_NONE, clr,
                         'Never disclose, without prompting',
                         (c === a_char) ? MENU_ITEMFLAGS_SELECTED
                                        : MENU_ITEMFLAGS_NONE);
            a_char = DISCLOSE_YES_WITHOUT_PROMPT;
            tty_add_menu(tmpwin, null, a_char, 0, a_char, ATR_NONE, clr,
                         'Always disclose, without prompting',
                         (c === a_char) ? MENU_ITEMFLAGS_SELECTED
                                        : MENU_ITEMFLAGS_NONE);
            if (disclosure_names[i][0] === 'v' || disclosure_names[i][0] === 'g') {
                a_char = DISCLOSE_SPECIAL_WITHOUT_PROMPT; /* '#' */
                tty_add_menu(tmpwin, null, a_char, 0, a_char, ATR_NONE, clr,
                             'Always disclose, pick sort order from menu',
                             (c === a_char) ? MENU_ITEMFLAGS_SELECTED
                                            : MENU_ITEMFLAGS_NONE);
            }
            a_char = DISCLOSE_PROMPT_DEFAULT_NO;
            tty_add_menu(tmpwin, null, a_char, 0, a_char, ATR_NONE, clr,
                         'Prompt, with default answer of "No"',
                         (c === a_char) ? MENU_ITEMFLAGS_SELECTED
                                        : MENU_ITEMFLAGS_NONE);
            a_char = DISCLOSE_PROMPT_DEFAULT_YES;
            tty_add_menu(tmpwin, null, a_char, 0, a_char, ATR_NONE, clr,
                         'Prompt, with default answer of "Yes"',
                         (c === a_char) ? MENU_ITEMFLAGS_SELECTED
                                        : MENU_ITEMFLAGS_NONE);
            if (disclosure_names[i][0] === 'v' || disclosure_names[i][0] === 'g') {
                a_char = DISCLOSE_PROMPT_DEFAULT_SPECIAL; /* '?' */
                tty_add_menu(tmpwin, null, a_char, 0, a_char, ATR_NONE, clr,
                             'Prompt, with default answer of "Ask" to request sort menu',
                             (c === a_char) ? MENU_ITEMFLAGS_SELECTED
                                            : MENU_ITEMFLAGS_NONE);
            }
            tty_end_menu(tmpwin, buf);
            const npicks = await tty_select_menu(tmpwin, PICK_ONE);
            if (npicks.length > 0) {
                end_disclose[i] = npicks[0];
                if (npicks.length > 1 && end_disclose[i] === c)
                    end_disclose[i] = npicks[1];
                game.flags.end_disclose = end_disclose.join('');
            }
            tty_destroy_nhwindow(tmpwin);
        }
    }
    return true; /* optn_ok */
}

/* src/windows.c:1816 add_menu_heading() — non-selectable line in
   iflags.menu_headings style (ATR_INVERSE + NO_COLOR by default). */
export function add_menu_heading(tmpwin, buf) {
    let attr = game.iflags?.menu_headings?.attr ?? ATR_INVERSE;
    let color = game.iflags?.menu_headings?.color ?? NO_COLOR;
    if (game.program_state_gameover)
        attr = ATR_NONE, color = NO_COLOR;
    tty_add_menu(tmpwin, null, 0, 0, 0, attr, color, buf,
                 MENU_ITEMFLAGS_SKIPMENUCOLORS);
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
    case 'menucolors': case 'guicolor':
        /* src/options.c:5417 — go.opt_need_promptstyle only feeds the
           curses prompt style */
        update_inventory();
        break;
    default:
        /* customcolors/customsymbols touch palette machinery this port
           does not have */
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
                await do_symset(false);
            } else if (o.hasHandler === 'Yes' && o.name === 'roguesymset') {
                await do_symset(true);
            } else if (o.hasHandler === 'Yes' && o.name === 'sortdiscoveries') {
                await choose_disco_sort(0);
            } else if (o.hasHandler === 'Yes' && o.name === 'menustyle') {
                await handler_menustyle();
            } else if (o.hasHandler === 'Yes' && o.name === 'msg_window') {
                await handler_msg_window();
            } else if (o.hasHandler === 'Yes' && o.name === 'runmode') {
                await handler_runmode();
            } else if (o.hasHandler === 'Yes' && o.name === 'number_pad') {
                await handler_number_pad();
            } else if (o.hasHandler === 'Yes' && o.name === 'sortvanquished') {
                await optfn_sortvanquished();
            } else if (o.hasHandler === 'Yes' && o.name === 'autounlock') {
                await handler_autounlock();
            } else if (o.hasHandler === 'Yes' && o.name === 'menu_objsyms') {
                await handler_menu_objsyms();
            } else if (o.hasHandler === 'Yes' && o.name === 'whatis_coord') {
                await handler_whatis_coord();
            } else if (o.hasHandler === 'Yes' && o.name === 'petattr') {
                await handler_petattr();
            } else if (o.hasHandler === 'Yes' && o.name === 'disclose') {
                /* src/options.c optfn_disclose() do_handler */
                await handler_disclose();
            } else if (o.name === 'menu colors') {
                /* src/options.c:8383 optfn_o_menu_colors() do_handler */
                await handler_menu_colors();
            } else if (o.name === 'bind keys') {
                await handler_rebind_keys();
            } else if (o.name === 'status condition fields') {
                await cond_menu();
            } else if (o.name === 'status highlight rules') {
                await status_hilite_menu();
            } else if (o.name === 'align_message' || o.name === 'align_status') {
                await handler_align_misc(o.name);
            } else if (o.name === 'menu_headings') {
                await handler_menu_headings();
            } else if (o.name === 'paranoid_confirmation') {
                await handler_paranoid_confirmation();
            } else if (o.name === 'perminv_mode') {
                await handler_perminv_mode();
            } else if (o.name === 'pickup_burden') {
                await handler_pickup_burden();
            } else if (o.name === 'sortloot') {
                await handler_sortloot();
            } else if (o.name === 'whatis_filter') {
                await handler_whatis_filter();
            } else if (o.name === 'versinfo') {
                await optfn_versinfo();
            } else if (o.name === 'windowborders') {
                await handler_windowborders();
            } else if (o.name === 'autopickup exceptions') {
                await handler_autopickup_exception();
            } else if (o.name === 'message types') {
                await handler_msgtype();
            } else if (o.hasHandler === 'Yes') {
                note_unported_options(`doset:handler=${o.name}`);
            } else {
                /* compound option without a handler asks for the value */
                const { getlin } = await import('./cmd.js');
                const abuf = await getlin(`Set ${o.name} to what?`);
                if (abuf === null || abuf === '\x1b')
                    continue;
                /* src/options.c doset() — parseoptions(buf, FALSE, FALSE) */
                await parseoptions_interactive(`${o.name}:${abuf}`);
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
        reglyph_darkroom(); /* src/options.c:8999, with check_gold_symbol() */
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

// src/options.c handler_petattr() — optfn_petattr()'s do_handler arm
async function handler_petattr() {
    const tmp = await query_attr('Select pet highlight attribute',
                                 game.iflags?.wc2_petattr ?? ATR_INVERSE);

    if (tmp !== -1) {
        (game.iflags ||= {}).wc2_petattr = tmp;
        set_bool_optval('hilite_pet', game.iflags.wc2_petattr !== ATR_NONE); /* iflags.hilite_pet */
        if (!game.opt_initial)
            game.opt_need_redraw = true;
    }
    return 0; /* optn_ok */
}

// src/options.c:6407 handler_menu_colors()
async function handler_menu_colors() {
    const clr = NO_COLOR;

    for (;;) { /* menucolors_again: */
        const nmc = count_menucolors();
        const opt_idx = await handle_add_list_remove('menucolor', nmc);
        if (opt_idx === 3) { /* done */
            /* menucolors_done: in case we've made a change which impacts
               current persistent inventory window; we don't track whether
               an actual changed occurred, so just assume there was one and
               that it matters; if we're wrong, a redundant update is
               cheap... */
            if (game.iflags?.menucolors) {
                if (game.iflags?.perm_invent)
                    update_inventory();
            }
            return 0; /* optn_ok */

        } else if (opt_idx === 0) { /* add new */
            const { getlin } = await import('./cmd.js');
            const mcbuf = await getlin('What new menucolor pattern?');
            if (mcbuf === null || mcbuf[0] === '\x1b') {
                /* goto menucolors_done */
                if (game.iflags?.menucolors && game.iflags?.perm_invent)
                    update_inventory();
                return 0;
            }
            let mcclr, mcattr;
            if (mcbuf
                && await test_regex_pattern(mcbuf, 'MENUCOLORS regex')
                && (mcclr = await query_color(null, NO_COLOR)) !== -1
                    && (mcattr = await query_attr(null, ATR_NONE)) !== -1
                && !add_menu_coloring_parsed(mcbuf, mcclr, mcattr)) {
                await pline('Error adding the menu color.');
                await tty_wait_synch();
            }
            continue; /* goto menucolors_again */

        } else { /* list (1) or remove (2) */
            const tmpwin = tty_create_nhwindow(NHW_MENU);
            tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);
            let mc_idx = 0;
            for (const tmp of game.menu_colorings || []) {
                const sattr = attr2attrname(tmp.attr);
                const sclr = strNsubst(clr2colorname(tmp.color), ' ', '-', 0);
                const any = ++mc_idx;
                /* construct suffix */
                const buf = `""=${sclr}${tmp.attr !== ATR_NONE ? '&' : ''}${
                    tmp.attr !== ATR_NONE ? sattr : ''}`;
                /* now main string */
                const ln = BUFSZ - buf.length - 1; /* length available */
                let mcbuf = '"';
                if (tmp.origstr.length > ln)
                    mcbuf += tmp.origstr.slice(0, ln - 3) + '...';
                else
                    mcbuf += tmp.origstr;
                /* combine main string and suffix */
                mcbuf += buf.slice(1); /* skip buf[]'s initial quote */
                tty_add_menu(tmpwin, null, any, 0, 0,
                             ATR_NONE, clr, mcbuf, MENU_ITEMFLAGS_NONE);
            }
            tty_end_menu(tmpwin, `${(opt_idx === 1) ? 'List of' : 'Remove which'} menu colors`);
            const pick_list = await tty_select_menu(tmpwin,
                                                    (opt_idx === 1) ? PICK_NONE : PICK_ANY);
            const pick_cnt = pick_list.cancelled ? -1 : pick_list.length;
            if (pick_cnt > 0) {
                for (let pick_idx = 0; pick_idx < pick_cnt; ++pick_idx)
                    free_one_menu_coloring(pick_list[pick_idx] - 1 - pick_idx);
            }
            tty_destroy_nhwindow(tmpwin);
            if (pick_cnt >= 0)
                continue; /* goto menucolors_again */
        }
        return 0; /* optn_ok */
    }
}

// src/options.c:7676 msgtype_names[]
const msgtype_names = [ /* name, msgtyp, descr */
    ['show', MSGTYP_NORMAL, 'Show message normally'],
    ['hide', MSGTYP_NOSHOW, 'Hide message'],
    ['noshow', MSGTYP_NOSHOW, null],
    ['stop', MSGTYP_STOP, 'Prompt for more after the message'],
    ['more', MSGTYP_STOP, null],
    ['norep', MSGTYP_NOREP, 'Do not repeat the message'],
];

// src/options.c:7690 msgtype2name()
function msgtype2name(typ) {
    for (let i = 0; i < msgtype_names.length; i++)
        if (msgtype_names[i][2] && msgtype_names[i][1] === typ)
            return msgtype_names[i][0];
    return null;
}

// src/options.c:7701 query_msgtype()
async function query_msgtype() {
    const clr = NO_COLOR;

    const tmpwin = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);
    for (let i = 0; i < msgtype_names.length; i++)
        if (msgtype_names[i][2]) {
            tty_add_menu(tmpwin, null, msgtype_names[i][1] + 1, 0, 0,
                         ATR_NONE, clr,
                         msgtype_names[i][2], MENU_ITEMFLAGS_NONE);
        }
    tty_end_menu(tmpwin, 'How to show the message');
    const picks = await tty_select_menu(tmpwin, PICK_ONE);
    tty_destroy_nhwindow(tmpwin);
    if (picks.length > 0)
        return picks[0] - 1;
    return -1;
}

// src/options.c:7731 msgtype_add() — gp.plinemsg_types is newest first, as
// the C's prepended list is
function msgtype_add(typ, pattern) {
    const re_error = 'MSGTYPE regex error';
    const tmp = { msgtype: typ, regex: regex_init(), pattern: null };

    /* test_regex_pattern() has already validated this regexp but parsing
       it again could conceivably run out of memory */
    if (!regex_compile(pattern, tmp.regex)) {
        const re_error_desc = regex_error_desc(tmp.regex);

        /* free first in case reason for failure was insufficient memory */
        regex_free(tmp.regex);
        config_error_add(`${re_error}: ${re_error_desc}`);
        return false;
    }
    tmp.pattern = pattern;
    (gp.plinemsg_types ||= []).unshift(tmp);
    return true;
}

// src/options.c:7772 free_one_msgtype()
function free_one_msgtype(idx) { /* 0 .. */
    const list = gp.plinemsg_types || [];

    if (idx >= 0 && idx < list.length) {
        regex_free(list[idx].regex);
        list.splice(idx, 1);
    }
}

// src/options.c:7797 msgtype_type()
export function msgtype_type(msg, norepeat) { /* called from Norep(via pline) */
    for (const tmp of gp.plinemsg_types || []) {
        /* we don't exclude entries with negative msgtype values
           because then the msg might end up matching a later pattern */
        if (regex_match(msg, tmp.regex))
            return tmp.msgtype;
    }
    return norepeat ? MSGTYP_NOREP : MSGTYP_NORMAL;
}

// src/options.c:7831 msgtype_count()
function msgtype_count() {
    return (gp.plinemsg_types || []).length;
}

// src/options.c:7871 test_regex_pattern()
async function test_regex_pattern(str, errmsg) {
    const def_errmsg = 'NHregex error';

    if (!str)
        return false;
    if (!errmsg)
        errmsg = def_errmsg;

    const match = regex_init();
    if (!match) {
        await config_error_add(errmsg);
        return false;
    }

    const retval = regex_compile(str, match);
    /* get potential error message before freeing regexp and free regexp
       before issuing message in case the error is "ran out of memory"
       since message delivery might need to allocate some memory */
    const re_error_desc = !retval ? regex_error_desc(match) : null;
    /* discard regexp; caller will re-parse it after validating other stuff */
    regex_free(match);
    /* if returning failure, tell player */
    if (!retval)
        await config_error_add(`${errmsg}: ${re_error_desc}`);

    return retval;
}

// src/options.c:9208 handle_add_list_remove() — the add/list/remove/exit
// picker shared by the list-valued option handlers; returns the index of
// the action chosen (3 = exit)
async function handle_add_list_remove(optname, numtotal) {
    const action_titles = [
        ['a', 'add new %s'],         /* [0] */
        ['l', 'list %s'],            /* [1] */
        ['r', 'remove existing %s'], /* [2] */
        ['x', 'exit this menu'],     /* [3] */
    ];
    const clr = NO_COLOR;
    let opt_idx;

    const tmpwin = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);
    let any = 0;
    for (let i = 0; i < action_titles.length; i++) {
        any++;
        /* omit list and remove if there aren't any yet */
        if (!numtotal && (i === 1 || i === 2))
            continue;
        const tmpbuf = action_titles[i][1].replace(
            '%s', (i === 1) ? makeplural(optname) : optname);
        tty_add_menu(tmpwin, null, any, action_titles[i][0],
                     0, ATR_NONE, clr, tmpbuf,
                     (i === 3) ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(tmpwin, 'Do what?');
    const pick_list = await tty_select_menu(tmpwin, PICK_ONE);
    const pick_cnt = pick_list.cancelled ? -1 : pick_list.length;
    if (pick_cnt > 0) {
        opt_idx = pick_list[0] - 1;
        if (pick_cnt > 1 && opt_idx === 3)
            opt_idx = pick_list[1] - 1;
    } else
        opt_idx = 3; /* none selected, exit menu */
    tty_destroy_nhwindow(tmpwin);
    return opt_idx;
}

// src/options.c:9285 count_apes()
function count_apes() {
    return (game.apelist || []).length;
}

/* sscanf(mapping, "\"<%253[^\"]\" %c", text, &end) and its two siblings:
   'lead' is the literal prefix; n counts the assigned items the way sscanf
   does (the %[ set needs at least one character, a missing closing quote
   still leaves text assigned, and the %c after the blank is the next
   non-space character if any) */
function scan_ape(mapping, lead) {
    if (!mapping.startsWith(lead))
        return null;
    let i = lead.length, text = '';
    while (i < mapping.length && mapping[i] !== '"' && text.length < 253)
        text += mapping[i++];
    if (!text)
        return null;
    if (mapping[i] !== '"')
        return { n: 1, text };
    i++;
    while (i < mapping.length && /\s/.test(mapping[i]))
        i++;
    if (i >= mapping.length)
        return { n: 1, text };
    return { n: 2, text, end: mapping[i] };
}

// src/options.c:9300 add_autopickup_exception() — game.apelist is newest
// first, as the C's prepended list is
export function add_autopickup_exception(mapping) {
    const APE_regex_error = 'regex error in AUTOPICKUP_EXCEPTION',
          APE_syntax_error = 'syntax error in AUTOPICKUP_EXCEPTION';
    let r, grab = false;

    /* scan length limit used to be 255, but smaller size allows the
       quoted value to fit within BUFSZ, simplifying formatting elsewhere;
       this used to ignore the possibility of trailing junk but now checks
       for it, accepting whitespace but rejecting anything else unless it
       starts with '#" for a comment */
    if ((r = scan_ape(mapping, '"<')) && (r.n === 1
                                          || (r.n === 2 && r.end === '#'))) {
        grab = true;
    } else if (((r = scan_ape(mapping, '">')) && r.n === 1)
               || ((r = scan_ape(mapping, '"'))
                   && (r.n === 1 || (r.n === 2 && r.end === '#')))) {
        grab = false;
    } else {
        config_error_add(APE_syntax_error);
        return 0;
    }
    const text = r.text;

    const ape = { regex: regex_init(), pattern: null, grab: false };
    if (!regex_compile(text, ape.regex)) {
        const re_error_desc = regex_error_desc(ape.regex);

        /* free first in case reason for failure was insufficient memory */
        regex_free(ape.regex);
        config_error_add(`${APE_regex_error}: ${re_error_desc}`);
        return 0;
    }
    ape.pattern = text;
    ape.grab = grab;
    (game.apelist ||= []).unshift(ape);
    return 1;
}

// src/options.c:9349 remove_autopickup_exception()
function remove_autopickup_exception(whichape) {
    const apelist = game.apelist || [];

    for (let i = 0; i < apelist.length; ) {
        if (apelist[i] === whichape) {
            regex_free(apelist[i].regex);
            apelist.splice(i, 1);
        } else {
            i++;
        }
    }
}

// src/options.c:5544 handler_menustyle().
// src/options.c optfn_sortvanquished(), the do_handler arm
async function optfn_sortvanquished() {
    const optname = 'sortvanquished';
    const prev_sortmode = game.flags.vanq_sortmode ?? 0;

    /* return handler_sortvanquished(); */
    await set_vanq_order(true); /* insight.c */
    const mode = game.flags.vanq_sortmode ?? 0;
    await pline(`'${optname}' ${(mode === prev_sortmode)
                                 ? 'not changed, still' : 'changed to'} "${
                vanqorders[mode][0]}: ${vanqorders[mode][1]}".`);
    return 0;
}

// src/options.c:5488 can_set_perm_invent()
function can_set_perm_invent() {
    /*
     * Assumption: only called when iflags.perm_invent is False
     * and is about to be changed to True.
     */
    if (!wc_supported('perm_invent')) /* windowprocs.wincap & WC_PERM_INVENT */
        return false;

    if ((game.iflags?.perminv_mode ?? InvOptNone) === InvOptNone)
        (game.iflags ||= {}).perminv_mode = InvOptOn;

    /* TTY_PERM_INVENT is not defined in the reference build */
    return true;
}

// src/options.c:5586 handler_align_misc()
async function handler_align_misc(optidx) {
    const clr = NO_COLOR;

    const tmpwin = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);
    tty_add_menu(tmpwin, null, ALIGN_TOP, 't', 0, ATR_NONE, clr, 'top',
                 MENU_ITEMFLAGS_NONE);
    tty_add_menu(tmpwin, null, ALIGN_BOTTOM, 'b', 0, ATR_NONE, clr, 'bottom',
                 MENU_ITEMFLAGS_NONE);
    tty_add_menu(tmpwin, null, ALIGN_LEFT, 'l', 0, ATR_NONE, clr, 'left',
                 MENU_ITEMFLAGS_NONE);
    tty_add_menu(tmpwin, null, ALIGN_RIGHT, 'r', 0, ATR_NONE, clr, 'right',
                 MENU_ITEMFLAGS_NONE);
    const abuf = `Select ${(optidx === 'align_message') ? 'message' : 'status'
                 } window placement relative to the map:`;
    tty_end_menu(tmpwin, abuf);
    const window_pick = await tty_select_menu(tmpwin, PICK_ONE);
    if (window_pick.length > 0) {
        if (optidx === 'align_message')
            (game.iflags ||= {}).wc_align_message = window_pick[0];
        else
            (game.iflags ||= {}).wc_align_status = window_pick[0];
    }
    tty_destroy_nhwindow(tmpwin);
    return 0;
}

// src/options.c:5780 handler_menu_headings()
async function handler_menu_headings() {
    const ca = ((game.iflags ||= {}).menu_headings
                ??= { color: NO_COLOR, attr: ATR_INVERSE });
    const gotca = await query_color_attr(ca, 'How to highlight menu headings:');

    if (gotca) {
        /* header highlighting affects persistent inventory display */
        if (game.iflags.perm_invent)
            update_inventory();
    }
    adjust_menu_promptstyle(ca); /* (WIN_INVEN, &iflags.menu_headings) */
    return 0;
}

// src/options.c:5953 handler_paranoid_confirmation()
async function handler_paranoid_confirmation() {
    let mkey, mbuf, explain, cmdnm;
    const clr = NO_COLOR;
    const { cmd_from_func, cmdname_from_func } = await import('./cmd.js');

    const tmpwin = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);
    for (let i = 0; i < paranoia.length; ++i) {
        const [flagmask, argname] = paranoia[i];

        if (flagmask === PARANOID_BONES && !game.wizard)
            continue;
        /* the 'swim' choice mentions the 'm' movement prefix in its
           explanation; if that's been bound to something else or been
           unbound altogether, substitute the replacement in the text */
        explain = paranoia[i][2];
        if (strstri(explain, "'m'") >= 0
            && (mkey = cmd_from_func('reqmenu')) !== 'm') {
            if (mkey !== '\0') { /* key for 'm' prefix */
                mbuf = `'${visctrl(mkey).slice(0, 9)}'`; /* .5 is enough */
            } else { /* extended command name for 'm' prefix */
                cmdnm = cmdname_from_func('reqmenu', true);
                if (!cmdnm)
                    cmdnm = 'reqmenu';
                mbuf = `'${(cmdnm[0] !== '#') ? '#' : ''}${cmdnm.slice(0, 31)}'`;
            }
            explain = strsubst(explain, "'m'", mbuf);
        }
        tty_add_menu(tmpwin, null, flagmask, argname[0],
                     0, ATR_NONE, clr, explain,
                     (paranoia_bits() & flagmask)
                         ? MENU_ITEMFLAGS_SELECTED
                         : MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(tmpwin, 'Actions requiring extra confirmation:');
    const paranoia_picks = await tty_select_menu(tmpwin, PICK_ANY);
    let i = paranoia_picks.cancelled ? -1 : paranoia_picks.length;
    if (i >= 0) {
        /* player didn't cancel; we reset all the paranoia options
           here even if there were no items picked, since user
           could have toggled off preselected ones to end up with 0 */
        game.flags.paranoia_bits = 0;
        if (i > 0) {
            /* at least 1 item set, either preselected or newly picked */
            while (--i >= 0)
                game.flags.paranoia_bits |= paranoia_picks[i];
        }
    }
    tty_destroy_nhwindow(tmpwin);
    return 0;
}

// src/options.c:6011 handler_perminv_mode()
async function handler_perminv_mode() {
    let let_, buf, sepbuf;
    const old_perm_invent = !!game.iflags?.perm_invent;
    const old_pi = game.iflags?.perminv_mode ?? InvOptNone;
    let new_pi = old_pi;
    const widest = 11; /* WINDOWPORT(tty): "full+grid__" */

    const tmpwin = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);
    for (let i = 0; i < perminv_modes.length; ++i) {
        const pi0 = perminv_modes[i][0];
        if (!pi0)
            continue;
        const pi1 = perminv_modes[i][1];
        if (!game.iflags?.menu_tab_sep) {
            const numspaces = widest - pi0.length;

            sepbuf = ' '.repeat(Math.max(numspaces, 1)); /* "%*s" */
        } else {
            sepbuf = '\t';
        }
        buf = `${pi0}${sepbuf}${perminv_modes[i][2]}`;
        let_ = ((i & InvSparse) !== 0) ? highc(pi1[0]) : pi0[0];
        tty_add_menu(tmpwin, null, i + 1, let_, String.fromCharCode(48 + i),
                     ATR_NONE, NO_COLOR,
                     buf, (i === old_pi) ? MENU_ITEMFLAGS_SELECTED
                                         : MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(tmpwin, 'Choose permanent inventory mode:');
    const pi_pick = await tty_select_menu(tmpwin, PICK_ONE);
    const n = pi_pick.cancelled ? -1 : pi_pick.length;
    tty_destroy_nhwindow(tmpwin);
    if (n > 0) {
        new_pi = pi_pick[0] - 1;
        if (n > 1 && new_pi === old_pi)
            new_pi = pi_pick[1] - 1;
        (game.iflags ||= {}).perminv_mode = new_pi;
    }
    if (n >= 0) { /* not ESC */
        /* optfn_perminv_mode(opt_perm_invent, get_val, FALSE, buf, NULL):
           with a Null 'op' the value is just the mode's explanation */
        buf = perminv_modes[game.iflags?.perminv_mode ?? InvOptNone][2];
        await pline(`'perminv_mode' ${
            (new_pi !== old_pi) ? 'changed to' : 'is still'} '${
            perminv_modes[new_pi][0]}' (${buf}).`);
        if (new_pi !== InvOptNone && !old_perm_invent)
            (game.iflags ||= {}).perm_invent = can_set_perm_invent();
        else if (new_pi === InvOptNone && old_perm_invent)
            game.iflags.perm_invent = false;

        if (new_pi !== old_pi || !!game.iflags?.perm_invent !== old_perm_invent) {
            game.opt_need_redraw = true;
        }
    }
    return 0;
}

// src/options.c:6086 handler_pickup_burden()
async function handler_pickup_burden() {
    const burden_letters = 'ubsntl';
    const clr = NO_COLOR;

    const tmpwin = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);
    for (let i = 0; i < burdentype.length; i++) {
        const burden_name = burdentype[i];
        tty_add_menu(tmpwin, null, i + 1, burden_letters[i],
                     0, ATR_NONE, clr, burden_name, MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(tmpwin, 'Select encumbrance level:');
    const burden_pick = await tty_select_menu(tmpwin, PICK_ONE);
    if (burden_pick.length > 0)
        game.flags.pickup_burden = burden_pick[0] - 1;
    tty_destroy_nhwindow(tmpwin);
    return 0;
}

// src/options.c:6167 handler_sortloot()
async function handler_sortloot() {
    const clr = NO_COLOR;

    const tmpwin = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);
    for (let i = 0; i < sortltype.length; i++) {
        const sortl_name = sortltype[i];
        tty_add_menu(tmpwin, null, sortl_name[0], sortl_name[0],
                     0, ATR_NONE, clr,
                     sortl_name, ((game.flags?.sortloot ?? 'l') === sortl_name[0])
                                    ? MENU_ITEMFLAGS_SELECTED
                                    : MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(tmpwin, 'Select loot sorting type:');
    const sortl_pick = await tty_select_menu(tmpwin, PICK_ONE);
    const n = sortl_pick.cancelled ? -1 : sortl_pick.length;
    if (n > 0) {
        let c = sortl_pick[0];

        if (n > 1 && c === (game.flags?.sortloot ?? 'l'))
            c = sortl_pick[1];
        game.flags.sortloot = c;
        /* changing to or from 'f' affects persistent inventory display */
        if (game.iflags?.perm_invent)
            update_inventory();
    }
    tty_destroy_nhwindow(tmpwin);
    return 0;
}

// src/options.c:6279 handler_whatis_filter()
async function handler_whatis_filter() {
    const gfilt = game.iflags?.getloc_filter ?? GFILTER_NONE;
    const clr = NO_COLOR;

    const tmpwin = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);
    tty_add_menu(tmpwin, null, GFILTER_NONE + 1, 'n',
                 0, ATR_NONE, clr, 'no filtering',
                 (gfilt === GFILTER_NONE)
                    ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
    tty_add_menu(tmpwin, null, GFILTER_VIEW + 1, 'v',
                 0, ATR_NONE, clr, 'in view only',
                 (gfilt === GFILTER_VIEW)
                    ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
    tty_add_menu(tmpwin, null, GFILTER_AREA + 1, 'a',
                 0, ATR_NONE, clr, 'in same area',
                 (gfilt === GFILTER_AREA)
                    ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
    tty_end_menu(tmpwin,
      'Select location filtering when going for next/previous map position:');
    const window_pick = await tty_select_menu(tmpwin, PICK_ONE);
    const pick_cnt = window_pick.cancelled ? -1 : window_pick.length;
    if (pick_cnt > 0) {
        (game.iflags ||= {}).getloc_filter = (window_pick[0] - 1);
        /* PICK_ONE doesn't unselect preselected entry when
           selecting another one */
        if (pick_cnt > 1 && game.iflags.getloc_filter === gfilt)
            game.iflags.getloc_filter = (window_pick[1] - 1);
    }
    tty_destroy_nhwindow(tmpwin);
    return 0;
}

// src/options.c:6331 handler_autopickup_exception()
async function handler_autopickup_exception() {
    const clr = NO_COLOR;
    const { getlin } = await import('./cmd.js');

    for (;;) { /* ape_again: */
        const numapes = count_apes();
        const opt_idx = await handle_add_list_remove('autopickup exception',
                                                     numapes);
        if (opt_idx === 3) { /* done */
            return true;
        } else if (opt_idx === 0) { /* add new */
            /* EDIT_GETLIN:  assume user doesn't user want previous
               exception used as default input string for this one... */
            let apebuf = await getlin('What new autopickup exception pattern?');
            apebuf = mungspaces(apebuf ?? '\x1b'); /* regularize whitespace */
            if (apebuf[0] === '\x1b')
                return true;
            if (apebuf) {
                /* guarantee room for \" prefix and \"\0 suffix;
                   -2 is good enough for apebuf[] but -3 makes
                   sure the whole thing fits within normal BUFSZ */
                apebuf = ('"' + apebuf).slice(0, BUFSZ) + '"';
                add_autopickup_exception(apebuf);
            }
            continue; /* goto ape_again */
        } else { /* list (1) or remove (2) */
            const tmpwin = tty_create_nhwindow(NHW_MENU);
            tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);
            if (numapes) {
                const apelist = game.apelist || [];
                add_menu_heading(tmpwin,
                                 "Always pickup '<'; never pickup '>'");
                for (let i = 0; i < numapes && i < apelist.length; i++) {
                    const ape = apelist[i];
                    const any = (opt_idx === 1) ? 0 : ape;
                    /* length of pattern plus quotes (plus '<'/'>') is
                       less than BUFSZ */
                    const apebuf = `"${ape.grab ? '<' : '>'}${ape.pattern}"`;
                    tty_add_menu(tmpwin, null, any, 0, 0,
                                 ATR_NONE, clr, apebuf, MENU_ITEMFLAGS_NONE);
                }
            }
            tty_end_menu(tmpwin, `${(opt_idx === 1) ? 'List of' : 'Remove which'
                                   } autopickup exceptions`);
            const pick_list = await tty_select_menu(tmpwin,
                                                    (opt_idx === 1) ? PICK_NONE
                                                                    : PICK_ANY);
            const pick_cnt = pick_list.cancelled ? -1 : pick_list.length;
            if (pick_cnt > 0) {
                for (let pick_idx = 0; pick_idx < pick_cnt; ++pick_idx)
                    remove_autopickup_exception(pick_list[pick_idx]);
            }
            tty_destroy_nhwindow(tmpwin);
            if (pick_cnt >= 0)
                continue; /* goto ape_again */
        }
        return 0; /* optn_ok */
    }
}

// src/options.c:6502 handler_msgtype()
async function handler_msgtype() {
    const { getlin } = await import('./cmd.js');

    for (;;) { /* msgtypes_again: */
        const nmt = msgtype_count();
        const opt_idx = await handle_add_list_remove('message type', nmt);
        if (opt_idx === 3) { /* done */
            return true;
        } else if (opt_idx === 0) { /* add new */
            const mtbuf = await getlin('What new message pattern?');
            if (mtbuf === null || mtbuf[0] === '\x1b')
                return true;
            let mttyp;
            if (mtbuf
                && await test_regex_pattern(mtbuf, 'MSGTYPE regex')
                && (mttyp = await query_msgtype()) !== -1
                && !msgtype_add(mttyp, mtbuf)) {
                await pline('Error adding the message type.');
                await tty_wait_synch();
            }
            continue; /* goto msgtypes_again */
        } else { /* list (1) or remove (2) */
            const clr = NO_COLOR;

            const tmpwin = tty_create_nhwindow(NHW_MENU);
            tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);
            let mt_idx = 0;
            for (const tmp of gp.plinemsg_types || []) {
                const mtype = msgtype2name(tmp.msgtype);
                const any = ++mt_idx;
                let mtbuf = `${String(mtype).padEnd(5)} "`; /* "%-5s \"" */
                const ln = BUFSZ - mtbuf.length - 2; /* sizeof "\"" */
                if (tmp.pattern.length > ln)
                    mtbuf += tmp.pattern.slice(0, ln - 3) + '..."';
                else
                    mtbuf += tmp.pattern + '"';
                tty_add_menu(tmpwin, null, any, 0, 0,
                             ATR_NONE, clr, mtbuf, MENU_ITEMFLAGS_NONE);
            }
            tty_end_menu(tmpwin, `${(opt_idx === 1) ? 'List of' : 'Remove which'
                                   } message types`);
            const pick_list = await tty_select_menu(tmpwin,
                                                    (opt_idx === 1) ? PICK_NONE
                                                                    : PICK_ANY);
            const pick_cnt = pick_list.cancelled ? -1 : pick_list.length;
            if (pick_cnt > 0) {
                for (let pick_idx = 0; pick_idx < pick_cnt; ++pick_idx)
                    free_one_msgtype(pick_list[pick_idx] - 1 - pick_idx);
            }
            tty_destroy_nhwindow(tmpwin);
            if (pick_cnt >= 0)
                continue; /* goto msgtypes_again */
        }
        return 0; /* optn_ok */
    }
}

// src/options.c:6573 handler_versinfo()
async function handler_versinfo() {
    const have_branch = false; /* nomakedefs.git_branch is empty, version.js */
    const vi = game.flags?.versinfo ?? 1;
    let n;

    const tmpwin = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);

    n = VI_NUMBER; /* 1 */
    tty_add_menu(tmpwin, null, n, 'n', String.fromCharCode(n + 48), ATR_NONE,
                 NO_COLOR, 'version number',
                 (vi & n) ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
    n = VI_NAME; /* 2 */
    tty_add_menu(tmpwin, null, n, 'g', String.fromCharCode(n + 48), ATR_NONE,
                 NO_COLOR, 'game name',
                 (vi & n) ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
    n = VI_BRANCH; /* 4 */
    tty_add_menu(tmpwin, null, n, 'b', String.fromCharCode(n + 48), ATR_NONE,
                 NO_COLOR,
                 (have_branch ? 'development branch'
                              : '(not applicable)'), /* NH_STATUS_RELEASED */
                 (vi & n) ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);

    tty_end_menu(tmpwin, 'Select version information flags:');
    const vi_pick = await tty_select_menu(tmpwin, PICK_ANY);
    n = vi_pick.cancelled ? -1 : vi_pick.length;
    if (n > 0) {
        let newval = 0;

        for (let i = 0; i < n; ++i)
            newval |= vi_pick[i];
        newval &= 7;
        if (newval)
            game.flags.versinfo = newval;
    }
    tty_destroy_nhwindow(tmpwin);
    return 0;
}

// src/options.c:4472 optfn_versinfo(), the do_handler arm
async function optfn_versinfo() {
    const optname = 'versinfo';
    const vi = game.flags?.versinfo ?? 1;

    /* return handler_versinfo(); */
    await handler_versinfo();
    await pline(`'${optname}' ${
        ((game.flags?.versinfo ?? 1) === vi) ? 'not changed, still'
                                             : 'changed to'} ${
        game.flags?.versinfo ?? 1}.`);
    return 0;
}

// src/options.c:6620 handler_windowborders()
async function handler_windowborders() {
    const clr = NO_COLOR;
    const windowborders_text = [
        'Off, never show borders',
        'On, always show borders',
        'Auto, on if display is at least (24+2)x(80+2)',
        'On, except forced off for perm_invent',
        'Auto, except forced off for perm_invent',
    ];

    const tmpwin = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);
    for (let i = 0; i < windowborders_text.length; i++) {
        const mode_name = windowborders_text[i];
        /* index 'i' matches the numeric setting for windowborders,
           so allow corresponding digit as group accelerator */
        tty_add_menu(tmpwin, null, i + 1, String.fromCharCode(97 + i),
                     String.fromCharCode(48 + i),
                     ATR_NONE, clr, mode_name, MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(tmpwin, 'Select window borders mode:');
    const mode_pick = await tty_select_menu(tmpwin, PICK_ONE);
    if (mode_pick.length > 0)
        (game.iflags ||= {}).wc2_windowborders = mode_pick[0] - 1;
    tty_destroy_nhwindow(tmpwin);
    return 0;
}

// src/options.c handler_number_pad()
async function handler_number_pad() {
    const npchoices = [
        ' 0 (off)', ' 1 (on)', ' 2 (on, MSDOS compatible)',
        ' 3 (on, phone-style digit layout)',
        ' 4 (on, phone-style layout, MSDOS compatible)',
        "-1 (off, 'z' to move upper-left, 'y' to zap wands)",
    ];
    const tmpwin = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);
    for (let i = 0; i < npchoices.length; i++)
        tty_add_menu(tmpwin, null, i + 1, String.fromCharCode(97 + i),
                     String.fromCharCode(48 + i), ATR_NONE, NO_COLOR,
                     npchoices[i], MENU_ITEMFLAGS_NONE);
    tty_end_menu(tmpwin, 'Select number_pad mode:');
    const mode_pick = await tty_select_menu(tmpwin, PICK_ONE);
    if (mode_pick.length > 0) {
        const iflags = (game.iflags ||= {});
        switch (mode_pick[0] - 1) {
        case 0:
            iflags.num_pad = false;
            iflags.num_pad_mode = 0;
            break;
        case 1:
            iflags.num_pad = true;
            iflags.num_pad_mode = 0;
            break;
        case 2:
            iflags.num_pad = true;
            iflags.num_pad_mode = 1;
            break;
        case 3:
            iflags.num_pad = true;
            iflags.num_pad_mode = 2;
            break;
        case 4:
            iflags.num_pad = true;
            iflags.num_pad_mode = 3;
            break;
        /* last menu choice: number_pad == -1 */
        case 5:
            iflags.num_pad = false;
            iflags.num_pad_mode = 1;
            break;
        }
        reset_commands(false);
        /* number_pad(iflags.num_pad ? 1 : 0): tty_number_pad() only writes
           the termcap keypad strings, which have no screen cells */
    }
    tty_destroy_nhwindow(tmpwin);
    return 0;
}

// src/options.c handler_runmode()
async function handler_runmode() {
    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    for (let i = 0; i < runmodes.length; i++) {
        const mode_name = runmodes[i];
        tty_add_menu(win, null, i + 1, mode_name[0], 0, ATR_NONE, NO_COLOR,
                     mode_name, MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(win, 'Select run/travel display mode:');
    const picks = await tty_select_menu(win, PICK_ONE);
    if (picks.length)
        game.flags.runmode = picks[0] - 1;
    tty_destroy_nhwindow(win);
    return 0;
}

// src/options.c handler_msg_window() — by Christian W. Cooper
async function handler_msg_window() {
    const msgwind = [ /* 'msg_window' settings */
        ['single',      '[show one old message at a time,',
                        ' most recent first]'],
        ['combination', '[for consecutive ^P requests, use',
                        " 'single' for first two, then 'full']"],
        ['full',        '[show all available messages,',
                        ' oldest first and most recent last]'],
        ['reversed',    '[show all available messages,',
                        ' most recent first]'],
    ];
    const sep = game.iflags?.menu_tab_sep ? '\t' : ' ';
    const old_prevmsg_window = game.iflags?.prevmsg_window ?? 's';
    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    for (const [name, d1, d2] of msgwind) {
        /* Sprintf(buf, "%-12.12s%c%.60s", ...) */
        const buf = name.slice(0, 12).padEnd(12) + sep + d1.slice(0, 60);
        const c = name[0];
        tty_add_menu(win, null, c, buf[0], 0, ATR_NONE, NO_COLOR, buf,
                     (c === old_prevmsg_window) ? MENU_ITEMFLAGS_SELECTED
                                               : MENU_ITEMFLAGS_NONE);
        /* second line is prefixed by spaces that "c - " would use */
        tty_add_menu_str(win, ' '.repeat(4) + ' '.repeat(12) + sep
                              + d2.slice(0, 60));
    }
    tty_end_menu(win, 'Select message history display type:');
    const picks = await tty_select_menu(win, PICK_ONE);
    if (picks.length) {
        let c = picks[0];
        /* if there are two picks, use the one that wasn't pre-selected */
        if (picks.length > 1 && c === old_prevmsg_window)
            c = picks[1];
        (game.iflags ||= {}).prevmsg_window = c;
    }
    tty_destroy_nhwindow(win);
    const now = game.iflags?.prevmsg_window ?? 's';
    const chngd = now !== old_prevmsg_window;
    if (chngd || game.flags.verbose !== false) {
        const buf = (now === 's') ? 'single' : (now === 'c') ? 'combination'
                    : (now === 'f') ? 'full' : 'reversed';
        await pline(`'msg_window' ${chngd ? 'changed to' : 'is still'} "${buf}".`);
    }
    return 0;
}

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
            config_error_add(error);
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

// src/options.c parseoptions(opts, FALSE, FALSE) as the 'O' command calls it
// for a typed compound value. The C's per-option handlers write the live
// variables and report problems through config_error_add(); in play,
// src/cfgfiles.c:1554 config_erradd() prints each one with pline() (adding a
// period when the text has no end punctuation) and calls wait_synch(). Our
// parseoptions() collects into `result`, so the live store is written and the
// errors are printed here, in the same order.
async function parseoptions_interactive(buf) {
    const result = { opts: {}, errors: [] };
    if (game.flags?.inv_order) /* change_inv_order()'s "previous" is live */
        result.opts.inv_order = game.flags.inv_order;
    config_error_data = result; /* config_error_init() */
    parseoptions(buf, false, false, result);
    config_error_data = null;
    for (const [name, value] of Object.entries(result.opts)) {
        if (name === 'fruit') {
            set_fruit_name(value);
        } else if (name === 'num_pad' || name === 'num_pad_mode') {
            /* optfn_number_pad() writes iflags */
            (game.iflags ||= {})[name] = value;
        } else if (name === 'statuslines') {
            /* iflags.wc2_statuslines; the 3-line status layout itself is
               not ported, so a changed value is only recorded */
            if ((game.iflags.wc2_statuslines | 0) !== value)
                note_unported_options(`statuslines:${value}`);
            game.iflags.wc2_statuslines = value;
        } else {
            game.flags[name] = value;
        }
    }
    if ('num_pad' in result.opts)
        reset_commands(false);      /* optfn_number_pad() do_set tail */
    for (const error of result.errors) {
        await pline(error + (/[.!?]$/.test(error) ? '' : '.'));
        await tty_wait_synch();
    }
}

// Interactive config_erradd() prints errors immediately with punctuation.
async function set_packorder(value) {
    value = value.trimEnd();
    if (!value)
        return; // optfn_packorder rejects empty_optstr without changing order.
    const result = { opts: game.flags, errors: [] };
    config_error_data = result;
    change_inv_order(value, result);
    config_error_data = null;
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
    config_error_data = result;
    parseoptions('pickup_types:' + (op || 'a'), false, false, result);
    config_error_data = null;
    for (const error of result.errors)
        await pline(error + (/[.!?]$/.test(error) ? '' : '.'));
}
