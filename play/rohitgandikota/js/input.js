// input.js — Keystroke input handling.
// Provides async nhgetch() that reads from an input queue.

import { game } from './gstate.js';
import { KEY_BINDINGS } from './terminal.js';

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
/* C has exactly ONE reader of the input stream. Async JS can have several
   nhgetch() calls in flight (a prompt awaiting its answer while the next
   step's command loop starts up); without serialization, a newer call that
   finds a queued key returns it immediately and JUMPS the queue, so the
   prompt's answer runs as a fresh command and every later key lands one
   reader too early. The chain hands out keys strictly in call order, over
   whichever feed mechanism (input queue or display.readKey) is in use. */
let _readChain = Promise.resolve();

export function nhgetch() {
    const link = _readChain.then(() => nhgetch_core());
    /* keep the chain alive whether or not this read succeeds */
    _readChain = link.then(() => {}, () => {});
    return link;
}

async function nhgetch_core() {
    /* win/tty/wintty.c:4066 (tty_nhgetch) — reading a fresh key lifts the
       ESC message suppression. The order matters: more() sets WIN_STOP
       AFTER its dismissing read returns, so the flag survives exactly until
       the next read, and tty_yn_function tests it before its own read. */
    game._win_stop = false;
    // Fire the capture hook before reading the next key
    const hook = game._preNhgetchHook;
    if (hook) await hook();

    if (_inputQueue.length > 0) {
        return _inputQueue.shift();
    }

    // Browser mode: wait for keypress from the display
    const display = game?.nhDisplay;
    if (display?.readKey) {
        return await display.readKey({ bindings: KEY_BINDINGS.VI_KEYS });
    }

    throw new Error('Input queue empty - test may be missing keystrokes');
}

// Reset input state
export function resetInputState() {
    _inputQueue.length = 0;
}
