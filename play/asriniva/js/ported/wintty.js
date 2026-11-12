import { C } from '../c-runtime/context.js';

/* NetHack 5.0	wintty.c	$NHDT-Date: 1737691300 2025/01/23 20:01:40 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.420 $ */
/* Copyright (c) David Cohrs, 1991                                */
/* NetHack may be freely redistributed.  See license for details. */
/*
 * Neither a standard out nor character-based control codes should be
 * part of the "tty look" windowing implementation.
 * h+ 930227
 */
/* It's still not clear I've caught all the cases for H2344.  #undef this
 * to back out the changes. */
/* leave this undefined; it produces bad screen output with rxvt-unicode */
/*#define DECgraphicsOptimization*/
/* The Mac is a MICRO only for this file, not in general! */
/* DEF_PAGER implies UNIX; when dlb is in use, the only file accessible
       to an external pager is 'license'; override 'DEF_PAGER' for that
       situation rather than using code to fallback to DLB plus internal
       pager after open() failure */
/* (same logic as unixmain.c) */
/* DLB */
/* DEF_PAGER */
/*
 * NetHack's core switches to a dummy windowing interface when it
 * detects SIGHUP, but that's no help for any interface routine which
 * is already in progress at the time, and there have been reports of
 * runaway disconnected processes which use up all available CPU time.
 * HUPSKIP() and HUPSKIP_RETURN(x) are used to try to cut them off so
 * that they return to the core instead attempting more terminal I/O.
 */
/* morc=ESC - in case we bypass xwaitforspace() which sets that */
/* !HANGUPHANDLING */
/*empty*/
/*empty*/
/* ?HANGUPHANDLING */
/* Interface definition, for windows.c */
/* color availability */
/* the Mac uses a palette device */
export const tty_procs_initial = {
    "name": "tty",
    "wp_id": "wp_tty",
    "wincap": {
        "operator": "|",
        "values": [
            {
                "operator": "|",
                "values": [
                    {
                        "operator": "|",
                        "values": [
                            {
                                "operator": "|",
                                "values": [
                                    0,
                                    "WC_COLOR"
                                ]
                            },
                            "WC_HILITE_PET"
                        ]
                    },
                    "WC_INVERSE"
                ]
            },
            "WC_EIGHT_BIT_IN"
        ]
    },
    "wincap2": {
        "operator": "|",
        "values": [
            {
                "operator": "|",
                "values": [
                    {
                        "operator": "|",
                        "values": [
                            {
                                "operator": "|",
                                "values": [
                                    {
                                        "operator": "|",
                                        "values": [
                                            {
                                                "operator": "|",
                                                "values": [
                                                    {
                                                        "operator": "|",
                                                        "values": [
                                                            {
                                                                "operator": "|",
                                                                "values": [
                                                                    {
                                                                        "operator": "|",
                                                                        "values": [
                                                                            {
                                                                                "operator": "|",
                                                                                "values": [
                                                                                    {
                                                                                        "operator": "|",
                                                                                        "values": [
                                                                                            {
                                                                                                "operator": "|",
                                                                                                "values": [
                                                                                                    {
                                                                                                        "operator": "|",
                                                                                                        "values": [
                                                                                                            0,
                                                                                                            "WC2_SELECTSAVED"
                                                                                                        ]
                                                                                                    },
                                                                                                    "WC2_HILITE_STATUS"
                                                                                                ]
                                                                                            },
                                                                                            "WC2_HITPOINTBAR"
                                                                                        ]
                                                                                    },
                                                                                    "WC2_FLUSH_STATUS"
                                                                                ]
                                                                            },
                                                                            "WC2_RESET_STATUS"
                                                                        ]
                                                                    },
                                                                    "WC2_DARKGRAY"
                                                                ]
                                                            },
                                                            "WC2_SUPPRESS_HIST"
                                                        ]
                                                    },
                                                    "WC2_URGENT_MESG"
                                                ]
                                            },
                                            "WC2_STATUSLINES"
                                        ]
                                    },
                                    "WC2_U_UTF8STR"
                                ]
                            },
                            "WC2_PETATTR"
                        ]
                    },
                    "WC2_EXTRACOLORS"
                ]
            },
            "WC2_EXTRASTATUS"
        ]
    },
    "has_color": [
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        1
    ],
    "win_init_nhwindows": "tty_init_nhwindows",
    "win_player_selection": "tty_player_selection",
    "win_askname": "tty_askname",
    "win_get_nh_event": "tty_get_nh_event",
    "win_exit_nhwindows": "tty_exit_nhwindows",
    "win_suspend_nhwindows": "tty_suspend_nhwindows",
    "win_resume_nhwindows": "tty_resume_nhwindows",
    "win_create_nhwindow": "tty_create_nhwindow",
    "win_clear_nhwindow": "tty_clear_nhwindow",
    "win_display_nhwindow": "tty_display_nhwindow",
    "win_destroy_nhwindow": "tty_destroy_nhwindow",
    "win_curs": "tty_curs",
    "win_putstr": "tty_putstr",
    "win_putmixed": "tty_putmixed",
    "win_display_file": "tty_display_file",
    "win_start_menu": "tty_start_menu",
    "win_add_menu": "tty_add_menu",
    "win_end_menu": "tty_end_menu",
    "win_select_menu": "tty_select_menu",
    "win_message_menu": "tty_message_menu",
    "win_mark_synch": "tty_mark_synch",
    "win_wait_synch": "tty_wait_synch",
    "win_cliparound": "tty_cliparound",
    "win_print_glyph": "tty_print_glyph",
    "win_raw_print": "tty_raw_print",
    "win_raw_print_bold": "tty_raw_print_bold",
    "win_nhgetch": "tty_nhgetch",
    "win_nh_poskey": "tty_nh_poskey",
    "win_nhbell": "tty_nhbell",
    "win_doprev_message": "tty_doprev_message",
    "win_yn_function": "tty_yn_function",
    "win_getlin": "tty_getlin",
    "win_get_ext_cmd": "tty_get_ext_cmd",
    "win_number_pad": "tty_number_pad",
    "win_delay_output": "tty_delay_output",
    "win_outrip": "genl_outrip",
    "win_preference_update": "tty_preference_update",
    "win_getmsghistory": "tty_getmsghistory",
    "win_putmsghistory": "tty_putmsghistory",
    "win_status_init": "tty_status_init",
    "win_status_finish": "genl_status_finish",
    "win_status_enablefield": "tty_status_enablefield",
    "win_status_update": "tty_status_update",
    "win_can_suspend": "genl_can_suspend_yes",
    "win_update_inventory": "tty_update_inventory",
    "win_ctrl_nhwindow": "tty_ctrl_nhwindow"
};

/* the tty display descriptor */
/* from termcap.c */
/* from termcap.c */
/* volatile: SIGWINCH */
/* BUFSIZ is defined in stdio.h */

export const winpanicstr_initial = "Bad window Id %d (%s)";


export const defmorestr_initial = "--More--";

/* clipping on? */

export const clipping_initial = "FALSE";

/* clipping on? */

export const clipx_initial = 0;


export const clipxmax_initial = 0;


export const clipy_initial = 0;


export const clipymax_initial = 0;

/* CLIPPING */

export const GFlag_initial = "FALSE";

/* see termcap.c */
/* __attribute__((noreturn)) */
/* NH_DEVEL_STATUS */

export const calling_from_update_inventory_initial = "FALSE";

/* left, middle, right */
/* enum is in wintype.h */
/* next slot to use for in-use-only mode */
/* 54 */
/* 1-based, slot_trackter[0..slots-1] */
/* invent.c */
/* TTY_PERM_INVENT */
/*
 * A string containing all the default commands -- to add to a list
 * of acceptable inputs.
 */
/* null terminator */
export const default_menu_cmds_initial = [
    "MENU_FIRST_PAGE",
    "MENU_LAST_PAGE",
    "MENU_NEXT_PAGE",
    "MENU_PREVIOUS_PAGE",
    "MENU_SELECT_ALL",
    "MENU_UNSELECT_ALL",
    "MENU_INVERT_ALL",
    "MENU_SELECT_PAGE",
    "MENU_UNSELECT_PAGE",
    "MENU_INVERT_PAGE",
    "MENU_SEARCH",
    0
];

/*empty*/
/* !TTY_TILES_ESCCODES */
/* !(USER_SOUNDS && TTY_SOUND_ESCCODES) */
/* ?(USER_SOUNDS && TTY_SOUND_ESCCODES) */
/* clean up and quit */
export function bail(mesg) {
    mesg = C.argument(mesg, "const char *");
    C.clearlocks();
    tty_exit_nhwindows(mesg);
    C.nh_terminate(C.EXIT_SUCCESS);
/*NOTREACHED*/
}


export const resize_mesg_initial = 0;

/* signal handler is called with at least 1 arg */
/*ARGUSED*/
export function winch_handler(sig_unused) {
    sig_unused = C.argument(sig_unused, "int");
    C.bump(C.fieldRef(C.program_state, "resize_pending"), 1, true, "int");
/* resize_tty() will reset it */
/* if nethack is waiting for input, which is the most likely scenario,
       we will go ahead and respond to the resize immediately; otherwise,
       tty_nhgetch() will do so the next time it's called */
    if ((C.program_state).getting_char) {
        resize_tty();
/* [this doesn't work as intended and seems to be unnecessary] */
/* resize_tty() put "Press a key to continue: " on top line */
/* recursion... */
    }
    return;
}

/* query the system for tty size (vis getwindowsz()), and adapt the game's
   windows to match */
export function resize_tty() {
    let oldLI = ((C.gt).tc_gbl_data).tc_LI;
    let oldCO = ((C.gt).tc_gbl_data).tc_CO;
    let mapx;
    let mapy;
    let oldtoplin;
    let i;
    let map_active;
    let cw;
/* reset to 0 rather than just decrement */
    ((C.program_state).resize_pending = 0);
    (C.resize_mesg = 0);
    C.getwindowsz();
/* update LI and CO */
    if (Number(!!(Number(!(C.ttyDisplay)) || (Number(!!(Number(((C.gt).tc_gbl_data).tc_LI == oldLI) && Number(((C.gt).tc_gbl_data).tc_CO == oldCO))))))) return;
    ((C.ttyDisplay).rows = C.short(((C.gt).tc_gbl_data).tc_LI));
    ((C.ttyDisplay).cols = C.short(((C.gt).tc_gbl_data).tc_CO));
    (cw = C.deref(C.ptrAdd(C.wins, C.BASE_WINDOW, "struct WinDesc *"), "struct WinDesc *"));
    ((cw).rows = C.long((C.ttyDisplay).rows));
    ((cw).cols = C.long((C.ttyDisplay).cols));
    if (Number(!((C.iflags).window_inited))) return;
/* try to figure out where we'll want to leave the cursor */
    (cw = (((Number(C.WIN_MAP != (C.int((-1)))))) ? C.deref(C.ptrAdd(C.wins, C.WIN_MAP, "struct WinDesc *"), "struct WinDesc *") : 0));
    (map_active = C.char((Number(!!(cw && (cw).active)))));
    if (Number(!(map_active))) ((mapx = 1), (mapy = 0));
    else if (Number((C.gg).getposx < 1)) ((mapx = (C.u).ux), (mapy = (C.u).uy));
    else ((mapx = (C.gg).getposx), (mapy = (C.gg).getposy));
    (oldtoplin = (C.ttyDisplay).toplin);
    ((C.ttyDisplay).toplin = C.TOPLINE_EMPTY);
/* (before term_clear_screen()) */
/* whatever used to be on the screen has become suspect;
       blank it all out, then redo the display */
    C.term_clear_screen();
    new_status_window();
/* if the map window is shown, redisplay it (also status, perminv) */
    if (map_active) {
        C.docrt_flags(C.docrtRefresh);
        C.bot();
/* context.botlx=1 gets set by docrt() */
        for ((i = 0); Number(i < C.MAXWIN); (i = C.int((i + 1)))) {
            if (Number(!!(Number(!!(Number(!!(Number(i == C.BASE_WINDOW) || Number(i == C.WIN_MAP))) || Number(i == C.WIN_STATUS))) || Number(i == C.WIN_MESSAGE)))) /* docrt() updates it */
/* docrt()+bot() updates it */
/* docrt() again */
/* we fake it here */
            continue;
            if (Number(!!(C.deref(C.ptrAdd(C.wins, i, "struct WinDesc *"), "struct WinDesc *") && (C.deref(C.ptrAdd(C.wins, i, "struct WinDesc *"), "struct WinDesc *")).active))) {
/* cop-out */
                (oldtoplin = C.TOPLINE_EMPTY);
/* don't restore it below */
                ((C.ttyDisplay).toplin = C.TOPLINE_NON_EMPTY);
                C.addtopl(C.literal("Press a key to continue: "));
                ((C.resize_mesg = C.int((C.resize_mesg + 1))), C.int((C.resize_mesg - 1)));
                break;
            }
        }
    }
/* wins[WIN_MAP].active */
    if (Number(oldtoplin != C.TOPLINE_EMPTY)) {
        ((C.ttyDisplay).toplin = oldtoplin);
        C.addtopl((C.gt).toplines);
    }
    if (map_active) {
        newclipping(C.short(mapx), C.short(mapy));
        tty_curs(C.WIN_MAP, mapx, mapy);
        tty_display_nhwindow(C.WIN_MAP, C.FALSE);
/*fflush(stdout)*/
    }
    return;
}

/* RESIZABLE */
export function newclipping(x, y) {
    x = C.argument(x, "coordxy");
    y = C.argument(y, "coordxy");
    if (Number(!!(Number(((C.gt).tc_gbl_data).tc_CO < C.COLNO) || Number(((C.gt).tc_gbl_data).tc_LI < C.int((C.int((1 + C.ROWNO)) + (C.iflags).wc2_statuslines)))))) {
        setclipped();
/* sets clipping=TRUE */
        if (x) tty_cliparound(x, y);
    }
    else {
        (C.clipping = C.FALSE);
        (C.clipx = (C.clipy = 0));
    }
    return;
}

/* destroy and recreate status window; extracted from winch_handler()
   and augmented for use by tty_preference_update() */
export function new_status_window() {
    if (Number(C.WIN_STATUS != (C.int((-1))))) {
/* in case it's shrinking, clear it before destroying so that
           dropped portion won't show anything that's now becoming stale */
        tty_clear_nhwindow(C.WIN_STATUS);
        (tty_destroy_nhwindow(C.WIN_STATUS), (C.WIN_STATUS = (C.int((-1)))));
    }
/* frees some status tracking data */
    C.genl_status_finish();
/* creates status window and allocates tracking data */
    tty_status_init();
    tty_clear_nhwindow(C.WIN_STATUS);
/* does some init, sets context.botlx */
    C.status_initialize(C.REASSESS_ONLY);
}

/*ARGSUSED*/
export function tty_init_nhwindows(argcp, argv) {
    argcp = C.argument(argcp, "int *");
    argv = C.argument(argv, "char **");
    const wid = C.scalarLocal("int");
    const hgt = C.scalarLocal("int");
    let i;
/* options aren't processed yet so wc2_statuslines might be 0;
       make sure that it has a reasonable value during tty setup */
    ((C.iflags).wc2_statuslines = ((((Number((C.iflags).wc2_statuslines <= 2))) ? 2 : 3)));
/* 2 or 3; 0 => 2 */
/*
     *  Remember tty modes, to be restored on exit.
     *
     *  gettty() must be called before term_startup()
     *    due to ordering of LI/CO settings
     *  term_startup() must be called before initoptions()
     *    due to ordering of graphics settings
     */
    C.setbuf((C.stdout), C.obuf);
    C.gettty();
/* to port dependant tty setup */
    C.term_startup(wid, hgt);
    C.setftty();
/* calls term_start_screen */
    C.term_curs_set(0);
/* set up tty descriptor */
    (C.ttyDisplay = C.castPointer(C.alloc(C.uint(BigInt(C.sizeof("struct DisplayDesc")))), "struct DisplayDesc *"));
    ((C.ttyDisplay).toplin = C.TOPLINE_EMPTY);
    ((C.ttyDisplay).topl_utf8 = 0);
/* putmixed may set this */
    ((C.ttyDisplay).rows = C.short(hgt.value));
    ((C.ttyDisplay).cols = C.short(wid.value));
    ((C.ttyDisplay).curx = ((C.ttyDisplay).cury = C.short(0)));
    ((C.ttyDisplay).inmore = ((C.ttyDisplay).inread = ((C.ttyDisplay).intr = 0)));
    ((C.ttyDisplay).dismiss_more = C.char(0));
    ((C.ttyDisplay).color = C.NO_COLOR);
    ((C.ttyDisplay).attrs = 0);
    ((C.ttyDisplay).topl_utf8 = 0);
    ((C.ttyDisplay).mixed = 0);
/* set up the default windows */
    (C.BASE_WINDOW = tty_create_nhwindow(C.NHW_BASE));
    ((C.deref(C.ptrAdd(C.wins, C.BASE_WINDOW, "struct WinDesc *"), "struct WinDesc *")).active = C.char(1));
    ((C.ttyDisplay).lastwin = (C.int((-1))));
    C.teleport_native_signal(C.SIGWINCH, C.callback("winch_handler", winch_handler));
    tty_clear_nhwindow(C.BASE_WINDOW);
/* Once pline() is functional, error-related prompts such as
     * those relating to save files etc. can intrude on the
     * copyright information display because their prompts are
     * up at the very top in the message window.
     * Move the copyright information a little further down to
     * row 3, out of the way. */
    tty_curs(C.BASE_WINDOW, 1, 4);
    for ((i = 1); Number(i <= 4); (i = C.int((i + 1)))) C.callLocal(tty_putstr, C.BASE_WINDOW, 0, C.copyright_banner_line(i));
    C.callLocal(tty_putstr, C.BASE_WINDOW, 0, C.literal(""));
    tty_display_nhwindow(C.BASE_WINDOW, C.FALSE);
/* Move to a default location for the "Shall I pick .." player
     * selection prompts, which also use the BASE_WINDOW. Leave
     * room for as many as 3 unexpected raw_prints early startup
     * messages above that.
     * If there is a topline message prompt, before the
     * "Shall I pick ..." prompt, the latter will end up appearing
     * immediately after the topline message prompt. There should
     * now be room. */
    tty_curs(C.BASE_WINDOW, 1, 11);
/* 'statuslines' defaults to set_in_config, allowed but invisible;
       make it dynamically settable if feasible, otherwise visible */
    if (Number((C.ulong(((C.tty_procs).wincap2 & C.WC2_STATUSLINES))) != C.ulong(0))) C.set_wc2_option_mod_status(C.WC2_STATUSLINES, C.set_in_game);
}

export function tty_preference_update(pref) {
    pref = C.argument(pref, "const char *");
    let newstatuslines = C.char((Number(!!(Number(!(C.strcmp(pref, C.literal("statuslines")))) && (C.iflags).window_inited))));
    if (newstatuslines) {
        new_status_window();
        newclipping((C.u).ux, (C.u).uy);
    }
    C.genl_preference_update(pref);
/* the boundary box around persistent inventory is drawn with wall
       symbols, so if player changes to a different symbol set (other
       than temporary switch to the rogue one), redraw perm_invent; not
       only might individual symbols change (punctuation vs line drawing),
       the way to render them might change too (Handling: DEC/UTF8/&c) */
/* if newstatuslines has been toggled between 2 and 3 or vice versa
       then we want to reposition the perm_invent window to match */
/*TEMP?*/
/*TEMP?*/
    return;
}

export function tty_player_selection() {
    if (C.genl_player_setup((C.ttyDisplay).rows)) return;
    bail(0);
/*NOTREACHED*/
}

/*
 * svp.plname is filled either by an option (-u Player  or  -uPlayer) or
 * explicitly (by being the wizard) or by askname.
 * It may still contain a suffix denoting the role, etc.
 * Always called after init_nhwindows() and before
 * init_sound_disp_gamewindows().
 */
export function tty_askname() {
    C.declareStatic("tty_askname.who_are_you", "const char[14]", C.literal("Who are you? "));
    let c;
    let ct;
    let tryct = 0;
    if (Number(!!((C.iflags).wc2_selectsaved && Number(!((C.iflags).renameinprogress))))) switch (C.restore_menu(C.BASE_WINDOW)) {
        case (C.int((-1))):
            bail(C.literal("Until next time then..."));
/* quit */
/*NOTREACHED*/
        break;
        case (0):
            break;
/* no game chosen; start new game */
        case (1):
            return;
/* svp.plname[] has been set */
    }
/* SELECTSAVED */
    C.callLocal(tty_putstr, C.BASE_WINDOW, 0, C.literal(""));
    do {
        if (Number((tryct = C.int((tryct + 1))) > 1)) {
            if (Number(tryct > 10)) bail(C.literal("Giving up after 10 tries.\n"));
            tty_curs(C.BASE_WINDOW, 1, C.int(C.long(((C.deref(C.ptrAdd(C.wins, C.BASE_WINDOW, "struct WinDesc *"), "struct WinDesc *")).cury - C.long(1)))));
            C.callLocal(tty_putstr, C.BASE_WINDOW, 0, C.literal("Enter a name for your character..."));
/* erase previous prompt (in case of ESC after partial response) */
            (tty_curs(C.BASE_WINDOW, 1, C.int((C.deref(C.ptrAdd(C.wins, C.BASE_WINDOW, "struct WinDesc *"), "struct WinDesc *")).cury)), C.cl_end());
        }
        C.callLocal(tty_putstr, C.BASE_WINDOW, 0, C.staticCell("tty_askname.who_are_you").value);
        tty_curs(C.BASE_WINDOW, C.int((BigInt(C.sizeof("const char[14]")))), C.int(C.long(((C.deref(C.ptrAdd(C.wins, C.BASE_WINDOW, "struct WinDesc *"), "struct WinDesc *")).cury - C.long(1)))));
        (ct = 0);
        while (Number(((c = C.callLocal(tty_nhgetch))) != 10)) {
            if (Number(c == C.EOF)) (c = 27);
            if (Number(c == 13)) break;
            if (Number(c == 27)) {
                (ct = 0);
                break;
            }
/* continue outer loop */
/* some people get confused when their erase char is not ^H */
            if (Number(!!(Number(c == 8) || Number(c == 127)))) {
                if (ct) {
                    ((ct = C.int((ct - 1))), C.int((ct + 1)));
/* \b is visible on NT */
                    C.putchar(8);
                    C.putchar(32);
                    C.putchar(8);
/* Mirror the visible erase into the NOMUX shadow
                     * buffer. The \b/space/\b sequence emitted above
                     * via putchar() bypasses nomux_putch (which
                     * ignores ch < 32). On UNIX, ttyDisplay->curx
                     * wasn't touched by the bare putchar() calls; on
                     * WIN32CON it was already decremented above.
                     * After this block, curx points at the erased
                     * column and the shadow buffer cell at that
                     * column holds a space — mirroring the real
                     * terminal. Without this, screen captures show
                     * the pre-erase char and subsequent typed chars
                     * land at the wrong column for the rest of the
                     * prompt. */
                    if (Number((C.ttyDisplay).curx > 0)) C.bump(C.fieldRef(C.ttyDisplay, "curx"), -1, true, "short");
                    C.nomux_putch(32);
                }
                continue;
            }
            if (Number(!!(Number(c != 45) && Number(c != 64)))) if (Number(!!(Number(!!(Number(!((Number(!!(Number(c >= 97) && Number(c <= 122)))))) && Number(!((Number(!!(Number(c >= 65) && Number(c <= 90)))))))) && Number(!((Number(!!(Number(!!(Number(c >= 48) && Number(c <= 57))) && Number(ct > 0))))))))) /* reject leading digit but allow digits elsewhere
                       (avoids ambiguity when character name gets
                       appended to uid to construct save file name) */
            (c = 95);
            if (Number(ct < C.int((C.int((BigInt(C.sizeof("char[32]")))) - 1)))) {
                C.putchar(c);
                C.nomux_putch(c);
                C.bump(C.fieldRef(C.ttyDisplay, "curx"), 1, true, "short");
                C.store(C.ptrAdd((C.svp).plname, ((ct = C.int((ct + 1))), C.int((ct - 1))), "char"), "char", C.char(c));
            }
        }
        C.store(C.ptrAdd((C.svp).plname, ct, "char"), "char", C.char(0));
    }
    while (Number(ct == 0));
/* move to next line to simulate echo of user's <return> */
    tty_curs(C.BASE_WINDOW, 1, C.int(C.long(((C.deref(C.ptrAdd(C.wins, C.BASE_WINDOW, "struct WinDesc *"), "struct WinDesc *")).cury + C.long(1)))));
/* since we let user pick an arbitrary name now, he/she can pick
       another one during role selection */
    ((C.iflags).renameallowed = C.TRUE);
}

export function tty_get_nh_event() {
    return;
}

