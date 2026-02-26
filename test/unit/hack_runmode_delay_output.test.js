import test from 'node:test';
import assert from 'node:assert/strict';

import { runmode_delay_output } from '../../js/hack.js';
import { initAnimation } from '../../js/animation.js';

function setupAnimationCounter() {
    let boundaries = 0;
    initAnimation({ flush() {} }, {
        mode: 'headless',
        skipDelays: true,
        onDelayBoundary: () => { boundaries++; },
    });
    return () => boundaries;
}

test('runmode_delay_output awaits one boundary in leap mode at modulo-7 step', async () => {
    const getBoundaries = setupAnimationCounter();
    let rendered = 0;
    const game = {
        svc: { context: { run: 3 } },
        context: null,
        flags: { runmode: 'leap' },
        multi: 0,
        moves: 14,
    };
    game.context = game.svc.context;
    const display = { renderMessageWindow() { rendered++; } };

    await runmode_delay_output(game, display);
    assert.equal(getBoundaries(), 1);
    assert.equal(rendered, 1);
});

test('runmode_delay_output skips leap delay for non-modulo-7 step', async () => {
    const getBoundaries = setupAnimationCounter();
    const game = {
        svc: { context: { run: 3 } },
        context: null,
        flags: { runmode: 'leap' },
        multi: 0,
        moves: 13,
    };
    game.context = game.svc.context;

    await runmode_delay_output(game, null);
    assert.equal(getBoundaries(), 0);
});

test('runmode_delay_output emits five boundaries in crawl mode', async () => {
    const getBoundaries = setupAnimationCounter();
    const game = {
        svc: { context: { run: 3 } },
        context: null,
        flags: { runmode: 'crawl' },
        multi: 0,
        moves: 13,
    };
    game.context = game.svc.context;

    await runmode_delay_output(game, null);
    assert.equal(getBoundaries(), 5);
});

test('runmode_delay_output does nothing when not running and not multi', async () => {
    const getBoundaries = setupAnimationCounter();
    const game = {
        svc: { context: { run: 0 } },
        context: null,
        flags: { runmode: 'crawl' },
        multi: 0,
        moves: 13,
    };
    game.context = game.svc.context;

    await runmode_delay_output(game, null);
    assert.equal(getBoundaries(), 0);
});
