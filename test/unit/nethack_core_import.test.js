import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('nethack core module', () => {
    it('imports in Node and exposes NetHackGame', async () => {
        const mod = await import('../../js/nethack.js');
        assert.equal(typeof mod.NetHackGame, 'function');
    });

    it('can instantiate NetHackGame with deps', async () => {
        const { NetHackGame } = await import('../../js/nethack.js');
        const game = new NetHackGame({}, {});
        assert.ok(game instanceof NetHackGame);
    });
});
