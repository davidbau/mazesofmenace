import { ENV } from './hostenv.js';
// js/platform_identity.js
//
// THE ONE SWITCH FOR THE REFERENCE BUILD'S PLATFORM IDENTITY.
//
// NetHack decides "am I a Mac or a Unix?" entirely at COMPILE time.  Nothing in
// nethackrc, moves, steps` and no more, so the port CANNOT detect the platform
// from its input.  C genuinely ships both arms of each conditional, so carrying
// both here is faithful; what is NOT faithful is inventing a third behaviour or
// sniffing the expected output.  Hence: both arms present, one constant picks.
//
// The organiser's reference build is macOS.  Evidence, all from the fixture in
//   - 3 of 44 render "MacOS NetHack Version 5.0.0 ..."; 0 render "Unix NetHack"
//   - the same 3 render "strong PRNG seed from /dev/random" (Linux says
//     /dev/urandom); 0 render /dev/urandom
//     "Core dumped."); 0 render "Core dumped."
//   - all 44 render "Version 5.0.0 MacOS, built ..." on the chargen splash,
//     5.0.0" to end of line, so that one is NOT scored either way.
//
// TO FLIP: change ORGANISER_PLATFORM to PLATFORM_UNIX.  That is the whole
// change; every site below reads it.  See
// conditionals reach a rendered frame and which do not.
//
// WHAT THIS CONSTANT IS *NOT*.  It is NOT "define MACOS".  A genuine macOS
// build also picks up TIMED_DELAY (include/unixconf.h:117-119) and
// RUNTIME_PASTEBUF_SUPPORT (include/unixconf.h:414-416), and TIMED_DELAY would
// add "timed wait for display effects" to the compiled-options page
// (src/mdlib.c:578-580) and turn the `timed_delay` option row from the
// hidden/config-only form into the in-game form (include/optlist.h:765-774).
// The fixture shows NEITHER.  The organiser's build carries the macOS
// *identity* without those macOS *features*, exactly as
// nethack-c-v5/patches/008-organiser-platform-identity.patch reproduces it on a
// patch 008 covers, and widening it to "the macOS define set" would BREAK the
// port.  Do not add TIMED_DELAY behaviour behind this flag.

export const PLATFORM_MACOS = 'macos';
export const PLATFORM_UNIX = 'unix';

const requestedPlatform = (typeof process !== 'undefined' && process?.env)
    ? ENV.TELEPORT_PLATFORM
    : undefined;
export const ORGANISER_PLATFORM = requestedPlatform === PLATFORM_UNIX
    ? PLATFORM_UNIX
    : PLATFORM_MACOS;

export const ORGANISER_IS_MACOS = (ORGANISER_PLATFORM === PLATFORM_MACOS);

/** Pick the macOS arm or the Unix arm of one C conditional. */
export function platformPick(macosArm, unixArm) {
    return ORGANISER_IS_MACOS ? macosArm : unixArm;
}

/* nethack-c-v5/upstream/include/global.h:191-193 (#ifdef __APPLE__) vs
 * :217-221 (the #ifndef PORT_ID / #ifdef UNIX fallback).  Feeds
 * mdlib.c:341 version_id_string() -- the '#version' line, SCORED -- and
 * mdlib.c:367 bannerc_string() -- the chargen splash, canonicalised away by
 * the scorer. */
export const PORT_ID = platformPick('MacOS', 'Unix');

/* nethack-c-v5/upstream/include/unixconf.h:427-429 (#if BSD || MACOS) vs
 * :424-425 (#ifdef LINUX).  Feeds mdlib.c:511-513, one line of the
 * compiled-options page.  SCORED. */
export const DEV_RANDOM = platformPick('/dev/random', '/dev/urandom');
