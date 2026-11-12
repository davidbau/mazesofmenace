import { C } from '../c-runtime/context.js';
/* NetHack 5.0	cfgfiles.c	$NHDT-Date: 1740532826 2025/02/25 17:20:26 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.417 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Derek S. Ray, 2015. */
/* NetHack may be freely redistributed.  See license for details. */
/* big enough to format a 4*BUFSZ string (from
                              * config file parsing) with modest decoration;
                              * result will then be truncated to BUFSZ-1 */
/* defined in sounds.c */
/* SFCTOOL */
/* SYSCF */
/* SFCTOOL */
/* defined below (far below...) */
/* next one is in extern.h; why here too? */
/* SFCTOOL */
/* ----------  BEGIN CONFIG FILE HANDLING ----------- */
/* used for messaging. Also used in options.c */
export function get_configfile()
{
    return C.configfile;
}

export function get_default_configfile()
{
    return C.default_configfile;
}

/* conflict with speed-dial under windows
 * for XXX.cnf file so support of NetHack.cnf
 * is for backward compatibility only.
 * Preferred name (and first tried) is now defaults.nh but
 * the game will try the old name if there
 * is no defaults.nh.
 */
/* #saveoptions - save config options into file */
export function do_write_config_file()
{
    const stackFrame=C.stackSave();
    try {
    let fp;
    let tmp=C.stackAlloc((1*256));
    if(Number(!(C.cell((C.configfile+Number(0)*1),"char").value))) {
        C.variadic(0,C.literal("Strange, could not figure out config file name."));
        return 0;
    }
    if(Number(C.field(C.flags,"flag","suppress_alert").value<(C.u64((C.u64((C.u64(((C.u64((C.u64(3)<<BigInt(24))))|(C.u64((C.u64(7)<<BigInt(16))))))|(C.u64((C.u64(0)<<BigInt(8))))))|(C.u64(0))))))) {
        C.variadic(1,C.literal("Warning: saveoptions is highly experimental!"));
        C.callProc((C.field(C.windowprocs,"window_procs","win_wait_synch").value),"void (void)");
        C.variadic(2,C.literal("Some settings are not saved!"));
        C.callProc((C.field(C.windowprocs,"window_procs","win_wait_synch").value),"void (void)");
        C.variadic(3,C.literal("All manual customization and comments are removed from the file!"));
        C.callProc((C.field(C.windowprocs,"window_procs","win_wait_synch").value),"void (void)");
    }
    C.variadic(4,tmp,C.literal("Overwrite config file %.*s?"),C.i32((C.u64((C.u64((C.u64(256)-BigInt((1*28))))-C.u64(2))))),C.configfile);
    if(Number(!(C.paranoid_query((C.i8(1)),tmp)))) return 0;
    (fp=C.fopen(C.configfile,C.literal("w")));
    if(fp) {
        let len; let wrote;
        let buf=C.stackAlloc(C.sizes["struct strbuf"]);
        C.strbuf_init(buf);
        C.all_options_strbuf(buf);
        (len=C.strlen(C.field(buf,"strbuf","str").value));
        (wrote=C.fwrite(C.field(buf,"strbuf","str").value,C.u64(1),len,fp));
        C.fclose(fp);
        C.strbuf_empty(buf);
        if(Number(wrote!=len)) C.variadic(5,C.literal("An error occurred, wrote only partial data (%zu/%zu)."),wrote,len);
    }
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

/* SFCTOOL */
/* remember the name of the file we're accessing;
   if may be used in option reject messages */
export function set_configfile_name(fname)
{
    C.strncpy(C.configfile,fname,C.u64((BigInt((1*256))-C.u64(1))));
    (C.cell((C.configfile+Number(C.u64((BigInt((1*256))-C.u64(1))))*1),"char").value=C.i8(0));
}

export function fopen_config_file(filename,src)
{
    src=C.i32(src);
    const stackFrame=C.stackSave();
    try {
    let fp;
    let tmp_config=C.stackAlloc((1*256));
    let envp;
    if(Number(src==C.set_in_sysconf)) {
        /* SYSCF_FILE; if we can't open it, caller will bail */
        if(Number(!!(filename&&C.i32(C.cell(filename,"char").value)))) {
            set_configfile_name(C.fqname(filename,7,0));
            (fp=C.fopen(C.configfile,C.literal("r")));
        } else (fp=0);
        return fp;
    }
    /* If src != set_in_sysconf, "filename" is an environment variable, so it
     * should hang around. If set, it is expected to be a full path name
     * (if relevant)
     */
    if(Number(!!(filename&&C.i32(C.cell(filename,"char").value)))) {
        set_configfile_name(filename);
        if(Number(!!(Number(!(C.strncmp(C.configfile,C.literal("~/"),C.u64(2))))&&Number(((envp=C.nh_getenv(C.literal("HOME"))))!=0)))) {
            /* support for command line '--nethackrc=~/path' (or for
               NETHACKOPTIONS='@~/path'; we don't support ~user/path) */
            C.variadic(6,(C.literal("fopen_config_file")),251,tmp_config,BigInt((1*256)),C.literal("%s/%s"),envp,(C.configfile+Number(2)*1));
            /* insert $HOME/ and remove ~/ */
            set_configfile_name(tmp_config);
        }
        if(Number(C.access(C.configfile,4)==C.i32((-1)))) {
            /* 4 is R_OK on newer systems */
            /* nasty sneaky attempt to read file through
             * NetHack's setuid permissions -- this is the only
             * place a file name may be wholly under the player's
             * control (but SYSCF_FILE is not under the player's
             * control so it's OK).
             */
            C.variadic(7,C.literal("Access to %s denied (%d)."),C.configfile,(C.cell(C.__errno_location(),"int").value));
            C.callProc((C.field(C.windowprocs,"window_procs","win_wait_synch").value),"void (void)");
            /* fall through to standard names */
        } else if(Number(((fp=C.fopen(C.configfile,C.literal("r"))))!=0)) {
            return fp;
        } else {
            /* access() above probably caught most problems for UNIX */
            C.variadic(8,C.literal("Couldn't open requested config file %s (%d)."),C.configfile,(C.cell(C.__errno_location(),"int").value));
            C.callProc((C.field(C.windowprocs,"window_procs","win_wait_synch").value),"void (void)");
        }
    }
    /* fall through to standard names */
    /* constructed full path names don't need fqname() */
    /* no punctuation, so might be a logical name */
    /* should be only UNIX left */
    (envp=C.nh_getenv(C.literal("HOME")));
    if(Number(!(envp))) C.strcpy(tmp_config,C.literal(".nethackrc"));
 else C.variadic(9,tmp_config,C.literal("%s/%s"),envp,C.literal(".nethackrc"));
    set_configfile_name(tmp_config);
    if(Number(((fp=C.fopen(C.configfile,C.literal("r"))))!=0)) return fp;
    /* UNIX+__APPLE__ => OSX || MacOS */
    /* try an alternative */
    /* keep 'tmp_config' intact here; if alternates fail, use it to
           restore configfile[] to its preferred setting (".nethackrc") */
    /* OSX-style configuration settings */
    /* may be easier for user to edit if filename has '.txt' suffix */
    /* couldn't open either of the alternate names; for use in
           messages, put 'configfile' back to the normal value rather than
           leaving it set to last alternate; retry open() to reset 'errno' */
    /*__APPLE__*/
    if(Number((C.cell(C.__errno_location(),"int").value)!=(44))) {
        let details;
        /* e.g., problems when setuid NetHack can't search home
           directory restricted to user */
        if(Number(((details=C.strerror((C.cell(C.__errno_location(),"int").value))))==0)) (details=C.literal(""));
        C.variadic(10,C.literal("Couldn't open default config file %s %s(%d)."),C.configfile,details,(C.cell(C.__errno_location(),"int").value));
        C.callProc((C.field(C.windowprocs,"window_procs","win_wait_synch").value),"void (void)");
    }
    /* !VMS => Unix */
    /* !(MICRO || MACOS9 || __BEOS__ || WIN32) */
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

/*
 * Retrieve a list of integers from buf into a uchar array.
 *
 * NOTE: zeros are inserted unless modlist is TRUE, in which case the list
 *  location is unchanged.  Callers must handle zeros if modlist is FALSE.
 */
export function get_uchars(bufp,list,modlist,size,name)
{
    modlist=C.i8(modlist);
    size=C.i32(size);
    /* current pointer */
    /* return list */
    /* TRUE: list is being modified in place */
    /* return list size */
    /* name of option for error message */
    let num=C.u32(0);
    let count=0;
    let havenum=(C.i8(0));
    while(1) {
        switch(C.i32(C.cell(bufp,"char").value)) {
            case (32):
                case (0):
                    case (9):
                        case (10):
                            if(havenum) {
                                /* if modifying in place, don't insert zeros */
                                if(Number(!!(num||Number(!(modlist))))) (C.cell((list+Number(count)*1),"unsigned char").value=C.u8(num));
                                ((count=C.i32((count+1)))-1);
                                (num=C.u32(0));
                                (havenum=(C.i8(0)));
                            }
            if(Number(!!(Number(count==size)||Number(!(C.cell(bufp,"char").value))))) return count;
            ((bufp=C.ptr((bufp+Number(1))))-Number(1));
            break;
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
                                                    (havenum=(C.i8(1)));
            (num=C.u32((C.u32((num*C.u32(10)))+C.u32((C.i32((C.i32(C.cell(bufp,"char").value)-48)))))));
            ((bufp=C.ptr((bufp+Number(1))))-Number(1));
            break;
            case (92):
                /* original goto gi_error: fall through to the shared default body */
            default:
                C.variadic(11,C.literal("Syntax error in %s"),name);
            C.callProc((C.field(C.windowprocs,"window_procs","win_wait_synch").value),"void (void)");
            return count;
        }
    }
    /*NOTREACHED*/
}

/* Backward compatibility, ignore trailing ;n */
/* Choose at random one of the sep separated parts from str. Mangles str. */
export function choose_random_part(str,sep)
{
    sep=C.i8(sep);
    let nsep=1;
    let csep;
    let len=0;
    let begin=str;
    if(Number(!(str))) return 0;
    while(C.cell(str,"char").value) {
        if(Number(C.i32(C.cell(str,"char").value)==C.i32(sep))) ((nsep=C.i32((nsep+1)))-1);
        ((str=C.ptr((str+Number(1))))-Number(1));
    }
    (csep=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("cfgfiles.c"),480,(C.literal("choose_random_part"))),C.rn2(nsep))):C.rn2(nsep))));
    (str=begin);
    while(Number(!!((Number(csep>0))&&C.i32(C.cell(str,"char").value)))) {
        ((str=C.ptr((str+Number(1))))-Number(1));
        if(Number(C.i32(C.cell(str,"char").value)==C.i32(sep))) ((csep=C.i32((csep-1)))+1);
    }
    if(C.cell(str,"char").value) {
        if(Number(C.i32(C.cell(str,"char").value)==C.i32(sep))) ((str=C.ptr((str+Number(1))))-Number(1));
        (begin=str);
        while(Number(!!(C.i32(C.cell(str,"char").value)&&Number(C.i32(C.cell(str,"char").value)!=C.i32(sep))))) {
            ((str=C.ptr((str+Number(1))))-Number(1));
            ((len=C.i32((len+1)))-1);
        }
        (C.cell(str,"char").value=C.i8(0));
        if(len) return begin;
    }
    return 0;
}

