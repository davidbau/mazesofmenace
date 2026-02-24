import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { initRng } from '../../js/rng.js';
import { GameMap } from '../../js/map.js';
import { WATER, AIR, STONE } from '../../js/config.js';
import {
    setup_waterlevel,
    save_waterlevel,
    restore_waterlevel,
    unsetup_waterlevel,
    set_wportal,
    fumaroles,
} from '../../js/mkmaze.js';

describe('mkmaze waterlevel state helpers', () => {
    beforeEach(() => {
        initRng(12345);
    });

    it('setup_waterlevel seeds deterministic scaffold and converts terrain', () => {
        const map = new GameMap();
        map.flags.hero_memory = true;
        assert.equal(map.at(40, 10).typ, STONE);

        setup_waterlevel(map, { isWaterLevel: true });
        assert.equal(map.flags.hero_memory, false);
        assert.equal(map.at(40, 10).typ, WATER);
        assert.ok(map._waterLevelSetup);
        assert.equal(map._waterLevelSetup.isWaterLevel, true);
        assert.ok(map._waterLevelSetup.bubbles.length > 0);

        const map2 = new GameMap();
        map2.flags.hero_memory = true;
        setup_waterlevel(map2, { isWaterLevel: false });
        assert.equal(map2.at(40, 10).typ, AIR);
    });

    it('save/restore round-trips water state and hero_memory', () => {
        const map = new GameMap();
        setup_waterlevel(map, { isWaterLevel: true });
        set_wportal(map, 10, 10, { dnum: 1, dlevel: 2 });
        fumaroles(map, [{ x: 11, y: 10 }]);

        const saved = save_waterlevel(map);
        assert.ok(saved && saved.water && saved.waterLevelSetup);

        map.flags.hero_memory = true;
        map._water = null;
        map._waterLevelSetup = null;
        const ok = restore_waterlevel(map, saved);
        assert.equal(ok, true);
        assert.equal(map.flags.hero_memory, false);
        assert.equal(map._water.portal.x, 10);
        assert.equal(map._water.fumaroles.length, 1);
        assert.equal(map._waterLevelSetup.isWaterLevel, true);
    });

    it('unsetup_waterlevel deactivates and clears runtime movers', () => {
        const map = new GameMap();
        setup_waterlevel(map, { isWaterLevel: true });
        set_wportal(map, 10, 10, null);
        fumaroles(map, [{ x: 11, y: 10 }]);

        unsetup_waterlevel(map);
        assert.equal(map._water.active, false);
        assert.equal(map._water.bubbles.length, 0);
        assert.equal(map._water.portal, null);
        assert.equal(map._water.fumaroles.length, 0);
    });
});

