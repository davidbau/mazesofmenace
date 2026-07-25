// display.js — Map rendering and terminal output.
// C ref: display.c — newsym, show_glyph, docrt, cls, flush_screen.

import { game } from './gstate.js';
import { rank } from './botl.js';
import { cansee } from './vision.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, DOOR, STAIRS,
    HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    D_NODOOR, D_ISOPEN, D_CLOSED, D_LOCKED, D_BROKEN, SDOOR,
} from './const.js';
import { nhgetch } from './input.js';
import { def_monsyms, def_oc_syms } from './drawing_data.js';
import { NO_COLOR, CLR_GRAY, CLR_BROWN, CLR_WHITE, CLR_YELLOW, DEC_TO_UNICODE } from './terminal.js';

// ── ANSI color codes ──
// Maps CLR_* constants (0-15) to ANSI SGR color codes.
// C ref: wintty.c term_start_color
const ANSI_DEFAULT = 39;
const ANSI_COLOR = [
    30,  // CLR_BLACK     0
    31,  // CLR_RED       1
    32,  // CLR_GREEN     2
    33,  // CLR_BROWN     3
    34,  // CLR_BLUE      4
    35,  // CLR_MAGENTA   5
    36,  // CLR_CYAN      6
    37,  // CLR_GRAY      7
    39,  // NO_COLOR      8 → default
    91,  // CLR_ORANGE    9
    92,  // CLR_BRIGHT_GREEN  10
    93,  // CLR_YELLOW    11
    94,  // CLR_BRIGHT_BLUE   12
    95,  // CLR_BRIGHT_MAGENTA 13
    96,  // CLR_BRIGHT_CYAN   14
    97,  // CLR_WHITE     15
];

// ── Terrain to display character + color + DEC flag ──
function terrain_glyph(loc, x, y) {
    const typ = loc.typ;
    switch (typ) {
    case STONE:     return { ch: ' ', color: NO_COLOR, dec: false };
    case ROOM:      return { ch: '~', color: NO_COLOR, dec: true };  // DEC middle dot
    case CORR:      return { ch: '#', color: NO_COLOR, dec: false };
    // src/display.c:2324 — '+' when shut, '-'/'|' when open. The open glyphs
    // read backwards from their names: S_vodoor is '-' and S_hodoor is '|'
    // (include/defsym.h:104-105), so the orientation test is inverted.
    //
    // D_NODOOR and D_BROKEN both map to S_ndoor, which defsym.h gives as '.'.
    // Under DECgraphics that renders as the same middle dot the floor uses, so
    // this keeps the floor glyph: substituting a literal '.' cost 24 screens.
    case DOOR:
        if (loc.doormask & D_ISOPEN)
            return loc.horizontal
                ? { ch: '-', color: CLR_BROWN, dec: false }
                : { ch: '|', color: CLR_BROWN, dec: false };
        if (loc.doormask & (D_CLOSED | D_LOCKED))
            return { ch: '+', color: CLR_BROWN, dec: false };
        return { ch: '~', color: NO_COLOR, dec: true };  // S_ndoor
    case STAIRS:
        // Check upstair vs downstair
        if (game.level?.upstair?.x === x && game.level?.upstair?.y === y)
            return { ch: '<', color: CLR_YELLOW, dec: false };
        return { ch: '>', color: CLR_YELLOW, dec: false };
    // Wall types → DEC line-drawing characters
    case HWALL:     return { ch: 'q', color: NO_COLOR, dec: true };  // ─
    case VWALL:     return { ch: 'x', color: NO_COLOR, dec: true };  // │
    case TLCORNER:  return { ch: 'l', color: NO_COLOR, dec: true };  // ┌
    case TRCORNER:  return { ch: 'k', color: NO_COLOR, dec: true };  // ┐
    case BLCORNER:  return { ch: 'm', color: NO_COLOR, dec: true };  // └
    case BRCORNER:  return { ch: 'j', color: NO_COLOR, dec: true };  // ┘
    case CROSSWALL: return { ch: 'n', color: NO_COLOR, dec: true };  // ┼
    case TUWALL:    return { ch: 'v', color: NO_COLOR, dec: true };  // ┴
    case TDWALL:    return { ch: 'w', color: NO_COLOR, dec: true };  // ┬
    case TLWALL:    return { ch: 'u', color: NO_COLOR, dec: true };  // ┤
    case TRWALL:    return { ch: 't', color: NO_COLOR, dec: true };  // ├
    // src/display.c:2304 — a SECRET door looks exactly like the wall it hides
    // in, so it falls through to the HWALL/VWALL case.
    case SDOOR:     return loc.horizontal
                        ? { ch: 'q', color: NO_COLOR, dec: true }   // ─
                        : { ch: 'x', color: NO_COLOR, dec: true };  // │

    default:        return { ch: '?', color: NO_COLOR, dec: false };
    }
}

