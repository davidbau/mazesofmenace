#!/usr/bin/env node
import { HeadlessGame } from './selfplay/runner/headless_runner.js';

const game = new HeadlessGame(11111, 12);
const map = game.map;

console.log('=== Ground Truth Stairs ===');
if (map.upstair) console.log(`Up stairs at: (${map.upstair.x}, ${map.upstair.y})`);
if (map.dnstair) console.log(`Down stairs at: (${map.dnstair.x}, ${map.dnstair.y})`);

// Check the actual map cells
console.log('\n=== Map Cell Check ===');
for (let y = 0; y < 21; y++) {
    for (let x = 0; x < 80; x++) {
        const loc = map.at(x, y);
        if (loc && loc.typ === 26) { // STAIRS
            const dir = loc.flags === 1 ? 'UP' : 'DOWN';
            console.log(`Stairs ${dir} at (${x}, ${y})`);
        }
    }
}

// Check what the display shows
console.log('\n=== Display Grid Check ===');
const display = game.display;
for (let y = 1; y < 22; y++) {
    for (let x = 0; x < 80; x++) {
        const cell = display.grid[y][x];
        if (cell && (cell.ch === '<' || cell.ch === '>')) {
            console.log(`Display shows '${cell.ch}' at screen (${x}, ${y}) = map (${x}, ${y-1})`);
        }
    }
}
