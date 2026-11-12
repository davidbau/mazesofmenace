/* NetHack 5.0	windows.c	$NHDT-Date: 1737345149 2025/01/19 19:52:29 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.138 $ */
/* Copyright (c) D. Cohrs, 1993. */
/* NetHack may be freely redistributed.  See license for details. */

import {C} from '../c-runtime/context.js';

export const winchoices = [

    [ "tty_procs", "win_tty_init" ],










































    [ 0, 0 ] /* must be last */
];

export function genl_can_suspend_no()
{
    return C.FALSE;
}

export function genl_can_suspend_yes()
{
    return C.TRUE;
}

export function def_raw_print(s)
{
    C.puts(s);
    if (C.loadChar(s))
        C.iflags.raw_printed++;
}

export function def_wait_synch()
{
    /* Config file error handling routines
     * call wait_sync() without checking to
     * see if it actually has a value,
     * leading to spectacular violations
     * when you try to execute address zero.
     * The existence of this allows early
     * processing to have something to execute
     * even though it essentially does nothing
     */
     return;
}


export function check_tty_wincap(wincap)
{
    let wc = win_choices_find("tty");

    if (wc)
        return ((wc.procs.wincap & wincap) == wincap);
    return C.FALSE;
}

export function check_tty_wincap2(wincap2)
{
    let wc = win_choices_find("tty");

    if (wc)
        return ((wc.procs.wincap2 & wincap2) == wincap2);
    return C.FALSE;
}



export function win_choices_find(s)
{
    let i;

    for (i = 0; C.winchoices[i].procs; i++) {
        if (!C.strcmpi(s, C.winchoices[i].procs.name)) {
            return C.winchoices[i];
        }
    }
    return 0;
}


export function choose_windows(s)
{
    let i;
    let tmps = 0;

    for (i = 0; C.winchoices[i].procs; i++) {
        if (43 == C.loadChar(C.winchoices[i].procs.name))
            continue;
        if (45 == C.loadChar(C.winchoices[i].procs.name))
            continue;
        if (!C.strcmpi(s, C.winchoices[i].procs.name)) {
            C.copyProcs(C.windowprocs, C.winchoices[i].procs);

            if (C.gl.last_winchoice && C.gl.last_winchoice.ini_routine)
                C.callInit(C.gl.last_winchoice.ini_routine, C.WININIT_UNDO);
            if (C.winchoices[i].ini_routine)
                C.callInit(C.winchoices[i].ini_routine, C.WININIT);
            C.gl.last_winchoice = C.winchoices[i];
            return;
        }
    }

    if (!C.windowprocs.win_raw_print)
        C.windowprocs.win_raw_print = C.functionAddress("def_raw_print");
    if (!C.windowprocs.win_wait_synch)
        /* early config file error processing routines call this */
        C.windowprocs.win_wait_synch = C.functionAddress("def_wait_synch");

    if (!C.winchoices[0].procs) {
        C.raw_printf("No window types supported?");
        C.nh_terminate(C.EXIT_FAILURE);
    }
    /* 50: arbitrary, no real window_type names are anywhere near that long;
       used to prevent potential raw_printf() overflow if user supplies a
       very long string (on the order of 1200 chars) on the command line
       (config file options can't get that big; they're truncated at 1023) */
    if (C.strlen(s) >= 50) {
        tmps = C.alloc(50);
        C.strncpy(tmps, s, 50 - 1);
        C.storeChar(tmps + 50 - 1, 0);
        s = tmps;
    }

    if (!C.winchoices[1].procs) {
        C.config_error_add(
                     "Window type %s not recognized.  The only choice is: %s",
                         s, C.winchoices[0].procs.name);
    } else {
        const buf = C.stackAlloc(C.BUFSZ);
        let first = C.TRUE;

        C.storeChar(buf, 0);
        for (i = 0; C.winchoices[i].procs; i++) {
            if (43 == C.loadChar(C.winchoices[i].procs.name))
                continue;
            if (45 == C.loadChar(C.winchoices[i].procs.name))
                continue;
            C.Sprintf(C.eos(buf), "%s%s",
                    first ? "" : ", ", C.winchoices[i].procs.name);
            first = C.FALSE;
        }
        C.config_error_add("Window type %s not recognized.  Choices are:  %s",
                         s, buf);
    }
    if (tmps)
        C.free(tmps) /*, tmps = 0*/ ;

    if (C.windowprocs.win_raw_print == C.functionAddress("def_raw_print"))
        C.nh_terminate(C.EXIT_SUCCESS);
}










































































































/*
 * tty_message_menu() provides a means to get feedback from the
 * --More-- prompt; other interfaces generally don't need that.
 */
/*ARGSUSED*/
export function genl_message_menu(let_, how, mesg)
{
    C.pline("%s", mesg);
    return 0;
}

/*ARGSUSED*/
export function genl_preference_update(pref)
{
    /* window ports are expected to provide
       their own preference update routine
       for the preference capabilities that
       they support.
       Just return in this genl one. */
    return;
}

export function genl_getmsghistory(init)
{
    /* window ports can provide
       their own getmsghistory() routine to
       preserve message history between games.
       The routine is called repeatedly from
       the core save routine, and the window
       port is expected to successively return
       each message that it wants saved, starting
       with the oldest message first, finishing
       with the most recent.
       Return null pointer when finished.
     */
    return 0;
}

