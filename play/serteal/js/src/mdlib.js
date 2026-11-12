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



// #include "config.h"
// #include "permonst.h"
// #include "objclass.h"
// #include "wintype.h"
// #include "sym.h"
// #include "artilist.h"
// #include "dungeon.h"
// #include "sndprocs.h"
// #include "obj.h"
// #include "monst.h"
// #include "you.h"
// #include "context.h"
// #include "flag.h"
// #include "dlb.h"
// #include "hacklib.h"

/* version information */



// #include "patchlevel.h"













/* shorten up some lines */



// #include <stdarg.h>
/* REPRODUCIBLE_BUILD will change this to TRUE */
const date_via_env = static_var("date_via_env", schar, FALSE);
























/* these are in extern.h but we don't include hack.h */
/* XXX move to new file mdlib.h? */
 /*date.c*/
 /* date.c */

 








const idxopttext = static_var("idxopttext", int); const done_runtime_opt_init_once = static_var("done_runtime_opt_init_once", int, 0);
export const MAXOPT = 60;
const opttext = static_array("opttext", ptr_to(char), MAXOPT, [ 0 ]);
export function STOREOPTTEXT(line) { return (void ((idxopttext[0] < MAXOPT)                      
             ? (opttext[idxopttext[0]++] = dupstr(line))   
             : 0)); }

const optbuf = static_array("optbuf", char, COLBUFSZ);
const version = static_struct("version", struct_version_info);
const opt_indent = init_string(static_array("opt_indent", char, sizeof_string("    ")), _("    "), true);

const struct_win_information = struct("struct_win_information", {
    id: ptr_to(char),
        name: ptr_to(char),
    valid: boolean,
});

const window_opts = static_array("window_opts", struct_win_information, null, [

    { id: _("tty"),
      /* testing TILES_IN_GLYPHMAP here would bring confusion because it could
         apply to another interface such as X11, so check MSDOS explicitly
         instead; even checking TTY_TILES_ESCCODES would probably be
         confusing to most users (and it will already be listed separately
         in the compiled options section so users aware of it can find it) */



      /* assume that one or more of IBMgraphics, DECgraphics
         can be enabled; we can't tell from here whether that is accurate */
      name: _("traditional text with optional line-drawing"),

      valid: TRUE
    },


































    { id: 0, name: 0, valid: FALSE }
]);




const struct_soundlib_information = struct("struct_soundlib_information", {
    id: unsigned,
    text_id: ptr_to(char),
    Url: ptr_to(char),
    valid: boolean,
});

/*
 * soundlibs
 *
 * None of these are endorsements or recommendations of one library
 * or another, in any way. They are just preprocessor conditionals
 * in the event that glue code for such a library is ever added into
 * NetHack.
 */
const soundlib_opts = static_array("soundlib_opts", struct_soundlib_information, null, [
    { id: soundlib_nosound, text_id: _("soundlib_nosound"), Url: _(""), valid: FALSE },













































    { id: 0, text_id: 0, Url: 0, valid: FALSE },
]);


export function /* unsigned long long */
md_ignored_features()
{
    return (0
            | (shl64(1, 19)) /* SCORE_ON_BOTL */
            | SFCTOOL_BIT /* stored by SFCTOOL, not NetHack itself */
            );
}


function /* #endif void */


