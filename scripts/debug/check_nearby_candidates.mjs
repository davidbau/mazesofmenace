#!/usr/bin/env node
import { HeadlessGame, HeadlessAdapter } from './selfplay/runner/headless_runner.js';
import { Agent } from './selfplay/agent.js';

async function main() {
    const game = new HeadlessGame(22222, 12);
    const adapter = new HeadlessAdapter(game);
    const agent = new Agent(adapter, { maxTurns: 200 });
    await agent.run();

    const level = agent.dungeon.currentLevel;
    const candidates = level.getSearchCandidates();

    // Check candidates near secret doors
    const secretDoors = [{ x: 43, y: 1 }, { x: 3, y: 16 }];

    for (const sd of secretDoors) {
        console.log(`\nSecret door at (${sd.x}, ${sd.y}):`);
        console.log(`  Adjacent walkable cells:`);

        const dirs = [
            [-1, -1], [0, -1], [1, -1],
            [-1,  0],          [1,  0],
            [-1,  1], [0,  1], [1,  1],
        ];

        for (const [dx, dy] of dirs) {
            const nx = sd.x + dx, ny = sd.y + dy;
            const cell = level.at(nx, ny);
            if (cell && cell.walkable && cell.explored) {
                const isCandidate = candidates.some(c => c.x === nx && c.y === ny);
                console.log(`    (${nx}, ${ny}): walkable=${cell.walkable}, explored=${cell.explored}, isCandidate=${isCandidate}, searched=${cell.searched || 0}x`);
            }
        }
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
