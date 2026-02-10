#!/usr/bin/env node
/**
 * Analyze reachable search candidates to understand priority distribution
 */

import { HeadlessGame, HeadlessAdapter } from './selfplay/runner/headless_runner.js';
import { Agent } from './selfplay/agent.js';
import { findPath } from './selfplay/brain/pathing.js';

const SEED = 22222;
const ROLE_INDEX = 12;

async function main() {
    const game = new HeadlessGame(SEED, ROLE_INDEX);
    const adapter = new HeadlessAdapter(game);
    const agent = new Agent(adapter, { maxTurns: 200 });
    await agent.run();

    const level = agent.dungeon.currentLevel;
    const pos = { x: agent.screen.playerX, y: agent.screen.playerY };

    console.log(`Agent at (${pos.x}, ${pos.y}) after 200 turns\n`);

    const allCandidates = level.getSearchCandidates();
    console.log(`Total search candidates: ${allCandidates.length}`);

    // Filter to reachable
    const reachableCandidates = allCandidates.filter(c => {
        const path = findPath(level, pos.x, pos.y, c.x, c.y);
        return path.found;
    });

    console.log(`Reachable candidates: ${reachableCandidates.length}\n`);

    // Show priority distribution
    const priorityCounts = {};
    for (const c of reachableCandidates) {
        priorityCounts[c.priority] = (priorityCounts[c.priority] || 0) + 1;
    }

    console.log(`Priority distribution of reachable candidates:`);
    for (const [priority, count] of Object.entries(priorityCounts).sort((a, b) => b[0] - a[0])) {
        console.log(`  Priority ${priority}: ${count} candidates`);
    }

    // Show top 20 reachable by priority
    console.log(`\nTop 20 reachable candidates by priority:`);
    for (let i = 0; i < Math.min(20, reachableCandidates.length); i++) {
        const c = reachableCandidates[i];
        const path = findPath(level, pos.x, pos.y, c.x, c.y);
        console.log(`  ${i+1}. (${c.x}, ${c.y}): priority=${c.priority}, searched=${c.searched}, dist=${path.cost}`);
    }

    // Find critical candidates
    console.log(`\nCritical candidates near secret doors:`);
    const critical = [
        { x: 3, y: 15, desc: 'near SD at (3,16)' },
        { x: 4, y: 15, desc: 'near SD at (4,16)' },
    ];

    for (const crit of critical) {
        const idx = reachableCandidates.findIndex(c => c.x === crit.x && c.y === crit.y);
        if (idx >= 0) {
            const c = reachableCandidates[idx];
            console.log(`  (${c.x}, ${c.y}) ${crit.desc}: rank ${idx+1}/${reachableCandidates.length}, priority=${c.priority}`);
        } else {
            console.log(`  ${crit.desc}: NOT in reachable candidates`);
        }
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
