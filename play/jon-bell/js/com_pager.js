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
import { COLNO, ROWNO, A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA } from './const.js';
import { acurr } from './attrib.js';
import { describe_level_buf } from './dungeon.js';
// WRITE-ONLY route-attribution telemetry (inert unless NH_ROUTE_TELEMETRY=1 —
// only ever set by tools/input-desync-triage.mjs). See js/route_telemetry.js.
import { routeTag } from './route_telemetry.js';
import { NO_COLOR } from './terminal.js';
import { pmatchi } from './strutil.js'; /* C strutil.c:151 — MENU_SEARCH's matcher */
// putmsghistory: feed the quest synopsis into the ^P message-history ring.
import { putmsghistory, _strengthStr, force_more, await_more_dismiss,
         await_topl_more_dismiss, pline_flush_point,
         botl_pmname, botl_upstart_words, botl_mon_mlevel,
         botl_status_suffix, fit_status_line_width, docrt_flags, flush_screen } from './display.js';
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
    if (!game.level)
        return { str: '', endCol: 0 };
    // Find visible range within [1, clipX]
    let firstCol = -1, lastCol = -1;
    for (let x = 1; x <= clipX && x < COLNO; x++) {
        const loc = game.level.at(x, y);
        if (loc?.disp_ch && loc.disp_ch !== ' ') {
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
    /* C ref: win/tty/wintty.c:3927-3936 term_start_attr(ATR_INVERSE) — the
     * hilite_pet / hilite_pile / MG_DETECT / MG_BW_* highlight.  THIS FORK OF
     * render_map_row DROPPED IT ENTIRELY, so every window-overlay frame (menu,
     * text window, farlook tip, #wizidentify) painted a highlighted cell plain
     * while the same cell on an un-overlaid frame was correct.  The bytes and
     * the ordering below are copied from js/display.js render_map_row so the
     * two forks agree cell for cell.
     *
     * MEASURED on gen446-recombine-seed373399 step 787: `#wizmap` reveals a
     * corridor engraving (S_engrcorr '#', MG_BW_ENGR -> ATR_INVERSE), frames
     * 781-786 render it right, and the very first frame with a window over it
     * (the "Tip: Farlooking" text window) drops the attribute — one ATTR-only
     * cell that then held for the session's whole 1,027-step tail. */
    let activeInverse = false;
    const gap = firstCol - 1;
    if (gap > 4)
        output += `\x1b[${gap}C`;
    else if (gap > 0)
        output += ' '.repeat(gap);
    for (let x = firstCol; x <= lastCol; x++) {
        const loc = game.level.at(x, y);
        const ch = loc?.disp_ch ?? ' ';
        /* C flag.h aliases use_color to wc_color, and map_glyphinfo() drops
         * every glyph color while that option is off.  Stored JS display cells
         * retain the color they had before an in-game option toggle, so apply
         * the live gate again when composing a window over the map. */
        const color = game.iflags?.use_color === false
            ? NO_COLOR : (loc?.disp_color ?? NO_COLOR);
        const dec = !!loc?.disp_decgfx;
        const inverse = !!((loc?.disp_attr | 0) & 1 /* ATR_INVERSE */);
        if (ch === ' ') {
            // A blank map cell (S_stone / dark void) is always emitted at the
            // terminal default color in C, and the reset is written BEFORE the
            // blank run — `\e[33m+\e[39m\e[5C`, not `\e[33m+\e[5C\e[39m`.  This
            // is the same close-the-color-run-first rule js/display.js
            // render_map_row() has always applied (js/display.js:1806-1814);
            // this clipped fork of it had dropped the reset entirely, so the
            // preceding glyph's color stayed open across the cursor-forward.
            // seed0006 step 27 renders the farlook tip window over a map row
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
            while (x + run <= lastCol && (game.level.at(x + run, y)?.disp_ch ?? ' ') === ' ')
                run++;
            if (activeDec) {
                output += '\x0f';
                activeDec = false;
            }
            if (run > 4)
                output += `\x1b[${run}C`;
            else
                output += ' '.repeat(run);
            x += run - 1;
            continue;
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
        if (wantAnsi !== activeColor) {
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
function _overlay_status_line(base, col, text) {
    let out = '';
    let visCol = 0;       // current visible column
    let i = 0;
    while (i < base.length && visCol < col) {
        const ch = base[i];
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
            }
            i = j + 1;
            continue;
        }
        // visible character
        out += ch;
        visCol++;
        i++;
    }
    // Pad from current visible column up to `col`
    if (visCol < col) {
        const gap = col - visCol;
        if (gap > 4) out += `\x1b[${gap}C`;
        else out += ' '.repeat(gap);
    }
    out += text;
    return out;
}
/* ── build_text_window_screen — the tty NHW_TEXT (full-screen) window ────────
 * C ref: win/tty tty_create_nhwindow's NHW_TEXT arm gives the window
 * offx = 0, offy = 0, rows = ttyDisplay->rows, cols = ttyDisplay->cols — a TEXT
 * window is ALWAYS full-screen, unlike NHW_MENU which is placed dynamically and
 * overlays the map (build_window_screen above).  tty_display_nhwindow therefore
 * does clear_screen() before process_text_window paints, so the map, both status
 * lines and the topline are all gone while a text window is up.
 *
 * process_text_window then paints line i at row i (tty_curs(window, 1, n) with
 * offx 0 ⇒ column 0) and, having run out of lines, does
 *     tty_curs(BASE_WINDOW, cw->offx + 1, ttyDisplay->rows - 1); cl_end();
 *     dmore(cw, quitchars);
 * i.e. the "--More--" of a TEXT window is pinned to the LAST screen row (23),
 * not to the row after the last text line the way a MENU window's is.  The
 * cursor ends at column strlen("--More--") == 8 of row 23.
 *
 * Verified bit-for-bit against seed2200's four look_all frames (steps 87/90/93/
 * 96, cursor [8,23,1]) and its two look_engrs frames (steps 103/106).
 *
 * Rows are right-trimmed to match the recorder's per-row screen dump (which is
 * why look_all's four-space Qt separator line records as an empty row). */
export function build_text_window_screen(lines) {
    const rows = new Array(24).fill('');
    for (let i = 0; i < lines.length && i < 23; i++)
        rows[i] = _encode_blank_runs(String(lines[i]).replace(/\s+$/, ''));
    rows[23] = '--More--';
    return rows.join('\n');
}
/* The recorder's screen encoding (nomux_capture_screen, the same rule the map
 * and menu builders in this file already follow at `gap > 4`): a run of more
 * than four blanks is emitted as a cursor-forward escape rather than as literal
 * spaces.  Text-window rows have to obey it too — doextversion's Lua licence
 * block is indented five columns and records as "\x1b[5C…" while its
 * four-column-indented neighbours record as literal spaces, and dat/help's
 * column layout records interior gaps the same way ("Welcome to NetHack!" then
 * "\x1b[16C( description of version 3.6 )").  Runs of four or fewer — every
 * look_all / look_traps / look_engrs entry — are unaffected. */
function _encode_blank_runs(row) {
    return row.replace(/ {5,}/g, (m) => `\x1b[${m.length}C`);
}
/* ── tty_fit_text_lines — tty_putstr()'s over-long-line handling for NHW_TEXT ─
 * C ref: win/tty tty_putstr(), the "line doesn't fit" arm.  A putstr line that
 * would not fit the 80-column terminal is NOT clipped: the tty first squeezes
 * the line with mungspaces() (strip edge blanks, collapse internal runs), and
 * only if it is STILL too wide breaks it at the last blank at or before the last usable
 * column (or, when the line has no blank to break at, at that column), putting
 * the remainder on the following line.
 *
 * Both arms are observable in seed2200's option_help window (steps 158-164),
 * which is the only window in the corpus that emits lines wider than the
 * terminal:
 *   squeeze — options.c:9548 formats compound options as "%-20s - %s%c", so
 *     `glyph' pads to 20 and the line reaches 81 columns; C renders it as
 *     "`glyph' - set representation…" with the whole 14-blank run collapsed
 *     (not merely trimmed to fit), and the 79-column neighbours keep their
 *     padding untouched.  Same for `whatis_filter' at 82.
 *   break — "Set options as OPTIONS=<options> in <configfile>" has no repeated
 *     blanks to squeeze, so it breaks after "in" (the last blank below the
 *     limit) and the path continues on the next line.
 *
 * Every line the rest of the corpus paints through a text window is under 80
 * columns (dat/{help,hh,opthelp,history,license,optmenu,usagehlp} contain no
 * line >= 80, and the generated windows — doextversion, dokeylist,
 * domenucontrols, docontact — are narrower still), so this is a no-op for them.
 *
 * PURE FUNCTION on the display channel: no state, no RNG. */
export function tty_fit_text_lines(lines) {
    const CO = 80; /* the tty's column count */
    const out = [];
    for (const line of lines) {
        let str = line;
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
            if (!i)
                i = CO - 2;
            out.push(str.slice(0, i));
            /* C skips the blank it broke at; with no blank (i == CO - 2) the
             * next line resumes at the break column itself. */
            str = str.charAt(i) === ' ' ? str.slice(i + 1) : str.slice(i);
        }
        out.push(str);
    }
    return out;
}

/* ── display_text_window — tty_display_nhwindow(win, FALSE) for an NHW_TEXT ───
 * C ref: win/tty process_text_window paints line i at row i and, each time it is
 * about to write past the last usable row, stops for a "--More--" at row rows-1
 * (23) and clears; after the final line it does one last
 * tty_curs(BASE_WINDOW, offx + 1, rows - 1) + dmore().  So a window of N lines
 * shows ceil(N/23) pages, each ending in a "--More--" at row 23 with the cursor
 * left at column 8.  ESC during a mid-window --More-- sets WIN_CANCELLED and
 * abandons the rest of the window.
 *
 * Lifted here from js/cmd.js (which now delegates) so js/lock.js getdir's
 * help_dir/cmdassist window can share it without a cmd.js <-> lock.js import
 * cycle (cmd.js already imports getdir from lock.js).
 *
 * DISPLAY-CHANNEL ONLY: consumes the dismiss keystroke(s), never any RNG. */
export async function display_text_window(lines) {
    const g = game;
    const PAGE_ROWS = 23; /* ttyDisplay->rows - 1 */
    lines = tty_fit_text_lines(lines);
    /* C ref: tty_display_nhwindow — a TEXT window clear_screen()s the terminal,
     * so an unacknowledged topline message must be page-acked FIRST (the tty's
     * ttyDisplay->toplin == TOPLINE_NEED_MORE more()).  Without this the
     * pending pline is simply erased and its dismiss keystroke leaks to rhack
     * (seed0370 step 144: C shows "You materialize on a different
     * level!--More--" before the quest firsttime window, JS showed the bare
     * message and ate the space as a command).  DISPLAY-channel only: consumes
     * the recorded dismiss key, draws no RNG. */
    if (g._pending_message) {
        await force_more(g._pending_message);
    } else if (g._resultMessage) {
        /* SAME C statement, the other message channel — the repair commit
         * 8035e3fe made for look_here's pile window, needed again here for the
         * identical reason.  C has ONE topline and ONE flag: the page happens
         * whenever ttyDisplay->toplin == TOPLINE_NEED_MORE, which update_topl
         * (topl.c:390) sets on EVERY pline of the turn.  This port splits the
         * topline across two buffers, and a turn whose plines have already been
         * moved into the command-result channel (js/allmain.js:2251, the
         * post-rhack wipe) reaches here with _pending_message empty.
         *
         * MEASURED on seed0361-archeologist-tour step 177: the hero's travel is
         * cut short by teleportitis, teleds() plines "You materialize in a
         * different location!" (js/teleport.js:442) and rhack then hands that
         * line to _resultMessage; on the very next moveloop pass the quest
         * leader — now adjacent — speaks, and qt_pager opens this window.  C
         * paints "You materialize in a different location!--More--" for TWO
         * frames (the recorded 'y' is not a quitchar, so xwaitforspace swallows
         * it and repaints) and only then shows the leader's text.  Without this
         * arm the window opened two frames early over a blank topline and every
         * later frame in the session was misaligned.
         *
         * C's more() is followed by tty_clear_nhwindow(WIN_MESSAGE), so the
         * result channel is cleared here too — force_more/nhgetch only clear
         * _pending_message.  The both-channels-set case above is left alone, on
         * the same reasoning as 8035e3fe.  DISPLAY-ONLY: no RNG. */
        await force_more(g._resultMessage);
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
            if (k === 32 || k === 10 || k === 13 || k === 27) { morc = k; break; }
        }
        if (morc === 27) /* WIN_CANCELLED — skip the rest of the window */
            break;
    }
    // C tty_dismiss_nhwindow: after game-window teardown, leave the final
    // text visible instead of erasing it and redrawing the destroyed map.
    // With live windows, erase_menu_or_text still redraws vision/monsters.
    if (g.iflags.window_inited) {
        docrt_flags(0);
        await flush_screen(1);
    }
}
export function build_window_screen(windowLines, WIN_COL, uacStep0, statusClipCol, pwOverride,
                                    fullScreen = false) {
    const winRows = windowLines.length;
    // CLIP_X: 1-indexed max map column to render when window covers this row.
    const CLIP_X = WIN_COL - 1;
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
                // stays on screen.  seed4500 steps 789/794/811/827/927: the
                // getpos autodescribe line ("staircase up") is still standing
                // at column 0 in C's frame when look_here's pile window opens
                // at column 40; this port blanked it.
                //
                // The source is the same paint-time pair js/display.js
                // _buildScreenOutput reads — a live _pending_message first,
                // then the _topl_sticky fallback for text C left physically on
                // the terminal after our per-read clear dropped it.
                const topl = String(game._pending_message || game._topl_sticky
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
                                                : ' '.repeat(gap);
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
                output += ' '.repeat(col);
            output += text;
            if (screenRow < 23)
                output += '\n';
            continue;
        }
        if (screenRow === 22) {
            // Status line 1: render regardless of window coverage.
            if (statusClipCol === -1) {
                /* A dismissed 22-row tty window erases this row completely;
                 * the following status row is repainted independently. */
                /* C leaves the title text from botl row 22 before the window
                 * corner cleanup, but erases the cursor-forward/stat portion. */
                output += _statusLine1().split('\x1b', 1)[0];
                output += '\n';
                continue;
            }
            if (inWindow && winLine) {
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
                // there: seed0116 step 115 rendered "...St:(end)" where C
                // renders "...St (end)" — the ':' of "St:12" surviving under
                // the window edge.  The margin is skipped with a cursor-forward
                // rather than written as a space, because cl_end() ERASES the
                // cell and an erased cell is not a painted cell.
                const indent = (winLine.match(/^ +/) || [''])[0].length;
                const col = WIN_COL + indent;
                const text = winLine.trim();
                /* An explicit statusClipCol describes the cells left intact by
                 * the preceding taller-window dismissal.  It also applies when
                 * the current window still covers row 22: the overlay compositor
                 * must not resurrect status text in cells the C corner cleanup
                 * erased.  With no clip, retain the normal col-1 behavior. */
                const leftStatus = statusClipCol != null
                    ? Math.min(statusClipCol, Math.max(0, col - 1))
                    : Math.max(0, col - 1);
                output += _overlay_status_line(_statusLine1(), leftStatus, '')
                    + `\x1b[${Math.max(1, col - leftStatus)}C` + text;
            }
            else if (statusClipCol != null) {
                // Below a shorter window after a taller window's dismiss:
                // keep only the leftmost statusClipCol visible columns (clip,
                // pad nothing — _overlay_status_line with empty text and the
                // clip width gives exactly the truncated-left status line).
                output += _overlay_status_line(_statusLine1(), statusClipCol, '');
            }
            else {
                output += _statusLine1();
            }
            output += '\n';
            continue;
        }
        if (screenRow === 23) {
            // Status line 2: render regardless of window coverage
            if (statusClipCol === -1 || statusClipCol > 30) {
                output += _statusLine2(uacStep0, pwOverride);
                continue;
            }
            if (inWindow && winLine) {
                const indent = (winLine.match(/^ +/) || [''])[0].length;
                const col = WIN_COL + indent;
                const text = winLine.trim();
                if (col > 4)
                    output += `\x1b[${col}C`;
                else
                    output += ' '.repeat(col);
                output += text;
            }
            else if (statusClipCol != null) {
                /* Row 23 is cleared by the taller window's dismiss docorner()
                 * exactly as row 22 is, and NOTHING repaints it: C's bot()
                 * (display.c:2286) runs only from flush_screen and only when
                 * disp.botl/botlx is flagged, and merely displaying a menu
                 * window flags neither.  The comment above used to claim row 23
                 * "is fully redrawn by bot()" -- measured false on seed5002
                 * segment 1 step 153, where C's itemactions frame carries an
                 * EMPTY row 23 and this port painted the whole status line into
                 * the corner the dismiss had just erased.
                 *
                 * Reached only from itemactions (js/cmd.js:4395), the sole
                 * caller that passes statusClipCol; every other window keeps the
                 * full-status branch below byte-for-byte. */
                output += _overlay_status_line(_statusLine2(uacStep0, pwOverride),
                                               statusClipCol, '');
            }
            else {
                output += _statusLine2(uacStep0, pwOverride);
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
        const { str: mapStr, endCol: mapEnd } = render_map_row_clipped(gameY, CLIP_X);
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
                output += ' '.repeat(targetCol);
            output += text + '\n';
            continue;
        }
        // Both map (clipped) and window text — combine
        if (mapEnd <= targetCol) {
            const gap = targetCol - mapEnd;
            if (gap > 4)
                output += mapStr + `\x1b[${gap}C` + text + '\n';
            else if (gap > 0)
                output += mapStr + ' '.repeat(gap) + text + '\n';
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
// are ground truth read off the recorder's `^erase_menu_or_text[... offx=N]`
// markers with tools/window-geometry-extract.mjs (that marker IS C's cw->offx;
// the CONTENT left edge, which is what WIN_COL means here, is offx + 1):
//
//   'more' — tty_display_nhwindow() on a window that ends in "--More--":
//            content column = COLNO - 1 - maxcol  ( = 79 - maxcol )
//            seed0500 step 9 (the legacy window): maxcol 58 -> 21.  [cOffx 20]
//
//   'end'  — tty_end_menu()/select_menu() on a picklist that ends in "(end)":
//            content column = min(41, COLNO - 2 - maxcol)  ( = min(41, 78 - w) )
//            seed0500 step 11 (tutorial menu)  maxcol 57 -> 21   [cOffx 20]
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
    return Math.min(41, (footerKind === 'more') ? (79 - maxcol) : (78 - maxcol));
}
// ── Status line helpers (inlined from display.js — not exported there) ──
// C ref: botl.c — bot(), status line 1 and 2 format.
/* ── Role rank tables ─────────────────────────────────────────
 * C ref: botl.c rank_of -> xlev_to_rank -> roles[].rank[i].{m,f}.
 *
 * The 15-entry _CP_ROLE_RANKS literal that used to sit here now lives in
 * js/rank_data.js, generated from the 5.0 role.c through the C preprocessor.
 * Its own header said "mirrored from display.js" and "Source:
 * nethack-c/src/role.c" -- the 3.7 tree -- and it was nonetheless the CORRECT
 * one of the three live copies; js/cmd.js _enl_rank_of, which knew only Wizard
 * and knew it wrong, was not.  Keeping one table means the status line and the
 * enlightenment window can no longer disagree about who the hero is: seed0200
 * step 34 renders "Kira the Candidate" from this function and "You are a Monk,
 * level 1 female human." from that one, two rows apart on the same screen. */
function _cp_rank_of(ulevel, roleName, female) {
    const idx = role_index_by_name(roleName);
    if (idx < 0)
        return null;
    return rank_of(idx, ulevel, female);
}
function _statusLine1() {
    const g = game;
    const u = g.u;
    if (!u)
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
    /* C ref: botl.c:777 — titl = !Upolyd ? rank() : pmname(&mons[u.umonnum],
     * Ugender); botl.c:788-792 capitalizes every word of the monster name.
     * Same arm as js/display.js _statusLine1; this copy paints the rows a menu
     * window covers, so it needs it too (seed5500's post-polymorph pickup menu). */
    /* C you.h:554 — #define Upolyd (u.umonnum != u.umonster).  Was
     * (u.mtimedone > 0), which is you.h:422, the poly TIMER, a different field. */
    const Upolyd = (u.umonnum | 0) !== (u.umonster | 0);
    const role = Upolyd
        ? botl_upstart_words(botl_pmname(u.umonnum | 0, female ? 1 /* FEMALE */ : 0 /* MALE */))
        : (_cp_rank_of(ulevel, lookupName, female)
           || _cp_rank_of(ulevel, roleNameF, female)
           || (female ? g.urole?.name?.f : null)
           || g.urole?.name?.m
           || 'Adventurer');
    const title = `${name} the ${role}`;
    /* C botl.c bot1str — ACURR(A_STR) … ACURR(A_CHA), i.e. acurr() =
     * ABON + ATEMP + ABASE (attrib.c:1206), NOT the raw ABASE array that
     * u.acurr.a holds.  Same stand-in, and the same fix, as js/display.js
     * _statusLine1; this copy paints the rows a menu window covers, so a
     * pickup menu opened while the hero has wounded legs showed the pre-injury
     * Dx (seed0014 step 285, one step after the bear trap). */
    const _hasAttrs = !!(u.acurr && u.acurr.a);
    const _acur = (ci) => (_hasAttrs ? acurr(u, ci) : null);
    const _st = _acur(A_STR);
    const stStr = (_st != null) ? _strengthStr(_st) : '?';
    const stats = `St:${stStr} Dx:${_acur(A_DEX) ?? '?'} Co:${_acur(A_CON) ?? '?'} In:${_acur(A_INT) ?? '?'} Wi:${_acur(A_WIS) ?? '?'} Ch:${_acur(A_CHA) ?? '?'}`;
    const align = u.ualign?.type === 0 ? 'Neutral' : u.ualign?.type > 0 ? 'Lawful' : 'Chaotic';
    const gap = Math.max(1, 31 - title.length);
    if (gap > 4)
        return `${title}\x1b[${gap}C${stats} ${align}`;
    return `${title}${' '.repeat(gap)}${stats} ${align}`;
}
/** C ref: hack.c:4478 money_cnt — walk invent chain, return COIN_CLASS (12) obj quan. */
export function money_cnt(otmp) {
    for (; otmp; otmp = otmp.nobj) {
        if ((otmp.oclass | 0) === 12 /* COIN_CLASS */)
            return otmp.quan | 0;
    }
    return 0;
}
// C ref: botl.c — status line 2 format.
// Respects flags.showexp and flags.time options.
// Note: uac passed as parameter to allow caller control (step 0 = pre-find_ac, step 1+ = current).
function _statusLine2(uacOverride, pwOverride) {
    const g = game;
    const u = g.u;
    if (!u)
        return '';
    const uac = uacOverride !== undefined ? uacOverride : (u.uac ?? 10);
    /* pwOverride mirrors the same display-staleness workaround as uacOverride:
     * C's bot() at allmain.c:891 draws Pw with the pre-boost u.uen/u.uenmax, and
     * u_init_skills_discoveries()'s starting-Pw boost (u_init.c:1405) mutates
     * u.uen/u.uenmax WITHOUT a subsequent bot(), so the legacy-quote frame shows
     * the stale (pre-boost) Pw.  When provided, use it in place of live u.uen. */
    const uen = pwOverride !== undefined ? pwOverride.uen : (u.uen || 0);
    const uenmax = pwOverride !== undefined ? pwOverride.uenmax : (u.uenmax || 0);
    /* C ref: botl.c:837 money_cnt(gi.invent) — gold from the hero's LIVE
     * inventory chain.  The `g._ini_inv_chain ??` prefix that used to be here
     * made the status row read a post-u_init snapshot instead; see the long
     * note at the matching site in js/display.js _statusLine2(). */
    const gold = money_cnt(g.invent ?? null);
    /* C ref: botl.c:823-826 bot_via_windowport()
     *     i = Upolyd ? u.mh : u.uhp;
     *     if (i < 0)              / * gameover sets u.uhp to -1 * /
     *         i = 0;
     *     blstats[idx][BL_HP].a.a_int = min(i, 9999);
     * The ` < 0` floor applies to the DISPLAYED current-hp value only; the
     * max-hp field (botl.c:827-830) and the power fields (botl.c:863-866) get
     * min(x, 9999) with no floor. */
    /* C you.h:554 — #define Upolyd (u.umonnum != u.umonster).  Was
     * (u.mtimedone > 0), which is you.h:422, the poly TIMER, a different field. */
    const Upolyd = (u.umonnum | 0) !== (u.umonster | 0);
    let _hp = Upolyd ? (u.mh | 0) : (u.uhp || 0);
    if (_hp < 0)
        _hp = 0;
    _hp = Math.min(_hp, 9999);
    const _hpmax = Math.min(Upolyd ? (u.mhmax | 0) : (u.uhpmax || 0), 9999);
    /* C ref: botl.c:1047 — the BL_LEVELDESC field is
     *     (void) describe_level(gb.blstats[idx][BL_LEVELDESC].val, 1);
     * NOT "Dlvl:" + u.uz.dlevel, which is what this line used to build.  Two
     * things are wrong with the raw dlevel: it is the level's index WITHIN its
     * dungeon, not depth() (dungeons[dnum].depth_start + dlevel - 1), and it
     * skips describe_level's three name branches (Is_knox / In_quest "Home n" /
     * In_endgame, plus the tutorial label).  js/display.js's _statusLine2 has
     * always gone through describe_level_buf; this copy — which paints the
     * status rows a MENU window leaves uncovered — did not, so the two renderers
     * disagreed on every level outside the main dungeon's dlevel==depth run.
     * Witness: seed2600-wizard-custom-binds step 26, an inventory window opened
     * one step after a level-teleport into Sokoban (soko1, dnum 3 dlevel 1,
     * depth 5): C's row 23 reads "Dlvl:5", this renderer wrote "Dlvl:1", and the
     * map frame either side of it (drawn by display.js) reads Dlvl:5.
     * wintty.c:4546-4556 strips the field's trailing blanks, same as there. */
    const _leveldescField = describe_level_buf(1, u.uz).replace(/ +$/, '');
    let s = `${_leveldescField} $:${gold} HP:${_hp}(${_hpmax}) Pw:${uen}(${uenmax}) AC:${uac}`;
    /* C ref: botl.c:148-154 — the experience field is "HD:<mlevel>" when Upolyd
     * (mons[u.umonnum].mlevel, cf. botl.c:872 BL_HD), else "Xp:<lvl>/<exp>" when
     * flags.showexp, else "Xp:<lvl>".  botl.c:1458-1460 gates the same way:
     * BL_EXP needs (flags.showexp && !Upolyd), BL_XP needs !Upolyd, BL_HD needs
     * Upolyd.  Same arm as js/display.js _statusLine2. */
    if (Upolyd) {
        s += ` HD:${botl_mon_mlevel(u.umonnum | 0)}`;
    }
    else if (g.flags?.showexp) {
        s += ` Xp:${u.ulevel || 1}/${u.uexp || 0}`;
    }
    else {
        s += ` Xp:${u.ulevel || 1}`;
    }
    // C ref: botl.c — T: (turn count) only shown when time option set.
    if (g.flags?.time) {
        s += ` T:${g.moves || 1}`;
    }
    /* C ref: botl.c:186-188 + conditions[] — the hunger / encumbrance / condition
     * tail.  Shared with js/display.js _statusLine2 so the two status-line
     * renderers cannot drift; this copy paints the rows a menu window covers, and
     * had none of these fields (seed5500's post-polymorph pickup menu dropped
     * C's " Blind").  No frozen --More-- frame reaches this renderer, so both
     * values are the live ones. */
    s += botl_status_suffix(u.uhs | 0, undefined);
    return fit_status_line_width(s);
}
// ── pline_with_more ──
// C ref: allmain.c:923 welcome(TRUE) → pline() triggers --More-- in tty after com_pager.
// In C, the welcome pline appears on the topline (row 0); then nhgetch() is called for
// the --More-- dismiss (step 1 capture). Below row 0, the map rows 1..21 (game y=0..20)
// are shown; row 22-23 are status lines (with updated uac from find_ac).
// C ref: tty more() → bot() → draws updated status before capture.
/* C ref: allmain.c:914 welcome() / allmain.c:57-68 moveloop_preamble() — the
 * messages this path renders are PLAIN pline()s in C, so each one makes
 * vpline's flush point (pline.c:274) before its putmesg.  This port renders the
 * frame by hand instead of going through pline(), so the flush point has to be
 * made explicitly; it is the first flush-point divergence in 44 of 44 public
 * sessions (tools/flush-point-diff.mjs).
 *
 * The flush is a REPAINT — it paints into the same buffer this function then
 * overwrites with its hand-composed `output`, so it changes no rendered frame;
 * what it does change is when bot() runs and what the botl latch holds. */
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
    /* topl.c wraps an overlong pline at the --More-- reserve, not at the
     * physical column 79 edge. */
    const wrapAt = (!inlineMore && msgLen > (COLNO - 1))
        ? msg.lastIndexOf(' ', COLNO - 1 - 8) : -1;
    let output = '';
    if (inlineMore) {
        // Row 0: message + '--More--' on the same line
        output += (msg || '') + '--More--\n';
        // Row 1: empty
        output += '\n';
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
    output += _statusLine1() + '\n';
    // Row 23: status line 2 (with uac = actual post-find_ac value)
    output += _statusLine2(uacAtCapture);
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
    // ESC USED TO BE EXCLUDED HERE, citing seed0070 (a v0/3.7 recording that is
    // not in the v5 corpus at all).  It is a dismiss key, and the v5 recordings
    // say so directly: gen676-grammar-seed787207's second keystroke is an ESC on
    // the welcome --More--, and C's step-2 frame is already the tutorial menu
    // while this port was still holding the --More-- up and eating every key
    // after it.  js/display.js _topl_more() — the OTHER copy of this loop, used
    // by every non-startup more() — has always had the ESC arm; only this
    // startup-path copy was missing it.
    /* This loop USED TO BE HAND-ROLLED here, and it was the third copy of
     * xwaitforspace in the port.  It is now js/display.js await_topl_more_dismiss
     * — the same dismiss set, plus the half this copy was missing: topl.c:232-235
     *     if (morc == '\033') { if (!(cw->flags & WIN_NOSTOP)) cw->flags |= WIN_STOP; }
     * i.e. an ESC dismiss of a TOPLINE more() suppresses the next message.  This
     * is a startup-path more() on WIN_MESSAGE (it hand-renders "<msg>--More--" on
     * row 0), so toplMore is TRUE — 94f76c18 landed that model in js/display.js
     * on 2026-08-16 and this copy was left behind.
     *
     * The startup loop uses the returned dismiss key to preserve WIN_STOP
     * across later queued messages.  update_topl samples skip before the
     * more() call, so the incoming message still paints on the iteration
     * which receives ESC; the following messages do not.
     *
     * `rerender` re-shows the same --More-- line so a non-dismiss key produces an
     * identical capture (C re-loops xwaitforspace after ringing the bell): nhgetch
     * clears _pending_message, so the committed message, the screen and the cursor
     * all have to be restored. */
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
    // Clear message after --More-- dismissed
    g._pending_message = '';
    return morc;
}
// ── com_pager_legacy ──
// C ref: allmain.c:911-913 — if (flags.legacy) com_pager(pauper ? "pauper_legacy" : "legacy")
// Called after emitMapstate('post_init') in allmain.js.
// Delivers the Book-of-{god} intro as a NHW_MENU window, then calls nhgetch()
// to consume the dismiss key (which triggers screen capture at step 0).
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
    // C ref: questpgr.c convert_arg 'd' uses u.ualignbase[A_ORIGINAL] (index 1)
    const alignType = (u.ualignbase?.[1]) ?? (u.ualign?.type ?? 0);
    const female = !!(g.flags?.female);
    const template = pauper ? PAUPER_LEGACY_TEXT : LEGACY_TEXT;
    const formattedText = format_legacy_text(template, roleIdx, alignType, female);
    const windowLines = make_window_lines(formattedText);
    // The legacy window is shown by tty_display_nhwindow() and ends in
    // "--More--", so it takes the `79 - maxcol` branch of tty_window_offx().
    // Confirmed against C's own offx marker (seed0500 step 9: maxcol 58 -> 21)
    // and against all 50+ legacy-window sessions in the corpus.
    const footerKind = 'more';
    const WIN_COL = tty_window_offx(windowLines, footerKind);
    // Build combined map+window screen and install for capture hook.
    // preInitAc mirrors C's u.uac=0 (from memset) at the time bot() rendered step 0.
    const screenOutput = build_window_screen(windowLines, WIN_COL, preInitAc, undefined, preInitPw);
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
    // nhgetch() fires capture hook (captures g._screen_output), then reads dismiss key
    await await_more_dismiss(_show);
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
// Called only when g.tutorial_set_in_config is falsy (i.e. tutorial option was
// NOT explicitly set in the session's nethackrc — OPTIONS=tutorial or !tutorial
// absent). When present (seed8000 has OPTIONS=!tutorial), this function is skipped.
//
// WIN_COL computation:
//   Longest line is the config hint (57 chars): 'Put "OPTIONS=!tutorial" in .nethackrc to skip this query.'
//   C: offx = COLNO - maxwidth - 2 = 80 - 57 - 2 = 21.
//   Verified from session: step 2 screen shows \x1b[21C prefix on all lines.
//
// Cursor: after "(end)" at WIN_COL + len("(end)") + 1 = 21 + 5 + 1 = 27.
//   C ref: tty select_menu PICK_ONE — cursor ends one past last char of footer.
//   Verified: session step 2 cursor = [27, 6, 1].
export async function ask_do_tutorial() {
    const g = game;
    const u = g.u;
    /* C tty_display_nhwindow's NHW_MENU arm clears WIN_MESSAGE before
     * drawing an overlay (wintty.c:1939-1940), including after WIN_STOP. */
    g._pending_message = '';
    // C ref: options.c:463-465 — Snprintf buf with rc basename.
    // Harness always uses ".nethackrc" as the config file basename (norc=false).
    const configHint = 'Put "OPTIONS=!tutorial" in .nethackrc to skip this query.';
    // This is a select_menu()/tty_end_menu() picklist ending in "(end)", so it
    // takes the `min(41, 78 - maxcol)` branch of tty_window_offx() — one column
    // LEFT of the "--More--" branch that com_pager_legacy() uses.  The config
    // hint is the longest line at 57 visible columns (the reverse-video title
    // is 23 once its SGR escapes are discounted, the retry line 27, "(end)" 5),
    // so this evaluates to min(41, 78 - 57) = 21 on every pass.
    // Confirmed against C's own offx marker: seed0500 steps 11-15, cOffx=20,
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
    /* C ref: wintty.c:1529-1537 — the response set dmore() hands xwaitforspace.
     *   resp = <page selectors> + " " + "0123456789\033\n\r"
     *          + gm.mapped_menu_cmds + default_menu_cmds
     * with default_menu_cmds (wintty.c:287-292) being MENU_FIRST_PAGE '^',
     * MENU_LAST_PAGE '|', MENU_NEXT_PAGE '>', MENU_PREVIOUS_PAGE '<',
     * MENU_SELECT_ALL '.', MENU_UNSELECT_ALL '-', MENU_INVERT_ALL '@',
     * MENU_SELECT_PAGE ',', MENU_UNSELECT_PAGE '\\', MENU_INVERT_PAGE '~',
     * MENU_SEARCH ':'.  gm.mapped_menu_cmds is empty unless the rc rebinds a
     * menu command (OPTIONS=menu_search:... etc.); no corpus rc does.
     *
     * Everything NOT in this set rings the bell inside xwaitforspace and is
     * re-read WITHOUT leaving it, so the menu frame repeats unchanged — which
     * is why an uppercase 'Y' or 'N' does NOT answer this menu.  That was the
     * bug: this port accepted 'Y'/'N', so gen594-grammar-seed758889 step 13
     * ('Y') and gen610-grammar-seed110890 step 20 ('N') left the menu here
     * while C still had it up. */
    const RESP_EXPLICIT = mlist.map((m) => m.selector).join(''); /* "yn" */
    const RESP = RESP_EXPLICIT + ' ' + '0123456789\x1b\n\r' + '^|><.-@,\\~:';
    let pass = 0;
    /* C ref: options.c:449-472 — do { build; select_menu } while (!n). */
    for (;;) {
        // C ref: options.c:466-494 — build window lines for this iteration.
        const windowLines = [
            '\x1b[7mDo you want a tutorial?\x1b[0m', // end_menu title in reverse video
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
        const WIN_COL = tty_window_offx(windowLines, footerKind);
        // Cursor: at end of "(end)" row, one past last character.
        // C: tty select_menu positions cursor after last char of footer row.
        // "(end)" is 5 chars at column WIN_COL → cursor at WIN_COL + 5 + 1 = 27.
        const endRow = windowLines.length - 1; // 0-indexed screen row of "(end)"
        const endCursorCol = WIN_COL + 5 + 1; // 21 + 5 + 1 = 27
        const disp = g?.nhDisplay;
        /* C ref: win/tty/getline.c:213 tty_getlin's closing
         * clear_nhwindow(WIN_MESSAGE) — home(); cl_end() blanks the WHOLE of
         * screen row 0, including the window's own title text at column
         * WIN_COL.  process_menu_window only repaints a page when page_start
         * is reset (a page change), so within ONE select_menu() call the title
         * row never comes back: gen676-grammar-seed787207 step 25 and
         * gen582-grammar-seed770253 step 25 both show C's menu with an EMPTY
         * row 0 after a MENU_SEARCH.  A fresh select_menu() (the do-while
         * retry) redraws it. */
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
            g._screen_output = build_window_screen(lines, WIN_COL, uac);
            if (disp) {
                disp.cursorCol = endCursorCol;
                disp.cursorRow = endRow;
            }
            // Consume one key via nhgetch (triggers screen capture hook).
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

/* C ref: win/tty/wintty.c:1704 MENU_SEARCH → tty_getlin("Search for:", tmpbuf),
 * i.e. win/tty/getline.c:42 hooked_tty_getlin with no completion hook.
 *
 * This is a getlin drawn OVER a live menu window, which js/wizcmds.js getlin()
 * cannot do: that one renders through _pending_message + flush_screen(), which
 * repaints the map underneath.  C's getlin only touches screen row 0 —
 * custompline() -> update_topl() -> redotoplin() does home(); putsyms(query);
 * cl_end() — so the menu rows below stay exactly as the menu drew them, and
 * the window's own title text at column WIN_COL is erased by that cl_end().
 * gen676-grammar-seed787207 steps 6..24 are the frame-by-frame witness.
 *
 * `frameRows()` must return the CURRENT menu frame as an array of screen rows
 * — exactly what that menu last painted — because everything below row 0 has
 * to survive the getlin untouched.  Row 0 of what it returns is overwritten
 * here and is therefore free to be anything; the CALLER is what has to keep
 * its own row 0 blank AFTERWARDS, since process_menu_window only repaints a
 * page when page_start is reset, so within one select_menu() call the erased
 * title never comes back.
 *
 * Returns the typed string, '' if the player committed an empty line, or
 * '\x1b' when ESC cancelled an already-empty buffer (C: obufp[0] = '\033').
 */
export async function menu_search_getlin(frameRows) {
    const g = game;
    const disp = g?.nhDisplay;
    const query = 'Search for:';
    let buf = '';
    /* C ref: getline.c:63 custompline(..., "%s ", query) — the trailing space is
     * part of the prompt, and the cursor sits just past what has been typed. */
    const render = async () => {
        const rows = (await frameRows()).slice();
        /* C ref: getline.c:63 + redotoplin's cl_end() — putsyms() writes the
         * prompt and the typed text, then cl_end() ERASES the rest of the row,
         * so a trailing space the player typed is a written-then-erased cell
         * and does not survive into the recorded frame.  (gen676-grammar-
         * seed787207 steps 12-15: C's row 0 stays "Search for: izpof" while
         * four spaces are typed, and its cursor walks 18,19,20,21.) */
        rows[0] = (query + ' ' + buf).replace(/\s+$/, '');
        g._screen_output = rows.join('\n');
        if (disp) {
            disp.cursorCol = query.length + 1 + buf.length;
            disp.cursorRow = 0;
        }
    };
    for (;;) {
        await render();
        const keyCode = await nhgetch();
        if (keyCode === 27 /* ESC */) {
            /* C ref: getline.c:88-95 — ESC with something typed is a KILL-LINE
             * that re-prompts; ESC on an empty buffer returns the cancel
             * sentinel. */
            if (buf.length > 0) { buf = ''; continue; }
            return '\x1b';
        }
        if (keyCode === 10 /* \n */ || keyCode === 13 /* \r */)
            break; /* C ref: getline.c:160-164 */
        if (keyCode === 127 /* erase_char */ || keyCode === 8 /* '\b' */) {
            /* C ref: getline.c:141-159 `if (c == erase_char || c == '\b')` —
             * erase one character, ringing the bell at the start of the line.
             * erase_char is the pty's VERASE (sys/share/unixtty.c:218
             * `erase_char = inittyb.erase_sym`), which on the Linux pty the
             * recorder runs under is DEL (0177) — so 0177 takes THIS arm, not
             * the kill_char arm below, and never reaches the printable test
             * (which excludes '\177' explicitly). */
            if (buf.length > 0) buf = buf.slice(0, -1);
            continue;
        }
        if (keyCode === 21 /* kill_char = VKILL = ^U */) {
            /* C ref: getline.c:196-207 — empty the line. */
            buf = '';
            continue;
        }
        /* C ref: getline.c:165-172 — ' ' <= c && c != '\177' && the line still
         * fits (bufp - obufp < BUFSZ - 1 && bufp - obufp < COLNO). */
        if (keyCode >= 32 && keyCode < 127 && buf.length < COLNO)
            buf += String.fromCharCode(keyCode);
        /* else: tty_nhbell(), frame unchanged (getline.c:208-209) */
    }
    /* C ref: getline.c:213 clear_nhwindow(WIN_MESSAGE) — row 0 goes blank, and
     * the caller must keep it blank because the menu is not repainted. */
    return buf;
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
