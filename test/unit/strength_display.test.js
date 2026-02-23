// Test strength display formatting (18/xx notation)
// C ref: attrib.c str_string()
import { describe, test } from 'node:test';
import assert from 'assert';
import { Player } from '../../js/player.js';
import { A_STR } from '../../js/config.js';

describe('strength display', () => {

test('strength display: normal values 3-18 show as plain numbers', () => {
    const player = new Player();

    player.attributes[A_STR] = 3;
    assert.strictEqual(player.strDisplay, '3', 'Strength 3 should display as "3"');

    player.attributes[A_STR] = 10;
    assert.strictEqual(player.strDisplay, '10', 'Strength 10 should display as "10"');

    player.attributes[A_STR] = 18;
    assert.strictEqual(player.strDisplay, '18', 'Strength 18 should display as "18"');
});

test('strength display: exceptional strength uses 18/xx format', () => {
    const player = new Player();

    // Internal values 19-117 map to 18/01 through 18/99
    // C encoding: STR18(x) = 18 + x, so internal 19 = 18/01, 25 = 18/07
    player.attributes[A_STR] = 19;
    assert.strictEqual(player.strDisplay, '18/01', 'Strength 19 (18/01) should display as "18/01"');

    player.attributes[A_STR] = 20;
    assert.strictEqual(player.strDisplay, '18/02', 'Strength 20 (18/02) should display as "18/02"');

    player.attributes[A_STR] = 21;
    assert.strictEqual(player.strDisplay, '18/03', 'Strength 21 (18/03) should display as "18/03"');

    player.attributes[A_STR] = 25;
    assert.strictEqual(player.strDisplay, '18/07', 'Strength 25 (18/07) should display as "18/07"');

    player.attributes[A_STR] = 117;
    assert.strictEqual(player.strDisplay, '18/99', 'Strength 117 (18/99) should display as "18/99"');
});

test('strength display: maximum exceptional strength uses 18/**', () => {
    const player = new Player();

    // Internal value 118 = STR18(100) = "18/**"
    player.attributes[A_STR] = 118;
    assert.strictEqual(player.strDisplay, '18/**', 'Strength 118 (STR18(100)) should display as "18/**"');
});

}); // describe
