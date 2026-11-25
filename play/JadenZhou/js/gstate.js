// gstate.js — Global game state reference.
// All game modules import `game` from here.

// C ref: decl.c g_init_x / g_init_y — the globals with nonzero initial
// values: x_maze_max = (COLNO - 1) & ~1, y_maze_max = (ROWNO - 1) & ~1,
// sell_response, sell_how
// (COLNO 80, ROWNO 21; const.js imports this module, so they're spelled out)
function initial_globals() {
    return {
        x_maze_max: (80 - 1) & ~1,
        y_maze_max: (21 - 1) & ~1,
        /* g_init_s: sell_response = 'a', sell_how = SELL_NORMAL (0) */
        sell_response: 'a',
        sell_how: 0,
    };
}

export let game = initial_globals();

export function resetGame() {
    game = initial_globals();
    return game;
}
