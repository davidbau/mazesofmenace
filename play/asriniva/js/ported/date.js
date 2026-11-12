/* NetHack 5.0  date.c  $NHDT-Date: 1655402414 2022/06/16 18:00:14 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.3 $ */
/* Copyright (c) Michael Allison, 2021.                           */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from '../c-runtime/context.js';

/* these are in extern.h but we don't include hack.h */

/* nomakedefs_populated: flag for whether 'nomakedefs' should be freed */

export const nomakedefs_initial = {
    /* https://groups.google.com/forum/#!original/
       comp.sources.games/91SfKYg_xzI/dGnR3JnspFkJ */
    build_date: "Tue, 28-Jul-87 13:18:57 EDT",
    copyright_banner_c: "Version 1.0, built Jul 28 13:18:57 1987.",
    git_sha: null,   /* git_sha */
    git_branch: null,   /* git_branch */
    git_prefix: null,   /* git_prefix */
    version_string: "1.0.0-0",
    version_id: "NetHack Version 1.0.0-0 - last build Tue Jul 28 13:18:57 1987.",
    version_number: 0x01010000n,
    version_features: 0x00000000n,
    ignored_features: 0x00000000n,
    version_sanity1: 0x00000000n,
    build_time: 554476737n,
};

/* JavaScript translation of the prepared date.c, including its deterministic
 * build-date patch. The authoritative JS initializer above supplies every
 * original field; startup copies it into zero-only C ABI storage for current
 * C callers. Its populated flag is per-game C.dateState. The two original
 * functions perform all population/freeing logic below. C provides
 * the compiler's build-date/git strings and native formatting/version helpers.
 * extract_field is expanded inline, preserving its original loops and local i.
 * Local char arrays and zero-initialized tm use scoped C stack storage.
 * Unsigned long fields use BigInt. Optional git
 * macros test presence rather than truthiness, so defined empty strings count.
 * Both original function boundaries remain unchanged.
 */

