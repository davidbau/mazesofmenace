// gstate.js — Global game state reference.
// All game modules import `game` from here.

import { NO_COLOR } from './terminal.js';

export let game = {};

export function resetGame() {
    // src/decl.c:458,1096: inventory letter allocation starts fresh per process.
    game = {
        lastinvnr: 51,
        // src/decl.c:411: each process starts with an empty inventory chain.
        invent: [],
        // src/decl.c:534-535,560: ordered menu aliases, fresh per process.
        mapped_menu_cmds: '', mapped_menu_op: '', n_menu_mapped: 0,
        // src/decl.c:903,1117: each game starts with a zeroed kinfo owner.
        killer: { next: null, id: 0, format: 0, name: '' },
        // src/decl.c:820, include/optlist.h:196: tty targeting defaults.
        wsettings: { wdmode: 0, map_frame_color: NO_COLOR },
        iflags: { bgcolors: true },
    };
    return game;
}
