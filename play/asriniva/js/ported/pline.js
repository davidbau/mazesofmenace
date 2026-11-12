import { C } from '../c-runtime/context.js';
/* NetHack 5.0	pline.c	$NHDT-Date: 1719819280 2024/07/01 07:34:40 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.130 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2018. */
/* NetHack may be freely redistributed.  See license for details. */



/* big enough to format a 4*BUFSZ string (from
                              * config file parsing) with modest decoration;
                              * result will then be truncated to BUFSZ-1 */

/* keep the most recent DUMPLOG_MSG_COUNT messages */
export function dumplogmsg(line)
{
    /*
     * TODO:
     *  This essentially duplicates message history, which is
     *  currently implemented in an interface-specific manner.
     *  The core should take responsibility for that and have
     *  this share it.
     */
    let indx = C.gs.saved_pline_index; /* next slot to use */
    let oldest = C.gs.saved_plines[indx]; /* current content of that slot */

    if (!C.strncmp(line, "Unknown command", 15))
        return;
    if (oldest && C.strlen(oldest) >= C.strlen(line)) {
        /* this buffer will gradually shrink until the 'else' is needed;
           there's no pressing need to track allocation size instead */
        C.Strcpy(oldest, line);
    } else {
        if (oldest)
            C.free(oldest);
        C.gs.saved_plines[indx] = C.dupstr(line);
    }
    C.gs.saved_pline_index = (indx + 1) % C.DUMPLOG_MSG_COUNT;
}

/* called during save (unlike the interface-specific message history,
   this data isn't saved and restored); end-of-game releases saved_plines[]
   while writing its contents to the final dump log */
export function dumplogfreemessages()
{
    let i;

    for (i = 0; i < C.DUMPLOG_MSG_COUNT; ++i)
        if (C.gs.saved_plines[i])
            C.free(C.gs.saved_plines[i]), C.gs.saved_plines[i] = 0;
    C.gs.saved_pline_index = 0;
}

/* keeps windowprocs usage out of pline() */
export function putmesg(line)
{
    let attr = C.ATR_NONE;

    if (C.iflags.debug_prevent_pline)
        return;

    if ((C.gp.pline_flags & C.URGENT_MESSAGE) != 0
        && (C.windowprocs.wincap2 & BigInt(C.WC2_URGENT_MESG)) != 0)
        attr |= C.ATR_URGENT;
    if ((C.gp.pline_flags & C.SUPPRESS_HISTORY) != 0
        && (C.windowprocs.wincap2 & BigInt(C.WC2_SUPPRESS_HIST)) != 0)
        attr |= C.ATR_NOHISTORY;
    C.putstr(C.WIN_MESSAGE, attr, line);
    C.SoundSpeak(line);
}

/* set the direction where next message happens */
export function set_msg_dir(dir)
{
    C.dirtocoord(C.a11y.msg_loc, dir);
    C.a11y.msg_loc.x += C.u.ux;
    C.a11y.msg_loc.y += C.u.uy;
}

/* set the coordinate where next message happens */
export function set_msg_xy(x, y)
{
    C.a11y.msg_loc.x = x;
    C.a11y.msg_loc.y = y;
}



export function pline(line, ...the_args)
{

    vpline(line, the_args);
}

export function pline_dir(dir, line, ...the_args)
{

    set_msg_dir(dir);

    vpline(line, the_args);
}

export function pline_xy(x, y, line, ...the_args)
{

    set_msg_xy(x, y);

    vpline(line, the_args);
}

export function pline_mon(mtmp, line, ...the_args)
{

    if (C.samePtr(mtmp, C.gy.youmonst))
        set_msg_xy(0, 0);
    else
        set_msg_xy(mtmp.mx, mtmp.my);

    vpline(line, the_args);
}

