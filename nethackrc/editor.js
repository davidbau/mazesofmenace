// editor.js — 80x24 terminal-styled .nethackrc editor.
//
// Renders inside the canonical Terminal grid (frozen/terminal.js). Supports
// click-to-position, drag-select, arrow keys, PageUp/Down, scrollwheel,
// undo, copy/cut/paste, and autosaves to localStorage['teleport:nethackrc']
// on every edit. The .nethackrc lives outside the per-fork VFS so the same
// options apply across every /play/<owner>/.

import {
    Terminal,
    CLR_GRAY, CLR_BRIGHT_GREEN, CLR_YELLOW, CLR_BRIGHT_BLUE,
    CLR_BRIGHT_CYAN, CLR_WHITE, CLR_ORANGE,
    ATR_INVERSE, ATR_BOLD,
} from './terminal.js';

const COLS = 80;
const ROWS = 24;
const EDIT_ROWS = 22;          // 0..21 are text; 22 is divider; 23 is status
const DIVIDER_ROW = 22;
const STATUS_ROW = 23;
const MAX_LINE = COLS - 1;     // hard cap on line length
const RC_KEY = 'teleport:nethackrc';

// Recognised .nethackrc directives, mirroring NetHack 5.0's
// config_line_stmt[] table in src/cfgfiles.c. Each entry is
// [NAME, minLen]: the user must type at least minLen chars (any case)
// of the prefix; the typed text must be a case-insensitive prefix of
// NAME. Used by the editor only to syntax-highlight recognised LHS
// (the actual parsing happens C-side).
const RC_DIRECTIVES = [
    ['OPTIONS', 4],
    ['AUTOPICKUP_EXCEPTION', 5],
    ['BINDINGS', 4],
    ['AUTOCOMPLETE', 5],
    ['MSGTYPE', 7],
    ['HACKDIR', 4],
    ['LEVELDIR', 4],
    ['LEVELS', 4],
    ['SAVEDIR', 4],
    ['BONESDIR', 5],
    ['DATADIR', 4],
    ['SCOREDIR', 4],
    ['LOCKDIR', 4],
    ['CONFIGDIR', 4],
    ['TROUBLEDIR', 4],
    ['NAME', 4],
    ['ROLE', 4],
    ['CHARACTER', 4],
    ['DOGNAME', 3],
    ['CATNAME', 3],
    ['BOULDER', 3],
    ['MENUCOLOR', 9],
    ['HILITE_STATUS', 6],
    ['WARNINGS', 5],
    ['ROGUESYMBOLS', 4],
    ['SYMBOLS', 4],
    ['WIZKIT', 6],
    ['SOUNDDIR', 8],
    ['SOUND', 5],
    ['CHOOSE', 6],
];

// Returns the LHS length [0..line.length] if `line` begins with a
// recognised rc directive followed by '=' (or ':' for some forms);
// returns 0 otherwise. Highlight runs from col 0 to that length.
function rcDirectiveSpan(line) {
    if (!line) return 0;
    // Locate the separator: '=' is canonical; ':' appears in a few
    // less-common forms (e.g. CHOOSE has its own parser but typically
    // uses '=' too). Stop at first whitespace too — directive names
    // never contain spaces.
    let sep = -1;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '=' || ch === ':' || ch === ' ' || ch === '\t') {
            sep = i;
            break;
        }
    }
    if (sep <= 0) return 0;
    const lhs = line.slice(0, sep);
    const upper = lhs.toUpperCase();
    for (const [name, minLen] of RC_DIRECTIVES) {
        if (upper.length < minLen) continue;
        if (upper.length > name.length) continue;
        if (name.startsWith(upper)) return sep;
    }
    return 0;
}

