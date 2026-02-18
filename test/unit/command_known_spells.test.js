import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { rhack } from '../../js/commands.js';
import { GameMap } from '../../js/map.js';
import { Player } from '../../js/player.js';
import { clearInputQueue, pushInput } from '../../js/input.js';
import { SPE_HEALING } from '../../js/objects.js';

function makeGame() {
    const map = new GameMap();
    const player = new Player();
    player.initRole(11);
    player.x = 10;
    player.y = 10;

    const display = {
        topMessage: null,
        messageNeedsMore: false,
        lastOverlay: null,
        putstr_message(msg) {
            this.topMessage = msg;
            this.messageNeedsMore = true;
        },
        renderOverlayMenu(lines) {
            this.lastOverlay = lines;
        },
        clearRow() {},
    };

    return {
        player,
        map,
        display,
        fov: null,
        flags: { verbose: false },
    };
}

describe('known spells command', () => {
    beforeEach(() => {
        clearInputQueue();
    });

    it('reports when no spells are known', async () => {
        const game = makeGame();
        game.player.inventory = [{ invlet: 'a', oclass: 1, otyp: 1, name: 'long sword' }];
        const result = await rhack('+'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.equal(game.display.topMessage, "You don't know any spells right now.");
    });

    it('opens known-spells overlay when spellbooks are present', async () => {
        const game = makeGame();
        game.player.inventory = [{
            invlet: 'a',
            oclass: 9, // SPBOOK_CLASS
            otyp: SPE_HEALING,
            name: 'spellbook of healing',
        }];
        pushInput(' '.charCodeAt(0));
        const result = await rhack('+'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.ok(Array.isArray(game.display.lastOverlay));
        assert.ok(game.display.lastOverlay[0].startsWith('Currently known spells'));
    });
});
