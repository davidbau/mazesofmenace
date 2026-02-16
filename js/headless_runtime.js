// headless_runtime.js -- Shared headless game runtime
//
// Provides environment-agnostic display, input, and game setup for:
// - Session comparison tests
// - Selfplay AI runner
// - Any headless game execution
//
// Phase 3 refactor: Consolidates multiple HeadlessDisplay implementations
// into one shared module.

import { createInputQueue, setInputRuntime } from './input.js';
import { NetHackGame } from './nethack.js';
import {
    COLNO, ROWNO, TERMINAL_COLS, TERMINAL_ROWS,
    MAP_ROW_START, STATUS_ROW_1, STATUS_ROW_2,
    STONE, VWALL, HWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    DOOR, CORR, ROOM, STAIRS, SDOOR, SCORR,
    FOUNTAIN, THRONE, SINK, GRAVE, ALTAR, POOL, MOAT, WATER,
    LAVAPOOL, LAVAWALL, ICE, IRONBARS, TREE,
    DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, AIR, CLOUD,
    D_ISOPEN, D_CLOSED, D_LOCKED, D_NODOOR,
    A_LAWFUL, A_NEUTRAL, A_CHAOTIC, IS_WALL,
} from './config.js';
import { CLR_BLACK, CLR_GRAY, CLR_WHITE, CLR_RED, CLR_ORANGE, CLR_BROWN,
         CLR_CYAN, CLR_MAGENTA, CLR_BRIGHT_BLUE } from './display.js';
import { rankOf } from './player.js';

// --- Terrain Symbol Maps ---
// C ref: defsym.h PCHAR definitions

const TERRAIN_SYMBOLS_DEC = {
    [STONE]:  { ch: ' ', color: CLR_GRAY },
    [VWALL]:  { ch: '\u2502', color: CLR_GRAY },  // │
    [HWALL]:  { ch: '\u2500', color: CLR_GRAY },  // ─
    [TLCORNER]: { ch: '\u250c', color: CLR_GRAY }, // ┌
    [TRCORNER]: { ch: '\u2510', color: CLR_GRAY }, // ┐
    [BLCORNER]: { ch: '\u2514', color: CLR_GRAY }, // └
    [BRCORNER]: { ch: '\u2518', color: CLR_GRAY }, // ┘
    [CROSSWALL]: { ch: '\u253c', color: CLR_GRAY }, // ┼
    [TUWALL]: { ch: '\u2534', color: CLR_GRAY },   // ┴
    [TDWALL]: { ch: '\u252c', color: CLR_GRAY },   // ┬
    [TLWALL]: { ch: '\u2524', color: CLR_GRAY },   // ┤
    [TRWALL]: { ch: '\u251c', color: CLR_GRAY },   // ├
    [CORR]:   { ch: '#', color: CLR_GRAY },
    [ROOM]:   { ch: '\u00b7', color: CLR_GRAY },   // ·
    [STAIRS]: { ch: '>', color: CLR_GRAY },
    [FOUNTAIN]: { ch: '{', color: 11 },  // CLR_BRIGHT_CYAN
    [THRONE]: { ch: '\\', color: 10 },   // CLR_BRIGHT_GREEN
    [SINK]:   { ch: '#', color: CLR_GRAY },
    [GRAVE]:  { ch: '\u2020', color: CLR_WHITE },  // †
    [ALTAR]:  { ch: '_', color: CLR_GRAY },
    [POOL]:   { ch: '\u2248', color: 4 },   // ≈ blue
    [MOAT]:   { ch: '\u2248', color: 4 },
    [WATER]:  { ch: '\u2248', color: 11 },  // cyan
    [LAVAPOOL]: { ch: '\u2248', color: 1 }, // red
    [LAVAWALL]: { ch: '\u2248', color: 8 }, // bright red
    [ICE]:    { ch: '\u00b7', color: 6 },   // cyan
    [IRONBARS]: { ch: '#', color: 6 },
    [TREE]:   { ch: '#', color: 2 },        // green
    [DRAWBRIDGE_UP]: { ch: '#', color: CLR_BROWN },
    [DRAWBRIDGE_DOWN]: { ch: '\u00b7', color: CLR_BROWN },
    [AIR]:    { ch: ' ', color: 6 },
    [CLOUD]:  { ch: '#', color: CLR_GRAY },
    [SCORR]:  { ch: ' ', color: CLR_GRAY },
};

