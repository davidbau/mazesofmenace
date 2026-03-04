import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { handleLoot } from '../../js/pickup.js';
import { objectData, CHEST, APPLE, CARROT } from '../../js/objects.js';
import { clearInputQueue, pushInput } from '../../js/input.js';

describe('loot messaging', () => {
    it('shows each looted item instead of only a summary count', async () => {
        const apple = { otyp: APPLE, oclass: objectData[APPLE].oc_class, quan: 1, dknown: true };
        const carrot = { otyp: CARROT, oclass: objectData[CARROT].oc_class, quan: 1, dknown: true };
        const chest = {
            otyp: CHEST,
            oclass: objectData[CHEST].oc_class,
            cobj: [apple, carrot],
            olocked: false,
            obroken: false,
        };

        const messages = [];
        const game = {
            player: {
                x: 10,
                y: 5,
                inventory: [],
                addToInventory(obj) { this.inventory.push(obj); },
            },
            map: {
                objectsAt(x, y) {
                    return (x === 10 && y === 5) ? [chest] : [];
                },
            },
            display: {
                async putstr_message(msg) { messages.push(String(msg)); },
            },
        };

        // containerMenu now shows interactive "Do what?" prompt; 'b' = bring all out.
        clearInputQueue();
        pushInput('b'.charCodeAt(0));

        const result = await handleLoot(game);

        assert.equal(result.tookTime, true);
        // messages includes the "Do what with the chest?" prompt + 2 loot messages
        const lootMessages = messages.filter((m) => m.startsWith('You loot '));
        assert.equal(lootMessages.length, 2);
        assert.equal(lootMessages[0].startsWith('You loot '), true);
        assert.equal(lootMessages[1].startsWith('You loot '), true);
        assert.equal(lootMessages.some((m) => m.includes('You loot 2 items.')), false);
        assert.equal(chest.cobj.length, 0);
        assert.equal(game.player.inventory.length, 2);
    });
});
