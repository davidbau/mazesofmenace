import { C } from './c-runtime.js';

/* NetHack 5.0	earlyarg.c	$NHDT-Date: 1771213100 2026/02/15 19:38:20 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.286 $ */
/* Copyright (c) Robert Patrick Rankin, 2012. */
/* NetHack may be freely redistributed.  See license for details. */




/*
 * Argument processing helpers - for xxmain() to share
 * and call.
 *
 * These should return TRUE if the argument matched,
 * whether the processing of the argument was
 * successful or not.
 *
 * Most of these do their thing, then after returning
 * to xxmain(), the code exits without starting a game.
 *
 */

export const earlyopts = [
    { e: "ARG_DEBUG", name: "debug", minlength: 5, valallowed: 1 },
    { e: "ARG_VERSION", name: "version", minlength: 4, valallowed: 1 },
    { e: "ARG_SHOWPATHS", name: "showpaths", minlength: 8, valallowed: 0 },
    { e: "ARG_DUMPENUMS", name: "dumpenums", minlength: 9, valallowed: 0 },
    { e: "ARG_DUMPGLYPHIDS", name: "dumpglyphids", minlength: 12, valallowed: 0 },
    { e: "ARG_DUMPMONGEN", name: "dumpmongen", minlength: 10, valallowed: 0 },
    { e: "ARG_DUMPWEIGHTS", name: "dumpweights", minlength: 11, valallowed: 0 },
    { e: "ARG_BIDSHOW", name: "bidshow", minlength: 7, valallowed: 0 },
];

export const ArgVal_novalue_initial = "[nothing]"; /* note: not 'const' */

const ArgValRequired = 0, ArgValOptional = 1, ArgValDisallowed = 2,
      ArgVal_mask = (1 | 2), ArgNamOneLetter = 4, ArgNam_mask = 4,
      ArgErrSilent = 0, ArgErrComplain = 8, ArgErr_mask = 8;

/* approximate 'getopt_long()' for one option; all the comments refer to
   "-windowtype" but the code isn't specific to that  */
export function lopt(arg, lflags, optname, origarg, argc_p, argv_p)
/* command line token; beginning matches 'optname' */
/* cmdlinearg | errorhandling */
/* option's name; "-windowtype" in examples below */
/* 'arg' might have had a dash prefix removed */
/* argc that can have changes passed to caller */
/* argv[] ditto */
{
    optname = C.charPointer(optname);
    let argc = argc_p.value;
    let argv = argv_p.value;
    let p, nextarg = (argc > 1 && C.loadChar(argv[1]) != 45) ? argv[1] : 0;
    let l, opttype = (lflags & ArgVal_mask);
    let oneletterok = ((lflags & ArgNam_mask) == ArgNamOneLetter),
        complain = ((lflags & ArgErr_mask) == ArgErrComplain);

    // JS labels retain the three original goto destinations and diagnostics.
    loptbail: {
        loptnotallowed: {
            loptrequired: {
/* first letter must match */
                if (C.loadChar(arg + 1) != C.loadChar(optname + 1))
                    break loptbail;
                if ((p = C.strchr(arg, 61)) == 0)
                    p = C.strchr(arg, 58);
                if (p && opttype == ArgValDisallowed)
                    break loptnotallowed;
                l = C.int(p ? p - arg : C.strlen(arg));
                if ((l > 2 || oneletterok) && !C.strncmp(arg, optname, l)) {
/* "-windowtype[=foo]" */
                    if (p)
/* past '=' or ':' */
                        ++p;
                    else if (opttype == ArgValRequired)
/* we have "-w[indowtype]" w/o "=foo"
                           * so we'll take foo from next element */
                        p = C.eos(arg);
                    else
                        return C.ArgVal_novalue;
                } else if (oneletterok) {
/* "-w..." but not "-w[indowtype[=foo]]" */
                    if (!p) {
/* past 'w' of "-wfoo" */
                        p = arg + 2;
                    } else {
/* "-w...=foo" but not "-w[indowtype]=foo" */
                        break loptbail;
                    }
                } else {
                    break loptbail;
                }
/* "-w[indowtype]" w/o '='/':' if there is a next element, use
           it for "foo"; if not, supply a non-Null bogus value */
                if (!p || !C.loadChar(p)) {
                    if (nextarg
                        && (opttype == ArgValRequired || opttype == ArgValOptional)) {
                        p = nextarg, --argc_p.value;
                        argv_p.value = C.argvAdd(argv_p.value, 1);
                    } else if (opttype == ArgValRequired)
                        break loptrequired;
                    else
/* there is no next element */
                        p = C.ArgVal_novalue;
                }
                return p;
            }
            if (complain)
                C.config_error_add("Missing required value: %.60s", origarg);
            return 0;
        }
        if (complain)
            C.config_error_add("Value not allowed: %.60s", origarg);
        return 0;
    }
    if (complain)
        C.config_error_add("Unknown option: %.60s", origarg);
    return 0;
}
/* move argv[ndx] to end of argv[] array, then reduce argc to hide it;
   prevents process_options() from encountering it after early_options()
   has processed it; elements get reordered but all remain intact */
export function consume_arg(ndx, ac_p, av_p)
{
    let gone, av = av_p.value;
    let i, ac = ac_p.value;

    /* "-one -two -three -four" -> "-two -three -four -one" */
    if (ac > 2) {
        gone = av[ndx];
        for (i = ndx + 1; i < ac; ++i)
            av[i - 1] = av[i];
        av[ac - 1] = gone;
    }
    --(ac_p.value);
}

/* consume two tokens for '-argname value' w/o '=' or ':' */
export function consume_two_args(ndx, ac_p, av_p)
{
    /* when consuming "-two arg" from "-two arg -three -four",
       the *ac_p manipulation results in "-three -four -two arg"
       rather than the "-three -four arg -two" that would happen
       with just two ordinary consume_arg() calls */
    consume_arg(ndx, ac_p, av_p);
    ++(ac_p.value); /* bring the final slot back into view */
    consume_arg(ndx, ac_p, av_p);
    --(ac_p.value); /* take away restored slot */
}

/* process some command line arguments before loading options */
export function early_options(argc_p, argv_p, hackdir_p)
{
    let argv = { value: C.argv(0) }, arg, origarg;
    let argc = { value: 0 }, oldargc, ndx = 0, consumed = 0;

    if (argcheck(argc_p.value, argv_p.value, C.ARG_DUMPGLYPHIDS) == 2)
        opt_terminate();

    C.config_error_init(0, "command line", 0);

    /* treat "nethack ?" as a request for usage info; due to shell
       processing, player likely has to use "nethack \?" or "nethack '?'"
       [won't work if used as "nethack -dpath ?" or "nethack -d path ?"] */
    if (argc_p.value > 1 && !C.strcmp((argv_p.value)[1], "?"))
        opt_usage(hackdir_p.value); /* doesn't return */

    /*
     * Both *argc_p and *argv_p account for the program name as (*argv_p)[0];
     * local argc and argv implicitly discard that (by starting 'ndx' at 1).
     * argcheck() doesn't mind, prscore() (via scores_only()) does (for the
     * number of args it gets passed, not for the value of argv[0]).
     */
    for (ndx = 1; ndx < argc_p.value; ndx += (consumed ? 0 : 1)) {
        consumed = 0;
        argc.value = argc_p.value - ndx;
        argv.value = C.argvAdd(argv_p.value, ndx);

        arg = origarg = argv.value[0];
        /* skip any args intended for deferred options */
        if (C.loadChar(arg) != 45)
            continue;
        /* allow second dash if arg name is longer than one character */
        if (C.loadChar(arg + 0) == 45 && C.loadChar(arg + 1) == 45 && C.loadChar(arg + 2) != 0
            && (C.loadChar(arg + 3) != 0 && C.loadChar(arg + 3) != 61 && C.loadChar(arg + 3) != 58))
            ++arg;

        switch (C.loadChar(arg + 1)) { /* char after leading dash */
        case 98:
            // --bidshow
            if (argcheck(argc.value, argv.value, C.ARG_BIDSHOW) == 2) {
                opt_terminate();
                /*NOTREACHED*/
            }
            break;
        case 100:
            if (argcheck(argc.value, argv.value, C.ARG_DEBUG) == 1) {
                consume_arg(ndx, argc_p, argv_p), consumed = 1;
            } else if (argcheck(argc.value, argv.value, C.ARG_DUMPENUMS) == 2) {
                opt_terminate();
                /*NOTREACHED*/
            } else if (argcheck(argc.value, argv.value, C.ARG_DUMPMONGEN) == 2) {
                opt_terminate();
                /*NOTREACHED*/
            } else if (argcheck(argc.value, argv.value, C.ARG_DUMPWEIGHTS) == 2) {
                opt_terminate();
                /*NOTREACHED*/
            } else {
                oldargc = argc.value;
                arg = lopt(arg,
                           (ArgValRequired | ArgNamOneLetter | ArgErrSilent),
                           "-directory", origarg, argc, argv);
                if (!arg)
                    C.error("Flag -d must be followed by a directory name.");
                if (C.loadChar(arg) != 101) { /* avoid matching -decgraphics or -debug */
                    hackdir_p.value = arg;
                    if (oldargc == argc.value)
                        consume_arg(ndx, argc_p, argv_p), consumed = 1;
                    else
                        consume_two_args(ndx, argc_p, argv_p), consumed = 2;
                }
            }
            break;
        case 104:
        case 63:
            if (lopt(arg, ArgValDisallowed, "-help", origarg, argc, argv)
                || lopt(arg, ArgValDisallowed | ArgNamOneLetter, "-?",
                        origarg, argc, argv))
                opt_usage(hackdir_p.value); /* doesn't return */
            break;
        case 110:
            oldargc = argc.value;
            if (!C.strcmp(arg, "-no-nethackrc")) /* no abbreviation allowed */
                arg = C.literal("/dev/null");
            else
                arg = lopt(arg, (ArgValRequired | ArgErrComplain),
                           "-nethackrc", origarg, argc, argv);
            if (arg) {
                C.gc.cmdline_rcfile = C.dupstr(arg);
                if (oldargc == argc.value)
                    consume_arg(ndx, argc_p, argv_p), consumed = 1;
                else
                    consume_two_args(ndx, argc_p, argv_p), consumed = 2;
            }
            break;
        case 115:
            if (argcheck(argc.value, argv.value, C.ARG_SHOWPATHS) == 2) {
                C.gd.deferred_showpaths = 1;
                C.gd.deferred_showpaths_dir = hackdir_p.value;
                C.config_error_done();
                return;
            }
            /* check for "-s" request to show scores */
            if (lopt(arg,
                     ((ArgValDisallowed | ArgErrComplain)
                      /* only accept one-letter if there is just one
                         dash; reject "--s" because prscore() via
                         scores_only() doesn't understand it */
                      | ((C.loadChar(origarg + 1) != 45) ? ArgNamOneLetter : 0)),
                     /* [ought to omit val-disallowed and accept
                        --scores=foo since -s foo and -sfoo are
                        allowed, but -s form can take more than one
                        space-separated argument and --scores=foo
                        isn't suited for that] */
                     "-scores", origarg, argc, argv)) {
                /* at this point, argv[0] contains "-scores" or a leading
                   substring of it; prscore() (via scores_only()) expects
                   that to be in argv[1] so we adjust the pointer to make
                   that be the case; if there are any non-early args waiting
                   to be passed along to process_options(), the resulting
                   argv[0] will be one of those rather than the program
                   name but prscore() doesn't care */
                scores_only(argc.value + 1, C.argvAdd(argv.value, -1), hackdir_p.value);
                /*NOTREACHED*/
            }
            break;
        case 117:
            if (lopt(arg, ArgValDisallowed, "-usage", origarg, argc, argv))
                opt_usage(hackdir_p.value);
            break;
        case 118:
            if (argcheck(argc.value, argv.value, C.ARG_VERSION) == 2) {
                opt_terminate();
                /*NOTREACHED*/
            }
            break;
        case 119: /* windowtype: "-wfoo" or "-w[indowtype]=foo"
                   * or "-w[indowtype]:foo" or "-w[indowtype] foo" */
            arg =
                lopt(arg, (ArgValRequired | ArgNamOneLetter | ArgErrComplain),
                     "-windowtype", origarg, argc, argv);
            if (C.gc.cmdline_windowsys)
                C.free( C.gc.cmdline_windowsys);
            C.gc.cmdline_windowsys = arg ? C.dupstr(arg) : 0;
            break;
        default:
            break;
        }
    }
    /* empty or "N errors on command line" */
    C.config_error_done();
    return;
}
/* for command-line options that perform some immediate action and then
   terminate the program without starting play, like 'nethack --version'
   or 'nethack -s Zelda'; do some cleanup before that termination */
export function opt_terminate()
{
    C.program_state.early_options = 0;
    C.config_error_done(); /* free memory allocated by config_error_init() */

    C.nh_terminate(0);
    /*NOTREACHED*/
}

export function opt_usage(hackdir)
{
    C.chdirx(hackdir, 1);
    1; /* DLB-disabled header macro: dlb_init() expands to 1. */

    C.genl_display_file(C.USAGEHELP, 1);
    opt_terminate();
}
/* show the sysconf file name, playground directory, run-time configuration
   file name, dumplog file name if applicable, and some other things */
export function after_opt_showpaths(dir)
{
    C.chdirx(dir, 0);
    opt_terminate();
    /*NOTREACHED*/
}

/* handle "-s <score options> [character-names]" to show all the entries
   in the high scores file ('record') belonging to particular characters;
   nethack will end after doing so without starting play */
export function scores_only(argc, argv, dir)
{
    /* do this now rather than waiting for final termination, in case there
       is an error summary coming */
    C.config_error_done();

    C.chdirx(dir, 0);
    C.iflags.initoptions_noterminate = 1;
    C.initoptions(); /* sysconf options affect whether panictrace is enabled */
    C.iflags.initoptions_noterminate = 0;
    C.ARGV0 = C.gh.hname; /* save for possible stack trace */
    C.panictrace_setsignals(1);
     C.whoami(); /* set up default plname[] */
    C.prscore(argc, argv);

    C.nh_terminate(0); /* bypass opt_terminate() */
    /*NOTREACHED*/
}

/*
 * Returns:
 *    0 = no match
 *    1 = found and skip past this argument
 *    2 = found and trigger immediate exit
 */
