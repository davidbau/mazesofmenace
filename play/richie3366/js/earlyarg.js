/**
 * C-home for `nethack-c/upstream/src/earlyarg.c` — early command-line
 * argument handling (`-s` scores display path).
 *
 * Rule #2: no argv/process/filesystem plumbing lives here. The caller
 * passes the already-adjusted C (argc, argv) slice and the hackdir; only
 * in-process work runs.
 */

import { game } from './gstate.js';
import { prscore, nh_terminate_capture } from './topten.js';
import { BUFSZ } from './const.js';
import { match_optname } from './options.js';
import { dupstr } from './dungeon.js';
import { raw_printf, MAX_GLYPH, MAXPCHARS, MAXMCLASSES } from './display.js';
import { strncmpi, strstri } from './hacklib.js';
import { getversionstring } from './version.js';
import { monsterNames, NUMMONS, NON_PM, LOW_PM, SPECIAL_PM } from './generated/monsters_data.js';
import { objectNames, NUM_OBJECTS, LAST_GENERIC, FIRST_OBJECT, FIRST_REAL_GEM, LAST_REAL_GEM, MAXOCLASSES } from './generated/objects_data.js';
import { NROFARTIFACTS, artilistRaw } from './generated/artifacts_data.js';
import { ENUMDUMP_CMAP, ENUMDUMP_MON_SYMS, ENUMDUMP_MON_DEFCHARS, ENUMDUMP_OC_DEFCHARS, ENUMDUMP_OC_CLASSES, ENUMDUMP_OC_SYMS } from './generated/enumdumps_data.js';
import { MCASTU_SPELL_DEFS } from './mcastu.js';
import { MAXSPELL } from './spell.js';
// imports.mjs --can: earlyarg.js has no importers, so these edges cannot
// close a cycle. version.js stays a leaf (const.js reads it at load);
// early_version_info lives here so it can call raw_printf.

/**
 * C ref: earlyarg.c scores_only `:404–441` (ATTRNORETURN staticfn) — the
 * `-s` early-arg path: show score subsets, then terminate without
 * starting play. Whole body in C order with per-arm `:line` cites.
 *
 * C is synchronous; this is async only because the one live callee,
 * `prscore`, is async in JS (render surface). C's ATTRNORETURN is
 * unrepresentable without a process to exit: after the terminate tail
 * this returns to the caller.
 *
 * @param {number} argc C argc after the caller's `argc + 1` adjustment
 * @param {string[]} argv C argv after the caller's `argv - 1` adjustment
 *   (argv[1] holds `-scores` or its leading substring, as prscore expects)
 * @param {string} dir C hackdir (`*hackdir_p`); used only by the omitted
 *   chdir arm below
 * @returns {Promise<void>}
 */
