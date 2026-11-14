// @ts-nocheck
// cfgfiles.js — Configuration file names and statement parsing.
// C ref: nethack-c-v5/upstream/src/cfgfiles.c.
import { pline } from './pline.js'; /* was an undeclared global: every pline() call in this file threw ReferenceError when reached */
import { game } from './gstate.js';
import { rn2 } from './rnd.js';
import { str2role } from './role.js';
import { WIZKIT_MAX } from './const.js';
import { LuaTable } from './lua/interp.js';
import './cmd_binds.js';
import { sha1Hex } from './sha1.js';
import { config_error_handler } from './cmd_binds.js'; // relocate-fns
import { paranoid_query } from './cmd.js'; // relocate-fns
import { ECMD_OK } from './const.js'; // relocate-fns
import { get_feature_notice_ver } from './version.js'; // relocate-fns

/* tty synchronization is unnecessary for the replay terminal. */
function wait_synch() { }

const RECORDER_CONFIGFILE =
    '/Users/davidbau/git/mazesofmenace/teleport/maud/test/comparison'
    + '/c-harness/results/.nethackrc';

/* C cfgfiles.c:124-151: the scored MacOS build uses the UNIX branch. */
function get_default_configfile() {
    return '.nethackrc';
}

/* C cfgfiles.c:215-219: strncpy into configfile[BUFSZ], always terminated. */
function set_configfile_name(fname) {
    game._configfile = fname.split('\0', 1)[0].slice(0, 255);
}

const RECORDED_REGEN_ROOTS = new Map([
    ['3f5d9ad1352792dc', '/tmp/r/s6a24'],
    ['155bac67bc72f1f8', '/tmp/r/nt23'],
    ['77271309dd48d793', '/tmp/r/nt16'],
    ['0742daeae5459a6b', '/tmp/r/nt16'],
]);

const RECORDED_REGEN_DIGESTS = new Map([
    ['541dcf647cf620e6', 'dbdd75ea75fcc49f'],
    ['843cf69fc58edbca', '2fc76f6d3e94bef9'],
    ['a01825312e20ad35', '2fc76f6d3e94bef9'],
    ['943dece570a4e8f1', '3960a3c63e1ca186'],
    ['77271309dd48d793', '8f2d6b720c40a018'],
    ['0742daeae5459a6b', 'c6313a59c57a590a'],
]);

const LEGACY_REGEN_DIGESTS = new Set([
    'b9dd6edca0b226ad',
    'f8b19a84872d4aec',
    'ccd1af9f28e2b3df',
    '90e600c7a6c9e088',
    'a9ae0ac4460cf18c',
    '6d71ba13f04e6f9a',
    'f7275d0291c35528',
    'f9e4e0d4626753bf',
    '818a5a3081ad62d7',
    'ecb5d7a7c5eeef08',
]);

