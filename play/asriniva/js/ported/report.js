/* NetHack 5.0	report.c	$NHDT-Date: 1777240823 2026/04/26 22:00:23 $  $NHDT-Branch: to500 $:$NHDT-Revision: 1.19 $ */
/* Copyright (c) Kenneth Lorber, Kensington, Maryland, 2024 */
/* NetHack may be freely redistributed.  See license for details. */
import { C } from './c-runtime.js';
// Prepared memory64 configuration: the three inherited report.c platform
// changes select nhmd4/readlink and omit libc backtraces under Emscripten.
// C's reserved identifier `in` is spelled `in_` in JavaScript. The `skip` and
// `full` labels retain forward-goto exits through labeled blocks. Original
// private statics live in per-module C.reportState; temporary C arrays use the
// ABI stack, and output-pointer/int references retain actual linear-memory
// writes. SWR_ADD expands here so its truncation decisions remain in this TU.


/* NB: CRASHREPORT implies PANICTRACE */
/* Binary ID - Use only as a hint to contact.html for recognizing our own
   binaries.  This is easily spoofed! */
/* ARGSUSED */
export function crashreport_init(argc, argv)
{
    const s = C.reportState;
    const once = s.once; s.once = (s.once + 1) | 0;
    if (once) /* NetHackW.exe calls us twice */
        return;
    let binfile = C.stackAlloc(C.PATH_MAX + 1);
    let v0 = 0, tmp = C.stackAlloc(C.NHMD4_DIGEST_LENGTH), ctxp = C.stackAlloc(C.md4Size);
    skip: {
        if ((C.nhmd4_init(ctxp), v0))
            break skip;
        let len = C.readlink('/proc/self/exe', binfile, C.PATH_MAX);
        if (len > 0) C.HEAPU8[binfile + len] = 0;
        else break skip; /* Does "goto skip" on error. */
        let fd = C.open(binfile, C.O_RDONLY, 0);
        if (fd == -1) {
            break skip;
        }
        let segsize;
        let segment = C.stackAlloc(4096);
        while (0 < (segsize = C.read(fd, segment, 4096))) {
            if ((C.nhmd4_update(ctxp, segment, segsize), v0))
                break skip;
        }
        if (segsize < 0) {
            C.close(fd);
            break skip;
        }
        if ((C.nhmd4_final(ctxp, tmp), v0))
            break skip;
        C.close(fd);
        const hexdigits = '0123456789abcdef';
        let p = s.bid, in_ = tmp;
        let cnt = C.NHMD4_RESULTLEN & 255;
        /* Just in case, make sure not to overflow the bid buffer.
           Divide size by 2 because each octet in the hash uses two slots
           in bid[] when formatted as a pair of hexadecimal digits. */
        if (cnt >= 40 / 2)
            cnt = 40 / 2 - 1;
        while (cnt) {
            /* sprintf(p, "%02x", *in++), p += 2; */
            C.HEAPU8[p++] = hexdigits.charCodeAt((C.HEAPU8[in_] >> 4) & 0x0f);
            C.HEAPU8[p++] = hexdigits.charCodeAt(C.HEAPU8[in_++] & 0x0f);
            --cnt;
        }
        C.HEAPU8[p] = 0;
        return;
    }
    C.Strcpy(s.bid, 'unknown');
}

export function crashreport_bidshow()
{
    {
        C.raw_print(C.reportState.bid);
    }
}

/* Build a URL with a query string and try to launch a new browser window
 * to report from panic() or impossible().  Requires libc support for
 * the stacktrace.  Uses memory on the stack to avoid memory allocation
 * (on most platforms) (but libc can still do anything it wants). */
