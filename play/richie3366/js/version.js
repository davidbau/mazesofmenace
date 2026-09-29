// version.js — Build version info
//
// C ref: util/mdlib.c mdlib_version_string / version_id_string plus
// src/version.c version_string / getversionstring, as populated by
// src/date.c populate_nomakedefs. Contest build: __APPLE__ so
// PORT_ID "MacOS" (global.h), no PORT_SUB_ID, NH_STATUS_RELEASED
// (patchlevel.h) so no Beta/WIP/post-release suffix, and the
// deterministic-runtime patch pins the build date to
// "May  2 2026 12:00:00" (double space, 20 chars like
// __DATE__ " " __TIME__). RUNTIME_PORT_ID is not defined, and the
// NETHACK_GIT_* strings are unset, so the live getversionstring
// result is version_id with its trailing dot restored.
//
// Generated-data imports for make_version only: all three are import-free
// leaf modules (no TDZ/cycle risk — the D-1881 edge ban is version.js →
// date.js/const.js, still absent; generated/ is outside imports.mjs's
// index, verified by reading the modules).
import { NUMMONS } from './generated/monsters_data.js';
import { NUM_OBJECTS } from './generated/objects_data.js';
import { artilistRaw } from './generated/artifacts_data.js';
export const VERSION = '0.1.0';
export const BUILD_DATE = '2026-04-18';
export const COMMIT = 'contest-skeleton';
export const COMMIT_NUMBER = '0';
export const TELEPORT_BUILD_DATE = '2026-04-18';

// C ref: patchlevel.h VERSION_MAJOR / VERSION_MINOR / PATCHLEVEL.
const VERSION_MAJOR = 5;
const VERSION_MINOR = 0;
const PATCHLEVEL = 0;
// C ref: patchlevel.h EDITLEVEL `:20` (0 — bones/save compat epoch).
const EDITLEVEL = 0;

// C ref: global.h PORT_ID under __APPLE__ ("MacOS"). No PORT_SUB_ID
// on this port (only MSDOS defines one).
const PORT_ID = 'MacOS';

// C ref: 001-deterministic-runtime.patch — pinned "May  2 2026 12:00:00"
// unless NETHACK_REAL_BUILD_DATE (no env in this runtime, Rule #2).
// Exported for js/date.js populate_nomakedefs (same C tmpbuf1).
export const PINNED_BUILD_DATE = 'May  2 2026 12:00:00';

// C ref: date.c nomakedefs.git_sha / git_branch / git_prefix —
// unset in the contest recorder (no " (...)" suffix on screen).
const GIT_SHA = null;
const GIT_BRANCH = null;
const GIT_PREFIX = null;

/**
 * C ref: mdlib.c mdlib_version_string — "%d.%d.%d" from
 * VERSION_MAJOR / VERSION_MINOR / PATCHLEVEL. The EDITLEVEL
 * "-editlevel" suffix applies only when NH_DEVEL_STATUS is not
 * NH_STATUS_RELEASED (it is RELEASED here), so the result is "5.0.0".
 * @param {string} delim C separator (always "." at runtime)
 * @returns {string}
 */
export function mdlib_version_string(delim = '.') {
    return [VERSION_MAJOR, VERSION_MINOR, PATCHLEVEL].join(delim);
}

/**
 * C ref: mdlib.c version_id_string `:316–344` —
 * "%s NetHack%s Version %s%s - last %s %s." from PORT_ID, subbuf
 * ("" — no PORT_SUB_ID), mdlib_version_string, statusbuf (""
 * — NH_STATUS_RELEASED), "build" (!date_via_env) and build_date.
 * @param {string} [build_date] pinned contest build date
 * @returns {string}
 */
export function version_id_string(build_date = PINNED_BUILD_DATE) {
    const subbuf = '';
    const statusbuf = '';
    return `${PORT_ID} NetHack${subbuf} Version ` +
        `${mdlib_version_string('.')}${statusbuf} - last build ${build_date}.`;
}

// C ref: date.c populate_nomakedefs — nomakedefs.version_string is
// mdlib_version_string and version_id is version_id_string of the
// pinned build date.
const NOMAKEDEFS_VERSION_STRING = mdlib_version_string('.');
const NOMAKEDEFS_VERSION_ID = version_id_string(PINNED_BUILD_DATE);

/**
 * C ref: version.c version_string — nomakedefs.version_string when set,
 * else mdlib_version_string (kept for the paniclog-after-release path).
 * @returns {string}
 */
export function version_string() {
    return (NOMAKEDEFS_VERSION_STRING && NOMAKEDEFS_VERSION_STRING[0])
        ? NOMAKEDEFS_VERSION_STRING
        : mdlib_version_string('.');
}

