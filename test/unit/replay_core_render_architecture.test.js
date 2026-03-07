import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const replayCorePath = join(ROOT, 'js', 'replay_core.js');
const allmainPath = join(ROOT, 'js', 'allmain.js');

describe('replay render architecture contracts', () => {
    it('keeps replay_core free of direct window-popup helper ownership', () => {
        const src = readFileSync(replayCorePath, 'utf8');

        assert.doesNotMatch(src, /from '\.\/windows'|from "\.\/windows"/);
        assert.doesNotMatch(src, /hasActiveTextPopupWindow\s*\(/);
        assert.doesNotMatch(src, /redrawActiveTextPopupWindows\s*\(/);
        assert.doesNotMatch(src, /function\s+rerenderLikeMainLoop\s*\(/);
        assert.doesNotMatch(src, /game\.docrt\s*\(/);
    });

    it('routes replay rendering through runtime-owned APIs', () => {
        const replaySrc = readFileSync(replayCorePath, 'utf8');
        const mainSrc = readFileSync(allmainPath, 'utf8');

        assert.match(replaySrc, /run_command\(game, ch, \{\s*renderAfterCommand:\s*true\s*\}\)/);
        assert.match(replaySrc, /execute_repeat_command\(game, \{\s*renderAfterCommand:\s*true\s*\}\)/);
        assert.match(replaySrc, /game\?\.renderInputBlockedState\s*===\s*'function'/);

        assert.match(mainSrc, /renderInputBlockedState\(\)\s*\{/);
    });
});
