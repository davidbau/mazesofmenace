import { C } from '../c-runtime/context.js';

/* NetHack 5.0  mdlib.c  $NHDT-Date: 1701499945 2023/12/02 06:52:25 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.51 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Kenneth Lorber, Kensington, Maryland, 2015. */
/* Copyright (c) M. Stephenson, 1990, 1991.                       */
/* Copyright (c) Dean Luick, 1990.                                */
/* NetHack may be freely redistributed.  See license for details. */
/*
 * This can be linked into a binary to provide the functionality
 * via the contained functions, or it can be #included directly
 * into util/makedefs.c to provide it there.
 */
/* version information */
/* guarantee a return value */
/* AMIGA || AZTEC_C */
/* shorten up some lines */
/* REPRODUCIBLE_BUILD will change this to TRUE */
/* SFCTOOL */
/* these are in extern.h but we don't include hack.h */
/* XXX move to new file mdlib.h? */
/*date.c*/
/* 5.0: currently 40 lines get inserted into opttext[] */
/* windowtype value */
/* description, often same as id */
/* testing TILES_IN_GLYPHMAP here would bring confusion because it could
         apply to another interface such as X11, so check MSDOS explicitly
         instead; even checking TTY_TILES_ESCCODES would probably be
         confusing to most users (and it will already be listed separately
         in the compiled options section so users aware of it can find it) */
/* assume that one or more of IBMgraphics, DECgraphics
         can be enabled; we can't tell from here whether that is accurate */
/*TTY_GRAPHICS */
/* too vague; there are multiple incompatible versions */
/* win32 */
/* remainder have been retired */
/* unmaintained/defunct */
/* defunct OS 9 interface */
/* unmaintained/defunct */
/* defunct Atari interface */
/* unmaintained/defunct */
/* 0 => retired */
/*
 * soundlibs
 *
 * None of these are endorsements or recommendations of one library
 * or another, in any way. They are just preprocessor conditionals
 * in the event that glue code for such a library is ever added into
 * NetHack.
 */
/* proprietary, though a Free Indie License exists.
     * https://www.fmod.com/licensing#indie-note
     */
/* Uses Windows WIN32 API */
/* Uses AppKit NSSound */
/* still within #if MAKDEFS_C || FOR_RUNTIME */
/* _MSC_VER */
/* HAS_NO_MKSTEMP */
/* UNIX */
/* pattern matching method will be substituted by nethack at run time */
/* include which specific one */
/* DEV_RANDOM */
/* ISAAC64 */
/* ISAAC64 */
/* NO_TERMS */
/*TTY_GRAPHICS*/
/* input, but modified during processing */
/* in/out */
/*mdlib.c*/

/* Configured MDLIB_C tables are authoritative JavaScript data. The native
 * version and character buffers retain their C ABI addresses; mutable private
 * state belongs to one module. Empty C string pointers differ from NULL.
 * STOREOPTTEXT is expanded inline, and native formatting keeps C varargs. */
export const artifact_names = [
    "",
    "Excalibur",
    "Stormbringer",
    "Mjollnir",
    "Cleaver",
    "Grimtooth",
    "Orcrist",
    "Sting",
    "Magicbane",
    "Frost Brand",
    "Fire Brand",
    "Dragonbane",
    "Demonbane",
    "Werebane",
    "Grayswandir",
    "Giantslayer",
    "Ogresmasher",
    "Trollsbane",
    "Vorpal Blade",
    "Snickersnee",
    "Sunsword",
    "The Orb of Detection",
    "The Heart of Ahriman",
    "The Sceptre of Might",
    "The Staff of Aesculapius",
    "The Magic Mirror of Merlin",
    "The Eyes of the Overworld",
    "The Mitre of Holiness",
    "The Longbow of Diana",
    "The Master Key of Thievery",
    "The Tsurugi of Muramasa",
    "The Platinum Yendorian Express Card",
    "The Orb of Fate",
    "The Eye of the Aethiopica",
    0
];

