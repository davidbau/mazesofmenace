#!/usr/bin/env node
// selfplay/runner/headless_runner.js -- Run the AI agent against the JS port headlessly
//
// Drives the agent through the JS NetHack game engine without any DOM,
// perfect for stress testing and trace collection.
//
// Usage:
//   node selfplay/runner/headless_runner.js [--seed N] [--turns N] [--verbose]

import { Agent } from '../agent.js';
import { JSAdapter, HeadlessDisplay } from '../interface/js_adapter.js';
import { parseScreen } from '../perception/screen_parser.js';
import { parseStatus } from '../perception/status_parser.js';

// Import game modules
import { initRng, rn2, rnd } from '../../js/rng.js';
import { initLevelGeneration, makelevel, wallification } from '../../js/dungeon.js';
import { Player, roles } from '../../js/player.js';
import { rhack } from '../../js/commands.js';
import { movemon, initrack, settrack } from '../../js/monmove.js';
import { FOV } from '../../js/vision.js';
import { simulatePostLevelInit } from '../../js/u_init.js';
import {
    COLNO, ROWNO, NORMAL_SPEED, A_DEX, A_CON,
    RACE_HUMAN, MESSAGE_ROW, MAP_ROW_START, STATUS_ROW_1, STATUS_ROW_2,
    STONE, VWALL, HWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL, DOOR, CORR, ROOM,
    STAIRS, FOUNTAIN, THRONE, SINK, GRAVE, ALTAR, POOL, MOAT,
    WATER, LAVAPOOL, LAVAWALL, ICE, IRONBARS, TREE,
    DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, AIR, CLOUD, SDOOR, SCORR,
    D_NODOOR, D_CLOSED, D_ISOPEN, D_LOCKED,
} from '../../js/config.js';

// Terrain symbol mapping (matches display.js)
function getTerrainSymbol(loc) {
    const typ = loc.typ;
    if (typ === DOOR) {
        if (loc.flags & D_ISOPEN) return { ch: '\u00b7', color: 3 };
        if (loc.flags & D_CLOSED || loc.flags & D_LOCKED) return { ch: '+', color: 3 };
        return { ch: '\u00b7', color: 7 };
    }
    if (typ === STAIRS) return loc.flags === 1 ? { ch: '<', color: 7 } : { ch: '>', color: 7 };
    if (typ === SDOOR) return loc.horizontal ? { ch: '\u2500', color: 7 } : { ch: '\u2502', color: 7 };
    const syms = {
        [STONE]: { ch: ' ', color: 7 }, [VWALL]: { ch: '\u2502', color: 7 },
        [HWALL]: { ch: '\u2500', color: 7 }, [TLCORNER]: { ch: '\u250c', color: 7 },
        [TRCORNER]: { ch: '\u2510', color: 7 }, [BLCORNER]: { ch: '\u2514', color: 7 },
        [BRCORNER]: { ch: '\u2518', color: 7 }, [CROSSWALL]: { ch: '\u253c', color: 7 },
        [TUWALL]: { ch: '\u2534', color: 7 }, [TDWALL]: { ch: '\u252c', color: 7 },
        [TLWALL]: { ch: '\u2524', color: 7 }, [TRWALL]: { ch: '\u251c', color: 7 },
        [CORR]: { ch: '#', color: 7 }, [ROOM]: { ch: '\u00b7', color: 7 },
        [FOUNTAIN]: { ch: '{', color: 11 }, [THRONE]: { ch: '\\', color: 10 },
        [SINK]: { ch: '#', color: 7 }, [GRAVE]: { ch: '\u2020', color: 14 },
        [ALTAR]: { ch: '_', color: 7 }, [POOL]: { ch: '\u2248', color: 4 },
        [MOAT]: { ch: '\u2248', color: 4 }, [WATER]: { ch: '\u2248', color: 11 },
        [LAVAPOOL]: { ch: '\u2248', color: 1 }, [LAVAWALL]: { ch: '\u2248', color: 8 },
        [ICE]: { ch: '\u00b7', color: 6 }, [IRONBARS]: { ch: '#', color: 6 },
        [TREE]: { ch: '#', color: 2 }, [DRAWBRIDGE_UP]: { ch: '#', color: 3 },
        [DRAWBRIDGE_DOWN]: { ch: '\u00b7', color: 3 }, [AIR]: { ch: ' ', color: 6 },
        [CLOUD]: { ch: '#', color: 7 }, [SCORR]: { ch: ' ', color: 7 },
    };
    return syms[typ] || { ch: '?', color: 5 };
}

