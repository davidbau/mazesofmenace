// options.js — Parse .nethackrc options.
// C ref: options.c — handles OPTIONS=, BIND=, etc.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { NO_COLOR } from './terminal.js';
import { ere_compile } from './pickup.js';
import { EXTCMD_TABLE } from './cmd_data.js';
// role.c str2role()/str2race()/str2gend()/str2align() and the races/genders/
// aligns tables: optfn_role() &c validate their value with these, and
// setrolefilter() builds gr.rfilter out of the same masks.
import { str2role, str2race, str2gend, str2align,
         races, genders, aligns } from './role.js';
import { ROLE_NONE, ROLE_RANDOM } from './const.js';

// ---------------------------------------------------------------------------
// option_help() — the "List of game options." help topic ('?g').
//
// C ref: options.c option_help() builds a full-screen NHW_TEXT window listing
// the intro blurb, every Boolean option name (comma-wrapped by next_opt()), the
// Compound options with their descriptions ("%-20s - %s"), the "Other settings"
// names, and a trailing epilog, then pages it with "--More--".  The data below
// is the (already build/interface-filtered, non-wizard) allopt[] table this tty
// build presents: the survivors of option_help()'s BoolOpt / CompOpt / OthrOpt
// loops with their setwhere and is_wc/wc2 filters applied.  It's static (no
// seed/game state), so it reproduces C's window for every session identically.

// get_configfile(): the run-time configuration file path substituted into the
// intro line.  It comes from the RECORDING ENVIRONMENT rather than from the
// game.  docs/recording-environment.md (upstream, 2026-08-18) documents that
// environment and rules that "Hard-coding them is fine": the harness set HOME
// to its own results directory and wrote each session's nethackrc to
// $HOME/.nethackrc before every launch, so NetHack reports this same path for
// EVERY session — held-out included.  tty_putstr()'s line-break-on-overflow
// (ported below as wput()) splits on the string's exact length, so it has to
// be verbatim.
const OPT_CONFIGFILE =
    '/Users/davidbau/git/mazesofmenace/teleport/maud/test/comparison/c-harness/results/.nethackrc';

// Boolean option names, in allopt[] order (option_help() BoolOpt loop output).
const OPT_BOOL = [
    'accessiblemsg', 'acoustics', 'altmeta', 'armorstatus', 'autodescribe',
    'autodig', 'autoopen', 'autopickup', 'autoquiver', 'bgcolors', 'blind',
    'bones', 'checkpoint', 'cmdassist', 'color', 'confirm', 'customcolors',
    'customsymbols', 'dark_room', 'deaf', 'dropped_nopick', 'eight_bit_tty',
    'extmenu', 'female', 'fireassist', 'fixinv', 'force_invmenu', 'goldX',
    'help', 'herecmd_menu', 'hilite_pet', 'hilite_pile', 'hitpointbar',
    'idlecheckpoint', 'ignintr', 'implicit_uncursed', 'legacy', 'lit_corridor',
    'lootabc', 'mail', 'mention_decor', 'mention_map', 'mention_walls',
    'menu_overlay', 'menucolors', 'mon_movement', 'news', 'nudist', 'null',
    'pauper', 'pickup_stolen', 'pickup_thrown', 'price_quotes', 'pushweapon',
    'query_menu', 'quick_farsight', 'reroll', 'rest_on_space', 'safe_pet',
    'safe_wait', 'selectsaved', 'showdamage', 'showexp', 'showrace', 'showvers',
    'silent', 'sortpack', 'sounds', 'sparkle', 'spot_monsters', 'standout',
    'status_updates', 'terrainstatus', 'time', 'tips', 'tombstone', 'toptenwin',
    'travel', 'tutorial', 'use_darkgray', 'use_inverse', 'use_truecolor',
    'verbose', 'voices', 'weaponstatus', 'whatis_menu', 'whatis_moveskip',
];

// Compound option [name, description] pairs, in allopt[] order (option_help()
// CompOpt loop; descriptions are allopt[].descr).
const OPT_COMPOUND = [
    ['windowtype', 'windowing system to use (should be specified first)'],
    ['playmode', 'normal play, non-scoring explore mode, or debug mode'],
    ['name', "your character's name (e.g., name:Merlin-W)"],
    ['role', 'your starting role (e.g., Barbarian, Valkyrie)'],
    ['race', 'your starting race (e.g., Human, Elf)'],
    ['gender', 'your starting gender (male or female)'],
    ['alignment', 'your starting alignment (lawful, neutral, or chaotic)'],
    ['altkeyhandling', '(not applicable)'],
    ['autounlock', 'action to take when encountering locked door or chest'],
    ['boulder', 'deprecated (use S_boulder in sym file instead)'],
    ['catname', 'name of your starting pet if it is a kitten'],
    ['crash_email', 'email address for reporting'],
    ['crash_name', 'your name for reporting'],
    ['crash_urlmax', 'length of longest url we can generate'],
    ['DECgraphics', 'load DECGraphics display symbols into symset'],
    ['disclose', 'the kinds of information to disclose at end of game'],
    ['dogname', 'name of your starting pet if it is a little dog'],
    ['dungeon', 'list of symbols to use in drawing the dungeon map'],
    ['effects', 'list of symbols to use in drawing special effects'],
    ['fruit', 'name of a fruit you enjoy eating'],
    ['glyph', 'set representation of a glyph to a unicode value and color'],
    ['hilite_status', 'a status highlighting rule (can occur multiple times)'],
    ['horsename', 'name of your starting pet if it is a pony'],
    ['IBMgraphics', 'load IBMGraphics display symbols into symset'],
    ['menu_deselect_all', 'deselect all items in a menu'],
    ['menu_deselect_page', 'deselect all items on this page of a menu'],
    ['menu_first_page', 'jump to the first page in a menu'],
    ['menu_headings', 'display style for menu headings'],
    ['menu_invert_all', 'invert all items in a menu'],
    ['menu_invert_page', 'invert all items on this page of a menu'],
    ['menu_last_page', 'jump to the last page in a menu'],
    ['menu_next_page', 'go to the next menu page'],
    ['menu_objsyms', 'show object symbols in menus'],
    ['menu_previous_page', 'go to the previous menu page'],
    ['menu_search', 'search for a menu item'],
    ['menu_select_all', 'select all items in a menu'],
    ['menu_select_page', 'select all items on this page of a menu'],
    ['menu_shift_left', 'pan current menu page left'],
    ['menu_shift_right', 'pan current menu page right'],
    ['menuinvertmode', 'experimental behavior of menu inverts'],
    ['menustyle', 'user interface for object selection'],
    ['monsters', 'list of symbols to use for monsters'],
    ['msg_window', 'control of "view previous message(s)" (^P) behavior'],
    ['msghistory', 'number of top line messages to save'],
    ['number_pad', 'use the number pad for movement'],
    ['objects', 'list of symbols to use for objects'],
    ['packorder', 'the inventory order of the items in your pack'],
    ['paranoid_confirmation', 'extra prompting in certain situations'],
    ['petattr', 'attributes for highlighting pets'],
    ['pettype', 'your preferred initial pet type'],
    ['pickup_burden', 'maximum burden picked up before prompt'],
    ['pickup_types', 'types of objects to pick up automatically'],
    ['pile_limit', 'threshold for "there are many objects here"'],
    ['roguesymset', 'load a set of rogue display symbols from symbols file'],
    ['runmode', "display frequency when `running' or `travelling'"],
    ['scores', 'the parts of the score list you wish to see'],
    ['sortdiscoveries', 'preferred order when displaying discovered objects'],
    ['sortloot', 'sort object selection lists by description'],
    ['sortvanquished', 'preferred order when displaying vanquished monsters'],
    ['soundlib', 'soundlib interface to use (if any)'],
    ['statushilites', '0=no status highlighting, N=show highlights for N turns'],
    ['statuslines', '2 or 3 lines for status display'],
    ['suppress_alert', 'suppress alerts about version-specific features'],
    ['symset', 'load a set of display symbols from symbols file'],
    ['traps', 'list of symbols to use in drawing traps'],
    ['versinfo', "extra information for 'showvers'"],
    ['warnings', 'display characters for warnings'],
    ['whatis_coord', 'show coordinates when auto-describing cursor position'],
    ['whatis_filter', 'filter coordinate locations when targeting next or previous'],
    ['cond_', 'prefix for cond_ options'],
    ['font', 'prefix for font options'],
];

// "Other settings" names, in allopt[] order (option_help() OthrOpt loop).
const OPT_OTHER = [
    'autocompletions', 'autopickup exceptions', 'bind keys', 'menu colors',
    'message types', 'status condition fields', 'status highlight rules',
];

// opt_epilog[] (options.c).
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

const OPT_CO = 80; // CO / COLNO (terminal columns)

// C ref: win/tty/wintty.c compress_str() — when a text/menu-window line is at
// least CO chars long (or has a newline), collapse each run of spaces to one
// (and drop leading/trailing space) so the wrap below doesn't split it.
function compress_str(str) {
    if (str.length < OPT_CO && str.indexOf('\n') < 0) return str;
    let out = '';
    let was = true; // discards leading spaces
    for (let k = 0; k < str.length; k++) {
        let c = str[k];
        if (c === '\n') c = ' ';
        if (was && c === ' ') continue;
        out += c;
        was = (c === ' ');
    }
    if (was && out.length > 0) out = out.slice(0, -1);
    return out;
}

// C ref: win/tty/wintty.c tty_putstr() NHW_TEXT branch — add one putstr()'d
// line to a text window: compress_str() it, then if it's still longer than CO
// break it at the last space at/under column CO-1 and recurse on the tail.
function wput(lines, str) {
    str = compress_str(str);
    for (;;) {
        if (str.length + 1 > OPT_CO) {
            let i = OPT_CO - 1;
            while (i > 0 && str[i] !== ' ' && str[i] !== '\n') i--;
            if (i > 0) {
                lines.push(str.slice(0, i + 1));
                str = str.slice(i + 1);
                continue;
            }
        }
        lines.push(str);
        break;
    }
}

// C ref: options.c option_help() — produce the ordered list of putstr() lines
// (already tty_putstr-wrapped) that the "List of game options." text window
// shows.  Returned to pager.js, which pages it through display_text_window().
export function option_help_lines() {
    const L = [];
    // opt_intro[] with opt_intro[CONFIG_SLOT] = "Set options as ... in <cfg>".
    wput(L, '');
    wput(L, '                 NetHack Options Help:');
    wput(L, '');
    wput(L, 'Set options as OPTIONS=<options> in');
    wput(L, OPT_CONFIGFILE);
    wput(L, 'or use `NETHACKOPTIONS="<options>"\' in your environment');
    wput(L, '(<options> is a list of options separated by commas)');
    wput(L, 'or press "O" while playing and use the menu.');
    wput(L, '');
    wput(L, 'Boolean options (which can be negated by prefixing them with \'!\' or "no"):');

    // Boolean options via next_opt(): accumulate "opt, opt, " and flush a line
    // whenever adding the next name would exceed COLNO-2; final next_opt("")
    // turns the trailing ", " into "." and emits a blank line.
    let buf = '';
    for (const nm of OPT_BOOL) {
        if (buf.length + nm.length + 2 > OPT_CO - 2) { wput(L, buf); buf = ''; }
        buf += nm + ', ';
    }
    if (buf.length >= 2 && buf.slice(-2) === ', ') buf = buf.slice(0, -2) + '.';
    wput(L, buf);
    wput(L, '');

    // Compound options: "%-20s - %s%c" with ',' between and '.' after the last.
    wput(L, 'Compound options:');
    for (let i = 0; i < OPT_COMPOUND.length; i++) {
        const [nm, descr] = OPT_COMPOUND[i];
        let buf2 = '`' + nm + "'";
        if (buf2.length < 20) buf2 = buf2 + ' '.repeat(20 - buf2.length);
        wput(L, `${buf2} - ${descr}${i + 1 < OPT_COMPOUND.length ? ',' : '.'}`);
    }
    wput(L, '');

    // Other settings: " <name>" per line.
    wput(L, 'Other settings:');
    for (const nm of OPT_OTHER) wput(L, ' ' + nm);
    wput(L, '');

    for (const e of OPT_EPILOG) wput(L, e);
    return L;
}

// ---------------------------------------------------------------------------
// hacklib.c / options.c string primitives that the config parsers below need.

// C ref: hacklib.c highc().
function highc(c) {
    return (c >= 'a' && c <= 'z') ? String.fromCharCode(c.charCodeAt(0) - 32) : c;
}

