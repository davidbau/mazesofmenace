import { C } from '../c-runtime/context.js';
/* NetHack 5.0	options.c	$NHDT-Date: 1737556914 2025/01/22 06:41:54 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.753 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Michael Allison, 2008. */
/* NetHack may be freely redistributed.  See license for details. */
/* OPTION_LISTS_ONLY: (AMIGA) external program for opt lists */
/* provide linkage */
/* provide linkage */
/* whether the 'msg_window' option is used to control ^P behavior */
/*
 *  NOTE:  If you add (or delete) an option, please review the following:
 *             doc/options.txt
 *
 *         It contains how-to info and outlines some required/suggested
 *         updates that should accompany your change.
 */
/*
 * include/optlist.h is utilized 3 successive times, for 3 different
 * objectives.
 *
 * The first time is with NHOPT_PROTO defined, to produce and include
 * the prototypes for the individual option processing functions.
 *
 * The second time is with NHOPT_ENUM defined, to produce the enum values
 * for the individual options that are used throughout options processing.
 * They are generally opt_optname, where optname is the name of the option.
 *
 * The third time is with NHOPT_PARSE defined, to produce the initializers
 * to fill out the allopt[] array of options (both boolean and compound).
 *
 */
/* use rest of file */
/* extern char configfile[]; */
/* for messages; files.c */
/* in tos.c */
/* in sys/msdos/video.c */
/* in sys/msdos/video.c */
/* 4: role,race,gend,algn */
/* paranoia[] - used by parseoptions() and handler_paranoid_confirmation() */
/* which paranoid option */
/* primary name */
/* minimum number of letters to match */
/* alternate name (optional) */
/* for interactive menu */
/* there are some initial-letter conflicts: "a"ttack vs "A"utoall vs
       "a"ll, "attack" takes precedence and "all" isn't present in the
       interactive menu with "Autoall" capitalized there,
       and "d"ie vs "d"eath, synonyms for each other so doesn't matter;
       (also "p"ray vs "P"aranoia, "pray" takes precedence since "Paranoia"
       is just a synonym for "Confirm"); "b"ones vs "br"eak-wand, the
       latter requires at least two letters; "e"at vs "ex"plore,
       "cont"inue eating vs "C"onfirm; "wand"-break vs "Were"-change,
       both require at least two letters during config processing but use
       one letter with case-sensitivity for 'm O's interactive menu;
       if any entry or alias beginning with 'n' gets added, aside from "none",
       the parsing to accept "nofoo" to mean "!foo" will need fixing */
/* extra y/n questions rather than changing y/n to yes/n[o];
       they switch to yes/no if paranoid:confirm is also set */
/* not a yes/n[o] vs y/n change nor a y/n addition */
/* normally when there is only 1 candidate it's chosen automatically */
/* for config file parsing; interactive menu skips these */
/* require full word match */
/* ditto */
/* 'menustyle' settings */
/* tty supports all four settings, curses just final two */
/* 'msg_window' settings */
/* autounlock settings */
/* second column is an alias for the first; third is brief explanation;
   entries 5 and 6 are 1|4 and 2|4 (tty only) */
/*0*/
/*1*/
/*2*/
/*3*/
/*4*/
/*5*/
/*6*/
/*5*/
/*6*/
/*7*/
/*8*/
/*
 * menuobjsyms:
 *   Inventory display for the various values of menuobjsyms.
 *   4' and 5' represent !sortpack which lacks headers; they
 *   produce the same result.
 *
 *   0:                         1:
 *        Weapons                    Weapons  (')')
 *        a - 15 darts               a - 15 darts
 *        Armor                      Armor    ('[')
 *        b - Hawaiian shirt         b - Hawaiian shirt
 *   2:                         3:
 *        Weapons                    Weapons  (')')
 *        a ) 15 darts               a ) 15 darts
 *        Armor                      Armor    ('[')
 *        b [ Hawaiian shirt         b [ Hawaiian shirt
 *   4:                         5:
 *        Weapons                    Weapons  (')')
 *        a - 15 darts               a - 15 darts
 *        Armor                      Armor    ('[')
 *        b - Hawaiian shirt         b - Hawaiian shirt
 *   4':                        5':
 *        a ) 15 darts               a ) 15 darts
 *        b [ Hawaiian shirt         b [ Hawaiian shirt
 */
/*
 * Default menu manipulation command accelerators.  These may _not_ be:
 *
 *      + a number or '#' - reserved for counts
 *      + an upper or lower case US ASCII letter - used for accelerators
 *      + ESC - reserved for escaping the menu
 *      + NULL, CR or LF - reserved for committing the selection(s).  NULL
 *        is kind of odd, but the tty's xwaitforspace() will return it if
 *        someone hits a <ret>.
 *      + a default object class symbol - used for object class accelerators
 *
 * Standard letters (for now) are:
 *
 *              <  back 1 page
 *              >  forward 1 page
 *              ^  first page
 *              |  last page
 *              :  search
 *
 *              page            all
 *               ,    select     .
 *               \    deselect   -
 *               ~    invert     @
 *
 * The command name list is duplicated in the compopt array.
 */
/* next few are not allopt[] entries, so will only be called
   directly from doset, not from individual optfn's */
/* ask user if they want a tutorial, except if tutorial boolean option has
   been set in config - either on or off - in which case just obey that
   setting without asking */
export function ask_do_tutorial()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["ask_do_tutorial.sel",8],["ask_do_tutorial.any",C.sizes["union any"]],["ask_do_tutorial.buf",(1*256)]]);
    try {
    let dotut=C.field(C.flags,"flag","tutorial").value;
    if(Number(!(C.cell((C.staticAddress("opt_set_in_config")+Number(C.opt_tutorial)*1),"signed char").value))) {
        let win;
        let sel=C.local("ask_do_tutorial.sel","struct mi *");
        let any=C.automatic("ask_do_tutorial.any",C.sizes["union any"]);
        let buf=C.automatic("ask_do_tutorial.buf",(1*256));
        let rc;
        let norc;
        let n; let pass=0;
        (rc=C.nh_basename(C.get_configfile(),(C.i8(1))));
        (norc=C.i8(Number(!(C.strcmp(C.get_configfile(),C.literal("/dev/null"))))));
        C.variadic(0,(C.literal("ask_do_tutorial")),447,buf,BigInt((1*256)),C.literal("Put \"OPTIONS=!tutorial\" in %s to skip this query."),((Number(!!(Number(!!(rc&&C.i32(C.cell(rc,"char").value)))&&Number(!(norc)))))?rc:C.literal("your configuration file")));
        do {
            (win=C.callback(0,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
            C.callback(1,(C.field(C.windowprocs,"window_procs","win_start_menu").value),win,C.u64(0));
            C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
            (C.field(any,"any","a_char").value=C.i8(121));
            C.add_menu(win,C.nul_glyphinfo,any,C.field(any,"any","a_char").value,C.i8(0),0,8,C.literal("Yes, do a tutorial"),0);
            (C.field(any,"any","a_char").value=C.i8(110));
            C.add_menu(win,C.nul_glyphinfo,any,C.field(any,"any","a_char").value,C.i8(0),0,8,C.literal("No, just start play"),0);
            C.add_menu_str(win,C.literal(""));
            C.add_menu_str(win,buf);
            if((()=>{const old=pass;pass=C.i32((old+1));return old;})()) C.add_menu_str(win,C.literal("(Please choose 'y' or 'n'.)"));
            /* we'll get here after <space> or <return> */
            C.callback(2,(C.field(C.windowprocs,"window_procs","win_end_menu").value),win,C.literal("Do you want a tutorial?"));
            (n=C.select_menu(win,1,sel.address));
            C.callback(3,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),win);
        } while(Number(!(n)));
        if(Number(n>0)) {
            (dotut=C.i8((Number(C.i32(C.field(C.field((sel.value+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_char").value)==121))));
            C.free(sel.value);
        } else {
            /* ESC */
            (dotut=(C.i8(0)));
        }
    }
    return dotut;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/*
 **********************************
 *
 *   parseoptions
 *
 **********************************
 */
export function parseoptions(opts,tinitial,tfrom_file)
{
    opts=C.ptr(opts);
    tinitial=C.i8(tinitial);
    tfrom_file=C.i8(tfrom_file);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["parseoptions.pfxbuf",(1*256)]]);
    try {
    let op;
    let negated; let got_match=(C.i8(0)); let pfx_match=(C.i8(0));
    let i; let matchidx=C.i32((-1)); let optresult=C.optn_err; let optlen; let optlen_wo_val;
    let retval=(C.i8(1));
    (C.cell(C.staticAddress("duplicate"),"signed char").value=(C.i8(0)));
    (C.cell(C.staticAddress("using_alias"),"signed char").value=(C.i8(0)));
    (C.field(C.go,"instance_globals_o","opt_initial").value=tinitial);
    (C.field(C.go,"instance_globals_o","opt_from_file").value=tfrom_file);
    /*
     * Process elements of comma-separated list in right to left order.
     * When some options are set interactively--notably various compound
     * options that issue a prompt for a value--they use parseoptions()
     * to handle setting the new value.  For those, 'tinitial' is False
     * and if user tries to supply a comma-separated list, it will be
     * treated as part of the current option, probably failing to parse.
     */
    if(Number(!!(C.i32(tinitial)&&Number(((op=C.strchr(opts,44)))!=0)))) {
        (C.cell((()=>{const old=op;op=C.ptr((old+Number(1)));return old;})(),"char").value=C.i8(0));
        /* current element remains pending while the rest of the line gets
           handled recursively; if the rest of line contains any commas,
           then the process will recurse deeper as it is processed */
        if(Number(!(parseoptions(op,C.field(C.go,"instance_globals_o","opt_initial").value,C.field(C.go,"instance_globals_o","opt_from_file").value)))) (retval=(C.i8(0)));
    }
    if(Number(C.strlen(opts)>C.u64(C.i32(Math.trunc((256/2)))))) {
        C.variadic(1,C.literal("Option too long, max length is %i characters"),(C.i32(Math.trunc((256/2)))));
        return (C.i8(0));
    }
    /* strip leading and trailing white space */
    while(C.__isspace(C.i32(C.u8(C.cell(opts,"char").value)))) (()=>{const old=opts;opts=C.ptr((old+Number(1)));return old;})();

    (op=C.eos(opts));
    while(Number(!!(Number((()=>{const old=op;op=C.ptr((old-Number(1)));return op;})()>=opts)&&C.__isspace(C.i32(C.u8(C.cell(op,"char").value)))))) (C.cell(op,"char").value=C.i8(0));

    if(Number(!(C.cell(opts,"char").value))) {
        C.variadic(2,C.literal("Empty statement"));
        return (C.i8(0));
    }
    (negated=(C.i8(0)));
    while(Number(!!((Number(C.i32(C.cell(opts,"char").value)==33))||Number(!(C.strncmpi(opts,C.literal("no"),2)))))) {
        (opts=C.ptr(opts+Number(((Number(C.i32(C.cell(opts,"char").value)==33))?1:((Number(C.i32(C.cell((opts+Number(2)*1),"char").value)!=45))?2:3)))*1));
        (negated=C.i8(Number(!(negated))));
    }
    (optlen=C.i32(C.strlen(opts)));
    (optlen_wo_val=length_without_val(opts,optlen));
    if(Number(optlen_wo_val<optlen)) {
        (optlen=optlen_wo_val);
    }
    for((i=0);Number(i<C.OPTCOUNT);(()=>{const old=i;i=C.i32((old+1));return i;})()) {
        (got_match=(C.i8(0)));
        if(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","pfx").value) {
            if(C.str_start_is(opts,C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","name").value,(C.i8(1)))) {
                (matchidx=i);
                (got_match=(pfx_match=(C.i8(1))));
            }
        }
        /* this prevents "boolopt:True" &c */
        /*
         * During option initialization, the function
         *     determine_ambiguities()
         * figured out exactly how many characters are required to
         * unambiguously differentiate one option from all others, and it
         * placed that number into each option's allopt[n].minmatch.
         *
         */
        if(Number(!!(Number(!(got_match))&&C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","name").value))) (got_match=match_optname(opts,C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","name").value,C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","minmatch").value,(C.i8(1))));
        if(got_match) {
            if(Number(!!(Number(!(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","pfx").value))&&Number(optlen<C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","minmatch").value)))) {
                C.variadic(3,C.literal("Ambiguous option %s, %d characters are needed to differentiate"),opts,C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","minmatch").value);
                break;
            }
            (matchidx=i);
            break;
        }
    }
    if(Number(!(got_match))) {
        /* spin through the aliases to see if there's a match in those.
           Note that if multiple delimited aliases for the same option
           becomes desirable in the future, this is where you'll need
           to split a delimited allopt[i].alias field into each
           individual alias */
        for((i=0);Number(i<C.OPTCOUNT);(()=>{const old=i;i=C.i32((old+1));return i;})()) {
            if(Number(!(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","alias").value))) continue;
            (got_match=match_optname(opts,C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","alias").value,C.i32(C.strlen(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","alias").value)),(C.i8(1))));
            if(got_match) {
                (matchidx=i);
                (C.cell(C.staticAddress("using_alias"),"signed char").value=(C.i8(1)));
                break;
            }
        }
    }
    /* allow optfn's to test whether they were called from parseoptions() */
    (()=>{const ref=C.field(C.program_state,"sinfo","in_parseoptions");const old=ref.value;ref.value=C.i32((old+1));return old;})();
    if(Number(!!(Number(!!(C.i32(got_match)&&(Number(!!(Number(matchidx>=0)&&Number(matchidx<C.OPTCOUNT))))))&&Number(!(C.field((C.staticAddress("allopt")+Number(matchidx)*C.sizes["struct allopt_t"]),"allopt_t","disregarded").value))))) {
        (C.cell(C.staticAddress("duplicate"),"signed char").value=duplicate_opt_detection(matchidx));
        if(Number(!!(C.i32(C.cell(C.staticAddress("duplicate"),"signed char").value)&&Number(!(C.field((C.staticAddress("allopt")+Number(matchidx)*C.sizes["struct allopt_t"]),"allopt_t","dupeok").value))))) complain_about_duplicate(matchidx);
        /* check for bad negation, so option functions don't have to */
        if(Number(!!(C.i32(negated)&&Number(!(C.field((C.staticAddress("allopt")+Number(matchidx)*C.sizes["struct allopt_t"]),"allopt_t","negateok").value))))) {
            bad_negation(C.field((C.staticAddress("allopt")+Number(matchidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,(C.i8(1)));
            return C.i8(C.optn_err);
        }
        /*
         * Now call the option's associated function via the function
         * pointer for it in the allopt[] array, specifying a 'do_set' req.
         */
        if(C.field((C.staticAddress("allopt")+Number(matchidx)*C.sizes["struct allopt_t"]),"allopt_t","optfn").value) {
            (op=string_for_opt(opts,(C.i8(1))));
            (optresult=C.callback(4,(C.field((C.staticAddress("allopt")+Number(matchidx)*C.sizes["struct allopt_t"]),"allopt_t","optfn").value),C.field((C.staticAddress("allopt")+Number(matchidx)*C.sizes["struct allopt_t"]),"allopt_t","idx").value,C.do_set,negated,opts,op));
            if(Number(optresult==C.optn_ok)) (C.cell((C.staticAddress("opt_set_in_config")+Number(matchidx)*1),"signed char").value=(C.i8(1)));
        }
    }
    if(Number(C.field(C.program_state,"sinfo","in_parseoptions").value>0)) (()=>{const ref=C.field(C.program_state,"sinfo","in_parseoptions");const old=ref.value;ref.value=C.i32((old-1));return old;})();
    /* This specialization shouldn't be needed any longer because each of
       the individual options is part of the allopts[] list, thus already
       taken care of in the for-loop above */
    if(Number(!(got_match))) {
        /* Is it a symbol? */
        if(Number(!!(Number(C.strstr(opts,C.literal("S_"))==opts)&&C.i32(C.parsesymbols(opts,C.PRIMARYSET))))) {
            C.switch_symbols(C.i32((C.i8(1))));
            C.check_gold_symbol();
            (optresult=C.optn_ok);
        }
    }
    if(Number(!!(Number(!!(Number(optresult==C.optn_silenterr)||(Number(!!(C.i32(got_match)&&C.i32(C.field((C.staticAddress("allopt")+Number(matchidx)*C.sizes["struct allopt_t"]),"allopt_t","disregarded").value))))))||(Number(!!(Number(!(got_match))&&C.i32(C.config_unmatched_ignored()))))))) return (C.i8(0));
    if(Number(!!(C.i32(pfx_match)&&Number(optresult==C.optn_err)))) {
        let pfxbuf=C.automatic("parseoptions.pfxbuf",(1*256)); let pfxp;
        C.variadic(4,(C.literal("parseoptions")),677,pfxbuf,BigInt((1*256)),C.literal("%s"),opts);
        if(Number(((pfxp=C.strchr(pfxbuf,58)))!=0)) (C.cell(pfxp,"char").value=C.i8(0));
        C.variadic(5,C.literal("bad option suffix variation '%s'"),pfxbuf);
        return (C.i8(0));
    }
    if(Number(!!(C.i32(got_match)&&Number(optresult==C.optn_err)))) return (C.i8(0));
    if(Number(optresult==C.optn_ok)) return retval;
    /* out of valid options */
    C.variadic(6,C.literal("Unknown option '%s'"),opts);
    return (C.i8(0));
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function check_misc_menu_command(opts,op)
{
    opts=C.ptr(opts);
    op=C.ptr(op);
    let i;
    let name_to_check;
    /* check for menu command mapping */
    for((i=0);C.field((C.staticAddress("default_menu_cmd_info")+Number(i)*C.sizes["menu_cmd_t"]),"menu_cmd_t","name").value;(()=>{const old=i;i=C.i32((old+1));return old;})()) {
        (name_to_check=C.field((C.staticAddress("default_menu_cmd_info")+Number(i)*C.sizes["menu_cmd_t"]),"menu_cmd_t","name").value);
        if(match_optname(opts,name_to_check,C.i32(C.strlen(name_to_check)),(C.i8(1)))) return i;
    }
    return C.i32((-1));
}

/* role => 0, race => 1, gender => 2, alignment =>3 */
export function opt2roleopt(roleopt)
{
    roleopt=C.i32(roleopt);
    switch(roleopt) {
        case (C.opt_role):
            return 0;
        case (C.opt_race):
            return 1;
        case (C.opt_gender):
            return 2;
        case (C.opt_alignment):
            return 3;
        default:
            break;
    }
    return 0;
}

/* fetch saved option string for a particular option phase */
export function getoptstr(optidx,ophase)
{
    optidx=C.i32(optidx);
    ophase=C.i32(ophase);
    let roleoptindx=opt2roleopt(optidx);
    if(Number(ophase==C.num_opt_phases)) {
        /* any source */
        let phase;
        /* find non-Null, in order optvals[][play_opt], [cmdline_opt],
           [environ_opt], [rc_file_opt], [syscf_opt], [builtin_opt] */
        for((phase=C.i32((C.num_opt_phases-1)));Number(phase>=0);(()=>{const old=phase;phase=C.i32((old-1));return phase;})()) if(C.cell(((C.staticAddress("roleoptvals")+Number(roleoptindx)*(8*7))+Number(phase)*8),"char *").value) {
            (ophase=phase);
            break;
        }

    }
    if((Number(!!(Number(!!(Number(!!(Number(roleoptindx>=0)&&Number(roleoptindx<C.MAX_ROLEOPT)))&&Number(ophase>=0)))&&Number(ophase<C.num_opt_phases))))) return C.cell(((C.staticAddress("roleoptvals")+Number(roleoptindx)*(8*7))+Number(ophase)*8),"char *").value;
    C.variadic(7,C.literal("bad index roleoptvals[%d][%d]"),roleoptindx,ophase);
    /*NOTREACHED*/
}

/* to track some unparsed option settings in case #saveoptions needs them */
export function saveoptstr(optidx,optstr)
{
    optidx=C.i32(optidx);
    optstr=C.ptr(optstr);
    let phase=C.i32(C.field(C.go,"instance_globals_o","opt_phase").value); let roleoptindx=opt2roleopt(optidx);
    let p=C.strchr(optstr,58); let q=C.strchr(optstr,61);
    /* strip away "optname:" from optname:optstr */
    if(Number(!!(Number(!(p))||(Number(!!(q&&Number(q<p))))))) (p=q);
    if(p) (optstr=(p+Number(1)*1));
    if(C.cell(((C.staticAddress("roleoptvals")+Number(roleoptindx)*(8*7))+Number(phase)*8),"char *").value) C.free(C.cell(((C.staticAddress("roleoptvals")+Number(roleoptindx)*(8*7))+Number(phase)*8),"char *").value);
    (C.cell(((C.staticAddress("roleoptvals")+Number(roleoptindx)*(8*7))+Number(phase)*8),"char *").value=C.dupstr(optstr));
}

/* discard specific saved option string */
export function unsaveoptstr(optidx,ophase)
{
    optidx=C.i32(optidx);
    ophase=C.i32(ophase);
    let roleoptindx=opt2roleopt(optidx);
    if(C.cell(((C.staticAddress("roleoptvals")+Number(roleoptindx)*(8*7))+Number(ophase)*8),"char *").value) (C.free(C.cell(((C.staticAddress("roleoptvals")+Number(roleoptindx)*(8*7))+Number(ophase)*8),"char *").value),(C.cell(((C.staticAddress("roleoptvals")+Number(roleoptindx)*(8*7))+Number(ophase)*8),"char *").value=0));
}

/* discard all saved option strings */
export function freeroleoptvals()
{
    let i; let j;
    for((i=0);Number(i<4);(()=>{const old=i;i=C.i32((old+1));return i;})()) for((j=0);Number(j<C.num_opt_phases);(()=>{const old=j;j=C.i32((old+1));return j;})()) unsaveoptstr(C.cell((C.staticAddress("roleopt2opt")+Number(i)*4),"int").value,j);


}

/* not needed */
/* put roleoptvals[][] into save file; will be needed if #saveoptions
   takes place after restore */
/* get roleoptvals[][] from save file */
/* len includes terminating '\0' for non-Null values */
/* 0 */
/* common to optfn_catname(), optfn_dogname(), optfn_horsename() */
export function petname_optfn(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["petname_optfn.failsafe",(1*64)]]);
    try {
    let failsafe=C.automatic("petname_optfn.failsafe",(1*64));
    let petname=((Number(optidx==C.opt_catname))?C.field(C.gc,"instance_globals_c","catname").address:((Number(optidx==C.opt_dogname))?C.field(C.gd,"instance_globals_d","dogname").address:((Number(optidx==C.opt_horsename))?C.field(C.gh,"instance_globals_h","horsename").address:failsafe)));
    if(Number(req==C.do_init)) {
        ;
    } else if(Number(req==C.do_set)) {
        if(Number(!!(Number(op==C.staticAddress("empty_optstr"))&&Number(!(negated))))) return C.optn_err;
        if(Number(!!(Number(!!(C.i32(negated)||Number(!(C.strcmp(op,C.literal("none"))))))||Number(!(C.strcmp(op,C.staticAddress("none"))))))) (op=C.staticAddress("empty_optstr"));
        nmcpy(petname,op,63);
        C.sanitize_name(petname);
    } else if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        (C.cell((failsafe+Number(0)*1),"char").value=C.i8(0));
        C.variadic(8,opts,C.literal("%s"),(C.i32(C.cell(petname,"char").value)?petname:((Number(req==C.get_cnf_val))?C.literal("none"):C.staticAddress("none"))));
    }
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/*
 **********************************
 *
 *   Per-option Functions
 *
 **********************************
 */
export function optfn_alignment(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["optfn_alignment.op",8]]);
    try {
    op=C.local("optfn_alignment.op","char *",op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* alignment:string */
        if(Number(!(parse_role_opt(optidx,negated,C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,opts,op.address)))) return C.optn_silenterr;
        if(Number(C.i32(C.cell(op.value,"char").value)!=33)) {
            if(Number(((C.field(C.flags,"flag","initalign").value=C.str2align(op.value)))==(C.i32((-1))))) {
                C.variadic(9,C.literal("Unknown %s '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op.value);
                return C.optn_err;
            }
            saveoptstr(optidx,(((Number(C.field(C.flags,"flag","initalign").value>=0))?C.field((C.aligns+Number(C.field(C.flags,"flag","initalign").value)*C.sizes["struct Align"]),"Align","adj").value:((Number(C.field(C.flags,"flag","initalign").value==(C.i32((-2)))))?C.staticAddress("randomrole"):C.staticAddress("none")))));
        }
        return C.optn_ok;
    }
    if(Number(req==C.get_val)) {
        C.variadic(10,opts,C.literal("%s"),(((Number(C.field(C.flags,"flag","initalign").value>=0))?C.field((C.aligns+Number(C.field(C.flags,"flag","initalign").value)*C.sizes["struct Align"]),"Align","adj").value:((Number(C.field(C.flags,"flag","initalign").value==(C.i32((-2)))))?C.staticAddress("randomrole"):C.staticAddress("none")))));
        return C.optn_ok;
    }
    if(Number(req==C.get_cnf_val)) {
        (op.value=get_cnf_role_opt(optidx));
        C.strcpy(opts,(op.value?op.value:C.literal("none")));
        return C.optn_ok;
    }
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function optfn_align_message(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* WINCAP align_message:[left|top|right|bottom] */
        (op=string_for_opt(opts,negated));
        if(Number(!!((Number(op!=C.staticAddress("empty_optstr")))&&Number(!(negated))))) {
            if(Number(!(C.strncmpi(op,C.literal("left"),C.i32(C.u64((BigInt((1*5))-C.u64(1)))))))) (C.field(C.iflags,"instance_flags","wc_align_message").value=1);
 else if(Number(!(C.strncmpi(op,C.literal("top"),C.i32(C.u64((BigInt((1*4))-C.u64(1)))))))) (C.field(C.iflags,"instance_flags","wc_align_message").value=3);
 else if(Number(!(C.strncmpi(op,C.literal("right"),C.i32(C.u64((BigInt((1*6))-C.u64(1)))))))) (C.field(C.iflags,"instance_flags","wc_align_message").value=2);
 else if(Number(!(C.strncmpi(op,C.literal("bottom"),C.i32(C.u64((BigInt((1*7))-C.u64(1)))))))) (C.field(C.iflags,"instance_flags","wc_align_message").value=4);
 else {
                C.variadic(11,C.literal("Unknown %s parameter '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op);
                return C.optn_err;
            }
        } else if(negated) {
            bad_negation(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,(C.i8(1)));
            return C.optn_err;
        }
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        let which;
        (which=C.field(C.iflags,"instance_flags","wc_align_message").value);
        C.variadic(12,opts,C.literal("%s"),((Number(which==3))?C.literal("top"):((Number(which==1))?C.literal("left"):((Number(which==4))?C.literal("bottom"):((Number(which==2))?C.literal("right"):C.staticAddress("defopt"))))));
        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        return handler_align_misc(optidx);
    }
    return C.optn_ok;
}

export function optfn_align_status(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* WINCAP align_status:[left|top|right|bottom] */
        (op=string_for_opt(opts,negated));
        if(Number(!!((Number(op!=C.staticAddress("empty_optstr")))&&Number(!(negated))))) {
            if(Number(!(C.strncmpi(op,C.literal("left"),C.i32(C.u64((BigInt((1*5))-C.u64(1)))))))) (C.field(C.iflags,"instance_flags","wc_align_status").value=1);
 else if(Number(!(C.strncmpi(op,C.literal("top"),C.i32(C.u64((BigInt((1*4))-C.u64(1)))))))) (C.field(C.iflags,"instance_flags","wc_align_status").value=3);
 else if(Number(!(C.strncmpi(op,C.literal("right"),C.i32(C.u64((BigInt((1*6))-C.u64(1)))))))) (C.field(C.iflags,"instance_flags","wc_align_status").value=2);
 else if(Number(!(C.strncmpi(op,C.literal("bottom"),C.i32(C.u64((BigInt((1*7))-C.u64(1)))))))) (C.field(C.iflags,"instance_flags","wc_align_status").value=4);
 else {
                C.variadic(13,C.literal("Unknown %s parameter '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op);
                return C.optn_err;
            }
        } else if(negated) {
            bad_negation(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,(C.i8(1)));
            return C.optn_err;
        }
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        let which;
        (which=C.field(C.iflags,"instance_flags","wc_align_status").value);
        C.variadic(14,opts,C.literal("%s"),((Number(which==3))?C.literal("top"):((Number(which==1))?C.literal("left"):((Number(which==4))?C.literal("bottom"):((Number(which==2))?C.literal("right"):C.staticAddress("defopt"))))));
        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        return handler_align_misc(optidx);
    }
    return C.optn_ok;
}

export function optfn_altkeyhandling(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* altkeyhandling:string */
        ((negated));
        ((op));
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_autounlock(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        (C.field(C.flags,"flag","autounlock").value=C.u32(2));
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* autounlock:none or autounlock:untrap+apply-key+kick+force;
           autounlock without a value is same as autounlock:apply-key and
           !autounlock is same as autounlock:none; multiple values can be
           space separated or plus-sign separated but the same separation
           must be used for each element, not mix&match */
        let sep; let nxt;
        let newflags;
        let i;
        if(Number(((op=string_for_opt(opts,(C.i8(1)))))==C.staticAddress("empty_optstr"))) {
            (C.field(C.flags,"flag","autounlock").value=C.u32((C.i32(negated)?0:2)));
            return C.optn_ok;
        }
        (newflags=C.u32(0));
        (sep=C.i8((C.strchr(op,43)?43:32)));
        while(op) {
            let matched=(C.i8(0));
            (op=C.trimspaces(op));
            /* might have leading space */
            if(Number(((nxt=C.strchr(op,C.i32(sep))))!=0)) {
                (C.cell((()=>{const old=nxt;nxt=C.ptr((old+Number(1)));return old;})(),"char").value=C.i8(0));
                (op=C.trimspaces(op));
                /* might have trailing space after
                                      * plus sign removal */
            }
            if(C.str_start_is(C.literal("none"),op,(C.i8(1)))) ((negated=(C.i8(1))),(matched=(C.i8(1))));
            for((i=0);Number(!!(Number(i<C.i32((C.u64((BigInt(((8*4)*2))/BigInt((8*2)))))))&&Number(!(matched))));(()=>{const old=i;i=C.i32((old+1));return i;})()) {
                if(Number(!!(C.i32(C.str_start_is(C.cell(((C.staticAddress("unlocktypes")+Number(i)*(8*2))+Number(0)*8),"char *").value,op,(C.i8(1))))||C.i32(C.fuzzymatch(op,C.cell(((C.staticAddress("unlocktypes")+Number(i)*(8*2))+Number(0)*8),"char *").value,C.literal(" -_"),(C.i8(1))))))) {
                    /* fuzzymatch() doesn't match leading substrings but
                       this allows "apply_key" and "applykey" to match
                       "apply-key"; "apply key" too if part of foo+bar */
                    (matched=(C.i8(1)));
                    switch(C.i32(C.cell(op,"char").value)) {
                        case (117):
                            (newflags=C.u32(newflags|C.u32(1)));
                        break;
                        case (97):
                            (newflags=C.u32(newflags|C.u32(2)));
                        break;
                        case (107):
                            (newflags=C.u32(newflags|C.u32(4)));
                        break;
                        case (102):
                            (newflags=C.u32(newflags|C.u32(8)));
                        break;
                        default:
                            (matched=(C.i8(0)));
                        break;
                    }
                }
            }
            if(Number(!(matched))) {
                C.variadic(15,C.literal("Invalid value for \"%s\": \"%s\""),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op);
                return C.optn_silenterr;
            }
            (op=nxt);
        }
        if(Number(!!(C.i32(negated)&&Number(newflags!=C.u32(0))))) {
            C.variadic(16,C.literal("Invalid value combination for \"%s\": 'none' with some"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value);
            return C.optn_silenterr;
        }
        (C.field(C.flags,"flag","autounlock").value=newflags);
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        if(Number(!(C.field(C.flags,"flag","autounlock").value))) {
            C.strcpy(opts,C.literal("none"));
        } else {
            
            let p=C.literal("");
            (C.cell(opts,"char").value=C.i8(0));
            if(C.u32((C.field(C.flags,"flag","autounlock").value&C.u32(1)))) (C.variadic(17,C.eos(opts),C.literal("%s%s"),p,C.cell(((C.staticAddress("unlocktypes")+Number(0)*(8*2))+Number(0)*8),"char *").value),(p=C.staticAddress("optfn_autounlock.plus")));
            if(C.u32((C.field(C.flags,"flag","autounlock").value&C.u32(2)))) (C.variadic(18,C.eos(opts),C.literal("%s%s"),p,C.cell(((C.staticAddress("unlocktypes")+Number(1)*(8*2))+Number(0)*8),"char *").value),(p=C.staticAddress("optfn_autounlock.plus")));
            if(C.u32((C.field(C.flags,"flag","autounlock").value&C.u32(4)))) (C.variadic(19,C.eos(opts),C.literal("%s%s"),p,C.cell(((C.staticAddress("unlocktypes")+Number(2)*(8*2))+Number(0)*8),"char *").value),(p=C.staticAddress("optfn_autounlock.plus")));
            if(C.u32((C.field(C.flags,"flag","autounlock").value&C.u32(8)))) C.variadic(20,C.eos(opts),C.literal("%s%s"),p,C.cell(((C.staticAddress("unlocktypes")+Number(3)*(8*2))+Number(0)*8),"char *").value);
            /*no more p*/
        }
        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        return handler_autounlock(optidx);
    }
    return C.optn_ok;
}

export function optfn_boulder(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    let clash=0;
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* boulder:symbol */
        /* if ((opts = string_for_env_opt(allopt[optidx].name, opts, FALSE))
               == empty_optstr)
         */
        if(Number(((opts=string_for_opt(opts,(C.i8(0)))))==C.staticAddress("empty_optstr"))) return C.i32((C.i8(0)));
        escapes(opts,opts);
        /* note: dummy monclass #0 has symbol value '\0'; we allow that--
           attempting to set bouldersym to '^@'/'\0' will reset to default */
        if(Number(C.def_char_to_monclass(C.cell((opts+Number(0)*1),"char").value)!=C.MAXMCLASSES)) (clash=(C.i32(C.cell((opts+Number(0)*1),"char").value)?1:0));
 else if(Number(!!(Number(C.i32(C.cell((opts+Number(0)*1),"char").value)>=49)&&Number(C.i32(C.cell((opts+Number(0)*1),"char").value)<C.i32((6+48)))))) (clash=2);
        if(Number(C.i32(C.cell((opts+Number(0)*1),"char").value)<32)) {
            C.variadic(21,C.literal("boulder symbol cannot be a control character"));
            return C.optn_ok;
        } else if(clash) {
            /* symbol chosen matches a used monster or warning
               symbol which is not good - reject it */
            C.variadic(22,C.literal("Badoption - boulder symbol '%s' would conflict with a %s symbol"),C.visctrl(C.cell((opts+Number(0)*1),"char").value),((Number(clash==1))?C.literal("monster"):C.literal("warning")));
        } else {
            /*
             * Override the default boulder symbol.
             */
            (C.cell((C.field(C.go,"instance_globals_o","ov_primary_syms").address+Number(C.i32((C.SYM_BOULDER+(C.i32(((C.i32(((C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES)))+C.MAXMCLASSES)))+6))))))*1),"unsigned char").value=C.u8(C.cell((opts+Number(0)*1),"char").value));
            (C.cell((C.field(C.go,"instance_globals_o","ov_rogue_syms").address+Number(C.i32((C.SYM_BOULDER+(C.i32(((C.i32(((C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES)))+C.MAXMCLASSES)))+6))))))*1),"unsigned char").value=C.u8(C.cell((opts+Number(0)*1),"char").value));
            /* for 'initial', update of BOULDER symbol is done in
               initoptions_finish(), after all symset options
               have been processed */
            if(Number(!(C.field(C.go,"instance_globals_o","opt_initial").value))) {
                let sym=C.get_othersym(C.SYM_BOULDER,(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address))))))?C.ROGUESET:C.PRIMARYSET));
                if(sym) (C.cell((C.field(C.gs,"instance_globals_s","showsyms").address+Number(C.i32((C.SYM_BOULDER+(C.i32(((C.i32(((C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES)))+C.MAXMCLASSES)))+6))))))*1),"unsigned char").value=sym);
                (C.field(C.go,"instance_globals_o","opt_need_redraw").value=(C.i8(1)));
            }
        }
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
        C.variadic(23,opts,C.literal("%c"),(C.i32(C.cell((C.field(C.go,"instance_globals_o","ov_primary_syms").address+Number(C.i32((C.SYM_BOULDER+(C.i32(((C.i32(((C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES)))+C.MAXMCLASSES)))+6))))))*1),"unsigned char").value)?C.i32(C.cell((C.field(C.go,"instance_globals_o","ov_primary_syms").address+Number(C.i32((C.SYM_BOULDER+(C.i32(((C.i32(((C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES)))+C.MAXMCLASSES)))+6))))))*1),"unsigned char").value):C.i32(C.cell((C.field(C.gs,"instance_globals_s","showsyms").address+Number(C.i32((C.i32(C.field((C.objects+Number(C.BOULDER)*C.sizes["struct objclass"]),"objclass","oc_class").value)+(C.i32(((0)+C.MAXPCHARS))))))*1),"unsigned char").value)));
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_catname(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    return petname_optfn(optidx,req,negated,opts,op);
}

export function optfn_crash_email(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        if(Number(((op=string_for_opt(opts,(C.i8(0)))))==C.staticAddress("empty_optstr"))) return C.optn_err;
        if(C.field(C.gc,"instance_globals_c","crash_email").value) C.free(C.field(C.gc,"instance_globals_c","crash_email").value);
        (C.field(C.gc,"instance_globals_c","crash_email").value=C.dupstr(op));
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        if(Number(!(opts))) return C.optn_err;
        if(C.field(C.gc,"instance_globals_c","crash_email").value) C.variadic(24,opts,C.literal("%s"),C.field(C.gc,"instance_globals_c","crash_email").value);
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_crash_name(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        if(Number(((op=string_for_opt(opts,(C.i8(0)))))==C.staticAddress("empty_optstr"))) return C.optn_err;
        if(C.field(C.gc,"instance_globals_c","crash_name").value) C.free(C.field(C.gc,"instance_globals_c","crash_name").value);
        (C.field(C.gc,"instance_globals_c","crash_name").value=C.dupstr(op));
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        if(Number(!(opts))) return C.optn_err;
        if(C.field(C.gc,"instance_globals_c","crash_name").value) C.variadic(25,opts,C.literal("%s"),C.field(C.gc,"instance_globals_c","crash_name").value);
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_crash_urlmax(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        if(Number(((op=string_for_opt(opts,(C.i8(0)))))!=C.staticAddress("empty_optstr"))) {
            let temp=C.atoi(op);
            if(Number(temp<75)) {
                C.variadic(26,C.literal("Invalid value %d for crash_urlmax.  Minimum value is 75."),temp);
                return C.optn_err;
            }
            (C.field(C.gc,"instance_globals_c","crash_urlmax").value=temp);
        } else return C.optn_err;
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        if(Number(!(opts))) return C.optn_err;
        C.variadic(27,opts,C.literal("%d"),C.field(C.gc,"instance_globals_c","crash_urlmax").value);
        return C.optn_ok;
    }
    return C.optn_ok;
}

/* CRASHREPORT */
/* "cursesgraphics" */
/* There is no rogue level cursesgraphics-specific set */
export function optfn_DECgraphics(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    let badflag=(C.i8(0));
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* "DECgraphics" */
        if(Number(!(negated))) {
            /* There is no rogue level DECgraphics-specific set */
            if(C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(C.PRIMARYSET)*C.sizes["struct symsetentry"]),"symsetentry","name").value) {
                (badflag=(C.i8(1)));
            } else {
                (C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(C.PRIMARYSET)*C.sizes["struct symsetentry"]),"symsetentry","name").value=C.dupstr(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value));
                if(Number(!(C.read_sym_file(C.PRIMARYSET)))) {
                    (badflag=(C.i8(1)));
                    C.clear_symsetentry(C.PRIMARYSET,(C.i8(1)));
                } else C.switch_symbols(C.i32((C.i8(1))));
            }
            if(badflag) {
                C.variadic(28,C.literal("Failure to load symbol set %s."),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value);
                return C.optn_err;
            }
        }
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_disclose(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    let i; let idx; let prefix_val;
    let num;
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* things to disclose at end of game */
        /*
         * The order that the end_disclose options are stored:
         *      inventory, attribs, vanquished, genocided,
         *      conduct, overview.
         * There is an array in flags:
         *      end_disclose[NUM_DISCLOSURE_OPT];
         * with option settings for the each of the following:
         * iagvc [see disclosure_options in decl.c]:
         * Allowed setting values in that array are:
         *      DISCLOSE_PROMPT_DEFAULT_YES  ask with default answer yes
         *      DISCLOSE_PROMPT_DEFAULT_NO   ask with default answer no
         *      DISCLOSE_YES_WITHOUT_PROMPT  always disclose and don't ask
         *      DISCLOSE_NO_WITHOUT_PROMPT   never disclose and don't ask
         *      DISCLOSE_PROMPT_DEFAULT_SPECIAL  for 'vanq'/'genod' only...
         *      DISCLOSE_SPECIAL_WITHOUT_PROMPT  ...to set up sort order.
         *
         * Those setting values can be used in the option
         * string as a prefix to get the desired behavior.
         *
         * For backward compatibility, no prefix is required,
         * and the presence of a i,a,g,v, or c without a prefix
         * sets the corresponding value to DISCLOSE_YES_WITHOUT_PROMPT.
         */
        (op=string_for_opt(opts,(C.i8(1))));
        if(Number(!!(Number(op!=C.staticAddress("empty_optstr"))&&C.i32(negated)))) {
            bad_negation(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,(C.i8(1)));
            return C.optn_err;
        }
        /* "disclose" without a value means "all with prompting"
           and negated means "none without prompting" */
        if(Number(!!(Number(!!(Number(op==C.staticAddress("empty_optstr"))||Number(!(C.strncmpi((op),(C.literal("all")),C.i32((-1)))))))||Number(!(C.strncmpi((op),(C.literal("none")),C.i32((-1)))))))) {
            if(Number(!!(Number(op!=C.staticAddress("empty_optstr"))&&Number(!(C.strncmpi((op),(C.literal("none")),C.i32((-1)))))))) (negated=(C.i8(1)));
            for((num=C.u32(0));Number(num<C.u32(6));(()=>{const old=num;num=C.u32((old+1));return old;})()) (C.cell((C.field(C.flags,"flag","end_disclose").address+Number(num)*1),"char").value=C.i8((C.i32(negated)?45:121)));

            return C.optn_ok;
        }
        (num=C.u32(0));
        (prefix_val=C.i32((-1)));
        while(Number(!!(C.i32(C.cell(op,"char").value)&&Number(C.u64(num)<C.u64((BigInt((1*7))-C.u64(1))))))) {
            
            let c;
            let dop;
            (c=C.lowc(C.cell(op,"char").value));
            if(Number(C.i32(c)==107)) (c=C.i8(118));
            /* killed -> vanquished */
            if(Number(C.i32(c)==100)) (c=C.i8(111));
            /* dungeon -> overview */
            (dop=C.strchr(C.disclosure_options,C.i32(c)));
            if(dop) {
                (idx=C.i32((C.i64(((dop-C.disclosure_options)/1)))));
                if(Number(!!(Number(idx<0)||Number(idx>C.i32((6-1)))))) {
                    C.variadic(29,C.literal("bad disclosure index %d %c"),idx,C.i32(c));
                    continue;
                }
                if(Number(prefix_val!=C.i32((-1)))) {
                    if(Number(!!(Number(C.i32(C.cell(dop,"char").value)!=118)&&Number(C.i32(C.cell(dop,"char").value)!=103)))) {
                        if(Number(prefix_val==63)) (prefix_val=121);
                        if(Number(prefix_val==35)) (prefix_val=43);
                    }
                    (C.cell((C.field(C.flags,"flag","end_disclose").address+Number(idx)*1),"char").value=C.i8(prefix_val));
                    (prefix_val=C.i32((-1)));
                } else (C.cell((C.field(C.flags,"flag","end_disclose").address+Number(idx)*1),"char").value=C.i8(43));
            } else if(C.strchr(C.staticAddress("optfn_disclose.valid_settings"),C.i32(c))) {
                (prefix_val=C.i32(c));
            } else if(Number(C.i32(c)==32)) {
                ;
                /* do nothing */
            } else {
                C.variadic(30,C.literal("Unknown %s parameter '%c'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,C.i32(C.cell(op,"char").value));
                return C.optn_err;
            }
            (()=>{const old=op;op=C.ptr((old+Number(1)));return old;})();
        }
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
        for((i=0);Number(i<6);(()=>{const old=i;i=C.i32((old+1));return old;})()) {
            if(i) C.strkitten(opts,C.i8(32));
            C.strkitten(opts,C.cell((C.field(C.flags,"flag","end_disclose").address+Number(i)*1),"char").value);
            C.strkitten(opts,C.cell((C.disclosure_options+Number(i)*1),"char").value);
        }
        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        return handler_disclose();
    }
    return C.optn_ok;
}

export function optfn_dogname(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    return petname_optfn(optidx,req,negated,opts,op);
}

export function optfn_dungeon(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        return C.optn_ok;
    }
    if(Number(req==C.get_val)) {
        C.variadic(31,opts,C.literal("%s"),C.staticAddress("to_be_done"));
        return C.optn_ok;
    }
    if(Number(req==C.get_cnf_val)) {
        (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_effects(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        return C.optn_ok;
    }
    if(Number(req==C.get_val)) {
        C.variadic(32,opts,C.literal("%s"),C.staticAddress("to_be_done"));
        return C.optn_ok;
    }
    if(Number(req==C.get_cnf_val)) {
        (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_font_map(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    /* send them over to the prefix handling for font_ */
    return pfxfn_font(optidx,req,negated,opts,op);
}

export function optfn_font_menu(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    /* send them over to the prefix handling for font_ */
    return pfxfn_font(optidx,req,negated,opts,op);
}

export function optfn_font_message(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    /* send them over to the prefix handling for font_ */
    return pfxfn_font(optidx,req,negated,opts,op);
}

export function optfn_font_size_map(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    /* send them over to the prefix handling for font_ */
    return pfxfn_font(optidx,req,negated,opts,op);
}

export function optfn_font_size_menu(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    /* send them over to the prefix handling for font_ */
    return pfxfn_font(optidx,req,negated,opts,op);
}

export function optfn_font_size_message(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    /* send them over to the prefix handling for font_ */
    return pfxfn_font(optidx,req,negated,opts,op);
}

export function optfn_font_size_status(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    /* send them over to the prefix handling for font_ */
    return pfxfn_font(optidx,req,negated,opts,op);
}

export function optfn_font_size_text(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    /* send them over to the prefix handling for font_ */
    return pfxfn_font(optidx,req,negated,opts,op);
}

export function optfn_font_status(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    /* send them over to the prefix handling for font_ */
    return pfxfn_font(optidx,req,negated,opts,op);
}

export function optfn_font_text(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    /* send them over to the prefix handling for font_ */
    return pfxfn_font(optidx,req,negated,opts,op);
}

export function optfn_fruit(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["optfn_fruit.fnum",4]]);
    try {
    let forig=0;
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        goodfruit: {
            (op=string_for_opt(opts,C.i8(Number(!!(C.i32(negated)||Number(!(C.field(C.go,"instance_globals_o","opt_initial").value)))))));
            if(negated) {
                if(Number(op!=C.staticAddress("empty_optstr"))) {
                    bad_negation(C.literal("fruit"),(C.i8(1)));
                    return C.optn_err;
                }
                (op=C.staticAddress("empty_optstr"));
                break goodfruit; /* source goto goodfruit */
            }
            if(Number(op==C.staticAddress("empty_optstr"))) return C.optn_err;
            /* strip leading/trailing spaces, condense internal ones (3.6.2) */
            C.mungspaces(op);
            if(Number(!(C.field(C.go,"instance_globals_o","opt_initial").value))) {
                let f;
                let fnum=C.local("optfn_fruit.fnum","int",0);
                /* count number of named fruits; if 'op' is found among them,
               then the count doesn't matter because we won't be adding it */
                (f=C.fruit_from_name(op,(C.i8(0)),fnum.address));
                if(Number(!(f))) {
                    if(Number(!(C.field(C.flags,"flag","made_fruit").value))) (forig=C.fruit_from_name(C.field(C.svp,"instance_globals_saved_p","pl_fruit").address,(C.i8(0)),0));
                    if(Number(!!(Number(!(forig))&&Number(fnum.value>=100)))) {
                        C.variadic(33,C.literal("Doing that so many times isn't very fruitful."));
                        return C.optn_ok;
                    }
                }
            }
        }
        nmcpy(C.field(C.svp,"instance_globals_saved_p","pl_fruit").address,op,32);
        C.sanitize_name(C.field(C.svp,"instance_globals_saved_p","pl_fruit").address);
        /* OBJ_NAME(objects[SLIME_MOLD]) won't work for this after
           initialization; it gets changed to generic "fruit" */
        if(Number(!(C.cell(C.field(C.svp,"instance_globals_saved_p","pl_fruit").address,"char").value))) nmcpy(C.field(C.svp,"instance_globals_saved_p","pl_fruit").address,C.literal("slime mold"),32);
        if(Number(!(C.field(C.go,"instance_globals_o","opt_initial").value))) {
            /* if 'forig' is nonNull, we replace it rather than add
               a new fruit; it can only be nonNull if no fruits have
               been created since the previous name was put in place */
            fruitadd(C.field(C.svp,"instance_globals_saved_p","pl_fruit").address,forig);
            if(C.cell(C.staticAddress("give_opt_msg"),"signed char").value) C.variadic(34,C.literal("Fruit is now \"%s\"."),C.field(C.svp,"instance_globals_saved_p","pl_fruit").address);
        }
        /* If initial, then initoptions is allowed to do it instead
         * of here (initoptions always has to do it even if there's
         * no fruit option at all.  Also, we don't want people
         * setting multiple fruits in their options.)
         */
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        C.variadic(35,opts,C.literal("%s"),C.field(C.svp,"instance_globals_saved_p","pl_fruit").address);
        return C.optn_ok;
    }
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function optfn_gender(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["optfn_gender.op",8]]);
    try {
    op=C.local("optfn_gender.op","char *",op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* gender:string */
        if(Number(!(parse_role_opt(optidx,negated,C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,opts,op.address)))) return C.optn_silenterr;
        if(Number(C.i32(C.cell(op.value,"char").value)!=33)) {
            if(Number(((C.field(C.flags,"flag","initgend").value=C.str2gend(op.value)))==(C.i32((-1))))) {
                C.variadic(36,C.literal("Unknown %s '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op.value);
                return C.optn_err;
            }
            (C.field(C.flags,"flag","female").value=C.i8(C.field(C.flags,"flag","initgend").value));
            saveoptstr(optidx,(((Number(C.field(C.flags,"flag","initgend").value>=0))?C.field((C.genders+Number(C.field(C.flags,"flag","initgend").value)*C.sizes["struct Gender"]),"Gender","adj").value:((Number(C.field(C.flags,"flag","initgend").value==(C.i32((-2)))))?C.staticAddress("randomrole"):C.staticAddress("none")))));
        }
        return C.optn_ok;
    }
    if(Number(req==C.get_val)) {
        C.variadic(37,opts,C.literal("%s"),(((Number(C.field(C.flags,"flag","initgend").value>=0))?C.field((C.genders+Number(C.field(C.flags,"flag","initgend").value)*C.sizes["struct Gender"]),"Gender","adj").value:((Number(C.field(C.flags,"flag","initgend").value==(C.i32((-2)))))?C.staticAddress("randomrole"):C.staticAddress("none")))));
        return C.optn_ok;
    }
    if(Number(req==C.get_cnf_val)) {
        (op.value=get_cnf_role_opt(optidx));
        C.strcpy(opts,(op.value?op.value:C.literal("none")));
        return C.optn_ok;
    }
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function optfn_glyph(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["optfn_glyph.glyph",4]]);
    try {
    let glyph=C.local("optfn_glyph.glyph","int");
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* OPTION=glyph:G_glyph/U+NNNN/r-g-b */
        if(negated) {
            if(Number(op!=C.staticAddress("empty_optstr"))) {
                bad_negation(C.literal("glyph"),(C.i8(1)));
                return C.optn_err;
            }
        }
        if(Number(op==C.staticAddress("empty_optstr"))) return C.optn_err;
        /* strip leading/trailing spaces, condense internal ones (3.6.2) */
        C.mungspaces(op);
        if(Number(!(C.glyphrep_to_custom_map_entries(op,glyph.address)))) return C.optn_err;
        return C.optn_ok;
    }
    if(Number(req==C.get_val)) {
        C.variadic(38,opts,C.literal("%s"),C.staticAddress("to_be_done"));
        return C.optn_ok;
    }
    if(Number(req==C.get_cnf_val)) {
        (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
        return C.optn_ok;
    }
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function optfn_hilite_status(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* hilite fields in status prompt */
        (op=string_for_opt(opts,(C.i8(1))));
        if(Number(!!(Number(op!=C.staticAddress("empty_optstr"))&&C.i32(negated)))) {
            C.clear_status_hilites();
            return C.optn_ok;
        } else if(Number(op==C.staticAddress("empty_optstr"))) {
            C.variadic(39,C.literal("Value is mandatory for hilite_status"));
            return C.optn_err;
        }
        if(Number(!(C.parse_status_hl1(op,C.field(C.go,"instance_globals_o","opt_from_file").value)))) return C.optn_err;
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
        if(Number(req==C.get_val)) C.strcpy(opts,(C.count_status_hilites()?C.literal("(see \"status highlight rules\" below)"):C.literal("(none)")));
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_horsename(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    return petname_optfn(optidx,req,negated,opts,op);
}

export function optfn_IBMgraphics(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    let sym_name=C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value;
    let badflag=(C.i8(0));
    let i;
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* "IBMgraphics" */
        if(Number(!(negated))) {
            for((i=0);Number(i<C.NUM_GRAPHICS);(()=>{const old=i;i=C.i32((old+1));return i;})()) {
                if(C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(i)*C.sizes["struct symsetentry"]),"symsetentry","name").value) {
                    (badflag=(C.i8(1)));
                } else {
                    if(Number(i==C.ROGUESET)) (sym_name=C.literal("RogueIBM"));
                    (C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(i)*C.sizes["struct symsetentry"]),"symsetentry","name").value=C.dupstr(sym_name));
                    if(Number(!(C.read_sym_file(i)))) {
                        (badflag=(C.i8(1)));
                        C.clear_symsetentry(i,(C.i8(1)));
                        break;
                    }
                }
            }
            if(badflag) {
                C.variadic(40,C.literal("Failure to load symbol set %s."),sym_name);
                return C.optn_err;
            } else {
                C.switch_symbols(C.i32((C.i8(1))));
                if(Number(!!(Number(!(C.field(C.go,"instance_globals_o","opt_initial").value))&&((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address))))))))) C.assign_graphics(C.ROGUESET);
            }
        }
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_map_mode(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    let i;
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* WINCAP
         *
         *  map_mode:[tiles|ascii4x6|ascii6x8|ascii8x8|ascii16x8|ascii7x12
         *            |ascii8x12|ascii16x12|ascii12x16|ascii10x18|fit_to_screen
         *            |ascii_fit_to_screen|tiles_fit_to_screen]
         */
        (op=string_for_opt(opts,negated));
        if(Number(!!(Number(op!=C.staticAddress("empty_optstr"))&&Number(!(negated))))) {
            let save_map_mode=C.field(C.iflags,"instance_flags","wc_map_mode").value;
            if(Number(!(C.strncmpi((op),(C.literal("tiles")),C.i32((-1)))))) (C.field(C.iflags,"instance_flags","wc_map_mode").value=0);
 else if(Number(!(C.strncmpi(op,C.literal("ascii4x6"),C.i32(C.u64((BigInt((1*9))-C.u64(1)))))))) (C.field(C.iflags,"instance_flags","wc_map_mode").value=1);
 else if(Number(!(C.strncmpi(op,C.literal("ascii6x8"),C.i32(C.u64((BigInt((1*9))-C.u64(1)))))))) (C.field(C.iflags,"instance_flags","wc_map_mode").value=2);
 else if(Number(!(C.strncmpi(op,C.literal("ascii8x8"),C.i32(C.u64((BigInt((1*9))-C.u64(1)))))))) (C.field(C.iflags,"instance_flags","wc_map_mode").value=3);
 else if(Number(!(C.strncmpi(op,C.literal("ascii16x8"),C.i32(C.u64((BigInt((1*10))-C.u64(1)))))))) (C.field(C.iflags,"instance_flags","wc_map_mode").value=4);
 else if(Number(!(C.strncmpi(op,C.literal("ascii7x12"),C.i32(C.u64((BigInt((1*10))-C.u64(1)))))))) (C.field(C.iflags,"instance_flags","wc_map_mode").value=5);
 else if(Number(!(C.strncmpi(op,C.literal("ascii8x12"),C.i32(C.u64((BigInt((1*10))-C.u64(1)))))))) (C.field(C.iflags,"instance_flags","wc_map_mode").value=6);
 else if(Number(!(C.strncmpi(op,C.literal("ascii16x12"),C.i32(C.u64((BigInt((1*11))-C.u64(1)))))))) (C.field(C.iflags,"instance_flags","wc_map_mode").value=7);
 else if(Number(!(C.strncmpi(op,C.literal("ascii12x16"),C.i32(C.u64((BigInt((1*11))-C.u64(1)))))))) (C.field(C.iflags,"instance_flags","wc_map_mode").value=8);
 else if(Number(!(C.strncmpi(op,C.literal("ascii10x18"),C.i32(C.u64((BigInt((1*11))-C.u64(1)))))))) (C.field(C.iflags,"instance_flags","wc_map_mode").value=9);
 else if(Number(!(C.strncmpi(op,C.literal("fit_to_screen"),C.i32(C.u64((BigInt((1*14))-C.u64(1)))))))) (C.field(C.iflags,"instance_flags","wc_map_mode").value=10);
 else if(Number(!(C.strncmpi(op,C.literal("ascii_fit_to_screen"),C.i32(C.u64((BigInt((1*20))-C.u64(1)))))))) (C.field(C.iflags,"instance_flags","wc_map_mode").value=10);
 else if(Number(!(C.strncmpi(op,C.literal("tiles_fit_to_screen"),C.i32(C.u64((BigInt((1*20))-C.u64(1)))))))) (C.field(C.iflags,"instance_flags","wc_map_mode").value=11);
 else {
                C.variadic(41,C.literal("Unknown %s parameter '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op);
                return C.optn_err;
            }
            if(wc_supported(C.literal("map_mode"))) {
                if(Number(!!(Number(!(C.field(C.iflags,"instance_flags","wc_map_mode").value))||Number(save_map_mode!=C.field(C.iflags,"instance_flags","wc_map_mode").value)))) C.callback(5,(C.field(C.windowprocs,"window_procs","win_preference_update").value),C.literal("map_mode"));
            }
        } else if(negated) {
            bad_negation(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,(C.i8(1)));
            return C.optn_err;
        }
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        (i=C.field(C.iflags,"instance_flags","wc_map_mode").value);
        C.variadic(42,opts,C.literal("%s"),((Number(i==0))?C.literal("tiles"):((Number(i==1))?C.literal("ascii4x6"):((Number(i==2))?C.literal("ascii6x8"):((Number(i==3))?C.literal("ascii8x8"):((Number(i==4))?C.literal("ascii16x8"):((Number(i==5))?C.literal("ascii7x12"):((Number(i==6))?C.literal("ascii8x12"):((Number(i==7))?C.literal("ascii16x12"):((Number(i==8))?C.literal("ascii12x16"):((Number(i==9))?C.literal("ascii10x18"):((Number(i==10))?C.literal("fit_to_screen"):C.staticAddress("defopt")))))))))))));
        return C.optn_ok;
    }
    return C.optn_ok;
}

/* all the key assignment options for menu_* commands are identical
   but optlist.h treats them as distinct rather than sharing one */
export function shared_menu_optfn(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        let res=check_misc_menu_command(opts,op);
        if(Number(res<0)) return C.optn_err;
        return spcfn_misc_menu_cmd(res,req,negated,opts,op);
    }
    if(Number(req==C.get_val)) {
        C.variadic(43,opts,C.literal("%s"),C.staticAddress("to_be_done"));
        return C.optn_ok;
    }
    if(Number(req==C.get_cnf_val)) {
        (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_menu_deselect_all(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    return shared_menu_optfn(optidx,req,negated,opts,op);
}

export function optfn_menu_deselect_page(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    return shared_menu_optfn(optidx,req,negated,opts,op);
}

export function optfn_menu_first_page(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    return shared_menu_optfn(optidx,req,negated,opts,op);
}

export function optfn_menu_invert_all(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    return shared_menu_optfn(optidx,req,negated,opts,op);
}

export function optfn_menu_invert_page(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    return shared_menu_optfn(optidx,req,negated,opts,op);
}

export function optfn_menu_last_page(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    return shared_menu_optfn(optidx,req,negated,opts,op);
}

export function optfn_menu_next_page(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    return shared_menu_optfn(optidx,req,negated,opts,op);
}

export function optfn_menu_previous_page(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    return shared_menu_optfn(optidx,req,negated,opts,op);
}

export function optfn_menu_search(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    return shared_menu_optfn(optidx,req,negated,opts,op);
}

export function optfn_menu_select_all(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    return shared_menu_optfn(optidx,req,negated,opts,op);
}

export function optfn_menu_select_page(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    return shared_menu_optfn(optidx,req,negated,opts,op);
}

export function optfn_menu_shift_left(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    return shared_menu_optfn(optidx,req,negated,opts,op);
}

export function optfn_menu_shift_right(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    return shared_menu_optfn(optidx,req,negated,opts,op);
}

/* end of shared key assignments for menu commands */
export function optfn_menu_headings(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["optfn_menu_headings.ca",C.sizes["struct color_and_attr"]],["optfn_menu_headings.ca_buf",(1*256)]]);
    try {
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        let ca=C.automatic("optfn_menu_headings.ca",C.sizes["struct color_and_attr"]);
        if(Number(op==C.staticAddress("empty_optstr"))) {
            /* OPTIONS=menu_headings w/o value => no-color&inverse;
               OPTIONS=!menu_headings => no-color&none */
            (C.field(C.field(C.iflags,"instance_flags","menu_headings").address,"color_and_attr","attr").value=(C.i32(negated)?0:7));
            (C.field(C.field(C.iflags,"instance_flags","menu_headings").address,"color_and_attr","color").value=8);
            return C.optn_ok;
        } else if(negated) {
            /* 'op != empty_optstr' to get here */
            bad_negation(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,(C.i8(1)));
            return C.optn_silenterr;
        }
        if(Number(!(C.color_attr_parse_str(ca,op)))) return C.optn_err;
        C.copy(C.field(C.iflags,"instance_flags","menu_headings").address,ca,C.sizes["struct color_and_attr"]);
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        let ca_buf=C.automatic("optfn_menu_headings.ca_buf",(1*256));
        C.strcpy(ca_buf,C.color_attr_to_str(C.field(C.iflags,"instance_flags","menu_headings").address));
        /* change "no color" to "no-color" or "light blue" to "light-blue" */
        C.strNsubst(ca_buf,C.literal(" "),C.literal("-"),0);
        C.strcpy(opts,ca_buf);
        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        return handler_menu_headings();
    }
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function optfn_menu_objsyms(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        /* set iflags.menu_objsyms to 4, "conditional"; also sets
           iflags.menu_head_objsym to False and
           iflags.use_menu_glyphs True */
        set_menuobjsyms_flags(4);
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        let k; let l;
        let i; let osyms;
        if(negated) {
            /* allow '!menu_objsyms' (and '!use_menu_glyphs') as
               'menu_objsyms:none' (0) */
            (osyms=0);
        } else if(Number(op==C.staticAddress("empty_optstr"))) {
            /* treat boolean 'menu_objsyms' as 'menu_objsyms:headers' (1)
               accept obsolete boolean 'use_menu_glyphs' as a synonym
               for 'menu_objsyms:entries' (2) */
            (osyms=(Number(!(C.strncmp(opts,C.literal("use_menu_glyphs"),C.u64(15))))?2:1));
        } else if(C.digit(C.cell(op,"char").value)) {
            (i=C.atoi(op));
            if(Number(i>=C.i32((C.u64((BigInt((C.sizes["struct objsymopt"]*6))/BigInt(C.sizes["struct objsymopt"]))))))) {
                C.variadic(44,C.literal("Illegal %s parameter '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op);
                return C.optn_err;
            }
            (osyms=i);
        } else {
            /* stilted "one-or-other" is used to compress the menu width */
            
            let l5=C.u32((C.u64((BigInt((1*17))-BigInt((1*1))))));
            (osyms=0);
            (k=C.u32(C.strlen(op)));
            for((i=0);Number(i<C.i32((C.u64((BigInt((C.sizes["struct objsymopt"]*6))/BigInt(C.sizes["struct objsymopt"]))))));(()=>{const old=i;i=C.i32((old+1));return i;})()) {
                (l=C.u32(C.strlen(C.field((C.staticAddress("objsymvals")+Number(i)*C.sizes["struct objsymopt"]),"objsymopt","nam").value)));
                if(Number(k>=C.u32(4))) (l=k);
                if(Number(!!(Number(!(C.strncmpi(C.field((C.staticAddress("objsymvals")+Number(i)*C.sizes["struct objsymopt"]),"objsymopt","nam").value,op,C.i32(l))))||(Number(!!(Number(i==5)&&Number(!(C.strncmpi(C.staticAddress("optfn_menu_objsyms.alt5"),op,C.i32(l5)))))))))) {
                    (osyms=i);
                    break;
                }
            }
        }
        set_menuobjsyms_flags(osyms);
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        C.variadic(45,opts,C.literal("%s"),C.field((C.staticAddress("objsymvals")+Number(C.field(C.iflags,"instance_flags","menuobjsyms").value)*C.sizes["struct objsymopt"]),"objsymopt","nam").value);
        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        return handler_menu_objsyms();
    }
    return C.optn_ok;
}

export function optfn_menuinvertmode(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* menuinvertmode=0 or 1 or 2 (2 is experimental) */
        if(Number(op!=C.staticAddress("empty_optstr"))) {
            let mode=C.atoi(op);
            if(Number(!!(Number(mode<0)||Number(mode>2)))) {
                C.variadic(46,C.literal("Illegal %s parameter '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op);
                return C.optn_err;
            }
            (C.field(C.iflags,"instance_flags","menuinvertmode").value=mode);
        }
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        C.variadic(47,opts,C.literal("%d"),C.field(C.iflags,"instance_flags","menuinvertmode").value);
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_menustyle(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    let tmp;
    let val_required;
    /* no initializer based on opts because this can be
                             called with init and invalid opts and op */
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* menustyle:traditional or combination or full or partial */
        (val_required=C.i8((Number(!!(Number(C.strlen(opts)>C.u64(5))&&Number(!(negated)))))));
        if(Number(((op=string_for_opt(opts,C.i8(Number(!(val_required))))))==C.staticAddress("empty_optstr"))) {
            if(val_required) return C.optn_err;
            /* string_for_opt gave feedback */
            (tmp=(C.i32(negated)?110:102));
        } else {
            (tmp=C.i32(C.lowc(C.cell(op,"char").value)));
        }
        switch(tmp) {
            case (110):
                /* none */
                case (116):
                    /* traditional: prompt for class(es) by symbol,
                     prompt for each item within class(es) one at a time */
                    (C.field(C.flags,"flag","menu_style").value=C.i8(0));
            break;
            case (99):
                /* combination: prompt for class(es) by symbol,
                     choose items within selected class(es) by menu */
                (C.field(C.flags,"flag","menu_style").value=C.i8(1));
            break;
            case (102):
                /* full: choose class(es) by first menu,
                     choose items within selected class(es) by second menu */
                (C.field(C.flags,"flag","menu_style").value=C.i8(2));
            break;
            case (112):
                /* partial: skip class filtering, choose items among all
                     classes by menu */
                (C.field(C.flags,"flag","menu_style").value=C.i8(3));
            break;
            default:
                C.variadic(48,C.literal("Unknown %s parameter '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op);
            return C.optn_err;
        }
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        C.variadic(49,opts,C.literal("%s"),C.cell(((C.staticAddress("menutype")+Number(C.i32(C.field(C.flags,"flag","menu_style").value))*(8*3))+Number(0)*8),"char *").value);
        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        return handler_menustyle();
    }
    return C.optn_ok;
}

export function optfn_monsters(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_mouse_support(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    let compat;
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        (compat=C.i8((Number(C.strlen(opts)<=C.u64(13)))));
        (op=string_for_opt(opts,C.i8((Number(!!(C.i32(compat)||Number(!(C.field(C.go,"instance_globals_o","opt_initial").value))))))));
        if(Number(op==C.staticAddress("empty_optstr"))) {
            if(Number(!!(Number(!!(C.i32(compat)||C.i32(negated)))||C.i32(C.field(C.go,"instance_globals_o","opt_initial").value)))) {
                /* for backwards compatibility, "mouse_support" without a
                   value is a synonym for mouse_support:1 */
                (C.field(C.iflags,"instance_flags","wc_mouse_support").value=Number(!(negated)));
            }
        } else {
            let mode=C.atoi(op);
            if(Number(!!(Number(!!(Number(mode<0)||Number(mode>2)))||(Number(!!(Number(mode==0)&&Number(C.i32(C.cell(op,"char").value)!=48))))))) {
                C.variadic(50,C.literal("Illegal %s parameter '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op);
                return C.optn_err;
            } else {
                /* mode >= 0 */
                (C.field(C.iflags,"instance_flags","wc_mouse_support").value=mode);
            }
        }
        return C.optn_ok;
    }
    if(Number(req==C.get_val)) {
        
        let ms=C.field(C.iflags,"instance_flags","wc_mouse_support").value;
        if(Number(!!(Number(ms>=0)&&Number(ms<=2)))) C.variadic(51,opts,C.literal("%s%s"),C.cell(((C.staticAddress("optfn_mouse_support.mousemodes")+Number(ms)*(8*2))+Number(0)*8),"char *").value,C.cell(((C.staticAddress("optfn_mouse_support.mousemodes")+Number(ms)*(8*2))+Number(1)*8),"char *").value);
        return C.optn_ok;
    }
    if(Number(req==C.get_cnf_val)) {
        C.variadic(52,opts,C.literal("%i"),C.field(C.iflags,"instance_flags","wc_mouse_support").value);
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_msg_window(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    let retval=C.optn_ok;
    let tmp;
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* msg_window:single, combo, full or reversed */
        /* allow option to be silently ignored by non-tty ports */
        if(Number(op==C.staticAddress("empty_optstr"))) {
            (tmp=(C.i32(negated)?115:102));
        } else {
            if(negated) {
                bad_negation(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,(C.i8(1)));
                return C.optn_err;
            }
            (tmp=C.i32(C.lowc(C.cell(op,"char").value)));
        }
        switch(tmp) {
            case (115):
                /* single message history cycle (default if negated) */
                case (99):
                    /* combination: first two as singles, then full page */
                    case (102):
                        /* full page (default if specified without argument) */
                        case (114):
                            /* full page in reverse order (LIFO; default for curses) */
                            (C.field(C.iflags,"instance_flags","prevmsg_window").value=C.i8(tmp));
            break;
            default:
                C.variadic(53,C.literal("Unknown %s parameter '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op);
            (retval=C.optn_err);
        }
        return retval;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
        (tmp=C.i32(C.field(C.iflags,"instance_flags","prevmsg_window").value));
        if((Number(C.u32(C.field(C.windowprocs,"window_procs","wp_id").value)==C.u32(C.wp_curses)))) {
            if(Number(!!(Number(tmp==115)||Number(tmp==99)))) (tmp=C.i32((C.field(C.iflags,"instance_flags","prevmsg_window").value=C.i8(114))));
        }
        C.variadic(54,opts,C.literal("%s"),((Number(tmp==115))?C.literal("single"):((Number(tmp==99))?C.literal("combination"):((Number(tmp==102))?C.literal("full"):C.literal("reversed")))));
        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        return handler_msg_window();
    }
    return C.optn_ok;
}

export function optfn_msghistory(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        (op=string_for_env_opt(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,opts,negated));
        if(Number(!!((Number(!!(C.i32(negated)&&Number(op==C.staticAddress("empty_optstr")))))||(Number(!!(Number(!(negated))&&Number(op!=C.staticAddress("empty_optstr")))))))) {
            (C.field(C.iflags,"instance_flags","msg_history").value=C.u32((C.i32(negated)?0:C.atoi(op))));
        } else if(negated) {
            bad_negation(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,(C.i8(1)));
            return C.optn_err;
        }
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        C.variadic(55,opts,C.literal("%u"),C.field(C.iflags,"instance_flags","msg_history").value);
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_name(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* name:string */
        if(Number(((op=string_for_env_opt(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,opts,(C.i8(0)))))!=C.staticAddress("empty_optstr"))) {
            nmcpy(C.field(C.svp,"instance_globals_saved_p","plname").address,op,32);
        } else return C.optn_err;
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        C.variadic(56,opts,C.literal("%s"),C.field(C.svp,"instance_globals_saved_p","plname").address);
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_number_pad(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    let compat;
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        (compat=C.i8((Number(C.strlen(opts)<=C.u64(10)))));
        (op=string_for_opt(opts,C.i8((Number(!!(C.i32(compat)||Number(!(C.field(C.go,"instance_globals_o","opt_initial").value))))))));
        if(Number(op==C.staticAddress("empty_optstr"))) {
            if(Number(!!(Number(!!(C.i32(compat)||C.i32(negated)))||C.i32(C.field(C.go,"instance_globals_o","opt_initial").value)))) {
                /* for backwards compatibility, "number_pad" without a
                   value is a synonym for number_pad:1 */
                (C.field(C.iflags,"instance_flags","num_pad").value=C.i8(Number(!(negated))));
                (C.field(C.iflags,"instance_flags","num_pad_mode").value=C.u8(0));
            }
        } else if(negated) {
            bad_negation(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,(C.i8(1)));
            return C.optn_err;
        } else {
            let mode=C.atoi(op);
            if(Number(!!(Number(!!(Number(mode<C.i32((-1)))||Number(mode>4)))||(Number(!!(Number(mode==0)&&Number(C.i32(C.cell(op,"char").value)!=48))))))) {
                C.variadic(57,C.literal("Illegal %s parameter '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op);
                return C.optn_err;
            } else if(Number(mode<=0)) {
                (C.field(C.iflags,"instance_flags","num_pad").value=(C.i8(0)));
                /* German keyboard; y and z keys swapped */
                (C.field(C.iflags,"instance_flags","num_pad_mode").value=C.u8((Number(mode<0))));
                /* 0 or 1 */
            } else {
                /* mode > 0 */
                (C.field(C.iflags,"instance_flags","num_pad").value=(C.i8(1)));
                (C.field(C.iflags,"instance_flags","num_pad_mode").value=C.u8(0));
                /* PC Hack / MSDOS compatibility */
                if(Number(!!(Number(mode==2)||Number(mode==4)))) (C.field(C.iflags,"instance_flags","num_pad_mode").value=C.u8(C.i32(C.field(C.iflags,"instance_flags","num_pad_mode").value)|1));
                /* phone keypad layout */
                if(Number(!!(Number(mode==3)||Number(mode==4)))) (C.field(C.iflags,"instance_flags","num_pad_mode").value=C.u8(C.i32(C.field(C.iflags,"instance_flags","num_pad_mode").value)|2));
            }
        }
        C.reset_commands((C.i8(0)));
        C.callback(6,(C.field(C.windowprocs,"window_procs","win_number_pad").value),(C.i32(C.field(C.iflags,"instance_flags","num_pad").value)?1:0));
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        
        /*[5]*/
        let indx=(C.i32(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","num_pad").value)?((C.i32(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","phone_layout").value)?((C.i32(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","pcHack_compat").value)?4:3)):((C.i32(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","pcHack_compat").value)?2:1)))):(C.i32(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","swap_yz").value)?5:0));
        if(Number(req==C.get_val)) C.strcpy(opts,C.cell((C.staticAddress("optfn_number_pad.numpadmodes")+Number(indx)*8),"char *").value);
 else {
            C.variadic(58,opts,C.literal("%i"),((Number(indx==5))?C.i32((-1)):indx));
        }
        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        return handler_number_pad();
    }
    return C.optn_ok;
}

export function optfn_objects(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        return C.optn_ok;
    }
    if(Number(req==C.get_val)) {
        C.variadic(59,opts,C.literal("%s"),C.staticAddress("to_be_done"));
        return C.optn_ok;
    }
    if(Number(req==C.get_cnf_val)) {
        (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_packorder(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["optfn_packorder.ocl",(1*19)]]);
    try {
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        if(Number(op==C.staticAddress("empty_optstr"))) return C.optn_err;
        if(Number(!(change_inv_order(op)))) return C.optn_err;
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        let ocl=C.automatic("optfn_packorder.ocl",(1*19));
        oc_to_str(C.field(C.flags,"flag","inv_order").address,ocl);
        C.variadic(60,opts,C.literal("%s"),ocl);
        return C.optn_ok;
    }
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/*
             *  palette (adjust an RGB color in palette (color/R-G-B)
             */
/* old MACOS9 OS9 code */
/* HARDCODED inverse number */
/* ----------- Mac OS 9 code -------------------------*/
/* Assumes ASCII... */
/* Digits in ASCII too... */
/* Add an extra so we fill f -> ff and 0 -> 00 */
/* 0 */
/* CHANGE_COLOR */
/* for "paranoid_confirmation:foo" and alias "[!]prayconfirm" */
export function optfn_paranoid_confirmation(optidx,req,opt_negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    opt_negated=C.i8(opt_negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["optfn_paranoid_confirmation.prayconfirm",(1*6)],["optfn_paranoid_confirmation.tmpbuf",(1*256)]]);
    try {
    let fld_negated;
    let i;
    /*
     * Player can change required response for some prompts (quit, die,
     * attack, save-bones, continue-eating, break-wand, Were-change to
     * need to be "yes<return>" instead of just 'y' keystroke to accept.
     *
     * For paranoid_confirm:Confirm, these prompts also need "no<return>"
     * instead of 'n' or <space> or <return> to reject.  (<escape> always
     * works as a way to reject.)
     *
     * Player can add an extra prompt (pray, AutoAll) that isn't
     * ordinarily there.  (They ask for 'y' keystroke unless Confirm is
     * also set, then they'll switch to "yes<return>", "no<return>".)
     *
     * Player can also change game's behavior.  paranoid_confirm:swim
     * can be used to prevent accidentally stepping into water or lava;
     * player must use the 'm' movement prefix to do that intentionally.
     * paranoid_confirm:Remove [with synonym parnoid_confirm:Takeoff]
     * changes the 'R' and 'T' commands [which have differing criteria
     * for "only one candidate item"] to prompt for inventory item to
     * remove/takeoff when there is only one candidate, so allows player
     * a chance to cancel at the pick-an-item prompt or menu.
     */
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        let prayconfirm=C.automatic("optfn_paranoid_confirmation.prayconfirm",(1*6));
        let pp;
        let plus_or_minus=(C.i8(0));
        /*
         * "prayconfirm" used to be a separate boolean option,
         * now it is a synonym for paranoid_confirm:+pray and
         * "!prayconfirm" has become one for paranoid_confirm:-pray.
         */
        if(Number(!(C.strncmpi(opts,C.literal("prayconfirm"),4)))) {
            if(C.cell(op,"char").value) {
                /* presence of any value is treated as an error whether
                   complaining about the 'prayconfirm' deprecation or not;
                   this will erroneously reject "prayconfirm:true"; too
                   bad; back when prayconfirm was in active use, tacking on
                   an explicit value to a boolean option wasn't supported */
                C.variadic(61,C.literal("deprecated %sprayconfirm option takes no parameters (found '%s')"),(C.i32(opt_negated)?C.literal("!"):C.literal("")),op);
                return C.optn_silenterr;
            }
            /* config file summary of complaints includes this in the count
               of errors; we'd prefer that it be described as a warning but
               that isn't supported [not important since this is considered
               temporary until 'prayconfirm' gets removed altogether] */
            C.variadic(62,C.literal("%sprayconfirm option is deprecated; switching to %s:%cpray"),(C.i32(opt_negated)?C.literal("!"):C.literal("")),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,(C.i32(opt_negated)?45:43));
            /* keep going */
            /* convert prayconfirm to paranoid_confirm:+pray and
               !prayconfirm to paranoid_confirm:-pray */
            C.variadic(63,prayconfirm,C.literal("%cpray"),(C.i32(opt_negated)?45:43));
            (op=prayconfirm);
            /* possibly changing !prayconfirm to paranoid_confirm:-pray
               which clears a paranoia bit but isn't a negated option */
            (opt_negated=(C.i8(0)));
            /*
         * end of 'prayconfirm' processing
         */
        } else if(opt_negated) {
            /* "!paranoid_confirm" w/o args is same as paranoid_confirm:none;
               "!paranoid_confirm:anything" is disallowed */
            if(Number(!(C.cell(op,"char").value))) {
                (C.field(C.flags,"flag","paranoia_bits").value=C.u32(0));
                return C.optn_ok;
            } else {
                C.variadic(64,C.literal("!%s does not accept a value"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value);
                return C.optn_silenterr;
            }
        } else if(Number(!(C.cell(op,"char").value))) {
            /* "paranoid_confirm" without any arguments is disallowed */
            C.variadic(65,C.literal("%s requires a value; use 'none' to cancel all"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value);
            return C.optn_silenterr;
        }
        /*
         * Multiple settings for paranoid_confirmation are allowed.
         * When a new instance is processed, the behavior depends on the
         * first character of its value:
         *
         * paranoid_confirm:foo bar
         *   clears all confirmation bits (from previous settings, including
         *   default), then sets the bits for foo and bar;
         *
         * paranoid_confirm:+foo bar
         *   existing bits are kept, plus those for foo and bar are set;
         *
         * paranoid_confirm:-foo bar
         *   existing bits are kept except those for foo and bar get cleared;
         *
         * paranoid_confirm:+foo !bar
         *   combination of paranoid_confirm:+foo,paranoid_confirm:-bar;
         *
         * paranoid_confirm:-foo !bar
         *   the negation in '!bar' is ignored, treated as if '-foo bar';
         *
         * !paranoid_confirm
         *   without a value is treated as paranoid_confirm:none and clears
         *   all bits;
         * !paranoid_confirm:anything
         *   (including +anything_else or -anything_else) is disallowed;
         *
         * paranoid_confirm:+all is the same as paranoid_confirm:all;
         * paranoid_confirm:-all is the same as paranoid_confirm:none;
         * paranoid_confirm:+none and paranoid_confirm:-none are no-ops.
         */
        C.mungspaces(op);
        if(Number(!!(Number(C.i32(C.cell(op,"char").value)!=43)&&Number(C.i32(C.cell(op,"char").value)!=45)))) {
            /* new value; first clear all old bits */
            (C.field(C.flags,"flag","paranoia_bits").value=C.u32(0));
        } else {
            /* augmenting existing value; keep old bits */
            (plus_or_minus=(C.i8(1)));
            /* only used for "+none" and "-none" */
            (opt_negated=C.i8((Number(C.i32(C.cell(op,"char").value)==45))));
            /* context is changed */
            if(Number(C.i32(C.cell((()=>{const old=op;op=C.ptr((old+Number(1)));return op;})(),"char").value)==32)) (()=>{const old=op;op=C.ptr((old+Number(1)));return op;})();
            /* skip '+' or '-', maybe whitespace */
        }
        for(;;) {
            (fld_negated=C.i8((Number(C.i32(C.cell(op,"char").value)==33))));
            if(fld_negated) {
                /* there shouldn't be a space after '!' because then
                   "! foo bar" looks like it might be intended to mean
                   "!foo !bar" but if there is one, skip it to prevent
                   a lookup attempt for "" which will fail and result in
                   an unhelpful error message; accepting the space is
                   simpler than another special case error message */
                if(Number(C.i32(C.cell((()=>{const old=op;op=C.ptr((old+Number(1)));return op;})(),"char").value)==32)) (()=>{const old=op;op=C.ptr((old+Number(1)));return op;})();
                /* skip '!', maybe whitespace */
            } else {
                /* accept "nofoo" to be same as "!foo", unless "no" is
                   followed by a space or 'foo' begins with "n" (to avoid
                   confusion for "none" */
                if(Number(!!(Number(!!(Number(C.i32(C.lowc(C.cell((op+Number(0)*1),"char").value))==110)&&Number(C.i32(C.lowc(C.cell((op+Number(1)*1),"char").value))==111)))&&C.i32(C.lowc(C.i8(Number(!!(Number(C.i32(C.cell((op+Number(2)*1),"char").value)!=110)&&Number(C.i32(C.lowc(C.cell((op+Number(2)*1),"char").value))!=0))))))))) {
                    (fld_negated=(C.i8(1)));
                    (op=C.ptr(op+Number(2)*1));
                    /* skip "no"; we know next char isn't space  */
                }
            }
            /* We're looking to parse
               "paranoid_confirm:whichone wheretwo whothree"
               and "paranoid_confirm:" prefix has already
               been stripped off by the time we get here */
            (pp=C.strchr(op,32));
            if(pp) (C.cell(pp,"char").value=C.i8(0));
            /* we aren't matching option names but match_optname()
               does what we want once we've broken the space
               delimited aggregate into separate tokens */
            for((i=0);Number(i<C.i32((C.u64((BigInt((C.sizes["struct paranoia_opts"]*15))/BigInt(C.sizes["struct paranoia_opts"]))))));(()=>{const old=i;i=C.i32((old+1));return i;})()) {
                if(Number(!!(C.i32(match_optname(op,C.field((C.staticAddress("paranoia")+Number(i)*C.sizes["struct paranoia_opts"]),"paranoia_opts","argname").value,C.field((C.staticAddress("paranoia")+Number(i)*C.sizes["struct paranoia_opts"]),"paranoia_opts","argMinLen").value,(C.i8(0))))||(Number(!!(C.field((C.staticAddress("paranoia")+Number(i)*C.sizes["struct paranoia_opts"]),"paranoia_opts","synonym").value&&C.i32(match_optname(op,C.field((C.staticAddress("paranoia")+Number(i)*C.sizes["struct paranoia_opts"]),"paranoia_opts","synonym").value,C.field((C.staticAddress("paranoia")+Number(i)*C.sizes["struct paranoia_opts"]),"paranoia_opts","synMinLen").value,(C.i8(0)))))))))) {
                    if(Number(!(C.field((C.staticAddress("paranoia")+Number(i)*C.sizes["struct paranoia_opts"]),"paranoia_opts","flagmask").value))) {
                        /* flagmask==0 is "none", clear all bits
                           but "+none" and "-none" are no-ops */
                        if(Number(!(plus_or_minus))) (C.field(C.flags,"flag","paranoia_bits").value=C.u32(0));
                        /* clear all */
                    } else if(Number(!!(C.i32(opt_negated)||C.i32(fld_negated)))) {
                        (C.field(C.flags,"flag","paranoia_bits").value=C.u32(C.field(C.flags,"flag","paranoia_bits").value&C.u32(C.i32((~C.field((C.staticAddress("paranoia")+Number(i)*C.sizes["struct paranoia_opts"]),"paranoia_opts","flagmask").value)))));
                    } else {
                        (C.field(C.flags,"flag","paranoia_bits").value=C.u32(C.field(C.flags,"flag","paranoia_bits").value|C.u32(C.field((C.staticAddress("paranoia")+Number(i)*C.sizes["struct paranoia_opts"]),"paranoia_opts","flagmask").value)));
                    }
                    break;
                }
            }
            if(Number(i==C.i32((C.u64((BigInt((C.sizes["struct paranoia_opts"]*15))/BigInt(C.sizes["struct paranoia_opts"]))))))) {
                /* didn't match anything, so arg is bad;
                   any flags already modified will stay modified */
                C.variadic(66,C.literal("Unknown %s parameter '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op);
                return C.optn_silenterr;
            }
            /* move on to next token */
            if(pp) (op=(pp+Number(1)*1));
 else break;
            /* no next token */
        }
        /* for(;;) */
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        let tmpbuf=C.automatic("optfn_paranoid_confirmation.tmpbuf",(1*256));
        (C.cell((tmpbuf+Number(0)*1),"char").value=C.i8(0));
        for((i=0);Number(C.field((C.staticAddress("paranoia")+Number(i)*C.sizes["struct paranoia_opts"]),"paranoia_opts","flagmask").value!=0);(()=>{const old=i;i=C.i32((old+1));return i;})()) {
            if(Number(!!(Number((C.u32((C.field(C.flags,"flag","paranoia_bits").value&C.u32(C.field((C.staticAddress("paranoia")+Number(i)*C.sizes["struct paranoia_opts"]),"paranoia_opts","flagmask").value))))!=C.u32(0))&&(Number(!!(Number(!!(Number(C.field((C.staticAddress("paranoia")+Number(i)*C.sizes["struct paranoia_opts"]),"paranoia_opts","flagmask").value!=8)||C.i32(C.field(C.flags,"flag","debug").value)))||Number(req==C.get_cnf_val))))))) C.variadic(67,(C.literal("optfn_paranoid_confirmation")),3032,C.eos(tmpbuf),C.u64((BigInt((1*256))-C.strlen(tmpbuf))),C.literal(" %s"),C.field((C.staticAddress("paranoia")+Number(i)*C.sizes["struct paranoia_opts"]),"paranoia_opts","argname").value);
            /* hide paranoid_confirm:bones during play except for wizard
                   mode; keep it for any mode if rewriting the config file */
        }
        /* note: always leaves enough room for caller to tack on '\n' */
        (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
        C.strncat(opts,(C.i32(C.cell((tmpbuf+Number(0)*1),"char").value)?(tmpbuf+Number(1)*1):C.literal("none")),C.u64(C.i32((256-1))));
        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        return handler_paranoid_confirmation();
    }
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function optfn_perminv_mode(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    let old_perm_invent=C.field(C.iflags,"instance_flags","perm_invent").value;
    let old_perminv_mode=C.field(C.iflags,"instance_flags","perminv_mode").value;
    let retval=C.optn_ok;
    if(Number(req==C.do_init)) {
        /* old, TEMPORARY method of controlling 'perm_invent';
           note: the bits used now have been changed, hence 'n << 1' */
        return C.optn_ok;
    } else if(Number(req==C.do_set)) {
        (op=string_for_opt(opts,negated));
        if(Number(!!(Number(op!=C.staticAddress("empty_optstr"))&&C.i32(negated)))) {
            /* reject "!perminv_mode=foo" */
            bad_negation(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,(C.i8(1)));
            (retval=C.optn_silenterr);
        } else if(Number(op!=C.staticAddress("empty_optstr"))) {
            /* "perminv_mode=foo" */
            let pi0; let pi1;
            let i;
            let ln=C.u32(C.strlen(op));
            /* guaranteed > 0 */
            for((i=0);Number(i<C.i32((C.u64((BigInt(((8*9)*3))/BigInt((8*3)))))));(()=>{const old=i;i=C.i32((old+1));return i;})()) {
                if(Number(!(((pi0=C.cell(((C.staticAddress("perminv_modes")+Number(i)*(8*3))+Number(0)*8),"char *").value))))) continue;
                (pi1=C.cell(((C.staticAddress("perminv_modes")+Number(i)*(8*3))+Number(1)*8),"char *").value);
                if(Number(!!(Number(!!(Number(!(C.strncmpi(op,pi0,C.i32(ln))))||Number(!(C.strncmpi(op,pi1,C.i32(ln))))))||Number(C.i32(C.cell((op+Number(0)*1),"char").value)==C.i32((i+48)))))) {
                    /* also accept '0'..'8' */
                    /*#ifdef TTY_PERM_INVENT*/
                    if(Number(!!(C.strstri(pi0,C.literal("+grid"))&&Number(!((Number(C.u32(C.field(C.windowprocs,"window_procs","wp_id").value)==C.u32(C.wp_tty)))))))) {
                        (i=C.i32(i&C.i32((~C.InvSparse))));
                        C.variadic(68,C.literal("%s: unavailable perm_invent mode '%s', using '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,pi0,C.cell(((C.staticAddress("perminv_modes")+Number(i)*(8*3))+Number(0)*8),"char *").value);
                    }
                    (C.field(C.iflags,"instance_flags","perminv_mode").value=C.u8(i));
                    (C.field(C.iflags,"instance_flags","perm_invent").value=(C.i8(1)));
                    break;
                }
            }
            if(Number(i==C.i32((C.u64((BigInt(((8*9)*3))/BigInt((8*3)))))))) {
                C.variadic(69,C.literal("Unknown %s parameter '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op);
                (C.field(C.iflags,"instance_flags","perminv_mode").value=C.u8(C.InvOptNone));
                (C.field(C.iflags,"instance_flags","perm_invent").value=(C.i8(0)));
                (retval=C.optn_silenterr);
            }
        } else if(negated) {
            /* "!perminv_mode" */
            (C.field(C.iflags,"instance_flags","perminv_mode").value=C.u8(C.InvOptNone));
            (C.field(C.iflags,"instance_flags","perm_invent").value=(C.i8(0)));
        }
        if(Number(!(C.field(C.go,"instance_globals_o","opt_initial").value))) {
            if(Number(!!(Number(C.i32(C.field(C.iflags,"instance_flags","perminv_mode").value)!=C.i32(old_perminv_mode))||Number(C.i32(C.field(C.iflags,"instance_flags","perm_invent").value)!=C.i32(old_perm_invent))))) (C.field(C.go,"instance_globals_o","opt_need_redraw").value=(C.i8(1)));
        }
    } else if(Number(req==C.do_handler)) {
        /* use a menu to choose new value for perminv_mode */
        (retval=handler_perminv_mode());
    } else if(Number(req==C.get_val)) {
        /* value shown when examining current option settings; enclosed
           within square brackets for 'O', shown as-is when setting value */
        C.variadic(70,opts,C.literal("%s"),C.cell(((C.staticAddress("perminv_modes")+Number(C.field(C.iflags,"instance_flags","perminv_mode").value)*(8*3))+Number(2)*8),"char *").value);
        if(Number(!!(Number(!!(Number(C.i32(C.field(C.iflags,"instance_flags","perminv_mode").value)!=C.InvOptNone)&&Number(!(C.field(C.iflags,"instance_flags","perm_invent").value))))&&op))) {
            /* 'op' is Null when called by handler_perminv_mode() while
               setting, non-Null when 'm O' shows current option values */
            /* perminv_mode is set but isn't useful because perm_invent is
               Off; say so after squeezing out enough for it to barely fit */
            if(Number(C.i32(C.field(C.iflags,"instance_flags","perminv_mode").value)==C.InvOptInUse)) C.strsubst(opts,C.literal(" currently"),C.literal(""));
 else C.strsubst(opts,C.literal(" inventory"),C.literal(" invent"));
            C.strcat(opts,(((Number((C.i32((C.i32(C.field(C.iflags,"instance_flags","perminv_mode").value)&C.InvSparse)))!=0))?C.literal(" (Off)"):C.literal(" ('perm_invent' is Off)"))));
        }
    } else if(Number(req==C.get_cnf_val)) {
        C.variadic(71,opts,C.literal("%s"),C.cell(((C.staticAddress("perminv_modes")+Number(C.field(C.iflags,"instance_flags","perminv_mode").value)*(8*3))+Number(0)*8),"char *").value);
    }
    return retval;
}

export function optfn_petattr(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    let retval=C.optn_ok;
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* WINCAP2 petattr:string */
        (op=string_for_opt(opts,negated));
        if(Number(!!(Number(op!=C.staticAddress("empty_optstr"))&&C.i32(negated)))) {
            bad_negation(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,(C.i8(1)));
            (retval=C.optn_err);
        } else if(Number(op!=C.staticAddress("empty_optstr"))) {
            let itmp=C.match_str2attr(op,(C.i8(0)));
            if(Number(itmp==C.i32((-1)))) {
                C.variadic(72,C.literal("Unknown %s parameter '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,opts);
                (retval=C.optn_err);
            } else (C.field(C.iflags,"instance_flags","wc2_petattr").value=itmp);
        } else if(negated) {
            (C.field(C.iflags,"instance_flags","wc2_petattr").value=0);
        }
        if(Number(retval!=C.optn_err)) {
            (C.field(C.iflags,"instance_flags","wc_hilite_pet").value=C.i8((Number(C.field(C.iflags,"instance_flags","wc2_petattr").value!=0))));
            if(Number(!(C.field(C.go,"instance_globals_o","opt_initial").value))) (C.field(C.go,"instance_globals_o","opt_need_redraw").value=(C.i8(1)));
        }
        return retval;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        if(Number(!!((Number(C.u32(C.field(C.windowprocs,"window_procs","wp_id").value)==C.u32(C.wp_tty)))||(Number(C.u32(C.field(C.windowprocs,"window_procs","wp_id").value)==C.u32(C.wp_curses)))))) {
            C.strcpy(opts,C.attr2attrname(C.field(C.iflags,"instance_flags","wc2_petattr").value));
        } else if(Number(C.field(C.iflags,"instance_flags","wc2_petattr").value!=0)) C.variadic(73,opts,C.literal("0x%08x"),C.field(C.iflags,"instance_flags","wc2_petattr").value);
 else if(Number(req==C.get_cnf_val)) (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
 else C.strcpy(opts,C.staticAddress("defopt"));
    }
    if(Number(req==C.do_handler)) {
        return handler_petattr();
    }
    return C.optn_ok;
}

export function optfn_pettype(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        if(Number(((op=string_for_env_opt(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,opts,negated)))!=C.staticAddress("empty_optstr"))) {
            switch(C.i32(C.lowc(C.cell(op,"char").value))) {
                case (100):
                    /* dog */
                    (C.field(C.gp,"instance_globals_p","preferred_pet").value=C.i8(100));
                break;
                case (99):
                    /* cat */
                    case (102):
                        /* feline */
                        (C.field(C.gp,"instance_globals_p","preferred_pet").value=C.i8(99));
                break;
                case (104):
                    /* horse */
                    case (113):
                        /* quadruped */
                        /* avoids giving "unrecognized type of pet" but
                   pet_type(dog.c) won't actually honor this */
                        (C.field(C.gp,"instance_globals_p","preferred_pet").value=C.i8(104));
                break;
                case (110):
                    /* no pet */
                    (C.field(C.gp,"instance_globals_p","preferred_pet").value=C.i8(110));
                break;
                case (114):
                    /* random */
                    case (42):
                        /* random */
                        (C.field(C.gp,"instance_globals_p","preferred_pet").value=C.i8(0));
                break;
                default:
                    C.variadic(74,C.literal("Unrecognized pet type '%s'."),op);
                return C.optn_err;
                break;
            }
        } else if(negated) (C.field(C.gp,"instance_globals_p","preferred_pet").value=C.i8(110));
        return C.optn_ok;
    }
    if(Number(req==C.get_val)) {
        C.variadic(75,opts,C.literal("%s"),((Number(C.i32(C.field(C.gp,"instance_globals_p","preferred_pet").value)==99))?C.literal("cat"):((Number(C.i32(C.field(C.gp,"instance_globals_p","preferred_pet").value)==100))?C.literal("dog"):((Number(C.i32(C.field(C.gp,"instance_globals_p","preferred_pet").value)==104))?C.literal("horse"):((Number(C.i32(C.field(C.gp,"instance_globals_p","preferred_pet").value)==110))?C.literal("none"):C.literal("random"))))));
        return C.optn_ok;
    }
    if(Number(req==C.get_cnf_val)) {
        if(C.field(C.gp,"instance_globals_p","preferred_pet").value) C.variadic(76,opts,C.literal("%c"),C.i32(C.field(C.gp,"instance_globals_p","preferred_pet").value));
 else (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_pickup_burden(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* maximum burden picked up before prompt (Warren Cheung) */
        if(Number(((op=string_for_env_opt(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,opts,(C.i8(0)))))!=C.staticAddress("empty_optstr"))) {
            switch(C.i32(C.lowc(C.cell(op,"char").value))) {
                case (117):
                    /* Unencumbered */
                    (C.field(C.flags,"flag","pickup_burden").value=C.UNENCUMBERED);
                break;
                case (98):
                    /* Burdened (slight encumbrance) */
                    (C.field(C.flags,"flag","pickup_burden").value=C.SLT_ENCUMBER);
                break;
                case (115):
                    /* streSsed (moderate encumbrance) */
                    (C.field(C.flags,"flag","pickup_burden").value=C.MOD_ENCUMBER);
                break;
                case (110):
                    /* straiNed (heavy encumbrance) */
                    (C.field(C.flags,"flag","pickup_burden").value=C.HVY_ENCUMBER);
                break;
                case (111):
                    /* OverTaxed (extreme encumbrance) */
                    case (116):
                        (C.field(C.flags,"flag","pickup_burden").value=C.EXT_ENCUMBER);
                break;
                case (108):
                    /* overLoaded */
                    (C.field(C.flags,"flag","pickup_burden").value=C.OVERLOADED);
                break;
                default:
                    C.variadic(77,C.literal("Unknown %s parameter '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op);
                return C.optn_err;
            }
        } else return C.optn_err;
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        C.variadic(78,opts,C.literal("%s"),C.cell((C.staticAddress("burdentype")+Number(C.field(C.flags,"flag","pickup_burden").value)*8),"char *").value);
        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        return handler_pickup_burden();
    }
    return C.optn_ok;
}

export function optfn_pickup_types(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["optfn_pickup_types.ocl",(1*19)],["optfn_pickup_types.tbuf",(1*19)],["optfn_pickup_types.qbuf",(1*128)],["optfn_pickup_types.abuf",(1*256)]]);
    try {
    let ocl=C.automatic("optfn_pickup_types.ocl",(1*19)); let tbuf=C.automatic("optfn_pickup_types.tbuf",(1*19)); let qbuf=C.automatic("optfn_pickup_types.qbuf",(1*128)); let abuf=C.automatic("optfn_pickup_types.abuf",(1*256));
    let oc_sym;
    let num;
    let badopt=(C.i8(0)); let compat=C.i8((Number(C.strlen(opts)<=C.u64(6)))); let use_menu;
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* types of objects to pick up automatically */
        oc_to_str(C.field(C.flags,"flag","pickup_types").address,tbuf);
        (C.cell((C.field(C.flags,"flag","pickup_types").address+Number(0)*1),"char").value=C.i8(0));
        /* all */
        (op=string_for_opt(opts,C.i8((Number(!!(C.i32(compat)||Number(!(C.field(C.go,"instance_globals_o","opt_initial").value))))))));
        if(Number(op==C.staticAddress("empty_optstr"))) {
            if(Number(!!(Number(!!(C.i32(compat)||C.i32(negated)))||C.i32(C.field(C.go,"instance_globals_o","opt_initial").value)))) {
                /* for backwards compatibility, "pickup" without a
                   value is a synonym for autopickup of all types
                   (and during initialization, we can't prompt yet) */
                (C.field(C.flags,"flag","pickup").value=C.i8(Number(!(negated))));
                return C.optn_ok;
            }
            oc_to_str(C.field(C.flags,"flag","inv_order").address,ocl);
            (use_menu=(C.i8(1)));
            if(Number(!!(Number(C.i32(C.field(C.flags,"flag","menu_style").value)==0)||Number(C.i32(C.field(C.flags,"flag","menu_style").value)==1)))) {
                let wasspace;
                (use_menu=(C.i8(0)));
                C.variadic(79,qbuf,C.literal("New %s: [%s am] (%s)"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,ocl,(C.i32(C.cell(tbuf,"char").value)?tbuf:C.literal("all")));
                (C.cell((abuf+Number(0)*1),"char").value=C.i8(0));
                C.getlin(qbuf,abuf);
                (wasspace=C.i8((Number(C.i32(C.cell((abuf+Number(0)*1),"char").value)==32))));
                /* before mungspaces */
                (op=C.mungspaces(abuf));
                if(Number(!!(C.i32(wasspace)&&Number(!(C.cell((abuf+Number(0)*1),"char").value))))) ;
 else if(Number(!!(Number(!(C.cell((abuf+Number(0)*1),"char").value))||Number(C.i32(C.cell((abuf+Number(0)*1),"char").value)==27)))) (op=tbuf);
 else if(Number(C.i32(C.cell((abuf+Number(0)*1),"char").value)==109)) (use_menu=(C.i8(1)));
                /* one or more spaces will remove old value */
                /* restore */
                /* note: abuf[0]=='a' is already handled via clearing
                   the old value (above) as a default action */
            }
            if(use_menu) {
                if(Number(!!(C.i32(C.field(C.flags,"flag","debug").value)&&Number(!(C.strchr(ocl,C.VENOM_SYM)))))) C.strkitten(ocl,C.i8(C.VENOM_SYM));
                C.choose_classes_menu(C.literal("Autopickup what?"),1,(C.i8(1)),ocl,tbuf);
                (op=tbuf);
            }
        }
        if(negated) {
            bad_negation(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,(C.i8(1)));
            return C.optn_err;
        }
        while(Number(C.i32(C.cell(op,"char").value)==32)) (()=>{const old=op;op=C.ptr((old+Number(1)));return old;})();

        if(Number(!!(Number(C.i32(C.cell(op,"char").value)!=97)&&Number(C.i32(C.cell(op,"char").value)!=65)))) {
            (num=C.u32(0));
            while(C.cell(op,"char").value) {
                (oc_sym=C.def_char_to_objclass(C.cell(op,"char").value));
                /* make sure all are valid obj symbols occurring once */
                if(Number(!!(Number(oc_sym!=C.MAXOCLASSES)&&Number(!(C.strchr(C.field(C.flags,"flag","pickup_types").address,oc_sym)))))) {
                    (C.cell((C.field(C.flags,"flag","pickup_types").address+Number(num)*1),"char").value=C.i8(oc_sym));
                    (C.cell((C.field(C.flags,"flag","pickup_types").address+Number((()=>{const old=num;num=C.u32((old+1));return num;})())*1),"char").value=C.i8(0));
                } else (badopt=(C.i8(1)));
                (()=>{const old=op;op=C.ptr((old+Number(1)));return old;})();
            }
            if(badopt) {
                C.variadic(80,C.literal("Unknown %s parameter '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op);
                return C.optn_err;
            }
        }
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        oc_to_str(C.field(C.flags,"flag","pickup_types").address,ocl);
        C.variadic(81,opts,C.literal("%s"),(C.i32(C.cell((ocl+Number(0)*1),"char").value)?ocl:C.literal("all")));
        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        return handler_pickup_types();
    }
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function optfn_pile_limit(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* pile limit: when walking over objects, number which triggers
           "there are several/many objects here" instead of listing them
         */
        (op=string_for_opt(opts,negated));
        if(Number(!!((Number(!!(C.i32(negated)&&Number(op==C.staticAddress("empty_optstr")))))||(Number(!!(Number(!(negated))&&Number(op!=C.staticAddress("empty_optstr")))))))) (C.field(C.flags,"flag","pile_limit").value=(C.i32(negated)?0:C.atoi(op)));
 else if(negated) {
            bad_negation(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,(C.i8(1)));
            return C.optn_err;
        } else (C.field(C.flags,"flag","pile_limit").value=5);
        /* op == empty_optstr */
        /* sanity check */
        if(Number(C.field(C.flags,"flag","pile_limit").value<0)) (C.field(C.flags,"flag","pile_limit").value=5);
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        C.variadic(82,opts,C.literal("%d"),C.field(C.flags,"flag","pile_limit").value);
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_player_selection(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* WINCAP player_selection: dialog | prompt/prompts/prompting */
        (op=string_for_opt(opts,negated));
        if(Number(!!(Number(op!=C.staticAddress("empty_optstr"))&&Number(!(negated))))) {
            if(Number(!(C.strncmpi(op,C.literal("dialog"),C.i32(C.u64((BigInt((1*7))-C.u64(1)))))))) {
                (C.field(C.iflags,"instance_flags","wc_player_selection").value=0);
            } else if(Number(!(C.strncmpi(op,C.literal("prompt"),C.i32(C.u64((BigInt((1*7))-C.u64(1)))))))) {
                (C.field(C.iflags,"instance_flags","wc_player_selection").value=1);
            } else {
                C.variadic(83,C.literal("Unknown %s parameter '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op);
                return C.optn_err;
            }
        }
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        C.variadic(84,opts,C.literal("%s"),(C.field(C.iflags,"instance_flags","wc_player_selection").value?C.literal("prompts"):C.literal("dialog")));
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_playmode(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* play mode: normal, explore/discovery, or debug/wizard */
        if(Number(!!(C.i32(C.cell(C.staticAddress("duplicate"),"signed char").value)||C.i32(negated)))) return C.optn_err;
        if(Number(op==C.staticAddress("empty_optstr"))) return C.optn_err;
        if(Number(!!(Number(!(C.strncmpi(op,C.literal("normal"),6)))||Number(!(C.strncmpi((op),(C.literal("play")),C.i32((-1)))))))) {
            (C.field(C.flags,"flag","debug").value=(C.field(C.flags,"flag","explore").value=(C.i8(0))));
        } else if(Number(!!(Number(!(C.strncmpi(op,C.literal("explore"),6)))||Number(!(C.strncmpi(op,C.literal("discovery"),6)))))) {
            ((C.field(C.flags,"flag","debug").value=(C.i8(0))),(C.field(C.flags,"flag","explore").value=(C.i8(1))));
        } else if(Number(!!(Number(!(C.strncmpi(op,C.literal("debug"),5)))||Number(!(C.strncmpi(op,C.literal("wizard"),6)))))) {
            ((C.field(C.flags,"flag","debug").value=(C.i8(1))),(C.field(C.flags,"flag","explore").value=(C.i8(0))));
        } else {
            C.variadic(85,C.literal("Invalid value for \"%s\":%s"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op);
            return C.optn_err;
        }
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        C.strcpy(opts,(C.i32(C.field(C.flags,"flag","debug").value)?C.literal("debug"):(C.i32(C.field(C.flags,"flag","explore").value)?C.literal("explore"):C.literal("normal"))));
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_race(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["optfn_race.op",8]]);
    try {
    op=C.local("optfn_race.op","char *",op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* race:string */
        if(Number(!(parse_role_opt(optidx,negated,C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,opts,op.address)))) return C.optn_silenterr;
        if(Number(C.i32(C.cell(op.value,"char").value)!=33)) {
            if(Number(((C.field(C.flags,"flag","initrace").value=C.str2race(op.value)))==(C.i32((-1))))) {
                C.variadic(86,C.literal("Unknown %s '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op.value);
                return C.optn_err;
            }
            (C.field(C.gp,"instance_globals_p","pl_race").value=C.cell(op.value,"char").value);
            /* Backwards compatibility */
            saveoptstr(optidx,(((Number(C.field(C.flags,"flag","initrace").value>=0))?C.field((C.races+Number(C.field(C.flags,"flag","initrace").value)*C.sizes["struct Race"]),"Race","noun").value:((Number(C.field(C.flags,"flag","initrace").value==(C.i32((-2)))))?C.staticAddress("randomrole"):C.staticAddress("none")))));
        }
        return C.optn_ok;
    }
    if(Number(req==C.get_val)) {
        C.variadic(87,opts,C.literal("%s"),(((Number(C.field(C.flags,"flag","initrace").value>=0))?C.field((C.races+Number(C.field(C.flags,"flag","initrace").value)*C.sizes["struct Race"]),"Race","noun").value:((Number(C.field(C.flags,"flag","initrace").value==(C.i32((-2)))))?C.staticAddress("randomrole"):C.staticAddress("none")))));
        return C.optn_ok;
    }
    if(Number(req==C.get_cnf_val)) {
        (op.value=get_cnf_role_opt(optidx));
        C.strcpy(opts,(op.value?op.value:C.literal("none")));
        return C.optn_ok;
    }
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function optfn_roguesymset(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        if(Number(op!=C.staticAddress("empty_optstr"))) {
            if(C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(C.ROGUESET)*C.sizes["struct symsetentry"]),"symsetentry","name").value) (C.free(C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(C.ROGUESET)*C.sizes["struct symsetentry"]),"symsetentry","name").value),(C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(C.ROGUESET)*C.sizes["struct symsetentry"]),"symsetentry","name").value=0));
            (C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(C.ROGUESET)*C.sizes["struct symsetentry"]),"symsetentry","name").value=C.dupstr(op));
            if(Number(!(C.read_sym_file(C.ROGUESET)))) {
                C.clear_symsetentry(C.ROGUESET,(C.i8(1)));
                C.variadic(88,C.literal("Unable to load symbol set \"%s\" from \"%s\""),op,C.literal("symbols"));
                return C.optn_err;
            } else {
                if(Number(!!(Number(!(C.field(C.go,"instance_globals_o","opt_initial").value))&&((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address))))))))) C.assign_graphics(C.ROGUESET);
                (C.field(C.go,"instance_globals_o","opt_need_redraw").value=(C.field(C.go,"instance_globals_o","opt_need_glyph_reset").value=(C.i8(1))));
                (C.field(C.go,"instance_globals_o","opt_symset_changed").value=(C.i8(1)));
            }
        } else return C.optn_err;
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        C.variadic(89,opts,C.literal("%s"),(C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(C.ROGUESET)*C.sizes["struct symsetentry"]),"symsetentry","name").value?C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(C.ROGUESET)*C.sizes["struct symsetentry"]),"symsetentry","name").value:C.literal("default")));
        if(Number(!!(Number(C.field(C.gc,"instance_globals_c","currentgraphics").value==C.ROGUESET)&&C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(C.ROGUESET)*C.sizes["struct symsetentry"]),"symsetentry","name").value))) C.strcat(opts,C.literal(", active"));
        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        return handler_symset(optidx);
    }
    return C.optn_ok;
}

export function optfn_role(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["optfn_role.op",8]]);
    try {
    op=C.local("optfn_role.op","char *",op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* role:string */
        if(Number(!(parse_role_opt(optidx,negated,C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,opts,op.address)))) return C.optn_silenterr;
        if(Number(C.i32(C.cell(op.value,"char").value)!=33)) {
            if(Number(((C.field(C.flags,"flag","initrole").value=C.str2role(op.value)))==(C.i32((-1))))) {
                C.variadic(90,C.literal("Unknown %s '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op.value);
                return C.optn_err;
            }
            nmcpy(C.field(C.svp,"instance_globals_saved_p","pl_character").address,op.value,32);
            /* Backwards compat */
            saveoptstr(optidx,(((Number(C.field(C.flags,"flag","initrole").value>=0))?C.field(C.field((C.roles+Number(C.field(C.flags,"flag","initrole").value)*C.sizes["struct Role"]),"Role","name").address,"RoleName","m").value:((Number(C.field(C.flags,"flag","initrole").value==(C.i32((-2)))))?C.staticAddress("randomrole"):C.staticAddress("none")))));
        }
        return C.optn_ok;
    }
    if(Number(req==C.get_val)) {
        C.variadic(91,opts,C.literal("%s"),(((Number(C.field(C.flags,"flag","initrole").value>=0))?C.field(C.field((C.roles+Number(C.field(C.flags,"flag","initrole").value)*C.sizes["struct Role"]),"Role","name").address,"RoleName","m").value:((Number(C.field(C.flags,"flag","initrole").value==(C.i32((-2)))))?C.staticAddress("randomrole"):C.staticAddress("none")))));
        return C.optn_ok;
    }
    if(Number(req==C.get_cnf_val)) {
        (op.value=get_cnf_role_opt(optidx));
        C.strcpy(opts,(op.value?op.value:C.literal("none")));
        return C.optn_ok;
    }
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function optfn_runmode(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        if(negated) {
            (C.field(C.flags,"flag","runmode").value=C.RUN_TPORT);
        } else if(Number(op!=C.staticAddress("empty_optstr"))) {
            if(C.str_start_is(C.literal("teleport"),op,(C.i8(1)))) (C.field(C.flags,"flag","runmode").value=C.RUN_TPORT);
 else if(C.str_start_is(C.literal("run"),op,(C.i8(1)))) (C.field(C.flags,"flag","runmode").value=C.RUN_LEAP);
 else if(C.str_start_is(C.literal("walk"),op,(C.i8(1)))) (C.field(C.flags,"flag","runmode").value=C.RUN_STEP);
 else if(C.str_start_is(C.literal("crawl"),op,(C.i8(1)))) (C.field(C.flags,"flag","runmode").value=C.RUN_CRAWL);
 else {
                C.variadic(92,C.literal("Unknown %s parameter '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op);
                return C.optn_err;
            }
        } else {
            C.variadic(93,C.literal("Value is mandatory for %s"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value);
            return C.optn_err;
        }
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        C.variadic(94,opts,C.literal("%s"),C.cell((C.staticAddress("runmodes")+Number(C.field(C.flags,"flag","runmode").value)*8),"char *").value);
        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        return handler_runmode();
    }
    return C.optn_ok;
}

export function optfn_scores(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* scores:5t[op] 5a[round] o[wn] */
        if(Number(((op=string_for_opt(opts,(C.i8(0)))))==C.staticAddress("empty_optstr"))) return C.optn_err;
        /* 5.0: earlier versions left old values for unspecified arguments
           if player's scores:foo option only specified some of the three;
           in particular, attempting to use 'scores:own' rather than
           'scores:0 top/0 around/own' didn't work as intended */
        ((C.field(C.flags,"flag","end_top").value=(C.field(C.flags,"flag","end_around").value=0)),(C.field(C.flags,"flag","end_own").value=(C.i8(0))));
        if(negated) (op=C.eos(op));
        while(C.cell(op,"char").value) {
            let inum=1;
            (negated=C.i8(Number(!!((Number(C.i32(C.cell(op,"char").value)==33))||Number(!(C.strncmpi(op,C.literal("no"),2)))))));
            if(negated) (op=C.ptr(op+Number(((Number(C.i32(C.cell(op,"char").value)==33))?1:((Number(C.i32(C.cell((op+Number(2)*1),"char").value)!=45))?2:3)))*1));
            if(C.digit(C.cell(op,"char").value)) {
                (inum=C.atoi(op));
                while(C.digit(C.cell(op,"char").value)) (()=>{const old=op;op=C.ptr((old+Number(1)));return old;})();

            }
            while(Number(C.i32(C.cell(op,"char").value)==32)) (()=>{const old=op;op=C.ptr((old+Number(1)));return old;})();

            switch(C.i32(C.lowc(C.cell(op,"char").value))) {
                case (116):
                    (C.field(C.flags,"flag","end_top").value=(C.i32(negated)?0:inum));
                break;
                case (97):
                    (C.field(C.flags,"flag","end_around").value=(C.i32(negated)?0:inum));
                break;
                case (111):
                    (C.field(C.flags,"flag","end_own").value=C.i8(((Number(!!(C.i32(negated)||Number(!(inum)))))?C.i32((C.i8(0))):C.i32((C.i8(1))))));
                break;
                case (110):
                    /* none */
                    ((C.field(C.flags,"flag","end_top").value=(C.field(C.flags,"flag","end_around").value=0)),(C.field(C.flags,"flag","end_own").value=(C.i8(0))));
                break;
                case (45):
                    if(C.digit(C.cell(((op+Number(1)*1)),"char").value)) {
                        C.variadic(95,C.literal("Values for %s:top and %s:around must not be negative"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value);
                        return C.optn_silenterr;
                    }
                ;
                /*FALLTHRU*/
                default:
                    C.variadic(96,C.literal("Unknown %s parameter '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op);
                return C.optn_silenterr;
            }
            /* "3a" is sufficient but accept "3around" (or "3abracadabra") */
            while(C.letter(C.cell(op,"char").value)) (()=>{const old=op;op=C.ptr((old+Number(1)));return old;})();

            /* t, a, and o can be separated by space(s) or slash or both */
            while(Number(C.i32(C.cell(op,"char").value)==32)) (()=>{const old=op;op=C.ptr((old+Number(1)));return old;})();

            if(Number(C.i32(C.cell(op,"char").value)==47)) (()=>{const old=op;op=C.ptr((old+Number(1)));return old;})();
        }
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        (C.cell(opts,"char").value=C.i8(0));
        if(Number(C.field(C.flags,"flag","end_top").value>0)) C.variadic(97,opts,C.literal("%d top"),C.field(C.flags,"flag","end_top").value);
        if(Number(C.field(C.flags,"flag","end_around").value>0)) C.variadic(98,C.eos(opts),C.literal("%s%d around"),((Number(C.field(C.flags,"flag","end_top").value>0))?C.literal("/"):C.literal("")),C.field(C.flags,"flag","end_around").value);
        if(C.field(C.flags,"flag","end_own").value) C.variadic(99,C.eos(opts),C.literal("%sown"),((Number(!!(Number(C.field(C.flags,"flag","end_top").value>0)||Number(C.field(C.flags,"flag","end_around").value>0))))?C.literal("/"):C.literal("")));
        if(Number(!(C.cell(opts,"char").value))) C.strcpy(opts,C.literal("none"));
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_scroll_amount(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* WINCAP scroll_amount:nn */
        (op=string_for_opt(opts,negated));
        if(Number(!!((Number(!!(C.i32(negated)&&Number(op==C.staticAddress("empty_optstr")))))||(Number(!!(Number(!(negated))&&Number(op!=C.staticAddress("empty_optstr")))))))) {
            (C.field(C.iflags,"instance_flags","wc_scroll_amount").value=(C.i32(negated)?1:C.atoi(op)));
        } else if(negated) {
            bad_negation(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,(C.i8(1)));
            return C.optn_err;
        }
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        if(C.field(C.iflags,"instance_flags","wc_scroll_amount").value) C.variadic(100,opts,C.literal("%d"),C.field(C.iflags,"instance_flags","wc_scroll_amount").value);
 else C.strcpy(opts,C.staticAddress("defopt"));
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_scroll_margin(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* WINCAP scroll_margin:nn */
        (op=string_for_opt(opts,negated));
        if(Number(!!((Number(!!(C.i32(negated)&&Number(op==C.staticAddress("empty_optstr")))))||(Number(!!(Number(!(negated))&&Number(op!=C.staticAddress("empty_optstr")))))))) {
            (C.field(C.iflags,"instance_flags","wc_scroll_margin").value=(C.i32(negated)?5:C.atoi(op)));
        } else if(negated) {
            bad_negation(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,(C.i8(1)));
            return C.optn_err;
        }
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        if(C.field(C.iflags,"instance_flags","wc_scroll_margin").value) C.variadic(101,opts,C.literal("%d"),C.field(C.iflags,"instance_flags","wc_scroll_margin").value);
 else C.strcpy(opts,C.staticAddress("defopt"));
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_soundlib(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["optfn_soundlib.soundlibbuf",(1*16)]]);
    try {
    let soundlibbuf=C.automatic("optfn_soundlib.soundlibbuf",(1*16));
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /*
         * soundlib:  option to choose the interface for binaries built
         * with support for more than the default interface (nosound).
         *
         * Option processing sets gc.chosen_soundlib. A later call
         * to activate_chosen_soundlib() actually activates it, and
         * sets gc.active_soundlib.
         */
        if(Number(((op=string_for_env_opt(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,opts,(C.i8(0)))))!=C.staticAddress("empty_optstr"))) {
            let option_id;
            C.get_soundlib_name(soundlibbuf,16);
            (option_id=C.soundlib_id_from_opt(op));
            (C.field(C.gc,"instance_globals_c","chosen_soundlib").value=option_id);
            C.assign_soundlib(C.i32(C.field(C.gc,"instance_globals_c","chosen_soundlib").value));
        } else return C.optn_err;
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        C.get_soundlib_name(soundlibbuf,16);
        C.variadic(102,opts,C.literal("%s"),soundlibbuf);
        return C.optn_ok;
    }
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function optfn_sortdiscoveries(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        (C.field(C.flags,"flag","discosort").value=C.i8(111));
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        (op=string_for_env_opt(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,opts,(C.i8(0))));
        if(negated) {
            (C.field(C.flags,"flag","discosort").value=C.i8(111));
        } else if(Number(op!=C.staticAddress("empty_optstr"))) {
            switch(C.i32(C.lowc(C.cell(op,"char").value))) {
                case (48):
                    case (111):
                        /* order of discovery */
                        (C.field(C.flags,"flag","discosort").value=C.i8(111));
                break;
                case (49):
                    case (115):
                        /* sortloot order (subclasses for some classes) */
                        (C.field(C.flags,"flag","discosort").value=C.i8(115));
                break;
                case (50):
                    case (99):
                        /* alphabetical within each class */
                        (C.field(C.flags,"flag","discosort").value=C.i8(99));
                break;
                case (51):
                    case (97):
                        /* alphabetical across all classes */
                        (C.field(C.flags,"flag","discosort").value=C.i8(97));
                break;
                default:
                    C.variadic(103,C.literal("Unknown %s parameter '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op);
                return C.optn_silenterr;
            }
        } else return C.optn_err;
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        C.get_sortdisco(opts,C.i8(((Number(req==C.get_cnf_val))?C.i32((C.i8(1))):C.i32((C.i8(0))))));
        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        /* return handler_sortdiscoveries(); */
        C.choose_disco_sort(0);
        /* o_init.c */
    }
    return C.optn_ok;
}

export function optfn_sortloot(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    let i;
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        (op=string_for_env_opt(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,opts,(C.i8(0))));
        if(Number(op!=C.staticAddress("empty_optstr"))) {
            let c=C.lowc(C.cell(op,"char").value);
            switch(C.i32(c)) {
                case (110):
                    /* none */
                    case (108):
                        /* loot (pickup) */
                        case (102):
                            /* full (pickup + invent) */
                            (C.field(C.flags,"flag","sortloot").value=c);
                break;
                default:
                    C.variadic(104,C.literal("Unknown %s parameter '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op);
                return C.optn_err;
            }
        } else return C.optn_err;
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        for((i=0);Number(i<C.i32((C.u64((BigInt((8*3))/BigInt(8))))));(()=>{const old=i;i=C.i32((old+1));return old;})()) if(Number(C.i32(C.field(C.flags,"flag","sortloot").value)==C.i32(C.cell((C.cell((C.staticAddress("sortltype")+Number(i)*8),"char *").value+Number(0)*1),"char").value))) {
            C.strcpy(opts,C.cell((C.staticAddress("sortltype")+Number(i)*8),"char *").value);
            break;
        }

        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        return handler_sortloot();
    }
    return C.optn_ok;
}

export function optfn_sortvanquished(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    
    /* insight.c */
    
    let optname=C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value;
    if(Number(req==C.do_init)) {
        (C.field(C.flags,"flag","vanq_sortmode").value=C.u8(C.VANQ_MLVL_MNDX));
        /* 0 => 't' */
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        (op=string_for_env_opt(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,opts,(C.i8(0))));
        if(negated) {
            (C.field(C.flags,"flag","vanq_sortmode").value=C.u8(C.VANQ_MLVL_MNDX));
            /* 0 => 't' */
        } else if(Number(op!=C.staticAddress("empty_optstr"))) {
            let p;
            let vndx=0;
            if(Number(((p=C.strchr(C.staticAddress("optfn_sortvanquished.vanqmodes"),C.i32(C.cell(op,"char").value))))!=0)) {
                (vndx=C.i32((C.i64(((p-C.staticAddress("optfn_sortvanquished.vanqmodes"))/1)))));
            } else if(C.strchr(C.literal("01234567"),C.i32(C.cell(op,"char").value))) {
                (vndx=C.i32((C.i32(C.cell(op,"char").value)-48)));
            } else {
                C.variadic(105,C.literal("Unknown %s parameter '%s'"),optname,op);
                return C.optn_silenterr;
            }
            (C.field(C.flags,"flag","vanq_sortmode").value=C.u8(vndx));
        } else return C.optn_err;
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        C.strcpy(opts,C.cell(((C.vanqorders+Number(C.field(C.flags,"flag","vanq_sortmode").value)*(8*3))+Number(0)*8),"char *").value);
        if(Number(req==C.get_val)) C.variadic(106,C.eos(opts),C.literal(": %s"),C.cell(((C.vanqorders+Number(C.field(C.flags,"flag","vanq_sortmode").value)*(8*3))+Number(1)*8),"char *").value);
        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        let prev_sortmode=C.field(C.flags,"flag","vanq_sortmode").value;
        /* return handler_sortvanquished(); */
        C.set_vanq_order((C.i8(1)));
        /* insight.c */
        C.variadic(107,C.literal("'%s' %s \"%s: %s\"."),optname,((Number(C.i32(C.field(C.flags,"flag","vanq_sortmode").value)==C.i32(prev_sortmode)))?C.literal("not changed, still"):C.literal("changed to")),C.cell(((C.vanqorders+Number(C.field(C.flags,"flag","vanq_sortmode").value)*(8*3))+Number(0)*8),"char *").value,C.cell(((C.vanqorders+Number(C.field(C.flags,"flag","vanq_sortmode").value)*(8*3))+Number(1)*8),"char *").value);
    }
    return C.optn_ok;
}

export function optfn_statushilites(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* control over whether highlights should be displayed (non-zero), and
           also for how long to show temporary ones (N turns; default 3) */
        if(negated) {
            (C.field(C.iflags,"instance_flags","hilite_delta").value=0n);
        } else {
            (op=string_for_opt(opts,(C.i8(1))));
            (C.field(C.iflags,"instance_flags","hilite_delta").value=((Number(!!(Number(op==C.staticAddress("empty_optstr"))||Number(!(C.cell(op,"char").value)))))?3n:C.atol(op)));
            if(Number(C.field(C.iflags,"instance_flags","hilite_delta").value<0n)) (C.field(C.iflags,"instance_flags","hilite_delta").value=1n);
        }
        if(Number(!(C.field(C.go,"instance_globals_o","opt_from_file").value))) C.reset_status_hilites();
        return C.optn_ok;
    }
    if(Number(req==C.get_val)) {
        if(Number(!(C.field(C.iflags,"instance_flags","hilite_delta").value))) C.strcpy(opts,C.literal("0 (off: don't highlight status fields)"));
 else C.variadic(108,opts,C.literal("%ld (on: highlight status for %ld turns)"),C.field(C.iflags,"instance_flags","hilite_delta").value,C.field(C.iflags,"instance_flags","hilite_delta").value);
        return C.optn_ok;
    }
    if(Number(req==C.get_cnf_val)) {
        C.variadic(109,opts,C.literal("%ld"),C.field(C.iflags,"instance_flags","hilite_delta").value);
    }
    return C.optn_ok;
}

export function optfn_statuslines(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    let retval=C.optn_ok; let itmp=0;
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* WINCAP2
         * statuslines:n */
        (op=string_for_opt(opts,negated));
        if(negated) {
            bad_negation(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,(C.i8(1)));
            (itmp=2);
            (retval=C.optn_err);
        } else if(Number(op!=C.staticAddress("empty_optstr"))) {
            (itmp=C.atoi(op));
        }
        if(Number(!!(Number(itmp<2)||Number(itmp>3)))) {
            C.variadic(110,C.literal("'%s:%s' is invalid; must be 2 or 3"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op);
            (retval=C.optn_silenterr);
        } else {
            (C.field(C.iflags,"instance_flags","wc2_statuslines").value=itmp);
            if(Number(!(C.field(C.go,"instance_globals_o","opt_initial").value))) (C.field(C.go,"instance_globals_o","opt_need_redraw").value=(C.i8(1)));
        }
        return retval;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        if(wc2_supported(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value)) C.strcpy(opts,((Number(C.field(C.iflags,"instance_flags","wc2_statuslines").value<3))?C.literal("2"):C.literal("3")));
 else C.strcpy(opts,C.literal("unknown"));
        return C.optn_ok;
    }
    return C.optn_ok;
}

/* WIN32CON */
export function optfn_suppress_alert(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        if(negated) {
            bad_negation(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,(C.i8(0)));
            return C.optn_err;
        } else if(Number(op!=C.staticAddress("empty_optstr"))) feature_alert_opts(op,C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value);
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        if(Number(!!(Number(req==C.get_cnf_val)&&Number(C.field(C.flags,"flag","suppress_alert").value==C.u64(0n))))) (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
 else if(Number(C.field(C.flags,"flag","suppress_alert").value==C.u64(0n))) C.strcpy(opts,C.staticAddress("none"));
 else C.variadic(111,opts,C.literal("%lu.%lu.%lu"),(C.u64((C.field(C.flags,"flag","suppress_alert").value>>BigInt(24)))),(C.u64((((C.u64((C.u64(16711680n)&C.field(C.flags,"flag","suppress_alert").value))))>>BigInt(16)))),(C.u64((((C.u64((C.u64(65280n)&C.field(C.flags,"flag","suppress_alert").value))))>>BigInt(8)))));
        return C.optn_ok;
    }
    return C.optn_ok;
}

/* symbols.c */
/* symbols.c */
export function optfn_symset(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        if(Number(op!=C.staticAddress("empty_optstr"))) {
            if(C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(C.PRIMARYSET)*C.sizes["struct symsetentry"]),"symsetentry","name").value) (C.free(C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(C.PRIMARYSET)*C.sizes["struct symsetentry"]),"symsetentry","name").value),(C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(C.PRIMARYSET)*C.sizes["struct symsetentry"]),"symsetentry","name").value=0));
            (C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(C.PRIMARYSET)*C.sizes["struct symsetentry"]),"symsetentry","name").value=C.dupstr(op));
            if(Number(!(C.read_sym_file(C.PRIMARYSET)))) {
                C.clear_symsetentry(C.PRIMARYSET,(C.i8(1)));
                C.variadic(112,C.literal("Unable to load symbol set \"%s\" from \"%s\""),op,C.literal("symbols"));
                return C.optn_err;
            } else {
                if(C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(C.PRIMARYSET)*C.sizes["struct symsetentry"]),"symsetentry","handling").value) {
                }
                C.switch_symbols(Number(C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(C.PRIMARYSET)*C.sizes["struct symsetentry"]),"symsetentry","name").value!=0));
                (C.field(C.go,"instance_globals_o","opt_need_redraw").value=(C.field(C.go,"instance_globals_o","opt_need_glyph_reset").value=(C.i8(1))));
                (C.field(C.go,"instance_globals_o","opt_symset_changed").value=(C.i8(1)));
            }
        } else return C.optn_err;
        return C.optn_ok;
    }
    if(Number(req==C.get_val)) {
        C.variadic(113,opts,C.literal("%s"),(C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(C.PRIMARYSET)*C.sizes["struct symsetentry"]),"symsetentry","name").value?C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(C.PRIMARYSET)*C.sizes["struct symsetentry"]),"symsetentry","name").value:C.literal("default")));
        if(Number(!!(Number(C.field(C.gc,"instance_globals_c","currentgraphics").value==C.PRIMARYSET)&&C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(C.PRIMARYSET)*C.sizes["struct symsetentry"]),"symsetentry","name").value))) C.strcat(opts,C.literal(", active"));
        if(C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(C.PRIMARYSET)*C.sizes["struct symsetentry"]),"symsetentry","handling").value) {
            C.variadic(114,C.eos(opts),C.literal(", handler=%s"),C.cell((C.known_handling+Number(C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(C.PRIMARYSET)*C.sizes["struct symsetentry"]),"symsetentry","handling").value)*8),"char *").value);
        }
        return C.optn_ok;
    }
    if(Number(req==C.get_cnf_val)) {
        C.variadic(115,opts,C.literal("%s"),(C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(C.PRIMARYSET)*C.sizes["struct symsetentry"]),"symsetentry","name").value?C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(C.PRIMARYSET)*C.sizes["struct symsetentry"]),"symsetentry","name").value:C.literal("default")));
        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        let reslt;
        if(Number(!(C.glyphid_cache_status()))) C.fill_glyphid_cache();
        (reslt=handler_symset(optidx));
        if(C.glyphid_cache_status()) C.free_glyphid_cache();
        /* apply_customizations(gc.currentgraphics,
                        (do_custom_colors | do_custom_symbols)); */
        return reslt;
    }
    return C.optn_ok;
}

export function optfn_term_cols(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    let retval=C.optn_ok;
    let ltmp;
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* WINCAP2
         * term_cols:amount */
        if(Number(((op=string_for_opt(opts,negated)))!=C.staticAddress("empty_optstr"))) {
            (ltmp=C.atol(op));
            /* just checks atol() sanity, not logical window size sanity
             */
            if(Number(!!(Number(ltmp<=0n)||Number(ltmp>=C.i64(32767))))) {
                C.variadic(116,C.literal("Invalid %s: %ld"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,ltmp);
                (retval=C.optn_err);
            } else {
                (C.field(C.iflags,"instance_flags","wc2_term_cols").value=C.i32(ltmp));
            }
        }
        return retval;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        if(C.field(C.iflags,"instance_flags","wc2_term_cols").value) C.variadic(117,opts,C.literal("%d"),C.field(C.iflags,"instance_flags","wc2_term_cols").value);
 else if(Number(req==C.get_cnf_val)) (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
 else C.strcpy(opts,C.staticAddress("defopt"));
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_term_rows(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    let retval=C.optn_ok;
    let ltmp;
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* WINCAP2
         * term_rows:amount */
        if(Number(((op=string_for_opt(opts,negated)))!=C.staticAddress("empty_optstr"))) {
            (ltmp=C.atol(op));
            /* just checks atol() sanity, not logical window size sanity
             */
            if(Number(!!(Number(ltmp<=0n)||Number(ltmp>=C.i64(32767))))) {
                C.variadic(118,C.literal("Invalid %s: %ld"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,ltmp);
                (retval=C.optn_err);
            } else {
                (C.field(C.iflags,"instance_flags","wc2_term_rows").value=C.i32(ltmp));
            }
        }
        return retval;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        if(C.field(C.iflags,"instance_flags","wc2_term_rows").value) C.variadic(119,opts,C.literal("%d"),C.field(C.iflags,"instance_flags","wc2_term_rows").value);
 else if(Number(req==C.get_cnf_val)) (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
 else C.strcpy(opts,C.staticAddress("defopt"));
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_tile_file(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* WINCAP tile_file:name */
        if(Number(op!=C.staticAddress("empty_optstr"))) {
            if(C.field(C.iflags,"instance_flags","wc_tile_file").value) C.free(C.field(C.iflags,"instance_flags","wc_tile_file").value);
            (C.field(C.iflags,"instance_flags","wc_tile_file").value=C.dupstr(op));
        } else return C.optn_err;
        return C.optn_ok;
    }
    if(Number(req==C.get_val)) {
        C.variadic(120,opts,C.literal("%s"),(C.field(C.iflags,"instance_flags","wc_tile_file").value?C.field(C.iflags,"instance_flags","wc_tile_file").value:C.staticAddress("defopt")));
        return C.optn_ok;
    }
    if(Number(req==C.get_cnf_val)) {
        if(C.field(C.iflags,"instance_flags","wc_tile_file").value) C.variadic(121,opts,C.literal("%s"),C.field(C.iflags,"instance_flags","wc_tile_file").value);
 else (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_tile_height(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* WINCAP tile_height:nn */
        (op=string_for_opt(opts,negated));
        if(Number(!!((Number(!!(C.i32(negated)&&Number(op==C.staticAddress("empty_optstr")))))||(Number(!!(Number(!(negated))&&Number(op!=C.staticAddress("empty_optstr")))))))) {
            (C.field(C.iflags,"instance_flags","wc_tile_height").value=(C.i32(negated)?0:C.atoi(op)));
        } else if(negated) {
            bad_negation(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,(C.i8(1)));
            return C.optn_err;
        }
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        if(C.field(C.iflags,"instance_flags","wc_tile_height").value) C.variadic(122,opts,C.literal("%d"),C.field(C.iflags,"instance_flags","wc_tile_height").value);
 else if(Number(req==C.get_cnf_val)) (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
 else C.strcpy(opts,C.staticAddress("defopt"));
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_tile_width(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* WINCAP tile_width:nn */
        (op=string_for_opt(opts,negated));
        if(Number(!!((Number(!!(C.i32(negated)&&Number(op==C.staticAddress("empty_optstr")))))||(Number(!!(Number(!(negated))&&Number(op!=C.staticAddress("empty_optstr")))))))) {
            (C.field(C.iflags,"instance_flags","wc_tile_width").value=(C.i32(negated)?0:C.atoi(op)));
        } else if(negated) {
            bad_negation(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,(C.i8(1)));
            return C.optn_err;
        }
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        if(C.field(C.iflags,"instance_flags","wc_tile_width").value) C.variadic(123,opts,C.literal("%d"),C.field(C.iflags,"instance_flags","wc_tile_width").value);
 else if(Number(req==C.get_cnf_val)) (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
 else C.strcpy(opts,C.staticAddress("defopt"));
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_traps(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        return C.optn_ok;
    }
    if(Number(req==C.get_val)) {
        C.variadic(124,opts,C.literal("%s"),C.staticAddress("to_be_done"));
        return C.optn_ok;
    }
    if(Number(req==C.get_cnf_val)) {
        (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_vary_msgcount(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* WINCAP vary_msgcount:nn */
        (op=string_for_opt(opts,negated));
        if(Number(!!((Number(!!(C.i32(negated)&&Number(op==C.staticAddress("empty_optstr")))))||(Number(!!(Number(!(negated))&&Number(op!=C.staticAddress("empty_optstr")))))))) {
            (C.field(C.iflags,"instance_flags","wc_vary_msgcount").value=(C.i32(negated)?0:C.atoi(op)));
        } else if(negated) {
            bad_negation(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,(C.i8(1)));
            return C.optn_err;
        }
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        if(C.field(C.iflags,"instance_flags","wc_vary_msgcount").value) C.variadic(125,opts,C.literal("%d"),C.field(C.iflags,"instance_flags","wc_vary_msgcount").value);
 else if(Number(req==C.get_cnf_val)) (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
 else C.strcpy(opts,C.staticAddress("defopt"));
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_versinfo(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["optfn_versinfo.vbuf",(1*128)]]);
    try {
    let optname=C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value;
    let vi=C.field(C.flags,"flag","versinfo").value;
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* versinfo: what to include when 'showvers' displays version
           on status lines; bitmask with up to three bits:
           (1) x.y.z number, (2) program name, (4) git branch if available.
           If branch is requested but unavailable, status_version will
           treat 4 as 1.
         */
        let have_branch=C.i8((Number(!!(C.field(C.nomakedefs,"nomakedefs_s","git_branch").value&&C.i32(C.cell(C.field(C.nomakedefs,"nomakedefs_s","git_branch").value,"char").value)))));
        let val; let dflt=(C.i32(have_branch)?4:1);
        if(negated) {
            bad_negation(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,(C.i8(1)));
            return C.optn_silenterr;
        }
        (op=string_for_opt(opts,(C.i8(0))));
        if(Number(op==C.staticAddress("empty_optstr"))) {
            C.variadic(126,C.literal("'%s' requires a value; defaulting to %d"),optname,dflt);
            return C.optn_silenterr;
        }
        (val=C.atoi(op));
        if(Number(!!(Number(!(val))||Number((C.i32((val&C.i32((~7)))))!=0)))) {
            C.variadic(127,C.literal("'%s' must be one of 1, 2, 4, or the sum of two or all three of those"),optname);
            return C.optn_silenterr;
        }
        (C.field(C.flags,"flag","versinfo").value=C.u32(val));
    } else if(Number(req==C.do_handler)) {
        /* return handler_versinfo(); */
        handler_versinfo();
        C.variadic(128,C.literal("'%s' %s %u."),optname,((Number(C.field(C.flags,"flag","versinfo").value==vi))?C.literal("not changed, still"):C.literal("changed to")),C.field(C.flags,"flag","versinfo").value);
    } else if(Number(req==C.get_val)) {
        let vbuf=C.automatic("optfn_versinfo.vbuf",(1*128));
        let g=C.i8(Number((C.u32((vi&C.u32(2))))!=C.u32(0))); let b=C.i8(Number((C.u32((vi&C.u32(4))))!=C.u32(0))); let n=C.i8(Number((C.u32((vi&C.u32(1))))!=C.u32(0)));
        C.variadic(129,opts,C.literal("%u: %s%s%s%s%s (%.99s)"),C.field(C.flags,"flag","versinfo").value,(C.i32(g)?C.literal("name"):C.literal("")),((Number(!!(C.i32(b)&&C.i32(g))))?C.literal("+"):C.literal("")),(C.i32(b)?C.literal("branch"):C.literal("")),((Number(!!(C.i32(n)&&(Number(!!(C.i32(b)||C.i32(g)))))))?C.literal("+"):C.literal("")),(C.i32(n)?C.literal("number"):C.literal("")),C.status_version(vbuf,BigInt((1*128)),(C.i8(0))));
    } else if(Number(req==C.get_cnf_val)) {
        C.variadic(130,opts,C.literal("%u"),C.field(C.flags,"flag","versinfo").value);
    }
    if(Number(!!(Number(C.field(C.flags,"flag","versinfo").value!=vi)&&Number(!(C.field(C.go,"instance_globals_o","opt_initial").value))))) (C.field(C.go,"instance_globals_o","opt_need_redraw").value=(C.i8(1)));
    /* context.botlx = TRUE ought to suffice
                                    * but doesn't for X11 fancy status */
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* videocolors:string */
/* videoshades:string */
/* VIDEOSHADES */
/* video:string */
/* NO_TERMS */
/* MSDOS */
export function optfn_warnings(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    let reslt;
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        (reslt=C.i32(warning_opts(opts,C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value)));
        return (reslt?C.optn_ok:C.optn_err);
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_whatis_coord(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        if(negated) {
            (C.field(C.iflags,"instance_flags","getpos_coords").value=110);
            return C.optn_ok;
        } else if(Number(((op=string_for_env_opt(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,opts,(C.i8(0)))))!=C.staticAddress("empty_optstr"))) {
            
            let c=C.lowc(C.cell(op,"char").value);
            if(Number(!!(C.i32(c)&&C.strchr(C.staticAddress("optfn_whatis_coord.gpcoords"),C.i32(c))))) (C.field(C.iflags,"instance_flags","getpos_coords").value=C.i32(c));
 else {
                C.variadic(131,C.literal("Unknown %s parameter '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op);
                return C.optn_err;
            }
        } else return C.optn_err;
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        C.variadic(132,opts,C.literal("%s"),((Number(C.field(C.iflags,"instance_flags","getpos_coords").value==109))?C.literal("map"):((Number(C.field(C.iflags,"instance_flags","getpos_coords").value==99))?C.literal("compass"):((Number(C.field(C.iflags,"instance_flags","getpos_coords").value==102))?C.literal("full compass"):((Number(C.field(C.iflags,"instance_flags","getpos_coords").value==115))?C.literal("screen"):C.literal("none"))))));
        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        return handler_whatis_coord();
    }
    return C.optn_ok;
}

export function optfn_whatis_filter(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        if(negated) {
            (C.field(C.iflags,"instance_flags","getloc_filter").value=C.GFILTER_NONE);
            return C.optn_ok;
        } else if(Number(((op=string_for_env_opt(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,opts,(C.i8(0)))))!=C.staticAddress("empty_optstr"))) {
            let c=C.lowc(C.cell(op,"char").value);
            switch(C.i32(c)) {
                case (110):
                    (C.field(C.iflags,"instance_flags","getloc_filter").value=C.GFILTER_NONE);
                break;
                case (118):
                    (C.field(C.iflags,"instance_flags","getloc_filter").value=C.GFILTER_VIEW);
                break;
                case (97):
                    (C.field(C.iflags,"instance_flags","getloc_filter").value=C.GFILTER_AREA);
                break;
                default:
{
                        C.variadic(133,C.literal("Unknown %s parameter '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op);
                        return C.optn_err;
                    }            }
        } else return C.optn_err;
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        C.variadic(134,opts,C.literal("%s"),((Number(C.field(C.iflags,"instance_flags","getloc_filter").value==C.GFILTER_VIEW))?C.literal("view"):((Number(C.field(C.iflags,"instance_flags","getloc_filter").value==C.GFILTER_AREA))?C.literal("area"):C.literal("none"))));
        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        return handler_whatis_filter();
    }
    return C.optn_ok;
}

export function optfn_windowborders(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    let retval=C.optn_ok;
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        (op=string_for_opt(opts,negated));
        if(Number(!!(C.i32(negated)&&Number(op!=C.staticAddress("empty_optstr"))))) {
            bad_negation(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,(C.i8(1)));
            (retval=C.optn_err);
        } else {
            let itmp;
            if(negated) (itmp=0);
 else if(Number(op==C.staticAddress("empty_optstr"))) (itmp=1);
 else (itmp=C.atoi(op));
            /* Off */
            /* On */
            /* Value supplied; expect 0 (off), 1 (on), 2 (auto)
                  * or 3 (on for most windows, off for perm_invent)
                  * or 4 (auto for most windows, off for perm_invent) */
            if(Number(!!(Number(itmp<0)||Number(itmp>4)))) {
                C.variadic(135,C.literal("Invalid %s (should be within 0 to 4): %s"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,opts);
                (retval=C.optn_silenterr);
            } else {
                (C.field(C.iflags,"instance_flags","wc2_windowborders").value=itmp);
            }
        }
        return retval;
    }
    if(Number(req==C.get_val)) {
        C.variadic(136,opts,C.literal("%s"),((Number(C.field(C.iflags,"instance_flags","wc2_windowborders").value==0))?C.literal("0=off"):((Number(C.field(C.iflags,"instance_flags","wc2_windowborders").value==1))?C.literal("1=on"):((Number(C.field(C.iflags,"instance_flags","wc2_windowborders").value==2))?C.literal("2=auto"):((Number(C.field(C.iflags,"instance_flags","wc2_windowborders").value==3))?C.literal("3=on, except off for perm_invent"):((Number(C.field(C.iflags,"instance_flags","wc2_windowborders").value==4))?C.literal("4=auto, except off for perm_invent"):C.staticAddress("defopt")))))));
        return C.optn_ok;
    }
    if(Number(req==C.get_cnf_val)) {
        C.variadic(137,opts,C.literal("%i"),C.field(C.iflags,"instance_flags","wc2_windowborders").value);
        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        return handler_windowborders();
    }
    return C.optn_ok;
}

/* Win GUI and curses */
export function optfn_windowcolors(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    let wccount;
    if(Number(req==C.do_init)) {
        for((wccount=0);Number(wccount<C.WC_COUNT);(()=>{const old=wccount;wccount=C.i32((old+1));return wccount;})()) {
            (C.cell((C.wcolors_opt+Number(wccount)*4),"int").value=0);
        }
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* WINCAP
         * setting window colors
         * syntax: windowcolors=menu foregrnd/backgrnd text foregrnd/backgrnd
         */
        if(Number(((op=string_for_opt(opts,(C.i8(0)))))!=C.staticAddress("empty_optstr"))) {
            if(Number(!(wc_set_window_colors(op)))) {
                C.variadic(138,C.literal("Could not set %s '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,op);
                return C.optn_err;
            }
        }
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        let fg; let bg;
        /* TODO: wide 'get_val' may need to be wrapped in the menu display */
        (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
        for((wccount=0);Number(wccount<C.WC_COUNT);(()=>{const old=wccount;wccount=C.i32((old+1));return wccount;})()) {
            (fg=C.field((C.field(C.iflags,"instance_flags","wcolors").address+Number(wccount)*C.sizes["struct windowcolors_struct"]),"windowcolors_struct","fg").value);
            (bg=C.field((C.field(C.iflags,"instance_flags","wcolors").address+Number(wccount)*C.sizes["struct windowcolors_struct"]),"windowcolors_struct","bg").value);
            if(Number(!!(fg&&(Number(!!(Number(!(C.cell(fg,"char").value))||Number(!(C.strcmp(fg,C.staticAddress("defbrief")))))))))) (fg=0);
            if(Number(!!(bg&&(Number(!!(Number(!(C.cell(bg,"char").value))||Number(!(C.strcmp(bg,C.staticAddress("defbrief")))))))))) (bg=0);
            C.variadic(139,C.eos(opts),C.literal("%s%s %s/%s"),(Number(!(wccount))?C.literal(""):C.literal(" ")),((Number(!!(fg||bg)))?C.cell((C.staticAddress("wcnames")+Number(wccount)*8),"char *").value:C.cell((C.staticAddress("wcshortnames")+Number(wccount)*8),"char *").value),(fg?fg:C.staticAddress("defbrief")),(bg?bg:C.staticAddress("defbrief")));
        }
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_windowtype(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /*
         * windowtype:  option to choose the interface for binaries built
         * with support for more than one interface (tty + X11, for
         * instance).
         *
         * Ideally, 'windowtype' should be processed first, because it
         * causes the wc_ and wc2_ flags to be set up.
         * For user, making it be first in a config file is trivial, use
         * OPTIONS=windowtype:Foo
         * as the first non-comment line of the file.
         * Making it first in NETHACKOPTIONS requires it to be at the
         * _end_ because comma-separated option strings are processed from
         * right to left.
         */
        if(Number(!(C.field(C.iflags,"instance_flags","window_inited").value))) {
            if(C.field(C.iflags,"instance_flags","windowtype_locked").value) return C.optn_ok;
            if(Number(((op=string_for_env_opt(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,opts,(C.i8(0)))))!=C.staticAddress("empty_optstr"))) {
                nmcpy(C.field(C.gc,"instance_globals_c","chosen_windowtype").address,op,16);
                if(Number(!(C.field(C.iflags,"instance_flags","windowtype_deferred").value))) {
                    C.choose_windows(C.field(C.gc,"instance_globals_c","chosen_windowtype").address);
                }
            } else {
                return C.optn_err;
            }
        }
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        C.variadic(140,opts,C.literal("%s"),C.field(C.windowprocs,"window_procs","name").value);
        return C.optn_ok;
    }
    return C.optn_ok;
}

/*
 *    Prefix-handling functions
 */
export function pfxfn_cond_(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        C.condopt(0,0,C.i8(0));
        /* make the choices match defaults */
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        let reslt=C.parse_cond_option(negated,opts);
        switch(reslt) {
            case (0):
                (C.cell((C.staticAddress("opt_set_in_config")+Number(C.pfx_cond_)*1),"signed char").value=(C.i8(1)));
            break;
            case (3):
                C.variadic(141,C.literal("Ambiguous condition option %s"),opts);
            break;
            case (1):
                case (2):
                    default:
                        C.variadic(142,C.literal("Unknown condition option %s (%d)"),opts,reslt);
            break;
        }
        if(Number(reslt!=0)) return C.optn_err;
        /* [FIXME?  redraw seems like overkill; botl update should suffice] */
        (C.field(C.go,"instance_globals_o","opt_need_redraw").value=(C.i8(1)));
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        /* not used */
        C.cond_menu();
        /* in botl.c */
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function pfxfn_font(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    let opttype=C.i32((-1));
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        /* WINCAP setting font options  */
        if(Number(optidx==C.opt_font_map)) (opttype=C.MAP_OPTION);
 else if(Number(optidx==C.opt_font_message)) (opttype=C.MESSAGE_OPTION);
 else if(Number(optidx==C.opt_font_text)) (opttype=C.TEXT_OPTION);
 else if(Number(optidx==C.opt_font_menu)) (opttype=C.MENU_OPTION);
 else if(Number(optidx==C.opt_font_status)) (opttype=C.STATUS_OPTION);
 else if(Number(!!(Number(!!(Number(!!(Number(!!(Number(optidx==C.opt_font_size_map)||Number(optidx==C.opt_font_size_message)))||Number(optidx==C.opt_font_size_text)))||Number(optidx==C.opt_font_size_menu)))||Number(optidx==C.opt_font_size_status)))) {
            if(Number(optidx==C.opt_font_size_map)) (opttype=C.MAP_OPTION);
 else if(Number(optidx==C.opt_font_size_message)) (opttype=C.MESSAGE_OPTION);
 else if(Number(optidx==C.opt_font_size_text)) (opttype=C.TEXT_OPTION);
 else if(Number(optidx==C.opt_font_size_menu)) (opttype=C.MENU_OPTION);
 else if(Number(optidx==C.opt_font_size_status)) (opttype=C.STATUS_OPTION);
 else {
                C.variadic(143,C.literal("Unknown %s parameter '%s'"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,opts);
                return C.optn_err;
            }
            if(C.cell(C.staticAddress("duplicate"),"signed char").value) complain_about_duplicate(optidx);
            if(Number(!!(Number(!!(Number(opttype>0)&&Number(!(negated))))&&Number(((op=string_for_opt(opts,(C.i8(0)))))!=C.staticAddress("empty_optstr"))))) {
                switch(opttype) {
                    case (C.MAP_OPTION):
                        (C.field(C.iflags,"instance_flags","wc_fontsiz_map").value=C.atoi(op));
                    break;
                    case (C.MESSAGE_OPTION):
                        (C.field(C.iflags,"instance_flags","wc_fontsiz_message").value=C.atoi(op));
                    break;
                    case (C.TEXT_OPTION):
                        (C.field(C.iflags,"instance_flags","wc_fontsiz_text").value=C.atoi(op));
                    break;
                    case (C.MENU_OPTION):
                        (C.field(C.iflags,"instance_flags","wc_fontsiz_menu").value=C.atoi(op));
                    break;
                    case (C.STATUS_OPTION):
                        (C.field(C.iflags,"instance_flags","wc_fontsiz_status").value=C.atoi(op));
                    break;
                }
            }
            return C.optn_ok;
        } else {
            C.variadic(144,C.literal("Unknown %s parameter '%s'"),C.literal("font"),opts);
            return C.i32((C.i8(0)));
        }
        if(Number(!!(Number(opttype>0)&&Number(((op=string_for_opt(opts,(C.i8(0)))))!=C.staticAddress("empty_optstr"))))) {
            wc_set_font_name(opttype,op);
            return C.optn_ok;
        } else if(negated) {
            bad_negation(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,(C.i8(1)));
            return C.optn_err;
        }
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        if(Number(optidx==C.opt_font_map)) {
            C.variadic(145,opts,C.literal("%s"),(C.field(C.iflags,"instance_flags","wc_font_map").value?C.field(C.iflags,"instance_flags","wc_font_map").value:C.staticAddress("defopt")));
        } else if(Number(optidx==C.opt_font_message)) {
            C.variadic(146,opts,C.literal("%s"),(C.field(C.iflags,"instance_flags","wc_font_message").value?C.field(C.iflags,"instance_flags","wc_font_message").value:C.staticAddress("defopt")));
        } else if(Number(optidx==C.opt_font_status)) {
            C.variadic(147,opts,C.literal("%s"),(C.field(C.iflags,"instance_flags","wc_font_status").value?C.field(C.iflags,"instance_flags","wc_font_status").value:C.staticAddress("defopt")));
        } else if(Number(optidx==C.opt_font_menu)) {
            C.variadic(148,opts,C.literal("%s"),(C.field(C.iflags,"instance_flags","wc_font_menu").value?C.field(C.iflags,"instance_flags","wc_font_menu").value:C.staticAddress("defopt")));
        } else if(Number(optidx==C.opt_font_text)) {
            C.variadic(149,opts,C.literal("%s"),(C.field(C.iflags,"instance_flags","wc_font_text").value?C.field(C.iflags,"instance_flags","wc_font_text").value:C.staticAddress("defopt")));
        } else if(Number(optidx==C.opt_font_size_map)) {
            if(C.field(C.iflags,"instance_flags","wc_fontsiz_map").value) C.variadic(150,opts,C.literal("%d"),C.field(C.iflags,"instance_flags","wc_fontsiz_map").value);
 else C.strcpy(opts,C.staticAddress("defopt"));
        } else if(Number(optidx==C.opt_font_size_message)) {
            if(C.field(C.iflags,"instance_flags","wc_fontsiz_message").value) C.variadic(151,opts,C.literal("%d"),C.field(C.iflags,"instance_flags","wc_fontsiz_message").value);
 else C.strcpy(opts,C.staticAddress("defopt"));
        } else if(Number(optidx==C.opt_font_size_status)) {
            if(C.field(C.iflags,"instance_flags","wc_fontsiz_status").value) C.variadic(152,opts,C.literal("%d"),C.field(C.iflags,"instance_flags","wc_fontsiz_status").value);
 else C.strcpy(opts,C.staticAddress("defopt"));
        } else if(Number(optidx==C.opt_font_size_menu)) {
            if(C.field(C.iflags,"instance_flags","wc_fontsiz_menu").value) C.variadic(153,opts,C.literal("%d"),C.field(C.iflags,"instance_flags","wc_fontsiz_menu").value);
 else C.strcpy(opts,C.staticAddress("defopt"));
        } else if(Number(optidx==C.opt_font_size_text)) {
            if(C.field(C.iflags,"instance_flags","wc_fontsiz_text").value) C.variadic(154,opts,C.literal("%d"),C.field(C.iflags,"instance_flags","wc_fontsiz_text").value);
 else C.strcpy(opts,C.staticAddress("defopt"));
        }
        return C.optn_ok;
    }
    return C.optn_ok;
}

/*
 *    General boolean option handler
 *    (Use optidx to reference the specific option)
 */
export function optfn_boolean(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        let nosexchange=(C.i8(0));
        let ln=0;
        if(Number(!(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","addr").value))) return C.optn_ok;
        /* silent retreat */
        /* option that must come from config file? */
        if(Number(!!(Number(!(C.field(C.go,"instance_globals_o","opt_initial").value))&&(Number(C.u32(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","setwhere").value)==C.u32(C.set_in_config)))))) return C.optn_err;
        /* options that must NOT come from config file */
        if(Number(!!(C.i32(C.field(C.go,"instance_globals_o","opt_initial").value)&&Number(C.u32(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","setwhere").value)==C.u32(C.set_wiznofuz))))) return C.optn_err;
        (op=string_for_opt(opts,(C.i8(1))));
        if(Number(op!=C.staticAddress("empty_optstr"))) {
            if(negated) {
                C.variadic(155,C.literal("Negated boolean '%s' should not have a parameter"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value);
                return C.optn_silenterr;
            }
            /* length is greater than 0 or we wouldn't have gotten here */
            (ln=C.i32(C.strlen(op)));
            if(Number(!!(Number(!!(Number(!!(Number(!(C.strncmpi(op,C.literal("true"),ln)))||Number(!(C.strncmpi(op,C.literal("yes"),ln)))))||Number(!(C.strncmpi((op),(C.literal("on")),C.i32((-1)))))))||(Number(!!(C.i32(C.digit(C.cell(op,"char").value))&&Number(C.atoi(op)==1))))))) {
                (negated=(C.i8(0)));
            } else if(Number(!!(Number(!!(Number(!!(Number(!(C.strncmpi(op,C.literal("false"),ln)))||Number(!(C.strncmpi(op,C.literal("no"),ln)))))||Number(!(C.strncmpi((op),(C.literal("off")),C.i32((-1)))))))||(Number(!!(C.i32(C.digit(C.cell(op,"char").value))&&Number(C.atoi(op)==0))))))) {
                (negated=(C.i8(1)));
            } else if(Number(!(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","valok").value))) {
                C.variadic(156,C.literal("'%s' is not valid for a boolean"),opts);
                return C.optn_silenterr;
            }
        }
        if(Number(!!(C.i32(C.field(C.iflags,"instance_flags","debug_fuzzer").value)&&Number(!(C.field(C.go,"instance_globals_o","opt_initial").value))))) {
            /* don't randomly toggle this/these */
            if(Number(!!((Number(optidx==C.opt_silent))||(Number(optidx==C.opt_perm_invent))))) return C.optn_ok;
        }
        /* Before the change */
        switch(optidx) {
            case (C.opt_female):
                if(Number(!(C.strncmpi(opts,C.literal("female"),((Number((ln)>(3))?(ln):(3))))))) {
                    if(Number(!!(Number(!(C.field(C.go,"instance_globals_o","opt_initial").value))&&Number(C.i32(C.field(C.flags,"flag","female").value)==C.i32(negated))))) {
                        (nosexchange=(C.i8(1)));
                    } else {
                        (C.field(C.flags,"flag","initgend").value=C.i32((C.field(C.flags,"flag","female").value=C.i8(Number(!(negated))))));
                        return C.optn_ok;
                    }
                }
            if(Number(!(C.strncmpi(opts,C.literal("male"),((Number((ln)>(3))?(ln):(3))))))) {
                if(Number(!!(Number(!(C.field(C.go,"instance_globals_o","opt_initial").value))&&Number(C.i32(C.field(C.flags,"flag","female").value)!=C.i32(negated))))) {
                    (nosexchange=(C.i8(1)));
                } else {
                    (C.field(C.flags,"flag","initgend").value=C.i32((C.field(C.flags,"flag","female").value=negated)));
                    return C.optn_ok;
                }
            }
            break;
            case (C.opt_perm_invent):
                if(Number(!!(Number(!!(Number(!(negated))&&Number(!(C.field(C.go,"instance_globals_o","opt_initial").value))))&&Number(!(can_set_perm_invent()))))) return C.optn_silenterr;
            break;
            default:
                break;
        }
        /* this dates from when 'O' prompted for a line of options text
           rather than use a menu to control access to which options can
           be modified during play; it was possible to attempt to use
           'O' to specify female or negate male when playing as male or
           to specify male or negate female when playing as female;
           options processing rejects that for !opt_initial; not possible
           now but kept in case someone brings the old 'O' behavior back */
        if(nosexchange) {
            /* can't arbitrarily change sex after game has started;
               magic (amulet or polymorph) is required for that */
            C.variadic(157,C.literal("'%s' is not anatomically possible."),opts);
            return C.optn_silenterr;
        }
        (C.cell((C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","addr").value),"signed char").value=C.i8(Number(!(negated))));
        /* <==== SET IT HERE */
        /* After the change */
        switch(optidx) {
            case (C.opt_pauper):
                /* pauper implies nudist */
                (C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","nudist").value=C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","pauper").value);
            break;
            case (C.opt_ascii_map):
                (C.field(C.iflags,"instance_flags","wc_tiled_map").value=negated);
            break;
            case (C.opt_tiled_map):
                (C.field(C.iflags,"instance_flags","wc_ascii_map").value=negated);
            break;
            case (C.opt_hilite_pet):
                if(Number(!!((Number(C.u32(C.field(C.windowprocs,"window_procs","wp_id").value)==C.u32(C.wp_tty)))||(Number(C.u32(C.field(C.windowprocs,"window_procs","wp_id").value)==C.u32(C.wp_curses)))))) {
                    /* if we're enabling hilite_pet and petattr isn't set,
                   set it to Inverse; if we're disabling, leave petattr
                   alone so that re-enabling will get current value back
                 */
                    if(Number(!!(C.i32(C.field(C.iflags,"instance_flags","wc_hilite_pet").value)&&Number(!(C.field(C.iflags,"instance_flags","wc2_petattr").value))))) (C.field(C.iflags,"instance_flags","wc2_petattr").value=7);
                }
            (C.field(C.go,"instance_globals_o","opt_need_redraw").value=(C.i8(1)));
            break;
            case (C.opt_idlecheckpoint):
                C.variadic(158,C.literal("There is no underlying support for 'idlecheckpoint' compiled in."));
            (C.field(C.iflags,"instance_flags","idlecheckpoint").value=(C.i8(0)));
            (C.cell(C.staticAddress("give_opt_msg"),"signed char").value=(C.i8(0)));
            break;
            default:
                break;
        }
        /* only do processing below if setting with doset() */
        if(C.field(C.go,"instance_globals_o","opt_initial").value) return C.optn_ok;
        switch(optidx) {
            case (C.opt_terrainstatus):
                C.classify_terrain();
            /* bring iflags.terrain_typ up to date */
            ;
            /*FALLTHRU*/
            case (C.opt_weaponstatus):
                case (C.opt_armorstatus):
                    if(Number(!(wc2_supported(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value)))) {
                        /* not actually an error */
                        C.variadic(159,C.literal("'%s' is not supported."),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value);
                        return C.optn_ok;
                    }
            ;
            /*FALLTHRU*/
            case (C.opt_showscore):
                case (C.opt_showvers):
                    case (C.opt_showexp):
                        case (C.opt_time):
                            if((Number((C.u64((C.field(C.windowprocs,"window_procs","wincap2").value&C.u64((C.i64((8n|128n)))))))!=C.u64(0)))) C.status_initialize((C.i8(1)));
            (C.field(C.disp,"display_hints","botl").value=(C.i8(1)));
            break;
            case (C.opt_fixinv):
                case (C.opt_price_quotes):
                    case (C.opt_sortpack):
                        case (C.opt_implicit_uncursed):
                            case (C.opt_wizweight):
                                if(Number(!(C.field(C.flags,"flag","invlet_constant").value))) C.reassign();
            C.update_inventory();
            break;
            case (C.opt_lit_corridor):
                case (C.opt_dark_room):
                    /*
             * All corridor squares seen via night vision or
             * candles & lamps change.  Update them by calling
             * newsym() on them.  Don't do this if we are
             * initializing the options --- the vision system
             * isn't set up yet.
             */
                    C.vision_recalc(2);
            /* shut down vision */
            (C.field(C.gv,"instance_globals_v","vision_full_recalc").value=C.i8(1));
            /* delayed recalc */
            if(C.field(C.iflags,"instance_flags","wc_color").value) (C.field(C.go,"instance_globals_o","opt_need_redraw").value=(C.i8(1)));
            /* darkroom refresh */
            break;
            case (C.opt_wizmgender):
                case (C.opt_showrace):
                    case (C.opt_use_inverse):
                        case (C.opt_hilite_pile):
                            case (C.opt_perm_invent):
                                case (C.opt_ascii_map):
                                    case (C.opt_tiled_map):
                                        (C.field(C.go,"instance_globals_o","opt_need_redraw").value=(C.i8(1)));
            (C.field(C.go,"instance_globals_o","opt_need_glyph_reset").value=(C.i8(1)));
            break;
            case (C.opt_hitpointbar):
                if((Number((C.u64((C.field(C.windowprocs,"window_procs","wincap2").value&C.u64((C.i64((8n|128n)))))))!=C.u64(0)))) {
                    /* [is reassessment really needed here?] */
                    C.status_initialize((C.i8(1)));
                    (C.field(C.go,"instance_globals_o","opt_need_redraw").value=(C.i8(1)));
                    /* Qt doesn't support HILITE_STATUS or FLUSH_STATUS so fails
                   VIA_WINDOWPORT(), but it does support WC2_HITPOINTBAR */
                }
            break;
            case (C.opt_color):
                (C.field(C.go,"instance_globals_o","opt_need_redraw").value=(C.i8(1)));
            (C.field(C.go,"instance_globals_o","opt_need_glyph_reset").value=(C.i8(1)));
            break;
            case (C.opt_customcolors):
                (C.field(C.go,"instance_globals_o","opt_reset_customcolors").value=(C.i8(1)));
            break;
            case (C.opt_customsymbols):
                (C.field(C.go,"instance_globals_o","opt_reset_customsymbols").value=(C.i8(1)));
            break;
            case (C.opt_menucolors):
                case (C.opt_guicolor):
                    C.update_inventory();
            (C.field(C.go,"instance_globals_o","opt_need_promptstyle").value=(C.i8(1)));
            break;
            case (C.opt_mention_decor):
                (C.field(C.iflags,"instance_flags","prev_decor").value=C.i8(C.STONE));
            break;
            case (C.opt_rest_on_space):
                C.update_rest_on_space();
            break;
            case (C.opt_accessiblemsg):
                (C.field(C.field(C.a11y,"accessibility_data","msg_loc").address,"nhcoord","x").value=(C.field(C.field(C.a11y,"accessibility_data","msg_loc").address,"nhcoord","y").value=C.i16(0)));
            break;
            default:
                break;
        }
        /* boolean value has been toggled but some option changes can
           still be pending at this point (mainly for opt_need_redraw);
           give the toggled message now regardless */
        if(C.cell(C.staticAddress("give_opt_msg"),"signed char").value) C.variadic(160,C.literal("'%s' option toggled %s."),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,(Number(!(negated))?C.literal("on"):C.literal("off")));
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function spcfn_misc_menu_cmd(midx,req,negated,opts,op)
{
    midx=C.i32(midx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        if(negated) {
            bad_negation(C.field((C.staticAddress("default_menu_cmd_info")+Number(midx)*C.sizes["menu_cmd_t"]),"menu_cmd_t","name").value,(C.i8(0)));
            return C.optn_err;
        } else if(Number(((op=string_for_opt(opts,(C.i8(0)))))!=C.staticAddress("empty_optstr"))) {
            let c=C.i8(txt2key(op));
            if(illegal_menu_cmd_key(C.u8(c))) return C.optn_err;
            add_menu_cmd_alias(c,C.field((C.staticAddress("default_menu_cmd_info")+Number(midx)*C.sizes["menu_cmd_t"]),"menu_cmd_t","cmd").value);
        }
        return C.optn_ok;
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        (C.cell((opts+Number(0)*1),"char").value=C.i8(0));
        return C.optn_ok;
    }
    return C.optn_ok;
}

/*
 **********************************
 *
 *   Special per-option handlers
 *
 **********************************
 */
/* test whether 'perm_invent' can be toggled On */
export function can_set_perm_invent()
{
    /*
     * Assumption: only called when iflags.perm_invent is False
     * and is about to be changed to True.
     */
    let old_perminv_mode=C.field(C.iflags,"instance_flags","perminv_mode").value;
    if(Number(!((C.u64((C.field(C.windowprocs,"window_procs","wincap").value&C.u64(134217728n))))))) {
        /* check tty, not necessarily the active window port;
           windows early startup can still be set to safeprocs */
        return (C.i8(0));
    }
    if(Number(C.i32(C.field(C.iflags,"instance_flags","perminv_mode").value)==C.InvOptNone)) (C.field(C.iflags,"instance_flags","perminv_mode").value=C.u8(C.InvOptOn));
    /* perm_invent_toggled()
           -> sync_perminvent()
              -> tty_create_nhwindow(NHW_PERMINVENT)
           gives feedback for failure (terminal too small) */
    ((old_perminv_mode));
    return (C.i8(1));
}

export function handler_menustyle()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["handler_menustyle.any",C.sizes["union any"]],["handler_menustyle.buf",(1*256)],["handler_menustyle.style_pick",8]]);
    try {
    let tmpwin;
    let any=C.automatic("handler_menustyle.any",C.sizes["union any"]);
    let chngd;
    let i; let n; let old_menu_style=C.i32(C.field(C.flags,"flag","menu_style").value);
    let buf=C.automatic("handler_menustyle.buf",(1*256)); let sep=C.i8((C.i32(C.field(C.iflags,"instance_flags","menu_tab_sep").value)?9:32));
    let style_pick=C.local("handler_menustyle.style_pick","struct mi *",0);
    let clr=8;
    (tmpwin=C.callback(7,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.callback(8,(C.field(C.windowprocs,"window_procs","win_start_menu").value),tmpwin,C.u64(0));
    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    for((i=0);Number(i<C.i32((C.u64((BigInt(((8*4)*3))/BigInt((8*3)))))));(()=>{const old=i;i=C.i32((old+1));return old;})()) {
        C.variadic(161,buf,C.literal("%-12.12s%c%.60s"),C.cell(((C.staticAddress("menutype")+Number(i)*(8*3))+Number(0)*8),"char *").value,C.i32(sep),C.cell(((C.staticAddress("menutype")+Number(i)*(8*3))+Number(1)*8),"char *").value);
        (C.field(any,"any","a_int").value=C.i32((i+1)));
        C.add_menu(tmpwin,C.nul_glyphinfo,any,C.cell(buf,"char").value,C.i8(0),0,clr,buf,((Number(i==C.i32(C.field(C.flags,"flag","menu_style").value)))?1:0));
        /* second line is prefixed by spaces that "c - " would use */
        C.variadic(162,buf,C.literal("%4s%-12.12s%c%.60s"),C.literal(""),C.literal(""),C.i32(sep),C.cell(((C.staticAddress("menutype")+Number(i)*(8*3))+Number(2)*8),"char *").value);
        C.add_menu_str(tmpwin,buf);
    }
    C.callback(9,(C.field(C.windowprocs,"window_procs","win_end_menu").value),tmpwin,C.literal("Select menustyle:"));
    (n=C.select_menu(tmpwin,1,style_pick.address));
    if(Number(n>0)) {
        (i=C.i32((C.field(C.field((style_pick.value+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value-1)));
        /* if there are two picks, use the one that wasn't pre-selected */
        if(Number(!!(Number(n>1)&&Number(i==old_menu_style)))) (i=C.i32((C.field(C.field((style_pick.value+Number(1)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value-1)));
        (C.field(C.flags,"flag","menu_style").value=C.i8(i));
        C.free(style_pick.value);
    }
    C.callback(10,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tmpwin);
    (chngd=C.i8((Number(C.i32(C.field(C.flags,"flag","menu_style").value)!=old_menu_style))));
    if(Number(!!(C.i32(chngd)||C.i32(C.field(C.flags,"flag","verbose").value)))) C.variadic(163,C.literal("'menustyle' %s \"%s\"."),(C.i32(chngd)?C.literal("changed to"):C.literal("is still")),C.cell(((C.staticAddress("menutype")+Number(C.i32(C.field(C.flags,"flag","menu_style").value))*(8*3))+Number(0)*8),"char *").value);
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function handler_align_misc(optidx)
{
    optidx=C.i32(optidx);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["handler_align_misc.any",C.sizes["union any"]],["handler_align_misc.window_pick",8],["handler_align_misc.abuf",(1*256)]]);
    try {
    let tmpwin;
    let any=C.automatic("handler_align_misc.any",C.sizes["union any"]);
    let window_pick=C.local("handler_align_misc.window_pick","struct mi *",0);
    let abuf=C.automatic("handler_align_misc.abuf",(1*256));
    let clr=8;
    (tmpwin=C.callback(11,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.callback(12,(C.field(C.windowprocs,"window_procs","win_start_menu").value),tmpwin,C.u64(0));
    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    (C.field(any,"any","a_int").value=3);
    C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(116),C.i8(0),0,clr,C.literal("top"),0);
    (C.field(any,"any","a_int").value=4);
    C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(98),C.i8(0),0,clr,C.literal("bottom"),0);
    (C.field(any,"any","a_int").value=1);
    C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(108),C.i8(0),0,clr,C.literal("left"),0);
    (C.field(any,"any","a_int").value=2);
    C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(114),C.i8(0),0,clr,C.literal("right"),0);
    C.variadic(164,abuf,C.literal("Select %s window placement relative to the map:"),((Number(optidx==C.opt_align_message))?C.literal("message"):C.literal("status")));
    C.callback(13,(C.field(C.windowprocs,"window_procs","win_end_menu").value),tmpwin,abuf);
    if(Number(C.select_menu(tmpwin,1,window_pick.address)>0)) {
        if(Number(optidx==C.opt_align_message)) (C.field(C.iflags,"instance_flags","wc_align_message").value=C.field(C.field(window_pick.value,"mi","item").address,"any","a_int").value);
 else (C.field(C.iflags,"instance_flags","wc_align_status").value=C.field(C.field(window_pick.value,"mi","item").address,"any","a_int").value);
        C.free(window_pick.value);
    }
    C.callback(14,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tmpwin);
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function handler_autounlock(optidx)
{
    optidx=C.i32(optidx);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["handler_autounlock.any",C.sizes["union any"]],["handler_autounlock.buf",(1*256)],["handler_autounlock.window_pick",8]]);
    try {
    let tmpwin;
    let any=C.automatic("handler_autounlock.any",C.sizes["union any"]);
    let chngd;
    let oldflags=C.field(C.flags,"flag","autounlock").value;
    let optname=C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value;
    let buf=C.automatic("handler_autounlock.buf",(1*256)); let sep=C.i8((C.i32(C.field(C.iflags,"instance_flags","menu_tab_sep").value)?9:32));
    let window_pick=C.local("handler_autounlock.window_pick","struct mi *",0);
    let i; let n; let presel; let res=C.optn_ok;
    let clr=8;
    (tmpwin=C.callback(15,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.callback(16,(C.field(C.windowprocs,"window_procs","win_start_menu").value),tmpwin,C.u64(0));
    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    for((i=0);Number(i<C.i32((C.u64((BigInt(((8*4)*2))/BigInt((8*2)))))));(()=>{const old=i;i=C.i32((old+1));return i;})()) {
        C.variadic(165,buf,C.literal("%-10.10s%c%.40s"),C.cell(((C.staticAddress("unlocktypes")+Number(i)*(8*2))+Number(0)*8),"char *").value,C.i32(sep),C.cell(((C.staticAddress("unlocktypes")+Number(i)*(8*2))+Number(1)*8),"char *").value);
        (presel=C.i32((C.u32((C.field(C.flags,"flag","autounlock").value&C.u32((C.i32((1<<i)))))))));
        (C.field(any,"any","a_int").value=C.i32((i+1)));
        C.add_menu(tmpwin,C.nul_glyphinfo,any,C.cell(C.cell(((C.staticAddress("unlocktypes")+Number(i)*(8*2))+Number(0)*8),"char *").value,"char").value,C.i8(0),0,clr,buf,((presel?1:0)));
    }
    C.variadic(166,buf,C.literal("Select '%.20s' actions:"),optname);
    C.callback(17,(C.field(C.windowprocs,"window_procs","win_end_menu").value),tmpwin,buf);
    (n=C.select_menu(tmpwin,2,window_pick.address));
    if(Number(n>0)) {
        let newflags=C.u32(0);
        for((i=0);Number(i<n);(()=>{const old=i;i=C.i32((old+1));return i;})()) (newflags=C.u32(newflags|C.u32((C.i32((1<<(C.i32((C.field(C.field((window_pick.value+Number(i)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value-1)))))))));

        (C.field(C.flags,"flag","autounlock").value=newflags);
        C.free(window_pick.value);
    } else if(Number(n==0)) {
        /* nothing was picked but menu wasn't cancelled */
        /* something that was preselected got unselected, leaving nothing;
           treat that as picking 'none' (even though 'none' is no longer
           among the choices) */
        (C.field(C.flags,"flag","autounlock").value=C.u32(0));
    }
    C.callback(18,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tmpwin);
    (chngd=C.i8((Number(C.field(C.flags,"flag","autounlock").value!=oldflags))));
    if(Number(!!((Number(!!(C.i32(chngd)||C.i32(C.field(C.flags,"flag","verbose").value))))&&C.i32(C.cell(C.staticAddress("give_opt_msg"),"signed char").value)))) {
        optfn_autounlock(optidx,C.get_val,(C.i8(0)),buf,(0));
        C.variadic(167,C.literal("'%s' %s '%s'."),optname,(C.i32(chngd)?C.literal("changed to"):C.literal("is still")),buf);
    }
    return res;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function handler_disclose()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["handler_disclose.any",C.sizes["union any"]],["handler_disclose.buf",(1*256)],["handler_disclose.disc_cat",(4*6)],["handler_disclose.disclosure_pick",8]]);
    try {
    let tmpwin;
    let any=C.automatic("handler_disclose.any",C.sizes["union any"]);
    let i; let n;
    let buf=C.automatic("handler_disclose.buf",(1*256));
    /* order of disclose_names[] must correspond to
       disclosure_options in decl.c */
    
    let disc_cat=C.automatic("handler_disclose.disc_cat",(4*6));
    let pick_cnt; let pick_idx; let opt_idx;
    let c;
    let disclosure_pick=C.local("handler_disclose.disclosure_pick","struct mi *",0);
    let clr=8;
    (tmpwin=C.callback(19,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.callback(20,(C.field(C.windowprocs,"window_procs","win_start_menu").value),tmpwin,C.u64(0));
    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    for((i=0);Number(i<6);(()=>{const old=i;i=C.i32((old+1));return old;})()) {
        C.variadic(168,buf,C.literal("%-12s[%c%c]"),C.cell((C.staticAddress("handler_disclose.disclosure_names")+Number(i)*8),"char *").value,C.i32(C.cell((C.field(C.flags,"flag","end_disclose").address+Number(i)*1),"char").value),C.i32(C.cell((C.disclosure_options+Number(i)*1),"char").value));
        (C.field(any,"any","a_int").value=C.i32((i+1)));
        C.add_menu(tmpwin,C.nul_glyphinfo,any,C.cell((C.disclosure_options+Number(i)*1),"char").value,C.i8(0),0,clr,buf,0);
        (C.cell((disc_cat+Number(i)*4),"int").value=0);
    }
    C.callback(21,(C.field(C.windowprocs,"window_procs","win_end_menu").value),tmpwin,C.literal("Change which disclosure options categories:"));
    (pick_cnt=C.select_menu(tmpwin,2,disclosure_pick.address));
    if(Number(pick_cnt>0)) {
        for((pick_idx=0);Number(pick_idx<pick_cnt);(()=>{const old=pick_idx;pick_idx=C.i32((old+1));return pick_idx;})()) {
            (opt_idx=C.i32((C.field(C.field((disclosure_pick.value+Number(pick_idx)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value-1)));
            (C.cell((disc_cat+Number(opt_idx)*4),"int").value=1);
        }
        C.free(disclosure_pick.value);
        (disclosure_pick.value=0);
    }
    C.callback(22,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tmpwin);
    for((i=0);Number(i<6);(()=>{const old=i;i=C.i32((old+1));return old;})()) {
        if(C.cell((disc_cat+Number(i)*4),"int").value) {
            (c=C.cell((C.field(C.flags,"flag","end_disclose").address+Number(i)*1),"char").value);
            C.variadic(169,buf,C.literal("Disclosure options for %s:"),C.cell((C.staticAddress("handler_disclose.disclosure_names")+Number(i)*8),"char *").value);
            (tmpwin=C.callback(23,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
            C.callback(24,(C.field(C.windowprocs,"window_procs","win_start_menu").value),tmpwin,C.u64(0));
            C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
            /* 'y','n',and '+' work as alternate selectors; '-' doesn't */
            (C.field(any,"any","a_char").value=C.i8(45));
            C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(0),C.field(any,"any","a_char").value,0,clr,C.literal("Never disclose, without prompting"),((Number(C.i32(c)==C.i32(C.field(any,"any","a_char").value)))?1:0));
            (C.field(any,"any","a_char").value=C.i8(43));
            C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(0),C.field(any,"any","a_char").value,0,clr,C.literal("Always disclose, without prompting"),((Number(C.i32(c)==C.i32(C.field(any,"any","a_char").value)))?1:0));
            if(Number(!!(Number(C.i32(C.cell(C.cell((C.staticAddress("handler_disclose.disclosure_names")+Number(i)*8),"char *").value,"char").value)==118)||Number(C.i32(C.cell(C.cell((C.staticAddress("handler_disclose.disclosure_names")+Number(i)*8),"char *").value,"char").value)==103)))) {
                (C.field(any,"any","a_char").value=C.i8(35));
                /* '#' */
                C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(0),C.field(any,"any","a_char").value,0,clr,C.literal("Always disclose, pick sort order from menu"),((Number(C.i32(c)==C.i32(C.field(any,"any","a_char").value)))?1:0));
            }
            (C.field(any,"any","a_char").value=C.i8(110));
            C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(0),C.field(any,"any","a_char").value,0,clr,C.literal("Prompt, with default answer of \"No\""),((Number(C.i32(c)==C.i32(C.field(any,"any","a_char").value)))?1:0));
            (C.field(any,"any","a_char").value=C.i8(121));
            C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(0),C.field(any,"any","a_char").value,0,clr,C.literal("Prompt, with default answer of \"Yes\""),((Number(C.i32(c)==C.i32(C.field(any,"any","a_char").value)))?1:0));
            if(Number(!!(Number(C.i32(C.cell(C.cell((C.staticAddress("handler_disclose.disclosure_names")+Number(i)*8),"char *").value,"char").value)==118)||Number(C.i32(C.cell(C.cell((C.staticAddress("handler_disclose.disclosure_names")+Number(i)*8),"char *").value,"char").value)==103)))) {
                (C.field(any,"any","a_char").value=C.i8(63));
                /* '?' */
                C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(0),C.field(any,"any","a_char").value,0,clr,C.literal("Prompt, with default answer of \"Ask\" to request sort menu"),((Number(C.i32(c)==C.i32(C.field(any,"any","a_char").value)))?1:0));
            }
            C.callback(25,(C.field(C.windowprocs,"window_procs","win_end_menu").value),tmpwin,buf);
            (n=C.select_menu(tmpwin,1,disclosure_pick.address));
            if(Number(n>0)) {
                (C.cell((C.field(C.flags,"flag","end_disclose").address+Number(i)*1),"char").value=C.field(C.field((disclosure_pick.value+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_char").value);
                if(Number(!!(Number(n>1)&&Number(C.i32(C.cell((C.field(C.flags,"flag","end_disclose").address+Number(i)*1),"char").value)==C.i32(c))))) (C.cell((C.field(C.flags,"flag","end_disclose").address+Number(i)*1),"char").value=C.field(C.field((disclosure_pick.value+Number(1)*C.sizes["struct mi"]),"mi","item").address,"any","a_char").value);
                C.free(disclosure_pick.value);
            }
            C.callback(26,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tmpwin);
        }
    }
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function handler_menu_headings()
{
    let gotca=C.query_color_attr(C.field(C.iflags,"instance_flags","menu_headings").address,C.literal("How to highlight menu headings:"));
    if(gotca) {
        /* header highlighting affects persistent inventory display */
        if(C.field(C.iflags,"instance_flags","perm_invent").value) C.update_inventory();
    }
    C.adjust_menu_promptstyle(C.global("WIN_INVEN").value,C.field(C.iflags,"instance_flags","menu_headings").address);
    return C.optn_ok;
}

export function handler_menu_objsyms()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["handler_menu_objsyms.any",C.sizes["union any"]],["handler_menu_objsyms.buf",(1*256)],["handler_menu_objsyms.picklist",8]]);
    try {
    let tmpwin;
    let any=C.automatic("handler_menu_objsyms.any",C.sizes["union any"]);
    let buf=C.automatic("handler_menu_objsyms.buf",(1*256));
    let picklist=C.local("handler_menu_objsyms.picklist","struct mi *",0);
    let sep=C.i8((C.i32(C.field(C.iflags,"instance_flags","menu_tab_sep").value)?9:32));
    let i; let j; let n; let clr=8;
    (tmpwin=C.callback(27,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.callback(28,(C.field(C.windowprocs,"window_procs","win_start_menu").value),tmpwin,C.u64(0));
    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    for((i=0);Number(i<C.i32((C.u64((BigInt((C.sizes["struct objsymopt"]*6))/BigInt(C.sizes["struct objsymopt"]))))));(()=>{const old=i;i=C.i32((old+1));return i;})()) {
        C.variadic(170,(C.literal("handler_menu_objsyms")),5809,buf,BigInt((1*256)),C.literal("%-12.12s%c%.60s"),C.field((C.staticAddress("objsymvals")+Number(i)*C.sizes["struct objsymopt"]),"objsymopt","nam").value,C.i32(sep),C.field((C.staticAddress("objsymvals")+Number(i)*C.sizes["struct objsymopt"]),"objsymopt","descr").value);
        (C.field(any,"any","a_int").value=C.i32((i+1)));
        (j=C.field((C.staticAddress("objsymvals")+Number(i)*C.sizes["struct objsymopt"]),"objsymopt","num").value);
        C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(C.i32((48+i))),C.cell(buf,"char").value,0,clr,buf,((Number(j==C.field(C.iflags,"instance_flags","menuobjsyms").value))?1:0));
    }
    C.callback(29,(C.field(C.windowprocs,"window_procs","win_end_menu").value),tmpwin,C.literal("Set object symbols in menus to what?"));
    (n=C.select_menu(tmpwin,1,picklist.address));
    if(Number(n>0)) {
        (i=C.i32((C.field(C.field((picklist.value+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value-1)));
        /* if there are two picks, use the one that wasn't pre-selected */
        if(Number(!!(Number(n>1)&&Number(i==C.field(C.iflags,"instance_flags","menuobjsyms").value)))) (i=C.i32((C.field(C.field((picklist.value+Number(1)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value-1)));
        set_menuobjsyms_flags(i);
        C.free(picklist.value);
    }
    C.callback(30,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tmpwin);
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function handler_msg_window()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["handler_msg_window.any",C.sizes["union any"]],["handler_msg_window.buf",(1*256)],["handler_msg_window.window_pick",8]]);
    try {
    /* tty or curses */
    let tmpwin;
    let any=C.automatic("handler_msg_window.any",C.sizes["union any"]);
    let is_tty=C.i8((Number(C.u32(C.field(C.windowprocs,"window_procs","wp_id").value)==C.u32(C.wp_tty)))); let is_curses=C.i8((Number(C.u32(C.field(C.windowprocs,"window_procs","wp_id").value)==C.u32(C.wp_curses))));
    let clr=8;
    if(Number(!!(C.i32(is_tty)||C.i32(is_curses)))) {
        /* by Christian W. Cooper */
        let chngd;
        let i; let n;
        let buf=C.automatic("handler_msg_window.buf",(1*256)); let c; let sep=C.i8((C.i32(C.field(C.iflags,"instance_flags","menu_tab_sep").value)?9:32)); let old_prevmsg_window=C.field(C.iflags,"instance_flags","prevmsg_window").value;
        let window_pick=C.local("handler_msg_window.window_pick","struct mi *",0);
        (tmpwin=C.callback(31,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
        C.callback(32,(C.field(C.windowprocs,"window_procs","win_start_menu").value),tmpwin,C.u64(0));
        C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
        for((i=0);Number(i<C.i32((C.u64((BigInt(((8*4)*3))/BigInt((8*3)))))));(()=>{const old=i;i=C.i32((old+1));return old;})()) {
            if(Number(!!(Number(i<2)&&C.i32(is_curses)))) continue;
            C.variadic(171,buf,C.literal("%-12.12s%c%.60s"),C.cell(((C.staticAddress("msgwind")+Number(i)*(8*3))+Number(0)*8),"char *").value,C.i32(sep),C.cell(((C.staticAddress("msgwind")+Number(i)*(8*3))+Number(1)*8),"char *").value);
            (C.field(any,"any","a_char").value=(c=C.cell(C.cell(((C.staticAddress("msgwind")+Number(i)*(8*3))+Number(0)*8),"char *").value,"char").value));
            C.add_menu(tmpwin,C.nul_glyphinfo,any,C.cell(buf,"char").value,C.i8(0),0,clr,buf,((Number(C.i32(c)==C.i32(C.field(C.iflags,"instance_flags","prevmsg_window").value)))?1:0));
            /* second line is prefixed by spaces that "c - " would use */
            C.variadic(172,buf,C.literal("%4s%-12.12s%c%.60s"),C.literal(""),C.literal(""),C.i32(sep),C.cell(((C.staticAddress("msgwind")+Number(i)*(8*3))+Number(2)*8),"char *").value);
            C.add_menu_str(tmpwin,buf);
        }
        C.callback(33,(C.field(C.windowprocs,"window_procs","win_end_menu").value),tmpwin,C.literal("Select message history display type:"));
        (n=C.select_menu(tmpwin,1,window_pick.address));
        if(Number(n>0)) {
            (c=C.field(C.field((window_pick.value+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_char").value);
            /* if there are two picks, use the one that wasn't pre-selected */
            if(Number(!!(Number(n>1)&&Number(C.i32(c)==C.i32(old_prevmsg_window))))) (c=C.field(C.field((window_pick.value+Number(1)*C.sizes["struct mi"]),"mi","item").address,"any","a_char").value);
            (C.field(C.iflags,"instance_flags","prevmsg_window").value=c);
            C.free(window_pick.value);
        }
        C.callback(34,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tmpwin);
        (chngd=C.i8((Number(C.i32(C.field(C.iflags,"instance_flags","prevmsg_window").value)!=C.i32(old_prevmsg_window)))));
        if(Number(!!(C.i32(chngd)||C.i32(C.field(C.flags,"flag","verbose").value)))) {
            optfn_msg_window(C.opt_msg_window,C.get_val,(C.i8(0)),buf,C.staticAddress("empty_optstr"));
            C.variadic(173,C.literal("'msg_window' %.20s \"%.20s\"."),(C.i32(chngd)?C.literal("changed to"):C.literal("is still")),buf);
        }
    } else C.variadic(174,C.literal("'%s' option is not supported for '%s'."),C.field((C.staticAddress("allopt")+Number(C.opt_msg_window)*C.sizes["struct allopt_t"]),"allopt_t","name").value,C.field(C.windowprocs,"window_procs","name").value);
    /* PREV_MSGS (for tty or curses) */
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function handler_number_pad()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["handler_number_pad.any",C.sizes["union any"]],["handler_number_pad.mode_pick",8]]);
    try {
    let tmpwin;
    let any=C.automatic("handler_number_pad.any",C.sizes["union any"]);
    let i;
    
    let mode_pick=C.local("handler_number_pad.mode_pick","struct mi *",0);
    let clr=8;
    (tmpwin=C.callback(35,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.callback(36,(C.field(C.windowprocs,"window_procs","win_start_menu").value),tmpwin,C.u64(0));
    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    for((i=0);Number(i<C.i32((C.u64((BigInt((8*6))/BigInt(8))))));(()=>{const old=i;i=C.i32((old+1));return old;})()) {
        (C.field(any,"any","a_int").value=C.i32((i+1)));
        C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(C.i32((97+i))),C.i8(C.i32((48+i))),0,clr,C.cell((C.staticAddress("handler_number_pad.npchoices")+Number(i)*8),"char *").value,0);
    }
    C.callback(37,(C.field(C.windowprocs,"window_procs","win_end_menu").value),tmpwin,C.literal("Select number_pad mode:"));
    if(Number(C.select_menu(tmpwin,1,mode_pick.address)>0)) {
        switch(C.i32((C.field(C.field(mode_pick.value,"mi","item").address,"any","a_int").value-1))) {
            case (0):
                (C.field(C.iflags,"instance_flags","num_pad").value=(C.i8(0)));
            (C.field(C.iflags,"instance_flags","num_pad_mode").value=C.u8(0));
            break;
            case (1):
                (C.field(C.iflags,"instance_flags","num_pad").value=(C.i8(1)));
            (C.field(C.iflags,"instance_flags","num_pad_mode").value=C.u8(0));
            break;
            case (2):
                (C.field(C.iflags,"instance_flags","num_pad").value=(C.i8(1)));
            (C.field(C.iflags,"instance_flags","num_pad_mode").value=C.u8(1));
            break;
            case (3):
                (C.field(C.iflags,"instance_flags","num_pad").value=(C.i8(1)));
            (C.field(C.iflags,"instance_flags","num_pad_mode").value=C.u8(2));
            break;
            case (4):
                (C.field(C.iflags,"instance_flags","num_pad").value=(C.i8(1)));
            (C.field(C.iflags,"instance_flags","num_pad_mode").value=C.u8(3));
            break;
            /* last menu choice: number_pad == -1 */
            case (5):
                (C.field(C.iflags,"instance_flags","num_pad").value=(C.i8(0)));
            (C.field(C.iflags,"instance_flags","num_pad_mode").value=C.u8(1));
            break;
        }
        C.reset_commands((C.i8(0)));
        C.callback(38,(C.field(C.windowprocs,"window_procs","win_number_pad").value),(C.i32(C.field(C.iflags,"instance_flags","num_pad").value)?1:0));
        C.free(mode_pick.value);
    }
    C.callback(39,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tmpwin);
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function handler_paranoid_confirmation()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["handler_paranoid_confirmation.any",C.sizes["union any"]],["handler_paranoid_confirmation.mbuf",(1*128)],["handler_paranoid_confirmation.ebuf",(1*256)],["handler_paranoid_confirmation.cbuf",(1*128)],["handler_paranoid_confirmation.paranoia_picks",8]]);
    try {
    let tmpwin;
    let any=C.automatic("handler_paranoid_confirmation.any",C.sizes["union any"]);
    let i;
    let mkey; let mbuf=C.automatic("handler_paranoid_confirmation.mbuf",(1*128)); let ebuf=C.automatic("handler_paranoid_confirmation.ebuf",(1*256)); let cbuf=C.automatic("handler_paranoid_confirmation.cbuf",(1*128));
    let explain; let cmdnm;
    let paranoia_picks=C.local("handler_paranoid_confirmation.paranoia_picks","struct mi *",0);
    let clr=8;
    (tmpwin=C.callback(40,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.callback(41,(C.field(C.windowprocs,"window_procs","win_start_menu").value),tmpwin,C.u64(0));
    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    for((i=0);Number(C.field((C.staticAddress("paranoia")+Number(i)*C.sizes["struct paranoia_opts"]),"paranoia_opts","flagmask").value!=0);(()=>{const old=i;i=C.i32((old+1));return i;})()) {
        if(Number(!!(Number(C.field((C.staticAddress("paranoia")+Number(i)*C.sizes["struct paranoia_opts"]),"paranoia_opts","flagmask").value==8)&&Number(!(C.field(C.flags,"flag","debug").value))))) continue;
        /* the 'swim' choice mentions the 'm' movement prefix in its
           explanation; if that's been bound to something else or been
           unbound altogether, substitute the replacement in the text */
        (explain=C.field((C.staticAddress("paranoia")+Number(i)*C.sizes["struct paranoia_opts"]),"paranoia_opts","explain").value);
        if(Number(!!(C.strstri(explain,C.literal("'m'"))&&Number(C.i32(((mkey=C.cmd_from_func(C.functionAddress("do_reqmenu")))))!=109)))) {
            if(mkey) {
                /* key for 'm' prefix */
                C.variadic(175,mbuf,C.literal("'%.9s'"),C.visctrl(mkey));
                /* .5 is enough */
            } else {
                /* extended command name for 'm' prefix */
                (cmdnm=C.cmdname_from_func(C.functionAddress("do_reqmenu"),cbuf,(C.i8(1))));
                if(Number(!(cmdnm))) (cmdnm=C.literal("reqmenu"));
                C.variadic(176,mbuf,C.literal("'%s%.31s'"),((Number(C.i32(C.cell(cmdnm,"char").value)!=35))?C.literal("#"):C.literal("")),cmdnm);
            }
            (explain=C.strsubst(C.strcpy(ebuf,explain),C.literal("'m'"),mbuf));
        }
        (C.field(any,"any","a_int").value=C.field((C.staticAddress("paranoia")+Number(i)*C.sizes["struct paranoia_opts"]),"paranoia_opts","flagmask").value);
        C.add_menu(tmpwin,C.nul_glyphinfo,any,C.cell(C.field((C.staticAddress("paranoia")+Number(i)*C.sizes["struct paranoia_opts"]),"paranoia_opts","argname").value,"char").value,C.i8(0),0,clr,explain,((C.u32((C.field(C.flags,"flag","paranoia_bits").value&C.u32(C.field((C.staticAddress("paranoia")+Number(i)*C.sizes["struct paranoia_opts"]),"paranoia_opts","flagmask").value))))?1:0));
    }
    C.callback(42,(C.field(C.windowprocs,"window_procs","win_end_menu").value),tmpwin,C.literal("Actions requiring extra confirmation:"));
    (i=C.select_menu(tmpwin,2,paranoia_picks.address));
    if(Number(i>=0)) {
        /* player didn't cancel; we reset all the paranoia options
           here even if there were no items picked, since user
           could have toggled off preselected ones to end up with 0 */
        (C.field(C.flags,"flag","paranoia_bits").value=C.u32(0));
        if(Number(i>0)) {
            /* at least 1 item set, either preselected or newly picked */
            while(Number((()=>{const old=i;i=C.i32((old-1));return i;})()>=0)) (C.field(C.flags,"flag","paranoia_bits").value=C.u32(C.field(C.flags,"flag","paranoia_bits").value|C.u32(C.field(C.field((paranoia_picks.value+Number(i)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value)));

            C.free(paranoia_picks.value);
        }
    }
    C.callback(43,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tmpwin);
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function handler_perminv_mode()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["handler_perminv_mode.any",C.sizes["union any"]],["handler_perminv_mode.buf",(1*256)],["handler_perminv_mode.sepbuf",(1*10)],["handler_perminv_mode.pi_pick",8]]);
    try {
    let tmpwin;
    let any=C.automatic("handler_perminv_mode.any",C.sizes["union any"]);
    let let_; let buf=C.automatic("handler_perminv_mode.buf",(1*256)); let sepbuf=C.automatic("handler_perminv_mode.sepbuf",(1*10));
    let pi0; let pi1;
    let pi_pick=C.local("handler_perminv_mode.pi_pick","struct mi *",0);
    let old_perm_invent=C.field(C.iflags,"instance_flags","perm_invent").value;
    let i; let n; let old_pi=C.i32(C.field(C.iflags,"instance_flags","perminv_mode").value); let new_pi=old_pi; let widest=(Number(!((Number(C.u32(C.field(C.windowprocs,"window_procs","wp_id").value)==C.u32(C.wp_tty)))))?8:11);
    /* "in-use__" or "full+grid__" */
    (tmpwin=C.callback(44,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.callback(45,(C.field(C.windowprocs,"window_procs","win_start_menu").value),tmpwin,C.u64(0));
    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    for((i=0);Number(i<C.i32((C.u64((BigInt(((8*9)*3))/BigInt((8*3)))))));(()=>{const old=i;i=C.i32((old+1));return i;})()) {
        if(Number(!(((pi0=C.cell(((C.staticAddress("perminv_modes")+Number(i)*(8*3))+Number(0)*8),"char *").value))))) continue;
        (pi1=C.cell(((C.staticAddress("perminv_modes")+Number(i)*(8*3))+Number(1)*8),"char *").value);
        if(Number(!(C.field(C.iflags,"instance_flags","menu_tab_sep").value))) {
            let numspaces=C.i32((widest-C.i32(C.strlen(pi0))));
            C.variadic(177,sepbuf,C.literal("%*s"),((Number((numspaces)>(1))?(numspaces):(1))),C.literal(" "));
        } else {
            C.strcpy(sepbuf,C.literal("\t"));
        }
        C.variadic(178,buf,C.literal("%s%s%s"),pi0,sepbuf,C.cell(((C.staticAddress("perminv_modes")+Number(i)*(8*3))+Number(2)*8),"char *").value);
        (let_=C.i8(((Number((C.i32((i&C.InvSparse)))!=0))?C.i32(C.highc(C.cell((pi1+Number(0)*1),"char").value)):C.i32(C.cell((pi0+Number(0)*1),"char").value))));
        (C.field(any,"any","a_int").value=C.i32((i+1)));
        C.add_menu(tmpwin,C.nul_glyphinfo,any,let_,C.i8(C.i32((48+i))),0,8,buf,((Number(i==old_pi))?1:0));
    }
    C.callback(46,(C.field(C.windowprocs,"window_procs","win_end_menu").value),tmpwin,C.literal("Choose permanent inventory mode:"));
    (n=C.select_menu(tmpwin,1,pi_pick.address));
    C.callback(47,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tmpwin);
    if(Number(n>0)) {
        (new_pi=C.i32((C.field(C.field((pi_pick.value+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value-1)));
        if(Number(!!(Number(n>1)&&Number(new_pi==old_pi)))) (new_pi=C.i32((C.field(C.field((pi_pick.value+Number(1)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value-1)));
        C.free(pi_pick.value);
        (C.field(C.iflags,"instance_flags","perminv_mode").value=C.u8(new_pi));
    }
    if(Number(n>=0)) {
        /* not ESC */
        (C.cell((buf+Number(0)*1),"char").value=C.i8(0));
        optfn_perminv_mode(C.opt_perm_invent,C.get_val,(C.i8(0)),buf,0);
        C.variadic(179,C.literal("'perminv_mode' %s '%s' (%s)."),((Number(new_pi!=old_pi))?C.literal("changed to"):C.literal("is still")),C.cell(((C.staticAddress("perminv_modes")+Number(new_pi)*(8*3))+Number(0)*8),"char *").value,buf);
        if(Number(!!(Number(new_pi!=C.InvOptNone)&&Number(!(old_perm_invent))))) (C.field(C.iflags,"instance_flags","perm_invent").value=can_set_perm_invent());
 else if(Number(!!(Number(new_pi==C.InvOptNone)&&C.i32(old_perm_invent)))) (C.field(C.iflags,"instance_flags","perm_invent").value=(C.i8(0)));
        if(Number(!!(Number(new_pi!=old_pi)||Number(C.i32(C.field(C.iflags,"instance_flags","perm_invent").value)!=C.i32(old_perm_invent))))) {
            /* FIXME: TTY_PERM_INVENT will blank WIN_INVEN when changing
               perminv_mode while perm_invent is already on; to remedy that,
               turn it off and then back on when already on */
            /*TEMP?*/
            /*TEMP?*/
            (C.field(C.go,"instance_globals_o","opt_need_redraw").value=(C.i8(1)));
        }
    }
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function handler_pickup_burden()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["handler_pickup_burden.any",C.sizes["union any"]],["handler_pickup_burden.burden_pick",8]]);
    try {
    let tmpwin;
    let any=C.automatic("handler_pickup_burden.any",C.sizes["union any"]);
    let i;
    let burden_name; let burden_letters=C.literal("ubsntl");
    let burden_pick=C.local("handler_pickup_burden.burden_pick","struct mi *",0);
    let clr=8;
    (tmpwin=C.callback(48,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.callback(49,(C.field(C.windowprocs,"window_procs","win_start_menu").value),tmpwin,C.u64(0));
    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    for((i=0);Number(i<C.i32((C.u64((BigInt((8*6))/BigInt(8))))));(()=>{const old=i;i=C.i32((old+1));return old;})()) {
        (burden_name=C.cell((C.staticAddress("burdentype")+Number(i)*8),"char *").value);
        (C.field(any,"any","a_int").value=C.i32((i+1)));
        C.add_menu(tmpwin,C.nul_glyphinfo,any,C.cell((burden_letters+Number(i)*1),"char").value,C.i8(0),0,clr,burden_name,0);
    }
    C.callback(50,(C.field(C.windowprocs,"window_procs","win_end_menu").value),tmpwin,C.literal("Select encumbrance level:"));
    if(Number(C.select_menu(tmpwin,1,burden_pick.address)>0)) {
        (C.field(C.flags,"flag","pickup_burden").value=C.i32((C.field(C.field(burden_pick.value,"mi","item").address,"any","a_int").value-1)));
        C.free(burden_pick.value);
    }
    C.callback(51,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tmpwin);
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function handler_pickup_types()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["handler_pickup_types.buf",(1*256)]]);
    try {
    let buf=C.automatic("handler_pickup_types.buf",(1*256));
    /* parseoptions will prompt for the list of types */
    parseoptions(C.strcpy(buf,C.literal("pickup_types")),(C.i8(0)),(C.i8(0)));
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function handler_runmode()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["handler_runmode.any",C.sizes["union any"]],["handler_runmode.mode_pick",8]]);
    try {
    let tmpwin;
    let any=C.automatic("handler_runmode.any",C.sizes["union any"]);
    let i;
    let mode_name;
    let mode_pick=C.local("handler_runmode.mode_pick","struct mi *",0);
    let clr=8;
    (tmpwin=C.callback(52,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.callback(53,(C.field(C.windowprocs,"window_procs","win_start_menu").value),tmpwin,C.u64(0));
    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    for((i=0);Number(i<C.i32((C.u64((BigInt((8*4))/BigInt(8))))));(()=>{const old=i;i=C.i32((old+1));return old;})()) {
        (mode_name=C.cell((C.staticAddress("runmodes")+Number(i)*8),"char *").value);
        (C.field(any,"any","a_int").value=C.i32((i+1)));
        C.add_menu(tmpwin,C.nul_glyphinfo,any,C.cell(mode_name,"char").value,C.i8(0),0,clr,mode_name,0);
    }
    C.callback(54,(C.field(C.windowprocs,"window_procs","win_end_menu").value),tmpwin,C.literal("Select run/travel display mode:"));
    if(Number(C.select_menu(tmpwin,1,mode_pick.address)>0)) {
        (C.field(C.flags,"flag","runmode").value=C.i32((C.field(C.field(mode_pick.value,"mi","item").address,"any","a_int").value-1)));
        C.free(mode_pick.value);
    }
    C.callback(55,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tmpwin);
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function handler_petattr()
{
    let tmp=C.query_attr(C.literal("Select pet highlight attribute"),C.field(C.iflags,"instance_flags","wc2_petattr").value);
    if(Number(tmp!=C.i32((-1)))) {
        (C.field(C.iflags,"instance_flags","wc2_petattr").value=tmp);
        (C.field(C.iflags,"instance_flags","wc_hilite_pet").value=C.i8((Number(C.field(C.iflags,"instance_flags","wc2_petattr").value!=0))));
        if(Number(!(C.field(C.go,"instance_globals_o","opt_initial").value))) (C.field(C.go,"instance_globals_o","opt_need_redraw").value=(C.i8(1)));
    }
    return C.optn_ok;
}

export function handler_sortloot()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["handler_sortloot.any",C.sizes["union any"]],["handler_sortloot.sortl_pick",8]]);
    try {
    let tmpwin;
    let any=C.automatic("handler_sortloot.any",C.sizes["union any"]);
    let i; let n;
    let sortl_name;
    let sortl_pick=C.local("handler_sortloot.sortl_pick","struct mi *",0);
    let clr=8;
    (tmpwin=C.callback(56,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.callback(57,(C.field(C.windowprocs,"window_procs","win_start_menu").value),tmpwin,C.u64(0));
    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    for((i=0);Number(i<C.i32((C.u64((BigInt((8*3))/BigInt(8))))));(()=>{const old=i;i=C.i32((old+1));return old;})()) {
        (sortl_name=C.cell((C.staticAddress("sortltype")+Number(i)*8),"char *").value);
        (C.field(any,"any","a_char").value=C.cell(sortl_name,"char").value);
        C.add_menu(tmpwin,C.nul_glyphinfo,any,C.cell(sortl_name,"char").value,C.i8(0),0,clr,sortl_name,((Number(C.i32(C.field(C.flags,"flag","sortloot").value)==C.i32(C.cell(sortl_name,"char").value)))?1:0));
    }
    C.callback(58,(C.field(C.windowprocs,"window_procs","win_end_menu").value),tmpwin,C.literal("Select loot sorting type:"));
    (n=C.select_menu(tmpwin,1,sortl_pick.address));
    if(Number(n>0)) {
        let c=C.field(C.field((sortl_pick.value+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_char").value;
        if(Number(!!(Number(n>1)&&Number(C.i32(c)==C.i32(C.field(C.flags,"flag","sortloot").value))))) (c=C.field(C.field((sortl_pick.value+Number(1)*C.sizes["struct mi"]),"mi","item").address,"any","a_char").value);
        (C.field(C.flags,"flag","sortloot").value=c);
        /* changing to or from 'f' affects persistent inventory display */
        if(C.field(C.iflags,"instance_flags","perm_invent").value) C.update_inventory();
        C.free(sortl_pick.value);
    }
    C.callback(59,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tmpwin);
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function handler_whatis_coord()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["handler_whatis_coord.any",C.sizes["union any"]],["handler_whatis_coord.buf",(1*256)],["handler_whatis_coord.window_pick",8]]);
    try {
    let tmpwin;
    let any=C.automatic("handler_whatis_coord.any",C.sizes["union any"]);
    let buf=C.automatic("handler_whatis_coord.buf",(1*256));
    let window_pick=C.local("handler_whatis_coord.window_pick","struct mi *",0);
    let pick_cnt;
    let gpc=C.i8(C.field(C.iflags,"instance_flags","getpos_coords").value);
    let clr=8;
    (tmpwin=C.callback(60,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.callback(61,(C.field(C.windowprocs,"window_procs","win_start_menu").value),tmpwin,C.u64(0));
    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    (C.field(any,"any","a_char").value=C.i8(99));
    C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(99),C.i8(0),0,clr,C.literal("compass ('east' or '3s' or '2n,4w')"),((Number(C.i32(gpc)==99))?1:0));
    (C.field(any,"any","a_char").value=C.i8(102));
    C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(102),C.i8(0),0,clr,C.literal("full compass ('east' or '3south' or '2north,4west')"),((Number(C.i32(gpc)==102))?1:0));
    (C.field(any,"any","a_char").value=C.i8(109));
    C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(109),C.i8(0),0,clr,C.literal("map <x,y>"),((Number(C.i32(gpc)==109))?1:0));
    (C.field(any,"any","a_char").value=C.i8(115));
    C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(115),C.i8(0),0,clr,C.literal("screen [row,column]"),((Number(C.i32(gpc)==115))?1:0));
    (C.field(any,"any","a_char").value=C.i8(110));
    C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(110),C.i8(0),0,clr,C.literal("none (no coordinates displayed)"),((Number(C.i32(gpc)==110))?1:0));
    C.add_menu_str(tmpwin,C.literal(""));
    C.variadic(180,buf,C.literal("map: upper-left: <%d,%d>, lower-right: <%d,%d>%s"),1,0,C.i32((80-1)),C.i32((21-1)),(C.i32(C.field(C.flags,"flag","verbose").value)?C.literal("; column 0 unused, off left edge"):C.literal("")));
    C.add_menu_str(tmpwin,buf);
    if(C.strcmp(C.field(C.windowprocs,"window_procs","name").value,C.literal("tty"))) C.add_menu_str(tmpwin,C.literal("screen: row is offset to accommodate tty interface's use of top line"));
    /* only show for non-tty */
    C.variadic(181,buf,C.literal("screen: upper-left: [%02d,%02d], lower-right: [%d,%d]%s"),C.i32((0+2)),1,C.i32((C.i32((21-1))+2)),C.i32((80-1)),(C.i32(C.field(C.flags,"flag","verbose").value)?C.literal("; column 80 is not used"):C.literal("")));
    C.add_menu_str(tmpwin,buf);
    C.add_menu_str(tmpwin,C.literal(""));
    C.callback(62,(C.field(C.windowprocs,"window_procs","win_end_menu").value),tmpwin,C.literal("Select coordinate display when auto-describing a map position:"));
    if(Number(((pick_cnt=C.select_menu(tmpwin,1,window_pick.address)))>0)) {
        (C.field(C.iflags,"instance_flags","getpos_coords").value=C.i32(C.field(C.field((window_pick.value+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_char").value));
        /* PICK_ONE doesn't unselect preselected entry when
           selecting another one */
        if(Number(!!(Number(pick_cnt>1)&&Number(C.field(C.iflags,"instance_flags","getpos_coords").value==C.i32(gpc))))) (C.field(C.iflags,"instance_flags","getpos_coords").value=C.i32(C.field(C.field((window_pick.value+Number(1)*C.sizes["struct mi"]),"mi","item").address,"any","a_char").value));
        C.free(window_pick.value);
    }
    C.callback(63,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tmpwin);
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function handler_whatis_filter()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["handler_whatis_filter.any",C.sizes["union any"]],["handler_whatis_filter.window_pick",8]]);
    try {
    let tmpwin;
    let any=C.automatic("handler_whatis_filter.any",C.sizes["union any"]);
    let window_pick=C.local("handler_whatis_filter.window_pick","struct mi *",0);
    let pick_cnt;
    let gfilt=C.i8(C.field(C.iflags,"instance_flags","getloc_filter").value);
    let clr=8;
    (tmpwin=C.callback(64,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.callback(65,(C.field(C.windowprocs,"window_procs","win_start_menu").value),tmpwin,C.u64(0));
    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    (C.field(any,"any","a_char").value=C.i8((C.i32((C.GFILTER_NONE+1)))));
    C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(110),C.i8(0),0,clr,C.literal("no filtering"),((Number(C.i32(gfilt)==C.GFILTER_NONE))?1:0));
    (C.field(any,"any","a_char").value=C.i8((C.i32((C.GFILTER_VIEW+1)))));
    C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(118),C.i8(0),0,clr,C.literal("in view only"),((Number(C.i32(gfilt)==C.GFILTER_VIEW))?1:0));
    (C.field(any,"any","a_char").value=C.i8((C.i32((C.GFILTER_AREA+1)))));
    C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(97),C.i8(0),0,clr,C.literal("in same area"),((Number(C.i32(gfilt)==C.GFILTER_AREA))?1:0));
    C.callback(66,(C.field(C.windowprocs,"window_procs","win_end_menu").value),tmpwin,C.literal("Select location filtering when going for next/previous map position:"));
    if(Number(((pick_cnt=C.select_menu(tmpwin,1,window_pick.address)))>0)) {
        (C.field(C.iflags,"instance_flags","getloc_filter").value=(C.i32((C.i32(C.field(C.field((window_pick.value+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_char").value)-1))));
        /* PICK_ONE doesn't unselect preselected entry when
           selecting another one */
        if(Number(!!(Number(pick_cnt>1)&&Number(C.field(C.iflags,"instance_flags","getloc_filter").value==C.i32(gfilt))))) (C.field(C.iflags,"instance_flags","getloc_filter").value=(C.i32((C.i32(C.field(C.field((window_pick.value+Number(1)*C.sizes["struct mi"]),"mi","item").address,"any","a_char").value)-1))));
        C.free(window_pick.value);
    }
    C.callback(67,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tmpwin);
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function handler_symset(optidx)
{
    optidx=C.i32(optidx);
    let reslt;
    (reslt=C.do_symset(C.i8(Number(optidx==C.opt_roguesymset))));
    /* symbols.c */
    (C.field(C.go,"instance_globals_o","opt_need_redraw").value=(C.i8(1)));
    return reslt;
}

export function handler_autopickup_exception()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["handler_autopickup_exception.any",C.sizes["union any"]],["handler_autopickup_exception.apebuf",(1*258)],["handler_autopickup_exception.pick_list",8]]);
    try {
    let tmpwin;
    let any=C.automatic("handler_autopickup_exception.any",C.sizes["union any"]);
    let i;
    let opt_idx; let numapes=0;
    let apebuf=C.automatic("handler_autopickup_exception.apebuf",(1*258));
    /* so &apebuf[1] is BUFSZ long for getlin() */
    let ape;
    let clr=8;
    ape_again: while(true){
        (numapes=count_apes());
        (opt_idx=handle_add_list_remove(C.literal("autopickup exception"),numapes));
        if(Number(opt_idx==3)) {
            /* done */
            return C.i32((C.i8(1)));
        } else if(Number(opt_idx==0)) {
            /* add new */
            /* EDIT_GETLIN:  assume user doesn't user want previous
           exception used as default input string for this one... */
            (C.cell((apebuf+Number(0)*1),"char").value=(C.cell((apebuf+Number(1)*1),"char").value=C.i8(0)));
            C.getlin(C.literal("What new autopickup exception pattern?"),(apebuf+Number(1)*1));
            C.mungspaces((apebuf+Number(1)*1));
            /* regularize whitespace */
            if(Number(C.i32(C.cell((apebuf+Number(1)*1),"char").value)==27)) return C.i32((C.i8(1)));
            if(C.cell((apebuf+Number(1)*1),"char").value) {
                (C.cell((apebuf+Number(0)*1),"char").value=C.i8(34));
                /* guarantee room for \" prefix and \"\0 suffix;
               -2 is good enough for apebuf[] but -3 makes
               sure the whole thing fits within normal BUFSZ */
                (C.cell((apebuf+Number(C.u64((BigInt((1*258))-C.u64(2))))*1),"char").value=C.i8(0));
                C.strcat(apebuf,C.literal("\""));
                add_autopickup_exception(apebuf);
            }
            continue ape_again; /* source goto ape_again */
        } else {
            /* list (1) or remove (2) */
            let pick_idx; let pick_cnt;
            let pick_list=C.local("handler_autopickup_exception.pick_list","struct mi *",0);
            (tmpwin=C.callback(68,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
            C.callback(69,(C.field(C.windowprocs,"window_procs","win_start_menu").value),tmpwin,C.u64(0));
            if(numapes) {
                (ape=C.field(C.ga,"instance_globals_a","apelist").value);
                C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
                C.add_menu_heading(tmpwin,C.literal("Always pickup '<'; never pickup '>'"));
                for((i=0);Number(!!(Number(i<numapes)&&ape));(()=>{const old=i;i=C.i32((old+1));return old;})()) {
                    (C.field(any,"any","a_void").value=((Number(opt_idx==1))?0:ape));
                    /* length of pattern plus quotes (plus '<'/'>') is
                   less than BUFSZ */
                    C.variadic(182,apebuf,C.literal("\"%c%s\""),(C.i32(C.field(ape,"autopickup_exception","grab").value)?60:62),C.field(ape,"autopickup_exception","pattern").value);
                    C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(0),C.i8(0),0,clr,apebuf,0);
                    (ape=C.field(ape,"autopickup_exception","next").value);
                }
            }
            C.variadic(183,apebuf,C.literal("%s autopickup exceptions"),((Number(opt_idx==1))?C.literal("List of"):C.literal("Remove which")));
            C.callback(70,(C.field(C.windowprocs,"window_procs","win_end_menu").value),tmpwin,apebuf);
            (pick_cnt=C.select_menu(tmpwin,((Number(opt_idx==1))?0:2),pick_list.address));
            if(Number(pick_cnt>0)) {
                for((pick_idx=0);Number(pick_idx<pick_cnt);(()=>{const old=pick_idx;pick_idx=C.i32((old+1));return pick_idx;})()) remove_autopickup_exception(C.field(C.field((pick_list.value+Number(pick_idx)*C.sizes["struct mi"]),"mi","item").address,"any","a_void").value);

                (C.free(pick_list.value),(pick_list.value=0));
            }
            C.callback(71,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tmpwin);
            if(Number(pick_cnt>=0)) continue ape_again; /* source goto ape_again */
        }
        return C.optn_ok;
        break ape_again;
    }
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function handler_menu_colors()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["handler_menu_colors.any",C.sizes["union any"]],["handler_menu_colors.buf",(1*256)],["handler_menu_colors.mcbuf",(1*256)],["handler_menu_colors.pick_list",8],["handler_menu_colors.clrbuf",(1*128)]]);
    try {
    let tmpwin;
    let any=C.automatic("handler_menu_colors.any",C.sizes["union any"]);
    let buf=C.automatic("handler_menu_colors.buf",(1*256));
    let opt_idx; let nmc; let mcclr; let mcattr;
    let mcbuf=C.automatic("handler_menu_colors.mcbuf",(1*256));
    let clr=8;
    menucolors_again: while(true){
        menucolors_done: {
            (nmc=C.count_menucolors());
            (opt_idx=handle_add_list_remove(C.literal("menucolor"),nmc));
            if(Number(opt_idx==3)) break menucolors_done; else if(Number(opt_idx==0)) {
                /* done */
                /* in case we've made a change which impacts current persistent
           inventory window; we don't track whether an actual changed
           occurred, so just assume there was one and that it matters;
           if we're wrong, a redundant update is cheap... */
                /* add new */
                (C.cell((mcbuf+Number(0)*1),"char").value=C.i8(0));
                C.getlin(C.literal("What new menucolor pattern?"),mcbuf);
                if(Number(C.i32(C.cell(mcbuf,"char").value)==27)) break menucolors_done; /* source goto menucolors_done */
                if(Number(!!(Number(!!(Number(!!(Number(!!(C.i32(C.cell(mcbuf,"char").value)&&C.i32(test_regex_pattern(mcbuf,C.literal("MENUCOLORS regex")))))&&Number(((mcclr=C.query_color(0,8)))!=C.i32((-1)))))&&Number(((mcattr=C.query_attr(0,0)))!=C.i32((-1)))))&&Number(!(C.add_menu_coloring_parsed(mcbuf,mcclr,mcattr)))))) {
                    C.variadic(184,C.literal("Error adding the menu color."));
                    C.callback(72,(C.field(C.windowprocs,"window_procs","win_wait_synch").value));
                }
                continue menucolors_again; /* source goto menucolors_again */
            } else {
                /* list (1) or remove (2) */
                let pick_idx; let pick_cnt;
                let mc_idx;
                let ln;
                let sattr; let sclr;
                let pick_list=C.local("handler_menu_colors.pick_list","struct mi *",0);
                let tmp=C.field(C.gm,"instance_globals_m","menu_colorings").value;
                let clrbuf=C.automatic("handler_menu_colors.clrbuf",(1*128));
                (tmpwin=C.callback(73,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
                C.callback(74,(C.field(C.windowprocs,"window_procs","win_start_menu").value),tmpwin,C.u64(0));
                C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
                (mc_idx=0);
                while(tmp) {
                    (sattr=C.attr2attrname(C.field(tmp,"menucoloring","attr").value));
                    (sclr=C.strcpy(clrbuf,C.clr2colorname(C.field(tmp,"menucoloring","color").value)));
                    C.strNsubst(clrbuf,C.literal(" "),C.literal("-"),0);
                    (C.field(any,"any","a_int").value=(()=>{const old=mc_idx;mc_idx=C.i32((old+1));return mc_idx;})());
                    /* construct suffix */
                    C.variadic(185,buf,C.literal("\"\"=%s%s%s"),sclr,((Number(C.field(tmp,"menucoloring","attr").value!=0))?C.literal("&"):C.literal("")),((Number(C.field(tmp,"menucoloring","attr").value!=0))?sattr:C.literal("")));
                    /* now main string */
                    (ln=C.u32(C.u64((C.u64((BigInt((1*256))-C.u64(C.Strlen_(buf,(C.literal("handler_menu_colors")),6470))))-C.u64(1)))));
                    /* length available */
                    C.strcpy(mcbuf,C.literal("\""));
                    if(Number(C.strlen(C.field(tmp,"menucoloring","origstr").value)>C.u64(ln))) C.strcat(C.strncat(mcbuf,C.field(tmp,"menucoloring","origstr").value,C.u64(C.u32((ln-C.u32(3))))),C.literal("..."));
 else C.strcat(mcbuf,C.field(tmp,"menucoloring","origstr").value);
                    /* combine main string and suffix */
                    C.strcat(mcbuf,(buf+Number(1)*1));
                    /* skip buf[]'s initial quote */
                    C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(0),C.i8(0),0,clr,mcbuf,0);
                    (tmp=C.field(tmp,"menucoloring","next").value);
                }
                C.variadic(186,mcbuf,C.literal("%s menu colors"),((Number(opt_idx==1))?C.literal("List of"):C.literal("Remove which")));
                C.callback(75,(C.field(C.windowprocs,"window_procs","win_end_menu").value),tmpwin,mcbuf);
                (pick_cnt=C.select_menu(tmpwin,((Number(opt_idx==1))?0:2),pick_list.address));
                if(Number(pick_cnt>0)) {
                    for((pick_idx=0);Number(pick_idx<pick_cnt);(()=>{const old=pick_idx;pick_idx=C.i32((old+1));return pick_idx;})()) C.free_one_menu_coloring(C.i32((C.i32((C.field(C.field((pick_list.value+Number(pick_idx)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value-1))-pick_idx)));

                    (C.free(pick_list.value),(pick_list.value=0));
                }
                C.callback(76,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tmpwin);
                if(Number(pick_cnt>=0)) continue menucolors_again; /* source goto menucolors_again */
            }

            return C.optn_ok;
        }
        if(C.field(C.iflags,"instance_flags","use_menu_color").value) {
            if(C.field(C.iflags,"instance_flags","perm_invent").value) C.update_inventory();
        }
        return C.optn_ok;
        break menucolors_again;
    }
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function handler_msgtype()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["handler_msgtype.any",C.sizes["union any"]],["handler_msgtype.mtbuf",(1*256)],["handler_msgtype.pick_list",8]]);
    try {
    let tmpwin;
    let any=C.automatic("handler_msgtype.any",C.sizes["union any"]);
    let opt_idx; let nmt; let mttyp;
    let mtbuf=C.automatic("handler_msgtype.mtbuf",(1*256));
    msgtypes_again: while(true){
        (nmt=msgtype_count());
        (opt_idx=handle_add_list_remove(C.literal("message type"),nmt));
        if(Number(opt_idx==3)) {
            /* done */
            return C.i32((C.i8(1)));
        } else if(Number(opt_idx==0)) {
            /* add new */
            (C.cell((mtbuf+Number(0)*1),"char").value=C.i8(0));
            C.getlin(C.literal("What new message pattern?"),mtbuf);
            if(Number(C.i32(C.cell(mtbuf,"char").value)==27)) return C.i32((C.i8(1)));
            if(Number(!!(Number(!!(Number(!!(C.i32(C.cell(mtbuf,"char").value)&&C.i32(test_regex_pattern(mtbuf,C.literal("MSGTYPE regex")))))&&Number(((mttyp=query_msgtype()))!=C.i32((-1)))))&&Number(!(msgtype_add(mttyp,mtbuf)))))) {
                C.variadic(187,C.literal("Error adding the message type."));
                C.callback(77,(C.field(C.windowprocs,"window_procs","win_wait_synch").value));
            }
            continue msgtypes_again; /* source goto msgtypes_again */
        } else {
            /* list (1) or remove (2) */
            let pick_idx; let pick_cnt;
            let mt_idx;
            let ln;
            let mtype;
            let pick_list=C.local("handler_msgtype.pick_list","struct mi *",0);
            let tmp=C.field(C.gp,"instance_globals_p","plinemsg_types").value;
            let clr=8;
            (tmpwin=C.callback(78,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
            C.callback(79,(C.field(C.windowprocs,"window_procs","win_start_menu").value),tmpwin,C.u64(0));
            C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
            (mt_idx=0);
            while(tmp) {
                (mtype=msgtype2name(C.i32(C.field(tmp,"plinemsg_type","msgtype").value)));
                (C.field(any,"any","a_int").value=(()=>{const old=mt_idx;mt_idx=C.i32((old+1));return mt_idx;})());
                C.variadic(188,mtbuf,C.literal("%-5s \""),mtype);
                (ln=C.u32(C.u64((C.u64((BigInt((1*256))-C.u64(C.Strlen_(mtbuf,(C.literal("handler_msgtype")),6544))))-BigInt((1*2))))));
                if(Number(C.strlen(C.field(tmp,"plinemsg_type","pattern").value)>C.u64(ln))) C.strcat(C.strncat(mtbuf,C.field(tmp,"plinemsg_type","pattern").value,C.u64(C.u32((ln-C.u32(3))))),C.literal("...\""));
 else C.strcat(C.strcat(mtbuf,C.field(tmp,"plinemsg_type","pattern").value),C.literal("\""));
                C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(0),C.i8(0),0,clr,mtbuf,0);
                (tmp=C.field(tmp,"plinemsg_type","next").value);
            }
            C.variadic(189,mtbuf,C.literal("%s message types"),((Number(opt_idx==1))?C.literal("List of"):C.literal("Remove which")));
            C.callback(80,(C.field(C.windowprocs,"window_procs","win_end_menu").value),tmpwin,mtbuf);
            (pick_cnt=C.select_menu(tmpwin,((Number(opt_idx==1))?0:2),pick_list.address));
            if(Number(pick_cnt>0)) {
                for((pick_idx=0);Number(pick_idx<pick_cnt);(()=>{const old=pick_idx;pick_idx=C.i32((old+1));return pick_idx;})()) free_one_msgtype(C.i32((C.i32((C.field(C.field((pick_list.value+Number(pick_idx)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value-1))-pick_idx)));

                (C.free(pick_list.value),(pick_list.value=0));
            }
            C.callback(81,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tmpwin);
            if(Number(pick_cnt>=0)) continue msgtypes_again; /* source goto msgtypes_again */
        }
        return C.optn_ok;
        break msgtypes_again;
    }
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function handler_versinfo()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["handler_versinfo.any",C.sizes["union any"]],["handler_versinfo.vi_pick",8]]);
    try {
    let tmpwin;
    let any=C.automatic("handler_versinfo.any",C.sizes["union any"]);
    let vi_pick=C.local("handler_versinfo.vi_pick","struct mi *",0);
    let have_branch=C.i8((Number(!!(C.field(C.nomakedefs,"nomakedefs_s","git_branch").value&&C.i32(C.cell(C.field(C.nomakedefs,"nomakedefs_s","git_branch").value,"char").value)))));
    let n; let vi=C.i32(C.field(C.flags,"flag","versinfo").value);
    (tmpwin=C.callback(82,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.callback(83,(C.field(C.windowprocs,"window_procs","win_start_menu").value),tmpwin,C.u64(0));
    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    (C.field(any,"any","a_int").value=(n=1));
    /* 1 */
    C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(110),C.i8(C.i32((n+48))),0,8,C.literal("version number"),((C.i32((vi&n)))?1:0));
    (C.field(any,"any","a_int").value=(n=2));
    /* 2 */
    C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(103),C.i8(C.i32((n+48))),0,8,C.literal("game name"),((C.i32((vi&n)))?1:0));
    (C.field(any,"any","a_int").value=(n=4));
    /* 4 */
    C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(98),C.i8(C.i32((n+48))),0,8,((C.i32(have_branch)?C.literal("development branch"):C.literal("(not applicable)"))),((C.i32((vi&n)))?1:0));
    C.callback(84,(C.field(C.windowprocs,"window_procs","win_end_menu").value),tmpwin,C.literal("Select version information flags:"));
    (n=C.select_menu(tmpwin,2,vi_pick.address));
    if(Number(n>0)) {
        let i; let newval=0;
        for((i=0);Number(i<n);(()=>{const old=i;i=C.i32((old+1));return i;})()) (newval=C.i32(newval|C.field(C.field((vi_pick.value+Number(i)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value));

        (newval=C.i32(newval&7));
        if(newval) (C.field(C.flags,"flag","versinfo").value=C.u32(newval));
        C.free(vi_pick.value);
    }
    C.callback(85,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tmpwin);
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function handler_windowborders()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["handler_windowborders.any",C.sizes["union any"]],["handler_windowborders.mode_pick",8]]);
    try {
    let tmpwin;
    let any=C.automatic("handler_windowborders.any",C.sizes["union any"]);
    let i;
    let mode_name;
    let mode_pick=C.local("handler_windowborders.mode_pick","struct mi *",0);
    let clr=8;
    
    (tmpwin=C.callback(86,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.callback(87,(C.field(C.windowprocs,"window_procs","win_start_menu").value),tmpwin,C.u64(0));
    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    for((i=0);Number(i<C.i32((C.u64((BigInt((8*5))/BigInt(8))))));(()=>{const old=i;i=C.i32((old+1));return old;})()) {
        (mode_name=C.cell((C.staticAddress("handler_windowborders.windowborders_text")+Number(i)*8),"char *").value);
        (C.field(any,"any","a_int").value=C.i32((i+1)));
        /* index 'i' matches the numeric setting for windowborders,
           so allow corresponding digit as group accelerator */
        C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(C.i32((97+i))),C.i8(C.i32((48+i))),0,clr,mode_name,0);
    }
    C.callback(88,(C.field(C.windowprocs,"window_procs","win_end_menu").value),tmpwin,C.literal("Select window borders mode:"));
    if(Number(C.select_menu(tmpwin,1,mode_pick.address)>0)) {
        (C.field(C.iflags,"instance_flags","wc2_windowborders").value=C.i32((C.field(C.field(mode_pick.value,"mi","item").address,"any","a_int").value-1)));
        C.free(mode_pick.value);
    }
    C.callback(89,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tmpwin);
    return C.optn_ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/*
 **********************************
 *
 *   Parsing Support Functions
 *
 **********************************
 */
export function string_for_opt(opts,val_optional)
{
    opts=C.ptr(opts);
    val_optional=C.i8(val_optional);
    let colon; let equals;
    (colon=C.strchr(opts,58));
    (equals=C.strchr(opts,61));
    if(Number(!!(Number(!(colon))||(Number(!!(equals&&Number(equals<colon))))))) (colon=equals);
    if(Number(!!(Number(!(colon))||Number(!(C.cell((()=>{const old=colon;colon=C.ptr((old+Number(1)));return colon;})(),"char").value))))) {
        if(Number(!(val_optional))) C.variadic(190,C.literal("Missing parameter for '%s'"),opts);
        return C.staticAddress("empty_optstr");
    }
    return colon;
}

export function string_for_env_opt(optname,opts,val_optional)
{
    optname=C.ptr(optname);
    opts=C.ptr(opts);
    val_optional=C.i8(val_optional);
    if(Number(!(C.field(C.go,"instance_globals_o","opt_initial").value))) {
        rejectoption(optname);
        return C.staticAddress("empty_optstr");
    }
    return string_for_opt(opts,val_optional);
}

export function bad_negation(optname,with_parameter)
{
    optname=C.ptr(optname);
    with_parameter=C.i8(with_parameter);
    C.variadic(191,C.literal("The %s option may not %sbe negated."),optname,(C.i32(with_parameter)?C.literal("both have a value and "):C.literal("")));
}

/* go through all of the options and set the minmatch value
   based on what is needed for uniqueness of each individual
   option. Set a minimum of 3 characters. */
export function determine_ambiguities()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["determine_ambiguities.needed",(4*218)]]);
    try {
    let i; let j; let len; let tmpneeded; let needed=C.automatic("determine_ambiguities.needed",(4*218));
    let p1; let p2;
    for((i=0);Number(i<C.i32((C.i32((C.u64((BigInt((C.sizes["struct allopt_t"]*218))/BigInt(C.sizes["struct allopt_t"])))))-1)));(()=>{const old=i;i=C.i32((old+1));return i;})()) {
        (C.cell((needed+Number(i)*4),"int").value=0);
    }
    for((i=0);Number(i<C.i32((C.i32((C.u64((BigInt((C.sizes["struct allopt_t"]*218))/BigInt(C.sizes["struct allopt_t"])))))-1)));(()=>{const old=i;i=C.i32((old+1));return i;})()) {
        for((j=0);Number(j<C.i32((C.i32((C.u64((BigInt((C.sizes["struct allopt_t"]*218))/BigInt(C.sizes["struct allopt_t"])))))-1)));(()=>{const old=j;j=C.i32((old+1));return j;})()) {
            if(Number(j==i)) continue;
            (p1=C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","name").value);
            /* back to the start */
            (p2=C.field((C.staticAddress("allopt")+Number(j)*C.sizes["struct allopt_t"]),"allopt_t","name").value);
            (tmpneeded=1);
            while(Number(!!(Number(!!(C.i32(C.cell(p1,"char").value)&&C.i32(C.cell(p2,"char").value)))&&Number(C.i32(C.lowc(C.cell(p1,"char").value))==C.i32(C.lowc(C.cell(p2,"char").value)))))) {
                (()=>{const old=tmpneeded;tmpneeded=C.i32((old+1));return tmpneeded;})();
                (()=>{const old=p1;p1=C.ptr((old+Number(1)));return p1;})();
                (()=>{const old=p2;p2=C.ptr((old+Number(1)));return p2;})();
            }
            if(Number(tmpneeded>C.cell((needed+Number(i)*4),"int").value)) (C.cell((needed+Number(i)*4),"int").value=tmpneeded);
            if(Number(tmpneeded>C.cell((needed+Number(j)*4),"int").value)) (C.cell((needed+Number(j)*4),"int").value=tmpneeded);
        }
    }
    for((i=0);Number(i<C.i32((C.i32((C.u64((BigInt((C.sizes["struct allopt_t"]*218))/BigInt(C.sizes["struct allopt_t"])))))-1)));(()=>{const old=i;i=C.i32((old+1));return i;})()) {
        (len=C.i32(C.Strlen_(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","name").value,(C.literal("determine_ambiguities")),6732)));
        (C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","minmatch").value=((Number(C.cell((needed+Number(i)*4),"int").value<3))?3:((Number(C.cell((needed+Number(i)*4),"int").value<=len))?C.cell((needed+Number(i)*4),"int").value:len)));
    }
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function length_without_val(user_string,len)
{
    user_string=C.ptr(user_string);
    len=C.i32(len);
    let p=C.strchr(user_string,58); let q=C.strchr(user_string,61);
    if(Number(!!(Number(!(p))||(Number(!!(q&&Number(q<p))))))) (p=q);
    if(p) {
        /* 'user_string' hasn't necessarily been through mungspaces()
           so might have tabs or consecutive spaces */
        while(Number(!!(Number(p>user_string)&&C.__isspace(C.i32(C.u8(C.cell(((p-Number(1)*1)),"char").value)))))) (()=>{const old=p;p=C.ptr((old-Number(1)));return old;})();

        (len=C.i32((C.i64(((p-user_string)/1)))));
    }
    return len;
}

/* check whether a user-supplied option string is a proper leading
   substring of a particular option name; option string might have
   a colon or equals sign and arbitrary value appended to it */
export function match_optname(user_string,optn_name,min_length,val_allowed)
{
    user_string=C.ptr(user_string);
    optn_name=C.ptr(optn_name);
    min_length=C.i32(min_length);
    val_allowed=C.i8(val_allowed);
    let len=C.i32(C.strlen(user_string));
    if(val_allowed) (len=length_without_val(user_string,len));
    return C.i8((Number(!!(Number(len>=min_length)&&Number(!(C.strncmpi(optn_name,user_string,len)))))));
}

export function reset_duplicate_opt_detection()
{
    let k;
    for((k=0);Number(k<C.OPTCOUNT);(()=>{const old=k;k=C.i32((old+1));return k;})()) (C.field((C.staticAddress("allopt")+Number(k)*C.sizes["struct allopt_t"]),"allopt_t","dupdetected").value=C.i8(0));

}

export function duplicate_opt_detection(optidx)
{
    optidx=C.i32(optidx);
    if(Number(!!(C.i32(C.field(C.go,"instance_globals_o","opt_initial").value)&&C.i32(C.field(C.go,"instance_globals_o","opt_from_file").value)))) return (()=>{const ref=C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","dupdetected");const old=ref.value;ref.value=C.i8((old+1));return old;})();
    return (C.i8(0));
}

export function complain_about_duplicate(optidx)
{
    optidx=C.i32(optidx);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["complain_about_duplicate.buf",(1*256)]]);
    try {
    let buf=C.automatic("complain_about_duplicate.buf",(1*256));
    /* the Mac has trouble dealing with the output of messages while
     * processing the config file.  That should get fixed one day.
     * For now just return.
     */
    /* !MACOS9 */
    (C.cell((buf+Number(0)*1),"char").value=C.i8(0));
    if(C.cell(C.staticAddress("using_alias"),"signed char").value) C.variadic(192,buf,C.literal(" (via alias: %s)"),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","alias").value);
    C.variadic(193,C.literal("%s option specified multiple times: %s%s"),((Number(C.u32(C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","opttyp").value)==C.u32(C.CompOpt)))?C.literal("compound"):C.literal("boolean")),C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","name").value,buf);
    /* ?MACOS9 */
    return;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function rejectoption(optname)
{
    optname=C.ptr(optname);
    C.variadic(194,C.literal("%s can be set only from NETHACKOPTIONS or %s."),optname,C.get_configfile());
}

/*

# errors:
OPTIONS=aaaaaaaaaa[ more than 247 (255 - 8 for 'OPTIONS=') total ]aaaaaaaaaa
OPTIONS
OPTIONS=
MSGTYPE=stop"You swap places with "
MSGTYPE=st.op "You swap places with "
MSGTYPE=stop "You swap places with \"
MENUCOLOR=" blessed "green&none
MENUCOLOR=" holy " = green&reverse
MENUCOLOR=" cursed " = red&uline
MENUCOLOR=" unholy " = reed
OPTIONS=!legacy:true,fooo
OPTIONS=align:!pin
OPTIONS=gender

*/
/* most environment variables will eventually be printed in an error
 * message if they don't work, and most error message paths go through
 * BUFSZ buffers, which could be overflowed by a maliciously long
 * environment variable.  If a variable can legitimately be long, or
 * if it's put in a smaller buffer, the responsible code will have to
 * bounds-check itself.
 */
export function nh_getenv(ev)
{
    ev=C.ptr(ev);
    let getev=C.getenv(ev);
    if(Number(!!(getev&&Number(C.strlen(getev)<=C.u64((C.i32(Math.trunc((256/2))))))))) return getev;
 else return 0;
}

/* copy up to maxlen-1 characters; 'dest' must be able to hold maxlen;
   treat comma as alternate end of 'src' */
export function nmcpy(dest,src,maxlen)
{
    dest=C.ptr(dest);
    src=C.ptr(src);
    maxlen=C.i32(maxlen);
    let count;
    for((count=1);Number(count<maxlen);(()=>{const old=count;count=C.i32((old+1));return old;})()) {
        if(Number(!!(Number(C.i32(C.cell(src,"char").value)==44)||Number(C.i32(C.cell(src,"char").value)==0)))) break;
        /*exit on \0 terminator*/
        (C.cell((()=>{const old=dest;dest=C.ptr((old+Number(1)));return old;})(),"char").value=C.cell((()=>{const old=src;src=C.ptr((old+Number(1)));return old;})(),"char").value);
    }
    (C.cell(dest,"char").value=C.i8(0));
}

/*
 * escapes(): escape expansion for showsyms.  C-style escapes understood
 * include \n, \b, \t, \r, \xnnn (hex), \onnn (octal), \nnn (decimal).
 * (Note: unlike in C, leading digit 0 is not used to indicate octal;
 * the letter o (either upper or lower case) is used for that.
 * The ^-prefix for control characters is also understood, and \[mM]
 * has the effect of 'meta'-ing the value which follows (so that the
 * alternate character set will be enabled).
 *
 * X     normal key X
 * ^X    control-X
 * \mX   meta-X
 *
 * For 3.4.3 and earlier, input ending with "\M", backslash, or caret
 * prior to terminating '\0' would pull that '\0' into the output and then
 * keep processing past it, potentially overflowing the output buffer.
 * Now, trailing \ or ^ will act like \\ or \^ and add '\\' or '^' to the
 * output and stop there; trailing \M will fall through to \<other> and
 * yield 'M', then stop.  Any \X or \O followed by something other than
 * an appropriate digit will also fall through to \<other> and yield 'X'
 * or 'O', plus stop if the non-digit is end-of-string.
 */
export function escapes(cp,tp)
{
    cp=C.ptr(cp);
    tp=C.ptr(tp);
    /* might be 'tp', updating in place */
    /* result is never longer than 'cp' */
    
    /* hexdd[] is defined in decl.c */
    let dp;
    let cval; let meta; let dcount;
    while(C.cell(cp,"char").value) {
        /* \M has to be followed by something to do meta conversion,
           otherwise it will just be \M which ultimately yields 'M' */
        (meta=(Number(!!(Number(!!(Number(C.i32(C.cell(cp,"char").value)==92)&&(Number(!!(Number(C.i32(C.cell((cp+Number(1)*1),"char").value)==109)||Number(C.i32(C.cell((cp+Number(1)*1),"char").value)==77))))))&&C.i32(C.cell((cp+Number(2)*1),"char").value)))));
        if(meta) (cp=C.ptr(cp+Number(2)*1));
        (cval=(dcount=0));
        /* for decimal, octal, hexadecimal cases */
        if(Number(!!((Number(!!(Number(C.i32(C.cell(cp,"char").value)!=92)&&Number(C.i32(C.cell(cp,"char").value)!=94))))||Number(!(C.cell((cp+Number(1)*1),"char").value))))) {
            /* simple character, or nothing left for \ or ^ to escape */
            (cval=C.i32(C.cell((()=>{const old=cp;cp=C.ptr((old+Number(1)));return old;})(),"char").value));
        } else if(Number(C.i32(C.cell(cp,"char").value)==94)) {
            /* expand control-character syntax */
            (cval=(C.i32((C.i32(C.cell((()=>{const old=cp;cp=C.ptr((old+Number(1)));return cp;})(),"char").value)&31))));
            (()=>{const old=cp;cp=C.ptr((old+Number(1)));return cp;})();
            /* remaining cases are all for backslash; we know cp[1] is not \0 */
        } else if(C.strchr(C.staticAddress("escapes.dec"),C.i32(C.cell((cp+Number(1)*1),"char").value))) {
            (()=>{const old=cp;cp=C.ptr((old+Number(1)));return cp;})();
            /* move past backslash to first digit */
            do {
                (cval=C.i32(((C.i32((cval*10)))+(C.i32((C.i32(C.cell(cp,"char").value)-48))))));
            } while(Number(!!(Number(!!(C.i32(C.cell((()=>{const old=cp;cp=C.ptr((old+Number(1)));return cp;})(),"char").value)&&C.strchr(C.staticAddress("escapes.dec"),C.i32(C.cell(cp,"char").value))))&&Number((()=>{const old=dcount;dcount=C.i32((old+1));return dcount;})()<3))));
        } else if(Number(!!(Number(!!((Number(!!(Number(C.i32(C.cell((cp+Number(1)*1),"char").value)==111)||Number(C.i32(C.cell((cp+Number(1)*1),"char").value)==79))))&&C.i32(C.cell((cp+Number(2)*1),"char").value)))&&C.strchr(C.staticAddress("escapes.oct"),C.i32(C.cell((cp+Number(2)*1),"char").value))))) {
            (cp=C.ptr(cp+Number(2)*1));
            /* move past backslash and 'O' */
            do {
                (cval=C.i32(((C.i32((cval*8)))+(C.i32((C.i32(C.cell(cp,"char").value)-48))))));
            } while(Number(!!(Number(!!(C.i32(C.cell((()=>{const old=cp;cp=C.ptr((old+Number(1)));return cp;})(),"char").value)&&C.strchr(C.staticAddress("escapes.oct"),C.i32(C.cell(cp,"char").value))))&&Number((()=>{const old=dcount;dcount=C.i32((old+1));return dcount;})()<3))));
        } else if(Number(!!(Number(!!((Number(!!(Number(C.i32(C.cell((cp+Number(1)*1),"char").value)==120)||Number(C.i32(C.cell((cp+Number(1)*1),"char").value)==88))))&&C.i32(C.cell((cp+Number(2)*1),"char").value)))&&Number(((dp=C.strchr(C.hexdd,C.i32(C.cell((cp+Number(2)*1),"char").value))))!=0)))) {
            (cp=C.ptr(cp+Number(2)*1));
            /* move past backslash and 'X' */
            do {
                (cval=C.i32(((C.i32((cval*16)))+(C.i32(Math.trunc((C.i32((C.i64(((dp-C.hexdd)/1))))/2)))))));
            } while(Number(!!(Number(!!(C.i32(C.cell((()=>{const old=cp;cp=C.ptr((old+Number(1)));return cp;})(),"char").value)&&Number(((dp=C.strchr(C.hexdd,C.i32(C.cell(cp,"char").value))))!=0)))&&Number((()=>{const old=dcount;dcount=C.i32((old+1));return dcount;})()<2))));
        } else {
            /* C-style character escapes */
            switch(C.i32(C.cell((()=>{const old=cp;cp=C.ptr((old+Number(1)));return cp;})(),"char").value)) {
                case (92):
                    (cval=92);
                break;
                case (110):
                    (cval=10);
                break;
                case (116):
                    (cval=9);
                break;
                case (98):
                    (cval=8);
                break;
                case (114):
                    (cval=13);
                break;
                default:
                    (cval=C.i32(C.cell(cp,"char").value));
            }
            (()=>{const old=cp;cp=C.ptr((old+Number(1)));return cp;})();
        }
        if(meta) (cval=C.i32(cval|128));
        (C.cell((()=>{const old=tp;tp=C.ptr((old+Number(1)));return old;})(),"char").value=C.i8(cval));
    }
    (C.cell(tp,"char").value=C.i8(0));
}

/* returns a one-byte character from the text; may change txt[];
   moved from cmd.c in order to get access to escapes() */
export function txt2key(txt)
{
    txt=C.ptr(txt);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["txt2key.tbuf",(1*128)]]);
    try {
    let uc;
    let makemeta=(C.i8(0));
    (txt=C.trimspaces(txt));
    if(Number(!(C.cell(txt,"char").value))) return C.u8(0);
    /* simple character */
    if(Number(!(C.cell((txt+Number(1)*1),"char").value))) return C.u8(C.cell((txt+Number(0)*1),"char").value);
    /* a few special entries */
    if(Number(!(C.strcmp(txt,C.literal("<enter>"))))) return C.u8(10);
    if(Number(!(C.strcmp(txt,C.literal("<space>"))))) return C.u8(32);
    if(Number(!(C.strcmp(txt,C.literal("<esc>"))))) return C.u8(27);
    /* handle things like \b and \7 and \mX */
    if(Number(C.i32(C.cell(txt,"char").value)==92)) {
        let tbuf=C.automatic("txt2key.tbuf",(1*128));
        if(Number(C.strlen(txt)>=BigInt((1*128)))) (C.cell((txt+Number(C.u64((BigInt((1*128))-C.u64(1))))*1),"char").value=C.i8(0));
        escapes(txt,tbuf);
        return C.u8(C.cell(tbuf,"char").value);
    }
    /* control and meta keys */
    if(Number(C.i32(C.highc(C.cell(txt,"char").value))==77)) {
        /*
         * M <nothing>             return 'M'
         * M - <nothing>           return M-'-'
         * M <other><nothing>      return M-<other>
         * otherwise M is pending until after ^/C- processing.
         * Since trailing spaces are discarded, the only way to
         * specify M-' ' is via "160".
         */
        if(Number(!(C.cell((txt+Number(1)*1),"char").value))) return C.u8(C.cell(txt,"char").value);
        /* skip past 'M' or 'm' and maybe '-' */
        (()=>{const old=txt;txt=C.ptr((old+Number(1)));return txt;})();
        if(Number(!!(Number(C.i32(C.cell(txt,"char").value)==45)&&C.i32(C.cell((txt+Number(1)*1),"char").value)))) (()=>{const old=txt;txt=C.ptr((old+Number(1)));return txt;})();
        if(Number(!(C.cell((txt+Number(1)*1),"char").value))) return C.u8((C.i32((C.i32((C.u8(C.cell(txt,"char").value)))-128))));
        (makemeta=(C.i8(1)));
    }
    if(Number(!!(Number(C.i32(C.cell(txt,"char").value)==94)||Number(C.i32(C.highc(C.cell(txt,"char").value))==67)))) {
        /*
         * C <nothing>             return 'C' or M-'C'
         * C - <nothing>           return '-' or M-'-'
         * C [-] <other><nothing>  return C-<other> or M-C-<other>
         * C [-] ?                 return <rubout>
         * otherwise return C-<other> or M-C-<other>
         */
        (uc=C.u8(C.cell(txt,"char").value));
        if(Number(!(C.cell((txt+Number(1)*1),"char").value))) return C.u8((C.i32(makemeta)?(C.i32((C.i32((uc))-128))):C.i32(uc)));
        (()=>{const old=txt;txt=C.ptr((old+Number(1)));return txt;})();
        /* unlike M-x, lots of values of x are invalid for C-x;
           checking and rejecting them is not worthwhile; GIGO;
           we do accept "^-x" as synonym for "^x" or "C-x" */
        if(Number(!!(Number(C.i32(C.cell(txt,"char").value)==45)&&C.i32(C.cell((txt+Number(1)*1),"char").value)))) (()=>{const old=txt;txt=C.ptr((old+Number(1)));return txt;})();
        /* and accept ^?, which gets used despite not being a control char */
        if(Number(C.i32(C.cell(txt,"char").value)==63)) return C.u8(((C.i32(makemeta)?4294967295:127)));
        /* rubout/delete */
        (uc=C.u8((C.i32((31&C.i32((C.u8(C.cell(txt,"char").value))))))));
        return C.u8((C.i32(makemeta)?(C.i32((C.i32((uc))-128))):C.i32(uc)));
    }
    if(Number(!!(C.i32(makemeta)&&C.i32(C.cell(txt,"char").value)))) return C.u8((C.i32((C.i32((C.u8(C.cell(txt,"char").value)))-128))));
    /* FIXME: should accept single-quote single-character single-quote
       and probably single-quote backslash octal-digits single-quote;
       if we do that, the M- and C- results should be pending until
       after, so that C-'X' becomes valid for ^X */
    /* ascii codes: must be three-digit decimal */
    if(Number(!!(Number(C.i32(C.cell(txt,"char").value)>=48)&&Number(C.i32(C.cell(txt,"char").value)<=57)))) {
        let key=C.u8(0);
        let i;
        for((i=0);Number(i<3);(()=>{const old=i;i=C.i32((old+1));return old;})()) {
            if(Number(!!(Number(C.i32(C.cell((txt+Number(i)*1),"char").value)<48)||Number(C.i32(C.cell((txt+Number(i)*1),"char").value)>57)))) return C.u8(0);
            (key=C.u8(C.i32((C.i32((C.i32((10*C.i32(key)))+C.i32(C.cell((txt+Number(i)*1),"char").value)))-48))));
        }
        return key;
    }
    return C.u8(0);
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/*
 **********************************
 *
 *   Options Initialization
 *
 **********************************
 */
/* process options, possibly including SYSCF */
export function initoptions()
{
    /*
     * Most places that call initoptions_init()/initoptions() would
     * have the calls next to each other, so instead of adding
     * initoptions_init() everywhere, just add it where it's needed in
     * a non-adjacent place and call it here for all the other cases.
     */
    if(Number(C.u32(C.field(C.go,"instance_globals_o","opt_phase").value)!=C.u32(C.builtin_opt))) initoptions_init();
    /* someday there may be other SYSCF alternatives besides text file */
    /* If SYSCF_FILE is specified, it _must_ exist... */
    C.assure_syscf_file();
    C.config_error_init((C.i8(1)),C.literal("sysconf"),(C.i8(0)));
    /* ... and _must_ parse correctly. */
    (C.field(C.go,"instance_globals_o","opt_phase").value=C.u32(C.syscf_opt));
    if(Number(!(C.read_config_file(C.literal("sysconf"),C.set_in_sysconf)))) {
        if(Number(!!(C.config_error_done()&&Number(!(C.field(C.iflags,"instance_flags","initoptions_noterminate").value))))) C.nh_terminate(1);
    }
    C.config_error_done();
    /*
     * TODO [maybe]: parse the sysopt entries which are space-separated
     * lists of usernames into arrays with one name per element.
     */
    /* SYSCF */
    /* Carry out options that got deferred from early_options */
    if(C.field(C.gd,"instance_globals_d","deferred_showpaths").value) C.do_deferred_showpaths(0);
    /* does not return */
    initoptions_finish();
}

/* set up default values for options where 0 or False isn't sufficient */
export function initoptions_init()
{
    let opts;
    let i;
    let have_branch=C.i8((Number(!!(C.field(C.nomakedefs,"nomakedefs_s","git_branch").value&&C.i32(C.cell(C.field(C.nomakedefs,"nomakedefs_s","git_branch").value,"char").value)))));
    (C.field(C.go,"instance_globals_o","opt_phase").value=C.u32(C.builtin_opt));
    /* Did I need to move this here? */
    /* initialize the function pointers for saving the game */
    C.sf_init();
    allopt_array_init();
    /* if windowtype has been specified on the command line, set it up
       early so windowtype-specific options use it as their base */
    if(C.field(C.gc,"instance_globals_c","cmdline_windowsys").value) {
        nmcpy(C.field(C.gc,"instance_globals_c","chosen_windowtype").address,C.field(C.gc,"instance_globals_c","cmdline_windowsys").value,16);
        C.config_error_init((C.i8(0)),C.literal("command line"),(C.i8(0)));
        C.choose_windows(C.field(C.gc,"instance_globals_c","cmdline_windowsys").value);
        C.config_error_done();
        /*
         * FIXME?  This continues even if setting windowtype to player's
         * specified value fails.  It doesn't lock the windowtype in
         * that situation though, so the game will use whatever is in
         * RC/NETHACKOPTIONS or resort to DEFAULT_WINDOW_SYS.
         */
        if(Number(!!(C.field(C.windowprocs,"window_procs","name").value&&Number(!(C.strncmpi((C.field(C.windowprocs,"window_procs","name").value),(C.field(C.gc,"instance_globals_c","cmdline_windowsys").value),C.i32((-1)))))))) (C.field(C.iflags,"instance_flags","windowtype_locked").value=(C.i8(1)));
        /* ignore any windowtype:foo in RC file or NETHACKOPTIONS */
        /* shouldn't need cmdline_windowsys beyond here */
        (C.free(C.field(C.gc,"instance_globals_c","cmdline_windowsys").value),(C.field(C.gc,"instance_globals_c","cmdline_windowsys").value=0));
    }
    /* make any symbol parsing quicker */
    if(Number(!(C.glyphid_cache_status()))) C.fill_glyphid_cache();
    /* set up the command parsing */
    C.reset_commands((C.i8(1)));
    /* init */
    /* initialize the random number generator(s) */
    C.init_random(C.functionAddress("rn2"));
    C.init_random(C.functionAddress("rn2_on_display_rng"));
    (C.field(C.go,"instance_globals_o","opt_phase").value=C.u32(C.builtin_opt));
    for((i=0);C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","name").value;(()=>{const old=i;i=C.i32((old+1));return old;})()) {
        if(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","addr").value) (C.cell((C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","addr").value),"signed char").value=C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","initval").value);
    }
    (C.field(C.flags,"flag","end_own").value=(C.i8(0)));
    (C.field(C.flags,"flag","end_top").value=3);
    (C.field(C.flags,"flag","end_around").value=2);
    (C.field(C.flags,"flag","paranoia_bits").value=C.u32(C.i32((C.i32((32|1024))|2048))));
    (C.field(C.flags,"flag","versinfo").value=C.u32((C.i32(have_branch)?4:1)));
    (C.field(C.flags,"flag","pile_limit").value=5);
    /* 5 */
    (C.field(C.flags,"flag","runmode").value=C.RUN_LEAP);
    (C.field(C.iflags,"instance_flags","msg_history").value=C.u32(20));
    /* msg_window has conflicting defaults for multi-interface binary */
    (C.field(C.iflags,"instance_flags","prevmsg_window").value=C.i8(115));
    (C.field(C.field(C.iflags,"instance_flags","menu_headings").address,"color_and_attr","attr").value=7);
    (C.field(C.field(C.iflags,"instance_flags","menu_headings").address,"color_and_attr","color").value=8);
    (C.field(C.iflags,"instance_flags","getpos_coords").value=110);
    /* hero's role, race, &c haven't been chosen yet */
    (C.field(C.flags,"flag","initrole").value=(C.field(C.flags,"flag","initrace").value=(C.field(C.flags,"flag","initgend").value=(C.field(C.flags,"flag","initalign").value=(C.i32((-1)))))));
    C.init_ov_primary_symbols();
    C.init_ov_rogue_symbols();
    /* Set the default monster and object class symbols. */
    C.init_symbols();
    for((i=0);Number(i<6);(()=>{const old=i;i=C.i32((old+1));return old;})()) (C.cell((C.field(C.gw,"instance_globals_w","warnsyms").address+Number(i)*1),"unsigned char").value=C.field((C.def_warnsyms+Number(i)*C.sizes["struct symdef"]),"symdef","sym").value);

    /* assert( sizeof flags.inv_order == sizeof def_inv_order ); */
    C.memcpy(C.field(C.flags,"flag","inv_order").address,C.staticAddress("def_inv_order"),BigInt((1*18)));
    (C.cell((C.field(C.flags,"flag","pickup_types").address+Number(0)*1),"char").value=C.i8(0));
    (C.field(C.flags,"flag","pickup_burden").value=C.MOD_ENCUMBER);
    (C.field(C.flags,"flag","sortloot").value=C.i8(108));
    /* sort only loot by default */
    for((i=0);Number(i<6);(()=>{const old=i;i=C.i32((old+1));return old;})()) (C.cell((C.field(C.flags,"flag","end_disclose").address+Number(i)*1),"char").value=C.i8(110));

    C.switch_symbols(C.i32((C.i8(0))));
    /* set default characters */
    C.init_rogue_symbols();
    /*
     * Set defaults for some options depending on what we can
     * detect about the environment's capabilities.
     * This has to be done after the global initialization above
     * and before reading user-specific initialization via
     * config file/environment variable below.
     */
    /* this detects the IBM-compatible console on most 386 boxes */
    if(Number(!!(((opts=nh_getenv(C.literal("TERM"))))&&Number(!(C.strncmp(opts,C.literal("AT"),C.u64(2))))))) {
        if(Number(!(C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(C.PRIMARYSET)*C.sizes["struct symsetentry"]),"symsetentry","explicitly").value))) C.load_symset(C.literal("IBMGraphics"),C.PRIMARYSET);
        if(Number(!(C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(C.ROGUESET)*C.sizes["struct symsetentry"]),"symsetentry","explicitly").value))) C.load_symset(C.literal("RogueIBM"),C.ROGUESET);
        C.switch_symbols(C.i32((C.i8(1))));
        (C.field(C.iflags,"instance_flags","wc_color").value=(C.i8(1)));
    }
    /* UNIX && TTY_GRAPHICS */
    /* detect whether a "vt" terminal can handle alternate charsets */
    if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(((opts=nh_getenv(C.literal("TERM"))))&&Number(!(C.strncmpi(opts,C.literal("vt"),2)))))&&C.field(C.field(C.gt,"instance_globals_t","tc_gbl_data").address,"tc_gbl_data","tc_AS").value))&&C.field(C.field(C.gt,"instance_globals_t","tc_gbl_data").address,"tc_gbl_data","tc_AE").value))&&C.strchr(C.field(C.field(C.gt,"instance_globals_t","tc_gbl_data").address,"tc_gbl_data","tc_AS").value,14)))&&C.strchr(C.field(C.field(C.gt,"instance_globals_t","tc_gbl_data").address,"tc_gbl_data","tc_AE").value,15)))) {
        /* [could also check "xterm" which emulates vtXXX by default] */
        if(Number(!(C.field((C.field(C.gs,"instance_globals_s","symset").address+Number(C.PRIMARYSET)*C.sizes["struct symsetentry"]),"symsetentry","explicitly").value))) C.load_symset(C.literal("DECGraphics"),C.PRIMARYSET);
        C.switch_symbols(C.i32((C.i8(1))));
    }
    /* UNIX || VMS */
    /* Use IBM defaults. Can be overridden via config file */
    /* MAC_GRAPHICS_ENV */
    (C.field(C.flags,"flag","menu_style").value=C.i8(2));
    (C.field(C.iflags,"instance_flags","wc_align_message").value=3);
    (C.field(C.iflags,"instance_flags","wc_align_status").value=4);
    /* used by tty and curses */
    (C.field(C.iflags,"instance_flags","wc2_statuslines").value=2);
    (C.field(C.iflags,"instance_flags","wc2_petattr").value=7);
    /* only used by curses */
    (C.field(C.iflags,"instance_flags","wc2_windowborders").value=2);
    /* 'Auto' */
    /*
     * A few menus have certain items (typically operate-on-everything or
     * change-subset or sort or help entries) flagged as 'skip-invert' to
     * control how whole-page and whole-menu operations affect them.
     * 'menuinvertmode' controls how that functions:
     * 0: ignore 'skip-invert' flag on menu items (used to be the default);
     * 1: don't toggle 'skip-invert' items On for set-all/set-page/invert-
     *    all/invert-page but do toggle Off if already set (default);
     * 2: don't toggle 'skip-invert' items either On of Off for set-all/
     *    set-page/unset-all/unset-page/invert-all/invert-page.
     */
    (C.field(C.iflags,"instance_flags","menuinvertmode").value=1);
    /* since this is done before init_objects(), do partial init here */
    (C.field((C.objects+Number(C.SLIME_MOLD)*C.sizes["struct objclass"]),"objclass","oc_name_idx").value=C.i16(C.SLIME_MOLD));
    nmcpy(C.field(C.svp,"instance_globals_saved_p","pl_fruit").address,(C.field((C.obj_descr+Number(C.field((C.objects+Number(C.SLIME_MOLD)*C.sizes["struct objclass"]),"objclass","oc_name_idx").value)*C.sizes["struct objdescr"]),"objdescr","oc_name").value),32);
    /* someday there may be other SYSCF alternatives besides text file */
    /* If SYSCF_FILE is specified, it _must_ exist... */
    C.assure_syscf_file();
    C.config_error_init((C.i8(1)),C.literal("sysconf"),(C.i8(0)));
    /* ... and _must_ parse correctly. */
    (C.field(C.go,"instance_globals_o","opt_phase").value=C.u32(C.syscf_opt));
    if(Number(!(C.read_config_file(C.literal("sysconf"),C.set_in_sysconf)))) {
        if(Number(!!(C.config_error_done()&&Number(!(C.field(C.iflags,"instance_flags","initoptions_noterminate").value))))) C.nh_terminate(1);
    }
    C.config_error_done();
    /*
     * TODO [maybe]: parse the sysopt entries which are space-separated
     * lists of usernames into arrays with one name per element.
     */
    /* SYSCF */
}

/*
 *  Process user's run-time configuration file:
 *    get value of NETHACKOPTIONS;
 *    if command line specified -nethackrc=filename, use that;
 *      if NETHACKOPTIONS is present,
 *        honor it if it has a list of options to set
 *        or ignore it if it specifies a file name;
 *    else if not specified on command line and NETHACKOPTIONS names a file,
 *      use that as the config file;
 *      no extra options (normal use of NETHACKOPTIONS) will be set;
 *    otherwise (not on command line and either no NETHACKOPTIONS or that
 *        isn't a file name),
 *      pass Null to read_config_file() so that it will read ~/.nethackrc
 *        by default,
 *      then process the value of NETHACKOPTIONS as extra options.
 */
export function initoptions_finish()
{
    let sym=C.u8(0);
    C.rcfile();
    fruitadd(C.field(C.svp,"instance_globals_saved_p","pl_fruit").address,0);
    /*
     * Remove "slime mold" from list of object names.  This will
     * prevent it from being wished unless it's actually present
     * as a named (or default) fruit.  Wishing for "fruit" will
     * result in the player's preferred fruit.  [Once upon a time
     * the override value used was "\033" which prevented wishing
     * for the slime mold object at all except by asking for a
     * specific named fruit.]  Note that there are multiple fruit
     * object types (apple, melon, &c) but the "fruit" object is
     * slime mold or whatever custom name player assigns to that.
     */
    (C.field((C.obj_descr+Number(C.SLIME_MOLD)*C.sizes["struct objdescr"]),"objdescr","oc_name").value=C.literal("fruit"));
    (sym=C.get_othersym(C.SYM_BOULDER,(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address))))))?C.ROGUESET:C.PRIMARYSET)));
    if(sym) (C.cell((C.field(C.gs,"instance_globals_s","showsyms").address+Number(C.i32((C.SYM_BOULDER+(C.i32(((C.i32(((C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES)))+C.MAXMCLASSES)))+6))))))*1),"unsigned char").value=sym);
    C.reglyph_darkroom();
    C.reset_glyphmap(C.u32(C.gm_optionchange));
    /*
     * A multi-interface binary might only support status highlighting
     * for some of the interfaces; check whether we asked for it but are
     * using one which doesn't.
     *
     * Option processing can take place before a user-decided WindowPort
     * is even initialized, so check for that too.
     */
    if(Number(!!(C.field(C.iflags,"instance_flags","hilite_delta").value&&Number(!(wc2_supported(C.literal("statushilites"))))))) {
        C.variadic(195,C.literal("Status highlighting not supported for %s interface."),C.field(C.windowprocs,"window_procs","name").value);
        (C.field(C.iflags,"instance_flags","hilite_delta").value=C.i64(0));
    }
    C.update_rest_on_space();
    /* these can't rely on compile-time initialization for their defaults
       because a multi-interface binary might need different values for
       different interfaces; if neither tiled_map nor ascii_map pass the
       wc_supported() test, assume ascii_map */
    if(Number(!!(C.i32(C.field(C.iflags,"instance_flags","wc_tiled_map").value)&&Number(!(wc_supported(C.literal("tiled_map"))))))) ((C.field(C.iflags,"instance_flags","wc_tiled_map").value=(C.i8(0))),(C.field(C.iflags,"instance_flags","wc_ascii_map").value=(C.i8(1))));
 else if(Number(!!(Number(!!(C.i32(C.field(C.iflags,"instance_flags","wc_ascii_map").value)&&Number(!(wc_supported(C.literal("ascii_map"))))))&&C.i32(wc_supported(C.literal("tiled_map")))))) ((C.field(C.iflags,"instance_flags","wc_ascii_map").value=(C.i8(0))),(C.field(C.iflags,"instance_flags","wc_tiled_map").value=(C.i8(1))));
    if(C.glyphid_cache_status()) C.free_glyphid_cache();
    C.apply_customizations(C.u32(C.field(C.gc,"instance_globals_c","currentgraphics").value),C.u32(C.i32((C.do_custom_symbols|C.do_custom_colors))));
    (C.field(C.go,"instance_globals_o","opt_initial").value=(C.i8(0)));
    return;
}

/*
     * Do these after clearing the 'opt_initial' flag.
     */
/* player's RC file might try to enable perm_invent before selecting
       current interface, so the decision then would have been based on
       default interface; re-check with the active interface now */
/* can_set_perm_invent() expects to be called when perm_invent
           is about to be toggled On, so start with it Off */
export function allopt_array_init()
{
    let i;
    
    if(Number(!(C.cell(C.staticAddress("allopt_array_init.options_array_inited_already"),"signed char").value))) {
        C.memcpy(C.staticAddress("allopt"),C.staticAddress("allopt_init"),BigInt((C.sizes["struct allopt_t"]*218)));
        determine_ambiguities();
        for((i=0);C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","name").value;(()=>{const old=i;i=C.i32((old+1));return old;})()) {
            if(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","addr").value) (C.cell((C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","addr").value),"signed char").value=C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","initval").value);
        }
        heed_all_options();
        /*
         * Call each option function with an init flag and give it a chance
         * to make any preparations that it might require.  We do this
         * whether or not the option itself is ever specified; that's
         * irrelevant for the init call.  Doing this allows the prep code for
         * option settings to remain adjacent to, and in the same function as,
         * the code that processes those options.
         */
        for((i=0);Number(i<C.OPTCOUNT);(()=>{const old=i;i=C.i32((old+1));return i;})()) {
            if(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","optfn").value) C.callback(90,(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","optfn").value),i,C.do_init,(C.i8(0)),C.staticAddress("empty_optstr"),C.staticAddress("empty_optstr"));
        }
        (C.cell(C.staticAddress("allopt_array_init.options_array_inited_already"),"signed char").value=(C.i8(1)));
    }
}

/*
 *******************************************
 *
 * Support Functions for Individual Options
 *
 *******************************************
 */
/* iflags.menuobjsyms also controls iflags.menu_head_objsym, and
   iflags.use_menu_glyphs; they affect execution but are no longer options */
export function set_menuobjsyms_flags(newobjsyms)
{
    newobjsyms=C.i32(newobjsyms);
    (C.field(C.iflags,"instance_flags","menuobjsyms").value=newobjsyms);
    (C.field(C.iflags,"instance_flags","menu_head_objsym").value=C.i8(((Number((C.i32((newobjsyms&1)))!=0))?C.i32((C.i8(1))):C.i32((C.i8(0))))));
    (C.field(C.iflags,"instance_flags","use_menu_glyphs").value=C.i8(((Number((C.i32((newobjsyms&(C.i32((2|4))))))!=0))?C.i32((C.i8(1))):C.i32((C.i8(0))))));
}

/*
 * Change the inventory order, using the given string as the new order.
 * Missing characters in the new order are filled in at the end from
 * the current inv_order, except for gold, which is forced to be first
 * if not explicitly present.
 *
 * This routine returns 1 unless there is a duplicate or bad char in
 * the string.
 *
 * Used by: optfn_packorder()
 *
 */
export function change_inv_order(op)
{
    op=C.ptr(op);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["change_inv_order.buf",(1*128)]]);
    try {
    let oc_sym; let num;
    let sp; let buf=C.automatic("change_inv_order.buf",(1*128));
    let retval=1;
    (num=0);
    if(Number(!(C.strchr(op,C.GOLD_SYM)))) (C.cell((buf+Number((()=>{const old=num;num=C.i32((old+1));return old;})())*1),"char").value=C.i8(C.COIN_CLASS));
    for((sp=op);C.cell(sp,"char").value;(()=>{const old=sp;sp=C.ptr((old+Number(1)));return old;})()) {
        let fail=(C.i8(0));
        (oc_sym=C.def_char_to_objclass(C.cell(sp,"char").value));
        /* reject bad or duplicate entries */
        if(Number(oc_sym==C.MAXOCLASSES)) {
            /* not an object class char */
            C.variadic(196,C.literal("Not an object class '%c'"),C.i32(C.cell(sp,"char").value));
            (retval=0);
            (fail=(C.i8(1)));
        } else if(Number(!(C.strchr(C.field(C.flags,"flag","inv_order").address,oc_sym)))) {
            /* VENOM_CLASS, RANDOM_CLASS, and ILLOBJ_CLASS are excluded
               because they aren't in def_inv_order[] so don't make it
               into flags.inv_order, hence always fail this strchr() test */
            C.variadic(197,C.literal("Object class '%c' not allowed"),C.i32(C.cell(sp,"char").value));
            (retval=0);
            (fail=(C.i8(1)));
        } else if(C.strchr((sp+Number(1)*1),C.i32(C.cell(sp,"char").value))) {
            C.variadic(198,C.literal("Duplicate object class '%c'"),C.i32(C.cell(sp,"char").value));
            (retval=0);
            (fail=(C.i8(1)));
        }
        /* retain good ones */
        if(Number(!(fail))) (C.cell((buf+Number((()=>{const old=num;num=C.i32((old+1));return old;})())*1),"char").value=C.i8(oc_sym));
    }
    (C.cell((buf+Number(num)*1),"char").value=C.i8(0));
    /* fill in any omitted classes, using previous ordering */
    for((sp=C.field(C.flags,"flag","inv_order").address);C.cell(sp,"char").value;(()=>{const old=sp;sp=C.ptr((old+Number(1)));return old;})()) if(Number(!(C.strchr(buf,C.i32(C.cell(sp,"char").value))))) C.strkitten((buf+Number((()=>{const old=num;num=C.i32((old+1));return old;})())*1),C.cell(sp,"char").value);

    (C.cell((buf+Number(C.i32((C.MAXOCLASSES-1)))*1),"char").value=C.i8(0));
    C.strcpy(C.field(C.flags,"flag","inv_order").address,buf);
    return retval;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/*
 * Support functions for "warning"
 *
 * Used by: optfn_warnings()
 *
 */
export function warning_opts(opts,optype)
{
    opts=C.ptr(opts);
    optype=C.ptr(optype);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["warning_opts.translate",(1*6)]]);
    try {
    let translate=C.automatic("warning_opts.translate",(1*6));
    let length; let i;
    if(Number(((opts=string_for_env_opt(optype,opts,(C.i8(0)))))==C.staticAddress("empty_optstr"))) return (C.i8(0));
    escapes(opts,opts);
    (length=C.i32(C.strlen(opts)));
    /* match the form obtained from PC configuration files */
    for((i=0);Number(i<6);(()=>{const old=i;i=C.i32((old+1));return old;})()) (C.cell((translate+Number(i)*1),"unsigned char").value=C.u8(((Number(i>=length))?0:(C.i32(C.cell((opts+Number(i)*1),"char").value)?C.i32(C.u8(C.cell((opts+Number(i)*1),"char").value)):C.i32(C.field((C.def_warnsyms+Number(i)*C.sizes["struct symdef"]),"symdef","sym").value)))));

    assign_warnings(translate);
    return (C.i8(1));
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function assign_warnings(graph_chars)
{
    graph_chars=C.ptr(graph_chars);
    let i;
    for((i=0);Number(i<6);(()=>{const old=i;i=C.i32((old+1));return old;})()) if(C.cell((graph_chars+Number(i)*1),"unsigned char").value) (C.cell((C.field(C.gw,"instance_globals_w","warnsyms").address+Number(i)*1),"unsigned char").value=C.cell((graph_chars+Number(i)*1),"unsigned char").value);

}

/*
 * Support functions for "suppress_alert"
 *
 * Used by: optfn_suppress_alert()
 *
 */
export function feature_alert_opts(op,optn)
{
    op=C.ptr(op);
    optn=C.ptr(optn);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["feature_alert_opts.buf",(1*256)]]);
    try {
    let buf=C.automatic("feature_alert_opts.buf",(1*256));
    let fnv=C.get_feature_notice_ver(op);
    /* version.c */
    if(Number(fnv==C.u64(0n))) return 0;
    if(Number(fnv>C.get_current_feature_ver())) {
        if(Number(!(C.field(C.go,"instance_globals_o","opt_initial").value))) {
            C.variadic(199,C.literal("disable new feature alerts for future versions."));
        } else {
            C.variadic(200,C.literal("%s=%s Invalid reference to a future version ignored"),optn,op);
        }
        return 0;
    }
    (C.field(C.flags,"flag","suppress_alert").value=fnv);
    if(Number(!(C.field(C.go,"instance_globals_o","opt_initial").value))) {
        C.variadic(201,buf,C.literal("%lu.%lu.%lu"),(C.u64((C.field(C.flags,"flag","suppress_alert").value>>BigInt(24)))),(C.u64((((C.u64((C.u64(16711680n)&C.field(C.flags,"flag","suppress_alert").value))))>>BigInt(16)))),(C.u64((((C.u64((C.u64(65280n)&C.field(C.flags,"flag","suppress_alert").value))))>>BigInt(8)))));
        C.variadic(202,C.literal("Feature change alerts disabled for NetHack %s features and prior."),buf);
    }
    return 1;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/*
 * This is used by parse_config_line() in files.c
 *
 */
/* parse key:command[,key2:command2,...] after BINDINGS= prefix has been
   stripped; returns False if any problem seen, True if every binding in
   the comma-separated list is successful */
export function parsebindings(bindings)
{
    bindings=C.ptr(bindings);
    let bind;
    let key;
    let i;
    let ret=(C.i8(1));
    /* assume success */
    
    /* look for first comma, then decide whether it is the key being bound
       or a list element separator; if it's a key, find separator beyond it */
    if(Number(((bind=C.strchr(bindings,44)))!=0)) {
        /* at start so it represents a key */
        if(Number(bind==bindings)) (bind=C.strchr((bind+Number(1)*1),44));
 else if(Number(!!(Number(C.i32(C.cell((bind+Number(C.i32((-1)))*1),"char").value)==92)||(Number(!!(Number(C.i32(C.cell((bind+Number(C.i32((-1)))*1),"char").value)==39)&&Number(C.i32(C.cell((bind+Number(1)*1),"char").value)==39))))))) (bind=C.strchr((bind+Number(2)*1),44));
        /* to get here, bind is non-Null and not equal to bindings,
           so it is greater than bindings and bind[-1] is valid; check
           whether current comma happens to be for "\,:cmd" or "',':cmd"
           (":cmd" part is assumed if the comma has expected quoting) */
    }
    /* if a comma separator has been found, break off first binding from rest;
       parse the rest and then handle this first one when recursion returns */
    if(bind) {
        (C.cell((()=>{const old=bind;bind=C.ptr((old+Number(1)));return old;})(),"char").value=C.i8(0));
        if(Number(!(parsebindings(bind)))) (ret=(C.i8(0)));
    }
    /* parse a single binding: first split around : */
    if(Number(!(((bind=C.strchr(bindings,58)))))) return (C.i8(0));
    /* it's not a binding */
    (C.cell((()=>{const old=bind;bind=C.ptr((old+Number(1)));return old;})(),"char").value=C.i8(0));
    (bind=C.trimspaces(bind));
    for((i=0);Number(i<C.i32((C.u64((BigInt((8*2))/BigInt(8))))));(()=>{const old=i;i=C.i32((old+1));return old;})()) if(Number(!(C.strcmp(bindings,C.cell((C.staticAddress("parsebindings.mousebtn_names")+Number(i)*8),"char *").value)))) {
        if(Number(!(C.bind_mousebtn(C.i32((i+1)),bind)))) {
            C.variadic(203,C.literal("Error binding mouse button %i"),C.i32((i+1)));
        } else {
            return ret;
        }
    }

    /* read the key to be bound */
    (key=txt2key(bindings));
    if(Number(!(key))) {
        C.variadic(204,C.literal("Unknown key binding key '%s'"),bindings);
        return (C.i8(0));
    }
    /* is it a special key? */
    if(C.bind_specialkey(key,bind)) return ret;
    /* is it a menu command? */
    for((i=0);C.field((C.staticAddress("default_menu_cmd_info")+Number(i)*C.sizes["menu_cmd_t"]),"menu_cmd_t","name").value;(()=>{const old=i;i=C.i32((old+1));return old;})()) {
        if(Number(!(C.strcmp(C.field((C.staticAddress("default_menu_cmd_info")+Number(i)*C.sizes["menu_cmd_t"]),"menu_cmd_t","name").value,bind)))) {
            if(illegal_menu_cmd_key(key)) {
                C.variadic(205,C.literal("Bad menu key %s:%s"),C.visctrl(C.i8(key)),bind);
                return (C.i8(0));
            } else {
                add_menu_cmd_alias(C.i8(key),C.field((C.staticAddress("default_menu_cmd_info")+Number(i)*C.sizes["menu_cmd_t"]),"menu_cmd_t","cmd").value);
            }
            return ret;
        }
    }
    /* extended command? */
    if(Number(!(C.bind_key(key,bind,(C.i8(1)))))) {
        C.variadic(206,C.literal("Unknown key binding command '%s'"),bind);
        return (C.i8(0));
    }
    return ret;
}

export function msgtype2name(typ)
{
    typ=C.i32(typ);
    let i;
    for((i=0);Number(i<C.i32((C.u64((BigInt((C.sizes["struct options_msgtype_name"]*6))/BigInt(C.sizes["struct options_msgtype_name"]))))));(()=>{const old=i;i=C.i32((old+1));return old;})()) if(Number(!!(C.field((C.staticAddress("msgtype_names")+Number(i)*C.sizes["struct options_msgtype_name"]),"options_msgtype_name","descr").value&&Number(C.i32(C.field((C.staticAddress("msgtype_names")+Number(i)*C.sizes["struct options_msgtype_name"]),"options_msgtype_name","msgtyp").value)==typ)))) return C.field((C.staticAddress("msgtype_names")+Number(i)*C.sizes["struct options_msgtype_name"]),"options_msgtype_name","name").value;

    return 0;
}

export function query_msgtype()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["query_msgtype.any",C.sizes["union any"]],["query_msgtype.picks",8]]);
    try {
    let tmpwin;
    let any=C.automatic("query_msgtype.any",C.sizes["union any"]);
    let i; let pick_cnt;
    let picks=C.local("query_msgtype.picks","struct mi *",0);
    let clr=8;
    (tmpwin=C.callback(91,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.callback(92,(C.field(C.windowprocs,"window_procs","win_start_menu").value),tmpwin,C.u64(0));
    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    for((i=0);Number(i<C.i32((C.u64((BigInt((C.sizes["struct options_msgtype_name"]*6))/BigInt(C.sizes["struct options_msgtype_name"]))))));(()=>{const old=i;i=C.i32((old+1));return old;})()) if(C.field((C.staticAddress("msgtype_names")+Number(i)*C.sizes["struct options_msgtype_name"]),"options_msgtype_name","descr").value) {
        (C.field(any,"any","a_int").value=C.i32((C.i32(C.field((C.staticAddress("msgtype_names")+Number(i)*C.sizes["struct options_msgtype_name"]),"options_msgtype_name","msgtyp").value)+1)));
        C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(0),C.i8(0),0,clr,C.field((C.staticAddress("msgtype_names")+Number(i)*C.sizes["struct options_msgtype_name"]),"options_msgtype_name","descr").value,0);
    }

    C.callback(93,(C.field(C.windowprocs,"window_procs","win_end_menu").value),tmpwin,C.literal("How to show the message"));
    (pick_cnt=C.select_menu(tmpwin,1,picks.address));
    C.callback(94,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tmpwin);
    if(Number(pick_cnt>0)) {
        (i=C.i32((C.field(C.field(picks.value,"mi","item").address,"any","a_int").value-1)));
        C.free(picks.value);
        return i;
    }
    return C.i32((-1));
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function msgtype_add(typ,pattern)
{
    typ=C.i32(typ);
    pattern=C.ptr(pattern);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["msgtype_add.errbuf",(1*256)]]);
    try {
    
    let tmp=C.alloc(C.u32(BigInt(C.sizes["struct plinemsg_type"])));
    (C.field(tmp,"plinemsg_type","msgtype").value=C.i16(typ));
    (C.field(tmp,"plinemsg_type","regex").value=C.regex_init());
    /* test_regex_pattern() has already validated this regexp but parsing
       it again could conceivably run out of memory */
    if(Number(!(C.regex_compile(pattern,C.field(tmp,"plinemsg_type","regex").value)))) {
        let errbuf=C.automatic("msgtype_add.errbuf",(1*256));
        let re_error_desc=C.regex_error_desc(C.field(tmp,"plinemsg_type","regex").value,errbuf);
        /* free first in case reason for failure was insufficient memory */
        C.regex_free(C.field(tmp,"plinemsg_type","regex").value);
        C.free(tmp);
        C.variadic(207,C.literal("%s: %s"),C.cell(C.staticAddress("msgtype_add.re_error"),"char *").value,re_error_desc);
        return (C.i8(0));
    }
    (C.field(tmp,"plinemsg_type","pattern").value=C.dupstr(pattern));
    (C.field(tmp,"plinemsg_type","next").value=C.field(C.gp,"instance_globals_p","plinemsg_types").value);
    (C.field(C.gp,"instance_globals_p","plinemsg_types").value=tmp);
    return (C.i8(1));
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function msgtype_free()
{
    let tmp; let tmp2=0;
    for((tmp=C.field(C.gp,"instance_globals_p","plinemsg_types").value);tmp;(tmp=tmp2)) {
        (tmp2=C.field(tmp,"plinemsg_type","next").value);
        C.free(C.field(tmp,"plinemsg_type","pattern").value);
        C.regex_free(C.field(tmp,"plinemsg_type","regex").value);
        (C.field(tmp,"plinemsg_type","regex").value=0);
        C.free(tmp);
    }
    (C.field(C.gp,"instance_globals_p","plinemsg_types").value=0);
}

export function free_one_msgtype(idx)
{
    idx=C.i32(idx);
    /* 0 .. */
    let tmp=C.field(C.gp,"instance_globals_p","plinemsg_types").value;
    let prev=0;
    while(tmp) {
        if(Number(idx==0)) {
            let next=C.field(tmp,"plinemsg_type","next").value;
            C.regex_free(C.field(tmp,"plinemsg_type","regex").value);
            C.free(C.field(tmp,"plinemsg_type","pattern").value);
            C.free(tmp);
            if(prev) (C.field(prev,"plinemsg_type","next").value=next);
 else (C.field(C.gp,"instance_globals_p","plinemsg_types").value=next);
            return;
        }
        (()=>{const old=idx;idx=C.i32((old-1));return old;})();
        (prev=tmp);
        (tmp=C.field(tmp,"plinemsg_type","next").value);
    }
}

export function msgtype_type(msg,norepeat)
{
    msg=C.ptr(msg);
    norepeat=C.i8(norepeat);
    /* called from Norep(via pline) */
    let tmp=C.field(C.gp,"instance_globals_p","plinemsg_types").value;
    while(tmp) {
        /* we don't exclude entries with negative msgtype values
           because then the msg might end up matching a later pattern */
        if(C.regex_match(msg,C.field(tmp,"plinemsg_type","regex").value)) return C.i32(C.field(tmp,"plinemsg_type","msgtype").value);
        (tmp=C.field(tmp,"plinemsg_type","next").value);
    }
    return (C.i32(norepeat)?1:0);
}

/* negate one or more types of messages so that their type handling will
   be disabled or re-enabled; MSGTYPE_NORMAL (value 0) is not affected */
export function hide_unhide_msgtypes(hide,hide_mask)
{
    hide=C.i8(hide);
    hide_mask=C.i32(hide_mask);
    let tmp;
    let mt;
    /* negative msgtype value won't be recognized by pline, so does nothing */
    for((tmp=C.field(C.gp,"instance_globals_p","plinemsg_types").value);tmp;(tmp=C.field(tmp,"plinemsg_type","next").value)) {
        (mt=C.i32(C.field(tmp,"plinemsg_type","msgtype").value));
        if(Number(!(hide))) (mt=C.i32((-mt)));
        /* unhide: negate negative, yielding positive */
        if(Number(!!(Number(mt>0)&&(C.i32(((C.i32((1<<mt)))&hide_mask)))))) (C.field(tmp,"plinemsg_type","msgtype").value=C.i16(C.i32((-C.i32(C.field(tmp,"plinemsg_type","msgtype").value)))));
    }
}

export function msgtype_count()
{
    let c=0;
    let tmp=C.field(C.gp,"instance_globals_p","plinemsg_types").value;
    while(tmp) {
        (()=>{const old=c;c=C.i32((old+1));return old;})();
        (tmp=C.field(tmp,"plinemsg_type","next").value);
    }
    return c;
}

export function msgtype_parse_add(str)
{
    str=C.ptr(str);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["msgtype_parse_add.pattern",(1*256)],["msgtype_parse_add.msgtype",(1*11)]]);
    try {
    let pattern=C.automatic("msgtype_parse_add.pattern",(1*256));
    let msgtype=C.automatic("msgtype_parse_add.msgtype",(1*11));
    if(Number(C.variadic(208,str,C.literal("%10s \"%255[^\"]\""),msgtype,pattern)==2)) {
        let typ=C.i32((-1));
        let i;
        for((i=0);Number(i<C.i32((C.u64((BigInt((C.sizes["struct options_msgtype_name"]*6))/BigInt(C.sizes["struct options_msgtype_name"]))))));(()=>{const old=i;i=C.i32((old+1));return old;})()) if(C.str_start_is(C.field((C.staticAddress("msgtype_names")+Number(i)*C.sizes["struct options_msgtype_name"]),"options_msgtype_name","name").value,msgtype,(C.i8(1)))) {
            (typ=C.i32(C.field((C.staticAddress("msgtype_names")+Number(i)*C.sizes["struct options_msgtype_name"]),"options_msgtype_name","msgtyp").value));
            break;
        }

        if(Number(typ!=C.i32((-1)))) return msgtype_add(typ,pattern);
 else C.variadic(209,C.literal("Unknown message type '%s'"),msgtype);
    } else {
        C.variadic(210,C.literal("Malformed MSGTYPE"));
    }
    return (C.i8(0));
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* parse 'str' as a regular expression to check whether it's valid;
   compiled regexp gets thrown away regardless of the outcome */
export function test_regex_pattern(str,errmsg)
{
    str=C.ptr(str);
    errmsg=C.ptr(errmsg);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["test_regex_pattern.errbuf",(1*256)]]);
    try {
    
    let match;
    let re_error_desc; let errbuf=C.automatic("test_regex_pattern.errbuf",(1*256));
    let retval;
    if(Number(!(str))) return (C.i8(0));
    if(Number(!(errmsg))) (errmsg=C.staticAddress("test_regex_pattern.def_errmsg"));
    (match=C.regex_init());
    if(Number(!(match))) {
        C.variadic(211,C.literal("%s"),errmsg);
        return (C.i8(0));
    }
    (retval=C.regex_compile(str,match));
    /* get potential error message before freeing regexp and free regexp
       before issuing message in case the error is "ran out of memory"
       since message delivery might need to allocate some memory */
    (re_error_desc=(Number(!(retval))?C.regex_error_desc(match,errbuf):0));
    /* discard regexp; caller will re-parse it after validating other stuff */
    C.regex_free(match);
    /* if returning failure, tell player */
    if(Number(!(retval))) C.variadic(212,C.literal("%s: %s"),errmsg,re_error_desc);
    return retval;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* parse 'role' or 'race' or 'gender' or 'alignment' */
export function parse_role_opt(optidx,negated,fullname,opts,opp)
{
    optidx=C.i32(optidx);
    negated=C.i8(negated);
    fullname=C.ptr(fullname);
    opts=C.ptr(opts);
    opp=C.ptr(opp);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["parse_role_opt.negbuf",(1*256)]]);
    try {
    
    /* not 'const' but never modified */
    let preval; let op;
    let which=((Number(optidx==C.opt_role))?1:((Number(optidx==C.opt_race))?2:((Number(optidx==C.opt_gender))?3:((Number(optidx==C.opt_alignment))?4:5))));
    /* none of the above */
    let ok=(C.i8(0));
    /*
     * Accepts multiple forms
     *  role:priest       -- play as priest
     *  race:!orc         -- any race other than orc
     *  role:!cav !mon    -- any role other than caveman/cavewoman or monk
     *  !role:tour        -- any role other than tourist
     *  !role:tou rog wiz -- any role other than tourist or rogue or wizard
     * TODO: add support for
     *  role:arc bar kni  -- only role archeologist or barbarian or knight
     * Rejected:
     *  role:sam !val     -+ invalid; need either positive or negative subset
     *  !role:!sam        +- not a mixture of the two and not dual negation.
     */
    if(Number(((op=string_for_env_opt(fullname,opts,(C.i8(0)))))!=C.staticAddress("empty_optstr"))) {
        let sp;
        let val_negated; let prev_negated=(C.i8(0)); let first=(C.i8(1));
        C.mungspaces(op);
        while(C.cell(op,"char").value) {
            if(Number(C.i32(C.cell(op,"char").value)==32)) (()=>{const old=op;op=C.ptr((old+Number(1)));return op;})();
            (val_negated=(C.i8(0)));
            while(Number(!!(Number(C.i32(C.cell(op,"char").value)==33)||Number(!(C.strncmpi(op,C.literal("no"),2)))))) {
                (val_negated=C.i8(Number(!(val_negated))));
                (op=C.ptr(op+Number(((Number(C.i32(C.cell(op,"char").value)==33))?1:((Number(C.i32(C.cell((op+Number(2)*1),"char").value)!=45))?2:3)))*1));
            }
            if(Number(!!(Number(!(C.cell(op,"char").value))||Number(C.i32(C.cell(op,"char").value)==32)))) {
                C.variadic(213,C.literal("Negated nothing for '%s'"),fullname);
                return (C.i8(0));
            }
            if(Number(!(first))) {
                if(Number(!!((C.i32((C.i32(val_negated)^C.i32(prev_negated))))||(Number(!!(C.i32(negated)&&C.i32(val_negated))))))) {
                    C.variadic(214,C.literal("Invalid mixed negation for '%s%s'"),(C.i32(negated)?C.literal("!"):C.literal("")),fullname);
                    return (C.i8(0));
                } else if(Number(!!(Number(!(negated))&&Number(!(val_negated))))) {
                    C.variadic(215,C.literal("Multiple role values only allowed when list is negated"));
                    return (C.i8(0));
                }
            }
            (first=(C.i8(0)));
            (prev_negated=val_negated);
            /* hide rest of list, if any */
            (sp=C.strchr(op,32));
            if(sp) (C.cell(sp,"char").value=C.i8(0));
            (preval=getoptstr(optidx,C.i32(C.field(C.go,"instance_globals_o","opt_phase").value)));
            if(Number(!!(C.i32(val_negated)||C.i32(negated)))) {
                let negbuf=C.automatic("parse_role_opt.negbuf",(1*256));
                /* for negative value, clear filter if there is a prior
                   value from a different phase; for same phase, duplicates
                   are allowed and setrolefilter() merges them */
                if(Number(!!(Number(!(preval))||Number(C.i32(C.cell(preval,"char").value)!=33)))) C.clearrolefilter(which);
                if(Number(!(C.setrolefilter(op)))) {
                    C.variadic(216,C.literal("Invalid %s '%s'"),fullname,op);
                    return (C.i8(0));
                }
                saveoptstr(optidx,C.rolefilterstring(negbuf,which));
                (C.cell(opp,"char *").value=C.staticAddress("parse_role_opt.neg_opt"));
            } else {
                /* for positive value, allow duplicate if prior value
                   was a negative one or came from a different phase;
                   reject if prior value was positive and from same phase */
                if(C.cell(C.staticAddress("duplicate"),"signed char").value) {
                    if(Number(!!(preval&&Number(C.i32(C.cell(preval,"char").value)==33)))) {
                        complain_about_duplicate(optidx);
                        return (C.i8(0));
                    }
                }
                /* save raw string value; caller will validate it and
                   if it's ok, replace it with canonical form */
                saveoptstr(optidx,op);
                (C.cell(opp,"char *").value=op);
                /*ok = TRUE; // redundant*/
                /* don't return yet; value might be a list that follows
                   this with something else which might make it invalid */
            }
            if(sp) {
                (C.cell(sp,"char").value=C.i8(32));
                (op=(sp+Number(1)*1));
            } else {
                (op=C.ptr(op+Number(C.strlen(op))*1));
                /* break; */
            }
        }
        /* '!ok' without config_error_add() implies a valid negation */
        (ok=(C.i8(1)));
    }
    return ok;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* fetch a saved role|race|gender|alignment value suitable for writing into
   a new run-time config file */
export function get_cnf_role_opt(optidx)
{
    optidx=C.i32(optidx);
    let phase;
    let op=0;
    for((phase=C.i32((C.num_opt_phases-1)));Number(!!(Number(phase>=0)&&Number(!(op))));(()=>{const old=phase;phase=C.i32((old-1));return phase;})()) {
        if(Number(!!(Number(!!(Number(phase==C.cmdline_opt)||Number(phase==C.environ_opt)))||Number(phase==C.builtin_opt)))) continue;
        (op=getoptstr(optidx,phase));
    }
    return op;
}

/* Check if character c is illegal as a menu command key */
export function illegal_menu_cmd_key(c)
{
    c=C.u8(c);
    if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(c)==0)||Number(C.i32(c)==13)))||Number(C.i32(c)==10)))||Number(C.i32(c)==27)))||Number(C.i32(c)==32)))||C.i32(C.digit(C.i8(c)))))||(Number(!!(C.i32(C.letter(C.i8(c)))&&Number(C.i32(c)!=64))))))) {
        C.variadic(217,C.literal("Reserved menu command key '%s'"),C.visctrl(C.i8(c)));
        return (C.i8(1));
    } else {
        /* reject default object class symbols */
        let j;
        for((j=1);Number(j<C.MAXOCLASSES);(()=>{const old=j;j=C.i32((old+1));return old;})()) if(Number(C.i32(c)==C.i32(C.u8(C.field((C.def_oc_syms+Number(j)*C.sizes["struct class_sym"]),"class_sym","sym").value)))) {
            C.variadic(218,C.literal("Menu command key '%s' is an object class"),C.visctrl(C.i8(c)));
            return (C.i8(1));
        }

    }
    return (C.i8(0));
}

/*
 * Convert the given string of object classes to a string of default object
 * symbols.
 */
export function oc_to_str(src,dest)
{
    src=C.ptr(src);
    dest=C.ptr(dest);
    let i;
    while(Number(((i=C.i32(C.cell((()=>{const old=src;src=C.ptr((old+Number(1)));return old;})(),"char").value)))!=0)) {
        if(Number(!!(Number(i<0)||Number(i>=C.MAXOCLASSES)))) C.variadic(219,C.literal("oc_to_str:  illegal object class %d"),i);
 else (C.cell((()=>{const old=dest;dest=C.ptr((old+Number(1)));return old;})(),"char").value=C.field((C.def_oc_syms+Number(i)*C.sizes["struct class_sym"]),"class_sym","sym").value);
    }
    (C.cell(dest,"char").value=C.i8(0));
}

/*
 * Add the given mapping to the menu command map list.  Always keep the
 * maps valid C strings.
 */
export function add_menu_cmd_alias(from_ch,to_ch)
{
    from_ch=C.i8(from_ch);
    to_ch=C.i8(to_ch);
    if(Number(C.i32(C.field(C.gn,"instance_globals_n","n_menu_mapped").value)>=32)) {
        C.variadic(220,C.literal("out of menu map space."));
    } else {
        (C.cell((C.field(C.gm,"instance_globals_m","mapped_menu_cmds").address+Number(C.field(C.gn,"instance_globals_n","n_menu_mapped").value)*1),"char").value=from_ch);
        (C.cell((C.field(C.gm,"instance_globals_m","mapped_menu_op").address+Number(C.field(C.gn,"instance_globals_n","n_menu_mapped").value)*1),"char").value=to_ch);
        (()=>{const ref=C.field(C.gn,"instance_globals_n","n_menu_mapped");const old=ref.value;ref.value=C.i16((old+1));return old;})();
        (C.cell((C.field(C.gm,"instance_globals_m","mapped_menu_cmds").address+Number(C.field(C.gn,"instance_globals_n","n_menu_mapped").value)*1),"char").value=C.i8(0));
        (C.cell((C.field(C.gm,"instance_globals_m","mapped_menu_op").address+Number(C.field(C.gn,"instance_globals_n","n_menu_mapped").value)*1),"char").value=C.i8(0));
    }
}

export function get_menu_cmd_key(ch)
{
    ch=C.i8(ch);
    let found=C.strchr(C.field(C.gm,"instance_globals_m","mapped_menu_op").address,C.i32(ch));
    if(found) {
        let idx=C.i32((C.i64(((found-C.field(C.gm,"instance_globals_m","mapped_menu_op").address)/1))));
        (ch=C.cell((C.field(C.gm,"instance_globals_m","mapped_menu_cmds").address+Number(idx)*1),"char").value);
    }
    return ch;
}

/*
 * Map the given character to its corresponding menu command.  If it
 * doesn't match anything, just return the original.
 */
export function map_menu_cmd(ch)
{
    ch=C.i8(ch);
    let found=C.strchr(C.field(C.gm,"instance_globals_m","mapped_menu_cmds").address,C.i32(ch));
    if(found) {
        let idx=C.i32((C.i64(((found-C.field(C.gm,"instance_globals_m","mapped_menu_cmds").address)/1))));
        (ch=C.cell((C.field(C.gm,"instance_globals_m","mapped_menu_op").address+Number(idx)*1),"char").value);
    }
    return ch;
}

/* get keystrokes that are used for menu scrolling operations which apply;
   printable: for use in a prompt, non-printable: for yn_function() choices */
export function collect_menu_keys(outbuf,scrollmask,printable)
{
    outbuf=C.ptr(outbuf);
    scrollmask=C.u32(scrollmask);
    printable=C.i8(printable);
    /* at least big enough for 6 "M-^X" sequences +'\0'*/
    /* 1: backwards, "^<"; 2: forwards, ">|";
                          * 4: left, "{";       8: right, "}"; */
    /* False: output is string of raw characters,
                          * True: output is a string of visctrl() sequences;
                          * matters iff user has mapped any menu scrolling
                          * commands to control or meta characters */
    
    
    let i;
    (C.cell((outbuf+Number(0)*1),"char").value=C.i8(0));
    for((i=0);Number(i<C.i32((C.u64((BigInt((C.sizes["struct menuscrollinfo"]*6))/BigInt(C.sizes["struct menuscrollinfo"]))))));(()=>{const old=i;i=C.i32((old+1));return i;})()) {
        if(C.u32((scrollmask&C.u32(C.field((C.staticAddress("collect_menu_keys.scroll_keys")+Number(i)*C.sizes["struct menuscrollinfo"]),"menuscrollinfo","maskindx").value)))) {
            let c=get_menu_cmd_key(C.field((C.staticAddress("collect_menu_keys.scroll_keys")+Number(i)*C.sizes["struct menuscrollinfo"]),"menuscrollinfo","cmdkey").value);
            if(printable) C.strcat(outbuf,C.visctrl(c));
 else C.strkitten(outbuf,c);
        }
    }
    return outbuf;
}

/* Returns the fid of the fruit type; if that type already exists, it
 * returns the fid of that one; if it does not exist, it adds a new fruit
 * type to the chain and returns the new one.
 * If replace_fruit is sent in, replace the fruit in the chain rather than
 * adding a new entry--for user specified fruits only.
 */
export function fruitadd(str,replace_fruit)
{
    str=C.ptr(str);
    replace_fruit=C.ptr(replace_fruit);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["fruitadd.highest_fruit_id",4],["fruitadd.buf",(1*32)],["fruitadd.altname",(1*32)]]);
    try {
    let i;
    let f;
    let highest_fruit_id=C.local("fruitadd.highest_fruit_id","int",0); let globpfx;
    let buf=C.automatic("fruitadd.buf",(1*32)); let altname=C.automatic("fruitadd.altname",(1*32));
    let user_specified=C.i8((Number(str==C.field(C.svp,"instance_globals_saved_p","pl_fruit").address)));
    nonew: {
        /* if not user-specified, then it's a fruit name for a fruit on
     * a bones level or from orctown raider's loot...
     */
        /* Note: every fruit has an id (kept in obj->spe) of at least 1;
     * 0 is an error.
     */
        if(user_specified) {
            let found=(C.i8(0)); let numeric=(C.i8(0));
            /* force fruit to be singular; this handling is not
           needed--or wanted--for fruits from bones because
           they already received it in their original game;
           str==pl_fruit but makesingular() creates a copy
           so we need to copy that back into pl_fruit */
            nmcpy(C.field(C.svp,"instance_globals_saved_p","pl_fruit").address,C.makesingular(str),32);
            /* disallow naming after other foods (since it'd be impossible
         * to tell the difference); globs might have a size prefix which
         * needs to be skipped in order to match the object type name
         */
            (globpfx=((Number(!!(Number(!(C.strncmp(C.field(C.svp,"instance_globals_saved_p","pl_fruit").address,C.literal("small "),C.u64(6))))||Number(!(C.strncmp(C.field(C.svp,"instance_globals_saved_p","pl_fruit").address,C.literal("large "),C.u64(6)))))))?6:((Number(!(C.strncmp(C.field(C.svp,"instance_globals_saved_p","pl_fruit").address,C.literal("medium "),C.u64(7)))))?7:((Number(!(C.strncmp(C.field(C.svp,"instance_globals_saved_p","pl_fruit").address,C.literal("very large "),C.u64(11)))))?11:0))));
            for((i=C.cell((C.field(C.svb,"instance_globals_saved_b","bases").address+Number(C.FOOD_CLASS)*4),"int").value);Number(C.i32(C.field((C.objects+Number(i)*C.sizes["struct objclass"]),"objclass","oc_class").value)==C.FOOD_CLASS);(()=>{const old=i;i=C.i32((old+1));return old;})()) {
                if(Number(!!(Number(!(C.strcmp((C.field((C.obj_descr+Number(C.field((C.objects+Number(i)*C.sizes["struct objclass"]),"objclass","oc_name_idx").value)*C.sizes["struct objdescr"]),"objdescr","oc_name").value),C.field(C.svp,"instance_globals_saved_p","pl_fruit").address)))||(Number(!!(Number(globpfx>0)&&Number(!(C.strcmp((C.field((C.obj_descr+Number(C.field((C.objects+Number(i)*C.sizes["struct objclass"]),"objclass","oc_name_idx").value)*C.sizes["struct objdescr"]),"objdescr","oc_name").value),(C.field(C.svp,"instance_globals_saved_p","pl_fruit").address+Number(globpfx)*1)))))))))) {
                    (found=(C.i8(1)));
                    break;
                }
            }
            if(Number(!(found))) {
                let c;
                for((c=C.field(C.svp,"instance_globals_saved_p","pl_fruit").address);Number(!!(Number(C.i32(C.cell(c,"char").value)>=48)&&Number(C.i32(C.cell(c,"char").value)<=57)));(()=>{const old=c;c=C.ptr((old+Number(1)));return old;})()) continue;

                if(Number(!!(Number(!(C.cell(c,"char").value))||C.__isspace(C.i32(C.u8(C.cell(c,"char").value)))))) (numeric=(C.i8(1)));
            }
            if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(C.i32(found)||C.i32(numeric)))||Number(!(C.strncmp(C.field(C.svp,"instance_globals_saved_p","pl_fruit").address,C.literal("cursed "),C.u64(7))))))||Number(!(C.strncmp(C.field(C.svp,"instance_globals_saved_p","pl_fruit").address,C.literal("uncursed "),C.u64(9))))))||Number(!(C.strncmp(C.field(C.svp,"instance_globals_saved_p","pl_fruit").address,C.literal("blessed "),C.u64(8))))))||Number(!(C.strncmp(C.field(C.svp,"instance_globals_saved_p","pl_fruit").address,C.literal("partly eaten "),C.u64(13))))))||(Number(!!(Number(!(C.strncmp(C.field(C.svp,"instance_globals_saved_p","pl_fruit").address,C.literal("tin of "),C.u64(7))))&&(Number(!!(Number(!(C.strcmp((C.field(C.svp,"instance_globals_saved_p","pl_fruit").address+Number(7)*1),C.literal("spinach"))))||(Number(!!(Number((C.name_to_mon((C.field(C.svp,"instance_globals_saved_p","pl_fruit").address+Number(7)*1),0))>=C.LOW_PM)&&Number((C.name_to_mon((C.field(C.svp,"instance_globals_saved_p","pl_fruit").address+Number(7)*1),0))<C.NUMMONS))))))))))))||Number(!(C.strcmp(C.field(C.svp,"instance_globals_saved_p","pl_fruit").address,C.literal("empty tin"))))))||(Number(!!(Number(!(C.strcmp(C.field(C.svp,"instance_globals_saved_p","pl_fruit").address,C.literal("glob"))))||(Number(!!(Number(globpfx>0)&&Number(!(C.strcmp(C.literal("glob"),(C.field(C.svp,"instance_globals_saved_p","pl_fruit").address+Number(globpfx)*1))))))))))))||(Number(!!((Number(!!(C.i32(C.str_end_is(C.field(C.svp,"instance_globals_saved_p","pl_fruit").address,C.literal(" corpse")))||C.i32(C.str_end_is(C.field(C.svp,"instance_globals_saved_p","pl_fruit").address,C.literal(" egg"))))))&&(Number(!!(Number((C.name_to_mon(C.field(C.svp,"instance_globals_saved_p","pl_fruit").address,0))>=C.LOW_PM)&&Number((C.name_to_mon(C.field(C.svp,"instance_globals_saved_p","pl_fruit").address,0))<C.NUMMONS)))))))))) {
                /* these checks for applying food attributes to actual items
               are case sensitive; "glob of foo" is caught by 'found'
               if 'foo' is a valid glob; when not valid, allow it as-is */
                C.strcpy(buf,C.field(C.svp,"instance_globals_saved_p","pl_fruit").address);
                C.strcpy(C.field(C.svp,"instance_globals_saved_p","pl_fruit").address,C.literal("candied "));
                nmcpy((C.field(C.svp,"instance_globals_saved_p","pl_fruit").address+Number(8)*1),buf,C.i32((32-8)));
            }
            (C.cell(altname,"char").value=C.i8(0));
            /* This flag indicates that a fruit has been made since the
         * last time the user set the fruit.  If it hasn't, we can
         * safely overwrite the current fruit, preventing the user from
         * setting many fruits in a row and overflowing.
         * Possible expansion: check for specific fruit IDs, not for
         * any fruit.
         */
            (C.field(C.flags,"flag","made_fruit").value=(C.i8(0)));
            if(replace_fruit) {
                /* replace_fruit is already part of the fruit chain;
               update it in place rather than looking it up again */
                (f=replace_fruit);
                C.copynchars(C.field(f,"fruit","fname").address,C.field(C.svp,"instance_globals_saved_p","pl_fruit").address,C.i32((32-1)));
                break nonew; /* source goto nonew */
            }
        } else {
            /* not user_supplied, so assumed to be from bones (or orc gang) */
            C.copynchars(altname,str,C.i32((32-1)));
            C.sanitize_name(altname);
            (C.field(C.flags,"flag","made_fruit").value=(C.i8(1)));
            /* for safety.  Any fruit name added from a
                                  * bones level should exist anyway. */
        }
        (f=C.fruit_from_name((C.i32(C.cell(altname,"char").value)?altname:str),(C.i8(0)),highest_fruit_id.address));
        if(f) break nonew; /* source goto nonew */
        /* Maximum number of named fruits is 127, even if obj->spe can
       handle bigger values.  If adding another fruit would overflow,
       use a random fruit instead... we've got a lot to choose from.
       current_fruit remains as is. */
        if(Number(highest_fruit_id.value>=127)) return ((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("options.c"),8273,(C.literal("fruitadd"))),C.rnd(127))):C.rnd(127)));
        (f=C.alloc(C.u32(BigInt(C.sizes["struct fruit"]))));
        C.memset(f,0,BigInt(C.sizes["struct fruit"]));
        C.copynchars(C.field(f,"fruit","fname").address,(C.i32(C.cell(altname,"char").value)?altname:str),C.i32((32-1)));
        (C.field(f,"fruit","fid").value=(()=>{const ref=highest_fruit_id;const old=ref.value;ref.value=C.i32((old+1));return ref.value;})());
        /* we used to go out of our way to add it at the end of the list,
       but the order is arbitrary so use simpler insertion at start */
        (C.field(f,"fruit","nextf").value=C.field(C.gf,"instance_globals_f","ffruit").value);
        (C.field(C.gf,"instance_globals_f","ffruit").value=f);
    }
    if(user_specified) (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","current_fruit").value=C.field(f,"fruit","fid").value);
    return C.field(f,"fruit","fid").value;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/*
 **********************************
 *
 * Option-setting, menus,
 *  displaying option values
 *
 **********************************
 */
/* RESTORE is after show_menucontrols() */
export function optfn_o_autopickup_exceptions(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        if(Number(!(opts))) return C.optn_err;
        C.variadic(221,opts,C.staticAddress("n_currently_set"),count_apes());
        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        return handler_autopickup_exception();
    }
    return C.optn_ok;
}

export function optfn_o_bind_keys(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        if(Number(!(opts))) return C.optn_err;
        C.variadic(222,opts,C.staticAddress("n_currently_set"),C.count_bind_keys());
        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        C.handler_rebind_keys();
    }
    return C.optn_ok;
}

export function optfn_o_autocomplete(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        if(Number(!(opts))) return C.optn_err;
        C.variadic(223,opts,C.staticAddress("n_currently_set"),C.count_autocompletions());
        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        C.handler_change_autocompletions();
    }
    return C.optn_ok;
}

export function optfn_o_menu_colors(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        if(Number(!(opts))) return C.optn_err;
        C.variadic(224,opts,C.staticAddress("n_currently_set"),C.count_menucolors());
        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        return handler_menu_colors();
    }
    return C.optn_ok;
}

export function optfn_o_message_types(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        if(Number(!(opts))) return C.optn_err;
        C.variadic(225,opts,C.staticAddress("n_currently_set"),msgtype_count());
        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        return handler_msgtype();
    }
    return C.optn_ok;
}

export function optfn_o_status_cond(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
        ;
        /* setting status condition options goes through pfxfn_cond_() */
    }
    if(Number(req==C.get_val)) {
        if(Number(!(opts))) return C.optn_err;
        /* opts[] is used as an output argument */
        C.variadic(226,opts,C.staticAddress("n_currently_set"),count_cond());
        return C.optn_ok;
    }
    if(Number(req==C.get_cnf_val)) {
        ;
        /* handled inline by all_options_strbuf() via all_options_conds() */
    }
    if(Number(req==C.do_handler)) {
        if(C.cond_menu()) (C.cell((C.staticAddress("opt_set_in_config")+Number(C.pfx_cond_)*1),"signed char").value=(C.i8(1)));
        return C.optn_ok;
    }
    return C.optn_ok;
}

export function optfn_o_status_hilites(optidx,req,negated,opts,op)
{
    optidx=C.i32(optidx);
    req=C.i32(req);
    negated=C.i8(negated);
    opts=C.ptr(opts);
    op=C.ptr(op);
    if(Number(req==C.do_init)) {
        return C.optn_ok;
    }
    if(Number(req==C.do_set)) {
    }
    if(Number(!!(Number(req==C.get_val)||Number(req==C.get_cnf_val)))) {
        if(Number(!(opts))) return C.optn_err;
        C.variadic(227,opts,C.staticAddress("n_currently_set"),C.count_status_hilites());
        return C.optn_ok;
    }
    if(Number(req==C.do_handler)) {
        if(Number(!(C.status_hilite_menu()))) {
            return C.optn_err;
            /*pline("Bad status hilite(s) specified.");*/
        } else {
            if(wc2_supported(C.literal("hilite_status"))) C.callback(95,(C.field(C.windowprocs,"window_procs","win_preference_update").value),C.literal("hilite_status"));
        }
        return C.optn_ok;
    }
    return C.optn_ok;
}

/*STATUS_HILITES*/
/* Get string value of configuration option.
 * Currently handles only boolean and compound options.
 */
export function get_option_value(optname,cnfvalid)
{
    optname=C.ptr(optname);
    cnfvalid=C.i8(cnfvalid);
    
    let bool_p;
    let i;
    for((i=0);Number(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","name").value!=0);(()=>{const old=i;i=C.i32((old+1));return old;})()) if(Number(!(C.strcmp(optname,C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","name").value)))) {
        if(Number(!!(Number(C.u32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","opttyp").value)==C.u32(C.BoolOpt))&&Number(((bool_p=C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","addr").value))!=0)))) {
            C.variadic(228,C.staticAddress("get_option_value.retbuf"),C.literal("%s"),(C.i32(C.cell(bool_p,"signed char").value)?C.literal("true"):C.literal("false")));
            return C.staticAddress("get_option_value.retbuf");
        } else if(Number(!!(Number(C.u32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","opttyp").value)==C.u32(C.CompOpt))&&C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","optfn").value))) {
            let reslt=C.optn_err;
            (reslt=C.callback(96,(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","optfn").value),C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","idx").value,(C.i32(cnfvalid)?C.get_cnf_val:C.get_val),(C.i8(0)),C.staticAddress("get_option_value.retbuf"),C.staticAddress("empty_optstr")));
            if(Number(!!(Number(reslt==C.optn_ok)&&C.i32(C.cell((C.staticAddress("get_option_value.retbuf")+Number(0)*1),"char").value)))) return C.staticAddress("get_option_value.retbuf");
            return 0;
        }
    }

    return 0;
}

export function longest_option_name(startpass,endpass)
{
    startpass=C.i32(startpass);
    endpass=C.i32(endpass);
    /* spin through the options to find the longest name */
    let longest_name_len=C.u32(0);
    let i; let pass; let optflags;
    let name;
    for((pass=0);Number(pass<2);(()=>{const old=pass;pass=C.i32((old+1));return old;})()) for((i=0);Number(((name=C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","name").value))!=0);(()=>{const old=i;i=C.i32((old+1));return old;})()) {
        if(Number(!!(Number(pass==0)&&(Number(!!(Number(C.u32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","opttyp").value)!=C.u32(C.BoolOpt))||Number(!(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","addr").value)))))))) continue;
        (optflags=C.i32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","setwhere").value));
        if(Number(!!(Number(optflags<startpass)||Number(optflags>endpass)))) continue;
        if(Number(!!((Number(!!(C.i32(is_wc_option(name))&&Number(!(wc_supported(name))))))||(Number(!!(C.i32(is_wc2_option(name))&&Number(!(wc2_supported(name))))))))) continue;
        let len=C.Strlen_(name,(C.literal("longest_option_name")),8527);
        if(Number(len>longest_name_len)) (longest_name_len=len);
    }

    return longest_name_len;
}

/* guts of doset_simple(); called repeatedly until no choice is made */
export function doset_simple_menu()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["doset_simple_menu.fmtstr_doset_simple",(1*14)],["doset_simple_menu.pick_list",8],["doset_simple_menu.buf",(1*256)],["doset_simple_menu.buf2",(1*256)],["doset_simple_menu.abuf",(1*256)],["doset_simple_menu.any",C.sizes["union any"]]]);
    try {
    /* unlike doset()'s fmtstr, there is no leading %s for indentation */
    
    let fmtstr_doset_simple=C.automatic("doset_simple_menu.fmtstr_doset_simple",(1*14));
    let pick_list=C.local("doset_simple_menu.pick_list","struct mi *");
    let bool_p;
    let name; let fmtstr;
    let buf=C.automatic("doset_simple_menu.buf",(1*256)); let buf2=C.automatic("doset_simple_menu.buf2",(1*256)); let abuf=C.automatic("doset_simple_menu.abuf",(1*256));
    let tmpwin;
    let any=C.automatic("doset_simple_menu.any",C.sizes["union any"]);
    let section;
    let i; let k; let pick_cnt; let reslt;
    let toggled_help=(C.i8(0));
    /* we do this each time we're called instead of once in doset_simple()
       in case 'menu_tab_sep' ever gets included in the simple menu so
       becomes subject to being changed while doset_simple() is running */
    if(Number(!(C.field(C.iflags,"instance_flags","menu_tab_sep").value))) C.variadic(229,fmtstr_doset_simple,C.literal("%%-%us [%%s]"),longest_option_name(C.set_gameview,C.set_in_game));
 else C.strcpy(fmtstr_doset_simple,C.staticAddress("doset_simple_menu.fmtstr_tab_doset_simple"));
    (fmtstr=fmtstr_doset_simple);
    redo_opt_help: while(true){
        (tmpwin=C.callback(97,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
        C.callback(98,(C.field(C.windowprocs,"window_procs","win_start_menu").value),tmpwin,C.u64(0));
        /* when showing 'help', also describe how to run full doset() */
        if(C.field(C.gs,"instance_globals_s","simple_options_help").value) {
            /* we could look up whether #optionsfull has been bound to a key
           and show that, or whether #reqmenu and #options are both still
           bound to keys and show those, but if meta keys are involved
           the player might not know how to type them; keep this simple */
            C.strcpy(buf,C.literal("Use command '#optionsfull' to get the complete options list."));
            C.add_menu_str(tmpwin,buf);
        }
        C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
        (C.field(any,"any","a_int").value=C.i32((C.i32((-2))+1)));
        C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(63),C.i8(0),0,8,(C.i32(C.field(C.gs,"instance_globals_s","simple_options_help").value)?C.literal("hide help"):C.literal("show help")),0);
        for((section=C.u32(C.OptS_General));Number(C.u32(section)<C.u32(C.OptS_Advanced));(()=>{const old=section;section=C.u32((old+1));return old;})()) {
            C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
            C.add_menu_str(tmpwin,C.literal(""));
            C.variadic(230,buf,C.literal(" %-30s "),C.cell((C.staticAddress("OptS_type")+Number(section)*8),"char *").value);
            C.add_menu_heading(tmpwin,buf);
            for((i=0);Number(((name=C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","name").value))!=0);(()=>{const old=i;i=C.i32((old+1));return old;})()) {
                if(Number(C.u32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","section").value)!=C.u32(section))) continue;
                if(Number(!!((Number(!!(C.i32(is_wc_option(name))&&Number(!(wc_supported(name))))))||(Number(!!(C.i32(is_wc2_option(name))&&Number(!(wc2_supported(name))))))))) continue;
                (C.field(any,"any","a_int").value=C.i32((i+1)));
                switch(C.u32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","opttyp").value)) {
                    case C.u32((C.BoolOpt)):
                        (bool_p=C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","addr").value);
                    if(Number(!(bool_p))) continue;
                    if(Number(!!(C.i32(C.field(C.iflags,"instance_flags","wc_tiled_map").value)&&Number(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","idx").value==C.opt_color)))) continue;
                    C.variadic(231,buf,fmtstr,name,(C.i32(C.cell(bool_p,"signed char").value)?C.literal("X"):C.literal(" ")));
                    break;
                    case C.u32((C.CompOpt)):
                        case C.u32((C.OthrOpt)):
                            (k=i);
                    if(Number(!!(Number(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","optfn").value==C.functionAddress("optfn_symset"))&&((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address))))))))) {
                        (k=C.opt_roguesymset);
                        (name=C.field((C.staticAddress("allopt")+Number(k)*C.sizes["struct allopt_t"]),"allopt_t","name").value);
                        (C.field(any,"any","a_int").value=C.i32((k+1)));
                    }
                    (C.cell((buf2+Number(0)*1),"char").value=C.i8(0));
                    (reslt=C.optn_err);
                    if(C.field((C.staticAddress("allopt")+Number(k)*C.sizes["struct allopt_t"]),"allopt_t","optfn").value) (reslt=C.callback(99,(C.field((C.staticAddress("allopt")+Number(k)*C.sizes["struct allopt_t"]),"allopt_t","optfn").value),C.field((C.staticAddress("allopt")+Number(k)*C.sizes["struct allopt_t"]),"allopt_t","idx").value,C.get_val,(C.i8(0)),buf2,C.staticAddress("empty_optstr")));
                    C.variadic(232,buf,fmtstr,name,(((Number(!!(Number(reslt==C.optn_ok)&&C.i32(C.cell((buf2+Number(0)*1),"char").value))))?buf2:C.literal("unknown"))));
                    break;
                    default:
                        C.variadic(233,buf,C.literal("ERROR"));
                    break;
                }
                /* pickup_types is separated from autopickup due to the
               spelling of their names; emphasize what it means */
                if(Number(!!(Number(!!(Number(!!(Number(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","idx").value==C.opt_pickup_types)||Number(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","idx").value==C.opt_pickup_thrown)))||Number(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","idx").value==C.opt_pickup_stolen)))||Number(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","idx").value==C.opt_dropped_nopick)))) C.strcat(buf,C.literal("  (for autopickup)"));
                C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(0),C.i8(0),0,8,buf,0);
                if(Number(!!(C.i32(C.field(C.gs,"instance_globals_s","simple_options_help").value)&&C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","descr").value))) {
                    C.variadic(234,buf,C.literal("    %s"),C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","descr").value);
                    C.add_menu_str(tmpwin,buf);
                    C.add_menu_str(tmpwin,C.literal(""));
                }
            }
        }
        C.callback(100,(C.field(C.windowprocs,"window_procs","win_end_menu").value),tmpwin,C.literal("Options"));
        (C.field(C.go,"instance_globals_o","opt_need_redraw").value=(C.i8(0)));
        (C.field(C.go,"instance_globals_o","opt_need_glyph_reset").value=(C.i8(0)));
        (C.field(C.go,"instance_globals_o","opt_reset_customcolors").value=(C.i8(0)));
        (C.field(C.go,"instance_globals_o","opt_reset_customsymbols").value=(C.i8(0)));
        (C.field(C.go,"instance_globals_o","opt_update_basic_palette").value=(C.i8(0)));
        (pick_cnt=C.select_menu(tmpwin,1,pick_list.address));
        /* note:  without the complication of a preselected entry, a PICK_ONE
       menu returning pick_cnt > 0 implies exactly 1 */
        if(Number(pick_cnt>0)) {
            (k=C.i32((C.field(C.field((pick_list.value+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value-1)));
            (C.cell((abuf+Number(0)*1),"char").value=C.i8(0));
            if(Number(k==C.i32((-2)))) {
                (C.field(C.gs,"instance_globals_s","simple_options_help").value=C.i8(Number(!(C.field(C.gs,"instance_globals_s","simple_options_help").value))));
                (toggled_help=(C.i8(1)));
            } else if(Number(C.u32(C.field((C.staticAddress("allopt")+Number(k)*C.sizes["struct allopt_t"]),"allopt_t","opttyp").value)==C.u32(C.BoolOpt))) {
                /* boolean option */
                C.variadic(235,buf,C.literal("%s%s"),(C.i32(C.cell(C.field((C.staticAddress("allopt")+Number(k)*C.sizes["struct allopt_t"]),"allopt_t","addr").value,"signed char").value)?C.literal("!"):C.literal("")),C.field((C.staticAddress("allopt")+Number(k)*C.sizes["struct allopt_t"]),"allopt_t","name").value);
                parseoptions(buf,(C.i8(0)),(C.i8(0)));
            } else {
                /* compound option */
                if(Number(!!(C.i32(C.field((C.staticAddress("allopt")+Number(k)*C.sizes["struct allopt_t"]),"allopt_t","has_handler").value)&&C.field((C.staticAddress("allopt")+Number(k)*C.sizes["struct allopt_t"]),"allopt_t","optfn").value))) {
                    (reslt=C.callback(101,(C.field((C.staticAddress("allopt")+Number(k)*C.sizes["struct allopt_t"]),"allopt_t","optfn").value),C.field((C.staticAddress("allopt")+Number(k)*C.sizes["struct allopt_t"]),"allopt_t","idx").value,C.do_handler,(C.i8(0)),C.staticAddress("empty_optstr"),C.staticAddress("empty_optstr")));
                    /* if player eventually saves options, include this one */
                    if(Number(!!(Number(reslt==C.optn_ok)&&Number(C.field((C.staticAddress("allopt")+Number(k)*C.sizes["struct allopt_t"]),"allopt_t","idx").value!=C.pfx_cond_)))) (C.cell((C.staticAddress("opt_set_in_config")+Number(k)*1),"signed char").value=(C.i8(1)));
                } else {
                    C.variadic(236,buf,C.literal("Set %s to what?"),C.field((C.staticAddress("allopt")+Number(k)*C.sizes["struct allopt_t"]),"allopt_t","name").value);
                    C.getlin(buf,abuf);
                    if(Number(C.i32(C.cell((abuf+Number(0)*1),"char").value)!=27)) {
                        /* ESC */
                        C.variadic(237,buf,C.literal("%s:"),C.field((C.staticAddress("allopt")+Number(k)*C.sizes["struct allopt_t"]),"allopt_t","name").value);
                        C.copynchars(C.eos(buf),abuf,C.i32((C.u64((C.u64((BigInt((1*256))-C.u64(1)))-C.strlen(buf))))));
                        /* pass the buck */
                        parseoptions(buf,(C.i8(0)),(C.i8(0)));
                    }
                    /* Note: using ESC to not set a new value will still return
                   'picked 1' to caller which will loop for another choice */
                }
            }
            if(Number(!!(Number(!!(Number(k>=0)&&Number(C.i32(C.cell((abuf+Number(0)*1),"char").value)!=27)))&&(Number(!!(C.i32(wc_supported(C.field((C.staticAddress("allopt")+Number(k)*C.sizes["struct allopt_t"]),"allopt_t","name").value))||C.i32(wc2_supported(C.field((C.staticAddress("allopt")+Number(k)*C.sizes["struct allopt_t"]),"allopt_t","name").value)))))))) C.callback(102,(C.field(C.windowprocs,"window_procs","win_preference_update").value),C.field((C.staticAddress("allopt")+Number(k)*C.sizes["struct allopt_t"]),"allopt_t","name").value);
            (C.free(pick_list.value),(pick_list.value=0));
        }
        /* tear down this instance of the menu; if pick_cnt is 1, caller
       will immediately call us back to put up another instance */
        C.callback(103,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tmpwin);
        if(toggled_help) {
            (toggled_help=(C.i8(0)));
            continue redo_opt_help; /* source goto redo_opt_help */
        }
        return pick_cnt;
        break redo_opt_help;
    }
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* #options - the user friendly version:  get one option from a subset of
   the zillion choices, act upon it, and prompt for another */
export function doset_simple()
{
    let pickedone=0;
    let flush=(C.i8(0));
    if(C.field(C.iflags,"instance_flags","menu_requested").value) {
        /* doset() checks for 'm' and calls doset_simple(); clear the
           menu-requested flag to avoid doing that recursively */
        (C.field(C.iflags,"instance_flags","menu_requested").value=(C.i8(0)));
        return doset();
    }
    (C.field(C.go,"instance_globals_o","opt_phase").value=C.u32(C.play_opt));
    /* select and change one option at a time, then reprocess the menu
       with updated settings to offer chance for further change */
    (C.cell(C.staticAddress("give_opt_msg"),"signed char").value=(C.i8(0)));
    do {
        (pickedone=doset_simple_menu());
        (flush=C.field(C.go,"instance_globals_o","opt_need_redraw").value);
        reset_needed_visuals();
        if(flush) {
            C.flush_screen(1);
            (flush=(C.i8(0)));
        }
    } while(Number(pickedone>0));
    (C.cell(C.staticAddress("give_opt_msg"),"signed char").value=(C.i8(1)));
    return 0;
}

export function term_for_boolean(idx,b)
{
    idx=C.i32(idx);
    b=C.ptr(b);
    let i; let f_t=(C.i32((C.cell(b,"signed char").value))?1:0);
    let boolean_term;
    
    (boolean_term=C.cell(((C.staticAddress("term_for_boolean.booleanterms")+Number(f_t)*(8*4))+Number(0)*8),"char *").value);
    (i=C.i32(C.field((C.staticAddress("allopt")+Number(idx)*C.sizes["struct allopt_t"]),"allopt_t","termpref").value));
    if(Number(!!(Number(!!(Number(i>C.Term_False)&&Number(i<C.num_terms)))&&Number(i<C.i32((C.u64((BigInt((8*4))/BigInt(8))))))))) (boolean_term=C.cell(((C.staticAddress("term_for_boolean.booleanterms")+Number(f_t)*(8*4))+Number(i)*8),"char *").value);
    return boolean_term;
}

/* the #optionsfull command */
export function doset()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["doset.fmtstr_doset",(1*16)],["doset.buf",(1*256)],["doset.any",C.sizes["union any"]],["doset.pick_list",8],["doset.abuf",(1*256)]]);
    try {
    /* changing options via menu by Per Liboriussen */
    
    let fmtstr_doset=C.automatic("doset.fmtstr_doset",(1*16));
    let buf=C.automatic("doset.buf",(1*256));
    let name; let indent;
    let i=0; let pass; let pick_cnt; let pick_idx; let opt_indx;
    let bool_p;
    let tmpwin;
    let any=C.automatic("doset.any",C.sizes["union any"]);
    let pick_list=C.local("doset.pick_list","struct mi *");
    let indexoffset; let startpass; let endpass;
    let gavehelp=(C.i8(0)); let skiphelp=C.i8(Number(!(C.field(C.iflags,"instance_flags","cmdassist").value)));
    let clr=8;
    if(C.field(C.iflags,"instance_flags","menu_requested").value) {
        /* doset_simple() checks for 'm' and calls doset(); clear the
           menu-requested flag to avoid doing that recursively */
        (C.field(C.iflags,"instance_flags","menu_requested").value=(C.i8(0)));
        return doset_simple();
    }
    (C.field(C.go,"instance_globals_o","opt_phase").value=C.u32(C.play_opt));
    /* if we offer '?' as a choice and it is the only thing chosen,
       we'll end up coming back here after showing the explanatory text */
    rerun: while(true){
        (tmpwin=C.callback(104,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
        C.callback(105,(C.field(C.windowprocs,"window_procs","win_start_menu").value),tmpwin,C.u64(0));
        /* offer novices a chance to request helpful [sic] advice */
        if(Number(!(skiphelp))) {
            /* help text surrounding '?' choice should have exactly one NULL */
            
            /* actual '?' menu entry gets inserted here */
            C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
            for((i=0);Number(i<C.i32((C.u64((BigInt((8*5))/BigInt(8))))));(()=>{const old=i;i=C.i32((old+1));return i;})()) {
                if(C.cell((C.staticAddress("doset.helptext")+Number(i)*8),"char *").value) {
                    C.variadic(238,buf,C.literal("%4s%.75s"),C.literal(""),C.cell((C.staticAddress("doset.helptext")+Number(i)*8),"char *").value);
                    C.add_menu_str(tmpwin,buf);
                } else {
                    (C.field(any,"any","a_int").value=C.i32(((C.i32((C.u64((BigInt((C.sizes["struct allopt_t"]*218))/BigInt(C.sizes["struct allopt_t"]))))))+1)));
                    /* handling pick_list subtracts 1 */
                    C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(63),C.i8(63),0,clr,C.literal("view help for options menu"),2);
                }
            }
        }
        /* SYSCF */
        /* XXX I think this is still fragile.  Fixing initial/from_file and/or
       changing the SET_* etc to bitmaps will let me make this better. */
        (startpass=C.set_gameview);
        (endpass=(C.i32((C.field(C.flags,"flag","debug").value))?C.set_wiznofuz:C.set_in_game));
        if(Number(!(C.field(C.iflags,"instance_flags","menu_tab_sep").value))) C.variadic(239,fmtstr_doset,C.literal("%%s%%-%us [%%s]"),longest_option_name(startpass,endpass));
 else C.strcpy(fmtstr_doset,C.staticAddress("doset.fmtstr_tab_doset"));
        /* initial "%s" is for indentation of non-selectable items */
        (indexoffset=1);
        C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
        C.add_menu_heading(tmpwin,C.literal("Booleans (selecting will toggle value):"));
        (C.field(any,"any","a_int").value=0);
        /* first list any other non-modifiable booleans, then modifiable ones */
        for((pass=0);Number(pass<=1);(()=>{const old=pass;pass=C.i32((old+1));return old;})()) for((i=0);Number(((name=C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","name").value))!=0);(()=>{const old=i;i=C.i32((old+1));return old;})()) if(Number(!!(Number(!!(Number(C.u32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","opttyp").value)==C.u32(C.BoolOpt))&&Number(((bool_p=C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","addr").value))!=0)))&&(Number(!!((Number(!!(Number(C.u32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","setwhere").value)<=C.u32(C.set_gameview))&&Number(pass==0))))||(Number(!!(Number(C.u32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","setwhere").value)>=C.u32(C.set_in_game))&&Number(pass==1)))))))))) {
            if(Number(bool_p==C.field(C.flags,"flag","female").address)) continue;
            /* obsolete */
            if(Number(!!(Number(C.u32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","setwhere").value)==C.u32(C.set_wizonly))&&Number(!(C.field(C.flags,"flag","debug").value))))) continue;
            if(Number(!!(Number(C.u32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","setwhere").value)==C.u32(C.set_wiznofuz))&&(Number(!!(Number(!(C.field(C.flags,"flag","debug").value))||C.i32(C.field(C.iflags,"instance_flags","debug_fuzzer").value))))))) continue;
            if(Number(!!((Number(!!(C.i32(is_wc_option(name))&&Number(!(wc_supported(name))))))||(Number(!!(C.i32(is_wc2_option(name))&&Number(!(wc2_supported(name))))))))) continue;
            (C.field(any,"any","a_int").value=((Number(pass==0))?0:C.i32((C.i32((i+1))+indexoffset))));
            (indent=((Number(!!(Number(pass==0)&&Number(!(C.field(C.iflags,"instance_flags","menu_tab_sep").value)))))?C.literal("    "):C.literal("")));
            C.variadic(240,buf,fmtstr_doset,indent,name,term_for_boolean(i,bool_p));
            if(Number(pass==0)) enhance_menu_text(buf,BigInt((1*256)),pass,bool_p,(C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]));
            C.add_menu(tmpwin,C.nul_glyphinfo,any,C.i8(0),C.i8(0),0,clr,buf,2);
        }


        C.add_menu_str(tmpwin,C.literal(""));
        C.add_menu_heading(tmpwin,C.literal("Compounds (selecting will prompt for new value):"));
        for((pass=startpass);Number(pass<=endpass);(()=>{const old=pass;pass=C.i32((old+1));return old;})()) for((i=0);Number(((name=C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","name").value))!=0);(()=>{const old=i;i=C.i32((old+1));return old;})()) {
            if(Number(C.u32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","opttyp").value)!=C.u32(C.CompOpt))) continue;
            if(Number(C.i32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","setwhere").value)==pass)) {
                if(Number(!!((Number(!!(C.i32(is_wc_option(name))&&Number(!(wc_supported(name))))))||(Number(!!(C.i32(is_wc2_option(name))&&Number(!(wc2_supported(name))))))))) continue;
                doset_add_menu(tmpwin,name,fmtstr_doset,i,((Number(pass==C.set_gameview))?0:indexoffset));
            }
        }

        C.add_menu_str(tmpwin,C.literal(""));
        C.add_menu_heading(tmpwin,C.literal("Other settings:"));
        for((pass=startpass);Number(pass<=endpass);(()=>{const old=pass;pass=C.i32((old+1));return old;})()) for((i=0);Number(((name=C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","name").value))!=0);(()=>{const old=i;i=C.i32((old+1));return old;})()) {
            if(Number(C.u32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","opttyp").value)!=C.u32(C.OthrOpt))) continue;
            if(Number(C.i32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","setwhere").value)==pass)) {
                if(Number(!!((Number(!!(C.i32(is_wc_option(name))&&Number(!(wc_supported(name))))))||(Number(!!(C.i32(is_wc2_option(name))&&Number(!(wc2_supported(name))))))))) continue;
                doset_add_menu(tmpwin,name,fmtstr_doset,i,((Number(pass==C.set_gameview))?0:indexoffset));
            }
        }

        C.callback(106,(C.field(C.windowprocs,"window_procs","win_end_menu").value),tmpwin,C.literal("Set what options?"));
        (C.field(C.go,"instance_globals_o","opt_need_redraw").value=(C.i8(0)));
        (C.field(C.go,"instance_globals_o","opt_need_glyph_reset").value=(C.i8(0)));
        if(Number(((pick_cnt=C.select_menu(tmpwin,2,pick_list.address)))>0)) {
            /*
         * Walk down the selection list and either invert the booleans
         * or prompt for new values. In most cases, call parseoptions()
         * to take care of options that require special attention, like
         * redraws.
         */
            for((pick_idx=0);Number(pick_idx<pick_cnt);(()=>{const old=pick_idx;pick_idx=C.i32((old+1));return pick_idx;})()) {
                (opt_indx=C.i32((C.field(C.field((pick_list.value+Number(pick_idx)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value-1)));
                if(Number(opt_indx==(C.i32((C.u64((BigInt((C.sizes["struct allopt_t"]*218))/BigInt(C.sizes["struct allopt_t"])))))))) {
                    C.callback(107,(C.field(C.windowprocs,"window_procs","win_display_file").value),C.literal("optmenu"),(C.i8(0)));
                    (gavehelp=(C.i8(1)));
                    continue;
                    /* just handled '?'; there might be more picks */
                }
                if(Number(opt_indx<C.i32((-1)))) (()=>{const old=opt_indx;opt_indx=C.i32((old+1));return old;})();
                /* -1 offset for select_menu() */
                (opt_indx=C.i32(opt_indx-indexoffset));
                ((Number(!!(((Number(!!(Number((opt_indx)>=0)&&Number((opt_indx)<C.i32((C.u64((BigInt((C.sizes["struct allopt_t"]*218))/BigInt(C.sizes["struct allopt_t"]))))))))))||((C.__assert_fail(C.literal("IndexOk(opt_indx, allopt)"),C.literal("options.c"),8924,(C.literal("doset"))),0))))));
                if(Number(C.u32(C.field((C.staticAddress("allopt")+Number(opt_indx)*C.sizes["struct allopt_t"]),"allopt_t","opttyp").value)==C.u32(C.BoolOpt))) {
                    /* boolean option */
                    C.variadic(241,buf,C.literal("%s%s"),(C.i32(C.cell(C.field((C.staticAddress("allopt")+Number(opt_indx)*C.sizes["struct allopt_t"]),"allopt_t","addr").value,"signed char").value)?C.literal("!"):C.literal("")),C.field((C.staticAddress("allopt")+Number(opt_indx)*C.sizes["struct allopt_t"]),"allopt_t","name").value);
                    parseoptions(buf,(C.i8(0)),(C.i8(0)));
                } else {
                    /* compound option */
                    let k=opt_indx; let reslt;
                    if(Number(!!(C.i32(C.field((C.staticAddress("allopt")+Number(k)*C.sizes["struct allopt_t"]),"allopt_t","has_handler").value)&&C.field((C.staticAddress("allopt")+Number(k)*C.sizes["struct allopt_t"]),"allopt_t","optfn").value))) {
                        (reslt=C.callback(108,(C.field((C.staticAddress("allopt")+Number(k)*C.sizes["struct allopt_t"]),"allopt_t","optfn").value),C.field((C.staticAddress("allopt")+Number(k)*C.sizes["struct allopt_t"]),"allopt_t","idx").value,C.do_handler,(C.i8(0)),C.staticAddress("empty_optstr"),C.staticAddress("empty_optstr")));
                        /* if player eventually saves options, include this one */
                        if(Number(reslt==C.optn_ok)) (C.cell((C.staticAddress("opt_set_in_config")+Number(k)*1),"signed char").value=(C.i8(1)));
                    } else {
                        let abuf=C.automatic("doset.abuf",(1*256));
                        C.variadic(242,buf,C.literal("Set %s to what?"),C.field((C.staticAddress("allopt")+Number(opt_indx)*C.sizes["struct allopt_t"]),"allopt_t","name").value);
                        (C.cell((abuf+Number(0)*1),"char").value=C.i8(0));
                        C.getlin(buf,abuf);
                        if(Number(C.i32(C.cell((abuf+Number(0)*1),"char").value)==27)) continue;
                        C.variadic(243,buf,C.literal("%s:"),C.field((C.staticAddress("allopt")+Number(opt_indx)*C.sizes["struct allopt_t"]),"allopt_t","name").value);
                        C.strncat(C.eos(buf),abuf,(C.u64((C.u64((BigInt((1*256))-C.u64(1)))-C.strlen(buf)))));
                        /* pass the buck */
                        parseoptions(buf,(C.i8(0)),(C.i8(0)));
                    }
                }
                if(Number(!!(C.i32(wc_supported(C.field((C.staticAddress("allopt")+Number(opt_indx)*C.sizes["struct allopt_t"]),"allopt_t","name").value))||C.i32(wc2_supported(C.field((C.staticAddress("allopt")+Number(opt_indx)*C.sizes["struct allopt_t"]),"allopt_t","name").value))))) C.callback(109,(C.field(C.windowprocs,"window_procs","win_preference_update").value),C.field((C.staticAddress("allopt")+Number(opt_indx)*C.sizes["struct allopt_t"]),"allopt_t","name").value);
            }
            (C.free(pick_list.value),(pick_list.value=0));
        }
        C.callback(110,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tmpwin);
        if(Number(!!(Number(pick_cnt==1)&&C.i32(gavehelp)))) {
            /* when '?' is only the thing selected, go back and pick all
           over again without it as an available choice second time */
            (skiphelp=(C.i8(1)));
            (gavehelp=(C.i8(0)));
            /* currently True; reset for second pass */
            continue rerun; /* source goto rerun */
        }
        reset_needed_visuals();
        return 0;
        break rerun;
    }
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function reset_needed_visuals()
{
    if(C.field(C.go,"instance_globals_o","opt_need_glyph_reset").value) {
        C.reset_glyphmap(C.u32(C.gm_optionchange));
    }
    if(Number(!!(Number(!!(Number(!!(C.i32(C.field(C.go,"instance_globals_o","opt_reset_customcolors").value)||C.i32(C.field(C.go,"instance_globals_o","opt_update_basic_palette").value)))||C.i32(C.field(C.go,"instance_globals_o","opt_reset_customsymbols").value)))||C.i32(C.field(C.go,"instance_globals_o","opt_need_redraw").value)))) {
        if(C.field(C.go,"instance_globals_o","opt_update_basic_palette").value) {
            (C.field(C.go,"instance_globals_o","opt_update_basic_palette").value=(C.i8(0)));
        }
        if(C.field(C.go,"instance_globals_o","opt_reset_customcolors").value) C.reset_customcolors();
        if(C.field(C.go,"instance_globals_o","opt_reset_customsymbols").value) C.reset_customsymbols();
        if(C.field(C.go,"instance_globals_o","opt_need_redraw").value) {
            C.check_gold_symbol();
            C.reglyph_darkroom();
        }
        C.docrt();
    }
    if(C.field(C.go,"instance_globals_o","opt_need_promptstyle").value) {
        C.adjust_menu_promptstyle(C.global("WIN_INVEN").value,C.field(C.iflags,"instance_flags","menu_headings").address);
    }
    if(Number(!!(C.i32(C.field(C.disp,"display_hints","botl").value)||C.i32(C.field(C.disp,"display_hints","botlx").value)))) {
        C.bot();
    }
    (C.field(C.go,"instance_globals_o","opt_need_redraw").value=(C.i8(0)));
    (C.field(C.go,"instance_globals_o","opt_need_glyph_reset").value=(C.i8(0)));
    (C.field(C.go,"instance_globals_o","opt_reset_customcolors").value=(C.i8(0)));
    (C.field(C.go,"instance_globals_o","opt_reset_customsymbols").value=(C.i8(0)));
    (C.field(C.go,"instance_globals_o","opt_update_basic_palette").value=(C.i8(0)));
}

/* doset(#optionsfull command) menu entries for compound options */
export function doset_add_menu(win,option,fmtstr,idx,indexoffset)
{
    win=C.i32(win);
    option=C.ptr(option);
    fmtstr=C.ptr(fmtstr);
    idx=C.i32(idx);
    indexoffset=C.i32(indexoffset);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["doset_add_menu.buf",(1*256)],["doset_add_menu.buf2",(1*256)],["doset_add_menu.any",C.sizes["union any"]]]);
    try {
    /* window to add to */
    /* option name */
    /* fmtstr_doset */
    /* index in allopt[] */
    /* value to add to index in allopt[],
                         * or zero if option cannot be changed */
    let value=C.literal("unknown");
    /* current value */
    let indent;
    let buf=C.automatic("doset_add_menu.buf",(1*256)); let buf2=C.automatic("doset_add_menu.buf2",(1*256));
    let any=C.automatic("doset_add_menu.any",C.sizes["union any"]);
    let i=idx; let reslt=C.optn_err;
    let clr=8;
    (C.cell((buf2+Number(0)*1),"char").value=C.i8(0));
    /* per opt functs may not guarantee this, so do it */
    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    if(Number(!!(Number(!!(Number(!!(Number(i>=0)&&Number(i<C.OPTCOUNT)))&&C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","name").value))&&C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","optfn").value))) {
        (C.field(any,"any","a_int").value=((Number(indexoffset==0))?0:C.i32((C.i32((i+1))+indexoffset))));
        if(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","optfn").value) (reslt=C.callback(111,(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","optfn").value),C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","idx").value,C.get_val,(C.i8(0)),buf2,C.staticAddress("empty_optstr")));
        if(Number(!!(Number(reslt==C.optn_ok)&&C.i32(C.cell((buf2+Number(0)*1),"char").value)))) (value=buf2);
    } else {
        /* We are trying to add an option not found in allopt[].
           This is almost certainly bad, but we'll let it through anyway
           (with a zero value, so it can't be selected). */
        (C.field(any,"any","a_int").value=0);
        if(Number(!(C.cell((buf2+Number(0)*1),"char").value))) C.strcpy(buf2,C.literal("unknown"));
        (value=buf2);
    }
    /* "    " replaces "a - " -- assumes menus follow that style */
    (indent=(Number(!(C.field(any,"any","a_int").value))?C.literal("    "):C.literal("")));
    C.variadic(244,buf,fmtstr,indent,option,value);
    C.add_menu(win,C.nul_glyphinfo,any,C.i8(0),C.i8(0),0,clr,buf,2);
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* display keys for menu actions; used by cmd.c '?i' and pager.c '?k' */
export function show_menu_controls(win,dolist)
{
    win=C.i32(win);
    dolist=C.i8(dolist);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["show_menu_controls.buf",(1*256)]]);
    try {
    
    
    
    let buf=C.automatic("show_menu_controls.buf",(1*256));
    let fmt; let arg;
    let xcp;
    let has_menu_shift=wc2_supported(C.literal("menu_shift"));
    /*
     * Relies on spaces to line things up in columns, so must be rendered
     * with a fixed-width font or will look dreadful.
     */
    C.callback(112,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,C.literal("Menu control keys:"));
    if(dolist) {
        /* key bindings help: '?i' */
        let i;
        let ch;
        (fmt=C.literal("%-7s %s"));
        for((i=0);C.field((C.staticAddress("default_menu_cmd_info")+Number(i)*C.sizes["menu_cmd_t"]),"menu_cmd_t","desc").value;(()=>{const old=i;i=C.i32((old+1));return old;})()) {
            (ch=C.field((C.staticAddress("default_menu_cmd_info")+Number(i)*C.sizes["menu_cmd_t"]),"menu_cmd_t","cmd").value);
            if(Number(!!((Number(!!(Number(C.i32(ch)==125)||Number(C.i32(ch)==123))))&&Number(!(has_menu_shift))))) continue;
            C.variadic(245,buf,fmt,C.visctrl(get_menu_cmd_key(ch)),C.field((C.staticAddress("default_menu_cmd_info")+Number(i)*C.sizes["menu_cmd_t"]),"menu_cmd_t","desc").value);
            C.callback(113,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,buf);
        }
        /* no separator before hardcoded */
        (fmt=C.literal("%s%-7s %s"));
        /* extra specifier to absorb 'arg' */
        (arg=C.literal(""));
        /* no extra prefix for 'dolist' */
    } else {
        /* menu controls help: '?k' */
        C.callback(114,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,C.literal(""));
        C.variadic(246,buf,C.staticAddress("show_menu_controls.mc_altfmt"),C.literal(""),C.literal("Whole"),C.literal("Current"));
        C.callback(115,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,buf);
        C.variadic(247,buf,C.staticAddress("show_menu_controls.mc_altfmt"),C.literal(""),C.literal(" Menu"),C.literal(" Page"));
        C.callback(116,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,buf);
        C.variadic(248,buf,C.staticAddress("show_menu_controls.mc_fmt"),C.literal("Select"),C.visctrl(get_menu_cmd_key(C.i8(46))),C.visctrl(get_menu_cmd_key(C.i8(44))));
        C.callback(117,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,buf);
        C.variadic(249,buf,C.staticAddress("show_menu_controls.mc_fmt"),C.literal("Invert"),C.visctrl(get_menu_cmd_key(C.i8(64))),C.visctrl(get_menu_cmd_key(C.i8(126))));
        C.callback(118,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,buf);
        C.variadic(250,buf,C.staticAddress("show_menu_controls.mc_fmt"),C.literal("Deselect"),C.visctrl(get_menu_cmd_key(C.i8(45))),C.visctrl(get_menu_cmd_key(C.i8(92))));
        C.callback(119,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,buf);
        C.callback(120,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,C.literal(""));
        C.variadic(251,buf,C.staticAddress("show_menu_controls.mc_fmt"),C.literal("Go to"),C.visctrl(get_menu_cmd_key(C.i8(62))),C.literal("Next page"));
        C.callback(121,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,buf);
        C.variadic(252,buf,C.staticAddress("show_menu_controls.mc_fmt"),C.literal(""),C.visctrl(get_menu_cmd_key(C.i8(60))),C.literal("Previous page"));
        C.callback(122,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,buf);
        C.variadic(253,buf,C.staticAddress("show_menu_controls.mc_fmt"),C.literal(""),C.visctrl(get_menu_cmd_key(C.i8(94))),C.literal("First page"));
        C.callback(123,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,buf);
        C.variadic(254,buf,C.staticAddress("show_menu_controls.mc_fmt"),C.literal(""),C.visctrl(get_menu_cmd_key(C.i8(124))),C.literal("Last page"));
        C.callback(124,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,buf);
        if(has_menu_shift) {
            C.variadic(255,buf,C.staticAddress("show_menu_controls.mc_fmt"),C.literal("Pan view"),C.visctrl(get_menu_cmd_key(C.i8(125))),C.literal("Right (perm_invent only)"));
            C.callback(125,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,buf);
            C.variadic(256,buf,C.staticAddress("show_menu_controls.mc_fmt"),C.literal(""),C.visctrl(get_menu_cmd_key(C.i8(123))),C.literal("Left"));
            C.callback(126,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,buf);
        }
        C.callback(127,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,C.literal(""));
        C.variadic(257,buf,C.staticAddress("show_menu_controls.mc_fmt"),C.literal("Search"),C.visctrl(get_menu_cmd_key(C.i8(58))),C.literal("Exter a target string and invert all matching entries"));
        C.callback(128,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,buf);
        /* separator before hardcoded */
        C.callback(129,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,C.literal(""));
        (fmt=C.literal("%9s  %-8s %s"));
        (arg=C.literal("Other "));
        /* prefix for first hardcoded[] entry, then reset */
    }
    for((xcp=C.staticAddress("show_menu_controls.hardcoded"));C.field(xcp,"xtra_cntrls","key").value;(()=>{const old=xcp;xcp=C.ptr((old+Number(C.sizes["struct xtra_cntrls"])));return xcp;})()) {
        C.variadic(258,buf,fmt,arg,C.field(xcp,"xtra_cntrls","key").value,C.field(xcp,"xtra_cntrls","desc").value);
        C.callback(130,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,buf);
        (arg=C.literal(""));
    }
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function count_cond()
{
    let i; let cnt=0;
    for((i=0);Number(i<C.CONDITION_COUNT);(()=>{const old=i;i=C.i32((old+1));return i;})()) {
        if(C.field((C.condtests+Number(i)*C.sizes["struct condtests_t"]),"condtests_t","enabled").value) (()=>{const old=cnt;cnt=C.i32((old+1));return old;})();
    }
    return cnt;
}

export function count_apes()
{
    let numapes=0;
    let ape=C.field(C.ga,"instance_globals_a","apelist").value;
    while(ape) {
        (()=>{const old=numapes;numapes=C.i32((old+1));return old;})();
        (ape=C.field(ape,"autopickup_exception","next").value);
    }
    return numapes;
}

/* common to msg-types, menu-colors, autopickup-exceptions */
export function handle_add_list_remove(optname,numtotal)
{
    optname=C.ptr(optname);
    numtotal=C.i32(numtotal);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["handle_add_list_remove.any",C.sizes["union any"]],["handle_add_list_remove.pick_list",8],["handle_add_list_remove.tmpbuf",(1*256)]]);
    try {
    let tmpwin;
    let any=C.automatic("handle_add_list_remove.any",C.sizes["union any"]);
    let i; let pick_cnt; let opt_idx;
    let pick_list=C.local("handle_add_list_remove.pick_list","struct mi *",0);
    
    /* [0] */
    /* [1] */
    /* [2] */
    /* [3] */
    let clr=8;
    (tmpwin=C.callback(131,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.callback(132,(C.field(C.windowprocs,"window_procs","win_start_menu").value),tmpwin,C.u64(0));
    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    for((i=0);Number(i<C.i32((C.u64((BigInt((C.sizes["struct action"]*4))/BigInt(C.sizes["struct action"]))))));(()=>{const old=i;i=C.i32((old+1));return old;})()) {
        let tmpbuf=C.automatic("handle_add_list_remove.tmpbuf",(1*256));
        (()=>{const ref=C.field(any,"any","a_int");const old=ref.value;ref.value=C.i32((old+1));return old;})();
        /* omit list and remove if there aren't any yet */
        if(Number(!!(Number(!(numtotal))&&(Number(!!(Number(i==1)||Number(i==2))))))) continue;
        C.variadic(259,tmpbuf,C.field((C.staticAddress("handle_add_list_remove.action_titles")+Number(i)*C.sizes["struct action"]),"action","desc").value,((Number(i==1))?C.makeplural(optname):optname));
        C.add_menu(tmpwin,C.nul_glyphinfo,any,C.field((C.staticAddress("handle_add_list_remove.action_titles")+Number(i)*C.sizes["struct action"]),"action","letr").value,C.i8(0),0,clr,tmpbuf,((Number(i==3))?1:0));
    }
    C.callback(133,(C.field(C.windowprocs,"window_procs","win_end_menu").value),tmpwin,C.literal("Do what?"));
    if(Number(((pick_cnt=C.select_menu(tmpwin,1,pick_list.address)))>0)) {
        (opt_idx=C.i32((C.field(C.field((pick_list.value+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value-1)));
        if(Number(!!(Number(pick_cnt>1)&&Number(opt_idx==3)))) (opt_idx=C.i32((C.field(C.field((pick_list.value+Number(1)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value-1)));
        C.free(pick_list.value);
    } else (opt_idx=3);
    /* none selected, exit menu */
    C.callback(134,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tmpwin);
    return opt_idx;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function dotogglepickup()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["dotogglepickup.buf",(1*256)],["dotogglepickup.ocl",(1*19)]]);
    try {
    let buf=C.automatic("dotogglepickup.buf",(1*256)); let ocl=C.automatic("dotogglepickup.ocl",(1*19));
    (C.field(C.flags,"flag","pickup").value=C.i8(Number(!(C.field(C.flags,"flag","pickup").value))));
    if(C.field(C.flags,"flag","pickup").value) {
        oc_to_str(C.field(C.flags,"flag","pickup_types").address,ocl);
        C.variadic(260,buf,C.literal("ON, for %s objects%s"),(C.i32(C.cell((ocl+Number(0)*1),"char").value)?ocl:C.literal("all")),((C.field(C.ga,"instance_globals_a","apelist").value)?(((Number(count_apes()==1))?C.literal(", with one exception"):C.literal(", with some exceptions"))):C.literal("")));
    } else {
        C.strcpy(buf,C.literal("OFF"));
    }
    C.variadic(261,C.literal("Autopickup: %s."),buf);
    return 0;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* toggle any (settable in-game) boolean option by name */
export function toggle_bool_option(p)
{
    p=C.ptr(p);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["toggle_bool_option.buf",(1*256)]]);
    try {
    let i;
    let ret=4;
    for((i=0);Number(i<C.OPTCOUNT);(()=>{const old=i;i=C.i32((old+1));return old;})()) if(Number(!!(Number(!!(Number(!!(Number(!(C.strncmpi(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","name").value,p,C.i32(C.strlen(p)))))&&Number(C.u32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","opttyp").value)==C.u32(C.BoolOpt))))&&Number(C.u32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","setwhere").value)==C.u32(C.set_in_game))))&&Number(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","addr").value!=0)))) {
        let buf=C.automatic("toggle_bool_option.buf",(1*256));
        C.variadic(262,buf,C.literal("%s%s"),(C.i32(C.cell(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","addr").value,"signed char").value)?C.literal("!"):C.literal("")),C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","name").value);
        if(parseoptions(buf,(C.i8(0)),(C.i8(0)))) (ret=0);
        reset_needed_visuals();
    }

    return ret;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function add_autopickup_exception(mapping)
{
    mapping=C.ptr(mapping);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["add_autopickup_exception.text",(1*256)],["add_autopickup_exception.end",1],["add_autopickup_exception.errbuf",(1*256)]]);
    try {
    
    let ape;
    let text=C.automatic("add_autopickup_exception.text",(1*256)); let end=C.local("add_autopickup_exception.end","char");
    let n;
    let grab=(C.i8(0));
    /* scan length limit used to be 255, but smaller size allows the
       quoted value to fit within BUFSZ, simplifying formatting elsewhere;
       this used to ignore the possibility of trailing junk but now checks
       for it, accepting whitespace but rejecting anything else unless it
       starts with '#" for a comment */
    (end.value=C.i8(0));
    if(Number(!!(Number(((n=C.variadic(263,mapping,C.literal("\"<%253[^\"]\" %c"),text,end.address)))==1)||(Number(!!(Number(n==2)&&Number(C.i32(end.value)==35))))))) {
        (grab=(C.i8(1)));
    } else if(Number(!!(Number(!!(Number(((n=C.variadic(264,mapping,C.literal("\">%253[^\"]\" %c"),text,end.address)))==1)||Number(((n=C.variadic(265,mapping,C.literal("\"%253[^\"]\" %c"),text,end.address)))==1)))||(Number(!!(Number(n==2)&&Number(C.i32(end.value)==35))))))) {
        (grab=(C.i8(0)));
    } else {
        C.variadic(266,C.literal("%s"),C.staticAddress("add_autopickup_exception.APE_syntax_error"));
        return 0;
    }
    (ape=C.alloc(C.u32(BigInt(C.sizes["struct autopickup_exception"]))));
    (C.field(ape,"autopickup_exception","regex").value=C.regex_init());
    if(Number(!(C.regex_compile(text,C.field(ape,"autopickup_exception","regex").value)))) {
        let errbuf=C.automatic("add_autopickup_exception.errbuf",(1*256));
        let re_error_desc=C.regex_error_desc(C.field(ape,"autopickup_exception","regex").value,errbuf);
        /* free first in case reason for failure was insufficient memory */
        C.regex_free(C.field(ape,"autopickup_exception","regex").value);
        C.free(ape);
        C.variadic(267,C.literal("%s: %s"),C.staticAddress("add_autopickup_exception.APE_regex_error"),re_error_desc);
        return 0;
    }
    (C.field(ape,"autopickup_exception","pattern").value=C.dupstr(text));
    (C.field(ape,"autopickup_exception","grab").value=grab);
    (C.field(ape,"autopickup_exception","next").value=C.field(C.ga,"instance_globals_a","apelist").value);
    (C.field(C.ga,"instance_globals_a","apelist").value=ape);
    return 1;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function remove_autopickup_exception(whichape)
{
    whichape=C.ptr(whichape);
    let ape; let freeape; let prev=0;
    for((ape=C.field(C.ga,"instance_globals_a","apelist").value);ape;) {
        if(Number(ape==whichape)) {
            (freeape=ape);
            (ape=C.field(ape,"autopickup_exception","next").value);
            if(prev) (C.field(prev,"autopickup_exception","next").value=ape);
 else (C.field(C.ga,"instance_globals_a","apelist").value=ape);
            C.regex_free(C.field(freeape,"autopickup_exception","regex").value);
            C.free(C.field(freeape,"autopickup_exception","pattern").value);
            C.free(freeape);
        } else {
            (prev=ape);
            (ape=C.field(ape,"autopickup_exception","next").value);
        }
    }
}

export function free_autopickup_exceptions()
{
    let ape;
    while(Number(((ape=C.field(C.ga,"instance_globals_a","apelist").value))!=0)) {
        C.free(C.field(ape,"autopickup_exception","pattern").value);
        C.regex_free(C.field(ape,"autopickup_exception","regex").value);
        (C.field(C.ga,"instance_globals_a","apelist").value=C.field(ape,"autopickup_exception","next").value);
        C.free(ape);
    }
}

export function sym_val(strval)
{
    strval=C.ptr(strval);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["sym_val.buf",(1*128)],["sym_val.tmp",(1*128)]]);
    try {
    /* up to 4*BUFSZ-1 long; only first few
                               chars matter */
    let buf=C.automatic("sym_val.buf",(1*128)); let tmp=C.automatic("sym_val.tmp",(1*128));
    /* to hold truncated copy of 'strval' */
    (C.cell((buf+Number(0)*1),"char").value=C.i8(0));
    if(Number(!!(Number(!(C.cell((strval+Number(0)*1),"char").value))||Number(!(C.cell((strval+Number(1)*1),"char").value))))) {
        /* empty, or single character */
        /* if single char is space or tab, leave buf[0]=='\0' */
        if(Number(!(C.__isspace(C.i32(C.u8(C.cell((strval+Number(0)*1),"char").value)))))) (C.cell((buf+Number(0)*1),"char").value=C.cell((strval+Number(0)*1),"char").value);
    } else if(Number(C.i32(C.cell((strval+Number(0)*1),"char").value)==39)) {
        /* single quote */
        /* simple matching single quote; we know strval[1] isn't '\0' */
        if(Number(!!(Number(C.i32(C.cell((strval+Number(2)*1),"char").value)==39)&&Number(!(C.cell((strval+Number(3)*1),"char").value))))) {
            /* accepts '\' as backslash and ''' as single quote */
            (C.cell((buf+Number(0)*1),"char").value=C.cell((strval+Number(1)*1),"char").value);
            /* if backslash, handle single or double quote or second backslash */
        } else if(Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(C.cell((strval+Number(1)*1),"char").value)==92)&&C.i32(C.cell((strval+Number(2)*1),"char").value)))&&Number(C.i32(C.cell((strval+Number(3)*1),"char").value)==39)))&&C.strchr(C.literal("'\"\\"),C.i32(C.cell((strval+Number(2)*1),"char").value))))&&Number(!(C.cell((strval+Number(4)*1),"char").value))))) {
            (C.cell((buf+Number(0)*1),"char").value=C.cell((strval+Number(2)*1),"char").value);
            /* not simple quote or basic backslash;
           strip closing quote and let escapes() deal with it */
        } else {
            let p;
            /* +1: skip opening single quote */
            C.strncpy(tmp,(strval+Number(1)*1),C.u64((BigInt((1*128))-C.u64(1))));
            (C.cell((tmp+Number(C.u64((BigInt((1*128))-C.u64(1))))*1),"char").value=C.i8(0));
            if(Number(((p=C.strrchr(tmp,39)))!=0)) {
                (C.cell(p,"char").value=C.i8(0));
                escapes(tmp,buf);
            }
            /* else buf[0] stays '\0' */
        }
    } else {
        /* not lone char nor single quote */
        C.strncpy(tmp,strval,C.u64((BigInt((1*128))-C.u64(1))));
        (C.cell((tmp+Number(C.u64((BigInt((1*128))-C.u64(1))))*1),"char").value=C.i8(0));
        escapes(tmp,buf);
    }
    return C.i32(C.cell(buf,"char").value);
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* data for option_help() */
/* fill in next value at run-time */
export function option_help()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["option_help.buf",(1*256)],["option_help.buf2",(1*256)]]);
    try {
    let buf=C.automatic("option_help.buf",(1*256)); let buf2=C.automatic("option_help.buf2",(1*256));
    let optname;
    let i;
    let datawin;
    (datawin=C.callback(135,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),5));
    C.variadic(268,(C.literal("option_help")),9471,buf,BigInt((1*256)),C.literal("Set options as OPTIONS=<options> in %s"),C.get_configfile());
    (C.cell((C.staticAddress("opt_intro")+Number(3)*8),"char *").value=buf);
    for((i=0);C.cell((C.staticAddress("opt_intro")+Number(i)*8),"char *").value;(()=>{const old=i;i=C.i32((old+1));return old;})()) C.callback(136,(C.field(C.windowprocs,"window_procs","win_putstr").value),datawin,0,C.cell((C.staticAddress("opt_intro")+Number(i)*8),"char *").value);

    /* Boolean options */
    for((i=0);C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","name").value;(()=>{const old=i;i=C.i32((old+1));return old;})()) {
        if(Number(!!((Number(!!(Number(C.u32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","opttyp").value)!=C.u32(C.BoolOpt))||Number(!(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","addr").value)))))||(Number(!!(Number(C.u32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","setwhere").value)==C.u32(C.set_wizonly))&&Number(!(C.field(C.flags,"flag","debug").value)))))))) continue;
        if(Number(!!(Number(C.u32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","setwhere").value)==C.u32(C.set_wiznofuz))&&(Number(!!(Number(!(C.field(C.flags,"flag","debug").value))||C.i32(C.field(C.iflags,"instance_flags","debug_fuzzer").value))))))) continue;
        (optname=C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","name").value);
        if(Number(!!((Number(!!(C.i32(is_wc_option(optname))&&Number(!(wc_supported(optname))))))||(Number(!!(C.i32(is_wc2_option(optname))&&Number(!(wc2_supported(optname))))))))) continue;
        next_opt(datawin,optname);
    }
    next_opt(datawin,C.literal(""));
    /* Compound options */
    C.callback(137,(C.field(C.windowprocs,"window_procs","win_putstr").value),datawin,0,C.literal("Compound options:"));
    for((i=0);C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","name").value;(()=>{const old=i;i=C.i32((old+1));return old;})()) {
        if(Number(!!(Number(C.u32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","opttyp").value)!=C.u32(C.CompOpt))||(Number(!!(Number(C.u32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","setwhere").value)==C.u32(C.set_wizonly))&&Number(!(C.field(C.flags,"flag","debug").value)))))))) continue;
        if(Number(!!(Number(C.u32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","setwhere").value)==C.u32(C.set_wiznofuz))&&(Number(!!(Number(!(C.field(C.flags,"flag","debug").value))||C.i32(C.field(C.iflags,"instance_flags","debug_fuzzer").value))))))) continue;
        (optname=C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","name").value);
        if(Number(!!((Number(!!(C.i32(is_wc_option(optname))&&Number(!(wc_supported(optname))))))||(Number(!!(C.i32(is_wc2_option(optname))&&Number(!(wc2_supported(optname))))))))) continue;
        C.variadic(269,buf2,C.literal("`%s'"),optname);
        C.variadic(270,(C.literal("option_help")),9507,buf,BigInt((1*256)),C.literal("%-20s - %s%c"),buf2,C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","descr").value,(C.field((C.staticAddress("allopt")+Number(C.i32((i+1)))*C.sizes["struct allopt_t"]),"allopt_t","name").value?44:46));
        C.callback(138,(C.field(C.windowprocs,"window_procs","win_putstr").value),datawin,0,buf);
    }
    C.callback(139,(C.field(C.windowprocs,"window_procs","win_putstr").value),datawin,0,C.literal(""));
    /* Compound options */
    C.callback(140,(C.field(C.windowprocs,"window_procs","win_putstr").value),datawin,0,C.literal("Other settings:"));
    for((i=0);C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","name").value;(()=>{const old=i;i=C.i32((old+1));return old;})()) {
        if(Number(C.u32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","opttyp").value)!=C.u32(C.OthrOpt))) continue;
        C.variadic(271,buf,C.literal(" %s"),C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","name").value);
        C.callback(141,(C.field(C.windowprocs,"window_procs","win_putstr").value),datawin,0,buf);
    }
    C.callback(142,(C.field(C.windowprocs,"window_procs","win_putstr").value),datawin,0,C.literal(""));
    for((i=0);C.cell((C.staticAddress("opt_epilog")+Number(i)*8),"char *").value;(()=>{const old=i;i=C.i32((old+1));return old;})()) C.callback(143,(C.field(C.windowprocs,"window_procs","win_putstr").value),datawin,0,C.cell((C.staticAddress("opt_epilog")+Number(i)*8),"char *").value);

    /*
     * TODO:
     *  briefly describe interface-specific option-like settings for
     *  the currently active interface:
     *    X11 uses X-specific "application defaults" from NetHack.ad;
     *    Qt has menu accessible "game -> Qt settings" (non-OSX) or
     *      "nethack -> Preferences" (OSX) to maintain a few options
     *      (font size, map tile size, paperdoll show/hide flag and
     *      tile size) which persist across games;
     *    Windows GUI also has some port-specific menus;
     *    tty and curses: anything?
     *  Best done via a new windowprocs function rather than plugging
     *  in details here.
     *
     * Maybe:
     *  switch from text window to pick-none menu so that user can
     *  scroll back up.  (Not necessary for Qt where text windows are
     *  already scrollable.)
     */
    C.callback(144,(C.field(C.windowprocs,"window_procs","win_display_nhwindow").value),datawin,(C.i8(0)));
    C.callback(145,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),datawin);
    return;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* gather all non-default cond_xyz options into one OPTIONS=cond_foo,!cond_bar
   entry spread across multiple lines with backslash+newline if needed;
   conditions with their default settings (cond_blind, !cond_glowhands, &c)
   are excluded */
export function all_options_conds(sbuf)
{
    sbuf=C.ptr(sbuf);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["all_options_conds.buf",(1*256)],["all_options_conds.nextcond",(1*256)]]);
    try {
    let buf=C.automatic("all_options_conds.buf",(1*256)); let nextcond=C.automatic("all_options_conds.nextcond",(1*256));
    let idx=0;
    let gotone=(C.i8(0));
    (C.cell((buf+Number(0)*1),"char").value=C.i8(0));
    while(C.opt_next_cond(idx,nextcond)) {
        /* 75: room for about 5 conditions, with enough space for player
           to edit resulting file manually and insert '!' in front of them */
        if(Number(idx==0)) {
            C.strcpy(buf,C.literal("OPTIONS="));
        } else if(Number(C.u32((C.u32((C.Strlen_(buf,(C.literal("all_options_conds")),9568)+C.u32(1)))+C.Strlen_(nextcond,(C.literal("all_options_conds")),9568)))>=C.u32(75))) {
            /* finish off previous line */
            C.strcat(buf,C.literal(",\\\n"));
            /* comma and backslash+newline */
            C.strbuf_append(sbuf,buf);
            /* indent continuation line */
            C.variadic(272,buf,C.literal("%8s"),C.literal(" "));
            /* 8: strlen("OPTIONS=") */
        } else if(Number(!!(C.i32(C.cell((nextcond+Number(0)*1),"char").value)&&C.i32(gotone)))) {
            C.strcat(buf,C.literal(","));
        }
        if(C.cell((nextcond+Number(0)*1),"char").value) {
            (gotone=(C.i8(1)));
            C.strcat(buf,nextcond);
        }
        (()=>{const old=idx;idx=C.i32((old+1));return idx;})();
    }
    /* finish off final line; value might be empty if one or more cond_xyz
       options were changed in such a manner that they're all back to their
       default values--which will produce "OPTIONS=" with nothing after the
       equals sign; only add to the output when there is more present */
    if(C.strcmp(buf,C.literal("OPTIONS="))) {
        C.strcat(buf,C.literal("\n"));
        C.strbuf_append(sbuf,buf);
    }
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* append menucolor lines to strbuf */
export function all_options_menucolors(sbuf)
{
    sbuf=C.ptr(sbuf);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["all_options_menucolors.buf",(1*512)]]);
    try {
    let i=0; let ncolors=C.count_menucolors();
    let tmp=C.field(C.gm,"instance_globals_m","menu_colorings").value;
    let buf=C.automatic("all_options_menucolors.buf",(1*512));
    /* see also: add_menu_coloring() */
    let arr;
    if(Number(!(ncolors))) return;
    /* reverse the order */
    (arr=C.alloc(C.u32(C.u64((C.u64(ncolors)*BigInt(8))))));
    while(tmp) {
        (C.cell((arr+Number((()=>{const old=i;i=C.i32((old+1));return old;})())*8),"struct menucoloring *").value=tmp);
        (tmp=C.field(tmp,"menucoloring","next").value);
    }
    for((i=ncolors);Number(i>0);(()=>{const old=i;i=C.i32((old-1));return old;})()) {
        (tmp=C.cell((arr+Number(C.i32((i-1)))*8),"struct menucoloring *").value);
        let sattr=C.attr2attrname(C.field(tmp,"menucoloring","attr").value);
        let sclr=C.clr2colorname(C.field(tmp,"menucoloring","color").value);
        C.variadic(273,buf,C.literal("MENUCOLOR=\"%s\"=%s%s%s\n"),C.field(tmp,"menucoloring","origstr").value,sclr,((Number(C.field(tmp,"menucoloring","attr").value!=0))?C.literal("&"):C.literal("")),((Number(C.field(tmp,"menucoloring","attr").value!=0))?sattr:C.literal("")));
        C.strbuf_append(sbuf,buf);
    }
    C.free(arr);
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function all_options_msgtypes(sbuf)
{
    sbuf=C.ptr(sbuf);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["all_options_msgtypes.buf",(1*256)]]);
    try {
    let tmp=C.field(C.gp,"instance_globals_p","plinemsg_types").value;
    let buf=C.automatic("all_options_msgtypes.buf",(1*256));
    while(tmp) {
        let mtype=msgtype2name(C.i32(C.field(tmp,"plinemsg_type","msgtype").value));
        C.variadic(274,buf,C.literal("MSGTYPE=%s \"%s\"\n"),mtype,C.field(tmp,"plinemsg_type","pattern").value);
        C.strbuf_append(sbuf,buf);
        (tmp=C.field(tmp,"plinemsg_type","next").value);
    }
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function all_options_apes(sbuf)
{
    sbuf=C.ptr(sbuf);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["all_options_apes.buf",(1*256)]]);
    try {
    let tmp=C.field(C.ga,"instance_globals_a","apelist").value;
    let buf=C.automatic("all_options_apes.buf",(1*256));
    while(tmp) {
        C.variadic(275,buf,C.literal("autopickup_exception=\"%c%s\"\n"),(C.i32(C.field(tmp,"autopickup_exception","grab").value)?60:62),C.field(tmp,"autopickup_exception","pattern").value);
        C.strbuf_append(sbuf,buf);
        (tmp=C.field(tmp,"autopickup_exception","next").value);
    }
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* CHANGE_COLOR */
/* return strbuf of all options, to write to file */
export function all_options_strbuf(sbuf)
{
    sbuf=C.ptr(sbuf);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["all_options_strbuf.tmp",(1*256)]]);
    try {
    let name;
    let tmp=C.automatic("all_options_strbuf.tmp",(1*256));
    let buf2;
    let bool_p;
    let i;
    C.strbuf_init(sbuf);
    C.variadic(276,tmp,C.literal("# NetHack config, saved %s\n#\n"),C.yyyymmddhhmmss(C.i64(0)));
    C.strbuf_append(sbuf,tmp);
    for((i=0);Number(((name=C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","name").value))!=0);(()=>{const old=i;i=C.i32((old+1));return old;})()) {
        if(Number(!(C.cell((C.staticAddress("opt_set_in_config")+Number(i)*1),"signed char").value))) continue;
        switch(C.u32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","opttyp").value)) {
            case C.u32((C.BoolOpt)):
                (bool_p=C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","addr").value);
            if(Number(!!(Number(!(bool_p))||Number(bool_p==C.field(C.flags,"flag","female").address)))) break;
            /* obsolete */
            if(Number(C.i32(C.cell(bool_p,"signed char").value)!=C.i32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","initval").value))) {
                C.variadic(277,tmp,C.literal("OPTIONS=%s%s\n"),(C.i32(C.cell(bool_p,"signed char").value)?C.literal(""):C.literal("!")),name);
                C.strbuf_append(sbuf,tmp);
            }
            break;
            case C.u32((C.CompOpt)):
                if(Number(!((Number(!!(Number(!!(Number(C.u32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","setwhere").value)==C.u32(C.set_in_config))||Number(C.u32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","setwhere").value)==C.u32(C.set_gameview))))||Number(C.u32(C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","setwhere").value)==C.u32(C.set_in_game)))))))) break;
            /* FIXME: get_option_value for:
               - menu_deselect_all &c menu control keys,
               - term_cols, term_rows */
            (buf2=get_option_value(name,(C.i8(1))));
            if(buf2) {
                C.variadic(278,(C.literal("all_options_strbuf")),9714,tmp,C.u64((BigInt((1*256))-C.u64(1))),C.literal("OPTIONS=%s:%s"),name,buf2);
                C.strcat(tmp,C.literal("\n"));
                /* guaranteed to fit */
                C.strbuf_append(sbuf,tmp);
            }
            break;
            case C.u32((C.OthrOpt)):
                break;
        }
    }
    /* cond_xyz are closer to regular options than the other 'other opts'
       so put them next; [pfx_cond_] will be set if any cond_Foo were
       present when RC file was read in or if player made any changes via
       status conditions menu; ignore opt_set_in_config[opt_o_status_cond] */
    if(C.cell((C.staticAddress("opt_set_in_config")+Number(C.pfx_cond_)*1),"signed char").value) all_options_conds(sbuf);
    C.get_changed_key_binds(sbuf);
    C.savedsym_strbuf(sbuf);
    all_options_menucolors(sbuf);
    all_options_msgtypes(sbuf);
    all_options_apes(sbuf);
    C.all_options_autocomplete(sbuf);
    C.all_options_statushilites(sbuf);
    if(C.cell((C.field(C.gw,"instance_globals_w","wizkit").address+Number(0)*1),"char").value) {
        C.variadic(279,tmp,C.literal("WIZKIT=%s\n"),C.field(C.gw,"instance_globals_w","wizkit").address);
        C.strbuf_append(sbuf,tmp);
    }
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/*
 * prints the next boolean option, on the same line if possible, on a new
 * line if not. End with next_opt("").
 */
export function next_opt(datawin,str)
{
    datawin=C.i32(datawin);
    str=C.ptr(str);
    
    let i;
    let s;
    if(Number(!(C.cell(C.staticAddress("next_opt.buf"),"char *").value))) (C.cell(((C.cell(C.staticAddress("next_opt.buf"),"char *").value=C.alloc(C.u32(256)))),"char").value=C.i8(0));
    if(Number(!(C.cell(str,"char").value))) {
        (s=C.eos(C.cell(C.staticAddress("next_opt.buf"),"char *").value));
        if(Number(!!(Number(s>(C.cell(C.staticAddress("next_opt.buf"),"char *").value+Number(1)*1))&&Number(C.i32(C.cell((s+Number(C.i32((-2)))*1),"char").value)==44)))) ((C.cell((s+Number(C.i32((-2)))*1),"char").value=C.i8(46)),(C.cell((s+Number(C.i32((-1)))*1),"char").value=C.i8(0)));
        /* replace ending ", " with "." */
        (i=80);
        /* (greater than COLNO - 2) */
    } else {
        (i=C.i32(C.u32((C.u32((C.Strlen_(C.cell(C.staticAddress("next_opt.buf"),"char *").value,(C.literal("next_opt")),9770)+C.Strlen_(str,(C.literal("next_opt")),9770)))+C.u32(2)))));
    }
    if(Number(i>C.i32((80-2)))) {
        /* rule of thumb */
        C.callback(146,(C.field(C.windowprocs,"window_procs","win_putstr").value),datawin,0,C.cell(C.staticAddress("next_opt.buf"),"char *").value);
        (C.cell((C.cell(C.staticAddress("next_opt.buf"),"char *").value+Number(0)*1),"char").value=C.i8(0));
    }
    if(C.cell(str,"char").value) {
        C.strcat(C.cell(C.staticAddress("next_opt.buf"),"char *").value,str);
        C.strcat(C.cell(C.staticAddress("next_opt.buf"),"char *").value,C.literal(", "));
    } else {
        C.callback(147,(C.field(C.windowprocs,"window_procs","win_putstr").value),datawin,0,str);
        (C.free(C.cell(C.staticAddress("next_opt.buf"),"char *").value),(C.cell(C.staticAddress("next_opt.buf"),"char *").value=0));
    }
    return;
}

/* shares WC_PERM_INVENT */
/* name shown in 'O' menu is different */
/* statushilites doesn't have its own bit */
/*
 * If a port wants to change or ensure that the set_in_sysconf,
 * set_in_config, set_gameview, or set_in_game status of an option is
 * correct (for controlling its display in the option menu) call
 * set_option_mod_status()
 * with the appropriate second argument.
 */
export function set_option_mod_status(optnam,status)
{
    optnam=C.ptr(optnam);
    status=C.i32(status);
    let k;
    if((Number(!!((Number(status<C.set_in_sysconf))||(Number(status>C.set_wiznofuz)))))) {
        C.variadic(280,C.literal("set_option_mod_status: status out of range %d."),status);
        return;
    }
    for((k=0);C.field((C.staticAddress("allopt")+Number(k)*C.sizes["struct allopt_t"]),"allopt_t","name").value;(()=>{const old=k;k=C.i32((old+1));return old;})()) {
        if(C.str_start_is(C.field((C.staticAddress("allopt")+Number(k)*C.sizes["struct allopt_t"]),"allopt_t","name").value,optnam,(C.i8(1)))) {
            (C.field((C.staticAddress("allopt")+Number(k)*C.sizes["struct allopt_t"]),"allopt_t","setwhere").value=C.u32(status));
            return;
        }
    }
}

/*
 * You can set several wc_options in one call to
 * set_wc_option_mod_status() by setting
 * the appropriate bits for each option that you
 * are setting in the optmask argument
 * prior to calling.
 *    example: set_wc_option_mod_status(WC_COLOR|WC_SCROLL_MARGIN,
 * set_in_game);
 */
export function set_wc_option_mod_status(optmask,status)
{
    optmask=C.u64(optmask);
    status=C.i32(status);
    let k=0;
    if((Number(!!((Number(status<C.set_in_sysconf))||(Number(status>C.set_wiznofuz)))))) {
        C.variadic(281,C.literal("set_wc_option_mod_status: status out of range %d."),status);
        return;
    }
    while(C.field((C.staticAddress("wc_options")+Number(k)*C.sizes["struct wc_Opt"]),"wc_Opt","wc_name").value) {
        if(C.u64((optmask&C.field((C.staticAddress("wc_options")+Number(k)*C.sizes["struct wc_Opt"]),"wc_Opt","wc_bit").value))) {
            set_option_mod_status(C.field((C.staticAddress("wc_options")+Number(k)*C.sizes["struct wc_Opt"]),"wc_Opt","wc_name").value,status);
        }
        (()=>{const old=k;k=C.i32((old+1));return old;})();
    }
}

export function is_wc_option(optnam)
{
    optnam=C.ptr(optnam);
    let k=0;
    while(C.field((C.staticAddress("wc_options")+Number(k)*C.sizes["struct wc_Opt"]),"wc_Opt","wc_name").value) {
        if(Number(C.strcmp(C.field((C.staticAddress("wc_options")+Number(k)*C.sizes["struct wc_Opt"]),"wc_Opt","wc_name").value,optnam)==0)) return (C.i8(1));
        (()=>{const old=k;k=C.i32((old+1));return old;})();
    }
    return (C.i8(0));
}

export function wc_supported(optnam)
{
    optnam=C.ptr(optnam);
    let k;
    for((k=0);C.field((C.staticAddress("wc_options")+Number(k)*C.sizes["struct wc_Opt"]),"wc_Opt","wc_name").value;(()=>{const old=k;k=C.i32((old+1));return k;})()) {
        if(Number(!(C.strcmp(C.field((C.staticAddress("wc_options")+Number(k)*C.sizes["struct wc_Opt"]),"wc_Opt","wc_name").value,optnam)))) return C.i8(((C.u64((C.field(C.windowprocs,"window_procs","wincap").value&C.field((C.staticAddress("wc_options")+Number(k)*C.sizes["struct wc_Opt"]),"wc_Opt","wc_bit").value)))?C.i32((C.i8(1))):C.i32((C.i8(0)))));
    }
    return (C.i8(0));
}

/*
 * You can set several wc2_options in one call to
 * set_wc2_option_mod_status() by setting
 * the appropriate bits for each option that you
 * are setting in the optmask argument
 * prior to calling.
 *    example:
 * set_wc2_option_mod_status(WC2_FULLSCREEN|WC2_SOFTKEYBOARD|WC2_WRAPTEXT,
 * set_in_config);
 */
export function set_wc2_option_mod_status(optmask,status)
{
    optmask=C.u64(optmask);
    status=C.i32(status);
    let k=0;
    if((Number(!!((Number(status<C.set_in_sysconf))||(Number(status>C.set_wiznofuz)))))) {
        C.variadic(282,C.literal("set_wc2_option_mod_status: status out of range %d."),status);
        return;
    }
    while(C.field((C.staticAddress("wc2_options")+Number(k)*C.sizes["struct wc_Opt"]),"wc_Opt","wc_name").value) {
        if(C.u64((optmask&C.field((C.staticAddress("wc2_options")+Number(k)*C.sizes["struct wc_Opt"]),"wc_Opt","wc_bit").value))) {
            set_option_mod_status(C.field((C.staticAddress("wc2_options")+Number(k)*C.sizes["struct wc_Opt"]),"wc_Opt","wc_name").value,status);
        }
        (()=>{const old=k;k=C.i32((old+1));return old;})();
    }
}

export function is_wc2_option(optnam)
{
    optnam=C.ptr(optnam);
    let k=0;
    while(C.field((C.staticAddress("wc2_options")+Number(k)*C.sizes["struct wc_Opt"]),"wc_Opt","wc_name").value) {
        if(Number(C.strcmp(C.field((C.staticAddress("wc2_options")+Number(k)*C.sizes["struct wc_Opt"]),"wc_Opt","wc_name").value,optnam)==0)) return (C.i8(1));
        (()=>{const old=k;k=C.i32((old+1));return old;})();
    }
    return (C.i8(0));
}

export function wc2_supported(optnam)
{
    optnam=C.ptr(optnam);
    let k;
    for((k=0);C.field((C.staticAddress("wc2_options")+Number(k)*C.sizes["struct wc_Opt"]),"wc_Opt","wc_name").value;(()=>{const old=k;k=C.i32((old+1));return k;})()) {
        if(Number(!(C.strcmp(C.field((C.staticAddress("wc2_options")+Number(k)*C.sizes["struct wc_Opt"]),"wc_Opt","wc_name").value,optnam)))) return C.i8(((C.u64((C.field(C.windowprocs,"window_procs","wincap2").value&C.field((C.staticAddress("wc2_options")+Number(k)*C.sizes["struct wc_Opt"]),"wc_Opt","wc_bit").value)))?C.i32((C.i8(1))):C.i32((C.i8(0)))));
    }
    return (C.i8(0));
}

export function wc_set_font_name(opttype,fontname)
{
    opttype=C.i32(opttype);
    fontname=C.ptr(fontname);
    let fn=0;
    if(Number(!(fontname))) return;
    switch(opttype) {
        case (C.MAP_OPTION):
            (fn=C.field(C.iflags,"instance_flags","wc_font_map").address);
        break;
        case (C.MESSAGE_OPTION):
            (fn=C.field(C.iflags,"instance_flags","wc_font_message").address);
        break;
        case (C.TEXT_OPTION):
            (fn=C.field(C.iflags,"instance_flags","wc_font_text").address);
        break;
        case (C.MENU_OPTION):
            (fn=C.field(C.iflags,"instance_flags","wc_font_menu").address);
        break;
        case (C.STATUS_OPTION):
            (fn=C.field(C.iflags,"instance_flags","wc_font_status").address);
        break;
        default:
            return;
    }
    if(fn) {
        if(C.cell(fn,"char *").value) C.free(C.cell(fn,"char *").value);
        (C.cell(fn,"char *").value=C.dupstr(fontname));
    }
    return;
}

export function wc_set_window_colors(op)
{
    op=C.ptr(op);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["wc_set_window_colors.buf",(1*256)]]);
    try {
    /* syntax:
     *  menu white/black message green/yellow status white/blue text
     * white/black
     */
    let j;
    let clr;
    let buf=C.automatic("wc_set_window_colors.buf",(1*256));
    let wn; let tfg; let tbg; let newop;
    C.strcpy(buf,op);
    (newop=C.mungspaces(buf));
    while(C.cell(newop,"char").value) {
        (wn=(tfg=(tbg=0)));
        /* until first non-space in case there's leading spaces - before
           colorname*/
        if(Number(C.i32(C.cell(newop,"char").value)==32)) (()=>{const old=newop;newop=C.ptr((old+Number(1)));return old;})();
        if(Number(!(C.cell(newop,"char").value))) return 0;
        (wn=newop);
        /* until first space - colorname*/
        while(Number(!!(C.i32(C.cell(newop,"char").value)&&Number(C.i32(C.cell(newop,"char").value)!=32)))) (()=>{const old=newop;newop=C.ptr((old+Number(1)));return old;})();

        if(Number(!(C.cell(newop,"char").value))) return 0;
        (C.cell((()=>{const old=newop;newop=C.ptr((old+Number(1)));return old;})(),"char").value=C.i8(0));
        /* until first non-space - before foreground*/
        if(Number(C.i32(C.cell(newop,"char").value)==32)) (()=>{const old=newop;newop=C.ptr((old+Number(1)));return old;})();
        if(Number(!(C.cell(newop,"char").value))) return 0;
        (tfg=newop);
        /* until slash - foreground */
        while(Number(!!(C.i32(C.cell(newop,"char").value)&&Number(C.i32(C.cell(newop,"char").value)!=47)))) (()=>{const old=newop;newop=C.ptr((old+Number(1)));return old;})();

        if(Number(!(C.cell(newop,"char").value))) return 0;
        (C.cell((()=>{const old=newop;newop=C.ptr((old+Number(1)));return old;})(),"char").value=C.i8(0));
        /* until first non-space (in case there's leading space after slash) -
         * before background */
        if(Number(C.i32(C.cell(newop,"char").value)==32)) (()=>{const old=newop;newop=C.ptr((old+Number(1)));return old;})();
        if(Number(!(C.cell(newop,"char").value))) return 0;
        (tbg=newop);
        /* until first space - background */
        while(Number(!!(C.i32(C.cell(newop,"char").value)&&Number(C.i32(C.cell(newop,"char").value)!=32)))) (()=>{const old=newop;newop=C.ptr((old+Number(1)));return old;})();

        if(C.cell(newop,"char").value) (C.cell((()=>{const old=newop;newop=C.ptr((old+Number(1)));return old;})(),"char").value=C.i8(0));
        for((j=0);Number(j<C.WC_COUNT);(()=>{const old=j;j=C.i32((old+1));return j;})()) {
            if(Number(!!(Number(!(C.strncmpi((wn),(C.cell((C.staticAddress("wcnames")+Number(j)*8),"char *").value),C.i32((-1)))))||Number(!(C.strncmpi((wn),(C.cell((C.staticAddress("wcshortnames")+Number(j)*8),"char *").value),C.i32((-1)))))))) {
                if(Number(!(C.strstri(tfg,C.literal(" "))))) {
                    if(C.cell(C.cell((C.staticAddress("fgp")+Number(j)*8),"char **").value,"char *").value) C.free(C.cell(C.cell((C.staticAddress("fgp")+Number(j)*8),"char **").value,"char *").value);
                    (clr=C.check_enhanced_colors(tfg));
                    (C.cell(C.cell((C.staticAddress("fgp")+Number(j)*8),"char **").value,"char *").value=C.dupstr(((Number(clr>=0))?C.wc_color_name(clr):tfg)));
                }
                if(Number(!(C.strstri(tbg,C.literal(" "))))) {
                    if(C.cell(C.cell((C.staticAddress("bgp")+Number(j)*8),"char **").value,"char *").value) C.free(C.cell(C.cell((C.staticAddress("bgp")+Number(j)*8),"char **").value,"char *").value);
                    (clr=C.check_enhanced_colors(tbg));
                    (C.cell(C.cell((C.staticAddress("bgp")+Number(j)*8),"char **").value,"char *").value=C.dupstr(((Number(clr>=0))?C.wc_color_name(clr):tbg)));
                }
                if(Number(C.cell((C.wcolors_opt+Number(j)*4),"int").value!=0)) {
                    C.variadic(283,C.literal("windowcolors for %s windows specified multiple times"),C.cell((C.staticAddress("wcnames")+Number(j)*8),"char *").value);
                }
                (()=>{const ref=C.cell((C.wcolors_opt+Number(j)*4),"int");const old=ref.value;ref.value=C.i32((old+1));return old;})();
                break;
            }
        }
        if(Number(j==C.WC_COUNT)) {
            C.variadic(284,C.literal("windowcolors for unrecognized window type: %s"),wn);
        }
    }
    (C.global("options_set_window_colors_flag").value=1);
    return 1;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function options_free_window_colors()
{
    let j;
    for((j=0);Number(j<C.WC_COUNT);(()=>{const old=j;j=C.i32((old+1));return j;})()) {
        if(C.cell(C.cell((C.staticAddress("fgp")+Number(j)*8),"char **").value,"char *").value) (C.free(C.cell(C.cell((C.staticAddress("fgp")+Number(j)*8),"char **").value,"char *").value),(C.cell(C.cell((C.staticAddress("fgp")+Number(j)*8),"char **").value,"char *").value=0));
        if(C.cell(C.cell((C.staticAddress("bgp")+Number(j)*8),"char **").value,"char *").value) (C.free(C.cell(C.cell((C.staticAddress("bgp")+Number(j)*8),"char **").value,"char *").value),(C.cell(C.cell((C.staticAddress("bgp")+Number(j)*8),"char **").value,"char *").value=0));
    }
    (C.global("options_set_window_colors_flag").value=0);
}

/* set up for wizard mode if player or save file has requested it;
   called from port-specific startup code to handle `nethack -D' or
   OPTIONS=playmode:debug, or from dorecover()'s restgamestate() if
   restoring a game which was saved in wizard mode */
export function set_playmode()
{
    if(C.field(C.flags,"flag","debug").value) {
        if(C.authorize_wizard_mode()) (C.field(C.gp,"instance_globals_p","plnamelen").value=C.i32(C.strlen(C.strcpy(C.field(C.svp,"instance_globals_saved_p","plname").address,C.literal("wizard")))));
 else (C.field(C.flags,"flag","debug").value=(C.i8(0)));
        /* not allowed or not available */
        /* try explore mode if we didn't make it into wizard mode */
        /* if requesting wizard mode when restoring a normal game, this will
           set iflags.deferred_X and prompt to activate explore mode after the
           save file has already been deleted */
        (C.field(C.flags,"flag","explore").value=C.i8(Number(!(C.field(C.flags,"flag","debug").value))));
        (C.field(C.iflags,"instance_flags","deferred_X").value=(C.i8(0)));
    }
    if(Number(!!(C.i32(C.field(C.flags,"flag","explore").value)&&Number(!(C.authorize_explore_mode()))))) {
        (C.field(C.flags,"flag","explore").value=(C.field(C.iflags,"instance_flags","deferred_X").value=(C.i8(0))));
    }
    /* don't need to do anything special for normal play */
}

export function enhance_menu_text(buf,sz,whichpass,bool_p,thisopt)
{
    buf=C.ptr(buf);
    sz=C.u64(sz);
    whichpass=C.i32(whichpass);
    bool_p=C.ptr(bool_p);
    thisopt=C.ptr(thisopt);
    let nowsz; let availsz;
    if(Number(!(buf))) return;
    (nowsz=C.u64((C.strlen(buf)+C.u64(1))));
    (availsz=C.u64((sz-nowsz)));
    /*#ifdef TTY_PERM_INVENT*/
    ((availsz));
    ((bool_p));
    ((thisopt));
    return;
}

export function heed_all_options()
{
    let i;
    for((i=0);Number(i<C.OPTCOUNT);(()=>{const old=i;i=C.i32((old+1));return old;})()) (C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","disregarded").value=(C.i8(0)));

}

export function disregard_all_options()
{
    let i;
    for((i=0);Number(i<C.OPTCOUNT);(()=>{const old=i;i=C.i32((old+1));return old;})()) (C.field((C.staticAddress("allopt")+Number(i)*C.sizes["struct allopt_t"]),"allopt_t","disregarded").value=(C.i8(1)));

}

export function heed_this_option(optidx)
{
    if(Number(!!(Number(C.i32(optidx)>=0)&&Number(C.i32(optidx)<C.i32(C.i32(C.OPTCOUNT)))))) (C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","disregarded").value=(C.i8(0)));
}

export function disregard_this_option(optidx)
{
    if(Number(!!(Number(C.i32(optidx)>=0)&&Number(C.i32(optidx)<C.i32(C.i32(C.OPTCOUNT)))))) (C.field((C.staticAddress("allopt")+Number(optidx)*C.sizes["struct allopt_t"]),"allopt_t","disregarded").value=(C.i8(1)));
}

/* OPTION_LISTS_ONLY */
/*options.c*/
