// input.js — Keystroke input handling.
// Provides async nhgetch() that reads from an input queue.

import { game } from './gstate.js';
import { KEY_BINDINGS } from './terminal.js';

const _inputQueue = [];
/** Index into the segment **`moves`** string (advanced with each **`nhgetch`**). */
let _replayMoves = '';
let _replayPos = 0;

export function initReplayMoves(moves) {
    _replayMoves = moves || '';
    _replayPos = 0;
}

/** Next character in the replay script without consuming the queue. */
export function peekReplayMoves(offset = 0) {
    const i = _replayPos + offset;
    return i < _replayMoves.length ? (_replayMoves.charCodeAt(i) | 0) : null;
}

/** Replay index advanced by **`nhgetch`** (diagnostics). */
export function replayMovesPosLikeC() {
    return _replayPos | 0;
}

export function pushKey(key) {
    _inputQueue.push(typeof key === 'number' ? key : key.charCodeAt(0));
}

export function pushKeys(keys) {
    for (const k of keys) pushKey(k);
}

/** True if replay (or tests) still have keys queued before the next nhgetch. */
export function hasQueuedInput() {
    return _inputQueue.length > 0;
}

/** Next queued key without consuming (moveloop defers new-turn before **`#search`**). */
export function peekQueuedKey() {
    return _inputQueue.length > 0 ? (_inputQueue[0] | 0) : null;
}

// C ref: tty_nhgetch — read one key.
// In replay mode, reads from the input queue.
// In browser mode, waits for a real keypress.
export async function nhgetch() {
    // Fire the capture hook before reading the next key
    const hook = game._preNhgetchHook;
    if (hook) await hook();

    if (_inputQueue.length > 0) {
        if (_replayPos < _replayMoves.length) _replayPos++;
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
    _replayMoves = '';
    _replayPos = 0;
}