export async function scores_only(argc, argv, dir) {
    /* C `:407–410` — config_error_done(): flush queued config-file errors
       now, in case an error summary is coming. Named omit: the JS
       config_error_add is a sink (js/botl.js:1149, drops everything), so
       no queue can exist and done() would be a structural no-op. */
    /* C `:412–416` — CHDIR chdirx(dir, FALSE) (nhUse(dir) without CHDIR;
       config.h:438 defines CHDIR, so chdirx is the live arm). Rule #2
       omit: no CWD/filesystem in scored JS. */
    /* C `:417–422` — SYSCF gate (config.h:233 live): wrap initoptions()
       in iflags.initoptions_noterminate (sysconf options affect whether
       panictrace is enabled). Named omit of the call: initoptions() is
       live (js/options.js) but startup-unwired (JS options resolve
       in-process at startup (VFS/storage)) — calling it here would
       re-run the config passes outside the boot order; the signal-trace
       enablement it gates is omitted below. */
    /* C `:423–427` — PANICTRACE ARGV0 save + panictrace_setsignals(TRUE)
       (live via CRASHREPORT on linux, config.h:244–276). Platform omit:
       no signal/stack-trace setup in scored JS. */
    /* C `:428–430` — UNIX whoami(): set up default plname[] from the OS
       user. Platform omit: no OS user in scored JS (cf. getuid()→0 in
       js/topten.js); the plname default is owned by the JS
       startup/askname path. */
    await prscore(argc, argv); // C `:431` — live export js/topten.js:1021

    /* C `:432–437` — MSWIN_GRAPHICS wait_synch: compiles out
       (config.h:61 leaves MSWIN_GRAPHICS undefined). */

    /* C `:439` — nh_terminate(EXIT_SUCCESS), bypassing opt_terminate():
       end.c:1676 program_state.in_moveloop = 0 (no return to play);
       l_nhcore_call(NHCORE_GAME_EXIT) has no JS port layer;
       freedynamicdata/dlb_cleanup are save-freeing (never in JS);
       exit() has no scored counterpart — the contest boundary is the
       live nh_terminate_capture() (same call as done2 js/end.js:1208 and
       the save-quit path js/save.js:1164), then return (C NOTREACHED). */
    if (!game.program_state) game.program_state = {};
    game.program_state.in_moveloop = 0;
    nh_terminate_capture();
}

/**
 * C ref: hack.h enum earlyarg `:433–447` on this build.
 * `NODUMPENUMS` is commented out (`config.h:360`), so `ARG_DUMPENUMS`
 * is present. `WIN32` is not defined (`config1.h` sets it only from
 * `_WIN32`), so `ARG_WINDOWS` is not in the enum. `CRASHREPORT` is
 * defined on `__linux__` (`config.h:249`), so `ARG_BIDSHOW` is present.
 */
export const ARG_DEBUG = 0;
export const ARG_VERSION = 1;
export const ARG_SHOWPATHS = 2;
export const ARG_DUMPENUMS = 3;
export const ARG_DUMPGLYPHIDS = 4;
export const ARG_DUMPMONGEN = 5;
export const ARG_DUMPWEIGHTS = 6;
export const ARG_BIDSHOW = 7;

/** C earlyarg.c earlyopts `:36–52` — the rows this build compiles in. */
const EARLYOPTS = [
    { e: ARG_DEBUG, name: 'debug', minlength: 5, valallowed: true },
    { e: ARG_VERSION, name: 'version', minlength: 4, valallowed: true },
    { e: ARG_SHOWPATHS, name: 'showpaths', minlength: 8, valallowed: false },
    { e: ARG_DUMPENUMS, name: 'dumpenums', minlength: 9, valallowed: false },
    { e: ARG_DUMPGLYPHIDS, name: 'dumpglyphids', minlength: 12, valallowed: false },
    { e: ARG_DUMPMONGEN, name: 'dumpmongen', minlength: 10, valallowed: false },
    { e: ARG_DUMPWEIGHTS, name: 'dumpweights', minlength: 11, valallowed: false },
    { e: ARG_BIDSHOW, name: 'bidshow', minlength: 7, valallowed: false },
];

/** C isspace in the C locale: space, tab, newline, CR, form feed, vertical tab. */
function isCSpace(ch) {
    return ch === ' ' || ch === '\t' || ch === '\n'
        || ch === '\r' || ch === '\f' || ch === '\v';
}

function stripCSpace(opts) {
    let i = 0;
    let end = opts.length;
    while (i < end && isCSpace(opts[i])) i++;
    while (end > i && isCSpace(opts[end - 1])) end--;
    return opts.slice(i, end);
}

/**
 * C ref: earlyarg.c debug_fields `:575–621` (staticfn). Commas are
 * processed right to left: each comma is a NUL and the tail is handled
 * first. `!` and a leading `no` (strncmpi, 2) toggle `negated`.
 * `test` and `ttystatus` store the toggled boolean. `fuzzer` sets
 * `iflags.fuzzerpending` and ignores negation (`:618–619`).
 * `TTY_GRAPHICS` is on (`config.h:56`). The `WIN32` `immediateflips`
 * arm is not this build.
 * @param {string} opts value after the `:` or `=`
 */
