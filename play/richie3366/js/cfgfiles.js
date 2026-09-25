// cfgfiles.js — config file handling (cfgfiles.c).
//
// C locus: nethack-c/upstream/src/cfgfiles.c do_write_config_file `:169–210`
// [campaign 7/7] — #saveoptions: serialize the changed options via
// all_options_strbuf and write them into the config file. Final activation
// of the saveoptions family: every callee below went live in [1/7]–[6/7].

import { game } from './gstate.js';
import {
    BUFSZ, ECMD_OK, PL_NSIZ, PL_PSIZ, WIZKIT_MAX,
    PRIMARYSET, ROGUESET,
} from './const.js';
import { pline, tty_wait_synch, raw_printf } from './display.js';
import { trimspaces } from './hacklib.js';
import { config_error_add, parse_status_hl1 } from './botl.js';
import { mungspaces, paranoid_query } from './getline.js';
import { rn2 } from './rng.js';
import { str2role } from './roles.js';
import {
    get_configfile,
    set_configfile_name,
    strbuf_init,
    all_options_strbuf,
    strbuf_empty,
    parseoptions,
    match_optname,
    reset_duplicate_opt_detection,
    config_unmatched_ignored,
    add_menu_coloring,
    msgtype_parse_add,
    parsesymbols,
    allopt_idx,
    allopt_array_init,
    disregard_all_options,
    disregard_this_option,
    heed_all_options,
    heed_this_option,
    ENVIRON_OPT,
    RC_FILE_OPT,
    set_ignore_errors_on_unmatched,
    clear_ignore_errors_on_unmatched,
} from './options.js';
import { vfsReadFile, vfsWriteFile } from './storage.js';

/** C ref: hack.h `:1504–1506` FEATURE_NOTICE_VER(3, 7, 0). */
const FEATURE_NOTICE_VER_3_7_0 = (3 << 24) | (7 << 16);

/**
 * C ref: cfgfiles.c do_write_config_file `:169–210` in C order.
 * Sole C caller: cmd.c extcmdlist "saveoptions" `:1843–1845`
 * (IFBURIED | GENERALCMD | NOFUZZERCMD; wired via EXT_CMDS in getline.js).
 * @returns {Promise<number>} ECMD_OK, like C on every path.
 */
export async function do_write_config_file() {
    // C `:174`: !configfile[0] — the file-static lives in js/options.js.
    const configfile = get_configfile() || '';
    if (!configfile) {
        await pline('Strange, could not figure out config file name.'); // C `:175`
        return ECMD_OK; // C `:176`
    }
    // C `:178`: flags.suppress_alert is zero-initialized and no JS path
    // sets it, so ?? 0 is exactly the C default; the comparisons below
    // are the common first-run arm.
    if ((game.flags?.suppress_alert ?? 0) < FEATURE_NOTICE_VER_3_7_0) {
        await pline('Warning: saveoptions is highly experimental!'); // C `:179`
        await tty_wait_synch(); // C `:180` wait_synch (game build: wintty.c tty_wait_synch)
        await pline('Some settings are not saved!'); // C `:181`
        await tty_wait_synch(); // C `:182`
        await pline( // C `:183–184` (one literal across two source lines)
            'All manual customization and comments are removed from the file!'
        );
        await tty_wait_synch(); // C `:185`
    }
    // C `:187–190`: Sprintf(tmp, "Overwrite config file %.*s?", N,
    // configfile) with N = BUFSZ - sizeof(prompt) - 2 — %.*s truncates.
    const overwritePrompt = 'Overwrite config file %.*s?';
    const tmp =
        'Overwrite config file ' +
        configfile.slice(0, BUFSZ - (overwritePrompt.length + 1) - 2) +
        '?';
    if (!(await paranoid_query(true, tmp))) return ECMD_OK; // C `:191–192`
    // C `:194–209`: fopen(configfile, "w") + fwrite + fclose. Contest
    // Rule #2: no fopen — persist via storage.js VFS. The VFS boolean
    // stands in for fp (false = fopen failed → silent ECMD_OK like C,
    // which has no message on that path). VFS writes are atomic, so
    // wrote == len always and the `:205–208` partial-write pline has no
    // representable trigger (map-named).
    const sbuf = {};
    strbuf_init(sbuf); // C `:199` (all_options_strbuf re-inits too, js/options.js)
    all_options_strbuf(sbuf); // C `:200`
    const text = sbuf.str ?? ''; // C `:201` strlen
    if (vfsWriteFile(configfile, text)) { // C `:202` fwrite + `:203` fclose
        // Wrote the whole buffer: nothing left to report.
    }
    strbuf_empty(sbuf); // C `:204`
    return ECMD_OK; // C `:209`
}

/**
 * C ref: cfgfiles.c free_config_sections `:506–517` in C order.
 * C is staticfn void; exported for handle_config_section and the future
 * parse_conf_buf port (`:1768` caller chain). The gameconfig fields live
 * on `game` (currentgraphics precedent); C decl.c NULL-init is `?? null`
 * reads. free/dupstr on strings are GC no-ops (mklev/invent precedent).
 */
export function free_config_sections() {
    // C `:509–512`
    if (game.config_section_chosen != null) {
        game.config_section_chosen = null; // C free + = NULL
    }
    // C `:513–516`
    if (game.config_section_current != null) {
        game.config_section_current = null; // C free + = NULL
    }
}

