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
import { parsebindings, parseautocomplete, optfn_number_pad_set, escapes, check_misc_menu_command, set_misc_menu_command } from './cmd_config.js';
import { config_error_add } from './cmd_binds.js';
import { str2role, str2race, str2gend, str2align, setrolefilter, gr as roleGlobals } from './roles.js';
import { glyphrep_to_custom_map_entries } from './glyphs.js';
import { config_line_error, config_statement, choose_random_part, config_error_nextline, is_config_section, parse_autopickup_exception, parse_msgtype } from './cfgfiles.js';
import { add_menu_coloring, match_str2clr, attr2attrname } from './coloratt.js';
import { TtyMenu, PICK_NONE, PICK_ONE, PICK_ANY, ATR_NONE } from './tty_menu.js';
import { getlin } from './wizcmds.js';
import { mungspaces } from './mklev.js';
import { pline, nh_sprintf } from './display.js';
import { optfn_sortdiscoveries_set, get_sortdisco } from './o_init.js';
// C options.c:6768 match_optname compares names case-insensitively; keep
// the native storage field (for example, flags.goldX) from the matched row.
const booleanStorage = new Map(DOSET_BOOLS.map(row => [row.name.toLowerCase(), row]));
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

/* C ref: botl.c:817 condtests[].useroption */
const COND_USEROPTIONS = ['barehanded', 'blind', 'busy', 'conf', 'deaf', 'iron', 'fly',
    'foodPois', 'glowhands', 'grab', 'hallucinat', 'held', 'ice', 'lava', 'levitate', 'paralyzed',
    'ride', 'sleep', 'slime', 'slip', 'stone', 'strngl', 'stun', 'submerged', 'termIll', 'tethered',
    'trap', 'unconscious', 'woundedlegs', 'holding'];

/* C ref: botl.c:1354-1371 parse_cond_option(); returns 0 ok, 1 unknown, 2 too short.
 * The per-condition choice flags are not modelled here (condopt()). */
function parse_cond_option(opts) {
    const prefixLen = 5; /* sizeof "cond_" - 1 */
    if (!opts || opts.length <= prefixLen)
        return 2;
    const uniqpart = opts.slice(prefixLen);
    for (const compareto of COND_USEROPTIONS) {
        const minlen = compareto.length >= 4 ? 4 : compareto.length;
        if (uniqpart.length >= minlen && compareto.toLowerCase().startsWith(uniqpart.toLowerCase()))
            return 0;
    }
    return 1;
}

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
const COND_NAMES = ['Bare', 'Blind', 'Busy', 'Conf', 'Deaf', 'Iron', 'Fly', 'FoodPois', 'Glow',
    'Grab', 'Hallu', 'Held', 'Icy', 'InLava', 'Lev', 'Parlyz', 'Ride', 'Zzz', 'Slime', 'Slip',
    'Stone', 'Strngl', 'Stun', 'Submrg', 'TermIll', 'Teth', 'Trap', 'Out', 'WLegs', 'UHold'];
const COND_ALIASES = ['strangled', 'all', 'major_troubles', 'minor_troubles', 'movement', 'opt_in'];

/* C ref: botl.c:3167-3201 match_str2conditionbitmask() — truthiness only */
function match_str2conditionbitmask(str) {
    const fz = (t) => t.toLowerCase().replace(/[ \-_]/g, '');
    const f = fz(str);
    if (!f) return false;
    if (COND_NAMES.some(n => fz(n) === f)) return true;
    if (COND_ALIASES.some(n => fz(n) === f)) return true;
    return COND_ALIASES.some(n => n.toLowerCase().startsWith(str.toLowerCase()));
}

