// @ts-nocheck
// sys.js — System option release.
// C ref: nethack-c/src/sys.c:sysopt_release()
import { game } from './gstate.js';

export function sysopt_release() {
    // Initialize sysopt if needed (mirrors C's sysopt struct)
    if (!game.sysopt) {
        game.sysopt = {};
    }

    // Free and null out sysopt fields (C: lines 117-143)
    if (game.sysopt.support) {
        game.sysopt.support = null;
    }
    if (game.sysopt.recover) {
        game.sysopt.recover = null;
    }
    if (game.sysopt.wizards) {
        game.sysopt.wizards = null;
    }
    if (game.sysopt.explorers) {
        game.sysopt.explorers = null;
    }
    if (game.sysopt.shellers) {
        game.sysopt.shellers = null;
    }
    if (game.sysopt.debugfiles) {
        game.sysopt.debugfiles = null;
    }
    game.sysopt.env_dbgfl = 0;
    if (game.sysopt.msghandler) {
        game.sysopt.msghandler = null;
    }
    // DUMPLOG ifdef branch (C: lines 133-135)
    if (game.sysopt.dumplogfile) {
        game.sysopt.dumplogfile = null;
    }
    if (game.sysopt.genericusers) {
        game.sysopt.genericusers = null;
    }
    if (game.sysopt.gdbpath) {
        game.sysopt.gdbpath = null;
    }
    if (game.sysopt.greppath) {
        game.sysopt.greppath = null;
    }

    // CRASHREPORT ifdef branch (C: lines 145-150)
    if (game.gc && game.gc.crash_email) {
        game.gc.crash_email = null;
    }
    if (game.gc && game.gc.crash_name) {
        game.gc.crash_name = null;
    }

    // Last: fmtd_wizard_list (C: lines 154-156)
    if (game.sysopt.fmtd_wizard_list) {
        game.sysopt.fmtd_wizard_list = null;
    }
}

export function sys_early_init() {
    // Initialize sysopt if needed
    if (!game.sysopt) {
        game.sysopt = {};
    }

    // sysopt.support = (char *)0;
    game.sysopt.support = null;
    // sysopt.recover = (char *)0;
    game.sysopt.recover = null;

    // #ifdef SYSCF
    game.sysopt.wizards = null;
    // (skipping #else branch with dupstr(WIZARD_NAME))

    // getenv("DEBUGFILES") check — assume null (not set)
    {
        // #if defined(SYSCF) || !defined(DEBUGFILES)
        game.sysopt.debugfiles = null;
        game.sysopt.env_dbgfl = 0;
    }

    // #ifdef DUMPLOG
    game.sysopt.dumplogfile = null;

    game.sysopt.shellers = null;
    game.sysopt.explorers = null;
    game.sysopt.genericusers = null;
    game.sysopt.msghandler = null;
    game.sysopt.maxplayers = 0;
    game.sysopt.bones_pools = 0;
    game.sysopt.livelog = 0; // LL_NONE

    // record file
    /* C config.h:333-346 — PERSMAX 3, POINTSMIN 1, ENTRYMAX 100, and
     * PERS_IS_UID 1 on anything that is not MICRO/MACOS9/WIN32.  The four
     * values here were 10/10/1/0, none of which is 5.0's. */
    game.sysopt.persmax = Math.max(3, 1); // PERSMAX=3
    game.sysopt.entrymax = Math.max(100, 10); // ENTRYMAX=100
    game.sysopt.pointsmin = Math.max(1, 1); // POINTSMIN=1
    game.sysopt.pers_is_uid = 1; // PERS_IS_UID
    game.sysopt.tt_oname_maxrank = 10;

    // sanity checks
    if (game.sysopt.pers_is_uid !== 0 && game.sysopt.pers_is_uid !== 1)
        throw new Error("config error: PERS_IS_UID must be either 0 or 1");

    // #ifdef PANICTRACE
    {
        if (game.sysopt.gdbpath)
            game.sysopt.gdbpath = null; // free
        game.sysopt.gdbpath = dupstr(""); // GDBPATH
        if (game.sysopt.greppath)
            game.sysopt.greppath = null; // free
        game.sysopt.greppath = dupstr(""); // GREPPATH
        // NH_DEVEL_STATUS == NH_STATUS_RELEASED
        game.sysopt.panictrace_gdb = 0;
        // #ifdef PANICTRACE_LIBC — not defined
    }

    game.sysopt.crashreporturl = null;

    game.sysopt.check_save_uid = 1;
    game.sysopt.check_plname = 0;
    game.sysopt.seduce = 1;
    sysopt_seduce_set(game.sysopt.seduce);
    // saveformat[0] = bonesformat[0] = historical
    game.sysopt.saveformat = [0];
    game.sysopt.bonesformat = [0];
    game.sysopt.accessibility = 0;
    // #ifdef WIN32 — not defined

    // help menu
    game.sysopt.hideusage = 0;

    return;
}

// Stubs for unported helpers
function dupstr(s) { return s; }
function sysopt_seduce_set(val) { /* no-op in current C code */ }