export function debug_fields(opts) {
    let s = opts == null ? '' : String(opts);
    // C `:581–585` — write NUL over the comma, recurse on the tail.
    let comma = s.indexOf(',');
    while (comma >= 0) {
        const tail = s.slice(comma + 1);
        s = s.slice(0, comma);
        debug_fields(tail);
        comma = s.indexOf(',');
    }
    if (s.length > ((BUFSZ / 2) | 0)) return; // C `:586–587`
    s = stripCSpace(s); // C `:591–595`
    if (!s) return; // C `:597–599`
    let negated = false;
    // C `:601–607` — '!' or strncmpi(opts, "no", 2).
    while (s.charCodeAt(0) === 0x21 || strncmpi(s, 'no', 2) === 0) {
        if (s.charCodeAt(0) === 0x21) s = s.slice(1);
        else s = s.slice(2);
        negated = !negated;
    }
    if (!game.iflags) game.iflags = {};
    if (!game.iflags.debug) game.iflags.debug = {};
    if (match_optname(s, 'test', 4, false)) { // C `:608–609`
        game.iflags.debug.test = !negated;
    }
    if (match_optname(s, 'ttystatus', 9, false)) { // C `:611–612`
        game.iflags.debug.ttystatus = !negated;
    }
    if (match_optname(s, 'fuzzer', 4, false)) { // C `:618–619`
        game.iflags.fuzzerpending = true;
    }
}

/**
 * C ref: version.c early_version_info `:280–312`. Lives here because
 * `version.js` is a load-time leaf (`const.js` reads `COMMIT_NUMBER`).
 * The opening `Snprintf(buf1, "test")` is overwritten by
 * `getversionstring`. `strstri` of `" ("` splits the paste buffer the
 * way `*tmp++ = '\\0'` does. `RUNTIME_PASTEBUF_SUPPORT` is Mac-only
 * (`unixconf.h:414`); this build prints the unavailable line.
 * @param {boolean} pastebuf
 */
export function early_version_info(pastebuf) {
    let buf = 'test'; // C `:285` Snprintf(buf1, "test")
    buf = getversionstring(buf, BUFSZ); // C `:287` overwrites that fill
    const tmp = strstri(buf, ' ('); // C `:288`
    if (tmp) {
        const prefix = buf.slice(0, buf.length - tmp.length);
        // C `:291–292` — NUL at the space, then print from '('.
        let joined = `${prefix}\n${tmp.slice(1)}`;
        if (joined.length > BUFSZ - 1) joined = joined.slice(0, BUFSZ - 1);
        buf = joined;
    }
    raw_printf('%s', buf); // C `:298`
    if (pastebuf) {
        raw_printf('%s', 'Paste buffer copy is not available.\n'); // C `:309`
    }
}

/**
 * C ref: earlyarg.c argcheck `:450–560`.
 * Returns 0 (no match), 1 (matched; caller skips this argument), or
 * 2 (matched; caller exits). Scans every `argv` slot, including a
 * program name at `[0]`. A non-matching `--` token sets `dashdash`
 * and a later single-dash match does not clear it (`:468–472`).
 * The value separator for `debug_fields` is the first `:` if any,
 * otherwise the first `=` (`:482–485`), which is not the same cut
 * `match_optname` uses.
 * @param {number} argc
 * @param {string[]} argv
 * @param {number} eArg `ARG_*`
 * @returns {number}
 */
