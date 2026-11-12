/* NetHack 5.0	sfctool.c */
/* Copyright (c) Michael Allison, 2025.                           */
/* NetHack may be freely redistributed.  See license for details. */
/*
 *  Utility for reading a binary save file in the native historical
 *  format of the accompanying NetHack executable, and writing it out
 *  in an export format, possibly destined for a different platform,
 *  architecture, or data model.
 *
 *  The resulting export file will only be useful for transport
 *  between different platforms and architectures that share the exact
 *  same version of NetHack with the same features. That is, the same
 *  fields must be present in the NetHack data structures, in the same
 *  sequence. The fields do not have to be the same size or use the same
 *  data model.
 *
 */
/* functions in this file */
/* files.c */
/* files.c */
/* files.c */
/*
 * This is a replacement tempered down version of same-named
 * function in files.c within #ifndef SFCTOOL blocks.
 */
/* bwrite() calls this */
/* WIN32 */
/* Global data */
/* worm segment structure */
/* the segment's position */
/* from sfstruct.c */
/* from sfbase.c */
/* files.c */
/* files.c */
/*********
 * main  *
 *********/

import { C } from './sfctool-scope.js';

export const rensuffixes = [
    "IL32LLP64", /* (3) Windows x64 savefile on x86 */
    "I32LP64",   /* (4) Unix 64 savefile on x86 */
    "ILP32LL64", /* (5) x86 savefile on Unix 64 */
    "ILP32LL64", /* (6) x86 savefile on Windows x64 */
    "I32LP64",   /* (7) Unix 64 savefile on Windows x64 */
    "IL32LLP64", /* (8) Windows x64 savefile on Unix 64 */
    "OTHER",     /* (9) */
];

export function main(argc, argv)
{
    let arg;
    let folderbuf = C.charArrayLocal(5000);
    let suffix = (C.convertstyle == C.exportascii) ? ".exportascii" : "";
    let add_folder = true, add_extension = false;
    let default_extension = "";

    C.runtime_info_init(); /* mdlib.c */
    C.setChar(folderbuf, 0, '.');
    C.setChar(folderbuf, 1, '/');
    C.setChar(folderbuf, 2, '\0');
    chdirx(C.HACKDIR, false);
    C.strcpy(folderbuf, "save/");

    read_sysconf();
    C.thisdatamodel = C.datamodel(0);
    if (argc < 3 && !(argc == 2 && !C.strcmp(argv[1], "-d"))) {
        usage(argc, argv);
        C.exit(C.EXIT_FAILURE);
    }
    for (arg = 1; arg < argc; ++arg) {
        if (arg == 1 && !C.strcmp(argv[arg], "-d")) {
            C.fprintf(
                C.stdout,
                "\nThe historical savefile datamodel supported by this utility is %s (%s).\n",
                C.thisdatamodel, C.datamodel(1));
            C.exit(C.EXIT_SUCCESS);
        }

        if (arg == 1 && !C.strcmp(argv[arg], "-u")) {
            C.explicit_option = true;
            C.chosen_unconvert = true;
            continue;
        }
        if (arg == 1 && !C.strcmp(argv[arg], "-c")) {
            if (C.explicit_option && C.chosen_unconvert) {
                C.fprintf(C.stderr, "\nsfctool error - conflicting options.\n");
                C.exit(C.EXIT_FAILURE); /* both -u and -c not allowed */
            }
            C.explicit_option = true;
            C.chosen_unconvert = false;
            continue;
        }

        if (arg == 2) {
            let ln = C.strlen(argv[arg]);
            let addseparator = false;

            if (!C.contains_directory(argv[arg])) {
                let finalchar = C.char(C.eos(folderbuf) - 1);

                if (!(finalchar == '\\'.charCodeAt(0) || finalchar == '/'.charCodeAt(0))) {
                    ln += 1;
                    addseparator = true;
                }
            } else {
                add_folder = false;
            }
            if (C.explicit_option) {
                if (add_folder)
                    ln += C.strlen(folderbuf);
                if (add_extension)
                    ln += C.strlen(default_extension);
                C.unconverted_filename = C.alloc(C.int(ln) + 1);
                C.nh_snprintf("main", 259, C.unconverted_filename, ln + 1, "%s%s%s%s",
                         add_folder ? folderbuf : "",
                         addseparator ? "/" : "",
                         argv[arg],
                         add_extension ? default_extension : "");
                ln += C.strlen(suffix);
                C.converted_filename = C.alloc(C.int(ln) + 1);
                C.nh_snprintf("main", 266, C.converted_filename, ln + 1, "%s%s",
                         C.unconverted_filename, suffix);
            } else {
                C.fprintf(C.stderr, "\nsfctool error - missing -c or -u before "
                                + "save filename.\n");
                C.exit(C.EXIT_FAILURE); /* need both filenames */
            }
        }
    }
    if (!C.converted_filename || !C.unconverted_filename) {
        C.fprintf(C.stderr, "\nsfctool error - missing %sconverted file name.\n",
                !C.converted_filename ? "" : "un");
        C.exit(C.EXIT_FAILURE); /* need both filenames */
    }

    my_sf_init();
    if (C.chosen_unconvert) {
        process_savefile(C.converted_filename, C.convertstyle,
                         C.unconverted_filename, C.historical, C.chosen_unconvert);
    } else {
        process_savefile(C.unconverted_filename, C.historical, C.converted_filename,
                         C.convertstyle, C.chosen_unconvert);
    }
}

