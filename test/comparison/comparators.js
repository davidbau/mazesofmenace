// test/comparison/comparators.js -- Pure comparison helpers for session replay.

function stripRngSourceTag(entry) {
    if (!entry || typeof entry !== 'string') return '';
    const noPrefix = entry.replace(/^\d+\s+/, '');
    const atIndex = noPrefix.indexOf(' @ ');
    return atIndex >= 0 ? noPrefix.substring(0, atIndex) : noPrefix;
}

function isMidlogEntry(entry) {
    return typeof entry === 'string' && entry.length > 0 && (entry[0] === '>' || entry[0] === '<');
}

function isCompositeEntry(entry) {
    return typeof entry === 'string'
        && (entry.startsWith('rne(') || entry.startsWith('rnz(') || entry.startsWith('d('));
}

function normalizeRngEntries(entries, {
    ignoreMidlog = true,
    ignoreComposite = true,
} = {}) {
    const list = Array.isArray(entries) ? entries : [];
    return list
        .map(stripRngSourceTag)
        .filter((entry) => {
            if (!entry) return false;
            if (ignoreMidlog && isMidlogEntry(entry)) return false;
            if (ignoreComposite && isCompositeEntry(entry)) return false;
            return true;
        });
}

// Build index mapping from normalized entries back to raw entries
function buildIndexMap(entries, options) {
    const list = Array.isArray(entries) ? entries : [];
    const ignoreMidlog = options.ignoreMidlog !== false;
    const ignoreComposite = options.ignoreComposite !== false;
    const map = [];
    for (let i = 0; i < list.length; i++) {
        const stripped = stripRngSourceTag(list[i]);
        if (!stripped) continue;
        if (ignoreMidlog && isMidlogEntry(stripped)) continue;
        if (ignoreComposite && isCompositeEntry(stripped)) continue;
        map.push(i);
    }
    return map;
}

// Extract the call stack (recent >funcname entries) before a given raw index
function extractCallStack(rawEntries, rawIndex, maxDepth = 3) {
    const stack = [];
    for (let i = rawIndex - 1; i >= 0 && stack.length < maxDepth; i--) {
        const entry = rawEntries[i];
        if (typeof entry === 'string' && entry.startsWith('>')) {
            stack.unshift(entry); // prepend to maintain order
        }
    }
    return stack;
}

export function compareRng(jsRng = [], expectedRng = [], options = {}) {
    const actual = normalizeRngEntries(jsRng, options);
    const expected = normalizeRngEntries(expectedRng, options);
    // Keep original entries (with source locations) for display
    const jsRaw = Array.isArray(jsRng) ? jsRng : [];
    const sessionRaw = Array.isArray(expectedRng) ? expectedRng : [];
    // Build index maps to find raw entries from normalized indices
    const jsIndexMap = buildIndexMap(jsRng, options);
    const sessionIndexMap = buildIndexMap(expectedRng, options);
    const total = Math.max(actual.length, expected.length);

    let matched = 0;
    let firstDivergence = null;

    for (let i = 0; i < total; i++) {
        if (actual[i] === expected[i]) {
            matched++;
            continue;
        }
        if (!firstDivergence) {
            const jsRawIndex = jsIndexMap[i];
            const sessionRawIndex = sessionIndexMap[i];
            firstDivergence = {
                index: i,
                js: actual[i],
                session: expected[i],
                // Include original entries with source locations
                jsRaw: jsRawIndex !== undefined ? jsRaw[jsRawIndex] : undefined,
                sessionRaw: sessionRawIndex !== undefined ? sessionRaw[sessionRawIndex] : undefined,
                // Include call stack context (recent >funcname entries)
                jsStack: jsRawIndex !== undefined ? extractCallStack(jsRaw, jsRawIndex) : [],
                sessionStack: sessionRawIndex !== undefined ? extractCallStack(sessionRaw, sessionRawIndex) : [],
            };
        }
    }

    return {
        matched,
        total,
        index: firstDivergence ? firstDivergence.index : -1,
        js: firstDivergence ? firstDivergence.js : null,
        session: firstDivergence ? firstDivergence.session : null,
        firstDivergence,
    };
}

function normalizeScreenLine(line) {
    return String(line || '').replace(/ +$/, '');
}

export function compareScreenLines(actualLines = [], expectedLines = []) {
    const actual = Array.isArray(actualLines) ? actualLines : [];
    const expected = Array.isArray(expectedLines) ? expectedLines : [];
    const total = Math.max(actual.length, expected.length);

    let matched = 0;
    const diffs = [];

    for (let i = 0; i < total; i++) {
        const jsLine = normalizeScreenLine(actual[i]);
        const sessionLine = normalizeScreenLine(expected[i]);
        if (jsLine === sessionLine) {
            matched++;
        } else {
            diffs.push({ row: i, js: jsLine, session: sessionLine });
        }
    }

    return {
        matched,
        total,
        match: matched === total,
        diffs,
        firstDiff: diffs.length > 0 ? diffs[0] : null,
    };
}