export function genl_putmsghistory(msg, is_restoring)
{
    /* window ports can provide
       their own putmsghistory() routine to
       load message history from a saved game.
       The routine is called repeatedly from
       the core restore routine, starting with
       the oldest saved message first, and
       finishing with the latest.
       The window port routine is expected to
       load the message recall buffers in such
       a way that the ordering is preserved.
       The window port routine should make no
       assumptions about how many messages are
       forthcoming, nor should it assume that
       another message will follow this one,
       so it should keep all pointers/indexes
       intact at the end of each call.
    */

    /* this doesn't provide for reloading the message window with the
       previous session's messages upon restore, but it does put the quest
       message summary lines there by treating them as ordinary messages */
    if (!is_restoring)
        C.pline("%s", msg);
    return;
}


/*
 * Dummy windowing scheme used to replace current one with no-ops
 * in order to avoid all terminal I/O after hangup/disconnect.
 */





































export const hup_procs = [
    "hup", {c:"wp_hup"}, 0n, 0n,
    [ false, false, false, false, false, false, false, false,
      false, false, false, false, false, false, false, false ], /* colors */
    hup_init_nhwindows,
    hup_void_ndecl,                                    /* player_selection */
    hup_void_ndecl,                                    /* askname */
    hup_void_ndecl,                                    /* get_nh_event */
    hup_exit_nhwindows, hup_void_fdecl_constchar_p,    /* suspend_nhwindows */
    hup_void_ndecl,                                    /* resume_nhwindows */
    hup_create_nhwindow, hup_void_fdecl_winid,         /* clear_nhwindow */
    hup_display_nhwindow, hup_void_fdecl_winid,        /* destroy_nhwindow */
    hup_curs, hup_putstr, hup_putstr,                  /* putmixed */
    hup_display_file, hup_void_fdecl_winid_ulong,      /* start_menu */
    hup_add_menu, hup_end_menu, hup_select_menu, genl_message_menu,
    hup_void_ndecl,                                    /* mark_synch */
    hup_void_ndecl,                                    /* wait_synch */

    hup_cliparound,




    hup_print_glyph,
    hup_void_fdecl_constchar_p,                       /* raw_print */
    hup_void_fdecl_constchar_p,                       /* raw_print_bold */
    hup_nhgetch, hup_nh_poskey, hup_void_ndecl,       /* nhbell  */
    hup_int_ndecl,                                    /* doprev_message */
    hup_yn_function, hup_getlin, hup_int_ndecl,       /* get_ext_cmd */
    hup_void_fdecl_int,                               /* number_pad */
    hup_void_ndecl,                                   /* nh_delay_output  */








    hup_outrip, genl_preference_update, genl_getmsghistory,
    genl_putmsghistory,
    hup_void_ndecl,                                   /* status_init */
    hup_void_ndecl,                                   /* status_finish */
    genl_status_enablefield, hup_status_update,
    genl_can_suspend_no,
    hup_void_fdecl_int,                               /* update_inventory */
    hup_ctrl_nhwindow,
];

export const previnterface_exit_nhwindows=0;

/* hangup has occurred; switch to no-op user interface */
export function nhwindows_hangup()
{
    let previnterface_getmsghistory = 0;


    /* command processor shouldn't look for 2nd char after seeing ESC */
    C.iflags.altmeta = C.FALSE;


    /* don't call exit_nhwindows() directly here; if a hangup occurs
       while interface code is executing, exit_nhwindows could knock
       the interface's active data structures out from under itself */
    if (C.iflags.window_inited
        && C.windowprocs.win_exit_nhwindows != C.functionAddress("hup_exit_nhwindows"))
        C.windowsState.previnterface_exit_nhwindows = C.windowprocs.win_exit_nhwindows;

    /* also, we have to leave the old interface's getmsghistory()
       in place because it will be called while saving the game */
    if (C.windowprocs.win_getmsghistory != hup_procs.win_getmsghistory)
        previnterface_getmsghistory = C.windowprocs.win_getmsghistory;

    C.copyProcs(C.windowprocs, C.hup_procs);

    if (previnterface_getmsghistory)
        C.windowprocs.win_getmsghistory = previnterface_getmsghistory;
}

export function hup_exit_nhwindows(lastgasp)
{
    /* core has called exit_nhwindows(); call the previous interface's
       shutdown routine now; xxx_exit_nhwindows() needs to call other
       xxx_ routines directly rather than through windowprocs pointers */
    if (C.windowsState.previnterface_exit_nhwindows) {
        lastgasp = 0; /* don't want exit routine to attempt extra output */
        C.callExit(C.windowsState.previnterface_exit_nhwindows, lastgasp);
        C.windowsState.previnterface_exit_nhwindows = 0;
    }
    C.iflags.window_inited = C.FALSE;
}

export function hup_nhgetch()
{
    return 27; /* ESC */
}

/*ARGSUSED*/
export function hup_yn_function(prompt, resp, deflt)
{
    if (!deflt)
        deflt = 27;
    return deflt;
}

/*ARGSUSED*/
export function hup_nh_poskey(x, y, mod)
{
    return 27;
}

/*ARGSUSED*/
export function hup_getlin(prompt, outbuf)
{
    C.Strcpy(outbuf, "\x1b");
}

/*ARGSUSED*/
export function hup_init_nhwindows(argc_p, argv)
{
    C.iflags.window_inited = C.TRUE;
}

/*ARGUSED*/
export function hup_create_nhwindow(type)
{
    return C.WIN_ERR;
}

/*ARGSUSED*/
export function hup_select_menu(window, how, menu_list)
{
    return -1;
}

/*ARGSUSED*/
export function hup_add_menu(window, glyphinfo, identifier, sel, grpsel, attr, clr, txt, itemflags)
{
    return;
}

/*ARGSUSED*/
export function hup_end_menu(window, prompt)
{
    return;
}

/*ARGSUSED*/
export function hup_putstr(window, attr, text)
{
    return;
}