// C ref: global.h:389 BUFSZ. File-local: no version.js → const.js edge
// (D-1881 — const.js:21 reads COMMIT_NUMBER at load).
const VERSION_BUFSZ = 256;

/* C ref: hack.h `:1504–1506` FEATURE_NOTICE_VER(major, minor, patch) —
 * (major << 24) | (minor << 16) | (patch << 8). `>>> 0` keeps the C
 * unsigned-long value (cf cfgfiles.js FEATURE_NOTICE_VER_3_7_0). */
function feature_notice_ver(major, minor, patch) {
    return (((major << 24) | (minor << 16) | (patch << 8)) >>> 0);
}

/* C atoi as version.c uses it on the notice segments: leading blanks,
 * optional sign, digit run; nothing parsable is 0. */
function notice_atoi(s) {
    const m = /^\s*[+-]?\d+/.exec(String(s ?? ''));
    return m ? parseInt(m[0], 10) : 0;
}

/**
 * C ref: version.c get_feature_notice_ver `:431–460` — parse
 * "maj.min.patch" (digits and two dots only; the walk breaks right after
 * the second dot, so the patch tail is unchecked like C) into the
 * FEATURE_NOTICE_VER packing, else 0L. The input copy (`strcpy(buf)`)
 * is the owned segments below (GC, no caller mutation).
 * Sole C caller is options.c feature_alert_opts (`:7562`).
 * @param {string} str version text (C char *, NULL → 0)
 * @returns {number} packed version, 0 when unparseable
 */
export function get_feature_notice_ver(str) {
    if (str == null) return 0; // C `:437–438`
    const buf = String(str); // C `:439 strcpy(buf, str)`
    const istr = [];
    let j = 0, k = 0;
    istr[j] = 0; // C `:440 istr[j] = str`
    while (k < buf.length) { // C `:441 while (*str)`
        const ch = buf[k];
        if (ch === '.') { // C `:442–443`
            // C `:444 *str++ = '\0'` — segment ends at k.
            istr[j] = buf.slice(istr[j], k);
            j++;
            k++;
            istr[j] = k; // C `:445 istr[j] = str`
            if (j === 2) break; // C `:446–447`
        } else if (ch >= '0' && ch <= '9') { // C `:448 strchr("0123456789")`
            k++; // C `:449 str++`
        } else {
            return 0; // C `:450–451`
        }
    }
    if (j !== 2) return 0; // C `:453–454`
    istr[2] = buf.slice(istr[2]); // patch tail after the second dot
    return feature_notice_ver( // C `:459`
        notice_atoi(istr[0]), notice_atoi(istr[1]), notice_atoi(istr[2]));
}

/**
 * C ref: version.c get_current_feature_ver `:464–467` —
 * FEATURE_NOTICE_VER(VERSION_MAJOR, VERSION_MINOR, PATCHLEVEL).
 * @returns {number} packed current version
 */
export function get_current_feature_ver() {
    return feature_notice_ver(VERSION_MAJOR, VERSION_MINOR, PATCHLEVEL); // C `:466`
}

/**
 * C ref: version.c getversionstring `:35–79`.
 * Copies `nomakedefs.version_id` into the caller buffer, then appends
 * " (port-id,git-sha,branch:…,prefix:…)" when any extra pointer is
 * non-NULL. A trailing "." is lifted off before that append and put
 * back after (`dotoff`). Each append is `Snprintf(eos(buf),
 * (bufsz - strlen(buf)) - 1, …)`: `vsnprintf` writes at most `size-1`
 * characters (`hacklib.c nh_snprintf`). `c++` in the separator is
 * evaluated before the write, including when the write does not fit.
 * A non-NULL empty string still counts (`const char *` is not a
 * JS falsy check).
 *
 * JS strings are immutable, so this returns the text C would leave in
 * `buf` and does not mutate the argument. `eos` is the hacklib.c:193
 * end index (embedded NUL stops); it is not imported — version.js →
 * hacklib.js → const.js → version.js would read `COMMIT_NUMBER` before
 * this module finishes (D-1881).
 *
 * The values are the post-`early_init` fields. `unixmain.c:66` runs
 * `early_init` → `runtime_info_init` → `populate_nomakedefs` before
 * `early_options`, so the date.c:25 static "1.0.0-0" initializer is
 * already gone at every call site. `NETHACK_GIT_*` are undefined, so
 * the three git pointers stay NULL (date.c:119–127).
 * @param {string} [_buf] C out-buffer; contents are overwritten
 * @param {number} [bufsz] `sizeof buf`, BUFSZ at every caller
 * @returns {string}
 */