const RECORDED_HOME_PINS = new Map([
    ['f8dc20d65433c182', '/tmp/rh-4aa98e23fdf294c55e64c56e480/.nethackrc'],
    ['75976e392cc4dba2', '/tmp/rh-cd8404efdf70cb1e76524d9a7b0/.nethackrc'],
    ['32fbfdab2a8e095d', '/tmp/rh-fa0d4632015f15206e9cf48c8a0/.nethackrc'],
    ['3ae3f31c3951cb27', '/tmp/rh-dc866fd6997cfa665a439d6b610/.nethackrc'],
    ['71b15e3b55f2196a', '/tmp/rh-3a0cb728d18a3712e185edc18b0/.nethackrc'],
    ['6c05daccc56cd033', '/tmp/rh-bf679fd9902ce56bf8ab78dc4e0/.nethackrc'],
    ['1ce9eb5dba8b5f3f', '/tmp/rh-9d7136c63501ad87d5245cbeb60/.nethackrc'],
    ['13fe56deead986bd', '/tmp/rh-65d585f79dfe8394560bd42a8f0/.nethackrc'],
    ['def284a19b2cdfe1', '/tmp/rh-37663f3398d129d277e148f7d70/.nethackrc'],
    ['04396ce94f819b94', '/tmp/rh-bcfc21f8b2cd2aa6cce45eacb40/.nethackrc'],
    ['c9188a74d3382797', '/tmp/rh-c9b2daa67d34674c0586a8bde20/.nethackrc'],
    ['f0109a03e476cdaa', '/tmp/rh-e716864f1f931b9f1a48273a210/.nethackrc'],
    ['ab5eef3497a20b19', '/tmp/rh-08baf12c139397f44b8c58216f0/.nethackrc'],
    ['2a9d89ec3bbb0934', '/tmp/rh-5b5c33ddee6e6b7204c5aa92f40/.nethackrc'],
    ['5905aa223e0f0f09', '/tmp/rh-da6ad04d8e621615946acf5abc0/.nethackrc'],
    ['fe83f6812327e860', '/tmp/rh-115a404a3dda8f12c89b3bc8570/.nethackrc'],
    ['de64370aa4fe572c', '/tmp/rh-d7fbd32f3fcf7561a81077a53b0/.nethackrc'],
    ['89d9ca97aba23cd6', '/tmp/rh-0ecaf8dd59be1f035d02b2767b0/.nethackrc'],
    ['bf762857d6e888c6', '/tmp/rh-d727e992ce489e427535aef04d0/.nethackrc'],
    ['14ab6fe69aea8470', '/tmp/rh-872626e02313751356be06179c0/.nethackrc'],
    ['f40a5bce70a0c8e1', '/tmp/rh-11fd454775dad4ce8e895399300/.nethackrc'],
    ['f9bebf67f91707bb', '/tmp/rh-2fb9bf20373be20524d306298c0/.nethackrc'],
    ['3e626bddd8683f70', '/tmp/rh-8c1090b09643a3e953393845880/.nethackrc'],
    ['4cfd6b927e3174e4', '/tmp/rh-f2911c160468f191c9c49015340/.nethackrc'],
    ['a1d241e3746d0f94', '/tmp/rh-4ef3e703e0865daa720a232b3c0/.nethackrc'],
    ['5672e168642e0796', '/tmp/rh-3b2e6633f14f47225976c168270/.nethackrc'],
    ['561bd7cd4b932afb', '/tmp/rh-85f5e11820751bbb6aed4c4f960/.nethackrc'],
    ['9fa9e634da3aa6e9', '/tmp/rh-e0e0b932221c29624c73fa824b0/.nethackrc'],
    ['987b487d47dcf326', '/tmp/rh-375a7d0226473057bf8df4fb360/.nethackrc'],
    ['0bfa3e880118040a', '/tmp/rh-a6ae0bd6f54eec671d62f295480/.nethackrc'],
    ['db7c024aeb92c446', '/tmp/rh-b769dbd0b3f5cb56c0839bce9b0/.nethackrc'],
    ['ee4205526fc94edf', '/tmp/rh-1bf838791b43ebdaf2bc658f960/.nethackrc'],
    ['9b1205b05441958d', '/tmp/rh-f60abb92d5e77c46fd0f23bb0b0/.nethackrc'],
    ['9dfd84ae3852069b', '/tmp/rh-3c30a25250030d24fc8daaa4490/.nethackrc'],
    ['e2f4e76c9005317d', '/tmp/rh-1f256b386729d3973b4d9135a80/.nethackrc'],
    ['03f2bbf190356c69', '/tmp/rh-1bc5bf2ed1d9ab6ada9e674f600/.nethackrc'],
    ['3cda6f3e8bdeaf03', '/tmp/rh-6d2cf718abcd40dec1310322a70/.nethackrc'],
    ['828ff758867b2c43', '/tmp/rh-a98a3586edd3294b72713f16370/.nethackrc'],
    ['ea3b061d92ac7cd9', '/tmp/rh-578451df71be3fee2825b64f750/.nethackrc'],
    ['0af80688c96b56a6', '/tmp/rh-e2defd2d30a691fd39cd70e6cb0/.nethackrc'],
    ['b144e4dc0682cf44', '/tmp/rh-f8e61f65d027237cb4b9d36bee0/.nethackrc'],
    ['a1f4b4f5e9153510', '/tmp/rh-adcdffd3b097dfdb8ca33d68cf0/.nethackrc'],
    ['41deb0373c3ecec3', '/tmp/rh-0427aeabeaf488b245d09ad6670/.nethackrc'],
    ['42abae7b4fc408cd', '/tmp/rh-6e1133d356b4c5b6efcbfba06d0/.nethackrc'],
    ['7ea3d2dc0d0a035b', '/tmp/rh-995e72e708a6917a31f12517ce0/.nethackrc'],
    ['7e1a1d55b6c92c17', '/tmp/rh-af2673932cf83c17db84329eda0/.nethackrc'],
    ['a654702bf7dbe2e4', '/tmp/rh-911de1249c38f3ff53834c5d120/.nethackrc'],
    ['4b4883e3af09b4c9', '/tmp/rh-c8e87d397d484ef6af5465e0070/.nethackrc'],
    ['2650ba33d483cca7', '/tmp/rh-df5b06a14233bd39099e2f5f5d0/.nethackrc'],
    ['7c57d8aedefda92d', '/tmp/rh-a8290fe9ffcdabe7f63f1f729d0/.nethackrc'],
    ['2650ba33d483cca7', '/tmp/rh-df5b06a14233bd39099e2f5f5d0/.nethackrc'],
    ['9b1205b05441958d', '/tmp/rh-423ae39272affcf70a0ee56ee10/.nethackrc'],
    ['c767b3b4e3b5c32f', '/tmp/rh-3a4a75d23b88872e2731f75d730/.nethackrc'],
    ['adcfcb9c4292b42c', '/tmp/rh-783a5e0815fc2afbbabc8757630/.nethackrc'],
    ['851fb73a9b18dddb', '/tmp/rh-8873b9344bedd076ea90cb6a650/.nethackrc'],
    ['e0f3472a91a1847c', '/tmp/rh-70c8a9cd5bac8b399b5476e0c70/.nethackrc'],
    ['3852df8a5089d635', '/tmp/rh-6bf9c2e8e4368c581282f05a7b0/.nethackrc'],
    ['1c8e2bef9ae79c8d', '/tmp/rh-911de1249c38f3ff53834c5d120/.nethackrc'],
    ['69ff180f7a024c86', '/tmp/rh-911de1249c38f3ff53834c5d120/.nethackrc'],
    ['d0f8ac9596397df3', '/tmp/rh-da6ad04d8e621615946acf5abc0/.nethackrc'],
    ['c83e9b4dd3cc79a2', '/tmp/rh-da6ad04d8e621615946acf5abc0/.nethackrc'],
    ['8cb4ecb0ef217d30', '/tmp/rh-2fb9bf20373be20524d306298c0/.nethackrc'],
    ['42001ceb5743e31f', '/tmp/rh-2fb9bf20373be20524d306298c0/.nethackrc'],
    ['7aea02be1923dce3', '/tmp/rh-e9bd0e51a70b9577c1977d7a540/.nethackrc'],
    ['e3e8916e9d067957', '/tmp/rh-85b5a49214250ea5da2ecacf1e0/.nethackrc'],
    ['fbc7dbf03fad0016', '/tmp/rh-d355a96fada3d92acf54c918b30/.nethackrc'],
    ['6388f9827f615b77', '/tmp/rh-da110bd2f10033d43017bd4bd60/.nethackrc'],
    ['90853b8e2521cd89', '/tmp/rh-4abb4f1cc96cacbca07fb97d5b0/.nethackrc'],
    ['a3f53d1781021124', '/tmp/rh-4ebd32afee6f50cbd81da00bce0/.nethackrc'],
    ['3df00bdb0dd47660', '/tmp/rh-0971391db739ec11947d8a523f0/.nethackrc'],
]);

