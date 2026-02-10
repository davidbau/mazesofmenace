#!/usr/bin/env node
import { HeadlessGame, HeadlessAdapter } from './selfplay/runner/headless_runner.js';
import { Agent } from './selfplay/agent.js';

async function testSeed(seed, name) {
    const game = new HeadlessGame(seed, 12);
    const adapter = new HeadlessAdapter(game);
    const agent = new Agent(adapter, { maxTurns: 300, debug: false });

    const samples = [];
    let sampleInterval = 25;
    let nextSample = 100;

    // Run the agent
    await agent.run();

    // Sample every 25 turns starting at turn 100
    // We'll do this by checking after run completes and logging what we saw
    // Actually, we need to hook into the run loop
    
    // Let me restart with proper hooking
}

// Actually, let me just add logging to agent directly for now
async function main() {
    for (const [seed, name] of [[22222, 'seed22222'], [44444, 'seed44444']]) {
        console.log(`\n=== ${name} ===`);
        
        const game = new HeadlessGame(seed, 12);
        const adapter = new HeadlessAdapter(game);
        const agent = new Agent(adapter, { maxTurns: 300, debug: false });

        let lastLog = 0;
        
        // Override the decide method to log stats
        const originalDecide = agent.decide;
        agent.decide = async function() {
            if (this.turnNumber >= 100 && this.turnNumber - lastLog >= 50) {
                const level = this.dungeon.currentLevel;
                if (level) {
                    const frontier = level.getExplorationFrontier();
                    const exploredPercent = level.exploredCount / (80 * 21);
                    console.log(`Turn ${this.turnNumber}: frontier=${frontier.length}, explored=${level.exploredCount} (${(exploredPercent*100).toFixed(1)}%)`);
                    lastLog = this.turnNumber;
                }
            }
            return originalDecide.call(this);
        };

        await agent.run();
        
        const level = agent.dungeon.currentLevel;
        if (level) {
            console.log(`Final: depth=${agent.dungeon.depth}, explored=${level.exploredCount}`);
        }
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
