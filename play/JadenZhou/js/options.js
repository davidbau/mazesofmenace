// options.js — Parse .nethackrc options.
// C ref: options.c — handles OPTIONS=, BIND=, etc.
//
// The role, race, gender, alignment, name and female/male options are
// ported from options.c (optfn_role(), optfn_race(), optfn_gender(),
// optfn_alignment(), parse_role_opt(), optfn_name() and the opt_female
// boolean case), and playmode (optfn_playmode(), set_playmode()); they set
// flags.initrole &c, wizard and discover the way C does. The rest of
// this parser is still the skeleton's simplified version.

import { choose_disco_sort } from './o_init.js';
import { def_char_to_monclass } from './drawing.js';
import { MAXMCLASSES } from './monsters.js';
import { WARNCOUNT, SYM_BOULDER } from './const.js';
import { SYM_OFF_X } from './symbols.js';
import { visctrl } from './hacklib.js';
import { game } from './gstate.js';
import { ROLE_NONE, ROLE_RANDOM, RS_ROLE, RS_RACE, RS_GENDER, RS_ALGNMNT, PL_NSIZ,
         PL_FSIZ, PL_PSIZ, ismnum } from './const.js';

import { strncmpi, strcmpi, mungspaces, str_end_is, copynchars } from './hacklib.js';
import { makesingular, fruit_from_name } from './objnam.js';
import { name_to_mon } from './mondata.js';
import { sanitize_name } from './bones.js';
import { rnd } from './rng.js';
import { authorize_wizard_mode, authorize_explore_mode } from './sys.js';
import { bind_key } from './cmd.js';
import { def_char_to_objclass, def_oc_syms, def_oc_explain } from './drawing.js';
import { pline, flush_screen, docrt, bot } from './display.js';
import { vision_recalc } from './vision.js';
import { condtests } from './botl.js';
import { def_inv_order, add_menu_heading, reassign } from './invent.js';
import { count_bind_keys, update_rest_on_space } from './cmd.js';
import { allopt, BoolOpt, CompOpt, OthrOpt, OptS_General, OptS_Advanced,
         Term_False, num_terms, set_in_config, set_gameview, set_in_game,
         set_wizonly, set_wiznofuz } from './optlist.js';
import { MAXOCLASSES, ROCK_CLASS, VENOM_SYM, FOOD_CLASS, objects, OBJ_NAME } from './objects.js';
import {
    str2role, str2race, str2gend, str2align, setrolefilter, clearrolefilter,
    RS_filter, roles, races, genders, aligns,
} from './role.js';
import {
    NHW_MENU, PICK_ONE, PICK_ANY, MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE,
    MENU_ITEMFLAGS_SELECTED, MENU_ITEMFLAGS_SKIPINVERT, ECMD_OK,
    PARANOID_PRAY, PARANOID_SWIM, PARANOID_TRAP, RUN_LEAP, MOD_ENCUMBER,
    PARANOID_CONFIRM, PARANOID_QUIT, PARANOID_DIE, PARANOID_BONES,
    PARANOID_HIT, PARANOID_BREAKWAND, PARANOID_EATING, PARANOID_WERECHANGE,
    PARANOID_AUTOALL, PARANOID_REMOVE,
    DISCLOSE_PROMPT_DEFAULT_NO, MENU_FULL, MENU_TRADITIONAL, MENU_COMBINATION, MENU_PARTIAL,
    STONE, Is_rogue_level, DISCLOSE_PROMPT_DEFAULT_YES,
    DISCLOSE_PROMPT_DEFAULT_SPECIAL, DISCLOSE_YES_WITHOUT_PROMPT,
    DISCLOSE_NO_WITHOUT_PROMPT, DISCLOSE_SPECIAL_WITHOUT_PROMPT,
} from './const.js';
import { lowc } from './hacklib.js';
import { NO_COLOR, ATR_NONE, ATR_INVERSE } from './terminal.js';
import {
    tty_create_nhwindow, tty_start_menu, tty_add_menu, add_menu_str,
    tty_end_menu, tty_select_menu, tty_destroy_nhwindow, tty_getlin,
} from './wintty.js';
import { NHW_TEXT as NHW_TEXT_OPT, COLNO as COLNO_OPT,
         BUFSZ as BUFSZ_OPT } from './const.js';
import { tty_putstr as tty_putstr_opt,
         tty_display_nhwindow as tty_display_nhwindow_opt } from './wintty.js';

// C ref: options.c parse_role_opt()
/* parse 'role' or 'race' or 'gender' or 'alignment';
   returns the value to use ("!" for a negated list), or null for failure */
function parse_role_opt(which, negated, fullname, val) {
    /*
     * Accepts multiple forms
     *  role:priest       -- play as priest
     *  race:!orc         -- any race other than orc
     *  role:!cav !mon    -- any role other than caveman/cavewoman or monk
     *  !role:tour        -- any role other than tourist
     *  !role:tou rog wiz -- any role other than tourist or rogue or wizard
     * Rejected:
     *  role:sam !val     -+ invalid; need either positive or negative subset
     *  !role:!sam        +- not a mixture of the two and not dual negation.
     */
    let result = null;

    if (val) { /* string_for_env_opt() != empty_optstr */
        let prev_negated = false, first = true;
        let op = mungspaces(val);

        while (op.length) {
            if (op[0] === ' ')
                op = op.slice(1);
            let val_negated = false;
            while (op[0] === '!' || !strncmpi(op, "no", 2)) {
                val_negated = !val_negated;
                op = op.slice((op[0] === '!') ? 1 : (op[2] !== '-') ? 2 : 3);
            }
            if (!op.length || op[0] === ' ') {
                /* config_error_add("Negated nothing for '%s'", fullname); */
                return null;
            }
            if (!first) {
                if ((val_negated !== prev_negated)
                    || (negated && val_negated)) {
                    /* "Invalid mixed negation for '%s%s'" */
                    return null;
                } else if (!negated && !val_negated) {
                    /* "Multiple role values only allowed when list is negated" */
                    return null;
                }
            }
            first = false;
            prev_negated = val_negated;

            /* hide rest of list, if any */
            const sp = op.indexOf(' ');
            const word = (sp >= 0) ? op.slice(0, sp) : op;

            const preval = game.roleoptstr?.[which];
            if (val_negated || negated) {
                /* for negative value, clear filter if there is a prior
                   value from a different phase; for same phase, duplicates
                   are allowed and setrolefilter() merges them */
                if (!preval || preval[0] !== '!')
                    clearrolefilter(which);
                if (!setrolefilter(word)) {
                    /* config_error_add("Invalid %s '%s'", fullname, op); */
                    return null;
                }
                result = '!';
            } else {
                /* save raw string value; caller will validate it and
                   if it's ok, replace it with canonical form */
                result = word;
            }
            if (!game.roleoptstr) game.roleoptstr = {};
            game.roleoptstr[which] = result;

            op = (sp >= 0) ? op.slice(sp + 1) : '';
        }
        /* '!ok' without config_error_add() implies a valid negation */
        if (result === null) result = '!';
    }
    return result;
}

// C ref: options.c optfn_role() (req == do_set)
function optfn_role(result, negated, val) {
    /* role:string */
    const op = parse_role_opt(RS_ROLE, negated, 'role', val);
    if (op === null)
        return false; /* optn_silenterr */

    if (op[0] !== '!') {
        if ((result.flags.initrole = str2role(op)) === ROLE_NONE) {
            /* config_error_add("Unknown %s '%s'", allopt[optidx].name, op); */
            return false;
        }
        result.pl_character = op.slice(0, PL_NSIZ - 1); /* Backwards compat */
    }
    return true;
}

// C ref: options.c optfn_race() (req == do_set)
function optfn_race(result, negated, val) {
    /* race:string */
    const op = parse_role_opt(RS_RACE, negated, 'race', val);
    if (op === null)
        return false;

    if (op[0] !== '!') {
        if ((result.flags.initrace = str2race(op)) === ROLE_NONE) {
            return false;
        }
        result.pl_race = op[0]; /* Backwards compatibility */
    }
    return true;
}

// C ref: options.c optfn_gender() (req == do_set)
function optfn_gender(result, negated, val) {
    /* gender:string */
    const op = parse_role_opt(RS_GENDER, negated, 'gender', val);
    if (op === null)
        return false;

    if (op[0] !== '!') {
        if ((result.flags.initgend = str2gend(op)) === ROLE_NONE) {
            return false;
        }
        result.flags.female = result.flags.initgend;
    }
    return true;
}

// C ref: options.c optfn_alignment() (req == do_set)
function optfn_alignment(result, negated, val) {
    /* alignment:string */
    const op = parse_role_opt(RS_ALGNMNT, negated, 'alignment', val);
    if (op === null)
        return false;

    if (op[0] !== '!') {
        if ((result.flags.initalign = str2align(op)) === ROLE_NONE) {
            return false;
        }
    }
    return true;
}

// C ref: options.c optfn_pickup_types() (req == do_set while reading the
// config file, go.opt_initial); flags.pickup_types holds object class
// numbers, one character each, like C
function optfn_pickup_types(result, negated, op) {
    let oc_sym;
    let num;
    let badopt = false;

    /* types of objects to pick up automatically */
    result.flags.pickup_types = ''; /* all */
    if (op === null || op === undefined || op === '') { /* empty_optstr */
        /* for backwards compatibility, "pickup" without a value is a
           synonym for autopickup of all types (and during
           initialization, we can't prompt yet) */
        result.flags.pickup = !negated;
        return true;
    }
    if (negated)
        throw new Error('optfn_pickup_types(): bad_negation() not ported yet');
    while (op[0] === ' ')
        op = op.slice(1);
    if (op[0] !== 'a' && op[0] !== 'A') {
        num = 0;
        for (const ch of op) {
            oc_sym = def_char_to_objclass(ch);
            /* make sure all are valid obj symbols occurring once */
            if (oc_sym !== MAXOCLASSES
                && !result.flags.pickup_types.includes(String.fromCharCode(oc_sym))) {
                result.flags.pickup_types += String.fromCharCode(oc_sym);
                ++num;
            } else
                badopt = true;
        }
        if (badopt)
            throw new Error('optfn_pickup_types(): config_error_add() not ported yet');
    }
    return true;
}

/* C ref: options.c unlocktypes[][2] (names only) */
const unlocktypes = ["untrap", "apply-key", "kick", "force"];

// C ref: options.c optfn_autounlock() (req == do_set; do_init sets
// AUTOUNLOCK_APPLY_KEY, which lock.js uses when the option is unset)
function optfn_autounlock(result, negated, op) {
    /* autounlock:none or autounlock:untrap+apply-key+kick+force;
       autounlock without a value is same as autounlock:apply-key and
       !autounlock is same as autounlock:none */
    if (!op) {
        result.flags.autounlock = negated ? 0 : 2; /* AUTOUNLOCK_APPLY_KEY */
        return true;
    }
    let newflags = 0;
    const sep = op.includes('+') ? '+' : ' ';
    for (let part of op.split(sep)) {
        let matched = false;
        part = part.trim();
        if ("none".startsWith(part.toLowerCase()) && part.length)
            negated = true, matched = true;
        for (let i = 0; i < unlocktypes.length && !matched; ++i) {
            /* str_start_is() or fuzzymatch(op, unlocktypes[i], " -_") */
            const fuzzy = (s) => s.toLowerCase().replace(/[ \-_]/g, '');
            if ((part.length && unlocktypes[i].startsWith(part.toLowerCase()))
                || fuzzy(part) === fuzzy(unlocktypes[i])) {
                matched = true;
                switch (part[0].toLowerCase()) {
                case 'u': newflags |= 1; break; /* AUTOUNLOCK_UNTRAP */
                case 'a': newflags |= 2; break; /* AUTOUNLOCK_APPLY_KEY */
                case 'k': newflags |= 4; break; /* AUTOUNLOCK_KICK */
                case 'f': newflags |= 8; break; /* AUTOUNLOCK_FORCE */
                default: matched = false; break;
                }
            }
        }
        if (!matched)
            return false; /* config_error_add("Invalid value ...") */
    }
    if (negated && newflags !== 0)
        return false; /* 'none' with some */
    result.flags.autounlock = negated ? 0 : newflags;
    return true;
}

// C ref: options.c optfn_playmode() (req == do_set)
/* play mode: normal, explore/discovery, or debug/wizard;
   'wizard' is flags.debug and 'discover' is flags.explore (flag.h) */
function optfn_playmode(result, negated, op) {
    const flags = result.flags;

    if (negated) /* duplicate || negated */
        return false;
    if (!op)
        return false;
    if (!strncmpi(op, "normal", 6) || !strcmpi(op, "play")) {
        flags.debug = flags.explore = false;
    } else if (!strncmpi(op, "explore", 6)
               || !strncmpi(op, "discovery", 6)) {
        flags.debug = false, flags.explore = true;
    } else if (!strncmpi(op, "debug", 5) || !strncmpi(op, "wizard", 6)) {
        flags.debug = true, flags.explore = false;
    } else {
        /* config_error_add("Invalid value for \"%s\":%s", "playmode", op); */
        return false;
    }
    return true;
}

// C ref: options.c set_playmode()
/* wizard mode access is deferred until here (after the options are read) */
export function set_playmode() {
    const g = game;
    const flags = g.flags;

    if (flags.debug) {
        if (authorize_wizard_mode()) {
            g.plname = "wizard";
            g.plnamelen = g.plname.length;
        } else
            flags.debug = false; /* not allowed or not available */
        /* try explore mode if we didn't make it into wizard mode */
        /* if requesting wizard mode when restoring a normal game, this will
           set iflags.deferred_X and prompt to activate explore mode after the
           save file has already been deleted */
        flags.explore = !flags.debug;
        g.iflags.deferred_X = false;
    }
    if (flags.explore && !authorize_explore_mode()) {
        flags.explore = g.iflags.deferred_X = false;
    }
    /* don't need to do anything special for normal play */
}

// C ref: options.c optfn_suppress_alert() (do_set) and
// feature_alert_opts() -- the version (major.minor.patch) as
// FEATURE_NOTICE_VER(); version.c get_feature_notice_ver()
function optfn_suppress_alert(result, negated, op) {
    if (negated) {
        result.flags.suppress_alert = 0;
        return true;
    }
    const v = (op || '').split('.').map(x => parseInt(x, 10));
    if (v.length !== 3 || v.some(x => Number.isNaN(x)))
        return false; /* get_feature_notice_ver() == 0L */
    /* fnv > get_current_feature_ver(): future versions aren't checked */
    result.flags.suppress_alert = (v[0] * 0x1000000) + (v[1] << 16) + (v[2] << 8);
    return true;
}

