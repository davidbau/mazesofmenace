// @ts-nocheck
// options.js — Parse .nethackrc options.
// C ref: options.c — handles OPTIONS=, BIND=, etc.
/* C ref: decl.c:54 `const char disclosure_options[] = "iavgco";` — inventory,
 * attribs, vanquished, genocided, conduct, overview, in THAT order.  end_disclose
 * is indexed by position in this string, so the order is load-bearing. */
export const DISCLOSURE_OPTIONS = 'iavgco';
/* C ref: flag.h:110-115 */
const DISCLOSE_PROMPT_DEFAULT_YES = 'y';
const DISCLOSE_PROMPT_DEFAULT_NO = 'n';
const DISCLOSE_PROMPT_DEFAULT_SPECIAL = '?';
const DISCLOSE_YES_WITHOUT_PROMPT = '+';
const DISCLOSE_NO_WITHOUT_PROMPT = '-';
const DISCLOSE_SPECIAL_WITHOUT_PROMPT = '#';
/* C ref: options.c:7211 — every slot inits to DISCLOSE_PROMPT_DEFAULT_NO. */
export const END_DISCLOSE_DEFAULT = 'nnnnnn';

/* C ref: drawing.c:90 def_char_to_objclass, used by the pickup_types parse below. */
import { def_char_to_objclass } from './drawing.js';
import { DOSET_BOOLS } from './doset_data.js';
import { optfn_menustyle_set } from './menustyle.js';
import { optfn_suppress_alert_set } from './feature_alert.js';
import { parsebindings, optfn_number_pad_set } from './cmd_config.js';
import { config_error_add } from './cmd_binds.js';
const booleanStorage = new Map(DOSET_BOOLS.map(row => [row.name, row]));
const MAXOCLASSES = 18; /* objclass.h:141 */

/* C ref: options.c:3308-3390 optfn_pickup_types(do_set), the config-file arm.
 *
 *     while (*op == ' ') op++;
 *     if (*op != 'a' && *op != 'A') {
 *         num = 0;
 *         while (*op) {
 *             oc_sym = def_char_to_objclass(*op);
 *             if (oc_sym != MAXOCLASSES && !strchr(flags.pickup_types, oc_sym)) {
 *                 flags.pickup_types[num] = (char) oc_sym;
 *                 flags.pickup_types[++num] = '\0';
 *             } else
 *                 badopt = TRUE;
 *             op++;
 *         }
 *         ...
 *
 * Three properties of that loop are load-bearing and were all absent while this
 * option fell through to the generic `result.flags[key] = val` arm:
 *   - the leading-space skip and the 'a'/'A' ("all classes") escape, which C
 *     spells as an EMPTY list, not as every class;
 *   - the per-character validation, so a character that is not an object-class
 *     symbol is dropped rather than stored (C also config_error_add()s and
 *     returns optn_err, but keeps the classes it had already accepted);
 *   - the dedupe, whose C spelling compares CLASS INDICES; because this port
 *     stores the symbols themselves, and def_char_to_objclass is injective over
 *     the symbols, comparing symbols is the same test.
 * C preserves the ORDER the value was written in — oc_to_str (options.c:8061)
 * walks the stored array — so this must not sort into def_inv_order order. */
function parse_pickup_types(op) {
    let i = 0;
    while (op.charAt(i) === ' ') i++;
    const rest = op.slice(i);
    /* "a"/"A" is 'all', which C represents as the empty list (options.c:3325
     * cleared it before the parse and the 'a' branch simply never refills it). */
    if (rest.charAt(0) === 'a' || rest.charAt(0) === 'A') return '';
    let out = '';
    for (const ch of rest) {
        const oc_sym = def_char_to_objclass(ch.charCodeAt(0));
        if (oc_sym !== MAXOCLASSES && !out.includes(ch))
            out += ch;
    }
    return out;
}

export function parse_end_disclose(val, negated) {
    const op = (val == null) ? '' : String(val);
    const lower = op.toLowerCase();
    /* C: bare `disclose` = all with prompting; `!disclose` or "none" = none
       without prompting; "all" = all with prompting. */
    if (op === '' || lower === 'all' || lower === 'none') {
        const none = negated || lower === 'none';
        return (none ? DISCLOSE_NO_WITHOUT_PROMPT
                     : DISCLOSE_PROMPT_DEFAULT_YES).repeat(6);
    }
    const valid = [DISCLOSE_PROMPT_DEFAULT_YES, DISCLOSE_PROMPT_DEFAULT_NO,
                   DISCLOSE_PROMPT_DEFAULT_SPECIAL, DISCLOSE_YES_WITHOUT_PROMPT,
                   DISCLOSE_NO_WITHOUT_PROMPT, DISCLOSE_SPECIAL_WITHOUT_PROMPT];
    const out = END_DISCLOSE_DEFAULT.split('');
    let prefix = null;
    for (const raw of op) {
        let c = raw.toLowerCase();
        if (c === 'k') c = 'v';          /* killed -> vanquished */
        if (c === 'd') c = 'o';          /* dungeon -> overview */
        const idx = DISCLOSURE_OPTIONS.indexOf(c);
        if (idx >= 0) {
            if (prefix !== null) {
                let pv = prefix;
                /* the 'special' settings only mean anything for v and g */
                if (c !== 'v' && c !== 'g') {
                    if (pv === DISCLOSE_PROMPT_DEFAULT_SPECIAL)
                        pv = DISCLOSE_PROMPT_DEFAULT_YES;
                    if (pv === DISCLOSE_SPECIAL_WITHOUT_PROMPT)
                        pv = DISCLOSE_YES_WITHOUT_PROMPT;
                }
                out[idx] = pv;
                prefix = null;
            } else {
                out[idx] = DISCLOSE_YES_WITHOUT_PROMPT;
            }
        } else if (valid.includes(raw)) {
            /* NOTE: C tests `strchr(valid_settings, c)` with c ALREADY lowc'd,
               but every valid setting char is punctuation or already lower, so
               the un-lowered char is the faithful comparison either way. */
            prefix = raw;
        } else if (c === ' ') {
            /* do nothing */
        } else {
            return END_DISCLOSE_DEFAULT;
        }
    }
    return out.join('');
}