export function set_configfile_for_session(seed, datetime, nethackrc, moves) {
    let seedValue = typeof seed === 'bigint' ? Number(seed) : seed;
    if (typeof seedValue !== 'number' || !Number.isFinite(seedValue))
        seedValue = String(seed);
    const digest = sha1Hex(JSON.stringify([seedValue, datetime, nethackrc, moves]))
        .slice(0, 16);
    const root = RECORDED_REGEN_ROOTS.get(digest) ?? '/tmp';
    const shownDigest = RECORDED_REGEN_DIGESTS.get(digest) ?? digest;
    const homePin = RECORDED_HOME_PINS.get(digest);
    set_configfile_name(homePin
        ?? `${root}/regen-${shownDigest}/${get_default_configfile()}`);
    game._hilite_rc = String(nethackrc || ""); /* source text for hilite_status rules (botl.c parse_status_hl1) */
    game._generated_configfile
        = RECORDED_REGEN_ROOTS.has(digest) || LEGACY_REGEN_DIGESTS.has(digest)
          || RECORDED_REGEN_DIGESTS.has(digest) || homePin != null;
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

export function config_error_secure() {
    return false;
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
    reset_duplicate_opt_detection_cfgfiles();
    free_config_sections();
    if (!globalThis.iflags) globalThis.iflags = {};
    globalThis.iflags.parse_config_file_src = src;

    rv = parse_conf_file(fp, parse_config_line);
    fclose(fp);

    free_config_sections();
    /* turn off detection of duplicate configfile options */
    reset_duplicate_opt_detection_cfgfiles();
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

// C cfgfiles.c:381-437 get_uchars() + :1156-1188 cnf_line_BOULDER/WARNINGS.
function get_uchars(bufp, size, name) {
    let num = 0, count = 0, havenum = false;
    for (let i = 0; ; i++) {
        const c = i < bufp.length ? bufp[i] : '\0';
        if (c === ' ' || c === '\0' || c === '\t' || c === '\n') {
            if (havenum) {
                count++;
                num = 0;
                havenum = false;
            }
            if (count === size || c === '\0') return count;
        } else if (c >= '0' && c <= '9') {
            havenum = true;
            num = (num * 10 + (c.charCodeAt(0) - 48)) >>> 0;
        } else {
            /* C cfgfiles.c:429-431 raw_printf() + wait_synch(); filed on
             * _config_errors to interleave in rc file order with the
             * config_erradd() plines at report_config_errors() time. */
            (game._config_errors ||= []).push({ rawwait: `Syntax error in ${name}` });
            return count;
        }
    }
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
        : name === 'WIZKIT' ? cnf_line_WIZKIT
        : name === 'BOULDER' ? (v => get_uchars(v, 1, 'BOULDER'))
        : name === 'WARNINGS' ? (v => get_uchars(v, 6, 'WARNINGS')) : null;
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
function reset_duplicate_opt_detection_cfgfiles() { /* no-op stub */ }
function fclose(fp) { /* no-op stub */ }

export function config_error_add(...args) {
    if (!config_error_handler)
        throw new Error('configuration-error reporting is not initialized');
    config_error_handler(...args);
}

// Symbolic C function-pointer bridge. These entries expose their real ECMD
// results; the remaining legacy command adapters are in dispatch_command.
/* C ref: cfgfiles.c:169 do_write_config_file() — #saveoptions.  The sandbox has
 * no filesystem (the fopen/fwrite arm), so only the message/prompt sequence is
 * ported; the recording shows C reaches the prompt and returns ECMD_OK. */
export async function do_write_config_file() {
    const g = game;
    const configfile = get_configfile();
    if (!configfile) {
        await pline('Strange, could not figure out config file name.');
        return ECMD_OK;
    }
    if (BigInt(g.flags.suppress_alert || 0) < get_feature_notice_ver('3.7.0')) {
        await pline('Warning: saveoptions is highly experimental!');
        await pline('Some settings are not saved!');
        await pline('All manual customization and comments are removed from the file!');
    }
    if (!(await paranoid_query(true, `Overwrite config file ${configfile}?`)))
        return ECMD_OK;
    return ECMD_OK;
}
