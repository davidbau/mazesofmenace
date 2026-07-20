// game_display.js — NetHack-specific display wrapper around Terminal.
// Edit freely; the contest only freezes isaac64.js and terminal.js.
//
// Adds game state properties (topMessage, toplines, toplin) and
// message window handling. Delegates all terminal operations to
// the wrapped Terminal instance.
//
// Usage:
//   const terminal = new Terminal('game-container');
//   const display = new GameDisplay(terminal);
//   // display.setCell, display.readKey etc. all delegate to terminal
//   // display.topMessage, display.putstr_message are NetHack-specific

import { Terminal, CLR_GRAY } from './terminal.js';

const TOPLINE_EMPTY = 0;
const TOPLINE_NEED_MORE = 1;

export class GameDisplay {
    constructor(terminalOrContainerId) {
        // Accept either a Terminal instance or a container ID (backward compat)
        if (terminalOrContainerId instanceof Terminal) {
            this.terminal = terminalOrContainerId;
        } else {
            this.terminal = new Terminal(
                terminalOrContainerId != null ? terminalOrContainerId : null,
                { rows: 24, cols: 80 }
            );
        }


        // Frozen Terminal.serialize starts each row at the first non-space
        // cell.  TTY NetHack menus sometimes put inverse video on a leading
        // blank immediately before a heading (for example "  General" with
        // the second blank highlighted).  Preserve those attribute-only
        // leading cells so replayed menu pages can match the C capture.
        this._installSerializePreservingLeadingAttrs();

        // NetHack-specific message state
        this.topMessage = null;
        this.toplines = '';
        this.messages = [];
        this.toplin = TOPLINE_EMPTY;
        this.messageWinFlags = 0;
    }


