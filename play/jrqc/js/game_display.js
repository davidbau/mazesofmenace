// js/game_display.js: the browser display for interactive play. Hand-written glue.
//
// A Terminal (frozen js/terminal.js: grid, DOM, keyboard queue) that shows the
// screens the transpiled game produces. The patched tty port emits, at every
// input boundary and animation frame, its whole 24x80 screen as text with SGR
// colors and DEC line-drawing shifts (the OSC 7777 marker payload, the same
// bytes the recordings are made of); showScreen draws one of them.
// Usage (index.html, frozen/playability_runner.mjs): new GameDisplay('game-container')
// or new GameDisplay(null) for a headless display.
import { Terminal, DEC_TO_UNICODE, NO_COLOR } from './terminal.js';

export class GameDisplay extends Terminal {
    constructor(containerId = null) {
        super(containerId ?? null, { rows: 24, cols: 80 });
        this.terminal = this;
    }

    /** Draw a marker payload (lines of text, SGR, SO/SI) and put the cursor at (cx, cy). */
    showScreen(payload, cx, cy) {
        const lines = payload.split('\n');
        for (let row = 0; row < this.rows; row++) {
            const s = lines[row] || '';
            let col = 0, fg = NO_COLOR, attr = 0, dec = false;
            for (let i = 0; i < s.length; i++) {
                const c = s[i];
                if (c === '\x0e') { dec = true; continue; }
                if (c === '\x0f') { dec = false; continue; }
                if (c === '\x1b' && s[i + 1] === '[') {
                    let j = i + 2;
                    while (j < s.length && /[0-9;?]/.test(s[j])) j++;
                    const params = s.slice(i + 2, j);
                    if (s[j] === 'C') {
                        const n = parseInt(params, 10) || 1;
                        for (let k = 0; k < n && col < this.cols; k++) this.setCell(col++, row, ' ', NO_COLOR, 0);
                    } else if (s[j] === 'm') ({ fg, attr } = sgr(params, fg, attr));
                    i = j;
                    continue;
                }
                if (col < this.cols) this.setCell(col++, row, dec ? (DEC_TO_UNICODE[c] ?? c) : c, fg, attr);
            }
            while (col < this.cols) this.setCell(col++, row, ' ', NO_COLOR, 0);
        }
        this.setCursor(cx, cy);
    }
}

function sgr(params, fg, attr) {
    for (const tok of (params === '' ? '0' : params).split(';')) {
        const n = parseInt(tok || '0', 10);
        if (n === 0) { fg = NO_COLOR; attr = 0; }
        else if (n === 1) attr |= 2;
        else if (n === 4) attr |= 4;
        else if (n === 7) attr |= 1;
        else if (n === 22) attr &= ~2;
        else if (n === 24) attr &= ~4;
        else if (n === 27) attr &= ~1;
        else if (n === 39) fg = NO_COLOR;
        else if (n >= 30 && n <= 37) fg = n - 30;
        else if (n >= 90 && n <= 97) fg = n - 90 + 8;
    }
    return { fg, attr };
}
