#!/usr/bin/env node
import { runHeadless } from './selfplay/runner/headless_runner.js';

async function main() {
    const result = await runHeadless({
        seed: 11111,
        roleIndex: 12,
        maxTurns: 100,
        verbose: true
    });
    
    console.log('\n=== Quick Test Results ===');
    console.log(`Max depth: ${result.stats.maxDepth}`);
    console.log(`Turns: ${result.stats.turns}`);
    console.log(`Died: ${result.stats.died || false}`);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