// C ref: options.c optfn_disclose() (do_set) -- things to disclose at end
// of game; flags.end_disclose[] starts out as the default (prompt, default
// no) for each of disclosure_options[] and is updated in place
function optfn_disclose(result, negated, op) {
    const valid_settings = [DISCLOSE_PROMPT_DEFAULT_YES,
                            DISCLOSE_PROMPT_DEFAULT_NO,
                            DISCLOSE_PROMPT_DEFAULT_SPECIAL,
                            DISCLOSE_YES_WITHOUT_PROMPT,
                            DISCLOSE_NO_WITHOUT_PROMPT,
                            DISCLOSE_SPECIAL_WITHOUT_PROMPT].join('');
    let num, prefix_val;

    if (!result.flags.end_disclose)
        result.flags.end_disclose = disclosure_options.split('').map(
            () => DISCLOSE_PROMPT_DEFAULT_NO);
    const end_disclose = result.flags.end_disclose;
    if (op && negated)
        return false; /* bad_negation() */
    /* "disclose" without a value means "all with prompting"
       and negated means "none without prompting" */
    if (!op || !strcmpi(op, "all") || !strcmpi(op, "none")) {
        if (op && !strcmpi(op, "none"))
            negated = true;
        for (num = 0; num < disclosure_options.length; num++)
            end_disclose[num] = negated ? DISCLOSE_NO_WITHOUT_PROMPT
                                        : DISCLOSE_PROMPT_DEFAULT_YES;
        return true;
    }

    prefix_val = -1;
    for (let i = 0; i < op.length; i++) {
        let c = lowc(op[i]);

        if (c === 'k')
            c = 'v'; /* killed -> vanquished */
        if (c === 'd')
            c = 'o'; /* dungeon -> overview */
        const idx = disclosure_options.indexOf(c);
        if (idx >= 0) {
            if (prefix_val !== -1) {
                if (c !== 'v' && c !== 'g') {
                    if (prefix_val === DISCLOSE_PROMPT_DEFAULT_SPECIAL)
                        prefix_val = DISCLOSE_PROMPT_DEFAULT_YES;
                    if (prefix_val === DISCLOSE_SPECIAL_WITHOUT_PROMPT)
                        prefix_val = DISCLOSE_YES_WITHOUT_PROMPT;
                }
                end_disclose[idx] = prefix_val;
                prefix_val = -1;
            } else
                end_disclose[idx] = DISCLOSE_YES_WITHOUT_PROMPT;
        } else if (valid_settings.includes(c)) {
            prefix_val = c;
        } else if (c === ' ') {
            ; /* do nothing */
        } else {
            return false; /* config_error_add("Unknown %s parameter '%c'") */
        }
    }
    return true;
}

// C ref: options.c optfn_msg_window() (do_set; PREV_MSGS)
function optfn_msg_window(result, negated, op) {
    if (negated)
        return false; /* bad_negation() */
    const tmp = (op || ' ')[0].toLowerCase();
    if (tmp === ' ') {
        /* (default) */
        result.iflags.prevmsg_window = 's';
    } else if ("scfr".includes(tmp)) {
        result.iflags.prevmsg_window = tmp;
    } else {
        return false; /* config_error_add("Unknown %s parameter '%s'") */
    }
    return true;
}

// C ref: options.c optfn_runmode() (do_set)
// C ref: options.c optfn_number_pad() -- do_set from the config file
// (go.opt_initial)
function optfn_number_pad(result, negated, op) {
    let num_pad, num_pad_mode;

    if (!op) {
        num_pad = !negated;
        num_pad_mode = 0;
    } else if (negated) {
        throw new Error('optfn_number_pad(): bad_negation() not ported yet');
    } else {
        const mode = parseInt(op, 10) || 0; /* atoi() */

        if (mode < -1 || mode > 4 || (mode === 0 && op[0] !== '0'))
            throw new Error('optfn_number_pad(): config_error_add() not ported yet');
        else if (mode <= 0) {
            num_pad = false;
            /* German keyboard; y and z keys swapped */
            num_pad_mode = (mode < 0) ? 1 : 0; /* 0 or 1 */
        } else { /* number_pad on */
            num_pad = true;
            num_pad_mode = 0;
            /* PC Hack / MSDOS compatibility */
            if (mode === 2 || mode === 4)
                num_pad_mode |= 1;
            /* phone keypad layout */
            if (mode === 3 || mode === 4)
                num_pad_mode |= 2;
        }
    }
    result.iflags.num_pad = num_pad;
    result.iflags.num_pad_mode = num_pad_mode;
    /* reset_commands(FALSE); number_pad(iflags.num_pad ? 1 : 0): the game
       start-up runs reset_commands(FALSE) in config-file order with the
       BIND= lines (result.bindings); tty_number_pad() only sends the
       keypad's terminal escape */
    (result.bindings ||= []).push({ reset_commands: false, num_pad, num_pad_mode });
}

function optfn_runmode(result, negated, op) {
    const str_start_is = (full, part) =>
        part.length > 0 && full.toLowerCase().startsWith(part.toLowerCase());
    if (negated) {
        result.flags.runmode = 0; /* RUN_TPORT */
    } else if (op) {
        if (str_start_is("teleport", op))
            result.flags.runmode = 0; /* RUN_TPORT */
        else if (str_start_is("run", op))
            result.flags.runmode = 1; /* RUN_LEAP */
        else if (str_start_is("walk", op))
            result.flags.runmode = 2; /* RUN_STEP */
        else if (str_start_is("crawl", op))
            result.flags.runmode = 3; /* RUN_CRAWL */
        else
            return false;
    } else {
        return false;
    }
    return true;
}

// C ref: options.c petname_optfn() (req == do_set) -- catname, dogname,
// horsename; sets result.catname &c (jsmain.js copies them to game)
function petname_optfn(result, which, negated, op) {
    if (!op && !negated)
        return false; /* optn_err */
    if (negated || op === "none" || op === none)
        op = '';
    result[which] = sanitize_name(nmcpy(op, PL_PSIZ));
    return true; /* optn_ok */
}

// C ref: options.c match_optname()
function match_optname(user_string, optn_name, min_length, val_allowed) {
    let len = user_string.length;

    if (val_allowed) /* length_without_val() */
        len = user_string.search(/[:=]|$/);

    return (len >= min_length
            && !strncmpi(optn_name, user_string, len)
            && len <= optn_name.length);
}

// C ref: options.c optfn_paranoid_confirmation() (req == do_set)
/* for "paranoid_confirmation:foo" and alias "[!]prayconfirm"; sets
   result.flags.paranoia_bits, starting from the default bits
   initoptions_init() set */
function optfn_paranoid_confirmation(result, opt_negated, opts, op) {
    let fld_negated;
    let i;
    let plus_or_minus = false;
    let bits = result.flags.paranoia_bits
               ?? initoptions_init_defaults().flags.paranoia_bits;
    const optname = "paranoid_confirmation"; /* allopt[optidx].name */

    /*
     * "prayconfirm" used to be a separate boolean option,
     * now it is a synonym for paranoid_confirm:+pray and
     * "!prayconfirm" has become one for paranoid_confirm:-pray.
     */
    if (!strncmpi(opts, "prayconfirm", 4)) {
        if (op) {
            /* presence of any value is treated as an error */
            config_error_add(`deprecated ${opt_negated ? "!" : ""}prayconfirm option takes no parameters (found '${op}')`);
            return false; /* optn_silenterr */
        }
        /* convert prayconfirm to paranoid_confirm:+pray and
           !prayconfirm to paranoid_confirm:-pray */
        op = `${opt_negated ? '-' : '+'}pray`;
        /* possibly changing !prayconfirm to paranoid_confirm:-pray
           which clears a paranoia bit but isn't a negated option */
        opt_negated = false;
    } else if (opt_negated) {
        /* "!paranoid_confirm" w/o args is same as paranoid_confirm:none;
           "!paranoid_confirm:anything" is disallowed */
        if (!op) {
            result.flags.paranoia_bits = 0;
            return true; /* optn_ok */
        } else {
            config_error_add(`!${optname} does not accept a value`);
            return false; /* optn_silenterr */
        }
    } else if (!op) {
        /* "paranoid_confirm" without any arguments is disallowed */
        config_error_add(`${optname} requires a value; use 'none' to cancel all`);
        return false; /* optn_silenterr */
    }

    /*
     * Multiple settings for paranoid_confirmation are allowed.
     * paranoid_confirm:foo bar clears all confirmation bits (from
     * previous settings, including default), then sets the bits for foo
     * and bar; paranoid_confirm:+foo bar keeps the existing bits and sets
     * those for foo and bar; paranoid_confirm:-foo bar keeps the existing
     * bits except those for foo and bar get cleared.
     */
    op = mungspaces(op);
    if (op[0] !== '+' && op[0] !== '-') {
        /* new value; first clear all old bits */
        bits = 0;
    } else {
        /* augmenting existing value; keep old bits */
        plus_or_minus = true; /* only used for "+none" and "-none" */
        opt_negated = (op[0] === '-'); /* context is changed */
        op = op.slice(1);
        if (op[0] === ' ') /* skip '+' or '-', maybe whitespace */
            op = op.slice(1);
    }

    for (;;) {
        fld_negated = (op[0] === '!');
        if (fld_negated) {
            op = op.slice(1);
            if (op[0] === ' ') /* skip '!', maybe whitespace */
                op = op.slice(1);
        } else {
            /* accept "nofoo" to be same as "!foo", unless "no" is
               followed by a space or 'foo' begins with "n" (to avoid
               confusion for "none"; C tests lowc(op[2] != 'n' && ...)) */
            if (op.length > 2 && lowc(op[0]) === 'n' && lowc(op[1]) === 'o'
                && op[2] !== 'n') {
                fld_negated = true;
                op = op.slice(2); /* skip "no"; we know next char isn't space */
            }
        }
        /* We're looking to parse
           "paranoid_confirm:whichone wheretwo whothree"
           and "paranoid_confirm:" prefix has already
           been stripped off by the time we get here */
        const pp = op.indexOf(' ');
        const tok = (pp >= 0) ? op.slice(0, pp) : op;
        /* we aren't matching option names but match_optname()
           does what we want once we've broken the space
           delimited aggregate into separate tokens */
        for (i = 0; i < paranoia.length; ++i) {
            if (match_optname(tok, paranoia[i].argname,
                              paranoia[i].argMinLen, false)
                || (paranoia[i].synonym
                    && match_optname(tok, paranoia[i].synonym,
                                     paranoia[i].synMinLen, false))) {
                if (!paranoia[i].flagmask) {
                    /* flagmask==0 is "none", clear all bits
                       but "+none" and "-none" are no-ops */
                    if (!plus_or_minus)
                        bits = 0; /* clear all */
                } else if (opt_negated || fld_negated) {
                    bits &= ~paranoia[i].flagmask;
                } else {
                    bits |= paranoia[i].flagmask;
                }
                break;
            }
        }
        if (i === paranoia.length) {
            /* didn't match anything, so arg is bad;
               any flags already modified will stay modified */
            result.flags.paranoia_bits = bits;
            config_error_add(`Unknown ${optname} parameter '${tok}'`);
            return false; /* optn_silenterr */
        }
        /* move on to next token */
        if (pp >= 0)
            op = op.slice(pp + 1);
        else
            break; /* no next token */
    } /* for(;;) */
    result.flags.paranoia_bits = bits;
    return true; /* optn_ok */
}

// C ref: options.c optfn_menustyle() -- do_set:
// menustyle:traditional or combination or full or partial
function optfn_menustyle(result, negated, op) {
    let tmp;
    const val_required = !negated; /* strlen(opts) > 5: "menustyle:..." */

    if (!op) {
        if (val_required)
            return false; /* optn_err; string_for_opt gave feedback */
        tmp = negated ? 'n' : 'f';
    } else {
        tmp = op[0].toLowerCase();
    }
    switch (tmp) {
    case 'n': /* none */
    case 't': /* traditional: prompt for class(es) by symbol,
                 prompt for each item within class(es) one at a time */
        result.flags.menu_style = MENU_TRADITIONAL;
        break;
    case 'c': /* combination: prompt for class(es) by symbol,
                 choose items within selected class(es) by menu */
        result.flags.menu_style = MENU_COMBINATION;
        break;
    case 'f': /* full: choose class(es) by first menu,
                 choose items within selected class(es) by second menu */
        result.flags.menu_style = MENU_FULL;
        break;
    case 'p': /* partial: skip class filtering, choose items among all
                 classes by menu */
        result.flags.menu_style = MENU_PARTIAL;
        break;
    default:
        config_error_add(`Unknown menustyle parameter '${op}'`);
        return false; /* optn_err */
    }
    return true; /* optn_ok */
}

export function parseNethackrc(rc) {
    const result = {
        name: '', role: -1, race: -1, gender: -1, align: -1,
        flags: {}, iflags: {},
    };
    // C ref: options.c initoptions_init()
    /* hero's role, race, &c haven't been chosen yet */
    result.flags.initrole = result.flags.initrace = result.flags.initgend
        = result.flags.initalign = ROLE_NONE;
    result.flags.female = 0; /* boolopt 'female' defaults to off */
    result.flags.bones = true; /* boolopt 'bones' defaults to on */
    if (!rc) return result;

    for (const rawLine of rc.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        /* C ref: cfgfiles.c parse_config_line() -- BIND= (match_varname()
           of "BINDINGS", at least 4 letters) goes to cnf_line_BINDINGS(),
           i.e. parsebindings(), which the game start-up applies after
           reset_commands(TRUE) */
        const stmt = mungspaces(line).match(/^([A-Za-z_]+) ?[=:] ?(.*)$/);
        if (stmt && stmt[1].length >= 4
            && !strncmpi(stmt[1], "BINDINGS", stmt[1].length)) {
            result.bindings = result.bindings || [];
            result.bindings.push(stmt[2]);
            continue;
        }
        /* SYMBOLS= (match_varname() of "SYMBOLS", at least 4 letters)
           goes to cnf_line_SYMBOLS(), i.e. parsesymbols(bufp, PRIMARYSET),
           which the game start-up applies after init_ov_primary_symbols() */
        if (stmt && stmt[1].length >= 4
            && !strncmpi(stmt[1], "SYMBOLS", stmt[1].length)) {
            result.symbols = result.symbols || [];
            result.symbols.push(stmt[2]);
            continue;
        }

        const optMatch = line.match(/^OPTIONS=(.+)/i);
        if (!optMatch) continue;

        for (const opt of optMatch[1].split(',')) {
            const trimmed = opt.trim();
            if (!trimmed) continue;

            const negated = trimmed.startsWith('!');
            const stripped = negated ? trimmed.slice(1) : trimmed;
            /* opt_set_in_config[]: the option names this file set */
            (result.set_in_config ||= []).push(
                stripped.split(/[:=]/)[0].trim().toLowerCase());

            const colonIdx = stripped.indexOf(':');
            if (colonIdx >= 0) {
                const key = stripped.slice(0, colonIdx).trim().toLowerCase();
                const val = stripped.slice(colonIdx + 1).trim();

                // C ref: options.c optfn_name() -- nmcpy(svp.plname, op, PL_NSIZ)
                if (key === 'name') result.name = val.slice(0, PL_NSIZ - 1);
                else if (key === 'role' || key === 'character') {
                    if (optfn_role(result, negated, val)) result.role = result.flags.initrole;
                }
                else if (key === 'race') {
                    if (optfn_race(result, negated, val)) result.race = result.flags.initrace;
                }
                else if (key === 'gender') {
                    if (optfn_gender(result, negated, val)) result.gender = result.flags.initgend;
                }
                else if (key === 'align' || key === 'alignment') {
                    if (optfn_alignment(result, negated, val)) result.align = result.flags.initalign;
                }
                else if (key === 'playmode') optfn_playmode(result, negated, val);
                else if (key === 'pettype' || key === 'pet') {
                    result.flags.pettype = val;
                    if (val === 'none' || val === 'n') result.preferred_pet = 'n';
                    else if (val === 'dog' || val === 'd') result.preferred_pet = 'd';
                    else if (val === 'cat' || val === 'c') result.preferred_pet = 'c';
                }
                else if (key === 'symset') result.symset = val;
                /* optfn_boulder(): applied in file order with the SYMBOLS=
                   lines (both set go.ov_primary_syms[]) */
                else if (key === 'boulder') (result.symbols ||= []).push({ boulder: val });
                else if (key === 'autounlock') optfn_autounlock(result, negated, val);
                else if (key === 'pickup_types') optfn_pickup_types(result, negated, val);
                else if (key === 'suppress_alert') optfn_suppress_alert(result, negated, val);
                else if (key === 'disclose') optfn_disclose(result, negated, val);
                else if (key === 'msg_window') optfn_msg_window(result, negated, val);
                else if (key === 'runmode') optfn_runmode(result, negated, val);
                else if (key === 'menustyle') optfn_menustyle(result, negated, val);
                else if (key === 'number_pad') optfn_number_pad(result, negated, val);
                else if (match_optname(key, "paranoid_confirmation", 3, false)
                         || !strcmpi(key, "prayconfirm"))
                    optfn_paranoid_confirmation(result, negated, key, val);
                else if (key === 'horsename' || key === 'catname' || key === 'dogname')
                    petname_optfn(result, key, negated, val);
                /* optfn_fruit(): go.opt_initial, so it only sets pl_fruit;
                   the game start-up applies it before initoptions_finish()'s
                   fruitadd() */
                else if (key === 'fruit') result.fruit = { negated, opts: stripped };
                else result.flags[key] = val;
            } else {
                // Boolean flag
                const lname = stripped.toLowerCase();
                const value = !negated;

                if (lname === 'autopickup') result.flags.pickup = value;
                else if (lname === 'legacy') result.flags.legacy = value;
                else if (lname === 'tutorial') { result.flags.tutorial = value; result.tutorial_set = true; }
                else if (lname === 'splash_screen') result.iflags.wc_splash_screen = value;
                else if (lname === 'pushweapon') result.flags.pushweapon = value;
                else if (lname === 'showexp') result.flags.showexp = value;
                else if (lname === 'time') result.flags.time = value;
                else if (lname === 'verbose') result.flags.verbose = value;
                /* C ref: optlist.h safe_pet -> flags.safe_dog */
                else if (lname === 'safe_pet') result.flags.safe_dog = value;
                else if (lname === 'autoopen') result.flags.autoopen = value;
                else if (lname === 'mention_walls') result.flags.mention_walls = value;
                else if (lname === 'autounlock') optfn_autounlock(result, negated, '');
                else if (lname === 'number_pad') optfn_number_pad(result, negated, '');
                else if (match_optname(lname, "paranoid_confirmation", 3, false)
                         || !strcmpi(lname, "prayconfirm"))
                    optfn_paranoid_confirmation(result, negated, lname, '');
                // C ref: options.c boolean option case opt_female ("female",
                // alias "male"); go.opt_initial is TRUE while reading the rc
                else if (lname.length >= 3 && !strncmpi(lname, "female", Math.max(lname.length, 3)))
                    result.flags.initgend = result.flags.female = negated ? 0 : 1;
                else if (lname.length >= 3 && !strncmpi(lname, "male", Math.max(lname.length, 3)))
                    result.flags.initgend = result.flags.female = negated ? 1 : 0;
                else {
                    /* optfn_boolean(): *allopt[optidx].addr = !negated,
                       for the option with this name or alias */
                    const o = allopt.find(a => a.opttyp === BoolOpt
                                          && (!strcmpi(lname, a.name)
                                              || (a.alias && !strcmpi(lname, a.alias))));
                    if (o && o.addr) {
                        if (!result[o.addr[0]])
                            result[o.addr[0]] = {};
                        result[o.addr[0]][o.addr[1]] = value;
                        /* After the change */
                        if (o.name === "pauper") {
                            /* pauper implies nudist */
                            if (!result.uroleplay)
                                result.uroleplay = {};
                            result.uroleplay.nudist = result.uroleplay.pauper;
                        }
                    } else if (!o) {
                        result.flags[lname] = value;
                    }
                }
            }
        }
    }
    return result;
}