// Sensible hardfought-flavored defaults: line-drawing walls, autopickup
// only for gold, status line shows XP/score/turn, full end-of-game disclosure.
// Identity options are commented out so players can uncomment what they want.
//
// SYMBOLS override: NetHack 5.0 defaults sink and fountain both to '{',
// which collides at travel-selection time. We restore the classic '#'
// for sink so the symbols disambiguate.
//
// KEEP IN SYNC with the inline DEFAULT_RC fallback in
// contest/template/index.html (the player applies the same defaults
// when localStorage['teleport:nethackrc'] is unset).
const DEFAULT_RC = `# .nethackrc — Teleport Coding Challenge
#
# These options apply to every fork in /play/.
# Edit and they autosave; reload any fork in /play/ to use them.

# Uncomment any of these to fix your character; otherwise NetHack
# prompts at the start of each game.
# OPTIONS=name:Hero
# OPTIONS=role:random
# OPTIONS=race:random
# OPTIONS=gender:random
# OPTIONS=align:random

OPTIONS=!tutorial
OPTIONS=color,hilite_pet,sortpack
OPTIONS=showexp,showscore,time
OPTIONS=mention_walls,autodescribe
OPTIONS=symset:DECGraphics
# Restore travel-friendly glyphs that DECgraphics overrides:
# sink defaults to '{' (collides with fountain); altar defaults to 'π'.
SYMBOLS=S_sink:#
SYMBOLS=S_altar:_
OPTIONS=pickup_types:$
OPTIONS=runmode:walk
OPTIONS=disclose:+i +a +v +g +c +o
`;