/**
 * C ref: cfgfiles.c is_config_section `:522–549` in C order — check for
 * "[ anything-except-bracket ] # arbitrary-comment" with optional spaces.
 * C is staticfn char *; exported for handle_config_section (same `:554`
 * call). Returns the bracket-stripped section name, or null.
 * C mutates the input (trailing trimspaces strip, `*z = '\\0'` cut); JS
 * strings are immutable, so the name is returned and the input-strip is
 * owed to the future parse_conf_buf port's FALSE path (map-named).
 * @param {string} str
 * @returns {string|null}
 */
export function is_config_section(str) {
    // C `:530`: trimspaces strips trailing in place, returns past leading.
    const a = trimspaces(str);
    // C `:532–533`: *a++ != '[' — empty input reads '\0' → fail.
    if (a[0] !== '[') return null;
    const past = a.slice(1);
    // C `:535–537`: last char is ']' ignoring any comment.
    const z = past.indexOf(']');
    if (z === -1) return null;
    // C `:539–540`: spaces only (not tabs) between ']' and comment.
    let c = z + 1;
    while (c < past.length && past[c] === ' ') c++;
    // C `:541–542`: *c nonzero and not '#' → fail.
    const tail = past.slice(c);
    if (tail !== '' && !tail.startsWith('#')) return null;
    // C `:545–548`: cut at ']', trim spaces around the choice.
    return trimspaces(past.slice(0, z));
}

/**
 * C ref: cfgfiles.c handle_config_section `:551–582` in C order.
 * C is staticfn boolean; exported for the future parse_conf_buf port —
 * the sole C caller (`:1768`; map-named, no JS dispatch yet).
 * @param {string} buf
 * @returns {boolean} TRUE = line consumed (section header or filtered out)
 */
export function handle_config_section(buf) {
    // C `:554`: pointer test — '' (empty "[]" section) is non-null in C,
    // so this is !== null, not truthiness.
    const sect = is_config_section(buf);
    if (sect !== null) {
        // C `:557–558`: free current BEFORE the CHOOSE check.
        if (game.config_section_current != null)
            game.config_section_current = null; // C free + = 0
        // C `:559–563`: is_config_section() removed brackets from 'sect'.
        if (game.config_section_chosen == null) {
            config_error_add('Section "[%s]" without CHOOSE', sect); // C `:561`
            return true;
        }
        if (sect !== '') { // C `:564–567` *sect — got a section name
            game.config_section_current = sect; // C `:565` dupstr (GC no-op)
            // C `:566–567` debugpline1 — D_DEBUG-only (named omission).
        } else { // C `:568–570` empty section name => end of sections
            free_config_sections(); // C `:569`
            // C `:570` debugpline0 — D_DEBUG-only (named omission).
        }
        return true; // C `:572`
    }
    // C `:575–580`: non-section line under an active section filter.
    if (game.config_section_current != null) {
        if (game.config_section_chosen == null) return true; // C `:576–577`
        // C `:578–579` strcmp — nonzero (different) → filtered out.
        if (game.config_section_current !== game.config_section_chosen)
            return true;
    }
    return false; // C `:580`
}

/* C global.h `:581–582` / `:592–598`. */
const SET_IN_SYSCONF = 0;
const SET_IN_CONFIG = 1;
const INBUFSZ = 4 * BUFSZ;
const SYSCF_FILE = 'sysconf'; // C config.h `:234`

/* C cfgfiles.c file-static `ignore_statement_errors` (default FALSE).
 * rcfile_interface_options is the writer (`:1968` / `:1975`). */
let ignoreStatementErrors = false;

/* C cfgfiles.c `:1455–1466` config-error stack. Messages use sync
 * raw_printf: pline+wait_synch is the windowed input boundary (map). */
let configErrorData = null;

function trunc(s, n) {
    const t = String(s ?? '');
    return t.length > n ? t.slice(0, n) : t;
}

function configMsg(text) {
    // C pline during early config is raw_print. Windowed pline + wait_synch
    // is named (parser stays sync, same precedent as parseoptions).
    raw_printf('%s', text);
}

/**
 * C ref: cfgfiles.c config_error_init `:1469–1490`.
 * @param {boolean} fromFile
 * @param {string|null|undefined} sourcename
 * @param {boolean} secure
 */
export function config_error_init(fromFile, sourcename, secure) {
    const tmp = { // C `:1472–1486`
        line_num: 0,
        num_errors: 0,
        origline_shown: false,
        fromfile: !!fromFile,
        secure: !!secure,
        origline: '',
        source: '',
        next: configErrorData,
    };
    if (sourcename && sourcename[0]) // C `:1481–1484`
        tmp.source = trunc(sourcename, BUFSZ - 1);
    configErrorData = tmp; // C `:1488–1489`
    if (!game.program_state) game.program_state = {};
    game.program_state.config_error_ready = true; // C `:1490`
}

/** C ref: cfgfiles.c config_error_nextline `:1492–1512` (staticfn). */
function config_error_nextline(line) {
    const ced = configErrorData; // C `:1495`
    if (!ced) return false; // C `:1497–1498`
    if (ced.num_errors && ced.secure) return false; // C `:1500–1501`
    ced.line_num++; // C `:1503`
    ced.origline_shown = false; // C `:1504`
    if (line && line[0]) ced.origline = trunc(line, INBUFSZ - 1); // C `:1505–1507`
    else ced.origline = ''; // C `:1509`
    return true; // C `:1511`
}

function punctTail(buf) {
    // C `:1552–1555` — period unless the text already ends in . ! ?
    const last = buf.length ? buf[buf.length - 1] : '';
    return '.!?'.includes(last) ? '' : '.';
}

/**
 * C ref: cfgfiles.c config_erradd `:1543–1589`.
 * in_lua arm (`:1566–1574`) is the lua error list — named (no lua state).
 */