// Original inactive-platform annotations from this function.
/* On Windows we allow specifying the savefile name without the extention
             * in the arguments */

/* ======================================================================== */
/*   Process the src savefile and create the dst file */
/*   Return 1 for success, 0 for failure */
/* ======================================================================== */
export function process_savefile(srcfnam, srcstyle, dstfnam, cvtstyle, unconvert)
{
    let nhfp = [0, 0];              /* one for UNCONVERTED, one for CONVERTED */
    let srcidx = unconvert ? C.CONVERTED : C.UNCONVERTED,
        dstidx = unconvert ? C.UNCONVERTED : C.CONVERTED,
        sfstatus = 0, i;
    let indicator = C.charLocal(), file_csc_count = C.charLocal();
    /* nh_uncompress(fq_save); */
    let dmfile;

    if ((nhfp[srcidx] = open_srcfile(srcfnam, srcstyle)) == 0)
        return 0;
    sfstatus = C.validate(nhfp[srcidx], srcfnam, false);
    dmfile = C.what_datamodel_is_this(0,
                                    C.cscbuf[1],  /* short */
                                    C.cscbuf[2],  /* int */
                                    C.cscbuf[3],  /* long */
                                    C.cscbuf[4],  /* long long */
                                    C.cscbuf[5]); /* ptr */
    if (sfstatus > C.SF_UPTODATE
        && ((sfstatus <= C.SF_CRITICAL_BYTE_COUNT_MISMATCH) || !unconvert)) {
        if (sfstatus == C.SF_OUTDATED) {
            C.fprintf(C.stderr,
                "The %s savefile is outdated with respect to this %d.%d.%d EDITLEVEL %ld "
                + "%s%s%s.\n",
                briefname(srcfnam),
                C.VERSION_MAJOR, C.VERSION_MINOR, C.PATCHLEVEL,
                C.EDITLEVEL,
                C.thisdatamodel ? C.thisdatamodel : "",
                C.thisdatamodel ? " " : "",
                "sfctool");
            return 0;
        } else {
            C.fprintf(C.stderr,
                "The %s savefile %s%s%s not compatible with this %s%s %s utility.\n",
                briefname(srcfnam),
                dmfile ? "is a " : "",
                dmfile ? dmfile : "",
                dmfile ? " savefile, thus" : " is",
                C.thisdatamodel ? C.thisdatamodel : "",
                C.thisdatamodel ? " " : "",
                "sfctool");
            return 0;
        }
    }
    if (sfstatus >= C.SF_DM_IL32LLP64_ON_ILP32LL64) {
        C.renidx = sfstatus - C.SF_DM_IL32LLP64_ON_ILP32LL64;
    } else if (sfstatus == C.SF_UPTODATE) {
        C.renidx = -2;
    }
    if ((nhfp[dstidx] = create_dstfile(dstfnam, cvtstyle)) == 0) {
        C.close_nhfile(nhfp[dstidx]);
        C.nh_compress(C.unconverted_filename);
        return 0;
    }
    if (unconvert) {
        nhfp[srcidx].nhfpconvert = nhfp[C.UNCONVERTED];
    } else {
        /* converting */
        nhfp[srcidx].nhfpconvert = nhfp[C.CONVERTED];
    }
    if (unconvert)
        C.fprintf(C.stdout, "\n\nunconverting %s to %s savefile called %s.\n",
                briefname(C.converted_filename),
                dmfile,
                briefname(C.unconverted_filename));
    else
        C.fprintf(C.stdout, "\n\nconverting %s %s format %s to %s format\n",
                style_to_text(srcstyle),
                C.thisdatamodel,
                briefname(C.unconverted_filename),
                style_to_text(cvtstyle));

    C.rewind_nhfile(nhfp[srcidx]);
    if (unconvert) {
        nhfp[srcidx].mode |= C.UNCONVERTING;
    } else {
        /* converting */
        nhfp[srcidx].mode |= C.CONVERTING;
    }
    nhfp[srcidx].rcount = 0n;
    C.Sfi_char(nhfp[srcidx], indicator, "indicate-format", 1);
    C.Sfi_char(nhfp[srcidx], file_csc_count, "count-critical_sizes", 1);
    for (i = 0; i < file_csc_count.value; ++i) {
        C.Sfi_uchar(nhfp[srcidx], C.addressOf(C.cscbuf, i), "critical_sizes");
    }
    C.rewind_nhfile(nhfp[dstidx]);
    /*
     * store_critical_bytes() will take care of inserting the
     * indicate-format, count-critical_sizes, and critical_sizes for
     * this platform/data-model destination, instead of copying those
     * values from the savefile that was converted.
     */
    C.store_critical_bytes(nhfp[dstidx]);

    C.Sfi_version_info(nhfp[srcidx], C.vers_info, "version_info");
    C.svm.moves = 1n;  /* match u_init.c */

       /********************
        * player name info *
        ********************/

    C.get_plname_from_file(nhfp[srcidx], C.plname, true);

    {
        /********************
         *    lev 0         *
         ********************/
        let lev = 0;

        C.getlev(nhfp[srcidx], lev, false);
    }

    {
        /********************
         *    gamestate     *
         ********************/
/*        unsigned int stuckid, steedid; */
        C.restgamestate(nhfp[srcidx]);
    }

    {
        /********************
         * Do all levels    *
         ********************/
        let ltmp = C.charLocal();

        C.restoreinfo.mread_flags = 1; /* return despite error */
        while (1) {
            ltmp.value = -1;
            C.Sfi_xint8(nhfp[srcidx], ltmp, "gamestate-level_number");
            if (nhfp[srcidx].eof || ltmp.value == -1)
                break;

            C.getlev(nhfp[srcidx], 0, ltmp.value);
        }
        C.restoreinfo.mread_flags = 0;
    }
    nhfp[srcidx].mode &= ~(C.CONVERTING | C.UNCONVERTING);
    nhfp[srcidx].nhfpconvert = 0;
    C.close_nhfile(nhfp[srcidx]);
    C.close_nhfile(nhfp[dstidx]);
    C.nh_compress(dstfnam);
    C.nh_compress(srcfnam);
    return 1;
}