/*ARGSUSED*/
export function hup_print_glyph(window, x, y, glyphinfo, bkglyphinfo)
{
    return;
}

/*ARGSUSED*/
export function hup_outrip(tmpwin, how, when)
{
    return;
}

/*ARGSUSED*/
export function hup_curs(window, x, y)
{
    return;
}

/*ARGSUSED*/
export function hup_display_nhwindow(window, blocking)
{
    return;
}

/*ARGSUSED*/
export function hup_display_file(fname, complain)
{
    return;
}


/*ARGSUSED*/
export function hup_cliparound(x, y)
{
    return;
}


























/*ARGSUSED*/
export function hup_status_update(idx, ptr, chg, pc, color, colormasks)
{
    return;
}

/*
 * Non-specific stubs.
 */

export function hup_int_ndecl()
{
    return -1;
}

export function hup_void_ndecl()
{
    return;
}

/*ARGUSED*/
export function hup_void_fdecl_int(arg)
{
    return;
}

/*ARGUSED*/
export function hup_void_fdecl_winid(window)
{
    return;
}

/*ARGUSED*/
export function hup_void_fdecl_winid_ulong(window, mbehavior)
{
    return;
}

/*ARGUSED*/
export function hup_void_fdecl_constchar_p(string)
{
    return;
}

/*ARGUSED*/
export function hup_ctrl_nhwindow(window, request, wri)
/* window to use, must be of type NHW_MENU */
{
    return 0;
}




/****************************************************************************/
/* genl backward compat stuff                                               */
/****************************************************************************/






export function genl_status_init()
{
    let i;

    for (i = 0; i < C.MAXBLSTATS; ++i) {
        C.status_vals[i] = C.alloc(C.MAXCO);
        C.storeChar(C.status_vals[i], 0);
        C.status_activefields[i] = C.FALSE;
        C.status_fieldfmt[i] = 0;
    }
    /* Use a window for the genl version; backward port compatibility */
    C.WIN_STATUS = C.create_nhwindow(C.NHW_STATUS);
    C.display_nhwindow(C.WIN_STATUS, C.FALSE);
}

export function genl_status_finish()
{
    /* tear down routine */
    let i;

    /* free alloc'd memory here */
    for (i = 0; i < C.MAXBLSTATS; ++i) {
        if (C.status_vals[i])
            C.free(C.status_vals[i]), C.status_vals[i] = 0;
    }
}

export function genl_status_enablefield(fieldidx, nm, fmt, enable)
{
    C.status_fieldfmt[fieldidx] = fmt;
    C.status_fieldnm[fieldidx] = nm;
    C.status_activefields[fieldidx] = enable;
}


