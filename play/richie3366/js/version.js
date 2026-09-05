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
