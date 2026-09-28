// sys.js — system-config defaults and release (sys.c).
// C ref: nethack-c/upstream/src/sys.c whole file — `sys_early_init`
// `:20–112`, `sysopt_release` `:114–158`, `sysopt_seduce_set` `:163–183`.
// C globals ⇔ `game.sysopt` (the `sysoptBag` lazy object in cfgfiles.js is
// the same bag; every other reader uses `game.sysopt?.x`, so a fresh
// object here is safe). C `free(x), x = NULL` ⇔ `x = null` (GC reclaims;
// save-freeing teardown itself stays by-design unported — save.c
// `freedynamicdata`, end.js:522 precedent). C `panic` ⇔ `throw`
// (alloc.js:177 / dungeon.js:508 precedent). String fields are
// `string | null` (C `char *`, NULL ⇔ null); `saveformat`/`bonesformat`
// are `[primary, onetime]` pairs (sys.h:49–50).

import { game } from './gstate.js';

/**
 * C ref: sys.c sys_early_init `:20–112` — whole body in C order.
 * Sole C caller: allmain.c early_init `:43` (no JS counterpart; wired in
 * jsmain.js start() before rc/sysconf parsing, matching C's
 * early-init-before-config order).
 *
 * Build-shape notes (pinned headers): SYSCF is defined (config.h:232–235)
 * so the `:30–36` wizards arm takes the `= 0` branch and the `:44–45`
 * debugfiles arm takes the `= 0` branch (the `#else` dupstr arms are not
 * compiled — cited, not ported). DUMPLOG is not defined (config.h:669
 * commented out; DUMPLOG retired, D-1776) so `:54–56` is dead — cited,
 * not ported. CRASHREPORT is defined on Linux (config.h:249–253), hence
 * PANICTRACE (config.h:275–276); NH_DEVEL_STATUS is RELEASED
 * (patchlevel.h:33) so the `:84–94` inner arms take the `= 0` branches
 * (panictrace_gdb/libc = 0); PANICTRACE_LIBC holds on glibc (global.h).
 * Those fields only feed panic-trace output, never RNG or screens.
 * WIN32 `:104–106` is dead — cited, not ported.
 * `getenv("DEBUGFILES")` (`:38`) has no scored-JS analogue (Contest
 * Rule #2: no `node:*`/`process.env` in `js/`); the contest runtime
 * carries no DEBUGFILES value, so the absent-env arm runs (`:44–45`
 * under SYSCF → null, `:51` env_dbgfl = 0).
 */
export function sys_early_init() {
    // C `:28–29` — unconditional clears (no orphan check needed; GC owns).
    const s = {
        support: null, // C `:28`
        recover: null, // C `:29`
        // C `:30–36` — SYSCF defined → `= 0`; the `#else`
        // `dupstr(WIZARD_NAME)` arm is not compiled.
        wizards: null, // C `:31`
        // C `:38–52` — no DEBUGFILES env (Rule #2: no getenv in scored
        // JS) → else arm; SYSCF defined → `:45` debugfiles = 0.
        debugfiles: null, // C `:45`
        env_dbgfl: 0, // C `:51`
        // C `:54–56` — DUMPLOG not defined: no dumplogfile field. Cited.
        shellers: null, // C `:57`
        explorers: null, // C `:58`
        genericusers: null, // C `:59`
        msghandler: null, // C `:60`
        maxplayers: 0, // C `:61`
        bones_pools: 0, // C `:62`
        livelog: 0, // C `:63` LL_NONE (global.h:493)
        // C `:66–70` — record-file bounds (config.h:333–345).
        persmax: Math.max(3, 1), // C `:66` max(PERSMAX, 1)
        entrymax: Math.max(100, 10), // C `:67` max(ENTRYMAX, 10)
        pointsmin: Math.max(1, 1), // C `:68` max(POINTSMIN, 1)
        pers_is_uid: 1, // C `:69` PERS_IS_UID
        tt_oname_maxrank: 10, // C `:70`
        // C `:76–95` — PANICTRACE live on Linux (see header): dup the
        // tool paths, released-build zeros for the trace flags.
        gdbpath: '/usr/bin/gdb', // C `:80` dupstr(GDBPATH)
        greppath: '/bin/grep', // C `:83` dupstr(GREPPATH)
        panictrace_gdb: 0, // C `:90` released arm
        panictrace_libc: 0, // C `:92` released arm
        crashreporturl: null, // C `:96` NULL
        check_save_uid: 1, // C `:98`
        check_plname: 0, // C `:99`
        seduce: 1, // C `:100` default on when compiled in
        // C `:102` historical (hack.h:976) = 1; [1] keeps its BSS zero.
        saveformat: [1, 0],
        bonesformat: [1, 0],
        accessibility: 0, // C `:103`
        // C `:104–106` — WIN32 only: no portable_device_paths. Cited.
        hideusage: 0, // C `:109`
        fmtd_wizard_list: null, // BSS zero; freed last by sysopt_release
    };
    // C `:73–74` — sanity gate (constants above satisfy it; throw ≡ panic).
    if (s.pers_is_uid !== 0 && s.pers_is_uid !== 1) { // C `:73`
        throw new Error('config error: PERS_IS_UID must be either 0 or 1'); // C `:74`
    }
    game.sysopt = s;
    sysopt_seduce_set(s.seduce); // C `:101`
}