export function argcheck(argc, argv, e_arg)
{
    const earlyopts = C.earlyopts;
    let i, idx;
    let match = 0;
    let userea = 0;
    let dashdash = "";

    for (idx = 0; idx < earlyopts.length; idx++) {
        if (earlyopts[idx].e == e_arg){
            break;
        }
    }
    if (idx >= earlyopts.length || argc < 1)
        return 0;

    for (i = 0; i < argc; ++i) {
        if (C.loadChar(argv[i]) != 45)
            continue;
        if (C.loadChar(argv[i] + 1) == 45) {
            userea = argv[i] + 2;
            dashdash = "-";
        } else {
            userea = argv[i] + 1;
        }
        match = C.match_optname(userea, earlyopts[idx].name,
                              earlyopts[idx].minlength,
                              earlyopts[idx].valallowed);
        if (match)
            break;
    }

    if (match) {
        let extended_opt = C.strchr(userea, 58);

        if (!extended_opt)
            extended_opt = C.strchr(userea, 61);
        switch(e_arg) {
        case C.ARG_DEBUG:
            if (extended_opt) {
                let cpy_extended_opt;

                cpy_extended_opt = C.dupstr(extended_opt);
                debug_fields(cpy_extended_opt + 1);
                C.free( cpy_extended_opt);
            }
            return 1;
        case C.ARG_VERSION: {
            let insert_into_pastebuf = 0;

            if (extended_opt) {
                extended_opt++;
                    /* Deprecated in favor of "copy" - remove no later
                       than  next major version */
                if (C.match_optname(extended_opt, "paste", 5, 0)) {
                    insert_into_pastebuf = 1;
                } else if (C.match_optname(extended_opt, "copy", 4, 0)) {
                    insert_into_pastebuf = 1;
                } else if (C.match_optname(extended_opt, "dump", 4, 0)) {
                    /* version number plus enabled features and sanity
                       values that the program compares against the same
                       thing recorded in save and bones files to check
                       whether they're being used compatibly */
                    C.dump_version_info();
                    return 2; /* done */
                } else if (!C.match_optname(extended_opt, "show", 4, 0)) {
                    C.raw_printf("-%sversion can only be extended with" +
                               " -%sversion:copy or :dump or :show.\n",
                               dashdash, dashdash);
                    /* exit after we've reported bad command line argument */
                    return 2;
                }
            }
            C.early_version_info(insert_into_pastebuf);
            return 2;
        }
        case C.ARG_SHOWPATHS:
            return 2;
        case C.ARG_DUMPENUMS:
            dump_enums();
            return 2;
        case C.ARG_DUMPGLYPHIDS:
            dump_glyphids();
            return 2;
        case C.ARG_DUMPMONGEN:
            C.dump_mongen();
            return 2;
        case C.ARG_DUMPWEIGHTS:
            C.dump_weights();
            return 2;
        case C.ARG_BIDSHOW:
            C.crashreport_bidshow();
            return 2;
        default:
            break;
        }
    };
    return 0;
}

/*
 * These are internal controls to aid developers with
 * testing and debugging particular aspects of the code.
 * They are not player options and the only place they
 * are documented is right here. No gameplay is altered.
 *
 * test             - test whether this parser is working
 * ttystatus        - TTY:
 * immediateflips   - WIN32: turn off display performance
 *                    optimization so that display output
 *                    can be debugged without buffering.
 * fuzzer           - enable fuzzer without debugger intervention.
 */
export function debug_fields(opts)
{
    let op;
    let negated = 0;

    while ((op = C.strchr(opts, 44)) != 0) {
        C.storeChar(op++, 0);
        /* recurse */
        debug_fields(op);
    }
    if (C.strlen(opts) > C.BUFSZ / 2)
        return;


    /* strip leading and trailing white space */
    while (C.isspace(C.uchar(C.loadChar(opts))))
        opts++;
    op = C.eos( opts);
    while (--op >= opts && C.isspace(C.uchar(C.loadChar(op))))
        C.storeChar(op, 0);

    if (!C.loadChar(opts)) {
        /* empty */
        return;
    }
    while ((C.loadChar(opts) == 33) || !C.strncmpi(opts, "no", 2)) {
        if (C.loadChar(opts) == 33)
            opts++;
        else
            opts += 2;
        negated = !negated;
    }
    if (C.match_optname(opts, "test", 4, 0))
        C.iflags.debug.test = negated ? 0 : 1;
    if (C.match_optname(opts, "ttystatus", 9, 0))
        C.iflags.debug.ttystatus = negated ? 0 : 1;
    if (C.match_optname(opts, "fuzzer", 4, 0))
        C.iflags.fuzzerpending = 1;
    return;
}


