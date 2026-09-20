/**
 * C-home for `nethack-c/upstream/src/date.c` — build version-info
 * (`nomakedefs`) populated at startup.
 *
 * Rule #2: no `__DATE__`/`getenv`/filesystem plumbing lives here. The
 * contest patch (001-deterministic-runtime) pins the C `tmpbuf1` to the
 * fixed 20-char `"May  2 2026 12:00:00"`, so the port parses the same
 * pinned literal `PINNED_BUILD_DATE` from `js/version.js`.
 */

import { game } from './gstate.js';
import {
    PINNED_BUILD_DATE,
    mdlib_version_string,
    version_id_string,
    __setPopulateNomakedefs,
} from './version.js';
import { SFCTOOL_BIT } from './const.js';
import { NUMMONS } from './generated/monsters_data.js';
import { NUM_OBJECTS } from './generated/objects_data.js';
import { NROFARTIFACTS } from './generated/artifacts_data.js';

// C ref: date.c extract_field macro `:44–49` — copy `n` chars from `s[z..]`
// into the caller's buffer with a NUL terminator. JS returns the slice
// (ASCII input, so UTF-16 units match C bytes).
function extract_field(s, n, z) {
    return String(s).substr(z, n);
}

// C ref: hacklib.c case_insensitive_comp `:921–937` — ASCII-only lower
// (`isupper`/`tolower` in the C locale), `uchar` comparison, `u1 - u2`
// result (`:936`); NUL (`'\0'`) terminates the scan (`:933–934`).
function case_insensitive_comp(s1, s2) {
    const a = String(s1);
    const b = String(s2);
    for (let i = 0; ; i++) {
        let u1 = i < a.length ? a.charCodeAt(i) : 0;
        if (u1 >= 65 && u1 <= 90) u1 += 32;
        let u2 = i < b.length ? b.charCodeAt(i) : 0;
        if (u2 >= 65 && u2 <= 90) u2 += 32;
        if (u1 === 0 || u1 !== u2) return u1 - u2;
    }
}

// C ref: mdlib.c md_ignored_features `:235–242` — SCORE_ON_BOTL bit 19
// (config.h:627 leaves it undefined, so the bit is ignored rather than
// set) plus SFCTOOL_BIT (global.h:615, live import above).
function md_ignored_features() {
    return (1 << 19) | SFCTOOL_BIT;
}

// C ref: mdlib.c bannerc_string `:348–370` (C home mdlib.c; ported here as
// populate_nomakedefs' callee). C fills the caller's `outbuf`
// (Snprintf-capped at `bufsz`); JS returns the string, mirroring the live
// `version_id_string` adaptation in js/version.js. Contest resolutions:
// no PORT_SUB_ID (PC-only, global.h:199–209) so `subbuf` stays "";
// NH_STATUS_RELEASED (patchlevel.h:33) so no Beta/WIP suffix;
// `date_via_env` FALSE (mdlib.c:56, never set) so "built".
function bannerc_string(build_date) {
    const subbuf = '';
    return `         Version ${mdlib_version_string('.')} MacOS${subbuf}, ` +
        `built ${build_date}.`;
}

// C ref: date.c nomakedefs_populated `:23` — file-static in C,
// module-local here. Guards free_nomakedefs (date.c remainder, named
// omission — no JS reader yet).
let nomakedefs_populated = 0;

// C ref: mdlib.c make_version `:248–296` interim. The wired caller
// (runtime_info_init, mdlib.c:841–842) passes make_version's `version`
// struct; make_version itself is its own unported row, so until it lands
// the hook below supplies these pinned outputs: incarnation
// `(5<<24)|(0<<16)|(0<<8)|EDITLEVEL` (`:255–258`, EDITLEVEL 0 — same value
// js/files.js:849 pins); feature_set MAIL_STRUCTURES bit 6 (global.h,
// unconditional) + color bit 17 ("always") + INSURANCE bit 18, SCORE_ON_BOTL
// bit 19 off (`:266–281` — same value js/files.js:852 pins); entity_count
// `(nartifacts<<24)|(NUM_OBJECTS<<12)|NUMMONS` (`:286–292` — same formula
// js/files.js:858–859 computes from the same generated counts).
function interimVersionInfo() {
    return {
        incarnation: 0x05000000,
        feature_set: (1 << 6) | (1 << 17) | (1 << 18),
        entity_count: (((NROFARTIFACTS << 24) | (NUM_OBJECTS << 12) | NUMMONS) >>> 0),
    };
}

/**
 * C ref: date.c populate_nomakedefs `:52–131` — whole body in C order with
 * per-arm `:line` cites. `#if defined(__DATE__) && defined(__TIME__)` is
 * live in the contest build (the `:132–133` patched Snprintf is the
 * evidence); the `#else` (no date.c body at all) is compiled out.
 *
 * C `dupstr` (strdup) has no helper here: JS strings are immutable values,
 * so assignment already copies — noted per site, no clone.
 *
 * Global state per Constitution §3.3 lives on `game` (`game.nomakedefs`,
 * read by js/botl.js status_version): the C static-initializer dummies
 * (date.c:25–40, 1987 strings) are NOT copied — pre-populate readers keep
 * their existing fallbacks (version.js pinned strings, `?.` guards), so
 * populating changes no observed value (version_string "5.0.0" both ways,
 * git_branch null both ways).
 *
 * @param {{ incarnation: number, feature_set: number, entity_count: number }}
 *   version C `struct version_info *` (global.h:348–352), NONNULLARG1.
 */