make_version()
{
    let i;

    /*
     * integer version number
     */
    version.incarnation = (shl64(VERSION_MAJOR, 24))
                          | (shl64(VERSION_MINOR, 16))
                          | (shl64(PATCHLEVEL, 8))
                          | (EDITLEVEL);
    /*
     * encoded feature list
     * Note:  if any of these magic numbers are changed or reassigned,
     * EDITLEVEL in patchlevel.h should be incremented at the same time.
     * The actual values have no special meaning, and the category
     * groupings are just for convenience.
     */
    version.feature_set = (0
/* levels and/or topology (0..4) */
/* monsters (5..9) */

                                           | (shl64(1, 6))

/* objects (10..14) */
/* flag bits and/or other global variables (15..26) */
 /* color support always*/                 | (shl64(1, 17))

                                           | (shl64(1, 18))




                                               );
    /*
     * Value used for object & monster sanity check.
     *    (NROFARTIFACTS<<24) | (NUM_OBJECTS<<12) | (NUMMONS<<0)
     */
    for (i = 1; artifact_names[i]; i++)
        continue;
    version.entity_count = ulong((i - 1));
    i = NUM_OBJECTS;
    version.entity_count = or64u((shl64(version.entity_count, 12)), ulong(i));
    i = NUMMONS;
    version.entity_count = or64u((shl64(version.entity_count, 12)), ulong(i));
/* free bits in here */
    return;
}



export function /* char * */
mdlib_version_string(outbuf, delim)
{
    void sprintf(outbuf, _("%d%s%d%s%d"), VERSION_MAJOR, delim, VERSION_MINOR, delim, PATCHLEVEL)
;



    return outbuf;
}

export function Snprintf(str, size, ...args) { return nh_snprintf(_("Snprintf"), 0, str, size, ...args); }




export function /* char * */
version_id_string(outbuf, bufsz, build_date)
{ const $frame = stack_frame(); try {
    let subbuf = stack_array(char, 64), versbuf = stack_array(char, 64);
    let statusbuf = stack_array(char, 64);












    chars[statusbuf + 0] = ord('\0');

    chars[subbuf + 0] = ord('\0');





    Snprintf(outbuf, bufsz, _("%s NetHack%s Version %s%s - last %s %s."), _("MacOS"), subbuf, mdlib_version_string(versbuf, _(".")), statusbuf, date_via_env[0] ? _("revision") : _("build"), build_date)

;
    return outbuf;
} finally { stack_pop($frame); } }

/* still within #if MAKDEFS_C || FOR_RUNTIME */

export function /* char * */
bannerc_string(outbuf, bufsz, build_date)
{ const $frame = stack_frame(); try {
    let subbuf = stack_array(char, 64), versbuf = stack_array(char, 64);

    chars[subbuf + 0] = ord('\0');












    Snprintf(outbuf, bufsz, _("         Version %s %s%s, %s %s."), mdlib_version_string(versbuf, _(".")), _("MacOS"), subbuf, date_via_env[0] ? _("revised") : _("built"), build_date)

;
    return outbuf;
} finally { stack_pop($frame); } }



















const save_bones_compat_buf = static_array("save_bones_compat_buf", char, BUFSZ);

function /* void */
build_savebones_compat_string()
{







    void strcpy(save_bones_compat_buf, _("save and bones files accepted from version"))
;









        void sprintf(eos(save_bones_compat_buf), _(" %d.%d.%d only"), VERSION_MAJOR, VERSION_MINOR, PATCHLEVEL)
;
}

const build_opts = static_array("build_opts", ptr_to(char), null, [






    _("color"),









    _("data file compression"),






















    _("deferred handling of hangup signal"),





    _("insurance files for recovering from crashes"),


    _("live logging support"),


    _("log file"),


    _("extended log file"),


    _("errors and warnings log file"),


    _("mail daemon"),








    _("news file"),
















    _("internal pager used for viewing help files"),


    /* pattern matching method will be substituted by nethack at run time */
    _("pattern matching via :PATMATCH:"),

    _("pseudo random numbers generated by ISAAC64"),

    _("strong PRNG seed from /dev/random"),
















    _("restore saved games via menu"),





    _("screen clipping"),



















    _("shell command"),

    _("traditional status display"),

    _("status via windowport with highlighting"),




    _("suspend command"),



    _("terminal info library"),


























    _("system configuration at run-time"),


    _("show stack trace on error"),


    _("launch browser to report issues"),

    save_bones_compat_buf,
    _("and basic NetHack features")
]);

