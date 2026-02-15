/**
 * Session Tests - Node.js test runner wrapper
 *
 * Runs the fast parallel session_test_runner.js and reports
 * results in node:test format with grouping by session type.
 */

import { describe, test } from 'node:test';
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const runnerPath = join(__dirname, 'session_test_runner.js');

// Run the fast parallel session tests and capture JSON output
let output;
try {
    output = execSync(`node ${runnerPath}`, {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,  // 10MB for large JSON output
        stdio: ['pipe', 'pipe', 'pipe']  // Capture stderr too
    });
} catch (e) {
    // Runner exits non-zero when tests fail, but we still want the output
    output = e.stdout || '';
}

// Extract JSON results (after __RESULTS_JSON__ marker)
const jsonMarker = '__RESULTS_JSON__\n';
const jsonStart = output.indexOf(jsonMarker);
if (jsonStart === -1) {
    throw new Error('No JSON results found in session_test_runner output');
}
const jsonStr = output.slice(jsonStart + jsonMarker.length).trim();
const { results } = JSON.parse(jsonStr);

// Group results by type
const groups = {
    chargen: [],
    interface: [],
    map: [],
    gameplay: [],
    other: []
};

for (const r of results) {
    const type = r.type || 'other';
    if (groups[type]) {
        groups[type].push(r);
    } else {
        groups.other.push(r);
    }
}

// Generate tests for each group
describe('Chargen Sessions', () => {
    for (const r of groups.chargen) {
        test(r.session, () => {
            if (!r.passed) {
                throw new Error(r.error || `Failed: ${JSON.stringify(r.metrics || {})}`);
            }
        });
    }
});

describe('Interface Sessions', () => {
    for (const r of groups.interface) {
        test(r.session, () => {
            if (!r.passed) {
                throw new Error(r.error || `Failed: ${JSON.stringify(r.metrics || {})}`);
            }
        });
    }
});

describe('Map Sessions', () => {
    for (const r of groups.map) {
        test(r.session, () => {
            if (!r.passed) {
                const details = r.failedLevels
                    ? `Failed levels: ${r.failedLevels.join(', ')}`
                    : JSON.stringify(r.metrics || {});
                throw new Error(r.error || details);
            }
        });
    }
});

describe('Gameplay Sessions', () => {
    for (const r of groups.gameplay) {
        test(r.session, () => {
            if (!r.passed) {
                const details = r.firstDivergence
                    ? `Diverged at step ${r.firstDivergence.step}, RNG call ${r.firstDivergence.rngCall}`
                    : JSON.stringify(r.metrics || {});
                throw new Error(r.error || details);
            }
        });
    }
});

if (groups.other.length > 0) {
    describe('Other Sessions', () => {
        for (const r of groups.other) {
            test(r.session, () => {
                if (!r.passed) {
                    throw new Error(r.error || `Failed: ${JSON.stringify(r.metrics || {})}`);
                }
            });
        }
    });
}
