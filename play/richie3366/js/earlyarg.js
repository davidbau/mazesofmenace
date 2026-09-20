/**
 * C-home for `nethack-c/upstream/src/earlyarg.c` — early command-line
 * argument handling (`-s` scores display path).
 *
 * Rule #2: no argv/process/filesystem plumbing lives here. The caller
 * passes the already-adjusted C (argc, argv) slice and the hackdir; only
 * in-process work runs.
 */

import { game } from './gstate.js';
import { prscore, nh_terminate_capture } from './topten.js';

/**
 * C ref: earlyarg.c scores_only `:404–441` (ATTRNORETURN staticfn) — the
 * `-s` early-arg path: show score subsets, then terminate without
 * starting play. Whole body in C order with per-arm `:line` cites.
 *
 * C is synchronous; this is async only because the one live callee,
 * `prscore`, is async in JS (render surface). C's ATTRNORETURN is
 * unrepresentable without a process to exit: after the terminate tail
 * this returns to the caller.
 *
 * @param {number} argc C argc after the caller's `argc + 1` adjustment
 * @param {string[]} argv C argv after the caller's `argv - 1` adjustment
 *   (argv[1] holds `-scores` or its leading substring, as prscore expects)
 * @param {string} dir C hackdir (`*hackdir_p`); used only by the omitted
 *   chdir arm below
 * @returns {Promise<void>}
 */
export async function scores_only(argc, argv, dir) {
    /* C `:407–410` — config_error_done(): flush queued config-file errors
       now, in case an error summary is coming. Named omit: the JS
       config_error_add is a sink (js/botl.js:1149, drops everything), so
       no queue can exist and done() would be a structural no-op. */
    /* C `:412–416` — CHDIR chdirx(dir, FALSE) (nhUse(dir) without CHDIR;
       config.h:438 defines CHDIR, so chdirx is the live arm). Rule #2
       omit: no CWD/filesystem in scored JS. */
    /* C `:417–422` — SYSCF gate (config.h:233 live): wrap initoptions()
       in iflags.initoptions_noterminate (sysconf options affect whether
       panictrace is enabled). Named omit: no initoptions port — JS
       options resolve in-process at startup (VFS/storage), the sysconf
       file layer has no scored counterpart, and the signal-trace
       enablement it gates is itself omitted below. */
    /* C `:423–427` — PANICTRACE ARGV0 save + panictrace_setsignals(TRUE)
       (live via CRASHREPORT on linux, config.h:244–276). Platform omit:
       no signal/stack-trace setup in scored JS. */
    /* C `:428–430` — UNIX whoami(): set up default plname[] from the OS
       user. Platform omit: no OS user in scored JS (cf. getuid()→0 in
       js/topten.js); the plname default is owned by the JS
       startup/askname path. */
    await prscore(argc, argv); // C `:431` — live export js/topten.js:1021

    /* C `:432–437` — MSWIN_GRAPHICS wait_synch: compiles out
       (config.h:61 leaves MSWIN_GRAPHICS undefined). */

    /* C `:439` — nh_terminate(EXIT_SUCCESS), bypassing opt_terminate():
       end.c:1676 program_state.in_moveloop = 0 (no return to play);
       l_nhcore_call(NHCORE_GAME_EXIT) has no JS port layer;
       freedynamicdata/dlb_cleanup are save-freeing (never in JS);
       exit() has no scored counterpart — the contest boundary is the
       live nh_terminate_capture() (same call as done2 js/end.js:1208 and
       the save-quit path js/save.js:1164), then return (C NOTREACHED). */
    if (!game.program_state) game.program_state = {};
    game.program_state.in_moveloop = 0;
    nh_terminate_capture();
}
