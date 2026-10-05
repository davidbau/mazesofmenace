// report.js — crash-report build-id init (CRASHREPORT subsystem home).
//
// C ref: nethack-c/upstream/src/report.c (`#ifdef CRASHREPORT`, active on
// __linux__ via include/config.h:244-254; `#ifdef PANICTRACE` via
// config.h:272-278). Plain ESM, Node + Chrome safe: no fs, no network.
// Imports are call-time-safe leaves: pline (display.js), DEVTEAM_URL /
// ECMD_OK (const.js), game (gstate.js) — none imports this module.

import { pline } from './display.js';
import { DEVTEAM_URL, ECMD_OK } from './const.js';
import { game } from './gstate.js';

// C ref: report.c:107-109 — `static char bid[40]`: binary-ID hint for
// contact.html ("easily spoofed!"). Same-file readers
// (crashreport_bidshow `:188-200`, crash-URL builder `:343-344`) are
// future rows; bid is recomputed at every startup, never saved.
let bid = '';

// C ref: report.c:115 — `static int once` (NetHackW.exe calls us twice).
let _crashreport_once = false;

/**
 * C ref: report.c crashreport_init `:112–174` — hash the own binary
 * (Linux `:79–86`: readlink /proc/self/exe, then open/read 4K segments
 * through nhmd4, hex of the digest into bid) so a crash report can name
 * the build; any failure lands on `skip:` with bid "unknown".
 * Sync like C (pure startup init, no window work).
 * Caller allmain.c early_init `:38` is unported — exported unwired (named).
 * @param {number} argc C argc (nhUse: unread)
 * @param {string[]} argv C argv (nhUse: unread)
 */
export function crashreport_init(argc, argv) {
    // C `:116–117` — second and later calls return immediately.
    if (_crashreport_once) return;
    _crashreport_once = true;
    // C `:118–166` — the binary self-hash: `:118` HASH_BINFILE_DECL +
    // `:123` HASH_BINFILE() (readlink), `:125` open, `:133–143` 4K read
    // loop, `:120–122` HASH_INIT, `:137–138` HASH_UPDATE, `:144–145`
    // HASH_FINISH, `:148–164` hex into bid — named omissions (Rule #2:
    // no /proc, no fd I/O in dual-runtime ESM; nhmd4 itself is live in
    // js/nhmd4.js but has no input bytes here). C takes `goto skip`
    // whenever any of these fail, which is the only reachable outcome.
    // C `:127–129` BETA raw_printf("open e=…") — compiled out (no BETA
    // in the contest build) and unreachable (open is impossible).
    // C `:168–169 skip:` — unhashable binary reads "unknown".
    bid = 'unknown';
    // C `:170–171` HASH_CLEANUP + HASH_PRAGMA_END — no-ops on Linux.
    // C `:172–173`.
    void argc; /* C: nhUse(argc) */
    void argv; /* C: nhUse(argv) */
}

/**
 * C ref: report.c crashreport_bidshow `:188–200` — `--bidshow` early arg:
 * print the crashreport_init bid. Sync like C.
 * Caller earlyarg.c `:543` (ARG_BIDSHOW) is wired in js/earlyarg.js.
 */
export function crashreport_bidshow() {
    // C `:191–193` — `#if defined(WIN32) && !defined(WIN32CON)`
    // win32_cr_helper arm: compiled out on unix.
    // C `:195` raw_print(bid) — named omission: raw_print has no
    // pre-window stdout channel in dual-runtime ESM (D-2573; the sink is
    // likewise dropped in js/display.js vraw_printf `:577`). Routing
    // through raw_printf would invent execplinehandler + early-count
    // effects C never performs here, so the text is dropped like there.
    void bid; /* C `:195` raw_print(bid) — sink named above */
    // C `:196–198` — WIN32notyet wait_synch arm: compiled out.
}

/**
 * C ref: report.c dobugreport `:461–471` — `#bugreport` extcmd
 * (cmd.c:1684-1686 GENERALCMD|NOFUZZERCMD): try the web report, else
 * pline the fallback URL. Async only because pline is async in JS.
 * Callers: the `#bugreport` extcmd row (EXTCMDLIST generated row +
 * EXT_CMDS runner + FUNCT_TXT reverse entry, all wired).
 * @returns {Promise<number>} ECMD_OK
 */
export async function dobugreport() {
    // C `:463` — `!submit_web_report(2, NULL, "#bugreport command")`:
    // submit_web_report is by-design unported (network crash report,
    // Rule #2), so the send always fails and C's gate always takes the
    // pline arm below — the only reachable outcome.
    const url = game.sysopt?.crashreporturl; // C sys.h:44
    // C `:464–468` — fallback pline; `:466–467` picks crashreporturl
    // when set and non-empty, else DEVTEAM_URL (hack.h:1557).
    await pline('Unable to send bug report.  Please visit %s instead.',
        (url && url.length > 0) ? url : DEVTEAM_URL);
    return ECMD_OK; // C `:470`
}

/**
 * C ref: report.c swr_add_uricoded `:236–281` — append URI-coded `str`
 * to the submit_web_report URL window: alnum + `_-.~` verbatim, space
 * as `+`, everything else `%XX`. Returns TRUE on overflow (the caller
 * macro does `goto full`), FALSE normally. Sync like C.
 * Only C caller submit_web_report is by-design unported (network) —
 * exported unwired (named).
 * @param {string} str C `const char *in`
 * @param {object} st C out-params as one cursor: `{ text, rem, mark }`
 *   (text ≡ url content so far, rem ≡ `*remaining`, mark ≡ `markp` as
 *   the saved text length, or null when C passes NULL)
 * @returns {boolean} TRUE on overflow, FALSE on the normal return
 */
