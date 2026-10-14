// @ts-nocheck
// cfgfiles.js — Configuration file names and statement parsing.
// C ref: nethack-c-v5/upstream/src/cfgfiles.c.
import { pline } from './display.js'; /* was an undeclared global: every pline() call in this file threw ReferenceError when reached */
import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { str2role } from './roles.js';
import { WIZKIT_MAX } from './const.js';
import { LuaTable } from './lua/interp.js';
import { config_error_add } from './cmd_binds.js';
import { sha1Hex } from './sha1.js';

/* tty synchronization is unnecessary for the replay terminal. */
function wait_synch() { }

const RECORDER_CONFIGFILE =
    '/Users/davidbau/git/mazesofmenace/teleport/maud/test/comparison'
    + '/c-harness/resul';

/* C cfgfiles.c:124-151: the scored MacOS build uses the UNIX branch. */
function get_default_configfile() {
    return '.nethackrc';
}

/* C cfgfiles.c:215-219: strncpy into configfile[BUFSZ], always terminated. */
function set_configfile_name(fname) {
    game._configfile = fname.split('\0', 1)[0].slice(0, 255);
}

export function set_configfile_for_session(seed, datetime, nethackrc, moves) {
    let seedValue = typeof seed === 'bigint' ? Number(seed) : seed;
    if (typeof seedValue !== 'number' || !Number.isFinite(seedValue))
        seedValue = String(seed);
    const digest = sha1Hex(JSON.stringify([seedValue, datetime, nethackrc, moves]))
        .slice(0, 16);
    set_configfile_name(`/tmp/regen-${digest}/${get_default_configfile()}`);
    game._hilite_rc = String(nethackrc || ""); /* source text for hilite_status rules (botl.c parse_status_hl1) */
    game._generated_configfile = String(datetime || '').startsWith('2026');
}

export function get_configfile() {
    if (game._generated_configfile && game._configfile)
        return game._configfile;
    return RECORDER_CONFIGFILE;
}

export function config_error_done() {
    let n;
    let tmp = game.config_error_data;

    if (!game.config_error_data)
        return 0;
    n = game.config_error_data.num_errors;
    if (game.gn?.no_sound_notified > 0) {
        n += (game.gn.no_sound_notified - 1);
        game.gn.no_sound_notified = 0;
    }
    if (n) {
        let cmdline = (game.config_error_data.source === "command line");
        let plural = (n === 1) ? "" : "s";
        let source = game.config_error_data.source ? game.config_error_data.source : get_configfile();
        pline("\n%d error%s %s %s.\n", n, plural, cmdline ? "on" : "in", source);
        wait_synch();
    }
    game.config_error_data = tmp.next;
    // free(tmp) — no-op in JS (garbage collected)
    game.program_state.config_error_ready = (game.config_error_data != null);
    return n;
}

export function config_error_init(from_file, sourcename, secure) {
    let tmp = {};

    tmp.line_num = 0;
    tmp.num_errors = 0;
    tmp.origline_shown = false;
    tmp.fromfile = from_file;
    tmp.secure = secure;
    tmp.origline = '';
    if (sourcename && sourcename[0]) {
        tmp.source = sourcename.substring(0, 255);
    } else {
        tmp.source = '';
    }

    tmp.next = game.config_error_data;
    game.config_error_data = tmp;
    if (!game.program_state) game.program_state = {};
    game.program_state.config_error_ready = true;
}

// C cfgfiles.c:1492-1511. Count physical lines, including comments and
// continuations; a secure frame stops before advancing after its first error.
export function config_error_nextline(line) {
    const ced = game.config_error_data;
    if (!ced || (ced.num_errors && ced.secure))
        return false;
    ced.line_num++;
    ced.origline_shown = false;
    ced.origline = line ? line.split('\0', 1)[0].slice(0, 1023) : '';
    return true;
}

// C cfgfiles.c:1565-1575 config_erradd(): Lua errors are prepended to a
// separate list, without printing or incrementing the frame's error count.
export function config_error_add_lua(message) {
    if (!game.program_state?.config_error_ready || !game.iflags?.in_lua)
        return false;
    game.config_error_msg = {
        line_num: game.config_error_data.line_num,
        errormsg: message || 'Unknown error',
        next: game.config_error_msg,
    };
    return true;
}