export function argcheck(argc, argv, eArg) {
    const nargc = argc | 0;
    let idx = 0;
    for (; idx < EARLYOPTS.length; idx++) { // C `:457–461`
        if (EARLYOPTS[idx].e === (eArg | 0)) break;
    }
    if (idx >= EARLYOPTS.length || nargc < 1) return 0; // C `:462–463`

    let match = false;
    let userea = '';
    let dashdash = '';
    for (let i = 0; i < nargc; i++) { // C `:465–479`
        const arg = argv && argv[i];
        if (typeof arg !== 'string' || arg.charAt(0) !== '-') continue;
        if (arg.charAt(1) === '-') {
            userea = arg.slice(2);
            dashdash = '-';
        } else {
            userea = arg.slice(1);
        }
        const row = EARLYOPTS[idx];
        match = match_optname(userea, row.name, row.minlength, row.valallowed);
        if (match) break;
    }
    if (!match) return 0;

    // C `:482–485` — ':' wins over '=' even when '=' comes first.
    let extendedOpt = null;
    const colonAt = userea.indexOf(':');
    if (colonAt >= 0) extendedOpt = userea.slice(colonAt);
    else {
        const eqAt = userea.indexOf('=');
        if (eqAt >= 0) extendedOpt = userea.slice(eqAt);
    }

    switch (eArg | 0) {
    case ARG_DEBUG: // C `:487–495`
        if (extendedOpt != null) {
            const cpy = dupstr(extendedOpt);
            debug_fields(cpy.slice(1));
            // C free(cpy) — the copy is a JS string.
        }
        return 1;
    case ARG_VERSION: { // C `:496–524`
        let insertIntoPastebuf = false;
        if (extendedOpt != null) {
            const ext = extendedOpt.slice(1); // C `:500` extended_opt++
            if (match_optname(ext, 'paste', 5, false)) {
                insertIntoPastebuf = true; // deprecated alias of "copy"
            } else if (match_optname(ext, 'copy', 4, false)) {
                insertIntoPastebuf = true;
            } else if (match_optname(ext, 'dump', 4, false)) {
                // Named omission: version.c:494 dump_version_info
                // (runtime_info_init + raw_print of the feature words).
                return 2;
            } else if (!match_optname(ext, 'show', 4, false)) {
                raw_printf(
                    '-%sversion can only be extended with -%sversion:copy or :dump or :show.\n',
                    dashdash, dashdash,
                );
                return 2;
            }
        }
        early_version_info(insertIntoPastebuf); // C `:522`
        return 2;
    }
    case ARG_SHOWPATHS: // C `:525–526`
        return 2;
    case ARG_DUMPENUMS: // C `:528–530`
        dump_enums();
        return 2;
    case ARG_DUMPGLYPHIDS: // C `:532–534`
        // Named omission: earlyarg.c:806 dump_glyphids → dump_all_glyphids(stdout).
        return 2;
    case ARG_DUMPMONGEN: // C `:536–538`
        // Named omission: makemon.c:1835 dump_mongen.
        return 2;
    case ARG_DUMPWEIGHTS: // C `:538–540`
        // Named omission: hack.c:4421 dump_weights.
        return 2;
    case ARG_BIDSHOW: // C `:542–544` under CRASHREPORT
        // Named omission: report.c:189 crashreport_bidshow (hashes the binary).
        return 2;
    default:
        break;
    }
    return 0;
}

/**
 * C ref: earlyarg.c dump_enums `:706–801` static tables (`monsdump`,
 * `objdump`, `omdump`, the six `defsym.h` dumps, `arti_enum_dump`,
 * `mcastu_enum_dump`, `ed[]` + `edmp[]`) — JS-only assembly from the live
 * generated tables, so the dump can never drift from the game data.
 * Exported although C has no such function: the `--dumpenums` oracle
 * probe diffs all eleven tables byte-exact against the C binary.
 * Each row is `[val, nm]` ≡ `enum_dump {val, nm}` in C order, fenceposts
 * included; `prefix`/`unprefixed`/`comment` are the `edmp` columns.
 * @returns {{title: string, prefix: string, unprefixed: number, comment: boolean, rows: [number, string][]}[]}
 */