export const opt_indent = "    ";

export const window_opts_initial = [
    {
        "id": "tty",
        "name": "traditional text with optional line-drawing",
        "valid": 1
    },
    {
        "id": 0,
        "name": 0,
        "valid": 0
    }
];

export const soundlib_opts_initial = [
    {
        "id": 0,
        "text_id": "soundlib_nosound",
        "Url": "",
        "valid": 0
    },
    {
        "id": 0,
        "text_id": 0,
        "Url": 0,
        "valid": 0
    }
];




export function md_ignored_features()
{
    return (0n
            | (1n << 19n) /* SCORE_ON_BOTL */
            | C.SFCTOOL_BIT /* stored by SFCTOOL, not NetHack itself */
            );
}

export function make_version()
{
    let i;

    /*
     * integer version number
     */
    C.version.incarnation = (BigInt(C.VERSION_MAJOR) << 24n)
                          | (BigInt(C.VERSION_MINOR) << 16n)
                          | (BigInt(C.PATCHLEVEL) << 8n)
                          | (BigInt(C.EDITLEVEL));
    /*
     * encoded feature list
     * Note:  if any of these magic numbers are changed or reassigned,
     * EDITLEVEL in patchlevel.h should be incremented at the same time.
     * The actual values have no special meaning, and the category
     * groupings are just for convenience.
     */
    C.version.feature_set = C.ulong(0n
/* levels and/or topology (0..4) */
/* monsters (5..9) */
//#ifdef MAIL_STRUCTURES
                                           | (1n << 6n)
//#endif
/* objects (10..14) */
/* flag bits and/or other global variables (15..26) */
 /* color support always*/                 | (1n << 17n)
//#ifdef INSURANCE
                                           | (1n << 18n)
//#endif
//#ifdef SCORE_ON_BOTL
//                                           | (1L << 19)
//#endif
                                               );
    /*
     * Value used for object & monster sanity check.
     *    (NROFARTIFACTS<<24) | (NUM_OBJECTS<<12) | (NUMMONS<<0)
     */
    for (i = 1; C.mdlibState.artifact_names[i]; i++)
        continue;
    C.version.entity_count = C.ulong(i - 1);
    i = C.NUM_OBJECTS;
    C.version.entity_count = (C.version.entity_count << 12n) | BigInt(i);
    i = C.NUMMONS;
    C.version.entity_count = (C.version.entity_count << 12n) | BigInt(i);
/* free bits in here */
    return;
}

export function mdlib_version_string(outbuf, delim)
{
    C.Sprintf(outbuf, "%d%s%d%s%d", C.VERSION_MAJOR, delim, C.VERSION_MINOR, delim,
            C.PATCHLEVEL);
//#if (NH_DEVEL_STATUS != NH_STATUS_RELEASED)
//    Sprintf(eos(outbuf), "-%d", EDITLEVEL);
//#endif
    return outbuf;
}

export function version_id_string(outbuf, bufsz, build_date)
{
    const subbuf = C.stackAlloc(64), versbuf = C.stackAlloc(64);
    const statusbuf = C.stackAlloc(64);

//#if (NH_DEVEL_STATUS != NH_STATUS_RELEASED)
//#if (NH_DEVEL_STATUS == NH_STATUS_BETA)
//    Strcpy(statusbuf, " Beta");
//#else
//#if (NH_DEVEL_STATUS == NH_STATUS_WIP)
//    Strcpy(statusbuf, " Work-in-progress");
//#else
//    Strcpy(statusbuf, " post-release");
//#endif
//#endif
//#else
    C.HEAP8[statusbuf] = 0;
//#endif
    C.HEAP8[subbuf] = 0;
//#ifdef PORT_SUB_ID
//    C.HEAP8[subbuf] = ' ';
//    Strcpy(&subbuf[1], PORT_SUB_ID);
//#endif

    C.Snprintf(outbuf, bufsz, "%s NetHack%s Version %s%s - last %s %s.",
             C.PORT_ID, subbuf, mdlib_version_string(versbuf, "."), statusbuf,
             C.mdlibState.date_via_env ? "revision" : "build", build_date);
    return outbuf;
}

