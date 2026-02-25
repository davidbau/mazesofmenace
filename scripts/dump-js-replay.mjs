#!/usr/bin/env node
// Dump a raw JS replay trace (source: 'js-replay') from a C session capture.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { normalizeSession } from '../test/comparison/session_loader.js';
import { recordGameplaySessionFromInputs } from '../test/comparison/session_recorder.js';

function usage() {
    console.log('Usage: node scripts/dump-js-replay.mjs <c-session.json> [--out <js-replay.json>]');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/dump-js-replay.mjs test/comparison/sessions/seed208_ranger_wizard_gameplay.session.json');
    console.log('  node scripts/dump-js-replay.mjs <c-session.json> --out /tmp/seed208.js-replay.json');
}

function parseArgs(argv) {
    const args = argv.slice(2);
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        usage();
        process.exit(0);
    }
    const sessionPath = args[0];
    let outPath = null;
    for (let i = 1; i < args.length; i++) {
        const a = args[i];
        if (a === '--out') {
            outPath = args[i + 1];
            i++;
        } else {
            throw new Error(`Unknown arg: ${a}`);
        }
    }
    return { sessionPath, outPath };
}

async function main() {
    const { sessionPath, outPath } = parseArgs(process.argv);
    const absSessionPath = resolve(sessionPath);
    const raw = JSON.parse(readFileSync(absSessionPath, 'utf8'));
    const normalized = normalizeSession(raw, {
        file: absSessionPath.split('/').pop(),
        dir: dirname(absSessionPath),
    });

    if (normalized.meta.type !== 'gameplay') {
        throw new Error(`Only gameplay sessions are supported right now (got type=${normalized.meta.type}).`);
    }

    const replay = await recordGameplaySessionFromInputs(normalized);
    const payload = {
        source: replay?.source || 'js-replay',
        seed: normalized.meta.seed,
        type: normalized.meta.type,
        options: normalized.meta.options || {},
        startup: replay.startup || { rngCalls: 0, rng: [] },
        steps: replay.steps || [],
    };

    const text = `${JSON.stringify(payload, null, 2)}\n`;
    if (outPath) {
        const absOut = resolve(outPath);
        mkdirSync(dirname(absOut), { recursive: true });
        writeFileSync(absOut, text, 'utf8');
        console.log(`Wrote JS replay: ${absOut}`);
    } else {
        process.stdout.write(text);
    }
}

main().catch((err) => {
    console.error(err?.stack || String(err));
    process.exit(1);
});