export function swr_add_uricoded(str, st) {
    // C `:243 in` advances per byte; TextEncoder renders the JS string
    // as the UTF-8 bytes C's `char *` would hold (global in Node 22 +
    // Chrome, no import).
    const bytes = new TextEncoder().encode(str);
    for (let i = 0; i < bytes.length; i++) { // C `:243 while (*in)`
        const b = bytes[i];
        const alnum = (b >= 0x30 && b <= 0x39) || (b >= 0x41 && b <= 0x5a) || (b >= 0x61 && b <= 0x7a); // C `:244` isalnum (C locale)
        if (alnum || b === 0x5f || b === 0x2d || b === 0x2e || b === 0x7e) { // C `:244` + strchr("_-.~")
            st.text += String.fromCharCode(b); // C `:245–247`
            st.rem--;
        } else if (b === 0x20) { // C `:248` ' '
            st.text += '+'; // C `:249–251`
            st.rem--;
        } else {
            if (st.rem <= 3) { // C `:254`
                if (st.mark !== null && st.mark !== undefined) { // C `:255–256`
                    st.text = st.text.slice(0, st.mark); // C `*out = markp`
                    st.rem = 0; // C `*remaining = 0` (zeroed, not restored)
                }
                return true; // C `:257–258` (NUL-terminate ≡ JS string end)
            }
            // C `:262` — Sprintf(Chr, "%%%02X", *in): C `char` is
            // signed on the contest target, so bytes ≥ 0x80 sign-extend
            // and print as 8 F-prefixed digits (no truncation: `02` is a
            // minimum width).
            const signed = b >= 0x80 ? b - 256 : b;
            const chr = '%' + (signed < 0
                ? (signed >>> 0).toString(16).toUpperCase()
                : signed.toString(16).toUpperCase().padStart(2, '0'));
            const x = chr.length; // C `:263` strlen
            if (x <= st.rem) { // C `:264`
                st.text += chr; // C `:265` Strcpy
                st.rem -= x; // C `:266–267`
            }
        }
        // C `:271` in++ ≡ the loop increment.
        if (!st.rem) { // C `:272` (exactly zero, not ≤ 0)
            if (st.mark !== null && st.mark !== undefined) { // C `:273–274`
                st.text = st.text.slice(0, st.mark);
                st.rem = 0;
            }
            return true; // C `:275–276`
        }
        // C `:278` **out = '\0' ≡ implicit.
    }
    return false; // C `:280` normal return
}

/**
 * C ref: report.c NH_panictrace_libc `:484–512` — glibc-backtrace panic
 * trace. Sync like C, boolean like C.
 * Callers end.c:1921,1923 (NH_abort) are by-design unported (C runtime)
 * — exported unwired (named).
 * @returns {boolean} FALSE — the only reachable JS outcome (below)
 */
export function NH_panictrace_libc() {
    // C `:487–490` — `#if 0` submit_web_report arm ("XXX how did this
    // get left here?"): dead in C, never compiled.
    // C `:492–508` — `#ifdef PANICTRACE_LIBC` backtrace(3) arm
    // (raw_print banner, backtrace/backtrace_symbols over 20 frames,
    // copynchars + double strsubst blank-strip, raw_printf per frame):
    // the define holds on contest Linux (global.h:448–450, automatic
    // on __linux__+__GLIBC__), so it IS the compiled arm — but
    // backtrace(3) has no dual-runtime analogue (Rule #2: no native
    // frame capture in plain ESM), hence unreachable here. The only
    // reachable JS outcome is failure:
    return false; // C `:510` (FALSE — the `#else` shape, by-design here)
}

/**
 * C ref: report.c NH_panictrace_gdb `:528–560` — gdb-on-ourselves panic
 * trace. Sync like C, boolean like C.
 * Callers end.c:1920,1924 (NH_abort) are by-design unported (C runtime)
 * — exported unwired (named).
 * @returns {boolean} FALSE — the only reachable JS outcome (below)
 */
export function NH_panictrace_gdb() {
    // C `:531–556` — `#ifdef PANICTRACE_GDB` arm (gdbpath/greppath
    // NULL-or-empty gates, Snprintf the `gdb -n -q … | grep '^#'`
    // pipeline, popen + raw_print banner + `bt\\nquit\\ny`, sleep(4),
    // pclose): the define holds on contest unix (global.h:453–455,
    // automatic on UNIX non-WASM), so it IS the compiled arm — but
    // popen/gdb has no dual-runtime analogue (Rule #2: no subprocess
    // in plain ESM), hence unreachable here. The only reachable JS
    // outcome is failure:
    return false; // C `:558` (FALSE — the `#else` shape, by-design here)
}

/**
 * C ref: report.c panictrace_handler `:599–622` — fatal-signal handler:
 * write the notice to stderr, then NH_abort. Sync like C.
 * Installed only by the by-design panictrace_setsignals (POSIX
 * signal() has no browser equivalent) — 0 C references otherwise —
 * exported unwired (named).
 * @param {number} sig_unused C `int sig_unused UNUSED`
 */
export function panictrace_handler(sig_unused) {
    // C `:605–617` — CURSES_GRAPHICS curses_uncurse_terminal arm:
    // compiled out (config.h:58 CURSES_GRAPHICS is commented out; the
    // scored port is tty).
    // C `:619` write(2, SIG_MSG, …) — named omission: no fd I/O in
    // dual-runtime ESM (Rule #2).
    // C `:621` NH_abort(NULL) — by-design (C runtime; ledger
    // end.c:NH_abort). No throw: inventing one would add control flow
    // the by-design abort has no JS analogue for.
    void sig_unused; /* C: UNUSED */
}
