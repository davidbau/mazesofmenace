// @ts-nocheck
// input.js — Keystroke input handling.
// Provides async nhgetch() that reads from an input queue.
import { game } from './gstate.js';
import { KEY_BINDINGS } from './terminal.js';
import { pushRngLogEntry } from './rng.js';
import { ENV } from './hostenv.js';
const _inputQueue = [];
export function pushKey(key) {
    _inputQueue.push(typeof key === 'number' ? key : key.charCodeAt(0));
}
export function pushKeys(keys) {
    for (const k of keys)
        pushKey(k);
}
// ── FF_PROMPTSTATE (env-gated, RNG-NEUTRAL telemetry) ───────────────────────
// Per-keystroke prompt-state marker.  At EACH nhgetch boundary (the SAME place C
// records `^toplin[tty_nhgetch=2]` for a top-level command read vs `^toplin[more=0]`
// for a more() page-ack), emit which key-reading CONTEXT JS is in:
//   - 'more'    : inside a --More-- page-acknowledgement loop (display.js _topl_more)
//   - 'cmdloop' : a fresh top-level command read (rhack firsttime → parse()/domove)
//   - <other>   : an explicit in-command read context set by game._promptKind
//                 (getobj/getdir/yn/getlin/menu item key)
// This is the JS analogue of C's per-nhgetch toplin marker class, and it is exactly
// the signal the prompt-keystroke-dispatch divergence needs: when C reads a key as a
// more()/yn() page-ack (hero STATIONARY) but JS reads the SAME key in 'cmdloop'
// (routing it to rhack→domove), this marker shows 'more'/<prompt> on C's side and
// 'cmdloop' on JS's at that step.  Emitted ONLY when FF_PROMPTSTATE=1; pushRngLogEntry
// is a no-op unless the rng log is enabled (only dev/diff tooling enables it) → ZERO
// effect on scored runs, ZERO RNG consumed.  game._promptKind is set by the prompt
// readers (display.js more() sets 'more' for the page-ack loop); a plain rhack read
// leaves it null → 'cmdloop'.
function _emitPromptState() {
    if (typeof process === 'undefined' || !ENV || ENV.FF_PROMPTSTATE !== '1')
        return;
    const g = game;
    let kind = g._promptKind || null;
    if (!kind) {
        // No explicit prompt context set: a pending --More-- line (or an active
        // movemon paging window) means a page-ack read; else a top-level command read.
        const pm = String(g._pending_message || '');
        if (pm.endsWith('--More--') || g._inMovemonMore) kind = 'more';
        else kind = 'cmdloop';
    }
    // queue depth lets a tool see how many recorded keys remain (for alignment).
    pushRngLogEntry(`^prompt_state[kind=${kind} q=${_inputQueue.length} moves=${g.moves | 0}]`);
}

function _emitToplInputTrace(phase) {
    if (typeof process === 'undefined' || ENV?.FF_TOPL_TRACE !== '1')
        return;
    const g = game;
    const enc = (v) => encodeURIComponent(String(v ?? '').slice(0, 100));
    const live = String(g._pending_message || '');
    const joins = g._topl_joins_src === live && Array.isArray(g._topl_joins)
        ? g._topl_joins.join(',') : '-';
    const result = String(g._resultMessage || '');
    const resultJoins = g._resultMessageJoins?.src === result
        && Array.isArray(g._resultMessageJoins?.joins)
        ? g._resultMessageJoins.joins.join(',') : '-';
    pushRngLogEntry(`^topl_input[phase=${phase} pending=${enc(live)} joins=${joins} result=${enc(result)} resultJoins=${resultJoins} sticky=${enc(g._topl_sticky)} stop=${g._topl_win_stop ? 1 : 0} armed=${g._topl_win_stop_armed ? 1 : 0} arrival=${g._arrival_more_suppress ? 1 : 0} prompt=${enc(g._promptKind)}]`);
}

