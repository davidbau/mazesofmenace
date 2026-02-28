import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const CONDA = '/opt/miniconda3/condabin/conda';
const SRC = 'test/fixtures/translator_async_fixture.c';

function emitHelper(funcName) {
    const outFile = path.join(
        fs.mkdtempSync(path.join(os.tmpdir(), 'translator-emit-helper-async-')),
        `${funcName}.json`,
    );
    const r = spawnSync(
        CONDA,
        [
            'run',
            '--live-stream',
            '-n',
            'base',
            'python',
            'tools/c_translator/main.py',
            '--src',
            SRC,
            '--func',
            funcName,
            '--emit',
            'emit-helper',
            '--out',
            outFile,
        ],
        { encoding: 'utf8' },
    );
    assert.equal(r.status, 0, r.stderr || r.stdout);
    return JSON.parse(fs.readFileSync(outFile, 'utf8'));
}

test('emit-helper marks direct awaited-boundary function as async', (t) => {
    if (!fs.existsSync(CONDA)) {
        t.skip('conda not available for clang-backed translator run');
        return;
    }
    const payload = emitHelper('delay_once');
    assert.equal(payload.meta.translated, true);
    assert.equal(payload.meta.requires_async, true);
    assert.match(payload.js, /export async function delay_once\(\)/);
    assert.match(payload.js, /await nh_delay_output\(\);/);
});

test('emit-helper awaits direct boundary and leaves sync boundary un-awaited', (t) => {
    if (!fs.existsSync(CONDA)) {
        t.skip('conda not available for clang-backed translator run');
        return;
    }
    const payload = emitHelper('delay_or_mark');
    assert.equal(payload.meta.translated, true);
    assert.equal(payload.meta.requires_async, true);
    assert.match(payload.js, /export async function delay_or_mark\(do_delay\)/);
    assert.match(payload.js, /await nh_delay_output\(\);/);
    assert.match(payload.js, /tmp_at\(1, 2\);/);
    assert.doesNotMatch(payload.js, /await tmp_at\(1, 2\);/);
});

test('emit-helper keeps sync-only boundary function non-async', (t) => {
    if (!fs.existsSync(CONDA)) {
        t.skip('conda not available for clang-backed translator run');
        return;
    }
    const payload = emitHelper('mark_only');
    assert.equal(payload.meta.translated, true);
    assert.equal(payload.meta.requires_async, false);
    assert.match(payload.js, /export function mark_only\(\)/);
    assert.match(payload.js, /tmp_at\(1, 2\);/);
    assert.doesNotMatch(payload.js, /await /);
});

test('emit-helper marks async-callee pass-through as async and awaited', (t) => {
    if (!fs.existsSync(CONDA)) {
        t.skip('conda not available for clang-backed translator run');
        return;
    }
    const payload = emitHelper('calls_delay_once');
    assert.equal(payload.meta.translated, true);
    assert.equal(payload.meta.requires_async, true);
    assert.match(payload.js, /export async function calls_delay_once\(\)/);
    assert.match(payload.js, /await delay_once\(\);/);
});