/**
 * A headless game instance that mirrors NetHackGame but without DOM dependencies.
 */
class HeadlessGame {
    constructor(seed, roleIndex = 11) { // default Valkyrie
        this.seed = seed;
        this.roleIndex = roleIndex;

        // Initialize RNG and level generation
        initRng(seed);
        initrack();
        initLevelGeneration(roleIndex);

        // Generate first level
        this.map = makelevel(1);
        wallification(this.map);

        // Set up player
        this.player = new Player();
        this.player.initRole(roleIndex);
        this.player.name = 'Agent';
        this.player.gender = 0; // male

        // Place player at upstair
        if (this.map.upstair) {
            this.player.x = this.map.upstair.x;
            this.player.y = this.map.upstair.y;
        }

        // Post-level init
        const initResult = simulatePostLevelInit(this.player, this.map, 1);

        // Display and FOV
        this.display = new HeadlessDisplay();
        this.fov = new FOV();

        // Game state
        this.levels = { 1: this.map };
        this.gameOver = false;
        this.gameOverReason = '';
        this.turnCount = 0;
        this.wizard = false;
        this.seerTurn = initResult?.seerTurn || 0;
        this.occupation = null;

        // Render initial state
        this._renderAll();
    }

    _renderAll() {
        this.fov.compute(this.map, this.player.x, this.player.y);
        this._renderDisplay();
    }

    _renderDisplay() {
        // Manually render the map to the headless display grid
        // since HeadlessDisplay.renderMap is a no-op, we build the grid ourselves
        const display = this.display;
        const map = this.map;
        const player = this.player;
        const fov = this.fov;

        // Message line (row 0) - handled by putstr_message

        // Map area (rows 1-21)
        for (let y = 0; y < ROWNO; y++) {
            for (let x = 0; x < COLNO; x++) {
                const row = y + MAP_ROW_START;
                const col = x;

                if (!fov.canSee(x, y)) {
                    const loc = map.at(x, y);
                    if (loc && loc.seenv) {
                        // Remembered terrain (dark)
                        const sym = getTerrainSymbol(loc);
                        display.setCell(col, row, sym.ch, 0); // CLR_BLACK (dim)
                    } else {
                        display.setCell(col, row, ' ', 7);
                    }
                    continue;
                }

                const loc = map.at(x, y);
                if (!loc) { display.setCell(col, row, ' ', 7); continue; }
                loc.seenv = 0xFF;

                // Player
                if (x === player.x && y === player.y) {
                    display.setCell(col, row, '@', 14); // CLR_WHITE
                    continue;
                }

                // Monsters
                const mon = map.monsterAt(x, y);
                if (mon) {
                    display.setCell(col, row, mon.displayChar, mon.displayColor);
                    continue;
                }

                // Objects
                const objs = map.objectsAt(x, y);
                if (objs.length > 0) {
                    const topObj = objs[objs.length - 1];
                    display.setCell(col, row, topObj.displayChar, topObj.displayColor);
                    continue;
                }

                // Traps
                const trap = map.trapAt(x, y);
                if (trap && trap.tseen) {
                    display.setCell(col, row, '^', 5); // CLR_MAGENTA
                    continue;
                }

                // Terrain
                const sym = getTerrainSymbol(loc);
                display.setCell(col, row, sym.ch, sym.color);
            }
        }

        // Status lines (rows 22-23)
        this._renderStatusLines();
    }

    _renderStatusLines() {
        const p = this.player;
        const d = this.display;

        const alignStr = p.alignment < 0 ? 'Chaotic' : p.alignment > 0 ? 'Lawful' : 'Neutral';
        const line1 = `${p.name}  St:${p.attributes[0]}  Dx:${p.attributes[3]}  Co:${p.attributes[4]}  In:${p.attributes[1]}  Wi:${p.attributes[2]}  Ch:${p.attributes[5]}  ${alignStr}`;
        d.clearRow(STATUS_ROW_1);
        d.putstr(0, STATUS_ROW_1, line1.substring(0, 80), 7);

        const parts = [];
        parts.push(`Dlvl:${p.dungeonLevel}`);
        parts.push(`$:${p.gold}`);
        parts.push(`HP:${p.hp}(${p.hpmax})`);
        parts.push(`Pw:${p.pw}(${p.pwmax})`);
        parts.push(`AC:${p.ac}`);
        parts.push(`Xp:${p.level}/${p.exp || 0}`);
        parts.push(`T:${p.turns}`);
        if (p.hunger <= 50) parts.push('Fainting');
        else if (p.hunger <= 150) parts.push('Weak');
        else if (p.hunger <= 300) parts.push('Hungry');
        const line2 = parts.join('  ');
        d.clearRow(STATUS_ROW_2);
        d.putstr(0, STATUS_ROW_2, line2.substring(0, 80), 7);
    }