/* open srcfile for reading */
export function open_srcfile(fnam, mystyle)
{
    let fd;
    let fq_name;
    let nhfp = 0;

    nhfp = C.new_nhfile();
    if (nhfp) {
        nhfp.mode = C.READING;
        nhfp.structlevel = (mystyle == C.historical);
        nhfp.fieldlevel = (mystyle > C.historical);
        nhfp.ftype = C.NHF_SAVEFILE;
        nhfp.fnidx = mystyle;
        nhfp.fd = -1;
        nhfp.addinfo =
            (nhfp.fieldlevel && (mystyle = C.exportascii))
                ? true
                : false;
        C.snprintf(C.srclogfilenm, C.BUFSZ, "srcfile.%s.log",
                        (mystyle == C.historical) ? "historical" : "exportascii");
    }

    fq_name = C.fqname(fnam, C.SAVEPREFIX, 0);
    C.nh_uncompress(fq_name);
    if (nhfp && nhfp.structlevel) {
        fd = C.open(fq_name, C.O_RDONLY | C.O_BINARY, 0);
        if (fd < 0) {
            C.free_nhfile(nhfp);
            C.fprintf(C.stderr,
                    "\nsfctool error - unable to open historical-style "
                    + "source file %s.\n",
                    fnam);
            nhfp = 0;
            C.nh_compress(fq_name);
        } else {
            nhfp.fd = fd;
        }
    }
    if (nhfp && nhfp.fieldlevel) {
        /*        char savenamebuf[BUFSZ]; */

        nhfp.fpdef = C.fopen(fnam, C.RDBMODE);
        if (!nhfp.fpdef) {
            C.free_nhfile(nhfp);
            C.fprintf(C.stderr,
                    "\nsfctool error - unable to open fieldlevel-style "
                    + "source file %s.\n",
                    fnam);
            nhfp = 0;
            C.nh_compress(fq_name);
        }
    }
    return nhfp;
}

