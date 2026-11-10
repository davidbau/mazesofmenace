/* NetHack 5.0	getline.c	$NHDT-Date: 1701285885 2023/11/29 19:24:45 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.59 $ */

/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */

/*-Copyright (c) Michael Allison, 2006. */

/* NetHack may be freely redistributed.  See license for details. */


import { C } from './c-runtime.js';

/* JavaScript translation of getline.c. Five original function boundaries
 * remain; hooks are direct JavaScript function references inside this TU.
 * Numeric pointers access fresh byte heaps, and command-match output uses a
 * stack int** box. callHook restores each callback's C automatic stack frame
 * so repeated completion/editing does not accumulate temporary stack space.
 * C-backed window/display fields retain their widths;
 * suppress_history is scoped per game. Inactive EDIT_GETLIN and legacy
 * completion branches remain explicit C comments. Native terminal input,
 * output, capability selection and shadow capture stay unchanged.
 */

// #include "hack.h"

// #ifdef TTY_GRAPHICS

// #if !defined(MACOS9)
// #define NEWAUTOCOMP
// #endif

// #include "wintty.h"
// #include "func_tab.h"

// char morc = 0; 
/* tell the outside world what char you chose */

// static boolean suppress_history;
// static boolean ext_cmd_getlin_hook(char *);

// typedef boolean (*getlin_hook_proc)(char *);

// static void hooked_tty_getlin(const char *, char *, getlin_hook_proc);
// extern int extcmd_via_menu(void); 
/* cmd.c */


// extern char erase_char, kill_char; 
/* from appropriate tty.c file */


/*
 * Read a line closed with '\n' into the array char bufp[BUFSZ].
 * (The '\n' is not stored. The string is closed with a '\0'.)
 * Reading can be interrupted by an escape ('\033').  If there is already
 * some text, it is removed and prompting continues as if from the start.
 * However, if there is no text yet (or anymore) then "\033" is returned.
 */

export function tty_getlin(query, bufp)
{
    C.getlineState.suppress_history = 0;
    hooked_tty_getlin(query, bufp, 0);
}