function /* int */
count_and_validate_winopts()
{
    let i, cnt = 0;

    /* window_opts has a fencepost entry at the end */
    for (i = 0; i < SIZE(window_opts) - 1; i++) {











        ++cnt;
        window_opts[i].valid = TRUE;
    }
    return cnt;
}


function /* int */
count_and_validate_soundlibopts()
{
    let i, cnt = 0;

    /* soundlib_opts has a fencepost entry at the end */
    for (i = 0; i < SIZE(soundlib_opts) - 1; i++) {
        ++cnt;
        soundlib_opts[i].valid = TRUE;
    }
    return cnt;
}


function /* void */
opt_out_words(
    str,
    length_p) /* in/out */
{
    let word;

    while (chars[str]) {
        word = strchr(str, ord(' '));





        if (word)
            chars[word] = ord('\0');
        if (length_p[0] + int(strlen(str)) > COLNO - 5) {
            STOREOPTTEXT(optbuf);
            void sprintf(optbuf, _("%s"), opt_indent),
                length_p[0] = strlen(opt_indent);
        } else {
            void sprintf(eos(optbuf), _(" ")), (length_p[0])++;
        }
        void sprintf(eos(optbuf), _("%s"), str), length_p[0] += int(strlen(str));
        str += unsigned(strlen(str) + (word ? 1 : 0));
    }
}