/* monsdump[] and objdump[] are also used in utf8map.c */
/* the enums are not part of hack.h for this one */
export const monsdump = [
    { val: "PM_GIANT_ANT", nm: "GIANT_ANT" },
    { val: "PM_KILLER_BEE", nm: "KILLER_BEE" },
    { val: "PM_SOLDIER_ANT", nm: "SOLDIER_ANT" },
    { val: "PM_FIRE_ANT", nm: "FIRE_ANT" },
    { val: "PM_GIANT_BEETLE", nm: "GIANT_BEETLE" },
    { val: "PM_QUEEN_BEE", nm: "QUEEN_BEE" },
    { val: "PM_ACID_BLOB", nm: "ACID_BLOB" },
    { val: "PM_QUIVERING_BLOB", nm: "QUIVERING_BLOB" },
    { val: "PM_GELATINOUS_CUBE", nm: "GELATINOUS_CUBE" },
    { val: "PM_CHICKATRICE", nm: "CHICKATRICE" },
    { val: "PM_COCKATRICE", nm: "COCKATRICE" },
    { val: "PM_PYROLISK", nm: "PYROLISK" },
    { val: "PM_JACKAL", nm: "JACKAL" },
    { val: "PM_FOX", nm: "FOX" },
    { val: "PM_COYOTE", nm: "COYOTE" },
    { val: "PM_WEREJACKAL", nm: "WEREJACKAL" },
    { val: "PM_LITTLE_DOG", nm: "LITTLE_DOG" },
    { val: "PM_DINGO", nm: "DINGO" },
    { val: "PM_DOG", nm: "DOG" },
    { val: "PM_LARGE_DOG", nm: "LARGE_DOG" },
    { val: "PM_WOLF", nm: "WOLF" },
    { val: "PM_WEREWOLF", nm: "WEREWOLF" },
    { val: "PM_WINTER_WOLF_CUB", nm: "WINTER_WOLF_CUB" },
    { val: "PM_WARG", nm: "WARG" },
    { val: "PM_WINTER_WOLF", nm: "WINTER_WOLF" },
    { val: "PM_HELL_HOUND_PUP", nm: "HELL_HOUND_PUP" },
    { val: "PM_HELL_HOUND", nm: "HELL_HOUND" },
    { val: "PM_GAS_SPORE", nm: "GAS_SPORE" },
    { val: "PM_FLOATING_EYE", nm: "FLOATING_EYE" },
    { val: "PM_FREEZING_SPHERE", nm: "FREEZING_SPHERE" },
    { val: "PM_FLAMING_SPHERE", nm: "FLAMING_SPHERE" },
    { val: "PM_SHOCKING_SPHERE", nm: "SHOCKING_SPHERE" },
    { val: "PM_KITTEN", nm: "KITTEN" },
    { val: "PM_HOUSECAT", nm: "HOUSECAT" },
    { val: "PM_JAGUAR", nm: "JAGUAR" },
    { val: "PM_LYNX", nm: "LYNX" },
    { val: "PM_PANTHER", nm: "PANTHER" },
    { val: "PM_LARGE_CAT", nm: "LARGE_CAT" },
    { val: "PM_TIGER", nm: "TIGER" },
    { val: "PM_DISPLACER_BEAST", nm: "DISPLACER_BEAST" },
    { val: "PM_GREMLIN", nm: "GREMLIN" },
    { val: "PM_GARGOYLE", nm: "GARGOYLE" },
    { val: "PM_WINGED_GARGOYLE", nm: "WINGED_GARGOYLE" },
    { val: "PM_HOBBIT", nm: "HOBBIT" },
    { val: "PM_DWARF", nm: "DWARF" },
    { val: "PM_BUGBEAR", nm: "BUGBEAR" },
    { val: "PM_DWARF_LEADER", nm: "DWARF_LEADER" },
    { val: "PM_DWARF_RULER", nm: "DWARF_RULER" },
    { val: "PM_MIND_FLAYER", nm: "MIND_FLAYER" },
    { val: "PM_MASTER_MIND_FLAYER", nm: "MASTER_MIND_FLAYER" },
    { val: "PM_MANES", nm: "MANES" },
    { val: "PM_HOMUNCULUS", nm: "HOMUNCULUS" },
    { val: "PM_IMP", nm: "IMP" },
    { val: "PM_LEMURE", nm: "LEMURE" },
    { val: "PM_QUASIT", nm: "QUASIT" },
    { val: "PM_TENGU", nm: "TENGU" },
    { val: "PM_BLUE_JELLY", nm: "BLUE_JELLY" },
    { val: "PM_SPOTTED_JELLY", nm: "SPOTTED_JELLY" },
    { val: "PM_OCHRE_JELLY", nm: "OCHRE_JELLY" },
    { val: "PM_KOBOLD", nm: "KOBOLD" },
    { val: "PM_LARGE_KOBOLD", nm: "LARGE_KOBOLD" },
    { val: "PM_KOBOLD_LEADER", nm: "KOBOLD_LEADER" },
    { val: "PM_KOBOLD_SHAMAN", nm: "KOBOLD_SHAMAN" },
    { val: "PM_LEPRECHAUN", nm: "LEPRECHAUN" },
    { val: "PM_SMALL_MIMIC", nm: "SMALL_MIMIC" },
    { val: "PM_LARGE_MIMIC", nm: "LARGE_MIMIC" },
    { val: "PM_GIANT_MIMIC", nm: "GIANT_MIMIC" },
    { val: "PM_WOOD_NYMPH", nm: "WOOD_NYMPH" },
    { val: "PM_WATER_NYMPH", nm: "WATER_NYMPH" },
    { val: "PM_MOUNTAIN_NYMPH", nm: "MOUNTAIN_NYMPH" },
    { val: "PM_GOBLIN", nm: "GOBLIN" },
    { val: "PM_HOBGOBLIN", nm: "HOBGOBLIN" },
    { val: "PM_ORC", nm: "ORC" },
    { val: "PM_HILL_ORC", nm: "HILL_ORC" },
    { val: "PM_MORDOR_ORC", nm: "MORDOR_ORC" },
    { val: "PM_URUK_HAI", nm: "URUK_HAI" },
    { val: "PM_ORC_SHAMAN", nm: "ORC_SHAMAN" },
    { val: "PM_ORC_CAPTAIN", nm: "ORC_CAPTAIN" },
    { val: "PM_ROCK_PIERCER", nm: "ROCK_PIERCER" },
    { val: "PM_IRON_PIERCER", nm: "IRON_PIERCER" },
    { val: "PM_GLASS_PIERCER", nm: "GLASS_PIERCER" },
    { val: "PM_ROTHE", nm: "ROTHE" },
    { val: "PM_MUMAK", nm: "MUMAK" },
    { val: "PM_LEOCROTTA", nm: "LEOCROTTA" },
    { val: "PM_WUMPUS", nm: "WUMPUS" },
    { val: "PM_TITANOTHERE", nm: "TITANOTHERE" },
    { val: "PM_BALUCHITHERIUM", nm: "BALUCHITHERIUM" },
    { val: "PM_MASTODON", nm: "MASTODON" },
    { val: "PM_SEWER_RAT", nm: "SEWER_RAT" },
    { val: "PM_GIANT_RAT", nm: "GIANT_RAT" },
    { val: "PM_RABID_RAT", nm: "RABID_RAT" },
    { val: "PM_WERERAT", nm: "WERERAT" },
    { val: "PM_ROCK_MOLE", nm: "ROCK_MOLE" },
    { val: "PM_WOODCHUCK", nm: "WOODCHUCK" },
    { val: "PM_CAVE_SPIDER", nm: "CAVE_SPIDER" },
    { val: "PM_CENTIPEDE", nm: "CENTIPEDE" },
    { val: "PM_GIANT_SPIDER", nm: "GIANT_SPIDER" },
    { val: "PM_SCORPION", nm: "SCORPION" },
    { val: "PM_LURKER_ABOVE", nm: "LURKER_ABOVE" },
    { val: "PM_TRAPPER", nm: "TRAPPER" },
    { val: "PM_PONY", nm: "PONY" },
    { val: "PM_WHITE_UNICORN", nm: "WHITE_UNICORN" },
    { val: "PM_GRAY_UNICORN", nm: "GRAY_UNICORN" },
    { val: "PM_BLACK_UNICORN", nm: "BLACK_UNICORN" },
    { val: "PM_HORSE", nm: "HORSE" },
    { val: "PM_WARHORSE", nm: "WARHORSE" },
    { val: "PM_FOG_CLOUD", nm: "FOG_CLOUD" },
    { val: "PM_DUST_VORTEX", nm: "DUST_VORTEX" },
    { val: "PM_ICE_VORTEX", nm: "ICE_VORTEX" },
    { val: "PM_ENERGY_VORTEX", nm: "ENERGY_VORTEX" },
    { val: "PM_STEAM_VORTEX", nm: "STEAM_VORTEX" },
    { val: "PM_FIRE_VORTEX", nm: "FIRE_VORTEX" },
    { val: "PM_BABY_LONG_WORM", nm: "BABY_LONG_WORM" },
    { val: "PM_BABY_PURPLE_WORM", nm: "BABY_PURPLE_WORM" },
    { val: "PM_LONG_WORM", nm: "LONG_WORM" },
    { val: "PM_PURPLE_WORM", nm: "PURPLE_WORM" },
    { val: "PM_GRID_BUG", nm: "GRID_BUG" },
    { val: "PM_XAN", nm: "XAN" },
    { val: "PM_YELLOW_LIGHT", nm: "YELLOW_LIGHT" },
    { val: "PM_BLACK_LIGHT", nm: "BLACK_LIGHT" },
    { val: "PM_ZRUTY", nm: "ZRUTY" },
    { val: "PM_COUATL", nm: "COUATL" },
    { val: "PM_ALEAX", nm: "ALEAX" },
    { val: "PM_ANGEL", nm: "ANGEL" },
    { val: "PM_KI_RIN", nm: "KI_RIN" },
    { val: "PM_ARCHON", nm: "ARCHON" },
    { val: "PM_BAT", nm: "BAT" },
    { val: "PM_GIANT_BAT", nm: "GIANT_BAT" },
    { val: "PM_RAVEN", nm: "RAVEN" },
    { val: "PM_VAMPIRE_BAT", nm: "VAMPIRE_BAT" },
    { val: "PM_PLAINS_CENTAUR", nm: "PLAINS_CENTAUR" },
    { val: "PM_FOREST_CENTAUR", nm: "FOREST_CENTAUR" },
    { val: "PM_MOUNTAIN_CENTAUR", nm: "MOUNTAIN_CENTAUR" },
    { val: "PM_BABY_GRAY_DRAGON", nm: "BABY_GRAY_DRAGON" },
    { val: "PM_BABY_GOLD_DRAGON", nm: "BABY_GOLD_DRAGON" },
    { val: "PM_BABY_SILVER_DRAGON", nm: "BABY_SILVER_DRAGON" },
    { val: "PM_BABY_RED_DRAGON", nm: "BABY_RED_DRAGON" },
    { val: "PM_BABY_WHITE_DRAGON", nm: "BABY_WHITE_DRAGON" },
    { val: "PM_BABY_ORANGE_DRAGON", nm: "BABY_ORANGE_DRAGON" },
    { val: "PM_BABY_BLACK_DRAGON", nm: "BABY_BLACK_DRAGON" },
    { val: "PM_BABY_BLUE_DRAGON", nm: "BABY_BLUE_DRAGON" },
    { val: "PM_BABY_GREEN_DRAGON", nm: "BABY_GREEN_DRAGON" },
    { val: "PM_BABY_YELLOW_DRAGON", nm: "BABY_YELLOW_DRAGON" },
    { val: "PM_GRAY_DRAGON", nm: "GRAY_DRAGON" },
    { val: "PM_GOLD_DRAGON", nm: "GOLD_DRAGON" },
    { val: "PM_SILVER_DRAGON", nm: "SILVER_DRAGON" },
    { val: "PM_RED_DRAGON", nm: "RED_DRAGON" },
    { val: "PM_WHITE_DRAGON", nm: "WHITE_DRAGON" },
    { val: "PM_ORANGE_DRAGON", nm: "ORANGE_DRAGON" },
    { val: "PM_BLACK_DRAGON", nm: "BLACK_DRAGON" },
    { val: "PM_BLUE_DRAGON", nm: "BLUE_DRAGON" },
    { val: "PM_GREEN_DRAGON", nm: "GREEN_DRAGON" },
    { val: "PM_YELLOW_DRAGON", nm: "YELLOW_DRAGON" },
    { val: "PM_STALKER", nm: "STALKER" },
    { val: "PM_AIR_ELEMENTAL", nm: "AIR_ELEMENTAL" },
    { val: "PM_FIRE_ELEMENTAL", nm: "FIRE_ELEMENTAL" },
    { val: "PM_EARTH_ELEMENTAL", nm: "EARTH_ELEMENTAL" },
    { val: "PM_WATER_ELEMENTAL", nm: "WATER_ELEMENTAL" },
    { val: "PM_LICHEN", nm: "LICHEN" },
    { val: "PM_BROWN_MOLD", nm: "BROWN_MOLD" },
    { val: "PM_YELLOW_MOLD", nm: "YELLOW_MOLD" },
    { val: "PM_GREEN_MOLD", nm: "GREEN_MOLD" },
    { val: "PM_RED_MOLD", nm: "RED_MOLD" },
    { val: "PM_SHRIEKER", nm: "SHRIEKER" },
    { val: "PM_VIOLET_FUNGUS", nm: "VIOLET_FUNGUS" },
    { val: "PM_GNOME", nm: "GNOME" },
    { val: "PM_GNOME_LEADER", nm: "GNOME_LEADER" },
    { val: "PM_GNOMISH_WIZARD", nm: "GNOMISH_WIZARD" },
    { val: "PM_GNOME_RULER", nm: "GNOME_RULER" },
    { val: "PM_GIANT", nm: "GIANT" },
    { val: "PM_STONE_GIANT", nm: "STONE_GIANT" },
    { val: "PM_HILL_GIANT", nm: "HILL_GIANT" },
    { val: "PM_FIRE_GIANT", nm: "FIRE_GIANT" },
    { val: "PM_FROST_GIANT", nm: "FROST_GIANT" },
    { val: "PM_ETTIN", nm: "ETTIN" },
    { val: "PM_STORM_GIANT", nm: "STORM_GIANT" },
    { val: "PM_TITAN", nm: "TITAN" },
    { val: "PM_MINOTAUR", nm: "MINOTAUR" },
    { val: "PM_JABBERWOCK", nm: "JABBERWOCK" },
    { val: "PM_KEYSTONE_KOP", nm: "KEYSTONE_KOP" },
    { val: "PM_KOP_SERGEANT", nm: "KOP_SERGEANT" },
    { val: "PM_KOP_LIEUTENANT", nm: "KOP_LIEUTENANT" },
    { val: "PM_KOP_KAPTAIN", nm: "KOP_KAPTAIN" },
    { val: "PM_LICH", nm: "LICH" },
    { val: "PM_DEMILICH", nm: "DEMILICH" },
    { val: "PM_MASTER_LICH", nm: "MASTER_LICH" },
    { val: "PM_ARCH_LICH", nm: "ARCH_LICH" },
    { val: "PM_KOBOLD_MUMMY", nm: "KOBOLD_MUMMY" },
    { val: "PM_GNOME_MUMMY", nm: "GNOME_MUMMY" },
    { val: "PM_ORC_MUMMY", nm: "ORC_MUMMY" },
    { val: "PM_DWARF_MUMMY", nm: "DWARF_MUMMY" },
    { val: "PM_ELF_MUMMY", nm: "ELF_MUMMY" },
    { val: "PM_HUMAN_MUMMY", nm: "HUMAN_MUMMY" },
    { val: "PM_ETTIN_MUMMY", nm: "ETTIN_MUMMY" },
    { val: "PM_GIANT_MUMMY", nm: "GIANT_MUMMY" },
    { val: "PM_RED_NAGA_HATCHLING", nm: "RED_NAGA_HATCHLING" },
    { val: "PM_BLACK_NAGA_HATCHLING", nm: "BLACK_NAGA_HATCHLING" },
    { val: "PM_GOLDEN_NAGA_HATCHLING", nm: "GOLDEN_NAGA_HATCHLING" },
    { val: "PM_GUARDIAN_NAGA_HATCHLING", nm: "GUARDIAN_NAGA_HATCHLING" },
    { val: "PM_RED_NAGA", nm: "RED_NAGA" },
    { val: "PM_BLACK_NAGA", nm: "BLACK_NAGA" },
    { val: "PM_GOLDEN_NAGA", nm: "GOLDEN_NAGA" },
    { val: "PM_GUARDIAN_NAGA", nm: "GUARDIAN_NAGA" },
    { val: "PM_OGRE", nm: "OGRE" },
    { val: "PM_OGRE_LEADER", nm: "OGRE_LEADER" },
    { val: "PM_OGRE_TYRANT", nm: "OGRE_TYRANT" },
    { val: "PM_GRAY_OOZE", nm: "GRAY_OOZE" },
    { val: "PM_BROWN_PUDDING", nm: "BROWN_PUDDING" },
    { val: "PM_GREEN_SLIME", nm: "GREEN_SLIME" },
    { val: "PM_BLACK_PUDDING", nm: "BLACK_PUDDING" },
    { val: "PM_QUANTUM_MECHANIC", nm: "QUANTUM_MECHANIC" },
    { val: "PM_GENETIC_ENGINEER", nm: "GENETIC_ENGINEER" },
    { val: "PM_RUST_MONSTER", nm: "RUST_MONSTER" },
    { val: "PM_DISENCHANTER", nm: "DISENCHANTER" },
    { val: "PM_GARTER_SNAKE", nm: "GARTER_SNAKE" },
    { val: "PM_SNAKE", nm: "SNAKE" },
    { val: "PM_WATER_MOCCASIN", nm: "WATER_MOCCASIN" },
    { val: "PM_PYTHON", nm: "PYTHON" },
    { val: "PM_PIT_VIPER", nm: "PIT_VIPER" },
    { val: "PM_COBRA", nm: "COBRA" },
    { val: "PM_TROLL", nm: "TROLL" },
    { val: "PM_ICE_TROLL", nm: "ICE_TROLL" },
    { val: "PM_ROCK_TROLL", nm: "ROCK_TROLL" },
    { val: "PM_WATER_TROLL", nm: "WATER_TROLL" },
    { val: "PM_OLOG_HAI", nm: "OLOG_HAI" },
    { val: "PM_UMBER_HULK", nm: "UMBER_HULK" },
    { val: "PM_VAMPIRE", nm: "VAMPIRE" },
    { val: "PM_VAMPIRE_LEADER", nm: "VAMPIRE_LEADER" },
    { val: "PM_VLAD_THE_IMPALER", nm: "VLAD_THE_IMPALER" },
    { val: "PM_BARROW_WIGHT", nm: "BARROW_WIGHT" },
    { val: "PM_WRAITH", nm: "WRAITH" },
    { val: "PM_NAZGUL", nm: "NAZGUL" },
    { val: "PM_XORN", nm: "XORN" },
    { val: "PM_MONKEY", nm: "MONKEY" },
    { val: "PM_APE", nm: "APE" },
    { val: "PM_OWLBEAR", nm: "OWLBEAR" },
    { val: "PM_YETI", nm: "YETI" },
    { val: "PM_CARNIVOROUS_APE", nm: "CARNIVOROUS_APE" },
    { val: "PM_SASQUATCH", nm: "SASQUATCH" },
    { val: "PM_KOBOLD_ZOMBIE", nm: "KOBOLD_ZOMBIE" },
    { val: "PM_GNOME_ZOMBIE", nm: "GNOME_ZOMBIE" },
    { val: "PM_ORC_ZOMBIE", nm: "ORC_ZOMBIE" },
    { val: "PM_DWARF_ZOMBIE", nm: "DWARF_ZOMBIE" },
    { val: "PM_ELF_ZOMBIE", nm: "ELF_ZOMBIE" },
    { val: "PM_HUMAN_ZOMBIE", nm: "HUMAN_ZOMBIE" },
    { val: "PM_ETTIN_ZOMBIE", nm: "ETTIN_ZOMBIE" },
    { val: "PM_GHOUL", nm: "GHOUL" },
    { val: "PM_GIANT_ZOMBIE", nm: "GIANT_ZOMBIE" },
    { val: "PM_SKELETON", nm: "SKELETON" },
    { val: "PM_STRAW_GOLEM", nm: "STRAW_GOLEM" },
    { val: "PM_PAPER_GOLEM", nm: "PAPER_GOLEM" },
    { val: "PM_ROPE_GOLEM", nm: "ROPE_GOLEM" },
    { val: "PM_GOLD_GOLEM", nm: "GOLD_GOLEM" },
    { val: "PM_LEATHER_GOLEM", nm: "LEATHER_GOLEM" },
    { val: "PM_WOOD_GOLEM", nm: "WOOD_GOLEM" },
    { val: "PM_FLESH_GOLEM", nm: "FLESH_GOLEM" },
    { val: "PM_CLAY_GOLEM", nm: "CLAY_GOLEM" },
    { val: "PM_STONE_GOLEM", nm: "STONE_GOLEM" },
    { val: "PM_GLASS_GOLEM", nm: "GLASS_GOLEM" },
    { val: "PM_IRON_GOLEM", nm: "IRON_GOLEM" },
    { val: "PM_HUMAN", nm: "HUMAN" },
    { val: "PM_HUMAN_WERERAT", nm: "HUMAN_WERERAT" },
    { val: "PM_HUMAN_WEREJACKAL", nm: "HUMAN_WEREJACKAL" },
    { val: "PM_HUMAN_WEREWOLF", nm: "HUMAN_WEREWOLF" },
    { val: "PM_ELF", nm: "ELF" },
    { val: "PM_WOODLAND_ELF", nm: "WOODLAND_ELF" },
    { val: "PM_GREEN_ELF", nm: "GREEN_ELF" },
    { val: "PM_GREY_ELF", nm: "GREY_ELF" },
    { val: "PM_ELF_NOBLE", nm: "ELF_NOBLE" },
    { val: "PM_ELVEN_MONARCH", nm: "ELVEN_MONARCH" },
    { val: "PM_DOPPELGANGER", nm: "DOPPELGANGER" },
    { val: "PM_SHOPKEEPER", nm: "SHOPKEEPER" },
    { val: "PM_GUARD", nm: "GUARD" },
    { val: "PM_PRISONER", nm: "PRISONER" },
    { val: "PM_ORACLE", nm: "ORACLE" },
    { val: "PM_ALIGNED_CLERIC", nm: "ALIGNED_CLERIC" },
    { val: "PM_HIGH_CLERIC", nm: "HIGH_CLERIC" },
    { val: "PM_SOLDIER", nm: "SOLDIER" },
    { val: "PM_SERGEANT", nm: "SERGEANT" },
    { val: "PM_NURSE", nm: "NURSE" },
    { val: "PM_LIEUTENANT", nm: "LIEUTENANT" },
    { val: "PM_CAPTAIN", nm: "CAPTAIN" },
    { val: "PM_WATCHMAN", nm: "WATCHMAN" },
    { val: "PM_WATCH_CAPTAIN", nm: "WATCH_CAPTAIN" },
    { val: "PM_MEDUSA", nm: "MEDUSA" },
    { val: "PM_WIZARD_OF_YENDOR", nm: "WIZARD_OF_YENDOR" },
    { val: "PM_CROESUS", nm: "CROESUS" },
    { val: "PM_GHOST", nm: "GHOST" },
    { val: "PM_SHADE", nm: "SHADE" },
    { val: "PM_WATER_DEMON", nm: "WATER_DEMON" },
    { val: "PM_AMOROUS_DEMON", nm: "AMOROUS_DEMON" },
    { val: "PM_HORNED_DEVIL", nm: "HORNED_DEVIL" },
    { val: "PM_ERINYS", nm: "ERINYS" },
    { val: "PM_BARBED_DEVIL", nm: "BARBED_DEVIL" },
    { val: "PM_MARILITH", nm: "MARILITH" },
    { val: "PM_VROCK", nm: "VROCK" },
    { val: "PM_HEZROU", nm: "HEZROU" },
    { val: "PM_BONE_DEVIL", nm: "BONE_DEVIL" },
    { val: "PM_ICE_DEVIL", nm: "ICE_DEVIL" },
    { val: "PM_NALFESHNEE", nm: "NALFESHNEE" },
    { val: "PM_PIT_FIEND", nm: "PIT_FIEND" },
    { val: "PM_SANDESTIN", nm: "SANDESTIN" },
    { val: "PM_BALROG", nm: "BALROG" },
    { val: "PM_JUIBLEX", nm: "JUIBLEX" },
    { val: "PM_YEENOGHU", nm: "YEENOGHU" },
    { val: "PM_ORCUS", nm: "ORCUS" },
    { val: "PM_GERYON", nm: "GERYON" },
    { val: "PM_DISPATER", nm: "DISPATER" },
    { val: "PM_BAALZEBUB", nm: "BAALZEBUB" },
    { val: "PM_ASMODEUS", nm: "ASMODEUS" },
    { val: "PM_DEMOGORGON", nm: "DEMOGORGON" },
    { val: "PM_DEATH", nm: "DEATH" },
    { val: "PM_PESTILENCE", nm: "PESTILENCE" },
    { val: "PM_FAMINE", nm: "FAMINE" },
    { val: "PM_MAIL_DAEMON", nm: "MAIL_DAEMON" },
    { val: "PM_DJINNI", nm: "DJINNI" },
    { val: "PM_JELLYFISH", nm: "JELLYFISH" },
    { val: "PM_PIRANHA", nm: "PIRANHA" },
    { val: "PM_SHARK", nm: "SHARK" },
    { val: "PM_GIANT_EEL", nm: "GIANT_EEL" },
    { val: "PM_ELECTRIC_EEL", nm: "ELECTRIC_EEL" },
    { val: "PM_KRAKEN", nm: "KRAKEN" },
    { val: "PM_NEWT", nm: "NEWT" },
    { val: "PM_GECKO", nm: "GECKO" },
    { val: "PM_IGUANA", nm: "IGUANA" },
    { val: "PM_BABY_CROCODILE", nm: "BABY_CROCODILE" },
    { val: "PM_LIZARD", nm: "LIZARD" },
    { val: "PM_CHAMELEON", nm: "CHAMELEON" },
    { val: "PM_CROCODILE", nm: "CROCODILE" },
    { val: "PM_SALAMANDER", nm: "SALAMANDER" },
    { val: "PM_LONG_WORM_TAIL", nm: "LONG_WORM_TAIL" },
    { val: "PM_ARCHEOLOGIST", nm: "ARCHEOLOGIST" },
    { val: "PM_BARBARIAN", nm: "BARBARIAN" },
    { val: "PM_CAVE_DWELLER", nm: "CAVE_DWELLER" },
    { val: "PM_HEALER", nm: "HEALER" },
    { val: "PM_KNIGHT", nm: "KNIGHT" },
    { val: "PM_MONK", nm: "MONK" },
    { val: "PM_CLERIC", nm: "CLERIC" },
    { val: "PM_RANGER", nm: "RANGER" },
    { val: "PM_ROGUE", nm: "ROGUE" },
    { val: "PM_SAMURAI", nm: "SAMURAI" },
    { val: "PM_TOURIST", nm: "TOURIST" },
    { val: "PM_VALKYRIE", nm: "VALKYRIE" },
    { val: "PM_WIZARD", nm: "WIZARD" },
    { val: "PM_LORD_CARNARVON", nm: "LORD_CARNARVON" },
    { val: "PM_PELIAS", nm: "PELIAS" },
    { val: "PM_SHAMAN_KARNOV", nm: "SHAMAN_KARNOV" },
    { val: "PM_HIPPOCRATES", nm: "HIPPOCRATES" },
    { val: "PM_KING_ARTHUR", nm: "KING_ARTHUR" },
    { val: "PM_GRAND_MASTER", nm: "GRAND_MASTER" },
    { val: "PM_ARCH_PRIEST", nm: "ARCH_PRIEST" },
    { val: "PM_ORION", nm: "ORION" },
    { val: "PM_MASTER_OF_THIEVES", nm: "MASTER_OF_THIEVES" },
    { val: "PM_LORD_SATO", nm: "LORD_SATO" },
    { val: "PM_TWOFLOWER", nm: "TWOFLOWER" },
    { val: "PM_NORN", nm: "NORN" },
    { val: "PM_NEFERET_THE_GREEN", nm: "NEFERET_THE_GREEN" },
    { val: "PM_MINION_OF_HUHETOTL", nm: "MINION_OF_HUHETOTL" },
    { val: "PM_THOTH_AMON", nm: "THOTH_AMON" },
    { val: "PM_CHROMATIC_DRAGON", nm: "CHROMATIC_DRAGON" },
    { val: "PM_CYCLOPS", nm: "CYCLOPS" },
    { val: "PM_IXOTH", nm: "IXOTH" },
    { val: "PM_MASTER_KAEN", nm: "MASTER_KAEN" },
    { val: "PM_NALZOK", nm: "NALZOK" },
    { val: "PM_SCORPIUS", nm: "SCORPIUS" },
    { val: "PM_MASTER_ASSASSIN", nm: "MASTER_ASSASSIN" },
    { val: "PM_ASHIKAGA_TAKAUJI", nm: "ASHIKAGA_TAKAUJI" },
    { val: "PM_LORD_SURTUR", nm: "LORD_SURTUR" },
    { val: "PM_DARK_ONE", nm: "DARK_ONE" },
    { val: "PM_STUDENT", nm: "STUDENT" },
    { val: "PM_CHIEFTAIN", nm: "CHIEFTAIN" },
    { val: "PM_NEANDERTHAL", nm: "NEANDERTHAL" },
    { val: "PM_ATTENDANT", nm: "ATTENDANT" },
    { val: "PM_PAGE", nm: "PAGE" },
    { val: "PM_ABBOT", nm: "ABBOT" },
    { val: "PM_ACOLYTE", nm: "ACOLYTE" },
    { val: "PM_HUNTER", nm: "HUNTER" },
    { val: "PM_THUG", nm: "THUG" },
    { val: "PM_NINJA", nm: "NINJA" },
    { val: "PM_ROSHI", nm: "ROSHI" },
    { val: "PM_GUIDE", nm: "GUIDE" },
    { val: "PM_WARRIOR", nm: "WARRIOR" },
    { val: "PM_APPRENTICE", nm: "APPRENTICE" },
    { val: "NUMMONS", nm: "NUMMONS" },
    { val: "NON_PM", nm: "NON_PM" },
    { val: "LOW_PM", nm: "LOW_PM" },
    { val: "HIGH_PM", nm: "HIGH_PM" },
    { val: "SPECIAL_PM", nm: "SPECIAL_PM" },
];