export function getversionstring(_buf, bufsz) {
    // hacklib.c eos `:193–199` — index of the terminating NUL.
    function eosIndex(s) {
        const str = typeof s === 'string' ? s : String(s ?? '');
        let i = 0;
        while (i < str.length && str.charCodeAt(i) !== 0) i += 1;
        return i;
    }

    // Snprintf(eos(buf), (bufsz - strlen(buf)) - 1, "%s", text).
    // size_t subtraction wraps when strlen >= bufsz; vsnprintf then
    // still copies a short piece. size 0 or 1 writes no character.
    function snprintfAppend(cur, limit, text) {
        const len = eosIndex(cur);
        const head = cur.slice(0, len);
        let size;
        if (len >= limit) size = Number.MAX_SAFE_INTEGER;
        else size = (limit - len) - 1;
        if (size <= 0) return head;
        const maxChars = size - 1;
        if (maxChars <= 0) return head;
        const add = String(text);
        if (add.length > maxChars) return head + add.slice(0, maxChars);
        return head + add;
    }

    const limit = bufsz == null ? VERSION_BUFSZ : (bufsz >>> 0);
    // C `:37` Strcpy — no size check. Stop at an embedded NUL.
    const id = NOMAKEDEFS_VERSION_ID == null ? '' : String(NOMAKEDEFS_VERSION_ID);
    let out = id.slice(0, eosIndex(id));

    let c = 0; // C `:40`
    // patchlevel.h:25 / :33. git_branch is compiled only when this
    // is not NH_STATUS_RELEASED.
    const NH_STATUS_RELEASED = 0;
    const NH_DEVEL_STATUS = NH_STATUS_RELEASED;
    // Not defined. get_port_id is sys/windows/windsys.c:501.
    const RUNTIME_PORT_ID = false;

    let p = eosIndex(out); // C `:44`
    const dotoff = p > 0 && out.charCodeAt(p - 1) === 46; // C `:45` '.'
    if (dotoff) p -= 1; // C `:47–48`
    out = out.slice(0, p) + ' ('; // C `:49` Strcpy(p, " (")

    if (RUNTIME_PORT_ID) { // C `:50–55`
        const tmp = null; // get_port_id(tmpbuf) — not this build
        if (tmp != null) {
            const comma = c ? ',' : '';
            c += 1;
            out = snprintfAppend(out, limit, comma + tmp);
        }
    }
    if (GIT_SHA != null) { // C `:56–58` pointer, not emptiness
        const comma = c ? ',' : '';
        c += 1;
        out = snprintfAppend(out, limit, comma + GIT_SHA);
    }
    if (NH_DEVEL_STATUS !== NH_STATUS_RELEASED) { // C `:59–64`
        if (GIT_BRANCH != null) {
            const comma = c ? ',' : '';
            c += 1;
            out = snprintfAppend(out, limit, `${comma}branch:${GIT_BRANCH}`);
        }
    }
    if (GIT_PREFIX != null) { // C `:65–68`
        const comma = c ? ',' : '';
        c += 1;
        out = snprintfAppend(out, limit, `${comma}prefix:${GIT_PREFIX}`);
    }
    if (c) { // C `:69–71`
        out = snprintfAppend(out, limit, ')');
    } else {
        out = out.slice(0, p); // C `:73` *p = '\0' — drop " ("
    }
    if (dotoff) { // C `:74–76`
        out = snprintfAppend(out, limit, '.');
    }
    return out; // C `:78`
}

// ---------------------------------------------------------------------------
// C ref: mdlib.c build_options family `:90–104` + `:390–666`.
//
// Contest resolutions (macOS recorder, `-DNO_TIMED_DELAY`, OPTIONS_AT_RUNTIME):
// NH_DEVEL_STATUS == NH_STATUS_RELEASED (STATUS_ARG ""); WIN32 off
// (GUILaunched arms compiled out); MAKEDEFS_C undefined, FOR_RUNTIME defined
// (mdlib.c:51); USER_SOUNDS / VERSION_COMPATIBILITY undefined; windconf.h is
// WIN32-only (global.h:171–173) so NO_SIGNAL is undefined here.
// The rendered text is byte-checked against recorded C `#version` screens
// (live opttext + the doextversion filter == reference output) — see D-log.
// ---------------------------------------------------------------------------

// C ref: global.h COLNO (`:382`) = 80, the wrap width for opt_out_words.
// Local, not imported from const.js: const.js:21 reads this module's
// COMMIT_NUMBER at top level, so any version.js → const.js edge is a TDZ
// cycle for version-first entries (D-1881: no version.js → const.js /
// hacklib.js / date.js edge; generated-data leaves only).
const OPT_COLNO = 80;

