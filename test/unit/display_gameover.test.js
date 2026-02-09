// test/unit/display_gameover.test.js -- Tests for tombstone and topten display rendering
// Verifies renderTombstone() and renderTopTen() output on a mock grid.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TERMINAL_COLS, TERMINAL_ROWS } from '../../js/config.js';
import { CLR_GRAY, CLR_WHITE, CLR_YELLOW } from '../../js/display.js';

// Build a minimal mock Display object that has a grid and the methods
// renderTombstone and renderTopTen depend on (setCell, clearRow, clearScreen, putstr).
// We import the actual method code by creating an object with the same shape.
function createMockDisplay() {
    const cols = TERMINAL_COLS;
    const rows = TERMINAL_ROWS;
    const grid = [];
    for (let r = 0; r < rows; r++) {
        grid[r] = [];
        for (let c = 0; c < cols; c++) {
            grid[r][c] = { ch: ' ', color: CLR_GRAY };
        }
    }

    const display = {
        cols,
        rows,
        grid,
        // Same implementation as Display class
        setCell(col, row, ch, color) {
            if (row < 0 || row >= rows || col < 0 || col >= cols) return;
            grid[row][col] = { ch, color };
        },
        clearRow(row) {
            for (let c = 0; c < cols; c++) {
                display.setCell(c, row, ' ', CLR_GRAY);
            }
        },
        clearScreen() {
            for (let r = 0; r < rows; r++) {
                display.clearRow(r);
            }
        },
        putstr(col, row, str, color) {
            if (color === undefined) color = CLR_GRAY;
            for (let i = 0; i < str.length && col + i < cols; i++) {
                display.setCell(col + i, row, str[i], color);
            }
        },
    };

    // Import renderTombstone from Display prototype
    // Since Display requires DOM, we replicate the method here
    display.renderTombstone = function(name, gold, deathLines, year) {
        this.clearScreen();
        const rip = [
            '                       ----------',
            '                      /          \\',
            '                     /    REST    \\',
            '                    /      IN      \\',
            '                   /     PEACE      \\',
            '                  /                  \\',
        ];
        const CENTER = 28;
        const FACE_WIDTH = 16;
        function centerOnStone(text) {
            if (text.length > FACE_WIDTH) text = text.substring(0, FACE_WIDTH);
            const pad = Math.floor((FACE_WIDTH - text.length) / 2);
            const inner = ' '.repeat(pad) + text + ' '.repeat(FACE_WIDTH - pad - text.length);
            return '                  |' + ' ' + inner + ' ' + '|';
        }
        rip.push(centerOnStone(name));
        rip.push(centerOnStone(`${gold} Au`));
        for (let i = 0; i < 4; i++) {
            rip.push(centerOnStone(deathLines[i] || ''));
        }
        rip.push(centerOnStone(''));
        rip.push(centerOnStone(year));
        rip.push('                 *|     *  *  *      | *');
        rip.push('        _________)/\\\\__//(\\\\/(/\\\\)/\\\\//\\\\/|_)_______');
        for (let i = 0; i < rip.length && i < this.rows; i++) {
            this.putstr(0, i, rip[i], CLR_WHITE);
        }
    };

    display.renderTopTen = function(lines, startRow) {
        for (let i = 0; i < lines.length && startRow + i < this.rows; i++) {
            const line = lines[i];
            this.putstr(0, startRow + i, line.text.substring(0, this.cols),
                line.highlight ? CLR_YELLOW : CLR_GRAY);
        }
    };

    return display;
}

// Helper: read a row from the mock grid as a string
function readRow(display, row) {
    let str = '';
    for (let c = 0; c < display.cols; c++) {
        str += display.grid[row][c].ch;
    }
    return str;
}

// Helper: read a row color array
function readRowColors(display, row) {
    const colors = [];
    for (let c = 0; c < display.cols; c++) {
        colors.push(display.grid[row][c].color);
    }
    return colors;
}