export function free_config_sections()
{
    if(C.field(C.gc,"instance_globals_c","config_section_chosen").value) {
        C.free(C.field(C.gc,"instance_globals_c","config_section_chosen").value);
        (C.field(C.gc,"instance_globals_c","config_section_chosen").value=0);
    }
    if(C.field(C.gc,"instance_globals_c","config_section_current").value) {
        C.free(C.field(C.gc,"instance_globals_c","config_section_current").value);
        (C.field(C.gc,"instance_globals_c","config_section_current").value=0);
    }
}

/* check for " [ anything-except-bracket-or-empty ] # arbitrary-comment"
   with spaces optional; returns pointer to "anything-except..." (with
   trailing " ] #..." stripped) if ok, otherwise Null */
export function is_config_section(str)
{
    /* trailing spaces are stripped, ']' too iff result is good */
    let a; let c; let z;
    /* remove any spaces at start and end; won't significantly interfere
       with echoing the string in a config error message, if warranted */
    (a=C.trimspaces(str));
    /* first character should be open square bracket; set pointer past it */
    if(Number(C.i32(C.cell(((a=C.ptr((a+Number(1))))-Number(1)),"char").value)!=91)) return 0;
    /* last character should be close bracket, ignoring any comment */
    (z=C.strchr(a,93));
    if(Number(!(z))) return 0;
    /* comment, if present, can be preceded by spaces */
    for((c=(z+Number(1)*1));Number(C.i32(C.cell(c,"char").value)==32);(c=C.ptr((c+Number(1))))) continue;

    if(Number(!!(C.i32(C.cell(c,"char").value)&&Number(C.i32(C.cell(c,"char").value)!=35)))) return 0;
    /* we now know that result is good; there won't be a config error
       message so we can modify the input string */
    (C.cell(z,"char").value=C.i8(0));
    /* 'a' points past '[' and the string ends where ']' was; remove any
       spaces between '[' and choice-start and between choice-end and ']' */
    return C.trimspaces(a);
}

export function handle_config_section(buf)
{
    let sect=is_config_section(buf);
    if(sect) {
        if(C.field(C.gc,"instance_globals_c","config_section_current").value) (C.free(C.field(C.gc,"instance_globals_c","config_section_current").value),(C.field(C.gc,"instance_globals_c","config_section_current").value=0));
        /* is_config_section() removed brackets from 'sect' */
        if(Number(!(C.field(C.gc,"instance_globals_c","config_section_chosen").value))) {
            C.variadic(12,C.literal("Section \"[%s]\" without CHOOSE"),sect);
            return (C.i8(1));
        }
        if(C.cell(sect,"char").value) {
            /* got a section name */
            (C.field(C.gc,"instance_globals_c","config_section_current").value=C.dupstr(sect));
            do {
                if(C.debugcore(C.literal("cfgfiles.c"),(C.i8(1)))) {
                    let save_plnmsg=C.field(C.iflags,"instance_flags","last_msg").value;
                    C.variadic(13,C.literal("set config section: '%s'"),C.field(C.gc,"instance_globals_c","config_section_current").value);
                    (C.field(C.iflags,"instance_flags","last_msg").value=save_plnmsg);
                }
            } while(0);
        } else {
            /* empty section name => end of sections */
            free_config_sections();
            do {
                if(C.debugcore(C.literal("cfgfiles.c"),(C.i8(1)))) {
                    let save_plnmsg=C.field(C.iflags,"instance_flags","last_msg").value;
                    C.variadic(14,C.literal("unset config section"));
                    (C.field(C.iflags,"instance_flags","last_msg").value=save_plnmsg);
                }
            } while(0);
        }
        return (C.i8(1));
    }
    if(C.field(C.gc,"instance_globals_c","config_section_current").value) {
        if(Number(!(C.field(C.gc,"instance_globals_c","config_section_chosen").value))) return (C.i8(1));
        if(C.strcmp(C.field(C.gc,"instance_globals_c","config_section_current").value,C.field(C.gc,"instance_globals_c","config_section_chosen").value)) return (C.i8(1));
    }
    return (C.i8(0));
}

/* find the '=' or ':' */
export function find_optparam(buf)
{
    let bufp; let altp;
    (bufp=C.strchr(buf,61));
    (altp=C.strchr(buf,58));
    if(Number(!!(Number(!(bufp))||(Number(!!(altp&&Number(altp<bufp))))))) (bufp=altp);
    return bufp;
}

export function cnf_line_OPTIONS(origbuf)
{
    let bufp=find_optparam(origbuf);
    (bufp=C.ptr((bufp+Number(1))));
    /* skip '='; parseoptions() handles spaces */
    return C.parseoptions(bufp,(C.i8(1)),(C.i8(1)));
}

export function cnf_line_AUTOPICKUP_EXCEPTION(bufp)
{
    C.add_autopickup_exception(bufp);
    return (C.i8(1));
}

export function cnf_line_BINDINGS(bufp)
{
    return C.parsebindings(bufp);
}

export function cnf_line_AUTOCOMPLETE(bufp)
{
    C.parseautocomplete(bufp,(C.i8(1)));
    return (C.i8(1));
}

export function cnf_line_MSGTYPE(bufp)
{
    return C.msgtype_parse_add(bufp);
}

export function cnf_line_HACKDIR(bufp)
{
    /*NOCWD_ASSUMPTIONS*/
    /* MICRO */
    ((bufp));
    /* MICRO */
    /*NOCWD_ASSUMPTIONS*/
    return (C.i8(1));
}

export function cnf_line_LEVELDIR(bufp)
{
    /*NOCWD_ASSUMPTIONS*/
    /* MICRO */
    ((bufp));
    /* MICRO */
    /*NOCWD_ASSUMPTIONS*/
    return (C.i8(1));
}

export function cnf_line_SAVEDIR(bufp)
{
    /*NOCWD_ASSUMPTIONS*/
    /* MICRO */
    ((bufp));
    /* MICRO */
    /*NOCWD_ASSUMPTIONS*/
    return (C.i8(1));
}

export function cnf_line_BONESDIR(bufp)
{
    ((bufp));
    return (C.i8(1));
}

export function cnf_line_DATADIR(bufp)
{
    ((bufp));
    return (C.i8(1));
}

export function cnf_line_SCOREDIR(bufp)
{
    ((bufp));
    return (C.i8(1));
}

export function cnf_line_LOCKDIR(bufp)
{
    ((bufp));
    return (C.i8(1));
}

export function cnf_line_CONFIGDIR(bufp)
{
    ((bufp));
    return (C.i8(1));
}

export function cnf_line_TROUBLEDIR(bufp)
{
    ((bufp));
    return (C.i8(1));
}

export function cnf_line_NAME(bufp)
{
    C.strncpy(C.field(C.svp,"instance_globals_saved_p","plname").address,bufp,C.u64(C.i32((32-1))));
    return (C.i8(1));
}

export function cnf_line_ROLE(bufp)
{
    let len;
    if(Number(((len=C.str2role(bufp)))>=0)) (C.field(C.flags,"flag","initrole").value=len);
    return (C.i8(1));
}

