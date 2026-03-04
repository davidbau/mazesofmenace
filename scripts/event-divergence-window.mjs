#!/usr/bin/env node
// Print a normalized event divergence window from a comparison artifact.
// Usage:
//   node scripts/event-divergence-window.mjs <comparison.json> [--window N]

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
    const out = { file: null, window: 12 };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--window' && i + 1 < argv.length) {
            out.window = Math.max(1, Number.parseInt(argv[++i], 10) || 12);
            continue;
        }
        if (!out.file) {
            out.file = a;
            continue;
        }
    }
    return out;
}

function stepOf(stepEnds, idx) {
    for (let s = 0; s < stepEnds.length; s++) {
        if (idx < stepEnds[s]) return s;
    }
    return Math.max(0, stepEnds.length - 1);
}

function main() {
    const { file, window } = parseArgs(process.argv);
    if (!file) {
        console.error('Usage: node scripts/event-divergence-window.mjs <comparison.json> [--window N]');
        process.exit(2);
    }
    const abs = path.resolve(file);
    const raw = fs.readFileSync(abs, 'utf8');
    const artifact = JSON.parse(raw);
    const eventCmp = artifact?.comparison?.event;
    if (!eventCmp) {
        console.error(`No event comparison found in ${abs}`);
        process.exit(1);
    }
    const div = eventCmp.firstDivergence;
    if (!div) {
        console.log(`No event divergence in ${abs}`);
        process.exit(0);
    }

    const jsNorm = eventCmp.js?.normalized || [];
    const seNorm = eventCmp.session?.normalized || [];
    const jsRawIndex = eventCmp.js?.rawIndexMap || [];
    const seRawIndex = eventCmp.session?.rawIndexMap || [];
    const jsStepEnds = eventCmp.js?.stepEnds || [];
    const seStepEnds = eventCmp.session?.stepEnds || [];

    const i = div.index;
    const lo = Math.max(0, i - window);
    const hi = Math.min(Math.min(jsNorm.length, seNorm.length) - 1, i + window);

    console.log(`Artifact: ${abs}`);
    console.log(`First event divergence: index=${i} step=${div.step}`);
    console.log(`  JS:      ${div.js}`);
    console.log(`  Session: ${div.session}`);
    console.log('');

    for (let k = lo; k <= hi; k++) {
        const jsStep = stepOf(jsStepEnds, k);
        const seStep = stepOf(seStepEnds, k);
        const jsRaw = Number.isInteger(jsRawIndex[k]) ? jsRawIndex[k] : -1;
        const seRaw = Number.isInteger(seRawIndex[k]) ? seRawIndex[k] : -1;
        const marker = (k === i) ? '>>' : '  ';
        const idx = String(k).padStart(5, ' ');
        console.log(`${marker} ${idx} js[s${jsStep} r${jsRaw}] ${jsNorm[k] ?? ''}`);
        console.log(`${marker} ${idx} se[s${seStep} r${seRaw}] ${seNorm[k] ?? ''}`);
    }
}

main();