const TERRAIN_SYMBOLS_ASCII = {
    ...TERRAIN_SYMBOLS_DEC,
    [VWALL]:  { ch: '|', color: CLR_GRAY },
    [HWALL]:  { ch: '-', color: CLR_GRAY },
    [TLCORNER]: { ch: '-', color: CLR_GRAY },
    [TRCORNER]: { ch: '-', color: CLR_GRAY },
    [BLCORNER]: { ch: '-', color: CLR_GRAY },
    [BRCORNER]: { ch: '-', color: CLR_GRAY },
    [CROSSWALL]: { ch: '-', color: CLR_GRAY },
    [TUWALL]: { ch: '-', color: CLR_GRAY },
    [TDWALL]: { ch: '-', color: CLR_GRAY },
    [TLWALL]: { ch: '|', color: CLR_GRAY },
    [TRWALL]: { ch: '|', color: CLR_GRAY },
    [ROOM]:   { ch: '.', color: CLR_GRAY },
    [GRAVE]:  { ch: '|', color: CLR_WHITE },
    [POOL]:   { ch: '}', color: 4 },
    [MOAT]:   { ch: '}', color: 4 },
    [WATER]:  { ch: '}', color: 11 },
    [LAVAPOOL]: { ch: '}', color: 1 },
    [ICE]:    { ch: '.', color: 6 },
};

/**
 * HeadlessDisplay - Environment-agnostic display for headless game execution.
 *
 * Supports two grid formats:
 * - Character grid (for session comparison): this.grid[row][col] = 'char'
 * - Cell grid (for selfplay): this.cells[row][col] = {ch, color}
 *
 * Both are kept in sync automatically.
 */
export class HeadlessDisplay {
    constructor(options = {}) {
        this.cols = TERMINAL_COLS;
        this.rows = TERMINAL_ROWS;

        // Character grid (for session tests)
        this.grid = [];
        // Attribute grid (for inverse video, etc.)
        this.attrs = [];
        // Cell grid with {ch, color} (for selfplay/JSAdapter)
        this.cells = [];

        for (let r = 0; r < this.rows; r++) {
            this.grid[r] = [];
            this.attrs[r] = [];
            this.cells[r] = [];
            for (let c = 0; c < this.cols; c++) {
                this.grid[r][c] = ' ';
                this.attrs[r][c] = 0;
                this.cells[r][c] = { ch: ' ', color: CLR_GRAY };
            }
        }

        this.topMessage = null;
        this.messages = [];
        this.messageNeedsMore = false;

        // Display flags
        // Default to ASCII graphics for test compatibility
        this.flags = {
            msg_window: false,
            DECgraphics: options.DECgraphics === true, // Default to ASCII graphics
            lit_corridor: false,
            ...options.flags,
        };
    }