// C ref: options.c escapes() -- the result string (C fills 'tp'); a
// result char is a key code 0..255 (\mX sets the meta bit)
function escapes(cp) {
    const oct = "01234567", dec = "0123456789";
    const hexdd = "00112233445566778899aAbBcCdDeEfF"; /* decl.c hexdd[] */
    let tp = '';
    let i = 0, cval, meta, dcount, dp;
    const at = (k) => (k < cp.length ? cp[k] : '');

    while (i < cp.length) {
        /* \M has to be followed by something to do meta conversion,
           otherwise it will just be \M which ultimately yields 'M' */
        meta = (at(i) === '\\' && (at(i + 1) === 'm' || at(i + 1) === 'M') && at(i + 2) !== '');
        if (meta)
            i += 2;

        cval = dcount = 0; /* for decimal, octal, hexadecimal cases */
        if ((at(i) !== '\\' && at(i) !== '^') || at(i + 1) === '') {
            /* simple character, or nothing left for \ or ^ to escape */
            cval = cp.charCodeAt(i++);
        } else if (at(i) === '^') { /* expand control-character syntax */
            cval = (cp.charCodeAt(++i) & 0x1f);
            ++i;

        /* remaining cases are all for backslash; we know cp[1] is not \0 */
        } else if (dec.includes(at(i + 1))) {
            ++i; /* move past backslash to first digit */
            do {
                cval = (cval * 10) + (cp.charCodeAt(i) - 0x30);
            } while (at(++i) !== '' && dec.includes(at(i)) && ++dcount < 3);
        } else if ((at(i + 1) === 'o' || at(i + 1) === 'O') && at(i + 2) !== ''
                   && oct.includes(at(i + 2))) {
            i += 2; /* move past backslash and 'O' */
            do {
                cval = (cval * 8) + (cp.charCodeAt(i) - 0x30);
            } while (at(++i) !== '' && oct.includes(at(i)) && ++dcount < 3);
        } else if ((at(i + 1) === 'x' || at(i + 1) === 'X') && at(i + 2) !== ''
                   && (dp = hexdd.indexOf(at(i + 2))) >= 0) {
            i += 2; /* move past backslash and 'X' */
            do {
                cval = (cval * 16) + Math.trunc(dp / 2);
            } while (at(++i) !== '' && (dp = hexdd.indexOf(at(i))) >= 0 && ++dcount < 2);
        } else { /* C-style character escapes */
            switch (at(++i)) {
            case '\\':
                cval = 0x5c;
                break;
            case 'n':
                cval = 0x0a;
                break;
            case 't':
                cval = 0x09;
                break;
            case 'b':
                cval = 0x08;
                break;
            case 'r':
                cval = 0x0d;
                break;
            default:
                cval = cp.charCodeAt(i);
            }
            ++i;
        }

        if (meta)
            cval |= 0x80;
        tp += String.fromCharCode(cval & 0xff); /* (char) cval */
    }
    return tp;
}

// C ref: options.c sym_val() -- the symbol a SYMBOLS= value gives, as
// C's (int) *buf: a char, so one with the high bit set is negative
export function sym_val(strval) { /* up to 4*BUFSZ-1 long; only first few
                                     chars matter */
    const QBUFSZ = 128;
    const isspace = (c) => " \t\n\v\f\r".includes(c);
    let buf = '';

    if (strval.length <= 1) { /* empty, or single character */
        /* if single char is space or tab, leave buf[0]=='\0' */
        if (strval.length && !isspace(strval[0]))
            buf = strval[0];
    } else if (strval[0] === '\'') { /* single quote */
        /* simple matching single quote; we know strval[1] isn't '\0' */
        if (strval[2] === '\'' && strval.length === 3) {
            /* accepts '\' as backslash and ''' as single quote */
            buf = strval[1];

        /* if backslash, handle single or double quote or second backslash */
        } else if (strval[1] === '\\' && strval.length > 2 && strval[3] === '\''
                   && "'\"\\".includes(strval[2]) && strval.length === 4) {
            buf = strval[2];

        /* not simple quote or basic backslash;
           strip closing quote and let escapes() deal with it */
        } else {
            /* +1: skip opening single quote */
            const tmp = strval.slice(1, QBUFSZ);
            const p = tmp.lastIndexOf('\'');
            if (p >= 0)
                buf = escapes(tmp.slice(0, p));
            /* else buf[0] stays '\0' */
        }
    } else { /* not lone char nor single quote */
        buf = escapes(strval.slice(0, QBUFSZ - 1));
    }

    if (!buf.length)
        return 0;
    const c = buf.charCodeAt(0) & 0xff;
    return (c & 0x80) ? c - 0x100 : c;
}

// C ref: options.c txt2key()
function txt2key(txt) {
    let uc;
    let makemeta = false;
    const C = (c) => (0x1f & c);
    const M = (c) => (0x80 | c);

    txt = txt.trim(); /* trimspaces() */
    if (!txt)
        return 0;

    /* simple character */
    if (txt.length === 1)
        return txt.charCodeAt(0) & 0xff;

    /* a few special entries */
    if (txt === "<enter>")
        return 0x0a;
    if (txt === "<space>")
        return 0x20;
    if (txt === "<esc>")
        return 0x1b;

    /* handle things like \b and \7 and \mX */
    if (txt[0] === '\\') {
        if (txt.length >= 256) /* QBUFSZ */
            txt = txt.slice(0, 256 - 1);
        const tbuf = escapes(txt);
        return tbuf.length ? (tbuf.charCodeAt(0) & 0xff) : 0;
    }

    /* control and meta keys */
    if (txt[0].toUpperCase() === 'M') { /* highc() */
        /*
         * M <nothing>             return 'M'
         * M - <nothing>           return M-'-'
         * M <other><nothing>      return M-<other>
         * otherwise M is pending until after ^/C- processing.
         * Since trailing spaces are discarded, the only way to
         * specify M-' ' is via "160".
         */
        if (txt.length === 1)
            return txt.charCodeAt(0);
        /* skip past 'M' or 'm' and maybe '-' */
        txt = txt.slice(1);
        if (txt[0] === '-' && txt.length > 1)
            txt = txt.slice(1);
        if (txt.length === 1)
            return M(txt.charCodeAt(0)) & 0xff;
        makemeta = true;
    }
    if (txt[0] === '^' || txt[0].toUpperCase() === 'C') {
        /*
         * C <nothing>             return 'C' or M-'C'
         * C - <nothing>           return '-' or M-'-'
         * C [-] <other><nothing>  return C-<other> or M-C-<other>
         * C [-] ?                 return <rubout>
         * otherwise return C-<other> or M-C-<other>
         */
        uc = txt.charCodeAt(0) & 0xff;
        if (txt.length === 1)
            return makemeta ? M(uc) : uc;
        txt = txt.slice(1);
        /* unlike M-x, lots of values of x are invalid for C-x;
           checking and rejecting them is not worthwhile; GIGO;
           we do accept "^-x" as synonym for "^x" or "C-x" */
        if (txt[0] === '-' && txt.length > 1)
            txt = txt.slice(1);
        /* and accept ^?, which gets used despite not being a control char */
        if (txt[0] === '?')
            return makemeta ? 0o377 : 0o177; /* rubout/delete */
        uc = C(txt.charCodeAt(0) & 0xff);
        return makemeta ? M(uc) : uc;
    }
    if (makemeta && txt)
        return M(txt.charCodeAt(0)) & 0xff;

    /* ascii codes: must be three-digit decimal */
    if (txt[0] >= '0' && txt[0] <= '9') {
        let key = 0;

        for (let i = 0; i < 3; i++) {
            if (!(txt[i] >= '0' && txt[i] <= '9'))
                return 0;
            key = 10 * key + txt.charCodeAt(i) - 0x30;
        }
        return key & 0xff;
    }

    return 0;
}

// C ref: options.c parsebindings()
/* parse key:command[,key2:command2,...] after BINDINGS= prefix has been
   stripped; returns False if any problem seen, True if every binding in
   the comma-separated list is successful */
export function parsebindings(bindings) {
    let bind;
    let key;
    let ret = true; /* assume success */
    const mousebtn_names = [ "mouse1", "mouse2" ];

    /* look for first comma, then decide whether it is the key being bound
       or a list element separator; if it's a key, find separator beyond it */
    if ((bind = bindings.indexOf(',')) >= 0) {
        /* at start so it represents a key */
        if (bind === 0)
            bind = bindings.indexOf(',', bind + 1);

        /* to get here, bind is not at the start, so bind[-1] is valid;
           check whether current comma happens to be for "\,:cmd" or
           "',':cmd" (":cmd" part is assumed if the comma has expected
           quoting) */
        else if (bindings[bind - 1] === '\\'
                 || (bindings[bind - 1] === '\'' && bindings[bind + 1] === '\''))
            bind = bindings.indexOf(',', bind + 2);
    }
    /* if a comma separator has been found, break off first binding from rest;
       parse the rest and then handle this first one when recursion returns */
    if (bind >= 0) {
        const rest = bindings.slice(bind + 1);
        bindings = bindings.slice(0, bind);
        if (!parsebindings(rest))
            ret = false;
    }

    /* parse a single binding: first split around : */
    if ((bind = bindings.indexOf(':')) < 0)
        return false; /* it's not a binding */
    const cmd = bindings.slice(bind + 1).trim(); /* trimspaces() */
    bindings = bindings.slice(0, bind);

    for (let i = 0; i < mousebtn_names.length; i++)
        if (bindings === mousebtn_names[i])
            throw new Error('parsebindings(): bind_mousebtn() not ported yet');

    /* read the key to be bound */
    key = txt2key(bindings);
    if (!key)
        throw new Error('parsebindings(): config_error_add() not ported yet');

    /* is it a special key? */
    if (bind_specialkey(key, cmd))
        throw new Error('parsebindings(): Cmd.spkeys[] not ported yet');

    /* is it a menu command? */
    if (default_menu_cmd_names.includes(cmd))
        throw new Error('parsebindings(): add_menu_cmd_alias() not ported yet');

    /* extended command? */
    if (!bind_key(key, cmd, true))
        throw new Error('parsebindings(): config_error_add() not ported yet');
    return ret;
}

/* C ref: options.c default_menu_cmd_info[].name */
const default_menu_cmd_names = [
    "menu_next_page", "menu_previous_page", "menu_first_page",
    "menu_last_page", "menu_select_all", "menu_invert_all",
    "menu_deselect_all", "menu_select_page", "menu_invert_page",
    "menu_deselect_page", "menu_search", "menu_shift_right",
    "menu_shift_left",
];

/* C ref: cmd.c spkeys_binds[].name, bind_specialkey() -- whether the
   command names a special key */
function bind_specialkey(key, command) {
    const spkeys_names = [
        "getdir.self", "getdir.self2", "getdir.help", "getdir.mouse",
        "count", "getpos.self", "getpos.pick", "getpos.pick.quick",
        "getpos.pick.once", "getpos.pick.verbose", "getpos.valid",
        "getpos.autodescribe", "getpos.mon.next", "getpos.mon.prev",
        "getpos.obj.next", "getpos.obj.prev", "getpos.door.next",
        "getpos.door.prev", "getpos.unexplored.next",
        "getpos.unexplored.prev", "getpos.valid.next", "getpos.valid.prev",
        "getpos.all.next", "getpos.all.prev", "getpos.help",
        "getpos.filter", "getpos.moveskip", "getpos.menu",
    ];
    void key;
    return spkeys_names.includes(command);
}

// C ref: files.c nh_basename()
function nh_basename(fname, keep_suffix) {
    let p;
    if ((p = fname.lastIndexOf('/')) >= 0)
        fname = fname.slice(p + 1);
    if ((p = fname.lastIndexOf('.')) >= 0 && !keep_suffix)
        fname = fname.slice(0, p);
    return fname;
}

// C ref: files.c get_configfile() -- the name of the configuration file
// that was read (game.configfile, set at game start-up)
function get_configfile() {
    return game.configfile || '';
}

