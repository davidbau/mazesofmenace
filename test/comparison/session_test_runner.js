// test/comparison/session_test_runner.js
// Unified session test runner with worker pool
//
// Runs all session tests in parallel using a pool of worker threads.
// Produces per-session results in standard format for git notes.
// Supports --golden flag to fetch sessions from golden branch.
//
// Tests all sessions with consistent RNG, grid, and screen comparison.
//
// Usage: node test/comparison/session_test_runner.js [--verbose] [--golden]

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { Worker } from 'node:worker_threads';
import { cpus } from 'node:os';
import {
    createSessionResult,
    recordRng,
    recordGrids,
    recordScreens,
    markFailed,
    setDuration,
    createResultsBundle,
    formatResult,
    formatBundleSummary,
} from './test_result_format.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const VERBOSE = process.argv.includes('--verbose');
const USE_GOLDEN = process.argv.includes('--golden');
const GOLDEN_BRANCH = process.env.GOLDEN_BRANCH || 'golden';

// Global error handlers to catch crashes
process.on('uncaughtException', (err) => {
    console.error('\n[CRASH] Uncaught exception:', err.message);
    if (VERBOSE) console.error(err.stack);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    console.error('\n[CRASH] Unhandled rejection:', reason);
    process.exit(1);
});

// Worker pool configuration
const NUM_WORKERS = Math.max(4, Math.min(cpus().length, 8)); // 4-8 workers
const INTERNAL_TIMEOUT_MS = 3000;  // Worker self-terminates after 3s
const EXTERNAL_TIMEOUT_MS = 5000;  // Main kills worker after 5s

/**
 * Estimate test size for scheduling (larger = more work)
 * Used to run long tests first so short tests fill in the gaps
 */
function estimateTestSize(session) {
    // Gameplay tests: step count is a good proxy for runtime
    // Weight heavily since each step requires full game engine execution
    if (session.steps?.length) {
        return session.steps.length * 10; // 1000 steps = 10000 weight
    }
    // Map tests: level count (actual generation is fast, ~10ms per level)
    if (session.levels?.length) {
        return session.levels.length * 5;
    }
    // Default: small fixed size for chargen/interface
    return 10;
}

// Session type groups for reporting (4 categories)
const SESSION_GROUPS = {
    chargen: 'Chargen',     // Character generation
    interface: 'Interface', // UI interactions and options
    map: 'Maps',            // Dungeon map generation (sp_lev and random)
    gameplay: 'Gameplay',   // Step-by-step gameplay replays
};

// ============================================================================
// Comparison utilities
// ============================================================================

function compareGrids(grid1, grid2) {
    if (!grid1 || !grid2) return { match: false, matched: 0, total: 1 };
    let diffs = 0;
    const rows = Math.min(grid1.length, grid2.length);
    for (let y = 0; y < rows; y++) {
        const cols = Math.min(grid1[y]?.length || 0, grid2[y]?.length || 0);
        for (let x = 0; x < cols; x++) {
            if (grid1[y][x] !== grid2[y][x]) diffs++;
        }
    }
    return { match: diffs === 0, matched: diffs === 0 ? 1 : 0, total: 1, diffs };
}

function isMidlogEntry(entry) {
    return entry && entry.length > 0 && (entry[0] === '>' || entry[0] === '<');
}

function isCompositeEntry(entry) {
    return entry && (entry.startsWith('rne(') || entry.startsWith('rnz(') || entry.startsWith('d('));
}

function rngCallPart(entry) {
    if (!entry || typeof entry !== 'string') return '';
    let s = entry.replace(/^\d+\s+/, '');
    const atIdx = s.indexOf(' @ ');
    return atIdx >= 0 ? s.substring(0, atIdx) : s;
}