export const objdump = [
    { val: "STRANGE_OBJECT", nm: "STRANGE_OBJECT" },
    { val: "GENERIC_ILLOBJ", nm: "GENERIC_ILLOBJ" },
    { val: "GENERIC_WEAPON", nm: "GENERIC_WEAPON" },
    { val: "GENERIC_ARMOR", nm: "GENERIC_ARMOR" },
    { val: "GENERIC_RING", nm: "GENERIC_RING" },
    { val: "GENERIC_AMULET", nm: "GENERIC_AMULET" },
    { val: "GENERIC_TOOL", nm: "GENERIC_TOOL" },
    { val: "GENERIC_FOOD", nm: "GENERIC_FOOD" },
    { val: "GENERIC_POTION", nm: "GENERIC_POTION" },
    { val: "GENERIC_SCROLL", nm: "GENERIC_SCROLL" },
    { val: "GENERIC_SPBOOK", nm: "GENERIC_SPBOOK" },
    { val: "GENERIC_WAND", nm: "GENERIC_WAND" },
    { val: "GENERIC_COIN", nm: "GENERIC_COIN" },
    { val: "GENERIC_GEM", nm: "GENERIC_GEM" },
    { val: "GENERIC_ROCK", nm: "GENERIC_ROCK" },
    { val: "GENERIC_BALL", nm: "GENERIC_BALL" },
    { val: "GENERIC_CHAIN", nm: "GENERIC_CHAIN" },
    { val: "GENERIC_VENOM", nm: "GENERIC_VENOM" },
    { val: "ARROW", nm: "ARROW" },
    { val: "ELVEN_ARROW", nm: "ELVEN_ARROW" },
    { val: "ORCISH_ARROW", nm: "ORCISH_ARROW" },
    { val: "SILVER_ARROW", nm: "SILVER_ARROW" },
    { val: "YA", nm: "YA" },
    { val: "CROSSBOW_BOLT", nm: "CROSSBOW_BOLT" },
    { val: "DART", nm: "DART" },
    { val: "SHURIKEN", nm: "SHURIKEN" },
    { val: "BOOMERANG", nm: "BOOMERANG" },
    { val: "SPEAR", nm: "SPEAR" },
    { val: "ELVEN_SPEAR", nm: "ELVEN_SPEAR" },
    { val: "ORCISH_SPEAR", nm: "ORCISH_SPEAR" },
    { val: "DWARVISH_SPEAR", nm: "DWARVISH_SPEAR" },
    { val: "SILVER_SPEAR", nm: "SILVER_SPEAR" },
    { val: "JAVELIN", nm: "JAVELIN" },
    { val: "TRIDENT", nm: "TRIDENT" },
    { val: "DAGGER", nm: "DAGGER" },
    { val: "ELVEN_DAGGER", nm: "ELVEN_DAGGER" },
    { val: "ORCISH_DAGGER", nm: "ORCISH_DAGGER" },
    { val: "SILVER_DAGGER", nm: "SILVER_DAGGER" },
    { val: "ATHAME", nm: "ATHAME" },
    { val: "SCALPEL", nm: "SCALPEL" },
    { val: "KNIFE", nm: "KNIFE" },
    { val: "STILETTO", nm: "STILETTO" },
    { val: "WORM_TOOTH", nm: "WORM_TOOTH" },
    { val: "CRYSKNIFE", nm: "CRYSKNIFE" },
    { val: "AXE", nm: "AXE" },
    { val: "BATTLE_AXE", nm: "BATTLE_AXE" },
    { val: "SHORT_SWORD", nm: "SHORT_SWORD" },
    { val: "ELVEN_SHORT_SWORD", nm: "ELVEN_SHORT_SWORD" },
    { val: "ORCISH_SHORT_SWORD", nm: "ORCISH_SHORT_SWORD" },
    { val: "DWARVISH_SHORT_SWORD", nm: "DWARVISH_SHORT_SWORD" },
    { val: "SCIMITAR", nm: "SCIMITAR" },
    { val: "SILVER_SABER", nm: "SILVER_SABER" },
    { val: "BROADSWORD", nm: "BROADSWORD" },
    { val: "ELVEN_BROADSWORD", nm: "ELVEN_BROADSWORD" },
    { val: "LONG_SWORD", nm: "LONG_SWORD" },
    { val: "TWO_HANDED_SWORD", nm: "TWO_HANDED_SWORD" },
    { val: "KATANA", nm: "KATANA" },
    { val: "TSURUGI", nm: "TSURUGI" },
    { val: "RUNESWORD", nm: "RUNESWORD" },
    { val: "PARTISAN", nm: "PARTISAN" },
    { val: "RANSEUR", nm: "RANSEUR" },
    { val: "SPETUM", nm: "SPETUM" },
    { val: "GLAIVE", nm: "GLAIVE" },
    { val: "HALBERD", nm: "HALBERD" },
    { val: "BARDICHE", nm: "BARDICHE" },
    { val: "VOULGE", nm: "VOULGE" },
    { val: "FAUCHARD", nm: "FAUCHARD" },
    { val: "GUISARME", nm: "GUISARME" },
    { val: "BILL_GUISARME", nm: "BILL_GUISARME" },
    { val: "LUCERN_HAMMER", nm: "LUCERN_HAMMER" },
    { val: "BEC_DE_CORBIN", nm: "BEC_DE_CORBIN" },
    { val: "DWARVISH_MATTOCK", nm: "DWARVISH_MATTOCK" },
    { val: "LANCE", nm: "LANCE" },
    { val: "MACE", nm: "MACE" },
    { val: "SILVER_MACE", nm: "SILVER_MACE" },
    { val: "MORNING_STAR", nm: "MORNING_STAR" },
    { val: "WAR_HAMMER", nm: "WAR_HAMMER" },
    { val: "CLUB", nm: "CLUB" },
    { val: "RUBBER_HOSE", nm: "RUBBER_HOSE" },
    { val: "QUARTERSTAFF", nm: "QUARTERSTAFF" },
    { val: "AKLYS", nm: "AKLYS" },
    { val: "FLAIL", nm: "FLAIL" },
    { val: "BULLWHIP", nm: "BULLWHIP" },
    { val: "BOW", nm: "BOW" },
    { val: "ELVEN_BOW", nm: "ELVEN_BOW" },
    { val: "ORCISH_BOW", nm: "ORCISH_BOW" },
    { val: "YUMI", nm: "YUMI" },
    { val: "SLING", nm: "SLING" },
    { val: "CROSSBOW", nm: "CROSSBOW" },
    { val: "ELVEN_LEATHER_HELM", nm: "ELVEN_LEATHER_HELM" },
    { val: "ORCISH_HELM", nm: "ORCISH_HELM" },
    { val: "DWARVISH_IRON_HELM", nm: "DWARVISH_IRON_HELM" },
    { val: "FEDORA", nm: "FEDORA" },
    { val: "CORNUTHAUM", nm: "CORNUTHAUM" },
    { val: "DUNCE_CAP", nm: "DUNCE_CAP" },
    { val: "DENTED_POT", nm: "DENTED_POT" },
    { val: "HELM_OF_BRILLIANCE", nm: "HELM_OF_BRILLIANCE" },
    { val: "HELMET", nm: "HELMET" },
    { val: "HELM_OF_CAUTION", nm: "HELM_OF_CAUTION" },
    { val: "HELM_OF_OPPOSITE_ALIGNMENT", nm: "HELM_OF_OPPOSITE_ALIGNMENT" },
    { val: "HELM_OF_TELEPATHY", nm: "HELM_OF_TELEPATHY" },
    { val: "GRAY_DRAGON_SCALE_MAIL", nm: "GRAY_DRAGON_SCALE_MAIL" },
    { val: "GOLD_DRAGON_SCALE_MAIL", nm: "GOLD_DRAGON_SCALE_MAIL" },
    { val: "SILVER_DRAGON_SCALE_MAIL", nm: "SILVER_DRAGON_SCALE_MAIL" },
    { val: "RED_DRAGON_SCALE_MAIL", nm: "RED_DRAGON_SCALE_MAIL" },
    { val: "WHITE_DRAGON_SCALE_MAIL", nm: "WHITE_DRAGON_SCALE_MAIL" },
    { val: "ORANGE_DRAGON_SCALE_MAIL", nm: "ORANGE_DRAGON_SCALE_MAIL" },
    { val: "BLACK_DRAGON_SCALE_MAIL", nm: "BLACK_DRAGON_SCALE_MAIL" },
    { val: "BLUE_DRAGON_SCALE_MAIL", nm: "BLUE_DRAGON_SCALE_MAIL" },
    { val: "GREEN_DRAGON_SCALE_MAIL", nm: "GREEN_DRAGON_SCALE_MAIL" },
    { val: "YELLOW_DRAGON_SCALE_MAIL", nm: "YELLOW_DRAGON_SCALE_MAIL" },
    { val: "GRAY_DRAGON_SCALES", nm: "GRAY_DRAGON_SCALES" },
    { val: "GOLD_DRAGON_SCALES", nm: "GOLD_DRAGON_SCALES" },
    { val: "SILVER_DRAGON_SCALES", nm: "SILVER_DRAGON_SCALES" },
    { val: "RED_DRAGON_SCALES", nm: "RED_DRAGON_SCALES" },
    { val: "WHITE_DRAGON_SCALES", nm: "WHITE_DRAGON_SCALES" },
    { val: "ORANGE_DRAGON_SCALES", nm: "ORANGE_DRAGON_SCALES" },
    { val: "BLACK_DRAGON_SCALES", nm: "BLACK_DRAGON_SCALES" },
    { val: "BLUE_DRAGON_SCALES", nm: "BLUE_DRAGON_SCALES" },
    { val: "GREEN_DRAGON_SCALES", nm: "GREEN_DRAGON_SCALES" },
    { val: "YELLOW_DRAGON_SCALES", nm: "YELLOW_DRAGON_SCALES" },
    { val: "PLATE_MAIL", nm: "PLATE_MAIL" },
    { val: "CRYSTAL_PLATE_MAIL", nm: "CRYSTAL_PLATE_MAIL" },
    { val: "BRONZE_PLATE_MAIL", nm: "BRONZE_PLATE_MAIL" },
    { val: "SPLINT_MAIL", nm: "SPLINT_MAIL" },
    { val: "BANDED_MAIL", nm: "BANDED_MAIL" },
    { val: "DWARVISH_MITHRIL_COAT", nm: "DWARVISH_MITHRIL_COAT" },
    { val: "ELVEN_MITHRIL_COAT", nm: "ELVEN_MITHRIL_COAT" },
    { val: "CHAIN_MAIL", nm: "CHAIN_MAIL" },
    { val: "ORCISH_CHAIN_MAIL", nm: "ORCISH_CHAIN_MAIL" },
    { val: "SCALE_MAIL", nm: "SCALE_MAIL" },
    { val: "STUDDED_LEATHER_ARMOR", nm: "STUDDED_LEATHER_ARMOR" },
    { val: "RING_MAIL", nm: "RING_MAIL" },
    { val: "ORCISH_RING_MAIL", nm: "ORCISH_RING_MAIL" },
    { val: "LEATHER_ARMOR", nm: "LEATHER_ARMOR" },
    { val: "LEATHER_JACKET", nm: "LEATHER_JACKET" },
    { val: "HAWAIIAN_SHIRT", nm: "HAWAIIAN_SHIRT" },
    { val: "T_SHIRT", nm: "T_SHIRT" },
    { val: "MUMMY_WRAPPING", nm: "MUMMY_WRAPPING" },
    { val: "ELVEN_CLOAK", nm: "ELVEN_CLOAK" },
    { val: "ORCISH_CLOAK", nm: "ORCISH_CLOAK" },
    { val: "DWARVISH_CLOAK", nm: "DWARVISH_CLOAK" },
    { val: "OILSKIN_CLOAK", nm: "OILSKIN_CLOAK" },
    { val: "ROBE", nm: "ROBE" },
    { val: "ALCHEMY_SMOCK", nm: "ALCHEMY_SMOCK" },
    { val: "LEATHER_CLOAK", nm: "LEATHER_CLOAK" },
    { val: "CLOAK_OF_PROTECTION", nm: "CLOAK_OF_PROTECTION" },
    { val: "CLOAK_OF_INVISIBILITY", nm: "CLOAK_OF_INVISIBILITY" },
    { val: "CLOAK_OF_MAGIC_RESISTANCE", nm: "CLOAK_OF_MAGIC_RESISTANCE" },
    { val: "CLOAK_OF_DISPLACEMENT", nm: "CLOAK_OF_DISPLACEMENT" },
    { val: "SMALL_SHIELD", nm: "SMALL_SHIELD" },
    { val: "SHIELD_OF_DRAIN_RESISTANCE", nm: "SHIELD_OF_DRAIN_RESISTANCE" },
    { val: "SHIELD_OF_SHOCK_RESISTANCE", nm: "SHIELD_OF_SHOCK_RESISTANCE" },
    { val: "ELVEN_SHIELD", nm: "ELVEN_SHIELD" },
    { val: "URUK_HAI_SHIELD", nm: "URUK_HAI_SHIELD" },
    { val: "ORCISH_SHIELD", nm: "ORCISH_SHIELD" },
    { val: "LARGE_SHIELD", nm: "LARGE_SHIELD" },
    { val: "DWARVISH_ROUNDSHIELD", nm: "DWARVISH_ROUNDSHIELD" },
    { val: "SHIELD_OF_REFLECTION", nm: "SHIELD_OF_REFLECTION" },
    { val: "LEATHER_GLOVES", nm: "LEATHER_GLOVES" },
    { val: "GAUNTLETS_OF_FUMBLING", nm: "GAUNTLETS_OF_FUMBLING" },
    { val: "GAUNTLETS_OF_POWER", nm: "GAUNTLETS_OF_POWER" },
    { val: "GAUNTLETS_OF_DEXTERITY", nm: "GAUNTLETS_OF_DEXTERITY" },
    { val: "LOW_BOOTS", nm: "LOW_BOOTS" },
    { val: "IRON_SHOES", nm: "IRON_SHOES" },
    { val: "HIGH_BOOTS", nm: "HIGH_BOOTS" },
    { val: "SPEED_BOOTS", nm: "SPEED_BOOTS" },
    { val: "WATER_WALKING_BOOTS", nm: "WATER_WALKING_BOOTS" },
    { val: "JUMPING_BOOTS", nm: "JUMPING_BOOTS" },
    { val: "ELVEN_BOOTS", nm: "ELVEN_BOOTS" },
    { val: "KICKING_BOOTS", nm: "KICKING_BOOTS" },
    { val: "FUMBLE_BOOTS", nm: "FUMBLE_BOOTS" },
    { val: "LEVITATION_BOOTS", nm: "LEVITATION_BOOTS" },
    { val: "RIN_ADORNMENT", nm: "RIN_ADORNMENT" },
    { val: "RIN_GAIN_STRENGTH", nm: "RIN_GAIN_STRENGTH" },
    { val: "RIN_GAIN_CONSTITUTION", nm: "RIN_GAIN_CONSTITUTION" },
    { val: "RIN_INCREASE_ACCURACY", nm: "RIN_INCREASE_ACCURACY" },
    { val: "RIN_INCREASE_DAMAGE", nm: "RIN_INCREASE_DAMAGE" },
    { val: "RIN_PROTECTION", nm: "RIN_PROTECTION" },
    { val: "RIN_REGENERATION", nm: "RIN_REGENERATION" },
    { val: "RIN_SEARCHING", nm: "RIN_SEARCHING" },
    { val: "RIN_STEALTH", nm: "RIN_STEALTH" },
    { val: "RIN_SUSTAIN_ABILITY", nm: "RIN_SUSTAIN_ABILITY" },
    { val: "RIN_LEVITATION", nm: "RIN_LEVITATION" },
    { val: "RIN_HUNGER", nm: "RIN_HUNGER" },
    { val: "RIN_AGGRAVATE_MONSTER", nm: "RIN_AGGRAVATE_MONSTER" },
    { val: "RIN_CONFLICT", nm: "RIN_CONFLICT" },
    { val: "RIN_WARNING", nm: "RIN_WARNING" },
    { val: "RIN_POISON_RESISTANCE", nm: "RIN_POISON_RESISTANCE" },
    { val: "RIN_FIRE_RESISTANCE", nm: "RIN_FIRE_RESISTANCE" },
    { val: "RIN_COLD_RESISTANCE", nm: "RIN_COLD_RESISTANCE" },
    { val: "RIN_SHOCK_RESISTANCE", nm: "RIN_SHOCK_RESISTANCE" },
    { val: "RIN_FREE_ACTION", nm: "RIN_FREE_ACTION" },
    { val: "RIN_SLOW_DIGESTION", nm: "RIN_SLOW_DIGESTION" },
    { val: "RIN_TELEPORTATION", nm: "RIN_TELEPORTATION" },
    { val: "RIN_TELEPORT_CONTROL", nm: "RIN_TELEPORT_CONTROL" },
    { val: "RIN_POLYMORPH", nm: "RIN_POLYMORPH" },
    { val: "RIN_POLYMORPH_CONTROL", nm: "RIN_POLYMORPH_CONTROL" },
    { val: "RIN_INVISIBILITY", nm: "RIN_INVISIBILITY" },
    { val: "RIN_SEE_INVISIBLE", nm: "RIN_SEE_INVISIBLE" },
    { val: "RIN_PROTECTION_FROM_SHAPE_CHAN", nm: "RIN_PROTECTION_FROM_SHAPE_CHAN" },
    { val: "AMULET_OF_ESP", nm: "AMULET_OF_ESP" },
    { val: "AMULET_OF_LIFE_SAVING", nm: "AMULET_OF_LIFE_SAVING" },
    { val: "AMULET_OF_STRANGULATION", nm: "AMULET_OF_STRANGULATION" },
    { val: "AMULET_OF_RESTFUL_SLEEP", nm: "AMULET_OF_RESTFUL_SLEEP" },
    { val: "AMULET_VERSUS_POISON", nm: "AMULET_VERSUS_POISON" },
    { val: "AMULET_OF_CHANGE", nm: "AMULET_OF_CHANGE" },
    { val: "AMULET_OF_UNCHANGING", nm: "AMULET_OF_UNCHANGING" },
    { val: "AMULET_OF_REFLECTION", nm: "AMULET_OF_REFLECTION" },
    { val: "AMULET_OF_MAGICAL_BREATHING", nm: "AMULET_OF_MAGICAL_BREATHING" },
    { val: "AMULET_OF_GUARDING", nm: "AMULET_OF_GUARDING" },
    { val: "AMULET_OF_FLYING", nm: "AMULET_OF_FLYING" },
    { val: "FAKE_AMULET_OF_YENDOR", nm: "FAKE_AMULET_OF_YENDOR" },
    { val: "AMULET_OF_YENDOR", nm: "AMULET_OF_YENDOR" },
    { val: "LARGE_BOX", nm: "LARGE_BOX" },
    { val: "CHEST", nm: "CHEST" },
    { val: "ICE_BOX", nm: "ICE_BOX" },
    { val: "SACK", nm: "SACK" },
    { val: "OILSKIN_SACK", nm: "OILSKIN_SACK" },
    { val: "BAG_OF_HOLDING", nm: "BAG_OF_HOLDING" },
    { val: "BAG_OF_TRICKS", nm: "BAG_OF_TRICKS" },
    { val: "SKELETON_KEY", nm: "SKELETON_KEY" },
    { val: "LOCK_PICK", nm: "LOCK_PICK" },
    { val: "CREDIT_CARD", nm: "CREDIT_CARD" },
    { val: "TALLOW_CANDLE", nm: "TALLOW_CANDLE" },
    { val: "WAX_CANDLE", nm: "WAX_CANDLE" },
    { val: "BRASS_LANTERN", nm: "BRASS_LANTERN" },
    { val: "OIL_LAMP", nm: "OIL_LAMP" },
    { val: "MAGIC_LAMP", nm: "MAGIC_LAMP" },
    { val: "EXPENSIVE_CAMERA", nm: "EXPENSIVE_CAMERA" },
    { val: "MIRROR", nm: "MIRROR" },
    { val: "CRYSTAL_BALL", nm: "CRYSTAL_BALL" },
    { val: "LENSES", nm: "LENSES" },
    { val: "BLINDFOLD", nm: "BLINDFOLD" },
    { val: "TOWEL", nm: "TOWEL" },
    { val: "SADDLE", nm: "SADDLE" },
    { val: "LEASH", nm: "LEASH" },
    { val: "STETHOSCOPE", nm: "STETHOSCOPE" },
    { val: "TINNING_KIT", nm: "TINNING_KIT" },
    { val: "TIN_OPENER", nm: "TIN_OPENER" },
    { val: "CAN_OF_GREASE", nm: "CAN_OF_GREASE" },
    { val: "FIGURINE", nm: "FIGURINE" },
    { val: "MAGIC_MARKER", nm: "MAGIC_MARKER" },
    { val: "LAND_MINE", nm: "LAND_MINE" },
    { val: "BEARTRAP", nm: "BEARTRAP" },
    { val: "TIN_WHISTLE", nm: "TIN_WHISTLE" },
    { val: "MAGIC_WHISTLE", nm: "MAGIC_WHISTLE" },
    { val: "WOODEN_FLUTE", nm: "WOODEN_FLUTE" },
    { val: "MAGIC_FLUTE", nm: "MAGIC_FLUTE" },
    { val: "TOOLED_HORN", nm: "TOOLED_HORN" },
    { val: "FROST_HORN", nm: "FROST_HORN" },
    { val: "FIRE_HORN", nm: "FIRE_HORN" },
    { val: "HORN_OF_PLENTY", nm: "HORN_OF_PLENTY" },
    { val: "WOODEN_HARP", nm: "WOODEN_HARP" },
    { val: "MAGIC_HARP", nm: "MAGIC_HARP" },
    { val: "BELL", nm: "BELL" },
    { val: "BUGLE", nm: "BUGLE" },
    { val: "LEATHER_DRUM", nm: "LEATHER_DRUM" },
    { val: "DRUM_OF_EARTHQUAKE", nm: "DRUM_OF_EARTHQUAKE" },
    { val: "PICK_AXE", nm: "PICK_AXE" },
    { val: "GRAPPLING_HOOK", nm: "GRAPPLING_HOOK" },
    { val: "UNICORN_HORN", nm: "UNICORN_HORN" },
    { val: "CANDELABRUM_OF_INVOCATION", nm: "CANDELABRUM_OF_INVOCATION" },
    { val: "BELL_OF_OPENING", nm: "BELL_OF_OPENING" },
    { val: "TRIPE_RATION", nm: "TRIPE_RATION" },
    { val: "CORPSE", nm: "CORPSE" },
    { val: "EGG", nm: "EGG" },
    { val: "MEATBALL", nm: "MEATBALL" },
    { val: "MEAT_STICK", nm: "MEAT_STICK" },
    { val: "ENORMOUS_MEATBALL", nm: "ENORMOUS_MEATBALL" },
    { val: "MEAT_RING", nm: "MEAT_RING" },
    { val: "GLOB_OF_GRAY_OOZE", nm: "GLOB_OF_GRAY_OOZE" },
    { val: "GLOB_OF_BROWN_PUDDING", nm: "GLOB_OF_BROWN_PUDDING" },
    { val: "GLOB_OF_GREEN_SLIME", nm: "GLOB_OF_GREEN_SLIME" },
    { val: "GLOB_OF_BLACK_PUDDING", nm: "GLOB_OF_BLACK_PUDDING" },
    { val: "KELP_FROND", nm: "KELP_FROND" },
    { val: "EUCALYPTUS_LEAF", nm: "EUCALYPTUS_LEAF" },
    { val: "APPLE", nm: "APPLE" },
    { val: "ORANGE", nm: "ORANGE" },
    { val: "PEAR", nm: "PEAR" },
    { val: "MELON", nm: "MELON" },
    { val: "BANANA", nm: "BANANA" },
    { val: "CARROT", nm: "CARROT" },
    { val: "SPRIG_OF_WOLFSBANE", nm: "SPRIG_OF_WOLFSBANE" },
    { val: "CLOVE_OF_GARLIC", nm: "CLOVE_OF_GARLIC" },
    { val: "SLIME_MOLD", nm: "SLIME_MOLD" },
    { val: "LUMP_OF_ROYAL_JELLY", nm: "LUMP_OF_ROYAL_JELLY" },
    { val: "CREAM_PIE", nm: "CREAM_PIE" },
    { val: "CANDY_BAR", nm: "CANDY_BAR" },
    { val: "FORTUNE_COOKIE", nm: "FORTUNE_COOKIE" },
    { val: "PANCAKE", nm: "PANCAKE" },
    { val: "LEMBAS_WAFER", nm: "LEMBAS_WAFER" },
    { val: "CRAM_RATION", nm: "CRAM_RATION" },
    { val: "FOOD_RATION", nm: "FOOD_RATION" },
    { val: "K_RATION", nm: "K_RATION" },
    { val: "C_RATION", nm: "C_RATION" },
    { val: "TIN", nm: "TIN" },
    { val: "POT_GAIN_ABILITY", nm: "POT_GAIN_ABILITY" },
    { val: "POT_RESTORE_ABILITY", nm: "POT_RESTORE_ABILITY" },
    { val: "POT_CONFUSION", nm: "POT_CONFUSION" },
    { val: "POT_BLINDNESS", nm: "POT_BLINDNESS" },
    { val: "POT_PARALYSIS", nm: "POT_PARALYSIS" },
    { val: "POT_SPEED", nm: "POT_SPEED" },
    { val: "POT_LEVITATION", nm: "POT_LEVITATION" },
    { val: "POT_HALLUCINATION", nm: "POT_HALLUCINATION" },
    { val: "POT_INVISIBILITY", nm: "POT_INVISIBILITY" },
    { val: "POT_SEE_INVISIBLE", nm: "POT_SEE_INVISIBLE" },
    { val: "POT_HEALING", nm: "POT_HEALING" },
    { val: "POT_EXTRA_HEALING", nm: "POT_EXTRA_HEALING" },
    { val: "POT_GAIN_LEVEL", nm: "POT_GAIN_LEVEL" },
    { val: "POT_ENLIGHTENMENT", nm: "POT_ENLIGHTENMENT" },
    { val: "POT_MONSTER_DETECTION", nm: "POT_MONSTER_DETECTION" },
    { val: "POT_OBJECT_DETECTION", nm: "POT_OBJECT_DETECTION" },
    { val: "POT_GAIN_ENERGY", nm: "POT_GAIN_ENERGY" },
    { val: "POT_SLEEPING", nm: "POT_SLEEPING" },
    { val: "POT_FULL_HEALING", nm: "POT_FULL_HEALING" },
    { val: "POT_POLYMORPH", nm: "POT_POLYMORPH" },
    { val: "POT_BOOZE", nm: "POT_BOOZE" },
    { val: "POT_SICKNESS", nm: "POT_SICKNESS" },
    { val: "POT_FRUIT_JUICE", nm: "POT_FRUIT_JUICE" },
    { val: "POT_ACID", nm: "POT_ACID" },
    { val: "POT_OIL", nm: "POT_OIL" },
    { val: "POT_WATER", nm: "POT_WATER" },
    { val: "SCR_ENCHANT_ARMOR", nm: "SCR_ENCHANT_ARMOR" },
    { val: "SCR_DESTROY_ARMOR", nm: "SCR_DESTROY_ARMOR" },
    { val: "SCR_CONFUSE_MONSTER", nm: "SCR_CONFUSE_MONSTER" },
    { val: "SCR_SCARE_MONSTER", nm: "SCR_SCARE_MONSTER" },
    { val: "SCR_REMOVE_CURSE", nm: "SCR_REMOVE_CURSE" },
    { val: "SCR_ENCHANT_WEAPON", nm: "SCR_ENCHANT_WEAPON" },
    { val: "SCR_CREATE_MONSTER", nm: "SCR_CREATE_MONSTER" },
    { val: "SCR_TAMING", nm: "SCR_TAMING" },
    { val: "SCR_GENOCIDE", nm: "SCR_GENOCIDE" },
    { val: "SCR_LIGHT", nm: "SCR_LIGHT" },
    { val: "SCR_TELEPORTATION", nm: "SCR_TELEPORTATION" },
    { val: "SCR_GOLD_DETECTION", nm: "SCR_GOLD_DETECTION" },
    { val: "SCR_FOOD_DETECTION", nm: "SCR_FOOD_DETECTION" },
    { val: "SCR_IDENTIFY", nm: "SCR_IDENTIFY" },
    { val: "SCR_MAGIC_MAPPING", nm: "SCR_MAGIC_MAPPING" },
    { val: "SCR_AMNESIA", nm: "SCR_AMNESIA" },
    { val: "SCR_FIRE", nm: "SCR_FIRE" },
    { val: "SCR_EARTH", nm: "SCR_EARTH" },
    { val: "SCR_PUNISHMENT", nm: "SCR_PUNISHMENT" },
    { val: "SCR_CHARGING", nm: "SCR_CHARGING" },
    { val: "SCR_STINKING_CLOUD", nm: "SCR_STINKING_CLOUD" },
    { val: "SC01", nm: "SC01" },
    { val: "SC02", nm: "SC02" },
    { val: "SC03", nm: "SC03" },
    { val: "SC04", nm: "SC04" },
    { val: "SC05", nm: "SC05" },
    { val: "SC06", nm: "SC06" },
    { val: "SC07", nm: "SC07" },
    { val: "SC08", nm: "SC08" },
    { val: "SC09", nm: "SC09" },
    { val: "SC10", nm: "SC10" },
    { val: "SC11", nm: "SC11" },
    { val: "SC12", nm: "SC12" },
    { val: "SC13", nm: "SC13" },
    { val: "SC14", nm: "SC14" },
    { val: "SC15", nm: "SC15" },
    { val: "SC16", nm: "SC16" },
    { val: "SC17", nm: "SC17" },
    { val: "SC18", nm: "SC18" },
    { val: "SC19", nm: "SC19" },
    { val: "SC20", nm: "SC20" },
    { val: "SCR_MAIL", nm: "SCR_MAIL" },
    { val: "SCR_BLANK_PAPER", nm: "SCR_BLANK_PAPER" },
    { val: "SPE_DIG", nm: "SPE_DIG" },
    { val: "SPE_MAGIC_MISSILE", nm: "SPE_MAGIC_MISSILE" },
    { val: "SPE_FIREBALL", nm: "SPE_FIREBALL" },
    { val: "SPE_CONE_OF_COLD", nm: "SPE_CONE_OF_COLD" },
    { val: "SPE_SLEEP", nm: "SPE_SLEEP" },
    { val: "SPE_FINGER_OF_DEATH", nm: "SPE_FINGER_OF_DEATH" },
    { val: "SPE_LIGHT", nm: "SPE_LIGHT" },
    { val: "SPE_DETECT_MONSTERS", nm: "SPE_DETECT_MONSTERS" },
    { val: "SPE_HEALING", nm: "SPE_HEALING" },
    { val: "SPE_KNOCK", nm: "SPE_KNOCK" },
    { val: "SPE_FORCE_BOLT", nm: "SPE_FORCE_BOLT" },
    { val: "SPE_CONFUSE_MONSTER", nm: "SPE_CONFUSE_MONSTER" },
    { val: "SPE_CURE_BLINDNESS", nm: "SPE_CURE_BLINDNESS" },
    { val: "SPE_DRAIN_LIFE", nm: "SPE_DRAIN_LIFE" },
    { val: "SPE_SLOW_MONSTER", nm: "SPE_SLOW_MONSTER" },
    { val: "SPE_WIZARD_LOCK", nm: "SPE_WIZARD_LOCK" },
    { val: "SPE_CREATE_MONSTER", nm: "SPE_CREATE_MONSTER" },
    { val: "SPE_DETECT_FOOD", nm: "SPE_DETECT_FOOD" },
    { val: "SPE_CAUSE_FEAR", nm: "SPE_CAUSE_FEAR" },
    { val: "SPE_CLAIRVOYANCE", nm: "SPE_CLAIRVOYANCE" },
    { val: "SPE_CURE_SICKNESS", nm: "SPE_CURE_SICKNESS" },
    { val: "SPE_CHARM_MONSTER", nm: "SPE_CHARM_MONSTER" },
    { val: "SPE_HASTE_SELF", nm: "SPE_HASTE_SELF" },
    { val: "SPE_DETECT_UNSEEN", nm: "SPE_DETECT_UNSEEN" },
    { val: "SPE_LEVITATION", nm: "SPE_LEVITATION" },
    { val: "SPE_EXTRA_HEALING", nm: "SPE_EXTRA_HEALING" },
    { val: "SPE_RESTORE_ABILITY", nm: "SPE_RESTORE_ABILITY" },
    { val: "SPE_INVISIBILITY", nm: "SPE_INVISIBILITY" },
    { val: "SPE_DETECT_TREASURE", nm: "SPE_DETECT_TREASURE" },
    { val: "SPE_REMOVE_CURSE", nm: "SPE_REMOVE_CURSE" },
    { val: "SPE_MAGIC_MAPPING", nm: "SPE_MAGIC_MAPPING" },
    { val: "SPE_IDENTIFY", nm: "SPE_IDENTIFY" },
    { val: "SPE_TURN_UNDEAD", nm: "SPE_TURN_UNDEAD" },
    { val: "SPE_POLYMORPH", nm: "SPE_POLYMORPH" },
    { val: "SPE_TELEPORT_AWAY", nm: "SPE_TELEPORT_AWAY" },
    { val: "SPE_CREATE_FAMILIAR", nm: "SPE_CREATE_FAMILIAR" },
    { val: "SPE_CANCELLATION", nm: "SPE_CANCELLATION" },
    { val: "SPE_PROTECTION", nm: "SPE_PROTECTION" },
    { val: "SPE_JUMPING", nm: "SPE_JUMPING" },
    { val: "SPE_STONE_TO_FLESH", nm: "SPE_STONE_TO_FLESH" },
    { val: "SPE_CHAIN_LIGHTNING", nm: "SPE_CHAIN_LIGHTNING" },
    { val: "SPE_BLANK_PAPER", nm: "SPE_BLANK_PAPER" },
    { val: "SPE_NOVEL", nm: "SPE_NOVEL" },
    { val: "SPE_BOOK_OF_THE_DEAD", nm: "SPE_BOOK_OF_THE_DEAD" },
    { val: "WAN_LIGHT", nm: "WAN_LIGHT" },
    { val: "WAN_SECRET_DOOR_DETECTION", nm: "WAN_SECRET_DOOR_DETECTION" },
    { val: "WAN_ENLIGHTENMENT", nm: "WAN_ENLIGHTENMENT" },
    { val: "WAN_CREATE_MONSTER", nm: "WAN_CREATE_MONSTER" },
    { val: "WAN_WISHING", nm: "WAN_WISHING" },
    { val: "WAN_STASIS", nm: "WAN_STASIS" },
    { val: "WAN_NOTHING", nm: "WAN_NOTHING" },
    { val: "WAN_STRIKING", nm: "WAN_STRIKING" },
    { val: "WAN_MAKE_INVISIBLE", nm: "WAN_MAKE_INVISIBLE" },
    { val: "WAN_SLOW_MONSTER", nm: "WAN_SLOW_MONSTER" },
    { val: "WAN_SPEED_MONSTER", nm: "WAN_SPEED_MONSTER" },
    { val: "WAN_UNDEAD_TURNING", nm: "WAN_UNDEAD_TURNING" },
    { val: "WAN_POLYMORPH", nm: "WAN_POLYMORPH" },
    { val: "WAN_CANCELLATION", nm: "WAN_CANCELLATION" },
    { val: "WAN_TELEPORTATION", nm: "WAN_TELEPORTATION" },
    { val: "WAN_OPENING", nm: "WAN_OPENING" },
    { val: "WAN_LOCKING", nm: "WAN_LOCKING" },
    { val: "WAN_PROBING", nm: "WAN_PROBING" },
    { val: "WAN_DIGGING", nm: "WAN_DIGGING" },
    { val: "WAN_MAGIC_MISSILE", nm: "WAN_MAGIC_MISSILE" },
    { val: "WAN_FIRE", nm: "WAN_FIRE" },
    { val: "WAN_COLD", nm: "WAN_COLD" },
    { val: "WAN_SLEEP", nm: "WAN_SLEEP" },
    { val: "WAN_DEATH", nm: "WAN_DEATH" },
    { val: "WAN_LIGHTNING", nm: "WAN_LIGHTNING" },
    { val: "WAN1", nm: "WAN1" },
    { val: "WAN2", nm: "WAN2" },
    { val: "WAN3", nm: "WAN3" },
    { val: "GOLD_PIECE", nm: "GOLD_PIECE" },
    { val: "DILITHIUM_CRYSTAL", nm: "DILITHIUM_CRYSTAL" },
    { val: "DIAMOND", nm: "DIAMOND" },
    { val: "RUBY", nm: "RUBY" },
    { val: "JACINTH", nm: "JACINTH" },
    { val: "SAPPHIRE", nm: "SAPPHIRE" },
    { val: "BLACK_OPAL", nm: "BLACK_OPAL" },
    { val: "EMERALD", nm: "EMERALD" },
    { val: "TURQUOISE", nm: "TURQUOISE" },
    { val: "CITRINE", nm: "CITRINE" },
    { val: "AQUAMARINE", nm: "AQUAMARINE" },
    { val: "AMBER", nm: "AMBER" },
    { val: "TOPAZ", nm: "TOPAZ" },
    { val: "JET", nm: "JET" },
    { val: "OPAL", nm: "OPAL" },
    { val: "CHRYSOBERYL", nm: "CHRYSOBERYL" },
    { val: "GARNET", nm: "GARNET" },
    { val: "AMETHYST", nm: "AMETHYST" },
    { val: "JASPER", nm: "JASPER" },
    { val: "FLUORITE", nm: "FLUORITE" },
    { val: "OBSIDIAN", nm: "OBSIDIAN" },
    { val: "AGATE", nm: "AGATE" },
    { val: "JADE", nm: "JADE" },
    { val: "WORTHLESS_WHITE_GLASS", nm: "WORTHLESS_WHITE_GLASS" },
    { val: "WORTHLESS_BLUE_GLASS", nm: "WORTHLESS_BLUE_GLASS" },
    { val: "WORTHLESS_RED_GLASS", nm: "WORTHLESS_RED_GLASS" },
    { val: "WORTHLESS_YELLOWBROWN_GLASS", nm: "WORTHLESS_YELLOWBROWN_GLASS" },
    { val: "WORTHLESS_ORANGE_GLASS", nm: "WORTHLESS_ORANGE_GLASS" },
    { val: "WORTHLESS_YELLOW_GLASS", nm: "WORTHLESS_YELLOW_GLASS" },
    { val: "WORTHLESS_BLACK_GLASS", nm: "WORTHLESS_BLACK_GLASS" },
    { val: "WORTHLESS_GREEN_GLASS", nm: "WORTHLESS_GREEN_GLASS" },
    { val: "WORTHLESS_VIOLET_GLASS", nm: "WORTHLESS_VIOLET_GLASS" },
    { val: "LUCKSTONE", nm: "LUCKSTONE" },
    { val: "LOADSTONE", nm: "LOADSTONE" },
    { val: "TOUCHSTONE", nm: "TOUCHSTONE" },
    { val: "FLINT", nm: "FLINT" },
    { val: "ROCK", nm: "ROCK" },
    { val: "BOULDER", nm: "BOULDER" },
    { val: "STATUE", nm: "STATUE" },
    { val: "HEAVY_IRON_BALL", nm: "HEAVY_IRON_BALL" },
    { val: "IRON_CHAIN", nm: "IRON_CHAIN" },
    { val: "BLINDING_VENOM", nm: "BLINDING_VENOM" },
    { val: "ACID_VENOM", nm: "ACID_VENOM" },
    { val: "NUM_OBJECTS", nm: "NUM_OBJECTS" },
];

