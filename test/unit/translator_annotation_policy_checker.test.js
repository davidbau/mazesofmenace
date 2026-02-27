import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const SCRIPT = path.resolve('scripts/check-translator-annotations.mjs');

function mkTmpRoot() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'translator-anno-check-'));
}

function writeJson(filePath, value) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function runCheck(rootPath, policyPath) {
    return spawnSync(process.execPath, [SCRIPT, '--root', rootPath, '--policy', policyPath], {
        encoding: 'utf8',
    });
}

test('fails when mixed annotations file has no TRANSLATOR markers', () => {
    const root = mkTmpRoot();
    const jsFile = path.join(root, 'js', 'mixed.js');
    fs.mkdirSync(path.dirname(jsFile), { recursive: true });
    fs.writeFileSync(jsFile, 'export function f() { return 1; }\n', 'utf8');

    const policyPath = path.join(root, 'tools', 'c_translator', 'rulesets', 'file_policy.json');
    writeJson(policyPath, {
        files: [{
            path: 'js/mixed.js',
            policy: 'mixed',
            reason: 'test',
            allow_source: 'annotations',
        }],
    });

    const r = runCheck(root, policyPath);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr + r.stdout, /no TRANSLATOR markers/);
});

test('passes when mixed annotations file has Autotranslated marker', () => {
    const root = mkTmpRoot();
    const jsFile = path.join(root, 'js', 'mixed.js');
    fs.mkdirSync(path.dirname(jsFile), { recursive: true });
    fs.writeFileSync(jsFile, '// Autotranslated from test.c:1234\nexport function f() { return 1; }\n', 'utf8');

    const policyPath = path.join(root, 'tools', 'c_translator', 'rulesets', 'file_policy.json');
    writeJson(policyPath, {
        files: [{
            path: 'js/mixed.js',
            policy: 'mixed',
            reason: 'test',
            allow_source: 'annotations',
        }],
    });

    const r = runCheck(root, policyPath);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /annotation-check OK/);
});