export function cnf_line_dogname(bufp)
{
    C.strncpy(C.field(C.gd,"instance_globals_d","dogname").address,bufp,C.u64(C.i32((63-1))));
    return (C.i8(1));
}

export function cnf_line_catname(bufp)
{
    C.strncpy(C.field(C.gc,"instance_globals_c","catname").address,bufp,C.u64(C.i32((63-1))));
    return (C.i8(1));
}

/* SFCTOOL */
export function cnf_line_WIZARDS(bufp)
{
    if(C.field(C.sysopt,"sysopt_s","wizards").value) C.free(C.field(C.sysopt,"sysopt_s","wizards").value);
    (C.field(C.sysopt,"sysopt_s","wizards").value=C.dupstr(bufp));
    if(Number(!!(C.strlen(C.field(C.sysopt,"sysopt_s","wizards").value)&&C.strcmp(C.field(C.sysopt,"sysopt_s","wizards").value,C.literal("*"))))) {
        /* pre-format WIZARDS list now; it's displayed during a panic
           and since that panic might be due to running out of memory,
           we don't want to risk attempting to allocate any memory then */
        if(C.field(C.sysopt,"sysopt_s","fmtd_wizard_list").value) C.free(C.field(C.sysopt,"sysopt_s","fmtd_wizard_list").value);
        (C.field(C.sysopt,"sysopt_s","fmtd_wizard_list").value=C.build_english_list(C.field(C.sysopt,"sysopt_s","wizards").value));
    }
    return (C.i8(1));
}

export function cnf_line_SHELLERS(bufp)
{
    if(C.field(C.sysopt,"sysopt_s","shellers").value) C.free(C.field(C.sysopt,"sysopt_s","shellers").value);
    (C.field(C.sysopt,"sysopt_s","shellers").value=C.dupstr(bufp));
    return (C.i8(1));
}

export function cnf_line_MSGHANDLER(bufp)
{
    if(C.field(C.sysopt,"sysopt_s","msghandler").value) C.free(C.field(C.sysopt,"sysopt_s","msghandler").value);
    (C.field(C.sysopt,"sysopt_s","msghandler").value=C.dupstr(bufp));
    return (C.i8(1));
}

export function cnf_line_EXPLORERS(bufp)
{
    if(C.field(C.sysopt,"sysopt_s","explorers").value) C.free(C.field(C.sysopt,"sysopt_s","explorers").value);
    (C.field(C.sysopt,"sysopt_s","explorers").value=C.dupstr(bufp));
    return (C.i8(1));
}

export function cnf_line_DEBUGFILES(bufp)
{
    /* might already have a vaule from getenv("DEBUGFILES");
       if so, ignore this value from SYSCF */
    if(Number(!(C.field(C.sysopt,"sysopt_s","env_dbgfl").value))) {
        if(C.field(C.sysopt,"sysopt_s","debugfiles").value) C.free(C.field(C.sysopt,"sysopt_s","debugfiles").value);
        (C.field(C.sysopt,"sysopt_s","debugfiles").value=C.dupstr(bufp));
    }
    return (C.i8(1));
}

export function cnf_line_DUMPLOGFILE(bufp)
{
    ((bufp));
    /*DUMPLOG*/
    return (C.i8(1));
}

export function cnf_line_GENERICUSERS(bufp)
{
    if(C.field(C.sysopt,"sysopt_s","genericusers").value) C.free(C.field(C.sysopt,"sysopt_s","genericusers").value);
    (C.field(C.sysopt,"sysopt_s","genericusers").value=C.dupstr(bufp));
    return (C.i8(1));
}

export function cnf_line_BONES_POOLS(bufp)
{
    /* max value of 10 guarantees (N % bones.pools) will be one digit
       so we don't lose control of the length of bones file names */
    let n=C.atoi(bufp);
    (C.field(C.sysopt,"sysopt_s","bones_pools").value=((Number(n<=0))?0:((Number((n)<(10))?(n):(10)))));
    /* note: right now bones_pools==0 is the same as bones_pools==1,
       but we could change that and make bones_pools==0 become an
       indicator to suppress bones usage altogether */
    return (C.i8(1));
}

export function cnf_line_SUPPORT(bufp)
{
    if(C.field(C.sysopt,"sysopt_s","support").value) C.free(C.field(C.sysopt,"sysopt_s","support").value);
    (C.field(C.sysopt,"sysopt_s","support").value=C.dupstr(bufp));
    return (C.i8(1));
}

export function cnf_line_RECOVER(bufp)
{
    if(C.field(C.sysopt,"sysopt_s","recover").value) C.free(C.field(C.sysopt,"sysopt_s","recover").value);
    (C.field(C.sysopt,"sysopt_s","recover").value=C.dupstr(bufp));
    return (C.i8(1));
}

export function cnf_line_CHECK_SAVE_UID(bufp)
{
    let n=C.atoi(bufp);
    (C.field(C.sysopt,"sysopt_s","check_save_uid").value=n);
    return (C.i8(1));
}

export function cnf_line_CHECK_PLNAME(bufp)
{
    let n=C.atoi(bufp);
    (C.field(C.sysopt,"sysopt_s","check_plname").value=n);
    return (C.i8(1));
}

export function cnf_line_SEDUCE(bufp)
{
    let n=Number(!(Number(!(C.atoi(bufp)))));
    /* XXX this could be tighter */
    let src=C.field(C.iflags,"instance_flags","parse_config_file_src").value;
    let in_sysconf=C.i8((Number(src==C.set_in_sysconf)));
    /* allow anyone to disable it but can only enable it in sysconf
       or as a no-op for the user when sysconf hasn't disabled it */
    if(Number(!!(Number(!!(Number(!(in_sysconf))&&Number(!(C.field(C.sysopt,"sysopt_s","seduce").value))))&&Number(n!=0)))) {
        C.variadic(15,C.literal("Illegal value in SEDUCE"));
        (n=0);
    }
    (C.field(C.sysopt,"sysopt_s","seduce").value=n);
    C.sysopt_seduce_set(C.field(C.sysopt,"sysopt_s","seduce").value);
    return (C.i8(1));
}

export function cnf_line_HIDEUSAGE(bufp)
{
    let n=Number(!(Number(!(C.atoi(bufp)))));
    (C.field(C.sysopt,"sysopt_s","hideusage").value=n);
    return (C.i8(1));
}

export function cnf_line_MAXPLAYERS(bufp)
{
    let n=C.atoi(bufp);
    /* XXX to get more than 25, need to rewrite all lock code */
    if(Number(!!(Number(n<0)||Number(n>25)))) {
        C.variadic(16,C.literal("Illegal value in MAXPLAYERS (maximum is 25)"));
        (n=5);
    }
    (C.field(C.sysopt,"sysopt_s","maxplayers").value=n);
    return (C.i8(1));
}

export function cnf_line_PERSMAX(bufp)
{
    let n=C.atoi(bufp);
    if(Number(n<1)) {
        C.variadic(17,C.literal("Illegal value in PERSMAX (minimum is 1)"));
        (n=0);
    }
    (C.field(C.sysopt,"sysopt_s","persmax").value=n);
    return (C.i8(1));
}

export function cnf_line_PERS_IS_UID(bufp)
{
    let n=C.atoi(bufp);
    if(Number(!!(Number(n!=0)&&Number(n!=1)))) {
        C.variadic(18,C.literal("Illegal value in PERS_IS_UID (must be 0 or 1)"));
        (n=0);
    }
    (C.field(C.sysopt,"sysopt_s","pers_is_uid").value=n);
    return (C.i8(1));
}

export function cnf_line_ENTRYMAX(bufp)
{
    let n=C.atoi(bufp);
    if(Number(n<10)) {
        C.variadic(19,C.literal("Illegal value in ENTRYMAX (minimum is 10)"));
        (n=10);
    }
    (C.field(C.sysopt,"sysopt_s","entrymax").value=n);
    return (C.i8(1));
}

export function cnf_line_POINTSMIN(bufp)
{
    let n=C.atoi(bufp);
    if(Number(n<1)) {
        C.variadic(20,C.literal("Illegal value in POINTSMIN (minimum is 1)"));
        (n=100);
    }
    (C.field(C.sysopt,"sysopt_s","pointsmin").value=n);
    return (C.i8(1));
}

export function cnf_line_MAX_STATUENAME_RANK(bufp)
{
    let n=C.atoi(bufp);
    if(Number(n<1)) {
        C.variadic(21,C.literal("Illegal value in MAX_STATUENAME_RANK (minimum is 1)"));
        (n=10);
    }
    (C.field(C.sysopt,"sysopt_s","tt_oname_maxrank").value=n);
    return (C.i8(1));
}

export function cnf_line_LIVELOG(bufp)
{
    /* using 0 for base accepts "dddd" as decimal provided that first 'd'
       isn't '0', "0xhhhh" as hexadecimal, and "0oooo" as octal; ignores
       any trailing junk, including '8' or '9' for leading '0' octal */
    let L=C.strtol(bufp,0,0);
    if(Number(!!(Number(L<0n)||Number(L>65535n)))) {
        C.variadic(22,C.literal("Illegal value for LIVELOG (must be between 0 and 0xFFFF)."));
        return C.i8(0);
    }
    (C.field(C.sysopt,"sysopt_s","livelog").value=L);
    return (C.i8(1));
}