// ── show_glyph_cell ──
export function show_glyph_cell(x, y, ch, color = NO_COLOR, decgfx = false, attr = 0) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    loc.disp_ch = ch;
    loc.disp_color = color;
    loc.disp_decgfx = !!decgfx;
    loc.disp_attr = attr | 0;
    loc.gnew = 1;
}

// ── newsym ──
export function newsym(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return;

    if (game.u?.ux === x && game.u?.uy === y) {
        // Hero
        show_glyph_cell(x, y, '@', CLR_WHITE, false);
        const tg = terrain_glyph(loc, x, y);
        loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec };
        return;
    }

    // src/display.c newsym() picks in priority order: hero, then monster, then
    // object, then trap, then terrain. Only the cell in sight is redrawn; a
    // remembered glyph is what the hero recalls of somewhere no longer visible.
    if (cansee(x, y)) {
        const mon = (game.level?.monsters || [])
                        .find(m => m.mx === x && m.my === y && m.mhp > 0
                                   && !m.msleeping_hidden);
        if (mon) {
            show_glyph_cell(x, y, def_monsyms[mon.data.mlet] || '?',
                            mon.data.mcolor ?? NO_COLOR, false);
            return;
        }

        /* C shows the TOP of the pile, and our object list is newest-first
           (place_object prepends), so the first match is the top. */
        const obj = (game.level?.objects || [])
                        .find(o => o.ox === x && o.oy === y);
        if (obj) {
            const oc = game.objects?.[obj.otyp];
            show_glyph_cell(x, y, def_oc_syms[obj.oclass] || '?',
                            oc?.oc_color ?? NO_COLOR, false);
            return;
        }
    }

    const tg = terrain_glyph(loc, x, y);
    // Only update display/memory if cell is IN_SIGHT (lit and visible)
    if (cansee(x, y)) {
        show_glyph_cell(x, y, tg.ch, tg.color, tg.dec);
        if (game.level?.flags?.hero_memory) {
            loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec };
        }
    } else if (loc.remembered_glyph) {
        // Out of sight but remembered — show remembered glyph
        show_glyph_cell(x, y, loc.remembered_glyph.ch,
            loc.remembered_glyph.color, loc.remembered_glyph.decgfx);
    }
}

// ── docrt ──
export async function docrt() {
    if (!game.level) return;
    for (let y = 0; y < ROWNO; y++)
        for (let x = 1; x < COLNO; x++) {
            const loc = game.level.at(x, y);
            if (loc?.remembered_glyph) {
                show_glyph_cell(x, y, loc.remembered_glyph.ch,
                    loc.remembered_glyph.color, loc.remembered_glyph.decgfx);
            }
        }
    if (game.u?.ux > 0) show_glyph_cell(game.u.ux, game.u.uy, '@', CLR_WHITE, false);
}

// ── Serialize a map row with DEC line-drawing and ANSI colors ──
function render_map_row(y) {
    if (!game.level) return '';
    let firstCol = -1, lastCol = -1;
    for (let x = 1; x < COLNO; x++) {
        const loc = game.level.at(x, y);
        if (loc?.disp_ch && loc.disp_ch !== ' ') {
            if (firstCol < 0) firstCol = x;
            lastCol = x;
        }
    }
    if (firstCol < 0) return '';

    let output = '';
    let activeColor = ANSI_DEFAULT;  // default
    let activeDec = false;

    // Leading gap
    const gap = firstCol - 1;
    if (gap > 4) output += `\x1b[${gap}C`;
    else if (gap > 0) output += ' '.repeat(gap);

    for (let x = firstCol; x <= lastCol; x++) {
        const loc = game.level.at(x, y);
        const ch = loc?.disp_ch ?? ' ';
        const color = loc?.disp_color ?? NO_COLOR;
        const dec = !!loc?.disp_decgfx;

        if (ch === ' ') {
            // Space runs
            let run = 1;
            while (x + run <= lastCol && (game.level.at(x + run, y)?.disp_ch ?? ' ') === ' ') run++;
            if (activeDec) { output += '\x0f'; activeDec = false; }
            if (run > 4) output += `\x1b[${run}C`;
            else output += ' '.repeat(run);
            x += run - 1;
            continue;
        }

        let wantAnsi = ANSI_COLOR[color] ?? ANSI_DEFAULT;
        if (wantAnsi !== activeColor) {
            output += `\x1b[${wantAnsi}m`;
            activeColor = wantAnsi;
        }

        // DEC mode switching
        if (dec && !activeDec) { output += '\x0e'; activeDec = true; }
        else if (!dec && activeDec) { output += '\x0f'; activeDec = false; }

        output += ch;
    }

    // Reset state at end of row (C does per-row SO/SI)
    if (activeColor !== ANSI_DEFAULT) output += `\x1b[${ANSI_DEFAULT}m`;
    if (activeDec) output += '\x0f';

    return output;
}

