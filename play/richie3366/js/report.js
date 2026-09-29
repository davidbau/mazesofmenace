// report.js — crash-report build-id init (CRASHREPORT subsystem home).
//
// C ref: nethack-c/upstream/src/report.c (behind `#ifdef CRASHREPORT`,
// active on __linux__ via include/config.h:244-254).
// Plain ESM, Node + Chrome safe: no imports (the only callee, pline.c
// raw_printf `:128`, sits in an `#ifdef BETA` arm the contest build
// compiles out), no fs, no network.

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
