// host/session.js - a segment driver written in JS (the game itself uses the
// emitted C driver, tools/c2js/host/nhjs_tty_api.c; this one drives game
// modules that do not have it, such as the test fixtures).
//
// A segment runs NetHack's own sys/unix/unixmain.c main() as
// `nethack -u <name>` in the recorder's environment.  The game is one
// synchronous call tree:
//
//   - keys are pulled one byte at a time with nhjs_tgetch() (the tty's
//     tgetch); when the next byte has not been typed yet it throws
//     InputExhausted, which unwinds the whole game back to run();
//   - every NOMUX capture (an "input" frame each time the game is about to
//     read a key, "anim" frames in between) goes to the host at once, so a
//     game that ends with exit() keeps everything shown until then;
//   - main() hands the game loop over when it reaches moveloop()
//     (nhjs_moveloop_entry, by a throw); from then on run() calls
//     moveloop_core() itself, and nhjs_moveloop_boundary() reports the top
//     of every iteration (and once before moveloop_preamble()).  Those are
//     the points from which a snapshot of the heap and the file system is
//     resumed by calling run() again (interactive play).
//
// The functions exported here under their C names are the ones the game's
// C code calls in the prepared source (prepare.mjs transforms of allmain.c,
// win/tty/termcap.c, include/unixconf.h).

import { InputExhausted } from "./endgame.js";

export const NOT_STARTED = 0; // main() has not been called
export const IN_MAIN = 1; // inside main(): options, character selection
export const ENTERED = 2; // main() reached moveloop()
export const LOOP = 3; // moveloop_core() iterations

/** Thrown by nhjs_moveloop_entry(): main() has reached the game loop. */
class MoveloopEntered extends Error {
  constructor() {
    super("moveloop entered");
    this.name = "MoveloopEntered";
  }
}

let current = null;

/**
 * One game's driver.  hooks:
 *   main(argc, argv)             NetHack's main (unixmain.c)
 *   moveloop_preamble(resuming), maybe_do_tutorial(), moveloop_core()
 *   key(index) -> byte or -1     the input
 *   capture(anim, seq, animId, cx, cy, screenText)
 *   boundary(where)              0 before the preamble, 1 at each moveloop_core
 *   readString(addr) -> string   C string at an address
 *   getSP(), setSP(sp)           the C stack pointer (restored when a throw unwinds)
 *   argv: [argc, argvValue]      what main() receives
 */
export class SessionDriver {
  constructor(hooks) {
    this.hooks = hooks;
    this.state = { phase: NOT_STARTED, resuming: 0, keyIndex: 0 };
  }

  /** Run until the input runs out (returns 0); a game end throws. */
  run() {
    const h = this.hooks;
    const s = this.state;
    const prev = current;
    current = this;
    const sp = h.getSP();
    try {
      if (s.phase === NOT_STARTED) {
        s.phase = IN_MAIN;
        try {
          h.main(h.argv[0], h.argv[1]);
        } catch (e) {
          if (!(e instanceof MoveloopEntered)) throw e;
        }
      }
      if (s.phase === ENTERED) {
        h.boundary(0);
        h.moveloop_preamble(s.resuming);
        if (!s.resuming) h.maybe_do_tutorial();
        s.phase = LOOP;
      }
      for (;;) h.moveloop_core();
    } catch (e) {
      h.setSP(sp);
      if (e instanceof InputExhausted) return 0;
      throw e;
    } finally {
      current = prev;
    }
  }

  snapshot() {
    return { ...this.state };
  }

  restore(s) {
    Object.assign(this.state, s);
  }
}

function driver() {
  if (!current) throw new Error("session: no game is running");
  return current;
}

/** tgetch(): the next input byte, verbatim. */
export function nhjs_tgetch() {
  const d = driver();
  const ch = d.hooks.key(d.state.keyIndex);
  if (ch < 0) throw new InputExhausted();
  d.state.keyIndex++;
  return ch & 0xff;
}

/** moveloop() calls this instead of running the loop itself. */
export function nhjs_moveloop_entry(resuming) {
  const d = driver();
  d.state.resuming = resuming ? 1 : 0;
  d.state.phase = ENTERED;
  throw new MoveloopEntered();
}

/** Top of every moveloop_core() iteration. */
export function nhjs_moveloop_boundary() {
  driver().hooks.boundary(1);
}

/** A NOMUX capture: kind "input" or "anim" (C strings: addresses or JS strings). */
export function nhjs_tty_capture_boundary(kind, seq, anim, cx, cy, screen) {
  const d = driver();
  const str = (v) => (typeof v === "string" ? v : v ? d.hooks.readString(v) : "");
  const k = str(kind);
  if (k === "anim") d.hooks.capture(1, seq, anim, cx, cy, str(screen));
  else if (k === "input") d.hooks.capture(0, seq, anim, cx, cy, str(screen));
}

export function nhjs_key_position() {
  return driver().state.keyIndex;
}

export function nhjs_started() {
  return driver().state.phase >= ENTERED ? 1 : 0;
}