export const defsym_cmap_dump = [
    { val: "S_stone", nm: "S_stone" },
    { val: "S_vwall", nm: "S_vwall" },
    { val: "S_hwall", nm: "S_hwall" },
    { val: "S_tlcorn", nm: "S_tlcorn" },
    { val: "S_trcorn", nm: "S_trcorn" },
    { val: "S_blcorn", nm: "S_blcorn" },
    { val: "S_brcorn", nm: "S_brcorn" },
    { val: "S_crwall", nm: "S_crwall" },
    { val: "S_tuwall", nm: "S_tuwall" },
    { val: "S_tdwall", nm: "S_tdwall" },
    { val: "S_tlwall", nm: "S_tlwall" },
    { val: "S_trwall", nm: "S_trwall" },
    { val: "S_ndoor", nm: "S_ndoor" },
    { val: "S_vodoor", nm: "S_vodoor" },
    { val: "S_hodoor", nm: "S_hodoor" },
    { val: "S_vcdoor", nm: "S_vcdoor" },
    { val: "S_hcdoor", nm: "S_hcdoor" },
    { val: "S_bars", nm: "S_bars" },
    { val: "S_tree", nm: "S_tree" },
    { val: "S_room", nm: "S_room" },
    { val: "S_darkroom", nm: "S_darkroom" },
    { val: "S_engroom", nm: "S_engroom" },
    { val: "S_corr", nm: "S_corr" },
    { val: "S_litcorr", nm: "S_litcorr" },
    { val: "S_engrcorr", nm: "S_engrcorr" },
    { val: "S_upstair", nm: "S_upstair" },
    { val: "S_dnstair", nm: "S_dnstair" },
    { val: "S_upladder", nm: "S_upladder" },
    { val: "S_dnladder", nm: "S_dnladder" },
    { val: "S_brupstair", nm: "S_brupstair" },
    { val: "S_brdnstair", nm: "S_brdnstair" },
    { val: "S_brupladder", nm: "S_brupladder" },
    { val: "S_brdnladder", nm: "S_brdnladder" },
    { val: "S_altar", nm: "S_altar" },
    { val: "S_grave", nm: "S_grave" },
    { val: "S_throne", nm: "S_throne" },
    { val: "S_sink", nm: "S_sink" },
    { val: "S_fountain", nm: "S_fountain" },
    { val: "S_pool", nm: "S_pool" },
    { val: "S_ice", nm: "S_ice" },
    { val: "S_lava", nm: "S_lava" },
    { val: "S_lavawall", nm: "S_lavawall" },
    { val: "S_vodbridge", nm: "S_vodbridge" },
    { val: "S_hodbridge", nm: "S_hodbridge" },
    { val: "S_vcdbridge", nm: "S_vcdbridge" },
    { val: "S_hcdbridge", nm: "S_hcdbridge" },
    { val: "S_air", nm: "S_air" },
    { val: "S_cloud", nm: "S_cloud" },
    { val: "S_water", nm: "S_water" },
    { val: "S_arrow_trap", nm: "S_arrow_trap" },
    { val: "S_dart_trap", nm: "S_dart_trap" },
    { val: "S_falling_rock_trap", nm: "S_falling_rock_trap" },
    { val: "S_squeaky_board", nm: "S_squeaky_board" },
    { val: "S_bear_trap", nm: "S_bear_trap" },
    { val: "S_land_mine", nm: "S_land_mine" },
    { val: "S_rolling_boulder_trap", nm: "S_rolling_boulder_trap" },
    { val: "S_sleeping_gas_trap", nm: "S_sleeping_gas_trap" },
    { val: "S_rust_trap", nm: "S_rust_trap" },
    { val: "S_fire_trap", nm: "S_fire_trap" },
    { val: "S_pit", nm: "S_pit" },
    { val: "S_spiked_pit", nm: "S_spiked_pit" },
    { val: "S_hole", nm: "S_hole" },
    { val: "S_trap_door", nm: "S_trap_door" },
    { val: "S_teleportation_trap", nm: "S_teleportation_trap" },
    { val: "S_level_teleporter", nm: "S_level_teleporter" },
    { val: "S_magic_portal", nm: "S_magic_portal" },
    { val: "S_web", nm: "S_web" },
    { val: "S_statue_trap", nm: "S_statue_trap" },
    { val: "S_magic_trap", nm: "S_magic_trap" },
    { val: "S_anti_magic_trap", nm: "S_anti_magic_trap" },
    { val: "S_polymorph_trap", nm: "S_polymorph_trap" },
    { val: "S_vibrating_square", nm: "S_vibrating_square" },
    { val: "S_trapped_door", nm: "S_trapped_door" },
    { val: "S_trapped_chest", nm: "S_trapped_chest" },
    { val: "S_vbeam", nm: "S_vbeam" },
    { val: "S_hbeam", nm: "S_hbeam" },
    { val: "S_lslant", nm: "S_lslant" },
    { val: "S_rslant", nm: "S_rslant" },
    { val: "S_digbeam", nm: "S_digbeam" },
    { val: "S_flashbeam", nm: "S_flashbeam" },
    { val: "S_boomleft", nm: "S_boomleft" },
    { val: "S_boomright", nm: "S_boomright" },
    { val: "S_ss1", nm: "S_ss1" },
    { val: "S_ss2", nm: "S_ss2" },
    { val: "S_ss3", nm: "S_ss3" },
    { val: "S_ss4", nm: "S_ss4" },
    { val: "S_poisoncloud", nm: "S_poisoncloud" },
    { val: "S_goodpos", nm: "S_goodpos" },
    { val: "S_sw_tl", nm: "S_sw_tl" },
    { val: "S_sw_tc", nm: "S_sw_tc" },
    { val: "S_sw_tr", nm: "S_sw_tr" },
    { val: "S_sw_ml", nm: "S_sw_ml" },
    { val: "S_sw_mr", nm: "S_sw_mr" },
    { val: "S_sw_bl", nm: "S_sw_bl" },
    { val: "S_sw_bc", nm: "S_sw_bc" },
    { val: "S_sw_br", nm: "S_sw_br" },
    { val: "S_expl_tl", nm: "S_expl_tl" },
    { val: "S_expl_tc", nm: "S_expl_tc" },
    { val: "S_expl_tr", nm: "S_expl_tr" },
    { val: "S_expl_ml", nm: "S_expl_ml" },
    { val: "S_expl_mc", nm: "S_expl_mc" },
    { val: "S_expl_mr", nm: "S_expl_mr" },
    { val: "S_expl_bl", nm: "S_expl_bl" },
    { val: "S_expl_bc", nm: "S_expl_bc" },
    { val: "S_expl_br", nm: "S_expl_br" },
    { val: "MAXPCHARS", nm: "MAXPCHARS" },
];

