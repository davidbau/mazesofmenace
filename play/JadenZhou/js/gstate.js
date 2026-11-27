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
        /* allmain.c static int mvl_wtcap = 0, mvl_change = 0 (zero, but
           they live here so that every game starts with C's values) */
        mvl_wtcap: 0,
        mvl_change: 0,
        /* eat.c maybe_cannibal() static long ate_brains = 0L */
        ate_brains: 0,
        /* eat.c newuhs() static unsigned save_hs; static boolean
           saved_hs = FALSE */
        save_hs: 0,
        saved_hs: false,
        /* display.c swallowed() static coordxy lastx, lasty */
        swallow_lastx: 0,
        swallow_lasty: 0,
        /* teleport.c tele_trap() static boolean in_tele_trap = FALSE */
        in_tele_trap: false,
        /* decl.c gc.corpsenm_digested = NON_PM (-1) */
        corpsenm_digested: -1,
        /* decl.c gb.bhitpos: a zero-initialized global coord that
           launch_obj() and others write field by field */
        bhitpos: { x: 0, y: 0 },
    };
}

export let game = initial_globals();

export function resetGame() {
    game = initial_globals();
    return game;
}
