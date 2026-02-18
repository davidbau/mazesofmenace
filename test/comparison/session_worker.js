// test/comparison/session_worker.js -- Worker for parallel session testing.

import { parentPort } from 'node:worker_threads';
import { readFileSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { normalizeSession } from './session_loader.js';

// Dynamically import the runner to get fresh module state per worker
let runSessionResult = null;

async function loadRunner() {
    if (!runSessionResult) {
        const mod = await import('./session_test_runner.js');
        runSessionResult = mod.runSessionResult;
    }
    return runSessionResult;
}

parentPort.on('message', async (msg) => {
    if (msg.type === 'run') {
        try {
            const runner = await loadRunner();
            const text = readFileSync(msg.filePath, 'utf8');
            const session = normalizeSession(JSON.parse(text), {
                file: basename(msg.filePath),
                dir: dirname(msg.filePath),
            });
            const result = await runner(session);
            parentPort.postMessage({ type: 'result', id: msg.id, result });
        } catch (error) {
            parentPort.postMessage({
                type: 'result',
                id: msg.id,
                result: {
                    session: msg.filePath,
                    passed: false,
                    error: error.message,
                },
            });
        }
    } else if (msg.type === 'exit') {
        process.exit(0);
    }
});
