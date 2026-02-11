// test/comparison/gameplay.test.js -- Gameplay session tests
//
// Loads and tests only gameplay-type sessions (12 files, ~2MB)

import { describe } from 'node:test';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runGameplaySession } from './session_test_runner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SESSIONS_DIR = join(__dirname, 'sessions');
const MAPS_DIR = join(__dirname, 'maps');

// Discover gameplay sessions (explicit type "gameplay" OR no type field, which defaults to gameplay)
const gameplaySessions = [];
for (const [dir, label] of [[SESSIONS_DIR, 'sessions'], [MAPS_DIR, 'maps']]) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter(f => f.endsWith('.session.json')).sort()) {
        const path = join(dir, f);
        const session = JSON.parse(readFileSync(path, 'utf-8'));
        const type = session.type || 'gameplay';  // Default to gameplay if no type field
        if (type === 'gameplay') {
            gameplaySessions.push({ file: f, dir, session });
        }
    }
}

// Run tests for each gameplay session
for (const { file, dir, session } of gameplaySessions) {
    describe(`${file}`, () => {
        runGameplaySession(file, session);
    });
}