export function getret() {
    do {
        if ((C.program_state).done_hup) {
            (C.morc = C.char(27));
            return;
        }
    }
    while (0);
    C.xputs(C.literal("\n"));
    if ((C.flags).standout) C.standoutbeg();
    C.xputs(C.literal("Hit "));
    C.xputs((((C.iflags).cbreak) ? C.literal("space") : C.literal("return")));
    C.xputs(C.literal(" to continue: "));
    if ((C.flags).standout) C.standoutend();
    C.xwaitforspace(C.literal(" "));
    ((C.iflags).raw_printed = 0);
}

export function tty_suspend_nhwindows(str) {
    str = C.argument(str, "const char *");
    C.term_curs_set(1);
    C.settty(str);
/* calls end_screen, perhaps raw_print */
    if (Number(!(str))) tty_raw_print(C.literal(""));
/* calls fflush(stdout) */
}

export function tty_resume_nhwindows() {
    C.gettty();
    C.setftty();
/* calls term_start_screen */
    C.term_curs_set(0);
    C.docrt();
}

/* CHANGE_COLOR */
export function tty_exit_nhwindows(str) {
    str = C.argument(str, "const char *");
    let i;
    tty_suspend_nhwindows(str);
/*
     * Disable windows to avoid calls to window routines.
     */
    C.free_pickinv_cache();
/* reset its state as well as tear down window */
    for ((i = 0); Number(i < C.MAXWIN); ((i = C.int((i + 1))), C.int((i - 1)))) {
        if (Number(i == C.BASE_WINDOW)) continue;
/* handle wins[BASE_WINDOW] last */
        if (C.deref(C.ptrAdd(C.wins, i, "struct WinDesc *"), "struct WinDesc *")) {
            free_window_info(C.deref(C.ptrAdd(C.wins, i, "struct WinDesc *"), "struct WinDesc *"), C.TRUE);
            C.free(C.castPointer(C.deref(C.ptrAdd(C.wins, i, "struct WinDesc *"), "struct WinDesc *"), "void *"));
            C.store(C.ptrAdd(C.wins, i, "struct WinDesc *"), "struct WinDesc *", 0);
        }
    }
    (C.WIN_MAP = (C.WIN_MESSAGE = (C.WIN_INVEN = (C.int((-1))))));
/* these are all gone now */
    (C.WIN_STATUS = (C.int((-1))));
    if (Number(!!(Number(C.BASE_WINDOW != (C.int((-1)))) && C.deref(C.ptrAdd(C.wins, C.BASE_WINDOW, "struct WinDesc *"), "struct WinDesc *")))) {
        free_window_info(C.deref(C.ptrAdd(C.wins, C.BASE_WINDOW, "struct WinDesc *"), "struct WinDesc *"), C.TRUE);
        C.free(C.castPointer(C.deref(C.ptrAdd(C.wins, C.BASE_WINDOW, "struct WinDesc *"), "struct WinDesc *"), "void *"));
        C.store(C.ptrAdd(C.wins, C.BASE_WINDOW, "struct WinDesc *"), "struct WinDesc *", 0);
        (C.BASE_WINDOW = (C.int((-1))));
    }
    C.free(C.castPointer(C.ttyDisplay, "void *"));
    (C.ttyDisplay = 0);
    C.term_shutdown();
/* cleanup termcap/terminfo/whatever */
    ((C.iflags).window_inited = C.char(0));
}

export function tty_create_nhwindow(type) {
    type = C.argument(type, "int");
    let newwin;
    let i;
    let rowoffset;
    let newid;
    for ((newid = 0); Number(newid < C.MAXWIN); (newid = C.int((newid + 1)))) if (C.ptrCompare(C.deref(C.ptrAdd(C.wins, newid, "struct WinDesc *"), "struct WinDesc *"), 0, "==")) break;
    if (Number(newid == C.MAXWIN)) {
        C.panic(C.literal("No window slots!"), "");
/*NOTREACHED*/
        return (C.int((-1)));
    }
    (newwin = C.castPointer(C.alloc(C.uint(BigInt(C.sizeof("struct WinDesc")))), "struct WinDesc *"));
    C.store(C.ptrAdd(C.wins, newid, "struct WinDesc *"), "struct WinDesc *", newwin);
    ((newwin).type = C.short(type));
    ((newwin).flags = 0);
    ((newwin).active = C.FALSE);
    ((newwin).curx = ((newwin).cury = C.long(0)));
    ((newwin).morestr = 0);
    ((newwin).mlist = 0);
    ((newwin).plist = 0);
    ((newwin).npages = ((newwin).plist_size = ((newwin).nitems = C.long(((newwin).how = C.short(0))))));
    ((newwin).mbehavior = C.ulong(0));
    switch (type) {
        case C.NHW_BASE:
/* base window, used for absolute movement on the screen */
            ((newwin).offx = ((newwin).offy = C.short(0)));
        ((newwin).rows = C.long((C.ttyDisplay).rows));
        ((newwin).cols = C.long((C.ttyDisplay).cols));
        ((newwin).maxrow = ((newwin).maxcol = C.long(0)));
        break;
        case C.NHW_MESSAGE:
/* message window, 1 line long, very wide, top of screen */
            ((newwin).offx = ((newwin).offy = C.short(0)));
/* sanity check */
        if (Number((C.iflags).msg_history < C.uint(20))) ((C.iflags).msg_history = C.uint(20));
        else if (Number((C.iflags).msg_history > C.MAX_MSG_HISTORY)) ((C.iflags).msg_history = C.MAX_MSG_HISTORY);
        ((newwin).maxrow = ((newwin).rows = C.long((C.iflags).msg_history)));
        ((newwin).maxcol = ((newwin).cols = C.long(0)));
        break;
        case C.NHW_STATUS:
/* status window, 2 or 3 lines long, full width, bottom of screen */
            if (Number(!!(Number((C.iflags).wc2_statuslines < 2) || Number((C.iflags).wc2_statuslines > 3)))) ((C.iflags).wc2_statuslines = 2);
        ((newwin).offx = C.short(0));
        (rowoffset = C.int(((C.ttyDisplay).rows - (C.iflags).wc2_statuslines)));
        ((newwin).offy = C.short((((Number((rowoffset) < (C.int((21 + 1))))) ? (rowoffset) : (C.int((21 + 1)))))));
        ((newwin).rows = ((newwin).maxrow = C.long((C.iflags).wc2_statuslines)));
        ((newwin).cols = ((newwin).maxcol = C.long((C.ttyDisplay).cols)));
        break;
        case C.NHW_MAP:
/* map window, ROWNO lines long, full width, below message window */
            ((newwin).offx = C.short(0));
        ((newwin).offy = C.short(1));
        ((newwin).rows = C.ROWNO);
        ((newwin).cols = C.COLNO);
        ((newwin).maxrow = C.long(0));
/* no buffering done -- let gbuf do it */
        ((newwin).maxcol = C.long(0));
        break;
        case C.NHW_MENU:
            case C.NHW_TEXT:
/* inventory/menu window, variable length, full width, top of screen;
           help window, the same, different semantics for display, etc */
                ((newwin).offx = ((newwin).offy = C.short(0)));
        ((newwin).rows = C.long(0));
        ((newwin).cols = C.long((C.ttyDisplay).cols));
        ((newwin).maxrow = ((newwin).maxcol = C.long(0)));
        break;
        default:
            C.panic(C.literal("Tried to create window type %d\n"), type, "i");
/*NOTREACHED*/
        return (C.int((-1)));
    }
    if ((newwin).maxrow) {
        ((newwin).data = C.castPointer(C.alloc(C.uint((C.ulong((C.ulong((newwin).maxrow) * BigInt(C.sizeof("char *"))))))), "char **"));
        ((newwin).datlen = C.castPointer(C.alloc(C.uint((C.ulong((C.ulong((newwin).maxrow) * BigInt(C.sizeof("short"))))))), "short *"));
        for ((i = 0); Number(C.long(i) < (newwin).maxrow); ((i = C.int((i + 1))), C.int((i - 1)))) {
            if ((newwin).maxcol) {
/* WIN_STATUS */
                C.store(C.ptrAdd((newwin).data, i, "char *"), "char *", C.castPointer(C.alloc(C.uint((newwin).maxcol)), "char *"));
                C.store(C.ptrAdd((newwin).datlen, i, "short"), "short", C.short((newwin).maxcol));
            }
            else {
                C.store(C.ptrAdd((newwin).data, i, "char *"), "char *", 0);
                C.store(C.ptrAdd((newwin).datlen, i, "short"), "short", C.short(0));
            }
        }
        if (Number((newwin).type == C.NHW_MESSAGE)) ((newwin).maxrow = C.long(0));
    }
    else {
        ((newwin).data = 0);
        ((newwin).datlen = 0);
    }
    return newid;
}

export function erase_menu_or_text(window, cw, clear) {
    window = C.argument(window, "winid");
    cw = C.argument(cw, "struct WinDesc *");
    clear = C.argument(clear, "boolean");
    if (Number((cw).offx == 0)) {
        if ((cw).offy) {
            tty_curs(window, 1, 0);
            C.cl_eos();
        }
        else if (clear) {
            C.term_clear_screen();
        }
        else {
            C.docrt();
            C.flush_screen(1);
        }
    }
    else {
        docorner(C.int((cw).offx), C.int(C.long(((cw).maxrow + C.long(1)))), 0);
    }
}

export function free_window_info(cw, free_data) {
    cw = C.argument(cw, "struct WinDesc *");
    free_data = C.argument(free_data, "boolean");
    let i;
    if ((cw).data) {
        if (Number(!!(Number(!!(Number(C.WIN_MESSAGE != (C.int((-1)))) && C.ptrCompare(cw, C.deref(C.ptrAdd(C.wins, C.WIN_MESSAGE, "struct WinDesc *"), "struct WinDesc *"), "=="))) && Number((cw).rows > (cw).maxrow)))) ((cw).maxrow = (cw).rows);
/* topl data */
        for ((i = 0); Number(C.long(i) < (cw).maxrow); ((i = C.int((i + 1))), C.int((i - 1)))) if (C.deref(C.ptrAdd((cw).data, i, "char *"), "char *")) {
            C.free(C.castPointer(C.deref(C.ptrAdd((cw).data, i, "char *"), "char *"), "void *"));
            C.store(C.ptrAdd((cw).data, i, "char *"), "char *", 0);
            if ((cw).datlen) C.store(C.ptrAdd((cw).datlen, i, "short"), "short", C.short(0));
        }
        if (free_data) {
            C.free(C.castPointer((cw).data, "void *"));
            ((cw).data = 0);
            if ((cw).datlen) C.free(C.castPointer((cw).datlen, "void *"));
            ((cw).datlen = 0);
            ((cw).rows = C.long(0));
        }
    }
    ((cw).maxrow = ((cw).maxcol = C.long(0)));
    if ((cw).mlist) {
        let temp;
        while (C.ptrCompare(((temp = (cw).mlist)), 0, "!=")) {
            ((cw).mlist = (temp).next);
            if ((temp).str) C.free(C.castPointer((temp).str, "void *"));
            C.free(C.castPointer(temp, "void *"));
        }
    }
    if ((cw).plist) {
        C.free(C.castPointer((cw).plist, "void *"));
        ((cw).plist = 0);
    }
    ((cw).plist_size = ((cw).npages = ((cw).nitems = C.long(((cw).how = C.short(0))))));
    if ((cw).morestr) {
        C.free(C.castPointer((cw).morestr, "void *"));
        ((cw).morestr = 0);
    }
}

export function tty_clear_nhwindow(window) {
    window = C.argument(window, "winid");
    let i;
    let j;
    let m;
    let n;
    let cw = 0;
    do {
        if ((C.program_state).done_hup) {
            (C.morc = C.char(27));
            return;
        }
    }
    while (0);
    if (Number(!!(Number(window == (C.int((-1)))) || C.ptrCompare(((cw = C.deref(C.ptrAdd(C.wins, window, "struct WinDesc *"), "struct WinDesc *"))), 0, "==")))) C.panic(C.winpanicstr, window, C.literal("tty_clear_nhwindow"), "ip");
    ((C.ttyDisplay).lastwin = window);
    ;
    switch ((cw).type) {
        case C.NHW_MESSAGE:
            if (Number((C.ttyDisplay).toplin != C.TOPLINE_EMPTY)) {
                if (Number(!(C.erasing_tty_screen))) {
                    C.home();
                    C.cl_end();
                    if ((cw).cury) docorner(1, C.int(C.long(((cw).cury + C.long(1)))), 0);
                }
                ((cw).curx = ((cw).cury = C.long(0)));
                ((C.ttyDisplay).toplin = C.TOPLINE_EMPTY);
            }
        break;
        case C.NHW_STATUS:
            (m = C.int((cw).maxrow));
        (n = C.int((cw).cols));
        for ((i = 0); Number(i < m); (i = C.int((i + 1)))) {
            if (Number(!(C.erasing_tty_screen))) {
                tty_curs(window, 1, i);
                C.cl_end();
            }
            for ((j = 0); Number(j < C.int((n - 1))); (j = C.int((j + 1)))) C.store(C.ptrAdd(C.deref(C.ptrAdd((cw).data, i, "char *"), "char *"), j, "char"), "char", C.char(32));
            C.store(C.ptrAdd(C.deref(C.ptrAdd((cw).data, i, "char *"), "char *"), C.int((n - 1)), "char"), "char", C.char(0));
/*finalx[i][NOW] = finalx[i][BEFORE] = 0;*/
        }
        ((C.disp).botlx = C.TRUE);
        break;
        case C.NHW_MAP:
/* cheap -- clear the whole thing and tell nethack to redraw botl */
            ((C.disp).botlx = C.TRUE);
        ;
/*FALLTHRU*/
        case C.NHW_BASE:
/* if erasing_tty_screen is True, calling sequence is
           term_clear_screen -> erase_tty_screen -> tty_clear_nhwindow
           so we don't call term_clear_screen again */
            if (Number(!(C.erasing_tty_screen))) {
                C.term_clear_screen();
            }
/*
         * Neither map nor base window tracks what is currently shown so
         * there's no stale data that would need to be changed to spaces.
         */
        break;
        case C.NHW_MENU:
            case C.NHW_TEXT:
                if (Number(!(C.erasing_tty_screen))) {
                    if ((cw).active) erase_menu_or_text(window, cw, C.TRUE);
                    free_window_info(cw, C.FALSE);
                }
        break;
    }
    ((cw).curx = ((cw).cury = C.long(0)));
/* cw->blanked = TRUE; -- this isn't used */
}

/* toggle a specific entry */
export function toggle_menu_curr(window, curr, lineno, in_view, counting, count) {
    window = C.argument(window, "winid");
    curr = C.argument(curr, "tty_menu_item *");
    lineno = C.argument(lineno, "int");
    in_view = C.argument(in_view, "boolean");
    counting = C.argument(counting, "boolean");
    count = C.argument(count, "long");
    if ((curr).selected) {
        if (Number(!!(counting && Number(count > C.long(0))))) {
            ((curr).count = count);
            if (in_view) set_item_state(window, lineno, curr);
            return C.TRUE;
        }
        else {
/* change state */
            ((curr).selected = C.FALSE);
            ((curr).count = C.long((-1n)));
            if (in_view) set_item_state(window, lineno, curr);
            return C.TRUE;
        }
    }
    else {
/* !selected */
        if (Number(!!(counting && Number(count > C.long(0))))) {
            ((curr).count = count);
            ((curr).selected = C.TRUE);
            if (in_view) set_item_state(window, lineno, curr);
            return C.TRUE;
        }
        else if (Number(!(counting))) {
            ((curr).selected = C.TRUE);
            if (in_view) set_item_state(window, lineno, curr);
            return C.TRUE;
        }
/* do nothing counting&&count==0 */
    }
    return C.FALSE;
}

export function dmore(cw, s) /* valid responses */
{
    cw = C.argument(cw, "struct WinDesc *");
    s = C.argument(s, "const char *");
    let prompt = (((cw).morestr) ? (cw).morestr : C.defmorestr);
    let offset = (((Number((cw).type == C.NHW_TEXT))) ? 1 : 2);
    do {
        if ((C.program_state).done_hup) {
            (C.morc = C.char(27));
            return;
        }
    }
    while (0);
    tty_curs(C.BASE_WINDOW, C.int((C.int((C.ttyDisplay).curx) + offset)), C.int((C.ttyDisplay).cury));
    if ((C.flags).standout) C.standoutbeg();
    C.xputs(prompt);
{
        let save_cx = (C.ttyDisplay).curx;
        let np;
        for ((np = prompt); C.deref(np, "const char"); ((np = C.ptrAdd(np, 1, "char")), C.ptrAdd(np, -1, "char"))) {
            C.nomux_putch(C.deref(np, "const char"));
            C.bump(C.fieldRef(C.ttyDisplay, "curx"), 1, true, "short");
        }
        ((C.ttyDisplay).curx = C.short(save_cx));
    }
    ((C.ttyDisplay).curx = C.short(C.ulong((C.ulong((C.ttyDisplay).curx) + C.strlen(prompt)))));
    if ((C.flags).standout) C.standoutend();
    C.xwaitforspace(s);
}

/* change screen display for selection state of an item;
   not used or wanted for items that aren't shown by the current page */
export function set_item_state(window, lineno, item) {
    window = C.argument(window, "winid");
    lineno = C.argument(lineno, "int");
    item = C.argument(item, "tty_menu_item *");
    let ch = C.char((((item).selected) ? (((Number((item).count == C.long((-1n)))) ? 43 : 35)) : 45));
    do {
        if ((C.program_state).done_hup) {
            (C.morc = C.char(27));
            return;
        }
    }
    while (0);
    tty_curs(window, 4, lineno);
    C.term_start_attr((item).attr);
    if (Number((item).color != C.NO_COLOR)) C.term_start_color((item).color);
    C.putchar(ch);
    C.nomux_putch(ch);
    C.bump(C.fieldRef(C.ttyDisplay, "curx"), 1, true, "short");
    if (Number((item).color != C.NO_COLOR)) C.term_end_color();
    C.term_end_attr((item).attr);
}

/* select all [ignores pending count, if any] */
export function set_all_on_page(window, page_start, page_end) {
    window = C.argument(window, "winid");
    page_start = C.argument(page_start, "tty_menu_item *");
    page_end = C.argument(page_end, "tty_menu_item *");
    let curr;
    let n;
    for (((n = 0), (curr = page_start)); C.ptrCompare(curr, page_end, "!="); (((n = C.int((n + 1))), C.int((n - 1))), (curr = (curr).next))) {
        if (Number(!!(Number(!!(Number(!(((curr).identifier).a_void)) || (curr).selected)) || Number(!(C.menuitem_invert_test(1, (curr).itemflags, C.FALSE)))))) /* not selectable */
/* already selected */
        continue;
        ((curr).selected = C.TRUE);
        set_item_state(window, n, curr);
    }
}

/* unselect all */
export function unset_all_on_page(window, page_start, page_end) {
    window = C.argument(window, "winid");
    page_start = C.argument(page_start, "tty_menu_item *");
    page_end = C.argument(page_end, "tty_menu_item *");
    let curr;
    let n;
    for (((n = 0), (curr = page_start)); C.ptrCompare(curr, page_end, "!="); (((n = C.int((n + 1))), C.int((n - 1))), (curr = (curr).next))) {
        if (Number(!!(Number(!!(Number(!(((curr).identifier).a_void)) || Number(!((curr).selected)))) || Number(!(C.menuitem_invert_test(2, (curr).itemflags, C.TRUE)))))) /* skip if not selectable */
/* skip if already de-selected */
        continue;
        ((curr).selected = C.FALSE);
        ((curr).count = C.long((-1n)));
        set_item_state(window, n, curr);
    }
}

/* invert current page */
export function invert_all_on_page(window, page_start, page_end, acc, count) /* group accelerator, 0 => all */
/* pending count; -1L for non-group toggling */
{
    window = C.argument(window, "winid");
    page_start = C.argument(page_start, "tty_menu_item *");
    page_end = C.argument(page_end, "tty_menu_item *");
    acc = C.argument(acc, "char");
    count = C.argument(count, "long");
    let curr;
    let n;
    for (((n = 0), (curr = page_start)); C.ptrCompare(curr, page_end, "!="); (((n = C.int((n + 1))), C.int((n - 1))), (curr = (curr).next))) {
        if (Number(!!(Number(!(((curr).identifier).a_void)) || (((acc) ? Number((curr).gselector != acc) : Number(!(C.menuitem_invert_test(0, (curr).itemflags, (curr).selected)))))))) /* not selectable */
/* skip if not group 'acc' */
/* inverting all rather than a group; skip if flagged */
        continue;
        if ((curr).selected) {
            ((curr).selected = C.FALSE);
            ((curr).count = C.long((-1n)));
        }
        else {
            ((curr).selected = C.TRUE);
            if (Number(count > C.long(0))) ((curr).count = count);
        }
        set_item_state(window, n, curr);
    }
}

/* invert all entries that match given group accelerator (or all if zero) */
export function invert_all(window, page_start, page_end, acc, count) /* group accelerator, 0 => all */
/* pending count; -1L for non-group toggling */
{
    window = C.argument(window, "winid");
    page_start = C.argument(page_start, "tty_menu_item *");
    page_end = C.argument(page_end, "tty_menu_item *");
    acc = C.argument(acc, "char");
    count = C.argument(count, "long");
    let curr;
    let on_curr_page;
    let cw = C.deref(C.ptrAdd(C.wins, window, "struct WinDesc *"), "struct WinDesc *");
/* handle current page separately (it will need screen updating) */
    invert_all_on_page(window, page_start, page_end, acc, count);
/* invert the rest (no screen updating for them) */
    for (((on_curr_page = C.FALSE), (curr = (cw).mlist)); curr; (curr = (curr).next)) {
        if (C.ptrCompare(curr, page_start, "==")) (on_curr_page = C.TRUE);
        else if (C.ptrCompare(curr, page_end, "==")) (on_curr_page = C.FALSE);
/* skip if on current page (already handled above) or not
           selectable (header line or similar) or if group toggling
           is taking place and this item isn't in specified group or
           group toggling is not taking place and this item is off
           limits to bulk toggling (assumes that an item won't be
           both in a group and also subject to bulk restrictions) */
        if (Number(!!(Number(!!(on_curr_page || Number(!(((curr).identifier).a_void)))) || (((acc) ? Number((curr).gselector != acc) : Number(!(C.menuitem_invert_test(0, (curr).itemflags, (curr).selected)))))))) continue;
        if ((curr).selected) {
            ((curr).selected = C.FALSE);
            ((curr).count = C.long(C.int((-1))));
        }
        else {
            ((curr).selected = C.TRUE);
            if (Number(count > C.long(0))) ((curr).count = count);
        }
    }
}

/* support menucolor in addition to caller-supplied attribute */
export function toggle_menu_attr(on, color, attr) {
    on = C.argument(on, "boolean");
    color = C.argument(color, "int");
    attr = C.argument(attr, "int");
    if (on) {
        C.term_start_attr(attr);
        if (Number(color != C.NO_COLOR)) C.term_start_color(color);
    }
    else {
        if (Number(color != C.NO_COLOR)) C.term_end_color();
        C.term_end_attr(attr);
    }
}