/* C ref: flag.h:83-95 PARANOID_* bitmask; options.c:7173 the compiled-in
 * default `flags.paranoia_bits = PARANOID_PRAY | PARANOID_SWIM |
 * PARANOID_TRAP` set before any config-file line is parsed.  js/do_wear.js
 * and js/uhitm.js already read `g.flags.paranoia_bits` with this same value
 * as their fallback when the field is unset; this is the value the
 * `paranoid_confirmation` handler below starts a fresh (non-augmenting)
 * setting from. */
export const PARANOID_CONFIRMATION_DEFAULT_BITS = 0x0020 | 0x0400 | 0x0800;
const PARANOID_NONE_MASK = 0;
/* Sum of every PARANOID_* bit (flag.h:83-95) — the practical equivalent of
 * C's `~0` for the "all" table entry (options.c:181): only these thirteen
 * bits are ever read back through a Paranoid* macro, so any additional bits
 * `~0` sets in C are inert here too. */
const PARANOID_ALL_MASK = 0x1fff;

/* C ref: options.c:128-182 the `paranoia[]` name table used by
 * optfn_paranoid_confirmation (do_set) and handler_paranoid_confirmation.
 * Order matters: options.c:132-145's own comment documents that "a"ttack
 * beats "A"utoall beats "a"ll on a one-letter abbreviation, which falls out
 * of first-match-wins over this array in DECLARATION order — so this array
 * must stay in the same order as the C table. */
const PARANOIA_OPTS = [
    { mask: 0x0001, name: 'Confirm',     minLen: 1, syn: 'Paranoia',        synMinLen: 2 },
    { mask: 0x0002, name: 'quit',        minLen: 1, syn: 'explore',         synMinLen: 2 },
    { mask: 0x0004, name: 'die',         minLen: 1, syn: 'death',           synMinLen: 2 },
    { mask: 0x0008, name: 'bones',       minLen: 1 },
    { mask: 0x0010, name: 'attack',      minLen: 1, syn: 'hit',             synMinLen: 1 },
    { mask: 0x0080, name: 'wand-break',  minLen: 2, syn: 'break-wand',      synMinLen: 2 },
    { mask: 0x0200, name: 'eat',         minLen: 1, syn: 'continue',        synMinLen: 4 },
    { mask: 0x0100, name: 'Were-change', minLen: 2 },
    { mask: 0x0020, name: 'pray',        minLen: 1 },
    { mask: 0x0800, name: 'trap',        minLen: 1, syn: 'move-trap',       synMinLen: 1 },
    { mask: 0x1000, name: 'Autoall',     minLen: 2, syn: 'autoselect-all',  synMinLen: 2 },
    { mask: 0x0400, name: 'swim',        minLen: 1 },
    { mask: 0x0040, name: 'Remove',      minLen: 1, syn: 'Takeoff',         synMinLen: 1 },
    { mask: PARANOID_NONE_MASK, name: 'none', minLen: 4 },
    { mask: PARANOID_ALL_MASK,  name: 'all',  minLen: 3 },
];

/* C ref: options.c:6760-6770 match_optname(user_string, optn_name, min_length,
 * val_allowed=FALSE) — `token` must be at least `minLen` characters AND must
 * be a case-insensitive PREFIX of `name` for its whole length (a token
 * longer than `name` cannot match: strncmpi would run past name's NUL). */
function _match_paranoia_optname(token, name, minLen) {
    return token.length >= minLen && token.length <= name.length
        && name.slice(0, token.length).toLowerCase() === token.toLowerCase();
}

