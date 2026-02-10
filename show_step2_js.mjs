import { replaySession } from './test/comparison/session_helpers.js';
import { readFileSync } from 'fs';

const session = JSON.parse(readFileSync('test/comparison/sessions/seed2_knight_100turns.session.json', 'utf8'));
const replay = await replaySession(2, session);

console.log('Step 2 JS RNG calls:');
for (let i = 0; i < replay.steps[2].rng.length; i++) {
    console.log(`  [${i}] ${replay.steps[2].rng[i]}`);
}