// C ref: options.c ask_do_tutorial()
export async function ask_do_tutorial() {
    let dotut = game.flags.tutorial;

    if (!game.tutorial_set_in_config) {
        let win, n, pass = 0, selected;
        const rc = nh_basename(get_configfile(), true);
        const norc = get_configfile() === '/dev/null';
        const buf = `Put "OPTIONS=!tutorial" in ${(rc && !norc)
                     ? rc : 'your configuration file'} to skip this query.`;
        do {
            win = tty_create_nhwindow(NHW_MENU);
            tty_start_menu(win, MENU_BEHAVE_STANDARD);
            tty_add_menu(win, null, 'y', 'y', 0, ATR_NONE, NO_COLOR,
                         "Yes, do a tutorial", MENU_ITEMFLAGS_NONE);
            tty_add_menu(win, null, 'n', 'n', 0, ATR_NONE, NO_COLOR,
                         "No, just start play", MENU_ITEMFLAGS_NONE);

            add_menu_str(win, "");
            add_menu_str(win, buf);
            if (pass++) /* we'll get here after <space> or <return> */
                add_menu_str(win, "(Please choose 'y' or 'n'.)");

            tty_end_menu(win, "Do you want a tutorial?");

            ({ n, selected } = await tty_select_menu(win, PICK_ONE));
            tty_destroy_nhwindow(win);
        } while (!n);
        if (n > 0) {
            dotut = (selected[0].item === 'y');
        } else { /* ESC */
            dotut = false;
        }
    }
    return dotut;
}

// C ref: options.c oc_to_str() -- object class numbers to their symbols
export function oc_to_str(src) {
    let dest = '';
    for (const c of src || '')
        dest += def_oc_syms[c.charCodeAt(0)];
    return dest;
}

// C ref: options.c count_apes() -- ga.apelist, the autopickup exceptions
// (no option ported so far adds any)
function count_apes() {
    let numapes = 0;
    for (let ape = game.apelist; ape; ape = ape.next)
        numapes++;
    return numapes;
}

// C ref: options.c dotogglepickup() -- the '@' command
export async function dotogglepickup() {
    let buf;
    const flags = game.flags;

    flags.pickup = !flags.pickup;
    if (flags.pickup) {
        const ocl = oc_to_str(flags.pickup_types);
        buf = `ON, for ${ocl ? ocl : "all"} objects${(game.apelist)
                ? ((count_apes() === 1)
                   ? ", with one exception"
                   : ", with some exceptions")
                : ""}`;
    } else {
        buf = "OFF";
    }
    await pline(`Autopickup: ${buf}.`);
    return ECMD_OK;
}

/*
 * The options menus: doset_simple() ('O'), doset() ('m O', #optionsfull)
 * and what they need -- the per-option get_val/do_set/do_handler requests
 * of the options shown, optfn_boolean() and parseoptions() for setting an
 * option from the menu.
 */

/* C ref: patchlevel.h VERSION_MAJOR.VERSION_MINOR.PATCHLEVEL, as
   version.c version_string() shows it */
const VERSION_NUMBER = "5.0.0";

/* C ref: options.c enum optn_result, enum requests */
const optn_silenterr = -1, optn_err = 0, optn_ok = 1;
const do_init = 1, do_set = 2, do_handler = 3, get_val = 4, get_cnf_val = 5;
void do_init;

/* C ref: options.c none[], randomrole[], to_be_done[], defopt[],
   n_currently_set[] */
const none = "(none)", randomrole = "random", to_be_done = "(to be done)";
const n_currently_set = (n) => `(${n} currently set)`;

/* C ref: options.c burdentype[], runmodes[], sortltype[], menutype[][0] */
const burdentype = [
    "unencumbered", "burdened", "stressed",
    "strained", "overtaxed", "overloaded",
];
const runmodes = ["teleport", "run", "walk", "crawl"];
const sortltype = ["none", "loot", "full"];
const menutype = ["traditional", "combination", "full", "partial"];
/* C ref: options.c objsymvals[].nam */
const objsymvals = ["none", "headers", "entries", "both", "conditional",
                    "one-or-other"];
/* C ref: options.c paranoia[] - used by parseoptions() and
   handler_paranoid_confirmation() */
/* there are some initial-letter conflicts: "a"ttack vs "A"utoall vs
   "a"ll, "attack" takes precedence and "all" isn't present in the
   interactive menu with "Autoall" capitalized there,
   and "d"ie vs "d"eath, synonyms for each other so doesn't matter;
   (also "p"ray vs "P"aranoia, "pray" takes precedence since "Paranoia"
   is just a synonym for "Confirm"); "b"ones vs "br"eak-wand, the
   latter requires at least two letters; "e"at vs "ex"plore,
   "cont"inue eating vs "C"onfirm; "wand"-break vs "Were"-change,
   both require at least two letters during config processing but use
   one letter with case-sensitivity for 'm O's interactive menu;
   if any entry or alias beginning with 'n' gets added, aside from "none",
   the parsing to accept "nofoo" to mean "!foo" will need fixing */
const paranoia = [
    { flagmask: PARANOID_CONFIRM, argname: "Confirm", argMinLen: 1,
      synonym: "Paranoia", synMinLen: 2,
      explain: "for \"yes\" confirmations, require \"no\" to reject" },
    { flagmask: PARANOID_QUIT, argname: "quit", argMinLen: 1,
      synonym: "explore", synMinLen: 2,
      explain: "yes vs y to quit or to enter explore mode" },
    { flagmask: PARANOID_DIE, argname: "die", argMinLen: 1,
      synonym: "death", synMinLen: 2,
      explain: "yes vs y to die (explore mode or debug mode)" },
    { flagmask: PARANOID_BONES, argname: "bones", argMinLen: 1,
      synonym: null, synMinLen: 0,
      explain: "yes vs y to save bones data when dying in debug mode" },
    { flagmask: PARANOID_HIT, argname: "attack", argMinLen: 1,
      synonym: "hit", synMinLen: 1,
      explain: "yes vs y to attack a peaceful monster" },
    { flagmask: PARANOID_BREAKWAND, argname: "wand-break", argMinLen: 2,
      synonym: "break-wand", synMinLen: 2,
      explain: "yes vs y to break a wand via (a)pply" },
    { flagmask: PARANOID_EATING, argname: "eat", argMinLen: 1,
      synonym: "continue", synMinLen: 4,
      explain: "yes vs y to continue eating after first bite when satiated" },
    { flagmask: PARANOID_WERECHANGE, argname: "Were-change", argMinLen: 2,
      synonym: null, synMinLen: 0,
      explain: "yes vs y to change form when lycanthropy is controllable" },
    /* extra y/n questions rather than changing y/n to yes/n[o];
       they switch to yes/no if paranoid:confirm is also set */
    { flagmask: PARANOID_PRAY, argname: "pray", argMinLen: 1,
      synonym: null, synMinLen: 0,
      explain: "y required to pray (supersedes old \"prayconfirm\" option)" },
    { flagmask: PARANOID_TRAP, argname: "trap", argMinLen: 1,
      synonym: "move-trap", synMinLen: 1,
      explain: "y required to enter known trap unless considered harmless" },
    { flagmask: PARANOID_AUTOALL, argname: "Autoall", argMinLen: 2,
      synonym: "autoselect-all", synMinLen: 2,
      explain: "y required to pick filter choice 'A' for menustyle:Full" },
    /* not a yes/n[o] vs y/n change nor a y/n addition */
    { flagmask: PARANOID_SWIM, argname: "swim", argMinLen: 1,
      synonym: null, synMinLen: 0,
      explain: "'m' prefix necessary to deliberately walk into lava or water" },
    { flagmask: PARANOID_REMOVE, argname: "Remove", argMinLen: 1,
      synonym: "Takeoff", synMinLen: 1,
      /* normally when there is only 1 candidate it's chosen automatically */
      explain: "always pick from inventory for Remove and Takeoff" },
    /* for config file parsing; interactive menu skips these */
    { flagmask: 0, argname: "none", argMinLen: 4, synonym: null, synMinLen: 0,
      explain: null }, /* require full word match */
    { flagmask: ~0, argname: "all", argMinLen: 3, synonym: null, synMinLen: 0,
      explain: null }, /* ditto */
];
/* C ref: decl.c disclosure_options[] */
const disclosure_options = "iavgco";
/* C ref: insight.c vanqorders[][0..1] */
const vanqorders = [
    ["t", "traditional: by monster level"],
    ["d", "by monster difficulty rating"],
    ["a", "alphabetically, first unique monsters, then others"],
    ["A", "alphabetically, unique monsters and others intermixed"],
    ["C", "by monster class, high to low level within class"],
    ["c", "by monster class, low to high level within class"],
    ["n", "by count, high to low"],
    ["z", "by count, low to high"],
];
/* C ref: o_init.c disco_order_let[], disco_orders_descr[] */
const disco_order_let = "osca";
const disco_orders_descr = [
    "by order of discovery within each class",
    "sortloot order (by class with some sub-class groupings)",
    "alphabetical within each class",
    "alphabetical across all classes",
];
/* C ref: symbols.c known_handling[] */
const known_handling = ["UNKNOWN", "IBM", "DEC", "CURS", "MAC", "UTF8"];
/* C ref: coloratt.c attrnames[] (by the attr values terminal.js uses for
   ATR_NONE and ATR_INVERSE) */
function attr2attrname(attr) {
    return (attr === ATR_INVERSE) ? "inverse"
           : (attr === ATR_NONE) ? "none" : null;
}
/* C ref: coloratt.c clr2colorname() -- only no color is used here */
function clr2colorname(clr) {
    return (clr === NO_COLOR) ? "no color" : null;
}

/* C ref: options.c wc_options[], wc2_options[], tty_procs.wincap and
   .wincap2 (WC_COLOR | WC_HILITE_PET | WC_INVERSE | WC_EIGHT_BIT_IN;
   WC2_HILITE_STATUS | WC2_HITPOINTBAR | WC2_DARKGRAY | WC2_STATUSLINES
   | WC2_PETATTR | WC2_EXTRASTATUS and others without options) as the
   options they support */
const wc_options = {
    ascii_map: false, color: true, eight_bit_tty: true, hilite_pet: true,
    perm_invent: false, perminv_mode: false, popup_dialog: false,
    player_selection: false, preload_tiles: false, tiled_map: false,
    tile_file: false, tile_width: false, tile_height: false,
    align_message: false, align_status: false, font_map: false,
    font_menu: false, font_message: false, font_size_map: false,
    font_size_menu: false, font_size_message: false,
    font_size_status: false, font_size_text: false, font_status: false,
    font_text: false, map_mode: false, scroll_amount: false,
    scroll_margin: false, splash_screen: false, use_inverse: true,
    vary_msgcount: false, windowcolors: false, mouse_support: false,
};
const wc2_options = {
    armorstatus: true, fullscreen: false, guicolor: false,
    hilite_status: true, hitpointbar: true, menu_shift: false,
    petattr: true, softkeyboard: false, "status hilite rules": true,
    statushilites: true, statuslines: true, term_cols: false,
    term_rows: false, terrainstatus: true, use_darkgray: true,
    weaponstatus: true, windowborders: false, wraptext: false,
};

// C ref: options.c is_wc_option()
function is_wc_option(optnam) {
    return Object.hasOwn(wc_options, optnam);
}

// C ref: options.c wc_supported()
function wc_supported(optnam) {
    return Object.hasOwn(wc_options, optnam) ? wc_options[optnam] : false;
}

// C ref: options.c is_wc2_option()
function is_wc2_option(optnam) {
    return Object.hasOwn(wc2_options, optnam);
}

// C ref: options.c wc2_supported()
function wc2_supported(optnam) {
    return Object.hasOwn(wc2_options, optnam) ? wc2_options[optnam] : false;
}

/* the struct a boolean option's addr points into */
function optaddr_struct(o) {
    const s = o.addr[0];
    if (s === 'uroleplay')
        return game.u.uroleplay;
    if (!game[s])
        game[s] = {};
    return game[s];
}

/* *allopt[i].addr */
function boolopt_get(o) {
    return !!optaddr_struct(o)[o.addr[1]];
}

/* *allopt[i].addr = val */
function boolopt_set(o, val) {
    optaddr_struct(o)[o.addr[1]] = val;
}

// C ref: cfgfiles.c config_error_init() -- push a config error frame
// (C's static config_error_data list is kept in game.config_error_data)
function config_error_init(from_file, sourcename, secure) {
    const tmp = {
        line_num: 0,
        num_errors: 0,
        origline_shown: false,
        fromfile: from_file,
        secure,
        origline: '',
        source: (sourcename && sourcename[0]) ? sourcename : '',
        next: game.config_error_data || null,
    };

    game.config_error_data = tmp;
    (game.program_state ||= {}).config_error_ready = true;
}

// C ref: cfgfiles.c config_error_nextline()
function config_error_nextline(line) {
    const ced = game.config_error_data;

    if (!ced)
        return false;

    if (ced.num_errors && ced.secure)
        return false;

    ced.line_num++;
    ced.origline_shown = false;
    ced.origline = (line && line[0]) ? line : '';

    return true;
}

// C ref: cfgfiles.c config_erradd() (called by pline.c config_error_add())
function config_erradd(buf) {
    if (!buf)
        buf = "Unknown error";

    if (!game.program_state?.config_error_ready)
        /* either very early, where pline() will use raw_print(), or
           player gave bad value when prompted by interactive 'O' command:
           pline("%s%s%s", ...); wait_synch() */
        throw new Error('config_erradd(): config error without an error frame not ported yet');

    if (game.iflags?.in_lua) {
        /* C's static config_error_msg list (which the Lua
           get_config_errors() reads), kept in game.config_error_msg */
        game.config_error_msg = {
            next: game.config_error_msg || null,
            line_num: game.config_error_data.line_num,
            errormsg: buf,
        };
        return;
    }

    /* config_error_data->num_errors++; pline("\n%s", origline);
       pline("%s %s%s%s", " *", lineno, buf, punct) */
    throw new Error('config_erradd(): config error message outside Lua not ported yet');
}

// C ref: options.c optfn_boulder() -- the do_set case (BACKWARD_COMPAT):
// boulder:symbol overrides the default boulder symbol; 'op' is the value
// string_for_opt() returns. go.opt_initial is TRUE while reading the rc,
// so the showsyms[] update waits for initoptions_finish() (display.js
// reads the override when it shows a glyph).
export function optfn_boulder_set(op) {
    let clash = 0;
    const opts = escapes(op);
    const c0 = opts.length ? opts.charCodeAt(0) : 0;

    /* note: dummy monclass #0 has symbol value '\0'; we allow that--
       attempting to set bouldersym to '^@'/'\0' will reset to default */
    if (def_char_to_monclass(opts.length ? opts[0] : '\0') !== MAXMCLASSES)
        clash = c0 ? 1 : 0;
    else if (c0 >= 0x31 /* '1' */ && c0 < WARNCOUNT + 0x30 /* '0' */)
        clash = 2;
    if (c0 < 0x20 /* ' ' */) {
        config_error_add("boulder symbol cannot be a control character");
        return true; /* optn_ok */
    } else if (clash) {
        /* symbol chosen matches a used monster or warning
           symbol which is not good - reject it */
        config_error_add(`Badoption - boulder symbol '${visctrl(opts[0])
                          }' would conflict with a ${
                          (clash === 1) ? "monster" : "warning"} symbol`);
    } else {
        /*
         * Override the default boulder symbol.
         */
        game.ov_primary_syms[SYM_BOULDER + SYM_OFF_X] = c0;
        /* go.ov_rogue_syms[]: the Rogue level symset isn't ported */
    }
    return true; /* optn_ok */
}

// C ref: pline.c config_error_add() -- vconfig_error_add() formats the
// message (the callers here pass it formatted) for config_erradd()
function config_error_add(buf) {
    config_erradd(buf);
}

// C ref: cfgfiles.c config_error_done() -- pop the config error frame
function config_error_done() {
    const tmp = game.config_error_data;

    if (!tmp)
        return 0;
    const n = tmp.num_errors;
    /* gn.no_sound_notified: no SOUND line gets here */
    if (n)
        /* pline("\n%d error%s %s %s.\n", ...); wait_synch() */
        throw new Error('config_error_done(): config error count message not ported yet');
    game.config_error_data = tmp.next;
    game.program_state.config_error_ready = (game.config_error_data !== null);
    return n;
}

