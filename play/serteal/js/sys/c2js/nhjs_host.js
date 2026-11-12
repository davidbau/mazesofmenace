/* nhjs_host.c - the Unix port routines that the c2js build does not take
 * from sys/unix/unixunix.c and sys/share/unixtty.c, which assume a real
 * terminal, fork() and signals.  sys/unix/unixmain.c itself is compiled
 * unchanged (with main renamed to nhjs_unix_main). */

// #include "hack.h"

// #include <emscripten/emscripten.h>
// #include <regex.h>
// #include <stdarg.h>
// #include <stdio.h>
// #include <stdlib.h>

export function /* int */

nh_c2js_link_smoke()
{
    return 5000;
}

/* Only used when the build keeps 32-bit `long` (NHJS_LONG64=0): rnd.c then
   seeds ISAAC64 with the recorder's eight little-endian seed bytes. */
export function /* int */
nhjs_get_seed_bytes(out, max)
{
    let text = getenv(_("NETHACK_SEED"));
    let seed = text ? strtoull(text, null, 10) : 0n;
    let i;

    for (i = 0; i < max && i < 8; ++i) {
        uchars[out + i] = uchar((seed & 0xFFn));
        seed >>= 8n;
    }
    return 8;
}

/* sysconf SHELLERS gate shared by '!' and ^Z, as in dosh() and dosuspend() */
function /* boolean */
nhjs_shell_allowed()
{
    return ((sysopt.shellers && chars[sysopt.shellers + 0]
           && check_user_string(sysopt.shellers)) ? 1 : 0);
}

/* '!': the recorder forks a shell; what remains visible is the tty being
   suspended and then redrawn when the child exits (child(0)). */
export function /* int */
dosh()
{
    if (!nhjs_shell_allowed()) {
        Norep(_("Unavailable command '!'."));
        return 0;
    }
    suspend_nhwindows()(0);
    resume_nhwindows()();
    return 0;
}

/* ^Z: suspend, then resume and redraw (ioctl.c dosuspend()) */
export function /* int */
dosuspend()
{
    if (!nhjs_shell_allowed()) {
        Norep(_("Suspend command not available."));
        return 0;
    }
    suspend_nhwindows()(0);
    resume_nhwindows()();
    return 0;
}


/* the recorder is built with CRASHREPORT; its browser launch fails */
export function /* int */
dobugreport()
{
    pline(_("Unable to send bug report.  Please visit %s instead."),
          (sysopt.crashreporturl && chars[sysopt.crashreporturl])
              ? sysopt.crashreporturl
              : _(DEVTEAM_URL));
    return ECMD_OK;
}


export function /* int */
child(wt)
{
    void wt;
    return 0;
}

export function /* void */
intron()
{
}

export function /* void */
introff()
{
}

/* normalize file name - we don't like .'s, /'s, spaces (unixunix.c) */
export function /* void */
regularize(s)
{
    let lp;

    while ((lp = strchr(s, ord('.'))) != 0 || (lp = strchr(s, ord('/'))) != 0
           || (lp = strchr(s, ord(' '))) != 0)
        chars[lp] = ord('_');
}

/* caller couldn't find a regular save file but did find a panic one
   (unixunix.c) */
export function /* void */
ask_about_panic_save()
{
    let Instead_prompt = init_string(static_array("ask_about_panic_save.Instead_prompt", char, sizeof_string("Start a new game instead?")), _("Start a new game instead?"), true);
    let c = ord('\0');

    pline(_("There is no regular save file but there is a panic one."));
    pline(_("It might be recoverable with demi-divine intervention."));
    if (iflags.window_inited)
        c = yn_function(Instead_prompt, _("yn\x1bq"), ord('n'), FALSE);
    if (c != ord('y')) {
        delete_levelfile(0);
        unlock_file(_(HLOCK));
        if (iflags.window_inited)
            exit_nhwindows()(0);
        nh_terminate(EXIT_SUCCESS);
    }
}

/* regerror() with the messages of the recorder's libc.  Darwin's regex
   comes from FreeBSD; the texts below are those of FreeBSD's
   lib/libc/regex/regerror.c (BSD licence, Henry Spencer's regex package).
   The error codes are the local (musl) ones. */