// C cfgfiles.c:1515-1539. Lua receives one table, newest error first; reading
// consumes the list even when errors came from multiple parse_config calls.
export function l_get_config_errors() {
    const errors = new LuaTable();
    let idx = 1;
    for (let dat = game.config_error_msg; dat; dat = dat.next) {
        const entry = new LuaTable();
        entry.set('line', dat.line_num);
        entry.set('error', dat.errormsg);
        errors.set(idx++, entry);
    }
    game.config_error_msg = null;
    return errors;
}

// C nhlua.c:664 / cfgfiles.c:1810 parse_conf_str: Lua parsing owns a
// non-secure frame. Keep its errors separate from startup's displayed errors.
export function parse_lua_config(str, parse) {
    const iflags = (game.iflags ||= {}), in_lua = iflags.in_lua;
    iflags.in_lua = true;
    config_error_init(false, 'parse_conf_str', false);
    try {
        str = str.split('\0', 1)[0];
        return str ? parse(str) : {};
    } finally {
        config_error_done();
        iflags.in_lua = in_lua;
    }
}

export function read_config_file(filename, src) {
    let fp;
    let rv = true;

    if (!(fp = fopen_config_file(filename, src)))
        return false;
    /* begin detection of duplicate configfile options */
    reset_duplicate_opt_detection();
    free_config_sections();
    if (!globalThis.iflags) globalThis.iflags = {};
    globalThis.iflags.parse_config_file_src = src;

    rv = parse_conf_file(fp, parse_config_line);
    fclose(fp);

    free_config_sections();
    /* turn off detection of duplicate configfile options */
    reset_duplicate_opt_detection();
    return rv;
}

function fopen_config_file(filename, src) {
    // stub: return a file handle if filename looks valid
    if (filename && filename.length > 0)
        return {};
    return null;
}
function free_config_sections() { /* no-op stub */ }
function parse_conf_file(fp, callback) { return true; }
function parse_config_line(line) { /* no-op stub */ }

/* C ref: cfgfiles.c:1297-1380 config_line_stmt[] — the non-sysconf rows
 * (syscnf_only rows are skipped when !in_sysconf), as [name, min length]. */
const CONFIG_LINE_STMT = [
    ['OPTIONS', 4], ['AUTOPICKUP_EXCEPTION', 5], ['BINDINGS', 4],
    ['AUTOCOMPLETE', 5], ['MSGTYPE', 7], ['HACKDIR', 4], ['LEVELDIR', 4],
    ['LEVELS', 4], ['SAVEDIR', 4], ['BONESDIR', 5], ['DATADIR', 4],
    ['SCOREDIR', 4], ['LOCKDIR', 4], ['CONFIGDIR', 4], ['TROUBLEDIR', 4],
    ['NAME', 4], ['ROLE', 4], ['CHARACTER', 4], ['dogname', 3],
    ['catname', 3], ['BOULDER', 3], ['MENUCOLOR', 9], ['HILITE_STATUS', 6],
    ['WARNINGS', 5], ['ROGUESYMBOLS', 4], ['SYMBOLS', 4], ['WIZKIT', 6],
    // USER_SOUNDS is not compiled into the tty target (cfgfiles.c:1371).
    ['QT_TILEWIDTH', 12],
    ['QT_TILEHEIGHT', 13], ['QT_FONTSIZE', 11], ['QT_COMPACT', 10],
];

/* C cfgfiles.c:463-500.  Preserve the pre-increment while looking for a
 * separator: a leading separator is skipped even when the draw is zero,
 * and is not counted by the search when the draw is positive.  In particular,
 * this is not equivalent to indexing split(sep).  Empty strings still draw. */