export function process_menu_window(window, cw) {
    window = C.argument(window, "winid");
    cw = C.argument(cw, "struct WinDesc *");
    let page_start;
    let page_end;
    let curr;
    let count;
    let n;
    let attr_n;
    let curr_page;
    let page_lines;
    let resp_len;
    let previous_page_lines;
    let finished;
    let counting;
    let reset_count;
    let show_obj_syms;
    let only_if_no_headers = C.char(Number((C.int(((C.iflags).menuobjsyms & 4))) != 0));
    let cp;
    let rp;
    const resp = C.localArray("char[128]", 0);
    const gacc = C.localArray("char[128]", 0);
    let msave;
    let morestr;
    let really_morc;
/* pseudo menu manipulation char */
    (curr_page = (page_lines = 0));
    (page_start = (page_end = 0));
    (msave = (cw).morestr);
/* save the morestr */
    ((cw).morestr = (morestr = C.castPointer(C.alloc(C.uint(C.QBUFSZ)), "char *")));
    (counting = C.FALSE);
    (count = 0n);
    (reset_count = C.TRUE);
    (finished = C.FALSE);
    (previous_page_lines = 0);
/* collect group accelerators; for PICK_NONE, they're ignored;
       for PICK_ONE, only those which match exactly one entry will be
       accepted; for PICK_ANY, those which match any entry are okay */
    C.store(C.ptrAdd(gacc, 0, "char"), "char", C.char(0));
    if (Number((cw).how != C.PICK_NONE)) {
        let i;
        const gcnt = C.localArray("int[128]", 0);
/* guard against `signed char' */
        for ((i = 0); Number(i < C.int((C.ulong((BigInt(C.sizeof("int[128]")) / BigInt(C.sizeof("int"))))))); ((i = C.int((i + 1))), C.int((i - 1)))) C.store(C.ptrAdd(gcnt, i, "int"), "int", 0);
        for (((n = 0), (curr = (cw).mlist)); curr; (curr = (curr).next)) if (Number(!!((curr).gselector && Number((curr).gselector != (curr).selector)))) {
            (n = C.int((n + 1)));
            C.bump(C.reference(C.ptrAdd(gcnt, (C.int((((curr).gselector) & 127))), "int"), "int"), 1, false, "int");
        }
        if (Number(n > 0)) /* at least one group accelerator found */
        for (((rp = gacc), (curr = (cw).mlist)); curr; (curr = (curr).next)) if (Number(!!(Number(!!(Number(!!((curr).gselector && (Number(!!(Number((curr).gselector != (curr).selector) || Number((curr).gselector == C.GOLD_SYM)))))) && Number(!(C.strchr(gacc, (curr).gselector))))) && (Number(!!(Number((cw).how == C.PICK_ANY) || Number(C.deref(C.ptrAdd(gcnt, (C.int((((curr).gselector) & 127))), "int"), "int") == 1))))))) /* '$' is both a selector "letter" and a group
                           accelerator; including it in gacc allows gold to
                           be selected via group when not on current page */
{
            C.store(((rp = C.ptrAdd(rp, 1, "char")), C.ptrAdd(rp, -1, "char")), "char", (curr).gselector);
            C.store(rp, "char", C.char(0));
/* re-terminate for strchr() */
        }
    }
    (resp_len = 0);
/* lint suppression */
    (show_obj_syms = (C.iflags).use_menu_glyphs);
    if (only_if_no_headers) {
        for ((curr = (cw).mlist); curr; (curr = (curr).next)) if (C.ptrCompare(((curr).identifier).a_void, 0, "==")) {
            (show_obj_syms = C.FALSE);
            break;
        }
    }
/* loop until finished */
    while (Number(!(finished))) {
        do {
            if ((C.program_state).done_hup) {
                (C.morc = C.char(27));
                return;
            }
        }
        while (0);
        if (reset_count) {
            (counting = C.FALSE);
            (count = 0n);
        }
        else (reset_count = C.TRUE);
        if (Number(!(page_start))) {
/* new page to be displayed */
            if (Number(!!(Number(curr_page < 0) || (Number(!!(Number((cw).npages > C.long(0)) && Number(C.long(curr_page) >= (cw).npages))))))) C.panic(C.literal("bad menu screen page #%d"), curr_page, "i");
/* clear screen */
            if (Number(!((cw).offx))) {
/* if not corner, do clearscreen */
                if ((cw).offy) {
                    tty_curs(window, 1, 0);
                    C.cl_eos();
                }
                else C.term_clear_screen();
            }
            (rp = resp);
            if (Number((cw).npages > C.long(0))) {
/* collect accelerators */
                (page_start = C.deref(C.ptrAdd((cw).plist, curr_page, "tty_menu_item *"), "tty_menu_item *"));
                (page_end = C.deref(C.ptrAdd((cw).plist, C.int((curr_page + 1)), "tty_menu_item *"), "tty_menu_item *"));
                for (((page_lines = 0), (curr = page_start)); C.ptrCompare(curr, page_end, "!="); (((page_lines = C.int((page_lines + 1))), C.int((page_lines - 1))), (curr = (curr).next))) {
                    let attr;
                    let color = C.NO_COLOR;
                    if ((curr).selector) C.store(((rp = C.ptrAdd(rp, 1, "char")), C.ptrAdd(rp, -1, "char")), "char", (curr).selector);
                    tty_curs(window, 1, page_lines);
                    if ((cw).offx) C.cl_end();
                    C.putchar(32);
                    C.bump(C.fieldRef(C.ttyDisplay, "curx"), 1, false, "short");
                    (attr = (curr).attr);
                    (color = (curr).color);
/* which character to start attribute highlighting;
                       whole line for headers and such, after the selector
                       character and space and selection indicator for menu
                       lines (including fake ones that simulate grayed-out
                       entries, so we don't rely on curr->identifier here) */
                    (attr_n = 0);
/* whole line */
                    if (Number(!!(Number(!!(Number(!!(Number(!!(C.deref(C.ptrAdd((curr).str, 0, "char"), "char") && Number(C.deref(C.ptrAdd((curr).str, 1, "char"), "char") == 32))) && C.deref(C.ptrAdd((curr).str, 2, "char"), "char"))) && C.strchr(C.literal("-+#"), C.deref(C.ptrAdd((curr).str, 2, "char"), "char")))) && Number(C.deref(C.ptrAdd((curr).str, 3, "char"), "char") == 32)))) /* [0]=letter, [1]=space, [2]=[-+#], [3]=space */
                    (attr_n = 4);
/* [4:N]=entry description */
/*
                     * Don't use xputs() because (1) under unix it calls
                     * tputstr() which will interpret a '*' as some kind
                     * of padding information and (2) it calls xputc to
                     * actually output the character.  We're faster doing
                     * this.
                     */
                    for (((n = 0), (cp = (curr).str)); Number(!!(C.deref(cp, "char") && Number(C.int(C.bump(C.fieldRef(C.ttyDisplay, "curx"), 1, false, "short")) < C.int((C.ttyDisplay).cols)))); (((cp = C.ptrAdd(cp, 1, "char")), C.ptrAdd(cp, -1, "char")), ((n = C.int((n + 1))), C.int((n - 1))))) {
                        if (Number(!!(Number(n == attr_n) && (Number(!!(Number(color != C.NO_COLOR) || Number(attr != C.ATR_NONE))))))) toggle_menu_attr(C.TRUE, color, attr);
                        if (Number(!!(Number(!!(Number(n == 2) && C.ptrCompare(((curr).identifier).a_void, 0, "!="))) && (curr).selected))) {
                            let c = C.char((((Number((curr).count == C.long((-1n))))) ? 42 : 35));
{
                                let svx = (C.ttyDisplay).curx;
                                C.bump(C.fieldRef(C.ttyDisplay, "curx"), -1, true, "short");
                                C.nomux_putch(c);
                                ((C.ttyDisplay).curx = C.short(svx));
                            }
/* all selected: '*' vs count selected: '#' */
                            C.putchar(c);
                        }
                        else if (Number(!!(Number(!!(Number(!!(Number(n == 2) && C.ptrCompare(((curr).identifier).a_void, 0, "!="))) && show_obj_syms)) && Number(((curr).glyphinfo).glyph != C.MAX_GLYPH)))) {
                            let gcolor = ((((curr).glyphinfo).gm).sym).color;
/* tty_print_glyph could be used, but is overkill
                               and requires referencing the cursor location */
                            toggle_menu_attr(C.TRUE, gcolor, C.ATR_NONE);
                            C.putchar(((curr).glyphinfo).ttychar);
{
                                let svx = (C.ttyDisplay).curx;
                                C.bump(C.fieldRef(C.ttyDisplay, "curx"), -1, true, "short");
                                C.nomux_putch(((curr).glyphinfo).ttychar);
                                ((C.ttyDisplay).curx = C.short(svx));
                            }
                            toggle_menu_attr(C.FALSE, gcolor, C.ATR_NONE);
                        }
                        else {
                            C.putchar(C.deref(cp, "char"));
{
                                let svx = (C.ttyDisplay).curx;
                                C.bump(C.fieldRef(C.ttyDisplay, "curx"), -1, true, "short");
                                C.nomux_putch(C.deref(cp, "char"));
                                ((C.ttyDisplay).curx = C.short(svx));
                            }
                        }
                    }
/* for *cp */
                    if (Number(!!(Number(n > attr_n) && (Number(!!(Number(color != C.NO_COLOR) || Number(attr != C.ATR_NONE))))))) toggle_menu_attr(C.FALSE, color, attr);
                }
/* if npages > 0 */
            }
            else {
                (page_start = 0);
                (page_end = 0);
                (page_lines = 0);
            }
            C.store(rp, "char", C.char(0));
/* remember how many explicit menu choices there are */
            (resp_len = C.int(C.strlen(resp)));
/* corner window - clear extra lines from last page */
            if ((cw).offx) {
                for ((n = C.int((page_lines + 1))); Number(C.long(n) < (cw).maxrow); ((n = C.int((n + 1))), C.int((n - 1)))) {
                    tty_curs(window, 1, n);
                    C.cl_end();
                }
/*
                 * If this corner menu was big, there are likely large
                 * portions of the map, status window, and tty perm_invent
                 * window (is there is one), that are all missing a lot of
                 * information. Let's repair the blacked-out rows now
                 * because it looks better.
                 */
                if (Number(!!(Number(previous_page_lines != 0) && Number(page_lines < previous_page_lines)))) {
/*
                     * +3 to leave a couple of blank rows
                     * under the menu to make it contrast well.
                     */
                    let row_startoffset = C.int((page_lines + 3));
                    if (Number(C.long(row_startoffset) > C.long(((cw).maxrow - C.long(1))))) (row_startoffset = C.int(C.long(((cw).maxrow - C.long(1)))));
                    docorner(C.int((cw).offx), C.int(C.long(((cw).maxrow + C.long(1)))), row_startoffset);
                }
            }
/* set extra chars.. */
            if (C.deref(gacc, "char")) {
                C.strcat(resp, gacc);
/* group accelerators */
                if (Number((cw).how == C.PICK_ONE)) (resp_len = C.int(C.strlen(resp)));
            }
            C.strcat(resp, C.literal(" "));
/* next page or end */
            C.strcat(resp, C.literal("0123456789\u001b\n\r"));
/* counts, quit */
            C.strcat(resp, (C.gm).mapped_menu_cmds);
            C.strcat(resp, C.default_menu_cmds);
            if (Number((cw).npages > C.long(1))) C.sprintf((cw).morestr, C.literal("(%d of %d)"), C.int((curr_page + 1)), C.int((cw).npages), "ii");
            else if (msave) C.strcpy((cw).morestr, msave);
            else C.strcpy((cw).morestr, C.defmorestr);
            tty_curs(window, 1, page_lines);
            C.cl_end();
            dmore(cw, resp);
        }
        else {
/* just put the cursor back... */
            tty_curs(window, C.int((C.int(C.strlen((cw).morestr)) + 2)), page_lines);
            C.xwaitforspace(resp);
        }
        (really_morc = C.morc);
/* (only used with MENU_EXPLICIT_CHOICE) */
        if (Number(!!(C.ptrCompare(((rp = C.strchr(resp, C.morc))), 0, "!=") && C.ptrCompare(rp, C.ptrAdd(resp, resp_len, "char"), "<")))) /* explicit menu selection; don't override it if it also
               happens to match a mapped menu command (such as ':' to
               look inside a container vs ':' to search) */
        (C.morc = C.char(127));
        else (C.morc = C.map_menu_cmd(C.morc));
        let group_entry = false;
        menu_dispatch: for (;;) {
        switch (group_entry ? -1000 : C.morc) {
            case (48):
                case (49):
                    case (50):
                        case (51):
                            case (52):
                                case (53):
                                    case (54):
                                        case (55):
                                            case (56):
                                                case (57):
/* special case: '0' is also the default ball class;
               some menus use digits as potential group accelerators
               but their entries don't rely on counts */
                                                    if (Number(!!(Number(!(counting)) && C.strchr(gacc, C.morc)))) { group_entry = true; continue menu_dispatch; }
{
                let dgt = C.long((C.int((C.morc - 48))));
/* count = (10 * count) + (morc - '0'); */
                (count = ((((Number(!!(Number((count) < C.long((9223372036854775807n / 10n))) || (Number(!!(Number((count) == C.long((9223372036854775807n / 10n))) && Number((dgt) <= C.long((9223372036854775807n % 10n)))))))))) ? C.long((C.long(((count) * 10n)) + (dgt))) : C.long((-1n)))));
                if (Number(count < 0n)) /* overflow */
                continue;
/* reset_count is True */
            }
/*
             * It is debatable whether we should allow 0 to
             * start a count.  There is no difference if the
             * item is selected.  If not selected, then
             * "0b" could mean:
             *
             *  count starting zero:    "zero b's"
             *  ignore starting zero:   "select b"
             *
             * At present I don't know which is better.
             */
            if (Number(count != 0n)) {
/* ignore leading zeros */
                (counting = C.TRUE);
                (reset_count = C.FALSE);
            }
            break;
            case (27):
/* cancel - from counting or loop */
                if (Number(!(counting))) {
/* deselect everything */
                    for ((curr = (cw).mlist); curr; (curr = (curr).next)) {
                        ((curr).selected = C.FALSE);
                        ((curr).count = C.long((-1n)));
                    }
                    ((cw).flags = C.int(C.int(((cw).flags | C.WIN_CANCELLED))));
                    (finished = C.TRUE);
                }
/* else only stop count */
            break;
            case (0):
/* finished (commit) */
                case (10):
                    case (13):
                        (finished = C.TRUE);
            break;
            case (32):
                case (62):
                    if (Number(!!(Number((cw).npages > C.long(0)) && Number(C.long(curr_page) != C.long(((cw).npages - C.long(1))))))) {
                        (previous_page_lines = page_lines);
                        ((curr_page = C.int((curr_page + 1))), C.int((curr_page - 1)));
                        (page_start = 0);
                    }
                    else if (Number(C.morc == 32)) {
/* ' ' finishes menus here, but stop '>' doing the same. */
                        (finished = C.TRUE);
                    }
            break;
            case (60):
                if (Number(!!(Number((cw).npages > C.long(0)) && Number(curr_page != 0)))) {
                    (curr_page = C.int((curr_page - 1)));
                    (page_start = 0);
                }
            break;
            case (94):
                if (Number(!!(Number((cw).npages > C.long(0)) && Number(curr_page != 0)))) {
                    (page_start = 0);
                    (curr_page = 0);
                }
            break;
            case (124):
                if (Number(!!(Number((cw).npages > C.long(0)) && Number(C.long(curr_page) != C.long(((cw).npages - C.long(1))))))) {
                    (page_start = 0);
                    (curr_page = C.int(C.long(((cw).npages - C.long(1)))));
                }
            break;
            case (44):
                if (Number((cw).how == C.PICK_ANY)) set_all_on_page(window, page_start, page_end);
            break;
            case (92):
                unset_all_on_page(window, page_start, page_end);
            break;
            case (126):
                if (Number((cw).how == C.PICK_ANY)) invert_all_on_page(window, page_start, page_end, C.char(0), C.long((-1n)));
            break;
            case (46):
                if (Number((cw).how == C.PICK_ANY)) {
/* entries on the current page need screen updating */
                    set_all_on_page(window, page_start, page_end);
/* set the rest; entries on current page will be skipped
                   because all of those will be 'already selected' now
                   (some won't be if they failed menuitem_invert_test()
                   in set_all_on_page() but those will fail it again here) */
                    for ((curr = (cw).mlist); curr; (curr = (curr).next)) {
                        if (Number(!!(Number(!!(Number(!(((curr).identifier).a_void)) || (curr).selected)) || Number(!(C.menuitem_invert_test(1, (curr).itemflags, C.FALSE)))))) /* not selectable */
/* already selected */
/* FALSE: not currently selected */
                        continue;
                        ((curr).selected = C.TRUE);
                    }
                }
/* if PICK_ANY */
            break;
            case (45):
/* entries on the current page need screen updating */
                unset_all_on_page(window, page_start, page_end);
/* unset the rest; entries on current page will be skipped
               because none of those will still be in 'selected' state
               (unless they failed the menuitem_invert_test() in
               unset_all_on_page() but those will fail it again here) */
            for ((curr = (cw).mlist); curr; (curr = (curr).next)) {
                if (Number(!!(Number(!!(Number(!(((curr).identifier).a_void)) || Number(!((curr).selected)))) || Number(!(C.menuitem_invert_test(2, (curr).itemflags, C.TRUE)))))) /* not selectable */
/* already de-selected */
/* TRUE: currently selected */
                continue;
                ((curr).selected = C.FALSE);
                ((curr).count = C.long(C.int((-1))));
            }
            break;
            case (64):
                if (Number((cw).how == C.PICK_ANY)) invert_all(window, page_start, page_end, C.char(0), C.long((-1n)));
            break;
            case (58):
                if (Number((cw).how == C.PICK_NONE)) {
                    C.tty_nhbell();
                    break;
                }
                else {
                    const searchbuf = C.localArray("char[258]", 0);
                    const tmpbuf = C.localArray("char[256]", []);
                    let on_curr_page = C.FALSE;
                    let lineno = 0;
                    C.tty_getlin(C.literal("Search for:"), tmpbuf);
                    if (Number(!!(Number(!(C.deref(C.ptrAdd(tmpbuf, 0, "char"), "char"))) || Number(C.deref(C.ptrAdd(tmpbuf, 0, "char"), "char") == 27)))) break;
                    C.sprintf(searchbuf, C.literal("*%s*"), tmpbuf, "p");
                    for ((curr = (cw).mlist); curr; (curr = (curr).next)) {
                        if (on_curr_page) ((lineno = C.int((lineno + 1))), C.int((lineno - 1)));
                        if (C.ptrCompare(curr, page_start, "==")) (on_curr_page = C.TRUE);
                        else if (C.ptrCompare(curr, page_end, "==")) (on_curr_page = C.FALSE);
                        if (Number(!!(((curr).identifier).a_void && C.pmatchi(searchbuf, (curr).str)))) {
                            toggle_menu_curr(window, curr, lineno, on_curr_page, counting, count);
                            if (Number((cw).how == C.PICK_ONE)) {
                                (finished = C.TRUE);
                                break;
                            }
                        }
                    }
                }
            break;
            case (127):
                (C.morc = really_morc);
            ;
/*FALLTHRU*/
            default:
                if (!group_entry && Number(!!(Number((cw).how == C.PICK_NONE) || Number(!(C.strchr(resp, C.morc)))))) {
/* unacceptable input received */
                    C.tty_nhbell();
                    break;
                }
                else if (group_entry || C.strchr(gacc, C.morc)) {
/* group accelerator; for the PICK_ONE case, we know that
                   it matches exactly one item in order to be in gacc[] */
                    invert_all(window, page_start, page_end, C.morc, ((counting) ? count : C.long((-1n))));
                    if (Number((cw).how == C.PICK_ONE)) (finished = C.TRUE);
                    break;
                }
/* find, toggle, and possibly update */
            for (((n = 0), (curr = page_start)); C.ptrCompare(curr, page_end, "!="); (((n = C.int((n + 1))), C.int((n - 1))), (curr = (curr).next))) if (Number(C.morc == (curr).selector)) {
                toggle_menu_curr(window, curr, n, C.TRUE, counting, count);
                if (Number((cw).how == C.PICK_ONE)) (finished = C.TRUE);
                break;
/* from `for' loop */
            }
            break;
        }
        break menu_dispatch;
        } // menu_dispatch
    }
/* while */
    ((cw).morestr = msave);
    C.free(C.castPointer(morestr, "void *"));
}

export function process_text_window(window, cw) {
    window = C.argument(window, "winid");
    cw = C.argument(cw, "struct WinDesc *");
    let i;
    let n;
    let attr;
    let linestart;
    let cp;
    for (((n = 0), (i = 0)); Number(C.long(i) < (cw).maxrow); ((i = C.int((i + 1))), C.int((i - 1)))) {
        do {
            if ((C.program_state).done_hup) {
                (C.morc = C.char(27));
                return;
            }
        }
        while (0);
        if (Number(!!(Number(!((cw).offx)) && (Number(C.int((n + (cw).offy)) == C.int(((C.ttyDisplay).rows - 1))))))) {
            tty_curs(window, 1, n);
            C.cl_end();
            dmore(cw, C.quitchars);
            if (Number(C.morc == 27)) {
                ((cw).flags = C.int(C.int(((cw).flags | C.WIN_CANCELLED))));
                break;
            }
            if ((cw).offy) {
                tty_curs(window, 1, 0);
                C.cl_eos();
            }
            else C.term_clear_screen();
            (n = 0);
        }
        tty_curs(window, 1, ((n = C.int((n + 1))), C.int((n - 1))));
        C.cl_end();
        if (C.deref(C.ptrAdd((cw).data, i, "char *"), "char *")) {
            (attr = C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd((cw).data, i, "char *"), "char *"), 0, "char"), "char") - 1)));
            if ((cw).offx) {
                C.putchar(32);
                C.nomux_putch(32);
                C.bump(C.fieldRef(C.ttyDisplay, "curx"), 1, false, "short");
            }
            C.term_start_attr(attr);
            for (((cp = C.ptrAdd(C.deref(C.ptrAdd((cw).data, i, "char *"), "char *"), 1, "char")), (linestart = C.TRUE)); Number(!!(C.deref(cp, "char") && Number(C.int(C.bump(C.fieldRef(C.ttyDisplay, "curx"), 1, false, "short")) < C.int((C.ttyDisplay).cols)))); ((cp = C.ptrAdd(cp, 1, "char")), C.ptrAdd(cp, -1, "char"))) {
/* message recall for msg_window:full/combination/reverse
                   might have output from '/' in it (see redotoplin()) */
                if (linestart) {
                    if ((Number(C.uint((C.deref(C.ptrAdd((C.gs).symset, (C.gc).currentgraphics, "struct symsetentry"), "struct symsetentry")).handling) == C.uint((C.H_UTF8))))) {
/* FIXME: what is actually in that line? is it the \GNNNNNNNN or UTF-8? */
                        g_putch(C.deref(cp, "char"));
                    }
                    else if (Number((C.int((C.deref(cp, "char") & 128))) != 0)) {
                        g_putch(C.deref(cp, "char"));
                        end_glyphout();
                    }
                    else {
                        C.putchar(C.deref(cp, "char"));
{
                            let svx = (C.ttyDisplay).curx;
                            C.bump(C.fieldRef(C.ttyDisplay, "curx"), -1, true, "short");
                            C.nomux_putch(C.deref(cp, "char"));
                            ((C.ttyDisplay).curx = C.short(svx));
                        }
                    }
                    (linestart = C.FALSE);
                }
                else {
                    C.putchar(C.deref(cp, "char"));
{
                        let svx = (C.ttyDisplay).curx;
                        C.bump(C.fieldRef(C.ttyDisplay, "curx"), -1, true, "short");
                        C.nomux_putch(C.deref(cp, "char"));
                        ((C.ttyDisplay).curx = C.short(svx));
                    }
                }
            }
            C.term_end_attr(attr);
        }
    }
    if (Number(C.long(i) == (cw).maxrow)) {
        if (Number((cw).type == C.NHW_TEXT)) {
            tty_curs(C.BASE_WINDOW, 1, C.int((C.int((C.ttyDisplay).cury) + 1)));
            C.cl_eos();
        }
        tty_curs(C.BASE_WINDOW, C.int((C.int((cw).offx) + 1)), (((Number((cw).type == C.NHW_TEXT))) ? C.int((C.int((C.ttyDisplay).rows) - 1)) : n));
        C.cl_end();
        dmore(cw, C.quitchars);
        if (Number(C.morc == 27)) ((cw).flags = C.int(C.int(((cw).flags | C.WIN_CANCELLED))));
    }
}