export function parse_paranoid_confirmation(existing, val, negated) {
    let op = (val == null) ? '' : String(val);
    if (negated)
        return op ? existing : 0;
    if (!op)
        return existing;
    op = op.replace(/\s+/g, ' ').trim(); /* mungspaces(op), options.c:2953 */
    let bits = existing;
    let plusOrMinus = false;
    let lineNegated = false;
    if (op.charAt(0) === '+' || op.charAt(0) === '-') {
        plusOrMinus = true;
        lineNegated = (op.charAt(0) === '-');
        op = op.slice(1);
        if (op.charAt(0) === ' ')
            op = op.slice(1);
    } else {
        bits = 0; /* new (non-augmenting) value: clear all old bits first */
    }
    for (const rawToken of op.split(' ')) {
        if (!rawToken)
            continue;
        let token = rawToken;
        let fieldNegated = lineNegated;
        if (token.charAt(0) === '!') {
            fieldNegated = true;
            token = token.slice(1);
        } else if (token.length >= 3 && token.charAt(0).toLowerCase() === 'n'
                   && token.charAt(1).toLowerCase() === 'o'
                   && token.charAt(2).toLowerCase() !== 'n') {
            /* "nofoo" == "!foo" (options.c:2965-2972), unless it would be
             * confused with "none". */
            fieldNegated = true;
            token = token.slice(2);
        }
        let matched = null;
        for (const p of PARANOIA_OPTS) {
            if (_match_paranoia_optname(token, p.name, p.minLen)
                || (p.syn && _match_paranoia_optname(token, p.syn, p.synMinLen))) {
                matched = p;
                break;
            }
        }
        if (!matched)
            return bits; /* unknown token: stop, keep earlier changes this call */
        if (matched.mask === PARANOID_NONE_MASK) {
            if (!plusOrMinus)
                bits = 0;
        } else if (fieldNegated) {
            bits &= ~matched.mask;
        } else {
            bits |= matched.mask;
        }
    }
    return bits;
}