/* create dst file, overwriting one if it already exists */
export function create_dstfile(fnam, mystyle)
{
    let fd, ret;
    let ln = 0;
    let cf;
    let nhfp = 0;
    let fq_name;
    let dstfnam = C.charArrayLocal(2048);
    let dsttmp;
    let dst_file_exists = false, ren_file_exists = false;

    C.nhUse(ret);
    C.nh_snprintf("create_dstfile", 528, dstfnam, 2048, "%s", fnam);
    if ((cf = C.fopen(dstfnam, C.RDBMODE)) != 0) {
        dst_file_exists = true;
        C.fclose(cf);
    }

    if (dst_file_exists) {
        if (C.chosen_unconvert) {
            ln = C.strlen(fnam) >>> 0;
            if (C.renidx >= 0) {
                ln = (ln + C.strlen(C.rensuffixes[C.renidx]) + 1) >>> 0; /* +1 for '.' */
            } else if (C.renidx == -2) {
                ln = (ln + C.strlen(C.thisdatamodel) + 1) >>> 0; /* +1 for '.' */
            } else {
                ln = (ln + C.strlen(C.thisdatamodel) + 1
                      + 4) >>> 0; /* +1 for '.'; +4 for "not_" */
            }
            dsttmp = C.alloc((ln + 1) >>> 0);
            C.strcpy(dsttmp, fnam);
            C.strcat(dsttmp, ".");
            if (C.renidx >= 0) {
                C.strcat(dsttmp, C.rensuffixes[C.renidx]);
            } else if (C.renidx == -2) {
                C.strcat(dsttmp, C.thisdatamodel);
            } else {
                C.strcat(dsttmp, "not_");
                C.strcat(dsttmp, C.thisdatamodel);
            }
            if ((cf = C.fopen(dsttmp, C.RDBMODE)) != 0) {
                ren_file_exists = true;
                C.fclose(cf);
            }
            if (ren_file_exists) {
                C.unlink(dsttmp);
            }
            ret = C.rename(fnam, dsttmp);
            C.free(dsttmp), dsttmp = 0;
        } else {
            if ((cf = C.fopen(dstfnam, C.RDBMODE)) != 0) {
                ren_file_exists = true;
                C.fclose(cf);
            }
            if (ren_file_exists) {
                C.unlink(dstfnam);
            }
        }
    }

    nhfp = C.new_nhfile();
    if (nhfp) {
        nhfp.mode = C.WRITING;
        nhfp.ftype = C.NHF_SAVEFILE;
        nhfp.structlevel = (mystyle == C.historical);
        nhfp.fieldlevel = (mystyle > C.historical);
        nhfp.fnidx = mystyle;
        nhfp.fd = -1;
        C.snprintf(C.dstlogfilenm, C.BUFSZ, "dstfile.%s.log",
                        (mystyle == C.historical) ? "historical" : "exportascii");
    }

    if (nhfp && nhfp.structlevel) {
        fq_name = C.fqname(dstfnam, C.SAVEPREFIX, 0);
        fd = C.creat(dstfnam, C.FCMASK);
        if (fd < 0) {
            C.free_nhfile(nhfp);
            C.fprintf(
                C.stderr,
                "Unable to create historical-style destination file %s.\n",
                fnam);
            nhfp = 0;
        } else {
            nhfp.fd = fd;
        }
    } else if (nhfp && nhfp.fieldlevel) {
        fq_name = C.fqname(dstfnam, C.SAVEPREFIX, 0);
        nhfp.fpdef = C.fopen(fq_name, C.WRBMODE);
        if (!nhfp.fpdef) {
            C.free_nhfile(nhfp);
            C.fprintf(
                C.stderr,
                "Unable to create fieldlevel-style destination file %s.\n",
                fnam);
            nhfp = 0;
        }
    }
    return nhfp;
}


