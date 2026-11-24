// gstate.js — Global game state reference.
// All game modules import `game` from here.

export let game = {};

export function resetGame() {
    // src/decl.c:458,1096: inventory letter allocation starts fresh per process.
    game = { lastinvnr: 51 };
    return game;
}
