import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { initRng } from '../../js/rng.js';
import { GameMap } from '../../js/map.js';
import { WATER, AIR, STONE, FOUNTAIN } from '../../js/config.js';
import {
    setup_waterlevel,
    save_waterlevel,
    restore_waterlevel,
    unsetup_waterlevel,
    set_wportal,
    fumaroles,
    movebubbles,
    mv_bubble,
    water_friction,
    makemaz,
    fixup_special,
    check_ransacked,
    mark_ransacked,
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

    it('movebubbles shifts fumaroles in deterministic move mode', () => {
        const map = new GameMap();
        setup_waterlevel(map, { isWaterLevel: true });
        map._water.bubbles = [];
        fumaroles(map, [{ x: 11, y: 10 }]);
        movebubbles(map, 1, -1);

        assert.equal(map._water.fumaroles[0].x, 12);
        assert.equal(map._water.fumaroles[0].y, 9);
    });

    it('mv_bubble allows 1x1 bubble to occupy xmax', () => {
        const map = new GameMap();
        setup_waterlevel(map, { isWaterLevel: true });
        const bubble = { x: map._water.xmax - 1, y: 10, n: 1, dx: 0, dy: 0 };
        mv_bubble(map, bubble, 1, 0);
        assert.equal(bubble.x, map._water.xmax);
    });

    it('water_friction returns sticky behavior on fumarole squares', () => {
        const map = new GameMap();
        setup_waterlevel(map, { isWaterLevel: true });
        fumaroles(map, [{ x: 20, y: 10 }]);

        assert.equal(water_friction(map, { x: 20, y: 10 }), 1);
    });

    it('fixup_special applies castle/minetown flag side effects', () => {
        const castle = new GameMap();
        fixup_special(castle, { specialName: 'castle' });
        assert.equal(castle.flags.graveyard, true);

        const minetown = new GameMap();
        fixup_special(minetown, { specialName: 'minetn-1' });
        assert.equal(minetown.flags.has_town, true);
    });

    it('check_ransacked supports lookup by room name', () => {
        const map = new GameMap();
        map.rooms = [{ name: 'Armory', ransacked: false }];
        mark_ransacked(map, 0);
        assert.equal(check_ransacked(map, 'armory'), true);
    });

    it('makemaz loads protofile special levels when provided', () => {
        const map = new GameMap();
        makemaz(map, 'oracle', null, null, 5);
        assert.equal(map.flags.is_maze_lev, false);
        let fountains = 0;
        for (let x = 0; x < map.locations.length; x++) {
            for (let y = 0; y < map.locations[x].length; y++) {
                if (map.locations[x][y].typ === FOUNTAIN) fountains++;
            }
        }
        assert.ok(fountains >= 2);
    });
});