export function hooked_tty_getlin(
    query,
    bufp,
    hook)
{
    let obufp = bufp;
    let c;
    let cw = C.wins[C.WIN_MESSAGE];
    let doprev = 0;

    if (C.ttyDisplay.toplin == C.TOPLINE_NEED_MORE && !(cw.flags & C.WIN_STOP))
        C.more();
    cw.flags &= ~C.WIN_STOP;
    C.ttyDisplay.toplin = C.TOPLINE_SPECIAL_PROMPT;
    C.ttyDisplay.inread++;

    /*
     * Issue the prompt.
     *
     * custompline() will call vpline() which calls flush_screen() which
     * calls bot(). The core now disables bot() processing while inside
     * getlin, so the screen won't be modified during whatever this prompt
     * is for.
     */
    C.custompline(C.OVERRIDE_MSGTYPE | C.SUPPRESS_HISTORY, "%s ", query);

// #ifdef EDIT_GETLIN
    /* bufp is input/output; treat current contents (presumed to be from
       previous getlin()) as default input */
//     addtopl(obufp);
//     bufp = eos(obufp);
// #else
    /* !EDIT_GETLIN: bufp is output only; init it to empty */
    C.HEAPU8[bufp] = 0;
// #endif

    for (;;) {
        C.fflush(C.stdout);
        C.Strcat(C.strcat(C.strcpy(C.gt.toplines, query), " "), obufp);
        C.term_curs_set(1);
        c = C.pgetchar();
        C.term_curs_set(0);
        if (c == 27 || c == C.EOF) {
            if (c == C.EOF)
                C.iflags.term_gone = 1;
            if (c == 27 && C.HEAP8[obufp] != 0) {
                C.HEAPU8[obufp] = 0;
                bufp = obufp;
                C.tty_clear_nhwindow(C.WIN_MESSAGE);
                cw.maxcol = cw.maxrow;
                C.addtopl(query);
                C.addtopl(" ");
                C.addtopl(obufp);
            } else {
                C.HEAPU8[obufp] = 27;
                C.HEAPU8[obufp + 1] = 0;
                break;
            }
        }
        if (C.ttyDisplay.intr) {
            C.ttyDisplay.intr--;
            C.HEAPU8[bufp] = 0;
        }
        if (c == C.Ctrl('p')) { /* ctrl-P, doesn't honor rebinding #prevmsg cmd */
            let sav = C.ttyDisplay.inread;

            C.ttyDisplay.inread = 0;
            if (C.iflags.prevmsg_window == 115
                || (C.iflags.prevmsg_window == 99 && !doprev)) {
                /* msg_window:single, or msg_window:combination while it's
                   behaving like msg_window:single */
                if (!doprev)
                    C.tty_doprev_message(); /* need two initially */
                C.tty_doprev_message();
                C.ttyDisplay.inread = sav;
                doprev = 1;
                continue;
            } else {
                /* msg_window:full or reverse, or msg_window:combination while
                   it's behaving like msg_window:full */
                C.tty_doprev_message();
                C.ttyDisplay.inread = sav;
                doprev = 0;
                C.tty_clear_nhwindow(C.WIN_MESSAGE);
                cw.maxcol = cw.maxrow;
                C.addtopl(query);
                C.addtopl(" ");
                C.HEAPU8[bufp] = 0;
                C.addtopl(obufp);
            }
        } else if (doprev) {
            C.tty_clear_nhwindow(C.WIN_MESSAGE);
            cw.maxcol = cw.maxrow;
            doprev = 0;
            C.addtopl(query);
            C.addtopl(" ");
            C.HEAPU8[bufp] = 0;
            C.addtopl(obufp);
        }
        if (c == C.erase_char || c == 8) {
            if (bufp != obufp) {
// #ifdef NEWAUTOCOMP
                let i;

// #endif
/* NEWAUTOCOMP */
                bufp--;
// #ifndef NEWAUTOCOMP
//                 putsyms("\b \b"); 
/* putsym converts \b */
// #else
/* NEWAUTOCOMP */
                C.putsyms("\b");
                for (i = bufp; C.HEAP8[i]; ++i)
                    C.putsyms(" ");
                for (; i > bufp; --i)
                    C.putsyms("\b");
                C.HEAPU8[bufp] = 0;
// #endif
/* NEWAUTOCOMP */
            } else
                C.tty_nhbell();
        } else if (c == 10 || c == 13) {
// #ifndef NEWAUTOCOMP
//             *bufp = 0;
// #endif
/* not NEWAUTOCOMP */
            break;
        } else if (32 <= (c & 255) && c != 127
                   /* avoid isprint() - some people don't have it
                      ' ' is not always a printing char */
                   && (bufp - obufp < C.BUFSZ - 1 && bufp - obufp < C.COLNO)) {
// #ifdef NEWAUTOCOMP
            let i = C.eos(bufp);

// #endif
/* NEWAUTOCOMP */
            C.HEAPU8[bufp] = c;
            C.HEAPU8[bufp + 1] = 0;
            C.putsyms(bufp);
            bufp++;
            if (hook && C.boolean(C.callHook(hook, obufp))) {
                C.putsyms(bufp);
// #ifndef NEWAUTOCOMP
//                 bufp = eos(bufp);
// #else
/* NEWAUTOCOMP */
                /* pointer and cursor left where they were */
                for (i = bufp; C.HEAP8[i]; ++i)
                    C.putsyms("\b");
            } else if (i > bufp) {
                let s = i;

                /* erase rest of prior guess */
                for (; i > bufp; --i)
                    C.putsyms(" ");
                for (; s > bufp; --s)
                    C.putsyms("\b");
// #endif
/* NEWAUTOCOMP */
            }
        } else if (c == C.kill_char || c == 127) { /* Robert Viduya */
            /* this test last - @ might be the kill_char */
// #ifndef NEWAUTOCOMP
//             while (bufp != obufp) {
//                 bufp--;
//                 putsyms("\b \b");
//             }
// #else
/* NEWAUTOCOMP */
            for (; C.HEAP8[bufp]; ++bufp)
                C.putsyms(" ");
            for (; bufp != obufp; --bufp)
                C.putsyms("\b \b");
            C.HEAPU8[bufp] = 0;
// #endif
/* NEWAUTOCOMP */
        } else
            C.tty_nhbell();
    }
    C.ttyDisplay.toplin = C.TOPLINE_NON_EMPTY;
    C.ttyDisplay.inread--;
    C.clear_nhwindow(C.WIN_MESSAGE); /* clean up after ourselves */

    if (C.getlineState.suppress_history) {
        /* prevent next message from pushing current query+answer into
           tty message history */
        C.HEAPU8[C.gt.toplines] = 0;
// #ifdef DUMPLOG_CORE
    } else {
        /* needed because we've bypassed pline() */
        C.dumplogmsg(C.gt.toplines);
// #endif
    }
}