export function populate_nomakedefs(version)
{
    const nomakedefs = C.nomakedefs;
    let i;
    let tmpbuf1 = C.stackAlloc(C.BUFSZ), tmpbuf2 = C.stackAlloc(C.BUFSZ), strp;
    const mth = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const t = C.zeroTm();
    let timeresult;

    /*
     * In a cross-compiled environment, you can't execute
     * the target binaries during the build, so we can't
     * use makedefs to write the values of the build
     * date and time to a file for retrieval. Not for
     * information meaningful to the target execution
     * environment.
     *
     * How can we capture the build date/time of the target
     * binaries in such a situation?  We need to rely on the
     * cross-compiler itself to do it for us during the
     * cross-compile.
     *
     * To that end, we are going to make use of the
     * following pre-defined preprocessor macros for this:
     *    gcc, msvc, clang   __DATE__  "Feb 12 1996"
     *    gcc, msvc, clang   __TIME__  "23:59:01"
     *
     */

    /* Deterministic build banner: pin the "build date" string to a
     * fixed value so the rendered version banner matches across
     * recordings made on different machines / different days. The
     * format must be 20 chars "Mon DD YYYY HH:MM:SS" — same shape as
     * __DATE__ " " __TIME__ — because the surrounding code parses
     * fixed offsets out of it (year at 7, mday at 4, hour at 12, …).
     * Set NETHACK_REAL_BUILD_DATE in env to opt out of pinning. */
    C.SnprintDate(tmpbuf1, C.BUFSZ,
             C.getenv("NETHACK_REAL_BUILD_DATE") ? C.BUILD_DATE_TIME : "May  2 2026 12:00:00");
    /* "Feb 12 1996 23:59:01"
        01234567890123456789  */
    if ((C.strlen(tmpbuf1) | 0) == 20) {
        do {
            for (i = 0; i < 4; ++i)
                C.HEAPU8[tmpbuf2 + i] = C.HEAP8[tmpbuf1 + i + 7];
            C.HEAPU8[tmpbuf2 + i] = 0;
        } while (0);   /* year */
        t.tm_year = C.atoi(tmpbuf2) - 1900;
        do {
            for (i = 0; i < 3; ++i)
                C.HEAPU8[tmpbuf2 + i] = C.HEAP8[tmpbuf1 + i + 0];
            C.HEAPU8[tmpbuf2 + i] = 0;
        } while (0);   /* mon */
        for (i = 0; i < mth.length; ++i)
            if (!C.case_insensitive_comp(tmpbuf2, mth[i])) {
                t.tm_mon = i;
                break;
            }
        do {
            for (i = 0; i < 2; ++i)
                C.HEAPU8[tmpbuf2 + i] = C.HEAP8[tmpbuf1 + i + 4];
            C.HEAPU8[tmpbuf2 + i] = 0;
        } while (0);   /* mday */
        strp = tmpbuf2;
        if (C.HEAP8[strp] == 32)
            strp++;
        t.tm_mday = C.atoi(strp);
        do {
            for (i = 0; i < 2; ++i)
                C.HEAPU8[tmpbuf2 + i] = C.HEAP8[tmpbuf1 + i + 12];
            C.HEAPU8[tmpbuf2 + i] = 0;
        } while (0);  /* hour */
        t.tm_hour = C.atoi(tmpbuf2);
        do {
            for (i = 0; i < 2; ++i)
                C.HEAPU8[tmpbuf2 + i] = C.HEAP8[tmpbuf1 + i + 15];
            C.HEAPU8[tmpbuf2 + i] = 0;
        } while (0);  /* min  */
        t.tm_min = C.atoi(tmpbuf2);
        do {
            for (i = 0; i < 2; ++i)
                C.HEAPU8[tmpbuf2 + i] = C.HEAP8[tmpbuf1 + i + 18];
            C.HEAPU8[tmpbuf2 + i] = 0;
        } while (0);  /* sec  */
        t.tm_sec = C.atoi(tmpbuf2);
        timeresult = C.mktime(t);
        nomakedefs.build_time = BigInt.asUintN(64, timeresult);
        nomakedefs.build_date = C.dupstr(tmpbuf1);
    }

    nomakedefs.version_number = version.incarnation;
    nomakedefs.version_features = version.feature_set;
    nomakedefs.ignored_features = C.md_ignored_features();
    nomakedefs.version_sanity1 = version.entity_count;
    nomakedefs.version_string = C.dupstr(C.mdlib_version_string(tmpbuf2, "."));
    nomakedefs.version_id = C.dupstr(
           C.version_id_string(tmpbuf2, C.BUFSZ, nomakedefs.build_date));
    nomakedefs.copyright_banner_c = C.dupstr(
              C.bannerc_string(tmpbuf2, C.BUFSZ, nomakedefs.build_date));
    if (C.NETHACK_GIT_SHA !== null) {
        nomakedefs.git_sha = C.dupstr(C.NETHACK_GIT_SHA);
    }
    if (C.NETHACK_GIT_BRANCH !== null) {
        nomakedefs.git_branch = C.dupstr(C.NETHACK_GIT_BRANCH);
    }
    if (C.NETHACK_GIT_PREFIX !== null) {
        nomakedefs.git_prefix = C.dupstr(C.NETHACK_GIT_PREFIX);
    }

    C.dateState.nomakedefs_populated = 1;
    return;
}

export function free_nomakedefs()
{
    const nomakedefs = C.nomakedefs;
    /* can't just free non-Null values because they're initialized at
       compile-time with static strings and won't have dynamic values
       unless populate_nomakedefs() has been called */
    if (!C.dateState.nomakedefs_populated)
        return;

    if (nomakedefs.build_date)
        C.free(nomakedefs.build_date),
            nomakedefs.build_date = 0;
    if (nomakedefs.version_string)
        C.free(nomakedefs.version_string),
            nomakedefs.version_string = 0;
    if (nomakedefs.version_id)
        C.free(nomakedefs.version_id),
            nomakedefs.version_id = 0;
    if (nomakedefs.copyright_banner_c)
        C.free(nomakedefs.copyright_banner_c),
            nomakedefs.copyright_banner_c = 0;
    if (C.NETHACK_GIT_SHA !== null) {
        if (nomakedefs.git_sha)
            C.free(nomakedefs.git_sha),
                nomakedefs.git_sha = 0;
    }
    if (C.NETHACK_GIT_BRANCH !== null) {
        if (nomakedefs.git_branch)
            C.free(nomakedefs.git_branch),
                nomakedefs.git_branch = 0;
    }
    if (C.NETHACK_GIT_PREFIX !== null) {
        if (nomakedefs.git_prefix)
            C.free(nomakedefs.git_prefix),
                nomakedefs.git_prefix = 0;
    }

    /* values are Null now; dynamic vs static doesn't really matter anymore */
    C.dateState.nomakedefs_populated = 0;
    return;
}

/* __DATE__ && __TIME__ */


/*date.c*/
