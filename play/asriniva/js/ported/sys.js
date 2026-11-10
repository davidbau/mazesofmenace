/* NetHack 5.0	sys.c	$NHDT-Date: 1717449153 2024/06/03 21:12:33 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.64 $ */
/* Copyright (c) Kenneth Lorber, Kensington, Maryland, 2008. */
/* NetHack may be freely redistributed.  See license for details. */

import { C } from './c-runtime.js';

/* !SYSCF configurations need '#define DEBUGFILES "foo.c bar.c"'
 * to enable debugging feedback for source files foo.c and bar.c;
 * to activate debugpline(), set an appropriate value and uncomment
 */
/* # define DEBUGFILES "*" */

/* note: DEBUGFILES value here or in sysconf.DEBUGFILES can be overridden
   at runtime by setting up a value for "DEBUGFILES" in the environment */

/* JavaScript translation of sys.c: sysopt and gc are per-game C-backed
 * views; C supplies constants and flags from the compiled configuration.
 * Runtime branches preserve the original preprocessor alternatives without
 * changing which configured branch executes. Pointer values remain numeric
 * C addresses, and the livelog long value uses BigInt. The inactive attack
 * substitution remains commented out. All three function boundaries remain.
 */

export function sys_early_init()
{
    const sysopt = C.sysopt;
    let p;

    /* Don't assume that these are not already set, and that it is
     * safe to dupstr() without orphaning any pointers. Check them. */

    sysopt.support = 0;
    sysopt.recover = 0;
    if (C.SYSCF) {
        sysopt.wizards = 0;
    } else {
        if (sysopt.wizards)
            C.free(sysopt.wizards);
        sysopt.wizards = C.dupstr(C.WIZARD_NAME);
    }

    if ((p = C.getenv("DEBUGFILES")) != 0) {
        if (sysopt.debugfiles)
            C.free(sysopt.debugfiles);
        sysopt.debugfiles = C.dupstr(p);
        sysopt.env_dbgfl = 1; /* prevent sysconf processing from overriding */
    } else {
        if (C.SYSCF || !C.DEBUGFILES_DEFINED) {
            sysopt.debugfiles = 0;
        } else {
            if (sysopt.debugfiles)
                C.free(sysopt.debugfiles);
            sysopt.debugfiles = C.dupstr(C.DEBUGFILES);
        }
        sysopt.env_dbgfl = 0;
    }

    if (C.DUMPLOG)
        sysopt.dumplogfile = 0;
    sysopt.shellers = 0;
    sysopt.explorers = 0;
    sysopt.genericusers = 0;
    sysopt.msghandler = 0;
    sysopt.maxplayers = 0; /* XXX eventually replace MAX_NR_OF_PLAYERS */
    sysopt.bones_pools = 0;
    sysopt.livelog = C.LL_NONE;

    /* record file */
    sysopt.persmax = Math.max(C.PERSMAX, 1);
    sysopt.entrymax = Math.max(C.ENTRYMAX, 10);
    sysopt.pointsmin = Math.max(C.POINTSMIN, 1);
    sysopt.pers_is_uid = C.PERS_IS_UID;
    sysopt.tt_oname_maxrank = 10;

    /* sanity checks */
    if (sysopt.pers_is_uid != 0 && sysopt.pers_is_uid != 1)
        C.sysPanic();

    if (C.PANICTRACE) {
        /* panic options */
        if (sysopt.gdbpath)
            C.free(sysopt.gdbpath);
        sysopt.gdbpath = C.dupstr(C.GDBPATH);
        if (sysopt.greppath)
            C.free(sysopt.greppath);
        sysopt.greppath = C.dupstr(C.GREPPATH);
        if (C.NH_DEVEL_STATUS != C.NH_STATUS_RELEASED) {
            sysopt.panictrace_gdb = 1;
            if (C.PANICTRACE_LIBC)
                sysopt.panictrace_libc = 2;
        } else {
            sysopt.panictrace_gdb = 0;
            if (C.PANICTRACE_LIBC)
                sysopt.panictrace_libc = 0;
        }
    }
    sysopt.crashreporturl = 0;

    sysopt.check_save_uid = 1;
    sysopt.check_plname = 0;
    sysopt.seduce = 1; /* if it's compiled in, default to on */
    sysopt_seduce_set(sysopt.seduce);
    sysopt.saveformat[0] = sysopt.bonesformat[0] = C.historical;
    sysopt.accessibility = 0;
    if (C.WIN32)
        sysopt.portable_device_paths = 0;

    /* help menu */
    sysopt.hideusage = 0;

    return;
}

export function sysopt_release()
{
    const sysopt = C.sysopt;
    const gc = C.gc;

    if (sysopt.support)
        C.free(sysopt.support), sysopt.support = 0;
    if (sysopt.recover)
        C.free(sysopt.recover), sysopt.recover = 0;
    if (sysopt.wizards)
        C.free(sysopt.wizards), sysopt.wizards = 0;
    if (sysopt.explorers)
        C.free(sysopt.explorers), sysopt.explorers = 0;
    if (sysopt.shellers)
        C.free(sysopt.shellers), sysopt.shellers = 0;
    if (sysopt.debugfiles)
        C.free(sysopt.debugfiles),
        sysopt.debugfiles = 0;
    sysopt.env_dbgfl = 0;
    if (sysopt.msghandler)
        C.free(sysopt.msghandler), sysopt.msghandler = 0;
    if (C.DUMPLOG) {
        if (sysopt.dumplogfile)
            C.free(sysopt.dumplogfile), sysopt.dumplogfile = 0;
    }
    if (sysopt.genericusers)
        C.free(sysopt.genericusers),
            sysopt.genericusers = 0;
    if (sysopt.gdbpath)
        C.free(sysopt.gdbpath), sysopt.gdbpath = 0;
    if (sysopt.greppath)
        C.free(sysopt.greppath), sysopt.greppath = 0;

    if (C.CRASHREPORT) {
        if (gc.crash_email)
            C.free(gc.crash_email), gc.crash_email = 0;
        if (gc.crash_name)
            C.free(gc.crash_name), gc.crash_name = 0;
    }

    /* this one's last because it might be used in panic feedback, although
       none of the preceding ones are likely to trigger a controlled panic */
    if (sysopt.fmtd_wizard_list)
        C.free(sysopt.fmtd_wizard_list),
            sysopt.fmtd_wizard_list = 0;
    return;
}

export function sysopt_seduce_set(val)
{
/*
 * Attack substitution is now done on the fly in getmattk(mhitu.c).
 */
/* Disabled #if 0 implementation from the original source:
    struct attack *setval = val ? c_sa_yes : c_sa_no;
    int x;

    for (x = 0; x < NATTK; x++) {
        mons[PM_INCUBUS].mattk[x] = setval[x];
        mons[PM_SUCCUBUS].mattk[x] = setval[x];
    }
*/
    return;
}

/*sys.c*/
