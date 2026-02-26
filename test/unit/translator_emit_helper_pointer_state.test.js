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
