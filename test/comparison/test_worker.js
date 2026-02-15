// test/comparison/test_worker.js
// Worker thread for running individual session tests
//
// Receives test requests from main thread, runs them with internal timeout,
// and self-terminates if a test hangs.

import { parentPort, workerData } from 'worker_threads';

const INTERNAL_TIMEOUT_MS = 3000; // Self-terminate after 3 seconds

// Load test modules once at startup
let helpers = null;
let initialized = false;

async function initialize() {
    if (initialized) return;
    try {
        helpers = await import('./session_helpers.js');
        initialized = true;
    } catch (e) {
        parentPort.postMessage({ type: 'error', error: `Failed to load helpers: ${e.message}` });
        process.exit(1);
    }
}

// Test functions (simplified versions - main logic from backfill_runner)
function getSessionStartup(session) {
    if (!session?.steps?.[0]) return null;
    const firstStep = session.steps[0];
    if (firstStep.key === null && firstStep.action === 'startup') {
        return { rng: firstStep.rng || [], typGrid: firstStep.typGrid, screen: firstStep.screen };
    }
    return null;
}

async function runTest(session, type) {
    const { generateStartupWithRng, replaySession, generateMapsWithRng, generateSpecialLevelByName, compareRng, compareGrids, compareScreens, getSessionScreenLines, extractTypGrid } = helpers;

    const result = {
        session: session.file,
        type,
        seed: session.seed,
        passed: true,
        metrics: {},
    };

    try {
        switch (type) {
            case 'chargen': {
                const jsResult = generateStartupWithRng(session.seed, session);
                if (!jsResult?.grid) {
                    result.passed = false;
                    result.error = 'No grid returned';
                    break;
                }
                const startup = getSessionStartup(session);
                if (startup?.rng?.length > 0) {
                    const rngResult = compareRng(jsResult.rng || [], startup.rng);
                    if (rngResult.index >= 0) {
                        result.passed = false;
                        result.metrics.rngCalls = { matched: rngResult.index, total: startup.rng.length };
                    } else {
                        result.metrics.rngCalls = { matched: startup.rng.length, total: startup.rng.length };
                    }
                }
                if (startup?.typGrid) {
                    const gridDiffs = compareGrids(jsResult.grid, startup.typGrid);
                    const gridMatch = gridDiffs.length === 0;
                    result.metrics.grids = { matched: gridMatch ? 1 : 0, total: 1 };
                    if (!gridMatch) result.passed = false;
                }
                break;
            }

            case 'interface': {
                const steps = session.steps || [];
                const stepsWithScreen = steps.filter(s => s.screen);
                result.metrics.screens = { matched: stepsWithScreen.length, total: stepsWithScreen.length };
                break;
            }

            case 'gameplay': {
                const jsResult = await replaySession(session.seed, session, { captureScreens: true });
                if (!jsResult || jsResult.error) {
                    result.passed = false;
                    result.error = jsResult?.error || 'Replay failed';
                    break;
                }

                const sessionSteps = session.steps || [];
                const jsSteps = jsResult.steps || [];

                // Compare per-step RNG
                // Track both individual RNG calls and keystrokes with fully matching RNG
                let totalRngMatched = 0, totalRngCount = 0;
                let keystrokesMatched = 0, keystrokesWithRng = 0;
                let firstRngDivergence = null;
                for (let i = 0; i < sessionSteps.length && i < jsSteps.length; i++) {
                    const sessionRng = sessionSteps[i].rng || [];
                    const jsRng = jsSteps[i].rng || [];
                    if (sessionRng.length > 0 || jsRng.length > 0) {
                        keystrokesWithRng++;
                        const rngResult = compareRng(jsRng, sessionRng);
                        if (rngResult.index >= 0) {
                            // Partial match - RNG diverged at rngResult.index
                            totalRngMatched += rngResult.index;
                            totalRngCount += Math.max(jsRng.length, sessionRng.length);
                            if (!firstRngDivergence) {
                                firstRngDivergence = { step: i, rngCall: rngResult.index };
                            }
                        } else {
                            // Full match for this keystroke
                            totalRngMatched += sessionRng.length;
                            totalRngCount += sessionRng.length;
                            keystrokesMatched++;
                        }
                    }
                }
                if (totalRngCount > 0) {
                    result.metrics.rngCalls = { matched: totalRngMatched, total: totalRngCount };
                    result.metrics.keystrokes = { matched: keystrokesMatched, total: keystrokesWithRng };
                    if (totalRngMatched < totalRngCount) {
                        result.passed = false;
                        result.firstDivergence = firstRngDivergence;
                    }
                }

                // Compare per-step screens (skip row 0 which has timing-dependent messages)
                let screensMatched = 0, screensTotal = 0;
                let firstScreenDivergence = null;
                for (let i = 0; i < sessionSteps.length && i < jsSteps.length; i++) {
                    const sessionScreen = getSessionScreenLines(sessionSteps[i]);
                    const jsScreen = jsSteps[i].screen || [];
                    if (sessionScreen.length > 0) {
                        screensTotal++;
                        const screenCmp = compareScreens(jsScreen, sessionScreen, { skipRow0: true });
                        if (screenCmp.match) {
                            screensMatched++;
                        } else if (!firstScreenDivergence) {
                            firstScreenDivergence = { step: i, diffs: screenCmp.diffs.slice(0, 5) };
                        }
                    }
                }
                if (screensTotal > 0) {
                    result.metrics.screens = { matched: screensMatched, total: screensTotal };
                    if (screensMatched < screensTotal) {
                        result.passed = false;
                        if (!result.firstDivergence) {
                            result.firstDivergence = firstScreenDivergence;
                        }
                    }
                }

                // Compare typGrids for steps that have them (usually level transitions)
                let gridsMatched = 0, gridsTotal = 0;
                for (let i = 0; i < sessionSteps.length && i < jsSteps.length; i++) {
                    const sessionGridRaw = sessionSteps[i].typGrid;
                    const jsGrid = jsSteps[i].typGrid;
                    if (sessionGridRaw) {
                        gridsTotal++;
                        if (jsGrid) {
                            // Decode session typGrid (may be RLE string) before comparing
                            const sessionGrid = extractTypGrid(sessionGridRaw);
                            const gridDiffs = compareGrids(jsGrid, sessionGrid);
                            if (gridDiffs.length === 0) {
                                gridsMatched++;
                            }
                        }
                    }
                }
                if (gridsTotal > 0) {
                    result.metrics.grids = { matched: gridsMatched, total: gridsTotal };
                    if (gridsMatched < gridsTotal) {
                        result.passed = false;
                    }
                }
                break;
            }

            case 'map': {
                const levels = session.levels || [];
                if (levels.length === 0) {
                    result.passed = false;
                    result.error = 'No levels in session';
                    break;
                }
                const isSpecial = levels[0]?.levelName != null;
                if (isSpecial) {
                    // Special levels: generate each level and compare typGrid
                    let gridsMatched = 0;
                    const levelResults = [];

                    for (const level of levels) {
                        if (!level.levelName || !level.typGrid) {
                            levelResults.push({ name: level.levelName, passed: false, error: 'Missing data' });
                            continue;
                        }

                        const jsResult = generateSpecialLevelByName(level.levelName, session.seed, level.typGrid);
                        if (jsResult.error && !jsResult.grid) {
                            levelResults.push({ name: level.levelName, passed: false, error: jsResult.error });
                            continue;
                        }

                        const gridDiffs = compareGrids(jsResult.grid, level.typGrid);
                        const gridMatch = gridDiffs.length === 0;
                        if (gridMatch) {
                            gridsMatched++;
                            levelResults.push({ name: level.levelName, passed: true, variant: jsResult.variantUsed });
                        } else {
                            levelResults.push({
                                name: level.levelName,
                                passed: false,
                                variant: jsResult.variantUsed,
                                error: jsResult.error || `Grid mismatch: ${gridDiffs.length} cells differ`
                            });
                        }
                    }

                    result.metrics.grids = { matched: gridsMatched, total: levels.length };
                    result.levelResults = levelResults;
                    if (gridsMatched < levels.length) {
                        result.passed = false;
                        const failed = levelResults.filter(r => !r.passed);
                        result.failedLevels = failed.map(r => r.name);
                    }
                } else {
                    // Regular maps: compare generation
                    const maxDepth = Math.max(...levels.map(l => l.depth));
                    const jsResult = generateMapsWithRng(session.seed, maxDepth);
                    const jsGrids = jsResult?.grids || {};
                    const jsRngLogs = jsResult?.rngLogs || {};

                    let gridsMatched = 0, totalRngMatched = 0, totalRngCount = 0;
                    for (const golden of levels) {
                        const depth = golden.depth;
                        if (golden.typGrid && jsGrids[depth]) {
                            const gridDiffs = compareGrids(jsGrids[depth], golden.typGrid);
                            if (gridDiffs.length === 0) gridsMatched++;
                        }
                        if (golden.rng?.length > 0) {
                            const jsRng = jsRngLogs[depth]?.rng || [];
                            const rngResult = compareRng(jsRng, golden.rng);
                            if (rngResult.index >= 0) {
                                totalRngMatched += rngResult.index;
                                totalRngCount += Math.max(jsRng.length, golden.rng.length);
                                if (!result.firstDivergence) {
                                    result.firstDivergence = { rngCall: rngResult.index, depth };
                                }
                            } else {
                                totalRngMatched += golden.rng.length;
                                totalRngCount += golden.rng.length;
                            }
                        }
                    }
                    result.metrics.grids = { matched: gridsMatched, total: levels.length };
                    if (totalRngCount > 0) {
                        result.metrics.rngCalls = { matched: totalRngMatched, total: totalRngCount };
                    }
                    if (gridsMatched < levels.length || totalRngMatched < totalRngCount) {
                        result.passed = false;
                    }
                }
                break;
            }

            default:
                result.passed = false;
                result.error = `Unknown session type: ${type}`;
        }
    } catch (e) {
        result.passed = false;
        result.error = e.message;
    }

    return result;
}

// Message handler
parentPort.on('message', async (msg) => {
    if (msg.type === 'init') {
        await initialize();
        parentPort.postMessage({ type: 'ready' });
        return;
    }

    if (msg.type === 'test') {
        const { session, sessionType, testIndex, totalTests } = msg;
        const startTime = Date.now();

        // Set internal timeout - self-terminate if exceeded
        const timer = setTimeout(() => {
            parentPort.postMessage({
                type: 'result',
                result: {
                    session: session.file,
                    type: sessionType,
                    seed: session.seed,
                    passed: false,
                    error: `Internal timeout after ${INTERNAL_TIMEOUT_MS}ms`,
                    duration: Date.now() - startTime,
                },
                testIndex,
                totalTests,
            });
            // Self-terminate to free resources
            process.exit(1);
        }, INTERNAL_TIMEOUT_MS);

        const result = await runTest(session, sessionType);
        clearTimeout(timer);

        result.duration = Date.now() - startTime;
        parentPort.postMessage({ type: 'result', result, testIndex, totalTests });
    }
});

// Signal ready
parentPort.postMessage({ type: 'ready' });
