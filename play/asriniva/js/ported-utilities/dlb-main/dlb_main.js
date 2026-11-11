/* NetHack 5.0	dlb_main.c	$NHDT-Date: 1706213798 2024/01/25 20:16:38 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.27 $ */
/* Copyright (c) Kenneth Lorber, Bethesda, Maryland, 1993. */
/* NetHack may be freely redistributed.  See license for details. */
import { C } from "./scope.mjs";

const DLB_DIRECTORY = "Directory", DLB_FILES_ALLOC = 200, DLB_VERS = 1, ENC_NORMAL = 110;



/* data librarian; only useful if you are making the library version, DLBLIB
 */
export function usage() {
    C.printf("Usage: %s [ctxCIfv] arguments... [files...]\n", C.state.progname);
    C.printf("  default library is %s\n", C.state.library_file);
    C.printf("  default list file is %s\n", C.state.list_file);
    xexit(C.EXIT_FAILURE);
    /*NOTREACHED*/
}

export function verbose_help() {
    const long_help = [ "", "dlb COMMANDoptions args... files...", "  commands:", "    dlb ?   print this text", "    dlb h   ditto", "    dlb x   extract all files", "    dlb c   create the archive", "    dlb t   list table of contents", "  options:", "    v       verbose operation", "    f file  specify archive file name", "    I file  specify file for list of file names", "    C dir   change directory before processing any files", "", 0 ];
    let str;
    for (str = 0; long_help[str] !== 0; str++) C.printf("%s\n", long_help[str]);
    usage();
    /*NOTREACHED*/
}

export function Write(out, buf, len) {
    if (C.write(out, buf, len) !== len) {
        C.printf("Write Error in '%s'\n", C.state.library_file);
        xexit(C.EXIT_FAILURE);
    }
}

/* open_library(dlb.c) needs this (which normally comes from src/files.c) */
export function fopen_datafile(filename, mode, prefix) {
    return C.fopen(filename, mode);
}