/*ARGSUSED*/
export function tty_display_nhwindow(window, blocking) /* with ttys, all windows are blocking */
{
    window = C.argument(window, "winid");
    blocking = C.argument(blocking, "boolean");
    let cw = 0;
    let s_maxcol;
    do {
        if ((C.program_state).done_hup) {
            (C.morc = C.char(27));
            return;
        }
    }
    while (0);
    if (Number(!!(Number(window == (C.int((-1)))) || C.ptrCompare(((cw = C.deref(C.ptrAdd(C.wins, window, "struct WinDesc *"), "struct WinDesc *"))), 0, "==")))) C.panic(C.winpanicstr, window, C.literal("tty_display_nhwindow"), "ip");
    if (C.int(((cw).flags & C.WIN_CANCELLED))) return;
    ((C.ttyDisplay).lastwin = window);
    ((C.ttyDisplay).rawprint = 0);
    ;
    switch ((cw).type) {
        case C.NHW_MESSAGE:
            if (Number((C.ttyDisplay).toplin == C.TOPLINE_NEED_MORE)) {
                C.more();
                ((C.ttyDisplay).toplin = C.TOPLINE_NEED_MORE);
/* more resets this */
                tty_clear_nhwindow(window);
                (Number(!!((Number(!(Number(!((Number((C.ttyDisplay).toplin == 0))))))) || ((C.nhassert_failed(C.literal("ttyDisplay->toplin == TOPLINE_EMPTY"), C.literal("../win/tty/wintty.c"), 1926), 0)))));
            }
            else ((C.ttyDisplay).toplin = C.TOPLINE_EMPTY);
        ((cw).curx = ((cw).cury = C.long(0)));
        if (Number(!((cw).active))) ((C.iflags).window_inited = C.TRUE);
        break;
        case C.NHW_MAP:
            end_glyphout();
        if (blocking) {
            if (Number((C.ttyDisplay).toplin != C.TOPLINE_EMPTY)) ((C.ttyDisplay).toplin = C.TOPLINE_NEED_MORE);
            tty_display_nhwindow(C.WIN_MESSAGE, C.TRUE);
            return;
        }
        ;
/*FALLTHRU*/
        case C.NHW_BASE:
            C.fflush((C.stdout));
        break;
        case C.NHW_TEXT:
            ((cw).maxcol = C.long((C.ttyDisplay).cols));
/* force full-screen mode */
        ;
/*FALLTHRU*/
        case C.NHW_MENU:
            ((cw).active = C.char(1));
/* cw->maxcol is a long, but its value is constrained to
           be <= ttyDisplay->cols, so is sure to fit within a short */
        (s_maxcol = C.short((cw).maxcol));
        ((cw).offx = C.short((((Number((cw).type == C.NHW_TEXT))) ? 0 : (((Number(((((Number((82) < (C.int(Math.trunc((C.ttyDisplay).cols / 2))))) ? (82) : (C.int(Math.trunc((C.ttyDisplay).cols / 2)))))) < (C.int((C.int(((C.ttyDisplay).cols - s_maxcol)) - 1))))) ? ((((Number((82) < (C.int(Math.trunc((C.ttyDisplay).cols / 2))))) ? (82) : (C.int(Math.trunc((C.ttyDisplay).cols / 2)))))) : (C.int((C.int(((C.ttyDisplay).cols - s_maxcol)) - 1))))))));
/* avoid converting to uchar before calculations are finished */
        if (Number((cw).offx < 0)) ((cw).offx = C.short(0));
        if (Number((cw).type == C.NHW_MENU)) ((cw).offy = C.short(0));
        if (Number((C.ttyDisplay).toplin == C.TOPLINE_NEED_MORE)) tty_display_nhwindow(C.WIN_MESSAGE, C.TRUE);
        if (Number(!!(Number((cw).maxrow >= C.long(C.int((C.ttyDisplay).rows))) || Number(!((C.iflags).menu_overlay))))) {
            ((cw).offx = C.short(0));
            if (Number(!!((cw).offy || (C.iflags).menu_overlay))) {
                tty_curs(window, 1, 0);
                C.cl_eos();
            }
            else C.term_clear_screen();
            ((C.ttyDisplay).toplin = C.TOPLINE_EMPTY);
        }
        else {
            if (Number(C.WIN_MESSAGE != (C.int((-1))))) tty_clear_nhwindow(C.WIN_MESSAGE);
        }
        if (Number(!!((cw).data || Number(!((cw).maxrow))))) C.callLocal(process_text_window, window, cw);
        else C.callLocal(process_menu_window, window, cw);
        break;
    }
    ((cw).active = C.char(1));
}

export function tty_dismiss_nhwindow(window) {
    window = C.argument(window, "winid");
    let cw = 0;
    do {
        if ((C.program_state).done_hup) {
            (C.morc = C.char(27));
            return;
        }
    }
    while (0);
    if (Number(!!(Number(window == (C.int((-1)))) || C.ptrCompare(((cw = C.deref(C.ptrAdd(C.wins, window, "struct WinDesc *"), "struct WinDesc *"))), 0, "==")))) C.panic(C.winpanicstr, window, C.literal("tty_dismiss_nhwindow"), "ip");
    ;
    switch ((cw).type) {
        case C.NHW_MESSAGE:
            if (Number((C.ttyDisplay).toplin != C.TOPLINE_EMPTY)) tty_display_nhwindow(C.WIN_MESSAGE, C.TRUE);
        (Number(!!((Number(!(Number(!((Number((C.ttyDisplay).toplin == 0))))))) || ((C.nhassert_failed(C.literal("ttyDisplay->toplin == TOPLINE_EMPTY"), C.literal("../win/tty/wintty.c"), 2015), 0)))));
        ;
/*FALLTHRU*/
        case C.NHW_STATUS:
            case C.NHW_BASE:
                case C.NHW_MAP:
/*
         * these should only get dismissed when the game is going away
         * or suspending
         */
                    tty_curs(C.BASE_WINDOW, 1, C.int((C.int((C.ttyDisplay).rows) - 1)));
        ((cw).active = C.char(0));
        break;
        case C.NHW_MENU:
            case C.NHW_TEXT:
                case C.NHW_PERMINVENT:
                    if ((cw).active) {
/* skip erasure if window_inited has been reset to 0 during
               final run-down in case this is the end-of-game window;
               the contents of that window should remain shown even when
               the window itself has gone away */
                        if (Number(!!((C.iflags).window_inited && Number(!(C.erasing_tty_screen))))) {
                            let clearscreen = C.FALSE;
/* just erase the menu */
/* during role/race/&c selection, menus are put up on top
                   of the base window; we don't track what was there so
                   can't refresh--force the screen to be cleared instead
                   (affects dismissal of 'reset role filtering' menu if
                   screen height forces that to need a second page) */
                            if ((C.program_state).in_role_selection) (clearscreen = C.TRUE);
                            erase_menu_or_text(window, cw, clearscreen);
                        }
                        ((cw).active = C.char(0));
                    }
        break;
    }
    ((cw).flags = 0);
}

export function tty_destroy_nhwindow(window) {
    window = C.argument(window, "winid");
    let cw = 0;
    if (Number(!!(Number(window == (C.int((-1)))) || C.ptrCompare(((cw = C.deref(C.ptrAdd(C.wins, window, "struct WinDesc *"), "struct WinDesc *"))), 0, "==")))) {
        if (Number(window == C.WIN_INVEN)) /* Null wins[WIN_INVEN] is tolerated */
        return;
        C.panic(C.winpanicstr, window, C.literal("tty_destroy_nhwindow"), "ip");
    }
    if ((cw).active) tty_dismiss_nhwindow(window);
    if (Number((cw).type == C.NHW_MESSAGE)) ((C.iflags).window_inited = C.char(0));
    if (Number((cw).type == C.NHW_MAP)) C.term_clear_screen();
    free_window_info(cw, C.TRUE);
    C.free(C.castPointer(cw, "void *"));
    C.store(C.ptrAdd(C.wins, window, "struct WinDesc *"), "struct WinDesc *", 0);
/* available for re-use */
}

/* when screen is cleared, reset stored data to spaces */
export function erase_tty_screen() {
    let cw;
    let i;
    do {
        if ((C.program_state).done_hup) {
            (C.morc = C.char(27));
            return;
        }
    }
    while (0);
    if (((C.erasing_tty_screen = C.int((C.erasing_tty_screen + 1))), C.int((C.erasing_tty_screen - 1)))) return;
/* originally we called term_clear_screen() but now it calls us */
/* erase the screen */
/* update window data to reflect that each active window is all blanks */
    for ((i = 0); Number(i < C.MAXWIN); (i = C.int((i + 1)))) {
        (cw = C.deref(C.ptrAdd(C.wins, i, "struct WinDesc *"), "struct WinDesc *"));
        if (Number(!!(cw && (cw).active))) tty_clear_nhwindow(i);
    }
    tty_curs(C.BASE_WINDOW, 1, 0);
    (C.erasing_tty_screen = 0);
}

export function tty_curs(window, x, y) /* coordinates (and curx-x) must be signed */
{
    window = C.argument(window, "winid");
    x = C.argument(x, "int");
    y = C.argument(y, "int");
    let cw = 0;
    let cx = (C.ttyDisplay).curx;
    let cy = (C.ttyDisplay).cury;
    do {
        if ((C.program_state).done_hup) {
            (C.morc = C.char(27));
            return;
        }
    }
    while (0);
    if (Number(!!(Number(window == (C.int((-1)))) || C.ptrCompare(((cw = C.deref(C.ptrAdd(C.wins, window, "struct WinDesc *"), "struct WinDesc *"))), 0, "==")))) C.panic(C.winpanicstr, window, C.literal("tty_curs"), "ip");
    ((C.ttyDisplay).lastwin = window);
    ;
    if (Number(!!(Number(!!(Number(!!(Number(x < 1) || Number(y < 0))) || Number(C.long(y) >= (cw).rows))) || Number(C.long(x) > (cw).cols)))) {
        let s = C.literal("[unknown type]");
        switch ((cw).type) {
            case C.NHW_MESSAGE:
                (s = C.literal("[topl window]"));
            break;
            case C.NHW_STATUS:
                (s = C.literal("[status window]"));
            break;
            case C.NHW_MAP:
                (s = C.literal("[map window]"));
            break;
            case C.NHW_MENU:
                (s = C.literal("[corner window]"));
            break;
            case C.NHW_TEXT:
                (s = C.literal("[text window]"));
            break;
            case C.NHW_BASE:
                (s = C.literal("[base window]"));
            break;
        }
/* avoid sending a line to the message window if we're complaining
           about cursor positioning in message window; perhaps raw_printf?
           this ought to be using impossible() so that someone might
           actually see it */
        if (Number((cw).type != C.NHW_MESSAGE)) do {
            if (C.debugcore(C.literal("../win/tty/wintty.c"), C.char(1))) {
                let save_plnmsg = (C.iflags).last_msg;
                C.pline(C.literal("tty_curs: bad positioning win %d %s <%d,%d>"), window, s, x, y, "ipii");
                ((C.iflags).last_msg = save_plnmsg);
            }
        }
        while (0);
/* don't try to fix up x,y here because then tty_curs() would
           behave differently depending on whether DEBUG is defined;
           garbage in, garbage out is the order of the day... */
    }
/* DEBUG */
    ((cw).curx = C.long((x = C.int((x - 1)))));
/* column 0 is not used */
    ((cw).cury = C.long(y));
    (x = C.int(C.int((x + (cw).offx))));
    (y = C.int(C.int((y + (cw).offy))));
    if (Number(!!(C.clipping && Number(window == C.WIN_MAP)))) {
        (x = C.int(C.int((x - C.clipx))));
        (y = C.int(C.int((y - C.clipy))));
    }
    if (Number(!!(Number(y == cy) && Number(x == cx)))) return;
    if (Number((cw).type == C.NHW_MAP)) end_glyphout();
    if (Number(!!(Number(!((C.tc_lcl_data).tc_ND)) && (Number(!!(Number(cx != x) || Number(x <= 3))))))) {
/* Extremely primitive */
        C.cmov(x, y);
/* bunker!wtm */
        return;
    }
    if (Number(((cy = C.int(C.int((cy - y))))) < 0)) (cy = C.int((-cy)));
    if (Number(((cx = C.int(C.int((cx - x))))) < 0)) (cx = C.int((-cx)));
    if (Number(!!(Number(cy <= 3) && Number(cx <= 3)))) {
        C.nocmov(x, y);
    }
    else if (Number(!!((Number(!!(Number(x <= 3) && Number(cy <= 3)))) || (Number(!!(Number(!((C.tc_lcl_data).tc_CM)) && Number(x < cx))))))) {
        C.putchar(13);
        ((C.ttyDisplay).curx = C.short(0));
        C.nocmov(x, y);
    }
    else if (Number(!((C.tc_lcl_data).tc_CM))) {
        C.nocmov(x, y);
    }
    else C.cmov(x, y);
    ((C.ttyDisplay).curx = C.short(x));
    ((C.ttyDisplay).cury = C.short(y));
}

export function compress_str(str) {
    str = C.argument(str, "const char *");
    C.declareStatic("compress_str.cbuf", "char[256]", 0);
/* compress out consecutive spaces if line is too long;
       topline wrapping converts space at wrap point into newline,
       we reverse that here */
    if (Number(!!(Number(C.int(C.strlen(str)) >= ((C.gt).tc_gbl_data).tc_CO) || C.strchr(str, 10)))) {
        let in_str = str;
        let c;
        let outstr = C.staticCell("compress_str.cbuf").value;
        let outend = C.ptrAdd(C.staticCell("compress_str.cbuf").value, C.ulong((BigInt(C.sizeof("char[256]")) - C.ulong(1))), "char");
        let was_space = C.TRUE;
/* True discards all leading spaces;
                                     False would retain one if present */
        while (Number(!!(Number(((c = C.deref(((in_str = C.ptrAdd(in_str, 1, "char")), C.ptrAdd(in_str, -1, "char")), "const char"))) != 0) && C.ptrCompare(outstr, outend, "<")))) {
            if (Number(c == 10)) (c = C.char(32));
            if (Number(!!(was_space && Number(c == 32)))) continue;
            C.store(((outstr = C.ptrAdd(outstr, 1, "char")), C.ptrAdd(outstr, -1, "char")), "char", c);
            (was_space = C.char((Number(c == 32))));
        }
        if (Number(!!((Number(!!(was_space && C.ptrCompare(outstr, C.staticCell("compress_str.cbuf").value, ">")))) || C.ptrCompare(outstr, outend, "==")))) (outstr = C.ptrAdd(outstr, -1, "char"));
/* remove trailing space or make room for terminator */
        C.store(outstr, "char", C.char(0));
        (str = C.staticCell("compress_str.cbuf").value);
    }
    return str;
}

export function tty_putstr(window, attr, str) {
    window = C.argument(window, "winid");
    attr = C.argument(attr, "int");
    str = C.argument(str, "const char *");
    let cw = 0;
    let ob;
    let i;
    let n0;
    do {
        if ((C.program_state).done_hup) {
            (C.morc = C.char(27));
            return;
        }
    }
    while (0);
/* Assume there's a real problem if the window is missing --
     * probably a panic message
     */
    if (Number(!!(Number(window == (C.int((-1)))) || C.ptrCompare(((cw = C.deref(C.ptrAdd(C.wins, window, "struct WinDesc *"), "struct WinDesc *"))), 0, "==")))) {
        tty_raw_print(str);
        return;
    }
    if (Number(!!(C.ptrCompare(str, 0, "==") || (Number(!!((C.int(((cw).flags & C.WIN_CANCELLED))) && (Number((cw).type != C.NHW_MESSAGE)))))))) return;
    if (Number((cw).type != C.NHW_MESSAGE)) (str = C.callLocal(compress_str, str));
    ((C.ttyDisplay).lastwin = window);
    ;
    switch ((cw).type) {
        case C.NHW_MESSAGE:
{
                let suppress_history = (C.int((attr & C.ATR_NOHISTORY)));
                let urgent_message = (C.int((attr & C.ATR_URGENT)));
/* if ^C occurs, player is prompted with "Really quit?" and that
           prompt is issued via tty_putstr(WIN_MESSAGE); if ^C happens
           while writing DECgraphics chars, the prompt text would be
           rendered as VT line-drawing characters unless we do this;
           also, if color was in progress it wouldn't be switched off */
                end_glyphout();
/* if message is designated 'urgent' don't suppress it if user has
           typed ESC at --More-- prompt when dismissing an earlier message;
           besides turning off WIN_STOP, we need to prevent current message
           from provoking --More-- and giving the user another chance at
           using ESC to suppress, otherwise this message wouldn't get shown */
                if (urgent_message) {
                    if (Number((C.int(((cw).flags & C.WIN_STOP))) != 0)) {
                        tty_clear_nhwindow(C.WIN_MESSAGE);
                        ((cw).flags = C.int(C.int(((cw).flags & C.int((~C.WIN_STOP))))));
                    }
                    ((cw).flags = C.int(C.int(((cw).flags | C.WIN_NOSTOP))));
                }
/* in case we ever support display attributes for topline
           messages, clear flag mask leaving only display attr */
/*attr &= ~(ATR_URGENT | ATR_NOHISTORY);*/
                if (Number(!(suppress_history))) {
/* normal output; add to current top line if room, else flush
               whatever is there to history and then write this */
                    C.update_topl(str);
                }
                else {
/* put anything already on top line into history */
                    C.remember_topl();
/* write to top line without remembering what we're writing */
                    C.show_topl(str);
                }
                ((cw).flags = C.int(C.int(((cw).flags & C.int((~C.WIN_NOSTOP))))));
/* NOSTOP is a one-shot operation */
                break;
            }
/* the characters before "St:" are unnecessary */
/* last char printed may be in middle of line */
/* null terminate */
/* STATUS_HILITES */
        case C.NHW_MAP:
            tty_curs(window, C.int(C.long(((cw).curx + C.long(1)))), C.int((cw).cury));
        C.term_start_attr(attr);
        while (Number(!!(C.deref(str, "const char") && Number(C.int((C.ttyDisplay).curx) < C.int((C.int((C.ttyDisplay).cols) - 1)))))) {
            C.putchar(C.deref(str, "const char"));
            C.nomux_putch(C.deref(str, "const char"));
            ((str = C.ptrAdd(str, 1, "char")), C.ptrAdd(str, -1, "char"));
            C.bump(C.fieldRef(C.ttyDisplay, "curx"), 1, true, "short");
        }
        ((cw).curx = C.long(0));
        C.bump(C.fieldRef(cw, "cury"), 1, true, "long");
        C.term_end_attr(attr);
        break;
        case C.NHW_BASE:
            tty_curs(window, C.int(C.long(((cw).curx + C.long(1)))), C.int((cw).cury));
        C.term_start_attr(attr);
        while (C.deref(str, "const char")) {
            if (Number(C.int((C.ttyDisplay).curx) >= C.int((C.int((C.ttyDisplay).cols) - 1)))) {
                ((cw).curx = C.long(0));
                C.bump(C.fieldRef(cw, "cury"), 1, true, "long");
                tty_curs(window, C.int(C.long(((cw).curx + C.long(1)))), C.int((cw).cury));
            }
            C.putchar(C.deref(str, "const char"));
            C.nomux_putch(C.deref(str, "const char"));
            ((str = C.ptrAdd(str, 1, "char")), C.ptrAdd(str, -1, "char"));
            C.bump(C.fieldRef(C.ttyDisplay, "curx"), 1, true, "short");
        }
        ((cw).curx = C.long(0));
        C.bump(C.fieldRef(cw, "cury"), 1, true, "long");
        C.term_end_attr(attr);
        break;
        case C.NHW_MENU:
            case C.NHW_TEXT:
                if (Number(!!(Number((cw).type == C.NHW_TEXT) && Number((C.long(((cw).cury + C.long((cw).offy)))) == C.long(C.int(((C.ttyDisplay).rows - 1))))))) {
/* not a menu, so save memory and output 1 page at a time */
                    ((cw).maxcol = C.long((C.ttyDisplay).cols));
/* force full-screen mode */
                    tty_display_nhwindow(window, C.TRUE);
                    for ((i = C.long(0)); Number(i < (cw).maxrow); ((i = C.long((i + 1n))), C.long((i - 1n)))) if (C.deref(C.ptrAdd((cw).data, i, "char *"), "char *")) {
                        C.free(C.castPointer(C.deref(C.ptrAdd((cw).data, i, "char *"), "char *"), "void *"));
                        C.store(C.ptrAdd((cw).data, i, "char *"), "char *", 0);
                    }
                    ((cw).maxrow = ((cw).cury = C.long(0)));
                }
/* always grows one at a time, but alloc 12 at a time */
        if (Number((cw).cury >= (cw).rows)) {
            let tmp;
            ((cw).rows = C.long(C.long(((cw).rows + C.long(12)))));
            (tmp = C.castPointer(C.alloc(C.uint(C.ulong((BigInt(C.sizeof("char *")) * C.ulong(C.uint((cw).rows)))))), "char **"));
            for ((i = C.long(0)); Number(i < (cw).maxrow); ((i = C.long((i + 1n))), C.long((i - 1n)))) C.store(C.ptrAdd(tmp, i, "char *"), "char *", C.deref(C.ptrAdd((cw).data, i, "char *"), "char *"));
            if ((cw).data) C.free(C.castPointer((cw).data, "void *"));
            ((cw).data = tmp);
            for ((i = (cw).maxrow); Number(i < (cw).rows); ((i = C.long((i + 1n))), C.long((i - 1n)))) C.store(C.ptrAdd((cw).data, i, "char *"), "char *", 0);
        }
        if (C.deref(C.ptrAdd((cw).data, (cw).cury, "char *"), "char *")) C.free(C.castPointer(C.deref(C.ptrAdd((cw).data, (cw).cury, "char *"), "char *"), "void *"));
        (n0 = C.long((C.long(C.strlen(str)) + 1n)));
        (ob = C.store(C.ptrAdd((cw).data, (cw).cury, "char *"), "char *", C.castPointer(C.alloc(C.uint((C.uint(n0) + C.uint(1)))), "char *")));
        C.store(((ob = C.ptrAdd(ob, 1, "char")), C.ptrAdd(ob, -1, "char")), "char", C.char((C.int((attr + 1)))));
/* avoid nuls, for convenience */
        C.strcpy(ob, str);
        if (Number(n0 > (cw).maxcol)) ((cw).maxcol = n0);
        if (Number(C.bump(C.fieldRef(cw, "cury"), 1, false, "long") > (cw).maxrow)) ((cw).maxrow = (cw).cury);
        if (Number(n0 > C.long(((C.gt).tc_gbl_data).tc_CO))) {
/* attempt to break the line */
            for ((i = C.long(C.int((((C.gt).tc_gbl_data).tc_CO - 1)))); Number(!!(Number(!!(i && Number(C.deref(C.ptrAdd(str, i, "const char"), "const char") != 32))) && Number(C.deref(C.ptrAdd(str, i, "const char"), "const char") != 10))); ) ((i = C.long((i - 1n))), C.long((i + 1n)));
            if (i) {
                C.store(C.ptrAdd(C.deref(C.ptrAdd((cw).data, C.long(((cw).cury - C.long(1))), "char *"), "char *"), (i = C.long((i + 1n))), "char"), "char", C.char(0));
                C.callLocal(tty_putstr, window, attr, C.ptrAdd(str, i, "const char"));
            }
        }
        break;
    }
    return;
}

export function tty_display_file(fname, complain) /* name of file to display */
/* whether to report problem if file can't be opened */
{
    fname = C.argument(fname, "const char *");
    complain = C.argument(complain, "boolean");
/* this implies that UNIX is defined */
/* FIXME:  this won't work if fname is inside a dlb container */
/* use external pager; this may give security problems */
/* [is this refresh actually necessary?] */
/* Now that child() does a setuid(getuid()) and a chdir(),
               we may not be able to open file fname anymore, so make
               it stdin. */
/* want to wait_synch() but stdin is gone */
/* DEF_PAGER */
{
        let f;
        const buf = C.localArray("char[256]", 0);
        let cr;
        tty_clear_nhwindow(C.WIN_MESSAGE);
        (f = C.fopen(fname, C.literal("r")));
        if (Number(!(f))) {
            if (complain) {
                C.home();
                tty_mark_synch();
                tty_raw_print(C.literal(""));
                C.perror(fname);
                tty_wait_synch();
/* "Hit <space> to continue: " */
                if ((C.u).ux) /* if hero is on map, refresh the screen */
                C.docrt();
                C.pline(C.literal("Cannot open \"%s\"."), fname, "p");
            }
        }
        else {
            let datawin = tty_create_nhwindow(C.NHW_TEXT);
            let empty = C.TRUE;
            if (Number(!!(complain && (C.tc_lcl_data).tc_CD))) {
/* attempt to scroll text below map window if there's room */
                ((C.deref(C.ptrAdd(C.wins, datawin, "struct WinDesc *"), "struct WinDesc *")).offy = C.short(C.int(((C.deref(C.ptrAdd(C.wins, C.WIN_STATUS, "struct WinDesc *"), "struct WinDesc *")).offy + ((((Number((C.iflags).wc2_statuslines <= 2))) ? 2 : 3))))));
                if (Number(C.int((C.int((C.deref(C.ptrAdd(C.wins, datawin, "struct WinDesc *"), "struct WinDesc *")).offy) + 12)) > C.int((C.ttyDisplay).rows))) ((C.deref(C.ptrAdd(C.wins, datawin, "struct WinDesc *"), "struct WinDesc *")).offy = C.short(0));
            }
            while (C.fgets(buf, C.BUFSZ, f)) {
                if (C.ptrCompare(((cr = C.strchr(buf, 10))), 0, "!=")) C.store(cr, "char", C.char(0));
                if (C.ptrCompare(C.strchr(buf, 9), 0, "!=")) C.tabexpand(buf);
                (empty = C.FALSE);
                C.callLocal(tty_putstr, datawin, 0, buf);
                if (C.int(((C.deref(C.ptrAdd(C.wins, datawin, "struct WinDesc *"), "struct WinDesc *")).flags & C.WIN_CANCELLED))) break;
            }
            if (Number(!(empty))) tty_display_nhwindow(datawin, C.FALSE);
            tty_destroy_nhwindow(datawin);
            C.fclose(f);
        }
    }
/* DEF_PAGER */
    return;
}

export function tty_start_menu(window, mbehavior) {
    window = C.argument(window, "winid");
    mbehavior = C.argument(mbehavior, "unsigned long");
    let cw = 0;
    if (Number(!!(Number(window == (C.int((-1)))) || C.ptrCompare(((cw = C.deref(C.ptrAdd(C.wins, window, "struct WinDesc *"), "struct WinDesc *"))), 0, "==")))) C.panic(C.winpanicstr, window, C.literal("tty_start_menu"), "ip");
/* PERMINV is ready to go already; not much to do here */
/* something went wrong, so add clean up code here */
    ((mbehavior));
    tty_clear_nhwindow(window);
    return;
}