export function parseNethackrc(rc) {
    const result = {
        name: '',
        role: '',
        race: '',
        gender: '',
        align: '',
        flags: {}, iflags: {},
        uroleplay: {blind: false, deaf: false, nudist: false, pauper: false},
    };
    if (!rc)
        return result;
    let number_pad_seen = false;
    for (const rawLine of rc.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#'))
            continue;
        // C ref: cfgfiles.c:1311 CNFL_N(BINDINGS, 4) — the BINDINGS statement
        // matches any prefix abbreviation of length >= 4 ("BIND"..."BINDINGS");
        // cnf_line_BINDINGS (cfgfiles.c:617) -> parsebindings (options.c:7614):
        // comma-separated key:command pairs; each -> bind_key (options.c:7687).
        const bindMatch = line.match(/^(?:BIND|BINDI|BINDIN|BINDING|BINDINGS)=(.+)/i);
        if (bindMatch) {
            parsebindings(bindMatch[1]);
            continue;
        }

        /* C cfgfiles.c's SYMBOLS directive is separate from OPTIONS=.  The
         * renderer presently has a narrow consumer for S_pool, so retain that
         * direct one-character override rather than dropping the whole line.
         * A full symbols.c parser remains outside this rc parser's scope. */
        const symbolsMatch = line.match(/^SYMBOLS=(.+)/i);
        if (symbolsMatch) {
            for (const entry of symbolsMatch[1].split(',')) {
                const poolMatch = entry.match(/^\s*S_pool\s*:\s*(.)/i);
                if (poolMatch)
                    (result.symbolOverrides ||= {}).S_pool = poolMatch[1];
            }
            continue;
        }

        const optMatch = line.match(/^OPTIONS=(.+)/i);
        if (!optMatch)
            continue;
        // parseoptions() handles the suffix recursively before the first
        // entry. Across RC lines, the ordinary file order is retained.
        for (const opt of optMatch[1].split(',').reverse()) {
            const trimmed = opt.trim();
            if (!trimmed)
                continue;
            // C parseoptions strips any sequence of ! / no / no- prefixes,
            // and compound values accept ':' or '='. Keep this option's
            // routing separate until the other option handlers are migrated.
            let menuopts = trimmed, menunegated = false;
            while (menuopts[0] === '!' || /^no/i.test(menuopts)) {
                menuopts = menuopts.slice(menuopts[0] === '!' ? 1 : menuopts[2] === '-' ? 3 : 2);
                menunegated = !menunegated;
            }
            const menusep = menuopts.search(/[:=]/);
            const menuname = (menusep < 0 ? menuopts : menuopts.slice(0, menusep)).trim().toLowerCase();
            if (menuname.length >= 3 && 'number_pad'.startsWith(menuname)) {
                if (number_pad_seen)
                    config_error_add('compound option specified multiple times: number_pad');
                number_pad_seen = true;
                // optlist.h disallows negation before optfn_number_pad runs.
                if (menunegated) {
                    config_error_add('The number_pad option may not both have a value and be negated.');
                } else {
                    optfn_number_pad_set(menuopts, false, true);
                    result.iflags.num_pad = !!game.iflags.num_pad;
                    result.iflags.num_pad_mode = game.iflags.num_pad_mode || 0;
                }
                continue;
            }
            if (menuname.length >= 5 && 'menustyle'.startsWith(menuname)) {
                optfn_menustyle_set(result.flags, menuopts,
                    menusep < 0 ? '' : menuopts.slice(menusep + 1).trim(), menunegated);
                continue;
            }
            // determine_ambiguities(): "sup" uniquely identifies suppress_alert.
            if (menuname.length >= 3 && 'suppress_alert'.startsWith(menuname)) {
                optfn_suppress_alert_set(result.flags,
                    menusep < 0 ? '' : menuopts.slice(menusep + 1).trim(), menunegated);
                continue;
            }
            const negated = trimmed.startsWith('!');
            const stripped = negated ? trimmed.slice(1) : trimmed;
            const colonIdx = stripped.indexOf(':');
            if (colonIdx >= 0) {
                const key = stripped.slice(0, colonIdx).trim().toLowerCase();
                const val = stripped.slice(colonIdx + 1).trim();
                if (key === 'name')
                    result.name = val;
                else if (key === 'role')
                    result.role = val;
                else if (key === 'race')
                    result.race = val;
                else if (key === 'gender')
                    result.gender = val;
                else if (key === 'align')
                    result.align = val;
                else if (key === 'playmode' && val === 'debug')
                    result.flags.debug = true;
                else if (key === 'playmode' && val === 'explore')
                    result.flags.explore = true;
                else if (key === 'pettype' || key === 'pet') {
                    result.flags.pettype = val;
                    if (val === 'none' || val === 'n')
                        result.preferred_pet = 'n';
                    else if (val === 'dog' || val === 'd')
                        result.preferred_pet = 'd';
                    else if (val === 'cat' || val === 'c')
                        result.preferred_pet = 'c';
                }
                else if (key === 'symset')
                    result.symset = val;
                else if (key === 'whatis_coord') {
                    if (negated)
                        result.iflags.getpos_coords = 'n';
                    else {
                        const c = val.charAt(0).toLowerCase();
                        if (c && 'ncfms'.includes(c))
                            result.iflags.getpos_coords = c;
                        else
                            config_error_add(`Unknown whatis_coord parameter '${val}'`);
                    }
                }
                else if (key === 'msg_window')
                    result.iflags.prevmsg_window = val;
                /* C options.c:3627-3656 optfn_runmode().  str_start_is()
                 * accepts abbreviations; invalid or empty values leave the
                 * initialized default unchanged after C reports an error. */
                else if (key === 'runmode') {
                    const mode = val.toLowerCase();
                    if (negated || (mode && 'teleport'.startsWith(mode)))
                        result.flags.runmode = RUN_TPORT;
                    else if (mode && 'run'.startsWith(mode))
                        result.flags.runmode = RUN_LEAP;
                    else if (mode && 'walk'.startsWith(mode))
                        result.flags.runmode = RUN_STEP;
                    else if (mode && 'crawl'.startsWith(mode))
                        result.flags.runmode = RUN_CRAWL;
                }
                else if (key === 'pickup_types') {
                    if (!val) {
                        result.flags.pickup_types = '';
                        result.flags.pickup = !negated;
                    } else if (negated) {
                        result.flags.pickup_types = '';
                    } else {
                        result.flags.pickup_types = parse_pickup_types(val);
                    }
                }
                else if (key === 'statuslines') {
                    const itmp = negated ? 2 : (val ? (parseInt(val, 10) || 0) : 0);
                    if (!negated && itmp >= 2 && itmp <= 3)
                        result.iflags.wc2_statuslines = itmp;
                }
                else if (key === 'disclose') {
                    result.flags.disclose = val;
                    result.flags.end_disclose = parse_end_disclose(val, negated);
                }
                else if (key === 'paranoid_confirmation' || key === 'paranoid_confirm') {
                    const existing = (result.flags.paranoia_bits != null)
                        ? result.flags.paranoia_bits
                        : PARANOID_CONFIRMATION_DEFAULT_BITS;
                    result.flags.paranoia_bits =
                        parse_paranoid_confirmation(existing, val, negated);
                }
                else
                    result.flags[key] = val;
            }
            else {
                // Boolean flag
                const lname = stripped.toLowerCase();
                const value = !negated;
                if (lname === 'autopickup')
                    result.flags.pickup = value;
                else if (lname === 'runmode') {
                    if (negated)
                        result.flags.runmode = RUN_TPORT;
                }
                else if (lname === 'color')
                    result.flags.color = value;
                else if (lname === 'legacy')
                    result.flags.legacy = value;
                else if (lname === 'tutorial') {
                    result.flags.tutorial = value;
                    result.tutorial_set = true;
                }
                else if (lname === 'splash_screen')
                    result.iflags.wc_splash_screen = value;
                else if (lname === 'pushweapon')
                    result.flags.pushweapon = value;
                else if (lname === 'showexp')
                    result.flags.showexp = value;
                else if (lname === 'time')
                    result.flags.time = value;
                else if (lname === 'status_updates')
                    result.iflags.status_updates = value;
                else if (lname === 'verbose')
                    result.flags.verbose = value;
                else if (lname === 'paranoid_confirmation' || lname === 'paranoid_confirm') {
                    const existing = (result.flags.paranoia_bits != null)
                        ? result.flags.paranoia_bits
                        : PARANOID_CONFIRMATION_DEFAULT_BITS;
                    result.flags.paranoia_bits =
                        parse_paranoid_confirmation(existing, '', negated);
                }
                else {
                    // Use the same native NHOPTB storage as the in-game menu.
                    // In particular !cmdassist belongs to iflags, not flags.
                    const row = booleanStorage.get(lname);
                    if (row?.box === 'flags' || row?.box === 'iflags')
                        result[row.box][row.fld || lname] = value;
                    else if (row?.box === 'u.uroleplay') {
                        result.uroleplay[row.fld] = value;
                        // C optfn_boolean: pauper also sets/clears nudist.
                        if (lname === 'pauper') result.uroleplay.nudist = value;
                    }
                    else
                        result.flags[lname] = value;
                }
            }
            // C's initial boolean setter stores rest_on_space now but defers
            // update_rest_on_space until initoptions_finish. A later layout
            // reset on this same RC stream sees the already-written flag.
            if (Object.hasOwn(result.flags, 'rest_on_space'))
                (game.flags ||= {}).rest_on_space = result.flags.rest_on_space;
        }
    }
    return result;
}

