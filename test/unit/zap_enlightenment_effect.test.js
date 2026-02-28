import test from 'node:test';
import assert from 'node:assert/strict';

import { do_enlightenment_effect } from '../../js/zap.js';

test('do_enlightenment_effect emits start/end messages and marks recent enlightenment', async () => {
    const messages = [];
    const player = { _recentEnlightenment: false };
    const display = {
        putstr_message(msg) {
            messages.push(msg);
        },
    };

    await do_enlightenment_effect(player, display, null);

    assert.equal(player._recentEnlightenment, true);
    assert.equal(messages[0], 'You feel self-knowledgeable...');
    assert.equal(messages[messages.length - 1], 'The feeling subsides.');
});