/* call once for each field, then call with BL_FLUSH to output the result */
export function genl_status_update(idx, ptr, chg, percent, color, colormasks)
{
    const newbot1 = C.stackAlloc(C.MAXCO), newbot2 = C.stackAlloc(C.MAXCO);
    let cond, condptr = ptr;
    let i;
    let pass, lndelta;
    let idx1, idx2, fieldlist;
    let nb, text = ptr;

    const fieldorder = C.staticData("genl_status_update.fieldorder", ()=>[
        /* line one */
        [ C.BL_TITLE, C.BL_STR, C.BL_DX, C.BL_CO, C.BL_IN, C.BL_WI, C.BL_CH, C.BL_ALIGN,
          C.BL_SCORE, C.BL_FLUSH, C.BL_FLUSH, C.BL_FLUSH, C.BL_FLUSH, C.BL_FLUSH,
          C.BL_FLUSH ],
        /* line two, default order */
        [ C.BL_LEVELDESC, C.BL_GOLD,
          C.BL_HP, C.BL_HPMAX, C.BL_ENE, C.BL_ENEMAX, C.BL_AC,
          C.BL_XP, C.BL_EXP, C.BL_HD,
          C.BL_TIME,
          C.BL_HUNGER, C.BL_CAP, C.BL_CONDITION,
          C.BL_FLUSH ],
        /* move time to the end */
        [ C.BL_LEVELDESC, C.BL_GOLD,
          C.BL_HP, C.BL_HPMAX, C.BL_ENE, C.BL_ENEMAX, C.BL_AC,
          C.BL_XP, C.BL_EXP, C.BL_HD,
          C.BL_HUNGER, C.BL_CAP, C.BL_CONDITION,
          C.BL_TIME, C.BL_FLUSH ],
        /* move experience and time to the end */
        [ C.BL_LEVELDESC, C.BL_GOLD,
          C.BL_HP, C.BL_HPMAX, C.BL_ENE, C.BL_ENEMAX, C.BL_AC,
          C.BL_HUNGER, C.BL_CAP, C.BL_CONDITION,
          C.BL_XP, C.BL_EXP, C.BL_HD, C.BL_TIME, C.BL_FLUSH ],
        /* move level description plus gold and experience and time to end */
        [ C.BL_HP, C.BL_HPMAX, C.BL_ENE, C.BL_ENEMAX, C.BL_AC,
          C.BL_HUNGER, C.BL_CAP, C.BL_CONDITION,
          C.BL_LEVELDESC, C.BL_GOLD, C.BL_XP, C.BL_EXP, C.BL_HD, C.BL_TIME, C.BL_FLUSH ],
    ]);

    /* in case interface is using genl_status_update() but has not
       specified WC2_FLUSH_STATUS (status_update() for field values
       is buffered so final BL_FLUSH is needed to produce output) */
    C.windowprocs.wincap2 |= C.WC2_FLUSH_STATUS;

    if (idx >= 0) {
        if (!C.status_activefields[idx])
            return;
        switch (idx) {
        case C.BL_CONDITION:
            cond = condptr ? C.loadLong(condptr) : 0n;
            nb = C.status_vals[idx];
            C.storeChar(nb, 0);
            if (cond & C.BL_MASK_STONE)
                C.Strcpy(nb = C.eos(nb), " Stone");
            if (cond & C.BL_MASK_SLIME)
                C.Strcpy(nb = C.eos(nb), " Slime");
            if (cond & C.BL_MASK_STRNGL)
                C.Strcpy(nb = C.eos(nb), " Strngl");
            if (cond & C.BL_MASK_FOODPOIS)
                C.Strcpy(nb = C.eos(nb), " FoodPois");
            if (cond & C.BL_MASK_TERMILL)
                C.Strcpy(nb = C.eos(nb), " TermIll");
            if (cond & C.BL_MASK_BLIND)
                C.Strcpy(nb = C.eos(nb), " Blind");
            if (cond & C.BL_MASK_DEAF)
                C.Strcpy(nb = C.eos(nb), " Deaf");
            if (cond & C.BL_MASK_STUN)
                C.Strcpy(nb = C.eos(nb), " Stun");
            if (cond & C.BL_MASK_CONF)
                C.Strcpy(nb = C.eos(nb), " Conf");
            if (cond & C.BL_MASK_HALLU)
                C.Strcpy(nb = C.eos(nb), " Hallu");
            if (cond & C.BL_MASK_LEV)
                C.Strcpy(nb = C.eos(nb), " Lev");
            if (cond & C.BL_MASK_FLY)
                C.Strcpy(nb = C.eos(nb), " Fly");
            if (cond & C.BL_MASK_RIDE)
                C.Strcpy(nb = C.eos(nb), " Ride");
            break;
        default:
            C.Sprintf(C.status_vals[idx],
                    C.status_fieldfmt[idx] ? C.status_fieldfmt[idx] : "%s",
                    text ? text : "");
            break;
        }
        return; /* processed one field other than BL_FLUSH */
    } /* (idx >= 0, thus not BL_FLUSH, BL_RESET, BL_CHARACTERISTICS) */

    /* does BL_RESET require any specific code to ensure all fields ? */

    if (!(idx == C.BL_FLUSH || idx == C.BL_RESET))
        return;

    /* We've received BL_FLUSH; time to output the gathered data */
    nb = newbot1;
    C.storeChar(nb, 0);
    /* BL_FLUSH is the only pseudo-index value we need to check for
       in the loop below because it is the only entry used to pad the
       end of the fieldorder array. We could stop on any
       negative (illegal) index, but this should be fine */
    for (i = 0; (idx1 = fieldorder[0][i]) != C.BL_FLUSH; ++i) {
        if (C.status_activefields[idx1])
            C.Strcpy(nb = C.eos(nb), C.status_vals[idx1]);
    }
    /* if '$' is encoded, buffer length of \GXXXXNNNN is 9 greater than
       single char; we want to subtract that 9 when checking display length */
    lndelta = (C.status_activefields[C.BL_GOLD]
               && C.strstr(C.status_vals[C.BL_GOLD], "\\G")) ? 9 : 0;
    /* basic bot2 formats groups of second line fields into five buffers,
       then decides how to order those buffers based on comparing lengths
       of [sub]sets of them to the width of the map; we have more control
       here but currently emulate that behavior */
    for (pass = 1; pass <= 4; pass++) {
        fieldlist = fieldorder[pass];
        nb = newbot2;
        C.storeChar(nb, 0);
        for (i = 0; (idx2 = fieldlist[i]) != C.BL_FLUSH; ++i) {
            if (C.status_activefields[idx2]) {
                let val = C.status_vals[idx2];

                switch (idx2) {
                case C.BL_HP: /* for pass 4, Hp comes first; mungspaces()
                               will strip the unwanted leading spaces */
                case C.BL_XP: case C.BL_HD:
                case C.BL_TIME:
                    C.Strcpy(nb = C.eos(nb), " ");
                    break;
                case C.BL_LEVELDESC:
                    /* leveldesc has no leading space, so if we've moved
                       it past the first position, provide one */
                    if (i != 0)
                        C.Strcpy(nb = C.eos(nb), " ");
                    break;
                /*
                 * We want "  hunger encumbrance conditions"
                 *   or    "  encumbrance conditions"
                 *   or    "  hunger conditions"
                 *   or    "  conditions"
                 * 'hunger'      is either " " or " hunger_text";
                 * 'encumbrance' is either " " or " encumbrance_text";
                 * 'conditions'  is either ""  or " cond1 cond2...".
                 */
                case C.BL_HUNGER:
                    /* hunger==" " - keep it, end up with " ";
                       hunger!=" " - insert space and get "  hunger" */
                    if (C.strcmp(val, " "))
                        C.Strcpy(nb = C.eos(nb), " ");
                    break;
                case C.BL_CAP:
                    /* cap==" " - suppress it, retain "  hunger" or " ";
                       cap!=" " - use it, get "  hunger cap" or "  cap" */
                    if (!C.strcmp(val, " "))
                        ++val;
                    break;
                default:
                    break;
                }
                C.Strcpy(nb = C.eos(nb), val); /* status_vals[idx2] */
            } /* status_activefields[idx2] */

            if (idx2 == C.BL_CONDITION && pass < 4
                && BigInt.asUintN(64, C.strlen(newbot2) - BigInt(lndelta)) > BigInt(C.COLNO))
                break; /* switch to next order */
        } /* i */

        if (idx2 == C.BL_FLUSH) { /* made it past BL_CONDITION */
            if (pass > 1)
                C.mungspaces(newbot2);
            break;
        }
    } /* pass */
    C.curs(C.WIN_STATUS, 1, 0);
    C.putstr(C.WIN_STATUS, 0, newbot1);
    C.curs(C.WIN_STATUS, 1, 1);
    C.putmixed(C.WIN_STATUS, 0, newbot2); /* putmixed() due to GOLD glyph */
}