export function config_erradd(buf) {
    let text = buf && buf.length ? String(buf) : 'Unknown error'; // C `:1549–1550`
    text = trunc(text, BUFSZ - 1); // C vconfig_error_add `:1888`
    const punct = punctTail(text);
    const ready = !!game.program_state?.config_error_ready;
    if (!ready) { // C `:1557–1563`
        const prefix = !game.iflags?.window_inited ? 'config_error_add: ' : '';
        configMsg(prefix + text + punct);
        return;
    }
    if (!configErrorData) return;
    configErrorData.num_errors++; // C `:1577`
    if (!configErrorData.origline_shown && !configErrorData.secure) { // C `:1578–1580`
        configMsg('\n' + configErrorData.origline);
        configErrorData.origline_shown = true;
    }
    let lineno = ''; // C `:1582–1585`
    if (configErrorData.line_num > 0 && !configErrorData.secure)
        lineno = 'Line ' + configErrorData.line_num + ': ';
    const tag = configErrorData.secure ? 'Error:' : ' *'; // C `:1587`
    configMsg(tag + ' ' + lineno + text + punct);
}

/** Local sink for this file. botl.js config_error_add stays the no-op
 * used by options/doset (established named omission). */
function cnf_error(text) {
    config_erradd(text);
}

/**
 * C ref: cfgfiles.c config_error_done `:1591–1621`.
 * USER_SOUNDS is off, so the no_sound_notified addend (`:1600–1607`) is live.
 * @returns {number}
 */
export function config_error_done() {
    if (!configErrorData) return 0; // C `:1597–1598`
    let n = configErrorData.num_errors; // C `:1599`
    const notified = game.gn?.no_sound_notified | 0;
    if (notified > 0) { // C `:1601–1606`
        n += notified - 1;
        if (!game.gn) game.gn = {};
        game.gn.no_sound_notified = 0;
    }
    if (n) { // C `:1609–1614`
        const cmdline = configErrorData.source === 'command line';
        const where = configErrorData.source
            ? configErrorData.source
            : (get_configfile() || '');
        const plural = n === 1 ? '' : 's'; // C plur(n)
        configMsg('\n' + n + ' error' + plural + ' ' + (cmdline ? 'on' : 'in')
            + ' ' + where + '.\n');
    }
    configErrorData = configErrorData.next; // C `:1616–1617`
    if (!game.program_state) game.program_state = {};
    game.program_state.config_error_ready = configErrorData != null; // C `:1619`
    return n; // C `:1620`
}

/** C getenv without a node: import. Empty and missing are both "unset". */
function c_getenv(name) {
    const env = (typeof globalThis !== 'undefined' && globalThis.process
        && globalThis.process.env) || null;
    if (!env) return null;
    const v = env[name];
    if (v == null || v === '') return null;
    return String(v);
}

/**
 * C ref: cfgfiles.c fopen_config_file `:222–372`, UNIX (+ __APPLE__) arms.
 * Rule #2: VFS stands in for fopen. A missing key is the access/ENOENT
 * failure. MICRO/WIN32/VMS arms are compiled out on this build.
 * @returns {string|null} file text, or null when nothing opened
 */
function fopen_config_file(filename, src) {
    if (src === SET_IN_SYSCONF) { // C `:231–238`
        if (filename && filename[0]) {
            set_configfile_name(filename); // fqname named — bare SYSCF_FILE
            const text = vfsReadFile(get_configfile());
            return text;
        }
        return null;
    }
    if (filename && filename[0]) { // C `:244`
        let name = filename;
        if (name.startsWith('~/')) { // C `:247–253`
            const home = c_getenv('HOME');
            if (home) name = home + '/' + name.slice(2);
        }
        set_configfile_name(name);
        const text = vfsReadFile(get_configfile());
        if (text == null) { // C `:254–262` access denied, fall through
            raw_printf('Access to %s denied (%d).', get_configfile(), 0);
        } else {
            return text; // C `:266–267`
        }
    }
    // C `:320–328` UNIX default ~/.nethackrc
    const home = c_getenv('HOME');
    const tmp = home ? (home + '/.nethackrc') : '.nethackrc';
    set_configfile_name(tmp);
    let text = vfsReadFile(get_configfile());
    if (text != null) return text;
    if (home) { // C `:329–354` __APPLE__ alternates
        const alts = [
            home + '/Library/Preferences/NetHack Defaults',
            home + '/Library/Preferences/NetHack Defaults.txt',
        ];
        for (const alt of alts) {
            set_configfile_name(alt);
            text = vfsReadFile(get_configfile());
            if (text != null) return text;
        }
        set_configfile_name(tmp); // C `:351` restore preferred name
        text = vfsReadFile(get_configfile());
        if (text != null) return text;
    }
    return null; // C `:371`
}

/** C ref: cfgfiles.c find_optparam `:587–598`. Returns the index, or -1. */
function find_optparam(buf) {
    let bufp = buf.indexOf('='); // C `:591`
    const altp = buf.indexOf(':'); // C `:592`
    if (bufp < 0 || (altp >= 0 && altp < bufp)) bufp = altp; // C `:593–594`
    return bufp;
}

/** C `#define match_varname` cfgfiles.c `:584`. */
function match_varname(inp, nam, len) {
    return match_optname(inp, nam, len, true);
}

/**
 * C ref: cfgfiles.c choose_random_part `:463–504`. rn2 picks the piece.
 * C writes a NUL over the following separator; the caller only keeps the
 * returned slice, so the cut is the return value.
 * @returns {string|null}
 */
