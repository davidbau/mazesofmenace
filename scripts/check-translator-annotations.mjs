#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
    const out = {};
    for (let i = 2; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--policy') out.policy = argv[++i];
        else if (arg === '--root') out.root = argv[++i];
        else if (arg === '--help' || arg === '-h') out.help = true;
        else throw new Error(`Unknown arg: ${arg}`);
    }
    return out;
}

function usage() {
    console.log('Usage: node scripts/check-translator-annotations.mjs [--policy <path>] [--root <path>]');
}

function rel(root, p) {
    return path.relative(root, p).replaceAll('\\', '/');
}

function fail(msg) {
    console.error(msg);
    process.exitCode = 1;
}

function validateAnnotationMarkers(filePath, source, rootPath) {
    const lines = source.split(/\r?\n/);
    const markerRe = /TRANSLATOR:\s*(MANUAL|MANUAL-BEGIN|MANUAL-END)(?:\s+([A-Za-z0-9_.:-]+))?/;
    const autoRe = /Autotranslated from [A-Za-z0-9_.-]+\.c:\d+/;
    let markerCount = 0;
    let hasApprovedScope = false;
    let activeManualRegion = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (autoRe.test(line)) {
            markerCount++;
            hasApprovedScope = true;
            continue;
        }
        const m = line.match(markerRe);
        if (!m) continue;
        markerCount++;
        const kind = m[1];
        const regionId = m[2] || null;

        if (kind === 'MANUAL') {
            continue;
        }
        if (kind === 'MANUAL-BEGIN') {
            if (!regionId) {
                fail(`${rel(rootPath, filePath)}:${i + 1} missing region id for TRANSLATOR: MANUAL-BEGIN`);
                continue;
            }
            if (activeManualRegion) {
                fail(`${rel(rootPath, filePath)}:${i + 1} nested/overlapping MANUAL-BEGIN (${regionId}) while ${activeManualRegion} is active`);
            }
            activeManualRegion = regionId;
            continue;
        }
        if (kind === 'MANUAL-END') {
            if (!regionId) {
                fail(`${rel(rootPath, filePath)}:${i + 1} missing region id for TRANSLATOR: MANUAL-END`);
                continue;
            }
            if (!activeManualRegion) {
                fail(`${rel(rootPath, filePath)}:${i + 1} MANUAL-END (${regionId}) without active MANUAL-BEGIN`);
                continue;
            }
            if (activeManualRegion !== regionId) {
                fail(`${rel(rootPath, filePath)}:${i + 1} MANUAL-END (${regionId}) does not match active MANUAL-BEGIN (${activeManualRegion})`);
            }
            activeManualRegion = null;
            continue;
        }
    }

    if (activeManualRegion) {
        fail(`${rel(rootPath, filePath)} missing TRANSLATOR: MANUAL-END for region ${activeManualRegion}`);
    }
    if (markerCount === 0) {
        fail(`${rel(rootPath, filePath)} has allow_source=annotations but no TRANSLATOR markers`);
    }
    if (!hasApprovedScope) {
        fail(`${rel(rootPath, filePath)} has allow_source=annotations but no Autotranslated markers`);
    }
}

function main() {
    let args;
    try {
        args = parseArgs(process.argv);
    } catch (err) {
        console.error(err.message);
        usage();
        process.exit(1);
    }
    if (args.help) {
        usage();
        process.exit(0);
    }

    const rootPath = path.resolve(args.root || process.cwd());
    const policyPath = path.resolve(args.policy || path.join(rootPath, 'tools', 'c_translator', 'rulesets', 'file_policy.json'));

    if (!fs.existsSync(policyPath)) {
        console.error(`Missing policy file: ${rel(rootPath, policyPath)}`);
        process.exit(1);
    }
    let doc;
    try {
        doc = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
    } catch (err) {
        console.error(`Failed to parse ${rel(rootPath, policyPath)} as JSON: ${err.message}`);
        process.exit(1);
    }
    if (!doc || typeof doc !== 'object' || !Array.isArray(doc.files)) {
        console.error(`Invalid policy file ${rel(rootPath, policyPath)}: expected object with files[]`);
        process.exit(1);
    }

    for (const entry of doc.files) {
        if (!entry || entry.policy !== 'mixed') continue;
        if (entry.allow_source === 'annotations') {
            const filePath = path.resolve(rootPath, entry.path);
            if (!fs.existsSync(filePath)) {
                fail(`Mixed-policy file missing: ${rel(rootPath, filePath)}`);
                continue;
            }
            const source = fs.readFileSync(filePath, 'utf8');
            validateAnnotationMarkers(filePath, source, rootPath);
        }
    }

    if (process.exitCode) process.exit(1);
    console.log('translator:annotation-check OK');
}

main();
