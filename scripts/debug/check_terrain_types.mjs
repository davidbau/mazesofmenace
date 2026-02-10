#!/usr/bin/env node
/**
 * Check what terrain types exist in the map
 */

import { HeadlessGame } from './selfplay/runner/headless_runner.js';

const SEED = parseInt(process.argv[2]) || 22222;
const ROLE_INDEX = 12; // Wizard

async function main() {
    const game = new HeadlessGame(SEED, ROLE_INDEX);
    const map = game.map;

    const typeCounts = new Map();

    for (let y = 0; y < 21; y++) {
        for (let x = 0; x < 80; x++) {
            const cell = map.at(x, y);
            if (cell) {
                const key = cell.typ;
                typeCounts.set(key, (typeCounts.get(key) || 0) + 1);
            }
        }
    }

    console.log('Terrain types in map:');
    for (const [typ, count] of Array.from(typeCounts.entries()).sort((a, b) => a[0] - b[0])) {
        console.log(`  typ ${typ}: ${count} cells`);
    }

    // Check what typ 23 is (seems to appear a lot)
    console.log('\nSample cells of each type:');
    const samples = new Map();
    for (let y = 0; y < 21; y++) {
        for (let x = 0; x < 80; x++) {
            const cell = map.at(x, y);
            if (cell && !samples.has(cell.typ)) {
                samples.set(cell.typ, { x, y, cell });
            }
        }
    }

    for (const [typ, info] of Array.from(samples.entries()).sort((a, b) => a[0] - b[0])) {
        console.log(`  typ ${typ} at (${info.x}, ${info.y}):`, JSON.stringify(info.cell, null, 2).substring(0, 200));
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