/* C ref: botl.c:2593-2650 parse_status_hl1() tokenisation + botl.c:2468
 * fldname_to_bl_indx() + the first-threshold classification of
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
        const t = hsbuf[1] || '';
        const next = hsbuf[2] || '';
        if (!next || t === 'always' || t === 'up' || t === 'down' || t === 'changed'
            || (f === 'hitpoints' && t === 'criticalhp'))
            return null;
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
    let chosen = null, current = null, buf = null;
    for (let line of rc_fgets_lines(rc)) {
        if (errors() > initialErrors) return; // config_error_nextline(), secure rc
        const more = line.endsWith('\\');
        if (more) line = line.slice(0, -1);
        line = line.replace(/[ \t\r]+$/, '');
        if (game.config_error_data && !config_error_nextline(line)) return;
        const ep = line.replace(/^[ \t]+/, '');
        const ignore = !ep || ep[0] === '#';
        const old = buf !== null;
        if (!ignore) buf = old ? buf + ' ' + ep : ep;
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
}

/* C options.c:4025-4032 optfn_statushilites(do_set). */
export function optfn_statushilites_set(iflags, op, negated = false) {
    const n = op ? (parseInt(op, 10) || 0) : 3;
    iflags.hilite_delta = negated ? 0 : n < 0 ? 1 : n;
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
    return true;
}