export function compareGrids(actualGrid = [], expectedGrid = []) {
    const diffs = [];
    const rows = Math.max(actualGrid.length || 0, expectedGrid.length || 0);

    for (let y = 0; y < rows; y++) {
        const actualRow = Array.isArray(actualGrid[y]) ? actualGrid[y] : [];
        const expectedRow = Array.isArray(expectedGrid[y]) ? expectedGrid[y] : [];
        const cols = Math.max(actualRow.length || 0, expectedRow.length || 0);

        for (let x = 0; x < cols; x++) {
            if (actualRow[x] !== expectedRow[x]) {
                diffs.push({ x, y, js: actualRow[x], session: expectedRow[x] });
            }
        }
    }

    return diffs;
}

export function findFirstGridDiff(actualGrid = [], expectedGrid = []) {
    const rows = Math.max(actualGrid.length || 0, expectedGrid.length || 0);
    for (let y = 0; y < rows; y++) {
        const actualRow = Array.isArray(actualGrid[y]) ? actualGrid[y] : [];
        const expectedRow = Array.isArray(expectedGrid[y]) ? expectedGrid[y] : [];
        const cols = Math.max(actualRow.length || 0, expectedRow.length || 0);
        for (let x = 0; x < cols; x++) {
            if (actualRow[x] !== expectedRow[x]) {
                return { x, y, js: actualRow[x], session: expectedRow[x] };
            }
        }
    }
    return null;
}

export function formatRngDivergence(divergence, options = {}) {
    if (!divergence) return 'No divergence';

    const lines = [];
    lines.push(`First divergence at index ${divergence.index}:`);
    lines.push(`  JS:      ${divergence.js || '(missing)'}`);
    lines.push(`  Session: ${divergence.session || '(missing)'}`);

    if (options.showContext && divergence.contextBefore) {
        if (divergence.contextBefore.js.length > 0) {
            lines.push('  Context before:');
            divergence.contextBefore.js.forEach((entry, i) => {
                const sessionEntry = divergence.contextBefore.session[i] || '(missing)';
                const match = entry === sessionEntry ? '=' : '!';
                lines.push(`    [${divergence.index - divergence.contextBefore.js.length + i}] ${match} JS: ${entry}`);
                if (entry !== sessionEntry) {
                    lines.push(`        ${match} S:  ${sessionEntry}`);
                }
            });
        }
    }

    return lines.join('\n');
}

export function formatScreenDiff(comparison, options = {}) {
    if (!comparison || comparison.match) return 'Screens match';

    const lines = [];
    lines.push(`Screen mismatch: ${comparison.matched}/${comparison.total} lines match`);

    const maxDiffs = options.maxDiffs || 5;
    const diffs = comparison.diffs.slice(0, maxDiffs);

    for (const diff of diffs) {
        lines.push(`  Row ${diff.row}:`);
        lines.push(`    JS:      "${diff.js}"`);
        lines.push(`    Session: "${diff.session}"`);
    }

    if (comparison.diffs.length > maxDiffs) {
        lines.push(`  ... and ${comparison.diffs.length - maxDiffs} more differences`);
    }

    return lines.join('\n');
}

export function formatGridDiff(diffs, options = {}) {
    if (!diffs || diffs.length === 0) return 'Grids match';

    const lines = [];
    lines.push(`Grid mismatch: ${diffs.length} cells differ`);

    const maxDiffs = options.maxDiffs || 10;
    const shown = diffs.slice(0, maxDiffs);

    for (const diff of shown) {
        lines.push(`  (${diff.x},${diff.y}): JS=${diff.js} Session=${diff.session}`);
    }

    if (diffs.length > maxDiffs) {
        lines.push(`  ... and ${diffs.length - maxDiffs} more differences`);
    }

    return lines.join('\n');
}

export function createDiagnosticReport(result, options = {}) {
    const report = {
        session: result.session || result.file,
        type: result.type,
        seed: result.seed,
        passed: result.passed,
        channels: {},
    };

    if (result.firstDivergence) {
        report.channels.rng = {
            divergenceIndex: result.firstDivergence.index,
            step: result.firstDivergence.step,
            depth: result.firstDivergence.depth,
            js: result.firstDivergence.js,
            session: result.firstDivergence.session,
            formatted: formatRngDivergence(result.firstDivergence, options),
        };
    }

    if (result.metrics?.grids?.matched < result.metrics?.grids?.total) {
        report.channels.grid = {
            matched: result.metrics.grids.matched,
            total: result.metrics.grids.total,
        };
    }

    if (result.metrics?.screens?.matched < result.metrics?.screens?.total) {
        report.channels.screen = {
            matched: result.metrics.screens.matched,
            total: result.metrics.screens.total,
        };
    }

    if (result.error) {
        report.channels.error = {
            message: typeof result.error === 'string' ? result.error : result.error.message,
            stack: result.error.stack,
        };
    }

    return report;
}