export const dumplog_file=0;


























































































































export function dump_open_log(now)
{
















    C.nhUse(now);

}

export function dump_close_log()
{
    if (C.windowsState.dumplog_file) {
        C.fclose(C.windowsState.dumplog_file);
        C.windowsState.dumplog_file = 0;
    }
}

export function dump_forward_putstr(win, attr, str, no_forward)
{
    if (C.windowsState.dumplog_file)
        C.fprintf(C.windowsState.dumplog_file, "%s\n", str);
    if (!no_forward)
        C.putstr(win, attr, str);
}

/*ARGSUSED*/
export function dump_putstr(win, attr, str)
{
    if (C.windowsState.dumplog_file)
        C.fprintf(C.windowsState.dumplog_file, "%s\n", str);
}

export function dump_create_nhwindow(type)
{
    return C.WIN_ERR;
}

/*ARGUSED*/
export function dump_clear_nhwindow(win)
{
    return;
}

/*ARGSUSED*/
export function dump_display_nhwindow(win, p)
{
    return;
}

/*ARGUSED*/
export function dump_destroy_nhwindow(win)
{
    return;
}

/*ARGUSED*/
export function dump_start_menu(win, mbehavior)
{
    return;
}

/*ARGSUSED*/
export function dump_add_menu(win, glyphinfo, identifier, ch, gch, attr, clr, str, itemflags)
{
    if (C.windowsState.dumplog_file) {
        if (glyphinfo.glyph == C.NO_GLYPH)
            C.fprintf(C.windowsState.dumplog_file, " %s\n", str);
        else
            C.fprintf(C.windowsState.dumplog_file, "  %c - %s\n", ch, str);
    }
}

/*ARGSUSED*/
export function dump_end_menu(win, str)
{
    if (C.windowsState.dumplog_file) {
        if (str)
            C.fprintf(C.windowsState.dumplog_file, "%s\n", str);
        else
            C.fputs("\n", C.windowsState.dumplog_file);
    }
}

export function dump_select_menu(win, how, item)
{
    item.value = 0;
    return 0;
}

export function dump_redirect(onoff_flag)
{
    if (C.windowsState.dumplog_file) {
        if (onoff_flag) {
            C.windowprocs.win_create_nhwindow = C.functionAddress("dump_create_nhwindow");
            C.windowprocs.win_clear_nhwindow = C.functionAddress("dump_clear_nhwindow");
            C.windowprocs.win_display_nhwindow = C.functionAddress("dump_display_nhwindow");
            C.windowprocs.win_destroy_nhwindow = C.functionAddress("dump_destroy_nhwindow");
            C.windowprocs.win_start_menu = C.functionAddress("dump_start_menu");
            C.windowprocs.win_add_menu = C.functionAddress("dump_add_menu");
            C.windowprocs.win_end_menu = C.functionAddress("dump_end_menu");
            C.windowprocs.win_select_menu = C.functionAddress("dump_select_menu");
            C.windowprocs.win_putstr = C.functionAddress("dump_putstr");
        } else {
            C.copyProcs(C.windowprocs, C.dumplog_windowprocs_backup);
        }
        C.iflags.in_dumplog = onoff_flag;
    } else {
        C.iflags.in_dumplog = C.FALSE;
    }
}









export function has_color(color)
{
    return !!(C.iflags.use_color && C.windowprocs.name
            && (C.windowprocs.wincap & C.WC_COLOR) && C.windowprocs.has_color[color]





    );
}

export function glyph2ttychar(glyph)
{
    const glyphinfo = C.localGlyph();

    C.map_glyphinfo(0, 0, glyph, 0, glyphinfo);
    return glyphinfo.ttychar;
}

export function glyph2symidx(glyph)
{
    const glyphinfo = C.localGlyph();

    C.map_glyphinfo(0, 0, glyph, 0, glyphinfo);
    return glyphinfo.gm.sym.symidx;
}

export function encglyph(glyph)
{
    const encbuf = C.encbuf; /* 10+1 would suffice */

    C.Sprintf(encbuf, "\\G%04X%04X", C.svc.context.rndencode, glyph);
    return encbuf;
}

/* hexdd[] is defined in decl.c */

export function decode_glyph(str, glyph_ptr)
{
    let rndchk = 0, dcount = 0, retval = 0;
    let dp;

    for (; C.loadChar(str) && ++dcount <= 4; ++str) {
        if ((dp = C.strchr(C.hexdd, C.loadChar(str))) != 0) {
            retval++;
            rndchk = (rndchk * 16) + Math.trunc((dp - C.hexdd) / 2);
        } else
            break;
    }
    if (rndchk == C.svc.context.rndencode) {
        glyph_ptr.value = dcount = 0;
        for (; C.loadChar(str) && ++dcount <= 4; ++str) {
            if ((dp = C.strchr(C.hexdd, C.loadChar(str))) != 0) {
                retval++;
                glyph_ptr.value = (glyph_ptr.value * 16) + Math.trunc((dp - C.hexdd) / 2);
            } else
                break;
        }
        return retval;
    }
    return 0;
}

