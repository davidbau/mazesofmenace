// version.js — Build version info
//
// C ref: util/mdlib.c mdlib_version_string / version_id_string plus
// src/version.c version_string / getversionstring, as populated by
// src/date.c populate_nomakedefs. Contest build: __APPLE__ so
// PORT_ID "MacOS" (global.h), no PORT_SUB_ID, NH_STATUS_RELEASED
// (patchlevel.h) so no Beta/WIP/post-release suffix, and the
// deterministic-runtime patch pins the build date to
// "May  2 2026 12:00:00" (double space, 20 chars like
// __DATE__ " " __TIME__). No RUNTIME_PORT_ID / NETHACK_GIT_* strings,
// so getversionstring returns the version_id unchanged.
export const VERSION = '0.1.0';
export const BUILD_DATE = '2026-04-18';
export const COMMIT = 'contest-skeleton';
export const COMMIT_NUMBER = '0';
export const TELEPORT_BUILD_DATE = '2026-04-18';

// C ref: patchlevel.h VERSION_MAJOR / VERSION_MINOR / PATCHLEVEL.
const VERSION_MAJOR = 5;
const VERSION_MINOR = 0;
const PATCHLEVEL = 0;

// C ref: global.h PORT_ID under __APPLE__ ("MacOS"). No PORT_SUB_ID
// on this port (only MSDOS defines one).
const PORT_ID = 'MacOS';

// C ref: 001-deterministic-runtime.patch — pinned "May  2 2026 12:00:00"
// unless NETHACK_REAL_BUILD_DATE (no env in this runtime, Rule #2).
const PINNED_BUILD_DATE = 'May  2 2026 12:00:00';

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

/**
 * C ref: version.c getversionstring `:35–80` — copy of
 * nomakedefs.version_id plus " (port-id,git-sha,branch,prefix)" when
 * any extra text is present. RUNTIME_PORT_ID is not defined; the git
 * strings are unset, so nothing is appended and the " (" is stripped
 * back off. A trailing "." is lifted before the append and restored
 * after (dotoff), leaving the string unchanged here.
 * @returns {string}
 */
export function getversionstring() {
    let buf = NOMAKEDEFS_VERSION_ID;
    let c = 0;
    const dotoff = buf.endsWith('.');
    if (dotoff) buf = buf.slice(0, -1);
    buf += ' (';
    if (GIT_SHA) buf += `${c++ ? ',' : ''}${GIT_SHA}`;
    // C: git_branch only when NH_DEVEL_STATUS != NH_STATUS_RELEASED.
    if (GIT_PREFIX) buf += `${c++ ? ',' : ''}prefix:${GIT_PREFIX}`;
    if (c) {
        buf += ')';
    } else {
        // C: nothing added — strip the " (" back off.
        buf = buf.slice(0, -2);
    }
    if (dotoff) buf += '.';
    return buf;
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
// cycle for version-first entries (D-1881 keeps this module import-free).
const OPT_COLNO = 80;

// C ref: hacklib.c dm[] `:964–979` + datamodel `:981–997`. C home is
// hacklib.c (extern; also read at version.c:784), but it lives here as a
// file-local export — its sole JS consumer is build_options below, and
// importing hacklib.js would break this module's import-free invariant
// (see OPT_COLNO note). Move to js/hacklib.js if a second consumer ports.
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

/**
 * C ref: mdlib.c runtime_info_init `:834–846` — one-shot init; calls
 * build_options (`:844`, the row's C caller — wired here). `:841–842`
 * make_version/populate_nomakedefs fill the save-compat version struct
 * (no JS reader yet — named omission, future row).
 */
export function runtime_info_init() {
    if (!done_runtime_opt_init_once) {
        done_runtime_opt_init_once = true;
        build_savebones_compat_string(); // `:839`
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
 * free_nomakedefs is a named omission with populate_nomakedefs.
 */
export function release_runtime_info() {
    while (idxopttext > 0) {
        idxopttext--;
        opttext[idxopttext] = undefined;
    }
    done_runtime_opt_init_once = false;
}