function compareRngArrays(jsRng, cRng) {
    if (!jsRng || !cRng) return { match: false, matched: 0, total: 0 };
    const jsFiltered = jsRng.map(rngCallPart).filter(e => !isMidlogEntry(e) && !isCompositeEntry(e));
    const cFiltered = cRng.map(rngCallPart).filter(e => !isMidlogEntry(e) && !isCompositeEntry(e));
    const len = Math.min(jsFiltered.length, cFiltered.length);
    let matched = 0;
    let firstDivergence = null;
    for (let i = 0; i < len; i++) {
        if (jsFiltered[i] === cFiltered[i]) {
            matched++;
        } else if (!firstDivergence) {
            firstDivergence = {
                rngCall: i,
                expected: cFiltered[i],
                actual: jsFiltered[i],
            };
        }
    }
    return {
        match: matched === len && jsFiltered.length === cFiltered.length,
        matched,
        total: Math.max(jsFiltered.length, cFiltered.length),
        firstDivergence,
    };
}

function compareScreens(screen1, screen2) {
    if (!screen1 || !screen2) return { match: false, matched: 0, total: 1 };
    const lines1 = Array.isArray(screen1) ? screen1 : [];
    const lines2 = Array.isArray(screen2) ? screen2 : [];
    const len = Math.max(lines1.length, lines2.length);
    let matching = 0;
    for (let i = 0; i < len; i++) {
        const l1 = stripAnsi(lines1[i] || '');
        const l2 = stripAnsi(lines2[i] || '');
        if (l1 === l2) matching++;
    }
    return { match: matching === len, matched: matching === len ? 1 : 0, total: 1 };
}

function getSessionStartup(session) {
    if (!session?.steps?.[0]) return null;
    const firstStep = session.steps[0];
    if (firstStep.key === null && firstStep.action === 'startup') {
        return {
            rng: firstStep.rng || [],
            typGrid: firstStep.typGrid,
            screen: firstStep.screen,
        };
    }
    return null;
}

function getGameplaySteps(session) {
    if (!session?.steps) return [];
    if (session.steps[0]?.key === null) return session.steps.slice(1);
    return session.steps;
}

function stripAnsi(str) {
    if (!str) return '';
    return String(str)
        .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
        .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
        .replace(/\x1b[@-Z\\-_]/g, '')
        .replace(/\x9b[0-?]*[ -/]*[@-~]/g, '');
}

// ============================================================================
// Module loading
// ============================================================================

async function tryImport(path) {
    try {
        return await import(path);
    } catch (e) {
        return { _error: e.message };
    }
}

function readGoldenFile(relativePath) {
    try {
        return execSync(`git show ${GOLDEN_BRANCH}:${relativePath}`, {
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024,
            stdio: ['pipe', 'pipe', 'pipe']
        });
    } catch {
        return null;
    }
}

function listGoldenDir(relativePath) {
    try {
        const output = execSync(`git ls-tree --name-only ${GOLDEN_BRANCH}:${relativePath}`, {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
        });
        return output.trim().split('\n').filter(f => f);
    } catch {
        return [];
    }
}

function loadSessions(dir) {
    const relativePath = dir.replace(process.cwd() + '/', '');
    if (USE_GOLDEN) {
        const files = listGoldenDir(relativePath).filter(f => f.endsWith('.session.json'));
        return files.map(f => {
            try {
                const content = readGoldenFile(`${relativePath}/${f}`);
                if (!content) return null;
                const data = JSON.parse(content);
                return { file: f, dir: `golden:${relativePath}`, ...data };
            } catch {
                return null;
            }
        }).filter(Boolean);
    }
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
        .filter(Boolean);
}

/**
 * Load all sessions from both directories
 */
function loadAllSessions() {
    const sessionsDir = join(__dirname, 'sessions');
    const mapsDir = join(__dirname, 'maps');
    return [
        ...loadSessions(sessionsDir),
        ...loadSessions(mapsDir),
    ];
}

/**
 * Infer session type from filename and structure
 */
function inferType(session) {
    const f = session.file;
    // Structure-based (most reliable)
    if (session.levels && Array.isArray(session.levels)) {
        // All map generation sessions (both sp_lev special levels and random maps)
        return 'map';
    }
    // Filename-based for step sessions
    if (f.includes('_chargen')) return 'chargen';
    if (f.includes('_gameplay')) return 'gameplay';
    // Interface tests: interface_* and option toggle tests (seed*_on/off)
    if (f.startsWith('interface_')) return 'interface';
    if (f.startsWith('seed') && (f.includes('_on.') || f.includes('_off.'))) return 'interface';
    // Sessions with steps array (but not matching above patterns) are gameplay
    if (session.steps && Array.isArray(session.steps)) return 'gameplay';
    return 'unknown';
}

