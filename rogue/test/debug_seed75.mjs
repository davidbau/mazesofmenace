import { runSession } from './node_runner.mjs';

const seed = 75;
const keys = 'kkk'; // 3 k's for first 3 steps

const steps = await runSession(seed, keys);

// Print the screen info for each step
for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    console.log(`Step ${i} (key '${s.key}'):`);
    console.log(`  RNG: [${s.rng.join(', ')}]`);
    for (let r = 0; r < 24; r++) {
        const row = s.screen[r] || '';
        if (row.match(/[J@ABCDEFGHIJKLMNOPQRSTUVWXYZ]/)) {
            console.log(`  screen row ${r}: ${JSON.stringify(row)}`);
        }
    }
}
