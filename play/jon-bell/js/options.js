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
import { regcomp, regex_error_desc } from './posixregex.js';
import { DOSET_BOOLS } from './doset_data.js';
import { optfn_menustyle_set } from './menustyle.js';
import { option_state } from './options_runtime.js';
import { optfn_suppress_alert_set } from './feature_alert.js';
import { optfn_number_pad_set, set_misc_menu_command } from './cmd_config.js';
import { parseautocomplete } from './cmd.js';
import { config_error_add } from './cfgfiles.js';
import { gr as roleGlobals } from './roles.js';
import { str2role, str2race, str2gend, str2align, setrolefilter } from './role.js';
import { glyphrep_to_custom_map_entries } from './glyphs.js';
import { sym_val_real, apply_pending_s_utf8, symset_defined_in_file, SYM_OFFSETS } from './symbols.js';
import { config_line_error, config_statement, choose_random_part, config_error_nextline, config_error_secure, is_config_section, parse_autopickup_exception, parse_msgtype } from './cfgfiles.js';
import { menucolor_row, menucolor_text, add_menu_coloring, match_str2clr, attr2attrname, attrnames } from './coloratt.js';
import { TtyMenu, PICK_NONE, PICK_ONE, PICK_ANY, ATR_NONE } from './tty_menu.js';
import { getlin } from './windows.js';
import { mungspaces, fuzzymatch } from './hacklib.js';
import { nh_sprintf, docorner_status_rows, _threeStatusLines } from './display.js';
import { pline } from './pline.js';
import { optfn_sortdiscoveries_set, get_sortdisco } from './o_init.js';
// C options.c:6768 match_optname compares names case-insensitively; keep
// the native storage field (for example, flags.goldX) from the matched row.
let booleanStorage;
function getBooleanStorage() {
    return booleanStorage ??= new Map(DOSET_BOOLS.map(row => [row.name.toLowerCase(), row]));
}
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
export function parse_pickup_types(op) {
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

export function parse_end_disclose(val, negated, existing = END_DISCLOSE_DEFAULT) {
    const op = (val == null) ? '' : String(val);
    const lower = op.toLowerCase();
    if (op && negated) {
        config_error_add('The disclose option may not both have a value and be negated.');
        return existing;
    }
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
    const out = existing.split('');
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
        } else if (valid.includes(c)) {
            prefix = c;
        } else if (c === ' ') {
            /* do nothing */
        } else {
            // C writes each category immediately, even when a later byte fails.
            config_error_add("Unknown disclose parameter '%c'", raw.charCodeAt(0));
            return out.join('');
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
/* `explain` = paranoia[].explain (options.c:149-178) verbatim — the right-hand
 * column handler_paranoid_confirmation paints into the PICK_ANY submenu. */
export const PARANOIA_OPTS = [
    { mask: 0x0001, name: 'Confirm',     minLen: 1, syn: 'Paranoia',        synMinLen: 2, explain: 'for "yes" confirmations, require "no" to reject' },
    { mask: 0x0002, name: 'quit',        minLen: 1, syn: 'explore',         synMinLen: 2, explain: 'yes vs y to quit or to enter explore mode' },
    { mask: 0x0004, name: 'die',         minLen: 1, syn: 'death',           synMinLen: 2, explain: 'yes vs y to die (explore mode or debug mode)' },
    { mask: 0x0008, name: 'bones',       minLen: 1, explain: 'yes vs y to save bones data when dying in debug mode' },
    { mask: 0x0010, name: 'attack',      minLen: 1, syn: 'hit',             synMinLen: 1, explain: 'yes vs y to attack a peaceful monster' },
    { mask: 0x0080, name: 'wand-break',  minLen: 2, syn: 'break-wand',      synMinLen: 2, explain: 'yes vs y to break a wand via (a)pply' },
    { mask: 0x0200, name: 'eat',         minLen: 1, syn: 'continue',        synMinLen: 4, explain: 'yes vs y to continue eating after first bite when satiated' },
    { mask: 0x0100, name: 'Were-change', minLen: 2, explain: 'yes vs y to change form when lycanthropy is controllable' },
    { mask: 0x0020, name: 'pray',        minLen: 1, explain: 'y required to pray (supersedes old "prayconfirm" option)' },
    { mask: 0x0800, name: 'trap',        minLen: 1, syn: 'move-trap',       synMinLen: 1, explain: 'y required to enter known trap unless considered harmless' },
    { mask: 0x1000, name: 'Autoall',     minLen: 2, syn: 'autoselect-all',  synMinLen: 2, explain: 'y required to pick filter choice \'A\' for menustyle:Full' },
    { mask: 0x0400, name: 'swim',        minLen: 1, explain: "'m' prefix necessary to deliberately walk into lava or water" },
    { mask: 0x0040, name: 'Remove',      minLen: 1, syn: 'Takeoff',         synMinLen: 1, explain: 'always pick from inventory for Remove and Takeoff' },
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

/* C ref: botl.c:703 initblstats[] field names, botl.c:2189 fieldids_alias[]. */
const BL_FLDNAMES = ['title','strength','dexterity','constitution','intelligence','wisdom',
    'charisma','alignment','score','carrying-capacity','gold','power','power-max',
    'experience-level','armor-class','hd','time','hunger','hitpoints','hitpoints-max',
    'dungeon-level','experience','condition','version','weapon','armor','terrain'];
const BL_STRFLDS = new Set(['title','alignment','dungeon-level','version','weapon','armor','terrain']);
const BL_ALIASES = { characteristics: 'characteristics', encumbrance: 'carrying-capacity',
    'experience-points': 'experience', dx: 'dexterity', co: 'constitution', con: 'constitution',
    points: 'score', cap: 'carrying-capacity', pw: 'power', 'pw-max': 'power-max',
    xl: 'experience-level', xplvl: 'experience-level', ac: 'armor-class', 'hit-dice': 'hd',
    turns: 'time', hp: 'hitpoints', 'hp-max': 'hitpoints-max', dgn: 'dungeon-level',
    xp: 'experience', exp: 'experience', flags: 'condition' };
/* C botl.c:2220 fldname_to_bl_indx: use field names in place of BL_* ids. */
export function status_fieldname(name) {
    if (!name) return null;
    const norm = s => s.toLowerCase().replace(/[ \-_]/g, '');
    let matches = BL_FLDNAMES.filter(n => norm(n) === norm(name));
    if (!matches.length)
        matches = Object.entries(BL_ALIASES).filter(([n]) => norm(n) === norm(name)).map(([, n]) => n);
    if (!matches.length)
        matches = BL_FLDNAMES.filter(n => n.toLowerCase().startsWith(name.toLowerCase()));
    return matches.length === 1 ? matches[0] : null;
}
/* C ref: botl.c:781-797 conditions[].text[0] and botl.c:749-770 condition_aliases[] ids */
export const COND_NAMES = ['Bare', 'Blind', 'Busy', 'Conf', 'Deaf', 'Iron', 'Fly', 'FoodPois', 'Glow',
    'Grab', 'Hallu', 'Held', 'Icy', 'InLava', 'Lev', 'Parlyz', 'Ride', 'Zzz', 'Slime', 'Slip',
    'Stone', 'Strngl', 'Stun', 'Submrg', 'TermIll', 'Teth', 'Trap', 'Out', 'WLegs', 'UHold'];


/* C ref: botl.c:2593-2650 parse_status_hl1() tokenisation + botl.c:2468
 * fldname_to_bl_indx() + the threshold classification of
 * parse_status_hl2() (botl.c:2814-2975).  Returns [fmt, arg] for the first
 * config_error_add() C would make, or null. */
export function hilite_status_config_error(op) {
    const hsbuf = [''];
    let fldnum = 0;
    const check = () => {
        const name = hsbuf[0];
        const f = status_fieldname(name);
        if (f === null)
            return ["Unknown status field '%s'", name];
        if (f === 'condition') {
            /* botl.c:3205-3228 str2conditionbitmask(): each '+'/'&' subfield
             * must match a condition name or alias, else
             * config_error_add("Unknown condition '%s'") (parse_condition,
             * botl.c:3243-3256, only reached once the condition field exists). */
            const cs = hsbuf[1] || '';
            /* botl.c:3250-3254 "Missing condition(s)"; :3286-3289 each
             * condition set needs a following how, else "Missing
             * color+attribute". */
            if (!cs)
                return ["Missing condition(s)"];
            if (!hsbuf[2])
                return ["Missing color+attribute"];
            if (cs) {
                for (const sub of cs.split(/[+&]/)) {
                    if (sub && !match_str2conditionbitmask(sub))
                        return ["Unknown condition '%s'", sub];
                }
            }
            return null;
        }
        if (f === 'characteristics')
            return null;
        /* botl.c:3036-3063 parse_status_hl2(): each rule's "how" is a
         * '+'/'&' list of attributes and at most one colour; match_str2clr()
         * complains (coloratt.c:367), then "bad color '%d %d'". */
        for (let k = 2; k < hsbuf.length; k += 2) {
            const e = check_behavior(f, hsbuf[k - 1], hsbuf[k] || '');
            if (e) {
                // C botl.c:3099: thresholds preceding an error stay installed.
                e.accepted = hsbuf.slice(0, k - 1).join('/');
                return e;
            }
            const how = hsbuf[k] || '';
            if (!how) break;
            let coloridx = -1;
            for (const sf of how.split(/[+&]/)) {
                const nrm = x => x.replace(/[ \-_]/g, '');
                if (attrnames.some(a => a.name && nrm(a.name) === nrm(sf))) continue;
                const c = match_str2clr(sf, true);
                if (c >= 16 || coloridx !== -1)
                    return c >= 16 ? ["Unknown color '%s'", sf, "bad color '%s'", `${c} ${coloridx}`]
                        : ["bad color '%s'", `${c} ${coloridx}`];
                coloridx = c;
            }
        }
        return null;
    };
    const check_behavior = (f, t, next) => {
        if (!next || t === 'always' || t === 'up' || t === 'down' || t === 'changed'
            || (f === 'hitpoints' && t === 'criticalhp'))
            return null;
        if (/^[<>]?=?[-+]?[0-9]+%$/.test(t) && !BL_STRFLDS.has(f)
            && !['power', 'experience-level', 'hitpoints', 'experience'].includes(f))
            /* botl.c:2999 initblstats[fld].idxmax < 0 (only INIT_BLSTATP fields have one) */
            return ["Cannot use percent with '%s'", f];
        if (/^[<>]?=?[-+]?[0-9]+%?$/.test(t) && !BL_STRFLDS.has(f)) {
            /* botl.c:2927-2964 parse_status_hl2(): reject out-of-range numbers */
            const percent = t.endsWith('%');
            const grt = t[0] === '>' && t[1] !== '=', gte = t[0] === '>' && t[1] === '=';
            const lt = t[0] === '<' && t[1] !== '=', le = t[0] === '<' && t[1] === '=';
            const num = parseInt(t.replace(/[%<>=+]/g, ''), 10);
            if (num < (f === 'armor-class' ? -128 : grt ? -1 : lt ? 1 : 0)
                || num > (percent ? (lt ? 101 : 100) : 2147483647))
                return ["hilite_status threshold '%s' is out of range",
                    (grt ? '>' : gte ? '>=' : lt ? '<' : le ? '<=' : '=') + num + (percent ? '%' : '')];
            /* C botl.c:3004-3023 compares the VALUE to GT_VALUE (4) and
             * LT_VALUE (1) at -1 and 101; preserve that bug. */
            if (percent && (num < -1 || num === -1 || (num === 0 && lt)
                || (num === 100 && grt) || num === 101 || num > 101))
                return ["hilite_status: invalid percentage value '%s'",
                    (grt ? '>' : gte ? '>=' : lt ? '<' : le ? '<=' : '=') + num + '%'];
        }
        if (/^[<>]?=?[-+]?[0-9]+%?$/.test(t) || BL_STRFLDS.has(f))
            return null;
        if (f === 'carrying-capacity' || f === 'hunger')
            return null; /* enum words: not modelled, never rejected here */
        return [/^[<>=+\-0-9%]*$/.test(t)
            ? "Wrong format '%s', expected a threshold number or percent"
            : "Unknown behavior '%s'", t];
    };
    for (const ch of op) {
        const c = ch.toLowerCase();
        if (c === ' ') {
            if (fldnum >= 1) {
                if (fldnum === 1 && hsbuf[0] === 'title') { hsbuf[fldnum] += c; continue; }
                const e = check();
                if (e) return e;
            }
            hsbuf.length = 1; hsbuf[0] = ''; fldnum = 0;
        } else if (c === '/') {
            hsbuf[++fldnum] = '';
        } else {
            hsbuf[fldnum] += c;
        }
    }
    return fldnum >= 1 ? check() : null;
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
    /* options.c:2956-3016 scans rather than splits: a '!' may be separated
     * from its token by one space ("+attack ! pray" — options.c:2965-2966
     * skips the space after '!' so "! pray" never looks up ""), and the
     * "nofoo"=="!foo" prefix test (options.c:2968-2974) needs a third char
     * that is neither 'n' (case-sensitive, to spare "none") nor the token's
     * end.  A residue that comes up empty (a lone '+', or "no foo") is an
     * unknown-parameter error in C, not a skip. */
    let pos = 0;
    for (;;) {
        let fieldNegated = lineNegated;
        let tokStart = pos;
        if (op.charAt(pos) === '!') {
            fieldNegated = true;
            if (op.charAt(++pos) === ' ') /* skip '!', maybe whitespace */
                ++pos;
            tokStart = pos;
        } else if (op.charAt(pos).toLowerCase() === 'n'
                   && op.charAt(pos + 1).toLowerCase() === 'o'
                   && op.charAt(pos + 2) !== 'n' && op.charAt(pos + 2) !== '') {
            /* "nofoo" == "!foo" (options.c:2968-2974), unless it would be
             * confused with "none" or run out of token. */
            fieldNegated = true;
            tokStart = pos + 2;
        }
        const sp = op.indexOf(' ', tokStart);
        const token = sp === -1 ? op.slice(tokStart) : op.slice(tokStart, sp);
        let matched = null;
        for (const p of PARANOIA_OPTS) {
            if (_match_paranoia_optname(token, p.name, p.minLen)
                || (p.syn && _match_paranoia_optname(token, p.syn, p.synMinLen))) {
                matched = p;
                break;
            }
        }
        if (!matched) {
            /* options.c:3007-3011 config_error_add() + optn_silenterr */
            config_error_add("Unknown %s parameter '%s'", 'paranoid_confirmation', token);
            return bits; /* unknown token: stop, keep earlier changes this call */
        }
        if (matched.mask === PARANOID_NONE_MASK) {
            if (!plusOrMinus)
                bits = 0;
        } else if (fieldNegated) {
            bits &= ~matched.mask;
        } else {
            bits |= matched.mask;
        }
        if (sp === -1)
            break; /* no next token */
        pos = sp + 1;
    }
    return bits;
}


/* C symbols.c:403-428 loadsyms[] (PCHAR/OBJCLASS/MONSYM names, the SYM_OTH
 * tail and the SYM_CONTROL words) and the match_sym() alternates
 * (symbols.c:854-866); names compare case-insensitively (strncmpi). */
const LOADSYMS_NAMES = new Set(["S_stone","S_vwall","S_hwall","S_tlcorn","S_trcorn","S_blcorn","S_brcorn","S_crwall","S_tuwall","S_tdwall","S_tlwall","S_trwall","S_ndoor","S_vodoor","S_hodoor","S_vcdoor","S_hcdoor","S_bars","S_tree","S_room","S_darkroom","S_engroom","S_corr","S_litcorr","S_engrcorr","S_upstair","S_dnstair","S_upladder","S_dnladder","S_brupstair","S_brdnstair","S_brupladder","S_brdnladder","S_altar","S_grave","S_throne","S_sink","S_fountain","S_pool","S_ice","S_lava","S_lavawall","S_vodbridge","S_hodbridge","S_vcdbridge","S_hcdbridge","S_air","S_cloud","S_water","S_arrow_trap","S_dart_trap","S_falling_rock_trap","S_squeaky_board","S_bear_trap","S_land_mine","S_rolling_boulder_trap","S_sleeping_gas_trap","S_rust_trap","S_fire_trap","S_pit","S_spiked_pit","S_hole","S_trap_door","S_teleportation_trap","S_level_teleporter","S_magic_portal","S_web","S_statue_trap","S_magic_trap","S_anti_magic_trap","S_polymorph_trap","S_vibrating_square","S_trapped_door","S_trapped_chest","S_vbeam","S_hbeam","S_lslant","S_rslant","S_digbeam","S_flashbeam","S_boomleft","S_boomright","S_ss1","S_ss2","S_ss3","S_ss4","S_poisoncloud","S_goodpos","S_sw_tl","S_sw_tc","S_sw_tr","S_sw_ml","S_sw_mr","S_sw_bl","S_sw_bc","S_sw_br","S_expl_tl","S_expl_tc","S_expl_tr","S_expl_ml","S_expl_mc","S_expl_mr","S_expl_bl","S_expl_bc","S_expl_br","S_strange_obj","S_weapon","S_armor","S_ring","S_amulet","S_tool","S_food","S_potion","S_scroll","S_book","S_wand","S_coin","S_gem","S_rock","S_ball","S_chain","S_venom","S_ANT","S_BLOB","S_COCKATRICE","S_DOG","S_EYE","S_FELINE","S_GREMLIN","S_HUMANOID","S_IMP","S_JELLY","S_KOBOLD","S_LEPRECHAUN","S_MIMIC","S_NYMPH","S_ORC","S_PIERCER","S_QUADRUPED","S_RODENT","S_SPIDER","S_TRAPPER","S_UNICORN","S_VORTEX","S_WORM","S_XAN","S_LIGHT","S_ZRUTY","S_ANGEL","S_BAT","S_CENTAUR","S_DRAGON","S_ELEMENTAL","S_FUNGUS","S_GNOME","S_GIANT","S_invisible","S_JABBERWOCK","S_KOP","S_LICH","S_MUMMY","S_NAGA","S_OGRE","S_PUDDING","S_QUANTMECH","S_RUSTMONST","S_SNAKE","S_TROLL","S_UMBER","S_VAMPIRE","S_WRAITH","S_XORN","S_YETI","S_ZOMBIE","S_HUMAN","S_GHOST","S_GOLEM","S_DEMON","S_EEL","S_LIZARD","S_WORM_TAIL","S_MIMIC_DEF","S_nothing","S_unexplored","S_boulder","S_pet_override","S_hero_override","start","begin","finish","handling","description","color","colour","restrictions"].map(n => n.toLowerCase()));
const MATCH_SYM_ALTERNATES = { s_armour: 's_armor', s_explode1: 's_expl_tl',
    s_explode2: 's_expl_tc', s_explode3: 's_expl_tr', s_explode4: 's_expl_ml',
    s_explode5: 's_expl_mc', s_explode6: 's_expl_mr', s_explode7: 's_expl_bl',
    s_explode8: 's_expl_bc', s_explode9: 's_expl_br' };

/* C symbols.c:782-807 parsesymbols(): the entry list is split at the first
 * UNQUOTED comma (not one after a backslash, nor one between quotes), and the
 * remainder is applied first.  So `S_upstair:\\,S_dnstair:x` is ONE entry. */
function parsesymbols_entries(opts) {
    for (let i = 1; i < opts.length; ++i) {
        const post = opts[i + 1], pre = opts[i - 1];
        if (post === undefined)
            break;
        if (opts[i] !== ',' || (pre === "'" && post === "'") || pre === '\\')
            continue;
        return [...parsesymbols_entries(opts.slice(i + 1)), opts.slice(0, i)];
    }
    return [opts];
}

/* C symbols.c:773-849 parsesymbols(): success is decided by the name lookup
 * alone (the value only feeds the symset overrides); G_ names need
 * match_glyph(), which this port does not model, so they count as unmatched. */
let parsesymbols_cut = -1;
function parsesymbols_ok(opts) {
    let comma = -1, colon = -1;
    for (let i = 1; i < opts.length; ++i) {
        const post = opts[i + 1], pre = opts[i - 1];
        if (post === undefined)
            break;
        if (opts[i] === ',' && ((pre === "'" && post === "'") || pre === '\\'))
            continue;
        if (opts[i] === ':' && pre === "'" && post === "'")
            continue;
        if (opts[i] === ',' && comma < 0) comma = i;
        if (opts[i] === ':' && colon < 0) colon = i;
    }
    if (comma >= 0) {
        /* C NULs the comma before recursing, so a failure there leaves bufp
         * (as later printed) cut at the comma. */
        parsesymbols_cut = comma;
        if (!parsesymbols_ok(opts.slice(comma + 1))) {
            /* the inner call's cut is relative to its own text; C's bufp is
             * already NULed at this comma, so it stays the outer cut */
            parsesymbols_cut = comma;
            return false;
        }
        opts = opts.slice(0, comma);
        if (colon > comma) colon = -1;
    }
    let sep = colon;
    if (sep < 0) sep = opts.indexOf('=');
    if (sep < 0)
        return false;
    parsesymbols_cut = sep; /* C: *strval++ = '\0' */
    const symname = opts.slice(0, sep).trim().replace(/\s+/g, ' ').toLowerCase();
    return LOADSYMS_NAMES.has(symname) || (symname in MATCH_SYM_ALTERNATES);
}

/* C ref: cfgfiles.c:1691-1815 parse_conf_buf() with is_config_section()
 * (:523) / handle_config_section() (:552) / choose_random_part() (:464):
 * joins backslash-continued lines, drops lines outside the CHOOSE-d section,
 * and draws rn2(nsep) for CHOOSE=a,b,c.  Returns the logical lines the
 * statement parser sees. */
/* C cfgfiles.c:1668 parser->inbufsz = 4 * BUFSZ (global.h:389): each
 * physical line is read by fgets(inbuf, inbufsz), i.e. at most inbufsz-1
 * characters per call. */
const CNF_INBUFSZ = 4 * 256;

/* C cfgfiles.c:1851 fgets() loop + parse_conf_buf() (:1691-1715): yields
 * the physical lines C processes, newline removed.  A line whose first
 * fgets() chunk has no newline and is not short of the buffer is rejected
 * with config_error_add("Line too long, skipping") and every chunk up to the
 * next newline is discarded unread. */
function* rc_fgets_lines(rc) {
    let pos = 0, skip = false;
    while (pos < rc.length) {
        const nl = rc.indexOf('\n', pos);
        const end = Math.min(rc.length, pos + CNF_INBUFSZ - 1);
        const chunkEnd = (nl >= 0 && nl < end) ? nl + 1 : end;
        const chunk = rc.slice(pos, chunkEnd);
        pos = chunkEnd;
        const hasNl = chunk.endsWith('\n');
        if (skip) {
            if (hasNl) skip = false;
            continue;
        }
        if (!hasNl) {
            if (chunk.length < CNF_INBUFSZ - 2) {
                yield chunk;
            } else {
                config_error_add('Line too long, skipping');
                skip = true;
            }
            continue;
        }
        yield chunk.slice(0, -1);
    }
}

function* rc_logical_lines(rc) {
    const errors = () => (game._config_errors || []).filter(m => typeof m === 'string').length;
    const initialErrors = errors();
    const secure = config_error_secure();
    let chosen = null, current = null, buf = null, line_num = 0;
    try {
    for (let line of rc_fgets_lines(rc)) {
        if (secure && errors() > initialErrors) return; // config_error_nextline(), secure rc
        const more = line.endsWith('\\');
        if (more) line = line.slice(0, -1);
        // C cfgfiles.c:1720-1728: ep stays on the removed backslash's NUL,
        // so the whitespace loop does not run for a continued line.
        else line = line.replace(/[ \t\r]+$/, '');
        if (game.config_error_data && !config_error_nextline(line)) return;
        game._rc_errctx = { line_num: ++line_num, origline: line.slice(0, 1023) };
        const ep = line.replace(/^[ \t]+/, '');
        const ignore = !ep || ep[0] === '#';
        const old = buf !== null;
        if (!ignore) {
            buf = old ? buf + ' ' + ep : ep;
            // C cfgfiles.c:1760-1762 bounds each merged line, before CHOOSE
            // or the statement parser sees it (including OPTIONS' origbuf).
            buf = buf.slice(0, CNF_INBUFSZ - 1);
        }
        if (more || (ignore && !old)) continue;
        const b = buf;
        buf = null;
        const sect = is_config_section(b);
        if (sect !== null) {
            current = null;
            if (chosen === null) {
                config_error_add('Section "[%s]" without CHOOSE', sect);
            } else if (sect) {
                current = sect;
            } else {
                chosen = null;
            }
            continue;
        }
        if (current !== null && (chosen === null || current !== chosen))
            continue;
        /* match_varname(buf, "CHOOSE", 6) (options.c:6760): the name part
         * (up to '=' or ':', length_without_val) is a >=6-char prefix. */
        const optp = b.search(/[=:]/);
        const nm = (optp < 0 ? b : b.slice(0, optp)).replace(/\s+$/, '');
        if (nm.length >= 6 && 'CHOOSE'.toLowerCase().startsWith(nm.toLowerCase())) {
            if (optp < 0) {
                config_error_add('Format is CHOOSE=section1,section2,...');
                continue;
            }
            const str = b.slice(optp + 1);
            chosen = choose_random_part(str, ',');
            if (chosen === null)
                config_error_add('No config section to choose');
            continue;
        }
        yield b;
    }
    } finally {
        game._rc_errctx = null;
    }
}

/* C options.c:4025-4032 optfn_statushilites(do_set). */
export function optfn_statushilites_set(iflags, op, negated = false) {
    const n = op ? (parseInt(op, 10) || 0) : 3;
    iflags.hilite_delta = negated ? 0 : n < 0 ? 1 : n;
    // C options.c:4034-4035; startup parses into a separate iflags object.
    if (iflags === game.iflags && !game.go.opt_from_file) reset_status_hilites();
}

// C options.c:1065-1143 optfn_autounlock(do_set). Commit only after the
// entire list validates; '+' and space separators cannot be mixed.
function optfn_autounlock(flags, op, negated) {
    if (!op) {
        flags.autounlock = negated ? 0 : 2;
        return;
    }
    let newflags = 0;
    const sep = op.includes('+') ? '+' : ' ';
    while (op !== null) {
        op = op.replace(/^[ \t]+|[ \t]+$/g, '');
        const end = op.indexOf(sep);
        const next = end < 0 ? null : op.slice(end + 1);
        if (end >= 0) op = op.slice(0, end).replace(/[ \t]+$/g, '');
        let matched = 'none'.startsWith(op.toLowerCase());
        if (matched) negated = true;
        for (const name of ['untrap', 'apply-key', 'kick', 'force']) {
            if (matched) break;
            if (name.startsWith(op.toLowerCase())
                || name.replace(/[ _-]/g, '') === op.toLowerCase().replace(/[ _-]/g, '')) {
                // C deliberately switches on the original, case-sensitive byte.
                const bit = { u: 1, a: 2, k: 4, f: 8 }[op[0]];
                if (bit) { newflags |= bit; matched = true; }
            }
        }
        if (!matched) {
            config_error_add('Invalid value for "%s": "%s"', 'autounlock', op);
            return;
        }
        op = next;
    }
    if (negated && newflags) {
        config_error_add('Invalid value combination for "%s": \'none\' with some', 'autounlock');
        return;
    }
    flags.autounlock = newflags;
}

// C options.c:847 petname_optfn(do_set), nmcpy(:6861), bones.c:198.
function petname_optfn(flags, name, op, negated, eightBitInput) {
    if (!op && !negated) return;
    if (negated || op === 'none' || op === '(none)') op = '';
    flags[name] = sanitize_name(op.split(/[\0,]/, 1)[0].slice(0, 62), !eightBitInput);
}

// C options.c:1170-1223 (BACKWARD_COMPAT). The startup and in-game setter
// share validation; only the latter requests a redraw and can block on errors.
function set_boulder_symbol(target, opts, op, negated, report) {
    if (negated) {
        report('The boulder option may not both have a value and be negated.');
        return false;
    }
    if (!op) {
        report("Missing parameter for '%s'", opts);
        return false;
    }
    const sym = escapes(op)[0] ?? '\0';
    if (sym < ' ') {
        report('boulder symbol cannot be a control character');
        return false;
    }
    const clash = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@'&;:]~ ".includes(sym)
        ? 'monster' : (sym >= '1' && sym <= '5' ? 'warning' : null);
    if (clash) {
        report("Badoption - boulder symbol '%s' would conflict with a %s symbol", sym, clash);
        return false;
    }
    (target.symbolOverrides ||= {}).S_boulder = sym;
    /* options.c:1213-1214 sets ov_rogue_syms too */
    target.symbolOverrides.S_boulder_rogue = sym;
    if (target === game) {
        const idx = SYM_OFFSETS.X + SYM_BOULDER;
        game.go ||= {};
        (game.go.ov_primary_syms ||= [])[idx] = sym.charCodeAt(0);
        (game.go.ov_rogue_syms ||= [])[idx] = sym.charCodeAt(0);
    }
    return true;
}

export async function optfn_boulder_set(op) {
    const errors = [];
    const changed = set_boulder_symbol(game, 'boulder:' + op, op, false,
        (...args) => errors.push(args));
    for (const args of errors) {
        const message = nh_sprintf(args[0], args.slice(1));
        await pline('%s%s%s', game.iflags.window_inited ? '' : 'config_error_add: ',
            message, /[.!?]$/.test(message) ? '' : '.');
    }
    if (changed) (game.go ||= {}).opt_need_redraw = true;
    return changed;
}

// C options.c:1145,1235,1546: the option menu reads the live compound value.
export function compound_option_value(name) {
    if (name === 'sortdiscoveries') return get_sortdisco();
    if (name === 'autounlock') {
        const bits = game.flags?.autounlock ?? 2;
        return bits ? ['untrap', 'apply-key', 'kick', 'force']
            .filter((_, i) => bits & (1 << i)).join(' + ') : 'none';
    }
    if (name === 'disclose') {
        const value = game.flags?.end_disclose || END_DISCLOSE_DEFAULT;
        return [...DISCLOSURE_OPTIONS].map((c, i) => value[i] + c).join(' ');
    }
    if (name === 'boulder') return game.symbolOverrides?.S_boulder || '`';
    /* C options.c:3025-3040 optfn_paranoid_confirmation get_val: paranoia[]
     * table order; bones hidden during play except wizard mode; "none" if
     * no bits are set. */
    if (name === 'paranoid_confirmation') {
        const bits = game.flags?.paranoia_bits ?? PARANOID_CONFIRMATION_DEFAULT_BITS;
        /* C's loop bound is `paranoia[i].flagmask != 0`, which stops at the
         * "none" row — the "all" terminator (~0) is never a value row. */
        const set = [];
        for (const p of PARANOIA_OPTS) {
            if (!p.mask) break;
            if ((bits & p.mask) !== 0
                && (p.mask !== PARANOID_BONES || game.flags?.debug))
                set.push(p.name);
        }
        return set.length ? set.join(' ') : 'none';
    }
    /* C options.c:3165-3167 optfn_petattr get_val (tty branch). */
    if (name === 'petattr')
        return attr2attrname(game.iflags?.wc2_petattr ?? 7 /* ATR_INVERSE */);
    /* C options.c:3297-3299 optfn_pickup_burden get_val. */
    if (name === 'pickup_burden')
        return burdentype[game.flags?.pickup_burden ?? 2 /* MOD_ENCUMBER */];
    return null;
}

/* C options.c:213-215 burdentype[] — pickup_burden's value table, indexed by
 * flags.pickup_burden (0..5) and walked by handler_pickup_burden's submenu. */
const burdentype = ['unencumbered', 'burdened', 'stressed', 'strained',
    'overtaxed', 'overloaded'];
export const BURDENTYPE = burdentype;

// C options.c:884/1789/3519/3601 and parse_role_opt(:7905). Only the rc-file phase enters
// parseNethackrc; saved values here preserve that phase's duplicate/filter
// semantics. Keep the strings until freedynamicdata(), as C does.
const roleoptNames = ['role', 'race', 'gender', 'alignment'];
// C options.c:776-782: discard only the requested option/phase's string.
function unsaveoptstr(optidx, ophase) {
    const name = option_state().allopt[optidx]?.name;
    const i = Math.max(0, roleoptNames.indexOf(name)); // opt2roleopt's default is role.
    const vals = game.roleoptvals?.[i];
    if (vals?.[ophase] != null) vals[ophase] = null;
}
// C options.c:787-794; global.h:592-600 has seven phases, including phase_not_set.
export function freeroleoptvals() {
    for (const name of roleoptNames)
        for (let phase = 0; phase < 7; ++phase)
            unsaveoptstr(option_state().allopt.findIndex(row => row.name === name), phase);
}
function optfn_role_facet(result, opts, op, negated, state, facet = 'align') {
    const fullname = facet === 'align' ? 'alignment' : facet;
    const mask = { role: 0, race: 0x0ff8, gender: 0xf000, align: 7 }[facet];
    const duplicate = state.duplicate;
    state.duplicate = true;
    if (!op) {
        config_error_add("Missing parameter for '%s'", opts);
        return;
    }
    op = op.replace(/[\t ]+/g, ' ').trim();
    let first = true, prev_negated = false, selected = '';
    while (op) {
        if (op[0] === ' ') op = op.slice(1);
        let val_negated = false;
        while (op[0] === '!' || /^no/i.test(op)) {
            val_negated = !val_negated;
            op = op.slice(op[0] === '!' ? 1 : op[2] === '-' ? 3 : 2);
        }
        if (!op || op[0] === ' ') {
            config_error_add("Negated nothing for '%s'", fullname);
            return;
        }
        if (!first) {
            if (val_negated !== prev_negated || (negated && val_negated)) {
                config_error_add("Invalid mixed negation for '%s%s'", negated ? '!' : '', fullname);
                return;
            } else if (!negated && !val_negated) {
                config_error_add('Multiple role values only allowed when list is negated');
                return;
            }
        }
        first = false;
        prev_negated = val_negated;
        const space = op.indexOf(' '), value = space < 0 ? op : op.slice(0, space);
        if (val_negated || negated) {
            if (!state.saved?.startsWith('!')) {
                if (facet === 'role') roleGlobals.rfilter.roles.fill(false);
                else roleGlobals.rfilter.mask &= ~mask;
            }
            if (!setrolefilter(value)) {
                config_error_add("Invalid %s '%s'", fullname, value);
                return;
            }
            // rolefilterstring(RS_ALGNMNT) returns empty if only another
            // character facet was named (setrolefilter accepts all four).
            state.saved = facet !== 'align'
                ? ((facet === 'role' ? roleGlobals.rfilter.roles.some(Boolean) : roleGlobals.rfilter.mask & mask) ? '!' : '')
                : ['lawful', 'neutral', 'chaotic']
                .filter((_, i) => roleGlobals.rfilter.mask & (4 >> i))
                .map(name => '!' + name).join(' ');
            selected = '!';
        } else {
            if (duplicate && state.saved?.startsWith('!')) {
                const alias = opts.split(/[:=]/, 1)[0].trimEnd().toLowerCase() === 'align';
                config_error_add('compound option specified multiple times: %s%s', fullname,
                    facet === 'align' && alias ? ' (via alias: align)' : '');
                return;
            }
            state.saved = value;
            selected = value;
        }
        op = space < 0 ? '' : op.slice(space + 1);
    }
    if (selected !== '!') {
        const n = { role: str2role, race: str2race, gender: str2gend, align: str2align }[facet](selected);
        if (n === ROLE_NONE) {
            result[facet] = '';
            config_error_add("Unknown %s '%s'", fullname, selected);
        } else {
            result[facet] = state.saved = facet === 'align' ? (n < 0 ? 'random' : ['lawful', 'neutral', 'chaotic'][n]) : selected;
        }
    }
}

function wc_set_window_colors(op) {
    const wcn = ['menu', 'message', 'status', 'text'];
    const wcs = ['mnu', 'msg', 'sts', 'txt'];
    game.wcolors_opt ||= [0, 0, 0, 0];
    let s = mungspaces(op);
    while (s.length) {
        if (s[0] === ' ') s = s.slice(1);
        if (!s.length) return false;
        let sp = s.indexOf(' ');
        if (sp < 0) return false; /* the window name is not followed by a fg */
        const wn = s.slice(0, sp);
        s = s.slice(sp + 1);
        if (s[0] === ' ') s = s.slice(1);
        if (!s.length) return false;
        const slash = s.indexOf('/');
        if (slash < 0) return false; /* no background separator */
        s = s.slice(slash + 1); /* tfg = s[0..slash), the skipped foreground */
        if (s[0] === ' ') s = s.slice(1);
        if (!s.length) return false;
        sp = s.indexOf(' ');
        s = sp < 0 ? '' : s.slice(sp + 1); /* tbg = the skipped background */
        const lower = wn.toLowerCase();
        const j = wcn.findIndex((n, i) => n === lower || wcs[i] === lower);
        if (j >= 0) {
            if (game.wcolors_opt[j] !== 0)
                config_error_add("windowcolors for %s windows specified multiple times", wcn[j]);
            game.wcolors_opt[j]++;
        } else {
            config_error_add("windowcolors for unrecognized window type: %s", wn);
        }
    }
    /* options_set_window_colors_flag = 1 (:10108) only feeds the colour
     * display, which this port does not paint. */
    return true;
}

export function parseNethackrc(rc) {
    // C startup zeros gr.rfilter before reading any options. Keep the filter
    // available to both role_init and the played character-selection menu.
    roleGlobals.rfilter.roles.fill(false);
    roleGlobals.rfilter.mask = 0;
    game.rc_rolefilter = roleGlobals.rfilter;
    const vals = (game.roleoptvals ||= Array.from({ length: 4 }, () => Array(7).fill(null)));
    // C options.c:758-771: this parser handles rc_file_opt (phase 3).
    const facetStates = Object.fromEntries(['role', 'race', 'gender', 'align'].map((facet, i) => [facet, {
        get saved() { return vals[i][3]; },
        set saved(value) { vals[i][3] = value; },
        duplicate: false,
    }]));
    const alignmentState = facetStates.align;
    const compoundSeen = new Set();
    const compoundDuplicate = (name, alias = '') => {
        if (compoundSeen.has(name))
            config_error_add('compound option specified multiple times: %s%s', name, alias ? ` (via alias: ${alias})` : '');
        compoundSeen.add(name);
    };
    const result = {
        name: '',
        role: '',
        race: '',
        gender: '',
        align: '',
        // C optlist.h:687-688, options.c:7164-7167: sortpack defaults to On.
        flags: { autounlock: 2, sortpack: true, vanq_sortmode: 0, inv_order: [12, 5, 2, 3, 7, 9, 10, 8, 4, 11, 6, 13, 14, 15, 16] }, // options.c:118,1076,3967
        // C options.c:7181 initoptions_init: tty message history defaults to single.
        iflags: { hilite_delta: 0, prevmsg_window: 's',
            // C options.c:7188-7189: default headings are inverse, no color.
            menu_headings: { attr: 7, color: 8 } },
        uroleplay: {blind: false, deaf: false, nudist: false, pauper: false},
    };
    if (!rc)
        return result;
    let number_pad_seen = false, packorder_seen = false;
    const bool_dup_seen = new Set();
    const cfgerr_base = (game._config_errors || []).filter(m => typeof m === 'string').length;
    for (const rawLine of rc_logical_lines(rc)) {
        if (config_error_secure()
            && (game._config_errors || []).filter(m => typeof m === 'string').length > cfgerr_base)
            break;
        const line = config_statement(rawLine, result);
        if (!line || line.startsWith('#'))
            continue;
        // C ref: cfgfiles.c:1311 CNFL_N(BINDINGS, 4) — the BINDINGS statement
        // matches any prefix abbreviation of length >= 4 ("BIND"..."BINDINGS");
        // cnf_line_BINDINGS (cfgfiles.c:617) -> parsebindings (options.c:7614):
        // comma-separated key:command pairs; each -> bind_key (options.c:7687).
        const bindMatch = line.match(/^(?:BIND|BINDI|BINDIN|BINDING|BINDINGS)=([\s\S]*)/i);
        if (bindMatch) {
            parsebindings(bindMatch[1]);
            continue;
        }

        /* C cfgfiles.c:627 cnf_line_AUTOCOMPLETE (CNFL_N(AUTOCOMPLETE, 5)) */
        const acMatch = line.match(/^(AUTOC[A-Z]*)=([\s\S]*)$/i);
        if (acMatch && 'AUTOCOMPLETE'.startsWith(acMatch[1].toUpperCase())) {
            parseautocomplete(acMatch[2], true);
            continue;
        }

        /* C cfgfiles.c:1191-1199 cnf_line_ROGUESYMBOLS (CNFL_N(ROGUESYMBOLS, 4)):
         * a definition parsesymbols() rejects is reported, in file order. */
        const rogueMatch = line.match(/^(ROGU[A-Z]*)\s*=\s*(.*)$/i);
        if (rogueMatch && 'ROGUESYMBOLS'.startsWith(rogueMatch[1].toUpperCase())) {
            parsesymbols_cut = -1;
            if (!parsesymbols_ok(rogueMatch[2])) {
                /* bufp is printed after parsesymbols() NULed its separators */
                const bufp = parsesymbols_cut < 0 ? rogueMatch[2] : rogueMatch[2].slice(0, parsesymbols_cut);
                config_error_add("Error in ROGUESYMBOLS definition '%s'", bufp);
            }
            continue;
        }

        /* C cfgfiles.c's SYMBOLS directive is separate from OPTIONS=.  The
         * renderer presently has a narrow consumer for S_pool, so retain that
         * direct one-character override rather than dropping the whole line.
         * A full symbols.c parser remains outside this rc parser's scope. */
        const symbolsMatch = line.match(/^SYMBOLS=(.+)/i);
        if (symbolsMatch) {
            /* C cfgfiles.c cnf_line_SYMBOLS: a definition parsesymbols() rejects
             * is reported, in file order.  G_ glyph references are matched by
             * glyphs.c, not modeled by parsesymbols_ok, so they are skipped. */
            if (!/(^|,)\s*G_/i.test(symbolsMatch[1])) {
                parsesymbols_cut = -1;
                if (!parsesymbols_ok(symbolsMatch[1])) {
                    const bufp = parsesymbols_cut < 0 ? symbolsMatch[1] : symbolsMatch[1].slice(0, parsesymbols_cut);
                    config_error_add("Error in SYMBOLS definition '%s'", bufp);
                }
            }
            for (const entry of parsesymbols_entries(symbolsMatch[1])) {
                /* symbols.c parsesymbols(): a G_ glyph reference goes through
                 * glyphrep_to_custom_map_entries() (glyphs.c:111) */
                if (/^\s*G_/.test(entry))
                    // C symbols.c:821-833 passes symname after terminating it at ':' or '='.
                    glyphrep_to_custom_map_entries(entry.split(/[:=]/, 1)[0].trim(), { value: 0 });
                /* C symbols.c:811-844: every S_<name>:<val> pair, monster
                 * classes included, lands in ov_primary_syms. */
                const pairMatch = entry.match(/^\s*(S_[^:=\s]+)\s*[:=]\s*(.*?)\s*$/i);
                if (pairMatch)
                    (result.symbolPairs ||= []).push([pairMatch[1], pairMatch[2]]);
                /* symbols.c:830-837: a U+ value goes to
                 * glyphrep_to_custom_map_entries, not ov_primary_syms. */
                if (pairMatch && /^u\+/i.test(pairMatch[2]))
                    continue;
                const symMatch = entry.match(/^\s*(S_(?:pool|boulder|vodoor|hodoor|room|corr|litcorr|stone|vwall|hwall|tlcorn|trcorn|blcorn|brcorn|crwall|tuwall|tdwall|tlwall|trwall))\s*:\s*(.)/i);
                if (symMatch)
                    (result.symbolOverrides ||= {})['S_' + symMatch[1].slice(2).toLowerCase()] = symMatch[2];
                /* symbols.c:239: trap cmap overrides (S_arrow_trap..S_trapped_chest),
                 * consumed by display.js trap_table_entry. */
                const trapMatch = entry.match(/^\s*(S_(?:arrow_trap|dart_trap|falling_rock_trap|squeaky_board|bear_trap|land_mine|rolling_boulder_trap|sleeping_gas_trap|rust_trap|fire_trap|pit|spiked_pit|hole|trap_door|teleportation_trap|level_teleporter|magic_portal|web|statue_trap|magic_trap|anti_magic_trap|polymorph_trap|vibrating_square|trapped_door|trapped_chest))\s*[:=]\s*(?:'([^'])'|([^'\s]))\s*$/i);
                if (trapMatch)
                    (result.symbolOverrides ||= {})['S_' + trapMatch[1].slice(2).toLowerCase()] = trapMatch[2] ?? trapMatch[3];
                // C symbols.c:820-844: other-symbol overrides use sym_val too.
                const otherMatch = entry.match(/^\s*(S_(?:nothing|unexplored|pet_override|hero_override))\s*[:=]\s*(.*?)\s*$/i);
                if (otherMatch)
                    (result.symbolOverrides ||= {})['S_' + otherMatch[1].slice(2).toLowerCase()] = otherMatch[2];
                const terrMatch = entry.match(/^\s*(S_(?:room|corr|litcorr|ndoor|vodoor|hodoor|vcdoor|hcdoor|fountain|altar|water|lava|lavawall|ice|tree))\s*:\s*(?:'([^'])'|([^'\s]))\s*$/i);
                if (terrMatch)
                    (result.symbolOverrides ||= {})['S_' + terrMatch[1].slice(2).toLowerCase()] = terrMatch[2] ?? terrMatch[3];
                /* C symbols.c:839/options.c:9385: direct display consumers
                 * need the same decoded byte as ov_primary_syms, including
                 * quoted escapes (a bare backslash-number is decimal). */
                const overrideName = pairMatch && 'S_' + pairMatch[1].slice(2).toLowerCase();
                if (overrideName && result.symbolOverrides?.[overrideName] !== undefined) {
                    const value = sym_val_real(pairMatch[2]);
                    if (value)
                        result.symbolOverrides[overrideName] = String.fromCharCode(value);
                    else
                        delete result.symbolOverrides[overrideName];
                }
            }
            continue;
        }

        /* C options.c:7682-7693,7732-7753,7844-7861: keep the type and
         * prepend each rule; msgtype_type uses the first matching pattern. */
        const msgtypeMatch = line.match(/^MSGTYPE=([\s\S]*)$/i);
        if (msgtypeMatch) {
            const rule = parse_msgtype(msgtypeMatch[1]);
            if (rule) {
                try {
                    (result.msgtypes ||= []).unshift({ type: rule.type, regex: regcomp(rule.pattern), pattern: rule.pattern });
                } catch (e) { config_error_add('MSGTYPE regex error: %s', config_regex_error(e)); }
            }
            continue;
        }

        /* C cfgfiles.c cnf_line_MENUCOLOR -> coloratt.c add_menu_coloring() */
        const mcMatch = line.match(/^MENUCOLOR=(.*)$/i);
        if (mcMatch) {
            (result.menucolors ||= []).push(mcMatch[1]);
            // C coloratt.c:611: a valid rule enables coloring at this RC line.
            if (add_menu_coloring(mcMatch[1])) result.iflags.use_menu_color = true;
            continue;
        }

        /* C cfgfiles.c:1170-1173,1366: HILITE_STATUS (minimum prefix
         * HILITE) uses the same status-rule parser as OPTIONS=hilite_status. */
        const hlMatch = line.match(/^(HILITE[A-Z_]*)\s*[:=]\s*(.*)$/i);
        if (hlMatch && 'HILITE_STATUS'.startsWith(hlMatch[1].toUpperCase())) {
            const hlop = hlMatch[2].trim();
            const hlerr = hilite_status_config_error(hlop);
            if (hlerr?.accepted?.includes('/')) store_status_hilite(hlerr.accepted);
            if (hlerr)
                { config_error_add(hlerr[0], hlerr[1]); if (hlerr[2]) config_error_add(hlerr[2], hlerr[3]); }
            else if (hlop.includes('/') && status_fieldname(hlop.split('/')[0]) === 'condition')
                (game.status_condition_hilites ||= []).push(hlop);
            else if (hlop.includes('/'))
                push_status_field_hilite(hlop);
            else
                store_status_hilite(hlop);
            // C botl.c:2643-2645: accepting a rule enables highlighting.
            if (!hlerr && !result.iflags.hilite_delta) result.iflags.hilite_delta = 3;
            continue;
        }

        /* C options.c:9300-9345 add_autopickup_exception via cfgfiles.c:612
         * cnf_line_AUTOPICKUP_EXCEPTION: "<pat" (grab) or ">pat" / "pat". */
        const apeMatch = line.match(/^AUTOPICKUP_EXCEPTION=\s*(.*)$/i);
        if (apeMatch) {
            add_autopickup_exception(apeMatch[1], result);
            continue;
        }

        const optMatch = line.match(/^OPTIONS=(.+)/i);
        if (!optMatch) {
            /* C cfgfiles.c:1413,1437 parse_config_line() */
            const cfgerr = config_line_error(line);
            if (cfgerr) config_error_add(cfgerr);
            continue;
        }
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
            const menuval = menusep < 0 ? '' : menuopts.slice(menusep + 1);
            // C options.c:3471-3503 optfn_playmode; parseoptions:620-628.
            const playmode = option_state().allopt.find(r => r.name === 'playmode');
            if (menuname.length >= playmode.minmatch && playmode.name.startsWith(menuname)) {
                const duplicate = compoundSeen.has('playmode');
                compoundDuplicate('playmode');
                if (menunegated) {
                    config_error_add('The playmode option may not both have a value and be negated.');
                    continue;
                }
                const op = menuval.trim();
                if (duplicate || !op) continue;
                if (/^normal/i.test(op) || /^play$/i.test(op)) {
                    result.flags.debug = result.flags.explore = false;
                } else if (/^(explor|discov)/i.test(op)) {
                    result.flags.debug = false;
                    result.flags.explore = true;
                } else if (/^(debug|wizard)/i.test(op)) {
                    result.flags.debug = true;
                    result.flags.explore = false;
                } else {
                    config_error_add('Invalid value for "%s":%s', 'playmode', op);
                }
                continue;
            }
            // C options.c:620-623,6782-6806; optlist.h: these compounds disallow duplicates.
            const compound = option_state().allopt.find(r => ['symset', 'pettype', 'petattr', 'versinfo', 'runmode', 'pickup_types', 'menustyle', 'sortloot', 'sortvanquished', 'msg_window', 'menu_headings', 'perminv_mode'].includes(r.name)
                && ((menuname.length >= r.minmatch && r.name.startsWith(menuname)) || menuname === r.alias));
            if (compound) compoundDuplicate(compound.name, menuname === compound.alias ? compound.alias : '');
            // C options.c:3971-3990,4912: no-value forms still run the handler.
            if (menuname === 'sortvanquished' && !menuval) {
                config_error_add("Missing parameter for '%s'", menuopts);
                if (menunegated) result.flags.vanq_sortmode = 0;
                continue;
            }
            if (menuname === 'windowcolors' && !menuval) {
                config_error_add("Missing parameter for '%s'", menuopts);
                continue;
            }
            // C options.c:2559 optfn_name -> string_for_opt(:6665): a
            // missing value reports an error and leaves plname unchanged.
            if (menuname === 'name' && !menunegated && !menuval) {
                config_error_add("Missing parameter for '%s'", menuopts);
                continue;
            }
            if (menuname === 'align' || (menuname.length >= 6 && 'alignment'.startsWith(menuname))) {
                optfn_role_facet(result, menuopts, menuval, menunegated, alignmentState);
                continue;
            }
            if (menuname.length >= 3 && ('female'.startsWith(menuname) || 'male'.startsWith(menuname))) {
                if (bool_dup_seen.has('female'))
                    config_error_add(`boolean option specified multiple times: female${'male'.startsWith(menuname) ? ' (via alias: male)' : ''}`);
                bool_dup_seen.add('female');
                let isFemale = 'female'.startsWith(menuname) ? !menunegated : menunegated;
                const op = menuval.toLowerCase();
                if (op) {
                    if (menunegated) {
                        config_error_add("Negated boolean '%s' should not have a parameter", 'female');
                        continue;
                    }
                    const numeric = /^\d/.test(op) ? parseInt(op, 10) : NaN;
                    if ('true'.startsWith(op) || 'yes'.startsWith(op) || op === 'on' || numeric === 1)
                        isFemale = 'female'.startsWith(menuname);
                    else if ('false'.startsWith(op) || 'no'.startsWith(op) || op === 'off' || numeric === 0)
                        isFemale = !'female'.startsWith(menuname);
                    else {
                        config_error_add("'%s' is not valid for a boolean", menuopts);
                        continue;
                    }
                }
                result.gender = isFemale ? 'female' : 'male';
                result.flags.female = isFemale;
                continue;
            }
            if (Object.hasOwn(facetStates, menuname)) {
                optfn_role_facet(result, menuopts, menuval, menunegated, facetStates[menuname], menuname);
                continue;
            }
            if (check_misc_menu_command(menuopts) >= 0) {
                compoundDuplicate(menuname);
                set_misc_menu_command(menuopts, menunegated);
                continue;
            }
            if (menuname.length >= 5 && 'autounlock'.startsWith(menuname)) {
                compoundDuplicate('autounlock');
                optfn_autounlock(result.flags, menuval, menunegated);
                continue;
            }
            const petopt = ['catname', 'dogname', 'horsename'].find(n => menuname.length >= 3 && n.startsWith(menuname));
            if (petopt) {
                compoundDuplicate(petopt);
                // optlist.h rejects negation before the shared handler runs.
                if (menunegated)
                    config_error_add('The %s option may not both have a value and be negated.', petopt);
                else petname_optfn(result.flags, petopt, menuval, false, result.iflags.wc_eight_bit_input);
                continue;
            }
            if (menuname.length >= 3 && 'disclose'.startsWith(menuname)) {
                compoundDuplicate('disclose');
                result.flags.end_disclose = parse_end_disclose(menuval, menunegated,
                    result.flags.end_disclose || END_DISCLOSE_DEFAULT);
                continue;
            }
            /* C options.c:1906-1950 optfn_IBMgraphics: the legacy switch
             * selects both IBMgraphics and RogueIBM, preserving named sets
             * and reporting failure if either was already selected. */
            if (menuname.length >= 3 && 'ibmgraphics'.startsWith(menuname)) {
                compoundDuplicate('IBMgraphics');
                if (!menunegated) {
                    let badflag = false, symName = 'IBMgraphics';
                    for (let i = 0; i < 2; ++i) {
                        if (gs.symset?.[i]?.name) {
                            badflag = true;
                        } else {
                            if (i === 1) symName = 'RogueIBM';
                            const set = (gs.symset[i] ||= {});
                            set.name = symName;
                            set.handling = 1; // dat/symbols: Handling: IBM
                            // C symbols.c:214: RogueIBM keeps the no-color default.
                            set.nocolor = i === 1 ? 1 : 0;
                            if (i === 0) result.symset = symName;
                        }
                    }
                    if (badflag)
                        config_error_add('Failure to load symbol set %s.', symName);
                }
                continue;
            }
            // C options.c:1393: the legacy switch loads the existing symbol set.
            if (menuname.length >= 3 && 'decgraphics'.startsWith(menuname)) {
                compoundDuplicate('DECgraphics');
                if (!menunegated) {
                    if (result.symset || gs.symset?.[0]?.name)
                        config_error_add('Failure to load symbol set %s.', 'DECgraphics');
                    else {
                        result.symset = 'DECgraphics';
                        if (gs.symset?.[0]) gs.symset[0].name = result.symset;
                    }
                }
                continue;
            }
            /* C options.c:1906 optfn_IBMgraphics (BACKWARD_COMPAT): loads "IBMGraphics"
             * into the primary set and "RogueIBM" into the rogue set; a set that
             * already has a name is a load failure. */
            if (menuname.length >= 3 && 'ibmgraphics'.startsWith(menuname)) {
                compoundDuplicate('IBMgraphics');
                if (!menunegated) {
                    if (result.symset || gs.symset?.[0]?.name || gs.symset?.[1]?.name)
                        config_error_add('Failure to load symbol set %s.', 'IBMgraphics');
                    else {
                        result.symset = 'IBMgraphics';
                        if (gs.symset?.[0]) gs.symset[0].name = result.symset;
                        if (gs.symset?.[1]) {
                            gs.symset[1].name = 'RogueIBM';
                            gs.symset[1].handling = 1;
                        }
                    }
                }
                continue;
            }
            if (menuname.length >= 7 && 'statushilites'.startsWith(menuname)) {
                optfn_statushilites_set(result.iflags,
                    menusep < 0 ? '' : menuopts.slice(menusep + 1).trim(), menunegated);
                continue;
            }
            /* C options.c:1182-1223 optfn_boulder() (BACKWARD_COMPAT): boulder:sym
             * overrides the primary boulder symbol unless it is a control
             * character or clashes with a monster class / warning symbol. */
            if (menuname.length >= 3 && 'boulder'.startsWith(menuname)) {
                compoundDuplicate('boulder');
                set_boulder_symbol(result, menuopts, menuval, menunegated, config_error_add);
                continue;
            }
            /* C options.c:688-689 parseoptions(): a name matching no allopt[]
             * entry (by abbreviation) falls out of every arm to
             * config_error_add("Unknown option '%s'", opts) and is not stored.
             * `opts` is the text after the negation prefixes were stripped. */
            /* cond_*: options.c:5018 pfxfn_cond_() -> botl.c:1354 parse_cond_option() */
            if (menuname.startsWith('cond_')) {
                const reslt = parse_cond_option(menuopts);
                if (reslt === 3)
                    config_error_add('Ambiguous condition option %s', menuopts);
                else if (reslt !== 0)
                    config_error_add('Unknown condition option %s (%d)', menuopts, reslt);
                /* options.c:676-681 parseoptions(): pfx_match && optn_err */
                if (reslt !== 0)
                    config_error_add("bad option suffix variation '%s'", menuopts.split(':')[0]);
                /* botl.c:820 condopt_info[] bl_bareh is opt_in: cond_barehanded
                 * (>= 4 chars, a prefix of "barehanded") enables the Bare
                 * condition tested at botl.c:1205. */
                /* botl.c:1354-1371 parse_cond_option() sets condopt(i, ...) for the
                 * matched condtests[].useroption; bl_bareh is opt_in (botl.c:820),
                 * so cond_barehanded turns the "Bare" condition on. */
                else {
                    /* options.c:5024 pfxfn_cond_() sets go.opt_need_redraw even
                     * while go.opt_initial; nothing clears it before the first
                     * reset_needed_visuals() (a bound toggle(), e.g.). */
                    result.opt_need_redraw = true;
                    const cu = menuname.slice(5);
                    for (let ci = 0; ci < CONDTESTS.length; ci++) {
                        const cname = CONDTESTS[ci][0];
                        const minlen = cname.length >= 4 ? 4 : cname.length;
                        if (cu.length >= minlen && cname.toLowerCase().startsWith(cu)) {
                            result.flags['cond_' + cname] = !menunegated;
                            break;
                        }
                    }
                }
                continue;
            }
            /* C options.c:2868-2891 optfn_paranoid_confirmation(do_set): the
             * deprecated "prayconfirm" (strncmpi 4) is a synonym for
             * paranoid_confirm:+pray; any value is an error. */
            if (menuname.length >= 4 && 'prayconfirm'.startsWith(menuname)) {
                const pcsep = menuopts.search(/[:=]/);
                const pcop = pcsep < 0 ? '' : menuopts.slice(pcsep + 1).trim();
                if (pcop) {
                    config_error_add("deprecated %sprayconfirm option takes no parameters (found '%s')",
                                     menunegated ? '!' : '', pcop);
                } else {
                    /* C options.c:2872-2884: COMPLAIN_ABOUT_PRAYCONFIRM is
                     * #define'd unconditionally (options.c:20, #undef'd at
                     * :10221), so the no-value arm files the deprecation with
                     * the pending config-error report and keeps going.
                     * allopt[optidx].name is "paranoid_confirmation" —
                     * optlist.h:555-558 carries "prayconfirm" as its alias,
                     * which is how parseoptions matched the name. */
                    config_error_add("%sprayconfirm option is deprecated; switching to %s:%cpray",
                                     menunegated ? '!' : '', 'paranoid_confirmation',
                                     menunegated ? '-' : '+');
                    const existing = (result.flags.paranoia_bits != null)
                        ? result.flags.paranoia_bits
                        : PARANOID_CONFIRMATION_DEFAULT_BITS;
                    result.flags.paranoia_bits =
                        parse_paranoid_confirmation(existing, menunegated ? '-pray' : '+pray', false);
                }
                continue;
            }
            /* C options.c:5099-5101 pfxfn_font(do_set): a font_ prefix whose
             * name is no font_<win>/font_size_<win> option complains, returns
             * FALSE (== optn_err), and parseoptions() :674-681 then adds the
             * bad-suffix line. */
            if (menuname.startsWith('font_')
                && !/^font_(map|menu|message|status|text|size_(map|menu|message|status|text))$/.test(menuname)) {
                config_error_add("Unknown %s parameter '%s'", 'font', menuopts);
                config_error_add("bad option suffix variation '%s'", menuopts.split(':')[0]);
                continue;
            }
            /* C options.c:688-695 parseoptions(): an unmatched S_ name falls to
             * parsesymbols(opts, PRIMARYSET) and is accepted when it names a symbol. */
            if (menuname.startsWith('s_')) {
                parsesymbols_cut = -1;
                if (parsesymbols_ok(menuopts)) {
                    const pm = menuopts.match(/^\s*(S_[^:=\s]+)\s*[:=]\s*(.*?)\s*$/i);
                    if (pm) (result.symbolPairs ||= []).push([pm[1], pm[2]]);
                    continue;
                }
                /* C symbols.c:817-828 NULs the separator and mungspaces()
                 * the name even on failure; options.c:689 prints that buffer. */
                if (parsesymbols_cut >= 0)
                    menuopts = menuopts.slice(0, parsesymbols_cut).trim().replace(/\s+/g, ' ');
            }
            if (menuname && !ALLOPT.some(r => r[0].toLowerCase().startsWith(menuname)) && menuname !== 'permadeaf') {
                config_error_add("Unknown option '%s'", menuopts);
                continue;
            }
            /* C options.c:4497-4502 optfn_versinfo(): string_for_opt(FALSE)
             * (:6665-6677) reports the missing parameter before the handler's
             * own diagnostic. The release build defaults to VI_NUMBER (1). */
            if (menuname.length >= 4 && 'versinfo'.startsWith(menuname)
                && !menunegated && (menusep < 0 || !menuopts.slice(menusep + 1))) {
                config_error_add("Missing parameter for '%s'", menuopts);
                config_error_add("'%s' requires a value; defaulting to %d", 'versinfo', 1);
                continue;
            }
            if (menuname.length >= 4 && 'versinfo'.startsWith(menuname)) {
                // options.c:4504-4510: reject invalid bitmasks without storing them.
                const val = parseInt(menuopts.slice(menusep + 1), 10) || 0;
                if (menunegated)
                    config_error_add('The versinfo option may not both have a value and be negated.');
                else if (!val || (val & ~7) !== 0)
                    config_error_add("'versinfo' must be one of 1, 2, 4, or the sum of two or all three of those");
                else result.flags.versinfo = val;
                continue;
            }
            if (menuname.length >= 4 && 'petattr'.startsWith(menuname) && (menunegated || !menuval)) {
                config_error_add(menunegated ? 'The petattr option may not both have a value and be negated.'
                    : "Missing parameter for '%s'", menuopts);
                if (!menunegated) result.iflags.wc_hilite_pet = (result.iflags.wc2_petattr ?? 7) !== 0;
                continue;
            }
            if (menuname.length >= 3 && 'pile_limit'.startsWith(menuname)) {
                const op = menusep < 0 ? '' : menuopts.slice(menusep + 1);
                if ((menunegated && !op) || (!menunegated && op)) {
                    result.flags.pile_limit = menunegated ? 0 : (parseInt(op, 10) || 0);
                } else if (menunegated) {
                    config_error_add('The pile_limit option may not both have a value and be negated.');
                    continue; /* bad_negation -> optn_err, nothing stored */
                } else {
                    if (!op) config_error_add("Missing parameter for '%s'", menuopts);
                    result.flags.pile_limit = 5;
                }
                if (result.flags.pile_limit < 0) result.flags.pile_limit = 5;
                continue;
            }
            // build has no TTY_PERM_INVENT, so modes 5/6 (+grid) are absent.
            const perminv = option_state().allopt.find(r => r.name === 'perminv_mode');
            if (menuname.length >= perminv.minmatch && perminv.name.startsWith(menuname)) {
                if (menunegated && menuval) {
                    config_error_add('The perminv_mode option may not both have a value and be negated.');
                } else if (menuval) {
                    const modes = [['none', 'off'], ['all', 'on'], ['full', 'gold'],
                        null, null, null, null, null, ['in-use', 'inuse-only']];
                    const op = menuval.toLowerCase();
                    const mode = modes.findIndex((names, i) => names
                        && (names.some(n => n.startsWith(op)) || op[0] === String(i)));
                    if (mode < 0)
                        config_error_add("Unknown %s parameter '%s'", 'perminv_mode', menuval);
                    result.iflags.perminv_mode = mode < 0 ? 0 : mode;
                    // C sets perm_invent even for an explicit 'none'/'off'.
                    result.iflags.perm_invent = mode >= 0;
                } else if (menunegated) {
                    result.iflags.perminv_mode = 0;
                    result.iflags.perm_invent = false;
                } else {
                    config_error_add("Missing parameter for '%s'", menuopts);
                }
                continue;
            }
            if (menuname.length >= 4 && 'map_mode'.startsWith(menuname)) {
                compoundDuplicate('map_mode');
                const mop = menusep < 0 ? '' : menuopts.slice(menusep + 1);
                if (menunegated)
                    config_error_add('The map_mode option may not both have a value and be negated.');
                else if (mop) {
                    const opl = mop.toLowerCase();
                    const hit = opl === 'tiles'
                        || ['ascii4x6', 'ascii6x8', 'ascii8x8', 'ascii16x8',
                            'ascii7x12', 'ascii8x12', 'ascii16x12', 'ascii12x16',
                            'ascii10x18', 'fit_to_screen', 'ascii_fit_to_screen',
                            'tiles_fit_to_screen'].some(k => opl.startsWith(k));
                    if (!hit)
                        config_error_add("Unknown %s parameter '%s'", 'map_mode', mop);
                } else {
                    config_error_add("Missing parameter for '%s'", menuopts);
                }
                continue;
            }
            if (menuname.length >= 9 && 'hilite_status'.startsWith(menuname)
                && !menunegated && (menusep < 0 || !menuopts.slice(menusep + 1).trim())) {
                config_error_add('Value is mandatory for hilite_status');
                continue;
            }
            /* C options.c:1870-1880 optfn_hilite_status(do_set) ->
             * botl.c:2593 parse_status_hl1(): only the config_error_add()
             * rejections are modelled (the highlight rules themselves are
             * not stored by this port). */
            if (menuname.length >= 9 && 'hilite_status'.startsWith(menuname)
                && !menunegated && menusep >= 0) {
                const hlerr = hilite_status_config_error(menuopts.slice(menusep + 1));
                if (hlerr?.accepted?.includes('/')) store_status_hilite(hlerr.accepted);
                if (hlerr) {
                    { config_error_add(hlerr[0], hlerr[1]); if (hlerr[2]) config_error_add(hlerr[2], hlerr[3]); }
                    continue;
                }
                /* C botl.c:2637 -> parse_status_hl2(): store each accepted
                 * rule once (field thresholds append at botl.c:3099). */
                const hlop = menuopts.slice(menusep + 1).trim();
                store_status_hilite(hlop);
                if (!result.iflags.hilite_delta) result.iflags.hilite_delta = 3;
            }
            /* C options.c:620-628 checks duplicates and forbidden negation
             * before optfn_player_selection(:3446-3460) requires a value. */
            const playerSelection = option_state().allopt.find(r => r.name === 'player_selection');
            if (menuname.length >= playerSelection.minmatch && playerSelection.name.startsWith(menuname)) {
                compoundDuplicate(playerSelection.name);
                if (menunegated) {
                    config_error_add('The %s option may not both have a value and be negated.', playerSelection.name);
                    continue;
                }
                const psv = menuval;
                if (!psv)
                    config_error_add("Missing parameter for '%s'", menuopts);
                else if (/^dialog/i.test(psv))
                    result.iflags.wc_player_selection = 0; // VIA_DIALOG
                else if (/^prompt/i.test(psv))
                    result.iflags.wc_player_selection = 1; // VIA_PROMPTS
                else
                    config_error_add("Unknown %s parameter '%s'", 'player_selection', psv);
                continue;
            }
            /* C options.c:620-628 dup check then bad_negation; align_*(:933-999),
             * windowborders(:4807), scores(:3679-3733) do_set arms. */
            const dupName = ['align_message', 'align_status', 'windowborders', 'scores'].find(n => menuname.length >= 6 && n.startsWith(menuname));
            if (dupName) {
                compoundDuplicate(dupName);
                const dval = menusep < 0 ? '' : menuopts.slice(menusep + 1);
                if (menunegated && (dupName === 'scores' || dupName === 'align_status' || dupName === 'align_message' || (dupName === 'windowborders' && dval)))
                    config_error_add('The %s option may not both have a value and be negated.', dupName);
                else if (dupName === 'windowborders') {
                    if (!dval && !menunegated) config_error_add("Missing parameter for '%s'", menuopts);
                    else if (!menunegated && (parseInt(dval, 10) || 0) > 4 || (parseInt(dval, 10) || 0) < 0)
                        config_error_add('Invalid %s (should be within 0 to 4): %s', dupName, menuopts);
                } else if (!menunegated && dupName !== 'scores' && dval
                           && !/^(left|top|right|bottom)/i.test(dval))
                    config_error_add("Unknown %s parameter '%s'", dupName, dval);
                else if (dupName === 'scores' && !menunegated) {
                    if (!dval) config_error_add("Missing parameter for '%s'", menuopts);
                    const fl = result.flags;
                    if (dval) { fl.end_top = fl.end_around = 0; fl.end_own = false; }
                    for (let op = dval; op;) {
                        const sneg = op[0] === '!' || /^no/i.test(op);
                        if (sneg) op = op.slice(op[0] === '!' ? 1 : (op[2] !== '-' ? 2 : 3));
                        const sm = /^\d+/.exec(op), inum = sm ? parseInt(sm[0], 10) : 1;
                        op = op.replace(/^\d+/, '').replace(/^ +/, '');
                        const sk = (op[0] || '').toLowerCase();
                        if (sk === 't') fl.end_top = sneg ? 0 : inum;
                        else if (sk === 'a') fl.end_around = sneg ? 0 : inum;
                        else if (sk === 'o') fl.end_own = !(sneg || !inum);
                        else if (sk === 'n') { fl.end_top = fl.end_around = 0; fl.end_own = false; }
                        /* C options.c:3719-3726: '-' followed by a digit is the
                         * negative-value error, else FALLTHROUGH to Unknown. */
                        if (sk === '-' && /^\d/.test(op[1] || '')) {
                            config_error_add('Values for %s:top and %s:around must not be negative', dupName, dupName);
                            break;
                        }
                        if (!/^[taon]/i.test(op[0] || '')) { config_error_add("Unknown %s parameter '%s'", dupName, op); break; }
                        op = op.replace(/^[@-Za-z]+/, '').replace(/^ +/, '').replace(/^\//, '');
                    }
                }
                continue;
            }
            if (/^font_(map|menu|message|status|text|size_(map|menu|message|status|text))$/.test(menuname)) {
                const fsize = menuname.startsWith('font_size_');
                const fval = menusep < 0 ? '' : menuopts.slice(menusep + 1);
                if (fsize) compoundDuplicate(menuname); // C :5079 complain_about_duplicate
                if (!fval && !(fsize && menunegated)) {
                    config_error_add("Missing parameter for '%s'", menuopts);
                    if (menunegated && !fsize)
                        config_error_add('The %s option may not %sbe negated.', menuname, 'both have a value and ');
                }
                continue;
            }
            /* C options.c:2396-2427 optfn_mouse_support(do_set): a value that
             * is not 0..2 is config_error_add("Illegal %s parameter '%s'") +
             * optn_err.  parseoptions() adds no suffix line for it (pfx_match is
             * FALSE), so the error stands alone.  atoi() semantics: a non-numeric
             * value reads as 0 and is only legal when it starts with '0'. */
            if (menuname.length >= 5 && 'mouse_support'.startsWith(menuname)
                && !menunegated && menusep >= 0 && menuopts.slice(menusep + 1).trim()) {
                const msop = menuopts.slice(menusep + 1).trim();
                const msmode = parseInt(msop, 10) || 0;
                if (msmode < 0 || msmode > 2 || (msmode === 0 && msop[0] !== '0')) {
                    config_error_add("Illegal %s parameter '%s'", 'mouse_support', msop);
                    continue;
                }
                game.iflags.wc_mouse_support = msmode;
            }
            /* C options.c:620-623 parseoptions(): duplicate_opt_detection()
             * (options.c:6782, during the rc file only) bumps allopt[].dupdetected;
             * a repeat on a non-dupeok option is complain_about_duplicate()
             * (options.c:6790).  No boolean has dupeok (optlist.h NHOPTB). */
            const boolRow = menuname.length >= 3
                ? ALLOPT.find(r => r[1] === 'B' && r[0].toLowerCase().startsWith(menuname)) : null;
            if (boolRow) {
                if (bool_dup_seen.has(boolRow[0]))
                    config_error_add(`boolean option specified multiple times: ${boolRow[0]}`);
                bool_dup_seen.add(boolRow[0]);
                if (boolRow[0] === 'timed_delay') {
                    if (menunegated) config_error_add('The timed_delay option may not both have a value and be negated.');
                    continue;
                }
                /* C options.c:5315-5320 optfn_boolean(): no IDLECHECKPOINT
                 * build, so this plines before any window exists (raw_print,
                 * in file order with the config errors). */
                if (boolRow[0] === 'idlecheckpoint') {
                    (game._config_errors ||= []).push({ pline: "There is no underlying support for 'idlecheckpoint' compiled in." });
                    option_state().give_opt_msg = false; /* C options.c:5318 */
                }
            }
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
            /* C options.c:2190 optfn_menu_headings(do_set) + coloratt.c:261
             * color_attr_parse_str: "color&attr" (either order) or one of them. */
            if (menuname.length >= 6 && 'menu_headings'.startsWith(menuname)) {
                const op = menusep < 0 ? '' : menuopts.slice(menusep + 1).trim();
                const ATTRS = { none: 0, bold: 1, dim: 2, italic: 3, underline: 4, blink: 5, inverse: 7, normal: 0, uline: 4, reverse: 7 };
                const attrOf = (t, cmp = false) => {
                    const a = ATTRS[t.trim().toLowerCase().replace(/[ \-_]/g, '')] ?? -1;
                    if (a === -1 && cmp) config_error_add("Unknown text attribute '%s'", t.trim());
                    return a;
                };
                const clrOf = (t, sup = false) => {
                    const c = match_str2clr(t, true);
                    if (c >= 16 && !sup) config_error_add("Unknown color '%s'", t.trim());
                    return c;
                };
                if (!op) {
                    result.iflags.menu_headings = { color: 8 /* NO_COLOR */, attr: menunegated ? 0 : 7 };
                } else if (menunegated) {
                    config_error_add('The %s option may not both have a value and be negated.', 'menu_headings');
                } else {
                    let c = 8, a = 0, ok = true;
                    const amp = op.indexOf('&');
                    if (amp >= 0) {
                        const l = op.slice(0, amp), r = op.slice(amp + 1);
                        c = clrOf(l, false); a = attrOf(r, true);
                        if (c >= 16 && a === -1) { c = clrOf(r, false); a = attrOf(l, true); }
                        ok = !(c >= 16 || a === -1);
                    } else {
                        const t = attrOf(op, false);
                        if (t === -1) { c = clrOf(op, false); ok = c < 16; }
                        else a = t;
                    }
                    if (ok) result.iflags.menu_headings = { color: c, attr: a };
                }
                continue;
            }
            // C options.c:2299-2308: atoi, accept only menuinvertmode 0..2.
            if (menuname.length >= 5 && 'menuinvertmode'.startsWith(menuname)) {
                const op = menusep < 0 ? '' : menuopts.slice(menusep + 1).trim();
                const mode = parseInt(op, 10) || 0;
                if (op && (mode < 0 || mode > 2))
                    config_error_add(`Illegal menuinvertmode parameter '${op}'`);
                else if (op) result.iflags.menuinvertmode = mode;
                continue;
            }
            /* C options.c:2225 optfn_menu_objsyms(do_set) + set_menuobjsyms_flags
             * (options.c:7446): menuobjsyms, menu_head_objsym = bit 0,
             * use_menu_glyphs = bits 1 or 2 (options.c:7450). */
            if (menuname.length >= 7 && 'menu_objsyms'.startsWith(menuname)) {
                const OBJSYM_NAMES = ['none', 'headers', 'entries', 'both', 'conditional', 'one-or-other'];
                const op = menusep < 0 ? '' : menuopts.slice(menusep + 1).trim();
                let osyms;
                if (menunegated) osyms = 0;
                else if (!op) osyms = 1;
                else if (/^\d/.test(op)) {
                    osyms = parseInt(op, 10);
                    if (osyms >= OBJSYM_NAMES.length) {
                        config_error_add(`Illegal menu_objsyms parameter '${op}'`);
                        continue;
                    }
                } else {
                    osyms = 0;
                    const k = op.length;
                    for (let i = 0; i < OBJSYM_NAMES.length; i++) {
                        const l = k >= 4 ? k : OBJSYM_NAMES[i].length;
                        if (OBJSYM_NAMES[i].slice(0, l).toLowerCase() === op.slice(0, l).toLowerCase()
                            || (i === 5 && 'one-or-the-other'.slice(0, l).toLowerCase() === op.slice(0, l).toLowerCase())) {
                            osyms = i;
                            break;
                        }
                    }
                }
                result.iflags.menuobjsyms = osyms;
                result.iflags.menu_head_objsym = (osyms & 1) !== 0;
                result.iflags.use_menu_glyphs = (osyms & (2 | 4)) !== 0;
                continue;
            }
            // determine_ambiguities(): "sup" uniquely identifies suppress_alert.
            if (menuname.length >= 3 && 'suppress_alert'.startsWith(menuname)) {
                optfn_suppress_alert_set(result.flags,
                    menusep < 0 ? '' : menuopts.slice(menusep + 1).trim(), menunegated);
                continue;
            }
            if (menuname.length >= 3 && 'packorder'.startsWith(menuname)) {
                if (packorder_seen) config_error_add('compound option specified multiple times: packorder');
                packorder_seen = true;
                if (menunegated) {
                    config_error_add('The packorder option may not both have a value and be negated.');
                    continue;
                }
                const val = menusep < 0 ? '' : menuopts.slice(menusep + 1);
                if (!val) continue; // options.c:2678: empty_optstr leaves the order unchanged.
                // C options.c:7466 change_inv_order: keep good entries, then omissions.
                const previous = result.flags.inv_order;
                const order = val.includes('$') ? [] : [12];
                for (let i = 0; i < val.length; i++) {
                    const ch = val[i], oc = def_char_to_objclass(ch.charCodeAt(0));
                    if (oc === MAXOCLASSES)
                        config_error_add("Not an object class '%c'", ch.charCodeAt(0));
                    else if (!previous.includes(oc))
                        config_error_add("Object class '%c' not allowed", ch.charCodeAt(0));
                    else if (val.includes(ch, i + 1))
                        config_error_add("Duplicate object class '%c'", ch.charCodeAt(0));
                    else order.push(oc);
                }
                result.flags.inv_order = order.concat(previous.filter(oc => !order.includes(oc)));
                continue;
            }
            if (menuname.length >= 5 && 'sortdiscoveries'.startsWith(menuname)
                && optfn_sortdiscoveries_set(menusep < 0 ? '' : menuopts.slice(menusep + 1).trim(), menunegated, result.flags))
                continue;
            let negated = trimmed.startsWith('!');
            let stripped = negated ? trimmed.slice(1) : trimmed;
            // C options.c:5192-5244 optfn_boolean: parameters select the
            // boolean value; storage still uses the option's native address.
            if (boolRow && getBooleanStorage().has(boolRow[0].toLowerCase())) {
                if (getBooleanStorage().get(boolRow[0].toLowerCase()).wizNoFuz)
                    continue;
                negated = menunegated;
                stripped = boolRow[0];
                const op = menuval.toLowerCase();
                if (op) {
                    if (negated) {
                        config_error_add("Negated boolean '%s' should not have a parameter", boolRow[0]);
                        continue;
                    }
                    const numeric = /^\d/.test(op) ? parseInt(op, 10) : NaN;
                    if ('true'.startsWith(op) || 'yes'.startsWith(op)
                        || op === 'on' || numeric === 1)
                        negated = false;
                    else if ('false'.startsWith(op) || 'no'.startsWith(op)
                        || op === 'off' || numeric === 0)
                        negated = true;
                    else if (boolRow[0] !== 'menucolors') { // its valok is Yes
                        config_error_add("'%s' is not valid for a boolean", menuopts);
                        continue;
                    }
                }
            }
            const colonIdx = stripped.search(/[:=]/);
            if (colonIdx >= 0) {
                const key = stripped.slice(0, colonIdx).trim().toLowerCase();
                const val = stripped.slice(colonIdx + 1).trim();
                if (key === 'name')
                    result.name = val;
                else if (key === 'role' || key === 'race' || key === 'gender' || key === 'align') {
                    /* C options.c optfn_role/race/gender/alignment: a name
                     * str2xxx() cannot resolve is "Unknown %s '%s'" and is
                     * not stored (a leading '!' is the exclusion form). */
                    const str2 = { role: str2role, race: str2race,
                                   gender: str2gend, align: str2align }[key];
                    if (val[0] === '!') {
                        const rf = roleGlobals.rfilter;
                        if (key === 'role') rf.roles.fill(false);
                        else rf.mask &= ~(key === 'race' ? ROLE_RACEMASK : ROLE_GENDMASK);
                        for (const tok of val.split(/\s+/)) {
                            const nm = tok.replace(/^!+/, '');
                            if (nm && !setrolefilter(nm))
                                config_error_add("Invalid %s '%s'", key, nm);
                        }
                        result[key] = val;
                    } else if (str2(val) === ROLE_NONE) {
                        config_error_add("Unknown %s '%s'",
                                         key, val);
                    } else {
                        result[key] = val;
                    }
                }
                else if (key === 'playmode') {
                    // C options.c:3479-3504 optfn_playmode: aliases and
                    // case-insensitive prefixes select mutually exclusive modes.
                    const duplicate = compoundSeen.has(key);
                    compoundDuplicate(key);
                    if (negated) {
                        config_error_add('The playmode option may not both have a value and be negated.');
                        continue;
                    }
                    if (duplicate || !val) continue;
                    const mode = val.toLowerCase();
                    if (mode.startsWith('normal') || mode === 'play') {
                        result.flags.debug = result.flags.explore = false;
                    } else if (mode.startsWith('explor') || mode.startsWith('discov')) {
                        result.flags.debug = false;
                        result.flags.explore = true;
                    } else if (mode.startsWith('debug') || mode.startsWith('wizard')) {
                        result.flags.debug = true;
                        result.flags.explore = false;
                    } else {
                        config_error_add('Invalid value for "%s":%s', key, val);
                    }
                }
                else if (key === 'pettype' || key === 'pet') {
                    result.flags.pettype = val;
                    /* optfn_pettype do_set (options.c:3207-3227): first letter */
                    switch (String(val || '').charAt(0).toLowerCase()) {
                    case 'd': result.preferred_pet = 'd'; break;
                    case 'c': case 'f': result.preferred_pet = 'c'; break;
                    case 'h': case 'q': result.preferred_pet = 'h'; break;
                    case 'n': result.preferred_pet = 'n'; break;
                    case 'r': case '*': result.preferred_pet = '\0'; break;
                    default: config_error_add("Unrecognized pet type '%s'.", val); break;
                    }
                }
                /* C options.c optfn_roguesymset -> load_symset(ROGUESET): the Rogue
                 * IBM sets (dat/symbols "Handling: IBM", "Color: Yes") are the only
                 * ones HAS_ROGUE_IBM_GRAPHICS (display.c:2582) accepts. */
                else if (key === 'roguesymset') {
                    /* options.c:3558-3563 optfn_roguesymset: read_sym_file(ROGUESET)
                     * fails for a name dat/symbols does not define — unless it is
                     * "Default symbols" (fuzzymatch " -_") or "default", which
                     * files.c:2653-2657 clears and reports as success. */
                    const entry = symset_in_file(val);
                    const defsyms = fuzzymatch(String(val), 'Default symbols', ' -_', true)
                        || String(val).toLowerCase() === 'default';
                    if (val && !entry && !defsyms) {
                        config_error_add('Unable to load symbol set "%s" from "%s"', val, 'symbols');
                        continue;
                    }
                    if (val && gs.symset && gs.symset[1]) {
                        /* files.c:2657 clear_symsetentry(ROGUESET, TRUE) nulls the
                         * accepted default-ish name instead of recording it. */
                        gs.symset[1].name = (!entry && defsyms) ? null : val;
                        gs.symset[1].handling = entry ? entry[1] : 0;
                    }
                    /* options.c:3565-3566: an accepted roguesymset leaves
                     * go.opt_need_redraw set until a later toggle() docrt()s. */
                    if (val) result.opt_need_redraw = true;
                }
                /* C options.c:1815-1838 optfn_glyph do_set: mungspaces, then
                 * glyphrep_to_custom_map_entries files the G_ customization. */
                else if (key === 'glyph') {
                    if (!negated && val)
                        glyphrep_to_custom_map_entries(val.replace(/\s+/g, ' ').trim(), { value: 0 });
                }
                else if (key === 'symset') {
                    /* C options.c:4181-4190 optfn_symset: the line names the set as
                     * soon as it is parsed (so a later SYMBOLS=G_x:...color finds a
                     * named symset, glyphs.c:to_custom_symset_entry_callback), then
                     * read_sym_file() validates it.  A name dat/symbols does not
                     * define — and that is not "Default symbols" (fuzzymatch " -_")
                     * or "default" (files.c:2653-2657) — fails the load and is a
                     * config error. */
                    if (val
                        && !SYMSET_LIST.some(e => e[0].toLowerCase() === val.toLowerCase())
                        && !symset_defined_in_file(String(val))
                        /* dat/symbols also defines MACgraphics (H_MAC); only the
                         * do_symset() pick-list (SYMSET_LIST) hides it off-Mac. */
                        /* dat/symbols:778 defines MACgraphics (Handling: MAC); only
                         * the 'O' picker skips it (symbols.c:942), read_sym_file loads it. */
                        && val.toLowerCase() !== 'macgraphics'
                        && !symset_in_file(val)
                        /* dat/symbols defines MACgraphics (Handling: MAC); only the
                         * do_symset() pick-list hides it off-Mac (symbols.c:943). */
                        && String(val).toLowerCase() !== 'macgraphics'
                        && !fuzzymatch(String(val), 'Default symbols', ' -_', true)
                        && String(val).toLowerCase() !== 'default') {
                        config_error_add('Unable to load symbol set "%s" from "%s"', val, 'symbols');
                        continue;
                    }
                    result.symset = val;
                    if (val && gs.symset && gs.symset[0]) gs.symset[0].name = val;
                }
                else if (key === 'fruit') {
                    const f = negated ? '' : val.replace(/\s+/g, ' ').trim().slice(0, 31);
                    if (negated || f) result.fruit = f;
                }
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
                {
                    /* C options.c:2475-2493: bare => 'f'; else lowc(*op), s/c/f/r only */
                    const c = val ? val.charAt(0).toLowerCase() : 'f';
                    if ('scfr'.includes(c))
                        result.iflags.prevmsg_window = c;
                    else
                        config_error_add(`Unknown msg_window parameter '${val}'`);
                }
                else if (key === 'msghistory') {
                    if (negated ? !val : !!val)
                        result.iflags.msg_history = negated ? 0 : (parseInt(val, 10) || 0);
                }
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
                else if (key === 'sortloot') {
                    /* C ref: options.c:3943 sortltype[] = none/loot/full;
                     * optfn_sortloot stores the matched entry's first letter
                     * in flags.sortloot (init 'l'). */
                    const sl = ['none', 'loot', 'full'].find(
                        (n) => val && n.startsWith(String(val).toLowerCase()));
                    if (sl) result.flags.sortloot = sl[0];
                }
                else if (key === 'sortvanquished') {
                    if (negated) result.flags.vanq_sortmode = 0;
                    else if (val) {
                        const vi = 'tdaACcnz'.indexOf(val[0]);
                        if (vi >= 0) result.flags.vanq_sortmode = vi;
                        else if ('01234567'.includes(val[0]))
                            result.flags.vanq_sortmode = val.charCodeAt(0) - 48;
                        else config_error_add("Unknown sortvanquished parameter '%s'", val);
                    }
                }
                else if (key === 'pickup_burden') {
                    if (negated)
                        config_error_add('The pickup_burden option may not both have a value and be negated.');
                    else if (!val)
                        config_error_add("Missing parameter for '%s'", menuopts);
                    else {
                        const c = val.charAt(0).toLowerCase();
                        if (c === 'u') result.flags.pickup_burden = 0; /* UNENCUMBERED */
                        else if (c === 'b') result.flags.pickup_burden = 1; /* SLT_ENCUMBER */
                        else if (c === 's') result.flags.pickup_burden = 2; /* MOD_ENCUMBER */
                        else if (c === 'n') result.flags.pickup_burden = 3; /* HVY_ENCUMBER */
                        else if (c === 'o' || c === 't') result.flags.pickup_burden = 4; /* EXT_ENCUMBER */
                        else if (c === 'l') result.flags.pickup_burden = 5; /* OVERLOADED */
                        else config_error_add("Unknown pickup_burden parameter '%s'", val);
                    }
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
                else if (key === 'windowcolors') {
                    if (!val)
                        config_error_add("Missing parameter for '%s'", menuopts);
                    else if (!wc_set_window_colors(val))
                        config_error_add("Could not set %s '%s'", 'windowcolors', val);
                }
                /* C options.c:2396-2425 optfn_mouse_support(do_set), the rc arm:
                 * atoi(op) must be 0..2 (and a zero must be spelled '0'), else
                 * config_error_add("Illegal mouse_support parameter") and
                 * iflags.wc_mouse_support is left unchanged. */
                else if (key === 'mouse_support') {
                    if (!val)
                        result.iflags.wc_mouse_support = negated ? 0 : 1;
                    else {
                        const mode = parseInt(val, 10) || 0;
                        if (mode < 0 || mode > 2 || (mode === 0 && val[0] !== '0'))
                            config_error_add("Illegal %s parameter '%s'", 'mouse_support', val);
                        else
                            result.iflags.wc_mouse_support = mode;
                    }
                }
                else if (key.length >= 4 && 'petattr'.startsWith(key)) {
                    const PETATTRS = { none: 0, normal: 0, bold: 1, dim: 2, italic: 3,
                                       underline: 4, uline: 4, blink: 5, inverse: 7, reverse: 7 };
                    const lv = (val || '').toLowerCase().replace(/[ _-]/g, ''); // C coloratt.c:374-382 fuzzymatch
                    const itmp = negated ? 0
                        : Object.hasOwn(PETATTRS, lv) ? PETATTRS[lv] : -1;
                    if (itmp === -1) config_error_add("Unknown %s parameter '%s'", 'petattr', stripped);
                    if (itmp !== -1) {
                        result.iflags.wc2_petattr = itmp;
                        result.iflags.wc_hilite_pet = itmp !== 0;
                    }
                }
                else if (key === 'paranoid_confirmation' || key === 'paranoid_confirm') {
                    if (negated && val) config_error_add('!%s does not accept a value', 'paranoid_confirmation'); // C :2902
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
                /* optlist.h:268 NHOPTB(deaf) alias "permadeaf" */
                const lname = stripped.toLowerCase() === 'permadeaf' ? 'deaf' : stripped.toLowerCase();
                const value = !negated;
                if (lname.length >= 3 && ('female'.startsWith(lname) || 'male'.startsWith(lname))) {
                    const fem = 'female'.startsWith(lname) ? value : negated;
                    result.flags.female = fem;
                    result.gender = fem ? 'female' : 'male';
                }
                else if (lname === 'autopickup')
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
                    const row = getBooleanStorage().get(lname);
                    /* C options.c:5211 optfn_boolean: go.opt_initial && setwhere ==
                     * set_wiznofuz -> optn_err; debug_hunger/debug_mongen/
                     * debug_overwrite_stairs cannot come from the config file. */
                    if (row?.wizNoFuz) { /* config error, value not stored */ }
                    else if (row?.box === 'flags' || row?.box === 'iflags')
                        result[row.box][row.fld || lname] = value;
                    else if (row?.box === 'a11y')
                        (result.a11y ||= {})[row.fld || lname] = value;
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

/* C options.c:9299. Share the existing RC parser with the in-game editor;
 * state is the pending RC result during startup, and the live game otherwise.
 * The regexp backend is the same one used by pickup.js. */
// C options.c:7889-7900 / sys/share/posixregex.c: regex_error_desc (regerror).
function config_regex_error(e) {
    return regex_error_desc(e);
}
function add_autopickup_exception(mapping, state = game) {
    const m = parse_autopickup_exception(mapping);
    if (m) {
        try {
            regcomp(m.pattern);
            (state.apelist ||= []).unshift(m);
            return 1;
        } catch (e) { config_error_add('regex error in AUTOPICKUP_EXCEPTION: %s', config_regex_error(e)); }
    }
    return 0;
}

/* C options.c:9348: unlink by identity, preserving the newest-first order.
 * ga.apelist is represented by an array by both startup and pickup.js. */
function remove_autopickup_exception(whichape) {
    const apes = game.apelist;
    if (!apes) return;
    const i = apes.indexOf(whichape);
    if (i >= 0) apes.splice(i, 1);
    if (!apes.length) game.apelist = null;
}

/* C options.c:9204: list/remove are omitted for an empty list, but keep
 * their identifiers; exit is preselected and loses to an explicit choice. */
export async function handle_add_list_remove(optname, numtotal, preserveStatus) {
    const menu = new TtyMenu({ overlay: true,
        statusClipCol: preserveStatus ? undefined : 0 });
    const actions = [
        ['a', `add new ${optname}`],
        ['l', `list ${makeplural(optname)}`],
        ['r', `remove existing ${optname}`],
        ['x', 'exit this menu'],
    ];
    for (let i = 0; i < actions.length; ++i) {
        if (!numtotal && (i === 1 || i === 2)) continue;
        menu.add_menu(i + 1, actions[i][0], ATR_NONE, actions[i][1], false, i === 3);
    }
    menu.end_menu('Do what?');
    const { count, picks } = await menu.select_menu(PICK_ONE);
    if (count <= 0) return 3;
    let opt_idx = picks[0] - 1;
    if (count > 1 && opt_idx === 3) opt_idx = picks[1] - 1;
    return opt_idx;
}

/* C options.c:6331: reached from both options menus via
 * optfn_o_autopickup_exceptions(do_handler). No turn and no RNG. */
export async function handler_autopickup_exception(preserveStatus = false) {
    for (;;) {
        const numapes = game.apelist?.length || 0;
        const opt_idx = await handle_add_list_remove('autopickup exception', numapes,
            preserveStatus);
        if (opt_idx === 3) return 1;
        if (opt_idx === 0) {
            game._status_blanked = !preserveStatus;
            const pattern = mungspaces(await getlin('What new autopickup exception pattern?'));
            game._status_blanked = false;
            if (pattern[0] === '\x1b') return 1;
            // apebuf is 2 + BUFSZ; getlin starts at byte 1 and byte 256 is NUL.
            if (pattern) {
                /* interactive 'O': config_erradd plines each error at once (cfgfiles.c:1556-1563) */
                const base = (game._config_errors ||= []).length;
                add_autopickup_exception(`"${pattern.slice(0, 255)}"`);
                for (const m of game._config_errors.splice(base)) {
                    if (typeof m !== 'string') continue;
                    await pline('%s%s', m, /[.!?]$/.test(m) ? '' : '.');
                }
                await drainTopline(); /* the menu reopening forces the pending topline's --More-- */
            }
            continue;
        }
        const menu = new TtyMenu({ overlay: true,
            statusClipCol: preserveStatus ? undefined : 0 });
        const apes = [...(game.apelist || [])];
        if (numapes) {
            menu.add_menu_heading("Always pickup '<'; never pickup '>'");
            for (let i = 0; i < apes.length; ++i) {
                const ape = apes[i];
                menu.add_menu(opt_idx === 1 ? 0 : i + 1, 0, ATR_NONE,
                    `"${ape.grab ? '<' : '>'}${ape.pattern}"`);
            }
        }
        menu.end_menu(`${opt_idx === 1 ? 'List of' : 'Remove which'} autopickup exceptions`);
        const { count, picks } = await menu.select_menu(opt_idx === 1 ? PICK_NONE : PICK_ANY);
        if (count > 0)
            for (const pick of picks) remove_autopickup_exception(apes[pick - 1]);
        if (count < 0) return 0; // ESC leaves the editor; ordinary dismissal loops.
    }
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
import { rnd, rn2 } from './rnd.js';
/* C options.c:8194 makesingular(), :8204-8212 OBJ_NAME over the FOOD_CLASS
 * range, :8230-8236 name_to_mon()/ismnum() — fruitadd's user_specified name
 * rewrite reads all four. */
import { makesingular, makeplural, objName, fruit_from_name as fruit_from_name_real } from './objnam.js';
import { name_to_mon } from './mondata.js';
import { ROLE_NONE, gs, ismnum, RUN_TPORT, RUN_LEAP, RUN_STEP, RUN_CRAWL,
    PARANOID_BONES, ROLE_RACEMASK, ROLE_GENDMASK } from './const.js';
import { MKOBJ_OC_CLASS, MKOBJ_SVB_BASES } from './mkobj_data.js';
import { list_vanquished_set_vanq_order } from './cmd.js'; // relocate-fns
import { cmd_from_func, reset_commands, update_rest_on_space } from './cmd.js';
import { visctrl } from './hacklib.js'; // relocate-fns
import { number_pad_value } from './cmd_config.js'; // relocate-fns
import { clr2colorname } from './coloratt.js'; // relocate-fns
import { build_window_screen, menu_search_case, menu_search_docorner } from './com_pager.js'; // relocate-fns
import { PL_FSIZ, ECMD_OK, Is_rogue_level, MENU_COMBINATION, MENU_TRADITIONAL } from './const.js'; // relocate-fns
import { OPTMENUHELP, dlb_file_lines } from './dispfile.js'; // relocate-fns
import { dec_mode, docrt, flush_screen, force_more, new_status_window, newclipping, status_reassess } from './display.js'; // relocate-fns
import { DOSET_COMPOUNDS, DOSET_OTHERS, LONGEST_OPTION_NAME } from './doset_data.js'; // relocate-fns
import { def_oc_syms_chars } from './drawing.js'; // relocate-fns
import { strsubst } from './hacklib.js'; // relocate-fns
import { nhgetch } from './input.js'; // relocate-fns
import { update_inventory } from './invent.js'; // relocate-fns
import { menutype } from './menustyle.js'; // relocate-fns
import { choose_disco_sort } from './o_init.js'; // relocate-fns
import './options_runtime.js'; // relocate-fns
import { drainTopline, query_attr_one, set_cursor } from './optmenu.js';
import { query_color } from './coloratt.js';
import { handler_change_autocompletions, handler_rebind_keys } from './cmd.js';
import { status_hilite_menu } from './botl.js'; // relocate-fns
import { assign_graphics, load_primary_symset_from_file, clear_symsetentry } from './symbols.js'; // relocate-fns
import { classifyTerrain } from './terrain-status.js'; // relocate-fns
import { menu_heading_sgr, menu_heading_text } from './tty_menu.js'; // relocate-fns
import { vision_recalc } from './vision.js'; // relocate-fns
import { ECMD_FAIL, PRIMARYSET, STONE, WC_PERM_INVENT, SYM_BOULDER } from './const.js'; // relocate-fns
import { reglyph_darkroom, reset_glyphmap, use_last_flush_snapshot } from './display.js';
import { bot, check_gold_symbol, reset_status_hilites } from './botl.js'; // relocate-fns
import { reset_customcolors } from './glyphs.js'; // relocate-fns
import { reassign } from './invent.js'; // relocate-fns
import { do_init, do_set, get_cnf_val, get_val, option_value, optn_err, optn_ok, optn_silenterr, set_option_value } from './options_runtime.js'; // relocate-fns
import { parsesymbols, switch_symbols } from './symbols.js'; // relocate-fns
import { classifyTerrain as classify_terrain } from './terrain-status.js'; // relocate-fns
import { bind_key, bind_mousebtn, bind_specialkey } from './cmd.js'; // relocate-fns
import { default_menu_cmd_info, trimspaces } from './cmd_config.js'; // relocate-fns
import { cond_menu, count_status_hilites, match_str2conditionbitmask, parse_cond_option } from './botl.js'; // relocate-fns
import { menu_search_getlin, tty_window_offx } from './com_pager.js'; // relocate-fns
import { pmatchi } from './strutil.js'; // relocate-fns
import { sanitize_name } from './bones.js'; // relocate-fns
import { reset_customsymbols } from './utf8map.js'; // relocate-fns
import { _pad_l, _pad_r } from './pager.js'; // relocate-fns
export { sanitize_name } from './bones.js'; // relocate-fns
export { CONDTESTS, cond_enabled_arr }; // relocate-fns
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
    /* C ref: cmd.c:3687 precedent — the `wizard` global is flags.debug. */
    const wizard = !!(game.flags && game.flags.debug);
    const debug_fuzzer = !!game.iflags.debug_fuzzer;
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

/* C options.c:7329,8194-8249: startup fruitadd also rewrites the user's
 * name and clears made_fruit.  init_objects (allmain.c:783) has not run yet,
 * so svb.bases[FOOD_CLASS] is zero and the food-name scan has no iterations. */
export function init_fruit_chain() {
    const g = game;
    g.pl_fruit = _fruit_name_rewrite(g.pl_fruit || 'slime mold', true);
    (g.flags ||= {}).made_fruit = false;
    /* C options.c:8276-8282 — newfruit(), fid = ++highest_fruit_id (0 -> 1),
     * `f->nextf = gf.ffruit; gf.ffruit = f;` on an empty chain. */
    /* The single rewrite above is C's one makesingular() pass; a second pass
     * would singularize a pronoun-like name twice ("Theirs" -> "Their" -> "Its"). */
    /* The C options.c:8194-8239 rewrite already ran once above; C runs it
     * once per fruitadd, and a second makesingular is not idempotent
     * ("their" -> "its" -> "it"). */
    g.ffruit = { fid: 1, fname: g.pl_fruit, nextf: null };
    /* C options.c:8285 — `if (user_specified) svc.context.current_fruit = f->fid;`
     * and initoptions_finish's call IS the user_specified one (str is literally
     * svp.pl_fruit, which is what C's `str == svp.pl_fruit` test compares). */
    if (!g.svc) g.svc = {};
    if (!g.svc.context) g.svc.context = {};
    g.svc.context.current_fruit = 1;
}

/* C objnam.c:443 fruit_from_name(fname, exact=FALSE, &highest_fid) — the real
 * body (all four arms, including the two makesingular() fallbacks) lives in
 * js/objnam.js; this only adapts its out-parameter to the {f, highest_fid}
 * shape the callers below use. */
function fruit_from_name_options(fname) {
    _ffruit();
    const hf = { value: 0 };
    const f = fruit_from_name_real(fname, false, hf);
    return { f: f || null, highest_fid: hf.value };
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
function _fruit_name_rewrite(nameIn, initial = false) {
    /* C options.c:8194 — nmcpy(svp.pl_fruit, makesingular(str), PL_FSIZ). */
    let plf = makesingular(String(nameIn)).slice(0, PL_FSIZ - 1); /* nmcpy truncation */
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
    for (let i = initial ? NUM_OBJECTS : MKOBJ_SVB_BASES[FOOD_CLASS] | 0;
         i < NUM_OBJECTS && (MKOBJ_OC_CLASS[i] | 0) === FOOD_CLASS; i++) {
        /* initoptions_finish (options.c:7341) renames SLIME_MOLD to "fruit";
         * the collision scan needs OBJ_NAME's runtime name. */
        const on = objName(i);
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
                || ismnum(name_to_mon(plf.slice(7), null).mntmp)))
        || plf === 'empty tin'
        || (plf === 'glob'
            || (globpfx > 0 && plf.slice(globpfx) === 'glob'))
        || ((_endsWith(plf, ' corpse') || _endsWith(plf, ' egg'))
            && ismnum(name_to_mon(plf, null).mntmp))) {
        /* C options.c:8237-8239 — Strcpy(buf, pl_fruit); "candied " + buf. */
        plf = 'candied ' + plf.slice(0, PL_FSIZ - 9); /* nmcpy(pl_fruit + 8, buf, PL_FSIZ - 8) */
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
        altname = sanitize_name(name.split(/[\0\n]/, 1)[0].slice(0, PL_FSIZ - 1));
        if (!g.flags) g.flags = {};
        g.flags.made_fruit = true;
    }

    const { f, highest_fid } = fruit_from_name_options(altname || name);
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
    /* C options.c:1724-1725 — `if (op == empty_optstr) return optn_err;`
     * before any change: an empty answer leaves pl_fruit alone. */
    if (!op)
        return null;
    /* C options.c:1727-1743 — !go.opt_initial. */
    {
        const { f, highest_fid } = fruit_from_name_options(op);
        if (!f) {
            if (!(g.flags && g.flags.made_fruit))
                forig = fruit_from_name_options(g.pl_fruit || 'slime mold').f;
            if (!forig && highest_fid >= 100) {
                /* C: config_error_add("Doing that so many times isn't very
                 * fruitful."); return optn_ok — pl_fruit is NOT changed. */
                return null;
            }
        }
    }
    /* C options.c:1748,6861 — nmcpy stops at comma/NUL and copies at most
     * PL_FSIZ - 1 (31) characters, before sanitizing or defaulting the name. */
    g.pl_fruit = sanitize_name(op.split(/[\0,]/, 1)[0].slice(0, 31));
    if (!g.pl_fruit)
        g.pl_fruit = 'slime mold';
    /* C options.c:1754-1756 — fruitadd(svp.pl_fruit, forig): svp.pl_fruit is
     * the argument, so this is the user_specified call. */
    fruitadd(g.pl_fruit, forig, true);
    /* C options.c:1759: idlecheckpoint can leave give_opt_msg FALSE
     * (5318); the fruit still changes, but no confirmation is printed. */
    if (!option_state().give_opt_msg) return null;
    /* C options.c:1757 — pline("Fruit is now \"%s\".", svp.pl_fruit), read
     * AFTER fruitadd, which may have singularised or "candied "-prefixed it. */
    return `Fruit is now "${g.pl_fruit}".`;
}


function store_status_hilite(op) {
    /* C botl.c:2605-2639 parse_status_hl1(): a space ends one rule and starts
     * the next ("hitpoints/always/red&bold condition/blind/blue"), except in
     * a title's second field; a token without a slash (fldnum 0) is
     * dropped without calling parse_status_hl2(). */
    let tok = '', fldnum = 0;
    const flush = () => {
        if (fldnum >= 1) {
            if (status_fieldname(tok.split('/')[0]) === 'condition')
                (game.status_condition_hilites ||= []).push(tok);
            else
                push_status_field_hilite(tok);
        }
        tok = ''; fldnum = 0;
    };
    for (const c of op) {
        if (c === ' ') {
            if (fldnum === 1 && tok.split('/')[0].toLowerCase() === 'title') { tok += c; continue; }
            flush();
        } else {
            if (c === '/') fldnum++;
            tok += c;
        }
    }
    flush();
}
/* C botl.c:2846-2856 parse_status_hl2(): "characteristics" is parsed again
 * once per field from BL_STR through BL_CH, each with its own rule chain. */
function push_status_field_hilite(op) {
    const parts = op.split('/');
    if (status_fieldname(parts[0]) !== 'characteristics') {
        (game.status_field_hilites ||= []).push(op);
        return;
    }
    for (const f of ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'])
        (game.status_field_hilites ||= []).push([f, ...parts.slice(1)].join('/'));
}

/* C options.c:1861-1876 optfn_hilite_status(do_set) reached from doset()'s
 * getlin path (options.c:8944-8953 -> parseoptions): parse_status_hl1() keeps
 * the rule exactly as the config-file path above does.  Returns the first
 * config_error text (or null) so the caller can pline it. */
export function optfn_hilite_status_set(op) {
    if (!op) return "Value is mandatory for hilite_status";
    const hlerr = hilite_status_config_error(op);
    if (hlerr?.accepted?.includes('/')) store_status_hilite(hlerr.accepted);
    if (hlerr) return hlerr[0].replace('%s', hlerr[1]);
    /* botl.c:2593-2640 parse_status_hl1(): parse_status_hl2() (which stores a
     * rule) only runs for a token with at least one '/'; "1" stores nothing. */
    if (!op.includes('/')) {
        if (!game.iflags.hilite_delta) game.iflags.hilite_delta = 3;
        return null;
    }
    store_status_hilite(op);
    /* botl.c:3099 status_hilite_add_threshold() runs no reset_status_hilites():
     * the tty keeps each field's delivered colour until its value changes. */
    game._statusRulesPending = true;
    if (!game.iflags.hilite_delta) game.iflags.hilite_delta = 3;
    return null;
}

/* C hack.h:722-726 — MSGTYP_NOREP 1, MSGTYP_NOSHOW 2, MSGTYP_STOP 3, and the
 * mask dolook() passes so "You see here" rules don't eat ':' feedback. */
const MSGTYP_VALUE = { norep: 1, hide: 2, stop: 3 };
export const MSGTYP_MASK_REP_SHOW = (1 << 1) | (1 << 2);

export function hide_unhide_msgtypes(hide, hide_mask) {
    for (const tmp of game.msgtypes || []) {
        let mt = (MSGTYP_VALUE[tmp.type] ?? 0) * (tmp.negated ? -1 : 1);
        if (!hide)
            mt = -mt;
        if (mt > 0 && ((1 << mt) & hide_mask))
            tmp.negated = !tmp.negated;
    }
}

const SCREEN_ROWS = 24; /* tty LI */

const SCREEN_COLS = 80; /* tty CO */

const VALUE_COL = 29;   /* visible column where the "[value]" field starts (incl. 1-space margin) */

const HEADER_COL = 33;  /* visible column the reverse-video section header pads to */

function boolStr(on) { return on ? 'X' : ' '; }

function pickupTypesStr() {
    const ocl = oc_to_str(game.flags?.pickup_types);
    return ocl ? ocl : 'all';
}

// The fixed set_in_game menu, grouped by section.  Mirrors the allopt[] order
// projected to {setwhere==set_in_game} (optlist.h).  Each entry:
//   { name, kind, flag?, value?, suffix? }
// suffix is the trailing "  (for autopickup)" note rendered AFTER the [value].
const PAGES = [
    // Page 1: General + Behavior
    [
        { section: 'General' },
        /* C optlist.h:339 NHOPTC(fruit, ...) has has_handler = No, so doset()
         * takes the GENERIC compound-option path: getlin("Set fruit to what?")
         * then parseoptions("fruit:<answer>").  optfn_fruit's do_set
         * (options.c:1715-1767) mungspaces()es the answer and copies it into
         * svp.pl_fruit — which is js/gstate.js game.pl_fruit, the same field
         * objnam.c reads — defaulting back to "slime mold" when it is empty. */
        { name: 'fruit', kind: 'comp', hasHandler: false,
          value: () => game.pl_fruit || 'slime mold',
          set: (v) => {
              const msg = optfn_fruit_set(mungspaces(v));
              if (msg) game._pending_message = msg;
          } },
        { name: 'number_pad', kind: 'sub', value: number_pad_value },
        { name: 'price_quotes', kind: 'bool', flag: 'price_quotes' },
        { section: 'Behavior' },
        { name: 'autodig', kind: 'bool', flag: 'autodig' },
        { name: 'autoopen', kind: 'bool', flag: 'autoopen', defOn: true },
        /* C ref: include/optlist.h:184 — the 'autopickup' boolean's storage IS
         * flags.pickup (`bp` = &flags.pickup); there is no separate flags.autopickup.
         * options.js (nethackrc) and dotogglepickup ('@') both write flags.pickup, so
         * the menu must toggle and display the same field or the three writers
         * disagree and the pickup_types/autopick path reads a flag nobody set. */
        { name: 'autopickup', kind: 'bool', flag: 'pickup' },
        { name: 'autopickup exceptions', kind: 'othr', value: () => `(${(game.apelist || []).length} currently set)` },
        { name: 'autoquiver', kind: 'bool', flag: 'autoquiver' },
        { name: 'autounlock', kind: 'comp', value: autounlockStr },
        { name: 'cmdassist', kind: 'bool', flag: 'cmdassist', defOn: true },
        { name: 'dropped_nopick', kind: 'bool', flag: 'dropped_nopick', defOn: true, suffix: '  (for autopickup)' },
        { name: 'fireassist', kind: 'bool', flag: 'fireassist', defOn: true },
        { name: 'pickup_stolen', kind: 'bool', flag: 'pickup_stolen', defOn: true, suffix: '  (for autopickup)' },
        { name: 'pickup_thrown', kind: 'bool', flag: 'pickup_thrown', defOn: true, suffix: '  (for autopickup)' },
        { name: 'pickup_types', kind: 'sub', value: pickupTypesStr, suffix: '  (for autopickup)' },
        { name: 'pushweapon', kind: 'bool', flag: 'pushweapon' },
    ],
    // Page 2: Map + Status
    [
        { section: 'Map' },
        { name: 'bgcolors', kind: 'bool', flag: 'bgcolors', defOn: true },
        { name: 'color', kind: 'bool', flag: 'color', defOn: true },
        { name: 'customcolors', kind: 'bool', flag: 'customcolors', defOn: true },
        { name: 'customsymbols', kind: 'bool', flag: 'customsymbols', defOn: true },
        { name: 'hilite_pet', kind: 'bool', flag: 'hilite_pet' },
        { name: 'hilite_pile', kind: 'bool', flag: 'hilite_pile' },
        { name: 'showrace', kind: 'bool', flag: 'showrace' },
        { name: 'sparkle', kind: 'bool', flag: 'sparkle', defOn: true },
        /* C options.c:8606-8610: on Rogue levels substitute the rogue
         * option's name, get_val handler, and selected option index. */
        { get name() { return Is_rogue_level(game.u?.uz) ? 'roguesymset' : 'symset'; },
          kind: 'comp',
          value() { return DOSET_COMPOUNDS.find(r => r.name === this.name).val(); } },
        { section: 'Status' },
        { name: 'hitpointbar', kind: 'bool', flag: 'hitpointbar' },
        { name: 'menu colors', kind: 'othr', value: () => `(${(game.menu_colorings || []).length} currently set)` },
        { name: 'showexp', kind: 'bool', flag: 'showexp' },
        { name: 'status condition fields', kind: 'othr', value: () => `(${cond_enabled_count()} currently set)` },
        { name: 'status highlight rules', kind: 'othr', value: () => `(${count_status_hilites()} currently set)` },
        /* C options.c:4067-4105 — statuslines is a generic compound option;
         * selecting it must enter getlin and parse atoi(op), rather than being
         * treated as a read-only menu row.  The tty renderer still has the
         * port's fixed two status rows, but retain the C iflags state and mark
         * the existing status redraw path when the option changes. */
        { name: 'statuslines', kind: 'comp', hasHandler: false,
          value: () => ((game.iflags?.wc2_statuslines ?? 2) < 3 ? '2' : '3'),
          set: async (v) => {
              const text = String(v ?? '');
              /* C atoi(): leading whitespace and an optional sign are accepted;
               * parsing stops at the first non-digit. */
              const match = text.match(/^[\t\n\r\f\v ]*([+-]?\d+)/);
              const n = match ? Number(match[1]) : 0;
              if (n < 2 || n > 3)
                  return `'statuslines:${text}' is invalid; must be 2 or 3.`;
              game.iflags ||= {};
              game.iflags.wc2_statuslines = n;
              if (game.disp) game.disp.botl = 1;
              return null;
          } },
        { name: 'time', kind: 'bool', flag: 'time' },
    ],
];

// flag default-on table (defaults match optlist.h Off/On).  A boolean's
// displayed value is game.flags[flag] if defined, else its default.
let simpleStorage;
function getSimpleStorage() {
    return simpleStorage ??= new Map(DOSET_BOOLS.map((r) => [r.name, r]));
}

function simpleBox(entry) {
    const row = getSimpleStorage().get(entry.name);
    if (!row) return { obj: (game.flags || (game.flags = {})), fld: entry.flag };
    let o = game;
    for (const part of row.box.split('.')) {
        if (!o[part] || typeof o[part] !== 'object') o[part] = {};
        o = o[part];
    }
    return { obj: o, fld: row.fld };
}

function flagOn(entry) {
    const { obj, fld } = simpleBox(entry);
    const v = obj[fld];
    if (v === undefined || v === null) return !!entry.defOn;
    return !!v;
}

// Build the bracketed [value] string for a row (without the brackets).
function valueStr(entry) {
    if (entry.kind === 'bool') return boolStr(flagOn(entry));
    return entry.value();
}

// Emit "<prefix><gap-fill><tail>" reaching the value at `targetCol`.  The tty
// uses a literal-space gap when small (<=4) else a cursor-forward escape.
// `prefixLen` is the VISIBLE length already emitted (margin + label).
function padTo(prefix, prefixLen, targetCol, tail) {
    const gap = targetCol - prefixLen;
    let fill;
    if (gap <= 0) fill = '';
    else if (gap > 4) fill = `\x1b[${gap}C`;
    else fill = ' '.repeat(Math.max(0, gap));
    return prefix + fill + tail;
}

/* C optlist.h — the trailing `desc`/`descr` argument of each NHOPT* row.  doset_simple
 * shows it under the option while gs.simple_options_help is set (options.c:8635-8639). */
const OPT_DESCR = {
    fruit: 'name of a fruit you enjoy eating',
    number_pad: 'use the number pad for movement',
    price_quotes: 'display prices you have seen for unidentified objects',
    autodig: 'dig if moving and wielding a digging tool',
    autoopen: 'walking into a door attempts to open it',
    autopickup: 'automatically pick up objects',
    'autopickup exceptions': 'edit autopickup exceptions',
    autoquiver: 'fill empty quiver automatically when firing',
    autounlock: 'action to take when encountering locked door or chest',
    cmdassist: 'give help for errors on direction input',
    dropped_nopick: "don't autopickup dropped items",
    fireassist: 'fire-command tries to be helpful',
    pickup_stolen: 'autopickup stolen items',
    pickup_thrown: 'autopickup thrown items',
    pickup_types: 'types of objects to pick up automatically',
    pushweapon: 'previous weapon goes to secondary slot',
    bgcolors: 'use background color for some map hilighting',
    color: 'use color in map',
    customcolors: 'use custom colors in map',
    customsymbols: 'use custom utf8 symbols in map',
    hilite_pet: 'use highlight for pets',
    hilite_pile: 'highlight piles of items',
    showrace: 'show your character by race rather than role',
    sparkle: 'display sparkly effect when resisting magic',
    symset: 'load a set of display symbols from symbols file',
    hitpointbar: 'show colored bar for hit points',
    'menu colors': 'change colors used in menus',
    showexp: 'show experience points in status line',
    'status condition fields': 'change status condition highlighting',
    'status highlight rules': 'change status line highlighting',
    statuslines: '2 or 3 lines for status display',
    time: 'display game turns in status line',
};

/* C options.c:8566-8574 — "show help" adds this note ahead of the '?' row. */
const HELP_NOTE = " Use command '#optionsfull' to get the complete options list.";

const MENU_PAGE_ROWS = SCREEN_ROWS - 1;   /* tty keeps the last row for "(N of M)" */

function helpOn() { return !!game.simple_options_help; }

function sectionLines(section) {
    // blank line then reverse-video section header padded to HEADER_COL.
    const visible = ' ' + section; // visible text after the SGR start (incl leading space)
    const prefixVisLen = 1 /*margin*/ + visible.length;
    /* headings take iflags.menu_headings (options.c:2197), not a fixed inverse */
    const sgr = menu_heading_sgr();
    const body = ' ' + (sgr.length ? `\x1b[${sgr.join(';')}m` : '') + visible;
    return ['', padTo(body, prefixVisLen, HEADER_COL, sgr.length ? '\x1b[0m' : '')];
}

function entryLine(entry, acc) {
    const label = `${acc} - ${entry.name}`;
    const prefix = ' ' + label;           // 1-space margin + label
    const prefixLen = prefix.length;       // visible length (no escapes here)
    const tail = `[${valueStr(entry)}]` + (entry.suffix || '');
    /* C options.c:8592-8619 adds the fmtstr str through windows.c:1795-1810
     * add_menu(), which runs get_menu_coloring() on the RAW str (name, pad
     * and value all part of the match); wintty.c:1449-1456 then paints the
     * match from char 4 -- past the "a - " selector -- through end of str.
     * menucolor_text() takes the RAW str as matchText; a paint over the pad
     * blanks is unobservable (painted cells are glyphs only). */
    // C fmtstr_tab_doset_simple uses an unpadded name and a literal tab.
    if (game.iflags?.menu_tab_sep)
        return ' ' + label.slice(0, 4)
            + menucolor_text(`${entry.name}\t${tail}`).replace(/\t/g, '\x1b[1C');
    const gap = VALUE_COL - prefixLen;
    const fill = gap <= 0 ? '' : gap > 4 ? `\x1b[${gap}C` : ' '.repeat(gap);
    return ' ' + label.slice(0, 4)
        + menucolor_text(entry.name + fill + tail,
                         entry.name + ' '.repeat(Math.max(0, gap)) + tail);
}

/* C options.c:8566-8639 with gs.simple_options_help set: the flat menu line list
 * (note, "hide help" row, each option followed by "    <descr>" and a blank) cut
 * into tty pages of MENU_PAGE_ROWS lines.  Accelerators restart at 'a' per page
 * (wintty.c:2721), so each page carries its own letter -> entry map. */
function helpPages() {
    const items = [
        { line: ' ' + menu_heading_text('Options') }, { line: '' },
        /* add_menu_str note and the '?' row both go through windows.c add_menu()
         * and are menucolored whole-str; the tty paints the '?' row from char 4
         * (wintty.c:1449-1456), i.e. after the "? - " selector.  HELP_NOTE's
         * leading space is our margin; C's buf starts at "Use". */
        { line: menucolor_text(HELP_NOTE, HELP_NOTE.slice(1)) },
        { line: ' ? - ' + menucolor_text('hide help') },
    ];
    for (const page of PAGES) {
        for (const entry of page) {
            if (entry.section) {
                for (const l of sectionLines(entry.section)) items.push({ line: l });
                continue;
            }
            items.push({ entry });
            /* C options.c:8635: help still uses the original allopt[i].descr. */
            const d = OPT_DESCR[entry.name === 'roguesymset' ? 'symset' : entry.name];
            /* add_menu_str("    <descr>") -- menucolored on the RAW 4-space
             * indent str (windows.c:1803); only the descr glyphs are painted. */
            if (d) { items.push({ line: '\x1b[5C' + menucolor_text(d, `    ${d}`) });
                     items.push({ line: '' }); }
        }
    }
    const pages = [];
    for (let i = 0; i < items.length; i += MENU_PAGE_ROWS) {
        const lines = [];
        const accel = new Map();
        let letter = 'a'.charCodeAt(0);
        for (const it of items.slice(i, i + MENU_PAGE_ROWS)) {
            if (it.entry) {
                const acc = String.fromCharCode(letter++);
                accel.set(acc, it.entry);
                lines.push(entryLine(it.entry, acc));
            } else lines.push(it.line);
        }
        pages.push({ lines, accel });
    }
    return pages;
}

function pageCount() { return helpOn() ? helpPages().length : PAGES.length; }

// Build the rendered text lines for one menu page (no leading 24-row framing).
// Returns array of line strings (each already includes its 1-space left margin).
function buildPageLines(pageIdx) {
    if (helpOn()) {
        const hp = helpPages();
        return [...hp[pageIdx].lines, ` (${pageIdx + 1} of ${hp.length})`];
    }
    const page = PAGES[pageIdx];
    const lines = [];
    // Page 1 carries the title + "? - show help" header rows; page 2 does not.
    if (pageIdx === 0) {
        lines.push(' ' + menu_heading_text('Options'));
        lines.push('');
        /* C options.c:8580-8583 add_menu(..., '?', "show help") -- menucolored
         * on the bare str, painted from char 4 (wintty.c:1449-1456). */
        lines.push(' ? - ' + menucolor_text('show help'));
    }
    let letter = 'a'.charCodeAt(0);
    for (const entry of page) {
        if (entry.section) {
            lines.push(...sectionLines(entry.section));
            continue;
        }
        lines.push(entryLine(entry, String.fromCharCode(letter++)));
    }
    // footer "(N of M)"
    lines.push(` (${pageIdx + 1} of ${PAGES.length})`);
    return lines;
}

// Map a page's selectable letters to their entry objects (skipping sections).
function pageAccelMap(pageIdx) {
    if (helpOn()) return helpPages()[pageIdx].accel;
    const page = PAGES[pageIdx];
    const map = new Map();
    let letter = 'a'.charCodeAt(0);
    for (const entry of page) {
        if (entry.section) continue;
        map.set(String.fromCharCode(letter++), entry);
    }
    return map;
}

/* The rows of a page as the tty last drew them.  `row0Erased` is C's
 * getline.c:213 clear_nhwindow(WIN_MESSAGE) after a MENU_SEARCH: it blanks the
 * WHOLE of screen row 0 — the menu's own reverse-video title on page 1, or the
 * first option row on any later page — and process_menu_window only repaints a
 * page when page_start is reset, so it stays blank until the page changes or
 * select_menu is re-entered. */
function pageFrameRows(pageIdx, row0Erased) {
    const lines = buildPageLines(pageIdx).slice(0, SCREEN_ROWS);
    if (row0Erased && lines.length) lines[0] = '';
    return lines;
}

// Render a full-screen options page into _screen_output (24 rows, col 0).
function renderPage(pageIdx, row0Erased) {
    const lines = pageFrameRows(pageIdx, row0Erased);
    game._screen_output = lines.slice(0, SCREEN_ROWS).join('\n');
    // Cursor: just past the footer line ("(N of M)").  C tty leaves the cursor
    // at the end of the last drawn menu line.  Footer is at row lines.length-1.
    const footerRow = lines.length - 1;
    const footerVis = ` (${pageIdx + 1} of ${pageCount()})`.length;
    set_cursor(footerVis, footerRow);
    game._pending_message = '';
}

// ── pickup_types submenu (choose_classes_menu) ───────────────────────────
// C ref: win/tty choose_classes_menu — an overlay PICK_ANY menu at col 17.
// Rows: one per object class (symbol + 2 spaces + explanation), then a blank,
// then "A - All classes of objects", two note lines, "(end)".  Selecting a
// class (by its accelerator a-o OR by typing the class symbol) toggles a "+".
const PICKUP_CLASSES = [
    { sym: '$', name: 'pile of coins' },
    { sym: '"', name: 'amulet' },
    { sym: ')', name: 'weapon' },
    { sym: '[', name: 'suit or piece of armor' },
    { sym: '%', name: 'piece of food' },
    { sym: '?', name: 'scroll' },
    { sym: '+', name: 'spellbook' },
    { sym: '!', name: 'potion' },
    { sym: '=', name: 'ring' },
    { sym: '/', name: 'wand' },
    { sym: '(', name: 'useful item (pick-axe, key, lamp...)' },
    { sym: '*', name: 'gem or rock' },
    { sym: '`', name: 'boulder or statue' },
    { sym: '0', name: 'iron ball' },
    { sym: '_', name: 'iron chain' },
    { sym: '.', name: 'splash of venom' },
];

function renderPickupSubmenu(marks, bgRows, classes, preserveStatus, titleErased = false) {
    const body = [];
    /* C ref: getline.c:213 clear_nhwindow(WIN_MESSAGE) blanks row 0 after a
     * MENU_SEARCH getlin, and process_menu_window does not repaint the page, so
     * the title stays erased until the menu is re-entered. */
    body.push(titleErased ? null : 'Autopickup what?');
    body.push(null);
    let letter = 'a'.charCodeAt(0);
    for (const c of classes) {
        const acc = String.fromCharCode(letter++);
        const mark = marks.get(c.sym) || '-';
        body.push(`${acc} ${mark} ${c.sym}  ${c.name}`);
    }
    body.push(null);
    /* C ref: windows.c:1717-1723 — the "all classes" row is added with
     * any.a_int == ' ' and MENU_ITEMFLAGS_SKIPINVERT, and is deliberately never
     * preselected, so its mark starts '-' and can only ever become '+'. */
    body.push(`A ${marks.get('A') || '-'}    All classes of objects`);
    body.push('Note: when no choices are selected, "all" is implied.');
    body.push(game.flags?.pickup
        ? "Toggle off 'autopickup' to not pick up anything."
        : "Toggle on 'autopickup' to automatically pick these things up.");
    body.push('(end)');
    /* C ref: wintty.c:1925-1928 — `!iflags.menu_overlay` drops the NHW_MENU to
     * offx 0; `!cw->offx` then clears the whole screen (wintty.c:1407) and every
     * row is written from tty_curs(window, 1, n), i.e. a 1-space left margin.
     * The footer is the single-page morestr "(end) " (wintty.c:2740) and the
     * cursor sits just past it. */
    if (game.iflags?.menu_overlay === false || game.iflags?.menu_overlay === 0) {
        /* C wintty.c:1180-1194,1449-1487: full-screen menus use the same
         * entry attributes and single-character selection updates as overlays. */
        /* wintty.c:1188-1194,1440-1488: full-screen rows use the same entry
         * colors and toggle marks as corner menus; consume the mark sentinel. */
        /* wintty.c:1184-1194 toggles only the marker; consume the same
         * internal toggle/style marker as the overlay renderer below. */
        const fsRows = body.map((t, i) => (t === null ? ''
            : i === 0 ? ` ${menu_heading_text(t)}` : ` ${menucolor_row(t)}`));
        fsRows[fsRows.length - 1] = ' (end) ';
        game._screen_output = fsRows.join('\n');
        set_cursor('(end) '.length + 1, fsRows.length - 1);
        game._pending_message = '';
        return;
    }
    const widest = body.reduce((m, t) => (t && t.length > m ? t.length : m), 0);
    /* C ref: wintty.c:1925-1928 — `!iflags.menu_overlay` drops the menu to
     * offx 0 on a cleared screen (term_clear_screen), content at col 1, with
     * nothing of the map or status left behind. */
    if (game.iflags?.menu_overlay === false || game.iflags?.menu_overlay === 0) {
        game._screen_output = body.map((t, i) => (t === null ? ''
            : i === 0 ? ` ${menu_heading_text(t)}` : ` ${t}`)).join('\n');
        set_cursor('(end)'.length + 2, body.length - 1);
        game._pending_message = '';
        return;
    }
    const col = Math.max(0, SCREEN_COLS - widest - 2);
    /* C ref: wintty.c:1925-1928 — `!iflags.menu_overlay` forces offx 0 and
     * term_clear_screen(): a full-screen menu, content at col 1, nothing of
     * the map or status rows kept behind it. */
    if (game.iflags?.menu_overlay === false || game.iflags?.menu_overlay === 0) {
        const full = body.map((t, i) => (t === null ? ''
            : i === 0 ? ` ${menu_heading_text(t)}` : ` ${t}`));
        game._screen_output = full.join('\n');
        set_cursor('(end) '.length + 1, full.length - 1);
        game._pending_message = '';
        return;
    }
    const pre = `\x1b[${col}C`;
    const lines = body.map((t, i) => (t === null ? ''
        : i === 0 ? `${pre}${menu_heading_text(t)}` : `${pre}${menucolor_row(t)}`));
    if (!bgRows) {
        const winLines = body.map((t, i) => (t === null ? ''
            : i === 0 ? menu_heading_text(t) : menucolor_row(t)));
        game._screen_output = build_window_screen(
            winLines, col, undefined, preserveStatus ? undefined : 0);
        set_cursor(col + '(end)'.length + 1, winLines.length - 1);
        game._pending_message = '';
        game._pickupMenuCorner = { col, rows: winLines.length };
        return;
    }
    const out = lines.slice(0, SCREEN_ROWS);
    for (let r = out.length; r < SCREEN_ROWS; r++) {
        if (bgRows[r] === undefined) break;
        out.push(bgRows[r]);
    }
    game._screen_output = out.join('\n');
    set_cursor(col + '(end)'.length + 1, lines.length - 1);
    game._pending_message = '';
}

async function numberPadSubmenu(preserveStatus = false) {
    const rows = [
        menu_heading_text('Select number_pad mode:'), '',
        'a -  0 (off)', 'b -  1 (on)',
        'c -  2 (on, MSDOS compatible)',
        'd -  3 (on, phone-style digit layout)',
        'e -  4 (on, phone-style layout, MSDOS compatible)',
        "f - -1 (off, 'z' to move upper-left, 'y' to zap wands)",
        '(end)',
    ];
    let idx = -1;
    /* Same overlay contract as handler_msg_window/handler_autounlock: a corner
     * submenu cl_end()s only from its own offx rightward, so the status rows
     * keep whatever the last paint left there.  From doset_simple() the
     * dismissed full-screen Options menu left them blank (bot() never ran);
     * from the doset() pick walk the toggled-option plines just flushed the
     * screen and both status rows are standing (options.c:8909-8959 ->
     * handler_number_pad, options.c:5893-5915). */
    game._screen_output = build_window_screen(rows, 24, undefined,
        preserveStatus ? undefined : 0);
    while (idx < 0) {
        /* C wintty.c:1549-1552: an existing page only restores the footer
         * cursor. MENU_SEARCH's getlin erased the title; do not redraw it. */
        set_cursor(30, 8);
        game._pending_message = '';
        const key = await nhgetch();
        if (key === 27 || key === 10 || key === 13 || key === 32)
            return;
        const ch = String.fromCharCode(key);
        if (ch === ':') {
            /* C wintty.c:1700-1730 MENU_SEARCH on a PICK_ONE menu */
            const frame = game._screen_output.split('\n');
            const entries = rows.slice(2, 8).map((t, i) => ({ str: t, i }));
            let hit = -1;
            const finished = await menu_search_case('ONE', entries,
                () => frame, (e) => { hit = e.i; });
            if (finished) { idx = hit; break; }
            frame[0] = '';
            game._screen_output = menu_search_docorner(frame).join('\n');
            continue;
        }
        idx = 'abcdef'.indexOf(ch);
        if (idx < 0) idx = '012345'.indexOf(ch);
    }
    const modes = [[false, 0], [true, 0], [true, 1], [true, 2], [true, 3], [false, 1]];
    const [on, mode] = modes[idx];
    game.iflags ||= {};
    game.iflags.num_pad_mode = mode;
    game.iflags.num_pad = on;
    reset_commands(false);
}

// Run the pickup_types submenu select loop.  PICK_ANY: class accelerators and
// class symbols toggle selection in place; Enter/space confirm, ESC cancels.
// On confirm, write the selected symbols (in PICKUP_CLASSES order) to
// game.flags.pickup_types.  Consumes NO RNG.
/* wintty.c:3715-3719 docorner() on dismissal: the overlay's rows reach the
 * status rows, so cl_end() erases them from offx until bot() repaints. */
function pickupMenuDismissCorner() {
    const c = game._pickupMenuCorner;
    game._pickupMenuCorner = null;
    if (c) docorner_status_rows(c.col - 1, c.rows + 1);
    /* wintty.c:3715-3719: ymax reaching the status window wrecks the bottom line. */
    if (c && c.rows + 1 >= SCREEN_ROWS - (_threeStatusLines() ? 3 : 2) && game.disp) game.disp.botlx = 1;
    if (c) {
        docorner_status_rows(c.col - 1, c.rows + 1);
        /* wintty.c:3715-3719: select_menu disables bot() during dismissal,
         * leaving the corner's status reset pending for the next paint. */
        if (c.rows + 1 >= (_threeStatusLines() ? 21 : 22))
            game.disp.botlx = true;
    }
}

async function pickupTypesSubmenu(bgRows, preserveStatus = false, prompted = false) {
    const g = game;
    /* C ref: options.c:3330-3352 optfn_pickup_types(do_set) — under
     * menustyle:traditional/combination the value is read with getlin
     * ("New pickup_types: [<inv order> am] (<cur>|all)"), and only an answer
     * starting with 'm' falls through to the choose_classes_menu picker. */
    if (!prompted && (g.flags?.menu_style === MENU_TRADITIONAL || g.flags?.menu_style === MENU_COMBINATION)) {
        const tbuf = oc_to_str(g.flags?.pickup_types);
        const ocl = (g.flags?.inv_order || [12, 5, 2, 3, 7, 9, 10, 8, 4, 11, 6, 13, 14, 15, 16])
            .map((oc) => def_oc_syms_chars[oc]).join('');
        /* The menu window overdrew the status rows; like "Set %s to what?" the
         * getlin repaints only topline + map, so rows 22-23 stay blank. */
        /* The menu window overdrew rows 22-23 and getlin repaints only topline+map
         * (js/display.js _status_blanked; same as the 'Set X to what?' getlin). */
        g._status_blanked = true;
        /* The full-screen Options menu was just dismissed (docrt); bot() has
         * not run, so the physical status rows are blank, not that menu's
         * last page (tty_menu.js _statusBlankAfterDocrt). */
        if (!bgRows && !preserveStatus) g._statusBlankAfterDocrt = true;
        /* The menu window overdrew the status rows; getlin repaints only the
         * topline + map (see the 'Set X to what?' arm; js/display.js _status_blanked). */
        g._status_blanked = true;
        g._status_blanked = !preserveStatus;
        /* tty_dismiss_nhwindow of the full-screen Options menu repaints the MAP
         * only; status rows stay blank until bot() (wintty.c). */
        if (!bgRows && !preserveStatus)
            game._screen_output = build_window_screen([], SCREEN_COLS + 1, undefined, 0);
        /* The dismissed Options window overdrew rows 22-23 and getlin
         * suppresses bot(), so the prompt shows blank status rows (as for
         * doset_simple's no-handler getlin, js/optmenu.js 'Set %s to what?'). */
        g._status_blanked = !preserveStatus;
        const raw = await getlin(`New pickup_types: [${ocl} am] (${tbuf || 'all'})`);
        g._status_blanked = false;
        const wasspace = raw.charAt(0) === ' ';
        let op = mungspaces(raw);
        if (wasspace && !op) { /* spaces remove the old value */ }
        else if (!op || op.charAt(0) === '\x1b') op = tbuf; /* restore */
        else if (op.charAt(0) === 'm') op = null;
        if (op !== null) {
            g.flags = g.flags || {};
            g.flags.pickup_types = parse_pickup_types(op);
            /* options.c:3367-3372 — a bad class symbol sets badopt; the error
             * names `op`, already advanced to the terminating NUL (''). */
            const rest = op.replace(/^ +/, '');
            if (rest.charAt(0) !== 'a' && rest.charAt(0) !== 'A'
                && [...rest].some((ch) => def_char_to_objclass(ch.charCodeAt(0)) === 18
                    || rest.indexOf(ch) !== rest.lastIndexOf(ch))) {
                /* C options.c:3384 -> cfgfiles.c:1560: config_erradd plines
                 * before wait_synch, flushing the status after getlin. */
                await pline("Unknown pickup_types parameter ''.");
                await force_more("Unknown pickup_types parameter ''.");
            }
            return;
        }
    }
    // C options.c:3358 adds venom to the inventory classes only in wizard mode.
    // C options.c:3334,3358 — the class list is oc_to_str(flags.inv_order), so a
    // packorder change reorders this menu; venom is appended last in wizard mode.
    const invOrder = g.flags?.inv_order || [12, 5, 2, 3, 7, 9, 10, 8, 4, 11, 6, 13, 14, 15, 16];
    const bySym = new Map(PICKUP_CLASSES.map(c => [c.sym, c]));
    const classes = [];
    for (const oc of invOrder) {
        const c = bySym.get(def_oc_syms_chars[oc]);
        if (c && c.sym !== '.') classes.push(c);
    }
    if (g.flags?.debug) classes.push(bySym.get('.'));
    /* Seed the working set from the current flag value — C ref: windows.c:1691-1695
     * `if (way && *class_select) if (strchr(class_select, *class_list)) selected =
     * TRUE;`, i.e. choose_classes_menu is handed the CURRENT pickup_types as
     * class_select and preselects those rows.  Preselected rows paint '*'; see
     * renderPickupSubmenu. */
    const cur = new Set(oc_to_str(g.flags?.pickup_types));
    const marks = new Map();
    for (const c of classes) marks.set(c.sym, cur.has(c.sym) ? '*' : '-');
    /* The 'A' row's own selection state, tracked separately because C tracks it
     * as a separate menu item whose a_int is ' ' rather than as a class. */
    let allPicked = false;
    const symByAcc = new Map();
    let letter = 'a'.charCodeAt(0);
    for (const c of classes) symByAcc.set(String.fromCharCode(letter++), c.sym);
    const symSet = new Set(classes.map((c) => c.sym));
    /* C ref: windows.c:1644-1760 choose_classes_menu adds each row as
     * "%c - %s" (wintty.c:2596-2600 tty_add_menu), and the 'A' row last; the
     * MENU_SEARCH ':' case (wintty.c:1700-1730) matches the typed text against
     * those strings and toggles every hit. */
    const mlist = [];
    {
        let acc = 'a'.charCodeAt(0);
        for (const c of classes)
            mlist.push({ str: `${String.fromCharCode(acc++)} - ${c.sym}  ${c.name}`, sym: c.sym });
        mlist.push({ str: 'A - All classes of objects', sym: 'A' });
    }
    let titleErased = false, counting = false, count = 0, reset_count = true;
    while (true) {
        if (reset_count) { counting = false; count = 0; } else reset_count = true;
        // No flush_screen (it would rebuild _screen_output from the map).
        renderPickupSubmenu(marks, bgRows, classes, preserveStatus, titleErased);
        const frame = game._screen_output;
        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        if (ch >= '0' && ch <= '9' && (counting || !symSet.has(ch))) {
            count = count * 10 + (key - 48);
            if (count !== 0) { counting = true; reset_count = false; }
            continue;
        }
        if (key === 27 /* ESC */) {
            if (counting) continue;
            pickupMenuDismissCorner();
            return; // cancel: leave flag unchanged
        }
        if (key === 10 || key === 13 || key === 32 /* Enter / space confirm */) {
            pickupMenuDismissCorner();
            break;
        }
        if (key === 0x3a /* ':' MENU_SEARCH — a menu command, never a selector */) {
            await menu_search_case('ANY', mlist, () => frame.split('\n'), (curr) => {
                if (curr.sym === 'A') {
                    allPicked = !allPicked;
                    marks.set('A', allPicked ? '\x01+' : '\x01-');
                    return;
                }
                if (cur.has(curr.sym)) cur.delete(curr.sym); else cur.add(curr.sym);
                marks.set(curr.sym, cur.has(curr.sym) ? '\x01+' : '\x01-');
            });
            titleErased = true;   /* getline.c:213 blanked row 0; menu not repainted */
            continue;
        }
        if (ch === 'A') {
            /* C ref: windows.c:1746-1753 — 'A' is an ordinary PICK_ANY toggle on
             * a separate menu row; it does NOT select every class row.  Its
             * meaning is applied at COMMIT, where choose_classes_menu scans the
             * picks for the a_int == ' ' entry and collapses the whole result to
             * that one item ("it means 'use a blank list' rather than 'collect
             * every possible choice'"), which optfn_pickup_types then parses as
             * the empty list, i.e. "all".  Selecting every class instead left
             * fifteen '+' marks on screen where C shows fifteen '-' and one, and
             * stored fifteen symbols where C stores none — the two are the same
             * autopickup behaviour but a different menu and a different
             * "[all]" vs "[$\"…]" value on the parent Options page. */
            allPicked = !allPicked;
            marks.set('A', allPicked ? '\x01+' : '\x01-');
            continue;
        }
        if (ch === '.' || ch === '-' || ch === '@') {
            for (const c of classes) {
                const selected = ch === '.' || (ch === '@' && !cur.has(c.sym));
                if (selected === cur.has(c.sym)) continue;
                if (selected) cur.add(c.sym); else cur.delete(c.sym);
                marks.set(c.sym, selected ? '\x01+' : '\x01-');
            }
            continue;
        }
        if (symByAcc.has(ch)) {
            const sym = symByAcc.get(ch);
            if (cur.has(sym)) cur.delete(sym); else cur.add(sym);
            /* set_item_state, not the initial paint: always '+', never '*'. */
            marks.set(sym, cur.has(sym) ? '\x01+' : '\x01-');
            continue;
        }
        if (symSet.has(ch)) {
            // typed the class symbol directly
            if (cur.has(ch)) cur.delete(ch); else cur.add(ch);
            marks.set(ch, cur.has(ch) ? '\x01+' : '\x01-');
            continue;
        }
        // ignore any other key (menu stays displayed)
    }
    /* commit: store in PICKUP_CLASSES order (= C's def_inv_order, options.c:118,
     * which is the order choose_classes_menu was handed its class_list in and so
     * the order it writes class_select back in — windows.c:1745-1746).
     *
     * Stored as a STRING, not the array this used to build: C's
     * flags.pickup_types is a char[] and every reader in this port
     * (js/cmd.js:33727 autopick_testobj, :18248 enlightenment, :28350
     * dotogglepickup, js/doset_data.js:56, pickupTypesStr above) treats it as a
     * character sequence.  Two shapes for one field is what let a reader be
     * written against only one of them; oc_to_str still accepts both so a
     * half-updated caller cannot throw. */
    g.flags = g.flags || {};
    /* C ref: windows.c:1746-1753 — an 'A' pick collapses the result to the empty
     * list before optfn_pickup_types ever sees it. */
    g.flags.pickup_types = allPicked ? ''
        : classes.filter((c) => cur.has(c.sym)).map((c) => c.sym).join('');
}

/* C ref: options.c:3330-3361 optfn_pickup_types(do_handler arm).  Under
 * menustyle traditional/combination the class picker is NOT opened directly:
 * a getlin("New pickup_types: [<inv_order> am] (<current|all>)") is asked first
 * and only an answer starting with 'm' falls into choose_classes_menu.  An
 * answer of only spaces clears the list; empty/ESC restores the old value. */
async function optfn_pickup_types_handler(preserveStatus) {
    const g = game;
    const style = g.flags?.menu_style ?? 2;
    if (style !== 0 /* MENU_TRADITIONAL */ && style !== 1 /* MENU_COMBINATION */) {
        await pickupTypesSubmenu(undefined, preserveStatus);
        return;
    }
    const tbuf = oc_to_str(g.flags?.pickup_types);
    const invOrder = g.flags?.inv_order || [12, 5, 2, 3, 7, 9, 10, 8, 4, 11, 6, 13, 14, 15, 16];
    const ocl = invOrder.map((oc) => def_oc_syms_chars[oc]).join('');
    g._status_blanked = !preserveStatus; /* tty_dismiss of the Options window leaves status rows blank until bot() */
    /* The dismissed Options window overdrew rows 22-23 and getlin suppresses
     * bot(), so the prompt shows blank status rows unless a toggle message
     * already repainted them (same rule as the no-handler getlin below). */
    g._status_blanked = !preserveStatus;
    const abuf = await getlin(`New pickup_types: [${ocl} am] (${tbuf || 'all'})`);
    g._status_blanked = false;
    const wasspace = abuf.charAt(0) === ' ';
    const op = mungspaces(abuf);
    g.flags = g.flags || {};
    if (wasspace && !op) {
        g.flags.pickup_types = '';
    } else if (!op || op.charAt(0) === '\x1b') {
        /* restore: unchanged */
    } else if (op.charAt(0) === 'm') {
        /* C :3354 use_menu = TRUE — the getlin was already asked */
        await pickupTypesSubmenu(undefined, preserveStatus, true);
    } else {
        g.flags.pickup_types = parse_pickup_types(op);
        const trimmed = op.replace(/^ +/, '');
        if (!/^[aA]/.test(trimmed) && g.flags.pickup_types.length !== trimmed.length)
            await pline("Unknown pickup_types parameter ''.");
    }
}

// ── doset_simple() — the 'O' command ──────────────────────────────────────
// C ref: options.c:8707 doset_simple / :8536 doset_simple_menu — the
// user-friendly options menu, titled "Options" and grouped by OptSection.
// GENERALCMD: no turn, no RNG.  Drives the paging/toggle/submenu loop until
// Enter/ESC, then returns (the caller redraws the map).
/* C ref: win/tty/wintty.c:2591-2605 tty_add_menu — a SELECTABLE entry's stored
 * str, which is what MENU_SEARCH's pmatchi() matches against (wintty.c:1714),
 * is `Sprintf(buf, "%c - ", ch ? ch : '?')` followed by the caller's text.
 * doset_simple_menu passes ch == 0 for every OPTION row (options.c:8632-8633),
 * so tty_add_menu stores those as "? - ..." — but tty_end_menu then writes the
 * ASSIGNED accelerator back over the first byte (wintty.c:2721
 * `curr->str[0] = curr->selector = menu_ch`), so what pmatchi actually sees is
 * "<letter> - <text>" with the letter restarting at 'a' on every page.  The
 * help row passes '?' explicitly (options.c:8576-8579), so `!curr->selector`
 * is false for it and it keeps both its selector and its stored "? - ".
 *
 * The row text itself is options.c:8555's fmtstr "%-Ns [%s]", or "%s\t[%s]"
 * when menu_tab_sep is enabled, plus the "  (for autopickup)" note. Keep the
 * stored spaces/tab, not the cursor-forward escapes used by buildPageLines().
 *
 * Entries in add_menu CALL order across every page, because the search walks
 * cw->mlist head-first and is not page-scoped (wintty.c:1716-1729). */
const DOSET_SIMPLE_HELP_ROW = Symbol('doset_simple help row');

function dosetSimpleSearchList() {
    const list = [{ str: helpOn() ? '? - hide help' : '? - show help',
                    entry: DOSET_SIMPLE_HELP_ROW }];
    for (let p = 0; p < pageCount(); p++)
        for (const [letter, entry] of pageAccelMap(p))
            list.push({
                str: dosetRow(`${letter} - `, entry.name, valueStr(entry))
                     + (entry.suffix || ''),
                entry,
            });
    return list;
}

export async function doset_simple() {
    const g = game;
    option_state().give_opt_msg = false; // C options.c:8722; restored at exit.
    g.flags = g.flags || {};
    option_state().give_opt_msg = false; /* C options.c:8722 */
    /* C options.c:8644-8648 doset_simple_menu() clears every pending
     * opt_* request after building the menu, before the first pick, so the
     * startup symset's opt_need_redraw does not reach the first
     * reset_needed_visuals() (check_gold_symbol would flip invis_goldsym). */
    (g.go ||= {});
    g.go.opt_need_redraw = g.go.opt_need_glyph_reset = false;
    g.go.opt_reset_customcolors = g.go.opt_reset_customsymbols = false;
    g.go.opt_update_basic_palette = false;
    let pageIdx = 0;
    /* C ref: getline.c:213 — the MENU_SEARCH getlin's closing
     * clear_nhwindow(WIN_MESSAGE) blanks screen row 0 and the page is not
     * repainted, so it stays blank until the page changes or select_menu is
     * re-entered (both of which redraw from page_start). */
    let titleErased = false;
    /* C wintty.c:1334-1399,1565-1612 counting/count/reset_count: digits build
     * a count and ESC while counting only stops the count. */
    let counting = false, count = 0, reset_count = true;
    /* C options.c:8644-8648 doset_simple_menu() clears the pending-redraw flags
     * before select_menu(), so what startup parsing left set (a config symset)
     * is not acted on by the first reset_needed_visuals() (options.c:8727). */
    g.go ||= {};
    g.go.opt_need_redraw = g.go.opt_need_glyph_reset = g.go.opt_reset_customcolors
        = g.go.opt_reset_customsymbols = g.go.opt_update_basic_palette = false;
    while (true) {
        if (reset_count) { counting = false; count = 0; }
        else reset_count = true;
        await reset_needed_visuals(); // C options.c:8727,9006: paint status between picks.
        await drainTopline();
        // renderPage sets game._screen_output to the menu frame; the nhgetch
        // NOT flush_screen here — flush_screen's _buildScreenOutput would rebuild
        // _screen_output from the map and clobber the menu (the dohelp /
        // dodiscovered full-screen-menu pattern: set _screen_output, then nhgetch).
        /* C wintty.c:1921-1922: a redraw's monster notices are acknowledged
         * before select_menu displays the Options window again. */
        await drainTopline();
        renderPage(pageIdx, titleErased);
        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        if (key >= 48 && key <= 57) {
            count = count * 10 + (key - 48);
            if (count !== 0) { counting = true; reset_count = false; }
            continue;
        }
        if (key === 27 /* ESC */) g._ttyDismissMore = 1; /* getline.c:245-247 */
        if (key === 27 /* ESC */ && counting) continue;
        if (key === 27 /* ESC */) break;
        if (key === 10 || key === 13 /* Enter: exit */) break;
        if (key === 32 /* space: next page (wraps off the end → exit) */) {
            if (pageIdx + 1 < pageCount()) { pageIdx++; titleErased = false; continue; }
            break;
        }
        /* C ref: wintty.c:1606-1610 — MENU_NEXT_PAGE '>' advances a page, and
         * on the last page does NOTHING ("stop '>' doing the same" as ' ' finishing
         * there).  Only ' ' finishes; '>' repaints the same page. */
        if (ch === '>') {
            if (pageIdx + 1 < pageCount()) { pageIdx++; titleErased = false; }
            continue;
        }
        if (ch === '<') {
            if (pageIdx > 0) { pageIdx--; titleErased = false; }
            continue;
        }
        /* C ref: wintty.c:1611-1625 — MENU_FIRST_PAGE '^' / MENU_LAST_PAGE '|'
         * jump to the first / last page and are no-ops already there. */
        if (ch === '^' || ch === '|') {
            const dest = ch === '^' ? 0 : pageCount() - 1;
            if (pageIdx !== dest) { pageIdx = dest; titleErased = false; }
            continue;
        }
        // a letter accelerator on the current page → toggle / submenu.
        const accMap = pageAccelMap(pageIdx);
        let searchPick = null;
        if (!accMap.has(ch) && key === 0x3a /* ':' MENU_SEARCH */) {
            await menu_search_case('ONE', dosetSimpleSearchList(),
                () => pageFrameRows(pageIdx, titleErased),
                (curr) => { searchPick = curr.entry; });
            titleErased = true;
            if (!searchPick) continue;   /* no match: menu stays up, row 0 blank */
            if (searchPick === DOSET_SIMPLE_HELP_ROW) {
                /* C options.c:8657-8659 — k == -2 toggles gs.simple_options_help
                 * and `goto redo_opt_help` rebuilds the menu from page 1. */
                g.simple_options_help = !g.simple_options_help;
                pageIdx = 0; titleErased = false; continue;
            }
        }
        if (accMap.has(ch) || searchPick) {
            const entry = searchPick || accMap.get(ch);
            /* C wintty.c:2794 tty_select_menu dismisses the Options window
             * before options.c:8666 dispatches its selected handler.
             * erase_menu_or_text (:978) docrt()s the map, clearing physical
             * paint that a control-byte symbol cannot overwrite. */
            /* C wintty.c:978-979 flushes docrt's glyphs on dismissal;
             * windows.c:1861 keeps bot() disabled until select_menu returns. */
            const oldBotDisabled = g._bot_disabled;
            g._bot_disabled = true;
            try {
                await docrt();
                await flush_screen(1);
            } finally {
                g._bot_disabled = oldBotDisabled;
            }
            g._status_blanked = entry.kind !== 'bool'; // windows.c:1861: submenu disables bot().
            /* options.c:8661-8664,8727,9006: a boolean is parsed and bot()
             * repaints before the next select_menu acknowledges its notices. */
            if (entry.kind !== 'bool') await drainTopline();
            g._status_blanked = false;
            titleErased = false;   /* a pick ends select_menu; the next one repaints */
            if (entry.kind === 'bool') {
                const { obj, fld } = simpleBox(entry);
                obj[fld] = !flagOn(entry);
                /* C options.c:5414-5416,8727: apply the pending Unicode reset
                 * before doset_simple offers the menu again. */
                if (entry.name === 'customsymbols') {
                    g.go.opt_reset_customsymbols = true;
                    await reset_needed_visuals();
                }
                /* C options.c:5344-5349,5386-5390 optfn_boolean: showscore/showvers/showexp/time/hitpointbar call
                 * status_initialize(REASSESS_ONLY), which sets gu.update_all; botl.c:1575-1577
                 * then zeroes every field's time and chg, dropping the up/down temp hilites. */
                /* C options.c:5331-5350: extra status fields also reassess;
                 * terrainstatus first refreshes the cached terrain type. */
                if (entry.name === 'terrainstatus') classifyTerrain();
                if (['showscore', 'showvers', 'showexp', 'time', 'hitpointbar',
                     'terrainstatus', 'weaponstatus', 'armorstatus'].includes(entry.name)) {
                    delete g._blTemp;
                    status_reassess();
                }
                if (entry.name === 'color') {
                    g.iflags.use_color = !!obj[fld];
                    /* C options.c:8727: reset_needed_visuals redraws before
                     * doset_simple offers the menu again. */
                    g.go ||= {};
                    g.go.opt_need_redraw = g.go.opt_need_glyph_reset = true;
                    await reset_needed_visuals();
                }
                /* C options.c:5376-5385 optfn_boolean: these request a glyph reset and
                 * redraw, which doset_simple()'s reset_needed_visuals() performs
                 * (options.c:8727) before the menu is offered again. */
                if (['wizmgender', 'showrace', 'use_inverse', 'hilite_pile',
                     'ascii_map', 'tiled_map'].includes(entry.name)) {
                    g.go ||= {};
                    g.go.opt_need_redraw = g.go.opt_need_glyph_reset = true;
                    await reset_needed_visuals();
                }
                if (entry.name === 'hilite_pet') {
                    /* C options.c:3109 (optfn_boolean/hilite_pet): petattr
                     * defaults to ATR_INVERSE and opt_need_redraw is set, so
                     * doset_simple()'s reset_needed_visuals() (options.c:8997)
                     * docrt()s the map before the menu is re-offered. */
                    if (g.iflags.wc_hilite_pet && !g.iflags.wc2_petattr)
                        g.iflags.wc2_petattr = 7; /* ATR_INVERSE (wintype.h) */
                    await docrt();
                }
                if (['wizmgender', 'showrace', 'use_inverse', 'hilite_pile',
                     'perm_invent', 'ascii_map', 'tiled_map'].includes(entry.name)) {
                    /* C options.c:5380-5385 optfn_boolean sets opt_need_redraw
                     * and opt_need_glyph_reset; doset_simple() (options.c:8727)
                     * then runs reset_needed_visuals() -> docrt() before the
                     * menu is re-offered, so a later submenu's map background
                     * already shows the new hero glyph. */
                    g.go ||= {};
                    g.go.opt_need_redraw = g.go.opt_need_glyph_reset = true;
                    await reset_needed_visuals();
                }
                pageIdx = 0;
                continue;
            }
            /* C wintty.c:1921-1922: the handler's window also pages notices
             * produced by dismissing the Options menu. */
            await drainTopline();
            if (entry.kind === 'sub') {
                if (entry.name === 'number_pad') await numberPadSubmenu();
                else await pickupTypesSubmenu();
                pageIdx = 0;
                continue;
            }
            if (entry.hasHandler === false && entry.set) {
                g._status_blanked = true;
                const abuf = await getlin(`Set ${entry.name} to what?`);
                g._status_blanked = false;
                /* C: if (abuf[0] == '\033') continue; — cancel applies nothing
                 * and falls through to the menu redraw. */
                if (abuf !== '\x1b') {
                    const result = await entry.set(abuf);
                    /* cfgfiles.c:1560 config_erradd plines the error before
                     * options.c:8958 preference_update recreates status. */
                    /* cfgfiles.c:1557-1564: config_error_add plines and waits
                     * before parseoptions returns to preference_update. */
                    if (result) {
                        await pline(result);
                        await force_more(result);
                    }
                    /* options.c:8956-8958 preference_update -> wintty.c:603 */
                    if (entry.name === 'statuslines') {
                        new_status_window();
                        newclipping();
                    }
                    if (!result && entry.name === 'statuslines') {
                        /* options.c:4095 opt_need_redraw, then doset_simple()'s
                         * reset_needed_visuals() (options.c:8997) */
                        g.go ||= {};
                        g.go.opt_need_redraw = true;
                        await reset_needed_visuals();
                    }
                }
                pageIdx = 0;
                continue;
            }
            if (entry.name === 'symset' || entry.name === 'roguesymset') {
                /* C options.c:6321 handler_symset -> symbols.c:906 do_symset(). */
                await handler_symset(false, entry.name === 'roguesymset');
                g.go.opt_need_redraw = true;
                pageIdx = 0;
                continue;
            }
            if (entry.name === 'autounlock') {
                /* C options.c:8930-8953 -> handler_autounlock (has_handler). */
                await handler_autounlock(false);
                pageIdx = 0;
                continue;
            }
            if (entry.name === 'autopickup exceptions') {
                await handler_autopickup_exception(false);
                pageIdx = 0;
                continue;
            }
            if (entry.name === 'status condition fields') {
                /* C options.c:8664-8666 -> optfn_o_status_cond:8437. */
                await cond_menu();
                pageIdx = 0;
                continue;
            }
            if (entry.name === 'status highlight rules') {
                /* C options.c:8930-8953 -> optfn_o_status_hilites -> botl.c:4498
                 * status_hilite_menu(). */
                await status_hilite_menu(false);
                pageIdx = 0;
                continue;
            }
            if (entry.name === 'menu colors') {
                /* C options.c:8930-8953 -> optfn_o_menu_colors -> handler_menu_colors (6407). */
                await handler_menu_colors(false);
                pageIdx = 0;
                continue;
            }
            // comp/othr options WITH a C handler open their own picker; none of
            // re-render (no RNG, stream stays aligned).
            pageIdx = 0;
            continue;
        }
        /* '?' is the help row's selector, which only exists on page 1
         * (wintty.c process_menu_window matches within the current page).
         * C options.c:8657-8659 toggles gs.simple_options_help and rebuilds. */
        if (ch === '?' && pageIdx === 0) {
            g.simple_options_help = !g.simple_options_help;
            titleErased = false;
            continue;
        }
        /* C ref: wintty.c:1519-1535,1553 + getline.c:230-257 xwaitforspace(resp)
         * -- a key outside resp (this page's selectors, ' ', digits, ESC, \n,
         * \r, mapped_menu_cmds, default_menu_cmds) rings the bell and is
         * re-read INSIDE the wait, so process_menu_window's loop never turns
         * over and a live count survives it ("5s" then ESC only stops the
         * count).  A key inside resp that does nothing here still turns the
         * loop over and drops the count. */
        if (!(ch === '?' && pageIdx === 0)
            && '<>^|,\\~.-@:'.indexOf(ch) < 0
            && (g.mapped_menu_cmds || '').indexOf(ch) < 0)
            reset_count = false;
        // any other key: ignore, menu stays displayed.
    }
    /* C options.c:8724-8731: the do-while runs reset_needed_visuals() after the
     * FINAL doset_simple_menu() too — the ESC/CR/space-past-the-end round.  Its
     * select_menu exit dismissed the Options window inside the gb.bot_disabled
     * span first (wintty.c:2794 -> tty_dismiss_nhwindow:1992 ->
     * erase_menu_or_text:972-974 `docrt(); flush_screen(1);`, windows.c:1859
     * -1863), so the map is already printed and cls/docrt left disp.botlx
     * armed (display.c:2197/1769).  The bare `if (disp.botl || disp.botlx)
     * bot()` of reset_needed_visuals (options.c:9006) then BL_RESET-repaints
     * status row 1 whole over map y=20 (botl.c:1670) with no gnew flush after
     * it — the frame read by the next key shows the status text, not the map
     * print (statuslines:3, ro445 step 268: C "Wizard the Tenderfoot...",
     * ours blank).  The dispatch tail's plain docrt()+flush_screen(1) modeled
     * that exit bot-ENABLED, i.e. with bot() BEFORE the gnew map loop
     * (display.c:2236-2256), so the map print landed on top instead. */
    {
        const oldBotDisabled = g._bot_disabled;
        g._bot_disabled = true;
        try {
            await docrt();
            await flush_screen(1);
        } finally { g._bot_disabled = oldBotDisabled; }
    }
    await reset_needed_visuals(); // C options.c:8727: bare bot() with the dismissal's botlx.
    /* C options.c:8733 — doset_simple ends with give_opt_msg = TRUE, undoing
     * an earlier full doset()'s idlecheckpoint pick (options.c:5318). */
    option_state().give_opt_msg = true;
    /* options.c:8733-8734 leaves notices from the final dismissal standing. */
    /* C: this handler returns ECMD_OK on every path; rhack() maps it. */
    return ECMD_OK;
}

/* C ref: options.c:8757/8821 — choose the padded or tab-separated fmtstr.
 * Store literal tabs here: MENU_SEARCH matches the original menu text. */
function dosetRow(indentOrAccel, name, value) {
    if (game.iflags?.menu_tab_sep)
        return `${indentOrAccel}${name}\t[${value}]`;
    return `${indentOrAccel}${name.padEnd(LONGEST_OPTION_NAME)} [${value}]`;
}

/* Resolve a doset_data `box`.`fld` pair (the C NHOPTB bool_p storage) against
 * the live game, creating the container so a toggle has somewhere to land. */
function boolBox(row) {
    let o = game;
    for (const part of row.box.split('.')) {
        if (!o[part] || typeof o[part] !== 'object') o[part] = {};
        o = o[part];
    }
    return o;
}

function boolValue(row) {
    const v = boolBox(row)[row.fld];
    return (v === undefined || v === null) ? row.init : !!v;
}

/* C options.c:handler_menustyle. The full options menu has been dismissed;
 * retain its status-paint state while the submenu overlays the map. */
export async function handler_menustyle(preserveStatus = false) {
    const old_menu_style = game.flags.menu_style;
    const sep = game.iflags.menu_tab_sep ? '\t' : ' ';
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    for (let i = 0; i < menutype.length; i++) {
        const [name, first, second] = menutype[i];
        m.add_menu(i + 1, name[0], ATR_NONE, name.padEnd(12) + sep + first,
            false, i === old_menu_style);
        m.add_menu_str(' '.repeat(16) + sep + second);
    }
    m.end_menu('Select menustyle:');
    const { count, picks } = await m.select_menu(PICK_ONE);
    if (count > 0) {
        let i = picks[0] - 1;
        if (count > 1 && i === old_menu_style) i = picks[1] - 1;
        game.flags.menu_style = i;
    }
    const chngd = game.flags.menu_style !== old_menu_style;
    if (chngd || game.flags.verbose)
        await pline(`'menustyle' ${chngd ? 'changed to' : 'is still'} "${menutype[game.flags.menu_style][0]}".`);
}

/* C options.c:273 objsymvals[] */
const objsymvals = [
    [0, 'none', "don't show object symbols in menus"],
    [1, 'headers', 'show object symbols in menu header lines'],
    [2, 'entries', 'show object symbols in individual menu entries'],
    [3, 'both', 'show object symbols in headers and menu entries'],
    [4, 'conditional', 'show objsyms in entries if no headers are shown'],
    [5, 'one-or-other', 'show objsyms in header, in entries if no header'],
];

/* C options.c:7446 set_menuobjsyms_flags */
function set_menuobjsyms_flags(newobjsyms) {
    game.iflags.menuobjsyms = newobjsyms;
    game.iflags.menu_head_objsym = (newobjsyms & 1) !== 0;
    game.iflags.use_menu_glyphs = (newobjsyms & (2 | 4)) !== 0;
}

/* C options.c:5796 handler_menu_objsyms (tty). */
export async function handler_menu_objsyms(preserveStatus = false) {
    const sep = game.iflags.menu_tab_sep ? '\t' : ' ';
    const cur = game.iflags.menuobjsyms ?? 4;
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    for (let i = 0; i < objsymvals.length; i++) {
        const [num, nam, descr] = objsymvals[i];
        const buf = nam.slice(0, 12).padEnd(12) + sep + descr.slice(0, 60);
        /* C options.c:5810-5813: ch = '0' + i, gch = *buf (the row's first
         * char, i.e. objsymvals[i].nam[0]) — 'n'/'h'/'e'/'b'/'c'/'o' are the
         * group accelerators, so 'h' picks "headers" through wintty.c:1739-1748
         * group_accel and finishes this PICK_ONE menu. */
        m.add_menu(i + 1, String(i), ATR_NONE, buf, false, num === cur, buf[0]);
    }
    m.end_menu('Set object symbols in menus to what?');
    const { count, picks } = await m.select_menu(PICK_ONE);
    if (count > 0) {
        let i = picks[0] - 1;
        if (count > 1 && i === cur) i = picks[1] - 1;
        set_menuobjsyms_flags(i);
    }
}

/* C options.c:5779 handler_menu_headings + coloratt.c:304 query_color_attr. */
export async function handler_menu_headings(preserveStatus = false) {
    const mh = game.iflags.menu_headings ||= { color: 8, attr: 7 };
    const prompt = 'How to highlight menu headings:';
    const c = await query_color(prompt, mh.color, preserveStatus);
    if (c === -1) return;
    const a = await query_attr_one(prompt, mh.attr, true);
    if (a === -1) return;
    mh.color = c;
    mh.attr = a;
}

/* C botl.c:781-815 conditions[].ranking and botl.c:817-848 condtests[]
 * (useroption, enabled default), in condtests order. */
const CONDTESTS = [
    ['barehanded', 20, false], ['blind', 10, true], ['busy', 20, false], ['conf', 10, true],
    ['deaf', 10, true], ['iron', 15, true], ['fly', 10, true], ['foodPois', 6, true],
    ['glowhands', 20, false], ['grab', 2, true], ['hallucinat', 10, true], ['held', 20, false],
    ['ice', 20, false], ['lava', 8, true], ['levitate', 10, true], ['paralyzed', 20, false],
    ['ride', 10, true], ['sleep', 20, false], ['slime', 6, true], ['slip', 20, false],
    ['stone', 6, true], ['strngl', 4, true], ['stun', 10, true], ['submerged', 15, false],
    ['termIll', 6, true], ['tethered', 20, false], ['trap', 20, false], ['unconscious', 20, false],
    ['woundedlegs', 20, false], ['holding', 20, false],
];

function cond_enabled_arr() {
    if (!game._condEnabled) game._condEnabled = CONDTESTS.map(c => game.flags?.['cond_' + c[0]] ?? c[2]);
    return game._condEnabled;
}

export function cond_enabled_count() { return cond_enabled_arr().filter(Boolean).length; }



/* C options.c:7701 query_msgtype: ids are msgtyp + 1 (show, hide, stop, norep). */
const MSGTYPE_DESCR = [['show', 'Show message normally'], ['hide', 'Hide message'],
    ['stop', 'Prompt for more after the message'], ['norep', 'Do not repeat the message']];

async function query_msgtype(preserveStatus) {
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    MSGTYPE_DESCR.forEach(([, d], i) => m.add_menu(i + 1, 0, ATR_NONE, d, false, false));
    m.end_menu('How to show the message');
    const { count, picks } = await m.select_menu(PICK_ONE);
    return count > 0 ? picks[0] - 1 : -1;
}

/* C options.c:6502 handler_msgtype. */
export async function handler_msgtype(preserveStatus = false) {
    for (;;) {
        const rules = game.msgtypes ||= [];
        const opt_idx = await handle_add_list_remove('message type', rules.length, preserveStatus);
        if (opt_idx === 3) return;
        if (opt_idx === 0) {
            game._status_blanked = !preserveStatus;
            const mtbuf = mungspaces(await getlin('What new message pattern?'));
            game._status_blanked = false;
            if (mtbuf[0] === '\x1b') return;
            let re = null;
            if (mtbuf) {
                try { re = regcomp(mtbuf); } catch (e) {
                    /* C options.c:7871 test_regex_pattern -> config_erradd (cfgfiles.c:1557-1563):
                       interactive 'O' reports the regcomp error via pline + wait_synch. */
                    const desc = regex_error_desc(e);
                    /* pline.c:273-274: vpline's flush_screen(1) runs bot() for the
                       botlx the Options menu's docrt() left pending (display.c:1769,
                       display.c:2236), so the --More-- shows the status rows. */
                    game._statusBlankAfterDocrt = false;
                    game.disp.botlx = 1;
                    await flush_screen(1);
                    await force_more(`MSGTYPE regex: ${desc}.`);
                    preserveStatus = true; /* wait_synch -> flush_screen -> bot() repainted the status rows */
                    re = null;
                }
            }
            if (re) {
                const mttyp = await query_msgtype(true);
                if (mttyp !== -1)
                    rules.unshift({ type: MSGTYPE_DESCR[mttyp][0], regex: re, pattern: mtbuf });
            }
            continue;
        }
        const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
        rules.forEach((r, i) => {
            const pat = r.pattern ?? r.regex.source;
            const ln = 255 - (r.type.padEnd(5).length + 2) - 1;
            m.add_menu(i + 1, 0, ATR_NONE, `${r.type.padEnd(5)} "${pat.length > ln ? pat.slice(0, ln - 3) + '..."' : pat + '"'}`, false, false);
        });
        m.end_menu(opt_idx === 1 ? 'List of message types' : 'Remove which message types');
        const { count, picks } = await m.select_menu(opt_idx === 1 ? PICK_NONE : PICK_ANY);
        if (count > 0) {
            for (let k = 0; k < count; k++) rules.splice(picks[k] - 1 - k, 1);
        }
        if (count < 0) return;
    }
}

/* C options.c:6407 handler_menu_colors.  Add and exit are ported; the list /
 * remove arms (opt_idx 1, 2) need the menucolor list menus and are not. */
export async function handler_menu_colors(preserveStatus = false) {
    for (;;) {
        const nmc = (game.menu_colorings || []).length;
        const opt_idx = await handle_add_list_remove('menucolor', nmc, preserveStatus);
        if (opt_idx === 3) break;
        if (opt_idx !== 0) {
            /* C options.c:6448-6497 list (1) / remove (2) */
            const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
            (game.menu_colorings || []).forEach((tmp, i) => {
                const sattr = attr2attrname(tmp.attr);
                const sclr = clr2colorname(tmp.color).replace(/ /g, '-');
                const buf = `""=${sclr}${tmp.attr !== 0 ? '&' + sattr : ''}`;
                const ln = 256 - buf.length - 1;
                const o = tmp.origstr ?? tmp.match.source;
                const mcbuf = '"' + (o.length > ln ? o.slice(0, ln - 3) + '...' : o) + buf.slice(1);
                m.add_menu(i + 1, 0, ATR_NONE, mcbuf, false, false);
            });
            m.end_menu(opt_idx === 1 ? 'List of menu colors' : 'Remove which menu colors');
            const { count, picks } = await m.select_menu(opt_idx === 1 ? PICK_NONE : PICK_ANY);
            if (count > 0) {
                for (let k = 0; k < count; k++) game.menu_colorings.splice(picks[k] - 1 - k, 1);
            }
            if (count < 0) return optn_ok;
            continue;
        }
        game._status_blanked = !preserveStatus;
        const mcbuf = await getlin('What new menucolor pattern?');
        game._status_blanked = false;
        if (mcbuf[0] === '\x1b') break;
        if (!mcbuf) continue;
        let re;
        try { re = regcomp(mcbuf); } catch (e) {
            game._statusBlankAfterDocrt = false;
            game.disp.botlx = 1;
            await flush_screen(1);
            await force_more(`MENUCOLORS regex: ${regex_error_desc(e)}.`);
            preserveStatus = true;
            continue;
        }
        const mcclr = await query_color(null, 8, true);
        if (mcclr === -1) continue;
        const mcattr = await query_attr_one(null, 0, true);
        if (mcattr === -1) continue;
        /* coloratt.c:543 add_menu_coloring_parsed prepends */
        (game.menu_colorings ||= []).unshift({ match: re, color: mcclr, attr: mcattr, origstr: mcbuf });
        game.iflags.use_menu_color = true;
    }
    /* C options.c:6417-6424 */
    if (game.iflags?.use_menu_color && game.iflags?.perm_invent) update_inventory();
    return optn_ok;
}

/* C options.c:4067-4098 optfn_statuslines(do_set); returns the error texts
 * (config_error_add calls, in order), or null. */
function optfn_statuslines_set(text) {
    /* options.c:4080 string_for_opt(opts, FALSE): options.c:6675-6676 */
    const errs = text ? [] : ["Missing parameter for 'statuslines:'."];
    const match = text.match(/^[\t\n\r\f\v ]*([+-]?\d+)/);
    const n = match ? Number(match[1]) : 0;
    if (n < 2 || n > 3)
        return [...errs, `'statuslines:${text}' is invalid; must be 2 or 3.`];
    game.iflags ||= {};
    game.iflags.wc2_statuslines = n;
    if (game.disp) game.disp.botl = 1;
    return null;
}

/* C options.c:195 msgwind[] */
const msgwind = [
    ['single', '[show one old message at a time,', ' most recent first]'],
    ['combination', '[for consecutive ^P requests, use', " 'single' for first two, then 'full']"],
    ['full', '[show all available messages,', ' oldest first and most recent last]'],
    ['reversed', '[show all available messages,', ' most recent first]'],
];

/* C options.c:5831 handler_msg_window (tty). */
export async function handler_msg_window(preserveStatus = false) {
    const iflags = game.iflags ||= {};
    const sep = iflags.menu_tab_sep ? '\t' : ' ';
    const old_prevmsg_window = iflags.prevmsg_window ?? 's';
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    for (let i = 0; i < msgwind.length; i++) {
        const [name, first, second] = msgwind[i];
        m.add_menu(i + 1, name[0], ATR_NONE, name.slice(0, 12).padEnd(12) + sep + first.slice(0, 60),
            false, name[0] === old_prevmsg_window);
        m.add_menu_str(' '.repeat(16) + sep + second.slice(0, 60));
    }
    m.end_menu('Select message history display type:');
    const { count, picks } = await m.select_menu(PICK_ONE);
    if (count > 0) {
        let i = picks[0] - 1;
        if (count > 1 && msgwind[i][0][0] === old_prevmsg_window) i = picks[1] - 1;
        iflags.prevmsg_window = msgwind[i][0][0];
    }
    const chngd = iflags.prevmsg_window !== old_prevmsg_window;
    if (chngd || game.flags.verbose) {
        /* optfn_msg_window get_val */
        const cur = msgwind.find(w => w[0][0] === iflags.prevmsg_window)?.[0] ?? 'single';
        await pline(`'msg_window' ${chngd ? 'changed to' : 'is still'} "${cur}".`);
    }
}

/* C options.c:5675 handler_disclose. */
const DISCLOSURE_NAMES = ['inventory', 'attributes', 'vanquished', 'genocides', 'conduct', 'overview'];

export async function handler_disclose(preserveStatus = false) {
    const cur = [...(game.flags?.end_disclose || END_DISCLOSE_DEFAULT)];
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    DISCLOSURE_NAMES.forEach((n, i) => m.add_menu(i + 1, DISCLOSURE_OPTIONS[i], ATR_NONE,
        `${n.padEnd(12)}[${cur[i]}${DISCLOSURE_OPTIONS[i]}]`, false, false));
    m.end_menu('Change which disclosure options categories:');
    const { count, picks } = await m.select_menu(PICK_ANY);
    const disc = new Array(DISCLOSURE_NAMES.length).fill(0);
    if (count > 0) for (const p of picks) disc[p - 1] = 1;
    for (let i = 0; i < DISCLOSURE_NAMES.length; i++) {
        if (!disc[i]) continue;
        const c = cur[i];
        const vg = DISCLOSURE_NAMES[i][0] === 'v' || DISCLOSURE_NAMES[i][0] === 'g';
        const items = [['-', 'Never disclose, without prompting'],
                       ['+', 'Always disclose, without prompting']];
        if (vg) items.push(['#', 'Always disclose, pick sort order from menu']);
        items.push(['n', 'Prompt, with default answer of "No"'],
                   ['y', 'Prompt, with default answer of "Yes"']);
        if (vg) items.push(['?', 'Prompt, with default answer of "Ask" to request sort menu']);
        const m2 = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
        /* C options.c:5724-5765: alternate selectors; '-' stays the menu's
         * deselect-all command (wintty.c:1679), not a disclosure choice. */
        for (const [ch, txt] of items)
            m2.add_menu(ch.charCodeAt(0), 0, ATR_NONE, txt, false, c === ch, ch === '-' ? 0 : ch);
        m2.end_menu(`Disclosure options for ${DISCLOSURE_NAMES[i]}:`);
        const r = await m2.select_menu(PICK_ONE);
        if (r.count > 0) {
            let nc = String.fromCharCode(r.picks[0]);
            if (r.count > 1 && nc === c) nc = String.fromCharCode(r.picks[1]);
            cur[i] = nc;
            (game.flags ||= {}).end_disclose = cur.join('');
        }
    }
}

/* C options.c:5951 handler_paranoid_confirmation: a PICK_ANY submenu over
 * paranoia[] whose ids are the flagmask bits themselves (any.a_int), with the
 * live bits preselected.  bones is hidden outside wizard mode.  A confirmed
 * commit RESETS flags.paranoia_bits even when no item ends up picked (the
 * player toggled the preselected bits off); ESC (count -1) leaves it alone. */
export async function handler_paranoid_confirmation(preserveStatus = false) {
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    const bits = game.flags?.paranoia_bits ?? PARANOID_CONFIRMATION_DEFAULT_BITS;
    for (const p of PARANOIA_OPTS) {
        if (!p.mask) break; /* "none"/"all" rows: rc parsing only */
        if (p.mask === PARANOID_BONES && !game.flags?.debug) continue;
        let explain = p.explain;
        /* C options.c:5968-5984 — the 'swim' explanation names the 'm'
         * movement prefix; when that key is bound elsewhere or unbound,
         * substitute the replacement (first occurrence, strsubst). */
        if (explain.includes("'m'")) {
            const mkey = cmd_from_func('do_reqmenu');
            if (mkey !== 0x6d) {
                const mbuf = mkey
                    ? `'${visctrl(mkey).slice(0, 9)}'`
                    /* cmdname_from_func(do_reqmenu) is the "reqmenu" entry of
                     * EXTCMDLIST, '#' prefixed unless already present. */
                    : "'#reqmenu'";
                explain = strsubst(explain, "'m'", mbuf);
            }
        }
        m.add_menu(p.mask, p.name[0], ATR_NONE, explain, false,
                   (bits & p.mask) !== 0);
    }
    m.end_menu('Actions requiring extra confirmation:');
    const { count, picks } = await m.select_menu(PICK_ANY);
    if (count >= 0) {
        let n = 0;
        for (const mask of picks) n |= mask;
        (game.flags ||= {}).paranoia_bits = n;
    }
}

/* C options.c:6153 handler_petattr — query_attr is PICK_ONE here because the
 * prompt does not start with "Choose" (coloratt.c:396); ESC (tmp == -1)
 * leaves the attribute alone. */
export async function handler_petattr(preserveStatus = false) {
    const iflags = (game.iflags ||= {});
    const tmp = await query_attr_one('Select pet highlight attribute',
        iflags.wc2_petattr ?? 7 /* ATR_INVERSE */, preserveStatus);
    if (tmp !== -1) {
        iflags.wc2_petattr = tmp;
        /* C: iflags.hilite_pet = (wc2_petattr != ATR_NONE); the port's storage
         * is the wc_hilite_pet spelling (optlist.h:366, flag.h:508 alias). */
        iflags.wc_hilite_pet = tmp !== 0;
        (game.go ||= {}).opt_need_redraw = true;
    }
}

/* C options.c:6085 handler_pickup_burden: PICK_ONE over burdentype[], ids
 * i+1, NO preselection; the first pick (no group toggles exist) indexes
 * flags.pickup_burden. */
export async function handler_pickup_burden(preserveStatus = false) {
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    BURDENTYPE.forEach((n, i) => m.add_menu(i + 1, 'ubsntl'[i], ATR_NONE, n,
        false, false));
    m.end_menu('Select encumbrance level:');
    const { count, picks } = await m.select_menu(PICK_ONE);
    if (count > 0) (game.flags ||= {}).pickup_burden = picks[0] - 1;
}

/* C options.c:6123 handler_runmode. */
const runmodes = ['teleport', 'run', 'walk', 'crawl'];

export async function handler_runmode(preserveStatus = false) {
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    runmodes.forEach((n, i) => m.add_menu(i + 1, n[0], ATR_NONE, n, false, false));
    m.end_menu('Select run/travel display mode:');
    const { count, picks } = await m.select_menu(PICK_ONE);
    if (count > 0) game.flags.runmode = picks[0] - 1;
}

/* C options.c:6206 handler_whatis_coord: PICK_ONE; the id is the GPCOORDS
 * letter itself (any.a_char), the current setting is preselected. */
export async function handler_whatis_coord(preserveStatus = false) {
    const iflags = (game.iflags ||= {});
    const gpc = iflags.getpos_coords || 'n';
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    const ent = (c, s) => m.add_menu(c.charCodeAt(0), c, ATR_NONE, s, false, gpc === c);
    ent('c', "compass ('east' or '3s' or '2n,4w')");
    ent('f', "full compass ('east' or '3south' or '2north,4west')");
    ent('m', 'map <x,y>');
    ent('s', 'screen [row,column]');
    ent('n', 'none (no coordinates displayed)');
    m.add_menu_str('');
    m.add_menu_str(`map: upper-left: <1,0>, lower-right: <79,20>${game.flags?.verbose ? '; column 0 unused, off left edge' : ''}`);
    m.add_menu_str(`screen: upper-left: [02,01], lower-right: [22,79]${game.flags?.verbose ? '; column 80 is not used' : ''}`);
    m.add_menu_str('');
    m.end_menu('Select coordinate display when auto-describing a map position:');
    const { count, picks } = await m.select_menu(PICK_ONE);
    if (count > 0) {
        iflags.getpos_coords = String.fromCharCode(picks[0]);
        if (count > 1 && iflags.getpos_coords === gpc)
            iflags.getpos_coords = String.fromCharCode(picks[1]);
    }
}

/* C options.c:6573 handler_versinfo: PICK_ANY over VI_NUMBER/VI_NAME/VI_BRANCH
 * (ids 1/2/4, selectors n/g/b), current bits preselected.  No git branch in
 * the scored build, so the third entry reads "(not applicable)" (released). */
export async function handler_versinfo(preserveStatus = false) {
    const flags = (game.flags ||= {});
    const vi = flags.versinfo ?? 1;
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    m.add_menu(1, 'n', ATR_NONE, 'version number', false, !!(vi & 1));
    m.add_menu(2, 'g', ATR_NONE, 'game name', false, !!(vi & 2));
    m.add_menu(4, 'b', ATR_NONE, '(not applicable)', false, !!(vi & 4));
    m.end_menu('Select version information flags:');
    const { count, picks } = await m.select_menu(PICK_ANY);
    if (count > 0) {
        let newval = 0;
        for (const p of picks) newval |= p;
        newval &= 7;
        if (newval) flags.versinfo = newval;
    }
}

/* C options.c:6254 handler_whatis_filter: ids are GFILTER_x + 1. */
export async function handler_whatis_filter(preserveStatus = false) {
    const iflags = (game.iflags ||= {});
    const gfilt = iflags.getloc_filter || 0;
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    [['n', 'no filtering'], ['v', 'in view only'], ['a', 'in same area']].forEach(([c, s], i) =>
        m.add_menu(i + 1, c, ATR_NONE, s, false, gfilt === i));
    m.end_menu('Select location filtering when going for next/previous map position:');
    const { count, picks } = await m.select_menu(PICK_ONE);
    if (count > 0) {
        iflags.getloc_filter = picks[0] - 1;
        if (count > 1 && iflags.getloc_filter === gfilt) iflags.getloc_filter = picks[1] - 1;
    }
}

/* C options.c:220 sortltype[]: none / loot / full. */
const sortltypes = ['none', 'loot', 'full'];

/* C options.c:6165 handler_sortloot.  The menu is PICK_ONE; the currently
 * selected sortloot entry is preselected (MENU_ITEMFLAGS_SELECTED), and a
 * second pick of that same entry resolves to the next one (options.c:6190). */
export async function handler_sortloot(preserveStatus = false) {
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    sortltypes.forEach((n, i) => m.add_menu(i + 1, n[0], ATR_NONE, n, false,
        game.flags.sortloot === n[0]));
    m.end_menu('Select loot sorting type:');
    const { count, picks } = await m.select_menu(PICK_ONE);
    if (count > 0) {
        let c = sortltypes[picks[0] - 1][0];
        if (count > 1 && c === game.flags.sortloot) c = sortltypes[picks[1] - 1][0];
        game.flags.sortloot = c;
        /* C options.c:6197: changing sortloot affects the persistent inventory. */
        if (game.iflags?.perm_invent) update_inventory();
    }
}

/* C insight.c:2601 vanqorders[][0..1] */
const VANQ_OPT = [
    ['t', 'traditional: by monster level'], ['d', 'by monster difficulty rating'],
    ['a', 'alphabetically, unique monsters separate'],
    ['A', 'alphabetically, unique monsters intermixed'],
    ['C', 'by monster class, high to low level in class'],
    ['c', 'by monster class, low to high level in class'],
    ['n', 'by count, high to low'], ['z', 'by count, low to high'],
];

/* C options.c:207 unlocktypes[] */
const unlocktypes = [
    ['untrap', '(might fail)'], ['apply-key', ''],
    ['kick', '(doors only)'], ['force', '(chests/boxes only)'],
];

/* flags.autounlock defaults to AUTOUNLOCK_APPLY_KEY (flag.h:75). */
function autounlockFlags() {
    const f = game.flags?.autounlock;
    return f === undefined ? 2 : f;
}

/* C options.c:1145 optfn_autounlock get_val: names joined with ' + ', or "none". */
function autounlockStr() {
    const f = autounlockFlags();
    if (!f) return 'none';
    return unlocktypes.filter((_, i) => f & (1 << i)).map(t => t[0]).join(' + ');
}

/* C dat/symbols headers: [name, handling, description, restriction].
 * read_sym_file() accepts every named set; do_symset() separately filters
 * MACgraphics (H_MAC) from the picker on non-Mac builds (symbols.c:943-945).
 * Rogue* sets carry the "rogue" restriction. */
const SYMSET_LIST = [
    ['plain', 0, "same as default symbols, except '+' for corner walls", ''],
    ['Blank', 0, 'completely blank symbols', ''],
    ['IBMgraphics', 1, 'special line-drawing characters used for walls', ''],
    ['IBMGraphics_1', 1, '', ''],
    ['IBMGraphics_2', 1, '', ''],
    ['RogueIBM', 1, '', 'rogue'],
    ['RogueEpyx', 1, 'rogue level color symbol set like Epyx Rogue', 'rogue'],
    ['RogueWindows', 1, '', 'rogue'],
    ['curses', 2, 'approximation of IBMgraphics using DECgraphics', 'primary'],
    ['DECgraphics', 2, 'special line-drawing characters used for walls', 'primary'],
    ['MACgraphics', 4, '', ''],
    ['MACgraphics', 4, '(pre-OSX: obsolete?)', 'primary'],
    ['Enhanced1', 5, 'Enhanced with Unicode glyphs and 24-bit color', 'primary'],
    ['Enhanced2', 5, 'Enhanced with more Unicode glyphs and 24-bit color', 'primary'],
    ['MACgraphics', 4, '', ''],
    ['AmigaFont', 0, 'Amiga hack.font line-drawing and effect characters', ''],
];

/* read_sym_file() finds every dat/symbols set, including MACgraphics (H_MAC),
 * which only the do_symset() pick-list skips (symbols.c:942, no MAC_GRAPHICS_ENV). */
function symset_in_file(name) {
    const n = String(name).toLowerCase();
    return SYMSET_LIST.find(e => e[0].toLowerCase() === n)
        ?? (n === 'macgraphics' ? ['MACgraphics', 4, '', 'primary'] : undefined);
}

/* C symbols.c:909 do_symset(): both pickers share the restriction filter. */
export async function handler_symset(preserveStatus = false, rogueflag = false) {
    const cur = gs.symset[rogueflag ? 1 : 0];
    const symset_name = cur.name;
    /* symbols.c:942-945: H_MAC is valid in config, but the picker omits it
     * when MAC_GRAPHICS_ENV is not compiled (as in the tty build). */
    const sets = SYMSET_LIST.filter((s) => s[1] !== 4
        && s[3] !== (rogueflag ? 'primary' : 'rogue'));
    let biggest = 'Default Symbols'.length;
    for (const s of sets) biggest = Math.max(biggest, s[0].length);
    let defindx = 0;
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    if (!symset_name) defindx = 1;
    m.add_menu(1, 0, ATR_NONE, 'Default Symbols', false, defindx === 1);
    sets.forEach((s, i) => {
        const id = i + 2;
        if (symset_name && s[0].toLowerCase() === symset_name.toLowerCase()) defindx = id;
        m.add_menu(id, 0, ATR_NONE, s[0].padEnd(biggest + 2) + ' ' + s[2], false, id === defindx);
    });
    m.end_menu(`Select ${rogueflag ? 'rogue level ' : ''}symbol set:`);
    const { count, picks } = await m.select_menu(PICK_ONE);
    let chosen = -2;
    if (count > 0) {
        chosen = picks[0];
        if (count === 2 && chosen === defindx) chosen = picks[1];
        chosen -= 2;
    } else if (count === 0 && defindx > 0) {
        chosen = defindx - 2;
    }
    if (chosen > -1) {
        const sl = sets[chosen];
        if (!sl) return true;
        const wasDec = dec_mode();
        clear_symsetentry(rogueflag ? 1 : 0, true); // C symbols.c:1028
        cur.name = sl[0];
        cur.handling = sl[1];
        /* rows still physically drawn under the old DEC shift until a window
         * is dismissed over them (see com_pager render_map_row_clipped) */
        if (wasDec && !dec_mode()) game._decStaleFrom = 0;
        /* C symbols.c:909-1090 do_symset — init_primary_symbols() resets every
         * showsym to its defsym default before read_sym_file loads the set, so
         * S_darkroom paints '.' until reglyph_darkroom() restores the alias to
         * S_room (display.c:1860-1897) at the doset tail's
         * reset_needed_visuals.  display.js re-derives glyphs from this flag
         * (see _remap_remembered_ibm / _terrain_glyph_base ROOM). */
        game._symsetDarkroomPending = true;
    } else if (chosen === -1) {
        clear_symsetentry(rogueflag ? 1 : 0, true); // C symbols.c:1037
    }
    /* C symbols.c:1065-1098 do_symset: reload the chosen primary table,
     * including defaults, then make it the active showsyms table. */
    if (!rogueflag && chosen >= -1) {
        load_primary_symset_from_file(cur.name);
        game._symsetDarkroomPending = true;
        if (!Is_rogue_level(game.u?.uz)) assign_graphics(0);
    }
    return true;
}

/* C options.c:5624 handler_autounlock. */
export async function handler_autounlock(preserveStatus = false) {
    const oldflags = autounlockFlags();
    const sep = game.iflags?.menu_tab_sep ? '\t' : ' ';
    const m = new TtyMenu({ overlay: true, statusClipCol: preserveStatus ? undefined : 0 });
    unlocktypes.forEach(([n, d], i) => {
        const buf = n.slice(0, 10).padEnd(10) + sep + d.slice(0, 40);
        m.add_menu(i + 1, n[0], ATR_NONE, buf, false, !!(oldflags & (1 << i)));
    });
    m.end_menu("Select 'autounlock' actions:");
    const { count, picks } = await m.select_menu(PICK_ANY);
    game.flags ||= {};
    if (count > 0) {
        let nf = 0;
        for (const p of picks) nf |= (1 << (p - 1));
        game.flags.autounlock = nf;
    } else if (count === 0) {
        game.flags.autounlock = 0;
    } else {
        game.flags.autounlock = oldflags;
    }
    const chngd = game.flags.autounlock !== oldflags;
    if ((chngd || game.flags.verbose) && option_state().give_opt_msg)
        await pline(`'autounlock' ${chngd ? 'changed to' : 'is still'} '${autounlockStr()}'.`);
}

export async function doset() {
    const g = game;
    g.flags = g.flags || {};
    g.iflags = g.iflags || {};
    g.go ||= {}; // C's option redraw flags are zero-initialized globals.
    /* C ref: options.c:8773 — `boolean skiphelp = !iflags.cmdassist`.  The
     * cmdassist row itself is one of the booleans below, so this reads the
     * same storage the menu shows. */
    let skiphelp = !((g.iflags.cmdassist === undefined) ? true : g.iflags.cmdassist);
    let gavehelp = false;

    let needVisuals = false;
    for (;;) { /* C: `rerun:` */
        const m = new TtyMenu();
        /* rows[k] is the option behind a_int k+1; HELP_A_INT is the '?' row. */
        const rows = [];
        const HELP_A_INT = -1;

        /* C ref: options.c:8788-8809 — the cmdassist help block.  helptext[]
         * has exactly one NULL, and the '?' menu entry is inserted there. */
        if (!skiphelp) {
            const helptext = [
                "For a brief explanation of how this works, type '?' to select",
                'the next menu choice, then press <enter> or <return>.',
                null, /* the '?' entry goes here */
                "[To suppress this menu help, toggle off the 'cmdassist' option.]",
                '',
            ];
            for (const h of helptext) {
                if (h !== null) {
                    /* C: Sprintf(buf, "%4s%.75s", "", helptext[i]) */
                    m.add_menu_str('    ' + h.slice(0, 75));
                } else {
                    m.add_menu(HELP_A_INT, '?', ATR_NONE, 'view help for options menu', true);
                }
            }
        }

        /* C ref: options.c:8829-8862 — booleans, pass 0 (non-modifiable, shown
         * indented and unselectable) then pass 1 (modifiable). */
        m.add_menu_heading('Booleans (selecting will toggle value):');
        for (const pass of [0, 1]) {
            for (const row of DOSET_BOOLS) {
                if (row.pass !== pass) continue;
                /* C options.c:8842-8847 — wizard-only rows are included when
                 * playmode is debug; set_wiznofuz rows disappear for the
                 * runtime debug_fuzzer flag. */
                if (row.wizardOnly && !g.flags.debug) continue;
                if (row.wizNoFuz && g.iflags.debug_fuzzer) continue;
                const value = boolValue(row);
                /* C: indent = (pass == 0 && !menu_tab_sep) ? "    " : "" */
                const text = dosetRow(pass === 0 && !g.iflags.menu_tab_sep ? '    ' : '', row.name,
                                      term_for_boolean(row, value));
                if (pass === 0) {
                    m.add_menu_str(text);
                } else {
                    rows.push({ kind: 'bool', row });
                    m.add_menu(rows.length, 0, ATR_NONE, text, true);
                }
            }
        }

        /* C ref: options.c:8864-8882 — compounds. */
        m.add_menu_str('');
        m.add_menu_heading('Compounds (selecting will prompt for new value):');
        for (const row of DOSET_COMPOUNDS) {
            /* C ref: options.c:9026 doset_add_menu — an optfn that returns an
             * empty string leaves the value at its "unknown" default. */
            const value = (row.name === 'number_pad' ? number_pad_value() : compound_option_value(row.name) ?? row.val()) || 'unknown';
            if (!row.sel) {
                m.add_menu_str(dosetRow('    ', row.name, value));
            } else {
                rows.push({ kind: 'comp', row });
                m.add_menu(rows.length, 0, ATR_NONE, dosetRow('', row.name, value), true);
            }
        }

        /* C ref: options.c:8884-8898 — "Other settings". */
        m.add_menu_str('');
        m.add_menu_heading('Other settings:');
        for (const row of DOSET_OTHERS) {
            const value = row.val() || 'unknown';
            if (!row.sel) {
                m.add_menu_str(dosetRow('    ', row.name, value));
            } else {
                rows.push({ kind: 'othr', row });
                m.add_menu(rows.length, 0, ATR_NONE, dosetRow('', row.name, value), true);
            }
        }

        m.end_menu('Set what options?');
        /* C options.c:8903-8904: both flags are cleared before the menu is put up,
         * so the startup symset's pending redraw does not survive into the walk. */
        g.go.opt_need_redraw = g.go.opt_need_glyph_reset = false;
        const { count, picks } = await m.select_menu(PICK_ANY);
        /* C wintty.c tty_dismiss_nhwindow(NHW_MENU) docrt()s the map, whose cls()
         * blanks the physical screen: a RogueEpyx hero square (\x01 paints no
         * glyph) must not keep a cell painted before the full-screen menu. */
        g._epyxPhys = null;

        let statusRefreshed = false;
        if (count > 0) {
            /* C ref: options.c:8909-8959 — walk the picks in menu order and
             * either invert the boolean or run the compound's handler. */
            for (const a of picks) {
                if (a === HELP_A_INT) {
                    /* C options.c:8917-8918: display_file(OPTMENUHELP, FALSE) */
                    g._pending_message = '';
                    await display_text_window(dlb_file_lines(OPTMENUHELP));
                    gavehelp = true;
                    continue;
                }
                const ent = rows[a - 1];
                if (!ent) continue;
                if (ent.kind === 'bool') {
                    /* C: Sprintf(buf, "%s%s", *addr ? "!" : "", name);
                     *    parseoptions(buf, FALSE, FALSE);
                     * which lands in optfn_boolean and flips the storage. */
                    const box = boolBox(ent.row);
                    const negated = boolValue(ent.row);
                    box[ent.row.fld] = !negated;
                    /* C options.c:5300-5312: retain an existing pet attribute,
                     * default to inverse when enabling, and redraw after the walk. */
                    /* C options.c:5300-5311: hilite_pet defaults petattr to
                     * inverse and requests a redraw after the pick walk. */
                    if (ent.row.name === 'hilite_pet') {
                        if ((!g.windowprocs || ['tty', 'curses'].includes(g.windowprocs.name))
                            && g.iflags.wc_hilite_pet && !g.iflags.wc2_petattr)
                            g.iflags.wc2_petattr = 7; /* ATR_INVERSE (wintype.h) */
                        g.go.opt_need_redraw = true;
                        needVisuals = true;
                    }
                    /* C flag.h:507 aliases use_color to wc_color; options.c:5408-5410
                     * requests a glyph reset and redraw when this option changes. */
                    if (ent.row.name === 'color') {
                        g._gm_use_color ??= g.iflags.use_color;
                        g.iflags.use_color = !negated;
                        g.go.opt_need_redraw = g.go.opt_need_glyph_reset = true;
                        needVisuals = true;
                    }
                    if (ent.row.name === 'rest_on_space') update_rest_on_space();
                    /* same status_initialize(REASSESS_ONLY) -> update_all reset as doset_simple */
                    /* C options.c:5331-5350, as in the simple menu above. */
                    if (ent.row.name === 'terrainstatus') classifyTerrain();
                    if (['showscore', 'showvers', 'showexp', 'time', 'hitpointbar',
                         'terrainstatus', 'weaponstatus', 'armorstatus'].includes(ent.row.name)) {
                        delete g._blTemp;
                        status_reassess();
                    }
                    /* C options.c:5376-5385: these toggles reset glyphs and
                     * redraw after the pick walk, acknowledging pending messages
                     * through reset_needed_visuals() -> docrt() -> cls(). */
                    if (['wizmgender', 'showrace', 'use_inverse', 'hilite_pile',
                         'perm_invent', 'ascii_map', 'tiled_map'].includes(ent.row.name)) {
                        g.go.opt_need_redraw = g.go.opt_need_glyph_reset = true;
                        needVisuals = true;
                    }
                    /* C optfn_boolean (options.c:5412-5416): these set the pending-visual flags. */
                    if (ent.row.name === 'customcolors') { g.go.opt_reset_customcolors = true; needVisuals = true; }
                    if (ent.row.name === 'customsymbols') { g.go.opt_reset_customsymbols = true; needVisuals = true; }
                    /* C optfn_boolean (options.c:5369-5385): dark_room and lit_corridor
                     * shut down vision, delay the full recalc, and request a darkroom
                     * redraw. Without it the doset walk never reaches reset_needed_visuals()
                     * and the cls()'s --More-- on the toggled message is lost. */
                    if (ent.row.name === 'dark_room' || ent.row.name === 'lit_corridor') {
                        vision_recalc(2);
                        g.vision_full_recalc = 1;
                        if (g.iflags.use_color) g.go.opt_need_redraw = true;
                        needVisuals = true;
                    }
                    if (ent.row.name === 'hitpointbar'
                        && (!g.windowprocs || (g.windowprocs.wincap2 & (0x8 | 0x80)))) {
                        g.go.opt_need_redraw = true;
                        needVisuals = true;
                    }
                    /* C ref: options.c:5438-5440 — give_opt_msg is TRUE on the
                     * doset() path (only doset_simple clears it). */
                    if (ent.row.name === 'idlecheckpoint') {
                        /* C options.c:5313-5319: no IDLECHECKPOINT support; the option is
                         * forced back off and give_opt_msg is FALSE (no toggled message). */
                        await pline("There is no underlying support for 'idlecheckpoint' compiled in.");
                        g.iflags.idlecheckpoint = false;
                        /* give_opt_msg is a file static that only doset_simple restores
                         * (options.c:8733): full doset leaves it FALSE for good. */
                        option_state().give_opt_msg = false;
                    } else if (option_state().give_opt_msg)
                    await pline(`'${ent.row.name}' option toggled ${!negated ? 'on' : 'off'}.`);
                    if (option_state().give_opt_msg || ent.row.name === 'idlecheckpoint') {
                        await flush_screen(1);
                        statusRefreshed = true;
                    }
                } else if (ent.row.name === 'pickup_types') {
                    /* C: has_handler -> optfn_pickup_types(do_handler) ->
                     * handler_pickup_types -> the object-class picker. */
                    await drainTopline();
                    await optfn_pickup_types_handler(statusRefreshed);
                    statusRefreshed = !game._statusBlankAfterDocrt; // a pline since the Options dismissal repainted the status rows
                } else if (ent.row.name === 'autopickup exceptions') {
                    await drainTopline();
                    await handler_autopickup_exception(statusRefreshed);
                } else if (ent.row.name === 'number_pad') {
                    await drainTopline();
                    await numberPadSubmenu(statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'autounlock') {
                    await drainTopline();
                    await handler_autounlock(statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'msg_window') {
                    await drainTopline();
                    await handler_msg_window(statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'autocompletions') {
                    await drainTopline();
                    await handler_change_autocompletions(statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'bind keys') {
                    await drainTopline();
                    if (await handler_rebind_keys()) statusRefreshed = true;
                } else if (ent.row.name === 'whatis_coord') {
                    await drainTopline();
                    await handler_whatis_coord(statusRefreshed);
                    /* the overlay menu does not cover the status rows, so a status
                     * left blank by handler_symset (statusRefreshed false after a
                     * DEC->other change) is still blank for the next menu */
                } else if (ent.row.name === 'whatis_filter') {
                    await drainTopline();
                    await handler_whatis_filter(statusRefreshed);
                    statusRefreshed = game._decStaleFrom == null;
                } else if (ent.row.name === 'versinfo') {
                    /* C options.c:4512-4516 optfn_versinfo(do_handler) */
                    await drainTopline();
                    const vi0 = game.flags?.versinfo ?? 1;
                    await handler_versinfo(statusRefreshed);
                    const vi1 = game.flags?.versinfo ?? 1;
                    await pline("'versinfo' %s %d.",
                        vi1 === vi0 ? 'not changed, still' : 'changed to', vi1);
                    /* options.c:4530-4533: a change sets go.opt_need_redraw */
                    if (vi1 !== vi0) { g.go.opt_need_redraw = true; needVisuals = true; }
                    statusRefreshed = true;
                } else if (ent.row.name === 'runmode') {
                    await drainTopline();
                    await handler_runmode(statusRefreshed);
                    /* handler_runmode (options.c:6124) issues no pline/bot(): the status
                     * rows stay as the preceding docrt left them */
                } else if (ent.row.name === 'disclose') {
                    await drainTopline();
                    await handler_disclose(statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'sortdiscoveries') {
                    await drainTopline();
                    await choose_disco_sort(0, statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'sortloot') {
                    await drainTopline();
                    await handler_sortloot(statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'sortvanquished') {
                    /* C options.c:4001 optfn_sortvanquished -> set_vanq_order(TRUE) */
                    await drainTopline();
                    const prevVanq = game.flags.vanq_sortmode | 0;
                    await list_vanquished_set_vanq_order(true, statusRefreshed ? undefined : 0);
                    /* C options.c:3997-4002: pline after set_vanq_order */
                    const vm = game.flags.vanq_sortmode | 0;
                    await pline("'sortvanquished' %s \"%s: %s\".",
                        vm === prevVanq ? 'not changed, still' : 'changed to',
                        VANQ_OPT[vm][0], VANQ_OPT[vm][1]);
                    statusRefreshed = true;
                } else if (ent.row.name === 'menu_headings') {
                    await drainTopline();
                    await handler_menu_headings(statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'menu colors') {
                    await drainTopline();
                    await handler_menu_colors(statusRefreshed);
                    statusRefreshed = game._decStaleFrom == null;
                } else if (ent.row.name === 'message types') {
                    await drainTopline();
                    await handler_msgtype(statusRefreshed);
                    statusRefreshed = game._decStaleFrom == null;
                } else if (ent.row.name === 'status condition fields') {
                    await drainTopline();
                    await cond_menu();
                    statusRefreshed = game._decStaleFrom == null;
                } else if (ent.row.name === 'status highlight rules') {
                    await drainTopline();
                    await status_hilite_menu(statusRefreshed);
                    statusRefreshed = game._decStaleFrom == null;
                } else if (ent.row.name === 'menu_objsyms') {
                    await drainTopline();
                    await handler_menu_objsyms(statusRefreshed);
                    /* handler_menu_objsyms (options.c:5795) plines and flushes
                     * nothing, so a status row blanked by the dismissed Options
                     * window stays blank for the next handler's menu. */
                } else if (ent.row.name === 'menustyle') {
                    await drainTopline();
                    await handler_menustyle(statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'paranoid_confirmation') {
                    await drainTopline();
                    await handler_paranoid_confirmation(statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'petattr') {
                    await drainTopline();
                    await handler_petattr(statusRefreshed);
                    /* handler_petattr set go.opt_need_redraw; doset's tail
                     * runs reset_needed_visuals() (options.c:8973) which
                     * docrt()s so the pet repaints under the new attribute. */
                    needVisuals = true;
                } else if (ent.row.name === 'pickup_burden') {
                    await drainTopline();
                    await handler_pickup_burden(statusRefreshed);
                    statusRefreshed = true;
                } else if (ent.row.name === 'symset' || ent.row.name === 'roguesymset') {
                    /* C options.c:6325 handler_symset(), 8939 do_handler. */
                    await drainTopline();
                    await handler_symset(statusRefreshed, ent.row.name === 'roguesymset');
                    g.go.opt_need_redraw = true;
                    needVisuals = true;
                    /* handler_symset plines/bot()s nothing: symbols.c:909
                     * do_symset only loads tables (switch_symbols ->
                     * decgraphics_mode_callback = init_hilite, termcap.c:388;
                     * tty_preference_update("symset") is tty-inert), so the
                     * status rows keep whatever state they had — pass the
                     * flag through like handler_menu_objsyms above.  The
                     * pickers are short windows (rows 0..13); their dismissal
                     * docorner never reaches rows 22/23. */
                } else if (ent.row.hasHandler === false) {
                    /* C ref: options.c:8944-8953 — no handler, so getlin.  The
                     * pending mention's --More-- (opening the getlin window)
                     * stands over the status rows the menu overdrew. */
                    g._status_blanked = !statusRefreshed;
                    await drainTopline();
                    g._status_blanked = false;
                    /* C pline.c vpline flushes status before each toggle
                     * message.  getline.c disables bot() inside getlin, so
                     * preserve that already painted status; only a prompt
                     * entered directly after the menu has blank status. */
                    g._status_blanked = !statusRefreshed;
                    const abuf = await getlin(`Set ${ent.row.name} to what?`);
                    g._status_blanked = false;
                    if (abuf !== '\x1b' && ent.row.name === 'fruit') {
                        /* C options.c:1725-1760 optfn_fruit(do_set) — see the
                         * PAGES 'fruit' entry above for why writing pl_fruit
                         * alone is not enough. */
                        const msg = optfn_fruit_set(mungspaces(abuf));
                        if (msg) {
                            g._pending_message = msg;
                            /* C pline.c vpline flushes before the message
                             * (flush_screen -> bot()): the status rows come
                             * back with "Fruit is now ...". */
                            await flush_screen(1);
                            statusRefreshed = true;
                        }
                    } else if (abuf !== '\x1b' && ent.row.name === 'hilite_status') {
                        const hlmsg = optfn_hilite_status_set(mungspaces(abuf));
                        // C cfgfiles.c:1552-1562 config_erradd(): interactive
                        // option errors get a period unless already punctuated.
                        if (hlmsg) await pline('%s%s', hlmsg,
                            /[.!?]$/.test(hlmsg) ? '' : '.');
                    } else if (abuf !== '\x1b' && ent.row.name === 'statushilites') {
                        optfn_statushilites_set(g.iflags, mungspaces(abuf));
                    } else if (abuf !== '\x1b' && (ent.row.name === 'crash_email' || ent.row.name === 'crash_name')) {
                        /* C options.c:1274-1290 / 1300-1316 optfn_crash_email/name(do_set):
                         * string_for_opt() then gc.crash_* = dupstr(op); an empty
                         * answer is optn_err and leaves it unchanged. */
                        const op = await string_for_opt(`${ent.row.name}:${mungspaces(abuf)}`, false);
                        if (op) game.gc[ent.row.name] = op;
                    } else if (abuf !== '\x1b' && ent.row.name === 'crash_urlmax') {
                        /* C options.c:1311-1331 optfn_crash_urlmax(do_set):
                         * atoi(op); below 75 is optn_err, else gc.crash_urlmax. */
                        const op = await string_for_opt(`crash_urlmax:${mungspaces(abuf)}`, false);
                        if (op) {
                            const temp = parseInt(op, 10) || 0;
                            if (temp >= 75) game.gc.crash_urlmax = temp;
                            else await pline('Invalid value %d for crash_urlmax.  Minimum value is 75.', temp);
                        }
                    } else if (abuf !== '\x1b' && ent.row.name === 'menuinvertmode') {
                        /* C options.c:2297-2308 optfn_menuinvertmode(do_set):
                         * atoi(op); outside 0..2 is optn_err. */
                        const op = mungspaces(abuf);
                        if (op) {
                            const mode = parseInt(op, 10) || 0;
                            if (mode >= 0 && mode <= 2) g.iflags.menuinvertmode = mode;
                            else await pline("Illegal menuinvertmode parameter '%s'.", op);
                        }
                    } else if (abuf !== '\x1b' && ent.row.name === 'scores') {
                        /* C options.c:3676-3733 optfn_scores(do_set): "5t[op] 5a[round] o[wn]" */
                        // C :3679 rejects a missing value before changing flags.
                        let op = await string_for_opt(`scores:${abuf}`, false);
                        const fl = g.flags;
                        if (op) { fl.end_top = fl.end_around = 0; fl.end_own = false; }
                        scoresParse: while (op.length) {
                            let inum = 1;
                            const neg = op[0] === '!' || /^no/i.test(op);
                            if (neg) op = op.slice(op[0] === '!' ? 1 : (op[2] !== '-' ? 2 : 3));
                            const m = /^\d+/.exec(op);
                            if (m) { inum = parseInt(m[0], 10); op = op.slice(m[0].length); }
                            op = op.replace(/^ +/, '');
                            switch ((op[0] || '').toLowerCase()) {
                            case 't': fl.end_top = neg ? 0 : inum; break;
                            case 'a': fl.end_around = neg ? 0 : inum; break;
                            case 'o': fl.end_own = !(neg || !inum); break;
                            case 'n': fl.end_top = fl.end_around = 0; fl.end_own = false; break;
                            case '-':
                                if (/^\d/.test(op[1] || '')) {
                                    await pline('Values for scores:top and scores:around must not be negative.');
                                    break scoresParse;
                                }
                                /* FALLTHROUGH */
                            default:
                                /* C options.c:3727-3729 -> config_erradd (cfgfiles.c:1557-1563):
                                 * interactive 'O' prints the message via pline + period. */
                                await pline("Unknown scores parameter '%s'.", op);
                                break scoresParse;
                            }
                            /* C :3735 while (letter(*op)) -- hacklib.c:71 counts '@' as a letter */
                            op = op.replace(/^[@-Za-z]+/, '').replace(/^ +/, '').replace(/^\//, '');
                        }
                    } else if (abuf !== '\x1b' && ent.row.name === 'pile_limit') {
                        /* C options.c:3404-3428 optfn_pile_limit(do_set):
                         * string_for_opt(opts, FALSE) reports a missing value
                         * before falling back to PILE_LIMIT_DFLT (5).
                         * A negative atoi(op) result falls back to it as well. */
                        const op = await string_for_opt(`pile_limit:${mungspaces(abuf)}`, false);
                        let lim = op ? (parseInt(op, 10) || 0) : 5;
                        if (lim < 0) lim = 5;
                        g.flags.pile_limit = lim;
                    } else if (abuf !== '\x1b' && ent.row.name === 'packorder') {
                        /* C options.c:2670-2680 optfn_packorder(do_set) -> 7466
                         * change_inv_order: COIN first unless named, keep good
                         * entries, append omissions from the previous order. */
                        const op = mungspaces(abuf);
                        if (op) {
                            const previous = g.flags.inv_order || [12, 5, 2, 3, 7, 9, 10, 8, 4, 11, 6, 13, 14, 15, 16];
                            const order = op.includes('$') ? [] : [12];
                            const base = (g._config_errors ||= []).length;
                            for (let i = 0; i < op.length; i++) {
                                const oc = def_char_to_objclass(op.charCodeAt(i));
                                if (oc === 18) config_error_add("Not an object class '%c'", op.charCodeAt(i));
                                else if (!previous.includes(oc)) config_error_add("Object class '%c' not allowed", op.charCodeAt(i));
                                else if (op.includes(op[i], i + 1)) config_error_add("Duplicate object class '%c'", op.charCodeAt(i));
                                else order.push(oc);
                            }
                            /* 'O' has config_error_ready clear: config_erradd plines each (cfgfiles.c:1556-1563) */
                            for (const m of g._config_errors.splice(base)) {
                                if (typeof m !== 'string') continue;
                                await pline('%s%s', m, /[.!?]$/.test(m) ? '' : '.');
                            }
                            g.flags.inv_order = order.concat(previous.filter(oc => !order.includes(oc)));
                        }
                    } else if (abuf !== '\x1b' && ent.row.name === 'glyph') {
                        /* C options.c:1824-1838 optfn_glyph(do_set).  The
                         * interactive 'O' command has config_error_ready clear,
                         * so config_erradd() (cfgfiles.c:1556-1563) plines each
                         * error at once, adding a period when unpunctuated. */
                        const op = mungspaces(abuf);
                        if (op) {
                            const base = (g._config_errors ||= []).length;
                            glyphrep_to_custom_map_entries(op, { value: 0 });
                            for (const m of g._config_errors.splice(base)) {
                                if (typeof m !== 'string') continue;
                                await pline('%s%s', m, /[.!?]$/.test(m) ? '' : '.');
                            }
                        }
                    } else if (abuf !== '\x1b' && ent.row.name === 'statuslines') {
                        /* C options.c:4067-4098 optfn_statuslines(do_set) */
                        const message = optfn_statuslines_set(abuf);
                        /* options.c:8685-8688 preference_update -> wintty.c:603 */
                        new_status_window();
                        newclipping();
                        if (!message) {
                            /* options.c:4091-4092: go.opt_need_redraw = TRUE */
                            g.go.opt_need_redraw = true;
                            needVisuals = true;
                        }
                        if (message) {
                            /* cfgfiles.c:1557-1563 config_erradd: pline + wait_synch
                             * per error.  pline's flush_screen repaints the status
                             * rows; tty_wait_synch (wintty.c:3624) only displays
                             * WIN_MAP — no --More-- unless a later pline needs the
                             * topline (the "Missing parameter" + "invalid" pair). */
                            for (const m of message) await pline('%s', m);
                        }
                    } else if (abuf !== '\x1b' && ent.row.name === 'boulder') {
                        needVisuals = (await optfn_boulder_set(mungspaces(abuf))) || needVisuals;
                    } else if (abuf !== '\x1b' && ent.row.name === 'suppress_alert') {
                        const { message } = optfn_suppress_alert_set(g.flags, mungspaces(abuf), false, false);
                        if (message) await pline(message);
                    }
                    /* C cfgfiles.c:1560 pline() -> flush_screen() -> bot():
                     * an option error repaints status after the menu's docrt.
                     * Preserve that paint in subsequent getlin prompts. */
                    statusRefreshed = !g._statusBlankAfterDocrt;
                }
            }
        }

        /* C ref: options.c:8964-8970 — when '?' was the ONLY pick, rebuild the
         * menu without the help block and ask again. */
        if (count === 1 && gavehelp) {
            skiphelp = true;
            gavehelp = false;
            continue;
        }
        break;
    }

    /* C options.c:8973 doset(): reset_needed_visuals() after the pick walk. */
    if (needVisuals) await reset_needed_visuals();
    game._decStaleFrom = null;
    /* C: this handler returns ECMD_OK on every path; rhack() maps it. */
    return ECMD_OK;
}

const empty_optstr = '';

const ATR_INVERSE = 7; // C wintype.h enum, NOT terminal.js's output bitmask.

const whitespace = c => /[\t\n\v\f\r ]/.test(c);

const prefix = (a, b, n) => a.slice(0, n).toLowerCase() === b.slice(0, n).toLowerCase();

// options.c:6703. The sentinel is not stored in the JS array.
export function determine_ambiguities(allopt) {
    const needed = Array(allopt.length).fill(0);
    for (let i = 0; i < allopt.length; ++i) {
        for (let j = 0; j < allopt.length; ++j) {
            if (j === i) continue;
            const p1 = allopt[i].name, p2 = allopt[j].name;
            let tmpneeded = 1, k = 0;
            while (k < p1.length && k < p2.length && prefix(p1[k], p2[k], 1)) {
                ++tmpneeded; ++k;
            }
            needed[i] = Math.max(needed[i], tmpneeded);
            needed[j] = Math.max(needed[j], tmpneeded);
        }
    }
    for (let i = 0; i < allopt.length; ++i)
        allopt[i].minmatch = needed[i] < 3 ? 3 : Math.min(needed[i], allopt[i].name.length);
}

export function length_without_val(user_string, len = user_string.length) {
    let p = user_string.indexOf(':'), q = user_string.indexOf('=');
    if (p < 0 || (q >= 0 && q < p)) p = q;
    if (p >= 0) {
        while (p > 0 && whitespace(user_string[p - 1])) --p;
        len = p;
    }
    return len;
}

export function match_optname(user_string, optn_name, min_length, val_allowed) {
    const len = val_allowed ? length_without_val(user_string) : user_string.length;
    return len >= min_length && prefix(optn_name, user_string, len);
}

export async function string_for_opt(opts, val_optional) {
    let colon = opts.indexOf(':'), equals = opts.indexOf('=');
    if (colon < 0 || (equals >= 0 && equals < colon)) colon = equals;
    if (colon < 0 || colon + 1 === opts.length) {
        if (!val_optional) await option_error(`Missing parameter for '${opts}'`);
        return empty_optstr;
    }
    return opts.slice(colon + 1);
}

// cfgfiles.c:config_erradd's no-frame arm. The complete config-frame/Lua
// lifecycle is still a separate port, not a successful no-op here.
async function option_error(message) {
    if (game.program_state.config_error_ready)
        throw new Error('Unported option dependency: config_erradd with active config frame');
    const punct = /[.!?]$/.test(message) ? '' : '.';
    await pline(`${game.iflags.window_inited ? '' : 'config_error_add: '}${message}${punct}`);
    // tty_wait_synch is fflush(stdout), without a game/input effect.
}

export function reset_duplicate_opt_detection() {
    for (const row of option_state().allopt) row.dupdetected = 0;
}

function duplicate_opt_detection(optidx) {
    const row = option_state().allopt[optidx];
    if (game.go.opt_initial && game.go.opt_from_file) {
        const previous = row.dupdetected;
        row.dupdetected = ((previous + 1) << 24) >> 24; // C schar counter.
        return previous;
    }
    return 0;
}

async function complain_about_duplicate(optidx) {
    const state = option_state(), row = state.allopt[optidx];
    await option_error(`${row.type === 'C' ? 'compound' : 'boolean'} option specified multiple times: ${row.name}`
        + (state.using_alias ? ` (via alias: ${row.alias})` : ''));
}

// options.c:489. Keep the recursive order and even C's early-return
// in_parseoptions leak on bad negation: caller-visible state is part of parity.
export async function parseoptions(opts, tinitial, tfrom_file) {
    const state = option_state(), allopt = state.allopt, go = game.go;
    let got_match = false, pfx_match = false, matchidx = -1, optresult = optn_err;
    let retval = true;
    state.duplicate = 0;
    state.using_alias = false;
    go.opt_initial = !!tinitial;
    go.opt_from_file = !!tfrom_file;
    const comma = opts.indexOf(',');
    if (tinitial && comma >= 0) {
        const rest = opts.slice(comma + 1);
        opts = opts.slice(0, comma);
        if (!await parseoptions(rest, go.opt_initial, go.opt_from_file)) retval = false;
    }
    if (opts.length > 128) {
        await option_error('Option too long, max length is 128 characters');
        return false;
    }
    opts = opts.replace(/^[\t\n\v\f\r ]+|[\t\n\v\f\r ]+$/g, '');
    if (!opts) {
        await option_error('Empty statement');
        return false;
    }
    let negated = false;
    while (opts[0] === '!' || prefix(opts, 'no', 2)) {
        opts = opts.slice(opts[0] === '!' ? 1 : opts[2] !== '-' ? 2 : 3);
        negated = !negated;
    }
    const optlen = length_without_val(opts);
    for (let i = 0; i < allopt.length; ++i) {
        got_match = false;
        if (allopt[i].pfx && prefix(opts, allopt[i].name, allopt[i].name.length)) {
            matchidx = i;
            got_match = pfx_match = true;
        }
        if (!got_match && allopt[i].name)
            got_match = match_optname(opts, allopt[i].name, allopt[i].minmatch, true);
        if (got_match) {
            if (!allopt[i].pfx && optlen < allopt[i].minmatch) {
                await option_error(`Ambiguous option ${opts}, ${allopt[i].minmatch} characters are needed to differentiate`);
                break;
            }
            matchidx = i;
            break;
        }
    }
    if (!got_match) {
        for (let i = 0; i < allopt.length; ++i) {
            if (!allopt[i].alias) continue;
            got_match = match_optname(opts, allopt[i].alias, allopt[i].alias.length, true);
            if (got_match) { matchidx = i; state.using_alias = true; break; }
        }
    }
    ++game.program_state.in_parseoptions;
    if (got_match && matchidx >= 0 && matchidx < allopt.length && !allopt[matchidx].disregarded) {
        const row = allopt[matchidx];
        state.duplicate = duplicate_opt_detection(matchidx);
        if (state.duplicate && !row.dupeok) await complain_about_duplicate(matchidx);
        if (negated && !row.negateok) {
            await option_error(`The ${row.name} option may not both have a value and be negated.`);
            return optn_err;
        }
        const op = await string_for_opt(opts, true);
        if (row.handler !== 'optfn_boolean')
            throw new Error(`Unported shared option handler: ${row.handler}`);
        optresult = await optfn_boolean(row.idx, do_set, negated, opts, op);
        if (optresult === optn_ok) row.set_in_config = true;
    }
    if (game.program_state.in_parseoptions > 0) --game.program_state.in_parseoptions;
    if (!got_match && opts.startsWith('S_') && parsesymbols(opts, PRIMARYSET)) {
        switch_symbols(true);
        check_gold_symbol();
        optresult = optn_ok;
    }
    if (optresult === optn_silenterr || (got_match && allopt[matchidx].disregarded)
        || (!got_match && game.ignore_errors_on_unmatched)) return false;
    if (pfx_match && optresult === optn_err) {
        await option_error(`bad option suffix variation '${opts.split(':')[0]}'`);
        return false;
    }
    if (got_match && optresult === optn_err) return false;
    if (optresult === optn_ok) return retval;
    await option_error(`Unknown option '${opts}'`);
    return false;
}

function missing(name) { throw new Error(`Unported option dependency: ${name}`); }

// options.c:5192, with tty build conditionals resolved as in options_data.js.
export async function optfn_boolean(optidx, req, negated, opts, op) {
    const state = option_state(), row = state.allopt[optidx], go = game.go;
    const flags = game.flags, iflags = game.iflags;
    if (req === do_init) return optn_ok;
    if (req === do_set) {
        let nosexchange = false, ln = 0;
        if (!row.addr) return optn_ok;
        if (!go.opt_initial && row.setwhere === 'set_in_config') return optn_err;
        if (go.opt_initial && row.setwhere === 'set_wiznofuz') return optn_err;
        op = await string_for_opt(opts, true);
        if (op !== empty_optstr) {
            if (negated) {
                await option_error(`Negated boolean '${row.name}' should not have a parameter`);
                return optn_silenterr;
            }
            ln = op.length;
            const digit = /^[0-9]/.test(op), number = Number.parseInt(op, 10);
            if (prefix(op, 'true', ln) || prefix(op, 'yes', ln) || op.toLowerCase() === 'on' || (digit && number === 1))
                negated = false;
            else if (prefix(op, 'false', ln) || prefix(op, 'no', ln) || op.toLowerCase() === 'off' || (digit && number === 0))
                negated = true;
            else if (!row.valok) {
                await option_error(`'${opts}' is not valid for a boolean`);
                return optn_silenterr;
            }
        }
        if (iflags.debug_fuzzer && !go.opt_initial && ['silent', 'perm_invent'].includes(row.name)) return optn_ok;
        switch (row.name) {
        case 'female':
            if (prefix(opts, 'female', Math.max(ln, 3))) {
                if (!go.opt_initial && !!flags.female === !!negated) nosexchange = true;
                else { flags.initgend = Number(flags.female = !negated); return optn_ok; }
            }
            if (prefix(opts, 'male', Math.max(ln, 3))) {
                if (!go.opt_initial && !!flags.female !== !!negated) nosexchange = true;
                else { flags.initgend = Number(flags.female = !!negated); return optn_ok; }
            }
            break;
        case 'perm_invent':
            if (!negated && !go.opt_initial && !can_set_perm_invent()) return optn_silenterr;
            break;
        }
        if (nosexchange) {
            await option_error(`'${opts}' is not anatomically possible.`);
            return optn_silenterr;
        }
        set_option_value(row, !negated);
        switch (row.name) {
        case 'pauper': game.u.uroleplay.nudist = game.u.uroleplay.pauper; break;
        case 'ascii_map': iflags.wc_tiled_map = !!negated; break;
        case 'tiled_map': iflags.wc_ascii_map = !!negated; break;
        case 'hilite_pet':
            if ((!game.windowprocs || ['tty', 'curses'].includes(game.windowprocs.name))
                && iflags.wc_hilite_pet && !iflags.wc2_petattr) iflags.wc2_petattr = ATR_INVERSE;
            go.opt_need_redraw = true;
            break;
        case 'idlecheckpoint':
            await pline("There is no underlying support for 'idlecheckpoint' compiled in.");
            iflags.idlecheckpoint = false;
            state.give_opt_msg = false;
            break;
        }
        if (go.opt_initial) return optn_ok;
        switch (row.name) {
        case 'terrainstatus':
            classify_terrain();
            // fall through
        case 'weaponstatus': case 'armorstatus':
            // WC2_EXTRASTATUS in the normal tty window port.
            if (game.windowprocs && !(game.windowprocs.wincap2 & 0x080000)) {
                await option_error(`'${row.name}' is not supported.`);
                return optn_ok;
            }
            // fall through
        case 'showscore': case 'showvers': case 'showexp': case 'time':
            if (!game.windowprocs || (game.windowprocs.wincap2 & (0x8 | 0x80))) status_reassess();
            game.disp.botl = true;
            break;
        case 'fixinv': case 'price_quotes': case 'sortpack': case 'implicit_uncursed': case 'wizweight':
            if (!option_value(state.allopt.find(r => r.name === 'fixinv'))) reassign();
            update_inventory();
            break;
        case 'lit_corridor': case 'dark_room':
            vision_recalc(2);
            game.vision_full_recalc = 1;
            if (iflags.use_color) go.opt_need_redraw = true;
            break;
        case 'wizmgender': case 'showrace': case 'use_inverse': case 'hilite_pile':
        case 'perm_invent': case 'ascii_map': case 'tiled_map':
            go.opt_need_redraw = go.opt_need_glyph_reset = true;
            break;
        case 'hitpointbar':
            if (!game.windowprocs || (game.windowprocs.wincap2 & (0x8 | 0x80))) {
                status_reassess();
                go.opt_need_redraw = true;
            }
            break;
        case 'color': go.opt_need_redraw = go.opt_need_glyph_reset = true; break;
        case 'customcolors': go.opt_reset_customcolors = true; break;
        case 'customsymbols': go.opt_reset_customsymbols = true; break;
        case 'menucolors': case 'guicolor':
            update_inventory();
            go.opt_need_promptstyle = true;
            break;
        case 'mention_decor': iflags.prev_decor = STONE; break;
        case 'rest_on_space': update_rest_on_space(); break;
        case 'accessiblemsg': game.a11y.msg_loc = {x: 0, y: 0}; break;
        }
        if (state.give_opt_msg) await pline("'%s' option toggled %s.", row.name, !negated ? 'on' : 'off');
        return optn_ok;
    }
    if (req === get_val || req === get_cnf_val) {
        // C's caller supplies a mutable buffer for these requests.
        if (typeof opts !== 'object' || opts === null) throw new TypeError('Option get_val requires a text buffer');
        opts.text = '';
        return optn_ok;
    }
    return optn_ok;
}

export function can_set_perm_invent() {
    // expose their actual capabilities, not an assumed successful operation.
    if (!game.windowprocs || !(game.windowprocs.wincap & WC_PERM_INVENT)) return false;
    if (!game.iflags.perminv_mode) game.iflags.perminv_mode = 1;
    return true;
}


export async function reset_needed_visuals() {
    const go = game.go;
    /* C options.c: reset_glyphmap(gm_optionchange) before the redraw. */
    if (go.opt_need_glyph_reset) reset_glyphmap(3); /* gm_optionchange */
    if (go.opt_reset_customcolors || go.opt_update_basic_palette || go.opt_reset_customsymbols || go.opt_need_redraw) {
        if (go.opt_update_basic_palette) { missing('change_palette'); go.opt_update_basic_palette = false; }
        if (go.opt_reset_customcolors) reset_customcolors();
        if (go.opt_reset_customsymbols) reset_customsymbols();
        if (go.opt_need_redraw) { check_gold_symbol(); reglyph_darkroom(); }
        /* C display.c cls() -> display_nhwindow(WIN_MESSAGE, FALSE): a topline
         * still showing a message gets its --More-- before the screen clears. */
        /* a DEC->other symset change leaves the status rows blank (handler_symset)
         * until doset() ends, so this --More-- stands over them */
        game._status_blanked = game._decStaleFrom != null;
        if (game._pending_message) {
            /* tty more() shows the PHYSICAL screen as of the last flush: silent
             * option toggles after the last pline (give_opt_msg FALSE) changed
             * the gbuf and status fields, but nothing painted them. */
            const release = use_last_flush_snapshot();
            if (game._paintedSnapshot && game._lastPaintedBotl)
                game._paintedSnapshot.botl = game._lastPaintedBotl;
            game._moreFromCls = game._statusHeldPhysical = true;
            try { await force_more(game._pending_message); } finally { game._moreFromCls = game._statusHeldPhysical = false; }
            release();
        }
        game._pending_message = '';
        game._status_blanked = false;
        await docrt();
    }
    // C windows.c:1769-1776; tty prompts read iflags.menu_headings directly.
    if (go.opt_need_promptstyle) go.opt_need_promptstyle = false;
    if (game.disp.botl || game.disp.botlx) await bot();
    go.opt_need_redraw = go.opt_need_glyph_reset = false;
    go.opt_reset_customcolors = go.opt_reset_customsymbols = go.opt_update_basic_palette = false;
}

export async function toggle_bool_option(p) {
    const allopt = option_state().allopt;
    let ret = ECMD_FAIL;
    for (let i = 0; i < allopt.length; ++i) {
        if (prefix(p, allopt[i].name, p.length) && allopt[i].type === 'B'
            && allopt[i].setwhere === 'set_in_game' && allopt[i].addr) {
            const buf = `${option_value(allopt[i]) ? '!' : ''}${allopt[i].name}`;
            if (await parseoptions(buf, false, false)) ret = ECMD_OK;
            await reset_needed_visuals();
        }
    }
    return ret;
}

// global.h's NHSTDC M(c) subtracts 128, then txt2key returns uchar.
// Unlike escapes()'s explicit OR, applying M to a high byte clears its bit.
const C = c => c & 0x1f, M = c => (c - 128) & 0xff;

const highc = c => c >= 97 && c <= 122 ? c - 32 : c;

const at = (s, i) => i < s.length ? s.charCodeAt(i) & 0xff : 0;

// options.c:6896. Result bytes include embedded NULs; txt2key consumes only
// the first byte, just as C does after escape expansion into its local buffer.
export function escapes(cp) {
    const oct = '01234567', dec = '0123456789', hexdd = '00112233445566778899aAbBcCdDeEfF';
    let tp = '', i = 0;
    while (at(cp, i)) {
        const meta = cp[i] === '\\' && (cp[i + 1] === 'm' || cp[i + 1] === 'M') && at(cp, i + 2);
        if (meta) i += 2;
        let cval = 0, dcount = 0;
        if ((cp[i] !== '\\' && cp[i] !== '^') || !at(cp, i + 1)) {
            cval = at(cp, i++);
        } else if (cp[i] === '^') {
            cval = C(at(cp, ++i));
            ++i;
        } else if (dec.includes(cp[i + 1])) {
            ++i;
            do { cval = cval * 10 + at(cp, i) - 48; }
            while (at(cp, ++i) && dec.includes(cp[i]) && ++dcount < 3);
        } else if ((cp[i + 1] === 'o' || cp[i + 1] === 'O') && at(cp, i + 2) && oct.includes(cp[i + 2])) {
            i += 2;
            do { cval = cval * 8 + at(cp, i) - 48; }
            while (at(cp, ++i) && oct.includes(cp[i]) && ++dcount < 3);
        } else if ((cp[i + 1] === 'x' || cp[i + 1] === 'X') && at(cp, i + 2) && hexdd.includes(cp[i + 2])) {
            i += 2;
            do { cval = cval * 16 + Math.trunc(hexdd.indexOf(cp[i]) / 2); }
            while (at(cp, ++i) && hexdd.includes(cp[i]) && ++dcount < 2);
        } else {
            ++i;
            switch (cp[i]) {
            case '\\': cval = 92; break;
            case 'n': cval = 10; break;
            case 't': cval = 9; break;
            case 'b': cval = 8; break;
            case 'r': cval = 13; break;
            default: cval = at(cp, i); break;
            }
            ++i;
        }
        if (meta) cval |= 0x80;
        tp += String.fromCharCode(cval & 0xff);
    }
    return tp;
}

export function txt2key(txt) {
    let makemeta = false;
    txt = trimspaces(txt.split('\0', 1)[0]);
    if (!txt) return 0;
    if (!txt[1]) return at(txt, 0);
    if (txt === '<enter>') return 10;
    if (txt === '<space>') return 32;
    if (txt === '<esc>') return 27;
    if (txt[0] === '\\') return at(escapes(txt.slice(0, 127)), 0); // QBUFSZ - 1
    if (highc(at(txt, 0)) === 77) {
        txt = txt.slice(1);
        if (txt[0] === '-' && txt[1]) txt = txt.slice(1);
        if (!txt[1]) return M(at(txt, 0));
        makemeta = true;
    }
    if (txt[0] === '^' || highc(at(txt, 0)) === 67) {
        let uc = at(txt, 0);
        if (!txt[1]) return makemeta ? M(uc) : uc;
        txt = txt.slice(1);
        if (txt[0] === '-' && txt[1]) txt = txt.slice(1);
        if (txt[0] === '?') return makemeta ? 255 : 127;
        uc = C(at(txt, 0));
        return makemeta ? M(uc) : uc;
    }
    if (makemeta && txt[0]) return M(at(txt, 0));
    if (txt[0] >= '0' && txt[0] <= '9') {
        let key = 0;
        for (let i = 0; i < 3; i++) {
            const c = at(txt, i);
            if (c < 48 || c > 57) return 0;
            key = (10 * key + c - 48) & 0xff;
        }
        return key;
    }
    return 0;
}

// C options.c:694,5452: OPTIONS= uses the same menu aliases as BINDINGS=.
export function check_misc_menu_command(opts) {
    const name = opts.split(/[:=]/, 1)[0].trimEnd().toLowerCase();
    return default_menu_cmd_info.findIndex(row => row[0] === name);
}

export function illegal_menu_cmd_key(c) {
    if (!c || [13, 10, 27, 32].includes(c) || (c >= 48 && c <= 57)
        || (c >= 65 && c <= 90) || (c >= 97 && c <= 122)) {
        config_error_add("Reserved menu command key '%s'", visctrl(c));
        return true;
    }
    if (def_char_to_objclass(c) !== 18) {
        config_error_add("Menu command key '%s' is an object class", visctrl(c));
        return true;
    }
    return false;
}

export function add_menu_cmd_alias(from_ch, to_ch) {
    game.n_menu_mapped ??= 0;
    game.mapped_menu_cmds ??= '';
    game.mapped_menu_op ??= '';
    if (game.n_menu_mapped >= 32) {
        // C pline() can block here. This synchronous startup bridge cannot
        // yet represent that window lifecycle; do not silently drop the effect.
        throw new Error('menu-map overflow requires the startup message lifecycle');
    }
    game.mapped_menu_cmds += String.fromCharCode(from_ch & 0xff);
    game.mapped_menu_op += String.fromCharCode(to_ch & 0xff);
    ++game.n_menu_mapped;
}

export function get_menu_cmd_key(ch) {
    const index = (game.mapped_menu_op || '').indexOf(String.fromCharCode(ch & 0xff));
    return index < 0 ? ch : at(game.mapped_menu_cmds, index);
}

export function map_menu_cmd(ch) {
    const index = (game.mapped_menu_cmds || '').indexOf(String.fromCharCode(ch & 0xff));
    return index < 0 ? ch : at(game.mapped_menu_op, index);
}

// options.c:7596. Keep right-to-left recursion and C's special handling of
// a literal/escaped/quoted comma. Quoted keys still go through txt2key, whose
// C implementation does not generally accept quotes.
export function parsebindings(bindings) {
    let bind = bindings.indexOf(','), ret = true;
    if (bind >= 0) {
        if (bind === 0) bind = bindings.indexOf(',', bind + 1);
        else if (bindings[bind - 1] === '\\'
            || (bindings[bind - 1] === "'" && bindings[bind + 1] === "'"))
            bind = bindings.indexOf(',', bind + 2);
    }
    if (bind >= 0) {
        if (!parsebindings(bindings.slice(bind + 1))) ret = false;
        bindings = bindings.slice(0, bind);
    }
    bind = bindings.indexOf(':');
    if (bind < 0) return false;
    const command = trimspaces(bindings.slice(bind + 1));
    bindings = bindings.slice(0, bind);
    const mousebtn_names = ['mouse1', 'mouse2'];
    for (let i = 0; i < mousebtn_names.length; i++) {
        if (bindings !== mousebtn_names[i]) continue;
        if (!bind_mousebtn(i + 1, command)) config_error_add('Error binding mouse button %i', i + 1);
        else return ret;
    }
    const key = txt2key(bindings);
    if (!key) {
        config_error_add("Unknown key binding key '%s'", bindings);
        return false;
    }
    if (bind_specialkey(key, command)) return ret;
    for (const [name, menu_command] of default_menu_cmd_info) {
        if (command !== name) continue;
        if (illegal_menu_cmd_key(key)) {
            config_error_add('Bad menu key %s:%s', visctrl(key), command);
            return false;
        }
        add_menu_cmd_alias(key, menu_command.charCodeAt(0));
        return ret;
    }
    if (!bind_key(key, command, true)) {
        config_error_add("Unknown key binding command '%s'", command);
        return false;
    }
    return ret;
}

// ── ask_do_tutorial ──
// C ref: nethack-c/src/options.c:448 ask_do_tutorial()
// C ref: nethack-c/src/allmain.c:638-655 maybe_do_tutorial(), called from moveloop().
//
// Renders a PICK_ONE menu overlaid on the map showing:
//   - title "Do you want a tutorial?" in reverse video
//   - y/n options, blank, config hint, optional retry line, "(end)"
// Loops until 'y', 'n', or ESC. Returns boolean (true=do tutorial).
//
// C options.c:430-483: an explicit tutorial option returns its value without
// asking; only an unset option opens the menu.
//
// WIN_COL computation:
//   Longest line is the config hint (57 chars): 'Put "OPTIONS=!tutorial" in .nethackrc to skip this query.'
//   C: offx = COLNO - maxwidth - 2 = 80 - 57 - 2 = 21.
//
// Cursor: after "(end)" at WIN_COL + len("(end)") + 1 = 21 + 5 + 1 = 27.
//   C ref: tty select_menu PICK_ONE — cursor ends one past last char of footer.
export async function ask_do_tutorial() {
    const g = game;
    // C options.c:432-434,483 — obey either configured value without a menu.
    if (g.tutorial_set_in_config) return !!g.flags.tutorial;
    const u = g.u;
    /* C tty_display_nhwindow's NHW_MENU arm clears WIN_MESSAGE before
     * drawing an overlay (wintty.c:1939-1940), including after WIN_STOP. */
    g._pending_message = '';
    // C ref: options.c:463-465 — Snprintf buf with rc basename.
    const configHint = 'Put "OPTIONS=!tutorial" in .nethackrc to skip this query.';
    // This is a select_menu()/tty_end_menu() picklist ending in "(end)", so it
    // takes the `min(41, 78 - maxcol)` branch of tty_window_offx() — one column
    // LEFT of the "--More--" branch that com_pager_legacy() uses.  The config
    // hint is the longest line at 57 visible columns (the reverse-video title
    // is 23 once its SGR escapes are discounted, the retry line 27, "(end)" 5),
    // so this evaluates to min(41, 78 - 57) = 21 on every pass.
    // i.e. content column 21.
    const footerKind = 'end';
    // The real uac at tutorial time (find_ac has already run inside u_init_skills_discoveries).
    const uac = u?.uac ?? 0;
    /* C ref: win/tty/wintty.c:1329 process_menu_window — the two selectable
     * entries, in mlist order.  `str` is what tty_add_menu stored ("%c - %s"),
     * which is both what is drawn and what MENU_SEARCH's pmatchi() matches
     * against (wintty.c:1714 `pmatchi(searchbuf, curr->str)`). */
    const mlist = [
        { selector: 'y', str: 'y - Yes, do a tutorial' },
        { selector: 'n', str: 'n - No, just start play' },
    ];
    const RESP_EXPLICIT = mlist.map((m) => m.selector).join(''); /* "yn" */
    const RESP = RESP_EXPLICIT + ' ' + '0123456789\x1b\n\r' + '^|><.-@,\\~:';
    let pass = 0;
    /* C ref: options.c:449-472 — do { build; select_menu } while (!n). */
    for (;;) {
        // C ref: options.c:466-494 — build window lines for this iteration.
        const windowLines = [
            /* tty_end_menu adds the prompt with tty_menu_promptstyle = iflags.menu_headings
             * (wintty.c:2680-2689, windows.c:1769, options.c:5790) */
            menu_heading_text('Do you want a tutorial?'),
            '', // blank separator (add_menu_str)
            // C windows.c:1803-1807 colors the raw descriptions; tty paints
            // them after the selector (wintty.c:1449-1456).
            menucolor_row(mlist[0].str), // a_char='y' option
            menucolor_row(mlist[1].str), // a_char='n' option
            '', // blank separator (add_menu_str)
            menucolor_text(configHint), // add_menu_str(buf)
        ];
        if (pass > 0) {
            // C ref: options.c:481-482 — after first invalid key, add retry line.
            windowLines.push(menucolor_text("(Please choose 'y' or 'n'.)"));
        }
        windowLines.push('(end)'); // tty footer line for single-page menus
        /* C ref: wintty.c:1925-1928 — `!iflags.menu_overlay` drops the menu to
         * offx 0 and clears the whole screen; the content is drawn at column 1. */
        const fullScreen = g.iflags?.menu_overlay === false || g.iflags?.menu_overlay === 0;
        const WIN_COL = fullScreen ? 1 : tty_window_offx(windowLines, footerKind);
        // Cursor: at end of "(end)" row, one past last character.
        // C: tty select_menu positions cursor after last char of footer row.
        // "(end)" is 5 chars at column WIN_COL → cursor at WIN_COL + 5 + 1 = 27.
        const endRow = windowLines.length - 1; // 0-indexed screen row of "(end)"
        const endCursorCol = WIN_COL + 5 + 1; // 21 + 5 + 1 = 27
        const disp = g?.nhDisplay;
        let titleErased = false;
        /* C ref: wintty.c:1393-1398 — `counting`/`count` survive exactly one
         * further iteration after a digit (reset_count is cleared by the digit
         * arm and re-armed at the top of the next pass), and ESC while counting
         * only stops the count instead of cancelling the menu. */
        let counting = false, count = 0, reset_count = true;
        /* C: select_menu()'s return — -1 cancelled, 0 nothing picked, 1 picked. */
        let n = 0, picked = null, finished = false;
        while (!finished) {
            if (reset_count) { counting = false; count = 0; }
            else reset_count = true;
            const lines = titleErased ? ['', ...windowLines.slice(1)] : windowLines;
            // Build the combined map+window overlay screen.
            // uac: pass the real post-find_ac value for _statusLine2().
            g._screen_output = fullScreen
                ? lines.map((ln) => (ln === '' ? '' : ' ' + ln)).join('\n')
                : build_window_screen(lines, WIN_COL, uac);
            if (disp) {
                disp.cursorCol = endCursorCol;
                disp.cursorRow = endRow;
            }
            const keyCode = await nhgetch();
            const morc = typeof keyCode === 'number' ? String.fromCharCode(keyCode) : String(keyCode || '');
            /* C ref: getline.c:230-257 xwaitforspace(resp) — '\n'/'\r' always
             * break, ESC breaks under iflags.cbreak, and so does any member of
             * `resp`.  Anything else rings the bell and is re-read, leaving the
             * frame identical. */
            if (keyCode !== 10 && keyCode !== 13 && keyCode !== 27
                && RESP.indexOf(morc) < 0) {
                reset_count = false; /* the loop never turned over: keep the count */
                continue;
            }
            /* C ref: wintty.c:1558-1563 — an explicit page selector is taken as
             * a choice even when it also happens to be a mapped menu command. */
            const explicit = RESP_EXPLICIT.indexOf(morc) >= 0;
            if (!explicit && morc >= '0' && morc <= '9') {
                /* C ref: wintty.c:1565-1600 — accumulate a count.  gacc is
                 * empty here, so the group-accelerator shortcut cannot fire. */
                count = count * 10 + (morc.charCodeAt(0) - 48);
                if (count !== 0) { counting = true; reset_count = false; }
                continue;
            }
            if (!explicit && keyCode === 27) {
                /* C ref: wintty.c:1602-1613 — cancel, unless a count is live,
                 * in which case ESC only stops the count. */
                g._ttyDismissMore = 1; /* getline.c:245-247 — dmore's xwaitforspace */
                if (!counting) { n = -1; finished = true; }
                continue;
            }
            if (!explicit && (keyCode === 10 || keyCode === 13)) {
                /* C ref: wintty.c:1615-1620 — finished (commit) with nothing
                 * selected, so select_menu returns 0 and options.c's do-while
                 * re-asks with the "(Please choose 'y' or 'n'.)" line. */
                finished = true;
                continue;
            }
            if (!explicit && morc === ' ') {
                /* C ref: wintty.c:1622-1631 MENU_NEXT_PAGE — this menu is one
                 * page, so ' ' finishes it (and '>' deliberately does not). */
                finished = true;
                continue;
            }
            if (!explicit && morc === ':') {
                /* C ref: wintty.c:1700-1730 MENU_SEARCH. */
                const answer = await _menu_search(windowLines, WIN_COL, uac, titleErased);
                titleErased = true;
                if (!answer || answer === '\x1b')
                    continue; /* C: `if (!tmpbuf[0] || tmpbuf[0] == '\033') break;` */
                const searchbuf = `*${answer}*`;
                for (const curr of mlist) {
                    if (pmatchi(searchbuf, curr.str)) {
                        /* C: toggle_menu_curr(); PICK_ONE -> finished. */
                        picked = curr.selector;
                        n = 1;
                        finished = true;
                        break;
                    }
                }
                continue;
            }
            if (explicit) {
                /* C ref: wintty.c:1743-1752 — find, toggle; PICK_ONE finishes. */
                picked = morc;
                n = 1;
                finished = true;
                continue;
            }
            /* C ref: the remaining default_menu_cmds.  On a single-page
             * PICK_ONE menu with nothing selected, MENU_PREVIOUS_PAGE '<',
             * MENU_FIRST_PAGE '^', MENU_LAST_PAGE '|' and MENU_NEXT_PAGE '>'
             * all find their guard false, and MENU_SELECT_ALL '.',
             * MENU_INVERT_ALL '@', MENU_SELECT_PAGE ',' and MENU_INVERT_PAGE
             * '~' are PICK_ANY-only; MENU_UNSELECT_ALL '-' and
             * MENU_UNSELECT_PAGE '\\' run but have nothing to deselect.  All
             * of them re-loop with the frame unchanged. */
        }
        if (n < 0)
            return false; /* C options.c:471-474 — ESC: dotut = FALSE. */
        if (n > 0)
            return picked === 'y'; /* C options.c:468-470 */
        pass++; /* C options.c:481 `if (pass++)` */
    }
}

async function _menu_search(windowLines, WIN_COL, uac, titleAlreadyErased) {
    void titleAlreadyErased;
    return menu_search_getlin(() =>
        build_window_screen(['', ...windowLines.slice(1)], WIN_COL, uac).split('\n'));
}

// C options.c:7797-7810: the newest matching rule overrides the default,
// including an explicit "show" overriding Norep's no-repeat default.
// but its negative msgtype is none of NOREP/NOSHOW/STOP, so it acts as normal.
export function msgtype_type(msg, norepeat = false) {
    const rule = game.msgtypes?.find(rule => rule.regex.test(String(msg)));
    if (rule) return rule.negated ? 'show' : rule.type;
    return norepeat ? 'norep' : 'show';
}

export function oc_to_str(src) {
    let dest = '';
    for (const ch of (Array.isArray(src) ? src : String(src ?? '')))
        if (def_oc_syms_chars.includes(ch))
            dest += ch;
    return dest;
}

/* ── nh_getenv stub ─────────────────────────────────────────────────────── */
export function nh_getenv(name) {
    return null;  /* no environment variables in this port */
}

export function sym_val() { return 0; }

/* C ref: options.c:8094-8104 get_menu_cmd_key(ch) — remap a MENU_* default key
 * through gm.mapped_menu_op/gm.mapped_menu_cmds (filled by BINDINGS=key:menu_*
 * and MENUCOMMAND lines); this wrapper keeps the string-char calling form. */
function get_menu_cmd_key_cmd(ch) {
    const r = get_menu_cmd_key(ch.charCodeAt(0));
    return typeof r === 'number' ? String.fromCharCode(r) : r;
}

/* C ref: wintype.h:151-163 — the default menu command keys. */
const MENU_FIRST_PAGE = '^', MENU_LAST_PAGE = '|',
      MENU_NEXT_PAGE = '>', MENU_PREVIOUS_PAGE = '<',
      MENU_SELECT_ALL = '.', MENU_UNSELECT_ALL = '-', MENU_INVERT_ALL = '@',
      MENU_SELECT_PAGE = ',', MENU_UNSELECT_PAGE = '\\', MENU_INVERT_PAGE = '~',
      MENU_SEARCH = ':',
      MENU_SHIFT_RIGHT = '}', MENU_SHIFT_LEFT = '{';

/* C ref: options.c:332-356 default_menu_cmd_info[] — the menu commands
 * dokeylist()/show_menu_controls(dolist=TRUE) list, in table order. */
const DEFAULT_MENU_CMD_INFO = [
    { name: 'menu_next_page',     cmd: MENU_NEXT_PAGE,     desc: 'Go to next page' },
    { name: 'menu_previous_page', cmd: MENU_PREVIOUS_PAGE, desc: 'Go to previous page' },
    { name: 'menu_first_page',    cmd: MENU_FIRST_PAGE,    desc: 'Go to first page' },
    { name: 'menu_last_page',     cmd: MENU_LAST_PAGE,     desc: 'Go to last page' },
    { name: 'menu_select_all',    cmd: MENU_SELECT_ALL,    desc: 'Select all items in entire menu' },
    { name: 'menu_invert_all',    cmd: MENU_INVERT_ALL,    desc: 'Invert selection for all items' },
    { name: 'menu_deselect_all',  cmd: MENU_UNSELECT_ALL,  desc: 'Unselect all items in entire menu' },
    { name: 'menu_select_page',   cmd: MENU_SELECT_PAGE,   desc: 'Select all items on current page' },
    { name: 'menu_invert_page',   cmd: MENU_INVERT_PAGE,   desc: "Invert current page's selections" },
    { name: 'menu_deselect_page', cmd: MENU_UNSELECT_PAGE, desc: 'Unselect all items on current page' },
    { name: 'menu_search',        cmd: MENU_SEARCH,        desc: 'Search and invert matching items' },
    { name: 'menu_shift_right',   cmd: MENU_SHIFT_RIGHT,   desc: 'Pan current page to right (perm_invent only)' },
    { name: 'menu_shift_left',    cmd: MENU_SHIFT_LEFT,    desc: 'Pan current page to left (perm_invent only)' },
];

export function show_menu_controls(dolist) {
    const hardcoded = [
        { key: 'Return', desc: 'Accept current choice(s) and dismiss menu' },
        { key: 'Enter',  desc: 'Same as Return' },
        { key: 'Space',  desc: 'If not on last page, advance one page;' },
        { key: '     ',  desc: 'when on last page, treat like Return' },
        { key: 'Escape', desc: 'Cancel menu without making any choice(s)' },
    ];
    const mc_fmt = (a, b, c) => `${_pad_r(a, 8)}     ${_pad_l(b, 6)} ${c}`;
    const mc_altfmt = (a, b, c) => `${_pad_r(a, 9)}  ${_pad_l(b, 6)} ${c}`;
    const has_menu_shift = false;   /* wc2_supported("menu_shift") — see above */
    const win = [];
    let fmt, arg;

    win.push('Menu control keys:');
    if (dolist) {
        /* '?i' key-bindings help — dokeylist's caller.  Not reached by the
         * help menu's item 'l'; ported with dokeylist. */
        fmt = (a, b, c) => `${a}${_pad_l(b, 7)} ${c}`;
        for (const mc of DEFAULT_MENU_CMD_INFO) {
            if ((mc.cmd === MENU_SHIFT_RIGHT || mc.cmd === MENU_SHIFT_LEFT)
                && !has_menu_shift)
                continue;
            win.push(fmt('', visctrl(get_menu_cmd_key_cmd(mc.cmd).charCodeAt(0)), mc.desc));
        }
        arg = '';   /* no extra prefix for 'dolist' */
    } else {
        win.push('');
        win.push(mc_altfmt('', 'Whole', 'Current'));
        win.push(mc_altfmt('', ' Menu', ' Page'));
        win.push(mc_fmt('Select',
                        visctrl(get_menu_cmd_key_cmd(MENU_SELECT_ALL).charCodeAt(0)),
                        visctrl(get_menu_cmd_key_cmd(MENU_SELECT_PAGE).charCodeAt(0))));
        win.push(mc_fmt('Invert',
                        visctrl(get_menu_cmd_key_cmd(MENU_INVERT_ALL).charCodeAt(0)),
                        visctrl(get_menu_cmd_key_cmd(MENU_INVERT_PAGE).charCodeAt(0))));
        win.push(mc_fmt('Deselect',
                        visctrl(get_menu_cmd_key_cmd(MENU_UNSELECT_ALL).charCodeAt(0)),
                        visctrl(get_menu_cmd_key_cmd(MENU_UNSELECT_PAGE).charCodeAt(0))));
        win.push('');
        win.push(mc_fmt('Go to',
                        visctrl(get_menu_cmd_key_cmd(MENU_NEXT_PAGE).charCodeAt(0)),
                        'Next page'));
        win.push(mc_fmt('', visctrl(get_menu_cmd_key_cmd(MENU_PREVIOUS_PAGE).charCodeAt(0)),
                        'Previous page'));
        win.push(mc_fmt('', visctrl(get_menu_cmd_key_cmd(MENU_FIRST_PAGE).charCodeAt(0)),
                        'First page'));
        win.push(mc_fmt('', visctrl(get_menu_cmd_key_cmd(MENU_LAST_PAGE).charCodeAt(0)),
                        'Last page'));
        if (has_menu_shift) {
            win.push(mc_fmt('Pan view',
                            visctrl(get_menu_cmd_key_cmd(MENU_SHIFT_RIGHT).charCodeAt(0)),
                            'Right (perm_invent only)'));
            win.push(mc_fmt('', visctrl(get_menu_cmd_key_cmd(MENU_SHIFT_LEFT).charCodeAt(0)),
                            'Left'));
        }
        win.push('');
        win.push(mc_fmt('Search', visctrl(get_menu_cmd_key_cmd(MENU_SEARCH).charCodeAt(0)),
                        'Exter a target string and invert all matching entries'));
        /* separator before hardcoded */
        win.push('');
        fmt = (a, b, c) => `${_pad_r(a, 9)}  ${_pad_l(b, 8)} ${c}`;
        arg = 'Other ';   /* prefix for the first hardcoded[] entry, then reset */
    }
    for (const xcp of hardcoded) {
        win.push(fmt(arg, xcp.key, xcp.desc));
        arg = '';
    }
    return win;
}

/* C ref: options.c:8735 term_for_boolean — booleanterms[value][termpref]. */
const BOOLEAN_TERMS = [
    ['false', 'off', 'disabled', 'excluded from build'],
    ['true', 'on', 'enabled', 'included'],
];

const TERMPREF = { Term_False: 0, Term_Off: 1, Term_Disabled: 2, Term_Excluded: 3 };

/* C ref: options.c:8735 term_for_boolean(idx, b). */
export function term_for_boolean(row, value) {
    const i = TERMPREF[row.term] || 0;
    return BOOLEAN_TERMS[value ? 1 : 0][i];
}
