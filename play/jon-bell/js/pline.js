// C src/pline.c:impossible. Only qualified callers are migrated here; existing
// caller-local diagnostic stubs are not silently enabled across the game.
import { game } from './gstate.js';
import { BUFSZ, DEVTEAM_EMAIL } from './const.js';
import { nh_sprintf } from './display.js';
import { paniclog } from './files.js';
import { set_msg_xy } from './cmd.js'; // relocate-fns
import { Unaware, _You, _disp_Blind, _live_deaf, _pline_body } from './display.js';
import { msgtype_type } from './options.js'; // relocate-fns
import { livelog_add } from './files.js'; // relocate-fns
import { strNsubst } from './hacklib.js'; // relocate-fns
import { ENV } from './hostenv.js'; // relocate-fns
import { is_youmonst } from './mhitm.js'; // relocate-fns
import { pushRngLogEntry } from './rng.js'; // relocate-fns

export async function impossible(s, ...args) {
    const state = game.program_state;
    // Fatal panic/recovery and optional crash-report submission are separate
    // unported platform dependencies. Do not turn either into a normal return.
    if (state.in_impossible)
        throw new Error('panic: impossible called impossible');
    state.in_impossible = 1;
    const pbuf = nh_sprintf(s, args).slice(0, BUFSZ - 1);
    paniclog('impossible', pbuf);
    if (game.iflags?.debug_fuzzer === 1) // fuzzer_impossible_panic
        throw new Error('panic: ' + pbuf);

    await urgent_pline('%s', pbuf);
    if (state.in_sanity_check) {
        state.in_impossible = 0;
        return;
    }
    let pbuf2 = 'Program in disorder!';
    if (state.something_worth_saving)
        pbuf2 += '  (Saving and reloading may fix this problem.)';
    await pline('%s', pbuf2);
    await pline('Please report these messages to %s.', DEVTEAM_EMAIL);
    if (game.sysopt?.support)
        await pline('Alternatively, contact local support: %s', game.sysopt.support);
    if (game.sysopt?.crashreporturl)
        throw new Error('impossible: crash-report interface is not ported');
    state.in_impossible = 0;
}

// ── pline ──
// C ref: pline.c:103-111 `pline(const char *line, ...)` → vpline(line, args).
// C's pline is VARIADIC and formats through vsnprintf; this one took a single
// argument, so every C-transliterated `pline("You see %s here.", doname(obj))`
// in the tree dropped its arguments and printed the literal "%s" to the
// across 15 files resolved to THIS definition with more arguments than it
// declares.  Restoring the rest parameter fixes all of them at the binding
// rather than one string-concatenation at a time.
// C ref (unchanged, below): tty pline → putstr(WIN_MESSAGE) → tty_putstr — the
// tty layer appends to the existing topline with two spaces ("  ") when called
// more than once in the same turn before nhgetch clears the line.
// Mirror: multiple pline() calls within one turn concatenate with "  ".
/* C ref: pline.c:531 gamelog_add(glflags, gltime, msg) — append one entry to
 * gg.gamelog, the chronicle ring that insight.c:2571 show_gamelog() renders for
 * '#chronicle' and for the end-of-game "Major events:" window.
 * pline.c:527 stores {turn, flags, text}; js/allmain.js's game-start entry
 * already uses exactly that shape, so this is its one shared writer. */
export function gamelog_add(glflags, gltime, msg) {
    const g = game;
    (g.gamelog ||= []).push({ turn: gltime | 0, flags: glflags | 0, text: String(msg) });
}

/* C pline.c:514-525: chronicle keeps the original formatted message; only
 * the live log replaces tabs, which otherwise delimit its fields. */
export function livelog_printf(ll_type, line, ...args) {
    const buf = { value: nh_sprintf(line, args).split('\0', 1)[0].slice(0, BUFSZ * 2 - 1) };
    gamelog_add(ll_type, game.moves | 0, buf.value);
    strNsubst(buf, "\t", "_", 0);
    livelog_add(ll_type, buf.value);
}