// C ref: <ctype.h> via hack.h digit()/letter() — ASCII-only, like the C build.
function digit(c) { return c >= '0' && c <= '9'; }
function letter(c) { return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'); }

// C ref: hacklib.c trimspaces() — strips leading AND trailing whitespace.
function trimspaces(s) {
    let a = 0, b = s.length;
    while (a < b && isspace(s[a])) a++;
    while (b > a && isspace(s[b - 1])) b--;
    return s.slice(a, b);
}

// C ref: hacklib.c visctrl() — how a key is spelled inside an error message.
function visctrl(c) {
    const code = typeof c === 'number' ? c : c.charCodeAt(0);
    if (code < 32) return '^' + String.fromCharCode(code + 64);
    if (code === 127) return '^?';
    if (code >= 128) {
        const inner = code - 128;
        if (inner < 32) return 'M-^' + String.fromCharCode(inner + 64);
        if (inner === 127) return 'M-^?';
        return 'M-' + String.fromCharCode(inner);
    }
    return String.fromCharCode(code);
}

// C ref: hacklib.c fuzzymatch() — equality after dropping every character of
// 'ignore_chars' from BOTH strings.  This is what lets "light blue",
// "lightblue" and "l i-gh_t---b l u e" all name CLR_BRIGHT_BLUE.
function fuzzymatch(s1, s2, ignore_chars, caseblind) {
    let i = 0, j = 0;
    for (;;) {
        let c1 = '\0', c2 = '\0';
        while (i < s1.length) { const c = s1[i++]; if (!ignore_chars.includes(c)) { c1 = c; break; } }
        while (j < s2.length) { const c = s2[j++]; if (!ignore_chars.includes(c)) { c2 = c; break; } }
        if (c1 === '\0' || c2 === '\0') return c1 === '\0' && c2 === '\0';
        if (caseblind) { c1 = lowc(c1); c2 = lowc(c2); }
        if (c1 !== c2) return false;
    }
}

// C ref: options.c escapes() — expand `\M`/meta, `^X`, decimal, `\o` octal,
// `\x` hex and the C-style `\n`/`\t`/`\b`/`\r`/`\\` forms in place.  Load
// bearing for txt2key(), sym_val() and warning_opts().
const HEXDD = '0123456789aAbBcCdDeEfF';
function escapes(cp) {
    let out = '';
    let i = 0;
    while (i < cp.length) {
        const meta = (cp[i] === '\\' && (cp[i + 1] === 'm' || cp[i + 1] === 'M')
                      && i + 2 < cp.length);
        if (meta) i += 2;
        let cval = 0, dcount = 0;
        const c = cp[i];
        if ((c !== '\\' && c !== '^') || i + 1 >= cp.length) {
            cval = cp.charCodeAt(i); i++;
        } else if (c === '^') {
            i++;
            cval = cp.charCodeAt(i) & 0x1f;
            i++;
        } else if (digit(cp[i + 1])) {
            i++;
            do {
                cval = cval * 10 + (cp.charCodeAt(i) - 48);
                i++;
            } while (i < cp.length && digit(cp[i]) && ++dcount < 3);
        } else if ((cp[i + 1] === 'o' || cp[i + 1] === 'O') && i + 2 < cp.length
                   && '01234567'.includes(cp[i + 2])) {
            i += 2;
            do {
                cval = cval * 8 + (cp.charCodeAt(i) - 48);
                i++;
            } while (i < cp.length && '01234567'.includes(cp[i]) && ++dcount < 3);
        } else if ((cp[i + 1] === 'x' || cp[i + 1] === 'X') && i + 2 < cp.length
                   && HEXDD.indexOf(cp[i + 2]) >= 0) {
            i += 2;
            let dp = HEXDD.indexOf(cp[i]);
            do {
                cval = cval * 16 + ((dp / 2) | 0);
                i++;
                dp = i < cp.length ? HEXDD.indexOf(cp[i]) : -1;
            } while (dp >= 0 && ++dcount < 2);
        } else {
            i++;
            switch (cp[i]) {
            case '\\': cval = 92; break;
            case 'n': cval = 10; break;
            case 't': cval = 9; break;
            case 'b': cval = 8; break;
            case 'r': cval = 13; break;
            default: cval = cp.charCodeAt(i); break;
            }
            i++;
        }
        if (meta) cval |= 0x80;
        out += String.fromCharCode(cval & 0xff);
    }
    return out;
}

// C ref: options.c txt2key() — turn a BIND / menu-accelerator key spec into
// the raw key it names.  Returns '' for C's '\0' ("not a key").
const KEY_M = (c) => String.fromCharCode((c.charCodeAt(0) | 0x80) & 0xff);
const KEY_C = (c) => String.fromCharCode(c.charCodeAt(0) & 0x1f);

function txt2key(txtIn) {
    let txt = trimspaces(txtIn);
    if (!txt) return '';
    if (txt.length === 1) return txt;

    if (txt === '<enter>') return '\n';
    if (txt === '<space>') return ' ';
    if (txt === '<esc>') return '\x1b';

    /* things like \b and \7 and \mX */
    if (txt[0] === '\\') {
        const t = escapes(txt);
        return t.length ? t[0] : '';
    }

    let makemeta = false;
    if (highc(txt[0]) === 'M') {
        if (txt.length < 2) return txt[0];
        txt = txt.slice(1);
        if (txt[0] === '-' && txt.length > 1) txt = txt.slice(1);
        if (txt.length < 2) return KEY_M(txt[0]);
        makemeta = true;
    }
    if (txt[0] === '^' || highc(txt[0]) === 'C') {
        const uc = txt[0];
        if (txt.length < 2) return makemeta ? KEY_M(uc) : uc;
        txt = txt.slice(1);
        if (txt[0] === '-' && txt.length > 1) txt = txt.slice(1);
        /* ^? is rubout/delete even though it is not a control character */
        if (txt[0] === '?') return makemeta ? '\xff' : '\x7f';
        const cc = KEY_C(txt[0]);
        return makemeta ? KEY_M(cc) : cc;
    }
    if (makemeta && txt.length) return KEY_M(txt[0]);

    /* ascii codes: must be three-digit decimal */
    if (digit(txt[0])) {
        let key = 0;
        for (let i = 0; i < 3; i++) {
            if (i >= txt.length || !digit(txt[i])) return '';
            key = 10 * key + (txt.charCodeAt(i) - 48);
        }
        return String.fromCharCode(key & 0xff);
    }
    return '';
}

// C ref: options.c sym_val() — reduce a SYMBOLS= value string to the single
// display character it names.  Returns '' for C's 0 ("nothing named").
export function sym_val(strval) {
    let buf = '';
    if (!strval || strval.length < 2) {
        /* empty, or single character; a lone space or tab names nothing */
        if (strval && !isspace(strval[0])) buf = strval[0];
    } else if (strval[0] === "'") {
        if (strval[2] === "'" && strval.length === 3) {
            buf = strval[1];
        } else if (strval[1] === '\\' && strval.length >= 4 && strval[3] === "'"
                   && '\'"\\'.includes(strval[2]) && strval.length === 4) {
            buf = strval[2];
        } else {
            const tmp = strval.slice(1);
            const p = tmp.lastIndexOf("'");
            if (p >= 0) buf = escapes(tmp.slice(0, p));
        }
    } else {
        buf = escapes(strval);
    }
    return buf ? buf[0] : '';
}

// C ref: include/defsym.h under PCHAR_PARSE / MONSYMS_PARSE / OBJCLASS_PARSE
// plus the SYM_CONTROL head of symbols.c loadsyms[] — every name a SYMBOLS= or
// ROGUESYMBOLS= line may set.  A name that is NOT here is what makes
// parsesymbols() fail, and cnf_line_SYMBOLS() then reports
// "Error in SYMBOLS definition", which is a SCREEN.
const SYM_CONTROL = 1, SYM_PCHAR = 2, SYM_OC = 3, SYM_MON = 4, SYM_OTH = 5;
const LOADSYMS_CONTROL = ['start', 'begin', 'finish', 'handling', 'description',
                          'color', 'colour', 'restrictions'];
const LOADSYMS_PCHAR = `S_stone S_vwall S_hwall S_tlcorn S_trcorn S_blcorn
S_brcorn S_crwall S_tuwall S_tdwall S_tlwall S_trwall S_ndoor S_vodoor
S_hodoor S_vcdoor S_hcdoor S_bars S_tree S_room S_darkroom S_engroom S_corr
S_litcorr S_engrcorr S_upstair S_dnstair S_upladder S_dnladder S_brupstair
S_brdnstair S_brupladder S_brdnladder S_altar S_grave S_throne S_sink
S_fountain S_pool S_ice S_lava S_lavawall S_vodbridge S_hodbridge S_vcdbridge
S_hcdbridge S_air S_cloud S_water S_arrow_trap S_dart_trap
S_falling_rock_trap S_squeaky_board S_bear_trap S_land_mine
S_rolling_boulder_trap S_sleeping_gas_trap S_rust_trap S_fire_trap S_pit
S_spiked_pit S_hole S_trap_door S_teleportation_trap S_level_teleporter
S_magic_portal S_web S_statue_trap S_magic_trap S_anti_magic_trap
S_polymorph_trap S_vibrating_square S_trapped_door S_trapped_chest S_vbeam
S_hbeam S_lslant S_rslant S_digbeam S_flashbeam S_boomleft S_boomright S_ss1
S_ss2 S_ss3 S_ss4 S_poisoncloud S_goodpos S_sw_tl S_sw_tc S_sw_tr S_sw_ml
S_sw_mr S_sw_bl S_sw_bc S_sw_br S_expl_tl S_expl_tc S_expl_tr S_expl_ml
S_expl_mc S_expl_mr S_expl_bl S_expl_bc S_expl_br`.split(/\s+/);
const LOADSYMS_OC = `S_strange_obj S_weapon S_armor S_ring S_amulet S_tool
S_food S_potion S_scroll S_book S_wand S_coin S_gem S_rock S_ball S_chain
S_venom`.split(/\s+/);
const LOADSYMS_MON = `S_ANT S_BLOB S_COCKATRICE S_DOG S_EYE S_FELINE S_GREMLIN
S_HUMANOID S_IMP S_JELLY S_KOBOLD S_LEPRECHAUN S_MIMIC S_NYMPH S_ORC S_PIERCER
S_QUADRUPED S_RODENT S_SPIDER S_TRAPPER S_UNICORN S_VORTEX S_WORM S_XAN
S_LIGHT S_ZRUTY S_ANGEL S_BAT S_CENTAUR S_DRAGON S_ELEMENTAL S_FUNGUS S_GNOME
S_GIANT S_invisible S_JABBERWOCK S_KOP S_LICH S_MUMMY S_NAGA S_OGRE S_PUDDING
S_QUANTMECH S_RUSTMONST S_SNAKE S_TROLL S_UMBER S_VAMPIRE S_WRAITH S_XORN
S_YETI S_ZOMBIE S_HUMAN S_GHOST S_GOLEM S_DEMON S_EEL S_LIZARD S_WORM_TAIL
S_MIMIC_DEF`.split(/\s+/);

// C ref: symbols.c loadsyms[] tail — the SYM_OTH block (sym.h SYM_OFF_X).
const LOADSYMS_OTH = ['S_nothing', 'S_unexplored', 'S_boulder', 'S_invisible',
                      'S_pet_override', 'S_hero_override'];

/* loadsyms[] order: the SYM_CONTROL head, then PCHAR, OBJCLASS and MONSYM
   (symbols.c includes defsym.h in that order), then the SYM_OTH tail. */
const LOADSYMS = [
    ...LOADSYMS_CONTROL.map((name) => ({ range: SYM_CONTROL, name })),
    ...LOADSYMS_PCHAR.map((name) => ({ range: SYM_PCHAR, name })),
    ...LOADSYMS_OC.map((name) => ({ range: SYM_OC, name })),
    ...LOADSYMS_MON.map((name) => ({ range: SYM_MON, name })),
    ...LOADSYMS_OTH.map((name) => ({ range: SYM_OTH, name })),
];

// C ref: symbols.c match_sym() alternates[].
const SYM_ALTERNATES = [
    ['S_armour', 'S_armor'],
    ['S_explode1', 'S_expl_tl'], ['S_explode2', 'S_expl_tc'],
    ['S_explode3', 'S_expl_tr'], ['S_explode4', 'S_expl_ml'],
    ['S_explode5', 'S_expl_mc'], ['S_explode6', 'S_expl_mr'],
    ['S_explode7', 'S_expl_bl'], ['S_explode8', 'S_expl_bc'],
    ['S_explode9', 'S_expl_br'],
];

// C ref: symbols.c match_sym().  The caller has already mungspaces()'d buf, so
// at most one space can sit in front of the separator.  `len >= strlen(name)`
// combined with strncmpi over len characters is exact case-insensitive
// equality once C's NUL terminator is accounted for.
export function match_sym(buf) {
    if ((buf[0] === 'G' || buf[0] === 'g') && buf[1] === '_') return null;
    let p = buf.indexOf(':');
    const q = buf.indexOf('=');
    if (p < 0 || (q >= 0 && q < p)) p = q;
    let len = buf.length;
    if (p >= 0) {
        if (p > 0 && buf[p - 1] === ' ') p--;
        len = p;
    }
    const name = buf.slice(0, len);
    for (const sp of LOADSYMS)
        if (len >= sp.name.length && strcmpi_eq(name, sp.name)) return sp;
    for (const [altnm, nm] of SYM_ALTERNATES)
        if (len >= altnm.length && strcmpi_eq(name, altnm))
            return LOADSYMS.find((sp) => sp.name === nm) || null;
    return null;
}

// C ref: symbols.c parsesymbols() — "S_name:char[,S_name2:char2,...]", split
// right-to-left on the first UNQUOTED comma (so `S_boulder:','` works), each
// element validated with match_sym().  Returns FALSE the moment one element
// names nothing, which is what produces the SYMBOLS/ROGUESYMBOLS error line.
function parsesymbols(opts, which_set, result, ref) {
    let firstComma = -1, firstColon = -1;
    for (let k = 1; k + 1 < opts.length; k++) {
        const ch = opts[k], prech = opts[k - 1], postch = opts[k + 1];
        if (ch === ',') {
            if (prech === "'" && postch === "'") continue;
            if (prech === '\\') continue;
        }
        if (ch === ':') {
            if (prech === "'" && postch === "'") continue;
        }
        if (ch === ',' && firstComma < 0) firstComma = k;
        if (ch === ':' && firstColon < 0) firstColon = k;
    }
    if (firstComma >= 0) {
        /* C: `*first_unquoted_comma++ = '\0'` truncates the CALLER's buffer
           before recursing, which is what a later element's failure reports. */
        opts = (() => { const head = opts.slice(0, firstComma),
                              tail = opts.slice(firstComma + 1);
                        if (ref) ref.buf = head;
                        if (!parsesymbols(tail, which_set, result, null)) return null;
                        return head; })();
        if (opts === null) return false;
        if (firstColon > firstComma) firstColon = -1;
    }

    let sep = firstColon;
    if (sep < 0) sep = opts.indexOf('=');
    if (sep < 0) return false;
    /* C: `*strval++ = '\0'` — from here on the caller's buffer ends at the
       separator, so its error message names only the symbol. */
    if (ref) ref.buf = opts.slice(0, sep);
    const symname = mungspaces(opts.slice(0, sep));
    const strval = mungspaces(opts.slice(sep + 1));

    const symp = match_sym(symname);
    /* a G_ name is handled by match_glyph(); our renderer has no custom glyph
       map, so treat it as accepted-and-ignored rather than an error */
    const is_glyph = !symp && (symname[0] === 'G' || symname[0] === 'g')
                     && symname[1] === '_';
    if (!symp && !is_glyph) return false;
    if (symp && symp.range && symp.range !== SYM_CONTROL) {
        const val = sym_val(strval);
        /* ROGUESET targets the rogue-level symbol table, which the renderer
           does not model; PRIMARYSET is the one display.js reads. */
        if (val && which_set !== ROGUESET) result.symoverride[symp.name] = val;
    }
    return true;
}
const PRIMARYSET = 0, ROGUESET = 1;

// ---------------------------------------------------------------------------
// AUTOPICKUP_EXCEPTION= and the config-error machinery.
//
// C ref: cfgfiles.c config_error_init()/config_error_nextline()/config_erradd()
// /config_error_done().  Every message goes through pline(), which this early
// (iflags.window_inited still FALSE) is raw_print() — so the "errors" are
// SCREEN CONTENT written by the recorder's raw shadow-buffer writer, and the
// dismissal is a getret() that eats input.  Both are modelled here.

const BUFSZ = 256;     /* global.h */
const PL_NSIZ = 32;    /* global.h — name of player */
const PL_PSIZ = 63;    /* global.h — name of pet */
const WARNCOUNT = 6;   /* sym.h — number of warning levels */

// The frame is per-parse rather than a stack: parseNethackrc reads one file.
let config_error_data = null;

// The ordered stream of everything the raw writer emitted while the file was
// read, so the boundaries fall where C's do: a string is one raw_print() line,
// WAIT_SYNCH is one wait_synch() -> getret().  get_uchars() calls both in the
// MIDDLE of the file, so the pauses cannot be inferred from the text.
let raw_stream = null;
const WAIT_SYNCH = Object.freeze({ wait_synch: true });

function raw_print(str) {
    if (raw_stream) raw_stream.push(str);
}

// C ref: hack.h wait_synch() -> wintty.c getret(): the reader below eats input
// until Return, and each eaten key is one captured input boundary.
function wait_synch() {
    if (raw_stream) raw_stream.push(WAIT_SYNCH);
}

function config_error_init(sourcename) {
    config_error_data = {
        line_num: 0, num_errors: 0, origline_shown: false,
        source: sourcename || '', origline: '',
    };
}

// Called for EVERY physical line, comments and blanks included — which is why
// "Line 5" can name a line parse_config_line() never sees.
function config_error_nextline(line) {
    const ced = config_error_data;
    if (!ced) return;
    ced.line_num++;
    ced.origline_shown = false;
    ced.origline = line || '';
}

// C ref: cfgfiles.c config_erradd().  The period is added to the MESSAGE, not
// to buf[], and only when buf doesn't already end in one of ".!?".
function config_error_add(buf) {
    const ced = config_error_data;
    if (!buf) buf = 'Unknown error';
    const punct = '.!?'.includes(buf[buf.length - 1]) ? '' : '.';
    if (!ced) return;
    ced.num_errors++;
    if (!ced.origline_shown) {
        raw_print('\n' + ced.origline);
        ced.origline_shown = true;
    }
    const lineno = ced.line_num > 0 ? `Line ${ced.line_num}: ` : '';
    raw_print(` * ${lineno}${buf}${punct}`);
}

// C ref: cfgfiles.c config_error_done() — the trailing count line, then
// wait_synch().  `configfile` here is the RESOLVED $HOME/.nethackrc, the same
// string option_help() prints; docs/recording-environment.md fixes $HOME for
// every recording and rules that hard-coding what NetHack printed from it is
// fine, so OPT_CONFIGFILE is the value C reported.
function config_error_done() {
    const ced = config_error_data;
    config_error_data = null;
    if (!ced || !ced.num_errors) return 0;
    const n = ced.num_errors;
    raw_print(`\n${n} error${n === 1 ? '' : 's'} `
              + `${ced.source === 'command line' ? 'on' : 'in'} `
              + `${ced.source || OPT_CONFIGFILE}.\n`);
    wait_synch();
    return n;
}

// C ref: cfgfiles.c get_uchars() — read a list of decimal numbers into a uchar
// array.  Only digits and blanks are legal, so the comma that looks natural in
// a config file ("WARNINGS=0,1,2") is a syntax error — and the complaint is a
// raw_printf() + wait_synch() DURING the read, not a config_error_add(), so it
// neither shows the offending line nor counts toward config_error_done()'s
// total.  With modlist set a zero leaves the list entry alone.
function get_uchars(bufp, list, modlist, size, name) {
    let num = 0, count = 0, havenum = false, i = 0;

    for (;;) {
        const c = i < bufp.length ? bufp[i] : '\0';
        switch (c) {
        case ' ': case '\0': case '\t': case '\n':
            if (havenum) {
                if (num || !modlist) list[count] = num & 0xff;
                count++;
                num = 0;
                havenum = false;
            }
            if (count === size || c === '\0') return count;
            i++;
            break;
        case '0': case '1': case '2': case '3': case '4':
        case '5': case '6': case '7': case '8': case '9':
            havenum = true;
            num = num * 10 + (c.charCodeAt(0) - 0x30);
            i++;
            break;
        default:
            raw_print(`Syntax error in ${name}`);
            wait_synch();
            return count;
        }
    }
}

// C ref: options.c assign_warnings() — a zero entry leaves gw.warnsyms alone.
function assign_warnings(graph_chars, result) {
    for (let i = 0; i < WARNCOUNT; i++)
        if (graph_chars[i]) result.warnsyms[i] = String.fromCharCode(graph_chars[i]);
}

// C ref: options.c add_autopickup_exception() — one sscanf per accepted form.
// This mimics `sscanf(mapping, "\"<%253[^\"]\" %c", text, &end)`: the literal
// quote, an optional grab/nograb marker, a non-empty run of up to 253
// non-quote characters, the closing quote, then (after optional whitespace)
// one trailing character.  Returns the number of fields assigned, so a
// half-matched pattern reports 0 and the caller falls through, exactly as C's
// short-circuited || chain does.
function sscanf_ape(mapping, lead) {
    let i = 0;
    if (mapping[i] !== '"') return { n: 0 };
    i++;
    if (lead) {
        if (mapping[i] !== lead) return { n: 0 };
        i++;
    }
    const start = i;
    while (i < mapping.length && mapping[i] !== '"' && i - start < 253) i++;
    if (i === start) return { n: 0 };           /* scanset matched nothing */
    const text = mapping.slice(start, i);
    if (mapping[i] !== '"') return { n: 0 };    /* literal '"' unmatched */
    i++;
    while (i < mapping.length && isspace(mapping[i])) i++;
    if (i >= mapping.length) return { n: 1, text };
    return { n: 2, text, end: mapping[i] };
}

// C ref: options.c add_autopickup_exception().  ape->pattern is a POSIX
// EXTENDED regex (sys/share/posixregex.c regex_compile passes REG_EXTENDED)
// matched unanchored against the object description, NOT a glob.
function add_autopickup_exception(mapping, result) {
    const APE_regex_error = 'regex error in AUTOPICKUP_EXCEPTION';
    const APE_syntax_error = 'syntax error in AUTOPICKUP_EXCEPTION';
    let grab = false;

    let r = sscanf_ape(mapping, '<');
    if (r.n === 1 || (r.n === 2 && r.end === '#')) {
        grab = true;
    } else {
        r = sscanf_ape(mapping, '>');
        /* C's `||` chain reassigns n (and end) from the bare-quote sscanf
           whenever the '>' one didn't return exactly 1, so `">pat" #` is
           accepted by the third form with '>' left INSIDE the pattern. */
        if (r.n !== 1) r = sscanf_ape(mapping, '');
        if (!(r.n === 1 || (r.n === 2 && r.end === '#'))) {
            config_error_add(APE_syntax_error);
            return 0;
        }
        grab = false;
    }

    /* C ref: options.c add_autopickup_exception() — regex_compile() failing
       reports regerror()'s text, not V8's.  ere_compile() classifies the
       pattern the way Darwin's regcomp(REG_EXTENDED) does and hands back a
       JS-safe source for the ones it accepts (ERE-literal ')' and '{', POSIX
       character classes). */
    const ere = ere_compile(r.text);
    if (ere.error) {
        config_error_add(`${APE_regex_error}: ${ere.error}`);
        return 0;
    }
    let re;
    try {
        re = new RegExp(ere.jsSource);
    } catch (e) {
        config_error_add(`${APE_regex_error}: ${e.message}`);
        return 0;
    }
    /* ape->next = ga.apelist: newest first, which is the order
       check_autopickup_exceptions() walks */
    result.apelist.unshift({ pattern: r.text, grab, regex: re });
    return 1;
}

// C ref: win/tty/termcap.c nomux_enter_raw_mode()/nomux_raw_putch() driving
// wintty.c getret() via wait_synch().  Two recorder facts make this load
// bearing far past the error screen itself:
//   - nomux_raw_active is never cleared, so from the first pre-window-init
//     raw_print onward the CAPTURED cursor is this writer's row/col, whatever
//     the game later draws.  jsmain's capture hook and js/save.js read
//     game._nomux_raw for that.
//   - xputs() (getret()'s "Hit return to continue: ") was never hooked by the
//     capture patch, so it is absent from the recorded screen and must not be
//     drawn here.
export async function config_error_report(result) {
    const raw = result?.config_error_raw;
    if (!raw || !raw.length) return;
    const disp = game.nhDisplay;
    const rows = disp?.rows ?? 24, cols = disp?.cols ?? 80;
    /* nomux_enter_raw_mode() clears the shadow buffer ONCE, on the first
       raw_print: exit_nhwindows/settty switch off the alt screen, so the
       visible terminal is blank first.  Its row/col then only ever advance,
       which is why a later wait_synch() finds the earlier text still there. */
    if (disp?.clearScreen) disp.clearScreen();
    let row = 0, col = 0;
    const putch = (ch) => {
        if (ch === '\n') { row++; col = 0; return; }
        if (ch.charCodeAt(0) < 32) return;
        if (row >= 0 && row < rows && col >= 0 && col < cols)
            disp?.putstr?.(col, row, ch, NO_COLOR, 0);
        col++;
    };
    for (const item of raw) {
        if (typeof item === 'string') {
            for (const ch of item) putch(ch);
            putch('\n'); /* puts() / tty_raw_print_bold both append one */
            game._nomux_raw = { row, col };
            if (disp?.setCursor) disp.setCursor(col, row);
            continue;
        }
        /* getline.c xwaitforspace(): iflags.cbreak is still FALSE this early
           (setftty() runs from tty_init_nhwindows), so the entire cbreak
           branch is skipped — neither space nor ESC dismisses this, ONLY '\n'
           or '\r'.  Every key before that is one captured input boundary with
           an unchanged screen. */
        for (;;) {
            const c = await nhgetch();
            if (c === 10 || c === 13) break;
        }
    }
}

// ---------------------------------------------------------------------------
// BINDINGS= / AUTOCOMPLETE= / the menu_* accelerator options.

// C ref: include/wintype.h MENU_* — the internal menu command characters.
const MENU_FIRST_PAGE = '^', MENU_LAST_PAGE = '|', MENU_NEXT_PAGE = '>',
      MENU_PREVIOUS_PAGE = '<', MENU_SHIFT_RIGHT = '}', MENU_SHIFT_LEFT = '{',
      MENU_SELECT_ALL = '.', MENU_UNSELECT_ALL = '-', MENU_INVERT_ALL = '@',
      MENU_SELECT_PAGE = ',', MENU_UNSELECT_PAGE = '\\', MENU_INVERT_PAGE = '~',
      MENU_SEARCH = ':';

// C ref: options.c default_menu_cmd_info[].
const DEFAULT_MENU_CMD_INFO = [
    ['menu_next_page', MENU_NEXT_PAGE],
    ['menu_previous_page', MENU_PREVIOUS_PAGE],
    ['menu_first_page', MENU_FIRST_PAGE],
    ['menu_last_page', MENU_LAST_PAGE],
    ['menu_select_all', MENU_SELECT_ALL],
    ['menu_invert_all', MENU_INVERT_ALL],
    ['menu_deselect_all', MENU_UNSELECT_ALL],
    ['menu_select_page', MENU_SELECT_PAGE],
    ['menu_invert_page', MENU_INVERT_PAGE],
    ['menu_deselect_page', MENU_UNSELECT_PAGE],
    ['menu_search', MENU_SEARCH],
    ['menu_shift_right', MENU_SHIFT_RIGHT],
    ['menu_shift_left', MENU_SHIFT_LEFT],
];

// C ref: cmd.c spkeys_binds[] — the "getdir.self", "getpos.pick", "count" ...
// pseudo-commands a BIND= line may name instead of an extended command.  They
// rebind an internal prompt key rather than a command, so bind_specialkey()
// accepts them and parsebindings() must not report them as unknown.
const SPKEYS_BINDS = `getdir.self getdir.self2 getdir.help getdir.mouse count
getpos.self getpos.pick getpos.pick.quick getpos.pick.once getpos.pick.verbose
getpos.valid getpos.autodescribe getpos.mon.next getpos.mon.prev
getpos.obj.next getpos.obj.prev getpos.door.next getpos.door.prev
getpos.unexplored.next getpos.unexplored.prev getpos.valid.next
getpos.valid.prev getpos.all.next getpos.all.prev getpos.help getpos.filter
getpos.moveskip getpos.menu`.split(/\s+/);

// C ref: options.c illegal_menu_cmd_key().
function illegal_menu_cmd_key(c) {
    if (c === '' || c === '\r' || c === '\n' || c === '\x1b' || c === ' '
        || digit(c) || (letter(c) && c !== '@')) {
        config_error_add(`Reserved menu command key '${visctrl(c || 0)}'`);
        return true;
    }
    /* reject default object class symbols (drawing.c def_oc_syms[1..]) */
    for (let j = 1; j < DEF_OC_SYMS.length; j++) {
        if (c === DEF_OC_SYMS[j]) {
            config_error_add(`Menu command key '${visctrl(c)}' is an object class`);
            return true;
        }
    }
    return false;
}

// C ref: options.c add_menu_cmd_alias() — gm.mapped_menu_cmds/op.
const MAX_MENU_MAPPED_CMDS = 32;
function add_menu_cmd_alias(from_ch, to_ch, result) {
    if (result.menu_cmd_alias.length >= MAX_MENU_MAPPED_CMDS) return;
    result.menu_cmd_alias.push([from_ch, to_ch]);
}

// C ref: options.c check_misc_menu_command() — is `opts` one of the
// menu_<something> accelerator option names?  Matched at the name's FULL
// length, so "menu_sea" does not reach menu_search here.
function check_misc_menu_command(opts) {
    for (let i = 0; i < DEFAULT_MENU_CMD_INFO.length; i++) {
        const nm = DEFAULT_MENU_CMD_INFO[i][0];
        if (match_optname(opts, nm, nm.length, true)) return i;
    }
    return -1;
}

// C ref: options.c spcfn_misc_menu_cmd().
function spcfn_misc_menu_cmd(midx, negated, opts, result) {
    if (negated) {
        bad_negation(DEFAULT_MENU_CMD_INFO[midx][0], false);
        return OPTN_ERR;
    }
    const op = string_for_opt(opts, false);
    if (op !== '') {
        const c = txt2key(op);
        if (illegal_menu_cmd_key(c)) return OPTN_ERR;
        add_menu_cmd_alias(c, DEFAULT_MENU_CMD_INFO[midx][1], result);
    }
    return OPTN_OK;
}

// C ref: cmd.c bind_key() — resolve a BIND= command name to an extended
// command.  "nothing" unbinds; an INTERNALCMD entry is skipped, so naming one
// is the same as naming nothing at all.  Returns false when no command matches,
// which is what makes parsebindings() report "Unknown key binding command".
function bind_key(key, command, result) {
    if (strcmpi_eq(command, 'nothing')) {
        delete result.keybind[key];
        result.keyunbind.push(key);
        return true;
    }
    let buf = command, param = null;
    const lp = buf.indexOf('('), rp = buf.lastIndexOf(')');
    if (lp >= 0 && rp > lp) {
        param = buf.slice(lp + 1, rp);
        buf = buf.slice(0, lp);
    }
    for (const e of EXTCMD_TABLE) {
        if (!strcmpi_eq(buf, e.txt)) continue;
        if (String(e.flags).includes('INTERNALCMD')) continue;
        result.keybind[key] = e.txt;
        if (String(e.flags).includes('CMD_PARAM')) {
            if (param === null) config_error_add(`'${buf}' requires a parameter`);
            else if (!param.length) config_error_add('Required parameter cannot be empty');
            else result.keybind_param[key] = param.slice(0, 30);
        } else if (param !== null && param.length > 0) {
            config_error_add(`'${buf}' does not take a parameter`);
        }
        return true;
    }
    return false;
}

// C ref: cmd.c bind_specialkey().
function bind_specialkey(key, command, result) {
    for (const nm of SPKEYS_BINDS) {
        if (nm !== command) continue;
        result.spkeys[nm] = key;
        return true;
    }
    return false;
}

// C ref: cmd.c bind_mousebtn() — the tty build has no mouse, but naming
// "mouse1"/"mouse2" still has to be ACCEPTED (or rejected) the way C does.
const MOUSEBTN_NAMES = ['mouse1', 'mouse2'];
function bind_mousebtn(btn, command, result) {
    if (strcmpi_eq(command, 'nothing')) { delete result.mousebtn[btn]; return true; }
    for (const e of EXTCMD_TABLE) {
        if (!strcmpi_eq(command, e.txt)) continue;
        if (!String(e.flags).includes('MOUSECMD')) continue;
        result.mousebtn[btn] = e.txt;
        return true;
    }
    return false;
}

// C ref: options.c parsebindings() — "key:command[,key2:command2,...]", split
// RIGHT TO LEFT so the leftmost binding is applied last, with the escaped
// forms "\,:cmd" and "',':cmd" recognised so a comma can itself be bound.
function parsebindings(bindings, result) {
    let ret = true;

    let bind = bindings.indexOf(',');
    if (bind >= 0) {
        if (bind === 0) bind = bindings.indexOf(',', 1);
        else if (bindings[bind - 1] === '\\'
                 || (bindings[bind - 1] === "'" && bindings[bind + 1] === "'"))
            bind = bindings.indexOf(',', bind + 2);
    }
    if (bind >= 0) {
        if (!parsebindings(bindings.slice(bind + 1), result)) ret = false;
        bindings = bindings.slice(0, bind);
    }

    const colon = bindings.indexOf(':');
    if (colon < 0) return false;   /* it's not a binding */
    const keytxt = bindings.slice(0, colon);
    const cmd = trimspaces(bindings.slice(colon + 1));

    for (let i = 0; i < MOUSEBTN_NAMES.length; i++) {
        if (keytxt === MOUSEBTN_NAMES[i]) {
            if (!bind_mousebtn(i + 1, cmd, result))
                config_error_add(`Error binding mouse button ${i + 1}`);
            else
                return ret;
        }
    }

    const key = txt2key(keytxt);
    if (!key) {
        config_error_add(`Unknown key binding key '${keytxt}'`);
        return false;
    }
    if (bind_specialkey(key, cmd, result)) return ret;

    for (let i = 0; i < DEFAULT_MENU_CMD_INFO.length; i++) {
        if (DEFAULT_MENU_CMD_INFO[i][0] === cmd) {
            if (illegal_menu_cmd_key(key)) {
                config_error_add(`Bad menu key ${visctrl(key)}:${cmd}`);
                return false;
            }
            add_menu_cmd_alias(key, DEFAULT_MENU_CMD_INFO[i][1], result);
            return ret;
        }
    }

    if (!bind_key(key, cmd, result)) {
        config_error_add(`Unknown key binding command '${cmd}'`);
        return false;
    }
    return ret;
}

// C ref: cmd.c parseautocomplete() — right-to-left over a comma OR colon
// separated list.  A name that is not an extended command is reported with
// raw_printf() + wait_synch(), NOT config_error_add(): it prints immediately
// and blocks for Return without counting toward config_error_done()'s total.
function parseautocomplete(autocomplete, condition, result) {
    let cut = autocomplete.indexOf(',');
    if (cut < 0) cut = autocomplete.indexOf(':');
    if (cut >= 0) {
        parseautocomplete(autocomplete.slice(cut + 1), condition, result);
        autocomplete = autocomplete.slice(0, cut);
    }
    autocomplete = trimspaces(autocomplete);
    if (!autocomplete) return;

    /* unlike most options a leading "no" might be part of the command name,
       so only '!' negates */
    if (autocomplete[0] === '!') {
        autocomplete = trimspaces(autocomplete.slice(1));
        condition = !condition;
    }
    for (const e of EXTCMD_TABLE) {
        if (autocomplete === e.txt) {
            result.autocomplete[e.txt] = condition;
            return;
        }
    }
    raw_print(`Bad autocomplete: invalid extended command '${autocomplete}'.`);
    wait_synch();
}

// ---------------------------------------------------------------------------
// C ref: include/optlist.h allopt[] — every NHOPTB/NHOPTC/NHOPTP/NHOPTO entry
// in table order, with this build's #ifdefs resolved (recorder CFLAGS are
// `-DNOTPARMDECL -DNO_TIMED_DELAY`, hints file macosx-minimal).  Table order is
// load-bearing twice over: parseoptions() stops at the FIRST match, so
// `font_map` is found before the trailing `font` prefix entry, and
// determine_ambiguities() needs every name present or the minmatch lengths all
// come out too short.  Columns are `name|alias|type|flags`:
//   type   B = BoolOpt, C = CompOpt, O = OthrOpt
//   flags  n = negateok, v = valok, d = dupeok, p = pfx (an NHOPTP prefix
//          option, matched with str_start_is() instead of by minmatch),
//          0 = allopt[].addr is NULL in this build so optfn_boolean() takes its
//          "silent retreat" and sets nothing, w = setwhere is set_wiznofuz,
//          which optfn_boolean() rejects when go.opt_initial (i.e. from a
//          config file).
const ALLOPT_DATA = `windowtype||C|v
playmode||C|v
name||C|v
role|character|C|nvd
race||C|nvd
gender||C|nvd
alignment|align|C|nvd
accessiblemsg||B|n
acoustics||B|n
align_message||C|nv
align_status||C|v
altkeyhandling|altkeyhandler|C|v
altmeta||B|n
armorstatus||B|n
ascii_map||B|n
autocompletions||O|v
autodescribe||B|n
autodig||B|n
autoopen||B|n
autopickup||B|n
autopickup exceptions||O|v
autoquiver||B|n
autounlock||C|nv
bgcolors||B|n
bind keys||O|v
BIOS||B|0
blind|permablind|B|n
bones||B|n
boulder||C|v
catname||C|v
checkpoint||B|n
cmdassist||B|n
color|colour|B|n
confirm||B|n
crash_email||C|v
crash_name||C|v
crash_urlmax||C|v
customcolors|customcolours|B|n
customsymbols|customsymbols|B|n
dark_room||B|n
deaf|permadeaf|B|n
DECgraphics||C|nv
debug_hunger||B|nw
debug_mongen||B|nw
debug_overwrite_stairs||B|nw
disclose||C|nv
dogname||C|v
dropped_nopick||B|n
dungeon||C|v
effects||C|v
eight_bit_tty||B|n
extmenu||B|n
female|male|B|n
fireassist||B|n
fixinv||B|n
font_map||C|nvd
font_menu||C|nvd
font_message||C|nvd
font_size_map||C|nvd
font_size_menu||C|nvd
font_size_message||C|nvd
font_size_status||C|nvd
font_size_text||C|nvd
font_status||C|nvd
font_text||C|nvd
force_invmenu||B|n
fruit||C|v
fullscreen||B|n
glyph||C|vd
goldX||B|n
guicolor||B|n
help||B|n
herecmd_menu||B|n
hilite_pet||B|n
hilite_pile||B|n
hilite_status||C|nvd
hitpointbar||B|n
horsename||C|v
IBMgraphics||C|nv
idlecheckpoint||B|n
ignintr||B|n
implicit_uncursed||B|n
legacy||B|n
lit_corridor||B|n
lootabc||B|n
mail||B|n
map_mode||C|nv
mention_decor||B|n
mention_map||B|n
mention_walls||B|n
menu_deselect_all||C|v
menu_deselect_page||C|v
menu_first_page||C|v
menu_headings||C|nv
menu_invert_all||C|v
menu_invert_page||C|v
menu_last_page||C|v
menu_next_page||C|v
menu_objsyms|use_menu_glyphs|C|nv
menu_overlay||B|n
menu_previous_page||C|v
menu_search||C|v
menu_select_all||C|v
menu_select_page||C|v
menu_shift_left||C|v
menu_shift_right||C|v
menu_tab_sep||B|n
menucolors||B|nv
menu colors||O|v
menuinvertmode||C|v
menustyle||C|nv
message types||O|v
mon_movement||B|n
monpolycontrol||B|n
montelecontrol||B|n
monsters||C|v
mouse_support||C|v
msg_window||C|nv
msghistory||C|nv
news||B|n
nudist||B|n
null||B|n
number_pad||C|v
objects||C|v
packorder||C|v
paranoid_confirmation|prayconfirm|C|nvd
pauper||B|n
perm_invent||B|n
perminv_mode||C|nv
petattr||C|v
pettype|pet|C|nv
pickup_burden||C|v
pickup_stolen||B|n
pickup_thrown||B|n
pickup_types||C|v
pile_limit||C|nv
player_selection||C|v
popup_dialog||B|n
preload_tiles||B|n
price_quotes||B|n
pushweapon||B|n
query_menu||B|n
quick_farsight||B|n
rawio||B|0
reroll||B|n
rest_on_space||B|n
roguesymset||C|v
runmode||C|nv
safe_pet||B|n
safe_wait||B|n
sanity_check||B|n
scores||C|v
scroll_amount||C|nv
scroll_margin||C|nv
selectsaved||B|n
showdamage||B|n
showexp||B|n
showrace||B|n
showscore||B|n0
showvers||B|n
silent||B|n
softkeyboard||B|n
sortdiscoveries||C|nv
sortloot||C|v
sortpack||B|n
sortvanquished||C|nv
soundlib||C|v
sounds||B|n
sparkle||B|n
spot_monsters||B|n
splash_screen||B|n
standout||B|n
status_updates||B|n
status condition fields||O|v
statushilites||C|nvd
status highlight rules||O|v
statuslines||C|v
suppress_alert||C|vd
symset||C|v
term_cols|termcolumns|C|v
term_rows||C|v
terrainstatus||B|n
tile_file||C|v
tile_height||C|nv
tile_width||C|nv
tiled_map||B|n
time||B|n
timed_delay||B|0
tips||B|n
tombstone||B|n
toptenwin||B|n
traps||C|v
travel||B|n
travel_debug||B|n
tutorial||B|n
use_darkgray||B|n
use_inverse||B|n
use_truecolor|use_truecolour|B|n
vary_msgcount||C|v
verbose||B|n
versinfo||C|v
voices||B|n
vt_tiledata||B|n0
vt_sounddata||B|n0
warnings||C|v
weaponstatus||B|n
whatis_coord||C|nv
whatis_filter||C|nv
whatis_menu||B|n
whatis_moveskip||B|n
windowborders||C|nv
windowcolors||C|vd
wizmgender||B|n
wizweight||B|n
wraptext||B|n
cond_||C|ndp
font||C|nvdp`;

const ALLOPT = ALLOPT_DATA.split('\n').map((line) => {
    const [name, alias, typ, f] = line.split('|');
    return {
        name, alias: alias || null, typ,
        negateok: f.includes('n'), valok: f.includes('v'),
        dupeok: f.includes('d'), pfx: f.includes('p'),
        noaddr: f.includes('0'), wiznofuz: f.includes('w'),
        minmatch: 0,
    };
});

// C ref: hacklib.c lowc() — ASCII-only, so JS toLowerCase() (which also folds
// e.g. U+0130) is not a substitute.
function lowc(c) {
    return (c >= 'A' && c <= 'Z') ? String.fromCharCode(c.charCodeAt(0) + 32) : c;
}

function isspace(c) {
    return c === ' ' || c === '\t' || c === '\n' || c === '\v' || c === '\f' || c === '\r';
}

// strncmpi(a, b, n) == 0.  Both operands are NUL-terminated in C, so a run that
// reaches the end of one string but not the other is a mismatch.
function strncmpi_eq(a, b, n) {
    for (let i = 0; i < n; i++) {
        const ea = i >= a.length, eb = i >= b.length;
        if (ea || eb) return ea && eb;
        if (lowc(a[i]) !== lowc(b[i])) return false;
    }
    return true;
}

function strcmpi_eq(a, b) {
    return a.length === b.length && strncmpi_eq(a, b, a.length);
}

// C ref: options.c length_without_val() — the length of the option name part,
// i.e. up to the first ':' or '=' (whichever comes first) with any whitespace
// in front of it backed over.
function length_without_val(user_string, len) {
    let p = user_string.indexOf(':');
    const q = user_string.indexOf('=');
    if (p < 0 || (q >= 0 && q < p)) p = q;
    if (p >= 0) {
        while (p > 0 && isspace(user_string[p - 1])) p--;
        return p;
    }
    return len;
}

// C ref: options.c match_optname() — the user's text, minus any ":value", must
// be a case-insensitive leading substring of the option name and at least
// min_length characters long.
function match_optname(user_string, optn_name, min_length, val_allowed) {
    let len = user_string.length;
    if (val_allowed) len = length_without_val(user_string, len);
    return len >= min_length && strncmpi_eq(optn_name, user_string, len);
}

// C ref: hacklib.c str_start_is().
function str_start_is(str, chkstr, caseblind) {
    for (let i = 0; ; i++) {
        if (i >= str.length) return i >= chkstr.length;
        if (i >= chkstr.length) return true;
        const t1 = caseblind ? lowc(str[i]) : str[i];
        const t2 = caseblind ? lowc(chkstr[i]) : chkstr[i];
        if (t1 !== t2) return false;
    }
}

// C ref: options.c determine_ambiguities() — for each option, the length of its
// longest shared leading prefix with any other option name, plus one; floored
// at 3 and capped at the name's own length.  Run once at startup in C
// (initoptions_init), once at module load here.
function determine_ambiguities() {
    const needed = ALLOPT.map(() => 0);
    for (let i = 0; i < ALLOPT.length; i++) {
        for (let j = 0; j < ALLOPT.length; j++) {
            if (j === i) continue;
            const p1 = ALLOPT[i].name, p2 = ALLOPT[j].name;
            let tmpneeded = 1, k = 0;
            while (k < p1.length && k < p2.length && lowc(p1[k]) === lowc(p2[k])) {
                tmpneeded++; k++;
            }
            if (tmpneeded > needed[i]) needed[i] = tmpneeded;
            if (tmpneeded > needed[j]) needed[j] = tmpneeded;
        }
    }
    for (let i = 0; i < ALLOPT.length; i++) {
        const len = ALLOPT[i].name.length;
        ALLOPT[i].minmatch = (needed[i] < 3) ? 3 : (needed[i] <= len) ? needed[i] : len;
    }
}
determine_ambiguities();

// C ref: options.c string_for_opt() — everything past the first ':' or '='.
// Leading spaces are NOT stripped; each optfn decides what to do with them.
// When val_optional is FALSE a missing value is an ERROR — that message is a
// screen, so the flag has to be threaded per option exactly as C does.
function string_for_opt(opts, val_optional) {
    let colon = opts.indexOf(':');
    const equals = opts.indexOf('=');
    if (colon < 0 || (equals >= 0 && equals < colon)) colon = equals;
    if (colon < 0 || colon + 1 >= opts.length) {
        if (!val_optional) config_error_add(`Missing parameter for '${opts}'`);
        return '';
    }
    return opts.slice(colon + 1);
}

// C ref: options.c string_for_env_opt() — identical during config-file reading
// (go.opt_initial is TRUE); rejectoption() is only reachable from the 'O' menu.
function string_for_env_opt(optname, opts, val_optional) {
    return string_for_opt(opts, val_optional);
}

// C ref: options.c bad_negation().
function bad_negation(optname, with_parameter) {
    config_error_add(`The ${optname} option may not `
                     + `${with_parameter ? 'both have a value and ' : ''}be negated.`);
}

// C ref: options.c nmcpy() — copy up to maxlen-1 chars, stopping at a comma.
function nmcpy(src, maxlen) {
    const comma = src.indexOf(',');
    return (comma >= 0 ? src.slice(0, comma) : src).slice(0, maxlen - 1);
}

// The boolean option names our engine reads under a different field than the C
// option name.  Everything else lands on result.flags[<C option name>], which
// is the stable key the number_pad / status-line / autopickup lanes read.
function set_boolean(name, value, result) {
    switch (name) {
    case 'autopickup': result.flags.pickup = value; break;      // C: flags.pickup
    case 'fixinv': result.flags.invlet_constant = value; break; // C: flags.invlet_constant
    case 'splash_screen': result.iflags.wc_splash_screen = value; break;
    case 'tutorial':
        result.flags.tutorial = value;
        // allmain.js gates the "Do you want a tutorial?" prompt on this, which
        // is C's opt_set_in_config[opt_tutorial] — set for either polarity.
        result.tutorial_set = true;
        break;
    default: result.flags[name] = value; break;
    }
}

// C ref: options.c optfn_boolean().  The two config_error_add() calls here are
// SCREENS: a boolean with a value C cannot read as a truth value (or a negated
// boolean with any value at all) prints and then blocks for Return.
function optfn_boolean(o, negated, opts, op, result) {
    if (o.noaddr) return OPTN_OK;   /* silent retreat */
    if (o.wiznofuz) return OPTN_ERR; /* go.opt_initial && set_wiznofuz */

    let ln = 0;
    op = string_for_opt(opts, true);
    if (op !== '') {
        if (negated) {
            config_error_add(`Negated boolean '${o.name}' should not have a parameter`);
            return OPTN_SILENTERR;
        }
        ln = op.length;
        if (strncmpi_eq(op, 'true', ln) || strncmpi_eq(op, 'yes', ln)
            || strcmpi_eq(op, 'on')
            || (digit(op[0]) && parseInt(op, 10) === 1)) {
            negated = false;
        } else if (strncmpi_eq(op, 'false', ln) || strncmpi_eq(op, 'no', ln)
                   || strcmpi_eq(op, 'off')
                   || (digit(op[0]) && parseInt(op, 10) === 0)) {
            negated = true;
        } else if (!o.valok) {
            config_error_add(`'${opts}' is not valid for a boolean`);
            return OPTN_SILENTERR;
        }
    }

    // "Before the change": opt_female is reached under either its own name or
    // its "male" alias, and which one the user typed flips the sense.
    if (o.name === 'female') {
        const n = Math.max(ln, 3);
        if (strncmpi_eq(opts, 'female', n)) { result.gender = negated ? 'male' : 'female'; return OPTN_OK; }
        if (strncmpi_eq(opts, 'male', n)) { result.gender = negated ? 'female' : 'male'; return OPTN_OK; }
    }

    set_boolean(o.name, !negated, result);

    // "After the change".
    if (o.name === 'pauper') set_boolean('nudist', !negated, result);
    else if (o.name === 'ascii_map') result.iflags.wc_tiled_map = negated;
    else if (o.name === 'tiled_map') result.iflags.wc_ascii_map = negated;
    return OPTN_OK;
}

// ---------------------------------------------------------------------------
// options.c optfn_<name>() — the per-option compound handlers.
//
// Every one of these is reachable from a config file, and every
// config_error_add() below is a SCREEN plus a blocking Return, so the
// accept/reject decision and the exact message text both matter.  The value
// itself is still recorded verbatim under result.flags[<C option name>]: that
// is the storage contract js/pickup.js, js/invent.js, js/end.js and js/cmd.js
// were written against (each converts on read).
const OPTN_OK = 0, OPTN_ERR = 1, OPTN_SILENTERR = 2;

/* remember the value the way the rest of js/ expects to read it */
function keep(o, op, result) { result.flags[o.name] = op; }

// C ref: options.c optfn_align_message()/optfn_align_status() via
// ALIGN_LEFT/TOP/RIGHT/BOTTOM.
const ALIGN_NAMES = ['left', 'top', 'right', 'bottom'];
function optfn_align_misc(o, negated, opts, op, result) {
    op = string_for_opt(opts, negated);
    if (op !== '' && !negated) {
        for (const nm of ALIGN_NAMES)
            if (strncmpi_eq(op, nm, nm.length)) {
                result.iflags[`wc_${o.name}`] = nm;
                keep(o, op, result);
                return OPTN_OK;
            }
        config_error_add(`Unknown ${o.name} parameter '${op}'`);
        return OPTN_ERR;
    } else if (negated) {
        bad_negation(o.name, true);
        return OPTN_ERR;
    }
    return OPTN_OK;
}

// C ref: options.c optfn_autounlock() + unlocktypes[].  AUTOUNLOCK_* are
// lock.h bits; flags.autounlock is what cmd.js/extcmd-handlers.js test.
const AUTOUNLOCK_UNTRAP = 1, AUTOUNLOCK_APPLY_KEY = 2,
      AUTOUNLOCK_KICK = 4, AUTOUNLOCK_FORCE = 8;
const UNLOCKTYPES = ['untrap', 'apply-key', 'kick', 'force'];
function optfn_autounlock(o, negated, opts, op, result) {
    op = string_for_opt(opts, true);
    if (op === '') {
        result.flags.autounlock = negated ? 0 : AUTOUNLOCK_APPLY_KEY;
        return OPTN_OK;
    }
    let newflags = 0;
    const sep = op.includes('+') ? '+' : ' ';
    let rest = op;
    while (rest !== null) {
        let matched = false;
        let cur = trimspaces(rest);
        const nxt = cur.indexOf(sep);
        let after = null;
        if (nxt >= 0) { after = cur.slice(nxt + 1); cur = trimspaces(cur.slice(0, nxt)); }
        if (str_start_is('none', cur, true)) { negated = true; matched = true; }
        for (let i = 0; i < UNLOCKTYPES.length && !matched; i++) {
            if (str_start_is(UNLOCKTYPES[i], cur, true)
                || fuzzymatch(cur, UNLOCKTYPES[i], ' -_', true)) {
                matched = true;
                switch (cur[0]) {
                case 'u': newflags |= AUTOUNLOCK_UNTRAP; break;
                case 'a': newflags |= AUTOUNLOCK_APPLY_KEY; break;
                case 'k': newflags |= AUTOUNLOCK_KICK; break;
                case 'f': newflags |= AUTOUNLOCK_FORCE; break;
                default: matched = false; break;
                }
            }
        }
        if (!matched) {
            config_error_add(`Invalid value for "${o.name}": "${cur}"`);
            return OPTN_SILENTERR;
        }
        rest = after;
    }
    if (negated && newflags !== 0) {
        config_error_add(`Invalid value combination for "${o.name}": 'none' with some`);
        return OPTN_SILENTERR;
    }
    result.flags.autounlock = newflags;
    return OPTN_OK;
}

// C ref: drawing.c def_oc_syms[].sym, indexed by object class.  Needed by
// change_inv_order(), optfn_pickup_types() and illegal_menu_cmd_key().
const DEF_OC_SYMS = ['\0', ']', ')', '[', '=', '"', '(', '%', '!', '?', '+',
                     '/', '$', '*', '`', '0', '_', '.'];
const MAXOCLASSES = DEF_OC_SYMS.length;
function def_char_to_objclass(sym) {
    const i = DEF_OC_SYMS.indexOf(sym);
    return i > 0 ? i : MAXOCLASSES;
}

// C ref: drawing.c def_monsyms[].sym via def_char_to_monclass() — the monster
// class letters, used by optfn_boulder()'s clash test.
const DEF_MONSYMS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@ '&;:~]";
const MAXMCLASSES = DEF_MONSYMS.length + 1;
function def_char_to_monclass(sym) {
    const i = DEF_MONSYMS.indexOf(sym);
    return i >= 0 ? i + 1 : MAXMCLASSES;
}

// C ref: options.c optfn_boulder() (BACKWARD_COMPAT is defined in optlist.h),
// the deprecated spelling of SYMBOLS=S_boulder:c.  A symbol that a monster or
// a warning level already owns is REJECTED with its own message.
function optfn_boulder(o, negated, opts, op, result) {
    op = string_for_opt(opts, false);
    if (op === '') return OPTN_ERR;
    op = escapes(op);
    let clash = 0;
    if (def_char_to_monclass(op[0]) !== MAXMCLASSES) clash = op[0] ? 1 : 0;
    else if (op[0] >= '1' && op[0] < String.fromCharCode(WARNCOUNT + 48)) clash = 2;
    if (op.charCodeAt(0) < 32) {
        config_error_add('boulder symbol cannot be a control character');
        return OPTN_OK;
    } else if (clash) {
        config_error_add(`Badoption - boulder symbol '${visctrl(op[0])}' would`
                         + ` conflict with a ${clash === 1 ? 'monster' : 'warning'} symbol`);
    } else {
        result.symoverride.S_boulder = op[0];
        keep(o, op, result);
    }
    return OPTN_OK;
}

// C ref: options.c petname_optfn() — shared by catname/dogname/horsename.
// "none" clears the name.  dog.c makedog() reads these before falling back to
// the per-role default dog names.
function petname_optfn(o, negated, opts, op, result) {
    if (op === '' && !negated) return OPTN_ERR;
    if (negated || op === 'none' || op === 'None') op = '';
    result.flags[o.name] = sanitize_name(nmcpy(op, PL_PSIZ));
    return OPTN_OK;
}

// C ref: files.c sanitize_name() — a name that reaches a file or the topline
// keeps only printable characters.
function sanitize_name(s) {
    let out = '';
    for (const c of s) {
        const k = c.charCodeAt(0);
        if (k >= 32 && k < 127) out += c;
    }
    return out;
}

// C ref: options.c optfn_crash_urlmax() (CRASHREPORT is on for this build).
function optfn_crash_urlmax(o, negated, opts, op, result) {
    op = string_for_opt(opts, false);
    if (op === '') return OPTN_ERR;
    const temp = parseInt(op, 10) || 0;
    if (temp < 75) {
        config_error_add(`Invalid value ${temp} for crash_urlmax.  Minimum value is 75.`);
        return OPTN_ERR;
    }
    keep(o, op, result);
    return OPTN_OK;
}

// C ref: dat/symbols "start:" names — the symbol sets read_sym_file() can find.
// "default" (and "Default symbols") is accepted and means "no symset".  Any
// other name fails to load, and optfn_symset() then reports it, which is a
// screen; that is why this list has to be the file's, not the renderer's.
const SYMSET_NAMES = ['plain', 'Blank', 'IBMgraphics', 'IBMGraphics_1',
                      'IBMGraphics_2', 'RogueIBM', 'RogueEpyx', 'RogueWindows',
                      'curses', 'DECgraphics', 'MACgraphics', 'Enhanced1',
                      'Enhanced2', 'AmigaFont'];

// C ref: files.c read_sym_file() — TRUE when the name names a symset in the
// symbols file, or is the "default" spelling that clears the entry.
function read_sym_file(name) {
    if (!name) return true;
    for (const nm of SYMSET_NAMES) if (strcmpi_eq(name, nm)) return true;
    return fuzzymatch(name, 'Default symbols', ' -_', true)
           || strcmpi_eq(name, 'default');
}

// C ref: options.c optfn_symset() / optfn_roguesymset().
function optfn_symset(o, negated, opts, op, result) {
    if (op === '') return OPTN_ERR;
    if (!read_sym_file(op)) {
        config_error_add(`Unable to load symbol set "${op}" from "symbols"`);
        return OPTN_ERR;
    }
    if (o.name === 'symset') result.symset = op;
    return OPTN_OK;
}

// C ref: options.c optfn_DECgraphics()/optfn_IBMgraphics() — deprecated
// spellings of symset:<name> that refuse to load over an existing symset.
function optfn_graphics_compat(o, negated, opts, result) {
    if (!negated) {
        let badflag = false;
        if (result.symset) badflag = true;
        else if (!read_sym_file(o.name)) badflag = true;
        else result.symset = o.name;
        if (badflag) {
            config_error_add(`Failure to load symbol set ${o.name}.`);
            return OPTN_ERR;
        }
    }
    return OPTN_OK;
}

// C ref: flag.h DISCLOSE_* and decl.c disclosure_options[].
const DISCLOSURE_OPTIONS = 'iavgco';
const DISCLOSE_VALID = 'yn?+-#';
function optfn_disclose(o, negated, opts, op, result) {
    op = string_for_opt(opts, true);
    if (op !== '' && negated) { bad_negation(o.name, true); return OPTN_ERR; }
    keep(o, negated && op === '' ? false : (op === '' ? true : op), result);
    if (op === '' || strcmpi_eq(op, 'all') || strcmpi_eq(op, 'none')) return OPTN_OK;
    let prefix_val = null;
    for (let i = 0; i < op.length; i++) {
        let c = lowc(op[i]);
        if (c === 'k') c = 'v';
        if (c === 'd') c = 'o';
        if (DISCLOSURE_OPTIONS.includes(c)) {
            prefix_val = null;
        } else if (DISCLOSE_VALID.includes(c)) {
            prefix_val = c;
        } else if (c === ' ') {
            /* do nothing */
        } else {
            config_error_add(`Unknown ${o.name} parameter '${op[i]}'`);
            return OPTN_ERR;
        }
    }
    return OPTN_OK;
}

// C ref: options.c optfn_fruit() — mungspaces()'d, and an empty value defaults
// to "slime mold".  During config reading the 100-fruit cap cannot be hit.
function optfn_fruit(o, negated, opts, op, result) {
    op = string_for_opt(opts, negated);
    if (negated) {
        if (op !== '') { bad_negation('fruit', true); return OPTN_ERR; }
        op = '';
    } else if (op === '') {
        return OPTN_ERR;
    }
    op = mungspaces(op);
    let fruit = sanitize_name(nmcpy(op, 128 /* PL_FSIZ */));
    if (!fruit) fruit = 'slime mold';
    result.flags.fruit = fruit;
    result.pl_fruit = fruit;
    return OPTN_OK;
}

// C ref: options.c optfn_menu_headings() -> coloratt.c color_attr_parse_str().
function optfn_menu_headings(o, negated, opts, op, result) {
    if (op === '') {
        result.iflags.menu_headings = { attr: negated ? ATR_NONE : ATR_INVERSE,
                                       color: NO_COLOR_IDX };
        keep(o, negated ? false : true, result);
        return OPTN_OK;
    } else if (negated) {
        bad_negation(o.name, true);
        return OPTN_SILENTERR;
    }
    const ca = color_attr_parse_str(op);
    if (!ca) return OPTN_ERR;
    result.iflags.menu_headings = ca;
    keep(o, op, result);
    return OPTN_OK;
}

// C ref: options.c optfn_menu_objsyms() + objsymvals[].
const OBJSYMVALS = ['none', 'headers', 'entries', 'both', 'conditional',
                    'one-or-other'];
function optfn_menu_objsyms(o, negated, opts, op, result) {
    let osyms;
    if (negated) {
        osyms = 0;
    } else if (op === '') {
        osyms = opts.startsWith('use_menu_glyphs') ? 2 : 1;
    } else if (digit(op[0])) {
        const i = parseInt(op, 10) || 0;
        if (i >= OBJSYMVALS.length) {
            config_error_add(`Illegal ${o.name} parameter '${op}'`);
            return OPTN_ERR;
        }
        osyms = i;
    } else {
        osyms = 0;
        const k = op.length;
        for (let i = 0; i < OBJSYMVALS.length; i++) {
            let l = OBJSYMVALS[i].length;
            if (k >= 4) l = k;
            if (strncmpi_eq(OBJSYMVALS[i], op, l)
                || (i === 5 && strncmpi_eq('one-or-the-other', op, 16))) {
                osyms = i;
                break;
            }
        }
    }
    set_menuobjsyms_flags(osyms, result);
    keep(o, op === '' ? !negated : op, result);
    return OPTN_OK;
}

// C ref: options.c optfn_menuinvertmode().
function optfn_menuinvertmode(o, negated, opts, op, result) {
    if (op !== '') {
        const mode = parseInt(op, 10) || 0;
        if (mode < 0 || mode > 2) {
            config_error_add(`Illegal ${o.name} parameter '${op}'`);
            return OPTN_ERR;
        }
        result.iflags.menuinvertmode = mode;
        keep(o, op, result);
    }
    return OPTN_OK;
}

// C ref: options.c optfn_menustyle() — only the value's first letter matters,
// but a missing value on the full spelling is an error.
function optfn_menustyle(o, negated, opts, op, result) {
    const val_required = (opts.length > 5 && !negated);
    op = string_for_opt(opts, !val_required);
    let tmp;
    if (op === '') {
        if (val_required) return OPTN_ERR;  /* string_for_opt gave feedback */
        tmp = negated ? 'n' : 'f';
    } else {
        tmp = lowc(op[0]);
    }
    switch (tmp) {
    case 'n': case 't': case 'c': case 'f': case 'p':
        keep(o, op === '' ? (negated ? 'n' : 'f') : op, result);
        return OPTN_OK;
    default:
        config_error_add(`Unknown ${o.name} parameter '${op}'`);
        return OPTN_ERR;
    }
}

// C ref: options.c optfn_mouse_support().
function optfn_mouse_support(o, negated, opts, op, result) {
    const compat = (opts.length <= 13);
    op = string_for_opt(opts, compat);
    if (op === '') {
        if (compat || negated) result.iflags.wc_mouse_support = negated ? 0 : 1;
    } else {
        const mode = parseInt(op, 10) || 0;
        if (mode < 0 || mode > 2 || (mode === 0 && op[0] !== '0')) {
            config_error_add(`Illegal ${o.name} parameter '${op}'`);
            return OPTN_ERR;
        }
        result.iflags.wc_mouse_support = mode;
    }
    keep(o, op === '' ? !negated : op, result);
    return OPTN_OK;
}

// C ref: options.c optfn_msg_window() (PREV_MSGS is on for tty).
function optfn_msg_window(o, negated, opts, op, result) {
    let tmp;
    if (op === '') {
        tmp = negated ? 's' : 'f';
    } else {
        if (negated) { bad_negation(o.name, true); return OPTN_ERR; }
        tmp = lowc(op[0]);
    }
    switch (tmp) {
    case 's': case 'c': case 'f': case 'r':
        result.iflags.prevmsg_window = op === '' ? tmp : op;
        keep(o, op === '' ? tmp : op, result);
        return OPTN_OK;
    default:
        config_error_add(`Unknown ${o.name} parameter '${op}'`);
        return OPTN_ERR;
    }
}

// C ref: options.c optfn_msghistory().
function optfn_msghistory(o, negated, opts, op, result) {
    op = string_for_env_opt(o.name, opts, negated);
    if ((negated && op === '') || (!negated && op !== '')) {
        result.iflags.msg_history = negated ? 0 : (parseInt(op, 10) || 0);
        keep(o, negated ? 0 : op, result);
    } else if (negated) {
        bad_negation(o.name, true);
        return OPTN_ERR;
    }
    return OPTN_OK;
}

// C ref: options.c optfn_number_pad().
function optfn_number_pad(o, negated, opts, op, result) {
    const compat = (opts.length <= 10);
    op = string_for_opt(opts, compat);
    if (op === '') {
        if (compat || negated) {
            result.iflags.num_pad = !negated;
            result.iflags.num_pad_mode = 0;
            keep(o, !negated, result);
        }
    } else if (negated) {
        bad_negation(o.name, true);
        return OPTN_ERR;
    } else {
        const mode = parseInt(op, 10) || 0;
        if (mode < -1 || mode > 4 || (mode === 0 && op[0] !== '0')) {
            config_error_add(`Illegal ${o.name} parameter '${op}'`);
            return OPTN_ERR;
        } else if (mode <= 0) {
            result.iflags.num_pad = false;
            result.iflags.num_pad_mode = (mode < 0) ? 1 : 0;
        } else {
            result.iflags.num_pad = true;
            let m = 0;
            if (mode === 2 || mode === 4) m |= 1;
            if (mode === 3 || mode === 4) m |= 2;
            result.iflags.num_pad_mode = m;
        }
        keep(o, op, result);
    }
    return OPTN_OK;
}

// C ref: options.c change_inv_order() — every character must name an object
// class that is already in flags.inv_order, and none may repeat.
const DEF_INV_ORDER = [12, 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 13, 14, 16, 17, 15];
function change_inv_order(op, result) {
    let retval = 1;
    const buf = [];
    const inv_order = result.flags.inv_order_oc || DEF_INV_ORDER;
    if (!op.includes('$')) buf.push(12 /* COIN_CLASS */);
    for (let i = 0; i < op.length; i++) {
        const ch = op[i];
        let fail = false;
        const oc_sym = def_char_to_objclass(ch);
        if (oc_sym === MAXOCLASSES) {
            config_error_add(`Not an object class '${ch}'`);
            retval = 0; fail = true;
        } else if (!inv_order.includes(oc_sym)) {
            config_error_add(`Object class '${ch}' not allowed`);
            retval = 0; fail = true;
        } else if (op.indexOf(ch, i + 1) >= 0) {
            config_error_add(`Duplicate object class '${ch}'`);
            retval = 0; fail = true;
        }
        if (!fail) buf.push(oc_sym);
    }
    for (const oc of inv_order) if (!buf.includes(oc)) buf.push(oc);
    result.flags.inv_order_oc = buf.slice(0, MAXOCLASSES - 1);
    return retval;
}

// C ref: options.c optfn_packorder().
function optfn_packorder(o, negated, opts, op, result) {
    if (op === '') return OPTN_ERR;
    if (!change_inv_order(op, result)) return OPTN_ERR;
    keep(o, op, result);
    return OPTN_OK;
}

// C ref: options.c paranoia[] — {flagmask, argname, argMinLen, synonym,
// synMinLen}.  flag.h PARANOID_* bits; flags.paranoia_bits is what
// js/invent.js ParanoidRemove() and js/cmd.js's trap gate test.
const PARANOIA = [
    [0x0001, 'Confirm', 1, 'Paranoia', 2],
    [0x0002, 'quit', 1, 'explore', 2],
    [0x0004, 'die', 1, 'death', 2],
    [0x0008, 'bones', 1, null, 0],
    [0x0010, 'attack', 1, 'hit', 1],
    [0x0080, 'wand-break', 2, 'break-wand', 2],
    [0x0100, 'eat', 1, 'continue', 4],
    [0x0200, 'Were-change', 2, null, 0],
    [0x0400, 'pray', 1, null, 0],
    [0x0800, 'trap', 1, 'move-trap', 1],
    [0x1000, 'Autoall', 2, 'autoselect-all', 2],
    [0x2000, 'swim', 1, null, 0],
    [0x0040, 'Remove', 1, 'Takeoff', 1],
    [0, 'none', 4, null, 0],
    [~0, 'all', 3, null, 0],
];
function optfn_paranoid_confirmation(o, opt_negated, opts, op, result) {
    let plus_or_minus = false;
    let bits = result.flags.paranoia_bits | 0;

    if (strncmpi_eq(opts, 'prayconfirm', 4)) {
        if (op !== '') {
            config_error_add(`deprecated ${opt_negated ? '!' : ''}prayconfirm`
                             + ` option takes no parameters (found '${op}')`);
            return OPTN_SILENTERR;
        }
        op = (opt_negated ? '-' : '+') + 'pray';
        opt_negated = false;
    } else if (opt_negated) {
        if (op === '') { result.flags.paranoia_bits = 0; keep(o, false, result); return OPTN_OK; }
        config_error_add(`!${o.name} does not accept a value`);
        return OPTN_SILENTERR;
    } else if (op === '') {
        config_error_add(`${o.name} requires a value; use 'none' to cancel all`);
        return OPTN_SILENTERR;
    }

    const raw = op;
    op = mungspaces(op);
    if (op[0] !== '+' && op[0] !== '-') {
        bits = 0;
    } else {
        plus_or_minus = true;
        opt_negated = (op[0] === '-');
        op = op.slice(1);
        if (op[0] === ' ') op = op.slice(1);
    }

    for (;;) {
        let fld_negated = (op[0] === '!');
        if (fld_negated) {
            op = op.slice(1);
            if (op[0] === ' ') op = op.slice(1);
        } else if (lowc(op[0]) === 'n' && lowc(op[1]) === 'o'
                   && op[2] !== undefined && lowc(op[2]) !== 'n') {
            fld_negated = true;
            op = op.slice(2);
        }
        const sp = op.indexOf(' ');
        const token = sp >= 0 ? op.slice(0, sp) : op;
        let i = 0;
        for (; i < PARANOIA.length; i++) {
            const [mask, argname, argMinLen, synonym, synMinLen] = PARANOIA[i];
            if (match_optname(token, argname, argMinLen, false)
                || (synonym && match_optname(token, synonym, synMinLen, false))) {
                if (!mask) {
                    if (!plus_or_minus) bits = 0;
                } else if (opt_negated || fld_negated) {
                    bits &= ~mask;
                } else {
                    bits |= mask;
                }
                break;
            }
        }
        if (i === PARANOIA.length) {
            config_error_add(`Unknown ${o.name} parameter '${token}'`);
            result.flags.paranoia_bits = bits;
            return OPTN_SILENTERR;
        }
        if (sp < 0) break;
        op = op.slice(sp + 1);
    }
    result.flags.paranoia_bits = bits;
    keep(o, raw, result);
    return OPTN_OK;
}

// C ref: options.c perminv_modes[].
const PERMINV_MODES = [['none', 'off'], ['all', 'on'], ['full', 'gold'],
                       null, null, null, null, null,
                       ['in-use', 'inuse-only']];
function optfn_perminv_mode(o, negated, opts, op, result) {
    op = string_for_opt(opts, negated);
    if (op !== '' && negated) { bad_negation(o.name, true); return OPTN_SILENTERR; }
    if (op !== '') {
        const ln = op.length;
        let i = 0;
        for (; i < PERMINV_MODES.length; i++) {
            const m = PERMINV_MODES[i];
            if (!m) continue;
            if (strncmpi_eq(op, m[0], ln) || strncmpi_eq(op, m[1], ln)
                || op[0] === String.fromCharCode(48 + i)) {
                result.iflags.perminv_mode = i;
                result.iflags.perm_invent = true;
                break;
            }
        }
        if (i === PERMINV_MODES.length) {
            config_error_add(`Unknown ${o.name} parameter '${op}'`);
            result.iflags.perminv_mode = 0;
            result.iflags.perm_invent = false;
            return OPTN_SILENTERR;
        }
        keep(o, op, result);
    } else if (negated) {
        result.iflags.perminv_mode = 0;
        result.iflags.perm_invent = false;
        keep(o, false, result);
    }
    return OPTN_OK;
}

// C ref: options.c optfn_petattr() -> coloratt.c match_str2attr().
function optfn_petattr(o, negated, opts, op, result) {
    op = string_for_opt(opts, negated);
    let retval = OPTN_OK;
    if (op !== '' && negated) {
        bad_negation(o.name, true);
        retval = OPTN_ERR;
    } else if (op !== '') {
        const itmp = match_str2attr(op, false);
        if (itmp === -1) {
            config_error_add(`Unknown ${o.name} parameter '${opts}'`);
            retval = OPTN_ERR;
        } else {
            result.iflags.wc2_petattr = itmp;
            keep(o, op, result);
        }
    } else if (negated) {
        result.iflags.wc2_petattr = ATR_NONE;
        keep(o, false, result);
    }
    if (retval !== OPTN_ERR)
        result.flags.hilite_pet = (result.iflags.wc2_petattr !== ATR_NONE);
    return retval;
}

// C ref: options.c optfn_pettype() — one letter decides, and a bare "!pettype"
// with no value means "no pet".  An unrecognized value is an ERROR.
function optfn_pettype(o, negated, opts, op, result) {
    op = string_for_env_opt(o.name, opts, negated);
    if (op !== '') {
        result.flags.pettype = op;
        switch (lowc(op[0])) {
        case 'd': result.preferred_pet = 'd'; break;
        case 'c': case 'f': result.preferred_pet = 'c'; break;
        case 'h': case 'q': result.preferred_pet = 'h'; break;
        case 'n': result.preferred_pet = 'n'; break;
        case 'r': case '*': result.preferred_pet = ''; break; /* gp.preferred_pet = '\0' */
        default:
            config_error_add(`Unrecognized pet type '${op}'.`);
            return OPTN_ERR;
        }
    } else if (negated) {
        result.preferred_pet = 'n';
    }
    return OPTN_OK;
}

// C ref: options.c optfn_pickup_burden() + burdentype[].
function optfn_pickup_burden(o, negated, opts, op, result) {
    op = string_for_env_opt(o.name, opts, false);
    if (op === '') return OPTN_ERR;
    switch (lowc(op[0])) {
    case 'u': case 'b': case 's': case 'n': case 'o': case 't': case 'l':
        keep(o, op, result);
        return OPTN_OK;
    default:
        config_error_add(`Unknown ${o.name} parameter '${op}'`);
        return OPTN_ERR;
    }
}

// C ref: options.c optfn_pickup_types().  Note C's error message prints the
// walked-to-the-end `op`, i.e. an empty string.
function optfn_pickup_types(o, negated, opts, op, result) {
    const compat = (opts.length <= 6);
    op = string_for_opt(opts, compat);
    if (op === '') {
        if (compat || negated) {
            result.flags.pickup = !negated;
            return OPTN_OK;
        }
        return OPTN_OK; /* interactive prompt; unreachable from a config file */
    }
    if (negated) { bad_negation(o.name, true); return OPTN_ERR; }
    let i = 0;
    while (i < op.length && op[i] === ' ') i++;
    const rest = op.slice(i);
    if (rest[0] !== 'a' && rest[0] !== 'A') {
        let badopt = false;
        const seen = [];
        for (const ch of rest) {
            const oc_sym = def_char_to_objclass(ch);
            if (oc_sym !== MAXOCLASSES && !seen.includes(oc_sym)) seen.push(oc_sym);
            else badopt = true;
        }
        if (badopt) {
            config_error_add(`Unknown ${o.name} parameter ''`);
            return OPTN_ERR;
        }
    }
    keep(o, rest, result);
    return OPTN_OK;
}

// C ref: options.c optfn_pile_limit().
const PILE_LIMIT_DFLT = 5;
function optfn_pile_limit(o, negated, opts, op, result) {
    op = string_for_opt(opts, negated);
    let v;
    if ((negated && op === '') || (!negated && op !== '')) {
        v = negated ? 0 : (parseInt(op, 10) || 0);
    } else if (negated) {
        bad_negation(o.name, true);
        return OPTN_ERR;
    } else {
        v = PILE_LIMIT_DFLT;
    }
    if (v < 0) v = PILE_LIMIT_DFLT;
    result.flags.pile_limit = v;
    return OPTN_OK;
}

// C ref: options.c optfn_player_selection().
function optfn_player_selection(o, negated, opts, op, result) {
    op = string_for_opt(opts, negated);
    if (op !== '' && !negated) {
        if (strncmpi_eq(op, 'dialog', 6)) result.iflags.wc_player_selection = 0;
        else if (strncmpi_eq(op, 'prompt', 6)) result.iflags.wc_player_selection = 1;
        else {
            config_error_add(`Unknown ${o.name} parameter '${op}'`);
            return OPTN_ERR;
        }
        keep(o, op, result);
    }
    return OPTN_OK;
}

// C ref: options.c optfn_playmode() — a duplicate or a negation is rejected
// SILENTLY (complain_about_duplicate() has already spoken for the duplicate).
function optfn_playmode(o, negated, opts, op, result, duplicate) {
    if (duplicate || negated) return OPTN_ERR;
    if (op === '') return OPTN_ERR;
    if (strncmpi_eq(op, 'normal', 6) || strcmpi_eq(op, 'play')) {
        set_playmode('normal', result);
    } else if (strncmpi_eq(op, 'explore', 6) || strncmpi_eq(op, 'discovery', 6)) {
        set_playmode('explore', result);
    } else if (strncmpi_eq(op, 'debug', 5) || strncmpi_eq(op, 'wizard', 6)) {
        set_playmode('debug', result);
    } else {
        config_error_add(`Invalid value for "${o.name}":${op}`);
        return OPTN_ERR;
    }
    return OPTN_OK;
}

// C ref: options.c optfn_runmode() + runmodes[].
function optfn_runmode(o, negated, opts, op, result) {
    if (negated) {
        result.flags.runmode = 'teleport';
    } else if (op !== '') {
        if (str_start_is('teleport', op, true)) result.flags.runmode = 'teleport';
        else if (str_start_is('run', op, true)) result.flags.runmode = 'run';
        else if (str_start_is('walk', op, true)) result.flags.runmode = 'walk';
        else if (str_start_is('crawl', op, true)) result.flags.runmode = 'crawl';
        else {
            config_error_add(`Unknown ${o.name} parameter '${op}'`);
            return OPTN_ERR;
        }
    } else {
        config_error_add(`Value is mandatory for ${o.name}`);
        return OPTN_ERR;
    }
    return OPTN_OK;
}

// C ref: options.c optfn_scores() — "5t[op] 5a[round] o[wn]".
function optfn_scores(o, negated, opts, op, result) {
    op = string_for_opt(opts, false);
    if (op === '') return OPTN_ERR;
    if (negated) op = '';
    let i = 0;
    while (i < op.length) {
        let neg = (op[i] === '!') || strncmpi_eq(op.slice(i), 'no', 2);
        if (neg) i += (op[i] === '!') ? 1 : (op[i + 2] !== '-') ? 2 : 3;
        if (digit(op[i])) while (i < op.length && digit(op[i])) i++;
        while (op[i] === ' ') i++;
        switch (lowc(op[i] || '\0')) {
        case 't': case 'a': case 'o': case 'n':
            break;
        case '-':
            if (digit(op[i + 1])) {
                config_error_add(`Values for ${o.name}:top and ${o.name}:around`
                                 + ' must not be negative');
                return OPTN_SILENTERR;
            }
            /* FALLTHRU */
        default:
            config_error_add(`Unknown ${o.name} parameter '${op.slice(i)}'`);
            return OPTN_SILENTERR;
        }
        while (i < op.length && letter(op[i])) i++;
        while (op[i] === ' ') i++;
        if (op[i] === '/') i++;
    }
    keep(o, op, result);
    return OPTN_OK;
}

// C ref: options.c optfn_scroll_amount()/optfn_scroll_margin()/
// optfn_tile_height()/optfn_tile_width()/optfn_vary_msgcount() — the shared
// "numeric, negation resets to the default" shape.
function optfn_numeric_wc(o, negated, opts, op, result, negDflt, field) {
    op = string_for_opt(opts, negated);
    if ((negated && op === '') || (!negated && op !== '')) {
        result.iflags[field] = negated ? negDflt : (parseInt(op, 10) || 0);
        keep(o, negated ? negDflt : op, result);
    } else if (negated) {
        bad_negation(o.name, true);
        return OPTN_ERR;
    }
    return OPTN_OK;
}

// C ref: options.c optfn_sortdiscoveries().
function optfn_sortdiscoveries(o, negated, opts, op, result) {
    op = string_for_env_opt(o.name, opts, false);
    if (negated) { result.flags.discosort = 'o'; return OPTN_OK; }
    if (op === '') return OPTN_ERR;
    switch (lowc(op[0])) {
    case '0': case 'o': result.flags.discosort = 'o'; break;
    case '1': case 's': result.flags.discosort = 's'; break;
    case '2': case 'c': result.flags.discosort = 'c'; break;
    case '3': case 'a': result.flags.discosort = 'a'; break;
    default:
        config_error_add(`Unknown ${o.name} parameter '${op}'`);
        return OPTN_SILENTERR;
    }
    keep(o, op, result);
    return OPTN_OK;
}

// C ref: options.c optfn_sortloot().
function optfn_sortloot(o, negated, opts, op, result) {
    op = string_for_env_opt(o.name, opts, false);
    if (op === '') return OPTN_ERR;
    const c = lowc(op[0]);
    if (c !== 'n' && c !== 'l' && c !== 'f') {
        config_error_add(`Unknown ${o.name} parameter '${op}'`);
        return OPTN_ERR;
    }
    /* C: `flags.sortloot = c` — the single CHARACTER, which is what
       js/invent.js query_objlist() tests ('f' / 'l' / 'n'). */
    result.flags.sortloot = c;
    return OPTN_OK;
}

// C ref: options.c optfn_sortvanquished() + insight.c vanqorders[].
const VANQMODES = 'tdaACcnz';
function optfn_sortvanquished(o, negated, opts, op, result) {
    op = string_for_env_opt(o.name, opts, false);
    if (negated) { result.flags.vanq_sortmode = 0; return OPTN_OK; }
    if (op === '') return OPTN_ERR;
    let vndx;
    if (VANQMODES.indexOf(op[0]) >= 0) vndx = VANQMODES.indexOf(op[0]);
    else if ('01234567'.includes(op[0])) vndx = op.charCodeAt(0) - 48;
    else {
        config_error_add(`Unknown ${o.name} parameter '${op}'`);
        return OPTN_SILENTERR;
    }
    result.flags.vanq_sortmode = vndx;
    keep(o, op, result);
    return OPTN_OK;
}

// C ref: options.c optfn_statushilites() (STATUS_HILITES is defined).
function optfn_statushilites(o, negated, opts, op, result) {
    if (negated) {
        result.iflags.hilite_delta = 0;
    } else {
        op = string_for_opt(opts, true);
        let d = (op === '') ? 3 : (parseInt(op, 10) || 0);
        if (d < 0) d = 1;
        result.iflags.hilite_delta = d;
        keep(o, op === '' ? 3 : op, result);
    }
    return OPTN_OK;
}

// C ref: options.c optfn_statuslines() — 2 or 3, and nothing else.
function optfn_statuslines(o, negated, opts, op, result) {
    op = string_for_opt(opts, negated);
    let itmp = 0, retval = OPTN_OK;
    if (negated) {
        bad_negation(o.name, true);
        itmp = 2;
        retval = OPTN_ERR;
    } else if (op !== '') {
        itmp = parseInt(op, 10) || 0;
    }
    if (itmp < 2 || itmp > 3) {
        config_error_add(`'${o.name}:${op}' is invalid; must be 2 or 3`);
        retval = OPTN_SILENTERR;
    } else {
        result.iflags.wc2_statuslines = itmp;
        keep(o, op, result);
    }
    return retval;
}

// C ref: version.c get_feature_notice_ver() — strictly "maj.min.patch".
function get_feature_notice_ver(str) {
    const parts = [];
    let cur = '';
    for (const c of str) {
        if (c === '.') {
            parts.push(cur); cur = '';
            if (parts.length === 2) { parts.push(str.slice(str.indexOf('.', str.indexOf('.') + 1) + 1)); break; }
        } else if (digit(c)) {
            cur += c;
        } else {
            return 0;
        }
    }
    if (parts.length !== 3) return 0;
    const [a, b, c] = parts;
    if (!/^[0-9]*$/.test(c)) return 0;
    return ((parseInt(a, 10) || 0) << 24) | ((parseInt(b, 10) || 0) << 16)
           | ((parseInt(c, 10) || 0) << 8);
}

// C ref: version.c get_current_feature_ver() — FEATURE_NOTICE_VER of the
// running binary (VERSION_MAJOR.VERSION_MINOR.PATCHLEVEL == 5.0.0).
const CURRENT_FEATURE_VER = (5 << 24) | (0 << 16) | (0 << 8);

// C ref: options.c feature_alert_opts().
function feature_alert_opts(op, optn, result) {
    const fnv = get_feature_notice_ver(op);
    if (fnv === 0) return 0;
    if (fnv > CURRENT_FEATURE_VER) {
        config_error_add(`${optn}=${op} Invalid reference to a future version ignored`);
        return 0;
    }
    result.flags.suppress_alert = op;
    return 1;
}

// C ref: options.c optfn_suppress_alert().
function optfn_suppress_alert(o, negated, opts, op, result) {
    if (negated) { bad_negation(o.name, false); return OPTN_ERR; }
    if (op !== '') feature_alert_opts(op, o.name, result);
    return OPTN_OK;
}

// C ref: options.c optfn_term_cols()/optfn_term_rows().
const LARGEST_INT = 32767;
function optfn_term_dim(o, negated, opts, op, result, field) {
    op = string_for_opt(opts, negated);
    if (op !== '') {
        const ltmp = parseInt(op, 10) || 0;
        if (ltmp <= 0 || ltmp >= LARGEST_INT) {
            config_error_add(`Invalid ${o.name}: ${ltmp}`);
            return OPTN_ERR;
        }
        result.iflags[field] = ltmp;
        keep(o, op, result);
    }
    return OPTN_OK;
}

// C ref: options.c optfn_versinfo() — 1, 2, 4 or a sum of them.
function optfn_versinfo(o, negated, opts, op, result) {
    if (negated) { bad_negation(o.name, true); return OPTN_SILENTERR; }
    op = string_for_opt(opts, false);
    if (op === '') {
        config_error_add(`'${o.name}' requires a value; defaulting to 1`);
        return OPTN_SILENTERR;
    }
    const val = parseInt(op, 10) || 0;
    if (!val || (val & ~7) !== 0) {
        config_error_add(`'${o.name}' must be one of 1, 2, 4, or the sum of`
                         + ' two or all three of those');
        return OPTN_SILENTERR;
    }
    result.flags.versinfo = val;
    return OPTN_OK;
}

// C ref: options.c warning_opts() — the value's characters ARE the warning
// symbols, after escapes(); a 0 byte leaves that level's default.
function warning_opts(opts, optype, result) {
    let s = string_for_env_opt(optype, opts, false);
    if (s === '') return false;
    s = escapes(s);
    const translate = [];
    for (let i = 0; i < WARNCOUNT; i++)
        translate[i] = (i >= s.length) ? 0 : s.charCodeAt(i);
    assign_warnings(translate, result);
    return true;
}

// C ref: options.c optfn_whatis_coord() — GPCOORDS_* are 'n','c','C','m','s'.
function optfn_whatis_coord(o, negated, opts, op, result) {
    if (negated) { result.iflags.getpos_coords = 'n'; return OPTN_OK; }
    op = string_for_env_opt(o.name, opts, false);
    if (op === '') return OPTN_ERR;
    /* getpos.c GPCOORDS_NONE/COMPASS/COMFULL/MAP/SCREEN; lowc() means the
       upper-case COMFULL spelling can never be selected, exactly as in C */
    const c = lowc(op[0]);
    if (c && 'ncCms'.includes(c)) {
        result.iflags.getpos_coords = c;
        keep(o, op, result);
        return OPTN_OK;
    }
    config_error_add(`Unknown ${o.name} parameter '${op}'`);
    return OPTN_ERR;
}

// C ref: options.c optfn_whatis_filter().
function optfn_whatis_filter(o, negated, opts, op, result) {
    if (negated) { result.iflags.getloc_filter = 'n'; return OPTN_OK; }
    op = string_for_env_opt(o.name, opts, false);
    if (op === '') return OPTN_ERR;
    switch (lowc(op[0])) {
    case 'n': case 'v': case 'a':
        result.iflags.getloc_filter = lowc(op[0]);
        keep(o, op, result);
        return OPTN_OK;
    default:
        config_error_add(`Unknown ${o.name} parameter '${op}'`);
        return OPTN_ERR;
    }
}

// C ref: options.c optfn_windowborders() — 0..4.
function optfn_windowborders(o, negated, opts, op, result) {
    op = string_for_opt(opts, negated);
    if (negated && op !== '') { bad_negation(o.name, true); return OPTN_ERR; }
    const itmp = negated ? 0 : (op === '' ? 1 : (parseInt(op, 10) || 0));
    if (itmp < 0 || itmp > 4) {
        config_error_add(`Invalid ${o.name} (should be within 0 to 4): ${opts}`);
        return OPTN_SILENTERR;
    }
    result.iflags.wc2_windowborders = itmp;
    keep(o, op === '' ? itmp : op, result);
    return OPTN_OK;
}

// C ref: options.c optfn_map_mode().
const MAP_MODES = ['tiles', 'ascii4x6', 'ascii6x8', 'ascii8x8', 'ascii16x8',
                   'ascii7x12', 'ascii8x12', 'ascii16x12', 'ascii12x16',
                   'ascii10x18', 'fit_to_screen', 'ascii_fit_to_screen',
                   'tiles_fit_to_screen'];
function optfn_map_mode(o, negated, opts, op, result) {
    op = string_for_opt(opts, negated);
    if (op !== '' && !negated) {
        if (strcmpi_eq(op, 'tiles')) { keep(o, op, result); return OPTN_OK; }
        for (const nm of MAP_MODES) {
            if (nm === 'tiles') continue;
            if (strncmpi_eq(op, nm, nm.length)) { keep(o, op, result); return OPTN_OK; }
        }
        config_error_add(`Unknown ${o.name} parameter '${op}'`);
        return OPTN_ERR;
    } else if (negated) {
        bad_negation(o.name, true);
        return OPTN_ERR;
    }
    return OPTN_OK;
}

// C ref: options.c pfxfn_font() — a font_<known suffix> is accepted, anything
// else under the `font` prefix is "Unknown font parameter".
const FONT_OPTS = ['font_map', 'font_menu', 'font_message', 'font_status',
                   'font_text', 'font_size_map', 'font_size_menu',
                   'font_size_message', 'font_size_status', 'font_size_text'];
function pfxfn_font(o, negated, opts, op, result) {
    if (!FONT_OPTS.includes(o.name)) {
        config_error_add(`Unknown font parameter '${opts}'`);
        return OPTN_ERR;
    }
    op = string_for_opt(opts, false);
    if (op !== '') { keep(o, op, result); return OPTN_OK; }
    if (negated) { bad_negation(o.name, true); return OPTN_ERR; }
    return OPTN_OK;
}

// C ref: botl.c condtests[].useroption — the suffix a cond_ option names.
// Table ORDER decides: parse_cond_option() returns on the FIRST match.
const CONDTESTS_USEROPTION = `barehanded blind busy conf deaf iron fly foodPois
glowhands grab hallucinat held ice lava levitate paralyzed ride sleep slime slip
stone strngl stun submerged termIll tethered trap unconscious woundedlegs
holding`.split(/\s+/);

// C ref: botl.c parse_cond_option() — 0 ok, 1 unknown, 2 nothing after the
// prefix.  match_optname() is called with val_allowed FALSE, so a cond_ option
// carrying a ":value" matches NOTHING and is reported as unknown.
function parse_cond_option(negated, opts, result) {
    const PREFIX = 'cond_';
    if (!opts || opts.length <= PREFIX.length) return 2;
    const uniqpart = opts.slice(PREFIX.length);
    for (const compareto of CONDTESTS_USEROPTION) {
        const sl = compareto.length;
        if (match_optname(uniqpart, compareto, sl >= 4 ? 4 : sl, false)) {
            result.conds[compareto] = !negated;
            return 0;
        }
    }
    return 1;
}

// C ref: options.c pfxfn_cond_().
function pfxfn_cond_(o, negated, opts, op, result) {
    const reslt = parse_cond_option(negated, opts, result);
    if (reslt === 3) config_error_add(`Ambiguous condition option ${opts}`);
    else if (reslt !== 0)
        config_error_add(`Unknown condition option ${opts} (${reslt})`);
    return reslt === 0 ? OPTN_OK : OPTN_ERR;
}

// C ref: options.c optfn_hilite_status().
function optfn_hilite_status(o, negated, opts, op, result) {
    op = string_for_opt(opts, true);
    if (op !== '' && negated) { result.status_hilites = []; return OPTN_OK; }
    if (op === '') {
        config_error_add('Value is mandatory for hilite_status');
        return OPTN_ERR;
    }
    if (!parse_status_hl1(op, true, result)) return OPTN_ERR;
    return OPTN_OK;
}

// C ref: options.c optfn_glyph() -> utf8map.c glyphrep_to_custom_map_entries().
// Our renderer has no custom glyph map; the parse still has to reject a value
// that C rejects, and C requires at least "G_name:U+NNNN".
function optfn_glyph(o, negated, opts, op, result) {
    if (negated) {
        if (op !== '') { bad_negation('glyph', true); return OPTN_ERR; }
    }
    if (op === '') return OPTN_ERR;
    return OPTN_OK;
}

// The remaining compound options whose do_set does nothing at all but which
// must still MATCH so that no error is reported: optfn_dungeon(),
// optfn_effects(), optfn_monsters(), optfn_objects(), optfn_traps() and
// optfn_altkeyhandling() on a non-WIN32 build.
function optfn_noop(o, negated, opts, op, result) {
    if (op !== '') keep(o, op, result);
    return OPTN_OK;
}

// C ref: options.c optfn_name()/optfn_soundlib()/optfn_windowtype()/
// optfn_tile_file()/optfn_crash_email()/optfn_crash_name() — "value required,
// then keep it".
function optfn_string_required(o, negated, opts, op, result, envOpt) {
    op = envOpt ? string_for_env_opt(o.name, opts, false)
                : string_for_opt(opts, false);
    if (op === '') return OPTN_ERR;
    if (o.name === 'name') {
        // optn_name is what the recording harness reads back out of the rc to
        // build its '-u' argument, so it is the value that survives into the
        // game (see parseNethackrc()).
        result.optname = nmcpy(op, PL_NSIZ);
        return OPTN_OK;   /* svp.plname, not flags[] */
    }
    keep(o, op, result);
    return OPTN_OK;
}

// C ref: options.c optfn_windowcolors() -> wc_set_window_colors().
function optfn_windowcolors(o, negated, opts, op, result) {
    op = string_for_opt(opts, false);
    if (op !== '') {
        if (!wc_set_window_colors(op)) {
            config_error_add(`Could not set ${o.name} '${op}'`);
            return OPTN_ERR;
        }
        keep(o, op, result);
    }
    return OPTN_OK;
}

// C ref: coloratt.c wc_set_window_colors() — "menu fg/bg message fg/bg ...";
// each window name must be one of menu/message/status/text and each colour a
// known colour name.
const WCNAMES = ['menu', 'message', 'status', 'text'];
function wc_set_window_colors(op) {
    let s = mungspaces(op);
    while (s.length) {
        const sp = s.indexOf(' ');
        if (sp < 0) return false;
        const wn = s.slice(0, sp);
        let i = 0;
        for (; i < WCNAMES.length; i++) if (strcmpi_eq(wn, WCNAMES[i])) break;
        if (i === WCNAMES.length) return false;
        s = s.slice(sp + 1);
        let end = s.indexOf(' ');
        const pair = end < 0 ? s : s.slice(0, end);
        s = end < 0 ? '' : s.slice(end + 1);
        const slash = pair.indexOf('/');
        if (slash < 0) return false;
        for (const part of [pair.slice(0, slash), pair.slice(slash + 1)]) {
            if (!part || strcmpi_eq(part, 'default')) continue;
            if (match_str2clr(part, true) >= CLR_MAX) return false;
        }
    }
    return true;
}

// C ref: options.c optfn_role()/optfn_race()/optfn_gender()/optfn_alignment().
// The `!value` forms are role FILTERS (setrolefilter()), which change what
// chargen offers; the positive forms are validated by str2role() &c and an
// unknown one is a config error.
function optfn_roleopt(o, negated, opts, op, result) {
    const r = parse_role_opt(o, negated, o.name, opts, result);
    if (!r.ok) return OPTN_SILENTERR;
    if (r.op !== '!') {
        const which = o.name;
        const idx = (which === 'role') ? str2role(r.op)
                    : (which === 'race') ? str2race(r.op)
                    : (which === 'gender') ? str2gend(r.op)
                    : str2align(r.op);
        if (idx === ROLE_NONE) {
            config_error_add(`Unknown ${o.name} '${r.op}'`);
            return OPTN_ERR;
        }
        if (which === 'alignment') result.align = r.op;
        else result[which] = r.op;
    }
    return OPTN_OK;
}

// C ref: role.c clearrolefilter()/setrolefilter().  gr.rfilter is a GLOBAL set
// during config parsing, and js/role.js reads it off `game.rfilter`, so the
// filter is published there the way C publishes it.
const RS_ROLE = 0, RS_RACE = 1, RS_GENDER = 2, RS_ALGNMNT = 3;
function rolefilter(result) {
    if (!result.rfilter) result.rfilter = { roles: [], mask: 0 };
    return result.rfilter;
}
function clearrolefilter(which, result) {
    const f = rolefilter(result);
    if (which === RS_ROLE) f.roles = [];
    else if (which === RS_RACE) for (const r of races) f.mask &= ~r.selfmask;
    else if (which === RS_GENDER) for (const g of genders) f.mask &= ~g.allow;
    else if (which === RS_ALGNMNT) for (const a of aligns) f.mask &= ~a.allow;
}
function setrolefilter(bufp, result) {
    const f = rolefilter(result);
    let i;
    if ((i = str2role(bufp)) !== ROLE_NONE && i !== ROLE_RANDOM) f.roles[i] = true;
    else if ((i = str2race(bufp)) !== ROLE_NONE && i !== ROLE_RANDOM) f.mask |= races[i].selfmask;
    else if ((i = str2gend(bufp)) !== ROLE_NONE && i !== ROLE_RANDOM) f.mask |= genders[i].allow;
    else if ((i = str2align(bufp)) !== ROLE_NONE && i !== ROLE_RANDOM) f.mask |= aligns[i].allow;
    else return false;
    return true;
}

// C ref: options.c parse_role_opt() — accepts "role:priest", "race:!orc",
// "!role:tou rog wiz"; rejects mixed negation and a positive list.
function parse_role_opt(o, negated, fullname, opts, result) {
    const which = (o.name === 'role') ? RS_ROLE
                  : (o.name === 'race') ? RS_RACE
                  : (o.name === 'gender') ? RS_GENDER
                  : (o.name === 'alignment') ? RS_ALGNMNT : -1;
    let raw = string_for_env_opt(fullname, opts, false);
    if (raw === '') return { ok: false, op: '' };

    let op = mungspaces(raw);
    let prev_negated = false, first = true, retop = '';
    let i = 0;
    while (i < op.length) {
        if (op[i] === ' ') i++;
        let val_negated = false;
        while (op[i] === '!' || strncmpi_eq(op.slice(i), 'no', 2)) {
            val_negated = !val_negated;
            i += (op[i] === '!') ? 1 : (op[i + 2] !== '-') ? 2 : 3;
        }
        if (i >= op.length || op[i] === ' ') {
            config_error_add(`Negated nothing for '${fullname}'`);
            return { ok: false, op: '' };
        }
        if (!first) {
            if ((val_negated !== prev_negated) || (negated && val_negated)) {
                config_error_add(`Invalid mixed negation for '${negated ? '!' : ''}${fullname}'`);
                return { ok: false, op: '' };
            } else if (!negated && !val_negated) {
                config_error_add('Multiple role values only allowed when list is negated');
                return { ok: false, op: '' };
            }
        }
        first = false;
        prev_negated = val_negated;

        const sp = op.indexOf(' ', i);
        const token = sp >= 0 ? op.slice(i, sp) : op.slice(i);
        if (val_negated || negated) {
            clearrolefilter(which, result);
            if (!setrolefilter(token, result)) {
                config_error_add(`Invalid ${fullname} '${token}'`);
                return { ok: false, op: '' };
            }
            retop = '!';
        } else {
            retop = token;
        }
        if (sp >= 0) i = sp + 1; else break;
    }
    return { ok: true, op: retop };
}

// ---------------------------------------------------------------------------
// coloratt.c — the colour and attribute names MENUCOLOR=, HILITE_STATUS=,
// menu_headings: and petattr: are matched against.

// C ref: include/color.h CLR_*.
const CLR_MAX = 16, NO_COLOR_IDX = 8;
// C ref: coloratt.c colornames[]; everything after the NULL entry is an alias.
const COLORNAMES = [
    ['black', 0], ['red', 1], ['green', 2], ['brown', 3], ['blue', 4],
    ['magenta', 5], ['cyan', 6], ['gray', 7], ['orange', 9],
    ['light green', 10], ['yellow', 11], ['light blue', 12],
    ['light magenta', 13], ['light cyan', 14], ['white', 15], ['no color', 8],
    ['transparent', 8], ['purple', 5], ['light purple', 13],
    ['bright purple', 13], ['grey', 7], ['bright red', 9],
    ['bright green', 10], ['bright blue', 12], ['bright magenta', 13],
    ['bright cyan', 14],
];
// C ref: include/color.h ATR_*, coloratt.c attrnames[].
const ATR_NONE = 0, ATR_BOLD = 1, ATR_DIM = 2, ATR_ITALIC = 3, ATR_ULINE = 4,
      ATR_BLINK = 5, ATR_INVERSE = 6;
const ATTRNAMES = [
    ['none', ATR_NONE], ['bold', ATR_BOLD], ['dim', ATR_DIM],
    ['italic', ATR_ITALIC], ['underline', ATR_ULINE], ['blink', ATR_BLINK],
    ['inverse', ATR_INVERSE],
    ['normal', ATR_NONE], ['uline', ATR_ULINE], ['reverse', ATR_INVERSE],
];

// C ref: coloratt.c match_str2clr() — fuzzymatch over " -_", then a bare
// number.  Returns CLR_MAX for "none of the above".
function match_str2clr(str, suppress_msg) {
    let c = CLR_MAX, found = false;
    for (const [name, color] of COLORNAMES)
        if (fuzzymatch(str, name, ' -_', true)) { c = color; found = true; break; }
    if (!found && digit(str[0])) c = parseInt(str, 10) || 0;
    if (c < 0 || c >= CLR_MAX) {
        if (!suppress_msg) config_error_add(`Unknown color '${str.slice(0, 60)}'`);
        c = CLR_MAX;
    }
    return c;
}

// C ref: coloratt.c match_str2attr().
function match_str2attr(str, complain) {
    let a = -1;
    for (const [name, attr] of ATTRNAMES)
        if (fuzzymatch(str, name, ' -_', true)) { a = attr; break; }
    if (a === -1 && complain)
        config_error_add(`Unknown text attribute '${str.slice(0, 50)}'`);
    return a;
}

// C ref: coloratt.c color_attr_parse_str() — "color", "attr", "color&attr" or
// "attr&color".  Returns null on failure (the messages were already added).
function color_attr_parse_str(str) {
    const amp = str.indexOf('&');
    let c = NO_COLOR_IDX, a = ATR_NONE;
    if (amp >= 0) {
        const buf = str.slice(0, amp), tail = str.slice(amp + 1);
        c = match_str2clr(buf, false);
        a = match_str2attr(tail, true);
        if (c >= CLR_MAX && a === -1) {
            c = match_str2clr(tail, false);
            a = match_str2attr(buf, true);
        }
        if (c >= CLR_MAX || a === -1) return null;
    } else {
        const tmp = match_str2attr(str, false);
        if (tmp === -1) {
            const cc = match_str2clr(str, false);
            if (cc >= CLR_MAX) return null;
            c = cc;
        } else {
            a = tmp;
        }
    }
    return { attr: a, color: c };
}

// ---------------------------------------------------------------------------
// MENUCOLOR= — coloratt.c add_menu_coloring().

// C ref: coloratt.c add_menu_coloring_parsed().
function add_menu_coloring_parsed(str, c, a, result) {
    const ere = ere_compile(str);
    if (ere.error) {
        config_error_add(`Menucolor regex error: ${ere.error}`);
        return false;
    }
    let re;
    try { re = new RegExp(ere.jsSource); }
    catch (e) { config_error_add(`Menucolor regex error: ${e.message}`); return false; }
    /* tmp->next = gm.menu_colorings: newest first, which is the order
       get_menu_coloring() walks */
    result.menucolors.unshift({ origstr: str, regex: re, color: c, attr: a });
    result.flags.menucolors = true;
    return true;
}

// C ref: coloratt.c add_menu_coloring() — '"regex"=color&attr'.
function add_menu_coloring(tmpstr, result) {
    let str = tmpstr.slice(0, 255);
    let cs = str.indexOf('=');
    if (cs < 0) {
        config_error_add('Malformed MENUCOLOR');
        return false;
    }
    let tmps = mungspaces(str.slice(cs + 1));
    const amp = tmps.indexOf('&');
    let attrpart = null;
    if (amp >= 0) { attrpart = tmps.slice(amp + 1); tmps = tmps.slice(0, amp); }

    const c = match_str2clr(tmps, false);
    if (c >= CLR_MAX) return false;
    let a = ATR_NONE;
    if (attrpart !== null) {
        a = match_str2attr(attrpart, true);
        if (a === -1) return false;
    }

    /* the regexp portion has NOT been condensed by mungspaces() */
    let pat = str.slice(0, cs);
    if (pat[0] === '"' || pat[0] === "'") {
        let end = pat.length - 1;
        while (end > 0 && isspace(pat[end])) end--;
        if (pat[end] === pat[0]) pat = pat.slice(1, end);
    }
    return add_menu_coloring_parsed(pat, c, a, result);
}

// ---------------------------------------------------------------------------
// MSGTYPE= — options.c msgtype_parse_add()/msgtype_add()/msgtype_type().

// C ref: options.c msgtype_names[]; MSGTYP_* from include/hack.h.
const MSGTYP_NORMAL = 0, MSGTYP_NOREP = 1, MSGTYP_NOSHOW = 2, MSGTYP_STOP = 3;
const MSGTYPE_NAMES = [
    ['show', MSGTYP_NORMAL], ['hide', MSGTYP_NOSHOW], ['noshow', MSGTYP_NOSHOW],
    ['stop', MSGTYP_STOP], ['more', MSGTYP_STOP], ['norep', MSGTYP_NOREP],
];

// C ref: options.c msgtype_add().
function msgtype_add(typ, pattern, result) {
    const ere = ere_compile(pattern);
    if (ere.error) {
        config_error_add(`MSGTYPE regex error: ${ere.error}`);
        return false;
    }
    let re;
    try { re = new RegExp(ere.jsSource); }
    catch (e) { config_error_add(`MSGTYPE regex error: ${e.message}`); return false; }
    /* tmp->next = gp.plinemsg_types: newest first */
    result.msgtypes.unshift({ msgtype: typ, pattern, regex: re });
    return true;
}

// C ref: options.c msgtype_parse_add() — `sscanf(str, "%10s \"%255[^\"]\"")`,
// so the type is the first whitespace-delimited word (at most 10 characters)
// and the pattern is what sits between the next pair of double quotes.
function msgtype_parse_add(str, result) {
    let i = 0;
    while (i < str.length && isspace(str[i])) i++;
    let word = '';
    while (i < str.length && !isspace(str[i]) && word.length < 10) word += str[i++];
    /* %10s stops after 10 characters but the following " \"" still has to
       match, so a longer word makes the whole sscanf fail */
    let j = i;
    while (j < str.length && isspace(str[j])) j++;
    const haveQuote = word.length > 0 && str[j] === '"';
    let pattern = '';
    if (haveQuote) {
        j++;
        while (j < str.length && str[j] !== '"' && pattern.length < 255) pattern += str[j++];
    }
    if (!haveQuote || j >= str.length || str[j] !== '"' || !pattern.length) {
        config_error_add('Malformed MSGTYPE');
        return false;
    }
    for (const [name, typ] of MSGTYPE_NAMES)
        if (str_start_is(name, word, true)) return msgtype_add(typ, pattern, result);
    config_error_add(`Unknown message type '${word}'`);
    return false;
}

// C ref: options.c msgtype_type() — the first MSGTYPE whose regex matches wins.
// Exported so the topline writer can consult it; the list is on `game`.
export function msgtype_type(msg, norepeat) {
    const list = game.msgtypes;
    if (list) {
        for (const t of list)
            if (t.regex.test(msg)) return t.msgtype;
    }
    return norepeat ? MSGTYP_NOREP : MSGTYP_NORMAL;
}

// C ref: options.c msgtype_count().
export function msgtype_count() {
    return game.msgtypes ? game.msgtypes.length : 0;
}

// C ref: options.c count_apes().
export function count_apes() {
    return game.apelist ? game.apelist.length : 0;
}

// C ref: coloratt.c count_menucolors().
export function count_menucolors() {
    return game.menucolors ? game.menucolors.length : 0;
}

// C ref: botl.c count_cond().
export function count_cond() {
    const c = game.conds;
    if (!c) return 0;
    let n = 0;
    for (const k of Object.keys(c)) if (c[k]) n++;
    return n;
}

// C ref: botl.c count_status_hilites().
export function count_status_hilites() {
    return game.status_hilites ? game.status_hilites.length : 0;
}

// ---------------------------------------------------------------------------
// HILITE_STATUS= — botl.c parse_status_hl1()/parse_status_hl2().

// C ref: botl.c initblstats[] — [fldname, anytype, percent_capable].
const ANY_STR = 's', ANY_INT = 'i', ANY_LONG = 'l', ANY_MASK32 = 'm';
const INITBLSTATS = [
    ['title', ANY_STR, false], ['strength', ANY_INT, false],
    ['dexterity', ANY_INT, false], ['constitution', ANY_INT, false],
    ['intelligence', ANY_INT, false], ['wisdom', ANY_INT, false],
    ['charisma', ANY_INT, false], ['alignment', ANY_STR, false],
    ['score', ANY_LONG, false], ['carrying-capacity', ANY_INT, false],
    ['gold', ANY_LONG, false], ['power', ANY_INT, true],
    ['power-max', ANY_INT, false], ['experience-level', ANY_INT, true],
    ['armor-class', ANY_INT, false], ['HD', ANY_INT, false],
    ['time', ANY_LONG, false], ['hunger', ANY_INT, false],
    ['hitpoints', ANY_INT, true], ['hitpoints-max', ANY_INT, false],
    ['dungeon-level', ANY_STR, false], ['experience', ANY_LONG, true],
    ['condition', ANY_MASK32, false], ['version', ANY_STR, false],
    ['weapon', ANY_STR, false], ['armor', ANY_STR, false],
    ['terrain', ANY_STR, false],
];
// C ref: botl.c fieldids_alias[].
const FIELDIDS_ALIAS = [
    ['characteristics', 'characteristics'], ['encumbrance', 'carrying-capacity'],
    ['experience-points', 'experience'], ['dx', 'dexterity'],
    ['co', 'constitution'], ['con', 'constitution'], ['points', 'score'],
    ['cap', 'carrying-capacity'], ['pw', 'power'], ['pw-max', 'power-max'],
    ['xl', 'experience-level'], ['xplvl', 'experience-level'],
    ['ac', 'armor-class'], ['hit-dice', 'HD'], ['turns', 'time'],
    ['hp', 'hitpoints'], ['hp-max', 'hitpoints-max'],
    ['dgn', 'dungeon-level'], ['xp', 'experience'], ['exp', 'experience'],
    ['flags', 'condition'],
];
// C ref: botl.c enc_stat[] and the hutxt[] copy of eat.c hu_stat[].
const ENC_STAT = ['', 'Burdened', 'Stressed', 'Strained', 'Overtaxed', 'Overloaded'];
const HU_TXT = ['Satiated', '', 'Hungry', 'Weak', 'Fainting', 'Fainted', 'Starved'];
const ALIGNTXT = ['chaotic', 'neutral', 'lawful'];

// C ref: botl.c fldname_to_bl_indx() — canonical names, then aliases, then
// leading-substring matches; ambiguity means "no match".
function fldname_to_bl_indx(name) {
    if (!name) return null;
    let nmatches = 0, fld = null;
    for (const row of INITBLSTATS)
        if (fuzzymatch(row[0], name, ' -_', true)) { fld = row[0]; nmatches++; }
    if (!nmatches)
        for (const [alias, canon] of FIELDIDS_ALIAS)
            if (fuzzymatch(alias, name, ' -_', true)) { fld = canon; nmatches++; }
    if (!nmatches)
        for (const row of INITBLSTATS)
            if (strncmpi_eq(name, row[0], name.length)) { fld = row[0]; nmatches++; }
    return nmatches === 1 ? fld : null;
}

// C ref: botl.c is_ltgt_percentnumber() / has_ltgt_percentnumber().
function is_ltgt_percentnumber(str) {
    let i = 0;
    if (str[i] === '<' || str[i] === '>') i++;
    if (str[i] === '=') i++;
    if (str[i] === '-' || str[i] === '+') i++;
    if (!digit(str[i] || '')) return false;
    while (i < str.length && digit(str[i])) i++;
    if (str[i] === '%') i++;
    return i >= str.length;
}
function has_ltgt_percentnumber(str) {
    for (const c of str) if (!'<>=-+0123456789%'.includes(c)) return false;
    return true;
}

// C ref: botl.c splitsubfields() — '&' or '+' separated, at most 16 pieces.
function splitsubfields(str) {
    if (!str.includes('&') && !str.includes('+')) return [str];
    const out = str.split(/[&+]/);
    if (out.length > 16) return null;
    return out;
}

// C ref: botl.c parse_status_hl1() — the tokenizer: '/' starts a new subfield,
// a space (outside a title) commits the accumulated rule and restarts.
function parse_status_hl1(op, from_configfile, result) {
    const MAX_THRESH = 21;
    let hsbuf = new Array(MAX_THRESH).fill('');
    let fldnum = 0, ccount = 0, badopt = false;
    let i = 0;
    while (i < op.length && fldnum < MAX_THRESH && ccount < 126) {
        const c = lowc(op[i]);
        if (c === ' ') {
            if (fldnum >= 1) {
                if (fldnum === 1 && strcmpi_eq(hsbuf[0], 'title')) {
                    hsbuf[fldnum] += c;
                    ccount++;
                    i++;
                    continue;
                }
                if (!parse_status_hl2(hsbuf, from_configfile, result)) { badopt = true; break; }
            }
            hsbuf = new Array(MAX_THRESH).fill('');
            fldnum = 0;
            ccount = 0;
        } else if (c === '/') {
            fldnum++;
            ccount = 0;
        } else {
            hsbuf[fldnum] += c;
            ccount++;
        }
        i++;
    }
    if (fldnum >= 1 && !badopt)
        if (!parse_status_hl2(hsbuf, from_configfile, result)) badopt = true;
    if (badopt) return false;
    if (!result.iflags.hilite_delta) result.iflags.hilite_delta = 3;
    return true;
}

// C ref: botl.c parse_status_hl2() — validate one "field/behaviour/colour..."
// rule.  Only the accept/reject decision and the error text are modelled; the
// renderer does not colour status fields.
function parse_status_hl2(s, from_configfile, result) {
    let sidx = 0;
    const fld = fldname_to_bl_indx(s[sidx]);

    if (fld === 'characteristics') {
        for (const nm of ['strength', 'dexterity', 'constitution',
                          'intelligence', 'wisdom', 'charisma']) {
            const copy = s.slice();
            copy[0] = nm;
            if (!parse_status_hl2(copy, from_configfile, result)) return false;
        }
        return true;
    }
    if (fld === null) {
        config_error_add(`Unknown status field '${s[sidx]}'`);
        return false;
    }
    const row = INITBLSTATS.find((r) => r[0] === fld);
    if (fld === 'condition') {
        /* C hands this to parse_condition(); a condition name list is a
           different grammar and our renderer has no condition highlights, so
           accept it rather than invent an error C would not print */
        return true;
    }

    let successes = 0;
    sidx++;
    while (s[sidx]) {
        let percent = false, numeric = false, txtval = false;
        let value = 0, rel = 'lt';

        if (!s[sidx + 1] || strcmpi_eq(s[sidx], 'always')) {
            if (!s[sidx + 1]) sidx--;
        } else if (strcmpi_eq(s[sidx], 'up') || strcmpi_eq(s[sidx], 'down')) {
            /* accepted for every field type */
        } else if (fld === 'carrying-capacity'
                   && ENC_STAT.slice(1).some((t) => strcmpi_eq(s[sidx], t))) {
            txtval = true;
        } else if (fld === 'alignment' && ALIGNTXT.some((t) => strcmpi_eq(s[sidx], t))) {
            txtval = true;
        } else if (fld === 'hunger' && HU_TXT.some((t) => t && strcmpi_eq(s[sidx], t))) {
            txtval = true;
        } else if (strcmpi_eq(s[sidx], 'changed')) {
            /* accepted */
        } else if (fld === 'hitpoints' && strcmpi_eq(s[sidx], 'criticalhp')) {
            /* accepted */
        } else if (is_ltgt_percentnumber(s[sidx])) {
            const tmp = s[sidx];
            percent = tmp.includes('%');
            if (tmp[0] === '<') rel = (tmp[1] === '=') ? 'le' : 'lt';
            else if (tmp[0] === '>') rel = (tmp[1] === '=') ? 'ge' : 'gt';
            else rel = 'eq';
            const stripped = tmp.replace(/[%<>=+]/g, '');
            value = parseInt(stripped, 10) || 0;
            numeric = true;
            const dt = percent ? ANY_INT : row[1];
            const opTxt = rel === 'gt' ? '>' : rel === 'ge' ? '>=' :
                          rel === 'lt' ? '<' : rel === 'le' ? '<=' : '=';
            if (dt === ANY_INT
                && (value < ((fld === 'armor-class') ? -128 : rel === 'gt' ? -1 : rel === 'lt' ? 1 : 0)
                    || value > (percent ? (rel === 'lt' ? 101 : 100) : LARGEST_INT))) {
                config_error_add(`Threshold value ${opTxt}${value}${percent ? '%' : ''}`
                                 + ' is out of range');
                return false;
            } else if (dt === ANY_LONG && value < (rel === 'gt' ? -1 : rel === 'lt' ? 1 : 0)) {
                config_error_add(`Threshold value ${opTxt}${value} is out of range`);
                return false;
            }
        } else if (row[1] === ANY_STR) {
            txtval = true;
        } else {
            config_error_add(has_ltgt_percentnumber(s[sidx])
                ? `Wrong format '${s[sidx]}', expected a threshold number or percent`
                : `Unknown behavior '${s[sidx]}'`);
            return false;
        }

        if (row[1] === ANY_STR && (percent || numeric)) {
            config_error_add(`Field '${fld}' does not support numeric values`);
            return false;
        }
        if (percent) {
            if (!row[2]) {
                config_error_add(`Cannot use percent with '${fld}'`);
                return false;
            }
            if (value < -1 || (value === 0 && rel === 'lt')
                || (value === 100 && rel === 'gt') || value > 101) {
                const opTxt = rel === 'lt' ? '<' : rel === 'le' ? '<=' :
                              rel === 'gt' ? '>' : rel === 'ge' ? '>=' : '=';
                config_error_add(`hilite_status: invalid percentage value '${opTxt}${value}%'`);
                return false;
            }
        }

        sidx++;
        const how = s[sidx];
        if (how === undefined && !successes) return false;
        const subfields = splitsubfields(how || '');
        if (!subfields || subfields.length < 1) return false;

        let coloridx = -1;
        for (const sub of subfields) {
            const a = match_str2attr(sub, false);
            if (a !== -1) continue;
            const c = match_str2clr(sub, false);
            if (c >= CLR_MAX || coloridx !== -1) {
                config_error_add(`bad color '${c} ${coloridx}'`);
                return false;
            }
            coloridx = c;
        }
        result.status_hilites.push({ fld, rel, value, percent, txtval,
                                     color: coloridx < 0 ? NO_COLOR_IDX : coloridx });
        successes++;
        sidx++;
    }
    return successes > 0;
}

// ---------------------------------------------------------------------------
// options.c allopt[].optfn — one entry per option, same names as the C
// functions.  Several C functions are one-line forwarders (optfn_font_map() ->
// pfxfn_font(), optfn_catname() -> petname_optfn(), the thirteen menu_*
// accelerators -> shared_menu_optfn()); they are kept as forwarders here so the
// table below reads like allopt[] does.

function optfn_align_message(o, negated, opts, op, result) {
    return optfn_align_misc(o, negated, opts, op, result);
}
function optfn_align_status(o, negated, opts, op, result) {
    return optfn_align_misc(o, negated, opts, op, result);
}
// C ref: optfn_altkeyhandling() — the WIN32CON body is compiled out.
function optfn_altkeyhandling(o, negated, opts, op, result) {
    return optfn_noop(o, negated, opts, op, result);
}
function optfn_alignment(o, negated, opts, op, result) {
    return optfn_roleopt(o, negated, opts, op, result);
}
function optfn_role(o, negated, opts, op, result) {
    return optfn_roleopt(o, negated, opts, op, result);
}
function optfn_race(o, negated, opts, op, result) {
    return optfn_roleopt(o, negated, opts, op, result);
}
function optfn_gender(o, negated, opts, op, result) {
    return optfn_roleopt(o, negated, opts, op, result);
}
function optfn_catname(o, negated, opts, op, result) {
    return petname_optfn(o, negated, opts, op, result);
}
function optfn_dogname(o, negated, opts, op, result) {
    return petname_optfn(o, negated, opts, op, result);
}
function optfn_horsename(o, negated, opts, op, result) {
    return petname_optfn(o, negated, opts, op, result);
}
function optfn_crash_email(o, negated, opts, op, result) {
    return optfn_string_required(o, negated, opts, op, result, false);
}
function optfn_crash_name(o, negated, opts, op, result) {
    return optfn_string_required(o, negated, opts, op, result, false);
}
function optfn_DECgraphics(o, negated, opts, op, result) {
    return optfn_graphics_compat(o, negated, opts, result);
}
function optfn_IBMgraphics(o, negated, opts, op, result) {
    return optfn_graphics_compat(o, negated, opts, result);
}
// The five "list of symbols to use in drawing ..." options: C's do_set arm is
// `return optn_ok` — they must MATCH (so no error) and do nothing.
function optfn_dungeon(o, negated, opts, op, result) {
    return optfn_noop(o, negated, opts, op, result);
}
function optfn_effects(o, negated, opts, op, result) {
    return optfn_noop(o, negated, opts, op, result);
}
function optfn_monsters(o, negated, opts, op, result) {
    return optfn_noop(o, negated, opts, op, result);
}
function optfn_objects(o, negated, opts, op, result) {
    return optfn_noop(o, negated, opts, op, result);
}
function optfn_traps(o, negated, opts, op, result) {
    return optfn_noop(o, negated, opts, op, result);
}
function optfn_font_map(o, negated, opts, op, result) { return pfxfn_font(o, negated, opts, op, result); }
function optfn_font_menu(o, negated, opts, op, result) { return pfxfn_font(o, negated, opts, op, result); }
function optfn_font_message(o, negated, opts, op, result) { return pfxfn_font(o, negated, opts, op, result); }
function optfn_font_status(o, negated, opts, op, result) { return pfxfn_font(o, negated, opts, op, result); }
function optfn_font_text(o, negated, opts, op, result) { return pfxfn_font(o, negated, opts, op, result); }
function optfn_font_size_map(o, negated, opts, op, result) { return pfxfn_font(o, negated, opts, op, result); }
function optfn_font_size_menu(o, negated, opts, op, result) { return pfxfn_font(o, negated, opts, op, result); }
function optfn_font_size_message(o, negated, opts, op, result) { return pfxfn_font(o, negated, opts, op, result); }
function optfn_font_size_status(o, negated, opts, op, result) { return pfxfn_font(o, negated, opts, op, result); }
function optfn_font_size_text(o, negated, opts, op, result) { return pfxfn_font(o, negated, opts, op, result); }
function optfn_name(o, negated, opts, op, result) {
    return optfn_string_required(o, negated, opts, op, result, true);
}
function optfn_soundlib(o, negated, opts, op, result) {
    return optfn_string_required(o, negated, opts, op, result, true);
}
function optfn_windowtype(o, negated, opts, op, result) {
    return optfn_string_required(o, negated, opts, op, result, true);
}
function optfn_tile_file(o, negated, opts, op, result) {
    return optfn_string_required(o, negated, opts, op, result, false);
}
function optfn_roguesymset(o, negated, opts, op, result) {
    return optfn_symset(o, negated, opts, op, result);
}
function optfn_scroll_amount(o, negated, opts, op, result) {
    return optfn_numeric_wc(o, negated, opts, op, result, 1, 'wc_scroll_amount');
}
function optfn_scroll_margin(o, negated, opts, op, result) {
    return optfn_numeric_wc(o, negated, opts, op, result, 5, 'wc_scroll_margin');
}
function optfn_tile_height(o, negated, opts, op, result) {
    return optfn_numeric_wc(o, negated, opts, op, result, 0, 'wc_tile_height');
}
function optfn_tile_width(o, negated, opts, op, result) {
    return optfn_numeric_wc(o, negated, opts, op, result, 0, 'wc_tile_width');
}
function optfn_vary_msgcount(o, negated, opts, op, result) {
    return optfn_numeric_wc(o, negated, opts, op, result, 0, 'wc_vary_msgcount');
}
function optfn_term_cols(o, negated, opts, op, result) {
    return optfn_term_dim(o, negated, opts, op, result, 'wc2_term_cols');
}
function optfn_term_rows(o, negated, opts, op, result) {
    return optfn_term_dim(o, negated, opts, op, result, 'wc2_term_rows');
}
function optfn_warnings(o, negated, opts, op, result) {
    return warning_opts(opts, o.name, result) ? OPTN_OK : OPTN_ERR;
}

// C ref: options.c shared_menu_optfn() — the thirteen menu_<command> options
// all resolve to check_misc_menu_command() + spcfn_misc_menu_cmd().
function shared_menu_optfn(o, negated, opts, op, result) {
    const res = check_misc_menu_command(opts);
    if (res < 0) return OPTN_ERR;
    return spcfn_misc_menu_cmd(res, negated, opts, result);
}
function optfn_menu_deselect_all(o, n, s, p, r) { return shared_menu_optfn(o, n, s, p, r); }
function optfn_menu_deselect_page(o, n, s, p, r) { return shared_menu_optfn(o, n, s, p, r); }
function optfn_menu_first_page(o, n, s, p, r) { return shared_menu_optfn(o, n, s, p, r); }
function optfn_menu_invert_all(o, n, s, p, r) { return shared_menu_optfn(o, n, s, p, r); }
function optfn_menu_invert_page(o, n, s, p, r) { return shared_menu_optfn(o, n, s, p, r); }
function optfn_menu_last_page(o, n, s, p, r) { return shared_menu_optfn(o, n, s, p, r); }
function optfn_menu_next_page(o, n, s, p, r) { return shared_menu_optfn(o, n, s, p, r); }
function optfn_menu_previous_page(o, n, s, p, r) { return shared_menu_optfn(o, n, s, p, r); }
function optfn_menu_search(o, n, s, p, r) { return shared_menu_optfn(o, n, s, p, r); }
function optfn_menu_select_all(o, n, s, p, r) { return shared_menu_optfn(o, n, s, p, r); }
function optfn_menu_select_page(o, n, s, p, r) { return shared_menu_optfn(o, n, s, p, r); }
function optfn_menu_shift_left(o, n, s, p, r) { return shared_menu_optfn(o, n, s, p, r); }
function optfn_menu_shift_right(o, n, s, p, r) { return shared_menu_optfn(o, n, s, p, r); }

// The OthrOpt entries: C's do_set arm is empty (their values come from their own
// config STATEMENTS, not from OPTIONS=), so naming one in OPTIONS= is accepted
// and does nothing.
function optfn_o_autopickup_exceptions() { return OPTN_OK; }
function optfn_o_bind_keys() { return OPTN_OK; }
function optfn_o_autocomplete() { return OPTN_OK; }
function optfn_o_menu_colors() { return OPTN_OK; }
function optfn_o_message_types() { return OPTN_OK; }
function optfn_o_status_cond() { return OPTN_OK; }
function optfn_o_status_hilites() { return OPTN_OK; }

// C ref: include/optlist.h allopt[].optfn, resolved for this build.  Table
// ORDER is already fixed by ALLOPT_DATA; this is the function column.
const OPTFN = {
    align_message: optfn_align_message, align_status: optfn_align_status,
    alignment: optfn_alignment, altkeyhandling: optfn_altkeyhandling,
    autounlock: optfn_autounlock, boulder: optfn_boulder,
    catname: optfn_catname, crash_email: optfn_crash_email,
    crash_name: optfn_crash_name, crash_urlmax: optfn_crash_urlmax,
    DECgraphics: optfn_DECgraphics, disclose: optfn_disclose,
    dogname: optfn_dogname, dungeon: optfn_dungeon, effects: optfn_effects,
    font_map: optfn_font_map, font_menu: optfn_font_menu,
    font_message: optfn_font_message, font_size_map: optfn_font_size_map,
    font_size_menu: optfn_font_size_menu,
    font_size_message: optfn_font_size_message,
    font_size_status: optfn_font_size_status,
    font_size_text: optfn_font_size_text, font_status: optfn_font_status,
    font_text: optfn_font_text, fruit: optfn_fruit, gender: optfn_gender,
    glyph: optfn_glyph, hilite_status: optfn_hilite_status,
    horsename: optfn_horsename, IBMgraphics: optfn_IBMgraphics,
    map_mode: optfn_map_mode,
    menu_deselect_all: optfn_menu_deselect_all,
    menu_deselect_page: optfn_menu_deselect_page,
    menu_first_page: optfn_menu_first_page,
    menu_invert_all: optfn_menu_invert_all,
    menu_invert_page: optfn_menu_invert_page,
    menu_last_page: optfn_menu_last_page,
    menu_next_page: optfn_menu_next_page,
    menu_previous_page: optfn_menu_previous_page,
    menu_search: optfn_menu_search,
    menu_select_all: optfn_menu_select_all,
    menu_select_page: optfn_menu_select_page,
    menu_shift_left: optfn_menu_shift_left,
    menu_shift_right: optfn_menu_shift_right,
    menu_headings: optfn_menu_headings, menu_objsyms: optfn_menu_objsyms,
    menuinvertmode: optfn_menuinvertmode, menustyle: optfn_menustyle,
    monsters: optfn_monsters, mouse_support: optfn_mouse_support,
    msg_window: optfn_msg_window, msghistory: optfn_msghistory,
    name: optfn_name, number_pad: optfn_number_pad, objects: optfn_objects,
    packorder: optfn_packorder,
    paranoid_confirmation: optfn_paranoid_confirmation,
    perminv_mode: optfn_perminv_mode, petattr: optfn_petattr,
    pettype: optfn_pettype, pickup_burden: optfn_pickup_burden,
    pickup_types: optfn_pickup_types, pile_limit: optfn_pile_limit,
    player_selection: optfn_player_selection, playmode: optfn_playmode,
    race: optfn_race, roguesymset: optfn_roguesymset, role: optfn_role,
    runmode: optfn_runmode, scores: optfn_scores,
    scroll_amount: optfn_scroll_amount, scroll_margin: optfn_scroll_margin,
    soundlib: optfn_soundlib, sortdiscoveries: optfn_sortdiscoveries,
    sortloot: optfn_sortloot, sortvanquished: optfn_sortvanquished,
    statushilites: optfn_statushilites, statuslines: optfn_statuslines,
    suppress_alert: optfn_suppress_alert, symset: optfn_symset,
    term_cols: optfn_term_cols, term_rows: optfn_term_rows,
    tile_file: optfn_tile_file, tile_height: optfn_tile_height,
    tile_width: optfn_tile_width, traps: optfn_traps,
    vary_msgcount: optfn_vary_msgcount, versinfo: optfn_versinfo,
    warnings: optfn_warnings, whatis_coord: optfn_whatis_coord,
    whatis_filter: optfn_whatis_filter, windowborders: optfn_windowborders,
    windowcolors: optfn_windowcolors, windowtype: optfn_windowtype,
    cond_: pfxfn_cond_, font: pfxfn_font,
    autocompletions: optfn_o_autocomplete,
    'autopickup exceptions': optfn_o_autopickup_exceptions,
    'bind keys': optfn_o_bind_keys,
    'menu colors': optfn_o_menu_colors,
    'message types': optfn_o_message_types,
    'status condition fields': optfn_o_status_cond,
    'status highlight rules': optfn_o_status_hilites,
};

// The `pfx` and OthrOpt entries take (o, negated, opts, result); the rest of
// the forwarders above take C's (optidx, req, negated, opts, op) shape reduced
// to what a config-file do_set needs.
function optfn_compound(o, negated, opts, op, result, duplicate) {
    const fn = OPTFN[o.name];
    if (!fn) return optfn_noop(o, negated, opts, op, result);
    if (o.name === 'playmode')
        return optfn_playmode(o, negated, opts, op, result, duplicate);
    return fn(o, negated, opts, op, result);
}

// C ref: options.c set_playmode() — wizard/discover, and authorize_wizard_mode()
// always succeeds because the recorder's sysconf carries WIZARDS=*.
function set_playmode(mode, result) {
    result.flags.playmode = mode;
    if (mode === 'debug') result.flags.debug = true;
}

// C ref: options.c set_menuobjsyms_flags().
function set_menuobjsyms_flags(osyms, result) {
    result.iflags.menuobjsyms = osyms;
    result.iflags.menu_head_objsym = (osyms === 1 || osyms === 3 || osyms === 5);
    result.iflags.use_menu_glyphs = (osyms === 2 || osyms === 3 || osyms === 4
                                     || osyms === 5);
}

// C ref: options.c duplicate_opt_detection()/reset_duplicate_opt_detection().
function duplicate_opt_detection(optidx) {
    return dupdetected[optidx]++ > 0;
}
function reset_duplicate_opt_detection() {
    dupdetected = new Array(ALLOPT.length).fill(0);
}

// C ref: options.c msgtype2name().
function msgtype2name(typ) {
    for (const [name, t] of MSGTYPE_NAMES) if (t === typ) return name;
    return null;
}

// C ref: options.c msgtype_free() / free_one_msgtype().
function msgtype_free(result) { result.msgtypes.length = 0; }
function free_one_msgtype(idx, result) { result.msgtypes.splice(idx, 1); }

// C ref: options.c hide_unhide_msgtypes() — a NEGATIVE msgtype is not
// recognised by pline(), which is how "hide these types for now" works.
function hide_unhide_msgtypes(hide, hide_mask, list) {
    for (const t of list) {
        let mt = t.msgtype;
        if (!hide) mt = -mt;
        if (mt > 0 && ((1 << mt) & hide_mask)) t.msgtype = -t.msgtype;
    }
}

// C ref: options.c test_regex_pattern() — compile a pattern only to find out
// whether it is valid; the caller re-parses it after validating the rest.
function test_regex_pattern(str, errmsg) {
    if (!str) return false;
    const ere = ere_compile(str);
    if (ere.error) {
        config_error_add(`${errmsg || 'NHregex error'}: ${ere.error}`);
        return false;
    }
    try { new RegExp(ere.jsSource); } catch (e) {
        config_error_add(`${errmsg || 'NHregex error'}: ${e.message}`);
        return false;
    }
    return true;
}

// C ref: options.c oc_to_str() — object CLASS numbers back to their symbols.
function oc_to_str(src) {
    let out = '';
    for (const oc of src || []) out += DEF_OC_SYMS[oc] || '';
    return out;
}

// C ref: options.c free_autopickup_exceptions()/remove_autopickup_exception().
function free_autopickup_exceptions(result) { result.apelist.length = 0; }
function remove_autopickup_exception(ape, result) {
    const i = result.apelist.indexOf(ape);
    if (i >= 0) result.apelist.splice(i, 1);
}

// C ref: cmd.c count_autocompletions() / options.c count_bind_keys().
export function count_autocompletions() {
    const a = game.autocomplete;
    return a ? Object.keys(a).length : 0;
}
export function count_bind_keys() {
    return game.keybind ? Object.keys(game.keybind).length : 0;
}

// C ref: options.c allopt[].dupdetected, reset per config FILE by
// reset_duplicate_opt_detection(), and go.using_alias.
let dupdetected = [];
let using_alias = false;

// C ref: options.c parseoptions() — one element of a comma-separated OPTIONS
// list, or the whole list (it splits and recurses itself).
function parseoptions(optstr, tinitial, result) {
    let opts = optstr;

    using_alias = false;

    // Elements are processed RIGHT TO LEFT: split at the first comma and
    // recurse on the rest before handling the current element.  So with a
    // duplicated option the LEFTMOST occurrence is applied last and wins.
    if (tinitial) {
        const comma = opts.indexOf(',');
        if (comma >= 0) {
            parseoptions(opts.slice(comma + 1), tinitial, result);
            opts = opts.slice(0, comma);
        }
    }
    if (opts.length > BUFSZ / 2) {
        config_error_add(`Option too long, max length is ${BUFSZ / 2} characters`);
        return;
    }

    while (opts.length && isspace(opts[0])) opts = opts.slice(1);
    while (opts.length && isspace(opts[opts.length - 1])) opts = opts.slice(0, -1);
    if (!opts) {
        config_error_add('Empty statement');
        return;
    }

    // options.c:540 — a LOOP, so "!no", "nono" and the "no-" spelling all work.
    // Note there is no re-trim afterwards, so "no legacy" does NOT parse.
    let negated = false;
    while (opts[0] === '!' || strncmpi_eq(opts, 'no', 2)) {
        opts = opts.slice(opts[0] === '!' ? 1 : (opts[2] !== '-') ? 2 : 3);
        negated = !negated;
    }

    let optlen = opts.length;
    const optlen_wo_val = length_without_val(opts, optlen);
    if (optlen_wo_val < optlen) optlen = optlen_wo_val;

    let matchidx = -1, got_match = false, pfx_match = false;
    for (let i = 0; i < ALLOPT.length; i++) {
        const o = ALLOPT[i];
        got_match = false;
        if (o.pfx && str_start_is(opts, o.name, true)) {
            matchidx = i;
            got_match = pfx_match = true;
        }
        if (!got_match) got_match = match_optname(opts, o.name, o.minmatch, true);
        if (got_match) {
            if (!o.pfx && optlen < o.minmatch) {
                /* matchidx deliberately left alone, as C leaves it: an
                   ambiguous option reports once and sets nothing. */
                config_error_add(`Ambiguous option ${opts}, ${o.minmatch}`
                                 + ' characters are needed to differentiate');
                break;
            }
            matchidx = i;
            break;
        }
    }

    // Second pass over the aliases, which must match at their full length.
    if (!got_match) {
        for (let i = 0; i < ALLOPT.length; i++) {
            const o = ALLOPT[i];
            if (!o.alias) continue;
            if (match_optname(opts, o.alias, o.alias.length, true)) {
                matchidx = i;
                got_match = true;
                using_alias = true;
                break;
            }
        }
    }

    let optresult = OPTN_ERR;
    if (got_match && matchidx >= 0) {
        const o = ALLOPT[matchidx];
        // C ref: options.c duplicate_opt_detection()/complain_about_duplicate()
        // — the counter is per allopt[] entry and is reset per config FILE, so
        // the same option on two different lines complains too.  OthrOpt
        // entries print "boolean" along with the Boolean ones.
        const duplicate = duplicate_opt_detection(matchidx);
        if (duplicate && !o.dupeok) complain_about_duplicate(o);
        if (negated && !o.negateok) {
            bad_negation(o.name, true);
            return;
        }
        const op = string_for_opt(opts, true);
        if (o.typ === 'B') optresult = optfn_boolean(o, negated, opts, op, result);
        else if (o.typ === 'C')
            optresult = optfn_compound(o, negated, opts, op, result, duplicate);
        else optresult = OPTN_OK; /* OthrOpt: do_set does nothing */
    }

    if (!got_match) {
        // Is it a symbol?  C requires BOTH the "S_" prefix and a successful
        // parsesymbols(); a name loadsyms[] does not carry falls through to
        // "Unknown option", which is a screen.
        if (opts.startsWith('S_') && parsesymbols(opts, PRIMARYSET, result))
            optresult = OPTN_OK;
    }

    if (optresult === OPTN_SILENTERR
        || (got_match && ALLOPT[matchidx].disregarded)) return;
    // C ref: options.c parseoptions() — a PREFIX option whose suffix its
    // pfxfn() rejected names the suffix rather than reporting nothing.
    if (pfx_match && optresult === OPTN_ERR) {
        let pfxbuf = opts;
        const colon = pfxbuf.indexOf(':');
        if (colon >= 0) pfxbuf = pfxbuf.slice(0, colon);
        config_error_add(`bad option suffix variation '${pfxbuf}'`);
        return;
    }
    if (got_match && optresult === OPTN_ERR) return;
    if (optresult === OPTN_OK) return;

    // C ref: options.c parseoptions() falling off the end.  Only an option
    // name that matched NOTHING lands here: a matched option with a bad value
    // reports its own complaint from inside its optfn and returns first.
    config_error_add(`Unknown option '${opts}'`);
}

// C ref: options.c complain_about_duplicate().
function complain_about_duplicate(o) {
    const via = using_alias ? ` (via alias: ${o.alias})` : '';
    config_error_add(`${o.typ === 'C' ? 'compound' : 'boolean'}`
                     + ` option specified multiple times: ${o.name}${via}`);
}

// C ref: cfgfiles.c config_line_stmt[] — [directive name, minimum number of
// characters that must match].  Matched with match_varname(), which is just
// match_optname(..., val_allowed=TRUE): the text before the '=' or ':' must be
// a case-insensitive leading substring of the name and at least that long, so
// "BIND=" reaches BINDINGS and "SYMB=" reaches SYMBOLS.  Table order breaks ties
// (ROGUESYMBOLS is listed ahead of SYMBOLS).  The syscnf_only entries are left
// out because parse_config_line() skips them unless it is reading sysconf, and
// the USER_SOUNDS pair is absent from this build.
// ---------------------------------------------------------------------------
// cfgfiles.c — one cnf_line_<STATEMENT>() per config statement.

// C ref: hacklib.c mungspaces() — tab to space, runs of spaces to one,
// leading/trailing space dropped; a newline ends the string.
function mungspaces(bp) {
    let out = '', was_space = true;
    for (let i = 0; i < bp.length; i++) {
        let c = bp[i];
        if (c === '\n') break;
        if (c === '\t') c = ' ';
        if (c !== ' ' || !was_space) out += c;
        was_space = (c === ' ');
    }
    if (was_space && out.length) out = out.slice(0, -1);
    return out;
}

// C ref: cfgfiles.c find_optparam() — index of the first '=' or ':'.
function find_optparam(buf) {
    let bufp = buf.indexOf('=');
    const altp = buf.indexOf(':');
    if (bufp < 0 || (altp >= 0 && altp < bufp)) bufp = altp;
    return bufp;
}

// C ref: cfgfiles.c cnf_line_OPTIONS().  config_line_stmt[].origbuf is TRUE
// only for OPTIONS, so the separator is re-found in the UNMUNGED line and the
// rest is handed to parseoptions() (which does its own space handling).
function cnf_line_OPTIONS(origbuf, result) {
    parseoptions(origbuf.slice(find_optparam(origbuf) + 1), true, result);
    return true;
}
function cnf_line_AUTOPICKUP_EXCEPTION(bufp, result) {
    add_autopickup_exception(bufp, result);
    return true;
}
function cnf_line_BINDINGS(bufp, result) { return parsebindings(bufp, result); }
function cnf_line_AUTOCOMPLETE(bufp, result) {
    parseautocomplete(bufp, true, result);
    return true;
}
function cnf_line_MSGTYPE(bufp, result) { return msgtype_parse_add(bufp, result); }
// The directory statements are all `nhUse(bufp)` without NOCWD_ASSUMPTIONS,
// but they must MATCH so that no "Unknown config statement" is reported.
function cnf_line_HACKDIR() { return true; }
function cnf_line_LEVELDIR() { return true; }
function cnf_line_SAVEDIR() { return true; }
function cnf_line_BONESDIR() { return true; }
function cnf_line_DATADIR() { return true; }
function cnf_line_SCOREDIR() { return true; }
function cnf_line_LOCKDIR() { return true; }
function cnf_line_CONFIGDIR() { return true; }
function cnf_line_TROUBLEDIR() { return true; }
// C ref: cnf_line_NAME() — strncpy(svp.plname, ...).  The recorded games never
// show it: process_options() runs AFTER initoptions(), and the recording
// harness always passes '-u <name>', so unixmain.c's case 'u' overwrites plname
// with the command-line value (empty when the rc has no OPTIONS=name:).  See
// the override in parseNethackrc().
function cnf_line_NAME(bufp, result) {
    result.plname = bufp.slice(0, PL_NSIZ - 1);
    return true;
}
// C ref: cnf_line_ROLE() — `if ((len = str2role(bufp)) >= 0) initrole = len`,
// so an unrecognised role is silently ignored rather than reported.
function cnf_line_ROLE(bufp, result) {
    if (str2role(bufp) >= 0) result.role = bufp;
    return true;
}
function cnf_line_dogname(bufp, result) {
    result.flags.dogname = bufp.slice(0, PL_PSIZ - 1);
    return true;
}
function cnf_line_catname(bufp, result) {
    result.flags.catname = bufp.slice(0, PL_PSIZ - 1);
    return true;
}
// C ref: cnf_line_BOULDER() — get_uchars() into ov_primary_syms[], one entry,
// in place: a 0 (or a syntax error) leaves the default symbol.
function cnf_line_BOULDER(bufp, result) {
    const list = [];
    get_uchars(bufp, list, true, 1, 'BOULDER');
    if (list[0]) result.symoverride.S_boulder = String.fromCharCode(list[0]);
    return true;
}
function cnf_line_MENUCOLOR(bufp, result) { return add_menu_coloring(bufp, result); }
function cnf_line_HILITE_STATUS(bufp, result) {
    return parse_status_hl1(bufp, true, result);
}
function cnf_line_WARNINGS(bufp, result) {
    const translate = new Array(WARNCOUNT).fill(0);
    get_uchars(bufp, translate, false, WARNCOUNT, 'WARNINGS');
    assign_warnings(translate, result);
    return true;
}
function cnf_line_ROGUESYMBOLS(bufp, result) {
    const ref = { buf: bufp };
    if (parsesymbols(bufp, ROGUESET, result, ref)) return true;
    config_error_add(`Error in ROGUESYMBOLS definition '${ref.buf}'`);
    return false;
}
function cnf_line_SYMBOLS(bufp, result) {
    const ref = { buf: bufp };
    if (parsesymbols(bufp, PRIMARYSET, result, ref)) return true;
    config_error_add(`Error in SYMBOLS definition '${ref.buf}'`);
    return false;
}
function cnf_line_WIZKIT(bufp, result) {
    result.wizkit = bufp.slice(0, 79 /* WIZKIT_MAX - 1 */);
    return true;
}
// QT_* are `nhUse(bufp)` without QT_GRAPHICS.
function cnf_line_QT_TILEWIDTH() { return true; }
function cnf_line_QT_TILEHEIGHT() { return true; }
function cnf_line_QT_FONTSIZE() { return true; }
function cnf_line_QT_COMPACT() { return true; }

// C ref: cfgfiles.c config_line_stmt[] — [name, minimum matching length,
// origbuf, handler].  Matched with match_varname(), which is just
// match_optname(..., val_allowed=TRUE): the text before the '=' or ':' must be
// a case-insensitive leading substring of the name and at least that long, so
// "BIND=" reaches BINDINGS and "SYMB=" reaches SYMBOLS.  Table order breaks ties
// (ROGUESYMBOLS is listed ahead of SYMBOLS).  The syscnf_only entries are left
// out because parse_config_line() skips them unless it is reading sysconf, and
// the USER_SOUNDS pair is absent from this build.
const CONFIG_LINE_STMT = [
    ['OPTIONS', 4, true, cnf_line_OPTIONS],
    ['AUTOPICKUP_EXCEPTION', 5, false, cnf_line_AUTOPICKUP_EXCEPTION],
    ['BINDINGS', 4, false, cnf_line_BINDINGS],
    ['AUTOCOMPLETE', 5, false, cnf_line_AUTOCOMPLETE],
    ['MSGTYPE', 7, false, cnf_line_MSGTYPE],
    ['HACKDIR', 4, false, cnf_line_HACKDIR],
    ['LEVELDIR', 4, false, cnf_line_LEVELDIR],
    ['LEVELS', 4, false, cnf_line_LEVELDIR],
    ['SAVEDIR', 4, false, cnf_line_SAVEDIR],
    ['BONESDIR', 5, false, cnf_line_BONESDIR],
    ['DATADIR', 4, false, cnf_line_DATADIR],
    ['SCOREDIR', 4, false, cnf_line_SCOREDIR],
    ['LOCKDIR', 4, false, cnf_line_LOCKDIR],
    ['CONFIGDIR', 4, false, cnf_line_CONFIGDIR],
    ['TROUBLEDIR', 4, false, cnf_line_TROUBLEDIR],
    ['NAME', 4, false, cnf_line_NAME],
    ['ROLE', 4, false, cnf_line_ROLE],
    ['CHARACTER', 4, false, cnf_line_ROLE],
    ['dogname', 3, false, cnf_line_dogname],
    ['catname', 3, false, cnf_line_catname],
    ['BOULDER', 3, false, cnf_line_BOULDER],
    ['MENUCOLOR', 9, false, cnf_line_MENUCOLOR],
    ['HILITE_STATUS', 6, false, cnf_line_HILITE_STATUS],
    ['WARNINGS', 5, false, cnf_line_WARNINGS],
    ['ROGUESYMBOLS', 4, false, cnf_line_ROGUESYMBOLS],
    ['SYMBOLS', 4, false, cnf_line_SYMBOLS],
    ['WIZKIT', 6, false, cnf_line_WIZKIT],
    ['QT_TILEWIDTH', 12, false, cnf_line_QT_TILEWIDTH],
    ['QT_TILEHEIGHT', 13, false, cnf_line_QT_TILEHEIGHT],
    ['QT_FONTSIZE', 11, false, cnf_line_QT_FONTSIZE],
    ['QT_COMPACT', 10, false, cnf_line_QT_COMPACT],
];

// C ref: cfgfiles.c parse_config_line().  A line that names no statement in
// the table is an ERROR, not a silent skip: config_error_add() puts it on the
// screen and config_error_done() then blocks for a Return, so one unsupported
// rc line costs a whole session's worth of boundaries if it is not modelled.
function parse_config_line(origbuf, result) {
    while (origbuf[0] === ' ' || origbuf[0] === '\t') origbuf = origbuf.slice(1);
    const buf = mungspaces(origbuf);
    const sep = find_optparam(buf);
    if (sep < 0) {
        config_error_add("Not a config statement, missing '='");
        return;
    }
    let bufp = buf.slice(sep + 1);
    if (bufp[0] === ' ') bufp = bufp.slice(1);

    for (const [nm, len, useOrigbuf, fn] of CONFIG_LINE_STMT) {
        if (!match_optname(buf, nm, len, true)) continue;
        fn(useOrigbuf ? origbuf : bufp, result);
        return;
    }

    config_error_add('Unknown config statement');
}

// C ref: cfgfiles.c is_config_section() — " [ section ] # comment", spaces
// optional; returns the section name, or null when the line is not one.
function is_config_section(str) {
    const a = str.trim();
    if (a[0] !== '[') return null;
    const z = a.indexOf(']', 1);
    if (z < 0) return null;
    let c = z + 1;
    while (a[c] === ' ') c++;
    if (c < a.length && a[c] !== '#') return null;
    return a.slice(1, z).trim();
}

// C ref: cfgfiles.c handle_config_section() — returns true when the caller
// should skip the line, either because it IS a section header or because it
// falls inside a section that CHOOSE did not pick.
//
// CHOOSE picks its section with rn2() (choose_random_part()), the first draw of
// the game; jsmain.js seeds the PRNG only after the rc has been read, so the
// pick is left unresolved and section_chosen holds a sentinel that matches no
// header.  That keeps a CHOOSE file off the "without CHOOSE" error path — the
// only part of it that would otherwise cost screens the file has not lost
// already to the missing draw.
const SECTION_UNRESOLVED = '\0unresolved';

function handle_config_section(buf, st) {
    const sect = is_config_section(buf);
    if (sect !== null) {
        st.section_current = null;
        if (!st.section_chosen) {
            config_error_add(`Section "[${sect}]" without CHOOSE`);
            return true;
        }
        if (sect) st.section_current = sect;
        else st.section_chosen = null; /* free_config_sections() */
        return true;
    }
    if (st.section_current) {
        if (!st.section_chosen) return true;
        return st.section_chosen !== st.section_current;
    }
    return false;
}

export function parseNethackrc(rc) {
    const result = {
        name: '', role: -1, race: -1, gender: -1, align: -1,
        flags: {}, iflags: {}, keybind: {}, symoverride: {}, apelist: [],
        warnsyms: [],
        // C globals the config statements below fill in: gm.mapped_menu_cmds /
        // gm.mapped_menu_op, gc.Cmd.spkeys, gc.Cmd.mousebtn, extcmdlist[].flags
        // AUTOCOMPLETE bit, gp.plinemsg_types, gm.menu_colorings, the
        // 'thresholds' lists and condtests[].enabled.
        menu_cmd_alias: [], keybind_param: {}, keyunbind: [], spkeys: {},
        mousebtn: {}, autocomplete: {}, msgtypes: [], menucolors: [],
        status_hilites: [], conds: {},
    };
    if (!rc) return result;

    raw_stream = [];
    reset_duplicate_opt_detection();
    config_error_init('');
    // C ref: cfgfiles.c parse_conf_buf() — trailing spaces/CR are stripped, a
    // trailing '\\' continues onto the next physical line (merged with one
    // space between), and blank / '#' comment lines never reach
    // parse_config_line().  But config_error_nextline() runs for EVERY
    // physical line, so the line number an error reports counts them too.
    const st = { section_current: null, section_chosen: null };
    let pending = null;
    for (const rawLine of rc.split('\n')) {
        let line = rawLine.replace(/[\r]+$/, '');
        const morelines = line.endsWith('\\');
        if (morelines) line = line.slice(0, -1);
        line = line.replace(/[ \t\r]+$/, '');
        config_error_nextline(line);
        const ep = line.replace(/^[ \t]+/, '');
        const ignoreline = !ep || ep[0] === '#';
        const oldline = pending !== null;
        if (!ignoreline) pending = (pending !== null) ? pending + ' ' + ep : ep;
        if (morelines || (ignoreline && !oldline)) continue;
        const buf = pending;
        pending = null;
        if (handle_config_section(buf, st)) continue;
        // C ref: cfgfiles.c parse_conf_buf() CHOOSE branch.
        if (match_optname(buf, 'CHOOSE', 6, true)) {
            if (find_optparam(buf) < 0)
                config_error_add('Format is CHOOSE=section1,section2,...');
            else
                st.section_chosen = SECTION_UNRESOLVED;
            continue;
        }
        parse_config_line(buf, result);
    }
    config_error_done();
    // C ref: sys/unix/unixmain.c process_options() case 'u', which runs after
    // initoptions(): the command line overrides whatever the rc set.  The
    // recording harness derives it from the rc's OPTIONS=name: value and
    // passes an empty string when there is none, so plname ends up being
    // exactly that value and a NAME= statement never reaches the game.
    result.name = result.optname || '';
    if (raw_stream.length) result.config_error_raw = raw_stream;
    raw_stream = null;
    // C ref: options.c gp.plinemsg_types / gm.menu_colorings / gr.rfilter are
    // GLOBALS that parseoptions() fills in as the file is read, and the topline
    // writer, the menu renderer and js/role.js read them from there rather than
    // from a return value.  Publish them the same way.
    if (result.msgtypes.length) {
        game.msgtypes = result.msgtypes;
        game.msgtype_type = msgtype_type;
    }
    if (result.menucolors.length) game.menucolors = result.menucolors;
    if (result.status_hilites.length) game.status_hilites = result.status_hilites;
    if (Object.keys(result.conds).length) game.conds = result.conds;
    if (result.rfilter) game.rfilter = result.rfilter;
    return result;
}

// ---------------------------------------------------------------------------
// Re-exports for js/cfgfiles.js, which continues this file's port of
// cfgfiles.c (the syscnf-only statements, the C-shaped parser, rcfile()).
// Declaration-only: adding names to a module's export list has no effect on
// anything already running here.
export {
    raw_print, wait_synch,
    config_error_init, config_error_add, config_error_done,
    config_error_nextline,
    find_optparam, match_optname, handle_config_section, parse_config_line,
    parseoptions, reset_duplicate_opt_detection,
    CONFIG_LINE_STMT,
    // The coloratt.c helpers that landed here first, for js/coloratt.js (which
    // continues that file's port and must not grow a second copy).
    match_str2clr, match_str2attr, add_menu_coloring_parsed,
};
