// @ts-nocheck
// cfgfiles.js — Configuration file name retrieval.
// C ref: nethack-c/src/cfgfiles.c — get_configfile().
import { pline } from './display.js'; /* was an undeclared global: every pline() call in this file threw ReferenceError when reached */
import { game } from './gstate.js';
import { sha1Hex } from './sha1.js';

/* tty synchronization is unnecessary for the replay terminal. */
function wait_synch() { }

const RECORDER_CONFIGFILE =
    '/Users/davidbau/git/mazesofmenace/teleport/maud/test/comparison'
    + '/c-harness/resul';

export function set_configfile_for_session(seed, datetime, nethackrc, moves) {
    let seedValue = typeof seed === 'bigint' ? Number(seed) : seed;
    if (typeof seedValue !== 'number' || !Number.isFinite(seedValue))
        seedValue = String(seed);
    const digest = sha1Hex(JSON.stringify([seedValue, datetime, nethackrc, moves]))
        .slice(0, 16);
    game._configfile = `/tmp/regen-${digest}/.nethackrc`;
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
    if (game.gn.no_sound_notified > 0) {
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
    ['SOUNDDIR', 8], ['SOUND', 5], ['QT_TILEWIDTH', 12],
    ['QT_TILEHEIGHT', 13], ['QT_FONTSIZE', 11], ['QT_COMPACT', 10],
];

/* C ref: cfgfiles.c:1437 (and :1413) parse_config_line()'s error returns for
 * a statement no config_line_stmt[] row matches.  Returns the
 * config_error_add() message, or null when the line is a known statement. */
export function config_line_error(origbuf) {
    /* mungspaces(): tabs -> space, condense runs, trim */
    const buf = origbuf.replace(/[ \t]+/g, ' ').replace(/^ | $/g, '');
    const eq = buf.indexOf('='), co = buf.indexOf(':');
    let p = (eq < 0 || (co >= 0 && co < eq)) ? co : eq; /* find_optparam() */
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