// ── option_help() — the '?' help menu's "List of game options." item ─────────
// C ref: options.c:9472-9598 (opt_intro[]/opt_epilog[] + option_help()).
// Builds one NHW_TEXT window: the intro block, the boolean-option names run
// through next_opt()'s column packer, the compound options one per line, the
// "Other settings" names, then the epilog — and display_nhwindow()s it.
// GENERALCMD, display channel only: no turn, no RNG.
import { ALLOPT } from './optlist.js';
import { get_configfile } from './cfgfiles.js';
import { game } from './gstate.js';
import { display_text_window } from './com_pager.js';
/* rnd — C options.c:8274's fruit-id overflow guard is this file's only draw. */
import { rnd } from './rng.js';
/* C options.c:8194 makesingular(), :8204-8212 OBJ_NAME over the FOOD_CLASS
 * range, :8230-8236 name_to_mon()/ismnum() — fruitadd's user_specified name
 * rewrite reads all four. */
import { makesingular } from './objnam.js';
import { name_to_mon } from './makemon.js';
import { ismnum, RUN_TPORT, RUN_LEAP, RUN_STEP, RUN_CRAWL } from './const.js';
import { OC_NAME } from './oc_name_data.js';
import { MKOBJ_OC_CLASS, MKOBJ_SVB_BASES } from './mkobj_data.js';
const FOOD_CLASS = 7;

const COLNO = 80; /* config.h — next_opt()'s "rule of thumb" width */

/* C ref: options.c:9796-9827 next_opt() — accumulate `str` into a static buffer,
 * flushing it as one putstr line whenever adding the next name would push the
 * line past COLNO - 2.  next_opt("") terminates: it rewrites the trailing ", "
 * as "." (only when the buffer holds more than one character), flushes, then
 * putstr()s the empty string and frees the buffer.  The buffer is `static` in C;
 * here it is threaded through a small closure so two concurrent windows cannot
 * share it. */
function make_next_opt(putstr) {
    let buf = '';
    return function next_opt(str) {
        let i;
        if (!str) {
            /* C: s = eos(buf); if (s > &buf[1] && s[-2] == ',') s[-2] = '.' */
            if (buf.length > 1 && buf.charAt(buf.length - 2) === ',')
                buf = buf.slice(0, -2) + '.';
            i = COLNO; /* (greater than COLNO - 2) */
        } else {
            i = buf.length + str.length + 2;
        }
        if (i > COLNO - 2) { /* rule of thumb */
            putstr(buf);
            buf = '';
        }
        if (str) {
            buf += str + ', ';
        } else {
            putstr(str);
            buf = '';
        }
    };
}

/* C ref: options.c:9473-9489 opt_intro[].  CONFIG_SLOT (index 3) is filled in at
 * run time with "Set options as OPTIONS=<options> in %s", get_configfile().
 * MICRO/MAC and VMS are undefined in the reference build, so the NETHACKOPTIONS
 * line is present and the VMS example line is not. */
function opt_intro_lines() {
    return [
        '',
        '                 NetHack Options Help:',
        '',
        `Set options as OPTIONS=<options> in ${get_configfile()}`,
        'or use `NETHACKOPTIONS="<options>"\' in your environment',
        '(<options> is a list of options separated by commas)',
        'or press "O" while playing and use the menu.',
        '',
        'Boolean options (which can be negated by prefixing them'
            + ' with \'!\' or "no"):',
    ];
}

/* C ref: options.c:9491-9503 opt_epilog[]. */
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