export function bannerc_string(outbuf, bufsz, build_date)
{
    const subbuf = C.stackAlloc(64), versbuf = C.stackAlloc(64);

    C.HEAP8[subbuf] = 0;
//#ifdef PORT_SUB_ID
//    C.HEAP8[subbuf] = ' ';
//    Strcpy(&subbuf[1], PORT_SUB_ID);
//#endif
//#if (NH_DEVEL_STATUS != NH_STATUS_RELEASED)
//#if (NH_DEVEL_STATUS == NH_STATUS_BETA)
//    Strcat(subbuf, " Beta");
//#else
//    Strcat(subbuf, " Work-in-progress");
//#endif
//#endif

    C.Snprintf(outbuf, bufsz, "         Version %s %s%s, %s %s.",
            mdlib_version_string(versbuf, "."), C.PORT_ID, subbuf,
            C.mdlibState.date_via_env ? "revised" : "built", build_date);
    return outbuf;
}

export function build_savebones_compat_string()
{
//#ifdef VERSION_COMPATIBILITY
//    unsigned long uver = VERSION_COMPATIBILITY,
//                  cver  = (((unsigned long) VERSION_MAJOR << 24)
//                         | ((unsigned long) VERSION_MINOR << 16)
//                         | ((unsigned long) PATCHLEVEL    <<  8));
//#endif

    C.Strcpy(C.save_bones_compat_buf,
           "save and bones files accepted from version");
//#ifdef VERSION_COMPATIBILITY
//    if (uver != cver)
//        Sprintf(eos(save_bones_compat_buf), "s %lu.%lu.%lu through %d.%d.%d",
//                ((uver >> 24) & 0x0ffUL),
//                ((uver >> 16) & 0x0ffUL),
//                ((uver >>  8) & 0x0ffUL),
//                VERSION_MAJOR, VERSION_MINOR, PATCHLEVEL);
//    else
//#endif
        C.Sprintf(C.eos(C.save_bones_compat_buf), " %d.%d.%d only",
                C.VERSION_MAJOR, C.VERSION_MINOR, C.PATCHLEVEL);
}

export const build_opts_initial = [
    "color",
    "data file compression",
    "deferred handling of hangup signal",
    "insurance files for recovering from crashes",
    "live logging support",
    "log file",
    "extended log file",
    "errors and warnings log file",
    "mail daemon",
    "news file",
    "internal pager used for viewing help files",
    "pattern matching via :PATMATCH:",
    "pseudo random numbers generated by ISAAC64",
    "strong PRNG seed from /dev/random",
    "restore saved games via menu",
    "screen clipping",
    "shell command",
    "traditional status display",
    "status via windowport with highlighting",
    "suspend command",
    "terminal info library",
    // "timed wait for display effects", /* TIMED_DELAY is disabled by NO_TIMED_DELAY. */
    "system configuration at run-time",
    "show stack trace on error",
    "launch browser to report issues",
    {
        "buffer": "save_bones_compat_buf"
    },
    "and basic NetHack features"
];

export function count_and_validate_winopts()
{
    let i, cnt = 0;

    /* window_opts has a fencepost entry at the end */
    for (i = 0; i < C.mdlibState.window_opts.length - 1; i++) {
//#if !defined(MAKEDEFS_C) && defined(FOR_RUNTIME)
//#ifdef WIN32
//        window_opts[i].valid = FALSE;
//        if ((GUILaunched
//             && case_insensitive_comp(window_opts[i].id, "curses") != 0
//             && case_insensitive_comp(window_opts[i].id, "mswin") != 0)
//            || (!GUILaunched
//                && case_insensitive_comp(window_opts[i].id, "mswin") == 0))
//            continue;
//#endif
//#endif /* !MAKEDEFS_C && FOR_RUNTIME */
        ++cnt;
        C.mdlibState.window_opts[i].valid = 1;
    }
    return cnt;
}