export function decode_mixed(buf, str)
{
    let put = buf;
    const glyphinfo = C.localGlyph(C.nul_glyphinfo);

    if (!str)
        return C.strcpy(buf, "");

    while (C.loadChar(str)) {
        if (C.loadChar(str) == 92) {
            let dcount, so; const ggv = C.intLocal(0);
            let save_str;

            save_str = str++;
            switch (C.loadChar(str)) {
            case 71: /* glyph value \GXXXXNNNN*/
                if ((dcount = decode_glyph(str + 1, ggv))) {
                    str += (dcount + 1);
                    C.map_glyphinfo(0, 0, ggv.value, 0, glyphinfo);
                    so = glyphinfo.gm.sym.symidx;
                    C.storeChar(put++, C.gs.showsyms[so]);
                    /* 'str' is ready for the next loop iteration and '*str'
                       should not be copied at the end of this iteration */
                    continue;
                } else {
                    /* possible forgery - leave it the way it is */
                    str = save_str;
                }
                break;
            case 92:
                break;
            case 0:
                /* String ended with '\\'.  This can happen when someone
                   names an object with a name ending with '\\', drops the
                   named object on the floor nearby and does a look at all
                   nearby objects. */
                /* brh - should we perhaps not allow things to have names
                   that contain '\\' */
                str = save_str;
                break;
            }
        }
        C.storeChar(put++, C.loadChar(str++));
    }
    C.storeChar(put, 0);
    return buf;
}


/*
 * This differs from putstr() because the str parameter can
 * contain a sequence of characters representing:
 *        \GXXXXNNNN    a glyph value, encoded by encglyph().
 *
 * For window ports that haven't yet written their own
 * XXX_putmixed() routine, this general one can be used.
 * It replaces the encoded glyph sequence with a single
 * showsyms[] char, then just passes that string onto
 * putstr().
 */

export function genl_putmixed(window, attr, str)
{
    const buf = C.stackAlloc(C.BUFSZ);

    /* now send it to the normal putstr */
    C.putstr(window, attr, C.callLocal(decode_mixed, buf, str));
}

/* possibly called to show usage info during command line processing when
   an interface hasn't yet been chosen and set up */
export function genl_display_file(fname, complain)
{
    const buf = C.stackAlloc(C.BUFSZ);
    let f = C.dlb_fopen(fname, "r");

    if (!f) {
        if (complain) /* send complaint to stdout rather than to stderr */
            C.fprintf(C.stdout, "\nCannot open \"%s\".\n", fname);
    } else {
        /* straight copy to stdout, no pagination or other interaction */
        while (C.dlb_fgets(buf, C.BUFSZ, f)) {
            if (C.fputs(buf, C.stdout) < 0)
                break;
        }
        C.dlb_fclose(f);
    }
}

/*
 * Window port helper function for menu invert routines to move the decision
 * logic into one place instead of 7 different window-port routines.
 */
export function menuitem_invert_test(mode, itemflags, is_selected)
/* 0: invert; 1: select; 2: deselect */
/* itemflags for the item */
/* current selection status of the item */
{
    let skipinvert = (itemflags & C.MENU_ITEMFLAGS_SKIPINVERT) != 0;

    if (!skipinvert) /* if not flagged SKIPINVERT, always pass test */
        return C.TRUE;
    /*
     * mode 0: inverting current on/off state;
     *      1: unconditionally setting on;
     *      2: unconditionally setting off.
     * menuinvertmode 0: treat entries flagged with skipinvert as ordinary
     *                   (same as if not flagged);
     * menuinvertmode 1: don't toggle bulk invert or bulk select entries On;
     *                   allow toggling to Off (for invert and deselect;
     *                   select doesn't do Off);
     * menuinvertmode 2: don't toggle skipinvert entries either On or Off
     *                   when any bulk change is performed.
     */
    if (C.iflags.menuinvertmode == 2) {
        return C.FALSE;
    } else if (C.iflags.menuinvertmode == 1) {
        return is_selected ? C.TRUE : C.FALSE;
    }
    return C.TRUE;
}

/*
 * helper routine if a window port wants to extract the glyph
 * information from a glyph number representation in the string;
 * the returned string is the remainder of the string after
 * extracting the \GNNNNNNNN information. The glyph details,
 * including the utf8 representation under ENHANCED_SYMBOLS,
 * will be stored in the glyph_info struct pointed to by gip.
 */
export function mixed_to_glyphinfo(str, gip)
{
    let dcount; const ggv = C.intLocal(0);

    if (!str || !gip)
        return " ";

    C.copyGlyph(gip, C.nul_glyphinfo);
    if (C.loadChar(str) == 92 && C.loadChar(str, 1) == 71) {
        if ((dcount = decode_glyph(str + 2, ggv))) {
            C.map_glyphinfo(0, 0, ggv.value, 0, gip);
            /* 'str' is ready for the next loop iteration and
                '*str' should not be copied at the end of this
                iteration */
            str += (dcount + 2);
        }
    }
    return str;
}

/*
 * This is a somewhat generic menu for taking a list of NetHack style
 * class choices and presenting them via a description
 * rather than the traditional NetHack characters.
 * (Benefits users whose first exposure to NetHack is via tiles).
 *
 * prompt
 *           The title at the top of the menu.
 *
 * category: 0 = monster class
 *           1 = object  class
 *
 * way
 *           FALSE = PICK_ONE, TRUE = PICK_ANY
 *
 * class_list
 *           a null terminated string containing the list of choices.
 *
 * class_selection
 *           a null terminated string containing the selected characters.
 *
 * Returns number selected.
 */