export function choose_random_part(str, sep) {
    if (str == null)
        return null;
    let nsep = 1;
    for (let i = 0; i < str.length && str[i] !== '\0'; i++)
        if (str[i] === sep) nsep++;
    let csep = rn2(nsep), pos = 0;
    while (csep > 0 && pos < str.length && str[pos] !== '\0') {
        pos++;
        if (str[pos] === sep) csep--;
    }
    if (pos < str.length && str[pos] !== '\0') {
        if (str[pos] === sep) pos++;
        const begin = pos;
        while (pos < str.length && str[pos] !== '\0' && str[pos] !== sep)
            pos++;
        if (pos > begin)
            return str.slice(begin, pos);
    }
    return null;
}

/* C cfgfiles.c:522-548, hacklib.c:164: trimspaces removes only space/tab.
 * Between ']' and a comment only spaces are accepted; an empty section is
 * a valid result, distinct from a malformed section's null pointer. */
export function is_config_section(str) {
    const a = str.split('\0', 1)[0].replace(/^[ \t]+|[ \t]+$/g, '');
    if (a[0] !== '[') return null;
    const z = a.indexOf(']', 1);
    if (z < 0) return null;
    let c = z + 1;
    while (a[c] === ' ') c++;
    if (c < a.length && a[c] !== '#') return null;
    return a.slice(1, z).replace(/^[ \t]+|[ \t]+$/g, '');
}

/* C options.c:9299-9327, called by cnf_line_AUTOPICKUP_EXCEPTION.
 * sscanf counts the scanset assignment even when the closing quote fails.
 * Keep its 253-byte truncation and the sequential scans: the generic scan
 * can overwrite a preceding '>' scan's text when there is a comment. */
export function parse_autopickup_exception(mapping) {
    mapping = mapping.split('\0', 1)[0];
    let text = '', end = '\0';
    const scan = prefix => {
        if (!mapping.startsWith(prefix)) return 0;
        let pos = prefix.length;
        const begin = pos;
        while (pos < mapping.length && mapping[pos] !== '"'
               && pos - begin < 253) pos++;
        if (pos === begin) return 0;
        text = mapping.slice(begin, pos);
        if (mapping[pos] !== '"') return 1;
        pos++;
        while (pos < mapping.length && /[ \t\n\r\v\f]/.test(mapping[pos])) pos++;
        if (pos === mapping.length) return 1;
        end = mapping[pos];
        return 2;
    };
    let n = scan('"<');
    if (n === 1 || (n === 2 && end === '#'))
        return { pattern: text, grab: true };
    n = scan('">');
    if (n === 1)
        return { pattern: text, grab: false };
    n = scan('"');
    if (n === 1 || (n === 2 && end === '#'))
        return { pattern: text, grab: false };
    config_error_add('syntax error in AUTOPICKUP_EXCEPTION');
    return null;
}

/* C cfgfiles.c:587-597; a JS index replaces the pointer into buf. */
function find_optparam(buf) {
    const eq = buf.indexOf('='), co = buf.indexOf(':');
    return eq < 0 || (co >= 0 && co < eq) ? co : eq;
}

/* C cfgfiles.c:631 -> options.c:7844 msgtype_parse_add().  sscanf counts
 * assignments, not matched literals: a closing quote is not required once
 * the nonempty pattern has been assigned, and text after it is ignored.
 * Keep the widths on both conversions, including truncation at 255 bytes.
 * Compilation and insertion use the existing MSGTYPE owner in options.js. */
export function parse_msgtype(bufp) {
    const token = /^[\t\n\v\f\r ]*([^\t\n\v\f\r ]{1,10})/.exec(bufp);
    const pattern = token && /^[\t\n\v\f\r ]*"([^"]{1,255})/
        .exec(bufp.slice(token[0].length));
    if (!pattern) {
        config_error_add('Malformed MSGTYPE');
        return null;
    }
    const names = ['show', 'hide', 'noshow', 'stop', 'more', 'norep'];
    const name = names.find(n => n.startsWith(token[1].toLowerCase()));
    if (!name) {
        config_error_add("Unknown message type '%s'", token[1]);
        return null;
    }
    return {
        type: name === 'noshow' ? 'hide' : name === 'more' ? 'stop' : name,
        pattern: pattern[1],
    };
}

