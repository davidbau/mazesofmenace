#!/usr/bin/env node
import { HeadlessGame, HeadlessAdapter } from './selfplay/runner/headless_runner.js';
import { Agent } from './selfplay/agent.js';
import { findPath } from './selfplay/brain/pathing.js';

async function main() {
    const game = new HeadlessGame(22222, 12);
    const adapter = new HeadlessAdapter(game);
    const agent = new Agent(adapter, { maxTurns: 200 });
    await agent.run();

    const level = agent.dungeon.currentLevel;
    const pos = { x: agent.screen.playerX, y: agent.screen.playerY };

    console.log(`Agent at (${pos.x}, ${pos.y}) after 200 turns`);

    // Check paths to critical search candidates
    const candidates = [
        { x: 42, y: 2, desc: 'near SD at (43,1)' },
        { x: 43, y: 2, desc: 'near SD at (43,1)' },
        { x: 44, y: 2, desc: 'near SD at (43,1)' },
        { x: 3, y: 15, desc: 'near SD at (3,16)' },
        { x: 4, y: 15, desc: 'near SD at (3,16)' },
    ];

    for (const cand of candidates) {
        const path = findPath(level, pos.x, pos.y, cand.x, cand.y);
        const cell = level.at(cand.x, cand.y);
        console.log(`\nPath to (${cand.x}, ${cand.y}) ${cand.desc}:`);
        console.log(`  Found: ${path.found}, Cost: ${path.cost}`);
        console.log(`  Cell: type=${cell?.type}, explored=${cell?.explored}, walkable=${cell?.walkable}`);
    }

    // Now check ALL search candidates to understand prioritization
    const allCandidates = level.getSearchCandidates();
    console.log(`\n=== All Search Candidates (top 10 by priority) ===`);
    for (let i = 0; i < Math.min(10, allCandidates.length); i++) {
        const c = allCandidates[i];
        const path = findPath(level, pos.x, pos.y, c.x, c.y);
        console.log(`  ${i+1}. (${c.x}, ${c.y}): priority=${c.priority}, searched=${c.searched}, path=${path.found ? path.cost : 'NONE'}`);
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
