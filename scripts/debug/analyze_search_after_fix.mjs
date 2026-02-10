#!/usr/bin/env node
import { HeadlessGame, HeadlessAdapter } from './selfplay/runner/headless_runner.js';
import { Agent } from './selfplay/agent.js';

async function main() {
    const game = new HeadlessGame(22222, 12);
    const adapter = new HeadlessAdapter(game);
    const agent = new Agent(adapter, { maxTurns: 300, debug: false });

    let searches = [];
    
    // Hook into the agent's decide method to track searches
    const originalDecide = agent.decide.bind(agent);
    agent.decide = async function() {
        const decision = await originalDecide();
        if (decision && decision.type === 'search') {
            const px = agent.screen.playerX;
            const py = agent.screen.playerY;
            searches.push({ x: px, y: py, turn: agent.turnNumber });
        }
        return decision;
    };

    await agent.run();

    console.log('Total searches:', searches.length);
    const posCounts = {};
    for (const s of searches) {
        const key = `${s.x},${s.y}`;
        posCounts[key] = (posCounts[key] || 0) + 1;
    }
    const sorted = Object.entries(posCounts).sort((a,b) => b[1] - a[1]);
    console.log('\nSearch position distribution:');
    for (const [pos, count] of sorted.slice(0, 15)) {
        console.log(`  ${pos}: ${count} search(es)`);
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