export function briefname(fnam)
{
    let bn = fnam, sep = 0;

    if ((sep = C.strrchr(fnam, '/')) || (sep = C.strrchr(fnam, '\\'))
        || (sep = C.strrchr(fnam, ':')))
        bn = sep + 1;
    return bn;
}


export function style_to_text(style)
{
    let txt;

    switch (style) {
    case C.historical:
        txt = "historical";
        break;
    case C.exportascii:
        txt = "exportascii";
        break;
    case C.invalid:
    default:
        txt = "invalid";
        break;
    }
    return txt;
}


export function my_sf_init()
{
    C.decl_globals_init();
    C.sfoprocs[C.invalid] = C.zerosfoprocs;
    C.sfiprocs[C.invalid] = C.zerosfiprocs;
    C.sfoprocs[C.historical] = C.historical_sfo_procs;
    C.sfiprocs[C.historical] = C.historical_sfi_procs;
    C.sfoflprocs[C.exportascii] = C.exportascii_sfo_procs;
    C.sfiflprocs[C.exportascii] = C.exportascii_sfi_procs;
}

/* delete savefile */
export function delete_savefile()
{
    return 0; /* for restore_saved_game() (ex-xxxmain.c) test */
}


export function read_sysconf()
{
/* someday there may be other SYSCF alternatives besides text file */
    /* If SYSCF_FILE is specified, it _must_ exist... */
    C.assure_syscf_file();
    C.config_error_init(true, C.SYSCF_FILE, false);
    if (!C.read_config_file(C.SYSCF_FILE, C.set_in_sysconf)) {
        if (C.config_error_done() && !C.iflags.initoptions_noterminate)
            nh_terminate(C.EXIT_FAILURE);
    }
    C.config_error_done();
    /*
     * TODO [maybe]: parse the sysopt entries which are space-separated
     * lists of usernames into arrays with one name per element.
     */
}

// Original inactive-platform annotations from this function.
/* SYSCF */

/* provided for linkage only */
export function raw_printf(line)
{
    let the_args = C.vaListLocal();

    C.va_start(the_args, line);
    C.vfprintf(C.stdout, line, the_args);
    C.va_end(the_args);
}


export function error(s)
{
    let the_args = C.vaListLocal();

    C.va_start(the_args, s);
    C.vprintf(s, the_args);
    C.va_end(the_args);
    C.exit(C.EXIT_FAILURE);
}


export function pline(s)
{
    let the_args = C.vaListLocal();

    C.va_start(the_args, s);
    C.vprintf(s, the_args);
    C.va_end(the_args);
}


export function impossible(s)
{
    let the_args = C.vaListLocal();

    C.va_start(the_args, s);
    C.vprintf(s, the_args);
    C.va_end(the_args);
    C.exit(C.EXIT_FAILURE);
}

