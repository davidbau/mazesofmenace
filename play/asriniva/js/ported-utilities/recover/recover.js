/* NetHack 5.0	recover.c	$NHDT-Date: 1687547437 2023/06/23 19:10:37 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.33 $ */
/* Copyright (c) Janet Walz, 1992.                                */
/* NetHack may be freely redistributed.  See license for details. */
/*
 *  Utility for reconstructing NetHack save file from a set of individual
 *  level files.  Requires that the `checkpoint' option be enabled at the
 *  time NetHack creates those level files.
 */
import { C } from "./scope.mjs";

export function main(argc, argv) {
    let argno;
    let dir = 0, progname = 0;
    if (!dir)
        dir = C.getenv("NETHACKDIR");
    if (!dir)
        dir = C.getenv("HACKDIR");
    if (argc > 0)
        progname = argv[0];
    if (!progname || !C.char(progname))
        progname = C.literal("recover");
    if (argc < 2 || argc === 2 && !C.strcmp(argv[1], "-")) {
        C.Fprintf("Usage: %s [ -d directory ] base1 [ base2 ... ]\n", progname);
        C.exit(C.EXIT_FAILURE);
    }
    argno = 1;
    if (!C.strncmp(argv[argno], "-d", 2)) {
        dir = argv[argno] + 2;
        if (C.char(dir) === 61 || C.char(dir) === 58)
            dir++;
        if (!C.char(dir) && argc > argno) {
            argno++;
            dir = argv[argno];
        }
        if (!C.char(dir)) {
            C.Fprintf("%s: flag -d must be followed by a directory name.\n", argv[0]);
            C.exit(C.EXIT_FAILURE);
        }
        argno++;
    }
    if (!dir)
        dir = C.HACKDIR;
    if (dir && C.chdir(dir) < 0) {
        C.Fprintf("%s: cannot chdir to %s.\n", argv[0], dir);
        C.exit(C.EXIT_FAILURE);
    }
    while (argc > argno) {
        if (restore_savefile(argv[argno]) === 0)
            C.Fprintf('recovered "%s" to %s\n', argv[argno], C.savename);
        argno++;
    }
    C.exit(C.EXIT_SUCCESS);
    /*NOTREACHED*/
    return 0;
}

export function set_levelfile_name(lev) {
    let tf;
    tf = C.strrchr(C.lock, 46);
    if (!tf)
        tf = C.lock + C.strlen(C.lock);
    C.sprintf(tf, ".%d", lev);
}

export function open_levelfile(lev) {
    let fd;
    set_levelfile_name(lev);
    fd = C.open(C.lock, C.O_RDONLY, 0);
    return fd;
}

export function create_savefile() {
    let fd;
    fd = C.creat(C.savename, C.FCMASK);
    return fd;
}