export const defsym_mon_syms_dump = [
    { val: "S_ANT", nm: "S_ANT" },
    { val: "S_BLOB", nm: "S_BLOB" },
    { val: "S_COCKATRICE", nm: "S_COCKATRICE" },
    { val: "S_DOG", nm: "S_DOG" },
    { val: "S_EYE", nm: "S_EYE" },
    { val: "S_FELINE", nm: "S_FELINE" },
    { val: "S_GREMLIN", nm: "S_GREMLIN" },
    { val: "S_HUMANOID", nm: "S_HUMANOID" },
    { val: "S_IMP", nm: "S_IMP" },
    { val: "S_JELLY", nm: "S_JELLY" },
    { val: "S_KOBOLD", nm: "S_KOBOLD" },
    { val: "S_LEPRECHAUN", nm: "S_LEPRECHAUN" },
    { val: "S_MIMIC", nm: "S_MIMIC" },
    { val: "S_NYMPH", nm: "S_NYMPH" },
    { val: "S_ORC", nm: "S_ORC" },
    { val: "S_PIERCER", nm: "S_PIERCER" },
    { val: "S_QUADRUPED", nm: "S_QUADRUPED" },
    { val: "S_RODENT", nm: "S_RODENT" },
    { val: "S_SPIDER", nm: "S_SPIDER" },
    { val: "S_TRAPPER", nm: "S_TRAPPER" },
    { val: "S_UNICORN", nm: "S_UNICORN" },
    { val: "S_VORTEX", nm: "S_VORTEX" },
    { val: "S_WORM", nm: "S_WORM" },
    { val: "S_XAN", nm: "S_XAN" },
    { val: "S_LIGHT", nm: "S_LIGHT" },
    { val: "S_ZRUTY", nm: "S_ZRUTY" },
    { val: "S_ANGEL", nm: "S_ANGEL" },
    { val: "S_BAT", nm: "S_BAT" },
    { val: "S_CENTAUR", nm: "S_CENTAUR" },
    { val: "S_DRAGON", nm: "S_DRAGON" },
    { val: "S_ELEMENTAL", nm: "S_ELEMENTAL" },
    { val: "S_FUNGUS", nm: "S_FUNGUS" },
    { val: "S_GNOME", nm: "S_GNOME" },
    { val: "S_GIANT", nm: "S_GIANT" },
    { val: "S_invisible", nm: "S_invisible" },
    { val: "S_JABBERWOCK", nm: "S_JABBERWOCK" },
    { val: "S_KOP", nm: "S_KOP" },
    { val: "S_LICH", nm: "S_LICH" },
    { val: "S_MUMMY", nm: "S_MUMMY" },
    { val: "S_NAGA", nm: "S_NAGA" },
    { val: "S_OGRE", nm: "S_OGRE" },
    { val: "S_PUDDING", nm: "S_PUDDING" },
    { val: "S_QUANTMECH", nm: "S_QUANTMECH" },
    { val: "S_RUSTMONST", nm: "S_RUSTMONST" },
    { val: "S_SNAKE", nm: "S_SNAKE" },
    { val: "S_TROLL", nm: "S_TROLL" },
    { val: "S_UMBER", nm: "S_UMBER" },
    { val: "S_VAMPIRE", nm: "S_VAMPIRE" },
    { val: "S_WRAITH", nm: "S_WRAITH" },
    { val: "S_XORN", nm: "S_XORN" },
    { val: "S_YETI", nm: "S_YETI" },
    { val: "S_ZOMBIE", nm: "S_ZOMBIE" },
    { val: "S_HUMAN", nm: "S_HUMAN" },
    { val: "S_GHOST", nm: "S_GHOST" },
    { val: "S_GOLEM", nm: "S_GOLEM" },
    { val: "S_DEMON", nm: "S_DEMON" },
    { val: "S_EEL", nm: "S_EEL" },
    { val: "S_LIZARD", nm: "S_LIZARD" },
    { val: "S_WORM_TAIL", nm: "S_WORM_TAIL" },
    { val: "S_MIMIC_DEF", nm: "S_MIMIC_DEF" },
    { val: "MAXMCLASSES", nm: "MAXMCLASSES" },
];