// ============================================================================
// Worker Pool for parallel test execution
// ============================================================================

class TestWorkerPool {
    constructor(numWorkers, workerPath) {
        this.numWorkers = numWorkers;
        this.workerPath = workerPath;
        this.workers = [];
        this.queue = [];
        this.results = new Map(); // testIndex -> result
        this.completedCount = 0;
        this.totalTests = 0;
        this.resolveAll = null;
        this.rejectAll = null;
    }

    async initialize() {
        const initPromises = [];
        for (let i = 0; i < this.numWorkers; i++) {
            initPromises.push(this.spawnWorker(i));
        }
        await Promise.all(initPromises);
    }

    spawnWorker(index) {
        return new Promise((resolve, reject) => {
            const worker = new Worker(this.workerPath);
            const workerInfo = { worker, index, busy: false, killTimer: null };

            worker.on('message', (msg) => this.handleMessage(workerInfo, msg));
            worker.on('error', (err) => this.handleError(workerInfo, err));
            worker.on('exit', (code) => this.handleExit(workerInfo, code));

            // Wait for ready signal
            const readyHandler = (msg) => {
                if (msg.type === 'ready') {
                    worker.off('message', readyHandler);
                    this.workers[index] = workerInfo;
                    resolve();
                }
            };
            worker.on('message', readyHandler);

            // Send init command
            worker.postMessage({ type: 'init' });
        });
    }

    handleMessage(workerInfo, msg) {
        if (msg.type === 'result') {
            // Clear external timeout
            if (workerInfo.killTimer) {
                clearTimeout(workerInfo.killTimer);
                workerInfo.killTimer = null;
            }

            // Store result
            this.results.set(msg.testIndex, msg.result);
            this.completedCount++;

            // Print progress
            const status = msg.result.passed ? 'PASS' : 'FAIL';
            const duration = msg.result.duration ? `${msg.result.duration}ms` : '';
            console.log(`  [${this.completedCount}/${this.totalTests}] [${status}] ${msg.result.session} (${duration})`);

            // Mark worker as available and assign next test
            workerInfo.busy = false;
            this.assignNext(workerInfo);

            // Check if all done
            if (this.completedCount >= this.totalTests && this.resolveAll) {
                this.resolveAll();
            }
        }
    }

    handleError(workerInfo, err) {
        console.error(`  [Worker ${workerInfo.index}] Error:`, err.message);
        // Respawn the worker
        this.respawnWorker(workerInfo.index);
    }

    handleExit(workerInfo, code) {
        if (code !== 0 && workerInfo.busy) {
            // Worker died while processing - respawn
            if (VERBOSE) console.log(`  [Worker ${workerInfo.index}] Exited with code ${code}, respawning...`);
            this.respawnWorker(workerInfo.index);
        }
    }

    async respawnWorker(index) {
        const oldInfo = this.workers[index];
        if (oldInfo?.killTimer) clearTimeout(oldInfo.killTimer);

        await this.spawnWorker(index);
        this.assignNext(this.workers[index]);
    }

    assignNext(workerInfo) {
        if (workerInfo.busy || this.queue.length === 0) return;

        const { session, sessionType, testIndex } = this.queue.shift();
        workerInfo.busy = true;

        // Set external kill timeout
        workerInfo.killTimer = setTimeout(() => {
            console.log(`  [Worker ${workerInfo.index}] External timeout, killing...`);
            this.results.set(testIndex, {
                session: session.file,
                type: sessionType,
                seed: session.seed,
                passed: false,
                error: `External timeout after ${EXTERNAL_TIMEOUT_MS}ms`,
            });
            this.completedCount++;
            console.log(`  [${this.completedCount}/${this.totalTests}] [FAIL] ${session.file} (timeout)`);

            workerInfo.worker.terminate();
            this.respawnWorker(workerInfo.index);

            if (this.completedCount >= this.totalTests && this.resolveAll) {
                this.resolveAll();
            }
        }, EXTERNAL_TIMEOUT_MS);

        // Send test to worker
        workerInfo.worker.postMessage({
            type: 'test',
            session,
            sessionType,
            testIndex,
            totalTests: this.totalTests,
        });
    }