// src/botl.c:20 get_strength_str() — Strength above 18 prints as 18/xx.
//
// include/attrib.h:36-37: STR18(x) is 18+x and STR19(x) is 100+x, so a stored
// 19 means 18/01 and a stored 119 means 19. Printing the raw number showed
// "St:19" where C shows "St:18/01" — the value was right, the rendering wasn't.
function get_strength_str() {
    const STR18 = (x) => 18 + x;
    const st = game.u.acurr?.a?.[0] ?? 0;   /* A_STR */

    if (st > 18) {
        if (st > STR18(100))
            return String(st - 100);
        else if (st < STR18(100))
            return `18/${String(st - 18).padStart(2, '0')}`;
        else
            return '18/**';
    }
    return String(st);
}

// ── Status lines ──
function _statusLine1() {
    const u = game.u;
    if (!u) return '';
    /* src/botl.c:989 — the status line capitalises the first letter of the
       name; svp.plname itself is left as the player typed it. */
    const rawname = game.plname || 'Hero';
    const name = rawname.charAt(0).toUpperCase() + rawname.slice(1);
    /* src/botl.c rank() — the status line shows the RANK for the hero's
       experience level, not the role name. This read urole.rank.m, which only
       worked against the stub role record that used to be installed here. */
    const role = rank();
    const title = `${name} the ${role}`;
    /* src/botl.c:87 — u.acurr.a[] is indexed by the include/attrib.h enum
       (A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA), which is NOT the order the
       status line prints them in. This used to read a[0..5] straight through,
       which only worked while the values were a hardcoded array already
       written in display order. */
    const A_STR = 0, A_INT = 1, A_WIS = 2, A_DEX = 3, A_CON = 4, A_CHA = 5;
    const at = (i) => u.acurr?.a?.[i] ?? '?';
    const stats = `St:${get_strength_str()} Dx:${at(A_DEX)} Co:${at(A_CON)} `
                + `In:${at(A_INT)} Wi:${at(A_WIS)} Ch:${at(A_CHA)}`;
    const align = u.ualign?.type === 0 ? 'Neutral' : u.ualign?.type > 0 ? 'Lawful' : 'Chaotic';
    // C uses cursor-forward for gap between title and stats
    // C pads to align stats starting at a fixed column
    const gap = Math.max(1, 31 - title.length);
    if (gap > 4) return `${title}\x1b[${gap}C${stats} ${align}`;
    return `${title}${' '.repeat(gap)}${stats} ${align}`;
}

function _statusLine2() {
    const u = game.u;
    if (!u) return '';
    /* src/botl.c bot2str() — BL_EXP is only appended when flags.showexp is on,
       and BL_TIME only when flags.time is. Both default OFF; seed8000's rc
       happens to turn them on, which is what made hardcoding them look right. */
    const f = game.flags || {};
    let s = `Dlvl:${u.uz?.dlevel || 1} $:${game._goldCount || 0}`
          + ` HP:${u.uhp || 0}(${u.uhpmax || 0})`
          + ` Pw:${u.uen || 0}(${u.uenmax || 0})`
          + ` AC:${u.uac ?? 0}`
          + ` Xp:${u.ulevel || 1}`;
    if (f.showexp) s += `/${u.uexp || 0}`;
    if (f.time) s += ` T:${game.moves || 1}`;
    return s;
}

// ── Serialize terminal grid for screen comparison ──
export function serialize_terminal_grid(display) {
    let output = '';
    let lastRow = 0;
    for (let r = 0; r < display.rows; r++) {
        for (let c = 0; c < display.cols; c++) {
            if (display.grid[r][c].ch !== ' ') { lastRow = r; break; }
        }
    }
    for (let r = 0; r <= lastRow; r++) {
        let lastCol = -1;
        for (let c = display.cols - 1; c >= 0; c--) {
            if (display.grid[r][c].ch !== ' ') { lastCol = c; break; }
        }
        if (lastCol < 0) { if (r < lastRow) output += '\n'; continue; }
        let firstCol = 0;
        for (let c = 0; c <= lastCol; c++) {
            if (display.grid[r][c].ch !== ' ') { firstCol = c; break; }
        }
        if (firstCol > 4) output += `\x1b[${firstCol}C`;
        else if (firstCol > 0) output += ' '.repeat(firstCol);
        for (let c = firstCol; c <= lastCol; c++) output += display.grid[r][c].ch;
        if (r < lastRow) output += '\n';
    }
    return output;
}

