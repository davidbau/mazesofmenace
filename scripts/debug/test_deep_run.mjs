#!/usr/bin/env node
import { runHeadless } from './selfplay/runner/headless_runner.js';

async function main() {
    console.log('Testing deep dungeon run with seed 22222...\n');
    
    const result = await runHeadless({
        seed: 22222,
        roleIndex: 12,
        maxTurns: 2000,
        verbose: true
    });
    
    console.log('\n=== Final Stats ===');
    console.log(`Max depth reached: ${result.stats.maxDepth}`);
    console.log(`Turns taken: ${result.stats.turns}`);
    console.log(`Died: ${result.stats.died || false}`);
    console.log(`Death cause: ${result.stats.deathCause || 'N/A (survived)'}`);
    
    // Check final HP
    const agent = result.agent;
    if (agent && agent.status) {
        console.log(`Final HP: ${agent.status.hp}/${agent.status.hpmax}`);
        console.log(`Final XP level: ${agent.status.level || 'N/A'}`);
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
