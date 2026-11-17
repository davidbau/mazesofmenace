// allmain.js — one step of interactive play.
//
// The browser page (index.html) and the judge's playability check call
// moveloop_core() once per key: read a key from the display and hand it
// to the running game (js/play.js), which plays until it wants the next
// one.  NetHack's own moveloop (src/allmain.c) runs inside the compiled C.

import { game } from './gstate.js';

export async function moveloop_core() {
    const nh = game.nhGame;
    if (!nh || nh.exited) {
        if (game.program_state) game.program_state.gameover = true;
        return;
    }
    const key = await game.nhDisplay.readKey();
    await nh.feedKey(key);
}
