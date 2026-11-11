/* NetHack 5.0	earlyarg.c	$NHDT-Date: 1771213100 2026/02/15 19:38:20 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.286 $ */
/* Copyright (c) Robert Patrick Rankin, 2012. */
/* NetHack may be freely redistributed.  See license for details. */

// #include "hack.h"
// #include "dlb.h"





 
 
 








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

const earlyopts = static_array("earlyopts", struct_early_opt, null, [
    { e: ARG_DEBUG, name: _("debug"), minlength: 5, valallowed: TRUE },
    { e: ARG_VERSION, name: _("version"), minlength: 4, valallowed: TRUE },
    { e: ARG_SHOWPATHS, name: _("showpaths"), minlength: 8, valallowed: FALSE },

    { e: ARG_DUMPENUMS, name: _("dumpenums"), minlength: 9, valallowed: FALSE },

    { e: ARG_DUMPGLYPHIDS, name: _("dumpglyphids"), minlength: 12, valallowed: FALSE },
    { e: ARG_DUMPMONGEN, name: _("dumpmongen"), minlength: 10, valallowed: FALSE },
    { e: ARG_DUMPWEIGHTS, name: _("dumpweights"), minlength: 11, valallowed: FALSE },






]);

const ArgVal_novalue = init_string(static_array("ArgVal_novalue", char, sizeof_string("[nothing]")), _("[nothing]"), true); /* note: not 'const' */


    const ArgValRequired = 0;
    const ArgValOptional = 1;
    const ArgValDisallowed = 2;
    const ArgVal_mask = (1 | 2);
    const ArgNamOneLetter = 4;
    const ArgNam_mask = 4;
    const ArgErrSilent = 0;
    const ArgErrComplain = 8;
    const ArgErr_mask = 8;


/* approximate 'getopt_long()' for one option; all the comments refer to
   "-windowtype" but the code isn't specific to that  */
function /* char * */
lopt(arg,
     lflags,
     optname,
     origarg,
     argc_p,
     argv_p)      /* argv[] ditto */
{ let $goto = null;
    var argc = argc_p[0];
    var argv = argv_p[0];
    var p, nextarg = (argc > 1 && chars[argv[1] + 0] != ord('-')) ? argv[1] : 0;
    var l, opttype = (lflags & ArgVal_mask);
    var oneletterok = (+((lflags & ArgNam_mask) == ArgNamOneLetter)),
            complain = (+((lflags & ArgErr_mask) == ArgErrComplain));

    /* first letter must match */
    $goto_loptbail: for (;;) { switch ($goto) { default: case "loptbail": case "loptnotallowed": case "loptrequired": if ($goto || (chars[arg + 1] != chars[optname + 1])) {
    switch ($goto) { default: case "loptbail": $goto = null;
        if (complain)
            config_error_add(_("Unknown option: %.60s"), origarg);
        return 0;
    case "loptnotallowed": $goto = null;
        if (complain)
            config_error_add(_("Value not allowed: %.60s"), origarg);
        return 0;
    case "loptrequired": $goto = null;
        if (complain)
            config_error_add(_("Missing required value: %.60s"), origarg); }
        return 0;
    }

    if ((p = strchr(arg, ord('='))) == 0)
        p = strchr(arg, ord(':'));
    if (p && opttype == ArgValDisallowed)
        { $goto = "loptnotallowed"; continue $goto_loptbail; };

    l = int((p ? (p - arg) : strlen(arg)));
    if ((l > 2 || oneletterok) && !strncmp(arg, optname, unsigned(l))) {
        /* "-windowtype[=foo]" */
        if (p)
            ++p; /* past '=' or ':' */
        else if (opttype == ArgValRequired)
            p = eos(arg); /* we have "-w[indowtype]" w/o "=foo"
                           * so we'll take foo from next element */
        else
            return ArgVal_novalue;
    } else if (oneletterok) {
        /* "-w..." but not "-w[indowtype[=foo]]" */
        if (!p) {
            p = arg + 2; /* past 'w' of "-wfoo" */





        } else {
            /* "-w...=foo" but not "-w[indowtype]=foo" */
            { $goto = "loptbail"; continue $goto_loptbail; }
        }
    } else {
        { $goto = "loptbail"; continue $goto_loptbail; }
    }
    if (!p || !chars[p]) {
        /* "-w[indowtype]" w/o '='/':' if there is a next element, use
           it for "foo"; if not, supply a non-Null bogus value */
        if (nextarg
            && (opttype == ArgValRequired || opttype == ArgValOptional))
            p = nextarg, --(argc_p[0]), (argv_p[0]) = (argv_p[0]).subarray(1);
        else if (opttype == ArgValRequired)
            { $goto = "loptrequired"; continue $goto_loptbail; }
        else
            p = ArgVal_novalue; /* there is no next element */
    } } break; }
    return p;
}
/* move argv[ndx] to end of argv[] array, then reduce argc to hide it;
   prevents process_options() from encountering it after early_options()
   has processed it; elements get reordered but all remain intact */
function /* void */
consume_arg(ndx, ac_p, av_p)
{
    let gone, av = av_p[0];
    let i, ac = ac_p[0];

    /* "-one -two -three -four" -> "-two -three -four -one" */
    if (ac > 2) {
        gone = av[ndx];
        for (i = ndx + 1; i < ac; ++i)
            av[i - 1] = av[i];
        av[ac - 1] = gone;
    }
    --(ac_p[0]);
}

/* consume two tokens for '-argname value' w/o '=' or ':' */
function /* void */
consume_two_args(ndx, ac_p, av_p)
{
    /* when consuming "-two arg" from "-two arg -three -four",
       the *ac_p manipulation results in "-three -four -two arg"
       rather than the "-three -four arg -two" that would happen
       with just two ordinary consume_arg() calls */
    consume_arg(ndx, ac_p, av_p);
    ++(ac_p[0]); /* bring the final slot back into view */
    consume_arg(ndx, ac_p, av_p);
    --(ac_p[0]); /* take away restored slot */
}

/* process some command line arguments before loading options */
export function /* void */
early_options(argc_p, argv_p, hackdir_p)
{ const $frame = stack_frame(); try {
    let argv = stack_var(ptr_to(ptr_to(char))), arg, origarg;
    let argc = stack_var(int), oldargc, ndx = 0, consumed = 0;


    if (argcheck(argc_p[0], argv_p[0], ARG_DUMPGLYPHIDS) == 2)
        opt_terminate();


    config_error_init(FALSE, _("command line"), FALSE);

    /* treat "nethack ?" as a request for usage info; due to shell
       processing, player likely has to use "nethack \?" or "nethack '?'"
       [won't work if used as "nethack -dpath ?" or "nethack -d path ?"] */
    if (argc_p[0] > 1 && !strcmp((argv_p[0])[1], _("?")))
        opt_usage(hackdir_p[0]); /* doesn't return */

    /*
     * Both *argc_p and *argv_p account for the program name as (*argv_p)[0];
     * local argc and argv implicitly discard that (by starting 'ndx' at 1).
     * argcheck() doesn't mind, prscore() (via scores_only()) does (for the
     * number of args it gets passed, not for the value of argv[0]).
     */
    for (ndx = 1; ndx < argc_p[0]; ndx += (consumed ? 0 : 1)) {
        consumed = 0;
        argc[0] = argc_p[0] - ndx;
        argv[0] = argv_p[0].subarray(ndx);

        arg = origarg = argv[0][0];
        /* skip any args intended for deferred options */
        if (chars[arg] != ord('-'))
            continue;
        /* allow second dash if arg name is longer than one character */
        if (chars[arg + 0] == ord('-') && chars[arg + 1] == ord('-') && chars[arg + 2] != ord('\0')
            && (chars[arg + 3] != ord('\0') && chars[arg + 3] != ord('=') && chars[arg + 3] != ord(':')))
            ++arg;

        switch (chars[arg + 1]) { /* char after leading dash */
        case ord('b'):







            break;
        case ord('d'):
            if (argcheck(argc[0], argv[0], ARG_DEBUG) == 1) {
                consume_arg(ndx, argc_p, argv_p), consumed = 1;

            } else if (argcheck(argc[0], argv[0], ARG_DUMPENUMS) == 2) {
                opt_terminate();
                /*NOTREACHED*/

            } else if (argcheck(argc[0], argv[0], ARG_DUMPMONGEN) == 2) {
                opt_terminate();
                /*NOTREACHED*/
            } else if (argcheck(argc[0], argv[0], ARG_DUMPWEIGHTS) == 2) {
                opt_terminate();
                /*NOTREACHED*/
            } else {

                oldargc = argc[0];
                arg = lopt(arg,
                           (ArgValRequired | ArgNamOneLetter | ArgErrSilent),
                           _("-directory"), origarg, argc, argv);
                if (!arg)
                    error(_("Flag -d must be followed by a directory name."));
                if (chars[arg] != ord('e')) { /* avoid matching -decgraphics or -debug */
                    hackdir_p[0] = arg;
                    if (oldargc == argc[0])
                        consume_arg(ndx, argc_p, argv_p), consumed = 1;
                    else
                        consume_two_args(ndx, argc_p, argv_p), consumed = 2;
                }

            }
            break;
        case ord('h'):
        case ord('?'):
            if (lopt(arg, ArgValDisallowed, _("-help"), origarg, argc, argv)
                || lopt(arg, ArgValDisallowed | ArgNamOneLetter, _("-?"),
                        origarg, argc, argv))
                opt_usage(hackdir_p[0]); /* doesn't return */
            break;
        case ord('n'):
            oldargc = argc[0];
            if (!strcmp(arg, _("-no-nethackrc"))) /* no abbreviation allowed */
                arg = nhStr(_("/dev/null"));
            else
                arg = lopt(arg, (ArgValRequired | ArgErrComplain),
                           _("-nethackrc"), origarg, argc, argv);
            if (arg) {
                gc.cmdline_rcfile = dupstr(arg);
                if (oldargc == argc[0])
                    consume_arg(ndx, argc_p, argv_p), consumed = 1;
                else
                    consume_two_args(ndx, argc_p, argv_p), consumed = 2;
            }
            break;
        case ord('s'):
            if (argcheck(argc[0], argv[0], ARG_SHOWPATHS) == 2) {
                gd.deferred_showpaths = TRUE;
                gd.deferred_showpaths_dir = hackdir_p[0];
                config_error_done();
                return;
            }
            /* check for "-s" request to show scores */
            if (lopt(arg,
                     ((ArgValDisallowed | ArgErrComplain)
                      /* only accept one-letter if there is just one
                         dash; reject "--s" because prscore() via
                         scores_only() doesn't understand it */
                      | ((chars[origarg + 1] != ord('-')) ? ArgNamOneLetter : 0)),
                     /* [ought to omit val-disallowed and accept
                        --scores=foo since -s foo and -sfoo are
                        allowed, but -s form can take more than one
                        space-separated argument and --scores=foo
                        isn't suited for that] */
                     _("-scores"), origarg, argc, argv)) {
                /* at this point, argv[0] contains "-scores" or a leading
                   substring of it; prscore() (via scores_only()) expects
                   that to be in argv[1] so we adjust the pointer to make
                   that be the case; if there are any non-early args waiting
                   to be passed along to process_options(), the resulting
                   argv[0] will be one of those rather than the program
                   name but prscore() doesn't care */
                scores_only(argc[0] + 1, ref_add(argv[0], -1), hackdir_p[0]);
                /*NOTREACHED*/
            }
            break;
        case ord('u'):

            if (lopt(arg, ArgValDisallowed, _("-usage"), origarg, argc, argv))
                opt_usage(hackdir_p[0]);













            break;
        case ord('v'):
            if (argcheck(argc[0], argv[0], ARG_VERSION) == 2) {
                opt_terminate();
                /*NOTREACHED*/
            }
            break;
        case ord('w'): /* windowtype: "-wfoo" or "-w[indowtype]=foo"
                   * or "-w[indowtype]:foo" or "-w[indowtype] foo" */
            arg =
                lopt(arg, (ArgValRequired | ArgNamOneLetter | ArgErrComplain),
                     _("-windowtype"), origarg, argc, argv);
            if (gc.cmdline_windowsys)
                free(gc.cmdline_windowsys);
            gc.cmdline_windowsys = arg ? dupstr(arg) : 0;
            break;
 







        default:
            break;
        }
    }
    /* empty or "N errors on command line" */
    config_error_done();
    return;
} finally { stack_pop($frame); } }
/* for command-line options that perform some immediate action and then
   terminate the program without starting play, like 'nethack --version'
   or 'nethack -s Zelda'; do some cleanup before that termination */
 function /* void */
opt_terminate()
{
    program_state.early_options = 0;
    config_error_done(); /* free memory allocated by config_error_init() */

    nh_terminate(EXIT_SUCCESS);
    /*NOTREACHED*/
}

 function /* void */
opt_usage(hackdir)
{

    chdirx(hackdir, TRUE);



    ;

    genl_display_file(_(USAGEHELP), TRUE);
    opt_terminate();
}
/* show the sysconf file name, playground directory, run-time configuration
   file name, dumplog file name if applicable, and some other things */
 export function /* void */
after_opt_showpaths(dir)
{

    chdirx(dir, FALSE);



    opt_terminate();
    /*NOTREACHED*/
}

/* handle "-s <score options> [character-names]" to show all the entries
   in the high scores file ('record') belonging to particular characters;
   nethack will end after doing so without starting play */
 function /* void */
scores_only(argc, argv, dir)
{
    /* do this now rather than waiting for final termination, in case there
       is an error summary coming */
    config_error_done();


    chdirx(dir, FALSE);




    iflags.initoptions_noterminate = TRUE;
    initoptions(); /* sysconf options affect whether panictrace is enabled */
    iflags.initoptions_noterminate = FALSE;








    void whoami(); /* set up default plname[] */

    prscore(argc, argv);







    nh_terminate(EXIT_SUCCESS); /* bypass opt_terminate() */
    /*NOTREACHED*/
}

/*
 * Returns:
 *    0 = no match
 *    1 = found and skip past this argument
 *    2 = found and trigger immediate exit
 */
