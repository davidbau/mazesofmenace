// NetHack 5.0 invent.c: shared inventory relabeling and window refresh.
import { game } from './gstate.js';
import { suppress_map_output } from './display.js';

const COIN_CLASS = 12; // objclass.h
const NOINVSYM = 0x23, GOLD_SYM = 0x24; // '#', '$'; hack.h

// invent.c:4855. Only the first gold stack is moved; a second stack participates
// in ordinary lettering, just as in C. gl.lastinvnr lives at game._lastinvnr.
export function reassign() {
    let i;
    let obj, prevobj, goldobj;

    prevobj = goldobj = null;
    for (obj = game.invent; obj; prevobj = obj, obj = obj.nobj) {
        if (obj.oclass === COIN_CLASS) {
            goldobj = obj;
            if (prevobj)
                prevobj.nobj = goldobj.nobj;
            else
                game.invent = goldobj.nobj;
            break;
        }
    }
    for (obj = game.invent, i = 0; obj; obj = obj.nobj, i++)
        obj.invlet = (i < 26) ? (0x61 + i) : (i < 52) ? (0x41 + i - 26) : NOINVSYM;
    if (goldobj) {
        goldobj.invlet = GOLD_SYM;
        goldobj.nobj = game.invent;
        game.invent = goldobj;
    }
    if (i >= 52)
        i = 52 - 1;
    game._lastinvnr = i;
}

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

function inventory_window_function() {
    const procs = game.windowprocs;
    if (typeof procs?.win_update_inventory === 'function')
        return procs.win_update_inventory;
    if (!procs || procs.name === 'tty')
        return tty_update_inventory;
    if (procs.name === 'shim')
        return shim_update_inventory;
    throw new Error(`Unported inventory window: ${procs.name}`);
}

// receive the call which disables their persistent inventory window.
export function update_inventory() {
    if (!game.program_state.in_moveloop)
        return;
    if (suppress_map_output())
        return;

    // Legacy partial iflags objects omit C's zero-initialized scalar.
    const save_suppress_price = game.iflags.suppress_price ?? 0;
    game.iflags.suppress_price = 0;
    const win_update_inventory = inventory_window_function();
    win_update_inventory(0);
    game.iflags.suppress_price = save_suppress_price;
}
