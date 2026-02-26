import test from 'node:test';
import assert from 'node:assert/strict';

import { invocation_pos } from '../../js/hack.js';

test('invocation_pos uses canonical map invocation fields', () => {
    const map = { _isInvocationLevel: true, _invPos: { x: 17, y: 4 } };
    assert.equal(invocation_pos(17, 4, map), true);
    assert.equal(invocation_pos(16, 4, map), false);
});

test('invocation_pos returns false off invocation level', () => {
    const map = { _isInvocationLevel: false, _invPos: { x: 17, y: 4 } };
    assert.equal(invocation_pos(17, 4, map), false);
});

test('invocation_pos supports legacy flags compatibility fields', () => {
    const map = {
        flags: { is_invocation_lev: true, inv_pos: { x: 3, y: 9 } },
    };
    assert.equal(invocation_pos(3, 9, map), true);
});