export function vpline(line, the_args)
{
    const pbuf = C.stackAlloc(C.BIGBUFSZ); /* will get chopped down to BUFSZ-1 if longer */
    line = C.text(line);
    let ln;
    let msgtyp;
    let no_repeat;
    let a11y_mesgxy;

    a11y_mesgxy = {x:C.a11y.msg_loc.x,y:C.a11y.msg_loc.y}; /* save a11y.msg_loc before reseting it */
    /* always reset a11y.msg_loc whether we end up using it or not */
    C.a11y.msg_loc.x = C.a11y.msg_loc.y = 0;

    if (!line || !C.HEAPU8[line])
        return;
    if (C.program_state.done_hup)
        return;
    if (C.program_state.wizkit_wishing)
        return;

    /* when accessiblemsg is set and a11y.msg_loc is nonzero, use the latter
       to insert a location prefix in front of current message */
    if (C.a11y.accessiblemsg && C.isok(a11y_mesgxy.x, a11y_mesgxy.y)) {
        let tmp, dirstr; const dirstrbuf = C.stackAlloc(C.QBUFSZ);

        dirstr = C.coord_desc(a11y_mesgxy.x, a11y_mesgxy.y, dirstrbuf,
                            ((C.iflags.getpos_coords == C.GPCOORDS_NONE)
                             ? C.GPCOORDS_COMFULL : C.iflags.getpos_coords));
        tmp = C.alloc(C.strlen(line) + 3 + C.strlen(dirstr));
        C.Strcpy(tmp, dirstr);
        C.Strcat(tmp, ": ");
        C.Strcat(tmp, line);
        vpline(tmp, the_args);
        C.free(tmp);
        return;
    }

    if (!C.strchr(line, '%')) {
        /* format does not specify any substitutions; use it as-is */
        ln = C.int(C.strlen(line));
    } else if (C.HEAPU8[line + (0)] == 37 && C.HEAPU8[line + (1)] == 115 && !C.HEAPU8[line + (2)]) {
        /* "%s" => single string; skip format and use its first argument;
           unlike with the format, it is irrelevant whether the argument
           contains any percent signs */
        line = C.vaArgString(the_args); /*VA_NEXT(line,const char *);*/
        ln = C.int(C.strlen(line));
    } else {
        /* perform printf() formatting */
        ln = C.vsnprintf(pbuf, C.BIGBUFSZ, line, the_args);
        line = pbuf;
        /* note: 'ln' is number of characters attempted, not necessarily
           strlen(line); that matters for the overflow check; if we avoid
           the extremely-too-long panic then 'ln' will be actual length */
    }
    if (ln > C.BIGBUFSZ - 1) /* extremely too long */
        C.panic("pline attempting to print %d characters!", ln);

    if (ln > C.BUFSZ - 1) {
        /* too long but modestly so; allow but truncate, preserving final
           3 chars: "___ extremely long text" -> "___ extremely l...ext"
           (this may be suboptimal if overflow is less than 3) */
        if (line != pbuf) /* no '%' was present or format was just "%s" */
            C.strncpy(pbuf, line, C.BUFSZ - 1); /* caveat: unterminated */
        C.HEAPU8[pbuf + (C.BUFSZ - 1 - 6)] = C.HEAPU8[pbuf + (C.BUFSZ - 1 - 5)] = C.HEAPU8[pbuf + (C.BUFSZ - 1 - 4)] = 46;
        /* avoid strncpy; buffers could overlap if excess is small */
        C.HEAPU8[pbuf + (C.BUFSZ - 1 - 3)] = C.HEAPU8[line + (ln - 3)];
        C.HEAPU8[pbuf + (C.BUFSZ - 1 - 2)] = C.HEAPU8[line + (ln - 2)];
        C.HEAPU8[pbuf + (C.BUFSZ - 1 - 1)] = C.HEAPU8[line + (ln - 1)];
        C.HEAPU8[pbuf + (C.BUFSZ - 1)] = 0;
        line = pbuf;
    }
    msgtyp = C.MSGTYP_NORMAL;

    /* We hook here early to have options-agnostic output.
     * Unfortunately, that means Norep() isn't honored (general issue) and
     * that short lines aren't combined into one longer one (tty behavior).
     */
    if ((C.gp.pline_flags & C.SUPPRESS_HISTORY) == 0)
        dumplogmsg(line);
    /* use raw_print() if we're called too early (or perhaps too late
       during shutdown) or if we're being called recursively (probably
       via debugpline() in the interface code) */
    pline_done: {
    if (C.plineState.in_pline++ || !C.iflags.window_inited) {
        /* [we should probably be using raw_printf("\n%s", line) here] */
        C.raw_print(line);
        C.iflags.last_msg = C.PLNMSG_UNKNOWN;
        break pline_done;
    }

    no_repeat = (C.gp.pline_flags & C.PLINE_NOREPEAT) ? C.TRUE : C.FALSE;
    if ((C.gp.pline_flags & C.OVERRIDE_MSGTYPE) == 0) {
        msgtyp = C.msgtype_type(line, no_repeat);
        if ((C.gp.pline_flags & C.URGENT_MESSAGE) == 0
            && (msgtyp == C.MSGTYP_NOSHOW
                || (msgtyp == C.MSGTYP_NOREP && !C.strcmp(line, C.gp.prevmsg))))
            /* FIXME: we need a way to tell our caller that this message
             * was suppressed so that caller doesn't set iflags.last_msg
             * for something that hasn't been shown, otherwise a subsequent
             * message which uses alternate wording based on that would be
             * doing so out of context and probably end up seeming silly.
             * (Not an issue for no-repeat but matters for no-show.)
             */
            break pline_done;
    }

    if (C.gv.vision_full_recalc) {
        let tmp_in_pline = C.plineState.in_pline;

        C.plineState.in_pline = 0;
        C.vision_recalc(0);
        C.plineState.in_pline = tmp_in_pline;
    }
    if (C.u.ux)
        C.flush_screen((C.gp.pline_flags & C.NO_CURS_ON_U) ? 0 : 1); /* %% */

    putmesg(line);

    execplinehandler(line);

    /* this gets cleared after every pline message */
    C.iflags.last_msg = C.PLNMSG_UNKNOWN;
    C.strncpy(C.gp.prevmsg, line, C.BUFSZ), C.HEAPU8[C.gp.prevmsg + (C.BUFSZ - 1)] = 0;
    if (msgtyp == C.MSGTYP_STOP)
        C.display_nhwindow(C.WIN_MESSAGE, C.TRUE); /* --more-- */
 }
    --C.plineState.in_pline;
}


