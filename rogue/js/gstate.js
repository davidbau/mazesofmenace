/**
 * gstate.js — Global game state singleton for Rogue JS port.
 */

let _game = null;

export function game() {
  return _game;
}

export function setGame(g) {
  _game = g;
}
