// Contest recorder screen-capture overflow (patch 006, win/tty/termcap.c).
//
// The C recorder emits one marker per input boundary and per animation
// frame (nomux_emit_marker `:680–696`): it renders the shadow screen into
// `static char nomux_out[24 * 256]` (nomux_capture_screen `:795–862`), then
// reads the cursor (nomux_get_cursor `:952–960`) for the marker's CX/CY.
// nomux_capture_screen never bounds-checks: a screen whose escape-coded
// payload is longer than 6144 bytes (dense colour + DECgraphics, e.g. a
// level full of blue water) writes its tail, and the terminating '\0',
// past the buffer. In the recorder binary the next statics are
// `int nomux_raw_active, nomux_raw_row, nomux_raw_col` (nm: 0x49d620,
// right after nomux_out's 0x1800 bytes). raw_active turns non-zero, so
// every later marker reports CX=raw_col, CY=raw_row: status-line bytes
// read as little-endian ints (scen-tour-Healer-51152023 step 60:
// "64) Pw:52(52" → CY 893024080, CX 842344498). A later short screen
// does not rewrite them, so the garbage persists.
//
// This is a bug in the contest's recorder, not in NetHack; it is ported
// because the recorded cursor is part of every scored screen
// (frozen/ps_test_runner.mjs `:214–221`). Fix belongs upstream in
// termcap.c (bound nomux_out writes).
//
// Past 0x130 bytes of overflow the payload reaches `obuf` (0x49d750),
// tty's setbuf(stdout) buffer, 1024 bytes. nomux_emit_marker then
// fprintf()s the header into obuf (empty at every marker: the previous
// marker fflush()ed it, measured 0 pending bytes on every overflow), and
// fwrite(scr, L) first fills the rest of obuf with scr[0..) before it
// writes the remainder straight from scr, whose bytes 6448..7471 *are*
// obuf. So the delivered payload, and the recorded screen, holds the
// marker's own header and a second copy of the screen's first bytes from
// payload offset 6448 (the parked "OSC marker leak" rows; measured on
// scen-sweep-Monk-49956033 SEQ 87: header at exactly 6448).
//
// Past obuf (payload offset 7472, 0x49db50) lie wintty.c's statics:
// `volatile int erasing_tty_screen` (`:174`), `boolean clipping` (schar,
// global.h `:83`), `int clipx, clipy, clipxmax, clipymax` (`:190–192`),
// `boolean calling_from_update_inventory` (`:247`), `volatile int
// resize_mesg` (`:356`), then the `fieldorder` pointer and tty_status.
// A long enough payload rewrites them with screen text, and C then acts
// on it (scen-sweep-Archeologist-610093 step 336, 7498 bytes): non-zero
// erasing_tty_screen stops tty_clear_nhwindow from erasing anything on
// screen (`:1073–1120`); a non-zero `clipping` turns the CLIPPING pan
// on, so the next cliparound re-anchors clipx at ux-20 and redraw_map
// paints the map shifted left, leaving the rest of the screen stale; a
// non-zero resize_mesg makes tty_nhgetch (`:4154–4160`, RESIZABLE)
// clear the message window and replace the key it just read by ESC.
// Each marker of an unchanged 7766-byte screen rewrites resize_mesg, so
// from there on every key is ESC and the game stands still. JS keeps a
// byte image of these 48 bytes, loads the live JS values into it before
// a marker's overflow and writes the result back (display.js
// nomux_wintty_statics / nomux_wintty_poke).
//
// Named omissions: overflow bytes also overwrite termcap.c's `nilstring`
// and `nulstr`, the emit256/emit24bit color scratch and the tty message
// history statics (snapshot_mesgs, putmsghistory.initd) before obuf;
// past 7472 calling_from_update_inventory (read only for WC2_EXTRACOLORS
// custom colours), the `fieldorder` pointer and tty_status (C would
// render the status from garbage, or crash, on the next bot()); and
// erase_tty_screen's `erasing_tty_screen++` (JS has no reentrant erase).
// The three raw statics are display.js's (nomux_raw_statics /
// nomux_raw_poke), loaded before the overflow and written back, so a
// raw_active the overflow set makes the next raw_print skip
// nomux_enter_raw_mode, and one a real raw_print set (a config error
// before init_nhwindows) keeps every later marker on the raw counters,
// as in C. Animation-frame screens keep the plain serialization (the
// supplemental frame metric).

import { game } from './gstate.js';
import { nomux_cell_gbuf, nomux_wintty_statics, nomux_wintty_poke,
    nomux_raw_statics, nomux_raw_poke } from './display.js';

