// gstate.js — Global game state reference.
// All game modules import `game` from here.

export let game = {};

export function resetGame() {
    for (const key in game) delete game[key];
    game.context = { ident: 1 };
    return game;
}