export function main(argc, argv) {
    let i, r;
    let ap = 2;
    let cp;
    let iseen = 0, fseen = 0, verbose = 0;
    let action = ' '.charCodeAt(0);
    let lib = C.library(C.local(C.librarySize));
    if (argc > 0) C.state.progname = argv[0];
    if (!C.state.progname || !C.char(C.state.progname)) C.state.progname = C.state.default_progname;
    if (argc < 2) {
        usage();
 /* doesn't return */
 }
    for (cp = 0; C.char(argv[1] + cp); cp++) {
        switch (C.char(argv[1] + cp)) {
          default:
            usage();
 /* doesn't return */
 /*NOTREACHED*/            break;

          case '-'.charCodeAt(0):
            /* silently ignore */
            break;

          case '?'.charCodeAt(0):
          case 'h'.charCodeAt(0):
            verbose_help();
 /*NOTREACHED*/
 break;

          case 'I'.charCodeAt(0):
            if (ap === argc) usage();
            C.state.list_file = argv[ap++];
            if (iseen) C.printf("Warning: multiple I options.  Previous ignored.\n");
            iseen = 1;
            break;

          case 'f'.charCodeAt(0):
            if (ap === argc) usage();
            C.state.library_file = argv[ap++];
            if (fseen) C.printf("Warning: multiple f options.  Previous ignored.\n");
            fseen = 1;
            break;

          case 'C'.charCodeAt(0):
            if (ap === argc) usage();
            if (C.chdir(argv[ap++])) {
                C.printf("Can't chdir to %s\n", argv[--ap]);
                xexit(C.EXIT_FAILURE);
            }
            break;

          case 'v'.charCodeAt(0):
            verbose = 1;
            break;

          case 't'.charCodeAt(0):
          case 'c'.charCodeAt(0):
          case 'x'.charCodeAt(0):
            if (action !== ' '.charCodeAt(0)) {
                C.printf("Only one of t,x,c may be specified.\n");
                usage();
            }
            action = C.char(argv[1] + cp);
            break;
        }
    }
    if (argv[ap] && iseen) {
        C.printf("Too many arguments.\n");
        xexit(C.EXIT_FAILURE);
    }
    switch (action) {
      default:
        C.printf("Internal error - action.\n");
        xexit(C.EXIT_FAILURE);
 /*NOTREACHED*/
 break;

      case 't'.charCodeAt(0):
        /* list archive */
        if (!C.open_library(C.state.library_file, lib)) {
            C.printf("Can't open dlb file\n");
            xexit(C.EXIT_FAILURE);
        }
        for (i = 0; BigInt(i) < lib.nentries; i++) {
            if (verbose) C.printf("%-14s %6ld %6ld\n", lib.dir[i].fname, lib.dir[i].foffset, lib.dir[i].fsize); else C.printf("%s\n", lib.dir[i].fname);
        }
        if (verbose) C.printf("Revision:%ld  File count:%ld  String size:%ld\n", lib.rev, lib.nentries, lib.strsize);
        C.close_library(lib);
        /* xexit(EXIT_SUCCESS); */
        break;

      case 'x'.charCodeAt(0):
        {
            /* extract archive contents */
            let f, n;
            let remainder, total_read;
            let buf = C.local(C.BUFSIZ);
            if (!C.open_library(C.state.library_file, lib)) {
                C.printf("Can't open dlb file\n");
                xexit(C.EXIT_FAILURE);
            }
            for (i = 0; BigInt(i) < lib.nentries; i++) {
                if (argv[ap]) {
                    /* if files are listed, see if current is wanted */
                    let c;
                    for (c = ap; c < argc; c++) if (!C.FILENAME_CMP(lib.dir[i].fname, argv[c])) break;
                    if (c === argc) continue;
 /* skip */
 } else if (!C.FILENAME_CMP(lib.dir[i].fname, DLB_DIRECTORY)) {
                    /*
                 * Don't extract the directory unless the user
                 * specifically asks for it.
                 *
                 * Perhaps we should never extract the directory???
                 */
                    continue;
                }
                C.fseek(lib.fdata, lib.dir[i].foffset, C.SEEK_SET);
                f = C.open(lib.dir[i].fname, C.O_WRONLY | C.O_TRUNC | C.O_BINARY | C.O_CREAT, 416);
                if (f < 0) {
                    C.printf("Can't create '%s'\n", lib.dir[i].fname);
                    xexit(C.EXIT_FAILURE);
                }
                /* read chunks from library and write them out */
                total_read = 0n;
                do {
                    remainder = C.long(lib.dir[i].fsize - total_read);
                    if (remainder > BigInt(C.BUFSIZ)) r = C.BUFSIZ; else r = C.int(remainder);
                    n = C.int(C.fread(buf, 1, r, lib.fdata));
                    if (n !== r) {
                        C.printf("Read Error in '%s'\n", lib.dir[i].fname);
                        xexit(C.EXIT_FAILURE);
                    }
                    if (C.write(f, buf, n) !== BigInt(n)) {
                        C.printf("Write Error in '%s'\n", lib.dir[i].fname);
                        xexit(C.EXIT_FAILURE);
                    }
                    total_read = C.long(total_read + BigInt(n));
                } while (total_read !== lib.dir[i].fsize);
                C.close(f);
                if (verbose) C.printf("x %s\n", lib.dir[i].fname);
            }
            C.close_library(lib);
            /* xexit(EXIT_SUCCESS); */
            break;
        }

      case 'c'.charCodeAt(0):
        /* create archive */
        {
            let ld = C.pointerLocal(0);
            let ldlimit = C.intLocal(0);
            let buf = C.local(C.BUFSIZ);
            let fd, out, nfiles = 0;
            let dir_size, slen, flen, fsiz;
            let rewrite_directory = 0;
            /*
         * Get names from either/both an argv list and a file
         * list.  This does not do any duplicate checking
         */
         grow_ld(ld, ldlimit, DLB_FILES_ALLOC);
            /* get file name in argv list */
            if (argv[ap]) {
                for (;ap < argc; ap++, nfiles++) {
                    if (nfiles === ldlimit.value) grow_ld(ld, ldlimit, DLB_FILES_ALLOC / 5);
                    C.libdir(ld.value, nfiles).fname = C.dupstr(argv[ap]);
                }
            }
            if (iseen) {
                /* want to do a list file */
                let list = C.fopen(C.state.list_file, "r");
                if (!list) {
                    C.printf("Can't open %s\n", C.state.list_file);
                    xexit(C.EXIT_FAILURE);
                }
                /* get file names, one per line */
                for (;C.fgets(buf, C.BUFSIZ, list); nfiles++) {
                    if (nfiles === ldlimit.value) grow_ld(ld, ldlimit, DLB_FILES_ALLOC / 5);
                    C.setChar(C.eos(buf) - 1, 0);
 /* strip newline */
 C.libdir(ld.value, nfiles).fname = C.dupstr(buf);
                }
                C.fclose(list);
            }
            if (nfiles === 0) {
                C.printf("No files to archive\n");
                xexit(C.EXIT_FAILURE);
            }
            /*
         * Get file sizes and name string length.  Don't include
         * the directory information yet.
         */
         for (i = 0, slen = 0n, flen = 0n; i < nfiles; i++) {
                fd = C.open(C.libdir(ld.value, i).fname, C.O_RDONLY | C.O_BINARY, 0);
                if (fd < 0) {
                    C.printf("Can't open %s\n", C.libdir(ld.value, i).fname);
                    xexit(C.EXIT_FAILURE);
                }
                C.libdir(ld.value, i).fsize = C.lseek(fd, 0n, C.SEEK_END);
                C.libdir(ld.value, i).foffset = flen;
                slen = C.long(slen + C.strlen(C.libdir(ld.value, i).fname));
 /* don't add null (yet) */
 flen = C.long(flen + C.libdir(ld.value, i).fsize);
                C.close(fd);
            }
            /* open output file */
            out = C.open(C.state.library_file, C.O_RDWR | C.O_TRUNC | C.O_BINARY | C.O_CREAT, C.FCMASK);
            if (out < 0) {
                C.printf("Can't open %s for output\n", C.state.library_file);
                xexit(C.EXIT_FAILURE);
            }
            /* calculate directory size */
            dir_size = C.long(40n + BigInt(C.int((nfiles + 1) * 11)) + slen + C.strlen(DLB_DIRECTORY));
            /* write directory */
            write_dlb_directory(out, nfiles, C.libdirArray(ld.value), slen, dir_size, flen);
            flen = 0n;
            /* write each file */
            for (i = 0; i < nfiles; i++) {
                fd = C.open(C.libdir(ld.value, i).fname, C.O_RDONLY | C.O_BINARY, 0);
                if (fd < 0) {
                    C.printf("Can't open input file '%s'\n", C.libdir(ld.value, i).fname);
                    xexit(C.EXIT_FAILURE);
                }
                if (verbose) C.printf("%s\n", C.libdir(ld.value, i).fname);
                fsiz = 0n;
                while ((r = C.int(C.read(fd, buf, C.BUFSIZ))) !== 0) {
                    if (r === -1) {
                        C.printf("Read Error in '%s'\n", C.libdir(ld.value, i).fname);
                        xexit(C.EXIT_FAILURE);
                    }
                    if (C.write(out, buf, r) !== BigInt(r)) {
                        C.printf("Write Error in '%s'\n", C.libdir(ld.value, i).fname);
                        xexit(C.EXIT_FAILURE);
                    }
                    fsiz = C.long(fsiz + BigInt(r));
                }
                C.close(fd);
                if (fsiz !== C.libdir(ld.value, i).fsize) rewrite_directory = 1;
                /* in case directory rewrite is needed */
                C.libdir(ld.value, i).fsize = fsiz;
                C.libdir(ld.value, i).foffset = flen;
                flen = C.long(flen + fsiz);
            }
            if (rewrite_directory) {
                if (verbose) C.printf("(rewriting dlb directory info)\n");
                C.lseek(out, 0n, C.SEEK_SET);
 /* rewind */
 write_dlb_directory(out, nfiles, C.libdirArray(ld.value), slen, dir_size, flen);
            }
            for (i = 0; i < nfiles; i++) {
                C.free(C.libdir(ld.value, i).fname);
                C.libdir(ld.value, i).fname = 0;
            }
            C.free(ld.value);
            ldlimit.value = 0;
            C.close(out);
            /* xexit(EXIT_SUCCESS); */
            break;
        }
 /* case 'c' */
 }
 /* switch */
 xexit(C.EXIT_SUCCESS);
    /*NOTREACHED*/
    return 0;
}