export const defsym_mon_defchars_dump = [
    { val: "DEF_ANT", nm: "DEF_ANT" },
    { val: "DEF_BLOB", nm: "DEF_BLOB" },
    { val: "DEF_COCKATRICE", nm: "DEF_COCKATRICE" },
    { val: "DEF_DOG", nm: "DEF_DOG" },
    { val: "DEF_EYE", nm: "DEF_EYE" },
    { val: "DEF_FELINE", nm: "DEF_FELINE" },
    { val: "DEF_GREMLIN", nm: "DEF_GREMLIN" },
    { val: "DEF_HUMANOID", nm: "DEF_HUMANOID" },
    { val: "DEF_IMP", nm: "DEF_IMP" },
    { val: "DEF_JELLY", nm: "DEF_JELLY" },
    { val: "DEF_KOBOLD", nm: "DEF_KOBOLD" },
    { val: "DEF_LEPRECHAUN", nm: "DEF_LEPRECHAUN" },
    { val: "DEF_MIMIC", nm: "DEF_MIMIC" },
    { val: "DEF_NYMPH", nm: "DEF_NYMPH" },
    { val: "DEF_ORC", nm: "DEF_ORC" },
    { val: "DEF_PIERCER", nm: "DEF_PIERCER" },
    { val: "DEF_QUADRUPED", nm: "DEF_QUADRUPED" },
    { val: "DEF_RODENT", nm: "DEF_RODENT" },
    { val: "DEF_SPIDER", nm: "DEF_SPIDER" },
    { val: "DEF_TRAPPER", nm: "DEF_TRAPPER" },
    { val: "DEF_UNICORN", nm: "DEF_UNICORN" },
    { val: "DEF_VORTEX", nm: "DEF_VORTEX" },
    { val: "DEF_WORM", nm: "DEF_WORM" },
    { val: "DEF_XAN", nm: "DEF_XAN" },
    { val: "DEF_LIGHT", nm: "DEF_LIGHT" },
    { val: "DEF_ZRUTY", nm: "DEF_ZRUTY" },
    { val: "DEF_ANGEL", nm: "DEF_ANGEL" },
    { val: "DEF_BAT", nm: "DEF_BAT" },
    { val: "DEF_CENTAUR", nm: "DEF_CENTAUR" },
    { val: "DEF_DRAGON", nm: "DEF_DRAGON" },
    { val: "DEF_ELEMENTAL", nm: "DEF_ELEMENTAL" },
    { val: "DEF_FUNGUS", nm: "DEF_FUNGUS" },
    { val: "DEF_GNOME", nm: "DEF_GNOME" },
    { val: "DEF_GIANT", nm: "DEF_GIANT" },
    { val: "DEF_INVISIBLE", nm: "DEF_INVISIBLE" },
    { val: "DEF_JABBERWOCK", nm: "DEF_JABBERWOCK" },
    { val: "DEF_KOP", nm: "DEF_KOP" },
    { val: "DEF_LICH", nm: "DEF_LICH" },
    { val: "DEF_MUMMY", nm: "DEF_MUMMY" },
    { val: "DEF_NAGA", nm: "DEF_NAGA" },
    { val: "DEF_OGRE", nm: "DEF_OGRE" },
    { val: "DEF_PUDDING", nm: "DEF_PUDDING" },
    { val: "DEF_QUANTMECH", nm: "DEF_QUANTMECH" },
    { val: "DEF_RUSTMONST", nm: "DEF_RUSTMONST" },
    { val: "DEF_SNAKE", nm: "DEF_SNAKE" },
    { val: "DEF_TROLL", nm: "DEF_TROLL" },
    { val: "DEF_UMBER", nm: "DEF_UMBER" },
    { val: "DEF_VAMPIRE", nm: "DEF_VAMPIRE" },
    { val: "DEF_WRAITH", nm: "DEF_WRAITH" },
    { val: "DEF_XORN", nm: "DEF_XORN" },
    { val: "DEF_YETI", nm: "DEF_YETI" },
    { val: "DEF_ZOMBIE", nm: "DEF_ZOMBIE" },
    { val: "DEF_HUMAN", nm: "DEF_HUMAN" },
    { val: "DEF_GHOST", nm: "DEF_GHOST" },
    { val: "DEF_GOLEM", nm: "DEF_GOLEM" },
    { val: "DEF_DEMON", nm: "DEF_DEMON" },
    { val: "DEF_EEL", nm: "DEF_EEL" },
    { val: "DEF_LIZARD", nm: "DEF_LIZARD" },
    { val: "DEF_WORM_TAIL", nm: "DEF_WORM_TAIL" },
    { val: "DEF_MIMIC_DEF", nm: "DEF_MIMIC_DEF" },
];