export function populate_nomakedefs(version) {
    const mth = [ // `:56–58`
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    // `:59` struct tm t = {0} — every field zero until its extract arm.
    const t = { tm_year: 0, tm_mon: 0, tm_mday: 0, tm_hour: 0, tm_min: 0, tm_sec: 0 };

    // `:82` contest-patched (001-deterministic-runtime.patch:132–133):
    // `getenv("NETHACK_REAL_BUILD_DATE")` is unset in this runtime
    // (Rule #2: no env), so C uses the pinned 20-char literal — the same
    // `PINNED_BUILD_DATE` js/version.js centers version_id on.
    const tmpbuf1 = PINNED_BUILD_DATE;
    /* `"Feb 12 1996 23:59:01"
        01234567890123456789  */ // `:83–84` shape note — offsets below.

    // Gate-arm locals: C assigns nomakedefs.build_time/build_date inside
    // the `:85` gate and keeps the static dummies otherwise; JS keeps the
    // previous game values on the dead arm (the pin is always 20 chars).
    let build_time;
    let build_date;
    if (tmpbuf1.length === 20) { // `:85` (int) strlen(tmpbuf1) == 20
        let tmpbuf2 = extract_field(tmpbuf1, 4, 7); // `:86` year
        t.tm_year = parseInt(tmpbuf2, 10) - 1900; // `:87` atoi
        tmpbuf2 = extract_field(tmpbuf1, 3, 0); // `:88` mon
        for (let i = 0; i < mth.length; i++) // `:89` SIZE(mth)
            if (!case_insensitive_comp(tmpbuf2, mth[i])) { // `:90`
                t.tm_mon = i; // `:91`
                break; // `:92`
            }
        tmpbuf2 = extract_field(tmpbuf1, 2, 4); // `:94` mday
        let strp = tmpbuf2; // `:95`
        if (strp[0] === ' ') // `:96` *strp == ' '
            strp = strp.slice(1); // `:97` strp++
        t.tm_mday = parseInt(strp, 10); // `:98` atoi
        tmpbuf2 = extract_field(tmpbuf1, 2, 12); // `:99` hour
        t.tm_hour = parseInt(tmpbuf2, 10); // `:100` atoi
        tmpbuf2 = extract_field(tmpbuf1, 2, 15); // `:101` min
        t.tm_min = parseInt(tmpbuf2, 10); // `:102` atoi
        tmpbuf2 = extract_field(tmpbuf1, 2, 18); // `:103` sec
        t.tm_sec = parseInt(tmpbuf2, 10); // `:104` atoi
        // `:105–106` timeresult = mktime(&t). C mktime reads the build
        // machine's local zone; the contest pins SOURCE_DATE_EPOCH to
        // 1777723200 = "Sat May  2 12:00:00 2026 UTC" (001 patch), i.e. the
        // recorder runs UTC, where mktime == timegm. Date.UTC is that same
        // instant and is zone-independent (Rule #2: identical in Node/Chrome).
        build_time = Math.floor(Date.UTC(
            t.tm_year + 1900, t.tm_mon, t.tm_mday,
            t.tm_hour, t.tm_min, t.tm_sec) / 1000);
        build_date = tmpbuf1; // `:107` dupstr(tmpbuf1)
    }

    // `:110–118` — struct-cited assignments in global.h:357–370 order.
    // C `unsigned long` fields come back through `>>> 0` (same as the
    // js/files.js save-validation pins).
    const prev = game.nomakedefs ?? {};
    const resolved_build_date = build_date !== undefined ? build_date : prev.build_date;
    game.nomakedefs = {
        build_date: resolved_build_date, // `:107`
        copyright_banner_c: bannerc_string(resolved_build_date), // `:117–118` dupstr
        git_sha: null, // `:119–121` NETHACK_GIT_SHA undefined in contest — arm compiled out
        git_branch: null, // `:122–124` NETHACK_GIT_BRANCH undefined — arm compiled out
        git_prefix: null, // `:125–127` NETHACK_GIT_PREFIX undefined — arm compiled out
        version_string: mdlib_version_string('.'), // `:114` dupstr
        version_id: version_id_string(resolved_build_date), // `:115–116` dupstr
        version_number: (version.incarnation | 0) >>> 0, // `:110`
        version_features: (version.feature_set | 0) >>> 0, // `:111`
        ignored_features: md_ignored_features(), // `:112`
        version_sanity1: (version.entity_count | 0) >>> 0, // `:113`
        build_time: build_time !== undefined ? build_time : prev.build_time, // `:106`
    };

    nomakedefs_populated = 1; // `:129`
}

// C ref: mdlib.c runtime_info_init `:842` populate_nomakedefs(&version).
// version.js stays import-free (D-1881: const.js:21 reads COMMIT_NUMBER at
// top level, so no static version.js→date.js edge); it exposes the hook and
// this module registers the C-order call. The hook forwards an explicit
// version when make_version lands; until then the interim above applies.
__setPopulateNomakedefs((version) => populate_nomakedefs(version ?? interimVersionInfo()));