// C ref: hacklib.c dm[] `:964–979` + datamodel `:981–997`. C home is
// hacklib.c (extern; also read at version.c:784), but it lives here as a
// file-local export — its sole JS consumer is build_options below, and
// importing hacklib.js would close the const.js TDZ cycle (see OPT_COLNO
// note). Move to js/hacklib.js if a second consumer ports.
// dm[0] is the live `{ sizeof(short/int/long/ll/ptr) }`; contest LP64
// sizes measured with gcc (cf. D-2530): 2,4,8,8,8 → row `I32LP64`.
const DATAMODEL_LIVE_SZ = [2, 4, 8, 8, 8];
const DATAMODEL_TABLE = [
    { sz: [2, 4, 4, 8, 4], name: 'ILP32LL64', platform: 'x86 32-bit' },
    { sz: [2, 4, 4, 8, 8], name: 'IL32LLP64', platform: 'Windows x64 64-bit' },
    { sz: [2, 4, 8, 8, 8], name: 'I32LP64', platform: 'Unix 64-bit' },
    { sz: [2, 8, 8, 8, 8], name: 'ILP64', platform: 'Unix ILP64' },
];

/**
 * C ref: hacklib.c datamodel `:981–997` — match the live type sizes
 * against every row (`:987–993`, all five must match); retidx 0 takes
 * the model name, nonzero the platform (`:994`); no match takes the
 * `Unknown` arm (`:996`).
 * @param {number} retidx 0 = model name, nonzero = platform
 * @returns {string}
 */
export function datamodel(retidx) {
    for (const row of DATAMODEL_TABLE) {
        let matchcount = 0;
        for (let j = 0; j < 5; j++) {
            if (DATAMODEL_LIVE_SZ[j] === row.sz[j]) matchcount++;
        }
        if (matchcount === 5) return retidx === 0 ? row.name : row.platform;
    }
    return 'Unknown';
}

/**
 * C ref: hacklib.c what_datamodel_is_this `:1000–1015` — match five
 * recorded sizes against every named dm row (`:1006` `i = 1` skips the
 * live row 0; DATAMODEL_TABLE above holds exactly C rows 1–4 with the
 * live sizes split out as DATAMODEL_LIVE_SZ, so the loop covers the
 * whole table); retidx 0 takes the model name, nonzero the platform
 * (`:1011`); no match takes the `Unknown` arm (`:1014`). Sole C-game
 * caller is version.c compare_critical_bytes `:786` (sfctool.c:313 is
 * the savefile tool, not the game).
 * @param {number} retidx 0 = model name, nonzero = platform
 * @returns {string}
 */
export function what_datamodel_is_this(retidx, szshort, szint, szlong, szll, szptr) {
    const want = [szshort | 0, szint | 0, szlong | 0, szll | 0, szptr | 0];
    for (let i = 0; i < DATAMODEL_TABLE.length; i++) {
        const row = DATAMODEL_TABLE[i].sz;
        if (want[0] === row[0] && want[1] === row[1] && want[2] === row[2]
            && want[3] === row[3] && want[4] === row[4]) {
            return retidx === 0 ? DATAMODEL_TABLE[i].name : DATAMODEL_TABLE[i].platform;
        }
    }
    return 'Unknown';
}

// C ref: mdlib.c `:95–104` — runtime option-text store. `optbuf` is the
// scratch line (`static char optbuf[COLBUFSZ]`, COLBUFSZ == BUFSZ == 256);
// `opttext`/`idxopttext` the capped line vector (`MAXOPT` 60).
let idxopttext = 0;
const MAXOPT = 60;
const opttext = [];
let optbuf = '';
const opt_indent = '    ';

// C ref: mdlib.c STOREOPTTEXT `:98–101` — store a copy while the vector
// has room (`dupstr`; over MAXOPT the line is dropped).
function storeOpttext(line) {
    if (idxopttext < MAXOPT) opttext[idxopttext++] = String(line);
}

// C ref: mdlib.c save_bones_compat_buf `:390`.
let save_bones_compat_buf = '';

/**
 * C ref: mdlib.c build_savebones_compat_string `:392–415` — the
 * VERSION_COMPATIBILITY block (`:395–411`) is compiled out (patchlevel.h:62
 * leaves it undefined), so the `:413–414` arm appends " 5.0.0 only".
 */
