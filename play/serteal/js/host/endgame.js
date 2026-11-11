// host/endgame.js - how a game ends.
//
// NetHack ends the program with exit() (after "Goodbye", a save, #quit,
// death), abort() or by returning from main().  In the port each of these
// throws out of the game code to the segment driver, which keeps every
// screen captured until then.  The C library's stdio buffers are not
// flushed; the game closes the files it cares about itself.

/** exit(status) or a return from main(). */
export class GameExit extends Error {
  constructor(status) {
    super(`exit(${status})`);
    this.name = "ExitStatus"; // as Emscripten's runtime names it (host/game.js checks it)
    this.status = status;
  }
}

/** abort() */
export class GameAbort extends Error {
  constructor(message = "abort") {
    super(message);
    this.name = "GameAbort";
  }
}

/** The input queue ran dry: the game wants a key that has not been typed yet. */
export class InputExhausted extends Error {
  constructor() {
    super("input exhausted");
    this.name = "InputExhausted";
  }
}

/** True for the exceptions that end a game normally (not a port bug). */
export function isGameEnd(e) {
  return e instanceof GameExit || e instanceof GameAbort;
}
