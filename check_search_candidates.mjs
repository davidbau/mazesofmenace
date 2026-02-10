#!/usr/bin/env node
/**
 * Check what search candidates the agent identifies
 */

import { HeadlessGame, HeadlessAdapter } from './selfplay/runner/headless_runner.js';
import { Agent } from './selfplay/agent.js';

const SEED = parseInt(process.argv[2]) || 22222;
const ROLE_INDEX = 12; // Wizard

async function main() {
    const game = new HeadlessGame(SEED, ROLE_INDEX);
    const adapter = new HeadlessAdapter(game);
    const agent = new Agent(adapter, { maxTurns: 200 });

    // Run agent for a bit to explore
    await agent.run();

    const level = agent.dungeon.currentLevel;
    const candidates = level.getSearchCandidates();

    console.log(`Search candidates found: ${candidates.length}`);
    console.log(`\nTop 20 candidates by distance from start:`);

    const start = { x: 7, y: 13 };
    const sorted = candidates.slice(0, 100).sort((a, b) => {
        const distA = Math.abs(a.x - start.x) + Math.abs(a.y - start.y);
        const distB = Math.abs(b.x - start.x) + Math.abs(b.y - start.y);
        return distA - distB;
    });

    for (let i = 0; i < Math.min(20, sorted.length); i++) {
        const c = sorted[i];
        const dist = Math.abs(c.x - start.x) + Math.abs(c.y - start.y);
        const cell = level.at(c.x, c.y);
        console.log(`  (${c.x}, ${c.y}) - dist ${dist}, searched ${cell?.searched || 0}x, type=${cell?.type}`);
    }

    // Check if the critical secret doors are in candidates
    const secretDoors = [
        { x: 43, y: 1, name: 'SD1' },
        { x: 61, y: 8, name: 'SD2 (blocks stairs!)' },
        { x: 3, y: 16, name: 'SD3' }
    ];

    console.log(`\nCritical secret door locations:`);
    for (const sd of secretDoors) {
        const found = candidates.some(c => c.x === sd.x && c.y === sd.y);
        const cell = level.at(sd.x, sd.y);
        console.log(`  ${sd.name} at (${sd.x}, ${sd.y}): ${found ? 'IN CANDIDATES' : 'NOT in candidates'}, explored=${cell?.explored}, type=${cell?.type}`);
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