/* C ref: options.c:9506-9598 option_help(). */
export async function option_help() {
    const datawin = [];
    const putstr = (s) => datawin.push(s);
    const next_opt = make_next_opt(putstr);
    /* C ref: cmd.c:3687 precedent — the `wizard` global is flags.debug.
     * iflags.debug_fuzzer is never set in this port (no fuzzer build). */
    const wizard = !!(game.flags && game.flags.debug);
    const debug_fuzzer = false;
    /* C: (allopt[i].setwhere == set_wizonly && !wizard)
     *  || (allopt[i].setwhere == set_wiznofuz && (!wizard || iflags.debug_fuzzer)) */
    const wizskip = (o) =>
        (o[2] === 'wizonly' && !wizard)
        || (o[2] === 'wiznofuz' && (!wizard || debug_fuzzer));
    /* C: (is_wc_option(name) && !wc_supported(name))
     *  || (is_wc2_option(name) && !wc2_supported(name)) — see optlist.js. */
    const wcskip = (o) => o[3].split(',').includes('nowc');
    const noaddr = (o) => o[3].split(',').includes('noaddr');

    for (const s of opt_intro_lines())
        putstr(s);

    /* Boolean options */
    for (const o of ALLOPT) {
        if ((o[1] !== 'B' || noaddr(o)) || wizskip(o))
            continue;
        if (wcskip(o))
            continue;
        next_opt(o[0]);
    }
    next_opt('');

    /* Compound options */
    putstr('Compound options:');
    for (let i = 0; i < ALLOPT.length; i++) {
        const o = ALLOPT[i];
        if (o[1] !== 'C' || wizskip(o))
            continue;
        if (wcskip(o))
            continue;
        /* C: Sprintf(buf2, "`%s'", optname);
         *    Snprintf(buf, "%-20s - %s%c", buf2, descr,
         *             allopt[i + 1].name ? ',' : '.');
         * The ','/'.' test looks at the NEXT allopt[] row, not the next row
         * that survives the filters — only the very last table entry ends the
         * list with a period. */
        const buf2 = '`' + o[0] + "'";
        const tail = ALLOPT[i + 1] ? ',' : '.';
        putstr(buf2.padEnd(20) + ' - ' + o[4] + tail);
    }
    putstr('');

    /* Other settings */
    putstr('Other settings:');
    for (const o of ALLOPT) {
        if (o[1] !== 'O')
            continue;
        putstr(' ' + o[0]);
    }

    putstr('');

    for (const s of OPT_EPILOG)
        putstr(s);

    await display_text_window(datawin);
}

/* ══ the named-fruit chain (gf.ffruit) ══════════════════════════════════════
 * C ref: options.c:8168-8286 fruitadd(str, replace_fruit); pager.c/objnam.c:443
 * fruit_from_name(); bones.c:198 sanitize_name().
 *
 * This port had NO fruit chain at all: js/mklev.js:1632 reads
 * game.svc.context.current_fruit for a mksobj'd SLIME_MOLD and nothing ever
 * wrote a fruit anywhere.  The chain is needed because stolen_booty()
 * (js/mkmaze.js, C mkmaze.c:799) hands a slime mold from the orc gang's loot
 * to fruitadd() with one of two hard-coded orc-fruit names, and stores the
 * returned fid in obj->spe.
 *
 * SCOPE.  Only C's NOT-user_specified branch is ported — that is the ONLY
 * branch reachable from js/, because the two live callers are the orctown loot
 * (mkmaze.c:790) and bones restore (restore.c:511), neither of which passes
 * svp.pl_fruit.  The user_specified branch (makesingular, the "candied "
 * prefixing, replace_fruit, context.current_fruit) belongs to the `fruit`
 * option handler and is not ported here.  Both branches are RNG-FREE apart
 * from C's `if (highest_fruit_id >= 127) return rnd(127);` overflow guard,
 * which IS reproduced below.
 */

/* C bones.c:198 sanitize_name(namebuf) — strip control characters a previous
 * player could have injected.  WINDOWPORT(tty) is true for this port and
 * iflags.wc_eight_bit_input is off, so strip_8th_bit is TRUE: a byte whose
 * low 7 bits differ from the byte itself (i.e. >= 0x80) becomes '_', and a
 * low-7-bit value below ' ' or equal to 0177 becomes '.'. */
export function sanitize_name(namebuf) {
    let out = '';
    for (let i = 0; i < namebuf.length; i++) {
        const ch = namebuf.charCodeAt(i) & 0xff;
        const c = ch & 0o177;
        if (c < 0x20 /* ' ' */ || c === 0o177)
            out += '.';
        else if (c !== ch)
            out += '_';
        else
            out += String.fromCharCode(ch);
    }
    return out;
}

/* The chain head.  C's gf.ffruit starts NULL and initoptions_finish()
 * (options.c:7329) immediately pushes svp.pl_fruit as fid 1, so by the time
 * any level is generated there is always exactly one fruit.
 *
 * gf.ffruit IS A LINKED LIST — `struct fruit { char fname[]; int fid; struct
 * fruit *nextf; }`, walked as `for (f = gf.ffruit; f; f = f->nextf)` at
 * objnam.c:435/458/469/482/493/530/4841, bones.c:452 and insight.c:1967.  This
 * function used to build an ARRAY instead, and js/objnam.js — which has FIVE
 * `for (f = game.ffruit; f; f = f.nextf)` walks, C's own shape — therefore read
 * the array object itself as the first "node": `f.fid` was undefined, `f.nextf`
 * was undefined, and every walk terminated after one iteration having matched
 * nothing.  So fruit_from_indx() ALWAYS returned NULL and xname's SLIME_MOLD
 * branch (js/objnam.js:3677) always took C's impossible() fallback and rendered
 * "fruit".  One C global, two JS spellings; C's spelling wins. */
