// test/comparison/test_result_format.js
// Standard test result format utilities matching SESSION_FORMAT_V3.md spec
//
// Creates comparison report JSON with metrics for:
// - rngCalls: { matched, total }
// - keys: { matched, total }
// - grids: { matched, total }
// - screens: { matched, total }

/**
 * Create a new test result object
 * @param {string} sessionFile - Name of the session file tested
 * @param {number} seed - PRNG seed
 * @param {string} source - Session source ("c" or "js")
 * @returns {Object} Test result object
 */
export function createTestResult(sessionFile, seed, source = 'c') {
    return {
        session: sessionFile,
        seed,
        source,
        timestamp: new Date().toISOString(),
        metrics: {
            rngCalls: { matched: 0, total: 0 },
            keys: { matched: 0, total: 0 },
            grids: { matched: 0, total: 0 },
            screens: { matched: 0, total: 0 },
        },
        passed: true,
        firstDivergence: null,
        gridDiffs: [],
        screenDiffs: [],
    };
}

/**
 * Record RNG comparison result
 * @param {Object} result - Test result object
 * @param {boolean} matched - Whether all RNG calls matched
 * @param {number} matchedCount - Number of matching calls
 * @param {number} totalCount - Total number of calls
 * @param {Object} [divergence] - First divergence info if any
 */
export function recordRngResult(result, matched, matchedCount, totalCount, divergence = null) {
    result.metrics.rngCalls.matched += matchedCount;
    result.metrics.rngCalls.total += totalCount;
    if (!matched) {
        result.passed = false;
        if (!result.firstDivergence && divergence) {
            result.firstDivergence = divergence;
        }
    }
}

/**
 * Record keystroke comparison result
 * @param {Object} result - Test result object
 * @param {boolean} matched - Whether this keystroke matched
 */
export function recordKeyResult(result, matched) {
    result.metrics.keys.total++;
    if (matched) {
        result.metrics.keys.matched++;
    } else {
        result.passed = false;
    }
}

/**
 * Record grid comparison result
 * @param {Object} result - Test result object
 * @param {boolean} matched - Whether grids matched
 * @param {number} [stepIndex] - Step index where grid was compared
 * @param {number} [cellsDifferent] - Number of cells that differ
 */
export function recordGridResult(result, matched, stepIndex = -1, cellsDifferent = 0) {
    result.metrics.grids.total++;
    if (matched) {
        result.metrics.grids.matched++;
    } else {
        result.passed = false;
        if (stepIndex >= 0) {
            result.gridDiffs.push({ step: stepIndex, cellsDifferent });
        }
    }
}

/**
 * Record screen comparison result
 * @param {Object} result - Test result object
 * @param {boolean} matched - Whether screens matched
 * @param {number} [stepIndex] - Step index where screen was compared
 * @param {string} [description] - Description of difference
 */
export function recordScreenResult(result, matched, stepIndex = -1, description = '') {
    result.metrics.screens.total++;
    if (matched) {
        result.metrics.screens.matched++;
    } else {
        result.passed = false;
        if (stepIndex >= 0) {
            result.screenDiffs.push({ step: stepIndex, description });
        }
    }
}

/**
 * Finalize test result - clean up empty arrays
 * @param {Object} result - Test result object
 * @returns {Object} Cleaned up result
 */
export function finalizeResult(result) {
    // Remove empty arrays for cleaner output
    if (result.gridDiffs.length === 0) delete result.gridDiffs;
    if (result.screenDiffs.length === 0) delete result.screenDiffs;
    if (result.firstDivergence === null) delete result.firstDivergence;
    return result;
}

/**
 * Create aggregated results from multiple session results
 * @param {Object[]} results - Array of test results
 * @param {string} [commit] - Git commit hash
 * @returns {Object} Aggregated result
 */
export function aggregateResults(results, commit = '') {
    const aggregate = {
        timestamp: new Date().toISOString(),
        commit,
        sessions: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length,
        totals: {
            rngCalls: { matched: 0, total: 0 },
            keys: { matched: 0, total: 0 },
            grids: { matched: 0, total: 0 },
            screens: { matched: 0, total: 0 },
        },
        failures: [],
    };

    for (const result of results) {
        aggregate.totals.rngCalls.matched += result.metrics.rngCalls.matched;
        aggregate.totals.rngCalls.total += result.metrics.rngCalls.total;
        aggregate.totals.keys.matched += result.metrics.keys.matched;
        aggregate.totals.keys.total += result.metrics.keys.total;
        aggregate.totals.grids.matched += result.metrics.grids.matched;
        aggregate.totals.grids.total += result.metrics.grids.total;
        aggregate.totals.screens.matched += result.metrics.screens.matched;
        aggregate.totals.screens.total += result.metrics.screens.total;

        if (!result.passed) {
            aggregate.failures.push({
                session: result.session,
                firstDivergence: result.firstDivergence,
            });
        }
    }

    return aggregate;
}

/**
 * Format a result for console output
 * @param {Object} result - Test result object
 * @returns {string} Formatted string
 */
export function formatResultSummary(result) {
    const m = result.metrics;
    const status = result.passed ? 'PASS' : 'FAIL';
    const rng = m.rngCalls.total > 0 ? `${m.rngCalls.matched}/${m.rngCalls.total}` : '-';
    const keys = m.keys.total > 0 ? `${m.keys.matched}/${m.keys.total}` : '-';
    const grids = m.grids.total > 0 ? `${m.grids.matched}/${m.grids.total}` : '-';
    const screens = m.screens.total > 0 ? `${m.screens.matched}/${m.screens.total}` : '-';
    return `[${status}] ${result.session}: rng=${rng} keys=${keys} grids=${grids} screens=${screens}`;
}

/**
 * Format aggregated results for console output
 * @param {Object} aggregate - Aggregated result object
 * @returns {string} Formatted string
 */
export function formatAggregateSummary(aggregate) {
    const t = aggregate.totals;
    const lines = [
        `Sessions: ${aggregate.passed}/${aggregate.sessions} passed (${aggregate.failed} failed)`,
        `RNG calls: ${t.rngCalls.matched}/${t.rngCalls.total}`,
        `Keys: ${t.keys.matched}/${t.keys.total}`,
        `Grids: ${t.grids.matched}/${t.grids.total}`,
        `Screens: ${t.screens.matched}/${t.screens.total}`,
    ];
    if (aggregate.commit) {
        lines.unshift(`Commit: ${aggregate.commit}`);
    }
    return lines.join('\n');
}
