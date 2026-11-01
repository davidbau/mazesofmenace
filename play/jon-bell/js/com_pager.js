// @ts-nocheck
// com_pager.js — Minimal port of questpgr.c com_pager("legacy") for newgame Book intro.
// C ref: nethack-c/src/questpgr.c:624 com_pager(), 468 com_pager_core()
//        nethack-c/src/allmain.c:911-913 — if (flags.legacy) com_pager(...)
//        nethack-c/dat/quest.lua:135-155  — legacy / pauper_legacy text
//
// DESIGN CONSTRAINT: Only imports symbols that exist on main's current modules.
// Verified exports: game(gstate.js), nhgetch(input.js), COLNO/ROWNO(const.js),
//                   NO_COLOR(terminal.js).
// Does NOT import from display.js — render_map_row is inlined below.
import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { rank_of, role_index_by_name } from './rank_data.js';
import { COLNO, ROWNO, A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA, gs, PRIMARYSET, H_UTF8 } from './const.js';
import { acurr } from './attrib.js';
import { describe_level_buf } from './dungeon.js';
// WRITE-ONLY route-attribution telemetry (inert unless NH_ROUTE_TELEMETRY=1 —
import { routeTag } from './route_telemetry.js';
import { NO_COLOR, CLR_WHITE } from './terminal.js';
import { pmatchi } from './strutil.js';
import { menu_heading_text } from './tty_menu.js'; /* C strutil.c:151 — MENU_SEARCH's matcher */
// putmsghistory: feed the quest synopsis into the ^P message-history ring.
import { putmsghistory, tty_getlin_prompt, _strengthStr, force_more, force_more_pages, await_more_dismiss, docorner_blank_utf8_captures, unflushed_forced_cell, levelgen_frozen_cell,
         await_topl_more_dismiss, pline_flush_point, docorner_status_row,
         botl_pmname, botl_upstart_words, botl_mon_mlevel, botl_title, botl_status1_tail, botl_frozen_status_line,
         gold_status_char, dec_mode, generic_symset, rogue_graphics, rogue_hero_showrace_cell, rogue_ibm_color, botl_status_suffix, fit_status_line_width, status_row_finish, _statusRows3, _threeStatusLines, docrt_flags, docrt, flush_screen, use_last_flush_snapshot, hitpointbar_status1, _hilite_status_wrap, _status_sgr, _status_row1_map_overlay, _status_row1_whole_with_tail } from './display.js';
