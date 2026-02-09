// selfplay/test/perception.test.js -- Tests for screen parser, status parser, and map tracker

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseScreen, parseTmuxCapture, findMonsters, findStairs, MapCell } from '../perception/screen_parser.js';
import { parseStatus, PlayerStatus } from '../perception/status_parser.js';
import { DungeonTracker, LevelMap } from '../perception/map_tracker.js';

// Helper: build a 24x80 grid from row strings
function makeGrid(rows) {
    const grid = [];
    for (let r = 0; r < 24; r++) {
        grid[r] = [];
        const line = (rows[r] || '').padEnd(80, ' ');
        for (let c = 0; c < 80; c++) {
            grid[r][c] = { ch: line[c], color: 7 }; // default gray
        }
    }
    return grid;
}

// Helper: set a cell with specific color
function setCell(grid, row, col, ch, color) {
    grid[row][col] = { ch, color };
}

// ============================================================
// Screen Parser Tests
// ============================================================

describe('Screen Parser', () => {
    it('parses message line', () => {
        const grid = makeGrid([
            'Welcome to NetHack!  You are a valkyrie.',
        ]);
        const screen = parseScreen(grid);
        assert.equal(screen.message, 'Welcome to NetHack!  You are a valkyrie.');
        assert.equal(screen.hasMore, false);
    });

    it('detects --More-- prompt', () => {
        const grid = makeGrid([
            'You see here a long sword. --More--',
        ]);
        const screen = parseScreen(grid);
        assert.equal(screen.hasMore, true);
    });

    it('detects player position', () => {
        const grid = makeGrid([
            '',     // message
            '   @', // map row 0: player at (3, 0)
        ]);
        const screen = parseScreen(grid);
        assert.equal(screen.playerX, 3);
        assert.equal(screen.playerY, 0);
    });

    it('classifies wall characters', () => {
        const grid = makeGrid([
            '', // message
            '\u2502\u2500\u250c\u2510\u2514\u2518', // wall chars on map row 0
        ]);
        const screen = parseScreen(grid);
        assert.equal(screen.map[0][0].type, 'wall');
        assert.equal(screen.map[0][1].type, 'wall');
        assert.equal(screen.map[0][2].type, 'wall');
        assert.equal(screen.map[0][3].type, 'wall');
    });

    it('classifies floor (middle dot)', () => {
        const grid = makeGrid([
            '', // message
            '\u00b7', // middle dot on map row 0
        ]);
        const screen = parseScreen(grid);
        assert.equal(screen.map[0][0].type, 'floor');
    });

    it('classifies open door (brown middle dot)', () => {
        const grid = makeGrid(['']);
        setCell(grid, 1, 0, '\u00b7', 3); // CLR_BROWN
        const screen = parseScreen(grid);
        assert.equal(screen.map[0][0].type, 'door_open');
    });

    it('classifies closed door (brown +)', () => {
        const grid = makeGrid(['']);
        setCell(grid, 1, 0, '+', 3); // CLR_BROWN
        const screen = parseScreen(grid);
        assert.equal(screen.map[0][0].type, 'door_closed');
    });

    it('classifies stairs', () => {
        const grid = makeGrid([
            '', // message
            '<>', // stairs on map row 0
        ]);
        const screen = parseScreen(grid);
        assert.equal(screen.map[0][0].type, 'stairs_up');
        assert.equal(screen.map[0][1].type, 'stairs_down');
    });

    it('classifies monsters (letters)', () => {
        const grid = makeGrid([
            '', // message
            'dDf', // monster letters on map row 0
        ]);
        const screen = parseScreen(grid);
        assert.equal(screen.map[0][0].type, 'monster');
        assert.equal(screen.map[0][1].type, 'monster');
        assert.equal(screen.map[0][2].type, 'monster');
    });

    it('classifies items', () => {
        const grid = makeGrid([
            '', // message
            ')![%', // weapon, potion, armor, food
        ]);
        const screen = parseScreen(grid);
        assert.equal(screen.map[0][0].type, 'item');
        assert.equal(screen.map[0][1].type, 'item');
        assert.equal(screen.map[0][2].type, 'item');
        assert.equal(screen.map[0][3].type, 'item');
    });

    it('classifies features', () => {
        const grid = makeGrid([
            '', // message
            '{^_', // fountain, trap, altar
        ]);
        const screen = parseScreen(grid);
        assert.equal(screen.map[0][0].type, 'fountain');
        assert.equal(screen.map[0][1].type, 'trap');
        assert.equal(screen.map[0][2].type, 'altar');
    });

    it('extracts status lines', () => {
        const rows = new Array(24).fill('');
        rows[22] = 'Wizard  St:18  Dx:14  Co:12  In:18  Wi:16  Ch:10  Neutral';
        rows[23] = 'Dlvl:1  $:0  HP:12(12)  Pw:8(8)  AC:9  Xp:1/0  T:1';
        const grid = makeGrid(rows);
        const screen = parseScreen(grid);
        assert.ok(screen.statusLine1.includes('St:18'));
        assert.ok(screen.statusLine2.includes('HP:12(12)'));
    });

    it('finds monsters on screen', () => {
        const grid = makeGrid(['', '   d  D']);
        const screen = parseScreen(grid);
        const monsters = findMonsters(screen);
        assert.equal(monsters.length, 2);
        assert.equal(monsters[0].ch, 'd');
        assert.equal(monsters[0].x, 3);
        assert.equal(monsters[1].ch, 'D');
    });

    it('finds stairs on screen', () => {
        const grid = makeGrid(['', '  <  >']);
        const screen = parseScreen(grid);
        const stairs = findStairs(screen);
        assert.equal(stairs.up.length, 1);
        assert.equal(stairs.down.length, 1);
        assert.equal(stairs.up[0].x, 2);
        assert.equal(stairs.down[0].x, 5);
    });
});