function /* void */
build_options()
{ const $frame = stack_frame(); try {
    let buf = stack_array(char, COLBUFSZ);
    let i, length = stack_var(int), winsyscnt, cnt = 0;
    let defwinsys = _(DEFAULT_WINDOW_SYS);

    let soundlibcnt;





    build_savebones_compat_string();
    STOREOPTTEXT(optbuf);









    void sprintf(optbuf, _("%sNetHack version %d.%d.%d%s\n"), opt_indent, VERSION_MAJOR, VERSION_MINOR, PATCHLEVEL, _(STATUS_ARG))
;
    STOREOPTTEXT(optbuf);
    void sprintf(optbuf, _("Options compiled into this edition:"));
    STOREOPTTEXT(optbuf);
    chars[optbuf + 0] = ord('\0');
    length[0] = COLNO + 1; /* force 1st item onto new line */

    /* c2js recorder platform version text: public traces were recorded on
       macOS LP64, while the JS engine uses the ILP32 (wasm32) layout. */
    void strcat(strcpy(buf, _("I32LP64")), _(" data model,"));



    opt_out_words(buf, length);
    for (i = 0; i < SIZE(build_opts); i++) {








        void strcat(strcpy(buf, build_opts[i]), (i < SIZE(build_opts) - 1) ? _(",") : _("."))
;
        opt_out_words(buf, length);
    }
    STOREOPTTEXT(optbuf);
    chars[optbuf + 0] = ord('\0');
    winsyscnt = count_and_validate_winopts();
    STOREOPTTEXT(optbuf);
    void sprintf(optbuf, _("Supported windowing system%s:"), (winsyscnt > 1) ? _("s") : _(""))
;
    STOREOPTTEXT(optbuf);
    chars[optbuf + 0] = ord('\0');
    length[0] = COLNO + 1; /* force 1st item onto new line */

    for (i = 0; i < SIZE(window_opts) - 1; i++) {
        if (!window_opts[i].valid)
            continue;
        void sprintf(buf, _("\"%s\""), window_opts[i].id);
        if (strcmp(window_opts[i].name, window_opts[i].id))
            void sprintf(eos(buf), _(" (%s)"), window_opts[i].name);
        /*
         * 1 : foo.
         * 2 : foo and bar,
         * 3+: for, bar, and quux,
         *
         * 2+ will be followed by " with a default of..."
         */
        void strcat(buf, (winsyscnt == 1) ? _(".") /* no 'default' */
                    : (winsyscnt == 2 && cnt == 0) ? _(" and")
                      : (cnt == winsyscnt - 2) ? _(", and")
                        : _(","));
        opt_out_words(buf, length);
        cnt++;
    }
    if (cnt > 1) {
        /* loop ended with a comma; opt_out_words() will insert a space */
        void sprintf(buf, _("with a default of \"%s\"."), defwinsys);
        opt_out_words(buf, length);
    }


    cnt = 0;
    STOREOPTTEXT(optbuf);
    chars[optbuf + 0] = ord('\0');
    soundlibcnt = count_and_validate_soundlibopts();
    STOREOPTTEXT(optbuf);
    void sprintf(optbuf, _("Supported soundlib%s:"), (soundlibcnt > 1) ? _("s") : _(""));
    STOREOPTTEXT(optbuf);
    chars[optbuf + 0] = ord('\0');
    length[0] = COLNO + 1; /* force 1st item onto new line */




    for (i = 0; i < SIZE(soundlib_opts) - 1; i++) {
        let soundlib;

        if (!soundlib_opts[i].valid)
            continue;
        soundlib = soundlib_opts[i].text_id;
        if (!strncmp(soundlib, _("soundlib_"), 9))
            soundlib += 9;
        void sprintf(buf, _("\"%s\""), soundlib);
        /*
         * 1 : foo.
         * 2 : foo and bar.
         * 3+: for, bar, and quux.
         */
        void strcat(buf, (soundlibcnt == 1 || cnt == soundlibcnt - 1)
                    ? _(".") /* no 'with default' */
                    : (soundlibcnt == 2 && cnt == 0) ? _(" and")
                      : (cnt == soundlibcnt - 2) ? _(", and")
                        : _(","));
        opt_out_words(buf, length);
        cnt++;
    }









    STOREOPTTEXT(optbuf);
    chars[optbuf + 0] = ord('\0');


    {
        let lua_info = static_array("build_options.lua_info", ptr_to(char), null, [
 _(""), _("NetHack 5.0.* uses the 'Lua' interpreter to process some data:"), _(""),
 _("    :LUACOPYRIGHT:"), _(""),
 /*        1         2         3         4         5         6         7
  1234567890123456789012345678901234567890123456789012345678901234567890123456
  */
 _(("    \"Permission is hereby granted, free of charge," +
  " to any person obtaining")),
 _("     a copy of this software and associated documentation files (the "),
 _("     \"Software\"), to deal in the Software without restriction including"),
 _("     without limitation the rights to use, copy, modify, merge, publish,"),
 _("     distribute, sublicense, and/or sell copies of the Software, and to "),
 _("     permit persons to whom the Software is furnished to do so, subject to"),
 _("     the following conditions:"),
 _("     The above copyright notice and this permission notice shall be"),
 _("     included in all copies or substantial portions of the Software.\""),
            0
        ]);

        /* add lua copyright notice;
           ":TAG:" substitutions are deferred to caller */
        for (i = 0; lua_info[i]; ++i) {
            (void ((((idxopttext[0] < MAXOPT)) ? (opttext[idxopttext[0]++] = dupstr(lua_info[i])) : 0)));
        }
    }


    /* end with a blank line */
    STOREOPTTEXT(_(""));
    return;
} finally { stack_pop($frame); } } export const STATUS_ARG = "";



export function /* void */
runtime_info_init()
{
    if (!done_runtime_opt_init_once[0]) {
        done_runtime_opt_init_once[0] = 1;
        build_savebones_compat_string();
        /* construct the current version number */
        make_version();
        populate_nomakedefs(version);          /* date.c */
        idxopttext[0] = 0;
        build_options();
    }
}

export function /* const char * */
do_runtime_info(rtcontext)
{
    let retval = 0;

    if (!done_runtime_opt_init_once[0])
        runtime_info_init();
    if (idxopttext[0] && rtcontext)
        if (rtcontext[0] >= 0 && rtcontext[0] < MAXOPT) {
            retval = opttext[rtcontext[0]];
            rtcontext[0] += 1;
        }
    return retval;
}

export function /* void */
release_runtime_info()
{
    while (idxopttext[0] > 0) {
        --idxopttext[0];
        free((opttext[idxopttext[0]])), opttext[idxopttext[0]] = 0;
    }
    done_runtime_opt_init_once[0] = 0;
    free_nomakedefs();
}

