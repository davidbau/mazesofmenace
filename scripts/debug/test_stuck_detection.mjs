#!/usr/bin/env node
import { HeadlessGame, HeadlessAdapter } from './selfplay/runner/headless_runner.js';
import { Agent } from './selfplay/agent.js';

async function main() {
    const game = new HeadlessGame(22222, 12);
    const adapter = new HeadlessAdapter(game);
    const agent = new Agent(adapter, { maxTurns: 300, debug: false });

    let stuckExploringCount = 0;
    let blacklistClears = 0;

    // Hook _commitToExploration to detect stuck exploring
    const original_commitToExploration = agent._commitToExploration.bind(agent);
    agent._commitToExploration = function(level, px, py) {
        const frontier = level.getExplorationFrontier();
        const exploredPercent = level.exploredCount / (80 * 21);
        const isStuckExploring = (
            this.turnNumber > 100 &&
            frontier.length > 50 &&
            exploredPercent < 0.20
        );
        
        if (isStuckExploring) {
            stuckExploringCount++;
            if (this.turnNumber % 50 === 0) {
                blacklistClears++;
                console.log(`[TURN ${this.turnNumber}] Stuck exploring: frontier=${frontier.length}, explored=${(exploredPercent*100).toFixed(1)}%, blacklist cleared`);
            }
        }
        
        return original_commitToExploration(level, px, py);
    };

    await agent.run();

    console.log(`\nStuck exploring detected: ${stuckExploringCount} times`);
    console.log(`Blacklist clears: ${blacklistClears}`);
    console.log(`Final depth: ${agent.dungeon.depth}`);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
