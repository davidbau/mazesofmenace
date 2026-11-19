// @ts-nocheck
// sys.js — System option initialization and release.
// C ref: nethack-c-v5/upstream/src/sys.c
import { dupstr } from './alloc.js';
import { game } from './gstate.js';
import { LL_NONE, PERSMAX, POINTSMIN, ENTRYMAX, PERS_IS_UID } from './const.js';
import { SAVEFORMATS } from './sfbase.js';
import { ENV } from './hostenv.js';

export function sysopt_release() {
    // Initialize sysopt if needed (mirrors C's global struct sysopt_s sysopt)
    if (!game.sysopt) {
        game.sysopt = {};
    }

    // Free and null out sysopt fields (C: sys.c:117-143)
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
    if (game.sysopt.genericusers) {
        game.sysopt.genericusers = null;
    }
    if (game.sysopt.gdbpath) {
        game.sysopt.gdbpath = null;
    }
    if (game.sysopt.greppath) {
        game.sysopt.greppath = null;
    }

    // CRASHREPORT ifdef branch (C: sys.c:145-150)
    if (game.gc && game.gc.crash_email) {
        game.gc.crash_email = null;
    }
    if (game.gc && game.gc.crash_name) {
        game.gc.crash_name = null;
    }

    // Last: fmtd_wizard_list (C: sys.c:154-156)
    if (game.sysopt.fmtd_wizard_list) {
        game.sysopt.fmtd_wizard_list = null;
    }
}

export function sys_early_init() {
    // Initialize sysopt if needed (mirrors C's global struct sysopt_s sysopt)
    if (!game.sysopt) {
        game.sysopt = {};
    }

    // sysopt.support = (char *)0; sysopt.recover = (char *)0; (sys.c:28-29)
    game.sysopt.support = null;
    game.sysopt.recover = null;

    // #ifdef SYSCF (sys.c:30-31)
    game.sysopt.wizards = null;

    // C sys.c:38-52: getenv("DEBUGFILES")
    const p = ENV.DEBUGFILES;
    if (p != null) {
        if (game.sysopt.debugfiles)
            game.sysopt.debugfiles = null;
        game.sysopt.debugfiles = dupstr(p);
        game.sysopt.env_dbgfl = 1; // prevent sysconf processing from overriding
    } else {
        // #if defined(SYSCF) || !defined(DEBUGFILES)
        game.sysopt.debugfiles = null;
        game.sysopt.env_dbgfl = 0;
    }


    game.sysopt.shellers = null;
    game.sysopt.explorers = null;
    game.sysopt.genericusers = null;
    game.sysopt.msghandler = null;
    game.sysopt.maxplayers = 0;
    game.sysopt.bones_pools = 0;
    game.sysopt.livelog = LL_NONE;

    // record file (sys.c:66-70; config.h:333-346)
    game.sysopt.persmax = Math.max(PERSMAX, 1);
    game.sysopt.entrymax = Math.max(ENTRYMAX, 10);
    game.sysopt.pointsmin = Math.max(POINTSMIN, 1);
    game.sysopt.pers_is_uid = PERS_IS_UID;
    game.sysopt.tt_oname_maxrank = 10;

    // sanity checks (sys.c:73-74)
    if (game.sysopt.pers_is_uid !== 0 && game.sysopt.pers_is_uid !== 1)
        throw new Error("config error: PERS_IS_UID must be either 0 or 1");

    // #ifdef PANICTRACE (sys.c:76-95; config.h:238,241; global.h:448-452)
    {
        if (game.sysopt.gdbpath)
            game.sysopt.gdbpath = null; // free
        game.sysopt.gdbpath = dupstr("/usr/bin/gdb"); // GDBPATH
        if (game.sysopt.greppath)
            game.sysopt.greppath = null; // free
        game.sysopt.greppath = dupstr("/bin/grep"); // GREPPATH
        // NH_DEVEL_STATUS == NH_STATUS_RELEASED (patchlevel.h:33)
        game.sysopt.panictrace_gdb = 0;
        // #ifdef PANICTRACE_LIBC (defined on Linux and macOS)
        game.sysopt.panictrace_libc = 0;
    }

    game.sysopt.crashreporturl = null;

    game.sysopt.check_save_uid = 1;
    game.sysopt.check_plname = 0;
    game.sysopt.seduce = 1;
    sysopt_seduce_set(game.sysopt.seduce);
    // saveformat[0] = bonesformat[0] = historical (sys.c:102; hack.h:976; sys.h:49-50)
    game.sysopt.saveformat = [SAVEFORMATS.historical, 0];
    game.sysopt.bonesformat = [SAVEFORMATS.historical, 0];
    game.sysopt.accessibility = 0;
    // #ifdef WIN32 — not defined

    // help menu (sys.c:109)
    game.sysopt.hideusage = 0;

    return;
}

// C ref: sys.c:164-183, extern.h:3186
export function sysopt_seduce_set(val) { /* no-op in current C code */ }