/* normalize file name - we don't like .'s, /'s, spaces */
export function regularize(s)
{
    let lp;

    while ((lp = C.strchr(s, '.')) != 0 || (lp = C.strchr(s, '/')) != 0
           || (lp = C.strchr(s, ' ')) != 0)
        C.setChar(lp, 0, '_');

}

// Original inactive-platform annotations from this function.
/* avoid problems with 14 character file name limit */
/* leave room for .e from error and .Z from compress appended to
     * save files */
/* should never happen... */
/* leave room for .nn appended to level files */

/* UNIX */
export function util_strncmpi(s1, s2, sz)
{
    let t1, t2;

    while (sz-- !== 0n) {
        if (!C.char(s2))
            return (C.char(s1) != 0); /* s1 >= s2 */
        else if (!C.char(s1))
            return -1; /* s1  < s2 */
        t1 = C.lowc(C.char(s1++));
        t2 = C.lowc(C.char(s2++));
        if (t1 != t2)
            return (t1 > t2) ? 1 : -1;
    }
    return 0; /* s1 == s2 */
}

/* should be called with either EXIT_SUCCESS or EXIT_FAILURE */
export function nh_terminate(status)
{
    C.nethack_exit(status);
}

/* UNIX */
export function chdirx(dir, wr)
{
    if (dir) {
    } else {
        /* non-default data files is a sign that scores may not be
         * compatible, or perhaps that a binary not fitting this
         * system's layout is being used.
         */
    }

    if (dir == 0)
        dir = C.HACKDIR;

    if (dir && C.chdir(dir) < 0) {
        C.perror(dir);
        C.error("Cannot chdir to %s.", dir);
    }
}

// Original inactive-platform annotations from this function.
/* Ron Wessels */

/* CHDIR */
/* UNIX */
/*
 * Strip out troublesome file system characters.
 */
/* normalize file name */
/* WIN32 */
/* duplicated code from options.c */
/* most environment variables will eventually be printed in an error
 * message if they don't work, and most error message paths go through
 * BUFSZ buffers, which could be overflowed by a maliciously long
 * environment variable.  If a variable can legitimately be long, or
 * if it's put in a smaller buffer, the responsible code will have to
 * bounds-check itself.
 */
export function nh_getenv(ev)
{
    let getev = C.getenv(ev);

    if (getev && C.strlen(getev) <= (C.BUFSZ / 2))
        return getev;
    else
        return 0;
}


export function done1(sig_unused)
{
    C.signal(C.SIGINT, C.SIG_IGN);
    if (C.flags.ignintr) {
        C.signal(C.SIGINT, C.done1Pointer);
    }
}

/*
 * I hate having to duplicate this code here, but it is much simpler to
 * add these here than take steps to link with mkobj.c, do_name.c, priest.c,
 * vault.c, shknam.c, minion.c, dog.c, etc.
 */
/* allocate space for a monster's name; removes old name if there is one */
/* desired length (caller handles adding 1
                           for terminator) */
export function new_mgivenname(mon, lth)
{
    if (lth) {
        /* allocate mextra if necessary; otherwise get rid of old name */
        if (!mon.mextra)
            mon.mextra = newmextra();
        else
            free_mgivenname(mon); /* already has mextra, might also have name */
        mon.mextra.mgivenname = C.alloc(lth);
    } else {
        /* zero length: the new name is empty; get rid of the old name */
        if ((mon.mextra && mon.mextra.mgivenname))
            free_mgivenname(mon);
    }
}

/* release a monster's name; retains mextra even if all fields are now null */
export function free_mgivenname(mon)
{
    if ((mon.mextra && mon.mextra.mgivenname)) {
        C.free(mon.mextra.mgivenname);
        mon.mextra.mgivenname = 0;
    }
}


export function newegd(mtmp)
{
    if (!mtmp.mextra)
        mtmp.mextra = newmextra();
    if (!mtmp.mextra.egd) {
        mtmp.mextra.egd = C.egd(C.alloc(C.egdSize));
        C.memset(mtmp.mextra.egd, 0, C.egdSize);
    }
}


