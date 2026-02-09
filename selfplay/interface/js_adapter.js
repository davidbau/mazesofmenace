// selfplay/interface/js_adapter.js -- Direct JS port adapter
//
// Interfaces the agent with the JS NetHack port by hooking directly into
// the game's Display buffer and input queue. Can run headless (no DOM)
// using a HeadlessGame-like approach for maximum speed.
//
// This adapter drives the game by pushing keys into the input queue
// and reading the display grid directly, bypassing the browser entirely.

import { GameAdapter } from './adapter.js';

// Display geometry
const TERMINAL_ROWS = 24;
const TERMINAL_COLS = 80;

/**
 * Adapter for the JS NetHack port.
 *
 * Usage:
 *   const adapter = new JSAdapter(game);
 *   await adapter.start();
 *   const grid = await adapter.readScreen();
 *   await adapter.sendKey('h');
 */
export class JSAdapter extends GameAdapter {
    /**
     * @param {Object} game - A NetHackGame or HeadlessGame instance
     * @param {Object} [options]
     * @param {function} [options.pushInput] - The pushInput function from input.js
     * @param {function} [options.rhack] - The rhack function from commands.js
     * @param {function} [options.movemon] - The movemon function from monmove.js
     */
    constructor(game, options = {}) {
        super();
        this.game = game;
        this.pushInput = options.pushInput || null;
        this.rhack = options.rhack || null;
        this.movemon = options.movemon || null;
        this._running = false;
    }

    async start(options = {}) {
        this._running = true;
    }

    /**
     * Send a keystroke by pushing it into the game's input queue,
     * then executing one game turn (rhack + movemon).
     */
    async sendKey(key) {
        if (!this._running) return;

        const ch = typeof key === 'number' ? key : key.charCodeAt(0);

        if (this.rhack) {
            // Drive the game directly: execute the command
            const result = await this.rhack(ch, this.game);

            // If the command took time, run monster movement
            if (result && result.tookTime && this.movemon) {
                this.movemon(
                    this.game.map,
                    this.game.player,
                    this.game.display,
                    this.game.fov
                );
            }
        } else if (this.pushInput) {
            // Just push the key and let the game's main loop handle it
            this.pushInput(ch);
        }
    }

    /**
     * Read the current screen from the game's display grid.
     * Returns a 24x80 grid of {ch, color}.
     */
    async readScreen() {
        const display = this.game.display;
        if (!display || !display.grid) {
            // Return blank grid if no display
            return makeBlankGrid();
        }

        // The Display.grid is already in the right format: [row][col] = {ch, color}
        // Return a copy to prevent mutation issues
        const grid = [];
        for (let r = 0; r < TERMINAL_ROWS; r++) {
            grid[r] = [];
            for (let c = 0; c < TERMINAL_COLS; c++) {
                const cell = display.grid[r] && display.grid[r][c];
                grid[r][c] = cell ? { ch: cell.ch, color: cell.color } : { ch: ' ', color: 7 };
            }
        }
        return grid;
    }

    async isRunning() {
        return this._running && !this.game.gameOver;
    }

    async stop() {
        this._running = false;
    }
}

/**
 * A minimal display that captures output without DOM rendering.
 * Drop-in replacement for Display in headless mode.
 */
export class HeadlessDisplay {
    constructor() {
        this.cols = TERMINAL_COLS;
        this.rows = TERMINAL_ROWS;
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.cols; c++) {
                this.grid[r][c] = { ch: ' ', color: 7 };
            }
        }
        this.messages = [];
        this.topMessage = '';
    }

    setCell(col, row, ch, color) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
        this.grid[row][col] = { ch, color };
    }

    clearRow(row) {
        for (let c = 0; c < this.cols; c++) {
            this.grid[row][c] = { ch: ' ', color: 7 };
        }
    }

    putstr(col, row, str, color = 7) {
        for (let i = 0; i < str.length && col + i < this.cols; i++) {
            this.setCell(col + i, row, str[i], color);
        }
    }

    putstr_message(msg) {
        this.clearRow(0);
        this.putstr(0, 0, msg.substring(0, this.cols), 14); // CLR_WHITE
        this.topMessage = msg;
        if (msg.trim()) this.messages.push(msg);
    }

    async morePrompt() {
        // In headless mode, auto-dismiss --More-- prompts
    }

    renderMap() {}
    renderStatus() {}
    clearScreen() {
        for (let r = 0; r < this.rows; r++) this.clearRow(r);
    }
    cursorOnPlayer() {}
    renderChargenMenu() { return 0; }
    renderLoreText() {}
    renderTombstone() {}
    renderTopTen() {}

    async showMenu(title, items) {
        // In headless mode, auto-select first item
        return items.length > 0 ? items[0] : null;
    }
}

function makeBlankGrid() {
    const grid = [];
    for (let r = 0; r < TERMINAL_ROWS; r++) {
        grid[r] = [];
        for (let c = 0; c < TERMINAL_COLS; c++) {
            grid[r][c] = { ch: ' ', color: 7 };
        }
    }
    return grid;
}