export function dump_enums_tables() {
    // C `:628–635` monsdump — `{ PM_bn, "bn" }` per MON (nm WITHOUT the
    // `PM_` prefix; the loop prints it) + the 5 unprefixed fenceposts.
    // HIGH_PM is permonst.h:22 (`NUMMONS - 1`).
    const mons = monsterNames.map((nm, i) => [i, nm.slice(3)]);
    mons.push(
        [NUMMONS, 'NUMMONS'], [NON_PM, 'NON_PM'], [LOW_PM, 'LOW_PM'],
        [NUMMONS - 1, 'HIGH_PM'], [SPECIAL_PM, 'SPECIAL_PM'],
    );
    // C `:636–640` objdump — `{ sn, "sn" }` full enum names + NUM_OBJECTS.
    const objs = objectNames.map((nm, i) => [i, nm]);
    objs.push([NUM_OBJECTS, 'NUM_OBJECTS']);
    // C `:724–740` omdump — local `dump_om` `{ val, "name" }` rows in C
    // order. MARKER anchors are objects.h (:107–111, :837, :875, :1295,
    // :1431, :1528–1591); gem counts are objclass.h:180–181.
    const firstAmulet = objectNames.indexOf('AMULET_OF_ESP');
    const lastAmulet = objectNames.indexOf('AMULET_OF_YENDOR');
    const firstSpell = objectNames.indexOf('SPE_DIG');
    const lastSpell = objectNames.indexOf('SPE_BLANK_PAPER');
    const firstGlass = objectNames.indexOf('WORTHLESS_WHITE_GLASS');
    const lastGlass = objectNames.indexOf('WORTHLESS_VIOLET_GLASS');
    const misc = [
        [LAST_GENERIC, 'LAST_GENERIC'],
        [FIRST_OBJECT - 1, 'OBJCLASS_HACK'],
        [FIRST_OBJECT, 'FIRST_OBJECT'],
        [firstAmulet, 'FIRST_AMULET'],
        [lastAmulet, 'LAST_AMULET'],
        [firstSpell, 'FIRST_SPELL'],
        [lastSpell, 'LAST_SPELL'],
        [MAXSPELL, 'MAXSPELL'],
        [FIRST_REAL_GEM, 'FIRST_REAL_GEM'],
        [LAST_REAL_GEM, 'LAST_REAL_GEM'],
        [firstGlass, 'FIRST_GLASS_GEM'],
        [lastGlass, 'LAST_GLASS_GEM'],
        [LAST_REAL_GEM - FIRST_REAL_GEM + 1, 'NUM_REAL_GEMS'],
        [lastGlass - firstGlass + 1, 'NUM_GLASS_GEMS'],
        [MAX_GLYPH, 'MAX_GLYPH'],
    ];
    // C `:681–686` arti_enum_dump — `{ ART_bn, "ART_bn" }` full names for
    // the NONARTIFACT zero entry + all 33 artifacts, then
    // AFTER_LAST_ARTIFACT (hack.h:102, `NROFARTIFACTS + 1` per :106).
    const arti = artilistRaw.map((raw, i) => [i, `ART_${raw.bn}`]);
    arti.push([NROFARTIFACTS + 1, 'AFTER_LAST_ARTIFACT']);
    // C `:689–697` mcastu_enum_dump — `{ MCAST_DUMPENUM_def, "def" }`
    // bare defs; index i ≡ the dump-enum value (sequential 0–19 like
    // MCASTU_ENUM).
    const mcast = MCASTU_SPELL_DEFS.map((def, i) => [i, def]);
    // C `:743–773` ed[] + edmp[] in `enum_dumps` order (titles, prefixes,
    // unprefixed counts, `dumpflgs` ≡ comment). The C trailing fenceposts
    // ride on the rows (SIZE ≡ rows.length).
    return [
        { title: 'monnums', prefix: 'PM_', unprefixed: 5, comment: false, rows: mons },
        { title: 'objects_nums', prefix: '', unprefixed: 1, comment: false, rows: objs },
        { title: 'misc_object_nums', prefix: '', unprefixed: 1, comment: false, rows: misc },
        { title: 'cmap_symbols', prefix: '', unprefixed: 1, comment: false, rows: [...ENUMDUMP_CMAP, [MAXPCHARS, 'MAXPCHARS']] },
        { title: 'mon_syms', prefix: '', unprefixed: 1, comment: false, rows: [...ENUMDUMP_MON_SYMS, [MAXMCLASSES, 'MAXMCLASSES']] },
        { title: 'mon_defchars', prefix: '', unprefixed: 1, comment: true, rows: ENUMDUMP_MON_DEFCHARS },
        { title: 'objclass_defchars', prefix: '', unprefixed: 1, comment: true, rows: ENUMDUMP_OC_DEFCHARS },
        { title: 'objclass_classes', prefix: '', unprefixed: 1, comment: false, rows: [...ENUMDUMP_OC_CLASSES, [MAXOCLASSES, 'MAXOCLASSES']] },
        { title: 'objclass_syms', prefix: '', unprefixed: 1, comment: false, rows: ENUMDUMP_OC_SYMS },
        { title: 'artifacts_nums', prefix: '', unprefixed: 1, comment: false, rows: arti },
        { title: 'mcast_spells', prefix: 'MCAST_', unprefixed: 0, comment: false, rows: mcast },
    ];
}