function choose_random_part(str, sep) {
    if (str == null) return null; // C `:472–473`
    let nsep = 1; // C `:467`
    for (let i = 0; i < str.length; i++) { // C `:476–479`
        if (str[i] === sep) nsep++;
    }
    let csep = rn2(nsep); // C `:482`
    let i = 0; // C `:486–491`
    while (csep > 0 && i < str.length) {
        i++;
        if (str[i] === sep) csep--;
    }
    if (i >= str.length || !str[i]) return null; // C `:492` !*str
    if (str[i] === sep) i++; // C `:493–494`
    const begin = i;
    let len = 0; // C `:496–500`
    while (i < str.length && str[i] !== sep) {
        i++;
        len++;
    }
    if (len) return str.slice(begin, begin + len); // C `:501–502`
    return null; // C `:503`
}

function sysoptBag() {
    if (!game.sysopt || typeof game.sysopt !== 'object') game.sysopt = {};
    return game.sysopt;
}

function cnf_store_str(key, bufp) {
    sysoptBag()[key] = String(bufp ?? ''); // C dupstr
    return true;
}

/* --- cnf_line_* (cfgfiles.c). Unported callees return TRUE and are named. --- */

function cnf_line_OPTIONS(origbuf) {
    const at = find_optparam(origbuf); // C `:604`
    // C `:607` ++bufp with no null check — a missing '=' is a caller bug.
    const bufp = at < 0 ? '' : origbuf.slice(at + 1);
    return !!parseoptions(bufp, true, true); // C `:608`
}

function cnf_line_NAME(bufp) {
    game.plname = trunc(bufp, PL_NSIZ - 1); // C `:763` strncpy
    return true;
}

function cnf_line_ROLE(bufp) {
    const len = str2role(bufp); // C `:772`
    if (len >= 0) {
        if (!game.flags) game.flags = {};
        game.flags.initrole = len; // C `:773`
    }
    return true; // C `:774`
}

function cnf_line_dogname(bufp) {
    game.dogname = trunc(bufp, PL_PSIZ - 1); // C `:780`
    return true;
}

function cnf_line_catname(bufp) {
    game.catname = trunc(bufp, PL_PSIZ - 1); // C `:787`
    return true;
}

function cnf_line_MSGTYPE(bufp) {
    return !!msgtype_parse_add(bufp); // C `:634`
}

function cnf_line_MENUCOLOR(bufp) {
    return !!add_menu_coloring(bufp); // C `:1166`
}

function cnf_line_HILITE_STATUS(bufp) {
    return !!parse_status_hl1(bufp, true); // C `:1173` STATUS_HILITES on
}

function cnf_line_SYMBOLS(bufp) {
    if (parsesymbols(bufp, PRIMARYSET)) { // C `:1204`
        // switch_symbols(TRUE) named — no JS symbol apply.
        return true; // C `:1206`
    }
    if (!config_unmatched_ignored()) // C `:1208`
        cnf_error("Error in SYMBOLS definition '" + bufp + "'");
    return false; // C `:1210`
}

function cnf_line_ROGUESYMBOLS(bufp) {
    if (parsesymbols(bufp, ROGUESET)) { // C `:1193`
        return true; // switch_symbols named
    }
    cnf_error("Error in ROGUESYMBOLS definition '" + bufp + "'"); // C `:1197`
    return false;
}

function cnf_line_WIZKIT(bufp) {
    game.wizkit = trunc(bufp, WIZKIT_MAX - 1); // C `:1216`
    return true;
}

/** UNIX !NOCWD_ASSUMPTIONS: HACKDIR…TROUBLEDIR are nhUse + TRUE (`:638–758`). */
function cnf_line_nhUse(_bufp) {
    return true;
}

function cnf_line_PERS_IS_UID(bufp) {
    let n = parseInt(bufp, 10); // C atoi `:984`
    if (!Number.isFinite(n)) n = 0;
    if (n !== 0 && n !== 1) { // C `:986–988`
        cnf_error('Illegal value in PERS_IS_UID (must be 0 or 1)');
        n = 0;
    }
    sysoptBag().pers_is_uid = n;
    return true;
}

function cnf_line_ENTRYMAX(bufp) {
    let n = parseInt(bufp, 10);
    if (!Number.isFinite(n)) n = 0;
    if (n < 10) { // C `:999–1001`
        cnf_error('Illegal value in ENTRYMAX (minimum is 10)');
        n = 10;
    }
    sysoptBag().entrymax = n;
    return true;
}

function cnf_line_POINTSMIN(bufp) {
    let n = parseInt(bufp, 10);
    if (!Number.isFinite(n)) n = 0;
    if (n < 1) { // C `:1012–1014`
        cnf_error('Illegal value in POINTSMIN (minimum is 1)');
        n = 100;
    }
    sysoptBag().pointsmin = n;
    return true;
}

function cnf_line_MAX_STATUENAME_RANK(bufp) {
    let n = parseInt(bufp, 10);
    if (!Number.isFinite(n)) n = 0;
    if (n < 1) { // C `:1025–1028`
        cnf_error('Illegal value in MAX_STATUENAME_RANK (minimum is 1)');
        n = 10;
    }
    sysoptBag().tt_oname_maxrank = n;
    return true;
}

function cnf_line_LIVELOG(bufp) {
    // C strtol base 0 (`:1040`). Hex and octal prefixes included.
    const t = String(bufp ?? '').trim();
    let L = 0;
    // C strtol(..., 0): 0x hex, leading 0 octal (stops at a non-octal digit).
    if (/^0x/i.test(t)) L = parseInt(t, 16);
    else if (/^0/.test(t)) L = parseInt((/^0[0-7]*/.exec(t) || ['0'])[0], 8);
    else L = parseInt(t, 10);
    if (!Number.isFinite(L)) L = 0;
    if (L < 0 || L > 0xffff) { // C `:1042–1045`
        cnf_error('Illegal value for LIVELOG (must be between 0 and 0xFFFF).');
        return false;
    }
    sysoptBag().livelog = L;
    return true;
}