// C ref: cfgfiles.c parse_conf_str() -- feed each line of 'str' to
// 'proc' (as nh.parse_config() does with parse_config_line), with
// parse_conf_buf()'s line handling (line continuation isn't ported)
export function parse_conf_str(str, proc) {
    let rv = true;

    /* cnf_parser_init(&parser); free_config_sections() */
    config_error_init(false, "parse_conf_str", false);
    while (str) {
        const nl = str.indexOf('\n');
        const line = (nl >= 0) ? str.slice(0, nl + 1) : str;
        str = (nl >= 0) ? str.slice(nl + 1) : '';
        /* parse_conf_buf(): */
        let inbuf = line.replace(/\n$/, '');
        if (inbuf.endsWith('\\'))
            throw new Error('parse_conf_buf(): line continuation not ported yet');
        /* trim off spaces at end of line */
        inbuf = inbuf.replace(/[ \t\r]+$/, '');
        if (!config_error_nextline(inbuf)) {
            rv = false;
            break; /* p->pbreak */
        }
        const ep = inbuf.replace(/^[ \t]+/, '');
        /* ignore empty lines and full-line comment lines */
        if (!ep || ep[0] === '#')
            continue;
        if (!proc(ep))
            rv = false;
    }
    /* cnf_parser_done(&parser); free_config_sections() */
    config_error_done();
    return rv;
}

// C ref: cfgfiles.c parse_config_line() -- only the OPTIONS statement
// (cnf_line_OPTIONS) is ported; the others stop explicitly
export function parse_config_line(origbuf) {
    const buf = mungspaces(origbuf.replace(/^[ \t]+/, ''));
    /* find the '=' or ':' */
    const eq = buf.search(/[=:]/);
    if (eq < 0)
        throw new Error('parse_config_line(): config_error_add() not ported yet');
    const name = buf.slice(0, eq).trim();
    if (name.length >= 4 && !strncmpi(name, "OPTIONS", name.length)) {
        /* cnf_line_OPTIONS(): parseoptions(bufp, TRUE, TRUE) */
        return parseoptions_initial(origbuf.slice(origbuf.search(/[=:]/) + 1));
    }
    throw new Error(`parse_config_line(): ${name} statement not ported yet`);
}

// C ref: options.c parseoptions() with tinitial and tfrom_file set (a
// config file line). Only boolean options are ported on this path; their
// optfn_boolean() does nothing after setting the value while opt_initial.
function parseoptions_initial(opts) {
    let negated = false;
    let retval = true;

    game.opt_initial = true;
    game.opt_from_file = true;
    /* Process elements of comma-separated list in right to left order. */
    const comma = opts.indexOf(',');
    if (comma >= 0) {
        if (!parseoptions_initial(opts.slice(comma + 1)))
            retval = false;
        opts = opts.slice(0, comma);
    }
    /* strip leading and trailing white space */
    opts = opts.trim();
    if (!opts)
        throw new Error('parseoptions(): config_error_add() not ported yet');
    while (opts[0] === '!' || !strncmpi(opts, "no", 2)) {
        opts = opts.slice((opts[0] === '!') ? 1 : (opts[2] !== '-') ? 2 : 3);
        negated = !negated;
    }
    const colon = opts.search(/[:=]/);
    const optname = (colon >= 0) ? opts.slice(0, colon) : opts;
    const o = allopt.find(a => !a.pfx && !strcmpi(optname, a.name));
    if (!o)
        throw new Error(`parseoptions(): option '${optname}' not ported yet`);
    if (o.opttyp !== BoolOpt || colon >= 0)
        throw new Error(`parseoptions(): config option '${optname}' not ported yet`);
    /* duplicate = duplicate_opt_detection(matchidx) */
    if ((game.opt_set_in_config_names || []).includes(o.name.toLowerCase()))
        /* boolean options aren't dupeok */
        complain_about_duplicate(o, false);
    /* check for bad negation, so option functions don't have to */
    if (negated && !o.negateok)
        throw new Error('parseoptions(): bad_negation() not ported yet');
    /* optfn_boolean(): */
    if (o.addr) {
        if (o.name === "female" || o.name === "perm_invent"
            || o.name === "idlecheckpoint" || o.name === "pauper"
            || o.name === "ascii_map" || o.name === "tiled_map"
            || o.name === "hilite_pet")
            throw new Error(`parseoptions(): config option '${o.name}' not ported yet`);
        boolopt_set(o, !negated); /* <==== SET IT HERE */
    }
    (game.opt_set_in_config_names ||= []).push(o.name.toLowerCase());
    return retval;
}

// C ref: options.c complain_about_duplicate() -- 'using_alias' is passed
function complain_about_duplicate(o, using_alias) {
    let buf = '';

    if (using_alias)
        buf = ` (via alias: ${o.alias})`;
    config_error_add(`${(o.opttyp === CompOpt) ? "compound" : "boolean"} option specified multiple times: ${o.name}${buf}`);
}

// C ref: options.c initoptions_init() -- the defaults set before the
// config file is read: every boolean option's initval, and the compound
// option values the options menus show; returned as the flags, iflags,
// a11y and u.uroleplay fields to start the game with
export function initoptions_init_defaults() {
    const d = { flags: {}, iflags: {}, a11y: {}, uroleplay: {} };

    for (const o of allopt)
        if (o.addr)
            d[o.addr[0]][o.addr[1]] = o.initval;

    d.flags.end_own = false;
    d.flags.end_top = 3;
    d.flags.end_around = 2;
    d.flags.paranoia_bits = PARANOID_PRAY | PARANOID_SWIM | PARANOID_TRAP;
    d.flags.versinfo = 1; /* no git branch */
    d.flags.pile_limit = 5; /* PILE_LIMIT_DFLT */
    d.flags.runmode = RUN_LEAP;
    d.iflags.msg_history = 20;
    d.iflags.prevmsg_window = 's';
    d.iflags.menu_headings = { attr: ATR_INVERSE, color: NO_COLOR };
    d.flags.pickup_types = '';
    d.flags.pickup_burden = MOD_ENCUMBER;
    d.flags.sortloot = 'l'; /* sort only loot by default */
    d.flags.end_disclose = disclosure_options.split('').map(
        () => DISCLOSE_PROMPT_DEFAULT_NO);
    d.flags.menu_style = MENU_FULL;
    d.iflags.wc2_statuslines = 2;
    d.iflags.wc2_petattr = ATR_INVERSE;
    d.iflags.menuinvertmode = 1;
    /* allopt_array_init(): the do_init requests */
    d.flags.autounlock = 2; /* AUTOUNLOCK_APPLY_KEY */
    d.iflags.menuobjsyms = 4; /* "conditional" */
    d.flags.discosort = 'o';
    d.flags.vanq_sortmode = 0; /* VANQ_MLVL_MNDX */
    return d;
}

// C ref: options.c count_cond()
function count_cond() {
    let cnt = 0;
    for (const ct of condtests)
        if (ct.enabled)
            cnt++;
    return cnt;
}

// C ref: options.c optfn_*() get_val requests for the options shown in
// the options menus; returns the value string, or null for optn_err
function opt_get_val(o, req) {
    const flags = game.flags, iflags = game.iflags;
    const rolestring = (val, array, field) =>
        ((val >= 0) ? field(array[val]) : (val === ROLE_RANDOM) ? randomrole : none);

    switch (o.optfn) {
    case "optfn_windowtype":
        return "tty"; /* windowprocs.name */
    case "optfn_playmode":
        return flags.debug ? "debug" : flags.explore ? "explore" : "normal";
    case "optfn_name":
        return game.plname;
    case "optfn_role":
        return rolestring(flags.initrole, roles, r => r.name.m);
    case "optfn_race":
        return rolestring(flags.initrace, races, r => r.noun);
    case "optfn_gender":
        return rolestring(flags.initgend, genders, r => r.adj);
    case "optfn_alignment":
        return rolestring(flags.initalign, aligns, r => r.adj);
    case "optfn_catname":
    case "optfn_dogname":
    case "optfn_horsename": { /* petname_optfn() */
        const petname = (o.optfn === "optfn_catname") ? game.catname
                        : (o.optfn === "optfn_dogname") ? game.dogname
                          : game.horsename;
        return petname ? petname : (req === get_cnf_val) ? "none" : none;
    }
    case "optfn_msghistory":
        return `${iflags.msg_history}`;
    case "optfn_pettype":
        return (game.preferred_pet === 'c') ? "cat"
               : (game.preferred_pet === 'd') ? "dog"
                 : (game.preferred_pet === 'h') ? "horse"
                   : (game.preferred_pet === 'n') ? "none"
                     : "random";
    case "optfn_soundlib":
        return "nosound"; /* get_soundlib_name(): no soundlib */
    case "optfn_autounlock": {
        if (!flags.autounlock)
            return "none";
        const plus = " + ";
        let p = "", opts = "";
        if (flags.autounlock & 1) /* AUTOUNLOCK_UNTRAP */
            opts += p + unlocktypes[0], p = plus;
        if (flags.autounlock & 2) /* AUTOUNLOCK_APPLY_KEY */
            opts += p + unlocktypes[1], p = plus;
        if (flags.autounlock & 4) /* AUTOUNLOCK_KICK */
            opts += p + unlocktypes[2], p = plus;
        if (flags.autounlock & 8) /* AUTOUNLOCK_FORCE */
            opts += p + unlocktypes[3]; /*no more p*/
        return opts;
    }
    case "optfn_boulder": {
        /* BACKWARD_COMPAT: the S_boulder override, else the rock class
           symbol (no SYMBOLS= override of the class is consulted here) */
        const ov = game.ov_primary_syms?.[SYM_BOULDER + SYM_OFF_X];
        return ov ? String.fromCharCode(ov) : def_oc_syms[ROCK_CLASS];
    }
    case "optfn_crash_email":
        return game.crash_email || '';
    case "optfn_crash_name":
        return game.crash_name || '';
    case "optfn_crash_urlmax":
        return `${game.crash_urlmax ?? -1}`;
    case "optfn_disclose": {
        let opts = '';
        for (let i = 0; i < disclosure_options.length; i++) {
            if (i)
                opts += ' ';
            opts += flags.end_disclose[i];
            opts += disclosure_options[i];
        }
        return opts;
    }
    case "optfn_fruit":
        return game.pl_fruit;
    case "optfn_glyph":
        return to_be_done;
    case "optfn_hilite_status":
        /* count_status_hilites(): no status highlight rules */
        return (req === get_val) ? none : '';
    case "optfn_menu_headings": {
        const ca_buf = `${clr2colorname(iflags.menu_headings.color)}&${attr2attrname(iflags.menu_headings.attr)}`;
        /* change "no color" to "no-color" or "light blue" to "light-blue" */
        return ca_buf.replace(/ /g, "-");
    }
    case "optfn_menu_objsyms":
        return objsymvals[iflags.menuobjsyms];
    case "optfn_menuinvertmode":
        return `${iflags.menuinvertmode}`;
    case "optfn_menustyle":
        return menutype[flags.menu_style];
    case "optfn_msg_window": {
        const tmp = iflags.prevmsg_window;
        return (tmp === 's') ? "single"
               : (tmp === 'c') ? "combination"
                 : (tmp === 'f') ? "full"
                   : "reversed";
    }
    case "optfn_number_pad": {
        const numpadmodes = [
            "0=off", "1=on", "2=on, MSDOS compatible",
            "3=on, phone-style layout",
            "4=on, phone layout, MSDOS compatible",
            "-1=off, y & z swapped", /*[5]*/
        ];
        const Cmd = game.Cmd;
        const indx = Cmd.num_pad
                     ? (Cmd.phone_layout ? (Cmd.pcHack_compat ? 4 : 3)
                                         : (Cmd.pcHack_compat ? 2 : 1))
                     : Cmd.swap_yz ? 5 : 0;

        if (req === get_val)
            return numpadmodes[indx];
        return `${(indx === 5) ? -1 : indx}`;
    }
    case "optfn_packorder":
        return oc_to_str(def_inv_order.map(c => String.fromCharCode(c)).join(''));
    case "optfn_paranoid_confirmation": {
        let tmpbuf = '';
        for (let i = 0; paranoia[i].flagmask !== 0; ++i) {
            const { flagmask, argname } = paranoia[i];
            if ((flags.paranoia_bits & flagmask) !== 0
                /* hide paranoid_confirm:bones during play except for wizard
                   mode; keep it for any mode if rewriting the config file */
                && (flagmask !== 0x0008 /* PARANOID_BONES */
                    || flags.debug || req === get_cnf_val))
                tmpbuf += ` ${argname}`;
        }
        return tmpbuf ? tmpbuf.slice(1) : "none";
    }
    case "optfn_petattr":
        return attr2attrname(iflags.wc2_petattr);
    case "optfn_pickup_burden":
        return burdentype[flags.pickup_burden];
    case "optfn_pickup_types": {
        const ocl = oc_to_str(flags.pickup_types);
        return ocl ? ocl : "all";
    }
    case "optfn_pile_limit":
        return `${flags.pile_limit}`;
    case "optfn_roguesymset":
        /* gs.symset[ROGUESET].name: no rogue symset loaded */
        return "default";
    case "optfn_runmode":
        return runmodes[flags.runmode];
    case "optfn_scores": {
        let opts = '';
        if (flags.end_top > 0)
            opts += `${flags.end_top} top`;
        if (flags.end_around > 0)
            opts += `${(flags.end_top > 0) ? "/" : ""}${flags.end_around} around`;
        if (flags.end_own)
            opts += `${(flags.end_top > 0 || flags.end_around > 0) ? "/" : ""}own`;
        return opts || "none";
    }
    case "optfn_sortdiscoveries": { /* get_sortdisco() */
        let p = disco_order_let.indexOf(flags.discosort);
        if (p < 0)
            flags.discosort = 'o', p = 0;
        return (req === get_cnf_val) ? flags.discosort : disco_orders_descr[p];
    }
    case "optfn_sortloot":
        for (const s of sortltype)
            if (flags.sortloot === s[0])
                return s;
        return '';
    case "optfn_sortvanquished":
        return vanqorders[flags.vanq_sortmode][0]
               + ((req === get_val) ? `: ${vanqorders[flags.vanq_sortmode][1]}` : '');
    case "optfn_statushilites":
        return !iflags.hilite_delta
               ? "0 (off: don't highlight status fields)"
               : `${iflags.hilite_delta} (on: highlight status for ${iflags.hilite_delta} turns)`;
    case "optfn_statuslines":
        return wc2_supported(o.name)
               ? ((iflags.wc2_statuslines < 3) ? "2" : "3") : "unknown";
    case "optfn_suppress_alert": {
        const fnv = flags.suppress_alert;
        if (req === get_cnf_val && !fnv)
            return '';
        else if (!fnv)
            return none;
        return `${Math.floor(fnv / 0x1000000)}.${(fnv >> 16) & 0xff}.${(fnv >> 8) & 0xff}`;
    }
    case "optfn_symset": {
        /* gs.symset[PRIMARYSET]: the DECgraphics symset is the only one
           loaded so far (its name and handling from dat/symbols) */
        const dec = /^decgraphics$/i.test(game.symset_name || '');
        let opts = dec ? "DECgraphics" : "default";
        if (dec) /* gc.currentgraphics == PRIMARYSET */
            opts += ", active";
        if (dec) /* gs.symset[PRIMARYSET].handling == H_DEC */
            opts += `, handler=${known_handling[2]}`;
        return opts;
    }
    case "optfn_versinfo": {
        const vi = flags.versinfo;
        const g = (vi & 2) !== 0,  /* VI_NAME */
            b = (vi & 4) !== 0,    /* VI_BRANCH */
            n = (vi & 1) !== 0;    /* VI_NUMBER */

        /* status_version(): only the version number is ported */
        if (g || b)
            throw new Error('optfn_versinfo(): status_version() name/branch not ported yet');
        return `${vi}: ${g ? "name" : ""}${(b && g) ? "+" : ""}${b ? "branch" : ""}${(n && (b || g)) ? "+" : ""}${n ? "number" : ""} (${n ? VERSION_NUMBER : ""})`;
    }
    case "optfn_whatis_coord":
        return (iflags.getpos_coords === 'm') ? "map"
               : (iflags.getpos_coords === 'c') ? "compass"
                 : (iflags.getpos_coords === 'f') ? "full compass"
                   : (iflags.getpos_coords === 's') ? "screen"
                     : "none";
    case "optfn_whatis_filter":
        return (iflags.getloc_filter === 1) ? "view"
               : (iflags.getloc_filter === 2) ? "area"
                 : "none";
    case "optfn_o_autocomplete":
        return n_currently_set(0); /* count_autocompletions() */
    case "optfn_o_autopickup_exceptions":
        return n_currently_set(count_apes());
    case "optfn_o_bind_keys":
        return n_currently_set(count_bind_keys());
    case "optfn_o_menu_colors":
        return n_currently_set(0); /* count_menucolors() */
    case "optfn_o_message_types":
        return n_currently_set(0); /* msgtype_count() */
    case "optfn_o_status_cond":
        return (req === get_val) ? n_currently_set(count_cond()) : null;
    case "optfn_o_status_hilites":
        return n_currently_set(0); /* count_status_hilites() */
    case "optfn_boolean":
        return '';
    default:
        throw new Error(`${o.optfn}(): get_val not ported yet`);
    }
}