    runAll(tests) {
        this.totalTests = tests.length;
        // Create queue with test indices, then sort by estimated work (largest first)
        this.queue = tests.map((t, i) => ({ ...t, testIndex: i }));
        this.queue.sort((a, b) => {
            const sizeA = estimateTestSize(a.session);
            const sizeB = estimateTestSize(b.session);
            return sizeB - sizeA; // Largest first
        });
        this.completedCount = 0;
        this.results.clear();

        return new Promise((resolve, reject) => {
            this.resolveAll = resolve;
            this.rejectAll = reject;

            // Start workers
            for (const workerInfo of this.workers) {
                this.assignNext(workerInfo);
            }
        });
    }

    getSortedResults() {
        // Return results sorted by original test index
        const sorted = [];
        for (let i = 0; i < this.totalTests; i++) {
            sorted.push(this.results.get(i));
        }
        return sorted;
    }

    async shutdown() {
        for (const workerInfo of this.workers) {
            if (workerInfo?.killTimer) clearTimeout(workerInfo.killTimer);
            workerInfo?.worker?.terminate();
        }
    }
}

// ============================================================================
// Main test runner - parallel execution with worker pool
// ============================================================================

async function runBackfillTests() {
    const counts = { chargen: 0, gameplay: 0, interface: 0, option: 0, special: 0, map: 0, unknown: 0 };

    console.log('=== Unified Session Test Runner ===');
    console.log(`Using ${NUM_WORKERS} workers (internal timeout: ${INTERNAL_TIMEOUT_MS/1000}s, external: ${EXTERNAL_TIMEOUT_MS/1000}s)`);
    if (USE_GOLDEN) console.log(`Using golden branch: ${GOLDEN_BRANCH}`);
    console.log('');

    // Load all sessions
    console.log('Loading sessions...');
    const allSessions = loadAllSessions();
    console.log(`  Total: ${allSessions.length} sessions`);

    // Count by type and prepare test queue
    const tests = [];
    for (const session of allSessions) {
        const type = inferType(session);
        counts[type] = (counts[type] || 0) + 1;
        tests.push({ session, sessionType: type });
    }
    console.log(`  Chargen: ${counts.chargen}, Interface: ${counts.interface}, Maps: ${counts.map}, Gameplay: ${counts.gameplay}`);
    if (counts.unknown > 0) console.log(`  Unknown: ${counts.unknown}`);

    // Initialize worker pool
    console.log('\nInitializing worker pool...');
    const workerPath = join(__dirname, 'test_worker.js');
    const pool = new TestWorkerPool(NUM_WORKERS, workerPath);
    await pool.initialize();
    console.log(`  ${NUM_WORKERS} workers ready`);

    // Run tests in parallel
    console.log('\nRunning tests...');
    const totalStart = Date.now();
    await pool.runAll(tests);
    const totalTime = ((Date.now() - totalStart) / 1000).toFixed(1);

    // Get sorted results
    const results = pool.getSortedResults();
    await pool.shutdown();

    // Group results by type
    const groupResults = { chargen: [], interface: [], map: [], gameplay: [], unknown: [] };
    for (const result of results) {
        if (groupResults[result.type]) {
            groupResults[result.type].push(result);
        }
    }

    console.log(`\nRan ${results.length} tests in ${totalTime}s`);

    // Print summary by type
    for (const [type, label] of Object.entries(SESSION_GROUPS)) {
        const typeResults = groupResults[type] || [];
        if (typeResults.length > 0) {
            const passed = typeResults.filter(r => r.passed).length;
            console.log(`  ${label}: ${passed}/${typeResults.length}`);
        }
    }

    // Create and output results bundle
    const bundle = createResultsBundle(results, {
        goldenBranch: USE_GOLDEN ? GOLDEN_BRANCH : null,
    });

    console.log('\n========================================');
    console.log('SUMMARY');
    console.log('========================================');
    console.log(formatBundleSummary(bundle));

    // Output JSON for parsing/git notes
    console.log('\n__RESULTS_JSON__');
    console.log(JSON.stringify(bundle));

    process.exit(bundle.summary.failed > 0 ? 1 : 0);
}

runBackfillTests().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