function cnf_line_PANICTRACE_LIBC(bufp) {
    let n = parseInt(bufp, 10);
    if (!Number.isFinite(n)) n = 0;
    // PANICTRACE_LIBC is not this build: C keeps the raw atoi (`:1052–1063`).
    sysoptBag().panictrace_libc = n;
    return true;
}

function cnf_line_PANICTRACE_GDB(bufp) {
    let n = parseInt(bufp, 10);
    if (!Number.isFinite(n)) n = 0;
    sysoptBag().panictrace_gdb = n; // C `:1077` (range check is PANICTRACE-only)
    return true;
}

function cnf_line_ACCESSIBILITY(bufp) {
    let n = parseInt(bufp, 10);
    if (!Number.isFinite(n)) n = 0;
    if (n < 0 || n > 1) { // C `:1125–1127`
        cnf_error('Illegal value in ACCESSIBILITY (not 0,1)');
        n = 0;
    }
    sysoptBag().accessibility = n;
    return true;
}

/** WIN32-only body; elsewhere nhUse + TRUE (`:1134–1149`). */
function cnf_line_PORTABLE_DEVICE_PATHS(_bufp) {
    return true;
}

/** Named callees: body not in this commit. Matching still consumes the line
 * (C returns TRUE for the nhUse / always-true handlers). */
function cnf_line_named_true(_bufp) {
    return true;
}

/**
 * C ref: cfgfiles.c config_line_stmt `:1303–1379`.
 * USER_SOUNDS off (SOUND/SOUNDDIR omitted). SYSCF on. SFCTOOL off.
 * origbuf TRUE only for OPTIONS.
 */
