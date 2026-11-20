// options.js — Parse .nethackrc options.
// C ref: options.c — handles OPTIONS=, BIND=, etc.
//
// The role, race, gender, alignment, name and female/male options are
// ported from options.c (optfn_role(), optfn_race(), optfn_gender(),
// optfn_alignment(), parse_role_opt(), optfn_name() and the opt_female
// boolean case), and playmode (optfn_playmode(), set_playmode()); they set
// flags.initrole &c, wizard and discover the way C does. The rest of
// this parser is still the skeleton's simplified version.

import { game } from './gstate.js';
import { ROLE_NONE, ROLE_RANDOM, RS_ROLE, RS_RACE, RS_GENDER, RS_ALGNMNT, PL_NSIZ } from './const.js';

import { strncmpi, strcmpi } from './hacklib.js';
import { authorize_wizard_mode, authorize_explore_mode } from './sys.js';
import {
    str2role, str2race, str2gend, str2align, setrolefilter, clearrolefilter,
    RS_filter,
} from './role.js';

// C ref: hacklib.c mungspaces() -- collapse runs of whitespace, trim ends
function mungspaces(bp) {
    return bp.replace(/[ \t]+/g, ' ').trim();
}

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
                // C ref: options.c boolean option case opt_female ("female",
                // alias "male"); go.opt_initial is TRUE while reading the rc
                else if (lname.length >= 3 && !strncmpi(lname, "female", Math.max(lname.length, 3)))
                    result.flags.initgend = result.flags.female = negated ? 0 : 1;
                else if (lname.length >= 3 && !strncmpi(lname, "male", Math.max(lname.length, 3)))
                    result.flags.initgend = result.flags.female = negated ? 1 : 0;
                else result.flags[lname] = value;
            }
        }
    }
    return result;
}