/* pline() variant which can override MSGTYPE handling or suppress
   message history (tty interface uses pline() to issue prompts and
   they shouldn't be blockable via MSGTYPE=hide) */
export function custompline(pflags, line, ...the_args)
{

    C.gp.pline_flags = C.unsigned(pflags);
    vpline(line, the_args);
    C.gp.pline_flags = 0;
}

/* if player has dismissed --More-- with ESC to suppress further messages
   until next input request, tell the interface that it should override that
   and re-enable them; equivalent to custompline(URGENT_MESSAGE, line, ...)
   but slightly simpler to use */
export function urgent_pline(line, ...the_args)
{

    C.gp.pline_flags = C.URGENT_MESSAGE;
    vpline(line, the_args);
    C.gp.pline_flags = 0;
}

export function Norep(line, ...the_args)
{

    C.gp.pline_flags = C.PLINE_NOREPEAT;
    vpline(line, the_args);
    C.gp.pline_flags = 0;
}

export function You_buf(siz)
{
    if (siz > C.gy.you_buf_siz) {
        if (C.gy.you_buf)
            C.free(C.gy.you_buf);
        C.gy.you_buf_siz = siz + 10;
        C.gy.you_buf = C.alloc(C.unsigned(C.gy.you_buf_siz));
    }
    return C.gy.you_buf;
}

export function free_youbuf()
{
    if (C.gy.you_buf)
        C.free(C.gy.you_buf), C.gy.you_buf = 0;
    C.gy.you_buf_siz = 0;
}

/* `prefix' must be a string literal, not a pointer */


export function You(line, ...the_args)
{
    let tmp;

    vpline(C.strcat((C.Strcpy((tmp = You_buf(C.int(C.strlen(line) + 5))), "You "), tmp), line), the_args);
}

export function Your(line, ...the_args)
{
    let tmp;

    vpline(C.strcat((C.Strcpy((tmp = You_buf(C.int(C.strlen(line) + 6))), "Your "), tmp), line), the_args);
}