const configLineStmt = [
    { name: 'OPTIONS', len: 4, syscnf: false, origbuf: true, fn: cnf_line_OPTIONS },
    { name: 'AUTOPICKUP_EXCEPTION', len: 5, syscnf: false, origbuf: false, fn: cnf_line_named_true },
    { name: 'BINDINGS', len: 4, syscnf: false, origbuf: false, fn: cnf_line_named_true },
    { name: 'AUTOCOMPLETE', len: 5, syscnf: false, origbuf: false, fn: cnf_line_named_true },
    { name: 'MSGTYPE', len: 7, syscnf: false, origbuf: false, fn: cnf_line_MSGTYPE },
    { name: 'HACKDIR', len: 4, syscnf: false, origbuf: false, fn: cnf_line_nhUse },
    { name: 'LEVELDIR', len: 4, syscnf: false, origbuf: false, fn: cnf_line_nhUse },
    { name: 'LEVELS', len: 4, syscnf: false, origbuf: false, fn: cnf_line_nhUse },
    { name: 'SAVEDIR', len: 4, syscnf: false, origbuf: false, fn: cnf_line_nhUse },
    { name: 'BONESDIR', len: 5, syscnf: false, origbuf: false, fn: cnf_line_nhUse },
    { name: 'DATADIR', len: 4, syscnf: false, origbuf: false, fn: cnf_line_nhUse },
    { name: 'SCOREDIR', len: 4, syscnf: false, origbuf: false, fn: cnf_line_nhUse },
    { name: 'LOCKDIR', len: 4, syscnf: false, origbuf: false, fn: cnf_line_nhUse },
    { name: 'CONFIGDIR', len: 4, syscnf: false, origbuf: false, fn: cnf_line_nhUse },
    { name: 'TROUBLEDIR', len: 4, syscnf: false, origbuf: false, fn: cnf_line_nhUse },
    { name: 'NAME', len: 4, syscnf: false, origbuf: false, fn: cnf_line_NAME },
    { name: 'ROLE', len: 4, syscnf: false, origbuf: false, fn: cnf_line_ROLE },
    { name: 'CHARACTER', len: 4, syscnf: false, origbuf: false, fn: cnf_line_ROLE },
    { name: 'dogname', len: 3, syscnf: false, origbuf: false, fn: cnf_line_dogname },
    { name: 'catname', len: 3, syscnf: false, origbuf: false, fn: cnf_line_catname },
    { name: 'WIZARDS', len: 7, syscnf: true, origbuf: false, fn: (b) => cnf_store_str('wizards', b) },
    { name: 'SHELLERS', len: 8, syscnf: true, origbuf: false, fn: (b) => cnf_store_str('shellers', b) },
    { name: 'MSGHANDLER', len: 9, syscnf: true, origbuf: false, fn: (b) => cnf_store_str('msghandler', b) },
    { name: 'EXPLORERS', len: 7, syscnf: true, origbuf: false, fn: (b) => cnf_store_str('explorers', b) },
    { name: 'DEBUGFILES', len: 5, syscnf: true, origbuf: false, fn: (b) => cnf_store_str('debugfiles', b) },
    { name: 'DUMPLOGFILE', len: 7, syscnf: true, origbuf: false, fn: (b) => cnf_store_str('dumplogfile', b) },
    { name: 'GENERICUSERS', len: 12, syscnf: true, origbuf: false, fn: (b) => cnf_store_str('genericusers', b) },
    { name: 'BONES_POOLS', len: 10, syscnf: true, origbuf: false, fn: (b) => cnf_store_str('bones_pools', b) },
    { name: 'SUPPORT', len: 7, syscnf: true, origbuf: false, fn: (b) => cnf_store_str('support', b) },
    { name: 'RECOVER', len: 7, syscnf: true, origbuf: false, fn: (b) => cnf_store_str('recover', b) },
    { name: 'CHECK_SAVE_UID', len: 14, syscnf: true, origbuf: false, fn: cnf_line_named_true },
    { name: 'CHECK_PLNAME', len: 12, syscnf: true, origbuf: false, fn: cnf_line_named_true },
    { name: 'SEDUCE', len: 6, syscnf: true, origbuf: false, fn: cnf_line_named_true },
    { name: 'HIDEUSAGE', len: 9, syscnf: true, origbuf: false, fn: cnf_line_named_true },
    { name: 'MAXPLAYERS', len: 10, syscnf: true, origbuf: false, fn: cnf_line_named_true },
    { name: 'PERSMAX', len: 7, syscnf: true, origbuf: false, fn: cnf_line_named_true },
    { name: 'PERS_IS_UID', len: 11, syscnf: true, origbuf: false, fn: cnf_line_PERS_IS_UID },
    { name: 'ENTRYMAX', len: 8, syscnf: true, origbuf: false, fn: cnf_line_ENTRYMAX },
    { name: 'POINTSMIN', len: 9, syscnf: true, origbuf: false, fn: cnf_line_POINTSMIN },
    { name: 'MAX_STATUENAME_RANK', len: 10, syscnf: true, origbuf: false, fn: cnf_line_MAX_STATUENAME_RANK },
    { name: 'LIVELOG', len: 7, syscnf: true, origbuf: false, fn: cnf_line_LIVELOG },
    { name: 'PANICTRACE_LIBC', len: 15, syscnf: true, origbuf: false, fn: cnf_line_PANICTRACE_LIBC },
    { name: 'PANICTRACE_GDB', len: 14, syscnf: true, origbuf: false, fn: cnf_line_PANICTRACE_GDB },
    { name: 'CRASHREPORTURL', len: 13, syscnf: true, origbuf: false, fn: (b) => cnf_store_str('crashreporturl', b) },
    { name: 'GDBPATH', len: 7, syscnf: true, origbuf: false, fn: (b) => cnf_store_str('gdbpath', b) },
    { name: 'GREPPATH', len: 7, syscnf: true, origbuf: false, fn: (b) => cnf_store_str('greppath', b) },
    { name: 'ACCESSIBILITY', len: 13, syscnf: true, origbuf: false, fn: cnf_line_ACCESSIBILITY },
    { name: 'PORTABLE_DEVICE_PATHS', len: 8, syscnf: true, origbuf: false, fn: cnf_line_PORTABLE_DEVICE_PATHS },
    { name: 'BOULDER', len: 3, syscnf: false, origbuf: false, fn: cnf_line_named_true },
    { name: 'MENUCOLOR', len: 9, syscnf: false, origbuf: false, fn: cnf_line_MENUCOLOR },
    { name: 'HILITE_STATUS', len: 6, syscnf: false, origbuf: false, fn: cnf_line_HILITE_STATUS },
    { name: 'WARNINGS', len: 5, syscnf: false, origbuf: false, fn: cnf_line_named_true },
    { name: 'ROGUESYMBOLS', len: 4, syscnf: false, origbuf: false, fn: cnf_line_ROGUESYMBOLS },
    { name: 'SYMBOLS', len: 4, syscnf: false, origbuf: false, fn: cnf_line_SYMBOLS },
    { name: 'WIZKIT', len: 6, syscnf: false, origbuf: false, fn: cnf_line_WIZKIT },
    { name: 'QT_TILEWIDTH', len: 12, syscnf: false, origbuf: false, fn: cnf_line_nhUse },
    { name: 'QT_TILEHEIGHT', len: 13, syscnf: false, origbuf: false, fn: cnf_line_nhUse },
    { name: 'QT_FONTSIZE', len: 11, syscnf: false, origbuf: false, fn: cnf_line_nhUse },
    { name: 'QT_COMPACT', len: 10, syscnf: false, origbuf: false, fn: cnf_line_nhUse },
];

/** C `:1386` static boolean disregarded_config_lines[SIZE], zero-init = heed. */
const disregardedConfigLines = new Array(configLineStmt.length).fill(false);

export function heed_all_config_statements() {
    for (let i = 0; i < disregardedConfigLines.length; i++) // C `:1983–1984`
        disregardedConfigLines[i] = false;
}

export function disregard_all_config_statements() {
    for (let i = 0; i < disregardedConfigLines.length; i++) // C `:1992–1993`
        disregardedConfigLines[i] = true;
}

/**
 * C ref: cfgfiles.c parse_config_line `:1388–1438`.
 * @param {string} origbuf
 * @returns {boolean}
 */
export function parse_config_line(origbuf) {
    const src = game.iflags?.parse_config_file_src | 0; // C `:1395`
    const inSysconf = src === SET_IN_SYSCONF; // C `:1396`
    let p = String(origbuf ?? '');
    while (p[0] === ' ' || p[0] === '\t') p = p.slice(1); // C `:1401–1402`
    let buf = trunc(p, INBUFSZ - 1); // C `:1403–1404` strncpy into 4*BUFSZ
    buf = mungspaces(buf); // C `:1408`
    const at = find_optparam(buf); // C `:1411`
    if (at < 0) { // C `:1412–1415`
        if (!ignoreStatementErrors)
            cnf_error("Not a config statement, missing '='");
        return false;
    }
    let bufp = buf.slice(at + 1); // C `:1418`
    if (bufp[0] === ' ') bufp = bufp.slice(1); // C `:1419–1420`
    for (let i = 0; i < configLineStmt.length; i++) { // C `:1422`
        const row = configLineStmt[i];
        if (row.syscnf && !inSysconf) continue; // C `:1424–1425`
        if (match_varname(buf, row.name, row.len)) { // C `:1427–1428`
            if (!disregardedConfigLines[i]) { // C `:1431`
                const parm = row.origbuf ? p : bufp; // C `:1429`
                return !!row.fn(parm); // C `:1432`
            }
        }
    }
    if (!config_unmatched_ignored()) // C `:1436` ignore_errors_on_unmatched
        cnf_error('Unknown config statement');
    return false; // C `:1438`
}