/*ARGSUSED*/
/*
 * Add a menu item to the beginning of the menu list.  This list is reversed
 * later.
 */
export function tty_add_menu(window, glyphinfo, identifier, ch, gch, attr, clr, str, itemflags) /* window to use, must be of type NHW_MENU */
/* glyph info with glyph to
                                  * display with item */
/* what to return if selected */
/* selector letter (0 = pick our own) */
/* group accelerator (0 = no group) */
/* attribute for string (like tty_putstr()) */
/* color for string */
/* menu string */
/* itemflags such as MENU_ITEMFLAGS_SELECTED */
{
    window = C.argument(window, "winid");
    glyphinfo = C.argument(glyphinfo, "const glyph_info *");
    identifier = C.argument(identifier, "const anything *");
    ch = C.argument(ch, "char");
    gch = C.argument(gch, "char");
    attr = C.argument(attr, "int");
    clr = C.argument(clr, "int");
    str = C.argument(str, "const char *");
    itemflags = C.argument(itemflags, "unsigned int");
    let preselected = C.char((Number((C.uint((itemflags & C.MENU_ITEMFLAGS_SELECTED))) != C.uint(0))));
    let cw = 0;
    let item;
    let newstr;
    const buf = C.localArray("char[260]", 0);
    do {
        if ((C.program_state).done_hup) {
            (C.morc = C.char(27));
            return;
        }
    }
    while (0);
    if (C.ptrCompare(str, 0, "==")) return;
    if (Number(!!(Number(!!(Number(window == (C.int((-1)))) || C.ptrCompare(((cw = C.deref(C.ptrAdd(C.wins, window, "struct WinDesc *"), "struct WinDesc *"))), 0, "=="))) || Number((cw).type != C.NHW_MENU)))) C.panic(C.winpanicstr, window, C.literal("tty_add_menu"), "ip");
    C.bump(C.fieldRef(cw, "nitems"), 1, true, "long");
    if ((identifier).a_void) {
        let len = C.int(C.strlen(str));
        if (Number(len >= C.BUFSZ)) {
/* We *think* everything's coming in off at most BUFSZ bufs... */
            C.impossible(C.literal("Menu item too long (%d)."), len, "i");
            (len = C.int((C.BUFSZ - 1)));
        }
        C.sprintf(buf, C.literal("%c - "), ((ch) ? ch : 63), "i");
        C.strncpy(C.ptrAdd(buf, 4, "char"), str, C.ulong(len));
        C.store(C.ptrAdd(buf, C.int((4 + len)), "char"), "char", C.char(0));
        (newstr = buf);
    }
    else (newstr = str);
    (item = C.castPointer(C.alloc(C.uint(BigInt(C.sizeof("tty_menu_item")))), "tty_menu_item *"));
    ((item).identifier = C.deref(identifier, "const anything"));
    ((item).count = C.long((-1n)));
    ((item).selected = preselected);
    ((item).itemflags = itemflags);
    ((item).selector = ch);
    ((item).gselector = gch);
    ((item).attr = attr);
    ((item).color = clr);
    ((item).str = C.dupstr(newstr));
    ((item).glyphinfo = C.deref(glyphinfo, "const glyph_info"));
    ((item).next = (cw).mlist);
    ((cw).mlist = item);
}

/* Invert the given list, can handle NULL as an input. */
export function reverse(curr) {
    curr = C.argument(curr, "tty_menu_item *");
    let next;
    let head = 0;
    while (curr) {
        (next = (curr).next);
        ((curr).next = head);
        (head = curr);
        (curr = next);
    }
    return head;
}


export const tty_menu_promptstyle_initial = {
    "color": "NO_COLOR",
    "attr": "ATR_NONE"
};

/*
 * End a menu in this window, window must a type NHW_MENU.  This routine
 * processes the string list.  We calculate the # of pages, then assign
 * keyboard accelerators as needed.  Finally we decide on the width and
 * height of the window.
 */
export function tty_end_menu(window, prompt) /* menu to use */
/* prompt to for menu */
{
    window = C.argument(window, "winid");
    prompt = C.argument(prompt, "const char *");
    let cw = 0;
    let curr;
    let len;
    let lmax;
    let n;
    let menu_ch;
    let clr = C.NO_COLOR;
    if (Number(!!(Number(!!(Number(window == (C.int((-1)))) || C.ptrCompare(((cw = C.deref(C.ptrAdd(C.wins, window, "struct WinDesc *"), "struct WinDesc *"))), 0, "=="))) || Number((cw).type != C.NHW_MENU)))) {
/* this can happen if start_menu failed due to size requirements
           for the tty perm inventory window. It isn't a situation that
           requires a panic, just an early return. */
        if (Number(!!(Number(window == C.WIN_INVEN) && Number(!(cw))))) return;
        C.panic(C.winpanicstr, window, C.literal("tty_end_menu"), "ip");
    }
/* (probably don't need to check both of these conditions) */
/* Reverse the list so that items are in correct order. */
    ((cw).mlist = reverse((cw).mlist));
/* Put the prompt at the beginning of the menu. */
    if (prompt) {
        const any = C.recordLocal("anything", 0);
        C.store(any, "anything", (C.cg).zeroany);
/* not selectable */
        C.callLocal(tty_add_menu, window, C.nul_glyphinfo, any, C.char(0), C.char(0), C.ATR_NONE, clr, C.literal(""), C.MENU_ITEMFLAGS_NONE);
        C.callLocal(tty_add_menu, window, C.nul_glyphinfo, any, C.char(0), C.char(0), (C.tty_menu_promptstyle).attr, (C.tty_menu_promptstyle).color, prompt, C.MENU_ITEMFLAGS_NONE);
    }
/* 52: 'a'..'z' and 'A'..'Z'; avoids selector duplication within a page */
    (lmax = (((Number((52) < (C.int((C.int((C.ttyDisplay).rows) - 1))))) ? (52) : (C.int((C.int((C.ttyDisplay).rows) - 1))))));
/* # lines per page */
    ((cw).npages = C.long(((C.long(((cw).nitems + C.long((C.int((lmax - 1))))))) / C.long(lmax))));
/* # of pages */
/*
     * TODO?
     *  For really tall page, allow 53 if '$' or '#' is present and
     *  54 if both are.  [Only for single page menu, otherwise pages
     *  without those could try to use too many letters.]
     *  Probably not worth bothering with; anyone with a display big
     *  for this to matter will likely switch from tty to curses for
     *  multi-line message window and/or persistent inventory window.
     */
/* make sure page list is large enough */
    if (Number((cw).plist_size < C.long(((cw).npages + C.long(1))))) {
/* +1: need one slot beyond last */
        if ((cw).plist) C.free(C.castPointer((cw).plist, "void *"));
        ((cw).plist_size = C.long(((cw).npages + C.long(1))));
        ((cw).plist = C.castPointer(C.alloc(C.uint(C.ulong((C.ulong((cw).plist_size) * BigInt(C.sizeof("tty_menu_item *")))))), "tty_menu_item **"));
    }
    ((cw).cols = C.long(0));
/* cols is set when the win is initialized... (why?) */
    (menu_ch = C.char(63));
/* lint suppression */
    for (((n = 0), (curr = (cw).mlist)); curr; (((n = C.int((n + 1))), C.int((n - 1))), (curr = (curr).next))) {
/* set page boundaries and character accelerators */
        if (Number((C.int((n % lmax))) == 0)) {
            (menu_ch = C.char(97));
            C.store(C.ptrAdd((cw).plist, C.int(Math.trunc(n / lmax)), "tty_menu_item *"), "tty_menu_item *", curr);
        }
        if (Number(!!(((curr).identifier).a_void && Number(!((curr).selector))))) {
            C.store(C.ptrAdd((curr).str, 0, "char"), "char", ((curr).selector = menu_ch));
            if (Number(((menu_ch = C.char((menu_ch + 1))), C.char((menu_ch - 1))) == 122)) (menu_ch = C.char(65));
        }
/* cut off any lines that are too long */
        (len = C.short(C.ulong((C.strlen((curr).str) + C.ulong(2)))));
/* extra space at beg & end */
        if (Number(len > C.int((C.ttyDisplay).cols))) {
            C.store(C.ptrAdd((curr).str, C.int(((C.ttyDisplay).cols - 2)), "char"), "char", C.char(0));
            (len = (C.ttyDisplay).cols);
        }
        if (Number(C.long(len) > (cw).cols)) ((cw).cols = C.long(len));
    }
    C.store(C.ptrAdd((cw).plist, (cw).npages, "tty_menu_item *"), "tty_menu_item *", 0);
/* plist terminator */
/*
     * If greater than 1 page, morestr is "(x of y) " otherwise, "(end) "
     */
    if (Number((cw).npages > C.long(1))) {
        const buf = C.localArray("char[128]", 0);
/* produce the largest demo string */
        C.sprintf(buf, C.literal("(%ld of %ld) "), (cw).npages, (cw).npages, "ll");
        (len = C.short(C.strlen(buf)));
        ((cw).morestr = C.dupstr(C.literal("")));
    }
    else {
        ((cw).morestr = C.dupstr(C.literal("(end) ")));
        (len = C.short(C.strlen((cw).morestr)));
    }
    if (Number(len > C.int((C.ttyDisplay).cols))) {
/* truncate the prompt if it's too long for the screen */
        if (Number((cw).npages <= C.long(1))) /* only str in single page case */
        C.store(C.ptrAdd((cw).morestr, (C.ttyDisplay).cols, "char"), "char", C.char(0));
        (len = (C.ttyDisplay).cols);
    }
    if (Number(C.long(len) > (cw).cols)) ((cw).cols = C.long(len));
    ((cw).maxcol = (cw).cols);
/*
     * The number of lines in the first page plus the morestr will be the
     * maximum size of the window.
     */
    if (Number((cw).npages > C.long(1))) ((cw).maxrow = ((cw).rows = C.long(C.int((lmax + 1)))));
    else ((cw).maxrow = ((cw).rows = C.long(((cw).nitems + C.long(1)))));
}

export function tty_select_menu(window, how, menu_list) {
    window = C.argument(window, "winid");
    how = C.argument(how, "int");
    menu_list = C.argument(menu_list, "menu_item **");
    let cw = 0;
    let curr;
    let mi;
    let n;
    let cancelled;
    if (Number(!!(Number(!!(Number(window == (C.int((-1)))) || C.ptrCompare(((cw = C.deref(C.ptrAdd(C.wins, window, "struct WinDesc *"), "struct WinDesc *"))), 0, "=="))) || Number((cw).type != C.NHW_MENU)))) C.panic(C.winpanicstr, window, C.literal("tty_select_menu"), "ip");
    if (Number((cw).mbehavior == C.MENU_BEHAVE_PERMINV)) {
        return 0;
    }
    C.store(menu_list, "menu_item *", 0);
    ((cw).how = C.short(how));
    (C.morc = C.char(0));
    tty_display_nhwindow(window, C.TRUE);
    (cancelled = Number(!(Number(!((C.int(((cw).flags & C.WIN_CANCELLED))))))));
    tty_dismiss_nhwindow(window);
/* does not destroy window data */
    if (cancelled) {
        (n = C.int((-1)));
    }
    else {
        for (((n = 0), (curr = (cw).mlist)); curr; (curr = (curr).next)) if ((curr).selected) ((n = C.int((n + 1))), C.int((n - 1)));
    }
    if (Number(n > 0)) {
        C.store(menu_list, "menu_item *", C.castPointer(C.alloc(C.uint(C.ulong((C.ulong(n) * BigInt(C.sizeof("struct mi")))))), "menu_item *"));
        for (((mi = C.deref(menu_list, "menu_item *")), (curr = (cw).mlist)); curr; (curr = (curr).next)) if ((curr).selected) {
            ((mi).item = (curr).identifier);
            ((mi).count = (curr).count);
            ((mi = C.ptrAdd(mi, 1, "menu_item")), C.ptrAdd(mi, -1, "menu_item"));
        }
    }
    return n;
}

/* special hack for treating top line --More-- as a one item menu */
export function tty_message_menu(let_, how, mesg) {
    let_ = C.argument(let_, "char");
    how = C.argument(how, "int");
    mesg = C.argument(mesg, "const char *");
    do {
        if ((C.program_state).done_hup) return C.char((27));
    }
    while (0);
/* "menu" without selection; use ordinary pline, no more() */
    if (Number(how == C.PICK_NONE)) {
        C.pline(C.literal("%s"), mesg, "p");
        return C.char(0);
    }
    ((C.ttyDisplay).dismiss_more = let_);
    (C.morc = C.char(0));
/* barebones pline(); since we're only supposed to be called after
       response to a prompt, we'll assume that the display is up to date */
    C.callLocal(tty_putstr, C.WIN_MESSAGE, 0, mesg);
/* if `mesg' didn't wrap (triggering --More--), force --More-- now */
    if (Number((C.ttyDisplay).toplin == C.TOPLINE_NEED_MORE)) {
        C.more();
        ((C.ttyDisplay).toplin = C.TOPLINE_NEED_MORE);
/* more resets this */
        tty_clear_nhwindow(C.WIN_MESSAGE);
        (Number(!!((Number(!(Number(!((Number((C.ttyDisplay).toplin == 0))))))) || ((C.nhassert_failed(C.literal("ttyDisplay->toplin == TOPLINE_EMPTY"), C.literal("../win/tty/wintty.c"), 2895), 0)))));
    }
/* normally <ESC> means skip further messages, but in this case
       it means cancel the current prompt; any other messages should
       continue to be output normally */
    ((C.deref(C.ptrAdd(C.wins, C.WIN_MESSAGE, "struct WinDesc *"), "struct WinDesc *")).flags = C.int(C.int(((C.deref(C.ptrAdd(C.wins, C.WIN_MESSAGE, "struct WinDesc *"), "struct WinDesc *")).flags & C.int((~C.WIN_CANCELLED))))));
    ((C.ttyDisplay).dismiss_more = C.char(0));
    return C.char((((Number(!!((Number(!!(Number(how == C.PICK_ONE) && Number(C.morc == let_)))) || Number(C.morc == 27))))) ? C.morc : 0));
}

export function tty_ctrl_nhwindow(window, request, wri) {
    window = C.argument(window, "winid");
    request = C.argument(request, "int");
    wri = C.argument(wri, "win_request_info *");
/*, show_gold */
/* these types are set match the wintty.h field declarations */
/* long to match maxrow declaration in wintty.h */
    if (Number(!(wri))) return 0;
    switch (request) {
        case (C.set_mode):
            case (C.request_settings):
/* show_gold = (ttyinvmode & InvShowGold) != 0; */
/* something is terribly wrong, possibly too early in startup */
/* terminal isn't big enough right now but player might
                 * resize it and then use 'm O' to try to set 'perm_invent'
                 * again
                 */
/* TTY_PERM_INVENT */
                break;
        case (C.set_menu_promptstyle):
            C.store(C.tty_menu_promptstyle, "color_attr", ((wri).fromcore).menu_promptstyle);
        break;
        default:
            break;
    }
    return wri;
}

/* long to match maxrow declaration */
/* Is there enough real estate to do this beyond the status line?
     * Rows:
     * Top border line (1)
     * 26 inventory rows (26)
     * [should be 27 to have room for '$' and '#']
     * Bottom border line (1)
     * 1 + 26 + 1 = 28
     *
     * Cols:
     * Left border (1)
     * Left inventory items (38)
     * Middle separation (1)
     * Right inventory items (38)
     * Right border (1)
     * 1 + 38 + 1 + 38 + 1 = 79
     *
     * The topline + map rows + status lines require:
     * 1 + 21 + 2 (or 3) = 24 (or 25 depending on status line count).
     * So we can only present a full inventory on tty if there are
     * 28 + 24 (or 25) available (52 or 53 rows on the terminal).
     * Correspondingly ttyDisplay->rows has to be at least 52 (or 53).
     * [The top and bottom borderlines aren't necessary.  Suppressing
     * them would reduce the number of rows needed by 2.]
     *
     */
/* preliminary init in case tty_destroy_nhwindow() gets called */
/*
     * Terminal/window/screen is big enough.
     */
/*newwin->maxrow = minrow;*/
/* establish the borders */
/* for in-use mode, use full lines; it will switch to two panels if
       there are more items than the number of full lines */
/* discard perminvent window or erase it and set remembered data to spaces */
/* glyph is a flag indicating whether content union
                       contains a glyph_info structure or just a char */
/* sets glyph flag to 0 */
/* erasing */
/* full redraw wanted */
/*WIN_INVEN = WIN_ERR;*/
/* caller's responsibility */
/* reset: inuse_only isn't using any slots */
/* left & right sides full; no 3rd 'side' available */
/* if we need to expand inuse_only from one side to two, do so now;
           entries are shown in row 1 thru rows_per_side (with rows 0 and
           rows_per_side+1 containing boundary lines) but stored in
           slots 0 thru rows_per_side-1, so zero-based slot==rows_per_side
           is the entry that will be shown on first row of the second side
           (and one-base ttyinv_slots_used==rows_per_side means that on the
           previous inventory_update(), full lines filled all the rows;
           ttyinv_slots_used==0 means that we've just enabled perm_invent) */
/* 'text' will switch to invbuf[] below */
/* strip away "a"/"an"/"the" prefix to show a bit more of
            the interesting part of the object's description; this
            is inline version of pi_article_skip() from cursinvt.c;
            should move that to hacklib.c and use it here */
/*
         * TODO?
         *  Replace "c - " prefix with "c: " or just "c " to have a bit more
         *  room for 'text' (the item description).  If this prefix gets
         *  changed, the indentation for empty inventory in ttyinv_render()
         *  should be changed to match.
         */
/* 4 */
/* +1: top border */
/* side: left side panel or right side panel, not a window column */
/* convert a..zA..Z to 0..51 or for 'show_gold' $a..zA..Z# to 0..53 */
/*
         * Inuse_only uses slots 0 to N-1 instead of fixed positions.
         * Caller--or caller's caller's ... caller--only passes us
         * relevant items so no filtering is necessary here.
         * '!show_gold' gets ignored here since gold might be quivered
         * and become an in-use item.
         * Inuse_only items might include one (or more than one) with
         * invlet '#' but it isn't special for Inuse_only.
         * When nothing is in use, the core sends a menu header line to
         * to indicate such in order to avoid having an empty menu; we
         * ignore that and reconstruct one in ttyinv_render().
         */
/* normal perminv */
/* overflow item won't be gold but there is only room allocated
               for it when gold is also eligible to be shown (hero doesn't
               have to be carrying any, we just need the extra row it gets) */
/* fixed location, bottom of right-hand panel; if there is
                   more than 1 overflow item, we are only able to show 1 */
/* 0 for gold, 2 * 26 letters, then '#' */
/* normal vs inuse_only */
/* if (!incl_gold) impossible("ttyinv_render: slot %d?", slot); */
/* simplify 1..52 (0 and 53 won't get here) to 0..51 */
/* won't happen */
/* called if inuse_only contracts from two sides to one; there won't be
   full lines shown until the next inventory update because the data past
   the middle boundary was clipped rather than saved; caller or caller's
   caller or somewhere up the call chain will call update_inventory() to
   redraw it all and rectify that */
/* called when inuse_only expands from full lines (one side) to two sides */
/* draw the middle boundary */
/* split out of tty_end_menu(); persistent inventory is ready to display */
/* value before render */
/* if inuse_only was using two sides and has just shrunk to one,
               it will switch to full rows instead of side-by-side panels
               but current data only holds the left-hand panel's portion;
               rerun the whole thing to regenerate previously clipped data;
               fortunately this should be a fairly rare occurrence */
/* 'ttyinv_slots_used' was just updated by ttyinv_render()
                   to the number of entries currently shown */
/* will call back to core for data */
/* display persistent inventory from data collected by add_menu() */
/* assume one side */
/* second side is populated */
/* there are two extra slots for gold and overflow;
                          * blanking them for !show_gold would wrap back to
                          * rows 1 and 2 and need non-existent third side */
/* clear unused slots */
/* "" => fill slot with spaces */
/* +1: top border */
/* side: left side panel or right side panel, not a window column */
/* inuse_only might switch from one panel to two or vice versa */
/* need second side; set up the middle border */
/* done earlier, in add_menu():
            ttyinv_inuse_twosides(cw, rows_per_side);
            */
/* have second side but don't need/want it anymore */
/* has there been a glyph reset since we last got here? */
/* // tty_invent_box_glyph_init(wins[WIN_INVEN]); */
/* render to the display */
/* put the formatted object description for one item into a particular row
   and left/right panel, truncating if long or padding with spaces if short */
/* 'row' within the window, not within screen */
/* 'side'==0 is left panel or ==1 is right panel */
/* there might be more in-use than fits; ignore excess */
/* [don't expect this to happen] if there was a glyph here, release
           memory allocated for it; gi pointer and ttychar character overlay
           each other in a union, so clear gi before assigning ttychar */
/* clears cell->glyph and cell->content */
/* offset color by 1 so 0 is not valid */
/* cell->content.ttychar is current */
/* we've been asked to redisplay a portion of the screen, one row */
/* placeholder */
/* note: for top and bottom, check [border_right] before
               [border_middle] because they could be the same column (for
               InvInUse) and if so we want corner rather than tee there */
/* else sym keeps placeholder value */
/* not a boundary (but might have been) */
/* presumably is no longer wanted middle vertical line */
/* clears cell->glyph */
/* a boundary; if it doesn't hold a glyph yet, allocate one */
/* to get here, cell->glyph is 1 and cell->content union has gi */
/* (redundant) */
/* originally this conditionally set refresh depending upon
               whether the glyph was already shown, but that optimization
               is for something that rarely happens (boundary lines aren't
               redrawn very often, and most of the time when they are it's
               because they were erased or overwritten by something so
               won't match the prior value anymore) so skip it */
/*
 * returns TRUE if things are ok
 */
/* too early */
/* topline + map rows + status lines */
/* 1 + 21 + (2 or 3) */
/* simplify testing by not requiring a small font to have enough room */
/* "normal" max for items in use would be 3 weapon + 7 armor + 4
       accessories == 14, but lit lamps/candles and attached leashes are
       also included; if hero ends up with more than 15 in-use items,
       some will be left out */
/* top border + 15 lines + bottom border */
/* TTY_PERM_INVENT */
/* update persistent inventory window */
export function tty_update_inventory(arg) {
    arg = C.argument(arg, "int");
/* call back to core */
/* do nothing */
    return;
}

export function tty_mark_synch() {
    do {
        if ((C.program_state).done_hup) {
            (C.morc = C.char(27));
            return;
        }
    }
    while (0);
    C.fflush((C.stdout));
}

export function tty_wait_synch() {
    do {
        if ((C.program_state).done_hup) {
            (C.morc = C.char(27));
            return;
        }
    }
    while (0);
/* we just need to make sure all windows are synch'd */
    if (Number(!!(Number(!!(Number(C.WIN_MAP == (C.int((-1)))) || Number(!(C.ttyDisplay)))) || (C.ttyDisplay).rawprint))) {
        getret();
        if (C.ttyDisplay) ((C.ttyDisplay).rawprint = 0);
    }
    else {
        tty_display_nhwindow(C.WIN_MAP, C.FALSE);
        if ((C.ttyDisplay).inmore) {
            C.addtopl(C.literal("--More--"));
            C.fflush((C.stdout));
        }
        else if (Number((C.ttyDisplay).inread > (C.program_state).gameover)) {
/* this can only happen if we were reading and got interrupted */
            ((C.ttyDisplay).toplin = C.TOPLINE_SPECIAL_PROMPT);
/* do this twice; 1st time gets the Quit? message again */
            C.tty_doprev_message();
            C.tty_doprev_message();
            C.bump(C.fieldRef(C.ttyDisplay, "intr"), 1, true, "int");
            C.fflush((C.stdout));
        }
    }
}