// ============================================================
// Status Parser Tests
// ============================================================

describe('Status Parser', () => {
    it('parses standard status lines', () => {
        const status = parseStatus(
            'Wizard  St:18  Dx:14  Co:12  In:18  Wi:16  Ch:10  Neutral',
            'Dlvl:1  $:0  HP:12(12)  Pw:8(8)  AC:9  Xp:1/0  T:1'
        );

        assert.equal(status.valid, true);
        assert.equal(status.name, 'Wizard');
        assert.equal(status.str, 18);
        assert.equal(status.dex, 14);
        assert.equal(status.con, 12);
        assert.equal(status.int, 18);
        assert.equal(status.wis, 16);
        assert.equal(status.cha, 10);
        assert.equal(status.alignment, 'Neutral');
        assert.equal(status.dungeonLevel, 1);
        assert.equal(status.gold, 0);
        assert.equal(status.hp, 12);
        assert.equal(status.hpmax, 12);
        assert.equal(status.pw, 8);
        assert.equal(status.pwmax, 8);
        assert.equal(status.ac, 9);
        assert.equal(status.xpLevel, 1);
        assert.equal(status.xpPoints, 0);
        assert.equal(status.turns, 1);
    });

    it('parses strength 18/xx format', () => {
        const status = parseStatus(
            'Fighter  St:18/50  Dx:14  Co:18  In:10  Wi:11  Ch:8  Lawful',
            'Dlvl:3  $:100  HP:30(35)  Pw:0(0)  AC:3  Xp:5/1200  T:500'
        );

        assert.equal(status.str, 18);
        assert.equal(status.strExtra, 50);
    });

    it('parses name with title', () => {
        const status = parseStatus(
            'Wizard the Evoker  St:11  Dx:14  Co:12  In:18  Wi:16  Ch:10  Neutral',
            'Dlvl:5  $:42  HP:20(25)  Pw:15(20)  AC:7  Xp:3/100  T:200'
        );

        assert.equal(status.name, 'Wizard');
        assert.equal(status.title, 'Evoker');
    });

    it('parses conditions', () => {
        const status = parseStatus(
            'Wizard  St:11  Dx:14  Co:12  In:18  Wi:16  Ch:10  Neutral',
            'Dlvl:3  $:0  HP:5(25)  Pw:0(20)  AC:9  Xp:3/100  T:300  Hungry  Blind  Conf'
        );

        assert.equal(status.hungry, true);
        assert.equal(status.blind, true);
        assert.equal(status.confused, true);
        assert.equal(status.stunned, false);
        assert.equal(status.hungerLevel, 1);
    });

    it('computes HP fraction', () => {
        const status = parseStatus(
            'Wizard  St:11  Dx:14  Co:12  In:18  Wi:16  Ch:10  Neutral',
            'Dlvl:1  $:0  HP:5(25)  Pw:0(0)  AC:9  Xp:1/0  T:1'
        );

        assert.equal(status.hpFraction, 0.2);
        assert.equal(status.hpCritical, false); // 20% is exactly at boundary
        assert.equal(status.hpLow, true);
    });

    it('detects critical HP', () => {
        const status = parseStatus(
            'Wizard  St:11  Dx:14  Co:12  In:18  Wi:16  Ch:10  Neutral',
            'Dlvl:1  $:0  HP:2(25)  Pw:0(0)  AC:9  Xp:1/0  T:1'
        );

        assert.equal(status.hpCritical, true);
        assert.equal(status.hpLow, true);
    });

    it('detects need for food', () => {
        const status = parseStatus(
            'Wizard  St:11  Dx:14  Co:12  In:18  Wi:16  Ch:10  Neutral',
            'Dlvl:1  $:0  HP:12(12)  Pw:0(0)  AC:9  Xp:1/0  T:1  Weak'
        );

        assert.equal(status.weak, true);
        assert.equal(status.needsFood, true);
        assert.equal(status.hungerLevel, 2);
    });

    it('handles negative AC', () => {
        const status = parseStatus(
            'Knight  St:18/50  Dx:14  Co:18  In:10  Wi:11  Ch:17  Lawful',
            'Dlvl:10  $:500  HP:80(80)  Pw:20(20)  AC:-3  Xp:10/10000  T:5000'
        );

        assert.equal(status.ac, -3);
    });

    it('handles score', () => {
        const status = parseStatus(
            'Wizard  St:11  Dx:14  Co:12  In:18  Wi:16  Ch:10  Neutral  S:1234',
            'Dlvl:1  $:0  HP:12(12)  Pw:0(0)  AC:9  Xp:1/0  T:1'
        );

        assert.equal(status.score, 1234);
    });
});