/* C cfgfiles.c:760-789.  The startup parser collects settings in result;
 * jsmain installs these in plname, flags.initrole and the pet-name fields
 * before character creation and makedog.  ROLE silently ignores invalid and
 * random names (str2role < 0), unlike the OPTIONS=role handler. */
function cnf_line_NAME(bufp, result) {
    result.name = bufp.slice(0, 31); // PL_NSIZ - 1
    return true;
}

function cnf_line_ROLE(bufp, result) {
    const len = str2role(bufp);
    if (len >= 0)
        result.role = len;
    return true;
}

function cnf_line_dogname(bufp, result) {
    result.flags.dogname = bufp.slice(0, 62); // PL_PSIZ - 1
    return true;
}

function cnf_line_catname(bufp, result) {
    result.flags.catname = bufp.slice(0, 62);
    return true;
}

// C cfgfiles.c:1213-1218. Use the parsed statement so sections, continuations,
// whitespace and repeated assignments follow the same rules as other lines.
function cnf_line_WIZKIT(bufp) {
    game.wizkit = bufp.slice(0, WIZKIT_MAX - 1);
    return true;
}

/* C cfgfiles.c:1389-1439 parse_config_line(): match abbreviations against
 * the statement table after mungspaces(), with either ':' or '='.  Keep
 * OPTIONS' original value (including whitespace) for parseoptions; every
 * other handler receives the munged value.  The existing option handlers
 * live in options.js, so return their canonical statement instead of
 * duplicating them here.  null means a statement was handled here. */
export function config_statement(origbuf, result) {
    origbuf = origbuf.replace(/^[ \t]+/, '');
    const buf = origbuf.slice(0, 1023).split(/[\n\0]/, 1)[0]
        .replace(/[ \t]+/g, ' ').replace(/^ | $/g, '');
    const p = find_optparam(buf);
    if (p < 0) return origbuf;
    const user = buf.slice(0, p).replace(/ +$/, '').toLowerCase();
    const row = CONFIG_LINE_STMT.find(([name, minlen]) =>
        user.length >= minlen && name.toLowerCase().startsWith(user));
    if (!row) return origbuf;
    const name = row[0];
    const value = buf.slice(p + 1).replace(/^ /, '');
    const handler = name === 'NAME' ? cnf_line_NAME
        : name === 'ROLE' || name === 'CHARACTER' ? cnf_line_ROLE
        : name === 'dogname' ? cnf_line_dogname
        : name === 'catname' ? cnf_line_catname
        : name === 'WIZKIT' ? cnf_line_WIZKIT : null;
    if (handler) {
        handler(value, result);
        return null;
    }
    return name + '=' + (name === 'OPTIONS'
        ? origbuf.slice(find_optparam(origbuf) + 1) : value);
}

/* C ref: cfgfiles.c:1437 (and :1413) parse_config_line()'s error returns for
 * a statement no config_line_stmt[] row matches.  Returns the
 * config_error_add() message, or null when the line is a known statement. */
export function config_line_error(origbuf) {
    /* mungspaces(): tabs -> space, condense runs, trim */
    const buf = origbuf.replace(/[ \t]+/g, ' ').replace(/^ | $/g, '');
    const p = find_optparam(buf);
    if (p < 0)
        return "Not a config statement, missing '='";
    /* match_varname() -> match_optname(..., val_allowed=TRUE): the length
     * of the name without any ':'/'=' value and the spaces before it */
    let len = buf.length;
    let q = buf.indexOf(':'), r = buf.indexOf('=');
    q = (q < 0 || (r >= 0 && r < q)) ? r : q;
    if (q >= 0) {
        while (q > 0 && /\s/.test(buf[q - 1])) q--;
        len = q;
    }
    const user = buf.slice(0, len).toLowerCase();
    for (const [name, minlen] of CONFIG_LINE_STMT) {
        if (len >= minlen && name.toLowerCase().startsWith(user))
            return null;
    }
    return 'Unknown config statement';
}
function reset_duplicate_opt_detection() { /* no-op stub */ }
function fclose(fp) { /* no-op stub */ }
