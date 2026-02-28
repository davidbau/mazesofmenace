#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const JS_DIR = path.join(ROOT, 'js');
const POLICY_PATH = path.join(ROOT, 'tools', 'c_translator', 'rulesets', 'file_policy.json');
const ALLOWED_POLICIES = new Set(['manual_only', 'mixed', 'auto', 'generated_data', 'not_to_translate']);

function fail(msg) {
    console.error(msg);
    process.exitCode = 1;
}

function rel(p) {
    return p.replaceAll('\\', '/');
}

if (!fs.existsSync(POLICY_PATH)) {
    console.error(`Missing policy file: ${rel(POLICY_PATH)}`);
    process.exit(1);
}

let policyDoc;
try {
    // file_policy.json is strict JSON.
    policyDoc = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
} catch (err) {
    console.error(`Failed to parse ${rel(POLICY_PATH)} as JSON: ${err.message}`);
    process.exit(1);
}

if (!policyDoc || typeof policyDoc !== 'object' || !Array.isArray(policyDoc.files)) {
    console.error('Invalid policy document: expected object with "files" array');
    process.exit(1);
}

const jsFiles = fs.readdirSync(JS_DIR)
    .filter(f => f.endsWith('.js'))
    .map(f => rel(path.join('js', f)))
    .sort();

const byPath = new Map();
for (const entry of policyDoc.files) {
    if (!entry || typeof entry !== 'object') {
        fail('Invalid policy entry: expected object');
        continue;
    }
    const p = entry.path;
    if (typeof p !== 'string' || !p) {
        fail('Invalid policy entry: missing/invalid "path"');
        continue;
    }
    if (byPath.has(p)) {
        fail(`Duplicate policy entry: ${p}`);
        continue;
    }
    byPath.set(p, entry);
}

for (const p of jsFiles) {
    if (!byPath.has(p)) {
        fail(`Unclassified JS file: ${p}`);
    }
}

for (const p of byPath.keys()) {
    if (!jsFiles.includes(p)) {
        fail(`Stale policy entry (file missing): ${p}`);
    }
}

for (const [p, entry] of byPath.entries()) {
    const pol = entry.policy;
    if (typeof pol !== 'string' || !ALLOWED_POLICIES.has(pol)) {
        fail(`Invalid policy for ${p}: ${String(pol)}`);
    }
    if (typeof entry.reason !== 'string' || !entry.reason.trim()) {
        fail(`Missing/empty reason for ${p}`);
    }
    if (pol === 'mixed') {
        if (entry.allow_source !== 'annotations' && entry.allow_source !== 'manifest') {
            fail(`Mixed policy requires allow_source=annotations|manifest: ${p}`);
        }
        if (entry.allow_source === 'manifest' && !Array.isArray(entry.allow_functions)) {
            fail(`Mixed policy with allow_source=manifest requires allow_functions array: ${p}`);
        }
        if (entry.deny_functions !== undefined && !Array.isArray(entry.deny_functions)) {
            fail(`deny_functions must be an array when present: ${p}`);
        }
    }
}

if (process.exitCode) {
    process.exit(1);
}

const counts = { manual_only: 0, mixed: 0, auto: 0, generated_data: 0, not_to_translate: 0 };
for (const entry of byPath.values()) {
    counts[entry.policy] += 1;
}

console.log('translator:file-policy-check OK');
console.log(`files=${jsFiles.length} manual_only=${counts.manual_only} mixed=${counts.mixed} auto=${counts.auto} generated_data=${counts.generated_data} not_to_translate=${counts.not_to_translate}`);