export function count_and_validate_soundlibopts()
{
    let i, cnt = 0;

    /* soundlib_opts has a fencepost entry at the end */
    for (i = 0; i < C.mdlibState.soundlib_opts.length - 1; i++) {
        ++cnt;
        C.mdlibState.soundlib_opts[i].valid = 1;
    }
    return cnt;
}

export function opt_out_words(str, length_p)
{
    let word;

    while (C.HEAP8[str]) {
        word = C.strchr(str, 32);
//#if 0
//        /* treat " (" as unbreakable space *///
//        if (word && *(word + 1) == '(')
//            word = strchr(word + 1,  ' ');
//#endif
        if (word)
            C.HEAP8[word] = 0;
        if (C.int(length_p.value + C.int(C.strlen(str))) > C.COLNO - 5) {
            if (C.mdlibState.idxopttext < C.MAXOPT) C.mdlibState.opttext[C.mdlibState.idxopttext++] = C.dupstr(C.optbuf);
            C.Sprintf(C.optbuf, "%s", C.opt_indent),
                length_p.value = C.int(C.strlen(C.opt_indent));
        } else {
            C.Sprintf(C.eos(C.optbuf), " "), (length_p.value)++;
        }
        C.Sprintf(C.eos(C.optbuf), "%s", str), length_p.value += C.int(C.strlen(str));
        str += C.strlen(str) + (word ? 1 : 0);
    }
}

