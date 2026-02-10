#!/usr/bin/env node
import { runHeadless } from './selfplay/runner/headless_runner.js';

async function main() {
    const SEEDS = [11111, 22222, 33333];
    
    console.log('=== Quick Test: Agent with Monsters (200 turns) ===\n');
    
    for (const seed of SEEDS) {
        const result = await runHeadless({
            seed,
            roleIndex: 12,
            maxTurns: 200,
            debug: false
        });
        
        console.log(`Seed ${seed}: Dlvl ${result.stats.maxDepth}, HP=${result.agent.status.hp}/${result.agent.status.hpmax}, died=${result.stats.died || false}`);
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
