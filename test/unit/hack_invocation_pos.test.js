import test from 'node:test';
import assert from 'node:assert/strict';

import { invocation_pos } from '../../js/hack.js';
import { dunlevs_in_dungeon } from '../../js/dungeon.js';

test('invocation_pos uses canonical map invocation fields', () => {
    const map = {
        uz: { dnum: 5, dlevel: dunlevs_in_dungeon(5) - 1 },
        inv_pos: { x: 17, y: 4 },
    };
    assert.equal(invocation_pos(17, 4, map), true);
    assert.equal(invocation_pos(16, 4, map), false);
});

test('invocation_pos returns false off invocation level', () => {
    const map = {
        uz: { dnum: 5, dlevel: dunlevs_in_dungeon(5) - 2 },
        inv_pos: { x: 17, y: 4 },
    };
    assert.equal(invocation_pos(17, 4, map), false);
});

test('invocation_pos supports legacy flags compatibility fields', () => {
    const map = {
        flags: { is_invocation_lev: true, inv_pos: { x: 3, y: 9 } },
    };
    assert.equal(invocation_pos(3, 9, map), true);
});