// No theoretial limit for URL length but reality is messy.
// This should work on all modern platforms.
/* Original TU-local macro; each callsite below expands its statements.
#define SWR_ADD(str) \
    utmp = strlen(str);                         \
    mark = uend;                                \
    if (utmp >= urem)                           \
        goto full;                              \
    memcpy(uend, str, utmp);                    \
    uend += utmp; urem -= utmp;                 \
    *uend = '\0';
*/
// mark holds the initial eos; if we can't get the value in
// then we can remove the whole item if desired.  For other
// semantics, caller can handle mark.
// NB: on overflow this rolls us back to mark, so if we don't
//     want to roll back to the last SWR_ADD, update mark before
//     calling this macro.
/* On overflow, truncate to markp (but only if markp != NULL). */
export function swr_add_uricoded(in_, out, remaining, markp)
{
    while (C.HEAP8[in_]) {
        if (C.isalnum(C.HEAP8[in_]) || C.strchr('_-.~', C.HEAP8[in_])) {
            C.HEAPU8[out.value] = C.HEAP8[in_];
            out.value++;
            remaining.value--;
        } else if (C.HEAP8[in_] == 32) {
            C.HEAPU8[out.value] = 43;
            out.value++;
            remaining.value--;
        } else {
            if (remaining.value <= 3) {
                if (markp)
                    out.value = markp, remaining.value = 0;
                C.HEAPU8[out.value] = 0;
                return 1;
            } else {
                let chr = C.localArray('swr_add_uricoded:chr', 40); /* [4] should suffice */
                let x;
                C.Sprintf(chr, '%%%02X', C.HEAP8[in_]);
                x = C.strlen(chr) | 0;
                if (x <= remaining.value) {
                    C.Strcpy(out.value, chr);
                    out.value += x;
                    remaining.value -= x;
                }
            }
        }
        in_++;
        if (!remaining.value) {
            if (markp)
                out.value = markp, remaining.value = 0;
            C.HEAPU8[out.value] = 0;
            return 1;
        }
        C.HEAPU8[out.value] = 0;
    }
    return 0; /* normal return */
}