export function cnf_line_PANICTRACE_LIBC(bufp)
{
    let n=C.atoi(bufp);
    (C.field(C.sysopt,"sysopt_s","panictrace_libc").value=n);
    return (C.i8(1));
}

export function cnf_line_PANICTRACE_GDB(bufp)
{
    let n=C.atoi(bufp);
    if(Number(!!(Number(n<0)||Number(n>2)))) {
        C.variadic(23,C.literal("Illegal value in PANICTRACE_GDB (not 0,1,2)"));
        (n=0);
    }
    (C.field(C.sysopt,"sysopt_s","panictrace_gdb").value=n);
    return (C.i8(1));
}

export function cnf_line_GDBPATH(bufp)
{
    if(Number(!(C.file_exists(bufp)))) {
        C.variadic(24,C.literal("File specified in GDBPATH does not exist"));
        return (C.i8(0));
    }
    if(C.field(C.sysopt,"sysopt_s","gdbpath").value) C.free(C.field(C.sysopt,"sysopt_s","gdbpath").value);
    (C.field(C.sysopt,"sysopt_s","gdbpath").value=C.dupstr(bufp));
    return (C.i8(1));
}

export function cnf_line_GREPPATH(bufp)
{
    if(Number(!(C.file_exists(bufp)))) {
        C.variadic(25,C.literal("File specified in GREPPATH does not exist"));
        return (C.i8(0));
    }
    if(C.field(C.sysopt,"sysopt_s","greppath").value) C.free(C.field(C.sysopt,"sysopt_s","greppath").value);
    (C.field(C.sysopt,"sysopt_s","greppath").value=C.dupstr(bufp));
    return (C.i8(1));
}

export function cnf_line_CRASHREPORTURL(bufp)
{
    if(C.field(C.sysopt,"sysopt_s","crashreporturl").value) C.free(C.field(C.sysopt,"sysopt_s","crashreporturl").value);
    (C.field(C.sysopt,"sysopt_s","crashreporturl").value=C.dupstr(bufp));
    return (C.i8(1));
}

export function cnf_line_ACCESSIBILITY(bufp)
{
    let n=C.atoi(bufp);
    if(Number(!!(Number(n<0)||Number(n>1)))) {
        C.variadic(26,C.literal("Illegal value in ACCESSIBILITY (not 0,1)"));
        (n=0);
    }
    (C.field(C.sysopt,"sysopt_s","accessibility").value=n);
    return (C.i8(1));
}

export function cnf_line_PORTABLE_DEVICE_PATHS(bufp)
{
    /* Windows-only directive encountered by non-Windows config */
    ((bufp));
    C.variadic(27,C.literal("PORTABLE_DEVICE_PATHS is not supported"));
    return (C.i8(1));
}

/* SYSCF */
export function cnf_line_BOULDER(bufp)
{
    get_uchars(bufp,(C.field(C.go,"instance_globals_o","ov_primary_syms").address+Number(C.i32((C.SYM_BOULDER+(C.i32(((C.i32(((C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES)))+C.MAXMCLASSES)))+6))))))*1),(C.i8(1)),1,C.literal("BOULDER"));
    return (C.i8(1));
}

export function cnf_line_MENUCOLOR(bufp)
{
    return C.add_menu_coloring(bufp);
}

export function cnf_line_HILITE_STATUS(bufp)
{
    return C.parse_status_hl1(bufp,(C.i8(1)));
}

export function cnf_line_WARNINGS(bufp)
{
    const stackFrame=C.stackSave();
    try {
    let translate=C.stackAlloc((1*105));
    get_uchars(bufp,translate,(C.i8(0)),6,C.literal("WARNINGS"));
    C.assign_warnings(translate);
    return (C.i8(1));
    } finally {C.stackRestore(stackFrame); }
}

export function cnf_line_ROGUESYMBOLS(bufp)
{
    if(C.parsesymbols(bufp,C.ROGUESET)) {
        C.switch_symbols(C.i32((C.i8(1))));
        return (C.i8(1));
    }
    C.variadic(28,C.literal("Error in ROGUESYMBOLS definition '%s'"),bufp);
    return (C.i8(0));
}

export function cnf_line_SYMBOLS(bufp)
{
    if(C.parsesymbols(bufp,C.PRIMARYSET)) {
        C.switch_symbols(C.i32((C.i8(1))));
        return (C.i8(1));
    }
    if(Number(!(config_unmatched_ignored()))) C.variadic(29,C.literal("Error in SYMBOLS definition '%s'"),bufp);
    return (C.i8(0));
}

export function cnf_line_WIZKIT(bufp)
{
    C.strncpy(C.field(C.gw,"instance_globals_w","wizkit").address,bufp,C.u64(C.i32((128-1))));
    return (C.i8(1));
}

/*USER_SOUNDS*/
export function cnf_line_QT_TILEWIDTH(bufp)
{
    ((bufp));
    return (C.i8(1));
}

export function cnf_line_QT_TILEHEIGHT(bufp)
{
    ((bufp));
    return (C.i8(1));
}

export function cnf_line_QT_FONTSIZE(bufp)
{
    ((bufp));
    return (C.i8(1));
}

export function cnf_line_QT_COMPACT(bufp)
{
    ((bufp));
    return (C.i8(1));
}