function cnf_parser_init(parser) {
    parser.rv = true; // C `:1664`
    parser.ep = 0;
    parser.buf = null; // C `:1665`
    parser.skip = false; // C `:1666`
    parser.morelines = false; // C `:1667`
    parser.inbufsz = INBUFSZ; // C `:1668`
    parser.inbuf = ''; // C `:1669–1671` alloc + memset 0
    parser.cont = false; // C `:1670`
    parser.pbreak = false; // C `:1671`
}

function cnf_parser_done(parser) {
    parser.ep = 0; // C `:1679`
    parser.inbuf = ''; // C `:1680–1681` free
    parser.buf = null; // C `:1682–1683`
}

/**
 * C ref: cfgfiles.c parse_conf_buf `:1692–1807`.
 * @param {object} p
 * @param {(line: string) => boolean} proc
 */
function parse_conf_buf(p, proc) {
    p.cont = false; // C `:1695`
    p.pbreak = false; // C `:1696`
    let line = String(p.inbuf ?? '');
    let nl = line.indexOf('\n'); // C `:1697` strchr
    if (p.skip) { // C `:1698–1700`
        if (nl >= 0) p.skip = false;
        return;
    }
    let ep = nl; // index of newline, or -1
    if (ep < 0) { // C `:1702` newline missing
        if (line.length < p.inbufsz - 2) { // C `:1703–1706`
            ep = line.length; // eos
        } else {
            cnf_error('Line too long, skipping'); // C `:1708`
            p.skip = true; // C `:1709`
        }
    } else {
        line = line.slice(0, ep); // C `:1712` *ep = 0
        ep = line.length;
    }
    if (ep < 0) return; // C `:1714` if (p->ep) — skip path
    // C `:1721` --ep, then '\\' test. ep is the NUL index; --ep is last char.
    ep = ep - 1;
    p.morelines = ep >= 0 && line[ep] === '\\'; // C `:1721`
    if (p.morelines) { // C `:1722–1723`
        line = line.slice(0, ep);
        ep = line.length; // points at the new NUL
    }
    while (ep >= 0 && ep < line.length // C `:1726–1728`
        && (line[ep] === ' ' || line[ep] === '\t' || line[ep] === '\r')) {
        line = line.slice(0, ep);
        ep--;
    }
    p.inbuf = line;
    if (!config_error_nextline(line)) { // C `:1730–1736`
        p.rv = false;
        p.buf = null;
        p.pbreak = true;
        return;
    }
    let s = 0; // C `:1738–1740` skip leading space/tab
    while (line[s] === ' ' || line[s] === '\t') s++;
    const body = line.slice(s);
    let ignoreline = false; // C `:1743–1744`
    if (!body || body[0] === '#') ignoreline = true;
    const oldline = p.buf != null; // C `:1746–1747`
    if (!ignoreline) { // C `:1750–1762`
        let merged = body;
        if (p.buf != null) merged = p.buf + ' ' + body;
        if (merged.length >= p.inbufsz) merged = merged.slice(0, p.inbufsz - 1);
        p.buf = merged;
    }
    if (p.morelines || (ignoreline && !oldline)) return; // C `:1765–1766`
    if (handle_config_section(p.buf || '')) { // C `:1768–1771`
        p.buf = null;
        return;
    }
    const whole = p.buf || '';
    if (match_varname(whole, 'CHOOSE', 6)) { // C `:1775`
        const paramAt = find_optparam(whole); // C `:1777`
        if (paramAt < 0) { // C `:1779–1784`
            cnf_error('Format is CHOOSE=section1,section2,...');
            p.rv = false;
            p.buf = null;
            return;
        }
        let bufp = whole.slice(paramAt + 1); // C `:1786`
        game.config_section_chosen = null; // C `:1787–1789` free
        const section = choose_random_part(bufp, ','); // C `:1790`
        if (section) game.config_section_chosen = section; // C `:1791–1792`
        else { // C `:1793–1795`
            cnf_error('No config section to choose');
            p.rv = false;
        }
        p.buf = null; // C `:1797`
        return;
    }
    if (!proc(whole)) p.rv = false; // C `:1801–1802`
    p.buf = null; // C `:1804`
}

/**
 * C ref: cfgfiles.c parse_conf_str `:1809–1837`.
 * @param {string} str
 * @param {(line: string) => boolean} proc
 * @returns {boolean}
 */
export function parse_conf_str(str, proc) {
    const parser = {};
    cnf_parser_init(parser); // C `:1815`
    free_config_sections(); // C `:1816`
    config_error_init(false, 'parse_conf_str', false); // C `:1817`
    let rest = str == null ? '' : String(str);
    while (rest && rest[0]) { // C `:1818`
        let len = 0; // C `:1819–1826`
        while (len < rest.length && len < parser.inbufsz - 1) {
            len++;
            if (rest[len - 1] === '\n') break;
        }
        parser.inbuf = rest.slice(0, len);
        rest = rest.slice(len);
        parse_conf_buf(parser, proc); // C `:1827`
        if (parser.pbreak) break; // C `:1828–1829`
    }
    cnf_parser_done(parser); // C `:1831`
    free_config_sections(); // C `:1833`
    config_error_done(); // C `:1834`
    return parser.rv; // C `:1835`
}

