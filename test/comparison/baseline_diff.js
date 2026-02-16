#!/usr/bin/env node
// test/comparison/baseline_diff.js -- Capture and diff session runner results
//
// Phase 0 guardrail: compare old vs new runner results during migration.
//
// Usage:
//   node baseline_diff.js capture [filename]    # Capture current results to file
//   node baseline_diff.js diff [old] [new]      # Compare two captured results
//   node baseline_diff.js check                  # Compare against baseline
//
// The captured format is the JSON bundle from session_test_runner.js.

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASELINE_FILE = join(__dirname, 'baseline_results.json');

async function runSessionRunner() {
    return new Promise((resolve, reject) => {
        const child = spawn('node', [join(__dirname, 'session_test_runner.js')], {
            cwd: join(__dirname, '../..'),
            stdio: ['inherit', 'pipe', 'inherit'],
        });

        let output = '';
        child.stdout.on('data', (data) => {
            output += data.toString();
        });

        child.on('close', (code) => {
            // Extract JSON from output
            const marker = '__RESULTS_JSON__';
            const idx = output.indexOf(marker);
            if (idx === -1) {
                reject(new Error('No __RESULTS_JSON__ marker found in output'));
                return;
            }
            const jsonStr = output.slice(idx + marker.length).trim();
            try {
                const results = JSON.parse(jsonStr);
                resolve(results);
            } catch (e) {
                reject(new Error(`Failed to parse JSON: ${e.message}`));
            }
        });

        child.on('error', reject);
    });
}

function summarizeResults(bundle) {
    const bySession = {};
    for (const r of bundle.results) {
        bySession[r.session] = {
            passed: r.passed,
            type: r.type,
            seed: r.seed,
            duration: r.duration,
        };
    }
    return {
        timestamp: bundle.timestamp,
        commit: bundle.commit,
        summary: bundle.summary,
        bySession,
    };
}

function diffResults(oldBundle, newBundle) {
    const oldSummary = summarizeResults(oldBundle);
    const newSummary = summarizeResults(newBundle);

    const diffs = {
        summaryChanges: {},
        sessionChanges: [],
        newSessions: [],
        removedSessions: [],
    };

    // Compare summary counts
    for (const key of ['total', 'passed', 'failed']) {
        if (oldSummary.summary[key] !== newSummary.summary[key]) {
            diffs.summaryChanges[key] = {
                old: oldSummary.summary[key],
                new: newSummary.summary[key],
            };
        }
    }

    // Compare individual sessions
    const oldSessions = new Set(Object.keys(oldSummary.bySession));
    const newSessions = new Set(Object.keys(newSummary.bySession));

    for (const session of oldSessions) {
        if (!newSessions.has(session)) {
            diffs.removedSessions.push(session);
        } else if (oldSummary.bySession[session].passed !== newSummary.bySession[session].passed) {
            diffs.sessionChanges.push({
                session,
                oldPassed: oldSummary.bySession[session].passed,
                newPassed: newSummary.bySession[session].passed,
            });
        }
    }

    for (const session of newSessions) {
        if (!oldSessions.has(session)) {
            diffs.newSessions.push(session);
        }
    }

    return diffs;
}

function formatDiff(diffs) {
    const lines = [];

    if (Object.keys(diffs.summaryChanges).length > 0) {
        lines.push('Summary changes:');
        for (const [key, change] of Object.entries(diffs.summaryChanges)) {
            const delta = change.new - change.old;
            const sign = delta > 0 ? '+' : '';
            lines.push(`  ${key}: ${change.old} -> ${change.new} (${sign}${delta})`);
        }
    }

    if (diffs.sessionChanges.length > 0) {
        lines.push('\nSession status changes:');
        for (const change of diffs.sessionChanges) {
            const status = change.newPassed ? 'FIXED' : 'REGRESSED';
            lines.push(`  [${status}] ${change.session}`);
        }
    }

    if (diffs.newSessions.length > 0) {
        lines.push(`\nNew sessions (${diffs.newSessions.length}):`);
        for (const session of diffs.newSessions) {
            lines.push(`  + ${session}`);
        }
    }

    if (diffs.removedSessions.length > 0) {
        lines.push(`\nRemoved sessions (${diffs.removedSessions.length}):`);
        for (const session of diffs.removedSessions) {
            lines.push(`  - ${session}`);
        }
    }

    if (lines.length === 0) {
        lines.push('No differences found.');
    }

    return lines.join('\n');
}

async function captureCommand(filename) {
    const outFile = filename || BASELINE_FILE;
    console.log('Running session tests...');
    const results = await runSessionRunner();
    writeFileSync(outFile, JSON.stringify(results, null, 2));
    console.log(`Captured ${results.summary.total} results to ${outFile}`);
    console.log(`  Passed: ${results.summary.passed}`);
    console.log(`  Failed: ${results.summary.failed}`);
}

async function diffCommand(oldFile, newFile) {
    if (!existsSync(oldFile)) {
        console.error(`Old file not found: ${oldFile}`);
        process.exit(1);
    }
    if (!existsSync(newFile)) {
        console.error(`New file not found: ${newFile}`);
        process.exit(1);
    }

    const oldBundle = JSON.parse(readFileSync(oldFile, 'utf-8'));
    const newBundle = JSON.parse(readFileSync(newFile, 'utf-8'));

    console.log(`Comparing:`);
    console.log(`  Old: ${oldFile} (${oldBundle.timestamp})`);
    console.log(`  New: ${newFile} (${newBundle.timestamp})`);
    console.log();

    const diffs = diffResults(oldBundle, newBundle);
    console.log(formatDiff(diffs));

    // Exit with error if regressions found
    const regressions = diffs.sessionChanges.filter(c => !c.newPassed);
    if (regressions.length > 0) {
        process.exit(1);
    }
}

async function checkCommand() {
    if (!existsSync(BASELINE_FILE)) {
        console.error(`Baseline file not found: ${BASELINE_FILE}`);
        console.error('Run "node baseline_diff.js capture" first.');
        process.exit(1);
    }

    console.log('Running session tests...');
    const newResults = await runSessionRunner();

    const oldBundle = JSON.parse(readFileSync(BASELINE_FILE, 'utf-8'));

    console.log(`\nComparing against baseline (${oldBundle.timestamp}):`);
    const diffs = diffResults(oldBundle, newResults);
    console.log(formatDiff(diffs));

    // Exit with error if regressions found
    const regressions = diffs.sessionChanges.filter(c => !c.newPassed);
    if (regressions.length > 0) {
        console.error(`\n${regressions.length} regression(s) detected!`);
        process.exit(1);
    }
}

// CLI
const [,, command, ...args] = process.argv;

switch (command) {
    case 'capture':
        captureCommand(args[0]).catch(e => {
            console.error(e);
            process.exit(1);
        });
        break;
    case 'diff':
        if (args.length < 2) {
            console.error('Usage: baseline_diff.js diff <old-file> <new-file>');
            process.exit(1);
        }
        diffCommand(args[0], args[1]).catch(e => {
            console.error(e);
            process.exit(1);
        });
        break;
    case 'check':
        checkCommand().catch(e => {
            console.error(e);
            process.exit(1);
        });
        break;
    default:
        console.log('Usage:');
        console.log('  node baseline_diff.js capture [filename]  - Capture current results');
        console.log('  node baseline_diff.js diff <old> <new>    - Compare two result files');
        console.log('  node baseline_diff.js check               - Check against baseline');
        process.exit(1);
}