/* SFCTOOL */
/* normal */
/* normal, alias */
/* sysconf only */
/* OPTIONS handled separately */
/* SFCTOOL */
/*SYSCF*/
/*USER_SOUNDS*/
/* SFCTOOL */
export const config_line_stmt=C=>[
    {name:C.literal("OPTIONS"),len:4,syscnf_only:0,origbuf:1,fn:cnf_line_OPTIONS},
    {name:C.literal("AUTOPICKUP_EXCEPTION"),len:5,syscnf_only:0,origbuf:0,fn:cnf_line_AUTOPICKUP_EXCEPTION},
    {name:C.literal("BINDINGS"),len:4,syscnf_only:0,origbuf:0,fn:cnf_line_BINDINGS},
    {name:C.literal("AUTOCOMPLETE"),len:5,syscnf_only:0,origbuf:0,fn:cnf_line_AUTOCOMPLETE},
    {name:C.literal("MSGTYPE"),len:7,syscnf_only:0,origbuf:0,fn:cnf_line_MSGTYPE},
    {name:C.literal("HACKDIR"),len:4,syscnf_only:0,origbuf:0,fn:cnf_line_HACKDIR},
    {name:C.literal("LEVELDIR"),len:4,syscnf_only:0,origbuf:0,fn:cnf_line_LEVELDIR},
    {name:C.literal("LEVELS"),len:4,syscnf_only:0,origbuf:0,fn:cnf_line_LEVELDIR},
    {name:C.literal("SAVEDIR"),len:4,syscnf_only:0,origbuf:0,fn:cnf_line_SAVEDIR},
    {name:C.literal("BONESDIR"),len:5,syscnf_only:0,origbuf:0,fn:cnf_line_BONESDIR},
    {name:C.literal("DATADIR"),len:4,syscnf_only:0,origbuf:0,fn:cnf_line_DATADIR},
    {name:C.literal("SCOREDIR"),len:4,syscnf_only:0,origbuf:0,fn:cnf_line_SCOREDIR},
    {name:C.literal("LOCKDIR"),len:4,syscnf_only:0,origbuf:0,fn:cnf_line_LOCKDIR},
    {name:C.literal("CONFIGDIR"),len:4,syscnf_only:0,origbuf:0,fn:cnf_line_CONFIGDIR},
    {name:C.literal("TROUBLEDIR"),len:4,syscnf_only:0,origbuf:0,fn:cnf_line_TROUBLEDIR},
    {name:C.literal("NAME"),len:4,syscnf_only:0,origbuf:0,fn:cnf_line_NAME},
    {name:C.literal("ROLE"),len:4,syscnf_only:0,origbuf:0,fn:cnf_line_ROLE},
    {name:C.literal("CHARACTER"),len:4,syscnf_only:0,origbuf:0,fn:cnf_line_ROLE},
    {name:C.literal("dogname"),len:3,syscnf_only:0,origbuf:0,fn:cnf_line_dogname},
    {name:C.literal("catname"),len:3,syscnf_only:0,origbuf:0,fn:cnf_line_catname},
    {name:C.literal("WIZARDS"),len:7,syscnf_only:1,origbuf:0,fn:cnf_line_WIZARDS},
    {name:C.literal("SHELLERS"),len:8,syscnf_only:1,origbuf:0,fn:cnf_line_SHELLERS},
    {name:C.literal("MSGHANDLER"),len:9,syscnf_only:1,origbuf:0,fn:cnf_line_MSGHANDLER},
    {name:C.literal("EXPLORERS"),len:7,syscnf_only:1,origbuf:0,fn:cnf_line_EXPLORERS},
    {name:C.literal("DEBUGFILES"),len:5,syscnf_only:1,origbuf:0,fn:cnf_line_DEBUGFILES},
    {name:C.literal("DUMPLOGFILE"),len:7,syscnf_only:1,origbuf:0,fn:cnf_line_DUMPLOGFILE},
    {name:C.literal("GENERICUSERS"),len:12,syscnf_only:1,origbuf:0,fn:cnf_line_GENERICUSERS},
    {name:C.literal("BONES_POOLS"),len:10,syscnf_only:1,origbuf:0,fn:cnf_line_BONES_POOLS},
    {name:C.literal("SUPPORT"),len:7,syscnf_only:1,origbuf:0,fn:cnf_line_SUPPORT},
    {name:C.literal("RECOVER"),len:7,syscnf_only:1,origbuf:0,fn:cnf_line_RECOVER},
    {name:C.literal("CHECK_SAVE_UID"),len:14,syscnf_only:1,origbuf:0,fn:cnf_line_CHECK_SAVE_UID},
    {name:C.literal("CHECK_PLNAME"),len:12,syscnf_only:1,origbuf:0,fn:cnf_line_CHECK_PLNAME},
    {name:C.literal("SEDUCE"),len:6,syscnf_only:1,origbuf:0,fn:cnf_line_SEDUCE},
    {name:C.literal("HIDEUSAGE"),len:9,syscnf_only:1,origbuf:0,fn:cnf_line_HIDEUSAGE},
    {name:C.literal("MAXPLAYERS"),len:10,syscnf_only:1,origbuf:0,fn:cnf_line_MAXPLAYERS},
    {name:C.literal("PERSMAX"),len:7,syscnf_only:1,origbuf:0,fn:cnf_line_PERSMAX},
    {name:C.literal("PERS_IS_UID"),len:11,syscnf_only:1,origbuf:0,fn:cnf_line_PERS_IS_UID},
    {name:C.literal("ENTRYMAX"),len:8,syscnf_only:1,origbuf:0,fn:cnf_line_ENTRYMAX},
    {name:C.literal("POINTSMIN"),len:9,syscnf_only:1,origbuf:0,fn:cnf_line_POINTSMIN},
    {name:C.literal("MAX_STATUENAME_RANK"),len:10,syscnf_only:1,origbuf:0,fn:cnf_line_MAX_STATUENAME_RANK},
    {name:C.literal("LIVELOG"),len:7,syscnf_only:1,origbuf:0,fn:cnf_line_LIVELOG},
    {name:C.literal("PANICTRACE_LIBC"),len:15,syscnf_only:1,origbuf:0,fn:cnf_line_PANICTRACE_LIBC},
    {name:C.literal("PANICTRACE_GDB"),len:14,syscnf_only:1,origbuf:0,fn:cnf_line_PANICTRACE_GDB},
    {name:C.literal("CRASHREPORTURL"),len:13,syscnf_only:1,origbuf:0,fn:cnf_line_CRASHREPORTURL},
    {name:C.literal("GDBPATH"),len:7,syscnf_only:1,origbuf:0,fn:cnf_line_GDBPATH},
    {name:C.literal("GREPPATH"),len:7,syscnf_only:1,origbuf:0,fn:cnf_line_GREPPATH},
    {name:C.literal("ACCESSIBILITY"),len:13,syscnf_only:1,origbuf:0,fn:cnf_line_ACCESSIBILITY},
    {name:C.literal("PORTABLE_DEVICE_PATHS"),len:8,syscnf_only:1,origbuf:0,fn:cnf_line_PORTABLE_DEVICE_PATHS},
    {name:C.literal("BOULDER"),len:3,syscnf_only:0,origbuf:0,fn:cnf_line_BOULDER},
    {name:C.literal("MENUCOLOR"),len:9,syscnf_only:0,origbuf:0,fn:cnf_line_MENUCOLOR},
    {name:C.literal("HILITE_STATUS"),len:6,syscnf_only:0,origbuf:0,fn:cnf_line_HILITE_STATUS},
    {name:C.literal("WARNINGS"),len:5,syscnf_only:0,origbuf:0,fn:cnf_line_WARNINGS},
    {name:C.literal("ROGUESYMBOLS"),len:4,syscnf_only:0,origbuf:0,fn:cnf_line_ROGUESYMBOLS},
    {name:C.literal("SYMBOLS"),len:4,syscnf_only:0,origbuf:0,fn:cnf_line_SYMBOLS},
    {name:C.literal("WIZKIT"),len:6,syscnf_only:0,origbuf:0,fn:cnf_line_WIZKIT},
    {name:C.literal("QT_TILEWIDTH"),len:12,syscnf_only:0,origbuf:0,fn:cnf_line_QT_TILEWIDTH},
    {name:C.literal("QT_TILEHEIGHT"),len:13,syscnf_only:0,origbuf:0,fn:cnf_line_QT_TILEHEIGHT},
    {name:C.literal("QT_FONTSIZE"),len:11,syscnf_only:0,origbuf:0,fn:cnf_line_QT_FONTSIZE},
    {name:C.literal("QT_COMPACT"),len:10,syscnf_only:0,origbuf:0,fn:cnf_line_QT_COMPACT},
];
export function parse_config_line(origbuf)
{
    const stackFrame=C.stackSave();
    try {
    let src=C.field(C.iflags,"instance_flags","parse_config_file_src").value;
    let in_sysconf=C.i8((Number(src==C.set_in_sysconf)));
    let bufp; let buf=C.stackAlloc((1*1024));
    let i;
    while(Number(!!(Number(C.i32(C.cell(origbuf,"char").value)==32)||Number(C.i32(C.cell(origbuf,"char").value)==9)))) (origbuf=C.ptr((origbuf+Number(1))));

    /* skip leading whitespace */
    /* (caller probably already did this) */
    C.strncpy(buf,origbuf,C.u64((BigInt((1*1024))-C.u64(1))));
    (C.cell((buf+Number(C.u64((BigInt((1*1024))-C.u64(1))))*1),"char").value=C.i8(0));
    /* strncpy not guaranteed to NUL terminate */
    /* convert any tab to space, condense consecutive spaces into one,
       remove leading and trailing spaces (exception: if there is nothing
       but spaces, one of them will be kept even though it leads/trails) */
    C.mungspaces(buf);
    /* find the '=' or ':' */
    (bufp=find_optparam(buf));
    if(Number(!(bufp))) {
        if(Number(!(C.ignore_statement_errors))) C.variadic(30,C.literal("Not a config statement, missing '='"));
        return (C.i8(0));
    }
    /* skip past '=', then space between it and value, if any */
    (bufp=C.ptr((bufp+Number(1))));
    if(Number(C.i32(C.cell(bufp,"char").value)==32)) (bufp=C.ptr((bufp+Number(1))));
    for((i=0);Number(i<C.i32((C.u64((BigInt((C.sizes["struct match_config_line_stmt"]*59))/BigInt(C.sizes["struct match_config_line_stmt"]))))));((i=C.i32((i+1)))-1)) {
        if(Number(!!(C.i32(C.config_line_stmt[Number(i)].syscnf_only)&&Number(!(in_sysconf))))) continue;
        if(C.match_optname(buf,C.config_line_stmt[Number(i)].name,C.config_line_stmt[Number(i)].len,(C.i8(1)))) {
            let parm=(C.i32(C.config_line_stmt[Number(i)].origbuf)?origbuf:bufp);
            if(Number(!(C.disregarded_config_lines[Number(i)]))) return C.callProc(C.config_line_stmt[Number(i)].fn,"signed char (*)(char *)",parm);
        }
    }
    if(Number(!(C.ignore_errors_on_unmatched))) C.variadic(31,C.literal("Unknown config statement"));
    return (C.i8(0));
    } finally {C.stackRestore(stackFrame); }
}

/* USER_SOUNDS */
export function config_error_init(from_file,sourcename,secure)
{
    from_file=C.i8(from_file);
    secure=C.i8(secure);
    let tmp=C.alloc(C.u32(BigInt(C.sizes["struct _config_error_frame"])));
    (C.field(tmp,"_config_error_frame","line_num").value=0);
    (C.field(tmp,"_config_error_frame","num_errors").value=0);
    (C.field(tmp,"_config_error_frame","origline_shown").value=(C.i8(0)));
    (C.field(tmp,"_config_error_frame","fromfile").value=from_file);
    (C.field(tmp,"_config_error_frame","secure").value=secure);
    (C.cell((C.field(tmp,"_config_error_frame","origline").address+Number(0)*1),"char").value=C.i8(0));
    if(Number(!!(sourcename&&C.i32(C.cell((sourcename+Number(0)*1),"char").value)))) {
        C.strncpy(C.field(tmp,"_config_error_frame","source").address,sourcename,C.u64((BigInt((1*256))-C.u64(1))));
        (C.cell((C.field(tmp,"_config_error_frame","source").address+Number(C.u64((BigInt((1*256))-C.u64(1))))*1),"char").value=C.i8(0));
    } else (C.cell((C.field(tmp,"_config_error_frame","source").address+Number(0)*1),"char").value=C.i8(0));
    (C.field(tmp,"_config_error_frame","next").value=C.config_error_data);
    (C.config_error_data=tmp);
    (C.field(C.program_state,"sinfo","config_error_ready").value=C.i32((C.i8(1))));
}

