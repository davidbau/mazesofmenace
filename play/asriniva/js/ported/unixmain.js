import { C } from './c-runtime.js';
/* NetHack 5.0	unixmain.c	$NHDT-Date: 1711213891 2024/03/23 17:11:31 $  $NHDT-Branch: NetHack-5.0 $:$NHDT-Revision: 1.127 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2011. */
/* NetHack may be freely redistributed.  See license for details. */
/* main.c - Unix NetHack */
/* for uuid */
/* NHUUID */
/* CHDIR */
export function main(argc,argv)
{
    argc=C.i32(argc);
    argv=C.ptr(argv);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["main.argc@1404",4],["main.argv@1416",8],["main.dir@1436",8]]);
    try {
    argc=C.local("main.argc@1404","int",argc);
    argv=C.local("main.argv@1416","char **",argv);
    let dir=C.local("main.dir@1436","char *",0);
    let nhfp;
    let exact_username;
    let resuming=(C.i8(0));
    /* assume new game */
    let plsel_once=(C.i8(0));
    C.early_init(argc.value,argv.value);
    C.rng_log_init();
    /* 004-prng-logging: open log if NETHACK_RNGLOG is set */
    /* special hack to change working directory to a resource fork when
   running from finder --sam */
    (C.field(C.gh,"instance_globals_h","hname").value=C.cell((argv.value+Number(0)*8),"char *").value);
    (C.field(C.svh,"instance_globals_saved_h","hackpid").value=C.getpid());
    C.umask(C.u32(C.i32((511&C.i32((~432))))));
    C.choose_windows(C.literal("tty"));
    /* One of the soundlib interfaces was integrated on build.
     * We can leave a hint here for activate_chosen_soundlib later.
     * assign_soundlib() just sets an indicator, it doesn't initialize
     * any soundlib, and the indicator could be overturned before
     * activate_chosen_soundlib() gets called. Qt will place its own
     * hint if qt_init_nhwindow() is invoked.
     */
    /* otherwise no chdir() */
    /*
     * See if we must change directory to the playground.
     * (Perhaps hack runs suid and playground is inaccessible
     *  for the player.)
     * The environment variable HACKDIR is overridden by a
     *  -d command line option (must be the first option given).
     */
    (dir.value=C.nh_getenv(C.literal("NETHACKDIR")));
    if(Number(!(dir.value))) (dir.value=C.nh_getenv(C.literal("HACKDIR")));
    /* CHDIR */
    (C.field(C.program_state,"sinfo","early_options").value=1);
    /* handle -dalthackdir, -s <score stuff>, --version, --showpaths */
    C.early_options(argc.address,argv.address,dir.address);
    (C.field(C.program_state,"sinfo","early_options").value=0);
    /*
     * Change directories before we initialize the window system so
     * we can find the tile file.
     */
    chdirx(dir.value,(C.i8(1)));
    C.initoptions();
    (C.global("ARGV0").value=C.field(C.gh,"instance_globals_h","hname").value);
    /* save for possible stack trace */
    C.panictrace_setsignals((C.i8(1)));
    (exact_username=whoami());
    /*
     * It seems you really want to play.
     */
    (C.field(C.u,"you","uhp").value=1);
    /* prevent RIP on early quits */
    (C.field(C.program_state,"sinfo","preserve_locks").value=1);
    sethanguphandler(C.functionAddress("hangup"));
    process_options(argc.value,argv.value);
    /* command line options */
    C.callback(0,(C.field(C.windowprocs,"window_procs","win_init_nhwindows").value),argc.address,argv.value);
    /* now we can set up window system */
    C.getmailstatus();
    /* wizard mode access is deferred until here */
    C.set_playmode();
    /* sets plname to "wizard" for wizard mode */
    /* hide any hyphens from plnamesuffix() */
    (C.field(C.gp,"instance_globals_p","plnamelen").value=(C.i32(exact_username)?C.i32(C.strlen(C.field(C.svp,"instance_globals_saved_p","plname").address)):0));
    /* strip role,race,&c suffix; calls askname() if plname[] is empty
       or holds a generic user name like "player" or "games" */
    C.plnamesuffix();
    if(C.field(C.flags,"flag","debug").value) {
        /* use character name rather than lock letter for file names */
        (C.field(C.gl,"instance_globals_l","locknum").value=0);
    } else {
        /* suppress interrupts while processing lock file */
        C.teleport_native_signal(3,(C.ptr(1)));
        C.teleport_native_signal(2,(C.ptr(1)));
    }
    ;
    /* must be before newgame() */
    /*
     * Initialize the vision system.  This must be before mklev() on a
     * new game or before a level restore on a saved game.
     */
    C.vision_init();
    C.init_sound_disp_gamewindows();
    /*
     * First, try to find and restore a save file for specified character.
     * We'll return here if new game player_selection() renames the hero.
     */
    attempt_restore: while(true) { /* source attempt_restore: */
    /*
     * getlock() complains and quits if there is already a game
     * in progress for current character name (when gl.locknum == 0)
     * or if there are too many active games (when gl.locknum > 0).
     * When proceeding, it creates an empty <lockname>.0 file to
     * designate the current game.
     * getlock() constructs <lockname> based on the character
     * name (for !gl.locknum) or on first available of alock, block,
     * clock, &c not currently in use in the playground directory
     * (for gl.locknum > 0).
     */
    if(C.cell(C.field(C.svp,"instance_globals_saved_p","plname").address,"char").value) {
        C.getlock();
        (C.field(C.program_state,"sinfo","preserve_locks").value=0);
        /* after getlock() */
    }
    if(Number(!!(C.i32(C.cell(C.field(C.svp,"instance_globals_saved_p","plname").address,"char").value)&&Number(((nhfp=C.restore_saved_game()))!=0)))) {
        let fq_save=C.fqname(C.field(C.gs,"instance_globals_s","SAVEF").address,2,1);
        C.chmod(fq_save,C.u32(0));
        /* disallow parallel restores */
        C.teleport_native_signal(2,C.functionAddress("done1"));
        if(C.field(C.iflags,"instance_flags","news").value) {
            C.callback(1,(C.field(C.windowprocs,"window_procs","win_display_file").value),C.literal("news"),(C.i8(0)));
            (C.field(C.iflags,"instance_flags","news").value=(C.i8(0)));
            /* in case dorecover() fails */
        }
        /* if there are early trouble-messages issued, let's
         * not go overtop of them with a pline just yet */
        if(C.field(C.ge,"instance_globals_e","early_raw_messages").value) C.callback(2,(C.field(C.windowprocs,"window_procs","win_raw_print").value),C.literal("Restoring save file..."));
 else C.variadic(0,C.literal("Restoring save file..."));
        C.callback(3,(C.field(C.windowprocs,"window_procs","win_mark_synch").value));
        /* flush output */
        if(C.dorecover(nhfp)) {
            (resuming=(C.i8(1)));
            /* not starting new game */
            wd_message();
            if(Number(!!(C.i32(C.field(C.flags,"flag","explore").value)||C.i32(C.field(C.flags,"flag","debug").value)))) {
                /* this seems like a candidate for paranoid_confirmation... */
                if(Number(C.i32(C.yn_function(C.literal("Do you want to keep the save file?"),C.ynchars,C.i8(110),(C.i8(1))))==110)) {
                    C.delete_savefile();
                } else {
                    C.chmod(fq_save,C.u32(432));
                    /* back to readable */
                    C.nh_compress(fq_save);
                }
            }
        }
        if(C.field(C.program_state,"sinfo","in_self_recover").value) {
            (C.field(C.program_state,"sinfo","in_self_recover").value=C.i32((C.i8(0))));
        }
    }
    if(Number(!(resuming))) {
        let neednewlock=C.i8((Number(!(C.cell(C.field(C.svp,"instance_globals_saved_p","plname").address,"char").value))));
        /* new game:  start by choosing role, race, etc;
           player might change the hero's name while doing that,
           in which case we try to restore under the new name
           and skip selection this time if that didn't succeed */
        if(Number(!!(Number(!!(Number(!(C.field(C.iflags,"instance_flags","renameinprogress").value))||C.i32(C.field(C.iflags,"instance_flags","defer_plname").value)))||C.i32(neednewlock)))) {
            if(Number(!(plsel_once))) C.callback(4,(C.field(C.windowprocs,"window_procs","win_player_selection").value));
            (plsel_once=(C.i8(1)));
            if(Number(!!(C.i32(neednewlock)&&C.i32(C.cell(C.field(C.svp,"instance_globals_saved_p","plname").address,"char").value)))) continue attempt_restore; /* original goto */
            if(C.field(C.iflags,"instance_flags","renameinprogress").value) {
                /* player has renamed the hero while selecting role;
                   if locking alphabetically, the existing lock file
                   can still be used; otherwise, discard current one
                   and create another for the new character name */
                if(Number(!(C.field(C.gl,"instance_globals_l","locknum").value))) {
                    C.delete_levelfile(0);
                    /* remove empty lock file */
                    C.getlock();
                }
                continue attempt_restore; /* original goto */
            }
        }
        /* no save file; check for a panic save; if the check finds one,
           ask the player whether to proceed with a new game; it will
           quit instead of returning if the answer isn't yes */
        if(C.check_panic_save()) C.ask_about_panic_save();
        /* no save file; start a new game */
        C.newgame();
        wd_message();
    }
    break;
    } /* end source restore retry region */
    /* moveloop() never returns but isn't flagged NORETURN */
    C.moveloop(resuming);
    C.exit(0);
    /*NOTREACHED*/
    return 0;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* caveat: argv elements might be arbitrarily long */
export function process_options(argc,argv)
{
    argc=C.i32(argc);
    argv=C.ptr(argv);
    let arg; let origarg;
    let i; let l;
    C.config_error_init((C.i8(0)),C.literal("command line"),(C.i8(0)));
    /*
     * Process options.
     *
     *  We don't support "-xyz" as shortcut for "-x -y -z" and we only
     *  simulate longopts by allowing "--foo" for "-foo" when the user
     *  specifies at least 2 characters of leading substring for "foo".
     *  If "foo" takes a value, both "--foo=value" and "--foo value" work.
     */
    while(Number(!!(Number(argc>1)&&Number(C.i32(C.cell((C.cell((argv+Number(1)*8),"char *").value+Number(0)*1),"char").value)==45)))) {
        (()=>{const old=argv;argv=C.ptr((old+Number(8)));return old;})();
        (()=>{const old=argc;argc=C.i32((old-1));return old;})();
        (arg=(origarg=C.cell((argv+Number(0)*8),"char *").value));
        /* allow second dash if arg is longer than one character */
        if(Number(!!(Number(!!(Number(!!(Number(C.i32(C.cell((arg+Number(0)*1),"char").value)==45)&&Number(C.i32(C.cell((arg+Number(1)*1),"char").value)==45)))&&Number(C.i32(C.cell((arg+Number(2)*1),"char").value)!=0)))&&(Number(!!(Number(!!(Number(C.i32(C.cell((arg+Number(3)*1),"char").value)!=0)&&Number(C.i32(C.cell((arg+Number(3)*1),"char").value)!=61)))&&Number(C.i32(C.cell((arg+Number(3)*1),"char").value)!=58))))))) (()=>{const old=arg;arg=C.ptr((old+Number(1)));return arg;})();
        /* "--a=b" violates the "--" ok when at least 2 chars long rule */
        (l=C.i32(C.strlen(arg)));
        if(Number(!!(Number(l<6)&&Number(!(C.strncmp(arg,C.literal("-no-"),C.u64(4))))))) (l=6);
 else if(Number(l<4)) (l=4);
        /* must supply at least 4 chars to match "-XXXgraphics" */
        switch(C.i32(C.cell((arg+Number(1)*1),"char").value)) {
            case (68):
                case (100):
                    if(Number(!!((Number(!!(Number(C.i32(C.cell((arg+Number(1)*1),"char").value)==68)&&Number(!(C.cell((arg+Number(2)*1),"char").value)))))||Number(!(C.strncmpi((arg),(C.literal("-debug")),C.i32((-1)))))))) {
                        ((C.field(C.flags,"flag","debug").value=(C.i8(1))),(C.field(C.flags,"flag","explore").value=(C.i8(0))));
                    } else if(Number(!(C.strncmpi(arg,C.literal("-DECgraphics"),l)))) {
                        C.load_symset(C.literal("DECGraphics"),C.PRIMARYSET);
                        C.switch_symbols(C.i32((C.i8(1))));
                    } else {
                        C.variadic(1,C.literal("Unknown option: %.60s"),origarg);
                    }
            break;
            case (88):
                ((C.field(C.flags,"flag","explore").value=(C.i8(1))),(C.field(C.flags,"flag","debug").value=(C.i8(0))));
            break;
            case (110):
                if(Number(!!(Number(!(C.cell((arg+Number(2)*1),"char").value))||Number(!(C.strcmp(arg,C.literal("-no-news"))))))) {
                    (C.field(C.iflags,"instance_flags","news").value=(C.i8(0)));
                    break;
                } else if(Number(!(C.strcmp(arg,C.literal("-news"))))) {
                    /* in case RC has !news, allow 'nethack -news' to override */
                    (C.field(C.iflags,"instance_flags","news").value=(C.i8(1)));
                    break;
                }
            break;
            case (117):
                if(C.cell((arg+Number(2)*1),"char").value) {
                    C.strncpy(C.field(C.svp,"instance_globals_saved_p","plname").address,(arg+Number(2)*1),C.u64((BigInt((1*32))-C.u64(1))));
                    (C.field(C.gp,"instance_globals_p","plnamelen").value=0);
                    /* plname[] might have -role-race attached */
                } else if(Number(argc>1)) {
                    (()=>{const old=argc;argc=C.i32((old-1));return old;})();
                    (()=>{const old=argv;argv=C.ptr((old+Number(8)));return old;})();
                    C.strncpy(C.field(C.svp,"instance_globals_saved_p","plname").address,C.cell((argv+Number(0)*8),"char *").value,C.u64((BigInt((1*32))-C.u64(1))));
                    (C.field(C.gp,"instance_globals_p","plnamelen").value=0);
                } else {
                    C.variadic(2,C.literal("Character name expected after -u"));
                }
            break;
            case (73):
                case (105):
                    if(Number(!(C.strncmpi(arg,C.literal("-IBMgraphics"),l)))) {
                        C.load_symset(C.literal("IBMGraphics"),C.PRIMARYSET);
                        C.load_symset(C.literal("RogueIBM"),C.ROGUESET);
                        C.switch_symbols(C.i32((C.i8(1))));
                    } else {
                        C.variadic(3,C.literal("Unknown option: %.60s"),origarg);
                    }
            break;
            case (108):
                if(Number(!(C.strncmp(arg,C.literal("-loglua"),C.u64(7))))) {
                    (C.field(C.gl,"instance_globals_l","loglua").value=1);
                } else C.variadic(4,C.literal("Unknown option: %.60s"),origarg);
            break;
            case (112):
                /* profession (role) */
                if(C.cell((arg+Number(2)*1),"char").value) {
                    if(Number(((i=C.str2role((arg+Number(2)*1))))>=0)) (C.field(C.flags,"flag","initrole").value=i);
                } else if(Number(argc>1)) {
                    (()=>{const old=argc;argc=C.i32((old-1));return old;})();
                    (()=>{const old=argv;argv=C.ptr((old+Number(8)));return old;})();
                    if(Number(((i=C.str2role(C.cell((argv+Number(0)*8),"char *").value)))>=0)) (C.field(C.flags,"flag","initrole").value=i);
                }
            break;
            case (114):
                /* race */
                if(C.cell((arg+Number(2)*1),"char").value) {
                    if(Number(((i=C.str2race((arg+Number(2)*1))))>=0)) (C.field(C.flags,"flag","initrace").value=i);
                } else if(Number(argc>1)) {
                    (()=>{const old=argc;argc=C.i32((old-1));return old;})();
                    (()=>{const old=argv;argv=C.ptr((old+Number(8)));return old;})();
                    if(Number(((i=C.str2race(C.cell((argv+Number(0)*8),"char *").value)))>=0)) (C.field(C.flags,"flag","initrace").value=i);
                }
            break;
            case (64):
                (C.field(C.flags,"flag","randomall").value=1);
            break;
            case (45):
                /* "--" or "--x" or "--x=y"; need at least 2 chars after the
               dashes in order to accept "--x" as an alternative to "-x";
               don't just silently ignore it */
                C.variadic(5,C.literal("Unknown option: %.60s"),origarg);
            break;
            default:
                /* default for "-x" is to play as the role that starts with "x" */
                if(Number(((i=C.str2role((C.cell((argv+Number(0)*8),"char *").value+Number(1)*1))))>=0)) {
                    (C.field(C.flags,"flag","initrole").value=i);
                    break;
                }
            /* else config_error_add("Unknown option: %.60s", origarg); */
        }
    }
    if(Number(argc>1)) {
        let mxplyrs=C.atoi(C.cell((argv+Number(1)*8),"char *").value);
        let mx_ok=C.i8((Number(mxplyrs>0)));
        C.variadic(6,C.literal("%s%s%s"),(C.i32(mx_ok)?C.literal("MAXPLAYERS are set in sysconf file"):C.literal("Expected MAXPLAYERS, found \"")),(C.i32(mx_ok)?C.literal(""):C.cell((argv+Number(1)*8),"char *").value),(C.i32(mx_ok)?C.literal(""):C.literal("\"")));
        /* XXX This is deprecated in favor of SYSCF with MAXPLAYERS */
    }
    /* limit to compile-time limit */
    /* let syscf override compile-time limit */
    if(Number(!!(Number(!(C.field(C.gl,"instance_globals_l","locknum").value))||(Number(!!(C.field(C.sysopt,"sysopt_s","maxplayers").value&&Number(C.field(C.gl,"instance_globals_l","locknum").value>C.field(C.sysopt,"sysopt_s","maxplayers").value))))))) (C.field(C.gl,"instance_globals_l","locknum").value=C.field(C.sysopt,"sysopt_s","maxplayers").value);
    /* empty or "N errors on command line" */
    C.config_error_done();
    return;
}

export function chdirx(dir,wr)
{
    dir=C.ptr(dir);
    wr=C.i8(wr);
    if(Number(!!(dir&&C.strcmp(dir,C.literal("/usr/games/lib/nethackdir"))))) {
        /* User specified directory? */
        /* and not the default? */
        /* Ron Wessels */
    } else {
        /* non-default data files is a sign that scores may not be
         * compatible, or perhaps that a binary not fitting this
         * system's layout is being used.
         */
        /* FIXME: this allocation never gets freed.
         */
    }
    if(Number(!(dir))) (dir=C.literal("/usr/games/lib/nethackdir"));
    if(Number(!!(dir&&Number(C.chdir(dir)<0)))) {
        C.perror(dir);
        C.variadic(7,C.literal("Cannot chdir to %s."),dir);
        /*NOTREACHED*/
    }
    /* warn the player if we can't write the record file
     * perhaps we should also test whether . is writable
     * unfortunately the access system-call is worthless.
     */
    if(wr) {
        /* FIXME: if termination cleanup ever frees fqn_prefix[0..N-1],
         * these will need to use dupstr() so that they have distinct
         * values that can be freed separately.  Or perhaps freeing
         * fqn_prefix[j] can check [j+1] through [N-1] for duplicated
         * pointer and just set the value to Null.
         */
        C.check_recordfile(dir);
    }
    return;
}

/* CHDIR */
/* returns True iff we set plname[] to username which contains a hyphen */
export function whoami()
{
    /*
     * Who am i? Algorithm: 1. Use name as specified in NETHACKOPTIONS
     *                      2. Use $USER or $LOGNAME    (if 1. fails)
     *                      3. Use getlogin()           (if 2. fails)
     * The resulting name is overridden by command line options.
     * If everything fails, or if the resulting name is some generic
     * account like "games", "play", "player", "hack" then eventually
     * we'll ask him.
     * Note that we trust the user here; it is possible to play under
     * somebody else's name.
     */
    if(Number(!(C.cell(C.field(C.svp,"instance_globals_saved_p","plname").address,"char").value))) {
        let s;
        (s=C.nh_getenv(C.literal("USER")));
        if(Number(!!(Number(!(s))||Number(!(C.cell(s,"char").value))))) (s=C.nh_getenv(C.literal("LOGNAME")));
        if(Number(!!(Number(!(s))||Number(!(C.cell(s,"char").value))))) (s=C.getlogin());
        if(Number(!!(s&&C.i32(C.cell(s,"char").value)))) {
            C.strncpy(C.field(C.svp,"instance_globals_saved_p","plname").address,s,C.u64((BigInt((1*32))-C.u64(1))));
            if(C.strchr(C.field(C.svp,"instance_globals_saved_p","plname").address,45)) return (C.i8(1));
        }
    }
    return (C.i8(0));
}

export function sethanguphandler(handler)
{
    handler=C.ptr(handler);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["sethanguphandler.sact@19471",C.sizes["struct sigaction"]]]);
    try {
    /* don't want reads to restart.  If SA_RESTART is defined, we know
     * sigaction exists and can be used to ensure reads won't restart.
     * If it's not defined, assume reads do not restart.  If reads restart
     * and a signal occurs, the game won't do anything until the read
     * succeeds (or the stream returns EOF, which might not happen if
     * reading from, say, a window manager). */
    let sact=C.automatic("sethanguphandler.sact@19471",C.sizes["struct sigaction"]);
    C.memset(sact,0,BigInt(C.sizes["struct sigaction"]));
    (C.field(C.field(sact,"sigaction","__sa_handler").address,"anonymous_14","sa_handler").value=handler);
    C.sigaction(1,sact,0);
    C.sigaction(24,sact,0);
    /* !SA_RESTART */
    /* ?SA_RESTART */
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/*
     * Display unix-specific help.   Just show contents of the helpfile
     * named by PORT_HELP.
     */
/* validate wizard mode if player has requested access to it */
export function authorize_wizard_mode()
{
    if(Number(!!(C.field(C.sysopt,"sysopt_s","wizards").value&&C.i32(C.cell((C.field(C.sysopt,"sysopt_s","wizards").value+Number(0)*1),"char").value)))) {
        if(check_user_string(C.field(C.sysopt,"sysopt_s","wizards").value)) return (C.i8(1));
    }
    (C.field(C.iflags,"instance_flags","wiz_error_flag").value=(C.i8(1)));
    /* not being allowed into wizard mode */
    return (C.i8(0));
}

/* similar to above, validate explore mode access */
export function authorize_explore_mode()
{
    if(Number(!!(C.field(C.sysopt,"sysopt_s","explorers").value&&C.i32(C.cell((C.field(C.sysopt,"sysopt_s","explorers").value+Number(0)*1),"char").value)))) {
        if(check_user_string(C.field(C.sysopt,"sysopt_s","explorers").value)) return (C.i8(1));
    }
    (C.field(C.iflags,"instance_flags","explore_error_flag").value=(C.i8(1)));
    /* not allowed into explore mode */
    return (C.i8(0));
    /* if sysconf disabled, no restrictions on explore mode */
}

export function wd_message()
{
    if(C.field(C.iflags,"instance_flags","wiz_error_flag").value) {
        if(Number(!!(C.field(C.sysopt,"sysopt_s","wizards").value&&C.i32(C.cell((C.field(C.sysopt,"sysopt_s","wizards").value+Number(0)*1),"char").value)))) {
            let tmp=C.build_english_list(C.field(C.sysopt,"sysopt_s","wizards").value);
            C.variadic(8,C.literal("Only user%s %s may access debug (wizard) mode."),(C.strchr(C.field(C.sysopt,"sysopt_s","wizards").value,32)?C.literal("s"):C.literal("")),tmp);
            C.free(tmp);
        } else {
            C.variadic(9,C.literal("cannot access debug (wizard) mode."));
        }
        (C.field(C.flags,"flag","debug").value=(C.i8(0)));
        /* (paranoia) */
        if(Number(!(C.field(C.iflags,"instance_flags","explore_error_flag").value))) C.variadic(10,C.literal("Entering explore/discovery mode instead."));
    } else if(C.field(C.iflags,"instance_flags","explore_error_flag").value) {
        C.variadic(11,C.literal("cannot access explore mode."));
        /* same as enter_explore_mode */
        (C.field(C.flags,"flag","explore").value=(C.field(C.iflags,"instance_flags","deferred_X").value=(C.i8(0))));
        /* (more paranoia) */
    } else if(C.field(C.flags,"flag","explore").value) C.variadic(12,C.literal("are in non-scoring explore/discovery mode."));
}

/*
 * Add a slash to any name not ending in /. There must
 * be room for the /
 */
export function append_slash(name)
{
    name=C.ptr(name);
    let ptr;
    if(Number(!(C.cell(name,"char").value))) return;
    (ptr=(name+Number((C.u64((C.strlen(name)-C.u64(1)))))*1));
    if(Number(C.i32(C.cell(ptr,"char").value)!=47)) {
        (C.cell((()=>{const old=ptr;ptr=C.ptr((old+Number(1)));return ptr;})(),"char").value=C.i8(47));
        (C.cell((()=>{const old=ptr;ptr=C.ptr((old+Number(1)));return ptr;})(),"char").value=C.i8(0));
    }
    return;
}

export function check_user_string(optstr)
{
    optstr=C.ptr(optstr);
    let pw;
    let pwlen;
    let eop; let w;
    let pwname=0;
    if(Number(C.i32(C.cell((optstr+Number(0)*1),"char").value)==42)) return (C.i8(1));
    /* allow any user */
    if(C.field(C.sysopt,"sysopt_s","check_plname").value) (pwname=C.field(C.svp,"instance_globals_saved_p","plname").address);
 else if(Number(((pw=get_unix_pw()))!=0)) (pwname=C.field(pw,"passwd","pw_name").value);
    if(Number(!!(Number(!(pwname))||Number(!(C.cell(pwname,"char").value))))) return (C.i8(0));
    (pwlen=C.i32(C.strlen(pwname)));
    (eop=C.eos(optstr));
    /* temporarily cast away 'const' */
    (w=optstr);
    while(Number((w+Number(pwlen)*1)<=eop)) {
        if(Number(!(C.cell(w,"char").value))) break;
        if(C.__isspace(C.i32(C.cell(w,"char").value))) {
            (()=>{const old=w;w=C.ptr((old+Number(1)));return old;})();
            continue;
        }
        if(Number(!(C.strncmp(w,pwname,C.u64(pwlen))))) {
            if(Number(!!(Number(!(C.cell((w+Number(pwlen)*1),"char").value))||C.__isspace(C.i32(C.cell((w+Number(pwlen)*1),"char").value))))) return (C.i8(1));
        }
        while(Number(!!(C.i32(C.cell(w,"char").value)&&Number(!(C.__isspace(C.i32(C.cell(w,"char").value))))))) (()=>{const old=w;w=C.ptr((old+Number(1)));return old;})();

    }
    return (C.i8(0));
}

export function get_unix_pw()
{
    /* Emscripten passwd lookups are ENOENT stubs. Supply the virtual
     * Unix account used by the recorder; keep sysconf authorization. */
    
    return C.staticAddress("get_unix_pw.virtual_user");
    let user;
    let uid;
    
    if(C.cell(C.staticAddress("get_unix_pw.pw"),"struct passwd *").value) return C.cell(C.staticAddress("get_unix_pw.pw"),"struct passwd *").value;
    /* cache answer */
    (uid=C.getuid());
    (user=C.getlogin());
    if(user) {
        (C.cell(C.staticAddress("get_unix_pw.pw"),"struct passwd *").value=C.getpwnam(user));
        if(Number(!!(C.cell(C.staticAddress("get_unix_pw.pw"),"struct passwd *").value&&(Number(C.field(C.cell(C.staticAddress("get_unix_pw.pw"),"struct passwd *").value,"passwd","pw_uid").value!=uid))))) (C.cell(C.staticAddress("get_unix_pw.pw"),"struct passwd *").value=0);
    }
    if(Number(C.cell(C.staticAddress("get_unix_pw.pw"),"struct passwd *").value==0)) {
        (user=C.nh_getenv(C.literal("USER")));
        if(user) {
            (C.cell(C.staticAddress("get_unix_pw.pw"),"struct passwd *").value=C.getpwnam(user));
            if(Number(!!(C.cell(C.staticAddress("get_unix_pw.pw"),"struct passwd *").value&&(Number(C.field(C.cell(C.staticAddress("get_unix_pw.pw"),"struct passwd *").value,"passwd","pw_uid").value!=uid))))) (C.cell(C.staticAddress("get_unix_pw.pw"),"struct passwd *").value=0);
        }
        if(Number(C.cell(C.staticAddress("get_unix_pw.pw"),"struct passwd *").value==0)) {
            (C.cell(C.staticAddress("get_unix_pw.pw"),"struct passwd *").value=C.getpwuid(uid));
        }
    }
    return C.cell(C.staticAddress("get_unix_pw.pw"),"struct passwd *").value;
}

export function get_login_name()
{
    
    let pw=get_unix_pw();
    (C.cell((C.staticAddress("get_login_name.buf")+Number(0)*1),"char").value=C.i8(0));
    if(pw) C.strcpy(C.staticAddress("get_login_name.buf"),C.field(pw,"passwd","pw_name").value);
    return C.staticAddress("get_login_name.buf");
}

/* This should be replaced when there is a Cocoa port. */
/* Remove the trailing \n, carefully. */
/* XXX Sorry, I'm too lazy to write a loop for output this short. */
/* __APPLE__ */
export function sys_random_seed()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["sys_random_seed.seed@25200",8]]);
    try {
    /* Harness comparison testing: if NETHACK_SEED is set, use it directly.
     * Leave has_strong_rngseed false so reseed_random() remains a no-op. */
{
        let env_seed=C.getenv(C.literal("NETHACK_SEED"));
        if(env_seed) {
            let seed=C.strtoul(env_seed,0,10);
            return seed;
        }
    }    let seed=C.local("sys_random_seed.seed@25200","unsigned long",C.u64(0n));
    let pid=C.u64(C.getpid());
    let no_seed=(C.i8(1));
    let fptr;
    (fptr=C.fopen(C.literal("/dev/random"),C.literal("r")));
    if(fptr) {
        C.fread(seed.address,BigInt(8),C.u64(1),fptr);
        (C.global("has_strong_rngseed").value=(C.i8(1)));
        /* decl.c */
        (no_seed=(C.i8(0)));
        C.fclose(fptr);
    } else {
        /* leaves clue, doesn't exit */
        C.paniclog(C.literal("sys_random_seed"),C.literal("falling back to weak seed"));
    }
    if(no_seed) {
        (seed.value=C.u64(C.getnow()));
        /* time((TIME_type) 0) */
        /* Quick dirty band-aid to prevent PRNG prediction */
        if(pid) {
            if(Number(!((C.u64((pid&C.u64(3n))))))) (pid=C.u64(pid-C.u64(1n)));
            (seed.value=C.u64(seed.value*pid));
        }
    }
    return seed.value;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* sys/unix/macuuid.m */
export function get_nhuuid()
{
    /* MACOS || LINUX */
    /* NHUUID */
}

export function free_nhuuid()
{
    let i;
    for((i=0);Number(i<C.i32((C.u64((BigInt((1*37))/BigInt(1))))));(()=>{const old=i;i=C.i32((old+1));return old;})()) {
        (C.cell((C.field(C.svn,"instance_globals_saved_n","nhuuid").address+Number(i)*1),"char").value=C.i8(0));
    }
}

/*unixmain.c*/
export const unixmainStaticInitializers = C => [
    {name:"get_unix_pw.virtual_user",type:"struct passwd",size:C.sizes["struct passwd"],values:[C.literal("root"),0,C.u32(0),C.u32(0),0,C.literal("/home/player"),C.literal("/bin/sh")]},
    {name:"get_unix_pw.pw",type:"struct passwd *",size:8,values:0},
    {name:"get_login_name.buf",type:"char[256]",size:(1*256),values:null},
];
