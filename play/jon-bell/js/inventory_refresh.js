// NetHack 5.0 invent.c: shared inventory relabeling and window refresh.
import { game } from './gstate.js';
import { suppress_map_output } from './display.js';

import { COIN_CLASS } from './hold_another_object.js'; // objclass.h
import { GOLD_SYM } from './invent.js';
export { reassign, update_inventory } from './invent.js'; // relocate-fns


// This is the actual empty build arm of the window function, not a substitute
// for the core update_inventory() guards, price state or window dispatch.
export function tty_update_inventory(arg) {
    return;
}

// win/shim/winshim.c:199, non-Emscripten VDECLCB arm. The host receives a void
// request; it does not supply a core result or replace inventory behavior.
export function shim_update_inventory(arg) {
    if (!game.shim_graphics_callback)
        return;
    game.shim_graphics_callback('shim_update_inventory', null, 'vi', arg);
}


