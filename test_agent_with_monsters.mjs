#!/usr/bin/env node
import { runHeadless } from './selfplay/runner/headless_runner.js';

async function main() {
    console.log('=== Testing Agent Performance with Monsters ===\n');
    
    const result = await runHeadless({
        seed: 22222,
        roleIndex: 12,
        maxTurns: 500,
        verbose: false
    });
    
    const agent = result.agent;
    const stats = result.stats;
    
    console.log('\n=== Results ===');
    console.log(`Max depth: ${stats.maxDepth}`);
    console.log(`Turns: ${stats.turns}`);
    console.log(`Died: ${stats.died || false}`);
    console.log(`Death cause: ${stats.deathCause || 'N/A'}`);
    
    if (agent && agent.status) {
        console.log(`Final HP: ${agent.status.hp}/${agent.status.hpmax}`);
        console.log(`Final XP: ${agent.status.level || 1}`);
    }
    
    console.log(`\nKills: ${stats.kills || 0}`);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