export function config_error_nextline(line)
{
    let ced=C.config_error_data;
    if(Number(!(ced))) return (C.i8(0));
    if(Number(!!(C.field(ced,"_config_error_frame","num_errors").value&&C.i32(C.field(ced,"_config_error_frame","secure").value)))) return (C.i8(0));
    ((C.field(ced,"_config_error_frame","line_num").value=C.i32((C.field(ced,"_config_error_frame","line_num").value+1)))-1);
    (C.field(ced,"_config_error_frame","origline_shown").value=(C.i8(0)));
    if(Number(!!(line&&C.i32(C.cell((line+Number(0)*1),"char").value)))) {
        C.strncpy(C.field(ced,"_config_error_frame","origline").address,line,C.u64((BigInt((1*1024))-C.u64(1))));
        (C.cell((C.field(ced,"_config_error_frame","origline").address+Number(C.u64((BigInt((1*1024))-C.u64(1))))*1),"char").value=C.i8(0));
    } else (C.cell((C.field(ced,"_config_error_frame","origline").address+Number(0)*1),"char").value=C.i8(0));
    return (C.i8(1));
}

export function l_get_config_errors(L)
{
    let dat=C.config_error_msg;
    let tmp;
    let idx=1;
    C.lua_createtable(L,0,0);
    while(dat) {
        C.lua_pushinteger(L,C.i64(((idx=C.i32((idx+1)))-1)));
        C.lua_createtable(L,0,0);
        C.nhl_add_table_entry_int(L,C.literal("line"),C.i64(C.field(dat,"_config_error_errmsg","line_num").value));
        C.nhl_add_table_entry_str(L,C.literal("error"),C.field(dat,"_config_error_errmsg","errormsg").value);
        C.lua_settable(L,C.i32((-3)));
        (tmp=C.field(dat,"_config_error_errmsg","next").value);
        C.free(C.field(dat,"_config_error_errmsg","errormsg").value);
        (C.field(dat,"_config_error_errmsg","errormsg").value=0);
        C.free(dat);
        (dat=tmp);
    }
    (C.config_error_msg=0);
    return 1;
}

/* SFCTOOL */
/* varargs 'config_error_add()' moved to pline.c */
export function config_erradd(buf)
{
    const stackFrame=C.stackSave();
    try {
    let lineno=C.stackAlloc((1*128));
    let punct;
    if(Number(!!(Number(!(buf))||Number(!(C.cell(buf,"char").value))))) (buf=C.literal("Unknown error"));
    /* if buf[] doesn't end in a period, exclamation point, or question mark,
       we'll include a period (in the message, not appended to buf[]) */
    (punct=(C.c_eos(buf)-Number(1)*1));
    /* eos(buf)-1 is valid */
    (punct=(C.strchr(C.literal(".!?"),C.i32(C.cell(punct,"char").value))?C.literal(""):C.literal(".")));
    if(Number(!(C.field(C.program_state,"sinfo","config_error_ready").value))) {
        /* either very early, where pline() will use raw_print(), or
           player gave bad value when prompted by interactive 'O' command */
        C.variadic(32,C.literal("%s%s%s"),(Number(!(C.field(C.iflags,"instance_flags","window_inited").value))?C.literal("config_error_add: "):C.literal("")),buf,punct);
        C.callProc((C.field(C.windowprocs,"window_procs","win_wait_synch").value),"void (void)");
        return;
    }
    if(C.field(C.iflags,"instance_flags","in_lua").value) {
        let dat=C.alloc(C.u32(BigInt(C.sizes["struct _config_error_errmsg"])));
        (C.field(dat,"_config_error_errmsg","next").value=C.config_error_msg);
        (C.field(dat,"_config_error_errmsg","line_num").value=C.field(C.config_error_data,"_config_error_frame","line_num").value);
        (C.field(dat,"_config_error_errmsg","errormsg").value=C.dupstr(buf));
        (C.config_error_msg=dat);
        return;
    }
    ((C.field(C.config_error_data,"_config_error_frame","num_errors").value=C.i32((C.field(C.config_error_data,"_config_error_frame","num_errors").value+1)))-1);
    if(Number(!!(Number(!(C.field(C.config_error_data,"_config_error_frame","origline_shown").value))&&Number(!(C.field(C.config_error_data,"_config_error_frame","secure").value))))) {
        C.variadic(33,C.literal("\n%s"),C.field(C.config_error_data,"_config_error_frame","origline").address);
        (C.field(C.config_error_data,"_config_error_frame","origline_shown").value=(C.i8(1)));
    }
    if(Number(!!(Number(C.field(C.config_error_data,"_config_error_frame","line_num").value>0)&&Number(!(C.field(C.config_error_data,"_config_error_frame","secure").value))))) {
        C.variadic(34,lineno,C.literal("Line %d: "),C.field(C.config_error_data,"_config_error_frame","line_num").value);
    } else (C.cell((lineno+Number(0)*1),"char").value=C.i8(0));
    C.variadic(35,C.literal("%s %s%s%s"),(C.i32(C.field(C.config_error_data,"_config_error_frame","secure").value)?C.literal("Error:"):C.literal(" *")),lineno,buf,punct);
    } finally {C.stackRestore(stackFrame); }
}

export function config_error_done()
{
    let n;
    let tmp=C.config_error_data;
    if(Number(!(C.config_error_data))) return 0;
    (n=C.field(C.config_error_data,"_config_error_frame","num_errors").value);
    if(Number(C.field(C.gn,"instance_globals_n","no_sound_notified").value>0)) {
        /* no USER_SOUNDS; config_error_add() was called once for first
           SOUND or SOUNDDIR entry seen, then skipped for any others;
           include those skipped ones in the total error count */
        (n=C.i32(n+(C.i32((C.field(C.gn,"instance_globals_n","no_sound_notified").value-1)))));
        (C.field(C.gn,"instance_globals_n","no_sound_notified").value=0);
    }
    if(n) {
        let cmdline=C.i8(Number(!(C.strcmp(C.field(C.config_error_data,"_config_error_frame","source").address,C.literal("command line")))));
        C.variadic(36,C.literal("\n%d error%s %s %s.\n"),n,(((Number((n)==1))?C.literal(""):C.literal("s"))),(C.i32(cmdline)?C.literal("on"):C.literal("in")),(C.i32(C.cell(C.field(C.config_error_data,"_config_error_frame","source").address,"char").value)?C.field(C.config_error_data,"_config_error_frame","source").address:C.configfile));
        C.callProc((C.field(C.windowprocs,"window_procs","win_wait_synch").value),"void (void)");
    }
    (C.config_error_data=C.field(tmp,"_config_error_frame","next").value);
    C.free(tmp);
    (C.field(C.program_state,"sinfo","config_error_ready").value=(Number(C.config_error_data!=0)));
    return n;
}

export function read_config_file(filename,src)
{
    src=C.i32(src);
    let fp;
    let rv=(C.i8(1));
    if(Number(!(((fp=fopen_config_file(filename,src)))))) return (C.i8(0));
    /* begin detection of duplicate configfile options */
    C.reset_duplicate_opt_detection();
    /* SFCTOOL */
    free_config_sections();
    (C.field(C.iflags,"instance_flags","parse_config_file_src").value=src);
    (rv=parse_conf_file(fp,parse_config_line));
    C.fclose(fp);
    free_config_sections();
    /* turn off detection of duplicate configfile options */
    C.reset_duplicate_opt_detection();
    /* SFCTOOL */
    return rv;
}

/* Initialize config parser data */
export function cnf_parser_init(parser)
{
    (C.field(parser,"_cnf_parser_state","rv").value=C.i32((C.i8(1))));
    /* assume successful parse */
    (C.field(parser,"_cnf_parser_state","ep").value=(C.field(parser,"_cnf_parser_state","buf").value=0));
    (C.field(parser,"_cnf_parser_state","skip").value=(C.i8(0)));
    (C.field(parser,"_cnf_parser_state","morelines").value=(C.i8(0)));
    (C.field(parser,"_cnf_parser_state","inbufsz").value=C.u32(C.i32((4*256))));
    (C.field(parser,"_cnf_parser_state","inbuf").value=C.alloc(C.field(parser,"_cnf_parser_state","inbufsz").value));
    (C.field(parser,"_cnf_parser_state","cont").value=(C.i8(0)));
    (C.field(parser,"_cnf_parser_state","pbreak").value=(C.i8(0)));
    C.memset(C.field(parser,"_cnf_parser_state","inbuf").value,0,C.u64(C.field(parser,"_cnf_parser_state","inbufsz").value));
}

/* caller has finished with 'parser' (except for 'rv' so leave that intact) */
export function cnf_parser_done(parser)
{
    (C.field(parser,"_cnf_parser_state","ep").value=0);
    /* points into parser->inbuf, so becoming stale */
    if(C.field(parser,"_cnf_parser_state","inbuf").value) (C.free(C.field(parser,"_cnf_parser_state","inbuf").value),(C.field(parser,"_cnf_parser_state","inbuf").value=0));
    if(C.field(parser,"_cnf_parser_state","buf").value) (C.free(C.field(parser,"_cnf_parser_state","buf").value),(C.field(parser,"_cnf_parser_state","buf").value=0));
}

/*
 * Parse config buffer, handling comments, empty lines, config sections,
 * CHOOSE, and line continuation, calling proc for every valid line.
 *
 * Continued lines are merged together with one space in between.
 */