export function docorner(xmin, ymax, ystart_between_menu_pages) {
    xmin = C.argument(xmin, "int");
    ymax = C.argument(ymax, "int");
    ystart_between_menu_pages = C.argument(ystart_between_menu_pages, "int");
    let y;
    let cw = C.deref(C.ptrAdd(C.wins, C.WIN_MAP, "struct WinDesc *"), "struct WinDesc *");
    let ystart = 0;
    do {
        if ((C.program_state).done_hup) {
            (C.morc = C.char(27));
            return;
        }
    }
    while (0);
/* this optimization is not valuable enough to justify
         * abusing core internals... */
/* Can be done more efficiently */
/* without this flush, if we happen to follow --More-- displayed in
           leftmost column, the cursor gets left in the wrong place after
           <docorner<more<update_topl<tty_putstr calls unwind back to core */
/*0*/
    if (Number(ymax > ((C.gt).tc_gbl_data).tc_LI)) (ymax = ((C.gt).tc_gbl_data).tc_LI);
/* can happen if window gets smaller */
    if (ystart_between_menu_pages) (ystart = ystart_between_menu_pages);
    for ((y = ystart); Number(y < ymax); ((y = C.int((y + 1))), C.int((y - 1)))) {
        tty_curs(C.BASE_WINDOW, xmin, y);
/* move cursor */
        if (Number(!(ystart_between_menu_pages))) C.cl_end();
/* clear to end of line */
/* the whole thing is beyond the board but not necessarily all the
           way to the bottom of the screen */
        if (Number(!!(Number(y < C.int((cw).offy)) || Number(C.int((y + C.clipy)) > C.ROWNO)))) continue;
/* only refresh board */
        C.row_refresh(C.short(C.int((C.int((xmin + C.clipx)) - C.int((cw).offx)))), C.short(C.int((C.COLNO - 1))), C.short(C.int((C.int((y + C.clipy)) - C.int((cw).offy)))));
/* only refresh board  */
    }
    end_glyphout();
    if (Number(!!(Number(ymax >= C.int((C.deref(C.ptrAdd(C.wins, C.WIN_STATUS, "struct WinDesc *"), "struct WinDesc *")).offy)) && Number(!(ystart_between_menu_pages))))) {
/* we have wrecked the bottom line */
        ((C.disp).botlx = C.TRUE);
        C.bot();
    }
}

export function end_glyphout() {
    do {
        if ((C.program_state).done_hup) {
            (C.morc = C.char(27));
            return;
        }
    }
    while (0);
    if (C.GFlag) {
        (C.GFlag = C.FALSE);
        C.graph_off();
    }
    if (Number((C.ttyDisplay).color != C.NO_COLOR)) {
        C.term_end_color();
        ((C.ttyDisplay).color = C.NO_COLOR);
    }
}

export function g_putch(in_ch) {
    in_ch = C.argument(in_ch, "int");
    let ch = C.char(in_ch);
    do {
        if ((C.program_state).done_hup) {
            (C.morc = C.char(27));
            return;
        }
    }
    while (0);
    if ((Number(C.uint((C.deref(C.ptrAdd((C.gs).symset, (C.gc).currentgraphics, "struct symsetentry"), "struct symsetentry")).handling) == C.uint((C.H_UTF8))))) {
        C.putchar(ch);
    }
    else if (Number(!!((Number(C.uint((C.deref(C.ptrAdd((C.gs).symset, (C.gc).currentgraphics, "struct symsetentry"), "struct symsetentry")).handling) == C.uint((C.H_IBM)))) || (Number(!!((C.iflags).eight_bit_tty && (Number(!!(Number(!((Number(C.uint((C.deref(C.ptrAdd((C.gs).symset, (C.gc).currentgraphics, "struct symsetentry"), "struct symsetentry")).handling) == C.uint((C.H_DEC)))))) || Number((C.int((in_ch & 127))) < 96)))))))))) /* for DECgraphics, lower-case letters with high bit set mean
           switch character set and render with high bit clear;
           user might want 8-bits for other characters */
{
/* IBM-compatible displays don't need other stuff */
        C.putchar(ch);
    }
    else if (C.int((ch & 128))) {
        if (Number(!!(Number(!(C.GFlag)) || C.HE_resets_AS))) {
            C.graph_on();
            (C.GFlag = C.TRUE);
        }
        C.putchar((C.int((ch ^ 128))));
/* Strip 8th bit */
    }
    else {
        if (C.GFlag) /* for DECgraphics, we only need to switch back from the line
           drawing character set to the normal one if 'ch' is a lowercase
           letter or one of a handful of punctuation characters (the
           range is contiguous but somewhat odd); deferring graph_off()
           now might allow skipping both it and next potential graph_on() */
{
            C.graph_off();
            (C.GFlag = C.FALSE);
        }
        C.putchar(ch);
    }
/* ?ASCIIGRAPH */
/* ASCIIGRAPH */
/* WIN32CON */
/* WIN32CON */
/* Strip high bit for DEC graphics, matching putchar(ch ^ 0x80) */
    C.nomux_putch(C.int(C.uchar(((((C.int((ch & 128)))) ? (C.int((ch ^ 128))) : ch)))));
    return;
}

export function g_pututf8(utf8str) {
    utf8str = C.argument(utf8str, "uint8 *");
    do {
        if ((C.program_state).done_hup) {
            (C.morc = C.char(27));
            return;
        }
    }
    while (0);
    while (C.deref(utf8str, "uint8")) {
        C.putchar(C.deref(utf8str, "uint8"));
        ((utf8str = C.ptrAdd(utf8str, 1, "uint8")), C.ptrAdd(utf8str, -1, "uint8"));
    }
    return;
}

/* ENHANCED_SYMBOLS */
/* UNIX || VMS */
export function setclipped() {
    (C.clipping = C.TRUE);
    (C.clipx = (C.clipy = 0));
    (C.clipxmax = ((C.gt).tc_gbl_data).tc_CO);
    (C.clipymax = C.int((C.int((((C.gt).tc_gbl_data).tc_LI - 1)) - (C.iflags).wc2_statuslines)));
}

export function tty_cliparound(x, y) {
    x = C.argument(x, "int");
    y = C.argument(y, "int");
    let oldx = C.clipx;
    let oldy = C.clipy;
    do {
        if ((C.program_state).done_hup) {
            (C.morc = C.char(27));
            return;
        }
    }
    while (0);
    if (Number(!(C.clipping))) return;
    if (Number(x < C.int((C.clipx + 5)))) {
        (C.clipx = (((Number((0) > (C.int((x - 20))))) ? (0) : (C.int((x - 20))))));
        (C.clipxmax = C.int((C.clipx + ((C.gt).tc_gbl_data).tc_CO)));
    }
    else if (Number(x > C.int((C.clipxmax - 5)))) {
        (C.clipxmax = (((Number((80) < (C.int((C.clipxmax + 20))))) ? (80) : (C.int((C.clipxmax + 20))))));
        (C.clipx = C.int((C.clipxmax - ((C.gt).tc_gbl_data).tc_CO)));
    }
    if (Number(y < C.int((C.clipy + 2)))) {
        (C.clipy = (((Number((0) > (C.int((y - C.int(Math.trunc((C.int((C.clipymax - C.clipy))) / 2))))))) ? (0) : (C.int((y - C.int(Math.trunc((C.int((C.clipymax - C.clipy))) / 2))))))));
        (C.clipymax = C.int((C.clipy + (C.int((C.int((((C.gt).tc_gbl_data).tc_LI - 1)) - (C.iflags).wc2_statuslines))))));
    }
    else if (Number(y > C.int((C.clipymax - 2)))) {
        (C.clipymax = (((Number((21) < (C.int((C.clipymax + C.int(Math.trunc((C.int((C.clipymax - C.clipy))) / 2))))))) ? (21) : (C.int((C.clipymax + C.int(Math.trunc((C.int((C.clipymax - C.clipy))) / 2))))))));
        (C.clipy = C.int((C.clipymax - (C.int((C.int((((C.gt).tc_gbl_data).tc_LI - 1)) - (C.iflags).wc2_statuslines))))));
    }
    if (Number(!!(Number(C.clipx != oldx) || Number(C.clipy != oldy)))) {
        C.redraw_map(C.TRUE);
/* ask the core to resend the map window's data */
    }
}

/* CLIPPING */
/*
 *  tty_print_glyph
 *
 *  Print the glyph to the output device.  Don't flush the output device.
 *
 *  Since this is only called from show_glyph(), it is assumed that the
 *  position and glyph are always correct (checked there)!
 */
export function tty_print_glyph(window, x, y, glyphinfo, bkglyphinfo) {
    window = C.argument(window, "winid");
    x = C.argument(x, "coordxy");
    y = C.argument(y, "coordxy");
    glyphinfo = C.argument(glyphinfo, "const glyph_info *");
    bkglyphinfo = C.argument(bkglyphinfo, "const glyph_info *");
    let inverse_on = C.FALSE;
    let colordone = C.FALSE;
    let glyphdone = C.FALSE;
    let petattr = C.FALSE;
    let ch;
    let color;
    let special;
    do {
        if ((C.program_state).done_hup) {
            (C.morc = C.char(27));
            return;
        }
    }
    while (0);
    if (C.clipping) {
        if (Number(!!(Number(!!(Number(!!(Number(x <= C.clipx) || Number(y < C.clipy))) || Number(x >= C.clipxmax))) || Number(y >= C.clipymax)))) return;
    }
/* get glyph ttychar, color, and special flags */
    (ch = (glyphinfo).ttychar);
    (color = C.uint((((glyphinfo).gm).sym).color));
    (special = ((glyphinfo).gm).glyphflags);
    ;
/* Move the cursor. */
    tty_curs(window, x, y);
    ;
    if (Number(!!((C.tc_lcl_data).tc_ul_hack && Number(ch == 95)))) {
/* non-destructive underscore */
        C.putchar(C.char(32));
        C.backsp();
    }
    if ((C.iflags).use_color) {
        ((C.ttyDisplay).colorflags = C.NH_BASIC_COLOR);
        if (Number(color != (C.ttyDisplay).color)) {
            if (Number((C.ttyDisplay).color != C.NO_COLOR)) C.term_end_color();
        }
/* we don't link with termcap.o if NO_TERMS is defined */
        if (Number(!!(Number(!!(Number(!!((C.ulong(((C.tty_procs).wincap2 & C.WC2_EXTRACOLORS))) && Number(((glyphinfo).gm).customcolor != C.uint(0)))) && Number((C.iflags).colorcount >= C.uint(256)))) && Number(!(C.calling_from_update_inventory))))) {
            if (Number((C.uint((((glyphinfo).gm).customcolor & C.NH_BASIC_COLOR))) == C.uint(0))) {
                C.term_start_extracolor(((glyphinfo).gm).customcolor, ((glyphinfo).gm).color256idx);
                ((C.ttyDisplay).colorflags = C.uint(0));
                (colordone = C.TRUE);
            }
            else {
                (color = (C.uint(((((glyphinfo).gm).customcolor) & C.uint(16777215)))));
            }
        }
        if (Number(!(colordone))) {
            ((C.ttyDisplay).color = color);
            if (Number(color != C.NO_COLOR)) C.term_start_color(C.int(color));
        }
    }
/* iflags.use_color aka iflags.wc_color */
/* must be after color check; term_end_color may turn off inverse too;
       BW_LAVA, BW_ICE, BW_SINK, BW_ENGR won't ever be set when color is on;
       (tried bold for ice but it didn't look very good; inverse is easier
       to see although the Valkyrie quest ends up being hard on the eyes) */
    if (Number(!!(Number(!!((C.iflags).use_color && bkglyphinfo)) && Number((bkglyphinfo).framecolor != C.NO_COLOR)))) {
        ((C.ttyDisplay).framecolor = (bkglyphinfo).framecolor);
        C.term_start_bgcolor(C.int((bkglyphinfo).framecolor));
    }
    else if (Number(!!(Number((C.uint((special & C.MG_PET))) != C.uint(0)) && (C.iflags).hilite_pet))) {
        C.term_start_attr((C.iflags).wc2_petattr);
        (petattr = C.TRUE);
    }
    else if (Number(!!((Number(!!(Number(!!((Number(!!(Number((C.uint((special & C.MG_OBJPILE))) != C.uint(0)) && (C.iflags).hilite_pile))) || (Number(!!(Number(!!(Number((C.uint((special & C.MG_FEMALE))) != C.uint(0)) && (C.flags).debug)) && (C.iflags).wizmgender))))) || (Number((C.uint((special & C.uint((C.int((C.int((C.int((C.int((C.MG_DETECT | C.MG_BW_LAVA)) | C.MG_BW_ICE)) | C.MG_BW_SINK)) | C.MG_BW_ENGR))))))) != C.uint(0)))))) && (C.iflags).use_inverse))) {
        C.term_start_attr(C.ATR_INVERSE);
        (inverse_on = C.TRUE);
    }
    if (Number(!!(Number(!!(Number(!!(Number(!!(Number(!(glyphdone)) && (C.ulong(((C.tty_procs).wincap2 & C.WC2_U_UTF8STR))))) && (Number(C.uint((C.deref(C.ptrAdd((C.gs).symset, (C.gc).currentgraphics, "struct symsetentry"), "struct symsetentry")).handling) == C.uint((C.H_UTF8)))))) && ((glyphinfo).gm).u)) && (((glyphinfo).gm).u).utf8str))) {
/* we have a sequence to do */
        g_pututf8((((glyphinfo).gm).u).utf8str);
        (glyphdone = C.TRUE);
    }
    if (Number(!(glyphdone))) g_putch(ch);
/* print the character */
    if (inverse_on) C.term_end_attr(C.ATR_INVERSE);
    else if (petattr) C.term_end_attr((C.iflags).wc2_petattr);
    if ((C.iflags).use_color) {
/* turn off color as well, turning off ATR_INVERSE may have done
          this already and if so, we won't know the current state unless
          we do it explicitly */
        if (Number(!!(Number((C.ttyDisplay).color != C.NO_COLOR) || Number((C.ttyDisplay).framecolor != C.NO_COLOR)))) {
            C.term_end_color();
            ((C.ttyDisplay).color = ((C.ttyDisplay).framecolor = C.NO_COLOR));
        }
        if (Number((C.ttyDisplay).colorflags != C.NH_BASIC_COLOR)) C.term_end_extracolor();
    }
    ;
    C.bump(C.fieldRef(C.deref(C.ptrAdd(C.wins, window, "struct WinDesc *"), "struct WinDesc *"), "curx"), 1, true, "long");
/* one character over */
    C.bump(C.fieldRef(C.ttyDisplay, "curx"), 1, true, "short");
/* the real cursor moved too */
}

/* termcap.o isn't linked in */
/* placeholder for now */
/* nothing */
/* nothing */
/* CHANGE_COLOR */
/* NO_TERMS */
export function tty_raw_print(str) {
    str = C.argument(str, "const char *");
    do {
        if ((C.program_state).done_hup) {
            (C.morc = C.char(27));
            return;
        }
    }
    while (0);
    if (C.ttyDisplay) C.bump(C.fieldRef(C.ttyDisplay, "rawprint"), 1, true, "int");
    else if (C.deref(str, "const char")) C.bump(C.fieldRef(C.iflags, "raw_printed"), 1, true, "int");
    ;
    C.puts(str);
    C.fflush((C.stdout));
    C.nomux_raw_emit(str, 0);
}

export function tty_raw_print_bold(str) {
    str = C.argument(str, "const char *");
    do {
        if ((C.program_state).done_hup) {
            (C.morc = C.char(27));
            return;
        }
    }
    while (0);
    if (C.ttyDisplay) C.bump(C.fieldRef(C.ttyDisplay, "rawprint"), 1, true, "int");
    else if (C.deref(str, "const char")) C.bump(C.fieldRef(C.iflags, "raw_printed"), 1, true, "int");
    ;
    C.term_start_raw_bold();
    C.fputs(str, (C.stdout));
    C.term_end_raw_bold();
    C.puts(C.literal(""));
    C.fflush((C.stdout));
    C.nomux_raw_emit(str, 1);
}

export function tty_nhgetch() {
    let i;
/* kludge alert: Some Unix variants return funny values if getc() is
     * called, interrupted, and then called again.  There is non-reentrant
     * code in the internal _filbuf() routine, called by getc().
     */
    const nestbuf = C.scalarLocal("char");
    do {
        if ((C.program_state).done_hup) return (27);
    }
    while (0);
    ;
    C.term_curs_set(1);
    C.fflush((C.stdout));
    C.nomux_capture_write_input_boundary();
/* Note: if raw_print() and wait_synch() get called to report terminal
     * initialization problems, then wins[] and ttyDisplay might not be
     * available yet.  Such problems will probably be fatal before we get
     * here, but validate those pointers just in case...
     */
    if (Number(!!(Number(C.WIN_MESSAGE != (C.int((-1)))) && C.deref(C.ptrAdd(C.wins, C.WIN_MESSAGE, "struct WinDesc *"), "struct WinDesc *")))) ((C.deref(C.ptrAdd(C.wins, C.WIN_MESSAGE, "struct WinDesc *"), "struct WinDesc *")).flags = C.int(C.int(((C.deref(C.ptrAdd(C.wins, C.WIN_MESSAGE, "struct WinDesc *"), "struct WinDesc *")).flags & C.int((~C.WIN_STOP))))));
    if ((C.iflags).debug_fuzzer) {
        (i = C.randomkey());
    }
    else {
        if ((C.program_state).resize_pending) resize_tty();
        C.bump(C.fieldRef(C.program_state, "getting_char"), 1, true, "int");
        (i = (((Number((C.program_state).getting_char == 1))) ? C.teleport_getch() : ((((Number(C.read(C.fileno((C.stdin)), C.castPointer(nestbuf, "void *"), C.ulong(1)) == C.long(1)))) ? C.int(nestbuf.value) : C.EOF))));
        C.bump(C.fieldRef(C.program_state, "getting_char"), -1, true, "int");
        if (C.resize_mesg) {
            (C.resize_mesg = 0);
            tty_clear_nhwindow(C.WIN_MESSAGE);
            (i = 27);
        }
    }
    C.term_curs_set(0);
    if (Number(!(i))) (i = 27);
    else /* map NUL to ESC since nethack doesn't expect NUL */
    if (Number(i == C.EOF)) {
        ((C.iflags).term_gone = C.char(1));
        (i = 27);
/* same for EOF */
    }
/* topline has been seen - we can clear the need for --More-- */
    if (Number(!!(C.ttyDisplay && Number((C.ttyDisplay).toplin == C.TOPLINE_NEED_MORE)))) ((C.ttyDisplay).toplin = C.TOPLINE_NON_EMPTY);
/* hack to force output of the window select code */
/* TTY_TILES_ESCCODES */
    return i;
}

/*
 * return a key, or 0, in which case a mouse button was pressed
 * mouse events should be returned as character postitions in the map window.
 * Since normal tty's don't have mice, just return a key.
 */
/*ARGSUSED*/
export function tty_nh_poskey(x, y, mod) {
    x = C.argument(x, "coordxy *");
    y = C.argument(y, "coordxy *");
    mod = C.argument(mod, "int *");
    let i;
    do {
        if ((C.program_state).done_hup) return (27);
    }
    while (0);
/* Note: if raw_print() and wait_synch() get called to report terminal
     * initialization problems, then wins[] and ttyDisplay might not be
     * available yet.  Such problems will probably be fatal before we get
     * here, but validate those pointers just in case...
     */
/* map NUL or EOF to ESC, nethack doesn't expect either */
/* topline has been seen - we can clear the need for --More-- */
/* !WIN32CON */
    (i = C.callLocal(tty_nhgetch));
/* ?WIN32CON */
    return i;
}

export function win_tty_init(dir) {
    dir = C.argument(dir, "int");
    if (Number(dir != 0)) return;
    return;
}

/* POSITIONBAR */
export function tty_putmixed(window, attr, str) {
    window = C.argument(window, "winid");
    attr = C.argument(attr, "int");
    str = C.argument(str, "const char *");
    let cw;
    const buf = C.localArray("char[256]", 0);
    const utf8flag = C.scalarLocal("int", 0);
    if (Number(!!(Number(window == (C.int((-1)))) || C.ptrCompare(((cw = C.deref(C.ptrAdd(C.wins, window, "struct WinDesc *"), "struct WinDesc *"))), 0, "==")))) {
        tty_raw_print(str);
        return;
    }
    ((C.ttyDisplay).mixed = 1);
    if (Number(!!((C.ulong(((C.windowprocs).wincap2 & C.WC2_U_UTF8STR))) && (Number(C.uint((C.deref(C.ptrAdd((C.gs).symset, (C.gc).currentgraphics, "struct symsetentry"), "struct symsetentry")).handling) == C.uint((C.H_UTF8))))))) {
        C.mixed_to_utf8(buf, BigInt(C.sizeof("char[256]")), str, utf8flag);
        if (Number((cw).type == C.NHW_MESSAGE)) ((C.ttyDisplay).topl_utf8 = utf8flag.value);
    }
    else C.decode_mixed(buf, str);
/* now send it to the normal tty_putstr */
    C.callLocal(tty_putstr, window, attr, buf);
    ((C.ttyDisplay).topl_utf8 = 0);
    ((C.ttyDisplay).mixed = 0);
}

/*
 * +------------------+
 * |  STATUS CODE     |
 * +------------------+
 */
/*
 * ----------------------------------------------------------------
 * tty_status_update
 *
 *      Called from the NetHack core and receives info hand-offs
 *      from the core, processes them, storing some information
 *      for rendering to the tty.
 *          -> make_things_fit()
 *          -> render_status()
 *
 * make_things_fit
 *
 *      Called from tty_status_update(). It calls check_fields()
 *      (described next) to get the required number of columns
 *      and tries a few different ways to squish a representation
 *      of the status window values onto the 80 column tty display.
 *          ->check_fields()
 *          ->set_condition_length()  - update the width of conditions
 *          ->shrink_enc()      - shrink encumbrance message word
 *          ->shrink_dlvl()     - reduce the width of Dlvl:42
 *
 *  check_fields
 *
 *      Verifies that all the fields are ready for display, and
 *      returns FALSE if called too early in the startup
 *      processing sequence. It also figures out where everything
 *      needs to go, taking the current shrinking attempts into
 *      account. It returns number of columns needed back to
 *      make_things_fit(), so make_things_fit() can make attempt
 *      to make adjustments.
 *
 *  render_status
 *
 *      Goes through each of the status row's fields and
 *      calls tty_putstatusfield() to place them on the display.
 *          ->tty_putstatusfield()
 *      At the end of the for-loop, the NOW values get copied
 *      to BEFORE values.
 *
 *  tty_putstatusfield()
 *
 *      Move the cursor to the target spot, and output the field
 *      asked for by render_status().
 *
 * ----------------------------------------------------------------
 */
/*
 * The following data structures come from the genl_ routines in
 * src/windows.c and as such are considered to be on the window-port
 * "side" of things, rather than the NetHack-core "side" of things.
 */
/* 2: NOW,BEFORE */

export const encvals_initial = [
    [
        "",
        "Burdened",
        "Stressed",
        "Strained",
        "Overtaxed",
        "Overloaded"
    ],
    [
        "",
        "Burden",
        "Stress",
        "Strain",
        "Overtax",
        "Overload"
    ],
    [
        "",
        "Brd",
        "Strs",
        "Strn",
        "Ovtx",
        "Ovld"
    ]
];

/* 2 or 3 status lines */
/* third row of array isn't used for twolineorder */
export const twolineorder_initial = [
    [
        "BL_TITLE",
        "BL_STR",
        "BL_DX",
        "BL_CO",
        "BL_IN",
        "BL_WI",
        "BL_CH",
        "BL_ALIGN",
        "BL_SCORE",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH"
    ],
    [
        "BL_LEVELDESC",
        "BL_GOLD",
        "BL_HP",
        "BL_HPMAX",
        "BL_ENE",
        "BL_ENEMAX",
        "BL_AC",
        "BL_XP",
        "BL_EXP",
        "BL_HD",
        "BL_TIME",
        "BL_HUNGER",
        "BL_CAP",
        "BL_CONDITION",
        "BL_WEAPON",
        "BL_ARMOR",
        "BL_TERRAIN",
        "BL_VERS",
        "BL_FLUSH"
    ],
    [
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        0,
        0,
        0
    ]
];

/* Align moved from 1 to 2, Leveldesc+Time+Cond+Vers moved from 2 to 3 */

export const threelineorder_initial = [
    [
        "BL_TITLE",
        "BL_STR",
        "BL_DX",
        "BL_CO",
        "BL_IN",
        "BL_WI",
        "BL_CH",
        "BL_SCORE",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH"
    ],
    [
        "BL_ALIGN",
        "BL_GOLD",
        "BL_HP",
        "BL_HPMAX",
        "BL_ENE",
        "BL_ENEMAX",
        "BL_AC",
        "BL_XP",
        "BL_EXP",
        "BL_HD",
        "BL_HUNGER",
        "BL_CAP",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH"
    ],
    [
        "BL_LEVELDESC",
        "BL_TIME",
        "BL_CONDITION",
        "BL_WEAPON",
        "BL_ARMOR",
        "BL_TERRAIN",
        "BL_VERS",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH",
        "BL_FLUSH"
    ]
];

/* [rows][NOW or BEFORE] */

export const windowdata_init_initial = "FALSE";


export const cond_shrinklvl_initial = 0;


export const enclev_initial = 0;


export const enc_shrinklvl_initial = 0;


export const dlvl_shrinklvl_initial = 0;


export const truncation_expected_initial = "FALSE";