const NOMUX_OUT_SIZE = 24 * 256;   // termcap.c `:795`
const RAW_STATICS = 12;            // raw_active, raw_row, raw_col (3 × int)
const OBUF_OFF = 0x130;            // obuf (0x49d750) − nomux_out end (0x49d620)
const OBUF_SIZE = 1024;            // tty setbuf(stdout, obuf) BUFSIZ
const WT_OFF = OBUF_OFF + OBUF_SIZE; // erasing_tty_screen (0x49db50)
const WT_SIZE = 48;                // erasing_tty_screen .. tty_status
const CLR_GRAY = 7;
const NO_COLOR = 8;

function sgrFg(fg) { // termcap.c nomux_sgr_fg
    if (fg >= 0 && fg <= 7) return 30 + fg;
    if (fg >= 8 && fg <= 15) return 90 + (fg - 8);
    return 37;
}

// nomux_set_fg: CLR_BLACK → 8 under wc2_darkgray (C default on); out of
// range → 7. NO_COLOR and gray are the default fg 7 the C cell holds.
// Map cells pass the unmapped glyph color; other cells only have the
// tty_map_color'd one, where CLR_BLACK is already NO_COLOR (named).
function cellFg(color) {
    const c = color | 0;
    if (c === NO_COLOR || c === CLR_GRAY || c < 0 || c >= 16) return 7;
    if (c === 0) return game.iflags?.wc2_darkgray !== false ? 8 : 7;
    return c;
}

function pushStr(out, s) {
    for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0xff);
}

/**
 * termcap.c nomux_capture_screen `:796–862`, byte for byte, over the
 * Terminal grid (map cells take their DEC byte + decgfx from the gbuf).
 * @returns {number[]} payload bytes, without the trailing '\0'
 */
export function nomux_capture_bytes(term) {
    const out = [];
    const grid = term?.grid;
    if (!grid) return out;
    for (let row = 0; row < 24; row++) {
        const cells = [];
        for (let col = 0; col < 80; col++) {
            const t = grid[row]?.[col];
            const tch = t?.ch || ' ';
            const gb = t ? nomux_cell_gbuf(col, row, t) : null;
            const dec = gb ? gb.dec : null;
            cells.push({
                ch: dec != null ? dec : tch,
                fg: cellFg(gb ? gb.color : (t?.color ?? NO_COLOR)),
                attr: (t?.attr | 0) & 7,
                decgfx: dec != null ? 1 : 0,
            });
        }
        let curFg = 7;
        let curAttr = 0;
        let end = 79;
        while (end >= 0 && (cells[end].ch === ' ' || cells[end].ch === '\0')
               && cells[end].attr === 0
               && (cells[end].fg === 7 || cells[end].fg === 0))
            end--;
        let inDec = 0;
        for (let col = 0; col <= end; col++) {
            const c = cells[col];
            const ch = (c.ch && c.ch !== '\0') ? c.ch : ' ';
            const fg = c.fg ? c.fg : 7;
            const at = c.attr;
            if (at !== curAttr) {
                if ((at & 1) && !(curAttr & 1)) pushStr(out, '\x1b[7m');
                if (!(at & 1) && (curAttr & 1)) pushStr(out, '\x1b[27m');
                if ((at & 2) && !(curAttr & 2)) pushStr(out, '\x1b[1m');
                if (!(at & 2) && (curAttr & 2)) pushStr(out, '\x1b[22m');
                if ((at & 4) && !(curAttr & 4)) pushStr(out, '\x1b[4m');
                if (!(at & 4) && (curAttr & 4)) pushStr(out, '\x1b[24m');
                curAttr = at;
            }
            if (fg !== curFg) {
                pushStr(out, fg === 7 ? '\x1b[39m' : `\x1b[${sgrFg(fg)}m`);
                curFg = fg;
            }
            if (c.decgfx && !inDec) { out.push(0x0e); inDec = 1; }
            else if (!c.decgfx && inDec) { out.push(0x0f); inDec = 0; }
            out.push(ch.charCodeAt(0) & 0xff);
        }
        if (inDec) { out.push(0x0f); inDec = 0; }
        if (curAttr) pushStr(out, '\x1b[0m');
        else if (curFg !== 7) pushStr(out, '\x1b[39m');
        if (row < 23) out.push(0x0a);
    }
    return out;
}

function int32le(mem, off) {
    return (mem[off] | (mem[off + 1] << 8) | (mem[off + 2] << 16)
        | (mem[off + 3] << 24));
}

function put32le(mem, off, v) {
    for (let i = 0; i < 4; i++) mem[off + i] = (v >> (8 * i)) & 0xff;
}