/**
 * C ref: cfgfiles.c parse_conf_file `:1843–1860`, fed by a VFS string
 * (fgets of inbufsz-1 chars, newline included when it fits).
 */
function parse_conf_text(text, proc) {
    const parser = {};
    cnf_parser_init(parser); // C `:1848`
    free_config_sections(); // C `:1849`
    let pos = 0;
    const src = String(text ?? '');
    while (pos < src.length) { // C `:1851` fgets
        const max = parser.inbufsz - 1;
        let end = Math.min(pos + max, src.length);
        const nl = src.indexOf('\n', pos);
        if (nl >= 0 && nl < end) end = nl + 1;
        parser.inbuf = src.slice(pos, end);
        pos = end;
        parse_conf_buf(parser, proc); // C `:1852`
        if (parser.pbreak) break; // C `:1853–1854`
    }
    cnf_parser_done(parser); // C `:1856`
    free_config_sections(); // C `:1858`
    return parser.rv; // C `:1859`
}

/**
 * C ref: cfgfiles.c read_config_file `:1623–1647`.
 * @param {string|null|undefined} filename
 * @param {number} src set_in_config / set_in_sysconf
 * @returns {boolean}
 */
export function read_config_file(filename, src) {
    const text = fopen_config_file(filename, src); // C `:1629–1630`
    if (text == null) return false;
    reset_duplicate_opt_detection(); // C `:1634`
    free_config_sections(); // C `:1636`
    if (!game.iflags) game.iflags = {};
    game.iflags.parse_config_file_src = src | 0; // C `:1637`
    const rv = parse_conf_text(text, parse_config_line); // C `:1639`
    free_config_sections(); // C `:1642`
    reset_duplicate_opt_detection(); // C `:1645`
    return rv; // C `:1646`
}

/**
 * C ref: cfgfiles.c rcfile `:1892–1957` (!SFCTOOL).
 * initoptions_finish (`options.c:7327`) is not a JS function — this export
 * is the body; startup does not call it (map-named).
 */
export function rcfile() {
    if (!game.go) game.go = {};
    game.go.opt_phase = ENVIRON_OPT; // C `:1898`
    let envname = 'NETHACKOPTIONS'; // C `:1901`
    let opts = c_getenv(envname); // C `:1902`
    if (!opts) { // C `:1903–1907`
        envname = 'HACKOPTIONS';
        opts = c_getenv(envname);
    }
    let namesrc = null;
    let nameval = null;
    let xtraopts = null;
    const cmdline = game.gc?.cmdline_rcfile || null;
    if (cmdline) { // C `:1910–1915`
        namesrc = 'command line';
        nameval = cmdline;
        xtraopts = opts;
        if (opts && (opts[0] === '/' || opts[0] === '\\' || opts[0] === '@'))
            xtraopts = null;
    } else if (opts && (opts[0] === '/' || opts[0] === '\\' || opts[0] === '@')) {
        // C `:1916–1921`
        if (opts[0] === '@') opts = opts.slice(1);
        namesrc = envname;
        nameval = opts;
        xtraopts = null;
    } else { // C `:1922–1927`
        nameval = null;
        namesrc = null;
        xtraopts = opts;
    }
    game.go.opt_phase = RC_FILE_OPT; // C `:1930`
    if (nameval && nameval.length >= BUFSZ / 2) { // C `:1934–1941`
        config_error_init(true, namesrc, false);
        cnf_error('nethackrc file name "' + trunc(nameval, 40)
            + '"... too long; using default');
        config_error_done();
        nameval = null;
        namesrc = null;
    }
    config_error_init(true, nameval, !!(nameval)); // C `:1943` CONFIG_ERROR_SECURE
    read_config_file(nameval, SET_IN_CONFIG); // C `:1944`
    config_error_done(); // C `:1945`
    if (xtraopts) { // C `:1946–1952`
        game.go.opt_phase = ENVIRON_OPT;
        config_error_init(false, envname, false);
        parseoptions(xtraopts, true, false);
        config_error_done();
    }
    if (game.gc && game.gc.cmdline_rcfile) // C `:1954`
        game.gc.cmdline_rcfile = null;
}

/**
 * C ref: cfgfiles.c rcfile_interface_options `:1960–1976`.
 * Zero C call sites (brief). Exported so a later interface-rc caller can
 * run the same sequence.
 */
export function rcfile_interface_options() {
    allopt_array_init(); // C `:1962`
    disregard_all_options(); // C `:1963`
    disregard_all_config_statements(); // C `:1964`
    heed_this_option(allopt_idx('windowtype')); // C `:1965` opt_windowtype
    heed_this_option(allopt_idx('soundlib')); // C `:1966` opt_soundlib
    // set_ignore_errors_on_unmatched is options.js `:2014–2018` (already live).
    // Imported via the setter below to avoid a second clone.
    set_ignore_errors_on_unmatched(); // C `:1967`
    ignoreStatementErrors = true; // C `:1968`
    rcfile(); // C `:1969`
    heed_all_config_statements(); // C `:1970`
    heed_all_options(); // C `:1971`
    disregard_this_option(allopt_idx('windowtype')); // C `:1972`
    disregard_this_option(allopt_idx('soundlib')); // C `:1973`
    clear_ignore_errors_on_unmatched(); // C `:1974`
    ignoreStatementErrors = false; // C `:1975`
}