export async function optfn_boulder_set(op) {
    const errors = [];
    const changed = set_boulder_symbol(game, 'boulder:' + op, op, false,
        (...args) => errors.push(args));
    for (const args of errors) {
        const message = nh_sprintf(...args);
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

// C options.c:884 and parse_role_opt(:7905). Only the rc-file phase enters
// parseNethackrc; saved values here preserve that phase's duplicate/filter
// semantics. Configuration-file export and C string ownership are separate.
function optfn_alignment(result, opts, op, negated, state) {
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
            config_error_add("Negated nothing for '%s'", 'alignment');
            return;
        }
        if (!first) {
            if (val_negated !== prev_negated || (negated && val_negated)) {
                config_error_add("Invalid mixed negation for '%s%s'", negated ? '!' : '', 'alignment');
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
            if (!state.saved?.startsWith('!')) roleGlobals.rfilter.mask &= ~7; // ROLE_ALIGNMASK
            if (!setrolefilter(value)) {
                config_error_add("Invalid %s '%s'", 'alignment', value);
                return;
            }
            // rolefilterstring(RS_ALGNMNT) returns empty if only another
            // character facet was named (setrolefilter accepts all four).
            state.saved = ['lawful', 'neutral', 'chaotic']
                .filter((_, i) => roleGlobals.rfilter.mask & (4 >> i))
                .map(name => '!' + name).join(' ');
            selected = '!';
        } else {
            if (duplicate && state.saved?.startsWith('!')) {
                const alias = opts.split(/[:=]/, 1)[0].trimEnd().toLowerCase() === 'align';
                config_error_add('compound option specified multiple times: alignment%s',
                    alias ? ' (via alias: align)' : '');
                return;
            }
            state.saved = value;
            selected = value;
        }
        op = space < 0 ? '' : op.slice(space + 1);
    }
    if (selected !== '!') {
        const n = str2align(selected);
        if (n === ROLE_NONE) {
            result.align = '';
            config_error_add("Unknown %s '%s'", 'alignment', selected);
        } else {
            result.align = state.saved = n < 0 ? 'random' : ['lawful', 'neutral', 'chaotic'][n];
        }
    }
}

export function parseNethackrc(rc) {
    // C startup zeros gr.rfilter before reading any options. Keep the filter
    // available to both role_init and the played character-selection menu.
    roleGlobals.rfilter.roles.fill(false);
    roleGlobals.rfilter.mask = 0;
    game.rc_rolefilter = roleGlobals.rfilter;
    const alignmentState = { saved: null, duplicate: false };
    const compoundSeen = new Set();
    const compoundDuplicate = name => {
        if (compoundSeen.has(name))
            config_error_add('compound option specified multiple times: %s', name);
        compoundSeen.add(name);
    };
    const result = {
        name: '',
        role: '',
        race: '',
        gender: '',
        align: '',
        flags: { autounlock: 2, inv_order: [12, 5, 2, 3, 7, 9, 10, 8, 4, 11, 6, 13, 14, 15, 16] }, // options.c:118,1076
        iflags: { hilite_delta: 0 },
        uroleplay: {blind: false, deaf: false, nudist: false, pauper: false},
    };
    if (!rc)
        return result;
    let number_pad_seen = false, packorder_seen = false;
    const bool_dup_seen = new Set();
    const cfgerr_base = (game._config_errors || []).filter(m => typeof m === 'string').length;
    for (const rawLine of rc_logical_lines(rc)) {
        if ((game._config_errors || []).filter(m => typeof m === 'string').length > cfgerr_base)
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
            for (const entry of symbolsMatch[1].split(',')) {
                /* symbols.c parsesymbols(): a G_ glyph reference goes through
                 * glyphrep_to_custom_map_entries() (glyphs.c:111) */
                if (/^\s*G_/.test(entry))
                    glyphrep_to_custom_map_entries(entry.trim(), { value: 0 });
                /* C symbols.c loadsyms: an explicit S_<name>:<char> replaces the
                 * symset glyph for that cmap symbol.  Retained here only for the
                 * consumers that exist: S_pool, S_boulder and the wall cmap
                 * names resolved by _wall_angle_glyph (display.js). */
                const symMatch = entry.match(/^\s*(S_(?:pool|boulder|stone|vwall|hwall|tlcorn|trcorn|blcorn|brcorn|crwall|tuwall|tdwall|tlwall|trwall))\s*:\s*(.)/i);
                if (symMatch)
                    (result.symbolOverrides ||= {})['S_' + symMatch[1].slice(2).toLowerCase()] = symMatch[2];
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
                    (result.msgtypes ||= []).unshift({ type: rule.type, regex: new RegExp(rule.pattern) });
                } catch (e) { /* bad pattern: C reports and skips */ }
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
            if (hlerr)
                config_error_add(hlerr[0], hlerr[1]);
            else if (status_fieldname(hlop.split('/')[0]) === 'condition')
                (game.status_condition_hilites ||= []).push(hlop);
            else
                (game.status_field_hilites ||= []).push(hlop);
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
            // C options.c:2559 optfn_name -> string_for_opt(:6665): a
            // missing value reports an error and leaves plname unchanged.
            if (menuname === 'name' && !menunegated && !menuval) {
                config_error_add("Missing parameter for '%s'", menuopts);
                continue;
            }
            if (menuname === 'align' || (menuname.length >= 6 && 'alignment'.startsWith(menuname))) {
                optfn_alignment(result, menuopts, menuval, menunegated, alignmentState);
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
                    const cu = menuname.slice(5);
                    if (cu.length >= 4 && 'barehanded'.startsWith(cu))
                        result.flags.cond_barehanded = !menunegated;
                    if (cu.length >= 4 && 'busy'.startsWith(cu))
                        result.flags.cond_busy = !menunegated;
                    if (cu.length >= 4 && 'paralyzed'.startsWith(cu))
                        result.flags.cond_paralyzed = !menunegated;
                    if (cu.length >= 4 && 'sleep'.startsWith(cu))
                        result.flags.cond_sleep = !menunegated;
                    if (cu.length >= 4 && 'unconscious'.startsWith(cu))
                        result.flags.cond_unconscious = !menunegated;
                    if (cu.length >= 4 && 'tethered'.startsWith(cu))
                        result.flags.cond_tethered = !menunegated;
                    if (cu.length >= 4 && 'trap'.startsWith(cu))
                        result.flags.cond_trap = !menunegated;
                    if (cu.length >= 4 && 'woundedlegs'.startsWith(cu))
                        result.flags.cond_woundedlegs = !menunegated;
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
            if (menuname && !ALLOPT.some(r => r[0].toLowerCase().startsWith(menuname))) {
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
                if (hlerr) {
                    config_error_add(hlerr[0], hlerr[1]);
                    continue;
                }
                /* C botl.c:2593 parse_status_hl1() keeps the rule; a
                 * condition/<name>/<colour>&<attr> rule is carried to
                 * display.js, which paints the condition's own text. */
                const hlop = menuopts.slice(menusep + 1).trim();
                if (status_fieldname(hlop.split('/')[0]) === 'condition')
                    (game.status_condition_hilites ||= []).push(hlop);
                /* C botl.c:2593 parse_status_hl2(): a field rule (strength/always/yellow&inverse) is kept too; display.js paints the field's text. */
                else
                    (game.status_field_hilites ||= []).push(hlop);
                if (!result.iflags.hilite_delta) result.iflags.hilite_delta = 3;
            }
            /* C options.c:3446-3460 optfn_player_selection(do_set) */
            if (menuname.length >= 3 && 'player_selection'.startsWith(menuname)
                && !menunegated && menusep >= 0) {
                const psv = menuopts.slice(menusep + 1).trim();
                if (psv && !/^dialog/i.test(psv) && !/^prompt/i.test(psv)) {
                    config_error_add("Unknown %s parameter '%s'", 'player_selection', psv);
                    continue;
                }
            }
            if (/^font_(map|menu|message|status|text|size_(map|menu|message|status|text))$/.test(menuname)) {
                const fsize = menuname.startsWith('font_size_');
                const fval = menusep < 0 ? '' : menuopts.slice(menusep + 1);
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
                /* C options.c:5315-5320 optfn_boolean(): no IDLECHECKPOINT
                 * build, so this plines before any window exists (raw_print,
                 * in file order with the config errors). */
                if (boolRow[0] === 'idlecheckpoint')
                    (game._config_errors ||= []).push({ pline: "There is no underlying support for 'idlecheckpoint' compiled in." });
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
                const attrOf = (t) => ATTRS[t.trim().toLowerCase()] ?? -1;
                if (!op) {
                    result.iflags.menu_headings = { color: 8 /* NO_COLOR */, attr: menunegated ? 0 : 7 };
                } else if (!menunegated) {
                    let c = 8, a = 0, ok = true;
                    const amp = op.indexOf('&');
                    if (amp >= 0) {
                        const l = op.slice(0, amp), r = op.slice(amp + 1);
                        c = match_str2clr(l, false); a = attrOf(r);
                        if (c >= 16 && a === -1) { c = match_str2clr(r, false); a = attrOf(l); }
                        ok = !(c >= 16 || a === -1);
                    } else {
                        const t = attrOf(op);
                        if (t === -1) { c = match_str2clr(op, false); ok = c < 16; }
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
             * use_menu_glyphs = TRUE (do_init, options.c:2234). */
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
                result.iflags.use_menu_glyphs = true;
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
            if (boolRow && booleanStorage.has(boolRow[0].toLowerCase())) {
                if (booleanStorage.get(boolRow[0].toLowerCase()).wizNoFuz)
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
            const colonIdx = stripped.indexOf(':');
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
                    if (val[0] !== '!' && str2(val) === ROLE_NONE) {
                        config_error_add("Unknown %s '%s'",
                                         key, val);
                    } else {
                        result[key] = val;
                    }
                }
                else if (key === 'fruit' && !negated && val)
                    result.fruit = val; /* optfn_fruit -> svp.pl_fruit (options.c:1745) */
                else if (key === 'playmode' && val === 'debug')
                    result.flags.debug = true;
                else if (key === 'playmode' && val === 'explore')
                    result.flags.explore = true;
                else if (key === 'pettype' || key === 'pet') {
                    result.flags.pettype = val;
                    /* optfn_pettype do_set (options.c:3207-3227): first letter */
                    switch (String(val || '').charAt(0).toLowerCase()) {
                    case 'd': result.preferred_pet = 'd'; break;
                    case 'c': case 'f': result.preferred_pet = 'c'; break;
                    case 'h': case 'q': result.preferred_pet = 'h'; break;
                    case 'n': result.preferred_pet = 'n'; break;
                    }
                }
                /* C options.c optfn_roguesymset -> load_symset(ROGUESET): the Rogue
                 * IBM sets (dat/symbols "Handling: IBM", "Color: Yes") are the only
                 * ones HAS_ROGUE_IBM_GRAPHICS (display.c:2582) accepts. */
                else if (key === 'roguesymset') {
                    if (val && gs.symset && gs.symset[1]) {
                        gs.symset[1].name = val;
                        gs.symset[1].handling = /^Rogue(Epyx|IBM|Windows)$/.test(val) ? 1 : 0;
                    }
                }
                else if (key === 'symset') {
                    result.symset = val;
                    /* C options.c optfn_symset names the set as soon as the line is
                     * parsed, so a later SYMBOLS=G_x:...color finds a named symset
                     * (glyphs.c:to_custom_symset_entry_callback) and does not nag. */
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
                else if (key === 'petattr') {
                    const PETATTRS = { none: 0, normal: 0, bold: 1, dim: 2, italic: 3,
                                       underline: 4, uline: 4, blink: 5, inverse: 7, reverse: 7 };
                    const lv = (val || '').toLowerCase();
                    const itmp = negated ? 0
                        : Object.keys(PETATTRS).find((n) => n.startsWith(lv) && lv) !== undefined
                            ? PETATTRS[Object.keys(PETATTRS).find((n) => n.startsWith(lv))] : -1;
                    if (itmp !== -1) {
                        result.iflags.wc2_petattr = itmp;
                        result.iflags.wc_hilite_pet = itmp !== 0;
                    }
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
function add_autopickup_exception(mapping, state = game) {
    const m = parse_autopickup_exception(mapping);
    if (m) {
        try {
            new RegExp(m.pattern);
            (state.apelist ||= []).unshift(m);
            return 1;
        } catch (e) { /* regex error: C reports and skips */ }
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
            if (pattern) add_autopickup_exception(`"${pattern.slice(0, 255)}"`);
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
import { rnd, rn2 } from './rng.js';
/* C options.c:8194 makesingular(), :8204-8212 OBJ_NAME over the FOOD_CLASS
 * range, :8230-8236 name_to_mon()/ismnum() — fruitadd's user_specified name
 * rewrite reads all four. */
import { makesingular, makeplural } from './objnam.js';
import { name_to_mon } from './makemon.js';
import { ROLE_NONE, gs, ismnum, RUN_TPORT, RUN_LEAP, RUN_STEP, RUN_CRAWL,
    PARANOID_BONES } from './const.js';
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

/* C bones.c:198 sanitize_name(namebuf) — strip control characters, and
 * replace high-bit bytes unless the tty's eight_bit_tty option allows them.
 * Startup callers pass the option value accumulated at that rc-file line. */
export function sanitize_name(namebuf, strip_8th_bit = !game.iflags?.wc_eight_bit_input) {
    let out = '';
    for (let i = 0; i < namebuf.length; i++) {
        const ch = namebuf.charCodeAt(i) & 0xff;
        const c = ch & 0o177;
        if (c < 0x20 /* ' ' */ || c === 0o177)
            out += '.';
        else if (c !== ch && strip_8th_bit)
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
    /* C options.c:1748,6861 — nmcpy stops at comma/NUL and copies at most
     * PL_FSIZ - 1 (31) characters, before sanitizing or defaulting the name. */
    g.pl_fruit = sanitize_name(op.split(/[\0,]/, 1)[0].slice(0, 31));
    if (!g.pl_fruit)
        g.pl_fruit = 'slime mold';
    /* C options.c:1754-1756 — fruitadd(svp.pl_fruit, forig): svp.pl_fruit is
     * the argument, so this is the user_specified call. */
    fruitadd(g.pl_fruit, forig, true);
    /* C options.c:1757 — pline("Fruit is now \"%s\".", svp.pl_fruit), read
     * AFTER fruitadd, which may have singularised or "candied "-prefixed it. */
    return `Fruit is now "${g.pl_fruit}".`;
}

/* C botl.c:3477 count_status_hilites() -> status_hilite_linestr_countfield(BL_FLUSH):
 * one line per field threshold rule; condition rules are gathered one line per
 * distinct color/attr (botl.c:3487 status_hilite_linestr_gather_conditions). */
export function count_status_hilites() {
    let count = 0;
    for (const spec of game.status_field_hilites || []) {
        const parts = spec.split('/');
        count += Math.max(1, Math.trunc((parts.length - 1) / 2));
    }
    const seen = new Set();
    for (const spec of game.status_condition_hilites || []) {
        const parts = spec.toLowerCase().split('/');
        seen.add(parts.slice(2).join('/').split(/[&+]/).map(s => s.trim()).sort().join('&'));
    }
    return count + seen.size;
}

/* C options.c:1861-1876 optfn_hilite_status(do_set) reached from doset()'s
 * getlin path (options.c:8944-8953 -> parseoptions): parse_status_hl1() keeps
 * the rule exactly as the config-file path above does.  Returns the first
 * config_error text (or null) so the caller can pline it. */
export function optfn_hilite_status_set(op) {
    if (!op) return "Value is mandatory for hilite_status";
    const hlerr = hilite_status_config_error(op);
    if (hlerr) return hlerr[0].replace('%s', hlerr[1]);
    if (status_fieldname(op.split('/')[0]) === 'condition')
        (game.status_condition_hilites ||= []).push(op);
    else
        (game.status_field_hilites ||= []).push(op);
    if (!game.iflags.hilite_delta) game.iflags.hilite_delta = 3;
    return null;
}