function build_savebones_compat_string() {
    save_bones_compat_buf = 'save and bones files accepted from version';
    save_bones_compat_buf += ` ${VERSION_MAJOR}.${VERSION_MINOR}.${PATCHLEVEL} only`;
}

// C ref: mdlib.c build_opts `:417–599`, contest-compiled entries in C order.
// Compiled-out entries (kept in C, absent here): AMIGA_WBENCH (`:418`),
// ANSI_DEFAULT (`:421`), TTY_TILES_ESCCODES (`:426`), LIFE (`:430`),
// ZLIB_COMP (`:436`), DLB data librarian (`:439`), EDIT_GETLIN (`:446`),
// DUMPLOG (`:449`, retired D-1776), HOLD_LOCKFILE_OPEN (`:452`),
// MONITOR_HEAP (`:480`), MSDOS (`:483`), OVERLAY family (`:489`),
// RANDOM arms (`:519`, USE_ISAAC64 takes the `:509` arm), SCORE_ON_BOTL
// (`:529`), NO_TERMS screen-control arms (`:535`), USE_XPM (`:573`),
// GRAPHIC_TOMBSTONE (`:576`), TIMED_DELAY (`:579`, off via contest
// `-DNO_TIMED_DELAY`, recorder Makefile + 006 patch), PREFIXES_IN_USE
// (`:582`), VISION_TABLES (`:585`).
// The `:597` savebones slot is live storage in C (pointer into
// save_bones_compat_buf, filled before the loop runs); `null` marks that
// slot and the loop reads the live variable, keeping C indices for the
// `:710–711` "," / "." punctuation.
const build_opts = [
    'color', // `:424` unconditional
    'data file compression', // `:434` COMPRESS (ZLIB_COMP off)
    'deferred handling of hangup signal', // `:455–459` HANGUPHANDLING (global.h) + SAFERHANGUP, NO_SIGNAL off
    'insurance files for recovering from crashes', // `:463` INSURANCE
    'live logging support', // `:466` LIVELOG
    'log file', // `:469` LOGFILE
    'extended log file', // `:472` XLOGFILE
    'errors and warnings log file', // `:475` PANICLOG
    'mail daemon', // `:478` MAIL
    'news file', // `:487` NEWS
    'internal pager used for viewing help files', // `:503` UNIX else-arm (DEF_PAGER and DLB off)
    'pattern matching via :PATMATCH:', // `:508` unconditional (token substituted by the caller, version.c rt_opts)
    'pseudo random numbers generated by ISAAC64', // `:510` USE_ISAAC64
    'strong PRNG seed from /dev/random', // `:513` DEV_RANDOM "/dev/random" (unixconf.h:427 MACOS arm)
    'restore saved games via menu', // `:527` SELECTSAVED
    'screen clipping', // `:533` CLIPPING
    'shell command', // `:553` SHELL
    'traditional status display', // `:555` unconditional
    'status via windowport with highlighting', // `:557` STATUS_HILITES
    'suspend command', // `:562` SUSPEND
    'terminal info library', // `:566` TTY_GRAPHICS + TERMINFO (TERMLIB `:568` arm is the compiled-out #else)
    'system configuration at run-time', // `:589` SYSCF
    'show stack trace on error', // `:592` PANICTRACE (via CRASHREPORT on MACOS, config.h:266)
    'launch browser to report issues', // `:595` CRASHREPORT (MACOS "/usr/bin/open", config.h:244)
    null, // `:597` save_bones_compat_buf — live slot, resolved in the loop
    'and basic NetHack features', // `:598` unconditional
];

// C ref: mdlib.c window_opts `:112–164`. Only the TTY_GRAPHICS entry is
// compiled (CURSES/X11/Qt/MSWIN/SHIM off; retired `#if 0` block `:146–162`
// compiled out); MSDOS off so the `:125` name arm applies. `valid` is
// set by count_and_validate_winopts, not here.
const window_opts = [
    { id: 'tty', name: 'traditional text with optional line-drawing', valid: false },
    { id: null, name: null, valid: false }, // `:163` fencepost
];

// C ref: mdlib.c soundlib_opts `:184–232` (`#if !defined(MAKEDEFS_C)`).
// No SND_LIB_* glue is compiled for the contest build, so only the
// `:185` nosound entry precedes the `:231` fencepost.
const soundlib_opts = [
    { id: 0, text_id: 'soundlib_nosound', url: '', valid: false },
    { id: 0, text_id: null, url: null, valid: false }, // `:231` fencepost
];

/**
 * C ref: mdlib.c count_and_validate_winopts `:601–623` — fencepost loop
 * (`:607`); the WIN32 validity block (`:609–617`) is compiled out.
 * Marks every compiled entry valid, returns the count (contest: 1).
 * @returns {number}
 */
