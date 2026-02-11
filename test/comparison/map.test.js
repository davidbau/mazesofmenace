// test/comparison/map.test.js -- Map generation session tests
//
// Loads and tests only map-type sessions (5 files, ~1MB)

import { describe } from 'node:test';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runMapSession } from './session_test_runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SESSIONS_DIR = join(__dirname, 'sessions');
const MAPS_DIR = join(__dirname, 'maps');

// Discover only map sessions
const mapSessions = [];
for (const [dir, label] of [[SESSIONS_DIR, 'sessions'], [MAPS_DIR, 'maps']]) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter(f => f.endsWith('.session.json')).sort()) {
        const path = join(dir, f);
        const session = JSON.parse(readFileSync(path, 'utf-8'));
        if (session.type === 'map') {
            mapSessions.push({ file: f, dir, session });
        }
    }
}

// Run tests for each map session
for (const { file, dir, session } of mapSessions) {
    describe(`${file}`, () => {
        runMapSession(file, session);
    });
}