export function You_feel(line, ...the_args)
{
    let tmp;

    if (C.Unaware)
        C.Strcpy((tmp = You_buf(C.int(C.strlen(line) + 25))), "You dream that you feel ");
    else
        C.Strcpy((tmp = You_buf(C.int(C.strlen(line) + 10))), "You feel ");
    vpline(C.strcat(tmp, line), the_args);
}

export function You_cant(line, ...the_args)
{
    let tmp;

    vpline(C.strcat((C.Strcpy((tmp = You_buf(C.int(C.strlen(line) + 11))), "You can't "), tmp), line), the_args);
}

export function pline_The(line, ...the_args)
{
    let tmp;

    vpline(C.strcat((C.Strcpy((tmp = You_buf(C.int(C.strlen(line) + 5))), "The "), tmp), line), the_args);
}

export function There(line, ...the_args)
{
    let tmp;

    vpline(C.strcat((C.Strcpy((tmp = You_buf(C.int(C.strlen(line) + 7))), "There "), tmp), line), the_args);
}

export function You_hear(line, ...the_args)
{
    let tmp;

    if ((C.Deaf && !C.Unaware) || !C.flags.acoustics)
        return;
    if (C.Underwater)
        C.Strcpy((tmp = You_buf(C.int(C.strlen(line) + 17))), "You barely hear ");
    else if (C.Unaware)
        C.Strcpy((tmp = You_buf(C.int(C.strlen(line) + 25))), "You dream that you hear ");
    else
        C.Strcpy((tmp = You_buf(C.int(C.strlen(line) + 10))), "You hear ");  /* Deaf-aware */
    vpline(C.strcat(tmp, line), the_args);
}

export function You_see(line, ...the_args)
{
    let tmp;

    if (C.Unaware)
        C.Strcpy((tmp = You_buf(C.int(C.strlen(line) + 24))), "You dream that you see ");
    else if (C.Blind) /* caller should have caught this... */
        C.Strcpy((tmp = You_buf(C.int(C.strlen(line) + 11))), "You sense ");
    else
        C.Strcpy((tmp = You_buf(C.int(C.strlen(line) + 9))), "You see ");
    vpline(C.strcat(tmp, line), the_args);
}

/* Print a message inside double-quotes.
 * The caller is responsible for checking deafness.
 * Gods can speak directly to you in spite of deafness.
 */
export function verbalize(line, ...the_args)
{
    let tmp;

    C.gp.pline_flags |= C.PLINE_VERBALIZE;
    tmp = You_buf(C.int(C.strlen(line) + 3));
    C.Strcpy(tmp, "\"");
    C.Strcat(tmp, line);
    C.Strcat(tmp, "\"");
    vpline(tmp, the_args);
    C.gp.pline_flags &= ~C.PLINE_VERBALIZE;
}


export function gamelog_add(glflags, gltime, str)
{
    let tmp;
    let lst = C.gg.gamelog;

    tmp = C.gamelog(C.alloc(C.gamelogSize));
    tmp.turn = gltime;
    tmp.flags = glflags;
    tmp.text = C.dupstr(str);
    tmp.next = 0;
    while (lst && lst.next)
        lst = lst.next;
    if (!lst)
        C.gg.gamelog = tmp;
    else
        lst.next = tmp;
}

export function livelog_printf(ll_type, line, ...the_args)
{
    const gamelogbuf = C.stackAlloc(C.BUFSZ * 2);

    C.vsnprintf(gamelogbuf, (C.BUFSZ * 2), line, the_args);

    gamelog_add(ll_type, C.svm.moves, gamelogbuf);
    C.strNsubst(gamelogbuf, "\t", "_", 0);
    C.livelog_add(ll_type, gamelogbuf);
}



export function raw_printf(line, ...the_args)
{

    vraw_printf(line, the_args);
    if (!C.program_state.beyond_savefile_load)
        C.ge.early_raw_messages++;
}