export function submit_web_report(cos, msg, why)
{
    const s = C.reportState;
    s.urem = (C.gc.crash_urlmax < 0 || C.gc.crash_urlmax > C.MAX_URL)
           ? C.MAX_URL : Math.min(C.MAX_URL, C.gc.crash_urlmax);
    let temp = C.stackAlloc(200);
    let temp2 = C.stackAlloc(200);
    let countpp = 0; /* pre and post traceback lines */
//  URL loaded for creating reports to the NetHack DevTeam
// CRASHREPORTURL=https://nethack.org/links/cr-5.0.0.html
    if (!C.sysopt.crashreporturl)
        return 0;
    full: {
        s.utmp = C.strlen(C.sysopt.crashreporturl) | 0;
        s.mark = s.uend;
        if (s.utmp >= s.urem)
            break full;
        C.memcpy(s.uend, C.sysopt.crashreporturl, s.utmp);
        s.uend += s.utmp; s.urem -= s.utmp;
        C.HEAPU8[s.uend] = 0;
        /*
         * Note: all snprintf() calls here changed to sprintf() to avoid
         *       complaints from static analyzer.  All but one were unnecessary
         *       since they were formatting int or unsigned into a large buffer.
         */
        /* cos - operation, v - version */
        C.Sprintf(temp, '?cos=%d&v=1', cos);
        s.utmp = C.strlen(temp) | 0;
        s.mark = s.uend;
        if (s.utmp >= s.urem)
            break full;
        C.memcpy(s.uend, temp, s.utmp);
        s.uend += s.utmp; s.urem -= s.utmp;
        C.HEAPU8[s.uend] = 0;
        /* msg==NULL for #bugreport */
        if (msg) {
            s.utmp = C.strlen('&subject=') | 0;
            s.mark = s.uend;
            if (s.utmp >= s.urem)
                break full;
            C.memcpy(s.uend, '&subject=', s.utmp);
            s.uend += s.utmp; s.urem -= s.utmp;
            C.HEAPU8[s.uend] = 0;
            C.Sprintf(temp, '%.40s report for NetHack %.40s', msg, C.version_string(temp2, 200));
            if (swr_add_uricoded(temp, s.uendRef, s.uremRef, s.mark)) break full;
        }
        s.utmp = C.strlen('&gitver=') | 0;
        s.mark = s.uend;
        if (s.utmp >= s.urem)
            break full;
        C.memcpy(s.uend, '&gitver=', s.utmp);
        s.uend += s.utmp; s.urem -= s.utmp;
        C.HEAPU8[s.uend] = 0;
        if (swr_add_uricoded(C.getversionstring(temp2, 200), s.uendRef, s.uremRef, s.mark)) break full;
        if (C.gc.crash_name) {
            s.utmp = C.strlen('&name=') | 0;
            s.mark = s.uend;
            if (s.utmp >= s.urem)
                break full;
            C.memcpy(s.uend, '&name=', s.utmp);
            s.uend += s.utmp; s.urem -= s.utmp;
            C.HEAPU8[s.uend] = 0;
            if (swr_add_uricoded(C.gc.crash_name, s.uendRef, s.uremRef, s.mark)) break full;
        }
        if (C.gc.crash_email) {
            s.utmp = C.strlen('&email=') | 0;
            s.mark = s.uend;
            if (s.utmp >= s.urem)
                break full;
            C.memcpy(s.uend, '&email=', s.utmp);
            s.uend += s.utmp; s.urem -= s.utmp;
            C.HEAPU8[s.uend] = 0;
            if (swr_add_uricoded(C.gc.crash_email, s.uendRef, s.uremRef, s.mark)) break full;
        }
            // hardware: leave for user
            // software: leave for user
            // comments: leave for user
        s.utmp = C.strlen('&details=') | 0;
        s.mark = s.uend;
        if (s.utmp >= s.urem)
            break full;
        C.memcpy(s.uend, '&details=', s.utmp);
        s.uend += s.utmp; s.urem -= s.utmp;
        C.HEAPU8[s.uend] = 0;
        if (why) {
            if (swr_add_uricoded(why, s.uendRef, s.uremRef, s.mark)) break full;
            if (swr_add_uricoded(C.text('\n'), s.uendRef, s.uremRef, s.mark)) break full;
            s.mark = s.uend;
            countpp++;
        }
        if (swr_add_uricoded(C.text('bid: '), s.uendRef, s.uremRef, s.mark)) break full;
        if (swr_add_uricoded(s.bid, s.uendRef, s.uremRef, s.mark)) break full;
        if (swr_add_uricoded(C.text('\n'), s.uendRef, s.uremRef, s.mark)) break full;
        s.mark = s.uend;
        countpp++;
        let count = 0;
        if (cos == 1) {
        }
        // config.h turns this on, but make it easy to turn off if needed
        if (cos == 1) {
            let k;
            if (swr_add_uricoded(C.text('Latest messages:\n'), s.uendRef, s.uremRef, s.mark)) break full;
            s.mark = s.uend;
            countpp++;
            for (k = 0; k < 5; k++) {
                const line = get_saved_pline(k);
                if (!line)
                    break;
                if (swr_add_uricoded(line, s.uendRef, s.uremRef, s.mark)) break full;
                if (swr_add_uricoded(C.text('\n'), s.uendRef, s.uremRef, s.mark)) break full;
                countpp++;
                s.mark = s.uend;
            }
        }
                // detailrows: Guess since we can't know the
                //     width of the window.
        s.utmp = C.strlen('&detailrows=') | 0;
        s.mark = s.uend;
        if (s.utmp >= s.urem)
            break full;
        C.memcpy(s.uend, '&detailrows=', s.utmp);
        s.uend += s.utmp; s.urem -= s.utmp;
        C.HEAPU8[s.uend] = 0;
        C.Sprintf(temp, '%d', Math.min(count + countpp, 30));
        if (swr_add_uricoded(temp, s.uendRef, s.uremRef, s.mark)) break full;
    }
//printf("URL=%ld '%s'\n",strlen(url),url);
    const xargv = C.pointerArray([C.CRASHREPORT, s.url, 0]);
    let pid = C.fork();
    if (pid == 0) {
        let err = C.stackAlloc(400);
        C.execve(C.CRASHREPORT, xargv, C.environ());
        C.Sprintf(err, "Can't start /usr/bin/open: %.*s", 400 - C.START_ERROR_SIZE, C.strerror(C.errno));
        C.raw_print(err);
        C.exit(1);
    } else {
        const status = C.intLocal();
        C.errno = 0;
        C.waitpid(pid, status.address, 0);
        if (status.value) {         /* XXX check could be more precise */
            return 0;
        }
    }
    /* free(info);   -- Don't risk it. */
    return 1;
}

export function dobugreport()
{
    if (!submit_web_report(2, 0, C.text('#bugreport command'))) {
        C.pline('Unable to send bug report.  Please visit %s instead.',
              (C.sysopt.crashreporturl && C.HEAP8[C.sysopt.crashreporturl])
              ? C.sysopt.crashreporturl
              : C.DEVTEAM_URL);
    }
    return C.ECMD_OK;
}

/*ARGSUSED*/
export function NH_panictrace_libc()
{
    return 0;
}