class Editor {
    constructor(containerId) {
        this.term = new Terminal(containerId, { rows: ROWS, cols: COLS });
        // Terminal auto-installs a keyboard listener on document; we need
        // ours to fully control behaviour, so uninstall it.
        this.term.uninstallKeyboard();
        this.term.cursSet(1);

        this.lines = [''];
        this.cursor = { row: 0, col: 0 };
        this.anchor = { row: 0, col: 0 };
        this.scroll = 0;
        this.history = [];
        this.dragging = false;
        this.savedFlashUntil = 0;
        this.cellW = 0;
        this.cellH = 0;
        this.gridLeft = 0;
        this.gridTop = 0;

        this.loadFromStorage();
        this._measureCells();
        this._installMouse();
        this._installKeyboard();
        this._installPaste();

        // Periodic re-render so the saved-flash and any time-based bits
        // refresh; very low frequency keeps idle CPU near zero.
        setInterval(() => this.renderStatus(), 250);

        this.render();

        // Hook reset / example buttons.
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) resetBtn.addEventListener('click', () => this.resetToDefault());
    }

    // ── Storage ──────────────────────────────────────────────────────

    loadFromStorage() {
        let text = null;
        let firstVisit = false;
        try { text = localStorage.getItem(RC_KEY); } catch (e) { /* ignore */ }
        if (text === null) {
            text = DEFAULT_RC;
            firstVisit = true;
        }
        this.lines = text.split('\n');
        if (this.lines.length === 0) this.lines = [''];
        // Persist the default immediately so the rc applies to /play/ forks
        // even if the visitor never types anything.
        if (firstVisit) {
            try { localStorage.setItem(RC_KEY, this.lines.join('\n')); }
            catch (e) { /* ignore */ }
        }
    }

    save() {
        try {
            localStorage.setItem(RC_KEY, this.lines.join('\n'));
            this.savedFlashUntil = Date.now() + 800;
        } catch (e) { /* localStorage may be disabled; render still works */ }
    }

    resetToDefault() {
        this.snapshot();
        this.lines = DEFAULT_RC.split('\n');
        this.cursor = { row: 0, col: 0 };
        this.anchor = { row: 0, col: 0 };
        this.scroll = 0;
        this.save();
        this.render();
    }

    // ── Undo history ─────────────────────────────────────────────────

    snapshot() {
        this.history.push({
            lines: this.lines.slice(),
            cursor: { ...this.cursor },
            anchor: { ...this.anchor },
            scroll: this.scroll,
        });
        if (this.history.length > 200) this.history.shift();
    }

    undo() {
        const state = this.history.pop();
        if (!state) return;
        this.lines = state.lines.slice();
        this.cursor = { ...state.cursor };
        this.anchor = { ...state.anchor };
        this.scroll = state.scroll;
        this.save();
        this.render();
    }

    // ── Selection helpers ────────────────────────────────────────────

    hasSelection() {
        return this.cursor.row !== this.anchor.row || this.cursor.col !== this.anchor.col;
    }

    selRange() {
        const a = this.anchor, c = this.cursor;
        if (a.row < c.row || (a.row === c.row && a.col <= c.col)) {
            return { start: a, end: c };
        }
        return { start: c, end: a };
    }

    inSelection(row, col) {
        if (!this.hasSelection()) return false;
        const { start, end } = this.selRange();
        if (row < start.row || row > end.row) return false;
        if (row === start.row && col < start.col) return false;
        if (row === end.row && col >= end.col) return false;
        return true;
    }

    selectionText() {
        if (!this.hasSelection()) return '';
        const { start, end } = this.selRange();
        if (start.row === end.row) {
            return this.lines[start.row].slice(start.col, end.col);
        }
        const parts = [this.lines[start.row].slice(start.col)];
        for (let r = start.row + 1; r < end.row; r++) parts.push(this.lines[r]);
        parts.push(this.lines[end.row].slice(0, end.col));
        return parts.join('\n');
    }

    deleteSelection() {
        if (!this.hasSelection()) return;
        const { start, end } = this.selRange();
        const head = this.lines[start.row].slice(0, start.col);
        const tail = this.lines[end.row].slice(end.col);
        this.lines.splice(start.row, end.row - start.row + 1, head + tail);
        this.cursor = { ...start };
        this.anchor = { ...start };
    }

    // ── Edits ────────────────────────────────────────────────────────

    insertText(text) {
        this.snapshot();
        this.deleteSelection();
        const parts = text.replace(/\r/g, '').split('\n');
        const line = this.lines[this.cursor.row];
        const head = line.slice(0, this.cursor.col);
        const tail = line.slice(this.cursor.col);

        if (parts.length === 1) {
            const merged = head + parts[0] + tail;
            const clipped = merged.slice(0, MAX_LINE);
            this.lines[this.cursor.row] = clipped;
            // Cursor lands after the inserted text, but never past MAX_LINE.
            this.cursor.col = Math.min(head.length + parts[0].length, MAX_LINE);
        } else {
            const first = (head + parts[0]).slice(0, MAX_LINE);
            const last = (parts[parts.length - 1] + tail).slice(0, MAX_LINE);
            const middle = parts.slice(1, -1).map(s => s.slice(0, MAX_LINE));
            this.lines.splice(this.cursor.row, 1, first, ...middle, last);
            this.cursor.row += parts.length - 1;
            this.cursor.col = Math.min(parts[parts.length - 1].length, MAX_LINE);
        }
        this.anchor = { ...this.cursor };
        this.ensureCursorVisible();
        this.save();
        this.render();
    }

    backspace() {
        if (this.hasSelection()) {
            this.snapshot();
            this.deleteSelection();
        } else if (this.cursor.col > 0) {
            this.snapshot();
            const line = this.lines[this.cursor.row];
            this.lines[this.cursor.row] = line.slice(0, this.cursor.col - 1) + line.slice(this.cursor.col);
            this.cursor.col--;
            this.anchor = { ...this.cursor };
        } else if (this.cursor.row > 0) {
            this.snapshot();
            const prevLen = this.lines[this.cursor.row - 1].length;
            const merged = (this.lines[this.cursor.row - 1] + this.lines[this.cursor.row]).slice(0, MAX_LINE);
            this.lines.splice(this.cursor.row - 1, 2, merged);
            this.cursor = { row: this.cursor.row - 1, col: prevLen };
            this.anchor = { ...this.cursor };
        } else {
            return;
        }
        this.ensureCursorVisible();
        this.save();
        this.render();
    }

    deleteForward() {
        if (this.hasSelection()) {
            this.snapshot();
            this.deleteSelection();
        } else if (this.cursor.col < this.lines[this.cursor.row].length) {
            this.snapshot();
            const line = this.lines[this.cursor.row];
            this.lines[this.cursor.row] = line.slice(0, this.cursor.col) + line.slice(this.cursor.col + 1);
            this.anchor = { ...this.cursor };
        } else if (this.cursor.row < this.lines.length - 1) {
            this.snapshot();
            const merged = (this.lines[this.cursor.row] + this.lines[this.cursor.row + 1]).slice(0, MAX_LINE);
            this.lines.splice(this.cursor.row, 2, merged);
            this.anchor = { ...this.cursor };
        } else {
            return;
        }
        this.ensureCursorVisible();
        this.save();
        this.render();
    }

    insertNewline() {
        this.snapshot();
        if (this.hasSelection()) this.deleteSelection();
        const line = this.lines[this.cursor.row];
        const head = line.slice(0, this.cursor.col);
        const tail = line.slice(this.cursor.col);
        this.lines.splice(this.cursor.row, 1, head, tail);
        this.cursor = { row: this.cursor.row + 1, col: 0 };
        this.anchor = { ...this.cursor };
        this.ensureCursorVisible();
        this.save();
        this.render();
    }

    // ── Motion ───────────────────────────────────────────────────────

    moveCursor(dRow, dCol, extendSelection) {
        const newRow = Math.max(0, Math.min(this.lines.length - 1, this.cursor.row + dRow));
        let newCol = this.cursor.col + dCol;
        if (newCol < 0) {
            if (newRow > 0) {
                this.cursor.row = newRow - 1;
                this.cursor.col = this.lines[newRow - 1].length;
            } else {
                this.cursor.col = 0;
            }
        } else if (dRow === 0 && newCol > this.lines[newRow].length) {
            if (newRow < this.lines.length - 1) {
                this.cursor.row = newRow + 1;
                this.cursor.col = 0;
            } else {
                this.cursor.col = this.lines[newRow].length;
            }
        } else {
            this.cursor.row = newRow;
            this.cursor.col = Math.min(newCol, this.lines[newRow].length);
        }
        if (!extendSelection) this.anchor = { ...this.cursor };
        this.ensureCursorVisible();
        this.render();
    }

    moveLineStart(extendSelection) {
        this.cursor.col = 0;
        if (!extendSelection) this.anchor = { ...this.cursor };
        this.render();
    }

    moveLineEnd(extendSelection) {
        this.cursor.col = this.lines[this.cursor.row].length;
        if (!extendSelection) this.anchor = { ...this.cursor };
        this.render();
    }

    movePage(dir, extendSelection) {
        const delta = dir * EDIT_ROWS;
        this.cursor.row = Math.max(0, Math.min(this.lines.length - 1, this.cursor.row + delta));
        this.cursor.col = Math.min(this.cursor.col, this.lines[this.cursor.row].length);
        this.scroll = Math.max(0, Math.min(this.maxScroll(), this.scroll + delta));
        if (!extendSelection) this.anchor = { ...this.cursor };
        this.ensureCursorVisible();
        this.render();
    }

    moveDocStart(extendSelection) {
        this.cursor = { row: 0, col: 0 };
        if (!extendSelection) this.anchor = { ...this.cursor };
        this.ensureCursorVisible();
        this.render();
    }

    moveDocEnd(extendSelection) {
        this.cursor = { row: this.lines.length - 1, col: this.lines[this.lines.length - 1].length };
        if (!extendSelection) this.anchor = { ...this.cursor };
        this.ensureCursorVisible();
        this.render();
    }

    selectAll() {
        this.anchor = { row: 0, col: 0 };
        this.cursor = { row: this.lines.length - 1, col: this.lines[this.lines.length - 1].length };
        this.ensureCursorVisible();
        this.render();
    }

    // ── Scroll management ────────────────────────────────────────────

    maxScroll() {
        return Math.max(0, this.lines.length - EDIT_ROWS);
    }

    ensureCursorVisible() {
        if (this.cursor.row < this.scroll) {
            this.scroll = this.cursor.row;
        } else if (this.cursor.row >= this.scroll + EDIT_ROWS) {
            this.scroll = this.cursor.row - EDIT_ROWS + 1;
        }
        this.scroll = Math.max(0, Math.min(this.maxScroll(), this.scroll));
    }

    // ── Mouse → cell mapping ─────────────────────────────────────────

    _measureCells() {
        const term = this.term;
        if (!term.spans || !term.spans[0] || !term.spans[1]) return;
        // Run after layout settles.
        requestAnimationFrame(() => {
            const r00 = term.spans[0][0].getBoundingClientRect();
            const r01 = term.spans[0][1].getBoundingClientRect();
            const r10 = term.spans[1][0].getBoundingClientRect();
            this.cellW = r01.left - r00.left || 10;
            this.cellH = r10.top - r00.top || 18;
            this.gridLeft = r00.left;
            this.gridTop = r00.top;
        });
    }

    _cellFromEvent(e) {
        // Re-query origin every event to handle scroll/resize.
        const term = this.term;
        if (!term.spans || !term.spans[0]) return { row: 0, col: 0 };
        const r00 = term.spans[0][0].getBoundingClientRect();
        const r01 = term.spans[0][1].getBoundingClientRect();
        const r10 = term.spans[1][0].getBoundingClientRect();
        const cellW = (r01.left - r00.left) || 10;
        const cellH = (r10.top - r00.top) || 18;
        const col = Math.max(0, Math.min(COLS - 1, Math.floor((e.clientX - r00.left) / cellW)));
        const visibleRow = Math.max(0, Math.min(EDIT_ROWS - 1, Math.floor((e.clientY - r00.top) / cellH)));
        const row = Math.max(0, Math.min(this.lines.length - 1, visibleRow + this.scroll));
        const lineLen = this.lines[row].length;
        return { row, col: Math.min(col, lineLen) };
    }

    _installMouse() {
        const target = this.term._pre;
        if (!target) return;

        target.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            const pos = this._cellFromEvent(e);
            this.cursor = { ...pos };
            if (!e.shiftKey) this.anchor = { ...pos };
            this.dragging = true;
            this.render();
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.dragging) return;
            const pos = this._cellFromEvent(e);
            this.cursor = { ...pos };
            this.render();
        });

        document.addEventListener('mouseup', () => {
            this.dragging = false;
        });

        target.addEventListener('dblclick', (e) => {
            // Word select.
            const pos = this._cellFromEvent(e);
            const line = this.lines[pos.row];
            const isWord = (c) => /\w/.test(c);
            let start = pos.col, end = pos.col;
            while (start > 0 && isWord(line[start - 1])) start--;
            while (end < line.length && isWord(line[end])) end++;
            this.anchor = { row: pos.row, col: start };
            this.cursor = { row: pos.row, col: end };
            this.render();
        });

        target.addEventListener('wheel', (e) => {
            e.preventDefault();
            const lines = Math.sign(e.deltaY) * Math.max(1, Math.round(Math.abs(e.deltaY) / 20));
            this.scroll = Math.max(0, Math.min(this.maxScroll(), this.scroll + lines));
            this.render();
        }, { passive: false });
    }

    // ── Keyboard ─────────────────────────────────────────────────────

    _installKeyboard() {
        document.addEventListener('keydown', (e) => {
            // Ignore if focus is in a button / input element.
            const tag = e.target?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

            const ctrl = e.ctrlKey || e.metaKey;
            const shift = e.shiftKey;

            if (ctrl && !e.altKey) {
                switch (e.key.toLowerCase()) {
                    case 'a': e.preventDefault(); this.selectAll(); return;
                    case 'z': e.preventDefault(); this.undo(); return;
                    case 'c': e.preventDefault(); this._clipboardCopy(); return;
                    case 'x': e.preventDefault(); this._clipboardCut(); return;
                    case 'v': e.preventDefault(); this._clipboardPaste(); return;
                    case 'home': e.preventDefault(); this.moveDocStart(shift); return;
                    case 'end': e.preventDefault(); this.moveDocEnd(shift); return;
                }
            }

            switch (e.key) {
                case 'ArrowLeft':  e.preventDefault(); this.moveCursor(0, -1, shift); return;
                case 'ArrowRight': e.preventDefault(); this.moveCursor(0, 1, shift); return;
                case 'ArrowUp':    e.preventDefault(); this.moveCursor(-1, 0, shift); return;
                case 'ArrowDown':  e.preventDefault(); this.moveCursor(1, 0, shift); return;
                case 'Home':       e.preventDefault(); this.moveLineStart(shift); return;
                case 'End':        e.preventDefault(); this.moveLineEnd(shift); return;
                case 'PageUp':     e.preventDefault(); this.movePage(-1, shift); return;
                case 'PageDown':   e.preventDefault(); this.movePage(1, shift); return;
                case 'Backspace':  e.preventDefault(); this.backspace(); return;
                case 'Delete':     e.preventDefault(); this.deleteForward(); return;
                case 'Enter':      e.preventDefault(); this.insertNewline(); return;
                case 'Tab':        e.preventDefault(); this.insertText('    '); return;
                case 'Escape':     e.preventDefault(); this.anchor = { ...this.cursor }; this.render(); return;
            }

            // Printable chars.
            if (e.key.length === 1 && !ctrl && !e.altKey) {
                e.preventDefault();
                this.insertText(e.key);
            }
        });
    }

    _installPaste() {
        // Bind native paste so it works without async clipboard permission.
        document.addEventListener('paste', (e) => {
            const text = e.clipboardData?.getData('text/plain') || '';
            if (!text) return;
            e.preventDefault();
            this.insertText(text);
        });
    }

    async _clipboardCopy() {
        if (!this.hasSelection()) return;
        const text = this.selectionText();
        try {
            await navigator.clipboard.writeText(text);
        } catch (e) { /* permission denied; native paste still works */ }
    }

    async _clipboardCut() {
        if (!this.hasSelection()) return;
        await this._clipboardCopy();
        this.snapshot();
        this.deleteSelection();
        this.save();
        this.render();
    }

    async _clipboardPaste() {
        try {
            const text = await navigator.clipboard.readText();
            if (text) this.insertText(text);
        } catch (e) { /* user can use native ^V via 'paste' event instead */ }
    }

    // ── Render ───────────────────────────────────────────────────────

    render() {
        const term = this.term;
        // Text rows.
        for (let v = 0; v < EDIT_ROWS; v++) {
            const lr = this.scroll + v;
            const line = this.lines[lr] || '';
            // Compute per-line highlights once; per-cell loop just
            // checks ranges. directiveSpan = LHS length if the line
            // starts with a recognised rc directive (e.g. OPTIONS=,
            // SYMBOLS=, MENUCOLOR=, BINDINGS=, MSGTYPE=, …); 0 otherwise.
            const trimmed = line.trimStart();
            const isComment = line.length > 0 && trimmed.startsWith('#');
            const commentStart = isComment ? line.indexOf('#') : -1;
            const directiveSpan = isComment ? 0 : rcDirectiveSpan(line);
            for (let c = 0; c < COLS; c++) {
                const inSel = this.inSelection(lr, c);
                const attr = inSel ? ATR_INVERSE : 0;
                let ch = line[c] || ' ';
                let color = CLR_GRAY;

                if (isComment && c >= commentStart) {
                    color = CLR_BRIGHT_GREEN;
                } else if (directiveSpan > 0 && c < directiveSpan) {
                    color = CLR_BRIGHT_CYAN;
                }

                // If a line is longer than COLS, show '>' indicator at last col.
                if (c === COLS - 1 && line.length > COLS) {
                    ch = '>';
                    color = CLR_ORANGE;
                }
                term.setCell(c, v, ch, color, attr);
            }
        }
        // Divider.
        for (let c = 0; c < COLS; c++) {
            term.setCell(c, DIVIDER_ROW, '\u2500', CLR_GRAY, 0);
        }
        this.renderStatus();

        // Cursor — only show if visible row is in [0, EDIT_ROWS).
        const vrow = this.cursor.row - this.scroll;
        if (vrow >= 0 && vrow < EDIT_ROWS) {
            term.setCursor(this.cursor.col, vrow);
        } else {
            term.setCursor(-1, -1); // hide off-grid
        }
    }

    renderStatus() {
        const term = this.term;
        const left = ` L${this.cursor.row + 1} C${this.cursor.col + 1}`;
        const flashing = Date.now() < this.savedFlashUntil;
        const middle = flashing
            ? '  saved'
            : `  ${this.lines.length} lines`;
        const right = '^Z undo  ^X cut  ^C copy  ^V paste';

        for (let c = 0; c < COLS; c++) {
            term.setCell(c, STATUS_ROW, ' ', CLR_GRAY, 0);
        }
        term.putstr(0, STATUS_ROW, left, CLR_BRIGHT_BLUE, ATR_BOLD);
        term.putstr(left.length, STATUS_ROW, middle, flashing ? CLR_BRIGHT_GREEN : CLR_GRAY, ATR_BOLD);
        const rightCol = COLS - right.length - 1;
        if (rightCol > left.length + middle.length + 2) {
            term.putstr(rightCol, STATUS_ROW, right, CLR_GRAY, 0);
        }
    }
}

// Boot.
new Editor('editor-container');