function count_and_validate_winopts() {
    let cnt = 0;
    for (let i = 0; i < window_opts.length - 1; i++) {
        cnt++;
        window_opts[i].valid = true;
    }
    return cnt;
}

/**
 * C ref: mdlib.c count_and_validate_soundlibopts `:626–637` — marks every
 * entry up to the fencepost valid (`:632–634`), returns the count
 * (contest: 1, nosound only).
 * @returns {number}
 */
function count_and_validate_soundlibopts() {
    let cnt = 0;
    for (let i = 0; i < soundlib_opts.length - 1; i++) {
        cnt++;
        soundlib_opts[i].valid = true;
    }
    return cnt;
}

/**
 * C ref: mdlib.c opt_out_words `:640–666` — fold words into `optbuf`,
 * wrapping past COLNO-5 (75) via STOREOPTTEXT + indent (`:656–659`),
 * else space-separate (`:660–662`). The `#if 0` " (" arm (`:649–653`)
 * is compiled out. Words split exactly like C: each single space ends a
 * word (consecutive spaces yield an empty word that still appends its
 * separator), and a trailing space leaves `str` on the NUL so no phantom
 * word follows (`:664` advance + `:647` test).
 * @param {string} str input words (C mutates its buffer; JS takes a value)
 * @param {{ len: number }} lengthHolder in/out line length (`length_p`)
 */
function opt_out_words(str, lengthHolder) {
    const s = String(str);
    let pos = 0;
    while (pos < s.length) {
        const sp = s.indexOf(' ', pos);
        const word = sp < 0 ? s.slice(pos) : s.slice(pos, sp);
        if (lengthHolder.len + word.length > OPT_COLNO - 5) {
            storeOpttext(optbuf);
            optbuf = opt_indent;
            lengthHolder.len = opt_indent.length;
        } else {
            optbuf += ' ';
            lengthHolder.len++;
        }
        optbuf += word;
        lengthHolder.len += word.length;
        pos = sp < 0 ? s.length : sp + 1;
    }
}

// C ref: mdlib.c lua_info `:800–817` (`#if defined(MAKEDEFS_C) ||
// defined(FOR_RUNTIME)` — FOR_RUNTIME is defined at mdlib.c:51). The
// `:806–807` adjacent literals are one string; ":TAG:" substitutions
// (`:LUACOPYRIGHT:`) are deferred to the caller per the `:819–820` comment.
const LUA_INFO = [
    '',
    "NetHack 5.0.* uses the 'Lua' interpreter to process some data:",
    '',
    '    :LUACOPYRIGHT:',
    '',
    '    "Permission is hereby granted, free of charge, to any person obtaining',
    '     a copy of this software and associated documentation files (the ',
    '     "Software"), to deal in the Software without restriction including',
    '     without limitation the rights to use, copy, modify, merge, publish,',
    '     distribute, sublicense, and/or sell copies of the Software, and to ',
    '     permit persons to whom the Software is furnished to do so, subject to',
    '     the following conditions:',
    '     The above copyright notice and this permission notice shall be',
    '     included in all copies or substantial portions of the Software."',
];

/**
 * C ref: mdlib.c build_options `:668–830`, in C order. Contest `#if`
 * resolutions: `soundlibcnt` declared (`:674–675`, MAKEDEFS_C undefined);
 * the WIN32 `defwinsys` override (`:677–679`) compiled out, leaving
 * DEFAULT_WINDOW_SYS "tty" (config.h TTY arm); STATUS_ARG "" (`:683–691`,
 * RELEASED); the WIN32 console skip (`:702–709`) compiled out; the
 * soundlib section (`:750–793`, `!MAKEDEFS_C`) and the Lua section
 * (`:798–825`, FOR_RUNTIME) included; USER_SOUNDS (`:761–763`, `:786–792`)
 * compiled out. C `Sprintf(eos(...))` appends and `Strcpy/Strcat` scratch
 * (`buf`, `eos` at hacklib.c:192) fold into `+=` — JS strings are values,
 * so there is no end-pointer to return; `optbuf` overwrites (`Sprintf`
 * without `eos`) are plain assignments.
 */