export function vraw_printf(line, the_args)
{
    const pbuf = C.stackAlloc(C.BIGBUFSZ); /* will be chopped down to BUFSZ-1 if longer */
    line = C.text(line);

    if (C.strchr(line, '%')) {
        C.vsnprintf(pbuf, C.BIGBUFSZ, line, the_args);
        line = pbuf;
    }
    if (C.int(C.strlen(line)) > C.BUFSZ - 1) {
        if (line != pbuf)
            line = C.strncpy(pbuf, line, C.BUFSZ - 1);
        /* unlike pline, we don't futz around to keep last few chars */
        C.HEAPU8[pbuf + (C.BUFSZ - 1)] = 0; /* terminate strncpy or truncate vsprintf */
    }
    C.raw_print(line);
    execplinehandler(line);
    if (!C.program_state.beyond_savefile_load)
        C.ge.early_raw_messages++;
}

export function impossible(s, ...the_args)
{
    const pbuf = C.stackAlloc(C.BIGBUFSZ); /* will be chopped down to BUFSZ-1 if longer */
    const pbuf2 = C.stackAlloc(C.BUFSZ);

    if (C.program_state.in_impossible)
        C.panic("impossible called impossible");

    C.program_state.in_impossible = 1;
    C.vsnprintf(pbuf, C.BIGBUFSZ, s, the_args);
    C.HEAPU8[pbuf + (C.BUFSZ - 1)] = 0; /* sanity */
    C.paniclog("impossible", pbuf);
    if (C.iflags.debug_fuzzer == C.fuzzer_impossible_panic)
        C.panic("%s", pbuf);

    C.gp.pline_flags = C.URGENT_MESSAGE;
    pline("%s", pbuf);
    C.gp.pline_flags = 0;

    if (C.program_state.in_sanity_check) {
        /* skip rest of multi-line feedback */
        C.program_state.in_impossible = 0;
        return;
    }

    C.Strcpy(pbuf2, "Program in disorder!");
    if (C.program_state.something_worth_saving)
        C.Strcat(pbuf2, "  (Saving and reloading may fix this problem.)");
    pline("%s", pbuf2);
    pline("Please report these messages to %s.", C.DEVTEAM_EMAIL);
    if (C.sysopt.support) {
        pline("Alternatively, contact local support: %s", C.sysopt.support);
    }

    if (C.sysopt.crashreporturl) {
        let report = (121 == C.yn_function("Report now?", C.ynchars,
                                             'n', C.FALSE));

        C.raw_print(""); /* prove to the user the character was accepted */
        if (report) {
            C.submit_web_report(1, "Impossible", pbuf);
        }
    }

    C.program_state.in_impossible = 0;
}




export function execplinehandler(line)
{
    let f;
    const args = C.pointerArrayLocal(3);

    if (!C.plineState.use_pline_handler || !C.sysopt.msghandler)
        return;

    f = C.fork();
    if (f == 0) { /* child */
        args[0] = C.sysopt.msghandler;
        args[1] = line;
        args[2] = 0;
        C.setgid(C.getgid());
        C.setuid(C.getuid());
        C.execv(args[0], args);
        C.perror(0);
        C.fprintf(C.stderr, "Exec to message handler %s failed.\n", C.sysopt.msghandler);
        C.nh_terminate(C.EXIT_FAILURE);
    } else if (f > 0) {
        const status = C.intLocal();

        C.waitpid(f, status.address, 0);
    } else if (f == -1) {
        C.perror(0);
        C.plineState.use_pline_handler = C.FALSE;
        pline("%s", "Fork to message handler failed.");
    }
}

/* nhassert_failed is called when an nhassert's condition is false */
export function nhassert_failed(expression, filepath, line)
{
    let filename, p;

    /* Attempt to get filename from path.
       TODO: we really need a port provided function to return a filename
       from a path. */
    filename = filepath;
    if ((p = C.strrchr(filename, '/')) != 0)
        filename = p + 1;
    if ((p = C.strrchr(filename, '\\')) != 0)
        filename = p + 1;

    impossible("nhassert(%s) failed in file '%s' at line %d",
               expression, filename, line);
}

/*pline.c*/
// Original comments attached to inactive platform/macro declarations:


/* clear the SPEECH flag so caller never has to */
/* nothing here */
/* !CHRONICLE */
/* -Wunused-but-set-variable */
/* usually "device:[directory]name"
       but might be "device:[root.][directory]name"
       and either "[directory]" or "[root.]" or both can be delimited
       by <> rather than by []; find the last of ']', '>', and ':'  */