// The wintty statics a payload reaches (layout in the header comment):
// load the live values, apply the overflow bytes, write them back.
function overflow_wintty(state, bytes) {
    const len = bytes.length;
    const base = NOMUX_OUT_SIZE + WT_OFF;
    if (len < base) return;
    const wt = state.wt || (state.wt = new Uint8Array(WT_SIZE));
    const v = nomux_wintty_statics();
    put32le(wt, 0, v.erasing_tty_screen);
    wt[4] = v.clipping & 0xff;
    put32le(wt, 8, v.clipx);
    put32le(wt, 12, v.clipy);
    put32le(wt, 16, v.clipxmax);
    put32le(wt, 20, v.clipymax);
    put32le(wt, 28, v.resize_mesg);
    for (let i = base; i <= len && i < base + WT_SIZE; i++)
        wt[i - base] = i < len ? bytes[i] : 0;
    nomux_wintty_poke({
        erasing_tty_screen: int32le(wt, 0),
        clipping: (wt[4] << 24) >> 24,
        clipx: int32le(wt, 8),
        clipy: int32le(wt, 12),
        clipxmax: int32le(wt, 16),
        clipymax: int32le(wt, 20),
        resize_mesg: int32le(wt, 28),
    });
}

/**
 * One recorder marker: render the payload, apply its overflow to the
 * raw-mode statics, and return the cursor the marker reports (CX/CY).
 * @param {object} state per-game `{ mem: Uint8Array(12) }` (+ `wt`, the
 *   wintty statics image, made on first reach)
 * @param {object} term Terminal
 * @param {Array|null} cursor the tty cursor [col, row, visible]
 * @param {object} [hdr] input markers: `{ kind, seq, anim }` — when the
 *   overflow reaches obuf, `screen` is the recorded (corrupted) screen
 * @returns {{ cursor: Array|null, screen: string|null }}
 */
export function nomux_marker(state, term, cursor, hdr) {
    const bytes = nomux_capture_bytes(term);
    const len = bytes.length;
    const raw = nomux_raw_statics();
    put32le(state.mem, 0, raw.active);
    put32le(state.mem, 4, raw.row);
    put32le(state.mem, 8, raw.col);
    // Indices len (the '\0') and below that reach past nomux_out land in
    // the statics; indices beyond len are untouched.
    for (let i = NOMUX_OUT_SIZE; i <= len && i < NOMUX_OUT_SIZE + RAW_STATICS; i++)
        state.mem[i - NOMUX_OUT_SIZE] = i < len ? bytes[i] : 0;
    nomux_raw_poke({ active: int32le(state.mem, 0), row: int32le(state.mem, 4),
        col: int32le(state.mem, 8) });
    overflow_wintty(state, bytes);
    // nomux_get_cursor: raw mode reports the raw counters.
    let cx = cursor ? cursor[0] : 0;
    let cy = cursor ? cursor[1] : 0;
    let outCursor = cursor;
    if (int32le(state.mem, 0) !== 0) {
        cx = int32le(state.mem, 8);
        cy = int32le(state.mem, 4);
        outCursor = [cx, cy, 1];
    }
    let screen = null;
    const base = NOMUX_OUT_SIZE + OBUF_OFF;
    if (hdr && len > base) {
        // termcap.c `:690–694` header, then the obuf aliasing above.
        const header = `\x1b]7777;KIND=${hdr.kind};SEQ=${hdr.seq};ANIM=${hdr.anim}`
            + `;CX=${cx};CY=${cy};LEN=${len}\x07`;
        const h = header.length;
        const out = bytes.slice();
        for (let j = base; j < len && j < base + OBUF_SIZE; j++) {
            const o = j - base;
            out[j] = o < h ? header.charCodeAt(o) : bytes[o - h];
        }
        let payload = '';
        for (let j = 0; j < len; j++) payload += String.fromCharCode(out[j]);
        screen = recorder_screen(payload);
    }
    return { cursor: outCursor, screen };
}

// scripts/record-session.mjs payloadToLines + encodeScreenAnsiRle: how
// the recorder stores a payload as a session screen.
function recorder_screen(payload) {
    const lines = payload.split('\n');
    while (lines.length < 24) lines.push('');
    const compressed = lines.slice(0, 24).map((line) => {
        const stripped = line.replace(/ +$/u, '');
        let o = '';
        let i = 0;
        while (i < stripped.length) {
            if (stripped[i] === ' ') {
                const start = i;
                while (i < stripped.length && stripped[i] === ' ') i++;
                const run = i - start;
                o += run >= 5 ? `\x1b[${run}C` : ' '.repeat(run);
            } else {
                o += stripped[i];
                i += 1;
            }
        }
        return o;
    });
    while (compressed.length > 0 && compressed[compressed.length - 1] === '')
        compressed.pop();
    return compressed.join('\n');
}
