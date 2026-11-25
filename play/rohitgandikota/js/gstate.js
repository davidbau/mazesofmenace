// gstate.js — Global game state reference.
// All game modules import `game` from here.

export let game = {};

export function resetGame() {
    // src/decl.c:458,1096: inventory letter allocation starts fresh per process.
    game = {
        lastinvnr: 51,
        // src/decl.c:411: each process starts with an empty inventory chain.
        invent: [],
        // src/decl.c:903,1117: each game starts with a zeroed kinfo owner.
        killer: { next: null, id: 0, format: 0, name: '' },
    };
    return game;
}
