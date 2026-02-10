#!/usr/bin/env node
/**
 * Check if the stairs are actually reachable in the ground truth map
 */

import { HeadlessGame } from './selfplay/runner/headless_runner.js';

const SEED = parseInt(process.argv[2]) || 22222;
const ROLE_INDEX = 12; // Wizard

async function main() {
    console.log(`=== Checking Map Connectivity for Seed ${SEED} ===\n`);

    // Create game
    const game = new HeadlessGame(SEED, ROLE_INDEX);

    // Find stairs in actual map
    const map = game.map;
    let stairsPos = null;

    for (let y = 0; y < 21; y++) {
        for (let x = 0; x < 80; x++) {
            const cell = map.at(x, y);
            if (cell && cell.typ === 26 && cell.flags === 0) { // STAIRS down
                stairsPos = { x, y };
                break;
            }
        }
        if (stairsPos) break;
    }

    if (!stairsPos) {
        console.log('ERROR: No downstairs found!');
        return;
    }

    console.log(`Downstairs at: (${stairsPos.x}, ${stairsPos.y})`);

    // Find starting position (player position)
    const startPos = { x: game.player.x, y: game.player.y };
    console.log(`Player starts at: (${startPos.x}, ${startPos.y})`);

    // Do a BFS from start to stairs using ONLY walkable cells (no walls, no secret doors)
    const visited = new Set();
    const queue = [startPos];
    visited.add(`${startPos.x},${startPos.y}`);

    let foundPath = false;

    while (queue.length > 0 && !foundPath) {
        const pos = queue.shift();

        if (pos.x === stairsPos.x && pos.y === stairsPos.y) {
            foundPath = true;
            break;
        }

        // Try all 8 directions
        const dirs = [
            [-1, -1], [0, -1], [1, -1],
            [-1,  0],          [1,  0],
            [-1,  1], [0,  1], [1,  1],
        ];

        for (const [dx, dy] of dirs) {
            const nx = pos.x + dx;
            const ny = pos.y + dy;

            if (nx < 0 || nx >= 80 || ny < 0 || ny >= 21) continue;
            const key = `${nx},${ny}`;
            if (visited.has(key)) continue;

            const cell = map.at(nx, ny);
            if (!cell) continue;

            // typ: 14=SDOOR, 23=DOOR, 24=CORR, 25=ROOM, 26=STAIRS
            // Check if walkable (room, corridor, open door, stairs)
            const isWalkable = (
                cell.typ === 24 ||  // CORR
                cell.typ === 25 ||  // ROOM
                cell.typ === 26 ||  // STAIRS
                (cell.typ === 23 && (cell.flags & 1))  // DOOR and open
            );

            if (isWalkable) {
                visited.add(key);
                queue.push({ x: nx, y: ny });
            }
        }
    }

    console.log(`\nReachable from start (ignoring secret doors): ${foundPath ? 'YES' : 'NO'}`);
    console.log(`Total reachable cells: ${visited.size}`);

    // Now check if there are secret doors blocking the path
    if (!foundPath) {
        console.log(`\n=== Checking for Secret Doors ===`);

        let secretDoorCount = 0;
        for (let y = 0; y < 21; y++) {
            for (let x = 0; x < 80; x++) {
                const cell = map.at(x, y);
                if (cell && cell.typ === 14) { // SDOOR
                    secretDoorCount++;
                    console.log(`  Secret door at (${x}, ${y})`);
                }
            }
        }

        console.log(`Total secret doors: ${secretDoorCount}`);

        if (secretDoorCount > 0) {
            console.log(`\n=> DIAGNOSIS: Stairs are BLOCKED by secret doors. Need to search walls.`);
        } else {
            console.log(`\n=> DIAGNOSIS: No secret doors found. Map generation may be unusual.`);
        }
    } else {
        console.log(`\n=> Stairs are directly reachable!`);
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
