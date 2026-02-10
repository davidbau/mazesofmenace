#!/usr/bin/env node
import { HeadlessGame, HeadlessAdapter } from './selfplay/runner/headless_runner.js';
import { Agent } from './selfplay/agent.js';

async function main() {
    const game = new HeadlessGame(22222, 12);
    const adapter = new HeadlessAdapter(game);
    const agent = new Agent(adapter, { maxTurns: 300, debug: false });

    const statsAtTurns = [100, 150, 200, 250, 300];
    const stats = [];

    const originalTick = agent._tick.bind(agent);
    agent._tick = async function() {
        await originalTick();
        
        if (statsAtTurns.includes(this.turnNumber)) {
            const level = this.dungeon.currentLevel;
            const frontier = level.getExplorationFrontier();
            const exploredPercent = level.exploredCount / (80 * 21);
            stats.push({
                turn: this.turnNumber,
                frontier: frontier.length,
                explored: level.exploredCount,
                percent: (exploredPercent * 100).toFixed(1)
            });
        }
    };

    await agent.run();

    console.log('\nExploration stats for seed 22222:');
    for (const s of stats) {
        console.log(`Turn ${s.turn}: frontier=${s.frontier}, explored=${s.explored} cells (${s.percent}%)`);
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