function _ffruit() {
    const g = game;
    if (!g.ffruit)
        init_fruit_chain();
    return g.ffruit;
}

export function init_fruit_chain() {
    const g = game;
    /* C options.c:8276-8282 — newfruit(), fid = ++highest_fruit_id (0 -> 1),
     * `f->nextf = gf.ffruit; gf.ffruit = f;` on an empty chain. */
    g.ffruit = { fid: 1, fname: g.pl_fruit || 'slime mold', nextf: null };
    /* C options.c:8285 — `if (user_specified) svc.context.current_fruit = f->fid;`
     * and initoptions_finish's call IS the user_specified one (str is literally
     * svp.pl_fruit, which is what C's `str == svp.pl_fruit` test compares). */
    if (!g.svc) g.svc = {};
    if (!g.svc.context) g.svc.context = {};
    g.svc.context.current_fruit = 1;
}

/* C objnam.c:443 fruit_from_name(fname, exact=FALSE, &highest_fid).
 *
 * PORTED ARMS: the exact-match scan (which is also what computes
 * *highest_fid) and the longest-prefix scan.  NOT PORTED: the two
 * makesingular()-based fallbacks that follow them, because makesingular() is
 * the plural-stripping engine and this port has no faithful copy of it; they
 * can only ever turn a MISS into a HIT, and a miss simply allocates the next
 * fid.  Stated rather than hidden: if a player names their fruit as the plural
 * of an orc-fruit name ("paddle cactuses"), C would reuse that fruit's fid and
 * this returns a new one.  No RNG either way. */
function fruit_from_name(fname) {
    const head = _ffruit();
    let highest_fid = 0;
    /* C objnam.c:458 — `for (f = gf.ffruit; f; f = f->nextf)`. */
    for (let f = head; f; f = f.nextf) {
        if (f.fname === fname)
            return { f, highest_fid };
        if (f.fid > highest_fid)
            highest_fid = f.fid;
    }
    /* prefix match: longest f->fname that is a whole-word prefix of fname */
    let tentativef = null;
    for (let f = head; f; f = f.nextf) {
        const k = f.fname.length;
        if (fname.slice(0, k) === f.fname
            && (fname.length === k || fname[k] === ' ')
            && (!tentativef || k > tentativef.fname.length))
            tentativef = f;
    }
    return { f: tentativef, highest_fid };
}

/* C options.c:8186-8232, the user_specified half of fruitadd's name rewrite:
 * force the name singular, then refuse to let the player name their fruit
 * after a real food (or after something the item-parser reads as an item
 * attribute) by prefixing "candied ".  Returns the rewritten name.
 *
 * NOT PORTED, and named rather than hidden: C's `numeric` test walks
 * svp.pl_fruit while the bytes are ASCII digits and then asks whether it has
 * reached end-of-string or a space, i.e. "the name is all digits" — that IS
 * ported below.  What is not is the `ismnum(name_to_mon(...))` arm's dependence
 * on name_to_mon's rank-title fallback for "tin of <foo>"; name_to_mon itself
 * is used exactly as C uses it. */
function _fruit_name_rewrite(nameIn) {
    /* C options.c:8194 — nmcpy(svp.pl_fruit, makesingular(str), PL_FSIZ). */
    let plf = makesingular(String(nameIn));
    /* C options.c:8199-8203 — globs may carry a size prefix that has to be
     * skipped before the object-name comparison. */
    const globpfx = (plf.startsWith('small ') || plf.startsWith('large ')) ? 6
                  : plf.startsWith('medium ') ? 7
                  : plf.startsWith('very large ') ? 11
                  : 0;
    /* C options.c:8204-8212 — `for (i = svb.bases[FOOD_CLASS];
     *  objects[i].oc_class == FOOD_CLASS; i++)`, comparing OBJ_NAME. */
    let found = false;
    const NUM_OBJECTS = MKOBJ_OC_CLASS.length;
    for (let i = MKOBJ_SVB_BASES[FOOD_CLASS] | 0;
         i < NUM_OBJECTS && (MKOBJ_OC_CLASS[i] | 0) === FOOD_CLASS; i++) {
        const on = OC_NAME[i];
        if (on == null) continue;
        if (on === plf || (globpfx > 0 && on === plf.slice(globpfx))) {
            found = true;
            break;
        }
    }
    /* C options.c:8213-8219 — all-digits (then end-of-string or a space). */
    let numeric = false;
    if (!found) {
        let c = 0;
        while (c < plf.length && plf[c] >= '0' && plf[c] <= '9') c++;
        if (c >= plf.length || plf[c] === ' ' || plf[c] === '\t'
            || plf[c] === '\n' || plf[c] === '\r' || plf[c] === '\f'
            || plf[c] === '\v')
            numeric = true;
    }
    /* C options.c:8220-8236 — the case-sensitive item-attribute checks. */
    const _endsWith = (str, tail) => str.length >= tail.length
        && str.slice(str.length - tail.length) === tail;
    if (found || numeric
        || plf.startsWith('cursed ')
        || plf.startsWith('uncursed ')
        || plf.startsWith('blessed ')
        || plf.startsWith('partly eaten ')
        || (plf.startsWith('tin of ')
            && (plf.slice(7) === 'spinach'
                || ismnum(name_to_mon(plf.slice(7), null))))
        || plf === 'empty tin'
        || (plf === 'glob'
            || (globpfx > 0 && plf.slice(globpfx) === 'glob'))
        || ((_endsWith(plf, ' corpse') || _endsWith(plf, ' egg'))
            && ismnum(name_to_mon(plf, null)))) {
        /* C options.c:8237-8239 — Strcpy(buf, pl_fruit); "candied " + buf. */
        plf = 'candied ' + plf;
    }
    return plf;
}

