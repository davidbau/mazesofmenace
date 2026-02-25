#!/usr/bin/env node
// Compare a C gameplay session against a JS replay trace (file or generated).

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { normalizeSession } from '../test/comparison/session_loader.js';
import { recordGameplaySessionFromInputs } from '../test/comparison/session_recorder.js';
import { compareRecordedGameplaySession } from '../test/comparison/session_comparator.js';

function usage() {
    console.log('Usage: node scripts/compare-sessions.mjs <c-session.json> [--js <js-replay.json>] [--json]');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/compare-sessions.mjs test/comparison/sessions/seed208_ranger_wizard_gameplay.session.json');
    console.log('  node scripts/compare-sessions.mjs <c-session.json> --js /tmp/seed208.js-replay.json');
}

function parseArgs(argv) {
    const args = argv.slice(2);
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        usage();
        process.exit(0);
    }
    const cSessionPath = args[0];
    let jsReplayPath = null;
    let jsonOut = false;
    for (let i = 1; i < args.length; i++) {
        const a = args[i];
        if (a === '--js') {
            jsReplayPath = args[i + 1];
            i++;
        } else if (a === '--json') {
            jsonOut = true;
        } else {
            throw new Error(`Unknown arg: ${a}`);
        }
    }
    return { cSessionPath, jsReplayPath, jsonOut };
}

function summarize(cmp) {
    return {
        rng: {
            matched: cmp.rng.matched,
            total: cmp.rng.total,
            firstDivergence: cmp.rng.firstDivergence,
        },
        screen: {
            matched: cmp.screen.matched,
            total: cmp.screen.total,
            firstDivergence: cmp.screen.firstDivergence,
        },
        color: {
            matched: cmp.color.matched,
            total: cmp.color.total,
            firstDivergence: cmp.color.firstDivergence,
        },
        event: {
            matched: cmp.event.matched,
            total: cmp.event.total,
            firstDivergence: cmp.event.firstDivergence,
        },
    };
}

async function main() {
    const { cSessionPath, jsReplayPath, jsonOut } = parseArgs(process.argv);
    const absC = resolve(cSessionPath);
    const cRaw = JSON.parse(readFileSync(absC, 'utf8'));
    const cSession = normalizeSession(cRaw, {
        file: absC.split('/').pop(),
        dir: dirname(absC),
    });
    if (cSession.meta.type !== 'gameplay') {
        throw new Error(`Only gameplay sessions are supported right now (got type=${cSession.meta.type}).`);
    }

    let replay;
    let replaySource = 'generated';
    if (jsReplayPath) {
        const absJs = resolve(jsReplayPath);
        replay = JSON.parse(readFileSync(absJs, 'utf8'));
        replaySource = absJs;
    } else {
        replay = await recordGameplaySessionFromInputs(cSession);
    }

    const cmp = compareRecordedGameplaySession(cSession, replay);
    const out = {
        cSession: absC,
        replaySource,
        replayTag: replay?.source || null,
        summary: summarize(cmp),
    };

    if (jsonOut) {
        process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
        return;
    }

    console.log(`C session: ${absC}`);
    console.log(`JS replay: ${replaySource} (${replay?.source || 'unknown'})`);
    for (const channel of ['rng', 'screen', 'color', 'event']) {
        const c = out.summary[channel];
        console.log(`${channel}: ${c.matched}/${c.total}`);
        if (c.firstDivergence) {
            console.log(`  first: ${JSON.stringify(c.firstDivergence)}`);
        }
    }
}

main().catch((err) => {
    console.error(err?.stack || String(err));
    process.exit(1);
});