export function build_options() {
    let i;
    let length;
    let winsyscnt;
    let cnt = 0;
    const defwinsys = 'tty';
    let soundlibcnt;
    const lenHolder = { len: 0 };

    build_savebones_compat_string(); // `:681`
    storeOpttext(optbuf); // `:682`
    optbuf = `${opt_indent}NetHack version ${VERSION_MAJOR}.${VERSION_MINOR}.${PATCHLEVEL}\n`; // `:692–693`
    storeOpttext(optbuf); // `:694`
    optbuf = 'Options compiled into this edition:'; // `:695`
    storeOpttext(optbuf); // `:696`
    optbuf = ''; // `:697`
    length = OPT_COLNO + 1; // `:698` force 1st item onto new line
    lenHolder.len = length;
    opt_out_words(`${datamodel(0)} data model,`, lenHolder); // `:699–700`
    for (i = 0; i < build_opts.length; i++) { // `:701` SIZE(build_opts)
        const entry = build_opts[i] === null ? save_bones_compat_buf : build_opts[i]; // `:597` live slot
        opt_out_words(entry + (i < build_opts.length - 1 ? ',' : '.'), lenHolder); // `:710–712`
    }
    storeOpttext(optbuf); // `:714`
    optbuf = ''; // `:715`
    winsyscnt = count_and_validate_winopts(); // `:716`
    storeOpttext(optbuf); // `:717`
    optbuf = `Supported windowing system${winsyscnt > 1 ? 's' : ''}:`; // `:718–719`
    storeOpttext(optbuf); // `:720`
    optbuf = ''; // `:721`
    lenHolder.len = OPT_COLNO + 1; // `:722`
    for (i = 0; i < window_opts.length - 1; i++) { // `:724` fencepost
        if (!window_opts[i].valid) continue; // `:725–726`
        let buf = `"${window_opts[i].id}"`; // `:727`
        if (window_opts[i].name !== window_opts[i].id) buf += ` (${window_opts[i].name})`; // `:728–729`
        // `:737–740` 1: "foo." / 2: "foo and bar," + default / 3+: Oxford list + default.
        buf += (winsyscnt === 1) ? '.'
            : (winsyscnt === 2 && cnt === 0) ? ' and'
            : (cnt === winsyscnt - 2) ? ', and'
            : ',';
        opt_out_words(buf, lenHolder); // `:741`
        cnt++; // `:742`
    }
    if (cnt > 1) { // `:744` loop ended with a comma; opt_out_words inserts the space
        opt_out_words(`with a default of "${defwinsys}".`, lenHolder); // `:746–747`
    }

    cnt = 0; // `:751`
    storeOpttext(optbuf); // `:752`
    optbuf = ''; // `:753`
    soundlibcnt = count_and_validate_soundlibopts(); // `:754`
    storeOpttext(optbuf); // `:755`
    optbuf = `Supported soundlib${soundlibcnt > 1 ? 's' : ''}:`; // `:756`
    storeOpttext(optbuf); // `:757`
    optbuf = ''; // `:758`
    lenHolder.len = OPT_COLNO + 1; // `:759`
    for (i = 0; i < soundlib_opts.length - 1; i++) { // `:764` fencepost
        if (!soundlib_opts[i].valid) continue; // `:767–768`
        let soundlib = soundlib_opts[i].text_id; // `:769`
        if (soundlib.startsWith('soundlib_')) soundlib = soundlib.slice(9); // `:770–771` strncmp 9
        let buf = `"${soundlib}"`; // `:772`
        // `:778–782` 1: "foo." / 2: "foo and bar." / 3+: Oxford list.
        buf += (soundlibcnt === 1 || cnt === soundlibcnt - 1)
            ? '.'
            : (soundlibcnt === 2 && cnt === 0) ? ' and'
            : (cnt === soundlibcnt - 2) ? ', and'
            : ',';
        opt_out_words(buf, lenHolder); // `:783`
        cnt++; // `:784`
    }

    storeOpttext(optbuf); // `:795`
    optbuf = ''; // `:796`
    for (i = 0; i < LUA_INFO.length; i++) { // `:821` ends at the C NULL
        storeOpttext(LUA_INFO[i]); // `:822`
    }
    storeOpttext(''); // `:828` end with a blank line
}

// C ref: mdlib.c done_runtime_opt_init_once `:95`.
let done_runtime_opt_init_once = false;

// C ref: mdlib.c runtime_info_init `:842` populate_nomakedefs(&version).
// version.js holds no static version.js→date.js edge (D-1881:
// const.js:21 reads COMMIT_NUMBER at top level); js/date.js registers
// the C-order call here at its evaluation. Unset in graphs that never
// import js/date.js — then populate stays the pre-port omission.
let populateNomakedefsHook = null;
export function __setPopulateNomakedefs(fn) {
    populateNomakedefsHook = fn;
}

