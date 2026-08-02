// input.js — Keystroke input handling.
// Provides async nhgetch() that reads from an input queue.

import { game } from './gstate.js';
import { KEY_BINDINGS } from './terminal.js';
import { flushDeferredWereTransforms } from './were.js';

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
    // Fire the capture hook before reading the next key
    const hook = game._preNhgetchHook;
    if (hook) await hook();

    // C ref: pline() -> tty putmsg --More-- blocking (win/tty wintty.c
    // xwaitforspace) — a were transformation whose feedback message overflowed
    // the topline blocks inside new_were() (were.c:113-115) until the
    // "--More--" is dismissed; its map repaint (newsym, were.c:126-128) lands
    // when that keypress actually dismisses the prompt (space/return/escape),
    // NOT when a swallowed key (digit prefix, movement key, ...) is ignored.
    const readOne = async () => {
        if (_inputQueue.length > 0) return _inputQueue.shift();
        const display = game?.nhDisplay;
        if (display?.readKey) return await display.readKey({ bindings: KEY_BINDINGS.VI_KEYS });
        throw new Error('Input queue empty - test may be missing keystrokes');
    };
    const key = await readOne();
    if (game._message_more
        && [' ', '\x1b', '\r', '\n'].includes(String.fromCharCode(key)))
        flushDeferredWereTransforms();
    return key;
}

// Reset input state
export function resetInputState() {
    _inputQueue.length = 0;
}
