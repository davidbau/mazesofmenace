// bench/save_format_benchmark.js -- Compare serialization formats for save data.
//
// Candidates:
//   1. JSON.stringify                     (baseline)
//   2. JSON.stringify + gzip              (zlib.gzipSync, sync)
//   3. JSON.stringify + deflateRaw        (smaller header than gzip)
//   4. JSON.stringify + CompressionStream (async, browser-native API)
//
// Usage:  node bench/save_format_benchmark.js

import { HeadlessGame } from '../js/headless_runtime.js';
import { buildSaveData } from '../js/storage.js';
import { getRngState, getRngCallCount } from '../js/rng.js';
import zlib from 'node:zlib';

const RUNS = 30;

function patchForSave(game, seed) {
    game.seed = seed;
    game.seerTurn = 0;
    game._rngAccessors = { getRngState, getRngCallCount };
}

function bench(label, fn, runs = RUNS) {
    for (let i = 0; i < 5; i++) fn();
    const t0 = performance.now();
    for (let i = 0; i < runs; i++) fn();
    const ms = (performance.now() - t0) / runs;
    return ms;
}

async function benchAsync(label, fn, runs = RUNS) {
    for (let i = 0; i < 3; i++) await fn();
    const t0 = performance.now();
    for (let i = 0; i < runs; i++) await fn();
    return (performance.now() - t0) / runs;
}

function kb(bytes) { return (bytes / 1024).toFixed(1).padStart(8) + ' KB'; }
function ms(t)     { return t.toFixed(2).padStart(8) + ' ms'; }

async function compressWithCompressionStream(data, format = 'gzip') {
    const stream = new CompressionStream(format);
    const writer = stream.writable.getWriter();
    const reader = stream.readable.getReader();
    writer.write(data);
    writer.close();
    const chunks = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    let totalLen = 0;
    for (const c of chunks) totalLen += c.length;
    const out = new Uint8Array(totalLen);
    let offset = 0;
    for (const c of chunks) { out.set(c, offset); offset += c.length; }
    return out;
}

async function measure(label, saveData) {
    const json = JSON.stringify(saveData);
    const jsonBytes = Buffer.from(json);

    // 1. Baseline: JSON only
    const t_json = bench('JSON.stringify', () => JSON.stringify(saveData));

    // 2. JSON + gzip (sync)
    let gzipOut;
    const t_gzip = bench('JSON + gzip (sync)', () => {
        gzipOut = zlib.gzipSync(jsonBytes, { level: zlib.constants.Z_DEFAULT_COMPRESSION });
    });

    // 3. JSON + deflateRaw (sync, slightly smaller/faster than gzip — no header)
    let deflateOut;
    const t_deflate = bench('JSON + deflateRaw (sync)', () => {
        deflateOut = zlib.deflateRawSync(jsonBytes, { level: zlib.constants.Z_DEFAULT_COMPRESSION });
    });

    // 4. JSON + gzip level 1 (fastest compression)
    let gzip1Out;
    const t_gzip1 = bench('JSON + gzip level 1 (fast)', () => {
        gzip1Out = zlib.gzipSync(jsonBytes, { level: 1 });
    });

    // 5. CompressionStream gzip (browser-native async API)
    const encoder = new TextEncoder();
    const jsonUint8 = encoder.encode(json);
    let csOut;
    const t_cs = await benchAsync('CompressionStream (gzip)', async () => {
        csOut = await compressWithCompressionStream(jsonUint8, 'gzip');
    });

    // 6. CompressionStream deflate-raw
    let csDeflateOut;
    const t_csDeflate = await benchAsync('CompressionStream (deflate-raw)', async () => {
        csDeflateOut = await compressWithCompressionStream(jsonUint8, 'deflate-raw');
    });

    console.log(`\n${label}  (${kb(jsonBytes.length)} raw JSON)`);
    console.log(`  ${'Method'.padEnd(36)} ${'Time'.padStart(9)}  ${'Size'.padStart(9)}  Ratio`);
    console.log(`  ${'-'.repeat(65)}`);

    const row = (name, t, size) => {
        const ratio = (size / jsonBytes.length * 100).toFixed(1).padStart(5) + '%';
        console.log(`  ${name.padEnd(36)} ${ms(t)}  ${kb(size)}  ${ratio}`);
    };

    row('JSON.stringify only',          t_json,    jsonBytes.length);
    row('JSON + gzip default (sync)',   t_gzip,    gzipOut.length);
    row('JSON + gzip level 1 (sync)',   t_gzip1,   gzip1Out.length);
    row('JSON + deflateRaw (sync)',     t_deflate, deflateOut.length);
    row('CompressionStream gzip',       t_cs,      csOut.length);
    row('CompressionStream deflate-raw',t_csDeflate, csDeflateOut.length);
}

// Run across representative game sizes
for (const totalLevels of [1, 15, 60]) {
    const seed = 12345678 + totalLevels;
    const g = HeadlessGame.start(seed, { wizard: true });
    patchForSave(g, seed);
    for (let d = 2; d <= totalLevels; d++) g.levels[d] = g.map;
    await measure(`${totalLevels} level(s)`, buildSaveData(g));
}