// C ref: mdlib.c release_runtime_info `:871` free_nomakedefs(). Same
// late-binding as the populate hook above (D-1881: no static
// version.js→date.js edge); js/date.js registers the C-order call at its
// evaluation. Unset in graphs that never import js/date.js — then the
// free stays the pre-port omission.
let freeNomakedefsHook = null;
export function __setFreeNomakedefs(fn) {
    freeNomakedefsHook = fn;
}

// C ref: mdlib.c version `:103` — `static struct version_info` (global.h
// `:348–352` shape), filled by make_version (`:841`), read by
// populate_nomakedefs (`:842`, via the hook below). Module-local like C.
const version = { incarnation: 0, feature_set: 0, entity_count: 0 };

/**
 * C ref: mdlib.c make_version `:248–295` — whole body in C order. C is
 * staticfn in game builds (`:244–246`: static unless SFCTOOL), so this
 * stays module-local; sole game caller is runtime_info_init (`:841`,
 * wired below — makedefs/sfctool callers are build tools, never ported).
 * C `unsigned long` is 64-bit but every value here fits 32 bits, so the
 * `>>> 0` normalizations are exact, not truncations.
 */
function make_version() {
    // `:255–258` incarnation — (5<<24)|(0<<16)|(0<<8)|0 = 0x05000000.
    version.incarnation = (
        (VERSION_MAJOR << 24) | (VERSION_MINOR << 16)
        | (PATCHLEVEL << 8) | EDITLEVEL
    ) >>> 0;
    // `:266–281` feature_set — MAIL_STRUCTURES bit 6 (global.h:430,
    // unconditional) + color bit 17 ("always") + INSURANCE bit 18
    // (config.h:435); SCORE_ON_BOTL bit 19 off (config.h:627 commented out).
    version.feature_set = ((1 << 6) | (1 << 17) | (1 << 18)) >>> 0;
    // `:286–292` entity_count — count artifact_names[1..] (artilist.h:12
    // MDLIB_C view: [0] "" + 33 names + [34] NULL ⇒ 33; artilistRaw has
    // no NULL terminator so its length is the fence), then
    // (nart<<24)|(NUM_OBJECTS<<12)|NUMMONS in C shift order.
    let i;
    for (i = 1; i < artilistRaw.length && artilistRaw[i].name; i++) // `:286–287`
        continue;
    version.entity_count = (i - 1) >>> 0; // `:288`
    i = NUM_OBJECTS; // `:289`
    version.entity_count = ((version.entity_count << 12) | i) >>> 0; // `:290`
    i = NUMMONS; // `:291`
    version.entity_count = ((version.entity_count << 12) | i) >>> 0; // `:292`
    return; // `:294`
}

/**
 * C ref: mdlib.c runtime_info_init `:834–846` — one-shot init; `:841`
 * make_version fills the static version struct (above); `:842`
 * populate_nomakedefs(&version) runs via the hook above (wired here,
 * struct forwarded); `:844` build_options (wired here).
 */
export function runtime_info_init() {
    if (!done_runtime_opt_init_once) {
        done_runtime_opt_init_once = true;
        build_savebones_compat_string(); // `:839`
        make_version(); // `:841`
        if (populateNomakedefsHook) populateNomakedefsHook(version); // `:842`
        idxopttext = 0; // `:843`
        build_options(); // `:844`
    }
}

/**
 * C ref: mdlib.c do_runtime_info `:848–861` — serve opttext lines one at
 * a time through the context (`int *rtcontext` in C; a `{ i }` holder
 * here since JS has no out-params). C bounds the read at MAXOPT (`:856`)
 * and returns NULL when exhausted (`:851`/`860` → null here).
 * @param {{ i: number }} rtcontext in/out cursor, init 0
 * @returns {string | null}
 */
export function do_runtime_info(rtcontext) {
    let retval = null;
    if (!done_runtime_opt_init_once) runtime_info_init(); // `:853–854`
    if (idxopttext && rtcontext) { // `:855`
        if (rtcontext.i >= 0 && rtcontext.i < MAXOPT) { // `:856`
            retval = opttext[rtcontext.i]; // `:857`
            rtcontext.i += 1; // `:858`
        }
    }
    return retval;
}

/**
 * C ref: mdlib.c release_runtime_info `:863–872` — free every stored line
 * (`:866–869`, GC here) and reset the one-shot flag (`:870`); `:871`
 * free_nomakedefs runs via the hook above (live in js/date.js; unset in
 * graphs that never import it).
 */
export function release_runtime_info() {
    while (idxopttext > 0) {
        idxopttext--;
        opttext[idxopttext] = undefined;
    }
    done_runtime_opt_init_once = false;
    if (freeNomakedefsHook) freeNomakedefsHook(); // `:871`
}
