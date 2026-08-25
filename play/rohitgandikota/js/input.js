// input.js — Keystroke input handling.
// Provides async nhgetch() that reads from an input queue.

import { game } from './gstate.js';
import { KEY_BINDINGS } from './terminal.js';
import { TOPLINE_NEED_MORE, TOPLINE_NON_EMPTY } from './display.js';

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

    let key;
    if (_inputQueue.length > 0) {
        key = _inputQueue.shift();
    } else {
        // Browser mode: wait for keypress from the display
        const display = game?.nhDisplay;
        if (display?.readKey) {
            key = await display.readKey({ bindings: KEY_BINDINGS.VI_KEYS });
        } else {
            throw new Error('Input queue empty - test may be missing keystrokes');
        }
    }

    /* win/tty/wintty.c:4100 (tty_nhgetch):
           / * topline has been seen - we can clear the need for --More-- * /
           if (ttyDisplay && ttyDisplay->toplin == TOPLINE_NEED_MORE)
               ttyDisplay->toplin = TOPLINE_NON_EMPTY;
       A key read acknowledges the message on the top line, which is what
       lets the NEXT pline repaint over it instead of blocking on --More--.
       getpos's autodescribe (a pline per cursor move, one key between each)
       depends on this. */
    if (game._toplin === TOPLINE_NEED_MORE)
        game._toplin = TOPLINE_NON_EMPTY;

    /* Not a NetHack function: the pty line discipline. The C game runs on a
       pty whose termios keeps ICRNL set (NetHack's cbreak() clears only
       ICANON/ECHO), so a typed or recorded CR (0x0D) reaches the C binary as
       NL (0x0A) -- the game itself never sees '\r'. That is what makes RET
       act as ^J (rush south) at the top-level prompt: seed0004 step 299.
       Model the same translation here so every reader downstream sees what
       the C's read() saw. The queue holds char codes; readKey may hand back
       a string. */
    if (key === 0x0d)
        key = 0x0a;
    else if (key === '\r')
        key = '\n';

    return key;
}

// Reset input state
export function resetInputState() {
    _inputQueue.length = 0;
}