export function free_egd(mtmp)
{
    if (mtmp.mextra && mtmp.mextra.egd) {
        C.free(mtmp.mextra.egd);
        mtmp.mextra.egd = 0;
    }
    mtmp.isgd = 0;
}


export function newepri(mtmp)
{
    if (!mtmp.mextra)
        mtmp.mextra = newmextra();
    if (!mtmp.mextra.epri) {
        mtmp.mextra.epri = C.epri(C.alloc(C.epriSize));
        C.memset(mtmp.mextra.epri, 0, C.epriSize);
    }
}


export function free_epri(mtmp)
{
    if (mtmp.mextra && mtmp.mextra.epri) {
        C.free(mtmp.mextra.epri);
        mtmp.mextra.epri = 0;
    }
    mtmp.ispriest = 0;
}


export function neweshk(mtmp)
{
    if (!mtmp.mextra)
        mtmp.mextra = newmextra();
    if (!mtmp.mextra.eshk)
        mtmp.mextra.eshk = C.eshk(C.alloc(C.eshkSize));
    C.memset(mtmp.mextra.eshk, 0, C.eshkSize);
    mtmp.mextra.eshk.bill_p = 0;
}


export function free_eshk(mtmp)
{
    if (mtmp.mextra && mtmp.mextra.eshk) {
        C.free(mtmp.mextra.eshk);
        mtmp.mextra.eshk = 0;
    }
    mtmp.isshk = 0;
}


export function newemin(mtmp)
{
    if (!mtmp.mextra)
        mtmp.mextra = newmextra();
    if (!mtmp.mextra.emin) {
        mtmp.mextra.emin = C.emin(C.alloc(C.eminSize));
        C.memset(mtmp.mextra.emin, 0, C.eminSize);
    }
}


export function free_emin(mtmp)
{
    if (mtmp.mextra && mtmp.mextra.emin) {
        C.free(mtmp.mextra.emin);
        mtmp.mextra.emin = 0;
    }
    mtmp.isminion = 0;
}


export function newedog(mtmp)
{
    if (!mtmp.mextra)
        mtmp.mextra = newmextra();
    if (!mtmp.mextra.edog) {
        mtmp.mextra.edog = C.edog(C.alloc(C.edogSize));
        C.memset(mtmp.mextra.edog, 0, C.edogSize);
    }
}


export function free_edog(mtmp)
{
    if (mtmp.mextra && mtmp.mextra.edog) {
        C.free(mtmp.mextra.edog);
        mtmp.mextra.edog = 0;
    }
    mtmp.mtame = 0;
}


export function newebones(mtmp)
{
    if (!mtmp.mextra)
        mtmp.mextra = newmextra();
    if (!mtmp.mextra.ebones) {
        mtmp.mextra.ebones = C.ebones(C.alloc(C.ebonesSize));
        C.memset(mtmp.mextra.ebones, 0, C.ebonesSize);
    }
}


export function free_ebones(mtmp)
{
    if (mtmp.mextra && mtmp.mextra.ebones) {
        C.free(mtmp.mextra.ebones);
        mtmp.mextra.ebones = 0;
    }
}


export function init_mextra(mex)
{
    C.memset(mex, 0, C.mextraSize);
    mex.mcorpsenm = C.NON_PM;
}


export function newmextra()
{
    let mextra;

    mextra = C.mextra(C.alloc(C.mextraSize));
    init_mextra(mextra);
    return mextra;
}


export function newomonst(otmp)
{
    if (!otmp.oextra)
        otmp.oextra = newoextra();

    if (!otmp.oextra.omonst) {
        let m = C.newmonst();

        C.memset(m, 0, C.monsterSize);
        otmp.oextra.omonst = m;
    }
}


export function free_omonst(otmp)
{
    if (otmp.oextra) {
        let m = otmp.oextra.omonst;

        if (m) {
            if (m.mextra)
                dealloc_mextra(m);
            C.free(m);
            otmp.oextra.omonst = 0;
        }
    }
}