export function parse_conf_buf(p,proc)
{
    (C.field(p,"_cnf_parser_state","cont").value=(C.i8(0)));
    (C.field(p,"_cnf_parser_state","pbreak").value=(C.i8(0)));
    (C.field(p,"_cnf_parser_state","ep").value=C.strchr(C.field(p,"_cnf_parser_state","inbuf").value,10));
    if(C.field(p,"_cnf_parser_state","skip").value) {
        /* in case previous line was too long */
        if(C.field(p,"_cnf_parser_state","ep").value) (C.field(p,"_cnf_parser_state","skip").value=(C.i8(0)));
        /* found newline; next line is normal */
    } else {
        if(Number(!(C.field(p,"_cnf_parser_state","ep").value))) {
            /* newline missing */
            if(Number(C.strlen(C.field(p,"_cnf_parser_state","inbuf").value)<C.u64((C.u32((C.field(p,"_cnf_parser_state","inbufsz").value-C.u32(2))))))) {
                /* likely the last line of file is just
                   missing a newline; process it anyway  */
                (C.field(p,"_cnf_parser_state","ep").value=C.eos(C.field(p,"_cnf_parser_state","inbuf").value));
            } else {
                C.variadic(37,C.literal("Line too long, skipping"));
                (C.field(p,"_cnf_parser_state","skip").value=(C.i8(1)));
                /* discard next fgets */
            }
        } else {
            (C.cell(C.field(p,"_cnf_parser_state","ep").value,"char").value=C.i8(0));
            /* remove newline */
        }
        if(C.field(p,"_cnf_parser_state","ep").value) {
            let tmpbuf=0;
            let len;
            let ignoreline=(C.i8(0));
            let oldline=(C.i8(0));
            /* line continuation (trailing '\') */
            (C.field(p,"_cnf_parser_state","morelines").value=C.i8((Number(!!(Number((C.field(p,"_cnf_parser_state","ep").value=C.ptr((C.field(p,"_cnf_parser_state","ep").value-Number(1))))>=C.field(p,"_cnf_parser_state","inbuf").value)&&Number(C.i32(C.cell(C.field(p,"_cnf_parser_state","ep").value,"char").value)==92))))));
            if(C.field(p,"_cnf_parser_state","morelines").value) (C.cell(C.field(p,"_cnf_parser_state","ep").value,"char").value=C.i8(0));
            /* trim off spaces at end of line */
            while(Number(!!(Number(C.field(p,"_cnf_parser_state","ep").value>=C.field(p,"_cnf_parser_state","inbuf").value)&&(Number(!!(Number(!!(Number(C.i32(C.cell(C.field(p,"_cnf_parser_state","ep").value,"char").value)==32)||Number(C.i32(C.cell(C.field(p,"_cnf_parser_state","ep").value,"char").value)==9)))||Number(C.i32(C.cell(C.field(p,"_cnf_parser_state","ep").value,"char").value)==13))))))) (C.cell(((C.field(p,"_cnf_parser_state","ep").value=C.ptr((C.field(p,"_cnf_parser_state","ep").value-Number(1))))+Number(1)),"char").value=C.i8(0));

            if(Number(!(config_error_nextline(C.field(p,"_cnf_parser_state","inbuf").value)))) {
                (C.field(p,"_cnf_parser_state","rv").value=C.i32((C.i8(0))));
                if(C.field(p,"_cnf_parser_state","buf").value) (C.free(C.field(p,"_cnf_parser_state","buf").value),(C.field(p,"_cnf_parser_state","buf").value=0));
                (C.field(p,"_cnf_parser_state","pbreak").value=(C.i8(1)));
                return;
            }
            (C.field(p,"_cnf_parser_state","ep").value=C.field(p,"_cnf_parser_state","inbuf").value);
            while(Number(!!(Number(C.i32(C.cell(C.field(p,"_cnf_parser_state","ep").value,"char").value)==32)||Number(C.i32(C.cell(C.field(p,"_cnf_parser_state","ep").value,"char").value)==9)))) (C.field(p,"_cnf_parser_state","ep").value=C.ptr((C.field(p,"_cnf_parser_state","ep").value+Number(1))));

            /* ignore empty lines and full-line comment lines */
            if(Number(!!(Number(!(C.cell(C.field(p,"_cnf_parser_state","ep").value,"char").value))||Number(C.i32(C.cell(C.field(p,"_cnf_parser_state","ep").value,"char").value)==35)))) (ignoreline=(C.i8(1)));
            if(C.field(p,"_cnf_parser_state","buf").value) (oldline=(C.i8(1)));
            /* merge now read line with previous ones, if necessary */
            if(Number(!(ignoreline))) {
                (len=C.i32((C.i32(C.strlen(C.field(p,"_cnf_parser_state","ep").value))+1)));
                /* +1: final '\0' */
                if(C.field(p,"_cnf_parser_state","buf").value) (len=C.i32(len+C.i32((C.i32(C.strlen(C.field(p,"_cnf_parser_state","buf").value))+1))));
                /* +1: space */
                (tmpbuf=C.alloc(C.u32(len)));
                (C.cell(tmpbuf,"char").value=C.i8(0));
                if(C.field(p,"_cnf_parser_state","buf").value) {
                    C.strcat(C.strcpy(tmpbuf,C.field(p,"_cnf_parser_state","buf").value),C.literal(" "));
                    (C.free(C.field(p,"_cnf_parser_state","buf").value),(C.field(p,"_cnf_parser_state","buf").value=0));
                }
                (C.field(p,"_cnf_parser_state","buf").value=C.strcat(tmpbuf,C.field(p,"_cnf_parser_state","ep").value));
                if(Number(C.strlen(C.field(p,"_cnf_parser_state","buf").value)>=C.u64(C.field(p,"_cnf_parser_state","inbufsz").value))) (C.cell((C.field(p,"_cnf_parser_state","buf").value+Number(C.u32((C.field(p,"_cnf_parser_state","inbufsz").value-C.u32(1))))*1),"char").value=C.i8(0));
            }
            if(Number(!!(C.i32(C.field(p,"_cnf_parser_state","morelines").value)||(Number(!!(C.i32(ignoreline)&&Number(!(oldline)))))))) return;
            if(handle_config_section(C.field(p,"_cnf_parser_state","buf").value)) {
                (C.free(C.field(p,"_cnf_parser_state","buf").value),(C.field(p,"_cnf_parser_state","buf").value=0));
                return;
            }
            /* from here onwards, we'll handle buf only */
            if(C.match_optname(C.field(p,"_cnf_parser_state","buf").value,C.literal("CHOOSE"),6,(C.i8(1)))) {
                let section;
                let bufp=find_optparam(C.field(p,"_cnf_parser_state","buf").value);
                if(Number(!(bufp))) {
                    C.variadic(38,C.literal("Format is CHOOSE=section1,section2,..."));
                    (C.field(p,"_cnf_parser_state","rv").value=C.i32((C.i8(0))));
                    (C.free(C.field(p,"_cnf_parser_state","buf").value),(C.field(p,"_cnf_parser_state","buf").value=0));
                    return;
                }
                ((bufp=C.ptr((bufp+Number(1))))-Number(1));
                if(C.field(C.gc,"instance_globals_c","config_section_chosen").value) (C.free(C.field(C.gc,"instance_globals_c","config_section_chosen").value),(C.field(C.gc,"instance_globals_c","config_section_chosen").value=0));
                (section=choose_random_part(bufp,C.i8(44)));
                if(section) {
                    (C.field(C.gc,"instance_globals_c","config_section_chosen").value=C.dupstr(section));
                } else {
                    C.variadic(39,C.literal("No config section to choose"));
                    (C.field(p,"_cnf_parser_state","rv").value=C.i32((C.i8(0))));
                }
                (C.free(C.field(p,"_cnf_parser_state","buf").value),(C.field(p,"_cnf_parser_state","buf").value=0));
                return;
            }
            if(Number(!(C.callProc((proc),"signed char (char *)",C.field(p,"_cnf_parser_state","buf").value)))) (C.field(p,"_cnf_parser_state","rv").value=C.i32((C.i8(0))));
            (C.free(C.field(p,"_cnf_parser_state","buf").value),(C.field(p,"_cnf_parser_state","buf").value=0));
        }
    }
}

export function parse_conf_str(str,proc)
{
    const stackFrame=C.stackSave();
    try {
    let len;
    let parser=C.stackAlloc(C.sizes["struct _cnf_parser_state"]);
    cnf_parser_init(parser);
    free_config_sections();
    config_error_init((C.i8(0)),C.literal("parse_conf_str"),(C.i8(0)));
    while(Number(!!(str&&C.i32(C.cell(str,"char").value)))) {
        (len=C.u64(0));
        while(Number(!!(C.i32(C.cell(str,"char").value)&&Number(len<C.u64((C.u32((C.field(parser,"_cnf_parser_state","inbufsz").value-C.u32(1))))))))) {
            (C.cell((C.field(parser,"_cnf_parser_state","inbuf").value+Number(len)*1),"char").value=C.cell(str,"char").value);
            ((len=C.u64((len+1n)))-1n);
            ((str=C.ptr((str+Number(1))))-Number(1));
            if(Number(C.i32(C.cell((C.field(parser,"_cnf_parser_state","inbuf").value+Number(C.u64((len-C.u64(1))))*1),"char").value)==10)) break;
        }
        (C.cell((C.field(parser,"_cnf_parser_state","inbuf").value+Number(len)*1),"char").value=C.i8(0));
        parse_conf_buf(parser,proc);
        if(C.field(parser,"_cnf_parser_state","pbreak").value) break;
    }
    cnf_parser_done(parser);
    free_config_sections();
    config_error_done();
    return C.i8(C.field(parser,"_cnf_parser_state","rv").value);
    } finally {C.stackRestore(stackFrame); }
}