    /**
     * Set a cell on the display.
     */
    setCell(col, row, ch, color = CLR_GRAY, attr = 0) {
        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
            this.grid[row][col] = ch;
            this.attrs[row][col] = attr;
            this.cells[row][col] = { ch, color };
        }
    }

    /**
     * Clear a row.
     */
    clearRow(row) {
        if (row >= 0 && row < this.rows) {
            for (let c = 0; c < this.cols; c++) {
                this.grid[row][c] = ' ';
                this.attrs[row][c] = 0;
                this.cells[row][c] = { ch: ' ', color: CLR_GRAY };
            }
        }
    }

    /**
     * Clear entire screen.
     */
    clearScreen() {
        for (let r = 0; r < this.rows; r++) {
            this.clearRow(r);
        }
    }

    /**
     * Write a string at position.
     */
    putstr(col, row, str, color = CLR_GRAY, attr = 0) {
        for (let i = 0; i < str.length && col + i < this.cols; i++) {
            this.setCell(col + i, row, str[i], color, attr);
        }
    }

    /**
     * Display a message on row 0 with concatenation logic.
     * C ref: win/tty/topl.c:264-267
     */
    putstr_message(msg) {
        if (msg.trim()) {
            this.messages.push(msg);
            if (this.messages.length > 20) {
                this.messages.shift();
            }
        }

        // Concatenate messages if they fit
        const notDied = !msg.startsWith('You die');
        if (this.topMessage && this.messageNeedsMore && notDied) {
            const combined = this.topMessage + '  ' + msg;
            if (combined.length < this.cols) {
                this.clearRow(0);
                this.putstr(0, 0, combined.substring(0, this.cols));
                this.topMessage = combined;
                this.messageNeedsMore = true;
                return;
            }
        }

        this.clearRow(0);
        this.putstr(0, 0, msg.substring(0, this.cols));
        this.topMessage = msg;
        this.messageNeedsMore = true;
    }

    /**
     * Show --More-- prompt (auto-dismisses in headless mode).
     */
    async morePrompt(nhgetch) {
        if (nhgetch) {
            const msg = this.topMessage || '';
            const moreStr = '--More--';
            const col = Math.min(msg.length, Math.max(0, this.cols - moreStr.length));
            this.putstr(col, 0, moreStr);
            await nhgetch();
        }
        this.clearRow(0);
        this.messageNeedsMore = false;
    }

    /**
     * Render chargen menu (matching C NetHack layout).
     * C ref: win/tty/wintty.c - menu headers use inverse video
     */
    renderChargenMenu(lines, isFirstMenu) {
        let maxcol = 0;
        for (const line of lines) {
            if (line.length > maxcol) maxcol = line.length;
        }

        let offx = Math.max(10, Math.min(41, this.cols - maxcol - 2));
        if (isFirstMenu || offx === 10 || lines.length >= this.rows) {
            offx = 0;
        }

        this.clearScreen();

        for (let i = 0; i < lines.length && i < this.rows; i++) {
            const line = lines[i];
            const isHeader = (i === 0 && line.trim().length > 0 && line.startsWith(' '));
            const attr = isHeader ? 1 : 0;
            this.putstr(offx, i, line, CLR_GRAY, attr);
        }

        return offx;
    }

    /**
     * Render overlay menu (preserves status lines).
     */
    renderOverlayMenu(lines) {
        let maxcol = 0;
        for (const line of lines) {
            if (line.length > maxcol) maxcol = line.length;
        }
        const offx = Math.max(10, Math.min(41, this.cols - maxcol - 2));

        for (let r = 0; r < STATUS_ROW_1; r++) {
            for (let c = offx; c < this.cols; c++) {
                this.grid[r][c] = ' ';
                this.attrs[r][c] = 0;
                this.cells[r][c] = { ch: ' ', color: CLR_GRAY };
            }
        }

        for (let i = 0; i < lines.length && i < STATUS_ROW_1; i++) {
            this.putstr(offx, i, lines[i], CLR_GRAY, 0);
        }
        return offx;
    }

    /**
     * Render lore text.
     */
    renderLoreText(lines, offx) {
        for (let i = 0; i < lines.length && i < this.rows; i++) {
            for (let c = offx; c < this.cols; c++) {
                this.grid[i][c] = ' ';
            }
            this.putstr(offx, i, lines[i]);
        }
        for (let i = lines.length; i < this.rows - 2; i++) {
            for (let c = offx; c < this.cols; c++) {
                this.grid[i][c] = ' ';
            }
        }
    }

    /**
     * Get screen as array of strings (for session comparison).
     */
    getScreenLines() {
        const result = [];
        for (let r = 0; r < this.rows; r++) {
            let line = this.grid[r].join('');
            line = line.replace(/ +$/, ''); // Right-trim
            result.push(line);
        }
        return result;
    }

    /**
     * Get attribute lines as strings.
     */
    getAttrLines() {
        const result = [];
        for (let r = 0; r < this.rows; r++) {
            const attrLine = this.attrs[r].map(a => String(a)).join('').padEnd(80, '0');
            result.push(attrLine);
        }
        return result;
    }

    /**
     * Set screen from array of strings.
     */
    setScreenLines(lines) {
        this.clearScreen();
        const src = Array.isArray(lines) ? lines : [];
        for (let r = 0; r < this.rows && r < src.length; r++) {
            const line = src[r] || '';
            for (let c = 0; c < this.cols && c < line.length; c++) {
                this.grid[r][c] = line[c];
                this.cells[r][c] = { ch: line[c], color: CLR_GRAY };
            }
        }
    }

    /**
     * Render the game map.
     */
    renderMap(gameMap, player, fov, flags = {}) {
        this.flags = { ...this.flags, ...flags };
        const mapOffset = this.flags.msg_window ? 3 : MAP_ROW_START;

        for (let y = 0; y < ROWNO; y++) {
            for (let x = 0; x < COLNO; x++) {
                const row = y + mapOffset;
                const col = x;

                if (!fov || !fov.canSee(x, y)) {
                    const loc = gameMap.at(x, y);
                    if (loc && loc.seenv) {
                        if (loc.mem_obj) {
                            this.setCell(col, row, loc.mem_obj, CLR_BLACK);
                            continue;
                        }
                        if (loc.mem_trap) {
                            this.setCell(col, row, loc.mem_trap, CLR_BLACK);
                            continue;
                        }
                        const sym = this.terrainSymbol(loc, gameMap, x, y);
                        this.setCell(col, row, sym.ch, CLR_BLACK);
                    } else {
                        this.setCell(col, row, ' ', CLR_GRAY);
                    }
                    continue;
                }

                const loc = gameMap.at(x, y);
                if (!loc) {
                    this.setCell(col, row, ' ', CLR_GRAY);
                    continue;
                }

                loc.seenv = 0xFF;

                if (player && x === player.x && y === player.y) {
                    this.setCell(col, row, '@', CLR_WHITE);
                    continue;
                }

                const mon = gameMap.monsterAt(x, y);
                if (mon) {
                    const underObjs = gameMap.objectsAt(x, y);
                    if (underObjs.length > 0) {
                        const underTop = underObjs[underObjs.length - 1];
                        loc.mem_obj = underTop.displayChar || 0;
                    } else {
                        loc.mem_obj = 0;
                    }
                    this.setCell(col, row, mon.displayChar, mon.displayColor);
                    continue;
                }

                const objs = gameMap.objectsAt(x, y);
                if (objs.length > 0) {
                    const topObj = objs[objs.length - 1];
                    loc.mem_obj = topObj.displayChar || 0;
                    this.setCell(col, row, topObj.displayChar, topObj.displayColor);
                    continue;
                }
                loc.mem_obj = 0;

                const trap = gameMap.trapAt(x, y);
                if (trap && trap.tseen) {
                    loc.mem_trap = '^';
                    this.setCell(col, row, '^', CLR_MAGENTA);
                    continue;
                }
                loc.mem_trap = 0;

                // Wizard mode engravings
                if (player?.wizard) {
                    const engr = gameMap.engravingAt(x, y);
                    if (engr) {
                        const engrCh = (loc.typ === CORR || loc.typ === SCORR) ? '#' : '`';
                        loc.mem_obj = engrCh;
                        this.setCell(col, row, engrCh, CLR_BRIGHT_BLUE);
                        continue;
                    }
                }

                const sym = this.terrainSymbol(loc, gameMap, x, y);
                this.setCell(col, row, sym.ch, sym.color);
            }
        }
    }

    /**
     * Render status lines.
     */
    renderStatus(player) {
        if (!player) return;

        const level = player.level || 1;
        const female = player.gender === 1;
        const rank = rankOf(level, player.roleIndex, female);
        const title = `${player.name} the ${rank}`;
        const strDisplay = player._screenStrength || player.strDisplay;
        const line1Parts = [];
        line1Parts.push(`St:${strDisplay}`);
        line1Parts.push(`Dx:${player.attributes[3]}`);
        line1Parts.push(`Co:${player.attributes[4]}`);
        line1Parts.push(`In:${player.attributes[1]}`);
        line1Parts.push(`Wi:${player.attributes[2]}`);
        line1Parts.push(`Ch:${player.attributes[5]}`);
        const alignStr = player.alignment < 0 ? 'Chaotic'
            : player.alignment > 0 ? 'Lawful' : 'Neutral';
        line1Parts.push(alignStr);
        if (player.score > 0) line1Parts.push(`S:${player.score}`);

        this.clearRow(STATUS_ROW_1);
        const line1 = `${title.padEnd(31)}${line1Parts.join(' ')}`;
        this.putstr(0, STATUS_ROW_1, line1.substring(0, this.cols), CLR_GRAY);

        const line2Parts = [];
        line2Parts.push(`Dlvl:${player.dungeonLevel}`);
        line2Parts.push(`$:${player.gold}`);
        line2Parts.push(`HP:${player.hp}(${player.hpmax})`);
        line2Parts.push(`Pw:${player.pw}(${player.pwmax})`);
        line2Parts.push(`AC:${player.ac}`);
        const expValue = Number.isFinite(player.exp) ? player.exp : 0;
        if (player.showExp) {
            line2Parts.push(expValue > 0 ? `Xp:${player.level}/${expValue}` : `Xp:${player.level}`);
        } else {
            line2Parts.push(`Exp:${player.level}`);
        }
        if (player.showTime) line2Parts.push(`T:${player.turns}`);
        if (player.hunger <= 50) line2Parts.push('Fainting');
        else if (player.hunger <= 150) line2Parts.push('Weak');
        else if (player.hunger <= 300) line2Parts.push('Hungry');
        if (player.blind) line2Parts.push('Blind');
        if (player.confused) line2Parts.push('Conf');
        if (player.stunned) line2Parts.push('Stun');
        if (player.hallucinating) line2Parts.push('Hallu');

        this.clearRow(STATUS_ROW_2);
        const line2 = line2Parts.join(' ');
        this.putstr(0, STATUS_ROW_2, line2.substring(0, this.cols), CLR_GRAY);

        // Color-code HP based on percentage
        const hpPct = player.hpmax > 0 ? player.hp / player.hpmax : 1;
        const hpColor = hpPct <= 0.15 ? CLR_RED
            : hpPct <= 0.33 ? CLR_ORANGE
                : CLR_GRAY;
        const hpStr = `HP:${player.hp}(${player.hpmax})`;
        const hpIdx = line2.indexOf(hpStr);
        if (hpIdx >= 0) {
            for (let i = 0; i < hpStr.length; i++) {
                this.setCell(hpIdx + i, STATUS_ROW_2, hpStr[i], hpColor);
            }
        }
    }

    /**
     * Render message window (3 lines at top).
     */
    renderMessageWindow() {
        const MSG_WINDOW_ROWS = 3;
        for (let r = 0; r < MSG_WINDOW_ROWS; r++) {
            this.clearRow(r);
        }

        const recentMessages = this.messages.slice(-MSG_WINDOW_ROWS);
        for (let i = 0; i < recentMessages.length; i++) {
            const msg = recentMessages[i];
            const row = MSG_WINDOW_ROWS - recentMessages.length + i;
            if (msg.length <= this.cols) {
                this.putstr(0, row, msg.substring(0, this.cols));
            } else {
                this.putstr(0, row, msg.substring(0, this.cols - 3) + '...');
            }
        }
    }

    // --- Internal helpers ---

    _isDoorHorizontal(gameMap, x, y) {
        if (!gameMap || x < 0 || y < 0) return false;
        const hasWallEast = x + 1 < COLNO && IS_WALL(gameMap.at(x + 1, y)?.typ || 0);
        const hasWallWest = x - 1 >= 0 && IS_WALL(gameMap.at(x - 1, y)?.typ || 0);
        return hasWallEast || hasWallWest;
    }

    _determineWallType(gameMap, x, y) {
        if (!gameMap || x < 0 || y < 0) return VWALL;

        const N = y - 1 >= 0 && IS_WALL(gameMap.at(x, y - 1)?.typ || 0);
        const S = y + 1 < ROWNO && IS_WALL(gameMap.at(x, y + 1)?.typ || 0);
        const E = x + 1 < COLNO && IS_WALL(gameMap.at(x + 1, y)?.typ || 0);
        const W = x - 1 >= 0 && IS_WALL(gameMap.at(x - 1, y)?.typ || 0);

        if (N && W && !S && !E) return TLCORNER;
        if (N && E && !S && !W) return TRCORNER;
        if (S && W && !N && !E) return BLCORNER;
        if (S && E && !N && !W) return BRCORNER;
        if (N && S && E && !W) return TLWALL;
        if (N && S && W && !E) return TRWALL;
        if (E && W && N && !S) return TUWALL;
        if (E && W && S && !N) return TDWALL;
        if (N && S && E && W) return CROSSWALL;
        if ((N || S) && !E && !W) return VWALL;
        if ((E || W) && !N && !S) return HWALL;
        return VWALL;
    }

    /**
     * Get terrain symbol for a location.
     */
    terrainSymbol(loc, gameMap = null, x = -1, y = -1) {
        const typ = loc.typ;
        const useDEC = this.flags.DECgraphics;
        const TERRAIN_SYMBOLS = useDEC ? TERRAIN_SYMBOLS_DEC : TERRAIN_SYMBOLS_ASCII;

        if (typ === DOOR) {
            if (loc.flags & D_ISOPEN) {
                const isHorizontalDoor = this._isDoorHorizontal(gameMap, x, y);
                return useDEC
                    ? { ch: '\u00b7', color: CLR_BROWN }
                    : { ch: isHorizontalDoor ? '|' : '-', color: CLR_BROWN };
            } else if (loc.flags & D_CLOSED || loc.flags & D_LOCKED) {
                return { ch: '+', color: CLR_BROWN };
            } else {
                return useDEC
                    ? { ch: '\u00b7', color: CLR_GRAY }
                    : { ch: '.', color: CLR_GRAY };
            }
        }

        if (typ === STAIRS) {
            return loc.flags === 1
                ? { ch: '<', color: CLR_GRAY }
                : { ch: '>', color: CLR_GRAY };
        }

        if (typ === ALTAR) {
            const align = loc.altarAlign !== undefined ? loc.altarAlign : 0;
            let altarColor;
            if (align === A_LAWFUL) {
                altarColor = 15;  // CLR_WHITE
            } else if (align === A_CHAOTIC) {
                altarColor = 0;   // CLR_BLACK
            } else {
                altarColor = CLR_GRAY;
            }
            return { ch: '_', color: altarColor };
        }

        if (typ === SDOOR) {
            const wallType = this._determineWallType(gameMap, x, y);
            return TERRAIN_SYMBOLS[wallType] || TERRAIN_SYMBOLS[VWALL];
        }

        if (typ === CORR && this.flags.lit_corridor) {
            return { ch: '#', color: CLR_CYAN };
        }

        return TERRAIN_SYMBOLS[typ] || { ch: '?', color: CLR_MAGENTA };
    }

    // --- Stub methods for Display interface compatibility ---

    cursorOnPlayer() {}
    renderTombstone() {}
    renderTopTen() {}

    async showMenu(title, items) {
        return items.length > 0 ? items[0] : null;
    }
}

