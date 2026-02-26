import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const CONDA = '/opt/miniconda3/condabin/conda';

test('clang-backed emit-helper lowers pointer access and long literals', (t) => {
    if (!fs.existsSync(CONDA)) {
        t.skip('conda not available for clang-backed translator run');
        return;
    }

    const outFile = path.join(
        fs.mkdtempSync(path.join(os.tmpdir(), 'translator-emit-helper-pointer-')),
        'ptr_read.json',
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
            'test/fixtures/translator_pointer_fixture.c',
            '--func',
            'ptr_read',
            '--emit',
            'emit-helper',
            '--out',
            outFile,
        ],
        { encoding: 'utf8' },
    );
    assert.equal(r.status, 0, r.stderr || r.stdout);

    const payload = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    assert.equal(payload.function, 'ptr_read');
    assert.equal(payload.meta.translated, true);
    assert.match(payload.js, /let x = f\.bar;/);
    assert.match(payload.js, /if \(x > 7\)/);
    assert.doesNotMatch(payload.js, /->/);
    assert.doesNotMatch(payload.js, /\b7L\b/);
});

test('clang-backed emit-helper lowers C boolean/null and function-pointer calls', (t) => {
    if (!fs.existsSync(CONDA)) {
        t.skip('conda not available for clang-backed translator run');
        return;
    }

    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'translator-emit-helper-c-lower-'));
    const funcs = ['bool_flip', 'call_fn', 'array_sum', 'address_of_member'];
    for (const fn of funcs) {
        const outFile = path.join(outDir, `${fn}.json`);
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
                'test/fixtures/translator_pointer_fixture.c',
                '--func',
                fn,
                '--emit',
                'emit-helper',
                '--out',
                outFile,
            ],
            { encoding: 'utf8' },
        );
        assert.equal(r.status, 0, r.stderr || r.stdout);
        const payload = JSON.parse(fs.readFileSync(outFile, 'utf8'));
        assert.equal(payload.meta.translated, true);
        assert.equal(
            (payload.diag || []).some((d) => d.code === 'UNRESOLVED_C_TOKENS'),
            false,
            `${fn} should not contain unresolved C tokens`,
        );

        if (fn === 'bool_flip') {
            assert.match(payload.js, /return true;/);
            assert.match(payload.js, /return false;/);
            assert.doesNotMatch(payload.js, /\bTRUE\b|\bFALSE\b/);
        }
        if (fn === 'call_fn') {
            assert.match(payload.js, /return fn\(x\);/);
            assert.doesNotMatch(payload.js, /\(\*fn\)/);
        }
        if (fn === 'array_sum') {
            assert.match(payload.js, /let vals = \[ 1, 2, 3 \];/);
            assert.doesNotMatch(payload.js, /vals\[\]/);
        }
        if (fn === 'address_of_member') {
            assert.match(payload.js, /f === null/);
            assert.doesNotMatch(payload.js, /NULL/);
        }
    }
});
