#!/usr/bin/env node
// find_aligned_seed.mjs -- Test multiple seeds to find one with full RNG alignment

import { Agent } from './selfplay/agent.js';
import { TmuxAdapter } from './selfplay/interface/tmux_adapter.js';
import { runHeadless } from './selfplay/runner/headless_runner.js';
import { enableRngLog, getRngLog, disableRngLog } from './js/rng.js';
import fs from 'fs';
import path from 'path';

const TEST_TURNS = 20;
const SEEDS_TO_TEST = [99999, 88888, 77777, 66666, 55555, 44444, 100000, 100001, 100002, 100003, 100004, 100005];

function readCLogLines(filePath) {
    if (!fs.existsSync(filePath)) return [];
    const text = fs.readFileSync(filePath, 'utf-8').trim();
    if (!text) return [];
    return text.split('\n').filter(line => /^\d/.test(line));
}

async function testSeed(seed) {
    console.log(`\nTesting seed ${seed}...`);

    // Run C version
    const logPath = path.join('/tmp', `nethack_rng_${seed}.log`);
    try { fs.unlinkSync(logPath); } catch {}

    const adapter = new TmuxAdapter({ keyDelay: 80 });
    await adapter.start({
        seed,
        role: 'Valkyrie',
        race: 'human',
        name: 'Agent',
        gender: 'female',
        align: 'neutral',
        rngLogPath: logPath,
    });

    let cTurnCounts = [];
    const agent = new Agent(adapter, {
        maxTurns: TEST_TURNS,
        onTurn: (info) => {
            const lines = readCLogLines(logPath);
            cTurnCounts.push(lines.length);
        },
    });

    try {
        await agent.run();
    } catch (err) {
        console.log(`  C run failed: ${err.message}`);
        await adapter.stop();
        return null;
    }
    await adapter.stop();

    const cTotal = readCLogLines(logPath).length;

    // Run JS version
    enableRngLog(true);
    try {
        await runHeadless({
            seed,
            maxTurns: TEST_TURNS,
            colorless: true,
            dumpMaps: false,
        });
    } catch (err) {
        console.log(`  JS run failed: ${err.message}`);
        disableRngLog();
        return null;
    }

    const jsLog = getRngLog() || [];
    const jsTotal = jsLog.length;
    disableRngLog();

    const diff = Math.abs(cTotal - jsTotal);
    const percentMatch = ((Math.min(cTotal, jsTotal) / Math.max(cTotal, jsTotal)) * 100).toFixed(1);

    console.log(`  C: ${cTotal} RNG calls, JS: ${jsTotal} RNG calls`);
    console.log(`  Difference: ${diff} calls (${percentMatch}% match)`);

    return { seed, cTotal, jsTotal, diff, percentMatch: parseFloat(percentMatch) };
}

async function main() {
    console.log(`Testing ${SEEDS_TO_TEST.length} seeds for RNG alignment (${TEST_TURNS} turns)...\n`);

    const results = [];
    for (const seed of SEEDS_TO_TEST) {
        const result = await testSeed(seed);
        if (result) {
            results.push(result);
        }
    }

    // Sort by best match
    results.sort((a, b) => b.percentMatch - a.percentMatch);

    console.log('\n' + '='.repeat(60));
    console.log('RESULTS (sorted by alignment):');
    console.log('='.repeat(60));
    for (const r of results) {
        const status = r.diff === 0 ? '✅ PERFECT' : r.percentMatch >= 99 ? '🟢 EXCELLENT' : r.percentMatch >= 95 ? '🟡 GOOD' : '🔴 POOR';
        console.log(`Seed ${String(r.seed).padStart(5)}: ${String(r.cTotal).padStart(5)} vs ${String(r.jsTotal).padStart(5)} (${r.percentMatch}%) ${status}`);
    }

    const perfect = results.filter(r => r.diff === 0);
    if (perfect.length > 0) {
        console.log(`\n🎯 Found ${perfect.length} seed(s) with PERFECT alignment!`);
        console.log(`   Recommended: ${perfect[0].seed}`);
    } else {
        console.log(`\n💡 Best seed: ${results[0].seed} (${results[0].percentMatch}% match)`);
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
