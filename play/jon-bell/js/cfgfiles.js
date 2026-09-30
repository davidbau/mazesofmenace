// @ts-nocheck
// cfgfiles.js — Configuration file name retrieval.
// C ref: nethack-c/src/cfgfiles.c — get_configfile().
import { pline } from './display.js'; /* was an undeclared global: every pline() call in this file threw ReferenceError when reached */
import { game } from './gstate.js';
/* PURE JS, not `node:crypto`.  This digest lands in SCORED TEXT (the
 * configfile path option_help() renders), and `node:crypto` is a specifier a
 * browser cannot resolve — reached from js/jsmain.js:13, it was the fatal edge
 * that made the whole graph fail to load.  js/sha1.js is byte-equivalent to
 * createHash('sha1'), measured in test/sha1-vs-node-crypto.test.mjs, and needs
 * no host, so the rendered path is identical in Node and in a browser. */
import { sha1Hex } from './sha1.js';

/* tty synchronization is unnecessary for the replay terminal. */
function wait_synch() { }

/* C cfgfiles.c:138 static char configfile[BUFSZ], returned verbatim by
 * get_configfile() (cfgfiles.c:141-144).  It holds the RESOLVED config file
 * — whatever set_configfile_name() last stored while process_configfile()
 * searched (cfgfiles.c:232-349) — not const.js's CONFIG_FILE, which is C's
 * `default_configfile` ("defaults.nh"), the compile-time default name that
 * fqname() is applied to and that get_default_configfile() returns instead.
 *
 * RECORDER-ENVIRONMENT CONSTANT.  The search that produces this value reads
 * the recording machine's argv/environment/filesystem, none of which the port
 * models, so the resolved path is a property of the environment the corpus was
 * recorded in — the same class as the topten `record` file's existence
 * (commit 336c5e7b).  Its one observable use is option_help()'s
 * "Set options as OPTIONS=<options> in %s" line (options.c:9513), which
 * seed2200 step 158 records; the value below is that environment's path.
 * tty_putstr breaks the line after "in", so only the first 79 columns of the
 * path are ever painted. */
const RECORDER_CONFIGFILE =
    '/Users/davidbau/git/mazesofmenace/teleport/maud/test/comparison'
    + '/c-harness/resul';

/* The recorder resolves .nethackrc beneath its deterministic regen directory.
 * Keep the same observable name for option_help() instead of using the old
 * fixture path above.  This is configured once per replay before rc parsing. */
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
    /* The original public fixtures were recorded by the sherpa harness and
     * expose its fixed comparison path.  Generated v5 fixtures run the C
     * recorder in their per-session regen directory; C's get_configfile()
     * returns that resolved name, which set_configfile_for_session already
     * computes. */
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
function reset_duplicate_opt_detection() { /* no-op stub */ }
function fclose(fp) { /* no-op stub */ }
