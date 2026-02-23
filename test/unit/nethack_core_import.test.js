import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('nethack core module', () => {
    it('imports in Node and exposes NetHackGame', async () => {
        const mod = await import('../../js/chargen.js');
        assert.equal(typeof mod.NetHackGame, 'function');
    });

    it('requires an injected display when init is called', async () => {
        const { NetHackGame } = await import('../../js/chargen.js');
        const game = new NetHackGame();
        await assert.rejects(() => game.init(), /requires deps\.display/);
    });
});