// ── ANSI color helpers (inlined from display.js — not exported there) ──
const ANSI_DEFAULT = 39;
// C ref: color.h:10-14 — CLR_BLACK(0) renders as bright-black (90); CLR_GRAY(7)
// = "low-intensity white" IS the terminal default foreground (39, not 37).
// NetHack's tty never emits ESC[30m/ESC[37m. Kept in sync with display.js.
const ANSI_COLOR = [
    90, 31, 32, 33, 34, 35, 36, 39, 39, 91, 92, 93, 94, 95, 96, 97,
];
// ── Role god table ──
// C ref: nethack-c/src/role.c roles[] — [lgod, ngod, cgod] in role order.
// Leading '_' indicates goddess (align_gtitle → "goddess").
// Index order: Arc Bar Cav Hea Kni Mon Pri Rog Ran Sam Tou Val Wiz
const ROLE_GODS = [
    ['Quetzalcoatl', 'Camaxtli', 'Huhetotl'], // 0 Arc
    ['Mitra', 'Crom', 'Set'], // 1 Bar
    ['Anu', '_Ishtar', 'Anshar'], // 2 Cav
    ['_Athena', 'Hermes', 'Poseidon'], // 3 Hea
    ['Lugh', '_Brigit', 'Manannan Mac Lir'], // 4 Kni
    ['Shan Lai Ching', 'Chih Sung-tzu', 'Huan Ti'], // 5 Mon
    [null, null, null], // 6 Pri — borrowed from pantheon role; read g.u.lgod
    ['Issek', 'Mog', 'Kos'], // 7 Rog
    ['Mercury', '_Venus', 'Mars'], // 8 Ran
    ['_Amaterasu Omikami', 'Raijin', 'Susanowo'], // 9 Sam
    ['Blind Io', '_The Lady', 'Offler'], // 10 Tou
    ['Tyr', 'Odin', 'Loki'], // 11 Val
    ['Ptah', 'Thoth', 'Anhur'], // 12 Wiz
];
// ── Role rank at level 1 ──
// C ref: nethack-c/src/role.c roles[].ranks[0].{m,f}
const ROLE_RANK1 = [
    { m: 'Digger', f: null }, // 0 Arc
    { m: 'Plunderer', f: 'Plunderess' }, // 1 Bar
    { m: 'Troglodyte', f: null }, // 2 Cav
    { m: 'Rhizotomist', f: null }, // 3 Hea
    { m: 'Gallant', f: null }, // 4 Kni
    { m: 'Candidate', f: null }, // 5 Mon
    { m: 'Aspirant', f: null }, // 6 Pri
    { m: 'Footpad', f: null }, // 7 Rog
    { m: 'Tenderfoot', f: null }, // 8 Ran
    { m: 'Hatamoto', f: null }, // 9 Sam
    { m: 'Rambler', f: null }, // 10 Tou
    { m: 'Stripling', f: null }, // 11 Val
    { m: 'Evoker', f: null }, // 12 Wiz
];
// ── Legacy text templates ──
// C ref: nethack-c/dat/quest.lua:138-154 (legacy), 160-176 (pauper_legacy)
// Format codes: %d=deity name, %G=god/goddess title, %r=rank at ulevel
const LEGACY_TEXT = `It is written in the Book of %d:

    After the Creation, the cruel god Moloch rebelled
    against the authority of Marduk the Creator.
    Moloch stole from Marduk the most powerful of all
    the artifacts of the gods, the Amulet of Yendor,
    and he hid it in the dark cavities of Gehennom, the
    Under World, where he now lurks, and bides his time.

Your %G %d seeks to possess the Amulet, and with it
to gain deserved ascendance over the other gods.

You, a newly trained %r, have been heralded
from birth as the instrument of %d.  You are destined
to recover the Amulet for your deity, or die in the
attempt.  Your hour of destiny has come.  For the sake
of us all:  Go bravely with %d!`;
const PAUPER_LEGACY_TEXT = `It is written in the Book of %d:

    After the Creation, the cruel god Moloch rebelled
    against the authority of Marduk the Creator.
    Moloch stole from Marduk the most powerful of all
    the artifacts of the gods, the Amulet of Yendor,
    and he hid it in the dark cavities of Gehennom, the
    Under World, where he now lurks, and bides his time.

Your %G %d seeks to possess the Amulet, and with it
to gain deserved ascendance over the other gods.

You, an untrained %r, have been unable to adequately
prepare to be the instrument of %d.  Nevertheless, you
are destined to recover the Amulet for your deity, or die
in the attempt.  Your hour of destiny has come.  For the
sake of us all:  Go bravely with %d!`;
// ── Text formatting ──
// C ref: questpgr.c convert_arg('d') → align_gname(u.ualignbase[A_ORIGINAL])
// C ref: questpgr.c convert_arg('G') → align_gtitle(u.ualignbase[A_ORIGINAL])
// C ref: questpgr.c convert_arg('r') → rank_of(u.ulevel, Role_switch, flags.female)
function format_legacy_text(template, roleIdx, alignType, female) {
    // Get god name: alignType: >0=lawful(0), 0=neutral(1), <0=chaotic(2)
    const godIdx = alignType > 0 ? 0 : alignType === 0 ? 1 : 2;
    let godEntry = (roleIdx >= 0 && roleIdx <= 12) ? (ROLE_GODS[roleIdx][godIdx] || null) : null;
    // Priest (roleIdx=6) borrows pantheon gods — read from game.u if available
    if (roleIdx === 6 && !godEntry) {
        const u = game.u;
        if (alignType > 0 && u?.lgod)
            godEntry = u.lgod;
        else if (alignType === 0 && u?.ngod)
            godEntry = u.ngod;
        else if (u?.cgod)
            godEntry = u.cgod;
    }
    // Strip leading '_' for display; '_' indicates goddess
    const isGoddess = godEntry?.startsWith('_') ?? false;
    const godName = godEntry ? godEntry.replace(/^_/, '') : '(unknown)';
    // align_gtitle: "god" or "goddess"
    // C ref: role.c align_gtitle — checks the god's name prefix '_' relative to alignment
    const godTitle = isGoddess ? 'goddess' : 'god';
    // Rank at level 1
    const rankEntry = (roleIdx >= 0 && roleIdx <= 12) ? ROLE_RANK1[roleIdx] : null;
    const rankName = rankEntry ? (female && rankEntry.f ? rankEntry.f : rankEntry.m) : 'Adventurer';
    return template
        .replace(/%d/g, godName)
        .replace(/%G/g, godTitle)
        .replace(/%r/g, rankName);
}
// ── Map row rendering (inlined from display.js render_map_row, not exported there) ──
// Renders one map row, clipped to columns 1..clipX (1-indexed, inclusive).
// Returns { str: string, endCol: number } where endCol is the 0-indexed column
// after the last character rendered.
function render_map_row_clipped(y, clipX) {
    /* A dismissed legacy window's docorner() repaints the map rows it covered
     * (wintty.c tty_dismiss_nhwindow, ymax = maxrow+1) even after read_wizkit()
     * blanked the terminal: js/com_pager.js sets `_map_corner`. */
    if (!game.level || (game._map_blanked
        && !(game._map_corner && y + 1 < game._map_corner.ymax)))
        return { str: '', endCol: 0 };
    /* RogueEpyx S_human = \x01 (dat/symbols): a control byte puts no glyph on
     * the terminal, so the hero's square keeps what the physical screen held
     * (blank after a cls) -- the same rule as js/display.js _snapCellAt. */
    const cellAt = (x) => {
        const loc = game.level.at(x, y);
        const held = unflushed_forced_cell(x, y) ?? levelgen_frozen_cell(x, y);
        if (held) return { disp_ch: held.ch, disp_color: held.color,
                           disp_decgfx: held.dec, disp_attr: held.attr };
        if (loc?.disp_capture_cell) {
            const p = loc.disp_capture_cell;
            return { disp_ch: p.ch, disp_color: p.color,
                     disp_decgfx: p.dec, disp_attr: p.attr };
        }
        if (loc?.disp_ch === '\x01') {
            const p = game._epyxPhys?.get(y * COLNO + x);
            return { disp_ch: p?.ch ?? ' ', disp_color: p?.color ?? NO_COLOR,
                     disp_decgfx: !!p?.dec, disp_attr: p?.attr | 0 };
        }
        return loc;
    };
    // Find visible range within [1, clipX]
    let firstCol = -1, lastCol = -1;
    for (let x = 1; x <= clipX && x < COLNO; x++) {
        const loc = cellAt(x);
        /* wintty.c:3930-3964 prints inverse spaces too (a sensed ghost/shade) */
        /* C wintty.c:3930-3964 paints an ATR_INVERSE blank (sensed ghost/shade),
         * so it bounds the row like any glyph (js/display.js render_map_row). */
        if (loc?.disp_ch && (loc.disp_ch !== ' ' || ((loc.disp_attr | 0) & 1))) {
            if (firstCol < 0)
                firstCol = x;
            lastCol = x;
        }
    }
    if (firstCol < 0)
        return { str: '', endCol: 0 };
    let output = '';
    let activeColor = ANSI_DEFAULT;
    let activeDec = false;
    let activeInverse = false;
    /* C display.c:3077-3081 / symbols.c:217-233 — on a Rogue level every glyph
     * colour is NO_COLOR and the symbols are plain ASCII (no DEC mode), unless
     * has_rogue_color keeps them (HAS_ROGUE_IBM_GRAPHICS, display.c:2582-2587). */
    const rogueMap = rogue_graphics();
    const rogueColor = rogue_ibm_color();
    const gap = firstCol - 1;
    if (gap > 4)
        output += `\x1b[${gap}C`;
    else if (gap > 0)
        output += ' '.repeat(Math.max(0, gap));
    for (let x = firstCol; x <= lastCol; x++) {
        const loc = cellAt(x);
        const ch = loc?.disp_ch ?? ' ';
        const color = ((rogueMap && !rogueColor) || (((game._gm_corner && x >= game._gm_corner.col - 1 && y + 1 < game._gm_corner.rows)
                ? game.iflags?.use_color : (game._gm_use_color ?? game.iflags?.use_color)) === false))
            ? ((rogueMap && !rogueColor && rogue_hero_showrace_cell(x, y)) ? CLR_WHITE : NO_COLOR)
            : (loc?.disp_color ?? NO_COLOR);
        /* C termcap.c g_putch/SYMHANDLING(H_DEC) decides the SO shift when a cell is
         * (re)printed.  After handler_symset leaves DEC, rows no window has been
         * dismissed over since still hold their old SO-shifted bytes (game._decStaleFrom);
         * a repainted row prints the stored char raw. */
        const dec = !rogueMap && !!loc?.disp_decgfx
            && (dec_mode() || generic_symset() || (game._decStaleFrom != null && y + 1 >= game._decStaleFrom));
        const inverse = !!((loc?.disp_attr | 0) & 1 /* ATR_INVERSE */);
        /* A blank glyph carrying ATR_INVERSE (a sensed ghost, S_ghost ' ' with
         * the detected-monster highlight) is a painted glyph in C, not a gap
         * (same rule as js/display.js render_map_row). */
        /* A blank with ATR_INVERSE (MG_DETECT / MG_BW_* highlight on a dark-part
         * or stone glyph) is a painted cell in C, not a gap (wintty.c:3927). */
        if (ch === ' ' && !inverse) {
            // A blank map cell (S_stone / dark void) is always emitted at the
            // terminal default color in C, and the reset is written BEFORE the
            // blank run — `\e[33m+\e[39m\e[5C`, not `\e[33m+\e[5C\e[39m`.  This
            // is the same close-the-color-run-first rule js/display.js
            // render_map_row() has always applied (js/display.js:1806-1814);
            // this clipped fork of it had dropped the reset entirely, so the
            // preceding glyph's color stayed open across the cursor-forward.
            // whose yellow '+' door at col 53 is followed by a 5-cell gap, and
            // that byte-ordering was the whole render divergence there.
            if (activeInverse) {
                output += '\x1b[0m'; /* close inverse (resets color+dec too) */
                activeInverse = false; activeColor = ANSI_DEFAULT;
            }
            if (activeColor !== ANSI_DEFAULT) {
                output += `\x1b[${ANSI_DEFAULT}m`;
                activeColor = ANSI_DEFAULT;
            }
            let run = 1;
            while (x + run <= lastCol && (cellAt(x + run)?.disp_ch ?? ' ') === ' '
                   && !((cellAt(x + run)?.disp_attr | 0) & 1))
                run++;
            if (activeDec) {
                output += '\x0f';
                activeDec = false;
            }
            if (run > 4)
                output += `\x1b[${run}C`;
            else
                output += ' '.repeat(Math.max(0, run));
            x += run - 1;
            continue;
        }
        /* Same as js/display.js render_map_row: the recorded screen collapses a
         * run of five or more ATR_INVERSE blanks into \e[7m\e[<n>C\e[0m, which
         * the decoder leaves unpainted. */
        if (ch === ' ' && inverse) {
            let irun = 1;
            while (x + irun <= lastCol && (cellAt(x + irun)?.disp_ch ?? ' ') === ' '
                   && ((cellAt(x + irun)?.disp_attr | 0) & 1))
                irun++;
            if (irun > 4) {
                if (activeDec) { output += '\x0f'; activeDec = false; }
                output += `\x1b[7m\x1b[${irun}C\x1b[0m`;
                activeInverse = false; activeColor = ANSI_DEFAULT;
                x += irun - 1;
                continue;
            }
        }
        if (!inverse && activeInverse) {
            output += '\x1b[0m';
            activeInverse = false; activeColor = ANSI_DEFAULT;
            if (activeDec) { output += '\x0f'; activeDec = false; }
        }
        /* C emits the inverse SGR before the colour (term_start_attr precedes
         * the colour set), so a highlighted glyph is \e[7m\e[94m<dec><ch>. */
        if (inverse && !activeInverse) {
            output += '\x1b[7m';
            activeInverse = true;
        }
        const wantAnsi = ANSI_COLOR[color] ?? ANSI_DEFAULT;
        /* petattr:underline / bold (terminal.js attr 4 / 2): SGR fused with the
         * colour and closed by \e[0m right after the glyph, as display.js does. */
        const sgrA = inverse ? 0 : (((loc?.disp_attr | 0) & 2) ? 1 : (((loc?.disp_attr | 0) & 4) ? 4 : 0));
        if (sgrA) {
            output += `\x1b[${sgrA};${wantAnsi}m`;
            activeColor = wantAnsi;
        }
        else if (wantAnsi !== activeColor) {
            output += `\x1b[${wantAnsi}m`;
            activeColor = wantAnsi;
        }
        if (dec && !activeDec) {
            output += '\x0e';
            activeDec = true;
        }
        else if (!dec && activeDec) {
            output += '\x0f';
            activeDec = false;
        }
        output += ch;
        if (sgrA) {
            if (activeDec) { output += '\x0f'; activeDec = false; }
            output += '\x1b[0m';
            activeColor = ANSI_DEFAULT;
        }
        if (inverse) {
            /* close the inverse run immediately after the glyph (C emits \e[0m
             * right after it); that reset drops colour + DEC state too. */
            if (activeDec) { output += '\x0f'; activeDec = false; }
            output += '\x1b[0m';
            activeInverse = false; activeColor = ANSI_DEFAULT;
        }
    }
    if (activeInverse) {
        output += '\x1b[0m';
        activeInverse = false; activeColor = ANSI_DEFAULT;
    }
    if (activeColor !== ANSI_DEFAULT)
        output += `\x1b[${ANSI_DEFAULT}m`;
    if (activeDec)
        output += '\x0f';
    // endCol: 0-indexed column right after last rendered character (lastCol is 1-indexed)
    const endCol = lastCol; // 0-indexed position = lastCol (1-indexed)-1+1 = lastCol
    return { str: output, endCol };
}
// ── Build window-overlay screen ──
// C ref: tty_display_nhwindow (NHW_MENU) — renders map underneath, window text on top.
// WIN_COL: 0-indexed column where window text starts.
// Lines with 4 leading spaces are rendered at WIN_COL+4.
// Lines without indent are rendered at WIN_COL.
// --More-- appended as the last line.
// uacStep0: the u.uac value to use for status line 2 (pre-find_ac = 0 in C at step 0).
//
// Key invariant: for ALL rows within the window (screenRow < winRows), the map is
// clipped to WIN_COL-1 (1-indexed). C erases the window region for EVERY window row,
// even blank ones. Only rows BELOW the window show the full unclipped map.
// Overlay window text at column `col` onto a base status line.  The base line
// renders only its visible content to the LEFT of `col`; from `col` onward the
// window text overwrites it (tty menu-over-status behavior, e.g. the player
// title shows through to the left of a menu's "(end)" marker).
// `base` may contain ANSI cursor-move escapes (\x1b[NC) and SGR escapes; we walk
// it tracking the visible column and stop emitting once we reach `col`.
export function _overlay_status_line(base, col, text) {
    let out = '';
    let visCol = 0;       // current visible column
    let i = 0;
    // C wintty.c:4969 term_start_attr(ATR_INVERSE) for the status title is
    // closed by term_end_attr(ATR_INVERSE) right after the title's text, before
    // the cursor-forward gap.  A clip that lands inside the inverse run must
    // still leave the terminal in the reset state, or the menu footer written
    // after the clip (and every later blank cell) paints in reverse video.
    let sgrOpen = false;
    let decOpen = false;
    while (i < base.length && visCol < col) {
        const ch = base[i];
        // SO/SI select the glyph set without advancing the tty cursor.
        if (ch === '\x0e' || ch === '\x0f') {
            decOpen = ch === '\x0e';
            out += ch;
            i++;
            continue;
        }
        if (ch === '\x1b' && base[i + 1] === '[') {
            // Parse CSI: \x1b[ ... <final letter>
            let j = i + 2;
            while (j < base.length && !/[A-Za-z]/.test(base[j])) j++;
            const fin = base[j];
            const params = base.slice(i + 2, j);
            if (fin === 'C') {
                // cursor forward N columns
                const n = parseInt(params || '1', 10) || 0;
                // advance, but don't overshoot `col`
                const room = col - visCol;
                if (n <= room) { out += base.slice(i, j + 1); visCol += n; }
                else { /* would overshoot — pad with spaces up to col below */ break; }
            } else {
                // SGR or other: emit as-is (no visible width)
                out += base.slice(i, j + 1);
                if (fin === 'm') sgrOpen = !/^(0)?$/.test(params);
            }
            i = j + 1;
            continue;
        }
        // visible character
        out += ch;
        visCol++;
        i++;
    }
    // The clip ended inside an open SGR run: close it (term_end_attr).
    if (sgrOpen) out += '\x1b[0m';
    // C wintty.c:1886,3724-3730 ends map glyph output before menu text.
    if (decOpen) out += '\x0f';
    // Pad from current visible column up to `col`
    if (visCol < col) {
        const gap = col - visCol;
        if (gap > 4) out += `\x1b[${gap}C`;
        else out += ' '.repeat(Math.max(0, gap));
    }
    out += text;
    return out;
}
export function tty_text_window_utf8_line(line) {
    const row = String(line);
    if (gs.symset?.[rogue_graphics() ? 1 : PRIMARYSET]?.handling !== H_UTF8)
        return row;
    return row.replace(/^((?:\x1b\[[0-9;]*m)*)(.)(.*?)((?:\x1b\[[0-9;]*m)*)$/,
        (_, start, first, rest, end) => ' ' + start + (rest || first) + end);
}
export function build_text_window_screen(lines) {
    const rows = new Array(24).fill('');
    for (let i = 0; i < lines.length && i < 23; i++) {
        /* process_text_window (wintty.c:1810) prints at most cols-1 = 79 chars */
        let row = tty_text_window_utf8_line(lines[i]);
        if (row.length > 79 && !row.includes('\x1b'))
            row = row.slice(0, 79);
        rows[i] = _encode_blank_runs(row.replace(/\s+$/, ''));
    }
    rows[23] = '--More--';
    return rows.join('\n');
}
function _encode_blank_runs(row) {
    return row.replace(/ {5,}/g, (m) => `\x1b[${m.length}C`);
}
export function tty_fit_text_lines(lines) {
    const CO = 80; /* the tty's column count */
    const out = [];
    for (const line of lines) {
        let str = typeof line === 'string' ? line : line.text;
        // C wintty.c:tty_putstr/process_text_window: fit text before applying ATR_BOLD.
        const emit = text => out.push(line.attr === 2 ? '\x1b[1m' + text + '\x1b[0m' : text);
        if (str.length >= CO)
            /* C tty_putstr() calls mungspaces(): tabs become blanks, runs are
             * collapsed, and leading/trailing blanks are removed.  The trim is
             * observable for a long discoveries row whose ordinary "  "
             * encountered marker is squeezed away before wrapping. */
            str = str.replace(/\t/g, ' ').trim().replace(/ {2,}/g, ' ');
        while (str.length >= CO) {
            let i = CO - 1;
            while (i > 0 && str.charAt(i) !== ' ')
                i--;
            /* wintty.c:2412-2419: `if (i)` — with no blank to break at the
             * line is NOT split; process_text_window clips it to cols-1. */
            if (!i)
                break;
            emit(str.slice(0, i));
            str = str.slice(i + 1);
        }
        emit(str);
    }
    return out;
}

export async function display_text_window(lines) {
    const g = game;
    const PAGE_ROWS = 23; /* ttyDisplay->rows - 1 */
    lines = tty_fit_text_lines(lines);
    if (g._pending_message) {
        /* A flush after the snapshot's pline (tmp_at's flush_screen(0) of a
         * missile flash, display.c:1292) is what the tty shows. */
        const _snapStale = g._paintedSnapshot?.epoch !== undefined
            && (g._lastFlushFrame?.epoch | 0) > g._paintedSnapshot.epoch;
        const releaseFlush = (g._paintedSnapshot && !_snapStale) ? () => {} : use_last_flush_snapshot();
        await force_more_pages(g._pending_message, true, true);
        releaseFlush();
    } else if (g._resultMessage) {
        const releaseFlush = use_last_flush_snapshot();
        await force_more(g._resultMessage);
        releaseFlush();
        g._resultMessage = '';
        g._resultMessageJoins = null;
    }
    const pages = [];
    for (let i = 0; i < lines.length; i += PAGE_ROWS)
        pages.push(lines.slice(i, i + PAGE_ROWS));
    if (!pages.length)
        pages.push([]);
    for (const page of pages) {
        g._pending_message = '';
        let morc = 0;
        for (;;) {
            g._screen_output = build_text_window_screen(page);
            const disp = g?.nhDisplay;
            if (disp) { disp.cursorCol = '--More--'.length; disp.cursorRow = PAGE_ROWS; }
            const raw = await nhgetch();
            const k = typeof raw === 'number' ? raw : (raw?.charCodeAt(0) ?? 0);
            /* C ref: xwaitforspace(quitchars) — '\n' always returns; otherwise
             * only a quitchars[] member (decl.c:96 " \r\n\033") or
             * ttyDisplay->dismiss_more (' ') dismisses, anything else rings the
             * bell and re-reads. */
            if (k === 27) g._ttyDismissMore = 1;     /* getline.c:245-247 */
            if (k === 32 || k === 10 || k === 13 || k === 27
                || (k !== 0 && k === (g._ttyDismissMore | 0))) { morc = k; break; }
        }
        if (morc === 27) /* WIN_CANCELLED — skip the rest of the window */
            break;
    }
    // C tty_dismiss_nhwindow: after game-window teardown, leave the final
    // text visible instead of erasing it and redrawing the destroyed map.
    // With live windows, erase_menu_or_text still redraws vision/monsters.
    if (g.iflags.window_inited) {
        await docrt(false, g._screen_output);
        /* erase_menu_or_text (wintty.c:975-976): docrt(); flush_screen(1) with bot()
         * enabled — the pending BL_RESET status rewrite precedes the map print. */
        game._docrtMapAfterBot = true;
        try { await flush_screen(1); } finally { game._docrtMapAfterBot = false; }
    }
}
/* True when the physical frame still holds a getlin prompt that topl_putsym
 * hard-wrapped onto row 1 (text over the map's top row, not the map itself). */
export function prompt_spilled_onto_row1() {
    const rows = typeof game._screen_output === 'string'
        ? game._screen_output.split('\n') : null;
    /* topl_putsym wraps only at column CO-1, so row 0 must be full (display.js _topl_hardwrap breaks past 78 visual cols). */
    /* A --More-- that more() wrapped onto row 1 (topl.c:218-220) is not a
     * spill: its dismissal runs docorner(1, cury + 1, 0) (topl.c:237-238),
     * whose row_refresh repaints the map row. */
    return !!(rows && rows[0] && rows[1]
        && rows[0].replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').length >= 78
        && rows[1].replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').trim() !== '--More--'
        && rows[1] !== render_map_row_clipped(0, COLNO - 1).str);
}
export function build_window_screen(windowLines, WIN_COL, uacStep0, statusClipArg, pwOverride,
                                    fullScreen = false, mapClipExtra = 0, clipRow23 = false, clipMaxRow = 23) {
    let statusClipCol = statusClipArg;
    const _prevRows = (typeof game._screen_output === 'string')
        ? game._screen_output.split('\n') : null;
    /* wintty.c:4289-4298 / 3814: with statuslines:3 the status rows are
     * 21/22/23 and the map loses its last row. */
    const rows3 = _threeStatusLines();
    /* C ref: allmain.c:891 bot() ran before u_init's ini_inv, so the legacy
     * step-0 frame (the only caller passing pwOverride) paints row 23's
     * weapon/armor fields from an empty equipment set — "Bare-hnds Naked".
     * Same flag as the menu path below (line ~1049); display.js _equipView() reads it. */
    const _preInvRows3 = rows3 && pwOverride !== undefined;
    if (_preInvRows3) game._botlPreInv = true;
    /* Same frame, same stale bot(): u_init.c:1410-1411's starting-Pw boost ran
     * after allmain.c:891's paint, so row 22 keeps the pre-boost Pw exactly as
     * the two-line arm's pwOverride does.  Paint it via the stale-Pw slots. */
    const _savedPw = _preInvRows3 ? [game._botlStaleUen, game._botlStaleUenmax] : null;
    if (_preInvRows3 && _savedPw[0] === undefined && _savedPw[1] === undefined) {
        game._botlStaleUen = pwOverride.uen;
        game._botlStaleUenmax = pwOverride.uenmax;
    }
    let st3 = null;
    try { st3 = rows3 ? _statusRows3() : null; }
    finally {
        if (_preInvRows3) {
            game._botlPreInv = false;
            [game._botlStaleUen, game._botlStaleUenmax] = _savedPw;
        }
    }
    const rowStatus = (r) => docorner_status_row(r, rows3 ? _status_sgr(st3[r - 21])
        : (r === 22 ? _statusLine1() : _statusLine2(uacStep0, pwOverride)));
    const statusStillBlank = (game._statusBlankAfterDocrt === true && statusClipCol == null)
        || (!!_prevRows && _prevRows.length >= 24
        && (rows3 ? _prevRows[21] === '' : true)
        && _prevRows[22] === '' && _prevRows[23] === '' && statusClipCol == null
        && _prevRows.slice(1, 22).some((r) => r.includes('\x0e')
            || (r.trim() !== '' && r.trim() !== '--More--')));
    const winRows = windowLines.length;
    // CLIP_X: 1-indexed max map column to render when window covers this row.
    const CLIP_X = WIN_COL - 1 + mapClipExtra;
    // statusClipCol: when a TALLER window was just dismissed and a SHORTER
    // window (e.g. itemactions over the inventory menu) is now displayed, the
    // dismiss docorner() cleared the corner from the prior window's column
    // (C ref: tty docorner xmin = prior_offx).  Status line 1 (row 22), which
    // sits below the shorter window but within the prior window's cleared row
    // span, keeps only its leftmost `statusClipCol` visible columns; the rest
    // stays blank until repainted.  Status line 2 (row 23) is fully redrawn by
    // bot().  When undefined, no clipping (the normal full-status case).
    let output = '';
    for (let screenRow = 0; screenRow <= 23; screenRow++) {
        /* docorner's erase loop stops at ymax-1 (wintty.c:3684): rows below the
         * dismissed window's last row keep their status text. */
        statusClipCol = screenRow > clipMaxRow ? undefined : statusClipArg;
        /* docorner() of a menu ending at row 20 erases only the first of three
         * status rows (wintty.c:3650-3684); rows 22/23 stay whole. */
        if (game._statusClipFirstRowOnly && rows3)
            statusClipCol = screenRow === 21 ? statusClipArg : undefined;
        const inWindow = screenRow < winRows;
        const winLine = inWindow ? windowLines[screenRow] : null;
        if (screenRow === 0) {
            // Row 0: message line. No map. Window text starts at WIN_COL.
            if (winLine) {
                const indent = (winLine.match(/^ +/) || [''])[0].length;
                const col = WIN_COL + indent;
                const text = winLine.trim();
                // The topline shows through to the LEFT of the window, exactly
                // as the status line does at row 22 below.  C's tty writes each
                // window row as
                //     tty_curs(window, 1, n);  /* -> screen col offx = col-1 */
                //     cl_end();                /* erase offx..79             */
                //     putstr at offx+1 = col
                // (wintty.c:1499-1520 process_text_window), so nothing left of
                // offx is touched and whatever the message row physically held
                // getpos autodescribe line ("staircase up") is still standing
                // at column 0 in C's frame when look_here's pile window opens
                // at column 40; this port blanked it.
                //
                // The source is the same paint-time pair js/display.js
                // _buildScreenOutput reads — a live _pending_message first,
                // then the _topl_sticky fallback for text C left physically on
                // the terminal after our per-read clear dropped it.
                // A message plined after an ESC'd --More-- is swallowed by
                // WIN_STOP (wintty.c tty_putstr / topl.c more():232-235) and
                // never reaches the terminal, so the row is physically blank
                // blowing you a kiss..." is held in _pending_message only).
                const topl = String((game._topl_win_stop ? '' : game._pending_message)
                                    || game._topl_sticky
                                    || '').replace(/\s+$/, '');
                const left = topl.slice(0, Math.max(0, col - 1));
                output += left;
                const gap = col - left.length;
                // cl_end() ERASES the cells between the surviving topline text
                // and the window's first column, so they must stay UNPAINTED —
                // hence cursor-forward rather than spaces whenever there is a
                // topline.  With no topline this is byte-identical to what the
                // row emitted before (`\x1b[colC` for col > 4, spaces below,
                // the threshold the empty-topline frames were validated at).
                if (gap > 0)
                    output += (left || gap > 4) ? `\x1b[${gap}C`
                                                : ' '.repeat(Math.max(0, gap));
                output += text;
            }
            output += '\n';
            continue;
        }
        /* wintty.c tty_display_nhwindow(): when a menu reaches the terminal
         * height it calls term_clear_screen() before process_menu_window()
         * paints it.  That includes the two physical rows normally occupied by
         * the status display; they are menu rows here, not an overlay on botl.
         * Keep this explicit rather than inferring it from the row count: some
         * callers deliberately compose tall corner windows. */
        if (fullScreen && inWindow) {
            const indent = (winLine.match(/^ +/) || [''])[0].length;
            const col = WIN_COL + indent;
            const text = winLine.trim();
            if (col > 4)
                output += `\x1b[${col}C`;
            else
                output += ' '.repeat(Math.max(0, col));
            /* wintty.c:1920-1931 + term_clear_screen: a window starting at offx 0
             * owns the whole screen, and a row is cut at the right edge (tty_putstr truncates at cols-1). */
            output += text.slice(0, Math.max(0, 79 - col));
            if (screenRow < 23)
                output += '\n';
            continue;
        }
        if (fullScreen && WIN_COL === 1 && winRows < 24) {
            if (screenRow < 23)
                output += '\n';
            continue;
        }
        if (statusStillBlank && (screenRow === 22 || screenRow === 23
                                 || (rows3 && screenRow === 21))) {
            /* wintty.c:1427-1491,1543-1545: menu rows and dmore() still
             * paint over a blank status window; only the underlying status
             * text is absent until bot() runs. */
            if (inWindow && winLine) {
                const indent = (winLine.match(/^ +/) || [''])[0].length;
                const col = WIN_COL + indent;
                output += col > 4 ? `\x1b[${col}C` : ' '.repeat(Math.max(0, col));
                output += winLine.trim();
            }
            /* docrt() cls()s the terminal, then prints the whole map: with
             * statuslines:3 map y=20 lands on screen row 21 (wintty.c:3814) and
             * only the status TEXT stays blank until bot().  A window not
             * covering the row leaves those glyphs on the terminal. */
            if (rows3 && screenRow === 21 && !inWindow)
                output += render_map_row_clipped(ROWNO - 1, COLNO - 1).str;
            if (screenRow < 23) output += '\n';
            continue;
        }
        if (screenRow === 22 || (rows3 && screenRow === 21)) {
            // Status line 1: render regardless of window coverage.
            if (statusClipCol === -1) {
                /* A dismissed 22-row tty window erases this row completely;
                 * the following status row is repainted independently. */
                /* C leaves the title text from botl row 22 before the window
                 * corner cleanup, but erases the cursor-forward/stat portion. */
                /* tty_dismiss_nhwindow -> docorner(cw->offx, ...) (wintty.c:3684)
                 * clears row 22 from the dismissed menu's offx, so the title
                 * keeps priorWinCol-2 columns.  The caller (itemactions) took
                 * priorWinCol from the pickinv window state it set. */
                const priorCol = game._pickinv_window?.WIN_COL;
                const title = _statusLine1().split('\x1b', 1)[0];
                /* docorner() clears only offx..79, so every status cell left of
                 * priorWinCol-2 survives (title, cursor-forward gap, and any
                 * stat text that starts before the clip: "...S" of "St:"). */
                /* three status rows: each of rows 21/22 is its own botl line
                 * (wintty.c:3650-3684 clears all of them from offx), and the cut
                 * leaves no painted blanks at the row end. */
                output += priorCol != null
                    ? (rows3
                        ? _overlay_status_line(rowStatus(screenRow), Math.max(0, priorCol - 2), '').replace(/ +$/, '')
                        : _overlay_status_line(_statusLine1(), Math.max(0, priorCol - 2), ''))
                    : title;
                output += '\n';
                continue;
            }
            if (inWindow) {
                // The tty menu window overlays this row: the status line still
                // renders to the LEFT of the window column, then the menu text
                // (e.g. "(end)") overwrites everything from WIN_COL onward.
                // C ref: tty windows draw over the status line without blanking
                // the portion the window doesn't cover — so the player title
                // shows through, e.g. "Merlix the Evoker    (end)".
                //
                // ... but it shows through only up to col-1, NOT up to col.
                // C wintty.c:1543-1545 draws this footer row as
                //     tty_curs(window, 1, page_lines);   /* -> screen col offx */
                //     cl_end();                          /* erase offx..79   */
                //     dmore(cw, resp);                   /* -> col offx+1    */
                // so the window's own left-margin column (offx, which is `col`
                // minus one here) is ERASED before the morestr is written one
                // column further right.  Clipping the status at `col` left that
                // margin column painted with whatever the status line had
                // renders "...St (end)" — the ':' of "St:12" surviving under
                // the window edge.  The margin is skipped with a cursor-forward
                // rather than written as a space, because cl_end() ERASES the
                // cell and an erased cell is not a painted cell.
                /* wintty.c:1794-1801 process_text_window(): cl_end() also
                 * erases the status under an empty window line. */
                const indent = (winLine.match(/^ +/) || [''])[0].length;
                const col = WIN_COL + indent;
                const text = winLine.trim();
                /* An explicit statusClipCol describes the cells left intact by
                 * the preceding taller-window dismissal.  It also applies when
                 * the current window still covers row 22: the overlay compositor
                 * must not resurrect status text in cells the C corner cleanup
                 * erased.  With no clip, retain the normal col-1 behavior. */
                /* cl_end() runs at the window margin (WIN_COL - 1), not at the
                 * line's own indent: an indented text line still erases the
                 * status cells between the margin and its first glyph. */
                const marginCol = Math.max(0, WIN_COL - 1);
                const leftStatus = statusClipCol != null
                    ? Math.min(statusClipCol, marginCol)
                    : marginCol;
                /* wintty.c:3814: with statuslines:3 map y=20 prints onto status row 1,
                 * so the cells left of the window show what the terminal holds
                 * there (map glyphs where they wiped the title), not the title. */
                let clipped = _overlay_status_line(
                    rows3 && screenRow === 21 && !game._status1Whole
                        ? _status_row1_map_overlay(rowStatus(21)) : rowStatus(screenRow),
                    leftStatus, '');
                let run = Math.max(1, col - leftStatus);
                const base0 = run;
                for (let tail; (tail = /( +|\x1b\[(\d+)C)$/.exec(clipped));) {
                    run += tail[2] !== undefined ? parseInt(tail[2], 10) : tail[1].length;
                    clipped = clipped.slice(0, tail.index);
                }
                output += clipped + (run > base0 && run <= 4 ? ' '.repeat(run) : `\x1b[${run}C`) + text;
            }
            else if (statusClipCol != null) {
                // Below a shorter window after a taller window's dismiss:
                // keep only the leftmost statusClipCol visible columns (clip,
                // pad nothing — _overlay_status_line with empty text and the
                // clip width gives exactly the truncated-left status line).
                /* wintty.c:3684-3687: clipping preserves the physical prefix,
                 * including map cells that already erased status row 1. */
                output += _overlay_status_line(
                    rows3 && screenRow === 21
                        ? _status_row1_map_overlay(rowStatus(21)) : rowStatus(screenRow),
                    statusClipCol, '');
                /* wintty.c:3703-3714: docorner()'s row_refresh() then reprints the
                 * gbuf cells of map y=20 (screen row 21 under statuslines:3)
                 * right of the clip; only bot() paints status over them. */
                if (rows3 && screenRow === 21 && statusClipCol > 0) {
                    let col = 0, tail = '';
                    for (const t of render_map_row_clipped(ROWNO - 1, COLNO - 1).str
                             .match(/\x1b\[[0-9;]*[A-Za-z]|[\s\S]/g) || []) {
                        const fwd = /^\x1b\[(\d*)C$/.exec(t);
                        if (fwd) {
                            const n = Number(fwd[1] || 1);
                            if (col + n > statusClipCol)
                                tail += `\x1b[${col + n - Math.max(col, statusClipCol)}C`;
                            col += n;
                        } else if (t.startsWith('\x1b')) tail += t;
                        else { if (col >= statusClipCol) tail += t; col++; }
                    }
                    if (/\S/.test(tail.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')))
                        output += tail;
                }
            }
            else if (rows3 && screenRow === 21) {
                /* wintty.c:3814: map y=20 still prints onto status row 1 (see
                 * _status_row1_map_overlay), and no window covers it here.
                 * After a whole-row BL_RESET rewrite (botl.c:1670,
                 * wintty.c:5251-5255) every field sits over map y=20, so only
                 * the tail past the text can still show map glyphs. */
                output += game._status1Whole
                    ? docorner_status_row(21, _status_row1_whole_with_tail(st3[0]))
                    : _status_row1_map_overlay(rowStatus(21));
            }
            else {
                output += rowStatus(screenRow);
            }
            output += '\n';
            continue;
        }
        if (screenRow === 23) {
            // Status line 2: render regardless of window coverage
            if (statusClipCol === -1 || (statusClipCol > 30 && !clipRow23)) {
                output += rowStatus(23);
                continue;
            }
            if (inWindow) {
                const indent = (winLine.match(/^ +/) || [''])[0].length;
                const col = WIN_COL + indent;
                const text = winLine.trim();
                /* Same as row 22 (wintty.c:1543-1545): the footer row erases
                 * only offx..79, so status line 2 survives LEFT of the window. */
                const leftStatus = statusClipCol != null
                    ? Math.min(statusClipCol, Math.max(0, col - 1))
                    : Math.max(0, col - 1);
                output += _overlay_status_line(rowStatus(23), leftStatus, '')
                    + `\x1b[${Math.max(1, col - leftStatus)}C`;
                output += text;
            }
            else if (statusClipCol != null) {
                output += _overlay_status_line(rowStatus(23),
                                               statusClipCol, '');
            }
            else {
                output += rowStatus(23);
            }
            continue; // no trailing \n for last row
        }
        // Map rows: screenRow 1..21 → game y = screenRow - 1
        const gameY = screenRow - 1;
        if (!inWindow) {
            // Below window: render full map row (no clipping)
            const { str } = render_map_row_clipped(gameY, COLNO - 1);
            output += str + '\n';
            continue;
        }
        // Within window: always clip map to WIN_COL-1 (C erases window region).
        let { str: mapStr, endCol: mapEnd } = render_map_row_clipped(gameY, CLIP_X);
        /* topl.c topl_putsym wrapped a long getlin prompt onto row 1 over the
         * map; dismissing it (clear_nhwindow, cl_end per spilled row) leaves the
         * row blank, and a window opened at offx > 0 does not repaint the map
         * left of it (wintty.c process_text_window). */
        if (screenRow === 1 && prompt_spilled_onto_row1()) {
            mapStr = '';
            mapEnd = 0;
        }
        const text = winLine ? winLine.trim() : '';
        const indent = winLine ? (winLine.match(/^ +/) || [''])[0].length : 0;
        const targetCol = WIN_COL + indent;
        if (!mapStr && !text) {
            output += '\n';
            continue;
        }
        if (!text) {
            // Empty window line: just the (clipped) map
            output += mapStr + '\n';
            continue;
        }
        if (!mapStr) {
            // No map content: just window text
            if (targetCol > 4)
                output += `\x1b[${targetCol}C`;
            else
                output += ' '.repeat(Math.max(0, targetCol));
            output += text + '\n';
            continue;
        }
        // Both map (clipped) and window text — combine
        if (mapEnd <= targetCol) {
            const gap = targetCol - mapEnd;
            if (gap > 4)
                output += mapStr + `\x1b[${gap}C` + text + '\n';
            else if (gap > 0)
                output += mapStr + ' '.repeat(Math.max(0, gap)) + text + '\n';
            else
                output += mapStr + text + '\n';
        }
        else {
            // Map extends past window col — window text overlaps (rare, but handle)
            output += mapStr + text + '\n';
        }
    }
    return output;
}
// ── Split text into window lines ──
// C ref: deliver_by_window() splits on '\n', appends '--More--' at the end.
function make_window_lines(text) {
    const rawLines = text.replace(/\r/g, '').split('\n');
    return [...rawLines, '--More--'];
}
// ── tty window origin (C `cw->offx`) ─────────────────────────────────────────
// There is no ONE offx formula: C reaches a window through two different tty
// entry points and they differ by one column plus a cap.  Both branches below
// the CONTENT left edge, which is what WIN_COL means here, is offx + 1):
//
//   'more' — tty_display_nhwindow() on a window that ends in "--More--":
//            content column = COLNO - 1 - maxcol  ( = 79 - maxcol )
//
//   'end'  — tty_end_menu()/select_menu() on a picklist that ends in "(end)":
//            content column = min(41, COLNO - 2 - maxcol)  ( = min(41, 78 - w) )
//                     step 316 (spell menu)    maxcol 58 -> 20   [cOffx 19]
//                     step 8   (Is this ok?)   maxcol 38 -> 40
//                     step 173 (container)     maxcol 44 -> 34
//                     step 242 (inventory)     maxcol 35 -> 41   (capped)
//                     step 239 ("Take out what?") maxcol 16 -> 41 (capped)
//
// This is why com_pager_legacy() and ask_do_tutorial() legitimately compute
// DIFFERENT columns for windows of near-identical width — they are different C
// calls, not two copies of one constant.  Keep them going through this one
// function so that stays visible.
//
// `maxcol` is the longest right-trimmed VISIBLE line (SGR/CSI escapes are not
// printed, so they do not count toward the width).  The footer itself
// ("--More--" 8 cols, "(end)" 5 cols) is never the longest line in either
// window, so including it in the scan cannot move the result.
const _tty_visible_len = (s) =>
    String(s ?? '').replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').trimEnd().length;
export function tty_window_offx(windowLines, footerKind) {
    let maxcol = 0;
    for (const ln of windowLines) {
        const w = _tty_visible_len(ln);
        if (w > maxcol)
            maxcol = w;
    }
    /* Both branches take the SAME clamp.  C wintty.c:1908 (H2344_BROKEN, which
     * the reference build defines) is
     *     cw->offx = min(min(82, cols / 2), cols - s_maxcol - 1)
     * for NHW_MENU whichever way the window was filled, so with cols == 80 the
     * offx can never exceed 40 and the content column never exceeds 41.  The
     * 'more' branch was written without the clamp because every sample used to
     * derive it was wider than 38 columns — a narrow putstr window (say a
     * two-object "Things that are here:" pile, longest line 21) would have been
     * placed at column 58, off the right of where C can put it.  The two
     * branches still differ by one column, which is the real finding: they
     * reach wintty.c with different cw->maxcol (putstr sets longest+1,
     * tty_end_menu sets longest+2). */
    /* wintty.c:1920-1921 `if (cw->offx < 0) cw->offx = 0;` — a window wider than
     * the screen starts at offx 0, i.e. content column 1, never negative. */
    return Math.max(1, Math.min(41, (footerKind === 'more') ? (79 - maxcol) : (78 - maxcol)));
}
// ── Status line helpers (inlined from display.js — not exported there) ──
// C ref: botl.c — bot(), status line 1 and 2 format.
function _cp_rank_of(ulevel, roleName, female) {
    const idx = role_index_by_name(roleName);
    if (idx < 0)
        return null;
    return rank_of(idx, ulevel, female);
}
/* C wintty.c:5216-5240: status keeps its field highlights under a menu. */
function _statusLine1() { return botl_frozen_status_line(1) ?? _status_sgr(_hilite_status_wrap(_statusLine1Raw())); }
function _statusLine1Raw() {
    const g = game;
    const u = g.u;
    /* C botl.c:259-260 bot(): nothing is painted while !iflags.status_updates,
     * so the physical status rows stay blank for the whole game. */
    if (!u || g.iflags?.status_updates === false)
        return '';
    /* C botl.c:260 — no bot() paint under !status_updates: rows stay blank. */
    if (g.iflags?.status_updates === false)
        return '';
    // C ref: botl.c:58-60 — capitalize first letter of plname
    const rawName = g.plname || 'Hero';
    const name = (rawName.length > 0 && rawName[0] >= 'a' && rawName[0] <= 'z')
        ? rawName[0].toUpperCase() + rawName.slice(1)
        : rawName;
    // C ref: botl.c:rank() → rank_of(u.ulevel, Role_switch, flags.female)
    const female = !!(g.flags?.female);
    const ulevel = u.ulevel || 1;
    const roleNameM = g.urole?.name?.m || '';
    const roleNameF = g.urole?.name?.f || '';
    const lookupName = roleNameM || roleNameF;
    /* C you.h:554 — #define Upolyd (u.umonnum != u.umonster).  Was
     * (u.mtimedone > 0), which is you.h:422, the poly TIMER, a different field. */
    const Upolyd = (u.umonnum | 0) !== (u.umonster | 0);
    const role = Upolyd
        ? botl_upstart_words(botl_pmname(u.umonnum | 0, u.mfemale ? 1 : 0 /* you.h:555 Ugender, Upolyd arm */))
        : (_cp_rank_of(ulevel, lookupName, female)
           || _cp_rank_of(ulevel, roleNameF, female)
           || (female ? g.urole?.name?.f : null)
           || g.urole?.name?.m
           || 'Adventurer');
    const title = botl_title(name, role);
    const _hasAttrs = !!(u.acurr && u.acurr.a);
    const _acur = (ci) => (_hasAttrs ? acurr(u, ci) : null);
    const _st = _acur(A_STR);
    const stStr = (_st != null) ? _strengthStr(_st) : '?';
    const stats = `St:${stStr} Dx:${_acur(A_DEX) ?? '?'} Co:${_acur(A_CON) ?? '?'} In:${_acur(A_INT) ?? '?'} Wi:${_acur(A_WIS) ?? '?'} Ch:${_acur(A_CHA) ?? '?'}`;
    const align = u.ualign?.type === 0 ? 'Neutral' : u.ualign?.type > 0 ? 'Lawful' : 'Chaotic';
    if (g.iflags?.wc2_hitpointbar)
        return hitpointbar_status1(title, stats, align, ulevel, Upolyd);
    const gap = Math.max(1, 31 - title.length);
    const tail = botl_status1_tail(stats, align, title.length + gap);
    if (gap > 4)
        return `${title}\x1b[${gap}C${tail}`;
    return `${title}${' '.repeat(Math.max(0, gap))}${tail}`;
}
/** C ref: hack.c:4478 money_cnt — walk invent chain, return COIN_CLASS (12) obj quan. */
export function money_cnt(otmp) {
    for (; otmp; otmp = otmp.nobj) {
        if ((otmp.oclass | 0) === 12 /* COIN_CLASS */)
            return otmp.quan;
    }
    return 0;
}
// C ref: botl.c — status line 2 format.
// Respects flags.showexp and flags.time options.
// Note: uac passed as parameter to allow caller control (step 0 = pre-find_ac, step 1+ = current).
function _statusLine2(uacOverride, pwOverride) { return botl_frozen_status_line(2) ?? _status_sgr(_hilite_status_wrap(_statusLine2Raw(uacOverride, pwOverride))); }
function _statusLine2Raw(uacOverride, pwOverride) {
    const g = game;
    const u = g.u;
    /* C botl.c:259-260 bot(): nothing is painted while !iflags.status_updates,
     * so the physical status rows stay blank for the whole game. */
    if (!u || g.iflags?.status_updates === false)
        return '';
    /* C botl.c:260 — no bot() paint under !status_updates: rows stay blank. */
    if (g.iflags?.status_updates === false)
        return '';
    const uac = uacOverride !== undefined ? uacOverride : (u.uac ?? 0);
    /* pwOverride mirrors the same display-staleness workaround as uacOverride:
     * C's bot() at allmain.c:891 draws Pw with the pre-boost u.uen/u.uenmax, and
     * u_init_skills_discoveries()'s starting-Pw boost (u_init.c:1405) mutates
     * u.uen/u.uenmax WITHOUT a subsequent bot(), so the legacy-quote frame shows
     * the stale (pre-boost) Pw.  When provided, use it in place of live u.uen. */
    /* A window drawn without an intervening bot() keeps the physical Pw: display.js
     * records it in _botlStaleUen/_botlStaleUenmax when u.uen changes with no
     * botl set (chain lightning's u.uen--, spell.c:1086-1087). */
    const uen = pwOverride !== undefined ? pwOverride.uen
        : (g._botlStaleUen !== undefined ? g._botlStaleUen : (u.uen || 0));
    const uenmax = pwOverride !== undefined ? pwOverride.uenmax
        : (g._botlStaleUenmax !== undefined ? g._botlStaleUenmax : (u.uenmax || 0));
    /* C ref: botl.c:837 money_cnt(gi.invent) — gold from the hero's LIVE
     * inventory chain.  The `g._ini_inv_chain ??` prefix that used to be here
     * made the status row read a post-u_init snapshot instead; see the long
     * note at the matching site in js/display.js _statusLine2(). */
    const gold = money_cnt(g.invent ?? null);
    /* C you.h:554 — #define Upolyd (u.umonnum != u.umonster).  Was
     * (u.mtimedone > 0), which is you.h:422, the poly TIMER, a different field. */
    const Upolyd = (u.umonnum | 0) !== (u.umonster | 0);
    let _hp = Upolyd ? (u.mh | 0) : (u.uhp || 0);
    /* trap.c:7005 sink_into_lava writes u.uhp with no SET_BOTL: a window drawn
     * before the next bot() keeps the physical HP (js/trap.js _botlStaleUhp). */
    if (!Upolyd && g._botlStaleUhp !== undefined) _hp = g._botlStaleUhp | 0;
    if (_hp < 0)
        _hp = 0;
    _hp = Math.min(_hp, 9999);
    const _hpmax = Math.min(Upolyd ? (u.mhmax | 0) : (u.uhpmax || 0), 9999);
    const _leveldescField = describe_level_buf(1, u.uz).replace(/ +$/, '');
    let s = `${_leveldescField} ${gold_status_char(gold)}:${gold} HP:${_hp}(${_hpmax}) Pw:${uen}(${uenmax}) AC:${uac}`;
    /* botl.c:1705-1706 enables XP/HD only at status_initialize(); a hero
     * restored to human form without a reassessment keeps the enabled HD
     * field's old text (same latch as js/display.js _statusLine2). */
    const _xpFields = g._statusExperienceFields;
    const _hdEnabled = _xpFields?.polymorphed ?? Upolyd;
    const _shownLevel = Upolyd && !_hdEnabled ? (_xpFields?.level ?? 0) : (u.ulevel || 1);
    const _shownExp = Upolyd && !_hdEnabled ? (_xpFields?.experience ?? 0) : (u.uexp || 0);
    if (_hdEnabled) {
        s += ` HD:${Upolyd ? botl_mon_mlevel(u.umonnum | 0) : (_xpFields?.hd ?? 0)}`;
    }
    else if (g.flags?.showexp) {
        s += ` Xp:${_shownLevel}/${_shownExp}`;
    }
    else {
        s += ` Xp:${_shownLevel}`;
    }
    // C ref: botl.c — T: (turn count) only shown when time option set.
    if (g.flags?.time) {
        /* Same display value as js/display.js _painted_moves(): the physical
         * status keeps the run-suppressed T: (allmain.c:261-263) until bot(). */
        const _tut = g._tutorialStatusOverride?.moves;
        const _tm = _tut != null ? _tut : (g._timeBotlFrozenMoves != null ? g._timeBotlFrozenMoves : g.moves);
        s += ` T:${_tm || 1}`;
    }
    game._botlPreInv = pwOverride !== undefined;
    try {
        /* The menu window leaves the bottom line alone, so it still shows the cap
         * of the LAST bot() (botl.c:188; _botlPaintedCap), not near_capacity()
         * now: seffect_charging's useup() drops the scroll's weight before the
         * getobj menu opens, but nothing has SET_BOTL'd yet, so C keeps
         * " Burdened" on the inventory pages. */
        /* Slimed likewise: timeout.c:654's countdown clears it without SET_BOTL, so the
         * window leaves the painted Slime on the line until the next bot(). */
        /* Hunger likewise: eat.c:3396-3402 newuhs() mid-meal stores u.uhs without
         * SET_BOTL, so the window leaves the last bot() paint's hunger visible. */
        s += botl_status_suffix((g._botlPaintedUhs != null ? g._botlPaintedUhs : u.uhs) | 0, g._botlPaintedCap, undefined, undefined, undefined,
                                undefined, undefined, undefined, undefined, undefined,
                                g._botlPaintedSlimed != null ? !!g._botlPaintedSlimed : undefined);
        return status_row_finish(s);
    } finally {
        game._botlPreInv = false;
    }
}
// ── pline_with_more ──
// C ref: allmain.c:923 welcome(TRUE) → pline() triggers --More-- in tty after com_pager.
// In C, the welcome pline appears on the topline (row 0); then nhgetch() is called for
// are shown; row 22-23 are status lines (with updated uac from find_ac).
export async function pline_with_more(msg, uacAtCapture) {
    pline_flush_point();
    await topl_more_page(msg, uacAtCapture);
}
/* The PAGE half on its own: C's update_topl() more(), with no flush of its own.
 * Split out because C makes the flush for message N and the more() for message
 * N-1 in that order (the more() is raised by message N's putmesg, AFTER message
 * N's flush), and the startup loop in js/allmain.js has to interleave them the
 * same way or the flush-point streams cannot align. */
export async function topl_more_page(msg, uacAtCapture) {
    const g = game;
    routeTag('pline_with_more', msg); /* telemetry only; inert when env unset */
    game._pending_message = msg;
    const msgLen = (msg || '').length;
    // C ref: tty more() positions '--More--' (8 chars) after the message.
    // If msg.length + 8 fits within COLNO-1 (79) columns, '--More--' is
    // appended inline on row 0.  Otherwise the terminal wraps and '--More--'
    // appears on row 1.
    // COLNO = 80 (const.js); --More-- = 8 chars; threshold: msg.length + 8 <= 79.
    const inlineMore = (msgLen + 8) <= (COLNO - 1);
    /* C topl.c:284-297 update_topl() searches backward from CO-1 for
     * the break space; more():220 reserves room for its marker afterward. */
    const wrapAt = (!inlineMore && msgLen > (COLNO - 1))
        ? msg.lastIndexOf(' ', COLNO - 1) : -1;
    let output = '';
    if (inlineMore) {
        // Row 0: message + '--More--' on the same line
        output += (msg || '') + '--More--\n';
        // Row 1: map game y=0 (tty map window offy=1; C paints a y=0 corridor
        // square here, which a restore's docrt() can leave remembered)
        output += render_map_row_clipped(0, COLNO - 1).str + '\n';
        // Rows 2..21: map game y=1..20
        for (let y = 1; y < ROWNO; y++) {
            output += render_map_row_clipped(y, COLNO - 1).str + '\n';
        }
    } else if (wrapAt > 0) {
        output += msg.slice(0, wrapAt) + '\n';
        output += msg.slice(wrapAt + 1) + '--More--\n';
        for (let y = 1; y < ROWNO; y++) {
            output += render_map_row_clipped(y, COLNO - 1).str + '\n';
        }
    } else {
        // Row 0: message only
        output += (msg || '') + '\n';
        // Row 1: '--More--'
        output += '--More--\n';
        // Rows 2..21: map game y=1..20
        for (let y = 1; y < ROWNO; y++) {
            output += render_map_row_clipped(y, COLNO - 1).str + '\n';
        }
    }
    // Row 22: status line 1
    if (_threeStatusLines()) {
        /* wintty.c:4289-4298: three status rows at 21/22/23; map row 21 gone */
        const st3 = _statusRows3();
        /* display.c:2236-2256: the preceding flush can leave map writes over
         * row 1. more() keeps that physical row, including erased blanks.
         * Restore's welcome also flushes status first (restore.c:948,
         * pline.c:273-274); only map cells actually drawn can erase it. */
        const row1 = game._status1Whole ? _status_row1_whole_with_tail(st3[0])
            : _status_row1_map_overlay(st3[0]);
        output = output.replace(/[^\n]*\n$/, '') + row1 + '\n' + _status_sgr(st3[1]) + '\n' + _status_sgr(st3[2]);
    } else if (g._status_blanked || g._statusBlankAfterDocrt === true) {
        /* restore.c:932 docrt() -> cls() blanked the status rows, and the
         * welcome pline's flush could not repaint them: botl.c:259 declines
         * while u.uhp == -1 (a self-genocided polymorphed hero). */
        output += '\n';
    } else {
        output += _statusLine1() + '\n';
        // Row 23: status line 2 (with uac = actual post-find_ac value)
        output += _statusLine2(uacAtCapture);
    }
    /* read_wizkit() blanked the physical terminal before the first docrt()
     * paint (files.c:2487, js/display.js _map_blanked): the map rows are empty
     * and bot() has painted only the field that changed since — AC, after
     * find_ac() (wintty.c tty_status_update repaints changed fields only). */
    if (g._map_blanked && !_threeStatusLines()) {
        const rows = output.split('\n');
        const moreRows = rows.findIndex(r => r.endsWith('--More--')) + 1;
        /* docorner() of the dismissed legacy window repainted the rows it
         * covered (_map_corner); everything else is still blank. */
        const keep = g._map_corner ? Math.min(g._map_corner.ymax, 22) : moreRows;
        const blanked = rows.slice(0, Math.max(moreRows, keep));
        while (blanked.length < 23) blanked.push('');
        /* the AC field sits at its column in status line 2 (botl.c) */
        const acCol = Math.max(0, _statusLine2(uacAtCapture).replace(/\x1b\[[0-9;]*m/g, '').indexOf('AC:'));
        blanked.push(`\x1b[${acCol}CAC:` + (uacAtCapture ?? g.u?.uac ?? 0));
        output = blanked.join('\n');
    }
    g._screen_output = output;
    // Cursor at end of '--More--'
    const disp = g?.nhDisplay;
    if (disp) {
        if (inlineMore) {
            disp.cursorCol = msgLen + 8;
            disp.cursorRow = 0;
        } else {
            const wrappedMoreCol = wrapAt > 0 ? (msgLen - wrapAt - 1 + 8) : 8;
            disp.cursorCol = wrappedMoreCol;
            disp.cursorRow = 1;
        }
    }
    // C ref: win/tty/topl.c:230 more() → xwaitforspace("\033 ") — the
    // welcome/topline --More-- loops until a dismiss key arrives, consuming and
    // IGNORING any other key (ringing the bell).  The dismiss set is Return/LF
    // (getline.c:240, which breaks BEFORE the cbreak arm), ESC (getline.c:245-250,
    // which also sets ttyDisplay->dismiss_more and makes more() raise WIN_STOP)
    // and every char of `s`, which more() passes as "\033 " — i.e. space.
    //
    // the welcome --More--, and C's step-2 frame is already the tutorial menu
    // while this port was still holding the --More-- up and eating every key
    // after it.  js/display.js _topl_more() — the OTHER copy of this loop, used
    // by every non-startup more() — has always had the ESC arm; only this
    // startup-path copy was missing it.
    const morc = await await_topl_more_dismiss(() => {
        game._pending_message = msg;
        g._screen_output = output;
        if (disp) {
            if (inlineMore) { disp.cursorCol = msgLen + 8; disp.cursorRow = 0; }
            else if (wrapAt > 0) {
                disp.cursorCol = msgLen - wrapAt - 1 + 8;
                disp.cursorRow = 1;
            } else { disp.cursorCol = 8; disp.cursorRow = 1; }
        }
    });
    // C topl.c:237-239 restores the rows covered by a multiline message.
    if (!inlineMore) docorner_blank_utf8_captures(1, 2);
    // Clear message after --More-- dismissed
    g._pending_message = '';
    return morc;
}
// ── com_pager_legacy ──
// C ref: allmain.c:911-913 — if (flags.legacy) com_pager(pauper ? "pauper_legacy" : "legacy")
// Called after emitMapstate('post_init') in allmain.js.
// Delivers the Book-of-{god} intro as a NHW_MENU window, then calls nhgetch()
// preInitAc: u.uac value BEFORE find_ac() ran (C: memset zeros u.uac = 0 before init).
//   In JS, u.uac is undefined before find_ac; pass 0 to mirror C memset semantics.
export async function com_pager_legacy(pauper = false, preInitAc = 0, preInitPw = undefined) {
    const g = game;
    const u = g.u;
    if (!u)
        return;
    const initrole = (g.flags?.initrole ?? -1) | 0;
    const roleIdx = (initrole >= 0 && initrole <= 12) ? initrole : -1;
    if (roleIdx < 0)
        return;
    routeTag('com_pager_legacy', null); /* telemetry only; inert when env unset */
    /* C wintty.c:1921 tty_display_nhwindow(NHW_TEXT): a topline left
     * TOPLINE_NEED_MORE is page-acked (more()) before the window opens. */
    if (g._pending_message) {
        /* no bot() has run yet at newgame(): the status rows are still blank */
        const blankStatus = !g._status_blanked;
        if (blankStatus) g._status_blanked = true;
        const releaseFlush = g._paintedSnapshot ? () => {} : use_last_flush_snapshot();
        await force_more_pages(g._pending_message, true, true);
        releaseFlush();
        if (blankStatus) g._status_blanked = false;
    }
    // C ref: questpgr.c convert_arg 'd' uses u.ualignbase[A_ORIGINAL] (index 1)
    const alignType = (u.ualignbase?.[1]) ?? (u.ualign?.type ?? 0);
    const female = !!(g.flags?.female);
    const template = pauper ? PAUPER_LEGACY_TEXT : LEGACY_TEXT;
    const formattedText = format_legacy_text(template, roleIdx, alignType, female);
    /* C wintty.c:1943-1944 process_text_window: under a UTF8 symset every
     * content line (not the dmore "--More--") loses its first byte. */
    const windowLines = make_window_lines(formattedText).map((ln, i, all) =>
        (i === all.length - 1 ? ln : tty_text_window_utf8_line(ln)));
    // The legacy window is shown by tty_display_nhwindow() and ends in
    // "--More--", so it takes the `79 - maxcol` branch of tty_window_offx().
    const footerKind = 'more';
    /* C ref: wintty.c:1927 — `cw->offx == 10 || cw->maxrow >= rows ||
     * !iflags.menu_overlay` drops the window to offx 0 and clears the whole
     * screen (map and status included); "--More--" is then drawn at offx+1. */
    const fullScreen = windowLines.length >= 24
        || g.iflags?.menu_overlay === false || g.iflags?.menu_overlay === 0;
    const WIN_COL = fullScreen ? 1 : tty_window_offx(windowLines, footerKind);
    /* C wintty.c:1936 tty_display_nhwindow(NHW_TEXT) with offx != 10:
     * tty_clear_nhwindow(WIN_MESSAGE) erases a non-empty topline.  A wizard-mode
     * "Get bones? [yn] (n)" answered at mklev leaves TOPLINE_NON_EMPTY, so it
     * must not survive left of the window.  (read_wizkit's raw_printf row does
     * not touch toplin, hence the _blank_below_window exemption.) */
    if (!fullScreen && !g._blank_below_window)
        g._topl_sticky = null;
    // preInitAc mirrors C's u.uac=0 (from memset) at the time bot() rendered step 0.
    let screenOutput = fullScreen
        ? windowLines.map((ln, i) => (i === windowLines.length - 1 ? ' ' : '')
            + _encode_blank_runs(String(ln).replace(/\s+$/, ''))).join('\n')
        : build_window_screen(windowLines.map((ln, i) => (i === windowLines.length - 1 ? ln : tty_text_window_utf8_line(ln))),
            WIN_COL, preInitAc, undefined, preInitPw); /* wintty.c:1943 process_text_window */
    /* allmain.c:826 read_wizkit() ran before the first docrt()/bot(): the map
     * and status rows below the window have never been painted. */
    if (g._blank_below_window) {
        g._blank_below_window = false;
        screenOutput = screenOutput.split('\n').slice(0, windowLines.length).join('\n');
    }
    // Set cursor to end of --More-- line
    // C ref: tty_display_nhwindow → cursor positioned at end of "--More--"
    const moreRow = windowLines.length - 1;
    const moreCursorCol = WIN_COL + '--More--'.length;
    const disp = g?.nhDisplay;
    // C ref: wintty.c process_text_window → dmore(cw, quitchars) → xwaitforspace
    // (getline.c:230).  quitchars == " \r\n\033" (decl.c:96), so only space, CR,
    // LF and ESC dismiss this window; any other key rings the bell and re-loops
    // with the legacy window still on screen.  This was a bare nhgetch().
    const _show = async () => {
        g._screen_output = screenOutput;
        if (disp) {
            disp.cursorCol = moreCursorCol;
            disp.cursorRow = moreRow;
        }
    };
    await _show();
    await await_more_dismiss(_show);
    if (!fullScreen)
        docorner_blank_utf8_captures(WIN_COL - 1, windowLines.length);
    if (g._map_blanked && !fullScreen)
        g._map_corner = { xmin: WIN_COL, ymax: windowLines.length };
    // C ref: questpgr.c:597-608 com_pager_core — after deliver_by_window, the
    // "legacy"/"pauper_legacy" entry carries a `synopsis` that is added to the
    // message history ring (putmsghistory(out_line, FALSE)) but never displayed
    // on the topline.  synopsis = "[%dC has chosen you to recover the Amulet of
    // Yendor for %dI.]" where %dC = capitalized deity name and %dI = capitalized
    // deity pronoun (him/her).  This is the oldest entry recalled by ^P.
    {
        const godIdx = alignType > 0 ? 0 : alignType === 0 ? 1 : 2;
        let godEntry = (roleIdx >= 0 && roleIdx <= 12) ? (ROLE_GODS[roleIdx][godIdx] || null) : null;
        if (roleIdx === 6 && !godEntry) {
            if (alignType > 0 && u?.lgod)
                godEntry = u.lgod;
            else if (alignType === 0 && u?.ngod)
                godEntry = u.ngod;
            else if (u?.cgod)
                godEntry = u.cgod;
        }
        if (godEntry) {
            // Leading '_' marks a goddess (feminine pronoun); strip for display.
            const isGoddess = godEntry.startsWith('_');
            const godName = godEntry.replace(/^_/, '');
            // C ref: convert_arg('d')+'C' capitalizes the deity name's first letter.
            const godC = godName.charAt(0).toUpperCase() + godName.slice(1);
            // C ref: qtext_pronoun('d','I') → genders[godgend].him, capitalized.
            const godI = isGoddess ? 'Her' : 'Him';
            const synopsis = `[${godC} has chosen you to recover the Amulet of Yendor for ${godI}.]`;
            putmsghistory(synopsis, false);
        }
    }
}
// ── ask_do_tutorial ──
// C ref: nethack-c/src/options.c:448 ask_do_tutorial()
// C ref: nethack-c/src/allmain.c:638-655 maybe_do_tutorial(), called from moveloop().
//
// Renders a PICK_ONE menu overlaid on the map showing:
//   - title "Do you want a tutorial?" in reverse video
//   - y/n options, blank, config hint, optional retry line, "(end)"
// Loops until 'y', 'n', or ESC. Returns boolean (true=do tutorial).
//
// C options.c:430-483: an explicit tutorial option returns its value without
// asking; only an unset option opens the menu.
//
// WIN_COL computation:
//   Longest line is the config hint (57 chars): 'Put "OPTIONS=!tutorial" in .nethackrc to skip this query.'
//   C: offx = COLNO - maxwidth - 2 = 80 - 57 - 2 = 21.
//
// Cursor: after "(end)" at WIN_COL + len("(end)") + 1 = 21 + 5 + 1 = 27.
//   C ref: tty select_menu PICK_ONE — cursor ends one past last char of footer.
export async function ask_do_tutorial() {
    const g = game;
    // C options.c:432-434,483 — obey either configured value without a menu.
    if (g.tutorial_set_in_config) return !!g.flags.tutorial;
    const u = g.u;
    /* C tty_display_nhwindow's NHW_MENU arm clears WIN_MESSAGE before
     * drawing an overlay (wintty.c:1939-1940), including after WIN_STOP. */
    g._pending_message = '';
    // C ref: options.c:463-465 — Snprintf buf with rc basename.
    const configHint = 'Put "OPTIONS=!tutorial" in .nethackrc to skip this query.';
    // This is a select_menu()/tty_end_menu() picklist ending in "(end)", so it
    // takes the `min(41, 78 - maxcol)` branch of tty_window_offx() — one column
    // LEFT of the "--More--" branch that com_pager_legacy() uses.  The config
    // hint is the longest line at 57 visible columns (the reverse-video title
    // is 23 once its SGR escapes are discounted, the retry line 27, "(end)" 5),
    // so this evaluates to min(41, 78 - 57) = 21 on every pass.
    // i.e. content column 21.
    const footerKind = 'end';
    // The real uac at tutorial time (find_ac has already run inside u_init_skills_discoveries).
    const uac = u?.uac ?? 0;
    /* C ref: win/tty/wintty.c:1329 process_menu_window — the two selectable
     * entries, in mlist order.  `str` is what tty_add_menu stored ("%c - %s"),
     * which is both what is drawn and what MENU_SEARCH's pmatchi() matches
     * against (wintty.c:1714 `pmatchi(searchbuf, curr->str)`). */
    const mlist = [
        { selector: 'y', str: 'y - Yes, do a tutorial' },
        { selector: 'n', str: 'n - No, just start play' },
    ];
    const RESP_EXPLICIT = mlist.map((m) => m.selector).join(''); /* "yn" */
    const RESP = RESP_EXPLICIT + ' ' + '0123456789\x1b\n\r' + '^|><.-@,\\~:';
    let pass = 0;
    /* C ref: options.c:449-472 — do { build; select_menu } while (!n). */
    for (;;) {
        // C ref: options.c:466-494 — build window lines for this iteration.
        const windowLines = [
            /* tty_end_menu adds the prompt with tty_menu_promptstyle = iflags.menu_headings
             * (wintty.c:2680-2689, windows.c:1769, options.c:5790) */
            menu_heading_text('Do you want a tutorial?'),
            '', // blank separator (add_menu_str)
            mlist[0].str, // a_char='y' option
            mlist[1].str, // a_char='n' option
            '', // blank separator (add_menu_str)
            configHint, // add_menu_str(buf)
        ];
        if (pass > 0) {
            // C ref: options.c:481-482 — after first invalid key, add retry line.
            windowLines.push("(Please choose 'y' or 'n'.)");
        }
        windowLines.push('(end)'); // tty footer line for single-page menus
        /* C ref: wintty.c:1925-1928 — `!iflags.menu_overlay` drops the menu to
         * offx 0 and clears the whole screen; the content is drawn at column 1. */
        const fullScreen = g.iflags?.menu_overlay === false || g.iflags?.menu_overlay === 0;
        const WIN_COL = fullScreen ? 1 : tty_window_offx(windowLines, footerKind);
        // Cursor: at end of "(end)" row, one past last character.
        // C: tty select_menu positions cursor after last char of footer row.
        // "(end)" is 5 chars at column WIN_COL → cursor at WIN_COL + 5 + 1 = 27.
        const endRow = windowLines.length - 1; // 0-indexed screen row of "(end)"
        const endCursorCol = WIN_COL + 5 + 1; // 21 + 5 + 1 = 27
        const disp = g?.nhDisplay;
        let titleErased = false;
        /* C ref: wintty.c:1393-1398 — `counting`/`count` survive exactly one
         * further iteration after a digit (reset_count is cleared by the digit
         * arm and re-armed at the top of the next pass), and ESC while counting
         * only stops the count instead of cancelling the menu. */
        let counting = false, count = 0, reset_count = true;
        /* C: select_menu()'s return — -1 cancelled, 0 nothing picked, 1 picked. */
        let n = 0, picked = null, finished = false;
        while (!finished) {
            if (reset_count) { counting = false; count = 0; }
            else reset_count = true;
            const lines = titleErased ? ['', ...windowLines.slice(1)] : windowLines;
            // Build the combined map+window overlay screen.
            // uac: pass the real post-find_ac value for _statusLine2().
            g._screen_output = fullScreen
                ? lines.map((ln) => (ln === '' ? '' : ' ' + ln)).join('\n')
                : build_window_screen(lines, WIN_COL, uac);
            if (disp) {
                disp.cursorCol = endCursorCol;
                disp.cursorRow = endRow;
            }
            const keyCode = await nhgetch();
            const morc = typeof keyCode === 'number' ? String.fromCharCode(keyCode) : String(keyCode || '');
            /* C ref: getline.c:230-257 xwaitforspace(resp) — '\n'/'\r' always
             * break, ESC breaks under iflags.cbreak, and so does any member of
             * `resp`.  Anything else rings the bell and is re-read, leaving the
             * frame identical. */
            if (keyCode !== 10 && keyCode !== 13 && keyCode !== 27
                && RESP.indexOf(morc) < 0) {
                reset_count = false; /* the loop never turned over: keep the count */
                continue;
            }
            /* C ref: wintty.c:1558-1563 — an explicit page selector is taken as
             * a choice even when it also happens to be a mapped menu command. */
            const explicit = RESP_EXPLICIT.indexOf(morc) >= 0;
            if (!explicit && morc >= '0' && morc <= '9') {
                /* C ref: wintty.c:1565-1600 — accumulate a count.  gacc is
                 * empty here, so the group-accelerator shortcut cannot fire. */
                count = count * 10 + (morc.charCodeAt(0) - 48);
                if (count !== 0) { counting = true; reset_count = false; }
                continue;
            }
            if (!explicit && keyCode === 27) {
                /* C ref: wintty.c:1602-1613 — cancel, unless a count is live,
                 * in which case ESC only stops the count. */
                if (!counting) { n = -1; finished = true; }
                continue;
            }
            if (!explicit && (keyCode === 10 || keyCode === 13)) {
                /* C ref: wintty.c:1615-1620 — finished (commit) with nothing
                 * selected, so select_menu returns 0 and options.c's do-while
                 * re-asks with the "(Please choose 'y' or 'n'.)" line. */
                finished = true;
                continue;
            }
            if (!explicit && morc === ' ') {
                /* C ref: wintty.c:1622-1631 MENU_NEXT_PAGE — this menu is one
                 * page, so ' ' finishes it (and '>' deliberately does not). */
                finished = true;
                continue;
            }
            if (!explicit && morc === ':') {
                /* C ref: wintty.c:1700-1730 MENU_SEARCH. */
                const answer = await _menu_search(windowLines, WIN_COL, uac, titleErased);
                titleErased = true;
                if (!answer || answer === '\x1b')
                    continue; /* C: `if (!tmpbuf[0] || tmpbuf[0] == '\033') break;` */
                const searchbuf = `*${answer}*`;
                for (const curr of mlist) {
                    if (pmatchi(searchbuf, curr.str)) {
                        /* C: toggle_menu_curr(); PICK_ONE -> finished. */
                        picked = curr.selector;
                        n = 1;
                        finished = true;
                        break;
                    }
                }
                continue;
            }
            if (explicit) {
                /* C ref: wintty.c:1743-1752 — find, toggle; PICK_ONE finishes. */
                picked = morc;
                n = 1;
                finished = true;
                continue;
            }
            /* C ref: the remaining default_menu_cmds.  On a single-page
             * PICK_ONE menu with nothing selected, MENU_PREVIOUS_PAGE '<',
             * MENU_FIRST_PAGE '^', MENU_LAST_PAGE '|' and MENU_NEXT_PAGE '>'
             * all find their guard false, and MENU_SELECT_ALL '.',
             * MENU_INVERT_ALL '@', MENU_SELECT_PAGE ',' and MENU_INVERT_PAGE
             * '~' are PICK_ANY-only; MENU_UNSELECT_ALL '-' and
             * MENU_UNSELECT_PAGE '\\' run but have nothing to deselect.  All
             * of them re-loop with the frame unchanged. */
        }
        if (n < 0)
            return false; /* C options.c:471-474 — ESC: dotut = FALSE. */
        if (n > 0)
            return picked === 'y'; /* C options.c:468-470 */
        pass++; /* C options.c:481 `if (pass++)` */
    }
}

export async function menu_search_getlin(frameRows) {
    const g = game;
    const disp = g?.nhDisplay;
    const query = 'Search for:';
    let buf = '';
    const prompt = tty_getlin_prompt(query);
    /* C ref: getline.c:63 custompline() -> vpline() pline.c:282 strncpy(gp.prevmsg)
     * runs for the prompt too, so a later Norep() of an older message reprints. */
    g._prevmsg = query + ' ';
    /* C getline.c:63 custompline -> redotoplin: home(); putsyms(query); cl_end()
     * physically overwrites row 0, so any topline residue (e.g. a "Die? [yn]"
     * prompt left standing under the menu) is gone for good. */
    g._topl_sticky = null;
    g._topl_empty_sticky = null;
    g._menu_search_row0_erased = true;
    /* C ref: getline.c:50,106-137 — ^P recall state: `doprev` and the text the
     * recalled message left on the topline (null when the prompt is showing). */
    let doprev = false, recall = null, prevIdx = 0;
    const hist = () => (g._msg_history ||= []);
    const remember = (text) => {
        /* tty_getlin is not SUPPRESS_HISTORY: gt.toplines ("Search for: " + what
         * was typed) is pushed to the history ring by the next message. */
        if (text.length > 0) hist().push(text);
    };
    /* C ref: getline.c:63 custompline(..., "%s ", query) — the trailing space is
     * part of the prompt, and the cursor sits just past what has been typed. */
    const render = async () => {
        const rows = (await frameRows()).slice();
        /* C ref: getline.c:63,174 — paint the prompt once, then echo edits
         * through putsyms().  The painter retains rows erased by wrapping;
         * trailing blanks are trimmed only when encoding the screen. */
        const frame = prompt.render(rows, recall);
        g._screen_output = frame.screen;
        if (disp) {
            [disp.cursorCol, disp.cursorRow] = frame.cursor;
        }
    };
    for (;;) {
        await render();
        const keyCode = await nhgetch();
        if (keyCode === 16 /* ^P */) {
            /* C ref: getline.c:106-119 msg_window:single (or combination acting
             * like single): "need two initially" tty_doprev_message() calls — the
             * first re-shows gt.toplines, the second recalls the newest history
             * entry — then keep reading. */
            const pw = (g.iflags?.prevmsg_window || 's')[0];
            if (pw === 's' || (pw === 'c' && !doprev)) {
                const h = hist();
                if (h.length) {
                    prevIdx = doprev ? (prevIdx - 1 + h.length) % h.length : h.length - 1;
                    recall = h[prevIdx];
                }
                doprev = true;
                continue;
            }
        }
        if (doprev) { prompt.reset(); prompt.append(buf); doprev = false; recall = null; } /* C ref: getline.c:134-141 */
        if (keyCode === 27 /* ESC */) {
            /* C ref: getline.c:88-95 — ESC with something typed is a KILL-LINE
             * that re-prompts; ESC on an empty buffer returns the cancel
             * sentinel. */
            if (buf.length > 0) { prompt.reset(); buf = ''; continue; }
            remember(query + ' ');
            return '\x1b';
        }
        if (keyCode === 10 /* \n */ || keyCode === 13 /* \r */)
            break; /* C ref: getline.c:160-164 */
        if (keyCode === 127 /* erase_char */ || keyCode === 8 /* '\b' */) {
            if (buf.length > 0) { prompt.erase(1); buf = buf.slice(0, -1); }
            continue;
        }
        if (keyCode === 21 /* kill_char = VKILL = ^U */) {
            /* C ref: getline.c:196-207 — empty the line. */
            prompt.erase(buf.length);
            buf = '';
            continue;
        }
        /* C ref: getline.c:165-172 — ' ' <= c && c != '\177' && the line still
         * fits (bufp - obufp < BUFSZ - 1 && bufp - obufp < COLNO). */
        if (keyCode >= 32 && keyCode < 127 && buf.length < COLNO) {
            buf += String.fromCharCode(keyCode);
            prompt.append(String.fromCharCode(keyCode));
        }
        /* else: tty_nhbell(), frame unchanged (getline.c:208-209) */
    }
    /* C ref: getline.c:213 clear_nhwindow(WIN_MESSAGE) — row 0 goes blank, and
     * the caller must keep it blank because the menu is not repainted. */
    remember(query + ' ' + buf);
    /* clear_nhwindow(WIN_MESSAGE) -> docorner(1, cury + 1, 0) (wintty.c:1047-1056)
     * when the typed text wrapped: rows 1..cury lose the menu text. */
    g._menu_search_wrapped = prompt.rowsWrapped();
    return buf;
}

/* C ref: wintty.c:1047-1056 tty_clear_nhwindow(WIN_MESSAGE) -> docorner(1, cury + 1, 0):
 * rows 1..cury, which the wrapped "Search for:" text overwrote, are cleared from
 * column 1 and repainted from the map (the menu text on them does not return). */
export function menu_search_docorner(rows) {
    for (let r = 1; r <= (game._menu_search_wrapped | 0) && r < rows.length; r++)
        rows[r] = render_map_row_clipped(r - 1, COLNO - 1).str;
    return rows;
}

/* C ref: wintty.c:1700-1730 MENU_SEARCH, the whole case, for a menu whose
 * entries are held as a flat list.  `mlist` is the add_menu() list IN CALL
 * ORDER; each entry that is selectable carries `str`, which is what
 * tty_add_menu STORED ("%c - %s", wintty.c:2596-2600) rather than what the
 * page paints — the '-' at str[2] is only overwritten with '*'/'+'/'#' at
 * print time (wintty.c:1465-1470, :1177 set_item_state), so the search always
 * matches against the dash form.
 *
 * Returns true when a PICK_ONE menu should now finish.  `how` is 'ONE', 'ANY'
 * or 'NONE'; PICK_NONE rings the bell and never opens the getlin at all.
 */
export async function menu_search_case(how, mlist, frameRows, toggle) {
    if (how === 'NONE')
        return false;                /* C: tty_nhbell(); break; */
    const answer = await menu_search_getlin(frameRows);
    if (!answer || answer === '\x1b')
        return false;                /* C: `if (!tmpbuf[0] || tmpbuf[0] == '\033') break;` */
    const searchbuf = `*${answer}*`;
    for (const curr of mlist) {
        if (!curr || !curr.str) continue;   /* C: `curr->identifier.a_void` */
        if (!pmatchi(searchbuf, curr.str)) continue;
        toggle(curr);                /* C: toggle_menu_curr() */
        if (how === 'ONE')
            return true;             /* C: finished = TRUE; break; */
    }
    return false;
}

async function _menu_search(windowLines, WIN_COL, uac, titleAlreadyErased) {
    void titleAlreadyErased;
    return menu_search_getlin(() =>
        build_window_screen(['', ...windowLines.slice(1)], WIN_COL, uac).split('\n'));
}