export function xwaitforspace(s) /* chars allowed besides return */
{
    let c, x = C.ttyDisplay ? C.ttyDisplay.dismiss_more : 10;

    C.morc = 0;
    while (
// #ifdef HANGUPHANDLING
        !C.program_state.done_hup &&
// #endif
        (c = C.tty_nhgetch()) != C.EOF) {
        if (c == 10 || c == 13)
            break;

        if (C.iflags.cbreak) {
            if (c == 27) {
                if (C.ttyDisplay)
                    C.ttyDisplay.dismiss_more = 1;
                C.morc = 27;
                break;
            }
            if ((s && C.strchr(s, c)) || c == x || (x == 10 && c == 13)) {
                C.morc = C.char(c);
                break;
            }
            C.tty_nhbell();
        }
    }
}


/*
 * Implement extended command completion by using this hook into
 * tty_getlin.  Check the characters already typed, if they uniquely
 * identify an extended command, expand the string to the whole
 * command.
 *
 * Return TRUE if we've extended the string at base.  Otherwise return FALSE.
 * Assumptions:
 *
 *      + we don't change the characters that are already in base
 *      + base has enough room to hold our string
 */

export function ext_cmd_getlin_hook(base)
{
    let ecmatches = C.intPointerLocal();
    let nmatches = C.extcmds_match(base, C.ECM_NOFLAGS, ecmatches);

    if (nmatches == 1) {
        let ec = C.extcmds_getentry(ecmatches.value[0]);

        C.Strcpy(base, ec.ef_txt);
        return 1;
    }

    return 0; /* didn't match anything */
}


/*
 * Read in an extended command, doing command line completion.  We
 * stop when we have found enough characters to make a unique command.
 */

export function tty_get_ext_cmd()
{
    let buf = C.stackAlloc(C.BUFSZ);
    let nmatches;
    let ecmatches = C.intPointerLocal(0);
    let no_hook = 0;
    let extcmd_char = C.stackAlloc(2);

    if (C.iflags.extmenu)
        return C.extcmd_via_menu();

    C.getlineState.suppress_history = 1;
    /* maybe a runtime option?
     * hooked_tty_getlin("#", buf,
     *                   (flags.cmd_comp && !gi.in_doagain)
     *                      ? ext_cmd_getlin_hook
     *                      : (getlin_hook_proc) 0);
     */
    C.HEAPU8[extcmd_char] = C.extcmd_initiator(), C.HEAPU8[extcmd_char + 1] = 0;
    C.HEAPU8[buf] = 0;
    hooked_tty_getlin(extcmd_char, buf,
                      !C.gi.in_doagain ? ext_cmd_getlin_hook : no_hook);
    C.mungspaces(buf);

    nmatches = (C.HEAP8[buf] == 0 || C.HEAP8[buf] == 27) ? -1
              : C.extcmds_match(buf, C.ECM_IGNOREAC | C.ECM_EXACTMATCH, ecmatches);
    if (nmatches != 1) {
        if (nmatches != -1)
            C.pline("%s%.60s: unknown extended command.",
                  C.visctrl(C.HEAP8[extcmd_char]), buf);
        return -1;
    }

    return ecmatches.value[0];
}


// #endif 
/* TTY_GRAPHICS */


/*getline.c*/