/* This controls whether to skip fields that aren't
 * flagged as requiring updating during the current
 * render_status().
 *
 * Hopefully that can be confirmed as working correctly
 * for all platforms eventually and the conditional
 * setting below can be removed.
 */

export const do_field_opt_initial = 1;

/* STATUS_HILITES */
/*
 *  tty_status_init()
 *      -- initialize the tty-specific data structures.
 *      -- call genl_status_init() to initialize the general data.
 */
export function tty_status_init() {
    let i;
    let num_rows;
    (num_rows = ((((Number((C.iflags).wc2_statuslines <= 2))) ? 2 : 3)));
/* 2 or 3 */
    (C.fieldorder = (((Number(num_rows != 3))) ? C.twolineorder : C.threelineorder));
    for ((i = 0); Number(i < C.MAXBLSTATS); (i = C.int((i + 1)))) {
        ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), i, "struct tty_status_fields"), "struct tty_status_fields")).idx = C.BL_FLUSH);
        ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), i, "struct tty_status_fields"), "struct tty_status_fields")).color = C.NO_COLOR);
/* no color */
        ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), i, "struct tty_status_fields"), "struct tty_status_fields")).attr = C.ATR_NONE);
        ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), i, "struct tty_status_fields"), "struct tty_status_fields")).x = ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), i, "struct tty_status_fields"), "struct tty_status_fields")).y = 0));
        ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), i, "struct tty_status_fields"), "struct tty_status_fields")).valid = C.FALSE);
        ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), i, "struct tty_status_fields"), "struct tty_status_fields")).dirty = C.FALSE);
        ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), i, "struct tty_status_fields"), "struct tty_status_fields")).redraw = C.FALSE);
        ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), i, "struct tty_status_fields"), "struct tty_status_fields")).sanitycheck = C.FALSE);
        C.store(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.BEFORE, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), i, "struct tty_status_fields"), "struct tty_status_fields", C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), i, "struct tty_status_fields"), "struct tty_status_fields"));
    }
    (C.tty_condition_bits = 0n);
    (C.hpbar_percent = (C.hpbar_crit_hp = 0));
/* STATUS_HILITES */
/* let genl_status_init do most of the initialization */
    C.genl_status_init();
}

export function tty_status_enablefield(fieldidx, nm, fmt, enable) {
    fieldidx = C.argument(fieldidx, "int");
    nm = C.argument(nm, "const char *");
    fmt = C.argument(fmt, "const char *");
    enable = C.argument(enable, "boolean");
    C.genl_status_enablefield(fieldidx, nm, fmt, enable);
}

/*
 *  *_status_update()
 *      -- update the value of a status field.
 *      -- the fldindex identifies which field is changing and
 *         is an integer index value from botl.h
 *      -- fldindex could be any one of the following from botl.h:
 *         BL_TITLE, BL_STR, BL_DX, BL_CO, BL_IN, BL_WI, BL_CH,
 *         BL_ALIGN, BL_SCORE, BL_CAP, BL_GOLD, BL_ENE, BL_ENEMAX,
 *         BL_XP, BL_AC, BL_HD, BL_TIME, BL_HUNGER, BL_HP, BL_HPMAX,
 *         BL_LEVELDESC, BL_EXP, BL_CONDITION,
 *         BL_WEAPON, BL_ARMOR, BL_TERRAIN, BL_VERS
 *      -- fldindex could also be BL_FLUSH (-1), which is not really
 *         a field index, but is a special trigger to tell the
 *         windowport that it should output all changes received
 *         to this point. It marks the end of a bot() cycle.
 *      -- fldindex could also be BL_RESET (-3), which is not really
 *         a field index, but is a special advisory to tell the
 *         windowport that it should redisplay all its status fields,
 *         even if no changes have been presented to it.
 *      -- ptr is usually a "char *", unless fldindex is BL_CONDITION.
 *         If fldindex is BL_CONDITION, then ptr is a long value with
 *         any or none of the following bits set (from botl.h):
 *               BL_MASK_BAREH        0x00000001L
 *               BL_MASK_BLIND        0x00000002L
 *               BL_MASK_BUSY         0x00000004L
 *               BL_MASK_CONF         0x00000008L
 *               BL_MASK_DEAF         0x00000010L
 *               BL_MASK_ELF_IRON     0x00000020L
 *               BL_MASK_FLY          0x00000040L
 *               BL_MASK_FOODPOIS     0x00000080L
 *               BL_MASK_GLOWHANDS    0x00000100L
 *               BL_MASK_GRAB         0x00000200L
 *               BL_MASK_HALLU        0x00000400L
 *               BL_MASK_HELD         0x00000800L
 *               BL_MASK_ICY          0x00001000L
 *               BL_MASK_INLAVA       0x00002000L
 *               BL_MASK_LEV          0x00004000L
 *               BL_MASK_PARLYZ       0x00008000L
 *               BL_MASK_RIDE         0x00010000L
 *               BL_MASK_SLEEPING     0x00020000L
 *               BL_MASK_SLIME        0x00040000L
 *               BL_MASK_SLIPPERY     0x00080000L
 *               BL_MASK_STONE        0x00100000L
 *               BL_MASK_STRNGL       0x00200000L
 *               BL_MASK_STUN         0x00400000L
 *               BL_MASK_SUBMERGED    0x00800000L
 *               BL_MASK_TERMILL      0x01000000L
 *               BL_MASK_TETHERED     0x02000000L
 *               BL_MASK_TRAPPED      0x04000000L
 *               BL_MASK_UNCONSC      0x08000000L
 *               BL_MASK_WOUNDEDL     0x10000000L
 *               BL_MASK_HOLDING      0x20000000L
 *
 *      -- The value passed for BL_GOLD usually includes an encoded leading
 *         symbol for GOLD "\GXXXXNNNN:nnn". If the window port needs to use
 *         the textual gold amount without the leading "$:" the port will
 *         have to skip past ':' in the passed "ptr" for the BL_GOLD case.
 *      -- color is an unsigned int.
 *               color_index = color & 0x00FF;         CLR_* value
 *               attribute   = (color >> 8) & 0x00FF;  HL_ATTCLR_* mask
 *         This holds the color and attribute that the field should
 *         be displayed in.
 *         This is relevant for everything except BL_CONDITION fldindex.
 *         If fldindex is BL_CONDITION, this parameter should be ignored,
 *         as condition highlighting is done via the next colormasks
 *         parameter instead.
 *
 *      -- colormasks - pointer to cond_hilites[] array of colormasks.
 *         Only relevant for BL_CONDITION fldindex. The window port
 *         should ignore this parameter for other fldindex values.
 *         Each condition bit must only ever appear in one of the
 *         CLR_ array members, but can appear in multiple HL_ATTCLR_
 *         offsets (because more than one attribute can co-exist).
 *         See doc/window.txt for more details.
 */
export function tty_status_update(fldidx, ptr, chg, percent, color, colormasks) {
    fldidx = C.argument(fldidx, "int");
    ptr = C.argument(ptr, "genericptr_t");
    chg = C.argument(chg, "int");
    percent = C.argument(percent, "int");
    color = C.argument(color, "int");
    colormasks = C.argument(colormasks, "unsigned long *");
    let attrmask;
    let condptr = C.castPointer(ptr, "long *");
    let text = C.castPointer(ptr, "char *");
    const goldbuf = C.localArray("char[40]", 0);
    let lastchar;
    let p;
    let fmt;
    let reset_state = C.char(0);
    if (Number(!!((Number(fldidx < C.BL_RESET)) || (Number(fldidx >= C.MAXBLSTATS))))) return;
    if (Number(!!((Number(!!(Number(fldidx >= 0) && Number(fldidx < C.MAXBLSTATS)))) && Number(!(C.deref(C.ptrAdd(C.status_activefields, fldidx, "boolean"), "boolean")))))) return;
    switch (fldidx) {
        case (C.BL_RESET):
            (reset_state = C.char(1));
        ;
/*FALLTHRU*/
        case (C.BL_FLUSH):
            if (Number(!!(C.callLocal(make_things_fit, reset_state) || C.truncation_expected))) {
                C.callLocal(render_status);
            }
        return;
        case (C.BL_CONDITION):
            ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), fldidx, "struct tty_status_fields"), "struct tty_status_fields")).idx = fldidx);
        (C.tty_condition_bits = C.deref(condptr, "long"));
        (C.tty_colormasks = colormasks);
        ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), fldidx, "struct tty_status_fields"), "struct tty_status_fields")).valid = C.TRUE);
        ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), fldidx, "struct tty_status_fields"), "struct tty_status_fields")).dirty = C.TRUE);
        ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), fldidx, "struct tty_status_fields"), "struct tty_status_fields")).sanitycheck = C.TRUE);
        (C.truncation_expected = C.FALSE);
        break;
        case (C.BL_GOLD):
            (text = C.decode_mixed(goldbuf, text));
        ;
/*FALLTHRU*/
        default:
            (attrmask = C.int(((C.int((color >> 8))) & 255)));
        (fmt = C.deref(C.ptrAdd(C.status_fieldfmt, fldidx, "const char *"), "const char *"));
        if (Number(!(fmt))) (fmt = C.literal("%s"));
/* should be checking for first enabled field here rather than
           just first field, but 'fieldorder' doesn't start any rows
           with fields which can be disabled so [any_row][0] suffices */
        if (Number(!!(Number(C.deref(fmt, "const char") == 32) && (Number(!!(Number(!!(Number(fldidx == C.int(C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.fieldorder, 0, "const enum statusfields[19]"), "const enum statusfields[19]"), 0, "const enum statusfields"), "const enum statusfields"))) || Number(fldidx == C.int(C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.fieldorder, 1, "const enum statusfields[19]"), "const enum statusfields[19]"), 0, "const enum statusfields"), "const enum statusfields"))))) || Number(fldidx == C.int(C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.fieldorder, 2, "const enum statusfields[19]"), "const enum statusfields[19]"), 0, "const enum statusfields"), "const enum statusfields"))))))))) (fmt = C.ptrAdd(fmt, 1, "char"));
/* skip leading space for first field on line */
        C.sprintf(C.deref(C.ptrAdd(C.status_vals, fldidx, "char *"), "char *"), fmt, text, "p");
        ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), fldidx, "struct tty_status_fields"), "struct tty_status_fields")).idx = fldidx);
        ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), fldidx, "struct tty_status_fields"), "struct tty_status_fields")).color = (C.int((color & 255))));
        ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), fldidx, "struct tty_status_fields"), "struct tty_status_fields")).attr = C.term_attr_fixup(attrmask));
        ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), fldidx, "struct tty_status_fields"), "struct tty_status_fields")).lth = C.strlen(C.deref(C.ptrAdd(C.status_vals, fldidx, "char *"), "char *")));
        ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), fldidx, "struct tty_status_fields"), "struct tty_status_fields")).valid = C.TRUE);
        ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), fldidx, "struct tty_status_fields"), "struct tty_status_fields")).dirty = C.TRUE);
        ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), fldidx, "struct tty_status_fields"), "struct tty_status_fields")).sanitycheck = C.TRUE);
        break;
    }
/* The core botl engine sends a single blank to the window port
       for carrying-capacity when it's unused. Let's suppress that */
    if (Number(!!(Number(!!(Number(!!(Number(fldidx >= 0) && Number(fldidx < C.MAXBLSTATS))) && Number((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), fldidx, "struct tty_status_fields"), "struct tty_status_fields")).lth == C.ulong(1)))) && Number(C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.status_vals, fldidx, "char *"), "char *"), 0, "char"), "char") == 32)))) {
        C.store(C.ptrAdd(C.deref(C.ptrAdd(C.status_vals, fldidx, "char *"), "char *"), 0, "char"), "char", C.char(0));
        ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), fldidx, "struct tty_status_fields"), "struct tty_status_fields")).lth = C.ulong(0));
    }
/* default processing above was required before these */
    switch (fldidx) {
        case (C.BL_HP):
            if ((C.iflags).wc2_hitpointbar) {
/* Special additional processing for hitpointbar */
                (C.hpbar_percent = percent);
                (C.hpbar_crit_hp = ((C.critically_low_hp(C.TRUE)) ? 1 : 0));
                ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), C.BL_TITLE, "struct tty_status_fields"), "struct tty_status_fields")).color = (C.int((color & 255))));
                (attrmask = C.int((C.HL_INVERSE | (((C.hpbar_crit_hp) ? C.HL_BLINK : 0)))));
                ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), C.BL_TITLE, "struct tty_status_fields"), "struct tty_status_fields")).attr = C.term_attr_fixup(attrmask));
                ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), C.BL_TITLE, "struct tty_status_fields"), "struct tty_status_fields")).dirty = C.TRUE);
            }
        break;
        case (C.BL_LEVELDESC):
            (C.dlvl_shrinklvl = 0);
/* caller is passing full length string */
        ;
/*FALLTHRU*/
        case (C.BL_HUNGER):
/* The core sends trailing blanks for some fields.
           Let's suppress the trailing blanks */
            if (Number((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), fldidx, "struct tty_status_fields"), "struct tty_status_fields")).lth > C.ulong(0))) {
                (p = C.deref(C.ptrAdd(C.status_vals, fldidx, "char *"), "char *"));
                for ((lastchar = C.eos(p)); Number(!!(C.ptrCompare(lastchar, p, ">") && Number(C.deref((lastchar = C.ptrAdd(lastchar, -1, "char")), "char") == 32))); ) {
                    C.store(lastchar, "char", C.char(0));
                    C.bump(C.fieldRef(C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), fldidx, "struct tty_status_fields"), "struct tty_status_fields"), "lth"), -1, true, "unsigned long");
                }
            }
        break;
        case (C.BL_TITLE):
/* when hitpointbar is enabled, rendering will enforce a length
           of 30 on title, padding with spaces or truncating if necessary */
            if ((C.iflags).wc2_hitpointbar) ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), fldidx, "struct tty_status_fields"), "struct tty_status_fields")).lth = C.ulong(C.int((30 + 2))));
/* '[' and ']' */
        break;
        case (C.BL_GOLD):
/* \GXXXXNNNN counts as 1 [moot since we use decode_mixed() above] */
            if (Number(!!(C.ptrCompare(((p = C.strchr(C.deref(C.ptrAdd(C.status_vals, fldidx, "char *"), "char *"), 92))), 0, "!=") && Number(C.deref(C.ptrAdd(p, 1, "char"), "char") == 71)))) ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), fldidx, "struct tty_status_fields"), "struct tty_status_fields")).lth = C.ulong(C.ulong(((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), fldidx, "struct tty_status_fields"), "struct tty_status_fields")).lth - C.ulong((C.int((10 - 1))))))));
        break;
        case (C.BL_CAP):
            (C.enc_shrinklvl = 0);
/* caller is passing full length string */
        (C.enclev = C.stat_cap_indx());
        break;
    }
/* As of 3.6.2 we only render on BL_FLUSH (or BL_RESET) */
    return;
}

export function make_things_fit(force_update) {
    force_update = C.argument(force_update, "boolean");
    let trycnt;
    let fitting = 0;
    let requirement;
    const rowsz = C.localArray("int[3]", 0);
    let num_rows;
    let condrow;
    let otheroptions = 0;
    (num_rows = ((((Number((C.iflags).wc2_statuslines <= 2))) ? 2 : 3)));
    (condrow = C.int((num_rows - 1)));
/* always last row, 1 for 0..1 or 2 for 0..2 */
    (C.cond_shrinklvl = 0);
    if (Number(!!(Number(C.enc_shrinklvl > 0) && Number(num_rows == 2)))) shrink_enc(0);
    if (Number(C.dlvl_shrinklvl > 0)) C.callLocal(shrink_dlvl, 0);
    set_condition_length();
    for ((trycnt = 0); Number(!!(Number(trycnt < 6) && Number(!(fitting)))); (trycnt = C.int((trycnt + 1)))) {
/* FIXME: this remeasures each line every time even though it
           is only attempting to shrink one of them and the other one
           (or two) remains the same */
        if (Number(!(C.callLocal(check_fields, force_update, rowsz)))) {
            (fitting = 0);
            break;
        }
        (requirement = C.int((C.deref(C.ptrAdd(rowsz, condrow, "int"), "int") - 1)));
        if (Number(C.long(requirement) <= C.long(((C.deref(C.ptrAdd(C.wins, C.WIN_STATUS, "struct WinDesc *"), "struct WinDesc *")).cols - C.long(1))))) {
            (fitting = requirement);
            break;
/* we're good */
        }
        if (Number(trycnt < 2)) {
            if (Number(C.cond_shrinklvl < C.int((trycnt + 1)))) {
                (C.cond_shrinklvl = C.int((trycnt + 1)));
                set_condition_length();
            }
            continue;
        }
        if (Number(C.cond_shrinklvl >= 2)) {
/* We've exhausted the condition identifiers shrinkage,
             * so let's try shrinking other things...
             */
            if (Number(otheroptions < 2)) {
/* try shrinking the encumbrance word, but
                   only when it's on the same line as conditions */
                if (Number(num_rows == 2)) shrink_enc(C.int((otheroptions + 1)));
            }
            else if (Number(otheroptions == 2)) {
                C.callLocal(shrink_dlvl, 1);
            }
            else {
/* Last resort - turn on trunction */
                (C.truncation_expected = C.TRUE);
                break;
            }
            (otheroptions = C.int((otheroptions + 1)));
        }
    }
    return fitting;
}

/*
 * This is the routine where we figure out where each field
 * should be placed, and flag whether the on-screen details
 * must be updated because they need to change.
 * This is now done at an individual field case-by-case level.
 */
export function check_fields(forcefields, sz) {
    forcefields = C.argument(forcefields, "boolean");
    sz = C.argument(sz, "int *");
    let c;
    let i;
    let row;
    let col;
    let num_rows;
    let idx;
    let valid = C.TRUE;
    let matchprev;
    let update_right;
    if (Number(!!(Number(!(C.windowdata_init)) && Number(!(check_windowdata()))))) return C.FALSE;
    (num_rows = ((((Number((C.iflags).wc2_statuslines <= 2))) ? 2 : 3)));
/* 2 or 3 */
    for ((row = 0); Number(row < num_rows); (row = C.int((row + 1)))) {
        C.store(C.ptrAdd(sz, row, "int"), "int", 0);
        (col = 1);
        (update_right = C.FALSE);
        for ((i = 0); Number(((idx = C.int(C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.fieldorder, row, "const enum statusfields[19]"), "const enum statusfields[19]"), i, "const enum statusfields"), "const enum statusfields")))) != C.BL_FLUSH); (i = C.int((i + 1)))) {
            if (Number(!(C.deref(C.ptrAdd(C.status_activefields, idx, "boolean"), "boolean")))) continue;
            if (Number(!((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).valid))) (valid = C.FALSE);
/* might be called more than once for shrink tests, so need
               to reset these (redraw and x at any rate) each time */
            ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).redraw = C.FALSE);
            ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).y = row);
            ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).x = col);
/* On a change to the field location, everything further
               to the right must be updated as well.  (Not necessarily
               everything; it's possible for complementary changes across
               multiple fields to put stuff further right back in sync.) */
            if (Number(C.ulong((C.ulong((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).x) + (C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).lth)) != C.ulong((C.ulong((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.BEFORE, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).x) + (C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.BEFORE, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).lth)))) (update_right = C.TRUE);
            else if (Number(!!(Number((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).lth != (C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.BEFORE, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).lth) || Number((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).x != (C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.BEFORE, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).x)))) ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).redraw = C.TRUE);
            else /* in case update_right is set, we're back in sync now */
            (update_right = C.FALSE);
            (matchprev = C.FALSE);
/* assume failure */
            if (Number(!!(Number(!!(Number(!!(valid && Number(!(update_right)))) && Number(!(forcefields)))) && Number(!((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).redraw))))) {
/*
                 * Check values against those already on the display.
                 *  - Is the additional processing time for this worth it?
                 */
                if (Number(!!(Number(!!(Number(!!(C.do_field_opt && Number(idx != C.BL_CONDITION))) && (Number((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).color == (C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.BEFORE, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).color)))) && (Number((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).attr == (C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.BEFORE, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).attr))))) /* color/attr checks aren't right for 'condition'
                       and neither is examining status_vals[BL_CONDITION]
                       so skip same-contents optimization for conditions */
{
                    (matchprev = C.TRUE);
/* assume success */
                    if ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).dirty) {
/* compare values */
                        let ob;
                        let nb;
/* old byte, new byte */
                        let cw = C.deref(C.ptrAdd(C.wins, C.WIN_STATUS, "struct WinDesc *"), "struct WinDesc *");
                        (c = C.int((col - 1)));
                        (ob = C.ptrAdd(C.deref(C.ptrAdd((cw).data, row, "char *"), "char *"), c, "char"));
                        (nb = C.deref(C.ptrAdd(C.status_vals, idx, "char *"), "char *"));
                        while (Number(!!(C.deref(nb, "const char") && Number(C.long(c) < (cw).cols)))) {
                            if (Number(C.deref(nb, "const char") != C.deref(ob, "const char"))) break;
                            ((nb = C.ptrAdd(nb, 1, "char")), C.ptrAdd(nb, -1, "char"));
                            ((ob = C.ptrAdd(ob, 1, "char")), C.ptrAdd(ob, -1, "char"));
                            ((c = C.int((c + 1))), C.int((c - 1)));
                        }
/* if we're not at the end of new string, no match;
                           we don't need to worry about whether there might
                           be leftover old string; that could only happen
                           if they have different lengths, in which case
                           'update_right' will be set and we won't get here */
                        if (C.deref(nb, "const char")) (matchprev = C.FALSE);
                    }
                }
            }
            if (Number(!!(Number(!!(forcefields || update_right)) || (Number(!!((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).dirty && Number(!(matchprev)))))))) ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).redraw = C.TRUE);
            (col = C.int(C.ulong((C.ulong(col) + (C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).lth))));
        }
        C.store(C.ptrAdd(sz, row, "int"), "int", col);
    }
    return valid;
}

/*  0.. 5 */
/*  6..10 */
/* 11..15 */
/* 16..19 */
/* 20..22 */
/* 23..25 */
/*   26   */
/*
     * Make sure that every field made it down to the
     * bottom of the render_status() for-loop.
     */
/* guard against an increase in MAXBLSTATS in botl.h without
               a corresponding expansion of idxtext[] here */
/* blstats[] increased without doing same for idxtext[] */
/*
             * Attention developers: If you encounter the above
             * message in paniclog, it almost certainly means that
             * a recent code change has caused a failure to reach
             * the bottom of render_status(), at least for the BL_
             * field identified in the impossible() message.
             *
             * That could be because of the addition of a continue
             * statement within the render_status() for-loop, or a
             * premature return from render_status() before it finished
             * its housekeeping chores.
             */
/* NHDEVEL_STATUS */
/*
 * This is what places a field on the tty display.
 */
export function tty_putstatusfield(text, x, y) {
    text = C.argument(text, "const char *");
    x = C.argument(x, "int");
    y = C.argument(y, "int");
    let i;
    let n;
    let ncols;
    let nrows;
    let lth = 0;
    let cw = 0;
    if (Number(!!(Number(C.WIN_STATUS == (C.int((-1)))) || C.ptrCompare(((cw = C.deref(C.ptrAdd(C.wins, C.WIN_STATUS, "struct WinDesc *"), "struct WinDesc *"))), 0, "==")))) C.panic(C.literal("tty_putstatusfield: Invalid WinDesc\n"), "");
    (ncols = C.int((cw).cols));
    (nrows = C.int((cw).maxrow));
    (lth = C.int(C.strlen(text)));
    ;
    if (Number(!!(Number(x < ncols) && Number(y < nrows)))) {
        if (Number(!!(Number(C.long(x) != (cw).curx) || Number(C.long(y) != (cw).cury)))) tty_curs(C.NHW_STATUS, x, y);
        for ((i = 0); Number(i < lth); (i = C.int((i + 1)))) {
            (n = C.int((i + x)));
            if (Number(!!(Number(n < ncols) && C.deref(text, "const char")))) {
                C.putchar(C.deref(text, "const char"));
                C.nomux_putch(C.deref(text, "const char"));
                C.bump(C.fieldRef(C.ttyDisplay, "curx"), 1, true, "short");
                C.bump(C.fieldRef(cw, "curx"), 1, true, "long");
                C.store(C.ptrAdd(C.deref(C.ptrAdd((cw).data, y, "char *"), "char *"), C.int((n - 1)), "char"), "char", C.deref(text, "const char"));
                ((text = C.ptrAdd(text, 1, "char")), C.ptrAdd(text, -1, "char"));
            }
        }
    }
/* Now we're truncating */
/* but we knew in advance */
}