/**
 * Create a headless input adapter.
 * Returns an input runtime compatible with setInputRuntime().
 */
export function createHeadlessInput(options = {}) {
    const runtime = createInputQueue();

    // Optionally throw on empty queue (for tests that should have all keys pre-loaded)
    if (options.throwOnEmpty) {
        const originalNhgetch = runtime.nhgetch.bind(runtime);
        runtime.nhgetch = async function() {
            if (!runtime.hasInput()) {
                throw new Error('Input queue empty - test may be missing keystrokes');
            }
            return originalNhgetch();
        };
    }

    return runtime;
}

/**
 * Create null storage (no persistence).
 */
export function createNullStorage() {
    return {
        loadSave: () => null,
        saveSave: () => {},
        deleteSave: () => {},
        hasSave: () => false,
        loadFlags: () => ({}),
        saveFlags: () => {},
        getUrlParams: () => ({}),
    };
}

/**
 * Create a headless game instance ready to run.
 * This is the main entry point for headless game execution.
 */
export async function createHeadlessGame(options = {}) {
    const display = options.display || new HeadlessDisplay({
        DECgraphics: options.DECgraphics !== false,
        flags: options.displayFlags,
    });

    const input = options.input || createHeadlessInput({
        throwOnEmpty: options.throwOnEmptyInput,
    });

    // Set as active input runtime
    setInputRuntime(input);

    const gameOptions = {
        seed: options.seed,
        wizard: options.wizard,
        reset: false,
    };

    const deps = {
        display,
        input,
        lifecycle: {
            restart: options.onRestart || (() => {}),
            replaceUrlParams: () => {},
        },
        hooks: {
            onRuntimeBindings: options.onRuntimeBindings || (() => {}),
        },
    };

    const game = new NetHackGame(gameOptions, deps);

    return { game, display, input };
}