export function newomid(otmp)
{
    if (!otmp.oextra)
        otmp.oextra = newoextra();
    otmp.oextra.omid = 0;
}


export function free_omid(otmp)
{
    otmp.oextra.omid = 0;
}


export function new_omailcmd(otmp, response_cmd)
{
    if (!otmp.oextra)
        otmp.oextra = newoextra();
    if (otmp.oextra.omailcmd)
        free_omailcmd(otmp);
    otmp.oextra.omailcmd = C.dupstr(response_cmd);
}


export function free_omailcmd(otmp)
{
    if (otmp.oextra && otmp.oextra.omailcmd) {
        C.free(otmp.oextra.omailcmd);
        otmp.oextra.omailcmd = 0;
    }
}


export function init_oextra(oex)
{
    C.memset(oex, 0, C.oextraSize);
}


export function newoextra()
{
    let oextra;

    oextra = C.oextra(C.alloc(C.oextraSize));
    init_oextra(oextra);
    return oextra;
}


export function dealloc_mextra(m)
{
    let x = m.mextra;

    if (x) {
        if (x.mgivenname)
            C.free(x.mgivenname);
        if (x.egd)
            C.free(x.egd);
        if (x.epri)
            C.free(x.epri);
        if (x.eshk)
            C.free(x.eshk);
        if (x.emin)
            C.free(x.emin);
        if (x.edog)
            C.free(x.edog);
        if (x.ebones)
            C.free(x.ebones);
        /* [no action needed for x->mcorpsenm] */

        C.free(x);
        m.mextra = 0;
    }
}


export function dealloc_monst(mon)
{
    if (mon.mextra)
        dealloc_mextra(mon);
    C.free(mon);
}

/* allocate space for an object's name; removes old name if there is one */
/* desired length (caller handles adding 1
                      for terminator) */
export function new_oname(obj, lth)
{
    if (lth) {
        /* allocate oextra if necessary; otherwise get rid of old name */
        if (!obj.oextra)
            obj.oextra = newoextra();
        else
            free_oname(obj); /* already has oextra, might also have name */
        obj.oextra.oname = C.alloc(lth);
    } else {
        /* zero length: the new name is empty; get rid of the old name */
        if ((obj.oextra && obj.oextra.oname))
            free_oname(obj);
    }
}

/* release an object's name; retains oextra even if all fields are now null */
export function free_oname(obj)
{
    if ((obj.oextra && obj.oextra.oname)) {
        C.free(obj.oextra.oname);
        obj.oextra.oname = 0;
    }
}


export function length_without_val(user_string, len)
{
    let p = C.strchr(user_string, ':'), q = C.strchr(user_string, '=');

    if (!p || (q && q < p))
        p = q;
    if (p) {
        /* 'user_string' hasn't necessarily been through mungspaces()
           so might have tabs or consecutive spaces */
        while (p > user_string && C.isspace(C.char(p - 1) & 0xff))
            p--;
        len = (p - user_string);
    }
    return len;
}

/* check whether a user-supplied option string is a proper leading
   substring of a particular option name; option string might have
   a colon or equals sign and arbitrary value appended to it */
export function match_optname(user_string, optn_name, min_length, val_allowed)
{
    let len = C.strlen(user_string);

    if (val_allowed)
        len = length_without_val(user_string, len);

    return (len >= min_length
                      && !C.strncmpi(optn_name, user_string, len));
}


export function usage(argc, argv)
{
    let cp = argv[0], sep = 0;

    if ((sep = C.strrchr(cp, '/')) || (sep = C.strrchr(cp, '\\'))
        || (sep = C.strrchr(cp, ':')))
        cp = sep + 1;
    C.fprintf(C.stderr,
            "\nTo convert a savefile to export format:\n    %s %s %s\n", cp,
            "-c", "savefile");
    C.fprintf(C.stderr,
            "\nTo unconvert an exported savefile back into a savefile:\n    %s %s %s\n", cp,
            "-u", "savefile");
}

/* sfctool.c */
