import test from 'node:test';
import assert from 'node:assert/strict';

import { rhack } from '../../js/commands.js';
import { GameMap } from '../../js/map.js';
import { Player } from '../../js/player.js';
import { DOOR, D_ISOPEN } from '../../js/config.js';

function makeGame() {
    const map = new GameMap();
    const player = new Player();
    player.initRole(11);
    player.x = 10;
    player.y = 10;

    const display = {
        topMessage: null,
        putstr_message(msg) {
            this.topMessage = msg;
        },
    };

    return {
        player,
        map,
        display,
        fov: null,
        flags: { verbose: false },
        runMode: 0,
        menuRequested: false,
        forceFight: false,
        multi: 0,
        commandCount: 0,
        cmdKey: 0,
    };
}

test('diagonal move into intact doorway is blocked without message by default', async () => {
    const game = makeGame();
    const door = game.map.at(9, 11);
    door.typ = DOOR;
    door.flags = D_ISOPEN;

    const result = await rhack('b'.charCodeAt(0), game); // move SW

    assert.equal(result.moved, false);
    assert.equal(result.tookTime, false);
    assert.equal(game.player.x, 10);
    assert.equal(game.player.y, 10);
    assert.equal(game.display.topMessage, null);
});

test('diagonal move into intact doorway shows message when mention_walls is enabled', async () => {
    const game = makeGame();
    game.map.flags.mention_walls = true;
    const door = game.map.at(9, 11);
    door.typ = DOOR;
    door.flags = D_ISOPEN;

    const result = await rhack('b'.charCodeAt(0), game); // move SW

    assert.equal(result.moved, false);
    assert.equal(result.tookTime, false);
    assert.equal(game.display.topMessage, "You can't move diagonally into an intact doorway.");
});