function _emitActionTrace(key) {
    if (typeof process === 'undefined' || ENV?.FF_ACTION_TRACE !== '1')
        return;
    const g = game;
    const x = g.u?.ux | 0, y = g.u?.uy | 0;
    const around = [];
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const tile = g.level?.levelObjects?.[x + dx]?.[y + dy];
        for (let o = tile, n = 0; o && n++ < 16; o = o.nexthere)
            around.push(`${o.o_id ?? 0}:${o.otyp ?? 0}:${o.ox ?? 0},${o.oy ?? 0}:${o.dknown ? 1 : 0}`);
    }
    pushRngLogEntry(`^action_trace[frame=${g._ff_last_input_frame ?? -1} key=${key | 0} char=${encodeURIComponent(String.fromCharCode(key | 0))}`
        + ` prompt=${encodeURIComponent(g._promptKind || '')} moves=${g.moves | 0}`
        + ` run=${g.context?.run | 0} multi=${g.multi | 0}`
        + ` hero=${x},${y} objects=${around.join(',')}]`);
}
// C ref: tty_nhgetch — read one key.
// In replay mode, reads from the input queue.
// In browser mode, waits for a real keypress.
export async function nhgetch() {
    // RNG-neutral per-keystroke prompt-state marker (FF_PROMPTSTATE=1) — emitted
    // BEFORE the capture hook so it precedes this step's RNG slice in the log.
    _emitPromptState();
    _emitToplInputTrace('before');
    // Fire the capture hook before reading the next key
    const hook = game._preNhgetchHook;
    if (hook)
        await hook();
    // C ref: tty_nhgetch clears the topline (cl_end → clear_nhw) at the START
    // of each nhgetch call, BEFORE delivering the key to the caller.  In JS,
    // _screen_output was already captured by the preNhgetchHook above (using the
    // last flush_screen output), so clearing _pending_message here mirrors the C
    // behaviour: the next pline() call after nhgetch starts a fresh topline
    // instead of concatenating onto the previous turn's message.
    // This prevents inter-command bleed where a non-time-consuming command's
    // pline (e.g. ynq prompt) concatenates with a subsequent command's pline.
    // Note: cmd.js handlers that need the message preserved across nhgetch must
    // explicitly re-set _pending_message before calling flush_screen.
    // C ref: tty topl.c — when the topline is cleared at the start of the next
    // nhgetch, the message just shown has already been committed to the message
    // history ring (remember_topl).  Mirror that here: commit the current
    // committed topline to game._msg_history (stripping any trailing '--More--'
    // indicator, which is not part of the stored message text) before clearing.
    // ^P (doprev_message) recalls this ring.  Append-only; never displayed unless
    // the player invokes ^P, so this cannot perturb any existing screen render.
    if (game._pending_message && !game._topl_suppress_history) {
        let text = String(game._pending_message);
        if (text.endsWith('--More--'))
            text = text.slice(0, -8);
        if (text.length > 0 && text !== game._topl_history_recall) {
            if (!game._msg_history)
                game._msg_history = [];
            const h = game._msg_history;
            // C ref: topl.c — an exact repeat of the most recent line is not re-stored.
            if (h.length === 0 || h[h.length - 1] !== text)
                h.push(text);
        }
    }
    game._topl_history_recall = null;
    game._pending_message = '';
    game._topl_unacknowledged = false;
    /* The deferred-movemon turn tag (_movemonMsgTurn, js/allmain.js) names the
     * batch of movemon plines that is on the topline RIGHT NOW.  C has no such
     * tag — botl.c:159 just prints svm.moves — and the only reason this port
     * carries one is the movemon-before-HEAD-increment window inside
     * faithful_moveloop_turn().  That window closes when the topline it describes
     * is cleared, which is HERE (tty_nhgetch), not only when flush_screen happened
     * to page it: display.js retires the tag on `hadMore`, so a movemon message
     * that FITTED left it armed for every later frame, and the next forced
     * --More-- (a getobj error, a yn prompt, a menu) rendered `T:` one turn low.
     * MEASURED gen329-reseed-seed516524 step 102: C shows the getobj "You don't
     * have that object.--More--" at T:41 and this port showed T:40, four steps
     * after an unpaged pet message armed the tag.  The page-ack reads inside an
     * open --More-- window come through here too, so the retire is gated on the
     * window being closed. */
    if (!game._inMovemonMore)
        game._movemonMsgTurn = null;
    /* C ref: win/tty/wintty.c:4065-4066, the first thing tty_nhgetch() does
     * after flushing the terminal:
     *     if (WIN_MESSAGE != WIN_ERR && wins[WIN_MESSAGE])
     *         wins[WIN_MESSAGE]->flags &= ~WIN_STOP;
     * This is what wintty.h:76 means by "sticks until next input request": the
     * ESC-at---More-- message suppression set by more() (js/display.js
     * _topl_more) lasts from that more() until the very next key read, and no
     * longer.  Note more()'s own xwaitforspace() read runs BEFORE it sets the
     * bit, so a page dismissed with ESC does not clear its own suppression. */
    game._topl_win_stop = false;
    game._topl_win_stop_armed = false;
    game._topl_win_stop_buf = null;
    /* An ESC consumed by a level-arrival page arms one same-call message
     * suppression.  If the arrival returns without another pline in that
     * command, the arm must expire with this next input request; otherwise a
     * later command's first message is incorrectly swallowed (gen008's
     * engraving reveal after teleport). */
    game._arrival_more_suppress = false;
    game._topl_urgent_next = false;
    /* Paint-time topline persistence (see js/display.js _topl_sticky) lives
     * exactly as long as _pending_message would have: one key. */
    game._topl_sticky = null;
    /* The command-result snapshot marker (js/display.js _topl_snapshot_result)
     * describes THIS command's copy of the live topline; it cannot outlive the
     * key read that ends the command. */
    game._toplResultSnapshot = null;
    /* Likewise the run-commit marker (js/allmain.js _run_commit_result): it
     * names the topline an EARLIER step of the CURRENT run left in the live
     * buffer, and a run cannot span a key read. */
    game._toplRunCommitted = null;
    _emitToplInputTrace('after');
    if (_inputQueue.length > 0) {
        const key = _inputQueue.shift();
        _emitActionTrace(key);
        return key;
    }
    // Browser mode: wait for keypress from the display
    const display = game?.nhDisplay;
    if (display?.readKey) {
        const key = await display.readKey({ bindings: KEY_BINDINGS.VI_KEYS });
        _emitActionTrace(key);
        return key;
    }
    throw new Error('Input queue empty - test may be missing keystrokes');
}
// Reset input state
export function resetInputState() {
    _inputQueue.length = 0;
}
