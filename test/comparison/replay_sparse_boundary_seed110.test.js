import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { replaySession } from '../../js/replay_core.js';
import { DEFAULT_FLAGS } from '../../js/storage.js';
import { normalizeSession } from '../comparison/session_loader.js';

describe('replay byte snapshot invariants', () => {

function comparable(entries) {
    const out = [];
    for (const raw of (entries || [])) {
        if (typeof raw !== 'string') continue;
        const at = raw.indexOf(' @ ');
        const norm = at >= 0 ? raw.slice(0, at) : raw;
        if (!norm || norm.startsWith('>') || norm.startsWith('<') || norm.startsWith('~')) continue;
        if (norm.startsWith('rne(') || norm.startsWith('rnz(') || norm.startsWith('d(')) continue;
        out.push(norm.replace(/=\d+$/, ''));
    }
    return out;
}

test('replay emits byte snapshots with stable step attribution (seed110)', async () => {
    const raw = JSON.parse(readFileSync('test/comparison/sessions/seed110_samurai_selfplay200_gameplay.session.json', 'utf8'));
    const session = normalizeSession(raw, {
        file: 'seed110_samurai_selfplay200_gameplay.session.json',
        dir: 'test/comparison/sessions',
    });

    const prevTags = process.env.RNG_LOG_TAGS;
    process.env.RNG_LOG_TAGS = '1';
    try {
        const replay = await replaySession(session.meta.seed, session.raw, {
            captureScreens: true,
            startupBurstInFirstStep: false,
            flags: { ...DEFAULT_FLAGS, bgcolors: true, customcolors: true },
        });

        assert.ok(Array.isArray(replay.bytes));
        assert.ok(replay.bytes.length > 0);
        const expectedBytes = session.steps.reduce(
            (n, s) => n + ((typeof s?.key === 'string') ? s.key.length : 0),
            0
        );
        assert.equal(replay.bytes.length, expectedBytes);
        for (let i = 0; i < replay.bytes.length; i++) {
            const b = replay.bytes[i];
            assert.ok(Number.isInteger(b.stepIndex));
            assert.ok(Number.isInteger(b.byteIndex));
            assert.equal(typeof b.key, 'string');
            assert.equal(Array.isArray(b.rng), true);
            assert.equal(Array.isArray(b.screen), true);
            if (i > 0) {
                const p = replay.bytes[i - 1];
                assert.ok(
                    b.stepIndex > p.stepIndex
                    || (b.stepIndex === p.stepIndex && b.byteIndex >= p.byteIndex)
                );
            }
        }
    } finally {
        if (prevTags === undefined) delete process.env.RNG_LOG_TAGS;
        else process.env.RNG_LOG_TAGS = prevTags;
    }
});

test('per-step RNG equals concatenated byte-frame RNG (seed5)', async () => {
    const raw = JSON.parse(readFileSync('test/comparison/sessions/seed5_gnomish_mines_gameplay.session.json', 'utf8'));
    const session = normalizeSession(raw, {
        file: 'seed5_gnomish_mines_gameplay.session.json',
        dir: 'test/comparison/sessions',
    });

    const prevTags = process.env.RNG_LOG_TAGS;
    process.env.RNG_LOG_TAGS = '1';
    try {
        const replay = await replaySession(session.meta.seed, session.raw, {
            captureScreens: true,
            startupBurstInFirstStep: false,
            flags: { ...DEFAULT_FLAGS, bgcolors: true, customcolors: true },
        });

        for (let i = 0; i < replay.steps.length; i++) {
            const step = replay.steps[i] || {};
            const fromFrames = (step.byteFrames || []).flatMap((f) => f.rng || []);
            assert.deepEqual(comparable(step.rng || []), comparable(fromFrames));
        }
    } finally {
        if (prevTags === undefined) delete process.env.RNG_LOG_TAGS;
        else process.env.RNG_LOG_TAGS = prevTags;
    }
});

test('global step RNG stream equals global byte RNG stream (seed5 maxSteps)', async () => {
    const raw = JSON.parse(readFileSync('test/comparison/sessions/seed5_gnomish_mines_gameplay.session.json', 'utf8'));
    const session = normalizeSession(raw, {
        file: 'seed5_gnomish_mines_gameplay.session.json',
        dir: 'test/comparison/sessions',
    });

    const prevTags = process.env.RNG_LOG_TAGS;
    process.env.RNG_LOG_TAGS = '1';
    try {
        const replay = await replaySession(session.meta.seed, session.raw, {
            captureScreens: true,
            startupBurstInFirstStep: false,
            maxSteps: 541,
            flags: { ...DEFAULT_FLAGS, bgcolors: true, customcolors: true },
        });

        const stepsRng = comparable(replay.steps.flatMap((s) => s.rng || []));
        const bytesRng = comparable(replay.bytes.flatMap((b) => b.rng || []));
        assert.deepEqual(stepsRng, bytesRng);

        const expectedBytes = session.steps.slice(0, 541).reduce(
            (n, s) => n + ((typeof s?.key === 'string') ? s.key.length : 0),
            0
        );
        assert.equal(replay.bytes.length, expectedBytes);
    } finally {
        if (prevTags === undefined) delete process.env.RNG_LOG_TAGS;
        else process.env.RNG_LOG_TAGS = prevTags;
    }
});

}); // describe
