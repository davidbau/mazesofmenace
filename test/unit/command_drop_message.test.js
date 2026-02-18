import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { rhack } from '../../js/commands.js';
import { GameMap } from '../../js/map.js';
import { Player } from '../../js/player.js';
import { clearInputQueue, pushInput } from '../../js/input.js';
import { LONG_SWORD } from '../../js/objects.js';
import { mksobj } from '../../js/mkobj.js';

function makeGame() {
    const map = new GameMap();
    const player = new Player();
    player.initRole(11);
    player.x = 10;
    player.y = 10;

    const sword = mksobj(LONG_SWORD, true, false);
    sword.invlet = 'a';
    sword.known = true;
    sword.dknown = true;
    sword.bknown = true;
    sword.spe = 1;
    player.inventory = [sword];

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

describe('drop message formatting', () => {
    beforeEach(() => {
        clearInputQueue();
    });

    it('uses full object name instead of bare item.name', async () => {
        const game = makeGame();
        pushInput('a'.charCodeAt(0));
        const result = await rhack('d'.charCodeAt(0), game);
        assert.equal(result.tookTime, true);
        assert.equal(game.display.topMessage, 'You drop a +1 long sword.');
    });
});