/**
 * C ref: sys.c sysopt_release `:114–158` — whole body in C order.
 * Sole C caller: save.c freedynamicdata `:1188`, which has no JS
 * counterpart (save-freeing teardown is by-design unported — end.js:522,
 * options.js:6666 precedent). Named omission for the caller; the export
 * itself is complete and callable.
 */
export function sysopt_release() {
    const s = game.sysopt;
    if (!s || typeof s !== 'object') return;
    if (s.support) s.support = null; // C `:117–118`
    if (s.recover) s.recover = null; // C `:119–120`
    if (s.wizards) s.wizards = null; // C `:121–122`
    if (s.explorers) s.explorers = null; // C `:123–124`
    if (s.shellers) s.shellers = null; // C `:125–126`
    if (s.debugfiles) s.debugfiles = null; // C `:127–129`
    s.env_dbgfl = 0; // C `:130`
    if (s.msghandler) s.msghandler = null; // C `:131–132`
    // C `:133–136` — DUMPLOG not defined: no dumplogfile arm. Cited.
    if (s.genericusers) s.genericusers = null; // C `:137–139`
    if (s.gdbpath) s.gdbpath = null; // C `:140–141`
    if (s.greppath) s.greppath = null; // C `:142–143`
    // C `:145–150` — CRASHREPORT arm: gc.crash_email/crash_name. JS keeps
    // no `game.gc` crash struct (options hold crash_email/crash_name as
    // in-game CompOpts instead); guarded so the arm is a no-op when
    // absent, nulling when present.
    if (game.gc && typeof game.gc === 'object') { // C `:145`
        if (game.gc.crash_email) game.gc.crash_email = null; // C `:146–147`
        if (game.gc.crash_name) game.gc.crash_name = null; // C `:148–149`
    }
    // C `:152–156` — last: may back panic feedback.
    if (s.fmtd_wizard_list) s.fmtd_wizard_list = null; // C `:154–156`
}

/**
 * C ref: sys.c sysopt_seduce_set `:163–183` — whole body.
 * The attack-substitution block is `#if 0` (`:165–178`: done on the fly
 * in getmattk, mhitu.c — the JS get_mattk SEDUCE=0 arm is the named omit
 * at mhitm.js:446); the compiled body (`:179–182`) is a bare return.
 * C callers: sys.c `:101` (wired in sys_early_init above); cfgfiles.c
 * `:941` SEDUCE sysconf handler (JS still routes SEDUCE through the
 * `cnf_line_named_true` stub — named omission, not this commit).
 * @param {number} _val unused (C `int val UNUSED`)
 */
export function sysopt_seduce_set(_val) {
}
