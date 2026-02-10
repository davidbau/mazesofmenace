#!/usr/bin/env node
import { runHeadless } from './selfplay/runner/headless_runner.js';

const SEEDS = [11111, 22222, 33333, 44444, 55555, 66666, 77777, 88888];
const MAX_TURNS = 500;

async function main() {
    console.log(`Testing ${SEEDS.length} seeds with ${MAX_TURNS} max turns...\n`);

    const results = [];
    for (const seed of SEEDS) {
        const result = await runHeadless({
            seed,
            roleIndex: 12,
            maxTurns: MAX_TURNS,
            debug: false
        });
        
        results.push({
            seed,
            maxDepth: result.stats.maxDepth,
            turns: result.stats.turns,
            died: result.stats.died || false,
            survived: !(result.stats.died || false)
        });
    }

    const successful = results.filter(r => r.maxDepth >= 2).length;
    console.log(`\n=== Summary ===`);
    console.log(`Seeds reaching Dlvl 2+: ${successful}/${SEEDS.length}\n`);
    console.log('Detailed results:');
    for (const r of results) {
        const status = r.died ? 'died' : 'survived';
        console.log(`  ${r.seed}: Dlvl ${r.maxDepth}, ${r.turns} turns, ${status}`);
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