export function /* size_t */
nhjs_regerror(errcode, preg, errbuf,
              errbuf_size)
{
    const struct___anon1 = struct("nhjs_regerror.struct___anon1", {
        code: int,
        explain: ptr_to(char),
    }); let rerrs = static_array("nhjs_regerror.rerrs", struct___anon1, null, [
        { code: REG_NOMATCH, explain: _("regexec() failed to match") },
        { code: REG_BADPAT, explain: _("invalid regular expression") },
        { code: REG_ECOLLATE, explain: _("invalid collating element") },
        { code: REG_ECTYPE, explain: _("invalid character class") },
        { code: REG_EESCAPE, explain: _("trailing backslash (\\)") },
        { code: REG_ESUBREG, explain: _("invalid backreference number") },
        { code: REG_EBRACK, explain: _("brackets ([ ]) not balanced") },
        { code: REG_EPAREN, explain: _("parentheses not balanced") },
        { code: REG_EBRACE, explain: _("braces not balanced") },
        { code: REG_BADBR, explain: _("invalid repetition count(s)") },
        { code: REG_ERANGE, explain: _("invalid character range") },
        { code: REG_ESPACE, explain: _("out of memory") },
        { code: REG_BADRPT, explain: _("repetition-operator operand invalid") },
    ]);
    let s = _("*** unknown regexp error code ***");
    let i, len;

    void preg;
    for (i = 0; i < SIZE(rerrs); ++i)
        if (rerrs[i].code == errcode) {
            s = rerrs[i].explain;
            break;
        }
    len = unsigned(strlen(s) + 1);
    if (errbuf_size > 0) {
        if (errbuf_size > len) {
            void strcpy(errbuf, s);
        } else {
            void strncpy(errbuf, s, unsigned(errbuf_size - 1));
            chars[errbuf + unsigned(errbuf_size - 1)] = ord('\0');
        }
    }
    return len;
}








/* fatal error (unixtty.c) */
 export function /* void */
error(s, ...args)
{
    let ap;

    ap = va_start(args);
    if (iflags.window_inited)
        exit_nhwindows()(0);
    vprintf(s, ap);
    void putchar(ord('\n'));
    va_end(ap);
    exit(EXIT_FAILURE);
}
import { FALSE } from "../../src/global.h.js";
import { DEVTEAM_URL } from "../../src/hack.h.js";
import { ECMD_OK } from "../../src/hack.h.js";
import { HLOCK } from "../../src/unixconf.h.js";
import { exit_nhwindows } from "../../src/winprocs.h.macros.js";
import { resume_nhwindows } from "../../src/winprocs.h.macros.js";
import { suspend_nhwindows } from "../../src/winprocs.h.macros.js";
import { SIZE } from "../../rt/cmacros.js";
import { char } from "../../rt/ctypes.js";
import { int } from "../../rt/ctypes.js";
import { ord } from "../../rt/ctypes.js";
import { sizeof_string } from "../../rt/ctypes.js";
import { uchar } from "../../rt/ctypes.js";
import { unsigned } from "../../rt/ctypes.js";
import { chars } from "../../rt/heap.js";
import { uchars } from "../../rt/heap.js";
import { EXIT_FAILURE } from "../../rt/libc.js";
import { EXIT_SUCCESS } from "../../rt/libc.js";
import { REG_BADBR } from "../../rt/libc.js";
import { REG_BADPAT } from "../../rt/libc.js";
import { REG_BADRPT } from "../../rt/libc.js";
import { REG_EBRACE } from "../../rt/libc.js";
import { REG_EBRACK } from "../../rt/libc.js";
import { REG_ECOLLATE } from "../../rt/libc.js";
import { REG_ECTYPE } from "../../rt/libc.js";
import { REG_EESCAPE } from "../../rt/libc.js";
import { REG_EPAREN } from "../../rt/libc.js";
import { REG_ERANGE } from "../../rt/libc.js";
import { REG_ESPACE } from "../../rt/libc.js";
import { REG_ESUBREG } from "../../rt/libc.js";
import { REG_NOMATCH } from "../../rt/libc.js";
import { exit } from "../../rt/libc.js";
import { getenv } from "../../rt/libc.js";
import { putchar } from "../../rt/libc.js";
import { strchr } from "../../rt/libc.js";
import { strcpy } from "../../rt/libc.js";
import { strlen } from "../../rt/libc.js";
import { strncpy } from "../../rt/libc.js";
import { strtoull } from "../../rt/libc.js";
import { vprintf } from "../../rt/libc.js";
import { init_string } from "../../rt/locals.js";
import { static_array } from "../../rt/locals.js";
import { _ } from "../../rt/strings.js";
import { ptr_to } from "../../rt/struct.js";
import { struct } from "../../rt/struct.js";
import { va_end } from "../../rt/varargs.js";
import { va_start } from "../../rt/varargs.js";
import { yn_function } from "../../src/cmd.js";
import { iflags } from "../../src/decl.js";
import { nh_terminate } from "../../src/end.js";
import { delete_levelfile } from "../../src/files.js";
import { unlock_file } from "../../src/files.js";
import { Norep } from "../../src/pline.js";
import { pline } from "../../src/pline.js";
import { sysopt } from "../../src/sys.js";
import { check_user_string } from "../unix/unixmain.js";