export function build_options()
{
    const buf = C.stackAlloc(C.COLBUFSZ);
    let i, winsyscnt, cnt = 0;
    const length = C.intLocal();
    const defwinsys = C.DEFAULT_WINDOW_SYS;
//#if !defined(MAKEDEFS_C) && defined(FOR_RUNTIME)
    let soundlibcnt;

//#ifdef WIN32
//    defwinsys = GUILaunched ? "mswin" : "tty";
//#endif
//#endif
    build_savebones_compat_string();
    if (C.mdlibState.idxopttext < C.MAXOPT) C.mdlibState.opttext[C.mdlibState.idxopttext++] = C.dupstr(C.optbuf);
//#if (NH_DEVEL_STATUS != NH_STATUS_RELEASED)
//#if (NH_DEVEL_STATUS == NH_STATUS_BETA)
//#define STATUS_ARG " [beta]"
//#else
//#define STATUS_ARG " [work-in-progress]"
//#endif
//#else
//#define STATUS_ARG ""
//#endif /* NH_DEVEL_STATUS == NH_STATUS_RELEASED */
    C.Sprintf(C.optbuf, "%sNetHack version %d.%d.%d%s\n",
            C.opt_indent, C.VERSION_MAJOR, C.VERSION_MINOR, C.PATCHLEVEL, C.STATUS_ARG);
    if (C.mdlibState.idxopttext < C.MAXOPT) C.mdlibState.opttext[C.mdlibState.idxopttext++] = C.dupstr(C.optbuf);
    C.Sprintf(C.optbuf, "Options compiled into this edition:");
    if (C.mdlibState.idxopttext < C.MAXOPT) C.mdlibState.opttext[C.mdlibState.idxopttext++] = C.dupstr(C.optbuf);
    C.HEAP8[C.optbuf] = 0;
    length.value = C.COLNO + 1; /* force 1st item onto new line */
    C.Strcat(C.strcpy(buf, C.datamodel(0)), " data model,");
    opt_out_words(buf, length);
    for (i = 0; i < C.mdlibState.build_opts.length; i++) {
//#if !defined(MAKEDEFS_C) && defined(FOR_RUNTIME)
//#ifdef WIN32
//        /* ignore the console entry if GUI version *///
//        if (GUILaunched
//            && !strcmp("screen control via WIN32 console I/O", build_opts[i]))
//            continue;
//#endif
//#endif /* !MAKEDEFS_C && FOR_RUNTIME */
        C.Strcat(C.strcpy(buf, C.mdlibState.build_opts[i]),
               (i < C.mdlibState.build_opts.length - 1) ? "," : ".");
        opt_out_words(buf, length);
    }
    if (C.mdlibState.idxopttext < C.MAXOPT) C.mdlibState.opttext[C.mdlibState.idxopttext++] = C.dupstr(C.optbuf);
    C.HEAP8[C.optbuf] = 0;
    winsyscnt = count_and_validate_winopts();
    if (C.mdlibState.idxopttext < C.MAXOPT) C.mdlibState.opttext[C.mdlibState.idxopttext++] = C.dupstr(C.optbuf);
    C.Sprintf(C.optbuf, "Supported windowing system%s:",
            (winsyscnt > 1) ? "s" : "");
    if (C.mdlibState.idxopttext < C.MAXOPT) C.mdlibState.opttext[C.mdlibState.idxopttext++] = C.dupstr(C.optbuf);
    C.HEAP8[C.optbuf] = 0;
    length.value = C.COLNO + 1; /* force 1st item onto new line */

    for (i = 0; i < C.mdlibState.window_opts.length - 1; i++) {
        if (!C.mdlibState.window_opts[i].valid)
            continue;
        C.Sprintf(buf, "\"%s\"", C.mdlibState.window_opts[i].id);
        if (C.strcmp(C.mdlibState.window_opts[i].name, C.mdlibState.window_opts[i].id))
            C.Sprintf(C.eos(buf), " (%s)", C.mdlibState.window_opts[i].name);
        /*
         * 1 : foo.
         * 2 : foo and bar,
         * 3+: for, bar, and quux,
         *
         * 2+ will be followed by " with a default of..."
         */
        C.Strcat(buf, (winsyscnt == 1) ? "." /* no 'default' */
                    : (winsyscnt == 2 && cnt == 0) ? " and"
                      : (cnt == winsyscnt - 2) ? ", and"
                        : ",");
        opt_out_words(buf, length);
        cnt++;
    }
    if (cnt > 1) {
        /* loop ended with a comma; opt_out_words() will insert a space */
        C.Sprintf(buf, "with a default of \"%s\".", defwinsys);
        opt_out_words(buf, length);
    }

//#if !defined(MAKEDEFS_C)
    cnt = 0;
    if (C.mdlibState.idxopttext < C.MAXOPT) C.mdlibState.opttext[C.mdlibState.idxopttext++] = C.dupstr(C.optbuf);
    C.HEAP8[C.optbuf] = 0;
    soundlibcnt = count_and_validate_soundlibopts();
    if (C.mdlibState.idxopttext < C.MAXOPT) C.mdlibState.opttext[C.mdlibState.idxopttext++] = C.dupstr(C.optbuf);
    C.Sprintf(C.optbuf, "Supported soundlib%s:", (soundlibcnt > 1) ? "s" : "");
    if (C.mdlibState.idxopttext < C.MAXOPT) C.mdlibState.opttext[C.mdlibState.idxopttext++] = C.dupstr(C.optbuf);
    C.HEAP8[C.optbuf] = 0;
    length.value = C.COLNO + 1; /* force 1st item onto new line */

//#ifdef USER_SOUNDS
//    soundlibcnt += 1;
//#endif
    for (i = 0; i < C.mdlibState.soundlib_opts.length - 1; i++) {
        let soundlib;

        if (!C.mdlibState.soundlib_opts[i].valid)
            continue;
        soundlib = C.mdlibState.soundlib_opts[i].text_id;
        if (!C.strncmp(soundlib, "soundlib_", 9))
            soundlib += 9;
        C.Sprintf(buf, "\"%s\"", soundlib);
        /*
         * 1 : foo.
         * 2 : foo and bar.
         * 3+: for, bar, and quux.
         */
        C.Strcat(buf, (soundlibcnt == 1 || cnt == soundlibcnt - 1)
                    ? "." /* no 'with default' */
                    : (soundlibcnt == 2 && cnt == 0) ? " and"
                      : (cnt == soundlibcnt - 2) ? ", and"
                        : ",");
        opt_out_words(buf, length);
        cnt++;
    }
//#ifdef USER_SOUNDS
//    if (cnt > 1) {
//        /* loop ended with a comma; opt_out_words() will insert a space *///
//        Sprintf(buf, "user sounds.");
//        opt_out_words(buf, length);
//    }
//#endif
//#endif  /* !MAKEDEFS_C */

    if (C.mdlibState.idxopttext < C.MAXOPT) C.mdlibState.opttext[C.mdlibState.idxopttext++] = C.dupstr(C.optbuf);
    C.HEAP8[C.optbuf] = 0;

//#if defined(MAKEDEFS_C) || defined(FOR_RUNTIME)
    {
        const lua_info = [
 "", "NetHack 5.0.* uses the 'Lua' interpreter to process some data:", "",
 "    :LUACOPYRIGHT:", "",
 /*        1         2         3         4         5         6         7
  1234567890123456789012345678901234567890123456789012345678901234567890123456
  */
 ("    \"Permission is hereby granted, free of charge," +
  " to any person obtaining"),
 "     a copy of this software and associated documentation files (the ",
 "     \"Software\"), to deal in the Software without restriction including",
 "     without limitation the rights to use, copy, modify, merge, publish,",
 "     distribute, sublicense, and/or sell copies of the Software, and to ",
 "     permit persons to whom the Software is furnished to do so, subject to",
 "     the following conditions:",
 "     The above copyright notice and this permission notice shall be",
 "     included in all copies or substantial portions of the Software.\"",
            0
        ];

        /* add lua copyright notice;
           ":TAG:" substitutions are deferred to caller */
        for (i = 0; lua_info[i] !== 0; ++i) {
            if (C.mdlibState.idxopttext < C.MAXOPT) C.mdlibState.opttext[C.mdlibState.idxopttext++] = C.dupstr(lua_info[i]);
        }
    }
//#endif /* MAKEDEFS_C || FOR_RUNTIME */

    /* end with a blank line */
    if (C.mdlibState.idxopttext < C.MAXOPT) C.mdlibState.opttext[C.mdlibState.idxopttext++] = C.dupstr("");
    return;
}

export function runtime_info_init()
{
    if (!C.mdlibState.done_runtime_opt_init_once) {
        C.mdlibState.done_runtime_opt_init_once = 1;
        build_savebones_compat_string();
        /* construct the current version number */
        make_version();
        C.populate_nomakedefs(C.version.address);          /* date.c */
        C.mdlibState.idxopttext = 0;
        build_options();
    }
}

export function do_runtime_info(rtcontext)
{
    let retval = 0;

    if (!C.mdlibState.done_runtime_opt_init_once)
        runtime_info_init();
    if (C.mdlibState.idxopttext && rtcontext)
        if (rtcontext.value >= 0 && rtcontext.value < C.MAXOPT) {
            retval = C.mdlibState.opttext[rtcontext.value];
            rtcontext.value += 1;
        }
    return retval;
}

export function release_runtime_info()
{
    while (C.mdlibState.idxopttext > 0) {
        --C.mdlibState.idxopttext;
        C.free(C.mdlibState.opttext[C.mdlibState.idxopttext]), C.mdlibState.opttext[C.mdlibState.idxopttext] = 0;
    }
    C.mdlibState.done_runtime_opt_init_once = 0;
    C.free_nomakedefs();
}