/* parse_conf_file
 *
 * Read from file fp, calling parse_conf_buf for each line.
 */
export function parse_conf_file(fp,proc)
{
    const stackFrame=C.stackSave();
    try {
    let parser=C.stackAlloc(C.sizes["struct _cnf_parser_state"]);
    cnf_parser_init(parser);
    free_config_sections();
    while(C.fgets(C.field(parser,"_cnf_parser_state","inbuf").value,C.i32(C.field(parser,"_cnf_parser_state","inbufsz").value),fp)) {
        parse_conf_buf(parser,proc);
        if(C.field(parser,"_cnf_parser_state","pbreak").value) break;
    }
    cnf_parser_done(parser);
    free_config_sections();
    return C.i8(C.field(parser,"_cnf_parser_state","rv").value);
    } finally {C.stackRestore(stackFrame); }
}

export function config_error_add(str,...the_args)
{
    (the_args=C.va_start(the_args));
    vconfig_error_add(str,the_args);
    C.va_end(the_args);
}

export function vconfig_error_add(str,the_args)
{
    const stackFrame=C.stackSave();
    try {
    /* start of vconf...() or of nested block in USE_OLDARG's conf...() */
    let vlen=0;
    let buf=C.stackAlloc((1*1280));
    /* will be chopped down to BUFSZ-1 if longer */
    (vlen=C.vsnprintf(buf,BigInt((1*1280)),str,the_args));
    ((vlen));
    (C.cell((buf+Number(C.i32((256-1)))*1),"char").value=C.i8(0));
    config_erradd(buf);
    } finally {C.stackRestore(stackFrame); }
}

export function rcfile()
{
    let opts=0; let xtraopts=0;
    let envname; let namesrc; let nameval;
    (C.field(C.go,"instance_globals_o","opt_phase").value=C.i32(C.environ_opt));
    /* getenv() instead of nhgetenv(): let total length of options be long;
       parseoptions() will check each individually */
    (envname=C.literal("NETHACKOPTIONS"));
    (opts=C.getenv(envname));
    if(Number(!(opts))) {
        /* fall back to original name; discouraged */
        (envname=C.literal("HACKOPTIONS"));
        (opts=C.getenv(envname));
    }
    if(C.field(C.gc,"instance_globals_c","cmdline_rcfile").value) {
        (namesrc=C.literal("command line"));
        (nameval=C.field(C.gc,"instance_globals_c","cmdline_rcfile").value);
        (xtraopts=opts);
        if(Number(!!(opts&&(Number(!!(Number(!!(Number(C.i32(C.cell(opts,"char").value)==47)||Number(C.i32(C.cell(opts,"char").value)==92)))||Number(C.i32(C.cell(opts,"char").value)==64))))))) (xtraopts=0);
        /* NETHACKOPTIONS is a file name; ignore it */
    } else if(Number(!!(opts&&(Number(!!(Number(!!(Number(C.i32(C.cell(opts,"char").value)==47)||Number(C.i32(C.cell(opts,"char").value)==92)))||Number(C.i32(C.cell(opts,"char").value)==64))))))) {
        /* NETHACKOPTIONS is a file name; use that instead of the default */
        if(Number(C.i32(C.cell(opts,"char").value)==64)) (opts=C.ptr((opts+Number(1))));
        /* @filename */
        (namesrc=envname);
        (nameval=opts);
        (xtraopts=0);
    } else {
        /* either no NETHACKOPTIONS or it wasn't a file name;
           read the default configuration file */
        (nameval=(namesrc=0));
        (xtraopts=opts);
    }
    (C.field(C.go,"instance_globals_o","opt_phase").value=C.i32(C.rc_file_opt));
    /* seemingly arbitrary name length restriction is to prevent error
       messages, if any were to be delivered while accessing the file,
       from potentially overflowing buffers */
    if(Number(!!(nameval&&Number(C.i32(C.strlen(nameval))>=C.i32(Math.trunc((256/2))))))) {
        config_error_init((C.i8(1)),namesrc,(C.i8(0)));
        C.variadic(40,C.literal("nethackrc file name \"%.40s\"... too long; using default"),nameval);
        config_error_done();
        (nameval=(namesrc=0));
        /* revert to default nethackrc */
    }
    config_error_init((C.i8(1)),nameval,C.i8((nameval?C.i32((C.i8(1))):C.i32((C.i8(0))))));
    read_config_file(nameval,C.set_in_config);
    config_error_done();
    if(xtraopts) {
        /* NETHACKOPTIONS is present and not a file name */
        (C.field(C.go,"instance_globals_o","opt_phase").value=C.i32(C.environ_opt));
        config_error_init((C.i8(0)),envname,(C.i8(0)));
        C.parseoptions(xtraopts,(C.i8(1)),(C.i8(0)));
        config_error_done();
    }
    if(C.field(C.gc,"instance_globals_c","cmdline_rcfile").value) (C.free(C.field(C.gc,"instance_globals_c","cmdline_rcfile").value),(C.field(C.gc,"instance_globals_c","cmdline_rcfile").value=0));
    /*[end of nethackrc handling]*/
}

export function rcfile_interface_options()
{
    C.allopt_array_init();
    C.disregard_all_options();
    disregard_all_config_statements();
    C.heed_this_option(C.i32(C.opt_windowtype));
    C.heed_this_option(C.i32(C.opt_soundlib));
    set_ignore_errors_on_unmatched();
    (C.ignore_statement_errors=(C.i8(1)));
    rcfile();
    heed_all_config_statements();
    C.heed_all_options();
    C.disregard_this_option(C.i32(C.opt_windowtype));
    C.disregard_this_option(C.i32(C.opt_soundlib));
    clear_ignore_errors_on_unmatched();
    (C.ignore_statement_errors=(C.i8(0)));
}

export function heed_all_config_statements()
{
    let i;
    for((i=0);Number(i<C.i32((C.u64((BigInt((1*59))/BigInt(1))))));((i=C.i32((i+1)))-1)) {
        (C.disregarded_config_lines[Number(i)]=(C.i8(0)));
    }
}

export function disregard_all_config_statements()
{
    let i;
    for((i=0);Number(i<C.i32((C.u64((BigInt((1*59))/BigInt(1))))));((i=C.i32((i+1)))-1)) {
        (C.disregarded_config_lines[Number(i)]=(C.i8(1)));
    }
}

export function heed_this_config_statement(statement_idx)
{
    statement_idx=C.i32(statement_idx);
    if(Number(!!(Number(statement_idx>=0)&&Number(statement_idx<C.i32((C.u64((BigInt((1*59))/BigInt(1))))))))) (C.disregarded_config_lines[Number(statement_idx)]=(C.i8(0)));
}

export function disregard_this_config_statement(statement_idx)
{
    statement_idx=C.i32(statement_idx);
    if(Number(!!(Number(statement_idx>=0)&&Number(statement_idx<C.i32((C.u64((BigInt((1*59))/BigInt(1))))))))) (C.disregarded_config_lines[Number(statement_idx)]=(C.i8(1)));
}

export function clear_ignore_errors_on_unmatched()
{
    (C.ignore_errors_on_unmatched=(C.i8(0)));
}

export function set_ignore_errors_on_unmatched()
{
    (C.ignore_errors_on_unmatched=(C.i8(1)));
}

export function config_unmatched_ignored()
{
    if(C.ignore_errors_on_unmatched) return (C.i8(1));
    return (C.i8(0));
}

/* SFCTOOL */
export function assure_syscf_file()
{
    let fd;
    /* We are checking that the sysconf exists ... lock the path */
    /*
     * All we really care about is the end result - can we read the file?
     * So just check that directly.
     *
     * Not tested on most of the old platforms (which don't attempt
     * to implement SYSCF).
     * Some ports don't like open()'s optional third argument;
     * VMS overrides open() usage with a macro which requires it.
     */
    (fd=C.variadic(41,C.literal("sysconf"),0));
    /* VMS */
    /* VMS */
    if(Number(fd>=0)) {
        /* readable */
        C.close(fd);
        return;
    }
    if(C.field(C.gd,"instance_globals_d","deferred_showpaths").value) C.do_deferred_showpaths(1);
    /* does not return */
    C.variadic(42,C.literal("Unable to open SYSCF_FILE.\n"));
    C.exit(1);
}

/* SYSCF_FILE */
/* SYSCF */
/* ----------  END CONFIG FILE HANDLING ----------- */
/*cfgfiles.c*/
export const initialState=C=>({ignore_errors_on_unmatched:0,ignore_statement_errors:0,default_configfile:C.literal(".nethackrc"),configfile:C.configfileBuffer,config_line_stmt:config_line_stmt(C),disregarded_config_lines:new Int8Array(59),config_error_data:0,config_error_msg:0});
