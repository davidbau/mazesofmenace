// test/comparison/backfill_runner.js
// Backwards-compatible test runner for all session types
//
// Uses dynamic imports to gracefully handle missing exports in old commits.
// Tests what it can, reports what it can't.
//
// Session types supported:
//   - map: typGrid comparison for level generation
//   - chargen: character creation flow (if session_helpers available)
//   - gameplay: step-by-step command replay (if session_helpers available)
//   - special: special level generation
//   - rng: RNG fingerprint comparison
//
// Usage: node test/comparison/backfill_runner.js [--verbose]

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const VERBOSE = process.argv.includes('--verbose');

// Pure comparison utilities (no external deps)
function compareGrids(grid1, grid2) {
    const diffs = [];
    if (!grid1 || !grid2) return [{ error: 'missing grid' }];
    const rows = Math.min(grid1.length, grid2.length);
    for (let y = 0; y < rows; y++) {
        const cols = Math.min(grid1[y]?.length || 0, grid2[y]?.length || 0);
        for (let x = 0; x < cols; x++) {
            if (grid1[y][x] !== grid2[y][x]) {
                diffs.push({ x, y, js: grid1[y][x], c: grid2[y][x] });
            }
        }
    }
    return diffs;
}

function compareRngArrays(jsRng, cRng) {
    if (!jsRng || !cRng) return { match: false, error: 'missing' };
    const len = Math.min(jsRng.length, cRng.length);
    let matches = 0;
    for (let i = 0; i < len; i++) {
        if (jsRng[i] === cRng[i]) matches++;
    }
    return {
        match: matches === len && jsRng.length === cRng.length,
        matches,
        total: len,
        jsLen: jsRng.length,
        cLen: cRng.length
    };
}

// Try to dynamically import modules
async function tryImport(path) {
    try {
        return await import(path);
    } catch (e) {
        return { _error: e.message };
    }
}

// Load session files from a directory
function loadSessions(dir, filter = () => true) {
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
        .filter(f => f.endsWith('.session.json'))
        .map(f => {
            try {
                const data = JSON.parse(readFileSync(join(dir, f), 'utf8'));
                return { file: f, dir, ...data };
            } catch {
                return null;
            }
        })
        .filter(s => s && filter(s));
}

