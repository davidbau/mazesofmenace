// test/comparison/special.test.js -- Special level session tests
//
// Loads and tests only special-type sessions (42 files, ~5MB)

import { describe } from 'node:test';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runSpecialLevelSession } from './session_test_runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SESSIONS_DIR = join(__dirname, 'sessions');
const MAPS_DIR = join(__dirname, 'maps');

// Discover only special level sessions
const specialSessions = [];
for (const [dir, label] of [[SESSIONS_DIR, 'sessions'], [MAPS_DIR, 'maps']]) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter(f => f.endsWith('.session.json')).sort()) {
        const path = join(dir, f);
        const session = JSON.parse(readFileSync(path, 'utf-8'));
        if (session.type === 'special') {
            specialSessions.push({ file: f, dir, session });
        }
    }
}

// Run tests for each special level session
for (const { file, dir, session } of specialSessions) {
    describe(`${file}`, () => {
        runSpecialLevelSession(file, session);
    });
}