export function choose_classes_menu(prompt, category, way, class_list, class_select)
{
    const pick_list = C.menuLocal();
    let win;
    const any = C.localAnything();
    const buf = C.stackAlloc(C.BUFSZ);
    let text = 0;
    let selected;
    let ret, i, n, next_accelerator, accelerator = 0;
    let clr = C.NO_COLOR;

    if (!class_list || !class_select)
        return 0;
    next_accelerator = 97;
    C.copyAnything(any, C.cg.zeroany);
    win = C.create_nhwindow(C.NHW_MENU);
    C.start_menu(win, C.MENU_BEHAVE_STANDARD);
    while (C.loadChar(class_list)) {
        let idx;

        selected = C.FALSE;
        switch (category) {
        case 0:
            idx = C.def_char_to_monclass(C.loadChar(class_list));
            if (!C.IndexOk(idx, C.def_monsyms)) {
                C.panic("choose_classes_menu: invalid monclass '%c'",
                      C.loadChar(class_list));
                /*NOTREACHED*/
            }
            text = C.def_monsyms[idx].explain;
            accelerator = C.loadChar(class_list);
            C.Sprintf(buf, "%s", text);
            break;
        case 1:
            idx = C.def_char_to_objclass(C.loadChar(class_list));
            if (!C.IndexOk(idx, C.def_oc_syms)) {
                C.panic("choose_classes_menu: invalid objclass '%c'",
                      C.loadChar(class_list));
                /*NOTREACHED*/
            }
            text = C.def_oc_syms[idx].explain;
            accelerator = next_accelerator;
            C.Sprintf(buf, "%c  %s", C.loadChar(class_list), text);
            break;
        default:
            C.panic("choose_classes_menu: invalid category %d", category);
            /*NOTREACHED*/
        }
        if (way && C.loadChar(class_select)) { /* Selections there already */
            if (C.strchr(class_select, C.loadChar(class_list))) {
                selected = C.TRUE;
            }
        }
        any.a_int = C.loadChar(class_list);
        C.callLocal(add_menu, win, C.nul_glyphinfo, any, accelerator,
                 category ? C.loadChar(class_list) : 0, C.ATR_NONE, clr, buf,
                 selected ? C.MENU_ITEMFLAGS_SELECTED : C.MENU_ITEMFLAGS_NONE);
        if (category > 0) {
            if (next_accelerator == 90)
                break;
            else if (next_accelerator == 122)
                next_accelerator = 65;
            else
                ++next_accelerator;
        }
        ++class_list;
    }
    if (category == 1 && next_accelerator <= 122) {
        /* for objects, add "A - ' '  all classes", after a separator */
        C.callLocal(add_menu_str, win, "");
        C.copyAnything(any, C.cg.zeroany);
        any.a_int = 32;
        C.Sprintf(buf, "%c  %s", any.a_int, "All classes of objects");
        /* we won't preselect this even if the incoming list is empty;
           having it selected means that it would have to be explicitly
           de-selected in order to select anything else */
        C.callLocal(add_menu, win, C.nul_glyphinfo, any, 65, 0,
                 C.ATR_NONE, clr, buf, C.MENU_ITEMFLAGS_SKIPINVERT);
        if (!C.strcmp(prompt, "Autopickup what?")) {
            C.callLocal(add_menu_str, win,
                   "Note: when no choices are selected, \"all\" is implied.");
            /* for 'O', "toggle" should be intuitive; for 'm O', it would
               probably be better to say "Set 'autopickup' to true|false" */
            C.callLocal(add_menu_str, win, C.flags.pickup
                        ? "Toggle off 'autopickup' to not pick up anything."
           : "Toggle on 'autopickup' to automatically pick these things up.");
        }
    }
    C.end_menu(win, prompt);
    n = select_menu(win, way ? C.PICK_ANY : C.PICK_ONE, pick_list);
    C.destroy_nhwindow(win);
    if (n > 0) {
        if (category == 1) {
            /* for object classes, first check for 'all'; it means 'use
               a blank list' rather than 'collect every possible choice' */
            for (i = 0; i < n; ++i)
                if (pick_list.value[i].item.a_int == 32) {
                    pick_list.value[0].item.a_int = 32;
                    n = 1; /* return 1; also an implicit 'break;' */
                }
        }
        for (i = 0; i < n; ++i)
            C.storeChar(class_select++, pick_list.value[i].item.a_int);
        C.free(pick_list.value);
        ret = n;
    } else if (n == -1) {
        class_select = C.eos(class_select);
        ret = -1;
    } else {
        ret = 0;
    }
    C.storeChar(class_select, 0);
    return ret;
}

/* enum and structs are defined in wintype.h */

export const zerowri = [[0n,0,0,0,0,0,0,0],[0,0,[{c:"NO_COLOR"},{c:"ATR_NONE"}]]];

export function adjust_menu_promptstyle(window, style)
{
    const wri = C.localRequest(C.zerowri);
    wri.fromcore.menu_promptstyle.color = style.color;
    wri.fromcore.menu_promptstyle.attr = style.attr;
    /*  relay the style change to the window port */
    C.ctrl_nhwindow(window, C.set_menu_promptstyle, wri);
    C.go.opt_need_promptstyle = C.FALSE;
}

/*
 *   Common code point leading into the interface-specific
 *   add_menu() to allow single-spot adjustments to the parameters,
 *   such as those done by menu_colors.
 */
export function add_menu(window, glyphinfo, identifier, ch, gch, attr, color, str, itemflags)
/* window to use, must be of type NHW_MENU */
/* glyph info with glyph to
                                  * display with item */