export function fruitadd(str, replace_fruit, user_specified) {
    const g = game;
    let altname = '';
    let name = String(str);

    if (user_specified) {
        /* C options.c:8194-8239 — rewrite svp.pl_fruit in place. */
        name = _fruit_name_rewrite(name);
        g.pl_fruit = name;
        /* C options.c:8247 — flags.made_fruit = FALSE; "a fruit has NOT been
         * made since the last time the user set the fruit". */
        if (!g.flags) g.flags = {};
        g.flags.made_fruit = false;
        /* C options.c:8248-8253 — replace_fruit is already on the chain;.
         * rename it in place rather than adding a second one. */
        if (replace_fruit) {
            replace_fruit.fname = name;
            /* C options.c:8284-8285 nonew: */
            if (!g.svc) g.svc = {};
            if (!g.svc.context) g.svc.context = {};
            g.svc.context.current_fruit = replace_fruit.fid;
            return replace_fruit.fid;
        }
    } else {
        /* C options.c:8258-8262: copynchars(altname, str, …); sanitize_name(altname);
         * flags.made_fruit = TRUE. */
        altname = sanitize_name(name);
        if (!g.flags) g.flags = {};
        g.flags.made_fruit = true;
    }

    const { f, highest_fid } = fruit_from_name(altname || name);
    if (f) {
        /* C options.c:8284-8285 nonew: */
        if (user_specified) {
            if (!g.svc) g.svc = {};
            if (!g.svc.context) g.svc.context = {};
            g.svc.context.current_fruit = f.fid;
        }
        return f.fid;
    }

    /* C options.c:8272-8275 — "Maximum number of named fruits is 127 … If
     * adding another fruit would overflow, use a random fruit instead."  The
     * ONE RNG draw in this function. */
    if (highest_fid >= 127)
        return rnd(127);

    /* C options.c:8278-8282 —
     *     f->fid = ++highest_fruit_id;
     *     f->nextf = gf.ffruit;
     *     gf.ffruit = f;
     * ("the order is arbitrary so use simpler insertion at start"). */
    const nf = { fid: highest_fid + 1, fname: (altname || name), nextf: g.ffruit };
    g.ffruit = nf;
    /* C options.c:8284-8285 nonew: */
    if (user_specified) {
        if (!g.svc) g.svc = {};
        if (!g.svc.context) g.svc.context = {};
        g.svc.context.current_fruit = nf.fid;
    }
    return nf.fid;
}

/* C options.c:1715-1767 optfn_fruit(do_set) — the runtime ('O' menu / an
 * in-game parseoptions) half only; the go.opt_initial half stays with
 * initoptions_finish's init_fruit_chain() above.  Returns the message C's
 * `give_opt_msg` arm would pline, or null when C prints nothing. */
export function optfn_fruit_set(op) {
    const g = game;
    /* C options.c:1725 mungspaces(op) is the CALLER's job here — js/optmenu.js
     * already munges the getlin answer, matching parseoptions' order. */
    let forig = null;
    /* C options.c:1727-1743 — !go.opt_initial. */
    {
        const { f, highest_fid } = fruit_from_name(op);
        if (!f) {
            if (!(g.flags && g.flags.made_fruit))
                forig = fruit_from_name(g.pl_fruit || 'slime mold').f;
            if (!forig && highest_fid >= 100) {
                /* C: config_error_add("Doing that so many times isn't very
                 * fruitful."); return optn_ok — pl_fruit is NOT changed. */
                return null;
            }
        }
    }
    /* C options.c:1745-1751 — nmcpy + sanitize_name + the empty-name default. */
    g.pl_fruit = sanitize_name(op);
    if (!g.pl_fruit)
        g.pl_fruit = 'slime mold';
    /* C options.c:1754-1756 — fruitadd(svp.pl_fruit, forig): svp.pl_fruit is
     * the argument, so this is the user_specified call. */
    fruitadd(g.pl_fruit, forig, true);
    /* C options.c:1757 — pline("Fruit is now \"%s\".", svp.pl_fruit), read
     * AFTER fruitadd, which may have singularised or "candied "-prefixed it. */
    return `Fruit is now "${g.pl_fruit}".`;
}