export function grow_ld(ld_p, ldlimit_p, alloc_incr) {
    let i = 0, newlimit = C.int(ldlimit_p.value + alloc_incr);
    let newld = C.alloc(BigInt(newlimit) * BigInt(C.libdirSize));
    if (ld_p.value) {
        for (;i < ldlimit_p.value; ++i) C.copy(newld + i * C.libdirSize, ld_p.value + i * C.libdirSize, C.libdirSize);
        C.free(ld_p.value);
    }
    ld_p.value = newld;
    ldlimit_p.value = newlimit;
    for (;i < ldlimit_p.value; ++i) C.copy(ld_p.value + i * C.libdirSize, C.zerolibdir, C.libdirSize);
}

export function write_dlb_directory(out, nfiles, ld, slen, dir_size, flen) {
    let buf = C.local(C.BUFSIZ);
    let i;
    C.sprintfHeader(buf, "%3ld %8ld %8ld %8ld %8ld\n", BigInt(DLB_VERS), BigInt(nfiles) + 1n, C.long(slen + C.strlen(DLB_DIRECTORY) + BigInt(nfiles) + 1n), dir_size, C.long(flen + dir_size));
    Write(out, buf, C.strlen(buf));
    /* write each file entry */
    C.sprintfEntry(buf, "%c%s %8ld\n", ENC_NORMAL, DLB_DIRECTORY, 0n);
    Write(out, buf, C.strlen(buf));
    for (i = 0; i < nfiles; i++) {
        C.sprintfEntry(buf, "%c%s %8ld\n", ENC_NORMAL, ld[i].fname, C.long(ld[i].foffset + dir_size));
        Write(out, buf, C.strlen(buf));
    }
}

