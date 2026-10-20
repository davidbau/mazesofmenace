// input.js — Keystroke input handling.
// Provides async nhgetch() that reads from an input queue.

import { game } from './gstate.js';
import { KEY_BINDINGS } from './terminal.js';
import { clear_win_stop, mark_topline_seen, tty_resize_mesg_arm } from './display.js';

const _inputQueue = [];

export function pushKey(key) {
    _inputQueue.push(typeof key === 'number' ? key : key.charCodeAt(0));
}

export function pushKeys(keys) {
    for (const k of keys) pushKey(k);
}

// C ref: tty_nhgetch — read one key.
// In replay mode, reads from the input queue.
// In browser mode, waits for a real keypress.
export async function nhgetch() {
    // C: wins[WIN_MESSAGE]->flags &= ~WIN_STOP before blocking
    clear_win_stop();

    // Fire the capture hook before reading the next key
    const hook = game._preNhgetchHook;
    if (hook) await hook();

    let key;
    if (game.iflags?.debug_fuzzer) {
        // C wintty.c tty_nhgetch `:4068` — the fuzzer feeds random keys
        // at the tty bottom (covers direct nhgetch readers too).
        const { randomkey } = await import('./cmd.js');
        key = randomkey();
    } else if (_inputQueue.length > 0) {
        key = _inputQueue.shift();
    } else {
        // Browser mode: wait for keypress from the display (before
        // init_nhwindows, the pending one: jsmain.js start).
        const display = game?.nhDisplay || game?._nomuxShadow;
        if (display?.readKey) {
            key = await display.readKey({ bindings: KEY_BINDINGS.VI_KEYS });
        } else {
            throw new Error('Input queue empty - test may be missing keystrokes');
        }
        // C wintty.c tty_nhgetch `:4154–4160` (RESIZABLE): a pending
        // resize message clears the message window and the key read
        // becomes ESC. resize_mesg is only ever non-zero here when the
        // contest recorder's nomux_out overflow wrote it (nomux_capture.js).
        if (tty_resize_mesg_arm()) key = 0x1b;
    }

    // C: topline has been seen — NEED_MORE → NON_EMPTY
    mark_topline_seen();
    return key;
}

// Reset input state
export function resetInputState() {
    _inputQueue.length = 0;
}
