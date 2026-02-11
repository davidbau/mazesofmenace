// test/comparison/other.test.js -- Other session tests
//
// Loads and tests option_test and selfplay sessions (8 files, ~1MB)

import { describe } from 'node:test';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runGameplaySession } from './session_test_runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SESSIONS_DIR = join(__dirname, 'sessions');
const MAPS_DIR = join(__dirname, 'maps');

// Discover option_test and selfplay sessions
const otherSessions = [];
for (const [dir, label] of [[SESSIONS_DIR, 'sessions'], [MAPS_DIR, 'maps']]) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter(f => f.endsWith('.session.json')).sort()) {
        const path = join(dir, f);
        const session = JSON.parse(readFileSync(path, 'utf-8'));
        // Capture option_test and selfplay sessions explicitly
        if (session.type === 'option_test' || session.type === 'selfplay') {
            otherSessions.push({ file: f, dir, session, type: session.type });
        }
    }
}

// Run tests for each other session (typically option_test and selfplay use gameplay test logic)
for (const { file, dir, session, type } of otherSessions) {
    describe(`${file}`, () => {
        runGameplaySession(file, session);
    });
}