// C ref: (*allopt[i].optfn)(allopt[i].idx, get_val, FALSE, buf, empty_optstr)
// -- returns [reslt, buf]
function optfn_get_val(o, req = get_val) {
    const v = opt_get_val(o, req);
    return (v === null) ? [optn_err, ''] : [optn_ok, v];
}

// C ref: options.c longest_option_name()
function longest_option_name(startpass, endpass) {
    /* spin through the options to find the longest name */
    let longest_name_len = 0;

    for (let pass = 0; pass < 2; pass++)
        for (const o of allopt) {
            const name = o.name;
            if (pass === 0 && (o.opttyp !== BoolOpt || !o.addr))
                continue;
            const optflags = o.setwhere;
            if (optflags < startpass || optflags > endpass)
                continue;
            if ((is_wc_option(name) && !wc_supported(name))
                || (is_wc2_option(name) && !wc2_supported(name)))
                continue;

            if (name.length > longest_name_len)
                longest_name_len = name.length;
        }
    return longest_name_len;
}

// C ref: options.c doset_simple_menu() -- guts of doset_simple(); called
// repeatedly until no choice is made
async function doset_simple_menu() {
    /* unlike doset()'s fmtstr, there is no leading %s for indentation */
    let fmtstr;
    let buf, abuf;
    let tmpwin;
    let any;
    let k, pick_cnt, reslt;
    let toggled_help = false;

    /* we do this each time we're called instead of once in doset_simple()
       in case 'menu_tab_sep' ever gets included in the simple menu so
       becomes subject to being changed while doset_simple() is running */
    if (!game.iflags.menu_tab_sep) {
        const w = longest_option_name(set_gameview, set_in_game);
        fmtstr = (name, val) => `${name.padEnd(w)} [${val}]`;
    } else {
        fmtstr = (name, val) => `${name}\t[${val}]`;
    }

    for (;;) { /* redo_opt_help: */
        tmpwin = tty_create_nhwindow(NHW_MENU);
        tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);

        /* when showing 'help', also describe how to run full doset() */
        if (game.simple_options_help) {
            /* we could look up whether #optionsfull has been bound to a key
               and show that, or whether #reqmenu and #options are both still
               bound to keys and show those, but if meta keys are involved
               the player might not know how to type them; keep this simple */
            buf = "Use command '#optionsfull' to get the complete options list.";
            add_menu_str(tmpwin, buf);
        }
        any = -2 + 1;
        tty_add_menu(tmpwin, null, any, '?', 0, ATR_NONE, NO_COLOR,
                     game.simple_options_help ? "hide help" : "show help",
                     MENU_ITEMFLAGS_NONE);

        for (let section = OptS_General; section < OptS_Advanced; section++) {
            add_menu_str(tmpwin, "");
            buf = ` ${OptS_type[section].padEnd(30)} `;
            add_menu_heading(tmpwin, buf);
            for (let i = 0; i < allopt.length; i++) {
                const o = allopt[i];
                let name = o.name;
                if (o.section !== section)
                    continue;
                if ((is_wc_option(name) && !wc_supported(name))
                    || (is_wc2_option(name) && !wc2_supported(name)))
                    continue;

                any = i + 1;
                switch (o.opttyp) {
                case BoolOpt:
                    if (!o.addr)
                        continue;
                    if (game.iflags.wc_tiled_map && o.name === "color")
                        continue;
                    buf = fmtstr(name, boolopt_get(o) ? "X" : " ");
                    break;
                case CompOpt:
                case OthrOpt: {
                    k = i;
                    if (o.optfn === "optfn_symset" && Is_rogue_level(game.u.uz))
                        throw new Error('doset_simple_menu(): roguesymset not ported yet');

                    let buf2 = '';
                    reslt = optn_err;
                    if (allopt[k].optfn)
                        [reslt, buf2] = optfn_get_val(allopt[k]);
                    buf = fmtstr(name, ((reslt === optn_ok && buf2) ? buf2 : "unknown"));
                    break;
                }
                default:
                    buf = "ERROR";
                    break;
                }
                /* pickup_types is separated from autopickup due to the
                   spelling of their names; emphasize what it means */
                if (o.name === "pickup_types" || o.name === "pickup_thrown"
                    || o.name === "pickup_stolen" || o.name === "dropped_nopick")
                    buf += "  (for autopickup)";
                tty_add_menu(tmpwin, null, any, 0, 0,
                             ATR_NONE, NO_COLOR, buf, MENU_ITEMFLAGS_NONE);
                if (game.simple_options_help && o.descr) {
                    buf = `    ${o.descr}`;
                    add_menu_str(tmpwin, buf);
                    add_menu_str(tmpwin, "");
                }
            }
        }
        tty_end_menu(tmpwin, "Options");

        game.opt_need_redraw = false;
        game.opt_need_glyph_reset = false;
        game.opt_reset_customcolors = false;
        game.opt_reset_customsymbols = false;
        game.opt_update_basic_palette = false;
        let pick_list;
        ({ n: pick_cnt, selected: pick_list } = await tty_select_menu(tmpwin, PICK_ONE));
        /* note:  without the complication of a preselected entry, a PICK_ONE
           menu returning pick_cnt > 0 implies exactly 1 */
        if (pick_cnt > 0) {
            k = pick_list[0].item - 1;

            abuf = '';
            if (k === -2) {
                game.simple_options_help = !game.simple_options_help;
                toggled_help = true;
            } else if (allopt[k].opttyp === BoolOpt) {
                /* boolean option */
                buf = `${boolopt_get(allopt[k]) ? "!" : ""}${allopt[k].name}`;
                await parseoptions(buf, false, false);
            } else {
                /* compound option */
                if (allopt[k].has_handler && allopt[k].optfn) {
                    reslt = await optfn_do_handler(allopt[k]);
                    /* if player eventually saves options, include this one */
                } else {
                    buf = `Set ${allopt[k].name} to what?`;
                    abuf = await tty_getlin(buf);
                    if (abuf[0] !== '\x1b') { /* ESC */
                        buf = `${allopt[k].name}:${abuf}`;
                        /* pass the buck */
                        await parseoptions(buf, false, false);
                    }
                    /* Note: using ESC to not set a new value will still return
                       'picked 1' to caller which will loop for another choice */
                }
            }
            if (k >= 0 && abuf[0] !== '\x1b'
                && (wc_supported(allopt[k].name)
                    || wc2_supported(allopt[k].name)))
                preference_update(allopt[k].name);
        }
        /* tear down this instance of the menu; if pick_cnt is 1, caller
           will immediately call us back to put up another instance */
        await tty_destroy_nhwindow(tmpwin);

        if (toggled_help) {
            toggled_help = false;
            continue; /* goto redo_opt_help */
        }
        break;
    }

    return pick_cnt;
}

/* C ref: options.c OptS_type[] */
const OptS_type = ["General", "Behavior", "Map", "Status", "Advanced"];

// C ref: options.c doset_simple() -- #options - the user friendly
// version:  get one option from a subset of the zillion choices, act upon
// it, and prompt for another
export async function doset_simple() {
    let pickedone = 0;
    let flush = false;

    if (game.iflags.menu_requested) {
        /* doset() checks for 'm' and calls doset_simple(); clear the
           menu-requested flag to avoid doing that recursively */
        game.iflags.menu_requested = false;
        return await doset();
    }

    game.opt_phase = 'play_opt';
    /* select and change one option at a time, then reprocess the menu
       with updated settings to offer chance for further change */
    game.give_opt_msg = false;
    do {
        pickedone = await doset_simple_menu();
        flush = game.opt_need_redraw;

        await reset_needed_visuals();
        if (flush) {
            await flush_screen(1);
            flush = false;
        }
    } while (pickedone > 0);
    game.give_opt_msg = true;
    return ECMD_OK;
}

// C ref: options.c term_for_boolean()
function term_for_boolean(o, b) {
    const f_t = b ? 1 : 0;
    const booleanterms = [
        ["false", "off", "disabled", "excluded from build"],
        ["true", "on", "enabled", "included"],
    ];

    let boolean_term = booleanterms[f_t][0];
    const i = o.termpref;
    if (i > Term_False && i < num_terms && i < booleanterms[0].length)
        boolean_term = booleanterms[f_t][i];
    return boolean_term;
}

// C ref: options.c doset() -- the #optionsfull command (changing options
// via menu by Per Liboriussen)
export async function doset() {
    let buf;
    let pick_cnt, opt_indx;
    let tmpwin;
    let any;
    let fmtstr_doset;
    let gavehelp = false, skiphelp = (game.iflags.cmdassist === false);
    const HELP_IDX = allopt.length; /* SIZE(allopt) */
    const clr = NO_COLOR;
    const wizard = !!game.flags.debug;

    if (game.iflags.menu_requested) {
        /* doset_simple() checks for 'm' and calls doset(); clear the
           menu-requested flag to avoid doing that recursively */
        game.iflags.menu_requested = false;
        return await doset_simple();
    }

    game.opt_phase = 'play_opt';
    /* if we offer '?' as a choice and it is the only thing chosen,
       we'll end up coming back here after showing the explanatory text */
    for (;;) { /* rerun: */
        tmpwin = tty_create_nhwindow(NHW_MENU);
        tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);

        /* offer novices a chance to request helpful [sic] advice */
        if (!skiphelp) {
            /* help text surrounding '?' choice should have exactly one NULL */
            const helptext = [
                "For a brief explanation of how this works, type '?' to select",
                "the next menu choice, then press <enter> or <return>.",
                null, /* actual '?' menu entry gets inserted here */
                "[To suppress this menu help, toggle off the 'cmdassist' option.]",
                "",
            ];
            for (const ht of helptext) {
                if (ht !== null) {
                    buf = `    ${ht.slice(0, 75)}`;
                    add_menu_str(tmpwin, buf);
                } else {
                    any = HELP_IDX + 1; /* handling pick_list subtracts 1 */
                    tty_add_menu(tmpwin, null, any, '?', '?', ATR_NONE,
                                 clr, "view help for options menu",
                                 MENU_ITEMFLAGS_SKIPINVERT);
                }
            }
        }

        const startpass = set_gameview;
        const endpass = wizard ? set_wiznofuz : set_in_game;

        if (!game.iflags.menu_tab_sep) {
            /* initial "%s" is for indentation of non-selectable items */
            const w = longest_option_name(startpass, endpass);
            fmtstr_doset = (indent, name, val) => `${indent}${name.padEnd(w)} [${val}]`;
        } else {
            fmtstr_doset = (indent, name, val) => `${indent}${name}\t[${val}]`;
        }

        const indexoffset = 1;
        add_menu_heading(tmpwin, "Booleans (selecting will toggle value):");
        /* first list any other non-modifiable booleans, then modifiable ones */
        for (let pass = 0; pass <= 1; pass++)
            for (let i = 0; i < allopt.length; i++) {
                const o = allopt[i], name = o.name;
                if (o.opttyp === BoolOpt && o.addr
                    && ((o.setwhere <= set_gameview && pass === 0)
                        || (o.setwhere >= set_in_game && pass === 1))) {
                    if (o.addr[0] === 'flags' && o.addr[1] === 'female')
                        continue; /* obsolete */
                    if (o.setwhere === set_wizonly && !wizard)
                        continue;
                    if (o.setwhere === set_wiznofuz
                        && (!wizard || game.iflags.debug_fuzzer))
                        continue;
                    if ((is_wc_option(name) && !wc_supported(name))
                        || (is_wc2_option(name) && !wc2_supported(name)))
                        continue;

                    any = (pass === 0) ? 0 : i + 1 + indexoffset;
                    const indent = (pass === 0 && !game.iflags.menu_tab_sep) ? "    " : "";
                    buf = fmtstr_doset(indent, name, term_for_boolean(o, boolopt_get(o)));
                    /* if (pass == 0) enhance_menu_text(): adds nothing */
                    tty_add_menu(tmpwin, null, any, 0, 0,
                                 ATR_NONE, clr, buf, MENU_ITEMFLAGS_SKIPINVERT);
                }
            }

        add_menu_str(tmpwin, "");
        add_menu_heading(tmpwin,
                         "Compounds (selecting will prompt for new value):");

        for (let pass = startpass; pass <= endpass; pass++)
            for (let i = 0; i < allopt.length; i++) {
                const o = allopt[i], name = o.name;
                if (o.opttyp !== CompOpt)
                    continue;
                if (o.setwhere === pass) {
                    if ((is_wc_option(name) && !wc_supported(name))
                        || (is_wc2_option(name) && !wc2_supported(name)))
                        continue;

                    doset_add_menu(tmpwin, name, fmtstr_doset, i,
                                   (pass === set_gameview) ? 0 : indexoffset);
                }
            }

        add_menu_str(tmpwin, "");
        add_menu_heading(tmpwin, "Other settings:");

        for (let pass = startpass; pass <= endpass; pass++)
            for (let i = 0; i < allopt.length; i++) {
                const o = allopt[i], name = o.name;
                if (o.opttyp !== OthrOpt)
                    continue;
                if (o.setwhere === pass) {
                    if ((is_wc_option(name) && !wc_supported(name))
                        || (is_wc2_option(name) && !wc2_supported(name)))
                        continue;

                    doset_add_menu(tmpwin, name, fmtstr_doset, i,
                                   (pass === set_gameview) ? 0 : indexoffset);
                }
            }

        /* PREFIXES_IN_USE isn't defined: no "Variable playground locations" */
        tty_end_menu(tmpwin, "Set what options?");
        game.opt_need_redraw = false;
        game.opt_need_glyph_reset = false;

        let pick_list;
        ({ n: pick_cnt, selected: pick_list } = await tty_select_menu(tmpwin, PICK_ANY));
        if (pick_cnt > 0) {
            /*
             * Walk down the selection list and either invert the booleans
             * or prompt for new values. In most cases, call parseoptions()
             * to take care of options that require special attention, like
             * redraws.
             */
            for (let pick_idx = 0; pick_idx < pick_cnt; ++pick_idx) {
                opt_indx = pick_list[pick_idx].item - 1;
                if (opt_indx === HELP_IDX) {
                    throw new Error('doset(): display_file(OPTMENUHELP) not ported yet');
                }
                if (opt_indx < -1)
                    opt_indx++; /* -1 offset for select_menu() */
                opt_indx -= indexoffset;
                const o = allopt[opt_indx];
                if (o.opttyp === BoolOpt) {
                    /* boolean option */
                    buf = `${boolopt_get(o) ? "!" : ""}${o.name}`;
                    await parseoptions(buf, false, false);
                } else {
                    /* compound option */
                    if (o.has_handler && o.optfn) {
                        await optfn_do_handler(o);
                        /* if player eventually saves options, include this one */
                    } else {
                        buf = `Set ${o.name} to what?`;
                        const abuf = await tty_getlin(buf);
                        if (abuf[0] === '\x1b')
                            continue;
                        buf = `${o.name}:${abuf}`;
                        /* pass the buck */
                        await parseoptions(buf, false, false);
                    }
                }
                if (wc_supported(o.name) || wc2_supported(o.name))
                    preference_update(o.name);
            }
        }

        await tty_destroy_nhwindow(tmpwin);

        if (pick_cnt === 1 && gavehelp) {
            /* when '?' is only the thing selected, go back and pick all
               over again without it as an available choice second time */
            skiphelp = true;
            gavehelp = false; /* currently True; reset for second pass */
            continue; /* goto rerun */
        }
        break;
    }

    await reset_needed_visuals();
    return ECMD_OK;
}

