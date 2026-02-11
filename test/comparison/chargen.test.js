// test/comparison/chargen.test.js -- Character generation session tests
//
// Loads and tests only chargen-type sessions (90 files, ~10MB)

import { describe } from 'node:test';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runChargenSession } from './session_test_runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SESSIONS_DIR = join(__dirname, 'sessions');
const MAPS_DIR = join(__dirname, 'maps');

// Discover only chargen sessions
const chargenSessions = [];
for (const [dir, label] of [[SESSIONS_DIR, 'sessions'], [MAPS_DIR, 'maps']]) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter(f => f.endsWith('.session.json')).sort()) {
        const path = join(dir, f);
        const session = JSON.parse(readFileSync(path, 'utf-8'));
        if (session.type === 'chargen') {
            chargenSessions.push({ file: f, dir, session });
        }
    }
}

// Run tests for each chargen session
for (const { file, dir, session } of chargenSessions) {
    describe(`${file}`, () => {
        runChargenSession(file, session);
    });
}