// Main test runner
async function runBackfillTests() {
    const results = {
        imports: { rng: false, config: false, dungeon: false, helpers: false },
        capabilities: { levelGen: false, rngLog: false, chargen: false, gameplay: false },
        tests: {
            map: { total: 0, passed: 0 },
            rng: { total: 0, passed: 0, partialMatches: 0 },
            chargen: { total: 0, passed: 0 },
            gameplay: { total: 0, passed: 0 },
            special: { total: 0, passed: 0 },
        },
        errors: [],
    };

    console.log('=== Backfill Test Runner ===\n');

    // Phase 1: Test core module imports
    console.log('Phase 1: Testing imports...');

    const rng = await tryImport('../../js/rng.js');
    results.imports.rng = !rng._error;

    const config = await tryImport('../../js/config.js');
    results.imports.config = !config._error;

    const dungeon = await tryImport('../../js/dungeon.js');
    results.imports.dungeon = !dungeon._error;

    // Try to import session_helpers for advanced tests
    const helpers = await tryImport('./session_helpers.js');
    results.imports.helpers = !helpers._error;

    console.log(`  rng.js:     ${results.imports.rng ? 'OK' : 'FAIL'}`);
    console.log(`  config.js:  ${results.imports.config ? 'OK' : 'FAIL'}`);
    console.log(`  dungeon.js: ${results.imports.dungeon ? 'OK' : 'FAIL'}`);
    console.log(`  helpers:    ${results.imports.helpers ? 'OK' : 'SKIP'}`);

    if (!results.imports.helpers && VERBOSE) {
        console.log(`    (${helpers._error?.slice(0, 80)})`);
    }

    // Phase 2: Test capabilities
    console.log('\nPhase 2: Testing capabilities...');

    // Can we do RNG logging?
    if (results.imports.rng && rng.enableRngLog && rng.getRngLog && rng.disableRngLog) {
        results.capabilities.rngLog = true;
    }
    console.log(`  RNG logging:      ${results.capabilities.rngLog ? 'OK' : 'SKIP'}`);

    // Can we generate levels?
    if (results.imports.rng && results.imports.dungeon && results.imports.config) {
        try {
            const { initRng } = rng;
            const { initLevelGeneration, makelevel, setGameSeed } = dungeon;

            if (initRng && makelevel && setGameSeed && initLevelGeneration) {
                initRng(42);
                setGameSeed(42);
                initLevelGeneration(11);
                const map = makelevel(1);
                results.capabilities.levelGen = !!(map && map.at);
            }
        } catch (e) {
            if (VERBOSE) results.errors.push(`levelGen: ${e.message}`);
        }
    }
    console.log(`  Level generation: ${results.capabilities.levelGen ? 'OK' : 'FAIL'}`);

    // Can we do chargen/gameplay? (requires helpers)
    if (results.imports.helpers) {
        results.capabilities.chargen = typeof helpers.generateStartupWithRng === 'function';
        results.capabilities.gameplay = typeof helpers.replaySession === 'function';
    }
    console.log(`  Chargen replay:   ${results.capabilities.chargen ? 'OK' : 'SKIP'}`);
    console.log(`  Gameplay replay:  ${results.capabilities.gameplay ? 'OK' : 'SKIP'}`);

    // Phase 3: Load sessions
    console.log('\nPhase 3: Loading sessions...');

    const mapsDir = join(__dirname, 'maps');
    const sessionsDir = join(__dirname, 'sessions');

    const mapSessions = loadSessions(mapsDir, s => s.type === 'map');
    const specialSessions = loadSessions(mapsDir, s => s.file.includes('_special_'));
    const chargenSessions = loadSessions(sessionsDir, s => s.file.includes('_chargen'));
    const gameplaySessions = loadSessions(sessionsDir, s => s.file.includes('_gameplay'));

    console.log(`  Map sessions:      ${mapSessions.length}`);
    console.log(`  Special sessions:  ${specialSessions.length}`);
    console.log(`  Chargen sessions:  ${chargenSessions.length}`);
    console.log(`  Gameplay sessions: ${gameplaySessions.length}`);

    // Phase 4: Run tests
    console.log('\nPhase 4: Running tests...');

    // Get helpers if available
    let initrack;
    try {
        const monmove = await tryImport('../../js/monmove.js');
        initrack = monmove.initrack;
    } catch {}

    // 4a: Map tests (typGrid comparison)
    if (results.capabilities.levelGen) {
        const { initRng, enableRngLog, getRngLog, disableRngLog } = rng;
        const { initLevelGeneration, makelevel, setGameSeed } = dungeon;
        const { ROWNO = 21, COLNO = 80 } = config;

        for (const session of mapSessions) {
            if (!session.levels || !session.seed) continue;

            for (const level of session.levels) {
                if (!level.typGrid) continue;
                results.tests.map.total++;

                try {
                    initrack?.();
                    initRng(session.seed);
                    setGameSeed(session.seed);
                    initLevelGeneration(11);

                    // Generate all levels up to this depth
                    let map;
                    for (let d = 1; d <= level.depth; d++) {
                        map = makelevel(d);
                    }

                    if (!map) continue;

                    // Extract grid
                    const jsGrid = [];
                    for (let y = 0; y < ROWNO; y++) {
                        const row = [];
                        for (let x = 0; x < COLNO; x++) {
                            const loc = map.at(x, y);
                            row.push(loc ? loc.typ : 0);
                        }
                        jsGrid.push(row);
                    }

                    const diffs = compareGrids(jsGrid, level.typGrid);
                    if (diffs.length === 0) {
                        results.tests.map.passed++;
                    }
                } catch (e) {
                    if (VERBOSE) results.errors.push(`map ${session.file}:d${level.depth}: ${e.message}`);
                }
            }
        }
        console.log(`  Map:      ${results.tests.map.passed}/${results.tests.map.total}`);
    }

    // 4b: RNG fingerprint tests
    if (results.capabilities.levelGen && results.capabilities.rngLog) {
        const { initRng, enableRngLog, getRngLog, disableRngLog } = rng;
        const { initLevelGeneration, makelevel, setGameSeed } = dungeon;

        const allSessions = [...mapSessions, ...specialSessions];
        for (const session of allSessions.slice(0, 30)) {
            const levels = session.levels || [];
            // Also check for special level keys
            const specialKeys = Object.keys(session).filter(k =>
                typeof session[k] === 'object' && session[k]?.rngFingerprint
            );

            for (const level of levels) {
                if (!level.rngFingerprint || level.rngFingerprint.length === 0) continue;
                results.tests.rng.total++;

                try {
                    initrack?.();
                    initRng(session.seed);
                    setGameSeed(session.seed);
                    initLevelGeneration(11);

                    if (enableRngLog) enableRngLog();
                    for (let d = 1; d <= level.depth; d++) {
                        makelevel(d);
                    }
                    const jsRng = getRngLog ? getRngLog() : [];
                    if (disableRngLog) disableRngLog();

                    const cRng = level.rngFingerprint;
                    const cmp = compareRngArrays(jsRng.slice(0, cRng.length), cRng);

                    if (cmp.match) {
                        results.tests.rng.passed++;
                    } else if (cmp.matches > cmp.total * 0.9) {
                        results.tests.rng.partialMatches++;
                    }
                } catch (e) {
                    if (VERBOSE) results.errors.push(`rng ${session.file}: ${e.message}`);
                }
            }
        }
        console.log(`  RNG:      ${results.tests.rng.passed}/${results.tests.rng.total} (${results.tests.rng.partialMatches} partial)`);
    }

    // 4c: Chargen tests (if helpers available)
    if (results.capabilities.chargen) {
        for (const session of chargenSessions.slice(0, 20)) {
            results.tests.chargen.total++;
            try {
                const result = helpers.generateStartupWithRng(session.seed);
                // Just check if it runs without error
                if (result && result.screens) {
                    results.tests.chargen.passed++;
                }
            } catch (e) {
                if (VERBOSE) results.errors.push(`chargen ${session.file}: ${e.message}`);
            }
        }
        console.log(`  Chargen:  ${results.tests.chargen.passed}/${results.tests.chargen.total}`);
    }

    // 4d: Gameplay tests (if helpers available)
    if (results.capabilities.gameplay) {
        for (const session of gameplaySessions.slice(0, 10)) {
            results.tests.gameplay.total++;
            try {
                // Just check the first few steps
                const limitedSession = { ...session, steps: session.steps?.slice(0, 5) };
                const result = helpers.replaySession(limitedSession);
                if (result && !result.error) {
                    results.tests.gameplay.passed++;
                }
            } catch (e) {
                if (VERBOSE) results.errors.push(`gameplay ${session.file}: ${e.message}`);
            }
        }
        console.log(`  Gameplay: ${results.tests.gameplay.passed}/${results.tests.gameplay.total}`);
    }

    // Summary
    const totalTests = Object.values(results.tests).reduce((sum, t) => sum + t.total, 0);
    const totalPassed = Object.values(results.tests).reduce((sum, t) => sum + t.passed, 0);
    const passRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;

    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(`Imports:    rng=${results.imports.rng} config=${results.imports.config} dungeon=${results.imports.dungeon} helpers=${results.imports.helpers}`);
    console.log(`Capability: levelGen=${results.capabilities.levelGen} rngLog=${results.capabilities.rngLog}`);
    console.log(`Tests:      ${totalPassed}/${totalTests} (${passRate}%)`);

    if (results.errors.length > 0 && VERBOSE) {
        console.log(`\nErrors (${results.errors.length}):`);
        results.errors.slice(0, 10).forEach(e => console.log(`  ${e.slice(0, 100)}`));
    }

    // Output JSON for parsing
    console.log('\n__RESULTS_JSON__');
    console.log(JSON.stringify({
        imports: results.imports,
        capabilities: results.capabilities,
        tests: results.tests,
        summary: { total: totalTests, passed: totalPassed, passRate: parseFloat(passRate) },
        errorCount: results.errors.length,
    }));

    process.exit(results.imports.rng ? 0 : 1);
}

runBackfillTests().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
