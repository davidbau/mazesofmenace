// @ts-nocheck
// rawterm.js — C ref: win/tty/termcap.c end_screen()/clear_screen(),
//                     win/tty/wintty.c tty_raw_print()/tty_exit_nhwindows(),
//                     sys/unix/unixtty.c settty().
//
// The RAW terminal, i.e. the screen after the windowing system has been shut
// down.  Everything else in this port paints through flush_screen(), which
// composes the map/topline/status windows; that machinery is gone by the time
// these functions run, and what is left is plain stdout at whatever cursor
// position the last write left behind.
//
//
//     if (have_windows && !iflags.toptenwin)
//         exit_nhwindows((char *) 0), have_windows = FALSE;   <- clears screen
//     topten(how, endtime);                                   <- raw_print x2
//     if (done_stopprint) { raw_print(""); raw_print(""); }
//
// grid whose only content is the wizard-mode topten notice on row 1, with the
// cursor parked at (col 0, row 4).  The row and the cursor both fall straight
// out of "puts() writes the string then a newline", which is the whole model
// here — there is no cursor addressing on this path at all.
//
// C ref chain for the clear:
//   tty_exit_nhwindows() -> tty_suspend_nhwindows(NULL) -> settty(NULL)
//     -> end_screen() -> clear_screen() -> xputs(CL), home()
// so the screen is blanked and the cursor homed to (0,0) before topten runs.
import { game } from './gstate.js';

/* The tty is 24x80 in every recording (ttyDisplay->rows / ->cols). */
const RAWTERM_ROWS = 24;

function _state() {
    const g = game;
    if (!g._rawterm)
        g._rawterm = { rows: null, row: 0 };
    return g._rawterm;
}

/* True once end_screen() has run: from then on the raw grid, not
   flush_screen()'s composed windows, is what the terminal shows. */
export function raw_term_active() {
    return !!_state().rows;
}

/* C ref: termcap.c end_screen() -> clear_screen() -> xputs(CL); home().
   (end_screen() also emits ME to end the alternate charset; that is an
   attribute reset with no cell content, so it has no effect on the grid.) */
export function end_screen() {
    const st = _state();
    st.rows = new Array(RAWTERM_ROWS).fill('');
    st.row = 0;
    _publish();
}

/* C ref: wintty.c tty_exit_nhwindows(const char *str).  It forgets every
   window (nothing here holds window state that outlives the process) via
   tty_suspend_nhwindows(), which is what clears the screen, and then
   raw_print()s `str` when one was supplied.  really_done() passes NULL. */
export function exit_nhwindows(str) {
    end_screen();
    if (str)
        raw_print(str);
}

export function raw_print(str) {
    const st = _state();
    if (!st.rows)
        end_screen();
    const s = str == null ? '' : String(str);
    if (st.row >= 0 && st.row < RAWTERM_ROWS)
        st.rows[st.row] = s;
    st.row++;
    _publish();
}

export function raw_term_screen() {
    const st = _state();
    if (!st.rows)
        return '';
    const rows = st.rows.slice();
    while (rows.length && rows[rows.length - 1] === '')
        rows.pop();
    return rows.join('\n');
}

function _publish() {
    const g = game;
    const st = _state();
    g._screen_output = raw_term_screen();
    const d = g.nhDisplay;
    if (d) {
        d.cursorCol = 0;
        d.cursorRow = Math.min(st.row, RAWTERM_ROWS - 1);
    }
}
