// bench/save_benchmark.js -- Benchmark game save serialization speed.
//
// Usage:  node bench/save_benchmark.js

import { HeadlessGame } from '../js/headless_runtime.js';
import { buildSaveData } from '../js/storage.js';
import { getRngState, getRngCallCount } from '../js/rng.js';

const RUNS = 100;

// HeadlessGame is missing the fields saveGameState() needs; patch them in.
function patchForSave(game, seed) {
    game.seed = seed;
    game.seerTurn = 0;
    game._rngAccessors = { getRngState, getRngCallCount };
}

function bench(label, fn, runs = RUNS) {
    for (let i = 0; i < 5; i++) fn();          // warmup
    const t0 = performance.now();
    for (let i = 0; i < runs; i++) fn();
    const ms = (performance.now() - t0) / runs;
    console.log(`  ${label.padEnd(32)} ${ms.toFixed(3).padStart(8)} ms`);
    return ms;
}

function measureSave(label, game) {
    console.log(`\n${label}`);

    let data;
    bench('buildSaveData()',         () => { data = buildSaveData(game); });
    bench('JSON.stringify(data)',     () => { JSON.stringify(data); });
    bench('build + stringify (full)', () => { JSON.stringify(buildSaveData(game)); });

    // Simulated localStorage write: in-memory map, same copy cost as real LS in Node.js
    const store = new Map();
    const json = JSON.stringify(data);
    bench('Map.set() mock LS write',  () => { store.set('save', json); });

    const kb = (json.length / 1024).toFixed(1);
    console.log(`  ${'JSON payload size:'.padEnd(32)} ${kb.padStart(8)} KB`);
}

// --- State 1: fresh game, depth 1 ---
const g1 = HeadlessGame.start(12345678, { wizard: true });
patchForSave(g1, 12345678);
measureSave('State 1: fresh start (depth 1, 1 level cached)', g1);

// --- State 2: different seed (different map layout) ---
const g2 = HeadlessGame.start(99999999, { wizard: true });
patchForSave(g2, 99999999);
measureSave('State 2: different seed, same depth', g2);

// --- States 3-6: increasing cached level counts ---
for (const totalLevels of [5, 15, 30, 50, 60]) {
    const seed = 11111111 + totalLevels;
    const g = HeadlessGame.start(seed, { wizard: true });
    patchForSave(g, seed);
    for (let d = 2; d <= totalLevels; d++) g.levels[d] = g.map;
    measureSave(`State: ${totalLevels} cached levels`, g);
}