// C ref: options.c reset_needed_visuals()
async function reset_needed_visuals() {
    if (game.opt_need_glyph_reset) {
        /* reset_glyphmap(gm_optionchange): the JS map has no glyph map
           cache; the redraw below maps the glyphs afresh */
    }
    if (game.opt_reset_customcolors || game.opt_update_basic_palette
        || game.opt_reset_customsymbols || game.opt_need_redraw) {
        if (game.opt_update_basic_palette) {
            /* change_palette(): CHANGE_COLOR isn't defined */
            game.opt_update_basic_palette = false;
        }
        /* reset_customcolors(), reset_customsymbols(): no custom colors
           or symbols are set */
        if (game.opt_need_redraw) {
            /* check_gold_symbol(); reglyph_darkroom(): nothing to redo
               with the symsets ported so far */
        }
        await docrt();
    }
    /* go.opt_need_promptstyle: adjust_menu_promptstyle() is a no-op for
       tty */
    if (game.disp_botl || game.disp_botlx) {
        bot();
    }
    game.opt_need_redraw = false;
    game.opt_need_glyph_reset = false;
    game.opt_reset_customcolors = false;
    game.opt_reset_customsymbols = false;
    game.opt_update_basic_palette = false;
}

// C ref: options.c doset_add_menu() -- doset(#optionsfull command) menu
// entries for compound options
function doset_add_menu(win, option, fmtstr, idx, indexoffset) {
    let value = "unknown"; /* current value */
    let any;
    let i = idx, reslt = optn_err;
    let buf2 = ''; /* per opt functs may not guarantee this, so do it */
    const clr = NO_COLOR;

    if (i >= 0 && i < allopt.length && allopt[i].name && allopt[i].optfn) {
        any = (indexoffset === 0) ? 0 : i + 1 + indexoffset;
        [reslt, buf2] = optfn_get_val(allopt[i]);
        if (reslt === optn_ok && buf2)
            value = buf2;
    } else {
        /* We are trying to add an option not found in allopt[].
           This is almost certainly bad, but we'll let it through anyway
           (with a zero value, so it can't be selected). */
        any = 0;
        if (!buf2)
            buf2 = "unknown";
        value = buf2;
    }

    /* "    " replaces "a - " -- assumes menus follow that style */
    const indent = !any ? "    " : "";
    const buf = fmtstr(indent, option, value);
    tty_add_menu(win, null, any, 0, 0,
                 ATR_NONE, clr, buf, MENU_ITEMFLAGS_SKIPINVERT);
}

// C ref: options.c (*allopt[k].optfn)(allopt[k].idx, do_handler, ...) --
// the handlers of the compound options ported so far
async function optfn_do_handler(o) {
    switch (o.optfn) {
    case "optfn_pickup_types":
        return await handler_pickup_types();
    case "optfn_sortdiscoveries":
        /* return handler_sortdiscoveries(); */
        await choose_disco_sort(0); /* o_init.c */
        return optn_ok;
    default:
        throw new Error(`${o.optfn}(): do_handler not ported yet`);
    }
}

// C ref: options.c handler_pickup_types()
async function handler_pickup_types() {
    /* parseoptions will prompt for the list of types */
    await parseoptions("pickup_types", false, false);
    return optn_ok;
}

// C ref: windows.c preference_update() -> tty_preference_update(): only
// "statuslines" does anything for tty
function preference_update(pref) {
    if (pref === "statuslines" && game.iflags.window_inited)
        throw new Error('tty_preference_update(): statuslines not ported yet');
}

// C ref: options.c parseoptions() -- the in-game call from the options
// menus (tinitial and tfrom_file are FALSE): one option, by its full name
async function parseoptions(opts, tinitial, tfrom_file) {
    let negated = false;
    let matchidx = -1, optresult = optn_err;

    game.opt_initial = tinitial;
    game.opt_from_file = tfrom_file;
    if (tinitial)
        throw new Error('parseoptions(): config file options are read by parseNethackrc()');

    /* strip leading and trailing white space */
    opts = opts.trim();
    while (opts[0] === '!' || !strncmpi(opts, "no", 2)) {
        opts = opts.slice((opts[0] === '!') ? 1 : (opts[2] !== '-') ? 2 : 3);
        negated = !negated;
    }
    const colon = opts.search(/[:=]/);
    const optname = (colon >= 0) ? opts.slice(0, colon) : opts;

    /* match_optname() with the full option name */
    for (let i = 0; i < allopt.length; ++i)
        if (!allopt[i].pfx && !strcmpi(optname, allopt[i].name)) {
            matchidx = i;
            break;
        }
    if (matchidx < 0)
        throw new Error(`parseoptions(): option '${optname}' not ported yet`);

    const o = allopt[matchidx];
    /* check for bad negation, so option functions don't have to */
    if (negated && !o.negateok)
        throw new Error('parseoptions(): bad_negation() not ported yet');

    /*
     * Now call the option's associated function via the function
     * pointer for it in the allopt[] array, specifying a 'do_set' req.
     */
    const op = (colon >= 0) ? opts.slice(colon + 1).trim() : null; /* string_for_opt() */
    if (o.opttyp === BoolOpt)
        optresult = await optfn_boolean(o, do_set, negated, opts, op);
    else if (o.optfn === "optfn_pickup_types")
        optresult = await optfn_pickup_types_set(o, negated, opts, op);
    else if (o.optfn === "optfn_fruit")
        optresult = optfn_fruit(o, do_set, negated, opts, op);
    else
        throw new Error(`${o.optfn}(): do_set not ported yet`);

    return optresult === optn_ok;
}

/* C ref: options.c empty_optstr -- string_for_opt()'s "no value" result */
const empty_optstr = '';

// C ref: options.c string_for_opt()
/* the value part of "name:value" or "name=value" (C returns a pointer
   into 'opts'); empty_optstr if there isn't one */
function string_for_opt(opts, val_optional) {
    let colon = opts.indexOf(':');
    const equals = opts.indexOf('=');
    if (colon < 0 || (equals >= 0 && equals < colon))
        colon = equals;

    if (colon < 0 || colon + 1 >= opts.length) {
        if (!val_optional)
            throw new Error('string_for_opt(): config_error_add() not ported yet');
        return empty_optstr;
    }
    return opts.slice(colon + 1);
}

// C ref: options.c nmcpy()
/* copy up to maxlen-1 characters; treat comma as alternate end of 'src'
   (C copies into 'dest'; JS returns the copy) */
function nmcpy(src, maxlen) {
    let count, i = 0;

    for (count = 1; count < maxlen; count++) {
        if (i >= src.length || src[i] === ',')
            break; /*exit on \0 terminator*/
        i++;
    }
    return src.slice(0, i);
}

// C ref: options.c optfn_fruit() -- do_set from the config file
// (go.opt_initial is TRUE while it is read)
export function optfn_fruit_initial(negated, opts) {
    const save_initial = game.opt_initial;

    game.opt_initial = true;
    optfn_fruit(null, do_set, negated, opts, null);
    game.opt_initial = save_initial;
}

// C ref: options.c optfn_fruit()
function optfn_fruit(o, req, negated, opts, op) {
    let forig = null;

    if (req === do_init) {
        return optn_ok;
    }
    if (req === do_set) {
        op = string_for_opt(opts, negated || !game.opt_initial);
        if (negated) {
            if (op !== empty_optstr) {
                throw new Error('optfn_fruit(): bad_negation() not ported yet');
            }
            op = empty_optstr;
        } else {
            if (op === empty_optstr)
                return optn_err;
            /* strip leading/trailing spaces, condense internal ones (3.6.2) */
            op = mungspaces(op);
            if (!game.opt_initial) {
                let f;
                const fnum = { v: 0 };

                /* count number of named fruits; if 'op' is found among them,
                   then the count doesn't matter because we won't be adding it */
                f = fruit_from_name(op, false, fnum);
                if (!f) {
                    if (!game.flags.made_fruit)
                        forig = fruit_from_name(game.pl_fruit, false, null);

                    if (!forig && fnum.v >= 100) {
                        throw new Error('optfn_fruit(): config_error_add() not ported yet');
                    }
                }
            }
        }
        /* goodfruit: */
        game.pl_fruit = nmcpy(op, PL_FSIZ);
        game.pl_fruit = sanitize_name(game.pl_fruit);
        /* OBJ_NAME(objects[SLIME_MOLD]) won't work for this after
           initialization; it gets changed to generic "fruit" */
        if (!game.pl_fruit)
            game.pl_fruit = nmcpy("slime mold", PL_FSIZ);
        if (!game.opt_initial) {
            /* if 'forig' is nonNull, we replace it rather than add
               a new fruit; it can only be nonNull if no fruits have
               been created since the previous name was put in place */
            fruitadd(game.pl_fruit, forig);
            if (game.give_opt_msg)
                pline(`Fruit is now "${game.pl_fruit}".`);
        }
        /* If initial, then initoptions is allowed to do it instead
         * of here (initoptions always has to do it even if there's
         * no fruit option at all.  Also, we don't want people
         * setting multiple fruits in their options.)
         */
        return optn_ok;
    }
    return optn_ok;
}

// C ref: options.c fruitadd()
/* Returns the fid of the fruit type; if that type already exists, it
 * returns the fid of that one; if it does not exist, it adds a new fruit
 * type to the chain and returns the new one.
 * If replace_fruit is sent in, replace the fruit in the chain rather than
 * adding a new entry--for user specified fruits only.
 */
export function fruitadd(str, replace_fruit) {
    let i;
    let f;
    let globpfx;
    const highest_fruit_id = { v: 0 };
    let altname;
    /* C: str == svp.pl_fruit (the same buffer); JS strings have no
       identity, so the user-specified callers pass game.pl_fruit itself */
    const user_specified = (str === game.pl_fruit);
    /* if not user-specified, then it's a fruit name for a fruit on
     * a bones level or from orctown raider's loot...
     */

    /* Note: every fruit has an id (kept in obj->spe) of at least 1;
     * 0 is an error.
     */
    if (user_specified) {
        let found = false, numeric = false;

        /* force fruit to be singular; this handling is not
           needed--or wanted--for fruits from bones because
           they already received it in their original game;
           str==pl_fruit but makesingular() creates a copy
           so we need to copy that back into pl_fruit */
        game.pl_fruit = nmcpy(makesingular(str), PL_FSIZ);
        const pl_fruit = game.pl_fruit;

        /* disallow naming after other foods (since it'd be impossible
         * to tell the difference); globs might have a size prefix which
         * needs to be skipped in order to match the object type name
         */
        globpfx = (pl_fruit.startsWith("small ")
                   || pl_fruit.startsWith("large ")) ? 6
                  : (pl_fruit.startsWith("medium ")) ? 7
                    : (pl_fruit.startsWith("very large ")) ? 11
                      : 0;
        /* svb.bases[] is still zero when initoptions() runs before
           o_init() */
        for (i = game.bases?.[FOOD_CLASS] ?? 0;
             objects[i] && objects[i].oc_class === FOOD_CLASS; i++) {
            if (OBJ_NAME(objects[i]) === pl_fruit
                || (globpfx > 0 && OBJ_NAME(objects[i])
                                   === pl_fruit.slice(globpfx))) {
                found = true;
                break;
            }
        }
        if (!found) {
            let c = 0;

            while (c < pl_fruit.length
                   && pl_fruit[c] >= '0' && pl_fruit[c] <= '9')
                c++;
            if (c >= pl_fruit.length || /\s/.test(pl_fruit[c]))
                numeric = true;
        }
        if (found || numeric
            /* these checks for applying food attributes to actual items
               are case sensitive; "glob of foo" is caught by 'found'
               if 'foo' is a valid glob; when not valid, allow it as-is */
            || pl_fruit.startsWith("cursed ")
            || pl_fruit.startsWith("uncursed ")
            || pl_fruit.startsWith("blessed ")
            || pl_fruit.startsWith("partly eaten ")
            || (pl_fruit.startsWith("tin of ")
                && (pl_fruit.slice(7) === "spinach"
                    || ismnum(name_to_mon(pl_fruit.slice(7), null))))
            || pl_fruit === "empty tin"
            || (pl_fruit === "glob"
                || (globpfx > 0 && "glob" === pl_fruit.slice(globpfx)))
            || ((str_end_is(pl_fruit, " corpse")
                 || str_end_is(pl_fruit, " egg"))
                && ismnum(name_to_mon(pl_fruit, null)))) {
            const buf = pl_fruit;
            game.pl_fruit = "candied " + nmcpy(buf, PL_FSIZ - 8);
        }
        altname = '';
        /* This flag indicates that a fruit has been made since the
         * last time the user set the fruit.  If it hasn't, we can
         * safely overwrite the current fruit, preventing the user from
         * setting many fruits in a row and overflowing.
         * Possible expansion: check for specific fruit IDs, not for
         * any fruit.
         */
        game.flags.made_fruit = false;
        if (replace_fruit) {
            /* replace_fruit is already part of the fruit chain;
               update it in place rather than looking it up again */
            f = replace_fruit;
            f.fname = copynchars(game.pl_fruit, PL_FSIZ - 1);
            /* goto nonew */
            game.context.current_fruit = f.fid;
            return f.fid;
        }
        str = game.pl_fruit;
    } else {
        /* not user_supplied, so assumed to be from bones (or orc gang) */
        altname = copynchars(str, PL_FSIZ - 1);
        altname = sanitize_name(altname);
        game.flags.made_fruit = true; /* for safety.  Any fruit name added from a
                                       * bones level should exist anyway. */
    }
    f = fruit_from_name(altname ? altname : str, false, highest_fruit_id);
    if (!f) {
        /* Maximum number of named fruits is 127, even if obj->spe can
           handle bigger values.  If adding another fruit would overflow,
           use a random fruit instead... we've got a lot to choose from.
           current_fruit remains as is. */
        if (highest_fruit_id.v >= 127)
            return rnd(127);

        f = { fname: copynchars(altname ? altname : str, PL_FSIZ - 1),
              fid: ++highest_fruit_id.v, nextf: null };
        /* we used to go out of our way to add it at the end of the list,
           but the order is arbitrary so use simpler insertion at start */
        f.nextf = game.ffruit;
        game.ffruit = f;
    }
    /* nonew: */
    if (user_specified)
        game.context.current_fruit = f.fid;
    return f.fid;
}