export const objclass_defchars_dump = [
    { val: "ILLOBJ_SYM", nm: "ILLOBJ_SYM" },
    { val: "WEAPON_SYM", nm: "WEAPON_SYM" },
    { val: "ARMOR_SYM", nm: "ARMOR_SYM" },
    { val: "RING_SYM", nm: "RING_SYM" },
    { val: "AMULET_SYM", nm: "AMULET_SYM" },
    { val: "TOOL_SYM", nm: "TOOL_SYM" },
    { val: "FOOD_SYM", nm: "FOOD_SYM" },
    { val: "POTION_SYM", nm: "POTION_SYM" },
    { val: "SCROLL_SYM", nm: "SCROLL_SYM" },
    { val: "SPBOOK_SYM", nm: "SPBOOK_SYM" },
    { val: "WAND_SYM", nm: "WAND_SYM" },
    { val: "GOLD_SYM", nm: "GOLD_SYM" },
    { val: "GEM_SYM", nm: "GEM_SYM" },
    { val: "ROCK_SYM", nm: "ROCK_SYM" },
    { val: "BALL_SYM", nm: "BALL_SYM" },
    { val: "CHAIN_SYM", nm: "CHAIN_SYM" },
    { val: "VENOM_SYM", nm: "VENOM_SYM" },
];

export const objclass_classes_dump = [
    { val: "ILLOBJ_CLASS", nm: "ILLOBJ_CLASS" },
    { val: "WEAPON_CLASS", nm: "WEAPON_CLASS" },
    { val: "ARMOR_CLASS", nm: "ARMOR_CLASS" },
    { val: "RING_CLASS", nm: "RING_CLASS" },
    { val: "AMULET_CLASS", nm: "AMULET_CLASS" },
    { val: "TOOL_CLASS", nm: "TOOL_CLASS" },
    { val: "FOOD_CLASS", nm: "FOOD_CLASS" },
    { val: "POTION_CLASS", nm: "POTION_CLASS" },
    { val: "SCROLL_CLASS", nm: "SCROLL_CLASS" },
    { val: "SPBOOK_CLASS", nm: "SPBOOK_CLASS" },
    { val: "WAND_CLASS", nm: "WAND_CLASS" },
    { val: "COIN_CLASS", nm: "COIN_CLASS" },
    { val: "GEM_CLASS", nm: "GEM_CLASS" },
    { val: "ROCK_CLASS", nm: "ROCK_CLASS" },
    { val: "BALL_CLASS", nm: "BALL_CLASS" },
    { val: "CHAIN_CLASS", nm: "CHAIN_CLASS" },
    { val: "VENOM_CLASS", nm: "VENOM_CLASS" },
    { val: "MAXOCLASSES", nm: "MAXOCLASSES" },
];

export const objclass_syms_dump = [
    { val: "S_strange_obj", nm: "S_strange_obj" },
    { val: "S_weapon", nm: "S_weapon" },
    { val: "S_armor", nm: "S_armor" },
    { val: "S_ring", nm: "S_ring" },
    { val: "S_amulet", nm: "S_amulet" },
    { val: "S_tool", nm: "S_tool" },
    { val: "S_food", nm: "S_food" },
    { val: "S_potion", nm: "S_potion" },
    { val: "S_scroll", nm: "S_scroll" },
    { val: "S_book", nm: "S_book" },
    { val: "S_wand", nm: "S_wand" },
    { val: "S_coin", nm: "S_coin" },
    { val: "S_gem", nm: "S_gem" },
    { val: "S_rock", nm: "S_rock" },
    { val: "S_ball", nm: "S_ball" },
    { val: "S_chain", nm: "S_chain" },
    { val: "S_venom", nm: "S_venom" },
];

export const arti_enum_dump = [
    { val: "ART_NONARTIFACT", nm: "ART_NONARTIFACT" },
    { val: "ART_EXCALIBUR", nm: "ART_EXCALIBUR" },
    { val: "ART_STORMBRINGER", nm: "ART_STORMBRINGER" },
    { val: "ART_MJOLLNIR", nm: "ART_MJOLLNIR" },
    { val: "ART_CLEAVER", nm: "ART_CLEAVER" },
    { val: "ART_GRIMTOOTH", nm: "ART_GRIMTOOTH" },
    { val: "ART_ORCRIST", nm: "ART_ORCRIST" },
    { val: "ART_STING", nm: "ART_STING" },
    { val: "ART_MAGICBANE", nm: "ART_MAGICBANE" },
    { val: "ART_FROST_BRAND", nm: "ART_FROST_BRAND" },
    { val: "ART_FIRE_BRAND", nm: "ART_FIRE_BRAND" },
    { val: "ART_DRAGONBANE", nm: "ART_DRAGONBANE" },
    { val: "ART_DEMONBANE", nm: "ART_DEMONBANE" },
    { val: "ART_WEREBANE", nm: "ART_WEREBANE" },
    { val: "ART_GRAYSWANDIR", nm: "ART_GRAYSWANDIR" },
    { val: "ART_GIANTSLAYER", nm: "ART_GIANTSLAYER" },
    { val: "ART_OGRESMASHER", nm: "ART_OGRESMASHER" },
    { val: "ART_TROLLSBANE", nm: "ART_TROLLSBANE" },
    { val: "ART_VORPAL_BLADE", nm: "ART_VORPAL_BLADE" },
    { val: "ART_SNICKERSNEE", nm: "ART_SNICKERSNEE" },
    { val: "ART_SUNSWORD", nm: "ART_SUNSWORD" },
    { val: "ART_ORB_OF_DETECTION", nm: "ART_ORB_OF_DETECTION" },
    { val: "ART_HEART_OF_AHRIMAN", nm: "ART_HEART_OF_AHRIMAN" },
    { val: "ART_SCEPTRE_OF_MIGHT", nm: "ART_SCEPTRE_OF_MIGHT" },
    { val: "ART_STAFF_OF_AESCULAPIUS", nm: "ART_STAFF_OF_AESCULAPIUS" },
    { val: "ART_MAGIC_MIRROR_OF_MERLIN", nm: "ART_MAGIC_MIRROR_OF_MERLIN" },
    { val: "ART_EYES_OF_THE_OVERWORLD", nm: "ART_EYES_OF_THE_OVERWORLD" },
    { val: "ART_MITRE_OF_HOLINESS", nm: "ART_MITRE_OF_HOLINESS" },
    { val: "ART_LONGBOW_OF_DIANA", nm: "ART_LONGBOW_OF_DIANA" },
    { val: "ART_MASTER_KEY_OF_THIEVERY", nm: "ART_MASTER_KEY_OF_THIEVERY" },
    { val: "ART_TSURUGI_OF_MURAMASA", nm: "ART_TSURUGI_OF_MURAMASA" },
    { val: "ART_YENDORIAN_EXPRESS_CARD", nm: "ART_YENDORIAN_EXPRESS_CARD" },
    { val: "ART_ORB_OF_FATE", nm: "ART_ORB_OF_FATE" },
    { val: "ART_EYE_OF_THE_AETHIOPICA", nm: "ART_EYE_OF_THE_AETHIOPICA" },
    { val: "AFTER_LAST_ARTIFACT", nm: "AFTER_LAST_ARTIFACT" },
];

export const mcastu_enum_dump = [
    { val: "MCAST_DUMPENUM_PSI_BOLT", nm: "PSI_BOLT" },
    { val: "MCAST_DUMPENUM_OPEN_WOUNDS", nm: "OPEN_WOUNDS" },
    { val: "MCAST_DUMPENUM_CURE_SELF", nm: "CURE_SELF" },
    { val: "MCAST_DUMPENUM_HASTE_SELF", nm: "HASTE_SELF" },
    { val: "MCAST_DUMPENUM_CONFUSE_YOU", nm: "CONFUSE_YOU" },
    { val: "MCAST_DUMPENUM_STUN_YOU", nm: "STUN_YOU" },
    { val: "MCAST_DUMPENUM_DISAPPEAR", nm: "DISAPPEAR" },
    { val: "MCAST_DUMPENUM_PARALYZE", nm: "PARALYZE" },
    { val: "MCAST_DUMPENUM_BLIND_YOU", nm: "BLIND_YOU" },
    { val: "MCAST_DUMPENUM_WEAKEN_YOU", nm: "WEAKEN_YOU" },
    { val: "MCAST_DUMPENUM_DESTRY_ARMR", nm: "DESTRY_ARMR" },
    { val: "MCAST_DUMPENUM_INSECTS", nm: "INSECTS" },
    { val: "MCAST_DUMPENUM_CURSE_ITEMS", nm: "CURSE_ITEMS" },
    { val: "MCAST_DUMPENUM_LIGHTNING", nm: "LIGHTNING" },
    { val: "MCAST_DUMPENUM_FIRE_PILLAR", nm: "FIRE_PILLAR" },
    { val: "MCAST_DUMPENUM_GEYSER", nm: "GEYSER" },
    { val: "MCAST_DUMPENUM_AGGRAVATION", nm: "AGGRAVATION" },
    { val: "MCAST_DUMPENUM_SUMMON_MONS", nm: "SUMMON_MONS" },
    { val: "MCAST_DUMPENUM_CLONE_WIZ", nm: "CLONE_WIZ" },
    { val: "MCAST_DUMPENUM_DEATH_TOUCH", nm: "DEATH_TOUCH" },
];

export function dump_enums()
{
    const monsters_enum = 0, objects_enum = 1, objects_misc_enum = 2,
          defsym_cmap_enum = 3, defsym_mon_syms_enum = 4, defsym_mon_defchars_enum = 5,
          objclass_defchars_enum = 6, objclass_classes_enum = 7, objclass_syms_enum = 8,
          arti_enum = 9, mcastu_enum = 10, NUM_ENUM_DUMPS = 11;
    const omdump = [
        { val: C.LAST_GENERIC, nm: "LAST_GENERIC" },
        { val: C.OBJCLASS_HACK, nm: "OBJCLASS_HACK" },
        { val: C.FIRST_OBJECT, nm: "FIRST_OBJECT" },
        { val: C.FIRST_AMULET, nm: "FIRST_AMULET" },
        { val: C.LAST_AMULET, nm: "LAST_AMULET" },
        { val: C.FIRST_SPELL, nm: "FIRST_SPELL" },
        { val: C.LAST_SPELL, nm: "LAST_SPELL" },
        { val: C.MAXSPELL, nm: "MAXSPELL" },
        { val: C.FIRST_REAL_GEM, nm: "FIRST_REAL_GEM" },
        { val: C.LAST_REAL_GEM, nm: "LAST_REAL_GEM" },
        { val: C.FIRST_GLASS_GEM, nm: "FIRST_GLASS_GEM" },
        { val: C.LAST_GLASS_GEM, nm: "LAST_GLASS_GEM" },
        { val: C.NUM_REAL_GEMS, nm: "NUM_REAL_GEMS" },
        { val: C.NUM_GLASS_GEMS, nm: "NUM_GLASS_GEMS" },
        { val: C.MAX_GLYPH, nm: "MAX_GLYPH" },
    ];

    const ed = [
        C.monsdump, C.objdump, omdump,
        C.defsym_cmap_dump, C.defsym_mon_syms_dump,
        C.defsym_mon_defchars_dump,
        C.objclass_defchars_dump,
        C.objclass_classes_dump,
        C.objclass_syms_dump,
        C.arti_enum_dump,
        C.mcastu_enum_dump,
    ];

    const edmp = [
        { title: "monnums", pfx: "PM_", unprefixed_count: 5, dumpflgs: 0, szd: C.monsdump.length },
        { title: "objects_nums", pfx: "", unprefixed_count: 1, dumpflgs: 0, szd: C.objdump.length },
        { title: "misc_object_nums", pfx: "", unprefixed_count: 1, dumpflgs: 0, szd: omdump.length },
        { title: "cmap_symbols", pfx: "", unprefixed_count: 1, dumpflgs: 0, szd: C.defsym_cmap_dump.length },
        { title: "mon_syms", pfx: "", unprefixed_count: 1, dumpflgs: 0, szd: C.defsym_mon_syms_dump.length },
        { title: "mon_defchars", pfx: "", unprefixed_count: 1, dumpflgs: 1, szd: C.defsym_mon_defchars_dump.length },
        { title: "objclass_defchars", pfx: "", unprefixed_count: 1, dumpflgs: 1, szd: C.objclass_defchars_dump.length },
        { title: "objclass_classes", pfx: "", unprefixed_count: 1, dumpflgs: 0, szd: C.objclass_classes_dump.length },
        { title: "objclass_syms", pfx: "", unprefixed_count: 1, dumpflgs: 0, szd: C.objclass_syms_dump.length },
        { title: "artifacts_nums", pfx: "", unprefixed_count: 1, dumpflgs: 0, szd: C.arti_enum_dump.length },
        { title: "mcast_spells", pfx: "MCAST_", unprefixed_count: 0, dumpflgs: 0, szd: C.mcastu_enum_dump.length },
    ];

    let nmprefix;
    let i, j, nmwidth;
    let comment = C.stackAlloc(C.BUFSZ);

    for (i = 0; i < NUM_ENUM_DUMPS; ++ i) {
        C.raw_printf("enum %s = {", edmp[i].title);
        for (j = 0; j < edmp[i].szd; ++j) {
            nmprefix = (j >= edmp[i].szd - edmp[i].unprefixed_count)
                           ? "" : edmp[i].pfx; /* "" or "PM_" */
            nmwidth = 27 - C.int(C.strlen(nmprefix)); /* 27 or 24 */
            if (edmp[i].dumpflgs > 0) {
                C.Snprintf(comment, C.BUFSZ,
                         "    /* '%c' */",
                         (ed[i][j].val >= 32 && ed[i][j].val <= 126)
                         ? ed[i][j].val : 32);
            } else {
                C.storeChar(comment, 0);
            }
            C.raw_printf("    %s%*s = %3d,%s",
                       nmprefix, -nmwidth,
                       ed[i][j].nm, ed[i][j].val,
                       comment);
       }
        C.raw_print("};");
        C.raw_print("");
    }
    C.raw_print("");
}

export function dump_glyphids()
{
    C.dump_all_glyphids(C.stdout);
}

/*allmain.c*/



// Original comments for inactive CPP branches and declaration annotations.
/* -x:value could work but is not supported (callers don't expect it) \
       */
/* past ':' of "-w:foo" */
/* CHDIR */
/* NetHackW can also support WINDOWPORT(curses) now, so check */
/*FALLTHRU*/
/* 0 = dump numerically only, 1 = add 'char' comment */
/* NODUMPENUMS */
/* !NODUMPENUMS */