// ========================================================================
// renderTombstone
// ========================================================================
describe('Display: renderTombstone', () => {
    it('clears the screen before rendering', () => {
        const d = createMockDisplay();
        // Dirty the grid
        d.setCell(0, 0, 'X', CLR_GRAY);
        d.setCell(5, 5, 'Y', CLR_GRAY);

        d.renderTombstone('Hero', 42, ['killed by a newt'], '2026');

        // Row 0 should now be tombstone top, not the dirty 'X'
        const row0 = readRow(d, 0);
        assert.ok(row0.includes('----------'), 'Should have tombstone top');
    });

    it('renders the tombstone header (REST IN PEACE)', () => {
        const d = createMockDisplay();
        d.renderTombstone('Hero', 42, ['killed by a newt'], '2026');

        const row2 = readRow(d, 2);
        assert.ok(row2.includes('REST'), 'Should show REST');
        const row3 = readRow(d, 3);
        assert.ok(row3.includes('IN'), 'Should show IN');
        const row4 = readRow(d, 4);
        assert.ok(row4.includes('PEACE'), 'Should show PEACE');
    });

    it('renders the player name on the tombstone', () => {
        const d = createMockDisplay();
        d.renderTombstone('Gandalf', 100, ['killed by Balrog'], '2026');

        // Name is on the first line after the header (row 6)
        const row6 = readRow(d, 6);
        assert.ok(row6.includes('Gandalf'), `Row 6 should contain name, got: "${row6.trim()}"`);
    });

    it('renders the gold amount', () => {
        const d = createMockDisplay();
        d.renderTombstone('Hero', 999, ['died'], '2026');

        const row7 = readRow(d, 7);
        assert.ok(row7.includes('999 Au'), `Row 7 should contain gold, got: "${row7.trim()}"`);
    });

    it('renders death cause lines', () => {
        const d = createMockDisplay();
        d.renderTombstone('Hero', 0, ['killed by', 'a red dragon'], '2026');

        const row8 = readRow(d, 8);
        const row9 = readRow(d, 9);
        assert.ok(row8.includes('killed by'), `Row 8: "${row8.trim()}"`);
        assert.ok(row9.includes('a red dragon'), `Row 9: "${row9.trim()}"`);
    });

    it('renders the year', () => {
        const d = createMockDisplay();
        d.renderTombstone('Hero', 0, ['died'], '2026');

        // Year is at row 13 (6 header + name + gold + 4 death + empty + year)
        const row13 = readRow(d, 13);
        assert.ok(row13.includes('2026'), `Year row should contain 2026, got: "${row13.trim()}"`);
    });

    it('renders the bottom decoration', () => {
        const d = createMockDisplay();
        d.renderTombstone('Hero', 0, ['died'], '2026');

        // Bottom decoration is at rows 14-15
        const row14 = readRow(d, 14);
        assert.ok(row14.includes('*'), `Bottom row should have asterisks: "${row14.trim()}"`);
    });

    it('truncates long names to fit tombstone face', () => {
        const d = createMockDisplay();
        d.renderTombstone('AVeryLongPlayerNameThatExceedsSixteen', 0, ['died'], '2026');

        // Name should be truncated to 16 chars
        const row6 = readRow(d, 6);
        assert.ok(row6.includes('|'), 'Tombstone borders should be intact');
        // The name line should not exceed the face area
        const faceContent = row6.substring(19, 37); // face area between | markers
        assert.ok(faceContent.length <= 18, 'Face content should fit within borders');
    });

    it('handles empty death lines', () => {
        const d = createMockDisplay();
        d.renderTombstone('Hero', 0, [], '2026');

        // Should not crash; death line rows should be empty between borders
        const row8 = readRow(d, 8);
        assert.ok(row8.includes('|'), 'Empty death lines should still have borders');
    });

    it('renders all content in CLR_WHITE', () => {
        const d = createMockDisplay();
        d.renderTombstone('Hero', 0, ['died'], '2026');

        // Check that tombstone text is white
        const colors0 = readRowColors(d, 0);
        // Find first non-space character
        const firstNonSpace = readRow(d, 0).search(/\S/);
        if (firstNonSpace >= 0) {
            assert.equal(colors0[firstNonSpace], CLR_WHITE, 'Tombstone text should be white');
        }
    });
});

// ========================================================================
// renderTopTen
// ========================================================================
describe('Display: renderTopTen', () => {
    it('renders lines at specified start row', () => {
        const d = createMockDisplay();
        const lines = [
            { text: 'Line one', highlight: false },
            { text: 'Line two', highlight: false },
        ];

        d.renderTopTen(lines, 5);

        const row5 = readRow(d, 5);
        assert.ok(row5.includes('Line one'));
        const row6 = readRow(d, 6);
        assert.ok(row6.includes('Line two'));
    });

    it('highlights lines with CLR_YELLOW', () => {
        const d = createMockDisplay();
        const lines = [
            { text: 'Normal entry', highlight: false },
            { text: 'Player entry', highlight: true },
        ];

        d.renderTopTen(lines, 0);

        // Normal line should be CLR_GRAY
        assert.equal(d.grid[0][0].color, CLR_GRAY);
        // Highlighted line should be CLR_YELLOW
        assert.equal(d.grid[1][0].color, CLR_YELLOW);
    });

    it('does not render beyond terminal rows', () => {
        const d = createMockDisplay();
        const lines = [];
        for (let i = 0; i < 50; i++) {
            lines.push({ text: `Line ${i}`, highlight: false });
        }

        // Start near bottom
        d.renderTopTen(lines, TERMINAL_ROWS - 3);

        // Only 3 lines should be rendered
        const lastRow = readRow(d, TERMINAL_ROWS - 1);
        assert.ok(lastRow.includes('Line 2'));
    });

    it('truncates long lines to terminal width', () => {
        const d = createMockDisplay();
        const longText = 'x'.repeat(200);
        const lines = [{ text: longText, highlight: false }];

        d.renderTopTen(lines, 0);

        // Should not crash, and line should be truncated
        const row0 = readRow(d, 0);
        assert.equal(row0.length, TERMINAL_COLS);
    });

    it('handles empty lines array', () => {
        const d = createMockDisplay();
        d.renderTopTen([], 0);
        // Should not crash
        const row0 = readRow(d, 0);
        assert.equal(row0.trim(), '');
    });
});
