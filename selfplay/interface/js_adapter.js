// selfplay/interface/js_adapter.js -- Direct JS port adapter
//
// Interfaces the agent with the JS NetHack port by hooking directly into
// the game's Display buffer and input queue. Can run headless (no DOM)
// using a HeadlessGame-like approach for maximum speed.
//
// This adapter drives the game by pushing keys into the input queue
// and reading the display grid directly, bypassing the browser entirely.

import { GameAdapter } from './adapter.js';
import { COLNO, ROWNO, MAP_ROW_START, DOOR, STAIRS, SDOOR } from '../../js/config.js';
import { CLR_BLACK, CLR_GRAY, CLR_WHITE, CLR_BROWN, CLR_MAGENTA } from '../../js/display.js';
import { HeadlessDisplay } from '../../js/headless_runtime.js';

// Display geometry
const TERMINAL_ROWS = 24;
const TERMINAL_COLS = 80;

// Re-export HeadlessDisplay for backwards compatibility
export { HeadlessDisplay };

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
     * Read the current screen from the game's display.
     * Returns a 24x80 grid of {ch, color}.
     */
    async readScreen() {
        const display = this.game.display;
        if (!display) {
            return makeBlankGrid();
        }

        // Use cells for {ch, color} format, fallback to grid for character format
        const cells = display.cells || display.grid;
        if (!cells) {
            return makeBlankGrid();
        }

        // Return a copy to prevent mutation issues
        const grid = [];
        for (let r = 0; r < TERMINAL_ROWS; r++) {
            grid[r] = [];
            for (let c = 0; c < TERMINAL_COLS; c++) {
                const cell = cells[r] && cells[r][c];
                if (!cell) {
                    grid[r][c] = { ch: ' ', color: 7 };
                } else if (typeof cell === 'object') {
                    grid[r][c] = { ch: cell.ch, color: cell.color };
                } else {
                    // Character format - convert to object
                    grid[r][c] = { ch: cell, color: 7 };
                }
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

// HeadlessDisplay is now imported from js/headless_runtime.js (see top of file)

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