/*mdlib.c*/
import { DEFAULT_WINDOW_SYS } from "./config.h.js";
import { BUFSZ } from "./global.h.js";
import { COLBUFSZ } from "./global.h.js";
import { COLNO } from "./global.h.js";
import { FALSE } from "./global.h.js";
import { SFCTOOL_BIT } from "./global.h.js";
import { TRUE } from "./global.h.js";
import { boolean } from "./global.h.js";
import { struct_version_info } from "./global.h.js";
import { NUMMONS } from "./monsters.h.js";
import { NUM_OBJECTS } from "./objects.h.js";
import { EDITLEVEL } from "./patchlevel.h.js";
import { PATCHLEVEL } from "./patchlevel.h.js";
import { VERSION_MAJOR } from "./patchlevel.h.js";
import { VERSION_MINOR } from "./patchlevel.h.js";
import { soundlib_nosound } from "./sndprocs.h.js";
import { SIZE } from "../rt/cmacros.js";
import { char } from "../rt/ctypes.js";
import { int } from "../rt/ctypes.js";
import { ord } from "../rt/ctypes.js";
import { schar } from "../rt/ctypes.js";
import { sizeof_string } from "../rt/ctypes.js";
import { ulong } from "../rt/ctypes.js";
import { unsigned } from "../rt/ctypes.js";
import { chars } from "../rt/heap.js";
import { stack_frame } from "../rt/heap.js";
import { stack_pop } from "../rt/heap.js";
import { or64u } from "../rt/int64.js";
import { shl64 } from "../rt/int64.js";
import { free } from "../rt/libc.js";
import { sprintf } from "../rt/libc.js";
import { strcat } from "../rt/libc.js";
import { strchr } from "../rt/libc.js";
import { strcmp } from "../rt/libc.js";
import { strcpy } from "../rt/libc.js";
import { strlen } from "../rt/libc.js";
import { strncmp } from "../rt/libc.js";
import { init_string } from "../rt/locals.js";
import { stack_array } from "../rt/locals.js";
import { stack_var } from "../rt/locals.js";
import { static_array } from "../rt/locals.js";
import { static_struct } from "../rt/locals.js";
import { static_var } from "../rt/locals.js";
import { _ } from "../rt/strings.js";
import { ptr_to } from "../rt/struct.js";
import { struct } from "../rt/struct.js";
import { dupstr } from "./alloc.js";
import { free_nomakedefs } from "./date.js";
import { populate_nomakedefs } from "./date.js";
import { eos } from "./hacklib.js";
import { nh_snprintf } from "./hacklib.js";

// defined by artilist.h (included above; at the line shown)
// artilist.h:12
const artifact_names = static_array("artifact_names", ptr_to(char), null, [_(""),
    _("Excalibur"),
    _("Stormbringer"),
    _("Mjollnir"),
    _("Cleaver"),
    _("Grimtooth"),
    _("Orcrist"),
    _("Sting"),
    _("Magicbane"),
    _("Frost Brand"),
    _("Fire Brand"),
    _("Dragonbane"),
    _("Demonbane"),
    _("Werebane"),
    _("Grayswandir"),
    _("Giantslayer"),
    _("Ogresmasher"),
    _("Trollsbane"),
    _("Vorpal Blade"),
    _("Snickersnee"),
    _("Sunsword"),
    _("The Orb of Detection"),
    _("The Heart of Ahriman"),
    _("The Sceptre of Might"),
    _("The Staff of Aesculapius"),
    _("The Magic Mirror of Merlin"),
    _("The Eyes of the Overworld"),
    _("The Mitre of Holiness"),
    _("The Longbow of Diana"),
    _("The Master Key of Thievery"),
    _("The Tsurugi of Muramasa"),
    _("The Platinum Yendorian Express Card"),
    _("The Orb of Fate"),
    _("The Eye of the Aethiopica")]);
