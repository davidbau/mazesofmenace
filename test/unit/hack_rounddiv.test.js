import test from 'node:test';
import assert from 'node:assert/strict';

import { rounddiv } from '../../js/hack.js';

test('rounddiv mirrors C sign handling and half-up rounding', () => {
    assert.equal(rounddiv(5, 2), 3);
    assert.equal(rounddiv(4, 2), 2);
    assert.equal(rounddiv(3, 2), 2);
    assert.equal(rounddiv(-5, 2), -3);
    assert.equal(rounddiv(5, -2), -3);
    assert.equal(rounddiv(-5, -2), 3);
});

test('rounddiv throws on division by zero like C panic path', () => {
    assert.throws(() => rounddiv(10, 0), /division by zero in rounddiv/);
});