/* what to return if selected */
/* selector letter (0 = pick our own) */
/* group accelerator (0 = no group) */
/* attribute for menu text (str) */
/* color for menu text (str) */
/* menu text */
/* itemflags such as MENU_ITEMFLAGS_SELECTED */
{
    attr = C.intLocal(attr); color = C.intLocal(color);
    if (!str) {
        /* if 'str' is Null, just return without adding any menu entry */
        C.debugpline0("add_menu(Null)");
        return;
    }

    if (C.iflags.use_menu_color) {
        if ((itemflags & C.MENU_ITEMFLAGS_SKIPMENUCOLORS) == 0)
            get_menu_coloring(str, color, attr);
    }
    /* this is the only function that cared about this flag; remove it now */
    itemflags &= ~C.MENU_ITEMFLAGS_SKIPMENUCOLORS;

    C.callWindow("win_add_menu", window, glyphinfo, identifier,
                                ch, gch, attr.value, color.value, str, itemflags);
}

/* insert a non-selectable, possibly highlighted line of text into a menu */
export function add_menu_heading(tmpwin, buf)
{
    const any = C.localAnything(C.cg.zeroany);
    let attr = C.iflags.menu_headings.attr,
        color = C.iflags.menu_headings.color;

    /* suppress highlighting during end-of-game disclosure */
    if (C.program_state.gameover)
        attr = C.ATR_NONE, color = C.NO_COLOR;

    C.callLocal(add_menu, tmpwin, C.nul_glyphinfo, any, 0, 0, attr, color,
             buf, C.MENU_ITEMFLAGS_SKIPMENUCOLORS);
}

/* insert a non-selectable, unhighlighted line of text into a menu */
export function add_menu_str(tmpwin, buf)
{
    const any = C.localAnything(C.cg.zeroany);

    C.callLocal(add_menu, tmpwin, C.nul_glyphinfo, any, 0, 0, C.ATR_NONE, C.NO_COLOR,
             buf, C.MENU_ITEMFLAGS_NONE);
}

export function get_menu_coloring(str, color, attr)
{
    let tmpmc;

    if (C.iflags.use_menu_color)
        for (tmpmc = C.gm.menu_colorings; tmpmc; tmpmc = tmpmc.next)
            if (C.regex_match(str, tmpmc.match)) {
                color.value = tmpmc.color;
                attr.value = tmpmc.attr;
                return C.TRUE;
            }
    return C.FALSE;
}

export function select_menu(window, how, menu_list)
{
    let reslt;
    let old_bot_disabled = C.gb.bot_disabled;

    C.gb.bot_disabled = C.TRUE;
    reslt = C.callWindow("win_select_menu", window, how, menu_list);
    C.gb.bot_disabled = old_bot_disabled;
    return reslt;
}

export function getlin(query, bufp)
{
    let old_bot_disabled = C.gb.bot_disabled;
    let obufp = bufp;
    let got_cmdq = C.FALSE;
    let cmdq = C.NULL;

    while ((cmdq = C.cmdq_pop()) != 0) {
        if (cmdq.typ == C.CMDQ_KEY) {
            got_cmdq = C.TRUE;
            C.storeChar(bufp, (cmdq.key != 10) ? cmdq.key : 0);
            bufp++;
            if (cmdq.key == 10)
                break;
        } else {
            break;
        }
        C.free(cmdq);
        cmdq = C.NULL;
    }
    if (cmdq)
        C.free(cmdq);

    if (got_cmdq) {
        C.storeChar(bufp, 0);
        C.pline("%s %s", query, obufp);
        return;
    }

    C.program_state.in_getlin = 1;
    C.gb.bot_disabled = C.TRUE;
    C.callWindow("win_getlin", query, bufp);
    C.gb.bot_disabled = old_bot_disabled;
    C.program_state.in_getlin = 0;
}
/*windows.c*/

/* Cannot just blindly include winX.h without including all of X11 stuff
   and must get the order of include files right.  Don't bother. */

/*#include "wingem.h"*/

/* be_win_init doesn't exist? XXX*/

/*#include "winGnome.h"*/

/* optional (can be 0) */

/* Old font version of the game */

/* Tile version of the game */

/* NB: this chain does not contain the terminal real window system pointer */

/* WINCHAIN */

/* NB: The ini_routine() will be called during commit. */

/* Save wincap* from the real window system - we'll restore it below. */

/* add -chainin at head and -chainout at tail */

/* Now alloc() init() similar to Objective-C. */

/* Restore the saved wincap* values.  We do it here to give the
     * ini_routine()s a chance to change or check them. */

/* Call the init procs.  Do not re-init the terminal real win. */

/* Install the chain into window procs very late so ini_routine()s
     * can raw_print on error. */

/* assignment, not proof */

/* CHANGE_COLOR */

/* update_positionbar */

/* change_background */

/* MACOS9 */

/* HANGUPHANDLING */

/* True -> full substitution for file name,
                       * False -> partial substitution for '--showpaths'
                       * feedback where there's no game in progress */

/*
     * Note: %t and %T assume that time_t is a 'long int' number of
     * seconds since some epoch value.  That's quite iffy....  The
     * unit of time might be different and the datum size might be
     * some variant of 'long long int'.  [Their main purpose is to
     * construct a unique file name rather than record the date and
     * time; violating the 'long seconds since base-date' assumption
     * may or may not interfere with that usage.]
     */

/* fallthrough */

/* literal % */

/* game start, timestamp */

/* current time, timestamp */

/* game start, YYYYMMDDhhmmss */

/* current time, YYYYMMDDhhmmss */

/* version, eg. "5.0.0,-0" */

/* UID */

/* player name */

/* first character of player name */

/* replace potentially troublesome characters (including
                   <space> even though it might be an acceptable file name
                   character); user shouldn't be able to get ' ' or '/'
                   or '\\' into plname[] but play things safe */

/* note: replacements are only done on field substitutions,
                   not on the template (from sysconf or DUMPLOG_FILE) */

/* DUMPLOG */

/*!DUMPLOG*/

/*?DUMPLOG*/