// ============================================================
// Map Tracker Tests
// ============================================================

describe('Map Tracker', () => {
    it('tracks explored cells', () => {
        const tracker = new DungeonTracker();
        const grid = makeGrid([
            '', // message
            '  ###  ', // corridor on map row 0
        ]);
        const screen = parseScreen(grid);
        const status = parseStatus('', 'Dlvl:1  $:0  HP:12(12)  Pw:0(0)  AC:9  Xp:1/0  T:1');
        tracker.update(screen, status);

        const level = tracker.currentLevel;
        assert.equal(level.at(2, 0).explored, true);
        assert.equal(level.at(3, 0).explored, true);
        assert.equal(level.at(4, 0).explored, true);
        assert.equal(level.at(0, 0).explored, false); // space = unexplored
    });

    it('tracks level changes', () => {
        const tracker = new DungeonTracker();

        // First on level 1
        const grid1 = makeGrid(['']);
        const status1 = parseStatus('', 'Dlvl:1  $:0  HP:12(12)  Pw:0(0)  AC:9  Xp:1/0  T:1');
        const screen1 = parseScreen(grid1);
        tracker.update(screen1, status1);
        assert.equal(tracker.currentDepth, 1);

        // Move to level 2
        const status2 = parseStatus('', 'Dlvl:2  $:0  HP:12(12)  Pw:0(0)  AC:9  Xp:1/0  T:5');
        tracker.update(screen1, status2);
        assert.equal(tracker.currentDepth, 2);
        assert.equal(tracker.maxDepthReached, 2);
    });

    it('discovers features', () => {
        const tracker = new DungeonTracker();
        const grid = makeGrid([
            '', // message
            '  <  >  {  _  ^', // features on map row 0
        ]);
        const screen = parseScreen(grid);
        const status = parseStatus('', 'Dlvl:1  $:0  HP:12(12)  Pw:0(0)  AC:9  Xp:1/0  T:1');
        tracker.update(screen, status);

        const level = tracker.currentLevel;
        assert.equal(level.stairsUp.length, 1);
        assert.equal(level.stairsDown.length, 1);
        assert.equal(level.fountains.length, 1);
        assert.equal(level.altars.length, 1);
        assert.equal(level.traps.length, 1);
    });

    it('clears monster positions between turns', () => {
        const tracker = new DungeonTracker();

        // Turn 1: monster at (3,0)
        const grid1 = makeGrid(['', '   d']);
        const screen1 = parseScreen(grid1);
        const status = parseStatus('', 'Dlvl:1  $:0  HP:12(12)  Pw:0(0)  AC:9  Xp:1/0  T:1');
        tracker.update(screen1, status);

        const level = tracker.currentLevel;
        assert.ok(level.at(3, 0).monster);

        // Turn 2: monster moved to (4,0)
        const grid2 = makeGrid(['', '    d']);
        const screen2 = parseScreen(grid2);
        const status2 = parseStatus('', 'Dlvl:1  $:0  HP:12(12)  Pw:0(0)  AC:9  Xp:1/0  T:2');
        tracker.update(screen2, status2);

        // Old position should have no monster
        assert.equal(level.at(3, 0).monster, null);
        // New position should have monster
        assert.ok(level.at(4, 0).monster);
    });
});

// ============================================================
// tmux capture parsing
// ============================================================

describe('tmux capture parsing', () => {
    it('parses a basic tmux capture', () => {
        const lines = new Array(24).fill('');
        lines[0] = 'Hello message';
        lines[1] = '   @   ';
        lines[22] = 'Wizard  St:18  Dx:14  Co:12  In:18  Wi:16  Ch:10  Neutral';
        lines[23] = 'Dlvl:1  $:0  HP:12(12)  Pw:8(8)  AC:9  Xp:1/0  T:1';
        const text = lines.join('\n');

        const screen = parseTmuxCapture(text);
        assert.equal(screen.message, 'Hello message');
        assert.equal(screen.playerX, 3);
        assert.equal(screen.playerY, 0);
        assert.ok(screen.statusLine1.includes('St:18'));
    });
});