    /**
     * Execute one agent action: process command + monster turn.
     */
    async executeCommand(ch) {
        const code = typeof ch === 'string' ? ch.charCodeAt(0) : ch;
        const result = await rhack(code, this);

        if (result && result.tookTime) {
            settrack(this.player);
            movemon(this.map, this.player, this.display, this.fov);
            this.turnCount++;
            this.player.turns = this.turnCount;

            // Monster speed adjustments
            for (const mon of this.map.monsters) {
                if (mon.dead) continue;
                let mmove = mon.speed;
                const mmoveAdj = mmove % NORMAL_SPEED;
                mmove -= mmoveAdj;
                if (rn2(NORMAL_SPEED) < mmoveAdj) mmove += NORMAL_SPEED;
                mon.movement += mmove;
            }

            // Per-turn effects
            rn2(70);   // monster spawn check
            rn2(20);   // gethungry
            this.player.hunger--;
        }

        // Re-render
        this.fov.compute(this.map, this.player.x, this.player.y);
        this._renderDisplay();

        // Check for death
        if (this.player.hp <= 0) {
            this.gameOver = true;
            this.gameOverReason = 'died';
        }

        return result;
    }
}

/**
 * Custom adapter for the headless game that drives it directly.
 */
class HeadlessAdapter {
    constructor(game) {
        this.game = game;
        this._running = true;
    }

    async start() { this._running = true; }

    async sendKey(key) {
        if (!this._running) return;
        await this.game.executeCommand(key);
    }

    async readScreen() {
        return this.game.display.grid;
    }

    async isRunning() {
        return this._running && !this.game.gameOver;
    }

    async stop() { this._running = false; }
}

/**
 * Run the agent headlessly.
 */
export async function runHeadless(options = {}) {
    const seed = options.seed || Math.floor(Math.random() * 100000);
    const maxTurns = options.maxTurns || 1000;
    const verbose = options.verbose || false;
    const roleIndex = options.roleIndex || 11; // Valkyrie

    if (verbose) {
        console.log(`Starting headless game: seed=${seed}, maxTurns=${maxTurns}, role=${roles[roleIndex].name}`);
    }

    const game = new HeadlessGame(seed, roleIndex);
    const adapter = new HeadlessAdapter(game);
    const agent = new Agent(adapter, {
        maxTurns,
        onTurn: verbose ? (info) => {
            if (info.turn % 100 === 0 || info.turn <= 20) {
                const act = info.action;
                const actionStr = act ? `${act.type}(${act.key}): ${act.reason}` : '?';
                console.log(`  Turn ${info.turn}: HP=${info.hp}/${info.hpmax} Dlvl=${info.dlvl} pos=(${info.position?.x},${info.position?.y}) ${actionStr}`);
            }
        } : null,
    });

    const stats = await agent.run();

    if (verbose) {
        console.log(`\nGame over after ${stats.turns} turns:`);
        console.log(`  Max depth: ${stats.maxDepth}`);
        console.log(`  Death cause: ${stats.deathCause || 'survived'}`);
    }

    return {
        seed,
        stats,
        game,
    };
}

// --- CLI entry point ---
if (process.argv[1] && process.argv[1].endsWith('headless_runner.js')) {
    const args = process.argv.slice(2);
    const opts = {};

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--seed' && args[i + 1]) opts.seed = parseInt(args[++i]);
        else if (args[i] === '--turns' && args[i + 1]) opts.maxTurns = parseInt(args[++i]);
        else if (args[i] === '--verbose' || args[i] === '-v') opts.verbose = true;
        else if (args[i] === '--help' || args[i] === '-h') {
            console.log('Usage: node headless_runner.js [--seed N] [--turns N] [--verbose]');
            process.exit(0);
        }
    }

    opts.verbose = opts.verbose !== false;
    runHeadless(opts).then(result => {
        console.log(`\nFinal: seed=${result.seed} turns=${result.stats.turns} maxDepth=${result.stats.maxDepth}`);
    }).catch(err => {
        console.error('Error:', err);
        process.exit(1);
    });
}
