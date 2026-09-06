// mail.js — external-mail handling (partial).
// C ref: nethack-c/upstream/src/mail.c readmail (UNIX + DEF_MAILREADER arm,
// `:703–733`; SIMPLE_MAIL undefined per unixconf.h).
//
// Branch envelope: readmail only.
// Named omissions: MAILREADER child/execl subprocess + getmailstatus stat()
// (Contest Rule #2: no subprocess/filesystem in scored js/); SIMPLE_MAIL /
// AMS / VMS / !UNIX fake-junk-mail arms compiled out in this build;
// ckmailstatus / newmail daemon delivery.

import { game } from './gstate.js';
import { flush_topl_more } from './display.js';

/**
 * C mail.c readmail `:703–733` (UNIX + DEF_MAILREADER; SIMPLE_MAIL off).
 * Order: debug_fuzzer early return, then display_nhwindow(WIN_MESSAGE,
 * FALSE), then the MAILREADER child/execl spawn, then getmailstatus().
 * The spawn (nh_getenv/child/execl) and the stat-based getmailstatus are
 * named omits (Rule #2); the portable remainder is the fuzzer guard plus
 * the message-window flush.
 */
export async function readmail(otmp) {
    void otmp; // C ARGSUSED: struct obj *otmp UNUSED
    if (game.iflags?.debug_fuzzer) return;
    await flush_topl_more(); /* C: display_nhwindow(WIN_MESSAGE, FALSE) */
}