export async function urgent_pline(msg, ...args) {
    const g = game;
    if (args.length > 0)
        msg = nh_sprintf(msg, args);
    if (ENV.FF_MLTRACE === '1')
        pushRngLogEntry(`^topl_urgent[msg=${encodeURIComponent(String(msg).slice(0,96))} stop=${game._topl_win_stop?1:0} armed=${game._topl_win_stop_armed?1:0} plen=${String(game._pending_message||'').length}]`);
    if (g._topl_win_stop) {
        /* tty_clear_nhwindow(WIN_MESSAGE): the topline is cleared and
         * ttyDisplay->toplin goes to TOPLINE_EMPTY, so the message below can
         * neither join nor page it. */
        g._pending_message = '';
        g._topl_joins = [];
        g._topl_joins_src = '';
        g._topl_win_stop = false;
        g._topl_win_stop_buf = null;
        /* The wipe also takes the line a command stashed into the result
         * channel (float_down's "You float gently..." drawn past the ESC). */
        g._resultMessage = null;
        g._resultMessageJoins = null;
        /* wintty.c:2278-2281 clears the sole message window.  The eating
         * driver's saved topline is another copy of that wiped line. */
        g._occ_committed_topl = null;
        /* ...and so is the fireassist swap's ESC-owner line (cmd.js cmdq_clear
         * would otherwise re-present it after this wipe). */
        g._fireSwapOwnerLine = null;
    }
    g._topl_win_stop_armed = false;           /* NOSTOP also pre-empts the arm */
    g._topl_urgent_next = true;               /* one-shot; pline() consumes it */
    await pline(msg);
}

export async function pline(msg, ...args) {
    /* Before dorecover()'s docrt() there is no map window yet: the topline
     * pages over the base window (js/jsmain.js restore path). */
    if (game._base_topline) {
        const urgent = !!game._topl_urgent_next;
        game._topl_urgent_next = false;
        return await game._base_topline.put(args.length ? nh_sprintf(msg, args) : msg, urgent);
    }
    const deferred = args.length === 0 && game._deferredPline;
    if (!deferred || deferred.msg !== msg)
        return await _pline_body(msg, false, null, ...args);
    game._deferredPline = null;
    const held = game._botlPaintHeld;
    // A real bot() between preparation and publication supersedes this paint.
    if (deferred.seq === (game._botlPaintSeq | 0))
        game._lastPaintedBotl = deferred.botl;
    game._botlPaintHeld = true;
    try {
        return await _pline_body(msg, true);
    } finally {
        game._botlPaintHeld = held;
    }
}

export async function Norep(msg, ...args) {
    const text = (args.length > 0) ? nh_sprintf(msg, args) : String(msg);
    if (msgtype_type(text, true) === 'norep' && game._prevmsg === text)
        return;
    await pline(text);
}

/* C pline.c:364-385,414-424: prefix the format before vpline formats it. */
export function You(line, ...args) {
    return _You(null, line, args);
}

export function Your(line, ...args) {
    return pline('Your ' + line, ...args);
}

/* C pline.c:403-412: prefix the format, then let vpline substitute once. */
export function You_cant(line, ...args) {
    return pline("You can't " + line, ...args);
}

export function pline_The(line, ...args) {
    return pline('The ' + line, ...args);
}

/* C pline.c:475-492: quote the format before substituting its arguments.
 * PLINE_VERBALIZE is consumed only by SoundSpeak (sndprocs.h:239-247);
 * this port has no sound backend.  Deafness is the caller's responsibility. */
export function verbalize(line, ...args) {
    return pline('"' + line + '"', ...args);
}

/* C pline.c:425-434: prefix before formatting, like You() and pline_The(). */
export function There(line, ...args) {
    return pline('There ' + line, ...args);
}

/* C pline.c:138-154: the hero has no map-origin prefix; other monsters do. */
export function pline_mon(mon, line, ...args) {
    if (is_youmonst(mon)) set_msg_xy(0, 0);
    else set_msg_xy(mon.mx, mon.my);
    return pline(line, ...args);
}

/* C pline.c:388-400 You_feel(): sensations use dream wording while unaware. */
export async function You_feel(line, ...args) {
    const prefix = Unaware() ? 'You dream that you feel ' : 'You feel ';
    return pline(prefix + String(line), ...args);
}

export async function You_hear(line, ...args) {
    const unaware = Unaware();
    if ((_live_deaf() && !unaware) || !(game.flags?.acoustics ?? true))
        return;
    const prefix = game.u?.uinwater ? 'You barely hear '
                 : unaware ? 'You dream that you hear '
                 : 'You hear ';
    return pline(prefix + String(line), ...args);
}

/* C ref: pline.c:454-468 You_see(line, ...) — the same shape with no guard:
 *     if (Unaware)     YouPrefix(tmp, "You dream that you see ", line);
 *     else if (Blind)  YouPrefix(tmp, "You sense ", line);
 *     else             YouPrefix(tmp, "You see ", line);
 * C's own comment on the Blind arm is "caller should have caught this...". */
export async function You_see(line, ...args) {
    const prefix = Unaware() ? 'You dream that you see '
                 : _disp_Blind() ? 'You sense '
                 : 'You see ';
    return pline(prefix + String(line), ...args);
}

/* C pline.c:126-135 — the message keeps the map coordinate as its origin. */
export function pline_xy(x, y, msg, ...args) {
    set_msg_xy(x, y);
    return pline(msg, ...args);
}
