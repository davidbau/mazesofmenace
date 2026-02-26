import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const CONDA = '/opt/miniconda3/condabin/conda';

test('clang-backed emit-helper translates rounddiv body', (t) => {
    if (!fs.existsSync(CONDA)) {
        t.skip('conda not available for clang-backed translator run');
        return;
    }

    const outFile = path.join(
        fs.mkdtempSync(path.join(os.tmpdir(), 'translator-emit-helper-clang-')),
        'rounddiv.json',
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
            'nethack-c/src/hack.c',
            '--func',
            'rounddiv',
            '--emit',
            'emit-helper',
            '--out',
            outFile,
        ],
        { encoding: 'utf8' },
    );
    assert.equal(r.status, 0, r.stderr || r.stdout);

    const payload = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    assert.equal(payload.function, 'rounddiv');
    assert.equal(payload.meta.translated, true);
    assert.match(payload.js, /throw new Error\('division by zero in rounddiv'\)/);
    assert.match(payload.js, /Math\.trunc\(x \/ y\)/);
    assert.doesNotMatch(payload.js, /UNIMPLEMENTED_TRANSLATED_FUNCTION/);
});