// ── Build screen output ──
function _buildScreenOutput() {
    const display = game?.nhDisplay;
    if (!display) return;

    let output = '';
    // Row 0: message
    output += (game._pending_message || '') + '\n';

    // Rows 1-21: map (rendered with DEC + ANSI, per-row SO/SI)
    for (let y = 0; y < ROWNO; y++) {
        output += render_map_row(y) + '\n';
    }

    // Row 22-23: status
    output += _statusLine1() + '\n';
    output += _statusLine2();

    game._screen_output = output;

    // Also write to grid for serialize_terminal_grid
    if (display.grid) {
        display.clearScreen();
        // Message line
        const msg = game._pending_message || '';
        for (let c = 0; c < Math.min(msg.length, display.cols); c++)
            display.setCell(c, 0, msg[c], NO_COLOR, 0);
        // Map — write characters to grid (DEC → Unicode for browser display)
        for (let y = 0; y < ROWNO; y++) {
            for (let x = 1; x < COLNO; x++) {
                const loc = game.level?.at(x, y);
                if (!loc?.disp_ch || loc.disp_ch === ' ') continue;
                const ch = loc.disp_decgfx ? (DEC_TO_UNICODE[loc.disp_ch] || loc.disp_ch) : loc.disp_ch;
                display.setCell(x - 1, y + 1, ch, loc.disp_color ?? NO_COLOR, loc.disp_attr ?? 0);
            }
        }
        // Status lines
        const s1 = _statusLine1().replace(/\x1b\[[0-9;]*[A-Za-z]/g, m =>
            m.match(/\x1b\[\d+C/) ? ' '.repeat(parseInt(m.slice(2))) : '');
        for (let c = 0; c < Math.min(s1.length, display.cols); c++)
            display.setCell(c, 22, s1[c], NO_COLOR, 0);
        const s2 = _statusLine2();
        for (let c = 0; c < Math.min(s2.length, display.cols); c++)
            display.setCell(c, 23, s2[c], NO_COLOR, 0);
        // Cursor at hero
        if (game.u?.ux > 0)
            display.setCursor(game.u.ux - 1, game.u.uy + 1);
    }
}

// ── flush_screen ──
export async function flush_screen(mode) {
    _buildScreenOutput();
}

// ── cls ──
export async function cls() {
    const display = game?.nhDisplay;
    if (display?.clearScreen) display.clearScreen();
    game._pending_message = '';
}

// ── bot ──
export async function bot() {
    // Status line updates happen in _buildScreenOutput
}

// include/wintty.h:85 — toplin states. NEED_MORE is 1 and NON_EMPTY is 2, the
// opposite of what their order in the header suggests.
export const TOPLINE_EMPTY = 0, TOPLINE_NEED_MORE = 1, TOPLINE_NON_EMPTY = 2;

const defmorestr = '--More--';

// ── pline ──
//
// win/tty/topl.c update_topl() ends with `ttyDisplay->toplin =
// TOPLINE_NEED_MORE`, so EVERY message leaves the top line needing
// acknowledgement. The next thing that blocks calls more(), which draws
// "--More--" and CONSUMES A KEY. Without that, the key meant for the --More--
// is read by whatever comes next — which is how the tutorial menu ended up on
// its second pass.
export async function pline(msg) {
    game._pending_message = msg;
    game._toplin = msg ? TOPLINE_NEED_MORE : TOPLINE_EMPTY;
}

// win/tty/topl.c more() — draw the suffix, block for a key, clear the top line.
//
//     tty_curs(BASE_WINDOW, cw->curx + 1, cw->cury);
//     if (cw->curx >= CO - 8) topl_putsym('\n');
//     putsyms(defmorestr);
//     xwaitforspace("\033 ");
//     ...
//     ttyDisplay->toplin = TOPLINE_EMPTY;
//
// The suffix is appended at the message's own end column with NO separating
// space, and wraps to the next row only when that column is within 8 of the
// right edge.
export async function more() {
    /* C has already painted the message and the map by the time more() runs —
       pline() writes straight to the tty and the map was drawn by docrt. This
       port defers both to _buildScreenOutput(), so bring the screen up to date
       before appending the suffix, or the frame captured inside the wait shows
       the suffix alone. */
    _buildScreenOutput();

    const display = game?.nhDisplay;
    const msg = game._pending_message || '';
    if (display) {
        const CO = display.cols ?? 80;
        let col = msg.length, row = 0;
        if (col >= CO - 8) { col = 0; row = 1; }
        for (let i = 0; i < defmorestr.length && col + i < CO; i++)
            display.setCell(col + i, row, defmorestr[i], NO_COLOR, 0);
        display.setCursor(Math.min(col + defmorestr.length, CO - 1), row);
    }
    await nhgetch();
    game._toplin = TOPLINE_EMPTY;
    game._pending_message = '';
}