/* caller must set cond_shrinklvl (0..2) before calling us */
export function set_condition_length() {
    let mask;
    let c;
    let lth = 0;
    if (C.tty_condition_bits) {
        for ((c = 0); Number(c < C.int((C.ulong((BigInt(C.sizeof("const struct conditions_t[30]")) / BigInt(C.sizeof("const struct conditions_t"))))))); (c = C.int((c + 1)))) {
            (mask = (C.deref(C.ptrAdd(C.conditions, c, "const struct conditions_t"), "const struct conditions_t")).mask);
            if (Number((C.long((C.tty_condition_bits & mask))) == mask)) (lth = C.int(C.int((lth + C.int((1 + C.int(C.strlen(C.deref(C.ptrAdd((C.deref(C.ptrAdd(C.conditions, c, "const struct conditions_t"), "const struct conditions_t")).text, C.cond_shrinklvl, "const char *const"), "const char *const")))))))));
        }
    }
    ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), C.BL_CONDITION, "struct tty_status_fields"), "struct tty_status_fields")).lth = C.ulong(lth));
}

export function shrink_enc(lvl) {
    lvl = C.argument(lvl, "int");
/* shrink or restore the encumbrance word */
    if (Number(lvl <= 2)) {
        (C.enc_shrinklvl = lvl);
        C.sprintf(C.deref(C.ptrAdd(C.status_vals, C.BL_CAP, "char *"), "char *"), C.literal(" %s"), C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.encvals, lvl, "const char *const[6]"), "const char *const[6]"), C.enclev, "const char *const"), "const char *const"), "p");
    }
    ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), C.BL_CAP, "struct tty_status_fields"), "struct tty_status_fields")).lth = C.strlen(C.deref(C.ptrAdd(C.status_vals, C.BL_CAP, "char *"), "char *")));
}

export function shrink_dlvl(lvl) {
    lvl = C.argument(lvl, "int");
/* try changing Dlvl: to Dl: */
    const buf = C.localArray("char[256]", 0);
    let levval = C.strchr(C.deref(C.ptrAdd(C.status_vals, C.BL_LEVELDESC, "char *"), "char *"), 58);
    if (levval) {
        (C.dlvl_shrinklvl = lvl);
        C.strcpy(buf, (((Number(lvl == 0))) ? C.literal("Dlvl") : C.literal("Dl")));
        C.strcat(buf, levval);
        C.strcpy(C.deref(C.ptrAdd(C.status_vals, C.BL_LEVELDESC, "char *"), "char *"), buf);
        ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), C.BL_LEVELDESC, "struct tty_status_fields"), "struct tty_status_fields")).lth = C.strlen(C.deref(C.ptrAdd(C.status_vals, C.BL_LEVELDESC, "char *"), "char *")));
    }
}

/*
 * Ensure the underlying status window data start out
 * blank and null-terminated.
 */
export function check_windowdata() {
    if (Number(!!(Number(C.WIN_STATUS == (C.int((-1)))) || C.ptrCompare(C.deref(C.ptrAdd(C.wins, C.WIN_STATUS, "struct WinDesc *"), "struct WinDesc *"), 0, "==")))) {
        C.paniclog(C.literal("check_windowdata"), C.literal(" null status window."));
        return C.FALSE;
    }
    else if (Number(!(C.windowdata_init))) {
        tty_clear_nhwindow(C.WIN_STATUS);
/* also sets cw->data[] to spaces */
        (C.windowdata_init = C.TRUE);
    }
    return C.TRUE;
}

/*
 * Return what color this condition should
 * be displayed in based on user settings.
 */
export function condcolor(bm, bmarray) {
    bm = C.argument(bm, "long");
    bmarray = C.argument(bmarray, "unsigned long *");
    let i;
    if (Number(!!(bm && bmarray))) for ((i = 0); Number(i < C.CLR_MAX); (i = C.int((i + 1)))) {
        if (Number((C.ulong((C.ulong(bm) & C.deref(C.ptrAdd(bmarray, i, "unsigned long"), "unsigned long")))) != C.ulong(0))) return i;
    }
    return C.NO_COLOR;
}

export function condattr(bm, bmarray) {
    bm = C.argument(bm, "long");
    bmarray = C.argument(bmarray, "unsigned long *");
    let attr = 0;
    let i;
    if (Number(!!(bm && bmarray))) {
        for ((i = C.HL_ATTCLR_BOLD); Number(i < C.BL_ATTCLR_MAX); (i = C.int((i + 1)))) {
            if (Number((C.ulong((C.ulong(bm) & C.deref(C.ptrAdd(bmarray, i, "unsigned long"), "unsigned long")))) != C.ulong(0))) {
                switch (i) {
                    case C.HL_ATTCLR_BOLD:
                        (attr = C.int(C.int((attr | C.HL_BOLD))));
                    break;
                    case C.HL_ATTCLR_DIM:
                        (attr = C.int(C.int((attr | C.HL_DIM))));
                    break;
                    case C.HL_ATTCLR_ITALIC:
                        (attr = C.int(C.int((attr | C.HL_ITALIC))));
                    break;
                    case C.HL_ATTCLR_ULINE:
                        (attr = C.int(C.int((attr | C.HL_ULINE))));
                    break;
                    case C.HL_ATTCLR_BLINK:
                        (attr = C.int(C.int((attr | C.HL_BLINK))));
                    break;
                    case C.HL_ATTCLR_INVERSE:
                        (attr = C.int(C.int((attr | C.HL_INVERSE))));
                    break;
                }
            }
        }
    }
    return attr;
}

export function render_status() {
    let mask;
    let bits;
    let i;
    let x;
    let y;
    let idx;
    let c;
    let ci;
    let row;
    let tlth;
    let num_rows;
    let coloridx = 0;
    let attrmask = 0;
    let text;
    let cw = 0;
    if (Number(!!(Number(C.WIN_STATUS == (C.int((-1)))) || C.ptrCompare(((cw = C.deref(C.ptrAdd(C.wins, C.WIN_STATUS, "struct WinDesc *"), "struct WinDesc *"))), 0, "==")))) {
        C.paniclog(C.literal("render_status"), C.literal("WIN_ERR on status window."));
        return;
    }
    (num_rows = ((((Number((C.iflags).wc2_statuslines <= 2))) ? 2 : 3)));
/* 2 or 3 */
    for ((row = 0); Number(row < num_rows); (row = C.int((row + 1)))) {
        do {
            if ((C.program_state).done_hup) {
                (C.morc = C.char(27));
                return;
            }
        }
        while (0);
        (y = row);
        tty_curs(C.WIN_STATUS, 1, y);
        for ((i = 0); Number(((idx = C.int(C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.fieldorder, row, "const enum statusfields[19]"), "const enum statusfields[19]"), i, "const enum statusfields"), "const enum statusfields")))) != C.BL_FLUSH); (i = C.int((i + 1)))) {
            if (Number(!(C.deref(C.ptrAdd(C.status_activefields, idx, "boolean"), "boolean")))) continue;
            (x = (C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).x);
            (text = C.deref(C.ptrAdd(C.status_vals, idx, "char *"), "char *"));
/* always "" for BL_CONDITION */
            (tlth = C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).lth));
/* valid for BL_CONDITION */
            if (Number(!!((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).redraw || Number(!(C.do_field_opt))))) {
                let hitpointbar = C.char((Number(!!(Number(idx == C.BL_TITLE) && (C.iflags).wc2_hitpointbar))));
                if (Number(idx == C.BL_CONDITION)) {
/*
                     * +-----------------+
                     * | Condition Codes |
                     * +-----------------+
                     */
                    (bits = C.tty_condition_bits);
/*
                     * If no bits are set, we can fall through condition
                     * rendering code to finalx[] handling (and subsequent
                     * rest-of-line erasure if line is shorter than before).
                     *
                     * First, when conditions are on 3rd row, they might
                     * be indented to line up with a position on 2nd row.
                     */
                    if (Number(!!(Number(row == C.int((3 - 1))) && Number(bits != 0n)))) {
                        let cstart;
                        let last_col = C.int((cw).cols);
                        let dat = C.ptrAdd(C.deref(C.ptrAdd((cw).data, y, "char *"), "char *"), 0, "char");
/* 'version' might follow conditions; if so, adjust
                           expectations for where conditions should end;
                           only matters when conditions are being indented */
                        if (Number(!!(C.deref(C.ptrAdd(C.status_activefields, C.BL_VERS, "boolean"), "boolean") && Number(C.int(C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.fieldorder, row, "const enum statusfields[19]"), "const enum statusfields[19]"), C.int((i + 1)), "const enum statusfields"), "const enum statusfields")) == C.BL_VERS)))) (last_col = C.int(C.int((last_col - C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), C.BL_VERS, "struct tty_status_fields"), "struct tty_status_fields")).lth)))));
/* line up with hunger (or where it would have
                           been when currently omitted); if there isn't
                           enough room for that, right justify; or place
                           as-is if not even enough room for /that/; we
                           expect hunger to be on preceding row, in which
                           case its current data has been moved to [BEFORE] */
                        if (Number(!!(Number(!!(Number((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.BEFORE, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), C.BL_HUNGER, "struct tty_status_fields"), "struct tty_status_fields")).y < row) && Number(x < (C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.BEFORE, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), C.BL_HUNGER, "struct tty_status_fields"), "struct tty_status_fields")).x))) && (Number(C.int(((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.BEFORE, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), C.BL_HUNGER, "struct tty_status_fields"), "struct tty_status_fields")).x + tlth)) < C.int((last_col - 1))))))) (cstart = (C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.BEFORE, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), C.BL_HUNGER, "struct tty_status_fields"), "struct tty_status_fields")).x);
                        else if (Number(C.long(C.int((x + tlth))) < C.long(((cw).cols - C.long(1))))) (cstart = C.int((last_col - tlth)));
                        else (cstart = x);
/* indent conditions to line them up with 2nd row */
                        if (Number(x < cstart)) {
                            do {
                                if (Number(C.deref(C.ptrAdd(dat, C.int((x - 1)), "char"), "char") != 32)) tty_putstatusfield(C.literal(" "), x, y);
                            }
                            while (Number((x = C.int((x + 1))) < cstart));
                            ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), C.BL_CONDITION, "struct tty_status_fields"), "struct tty_status_fields")).x = x);
                            tty_curs(C.WIN_STATUS, x, y);
                        }
                    }
/* actually draw condition words */
                    for ((c = 0); Number(!!(Number(c < C.int((C.ulong((BigInt(C.sizeof("const struct conditions_t[30]")) / BigInt(C.sizeof("const struct conditions_t"))))))) && Number(bits != 0n))); (c = C.int((c + 1)))) {
                        (ci = C.deref(C.ptrAdd(C.cond_idx, c, "int"), "int"));
                        (mask = (C.deref(C.ptrAdd(C.conditions, ci, "const struct conditions_t"), "const struct conditions_t")).mask);
                        if (C.long((bits & mask))) {
                            let condtext;
                            tty_putstatusfield(C.literal(" "), ((x = C.int((x + 1))), C.int((x - 1))), y);
                            if ((C.iflags).hilite_delta) {
                                (attrmask = condattr(mask, C.tty_colormasks));
                                do {
                                    if (attrmask) {
                                        if (C.int(((attrmask) & C.HL_BOLD))) C.term_start_attr(1);
                                        if (C.int(((attrmask) & C.HL_DIM))) C.term_start_attr(2);
                                        if (C.int(((attrmask) & C.HL_ITALIC))) C.term_start_attr(3);
                                        if (C.int(((attrmask) & C.HL_ULINE))) C.term_start_attr(4);
                                        if (C.int(((attrmask) & C.HL_BLINK))) C.term_start_attr(5);
                                        if (C.int(((attrmask) & C.HL_INVERSE))) C.term_start_attr(7);
                                    }
                                }
                                while (0);
                                (coloridx = condcolor(mask, C.tty_colormasks));
                                if (Number(coloridx != C.NO_COLOR)) C.term_start_color(coloridx);
                            }
                            (condtext = C.deref(C.ptrAdd((C.deref(C.ptrAdd(C.conditions, ci, "const struct conditions_t"), "const struct conditions_t")).text, C.cond_shrinklvl, "const char *const"), "const char *const"));
                            if (Number(!!(Number(C.long(x) >= (cw).cols) && Number(!(C.truncation_expected))))) {
                                C.impossible(C.literal("Unexpected condition placement overflow for \"%s\""), condtext, "p");
                                (condtext = C.literal(""));
                                (bits = 0n);
/* skip any remaining conditions */
                            }
                            tty_putstatusfield(condtext, x, y);
                            (x = C.int(C.int((x + C.int(C.strlen(condtext))))));
                            if ((C.iflags).hilite_delta) {
                                if (Number(coloridx != C.NO_COLOR)) C.term_end_color();
                                do {
                                    if (attrmask) {
                                        if (C.int(((attrmask) & C.HL_INVERSE))) C.term_end_attr(7);
                                        if (C.int(((attrmask) & C.HL_BLINK))) C.term_end_attr(5);
                                        if (C.int(((attrmask) & C.HL_ULINE))) C.term_end_attr(4);
                                        if (C.int(((attrmask) & C.HL_ITALIC))) C.term_end_attr(3);
                                        if (C.int(((attrmask) & C.HL_DIM))) C.term_end_attr(2);
                                        if (C.int(((attrmask) & C.HL_BOLD))) C.term_end_attr(1);
                                    }
                                }
                                while (0);
                            }
                            (bits = C.long(C.long((bits & C.long((~mask))))));
                        }
                    }
/* 'x' is 1-based and 'cols' and 'data' are 0-based,
                       so x==cols means we just stored in data[N-2] and
                       are now positioned at data[N-1], the terminator;
                       that's ok as long as we don't write there */
                    if (Number(C.long(x) > (cw).cols)) {
                        C.declareStatic("render_status.once_only", "unsigned int", C.uint(0));
                        if (Number(!!(Number(!(C.truncation_expected)) && Number(!(((C.staticCell("render_status.once_only").value = C.uint((C.staticCell("render_status.once_only").value + 1))), C.uint((C.staticCell("render_status.once_only").value - 1)))))))) C.paniclog(C.literal("render_status()"), C.literal(" unexpected truncation."));
                        (x = C.int((cw).cols));
                    }
                }
                else if (hitpointbar) {
/*
                     * +-------------------------+
                     * | Title with Hitpoint Bar |
                     * +-------------------------+
                     */
/* hitpointbar using hp percent calculation */
                    let bar_len;
                    let bar_pos = 0;
                    const bar = C.localArray("char[31]", 0);
                    let bar2 = 0;
                    let savedch = C.char(0);
                    let twoparts = C.char((Number(C.hpbar_percent < 100)));
/* force exactly 30 characters, padded with spaces
                       if shorter or truncated if longer */
                    if (Number(C.strlen(text) != C.ulong(30))) {
                        C.sprintf(bar, C.literal("%-30.30s"), text, "p");
                        C.strcpy(C.deref(C.ptrAdd(C.status_vals, C.BL_TITLE, "char *"), "char *"), bar);
                    }
                    else {
                        C.strcpy(bar, text);
                    }
                    if (C.hpbar_crit_hp) C.repad_with_dashes(bar);
                    (bar_len = C.int(C.strlen(bar)));
/* always 30 */
/*tlth = bar_len + 2; // not needed within this 'if'*/
                    (attrmask = 0);
/* for the second part only case: dead */
/* when at full HP, the whole title will be highlighted;
                       when injured or dead, there will be a second portion
                       which is not highlighted */
                    if (twoparts) {
/* figure out where to separate the two parts */
                        (bar_pos = C.int(Math.trunc((C.int(Math.imul(bar_len, C.hpbar_percent))) / 100)));
                        if (Number(!!(Number(bar_pos < 1) && Number(C.hpbar_percent > 0)))) (bar_pos = 1);
                        if (Number(!!(Number(bar_pos >= bar_len) && Number(C.hpbar_percent < 100)))) (bar_pos = C.int((bar_len - 1)));
                        (bar2 = C.ptrAdd(bar, bar_pos, "char"));
                        (savedch = C.deref(bar2, "char"));
                        C.store(bar2, "char", C.char(0));
                    }
                    tty_putstatusfield(C.literal("["), ((x = C.int((x + 1))), C.int((x - 1))), y);
                    if (C.deref(bar, "char")) {
/* always True, unless twoparts+dead (0 HP) */
                        (coloridx = (C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), C.BL_TITLE, "struct tty_status_fields"), "struct tty_status_fields")).color);
                        (attrmask = (C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), C.BL_TITLE, "struct tty_status_fields"), "struct tty_status_fields")).attr);
                        do {
                            if (attrmask) {
                                if (C.int(((attrmask) & C.HL_BOLD))) C.term_start_attr(1);
                                if (C.int(((attrmask) & C.HL_DIM))) C.term_start_attr(2);
                                if (C.int(((attrmask) & C.HL_ITALIC))) C.term_start_attr(3);
                                if (C.int(((attrmask) & C.HL_ULINE))) C.term_start_attr(4);
                                if (C.int(((attrmask) & C.HL_BLINK))) C.term_start_attr(5);
                                if (C.int(((attrmask) & C.HL_INVERSE))) C.term_start_attr(7);
                            }
                        }
                        while (0);
                        if (Number(!!((C.iflags).hilite_delta && Number(coloridx != C.NO_COLOR)))) C.term_start_color(coloridx);
                        tty_putstatusfield(bar, x, y);
                        (x = C.int(C.int((x + C.int(C.strlen(bar))))));
                        if (Number(!!((C.iflags).hilite_delta && Number(coloridx != C.NO_COLOR)))) C.term_end_color();
                        do {
                            if (attrmask) {
                                if (C.int(((attrmask) & C.HL_INVERSE))) C.term_end_attr(7);
                                if (C.int(((attrmask) & C.HL_BLINK))) C.term_end_attr(5);
                                if (C.int(((attrmask) & C.HL_ULINE))) C.term_end_attr(4);
                                if (C.int(((attrmask) & C.HL_ITALIC))) C.term_end_attr(3);
                                if (C.int(((attrmask) & C.HL_DIM))) C.term_end_attr(2);
                                if (C.int(((attrmask) & C.HL_BOLD))) C.term_end_attr(1);
                            }
                        }
                        while (0);
                    }
                    if (twoparts) {
                        if (Number((C.int((attrmask & C.HL_BLINK))) != 0)) C.term_start_attr(C.ATR_BLINK);
                        C.store(bar2, "char", savedch);
                        tty_putstatusfield(bar2, x, y);
                        (x = C.int(C.int((x + C.int(C.strlen(bar2))))));
                        if (Number((C.int((attrmask & C.HL_BLINK))) != 0)) C.term_end_attr(C.ATR_BLINK);
                    }
                    tty_putstatusfield(C.literal("]"), ((x = C.int((x + 1))), C.int((x - 1))), y);
                }
                else {
/*
                     * +-----------------------------+
                     * | Everything else that is not |
                     * |   in a special case above   |
                     * +-----------------------------+
                     */
                    if (Number(!!(Number(idx == C.BL_VERS) && Number(C.int(C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.fieldorder, row, "const enum statusfields[19]"), "const enum statusfields[19]"), C.int((i + 1)), "const enum statusfields"), "const enum statusfields")) == C.BL_FLUSH)))) /* if 'version' is the last field in its row, right
                           justify it (otherwise just treat it as ordinary) */
{
                        let vstart;
                        let dat = C.ptrAdd(C.deref(C.ptrAdd((cw).data, y, "char *"), "char *"), 0, "char");
/* FIXME:  there's something fishy going on here;
                           'x' ends up out of synch when conditions have
                           3rd row indentation and the indenting of version
                           overwrites them with spaces; this hides that */
                        let vx = C.int(C.ulong((C.ulong((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.BEFORE, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), C.BL_CONDITION, "struct tty_status_fields"), "struct tty_status_fields")).x) + (C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.BEFORE, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), C.BL_CONDITION, "struct tty_status_fields"), "struct tty_status_fields")).lth)));
                        if (Number(!!(Number(!!(Number(i > 0) && Number(C.int(C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.fieldorder, row, "const enum statusfields[19]"), "const enum statusfields[19]"), C.int((i - 1)), "const enum statusfields"), "const enum statusfields")) == C.BL_CONDITION))) && Number(x != vx)))) {
                            (x = vx);
                            tty_curs(C.WIN_STATUS, x, y);
                        }
/* indent version to right justify it */
                        (vstart = C.int(C.long(((cw).cols - C.long(C.int((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).lth))))));
                        if (Number(x < vstart)) {
                            do {
                                if (Number(C.deref(C.ptrAdd(dat, C.int((x - 1)), "char"), "char") != 32)) tty_putstatusfield(C.literal(" "), x, y);
                            }
                            while (Number((x = C.int((x + 1))) < vstart));
                            ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), C.BL_VERS, "struct tty_status_fields"), "struct tty_status_fields")).x = x);
                        }
                    }
                    if ((C.iflags).hilite_delta) {
                        while (Number(C.deref(text, "char") == 32)) {
                            tty_putstatusfield(C.literal(" "), ((x = C.int((x + 1))), C.int((x - 1))), y);
                            ((text = C.ptrAdd(text, 1, "char")), C.ptrAdd(text, -1, "char"));
                        }
                        if (Number(!!(Number(C.deref(text, "char") == 47) && Number(idx == C.BL_EXP)))) {
                            tty_putstatusfield(C.literal("/"), ((x = C.int((x + 1))), C.int((x - 1))), y);
                            ((text = C.ptrAdd(text, 1, "char")), C.ptrAdd(text, -1, "char"));
                        }
                        (attrmask = (C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).attr);
                        do {
                            if (attrmask) {
                                if (C.int(((attrmask) & C.HL_BOLD))) C.term_start_attr(1);
                                if (C.int(((attrmask) & C.HL_DIM))) C.term_start_attr(2);
                                if (C.int(((attrmask) & C.HL_ITALIC))) C.term_start_attr(3);
                                if (C.int(((attrmask) & C.HL_ULINE))) C.term_start_attr(4);
                                if (C.int(((attrmask) & C.HL_BLINK))) C.term_start_attr(5);
                                if (C.int(((attrmask) & C.HL_INVERSE))) C.term_start_attr(7);
                            }
                        }
                        while (0);
                        (coloridx = (C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).color);
                        if (Number(coloridx != C.NO_COLOR)) C.term_start_color(coloridx);
                    }
                    tty_putstatusfield(text, x, y);
                    (x = C.int(C.int((x + C.int(C.strlen(text))))));
                    if ((C.iflags).hilite_delta) {
                        if (Number(coloridx != C.NO_COLOR)) C.term_end_color();
                        do {
                            if (attrmask) {
                                if (C.int(((attrmask) & C.HL_INVERSE))) C.term_end_attr(7);
                                if (C.int(((attrmask) & C.HL_BLINK))) C.term_end_attr(5);
                                if (C.int(((attrmask) & C.HL_ULINE))) C.term_end_attr(4);
                                if (C.int(((attrmask) & C.HL_ITALIC))) C.term_end_attr(3);
                                if (C.int(((attrmask) & C.HL_DIM))) C.term_end_attr(2);
                                if (C.int(((attrmask) & C.HL_BOLD))) C.term_end_attr(1);
                            }
                        }
                        while (0);
                    }
                }
            }
            else {
/* not rendered => same text as before */
                (x = C.int(C.int((x + tlth))));
            }
            C.store(C.ptrAdd(C.deref(C.ptrAdd(C.finalx, row, "int[2]"), "int[2]"), C.NOW, "int"), "int", C.int((x - 1)));
/* reset .redraw and .dirty now that field has been rendered */
            ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).dirty = C.FALSE);
            ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).redraw = C.FALSE);
            ((C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields")).sanitycheck = C.FALSE);
/*
             * For comparison of current and previous:
             * - Copy the entire tty_status struct.
             */
            C.store(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.BEFORE, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields", C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.tty_status, C.NOW, "struct tty_status_fields[27]"), "struct tty_status_fields[27]"), idx, "struct tty_status_fields"), "struct tty_status_fields"));
        }
/* for i=..., idx=fieldorder[][i] */
        (x = C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.finalx, row, "int[2]"), "int[2]"), C.NOW, "int"), "int"));
        if (Number(!!((Number(!!(Number(x < C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.finalx, row, "int[2]"), "int[2]"), C.BEFORE, "int"), "int")) || Number(!(C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.finalx, row, "int[2]"), "int[2]"), C.BEFORE, "int"), "int")))))) && Number(C.long(C.int((x + 1))) < (cw).cols)))) {
            tty_curs(C.WIN_STATUS, C.int((x + 1)), y);
            C.cl_end();
        }
/*
         * For comparison of current and previous:
         * - Copy the last written column number on the row.
         */
        C.store(C.ptrAdd(C.deref(C.ptrAdd(C.finalx, row, "int[2]"), "int[2]"), C.BEFORE, "int"), "int", C.deref(C.ptrAdd(C.deref(C.ptrAdd(C.finalx, row, "int[2]"), "int[2]"), C.NOW, "int"), "int"));
    }
/* for row=... */
    return;
}

/* STATUS_HILITES */
/* USER_SOUNDS && TTY_SOUND_ESCCODES */
/* TTY_TILES_ESCCODES */
/* TTY_SOUND_ESCCODES */
/* TTY_GRAPHICS */
/*wintty.c*/
