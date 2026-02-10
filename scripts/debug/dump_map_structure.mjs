#!/usr/bin/env node
/**
 * Dump the raw map structure to see what's going on
 */

import { HeadlessGame } from './selfplay/runner/headless_runner.js';

const SEED = parseInt(process.argv[2]) || 22222;
const ROLE_INDEX = 12; // Wizard

async function main() {
    const game = new HeadlessGame(SEED, ROLE_INDEX);
    const map = game.map;

    console.log('Map structure (types):');
    console.log('  0=STONE, 1=ROOM, 2=CORR, 7=DOOR, 8=SDOOR, 25=ROOM, 26=STAIRS\n');

    // Find key positions
    const player = { x: game.player.x, y: game.player.y };
    let stairs = null;

    for (let y = 0; y < 21; y++) {
        for (let x = 0; x < 80; x++) {
            const cell = map.at(x, y);
            if (cell && cell.typ === 26 && cell.flags === 0) {
                stairs = { x, y };
            }
        }
    }

    // Print map with type numbers
    for (let y = 0; y < 21; y++) {
        let line = '';
        for (let x = 0; x < 80; x++) {
            const cell = map.at(x, y);

            if (x === player.x && y === player.y) {
                line += '@';
            } else if (stairs && x === stairs.x && y === stairs.y) {
                line += '>';
            } else if (!cell) {
                line += ' ';
            } else {
                // typ: 0=STONE, 1=ROOM, 2=CORR, 7=DOOR, 8=SDOOR, 25=ROOM, 26=STAIRS
                if (cell.typ === 0) line += ' ';       // STONE
                else if (cell.typ === 1) line += '.';  // ROOM
                else if (cell.typ === 2) line += '#';  // CORR
                else if (cell.typ === 7) line += '+';  // DOOR
                else if (cell.typ === 8) line += 'S';  // SDOOR
                else if (cell.typ === 25) line += '.'; // ROOM
                else if (cell.typ === 26) line += (cell.flags === 0 ? '>' : '<'); // STAIRS
                else line += '?';
            }
        }
        console.log(line);
    }

    console.log(`\nLegend: @ = player, > = down stairs, . = room, # = corridor, + = door, S = secret door, ' ' = stone`);
    console.log(`Player at (${player.x}, ${player.y}), Stairs at (${stairs?.x}, ${stairs?.y})`);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
