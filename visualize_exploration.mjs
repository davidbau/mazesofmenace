#!/usr/bin/env node
/**
 * Visualize where the agent explores vs where it doesn't
 */

import { HeadlessGame, HeadlessAdapter } from './selfplay/runner/headless_runner.js';
import { Agent } from './selfplay/agent.js';

const SEED = parseInt(process.argv[2]) || 22222;
const MAX_TURNS = 300;
const ROLE_INDEX = 12; // Wizard

async function main() {
    console.log(`=== Visualizing Exploration for Seed ${SEED} ===\n`);

    // Create game and agent
    const game = new HeadlessGame(SEED, ROLE_INDEX);
    const adapter = new HeadlessAdapter(game);
    const agent = new Agent(adapter, { maxTurns: MAX_TURNS });

    // Run agent
    console.log(`Running for ${MAX_TURNS} turns...`);
    await agent.run();
    
    const level = agent.dungeon.currentLevel;
    const map = game.map;
    
    console.log(`\n=== Exploration Map ===\n`);
    
    // Find downstairs
    const STAIRS = 26;
    let stairsPos = null;
    for (let y = 0; y < 21; y++) {
        for (let x = 0; x < 80; x++) {
            const cell = map.at(x, y);
            if (cell && cell.typ === STAIRS && cell.flags === 0) {
                stairsPos = { x, y };
                break;
            }
        }
        if (stairsPos) break;
    }
    
    // Visualize the map
    for (let y = 0; y < 21; y++) {
        let row = '';
        for (let x = 0; x < 80; x++) {
            const agentCell = level.at(x, y);
            const mapCell = map.at(x, y);
    
            // Mark stairs
            if (stairsPos && x === stairsPos.x && y === stairsPos.y) {
                row += '\x1b[93m>\x1b[0m'; // Yellow >
            }
            // Mark explored cells
            else if (agentCell && agentCell.explored) {
                if (agentCell.walkable) {
                    row += '\x1b[92m.\x1b[0m'; // Green dot for explored walkable
                } else {
                    row += '\x1b[90m#\x1b[0m'; // Dark gray # for explored wall
                }
            }
            // Mark unexplored walkable (what agent SHOULD explore)
            else if (mapCell && (mapCell.typ === 1 || mapCell.typ === 2 || mapCell.typ === 25)) { // ROOM, CORR, or walkable
                row += '\x1b[91m?\x1b[0m'; // Red ? for unexplored walkable
            }
            // Walls and unknown
            else {
                row += ' ';
            }
        }
        console.log(row);
    }
    
    console.log(`\nLegend:`);
    console.log(`  \x1b[92m.\x1b[0m = Explored walkable (agent visited)`);
    console.log(`  \x1b[90m#\x1b[0m = Explored wall (agent saw)`);
    console.log(`  \x1b[91m?\x1b[0m = Unexplored walkable (agent SHOULD visit)`);
    console.log(`  \x1b[93m>\x1b[0m = Downstairs (target)`);
    
    // Calculate stats
    let exploredWalkable = 0;
    let unexploredWalkable = 0;
    let totalWalkable = 0;
    
    for (let y = 0; y < 21; y++) {
        for (let x = 0; x < 80; x++) {
            const mapCell = map.at(x, y);
            const isWalkable = mapCell && (mapCell.typ === 1 || mapCell.typ === 2 || mapCell.typ === 25 || mapCell.typ === 26);
    
            if (isWalkable) {
                totalWalkable++;
                const agentCell = level.at(x, y);
                if (agentCell && agentCell.explored) {
                    exploredWalkable++;
                } else {
                    unexploredWalkable++;
                }
            }
        }
    }
    
    console.log(`\nStats:`);
    console.log(`  Total walkable cells: ${totalWalkable}`);
    console.log(`  Explored walkable: ${exploredWalkable} (${(100*exploredWalkable/totalWalkable).toFixed(1)}%)`);
    console.log(`  Unexplored walkable: ${unexploredWalkable} (${(100*unexploredWalkable/totalWalkable).toFixed(1)}%)`);
    
    if (stairsPos) {
        const agentStairsCell = level.at(stairsPos.x, stairsPos.y);
        console.log(`\nDownstairs at (${stairsPos.x}, ${stairsPos.y}): ${agentStairsCell?.explored ? 'EXPLORED' : 'NOT EXPLORED'}`);
    }

}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
