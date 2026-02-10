#!/usr/bin/env node
/**
 * Visualize exploration with secret door locations marked
 */

import { HeadlessGame, HeadlessAdapter } from './selfplay/runner/headless_runner.js';
import { Agent } from './selfplay/agent.js';

const SEED = parseInt(process.argv[2]) || 22222;
const MAX_TURNS = 300;
const ROLE_INDEX = 12; // Wizard

async function main() {
    const game = new HeadlessGame(SEED, ROLE_INDEX);
    const adapter = new HeadlessAdapter(game);
    const agent = new Agent(adapter, { maxTurns: MAX_TURNS });

    await agent.run();

    const level = agent.dungeon.currentLevel;
    const map = game.map;

    // Find downstairs and secret doors
    let stairsPos = null;
    const secretDoors = [];

    for (let y = 0; y < 21; y++) {
        for (let x = 0; x < 80; x++) {
            const cell = map.at(x, y);
            if (cell) {
                if (cell.typ === 26 && cell.flags === 0) {
                    stairsPos = { x, y };
                }
                if (cell.typ === 14) { // SDOOR
                    secretDoors.push({ x, y });
                }
            }
        }
    }

    console.log(`\n=== Exploration Map with Secret Doors ===\n`);

    // Visualize
    for (let y = 0; y < 21; y++) {
        let row = '';
        for (let x = 0; x < 80; x++) {
            const agentCell = level.at(x, y);

            // Check if this is a secret door location
            const isSecretDoor = secretDoors.some(sd => sd.x === x && sd.y === y);

            if (stairsPos && x === stairsPos.x && y === stairsPos.y) {
                row += '\x1b[93m>\x1b[0m'; // Yellow >
            } else if (isSecretDoor) {
                if (agentCell && agentCell.explored) {
                    row += '\x1b[96mS\x1b[0m'; // Cyan S (explored secret door)
                } else {
                    row += '\x1b[91mS\x1b[0m'; // Red S (unexplored secret door)
                }
            } else if (agentCell && agentCell.explored) {
                if (agentCell.walkable) {
                    row += '\x1b[92m.\x1b[0m'; // Green dot
                } else {
                    row += '\x1b[90m#\x1b[0m'; // Dark gray #
                }
            } else {
                const mapCell = map.at(x, y);
                if (mapCell && (mapCell.typ === 24 || mapCell.typ === 25 || mapCell.typ === 26)) {
                    row += '\x1b[91m?\x1b[0m'; // Red ? for unexplored walkable
                } else {
                    row += ' ';
                }
            }
        }
        console.log(row);
    }

    console.log(`\nLegend:`);
    console.log(`  \x1b[92m.\x1b[0m = Explored walkable`);
    console.log(`  \x1b[90m#\x1b[0m = Explored wall`);
    console.log(`  \x1b[91m?\x1b[0m = Unexplored walkable`);
    console.log(`  \x1b[96mS\x1b[0m = Secret door (explored area)`);
    console.log(`  \x1b[91mS\x1b[0m = Secret door (unexplored area)`);
    console.log(`  \x1b[93m>\x1b[0m = Downstairs`);

    console.log(`\nSecret door locations:`);
    for (const sd of secretDoors) {
        const agentCell = level.at(sd.x, sd.y);
        const explored = agentCell && agentCell.explored;
        const searched = agentCell ? (agentCell.searched || 0) : 0;
        console.log(`  (${sd.x}, ${sd.y}): ${explored ? 'EXPLORED' : 'unexplored'}, searched ${searched}x, type=${agentCell?.type || 'unknown'}`);
    }

    console.log(`\nDownstairs at (${stairsPos?.x}, ${stairsPos?.y}): ${level.at(stairsPos.x, stairsPos.y)?.explored ? 'EXPLORED' : 'unexplored'}`);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