    _installSerializePreservingLeadingAttrs() {
        const term = this.terminal;
        if (!term || term._teleportLeadingAttrSerialize) return;
        term._teleportLeadingAttrSerialize = true;
        term.serialize = function serialize() {
            const colorToFg = (color) => {
                if (color === 8 || color < 0 || color > 15) return 39;
                return color < 8 ? 30 + color : 90 + (color - 8);
            };
            const sgrTransition = (curFg, curAttr, wantFg, wantAttr) => {
                if (curFg === wantFg && curAttr === wantAttr) return '';
                const wantBold = (wantAttr & 2) !== 0;
                const wantUnder = (wantAttr & 4) !== 0;
                const wantInv = (wantAttr & 1) !== 0;
                const curBold = (curAttr & 2) !== 0;
                const curUnder = (curAttr & 4) !== 0;
                const curInv = (curAttr & 1) !== 0;
                const needReset = (curBold && !wantBold) || (curUnder && !wantUnder) || (curInv && !wantInv);
                const codes = [];
                if (needReset) {
                    codes.push(0);
                    if (wantBold) codes.push(1);
                    if (wantUnder) codes.push(4);
                    if (wantInv) codes.push(7);
                    if (wantFg !== 39) codes.push(wantFg);
                } else {
                    if (wantBold && !curBold) codes.push(1);
                    if (wantUnder && !curUnder) codes.push(4);
                    if (wantInv && !curInv) codes.push(7);
                    if (wantFg !== curFg) codes.push(wantFg);
                }
                return codes.length ? `\x1b[${codes.join(';')}m` : '';
            };
            let lastRow = 0;
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    if (this.grid[r][c].ch !== ' ') { lastRow = r; break; }
                }
            }
            let out = '';
            let curFg = 39, curAttr = 0;
            for (let r = 0; r <= lastRow; r++) {
                let lastCol = -1;
                for (let c = this.cols - 1; c >= 0; c--) {
                    if (this.grid[r][c].ch !== ' ') { lastCol = c; break; }
                }
                if (lastCol < 0) { if (r < lastRow) out += '\n'; continue; }
                let firstCol = 0;
                for (let c = 0; c <= lastCol; c++) {
                    const cell = this.grid[r][c];
                    if (cell.ch !== ' ' || (cell.attr | 0) !== 0) { firstCol = c; break; }
                }
                if (firstCol > 4) out += `\x1b[${firstCol}C`;
                else if (firstCol > 0) out += ' '.repeat(firstCol);
                for (let c = firstCol; c <= lastCol; c++) {
                    const cell = this.grid[r][c];
                    const wantFg = colorToFg(cell.color);
                    const wantAttr = cell.attr | 0;
                    out += sgrTransition(curFg, curAttr, wantFg, wantAttr);
                    curFg = wantFg;
                    curAttr = wantAttr;
                    out += cell.ch;
                }
                out += sgrTransition(curFg, curAttr, 39, 0);
                curFg = 39;
                curAttr = 0;
                if (r < lastRow) out += '\n';
            }
            return out;
        };
    }

    // --- Delegate all Terminal properties and methods ---

    get rows() { return this.terminal.rows; }
    get cols() { return this.terminal.cols; }
    get grid() { return this.terminal.grid; }
    get cursorCol() { return this.terminal.cursorCol; }
    set cursorCol(v) { this.terminal.cursorCol = v; }
    get cursorRow() { return this.terminal.cursorRow; }
    set cursorRow(v) { this.terminal.cursorRow = v; }
    get cursorVisible() { return this.terminal.cursorVisible; }
    set cursorVisible(v) { this.terminal.cursorVisible = v; }
    get spans() { return this.terminal.spans; }
    get container() { return this.terminal.container; }
    get flags() { return this.terminal.flags; }
    set flags(v) { this.terminal.flags = v; }

    // Display methods
    setCell(col, row, ch, color, attr) { return this.terminal.setCell(col, row, ch, color, attr); }
    putstr(col, row, str, color, attr) { return this.terminal.putstr(col, row, str, color, attr); }
    setCursor(col, row) { return this.terminal.setCursor(col, row); }
    clearScreen() { return this.terminal.clearScreen(); }
    clearRow(row) { return this.terminal.clearRow(row); }
    scrollUp() { return this.terminal.scrollUp(); }
    moveCursor(x, y) { return this.terminal.moveCursor(x, y); }
    putChar(x, y, ch, attr) { return this.terminal.putChar(x, y, ch, attr); }
    getChar(x, y) { return this.terminal.getChar(x, y); }
    putString(str) { return this.terminal.putString(str); }
    putCharAtCursor(ch) { return this.terminal.putCharAtCursor(ch); }
    clearToEol() { return this.terminal.clearToEol(); }
    cursSet(visibility) { return this.terminal.cursSet(visibility); }
    flush() { return this.terminal.flush?.(); }
    getPreElement() { return this.terminal.getPreElement(); }
    getCanvas() { return this.terminal.getCanvas?.(); }
    colorToCss(color) { return this.terminal.colorToCss(color); }
    captureForShell() { return this.terminal.captureForShell(); }

    // Input methods — delegate to terminal with NetHack-specific defaults
    pushKey(code) { return this.terminal.pushKey(code); }
    clearInputQueue() { return this.terminal.clearInputQueue(); }
    get isWaitingForInput() { return this.terminal.isWaitingForInput; }
    get inputQueueLength() { return this.terminal.inputQueueLength; }
    get waitEpoch() { return this.terminal.waitEpoch; }

    /**
     * Read a key with NetHack-specific options bundled.
     * Apps set keyMapper, onInterrupt, onEmptyQueue on GameDisplay;
     * these are passed through to terminal.readKey on every call.
     */
    readKey(extraOptions) {
        return this.terminal.readKey({
            keyMapper: this.keyMapper,
            onInterrupt: this.onInterrupt,
            onEmptyQueue: this.onEmptyQueue,
            ...extraOptions,
        });
    }

    /** NetHack key mapper — converts browser keys to game codes. */
    keyMapper = null;
    /** Ctrl-C handler. */
    onInterrupt = null;
    /** Called when input queue is empty (headless replay). */
    onEmptyQueue = null;

    // --- NetHack-specific methods ---

    putstr_message(msg) {
        this.clearRow(0);
        this.putstr(0, 0, msg, CLR_GRAY);
        this.topMessage = msg.trimEnd();
        this.toplines = this.topMessage;
        this.toplin = this.topMessage ? TOPLINE_NEED_MORE : TOPLINE_EMPTY;
        this.messages.push(this.topMessage);
        if (this.messages.length > 20) this.messages.shift();
    }

    renderStatus(_player) {
        // TODO: full status line rendering from player stats
    }

    moveCursorTo(col, row = 0) {
        this.setCursor(col, row);
    }
}
