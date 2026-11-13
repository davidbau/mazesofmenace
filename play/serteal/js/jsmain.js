// jsmain.js - contest entry points (runSegment, the interactive NethackGame
// interface of index.html and frozen/playability_runner.mjs).
//
// The game is the readable JS emitted from the NetHack C sources (js/src, js/win,
// js/sys, js/dat) running on js/rt over the vendored C library (js/vendor),
// driven by js/host (js/host/game.js).
import * as engine from "./host/game.js";
engine.setShipEntry(() => import("./host/ship_entry.js"));

export { keyBytes, renderCapturedScreen } from "./host/capture.js";
export { recorderPlayerName } from "./host/env.js";
import { renderCapturedScreen } from "./host/capture.js";

/** The game class used by runSegment and the interactive page. */
export const NethackGame = engine.ShipGame;

export async function runSegment(input) {
  const game = new NethackGame(input);
  await game.start();
  return game;
}

function renderLatestCapturedScreen(game, display) {
  const shown = game.shownScreen();
  if (shown) renderCapturedScreen(display, shown.screen, shown.cursor);
}

function attachInteractiveDisplay(game, display) {
  if (!display) return;
  display._nhjsInteractive = { game };
  renderLatestCapturedScreen(game, display);
}

export function initializeInteractiveGame(display, game) {
  attachInteractiveDisplay(game, display);
}

// The keys typed but not read yet, in order (js/terminal.js's queue, read only).
function queuedKeys(display) {
  const queue = display?.terminal?._inputQueue;
  return Array.isArray(queue) ? queue : [];
}

// One key from the browser or the playability check, with the keys already
// typed after it (type-ahead, see host/game.js pushKey).  Returns false once
// the game has ended.
export function continueInteractiveGame(display, keyCode) {
  const game = display?._nhjsInteractive?.game;
  if (!game || !game.pushKey(keyCode, queuedKeys(display))) return false;
  renderLatestCapturedScreen(game, display);
  return true;
}