export function xexit(retcd) {
    C.exit(retcd);
 /*NOTREACHED*/
 }
// Original preprocessor/inactive-platform annotations retained verbatim.
/* name of lib directory */
/* default list file */
/* library functions (from dlb.c) */
/* fixed library and list file names - can be overridden if necessary */
/* initial # of files we'll handle; can grow */
/* version of dlb file we will write */
/*
 * How the file is encoded within the library.  Don't use a space
 * because (at least) the  SunOS 4.1.3 C library will eat the white
 * space instead of preserving it like the man page says it should.
 */
/* normal: not compressed in any way */
/*
 * If you know tar, you have a small clue how to use this (note: - does
 * NOT mean stdin/stdout).
 *
 * dlb COMMANDoptions arg... files...
 * commands:
 *  dlb x       extract all files
 *  dlb c       build the archive
 *  dlb t       list the archive
 * options:
 *  v           verbose
 *  f file      specify archive file (default DLBFILE)
 *  I file      specify file for list of files (default LIBLISTFILE)
 *  C dir       chdir to dir (used ONCE, not like tar's -C)
 */
/* DLBLIB */
/* DLB */
/*empty*/
/* argument pointer */
/* command pointer */
/* flags */
/* header line (see below) */
/* handling+file offset+SP+newline */
/* file names */
/* DLBLIB */
/* DLB */
/* version of dlb file */
/* # of entries (includes directory) */
/* string length + room for nulls */
/* start of first file */
/* total file size */
/* encoding */
/* name */
/* offset */
/* DLBLIB */
/* DLB */
/*dlb_main.c*/