// --- Inventory Display Utilities ---

/**
 * Build inventory display lines matching C NetHack format.
 * Used by selfplay and other headless consumers.
 */
import { doname } from './mkobj.js';

const INVENTORY_CLASS_NAMES = {
    1: 'Weapons', 2: 'Armor', 3: 'Rings', 4: 'Amulets',
    5: 'Tools', 6: 'Comestibles', 7: 'Potions', 8: 'Scrolls',
    9: 'Spellbooks', 10: 'Wands', 11: 'Coins', 12: 'Gems/Stones',
};

const INVENTORY_ORDER = [11, 4, 1, 2, 6, 8, 9, 7, 3, 10, 5, 12, 13, 14, 15];

export function buildInventoryLines(player) {
    if (!player || !player.inventory || player.inventory.length === 0) {
        return ['Not carrying anything.'];
    }

    const groups = {};
    for (const item of player.inventory) {
        const cls = item.oclass;
        if (!groups[cls]) groups[cls] = [];
        groups[cls].push(item);
    }

    const lines = [];
    for (const cls of INVENTORY_ORDER) {
        if (!groups[cls]) continue;
        lines.push(` ${INVENTORY_CLASS_NAMES[cls] || 'Other'}`);
        for (const item of groups[cls]) {
            lines.push(` ${item.invlet} - ${doname(item, player)}`);
        }
    }
    lines.push(' (end)');
    return lines;
}
