// gstate.js — global game state reference (mirrors C global variables)
// C uses global `u`, `level`, `flags`, `svm` — a single well-known state reference.
// JS modules read gstate.game.player, gstate.game.map, gstate.game.display, etc.

export let game = null;
export function setGame(g) { game = g; }
