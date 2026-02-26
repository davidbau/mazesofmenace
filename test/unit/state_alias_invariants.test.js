import test from 'node:test';
import assert from 'node:assert/strict';

import { NetHackGame } from '../../js/allmain.js';

test('NetHackGame canonical alias invariants: context <-> svc.context', () => {
    const game = new NetHackGame();
    assert.equal(game.context, game.svc.context);

    game.context = { run: 2, travel: 1 };
    assert.equal(game.context, game.svc.context);
    assert.equal(game.svc.context.run, 2);
    assert.equal(game.svc.context.travel, 1);

    game.svc.context.forcefight = 1;
    assert.equal(game.context.forcefight, 1);
});

test('NetHackGame canonical alias invariants: u <-> player', () => {
    const game = new NetHackGame();
    assert.equal(game.u, game.player);

    const replacement = { x: 10, y: 12 };
    game.u = replacement;
    assert.equal(game.player, replacement);
    assert.equal(game.u, replacement);
});

test('NetHackGame canonical alias invariants: lev <-> map', () => {
    const game = new NetHackGame();
    assert.equal(game.lev, game.map);

    const replacement = { marker: 'map' };
    game.lev = replacement;
    assert.equal(game.map, replacement);
    assert.equal(game.lev, replacement);
});