// C ref: options.c optfn_boolean() -- do_set, from the options menus
async function optfn_boolean(o, req, negated, opts, op) {
    if (req !== do_set)
        return optn_ok;

    if (!o.addr)
        return optn_ok; /* silent retreat */

    /* option that must come from config file? */
    if (!game.opt_initial && (o.setwhere === set_in_config))
        return optn_err;

    if (op) {
        throw new Error('optfn_boolean(): a value for a boolean not ported yet');
    }
    /* Before the change */
    if (o.name === "female")
        throw new Error('optfn_boolean(): female in game not ported yet');
    if (o.name === "perm_invent" && !negated)
        throw new Error('optfn_boolean(): can_set_perm_invent() not ported yet');

    boolopt_set(o, !negated); /* <==== SET IT HERE */

    /* After the change */
    switch (o.name) {
    case "pauper":
        /* pauper implies nudist */
        game.u.uroleplay.nudist = game.u.uroleplay.pauper;
        break;
    case "ascii_map":
        game.iflags.wc_tiled_map = negated;
        break;
    case "tiled_map":
        game.iflags.wc_ascii_map = negated;
        break;
    case "hilite_pet":
        /* if we're enabling hilite_pet and petattr isn't set,
           set it to Inverse; if we're disabling, leave petattr
           alone so that re-enabling will get current value back */
        if (game.iflags.wc_hilite_pet && !game.iflags.wc2_petattr)
            game.iflags.wc2_petattr = ATR_INVERSE;
        game.opt_need_redraw = true;
        break;
    case "idlecheckpoint":
        /* IDLECHECKPOINT isn't defined */
        await pline("There is no underlying support for 'idlecheckpoint' compiled in.");
        game.iflags.idlecheckpoint = false;
        game.give_opt_msg = false;
        break;
    default:
        break;
    }

    /* only do processing below if setting with doset() */

    if (game.opt_initial)
        return optn_ok;

    switch (o.name) {
    case "terrainstatus":
    case "weaponstatus":
    case "armorstatus":
        throw new Error('optfn_boolean(): extra status fields not ported yet');
    case "showscore":
    case "showvers":
    case "showexp":
    case "time":
        /* status_initialize(REASSESS_ONLY): the tty status lines are
           composed afresh by bot() */
        game.disp_botl = true;
        break;
    case "fixinv":
    case "price_quotes":
    case "sortpack":
    case "implicit_uncursed":
    case "wizweight":
        if (!game.flags.invlet_constant)
            reassign();
        /* update_inventory(): no perm_invent window */
        break;
    case "lit_corridor":
    case "dark_room":
        /*
         * All corridor squares seen via night vision or
         * candles & lamps change.  Update them by calling
         * newsym() on them.  Don't do this if we are
         * initializing the options --- the vision system
         * isn't set up yet.
         */
        vision_recalc(2);              /* shut down vision */
        game.vision_full_recalc = 1;   /* delayed recalc */
        if (game.iflags.wc_color)      /* iflags.use_color */
            game.opt_need_redraw = true; /* darkroom refresh */
        break;
    case "wizmgender":
    case "showrace":
    case "use_inverse":
    case "hilite_pile":
    case "perm_invent":
    case "ascii_map":
    case "tiled_map":
        game.opt_need_redraw = true;
        game.opt_need_glyph_reset = true;
        break;
    case "hitpointbar":
        /* VIA_WINDOWPORT(): status_initialize(REASSESS_ONLY) */
        game.opt_need_redraw = true;
        break;
    case "color":
        game.opt_need_redraw = true;
        game.opt_need_glyph_reset = true;
        break;
    case "customcolors":
        game.opt_reset_customcolors = true;
        break;
    case "customsymbols":
        game.opt_reset_customsymbols = true;
        break;
    case "menucolors":
    case "guicolor":
        /* update_inventory(): no perm_invent window */
        game.opt_need_promptstyle = true;
        break;
    case "mention_decor":
        game.iflags.prev_decor = STONE;
        break;
    case "rest_on_space":
        update_rest_on_space();
        break;
    case "accessiblemsg":
        game.a11y.msg_loc = { x: 0, y: 0 };
        break;
    default:
        break;
    }

    /* boolean value has been toggled but some option changes can
       still be pending at this point (mainly for opt_need_redraw);
       give the toggled message now regardless */
    if (game.give_opt_msg !== false)
        await pline(`'${o.name}' option toggled ${!negated ? "on" : "off"}.`);

    return optn_ok;
}

// C ref: options.c optfn_pickup_types() -- do_set from the options menus
async function optfn_pickup_types_set(o, negated, opts, op) {
    const flags = game.flags;
    const compat = (opts.length <= 6);
    let use_menu;

    /* types of objects to pick up automatically */
    let tbuf = oc_to_str(flags.pickup_types);
    flags.pickup_types = ''; /* all */
    if (op === null) { /* string_for_opt(opts, (compat || !opt_initial)) */
        if (compat || negated || game.opt_initial) {
            /* for backwards compatibility, "pickup" without a
               value is a synonym for autopickup of all types
               (and during initialization, we can't prompt yet) */
            flags.pickup = !negated;
            return optn_ok;
        }
        let ocl = oc_to_str(def_inv_order.map(c => String.fromCharCode(c)).join(''));
        use_menu = true;
        if (flags.menu_style === MENU_TRADITIONAL
            || flags.menu_style === MENU_COMBINATION) {
            let wasspace;

            use_menu = false;
            const qbuf = `New ${o.name}: [${ocl} am] (${tbuf ? tbuf : "all"})`;
            let abuf = (await tty_getlin(qbuf)) || '';
            wasspace = (abuf[0] === ' '); /* before mungspaces */
            abuf = mungspaces(abuf);
            op = abuf;
            if (wasspace && !abuf[0])
                ; /* one or more spaces will remove old value */
            else if (!abuf[0] || abuf[0] === '\x1b')
                op = tbuf; /* restore */
            else if (abuf[0] === 'm')
                use_menu = true;
            /* note: abuf[0]=='a' is already handled via clearing
               the old value (above) as a default action */
        }
        if (use_menu) {
            if (game.flags.debug && !ocl.includes(VENOM_SYM))
                ocl += VENOM_SYM;
            const res = await choose_classes_menu("Autopickup what?",
                                                  1, true, ocl, tbuf);
            tbuf = res.class_select;
            op = tbuf;
        }
    }
    if (negated)
        throw new Error('optfn_pickup_types(): bad_negation() not ported yet');
    op = op.replace(/^ +/, '');
    if (op[0] !== 'a' && op[0] !== 'A') {
        let badopt = false;
        for (const ch of op) {
            const oc_sym = def_char_to_objclass(ch);
            /* make sure all are valid obj symbols occurring once */
            if (oc_sym !== MAXOCLASSES
                && !flags.pickup_types.includes(String.fromCharCode(oc_sym))) {
                flags.pickup_types += String.fromCharCode(oc_sym);
            } else
                badopt = true;
        }
        if (badopt) {
            /* op has been advanced past the last symbol */
            await config_error_add_interactive(
                `Unknown ${o.name} parameter ''`);
            return optn_err;
        }
    }
    return optn_ok;
}

// C ref: cfgfiles.c config_erradd() -- the !program_state.config_error_ready
// case, reached when the player gives a bad value when prompted by the
// interactive 'O' command (pline() then wait_synch(), a no-op for tty
// with the map window up)
async function config_error_add_interactive(buf) {
    if (game.program_state?.config_error_ready) {
        config_error_add(buf);
        return;
    }
    if (!buf)
        buf = "Unknown error";
    /* if buf[] doesn't end in a period, exclamation point, or question
       mark, we'll include a period (in the message, not appended to buf[]) */
    const punct = ".!?".includes(buf[buf.length - 1]) ? "" : ".";
    await pline(`${!game.iflags.window_inited ? "config_error_add: " : ""}${
        buf}${punct}`);
}

// C ref: windows.c choose_classes_menu() -- a menu of object class
// choices (category 1; the monster class menu, category 0, isn't used);
// returns { ret, class_select }
async function choose_classes_menu(prompt, category, way, class_list, class_select) {
    let buf;
    let text;
    let selected;
    let ret, n, next_accelerator, accelerator = 0;
    const clr = NO_COLOR;

    if (category !== 1)
        throw new Error('choose_classes_menu(): monster classes not ported yet');
    next_accelerator = 'a';
    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    for (const cl of class_list) {
        selected = false;
        const idx = def_char_to_objclass(cl);
        if (idx >= MAXOCLASSES)
            throw new Error(`choose_classes_menu: invalid objclass '${cl}'`);
        text = def_oc_explain[idx];
        accelerator = next_accelerator;
        buf = `${cl}  ${text}`;
        if (way && class_select) { /* Selections there already */
            if (class_select.includes(cl)) {
                selected = true;
            }
        }
        tty_add_menu(win, null, cl.charCodeAt(0), accelerator,
                     category ? cl : 0, ATR_NONE, clr, buf,
                     selected ? MENU_ITEMFLAGS_SELECTED : MENU_ITEMFLAGS_NONE);
        if (next_accelerator === 'Z')
            break;
        else if (next_accelerator === 'z')
            next_accelerator = 'A';
        else
            next_accelerator = String.fromCharCode(next_accelerator.charCodeAt(0) + 1);
    }
    if (category === 1 && next_accelerator <= 'z') {
        /* for objects, add "A - ' '  all classes", after a separator */
        add_menu_str(win, "");
        buf = `${' '}  All classes of objects`;
        /* we won't preselect this even if the incoming list is empty;
           having it selected means that it would have to be explicitly
           de-selected in order to select anything else */
        tty_add_menu(win, null, ' '.charCodeAt(0), 'A', 0,
                     ATR_NONE, clr, buf, MENU_ITEMFLAGS_SKIPINVERT);
        if (prompt === "Autopickup what?") {
            add_menu_str(win,
                   "Note: when no choices are selected, \"all\" is implied.");
            /* for 'O', "toggle" should be intuitive; for 'm O', it would
               probably be better to say "Set 'autopickup' to true|false" */
            add_menu_str(win, game.flags.pickup
                         ? "Toggle off 'autopickup' to not pick up anything."
                         : "Toggle on 'autopickup' to automatically pick these things up.");
        }
    }
    tty_end_menu(win, prompt);
    const { n: cnt, selected: pick_list } = await tty_select_menu(win, way ? PICK_ANY : PICK_ONE);
    n = cnt;
    await tty_destroy_nhwindow(win);
    if (n > 0) {
        if (category === 1) {
            /* for object classes, first check for 'all'; it means 'use
               a blank list' rather than 'collect every possible choice' */
            for (let i = 0; i < n; ++i)
                if (pick_list[i].item === ' '.charCodeAt(0)) {
                    pick_list[0].item = ' '.charCodeAt(0);
                    n = 1; /* return 1; also an implicit 'break;' */
                }
        }
        class_select = '';
        for (let i = 0; i < n; ++i)
            class_select += String.fromCharCode(pick_list[i].item);
        ret = n;
    } else if (n === -1) {
        /* class_select = eos(class_select): keep it */
        ret = -1;
    } else {
        class_select = '';
        ret = 0;
    }
    return { ret, class_select };
}

// C ref: options.c opt_intro[], opt_epilog[] (unix: !MICRO, !MACOS9, !VMS)
const opt_intro = [
    "",
    "                 NetHack Options Help:", "",
    null, /* CONFIG_SLOT: filled in at run-time */
    "or use `NETHACKOPTIONS=\"<options>\"' in your environment",
    "(<options> is a list of options separated by commas)",
    "or press \"O\" while playing and use the menu.",
    "",
    ("Boolean options (which can be negated by prefixing them"
     + " with '!' or \"no\"):"),
];
const CONFIG_SLOT = 3;
const opt_epilog = [
    "",
    "Some of the options can only be set before the game is started;",
    "those items will not be selectable in the 'O' command's menu.",
    "Some options are stored in a game's save file, and will keep saved",
    "values when restoring that game even if you have updated your config-",
    "uration file to change them.  Such changes will matter for new games.",
    "The \"other settings\" can be set with 'O', but when set within the",
    "configuration file they use their own directives rather than OPTIONS.",
    "See NetHack's \"Guidebook\" for details.",
];

// C ref: options.c option_help()
export async function option_help() {
    let buf, buf2;
    let optname;
    let i;
    const wizard = !!game.flags.debug;

    const datawin = tty_create_nhwindow(NHW_TEXT_OPT);
    buf = `Set options as OPTIONS=<options> in ${get_configfile()}`
        .slice(0, BUFSZ_OPT - 1); /* Snprintf(buf, sizeof buf, ...) */
    /* opt_intro[CONFIG_SLOT] = buf */
    for (i = 0; i < opt_intro.length; i++)
        await tty_putstr_opt(datawin, 0,
                             (i === CONFIG_SLOT) ? buf : opt_intro[i]);

    /* Boolean options */
    for (i = 0; i < allopt.length; i++) {
        if ((allopt[i].opttyp !== BoolOpt || !allopt[i].addr)
            || (allopt[i].setwhere === set_wizonly && !wizard))
            continue;
        if (allopt[i].setwhere === set_wiznofuz
            && (!wizard || game.iflags.debug_fuzzer))
            continue;
        optname = allopt[i].name;
        if ((is_wc_option(optname) && !wc_supported(optname))
            || (is_wc2_option(optname) && !wc2_supported(optname)))
            continue;
        await next_opt(datawin, optname);
    }
    await next_opt(datawin, "");

    /* Compound options */
    await tty_putstr_opt(datawin, 0, "Compound options:");
    for (i = 0; i < allopt.length; i++) {
        if (allopt[i].opttyp !== CompOpt
            || (allopt[i].setwhere === set_wizonly && !wizard))
            continue;
        if (allopt[i].setwhere === set_wiznofuz
            && (!wizard || game.iflags.debug_fuzzer))
            continue;
        optname = allopt[i].name;
        if ((is_wc_option(optname) && !wc_supported(optname))
            || (is_wc2_option(optname) && !wc2_supported(optname)))
            continue;
        buf2 = `\`${optname}'`;
        /* Snprintf(buf, sizeof(buf), "%-20s - %s%c", ...) */
        buf = `${buf2.padEnd(20)} - ${allopt[i].descr}${
            (i + 1 < allopt.length && allopt[i + 1].name) ? ',' : '.'}`
            .slice(0, BUFSZ_OPT - 1);
        await tty_putstr_opt(datawin, 0, buf);
    }
    await tty_putstr_opt(datawin, 0, "");

    /* Compound options */
    await tty_putstr_opt(datawin, 0, "Other settings:");
    for (i = 0; i < allopt.length; i++) {
        if (allopt[i].opttyp !== OthrOpt)
            continue;
        buf = ` ${allopt[i].name}`;
        await tty_putstr_opt(datawin, 0, buf);
    }

    await tty_putstr_opt(datawin, 0, "");

    for (i = 0; i < opt_epilog.length; i++)
        await tty_putstr_opt(datawin, 0, opt_epilog[i]);

    await tty_display_nhwindow_opt(datawin, false);
    await tty_destroy_nhwindow(datawin);
    return;
}

// C ref: options.c next_opt() -- the static buffer is game.next_opt_buf
async function next_opt(datawin, str) {
    let i;

    if (game.next_opt_buf == null)
        game.next_opt_buf = '';

    if (!str) {
        const s = game.next_opt_buf;
        if (s.length > 1 && s[s.length - 2] === ',')
            game.next_opt_buf = s.slice(0, -2) + '.'; /* replace ending ", " with "." */
        i = COLNO_OPT; /* (greater than COLNO - 2) */
    } else {
        i = game.next_opt_buf.length + str.length + 2;
    }

    if (i > COLNO_OPT - 2) { /* rule of thumb */
        await tty_putstr_opt(datawin, 0, game.next_opt_buf);
        game.next_opt_buf = '';
    }
    if (str) {
        game.next_opt_buf += str;
        game.next_opt_buf += ", ";
    } else {
        await tty_putstr_opt(datawin, 0, str);
        game.next_opt_buf = null;
    }
    return;
}