export function /* int */
argcheck(argc, argv, e_arg)
{
    let i, idx;
    let match = FALSE;
    let userea = 0;
    let dashdash = _("");

    for (idx = 0; idx < SIZE(earlyopts); idx++) {
        if (earlyopts[idx].e == e_arg){
            break;
        }
    }
    if (idx >= SIZE(earlyopts) || argc < 1)
        return 0;

    for (i = 0; i < argc; ++i) {
        if (chars[argv[i] + 0] != ord('-'))
            continue;
        if (chars[argv[i] + 1] == ord('-')) {
            userea = argv[i] + 2;
            dashdash = _("-");
        } else {
            userea = argv[i] + 1;
        }
        match = match_optname(userea, earlyopts[idx].name,
                              earlyopts[idx].minlength,
                              earlyopts[idx].valallowed);
        if (match)
            break;
    }

    if (match) {
        let extended_opt = strchr(userea, ord(':'));

        if (!extended_opt)
            extended_opt = strchr(userea, ord('='));
        switch(e_arg) {
        case ARG_DEBUG:
            if (extended_opt) {
                let cpy_extended_opt;

                cpy_extended_opt = dupstr(extended_opt);
                debug_fields(cpy_extended_opt + 1);
                free(cpy_extended_opt);
            }
            return 1;
        case ARG_VERSION: {
            let insert_into_pastebuf = FALSE;

            if (extended_opt) {
                extended_opt++;
                    /* Deprecated in favor of "copy" - remove no later
                       than  next major version */
                if (match_optname(extended_opt, _("paste"), 5, FALSE)) {
                    insert_into_pastebuf = TRUE;
                } else if (match_optname(extended_opt, _("copy"), 4, FALSE)) {
                    insert_into_pastebuf = TRUE;
                } else if (match_optname(extended_opt, _("dump"), 4, FALSE)) {
                    /* version number plus enabled features and sanity
                       values that the program compares against the same
                       thing recorded in save and bones files to check
                       whether they're being used compatibly */
                    dump_version_info();
                    return 2; /* done */
                } else if (!match_optname(extended_opt, _("show"), 4, FALSE)) {
                    raw_printf(_("-%sversion can only be extended with" +
                               " -%sversion:copy or :dump or :show.\n"),
                               dashdash, dashdash);
                    /* exit after we've reported bad command line argument */
                    return 2;
                }
            }
            early_version_info(insert_into_pastebuf);
            return 2;
        }
        case ARG_SHOWPATHS:
            return 2;

        case ARG_DUMPENUMS:
            dump_enums();
            return 2;

        case ARG_DUMPGLYPHIDS:
            dump_glyphids();
            return 2;
        case ARG_DUMPMONGEN:
            dump_mongen();
            return 2;
        case ARG_DUMPWEIGHTS:
            dump_weights();
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
function /* void */
debug_fields(opts)
{
    let op;
    let negated = FALSE;

    while ((op = strchr(opts, ord(','))) != 0) {
        chars[op++] = 0;
        /* recurse */
        debug_fields(op);
    }
    if (strlen(opts) > Math.trunc(BUFSZ / 2))
        return;


    /* strip leading and trailing white space */
    while (__isspace(uchar((chars[opts]))))
        opts++;
    op = eos(opts);
    while (--op >= opts && __isspace(uchar((chars[op]))))
        chars[op] = ord('\0');

    if (!chars[opts]) {
        /* empty */
        return;
    }
    while ((chars[opts] == ord('!')) || !strncmpi(opts, _("no"), 2)) {
        if (chars[opts] == ord('!'))
            opts++;
        else
            opts += 2;
        negated = +!negated;
    }
    if (match_optname(opts, _("test"), 4, FALSE))
        iflags.debug.test = negated ? FALSE : TRUE;

    if (match_optname(opts, _("ttystatus"), 9, FALSE))
        iflags.debug.ttystatus = negated ? FALSE : TRUE;





    if (match_optname(opts, _("fuzzer"), 4, FALSE))
        iflags.fuzzerpending = TRUE;
    return;
}


/* monsdump[] and objdump[] are also used in utf8map.c */


export const UNPREFIXED_COUNT = (5);
export const monsdump = static_array("monsdump", struct_enum_dump, null, [
...monsdump_records(),
    { val: NUMMONS, nm: _("NUMMONS") },
    { val: NON_PM, nm: _("NON_PM") },
    { val: LOW_PM, nm: _("LOW_PM") },
    { val: HIGH_PM, nm: _("HIGH_PM") },
    { val: SPECIAL_PM, nm: _("SPECIAL_PM") }
]);
export const objdump = static_array("objdump", struct_enum_dump, null, [
...objdump_records(),
    { val: NUM_OBJECTS, nm: _("NUM_OBJECTS") },
]);


const defsym_cmap_dump = static_array("defsym_cmap_dump", struct_enum_dump, null, [
...defsym_cmap_dump_records(),
    { val: MAXPCHARS, nm: _("MAXPCHARS") },
]);



const defsym_mon_syms_dump = static_array("defsym_mon_syms_dump", struct_enum_dump, null, [
...defsym_mon_syms_dump_records(),
    { val: MAXMCLASSES, nm: _("MAXMCLASSES") },
]);



const defsym_mon_defchars_dump = static_array("defsym_mon_defchars_dump", struct_enum_dump, null, [
...defsym_mon_defchars_dump_records(),
]);



const objclass_defchars_dump = static_array("objclass_defchars_dump", struct_enum_dump, null, [
...objclass_defchars_dump_records(),
]);



const objclass_classes_dump = static_array("objclass_classes_dump", struct_enum_dump, null, [
...objclass_classes_dump_records(),
    { val: MAXOCLASSES, nm: _("MAXOCLASSES") },
]);



const objclass_syms_dump = static_array("objclass_syms_dump", struct_enum_dump, null, [
...objclass_syms_dump_records(),
]);



const arti_enum_dump = static_array("arti_enum_dump", struct_enum_dump, null, [
...arti_enum_dump_records(),
    { val: AFTER_LAST_ARTIFACT, nm: _("AFTER_LAST_ARTIFACT") }
]);


/* the enums are not part of hack.h for this one */







const mcastu_enum_dump = static_array("mcastu_enum_dump", struct_enum_dump, null, [
...mcastu_enum_dump_records(),
]);







function /* void */
dump_enums()
{ const $frame = stack_frame(); try {
    const monsters_enum = 0;
        const objects_enum = monsters_enum + 1;
        const objects_misc_enum = objects_enum + 1;
        const defsym_cmap_enum = objects_misc_enum + 1;
        const defsym_mon_syms_enum = defsym_cmap_enum + 1;
        const defsym_mon_defchars_enum = defsym_mon_syms_enum + 1;
        const objclass_defchars_enum = defsym_mon_defchars_enum + 1;
        const objclass_classes_enum = objclass_defchars_enum + 1;
        const objclass_syms_enum = objclass_classes_enum + 1;
        const arti_enum = objclass_syms_enum + 1;
        const mcastu_enum = arti_enum + 1;
        const NUM_ENUM_DUMPS = mcastu_enum + 1;




    let omdump = static_array("dump_enums.omdump", struct_enum_dump, null, [
        { val: LAST_GENERIC, nm: _("LAST_GENERIC") },
        { val: OBJCLASS_HACK, nm: _("OBJCLASS_HACK") },
        { val: FIRST_OBJECT, nm: _("FIRST_OBJECT") },
        { val: FIRST_AMULET, nm: _("FIRST_AMULET") },
        { val: LAST_AMULET, nm: _("LAST_AMULET") },
        { val: FIRST_SPELL, nm: _("FIRST_SPELL") },
        { val: LAST_SPELL, nm: _("LAST_SPELL") },
        { val: MAXSPELL, nm: _("MAXSPELL") },
        { val: FIRST_REAL_GEM, nm: _("FIRST_REAL_GEM") },
        { val: LAST_REAL_GEM, nm: _("LAST_REAL_GEM") },
        { val: FIRST_GLASS_GEM, nm: _("FIRST_GLASS_GEM") },
        { val: LAST_GLASS_GEM, nm: _("LAST_GLASS_GEM") },
        { val: NUM_REAL_GEMS, nm: _("NUM_REAL_GEMS") },
        { val: NUM_GLASS_GEMS, nm: _("NUM_GLASS_GEMS") },
        { val: MAX_GLYPH, nm: _("MAX_GLYPH") },
    ]);


    let ed = static_array("dump_enums.ed", ptr_to(struct_enum_dump), NUM_ENUM_DUMPS, [
        monsdump[0], objdump[0], omdump[0],
        defsym_cmap_dump[0], defsym_mon_syms_dump[0],
        defsym_mon_defchars_dump[0],
        objclass_defchars_dump[0],
        objclass_classes_dump[0],
        objclass_syms_dump[0],
        arti_enum_dump[0],
        mcastu_enum_dump[0],
    ]);

    const struct_de_params = struct("dump_enums.struct_de_params", {
        title: ptr_to(char),
        pfx: ptr_to(char),
        unprefixed_count: int,
        dumpflgs: int,
        szd: int,
    }); let edmp = static_array("dump_enums.edmp", struct_de_params, NUM_ENUM_DUMPS, [
        { title: _("monnums"), pfx: _("PM_"), unprefixed_count: UNPREFIXED_COUNT, dumpflgs: 0, szd: SIZE(monsdump) },
        { title: _("objects_nums"), pfx: _(""), unprefixed_count: 1, dumpflgs: 0, szd: SIZE(objdump) },
        { title: _("misc_object_nums"), pfx: _(""), unprefixed_count: 1, dumpflgs: 0, szd: SIZE(omdump) },
        { title: _("cmap_symbols"), pfx: _(""), unprefixed_count: 1, dumpflgs: 0, szd: SIZE(defsym_cmap_dump) },
        { title: _("mon_syms"), pfx: _(""), unprefixed_count: 1, dumpflgs: 0, szd: SIZE(defsym_mon_syms_dump) },
        { title: _("mon_defchars"), pfx: _(""), unprefixed_count: 1, dumpflgs: 1, szd: SIZE(defsym_mon_defchars_dump) },
        { title: _("objclass_defchars"), pfx: _(""), unprefixed_count: 1, dumpflgs: 1, szd: SIZE(objclass_defchars_dump) },
        { title: _("objclass_classes"), pfx: _(""), unprefixed_count: 1, dumpflgs: 0, szd: SIZE(objclass_classes_dump) },
        { title: _("objclass_syms"), pfx: _(""), unprefixed_count: 1, dumpflgs: 0, szd: SIZE(objclass_syms_dump) },
        { title: _("artifacts_nums"), pfx: _(""), unprefixed_count: 1, dumpflgs: 0, szd: SIZE(arti_enum_dump) },
        { title: _("mcast_spells"), pfx: _("MCAST_"), unprefixed_count: 0, dumpflgs: 0, szd: SIZE(mcastu_enum_dump) },
    ]);

    let nmprefix;
    let i, j, nmwidth;
    let comment = stack_array(char, BUFSZ);

    for (i = 0; i < NUM_ENUM_DUMPS; ++ i) {
        raw_printf(_("enum %s = {"), edmp[i].title);
        for (j = 0; j < edmp[i].szd; ++j) {
            nmprefix = (j >= edmp[i].szd - edmp[i].unprefixed_count)
                           ? _("") : edmp[i].pfx; /* "" or "PM_" */
            nmwidth = 27 - int(strlen(nmprefix)); /* 27 or 24 */
            if (edmp[i].dumpflgs > 0) {
                Snprintf(comment, sizeof(array_of(char, BUFSZ)), _("    /* '%c' */"), (ptr_add(ed[i], j).val >= 32 && ptr_add(ed[i], j).val <= 126)
                         ? ptr_add(ed[i], j).val : ord(' '))

;
            } else {
                chars[comment + 0] = ord('\0');
            }
            raw_printf(_("    %s%*s = %3d,%s"),
                       nmprefix, -nmwidth,
                       ptr_add(ed[i], j).nm, ptr_add(ed[i], j).val,
                       comment);
       }
        raw_print()(_("};"));
        raw_print()(_(""));
    }
    raw_print()(_(""));
} finally { stack_pop($frame); } }



export function /* void */
dump_glyphids()
{
    dump_all_glyphids((stdout));
}


/*allmain.c*/
import { AFTER_LAST_ARTIFACT } from "./artilist.h.js";
import { ART_CLEAVER } from "./artilist.h.js";
import { ART_DEMONBANE } from "./artilist.h.js";
import { ART_DRAGONBANE } from "./artilist.h.js";
import { ART_EXCALIBUR } from "./artilist.h.js";
import { ART_EYES_OF_THE_OVERWORLD } from "./artilist.h.js";
import { ART_EYE_OF_THE_AETHIOPICA } from "./artilist.h.js";
import { ART_FIRE_BRAND } from "./artilist.h.js";
import { ART_FROST_BRAND } from "./artilist.h.js";
import { ART_GIANTSLAYER } from "./artilist.h.js";
import { ART_GRAYSWANDIR } from "./artilist.h.js";
import { ART_GRIMTOOTH } from "./artilist.h.js";
import { ART_HEART_OF_AHRIMAN } from "./artilist.h.js";
import { ART_LONGBOW_OF_DIANA } from "./artilist.h.js";
import { ART_MAGICBANE } from "./artilist.h.js";
import { ART_MAGIC_MIRROR_OF_MERLIN } from "./artilist.h.js";
import { ART_MASTER_KEY_OF_THIEVERY } from "./artilist.h.js";
import { ART_MITRE_OF_HOLINESS } from "./artilist.h.js";
import { ART_MJOLLNIR } from "./artilist.h.js";
import { ART_NONARTIFACT } from "./artilist.h.js";
import { ART_OGRESMASHER } from "./artilist.h.js";
import { ART_ORB_OF_DETECTION } from "./artilist.h.js";
import { ART_ORB_OF_FATE } from "./artilist.h.js";
import { ART_ORCRIST } from "./artilist.h.js";
import { ART_SCEPTRE_OF_MIGHT } from "./artilist.h.js";
import { ART_SNICKERSNEE } from "./artilist.h.js";
import { ART_STAFF_OF_AESCULAPIUS } from "./artilist.h.js";
import { ART_STING } from "./artilist.h.js";
import { ART_STORMBRINGER } from "./artilist.h.js";
import { ART_SUNSWORD } from "./artilist.h.js";
import { ART_TROLLSBANE } from "./artilist.h.js";
import { ART_TSURUGI_OF_MURAMASA } from "./artilist.h.js";
import { ART_VORPAL_BLADE } from "./artilist.h.js";
import { ART_WEREBANE } from "./artilist.h.js";
import { ART_YENDORIAN_EXPRESS_CARD } from "./artilist.h.js";
import { AMULET_CLASS } from "./defsym.h.js";
import { AMULET_SYM } from "./defsym.h.js";
import { ARMOR_CLASS } from "./defsym.h.js";
import { ARMOR_SYM } from "./defsym.h.js";
import { BALL_CLASS } from "./defsym.h.js";
import { BALL_SYM } from "./defsym.h.js";
import { CHAIN_CLASS } from "./defsym.h.js";
import { CHAIN_SYM } from "./defsym.h.js";
import { COIN_CLASS } from "./defsym.h.js";
import { DEF_ANGEL } from "./defsym.h.js";
import { DEF_ANT } from "./defsym.h.js";
import { DEF_BAT } from "./defsym.h.js";
import { DEF_BLOB } from "./defsym.h.js";
import { DEF_CENTAUR } from "./defsym.h.js";
import { DEF_COCKATRICE } from "./defsym.h.js";
import { DEF_DEMON } from "./defsym.h.js";
import { DEF_DOG } from "./defsym.h.js";
import { DEF_DRAGON } from "./defsym.h.js";
import { DEF_EEL } from "./defsym.h.js";
import { DEF_ELEMENTAL } from "./defsym.h.js";
import { DEF_EYE } from "./defsym.h.js";
import { DEF_FELINE } from "./defsym.h.js";
import { DEF_FUNGUS } from "./defsym.h.js";
import { DEF_GHOST } from "./defsym.h.js";
import { DEF_GIANT } from "./defsym.h.js";
import { DEF_GNOME } from "./defsym.h.js";
import { DEF_GOLEM } from "./defsym.h.js";
import { DEF_GREMLIN } from "./defsym.h.js";
import { DEF_HUMAN } from "./defsym.h.js";
import { DEF_HUMANOID } from "./defsym.h.js";
import { DEF_IMP } from "./defsym.h.js";
import { DEF_INVISIBLE } from "./defsym.h.js";
import { DEF_JABBERWOCK } from "./defsym.h.js";
import { DEF_JELLY } from "./defsym.h.js";
import { DEF_KOBOLD } from "./defsym.h.js";
import { DEF_KOP } from "./defsym.h.js";
import { DEF_LEPRECHAUN } from "./defsym.h.js";
import { DEF_LICH } from "./defsym.h.js";
import { DEF_LIGHT } from "./defsym.h.js";
import { DEF_LIZARD } from "./defsym.h.js";
import { DEF_MIMIC } from "./defsym.h.js";
import { DEF_MIMIC_DEF } from "./defsym.h.js";
import { DEF_MUMMY } from "./defsym.h.js";
import { DEF_NAGA } from "./defsym.h.js";
import { DEF_NYMPH } from "./defsym.h.js";
import { DEF_OGRE } from "./defsym.h.js";
import { DEF_ORC } from "./defsym.h.js";
import { DEF_PIERCER } from "./defsym.h.js";
import { DEF_PUDDING } from "./defsym.h.js";
import { DEF_QUADRUPED } from "./defsym.h.js";
import { DEF_QUANTMECH } from "./defsym.h.js";
import { DEF_RODENT } from "./defsym.h.js";
import { DEF_RUSTMONST } from "./defsym.h.js";
import { DEF_SNAKE } from "./defsym.h.js";
import { DEF_SPIDER } from "./defsym.h.js";
import { DEF_TRAPPER } from "./defsym.h.js";
import { DEF_TROLL } from "./defsym.h.js";
import { DEF_UMBER } from "./defsym.h.js";
import { DEF_UNICORN } from "./defsym.h.js";
import { DEF_VAMPIRE } from "./defsym.h.js";
import { DEF_VORTEX } from "./defsym.h.js";
import { DEF_WORM } from "./defsym.h.js";
import { DEF_WORM_TAIL } from "./defsym.h.js";
import { DEF_WRAITH } from "./defsym.h.js";
import { DEF_XAN } from "./defsym.h.js";
import { DEF_XORN } from "./defsym.h.js";
import { DEF_YETI } from "./defsym.h.js";
import { DEF_ZOMBIE } from "./defsym.h.js";
import { DEF_ZRUTY } from "./defsym.h.js";
import { FOOD_CLASS } from "./defsym.h.js";
import { FOOD_SYM } from "./defsym.h.js";
import { GEM_CLASS } from "./defsym.h.js";
import { GEM_SYM } from "./defsym.h.js";
import { GOLD_SYM } from "./defsym.h.js";
import { ILLOBJ_CLASS } from "./defsym.h.js";
import { ILLOBJ_SYM } from "./defsym.h.js";
import { MAXMCLASSES } from "./defsym.h.js";
import { MAXOCLASSES } from "./defsym.h.js";
import { MAXPCHARS } from "./defsym.h.js";
import { POTION_CLASS } from "./defsym.h.js";
import { POTION_SYM } from "./defsym.h.js";
import { RING_CLASS } from "./defsym.h.js";
import { RING_SYM } from "./defsym.h.js";
import { ROCK_CLASS } from "./defsym.h.js";
import { ROCK_SYM } from "./defsym.h.js";
import { SCROLL_CLASS } from "./defsym.h.js";
import { SCROLL_SYM } from "./defsym.h.js";
import { SPBOOK_CLASS } from "./defsym.h.js";
import { SPBOOK_SYM } from "./defsym.h.js";
import { S_ANGEL } from "./defsym.h.js";
import { S_ANT } from "./defsym.h.js";
import { S_BAT } from "./defsym.h.js";
import { S_BLOB } from "./defsym.h.js";
import { S_CENTAUR } from "./defsym.h.js";
import { S_COCKATRICE } from "./defsym.h.js";
import { S_DEMON } from "./defsym.h.js";
import { S_DOG } from "./defsym.h.js";
import { S_DRAGON } from "./defsym.h.js";
import { S_EEL } from "./defsym.h.js";
import { S_ELEMENTAL } from "./defsym.h.js";
import { S_EYE } from "./defsym.h.js";
import { S_FELINE } from "./defsym.h.js";
import { S_FUNGUS } from "./defsym.h.js";
import { S_GHOST } from "./defsym.h.js";
import { S_GIANT } from "./defsym.h.js";
import { S_GNOME } from "./defsym.h.js";
import { S_GOLEM } from "./defsym.h.js";
import { S_GREMLIN } from "./defsym.h.js";
import { S_HUMAN } from "./defsym.h.js";
import { S_HUMANOID } from "./defsym.h.js";
import { S_IMP } from "./defsym.h.js";
import { S_JABBERWOCK } from "./defsym.h.js";
import { S_JELLY } from "./defsym.h.js";
import { S_KOBOLD } from "./defsym.h.js";
import { S_KOP } from "./defsym.h.js";
import { S_LEPRECHAUN } from "./defsym.h.js";
import { S_LICH } from "./defsym.h.js";
import { S_LIGHT } from "./defsym.h.js";
import { S_LIZARD } from "./defsym.h.js";
import { S_MIMIC } from "./defsym.h.js";
import { S_MIMIC_DEF } from "./defsym.h.js";
import { S_MUMMY } from "./defsym.h.js";
import { S_NAGA } from "./defsym.h.js";
import { S_NYMPH } from "./defsym.h.js";
import { S_OGRE } from "./defsym.h.js";
import { S_ORC } from "./defsym.h.js";
import { S_PIERCER } from "./defsym.h.js";
import { S_PUDDING } from "./defsym.h.js";
import { S_QUADRUPED } from "./defsym.h.js";
import { S_QUANTMECH } from "./defsym.h.js";
import { S_RODENT } from "./defsym.h.js";
import { S_RUSTMONST } from "./defsym.h.js";
import { S_SNAKE } from "./defsym.h.js";
import { S_SPIDER } from "./defsym.h.js";
import { S_TRAPPER } from "./defsym.h.js";
import { S_TROLL } from "./defsym.h.js";
import { S_UMBER } from "./defsym.h.js";
import { S_UNICORN } from "./defsym.h.js";
import { S_VAMPIRE } from "./defsym.h.js";
import { S_VORTEX } from "./defsym.h.js";
import { S_WORM } from "./defsym.h.js";
import { S_WORM_TAIL } from "./defsym.h.js";
import { S_WRAITH } from "./defsym.h.js";
import { S_XAN } from "./defsym.h.js";
import { S_XORN } from "./defsym.h.js";
import { S_YETI } from "./defsym.h.js";
import { S_ZOMBIE } from "./defsym.h.js";
import { S_ZRUTY } from "./defsym.h.js";
import { S_air } from "./defsym.h.js";
import { S_altar } from "./defsym.h.js";
import { S_amulet } from "./defsym.h.js";
import { S_anti_magic_trap } from "./defsym.h.js";
import { S_armor } from "./defsym.h.js";
import { S_arrow_trap } from "./defsym.h.js";
import { S_ball } from "./defsym.h.js";
import { S_bars } from "./defsym.h.js";
import { S_bear_trap } from "./defsym.h.js";
import { S_blcorn } from "./defsym.h.js";
import { S_book } from "./defsym.h.js";
import { S_boomleft } from "./defsym.h.js";
import { S_boomright } from "./defsym.h.js";
import { S_brcorn } from "./defsym.h.js";
import { S_brdnladder } from "./defsym.h.js";
import { S_brdnstair } from "./defsym.h.js";
import { S_brupladder } from "./defsym.h.js";
import { S_brupstair } from "./defsym.h.js";
import { S_chain } from "./defsym.h.js";
import { S_cloud } from "./defsym.h.js";
import { S_coin } from "./defsym.h.js";
import { S_corr } from "./defsym.h.js";
import { S_crwall } from "./defsym.h.js";
import { S_darkroom } from "./defsym.h.js";
import { S_dart_trap } from "./defsym.h.js";
import { S_digbeam } from "./defsym.h.js";
import { S_dnladder } from "./defsym.h.js";
import { S_dnstair } from "./defsym.h.js";
import { S_engrcorr } from "./defsym.h.js";
import { S_engroom } from "./defsym.h.js";
import { S_expl_bc } from "./defsym.h.js";
import { S_expl_bl } from "./defsym.h.js";
import { S_expl_br } from "./defsym.h.js";
import { S_expl_mc } from "./defsym.h.js";
import { S_expl_ml } from "./defsym.h.js";
import { S_expl_mr } from "./defsym.h.js";
import { S_expl_tc } from "./defsym.h.js";
import { S_expl_tl } from "./defsym.h.js";
import { S_expl_tr } from "./defsym.h.js";
import { S_falling_rock_trap } from "./defsym.h.js";
import { S_fire_trap } from "./defsym.h.js";
import { S_flashbeam } from "./defsym.h.js";
import { S_food } from "./defsym.h.js";
import { S_fountain } from "./defsym.h.js";
import { S_gem } from "./defsym.h.js";
import { S_goodpos } from "./defsym.h.js";
import { S_grave } from "./defsym.h.js";
import { S_hbeam } from "./defsym.h.js";
import { S_hcdbridge } from "./defsym.h.js";
import { S_hcdoor } from "./defsym.h.js";
import { S_hodbridge } from "./defsym.h.js";
import { S_hodoor } from "./defsym.h.js";
import { S_hole } from "./defsym.h.js";
import { S_hwall } from "./defsym.h.js";
import { S_ice } from "./defsym.h.js";
import { S_invisible } from "./defsym.h.js";
import { S_land_mine } from "./defsym.h.js";
import { S_lava } from "./defsym.h.js";
import { S_lavawall } from "./defsym.h.js";
import { S_level_teleporter } from "./defsym.h.js";
import { S_litcorr } from "./defsym.h.js";
import { S_lslant } from "./defsym.h.js";
import { S_magic_portal } from "./defsym.h.js";
import { S_magic_trap } from "./defsym.h.js";
import { S_ndoor } from "./defsym.h.js";
import { S_pit } from "./defsym.h.js";
import { S_poisoncloud } from "./defsym.h.js";
import { S_polymorph_trap } from "./defsym.h.js";
import { S_pool } from "./defsym.h.js";
import { S_potion } from "./defsym.h.js";
import { S_ring } from "./defsym.h.js";
import { S_rock } from "./defsym.h.js";
import { S_rolling_boulder_trap } from "./defsym.h.js";
import { S_room } from "./defsym.h.js";
import { S_rslant } from "./defsym.h.js";
import { S_rust_trap } from "./defsym.h.js";
import { S_scroll } from "./defsym.h.js";
import { S_sink } from "./defsym.h.js";
import { S_sleeping_gas_trap } from "./defsym.h.js";
import { S_spiked_pit } from "./defsym.h.js";
import { S_squeaky_board } from "./defsym.h.js";
import { S_ss1 } from "./defsym.h.js";
import { S_ss2 } from "./defsym.h.js";
import { S_ss3 } from "./defsym.h.js";
import { S_ss4 } from "./defsym.h.js";
import { S_statue_trap } from "./defsym.h.js";
import { S_stone } from "./defsym.h.js";
import { S_strange_obj } from "./defsym.h.js";
import { S_sw_bc } from "./defsym.h.js";
import { S_sw_bl } from "./defsym.h.js";
import { S_sw_br } from "./defsym.h.js";
import { S_sw_ml } from "./defsym.h.js";
import { S_sw_mr } from "./defsym.h.js";
import { S_sw_tc } from "./defsym.h.js";
import { S_sw_tl } from "./defsym.h.js";
import { S_sw_tr } from "./defsym.h.js";
import { S_tdwall } from "./defsym.h.js";
import { S_teleportation_trap } from "./defsym.h.js";
import { S_throne } from "./defsym.h.js";
import { S_tlcorn } from "./defsym.h.js";
import { S_tlwall } from "./defsym.h.js";
import { S_tool } from "./defsym.h.js";
import { S_trap_door } from "./defsym.h.js";
import { S_trapped_chest } from "./defsym.h.js";
import { S_trapped_door } from "./defsym.h.js";
import { S_trcorn } from "./defsym.h.js";
import { S_tree } from "./defsym.h.js";
import { S_trwall } from "./defsym.h.js";
import { S_tuwall } from "./defsym.h.js";
import { S_upladder } from "./defsym.h.js";
import { S_upstair } from "./defsym.h.js";
import { S_vbeam } from "./defsym.h.js";
import { S_vcdbridge } from "./defsym.h.js";
import { S_vcdoor } from "./defsym.h.js";
import { S_venom } from "./defsym.h.js";
import { S_vibrating_square } from "./defsym.h.js";
import { S_vodbridge } from "./defsym.h.js";
import { S_vodoor } from "./defsym.h.js";
import { S_vwall } from "./defsym.h.js";
import { S_wand } from "./defsym.h.js";
import { S_water } from "./defsym.h.js";
import { S_weapon } from "./defsym.h.js";
import { S_web } from "./defsym.h.js";
import { TOOL_CLASS } from "./defsym.h.js";
import { TOOL_SYM } from "./defsym.h.js";
import { VENOM_CLASS } from "./defsym.h.js";
import { VENOM_SYM } from "./defsym.h.js";
import { WAND_CLASS } from "./defsym.h.js";
import { WAND_SYM } from "./defsym.h.js";
import { WEAPON_CLASS } from "./defsym.h.js";
import { WEAPON_SYM } from "./defsym.h.js";
import { MAX_GLYPH } from "./display.h.js";
import { BUFSZ } from "./global.h.js";
import { FALSE } from "./global.h.js";
import { TRUE } from "./global.h.js";
import { USAGEHELP } from "./global.h.js";
import { ARG_DEBUG } from "./hack.h.js";
import { ARG_DUMPENUMS } from "./hack.h.js";
import { ARG_DUMPGLYPHIDS } from "./hack.h.js";
import { ARG_DUMPMONGEN } from "./hack.h.js";
import { ARG_DUMPWEIGHTS } from "./hack.h.js";
import { ARG_SHOWPATHS } from "./hack.h.js";
import { ARG_VERSION } from "./hack.h.js";
import { struct_early_opt } from "./hack.h.js";
import { struct_enum_dump } from "./hack.h.js";
import { Snprintf } from "./hacklib.h.macros.js";
import { nhStr } from "./lint.h.macros.js";
import { MCAST_DUMPENUM_AGGRAVATION } from "./mcastu.h.js";
import { MCAST_DUMPENUM_BLIND_YOU } from "./mcastu.h.js";
import { MCAST_DUMPENUM_CLONE_WIZ } from "./mcastu.h.js";
import { MCAST_DUMPENUM_CONFUSE_YOU } from "./mcastu.h.js";
import { MCAST_DUMPENUM_CURE_SELF } from "./mcastu.h.js";
import { MCAST_DUMPENUM_CURSE_ITEMS } from "./mcastu.h.js";
import { MCAST_DUMPENUM_DEATH_TOUCH } from "./mcastu.h.js";
import { MCAST_DUMPENUM_DESTRY_ARMR } from "./mcastu.h.js";
import { MCAST_DUMPENUM_DISAPPEAR } from "./mcastu.h.js";
import { MCAST_DUMPENUM_FIRE_PILLAR } from "./mcastu.h.js";
import { MCAST_DUMPENUM_GEYSER } from "./mcastu.h.js";
import { MCAST_DUMPENUM_HASTE_SELF } from "./mcastu.h.js";
import { MCAST_DUMPENUM_INSECTS } from "./mcastu.h.js";
import { MCAST_DUMPENUM_LIGHTNING } from "./mcastu.h.js";
import { MCAST_DUMPENUM_OPEN_WOUNDS } from "./mcastu.h.js";
import { MCAST_DUMPENUM_PARALYZE } from "./mcastu.h.js";
import { MCAST_DUMPENUM_PSI_BOLT } from "./mcastu.h.js";
import { MCAST_DUMPENUM_STUN_YOU } from "./mcastu.h.js";
import { MCAST_DUMPENUM_SUMMON_MONS } from "./mcastu.h.js";
import { MCAST_DUMPENUM_WEAKEN_YOU } from "./mcastu.h.js";
import { HIGH_PM } from "./monsters.h.js";
import { LOW_PM } from "./monsters.h.js";
import { NON_PM } from "./monsters.h.js";
import { NUMMONS } from "./monsters.h.js";
import { PM_ABBOT } from "./monsters.h.js";
import { PM_ACID_BLOB } from "./monsters.h.js";
import { PM_ACOLYTE } from "./monsters.h.js";
import { PM_AIR_ELEMENTAL } from "./monsters.h.js";
import { PM_ALEAX } from "./monsters.h.js";
import { PM_ALIGNED_CLERIC } from "./monsters.h.js";
import { PM_AMOROUS_DEMON } from "./monsters.h.js";
import { PM_ANGEL } from "./monsters.h.js";
import { PM_APE } from "./monsters.h.js";
import { PM_APPRENTICE } from "./monsters.h.js";
import { PM_ARCHEOLOGIST } from "./monsters.h.js";
import { PM_ARCHON } from "./monsters.h.js";
import { PM_ARCH_LICH } from "./monsters.h.js";
import { PM_ARCH_PRIEST } from "./monsters.h.js";
import { PM_ASHIKAGA_TAKAUJI } from "./monsters.h.js";
import { PM_ASMODEUS } from "./monsters.h.js";
import { PM_ATTENDANT } from "./monsters.h.js";
import { PM_BAALZEBUB } from "./monsters.h.js";
import { PM_BABY_BLACK_DRAGON } from "./monsters.h.js";
import { PM_BABY_BLUE_DRAGON } from "./monsters.h.js";
import { PM_BABY_CROCODILE } from "./monsters.h.js";
import { PM_BABY_GOLD_DRAGON } from "./monsters.h.js";
import { PM_BABY_GRAY_DRAGON } from "./monsters.h.js";
import { PM_BABY_GREEN_DRAGON } from "./monsters.h.js";
import { PM_BABY_LONG_WORM } from "./monsters.h.js";
import { PM_BABY_ORANGE_DRAGON } from "./monsters.h.js";
import { PM_BABY_PURPLE_WORM } from "./monsters.h.js";
import { PM_BABY_RED_DRAGON } from "./monsters.h.js";
import { PM_BABY_SILVER_DRAGON } from "./monsters.h.js";
import { PM_BABY_WHITE_DRAGON } from "./monsters.h.js";
import { PM_BABY_YELLOW_DRAGON } from "./monsters.h.js";
import { PM_BALROG } from "./monsters.h.js";
import { PM_BALUCHITHERIUM } from "./monsters.h.js";
import { PM_BARBARIAN } from "./monsters.h.js";
import { PM_BARBED_DEVIL } from "./monsters.h.js";
import { PM_BARROW_WIGHT } from "./monsters.h.js";
import { PM_BAT } from "./monsters.h.js";
import { PM_BLACK_DRAGON } from "./monsters.h.js";
import { PM_BLACK_LIGHT } from "./monsters.h.js";
import { PM_BLACK_NAGA } from "./monsters.h.js";
import { PM_BLACK_NAGA_HATCHLING } from "./monsters.h.js";
import { PM_BLACK_PUDDING } from "./monsters.h.js";
import { PM_BLACK_UNICORN } from "./monsters.h.js";
import { PM_BLUE_DRAGON } from "./monsters.h.js";
import { PM_BLUE_JELLY } from "./monsters.h.js";
import { PM_BONE_DEVIL } from "./monsters.h.js";
import { PM_BROWN_MOLD } from "./monsters.h.js";
import { PM_BROWN_PUDDING } from "./monsters.h.js";
import { PM_BUGBEAR } from "./monsters.h.js";
import { PM_CAPTAIN } from "./monsters.h.js";
import { PM_CARNIVOROUS_APE } from "./monsters.h.js";
import { PM_CAVE_DWELLER } from "./monsters.h.js";
import { PM_CAVE_SPIDER } from "./monsters.h.js";
import { PM_CENTIPEDE } from "./monsters.h.js";
import { PM_CHAMELEON } from "./monsters.h.js";
import { PM_CHICKATRICE } from "./monsters.h.js";
import { PM_CHIEFTAIN } from "./monsters.h.js";
import { PM_CHROMATIC_DRAGON } from "./monsters.h.js";
import { PM_CLAY_GOLEM } from "./monsters.h.js";
import { PM_CLERIC } from "./monsters.h.js";
import { PM_COBRA } from "./monsters.h.js";
import { PM_COCKATRICE } from "./monsters.h.js";
import { PM_COUATL } from "./monsters.h.js";
import { PM_COYOTE } from "./monsters.h.js";
import { PM_CROCODILE } from "./monsters.h.js";
import { PM_CROESUS } from "./monsters.h.js";
import { PM_CYCLOPS } from "./monsters.h.js";
import { PM_DARK_ONE } from "./monsters.h.js";
import { PM_DEATH } from "./monsters.h.js";
import { PM_DEMILICH } from "./monsters.h.js";
import { PM_DEMOGORGON } from "./monsters.h.js";
import { PM_DINGO } from "./monsters.h.js";
import { PM_DISENCHANTER } from "./monsters.h.js";
import { PM_DISPATER } from "./monsters.h.js";
import { PM_DISPLACER_BEAST } from "./monsters.h.js";
import { PM_DJINNI } from "./monsters.h.js";
import { PM_DOG } from "./monsters.h.js";
import { PM_DOPPELGANGER } from "./monsters.h.js";
import { PM_DUST_VORTEX } from "./monsters.h.js";
import { PM_DWARF } from "./monsters.h.js";
import { PM_DWARF_LEADER } from "./monsters.h.js";
import { PM_DWARF_MUMMY } from "./monsters.h.js";
import { PM_DWARF_RULER } from "./monsters.h.js";
import { PM_DWARF_ZOMBIE } from "./monsters.h.js";
import { PM_EARTH_ELEMENTAL } from "./monsters.h.js";
import { PM_ELECTRIC_EEL } from "./monsters.h.js";
import { PM_ELF } from "./monsters.h.js";
import { PM_ELF_MUMMY } from "./monsters.h.js";
import { PM_ELF_NOBLE } from "./monsters.h.js";
import { PM_ELF_ZOMBIE } from "./monsters.h.js";
import { PM_ELVEN_MONARCH } from "./monsters.h.js";
import { PM_ENERGY_VORTEX } from "./monsters.h.js";
import { PM_ERINYS } from "./monsters.h.js";
import { PM_ETTIN } from "./monsters.h.js";
import { PM_ETTIN_MUMMY } from "./monsters.h.js";
import { PM_ETTIN_ZOMBIE } from "./monsters.h.js";
import { PM_FAMINE } from "./monsters.h.js";
import { PM_FIRE_ANT } from "./monsters.h.js";
import { PM_FIRE_ELEMENTAL } from "./monsters.h.js";
import { PM_FIRE_GIANT } from "./monsters.h.js";
import { PM_FIRE_VORTEX } from "./monsters.h.js";
import { PM_FLAMING_SPHERE } from "./monsters.h.js";
import { PM_FLESH_GOLEM } from "./monsters.h.js";
import { PM_FLOATING_EYE } from "./monsters.h.js";
import { PM_FOG_CLOUD } from "./monsters.h.js";
import { PM_FOREST_CENTAUR } from "./monsters.h.js";
import { PM_FOX } from "./monsters.h.js";
import { PM_FREEZING_SPHERE } from "./monsters.h.js";
import { PM_FROST_GIANT } from "./monsters.h.js";
import { PM_GARGOYLE } from "./monsters.h.js";
import { PM_GARTER_SNAKE } from "./monsters.h.js";
import { PM_GAS_SPORE } from "./monsters.h.js";
import { PM_GECKO } from "./monsters.h.js";
import { PM_GELATINOUS_CUBE } from "./monsters.h.js";
import { PM_GENETIC_ENGINEER } from "./monsters.h.js";
import { PM_GERYON } from "./monsters.h.js";
import { PM_GHOST } from "./monsters.h.js";
import { PM_GHOUL } from "./monsters.h.js";
import { PM_GIANT } from "./monsters.h.js";
import { PM_GIANT_ANT } from "./monsters.h.js";
import { PM_GIANT_BAT } from "./monsters.h.js";
import { PM_GIANT_BEETLE } from "./monsters.h.js";
import { PM_GIANT_EEL } from "./monsters.h.js";
import { PM_GIANT_MIMIC } from "./monsters.h.js";
import { PM_GIANT_MUMMY } from "./monsters.h.js";
import { PM_GIANT_RAT } from "./monsters.h.js";
import { PM_GIANT_SPIDER } from "./monsters.h.js";
import { PM_GIANT_ZOMBIE } from "./monsters.h.js";
import { PM_GLASS_GOLEM } from "./monsters.h.js";
import { PM_GLASS_PIERCER } from "./monsters.h.js";
import { PM_GNOME } from "./monsters.h.js";
import { PM_GNOME_LEADER } from "./monsters.h.js";
import { PM_GNOME_MUMMY } from "./monsters.h.js";
import { PM_GNOME_RULER } from "./monsters.h.js";
import { PM_GNOME_ZOMBIE } from "./monsters.h.js";
import { PM_GNOMISH_WIZARD } from "./monsters.h.js";
import { PM_GOBLIN } from "./monsters.h.js";
import { PM_GOLDEN_NAGA } from "./monsters.h.js";
import { PM_GOLDEN_NAGA_HATCHLING } from "./monsters.h.js";
import { PM_GOLD_DRAGON } from "./monsters.h.js";
import { PM_GOLD_GOLEM } from "./monsters.h.js";
import { PM_GRAND_MASTER } from "./monsters.h.js";
import { PM_GRAY_DRAGON } from "./monsters.h.js";
import { PM_GRAY_OOZE } from "./monsters.h.js";
import { PM_GRAY_UNICORN } from "./monsters.h.js";
import { PM_GREEN_DRAGON } from "./monsters.h.js";
import { PM_GREEN_ELF } from "./monsters.h.js";
import { PM_GREEN_MOLD } from "./monsters.h.js";
import { PM_GREEN_SLIME } from "./monsters.h.js";
import { PM_GREMLIN } from "./monsters.h.js";
import { PM_GREY_ELF } from "./monsters.h.js";
import { PM_GRID_BUG } from "./monsters.h.js";
import { PM_GUARD } from "./monsters.h.js";
import { PM_GUARDIAN_NAGA } from "./monsters.h.js";
import { PM_GUARDIAN_NAGA_HATCHLING } from "./monsters.h.js";
import { PM_GUIDE } from "./monsters.h.js";
import { PM_HEALER } from "./monsters.h.js";
import { PM_HELL_HOUND } from "./monsters.h.js";
import { PM_HELL_HOUND_PUP } from "./monsters.h.js";
import { PM_HEZROU } from "./monsters.h.js";
import { PM_HIGH_CLERIC } from "./monsters.h.js";
import { PM_HILL_GIANT } from "./monsters.h.js";
import { PM_HILL_ORC } from "./monsters.h.js";
import { PM_HIPPOCRATES } from "./monsters.h.js";
import { PM_HOBBIT } from "./monsters.h.js";
import { PM_HOBGOBLIN } from "./monsters.h.js";
import { PM_HOMUNCULUS } from "./monsters.h.js";
import { PM_HORNED_DEVIL } from "./monsters.h.js";
import { PM_HORSE } from "./monsters.h.js";
import { PM_HOUSECAT } from "./monsters.h.js";
import { PM_HUMAN } from "./monsters.h.js";
import { PM_HUMAN_MUMMY } from "./monsters.h.js";
import { PM_HUMAN_WEREJACKAL } from "./monsters.h.js";
import { PM_HUMAN_WERERAT } from "./monsters.h.js";
import { PM_HUMAN_WEREWOLF } from "./monsters.h.js";
import { PM_HUMAN_ZOMBIE } from "./monsters.h.js";
import { PM_HUNTER } from "./monsters.h.js";
import { PM_ICE_DEVIL } from "./monsters.h.js";
import { PM_ICE_TROLL } from "./monsters.h.js";
import { PM_ICE_VORTEX } from "./monsters.h.js";
import { PM_IGUANA } from "./monsters.h.js";
import { PM_IMP } from "./monsters.h.js";
import { PM_IRON_GOLEM } from "./monsters.h.js";
import { PM_IRON_PIERCER } from "./monsters.h.js";
import { PM_IXOTH } from "./monsters.h.js";
import { PM_JABBERWOCK } from "./monsters.h.js";
import { PM_JACKAL } from "./monsters.h.js";
import { PM_JAGUAR } from "./monsters.h.js";
import { PM_JELLYFISH } from "./monsters.h.js";
import { PM_JUIBLEX } from "./monsters.h.js";
import { PM_KEYSTONE_KOP } from "./monsters.h.js";
import { PM_KILLER_BEE } from "./monsters.h.js";
import { PM_KING_ARTHUR } from "./monsters.h.js";
import { PM_KITTEN } from "./monsters.h.js";
import { PM_KI_RIN } from "./monsters.h.js";
import { PM_KNIGHT } from "./monsters.h.js";
import { PM_KOBOLD } from "./monsters.h.js";
import { PM_KOBOLD_LEADER } from "./monsters.h.js";
import { PM_KOBOLD_MUMMY } from "./monsters.h.js";
import { PM_KOBOLD_SHAMAN } from "./monsters.h.js";
import { PM_KOBOLD_ZOMBIE } from "./monsters.h.js";
import { PM_KOP_KAPTAIN } from "./monsters.h.js";
import { PM_KOP_LIEUTENANT } from "./monsters.h.js";
import { PM_KOP_SERGEANT } from "./monsters.h.js";
import { PM_KRAKEN } from "./monsters.h.js";
import { PM_LARGE_CAT } from "./monsters.h.js";
import { PM_LARGE_DOG } from "./monsters.h.js";
import { PM_LARGE_KOBOLD } from "./monsters.h.js";
import { PM_LARGE_MIMIC } from "./monsters.h.js";
import { PM_LEATHER_GOLEM } from "./monsters.h.js";
import { PM_LEMURE } from "./monsters.h.js";
import { PM_LEOCROTTA } from "./monsters.h.js";
import { PM_LEPRECHAUN } from "./monsters.h.js";
import { PM_LICH } from "./monsters.h.js";
import { PM_LICHEN } from "./monsters.h.js";
import { PM_LIEUTENANT } from "./monsters.h.js";
import { PM_LITTLE_DOG } from "./monsters.h.js";
import { PM_LIZARD } from "./monsters.h.js";
import { PM_LONG_WORM } from "./monsters.h.js";
import { PM_LONG_WORM_TAIL } from "./monsters.h.js";
import { PM_LORD_CARNARVON } from "./monsters.h.js";
import { PM_LORD_SATO } from "./monsters.h.js";
import { PM_LORD_SURTUR } from "./monsters.h.js";
import { PM_LURKER_ABOVE } from "./monsters.h.js";
import { PM_LYNX } from "./monsters.h.js";
import { PM_MAIL_DAEMON } from "./monsters.h.js";
import { PM_MANES } from "./monsters.h.js";
import { PM_MARILITH } from "./monsters.h.js";
import { PM_MASTER_ASSASSIN } from "./monsters.h.js";
import { PM_MASTER_KAEN } from "./monsters.h.js";
import { PM_MASTER_LICH } from "./monsters.h.js";
import { PM_MASTER_MIND_FLAYER } from "./monsters.h.js";
import { PM_MASTER_OF_THIEVES } from "./monsters.h.js";
import { PM_MASTODON } from "./monsters.h.js";
import { PM_MEDUSA } from "./monsters.h.js";
import { PM_MIND_FLAYER } from "./monsters.h.js";
import { PM_MINION_OF_HUHETOTL } from "./monsters.h.js";
import { PM_MINOTAUR } from "./monsters.h.js";
import { PM_MONK } from "./monsters.h.js";
import { PM_MONKEY } from "./monsters.h.js";
import { PM_MORDOR_ORC } from "./monsters.h.js";
import { PM_MOUNTAIN_CENTAUR } from "./monsters.h.js";
import { PM_MOUNTAIN_NYMPH } from "./monsters.h.js";
import { PM_MUMAK } from "./monsters.h.js";
import { PM_NALFESHNEE } from "./monsters.h.js";
import { PM_NALZOK } from "./monsters.h.js";
import { PM_NAZGUL } from "./monsters.h.js";
import { PM_NEANDERTHAL } from "./monsters.h.js";
import { PM_NEFERET_THE_GREEN } from "./monsters.h.js";
import { PM_NEWT } from "./monsters.h.js";
import { PM_NINJA } from "./monsters.h.js";
import { PM_NORN } from "./monsters.h.js";
import { PM_NURSE } from "./monsters.h.js";
import { PM_OCHRE_JELLY } from "./monsters.h.js";
import { PM_OGRE } from "./monsters.h.js";
import { PM_OGRE_LEADER } from "./monsters.h.js";
import { PM_OGRE_TYRANT } from "./monsters.h.js";
import { PM_OLOG_HAI } from "./monsters.h.js";
import { PM_ORACLE } from "./monsters.h.js";
import { PM_ORANGE_DRAGON } from "./monsters.h.js";
import { PM_ORC } from "./monsters.h.js";
import { PM_ORCUS } from "./monsters.h.js";
import { PM_ORC_CAPTAIN } from "./monsters.h.js";
import { PM_ORC_MUMMY } from "./monsters.h.js";
import { PM_ORC_SHAMAN } from "./monsters.h.js";
import { PM_ORC_ZOMBIE } from "./monsters.h.js";
import { PM_ORION } from "./monsters.h.js";
import { PM_OWLBEAR } from "./monsters.h.js";
import { PM_PAGE } from "./monsters.h.js";
import { PM_PANTHER } from "./monsters.h.js";
import { PM_PAPER_GOLEM } from "./monsters.h.js";
import { PM_PELIAS } from "./monsters.h.js";
import { PM_PESTILENCE } from "./monsters.h.js";
import { PM_PIRANHA } from "./monsters.h.js";
import { PM_PIT_FIEND } from "./monsters.h.js";
import { PM_PIT_VIPER } from "./monsters.h.js";
import { PM_PLAINS_CENTAUR } from "./monsters.h.js";
import { PM_PONY } from "./monsters.h.js";
import { PM_PRISONER } from "./monsters.h.js";
import { PM_PURPLE_WORM } from "./monsters.h.js";
import { PM_PYROLISK } from "./monsters.h.js";
import { PM_PYTHON } from "./monsters.h.js";
import { PM_QUANTUM_MECHANIC } from "./monsters.h.js";
import { PM_QUASIT } from "./monsters.h.js";
import { PM_QUEEN_BEE } from "./monsters.h.js";
import { PM_QUIVERING_BLOB } from "./monsters.h.js";
import { PM_RABID_RAT } from "./monsters.h.js";
import { PM_RANGER } from "./monsters.h.js";
import { PM_RAVEN } from "./monsters.h.js";
import { PM_RED_DRAGON } from "./monsters.h.js";
import { PM_RED_MOLD } from "./monsters.h.js";
import { PM_RED_NAGA } from "./monsters.h.js";
import { PM_RED_NAGA_HATCHLING } from "./monsters.h.js";
import { PM_ROCK_MOLE } from "./monsters.h.js";
import { PM_ROCK_PIERCER } from "./monsters.h.js";
import { PM_ROCK_TROLL } from "./monsters.h.js";
import { PM_ROGUE } from "./monsters.h.js";
import { PM_ROPE_GOLEM } from "./monsters.h.js";
import { PM_ROSHI } from "./monsters.h.js";
import { PM_ROTHE } from "./monsters.h.js";
import { PM_RUST_MONSTER } from "./monsters.h.js";
import { PM_SALAMANDER } from "./monsters.h.js";
import { PM_SAMURAI } from "./monsters.h.js";
import { PM_SANDESTIN } from "./monsters.h.js";
import { PM_SASQUATCH } from "./monsters.h.js";
import { PM_SCORPION } from "./monsters.h.js";
import { PM_SCORPIUS } from "./monsters.h.js";
import { PM_SERGEANT } from "./monsters.h.js";
import { PM_SEWER_RAT } from "./monsters.h.js";
import { PM_SHADE } from "./monsters.h.js";
import { PM_SHAMAN_KARNOV } from "./monsters.h.js";
import { PM_SHARK } from "./monsters.h.js";
import { PM_SHOCKING_SPHERE } from "./monsters.h.js";
import { PM_SHOPKEEPER } from "./monsters.h.js";
import { PM_SHRIEKER } from "./monsters.h.js";
import { PM_SILVER_DRAGON } from "./monsters.h.js";
import { PM_SKELETON } from "./monsters.h.js";
import { PM_SMALL_MIMIC } from "./monsters.h.js";
import { PM_SNAKE } from "./monsters.h.js";
import { PM_SOLDIER } from "./monsters.h.js";
import { PM_SOLDIER_ANT } from "./monsters.h.js";
import { PM_SPOTTED_JELLY } from "./monsters.h.js";
import { PM_STALKER } from "./monsters.h.js";
import { PM_STEAM_VORTEX } from "./monsters.h.js";
import { PM_STONE_GIANT } from "./monsters.h.js";
import { PM_STONE_GOLEM } from "./monsters.h.js";
import { PM_STORM_GIANT } from "./monsters.h.js";
import { PM_STRAW_GOLEM } from "./monsters.h.js";
import { PM_STUDENT } from "./monsters.h.js";
import { PM_TENGU } from "./monsters.h.js";
import { PM_THOTH_AMON } from "./monsters.h.js";
import { PM_THUG } from "./monsters.h.js";
import { PM_TIGER } from "./monsters.h.js";
import { PM_TITAN } from "./monsters.h.js";
import { PM_TITANOTHERE } from "./monsters.h.js";
import { PM_TOURIST } from "./monsters.h.js";
import { PM_TRAPPER } from "./monsters.h.js";
import { PM_TROLL } from "./monsters.h.js";
import { PM_TWOFLOWER } from "./monsters.h.js";
import { PM_UMBER_HULK } from "./monsters.h.js";
import { PM_URUK_HAI } from "./monsters.h.js";
import { PM_VALKYRIE } from "./monsters.h.js";
import { PM_VAMPIRE } from "./monsters.h.js";
import { PM_VAMPIRE_BAT } from "./monsters.h.js";
import { PM_VAMPIRE_LEADER } from "./monsters.h.js";
import { PM_VIOLET_FUNGUS } from "./monsters.h.js";
import { PM_VLAD_THE_IMPALER } from "./monsters.h.js";
import { PM_VROCK } from "./monsters.h.js";
import { PM_WARG } from "./monsters.h.js";
import { PM_WARHORSE } from "./monsters.h.js";
import { PM_WARRIOR } from "./monsters.h.js";
import { PM_WATCHMAN } from "./monsters.h.js";
import { PM_WATCH_CAPTAIN } from "./monsters.h.js";
import { PM_WATER_DEMON } from "./monsters.h.js";
import { PM_WATER_ELEMENTAL } from "./monsters.h.js";
import { PM_WATER_MOCCASIN } from "./monsters.h.js";
import { PM_WATER_NYMPH } from "./monsters.h.js";
import { PM_WATER_TROLL } from "./monsters.h.js";
import { PM_WEREJACKAL } from "./monsters.h.js";
import { PM_WERERAT } from "./monsters.h.js";
import { PM_WEREWOLF } from "./monsters.h.js";
import { PM_WHITE_DRAGON } from "./monsters.h.js";
import { PM_WHITE_UNICORN } from "./monsters.h.js";
import { PM_WINGED_GARGOYLE } from "./monsters.h.js";
import { PM_WINTER_WOLF } from "./monsters.h.js";
import { PM_WINTER_WOLF_CUB } from "./monsters.h.js";
import { PM_WIZARD } from "./monsters.h.js";
import { PM_WIZARD_OF_YENDOR } from "./monsters.h.js";
import { PM_WOLF } from "./monsters.h.js";
import { PM_WOODCHUCK } from "./monsters.h.js";
import { PM_WOODLAND_ELF } from "./monsters.h.js";
import { PM_WOOD_GOLEM } from "./monsters.h.js";
import { PM_WOOD_NYMPH } from "./monsters.h.js";
import { PM_WRAITH } from "./monsters.h.js";
import { PM_WUMPUS } from "./monsters.h.js";
import { PM_XAN } from "./monsters.h.js";
import { PM_XORN } from "./monsters.h.js";
import { PM_YEENOGHU } from "./monsters.h.js";
import { PM_YELLOW_DRAGON } from "./monsters.h.js";
import { PM_YELLOW_LIGHT } from "./monsters.h.js";
import { PM_YELLOW_MOLD } from "./monsters.h.js";
import { PM_YETI } from "./monsters.h.js";
import { PM_ZRUTY } from "./monsters.h.js";
import { SPECIAL_PM } from "./monsters.h.js";
import { MAXSPELL } from "./objclass.h.js";
import { NUM_GLASS_GEMS } from "./objclass.h.js";
import { NUM_REAL_GEMS } from "./objclass.h.js";
import { ACID_VENOM } from "./objects.h.js";
import { AGATE } from "./objects.h.js";
import { AKLYS } from "./objects.h.js";
import { ALCHEMY_SMOCK } from "./objects.h.js";
import { AMBER } from "./objects.h.js";
import { AMETHYST } from "./objects.h.js";
import { AMULET_OF_CHANGE } from "./objects.h.js";
import { AMULET_OF_ESP } from "./objects.h.js";
import { AMULET_OF_FLYING } from "./objects.h.js";
import { AMULET_OF_GUARDING } from "./objects.h.js";
import { AMULET_OF_LIFE_SAVING } from "./objects.h.js";
import { AMULET_OF_MAGICAL_BREATHING } from "./objects.h.js";
import { AMULET_OF_REFLECTION } from "./objects.h.js";
import { AMULET_OF_RESTFUL_SLEEP } from "./objects.h.js";
import { AMULET_OF_STRANGULATION } from "./objects.h.js";
import { AMULET_OF_UNCHANGING } from "./objects.h.js";
import { AMULET_OF_YENDOR } from "./objects.h.js";
import { AMULET_VERSUS_POISON } from "./objects.h.js";
import { APPLE } from "./objects.h.js";
import { AQUAMARINE } from "./objects.h.js";
import { ARROW } from "./objects.h.js";
import { ATHAME } from "./objects.h.js";
import { AXE } from "./objects.h.js";
import { BAG_OF_HOLDING } from "./objects.h.js";
import { BAG_OF_TRICKS } from "./objects.h.js";
import { BANANA } from "./objects.h.js";
import { BANDED_MAIL } from "./objects.h.js";
import { BARDICHE } from "./objects.h.js";
import { BATTLE_AXE } from "./objects.h.js";
import { BEARTRAP } from "./objects.h.js";
import { BEC_DE_CORBIN } from "./objects.h.js";
import { BELL } from "./objects.h.js";
import { BELL_OF_OPENING } from "./objects.h.js";
import { BILL_GUISARME } from "./objects.h.js";
import { BLACK_DRAGON_SCALES } from "./objects.h.js";
import { BLACK_DRAGON_SCALE_MAIL } from "./objects.h.js";
import { BLACK_OPAL } from "./objects.h.js";
import { BLINDFOLD } from "./objects.h.js";
import { BLINDING_VENOM } from "./objects.h.js";
import { BLUE_DRAGON_SCALES } from "./objects.h.js";
import { BLUE_DRAGON_SCALE_MAIL } from "./objects.h.js";
import { BOOMERANG } from "./objects.h.js";
import { BOULDER } from "./objects.h.js";
import { BOW } from "./objects.h.js";
import { BRASS_LANTERN } from "./objects.h.js";
import { BROADSWORD } from "./objects.h.js";
import { BRONZE_PLATE_MAIL } from "./objects.h.js";
import { BUGLE } from "./objects.h.js";
import { BULLWHIP } from "./objects.h.js";
import { CANDELABRUM_OF_INVOCATION } from "./objects.h.js";
import { CANDY_BAR } from "./objects.h.js";
import { CAN_OF_GREASE } from "./objects.h.js";
import { CARROT } from "./objects.h.js";
import { CHAIN_MAIL } from "./objects.h.js";
import { CHEST } from "./objects.h.js";
import { CHRYSOBERYL } from "./objects.h.js";
import { CITRINE } from "./objects.h.js";
import { CLOAK_OF_DISPLACEMENT } from "./objects.h.js";
import { CLOAK_OF_INVISIBILITY } from "./objects.h.js";
import { CLOAK_OF_MAGIC_RESISTANCE } from "./objects.h.js";
import { CLOAK_OF_PROTECTION } from "./objects.h.js";
import { CLOVE_OF_GARLIC } from "./objects.h.js";
import { CLUB } from "./objects.h.js";
import { CORNUTHAUM } from "./objects.h.js";
import { CORPSE } from "./objects.h.js";
import { CRAM_RATION } from "./objects.h.js";
import { CREAM_PIE } from "./objects.h.js";
import { CREDIT_CARD } from "./objects.h.js";
import { CROSSBOW } from "./objects.h.js";
import { CROSSBOW_BOLT } from "./objects.h.js";
import { CRYSKNIFE } from "./objects.h.js";
import { CRYSTAL_BALL } from "./objects.h.js";
import { CRYSTAL_PLATE_MAIL } from "./objects.h.js";
import { C_RATION } from "./objects.h.js";
import { DAGGER } from "./objects.h.js";
import { DART } from "./objects.h.js";
import { DENTED_POT } from "./objects.h.js";
import { DIAMOND } from "./objects.h.js";
import { DILITHIUM_CRYSTAL } from "./objects.h.js";
import { DRUM_OF_EARTHQUAKE } from "./objects.h.js";
import { DUNCE_CAP } from "./objects.h.js";
import { DWARVISH_CLOAK } from "./objects.h.js";
import { DWARVISH_IRON_HELM } from "./objects.h.js";
import { DWARVISH_MATTOCK } from "./objects.h.js";
import { DWARVISH_MITHRIL_COAT } from "./objects.h.js";
import { DWARVISH_ROUNDSHIELD } from "./objects.h.js";
import { DWARVISH_SHORT_SWORD } from "./objects.h.js";
import { DWARVISH_SPEAR } from "./objects.h.js";
import { EGG } from "./objects.h.js";
import { ELVEN_ARROW } from "./objects.h.js";
import { ELVEN_BOOTS } from "./objects.h.js";
import { ELVEN_BOW } from "./objects.h.js";
import { ELVEN_BROADSWORD } from "./objects.h.js";
import { ELVEN_CLOAK } from "./objects.h.js";
import { ELVEN_DAGGER } from "./objects.h.js";
import { ELVEN_LEATHER_HELM } from "./objects.h.js";
import { ELVEN_MITHRIL_COAT } from "./objects.h.js";
import { ELVEN_SHIELD } from "./objects.h.js";
import { ELVEN_SHORT_SWORD } from "./objects.h.js";
import { ELVEN_SPEAR } from "./objects.h.js";
import { EMERALD } from "./objects.h.js";
import { ENORMOUS_MEATBALL } from "./objects.h.js";
import { EUCALYPTUS_LEAF } from "./objects.h.js";
import { EXPENSIVE_CAMERA } from "./objects.h.js";
import { FAKE_AMULET_OF_YENDOR } from "./objects.h.js";
import { FAUCHARD } from "./objects.h.js";
import { FEDORA } from "./objects.h.js";
import { FIGURINE } from "./objects.h.js";
import { FIRE_HORN } from "./objects.h.js";
import { FIRST_AMULET } from "./objects.h.js";
import { FIRST_GLASS_GEM } from "./objects.h.js";
import { FIRST_OBJECT } from "./objects.h.js";
import { FIRST_REAL_GEM } from "./objects.h.js";
import { FIRST_SPELL } from "./objects.h.js";
import { FLAIL } from "./objects.h.js";
import { FLINT } from "./objects.h.js";
import { FLUORITE } from "./objects.h.js";
import { FOOD_RATION } from "./objects.h.js";
import { FORTUNE_COOKIE } from "./objects.h.js";
import { FROST_HORN } from "./objects.h.js";
import { FUMBLE_BOOTS } from "./objects.h.js";
import { GARNET } from "./objects.h.js";
import { GAUNTLETS_OF_DEXTERITY } from "./objects.h.js";
import { GAUNTLETS_OF_FUMBLING } from "./objects.h.js";
import { GAUNTLETS_OF_POWER } from "./objects.h.js";
import { GENERIC_AMULET } from "./objects.h.js";
import { GENERIC_ARMOR } from "./objects.h.js";
import { GENERIC_BALL } from "./objects.h.js";
import { GENERIC_CHAIN } from "./objects.h.js";
import { GENERIC_COIN } from "./objects.h.js";
import { GENERIC_FOOD } from "./objects.h.js";
import { GENERIC_GEM } from "./objects.h.js";
import { GENERIC_ILLOBJ } from "./objects.h.js";
import { GENERIC_POTION } from "./objects.h.js";
import { GENERIC_RING } from "./objects.h.js";
import { GENERIC_ROCK } from "./objects.h.js";
import { GENERIC_SCROLL } from "./objects.h.js";
import { GENERIC_SPBOOK } from "./objects.h.js";
import { GENERIC_TOOL } from "./objects.h.js";
import { GENERIC_VENOM } from "./objects.h.js";
import { GENERIC_WAND } from "./objects.h.js";
import { GENERIC_WEAPON } from "./objects.h.js";
import { GLAIVE } from "./objects.h.js";
import { GLOB_OF_BLACK_PUDDING } from "./objects.h.js";
import { GLOB_OF_BROWN_PUDDING } from "./objects.h.js";
import { GLOB_OF_GRAY_OOZE } from "./objects.h.js";
import { GLOB_OF_GREEN_SLIME } from "./objects.h.js";
import { GOLD_DRAGON_SCALES } from "./objects.h.js";
import { GOLD_DRAGON_SCALE_MAIL } from "./objects.h.js";
import { GOLD_PIECE } from "./objects.h.js";
import { GRAPPLING_HOOK } from "./objects.h.js";
import { GRAY_DRAGON_SCALES } from "./objects.h.js";
import { GRAY_DRAGON_SCALE_MAIL } from "./objects.h.js";
import { GREEN_DRAGON_SCALES } from "./objects.h.js";
import { GREEN_DRAGON_SCALE_MAIL } from "./objects.h.js";
import { GUISARME } from "./objects.h.js";
import { HALBERD } from "./objects.h.js";
import { HAWAIIAN_SHIRT } from "./objects.h.js";
import { HEAVY_IRON_BALL } from "./objects.h.js";
import { HELMET } from "./objects.h.js";
import { HELM_OF_BRILLIANCE } from "./objects.h.js";
import { HELM_OF_CAUTION } from "./objects.h.js";
import { HELM_OF_OPPOSITE_ALIGNMENT } from "./objects.h.js";
import { HELM_OF_TELEPATHY } from "./objects.h.js";
import { HIGH_BOOTS } from "./objects.h.js";
import { HORN_OF_PLENTY } from "./objects.h.js";
import { ICE_BOX } from "./objects.h.js";
import { IRON_CHAIN } from "./objects.h.js";
import { IRON_SHOES } from "./objects.h.js";
import { JACINTH } from "./objects.h.js";
import { JADE } from "./objects.h.js";
import { JASPER } from "./objects.h.js";
import { JAVELIN } from "./objects.h.js";
import { JET } from "./objects.h.js";
import { JUMPING_BOOTS } from "./objects.h.js";
import { KATANA } from "./objects.h.js";
import { KELP_FROND } from "./objects.h.js";
import { KICKING_BOOTS } from "./objects.h.js";
import { KNIFE } from "./objects.h.js";
import { K_RATION } from "./objects.h.js";
import { LANCE } from "./objects.h.js";
import { LAND_MINE } from "./objects.h.js";
import { LARGE_BOX } from "./objects.h.js";
import { LARGE_SHIELD } from "./objects.h.js";
import { LAST_AMULET } from "./objects.h.js";
import { LAST_GENERIC } from "./objects.h.js";
import { LAST_GLASS_GEM } from "./objects.h.js";
import { LAST_REAL_GEM } from "./objects.h.js";
import { LAST_SPELL } from "./objects.h.js";
import { LEASH } from "./objects.h.js";
import { LEATHER_ARMOR } from "./objects.h.js";
import { LEATHER_CLOAK } from "./objects.h.js";
import { LEATHER_DRUM } from "./objects.h.js";
import { LEATHER_GLOVES } from "./objects.h.js";
import { LEATHER_JACKET } from "./objects.h.js";
import { LEMBAS_WAFER } from "./objects.h.js";
import { LENSES } from "./objects.h.js";
import { LEVITATION_BOOTS } from "./objects.h.js";
import { LOADSTONE } from "./objects.h.js";
import { LOCK_PICK } from "./objects.h.js";
import { LONG_SWORD } from "./objects.h.js";
import { LOW_BOOTS } from "./objects.h.js";
import { LUCERN_HAMMER } from "./objects.h.js";
import { LUCKSTONE } from "./objects.h.js";
import { LUMP_OF_ROYAL_JELLY } from "./objects.h.js";
import { MACE } from "./objects.h.js";
import { MAGIC_FLUTE } from "./objects.h.js";
import { MAGIC_HARP } from "./objects.h.js";
import { MAGIC_LAMP } from "./objects.h.js";
import { MAGIC_MARKER } from "./objects.h.js";
import { MAGIC_WHISTLE } from "./objects.h.js";
import { MEATBALL } from "./objects.h.js";
import { MEAT_RING } from "./objects.h.js";
import { MEAT_STICK } from "./objects.h.js";
import { MELON } from "./objects.h.js";
import { MIRROR } from "./objects.h.js";
import { MORNING_STAR } from "./objects.h.js";
import { MUMMY_WRAPPING } from "./objects.h.js";
import { NUM_OBJECTS } from "./objects.h.js";
import { OBJCLASS_HACK } from "./objects.h.js";
import { OBSIDIAN } from "./objects.h.js";
import { OILSKIN_CLOAK } from "./objects.h.js";
import { OILSKIN_SACK } from "./objects.h.js";
import { OIL_LAMP } from "./objects.h.js";
import { OPAL } from "./objects.h.js";
import { ORANGE } from "./objects.h.js";
import { ORANGE_DRAGON_SCALES } from "./objects.h.js";
import { ORANGE_DRAGON_SCALE_MAIL } from "./objects.h.js";
import { ORCISH_ARROW } from "./objects.h.js";
import { ORCISH_BOW } from "./objects.h.js";
import { ORCISH_CHAIN_MAIL } from "./objects.h.js";
import { ORCISH_CLOAK } from "./objects.h.js";
import { ORCISH_DAGGER } from "./objects.h.js";
import { ORCISH_HELM } from "./objects.h.js";
import { ORCISH_RING_MAIL } from "./objects.h.js";
import { ORCISH_SHIELD } from "./objects.h.js";
import { ORCISH_SHORT_SWORD } from "./objects.h.js";
import { ORCISH_SPEAR } from "./objects.h.js";
import { PANCAKE } from "./objects.h.js";
import { PARTISAN } from "./objects.h.js";
import { PEAR } from "./objects.h.js";
import { PICK_AXE } from "./objects.h.js";
import { PLATE_MAIL } from "./objects.h.js";
import { POT_ACID } from "./objects.h.js";
import { POT_BLINDNESS } from "./objects.h.js";
import { POT_BOOZE } from "./objects.h.js";
import { POT_CONFUSION } from "./objects.h.js";
import { POT_ENLIGHTENMENT } from "./objects.h.js";
import { POT_EXTRA_HEALING } from "./objects.h.js";
import { POT_FRUIT_JUICE } from "./objects.h.js";
import { POT_FULL_HEALING } from "./objects.h.js";
import { POT_GAIN_ABILITY } from "./objects.h.js";
import { POT_GAIN_ENERGY } from "./objects.h.js";
import { POT_GAIN_LEVEL } from "./objects.h.js";
import { POT_HALLUCINATION } from "./objects.h.js";
import { POT_HEALING } from "./objects.h.js";
import { POT_INVISIBILITY } from "./objects.h.js";
import { POT_LEVITATION } from "./objects.h.js";
import { POT_MONSTER_DETECTION } from "./objects.h.js";
import { POT_OBJECT_DETECTION } from "./objects.h.js";
import { POT_OIL } from "./objects.h.js";
import { POT_PARALYSIS } from "./objects.h.js";
import { POT_POLYMORPH } from "./objects.h.js";
import { POT_RESTORE_ABILITY } from "./objects.h.js";
import { POT_SEE_INVISIBLE } from "./objects.h.js";
import { POT_SICKNESS } from "./objects.h.js";
import { POT_SLEEPING } from "./objects.h.js";
import { POT_SPEED } from "./objects.h.js";
import { POT_WATER } from "./objects.h.js";
import { QUARTERSTAFF } from "./objects.h.js";
import { RANSEUR } from "./objects.h.js";
import { RED_DRAGON_SCALES } from "./objects.h.js";
import { RED_DRAGON_SCALE_MAIL } from "./objects.h.js";
import { RING_MAIL } from "./objects.h.js";
import { RIN_ADORNMENT } from "./objects.h.js";
import { RIN_AGGRAVATE_MONSTER } from "./objects.h.js";
import { RIN_COLD_RESISTANCE } from "./objects.h.js";
import { RIN_CONFLICT } from "./objects.h.js";
import { RIN_FIRE_RESISTANCE } from "./objects.h.js";
import { RIN_FREE_ACTION } from "./objects.h.js";
import { RIN_GAIN_CONSTITUTION } from "./objects.h.js";
import { RIN_GAIN_STRENGTH } from "./objects.h.js";
import { RIN_HUNGER } from "./objects.h.js";
import { RIN_INCREASE_ACCURACY } from "./objects.h.js";
import { RIN_INCREASE_DAMAGE } from "./objects.h.js";
import { RIN_INVISIBILITY } from "./objects.h.js";
import { RIN_LEVITATION } from "./objects.h.js";
import { RIN_POISON_RESISTANCE } from "./objects.h.js";
import { RIN_POLYMORPH } from "./objects.h.js";
import { RIN_POLYMORPH_CONTROL } from "./objects.h.js";
import { RIN_PROTECTION } from "./objects.h.js";
import { RIN_PROTECTION_FROM_SHAPE_CHAN } from "./objects.h.js";
import { RIN_REGENERATION } from "./objects.h.js";
import { RIN_SEARCHING } from "./objects.h.js";
import { RIN_SEE_INVISIBLE } from "./objects.h.js";
import { RIN_SHOCK_RESISTANCE } from "./objects.h.js";
import { RIN_SLOW_DIGESTION } from "./objects.h.js";
import { RIN_STEALTH } from "./objects.h.js";
import { RIN_SUSTAIN_ABILITY } from "./objects.h.js";
import { RIN_TELEPORTATION } from "./objects.h.js";
import { RIN_TELEPORT_CONTROL } from "./objects.h.js";
import { RIN_WARNING } from "./objects.h.js";
import { ROBE } from "./objects.h.js";
import { ROCK } from "./objects.h.js";
import { RUBBER_HOSE } from "./objects.h.js";
import { RUBY } from "./objects.h.js";
import { RUNESWORD } from "./objects.h.js";
import { SACK } from "./objects.h.js";
import { SADDLE } from "./objects.h.js";
import { SAPPHIRE } from "./objects.h.js";
import { SC01 } from "./objects.h.js";
import { SC02 } from "./objects.h.js";
import { SC03 } from "./objects.h.js";
import { SC04 } from "./objects.h.js";
import { SC05 } from "./objects.h.js";
import { SC06 } from "./objects.h.js";
import { SC07 } from "./objects.h.js";
import { SC08 } from "./objects.h.js";
import { SC09 } from "./objects.h.js";
import { SC10 } from "./objects.h.js";
import { SC11 } from "./objects.h.js";
import { SC12 } from "./objects.h.js";
import { SC13 } from "./objects.h.js";
import { SC14 } from "./objects.h.js";
import { SC15 } from "./objects.h.js";
import { SC16 } from "./objects.h.js";
import { SC17 } from "./objects.h.js";
import { SC18 } from "./objects.h.js";
import { SC19 } from "./objects.h.js";
import { SC20 } from "./objects.h.js";
import { SCALE_MAIL } from "./objects.h.js";
import { SCALPEL } from "./objects.h.js";
import { SCIMITAR } from "./objects.h.js";
import { SCR_AMNESIA } from "./objects.h.js";
import { SCR_BLANK_PAPER } from "./objects.h.js";
import { SCR_CHARGING } from "./objects.h.js";
import { SCR_CONFUSE_MONSTER } from "./objects.h.js";
import { SCR_CREATE_MONSTER } from "./objects.h.js";
import { SCR_DESTROY_ARMOR } from "./objects.h.js";
import { SCR_EARTH } from "./objects.h.js";
import { SCR_ENCHANT_ARMOR } from "./objects.h.js";
import { SCR_ENCHANT_WEAPON } from "./objects.h.js";
import { SCR_FIRE } from "./objects.h.js";
import { SCR_FOOD_DETECTION } from "./objects.h.js";
import { SCR_GENOCIDE } from "./objects.h.js";
import { SCR_GOLD_DETECTION } from "./objects.h.js";
import { SCR_IDENTIFY } from "./objects.h.js";
import { SCR_LIGHT } from "./objects.h.js";
import { SCR_MAGIC_MAPPING } from "./objects.h.js";
import { SCR_MAIL } from "./objects.h.js";
import { SCR_PUNISHMENT } from "./objects.h.js";
import { SCR_REMOVE_CURSE } from "./objects.h.js";
import { SCR_SCARE_MONSTER } from "./objects.h.js";
import { SCR_STINKING_CLOUD } from "./objects.h.js";
import { SCR_TAMING } from "./objects.h.js";
import { SCR_TELEPORTATION } from "./objects.h.js";
import { SHIELD_OF_DRAIN_RESISTANCE } from "./objects.h.js";
import { SHIELD_OF_REFLECTION } from "./objects.h.js";
import { SHIELD_OF_SHOCK_RESISTANCE } from "./objects.h.js";
import { SHORT_SWORD } from "./objects.h.js";
import { SHURIKEN } from "./objects.h.js";
import { SILVER_ARROW } from "./objects.h.js";
import { SILVER_DAGGER } from "./objects.h.js";
import { SILVER_DRAGON_SCALES } from "./objects.h.js";
import { SILVER_DRAGON_SCALE_MAIL } from "./objects.h.js";
import { SILVER_MACE } from "./objects.h.js";
import { SILVER_SABER } from "./objects.h.js";
import { SILVER_SPEAR } from "./objects.h.js";
import { SKELETON_KEY } from "./objects.h.js";
import { SLIME_MOLD } from "./objects.h.js";
import { SLING } from "./objects.h.js";
import { SMALL_SHIELD } from "./objects.h.js";
import { SPEAR } from "./objects.h.js";
import { SPEED_BOOTS } from "./objects.h.js";
import { SPETUM } from "./objects.h.js";
import { SPE_BLANK_PAPER } from "./objects.h.js";
import { SPE_BOOK_OF_THE_DEAD } from "./objects.h.js";
import { SPE_CANCELLATION } from "./objects.h.js";
import { SPE_CAUSE_FEAR } from "./objects.h.js";
import { SPE_CHAIN_LIGHTNING } from "./objects.h.js";
import { SPE_CHARM_MONSTER } from "./objects.h.js";
import { SPE_CLAIRVOYANCE } from "./objects.h.js";
import { SPE_CONE_OF_COLD } from "./objects.h.js";
import { SPE_CONFUSE_MONSTER } from "./objects.h.js";
import { SPE_CREATE_FAMILIAR } from "./objects.h.js";
import { SPE_CREATE_MONSTER } from "./objects.h.js";
import { SPE_CURE_BLINDNESS } from "./objects.h.js";
import { SPE_CURE_SICKNESS } from "./objects.h.js";
import { SPE_DETECT_FOOD } from "./objects.h.js";
import { SPE_DETECT_MONSTERS } from "./objects.h.js";
import { SPE_DETECT_TREASURE } from "./objects.h.js";
import { SPE_DETECT_UNSEEN } from "./objects.h.js";
import { SPE_DIG } from "./objects.h.js";
import { SPE_DRAIN_LIFE } from "./objects.h.js";
import { SPE_EXTRA_HEALING } from "./objects.h.js";
import { SPE_FINGER_OF_DEATH } from "./objects.h.js";
import { SPE_FIREBALL } from "./objects.h.js";
import { SPE_FORCE_BOLT } from "./objects.h.js";
import { SPE_HASTE_SELF } from "./objects.h.js";
import { SPE_HEALING } from "./objects.h.js";
import { SPE_IDENTIFY } from "./objects.h.js";
import { SPE_INVISIBILITY } from "./objects.h.js";
import { SPE_JUMPING } from "./objects.h.js";
import { SPE_KNOCK } from "./objects.h.js";
import { SPE_LEVITATION } from "./objects.h.js";
import { SPE_LIGHT } from "./objects.h.js";
import { SPE_MAGIC_MAPPING } from "./objects.h.js";
import { SPE_MAGIC_MISSILE } from "./objects.h.js";
import { SPE_NOVEL } from "./objects.h.js";
import { SPE_POLYMORPH } from "./objects.h.js";
import { SPE_PROTECTION } from "./objects.h.js";
import { SPE_REMOVE_CURSE } from "./objects.h.js";
import { SPE_RESTORE_ABILITY } from "./objects.h.js";
import { SPE_SLEEP } from "./objects.h.js";
import { SPE_SLOW_MONSTER } from "./objects.h.js";
import { SPE_STONE_TO_FLESH } from "./objects.h.js";
import { SPE_TELEPORT_AWAY } from "./objects.h.js";
import { SPE_TURN_UNDEAD } from "./objects.h.js";
import { SPE_WIZARD_LOCK } from "./objects.h.js";
import { SPLINT_MAIL } from "./objects.h.js";
import { SPRIG_OF_WOLFSBANE } from "./objects.h.js";
import { STATUE } from "./objects.h.js";
import { STETHOSCOPE } from "./objects.h.js";
import { STILETTO } from "./objects.h.js";
import { STRANGE_OBJECT } from "./objects.h.js";
import { STUDDED_LEATHER_ARMOR } from "./objects.h.js";
import { TALLOW_CANDLE } from "./objects.h.js";
import { TIN } from "./objects.h.js";
import { TINNING_KIT } from "./objects.h.js";
import { TIN_OPENER } from "./objects.h.js";
import { TIN_WHISTLE } from "./objects.h.js";
import { TOOLED_HORN } from "./objects.h.js";
import { TOPAZ } from "./objects.h.js";
import { TOUCHSTONE } from "./objects.h.js";
import { TOWEL } from "./objects.h.js";
import { TRIDENT } from "./objects.h.js";
import { TRIPE_RATION } from "./objects.h.js";
import { TSURUGI } from "./objects.h.js";
import { TURQUOISE } from "./objects.h.js";
import { TWO_HANDED_SWORD } from "./objects.h.js";
import { T_SHIRT } from "./objects.h.js";
import { UNICORN_HORN } from "./objects.h.js";
import { URUK_HAI_SHIELD } from "./objects.h.js";
import { VOULGE } from "./objects.h.js";
import { WAN1 } from "./objects.h.js";
import { WAN2 } from "./objects.h.js";
import { WAN3 } from "./objects.h.js";
import { WAN_CANCELLATION } from "./objects.h.js";
import { WAN_COLD } from "./objects.h.js";
import { WAN_CREATE_MONSTER } from "./objects.h.js";
import { WAN_DEATH } from "./objects.h.js";
import { WAN_DIGGING } from "./objects.h.js";
import { WAN_ENLIGHTENMENT } from "./objects.h.js";
import { WAN_FIRE } from "./objects.h.js";
import { WAN_LIGHT } from "./objects.h.js";
import { WAN_LIGHTNING } from "./objects.h.js";
import { WAN_LOCKING } from "./objects.h.js";
import { WAN_MAGIC_MISSILE } from "./objects.h.js";
import { WAN_MAKE_INVISIBLE } from "./objects.h.js";
import { WAN_NOTHING } from "./objects.h.js";
import { WAN_OPENING } from "./objects.h.js";
import { WAN_POLYMORPH } from "./objects.h.js";
import { WAN_PROBING } from "./objects.h.js";
import { WAN_SECRET_DOOR_DETECTION } from "./objects.h.js";
import { WAN_SLEEP } from "./objects.h.js";
import { WAN_SLOW_MONSTER } from "./objects.h.js";
import { WAN_SPEED_MONSTER } from "./objects.h.js";
import { WAN_STASIS } from "./objects.h.js";
import { WAN_STRIKING } from "./objects.h.js";
import { WAN_TELEPORTATION } from "./objects.h.js";
import { WAN_UNDEAD_TURNING } from "./objects.h.js";
import { WAN_WISHING } from "./objects.h.js";
import { WAR_HAMMER } from "./objects.h.js";
import { WATER_WALKING_BOOTS } from "./objects.h.js";
import { WAX_CANDLE } from "./objects.h.js";
import { WHITE_DRAGON_SCALES } from "./objects.h.js";
import { WHITE_DRAGON_SCALE_MAIL } from "./objects.h.js";
import { WOODEN_FLUTE } from "./objects.h.js";
import { WOODEN_HARP } from "./objects.h.js";
import { WORM_TOOTH } from "./objects.h.js";
import { WORTHLESS_BLACK_GLASS } from "./objects.h.js";
import { WORTHLESS_BLUE_GLASS } from "./objects.h.js";
import { WORTHLESS_GREEN_GLASS } from "./objects.h.js";
import { WORTHLESS_ORANGE_GLASS } from "./objects.h.js";
import { WORTHLESS_RED_GLASS } from "./objects.h.js";
import { WORTHLESS_VIOLET_GLASS } from "./objects.h.js";
import { WORTHLESS_WHITE_GLASS } from "./objects.h.js";
import { WORTHLESS_YELLOWBROWN_GLASS } from "./objects.h.js";
import { WORTHLESS_YELLOW_GLASS } from "./objects.h.js";
import { YA } from "./objects.h.js";
import { YELLOW_DRAGON_SCALES } from "./objects.h.js";
import { YELLOW_DRAGON_SCALE_MAIL } from "./objects.h.js";
import { YUMI } from "./objects.h.js";
import { raw_print } from "./winprocs.h.macros.js";
import { SIZE } from "../rt/cmacros.js";
import { char } from "../rt/ctypes.js";
import { int } from "../rt/ctypes.js";
import { ord } from "../rt/ctypes.js";
import { sizeof } from "../rt/ctypes.js";
import { sizeof_string } from "../rt/ctypes.js";
import { uchar } from "../rt/ctypes.js";
import { unsigned } from "../rt/ctypes.js";
import { chars } from "../rt/heap.js";
import { stack_frame } from "../rt/heap.js";
import { stack_pop } from "../rt/heap.js";
import { EXIT_SUCCESS } from "../rt/libc.js";
import { __isspace } from "../rt/libc.js";
import { free } from "../rt/libc.js";
import { stdout } from "../rt/libc.js";
import { strchr } from "../rt/libc.js";
import { strcmp } from "../rt/libc.js";
import { strlen } from "../rt/libc.js";
import { strncmp } from "../rt/libc.js";
import { init_string } from "../rt/locals.js";
import { stack_array } from "../rt/locals.js";
import { stack_var } from "../rt/locals.js";
import { static_array } from "../rt/locals.js";
import { _ } from "../rt/strings.js";
import { array_of } from "../rt/struct.js";
import { ptr_add } from "../rt/struct.js";
import { ptr_to } from "../rt/struct.js";
import { ref_add } from "../rt/struct.js";
import { struct } from "../rt/struct.js";
import { dupstr } from "./alloc.js";
import { config_error_add } from "./cfgfiles.js";
import { config_error_done } from "./cfgfiles.js";
import { config_error_init } from "./cfgfiles.js";
import { gc } from "./decl.js";
import { gd } from "./decl.js";
import { iflags } from "./decl.js";
import { program_state } from "./decl.js";
import { nh_terminate } from "./end.js";
import { dump_all_glyphids } from "./glyphs.js";
import { dump_weights } from "./hack.js";
import { eos } from "./hacklib.js";
import { strncmpi } from "./hacklib.js";
import { dump_mongen } from "./makemon.js";
import { initoptions } from "./options.js";
import { match_optname } from "./options.js";
import { raw_printf } from "./pline.js";
import { prscore } from "./topten.js";
import { dump_version_info } from "./version.js";
import { early_version_info } from "./version.js";
import { genl_display_file } from "./windows.js";
import { error } from "../sys/c2js/nhjs_host.js";
import { chdirx } from "../sys/unix/unixmain.js";
import { whoami } from "../sys/unix/unixmain.js";

// the records of monsdump[] from monsters.h, laid out like it
function monsdump_records() {
    return [
    { val: PM_GIANT_ANT, nm: _("GIANT_ANT") },
    { val: PM_KILLER_BEE, nm: _("KILLER_BEE") },
    { val: PM_SOLDIER_ANT, nm: _("SOLDIER_ANT") },
    { val: PM_FIRE_ANT, nm: _("FIRE_ANT") },
    { val: PM_GIANT_BEETLE, nm: _("GIANT_BEETLE") },
    { val: PM_QUEEN_BEE, nm: _("QUEEN_BEE") },
    /*
     * blobs
     */
    { val: PM_ACID_BLOB, nm: _("ACID_BLOB") },
    { val: PM_QUIVERING_BLOB, nm: _("QUIVERING_BLOB") },
    { val: PM_GELATINOUS_CUBE, nm: _("GELATINOUS_CUBE") },
    /*
     * cockatrice
     */
    { val: PM_CHICKATRICE, nm: _("CHICKATRICE") },
    { val: PM_COCKATRICE, nm: _("COCKATRICE") },
    { val: PM_PYROLISK, nm: _("PYROLISK") },
    /*
     * dogs & other canines
     */
    { val: PM_JACKAL, nm: _("JACKAL") },
    { val: PM_FOX, nm: _("FOX") },
    { val: PM_COYOTE, nm: _("COYOTE") },
    { val: PM_WEREJACKAL, nm: _("WEREJACKAL") },
    { val: PM_LITTLE_DOG, nm: _("LITTLE_DOG") },
    { val: PM_DINGO, nm: _("DINGO") },
    { val: PM_DOG, nm: _("DOG") },
    { val: PM_LARGE_DOG, nm: _("LARGE_DOG") },
    { val: PM_WOLF, nm: _("WOLF") },
    /* werewolf in wolf form; one in human form uses a different monster
       type (in the S_HUMAN section below); switching back and forth is
       a shape-change that sets monst->data to the appropriate monster */
    { val: PM_WEREWOLF, nm: _("WEREWOLF") },
    { val: PM_WINTER_WOLF_CUB, nm: _("WINTER_WOLF_CUB") },
    { val: PM_WARG, nm: _("WARG") },
    { val: PM_WINTER_WOLF, nm: _("WINTER_WOLF") },
    { val: PM_HELL_HOUND_PUP, nm: _("HELL_HOUND_PUP") },
    { val: PM_HELL_HOUND, nm: _("HELL_HOUND") },











    /*
     * eyes
     */
    { val: PM_GAS_SPORE, nm: _("GAS_SPORE") },
    { val: PM_FLOATING_EYE, nm: _("FLOATING_EYE") },
    { val: PM_FREEZING_SPHERE, nm: _("FREEZING_SPHERE") },
    { val: PM_FLAMING_SPHERE, nm: _("FLAMING_SPHERE") },
    { val: PM_SHOCKING_SPHERE, nm: _("SHOCKING_SPHERE") },











    /*
     * felines
     */
    { val: PM_KITTEN, nm: _("KITTEN") },
    { val: PM_HOUSECAT, nm: _("HOUSECAT") },
    { val: PM_JAGUAR, nm: _("JAGUAR") },
    { val: PM_LYNX, nm: _("LYNX") },
    { val: PM_PANTHER, nm: _("PANTHER") },
    { val: PM_LARGE_CAT, nm: _("LARGE_CAT") },
    { val: PM_TIGER, nm: _("TIGER") },
    { val: PM_DISPLACER_BEAST, nm: _("DISPLACER_BEAST") },
    /*
     * gremlins and gargoyles
     */
    { val: PM_GREMLIN, nm: _("GREMLIN") },
    /* gargoyle and winged gargoyle are inspired by a cheesy made-for-TV
       horror movie (starring Cornel Wilde and Jennifer Salt 1972) */
    { val: PM_GARGOYLE, nm: _("GARGOYLE") },
    { val: PM_WINGED_GARGOYLE, nm: _("WINGED_GARGOYLE") },
    /*
     * humanoids
     */
    { val: PM_HOBBIT, nm: _("HOBBIT") },
    /* unlike plain human|elf|orc plain "dwarf" is an ordinary monster */
    { val: PM_DWARF, nm: _("DWARF") },
    { val: PM_BUGBEAR, nm: _("BUGBEAR") },
    { val: PM_DWARF_LEADER, nm: _("DWARF_LEADER") },
    { val: PM_DWARF_RULER, nm: _("DWARF_RULER") },
    { val: PM_MIND_FLAYER, nm: _("MIND_FLAYER") },
    { val: PM_MASTER_MIND_FLAYER, nm: _("MASTER_MIND_FLAYER") },
    /*
     * imps & other minor demons/devils
     */
    { val: PM_MANES, nm: _("MANES") },
    { val: PM_HOMUNCULUS, nm: _("HOMUNCULUS") },
    { val: PM_IMP, nm: _("IMP") },
    { val: PM_LEMURE, nm: _("LEMURE") },
    { val: PM_QUASIT, nm: _("QUASIT") },
    { val: PM_TENGU, nm: _("TENGU") },
    /*
     * jellies
     */
    { val: PM_BLUE_JELLY, nm: _("BLUE_JELLY") },
    { val: PM_SPOTTED_JELLY, nm: _("SPOTTED_JELLY") },
    { val: PM_OCHRE_JELLY, nm: _("OCHRE_JELLY") },
    /*
     * kobolds
     */
    { val: PM_KOBOLD, nm: _("KOBOLD") },
    { val: PM_LARGE_KOBOLD, nm: _("LARGE_KOBOLD") },
    { val: PM_KOBOLD_LEADER, nm: _("KOBOLD_LEADER") },
    { val: PM_KOBOLD_SHAMAN, nm: _("KOBOLD_SHAMAN") },
    /*
     * leprechauns
     */
    { val: PM_LEPRECHAUN, nm: _("LEPRECHAUN") },
    /*
     * mimics
     */
    { val: PM_SMALL_MIMIC, nm: _("SMALL_MIMIC") },
    { val: PM_LARGE_MIMIC, nm: _("LARGE_MIMIC") },
    { val: PM_GIANT_MIMIC, nm: _("GIANT_MIMIC") },
    /*
     * nymphs
     */
    { val: PM_WOOD_NYMPH, nm: _("WOOD_NYMPH") },
    { val: PM_WATER_NYMPH, nm: _("WATER_NYMPH") },
    { val: PM_MOUNTAIN_NYMPH, nm: _("MOUNTAIN_NYMPH") },
    /*
     * orcs
     */
    { val: PM_GOBLIN, nm: _("GOBLIN") },
    { val: PM_HOBGOBLIN, nm: _("HOBGOBLIN") },
    /* Plain "orc" for zombie and mummy corpses only; not created at random.
     * Orcs (but not goblins and hobgoblins) are granted poison resistance;
     * however their corpses don't confer it. */
    { val: PM_ORC, nm: _("ORC") },
    { val: PM_HILL_ORC, nm: _("HILL_ORC") },
    { val: PM_MORDOR_ORC, nm: _("MORDOR_ORC") },
    { val: PM_URUK_HAI, nm: _("URUK_HAI") },
    { val: PM_ORC_SHAMAN, nm: _("ORC_SHAMAN") },
    { val: PM_ORC_CAPTAIN, nm: _("ORC_CAPTAIN") },
    /*
     * piercers
     */
    { val: PM_ROCK_PIERCER, nm: _("ROCK_PIERCER") },
    { val: PM_IRON_PIERCER, nm: _("IRON_PIERCER") },
    { val: PM_GLASS_PIERCER, nm: _("GLASS_PIERCER") },
    /*
     * quadrupeds
     *  (note: horses are grouped with unicorns in another section below)
     */
    { val: PM_ROTHE, nm: _("ROTHE") },
    { val: PM_MUMAK, nm: _("MUMAK") },
    { val: PM_LEOCROTTA, nm: _("LEOCROTTA") },
    { val: PM_WUMPUS, nm: _("WUMPUS") },
    { val: PM_TITANOTHERE, nm: _("TITANOTHERE") },
    { val: PM_BALUCHITHERIUM, nm: _("BALUCHITHERIUM") },
    { val: PM_MASTODON, nm: _("MASTODON") },
    /*
     * rodents
     */
    { val: PM_SEWER_RAT, nm: _("SEWER_RAT") },
    { val: PM_GIANT_RAT, nm: _("GIANT_RAT") },
    { val: PM_RABID_RAT, nm: _("RABID_RAT") },
    { val: PM_WERERAT, nm: _("WERERAT") },
    { val: PM_ROCK_MOLE, nm: _("ROCK_MOLE") },
    { val: PM_WOODCHUCK, nm: _("WOODCHUCK") },
    /*
     * spiders & scorpions (keep webmaker() in sync if new critters are added)
     */
    { val: PM_CAVE_SPIDER, nm: _("CAVE_SPIDER") },
    { val: PM_CENTIPEDE, nm: _("CENTIPEDE") },
    { val: PM_GIANT_SPIDER, nm: _("GIANT_SPIDER") },
    { val: PM_SCORPION, nm: _("SCORPION") },
    /*
     * trappers lurkers &c
     * Note:  prior to 5.0 these were defined to do AD_DGST damage
     * but they don't swallow their victims into their stomachs and
     * digest they enfold and crush or suffocate.
     * The Monster Manual states that someone engulfed by a trapper
     * can't use weapons but we do not enforce that.
     */
    { val: PM_LURKER_ABOVE, nm: _("LURKER_ABOVE") },
    { val: PM_TRAPPER, nm: _("TRAPPER") },
    /*
     * unicorns and horses
     */
    { val: PM_PONY, nm: _("PONY") },
    { val: PM_WHITE_UNICORN, nm: _("WHITE_UNICORN") },
    { val: PM_GRAY_UNICORN, nm: _("GRAY_UNICORN") },
    { val: PM_BLACK_UNICORN, nm: _("BLACK_UNICORN") },
    { val: PM_HORSE, nm: _("HORSE") },
    { val: PM_WARHORSE, nm: _("WARHORSE") },
    /*
     * vortices
     */
    { val: PM_FOG_CLOUD, nm: _("FOG_CLOUD") },
    { val: PM_DUST_VORTEX, nm: _("DUST_VORTEX") },
    { val: PM_ICE_VORTEX, nm: _("ICE_VORTEX") },
    { val: PM_ENERGY_VORTEX, nm: _("ENERGY_VORTEX") },
    { val: PM_STEAM_VORTEX, nm: _("STEAM_VORTEX") },
    { val: PM_FIRE_VORTEX, nm: _("FIRE_VORTEX") },
    /*
     * worms
     */
    { val: PM_BABY_LONG_WORM, nm: _("BABY_LONG_WORM") },
    { val: PM_BABY_PURPLE_WORM, nm: _("BABY_PURPLE_WORM") },
    { val: PM_LONG_WORM, nm: _("LONG_WORM") },
    { val: PM_PURPLE_WORM, nm: _("PURPLE_WORM") },
    /*
     * xan &c
     */
    { val: PM_GRID_BUG, nm: _("GRID_BUG") },
    { val: PM_XAN, nm: _("XAN") },
    /*
     * lights
     */
    /* yellow light is visible and its suicidal explosion causes blindness */
    { val: PM_YELLOW_LIGHT, nm: _("YELLOW_LIGHT") },
    /* black light is invisible and causes hallucination */
    { val: PM_BLACK_LIGHT, nm: _("BLACK_LIGHT") },
    /*
     * zruty
     */
    { val: PM_ZRUTY, nm: _("ZRUTY") },
    /*
     * Angels and other lawful minions
     */
    { val: PM_COUATL, nm: _("COUATL") },
    { val: PM_ALEAX, nm: _("ALEAX") },
    /* Angels start with the emin extension attached and usually have
       the isminion flag set; however non-minion Angels can be tamed
       and will switch to edog (guardian Angel is handled specially and
       always sticks with emin) */
    { val: PM_ANGEL, nm: _("ANGEL") },
    /* the AD&D Monster Manual depicts ki-rin as very similar to unicorns
       except that they fly (without wings) and can cast spells; nethack's
       ki-rin doesn't leave its horn when killed but it can use the horn
       while alive to cure itself of various maladies */
    { val: PM_KI_RIN, nm: _("KI_RIN") },
    { val: PM_ARCHON, nm: _("ARCHON") },
    /*
     * Bats and birds
     */
    { val: PM_BAT, nm: _("BAT") },
    { val: PM_GIANT_BAT, nm: _("GIANT_BAT") },
    { val: PM_RAVEN, nm: _("RAVEN") },
    { val: PM_VAMPIRE_BAT, nm: _("VAMPIRE_BAT") },
    /*
     * Centaurs
     */
    { val: PM_PLAINS_CENTAUR, nm: _("PLAINS_CENTAUR") },
    { val: PM_FOREST_CENTAUR, nm: _("FOREST_CENTAUR") },
    { val: PM_MOUNTAIN_CENTAUR, nm: _("MOUNTAIN_CENTAUR") },
    /*
     * Dragons
     */
    /* The order of the dragons is VERY IMPORTANT.  Quite a few
     * pieces of code depend on gray being first and yellow being last.
     * The code also depends on the *order* being the same as that for
     * dragon scale mail and dragon scales in objects.c.  [Also
     * 'tilemap' assumes that shimmering dragon follows silver dragon.]
     *
     * Adult dragons are all lawful or chaotic; baby dragons are all
     * neutral.  This affects monster generation on some special levels.
     * Baby dragons cannot confer intrinsics to avoid polyself/egg abuse.
     *
     * As reptiles dragons are cold-blooded and thus aren't seen with
     * infravision.  Red and gold dragons (also Chromatic Dragon) are
     * the exceptions because they breathe fire.
     */
    { val: PM_BABY_GRAY_DRAGON, nm: _("BABY_GRAY_DRAGON") },
    { val: PM_BABY_GOLD_DRAGON, nm: _("BABY_GOLD_DRAGON") },
    { val: PM_BABY_SILVER_DRAGON, nm: _("BABY_SILVER_DRAGON") },











    { val: PM_BABY_RED_DRAGON, nm: _("BABY_RED_DRAGON") },
    { val: PM_BABY_WHITE_DRAGON, nm: _("BABY_WHITE_DRAGON") },
    { val: PM_BABY_ORANGE_DRAGON, nm: _("BABY_ORANGE_DRAGON") },
    { val: PM_BABY_BLACK_DRAGON, nm: _("BABY_BLACK_DRAGON") },
    { val: PM_BABY_BLUE_DRAGON, nm: _("BABY_BLUE_DRAGON") },
    { val: PM_BABY_GREEN_DRAGON, nm: _("BABY_GREEN_DRAGON") },
    { val: PM_BABY_YELLOW_DRAGON, nm: _("BABY_YELLOW_DRAGON") },
    { val: PM_GRAY_DRAGON, nm: _("GRAY_DRAGON") },
    /* gold dragon can be seen via infravision but doesn't have infravision */
    { val: PM_GOLD_DRAGON, nm: _("GOLD_DRAGON") },
    { val: PM_SILVER_DRAGON, nm: _("SILVER_DRAGON") },

















    /* red dragon has infravision and can be seen via infravision */
    { val: PM_RED_DRAGON, nm: _("RED_DRAGON") },
    { val: PM_WHITE_DRAGON, nm: _("WHITE_DRAGON") },
    { val: PM_ORANGE_DRAGON, nm: _("ORANGE_DRAGON") },
    /* disintegration breath is actually all or nothing not 1d255 */
    { val: PM_BLACK_DRAGON, nm: _("BLACK_DRAGON") },
    { val: PM_BLUE_DRAGON, nm: _("BLUE_DRAGON") },
    { val: PM_GREEN_DRAGON, nm: _("GREEN_DRAGON") },
    { val: PM_YELLOW_DRAGON, nm: _("YELLOW_DRAGON") },
    /*
     * Elementals
     */
    { val: PM_STALKER, nm: _("STALKER") },
    { val: PM_AIR_ELEMENTAL, nm: _("AIR_ELEMENTAL") },
    { val: PM_FIRE_ELEMENTAL, nm: _("FIRE_ELEMENTAL") },
    { val: PM_EARTH_ELEMENTAL, nm: _("EARTH_ELEMENTAL") },
    { val: PM_WATER_ELEMENTAL, nm: _("WATER_ELEMENTAL") },
    /*
     * Fungi
     */
    { val: PM_LICHEN, nm: _("LICHEN") },
    { val: PM_BROWN_MOLD, nm: _("BROWN_MOLD") },
    { val: PM_YELLOW_MOLD, nm: _("YELLOW_MOLD") },
    { val: PM_GREEN_MOLD, nm: _("GREEN_MOLD") },
    { val: PM_RED_MOLD, nm: _("RED_MOLD") },
    { val: PM_SHRIEKER, nm: _("SHRIEKER") },
    { val: PM_VIOLET_FUNGUS, nm: _("VIOLET_FUNGUS") },
    /*
     * Gnomes
     *  Unlike plain human|elf|orc plain "gnome" is an ordinary monster.
     */
    { val: PM_GNOME, nm: _("GNOME") },
    { val: PM_GNOME_LEADER, nm: _("GNOME_LEADER") },
    { val: PM_GNOMISH_WIZARD, nm: _("GNOMISH_WIZARD") },
    { val: PM_GNOME_RULER, nm: _("GNOME_RULER") },
    /*
     * giant Humanoids
     */
    /* plain giant is a placeholder for zombie and mummy corpses */
    { val: PM_GIANT, nm: _("GIANT") },
    { val: PM_STONE_GIANT, nm: _("STONE_GIANT") },
    { val: PM_HILL_GIANT, nm: _("HILL_GIANT") },
    { val: PM_FIRE_GIANT, nm: _("FIRE_GIANT") },
    { val: PM_FROST_GIANT, nm: _("FROST_GIANT") },
    /* ettin is a two-headed giant but its corpse doesn't confer strength */
    { val: PM_ETTIN, nm: _("ETTIN") },
    { val: PM_STORM_GIANT, nm: _("STORM_GIANT") },
    { val: PM_TITAN, nm: _("TITAN") },
    { val: PM_MINOTAUR, nm: _("MINOTAUR") },
    /*
     * Invisible
     * S_invisible=='I' is a visual marker for all invisible monsters
     * and must be not be used for any specific monster types.  Long
     * time 'invisible stalker' was changed to 'stalker' an Elemental.
     */

    /*
     * Jabberwock
     */
    /* the illustration from _Through_the_Looking_Glass_
       depicts hands as well as wings */
    { val: PM_JABBERWOCK, nm: _("JABBERWOCK") },











    /*
     * Kops
     */
    { val: PM_KEYSTONE_KOP, nm: _("KEYSTONE_KOP") },
    { val: PM_KOP_SERGEANT, nm: _("KOP_SERGEANT") },
    { val: PM_KOP_LIEUTENANT, nm: _("KOP_LIEUTENANT") },
    { val: PM_KOP_KAPTAIN, nm: _("KOP_KAPTAIN") },
    /*
     * Liches
     */
    { val: PM_LICH, nm: _("LICH") },
    { val: PM_DEMILICH, nm: _("DEMILICH") },
    { val: PM_MASTER_LICH, nm: _("MASTER_LICH") },
    { val: PM_ARCH_LICH, nm: _("ARCH_LICH") },
    /*
     * Mummies
     */
    { val: PM_KOBOLD_MUMMY, nm: _("KOBOLD_MUMMY") },
    { val: PM_GNOME_MUMMY, nm: _("GNOME_MUMMY") },
    { val: PM_ORC_MUMMY, nm: _("ORC_MUMMY") },
    { val: PM_DWARF_MUMMY, nm: _("DWARF_MUMMY") },
    { val: PM_ELF_MUMMY, nm: _("ELF_MUMMY") },
    { val: PM_HUMAN_MUMMY, nm: _("HUMAN_MUMMY") },
    { val: PM_ETTIN_MUMMY, nm: _("ETTIN_MUMMY") },
    { val: PM_GIANT_MUMMY, nm: _("GIANT_MUMMY") },
    /*
     * Nagas
     */
    { val: PM_RED_NAGA_HATCHLING, nm: _("RED_NAGA_HATCHLING") },
    { val: PM_BLACK_NAGA_HATCHLING, nm: _("BLACK_NAGA_HATCHLING") },
    { val: PM_GOLDEN_NAGA_HATCHLING, nm: _("GOLDEN_NAGA_HATCHLING") },
    { val: PM_GUARDIAN_NAGA_HATCHLING, nm: _("GUARDIAN_NAGA_HATCHLING") },
    { val: PM_RED_NAGA, nm: _("RED_NAGA") },
    { val: PM_BLACK_NAGA, nm: _("BLACK_NAGA") },
    { val: PM_GOLDEN_NAGA, nm: _("GOLDEN_NAGA") },
    /* 5.0: guardian naga used to have three attacks: bite spit hug
       but in order for the hug to succeed the two preceding attacks had
       to have hit and it's not possible to both bite and spit hence
       the hug never hit; change to spit bite touch hug; if the bite
       and touch hit the hug will too */
    { val: PM_GUARDIAN_NAGA, nm: _("GUARDIAN_NAGA") },
    /*
     * Ogres
     */
    { val: PM_OGRE, nm: _("OGRE") },
    { val: PM_OGRE_LEADER, nm: _("OGRE_LEADER") },
    { val: PM_OGRE_TYRANT, nm: _("OGRE_TYRANT") },
    /*
     * Puddings
     *
     * must be in the same order as the pudding globs in objects.c
     */
    { val: PM_GRAY_OOZE, nm: _("GRAY_OOZE") },
    { val: PM_BROWN_PUDDING, nm: _("BROWN_PUDDING") },
    { val: PM_GREEN_SLIME, nm: _("GREEN_SLIME") },
    { val: PM_BLACK_PUDDING, nm: _("BLACK_PUDDING") },
    /*
     * Quantum mechanics
     */
    { val: PM_QUANTUM_MECHANIC, nm: _("QUANTUM_MECHANIC") },
    /* 5.0: from slash'em to expand Q class; hit polymorphs target */
    { val: PM_GENETIC_ENGINEER, nm: _("GENETIC_ENGINEER") },
    /*
     * Rust monster or disenchanter
     */
    { val: PM_RUST_MONSTER, nm: _("RUST_MONSTER") },
    { val: PM_DISENCHANTER, nm: _("DISENCHANTER") },
    /*
     * Snakes
     *  Note: in the real world most snakes are oviparous but some aren't;
     *  we treat all of these as if they are.
     */
    { val: PM_GARTER_SNAKE, nm: _("GARTER_SNAKE") },
    { val: PM_SNAKE, nm: _("SNAKE") },
    { val: PM_WATER_MOCCASIN, nm: _("WATER_MOCCASIN") },
    { val: PM_PYTHON, nm: _("PYTHON") },
    { val: PM_PIT_VIPER, nm: _("PIT_VIPER") },
    { val: PM_COBRA, nm: _("COBRA") },
    /*
     * Trolls
     */
    { val: PM_TROLL, nm: _("TROLL") },
    { val: PM_ICE_TROLL, nm: _("ICE_TROLL") },
    { val: PM_ROCK_TROLL, nm: _("ROCK_TROLL") },
    { val: PM_WATER_TROLL, nm: _("WATER_TROLL") },
    { val: PM_OLOG_HAI, nm: _("OLOG_HAI") },
    /*
     * Umber hulk
     */
    { val: PM_UMBER_HULK, nm: _("UMBER_HULK") },
    /*
     * Vampires
     */
    { val: PM_VAMPIRE, nm: _("VAMPIRE") },
    { val: PM_VAMPIRE_LEADER, nm: _("VAMPIRE_LEADER") },












    { val: PM_VLAD_THE_IMPALER, nm: _("VLAD_THE_IMPALER") },
    /*
     * Wraiths
     */
    { val: PM_BARROW_WIGHT, nm: _("BARROW_WIGHT") },
    /* wraiths weigh 0 but can leave corpses */
    { val: PM_WRAITH, nm: _("WRAITH") },
    { val: PM_NAZGUL, nm: _("NAZGUL") },
    /*
     * Xorn
     */
    { val: PM_XORN, nm: _("XORN") },
    /*
     * Apelike beasts
     */
    /* tameable via banana; does not grow up into ape...
       not flagged as domestic so no guilt penalty for eating non-pet one */
    { val: PM_MONKEY, nm: _("MONKEY") },
    { val: PM_APE, nm: _("APE") },
    { val: PM_OWLBEAR, nm: _("OWLBEAR") },
    { val: PM_YETI, nm: _("YETI") },
    { val: PM_CARNIVOROUS_APE, nm: _("CARNIVOROUS_APE") },
    { val: PM_SASQUATCH, nm: _("SASQUATCH") },
    /*
     * Zombies
     */
    { val: PM_KOBOLD_ZOMBIE, nm: _("KOBOLD_ZOMBIE") },
    { val: PM_GNOME_ZOMBIE, nm: _("GNOME_ZOMBIE") },
    { val: PM_ORC_ZOMBIE, nm: _("ORC_ZOMBIE") },
    { val: PM_DWARF_ZOMBIE, nm: _("DWARF_ZOMBIE") },
    { val: PM_ELF_ZOMBIE, nm: _("ELF_ZOMBIE") },
    { val: PM_HUMAN_ZOMBIE, nm: _("HUMAN_ZOMBIE") },
    { val: PM_ETTIN_ZOMBIE, nm: _("ETTIN_ZOMBIE") },
    { val: PM_GHOUL, nm: _("GHOUL") },
    { val: PM_GIANT_ZOMBIE, nm: _("GIANT_ZOMBIE") },
    { val: PM_SKELETON, nm: _("SKELETON") },
    /*
     * golems
     */
    { val: PM_STRAW_GOLEM, nm: _("STRAW_GOLEM") },
    { val: PM_PAPER_GOLEM, nm: _("PAPER_GOLEM") },
    { val: PM_ROPE_GOLEM, nm: _("ROPE_GOLEM") },
    { val: PM_GOLD_GOLEM, nm: _("GOLD_GOLEM") },
    { val: PM_LEATHER_GOLEM, nm: _("LEATHER_GOLEM") },
    { val: PM_WOOD_GOLEM, nm: _("WOOD_GOLEM") },
    { val: PM_FLESH_GOLEM, nm: _("FLESH_GOLEM") },
    { val: PM_CLAY_GOLEM, nm: _("CLAY_GOLEM") },
    { val: PM_STONE_GOLEM, nm: _("STONE_GOLEM") },
    { val: PM_GLASS_GOLEM, nm: _("GLASS_GOLEM") },
    { val: PM_IRON_GOLEM, nm: _("IRON_GOLEM") },
    /*
     * humans including elves and were-critters;
     *  the '@' class does not obey rule #2.
     *  Plain "human" is a placeholder not a normal monster.
     */
    { val: PM_HUMAN, nm: _("HUMAN") },
    { val: PM_HUMAN_WERERAT, nm: _("HUMAN_WERERAT") },
    { val: PM_HUMAN_WEREJACKAL, nm: _("HUMAN_WEREJACKAL") },
    { val: PM_HUMAN_WEREWOLF, nm: _("HUMAN_WEREWOLF") },
    /* plain "elf" is a placeholder not a normal monster */
    { val: PM_ELF, nm: _("ELF") },
    { val: PM_WOODLAND_ELF, nm: _("WOODLAND_ELF") },
    { val: PM_GREEN_ELF, nm: _("GREEN_ELF") },
    { val: PM_GREY_ELF, nm: _("GREY_ELF") },
    { val: PM_ELF_NOBLE, nm: _("ELF_NOBLE") },
    { val: PM_ELVEN_MONARCH, nm: _("ELVEN_MONARCH") },
    { val: PM_DOPPELGANGER, nm: _("DOPPELGANGER") },
    /* 5.0: shopkeepers used to have speed 18 but if/when they were
       hasted they always got 2 moves per turn and had a tendency to move
       away from blocking the door and then move right back; since they
       might start with a potion of speed and drink that as soon as the
       hero gets close once inside the shop the hero could have trouble
       getting out again; also being slowed still guaranteed one move
       per turn; reduce their innate speed from 18 to 16 for a hasted
       speed of 22 rather than 24 and slowed speed of 11 rather than 12;
       they will still block the shop door but not as tenaciously */
    { val: PM_SHOPKEEPER, nm: _("SHOPKEEPER") },
    /* vault guard */
    { val: PM_GUARD, nm: _("GUARD") },
    /* prisoner is used on some special levels */
    { val: PM_PRISONER, nm: _("PRISONER") },
    /* the Oracle of Delphi doesn't move */
    { val: PM_ORACLE, nm: _("ORACLE") },
    /* aligned priests always have the epri extension attached;
       individual instantiations should always have either ispriest
       or isminion set; role monster priests are separate (below) */
    { val: PM_ALIGNED_CLERIC, nm: _("ALIGNED_CLERIC") },
    /* high priests always have epri and always have ispriest set;
       they are flagged as unique even through they aren't */
    { val: PM_HIGH_CLERIC, nm: _("HIGH_CLERIC") },
    { val: PM_SOLDIER, nm: _("SOLDIER") },
    { val: PM_SERGEANT, nm: _("SERGEANT") },
    { val: PM_NURSE, nm: _("NURSE") },
    { val: PM_LIEUTENANT, nm: _("LIEUTENANT") },
    { val: PM_CAPTAIN, nm: _("CAPTAIN") },
    { val: PM_WATCHMAN, nm: _("WATCHMAN") },
    { val: PM_WATCH_CAPTAIN, nm: _("WATCH_CAPTAIN") },
    /* Unique humans not tied to quests.
     */
    { val: PM_MEDUSA, nm: _("MEDUSA") },
    { val: PM_WIZARD_OF_YENDOR, nm: _("WIZARD_OF_YENDOR") },
    { val: PM_CROESUS, nm: _("CROESUS") },













    /*
     * ghosts
     *  ghosts and shades don't leave corpses; assigning human weight
     *  to them matters for statues
     */
    { val: PM_GHOST, nm: _("GHOST") },
    { val: PM_SHADE, nm: _("SHADE") },
    /*
     * (major) demons
     */
    { val: PM_WATER_DEMON, nm: _("WATER_DEMON") },
    /* standard demons & devils
     */






    /* incubus and succubus; prior to 5.0 succubus and incubus were
       distinct monsters; "amorous demon" is considered to be a temporary
       placeholder but may be here to stay... */
    { val: PM_AMOROUS_DEMON, nm: _("AMOROUS_DEMON") },
    { val: PM_HORNED_DEVIL, nm: _("HORNED_DEVIL") },
    /* Used by AD&D for a type of demon originally one of the Furies
       and spelled this way; plural is erinyes */
    { val: PM_ERINYS, nm: _("ERINYS") },
    { val: PM_BARBED_DEVIL, nm: _("BARBED_DEVIL") },
    { val: PM_MARILITH, nm: _("MARILITH") },
    { val: PM_VROCK, nm: _("VROCK") },
    { val: PM_HEZROU, nm: _("HEZROU") },
    { val: PM_BONE_DEVIL, nm: _("BONE_DEVIL") },
    { val: PM_ICE_DEVIL, nm: _("ICE_DEVIL") },
    { val: PM_NALFESHNEE, nm: _("NALFESHNEE") },
    { val: PM_PIT_FIEND, nm: _("PIT_FIEND") },
    /* from Jack Vance's _Rhialto_the_Marvellous_ one of the sequels
       to _The_Dying_Earth_ */
    { val: PM_SANDESTIN, nm: _("SANDESTIN") },
    { val: PM_BALROG, nm: _("BALROG") },
    /* Named demon lords & princes plus Arch-Devils.
     * (their order matters; see minion.c)
     */
    { val: PM_JUIBLEX, nm: _("JUIBLEX") },
    { val: PM_YEENOGHU, nm: _("YEENOGHU") },
    { val: PM_ORCUS, nm: _("ORCUS") },
    { val: PM_GERYON, nm: _("GERYON") },
    { val: PM_DISPATER, nm: _("DISPATER") },
    { val: PM_BAALZEBUB, nm: _("BAALZEBUB") },
    { val: PM_ASMODEUS, nm: _("ASMODEUS") },
    { val: PM_DEMOGORGON, nm: _("DEMOGORGON") },
    /* Riders -- the Four Horsemen of the Apocalypse ("War" == player);
     * depicted with '&' but do not have M2_DEMON set.
     */
    { val: PM_DEATH, nm: _("DEATH") },
    { val: PM_PESTILENCE, nm: _("PESTILENCE") },
    { val: PM_FAMINE, nm: _("FAMINE") },
    /* other demons
     */

    { val: PM_MAIL_DAEMON, nm: _("MAIL_DAEMON") },

    /* djinni is singular; plural is djinn */
    { val: PM_DJINNI, nm: _("DJINNI") },
    /*
     * sea monsters
     *
     * 5.0: all the fish except kraken used to specify M1_SLITHY presumably
     * cloned from giant eel.  Using "slither" to describe their movement
     * wasn't appropriate.  Unfortunately locomotion() isn't able to choose
     * "swim" as their movement description because it is only passed a
     * monster type not a specific monster (for <mxmy>) or the relevant
     * location and therefore doesn't know whether water is involved.
     */
    { val: PM_JELLYFISH, nm: _("JELLYFISH") },
    { val: PM_PIRANHA, nm: _("PIRANHA") },
    { val: PM_SHARK, nm: _("SHARK") },
    { val: PM_GIANT_EEL, nm: _("GIANT_EEL") },
    { val: PM_ELECTRIC_EEL, nm: _("ELECTRIC_EEL") },
    { val: PM_KRAKEN, nm: _("KRAKEN") },
    /*
     * lizards &c
     */
    { val: PM_NEWT, nm: _("NEWT") },
    { val: PM_GECKO, nm: _("GECKO") },
    { val: PM_IGUANA, nm: _("IGUANA") },
    { val: PM_BABY_CROCODILE, nm: _("BABY_CROCODILE") },
    /* trivia:  before monster corpses were implemented "lizard corpse"
       was a specific type of item */
    { val: PM_LIZARD, nm: _("LIZARD") },
    { val: PM_CHAMELEON, nm: _("CHAMELEON") },
    { val: PM_CROCODILE, nm: _("CROCODILE") },
    { val: PM_SALAMANDER, nm: _("SALAMANDER") },

    /*
     * dummy monster needed for visual interface
     * (marking it unique prevents figurines)
     */
    { val: PM_LONG_WORM_TAIL, nm: _("LONG_WORM_TAIL") },
    /* Note:
     * Worm tail must be between the normal monsters and the special
     * quest & pseudo-character ones because an optimization in the
     * random monster selection code assumes everything beyond here
     * has the G_NOGEN and M2_NOPOLY attributes.
     */

    /*
     * character classes
     */
    { val: PM_ARCHEOLOGIST, nm: _("ARCHEOLOGIST") },
    { val: PM_BARBARIAN, nm: _("BARBARIAN") },
    { val: PM_CAVE_DWELLER, nm: _("CAVE_DWELLER") },
    { val: PM_HEALER, nm: _("HEALER") },
    { val: PM_KNIGHT, nm: _("KNIGHT") },
    { val: PM_MONK, nm: _("MONK") },
    /* monster priests are separate monsters (above; "aligned cleric") */
    { val: PM_CLERIC, nm: _("CLERIC") },
    { val: PM_RANGER, nm: _("RANGER") },
    { val: PM_ROGUE, nm: _("ROGUE") },
    { val: PM_SAMURAI, nm: _("SAMURAI") },
    { val: PM_TOURIST, nm: _("TOURIST") },
    /* valk is lawful by default; player valk can be neutral in which case
       role_init() will change this monster and 'warrior' to be neutral too;
       if a neutral valk leaves a bones file containing neutral warriors
       the latter will magically turn lawful if encountered by a lawful valk
       or any non-valk (for bones on the dungeon side of the portal) */
    { val: PM_VALKYRIE, nm: _("VALKYRIE") },
    { val: PM_WIZARD, nm: _("WIZARD") },
    /*
     * quest leaders
     */
    { val: PM_LORD_CARNARVON, nm: _("LORD_CARNARVON") },
    { val: PM_PELIAS, nm: _("PELIAS") },
    { val: PM_SHAMAN_KARNOV, nm: _("SHAMAN_KARNOV") },
























    { val: PM_HIPPOCRATES, nm: _("HIPPOCRATES") },
    { val: PM_KING_ARTHUR, nm: _("KING_ARTHUR") },
    { val: PM_GRAND_MASTER, nm: _("GRAND_MASTER") },
    { val: PM_ARCH_PRIEST, nm: _("ARCH_PRIEST") },
    { val: PM_ORION, nm: _("ORION") },
    /* Note: Master of Thieves is also the Tourist's nemesis.
     */
    { val: PM_MASTER_OF_THIEVES, nm: _("MASTER_OF_THIEVES") },
    { val: PM_LORD_SATO, nm: _("LORD_SATO") },
    { val: PM_TWOFLOWER, nm: _("TWOFLOWER") },
    /* for a valkyrie hero Norn's alignment will be changed to match hero's
       starting alignment */
    { val: PM_NORN, nm: _("NORN") },
    { val: PM_NEFERET_THE_GREEN, nm: _("NEFERET_THE_GREEN") },
    /*
     * quest nemeses
     */
    { val: PM_MINION_OF_HUHETOTL, nm: _("MINION_OF_HUHETOTL") },
    { val: PM_THOTH_AMON, nm: _("THOTH_AMON") },
    /* Multi-headed possessing the breath attacks of all the other dragons
     * (selected at random when attacking).  Despite being a superset of
     * gold dragon does not emit light.  Also does not fly.
     */
    { val: PM_CHROMATIC_DRAGON, nm: _("CHROMATIC_DRAGON") },












    { val: PM_CYCLOPS, nm: _("CYCLOPS") },
    { val: PM_IXOTH, nm: _("IXOTH") },
    { val: PM_MASTER_KAEN, nm: _("MASTER_KAEN") },
    { val: PM_NALZOK, nm: _("NALZOK") },
    { val: PM_SCORPIUS, nm: _("SCORPIUS") },
    { val: PM_MASTER_ASSASSIN, nm: _("MASTER_ASSASSIN") },
    /* A renegade daimyo who led a 13 year civil war against the shogun
     * of his time.
     */
    { val: PM_ASHIKAGA_TAKAUJI, nm: _("ASHIKAGA_TAKAUJI") },
    /*
     * Note: the Master of Thieves was defined above.
     */
    { val: PM_LORD_SURTUR, nm: _("LORD_SURTUR") },
    { val: PM_DARK_ONE, nm: _("DARK_ONE") },
    /*
     * quest "guardians"
     */
    { val: PM_STUDENT, nm: _("STUDENT") },
    { val: PM_CHIEFTAIN, nm: _("CHIEFTAIN") },
    { val: PM_NEANDERTHAL, nm: _("NEANDERTHAL") },











    /* attendants used to be lawful but have been changed to neutral because
       grow_up() promotes them to healer and the latter is always neutral */
    { val: PM_ATTENDANT, nm: _("ATTENDANT") },
    { val: PM_PAGE, nm: _("PAGE") },
    { val: PM_ABBOT, nm: _("ABBOT") },
    { val: PM_ACOLYTE, nm: _("ACOLYTE") },
    { val: PM_HUNTER, nm: _("HUNTER") },
    { val: PM_THUG, nm: _("THUG") },
    { val: PM_NINJA, nm: _("NINJA") },
    { val: PM_ROSHI, nm: _("ROSHI") },
    { val: PM_GUIDE, nm: _("GUIDE") },
    /* warriors used to be chaotic but have been changed to lawful because
       grow_up() promotes them to valkyrie; for a valkyrie hero they might
       be changed to neutral at game start; see the valkyrie comment above */
    { val: PM_WARRIOR, nm: _("WARRIOR") },
    { val: PM_APPRENTICE, nm: _("APPRENTICE") },
    ];
}

// the records of objdump[] from objects.h, laid out like it
function objdump_records() {
    return [
{ val: STRANGE_OBJECT, nm: _("STRANGE_OBJECT") },
/* slots [1] through [MAXOCLASSES-1] are indexed by class; some are
   used for display purposes most aren't used; none are actual objects;
   note that 'real' strange object is in slot [0] but ILLOBJ_CLASS is 1
   so we add a dummy for it in slot [1] to simplify accessing the rest;
   there isn't any entry for RANDOM_CLASS (0) */
{ val: GENERIC_ILLOBJ, nm: _("GENERIC_ILLOBJ") },  /* [1] */
{ val: GENERIC_WEAPON, nm: _("GENERIC_WEAPON") },  /* [2] */
{ val: GENERIC_ARMOR, nm: _("GENERIC_ARMOR") },   /* [3] */
{ val: GENERIC_RING, nm: _("GENERIC_RING") },    /* [4] */
{ val: GENERIC_AMULET, nm: _("GENERIC_AMULET") },  /* [5] */
{ val: GENERIC_TOOL, nm: _("GENERIC_TOOL") },    /* [6] */
{ val: GENERIC_FOOD, nm: _("GENERIC_FOOD") },    /* [7] */
{ val: GENERIC_POTION, nm: _("GENERIC_POTION") },  /* [8] */
{ val: GENERIC_SCROLL, nm: _("GENERIC_SCROLL") },  /* [9] */
{ val: GENERIC_SPBOOK, nm: _("GENERIC_SPBOOK") },  /* [10] */
{ val: GENERIC_WAND, nm: _("GENERIC_WAND") },    /* [11] */
{ val: GENERIC_COIN, nm: _("GENERIC_COIN") },    /* [12] */
{ val: GENERIC_GEM, nm: _("GENERIC_GEM") },     /* [13] */
{ val: GENERIC_ROCK, nm: _("GENERIC_ROCK") },    /* [14] bldr+statue */
{ val: GENERIC_BALL, nm: _("GENERIC_BALL") },    /* [15] */
{ val: GENERIC_CHAIN, nm: _("GENERIC_CHAIN") },   /* [16] */
{ val: GENERIC_VENOM, nm: _("GENERIC_VENOM") },   /* [17] */

/* FIRST_OBJECT: it would be simpler just to use MARKER(FIRST_OBJECTARROW)
   below but that is vulnerable to neglecting to update the marker enum
   after inserting something in front of arrow */
 
   
/* this definition of FIRST_OBJECT advances the default value for next enum;
   backtrack to fix that otherwise ARROW and the rest would be off by 1 */
   

/* weapons ... */


















/* Note: for weapons that don't do an even die of damage (ex. 2-7 or 3-18)
   the extra damage is added on in weapon.c not here! */

/* weapon strike mode overloads the oc_dir field */




/* missiles; materiel reflects the arrowhead not the shaft */
{ val: ARROW, nm: _("ARROW") },
{ val: ELVEN_ARROW, nm: _("ELVEN_ARROW") },
{ val: ORCISH_ARROW, nm: _("ORCISH_ARROW") },
{ val: SILVER_ARROW, nm: _("SILVER_ARROW") },
{ val: YA, nm: _("YA") },
{ val: CROSSBOW_BOLT, nm: _("CROSSBOW_BOLT") },

/* missiles that don't use a launcher */
{ val: DART, nm: _("DART") },
{ val: SHURIKEN, nm: _("SHURIKEN") },
{ val: BOOMERANG, nm: _("BOOMERANG") },

/* spears [note: javelin used to have a separate skill from spears
   because the latter are primarily stabbing weapons rather than
   throwing ones; but for playability they've been merged together
   under spear skill and spears can now be thrown like javelins] */
{ val: SPEAR, nm: _("SPEAR") },
{ val: ELVEN_SPEAR, nm: _("ELVEN_SPEAR") },
{ val: ORCISH_SPEAR, nm: _("ORCISH_SPEAR") },
{ val: DWARVISH_SPEAR, nm: _("DWARVISH_SPEAR") },
{ val: SILVER_SPEAR, nm: _("SILVER_SPEAR") },
{ val: JAVELIN, nm: _("JAVELIN") },

/* spearish; doesn't stack not intended to be thrown */
{ val: TRIDENT, nm: _("TRIDENT") },
        /* +1 small +2d4 large */

/* blades; all stack */
{ val: DAGGER, nm: _("DAGGER") },
{ val: ELVEN_DAGGER, nm: _("ELVEN_DAGGER") },
{ val: ORCISH_DAGGER, nm: _("ORCISH_DAGGER") },
{ val: SILVER_DAGGER, nm: _("SILVER_DAGGER") },
{ val: ATHAME, nm: _("ATHAME") },
{ val: SCALPEL, nm: _("SCALPEL") },
{ val: KNIFE, nm: _("KNIFE") },
{ val: STILETTO, nm: _("STILETTO") },
/* 3.6: worm teeth and crysknives now stack;
   when a stack of teeth is enchanted at once they fuse into one crysknife;
   when a stack of crysknives drops the whole stack reverts to teeth */
/* 5.0: change crysknife from MINERAL to BONE and worm tooth from 0 to BONE */
{ val: WORM_TOOTH, nm: _("WORM_TOOTH") },
{ val: CRYSKNIFE, nm: _("CRYSKNIFE") },

/* axes */
{ val: AXE, nm: _("AXE") },
{ val: BATTLE_AXE, nm: _("BATTLE_AXE") },

/* swords */
{ val: SHORT_SWORD, nm: _("SHORT_SWORD") },
{ val: ELVEN_SHORT_SWORD, nm: _("ELVEN_SHORT_SWORD") },
{ val: ORCISH_SHORT_SWORD, nm: _("ORCISH_SHORT_SWORD") },
{ val: DWARVISH_SHORT_SWORD, nm: _("DWARVISH_SHORT_SWORD") },
{ val: SCIMITAR, nm: _("SCIMITAR") },
{ val: SILVER_SABER, nm: _("SILVER_SABER") },
{ val: BROADSWORD, nm: _("BROADSWORD") },
        /* +d4 small +1 large */
{ val: ELVEN_BROADSWORD, nm: _("ELVEN_BROADSWORD") },
        /* +d4 small +1 large */
{ val: LONG_SWORD, nm: _("LONG_SWORD") },
{ val: TWO_HANDED_SWORD, nm: _("TWO_HANDED_SWORD") },
        /* +2d6 large */
{ val: KATANA, nm: _("KATANA") },
/* special swords set up for artifacts */
{ val: TSURUGI, nm: _("TSURUGI") },
        /* +2d6 large */
{ val: RUNESWORD, nm: _("RUNESWORD") },
        /* +d4 small +1 large; Stormbringer: +5d2 +d8 from level drain */

/* polearms */
/* spear-type */
{ val: PARTISAN, nm: _("PARTISAN") },
        /* +1 large */
{ val: RANSEUR, nm: _("RANSEUR") },
        /* +d4 both */
{ val: SPETUM, nm: _("SPETUM") },
        /* +1 small +d6 large */
{ val: GLAIVE, nm: _("GLAIVE") },
/* axe-type */
{ val: HALBERD, nm: _("HALBERD") },
        /* +1d6 large */
{ val: BARDICHE, nm: _("BARDICHE") },
        /* +1d4 small +2d4 large */
{ val: VOULGE, nm: _("VOULGE") },
        /* +d4 both */
/* curved/hooked */
{ val: FAUCHARD, nm: _("FAUCHARD") },
{ val: GUISARME, nm: _("GUISARME") },
        /* +1d4 small */
{ val: BILL_GUISARME, nm: _("BILL_GUISARME") },
        /* +1d4 small */
/* other */
{ val: LUCERN_HAMMER, nm: _("LUCERN_HAMMER") },
        /* +1d4 small */
{ val: BEC_DE_CORBIN, nm: _("BEC_DE_CORBIN") },

/* formerly grouped with the polearms but don't use polearms skill;
   lance isn't even two-handed */
{ val: DWARVISH_MATTOCK, nm: _("DWARVISH_MATTOCK") },
{ val: LANCE, nm: _("LANCE") },
        /* +2d10 when jousting with lance as primary weapon
           +2d2 when jousting with it as secondary when dual wielding */

/* bludgeons */
{ val: MACE, nm: _("MACE") },
        /* +1 small */
{ val: SILVER_MACE, nm: _("SILVER_MACE") },
        /* +1 small */
{ val: MORNING_STAR, nm: _("MORNING_STAR") },
        /* +d4 small +1 large */
{ val: WAR_HAMMER, nm: _("WAR_HAMMER") },
        /* +1 small */
{ val: CLUB, nm: _("CLUB") },
{ val: RUBBER_HOSE, nm: _("RUBBER_HOSE") },
{ val: QUARTERSTAFF, nm: _("QUARTERSTAFF") },
/* two-piece */
{ val: AKLYS, nm: _("AKLYS") },
{ val: FLAIL, nm: _("FLAIL") },
        /* +1 small +1d4 large */

/* misc */
{ val: BULLWHIP, nm: _("BULLWHIP") },

/* bows */
{ val: BOW, nm: _("BOW") },
{ val: ELVEN_BOW, nm: _("ELVEN_BOW") },
{ val: ORCISH_BOW, nm: _("ORCISH_BOW") },
{ val: YUMI, nm: _("YUMI") },
{ val: SLING, nm: _("SLING") },
{ val: CROSSBOW, nm: _("CROSSBOW") },









/* armor ... */
        /* IRON denotes ferrous metals including steel.
         * Only IRON weapons and armor can rust.
         * Only COPPER (including brass) corrodes.
         * Some creatures are vulnerable to SILVER.
         */






















/* helmets */
{ val: ELVEN_LEATHER_HELM, nm: _("ELVEN_LEATHER_HELM") },
{ val: ORCISH_HELM, nm: _("ORCISH_HELM") },
{ val: DWARVISH_IRON_HELM, nm: _("DWARVISH_IRON_HELM") },
{ val: FEDORA, nm: _("FEDORA") },
{ val: CORNUTHAUM, nm: _("CORNUTHAUM") },
{ val: DUNCE_CAP, nm: _("DUNCE_CAP") },
{ val: DENTED_POT, nm: _("DENTED_POT") },
{ val: HELM_OF_BRILLIANCE, nm: _("HELM_OF_BRILLIANCE") },
/* with shuffled appearances... */
{ val: HELMET, nm: _("HELMET") },
{ val: HELM_OF_CAUTION, nm: _("HELM_OF_CAUTION") },
{ val: HELM_OF_OPPOSITE_ALIGNMENT, nm: _("HELM_OF_OPPOSITE_ALIGNMENT") },
{ val: HELM_OF_TELEPATHY, nm: _("HELM_OF_TELEPATHY") },

/* suits of armor */
/*
 * There is code in polyself.c that assumes (1) and (2).
 * There is code in obj.h objnam.c mon.c read.c that assumes (2).
 *      (1) The dragon scale mails and the dragon scales are together.
 *      (2) That the order of the dragon scale mail and dragon scales
 *          is the same as order of dragons defined in monst.c.
 */



/* 3.4.1: dragon scale mail reclassified as "magic" since magic is
   needed to create them */
{ val: GRAY_DRAGON_SCALE_MAIL, nm: _("GRAY_DRAGON_SCALE_MAIL") },
    /* gold DSM is a light source; there's no property for that */
{ val: GOLD_DRAGON_SCALE_MAIL, nm: _("GOLD_DRAGON_SCALE_MAIL") },
{ val: SILVER_DRAGON_SCALE_MAIL, nm: _("SILVER_DRAGON_SCALE_MAIL") },




{ val: RED_DRAGON_SCALE_MAIL, nm: _("RED_DRAGON_SCALE_MAIL") },
{ val: WHITE_DRAGON_SCALE_MAIL, nm: _("WHITE_DRAGON_SCALE_MAIL") },
{ val: ORANGE_DRAGON_SCALE_MAIL, nm: _("ORANGE_DRAGON_SCALE_MAIL") },
{ val: BLACK_DRAGON_SCALE_MAIL, nm: _("BLACK_DRAGON_SCALE_MAIL") },
{ val: BLUE_DRAGON_SCALE_MAIL, nm: _("BLUE_DRAGON_SCALE_MAIL") },
{ val: GREEN_DRAGON_SCALE_MAIL, nm: _("GREEN_DRAGON_SCALE_MAIL") },
{ val: YELLOW_DRAGON_SCALE_MAIL, nm: _("YELLOW_DRAGON_SCALE_MAIL") },
/* For now only dragons leave these. */
/* 3.4.1: dragon scales left classified as "non-magic"; they confer magical
   properties but are produced "naturally"; affects use as polypile fodder */
{ val: GRAY_DRAGON_SCALES, nm: _("GRAY_DRAGON_SCALES") },
{ val: GOLD_DRAGON_SCALES, nm: _("GOLD_DRAGON_SCALES") },
{ val: SILVER_DRAGON_SCALES, nm: _("SILVER_DRAGON_SCALES") },




{ val: RED_DRAGON_SCALES, nm: _("RED_DRAGON_SCALES") },
{ val: WHITE_DRAGON_SCALES, nm: _("WHITE_DRAGON_SCALES") },
{ val: ORANGE_DRAGON_SCALES, nm: _("ORANGE_DRAGON_SCALES") },
{ val: BLACK_DRAGON_SCALES, nm: _("BLACK_DRAGON_SCALES") },
{ val: BLUE_DRAGON_SCALES, nm: _("BLUE_DRAGON_SCALES") },
{ val: GREEN_DRAGON_SCALES, nm: _("GREEN_DRAGON_SCALES") },
{ val: YELLOW_DRAGON_SCALES, nm: _("YELLOW_DRAGON_SCALES") },

/* other suits */
{ val: PLATE_MAIL, nm: _("PLATE_MAIL") },
{ val: CRYSTAL_PLATE_MAIL, nm: _("CRYSTAL_PLATE_MAIL") },
{ val: BRONZE_PLATE_MAIL, nm: _("BRONZE_PLATE_MAIL") },
{ val: SPLINT_MAIL, nm: _("SPLINT_MAIL") },
{ val: BANDED_MAIL, nm: _("BANDED_MAIL") },
{ val: DWARVISH_MITHRIL_COAT, nm: _("DWARVISH_MITHRIL_COAT") },
{ val: ELVEN_MITHRIL_COAT, nm: _("ELVEN_MITHRIL_COAT") },
{ val: CHAIN_MAIL, nm: _("CHAIN_MAIL") },
{ val: ORCISH_CHAIN_MAIL, nm: _("ORCISH_CHAIN_MAIL") },
{ val: SCALE_MAIL, nm: _("SCALE_MAIL") },
{ val: STUDDED_LEATHER_ARMOR, nm: _("STUDDED_LEATHER_ARMOR") },
{ val: RING_MAIL, nm: _("RING_MAIL") },
{ val: ORCISH_RING_MAIL, nm: _("ORCISH_RING_MAIL") },
{ val: LEATHER_ARMOR, nm: _("LEATHER_ARMOR") },
{ val: LEATHER_JACKET, nm: _("LEATHER_JACKET") },

/* shirts */
{ val: HAWAIIAN_SHIRT, nm: _("HAWAIIAN_SHIRT") },
{ val: T_SHIRT, nm: _("T_SHIRT") },

/* cloaks */
{ val: MUMMY_WRAPPING, nm: _("MUMMY_WRAPPING") },
        /* worn mummy wrapping blocks invisibility */
{ val: ELVEN_CLOAK, nm: _("ELVEN_CLOAK") },
{ val: ORCISH_CLOAK, nm: _("ORCISH_CLOAK") },
{ val: DWARVISH_CLOAK, nm: _("DWARVISH_CLOAK") },
{ val: OILSKIN_CLOAK, nm: _("OILSKIN_CLOAK") },
{ val: ROBE, nm: _("ROBE") },
        /* robe was adopted from slash'em where it's worn as a suit
           rather than as a cloak and there are several variations */
{ val: ALCHEMY_SMOCK, nm: _("ALCHEMY_SMOCK") },
{ val: LEATHER_CLOAK, nm: _("LEATHER_CLOAK") },
/* with shuffled appearances... */
{ val: CLOAK_OF_PROTECTION, nm: _("CLOAK_OF_PROTECTION") },
        /* cloak of protection is now the only item conferring MC 3 */
{ val: CLOAK_OF_INVISIBILITY, nm: _("CLOAK_OF_INVISIBILITY") },
{ val: CLOAK_OF_MAGIC_RESISTANCE, nm: _("CLOAK_OF_MAGIC_RESISTANCE") },
        /*  'cope' is not a spelling mistake... leave it be */
{ val: CLOAK_OF_DISPLACEMENT, nm: _("CLOAK_OF_DISPLACEMENT") },

/* shields */
{ val: SMALL_SHIELD, nm: _("SMALL_SHIELD") },
{ val: SHIELD_OF_DRAIN_RESISTANCE, nm: _("SHIELD_OF_DRAIN_RESISTANCE") },
{ val: SHIELD_OF_SHOCK_RESISTANCE, nm: _("SHIELD_OF_SHOCK_RESISTANCE") },
{ val: ELVEN_SHIELD, nm: _("ELVEN_SHIELD") },
{ val: URUK_HAI_SHIELD, nm: _("URUK_HAI_SHIELD") },
{ val: ORCISH_SHIELD, nm: _("ORCISH_SHIELD") },
{ val: LARGE_SHIELD, nm: _("LARGE_SHIELD") },
{ val: DWARVISH_ROUNDSHIELD, nm: _("DWARVISH_ROUNDSHIELD") },
{ val: SHIELD_OF_REFLECTION, nm: _("SHIELD_OF_REFLECTION") },

/* gloves */
/* These have their color but not material shuffled so the IRON must
 * stay CLR_BROWN (== HI_LEATHER) even though it's normally either
 * HI_METAL or CLR_BLACK.  All have shuffled descriptions.
 */
{ val: LEATHER_GLOVES, nm: _("LEATHER_GLOVES") },
{ val: GAUNTLETS_OF_FUMBLING, nm: _("GAUNTLETS_OF_FUMBLING") },
{ val: GAUNTLETS_OF_POWER, nm: _("GAUNTLETS_OF_POWER") },
{ val: GAUNTLETS_OF_DEXTERITY, nm: _("GAUNTLETS_OF_DEXTERITY") },

/* boots */
{ val: LOW_BOOTS, nm: _("LOW_BOOTS") },
{ val: IRON_SHOES, nm: _("IRON_SHOES") },
{ val: HIGH_BOOTS, nm: _("HIGH_BOOTS") },
/* with shuffled appearances... */
{ val: SPEED_BOOTS, nm: _("SPEED_BOOTS") },
{ val: WATER_WALKING_BOOTS, nm: _("WATER_WALKING_BOOTS") },
{ val: JUMPING_BOOTS, nm: _("JUMPING_BOOTS") },
{ val: ELVEN_BOOTS, nm: _("ELVEN_BOOTS") },
{ val: KICKING_BOOTS, nm: _("KICKING_BOOTS") },
        /* CLR_BROWN for same reason as gauntlets of power */
{ val: FUMBLE_BOOTS, nm: _("FUMBLE_BOOTS") },
{ val: LEVITATION_BOOTS, nm: _("LEVITATION_BOOTS") },







/* rings ... */





{ val: RIN_ADORNMENT, nm: _("RIN_ADORNMENT") },
{ val: RIN_GAIN_STRENGTH, nm: _("RIN_GAIN_STRENGTH") },
{ val: RIN_GAIN_CONSTITUTION, nm: _("RIN_GAIN_CONSTITUTION") },
{ val: RIN_INCREASE_ACCURACY, nm: _("RIN_INCREASE_ACCURACY") },
{ val: RIN_INCREASE_DAMAGE, nm: _("RIN_INCREASE_DAMAGE") },
{ val: RIN_PROTECTION, nm: _("RIN_PROTECTION") },
        /* 'PROTECTION' intrinsic enhances MC from worn armor by +1
           regardless of ring's enchantment; wearing a second ring of
           protection (or even one ring of protection combined with
           cloak of protection) doesn't give a second MC boost */
{ val: RIN_REGENERATION, nm: _("RIN_REGENERATION") },
{ val: RIN_SEARCHING, nm: _("RIN_SEARCHING") },
{ val: RIN_STEALTH, nm: _("RIN_STEALTH") },
{ val: RIN_SUSTAIN_ABILITY, nm: _("RIN_SUSTAIN_ABILITY") },
{ val: RIN_LEVITATION, nm: _("RIN_LEVITATION") },
{ val: RIN_HUNGER, nm: _("RIN_HUNGER") },
{ val: RIN_AGGRAVATE_MONSTER, nm: _("RIN_AGGRAVATE_MONSTER") },
{ val: RIN_CONFLICT, nm: _("RIN_CONFLICT") },
{ val: RIN_WARNING, nm: _("RIN_WARNING") },
{ val: RIN_POISON_RESISTANCE, nm: _("RIN_POISON_RESISTANCE") },
{ val: RIN_FIRE_RESISTANCE, nm: _("RIN_FIRE_RESISTANCE") },
{ val: RIN_COLD_RESISTANCE, nm: _("RIN_COLD_RESISTANCE") },
{ val: RIN_SHOCK_RESISTANCE, nm: _("RIN_SHOCK_RESISTANCE") },
{ val: RIN_FREE_ACTION, nm: _("RIN_FREE_ACTION") },
{ val: RIN_SLOW_DIGESTION, nm: _("RIN_SLOW_DIGESTION") },
{ val: RIN_TELEPORTATION, nm: _("RIN_TELEPORTATION") },
{ val: RIN_TELEPORT_CONTROL, nm: _("RIN_TELEPORT_CONTROL") },
{ val: RIN_POLYMORPH, nm: _("RIN_POLYMORPH") },
{ val: RIN_POLYMORPH_CONTROL, nm: _("RIN_POLYMORPH_CONTROL") },
{ val: RIN_INVISIBILITY, nm: _("RIN_INVISIBILITY") },
{ val: RIN_SEE_INVISIBLE, nm: _("RIN_SEE_INVISIBLE") },
{ val: RIN_PROTECTION_FROM_SHAPE_CHAN, nm: _("RIN_PROTECTION_FROM_SHAPE_CHAN") },


/* amulets ... - THE Amulet comes last because it is special */




{ val: AMULET_OF_ESP, nm: _("AMULET_OF_ESP") },
 
{ val: AMULET_OF_LIFE_SAVING, nm: _("AMULET_OF_LIFE_SAVING") },
{ val: AMULET_OF_STRANGULATION, nm: _("AMULET_OF_STRANGULATION") },
{ val: AMULET_OF_RESTFUL_SLEEP, nm: _("AMULET_OF_RESTFUL_SLEEP") },
{ val: AMULET_VERSUS_POISON, nm: _("AMULET_VERSUS_POISON") },
{ val: AMULET_OF_CHANGE, nm: _("AMULET_OF_CHANGE") },
{ val: AMULET_OF_UNCHANGING, nm: _("AMULET_OF_UNCHANGING") },
{ val: AMULET_OF_REFLECTION, nm: _("AMULET_OF_REFLECTION") },
{ val: AMULET_OF_MAGICAL_BREATHING, nm: _("AMULET_OF_MAGICAL_BREATHING") },
        /* +2 AC and +2 MC; +2 takes naked hero past 'warded' to 'guarded' */
{ val: AMULET_OF_GUARDING, nm: _("AMULET_OF_GUARDING") },
        /* cubical: some descriptions are already three dimensional and
           parallelogrammatical (real word!) would be way over the top */
{ val: AMULET_OF_FLYING, nm: _("AMULET_OF_FLYING") },
/* fixed descriptions; description duplication is deliberate;
 * fake one must come before real one because selection for
 * description shuffling stops when a non-magic amulet is encountered
 */
{ val: FAKE_AMULET_OF_YENDOR, nm: _("FAKE_AMULET_OF_YENDOR") },
{ val: AMULET_OF_YENDOR, nm: _("AMULET_OF_YENDOR") },
 


/* tools ... */
/* tools with weapon characteristics come last */


















/* containers */
{ val: LARGE_BOX, nm: _("LARGE_BOX") },
{ val: CHEST, nm: _("CHEST") },
{ val: ICE_BOX, nm: _("ICE_BOX") },
{ val: SACK, nm: _("SACK") },
{ val: OILSKIN_SACK, nm: _("OILSKIN_SACK") },
{ val: BAG_OF_HOLDING, nm: _("BAG_OF_HOLDING") },
{ val: BAG_OF_TRICKS, nm: _("BAG_OF_TRICKS") },


/* lock opening tools */
{ val: SKELETON_KEY, nm: _("SKELETON_KEY") },
{ val: LOCK_PICK, nm: _("LOCK_PICK") },
{ val: CREDIT_CARD, nm: _("CREDIT_CARD") },
/* light sources */
{ val: TALLOW_CANDLE, nm: _("TALLOW_CANDLE") },
{ val: WAX_CANDLE, nm: _("WAX_CANDLE") },
{ val: BRASS_LANTERN, nm: _("BRASS_LANTERN") },
{ val: OIL_LAMP, nm: _("OIL_LAMP") },
{ val: MAGIC_LAMP, nm: _("MAGIC_LAMP") },
/* other tools */
{ val: EXPENSIVE_CAMERA, nm: _("EXPENSIVE_CAMERA") },
{ val: MIRROR, nm: _("MIRROR") },
{ val: CRYSTAL_BALL, nm: _("CRYSTAL_BALL") },
/* eyewear - tools which can be worn on the face; (!mrg !chg !mgc)
   worn lenses don't confer the Blinded property blindfolds and towels do;
   wet towel can be used as a weapon but is not a weptool and uses obj->spe
   differently from weapons and weptools */
{ val: LENSES, nm: _("LENSES") },
{ val: BLINDFOLD, nm: _("BLINDFOLD") },
{ val: TOWEL, nm: _("TOWEL") },


/* still other tools */
{ val: SADDLE, nm: _("SADDLE") },
{ val: LEASH, nm: _("LEASH") },
{ val: STETHOSCOPE, nm: _("STETHOSCOPE") },
{ val: TINNING_KIT, nm: _("TINNING_KIT") },
{ val: TIN_OPENER, nm: _("TIN_OPENER") },
{ val: CAN_OF_GREASE, nm: _("CAN_OF_GREASE") },
{ val: FIGURINE, nm: _("FIGURINE") },
        /* monster type specified by obj->corpsenm */
{ val: MAGIC_MARKER, nm: _("MAGIC_MARKER") },
/* traps */
{ val: LAND_MINE, nm: _("LAND_MINE") },
{ val: BEARTRAP, nm: _("BEARTRAP") },
/* instruments;
   "If tin whistles are made out of tin what do they make foghorns out of?" */
{ val: TIN_WHISTLE, nm: _("TIN_WHISTLE") },
{ val: MAGIC_WHISTLE, nm: _("MAGIC_WHISTLE") },
{ val: WOODEN_FLUTE, nm: _("WOODEN_FLUTE") },
{ val: MAGIC_FLUTE, nm: _("MAGIC_FLUTE") },
{ val: TOOLED_HORN, nm: _("TOOLED_HORN") },
{ val: FROST_HORN, nm: _("FROST_HORN") },
{ val: FIRE_HORN, nm: _("FIRE_HORN") },
{ val: HORN_OF_PLENTY, nm: _("HORN_OF_PLENTY") },
        /* horn but not an instrument */
{ val: WOODEN_HARP, nm: _("WOODEN_HARP") },
{ val: MAGIC_HARP, nm: _("MAGIC_HARP") },
{ val: BELL, nm: _("BELL") },
{ val: BUGLE, nm: _("BUGLE") },
{ val: LEATHER_DRUM, nm: _("LEATHER_DRUM") },
{ val: DRUM_OF_EARTHQUAKE, nm: _("DRUM_OF_EARTHQUAKE") },
/* tools useful as weapons */
{ val: PICK_AXE, nm: _("PICK_AXE") },
{ val: GRAPPLING_HOOK, nm: _("GRAPPLING_HOOK") },
{ val: UNICORN_HORN, nm: _("UNICORN_HORN") },
        /* 3.4.1: unicorn horn left classified as "magic" */
/* two unique tools;
 * not artifacts despite the comment which used to be here
 */
{ val: CANDELABRUM_OF_INVOCATION, nm: _("CANDELABRUM_OF_INVOCATION") },
{ val: BELL_OF_OPENING, nm: _("BELL_OF_OPENING") },



/* Comestibles ... */





/* All types of food (except tins & corpses) must have a delay of at least 1.
 * Delay on corpses is computed and is weight dependent.
 * Domestic pets prefer tripe rations above all others.
 * Fortune cookies can be read using them up without ingesting them.
 * Carrots improve your vision.
 * +0 tins contain monster meat.
 * +1 tins (of spinach) make you stronger (like Popeye).
 * Meatballs/sticks/rings are only created from objects via stone to flesh.
 */
/* meat */
{ val: TRIPE_RATION, nm: _("TRIPE_RATION") },
{ val: CORPSE, nm: _("CORPSE") },
{ val: EGG, nm: _("EGG") },
{ val: MEATBALL, nm: _("MEATBALL") },
{ val: MEAT_STICK, nm: _("MEAT_STICK") },
/* formerly "huge chunk of meat" */
{ val: ENORMOUS_MEATBALL, nm: _("ENORMOUS_MEATBALL") },
/* special case because it's not mergeable */
{ val: MEAT_RING, nm: _("MEAT_RING") },
/* pudding 'corpses' will turn into these and combine;
   must be in same order as the pudding monsters */
{ val: GLOB_OF_GRAY_OOZE, nm: _("GLOB_OF_GRAY_OOZE") },
{ val: GLOB_OF_BROWN_PUDDING, nm: _("GLOB_OF_BROWN_PUDDING") },
{ val: GLOB_OF_GREEN_SLIME, nm: _("GLOB_OF_GREEN_SLIME") },
{ val: GLOB_OF_BLACK_PUDDING, nm: _("GLOB_OF_BLACK_PUDDING") },

/* fruits & veggies */
{ val: KELP_FROND, nm: _("KELP_FROND") },
{ val: EUCALYPTUS_LEAF, nm: _("EUCALYPTUS_LEAF") },
{ val: APPLE, nm: _("APPLE") },
{ val: ORANGE, nm: _("ORANGE") },
{ val: PEAR, nm: _("PEAR") },
{ val: MELON, nm: _("MELON") },
{ val: BANANA, nm: _("BANANA") },
{ val: CARROT, nm: _("CARROT") },
{ val: SPRIG_OF_WOLFSBANE, nm: _("SPRIG_OF_WOLFSBANE") },
{ val: CLOVE_OF_GARLIC, nm: _("CLOVE_OF_GARLIC") },
/* name of slime mold is changed based on player's OPTION=fruit:something
   and bones data might have differently named ones from prior games */
{ val: SLIME_MOLD, nm: _("SLIME_MOLD") },

/* people food */
{ val: LUMP_OF_ROYAL_JELLY, nm: _("LUMP_OF_ROYAL_JELLY") },
{ val: CREAM_PIE, nm: _("CREAM_PIE") },
{ val: CANDY_BAR, nm: _("CANDY_BAR") },
{ val: FORTUNE_COOKIE, nm: _("FORTUNE_COOKIE") },
{ val: PANCAKE, nm: _("PANCAKE") },
{ val: LEMBAS_WAFER, nm: _("LEMBAS_WAFER") },
{ val: CRAM_RATION, nm: _("CRAM_RATION") },
{ val: FOOD_RATION, nm: _("FOOD_RATION") },
{ val: K_RATION, nm: _("K_RATION") },
{ val: C_RATION, nm: _("C_RATION") },
/* tins have type specified by obj->spe (+1 for spinach other implies
   flesh; negative specifies preparation method {homemadeboiled&c})
   and by obj->corpsenm (type of monster flesh) */
{ val: TIN, nm: _("TIN") },


/* potions ... */




{ val: POT_GAIN_ABILITY, nm: _("POT_GAIN_ABILITY") },
{ val: POT_RESTORE_ABILITY, nm: _("POT_RESTORE_ABILITY") },
{ val: POT_CONFUSION, nm: _("POT_CONFUSION") },
{ val: POT_BLINDNESS, nm: _("POT_BLINDNESS") },
{ val: POT_PARALYSIS, nm: _("POT_PARALYSIS") },
{ val: POT_SPEED, nm: _("POT_SPEED") },
{ val: POT_LEVITATION, nm: _("POT_LEVITATION") },
{ val: POT_HALLUCINATION, nm: _("POT_HALLUCINATION") },
{ val: POT_INVISIBILITY, nm: _("POT_INVISIBILITY") },
{ val: POT_SEE_INVISIBLE, nm: _("POT_SEE_INVISIBLE") },
{ val: POT_HEALING, nm: _("POT_HEALING") },
{ val: POT_EXTRA_HEALING, nm: _("POT_EXTRA_HEALING") },
{ val: POT_GAIN_LEVEL, nm: _("POT_GAIN_LEVEL") },
{ val: POT_ENLIGHTENMENT, nm: _("POT_ENLIGHTENMENT") },
{ val: POT_MONSTER_DETECTION, nm: _("POT_MONSTER_DETECTION") },
{ val: POT_OBJECT_DETECTION, nm: _("POT_OBJECT_DETECTION") },
{ val: POT_GAIN_ENERGY, nm: _("POT_GAIN_ENERGY") },
{ val: POT_SLEEPING, nm: _("POT_SLEEPING") },
{ val: POT_FULL_HEALING, nm: _("POT_FULL_HEALING") },
{ val: POT_POLYMORPH, nm: _("POT_POLYMORPH") },
{ val: POT_BOOZE, nm: _("POT_BOOZE") },
{ val: POT_SICKNESS, nm: _("POT_SICKNESS") },
{ val: POT_FRUIT_JUICE, nm: _("POT_FRUIT_JUICE") },
{ val: POT_ACID, nm: _("POT_ACID") },
{ val: POT_OIL, nm: _("POT_OIL") },
/* fixed description
 */
{ val: POT_WATER, nm: _("POT_WATER") },


/* scrolls ... */





{ val: SCR_ENCHANT_ARMOR, nm: _("SCR_ENCHANT_ARMOR") },
{ val: SCR_DESTROY_ARMOR, nm: _("SCR_DESTROY_ARMOR") },
{ val: SCR_CONFUSE_MONSTER, nm: _("SCR_CONFUSE_MONSTER") },
{ val: SCR_SCARE_MONSTER, nm: _("SCR_SCARE_MONSTER") },
{ val: SCR_REMOVE_CURSE, nm: _("SCR_REMOVE_CURSE") },
{ val: SCR_ENCHANT_WEAPON, nm: _("SCR_ENCHANT_WEAPON") },
{ val: SCR_CREATE_MONSTER, nm: _("SCR_CREATE_MONSTER") },
{ val: SCR_TAMING, nm: _("SCR_TAMING") },
{ val: SCR_GENOCIDE, nm: _("SCR_GENOCIDE") },
{ val: SCR_LIGHT, nm: _("SCR_LIGHT") },
{ val: SCR_TELEPORTATION, nm: _("SCR_TELEPORTATION") },
{ val: SCR_GOLD_DETECTION, nm: _("SCR_GOLD_DETECTION") },
{ val: SCR_FOOD_DETECTION, nm: _("SCR_FOOD_DETECTION") },
{ val: SCR_IDENTIFY, nm: _("SCR_IDENTIFY") },
{ val: SCR_MAGIC_MAPPING, nm: _("SCR_MAGIC_MAPPING") },
{ val: SCR_AMNESIA, nm: _("SCR_AMNESIA") },
{ val: SCR_FIRE, nm: _("SCR_FIRE") },
{ val: SCR_EARTH, nm: _("SCR_EARTH") },
{ val: SCR_PUNISHMENT, nm: _("SCR_PUNISHMENT") },
{ val: SCR_CHARGING, nm: _("SCR_CHARGING") },
{ val: SCR_STINKING_CLOUD, nm: _("SCR_STINKING_CLOUD") },
    /* Extra descriptions shuffled into use at start of new game.
     * Code in win/share/tilemap.c depends on SCR_STINKING_CLOUD preceding
     * these and on how many of them there are.  If a real scroll gets added
     * after stinking cloud or the number of extra descriptions changes
     * tilemap.c must be modified to match.  MgcProbCost are superfluous.
     * SC values must be distinct but are only used by 'nethack --dumpenums'.
     */

{ val: SC01, nm: _("SC01") },
{ val: SC02, nm: _("SC02") },
{ val: SC03, nm: _("SC03") },
{ val: SC04, nm: _("SC04") },
{ val: SC05, nm: _("SC05") },
{ val: SC06, nm: _("SC06") },
{ val: SC07, nm: _("SC07") }, /* Illuminati */
{ val: SC08, nm: _("SC08") }, /* Kurd Lasswitz */
{ val: SC09, nm: _("SC09") }, /* traditional incantation */
{ val: SC10, nm: _("SC10") }, /* Portal */
{ val: SC11, nm: _("SC11") }, /* Zak McKracken */
{ val: SC12, nm: _("SC12") }, /* Zak McKracken */
{ val: SC13, nm: _("SC13") },
{ val: SC14, nm: _("SC14") }, /* Merseburg Incantations */
{ val: SC15, nm: _("SC15") }, /* Merseburg Incantations */
{ val: SC16, nm: _("SC16") }, /* pronounced as 'fish'
                                                * George Bernard Shaw */
{ val: SC17, nm: _("SC17") }, /* Wizardry */
{ val: SC18, nm: _("SC18") }, /* Ultima */
{ val: SC19, nm: _("SC19") }, /* Aarne Haapakoski */
{ val: SC20, nm: _("SC20") }, /* Czech and Slovak
                                                * tongue-twister */

    /* These must come last because they have special fixed descriptions.
     */

{ val: SCR_MAIL, nm: _("SCR_MAIL") },

{ val: SCR_BLANK_PAPER, nm: _("SCR_BLANK_PAPER") },


/* spellbooks ... */
    /* Expanding beyond 52 spells would require changes in spellcasting
     * or imposition of a limit on number of spells hero can know because
     * they are currently assigned successive letters a-zA-Z when learned.
     * [The existing spell sorting capability could conceivably be extended
     * to enable moving spells from beyond Z to within it bumping others
     * out in the process allowing more than 52 spells be known but keeping
     * only 52 be castable at any given time.]
     */





/* Spellbook description normally refers to book covers (primarily color).
   Parchment and vellum would never be used for such but rather than
   eliminate those finagle their definitions to refer to the pages
   rather than the cover.  They are made from animal skin (typically of
   a goat or sheep) and books using them for pages generally need heavy
   covers with straps or clamps to tightly close the book in order to
   keep the pages flat.  (However a wooden cover might itself be covered
   by a sheet of parchment making this become less of an exception.  Also
   changing the internal composition from paper to leather makes eating a
   parchment or vellum spellbook break vegetarian conduct as it should.) */

{ val: SPE_DIG, nm: _("SPE_DIG") },
 
/* magic missile ... finger of death must be in this order; see buzz() */
{ val: SPE_MAGIC_MISSILE, nm: _("SPE_MAGIC_MISSILE") },

{ val: SPE_FIREBALL, nm: _("SPE_FIREBALL") },
{ val: SPE_CONE_OF_COLD, nm: _("SPE_CONE_OF_COLD") },
{ val: SPE_SLEEP, nm: _("SPE_SLEEP") },
{ val: SPE_FINGER_OF_DEATH, nm: _("SPE_FINGER_OF_DEATH") },
{ val: SPE_LIGHT, nm: _("SPE_LIGHT") },
{ val: SPE_DETECT_MONSTERS, nm: _("SPE_DETECT_MONSTERS") },
{ val: SPE_HEALING, nm: _("SPE_HEALING") },
{ val: SPE_KNOCK, nm: _("SPE_KNOCK") },
{ val: SPE_FORCE_BOLT, nm: _("SPE_FORCE_BOLT") },
{ val: SPE_CONFUSE_MONSTER, nm: _("SPE_CONFUSE_MONSTER") },
{ val: SPE_CURE_BLINDNESS, nm: _("SPE_CURE_BLINDNESS") },
{ val: SPE_DRAIN_LIFE, nm: _("SPE_DRAIN_LIFE") },
{ val: SPE_SLOW_MONSTER, nm: _("SPE_SLOW_MONSTER") },
{ val: SPE_WIZARD_LOCK, nm: _("SPE_WIZARD_LOCK") },
{ val: SPE_CREATE_MONSTER, nm: _("SPE_CREATE_MONSTER") },
{ val: SPE_DETECT_FOOD, nm: _("SPE_DETECT_FOOD") },
{ val: SPE_CAUSE_FEAR, nm: _("SPE_CAUSE_FEAR") },
{ val: SPE_CLAIRVOYANCE, nm: _("SPE_CLAIRVOYANCE") },
{ val: SPE_CURE_SICKNESS, nm: _("SPE_CURE_SICKNESS") },
{ val: SPE_CHARM_MONSTER, nm: _("SPE_CHARM_MONSTER") },
{ val: SPE_HASTE_SELF, nm: _("SPE_HASTE_SELF") },
{ val: SPE_DETECT_UNSEEN, nm: _("SPE_DETECT_UNSEEN") },
{ val: SPE_LEVITATION, nm: _("SPE_LEVITATION") },
{ val: SPE_EXTRA_HEALING, nm: _("SPE_EXTRA_HEALING") },
{ val: SPE_RESTORE_ABILITY, nm: _("SPE_RESTORE_ABILITY") },
{ val: SPE_INVISIBILITY, nm: _("SPE_INVISIBILITY") },
{ val: SPE_DETECT_TREASURE, nm: _("SPE_DETECT_TREASURE") },
{ val: SPE_REMOVE_CURSE, nm: _("SPE_REMOVE_CURSE") },
{ val: SPE_MAGIC_MAPPING, nm: _("SPE_MAGIC_MAPPING") },
{ val: SPE_IDENTIFY, nm: _("SPE_IDENTIFY") },
{ val: SPE_TURN_UNDEAD, nm: _("SPE_TURN_UNDEAD") },
{ val: SPE_POLYMORPH, nm: _("SPE_POLYMORPH") },
{ val: SPE_TELEPORT_AWAY, nm: _("SPE_TELEPORT_AWAY") },
{ val: SPE_CREATE_FAMILIAR, nm: _("SPE_CREATE_FAMILIAR") },
{ val: SPE_CANCELLATION, nm: _("SPE_CANCELLATION") },
{ val: SPE_PROTECTION, nm: _("SPE_PROTECTION") },
{ val: SPE_JUMPING, nm: _("SPE_JUMPING") },
{ val: SPE_STONE_TO_FLESH, nm: _("SPE_STONE_TO_FLESH") },
{ val: SPE_CHAIN_LIGHTNING, nm: _("SPE_CHAIN_LIGHTNING") },











/* books with fixed descriptions
 */
{ val: SPE_BLANK_PAPER, nm: _("SPE_BLANK_PAPER") },
/* LAST_SPELL is used to calculate MAXSPELL allocation size of spl_book[];
   by including blank paper which has no actual spell we ensure that
   even if hero learns every spell spl_book[] will have at least one
   unused slot at end; an unused slot is needed for use as terminator */
 
/* tribute book added in 3.6 */
{ val: SPE_NOVEL, nm: _("SPE_NOVEL") },
/* a special one of a kind spellbook */
{ val: SPE_BOOK_OF_THE_DEAD, nm: _("SPE_BOOK_OF_THE_DEAD") },


/* wands ... */




{ val: WAN_LIGHT, nm: _("WAN_LIGHT") },
{ val: WAN_SECRET_DOOR_DETECTION, nm: _("WAN_SECRET_DOOR_DETECTION") },
{ val: WAN_ENLIGHTENMENT, nm: _("WAN_ENLIGHTENMENT") },
{ val: WAN_CREATE_MONSTER, nm: _("WAN_CREATE_MONSTER") },
{ val: WAN_WISHING, nm: _("WAN_WISHING") },
{ val: WAN_STASIS, nm: _("WAN_STASIS") },
{ val: WAN_NOTHING, nm: _("WAN_NOTHING") },
{ val: WAN_STRIKING, nm: _("WAN_STRIKING") },
{ val: WAN_MAKE_INVISIBLE, nm: _("WAN_MAKE_INVISIBLE") },
{ val: WAN_SLOW_MONSTER, nm: _("WAN_SLOW_MONSTER") },
{ val: WAN_SPEED_MONSTER, nm: _("WAN_SPEED_MONSTER") },
{ val: WAN_UNDEAD_TURNING, nm: _("WAN_UNDEAD_TURNING") },
{ val: WAN_POLYMORPH, nm: _("WAN_POLYMORPH") },
{ val: WAN_CANCELLATION, nm: _("WAN_CANCELLATION") },
{ val: WAN_TELEPORTATION, nm: _("WAN_TELEPORTATION") },
{ val: WAN_OPENING, nm: _("WAN_OPENING") },
{ val: WAN_LOCKING, nm: _("WAN_LOCKING") },
{ val: WAN_PROBING, nm: _("WAN_PROBING") },
{ val: WAN_DIGGING, nm: _("WAN_DIGGING") },
/* magic missile ... lightning must be in this order; see buzz() */
{ val: WAN_MAGIC_MISSILE, nm: _("WAN_MAGIC_MISSILE") },
{ val: WAN_FIRE, nm: _("WAN_FIRE") },
{ val: WAN_COLD, nm: _("WAN_COLD") },
{ val: WAN_SLEEP, nm: _("WAN_SLEEP") },
{ val: WAN_DEATH, nm: _("WAN_DEATH") },
{ val: WAN_LIGHTNING, nm: _("WAN_LIGHTNING") },
/* extra descriptions shuffled into use at start of new game */
{ val: WAN1, nm: _("WAN1") },
{ val: WAN2, nm: _("WAN2") },
{ val: WAN3, nm: _("WAN3") },


/* coins ... - so far gold is all there is */




{ val: GOLD_PIECE, nm: _("GOLD_PIECE") },


/* gems ... - includes stones and rocks but not boulders */










{ val: DILITHIUM_CRYSTAL, nm: _("DILITHIUM_CRYSTAL") },
 
{ val: DIAMOND, nm: _("DIAMOND") },
{ val: RUBY, nm: _("RUBY") },
{ val: JACINTH, nm: _("JACINTH") },
{ val: SAPPHIRE, nm: _("SAPPHIRE") },
{ val: BLACK_OPAL, nm: _("BLACK_OPAL") },
{ val: EMERALD, nm: _("EMERALD") },
{ val: TURQUOISE, nm: _("TURQUOISE") },
{ val: CITRINE, nm: _("CITRINE") },
{ val: AQUAMARINE, nm: _("AQUAMARINE") },
{ val: AMBER, nm: _("AMBER") },
{ val: TOPAZ, nm: _("TOPAZ") },
{ val: JET, nm: _("JET") },
{ val: OPAL, nm: _("OPAL") },
{ val: CHRYSOBERYL, nm: _("CHRYSOBERYL") },
{ val: GARNET, nm: _("GARNET") },
{ val: AMETHYST, nm: _("AMETHYST") },
{ val: JASPER, nm: _("JASPER") },
{ val: FLUORITE, nm: _("FLUORITE") },
{ val: OBSIDIAN, nm: _("OBSIDIAN") },
{ val: AGATE, nm: _("AGATE") },
{ val: JADE, nm: _("JADE") },
 
{ val: WORTHLESS_WHITE_GLASS, nm: _("WORTHLESS_WHITE_GLASS") },
 
{ val: WORTHLESS_BLUE_GLASS, nm: _("WORTHLESS_BLUE_GLASS") },
{ val: WORTHLESS_RED_GLASS, nm: _("WORTHLESS_RED_GLASS") },
{ val: WORTHLESS_YELLOWBROWN_GLASS, nm: _("WORTHLESS_YELLOWBROWN_GLASS") },
{ val: WORTHLESS_ORANGE_GLASS, nm: _("WORTHLESS_ORANGE_GLASS") },
{ val: WORTHLESS_YELLOW_GLASS, nm: _("WORTHLESS_YELLOW_GLASS") },
{ val: WORTHLESS_BLACK_GLASS, nm: _("WORTHLESS_BLACK_GLASS") },
{ val: WORTHLESS_GREEN_GLASS, nm: _("WORTHLESS_GREEN_GLASS") },
{ val: WORTHLESS_VIOLET_GLASS, nm: _("WORTHLESS_VIOLET_GLASS") },
 

/* Placement note: there is a wishable subrange for
 * "gray stones" in the o_ranges[] array in objnam.c
 * that is currently everything between luckstones and flint
 * (inclusive).
 */
{ val: LUCKSTONE, nm: _("LUCKSTONE") },
{ val: LOADSTONE, nm: _("LOADSTONE") },
{ val: TOUCHSTONE, nm: _("TOUCHSTONE") },
{ val: FLINT, nm: _("FLINT") },
{ val: ROCK, nm: _("ROCK") },



/* miscellaneous ... */
/* Note: boulders and rocks are not normally created at random; the
 * probabilities only come into effect when you try to polymorph them.
 * Boulders weigh more than MAX_CARR_CAP; statues use corpsenm to take
 * on a specific type and may act as containers (both affect weight).
 */
{ val: BOULDER, nm: _("BOULDER") },
{ val: STATUE, nm: _("STATUE") },

{ val: HEAVY_IRON_BALL, nm: _("HEAVY_IRON_BALL") },
        /* +d4 when "very heavy" */
{ val: IRON_CHAIN, nm: _("IRON_CHAIN") },
        /* +1 both l & s */

/* Venom is normally a transitory missile (spit by various creatures)
 * but can be wished for in wizard mode so could occur in bones data.
 */
{ val: BLINDING_VENOM, nm: _("BLINDING_VENOM") },
{ val: ACID_VENOM, nm: _("ACID_VENOM") },
    ];
}

// the records of defsym_cmap_dump[] from defsym.h, laid out like it
function defsym_cmap_dump_records() {
    return [
    { val: S_stone, nm: _("S_stone") },
    { val: S_vwall, nm: _("S_vwall") },
    { val: S_hwall, nm: _("S_hwall") },
    { val: S_tlcorn, nm: _("S_tlcorn") },
    { val: S_trcorn, nm: _("S_trcorn") },
    { val: S_blcorn, nm: _("S_blcorn") },
    { val: S_brcorn, nm: _("S_brcorn") },
    { val: S_crwall, nm: _("S_crwall") },
    { val: S_tuwall, nm: _("S_tuwall") },
    { val: S_tdwall, nm: _("S_tdwall") },
    { val: S_tlwall, nm: _("S_tlwall") },
    { val: S_trwall, nm: _("S_trwall") },

    { val: S_ndoor, nm: _("S_ndoor") },
    { val: S_vodoor, nm: _("S_vodoor") },
    { val: S_hodoor, nm: _("S_hodoor") },
    { val: S_vcdoor, nm: _("S_vcdoor") },
    { val: S_hcdoor, nm: _("S_hcdoor") },
    { val: S_bars, nm: _("S_bars") },
    { val: S_tree, nm: _("S_tree") },
    { val: S_room, nm: _("S_room") },
    { val: S_darkroom, nm: _("S_darkroom") },
    { val: S_engroom, nm: _("S_engroom") },
    { val: S_corr, nm: _("S_corr") },
    { val: S_litcorr, nm: _("S_litcorr") },
    { val: S_engrcorr, nm: _("S_engrcorr") },
    { val: S_upstair, nm: _("S_upstair") },
    { val: S_dnstair, nm: _("S_dnstair") },
    { val: S_upladder, nm: _("S_upladder") },
    { val: S_dnladder, nm: _("S_dnladder") },
    { val: S_brupstair, nm: _("S_brupstair") },
    { val: S_brdnstair, nm: _("S_brdnstair") },
    { val: S_brupladder, nm: _("S_brupladder") },
    { val: S_brdnladder, nm: _("S_brdnladder") },

    { val: S_altar, nm: _("S_altar") },

    { val: S_grave, nm: _("S_grave") },
    { val: S_throne, nm: _("S_throne") },
    { val: S_sink, nm: _("S_sink") },
    { val: S_fountain, nm: _("S_fountain") },

    { val: S_pool, nm: _("S_pool") },
    { val: S_ice, nm: _("S_ice") },
    { val: S_lava, nm: _("S_lava") },
    { val: S_lavawall, nm: _("S_lavawall") },
    { val: S_vodbridge, nm: _("S_vodbridge") },
    { val: S_hodbridge, nm: _("S_hodbridge") },
    { val: S_vcdbridge, nm: _("S_vcdbridge") },
    { val: S_hcdbridge, nm: _("S_hcdbridge") },
    { val: S_air, nm: _("S_air") },
    { val: S_cloud, nm: _("S_cloud") },


    { val: S_water, nm: _("S_water") },




    { val: S_arrow_trap, nm: _("S_arrow_trap") },
    { val: S_dart_trap, nm: _("S_dart_trap") },
    { val: S_falling_rock_trap, nm: _("S_falling_rock_trap") },
    { val: S_squeaky_board, nm: _("S_squeaky_board") },
    { val: S_bear_trap, nm: _("S_bear_trap") },
    { val: S_land_mine, nm: _("S_land_mine") },
    { val: S_rolling_boulder_trap, nm: _("S_rolling_boulder_trap") },
    { val: S_sleeping_gas_trap, nm: _("S_sleeping_gas_trap") },
    { val: S_rust_trap, nm: _("S_rust_trap") },
    { val: S_fire_trap, nm: _("S_fire_trap") },
    { val: S_pit, nm: _("S_pit") },
    { val: S_spiked_pit, nm: _("S_spiked_pit") },
    { val: S_hole, nm: _("S_hole") },
    { val: S_trap_door, nm: _("S_trap_door") },
    { val: S_teleportation_trap, nm: _("S_teleportation_trap") },
    { val: S_level_teleporter, nm: _("S_level_teleporter") },
    { val: S_magic_portal, nm: _("S_magic_portal") },
    { val: S_web, nm: _("S_web") },
    { val: S_statue_trap, nm: _("S_statue_trap") },
    { val: S_magic_trap, nm: _("S_magic_trap") },
    { val: S_anti_magic_trap, nm: _("S_anti_magic_trap") },
    { val: S_polymorph_trap, nm: _("S_polymorph_trap") },
    { val: S_vibrating_square, nm: _("S_vibrating_square") },
    { val: S_trapped_door, nm: _("S_trapped_door") },
    { val: S_trapped_chest, nm: _("S_trapped_chest") },







    { val: S_vbeam, nm: _("S_vbeam") },
    { val: S_hbeam, nm: _("S_hbeam") },
    { val: S_lslant, nm: _("S_lslant") },
    { val: S_rslant, nm: _("S_rslant") },

    { val: S_digbeam, nm: _("S_digbeam") },
    { val: S_flashbeam, nm: _("S_flashbeam") },
    { val: S_boomleft, nm: _("S_boomleft") },
    { val: S_boomright, nm: _("S_boomright") },

    { val: S_ss1, nm: _("S_ss1") },
    { val: S_ss2, nm: _("S_ss2") },
    { val: S_ss3, nm: _("S_ss3") },
    { val: S_ss4, nm: _("S_ss4") },
    { val: S_poisoncloud, nm: _("S_poisoncloud") },


    { val: S_goodpos, nm: _("S_goodpos") },













    { val: S_sw_tl, nm: _("S_sw_tl") },
    { val: S_sw_tc, nm: _("S_sw_tc") },
    { val: S_sw_tr, nm: _("S_sw_tr") },
    { val: S_sw_ml, nm: _("S_sw_ml") },
    { val: S_sw_mr, nm: _("S_sw_mr") },
    { val: S_sw_bl, nm: _("S_sw_bl") },
    { val: S_sw_bc, nm: _("S_sw_bc") },
    { val: S_sw_br, nm: _("S_sw_br") },










    { val: S_expl_tl, nm: _("S_expl_tl") },
    { val: S_expl_tc, nm: _("S_expl_tc") },
    { val: S_expl_tr, nm: _("S_expl_tr") },
    { val: S_expl_ml, nm: _("S_expl_ml") },
    { val: S_expl_mc, nm: _("S_expl_mc") },
    { val: S_expl_mr, nm: _("S_expl_mr") },
    { val: S_expl_bl, nm: _("S_expl_bl") },
    { val: S_expl_bc, nm: _("S_expl_bc") },
    { val: S_expl_br, nm: _("S_expl_br") },
    ];
}

// the records of defsym_mon_syms_dump[]: column 0 of defsym_h_records()
function defsym_mon_syms_dump_records() { return defsym_h_records().map((row) => row[0]); }

// the records of defsym_mon_defchars_dump[]: column 1 of defsym_h_records()
function defsym_mon_defchars_dump_records() { return defsym_h_records().map((row) => row[1]); }

// one row per entry of defsym.h: [defsym_mon_syms_dump[i], defsym_mon_defchars_dump[i]], laid out like it
function defsym_h_records() {
    return [
    [{ val: S_ANT, nm: _("S_ANT") }, { val: DEF_ANT, nm: _("DEF_ANT") }],
    [{ val: S_BLOB, nm: _("S_BLOB") }, { val: DEF_BLOB, nm: _("DEF_BLOB") }],
    [{ val: S_COCKATRICE, nm: _("S_COCKATRICE") }, { val: DEF_COCKATRICE, nm: _("DEF_COCKATRICE") }],
    [{ val: S_DOG, nm: _("S_DOG") }, { val: DEF_DOG, nm: _("DEF_DOG") }],
    [{ val: S_EYE, nm: _("S_EYE") }, { val: DEF_EYE, nm: _("DEF_EYE") }],
    [{ val: S_FELINE, nm: _("S_FELINE") }, { val: DEF_FELINE, nm: _("DEF_FELINE") }],
    [{ val: S_GREMLIN, nm: _("S_GREMLIN") }, { val: DEF_GREMLIN, nm: _("DEF_GREMLIN") }],

    [{ val: S_HUMANOID, nm: _("S_HUMANOID") }, { val: DEF_HUMANOID, nm: _("DEF_HUMANOID") }],

    [{ val: S_IMP, nm: _("S_IMP") }, { val: DEF_IMP, nm: _("DEF_IMP") }],
    [{ val: S_JELLY, nm: _("S_JELLY") }, { val: DEF_JELLY, nm: _("DEF_JELLY") }],
    [{ val: S_KOBOLD, nm: _("S_KOBOLD") }, { val: DEF_KOBOLD, nm: _("DEF_KOBOLD") }],
    [{ val: S_LEPRECHAUN, nm: _("S_LEPRECHAUN") }, { val: DEF_LEPRECHAUN, nm: _("DEF_LEPRECHAUN") }],
    [{ val: S_MIMIC, nm: _("S_MIMIC") }, { val: DEF_MIMIC, nm: _("DEF_MIMIC") }],
    [{ val: S_NYMPH, nm: _("S_NYMPH") }, { val: DEF_NYMPH, nm: _("DEF_NYMPH") }],
    [{ val: S_ORC, nm: _("S_ORC") }, { val: DEF_ORC, nm: _("DEF_ORC") }],
    [{ val: S_PIERCER, nm: _("S_PIERCER") }, { val: DEF_PIERCER, nm: _("DEF_PIERCER") }],

    [{ val: S_QUADRUPED, nm: _("S_QUADRUPED") }, { val: DEF_QUADRUPED, nm: _("DEF_QUADRUPED") }],
    [{ val: S_RODENT, nm: _("S_RODENT") }, { val: DEF_RODENT, nm: _("DEF_RODENT") }],
    [{ val: S_SPIDER, nm: _("S_SPIDER") }, { val: DEF_SPIDER, nm: _("DEF_SPIDER") }],
    [{ val: S_TRAPPER, nm: _("S_TRAPPER") }, { val: DEF_TRAPPER, nm: _("DEF_TRAPPER") }],

    [{ val: S_UNICORN, nm: _("S_UNICORN") }, { val: DEF_UNICORN, nm: _("DEF_UNICORN") }],
    [{ val: S_VORTEX, nm: _("S_VORTEX") }, { val: DEF_VORTEX, nm: _("DEF_VORTEX") }],
    [{ val: S_WORM, nm: _("S_WORM") }, { val: DEF_WORM, nm: _("DEF_WORM") }],
    [{ val: S_XAN, nm: _("S_XAN") }, { val: DEF_XAN, nm: _("DEF_XAN") }],

    [{ val: S_LIGHT, nm: _("S_LIGHT") }, { val: DEF_LIGHT, nm: _("DEF_LIGHT") }],
    [{ val: S_ZRUTY, nm: _("S_ZRUTY") }, { val: DEF_ZRUTY, nm: _("DEF_ZRUTY") }],
    [{ val: S_ANGEL, nm: _("S_ANGEL") }, { val: DEF_ANGEL, nm: _("DEF_ANGEL") }],
    [{ val: S_BAT, nm: _("S_BAT") }, { val: DEF_BAT, nm: _("DEF_BAT") }],
    [{ val: S_CENTAUR, nm: _("S_CENTAUR") }, { val: DEF_CENTAUR, nm: _("DEF_CENTAUR") }],
    [{ val: S_DRAGON, nm: _("S_DRAGON") }, { val: DEF_DRAGON, nm: _("DEF_DRAGON") }],

    [{ val: S_ELEMENTAL, nm: _("S_ELEMENTAL") }, { val: DEF_ELEMENTAL, nm: _("DEF_ELEMENTAL") }],
    [{ val: S_FUNGUS, nm: _("S_FUNGUS") }, { val: DEF_FUNGUS, nm: _("DEF_FUNGUS") }],
    [{ val: S_GNOME, nm: _("S_GNOME") }, { val: DEF_GNOME, nm: _("DEF_GNOME") }],

    [{ val: S_GIANT, nm: _("S_GIANT") }, { val: DEF_GIANT, nm: _("DEF_GIANT") }],
    [{ val: S_invisible, nm: _("S_invisible") }, { val: DEF_INVISIBLE, nm: _("DEF_INVISIBLE") }],
    [{ val: S_JABBERWOCK, nm: _("S_JABBERWOCK") }, { val: DEF_JABBERWOCK, nm: _("DEF_JABBERWOCK") }],
    [{ val: S_KOP, nm: _("S_KOP") }, { val: DEF_KOP, nm: _("DEF_KOP") }],
    [{ val: S_LICH, nm: _("S_LICH") }, { val: DEF_LICH, nm: _("DEF_LICH") }],
    [{ val: S_MUMMY, nm: _("S_MUMMY") }, { val: DEF_MUMMY, nm: _("DEF_MUMMY") }],
    [{ val: S_NAGA, nm: _("S_NAGA") }, { val: DEF_NAGA, nm: _("DEF_NAGA") }],
    [{ val: S_OGRE, nm: _("S_OGRE") }, { val: DEF_OGRE, nm: _("DEF_OGRE") }],
    [{ val: S_PUDDING, nm: _("S_PUDDING") }, { val: DEF_PUDDING, nm: _("DEF_PUDDING") }],
    [{ val: S_QUANTMECH, nm: _("S_QUANTMECH") }, { val: DEF_QUANTMECH, nm: _("DEF_QUANTMECH") }],
    [{ val: S_RUSTMONST, nm: _("S_RUSTMONST") }, { val: DEF_RUSTMONST, nm: _("DEF_RUSTMONST") }],
    [{ val: S_SNAKE, nm: _("S_SNAKE") }, { val: DEF_SNAKE, nm: _("DEF_SNAKE") }],
    [{ val: S_TROLL, nm: _("S_TROLL") }, { val: DEF_TROLL, nm: _("DEF_TROLL") }],

    [{ val: S_UMBER, nm: _("S_UMBER") }, { val: DEF_UMBER, nm: _("DEF_UMBER") }],
    [{ val: S_VAMPIRE, nm: _("S_VAMPIRE") }, { val: DEF_VAMPIRE, nm: _("DEF_VAMPIRE") }],
    [{ val: S_WRAITH, nm: _("S_WRAITH") }, { val: DEF_WRAITH, nm: _("DEF_WRAITH") }],
    [{ val: S_XORN, nm: _("S_XORN") }, { val: DEF_XORN, nm: _("DEF_XORN") }],

    [{ val: S_YETI, nm: _("S_YETI") }, { val: DEF_YETI, nm: _("DEF_YETI") }],
    [{ val: S_ZOMBIE, nm: _("S_ZOMBIE") }, { val: DEF_ZOMBIE, nm: _("DEF_ZOMBIE") }],
    [{ val: S_HUMAN, nm: _("S_HUMAN") }, { val: DEF_HUMAN, nm: _("DEF_HUMAN") }],

    [{ val: S_GHOST, nm: _("S_GHOST") }, { val: DEF_GHOST, nm: _("DEF_GHOST") }],
    [{ val: S_GOLEM, nm: _("S_GOLEM") }, { val: DEF_GOLEM, nm: _("DEF_GOLEM") }],
    [{ val: S_DEMON, nm: _("S_DEMON") }, { val: DEF_DEMON, nm: _("DEF_DEMON") }],

    [{ val: S_EEL, nm: _("S_EEL") }, { val: DEF_EEL, nm: _("DEF_EEL") }],

    [{ val: S_LIZARD, nm: _("S_LIZARD") }, { val: DEF_LIZARD, nm: _("DEF_LIZARD") }],
    [{ val: S_WORM_TAIL, nm: _("S_WORM_TAIL") }, { val: DEF_WORM_TAIL, nm: _("DEF_WORM_TAIL") }],
    [{ val: S_MIMIC_DEF, nm: _("S_MIMIC_DEF") }, { val: DEF_MIMIC_DEF, nm: _("DEF_MIMIC_DEF") }],
    ];
}

// the records of objclass_defchars_dump[]: column 0 of defsym_h_records2()
function objclass_defchars_dump_records() { return defsym_h_records2().map((row) => row[0]); }

// the records of objclass_classes_dump[]: column 1 of defsym_h_records2()
function objclass_classes_dump_records() { return defsym_h_records2().map((row) => row[1]); }

// the records of objclass_syms_dump[]: column 2 of defsym_h_records2()
function objclass_syms_dump_records() { return defsym_h_records2().map((row) => row[2]); }

// one row per entry of defsym.h: [objclass_defchars_dump[i], objclass_classes_dump[i], objclass_syms_dump[i]], laid out like it
function defsym_h_records2() {
    return [
    [{ val: ILLOBJ_SYM, nm: _("ILLOBJ_SYM") }, { val: ILLOBJ_CLASS, nm: _("ILLOBJ_CLASS") }, { val: S_strange_obj, nm: _("S_strange_obj") }],
    [{ val: WEAPON_SYM, nm: _("WEAPON_SYM") }, { val: WEAPON_CLASS, nm: _("WEAPON_CLASS") }, { val: S_weapon, nm: _("S_weapon") }],
    [{ val: ARMOR_SYM, nm: _("ARMOR_SYM") }, { val: ARMOR_CLASS, nm: _("ARMOR_CLASS") }, { val: S_armor, nm: _("S_armor") }],
    [{ val: RING_SYM, nm: _("RING_SYM") }, { val: RING_CLASS, nm: _("RING_CLASS") }, { val: S_ring, nm: _("S_ring") }],
    [{ val: AMULET_SYM, nm: _("AMULET_SYM") }, { val: AMULET_CLASS, nm: _("AMULET_CLASS") }, { val: S_amulet, nm: _("S_amulet") }],
    [{ val: TOOL_SYM, nm: _("TOOL_SYM") }, { val: TOOL_CLASS, nm: _("TOOL_CLASS") }, { val: S_tool, nm: _("S_tool") }],
    [{ val: FOOD_SYM, nm: _("FOOD_SYM") }, { val: FOOD_CLASS, nm: _("FOOD_CLASS") }, { val: S_food, nm: _("S_food") }],
    [{ val: POTION_SYM, nm: _("POTION_SYM") }, { val: POTION_CLASS, nm: _("POTION_CLASS") }, { val: S_potion, nm: _("S_potion") }],
    [{ val: SCROLL_SYM, nm: _("SCROLL_SYM") }, { val: SCROLL_CLASS, nm: _("SCROLL_CLASS") }, { val: S_scroll, nm: _("S_scroll") }],
    [{ val: SPBOOK_SYM, nm: _("SPBOOK_SYM") }, { val: SPBOOK_CLASS, nm: _("SPBOOK_CLASS") }, { val: S_book, nm: _("S_book") }],
    [{ val: WAND_SYM, nm: _("WAND_SYM") }, { val: WAND_CLASS, nm: _("WAND_CLASS") }, { val: S_wand, nm: _("S_wand") }],
    [{ val: GOLD_SYM, nm: _("GOLD_SYM") }, { val: COIN_CLASS, nm: _("COIN_CLASS") }, { val: S_coin, nm: _("S_coin") }],
    [{ val: GEM_SYM, nm: _("GEM_SYM") }, { val: GEM_CLASS, nm: _("GEM_CLASS") }, { val: S_gem, nm: _("S_gem") }],
    [{ val: ROCK_SYM, nm: _("ROCK_SYM") }, { val: ROCK_CLASS, nm: _("ROCK_CLASS") }, { val: S_rock, nm: _("S_rock") }],
    [{ val: BALL_SYM, nm: _("BALL_SYM") }, { val: BALL_CLASS, nm: _("BALL_CLASS") }, { val: S_ball, nm: _("S_ball") }],
    [{ val: CHAIN_SYM, nm: _("CHAIN_SYM") }, { val: CHAIN_CLASS, nm: _("CHAIN_CLASS") }, { val: S_chain, nm: _("S_chain") }],
    [{ val: VENOM_SYM, nm: _("VENOM_SYM") }, { val: VENOM_CLASS, nm: _("VENOM_CLASS") }, { val: S_venom, nm: _("S_venom") }],
    ];
}

// the records of arti_enum_dump[] from artilist.h, laid out like it
function arti_enum_dump_records() {
    return [
    { val: ART_NONARTIFACT, nm: _("ART_NONARTIFACT") },

    { val: ART_EXCALIBUR, nm: _("ART_EXCALIBUR") },
    /*
     *      Stormbringer only has a 2 because it can drain a level
     *      providing 8 more.
     */
    { val: ART_STORMBRINGER, nm: _("ART_STORMBRINGER") },
    /*
     *      Mjollnir can be thrown when wielded if hero has 25 Strength
     *      (usually via gauntlets of power but possible with rings of
     *      gain strength).  If the thrower is a Valkyrie Mjollnir will
     *      usually (99%) return and then usually (separate 99%) be caught
     *      and automatically be re-wielded.  When returning Mjollnir is
     *      not caught there is a 50:50 chance of hitting hero for damage
     *      and its lightning shock might destroy some wands and/or rings.
     *
     *      Monsters don't throw Mjollnir regardless of strength (not even
     *      fake-player valkyries).
     */
    { val: ART_MJOLLNIR, nm: _("ART_MJOLLNIR") },

    { val: ART_CLEAVER, nm: _("ART_CLEAVER") },

    /*
     *      Grimtooth glows in warning when elves are present but its
     *      damage bonus applies to all targets rather than just elves
     *      (handled as special case in spec_dbon()).
     */
    { val: ART_GRIMTOOTH, nm: _("ART_GRIMTOOTH") },
    /*
     *      Orcrist and Sting have same alignment as elves.
     *
     *      The combination of SPFX_WARN+SPFX_DFLAG2+M2_value will trigger
     *      EWarn_of_mon for all monsters that have the M2_value flag.
     *      Sting and Orcrist will warn of M2_ORC monsters.
     */
    { val: ART_ORCRIST, nm: _("ART_ORCRIST") }, /* actually light blue */

    { val: ART_STING, nm: _("ART_STING") },
    /*
     *      Magicbane is a bit different!  Its magic fanfare
     *      unbalances victims in addition to doing some damage.
     */
    { val: ART_MAGICBANE, nm: _("ART_MAGICBANE") },

    { val: ART_FROST_BRAND, nm: _("ART_FROST_BRAND") },

    { val: ART_FIRE_BRAND, nm: _("ART_FIRE_BRAND") },

    { val: ART_DRAGONBANE, nm: _("ART_DRAGONBANE") },

    { val: ART_DEMONBANE, nm: _("ART_DEMONBANE") },

    { val: ART_WEREBANE, nm: _("ART_WEREBANE") },

    { val: ART_GRAYSWANDIR, nm: _("ART_GRAYSWANDIR") },

    { val: ART_GIANTSLAYER, nm: _("ART_GIANTSLAYER") },

    { val: ART_OGRESMASHER, nm: _("ART_OGRESMASHER") },

    { val: ART_TROLLSBANE, nm: _("ART_TROLLSBANE") },

    /*
     *      Two problems:  1) doesn't let trolls regenerate heads
     *      2) doesn't give unusual message for 2-headed monsters (but
     *      allowing those at all causes more problems than worth the effort).
     */
    { val: ART_VORPAL_BLADE, nm: _("ART_VORPAL_BLADE") },

    /*
     *      Ah never shall I forget the cry
     *              or the shriek that shrieked he
     *      As I gnashed my teeth and from my sheath
     *              I drew my Snickersnee!
     *                      --Ko-Ko Lord high executioner of Titipu
     *                        (From Sir W.S. Gilbert's "The Mikado")
     */
    { val: ART_SNICKERSNEE, nm: _("ART_SNICKERSNEE") },

    /* Sunsword emits light when wielded (handled in the core rather than
       via artifact fields) but that light has no particular color */
    { val: ART_SUNSWORD, nm: _("ART_SUNSWORD") },

    /*
     *      The artifacts for the quest dungeon all self-willed.
     *      gen_spe should be 0; gift_value irrelevant and set to 12.
     */

    { val: ART_ORB_OF_DETECTION, nm: _("ART_ORB_OF_DETECTION") },

    { val: ART_HEART_OF_AHRIMAN, nm: _("ART_HEART_OF_AHRIMAN") },

    { val: ART_SCEPTRE_OF_MIGHT, nm: _("ART_SCEPTRE_OF_MIGHT") },












    { val: ART_STAFF_OF_AESCULAPIUS, nm: _("ART_STAFF_OF_AESCULAPIUS") },

    { val: ART_MAGIC_MIRROR_OF_MERLIN, nm: _("ART_MAGIC_MIRROR_OF_MERLIN") },

    { val: ART_EYES_OF_THE_OVERWORLD, nm: _("ART_EYES_OF_THE_OVERWORLD") },

    { val: ART_MITRE_OF_HOLINESS, nm: _("ART_MITRE_OF_HOLINESS") },

    { val: ART_LONGBOW_OF_DIANA, nm: _("ART_LONGBOW_OF_DIANA") },

    /* MKoT has an additional carry property if the Key is not cursed (for
       rogues) or blessed (for non-rogues):  #untrap of doors and chests
       will always find any traps and disarming those will always succeed */
    { val: ART_MASTER_KEY_OF_THIEVERY, nm: _("ART_MASTER_KEY_OF_THIEVERY") },

    { val: ART_TSURUGI_OF_MURAMASA, nm: _("ART_TSURUGI_OF_MURAMASA") },

    { val: ART_YENDORIAN_EXPRESS_CARD, nm: _("ART_YENDORIAN_EXPRESS_CARD") },

    { val: ART_ORB_OF_FATE, nm: _("ART_ORB_OF_FATE") },

    { val: ART_EYE_OF_THE_AETHIOPICA, nm: _("ART_EYE_OF_THE_AETHIOPICA") },
    ];
}

// the records of mcastu_enum_dump[] from mcastu.h, laid out like it
function mcastu_enum_dump_records() {
    return [
{ val: MCAST_DUMPENUM_PSI_BOLT, nm: _("PSI_BOLT") },
{ val: MCAST_DUMPENUM_OPEN_WOUNDS, nm: _("OPEN_WOUNDS") },
{ val: MCAST_DUMPENUM_CURE_SELF, nm: _("CURE_SELF") },
{ val: MCAST_DUMPENUM_HASTE_SELF, nm: _("HASTE_SELF") },
{ val: MCAST_DUMPENUM_CONFUSE_YOU, nm: _("CONFUSE_YOU") },
{ val: MCAST_DUMPENUM_STUN_YOU, nm: _("STUN_YOU") },
{ val: MCAST_DUMPENUM_DISAPPEAR, nm: _("DISAPPEAR") },
{ val: MCAST_DUMPENUM_PARALYZE, nm: _("PARALYZE") },
{ val: MCAST_DUMPENUM_BLIND_YOU, nm: _("BLIND_YOU") },
{ val: MCAST_DUMPENUM_WEAKEN_YOU, nm: _("WEAKEN_YOU") },
{ val: MCAST_DUMPENUM_DESTRY_ARMR, nm: _("DESTRY_ARMR") },
{ val: MCAST_DUMPENUM_INSECTS, nm: _("INSECTS") },
{ val: MCAST_DUMPENUM_CURSE_ITEMS, nm: _("CURSE_ITEMS") },
{ val: MCAST_DUMPENUM_LIGHTNING, nm: _("LIGHTNING") },
{ val: MCAST_DUMPENUM_FIRE_PILLAR, nm: _("FIRE_PILLAR") },
{ val: MCAST_DUMPENUM_GEYSER, nm: _("GEYSER") },
{ val: MCAST_DUMPENUM_AGGRAVATION, nm: _("AGGRAVATION") },
{ val: MCAST_DUMPENUM_SUMMON_MONS, nm: _("SUMMON_MONS") },
{ val: MCAST_DUMPENUM_CLONE_WIZ, nm: _("CLONE_WIZ") },
{ val: MCAST_DUMPENUM_DEATH_TOUCH, nm: _("DEATH_TOUCH") },
    ];
}
