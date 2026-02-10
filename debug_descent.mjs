#!/usr/bin/env node
import { HeadlessGame, HeadlessAdapter } from './selfplay/runner/headless_runner.js';
import { Agent } from './selfplay/agent.js';
import { parseStatus } from './selfplay/perception/status_parser.js';

async function main() {
    const game = new HeadlessGame(22222, 12);
    const adapter = new HeadlessAdapter(game);
    const agent = new Agent(adapter, { maxTurns: 100, debug: false });

    let descendCount = 0;
    let lastDepth = 0;

    // Override _act to log descent actions
    const originalAct = agent._act.bind(agent);
    agent._act = async function(action) {
        if (action.type === 'descend') {
            descendCount++;
            const status = parseStatus(this.screen.statusLine1, this.screen.statusLine2);
            const currentDepth = this.dungeon.currentDepth;
            console.log(`[DESCEND #${descendCount}] Turn ${this.turnNumber}: action='>', status.dlvl=${status.dungeonLevel}, dungeon.currentDepth=${currentDepth}`);

            await originalAct(action);

            // Check status after descent
            const statusAfter = parseStatus(this.screen.statusLine1, this.screen.statusLine2);
            const depthAfter = this.dungeon.currentDepth;
            console.log(`  After: status.dlvl=${statusAfter.dungeonLevel}, dungeon.currentDepth=${depthAfter}`);
            
            if (depthAfter !== currentDepth) {
                console.log(`  ✓ Depth changed: ${currentDepth} → ${depthAfter}`);
            } else {
                console.log(`  ✗ Depth unchanged`);
            }
        } else {
            await originalAct(action);
        }
    };

    await agent.run();

    console.log(`\nTotal descent attempts: ${descendCount}`);
    console.log(`Final depth: ${agent.dungeon.currentDepth}`);
    console.log(`Max depth: ${agent.dungeon.maxDepthReached}`);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
