#!/usr/bin/env node
// gen_session.js -- Convert existing trace files into session JSON format.
//
// Reads the scattered trace files in traces/seed42_reference/ and the
// golden typ grid, then produces sessions/seed42.session.json.
//
// Usage:
//     node test/comparison/gen_session.js

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TRACE_DIR = join(__dirname, 'traces/seed42_reference');
const GOLDEN_DIR = join(__dirname, 'golden');
const OUTPUT_DIR = join(__dirname, 'sessions');

// Move sequence from trace_summary.txt
const MOVE_SEQUENCE = ':hhlhhhh.hhs';

// Serialize session JSON with compact typGrid rows (one row per line)
// and compact screen/rng arrays (one entry per line).
function serializeSession(session) {
    // Use a custom serializer that keeps inner arrays compact
    const json = JSON.stringify(session, null, 2);

    // Post-process: collapse typGrid row arrays onto single lines
    // Pattern: a line with just "[" followed by lines of numbers, then "]"
    // We look for arrays whose contents are all numbers (typGrid rows)
    const lines = json.split('\n');
    const result = [];
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        // Detect start of a number array: line ends with "[" and next line is a number
        if (line.trimEnd().endsWith('[') && i + 1 < lines.length) {
            const nextTrimmed = lines[i + 1].trim();
            if (/^\d+,?$/.test(nextTrimmed)) {
                // Collect all numbers until closing "]"
                const indent = line.match(/^(\s*)/)[1];
                const prefix = line.trimEnd();
                const nums = [];
                let j = i + 1;
                while (j < lines.length) {
                    const t = lines[j].trim();
                    if (t === ']' || t === '],') {
                        const suffix = t;
                        result.push(`${prefix}${nums.join(', ')}${suffix}`);
                        i = j + 1;
                        break;
                    }
                    nums.push(t.replace(/,$/, ''));
                    j++;
                }
                continue;
            }
        }
        result.push(line);
        i++;
    }
    return result.join('\n') + '\n';
}

const KEY_ACTIONS = {
    ':': 'look',
    'h': 'move-west',
    'l': 'move-east',
    '.': 'wait',
    's': 'search',
    'j': 'move-south',
    'k': 'move-north',
};

// Keys that don't consume a game turn
const NON_TURN_KEYS = new Set([':', 'i', '@']);

function parseRngFile(filename) {
    if (!existsSync(filename)) return [];
    const text = readFileSync(filename, 'utf8').trim();
    if (!text) return [];
    const entries = [];
    for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        // Format: "2808 rn2(12) = 2 @ mon.c:1145"
        // Compact to: "rn2(12)=2 @ mon.c:1145"
        const parts = line.trim().split(/\s+/);
        if (parts.length < 4) continue;
        // parts[0] = index, parts[1] = fn(args), parts[2] = '=', parts[3] = result
        let entry = `${parts[1]}=${parts[3]}`;
        // Append source location if present
        if (parts.length >= 6 && parts[4] === '@') {
            entry += ` @ ${parts[5]}`;
        }
        entries.push(entry);
    }
    return entries;
}

function parseScreenFile(filename) {
    if (!existsSync(filename)) return [];
    const text = readFileSync(filename, 'utf8');
    const lines = text.split('\n');
    // Pad or trim to 24 lines
    while (lines.length < 24) lines.push('');
    return lines.slice(0, 24);
}

function parseTypGrid(filename) {
    if (!existsSync(filename)) return null;
    const text = readFileSync(filename, 'utf8').trim();
    return text.split('\n').map(line =>
        line.trim().split(/\s+/).map(Number)
    );
}

function main() {
    console.log('Converting seed 42 trace data to session JSON...');

    // Read startup RNG count from trace_summary.txt
    const summaryFile = join(TRACE_DIR, 'trace_summary.txt');
    const summary = readFileSync(summaryFile, 'utf8');
    const startupMatch = summary.match(/\[000\] START — (\d+) RNG calls/);
    const startupRngCalls = startupMatch ? parseInt(startupMatch[1]) : 2807;

    // Read startup screen
    const startupScreen = parseScreenFile(join(TRACE_DIR, 'screen_000_start.txt'));

    // Read typ grid (golden file for seed 42 depth 1)
    const typGrid = parseTypGrid(join(GOLDEN_DIR, 'typ_seed42_depth1.txt'));

    // Build session
    const session = {
        version: 1,
        seed: 42,
        wizard: true,
        character: {
            name: 'Wizard',
            role: 'Valkyrie',
            race: 'human',
            gender: 'female',
            align: 'neutral',
        },
        symset: 'DECgraphics',
        startup: {
            rngCalls: startupRngCalls,
            typGrid: typGrid,
            screen: startupScreen,
        },
        steps: [],
    };

    // Parse move sequence and read corresponding files
    let turn = 0;
    for (let i = 0; i < MOVE_SEQUENCE.length; i++) {
        const key = MOVE_SEQUENCE[i];
        const action = KEY_ACTIONS[key] || `key-${key}`;
        const stepIdx = i + 1; // Files are 1-indexed (001, 002, ...)

        if (!NON_TURN_KEYS.has(key)) {
            turn++;
        }

        // Find the RNG file for this step
        // Filename pattern: rng_NNN_<key>_<action>.txt
        const rngPattern = `rng_${String(stepIdx).padStart(3, '0')}_`;
        const screenPattern = `screen_${String(stepIdx).padStart(3, '0')}_`;

        // Read RNG trace
        let rngFile = null;
        const rngCandidates = [
            join(TRACE_DIR, `rng_${String(stepIdx).padStart(3, '0')}_${key}_${action}.txt`),
        ];
        for (const candidate of rngCandidates) {
            if (existsSync(candidate)) {
                rngFile = candidate;
                break;
            }
        }
        const rng = rngFile ? parseRngFile(rngFile) : [];

        // Read screen capture
        let screenFile = null;
        const screenCandidates = [
            join(TRACE_DIR, `screen_${String(stepIdx).padStart(3, '0')}_${key}_${action}.txt`),
        ];
        for (const candidate of screenCandidates) {
            if (existsSync(candidate)) {
                screenFile = candidate;
                break;
            }
        }
        const screen = screenFile ? parseScreenFile(screenFile) : [];

        const step = {
            key,
            action,
            turn,
            depth: 1,
            rng,
            screen,
        };

        session.steps.push(step);
        console.log(`  [${String(stepIdx).padStart(3, '0')}] key='${key}' (${action}) turn=${turn} rng=${rng.length} calls`);
    }

    // Write output with compact typ grid rows
    const outputFile = join(OUTPUT_DIR, 'seed42.session.json');
    writeFileSync(outputFile, serializeSession(session));
    console.log(`\nWrote ${outputFile}`);
    console.log(`  ${session.steps.length} steps, startup ${startupRngCalls} RNG calls`);
}

main();
