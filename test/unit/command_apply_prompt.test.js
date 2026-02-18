import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { rhack } from '../../js/commands.js';
import { GameMap } from '../../js/map.js';
import { Player } from '../../js/player.js';
import { clearInputQueue, pushInput } from '../../js/input.js';
import { LANCE } from '../../js/objects.js';

function makeBaseGame() {
    const map = new GameMap();
    const player = new Player();
    player.initRole(11);
    player.x = 10;
    player.y = 10;

    const display = {
        topMessage: null,
        messageNeedsMore: false,
        putstr_message(msg) {
            this.topMessage = msg;
            this.messageNeedsMore = true;
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

describe('apply prompt behavior', () => {
    beforeEach(() => {
        clearInputQueue();
    });

    it('keeps prompt open on unrelated key and handles item selection', async () => {
        const game = makeBaseGame();
        game.player.inventory = [
            { invlet: 'a', oclass: 1, otyp: 1, name: 'long sword' },
            { invlet: 'b', oclass: 1, otyp: LANCE, name: 'lance' },
        ];
        pushInput('q'.charCodeAt(0));
        pushInput('a'.charCodeAt(0));

        const result = await rhack('a'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.equal(game.display.topMessage, "Sorry, I don't know how to use that.");
    });

    it('reports empty apply inventory when no candidates exist', async () => {
        const game = makeBaseGame();
        game.player.inventory = [{ invlet: 'a', oclass: 1, otyp: 1, name: 'long sword' }];
        const result = await rhack('a'.charCodeAt(0), game);
        assert.equal(result.tookTime, false);
        assert.equal(game.display.topMessage, "You don't have anything to use or apply.");
    });
});
