import { replaySession } from './test/comparison/session_helpers.js';
import { readFileSync } from 'fs';

const session = JSON.parse(readFileSync('test/comparison/sessions/seed2_knight_100turns.session.json', 'utf8'));
const replay = await replaySession(2, session);

for (let i = 1; i <= 2; i++) {
    console.log(`\n=== Step ${i} (${session.steps[i].action}) ===`);
    console.log(`C RNG calls: ${session.steps[i].rng.length}`);
    console.log(`JS RNG calls: ${replay.steps[i].rngCalls}`);
    console.log(`\nC RNG sequence (first 15):`);
    for (let j = 0; j < Math.min(15, session.steps[i].rng.length); j++) {
        const c = session.steps[i].rng[j].split(' @ ')[0].padEnd(15);
        const js = replay.steps[i].rng[j] || 'MISSING';
        const match = c.trim() === js ? '✓' : '✗';
        console.log(`  [${j}] ${match} C: ${c} JS: ${js}`);
    }
}