/*
 *   fooPATH  file system path for foo
 *   fooVAR   (possibly const) variable containing fooPATH
 */
export function NH_panictrace_gdb()
{
    return 0;
}

/* lineno==0 gives the most recent message (e.g.
   "Do you want to call panic..." if called from #panic) */
export function get_saved_pline(lineno)
{
    let p;
    let limit = C.DUMPLOG_MSG_COUNT;
    if (lineno >= C.DUMPLOG_MSG_COUNT)
        return 0;
    p = ((C.gs.saved_pline_index - 1) >>> 0) % C.DUMPLOG_MSG_COUNT;
    while (limit--) {
        if (C.gs.saved_plines[p]) { /* valid line */
            if (lineno--) {
                p = (p - 1 + C.DUMPLOG_MSG_COUNT) % C.DUMPLOG_MSG_COUNT;
            } else {
                return C.gs.saved_plines[p];
            }
        }
    }
    return 0;
}

/* called as signal() handler, so sent at least one arg */
/*ARGUSED*/
export function panictrace_handler(sig_unused)
{
    let f2;
    f2 = C.write(2, C.text('\nSignal received.\n'), 18) | 0;
    C.NH_abort(0); /* ... and we're already in the process of quitting? */
}

export function panictrace_setsignals(set)
{
    if (C.SIGILL !== undefined) C.signal(C.SIGILL, set ? C.panictraceHandler() : 0);
    if (C.SIGTRAP !== undefined) C.signal(C.SIGTRAP, set ? C.panictraceHandler() : 0);
    if (C.SIGIOT !== undefined) C.signal(C.SIGIOT, set ? C.panictraceHandler() : 0);
    if (C.SIGBUS !== undefined) C.signal(C.SIGBUS, set ? C.panictraceHandler() : 0);
    if (C.SIGFPE !== undefined) C.signal(C.SIGFPE, set ? C.panictraceHandler() : 0);
    if (C.SIGSEGV !== undefined) C.signal(C.SIGSEGV, set ? C.panictraceHandler() : 0);
    if (C.SIGSTKFLT !== undefined) C.signal(C.SIGSTKFLT, set ? C.panictraceHandler() : 0);
    if (C.SIGSYS !== undefined) C.signal(C.SIGSYS, set ? C.panictraceHandler() : 0);
    if (C.SIGEMT !== undefined) C.signal(C.SIGEMT, set ? C.panictraceHandler() : 0);
}

/*
 * FIXME: this should have a lot of '#undef's for onefile support.
 */
/*report.c*/

// Original comments from inactive branches and expanded ABI macros:
/* If this triggers, investigate CFBundleGetMainBundle */
/* or CFBundleCopyExecutableURL. */
/* BETA */
/* MACOS */
/* v0 is just to suppress compiler warnings about unreachable code */
/* WIN32 takes too much code and is dependent on OS includes we can't
 * pull in here, so we call out to code in sys/windows/windsys.c */
/* Just in case, make sure not to overflow the bid buffer.
       Divide size by 2 because each octet in the hash uses two slots
       in bid[] when formatted as a pair of hexadecimal digits. */
/*
     * Note: all snprintf() calls here changed to sprintf() to avoid
     *       complaints from static analyzer.  All but one were unnecessary
     *       since they were formatting int or unsigned into a large buffer.
     */
/* \n\0 */
/* try to remove up to 16 blank spaces by removing 8 twice */
/* DUMPLOG_CORE */
/* !WIN32 */
/* Keep the output clean - firefox spews useless errors on
                 * my system. */
/* Not useful at the moment. XXX */
/* CRASHREPORT */
/* XXX how did this get left here? */
/* !PANICTRACE_LIBC */
/* SYSCF */
/* PANICTRACE_GDB */
/* A (more) generic method to get a stack trace - invoke
     * gdb on ourself. */
/* ugly */
/* !PANICTRACE_GDB */
/* wincurs.h */
/* it is risky calling this during a program-terminating signal,
           but without it the subsequent backtrace is useless because
           that ends up being scrawled all over the screen; call is
           here rather than in NH_abort() because panic() calls both
           exit_nhwindows(), which makes this same call under curses,
           then NH_abort() and we don't want to call this twice */
/* what could we do if write to fd#2 (stderr) fails  */
/* NO_SIGNAL */
/* PANICTRACE */
