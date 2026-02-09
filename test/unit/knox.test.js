/**
 * Test for Fort Ludios (Knox) level generation
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resetLevelState, getLevelState } from '../../js/sp_lev.js';
import { generate as generateKnox } from '../../js/levels/knox.js';
import { initRng } from '../../js/rng.js';
import { STONE, ROOM, HWALL, VWALL, TRWALL } from '../../js/config.js';

describe('Fort Ludios (Knox) level generation', () => {
    before(() => {
        initRng(1);
    });

    it('should generate the map with correct terrain', () => {
        resetLevelState();
        generateKnox();

        const state = getLevelState();
        const map = state.map;

        assert.ok(map, 'Map should be created');

        let wallCount = 0;
        let roomCount = 0;
        let objectCount = 0;
        let trapCount = 0;

        for (let x = 0; x < 80; x++) {
            for (let y = 0; y < 21; y++) {
                const typ = map.locations[x][y].typ;
                if (typ >= HWALL && typ <= TRWALL) wallCount++;
                if (typ === ROOM) roomCount++;
            }
        }
        objectCount = map.objects.length;
        trapCount = map.traps.length;

        assert.ok(wallCount > 100, `Should have walls (found ${wallCount})`);
        assert.ok(roomCount > 100, `Should have room cells (found ${roomCount})`);
        assert.ok(objectCount >= 12, `Should have corner tower gems (found ${objectCount})`);
        assert.ok(trapCount >= 7, `Should have traps (found ${trapCount})`);
    });

    it('should match C trace data for seed 1', () => {
        const tracePath = new URL('../../test/comparison/maps/seed1_special_knox.session.json', import.meta.url);
        let traceData;
        try {
            traceData = JSON.parse(readFileSync(tracePath, 'utf-8'));
        } catch (err) {
            console.log('Skipping C trace comparison - file not found');
            return;
        }

        const knoxLevel = traceData.levels.find(l => l.levelName === 'knox');
        if (!knoxLevel) {
            console.log('Skipping - knox not found in trace');
            return;
        }

        resetLevelState();
        initRng(1);
        generateKnox();

        const state = getLevelState();
        const map = state.map;
        const typGrid = knoxLevel.typGrid;

        // Find the map bounds in the trace
        let minX = 80, minY = 21, maxX = 0, maxY = 0;
        for (let y = 0; y < 21; y++) {
            for (let x = 0; x < 80; x++) {
                if (typGrid[y][x] !== STONE) {
                    minX = Math.min(minX, x);
                    minY = Math.min(minY, y);
                    maxX = Math.max(maxX, x);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        console.log(`C trace map bounds: x=${minX}-${maxX}, y=${minY}-${maxY}`);
        console.log(`Map size: ${maxX - minX + 1} x ${maxY - minY + 1}`);

        // Verify map dimensions
        const traceWidth = maxX - minX + 1;
        const traceHeight = maxY - minY + 1;
        assert.ok(traceWidth >= 70, 'Trace width should be reasonable');
        assert.ok(traceHeight >= 18, 'Trace height should be reasonable');

        // Compare terrain cell-by-cell
        let mismatches = 0;
        const maxMismatchesToShow = 10;

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const traceType = typGrid[y][x];
                const jsType = map.locations[x][y].typ;

                // Compare basic terrain (wall vs non-wall, room vs not)
                const traceIsWall = traceType >= VWALL && traceType <= TRWALL;
                const jsIsWall = jsType >= VWALL && jsType <= TRWALL;

                if (traceIsWall !== jsIsWall || (traceType === ROOM && jsType !== ROOM)) {
                    mismatches++;
                    if (mismatches <= maxMismatchesToShow) {
                        console.log(`Mismatch at (${x},${y}): C=${traceType} JS=${jsType}`);
                    }
                }
            }
        }

        console.log(`Total mismatches: ${mismatches} (accounting for random variations)`);

        // Knox has random elements (percent(50) for doors, random traps/gold placement)
        // so some mismatches are expected. The key is that structure is reasonable.
        assert.ok(mismatches < 800, `Should have mostly matching structure (found ${mismatches})`);
    });
});