export function restore_savefile(basename) {
    let gfd, lfd, sfd;
    let res = 0, lev, savelev = C.local(C.intSize), hpid = C.local(C.intSize), pltmpsiz = C.local(C.intSize);
    let levc = C.local(1);
    let version_data = C.local(C.versionSize);
    let plbuf = C.local(C.PL_NSIZ_PLUS), indicator = C.local(1), cscsize = C.local(1);
    /* level 0 file contains:
     *  pid of creating process (ignored here)
     *  level number for current level of save file
     *  name of save file nethack would have created
     *  player name
     *  and game state
     */
     C.strcpy(C.lock, basename);
    gfd = open_levelfile(0);
    if (gfd < 0) {
        C.Fprintf("Cannot open level 0 for %s.\n", basename);
        return -1;
    }
    if (C.read(gfd, hpid, C.intSize) !== BigInt(C.intSize)) {
        C.Fprintf("%s\n%s%s%s\n", "Checkpoint data incompletely written or subsequently clobbered;", 'recovery for "', basename, '" impossible.');
        C.close(gfd);
        return -1;
    }
    if (C.read(gfd, savelev, C.intSize) !== BigInt(C.intSize)) {
        C.Fprintf("Checkpointing was not in effect for %s -- recovery impossible.\n", basename);
        C.close(gfd);
        return -1;
    }
    if (C.read(gfd, C.savename, C.SAVESIZE) !== BigInt(C.SAVESIZE)
        || C.read(gfd, indicator, 1) !== 1n
        || C.read(gfd, cscsize, 1) !== 1n
        || C.read(gfd, C.cscbuf, C.schar(cscsize)) !== BigInt(C.schar(cscsize))
        || C.read(gfd, version_data, C.versionSize) !== BigInt(C.versionSize)
        || C.read(gfd, pltmpsiz, C.intSize) !== BigInt(C.intSize)
        || C.int(pltmpsiz) > C.PL_NSIZ_PLUS
        || C.read(gfd, plbuf, C.int(pltmpsiz)) !== BigInt(C.int(pltmpsiz))) {
        C.Fprintf("Error reading %s -- can't recover.\n", C.lock);
        C.close(gfd);
        return -1;
    }
    /* save file should contain:
     *  format indicator (1 byte)
     *  n = count of critical size list (1 byte)
     *  n bytes of critical sizes (n bytes)
     *  version info
     *  plnametmp = player name size (int, 2 bytes)
     *  player name (PL_NSIZ_PLUS)
     *  current level (including pets)
     *  (non-level-based) game state
     *  other levels
     */
     sfd = create_savefile();
    if (sfd < 0) {
        C.Fprintf("Cannot create savefile %s.\n", C.savename);
        C.close(gfd);
        return -1;
    }
    lfd = open_levelfile(C.int(savelev));
    if (lfd < 0) {
        C.Fprintf("Cannot open level of save for %s.\n", basename);
        C.close(gfd);
        C.close(sfd);
        return -1;
    }
    if (C.write(sfd, indicator, 1) !== 1n) {
        C.Fprintf("Error writing %s %s; recovery failed.\n", C.savename, "indicator");
        C.close(gfd);
        C.close(sfd);
        C.close(lfd);
        return -1;
    }
    if (C.write(sfd, cscsize, 1) !== 1n) {
        C.Fprintf("Error writing %s %s; recovery failed.\n", C.savename, "cscsize");
        C.close(gfd);
        C.close(sfd);
        C.close(lfd);
        return -1;
    }
    if (C.write(sfd, C.cscbuf, C.schar(cscsize)) !== BigInt(C.schar(cscsize))) {
        C.Fprintf("Error writing %s %s; recovery failed.\n", C.savename, "critical bytes");
        C.close(gfd);
        C.close(sfd);
        C.close(lfd);
        return -1;
    }
    if (C.write(sfd, version_data, C.versionSize) !== BigInt(C.versionSize)) {
        C.Fprintf("Error writing %s %s; recovery failed.\n", C.savename, "version_data");
        C.close(gfd);
        C.close(sfd);
        C.close(lfd);
        return -1;
    }
    if (C.write(sfd, pltmpsiz, C.intSize) !== BigInt(C.intSize)) {
        C.Fprintf("Error writing %s; recovery failed (player name size).\n", C.savename);
        C.close(gfd);
        C.close(sfd);
        C.close(lfd);
        return -1;
    }
    C.assert(C.int(pltmpsiz) >= 0 && C.int(pltmpsiz) <= C.PL_NSIZ_PLUS);
    if (C.write(sfd, plbuf, C.int(pltmpsiz)) !== BigInt(C.int(pltmpsiz))) {
        C.Fprintf("Error writing %s; recovery failed (player name).\n", C.savename);
        C.close(gfd);
        C.close(sfd);
        C.close(lfd);
        return -1;
    }
    if (!C.copy_bytes(lfd, sfd)) {
        C.Fprintf("file copy failed!\n");
        C.exit(C.EXIT_FAILURE);
    }
    C.close(lfd);
    C.unlink(C.lock);
    if (!C.copy_bytes(gfd, sfd)) {
        C.Fprintf("file copy failed!\n");
        C.exit(C.EXIT_FAILURE);
    }
    C.close(gfd);
    set_levelfile_name(0);
    C.unlink(C.lock);
    for (lev = 1; lev < 256 && res === 0; lev++) {
        /* level numbers are kept in 'xint8's in save.c, so the
         * maximum level number (for the endlevel) must be < 256
         */
        if (lev !== C.int(savelev)) {
            lfd = open_levelfile(lev);
            if (lfd >= 0) {
                /* any or all of these may not exist */
                C.setSchar(levc, lev);
                if (C.write(sfd, levc, 1) !== 1n) {
                    res = -1;
                } else {
                    if (!C.copy_bytes(lfd, sfd)) {
                        C.Fprintf("file copy failed!\n");
                        C.exit(C.EXIT_FAILURE);
                    }
                }
                C.close(lfd);
                C.unlink(C.lock);
            }
        }
    }
    C.close(sfd);
    return res;
}
// Original excluded-platform/preprocessor annotations, retained verbatim.

/* VMS */
/* copy_bytes() has been moved to hacklib */
/* SAVESIZE is defined in "fnamesiz.h" */
/* holds relative path of save file from playground */
/*progname = vms_basebame(progname, FALSE);*/
/* needs vmsfiles.obj */
/* SECURE && !VMS */
/* OBSOLETE, HackWB is no longer in use */
/* we need to create an icon for the saved game
         * or HackWB won't notice the file.
         */
/*AMIGA*/
/* EXEPATH */
/*recover.c*/