/**
 * C ref: earlyarg.c dump_enums `:706–801` (staticfn → file-local; sole
 * caller argcheck ARG_DUMPENUMS above). Whole body in C order.
 *
 * Each `    %s%*s = %3d,%s` row is pre-formatted (`padEnd` ≡ negative-width
 * left-justify, `padStart(3)` ≡ `%3d` — exact for these ASCII names) and
 * passed as `%s`: `vpline_expand` strips width/precision (D-2573 named
 * gap), so routing `%*s` through it would misalign the text
 * (`early_version_info` above precedes). The `raw_print` `:797–798`/`:800`
 * lines have no pre-window stdout channel in dual-runtime ESM
 * (`vraw_printf` `:577` sink-omit precedent): dropped — and named in the
 * D-log — while `raw_printf` call counts stay 1:1 with C.
 */
function dump_enums() {
    const tables = dump_enums_tables(); // C `:724–773` omdump/ed/edmp
    for (let i = 0; i < tables.length; i++) { // C `:777` NUM_ENUM_DUMPS
        const t = tables[i];
        raw_printf('%s', `enum ${t.title} = {`); // C `:778`
        const szd = t.rows.length; // C SIZE()
        for (let j = 0; j < szd; j++) { // C `:779`
            // C `:780–782` — the last unprefixed_count rows drop the prefix.
            const nmprefix = j >= szd - t.unprefixed ? '' : t.prefix;
            const nmwidth = 27 - nmprefix.length; // C `:783`
            const [val, nm] = t.rows[j];
            let comment = ''; // C `:784–791` dumpflgs char comment
            if (t.comment) {
                const ch = val >= 32 && val <= 126 ? String.fromCharCode(val) : ' ';
                comment = `    /* '${ch}' */`;
            }
            // C `:792–795` — `    %s%*s = %3d,%s`, negative width ≡ padEnd.
            raw_printf('%s', `    ${nmprefix}${nm.padEnd(nmwidth)} = ${String(val).padStart(3, ' ')},${comment}`);
        }
        // C `:797–798` raw_print("};")/"" — sink omit (see doc): no JS
        // channel, and raw_printf here would invent +2 early_raw_messages
        // counts per line that C raw_print never records.
    }
    // C `:800` final raw_print("") — same sink omit.
}
